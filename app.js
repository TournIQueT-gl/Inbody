
// InBody Ultra AR v5.1 — Safe
(function(){
const APP_VERSION='5.1';
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
function todayISO(){ return new Date().toISOString().slice(0,10) }
function parseF(v){ const x=parseFloat(v); return Number.isFinite(x)? x : null }
function uid(){ return Math.random().toString(36).slice(2) }
function nf(x){ return x==null? '—' : Number(x).toFixed(1) }
function save(k,v){ localStorage.setItem(k, JSON.stringify(v)) }
function load(k,f=null){ try{ const v=localStorage.getItem(k); return v? JSON.parse(v) : f }catch{return f} }
const LS={ENTRIES:'inbody.entries.v51',HEIGHT:'inbody.height.v51',GOALS:'inbody.goals.v51',WATER:'inbody.water.v51',THEME:'inbody.theme.v51',PIN:'inbody.pin.v51',CFG:'inbody.cfg.v51',APPVER:'inbody.appver'};

// Update banner
(function(){
  const prev=load(LS.APPVER,null);
  if(prev && prev!==APP_VERSION){ const b=$('#updateBanner'); if(b){ b.style.display='block'; const r=$('#reloadApp'); if(r){ r.onclick=()=>{ save(LS.APPVER, APP_VERSION); location.reload(true); }; } } }
  save(LS.APPVER, APP_VERSION);
})();

// Theme
function setTheme(name){ document.documentElement.setAttribute('data-theme', name); save(LS.THEME, name); const tn=$('#themeName'); if(tn) tn.textContent=(name==='light'?'فاتح':'غامق'); }
setTheme(load(LS.THEME, (matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')));
const btnTheme=$('#btnTheme'); if(btnTheme) btnTheme.onclick=()=> setTheme(document.documentElement.getAttribute('data-theme')==='light'?'dark':'light');

// Tabs
const views=['dashboard','add','goals','water','history','settings'];
function show(v){ views.forEach(id=>{ const el=document.getElementById('view-'+id); if(el) el.classList.toggle('active', id===v) }); $$('.tab').forEach(t=>t.classList.toggle('active', t.dataset.view===v)); location.hash=v; }
$$('.tab').forEach(t=> t.addEventListener('click', ()=> show(t.dataset.view)));
window.addEventListener('hashchange', ()=> show(location.hash.replace('#','') || 'dashboard'));

// Elements
const el={
  date:$('#date'), weight:$('#weight'), bodyFat:$('#bodyFat'), muscle:$('#muscle'),
  water:$('#water'), visceral:$('#visceral'), bmr:$('#bmr'), bmi:$('#bmi'), notes:$('#notes'),
  saveBtn:$('#saveBtn'), cancelBtn:$('#cancelBtn'), copyLast:$('#copyLast'),
  kpiWeight:$('#kpiWeight'), kpiBodyFat:$('#kpiBodyFat'), kpiBMI:$('#kpiBMI'),
  deltaWeight:$('#deltaWeight'), deltaBodyFat:$('#deltaBodyFat'), kpiGoal:$('#kpiGoal'), deltaGoal:$('#deltaGoal'),
  goalWeight:$('#goalWeight'), goalBodyFat:$('#goalBodyFat'), goalWeekly:$('#goalWeekly'), goalDeadline:$('#goalDeadline'),
  saveGoals:$('#saveGoals'), clearGoals:$('#clearGoals'), etaText:$('#etaText'),
  waterGoal:$('#waterGoal'), waterCustom:$('#waterCustom'), addCustom:$('#addCustom'),
  waterRing:$('#waterRing'), waterPct:$('#waterPct'), waterReset:$('#waterReset'), waterNotify:$('#waterNotify'), icsBtn:$('#icsBtn'),
  waterIntervalSel:$('#waterInterval'), quietStart:$('#quietStart'), quietEnd:$('#quietEnd'),
  searchNotes:$('#searchNotes'), tableBody:$('#table tbody'),
  exportBtn:$('#exportBtn'), importBtn:$('#importBtn'), importFile:$('#importFile'),
  height:$('#height'), pin:$('#pin'), saveSettings:$('#saveSettings'), clearAll:$('#clearAll'),
  updateBanner:$('#updateBanner'), reloadApp:$('#reloadApp')
};

// BMI
function updateBMI(){ const w=parseF(el.weight?.value), h=parseF(el.height?.value)/100; if(el.bmi) el.bmi.value=(w&&h)?(w/(h*h)).toFixed(1):'' }
document.addEventListener('input', ev=>{ if(ev.target && (ev.target.id==='weight' || ev.target.id==='height')) updateBMI() });

// Entries
function getEntries(){ return (load(LS.ENTRIES,[])).sort((a,b)=>a.date.localeCompare(b.date)) }
function saveEntries(list){ save(LS.ENTRIES, list) }
function resetForm(){ window.editingId=null; if(el.date) el.date.value=todayISO(); ['weight','bodyFat','muscle','water','visceral','bmr','notes'].forEach(id=>{ if(el[id]) el[id].value='' }); updateBMI() }
function fillForm(e){ if(!e) return; el.date.value=e.date; el.weight.value=e.weightKg??''; el.bodyFat.value=e.bodyFatPct??''; el.muscle.value=e.muscleKg??''; el.water.value=e.waterPct??''; el.visceral.value=e.visceralFat??''; el.bmr.value=e.bmr??''; el.notes.value=e.notes??''; updateBMI(); show('add'); scrollTo({top:0,behavior:'smooth'}) }

if(el.copyLast) el.copyLast.onclick=()=>{ const entries=getEntries(); const last=entries[entries.length-1]; if(!last) return alert('لا توجد قراءة سابقة'); fillForm({...last, date: todayISO()}); };

if(el.saveBtn) el.saveBtn.onclick=()=>{
  const list=getEntries();
  const last=list[list.length-1];
  const obj={ id:(window.editingId||uid()), date:el.date?.value, weightKg:parseF(el.weight?.value), bodyFatPct:parseF(el.bodyFat?.value), muscleKg:parseF(el.muscle?.value), waterPct:parseF(el.water?.value), visceralFat:parseF(el.visceral?.value), bmr:el.bmr?.value?parseInt(el.bmr.value):null, bmi:el.bmi?.value?parseFloat(el.bmi.value):null, notes:el.notes?.value?.trim()||'' };
  if (!obj.date) return alert('اختر تاريخًا');
  if (obj.weightKg == null) return alert('الوزن مطلوب');
  if (last && last.weightKg!=null){
    const diff=Math.abs(obj.weightKg-last.weightKg);
    if (diff>5){ const ok=confirm(`فرق الوزن كبير (${diff.toFixed(1)} كجم). هل أنت متأكد؟`); if(!ok) return; }
  }
  const others=list.filter(x=>x.id!==obj.id); others.push(obj); others.sort((a,b)=>a.date.localeCompare(b.date)); saveEntries(others); window.editingId=null; resetForm(); renderAll(); show('history');
};
if(el.cancelBtn) el.cancelBtn.onclick=()=>{ window.editingId=null; resetForm() };

// KPIs + Chart
let chart, showAvg=false, range='all';
function computeMovingAvg(arr,n=7){ const out=[]; for(let i=0;i<arr.length;i++){ const w=arr.slice(Math.max(0,i-n+1),i+1).filter(x=>x!=null); out.push(w.length? w.reduce((a,b)=>a+b,0)/w.length : null) } return out }
function filterByRange(entries,days){ if(days==='all') return entries; const c=new Date(); c.setDate(c.getDate()-Number(days)); return entries.filter(e => new Date(e.date)>=c) }
function renderChart(){
  const all=getEntries(); const entries=filterByRange(all,range);
  const labels=entries.map(e=>e.date), weight=entries.map(e=>e.weightKg??null), bodyFat=entries.map(e=>e.bodyFatPct??null);
  const weightAvg = showAvg? computeMovingAvg(weight,7) : null;
  const ctx=document.getElementById('chart'); if(!ctx) return;
  if(typeof window.Chart!=='function'){ console.warn('Chart.js not ready'); return; }
  if(!chart){
    chart=new Chart(ctx,{type:'line',data:{labels,datasets:[
      {label:'الوزن (كجم)',data:weight,tension:.35,yAxisID:'y'},
      {label:'دهون %',data:bodyFat,tension:.35,yAxisID:'y1'},
      {label:'متوسط 7 أيام',data:weightAvg||[],tension:.35,yAxisID:'y',borderDash:[6,4],hidden:!showAvg}
    ]},options:{responsive:true,scales:{y:{position:'right'},y1:{position:'left',grid:{drawOnChartArea:false}}}}});
  } else {
    chart.data.labels=labels; chart.data.datasets[0].data=weight; chart.data.datasets[1].data=bodyFat; chart.data.datasets[2].data=weightAvg||[]; chart.data.datasets[2].hidden=!showAvg; chart.update();
  }
}
$$('#view-dashboard .chip[data-range]').forEach(c=> c.onclick=()=>{ $$('#view-dashboard .chip[data-range]').forEach(x=>x.classList.remove('active')); c.classList.add('active'); range=c.dataset.range; renderChart(); });
const tAvg=$('#toggleAvg'); if(tAvg) tAvg.onclick=(e)=>{ showAvg=!showAvg; e.target.classList.toggle('active', showAvg); renderChart(); };

function renderKPIs(){
  const entries=getEntries(); const h=parseF(el.height?.value)/100;
  const latest=entries[entries.length-1], prev=entries[entries.length-2];
  if (latest){
    if(el.kpiWeight) el.kpiWeight.textContent=nf(latest.weightKg);
    if(el.kpiBodyFat) el.kpiBodyFat.textContent=nf(latest.bodyFatPct);
    if(el.kpiBMI) el.kpiBMI.textContent=(h&&latest.weightKg)?(latest.weightKg/(h*h)).toFixed(1):'—';
    if(prev && prev.weightKg!=null && el.deltaWeight){ const d=latest.weightKg-prev.weightKg; el.deltaWeight.textContent=`${d>0?'+':''}${d.toFixed(1)} كجم من آخر قراءة`; el.deltaWeight.className='delta '+(d>0?'up':d<0?'down':''); }
    if(prev && prev.bodyFatPct!=null && el.deltaBodyFat){ const d=latest.bodyFatPct-prev.bodyFatPct; el.deltaBodyFat.textContent=`${d>0?'+':''}${d.toFixed(1)}٪`; el.deltaBodyFat.className='delta '+(d>0?'up':d<0?'down':''); }
  } else { if(el.kpiWeight) el.kpiWeight.textContent='—'; if(el.kpiBodyFat) el.kpiBodyFat.textContent='—'; if(el.kpiBMI) el.kpiBMI.textContent='—'; if(el.deltaWeight) el.deltaWeight.textContent=''; if(el.deltaBodyFat) el.deltaBodyFat.textContent=''; }
  const g=load(LS.GOALS,{weight:null,bodyFat:null,weekly:null,deadline:null});
  if (g.weight && latest?.weightKg){ const diff=g.weight-latest.weightKg; if(el.kpiGoal) el.kpiGoal.textContent=`${diff>0?'-':''}${Math.abs(diff).toFixed(1)} كجم`; if(el.deltaGoal) el.deltaGoal.textContent='المتبقي للوصول للوزن المستهدف'; }
  else if (g.bodyFat && latest?.bodyFatPct){ const diff=g.bodyFat-latest.bodyFatPct; if(el.kpiGoal) el.kpiGoal.textContent=`${diff>0?'-':''}${Math.abs(diff).toFixed(1)}٪`; if(el.deltaGoal) el.deltaGoal.textContent='المتبقي لنسبة الدهون المستهدفة'; }
  else { if(el.kpiGoal) el.kpiGoal.textContent='—'; if(el.deltaGoal) el.deltaGoal.textContent=''; }
}

// Goals
function loadGoals(){ return load(LS.GOALS,{weight:null,bodyFat:null,weekly:null,deadline:null}) }
function saveGoals(g){ save(LS.GOALS,g); renderGoals(g); renderKPIs() }
function renderGoals(g){
  if(el.goalWeight) el.goalWeight.value=g.weight??''; if(el.goalBodyFat) el.goalBodyFat.value=g.bodyFat??''; if(el.goalWeekly) el.goalWeekly.value=g.weekly??''; if(el.goalDeadline) el.goalDeadline.value=g.deadline??'';
  const entries=getEntries(); const latest=entries[entries.length-1]; let txt='';
  if(latest && g.weight && g.weekly){ const weeks=Math.abs((latest.weightKg-g.weight)/g.weekly); txt=`تقدير: ${weeks.toFixed(1)} أسبوع.` }
  if(el.etaText) el.etaText.textContent=txt;
}
if(el.saveGoals) el.saveGoals.onclick=()=>{ const g=loadGoals(); g.weight=parseF(el.goalWeight?.value); g.bodyFat=parseF(el.goalBodyFat?.value); g.weekly=parseF(el.goalWeekly?.value); g.deadline=el.goalDeadline?.value||null; saveGoals(g) };
if(el.clearGoals) el.clearGoals.onclick=()=> saveGoals({weight:null,bodyFat:null,weekly:null,deadline:null});

// Water
function waterState(){ const d=load(LS.WATER,null); const today=todayISO(); if(!d || d.date!==today){ return { date: today, intake: 0, goal: 3000 } } return d }
function saveWater(s){ save(LS.WATER,s); renderWater(s) }
function renderWater(s){
  if(el.waterGoal) el.waterGoal.value=s.goal;
  const pct=Math.max(0,Math.min(100,Math.round((s.intake/Math.max(s.goal,1))*100)));
  if(el.waterPct) el.waterPct.textContent=pct+'%';
  if(el.waterRing) el.waterRing.style.transform=`rotate(${pct/100*360-90}deg)`;
}
function addWater(ml){ const s=waterState(); s.intake=Math.max(0,s.intake+ml); saveWater(s);
  try{ if('Notification' in window && Notification.permission==='granted'){ new Notification('تم تسجيل الماء',{ body:`أضفت ${ml} مل. الإجمالي: ${s.intake} / ${s.goal} مل` }) } }catch(_){}
}
$$('.chip[data-add]').forEach(b=> b.onclick=()=>{ const ml=parseInt(b.dataset.add); if(ml>0) addWater(ml) });
if(el.addCustom) el.addCustom.onclick=()=>{ const v=parseInt(el.waterCustom?.value||'0'); if(v>0) addWater(v) };
if(el.waterGoal) el.waterGoal.addEventListener('input', ()=>{ const s=waterState(); s.goal=parseInt(el.waterGoal.value||'0')||3000; saveWater(s) });
if(el.waterReset) el.waterReset.onclick=()=>{ const s=waterState(); s.intake=0; saveWater(s) };

// Water reminder cfg + quiet hours
function loadCfg(){ return load(LS.CFG, { waterInterval:90, quietStart:'22:00', quietEnd:'08:00' }) }
function saveCfg(cfg){ save(LS.CFG, cfg) }
let waterInterval=null;
function inQuietHours(start, end, d=new Date()){
  const [sh,sm]=start.split(':').map(Number);
  const [eh,em]=end.split(':').map(Number);
  const cur=d.getHours()*60 + d.getMinutes();
  const s=sh*60+sm, e=eh*60+em;
  return s<=e ? (cur>=s && cur<e) : (cur>=s || cur<e);
}
if(el.waterNotify) el.waterNotify.onclick=async()=>{
  try{
    if(!('Notification' in window)) return alert('المتصفح لا يدعم الإشعارات');
    let perm=Notification.permission; if(perm!=='granted'){ perm=await Notification.requestPermission(); }
    if(perm!=='granted') return alert('لم يتم السماح بالإشعارات');
    if(waterInterval){ clearInterval(waterInterval); waterInterval=null; el.waterNotify.textContent='تفعيل تذكير الماء'; return; }
    el.waterNotify.textContent='إيقاف تذكير الماء';
    const cfg=loadCfg();
    const tick=()=>{
      const now=new Date();
      if(!inQuietHours(cfg.quietStart, cfg.quietEnd, now)){
        try{ const s=waterState(); new Notification('اشرب ماء 💧',{ body:`${s.intake}/${s.goal} مل` }) }catch(_){}
      }
    };
    tick();
    waterInterval=setInterval(tick, (cfg.waterInterval||90)*60*1000);
  }catch(_){}
};
if(el.icsBtn) el.icsBtn.onclick=()=>{
  const ics=`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//InBody Ultra 5.1//Water//AR
BEGIN:VEVENT
UID:${uid()}@inbody-ultra
DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').split('.')[0]}Z
SUMMARY:اشرب ماء 💧
RRULE:FREQ=DAILY;INTERVAL=1
DTSTART:${new Date().toISOString().replace(/[-:]/g,'').split('.')[0]}Z
DURATION:PT0M
BEGIN:VALARM
TRIGGER:-PT0M
REPEAT:1
DURATION:PT120M
ACTION:DISPLAY
DESCRIPTION:اشرب ماء
END:VALARM
END:VEVENT
END:VCALENDAR`.replace(/\n/g,'\r\n');
  const blob=new Blob([ics],{type:'text/calendar'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='water-reminder.ics'; a.click(); URL.revokeObjectURL(url);
};

// History
let historyRange='all';
function renderTable(){
  const q=(el.searchNotes?.value||'').trim().toLowerCase(); let entries=getEntries();
  if(historyRange!=='all'){ const c=new Date(); c.setDate(c.getDate()-Number(historyRange)); entries=entries.filter(e=> new Date(e.date)>=c) }
  if(q) entries=entries.filter(e=> (e.notes||'').toLowerCase().includes(q));
  if(!el.tableBody) return; el.tableBody.innerHTML='';
  for(const e of entries){
    const tr=document.createElement('tr'); const td=v=>{ const x=document.createElement('td'); x.textContent=v; return x };
    tr.appendChild(td(e.date)); tr.appendChild(td(nf(e.weightKg))); tr.appendChild(td(nf(e.bodyFatPct))); tr.appendChild(td(nf(e.muscleKg))); tr.appendChild(td(nf(e.waterPct))); tr.appendChild(td(nf(e.visceralFat))); tr.appendChild(td(e.bmr??'—')); tr.appendChild(td(e.bmi??'—')); tr.appendChild(td(e.notes||'—'));
    const actions=document.createElement('td'); actions.style.display='flex'; actions.style.gap='6px';
    const b1=document.createElement('button'); b1.textContent='تعديل'; b1.className='ghost'; b1.onclick=()=>{ window.editingId=e.id; fillForm(e) };
    const b2=document.createElement('button'); b2.textContent='حذف'; b2.className='ghost'; b2.onclick=()=>{ if(confirm('حذف هذه القراءة؟')){ const out=getEntries().filter(x=>x.id!==e.id); saveEntries(out); renderAll() } };
    actions.appendChild(b1); actions.appendChild(b2); tr.appendChild(actions); el.tableBody.appendChild(tr);
  }
}
if(el.searchNotes) el.searchNotes.addEventListener('input', renderTable);
$$('#view-history .chip[data-range]').forEach(c=> c.onclick=()=>{ $$('#view-history .chip[data-range]').forEach(x=>x.classList.remove('active')); c.classList.add('active'); historyRange=c.dataset.range; renderTable(); });

// Export / Import
if(el.exportBtn) el.exportBtn.onclick=async()=>{
  const data=JSON.stringify({heightCm:parseF(el.height?.value)||null,goals:load(LS.GOALS,null),water:load(LS.WATER,null),entries:getEntries()},null,2);
  const blob=new Blob([data],{type:'application/json'});
  const filename=`inbody-ultra-${todayISO()}.json`;
  if(navigator.share && navigator.canShare){
    try{
      const file=new File([blob], filename, {type:'application/json'});
      if(navigator.canShare({files:[file]})){ await navigator.share({files:[file],title:'InBody Backup',text:'Backup JSON'}); return; }
    }catch(_){}
  }
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
};
if(el.importBtn) el.importBtn.onclick=()=> el.importFile?.click();
if(el.importFile) el.importFile.onchange=(ev)=>{
  const f=ev.target.files?.[0]; if(!f) return; const reader=new FileReader();
  reader.onload=()=>{ try{ const pkg=JSON.parse(reader.result); if(pkg.heightCm!=null && el.height){ el.height.value=pkg.heightCm; save(LS.HEIGHT, pkg.heightCm) } if(pkg.goals){ save(LS.GOALS,pkg.goals) } if(pkg.water){ save(LS.WATER,pkg.water) } if(Array.isArray(pkg.entries)){ save(LS.ENTRIES,pkg.entries) } renderAll(); }catch(e){ alert('ملف JSON غير صالح') } };
  reader.readAsText(f);
};

// Settings
function loadSettings(){ const h=load(LS.HEIGHT,null); if(h!=null && el.height) el.height.value=h; const p=load(LS.PIN,null); if(p && el.pin) el.pin.value=p;
  const cfg=load(LS.CFG,{waterInterval:90,quietStart:'22:00',quietEnd:'08:00'});
  if(el.waterIntervalSel) el.waterIntervalSel.value=String(cfg.waterInterval);
  if(el.quietStart) el.quietStart.value=cfg.quietStart;
  if(el.quietEnd) el.quietEnd.value=cfg.quietEnd;
}
if(el.saveSettings){
  const prev=el.saveSettings.onclick;
  el.saveSettings.onclick=()=>{
    if(prev) prev();
    if(el.height?.value) save(LS.HEIGHT, parseF(el.height.value));
    if(el.pin?.value && (el.pin.value.length<4 || el.pin.value.length>6)) return alert('PIN بين 4 و6 أرقام');
    if(el.pin?.value) save(LS.PIN, el.pin.value);
    const cfg=load(LS.CFG,{waterInterval:90,quietStart:'22:00',quietEnd:'08:00'});
    cfg.waterInterval=parseInt(el.waterIntervalSel?.value||'90');
    cfg.quietStart=el.quietStart?.value||'22:00';
    cfg.quietEnd=el.quietEnd?.value||'08:00';
    save(LS.CFG, cfg);
    alert('تم الحفظ');
  };
}
if(el.clearAll) el.clearAll.onclick=()=>{ if(confirm('هل أنت متأكد؟ سيُمسح كل شيء.')){ Object.values(LS).forEach(k=>localStorage.removeItem(k)); location.reload(); } };

// Render + Init
function renderAll(){ try{ renderKPIs() }catch(_){ } try{ renderChart() }catch(_){ } try{ renderTable() }catch(_){ } try{ renderGoals(load(LS.GOALS,{weight:null,bodyFat:null,weekly:null,deadline:null})) }catch(_){ } try{ renderWater(waterState()) }catch(_){ } }
(function(){
  const pin=load(LS.PIN,null); if(pin){ const entered=prompt('أدخل PIN لفتح التطبيق'); if(entered!==pin){ alert('PIN غير صحيح'); location.reload(); return } }
  if(el.date) el.date.value=todayISO();
  loadSettings();
  show(location.hash.replace('#','') || 'dashboard');
  renderAll();
  window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); window._deferredPrompt=e; const b=$('#btnInstall'); if(b) b.disabled=false; });
  const b=$('#btnInstall'); if(b) b.onclick=()=>{ if(window._deferredPrompt){ window._deferredPrompt.prompt(); window._deferredPrompt=null; } };
  $$('.chip[data-preset]').forEach(c=> c.onclick=()=>{ const p=c.dataset.preset; const dt=new Date(); if(p!=='today') dt.setDate(dt.getDate()+Number(p)); if(el.date) el.date.value=dt.toISOString().slice(0,10) });
})();
})();
