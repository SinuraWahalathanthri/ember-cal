"""Rebuild exactly the browser demo fixture. No NASA data is generated or implied."""
import argparse,json,math
from pathlib import Path
SEASONS={'sri_lanka':[.35,.55,.75,.55,.35,.45,.8,1.6,2.1,1.7,.75,.35],'pantanal':[.2,.2,.25,.35,.5,.75,1.3,2,2.8,2,.8,.3],'nsw':[2.1,1.6,1,.4,.2,.15,.2,.3,.6,.9,1.4,2]}
def fixture(region='sri_lanka'):
 scale={'sri_lanka':1,'pantanal':5.4,'nsw':3.2}[region];out=[]
 for year in range(2001,2027):
  for m,season in enumerate(SEASONS[region]):
   noise=.72+((math.sin(year*8.17+m*3.13)+1)/2)*.65
   v=math.floor((210+(year-2001)*3)*scale*season*noise*(1.65 if year in (2020,2024) else 1)+.5)
   rnd=lambda v:math.floor(v+.5)
   out.append({'year':year,'month':m+1,'value':v,'lo':rnd(v*(.74 if year<2012 else .94)),'hi':rnd(v*(1.28 if year<2012 else 1.06)),'raw_modis':rnd(v/(1.8+m*.025)),'raw_viirs':v if year>=2012 else 0,'gap':year==2003 and m==4,'provisional':year==2026 and m>=6,'future':year==2026 and m>10,'synthetic':True})
 return out
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--region',choices=SEASONS,default='sri_lanka');args=p.parse_args();dest=Path('data/fixtures')/f'{args.region}.json';dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(json.dumps(fixture(args.region),indent=2));print(f'{dest}: 312 SYNTHETIC monthly rows')
