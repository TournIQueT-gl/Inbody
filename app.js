
// InBody Ultra AR v5.2 — Pro Features
(function(){
const APP_VERSION='5.2';
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
function todayISO(){ return new Date().toISOString().slice(0,10) }
function parseF(v){ const x=parseFloat(v); return Number.isFinite(x)? x : null }
function uid(){ return Math.random().toString(36).slice(2) }
function nf(x){ return x==null? '—' : Number(x).toFixed(1) }
function save(k,v){ localStorage.setItem(k, JSON.stringify(v)) }
function load(k,f=null){ try{ const v=localStorage.getItem(k); return v? JSON.parse(v) : f }catch{return f} }
function vibrate(ms=10){ try{ navigator.vibrate && navigator.vibrate(ms) }catch(_){} }
const LS={ENTRIES:'inbody.entries.v52',HEIGHT:'inbody.height.v52',GOALS:'inbody.goals.v52',WATER:'inbody.water.v52',THEME:'inbody.theme.v52',PIN:'inbody.pin.v52',CFG:'inbody.cfg.v52',APPVER:'inbody.appver',LOCALE:'inbody.locale.v52'};

// Update banner (respond to SW message and version bump)
window.addEventListener('message', (e)=>{ if(e.data && e.data.type==='SW_UPDATED'){ const b=$('#updateBanner'); if(b) b.style.display='block'; } });
(function(){ const prev=load(LS.APPVER,null); if(prev && prev!==APP_VERSION){ const b=$('#updateBanner'); if(b) b.style.display='block' } save(LS.APPVER, APP_VERSION) })();

// i18n (lightweight)
const dict={
  ar:{ t_appName:'متابعة إنبودي', t_lastWeight:'آخر وزن', t_lastFat:'آخر دهون %', t_goalProg:'التقدم نحو الهدف', t_chart:'الرسم البياني', t_all:'الكل', t_axes:'الوزن على المحور الأساسي، والدهون % على المحور الثانوي.', t_addedit:'إضافة / تعديل قراءة', t_date:'التاريخ', t_wkg:'الوزن (كجم)', t_bfat:'دهون %', t_mkg:'عضلات (كجم)', t_waterpct:'ماء %', t_visc:'دهون حشوية', t_bmr:'معدل الحرق BMR', t_notes:'ملاحظات', t_today:'اليوم', t_yesterday:'أمس', t_weekago:'قبل أسبوع', t_goals:'أهداف اللياقة', t_goalWeight:'هدف الوزن (كجم)', t_goalBF:'هدف الدهون %', t_weekly:'معدل التغيير الأسبوعي (كجم/أسبوع)', t_deadline:'موعد مستهدف (اختياري)', t_water:'ماء اليوم', t_waterGoal:'هدف الماء (مل)', t_currDrink:'المشروب الحالي (مل)', t_reminder:'إعدادات التذكير', t_interval:'فاصل التذكير', t_quietStart:'ساعات الصمت (من)', t_quietEnd:'ساعات الصمت (إلى)', t_foregroundNote:'التذكير يعمل داخل التطبيق عند فتحه. لا إشعارات خلفية.', t_readings:'القراءات', t_all2:'الكل', t_settings:'الإعدادات', t_height:'الطول (سم)', t_localOnly:'تُخزن البيانات محليًا على جهازك فقط.' },
  en:{ t_appName:'InBody Tracker', t_lastWeight:'Last weight', t_lastFat:'Last body fat %', t_goalProg:'Progress to goal', t_chart:'Chart', t_all:'All', t_axes:'Weight on primary axis; body fat % on secondary.', t_addedit:'Add / Edit Entry', t_date:'Date', t_wkg:'Weight (kg)', t_bfat:'Body Fat %', t_mkg:'Muscle (kg)', t_waterpct:'Water %', t_visc:'Visceral Fat', t_bmr:'BMR', t_notes:'Notes', t_today:'Today', t_yesterday:'Yesterday', t_weekago:'1 week ago', t_goals:'Goals', t_goalWeight:'Goal Weight (kg)', t_goalBF:'Goal Body Fat %', t_weekly:'Weekly change (kg/week)', t_deadline:'Deadline (optional)', t_water:'Water Today', t_waterGoal:'Water goal (ml)', t_currDrink:'Current drink (ml)', t_reminder:'Reminder Settings', t_interval:'Reminder Interval', t_quietStart:'Quiet Hours (from)', t_quietEnd:'Quiet Hours (to)', t_foregroundNote:'Reminder works while the app is open (no background).', t_readings:'Readings', t_all2:'All', t_settings:'Settings', t_height:'Height (cm)', t_localOnly:'Data is stored locally on your device only.' }
};
function setLocale(loc){ const d=dict[loc]||dict.ar; Object.entries(d).forEach(([k,v])=>{ const el=document.getElementById(k); if(el) el.textContent=v }); document.documentElement.dir = (loc==='en'?'ltr':'rtl'); save(LS.LOCALE, loc); const btn=$('#btnLang'); if(btn) btn.textContent = (loc==='en'?'AR':'EN'); }
setLocale(load(LS.LOCALE,'ar'));
$('#btnLang').onclick=()=> setLocale(load(LS.LOCALE,'ar')==='ar'?'en':'ar');

// Theme
function setTheme(name){ document.documentElement.setAttribute('data-theme', name); save(LS.THEME, name); const tn=$('#themeName'); if(tn) tn.textContent=(name==='light'?(load(LS.LOCALE,'ar')==='ar'?'فاتح':'Light'):(load(LS.LOCALE,'ar')==='ar'?'غامق':'Dark')); }
setTheme(load(LS.THEME, (matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')));
$('#btnTheme').onclick=()=> setTheme(document.documentElement.getAttribute('data-theme')==='light'?'dark':'light');

// Install prompt
let deferredPrompt=null; window.addEventListener('beforeinstallprompt',(e)=>{e.preventDefault();deferredPrompt=e; $('#btnInstall').disabled=false}); $('#btnInstall').onclick=()=>{ if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt=null; }};

// Tabs
const views=['dashboard','add','goals','water','history','settings']; function show(v){ views.forEach(id=>{ const el=document.getElementById('view-'+id); if(el) el.classList.toggle('active', id===v) }); $$('.tab').forEach(t=>t.classList.toggle('active', t.dataset.view===v)); location.hash=v; if(v==='dashboard'){ ensureCharts().then(()=>renderChart()) } }
$$('.tab').forEach(t=> t.addEventListener('click', ()=> show(t.dataset.view))); window.addEventListener('hashchange', ()=> show(location.hash.replace('#','') || 'dashboard'));

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
  exportBtn:$('#exportBtn'), exportEncBtn:$('#exportEncBtn'), exportCSVBtn:$('#exportCSVBtn'), importCSVBtn:$('#importCSVBtn'), importCSVFile:$('#importCSVFile'),
  importBtn:$('#importBtn'), importFile:$('#importFile'),
  height:$('#height'), pin:$('#pin'), saveSettings:$('#saveSettings'), clearAll:$('#clearAll'),
  updateBanner:$('#updateBanner'), reloadApp:$('#reloadApp'),
  btnWeeklyPDF:$('#btnWeeklyPDF'), resetZoom:$('#resetZoom'), autoCalcs:$('#autoCalcs'),
  btnDiagnostics:$('#btnDiagnostics'), diagCard:$('#diagCard'), ua:$('#ua'), lsOK:$('#lsOK'), notif:$('#notif'), sw:$('#sw'),
  snack:$('#snack'), snackMsg:$('#snackMsg'), snackUndo:$('#snackUndo'),
  onboardModal:$('#onboardModal'), onbStart:$('#onbStart'), onbSkip:$('#onbSkip'), onbHeight:$('#onbHeight'), onbWater:$('#onbWater'), onbWeight:$('#onbWeight'), onbGoalWeight:$('#onbGoalWeight')
};

// Snackbar with Undo
let lastAction=null; function showSnack(msg, action){ el.snackMsg.textContent=msg; el.snack.style.display='flex'; lastAction=action||null; setTimeout(()=>{ el.snack.style.display='none'; lastAction=null }, 5000) } el.snackUndo.onclick=()=>{ if(lastAction){ lastAction(); lastAction=null; el.snack.style.display='none'; } };

// Storage
function getEntries(){ return (load(LS.ENTRIES,[])).sort((a,b)=>a.date.localeCompare(b.date)) }
function saveEntries(list){ save(LS.ENTRIES, list) }

// BMI + auto calcs
function updateBMI(){ const w=parseF(el.weight?.value), h=parseF(el.height?.value)/100; const bf=parseF(el.bodyFat?.value); if(el.bmi) el.bmi.value=(w&&h)?(w/(h*h)).toFixed(1):''; if(w!=null && bf!=null){ const fm=(w*bf/100).toFixed(1), lm=(w - w*bf/100).toFixed(1); let tdee='—'; if(h){ const bmr=10*w + 6.25*(h*100) - 5*30 + 5; tdee=Math.round(bmr*1.2) } el.autoCalcs.textContent=`كتلة دهنية: ${fm}كجم • كتلة صافية: ${lm}كجم • TDEE~ ${tdee} ك.س` } else { el.autoCalcs.textContent='—' } }
document.addEventListener('input', ev=>{ if(ev.target && ['weight','height','bodyFat'].includes(ev.target.id)) updateBMI() });

// Form helpers
function resetForm(){ window.editingId=null; if(el.date) el.date.value=todayISO(); ['weight','bodyFat','muscle','water','visceral','bmr','notes'].forEach(id=>{ if(el[id]) el[id].value='' }); updateBMI() }
function fillForm(e){ if(!e) return; el.date.value=e.date; el.weight.value=e.weightKg??''; el.bodyFat.value=e.bodyFatPct??''; el.muscle.value=e.muscleKg??''; el.water.value=e.waterPct??''; el.visceral.value=e.visceralFat??''; el.bmr.value=e.bmr??''; el.notes.value=e.notes??''; updateBMI(); show('add'); scrollTo({top:0,behavior:'smooth'}) }
$$('.chip[data-preset]').forEach(c=> c.onclick=()=>{ const p=c.dataset.preset; const dt=new Date(); if(p!=='today') dt.setDate(dt.getDate()+Number(p)); el.date.value=dt.toISOString().slice(0,10) });
if(el.copyLast) el.copyLast.onclick=()=>{ const list=getEntries(); const last=list[list.length-1]; if(!last) return alert(load(LS.LOCALE,'ar')==='ar'?'لا توجد قراءة سابقة':'No previous entry'); fillForm({...last, date: todayISO()}) };

// Save + guard large delta
if(el.saveBtn) el.saveBtn.onclick=()=>{
  const list=getEntries(); const last=list[list.length-1];
  const obj={ id:(window.editingId||uid()), date:el.date?.value, weightKg:parseF(el.weight?.value), bodyFatPct:parseF(el.bodyFat?.value), muscleKg:parseF(el.muscle?.value), waterPct:parseF(el.water?.value), visceralFat:parseF(el.visceral?.value), bmr:el.bmr?.value?parseInt(el.bmr.value):null, bmi:el.bmi?.value?parseFloat(el.bmi.value):null, notes:el.notes?.value?.trim()||'' };
  if(!obj.date) return alert('اختر تاريخًا'); if(obj.weightKg==null) return alert('الوزن مطلوب');
  if(last && last.weightKg!=null){ const diff=Math.abs(obj.weightKg-last.weightKg); if(diff>5){ if(!confirm((load(LS.LOCALE,'ar')==='ar'?'فرق الوزن كبير ':'Large change ') + diff.toFixed(1)+'kg')) return } }
  const oldList=getEntries(); const others=oldList.filter(x=>x.id!==obj.id); others.push(obj); others.sort((a,b)=>a.date.localeCompare(b.date)); saveEntries(others);
  showSnack(load(LS.LOCALE,'ar')==='ar'?'تم الحفظ':'Saved', ()=>{ saveEntries(oldList); renderAll() });
  window.editingId=null; resetForm(); renderAll(); show('history'); vibrate(10);
};
if(el.cancelBtn) el.cancelBtn.onclick=()=>{ window.editingId=null; resetForm() };

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
        { label: (load(LS.LOCALE,'ar')==='ar'?'الوزن (كجم)':'Weight (kg)'), data: weight, tension:.35, yAxisID:'y' },
        { label: (load(LS.LOCALE,'ar')==='ar'?'دهون %':'Body Fat %'), data: bodyFat, tension:.35, yAxisID:'y1' },
        { label: (load(LS.LOCALE,'ar')==='ar'?'متوسط 7 أيام':'7d Avg'), data: weightAvg||[], tension:.35, yAxisID:'y', borderDash:[6,4], hidden: !showAvg }
      ]}, options:{
        responsive:true,
        plugins:{ zoom:{ zoom:{ wheel:{enabled:true}, pinch:{enabled:true}, mode:'x' }, pan:{ enabled:true, mode:'x'} } },
        scales:{ y:{ position:(load(LS.LOCALE,'ar')==='ar'?'right':'left') }, y1:{ position:(load(LS.LOCALE,'ar')==='ar'?'left':'right'), grid:{ drawOnChartArea:false } } }
      }
    });
  } else {
    chart.data.labels=labels; chart.data.datasets[0].data=weight; chart.data.datasets[1].data=bodyFat; chart.data.datasets[2].data=weightAvg||[]; chart.data.datasets[2].hidden=!showAvg; chart.update();
  }
}
$$('#view-dashboard .chip[data-range]').forEach(c=> c.onclick=()=>{ $$('#view-dashboard .chip[data-range]').forEach(x=>x.classList.remove('active')); c.classList.add('active'); range=c.dataset.range; ensureCharts().then(()=>renderChart()) });
$('#toggleAvg').onclick=(e)=>{ showAvg=!showAvg; e.target.classList.toggle('active', showAvg); ensureCharts().then(()=>renderChart()) };
$('#resetZoom').onclick=()=>{ if(chart && chart.resetZoom) chart.resetZoom() };

// KPIs
function renderKPIs(){
  const entries=getEntries(); const h=parseF(el.height?.value)/100;
  const latest=entries[entries.length-1], prev=entries[entries.length-2];
  if(latest){
    el.kpiWeight.textContent=nf(latest.weightKg);
    el.kpiBodyFat.textContent=nf(latest.bodyFatPct);
    el.kpiBMI.textContent = (h && latest.weightKg)? (latest.weightKg/(h*h)).toFixed(1) : '—';
    if(prev && prev.weightKg!=null){ const d=latest.weightKg-prev.weightKg; el.deltaWeight.textContent=`${d>0?'+':''}${d.toFixed(1)} ${load(LS.LOCALE,'ar')==='ar'?'كجم من آخر قراءة':'kg since last'}`; el.deltaWeight.className='delta '+(d>0?'up':d<0?'down':'') }
    if(prev && prev.bodyFatPct!=null){ const d=latest.bodyFatPct-prev.bodyFatPct; el.deltaBodyFat.textContent=`${d>0?'+':''}${d.toFixed(1)}%`; el.deltaBodyFat.className='delta '+(d>0?'up':d<0?'down':'') }
  } else { el.kpiWeight.textContent='—'; el.kpiBodyFat.textContent='—'; el.kpiBMI.textContent='—'; el.deltaWeight.textContent=''; el.deltaBodyFat.textContent='' }
  const g = load(LS.GOALS,{weight:null,bodyFat:null,weekly:null,deadline:null});
  if(g.weight && latest?.weightKg){ const diff=g.weight-latest.weightKg; el.kpiGoal.textContent=`${diff>0?'-':''}${Math.abs(diff).toFixed(1)} ${load(LS.LOCALE,'ar')==='ar'?'كجم':'kg'}`; el.deltaGoal.textContent=(load(LS.LOCALE,'ar')==='ar'?'المتبقي للوصول للوزن المستهدف':'remaining to goal') }
  else if(g.bodyFat && latest?.bodyFatPct){ const diff=g.bodyFat-latest.bodyFatPct; el.kpiGoal.textContent=`${diff>0?'-':''}${Math.abs(diff).toFixed(1)}%`; el.deltaGoal.textContent=(load(LS.LOCALE,'ar')==='ar'?'المتبقي لنسبة الدهون المستهدفة':'remaining to BF% goal') }
  else { el.kpiGoal.textContent='—'; el.deltaGoal.textContent='' }
}

// Goals
function loadGoals(){ return load(LS.GOALS,{weight:null,bodyFat:null,weekly:null,deadline:null}) }
function saveGoals(g){ save(LS.GOALS,g); renderGoals(g); renderKPIs() }
function renderGoals(g){
  el.goalWeight.value=g.weight??''; el.goalBodyFat.value=g.bodyFat??''; el.goalWeekly.value=g.weekly??''; el.goalDeadline.value=g.deadline??'';
  const entries=getEntries(); const latest=entries[entries.length-1]; let txt='';
  if(latest && g.weight && g.weekly){ const weeks=Math.abs((latest.weightKg-g.weight)/g.weekly); txt=(load(LS.LOCALE,'ar')==='ar'? 'تقدير: ':'ETA: ') + weeks.toFixed(1) + (load(LS.LOCALE,'ar')==='ar'?' أسبوع.':' weeks.') }
  el.etaText.textContent=txt;
}
el.saveGoals.onclick=()=>{ const g=loadGoals(); g.weight=parseF(el.goalWeight.value); g.bodyFat=parseF(el.goalBodyFat.value); g.weekly=parseF(el.goalWeekly.value); g.deadline=el.goalDeadline.value||null; saveGoals(g) };
el.clearGoals.onclick=()=> saveGoals({weight:null,bodyFat:null,weekly:null,deadline:null});

// Water + reminders
function waterState(){ const d=load(LS.WATER,null); const today=todayISO(); if(!d || d.date!==today){ return { date: today, intake: 0, goal: 3000 } } return d }
function saveWater(s){ save(LS.WATER,s); renderWater(s) }
function renderWater(s){ el.waterGoal.value=s.goal; const pct=Math.max(0,Math.min(100,Math.round((s.intake/Math.max(s.goal,1))*100))); el.waterPct.textContent=pct+'%'; el.waterRing.style.transform=`rotate(${pct/100*360-90}deg)` }
function addWater(ml){ const s=waterState(); s.intake=Math.max(0,s.intake+ml); saveWater(s); vibrate(6); try{ if('Notification' in window && Notification.permission==='granted'){ new Notification(load(LS.LOCALE,'ar')==='ar'?'تم تسجيل الماء':'Water logged',{ body:`+${ml} ml • ${s.intake}/${s.goal} ml` }) } }catch(_){ } }
$$('.chip[data-add]').forEach(b=> b.onclick=()=>{ const ml=parseInt(b.dataset.add); if(ml>0) addWater(ml) });
el.addCustom.onclick=()=>{ const v=parseInt(el.waterCustom.value||'0'); if(v>0) addWater(v) };
el.waterGoal.addEventListener('input', ()=>{ const s=waterState(); s.goal=parseInt(el.waterGoal.value||'0')||3000; saveWater(s) });
el.waterReset.onclick=()=>{ const s=waterState(); s.intake=0; saveWater(s) };
let waterInterval=null; function inQuietHours(start,end,d=new Date()){ const [sh,sm]=start.split(':').map(Number); const [eh,em]=end.split(':').map(Number); const cur=d.getHours()*60+d.getMinutes(); const s=sh*60+sm,e=eh*60+em; return s<=e ? (cur>=s&&cur<e):(cur>=s||cur<e) }
el.waterNotify.onclick=async()=>{
  try{
    if(!('Notification' in window)) return alert('المتصفح لا يدعم الإشعارات');
    let perm=Notification.permission; if(perm!=='granted'){ perm=await Notification.requestPermission(); } if(perm!=='granted') return alert('لم يتم السماح بالإشعارات');
    if(waterInterval){ clearInterval(waterInterval); waterInterval=null; el.waterNotify.textContent=(load(LS.LOCALE,'ar')==='ar'?'تفعيل تذكير الماء':'Enable water reminder'); return }
    el.waterNotify.textContent=(load(LS.LOCALE,'ar')==='ar'?'إيقاف تذكير الماء':'Disable water reminder');
    const cfg=load(LS.CFG,{waterInterval:90,quietStart:'22:00',quietEnd:'08:00'});
    const tick=()=>{ const now=new Date(); if(!inQuietHours(cfg.quietStart,cfg.quietEnd,now)){ try{ const s=waterState(); new Notification('اشرب ماء 💧',{ body:`${s.intake}/${s.goal} ml` }) }catch(_){ } } };
    tick(); waterInterval=setInterval(tick, (cfg.waterInterval||90)*60*1000);
  }catch(_){ }
};

// CSV Import/Export with mapping
function toCSV(list){ const cols=['date','weightKg','bodyFatPct','muscleKg','waterPct','visceralFat','bmr','bmi','notes']; const head=cols.join(','); const rows=list.map(e=> cols.map(c=> (e[c]==null?'':String(e[c]).replace(/,/g,' '))).join(',')); return [head].concat(rows).join('\n') }
el.exportCSVBtn.onclick=()=>{ const blob=new Blob([toCSV(getEntries())],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='inbody.csv'; a.click(); URL.revokeObjectURL(url) };
el.importCSVBtn.onclick=()=> el.importCSVFile.click();
el.importCSVFile.onchange=(ev)=>{ const f=ev.target.files?.[0]; if(!f) return; const reader=new FileReader(); reader.onload=()=>{ const txt=reader.result; const lines=txt.split(/\r?\n/).filter(x=>x.trim().length); if(!lines.length) return alert('CSV فارغ'); const header=lines[0].split(','); const fields=['date','weightKg','bodyFatPct','muscleKg','waterPct','visceralFat','bmr','bmi','notes']; const map={}; // naive auto-map by name
  header.forEach((h,i)=>{ const t=h.trim().toLowerCase(); const m=fields.find(f=> t.includes(f.toLowerCase().replace('kg','')) || (f==='date' && t.includes('date')) ); if(m) map[m]=i; });
  let list=getEntries(); for(let i=1;i<lines.length;i++){ const cols=lines[i].split(','); const e={ id:uid(), date: (cols[map['date']]||'').slice(0,10), weightKg: parseF(cols[map['weightKg']]), bodyFatPct: parseF(cols[map['bodyFatPct']]), muscleKg: parseF(cols[map['muscleKg']]), waterPct: parseF(cols[map['waterPct']]), visceralFat: parseF(cols[map['visceralFat']]), bmr: parseF(cols[map['bmr']])?parseInt(cols[map['bmr']]):null, bmi: parseF(cols[map['bmi']]), notes: (cols[map['notes']]||'').trim() }; if(e.date) list.push(e) }
  saveEntries(list.sort((a,b)=>a.date.localeCompare(b.date))); renderAll(); showSnack('تم استيراد CSV', ()=>{ /* no easy undo */ });
}; reader.readAsText(f) };

// JSON Export / Import (plain + encrypted)
el.exportBtn.onclick=async()=>{ const data=JSON.stringify({heightCm:parseF(el.height?.value)||null,goals:load(LS.GOALS,null),water:load(LS.WATER,null),entries:getEntries()},null,2); const blob=new Blob([data],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`inbody-ultra-${todayISO()}.json`; a.click(); URL.revokeObjectURL(url) };
async function getKeyFromPassword(pw, salt){ const enc=new TextEncoder(); const key=await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({name:'PBKDF2', salt, iterations:100000, hash:'SHA-256'}, key, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']); }
function b64(arr){ return btoa(String.fromCharCode(...new Uint8Array(arr))) } function b64d(b){ const bin=atob(b); const len=bin.length; const u8=new Uint8Array(len); for(let i=0;i<len;i++) u8[i]=bin.charCodeAt(i); return u8 }
el.exportEncBtn.onclick=async()=>{ const pw=prompt('Password?'); if(!pw) return; const data=JSON.stringify({heightCm:parseF(el.height?.value)||null,goals:load(LS.GOALS,null),water:load(LS.WATER,null),entries:getEntries()},null,2); const salt=crypto.getRandomValues(new Uint8Array(16)); const iv=crypto.getRandomValues(new Uint8Array(12)); const key=await getKeyFromPassword(pw, salt); const ct=await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, new TextEncoder().encode(data)); const pkg=JSON.stringify({ v:'enc1', salt:b64(salt), iv:b64(iv), ct:b64(ct) }); const blob=new Blob([pkg],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`inbody-ultra-${todayISO()}.enc.json`; a.click(); URL.revokeObjectURL(url) };
el.importBtn.onclick=()=> el.importFile.click();
el.importFile.onchange=(ev)=>{ const f=ev.target.files?.[0]; if(!f) return; const reader=new FileReader(); reader.onload=async()=>{ try{ const text=reader.result; if(text.trim().startsWith('{') && text.includes('"v":"enc1"')){ const pkg=JSON.parse(text); const pw=prompt('Password?'); if(!pw) return; const salt=b64d(pkg.salt), iv=b64d(pkg.iv), ct=b64d(pkg.ct); const key=await getKeyFromPassword(pw, salt); const plain=await crypto.subtle.decrypt({name:'AES-GCM', iv}, key, ct); const obj=JSON.parse(new TextDecoder().decode(plain)); if(obj.heightCm!=null) el.height.value=obj.heightCm; if(obj.goals) save(LS.GOALS,obj.goals); if(obj.water) save(LS.WATER,obj.water); if(Array.isArray(obj.entries)) save(LS.ENTRIES,obj.entries); renderAll(); return; } else { const obj=JSON.parse(text); if(obj.heightCm!=null) el.height.value=obj.heightCm; if(obj.goals) save(LS.GOALS,obj.goals); if(obj.water) save(LS.WATER,obj.water); if(Array.isArray(obj.entries)) save(LS.ENTRIES,obj.entries); renderAll(); } }catch(e){ alert('ملف غير صالح') } }; reader.readAsText(f) };

// History (inline edit + delete)
let historyRange='all';
function renderTable(){
  const q=(el.searchNotes?.value||'').trim().toLowerCase(); let entries=getEntries();
  if(historyRange!=='all'){ const c=new Date(); c.setDate(c.getDate()-Number(historyRange)); entries=entries.filter(e=> new Date(e.date)>=c) }
  if(q) entries=entries.filter(e=> (e.notes||'').toLowerCase().includes(q));
  el.tableBody.innerHTML='';
  for(const e of entries){
    const tr=document.createElement('tr'); const td=v=>{ const x=document.createElement('td'); x.textContent=v; return x };
    const tdDate=td(e.date); tdDate.contentEditable='true'; tdDate.onblur=()=>{ const old=e.date; e.date=tdDate.textContent.trim().slice(0,10); saveEntries(getEntries().map(x=>x.id===e.id?e:x)); showSnack('تم التعديل', ()=>{ e.date=old; saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll() }); };
    const tdW=td(nf(e.weightKg)); tdW.contentEditable='true'; tdW.onblur=()=>{ const old=e.weightKg; e.weightKg=parseF(tdW.textContent); saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll(); showSnack('تم التعديل', ()=>{ e.weightKg=old; saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll() }) };
    const tdBF=td(nf(e.bodyFatPct)); tdBF.contentEditable='true'; tdBF.onblur=()=>{ const old=e.bodyFatPct; e.bodyFatPct=parseF(tdBF.textContent); saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll(); showSnack('تم التعديل', ()=>{ e.bodyFatPct=old; saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll() }) };
    const tdM=td(nf(e.muscleKg)); tdM.contentEditable='true'; tdM.onblur=()=>{ const old=e.muscleKg; e.muscleKg=parseF(tdM.textContent); saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll(); showSnack('تم التعديل', ()=>{ e.muscleKg=old; saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll() }) };
    const tdWa=td(nf(e.waterPct)); tdWa.contentEditable='true'; tdWa.onblur=()=>{ const old=e.waterPct; e.waterPct=parseF(tdWa.textContent); saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll(); showSnack('تم التعديل', ()=>{ e.waterPct=old; saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll() }) };
    const tdV=td(nf(e.visceralFat)); tdV.contentEditable='true'; tdV.onblur=()=>{ const old=e.visceralFat; e.visceralFat=parseF(tdV.textContent); saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll(); showSnack('تم التعديل', ()=>{ e.visceralFat=old; saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll() }) };
    const tdBMR=td(e.bmr??'—'); tdBMR.contentEditable='true'; tdBMR.onblur=()=>{ const old=e.bmr; e.bmr=parseF(tdBMR.textContent)?parseInt(tdBMR.textContent):null; saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll(); showSnack('تم التعديل', ()=>{ e.bmr=old; saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll() }) };
    const tdBMI=td(e.bmi??'—'); tdBMI.contentEditable='true'; tdBMI.onblur=()=>{ const old=e.bmi; e.bmi=parseF(tdBMI.textContent); saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll(); showSnack('تم التعديل', ()=>{ e.bmi=old; saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll() }) };
    const tdNotes=td(e.notes||'—'); tdNotes.contentEditable='true'; tdNotes.onblur=()=>{ const old=e.notes; e.notes=tdNotes.textContent.trim(); saveEntries(getEntries().map(x=>x.id===e.id?e:x)); showSnack('تم التعديل', ()=>{ e.notes=old; saveEntries(getEntries().map(x=>x.id===e.id?e:x)); renderAll() }) };
    const actions=document.createElement('td'); actions.style.display='flex'; actions.style.gap='6px';
    const b1=document.createElement('button'); b1.textContent=load(LS.LOCALE,'ar')==='ar'?'تعديل':'Edit'; b1.className='ghost'; b1.onclick=()=>{ window.editingId=e.id; fillForm(e) };
    const b2=document.createElement('button'); b2.textContent=load(LS.LOCALE,'ar')==='ar'?'حذف':'Delete'; b2.className='ghost'; b2.onclick=()=>{ if(confirm(load(LS.LOCALE,'ar')==='ar'?'حذف هذه القراءة؟':'Delete this entry?')){ const oldList=getEntries(); saveEntries(oldList.filter(x=>x.id!==e.id)); renderAll(); showSnack(load(LS.LOCALE,'ar')==='ar'?'تم الحذف':'Deleted', ()=>{ saveEntries(oldList); renderAll() }) } };
    actions.appendChild(b1); actions.appendChild(b2);
    [tdDate,tdW,tdBF,tdM,tdWa,tdV,tdBMR,tdBMI,tdNotes,actions].forEach(x=> tr.appendChild(x));
    el.tableBody.appendChild(tr);
  }
}
$('#searchNotes').addEventListener('input', renderTable);
$$('#view-history .chip[data-range]').forEach(c=> c.onclick=()=>{ $$('#view-history .chip[data-range]').forEach(x=>x.classList.remove('active')); c.classList.add('active'); historyRange=c.dataset.range; renderTable(); });

// PDF weekly report
el.btnWeeklyPDF.onclick=async()=>{
  await ensurePDF(); const { jsPDF } = window.jspdf; const doc=new jsPDF(); const entries=getEntries().filter(e=> new Date(e.date) >= (d=>{ const x=new Date(); x.setDate(x.getDate()-7); return x })()); let y=10;
  doc.setFontSize(16); doc.text((load(LS.LOCALE,'ar')==='ar'?'تقرير أسبوعي ':'Weekly Report ')+todayISO(), 10, y); y+=8;
  const latest=getEntries().slice(-1)[0]||{}; doc.setFontSize(12); doc.text(`Weight: ${latest.weightKg??'-'} kg`,10,y); y+=6; doc.text(`Body Fat: ${latest.bodyFatPct??'-'} %`,10,y); y+=6;
  y+=4; doc.setFontSize(12); doc.text('Date     Weight  BF%   Notes', 10, y); y+=4; doc.setFontSize(10);
  (entries.slice(-14)).forEach(e=>{ doc.text(`${e.date}   ${e.weightKg??'-'}   ${e.bodyFatPct??'-'}   ${(e.notes||'').slice(0,30)}`, 10, y); y+=5; if(y>280){ doc.addPage(); y=10 } });
  doc.save('weekly-report.pdf');
};

// Settings + Diagnostics
function loadSettings(){ const h=load(LS.HEIGHT,null); if(h!=null) el.height.value=h; const p=load(LS.PIN,null); if(p) el.pin.value=p; const cfg=load(LS.CFG,{waterInterval:90,quietStart:'22:00',quietEnd:'08:00'}); $('#waterInterval').value=String(cfg.waterInterval); $('#quietStart').value=cfg.quietStart; $('#quietEnd').value=cfg.quietEnd; }
el.saveSettings.onclick=()=>{ if(el.height.value) save(LS.HEIGHT, parseF(el.height.value)); if(el.pin.value && (el.pin.value.length<4||el.pin.value.length>6)) return alert('PIN 4-6'); if(el.pin.value) save(LS.PIN, el.pin.value); const cfg=load(LS.CFG,{waterInterval:90,quietStart:'22:00',quietEnd:'08:00'}); cfg.waterInterval=parseInt($('#waterInterval').value||'90'); cfg.quietStart=$('#quietStart').value||'22:00'; cfg.quietEnd=$('#quietEnd').value||'08:00'; save(LS.CFG,cfg); alert(load(LS.LOCALE,'ar')==='ar'?'تم الحفظ':'Saved') };
el.clearAll.onclick=()=>{ if(confirm(load(LS.LOCALE,'ar')==='ar'?'مسح كل البيانات؟':'Clear all data?')){ Object.values(LS).forEach(k=>localStorage.removeItem(k)); location.reload() } };
el.btnDiagnostics.onclick=()=>{ el.diagCard.style.display = (el.diagCard.style.display==='none'?'block':'none'); if(el.diagCard.style.display==='block'){ el.ua.textContent = navigator.userAgent; el.lsOK.textContent = (function(){ try{ localStorage.setItem('x','1'); localStorage.removeItem('x'); return 'OK' }catch(e){ return 'Blocked' }})(); el.notif.textContent = (('Notification' in window)? Notification.permission : 'N/A'); if('serviceWorker' in navigator){ navigator.serviceWorker.getRegistrations().then(rs=>{ el.sw.textContent = rs.length? 'Registered' : 'None' }) } else { el.sw.textContent='N/A' } } };

// Onboarding
(function(){
  const firstRun = !localStorage.getItem(LS.ENTRIES);
  if(firstRun){ el.onboardModal.style.display='flex' }
  el.onbSkip.onclick=()=>{ el.onboardModal.style.display='none' };
  el.onbStart.onclick=()=>{
    const height=parseF(el.onbHeight.value)||173; const waterGoal=parseInt(el.onbWater.value||'3000'); const weight=parseF(el.onbWeight.value)||80; const gweight=parseF(el.onbGoalWeight.value)|| (weight-5);
    save(LS.HEIGHT, height); const entries=[]; const today=new Date(); for(let i=14;i>=0;i--){ const d=new Date(); d.setDate(today.getDate()-i); const drift = (Math.random()-0.5)*0.6; entries.push({ id:uid(), date:d.toISOString().slice(0,10), weightKg: +(weight - (14-i)*0.2 + drift).toFixed(1), bodyFatPct: +(20 + (Math.random()-0.5)*1.5).toFixed(1), muscleKg: null, waterPct: null, visceralFat: null, bmr: null, bmi: null, notes: i===0? 'Baseline' : '' }) }
    saveEntries(entries); save(LS.GOALS,{weight:gweight,bodyFat:null,weekly:-0.5,deadline:null}); save(LS.WATER,{date:todayISO(),intake:0,goal:waterGoal}); el.onboardModal.style.display='none'; renderAll(); show('dashboard'); ensureCharts().then(()=>renderChart()); showSnack(load(LS.LOCALE,'ar')==='ar'?'تمت التهيئة':'Onboarding done');
  };
})();

// Render all
function renderAll(){ renderKPIs(); ensureCharts().then(()=>renderChart()); renderTable(); renderGoals(load(LS.GOALS,{weight:null,bodyFat:null,weekly:null,deadline:null})); renderWater(waterState()); }
(function init(){
  const pin=load(LS.PIN,null); if(pin){ const entered=prompt(load(LS.LOCALE,'ar')==='ar'?'أدخل PIN':'Enter PIN'); if(entered!==pin){ alert(load(LS.LOCALE,'ar')==='ar'?'PIN غير صحيح':'Wrong PIN'); location.reload(); return } }
  el.date.value=todayISO(); loadSettings(); show(location.hash.replace('#','') || 'dashboard'); renderAll();
})();

// External ensure functions wrappers
window.ensureCharts = window.ensureCharts || (async function(){ if(window.Chart) return; await new Promise(r=>{ const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/chart.js'; s.onload=r; document.head.appendChild(s); }); await new Promise(r=>{ const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1/dist/chartjs-plugin-zoom.umd.min.js'; s.onload=r; document.head.appendChild(s); }); });
window.ensurePDF = window.ensurePDF || (async function(){ if(window.jspdf) return; await new Promise(r=>{ const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'; s.onload=r; document.head.appendChild(s); }); });
})();
