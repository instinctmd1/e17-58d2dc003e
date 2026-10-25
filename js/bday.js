/* Birthday banner (live days-alive counter since 26.10.2009, IST) + 17 tap-to-blow candles. No dependencies. */
(function () {
  'use strict';

  /* ---------- days alive ---------- */
  var BORN = Date.UTC(2009, 9, 25, 18, 30, 0);              // 26 Oct 2009, 00:00 IST
  var title = document.getElementById('bdTitle'), kicker = document.getElementById('bdKicker');
  var dEl = document.getElementById('bdDays'), hEl = document.getElementById('bdH'), mEl = document.getElementById('bdM'), sEl = document.getElementById('bdS');
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function istNow() { return new Date(Date.now() + 5.5 * 36e5); }  // read with getUTC* = IST wall clock
  if (title) {
    var ist = istNow();
    var isBirthday = ist.getUTCMonth() === 9 && ist.getUTCDate() === 26;
    if (!isBirthday) {
      kicker.textContent = 'since 26 · 10 · 2009';
      title.innerHTML = 'the world got <em>you</em>';
    }
    var tick = function () {
      var diff = Date.now() - BORN;
      dEl.textContent = Math.floor(diff / 864e5).toLocaleString('en-IN');
      hEl.textContent = pad(Math.floor(diff % 864e5 / 36e5));
      mEl.textContent = pad(Math.floor(diff % 36e5 / 6e4));
      sEl.textContent = pad(Math.floor(diff % 6e4 / 1e3));
    };
    tick(); setInterval(tick, 1000);
  }

  /* ---------- 17 candles ---------- */
  var row = document.getElementById('candles');
  if (!row) return;
  var done = document.getElementById('cakeDone'), relight = document.getElementById('relight'), countEl = document.getElementById('cakeCount');
  var N = 17, out = 0, candles = [], dragging = false;

  for (var i = 0; i < N; i++) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'candle';
    b.setAttribute('aria-label', 'Candle ' + (i + 1) + ' of 17, lit. Tap to blow it out');
    b.innerHTML = '<span class="candle__smoke" aria-hidden="true"></span><span class="candle__flame" aria-hidden="true"></span><span class="candle__stick" aria-hidden="true"></span>';
    row.appendChild(b);
    candles.push(b);
  }

  function status() { countEl.textContent = (N - out) + ' of 17 still lit'; }
  function blow(c) {
    if (!c || c.classList.contains('is-out')) return;
    c.classList.add('is-out');
    c.setAttribute('aria-label', 'Candle ' + (candles.indexOf(c) + 1) + ' of 17, blown out');
    out++;
    status();
    if (out === N) finish();
  }
  function finish() {
    countEl.textContent = 'all 17 out';
    done.hidden = false;
    relight.hidden = false;
    setTimeout(function () {
      if (window.fireConfetti) {
        var r = done.getBoundingClientRect();
        window.fireConfetti({ x: window.innerWidth / 2, y: Math.max(140, Math.min(window.innerHeight - 120, r.top)) });
      }
    }, 250);
  }
  function relightAll() {
    candles.forEach(function (c, k) {
      c.classList.remove('is-out');
      c.setAttribute('aria-label', 'Candle ' + (k + 1) + ' of 17, lit. Tap to blow it out');
    });
    out = 0; done.hidden = true; relight.hidden = true; status();
  }

  // tap one at a time, or drag a finger across several (like blowing along the cake)
  row.addEventListener('click', function (e) { blow(e.target.closest('.candle')); });
  row.addEventListener('pointerdown', function (e) { dragging = true; blow(e.target.closest('.candle')); });
  row.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var el = document.elementFromPoint(e.clientX, e.clientY);
    blow(el && el.closest ? el.closest('.candle') : null);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { row.addEventListener(t, function () { dragging = false; }); });
  relight.addEventListener('click', relightAll);
  status();
})();
