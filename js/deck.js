/* Seventeen things: a deck of index cards. Buttons, arrow keys and swipe all work. */
(function () {
  'use strict';
  var stage = document.getElementById('deckStage'), deck = document.getElementById('deck');
  if (!stage || !window.THINGS) return;
  var items = window.THINGS, PH = {};
  (window.PHOTOS || []).forEach(function (p) { PH[p.id] = p; });
  var prev = document.getElementById('deckPrev'), next = document.getElementById('deckNext'), counter = document.getElementById('deckN');
  var cards = [], cur = 0;

  items.forEach(function (it, i) {
    var a = document.createElement('article');
    a.className = 'card ' + (it.photo ? 'card--photo' : 'card--plain');
    a.setAttribute('role', 'group');
    a.setAttribute('aria-roledescription', 'slide');
    a.setAttribute('aria-label', it.n + ' of ' + items.length);
    var head = document.createElement('div');
    head.className = 'card__head';
    var num = document.createElement('span');
    num.className = 'card__num'; num.textContent = it.n;
    head.appendChild(num);
    if (it.photo && PH[it.photo]) {
      var p = PH[it.photo];
      var fig = document.createElement('figure');
      fig.className = 'card__photo pol';
      fig.innerHTML = '<div class="pol__card"><img alt="" width="600" height="750" loading="lazy" decoding="async" data-ratio="4/5"></div>';
      var img = fig.querySelector('img');
      img.src = 'assets/img/thumb/' + p.id + '.webp';
      img.style.objectPosition = (p.fx * 100) + '% ' + (p.fy * 100) + '%';
      head.appendChild(fig);
    }
    var h = document.createElement('h3'); h.className = 'card__title'; h.textContent = it.title;
    var t = document.createElement('p'); t.className = 'card__text'; t.textContent = it.text;
    a.appendChild(head); a.appendChild(h); a.appendChild(t);
    stage.appendChild(a); cards.push(a);
  });

  function render() {
    cards.forEach(function (c, i) {
      var d = i - cur;
      c.setAttribute('data-d', d);
      if (d === 0) { c.removeAttribute('inert'); c.removeAttribute('aria-hidden'); }
      else { c.setAttribute('inert', ''); c.setAttribute('aria-hidden', 'true'); }
    });
    counter.textContent = cur + 1;
  }
  function jump(to) {                       // wrap-around: reset without flying every card across
    stage.classList.add('noanim');
    cur = to; render();
    void stage.offsetWidth;
    stage.classList.remove('noanim');
  }
  function go(delta) {
    var to = cur + delta;
    if (to >= items.length) return jump(0);
    if (to < 0) return jump(items.length - 1);
    cur = to; render();
  }
  prev.addEventListener('click', function () { go(-1); });
  next.addEventListener('click', function () { go(1); });
  deck.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { go(1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { go(-1); e.preventDefault(); }
  });

  /* swipe */
  var sx = 0, sy = 0, dx = 0, down = false, moved = false, el = null;
  stage.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    down = true; moved = false; dx = 0; sx = e.clientX; sy = e.clientY; el = cards[cur];
  });
  stage.addEventListener('pointermove', function (e) {
    if (!down) return;
    if (e.pointerType === 'mouse' && !e.buttons) { end(false); return; }
    dx = e.clientX - sx;
    var dy = e.clientY - sy;
    if (!moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { moved = true; try { stage.setPointerCapture(e.pointerId); } catch (er) {} }
    if (moved) { el.classList.add('is-dragging'); el.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx / 20) + 'deg)'; }
  });
  function end(commit) {
    if (!down) return;
    down = false;
    if (el) { el.classList.remove('is-dragging'); el.style.transform = ''; }
    if (commit && moved && Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
  }
  stage.addEventListener('pointerup', function () { end(true); });
  stage.addEventListener('pointercancel', function () { end(false); });
  render();
})();
