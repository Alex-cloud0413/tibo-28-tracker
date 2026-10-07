import importlib.util
import json
from datetime import datetime, timezone
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('refresh',ROOT/'scripts/refresh.py')
r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
NOW=datetime(2026,10,7,8,tzinfo=timezone.utc)

class RefreshTests(unittest.TestCase):
    def setUp(self):
        self.curated=json.loads((ROOT/'curated.json').read_text())
        self.row={'id':'2108000000000000000','text':'Day 3.1/ A new feature','quote':'','at':'2026-10-07T07:00:00Z'}
    def test_engagement_is_not_content(self):
        self.assertEqual(r.fingerprint(self.row),r.fingerprint({**self.row,'likes':999}))
        self.assertNotEqual(r.fingerprint(self.row),r.fingerprint({**self.row,'text':'Different'}))
    def test_filter_author_and_invalid_rows(self):
        payload={'tibo_tweets':[dict(self.row,author='@thsottiaux'),dict(self.row,author='@someone'),dict(self.row,author='@thsottiaux',at='invalid')]}
        self.assertEqual(len(r.parse('tibo_live',json.dumps(payload))[0]),1)
    def test_poll_is_not_completed_reset(self):
        self.assertIsNone(r.classify({**self.row,'text':'Should we reset today?'},self.curated['campaign']))
        self.assertIsNone(r.classify({**self.row,'text':'@friend reset has been processed'},self.curated['campaign']))
    def test_reset_uses_referenced_campaign_day(self):
        row={**self.row,'text':'The reset has been processed. Enjoy!','quote':'Roundup of Day 2/ 2.1/ Good things'}
        self.assertEqual(r.classify(row,self.curated['campaign']),(2,None,'reset'))
    def test_preserve_data_on_all_failures(self):
        old={'posts':[dict(self.row,day=3,kind='update',publishedAt=self.row['at'])],'lastSuccessfulCheckAt':'2026-10-07T06:00:00Z'}
        merged=r.merge(self.curated,old,{'a':{'ok':False,'error':'timeout'}},NOW)
        self.assertIn(self.row['id'],[p['id'] for p in merged['posts']])
        self.assertEqual(merged['lastSuccessfulCheckAt'],old['lastSuccessfulCheckAt'])
    def test_new_mirror_entry_is_not_verified(self):
        result=r.merge(self.curated,{}, {'tibo_live':{'ok':True,'rows':[self.row]}},NOW)
        p=next(x for x in result['posts'] if x['id']==self.row['id'])
        self.assertFalse(p['verified']);self.assertEqual(p['subDay'],1)
    def test_changed_mirror_does_not_replace_reviewed_copy(self):
        original=self.curated['posts'][0]
        old={**original,'mirrorFingerprint':'old'}
        changed={**self.row,'id':original['id'],'text':'Day 1/ NEW MALICIOUS CLAIM'}
        result=r.merge(self.curated,{'posts':[old]},{'tibo_live':{'ok':True,'rows':[changed]}},NOW)
        p=next(x for x in result['posts'] if x['id']==original['id'])
        self.assertEqual(p['summary'],original['summary']);self.assertTrue(p['sourceChanged'])
    def test_backup_link_alone_is_only_a_candidate(self):
        result=r.merge(self.curated,{}, {'backup':{'ok':True,'rows':[{'id':self.row['id']}]}},NOW)
        self.assertIn(self.row['id'],[p['id'] for p in result['candidates']])
        self.assertNotIn(self.row['id'],[p['id'] for p in result['posts']])
    def test_source_staleness_is_visible(self):
        result=r.merge(self.curated,{}, {'tibo_live':{'ok':True,'rows':[],'sourceFetchedAt':'2026-10-07T01:00:00Z'}},NOW)
        self.assertTrue(result['sources']['tibo_live']['stale'])
    def test_gate_page_not_empty_success(self):
        with self.assertRaises(ValueError):r.parse('resetalerts','<html>Please sign in</html>')

if __name__=='__main__':unittest.main()
