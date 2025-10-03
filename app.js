// ===== Utilities =====
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);
const now = ()=> Date.now();

// ===== Global State =====
const STATE = {
  mastered: new Set(JSON.parse(localStorage.getItem('masteredLetters')||'[]')),
  notes: JSON.parse(localStorage.getItem('letterNotes')||'{}'),
  srs: JSON.parse(localStorage.getItem('srsData')||'{}'), // he -> {box:1..5, due:number}
  settings: { showTips:true, showNiqqud:false, showIPA:true, rtl:true },
  quiz: { active:false, score:0, total:10, asked:0 }
};

function saveProgress(){ localStorage.setItem('masteredLetters', JSON.stringify([...STATE.mastered])); }
function saveNotes(){ localStorage.setItem('letterNotes', JSON.stringify(STATE.notes)); }
function saveSRS(){ localStorage.setItem('srsData', JSON.stringify(STATE.srs)); }

function updateCounters(){ $('#masteredCount') && ($('#masteredCount').textContent = STATE.mastered.size); $('#totalLetters') && ($('#totalLetters').textContent = LETTERS.length); }
function switchTab(id){ $$('.tab').forEach(t=>t.classList.remove('active')); $$('.tab-btn').forEach(b=>b.classList.remove('active')); $('#'+id).classList.add('active'); document.querySelector(`.tab-btn[data-tab="${id}"]`).classList.add('active'); }
function initTabs(){ $$('.tab-btn').forEach(btn=> btn.addEventListener('click', ()=> switchTab(btn.dataset.tab))); }

// ===== Letters Rendering =====
function renderLetters(){
  const grid = $('#lettersGrid'); if(!grid) return;
  grid.innerHTML='';
  const showTips = $('#showTips')?.checked ?? true;
  const showNiq = $('#toggleNiqqud')?.checked ?? false;
  const showIPA = $('#showIPA')?.checked ?? true;

  LETTERS.forEach(L=>{
    const heDisp = showNiq ? (L.he.includes('ּ')?L.he:L.he+'ּ') : L.he;
    const card = document.createElement('div'); card.className='card';
    const top = document.createElement('div'); top.style.display='flex'; top.style.alignItems='baseline'; top.style.justifyContent='space-between';

    const h = document.createElement('h3'); h.textContent = heDisp;
    const star = document.createElement('button'); star.textContent = STATE.mastered.has(L.he)?'✓ متقن':'علّم كمُتقَن'; star.className='mode-btn';
    star.onclick = ()=>{ if(STATE.mastered.has(L.he)) STATE.mastered.delete(L.he); else STATE.mastered.add(L.he); saveProgress(); renderLetters(); updateCounters(); };
    top.appendChild(h); top.appendChild(star);
    card.appendChild(top);

    const line = document.createElement('div');
    line.innerHTML = `<span class="badge">${L.nameAr}</span> <span class="badge latin">تقريب: ${L.approxAr}</span>` + (showIPA? ` <span class="badge">IPA: ${L.ipa}</span>`:'');
    card.appendChild(line);

    if(showTips && L.tips){
      const note = document.createElement('div'); note.className='note'; note.textContent = L.tips; card.appendChild(note);
    }

    // Mnemonics
    const m = document.createElement('div'); m.className='mnem';
    const ta = document.createElement('textarea'); ta.placeholder='اكتب رابطة ذهنية...'; ta.value = STATE.notes[L.he] || '';
    ta.oninput = ()=>{ STATE.notes[L.he]=ta.value; saveNotes(); };
    m.appendChild(ta); m.insertAdjacentHTML('beforeend','<div class="small">💡 مثال: "ח = خ".</div>');
    card.appendChild(m);

    // SRS add
    const sbtn = document.createElement('button'); sbtn.className='mode-btn'; sbtn.textContent='أضِفه للمراجعة الذكية';
    sbtn.onclick = ()=>{ ensureSRS(L.he); alert('تمت إضافة الحرف إلى المراجعة.'); updateDueCount(); };
    card.appendChild(sbtn);

    grid.appendChild(card);
  });
}

// ===== Settings =====
function initSettings(){
  const rtl = $('#rtlToggle'); if(rtl){ rtl.checked = true; document.documentElement.dir='rtl'; rtl.onchange = ()=>{ document.documentElement.dir = rtl.checked ? 'rtl' : 'ltr'; }; }
  const reset = $('#resetProgress'); if(reset){ reset.onclick = ()=>{
    if(confirm('إعادة ضبط كل شيء؟')){ STATE.mastered.clear(); saveProgress(); STATE.notes={}; saveNotes(); STATE.srs={}; saveSRS(); renderLetters(); updateCounters(); updateDueCount(); }
  };}
  ;['toggleNiqqud','showTips','showIPA'].forEach(id=>{ const el = $('#'+id); if(el) el.onchange = renderLetters; });
}

// ===== Practice =====
function randomItem(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function firstApprox(s){ return s.split('/')[0]; }
function tolerantApproxCheck(ans, approxStr){
  if(!ans) return false;
  const a = ans.trim().toLowerCase();
  const opts = approxStr.split('/').map(x=>x.trim().toLowerCase());
  const mapEq = {'ڤ':'ف','ق':'ك','گ':'ج','ث':'س'};
  const norm = ch=> mapEq[ch] || ch;
  const an = [...a].map(norm).join('');
  return opts.some(o => {
    const on = [...o].map(norm).join('');
    return on.startsWith(an) || an.startsWith(on) || an===on;
  });
}

const PHON_MAP = {
  'kh':['ח','כ','ך'], 'x':['ח','כ'], 'sh':['שׁ'], 's':['ס','שׂ'], 'ch':['ח'], 'h':['ה','ח'],
  'ts':['צ','ץ'], 'tz':['צ','ץ'],
  'p':['פּ'], 'f':['פ','ף'], 'b':['בּ'], 'v':['ב'],
  'k':['כּ','ק'], 'q':['ק'], 'g':['ג'], 'd':['ד'], 't':['ת','ט'],
  'z':['ז'], 'r':['ר'], 'l':['ל'], 'm':['מ','ם'], 'n':['נ','ן'], 'y':['י'], 'w':['ו'], 'o':['ו'], 'u':['و'], 'i':['י']
};

function initPhonHelper(){
  const btn = $('#phonSuggest'); if(!btn) return;
  btn.onclick = ()=>{
    const val = ($('#phonIn')?.value||'').trim().toLowerCase();
    const box = $('#phonOut'); if(!box) return; box.innerHTML='';
    if(!val) return;
    const keys = Object.keys(PHON_MAP).filter(k=> val.startsWith(k));
    let set = new Set();
    keys.forEach(k=> PHON_MAP[k].forEach(h=> set.add(h)));
    if(set.size===0){ box.textContent='لا اقتراحات – جرّب: sh, kh, ts, p, k ...'; return; }
    [...set].slice(0,12).forEach(h=>{ const d=document.createElement('div'); d.className='drill-card'; d.textContent=h; box.appendChild(d); });
  };
}

function initKbd(){
  const letters = [...new Set(LETTERS.map(L=>L.he))];
  const k = $('#kbd'); if(!k) return; k.innerHTML='';
  letters.forEach(h=>{
    const btn = document.createElement('button'); btn.textContent = h;
    btn.onclick = ()=>{
      const el = document.activeElement;
      if(el && (el.tagName==='INPUT' || el.tagName==='TEXTAREA')){
        const start = el.selectionStart, end = el.selectionEnd;
        const v = el.value; el.value = v.slice(0,start)+h+v.slice(end);
        el.selectionStart = el.selectionEnd = start + h.length;
        el.dispatchEvent(new Event('input'));
      }
    };
    k.appendChild(btn);
  });
}

function renderPractice(mode='type-he'){
  const area = $('#practiceArea'); if(!area) return; area.innerHTML='';
  if(mode==='type-he'){
    const L = randomItem(LETTERS);
    area.innerHTML = `<div class="big">${L.he}</div>
      <div>IPA: <span class="badge">${L.ipa}</span></div>
      <input id="ans" type="text" placeholder="اكتب التقريب العربي (مثال: ب، ك، خ...)">
      <div class="small">تلميح: ${L.approxAr}</div>
      <button class="primary" id="check">تحقّق</button>
      <div class="result" id="res"></div>`;
    $('#check').onclick = ()=>{
      const a = ($('#ans').value||'').trim();
      const ok = tolerantApproxCheck(a, L.approxAr);
      $('#res').textContent = ok ? 'صحيح! 👍' : `جرّب مرة أخرى. تلميح: ${L.approxAr}`;
      if(ok){ STATE.mastered.add(L.he); saveProgress(); updateCounters(); bumpSRS(L.he,true); setTimeout(()=>renderPractice(mode), 700); }
      else { bumpSRS(L.he,false); }
    };
  } else if(mode==='type-ar'){
    const L = randomItem(LETTERS);
    area.innerHTML = `<div>المقابل/التقريب العربي: <span class="badge">${L.approxAr}</span> — IPA: <span class="badge">${L.ipa}</span></div>
      <input id="ans" type="text" placeholder="اكتب الحرف العبري (مثال: ${L.he})">
      <button class="primary" id="check">تحقّق</button>
      <div class="result" id="res"></div>`;
    $('#check').onclick = ()=>{
      const a = ($('#ans').value||'').trim();
      const ok = a === L.he;
      $('#res').textContent = ok ? 'صحيح! 👍' : `ليس صحيحًا. الجواب: ${L.he}`;
      if(ok){ STATE.mastered.add(L.he); saveProgress(); updateCounters(); bumpSRS(L.he,true); setTimeout(()=>renderPractice(mode), 700); }
      else { bumpSRS(L.he,false); }
    };
  } else { // match
    const chosen = Array.from({length:3},()=>randomItem(LETTERS));
    const cards = [];
    chosen.forEach(L=>{ cards.push({txt:L.he, key:L.he}); cards.push({txt:firstApprox(L.approxAr), key:L.he}); });
    cards.sort(()=>Math.random()-0.5);
    let open=[]; let solved=new Set();
    const wrap = document.createElement('div'); wrap.className='drills';
    cards.forEach((c,i)=>{
      const el = document.createElement('div'); el.className='drill-card'; el.textContent=c.txt;
      el.onclick = ()=>{
        if(solved.has(i)) return;
        el.style.outline='2px solid #4158f5'; open.push({i,c,el});
        if(open.length===2){
          const [a,b]=open; open=[];
          if(a.c.key===b.c.key && a.i!==b.i){ solved.add(a.i); solved.add(b.i); a.el.style.opacity=.4; b.el.style.opacity=.4;
            if(solved.size===cards.length){ wrap.insertAdjacentHTML('afterend','<div class="result">أحسنت! أنهيت المطابقة.</div>'); chosen.forEach(L=>{STATE.mastered.add(L.he); bumpSRS(L.he,true)}); saveProgress(); updateCounters(); }
          } else { setTimeout(()=>{a.el.style.outline='none'; b.el.style.outline='none';},400); chosen.forEach(L=>bumpSRS(L.he,false)); }
        }
      };
      wrap.appendChild(el);
    });
    area.appendChild(wrap);
  }
}

// ===== SRS =====
function ensureSRS(he){ if(!STATE.srs[he]) STATE.srs[he]={box:1, due: now()}; saveSRS(); }
function bumpSRS(he, correct){
  ensureSRS(he);
  const s = STATE.srs[he];
  if(correct) s.box = Math.min(5, s.box+1); else s.box = Math.max(1, s.box-1);
  const days = {1:0,2:1,3:3,4:7,5:14}[s.box];
  s.due = now() + days*24*60*60*1000;
  STATE.srs[he]=s; saveSRS(); updateDueCount();
}
function dueItems(){ const t = now(); return Object.entries(STATE.srs).filter(([he,s])=> s.due<=t).map(([he,s])=> he); }
function updateDueCount(){ const el=$('#dueCount'); if(el) el.textContent = 'المستحق: ' + dueItems().length; }
function startReview(){
  const due = dueItems(); const area = $('#srsArea'); if(!area) return;
  if(due.length===0){ area.innerHTML='<div>لا شيء مستحق الآن.</div>'; return; }
  const pick = due.sort(()=>Math.random()-0.5).slice(0,10);
  runSrsSession(pick);
}
function runSrsSession(list){
  const area = $('#srsArea'); area.innerHTML='';
  let idx=0, score=0;
  function render(){
    if(idx>=list.length){ area.innerHTML = `<div class="result">نتيجتك: ${score}/${list.length}</div>`; updateDueCount(); return; }
    const he = list[idx];
    const L = LETTERS.find(x=>x.he===he) || LETTERS[Math.floor(Math.random()*LETTERS.length)];
    area.innerHTML = `<div class="big">${L.he}</div>
      <div>IPA: <span class="badge">${L.ipa}</span></div>
      <input id="srsAns" type="text" placeholder="اكتب التقريب العربي">
      <div class="small">تلميح: ${L.approxAr}</div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="primary" id="ok">تحقّق</button>
        <button class="mode-btn" id="show">أظهر الحل</button>
      </div>
      <div id="srsRes" class="result"></div>`;
    $('#ok').onclick = ()=>{
      const ok = tolerantApproxCheck(($('#srsAns').value||'').trim(), L.approxAr);
      $('#srsRes').textContent = ok ? 'صحيح!' : `الصحيح: ${L.approxAr}`;
      bumpSRS(L.he, ok); score += ok?1:0; idx++; setTimeout(render, 600);
    };
    $('#show').onclick = ()=>{ $('#srsRes').textContent = `الصحيح: ${L.approxAr}`; bumpSRS(L.he, false); idx++; setTimeout(render, 600); };
  }
  render();
}

// ===== Quiz & Reading =====
function startQuiz(){ STATE.quiz.active=true; STATE.quiz.score=0; STATE.quiz.asked=0; $('#quizArea').innerHTML=''; $('#quizResult').textContent=''; askQuestion(); }
function askQuestion(){
  if(STATE.quiz.asked>=STATE.quiz.total){ endQuiz(); return; }
  const L = randomItem(LETTERS); const types=['he->ar','ar->he']; const t = randomItem(types);
  const area = $('#quizArea'); area.innerHTML='';
  if(t==='he->ar'){
    area.innerHTML = `<div class="big">${L.he}</div>
      <input id="qans" type="text" placeholder="اكتب التقريب العربي">
      <button class="primary" id="qcheck">تحقّق</button>
      <div class="result" id="qres"></div>`;
    $('#qcheck').onclick = ()=>{
      const ok = tolerantApproxCheck(($('#qans').value||'').trim(), L.approxAr);
      if(ok) STATE.quiz.score++; STATE.quiz.asked++;
      $('#qres').textContent = ok ? 'صحيح' : `خطأ (التلميح: ${L.approxAr})`;
      setTimeout(askQuestion, 600);
    };
  } else {
    area.innerHTML = `<div>تقريب عربي: <span class="badge">${L.approxAr}</span></div>
      <input id="qans" type="text" placeholder="اكتب الحرف العبري">
      <button class="primary" id="qcheck">تحقّق</button>
      <div class="result" id="qres"></div>`;
    $('#qcheck').onclick = ()=>{
      const ok = ($('#qans').value||'').trim()===L.he;
      if(ok) STATE.quiz.score++; STATE.quiz.asked++;
      $('#qres').textContent = ok ? 'صحيح' : `خطأ (الصحيح: ${L.he})`;
      setTimeout(askQuestion, 600);
    };
  }
}
function endQuiz(){ STATE.quiz.active=false; const pct=Math.round(100*STATE.quiz.score/STATE.quiz.total); $('#quizResult').textContent=`نتيجتك: ${STATE.quiz.score}/${STATE.quiz.total} (${pct}%)`; }

function renderDrills(count=6){
  const box = $('#readingDrills'); if(!box) return; box.innerHTML='';
  for(let i=0;i<count;i++){
    const s = SYLLABLES[Math.floor(Math.random()*SYLLABLES.length)];
    const d = document.createElement('div'); d.className='drill-card';
    d.innerHTML = `<div class="big" style="font-size:36px">${s}</div>
      <div class="note">دوّن نطقك التقريبي بالعربية أسفل:</div>
      <input type="text" placeholder="مثال: بو / بي / خا ...">`;
    box.appendChild(d);
  }
}

// ===== NEW: Arabic → Hebrew Transliteration =====
// Normalize Arabic input (remove diacritics, unify alef forms, etc.)
function normalizeArabic(str){
  if(!str) return '';
  const diacritics = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
  let s = str.replace(diacritics,'');
  // unify hamza/alef forms
  s = s.replace(/[أإآٱ]/g,'ا').replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/ة/g,'ه').replace(/ى/g,'ي');
  return s;
}

// Mapping Arabic letters to Hebrew approximations + notes
const AR_HE_MAP = {
  'ا': {he:'א', note:'حامل حركة/همزة خفيفة'},
  'ء': {he:'א', note:'همزة'},
  'ب': {he:'בּ', note:'ب'},
  'ت': {he:'ת', note:'ت'},
  'ث': {he:'ס', note:'تقريب: ث ≈ س'},
  'ج': {he:'ג', note:'ج (أحيانًا گ)'},
  'ح': {he:'ח', note:'بين ح وخ، نختار ח'},
  'خ': {he:'כ', note:'خ ≈ כ بدون نقطة'},
  'د': {he:'ד', note:'د'},
  'ذ': {he:'ז', note:'تقريب: ذ ≈ ز'},
  'ر': {he:'ר', note:'ر'},
  'ز': {he:'ז', note:'ز'},
  'س': {he:'ס', note:'س'},
  'ش': {he:'שׁ', note:'ش = شين منقوطة يمين'},
  'ص': {he:'צ', note:'ص ≈ تس/ts'},
  'ض': {he:'ד', note:'تقريب: ض ≈ د مفخمة'},
  'ط': {he:'ט', note:'ط'},
  'ظ': {he:'ז', note:'تقريب: ظ ≈ ز'},
  'ع': {he:'ע', note:'عين حلقية'},
  'غ': {he:'ר', note:'تقريب: غ حنجرية ≈ ר/ע'},
  'ف': {he:'פ', note:'ف'},
  'ق': {he:'ק', note:'ق'},
  'ك': {he:'כּ', note:'ك'},
  'ل': {he:'ל', note:'ل'},
  'م': {he:'מ', note:'م'},
  'ن': {he:'נ', note:'ن'},
  'ه': {he:'ה', note:'ه (قد تسكن آخرًا)'},
  'و': {he:'ו', note:'واو/حركة u/o'},
  'ي': {he:'י', note:'ياء/حركة i'},
  // Persian/Urdu extras often used in Arabic chats
  'پ': {he:'פּ', note:'پ (غير قياسية بالعربية الفصحى)'},
  'چ': {he:"צ׳", note:'تش ≈ צ׳ (تقريب أجنبي)'},
  'گ': {he:'ג', note:'گ ≈ ג'}
};

function transliterateArabicToHebrew(str){
  const s = normalizeArabic(str);
  const out = [];
  const explain = [];
  for(const ch of s){
    const map = AR_HE_MAP[ch];
    if(map){
      out.push(map.he);
      explain.push({ar: ch, he: map.he, why: map.note});
    } else {
      // keep spaces and punctuation; unknown letters pass through
      out.push(ch);
      if(/\s/.test(ch)) continue;
      explain.push({ar: ch, he: ch, why: '—'});
    }
  }
  return {hebrew: out.join('').replace(/(\S)ه\b/g,'$1ה'), explain};
}

function renderTranslit(){
  const ar = ($('#arWord')?.value||'').trim();
  const outBox = $('#translitOut'); const expBox = $('#translitExplain');
  if(!outBox || !expBox) return;
  if(!ar){ outBox.innerHTML='<div>اكتب كلمة عربية ثم اضغط "حوّل".</div>'; expBox.innerHTML=''; return; }
  const {hebrew, explain} = transliterateArabicToHebrew(ar);
  outBox.innerHTML = `<div class="big" style="font-weight:bold">${hebrew}</div>`;
  // Build explanation table
  const rows = explain.map(e=> `<tr><td>${e.ar}</td><td>${e.he}</td><td>${e.why}</td></tr>`).join('');
  expBox.innerHTML = `<table class="table">
    <thead><tr><th>العربي</th><th>المقابل العبري</th><th>الشرح</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

// ===== Init =====
function initPracticeTab(){
  let current='type-he'; renderPractice(current);
  $$('.mode-btn').forEach(b=>{
    if(!b.dataset.mode) return;
    b.addEventListener('click', ()=>{ $$('.mode-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); current=b.dataset.mode; renderPractice(current); });
  });
  initPhonHelper(); initKbd();
}

document.addEventListener('DOMContentLoaded', ()=>{
  initTabs(); initSettings(); renderLetters(); updateCounters();
  initPracticeTab();
  $('#startQuiz') && ($('#startQuiz').onclick = startQuiz);
  renderDrills();
  $('#nextDrill') && ($('#nextDrill').onclick = ()=> renderDrills());
  $('#startReview') && ($('#startReview').onclick = startReview);
  updateDueCount();
  // Transliteration bind
  $('#doTranslit') && ($('#doTranslit').onclick = renderTranslit);
});
