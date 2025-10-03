// وظائف الواجهة
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

const STATE = {
  mastered: new Set(JSON.parse(localStorage.getItem('masteredLetters')||'[]')),
  settings: {
    showTips: true,
    showNiqqud: false,
    rtl: true
  },
  quiz: {
    active: false,
    score: 0,
    total: 10,
    asked: 0
  }
};

function saveProgress(){
  localStorage.setItem('masteredLetters', JSON.stringify([...STATE.mastered]));
}

function renderLetters(){
  const grid = $('#lettersGrid');
  grid.innerHTML = '';
  const showTips = $('#showTips').checked;
  const showNiq = $('#toggleNiqqud').checked;

  LETTERS.forEach((L, idx)=>{
    const card = document.createElement('div');
    card.className = 'card';
    const top = document.createElement('div');
    top.style.display='flex';
    top.style.alignItems='baseline';
    top.style.justifyContent='space-between';

    const h = document.createElement('h3');
    h.textContent = L.he + (showNiq ? 'ּ' : '');
    const star = document.createElement('button');
    star.textContent = STATE.mastered.has(L.he) ? '✓ متقن' : 'علّم كمُتقَن';
    star.className = 'mode-btn';
    star.onclick = ()=>{
      if(STATE.mastered.has(L.he)) STATE.mastered.delete(L.he); else STATE.mastered.add(L.he);
      saveProgress();
      renderLetters();
      updateCounters();
    };
    top.appendChild(h); top.appendChild(star);

    const name = document.createElement('div');
    name.innerHTML = `<span class="badge">${L.nameAr}</span> <span class="badge latin">تقريب: ${L.approxAr}</span>`;

    card.appendChild(top);
    card.appendChild(name);
    if(showTips && L.tips){
      const note = document.createElement('div');
      note.className='note';
      note.textContent = L.tips;
      card.appendChild(note);
    }
    grid.appendChild(card);
  });
}

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

function initTabs(){
  $$('.tab-btn').forEach(btn=>{
    btn.addEventListener('click', ()=> switchTab(btn.dataset.tab));
  });
}

function initSettings(){
  const rtlToggle = $('#rtlToggle');
  rtlToggle.onchange = ()=>{
    document.documentElement.dir = rtlToggle.checked ? 'rtl' : 'ltr';
  };
  $('#resetProgress').onclick = ()=>{
    if(confirm('هل تريد إعادة ضبط التقدّم؟')){
      STATE.mastered.clear();
      saveProgress();
      renderLetters();
      updateCounters();
    }
  };
  $('#toggleNiqqud').onchange = renderLetters;
  $('#showTips').onchange = renderLetters;
}

function randomItem(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

// Practice Modes
function renderPractice(mode='type-he'){
  const area = $('#practiceArea');
  area.innerHTML = '';

  if(mode==='type-he'){
    const L = randomItem(LETTERS);
    area.innerHTML = `<div class="big">${L.he}</div>
      <input id="ans" type="text" placeholder="اكتب التقريب العربي (مثال: ب ، ك ، خ ...)">
      <button class="primary" id="check">تحقّق</button>
      <div class="result" id="res"></div>`;
    $('#check').onclick = ()=>{
      const a = $('#ans').value.trim();
      const ok = a && L.approxAr.includes(a[0]); // تبسيط
      $('#res').textContent = ok ? 'صحيح! 👍' : `جرّب مرة أخرى. تلميح: ${L.approxAr}`;
      if(ok){ STATE.mastered.add(L.he); saveProgress(); updateCounters(); setTimeout(()=>renderPractice(mode), 700); }
    };
  } else if(mode==='type-ar'){
    const L = randomItem(LETTERS);
    area.innerHTML = `<div>المقابل/التقريب العربي: <span class="badge">${L.approxAr}</span></div>
      <input id="ans" type="text" placeholder="اكتب الحرف العبري (مثال: ${L.he})">
      <button class="primary" id="check">تحقّق</button>
      <div class="result" id="res"></div>`;
    $('#check').onclick = ()=>{
      const a = $('#ans').value.trim();
      const ok = a === L.he;
      $('#res').textContent = ok ? 'صحيح! 👍' : `ليس صحيحًا. الجواب: ${L.he}`;
      if(ok){ STATE.mastered.add(L.he); saveProgress(); updateCounters(); setTimeout(()=>renderPractice(mode), 700); }
    };
  } else { // match
    // 6 بطاقات (3 عبرية + 3 عربية) – طابقها
    const chosen = Array.from({length:3},()=>randomItem(LETTERS));
    const cards = [];
    chosen.forEach(L=>{
      cards.push({txt:L.he, key:L.he});
      cards.push({txt:L.approxAr.split('/')[0], key:L.he});
    });
    // خلط
    cards.sort(()=>Math.random()-0.5);
    let open = [];
    let solved = new Set();

    const wrap = document.createElement('div');
    wrap.className='drills';
    cards.forEach((c,i)=>{
      const el = document.createElement('div');
      el.className='drill-card';
      el.textContent = c.txt;
      el.onclick = ()=>{
        if(solved.has(i)) return;
        el.style.outline='2px solid #4158f5';
        open.push({i, c, el});
        if(open.length===2){
          const [a,b]=open; open=[];
          if(a.c.key===b.c.key && a.i!==b.i){
            solved.add(a.i); solved.add(b.i);
            a.el.style.opacity=.4; b.el.style.opacity=.4;
            if(solved.size===cards.length){
              wrap.insertAdjacentHTML('afterend','<div class="result">أحسنت! أنهيت المطابقة.</div>');
              chosen.forEach(L=>STATE.mastered.add(L.he)); saveProgress(); updateCounters();
            }
          } else {
            setTimeout(()=>{a.el.style.outline='none'; b.el.style.outline='none';}, 400);
          }
        }
      };
      wrap.appendChild(el);
    });
    area.appendChild(wrap);
  }
}

function initPractice(){
  let current = 'type-he';
  renderPractice(current);
  $$('.mode-btn').forEach(b=>{
    b.addEventListener('click', ()=>{
      $$('.mode-btn').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      current = b.dataset.mode;
      renderPractice(current);
    });
  });
}

// Quiz
function startQuiz(){
  STATE.quiz.active = true;
  STATE.quiz.score = 0;
  STATE.quiz.asked = 0;
  $('#quizArea').innerHTML = '';
  $('#quizResult').textContent='';
  askQuestion();
}

function askQuestion(){
  if(STATE.quiz.asked>=STATE.quiz.total){
    endQuiz();
    return;
  }
  const L = randomItem(LETTERS);
  const types = ['he->ar','ar->he'];
  const t = randomItem(types);
  const area = $('#quizArea');
  area.innerHTML='';

  if(t==='he->ar'){
    area.innerHTML = `<div class="big">${L.he}</div>
      <input id="qans" type="text" placeholder="اكتب التقريب العربي">
      <button class="primary" id="qcheck">تحقّق</button>
      <div class="result" id="qres"></div>`;
    $('#qcheck').onclick = ()=>{
      const v = $('#qans').value.trim();
      const ok = v && L.approxAr.includes(v[0]);
      if(ok) STATE.quiz.score++;
      STATE.quiz.asked++;
      $('#qres').textContent = ok ? 'صحيح' : `خطأ (التلميح: ${L.approxAr})`;
      setTimeout(askQuestion, 600);
    };
  } else {
    area.innerHTML = `<div>تقريب عربي: <span class="badge">${L.approxAr}</span></div>
      <input id="qans" type="text" placeholder="اكتب الحرف العبري">
      <button class="primary" id="qcheck">تحقّق</button>
      <div class="result" id="qres"></div>`;
    $('#qcheck').onclick = ()=>{
      const v = $('#qans').value.trim();
      const ok = v===L.he;
      if(ok) STATE.quiz.score++;
      STATE.quiz.asked++;
      $('#qres').textContent = ok ? 'صحيح' : `خطأ (الصحيح: ${L.he})`;
      setTimeout(askQuestion, 600);
    };
  }
}

function endQuiz(){
  STATE.quiz.active=false;
  const pct = Math.round(100*STATE.quiz.score/STATE.quiz.total);
  $('#quizResult').textContent = `نتيجتك: ${STATE.quiz.score}/${STATE.quiz.total} (${pct}%)`;
}

// Reading drills
function renderDrills(count=6){
  const box = $('#readingDrills');
  box.innerHTML='';
  for(let i=0;i<count;i++){
    const s = randomItem(SYLLABLES);
    const d = document.createElement('div');
    d.className='drill-card';
    d.innerHTML = `<div class="big" style="font-size:36px">${s}</div>
      <div class="note">تقريب صوتي ذاتي: جرّب كتابته بالعربية</div>`;
    box.appendChild(d);
  }
}

function initReading(){
  renderDrills();
  $('#nextDrill').onclick = ()=>renderDrills();
}

// Init
document.addEventListener('DOMContentLoaded', ()=>{
  initTabs();
  initSettings();
  renderLetters();
  updateCounters();
  initPractice();
  $('#startQuiz').onclick = startQuiz;
  initReading();
});
