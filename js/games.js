/* The Elaika Times: Games. Mini crossword, Connections, Wordle x3, word search ("Strands").
   All data comes from window.GAMES (generated from content/games.json). No dependencies. */
(function () {
  'use strict';
  var G = window.GAMES;
  if (!G) return;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = function () { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; };
  var section = $('#games');
  var inView = false;
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { inView = es[es.length - 1].isIntersecting; }, { threshold: 0 }).observe(section);
  else inView = true;

  /* ---------- progress + the "solved everything?" moment ---------- */
  var state = { mini: false, conn: false, wordle: [false, false, false], strands: false };
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
  function refresh() {
    var f = finished(), n = 0;
    tabs.forEach(function (t) { var d = !!f[t.getAttribute('data-game')]; t.classList.toggle('is-done', d); if (d) n++; });
    $('#gmCount').textContent = n + ' of 4 finished';
    if (n === 4 && !celebrated) {
      celebrated = true;
      setTimeout(function () {
        var el = $('#gmWin'); el.hidden = false;
        el.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
        setTimeout(function () {
          var r = el.getBoundingClientRect();
          if (window.fireConfetti) window.fireConfetti({ x: window.innerWidth / 2, y: Math.max(140, Math.min(window.innerHeight - 120, r.top + r.height / 2)) });
        }, reduced() ? 0 : 450);
      }, 1100);
    }
  }

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

  /* =========================================================
     THE MINI (crossword)
     ========================================================= */
  function Mini(host) {
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
    var total = Object.keys(cells).length;

    host.innerHTML =
      '<div class="gm-intro"><h3 class="gm-h">The Mini</h3><p class="gm-p">Tap a square and type. Tap it again to switch between across and down.</p></div>' +
      '<div class="gm-tools"><button type="button" class="gm-btn" data-a="check">Check</button><button type="button" class="gm-btn" data-a="word">Reveal word</button><button type="button" class="gm-btn gm-btn--quiet" data-a="all">Reveal all</button></div>' +
      '<p class="gm-msg" role="status" aria-live="polite"></p>' +
      '<div class="xw-wrap"><div class="xw"><div class="xw__grid" tabindex="0" role="application" aria-label="Crossword grid. Type letters to fill the highlighted word. Arrow keys move between squares."></div></div></div>' +
      '<div class="xw-lists"><div><h4 class="gm-h4">Across</h4><ol class="xw-list" data-d="A"></ol></div><div><h4 class="gm-h4">Down</h4><ol class="xw-list" data-d="D"></ol></div></div>' +
      '<div class="dock"><div class="xw__bar"><button type="button" class="xw__nav" data-a="prev" aria-label="Previous clue"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><button type="button" class="xw__clue" data-a="dir"><b class="xw__cn"></b><span class="xw__ct"></span></button><button type="button" class="xw__nav" data-a="next" aria-label="Next clue"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button></div><div class="kbhost"></div></div>';

    var grid = $('.xw__grid', host), msgEl = $('.gm-msg', host), cn = $('.xw__cn', host), ct = $('.xw__ct', host);
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

    var sel = seq[0].keys[0], dir = 'A', solved = false, wasFilled = false, armed = 0;
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
    function afterChange() {
      var f = filled();
      if (f && correct()) {
        if (!solved) { solved = true; state.mini = true; grid.classList.add('is-solved'); say('Solved. Every square is right.'); toast('The Mini: solved'); refresh(); }
      } else if (f && !wasFilled) { say('Every square is filled, but a few letters are off. Try Check.'); }
      wasFilled = f;
    }
    function type(ch) {
      var c = cells[sel]; c.val = ch; c.bad = false; c.rev = false;
      var en = curEntry(), i = en.keys.indexOf(sel);
      if (i < en.keys.length - 1) sel = en.keys[i + 1];
      paint(); afterChange();
    }
    function back() {
      var c = cells[sel];
      if (c.val) { c.val = ''; c.bad = false; c.rev = false; }
      else { var en = curEntry(), i = en.keys.indexOf(sel); if (i > 0) { sel = en.keys[i - 1]; var p = cells[sel]; p.val = ''; p.bad = false; p.rev = false; } }
      paint(); wasFilled = filled();
    }
    function step(dr, dc) {        // next playable square in that direction, however far
      var c = cells[sel], r = c.r + dr, cc = c.c + dc;
      while (r >= 0 && r < R && cc >= 0 && cc < C) { if (cells[K(r, cc)]) { sel = K(r, cc); if (dr) dir = 'D'; else dir = 'A'; paint(); return; } r += dr; cc += dc; }
    }
    function check() {
      var bad = 0, any = 0;
      Object.keys(cells).forEach(function (k) { var c = cells[k]; if (c.val) { any++; c.bad = c.val !== c.ans; if (c.bad) bad++; } else c.bad = false; });
      paint();
      say(!any ? 'Nothing to check yet.' : bad ? bad + (bad === 1 ? ' square is' : ' squares are') + ' off. They have a slash through them.' : 'So far, every letter is right.');
    }
    function revealWord() { curEntry().keys.forEach(function (k) { var c = cells[k]; c.val = c.ans; c.rev = true; c.bad = false; }); paint(); say('Word revealed.'); afterChange(); }
    function revealAll() {
      Object.keys(cells).forEach(function (k) { var c = cells[k]; if (c.val !== c.ans) c.rev = true; c.val = c.ans; c.bad = false; });
      paint(); say('Every square revealed.');
      if (!solved) { solved = true; state.mini = true; grid.classList.add('is-solved'); refresh(); }
    }
    host.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
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
    paint();
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
    var groups = G.connections.slice().sort(function (a, b) { return a.level - b.level; });
    var tiles, solved, selected, mistakes, over, guessed, busy;

    host.innerHTML =
      '<div class="gm-intro"><h3 class="gm-h">Connections</h3><p class="gm-p">Create four groups of four. Select four tiles, then submit.</p></div>' +
      '<div class="cn__solved" aria-live="polite"></div><div class="cn__grid"></div>' +
      '<p class="gm-msg" role="status" aria-live="polite"></p>' +
      '<p class="cn__mist"><span>Mistakes remaining</span><span class="cn__dots" aria-hidden="true"></span><span class="sr-only cn__mist-sr"></span></p>' +
      '<div class="gm-tools gm-tools--c"><button type="button" class="gm-btn" data-a="shuffle">Shuffle</button><button type="button" class="gm-btn" data-a="clear">Deselect all</button><button type="button" class="gm-btn gm-btn--go" data-a="submit">Submit</button></div>' +
      '<div class="gm-tools gm-tools--c" data-retry hidden><button type="button" class="gm-btn gm-btn--go" data-a="retry">Try again</button></div>';
    var solvedEl = $('.cn__solved', host), gridEl = $('.cn__grid', host), msgEl = $('.gm-msg', host), dots = $('.cn__dots', host), mistSr = $('.cn__mist-sr', host);
    var submit = $('[data-a="submit"]', host), clear = $('[data-a="clear"]', host), shuf = $('[data-a="shuffle"]', host), retry = $('[data-retry]', host);

    function reset() {
      tiles = []; groups.forEach(function (g, gi) { g.words.forEach(function (w) { tiles.push({ id: tiles.length, w: w, g: gi }); }); });
      tiles = shuffle(tiles); solved = []; selected = []; mistakes = 0; over = false; guessed = {}; busy = false;
      msgEl.textContent = ''; retry.hidden = true; render();
    }
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
      var id = +b.getAttribute('data-id'), i = selected.indexOf(id);
      if (i >= 0) selected.splice(i, 1); else if (selected.length < 4) selected.push(id);
      msgEl.textContent = ''; render();
      var nb = gridEl.querySelector('[data-id="' + id + '"]'); if (nb) nb.focus();      // keep keyboard / screen-reader place
    });
    function win() { state.conn = true; say(mistakes ? 'Solved.' : 'Perfect. No mistakes.'); toast('Connections: solved'); refresh(); }
    function lose() {
      over = true; say('Out of mistakes. Here are the groups.'); render();
      var rest = groups.map(function (g, gi) { return gi; }).filter(function (gi) { return solved.indexOf(gi) < 0; });
      rest.forEach(function (gi, n) { setTimeout(function () { groups[gi].fresh = true; solved.push(gi); selected = []; render(); if (n === rest.length - 1) { retry.hidden = false; $('button', retry).focus(); } }, reduced() ? 0 : 700 * (n + 1)); });
    }
    function doSubmit() {
      if (selected.length !== 4 || over || busy) return;
      var key = selected.slice().sort(function (a, b) { return a - b; }).join('-');
      if (guessed[key]) { say('You already tried that group.'); return; }
      var counts = [0, 0, 0, 0]; selected.forEach(function (id) { counts[tiles[tileIdx(id)].g]++; });
      var top = Math.max.apply(null, counts), gi = counts.indexOf(top);
      if (top === 4) {
        busy = true; var ons = $$('.cn__tile.is-on', gridEl); ons.forEach(function (b) { b.classList.add('is-ok'); });
        setTimeout(function () {
          groups[gi].fresh = true; solved.push(gi); selected = []; busy = false; render(); say('');
          if (solved.length === 4) win();
        }, reduced() ? 0 : 520);
      } else {
        guessed[key] = true; mistakes++; busy = true;
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
      else if (a === 'retry') { reset(); var first = gridEl.querySelector('.cn__tile'); if (first) first.focus(); }
    });
    reset();
    return { key: function () { return false; } };
  }

  /* =========================================================
     WORDLE x3
     ========================================================= */
  function Wordle(host) {
    var P = G.wordle.map(function (w) { return { a: w.answer.toUpperCase(), hint: w.hint, guesses: [], cur: '', status: 'play', marks: {} }; });
    var idx = 0, locked = false, timers = [];

    host.innerHTML =
      '<div class="gm-intro"><h3 class="gm-h">Wordle</h3><p class="gm-p">Three five-letter words, six tries each. Any five letters count as a guess.</p></div>' +
      '<div class="wd__pills" role="group" aria-label="Choose a puzzle"></div>' +
      '<p class="wd__hint"></p><div class="wd__board" role="group" aria-label="Guesses"></div>' +
      '<p class="gm-msg" role="status" aria-live="polite"></p><div class="gm-tools gm-tools--c" data-next hidden><button type="button" class="gm-btn gm-btn--go" data-a="next">Next puzzle</button></div>' +
      '<div class="kbhost"></div>';
    var pills = $('.wd__pills', host), hintEl = $('.wd__hint', host), board = $('.wd__board', host), msgEl = $('.gm-msg', host), nextBox = $('[data-next]', host);
    var kb = Keyboard('enter'); $('.kbhost', host).appendChild(kb.el);
    var pillEls = P.map(function (p, i) {
      var b = el('button', 'wd__pill', '<span>Puzzle ' + (i + 1) + '</span><i aria-hidden="true"></i>'); b.type = 'button';
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
    function show(i) {
      idx = i; clearTimers(); locked = false; refresh();
      pillEls.forEach(function (b, n) { b.classList.toggle('is-on', n === i); b.setAttribute('aria-pressed', n === i ? 'true' : 'false'); b.classList.toggle('is-done', P[n].status !== 'play'); });
      hintEl.innerHTML = '<span>Hint</span> '; hintEl.appendChild(document.createTextNode(P[i].hint));
      paintAll();
      var p = P[i];
      if (p.status === 'won') say('Got it in ' + p.guesses.length + '.'); else if (p.status === 'lost') say('The word was ' + p.a + '.'); else say('');
      nextBox.hidden = !(p.status !== 'play' && i < P.length - 1);
    }
    function type(ch) {
      var p = P[idx]; if (p.status !== 'play' || locked || p.cur.length >= 5) return;
      p.cur += ch; var t = rows[p.guesses.length].t[p.cur.length - 1]; paintTile(t, ch, ''); t.classList.add('pop'); say('');
    }
    function back() {
      var p = P[idx]; if (p.status !== 'play' || locked || !p.cur.length) return;
      p.cur = p.cur.slice(0, -1); paintTile(rows[p.guesses.length].t[p.cur.length], '', ''); say('');
    }
    function enter() {
      var p = P[idx]; if (p.status !== 'play' || locked) return;
      var rw = rows[p.guesses.length];
      if (p.cur.length < 5) { rw.el.classList.remove('is-shake'); void rw.el.offsetWidth; rw.el.classList.add('is-shake'); say('Not enough letters.'); return; }
      var g = p.cur, s = score(g, p.a), instant = reduced(), mine = idx;
      p.guesses.push({ g: g, s: s }); p.cur = '';
      var n = p.guesses.length, won = g === p.a, lost = !won && n >= 6;
      p.status = won ? 'won' : lost ? 'lost' : 'play';          // the result is settled now; only the reveal is delayed
      if (p.status !== 'play') state.wordle[mine] = true;
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
        if (p.status !== 'play') { pillEls[mine].classList.add('is-done'); nextBox.hidden = mine >= P.length - 1; toast('Wordle ' + (mine + 1) + ': ' + (won ? 'solved' : 'finished')); refresh(); }
      }, instant ? 0 : 4 * 280 + 620));
    }
    kb.onKey = function (k) { if (k === 'Enter') enter(); else if (k === 'Back') back(); else type(k); };
    host.addEventListener('click', function (e) { var b = e.target.closest('[data-a="next"]'); if (b) { board.setAttribute('tabindex', '-1'); board.focus({ preventScroll: true }); show(idx + 1); } });
    show(0);
    return {
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
    var W = G.wordsearch, N = W.size, words = W.words.slice(), found = {}, tapStart = null, drag = null;
    var VR = [0, 1, 1, 1, 0, -1, -1, -1], VC = [1, 1, 0, -1, -1, -1, 0, 1], clearT = 0;

    host.innerHTML =
      '<div class="gm-intro"><h3 class="gm-h">Strands</h3><p class="gm-p">Find the 14 hidden words. Drag across the letters, or tap the first letter and then the last.</p></div>' +
      '<div class="ws__prog"><span class="ws__count" aria-live="polite"></span><span class="ws__bar" aria-hidden="true"><i></i></span><button type="button" class="gm-btn gm-btn--quiet" data-a="hint">Hint</button></div>' +
      '<div class="ws__wrap"><div class="ws__grid" role="application" aria-label="Word search grid. Drag across letters to select a word."></div></div>' +
      '<p class="gm-msg" role="status" aria-live="polite"></p><ul class="ws__list" aria-label="Words to find"></ul>';
    var grid = $('.ws__grid', host), msgEl = $('.gm-msg', host), countEl = $('.ws__count', host), barEl = $('.ws__bar i', host), listEl = $('.ws__list', host);
    var cellEls = [];
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      var d = el('div', 'ws__c'); d.textContent = W.grid[r][c]; d.setAttribute('data-r', r); d.setAttribute('data-c', c);
      grid.appendChild(d); cellEls.push(d);
    }
    var chips = {};
    words.forEach(function (w) { var li = el('li', 'ws__w'); li.textContent = w; listEl.appendChild(li); chips[w] = li; });
    function at(r, c) { return cellEls[r * N + c]; }
    function say(m) { msgEl.textContent = m; }
    function progress() {
      var n = Object.keys(found).length;
      countEl.textContent = n + ' of ' + words.length + ' found'; barEl.style.width = (n / words.length * 100) + '%';
    }
    function clearSel() { cellEls.forEach(function (d) { d.classList.remove('is-sel', 'is-start', 'is-no'); }); }
    function fromPoint(x, y) {
      var rc = grid.getBoundingClientRect();
      var c = Math.floor((x - rc.left) / rc.width * N), r = Math.floor((y - rc.top) / rc.height * N);
      return { r: Math.max(0, Math.min(N - 1, r)), c: Math.max(0, Math.min(N - 1, c)) };
    }
    function aligned(s, e) { var dr = e.r - s.r, dc = e.c - s.c; return dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc); }
    function line(s, e) {          // straight run of cells from s toward e, snapped to the nearest of 8 directions
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
    function mark(cells) { clearSel(); cells.forEach(function (p, i) { at(p.r, p.c).classList.add('is-sel'); }); }
    function evaluate(cells) {
      var s = cells.map(function (p) { return W.grid[p.r][p.c]; }).join(''), rev = s.split('').reverse().join('');
      var hit = null;
      words.forEach(function (w) { if (!found[w] && (w === s || w === rev)) hit = w; });
      if (hit) {
        found[hit] = cells; chips[hit].classList.add('is-found');
        cells.forEach(function (p) { var d = at(p.r, p.c); d.classList.add(hit === 'ELAIKA' ? 'is-spang' : 'is-found'); d.classList.remove('is-hint'); });
        clearSel(); progress(); say(hit + '. ' + (words.length - Object.keys(found).length) + ' to go.');
        if (Object.keys(found).length === words.length) { state.strands = true; say('All ' + words.length + ' found.'); toast('Strands: solved'); refresh(); }
      } else {
        cells.forEach(function (p) { at(p.r, p.c).classList.add('is-no'); });
        say(cells.length > 1 ? 'Not one of the words.' : '');
        clearTimeout(clearT); clearT = setTimeout(clearSel, reduced() ? 0 : 420);
      }
    }
    grid.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      if (drag) return;                                   // ignore a second finger / palm
      clearTimeout(clearT);
      try { grid.setPointerCapture(e.pointerId); } catch (er) {}
      var p = fromPoint(e.clientX, e.clientY);
      drag = { s: p, e: p, moved: false, id: e.pointerId };
      if (!tapStart) clearSel();
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
      var b = e.target.closest('[data-a="hint"]'); if (!b) return;
      var left = words.filter(function (w) { return !found[w]; }); if (!left.length) return;
      var w = left[Math.floor(Math.random() * left.length)], wh = W.where[w], d = at(wh[0], wh[1]);
      d.classList.add('is-hint'); say('One of them starts at the pulsing letter.');
      setTimeout(function () { d.classList.remove('is-hint'); }, 3200);
    });
    progress();
    return { key: function () { return false; } };
  }

  /* ---------- boot ---------- */
  var games = { mini: Mini(panels.mini), conn: Connections(panels.conn), wordle: Wordle(panels.wordle), strands: Strands(panels.strands) };
  document.addEventListener('keydown', function (e) {
    if (!inView || e.ctrlKey || e.metaKey || e.altKey || !$('#lb').hidden) return;
    var t = e.target;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    var g = games[active];
    if (g && g.key && g.key(e)) e.preventDefault();
  });
  // expose a tiny hook for testing
  window.E17Games = { state: state, setTab: setTab };
  refresh();
})();
