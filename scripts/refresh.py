#!/usr/bin/env python3
"""Refresh public campaign facts. No credentials, model calls or private inputs."""
from __future__ import annotations
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    'tibo_live': ('Tibo 28 Day Live', 'https://www.tibo-28day.live/api/live'),
    'codex_resets': ('Codex Resets', 'https://codex-resets.com/zh-CN/tibo-28'),
    'resetalerts': ('Reset Alerts', 'https://resetalerts.com/codex-28-day-challenge'),
}
FIRST_ID = 2106845241357824205
ID_RE = re.compile(r'https?://(?:www\.)?(?:x|twitter)\.com/thsottiaux/status/(\d+)')
DAY_RE = re.compile(r'^Day\s+(\d{1,2})(?:\.(\d+))?\s*/', re.I)

def stamp(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00')).astimezone(timezone.utc)

def text(value, limit=20000):
    return value[:limit] if isinstance(value, str) else ''

def fingerprint(row):
    fields = {k: row.get(k, '') for k in ('text', 'quote', 'at')}
    return hashlib.sha256(json.dumps(fields, sort_keys=True, ensure_ascii=False).encode()).hexdigest()

def classify(row, campaign):
    body = text(row.get('text')).strip()
    at = stamp(row['at'])
    if at > datetime.now(timezone.utc):
        return None
    match = DAY_RE.match(body)
    if match:
        day, sub = int(match[1]), int(match[2]) if match[2] else None
        if 1 <= day <= 28:
            return day, sub, 'update'
    # Only an explicit completed reset in a main post; polls/replies are not resets.
    if not body.startswith('@') and re.search(r'(?:reset has been (?:processed|completed)|(?:usage|limits?|quota)\s+(?:has|have)\s+been\s+reset)', body, re.I):
        quote_day = re.search(r'(?:Roundup of |Day\s+)(?:Day\s+)?(\d{1,2})', text(row.get('quote')), re.I)
        day = int(quote_day[1]) if quote_day else (at.astimezone(ZoneInfo(campaign['timezone'])).date() - datetime.fromisoformat(campaign['startDate']).date()).days + 1
        if 1 <= day <= 28:
            return day, None, 'reset'
    return None

def parse(label, raw):
    if label == 'tibo_live':
        payload = json.loads(raw)
        if not isinstance(payload.get('tibo_tweets'), list):
            raise ValueError('unexpected_schema')
        rows = []
        for item in payload['tibo_tweets']:
            if not isinstance(item, dict) or str(item.get('author', '')).lstrip('@').lower() != 'thsottiaux':
                continue
            tid = str(item.get('id', ''))
            if not tid.isdigit() or int(tid) < FIRST_ID or not isinstance(item.get('text'), str):
                continue
            try:
                stamp(item['at'])
            except (ValueError, TypeError, KeyError):
                continue
            rows.append({'id': tid, 'text': text(item['text']), 'quote': text(item.get('quote')), 'at': item['at']})
        if not rows:
            raise ValueError('empty_or_unreadable_feed')
        return rows, payload.get('fetched_at')
    ids = sorted({i for i in ID_RE.findall(raw.replace('\\/', '/')) if int(i) >= FIRST_ID})
    if not ids:
        raise ValueError('no_source_links')
    return [{'id': i} for i in ids], None

def fetch(entry):
    key, (name, url) = entry
    try:
        # Use the host's maintained curl trust store; do not disable TLS verification.
        result = subprocess.run(['curl', '--fail', '--silent', '--show-error', '--location',
            '--max-time', '25', '--proto', '=https', '--proto-redir', '=https',
            '--max-filesize', '5000000', url], capture_output=True, timeout=30)
        if result.returncode:
            raise RuntimeError('fetch_failed')
        rows, source_at = parse(key, result.stdout.decode('utf-8'))
        return key, {'ok': True, 'name': name, 'url': url, 'rows': rows, 'sourceFetchedAt': source_at}
    except Exception as exc:
        return key, {'ok': False, 'name': name, 'url': url, 'error': type(exc).__name__}

def merge(curated, previous, responses, now):
    campaign = curated['campaign']
    current = now.isoformat()
    posts = {p['id']: dict(p) for p in previous.get('posts', [])}
    # A manually reviewed record owns its Chinese copy; mirror changes never rewrite it.
    for row in curated['posts']:
        posts[row['id']] = {**posts.get(row['id'], {}), **row}
    candidates = {p['id']: p for p in previous.get('candidates', [])}
    excluded = set(curated.get('excludedIds', []))
    health = {}
    for key, result in responses.items():
        old = previous.get('sources', {}).get(key, {})
        status = {k: v for k, v in result.items() if k != 'rows'}
        status.update(checkedAt=current, lastSuccessAt=current if result['ok'] else old.get('lastSuccessAt'))
        if key == 'tibo_live' and result['ok'] and not status.get('sourceFetchedAt'):
            status['freshnessUnknown'] = True
        if status.get('sourceFetchedAt'):
            try:
                age = (now - stamp(status['sourceFetchedAt'])).total_seconds()
                status['stale'] = age > 1800 or age < -300
            except (ValueError, TypeError):
                status['stale'] = True
        health[key] = status
        if not result['ok']:
            continue
        for row in result['rows']:
            tid = row['id']
            if tid in excluded:
                continue
            if tid not in posts and 'text' in row:
                group = classify(row, campaign)
                if group:
                    day, sub, kind = group
                    posts[tid] = {'id': tid, 'url': f'https://x.com/thsottiaux/status/{tid}', 'day': day, 'subDay': sub,
                        'kind': kind, 'title': f'Day {day}' + (f'.{sub}' if sub else '') + (' · 额度重置动态' if kind == 'reset' else ' · 新更新'),
                        'summary': '自动收录的原帖线索，中文摘要待核对。', 'verified': False,
                        'publishedAt': row['at'], 'originalText': row['text'], 'quotedText': row.get('quote', ''),
                        'sources': [f'https://x.com/thsottiaux/status/{tid}'], 'firstSeenAt': current}
            if tid in posts:
                post = posts[tid]
                post['discoveredVia'] = sorted(set(post.get('discoveredVia', []) + [key]))
                if 'text' in row:
                    latest_hash = fingerprint(row)
                    old_hash = post.get('mirrorFingerprint')
                    if old_hash and old_hash != latest_hash:
                        post['sourceChanged'] = True
                    post['mirrorFingerprint'] = latest_hash
                    if not post.get('verified'):
                        post.update(originalText=row['text'], quotedText=row.get('quote', ''), publishedAt=row['at'])
                    elif not post.get('originalText'):
                        post['originalText'] = row['text']
                candidates.pop(tid, None)
            elif 'text' not in row:
                candidates.setdefault(tid, {'id': tid, 'url': f'https://x.com/thsottiaux/status/{tid}', 'firstSeenAt': current})
    return {'schemaVersion': 1, 'campaign': campaign, 'checkedAt': current,
        'lastSuccessfulCheckAt': current if any(x['ok'] for x in responses.values()) else previous.get('lastSuccessfulCheckAt'),
        'posts': sorted(posts.values(), key=lambda p: (p['day'], p.get('publishedAt') or '', int(p['id'])), reverse=True),
        'roundups': curated.get('roundups', []),
        'candidates': [v for k, v in sorted(candidates.items(), reverse=True) if k not in excluded and k not in posts],
        'sources': health, 'campaignFinished': now >= stamp(campaign['stopAfter'])}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--seed-only', action='store_true')
    args = parser.parse_args()
    path = ROOT / 'site/data/updates.json'
    curated = json.loads((ROOT / 'curated.json').read_text())
    previous = json.loads(path.read_text()) if path.exists() else {}
    now = datetime.now(timezone.utc)
    if now >= stamp(curated['campaign']['stopAfter']) and previous.get('campaignFinished'):
        print('Campaign archived; no network request.'); return
    if args.seed_only:
        result = {**previous, 'schemaVersion': 1, 'campaign': curated['campaign'], 'posts': curated['posts'],
                  'roundups': curated.get('roundups', []), 'candidates': [], 'sources': {}, 'checkedAt': None,
                  'lastSuccessfulCheckAt': None, 'campaignFinished': False}
    else:
        with ThreadPoolExecutor(max_workers=3) as pool:
            responses = dict(pool.map(fetch, SOURCES.items()))
        result = merge(curated, previous, responses, now)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)
    print(json.dumps({'posts': len(result['posts']), 'candidates': len(result['candidates']), 'sources': result['sources']}, ensure_ascii=False))
    # Keep old data and publish visible failure status; workflow separately reports errors.
    if not args.seed_only and not any(h['ok'] for h in result['sources'].values()):
        print('All sources unavailable; retained prior posts.', file=sys.stderr)

if __name__ == '__main__':
    main()
