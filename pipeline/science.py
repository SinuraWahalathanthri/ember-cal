"""Reference math. Fitting and validation require actual overlapping observations."""
import math
import hashlib
from datetime import datetime, timezone
import numpy as np

def shrink_ratio(modis, viirs, parent=1.0, strength=50):
    if min(modis,viirs)<0 or parent<=0 or strength<0:
        raise ValueError('Counts must be nonnegative; parent must be positive.')
    if modis==0 or viirs==0:
        return float(parent)
    return math.exp((modis*math.log(viirs/modis)+strength*math.log(parent))/(modis+strength))

def bootstrap_years(modis, viirs, parent=1.0, strength=50, n=1000, seed=42):
    m,v=np.asarray(modis,dtype=float),np.asarray(viirs,dtype=float)
    if len(m)!=len(v) or not len(m):
        raise ValueError('Paired annual overlap observations are required.')
    rng=np.random.default_rng(seed)
    ratios=[]
    for _ in range(n):
        idx=rng.integers(0,len(m),len(m))
        ratios.append(shrink_ratio(float(m[idx].sum()),float(v[idx].sum()),parent,strength))
    return {'value':shrink_ratio(float(m.sum()),float(v.sum()),parent,strength),'lo':float(np.quantile(ratios,.05)),'hi':float(np.quantile(ratios,.95))}

def pettitt(values):
    x=np.asarray(values,dtype=float)
    if len(x)<3:
        raise ValueError('At least three annual observations required.')
    u=np.array([np.sign(x[:t,None]-x[None,t:]).sum() for t in range(1,len(x))])
    k=float(abs(u).max());n=len(x)
    return {'index':int(abs(u).argmax()+1),'statistic':k,'p_value':min(1.0,2*math.exp(-6*k*k/(n**3+n**2)))}

def metrics(observed,predicted):
    y,p=np.asarray(observed,dtype=float),np.asarray(predicted,dtype=float)
    if y.shape!=p.shape or not y.size:
        raise ValueError('Equal, nonempty observed and predicted arrays required.')
    err=p-y;nonzero=y!=0;denom=float(((y-y.mean())**2).sum())
    return {'r2':1-float((err**2).sum())/denom if denom else None,'mape':float(np.abs(err[nonzero]/y[nonzero]).mean()*100) if nonzero.any() else None,'bias_percent':float(err.sum()/y.sum()*100) if y.sum() else None,'n':len(y)}

def wilson(successes,n,z=1.95996398454):
    if n<1:return {'precision':None,'lo':None,'hi':None,'n':0}
    p=successes/n;den=1+z*z/n;center=(p+z*z/(2*n))/den;half=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den
    return {'precision':p,'lo':max(0,center-half),'hi':min(1,center+half),'n':n}

def confidence(e):
    if e.get('ground')=='false_alarm' or e.get('static') or e.get('built_up'):
        return {'label':'Probably not a vegetation fire','score':0,'evidence':['False-alarm, static-source or built-up evidence; no alerts.']}
    if e.get('ground') in ('confirmed','controlled_burn') or e.get('burn_scar'):
        return {'label':'Confirmed','score':100,'evidence':['Ground confirmation or post-event burn evidence.']}
    evidence=[name for name in ('multisensor','persistence','high_signal','cluster') if e.get(name)]
    label='Likely fire' if e.get('vegetation') and len(evidence)>=2 else 'Possible fire'
    return {'label':label,'score':min(95,20*len(evidence)+(15 if e.get('vegetation') else 0)),'evidence':evidence or ['Insufficient corroborating evidence.']}

def normalize(row):
    sensor=str(row.get('instrument','VIIRS')).upper();is_modis='MODIS' in sensor
    lat,lon=float(row['latitude']),float(row['longitude'])
    if not -90<=lat<=90 or not -180<=lon<=180:raise ValueError('Invalid coordinates')
    raw=row['confidence'];c=float(raw) if is_modis else str(raw).lower()
    cls=('high' if c>=80 else 'nominal' if c>=30 else 'low') if is_modis else {'h':'high','n':'nominal','l':'low'}.get(c,'low')
    time=str(row.get('acq_time','0')).zfill(4);stamp=datetime.fromisoformat(f"{row['acq_date']}T{time[:2]}:{time[2:]}:00+00:00")
    satellite=str(row.get('satellite','unknown'))
    ident=f'{satellite}|{stamp.isoformat()}|{lat:.5f}|{lon:.5f}'
    return {'id':hashlib.sha256(ident.encode()).hexdigest()[:24],'lat':lat,'lon':lon,'ts_utc':stamp.isoformat(),'sensor_family':'MODIS' if is_modis else 'VIIRS','satellite':satellite,'confidence_class':cls,'confidence_raw':raw,'frp_mw':float(row.get('frp') or 0),'daynight':row.get('daynight'),'type':row.get('type'),'version':row.get('version'),'is_nrt':'NRT' in str(row.get('version','')).upper()}
