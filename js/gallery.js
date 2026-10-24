/* Polaroid wall + lightbox (whole photo, uncropped, over a blurred fill of itself). */
(function () {
  'use strict';
  var wall = document.getElementById('wall');
  if (!wall || !window.PHOTOS) return;
  var P = window.PHOTOS, N = P.length;
  var ROT = [-2.2, 1.6, -1, 2.3, -1.7, .9, -2.5, 1.2, -.6, 2, -1.4, 1.8];

  var frag = document.createDocumentFragment();
  P.forEach(function (p, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'wall__item reveal' + (i % 4 === 1 ? ' tape' : '');
    b.style.setProperty('--r', ROT[i % ROT.length] + 'deg');
    b.style.setProperty('--tr', (i % 2 ? 4 : -5) + 'deg');
    b.setAttribute('data-i', i);
    b.setAttribute('aria-label', 'Open photo ' + (i + 1) + ' of ' + N);
    b.innerHTML = '<span class="pol__card"><img loading="lazy" decoding="async" alt="Elaika and Medhansh, photo ' + (i + 1) + ' of ' + N + '"></span>';
    var img = b.querySelector('img');
    img.width = p.w; img.height = p.h;
    img.src = 'assets/img/thumb/' + p.id + '.webp';
    frag.appendChild(b);
  });
  wall.appendChild(frag);

  // reveal as they scroll in
  var items = Array.prototype.slice.call(wall.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: .05 });
    items.forEach(function (el) { io.observe(el); });
  } else items.forEach(function (el) { el.classList.add('in'); });

  /* ---------- lightbox ---------- */
  var lb = document.getElementById('lb'), bg = document.getElementById('lbBg'), img = document.getElementById('lbImg');
  var fig = document.getElementById('lbFig'), count = document.getElementById('lbCount');
  var bClose = document.getElementById('lbClose'), bPrev = document.getElementById('lbPrev'), bNext = document.getElementById('lbNext');
  var cur = -1, opener = null, token = 0;

  function url(kind, i) { return 'assets/img/' + kind + '/' + P[(i + N) % N].id + '.webp'; }
  function show(i) {
    cur = (i + N) % N;
    var my = ++token;
    bg.style.backgroundImage = 'url("' + url('thumb', cur) + '")';
    count.textContent = (cur + 1) + ' / ' + N;
    img.classList.add('is-swapping');
    var t = new Image();
    t.onload = t.onerror = function () {
      if (my !== token) return;
      img.src = t.src;
      img.alt = 'Elaika and Medhansh, photo ' + (cur + 1) + ' of ' + N;
      img.style.transform = '';
      img.classList.remove('is-swapping');
    };
    t.src = url('full', cur);
    (new Image()).src = url('full', cur + 1);
    (new Image()).src = url('full', cur - 1);
  }
  function open(i, from) {
    opener = from || document.activeElement;
    lb.hidden = false;
    document.body.classList.add('lb-open');
    show(i);
    bClose.focus();
  }
  function close() {
    lb.hidden = true;
    document.body.classList.remove('lb-open');
    token++;
    if (opener && opener.focus) opener.focus({ preventScroll: true });
  }
  wall.addEventListener('click', function (e) {
    var b = e.target.closest('.wall__item');
    if (b) open(+b.getAttribute('data-i'), b);
  });
  bClose.addEventListener('click', close);
  bPrev.addEventListener('click', function () { show(cur - 1); });
  bNext.addEventListener('click', function () { show(cur + 1); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') show(cur + 1);
    else if (e.key === 'ArrowLeft') show(cur - 1);
    else if (e.key === 'Tab') {                         // keep focus inside the viewer
      var f = [bClose, bPrev, bNext], i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });

  /* swipe: left/right to browse, down to close. The photo follows the finger. */
  var sx = 0, sy = 0, dx = 0, dy = 0, down = false, moved = false;
  lb.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.lb__btn')) return;
    down = true; moved = false; dx = dy = 0; sx = e.clientX; sy = e.clientY;
  });
  lb.addEventListener('pointermove', function (e) {
    if (!down) return;
    if (e.pointerType === 'mouse' && !e.buttons) { release(); return; }
    dx = e.clientX - sx; dy = e.clientY - sy;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) moved = true;
    if (moved) img.style.transform = Math.abs(dx) >= Math.abs(dy) ? 'translateX(' + dx + 'px)' : 'translateY(' + Math.max(0, dy) + 'px)';
  });
  function release() {
    if (!down) return;
    down = false;
    if (moved && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) { show(cur + (dx < 0 ? 1 : -1)); }
    else if (moved && dy > 90 && dy > Math.abs(dx)) { img.style.transform = ''; close(); }
    else img.style.transform = '';
  }
  lb.addEventListener('pointerup', release);
  lb.addEventListener('pointercancel', release);
  // tap outside the photo closes it
  lb.addEventListener('click', function (e) {
    if (moved) { moved = false; return; }
    if (e.target === lb || e.target === fig || e.target.classList.contains('lb__bg')) close();
  });
})();
