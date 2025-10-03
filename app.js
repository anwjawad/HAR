// أدوات
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);
const now = ()=> Date.now();

// الحالة
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

// Helpers
function updateCounters(){
  $('#masteredCount').textContent = STATE.mastered.size;
  $('#totalLetters').textContent = LETTERS.length;
}
function switchTab(id){
  $$('.tab').forEach(t=>t.classList.remove('active'));
  $$('.tab-btn').forEach(b=>b.classList.remove('active'));
  $('#'+id).classList.add('active');
  document.querySelector(`.tab-btn[data-tab="${id}"]`).classList.add('active');
}
function initTabs(){ $$('.tab-btn').forEach(btn=> btn.addEventListener('click', ()=> switchTab(btn.dataset.tab))); }

// Letters rendering
function renderLetters(){
  const grid = $('#lettersGrid');
  grid.innerHTML='';
  const showTips = $('#showTips').checked;
  const showNiq = $('#toggleNiqqud').checked;
  const showIPA = $('#showIPA').checked;

  LETTERS.forEach(L=>{
    const heDisp = showNiq ? (L.he.includes('ּ')?L.he:L.he+'ּ') : L.he;
    const card = document.createElement('div');
    card.className='card';
    const top = document.createElement('div');
    top.style.display='flex'; top.style.alignItems='baseline'; top.style.justifyContent='space-between';

    const h = document.createElement('h3'); h.textContent = heDisp;
    const star = document.createElement('button');
    star.textContent = STATE.mastered.has(L.he)?'✓ متقن':'علّم كمُتقَن';
    star.className='mode-btn';
    star.onclick = ()=>{ if(STATE.mastered.has(L.he)) STATE.mastered.delete(L.he); else STATE.mastered.add(L.he); saveProgress(); renderLetters(); updateCounters(); };
    top.appendChild(h); top.appendChild(star);
    card.appendChild(top);

    const line = document.createElement('div');
    line.innerHTML = `<span class="badge">${L.nameAr}</span> <span class="badge latin">تقريب: ${L.approxAr}</span>` + (showIPA? ` <span class="badge">IPA: ${L.ipa}</span>`:'');
    card.appendChild(line);

    if(showTips && L.tips){
      const note = document.createElement('div');
      note.className='note'; note.textContent = L.tips;
      card.appendChild(note);
    }

    // Mnemonics editor
    const m = document.createElement('div'); m.className='mnem';
    const ta = document.createElement('textarea');
    ta.placeholder = 'اكتب مذكّرة/ربط ذهني لهذا الحرف (Mnemonic)...';
    ta.value = STATE.notes[L.he] || '';
    ta.oninput = ()=>{ STATE.notes[L.he]=ta.value; saveNotes(); };
    m.appendChild(ta);
    m.insertAdjacentHTML('beforeend','<div class="small">💡 اكتب فكرة تساعدك على تذكّر الصوت (مثال: "ח = خ").</div>');
    card.appendChild(m);

    // SRS init button
    const sbtn = document.createElement('button');
    sbtn.className='mode-btn'; sbtn.textContent='أضِفه للمراجعة الذكية';
    sbtn.onclick = ()=>{ ensureSRS(L.he); alert('تمت إضافة الحرف إلى المراجعة.'); updateDueCount(); };
    card.appendChild(sbtn);

    grid.appendChild(card);
  });
}

// Settings
function initSettings(){
  $('#rtlToggle').onchange = ()=>{ document.documentElement.dir = $('#rtlToggle').checked ? 'rtl' : 'ltr'; };
  $('#resetProgress').onclick = ()=>{
    if(confirm('هل تريد إعادة ضبط التقدّم والملاحظات والمراجعة؟')){
      STATE.mastered.clear(); saveProgress();
      STATE.notes={}; saveNotes();
      STATE.srs={}; saveSRS();
      renderLetters(); updateCounters(); updateDueCount();
    }
  };
  $('#toggleNiqqud').onchange = renderLetters;
  $('#showTips').onchange = renderLetters;
  $('#showIPA').onchange = renderLetters;
}

// Practice
function randomItem(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function renderPractice(mode='type-he'){
  const area = $('#practiceArea'); area.innerHTML='';
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

function firstApprox(s){ return s.split('/')[0]; }

function tolerantApproxCheck(ans, approxStr){
  if(!ans) return false;
  const a = ans.trim().toLowerCase();
  const opts = approxStr.split('/').map(x=>x.trim().toLowerCase());
  // سماح بأخطاء بسيطة (حروف قريبة): ف/ڤ، ك/ق، ج/گ، س/ص/ث~س
  const mapEq = {'ڤ':'ف','ق':'ك','گ':'ج','ث':'س'};
  const norm = ch=> mapEq[ch] || ch;
  const an = [...a].map(norm).join('');
  return opts.some(o => {
    const on = [...o].map(norm).join('');
    return on.startsWith(an) || an.startsWith(on) || an===on;
  });
}

// Phonetic helper
const PHON_MAP = {
  'kh':['ח','כ','ך'], 'x':['ח','כ'], 'sh':['שׁ'], 's':['ס','שׂ'], 'ch':['ח'], 'h':['ה','ח'],
  'ts':['צ','ץ'], 'tz':['צ','ץ'],
  'p':['פּ'], 'f':['פ','ף'], 'b':['בּ'], 'v':['ב'],
  'k':['כּ','ק'], 'q':['ק'], 'g':['ג'], 'd':['ד'], 't':['ת','ט'],
  'z':['ז'], 'r':['ר'], 'l':['ל'], 'm':['מ','ם'], 'n':['נ','ן'], 'y':['י'], 'w':['ו'], 'o':['ו'], 'u':['ו'], 'i':['י']
};

function initPhonHelper(){
  $('#phonSuggest').onclick = ()=>{
    const val = ($('#phonIn').value||'').trim().toLowerCase();
    const box = $('#phonOut'); box.innerHTML='';
    if(!val) return;
    const keys = Object.keys(PHON_MAP).filter(k=> val.startsWith(k));
    let set = new Set();
    keys.forEach(k=> PHON_MAP[k].forEach(h=> set.add(h)));
    if(set.size===0){ box.textContent='لا اقتراحات – جرّب: sh, kh, ts, p, k ...'; return; }
    [...set].slice(0,12).forEach(h=>{
      const d = document.createElement('div'); d.className='drill-card'; d.textContent=h; box.appendChild(d);
    });
  };
}

// On-screen Hebrew keyboard
function initKbd(){
  const letters = [...new Set(LETTERS.map(L=>L.he))];
  const k = $('#kbd'); k.innerHTML='';
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

// SRS (Leitner-like)
function ensureSRS(he){
  if(!STATE.srs[he]) STATE.srs[he]={box:1, due: now()};
  saveSRS();
}
function bumpSRS(he, correct){
  ensureSRS(he);
  const s = STATE.srs[he];
  if(correct) s.box = Math.min(5, s.box+1); else s.box = Math.max(1, s.box-1);
  const days = {1:0,2:1,3:3,4:7,5:14}[s.box]; // فواصل بسيطة بالأيام
  s.due = now() + days*24*60*60*1000;
  STATE.srs[he]=s; saveSRS(); updateDueCount();
}
function dueItems(){
  const t = now();
  return Object.entries(STATE.srs).filter(([he,s])=> s.due<=t).map(([he,s])=> he);
}
function updateDueCount(){ $('#dueCount').textContent = 'المستحق: ' + dueItems().length; }

function startReview(){
  const due = dueItems();
  if(due.length===0){ $('#srsArea').innerHTML = '<div>لا شيء مستحق الآن. أضف حروفًا أو انتظر موعدها.</div>'; return; }
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

// Quiz
function startQuiz(){
  STATE.quiz.active=true; STATE.quiz.score=0; STATE.quiz.asked=0;
  $('#quizArea').innerHTML=''; $('#quizResult').textContent=''; askQuestion();
}
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

// Reading
function renderDrills(count=6){
  const box = $('#readingDrills'); box.innerHTML='';
  for(let i=0;i<count;i++){
    const s = SYLLABLES[Math.floor(Math.random()*SYLLABLES.length)];
    const d = document.createElement('div'); d.className='drill-card';
    d.innerHTML = `<div class="big" style="font-size:36px">${s}</div>
      <div class="note">دوّن نطقك التقريبي بالعربية أسفل:</div>
      <input type="text" placeholder="مثال: بو / بي / خا ...">`;
    box.appendChild(d);
  }
}

// Init
function initPractice(){
  let current='type-he'; renderPractice(current);
  $$('.mode-btn').forEach(b=>{
    if(!b.dataset.mode) return;
    b.addEventListener('click', ()=>{ $$('.mode-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); current=b.dataset.mode; renderPractice(current); });
  });
  initPhonHelper(); initKbd();
}
function initSettings(){
  $('#rtlToggle').checked = true; document.documentElement.dir='rtl';
  $('#rtlToggle').onchange = ()=>{ document.documentElement.dir = $('#rtlToggle').checked ? 'rtl' : 'ltr'; };
  $('#resetProgress').onclick = ()=>{
    if(confirm('هل تريد إعادة ضبط التقدّم والملاحظات والمراجعة؟')){
      STATE.mastered.clear(); saveProgress(); STATE.notes={}; saveNotes(); STATE.srs={}; saveSRS();
      renderLetters(); updateCounters(); updateDueCount();
    }
  };
  ['toggleNiqqud','showTips','showIPA'].forEach(id=>{ $('#'+id).onchange = renderLetters; });
}

document.addEventListener('DOMContentLoaded', ()=>{
  initTabs();
  initSettings();
  renderLetters();
  updateCounters();
  initPractice();
  $('#startQuiz').onclick = startQuiz;
  renderDrills();
  $('#nextDrill').onclick = ()=> renderDrills();
  $('#startReview').onclick = startReview;
  updateDueCount();
});
