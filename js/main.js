/* for E.: gate, music, scroll reveals, parallax, letter, film, countdown, finale. No dependencies. */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = function () { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; };

  var CODE = '0512';                         // 5 December, DDMM
  var body = document.body;
  var main = $('#main'), gate = $('#gate'), form = $('#gate-form'), status = $('#gate-status');
  var boxes = $$('.code__d');
  var audio = $('#bgm'), mute = $('#mute');
  var busy = false;

  /* ---------- photos: fill src + face-aware crop from the manifest ---------- */
  var PH = {};
  (window.PHOTOS || []).forEach(function (p) { PH[p.id] = p; });
  $$('img[data-photo]').forEach(function (img) {
    var p = PH[img.getAttribute('data-photo')];
    if (!p) return;
    img.src = 'assets/img/thumb/' + p.id + '.webp';
    img.style.objectPosition = (p.fx * 100) + '% ' + (p.fy * 100) + '%';
    img.decoding = 'async';
    if (!img.closest('.hero')) img.loading = 'lazy';
  });

  /* ---------- music ---------- */
  var wantMusic = false, pausedForHide = false, pausedForFilm = false, fadeTimer = 0;
  function setMusicUI(on) {
    wantMusic = on;
    body.classList.toggle('music-on', on);
    mute.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  function fadeTo(v, ms) {
    clearInterval(fadeTimer);
    var from = audio.volume, steps = Math.max(1, Math.round(ms / 50)), i = 0;
    fadeTimer = setInterval(function () {
      i++; audio.volume = Math.max(0, Math.min(1, from + (v - from) * (i / steps)));
      if (i >= steps) clearInterval(fadeTimer);
    }, 50);
  }
  function playMusic() {
    playRequested = true;
    audio.preload = 'auto';
    audio.muted = false;
    audio.volume = 0;
    var p;
    try { p = audio.play(); } catch (e) { setMusicUI(false); return; }
    if (p && p.then) {
      p.then(function () { setMusicUI(true); fadeTo(.5, 2200); })
       .catch(function () { setMusicUI(false); });
    } else { setMusicUI(true); }
  }
  mute.addEventListener('click', function () {
    if (wantMusic && (!audio.paused || pausedForFilm)) { pausedForFilm = false; audio.pause(); setMusicUI(false); }
    else { pausedForFilm = false; playMusic(); }
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (!audio.paused) { pausedForHide = true; audio.pause(); } }
    else if (pausedForHide) { pausedForHide = false; if (wantMusic) audio.play().catch(function () {}); }
  });
  window.E17 = {
    duckMusic: function () { if (!audio.paused && wantMusic) { pausedForFilm = true; audio.pause(); } },
    restoreMusic: function () { if (pausedForFilm && wantMusic) { pausedForFilm = false; audio.play().catch(function () {}); } }
  };

  /* iOS only lets a media element play later if it was started inside a real tap. Typing on the soft keyboard
     may not count, so the first tap on the gate "unlocks" the element with a silent start, then pauses it. */
  var primed = false, playRequested = false;
  function prime() {
    if (primed) return;
    primed = true;
    try {
      audio.muted = true;
      var p = audio.play();
      var settle = function () { if (!playRequested) { audio.pause(); try { audio.currentTime = 0; } catch (e) {} } audio.muted = false; };
      if (p && p.then) p.then(settle, function () { audio.muted = false; });
      else settle();
    } catch (e) { audio.muted = false; }
  }
  gate.addEventListener('click', prime, { once: true });
  gate.addEventListener('touchend', prime, { once: true, passive: true });

  /* ---------- gate ---------- */
  function digits() { return boxes.map(function (b) { return b.value; }).join(''); }
  function wrong() {
    busy = true;
    form.classList.remove('is-wrong'); void form.offsetWidth; form.classList.add('is-wrong');
    status.textContent = 'Not quite. Try again.';
    setTimeout(function () {
      boxes.forEach(function (b) { b.value = ''; });
      form.classList.remove('is-wrong'); status.textContent = '';
      busy = false; boxes[0].focus();
    }, 700);
  }
  function enterSite(animate) {
    gate.classList.add('is-open');
    var wait = animate && !reduced() ? 750 : 0;
    setTimeout(function () {
      gate.classList.add('is-gone');
      body.classList.remove('locked');
      main.removeAttribute('inert');
      mute.hidden = false;
      body.classList.add('ready');
      main.setAttribute('tabindex', '-1');
      main.focus({ preventScroll: true });
      window.scrollTo(0, 0);
      setTimeout(function () { gate.style.display = 'none'; }, 1000);
    }, wait);
  }
  function unlock() {
    busy = true;
    boxes.forEach(function (b) { b.blur(); });
    playMusic();                              // still inside the tap/keypress that finished the code
    try { sessionStorage.setItem('e17-open', '1'); } catch (e) {}
    enterSite(true);
  }
  function check() { if (digits() === CODE) unlock(); else wrong(); }

  function fill(from, str) {
    str.slice(0, boxes.length - from).split('').forEach(function (c, k) { boxes[from + k].value = c; });
    boxes[Math.min(from + str.length, boxes.length - 1)].focus();
    if (digits().length === boxes.length) check();
  }
  boxes.forEach(function (b, i) {
    b.addEventListener('focus', function () { try { b.select(); } catch (e) {} });
    b.addEventListener('input', function (e) {
      if (busy) { b.value = ''; return; }
      if (e.inputType === 'deleteContentBackward' && !b.value) { if (i > 0) boxes[i - 1].focus(); return; }
      var typed = (e.data || '').replace(/\D/g, '');
      if (typed.length > 1) { fill(i, typed); return; }          // several digits at once (autofill, paste-like input)
      b.value = b.value.replace(/\D/g, '').slice(-1);
      if (b.value && i < boxes.length - 1) boxes[i + 1].focus();
      if (digits().length === boxes.length) check();
    });
    b.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && !b.value && i > 0) { boxes[i - 1].focus(); boxes[i - 1].value = ''; e.preventDefault(); }
      else if (e.key === 'ArrowLeft' && i > 0) { boxes[i - 1].focus(); e.preventDefault(); }
      else if (e.key === 'ArrowRight' && i < boxes.length - 1) { boxes[i + 1].focus(); e.preventDefault(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (digits().length === boxes.length && !busy) check(); }
    });
    b.addEventListener('paste', function (e) {
      var t = ((e.clipboardData || window.clipboardData).getData('text') || '').replace(/\D/g, '').slice(0, 4);
      if (!t || busy) return;
      e.preventDefault(); fill(0, t);
    });
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); if (digits().length === boxes.length && !busy) check(); });

  var already = false;
  try { already = sessionStorage.getItem('e17-open') === '1'; } catch (e) {}
  if (already) { enterSite(false); } else { setTimeout(function () { boxes[0].focus(); }, 300); }

  /* ---------- scroll reveals ---------- */
  var revealEls = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else { revealEls.forEach(function (el) { el.classList.add('in'); }); }

  /* ---------- gentle parallax on the hero polaroids ---------- */
  var par = $$('.hero [data-parallax]').map(function (f) { return { el: $('.pol__px', f), k: parseFloat(f.getAttribute('data-parallax')) }; });
  var hero = $('.hero'), ticking = false;
  function paint() {
    ticking = false;
    var y = window.scrollY;
    if (y > hero.offsetHeight + 200) return;
    par.forEach(function (p) { p.el.style.transform = 'translate3d(0,' + (-y * p.k).toFixed(1) + 'px,0)'; });
  }
  if (par.length && !reduced()) {
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
  }

  /* ---------- the letter: ink dries in as you read ---------- */
  (function () {
    var L = window.LETTER, host = $('#letterBody');
    if (!L || !host) return;
    function para(text, cls) {
      var p = document.createElement('p');
      if (cls) p.className = cls;
      var words = text.split(' ');
      words.forEach(function (w, i) {
        var s = document.createElement('span');
        s.className = 'w'; s.style.setProperty('--i', Math.min(i, 70)); s.textContent = w;
        p.appendChild(s);
        if (i < words.length - 1) p.appendChild(document.createTextNode(' '));
      });
      return p;
    }
    var ps = [para(L.greeting, 'letter__greet')];
    L.body.forEach(function (t) { ps.push(para(t)); });
    ps.push(para(L.closing, 'letter__close'));
    ps.push(para(L.sign, 'letter__sign'));
    ps.forEach(function (p) { host.appendChild(p); });
    if ('IntersectionObserver' in window) {
      var lio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); lio.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -12% 0px', threshold: .2 });
      ps.forEach(function (p) { lio.observe(p); });
    } else { $('#letterCard').classList.add('letter--static'); }
  })();

  /* ---------- the film ---------- */
  (function () {
    var v = $('#filmVideo'), soon = $('#filmSoon'), phone = $('.phone');
    if (!v) return;
    function missing() { phone.classList.add('is-missing'); soon.hidden = false; v.removeAttribute('controls'); }
    function present() { phone.classList.remove('is-missing'); soon.hidden = true; v.setAttribute('controls', ''); }
    var src = v.querySelector('source');
    if (src) src.addEventListener('error', missing);
    v.addEventListener('error', missing);
    v.addEventListener('loadedmetadata', present);
    v.addEventListener('play', function () { if (window.E17) window.E17.duckMusic(); });
    v.addEventListener('pause', function () { if (window.E17) window.E17.restoreMusic(); });
    v.addEventListener('ended', function () { if (window.E17) window.E17.restoreMusic(); });
  })();

  /* ---------- countdown to 05.12.2026 00:00 IST ---------- */
  (function () {
    var target = Date.UTC(2026, 11, 4, 18, 30, 0);       // 5 Dec 2026 00:00 at UTC+5:30
    var d = $('#cDays'), h = $('#cHours'), m = $('#cMins'), s = $('#cSecs'), row = $('#countRow');
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) {
        row.innerHTML = '<p class="count__line">one year of us. today.</p>';
        clearInterval(t); return;
      }
      d.textContent = Math.floor(diff / 864e5);
      h.textContent = pad(Math.floor(diff % 864e5 / 36e5));
      m.textContent = pad(Math.floor(diff % 36e5 / 6e4));
      s.textContent = pad(Math.floor(diff % 6e4 / 1e3));
    }
    var t = setInterval(tick, 1000); tick();
  })();

  /* ---------- finale ---------- */
  (function () {
    var fin = $('.finale__in'), btn = $('#again'), fired = false;
    function burst() {
      var r = $('.finale__title').getBoundingClientRect();
      var y = Math.min(Math.max(r.top + r.height / 2, 120), window.innerHeight - 100);
      window.fireConfetti({ x: window.innerWidth / 2, y: y });
    }
    if ('IntersectionObserver' in window) {
      var fio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting && !fired) { fired = true; burst(); } });
      }, { threshold: .55 });
      fio.observe(fin);
    }
    btn.addEventListener('click', burst);
  })();
})();
