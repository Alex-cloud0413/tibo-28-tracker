const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const i18n = require('../site/i18n.js');
const root = path.join(__dirname, '..');
const curated = JSON.parse(fs.readFileSync(path.join(root, 'curated.json'), 'utf8'));
test('static and runtime translation keys exist in both languages', () => {
  const html = fs.readFileSync(path.join(root, 'site/index.html'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'site/app.js'), 'utf8');
  for (const key of [...html.matchAll(/data-i18n(?:-label|-placeholder)?="([^"]+)"/g), ...app.matchAll(/\bt\("([^"]+)"/g)].map(m => m[1])) {
    assert.ok(i18n.messages[key], key);
  }
  for (const [key, pair] of Object.entries(i18n.messages)) {
    assert.equal(pair.length, 2, key);
    assert.ok(pair.every(s => typeof s === 'string' && s.length > 0), key);
    assert.doesNotMatch(pair[1], /\p{Script=Han}/u, key);
    assert.deepEqual([...pair[0].matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort(), [...pair[1].matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort(), key);
  }
});
test('curated posts and recaps have complete English copy', () => {
  for (const item of [...curated.posts, ...curated.roundups]) {
    assert.ok(item.titleEn?.trim(), item.id || item.day);
    assert.ok(item.summaryEn?.trim(), item.id || item.day);
    assert.doesNotMatch(item.titleEn + item.summaryEn, /\p{Script=Han}/u);
  }
});
test('future uncurated entries use original text, not a Chinese summary in English mode', () => {
  const post = {day:3, subDay:1, kind:'update', title:'新更新', summary:'中文摘要待核对', originalText:'Day 3.1/ New feature'};
  assert.equal(i18n.postCopy(post,'zh').title, '新更新');
  assert.deepEqual(i18n.postCopy(post,'en'), {title:'Day 3.1 · New update',summary:post.originalText,fallback:true});
  assert.doesNotMatch(i18n.roundupCopy({day:3,title:'汇总',summary:'中文'},'en').summary, /\p{Script=Han}/u);
  assert.match(i18n.postCopy({...post,originalText:''},'en').summary, /pending/);
});
test('invalid saved languages fall back to Chinese and variables retain their values', () => {
  for (const value of [null,undefined,'fr','<script>']) assert.equal(i18n.language(value),'zh');
  assert.equal(i18n.language('en'),'en');
  assert.equal(i18n.t('en','through',{day:28}), 'Through Day 28');
});
