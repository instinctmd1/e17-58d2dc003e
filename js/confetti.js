/* Confetti: baby pink + navy (a little red, a little cream). Canvas, no dependencies.
   window.fireConfetti({ x, y, count }) throws it from a viewport point (defaults: centre). */
(function () {
  var canvas = document.getElementById('confetti');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var PALETTE = [
    ['#1B2A4A', 34], ['#F4C2CF', 22], ['#E58FA7', 14], ['#FBE3EA', 12], ['#C8102E', 6], ['#FFFDF9', 12]
  ];
  var raf = 0;

  function pick() {
    var total = 0, i;
    for (i = 0; i < PALETTE.length; i++) total += PALETTE[i][1];
    var r = Math.random() * total;
    for (i = 0; i < PALETTE.length; i++) { if (r < PALETTE[i][1]) return PALETTE[i][0]; r -= PALETTE[i][1]; }
    return PALETTE[0][0];
  }
  function reduced() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  function size() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth, h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: w, h: h };
  }

  window.fireConfetti = function (opts) {
    opts = opts || {};
    cancelAnimationFrame(raf);
    var s = size();
    var ox = opts.x != null ? opts.x : s.w / 2;
    var oy = opts.y != null ? opts.y : s.h * 0.55;
    var count = opts.count || (s.w < 600 ? 190 : 280);

    if (reduced()) {                       // a still, quiet scatter that fades. No motion.
      ctx.clearRect(0, 0, s.w, s.h);
      for (var k = 0; k < 40; k++) {
        ctx.fillStyle = pick();
        ctx.fillRect(Math.random() * s.w, s.h * .25 + Math.random() * s.h * .5, 6, 9);
      }
      canvas.style.transition = 'opacity 1.2s'; canvas.style.opacity = 1;
      setTimeout(function () { canvas.style.opacity = 0; }, 900);
      setTimeout(function () { ctx.clearRect(0, 0, s.w, s.h); canvas.style.transition = ''; canvas.style.opacity = ''; }, 2200);
      return;
    }

    var parts = [];
    function spawn(n, x, y, aim, spread, v0, v1) {
      for (var i = 0; i < n; i++) {
        var a = aim + (Math.random() - .5) * spread, v = v0 + Math.random() * (v1 - v0);
        parts.push({
          x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          w: 7 + Math.random() * 7, h: 5 + Math.random() * 6,
          rot: Math.random() * 6.28, vr: (Math.random() - .5) * .35,
          g: .17 + Math.random() * .08, drag: .987 - Math.random() * .008,
          flip: Math.random() * 6.28, vf: .08 + Math.random() * .12,
          c: pick(), round: Math.random() < .22
        });
      }
    }
    var up = -Math.PI / 2, small = s.w < 600;
    var per = Math.round(count / 3);
    spawn(per, s.w * .06, s.h * .86, up + .5, 1.0, 12, 24);         // two corner cannons, aimed inward
    spawn(per, s.w * .94, s.h * .86, up - .5, 1.0, 12, 24);
    spawn(count - 2 * per, ox, oy, up, 1.7, 7, small ? 15 : 19);    // and a pop from the heading
    var t0 = performance.now(), last = t0, LIFE = 4400;
    function frame(now) {
      var el = now - t0, k = Math.min(2.5, (now - last) / 16.667); last = now;      // frame-rate independent
      ctx.clearRect(0, 0, s.w, s.h);
      var alive = false;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        var dr = Math.pow(p.drag, k);
        p.vx *= dr; p.vy = p.vy * dr + p.g * k;
        p.x += p.vx * k; p.y += p.vy * k; p.rot += p.vr * k; p.flip += p.vf * k;
        if (p.y < s.h + 20) alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, (LIFE - el) / 900));
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        var sy = Math.cos(p.flip);
        if (p.round) { ctx.beginPath(); ctx.ellipse(0, 0, p.w / 2.4, Math.abs(sy) * p.w / 2.4 + .6, 0, 0, 6.28); ctx.fill(); }
        else ctx.fillRect(-p.w / 2, -p.h / 2 * sy, p.w, p.h * Math.max(.15, Math.abs(sy)));
        ctx.restore();
      }
      if (alive && el < LIFE) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, s.w, s.h);
    }
    raf = requestAnimationFrame(frame);
  };
})();
