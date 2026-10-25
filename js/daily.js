/* The Elaika Times: daily engine.
   - Today's puzzles come from the date in India (IST), so everyone sees the same set and it changes at midnight.
   - Progress, results, times and streaks are saved on her phone (localStorage).
   - Debug/testing: add ?e17day=2026-10-27 to the URL to see another day. */
(function () {
  'use strict';
  var B = window.E17BANK;
  if (!B) return;

  /* ---------- the day ---------- */
  var LAUNCH = '2026-10-26';
  function istParts(ms) { var d = new Date(ms + 5.5 * 36e5); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), wd: d.getUTCDay() }; }
  function keyOf(p) { return p.y + '-' + String(p.m + 1).padStart(2, '0') + '-' + String(p.d).padStart(2, '0'); }
  function dayNum(key) { var a = key.split('-').map(Number), b = LAUNCH.split('-').map(Number); return Math.round((Date.UTC(a[0], a[1] - 1, a[2]) - Date.UTC(b[0], b[1] - 1, b[2])) / 864e5); }
  function keyPlus(key, n) { var a = key.split('-').map(Number); var t = Date.UTC(a[0], a[1] - 1, a[2]) + n * 864e5; var d = new Date(t); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); }
  var forced = null;
  try { var q = new URLSearchParams(location.search).get('e17day'); if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) forced = q; } catch (e) {}
  var TODAY = forced || keyOf(istParts(Date.now()));
  var N = Math.max(0, dayNum(TODAY));

  /* ---------- seeded randomness ---------- */
  function hash(str) { var h = 1779033703 ^ str.length; for (var i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } return function () { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return (h ^= h >>> 16) >>> 0; }; }
  function rng(seed) { var s = hash(seed)(); return function () { s |= 0; s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shuffle(a, r) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  // a fixed shuffled order per list, walked one step per day, so nothing repeats until the list runs out
  function pickCycle(list, name, n, count) {
    var cycle = Math.floor(n * count / list.length);
    var order = shuffle(list, rng(name + ':cycle' + cycle));
    var out = [];
    for (var k = 0; k < count; k++) out.push(order[(n * count + k) % list.length]);
    return out;
  }

  /* ---------- Wordle: one about her, one random ---------- */
  var OLD = { PARIS: 1, ROYCE: 1, LLOYD: 1, TAKIS: 1 };          // already in the launch-night set
  var wHer = pickCycle(B.wordleHer, 'wordle-her', N, 1)[0], bump = 1;
  while (N === 0 && OLD[wHer[0]]) wHer = pickCycle(B.wordleHer, 'wordle-her', N + 40 + bump++, 1)[0];
  var wGen = pickCycle(B.wordleGen, 'wordle-gen', N, 1)[0];
  var wordle = [{ answer: wHer[0], hint: wHer[1], label: 'About you' }, { answer: wGen[0], hint: wGen[1], label: 'Wildcard' }];

  /* ---------- crossword (criss-cross, compact) ---------- */
  function buildCrossword() {
    var r = rng('xw:' + TODAY);
    for (var attempt = 0; attempt < 12; attempt++) {
      var her = shuffle(B.xwHer, rng('xwh:' + TODAY + attempt)).slice(0, 3);
      var gen = shuffle(B.xwGen.filter(function (x) { return x[0].length <= 10; }), rng('xwg:' + TODAY + attempt)).slice(0, 10);
      var words = her.concat(gen);
      var best = place(words, r, 13);
      if (best && best.placed.length >= 9) return number(best, words);
    }
    return number(place(B.xwGen.slice(0, 12), r, 15), B.xwGen.slice(0, 12));
  }
  function place(words, r, maxDim) {
    var best = null;
    for (var t = 0; t < 160; t++) {
      var order = shuffle(words, r).sort(function (a, b) { return b[0].length - a[0].length + (r() - .5) * 3; });
      var grid = {}, placed = [];
      var first = order[0][0];
      for (var i = 0; i < first.length; i++) grid['0,' + i] = first[i];
      placed.push([first, 0, 0, 'A']);
      for (var w = 1; w < order.length; w++) {
        var word = order[w][0], cands = [];
        Object.keys(grid).forEach(function (k) {
          var rc = k.split(',').map(Number), ch = grid[k];
          for (var j = 0; j < word.length; j++) {
            if (word[j] !== ch) continue;
            ['A', 'D'].forEach(function (d) {
              var sr = d === 'A' ? rc[0] : rc[0] - j, sc = d === 'A' ? rc[1] - j : rc[1];
              var x = fits(grid, word, sr, sc, d);
              if (x) cands.push([x, sr, sc, d]);
            });
          }
        });
        if (!cands.length) continue;
        cands.sort(function (a, b) { return b[0] - a[0]; });
        var top = cands.filter(function (c) { return c[0] === cands[0][0]; });
        var c = top[Math.floor(r() * top.length)];
        var g2 = Object.assign({}, grid);
        for (var q = 0; q < word.length; q++) g2[c[3] === 'A' ? c[1] + ',' + (c[2] + q) : (c[1] + q) + ',' + c[2]] = word[q];
        var b = bounds(g2);
        if (b.h > maxDim || b.w > maxDim) continue;
        grid = g2; placed.push([word, c[1], c[2], c[3]]);
      }
      var bb = bounds(grid);
      var score = placed.length * 1000 - Math.max(bb.h, bb.w) * 12 - Math.abs(bb.h - bb.w) * 5;
      if (!best || score > best.score) best = { score: score, placed: placed, b: bb };
    }
    return best;
  }
  function bounds(g) { var rs = [], cs = []; Object.keys(g).forEach(function (k) { var p = k.split(','); rs.push(+p[0]); cs.push(+p[1]); }); var r0 = Math.min.apply(null, rs), c0 = Math.min.apply(null, cs); return { r0: r0, c0: c0, h: Math.max.apply(null, rs) - r0 + 1, w: Math.max.apply(null, cs) - c0 + 1 }; }
  function fits(g, word, sr, sc, d) {
    var dr = d === 'A' ? 0 : 1, dc = d === 'A' ? 1 : 0, hits = 0;
    if (g[(sr - dr) + ',' + (sc - dc)] || g[(sr + dr * word.length) + ',' + (sc + dc * word.length)]) return 0;
    for (var i = 0; i < word.length; i++) {
      var r = sr + dr * i, c = sc + dc * i, cur = g[r + ',' + c];
      if (cur) { if (cur !== word[i]) return 0; hits++; continue; }
      if (g[(r - dc) + ',' + (c - dr)] || g[(r + dc) + ',' + (c + dr)]) return 0;
    }
    return hits >= 1 && hits < word.length ? hits : 0;
  }
  function number(best, words) {
    var clue = {}; words.forEach(function (w) { clue[w[0]] = w[1]; });
    var b = best.b, placed = best.placed.map(function (p) { return [p[0], p[1] - b.r0, p[2] - b.c0, p[3]]; });
    var starts = {}; placed.forEach(function (p) { starts[p[1] + ',' + p[2]] = true; });
    var nums = {}, n = 0;
    for (var r = 0; r < b.h; r++) for (var c = 0; c < b.w; c++) if (starts[r + ',' + c]) nums[r + ',' + c] = ++n;
    var grid = []; for (r = 0; r < b.h; r++) { grid.push([]); for (c = 0; c < b.w; c++) grid[r].push(''); }
    var across = [], down = [];
    placed.forEach(function (p) {
      for (var i = 0; i < p[0].length; i++) { if (p[3] === 'A') grid[p[1]][p[2] + i] = p[0][i]; else grid[p[1] + i][p[2]] = p[0][i]; }
      (p[3] === 'A' ? across : down).push({ num: nums[p[1] + ',' + p[2]], row: p[1], col: p[2], answer: p[0], clue: clue[p[0]], len: p[0].length });
    });
    across.sort(function (a, b) { return a.num - b.num; }); down.sort(function (a, b) { return a.num - b.num; });
    return { rows: b.h, cols: b.w, grid: grid, across: across, down: down, numbers: Object.keys(nums).map(function (k) { var p = k.split(','); return { row: +p[0], col: +p[1], num: nums[k] }; }) };
  }

  /* ---------- connections ---------- */
  var COLORS = { 1: '#F9DF6D', 2: '#A0C35A', 3: '#B0C4EF', 4: '#BA81C5' };
  function buildConnections() {
    var r = rng('cn:' + TODAY);
    for (var t = 0; t < 400; t++) {
      var picks = [1, 2, 3, 4].map(function (lv) { var pool = B.conn.filter(function (c) { return c.level === lv; }); return pool[Math.floor(r() * pool.length)]; });
      var herCount = picks.filter(function (c) { return c.her; }).length;
      if (herCount < 1 || herCount > 2) continue;
      var ok = true, groups = [];
      for (var i = 0; i < 4 && ok; i++) {
        var others = {}; picks.forEach(function (c, j) { if (j !== i) c.words.forEach(function (w) { others[w] = true; }); });
        var avail = picks[i].words.filter(function (w) { return !others[w]; });
        if (avail.length < 4) { ok = false; break; }
        groups.push({ level: picks[i].level, color: COLORS[picks[i].level], title: picks[i].title, words: shuffle(avail, r).slice(0, 4) });
      }
      if (ok) return groups;
    }
    return null;
  }

  /* ---------- word search ("Strands") ---------- */
  function buildStrands() {
    var r = rng('ws:' + TODAY);
    var theme = pickCycle(B.strands, 'strands', N, 1)[0];
    var size = 11, dirs = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
    var want = shuffle(theme.words.filter(function (w) { return w.length <= size; }), r).slice(0, 9).sort(function (a, b) { return b.length - a.length; });
    for (var attempt = 0; attempt < 300; attempt++) {
      var g = []; for (var i = 0; i < size; i++) { g.push([]); for (var j = 0; j < size; j++) g[i].push(null); }
      var where = {}, ok = true;
      for (var w = 0; w < want.length && ok; w++) {
        var wd = want[w], spots = [];
        dirs.forEach(function (d) {
          for (var rr = 0; rr < size; rr++) for (var cc = 0; cc < size; cc++) {
            var er = rr + d[0] * (wd.length - 1), ec = cc + d[1] * (wd.length - 1);
            if (er < 0 || er >= size || ec < 0 || ec >= size) continue;
            var good = true, ov = 0;
            for (var k = 0; k < wd.length; k++) { var x = g[rr + d[0] * k][cc + d[1] * k]; if (x !== null && x !== wd[k]) { good = false; break; } if (x === wd[k]) ov++; }
            if (good) spots.push([ov, rr, cc, d]);
          }
        });
        if (!spots.length) { ok = false; break; }
        spots = shuffle(spots, r);
        var s = r() < .4 ? spots.sort(function (a, b) { return b[0] - a[0]; })[0] : spots[0];
        for (var k2 = 0; k2 < wd.length; k2++) g[s[1] + s[3][0] * k2][s[2] + s[3][1] * k2] = wd[k2];
        where[wd] = [s[1], s[2], s[3][0], s[3][1]];
      }
      if (!ok) continue;
      var letters = want.join('');                       // filler uses the theme's own letters: harder to spot words
      for (var a = 0; a < size; a++) for (var b2 = 0; b2 < size; b2++) if (g[a][b2] === null) g[a][b2] = letters[Math.floor(r() * letters.length)];
      return { size: size, grid: g.map(function (row) { return row.join(''); }), words: want, where: where, theme: theme.theme };
    }
    return null;
  }

  var games = { crossword: buildCrossword(), connections: buildConnections(), wordle: wordle, wordsearch: buildStrands() };
  if (games.connections && games.wordsearch && games.crossword) window.GAMES = games;   // otherwise keep the built-in set

  /* ---------- saved progress + stats ---------- */
  var KEY = 'e17-times-v1', mem = { days: {} };
  function load() { try { var s = localStorage.getItem(KEY); if (s) mem = JSON.parse(s) || mem; } catch (e) {} if (!mem.days) mem.days = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) {} }
  load();
  var GAME_IDS = ['mini', 'conn', 'wordle0', 'wordle1', 'strands'];
  function today() { if (!mem.days[TODAY]) mem.days[TODAY] = {}; return mem.days[TODAY]; }
  function rec(id) { var d = today(); if (!d[id]) d[id] = { status: 'open', ms: 0 }; return d[id]; }
  function dayStatus(d) {
    if (!d) return 'none';
    var fin = GAME_IDS.every(function (g) { return d[g] && d[g].status !== 'open'; });
    if (!fin) return GAME_IDS.some(function (g) { return d[g] && (d[g].ms > 0 || d[g].status !== 'open'); }) ? 'partial' : 'none';
    return GAME_IDS.every(function (g) { return d[g].status === 'solved'; }) ? 'correct' : 'wrong';
  }
  function dayTime(d) { return GAME_IDS.reduce(function (s, g) { return s + (d && d[g] ? d[g].ms || 0 : 0); }, 0); }
  function streakFrom(test) {
    var cur = 0, k = TODAY;
    if (!test(mem.days[k])) k = keyPlus(k, -1);            // today isn't finished yet: keep yesterday's streak alive
    while (test(mem.days[k])) { cur++; k = keyPlus(k, -1); }
    var best = 0, run = 0, keys = Object.keys(mem.days).sort(), prev = null;
    keys.forEach(function (key) { if (test(mem.days[key])) { run = prev && keyPlus(prev, 1) === key ? run + 1 : 1; prev = key; best = Math.max(best, run); } });
    return { cur: cur, best: Math.max(best, cur) };
  }
  function stats() {
    var keys = Object.keys(mem.days), correct = 0, wrong = 0, played = 0, times = [];
    keys.forEach(function (k) { var s = dayStatus(mem.days[k]); if (s === 'correct') correct++; if (s === 'wrong') wrong++; if (s === 'correct' || s === 'wrong') { played++; times.push(dayTime(mem.days[k])); } });
    var st = streakFrom(function (d) { var s = dayStatus(d); return s === 'correct' || s === 'wrong'; });
    var per = {};
    GAME_IDS.forEach(function (g) {
      var p = { played: 0, solved: 0, wrong: 0, times: [] };
      keys.forEach(function (k) { var r = mem.days[k][g]; if (!r || r.status === 'open') return; p.played++; if (r.status === 'solved') { p.solved++; p.times.push(r.ms); } else p.wrong++; });
      var gs = streakFrom(function (d) { return d && d[g] && d[g].status === 'solved'; });
      p.cur = gs.cur; p.best = gs.best;
      p.bestTime = p.times.length ? Math.min.apply(null, p.times) : 0;
      p.avgTime = p.times.length ? p.times.reduce(function (a, b) { return a + b; }, 0) / p.times.length : 0;
      per[g] = p;
    });
    return { streak: st.cur, bestStreak: st.best, daysCorrect: correct, daysWrong: wrong, daysPlayed: played,
             todayTime: dayTime(mem.days[TODAY]), todayStatus: dayStatus(mem.days[TODAY]),
             bestDay: times.length ? Math.min.apply(null, times) : 0, avgDay: times.length ? times.reduce(function (a, b) { return a + b; }, 0) / times.length : 0, per: per };
  }
  function nextReset() { var p = istParts(Date.now()); return Date.UTC(p.y, p.m, p.d + 1) - 5.5 * 36e5; }
  function fmt(ms) { var s = Math.round(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); }

  window.E17Daily = {
    today: TODAY, number: N + 1, forced: !!forced, ids: GAME_IDS,
    date: (function () { var a = TODAY.split('-').map(Number); return new Date(Date.UTC(a[0], a[1] - 1, a[2])); })(),
    rec: rec,
    get: function (id) { var d = mem.days[TODAY]; return d && d[id] ? d[id] : null; },
    progress: function (id, data) { var r = rec(id); r.data = data; save(); },
    tick: function (id, ms) { var r = rec(id); if (r.status !== 'open') return; r.ms = (r.ms || 0) + ms; save(); },
    finish: function (id, status, extra) { var r = rec(id); if (r.status !== 'open') return; r.status = status; r.at = Date.now(); if (extra) r.extra = extra; save(); },
    stats: stats, fmt: fmt, nextReset: nextReset
  };
})();
