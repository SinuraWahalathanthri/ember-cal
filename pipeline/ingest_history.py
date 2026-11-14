"""Resumable FIRMS downloader. Does not run automatically or on end-user queries.

Requires FIRMS_MAP_KEY in the process environment. Raw response files stay local;
keys are never logged. Check NASA availability and quota before bulk ingestion.
"""
import argparse,csv,io,json,os,time
from datetime import date,timedelta
from pathlib import Path
import httpx
BASE='https://firms.modaps.eosdis.nasa.gov'
def ingest(region,source,start,end):
 key=os.environ.get('FIRMS_MAP_KEY')
 if not key:raise SystemExit('FIRMS_MAP_KEY is missing. Use make reproduce for the synthetic demonstration.')
 config=json.loads(Path('config/regions.json').read_text());bbox=','.join(map(str,config[region]['bbox']))
 dest=Path('data/raw')/region/source;dest.mkdir(parents=True,exist_ok=True)
 cp=dest/'checkpoint.json';current=date.fromisoformat(json.loads(cp.read_text())['next_date']) if cp.exists() else date.fromisoformat(start);stop=date.fromisoformat(end)
 with httpx.Client(timeout=90,follow_redirects=True) as client:
  while current<=stop:
   days=min(5,(stop-current).days+1);path=dest/f'{current}.csv'
   if not path.exists():
    for attempt in range(6):
     try:
      response=client.get(f'{BASE}/api/area/csv/{key}/{source}/{bbox}/{days}/{current}')
      if response.status_code in (429,500,502,503,504):time.sleep(min(60,2**attempt));continue
      if response.status_code!=200:raise SystemExit(f'FIRMS request failed with status {response.status_code}; URL withheld to protect key.')
      content=response.text
      if not content.startswith('latitude,'):raise SystemExit('FIRMS returned an error or unexpected schema; no checkpoint advanced. Check quota and availability.')
      parsed=list(csv.DictReader(io.StringIO(content)));path.write_text(content);print(f'{region} {source} {current}: {len(parsed)} rows');break
     except httpx.HTTPError:
      if attempt==5:raise SystemExit('FIRMS network request failed; key-bearing URL withheld.')
      time.sleep(min(60,2**attempt))
    else:raise SystemExit('FIRMS unavailable after retries; resume later.')
   current+=timedelta(days=days);temp=cp.with_suffix('.tmp');temp.write_text(json.dumps({'next_date':str(current)}));temp.replace(cp);time.sleep(2)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--region',default='sri_lanka');p.add_argument('--source',default='MODIS_SP');p.add_argument('--start',default='2000-11-01');p.add_argument('--end',default=str(date.today()));a=p.parse_args();ingest(a.region,a.source,a.start,a.end)
