"""Normalize a local FIRMS archive zip into Parquet; never extract untrusted paths."""
import argparse,csv,io,zipfile
from pathlib import Path
from pipeline.science import normalize
def run(archive,output):
 import pandas as pd
 rows=[]
 with zipfile.ZipFile(archive) as z:
  for member in z.infolist():
   if not member.filename.lower().endswith('.csv'):continue
   if member.file_size>250_000_000:raise ValueError('CSV exceeds 250 MB safety limit; split the archive.')
   with z.open(member) as raw:
    for row in csv.DictReader(io.TextIOWrapper(raw,encoding='utf-8-sig')):rows.append(normalize(row))
 frame=pd.DataFrame(rows)
 if not frame.empty:frame=frame.drop_duplicates('id')
 Path(output).parent.mkdir(parents=True,exist_ok=True);frame.to_parquet(output,index=False);print(f'{len(frame)} normalized, deduplicated records saved.')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('archive');p.add_argument('--output',default='data/parquet/import.parquet');a=p.parse_args();run(a.archive,a.output)
