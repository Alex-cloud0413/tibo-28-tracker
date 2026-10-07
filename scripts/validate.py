#!/usr/bin/env python3
"""Check the public payload; never publish the private production ledger."""
import json
from pathlib import Path
from urllib.parse import urlparse
from datetime import datetime
ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / 'site/data/updates.json').read_text())
assert data['schemaVersion'] == 1
ids = set()
for p in data['posts']:
    assert p['id'].isdigit() and p['id'] not in ids
    ids.add(p['id'])
    assert 0 <= p['day'] <= 28
    assert p['kind'] in ('update', 'reset', 'announcement')
    assert p['url'] == 'https://x.com/thsottiaux/status/' + p['id']
    assert isinstance(p['verified'], bool)
    if p.get('publishedAt'): datetime.fromisoformat(p['publishedAt'].replace('Z', '+00:00'))
    for url in p.get('sources', []) + ([p['articleUrl']] if p.get('articleUrl') else []):
        u=urlparse(url)
        assert u.scheme=='https' and u.hostname in ('x.com','mp.weixin.qq.com','alignment.openai.com')
for f in (ROOT/'site').rglob('*'):
    if f.is_file() and f.suffix in ('.html','.js','.css','.json'):
        body=f.read_text()
        assert '/Users/' not in body and 'feishu_drive_folder' not in body
        assert 'ghp_' not in body and 'github_pat_' not in body and 'BEGIN PRIVATE KEY' not in body
print(f'Public bundle valid: {len(ids)} posts.')
