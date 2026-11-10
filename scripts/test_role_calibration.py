"""Acceptance-policy boundaries and missing-data regressions (no patient data)."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('fit', Path(__file__).with_name('fit-role-profiles.py'))
fit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fit)


class GateTests(unittest.TestCase):
    def setUp(self):
        self.gate = fit.read(fit.METHOD/'protocol.json')['gate']
        self.target = dict(participants_n=11,success_pct=100,time_mean_s=77,time_sd_s=46)
        self.result = dict(meanSeconds=77,sdSeconds=46,completion=1,meanSESeconds=0.46)

    def test_wilson_counts(self):
        lo, hi = fit.wilson(11,11)
        self.assertAlmostEqual(lo,0.74116703,places=6)
        self.assertAlmostEqual(hi,1)
        self.assertGreater(fit.wilson(10,10)[0],0.72)
        with self.assertRaises(ValueError):
            fit.wilson(0,0)

    def test_every_gate_is_required(self):
        self.assertTrue(fit.assess(self.target,self.result,self.gate,True)['pass'])
        for field, value in [('meanSeconds',123.001),('sdSeconds',22.999),('sdSeconds',92.001),
                             ('completion',0.74),('meanSESeconds',2.301)]:
            with self.subTest(field=field,value=value):
                result = dict(self.result,**{field:value})
                self.assertFalse(fit.assess(self.target,result,self.gate,True)['pass'])

    def test_inclusive_boundaries(self):
        for field, value in [('meanSeconds',123),('meanSeconds',31),('sdSeconds',23),('sdSeconds',92),('meanSESeconds',2.3)]:
            self.assertTrue(fit.assess(self.target,dict(self.result,**{field:value}),self.gate,True)['pass'])

    def test_missing_or_unmatched_is_failure(self):
        self.assertFalse(fit.assess(self.target,None,self.gate,True)['pass'])
        self.assertFalse(fit.assess(self.target,self.result,self.gate,False)['pass'])
        missing = fit.summarize([dict(completed=False,clocks=None,interruptions={'offered':[]},complaints=['task: no match'])])
        self.assertIsNone(missing['meanSeconds'])
        self.assertIsNone(missing['sdSeconds'])
        self.assertEqual(missing['completion'],0)

    def test_time_conditioned_on_success(self):
        def row(done,ms):
            return dict(completed=done,taskMs=ms,clicks=1,mentalOps=1,clocks=None,interruptions={'offered':[]},complaints=[])
        result = fit.summarize([row(True,1000),row(True,3000),row(False,1000000)])
        self.assertEqual(result['meanSeconds'],2)
        self.assertAlmostEqual(result['sdSeconds'],2**0.5)
        self.assertEqual(result['completion'],2/3)

    def test_frozen_streams_preserve_offered_work(self):
        e = fit.Experiment(fit.ROOT/'runs/test-fit',Path('/unused'))
        a = e.attempts('U9-2',10,'holdout',0,0,0,'baseline')
        b = e.attempts('U9-2',10,'holdout',240,6000,1,'pcp')
        self.assertEqual([r['arrivalSeed'] for r in a],[r['arrivalSeed'] for r in b])
        self.assertNotEqual([r['seed'] for r in a],[r['seed'] for r in b])
        self.assertTrue(all(r['choiceLatencyMs'] >= 0 for r in b))
        self.assertTrue(all(r['policy'] == 'expert' for r in a+b))
        self.assertTrue(all(r['keyboardShare'] == 80 for r in a+b))
        ed = e.attempts('U3-4',10,'holdout',30,0,0,'ed-resident')
        self.assertTrue(all(r['keyboardShare'] == 20 for r in ed))

    def test_missing_baseline_is_not_zero_error(self):
        self.assertIsNone(fit.macro_mae([dict(baseline=None)],'baseline'))

    def test_split_unchanged_and_disjoint(self):
        p = fit.read(fit.METHOD/'protocol.json')
        self.assertEqual(p['train'],['U8-2','U8-3','U8-5'])
        self.assertEqual(p['development'],['U8-6','U8-7','U8-9'])
        self.assertEqual(len(p['holdout']),11)
        self.assertFalse(set(p['train']) & set(p['holdout']))
        self.assertFalse(set(p['development']) & set(p['holdout']))


if __name__ == '__main__':
    unittest.main()
