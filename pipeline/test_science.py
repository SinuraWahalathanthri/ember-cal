import unittest
from pipeline.science import shrink_ratio,bootstrap_years,pettitt,metrics,wilson,confidence,normalize
class ScienceTests(unittest.TestCase):
 def test_parent_fallback(self):self.assertEqual(shrink_ratio(0,10,2),2)
 def test_shrinkage(self):self.assertTrue(1<shrink_ratio(100,200,1)<2)
 def test_bootstrap(self):
  b=bootstrap_years([10,20,30],[20,40,60]);self.assertLessEqual(b['lo'],b['hi']);self.assertEqual(b,bootstrap_years([10,20,30],[20,40,60]))
 def test_change_point(self):self.assertLess(pettitt([0]*15+[10]*15)['p_value'],.01)
 def test_metrics(self):self.assertEqual(metrics([1,2,3],[1,2,3])['r2'],1)
 def test_empty_precision(self):self.assertIsNone(wilson(0,0)['precision'])
 def test_interval(self):self.assertLess(wilson(95,100)['lo'],.95);self.assertGreater(wilson(95,100)['hi'],.95)
 def test_static_never_alerts(self):self.assertEqual(confidence({'static':True,'vegetation':True,'multisensor':True,'cluster':True})['score'],0)
 def test_likely_needs_evidence(self):self.assertEqual(confidence({'vegetation':True,'multisensor':True,'cluster':True})['label'],'Likely fire')
 def test_confirmed(self):self.assertEqual(confidence({'ground':'confirmed'})['label'],'Confirmed')
 def test_normalize_stable(self):
  r={'latitude':7,'longitude':81,'acq_date':'2026-11-14','acq_time':42,'confidence':'h','satellite':'NOAA20'}
  self.assertEqual(normalize(r)['id'],normalize(r)['id']);self.assertEqual(normalize(r)['confidence_class'],'high')
if __name__=='__main__':unittest.main()
