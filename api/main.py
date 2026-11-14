"""Local synthetic API. The hosted Sites UI computes the same fixture in-browser."""
import csv,io,json,math
from pathlib import Path
from statistics import median,mean,pstdev
from fastapi import FastAPI,HTTPException
from fastapi.responses import Response
from pydantic import BaseModel,Field
from pipeline.demo import fixture
from pipeline.science import wilson
app=FastAPI(title='EmberCal synthetic demo API',version='0.1.0',description='All results are synthetic. No measured scientific accuracy or live monitoring.')
REGIONS=json.loads((Path(__file__).parents[1]/'config/regions.json').read_text())
class Query(BaseModel):
 region_id:str='sri_lanka'
 start:str='2001-01-01'
 end:str='2026-11-14'
 year:int=Field(2026,ge=2001,le=2026)
 month:int=Field(10,ge=1,le=12)
 bbox:list[float]|None=None
 area:dict|None=None
 mode:str='harmonized'

def rows(q):
 if q.region_id not in REGIONS:raise HTTPException(422,'Choose sri_lanka, pantanal or nsw.')
 if q.start>q.end:raise HTTPException(422,'Start must precede end.')
 if q.bbox and (len(q.bbox)!=4 or q.bbox[0]>=q.bbox[2] or q.bbox[1]>=q.bbox[3]):raise HTTPException(422,'Invalid bounding box.')
 if q.bbox:raise HTTPException(422,'Monthly custom-area statistics are not implemented in this API; use region_id.')
 if q.area:raise HTTPException(422,'Exact geometry queries are not implemented in the synthetic API; use region_id.')
 return [r for r in fixture(q.region_id) if not r['future'] and q.start[:7]<=f"{r['year']}-{r['month']:02}"<=q.end[:7]]
def payload(data):return {'synthetic':True,'source':'EmberCal deterministic fixture','method_version':'demo-v1','as_of':'2026-11-14','data':data}
@app.get('/api/health')
def health():return {'status':'demo','synthetic':True,'firms_connected':False,'last_cron_run':None,'freshness':'Not applicable: synthetic fixture'}
@app.get('/api/regions')
def regions():return payload([{'id':k,**v} for k,v in REGIONS.items()])
@app.post('/api/calendar')
def calendar(q:Query):
 r=rows(q);return {**payload(None),'years':sorted({x['year'] for x in r}),'months':list(range(1,13)),'cells':r}
@app.post('/api/climatology')
def climatology(q:Query):
 import numpy as np
 r=rows(q);out=[]
 for m in range(1,13):
  v=[x['value'] for x in r if x['month']==m and x['year']<2026 and not x['gap']]
  if v:out.append({'month':m,'median':median(v),'mean':mean(v),**{f'p{p}':float(np.percentile(v,p)) for p in (10,25,75,90)}})
 return payload(out)
@app.post('/api/anomaly')
def anomaly(q:Query):
 if q.year==2026 and q.month==11:raise HTTPException(422,'Partial-month anomaly disabled until daily historical data is available.')
 r=fixture(q.region_id) if q.region_id in REGIONS else rows(q)
 c=next((x for x in r if x['year']==q.year and x['month']==q.month and not x['future'] and not x['gap']),None)
 if not c:raise HTTPException(404,'No usable observations in selected month.')
 v=[x['value'] for x in r if x['year']<q.year and x['month']==q.month and not x['gap']]
 if not v:raise HTTPException(422,'No baseline years.')
 pct=sum(x<=c['value'] for x in v)/len(v)*100;sd=pstdev(v);level='Extreme' if pct>97.5 else 'High' if pct>=90 else 'Above normal' if pct>=75 else 'Normal'
 return payload({'count':c['value'],'median':median(v),'ratio':c['value']/median(v) if median(v) else None,'z':(c['value']-mean(v))/sd if sd else None,'percentile':pct,'rank':1+sum(x>c['value'] for x in v),'n_years':len(v)+1,'alert_level':level})
@app.post('/api/annual')
def annual(q:Query):
 r=rows(q);out=[]
 for y in sorted({x['year'] for x in r if x['year']<2026}):
  group=[x for x in r if x['year']==y]
  if len(group)==12:out.append({'year':y,'total':sum(x['value'] for x in group if not x['gap']),'lo':sum(x['lo'] for x in group if not x['gap']),'hi':sum(x['hi'] for x in group if not x['gap'])})
 return payload(sorted(out,key=lambda x:x['total'],reverse=True))
@app.post('/api/daily')
def daily(q:Query):raise HTTPException(501,'Daily historical observations have not been loaded; monthly fixture only.')
@app.post('/api/events')
def events(q:Query):raise HTTPException(501,'Fire-event clustering requires real reference-sensor observations.')
@app.get('/api/validation')
def validation(region_id:str='sri_lanka'):return {'region_id':region_id,'status':'not_measured','n':0,'holdout':None,'precision':wilson(0,0),'synthetic':True}
def hotspot_rows(q):
 if q.region_id not in REGIONS:raise HTTPException(422,'Unknown region.')
 west,south,east,north=REGIONS[q.region_id]['bbox'];out=[]
 for i in range(95):
  lat=south+abs(math.fmod(math.sin(i*78.233)*43758.5453,1))*(north-south);lon=(west+east)/2+(abs(math.fmod(math.sin(i*12.989)*43758.5453,1))-.5)*(east-west)*.6
  if q.bbox and not(q.bbox[0]<=lon<=q.bbox[2] and q.bbox[1]<=lat<=q.bbox[3]):continue
  if not q.start<='2026-11-14'<=q.end:continue
  out.append({'id':f'demo-{q.region_id}-{i}','lat':lat,'lon':lon,'date':'2026-11-14','time':f'{3+i%17:02}:42','sensor':'MODIS' if i%4==0 else 'VIIRS','satellite':'Aqua' if i%4==0 else 'NOAA20' if i%2 else 'NOAA21','confidence_label':'Possible fire' if i%4==0 else 'Likely fire','confidence_score':None,'evidence':'Synthetic example; no authentic evidence evaluated','frp_mw':round(2+abs(math.fmod(math.sin(i*78.233)*43758.5453,1))*42),'daynight':'D','harmonized_weight':i%2,'synthetic':True})
 return out
@app.post('/api/hotspots')
def hotspots(q:Query):return {'type':'FeatureCollection','synthetic':True,'features':[{'type':'Feature','geometry':{'type':'Point','coordinates':[r['lon'],r['lat']]},'properties':r} for r in hotspot_rows(q)]}
def csv_response(data,name):
 f=io.StringIO()
 if data:w=csv.DictWriter(f,fieldnames=data[0].keys());w.writeheader();w.writerows(data)
 return Response(f.getvalue(),media_type='text/csv',headers={'Content-Disposition':f'attachment; filename="{name}-SYNTHETIC.csv"'})
@app.post('/api/hotspots.csv')
def hotspots_csv(q:Query):return csv_response(hotspot_rows(q),'hotspots')
@app.post('/api/summary.csv')
def summary_csv(q:Query):return csv_response(rows(q),'monthly')
