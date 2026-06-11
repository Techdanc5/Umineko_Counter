/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   slot-counter-pwa / app.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// ━━ CONSTANTS ━━
const ROLES = [
  {id:'a',  n:'一枚役A'},
  {id:'b',  n:'一枚役B'},
  {id:'c',  n:'一枚役C'},
  {id:'bell',   n:'ベル'},
  {id:'cherry', n:'チェリー'},
  {id:'suika',  n:'スイカ'},
];
const GROUPS = [
  {key:'og', label:'黄金郷', heads:[
    {id:'og-w', sub:'白頭', c:'#e8a83a', cs:'#ffc85a'},
    {id:'og-r', sub:'赤頭', c:'#e04545', cs:'#ff7070'},
  ]},
  {key:'wt', label:'Witch', heads:[
    {id:'wt-w', sub:'白頭', c:'#a259e6', cs:'#c490f8'},
    {id:'wt-r', sub:'赤頭', c:'#e04545', cs:'#ff7070'},
  ]},
  {key:'rg', label:'Regular', heads:[
    {id:'rg-w', sub:'白頭', c:'#4a8eee', cs:'#80b4f8'},
    {id:'rg-r', sub:'赤頭', c:'#e04545', cs:'#ff7070'},
  ]},
];
const SUBS = [
  '単独','一枚役A','一枚役B','一枚役C','一枚役不明',
  'ベル','リプレイ','スイカ','チェリー','確定役','リーチ目リプ'
];
const ALLB = GROUPS.flatMap(g => g.heads);

// ━━ STATE ━━
let rc = {}, bc = {}, sc = {}, mode = 'simple', sessions = [], openSess = null;

function initState() {
  ROLES.forEach(r => rc[r.id] = 0);
  ALLB.forEach(b => { bc[b.id] = 0; sc[b.id] = {}; SUBS.forEach(s => sc[b.id][s] = 0); });
}

// ━━ INDEXEDDB ━━
const DB_NAME = 'SlotCounterDB';
const DB_VER  = 1;
const STORE   = 'sessions';

function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess  = e => res(e.target.result);
    req.onerror    = e => rej(e.target.error);
  });
}
async function dbGetAll() {
  const db = await openDB();
  return new Promise((res, rej) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    req.onsuccess = e => res(e.target.result);
    req.onerror   = e => rej(e.target.error);
  });
}
async function dbPut(session) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(session);
    req.onsuccess = e => res(e.target.result);
    req.onerror   = e => rej(e.target.error);
  });
}
async function dbDelete(id) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id);
    req.onsuccess = e => res(e.target.result);
    req.onerror   = e => rej(e.target.error);
  });
}

// ━━ HELPERS ━━
const $  = id => document.getElementById(id);
const prob = (n, g) => (!n || !g) ? '---' : Math.round(g / n).toLocaleString();
const smClass = v  => v > 0 ? 'plus' : v < 0 ? 'minus' : '';
const fmtSM   = v  => (v > 0 ? '+' : '') + v.toLocaleString();

function getPlayed() {
  return Math.max(0, (parseInt($('gcur').value) || 0) - (parseInt($('g-dashi').value) || 0));
}

// ━━ TOAST ━━
let toastTimer;
function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

// ━━ G数更新 ━━
function onG() {
  const p = getPlayed();
  $('g-played-lbl').textContent = p > 0 ? `実: ${p}G` : '';
  $('s-g').textContent = p;
  renderRoles();
  renderBonuses();
  updateSum();
}

// ━━ 差枚計算 ━━
function calcSM() {
  const toshiMai  = parseInt($('sm-toshi-mai').value) || 0;
  const bills     = parseInt($('sm-bills').value) || 0;
  const rate      = parseInt($('sm-rate').value) || 50;
  const kaishu    = parseInt($('sm-kaishu').value) || 0;
  const billsTotal = bills * rate;
  const totalInv   = billsTotal + toshiMai;
  const sashimai   = kaishu - totalInv;

  $('smf-kaishu').textContent      = kaishu.toLocaleString();
  $('smf-bills-eq').textContent    = `${bills}×${rate}`;
  $('smf-bills-total').textContent = `− ${billsTotal.toLocaleString()}`;
  $('smf-toshi').textContent       = `− ${toshiMai.toLocaleString()}`;
  $('smf-total-inv').textContent   = `${totalInv.toLocaleString()} 枚`;

  const rv = $('sm-result-val');
  const rb = $('sm-result-box');
  rv.textContent = fmtSM(sashimai);
  rv.className   = 'sm-r-val ' + smClass(sashimai);
  rb.className   = 'sm-result ' + smClass(sashimai);
}

function getSMValue() {
  const toshiMai = parseInt($('sm-toshi-mai').value) || 0;
  const bills    = parseInt($('sm-bills').value) || 0;
  const rate     = parseInt($('sm-rate').value) || 50;
  const kaishu   = parseInt($('sm-kaishu').value) || 0;
  return { toshiMai, bills, rate, kaishu, sashimai: kaishu - (bills * rate + toshiMai) };
}

// ━━ ROLES ━━
function renderRoles() {
  const g = getPlayed();
  $('rgrid').innerHTML = ROLES.map(r => {
    const c = rc[r.id];
    return `<div class="rc${c > 0 ? ' hit' : ''}" id="rc-${r.id}" onclick="hitRole('${r.id}',event)">
      <button class="rc-rst" onclick="event.stopPropagation();resetRole('${r.id}')">✕</button>
      <div class="rc-name">${r.n}</div>
      <div class="rc-num">${c}</div>
      <div class="rc-prob">${c > 0 ? `1/${prob(c, g)}` : '-'}</div>
    </div>`;
  }).join('');

  ROLES.forEach(r => {
    const el = $(`rc-${r.id}`);
    if (!el) return;
    let timer;
    el.addEventListener('touchstart', () => {
      timer = setTimeout(() => { if (rc[r.id] > 0) { rc[r.id]--; renderRoles(); updateSum(); } }, 600);
    });
    el.addEventListener('touchend',  () => clearTimeout(timer));
    el.addEventListener('touchmove', () => clearTimeout(timer));
    el.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (rc[r.id] > 0) { rc[r.id]--; renderRoles(); updateSum(); }
    });
  });
}

function hitRole(id, e) {
  if (e.target.classList.contains('rc-rst')) return;
  rc[id]++;
  const btn = e.currentTarget;
  const rp  = document.createElement('div');
  rp.className = 'rpl';
  rp.style.cssText = `left:${btn.offsetWidth/2-25}px;top:${btn.offsetHeight/2-25}px`;
  btn.appendChild(rp);
  setTimeout(() => rp.remove(), 420);
  renderRoles();
  updateSum();
}

function resetRole(id) {
  rc[id] = 0;
  renderRoles();
  updateSum();
}

// ━━ BONUSES ━━
function bonTotal(b) {
  return mode === 'detail'
    ? SUBS.reduce((s, k) => s + sc[b.id][k], 0)
    : bc[b.id];
}
function totalBon() {
  return ALLB.reduce((s, b) => s + bonTotal(b), 0);
}

function renderBonuses() {
  $('bonus-wrap').innerHTML = GROUPS.map(g => `
    <div class="bgroup">
      <div class="bgroup-title">${g.label}</div>
      <div class="bcards">
        ${g.heads.map(b => {
          const tot = bonTotal(b);
          if (mode === 'simple') {
            return `<div class="bcard${tot > 0 ? ' hit' : ''}">
              <div class="brow-s">
                <div class="bstripe" style="background:linear-gradient(180deg,${b.cs},${b.c})"></div>
                <div class="binfo">
                  <div class="bname" style="color:${b.c}">${g.label}</div>
                  <div class="bsub-l" style="color:${b.cs}">${b.sub}</div>
                </div>
                <div class="bnum" style="color:${tot > 0 ? b.cs : 'var(--dim)'}">${tot}</div>
                <div class="badd" onclick="hitB('${b.id}')">＋</div>
              </div>
            </div>`;
          }
          return `<div class="bcard${tot > 0 ? ' hit' : ''}">
            <div class="brow-d">
              <div class="brow-dh">
                <div class="bstripe" style="background:linear-gradient(180deg,${b.cs},${b.c});height:40px;"></div>
                <div class="binfo">
                  <div class="bname" style="color:${b.c}">${g.label} <span style="color:${b.cs}">${b.sub}</span></div>
                  <div style="font-size:11px;color:var(--muted);margin-top:2px;">
                    合計 <span style="color:${b.cs};font-weight:800;">${tot}</span> 回
                  </div>
                </div>
              </div>
              <div class="dgrid">
                ${SUBS.map(s => `
                  <div class="dbtn${sc[b.id][s] > 0 ? ' hit' : ''}" onclick="hitSub('${b.id}','${s}')">
                    <span class="dn">${s}</span>
                    <span class="dc">${sc[b.id][s]}</span>
                  </div>`).join('')}
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`).join('');
}

function hitB(id)        { bc[id]++; renderBonuses(); updateSum(); }
function hitSub(bid, s)  { sc[bid][s]++; renderBonuses(); updateSum(); }
function setMode(m) {
  mode = m;
  $('bm-s').classList.toggle('on', m === 'simple');
  $('bm-d').classList.toggle('on', m === 'detail');
  renderBonuses();
}

function updateSum() {
  const g  = getPlayed();
  const bt = totalBon();
  const rt = ROLES.reduce((s, r) => s + rc[r.id], 0);
  $('s-bon').textContent = bt;
  $('s-bp').textContent  = prob(bt, g);
  $('s-rol').textContent = rt;
  $('s-g').textContent   = g;
}

// ━━ NAV ━━
function goPage(p) {
  ['main','hist','set'].forEach(k => {
    $(`pg-${k}`).classList.toggle('on', k === p);
    $(`nav-${k}`).classList.toggle('on', k === p);
  });
  if (p === 'hist') renderHist();
}
function hideOv(id) { $(id).classList.remove('show'); }

// ━━ END SESSION ━━
function showEnd() {
  const g  = getPlayed();
  const bt = totalBon();
  const rt = ROLES.reduce((s, r) => s + rc[r.id], 0);
  let lines = [
    `実プレイG数：${g}G  |  ボーナス：${bt}回 (1/${prob(bt, g)})`,
    `小役合計：${rt}回`, ''
  ];
  GROUPS.forEach(gr => {
    gr.heads.forEach(b => {
      const t = bonTotal(b);
      if (t > 0) lines.push(`${gr.label}${b.sub}：${t}回`);
    });
  });
  $('ov-summary').textContent = lines.join('\n');
  $('sm-toshi-mai').value = 0;
  $('sm-bills').value     = 0;
  $('sm-rate').value      = 50;
  $('sm-kaishu').value    = 0;
  calcSM();
  $('ov-end').classList.add('show');
}

async function saveEnd() {
  const g  = getPlayed();
  const sm = getSMValue();
  const snap = {
    id: Date.now(), past: false,
    date: new Date().toLocaleDateString('ja-JP'),
    played: g,
    dashi: parseInt($('g-dashi').value) || 0,
    cur:   parseInt($('gcur').value)    || 0,
    sashimai: sm.sashimai, toshiMai: sm.toshiMai,
    bills: sm.bills, rate: sm.rate, kaishu: sm.kaishu,
    roles: {}, bonuses: {}, subs: {}
  };
  ROLES.forEach(r => snap.roles[r.id] = rc[r.id]);
  ALLB.forEach(b => {
    snap.bonuses[b.id] = bc[b.id];
    snap.subs[b.id]    = {};
    SUBS.forEach(s => snap.subs[b.id][s] = sc[b.id][s]);
  });

  await dbPut(snap);
  sessions.unshift(snap);

  hideOv('ov-end');
  $('g-dashi').value = 0;
  $('gcur').value    = 0;
  initState();
  onG();
  renderBonuses();
  showToast('保存しました ✓');
}

// ━━ 過去データ登録 ━━
function ptSMColor() {
  const v = parseInt($('pt-sm').value) || 0;
  $('pt-sm').className = 'ef-inp' + (v > 0 ? ' plus-v' : v < 0 ? ' minus-v' : '');
}

function showPastForm() {
  $('pt-date').value = new Date().toISOString().slice(0, 10);
  $('pt-g').value  = 0;
  $('pt-sm').value = 0;
  $('pt-roles-grid').innerHTML = ROLES.map(r =>
    `<div class="be-row"><span class="be-lbl">${r.n}</span>
     <input class="be-inp" type="number" value="0" min="0" id="pt-r-${r.id}"></div>`
  ).join('');
  $('pt-bonus-wrap').innerHTML = GROUPS.map(g => `
    <div style="margin-bottom:10px;">
      <div style="font-size:10px;color:var(--muted);font-weight:800;letter-spacing:.1em;margin-bottom:5px;">${g.label}</div>
      <div class="be-grid" style="margin-bottom:6px;">
        ${g.heads.map(b =>
          `<div class="be-row" style="border-left:3px solid ${b.c};">
            <span class="be-lbl" style="color:${b.cs}">${b.sub}</span>
            <input class="be-inp" type="number" value="0" min="0" id="pt-b-${b.id}">
          </div>`).join('')}
      </div>
      <div style="font-size:10px;color:var(--dim);margin-bottom:4px;">重複内訳（任意）</div>
      ${g.heads.map(b => `
        <div style="margin-bottom:6px;">
          <div style="font-size:10px;color:${b.cs};font-weight:700;margin-bottom:3px;">${b.sub}</div>
          <div class="sub-grid">
            ${SUBS.map(s =>
              `<div class="sub-row">
                <span class="sub-lbl">${s}</span>
                <input class="sub-inp" type="number" value="0" min="0"
                  id="pt-s-${b.id}-${s.replace(/\s/g,'_')}">
              </div>`).join('')}
          </div>
        </div>`).join('')}
    </div>`).join('');
  $('ov-past').classList.add('show');
}

async function savePast() {
  const dv = $('pt-date').value;
  const snap = {
    id: Date.now(), past: true,
    date: dv ? new Date(dv).toLocaleDateString('ja-JP') : new Date().toLocaleDateString('ja-JP'),
    played: parseInt($('pt-g').value) || 0,
    dashi: 0, cur: 0,
    sashimai: parseInt($('pt-sm').value) || 0,
    toshiMai: 0, bills: 0, rate: 50, kaishu: 0,
    roles: {}, bonuses: {}, subs: {}
  };
  ROLES.forEach(r => snap.roles[r.id]  = parseInt($(`pt-r-${r.id}`).value) || 0);
  ALLB.forEach(b => {
    snap.bonuses[b.id] = parseInt($(`pt-b-${b.id}`).value) || 0;
    snap.subs[b.id]    = {};
    SUBS.forEach(s => {
      snap.subs[b.id][s] = parseInt($(`pt-s-${b.id}-${s.replace(/\s/g,'_')}`).value) || 0;
    });
  });

  await dbPut(snap);
  sessions.push(snap);
  sessions.sort((a, b) => b.id - a.id);

  hideOv('ov-past');
  renderHist();
  showToast('過去データを登録しました ✓');
}

// ━━ HISTORY ━━
function renderHist() {
  if (!sessions.length) {
    $('hist-content').innerHTML = '<div class="empty">まだデータがありません。<br>稼働終了して保存すると表示されます。</div>';
    return;
  }
  const totG  = sessions.reduce((s, x) => s + x.played, 0);
  const totSM = sessions.reduce((s, x) => s + (x.sashimai || 0), 0);
  const totB  = sessions.reduce((s, x) => s + ALLB.reduce((a, b) => a + (x.bonuses[b.id] || 0), 0), 0);

  let html = `
  <div class="tot-card">
    <div class="tot-ttl">▶ トータルデータ（${sessions.length}稼働）</div>
    <div class="tot-main">
      <div class="tot-item"><div class="tl">総G数</div><div class="tv">${totG.toLocaleString()}G</div></div>
      <div class="tot-item"><div class="tl">ボーナス確率</div><div class="tv">1/${prob(totB, totG)}</div></div>
      <div class="tot-item"><div class="tl">総ボーナス</div><div class="tv">${totB}回</div></div>
      <div class="tot-item"><div class="tl">総差枚</div><div class="tv ${smClass(totSM)}">${fmtSM(totSM)}</div></div>
      <div class="tot-item"><div class="tl">平均差枚/稼働</div>
        <div class="tv ${smClass(Math.round(totSM/sessions.length))}">${fmtSM(Math.round(totSM/sessions.length))}</div>
      </div>
    </div>
    <div style="padding-top:10px;border-top:1px solid var(--br2);">
      <div style="font-size:10px;color:var(--muted);font-weight:800;letter-spacing:.1em;margin-bottom:8px;">機種別ボーナス</div>
      ${GROUPS.map(g => `
        <div style="margin-bottom:8px;">
          <div style="font-size:10px;color:var(--muted);margin-bottom:4px;">${g.label}</div>
          <div class="tot-bon-grid">
            ${g.heads.map(b => {
              const t = sessions.reduce((s, x) => s + (x.bonuses[b.id] || 0), 0);
              return `<div class="tbi">
                <div class="tbl">${b.sub}</div>
                <div class="tbv" style="color:${b.cs}">${t}回</div>
              </div>`;
            }).join('')}
          </div>
        </div>`).join('')}
    </div>
  </div>
  <div style="padding:4px 12px 8px;font-size:11px;color:var(--muted);letter-spacing:.1em;font-weight:800;">
    稼働別データ（タップで編集）
  </div>
  <div class="sess-list">
    ${sessions.map((s, i) => {
      const bt = ALLB.reduce((a, b) => a + (s.bonuses[b.id] || 0), 0);
      const sm = s.sashimai || 0;
      return `<div class="sess-card${openSess === s.id ? ' open' : ''}" id="sc-${s.id}">
        <div class="sess-head" onclick="togSess(${s.id})">
          <div class="sess-meta">
            <div class="sess-date">${s.date}</div>
            <div class="sess-no">稼働 #${sessions.length - i}${s.past ? '<span class="sess-past-tag">過去</span>' : ''}</div>
          </div>
          <div class="sess-stats">
            <div class="ss-item"><div class="sl">G数</div><div class="sv">${s.played}G</div></div>
            <div class="ss-item"><div class="sl">ボーナス</div><div class="sv">${bt}回</div></div>
            <div class="ss-item"><div class="sl">差枚</div><div class="sv ${smClass(sm)}">${fmtSM(sm)}</div></div>
          </div>
          <span class="sess-chev">›</span>
        </div>
        <div class="sess-body">${renderEF(s)}</div>
      </div>`;
    }).join('')}
  </div>`;

  $('hist-content').innerHTML = html;
}

function renderEF(s) {
  const sm = s.sashimai || 0;
  return `
  <div class="ef-sec">
    <div class="ef-ttl">基本データ</div>
    <div class="ef-grid">
      <div class="ef-row" style="grid-column:span 2">
        <div class="ef-lbl">日付</div>
        <input class="ef-inp date-inp" type="date" id="e-date-${s.id}" value="${toInputDate(s.date)}">
      </div>
      <div class="ef-row">
        <div class="ef-lbl">実プレイG数</div>
        <input class="ef-inp" type="number" value="${s.played}" id="e-g-${s.id}" min="0">
      </div>
      <div class="ef-row">
        <div class="ef-lbl">差枚（自動計算）</div>
        <input class="ef-inp ro${sm > 0 ? ' plus-v' : sm < 0 ? ' minus-v' : ''}"
          type="number" value="${sm}" id="e-sm-${s.id}" readonly>
      </div>
    </div>
  </div>
  <div class="ef-sec">
    <div class="ef-ttl">差枚内訳</div>
    <div class="ef-grid">
      <div class="ef-row"><div class="ef-lbl">投資枚数</div>
        <input class="ef-inp" type="number" value="${s.toshiMai||0}" id="e-tmai-${s.id}" min="0" oninput="recalcEF(${s.id})"></div>
      <div class="ef-row"><div class="ef-lbl">回収枚数</div>
        <input class="ef-inp" type="number" value="${s.kaishu||0}" id="e-kai-${s.id}" min="0" oninput="recalcEF(${s.id})"></div>
      <div class="ef-row"><div class="ef-lbl">投資千円札枚数</div>
        <input class="ef-inp" type="number" value="${s.bills||0}" id="e-bills-${s.id}" min="0" oninput="recalcEF(${s.id})"></div>
      <div class="ef-row"><div class="ef-lbl">千円の貸出枚数</div>
        <input class="ef-inp" type="number" value="${s.rate||50}" id="e-rate-${s.id}" min="1" oninput="recalcEF(${s.id})"></div>
    </div>
  </div>
  <div class="ef-sec">
    <div class="ef-ttl">小役</div>
    <div class="be-grid">
      ${ROLES.map(r =>
        `<div class="be-row"><span class="be-lbl">${r.n}</span>
         <input class="be-inp" type="number" value="${s.roles[r.id]||0}" id="er-${r.id}-${s.id}" min="0"></div>`
      ).join('')}
    </div>
  </div>
  <div class="ef-sec">
    <div class="ef-ttl">ボーナス</div>
    ${GROUPS.map(g => `
      <div style="margin-bottom:10px;">
        <div style="font-size:10px;color:var(--muted);margin-bottom:4px;">${g.label}</div>
        <div class="be-grid" style="margin-bottom:6px;">
          ${g.heads.map(b =>
            `<div class="be-row" style="border-left:3px solid ${b.c};">
              <span class="be-lbl" style="color:${b.cs}">${b.sub}</span>
              <input class="be-inp" type="number" value="${s.bonuses[b.id]||0}" id="eb-${b.id}-${s.id}" min="0">
            </div>`).join('')}
        </div>
        ${g.heads.map(b => `
          <div style="margin-bottom:6px;">
            <div style="font-size:10px;color:${b.cs};font-weight:700;margin-bottom:3px;">${b.sub} 重複内訳</div>
            <div class="sub-grid">
              ${SUBS.map(sub =>
                `<div class="sub-row">
                  <span class="sub-lbl">${sub}</span>
                  <input class="sub-inp" type="number"
                    value="${(s.subs[b.id] && s.subs[b.id][sub]) || 0}"
                    id="es-${b.id}-${sub.replace(/\s/g,'_')}-${s.id}" min="0">
                </div>`).join('')}
            </div>
          </div>`).join('')}
      </div>`).join('')}
  </div>
  <div class="ef-btns">
    <button class="ef-save" onclick="saveEF(${s.id})">変更を保存</button>
    <button class="ef-del" onclick="delSess(${s.id})">削除</button>
  </div>`;
}

function recalcEF(sid) {
  const t = parseInt($(`e-tmai-${sid}`).value) || 0;
  const b = parseInt($(`e-bills-${sid}`).value) || 0;
  const r = parseInt($(`e-rate-${sid}`).value) || 50;
  const k = parseInt($(`e-kai-${sid}`).value) || 0;
  const v = k - (b * r + t);
  const el = $(`e-sm-${sid}`);
  el.value = v;
  el.className = 'ef-inp ro' + (v > 0 ? ' plus-v' : v < 0 ? ' minus-v' : '');
}

async function saveEF(sid) {
  const i = sessions.findIndex(s => s.id === sid);
  if (i < 0) return;
  const s  = sessions[i];
  const dv = $(`e-date-${sid}`).value;
  if (dv) s.date = new Date(dv).toLocaleDateString('ja-JP');
  s.played   = parseInt($(`e-g-${sid}`).value)     || 0;
  s.toshiMai = parseInt($(`e-tmai-${sid}`).value)  || 0;
  s.bills    = parseInt($(`e-bills-${sid}`).value) || 0;
  s.rate     = parseInt($(`e-rate-${sid}`).value)  || 50;
  s.kaishu   = parseInt($(`e-kai-${sid}`).value)   || 0;
  s.sashimai = s.kaishu - (s.bills * s.rate + s.toshiMai);
  ROLES.forEach(r => { s.roles[r.id] = parseInt($(`er-${r.id}-${sid}`).value) || 0; });
  ALLB.forEach(b => {
    s.bonuses[b.id] = parseInt($(`eb-${b.id}-${sid}`).value) || 0;
    SUBS.forEach(sub => {
      s.subs[b.id][sub] = parseInt($(`es-${b.id}-${sub.replace(/\s/g,'_')}-${sid}`).value) || 0;
    });
  });

  await dbPut(s);
  openSess = sid;
  renderHist();
  showToast('保存しました ✓');
}

async function delSess(sid) {
  if (!confirm('この稼働データを削除しますか？')) return;
  await dbDelete(sid);
  sessions = sessions.filter(s => s.id !== sid);
  openSess = null;
  renderHist();
  showToast('削除しました');
}

function togSess(sid) {
  openSess = openSess === sid ? null : sid;
  renderHist();
}

function toInputDate(jp) {
  try {
    const p = jp.replace(/[年月]/g, '-').replace('日', '').trim();
    const d = new Date(p);
    return isNaN(d) ? '' : d.toISOString().slice(0, 10);
  } catch { return ''; }
}

// ━━ INIT ━━
async function init() {
  initState();
  // DBからセッション読み込み
  try {
    sessions = await dbGetAll();
    sessions.sort((a, b) => b.id - a.id);
  } catch (e) {
    console.warn('DB load failed:', e);
    sessions = [];
  }
  renderRoles();
  renderBonuses();
  updateSum();

  // Service Worker 登録
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(e => console.warn('SW:', e));
  }
}

document.addEventListener('DOMContentLoaded', init);
