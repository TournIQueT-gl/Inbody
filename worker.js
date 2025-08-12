
self.onmessage = (e)=>{
  const {type, payload} = e.data||{};
  if(type==='ANALYZE'){
    const entries = payload||[];
    const out = {};
    // regression ETA for weight to goal
    try{
      const ys = entries.map(e=> e.weightKg).filter(x=> x!=null);
      const xs = ys.map((_,i)=> i);
      if(ys.length>=2){
        const n=ys.length;
        const sumX = xs.reduce((a,b)=>a+b,0), sumY=ys.reduce((a,b)=>a+b,0);
        const sumXY = ys.reduce((a,b,i)=>a + xs[i]*b,0);
        const sumXX = xs.reduce((a,b)=>a + b*b,0);
        const denom = (n*sumXX - sumX*sumX) || 1e-9;
        const slope=(n*sumXY - sumX*sumY)/denom;
        const intercept=(sumY - slope*sumX)/n;
        out.regression = {slope,intercept};
      }
    }catch(_){}
    // plateau detection (14 days)
    try{
      const last = entries.slice(-14).map(e=> e.weightKg).filter(x=>x!=null);
      if(last.length>=8){
        const diffs= last.slice(1).map((v,i)=> v-last[i]);
        const avg= diffs.reduce((a,b)=>a+b,0)/diffs.length;
        const varr= diffs.reduce((a,b)=> a+(b-avg)**2,0)/diffs.length;
        out.plateau = (Math.abs(avg)<0.02 && Math.sqrt(varr)<0.2);
      } else out.plateau=false;
    }catch(_){ out.plateau=false }
    postMessage({type:'ANALYZE_DONE', payload: out});
  }
}
