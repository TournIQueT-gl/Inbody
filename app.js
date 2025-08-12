
// InBody Ultra AR v5.6 — All-In (no security pack)
(function(){
const APP_VERSION='5.6';
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
function todayISO(){ return new Date().toISOString().slice(0,10) }
function parseF(v){ const x=parseFloat(v); return Number.isFinite(x)? x : null }
function uid(){ return Math.random().toString(36).slice(2) }
function nf(x){ return x==null? '—' : Number(x).toFixed(1) }
function vibrate(ms=12){ try{ navigator.vibrate && navigator.vibrate(ms) }catch(_){} }

const LS={THEME:'inbody.theme.v56', THEMECFG:'inbody.themecfg.v56', GOALS:'inbody.goals.v56', WATER:'inbody.water.v56', CSVPROF:'inbody.csvprofiles.v56', APPVER:'inbody.appver'};

// Toast
const toastEl = $('#toast');
function toast(msg, t=2200){ toastEl.textContent=msg; toastEl.style.display='block'; setTimeout(()=> toastEl.style.display='none', t) }

// Theme
function applyThemeCfg(cfg){ document.documentElement.style.setProperty('--accent', cfg.accent||'#5b8cff'); document.documentElement.style.setProperty('--radius', (cfg.radius||18)+'px') }
function setTheme(name){ document.documentElement.setAttribute('data-theme', name); localStorage.setItem(LS.THEME, name); $('#themeName').textContent=(name==='light'?'فاتح':'غامق') }

applyThemeCfg(JSON.parse(localStorage.getItem(LS.THEMECFG)||'{"accent":"#5b8cff","radius":18}'));
setTheme(localStorage.getItem(LS.THEME) || ((matchMedia && matchMedia('(prefers-color-scheme: light)').matches)?'light':'dark'));
$('#btnTheme').onclick=()=> setTheme(document.documentElement.getAttribute('data-theme')==='light'?'dark':'light');

// SW update banner
window.addEventListener('message', (e)=>{ if(e.data && e.data.type==='SW_UPDATED'){ $('#updateBanner').style.display='block' } });
$('#reloadApp').onclick=()=> location.reload(true);

// Install
let deferredPrompt=null; window.addEventListener('beforeinstallprompt',(e)=>{ e.preventDefault(); deferredPrompt=e; $('#btnInstall').disabled=false }); $('#btnInstall').onclick=()=>{ if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt=null; }};

// ---------- IndexedDB (with LS migration) ----------
let db; const DB_NAME='inbody-ultra', VERS=1;
function idbOpen(){
  return new Promise((res,rej)=>{
    const rq=indexedDB.open(DB_NAME, VERS);
    rq.onupgradeneeded=(ev)=>{
      db=rq.result;
      if(!db.objectStoreNames.contains('entries')) db.createObjectStore('entries', {keyPath:'id'});
      if(!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
    };
    rq.onsuccess=()=>{ db=rq.result; // migrate
      const migrated = localStorage.getItem('inbody.migrated.v56');
      if(!migrated){
        try{
          const old = JSON.parse(localStorage.getItem('inbody.entries.v53')||'[]').concat(JSON.parse(localStorage.getItem('inbody.entries.v52')||'[]'));
          if(old && old.length){
            const tx=db.transaction(['entries'],'readwrite'); const st=tx.objectStore('entries');
            old.forEach(e=> st.put(e));
          }
          const goals = JSON.parse(localStorage.getItem('inbody.goals.v53')||'null') || JSON.parse(localStorage.getItem('inbody.goals.v52')||'null');
          if(goals){ const tx=db.transaction(['meta'],'readwrite'); tx.objectStore('meta').put(goals,'goals') }
          const water = JSON.parse(localStorage.getItem('inbody.water.v53')||'null') || JSON.parse(localStorage.getItem('inbody.water.v52')||'null');
          if(water){ const tx=db.transaction(['meta'],'readwrite'); tx.objectStore('meta').put(water,'water') }
        }catch(_){}
        localStorage.setItem('inbody.migrated.v56','1');
      }
      res();
    };
    rq.onerror=()=> rej(rq.error);
  });
}
function idbAllEntries(){ return new Promise((res,rej)=>{ const tx=db.transaction(['entries'],'readonly'); const st=tx.objectStore('entries'); const rq=st.getAll(); rq.onsuccess=()=>{ res((rq.result||[]).sort((a,b)=> a.date.localeCompare(b.date))) }; rq.onerror=()=>rej(rq.error) }) }
function idbPutEntry(e){ return new Promise((res,rej)=>{ const tx=db.transaction(['entries'],'readwrite'); const st=tx.objectStore('entries'); st.put(e).onsuccess=()=>res(); tx.onerror=()=>rej(tx.error) }) }
function idbDelEntry(id){ return new Promise((res,rej)=>{ const tx=db.transaction(['entries'],'readwrite'); tx.objectStore('entries').delete(id).onsuccess=()=>res(); tx.onerror=()=>rej(tx.error) }) }
function idbPutMeta(key,val){ return new Promise((res,rej)=>{ const tx=db.transaction(['meta'],'readwrite'); tx.objectStore('meta').put(val,key).onsuccess=()=>res(); tx.onerror=()=>rej(tx.error) }) }
function idbGetMeta(key){ return new Promise((res,rej)=>{ const tx=db.transaction(['meta'],'readonly'); const rq=tx.objectStore('meta').get(key); rq.onsuccess=()=>res(rq.result||null); rq.onerror=()=>rej(rq.error) }) }

// ---------- Web Worker (analytics) ----------
let workerBlobUrl=null, worker=null;
function ensureWorker(){
  if(worker) return worker;
  const js = document.querySelector('script[src*="app.js"]').src.replace('app.js','worker.js');
  // fetch worker script text and create blob
  return fetch(js).then(r=>r.text()).then(code=>{
    const blob=new Blob([code],{type:'application/javascript'});
    workerBlobUrl=URL.createObjectURL(blob);
    worker = new Worker(workerBlobUrl);
    return worker;
  });
}

// ---------- State + helpers ----------
const state={ entries:[], goals:{weight:null,weekly:null,deadline:null}, water:{date:todayISO(),intake:0,goal:3000}, toggles:{w:true,bf:true}, analysis:null, streak:{count:0,freeze:0} };

async function refreshState(){
  state.entries = await idbAllEntries();
  state.goals = await idbGetMeta('goals') || {weight:null,weekly:null,deadline:null};
  state.water = await idbGetMeta('water') || {date:todayISO(),intake:0,goal:3000};
  analyze();
  renderAll();
}
function saveGoals(g){ state.goals=g; idbPutMeta('goals',g).then(()=>{ renderGoals(); renderKPIs(); renderChart(); }) }
function saveWater(w){ state.water=w; idbPutMeta('water',w).then(()=> renderWater()) }

// ---------- Analytics via worker ----------
async function analyze(){
  const w = await ensureWorker();
  return new Promise((res)=>{
    w.onmessage=(e)=>{ if(e.data && e.data.type==='ANALYZE_DONE'){ state.analysis=e.data.payload; renderInsights(); res() } };
    w.postMessage({type:'ANALYZE', payload: state.entries});
  });
}

// ---------- Chart ----------
let chart, showAvg=false, range='all';
function computeMovingAvg(arr,n=7){ const out=[]; for(let i=0;i<arr.length;i++){ const w=arr.slice(Math.max(0,i-n+1),i+1).filter(x=>x!=null); out.push(w.length? w.reduce((a,b)=>a+b,0)/w.length : null) } return out }
function filterByRange(entries,days){ if(days==='all') return entries; const c=new Date(); c.setDate(c.getDate()-Number(days)); return entries.filter(e=> new Date(e.date)>=c) }
async function renderChart(){
  await ensureCharts();
  const elSkel=$('#chartSkel'), cvs=$('#chart');
  const all=state.entries, entries=filterByRange(all, range);
  const labels=entries.map(e=>e.date);
  const weight=entries.map(e=>e.weightKg??null), bodyFat=entries.map(e=>e.bodyFatPct??null);
  const weightAvg= showAvg ? computeMovingAvg(weight,7) : [];
  const goalLine = (state.goals.weight!=null) ? entries.map(()=> state.goals.weight) : [];
  const annoIdx = entries.reduce((a,e,i)=>{ if((e.notes||'').toLowerCase().includes('inbody') || (e.notes||'').toLowerCase().includes('إنبودي')) a.push(i); return a }, []);

  if(!chart){
    cvs.style.display='block'; elSkel.style.display='none';
    chart = new Chart(cvs, { type:'line', data:{ labels, datasets:[
      { label:'الوزن (كجم)', data: weight, tension:.35, yAxisID:'y', hidden: !state.toggles.w },
      { label:'دهون %', data: bodyFat, tension:.35, yAxisID:'y1', hidden: !state.toggles.bf },
      { label:'متوسط 7 أيام', data: weightAvg, tension:.35, yAxisID:'y', borderDash:[6,4], hidden: !showAvg },
      { label:'الهدف', data: goalLine, tension:0, yAxisID:'y', borderDash:[2,4], pointRadius:0 }
    ]}, options:{ responsive:true, plugins:{ zoom:{ zoom:{ wheel:{enabled:true}, pinch:{enabled:true}, mode:'x' }, pan:{ enabled:true, mode:'x'} }, tooltip:{ callbacks:{ afterBody:(ctx)=> ctx[0] ? (annoIdx.includes(ctx[0].dataIndex)? ['InBody Day'] : []) : [] } } }, scales:{ y:{ position:'right' }, y1:{ position:'left', grid:{ drawOnChartArea:false } } } });
  } else {
    chart.data.labels=labels;
    chart.data.datasets[0].data=weight; chart.data.datasets[0].hidden=!state.toggles.w;
    chart.data.datasets[1].data=bodyFat; chart.data.datasets[1].hidden=!state.toggles.bf;
    chart.data.datasets[2].data=weightAvg; chart.data.datasets[2].hidden=!showAvg;
    chart.data.datasets[3].data=goalLine;
    chart.update();
  }
}
$$('#view-dashboard .chip[data-range]').forEach(c=> c.onclick=()=>{ $$('#view-dashboard .chip[data-range]').forEach(x=>x.classList.remove('active')); c.classList.add('active'); range=c.dataset.range; renderChart() });
$('#toggleAvg').onclick=(e)=>{ showAvg=!showAvg; e.target.classList.toggle('active', showAvg); renderChart() };
$('#resetZoom').onclick=()=>{ if(chart && chart.resetZoom) chart.resetZoom() };
$('#toggleW').onclick=(e)=>{ state.toggles.w=!state.toggles.w; e.target.textContent= state.toggles.w ? 'إخفاء الوزن' : 'إظهار الوزن'; renderChart() };
$('#toggleBF').onclick=(e)=>{ state.toggles.bf=!state.toggles.bf; e.target.textContent= state.toggles.bf ? 'إخفاء الدهون%' : 'إظهار الدهون%'; renderChart() };

// ---------- Monthly overview ----------
function monthlyStats(){
  const byMonth={};
  for(const e of state.entries){ const m=e.date.slice(0,7); byMonth[m]=byMonth[m]||{count:0, sumW:0, maxW:-1e9, minW:1e9, first:null, last:null}; const v=e.weightKg; if(v!=null){ byMonth[m].count++; byMonth[m].sumW+=v; byMonth[m].maxW=Math.max(byMonth[m].maxW,v); byMonth[m].minW=Math.min(byMonth[m].minW,v); byMonth[m].first=byMonth[m].first??v; byMonth[m].last=v; } }
  const cards=[]; Object.entries(byMonth).forEach(([m,o])=>{ const avg = o.count? (o.sumW/o.count).toFixed(1) : '—'; const change = (o.last!=null && o.first!=null) ? (o.last-o.first).toFixed(1) : '—'; cards.push(`<div class="card"><div class="title">${m}</div><div class="kpi"><div class="h">متوسط</div><div class="v">${avg}</div></div><div class="kpi"><div class="h">أعلى/أقل</div><div class="v">${o.maxW.toFixed?o.maxW.toFixed(1):'—'} / ${o.minW.toFixed?o.minW.toFixed(1):'—'}</div></div><div class="kpi"><div class="h">صافي التغير</div><div class="v">${change}</div></div></div>`) });
  $('#monthly').innerHTML = cards.join('');
}

// ---------- KPIs & Insights ----------
function renderKPIs(){
  const h = parseF($('#height')?.value)/100;
  const latest=state.entries[state.entries.length-1], prev=state.entries[state.entries.length-2];
  if(latest){
    $('#kpiWeight').textContent=nf(latest.weightKg);
    $('#kpiBodyFat').textContent=nf(latest.bodyFatPct);
    $('#kpiBMI').textContent= (h && latest.weightKg)? (latest.weightKg/(h*h)).toFixed(1) : '—';
    if(prev && prev.weightKg!=null){ const d=latest.weightKg-prev.weightKg; $('#deltaWeight').textContent=`${d>0?'+':''}${d.toFixed(1)} كجم`; $('#deltaWeight').className='delta '+(d>0?'up':d<0?'down':'') }
    if(prev && prev.bodyFatPct!=null){ const d=latest.bodyFatPct-prev.bodyFatPct; $('#deltaBodyFat').textContent=`${d>0?'+':''}${d.toFixed(1)}٪`; $('#deltaBodyFat').className='delta '+(d>0?'up':d<0?'down':'') }
  } else { $('#kpiWeight').textContent='—'; $('#kpiBodyFat').textContent='—'; $('#kpiBMI').textContent='—'; $('#deltaWeight').textContent=''; $('#deltaBodyFat').textContent='' }
  // ETA
  let eta='—';
  if(state.analysis && state.analysis.regression && state.goals.weight!=null){
    const {slope,intercept}=state.analysis.regression;
    if(Math.abs(slope)>0.001){
      const xTarget = (state.goals.weight - intercept)/slope;
      const daysRemaining = Math.round(Math.max(0, xTarget - (state.entries.length-1)));
      const when = new Date(); when.setDate(when.getDate()+daysRemaining); eta = when.toISOString().slice(0,10);
    } else { eta='غير واضح' }
  }
  $('#kpiETA').textContent=eta;
}

function renderInsights(){
  monthlyStats();
  const badges=[];
  if(state.analysis?.plateau) badges.push('⚠️ ثبات ١٤ يوم');
  const count=state.entries.length; if(count>=10) badges.push('🏅 10 قراءات'); if(count>=50) badges.push('🥇 50 قراءة');
  $('#badges').innerHTML = badges.map(b=>`<div class="badge">${b}</div>`).join('');
}

// ---------- Planner + Simulation + Streaks ----------
function renderPlanner(){
  const days=['السبت','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'];
  const today = new Date(); const idx = (n)=> new Date(today.getFullYear(), today.getMonth(), today.getDate()+n).toISOString().slice(0,10);
  const chips=[]; for(let i=0;i<7;i++){ const d=idx(i); const name=days[(today.getDay()+i)%7]; chips.push(`<button class="chip" data-plan="${d}">${name} • ${d}</button>`) }
  $('#planner').innerHTML = chips.join('');
  $$('#planner .chip').forEach(b=> b.onclick=()=>{ b.classList.toggle('active'); vibrate(8) });
}
$('#simWeekly').oninput=()=>{
  const latest=state.entries[state.entries.length-1]; const gw=state.goals.weight;
  if(!latest || gw==null){ $('#simETA').textContent='—'; return }
  const rate=parseF($('#simWeekly').value)||-0.5;
  const weeks=Math.abs((latest.weightKg - gw)/rate); const days=Math.round(weeks*7);
  const when=new Date(); when.setDate(when.getDate()+days); $('#simETA').textContent=when.toISOString().slice(0,10);
};

// ---------- Forms ----------
function updateBMI(){ const w=parseF($('#weight')?.value), h=parseF($('#height')?.value)/100; const bf=parseF($('#bodyFat')?.value); $('#bmi').value=(w&&h)?(w/(h*h)).toFixed(1):''; $('#autoCalcs').textContent = (w!=null && bf!=null)? (`كتلة دهنية: ${(w*bf/100).toFixed(1)}كجم • كتلة صافية: ${(w-w*bf/100).toFixed(1)}كجم`) : '—' }
document.addEventListener('input', ev=>{ if(['weight','height','bodyFat'].includes(ev.target.id)) updateBMI() });

async function saveEntry(obj){
  // replace if same date exists
  const existing = state.entries.find(x=> x.date===obj.date && x.id!==obj.id);
  if(existing){ await idbDelEntry(existing.id) }
  await idbPutEntry(obj);
  await refreshState();
  toast('تم الحفظ');
}

$('#saveBtn').onclick=async()=>{
  const d=$('#date').value; if(!d) return alert('اختر تاريخًا'); if(new Date(d)>new Date()) return alert('تاريخ مستقبل!');
  const w=parseF($('#weight').value); if(w==null) return alert('الوزن مطلوب');
  const obj={ id:uid(), date:d, weightKg:w, bodyFatPct:parseF($('#bodyFat').value), muscleKg:parseF($('#muscle').value), waterPct:parseF($('#water').value), visceralFat:parseF($('#visceral').value), bmr:parseF($('#bmr').value)?parseInt($('#bmr').value):null, bmi:$('#bmi').value?parseFloat($('#bmi').value):null, notes:($('#notes').value||'').trim() };
  await saveEntry(obj);
  $('#date').value=todayISO(); ['weight','bodyFat','muscle','water','visceral','bmr','notes'].forEach(id=> $('#'+id).value=''); updateBMI();
};
$('#copyLast').onclick=()=>{ const last=state.entries[state.entries.length-1]; if(!last) return alert('لا توجد قراءة سابقة'); $('#date').value=todayISO(); $('#weight').value=last.weightKg??''; $('#bodyFat').value=last.bodyFatPct??''; $('#muscle').value=last.muscleKg??''; $('#water').value=last.waterPct??''; $('#visceral').value=last.visceralFat??''; $('#bmr').value=last.bmr??''; $('#notes').value=last.notes||''; updateBMI() };
$$('.chip[data-preset]').forEach(c=> c.onclick=()=>{ const p=c.dataset.preset; const dt=new Date(); if(p!=='today') dt.setDate(dt.getDate()+Number(p)); $('#date').value=dt.toISOString().slice(0,10) });

// Quick Add ± controls
$('#minusW').onclick=()=>{ const v=parseF($('#qaWeight').value)||0; $('#qaWeight').value=(v-0.2).toFixed(1); vibrate(8) };
$('#plusW').onclick=()=>{ const v=parseF($('#qaWeight').value)||0; $('#qaWeight').value=(v+0.2).toFixed(1); vibrate(8) };
$('#qaSave').onclick=async()=>{
  const w=parseF($('#qaWeight').value); const bf=parseF($('#qaBodyFat').value);
  if(w==null) return alert('اكتب وزنًا');
  const today=todayISO(); const last=state.entries[state.entries.length-1]; if(last && last.weightKg!=null){ const diff=Math.abs(w-last.weightKg); if(diff>5){ if(!confirm(`فرق كبير (${diff.toFixed(1)} كجم). متأكد؟`)) return } }
  await saveEntry({ id:uid(), date:today, weightKg:w, bodyFatPct:bf??null, notes:'' });
  $('#qaWeight').value=''; $('#qaBodyFat').value='';
};
$$('.chip[data-qa-add]').forEach(b=> b.onclick=()=> addWater(parseInt(b.dataset.qaAdd)) );
$('#qaInBody').onclick=()=>{ location.hash='add'; $('#bodyFat').focus() };

// Goals + Planner
$('#saveGoals').onclick=()=>{ const g={ weight: parseF($('#goalWeight').value), weekly: parseF($('#goalWeekly').value), deadline: $('#goalDeadline').value||null }; saveGoals(g); toast('تم حفظ الأهداف') };
$('#clearGoals').onclick=()=> saveGoals({weight:null,weekly:null,deadline:null});

function renderGoals(){
  const g=state.goals||{weight:null,weekly:null,deadline:null};
  $('#goalWeight').value=g.weight??''; $('#goalWeekly').value=g.weekly??''; $('#goalDeadline').value=g.deadline??'';
  // sim slider reflect weekly
  $('#simWeekly').value = g.weekly!=null ? g.weekly : -0.5;
  $('#simWeekly').dispatchEvent(new Event('input'));
}

// Water + ICS
function waterState(){ const d=state.water; const today=todayISO(); if(!d || d.date!==today){ return { date: today, intake: 0, goal: d?.goal||3000 } } return d }
function renderWater(){ const s=waterState(); $('#waterGoal').value=s.goal; const pct=Math.max(0,Math.min(100,Math.round((s.intake/Math.max(s.goal,1))*100))); $('#waterPct').textContent=pct+'%'; $('#waterRing').style.transform=`rotate(${pct/100*360-90}deg)` }
function addWater(ml){ const s=waterState(); s.intake=Math.max(0, s.intake+ml); saveWater(s); try{ if('Notification' in window && Notification.permission==='granted'){ new Notification('تم تسجيل الماء',{ body:`+${ml} مل • ${s.intake}/${s.goal} مل` }) } }catch(_){} }
$('#addCustom').onclick=()=>{ const v=parseInt($('#waterCustom').value||'0'); if(v>0) addWater(v) };
$('#waterGoal').addEventListener('input', ()=>{ const s=waterState(); s.goal=parseInt($('#waterGoal').value||'0')||3000; saveWater(s) });
$('#waterReset').onclick=()=>{ const s=waterState(); s.intake=0; saveWater(s) };

let waterInterval=null; function inQuietHours(start,end,d=new Date()){ const [sh,sm]=start.split(':').map(Number); const [eh,em]=end.split(':').map(Number); const cur=d.getHours()*60+d.getMinutes(); const s=sh*60+sm, e=eh*60+em; return s<=e ? (cur>=s&&cur<e):(cur>=s||cur<e) }
$('#waterNotify').onclick=async()=>{ try{ if(!('Notification' in window)) return alert('لا إشعارات'); let perm=Notification.permission; if(perm!=='granted'){ perm=await Notification.requestPermission(); } if(perm!=='granted') return; if(waterInterval){ clearInterval(waterInterval); waterInterval=null; $('#waterNotify').textContent='تفعيل تذكير الماء'; return } $('#waterNotify').textContent='إيقاف تذكير الماء'; const cfg={waterInterval:90,quietStart:'22:00',quietEnd:'08:00'}; const tick=()=>{ const now=new Date(); if(!inQuietHours(cfg.quietStart,cfg.quietEnd,now)){ try{ const s=waterState(); new Notification('اشرب ماء 💧',{ body:`${s.intake}/${s.goal} مل` }) }catch(_){ } } }; tick(); waterInterval=setInterval(tick, 90*60*1000); }catch(_){ } };

// Advanced ICS

    $('#icsAdvBtn').onclick=()=>{
      const from=$('#icsFrom').value||'09:00', to=$('#icsTo').value||'21:00', every=parseInt($('#icsEvery').value||'90');
      const now=new Date(); const dt=now.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
      const ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//InBody Ultra 5.6//Water//AR
BEGIN:VEVENT
UID:${uid()}@inbody-ultra
DTSTAMP:${dt}
SUMMARY:اشرب ماء 💧
RRULE:FREQ=DAILY
DTSTART:${dt}
DURATION:PT0M
BEGIN:VALARM
TRIGGER:-PT0M
REPEAT:6
DURATION:PT${every}M
ACTION:DISPLAY
DESCRIPTION:اشرب ماء
END:VALARM
END:VEVENT
END:VCALENDAR`;
      const blob=new Blob([ICS.replace(/\n/g,'\r\n')],{type:'text/calendar'});
      const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='water-smart.ics'; a.click(); URL.revokeObjectURL(url);
    };

};

// ---------- Virtualized history ----------
let historyRange='all';
function filterHistory(){
  const q=($('#searchNotes')?.value||'').trim().toLowerCase();
  let entries=state.entries;
  if(historyRange!=='all'){ const c=new Date(); c.setDate(c.getDate()-Number(historyRange)); entries=entries.filter(e=> new Date(e.date)>=c) }
  if(q) entries=entries.filter(e=> (e.notes||'').toLowerCase().includes(q));
  return entries;
}
function renderVTable(){
  const cont=$('#vtable'); const rowH=38;
  const data=filterHistory();
  const totalH=data.length*rowH;
  cont.innerHTML='';
  const spacerTop=document.createElement('div'); spacerTop.className='vspacer'; spacerTop.style.height='0px';
  const viewport=document.createElement('div');
  const spacerBot=document.createElement('div'); spacerBot.className='vspacer'; spacerBot.style.height= Math.max(0,totalH) + 'px';
  cont.appendChild(spacerTop); cont.appendChild(viewport); cont.appendChild(spacerBot);

  function draw(){
    const scrollTop=cont.scrollTop;
    const height=cont.clientHeight;
    const start=Math.max(0, Math.floor(scrollTop/rowH)-5);
    const end=Math.min(data.length, start + Math.ceil(height/rowH)+10);
    spacerTop.style.height = (start*rowH)+'px';
    spacerBot.style.height = (totalH - end*rowH)+'px';
    viewport.innerHTML='';
    for(let i=start;i<end;i++){
      const e=data[i];
      const div=document.createElement('div'); div.className='row';
      function cell(v){ const c=document.createElement('div'); c.textContent=v; return c }
      const editBtn=document.createElement('button'); editBtn.textContent='تعديل'; editBtn.className='ghost'; editBtn.onclick=()=>{ location.hash='add'; $('#date').value=e.date; $('#weight').value=e.weightKg??''; $('#bodyFat').value=e.bodyFatPct??''; $('#muscle').value=e.muscleKg??''; $('#water').value=e.waterPct??''; $('#visceral').value=e.visceralFat??''; $('#bmr').value=e.bmr??''; $('#bmi').value=e.bmi??''; $('#notes').value=e.notes||''; }
      const delBtn=document.createElement('button'); delBtn.textContent='حذف'; delBtn.className='ghost'; delBtn.onclick=async()=>{ if(confirm('حذف هذه القراءة؟')){ await idbDelEntry(e.id); await refreshState(); toast('تم الحذف') } };
      [cell(e.date),cell(nf(e.weightKg)),cell(nf(e.bodyFatPct)),cell(nf(e.muscleKg)),cell(nf(e.waterPct)),cell(nf(e.visceralFat)),cell(e.bmr??'—'),cell(e.bmi??'—'),cell(e.notes||'—')].forEach(x=> div.appendChild(x));
      const actions=document.createElement('div'); actions.appendChild(editBtn); actions.appendChild(delBtn); div.appendChild(actions);
      viewport.appendChild(div);
    }
  }
  cont.onscroll=draw; draw();
}
$('#searchNotes').addEventListener('input', renderVTable);
$$('#view-history .chip[data-range]').forEach(c=> c.onclick=()=>{ $$('#view-history .chip[data-range]').forEach(x=>x.classList.remove('active')); c.classList.add('active'); historyRange=c.dataset.range; renderVTable() });

// ---------- CSV import/export with saved profile ----------
function parseCSV(text){ const lines=text.split(/\r?\n/).filter(x=>x.trim().length); if(!lines.length) return null; const header=lines[0].split(',').map(h=>h.trim().toLowerCase()); const rows=lines.slice(1).map(l=> l.split(',')); return {header, rows} }
function applyTemplateMap(tpl, header){
  const saved=JSON.parse(localStorage.getItem(LS.CSVPROF)||'{}');
  if(saved[tpl] && Array.isArray(saved[tpl].header) && JSON.stringify(saved[tpl].header)===JSON.stringify(header)) return saved[tpl].map;
  const idx=(name)=> header.findIndex(h=> h.includes(name));
  const map={}; if(tpl==='inbody'){ map.date=idx('date'); map.weightKg=idx('weight'); map.bodyFatPct=idx('body fat'); map.muscleKg=idx('muscle'); }
  else if(tpl==='miscale'){ map.date=idx('date'); map.weightKg=idx('weight'); }
  else { ['date','weightKg','bodyFatPct','muscleKg','waterPct','visceralFat','bmr','bmi','notes'].forEach(f=>{ const hname=f.replace('Kg','').replace('Pct','').replace('body','body ').replace('weight','weight'); const i= header.findIndex(h=> h.includes(hname.replace('muscle','muscle')) || (f==='date' && h.includes('date')) ); if(i>=0) map[f]=i; }) }
  // save profile
  saved[tpl]={header, map}; localStorage.setItem(LS.CSVPROF, JSON.stringify(saved));
  return map;
}
$('#importCSVBtn').onclick=()=> $('#importCSVFile').click();
$('#importCSVFile').onchange=(ev)=>{ const f=ev.target.files?.[0]; if(!f) return; const reader=new FileReader(); reader.onload=async()=>{ const parsed=parseCSV(reader.result); if(!parsed){ alert('CSV فارغ'); return } const map=applyTemplateMap($('#csvTemplate').value, parsed.header); for(const cols of parsed.rows){ const e={ id:uid(), date: (cols[map.date]||'').slice(0,10), weightKg: parseF(cols[map.weightKg]), bodyFatPct: parseF(cols[map.bodyFatPct]), muscleKg: parseF(cols[map.muscleKg]), waterPct: parseF(cols[map.waterPct]), visceralFat: parseF(cols[map.visceralFat]), bmr: parseF(cols[map.bmr])?parseInt(cols[map.bmr]):null, bmi: parseF(cols[map.bmi]), notes: (cols[map.notes]||'').trim() }; if(e.date) await idbPutEntry(e) } await refreshState(); toast('تم استيراد CSV') }; reader.readAsText(f) };
$('#exportCSVBtn').onclick=async()=>{ const cols=['date','weightKg','bodyFatPct','muscleKg','waterPct','visceralFat','bmr','bmi','notes']; const head=cols.join(','); const all=state.entries; const rows=all.map(e=> cols.map(c=> (e[c]==null?'':String(e[c]).replace(/,/g,' '))).join(',')); const csv=[head].concat(rows).join('\n'); const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='inbody.csv'; a.click(); URL.revokeObjectURL(url) };
$('#exportBtn').onclick=async()=>{ const data=JSON.stringify({goals:state.goals,water:state.water,entries:state.entries},null,2); const blob=new Blob([data],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`inbody-ultra-${todayISO()}.json`; a.click(); URL.revokeObjectURL(url) };
$('#importBtn').onclick=()=> $('#importFile').click();
$('#importFile').onchange=(ev)=>{ const f=ev.target.files?.[0]; if(!f) return; const reader=new FileReader(); reader.onload=async()=>{ try{ const obj=JSON.parse(reader.result); if(obj.goals) await idbPutMeta('goals', obj.goals); if(obj.water) await idbPutMeta('water', obj.water); if(Array.isArray(obj.entries)){ for(const e of obj.entries) await idbPutEntry(e) } await refreshState(); toast('تم استيراد JSON') }catch(_){ alert('JSON غير صالح') } }; reader.readAsText(f) };

// Snapshot v2 (inline chart image + QR via inline script)
$('#snapshotBtn').onclick=async()=>{
  await ensureCharts();
  // make tiny chart image
  const cvs=document.createElement('canvas'); cvs.width=600; cvs.height=260;
  const ctx=cvs.getContext('2d');
  const labels=state.entries.slice(-30).map(e=>e.date);
  const data=state.entries.slice(-30).map(e=>e.weightKg??null);
  new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'Weight',data,tension:.35}]}});
  await new Promise(r=> setTimeout(r, 60));
  const img=cvs.toDataURL('image/png');
  const html=`<!doctype html><meta charset="utf-8"><title>InBody Snapshot</title>
<style>body{{font-family:system-ui;max-width:720px;margin:20px auto;padding:10px}} .card{{border:1px solid #ddd;border-radius:12px;padding:12px;margin:10px 0}} img{{max-width:100%}}</style>
<h1>InBody Snapshot</h1>
<div class="card"><h3>Chart (last 30)</h3><img src="{img}"></div>
<div class="card"><h3>Latest</h3><pre>{latest}</pre></div>
<div class="card"><h3>Share</h3><div id="qrcode"></div><p><a href="{url}">{url}</a></p></div>
<script>
// tiny QR (qrcode.min.js inline)
{qrcode}
var q = new QRCode(document.getElementById('qrcode'), {{ text: '{url}', width: 128, height: 128 }});
</script>
`.replace('{img}', img).replace('{latest}', JSON.stringify(state.entries.slice(-1)[0]||{}, null, 2)).replace(/{url}/g, location.href.split('?')[0]);
  // simple tiny qrcode library (minimal)
  const qrcode_js = `
  /* Minimal QR stub: draws an empty box if generation not available */
  function QRCode(el, opts){ var d=document.createElement('div'); d.style.width=opts.width+'px'; d.style.height=opts.height+'px'; d.style.border='1px solid #333'; d.style.display='inline-block'; d.title=opts.text; el.appendChild(d); }
  `;
  const blob=new Blob([html.replace('{qrcode}', qrcode_js)],{type:'text/html'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='snapshot.html'; a.click(); URL.revokeObjectURL(url);
};

// Settings + Diagnostics
function loadSettings(){ const tc = JSON.parse(localStorage.getItem(LS.THEMECFG)||'{"accent":"#5b8cff","radius":18}'); $('#accent').value=tc.accent; $('#radius').value=tc.radius; }
$('#saveSettings').onclick=()=>{ const cfg={accent:$('#accent').value||'#5b8cff', radius:parseInt($('#radius').value||'18')}; localStorage.setItem(LS.THEMECFG, JSON.stringify(cfg)); applyThemeCfg(cfg); toast('تم الحفظ') };
$('#clearAll').onclick=async()=>{ if(!confirm('مسح كل البيانات؟')) return; // clear db
  await new Promise((res)=>{ const delReq=indexedDB.deleteDatabase('inbody-ultra'); delReq.onsuccess=()=>res(); delReq.onerror=()=>res() });
  localStorage.clear(); location.reload();
};
$('#btnDiagnostics').onclick=()=>{ const card=$('#diagCard'); card.style.display = (card.style.display==='none'?'block':'none'); if(card.style.display==='block'){ $('#ua').textContent=navigator.userAgent; try{ localStorage.setItem('x','1'); localStorage.removeItem('x'); $('#lsOK').textContent='OK' }catch(e){ $('#lsOK').textContent='Blocked' } $('#notif').textContent = (('Notification' in window)? Notification.permission : 'N/A'); if('serviceWorker' in navigator){ navigator.serviceWorker.getRegistrations().then(rs=> $('#sw').textContent = rs.length? 'Registered':'None') } else { $('#sw').textContent='N/A' } } };

// Tabs
const views=['dashboard','add','goals','water','history','settings'];
function show(v){ views.forEach(id=>{ const el=document.getElementById('view-'+id); if(el) el.classList.toggle('active', id===v) }); $$('.tab').forEach(t=>t.classList.toggle('active', t.dataset.view===v)); location.hash=v; if(v==='dashboard'){ renderChart() } if(v==='history'){ renderVTable() } if(v==='goals'){ renderPlanner() }}
$$('.tab').forEach(t=> t.addEventListener('click', ()=> show(t.dataset.view)));
window.addEventListener('hashchange', ()=> show(location.hash.replace('#','') || 'dashboard'));

// Init
(async function init(){
  await idbOpen();
  $('#date').value=todayISO();
  loadSettings();
  await refreshState();
  show(location.hash.replace('#','') || 'dashboard');
})();
})();
