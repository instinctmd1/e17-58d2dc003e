/* The Elaika Times: Games. Daily Mini crossword, Connections, two Wordles and a themed word search ("Strands").
   Today's set comes from js/daily.js (new every day at midnight IST). Progress, results, times and streaks are
   saved on this device through window.E17Daily. No dependencies. */
(function () {
  'use strict';
  var G = window.GAMES;
  if (!G) return;
  var D = window.E17Daily || null;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = function () { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; };
  var section = $('#games');
  var inView = false;
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { inView = es[es.length - 1].isIntersecting; }, { threshold: 0 }).observe(section);
  else inView = true;

  /* ---------- daily helpers (safe if daily.js is missing) ---------- */
  var get = function (id) { return D ? D.get(id) : null; };
  var progress = function (id, data) { if (D) D.progress(id, data); };
  var finish = function (id, status, extra) { if (D) D.finish(id, status, extra); };
  var fmt = function (ms) { return D ? D.fmt(ms) : ''; };
  var started = {};                                   // id -> true once she has interacted today
  function touch(id) { started[id] = true; }

  /* ---------- masthead: today's date ---------- */
  if (D) {
    var dt = D.date, line = $('.mast__line');
    if (line) {
      var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      line.innerHTML = '<span>' + days[dt.getUTCDay()] + ', ' + dt.getUTCDate() + ' ' + months[dt.getUTCMonth()] + ' ' + dt.getUTCFullYear() + '</span><span>No. ' + D.number + '</span>';
    }
  }

  /* ---------- progress + the "solved everything?" moment ---------- */
  var state = { mini: false, conn: false, wordle: G.wordle.map(function () { return false; }), strands: false };
  var celebrated = false;
  var tabs = $$('.gm-tab');
  var panels = { mini: $('#panel-mini'), conn: $('#panel-conn'), wordle: $('#panel-wordle'), strands: $('#panel-strands') };
  var active = 'mini';
  var toastEl = $('#gmToast'), toastT = 0;

  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2600);
  }
  function finished() {
    return { mini: state.mini, conn: state.conn, wordle: state.wordle.every(Boolean), strands: state.strands };
  }
  function refresh(silent) {
    var f = finished(), n = 0;
    tabs.forEach(function (t) { var d = !!f[t.getAttribute('data-game')]; t.classList.toggle('is-done', d); if (d) n++; });
    $('#gmCount').textContent = n + ' of 4 done';
    renderStats();
    if (n === 4 && !celebrated) {
      celebrated = true;
      var el = $('#gmWin'), s = D ? D.stats() : null;
      if (s) {
        $('.gm-win__head', el).textContent = s.todayStatus === 'correct' ? 'Elaika finishes the whole paper.' : 'Paper done for today.';
        $('.gm-win__sub', el).textContent = s.todayStatus === 'correct' ? 'Every puzzle, no mistakes. ' + streakText(s.streak) : 'Not every one went your way. Back tomorrow. ' + streakText(s.streak);
      }
      el.hidden = false;
      if (silent) return;
      setTimeout(function () {
        el.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
        setTimeout(function () {
          var r = el.getBoundingClientRect();
          if (window.fireConfetti) window.fireConfetti({ x: window.innerWidth / 2, y: Math.max(140, Math.min(window.innerHeight - 120, r.top + r.height / 2)) });
        }, reduced() ? 0 : 450);
      }, 1100);
    }
  }
  function streakText(n) { return n > 0 ? n + '-day streak.' : ''; }

  /* ---------- stats bar + stats panel ---------- */
  var statsBar = document.createElement('div');
  statsBar.className = 'gm-stats';
  statsBar.innerHTML =
    '<div class="gm-stats__row">' +
    '<span class="gm-chip gm-chip--hot"><b data-s="streak">0</b> <span data-l="streak">day streak</span></span>' +
    '<span class="gm-chip"><b data-s="right">0</b> <span data-l="right">days all right</span></span>' +
    '<span class="gm-chip"><b data-s="wrong">0</b> <span data-l="wrong">days with a miss</span></span>' +
    '<span class="gm-chip"><b data-s="time">0:00</b> today</span>' +
    '<button type="button" class="gm-btn gm-btn--quiet gm-stats__open">Stats</button></div>' +
    '<p class="gm-stats__next">New puzzles in <b data-s="next">--:--:--</b></p>';
  var head = $('.gm-head');
  head.parentNode.insertBefore(statsBar, head.nextSibling);

  var modal = document.createElement('div');
  modal.className = 'gm-modal'; modal.hidden = true;
  modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-label', 'Your stats');
  modal.innerHTML = '<div class="gm-modal__card"><button type="button" class="gm-modal__x" aria-label="Close stats">×</button><div class="gm-modal__body"></div></div>';
  document.body.appendChild(modal);
  function closeModal() { modal.hidden = true; document.body.classList.remove('lb-open'); }
  $('.gm-modal__x', modal).addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function (e) { if (!modal.hidden && e.key === 'Escape') closeModal(); });
  $('.gm-stats__open', statsBar).addEventListener('click', function () {
    if (!D) return;
    var s = D.stats(), P = s.per;
    var row = function (name, p) {
      return '<tr><th>' + name + '</th><td>' + p.played + '</td><td>' + (p.played ? Math.round(p.solved / p.played * 100) : 0) + '%</td><td>' + p.cur + '</td><td>' + p.best + '</td><td>' + (p.bestTime ? fmt(p.bestTime) : '–') + '</td><td>' + (p.avgTime ? fmt(p.avgTime) : '–') + '</td></tr>';
    };
    $('.gm-modal__body', modal).innerHTML =
      '<p class="tag">your stats</p><h3 class="gm-modal__h">The Elaika Times</h3>' +
      '<div class="gm-big">' +
      '<div><b>' + s.streak + '</b><span>current streak</span></div>' +
      '<div><b>' + s.bestStreak + '</b><span>best streak</span></div>' +
      '<div><b>' + s.daysCorrect + '</b><span>days all right</span></div>' +
      '<div><b>' + s.daysWrong + '</b><span>days with a miss</span></div>' +
      '<div><b>' + fmt(s.todayTime) + '</b><span>time today</span></div>' +
      '<div><b>' + (s.bestDay ? fmt(s.bestDay) : '–') + '</b><span>fastest full paper</span></div></div>' +
      '<div class="gm-tablewrap"><table class="gm-table"><thead><tr><th></th><th>played</th><th>win</th><th>streak</th><th>best</th><th>fastest</th><th>average</th></tr></thead><tbody>' +
      row('The Mini', P.mini) + row('Connections', P.conn) + row('Wordle: about you', P.wordle0) + row('Wordle: wildcard', P.wordle1) + row('Strands', P.strands) +
      '</tbody></table></div><p class="gm-modal__note">A streak counts days you finished the whole paper. Reveals and lost games count as a miss. Saved on this phone.</p>';
    modal.hidden = false; document.body.classList.add('lb-open');
    $('.gm-modal__x', modal).focus();
  });
  function renderStats() {
    if (!D) { statsBar.hidden = true; return; }
    var s = D.stats();
    $('[data-s="streak"]', statsBar).textContent = s.streak;
    $('[data-s="right"]', statsBar).textContent = s.daysCorrect;
    $('[data-s="wrong"]', statsBar).textContent = s.daysWrong;
    $('[data-l="right"]', statsBar).textContent = s.daysCorrect === 1 ? 'day all right' : 'days all right';
    $('[data-l="wrong"]', statsBar).textContent = s.daysWrong === 1 ? 'day with a miss' : 'days with a miss';
    $('[data-s="time"]', statsBar).textContent = fmt(s.todayTime);
  }
  function renderNext() {
    if (!D) return;
    var left = Math.max(0, D.nextReset() - Date.now()), s = Math.floor(left / 1000);
    $('[data-s="next"]', statsBar).textContent = String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s % 3600 / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    if (left === 0 && !D.forced) setTimeout(function () { location.reload(); }, 1500);
  }

  /* ---------- timers: only count while she's actually playing that game ---------- */
  function activeId() {
    if (active === 'wordle') return 'wordle' + (games.wordle ? games.wordle.idx() : 0);
    return active;
  }
  setInterval(function () {
    renderNext();
    if (!D || document.hidden || !inView) return;
    var id = activeId();
    if (!started[id]) return;
    var r = D.get(id);
    if (r && r.status !== 'open') return;
    D.tick(id, 1000);
    var t = $('#panel-' + active + ' .gm-time');
    if (t) t.textContent = fmt(D.get(id).ms);
    renderStats();
  }, 1000);
  function timeLabel(id) { var r = get(id); return r ? fmt(r.ms || 0) : '0:00'; }

  /* ---------- tabs ---------- */
  function setTab(name, focus) {
    active = name;
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-game') === name;
      t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    Object.keys(panels).forEach(function (k) { panels[k].hidden = k !== name; });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { setTab(t.getAttribute('data-game')); });
    t.addEventListener('keydown', function (e) {
      var to = -1;
      if (e.key === 'ArrowRight') to = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') to = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') to = 0; else if (e.key === 'End') to = tabs.length - 1;
      if (to >= 0) { e.preventDefault(); setTab(tabs[to].getAttribute('data-game'), true); }
    });
  });

  /* ---------- shared on-screen keyboard ---------- */
  var ICON_BACK = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 5.5h11a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5h-11L3 12z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/></svg>';
  var ICON_TOGGLE = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h14M14 5l4 4-4 4M20 15H6M10 11l-4 4 4 4"/></svg>';
  var RANK = { absent: 1, present: 2, correct: 3 };
  function Keyboard(extra) {
    var el = document.createElement('div');
    el.className = 'kb'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', 'On-screen keyboard');
    var btns = {}, api = { el: el, onKey: function () {} };
    function mk(k, html, label, cls) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'kb__k' + (cls ? ' ' + cls : ''); b.setAttribute('data-k', k); b.innerHTML = html;
      if (label) b.setAttribute('aria-label', label);
      return b;
    }
    ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].forEach(function (r, ri) {
      var row = document.createElement('div'); row.className = 'kb__row';
      if (ri === 2) row.appendChild(extra === 'toggle' ? mk('Toggle', ICON_TOGGLE, 'Switch between across and down', 'kb__k--wide') : mk('Enter', 'Enter', 'Enter', 'kb__k--wide kb__k--txt'));
      r.split('').forEach(function (ch) { var b = mk(ch, ch, ch); btns[ch] = b; row.appendChild(b); });
      if (ri === 2) row.appendChild(mk('Back', ICON_BACK, 'Delete', 'kb__k--wide'));
      el.appendChild(row);
    });
    el.addEventListener('click', function (e) { var b = e.target.closest('.kb__k'); if (b) api.onKey(b.getAttribute('data-k')); });
    api.mark = function (ch, st) {
      var b = btns[ch]; if (!b) return;
      var cur = +b.getAttribute('data-r') || 0;
      if (RANK[st] > cur) {
        b.setAttribute('data-r', RANK[st]);
        b.className = b.className.replace(/ is-(correct|present|absent)/, '') + ' is-' + st;
        b.setAttribute('aria-label', ch + ', ' + st);
      }
    };
    api.reset = function () {
      Object.keys(btns).forEach(function (ch) { var b = btns[ch]; b.removeAttribute('data-r'); b.className = b.className.replace(/ is-(correct|present|absent)/, ''); b.setAttribute('aria-label', ch); });
    };
    return api;
  }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function intro(title, text, id) {
    return '<div class="gm-intro"><h3 class="gm-h">' + title + '</h3><p class="gm-p">' + text + '</p>' +
      (D ? '<p class="gm-time-row"><span class="gm-time-ic" aria-hidden="true">⏱</span> <span class="gm-time">' + timeLabel(id) + '</span></p>' : '') + '</div>';
  }
  function resultLine(host, id, okText, badText) {
    var r = get(id), box = $('.gm-result', host);
    if (!r || r.status === 'open') { if (box) box.hidden = true; return; }
    if (!box) { box = el('p', 'gm-result'); $('.gm-intro', host).appendChild(box); }
    box.hidden = false;
    box.className = 'gm-result ' + (r.status === 'solved' ? 'is-ok' : 'is-no');
    box.textContent = (r.status === 'solved' ? okText : badText) + ' · ' + fmt(r.ms || 0) + ' · new one tomorrow';
  }

  /* =========================================================
     THE MINI (crossword)
     ========================================================= */
  function Mini(host) {
    var ID = 'mini';
    var X = G.crossword, R = X.rows, C = X.cols;
    var cells = {}, entries = [], numMap = {};
    var K = function (r, c) { return r + ',' + c; };
    X.numbers.forEach(function (n) { numMap[K(n.row, n.col)] = n.num; });
    ['across', 'down'].forEach(function (kind) {
      X[kind].forEach(function (e) {
        var dir = kind === 'across' ? 'A' : 'D', en = { dir: dir, num: e.num, answer: e.answer, clue: e.clue, keys: [] };
        for (var i = 0; i < e.len; i++) en.keys.push(K(e.row + (dir === 'D' ? i : 0), e.col + (dir === 'A' ? i : 0)));
        entries.push(en);
      });
    });
    for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) if (X.grid[r][c]) cells[K(r, c)] = { r: r, c: c, ans: X.grid[r][c], val: '', A: null, D: null, bad: false, rev: false };
    entries.forEach(function (en) { en.keys.forEach(function (k) { cells[k][en.dir] = en; }); });
    var seq = entries.filter(function (e) { return e.dir === 'A'; }).concat(entries.filter(function (e) { return e.dir === 'D'; }));

    host.innerHTML =
      intro('The Mini', 'A new crossword every day: some clues about you, some not. Tap a square and type; tap it again to switch direction.', ID) +
      '<div class="gm-tools"><button type="button" class="gm-btn" data-a="check">Check</button><button type="button" class="gm-btn" data-a="word">Reveal word</button><button type="button" class="gm-btn gm-btn--quiet" data-a="all">Reveal all</button></div>' +
      '<p class="gm-msg" role="status" aria-live="polite"></p>' +
      '<div class="xw-wrap"><div class="xw"><div class="xw__grid" tabindex="0" role="application" aria-label="Crossword grid. Type letters to fill the highlighted word. Arrow keys move between squares."></div></div></div>' +
      '<div class="xw-lists"><div><h4 class="gm-h4">Across</h4><ol class="xw-list" data-d="A"></ol></div><div><h4 class="gm-h4">Down</h4><ol class="xw-list" data-d="D"></ol></div></div>' +
      '<div class="dock"><div class="xw__bar"><button type="button" class="xw__nav" data-a="prev" aria-label="Previous clue"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><button type="button" class="xw__clue" data-a="dir"><b class="xw__cn"></b><span class="xw__ct"></span></button><button type="button" class="xw__nav" data-a="next" aria-label="Next clue"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button></div><div class="kbhost"></div></div>';

    var grid = $('.xw__grid', host), msgEl = $('.gm-msg', host), cn = $('.xw__cn', host), ct = $('.xw__ct', host);
    grid.style.gridTemplateColumns = 'repeat(' + C + ', 1fr)';
    var kb = Keyboard('toggle'); $('.kbhost', host).appendChild(kb.el);

    for (r = 0; r < R; r++) for (c = 0; c < C; c++) {
      var k = K(r, c), cell = cells[k], d = document.createElement('div');
      if (!cell) { d.className = 'xw__v'; grid.appendChild(d); continue; }
      d.className = 'xw__c'; d.setAttribute('data-k', k);
      d.innerHTML = (numMap[k] ? '<i class="xw__num">' + numMap[k] + '</i>' : '') + '<span class="xw__l"></span>';
      cell.el = d; cell.l = d.lastChild; grid.appendChild(d);
    }
    var listBtns = [];
    entries.forEach(function (en) {
      var li = el('li'), b = el('button', 'xw__cl', '<b>' + en.num + '</b><span></span>');
      b.type = 'button'; b.lastChild.textContent = en.clue;
      b.addEventListener('click', function () { setEntry(en); grid.focus({ preventScroll: true }); });
      li.appendChild(b); $('.xw-list[data-d="' + en.dir + '"]', host).appendChild(li); en.btn = b; listBtns.push(b);
    });

    var sel = seq[0].keys[0], dir = 'A', solved = false, wasFilled = false, armed = 0, done = false;
    function curEntry() { return cells[sel][dir] || cells[sel][dir === 'A' ? 'D' : 'A']; }
    function say(m) { msgEl.textContent = m; }
    function paint() {
      var en = curEntry(); dir = en.dir;
      var inSet = {}; en.keys.forEach(function (k) { inSet[k] = true; });
      Object.keys(cells).forEach(function (k) {
        var c = cells[k], cl = c.el.classList;
        cl.toggle('is-word', !!inSet[k]); cl.toggle('is-sel', k === sel); cl.toggle('is-bad', c.bad); cl.toggle('is-rev', c.rev);
        if (c.l.textContent !== c.val) c.l.textContent = c.val;
      });
      cn.textContent = en.num + ' ' + (en.dir === 'A' ? 'Across' : 'Down');
      ct.textContent = en.clue;
      listBtns.forEach(function (b) { b.classList.toggle('is-on', b === en.btn); });
    }
    function persist() {
      var vals = {}, rev = {};
      Object.keys(cells).forEach(function (k) { if (cells[k].val) vals[k] = cells[k].val; if (cells[k].rev) rev[k] = 1; });
      progress(ID, { vals: vals, rev: rev });
    }
    function setEntry(en) {
      var firstEmpty = en.keys.filter(function (k) { return !cells[k].val; })[0];
      sel = firstEmpty || en.keys[0]; dir = en.dir; paint();
    }
    function select(k, tap) {
      if (k === sel && tap) { var o = dir === 'A' ? 'D' : 'A'; if (cells[k][o]) dir = o; }
      else { sel = k; if (!cells[k][dir]) dir = dir === 'A' ? 'D' : 'A'; }
      paint();
    }
    function goClue(delta) { var i = seq.indexOf(curEntry()); setEntry(seq[(i + delta + seq.length) % seq.length]); }
    function filled() { return Object.keys(cells).every(function (k) { return cells[k].val; }); }
    function correct() { return Object.keys(cells).every(function (k) { return cells[k].val === cells[k].ans; }); }
    function anyRev() { return Object.keys(cells).some(function (k) { return cells[k].rev; }); }
    function lock(silent) {
      done = true; solved = true; state.mini = true; grid.classList.add('is-solved'); $$('[data-a="check"],[data-a="word"],[data-a="all"]', host).forEach(function (b) { b.disabled = true; });
      resultLine(host, ID, 'Solved', 'Revealed');
      refresh(silent);
    }
    function afterChange() {
      persist();
      var f = filled();
      if (f && correct()) {
        if (!solved) { finish(ID, anyRev() ? 'revealed' : 'solved'); say(anyRev() ? 'Done, with a little help.' : 'Solved. Every square is right.'); toast('The Mini: ' + (anyRev() ? 'done' : 'solved')); lock(); }
      } else if (f && !wasFilled) { say('Every square is filled, but a few letters are off. Try Check.'); }
      wasFilled = f;
    }
    function type(ch) {
      if (done) return; touch(ID);
      var c = cells[sel]; c.val = ch; c.bad = false; c.rev = false;
      var en = curEntry(), i = en.keys.indexOf(sel);
      if (i < en.keys.length - 1) sel = en.keys[i + 1];
      paint(); afterChange();
    }
    function back() {
      if (done) return; touch(ID);
      var c = cells[sel];
      if (c.val) { c.val = ''; c.bad = false; c.rev = false; }
      else { var en = curEntry(), i = en.keys.indexOf(sel); if (i > 0) { sel = en.keys[i - 1]; var p = cells[sel]; p.val = ''; p.bad = false; p.rev = false; } }
      paint(); wasFilled = filled(); persist();
    }
    function step(dr, dc) {
      var c = cells[sel], r = c.r + dr, cc = c.c + dc;
      while (r >= 0 && r < R && cc >= 0 && cc < C) { if (cells[K(r, cc)]) { sel = K(r, cc); if (dr) dir = 'D'; else dir = 'A'; paint(); return; } r += dr; cc += dc; }
    }
    function check() {
      touch(ID);
      var bad = 0, any = 0;
      Object.keys(cells).forEach(function (k) { var c = cells[k]; if (c.val) { any++; c.bad = c.val !== c.ans; if (c.bad) bad++; } else c.bad = false; });
      paint();
      say(!any ? 'Nothing to check yet.' : bad ? bad + (bad === 1 ? ' square is' : ' squares are') + ' off. They have a slash through them.' : 'So far, every letter is right.');
    }
    function revealWord() { touch(ID); curEntry().keys.forEach(function (k) { var c = cells[k]; if (c.val !== c.ans) c.rev = true; c.val = c.ans; c.bad = false; }); paint(); say('Word revealed.'); afterChange(); }
    function revealAll() {
      touch(ID);
      Object.keys(cells).forEach(function (k) { var c = cells[k]; if (c.val !== c.ans) c.rev = true; c.val = c.ans; c.bad = false; });
      paint(); persist(); say('Every square revealed.');
      if (!solved) { finish(ID, 'revealed'); lock(); }
    }
    host.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
      var a = b.getAttribute('data-a');
      if (a === 'check') check();
      else if (a === 'word') revealWord();
      else if (a === 'all') {
        if (!armed) { armed = 1; b.textContent = 'Sure? Reveal all'; b.classList.add('is-armed'); setTimeout(function () { armed = 0; b.textContent = 'Reveal all'; b.classList.remove('is-armed'); }, 3000); }
        else { armed = 0; b.textContent = 'Reveal all'; b.classList.remove('is-armed'); revealAll(); }
      }
      else if (a === 'prev') goClue(-1);
      else if (a === 'next') goClue(1);
      else if (a === 'dir') select(sel, true);
    });
    grid.addEventListener('click', function (e) {
      var d = e.target.closest('.xw__c'); if (!d) return;
      select(d.getAttribute('data-k'), true); grid.focus({ preventScroll: true });
    });
    kb.onKey = function (k) { if (k === 'Back') back(); else if (k === 'Toggle') select(sel, true); else type(k); };

    // restore today's progress
    var saved = get(ID);
    if (saved && saved.data) {
      Object.keys(saved.data.vals || {}).forEach(function (k) { if (cells[k]) cells[k].val = saved.data.vals[k]; });
      Object.keys(saved.data.rev || {}).forEach(function (k) { if (cells[k]) cells[k].rev = true; });
      wasFilled = filled();
    }
    if (saved && saved.status !== 'open') {
      Object.keys(cells).forEach(function (k) { cells[k].val = cells[k].ans; });
      paint(); lock(true);
    } else paint();
    return {
      key: function (e) {
        if (/^[a-zA-Z]$/.test(e.key)) { type(e.key.toUpperCase()); return true; }
        if (e.key === 'Backspace') { back(); return true; }
        if (document.activeElement === grid) {
          if (e.key === 'ArrowRight') { step(0, 1); return true; } if (e.key === 'ArrowLeft') { step(0, -1); return true; }
          if (e.key === 'ArrowDown') { step(1, 0); return true; } if (e.key === 'ArrowUp') { step(-1, 0); return true; }
          if (e.key === ' ' || e.key === 'Enter') { select(sel, true); return true; }
        }
        return false;
      }
    };
  }

  /* =========================================================
     CONNECTIONS
     ========================================================= */
  function Connections(host) {
    var ID = 'conn';
    var groups = G.connections.slice().sort(function (a, b) { return a.level - b.level; });
    var tiles, solved, selected, mistakes, over, guessed, busy;

    host.innerHTML =
      intro('Connections', 'Make four groups of four. One group is always about you. The purple one is the sneakiest. Four mistakes and the paper wins.', ID) +
      '<div class="cn__solved" aria-live="polite"></div><div class="cn__grid"></div>' +
      '<p class="gm-msg" role="status" aria-live="polite"></p>' +
      '<p class="cn__mist"><span>Mistakes remaining</span><span class="cn__dots" aria-hidden="true"></span><span class="sr-only cn__mist-sr"></span></p>' +
      '<div class="gm-tools gm-tools--c"><button type="button" class="gm-btn" data-a="shuffle">Shuffle</button><button type="button" class="gm-btn" data-a="clear">Deselect all</button><button type="button" class="gm-btn gm-btn--go" data-a="submit">Submit</button></div>';
    var solvedEl = $('.cn__solved', host), gridEl = $('.cn__grid', host), msgEl = $('.gm-msg', host), dots = $('.cn__dots', host), mistSr = $('.cn__mist-sr', host);
    var submit = $('[data-a="submit"]', host), clear = $('[data-a="clear"]', host), shuf = $('[data-a="shuffle"]', host);

    function reset() {
      tiles = []; groups.forEach(function (g, gi) { g.words.forEach(function (w) { tiles.push({ id: tiles.length, w: w, g: gi }); }); });
      tiles = shuffle(tiles); solved = []; selected = []; mistakes = 0; over = false; guessed = {}; busy = false;
      msgEl.textContent = '';
    }
    function persist() { progress(ID, { solved: solved, mistakes: mistakes, guessed: guessed }); }
    function say(m) { msgEl.textContent = m; }
    function render() {
      solvedEl.innerHTML = '';
      solved.forEach(function (gi) {
        var g = groups[gi], d = el('div', 'cn__grp' + (g.fresh ? ' is-new' : ''));
        d.style.background = g.color; d.innerHTML = '<b></b><span></span>';
        d.firstChild.textContent = g.title; d.lastChild.textContent = g.words.join(', ');
        g.fresh = false; solvedEl.appendChild(d);
      });
      gridEl.innerHTML = '';
      var left = tiles.filter(function (t) { return solved.indexOf(t.g) < 0; });
      left.forEach(function (t) {
        var b = el('button', 'cn__tile' + (selected.indexOf(t.id) >= 0 ? ' is-on' : '')); b.type = 'button';
        b.setAttribute('aria-pressed', selected.indexOf(t.id) >= 0 ? 'true' : 'false'); b.setAttribute('data-id', t.id); b.textContent = t.w;
        if (t.w.length > 9) b.classList.add('is-long');
        gridEl.appendChild(b);
      });
      gridEl.style.display = left.length ? '' : 'none';
      renderStatus();
    }
    function renderStatus() {
      dots.innerHTML = ''; for (var i = 0; i < 4; i++) dots.appendChild(el('i', i < 4 - mistakes ? 'on' : ''));
      mistSr.textContent = (4 - mistakes) + ' of 4 mistakes remaining';
      submit.disabled = selected.length !== 4 || over || busy;
      clear.disabled = !selected.length || over || busy;
      shuf.disabled = over || busy || solved.length >= 4;
    }
    gridEl.addEventListener('click', function (e) {
      var b = e.target.closest('.cn__tile'); if (!b || over || busy) return;
      touch(ID);
      var id = +b.getAttribute('data-id'), i = selected.indexOf(id);
      if (i >= 0) selected.splice(i, 1); else if (selected.length < 4) selected.push(id);
      msgEl.textContent = ''; render();
      var nb = gridEl.querySelector('[data-id="' + id + '"]'); if (nb) nb.focus();
    });
    function done(status) { over = true; state.conn = true; resultLine(host, ID, mistakes ? 'Solved with ' + mistakes + (mistakes === 1 ? ' mistake' : ' mistakes') : 'Perfect, no mistakes', 'Out of mistakes'); refresh(); }
    function win() { finish(ID, 'solved', { mistakes: mistakes }); say(mistakes ? 'Solved.' : 'Perfect. No mistakes.'); toast('Connections: solved'); done(); }
    function lose() {
      over = true; finish(ID, 'failed', { mistakes: mistakes }); say('Out of mistakes. Here are the groups.'); render();
      var rest = groups.map(function (g, gi) { return gi; }).filter(function (gi) { return solved.indexOf(gi) < 0; });
      rest.forEach(function (gi, n) { setTimeout(function () { groups[gi].fresh = true; solved.push(gi); selected = []; render(); persist(); if (n === rest.length - 1) done('failed'); }, reduced() ? 0 : 700 * (n + 1)); });
    }
    function doSubmit() {
      if (selected.length !== 4 || over || busy) return;
      touch(ID);
      var key = selected.map(function (id) { return tiles[tileIdx(id)].w; }).sort().join('|');
      if (guessed[key]) { say('You already tried that group.'); return; }
      var counts = [0, 0, 0, 0]; selected.forEach(function (id) { counts[tiles[tileIdx(id)].g]++; });
      var top = Math.max.apply(null, counts), gi = counts.indexOf(top);
      if (top === 4) {
        busy = true; $$('.cn__tile.is-on', gridEl).forEach(function (b) { b.classList.add('is-ok'); });
        setTimeout(function () {
          groups[gi].fresh = true; solved.push(gi); selected = []; busy = false; render(); say(''); persist();
          if (solved.length === 4) win();
        }, reduced() ? 0 : 520);
      } else {
        guessed[key] = true; mistakes++; busy = true; persist();
        $$('.cn__tile.is-on', gridEl).forEach(function (b) { b.classList.add('is-no'); });
        say(top === 3 ? 'One away.' : 'Not a group.');
        renderStatus();
        setTimeout(function () { busy = false; selected = []; if (mistakes >= 4) lose(); else render(); }, reduced() ? 0 : 620);
      }
    }
    function tileIdx(id) { for (var i = 0; i < tiles.length; i++) if (tiles[i].id === id) return i; return -1; }
    host.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
      var a = b.getAttribute('data-a');
      if (a === 'submit') doSubmit();
      else if (a === 'clear') { selected = []; render(); }
      else if (a === 'shuffle') { tiles = shuffle(tiles); render(); }
    });
    reset();
    var saved = get(ID);
    if (saved && saved.data) { solved = (saved.data.solved || []).slice(); mistakes = saved.data.mistakes || 0; guessed = saved.data.guessed || {}; }
    if (saved && saved.status !== 'open') { solved = groups.map(function (g, i) { return i; }); over = true; state.conn = true; render(); resultLine(host, ID, saved.status === 'solved' ? (mistakes ? 'Solved with ' + mistakes + (mistakes === 1 ? ' mistake' : ' mistakes') : 'Perfect, no mistakes') : '', 'Out of mistakes'); }
    else render();
    return { key: function () { return false; } };
  }

  /* =========================================================
     WORDLE (one about her, one wildcard)
     ========================================================= */
  var DICT = null;
  function isWord(w) {
    if (!DICT) {
      DICT = {};
      var s = window.E17WORDS || '';
      for (var i = 0; i + 5 <= s.length; i += 5) DICT[s.substr(i, 5)] = 1;
      G.wordle.forEach(function (p) { DICT[p.answer.toUpperCase()] = 1; });
    }
    return !window.E17WORDS || !!DICT[w];
  }
  function Wordle(host) {
    var P = G.wordle.map(function (w, i) {
      var id = 'wordle' + i, saved = get(id);
      var p = { id: id, a: w.answer.toUpperCase(), hint: w.hint, label: w.label || ('Puzzle ' + (i + 1)), guesses: [], cur: '', status: 'play', hinted: false };
      if (saved && saved.data && saved.data.guesses) p.guesses = saved.data.guesses.map(function (g) { return { g: g, s: score(g, p.a) }; });
      if (saved && saved.data && saved.data.hinted) p.hinted = true;
      if (p.guesses.some(function (g) { return g.g === p.a; })) p.status = 'won'; else if (p.guesses.length >= 6) p.status = 'lost';
      if (p.status !== 'play') state.wordle[i] = true;
      return p;
    });
    var idx = 0, locked = false, timers = [];

    host.innerHTML =
      intro('Wordle', 'Two words a day: one about you, one wildcard. Six tries each, real words only.', 'wordle0') +
      '<div class="wd__pills" role="group" aria-label="Choose a puzzle"></div>' +
      '<p class="wd__hint"><button type="button" class="gm-btn gm-btn--quiet" data-a="hint">Need a hint?</button></p><div class="wd__board" role="group" aria-label="Guesses"></div>' +
      '<p class="gm-msg" role="status" aria-live="polite"></p><div class="gm-tools gm-tools--c" data-next hidden><button type="button" class="gm-btn gm-btn--go" data-a="next">Next word</button></div>' +
      '<div class="kbhost"></div>';
    var pills = $('.wd__pills', host), hintEl = $('.wd__hint', host), board = $('.wd__board', host), msgEl = $('.gm-msg', host), nextBox = $('[data-next]', host);
    var kb = Keyboard('enter'); $('.kbhost', host).appendChild(kb.el);
    var pillEls = P.map(function (p, i) {
      var b = el('button', 'wd__pill', '<span></span><i aria-hidden="true"></i>'); b.type = 'button';
      b.firstChild.textContent = p.label;
      b.addEventListener('click', function () { show(i); }); pills.appendChild(b); return b;
    });
    var rows = [];
    for (var r = 0; r < 6; r++) {
      var row = el('div', 'wd__row'); row.setAttribute('role', 'group'); var ts = [];
      for (var c = 0; c < 5; c++) { var t = el('div', 'wd__t'); row.appendChild(t); ts.push(t); }
      board.appendChild(row); rows.push({ el: row, t: ts });
    }
    function say(m) { msgEl.textContent = m; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }
    function score(g, a) {
      var res = ['absent', 'absent', 'absent', 'absent', 'absent'], pool = {}, i;
      for (i = 0; i < 5; i++) { if (g[i] === a[i]) res[i] = 'correct'; else pool[a[i]] = (pool[a[i]] || 0) + 1; }
      for (i = 0; i < 5; i++) if (res[i] !== 'correct' && pool[g[i]] > 0) { res[i] = 'present'; pool[g[i]]--; }
      return res;
    }
    function paintTile(t, ch, st) {
      t.textContent = ch || ''; t.className = 'wd__t' + (ch ? ' has' : '') + (st ? ' is-' + st : '');
      t.style.animation = ''; t.style.setProperty('--d', '0s');
      if (ch) t.setAttribute('aria-label', ch + (st ? ', ' + st : '')); else t.removeAttribute('aria-label');
    }
    function paintAll() {
      var p = P[idx];
      for (var r = 0; r < 6; r++) {
        for (var c = 0; c < 5; c++) {
          if (r < p.guesses.length) paintTile(rows[r].t[c], p.guesses[r].g[c], p.guesses[r].s[c]);
          else if (r === p.guesses.length && p.status === 'play') paintTile(rows[r].t[c], p.cur[c] || '', '');
          else paintTile(rows[r].t[c], '', '');
        }
        rows[r].el.classList.remove('is-shake');
      }
      kb.reset();
      p.guesses.forEach(function (g) { for (var i = 0; i < 5; i++) kb.mark(g.g[i], g.s[i]); });
    }
    function showHint() {
      var p = P[idx];
      hintEl.innerHTML = p.hinted ? '<span>Hint</span> ' : '<button type="button" class="gm-btn gm-btn--quiet" data-a="hint">Need a hint?</button>';
      if (p.hinted) hintEl.appendChild(document.createTextNode(p.hint));
    }
    function show(i) {
      idx = i; clearTimers(); locked = false;
      pillEls.forEach(function (b, n) { b.classList.toggle('is-on', n === i); b.setAttribute('aria-pressed', n === i ? 'true' : 'false'); b.classList.toggle('is-done', P[n].status !== 'play'); });
      showHint(); paintAll();
      var p = P[i];
      var tm = $('.gm-time', host); if (tm) tm.textContent = timeLabel(p.id);
      if (p.status === 'won') say('Got it in ' + p.guesses.length + '. New word tomorrow.'); else if (p.status === 'lost') say('The word was ' + p.a + '. New word tomorrow.'); else say('');
      nextBox.hidden = !(p.status !== 'play' && i < P.length - 1);
    }
    function persist(p) { progress(p.id, { guesses: p.guesses.map(function (g) { return g.g; }), hinted: p.hinted }); }
    function type(ch) {
      var p = P[idx]; if (p.status !== 'play' || locked || p.cur.length >= 5) return;
      touch(p.id);
      p.cur += ch; var t = rows[p.guesses.length].t[p.cur.length - 1]; paintTile(t, ch, ''); t.classList.add('pop'); say('');
    }
    function back() {
      var p = P[idx]; if (p.status !== 'play' || locked || !p.cur.length) return;
      p.cur = p.cur.slice(0, -1); paintTile(rows[p.guesses.length].t[p.cur.length], '', ''); say('');
    }
    function shake(rw, m) { rw.el.classList.remove('is-shake'); void rw.el.offsetWidth; rw.el.classList.add('is-shake'); say(m); }
    function enter() {
      var p = P[idx]; if (p.status !== 'play' || locked) return;
      var rw = rows[p.guesses.length];
      if (p.cur.length < 5) { shake(rw, 'Not enough letters.'); return; }
      if (!isWord(p.cur)) { shake(rw, 'Not in the word list.'); return; }
      touch(p.id);
      var g = p.cur, s = score(g, p.a), instant = reduced(), mine = idx;
      p.guesses.push({ g: g, s: s }); p.cur = ''; persist(p);
      var n = p.guesses.length, won = g === p.a, lost = !won && n >= 6;
      p.status = won ? 'won' : lost ? 'lost' : 'play';
      if (p.status !== 'play') { state.wordle[mine] = true; finish(p.id, won ? 'solved' : 'failed', { tries: n, hinted: p.hinted }); }
      locked = true;
      rw.t.forEach(function (t, i) {
        if (instant) { paintTile(t, g[i], s[i]); return; }
        t.style.setProperty('--d', (i * .28) + 's'); t.style.animation = 'wdflip .56s ease-in-out ' + (i * .28) + 's both';
        timers.push(setTimeout(function () { t.className = 'wd__t has is-' + s[i]; t.setAttribute('aria-label', g[i] + ', ' + s[i]); }, i * 280 + 280));
      });
      timers.push(setTimeout(function () {
        for (var i = 0; i < 5; i++) kb.mark(g[i], s[i]);
        locked = false;
        if (p.status === 'won') { say('Got it in ' + n + '.'); if (!instant) rw.t.forEach(function (t, i) { t.style.animation = 'wdhop .5s ease ' + (i * .08) + 's'; }); }
        else if (p.status === 'lost') say('The word was ' + p.a + '.');
        if (p.status !== 'play') { pillEls[mine].classList.add('is-done'); nextBox.hidden = mine >= P.length - 1; toast(p.label + ': ' + (won ? 'solved' : 'finished')); refresh(); }
      }, instant ? 0 : 4 * 280 + 620));
    }
    kb.onKey = function (k) { if (k === 'Enter') enter(); else if (k === 'Back') back(); else type(k); };
    host.addEventListener('click', function (e) {
      if (e.target.closest('[data-a="hint"]')) { var p = P[idx]; p.hinted = true; touch(p.id); persist(p); showHint(); return; }
      var b = e.target.closest('[data-a="next"]'); if (b) { board.setAttribute('tabindex', '-1'); board.focus({ preventScroll: true }); show(idx + 1); }
    });
    var firstOpen = 0; for (var q = 0; q < P.length; q++) { if (P[q].status === 'play') { firstOpen = q; break; } }
    show(firstOpen);
    return {
      idx: function () { return idx; },
      key: function (e) {
        if (/^[a-zA-Z]$/.test(e.key)) { type(e.key.toUpperCase()); return true; }
        if (e.key === 'Backspace') { back(); return true; }
        if (e.key === 'Enter' && !(e.target && /^(BUTTON|A)$/.test(e.target.tagName) && !e.target.classList.contains('kb__k'))) { enter(); return true; }
        return false;
      }
    };
  }

  /* =========================================================
     WORD SEARCH ("Strands"-style)
     ========================================================= */
  function Strands(host) {
    var ID = 'strands';
    var W = G.wordsearch, N = W.size, words = W.words.slice(), found = {}, tapStart = null, drag = null, hints = 0;
    var VR = [0, 1, 1, 1, 0, -1, -1, -1], VC = [1, 1, 0, -1, -1, -1, 0, 1], clearT = 0;

    host.innerHTML =
      intro('Strands', 'Today\'s theme: <b>' + (W.theme || 'you') + '</b>. Find all ' + words.length + ' words, hidden in any direction, even backwards. Drag across the letters, or tap the first letter and then the last.', ID) +
      '<div class="ws__prog"><span class="ws__count" aria-live="polite"></span><span class="ws__bar" aria-hidden="true"><i></i></span><button type="button" class="gm-btn gm-btn--quiet" data-a="hint">Hint</button></div>' +
      '<div class="ws__wrap"><div class="ws__grid" role="application" aria-label="Word search grid. Drag across letters to select a word."></div></div>' +
      '<p class="gm-msg" role="status" aria-live="polite"></p><ul class="ws__list" aria-label="Words to find"></ul>';
    var grid = $('.ws__grid', host), msgEl = $('.gm-msg', host), countEl = $('.ws__count', host), barEl = $('.ws__bar i', host), listEl = $('.ws__list', host);
    grid.style.gridTemplateColumns = 'repeat(' + N + ', 1fr)';
    var cellEls = [];
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      var d = el('div', 'ws__c'); d.textContent = W.grid[r][c]; d.setAttribute('data-r', r); d.setAttribute('data-c', c);
      grid.appendChild(d); cellEls.push(d);
    }
    var chips = {};
    words.forEach(function (w) { var li = el('li', 'ws__w'); li.textContent = '? '.repeat(w.length).trim() ? w.length + ' letters' : w; listEl.appendChild(li); chips[w] = li; });
    function at(r, c) { return cellEls[r * N + c]; }
    function say(m) { msgEl.textContent = m; }
    function progressBar() {
      var n = Object.keys(found).length;
      countEl.textContent = n + ' of ' + words.length + ' found'; barEl.style.width = (n / words.length * 100) + '%';
    }
    function persist() { progress(ID, { found: Object.keys(found), hints: hints }); }
    function clearSel() { cellEls.forEach(function (d) { d.classList.remove('is-sel', 'is-start', 'is-no'); }); }
    function fromPoint(x, y) {
      var rc = grid.getBoundingClientRect();
      var c = Math.floor((x - rc.left) / rc.width * N), r = Math.floor((y - rc.top) / rc.height * N);
      return { r: Math.max(0, Math.min(N - 1, r)), c: Math.max(0, Math.min(N - 1, c)) };
    }
    function aligned(s, e) { var dr = e.r - s.r, dc = e.c - s.c; return dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc); }
    function line(s, e) {
      var dr = e.r - s.r, dc = e.c - s.c;
      if (!dr && !dc) return [s];
      var k = ((Math.round(Math.atan2(dr, dc) / (Math.PI / 4)) % 8) + 8) % 8, vr = VR[k], vc = VC[k];
      var len = Math.round((dr * vr + dc * vc) / (vr * vr + vc * vc)), out = [];
      for (var i = 0; i <= len; i++) {
        var rr = s.r + vr * i, cc = s.c + vc * i;
        if (rr < 0 || rr >= N || cc < 0 || cc >= N) break;
        out.push({ r: rr, c: cc });
      }
      return out;
    }
    function cellsOf(w) { var wh = W.where[w], out = []; for (var i = 0; i < w.length; i++) out.push({ r: wh[0] + wh[2] * i, c: wh[1] + wh[3] * i }); return out; }
    function markFound(w, cells) {
      found[w] = cells; chips[w].classList.add('is-found'); chips[w].textContent = w;
      cells.forEach(function (p) { var d = at(p.r, p.c); d.classList.add('is-found'); d.classList.remove('is-hint'); });
    }
    function mark(cells) { clearSel(); cells.forEach(function (p) { at(p.r, p.c).classList.add('is-sel'); }); }
    function complete(silent) { state.strands = true; resultLine(host, ID, hints ? 'All found, ' + hints + (hints === 1 ? ' hint' : ' hints') : 'All found, no hints', ''); refresh(silent); }
    function evaluate(cells) {
      var s = cells.map(function (p) { return W.grid[p.r][p.c]; }).join(''), rev = s.split('').reverse().join('');
      var hit = null;
      words.forEach(function (w) { if (!found[w] && (w === s || w === rev)) hit = w; });
      if (hit) {
        markFound(hit, cells); clearSel(); progressBar(); persist();
        say(hit + '. ' + (words.length - Object.keys(found).length) + ' to go.');
        if (Object.keys(found).length === words.length) { finish(ID, 'solved', { hints: hints }); say('All ' + words.length + ' found.'); toast('Strands: solved'); complete(); }
      } else {
        cells.forEach(function (p) { at(p.r, p.c).classList.add('is-no'); });
        say(cells.length > 1 ? 'Not one of the words.' : '');
        clearTimeout(clearT); clearT = setTimeout(clearSel, reduced() ? 0 : 420);
      }
    }
    function isDone() { return Object.keys(found).length === words.length; }
    grid.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      if (drag || isDone()) return;
      touch(ID);
      clearTimeout(clearT);
      try { grid.setPointerCapture(e.pointerId); } catch (er) {}
      var p = fromPoint(e.clientX, e.clientY);
      drag = { s: p, e: p, moved: false, id: e.pointerId };
      if (!tapStart) { clearSel(); at(p.r, p.c).classList.add('is-sel'); }
    });
    grid.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var p = fromPoint(e.clientX, e.clientY);
      if (p.r === drag.e.r && p.c === drag.e.c) return;
      drag.e = p;
      if (p.r !== drag.s.r || p.c !== drag.s.c) { drag.moved = true; tapStart = null; mark(line(drag.s, p)); }
    });
    function up(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag; drag = null;
      if (d.moved) { var cells = line(d.s, d.e); tapStart = null; if (cells.length > 1) evaluate(cells); else clearSel(); return; }
      var p = d.s;
      if (!tapStart) { tapStart = p; clearSel(); at(p.r, p.c).classList.add('is-start'); say('Now tap the last letter.'); return; }
      if (tapStart.r === p.r && tapStart.c === p.c) { tapStart = null; clearSel(); say(''); return; }
      if (aligned(tapStart, p)) { var run = line(tapStart, p); tapStart = null; mark(run); evaluate(run); }
      else { tapStart = p; clearSel(); at(p.r, p.c).classList.add('is-start'); say('Those letters are not in a straight line. Starting again from here.'); }
    }
    grid.addEventListener('pointerup', up);
    grid.addEventListener('pointercancel', function () { drag = null; clearSel(); tapStart = null; });
    host.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a="hint"]'); if (!b || isDone()) return;
      touch(ID);
      var left = words.filter(function (w) { return !found[w]; }); if (!left.length) return;
      var w = left[Math.floor(Math.random() * left.length)], wh = W.where[w], dd = at(wh[0], wh[1]);
      hints++; persist();
      chips[w].textContent = w;                                     // a hint shows the word and where it starts
      dd.classList.add('is-hint'); say('Look for ' + w + '. It starts at the pulsing letter.');
      setTimeout(function () { dd.classList.remove('is-hint'); }, 3200);
    });
    var saved = get(ID);
    if (saved && saved.data) { hints = saved.data.hints || 0; (saved.data.found || []).forEach(function (w) { if (W.where[w]) markFound(w, cellsOf(w)); }); }
    if (saved && saved.status !== 'open') { words.forEach(function (w) { if (!found[w]) markFound(w, cellsOf(w)); }); progressBar(); complete(true); }
    else progressBar();
    return { key: function () { return false; } };
  }

  /* ---------- boot ---------- */
  var games = {};
  games.mini = Mini(panels.mini);
  games.conn = Connections(panels.conn);
  games.wordle = Wordle(panels.wordle);
  games.strands = Strands(panels.strands);
  document.addEventListener('keydown', function (e) {
    if (!inView || e.ctrlKey || e.metaKey || e.altKey || !$('#lb').hidden || !modal.hidden) return;
    var t = e.target;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    var g = games[active];
    if (g && g.key && g.key(e)) e.preventDefault();
  });
  window.E17Games = { state: state, setTab: setTab };
  refresh(true);
  renderNext();
})();
