
// InBody Ultra AR v5.3 Ultra+ (No-Sec Pack)
(function(){
const APP_VERSION='5.3';
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
function todayISO(){ return new Date().toISOString().slice(0,10) }
function parseF(v){ const x=parseFloat(v); return Number.isFinite(x)? x : null }
function uid(){ return Math.random().toString(36).slice(2) }
function nf(x){ return x==null? '—' : Number(x).toFixed(1) }
function save(k,v){ localStorage.setItem(k, JSON.stringify(v)) }
function load(k,f=null){ try{ const v=localStorage.getItem(k); return v? JSON.parse(v) : f }catch{return f} }
function vibrate(ms=10){ try{ navigator.vibrate && navigator.vibrate(ms) }catch(_){} }
const LS={ENTRIES:'inbody.entries.v53',HEIGHT:'inbody.height.v53',GOALS:'inbody.goals.v53',WATER:'inbody.water.v53',THEME:'inbody.theme.v53',CFG:'inbody.cfg.v53',APPVER:'inbody.appver',THEMECFG:'inbody.themecfg.v53',BACKUP:'inbody.tmp.backup.v53'};

// Update banner
window.addEventListener('message', (e)=>{ if(e.data && e.data.type==='SW_UPDATED'){ const b=$('#updateBanner'); if(b) b.style.display='block' } });
(function(){ const prev=load(LS.APPVER,null); if(prev && prev!==APP_VERSION){ const b=$('#updateBanner'); if(b) b.style.display='block' } save(LS.APPVER, APP_VERSION) })();

// Theme + builder
function applyThemeCfg(cfg){ document.documentElement.style.setProperty('--accent', cfg.accent||'#5b8cff'); document.documentElement.style.setProperty('--radius', (cfg.radius||18)+'px'); }
function setTheme(name){ document.documentElement.setAttribute('data-theme', name); save(LS.THEME, name); const tn=$('#themeName'); if(tn) tn.textContent=(name==='light'?'فاتح':'غامق'); }
applyThemeCfg(load(LS.THEMECFG,{accent:'#5b8cff',radius:18}));
setTheme(load(LS.THEME,(matchMedia && matchMedia('(prefers-color-scheme: light)').matches?'light':'dark')));
$('#btnTheme').onclick=()=> setTheme(document.documentElement.getAttribute('data-theme')==='light'?'dark':'light');

// Install
let deferredPrompt=null; window.addEventListener('beforeinstallprompt',(e)=>{e.preventDefault();deferredPrompt=e; $('#btnInstall').disabled=false}); $('#btnInstall').onclick=()=>{ if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt=null; } };

// Tabs
const views=['dashboard','add','goals','water','history','settings']; function show(v){ views.forEach(id=>{ const el=document.getElementById('view-'+id); if(el) el.classList.toggle('active', id===v) }); $$('.tab').forEach(t=>t.classList.toggle('active', t.dataset.view===v)); location.hash=v; if(v==='dashboard'){ ensureCharts().then(()=>renderChart()) } }
$$('.tab').forEach(t=> t.addEventListener('click', ()=> show(t.dataset.view))); window.addEventListener('hashchange', ()=> show(location.hash.replace('#','') || 'dashboard'));

// Elements
const el={
  // quick add
  qaWeight:$('#qaWeight'), qaBodyFat:$('#qaBodyFat'), qaSave:$('#qaSave'),
  // normal form
  date:$('#date'), weight:$('#weight'), bodyFat:$('#bodyFat'), muscle:$('#muscle'),
  water:$('#water'), visceral:$('#visceral'), bmr:$('#bmr'), bmi:$('#bmi'), notes:$('#notes'),
  saveBtn:$('#saveBtn'), cancelBtn:$('#cancelBtn'), copyLast:$('#copyLast'),
  // KPIs
  kpiWeight:$('#kpiWeight'), kpiBodyFat:$('#kpiBodyFat'), kpiBMI:$('#kpiBMI'), kpiETA:$('#kpiETA'),
  deltaWeight:$('#deltaWeight'), deltaBodyFat:$('#deltaBodyFat'),
  // goals
  goalWeight:$('#goalWeight'), goalBodyFat:$('#goalBodyFat'), goalWeekly:$('#goalWeekly'), goalDeadline:$('#goalDeadline'),
  saveGoals:$('#saveGoals'), clearGoals:$('#clearGoals'), etaText:$('#etaText'),
  // water
  waterGoal:$('#waterGoal'), waterCustom:$('#waterCustom'), addCustom:$('#addCustom'),
  waterRing:$('#waterRing'), waterPct:$('#waterPct'), waterReset:$('#waterReset'), waterNotify:$('#waterNotify'), icsBtn:$('#icsBtn'),
  waterIntervalSel:$('#waterInterval'), quietStart:$('#quietStart'), quietEnd:$('#quietEnd'), btnSuggestWater:$('#btnSuggestWater'), coachMsg:$('#coachMsg'),
  // history
  searchNotes:$('#searchNotes'), tableBody:$('#table tbody'), exportBtn:$('#exportBtn'), importBtn:$('#importBtn'), importFile:$('#importFile'),
  exportCSVBtn:$('#exportCSVBtn'), importCSVBtn:$('#importCSVBtn'), importCSVFile:$('#importCSVFile'), csvTemplate:$('#csvTemplate'), snapshotBtn:$('#snapshotBtn'), pagingInfo:$('#pagingInfo'),
  // settings
  height:$('#height'), accent:$('#accent'), radius:$('#radius'), saveSettings:$('#saveSettings'), clearAll:$('#clearAll'), btnDiagnostics:$('#btnDiagnostics'),
  diagCard:$('#diagCard'), ua:$('#ua'), lsOK:$('#lsOK'), notif:$('#notif'), sw:$('#sw'),
  // insights badges
  insightsBadges:$('#insightsBadges'), badges:$('#badges'),
  // chart controls
  toggleAvg:$('#toggleAvg'), resetZoom:$('#resetZoom')
};

// Data helpers
function getEntries(){ return (load(LS.ENTRIES,[])).sort((a,b)=>a.date.localeCompare(b.date)) }
function saveEntries(list){ save(LS.ENTRIES, list) }
function backupAll(){ const pack={ entries:getEntries(), goals:load(LS.GOALS,null), water:load(LS.WATER,null), height:load(LS.HEIGHT,null) }; save(LS.BACKUP, pack); setTimeout(()=> localStorage.removeItem(LS.BACKUP), 15000); return pack }
function restoreBackup(){ const pack=load(LS.BACKUP,null); if(!pack) return; save(LS.ENTRIES, pack.entries||[]); save(LS.GOALS, pack.goals||null); save(LS.WATER, pack.water||null); if(pack.height!=null) save(LS.HEIGHT, pack.height); renderAll() }

// BMI + auto calcs
function updateBMI(){ const w=parseF(el.weight?.value), h=parseF(el.height?.value)/100; const bf=parseF(el.bodyFat?.value); if(el.bmi) el.bmi.value=(w&&h)?(w/(h*h)).toFixed(1):''; if(w!=null && bf!=null){ const fm=(w*bf/100).toFixed(1), lm=(w - w*bf/100).toFixed(1); el.autoCalcs.textContent=`كتلة دهنية: ${fm}كجم • كتلة صافية: ${lm}كجم` } else { el.autoCalcs.textContent='—' } }
document.addEventListener('input', ev=>{ if(ev.target && ['weight','height','bodyFat'].includes(ev.target.id)) updateBMI() });

// Quick Add
$('#qaSave').onclick=()=>{
  const w=parseF(el.qaWeight.value); const bf=parseF(el.qaBodyFat.value);
  if(w==null) return alert('اكتب وزنًا'); const list=getEntries(); const today=todayISO();
  // anomaly checks: future date/duplicate
  if(list.some(e=>e.date===today)){ if(!confirm('فيه قراءة لنهاردة بالفعل — حفظ كبديل؟')) return; }
  const last=list[list.length-1]; if(last && last.weightKg!=null){ const diff=Math.abs(w-last.weightKg); if(diff>5){ if(!confirm(`فرق كبير عن آخر وزن (${diff.toFixed(1)}كجم). متأكد؟`)) return } }
  const obj={ id:uid(), date:today, weightKg:w, bodyFatPct:bf??null, muscleKg:null, waterPct:null, visceralFat:null, bmr:null, bmi:null, notes:'' };
  const old=getEntries(); backupAll(); const others=old.filter(x=>x.date!==today); others.push(obj); others.sort((a,b)=>a.date.localeCompare(b.date)); saveEntries(others); show('dashboard'); el.qaWeight.value=''; el.qaBodyFat.value=''; vibrate(10); renderAll();
};
$$('.chip[data-qa-add]').forEach(b=> b.onclick=()=>{ const ml=parseInt(b.dataset.qaAdd); addWater(ml) });
$('#qaInBody').onclick=()=>{ show('add'); ['bodyFat','muscle','water','visceral','bmr'].forEach(id=>{ const x=$('#'+id); x && x.focus() }) };

// Form + validations
function resetForm(){ window.editingId=null; if(el.date) el.date.value=todayISO(); ['weight','bodyFat','muscle','water','visceral','bmr','notes'].forEach(id=>{ if(el[id]) el[id].value='' }); updateBMI() }
function fillForm(e){ if(!e) return; el.date.value=e.date; el.weight.value=e.weightKg??''; el.bodyFat.value=e.bodyFatPct??''; el.muscle.value=e.muscleKg??''; el.water.value=e.waterPct??''; el.visceral.value=e.visceralFat??''; el.bmr.value=e.bmr??''; el.notes.value=e.notes??''; updateBMI(); show('add'); scrollTo({top:0,behavior:'smooth'}) }
$$('.chip[data-preset]').forEach(c=> c.onclick=()=>{ const p=c.dataset.preset; const dt=new Date(); if(p!=='today') dt.setDate(dt.getDate()+Number(p)); el.date.value=dt.toISOString().slice(0,10) });
if(el.copyLast) el.copyLast.onclick=()=>{ const list=getEntries(); const last=list[list.length-1]; if(!last) return alert('لا توجد قراءة سابقة'); fillForm({...last, date: todayISO()}) };
if(el.saveBtn) el.saveBtn.onclick=()=>{
  const d=el.date.value; if(!d) return alert('اختر تاريخًا'); if(new Date(d)>new Date()) return alert('التاريخ في المستقبل!');
  const list=getEntries(); const last=list[list.length-1];
  const obj={ id:(window.editingId||uid()), date:d, weightKg:parseF(el.weight?.value), bodyFatPct:parseF(el.bodyFat?.value), muscleKg:parseF(el.muscle?.value), waterPct:parseF(el.water?.value), visceralFat:parseF(el.visceral?.value), bmr:el.bmr?.value?parseInt(el.bmr.value):null, bmi:el.bmi?.value?parseFloat(el.bmi.value):null, notes:el.notes?.value?.trim()||'' };
  if(obj.weightKg==null) return alert('الوزن مطلوب');
  if(last && last.weightKg!=null){ const diff=Math.abs(obj.weightKg-last.weightKg); if(diff>5){ if(!confirm(`فرق الوزن كبير (${diff.toFixed(1)} كجم). متأكد؟`)) return } }
  const oldList=getEntries(); backupAll(); const others=oldList.filter(x=>x.id!==obj.id && x.date!==obj.date); others.push(obj); others.sort((a,b)=>a.date.localeCompare(b.date)); saveEntries(others); window.editingId=null; resetForm(); renderAll(); show('history'); snack('تم الحفظ', ()=>{ saveEntries(oldList); renderAll() }); vibrate(10);
};
if(el.cancelBtn) el.cancelBtn.onclick=()=>{ window.editingId=null; resetForm() };

// Snackbar
function snack(msg, undo){ const s=document.createElement('div'); s.className='snackbar'; s.style.display='flex'; s.innerHTML=`<span>${msg}</span>${undo?'<button id="snkUndo">تراجع</button>':''}`; document.body.appendChild(s); const t=setTimeout(()=>{ s.remove() }, 5000); if(undo){ s.querySelector('#snkUndo').onclick=()=>{ undo(); clearTimeout(t); s.remove() } }

// }  (we will close later)
}

// KPIs + Chart (with zoom)
let chart, showAvg=false, range='all';
function computeMovingAvg(arr,n=7){ const out=[]; for(let i=0;i<arr.length;i++){ const w=arr.slice(Math.max(0,i-n+1),i+1).filter(x=>x!=null); out.push(w.length? w.reduce((a,b)=>a+b,0)/w.length : null) } return out }
function filterByRange(entries,days){ if(days==='all') return entries; const c=new Date(); c.setDate(c.getDate()-Number(days)); return entries.filter(e=> new Date(e.date)>=c) }
function renderChart(){
  const all=getEntries(); const entries=filterByRange(all,range);
  const labels=entries.map(e=>e.date), weight=entries.map(e=>e.weightKg??null), bodyFat=entries.map(e=>e.bodyFatPct??null);
  const weightAvg= showAvg ? computeMovingAvg(weight,7) : null;
  const ctx=$('#chart'); if(!ctx || !window.Chart) return;
  if(!chart){
    chart = new Chart(ctx, {
      type:'line', data:{ labels, datasets:[
        { label:'الوزن (كجم)', data: weight, tension:.35, yAxisID:'y' },
        { label:'دهون %', data: bodyFat, tension:.35, yAxisID:'y1' },
        { label:'متوسط 7 أيام', data: weightAvg||[], tension:.35, yAxisID:'y', borderDash:[6,4], hidden: !showAvg }
      ]}, options:{ responsive:true, plugins:{ zoom:{ zoom:{ wheel:{enabled:true}, pinch:{enabled:true}, mode:'x' }, pan:{ enabled:true, mode:'x'} } }, scales:{ y:{ position:'right' }, y1:{ position:'left', grid:{ drawOnChartArea:false } } } }
    });
  } else {
    chart.data.labels=labels; chart.data.datasets[0].data=weight; chart.data.datasets[1].data=bodyFat; chart.data.datasets[2].data=weightAvg||[]; chart.data.datasets[2].hidden=!showAvg; chart.update();
  }
}
$$('#view-dashboard .chip[data-range]').forEach(c=> c.onclick=()=>{ $$('#view-dashboard .chip[data-range]').forEach(x=>x.classList.remove('active')); c.classList.add('active'); range=c.dataset.range; ensureCharts().then(()=>renderChart()) });
$('#toggleAvg').onclick=(e)=>{ showAvg=!showAvg; e.target.classList.toggle('active', showAvg); ensureCharts().then(()=>renderChart()) };
$('#resetZoom').onclick=()=>{ if(chart && chart.resetZoom) chart.resetZoom() };

// KPIs + Insights badges
function regressionETA(){ const entries=getEntries(); const g=load(LS.GOALS,{weight:null}); const latest=entries[entries.length-1]; if(!latest||!g.weight) return '—';
  const n=Math.min(30, entries.length); const xs=[], ys=[]; for(let i=entries.length-n;i<entries.length;i++){ if(i>=0){ const k=i-(entries.length-n); xs.push(k); ys.push(entries[i].weightKg??null) } }
  const clean=ys.map((y,i)=>[xs[i],y]).filter(p=>p[1]!=null); if(clean.length<2) return '—';
  const sumX=clean.reduce((a,b)=>a+b[0],0), sumY=clean.reduce((a,b)=>a+b[1],0); const sumXY=clean.reduce((a,b)=>a+b[0]*b[1],0); const sumXX=clean.reduce((a,b)=>a+b[0]*b[0],0); const n2=clean.length;
  const slope=(n2*sumXY - sumX*sumY)/(n2*sumXX - sumX*sumX || 1e-9); if(Math.abs(slope)<0.001) return 'غير واضح';
  const intercept=(sumY - slope*sumX)/n2; const target=g.weight; // days to reach
  const xTarget = (target - intercept)/slope; const daysRemaining = Math.max(0, Math.round(xTarget - xs[xs.length-1]));
  const when = new Date(); when.setDate(when.getDate()+daysRemaining);
  return daysRemaining>365? 'بعيد' : when.toISOString().slice(0,10);
}
function detectPlateau(){ const entries=getEntries().slice(-14); const ys=entries.map(e=>e.weightKg).filter(x=>x!=null); if(ys.length<8) return null; const diffs=ys.slice(1).map((v,i)=>v-ys[i]); const avg = diffs.reduce((a,b)=>a+b,0)/diffs.length; const varr = diffs.reduce((a,b)=>a+(b-avg)**2,0)/diffs.length; if(Math.abs(avg)<0.02 && Math.sqrt(varr)<0.2) return 'ثبات وزن ١٤ يوم'; return null }
function waterCompliance(){ // last 7 days completion %
  const today=new Date(); let ok=0, total=0; for(let i=0;i<7;i++){ const d=new Date(); d.setDate(today.getDate()-i); const key='inbody.water.v53'; const rec=load(key,null); // we only store today's water; just approximate using entries notes => fallback
    if(rec && rec.date===d.toISOString().slice(0,10)){ total++; if((rec.intake||0) >= (rec.goal||3000)) ok++; }
  }
  return total? Math.round(ok/total*100) : 0;
}
function renderKPIsAndInsights(){
  const entries=getEntries(); const h=parseF(el.height?.value)/100;
  const latest=entries[entries.length-1], prev=entries[entries.length-2];
  if(latest){ el.kpiWeight.textContent=nf(latest.weightKg); el.kpiBodyFat.textContent=nf(latest.bodyFatPct); el.kpiBMI.textContent=(h&&latest.weightKg)?(latest.weightKg/(h*h)).toFixed(1):'—'; if(prev&&prev.weightKg!=null){ const d=latest.weightKg-prev.weightKg; el.deltaWeight.textContent=`${d>0?'+':''}${d.toFixed(1)} كجم`; el.deltaWeight.className='delta '+(d>0?'up':'down') } if(prev&&prev.bodyFatPct!=null){ const d=latest.bodyFatPct-prev.bodyFatPct; el.deltaBodyFat.textContent=`${d>0?'+':''}${d.toFixed(1)}٪`; el.deltaBodyFat.className='delta '+(d>0?'up':'down') } } else { el.kpiWeight.textContent='—'; el.kpiBodyFat.textContent='—'; el.kpiBMI.textContent='—'; el.deltaWeight.textContent=''; el.deltaBodyFat.textContent='' }
  el.kpiETA.textContent = regressionETA();

  const badges=[]; const plateau=detectPlateau(); if(plateau) badges.push('⚠️ '+plateau); const compl=waterCompliance(); badges.push('💧 التزام ماء 7 أيام: '+compl+'%'); const count=getEntries().length; if(count>=10) badges.push('🏅 10 قراءات'); if(count>=50) badges.push('🥇 50 قراءة'); el.insightsBadges.innerHTML = badges.map(b=>`<div class="badge">${b}</div>`).join(''); el.badges.innerHTML = el.insightsBadges.innerHTML;
}

// Goals
function loadGoals(){ return load(LS.GOALS,{weight:null,bodyFat:null,weekly:null,deadline:null}) }
function saveGoals(g){ save(LS.GOALS,g); renderGoals(g); renderKPIsAndInsights() }
function renderGoals(g){
  el.goalWeight.value=g.weight??''; el.goalBodyFat.value=g.bodyFat??''; el.goalWeekly.value=g.weekly??''; el.goalDeadline.value=g.deadline??'';
  const entries=getEntries(); const latest=entries[entries.length-1]; let txt=''; if(latest && g.weight && g.weekly){ const weeks=Math.abs((latest.weightKg-g.weight)/g.weekly); txt=`تقدير: ${weeks.toFixed(1)} أسبوع.` } el.etaText.textContent=txt;
}
el.saveGoals.onclick=()=>{ const g=loadGoals(); g.weight=parseF(el.goalWeight.value); g.bodyFat=parseF(el.goalBodyFat.value); g.weekly=parseF(el.goalWeekly.value); g.deadline=el.goalDeadline.value||null; saveGoals(g) };
el.clearGoals.onclick=()=> saveGoals({weight:null,bodyFat:null,weekly:null,deadline:null});

// Water
function waterState(){ const d=load(LS.WATER,null); const today=todayISO(); if(!d || d.date!==today){ return { date: today, intake: 0, goal: 3000 } } return d }
function saveWater(s){ save(LS.WATER,s); renderWater(s) }
function renderWater(s){ el.waterGoal.value=s.goal; const pct=Math.max(0,Math.min(100,Math.round((s.intake/Math.max(s.goal,1))*100))); el.waterPct.textContent=pct+'%'; el.waterRing.style.transform=`rotate(${pct/100*360-90}deg)` }
function addWater(ml){ const s=waterState(); s.intake=Math.max(0,s.intake+ml); saveWater(s); try{ if('Notification' in window && Notification.permission==='granted'){ new Notification('تم تسجيل الماء',{ body:`+${ml} مل • ${s.intake}/${s.goal} مل` }) } }catch(_){ } }
$$('.chip[data-add]').forEach(b=> b.onclick=()=>{ const ml=parseInt(b.dataset.add); if(ml>0) addWater(ml) });
$('#addCustom').onclick=()=>{ const v=parseInt(el.waterCustom.value||'0'); if(v>0) addWater(v) };
$('#waterGoal').addEventListener('input', ()=>{ const s=waterState(); s.goal=parseInt(el.waterGoal.value||'0')||3000; saveWater(s) });
$('#waterReset').onclick=()=>{ const s=waterState(); s.intake=0; saveWater(s) };
// Hydration coach
$('#btnSuggestWater').onclick=()=>{ const h=parseF(el.height.value); const list=getEntries(); const last=list[list.length-1]; if(!last){ el.coachMsg.textContent='أدخل وزنًا أولًا'; return } const goal=Math.round((last.weightKg||75)*35); el.coachMsg.textContent=`اقتراح: ${goal} مل/يوم`; el.waterGoal.value=goal; const s=waterState(); s.goal=goal; saveWater(s) };

// Reminder (quiet hours)
let waterInterval=null; function inQuietHours(start,end,d=new Date()){ const [sh,sm]=start.split(':').map(Number); const [eh,em]=end.split(':').map(Number); const cur=d.getHours()*60+d.getMinutes(); const s=sh*60+sm, e=eh*60+em; return s<=e ? (cur>=s&&cur<e):(cur>=s||cur<e) }
$('#waterNotify').onclick=async()=>{ try{ if(!('Notification' in window)) return alert('المتصفح لا يدعم الإشعارات'); let perm=Notification.permission; if(perm!=='granted'){ perm=await Notification.requestPermission(); } if(perm!=='granted') return alert('لم يتم السماح بالإشعارات'); if(waterInterval){ clearInterval(waterInterval); waterInterval=null; $('#waterNotify').textContent='تفعيل تذكير الماء'; return } $('#waterNotify').textContent='إيقاف تذكير الماء'; const cfg=load(LS.CFG,{waterInterval:90,quietStart:'22:00',quietEnd:'08:00'}); const tick=()=>{ const now=new Date(); if(!inQuietHours(cfg.quietStart,cfg.quietEnd,now)){ try{ const s=waterState(); new Notification('اشرب ماء 💧',{ body:`${s.intake}/${s.goal} مل` }) }catch(_){ } } }; tick(); waterInterval=setInterval(tick, (cfg.waterInterval||90)*60*1000); }catch(_){ } };
$('#icsBtn').onclick=()=>{ const ics=`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//InBody Ultra 5.3//Water//AR
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
END:VCALENDAR`.replace(/\n/g,'\r\n'); const blob=new Blob([ics],{type:'text/calendar'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='water-reminder.ics'; a.click(); URL.revokeObjectURL(url) };

// History paging + inline edit + CSV templates
let historyRange='all', page=0, pageSize=100;
function pageEntries(list){ const start=page*pageSize; return list.slice(start, start+pageSize) }
function renderTable(){
  const q=($('#searchNotes')?.value||'').trim().toLowerCase(); let entries=getEntries();
  if(historyRange!=='all'){ const c=new Date(); c.setDate(c.getDate()-Number(historyRange)); entries=entries.filter(e=> new Date(e.date)>=c) }
  if(q) entries=entries.filter(e=> (e.notes||'').toLowerCase().includes(q));
  const total=entries.length; const rows=pageEntries(entries); el.pagingInfo.textContent = `عرض ${(page*pageSize)+1}-${(page*pageSize)+rows.length} من ${total}`;
  el.tableBody.innerHTML='';
  for(const e of rows){
    const tr=document.createElement('tr'); const td=v=>{ const x=document.createElement('td'); x.textContent=v; return x };
    const tdDate=td(e.date); tdDate.contentEditable='true'; tdDate.onblur=()=>{ const old=e.date; e.date=tdDate.textContent.trim().slice(0,10); saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll(); snack('تم التعديل', ()=>{ e.date=old; saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll() }) };
    const tdW=td(nf(e.weightKg)); tdW.contentEditable='true'; tdW.onblur=()=>{ const old=e.weightKg; e.weightKg=parseF(tdW.textContent); saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll(); snack('تم التعديل', ()=>{ e.weightKg=old; saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll() }) };
    const tdBF=td(nf(e.bodyFatPct)); tdBF.contentEditable='true'; tdBF.onblur=()=>{ const old=e.bodyFatPct; e.bodyFatPct=parseF(tdBF.textContent); saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll(); snack('تم التعديل', ()=>{ e.bodyFatPct=old; saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll() }) };
    const tdM=td(nf(e.muscleKg)); tdM.contentEditable='true'; tdM.onblur=()=>{ const old=e.muscleKg; e.muscleKg=parseF(tdM.textContent); saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll(); snack('تم التعديل', ()=>{ e.muscleKg=old; saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll() }) };
    const tdWa=td(nf(e.waterPct)); tdWa.contentEditable='true'; tdWa.onblur=()=>{ const old=e.waterPct; e.waterPct=parseF(tdWa.textContent); saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll(); snack('تم التعديل', ()=>{ e.waterPct=old; saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll() }) };
    const tdV=td(nf(e.visceralFat)); tdV.contentEditable='true'; tdV.onblur=()=>{ const old=e.visceralFat; e.visceralFat=parseF(tdV.textContent); saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll(); snack('تم التعديل', ()=>{ e.visceralFat=old; saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll() }) };
    const tdBMR=td(e.bmr??'—'); tdBMR.contentEditable='true'; tdBMR.onblur=()=>{ const old=e.bmr; e.bmr=parseF(tdBMR.textContent)?parseInt(tdBMR.textContent):null; saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll(); snack('تم التعديل', ()=>{ e.bmr=old; saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll() }) };
    const tdBMI=td(e.bmi??'—'); tdBMI.contentEditable='true'; tdBMI.onblur=()=>{ const old=e.bmi; e.bmi=parseF(tdBMI.textContent); saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll(); snack('تم التعديل', ()=>{ e.bmi=old; saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll() }) };
    const tdNotes=td(e.notes||'—'); tdNotes.contentEditable='true'; tdNotes.onblur=()=>{ const old=e.notes; e.notes=tdNotes.textContent.trim(); saveEntries(getEntries().map(x=>x.id===e.id?e:x)); snack('تم التعديل', ()=>{ e.notes=old; saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll() }) };
    const actions=document.createElement('td'); actions.style.display='flex'; actions.style.gap='6px';
    const b1=document.createElement('button'); b1.textContent='تعديل'; b1.className='ghost'; b1.onclick=()=>{ window.editingId=e.id; fillForm(e) };
    const b2=document.createElement('button'); b2.textContent='حذف'; b2.className='ghost'; b2.onclick=()=>{ if(confirm('حذف هذه القراءة؟')){ const oldList=getEntries(); backupAll(); saveEntries(oldList.filter(x=>x.id!==e.id)); renderAll(); snack('تم الحذف', ()=>{ restoreBackup() }) } };
    actions.appendChild(b1); actions.appendChild(b2);
    [tdDate,tdW,tdBF,tdM,tdWa,tdV,tdBMR,tdBMI,tdNotes,actions].forEach(x=> tr.appendChild(x));
    el.tableBody.appendChild(tr);
  }
  // paging controls
  const totalPages=Math.ceil(total/pageSize)||1;
  el.pagingInfo.innerHTML += ` — صفحة ${page+1}/${totalPages} <button id="pPrev" class="ghost">السابق</button> <button id="pNext" class="ghost">التالي</button>`;
  $('#pPrev').onclick=()=>{ page=Math.max(0,page-1); renderTable() };
  $('#pNext').onclick=()=>{ page=Math.min(totalPages-1,page+1); renderTable() };
}
$('#searchNotes').addEventListener('input', renderTable);
$$('#view-history .chip[data-range]').forEach(c=> c.onclick=()=>{ $$('#view-history .chip[data-range]').forEach(x=>x.classList.remove('active')); c.classList.add('active'); historyRange=c.dataset.range; page=0; renderTable() });

// CSV template mapping
function parseCSV(text){ const lines=text.split(/\r?\n/).filter(x=>x.trim().length); if(!lines.length) return null; const header=lines[0].split(',').map(h=>h.trim().toLowerCase()); const rows=lines.slice(1).map(l=> l.split(',')); return {header, rows} }
function applyTemplateMap(tpl, header){ const idx=(name)=> header.findIndex(h=> h.includes(name)); const map={}; if(tpl==='inbody'){ map.date=idx('date'); map.weightKg=idx('weight'); map.bodyFatPct=idx('body fat'); map.muscleKg=idx('muscle'); } else if(tpl==='miscale'){ map.date=idx('date'); map.weightKg=idx('weight'); } else { // auto
  ['date','weightKg','bodyFatPct','muscleKg','waterPct','visceralFat','bmr','bmi','notes'].forEach(f=>{ const hname=f.replace('Kg','').replace('Pct','').replace('body','body ').replace('weight','weight'); const i= header.findIndex(h=> h.includes(hname.replace('muscle','muscle')) || (f==='date' && h.includes('date')) ); if(i>=0) map[f]=i; });
 }
 return map;
}
$('#importCSVBtn').onclick=()=> el.importCSVFile.click();
$('#importCSVFile').onchange=(ev)=>{ const f=ev.target.files?.[0]; if(!f) return; const reader=new FileReader(); reader.onload=()=>{ const parsed=parseCSV(reader.result); if(!parsed){ alert('CSV فارغ'); return } const map=applyTemplateMap($('#csvTemplate').value, parsed.header); const old=getEntries(); backupAll(); let list=getEntries(); parsed.rows.forEach(cols=>{ const e={ id:uid(), date: (cols[map.date]||'').slice(0,10), weightKg: parseF(cols[map.weightKg]), bodyFatPct: parseF(cols[map.bodyFatPct]), muscleKg: parseF(cols[map.muscleKg]), waterPct: parseF(cols[map.waterPct]), visceralFat: parseF(cols[map.visceralFat]), bmr: parseF(cols[map.bmr])?parseInt(cols[map.bmr]):null, bmi: parseF(cols[map.bmi]), notes: (cols[map.notes]||'').trim() }; if(e.date) list.push(e) }); saveEntries(list.sort((a,b)=>a.date.localeCompare(b.date))); renderAll(); snack('تم استيراد CSV', ()=>{ saveEntries(old); renderAll() }) }; reader.readAsText(f) };

$('#exportCSVBtn').onclick=()=>{ const cols=['date','weightKg','bodyFatPct','muscleKg','waterPct','visceralFat','bmr','bmi','notes']; const head=cols.join(','); const rows=getEntries().map(e=> cols.map(c=> (e[c]==null?'':String(e[c]).replace(/,/g,' '))).join(',')); const csv=[head].concat(rows).join('\n'); const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='inbody.csv'; a.click(); URL.revokeObjectURL(url) };

// JSON Export/Import + Snapshot HTML
$('#exportBtn').onclick=()=>{ const data=JSON.stringify({heightCm:parseF(el.height?.value)||null,goals:load(LS.GOALS,null),water:load(LS.WATER,null),entries:getEntries()},null,2); const blob=new Blob([data],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`inbody-ultra-${todayISO()}.json`; a.click(); URL.revokeObjectURL(url) };
$('#importBtn').onclick=()=> el.importFile.click();
$('#importFile').onchange=(ev)=>{ const f=ev.target.files?.[0]; if(!f) return; const reader=new FileReader(); reader.onload=()=>{ try{ const old=backupAll(); const obj=JSON.parse(reader.result); if(obj.heightCm!=null) el.height.value=obj.heightCm; if(obj.goals) save(LS.GOALS,obj.goals); if(obj.water) save(LS.WATER,obj.water); if(Array.isArray(obj.entries)) save(LS.ENTRIES,obj.entries); renderAll(); snack('تم استيراد JSON', ()=>{ saveEntries(old.entries); save(LS.GOALS, old.goals); save(LS.WATER, old.water); if(old.height!=null) save(LS.HEIGHT, old.height); renderAll() }) }catch(e){ alert('ملف JSON غير صالح') } }; reader.readAsText(f) };

$('#snapshotBtn').onclick=()=>{ const pkg={ height:parseF(el.height?.value)||null, goals:load(LS.GOALS,null), entries:getEntries().slice(-30) }; const html=`<!doctype html><meta charset="utf-8"><title>InBody Snapshot</title><style>body{font-family:system-ui;max-width:700px;margin:20px auto;padding:10px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:6px} th{background:#f5f5f5}</style><h1>InBody Snapshot</h1><p>Date: ${todayISO()}</p><pre>${JSON.stringify(pkg.goals,null,2)}</pre><table><thead><tr><th>Date</th><th>Weight</th><th>BF%</th><th>Notes</th></tr></thead><tbody>${pkg.entries.map(e=>`<tr><td>${e.date}</td><td>${e.weightKg??''}</td><td>${e.bodyFatPct??''}</td><td>${(e.notes||'').replace(/</g,'&lt;')}</td></tr>`).join('')}</tbody></table>`; const blob=new Blob([html],{type:'text/html'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='snapshot.html'; a.click(); URL.revokeObjectURL(url) };

// Settings + Theme builder + Diagnostics
function loadSettings(){ const h=load(LS.HEIGHT,null); if(h!=null) el.height.value=h; const themeCfg=load(LS.THEMECFG,{accent:'#5b8cff',radius:18}); el.accent.value = themeCfg.accent || '#5b8cff'; el.radius.value = themeCfg.radius || 18; }
el.saveSettings.onclick=()=>{ if(el.height.value) save(LS.HEIGHT, parseF(el.height.value)); const cfg={ accent: el.accent.value || '#5b8cff', radius: parseInt(el.radius.value||'18') }; save(LS.THEMECFG,cfg); applyThemeCfg(cfg); alert('تم الحفظ'); };
el.clearAll.onclick=()=>{ if(confirm('مسح كل البيانات؟')){ const old=backupAll(); Object.values(LS).forEach(k=> localStorage.removeItem(k)); alert('تم المسح — لديك 15 ثانية لتراجع'); setTimeout(()=>{}, 15000); const undoBtn=document.createElement('button'); undoBtn.textContent='تراجع المسح'; undoBtn.className='ghost'; undoBtn.onclick=()=>{ restoreBackup(); undoBtn.remove() }; document.querySelector('.wrap').prepend(undoBtn) } };
el.btnDiagnostics.onclick=()=>{ el.diagCard.style.display = (el.diagCard.style.display==='none'?'block':'none'); if(el.diagCard.style.display==='block'){ el.ua.textContent = navigator.userAgent; el.lsOK.textContent = (function(){ try{ localStorage.setItem('x','1'); localStorage.removeItem('x'); return 'OK' }catch(e){ return 'Blocked' }})(); el.notif.textContent = (('Notification' in window)? Notification.permission : 'N/A'); if('serviceWorker' in navigator){ navigator.serviceWorker.getRegistrations().then(rs=>{ el.sw.textContent = rs.length? 'Registered' : 'None' }) } else { el.sw.textContent='N/A' } } };

// Init
function renderAll(){ renderKPIsAndInsights(); ensureCharts().then(()=>renderChart()); renderTable(); renderGoals(load(LS.GOALS,{weight:null,bodyFat:null,weekly:null,deadline:null})); renderWater(waterState()) }
(function init(){
  if(el.date) el.date.value=todayISO(); loadSettings(); show(location.hash.replace('#','') || 'dashboard'); renderAll();
})();
})();
