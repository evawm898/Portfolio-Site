/* Defining Durability — the figures.
   Same frame as Quantifying Comfort's touch figures, so the two pages read
   as a set. Each figure is one canvas holding two things kept apart: the
   SCENE (the fabric, drawn as fabric in teal, the machine in muted grey,
   abradants in tan) and the CHART (the instrument's output, in orange, on its
   own axes, drawn live as the test runs). Every count, curve and end point is
   illustrative: the shapes follow the published behaviour, the values are
   not measurements.

   Shared rules, enforced here rather than per figure:
   - orange (#D85A30) is the chart's and nothing in a scene is drawn in it;
     the chart's words are ink, never orange;
   - a test plays once when its figure first scrolls into view, holds its end
     state, and replays on the Restart button, a click on the canvas, or
     Enter/Space on the canvas;
   - an option toggle (and the page's Fabric A / B toggle, for the three
     abrasion machines) restarts the test;
   - prefers-reduced-motion shows the end state and never animates;
   - below 560 px of figure width the scene stacks above the chart, so every
     figure works at a 380 px viewport. */
(() => {
  'use strict';

  const CHART = '#D85A30';
  const STILL = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const rootStyle = getComputedStyle(document.documentElement);
  const cssVar = (n, f) => rootStyle.getPropertyValue(n).trim() || f;
  const colours = () => ({
    ink: cssVar('--ink', '#e9ecec'), dim: cssVar('--ink-dim', '#8b9494'), faint: cssVar('--ink-faint', '#565f5f'),
    line: cssVar('--line-strong', '#34393a'), bg: cssVar('--black-raised', '#0c0e0e'), mono: cssVar('--mono', 'monospace'),
  });
  // fabric: teal tones; machine: muted grey; abradant: tan
  const TEAL = { dark: '#0f3b3c', deep: '#1c6b6b', mid: '#2fa3a3', light: '#6fb7ae', hi: '#a9dcd3' };
  const MACH = { fill: '#3d4444', edge: '#7d8686', dark: '#2a2f2f', light: '#5a6262' };
  const TAN = { base: '#B9A47A', dark: '#8c7b57', light: '#d6c69e' };
  const BG = '#0c0e0e';

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, f) => a + (b - a) * f;
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const smooth = f => f * f * (3 - 2 * f);
  const hash = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const fmt = n => Math.round(n).toLocaleString('en-US');

  // ---------------------------------------------------------- Fabric A / B
  // Two HYPOTHETICAL fabrics for the three abrasion machines. The numbers are
  // made up so that the ranking flips between machines; they describe no real
  // product. Martindale and Taber rank A first, Wyzenbeek ranks B first.
  const ABR = {
    A: { mart: 40000, wyz: 30000, taber: 62 },
    B: { mart: 25000, wyz: 50000, taber: 95 },
  };
  let abrFab = 'A';
  document.querySelectorAll('[data-abr]').forEach(b => b.addEventListener('click', () => {
    abrFab = b.dataset.abr;
    document.querySelectorAll('[data-abr]').forEach(x => x.setAttribute('aria-pressed', x.dataset.abr === abrFab ? 'true' : 'false'));
    document.dispatchEvent(new CustomEvent('dd-fab'));
  }));

  // ---------------------------------------------------------------- frame

  function twoUp(w, o) {
    if (w < 560) {
      const sh = Math.round(clamp(w * o.ratio, o.min || 180, o.max || 250));
      const ch = Math.round(clamp(w * 0.55, 170, 210));
      return { H: sh + 14 + ch, stacked: true, scene: { x: 0, y: 0, w, h: sh }, chart: { x: 0, y: sh + 14, w, h: ch }, rules: [['h', sh + 7]] };
    }
    const H = o.wideH || 290, sw = Math.round(w * (o.split || 0.56));
    return { H, stacked: false, scene: { x: 0, y: 0, w: sw, h: H }, chart: { x: sw + 16, y: 0, w: w - sw - 16, h: H }, rules: [['v', sw + 8]] };
  }

  function figure(cfg) {
    const fig = document.getElementById(cfg.id);
    if (!fig) return;
    const c = fig.querySelector('canvas'), ctx = c.getContext('2d');
    const out = fig.querySelector('[data-readout]');
    const opt = {};
    const optBtns = [...fig.querySelectorAll('[data-opt]')];
    optBtns.forEach(b => { const [k, v] = b.dataset.opt.split(':'); if (b.getAttribute('aria-pressed') === 'true') opt[k] = v; });
    let w = 0, h = 0, L = null, el = 0, last = 0, running = false, visible = true;

    function layout() {
      const r = c.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(240, Math.round(r.width));
      L = cfg.layout(w);
      h = L.H;
      if (c.style.height !== h + 'px') c.style.height = h + 'px';
      if (c.width !== Math.round(w * d) || c.height !== Math.round(h * d)) { c.width = Math.round(w * d); c.height = Math.round(h * d); }
      ctx.setTransform(d, 0, 0, d, 0, 0);
    }

    function render() {
      layout();
      const C = colours();
      ctx.clearRect(0, 0, w, h);
      const st = { ctx, C, w, h, L, opt, fab: abrFab, t: clamp(el / cfg.D, 0, 1), el: Math.min(el, cfg.D), D: cfg.D, scene: L.scene, chart: L.chart, stacked: L.stacked };
      ctx.save(); cfg.draw(st); ctx.restore();
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath();
      for (const [k, v] of L.rules || []) {
        if (k === 'h') { const y = Math.round(v) + 0.5; ctx.moveTo(0, y); ctx.lineTo(w, y); }
        else { const x = Math.round(v) + 0.5; ctx.moveTo(x, 6); ctx.lineTo(x, h - 6); }
      }
      ctx.stroke();
      if (out) out.innerHTML = cfg.readout(st);
    }

    function tick(now) {
      if (!running) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      if (visible) { el += dt; render(); } else last = 0;
      if (el >= cfg.D) { running = false; return; }
      requestAnimationFrame(tick);
    }

    function restart() {
      el = STILL ? cfg.D : 0; last = 0;
      render();
      if (!STILL && !running) { running = true; requestAnimationFrame(tick); }
    }

    optBtns.forEach(b => b.addEventListener('click', () => {
      const [k, v] = b.dataset.opt.split(':');
      opt[k] = v;
      optBtns.forEach(x => { if (x.dataset.opt.split(':')[0] === k) x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      restart();
    }));
    fig.querySelectorAll('[data-restart]').forEach(b => b.addEventListener('click', restart));
    if (cfg.abrasion) document.addEventListener('dd-fab', restart);
    c.tabIndex = 0;
    c.addEventListener('click', restart);
    c.addEventListener('keydown', ev => { if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); restart(); } });
    window.addEventListener('resize', render);

    render();
    if (STILL) { restart(); return; }
    if ('IntersectionObserver' in window) {
      let first = true;
      new IntersectionObserver(es => {
        visible = es[0].isIntersecting;
        if (visible && first) { first = false; restart(); }
      }, { threshold: 0.3 }).observe(c);
    } else restart();
  }

  // ---------------------------------------------------------------- kit

  // Axes for the instrument's output: grey frame, orange data, ink words, and
  // a title line that says this is the instrument and the values are illustrative.
  function axes(st, o, rect) {
    const { ctx, C } = st, r = rect || st.chart;
    const padL = o.padL || 36, padR = 10, padT = 40, padB = 26;
    const px = r.x + padL, py = r.y + padT, pw = r.w - padL - padR, ph = r.h - padT - padB;
    const X = v => px + (v - o.x0) / (o.x1 - o.x0) * pw;
    const Y = v => py + ph - (v - o.y0) / (o.y1 - o.y0) * ph;
    ctx.save();
    ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.font = '500 10px ' + C.mono; ctx.fillStyle = C.ink;
    ctx.fillText(o.title, r.x + 2, r.y + 4);
    ctx.font = '9.5px ' + C.mono; ctx.fillStyle = C.ink;
    ctx.fillText('instrument output', r.x + 2, r.y + 17);
    const lw = ctx.measureText('instrument output').width;
    ctx.fillStyle = C.dim; ctx.fillText(' · illustrative', r.x + 2 + lw, r.y + 17);
    ctx.strokeStyle = C.faint; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(px + 0.5, py - 4); ctx.lineTo(px + 0.5, py + ph + 0.5); ctx.lineTo(px + pw, py + ph + 0.5); ctx.stroke();
    ctx.font = '9px ' + C.mono; ctx.fillStyle = C.dim;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (const [v, lab] of o.yTicks || []) { const y = Math.round(Y(v)) + 0.5; ctx.beginPath(); ctx.moveTo(px - 3, y); ctx.lineTo(px, y); ctx.stroke(); ctx.fillText(lab, px - 5, y); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (const [v, lab] of o.xTicks || []) { const x = Math.round(X(v)) + 0.5; ctx.beginPath(); ctx.moveTo(x, py + ph); ctx.lineTo(x, py + ph + 3); ctx.stroke(); ctx.fillText(lab, x, py + ph + 5); }
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText(o.yLabel, px + 4, py - 3);
    ctx.textAlign = 'right';
    ctx.fillText(o.xLabel, px + pw, py + ph - 3);
    ctx.restore();
    return { X, Y, px, py, pw, ph };
  }
  function plot(ctx, pts, X, Y, o) {
    if (pts.length < 2) return;
    o = o || {};
    ctx.save(); ctx.strokeStyle = CHART; ctx.lineWidth = o.lw || 1.8; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.dash) ctx.setLineDash(o.dash);
    ctx.beginPath(); pts.forEach(([a, b], i) => i ? ctx.lineTo(X(a), Y(b)) : ctx.moveTo(X(a), Y(b))); ctx.stroke();
    ctx.restore();
  }
  function dot(ctx, x, y, r) { ctx.fillStyle = CHART; ctx.beginPath(); ctx.arc(x, y, r || 3.5, 0, Math.PI * 2); ctx.fill(); }
  function endMark(st, ax, x, text) {   // the end point on a chart: a dashed drop line and an ink label
    const { ctx, C } = st, xx = Math.round(x) + 0.5;
    ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = C.dim; ctx.beginPath(); ctx.moveTo(xx, ax.py); ctx.lineTo(xx, ax.py + ax.ph); ctx.stroke(); ctx.restore();
    label(st, text, x - 4, ax.py + 8, 'right', C.ink);
  }
  function label(st, text, x, y, align, col, size) {
    const { ctx, C } = st; ctx.save(); ctx.font = (size || 9.5) + 'px ' + C.mono; ctx.fillStyle = col || C.dim;
    ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y); ctx.restore();
  }
  // a live counter in the scene: key, value, and the word "illustrative"
  function counter(st, x, y, key, value) {
    const { ctx, C } = st;
    ctx.save(); ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.font = '9px ' + C.mono; ctx.fillStyle = C.dim; ctx.fillText(key, x, y);
    ctx.font = '500 15px ' + C.mono; ctx.fillStyle = C.ink; ctx.fillText(value, x, y + 11);
    const vw = ctx.measureText(value).width;
    ctx.font = '9px ' + C.mono; ctx.fillStyle = C.dim; ctx.fillText('illustrative', x + vw + 7, y + 16);
    ctx.restore();
  }
  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function machine(ctx, x, y, w, h, r) { rrect(ctx, x, y, w, h, r || 2); ctx.fillStyle = MACH.fill; ctx.fill(); ctx.strokeStyle = MACH.edge; ctx.lineWidth = 1; ctx.stroke(); }
  function arrow(ctx, x0, y0, x1, y1, col, hd) {
    const a = Math.atan2(y1 - y0, x1 - x0), k = hd || 5;
    ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - k * Math.cos(a - 0.45), y1 - k * Math.sin(a - 0.45)); ctx.lineTo(x1 - k * Math.cos(a + 0.45), y1 - k * Math.sin(a + 0.45)); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // a plain weave seen face on: a checker of short warp and weft floats
  function plainWeave(ctx, x, y, w, h, p) {
    ctx.fillStyle = TEAL.dark; ctx.fillRect(x, y, w, h);
    const g = Math.max(0.6, p * 0.14);
    for (let j = 0; j * p < h; j++) for (let i = 0; i * p < w; i++) {
      const cx = x + i * p, cy = y + j * p;
      if ((i + j) % 2) { ctx.fillStyle = TEAL.mid; ctx.fillRect(cx + g, cy, p - 2 * g, p); }
      else { ctx.fillStyle = TEAL.light; ctx.fillRect(cx, cy + g, p, p - 2 * g); }
    }
  }
  // a knit face: rows of V stitches
  function knitFace(ctx, x, y, w, h, p) {
    ctx.fillStyle = TEAL.deep; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = TEAL.mid; ctx.lineWidth = Math.max(1, p * 0.22); ctx.lineCap = 'round';
    const rh = p * 0.8;
    for (let j = -1; j * rh < h + rh; j++) for (let i = 0; i * p < w + p; i++) {
      const cx = x + i * p + p / 2, cy = y + j * rh;
      ctx.beginPath(); ctx.moveTo(cx - p * 0.38, cy); ctx.quadraticCurveTo(cx - p * 0.1, cy + rh * 0.55, cx, cy + rh * 1.15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + p * 0.38, cy); ctx.quadraticCurveTo(cx + p * 0.1, cy + rh * 0.55, cx, cy + rh * 1.15); ctx.stroke();
    }
  }
  // tan abradant texture inside a clip already set
  function abradantTexture(ctx, x, y, w, h, n, seed) {
    ctx.fillStyle = TAN.base; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = TAN.dark; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.55;
    for (let k = 0; k < n; k++) {
      const px = x + hash(k + seed) * w, py = y + hash(k * 1.7 + seed + 3) * h, a = hash(k * 2.3 + seed) * Math.PI;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + 3 * Math.cos(a + 1), py + 3 * Math.sin(a + 1), px + 5 * Math.cos(a), py + 5 * Math.sin(a)); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ============================================================ abrasion

  // ---- Martindale. Top view. The sample disc moves over a stationary wool
  // abradant along the Lissajous figure: x = A sin 2πs, y = A sin(2πs + φ),
  // with φ sweeping 0 → π over 16 rubs and repeating, so a straight line opens
  // into a widening ellipse and closes to the perpendicular line. At each
  // repeat the disc is at the centre, so the path never jumps. The disc's
  // path is drawn at a watchable speed; the counter runs fast.
  (() => {
    const RUBS_PER_S = 1.6;
    const pos = (s, cx, cy, A) => { const ph = Math.PI * ((s % 16) / 16); return [cx + A * Math.sin(2 * Math.PI * s), cy + A * Math.sin(2 * Math.PI * s + ph)]; };
    // the sample face: a lattice of thread crossings; the ones near the centre wear first
    const NODES = [];
    const NG = 13;
    for (let j = 0; j < NG; j++) for (let i = 0; i < NG; i++) {
      const u = (i + 0.5) / NG * 2 - 1, v = (j + 0.5) / NG * 2 - 1, r = Math.hypot(u, v);
      if (r > 0.98) continue;
      NODES.push({ i, j, u, v, thr: 0.80 + 0.55 * Math.pow(r, 1.3) + 0.05 * (hash(i * 31 + j) - 0.5) });
    }
    const lostAt = w => NODES.reduce((n, d) => n + (d.thr < w ? 1 : 0), 0);
    const LOST_END = lostAt(1);

    figure({
      id: 'ddMart', abrasion: true, D: 14,
      layout: w => twoUp(w, { ratio: 0.64, min: 230, max: 250, wideH: 300, split: 0.6 }),
      draw(st) {
        const { ctx, C } = st, s = st.scene, end = ABR[st.fab].mart, wear = st.t, cyc = end * st.t;
        counter(st, s.x + 2, s.y + 2, 'CYCLES', fmt(cyc));
        const insetW = Math.round(clamp(s.w * 0.3, 96, 130));
        const Ra = Math.min((s.h - 66) / 2, (s.w - insetW - 28) / 2);
        const cx = s.x + 6 + Ra, cy = s.y + 40 + Ra;
        machine(ctx, cx - Ra - 5, cy - Ra - 5, 2 * Ra + 10, 2 * Ra + 10, 4);
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, Ra, 0, Math.PI * 2); ctx.clip();
        abradantTexture(ctx, cx - Ra, cy - Ra, 2 * Ra, 2 * Ra, 170, 5);
        ctx.restore();
        ctx.strokeStyle = TAN.dark; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, Ra, 0, Math.PI * 2); ctx.stroke();
        const A = Ra * 0.42, rs = Ra * 0.27, sv = st.el * RUBS_PER_S;
        // the fading trail of the path
        ctx.lineWidth = 1.1; ctx.lineCap = 'round';
        const span = 12, n = 360;
        for (let k = 0; k < n; k++) {
          const s0 = sv - span + span * k / n, s1 = s0 + span / n;
          if (s1 < 0) continue;
          const a = pos(Math.max(0, s0), cx, cy, A), b = pos(s1, cx, cy, A);
          ctx.strokeStyle = 'rgba(233,236,236,' + (0.06 + 0.6 * Math.pow(k / n, 2)).toFixed(3) + ')';
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
        // the sample disc in its holder
        const [px, py] = pos(sv, cx, cy, A);
        ctx.save(); ctx.beginPath(); ctx.arc(px, py, rs, 0, Math.PI * 2); ctx.clip();
        plainWeave(ctx, px - rs, py - rs, 2 * rs, 2 * rs, Math.max(3, rs / 5));
        ctx.restore();
        ctx.strokeStyle = MACH.edge; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(px, py, rs + 1.5, 0, Math.PI * 2); ctx.stroke();
        label(st, 'wool abradant', cx, cy + Ra + 12, 'center');
        // inset: the sample's face as thread crossings that wear away
        const ix = (cx + Ra + 6 + s.x + s.w) / 2, ri = insetW / 2 - 4, iy = cy;
        label(st, 'sample face', ix, iy - ri - 10, 'center');
        ctx.save(); ctx.beginPath(); ctx.arc(ix, iy, ri, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = TEAL.dark; ctx.fillRect(ix - ri, iy - ri, 2 * ri, 2 * ri);
        const sp = 2 * ri / NG, at = (i, j) => [ix - ri + (i + 0.5) * sp, iy - ri + (j + 0.5) * sp];
        const alive = new Map(NODES.filter(d => d.thr >= wear).map(d => [d.i + ',' + d.j, d]));
        ctx.strokeStyle = TEAL.mid; ctx.lineWidth = Math.max(1, sp * 0.32);
        for (const d of alive.values()) {
          const f = clamp((d.thr - wear) / 0.35, 0.3, 1), [x0, y0] = at(d.i, d.j);
          ctx.globalAlpha = f;
          for (const [di, dj] of [[1, 0], [0, 1]]) if (alive.has((d.i + di) + ',' + (d.j + dj))) { const [x1, y1] = at(d.i + di, d.j + dj); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
        }
        for (const d of alive.values()) {
          const f = clamp((d.thr - wear) / 0.35, 0.3, 1), [x0, y0] = at(d.i, d.j);
          ctx.globalAlpha = 1; ctx.fillStyle = TEAL.light; ctx.beginPath(); ctx.arc(x0, y0, sp * 0.3 * f, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        for (const d of NODES) if (d.thr < wear) { const [x0, y0] = at(d.i, d.j); ctx.fillStyle = BG; ctx.beginPath(); ctx.arc(x0, y0, sp * 0.62, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
        ctx.strokeStyle = MACH.edge; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ix, iy, ri, 0, Math.PI * 2); ctx.stroke();
        if (st.t >= 1) label(st, 'hole', ix, iy + ri + 10, 'center', C.ink);
        // chart: crossings worn through against cycles
        const ax = axes(st, { title: 'WEAR vs CYCLES', x0: 0, x1: 50000, y0: 0, y1: LOST_END * 1.2, yLabel: 'crossings worn through', xLabel: 'cycles →', xTicks: [[0, '0'], [20000, '20k'], [40000, '40k']], yTicks: [[0, '0']] });
        const pts = [];
        for (let k = 0; k <= 160 * st.t; k++) { const f = k / 160; pts.push([f * end, lostAt(f)]); }
        pts.push([cyc, lostAt(wear)]);
        plot(ctx, pts, ax.X, ax.Y);
        dot(ctx, ax.X(cyc), ax.Y(lostAt(wear)), 2.8);
        if (st.t >= 1) endMark(st, ax, ax.X(end), 'end point · hole');
      },
      readout(st) {
        const end = ABR[st.fab].mart;
        if (st.t >= 1) return '<strong>Fabric ' + st.fab + '.</strong> A hole at <strong>' + fmt(end) + ' cycles</strong> (illustrative). The path rubs every direction in turn, so neither warp nor weft is favoured.';
        return '<strong>Fabric ' + st.fab + '.</strong> ' + fmt(end * st.t) + ' cycles · the path opens from a line to an ellipse and closes the other way every 16 rubs…';
      },
    });
  })();

  // ---- Wyzenbeek. Side view. A curved drum segment, faced with abradant,
  // swings back and forth about a pivot below it; the sample is clamped flat
  // at both ends under tension across the top. Because the drum face is an arc
  // about the pivot, it slides under the sample at a constant height: one
  // direction only. The inset is the sample from above, a band wearing along
  // the rub direction.
  (() => {
    const DR_PER_S = 0.75;
    const NV = 11, NH = 14;
    const VBREAK = Array.from({ length: NV }, (_, i) => ({ thr: 0.62 + 0.75 * hash(i * 7 + 2), at: 0.38 + 0.24 * hash(i * 13 + 5) }));
    const breaksAt = w => VBREAK.reduce((n, b) => n + (b.thr < w ? 1 : 0), 0);
    const BRK_END = breaksAt(1);

    figure({
      id: 'ddWyz', abrasion: true, D: 13,
      layout: w => twoUp(w, { ratio: 0.66, min: 240, max: 260, wideH: 300, split: 0.6 }),
      draw(st) {
        const { ctx, C } = st, s = st.scene, end = ABR[st.fab].wyz, dr = end * st.t, wear = st.t;
        counter(st, s.x + 2, s.y + 2, 'DOUBLE RUBS', fmt(dr));
        const insetW = Math.round(clamp(s.w * 0.28, 90, 120));
        const sideW = s.w - insetW - 14;
        const Rd = Math.min(sideW * 0.46, s.h - 80);
        const P = [s.x + sideW / 2, s.y + s.h - 16];
        const swing = 0.26 * Math.sin(2 * Math.PI * st.el * DR_PER_S), half = 0.62;
        // the drum: a frame of arms from the pivot carrying an abradant-faced arc
        ctx.save(); ctx.translate(P[0], P[1]); ctx.rotate(swing);
        ctx.strokeStyle = MACH.edge; ctx.fillStyle = MACH.fill; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.arc(0, 0, Rd - 7, -Math.PI / 2 - half, -Math.PI / 2 + half); ctx.closePath();
        ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, Rd - 1, -Math.PI / 2 - half, -Math.PI / 2 + half); ctx.lineWidth = 7; ctx.strokeStyle = TAN.base; ctx.stroke();
        ctx.lineWidth = 1; ctx.strokeStyle = TAN.dark;
        for (let k = 0; k < 40; k++) { const a = -Math.PI / 2 - half + 2 * half * (k + 0.5) / 40; ctx.beginPath(); ctx.moveTo(Math.cos(a) * (Rd - 4), Math.sin(a) * (Rd - 4)); ctx.lineTo(Math.cos(a + 0.01) * (Rd + 2), Math.sin(a + 0.01) * (Rd + 2)); ctx.stroke(); }
        ctx.restore();
        ctx.fillStyle = MACH.light; ctx.strokeStyle = MACH.edge; ctx.beginPath(); ctx.arc(P[0], P[1], 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        label(st, 'pivot', P[0] + 9, P[1], 'left');
        // the sample, flat across the top, clamped at both ends
        const top = P[1] - Rd - 5, xL = P[0] - Math.min(Rd * 0.98, sideW / 2 - 34), xR = 2 * P[0] - xL;
        ctx.fillStyle = TEAL.deep; ctx.fillRect(xL, top - 4, xR - xL, 5);
        ctx.strokeStyle = TEAL.light; ctx.lineWidth = 1;
        for (let x = xL + 2; x < xR; x += 4) { ctx.beginPath(); ctx.moveTo(x, top - 3.5); ctx.lineTo(x, top + 0.5); ctx.stroke(); }
        ctx.fillStyle = TEAL.light; ctx.fillRect(xL, top - 4, xR - xL, 1);
        machine(ctx, xL - 12, top - 10, 14, 16, 1.5); machine(ctx, xR - 2, top - 10, 14, 16, 1.5);
        arrow(ctx, xL - 14, top - 2, xL - 30 > s.x ? xL - 28 : s.x + 2, top - 2, C.dim);
        arrow(ctx, xR + 14, top - 2, xR + 28, top - 2, C.dim);
        label(st, 'sample · clamped, under tension', P[0], top - 18, 'center');
        // swing indicator
        const ay = P[1] - Rd * 0.45;
        ctx.save(); ctx.strokeStyle = C.dim; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.arc(P[0], P[1], Rd * 0.55, -Math.PI / 2 - 0.3, -Math.PI / 2 + 0.3); ctx.stroke(); ctx.restore();
        label(st, 'drum swings ↔', P[0], ay + 16, 'center');
        label(st, 'abradant', P[0] + Rd * 0.62, P[1] - Rd * 0.74, 'left');
        // inset: the sample from above
        const iw = insetW - 8, ih = Math.min(s.h - 70, iw * 1.3), ixx = s.x + s.w - insetW + 4, iyy = s.y + 46;
        label(st, 'sample face', ixx + iw / 2, iyy - 20, 'center');
        label(st, '↔ rub', ixx + iw / 2, iyy - 8, 'center');
        ctx.fillStyle = TEAL.dark; ctx.fillRect(ixx, iyy, iw, ih);
        const b0 = iyy + ih * 0.36, b1 = iyy + ih * 0.64;
        // weft, parallel to the rub: thins inside the band
        for (let j = 0; j < NH; j++) {
          const y = iyy + (j + 0.5) / NH * ih, inBand = y > b0 && y < b1;
          ctx.strokeStyle = TEAL.mid; ctx.lineWidth = inBand ? Math.max(0.6, 2.4 * (1 - wear * 0.7)) : 2.4;
          ctx.globalAlpha = inBand ? 1 - wear * 0.5 : 1;
          ctx.beginPath(); ctx.moveTo(ixx, y); ctx.lineTo(ixx + iw, y); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // warp, across the rub: breaks inside the band
        for (let i = 0; i < NV; i++) {
          const x = ixx + (i + 0.5) / NV * iw, b = VBREAK[i];
          ctx.strokeStyle = TEAL.light; ctx.lineWidth = 2.2;
          if (b.thr < wear) {
            const yb = b0 + (b1 - b0) * b.at, gap = 4;
            ctx.beginPath(); ctx.moveTo(x, iyy); ctx.lineTo(x, yb - gap); ctx.moveTo(x, yb + gap); ctx.lineTo(x, iyy + ih); ctx.stroke();
            ctx.lineWidth = 0.8; ctx.beginPath();
            for (const sgn of [-1, 1]) for (let k = -1; k <= 1; k++) { ctx.moveTo(x + k * 0.8, yb + sgn * gap); ctx.lineTo(x + k * 1.8, yb + sgn * (gap - 2.5)); }
            ctx.stroke();
          } else {
            ctx.beginPath(); ctx.moveTo(x, iyy); ctx.lineTo(x, b0); ctx.stroke();
            ctx.globalAlpha = 1 - 0.55 * wear; ctx.beginPath(); ctx.moveTo(x, b0); ctx.lineTo(x, b1); ctx.stroke(); ctx.globalAlpha = 1;
            ctx.beginPath(); ctx.moveTo(x, b1); ctx.lineTo(x, iyy + ih); ctx.stroke();
          }
        }
        ctx.fillStyle = 'rgba(185,164,122,' + (0.22 * wear).toFixed(3) + ')'; ctx.fillRect(ixx, b0, iw, b1 - b0);
        ctx.strokeStyle = MACH.edge; ctx.lineWidth = 1; ctx.strokeRect(ixx + 0.5, iyy + 0.5, iw - 1, ih - 1);
        label(st, 'worn band', ixx + iw / 2, iyy + ih + 10, 'center', wear > 0.3 ? C.ink : C.dim);
        // chart: yarn breaks against double rubs
        const ax = axes(st, { title: 'BREAKS vs DOUBLE RUBS', x0: 0, x1: 60000, y0: 0, y1: Math.max(4, BRK_END + 1), yLabel: 'yarns broken', xLabel: 'double rubs →', xTicks: [[0, '0'], [30000, '30k'], [60000, '60k']], yTicks: [[0, '0']] });
        const pts = [];
        for (let k = 0; k <= 200 * st.t; k++) { const f = k / 200; pts.push([f * end, breaksAt(f)]); }
        pts.push([dr, breaksAt(wear)]);
        plot(ctx, pts, ax.X, ax.Y);
        dot(ctx, ax.X(dr), ax.Y(breaksAt(wear)), 2.8);
        if (st.t >= 1) endMark(st, ax, ax.X(end), 'end point · yarns broken');
      },
      readout(st) {
        const end = ABR[st.fab].wyz;
        if (st.t >= 1) return '<strong>Fabric ' + st.fab + '.</strong> Worn through across the band at <strong>' + fmt(end) + ' double rubs</strong> (illustrative). This specimen was rubbed along one direction; the other direction is a separate specimen.';
        return '<strong>Fabric ' + st.fab + '.</strong> ' + fmt(end * st.t) + ' double rubs · one rub forward, one back…';
      },
    });
  })();

  // ---- Taber. Top view. The sample rides a turntable; two abrasive wheels
  // sit on it, turned only by the sample moving under them. Their axes miss
  // the turntable's centre, so each wheel slides a little as it rolls, one
  // wheel one way and the other wheel the other: a ring-shaped track with a
  // criss-cross scuff, turning with the table.
  (() => {
    const REV_PER_S = 0.35, END_CYCLES = 1000;
    const mass = (F, c) => F * Math.pow(c / END_CYCLES, 0.88);
    figure({
      id: 'ddTaber', abrasion: true, D: 12,
      layout: w => twoUp(w, { ratio: 0.66, min: 240, max: 260, wideH: 300, split: 0.56 }),
      draw(st) {
        const { ctx, C } = st, s = st.scene, M = ABR[st.fab].taber, cyc = END_CYCLES * st.t, wear = st.t;
        counter(st, s.x + 2, s.y + 2, 'CYCLES', fmt(cyc));
        const Rt = Math.min((s.h - 66) / 2, s.w / 2 - 14);
        const cx = s.x + s.w / 2, cy = s.y + 44 + Rt;
        const rot = 2 * Math.PI * REV_PER_S * st.el;
        const r1 = Rt * 0.42, r2 = Rt * 0.76, rm = (r1 + r2) / 2;
        ctx.fillStyle = MACH.fill; ctx.strokeStyle = MACH.edge; ctx.beginPath(); ctx.arc(cx, cy, Rt + 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
        ctx.beginPath(); ctx.arc(0, 0, Rt, 0, Math.PI * 2); ctx.clip();
        plainWeave(ctx, -Rt, -Rt, 2 * Rt, 2 * Rt, Math.max(3, Rt / 24));
        // the ring-shaped track: darkens, scuffed criss-cross
        ctx.fillStyle = 'rgba(6,7,7,' + (0.62 * smooth(wear)).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(0, 0, r2, 0, Math.PI * 2); ctx.arc(0, 0, r1, 0, Math.PI * 2, true); ctx.fill('evenodd');
        const nS = Math.round(420 * wear);
        ctx.lineWidth = 0.9; ctx.strokeStyle = TEAL.hi; ctx.globalAlpha = 0.55;
        for (let k = 0; k < nS; k++) {
          const a = hash(k) * Math.PI * 2, rr = r1 + 3 + (r2 - r1 - 6) * hash(k + 0.37), tilt = (k % 2 ? 1 : -1) * 0.55, len = 5 + 5 * hash(k * 3.1);
          const px = Math.cos(a) * rr, py = Math.sin(a) * rr, d = a + Math.PI / 2 + tilt;
          ctx.beginPath(); ctx.moveTo(px - Math.cos(d) * len / 2, py - Math.sin(d) * len / 2); ctx.lineTo(px + Math.cos(d) * len / 2, py + Math.sin(d) * len / 2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // radial grid lines turning with the table
        ctx.strokeStyle = 'rgba(233,236,236,0.5)'; ctx.lineWidth = 1.2;
        for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12); ctx.lineTo(Math.cos(a) * Rt, Math.sin(a) * Rt); ctx.stroke(); }
        ctx.restore();
        ctx.fillStyle = MACH.light; ctx.strokeStyle = MACH.edge; ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // the two wheels, seen from above; stripes show them rolling
        const al = 0.22, wl = Rt * 0.46, ww = (r2 - r1);
        for (const sg of [-1, 1]) {
          const wx = cx + sg * rm * Math.cos(al), wy = cy - rm * Math.sin(al);
          ctx.strokeStyle = MACH.edge; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx, s.y + 34); ctx.stroke();
          ctx.save(); rrect(ctx, wx - ww / 2, wy - wl / 2, ww, wl, 3); ctx.clip();
          ctx.fillStyle = TAN.base; ctx.fillRect(wx - ww / 2, wy - wl / 2, ww, wl);
          ctx.strokeStyle = TAN.dark; ctx.lineWidth = 1.4;
          const spd = 2 * Math.PI * REV_PER_S * rm * Math.cos(al) * st.el, gap = wl / Math.max(3, Math.round(wl / 7));
          for (let k = 0; k < wl / gap + 1; k++) { const yy = wy - wl / 2 + (((k * gap - sg * spd) % wl) + wl) % wl; ctx.beginPath(); ctx.moveTo(wx - ww / 2, yy); ctx.lineTo(wx + ww / 2, yy); ctx.stroke(); }
          ctx.restore();
          ctx.strokeStyle = TAN.dark; ctx.lineWidth = 1; rrect(ctx, wx - ww / 2, wy - wl / 2, ww, wl, 3); ctx.stroke();
          ctx.fillStyle = MACH.light; ctx.beginPath(); ctx.arc(wx, wy, 3, 0, Math.PI * 2); ctx.fill();
        }
        machine(ctx, cx - rm - 18, s.y + 28, 2 * rm + 36, 8, 2);
        label(st, 'abrasive wheels', cx + rm + 18, s.y + 22, 'right');
        label(st, 'sample on turntable', cx, cy + Rt + 14, 'center');
        // chart: mass loss against cycles
        const ax = axes(st, { title: 'MASS LOSS vs CYCLES', x0: 0, x1: END_CYCLES, y0: 0, y1: 110, yLabel: 'mass lost', xLabel: 'cycles →', xTicks: [[0, '0'], [500, '500'], [1000, '1k']], yTicks: [[0, '0'], [50, '50 mg'], [100, '100']] });
        const pts = [];
        for (let k = 0; k <= 100 * st.t; k++) { const c = END_CYCLES * k / 100; pts.push([c, mass(M, c)]); }
        pts.push([cyc, mass(M, cyc)]);
        plot(ctx, pts, ax.X, ax.Y);
        dot(ctx, ax.X(cyc), ax.Y(mass(M, cyc)), 2.8);
        if (st.t >= 1) label(st, M + ' mg after 1,000 cycles', ax.X(END_CYCLES) - 4, ax.Y(M) - 12, 'right', C.ink);
      },
      readout(st) {
        const M = ABR[st.fab].taber;
        if (st.t >= 1) return '<strong>Fabric ' + st.fab + '.</strong> Lost <strong>' + M + ' mg</strong> after 1,000 cycles (illustrative). Here a lower number is better: the test is stopped at a set count and the sample weighed.';
        return '<strong>Fabric ' + st.fab + '.</strong> ' + fmt(1000 * st.t) + ' cycles · the wheels roll and slide on the turning sample…';
      },
    });
  })();

  // ============================================================ pilling

  // A knit face. Loose fibres work out of the yarns as fuzz, then tangle into
  // balls held to the surface by a few anchoring fibres: pills. The face is
  // graded by eye against a reference card, 5 (no pilling) to 1 (very severe).
  (() => {
    const SITES = Array.from({ length: 22 }, (_, k) => ({ u: 0.06 + 0.88 * hash(k * 5 + 1), v: 0.08 + 0.84 * hash(k * 9 + 4), r: 0.6 + 0.4 * hash(k * 3 + 2), at: 0.32 + 0.38 * hash(k * 11 + 7) }));
    const STRANDS = Array.from({ length: 240 }, (_, k) => ({ u: hash(k * 2.7 + 9), v: hash(k * 4.1 + 3), a: hash(k * 1.3) * Math.PI * 2, len: 0.6 + 0.4 * hash(k * 6.1), curl: (hash(k * 8.3) - 0.5) * 3 }));
    STRANDS.forEach(f => { let best = 0, bd = 9; SITES.forEach((p, i) => { const d = Math.hypot(p.u - f.u, (p.v - f.v) * 0.8); if (d < bd) { bd = d; best = i; } }); f.site = best; f.d = bd; });
    const grade = t => t < 0.22 ? 5 : t < 0.42 ? 4 : t < 0.62 ? 3 : 2;
    const pill = (ctx, x, y, r) => {
      ctx.fillStyle = TEAL.light; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = TEAL.hi; ctx.lineWidth = 0.7;
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(x + (k - 1.5) * r * 0.2, y + ((k % 2) - 0.5) * r * 0.3, r * (0.45 + 0.1 * k), k, k + 3.6); ctx.stroke(); }
      ctx.strokeStyle = TEAL.dark; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    };
    function face(ctx, x, y, w, h, t, p, ps) {
      ps = ps || p;
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      knitFace(ctx, x, y, w, h, p);
      const grow = seg(t, 0.03, 0.32), fl = Math.max(3, ps * 1.3);
      ctx.lineWidth = ps > 6 ? 1.2 : 0.7; ctx.strokeStyle = TEAL.hi; ctx.lineCap = 'round';
      for (const f of STRANDS) {
        const S = SITES[f.site], q = seg(t, S.at, S.at + 0.22) * (f.d < 0.16 ? 1 : 0.55);
        const L = fl * f.len * grow * (1 - q);
        if (L < 0.8) continue;
        const bx = lerp(x + f.u * w, x + S.u * w, q * 0.8), by = lerp(y + f.v * h, y + S.v * h, q * 0.8);
        ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + Math.cos(f.a + f.curl) * L * 0.7, by + Math.sin(f.a + f.curl) * L * 0.7, bx + Math.cos(f.a) * L, by + Math.sin(f.a) * L); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (const S of SITES) {
        const q = seg(t, S.at, S.at + 0.3); if (q <= 0) continue;
        const r = Math.max(1.2, ps * 0.85 * S.r) * Math.sqrt(q);
        const px = x + S.u * w, py = y + S.v * h;
        ctx.strokeStyle = TEAL.hi; ctx.lineWidth = 0.7;
        for (let k = 0; k < 3; k++) { const a = hash(px + k) * 6.3; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * r * 1.7, py + Math.sin(a) * r * 1.7); ctx.stroke(); }
        pill(ctx, px, py, r);
      }
      ctx.restore();
    }
    figure({
      id: 'ddPill', D: 11,
      layout: w => twoUp(w, { ratio: 0.72, min: 250, max: 280, wideH: 300, split: 0.58 }),
      draw(st) {
        const { ctx, C } = st, s = st.scene, g = grade(st.t);
        counter(st, s.x + 2, s.y + 2, 'PILLING GRADE', String(g));
        const cardH = Math.round(clamp(s.w * 0.14, 38, 52)), fh = s.h - 40 - cardH - 30;
        const fw = Math.min(s.w - 4, fh * 1.6), fx = s.x + 2, fy = s.y + 38;
        const pMain = Math.max(7, fw / 26);
        face(ctx, fx, fy, fw, fh, st.t, pMain);
        ctx.strokeStyle = MACH.edge; ctx.lineWidth = 1; ctx.strokeRect(fx + 0.5, fy + 0.5, fw - 1, fh - 1);
        label(st, 'fabric face', fx + fw - 2, fy - 8, 'right');
        // reference card: five swatches, 5 (none) to 1 (very severe)
        const cy = fy + fh + 20, gap = 6, cw = Math.min(cardH * 1.3, (s.w - 4 - 4 * gap) / 5);
        label(st, 'reference card', s.x + 2, cy - 8, 'left');
        for (let k = 0; k < 5; k++) {
          const gr = 5 - k, x = s.x + 2 + k * (cw + gap), tEq = [0, 0.32, 0.52, 0.72, 1][k];
          face(ctx, x, cy, cw, cardH, tEq, Math.max(4, cw / 9), pMain * cw / fw * 2);
          const on = gr === g;
          ctx.strokeStyle = on ? C.ink : MACH.edge; ctx.lineWidth = on ? 2 : 1; ctx.strokeRect(x + 0.5, cy + 0.5, cw - 1, cardH - 1);
          label(st, String(gr), x + cw / 2, cy + cardH + 9, 'center', on ? C.ink : C.dim);
        }
        // chart: the grade a person gives, against test time
        const ax = axes(st, { title: 'GRADE vs TEST TIME', x0: 0, x1: 1, y0: 0.6, y1: 5.4, yLabel: 'grade · 5 = none', xLabel: 'rubs, tumbles or turns →', yTicks: [[5, '5'], [4, '4'], [3, '3'], [2, '2'], [1, '1']] });
        const pts = [];
        for (let k = 0; k <= 200 * st.t; k++) { const t = k / 200; pts.push([t, grade(t)]); }
        pts.push([st.t, g]);
        plot(ctx, pts, ax.X, ax.Y);
        dot(ctx, ax.X(st.t), ax.Y(g), 2.8);
      },
      readout(st) {
        const g = grade(st.t);
        if (st.t >= 1) return 'Graded <strong>2</strong> against the card (illustrative): fuzz rose first, then tangled into pills held on by a few fibres.';
        return st.t < 0.32 ? 'Fibres working loose · <strong>fuzz</strong> rising. Grade ' + g + '.' : 'Fuzz tangling into <strong>pills</strong>. Grade ' + g + '.';
      },
    });
  })();

  // ============================================================ snagging

  // The mace test, side view. A fabric-covered drum turns; a spiked ball on a
  // chain bounces on it. A spike that catches a loop pulls it out: a snag,
  // carried round with the drum.
  (() => {
    const REV_PER_S = 0.22, BOUNCE = 1.5, END_REV = 600;
    figure({
      id: 'ddSnag', D: 12,
      layout: w => twoUp(w, { ratio: 0.66, min: 230, max: 260, wideH: 290, split: 0.56 }),
      draw(st) {
        const { ctx, C } = st, s = st.scene;
        const rev = END_REV * st.t;
        counter(st, s.x + 2, s.y + 2, 'REVOLUTIONS', fmt(rev));
        const Rd = Math.min(s.w * 0.3, (s.h - 90) / 2), cx = s.x + s.w * 0.52, cy = s.y + s.h - Rd - 18;
        const rot = 2 * Math.PI * REV_PER_S * st.el, ft = 8;
        // drum and its fabric cover
        ctx.fillStyle = MACH.fill; ctx.strokeStyle = MACH.edge; ctx.beginPath(); ctx.arc(cx, cy, Rd - ft, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = MACH.light; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = ft; ctx.strokeStyle = TEAL.deep; ctx.beginPath(); ctx.arc(cx, cy, Rd - ft / 2, 0, Math.PI * 2); ctx.stroke();
        const nL = Math.round(Rd * 2 * Math.PI / 6);
        ctx.lineWidth = 1.2; ctx.strokeStyle = TEAL.light;
        for (let k = 0; k < nL; k++) { const a = rot + k / nL * Math.PI * 2, r = Rd - 2; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2.2, a + Math.PI * 0.2, a + Math.PI * 1.8, true); ctx.stroke(); }
        // the mace: bounces; each landing may catch a loop
        const nb = Math.floor(st.el * BOUNCE), ph = st.el * BOUNCE - nb;
        const hop = 22 * Math.sin(Math.PI * ph), rm = Math.max(12, Rd * 0.24), spike = rm * 0.55;
        const mx = cx, my = cy - Rd - rm - spike * 0.4 - hop;
        const snags = [];
        for (let k = 1; k <= nb; k++) if (hash(k * 3.1) < 0.6) snags.push({ a: -Math.PI / 2 - 2 * Math.PI * REV_PER_S * (k / BOUNCE) + (hash(k) - 0.5) * 0.15, h: 9 + 6 * hash(k * 7) });
        for (const sn of snags) {
          const a = sn.a + rot, bx = cx + Math.cos(a) * Rd, by = cy + Math.sin(a) * Rd;
          ctx.strokeStyle = TEAL.hi; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(bx - Math.sin(a) * 2.5, by + Math.cos(a) * 2.5);
          ctx.bezierCurveTo(bx + Math.cos(a) * sn.h * 1.3 - Math.sin(a) * 4, by + Math.sin(a) * sn.h * 1.3 + Math.cos(a) * 4, bx + Math.cos(a) * sn.h * 1.3 + Math.sin(a) * 4, by + Math.sin(a) * sn.h * 1.3 - Math.cos(a) * 4, bx + Math.sin(a) * 2.5, by - Math.cos(a) * 2.5); ctx.stroke();
          ctx.strokeStyle = TEAL.dark; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, Rd - 3, a + 0.03, a + 0.12); ctx.stroke();
        }
        // chain from a fixed point, then the ball and its spikes
        const ax0 = cx - Rd * 1.15, ay0 = s.y + 36;
        machine(ctx, ax0 - 8, ay0 - 6, 16, 8, 2);
        ctx.strokeStyle = MACH.edge; ctx.lineWidth = 1.5; ctx.setLineDash([3, 2]); ctx.beginPath(); ctx.moveTo(ax0, ay0); ctx.lineTo(mx - rm * 0.7, my - rm * 0.7); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = MACH.edge; ctx.lineWidth = 1.6;
        for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6 + st.el * 0.6; ctx.beginPath(); ctx.moveTo(mx + Math.cos(a) * rm, my + Math.sin(a) * rm); ctx.lineTo(mx + Math.cos(a) * (rm + spike), my + Math.sin(a) * (rm + spike)); ctx.stroke(); }
        ctx.fillStyle = MACH.fill; ctx.beginPath(); ctx.arc(mx, my, rm, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        label(st, 'spiked mace', mx + rm + spike + 6, my, 'left');
        label(st, 'fabric on a turning drum', cx, cy + Rd + 10, 'center');
        if (snags.length) label(st, 'pulled loops', cx + Rd * 0.8 + 6, cy - Rd * 0.55, 'left', C.ink);
        // chart: snags counted against revolutions
        const ax = axes(st, { title: 'SNAGS vs REVOLUTIONS', x0: 0, x1: END_REV, y0: 0, y1: 14, yLabel: 'pulled loops', xLabel: 'revolutions →', xTicks: [[0, '0'], [300, '300'], [600, '600']], yTicks: [[0, '0'], [10, '10']] });
        const pts = [[0, 0]]; let n = 0;
        for (let k = 1; k <= nb; k++) { const r = END_REV * (k / BOUNCE) / st.D; pts.push([r, n]); if (hash(k * 3.1) < 0.6) n++; pts.push([r, n]); }
        pts.push([rev, n]);
        plot(ctx, pts, ax.X, ax.Y);
        dot(ctx, ax.X(rev), ax.Y(n), 2.8);
      },
      readout(st) {
        const nb = Math.floor(st.el * BOUNCE); let n = 0; for (let k = 1; k <= nb; k++) if (hash(k * 3.1) < 0.6) n++;
        return st.t >= 1 ? '<strong>' + n + ' pulled loops</strong> after ' + END_REV + ' revolutions (illustrative), then graded against reference photographs.'
          : 'The mace lands, a spike catches a loop and drags it out · <strong>' + n + '</strong> so far…';
      },
    });
  })();

  // ============================================================ strength
  // Three small multiples on one layout: the specimen and its grips on the
  // left, force against extension on the right, each drawn live.
  const STRENGTH = w => twoUp(w, { ratio: 0.66, min: 230, max: 250, wideH: 270, split: 0.52 });

  // ---- Tensile. A woven specimen between two jaws; the lower jaw moves down
  // at a constant rate. Grab grips only the middle of a wider specimen; strip
  // grips the full width. Force climbs until the yarns give, then drops.
  (() => {
    const EB = 0.26, TB = 0.74;
    const ext = t => EB * (t / TB) * (t < TB ? 1 : 1) + (t > TB ? 0.04 * seg(t, TB, 1) : 0);
    function force(e, broken, t) {
      if (!broken) return Math.pow(e / EB, 1.45) * (1 - 0.06 * Math.pow(e / EB, 6));
      const k = seg(t, TB, TB + 0.08);   // a couple of yarns hold briefly as it lets go
      return (1 - 0.06) * (k < 0.35 ? 0.55 : k < 0.7 ? 0.22 : 0.04) * (k >= 1 ? 0 : 1);
    }
    figure({
      id: 'ddTensile', D: 7,
      layout: STRENGTH,
      draw(st) {
        const { ctx, C } = st, s = st.scene, grab = st.opt.grip !== 'strip';
        const t = st.t, broken = t > TB, e = Math.min(EB, EB * t / TB), jawDrop = EB * t / TB;
        const W0 = Math.min(s.w * 0.5, 140), H0 = (s.h - 80) / (1 + EB + 0.02);
        const cx = s.x + s.w * 0.45, top = s.y + 30;
        const jw = grab ? W0 * 0.38 : W0 + 14, jh = 16;
        const f = u => grab ? (Math.abs(u) <= 0.19 ? 1 : Math.exp(-(Math.abs(u) - 0.19) / 0.14)) : 1;
        const breakV = i => 0.52 + 0.06 * Math.sin(i * 2.3) + 0.03 * (hash(i) - 0.5);
        const botJaw = top + H0 * (1 + Math.min(jawDrop, EB + 0.04));
        // map a specimen point (u across, v down) to the page
        const gapY = botJaw - top - H0;                       // after the break the lower piece rides the moving jaw
        const map = (u, v, i) => {
          const fu = f(u), ex = e * fu;
          const y = !broken ? top + v * H0 * (1 + ex) : v < breakV(i) ? top + v * H0 : top + v * H0 + gapY;
          return [cx + u * W0 * (1 - 0.22 * (broken ? 0 : e) * fu), y];
        };
        const nU = grab ? 15 : 11, nV = 18;
        const colOf = u => clamp(Math.round((u + 0.5) * nU), 0, nU);
        const lower = (u, v) => broken && v >= breakV(colOf(u));
        // the cloth itself, cell by cell, so it reads as a surface
        ctx.save();
        ctx.fillStyle = TEAL.deep;
        for (let j = 0; j < nV; j++) for (let i = 0; i < nU; i++) {
          const u0 = -0.5 + i / nU, u1 = u0 + 1 / nU, v0 = j / nV, v1 = v0 + 1 / nV, vm = (v0 + v1) / 2, um = (u0 + u1) / 2;
          if (broken && Math.abs(vm - breakV(colOf(um))) < 0.6 / nV) continue;
          const c = colOf(um), q = [map(u0, v0, c), map(u1, v0, c), map(u1, v1, c), map(u0, v1, c)];
          ctx.beginPath(); ctx.moveTo(...q[0]); ctx.lineTo(...q[1]); ctx.lineTo(...q[2]); ctx.lineTo(...q[3]); ctx.closePath(); ctx.fill();
        }
        ctx.lineCap = 'round';
        for (let j = 0; j <= nV; j++) {   // weft, across
          const v = j / nV;
          ctx.strokeStyle = TEAL.mid; ctx.lineWidth = 2.6;
          ctx.beginPath();
          let pen = false, side = null;
          for (let i = 0; i <= 40; i++) {
            const u = -0.5 + i / 40, col = colOf(u);
            const gone = broken && Math.abs(v - breakV(col)) < 0.5 / nV, sd = lower(u, v);
            if (gone || (side !== null && sd !== side)) { pen = false; side = null; if (gone) continue; }
            const [x, y] = map(u, v, col);
            if (!pen) { ctx.moveTo(x, y); pen = true; } else ctx.lineTo(x, y);
            side = sd;
          }
          ctx.stroke();
        }
        for (let i = 0; i <= nU; i++) {   // warp, along the pull: carries the load and snaps
          const u = -0.5 + i / nU, vb = breakV(i);
          ctx.strokeStyle = TEAL.light; ctx.lineWidth = 2;
          ctx.beginPath();
          let pen = false;
          for (let j = 0; j <= 60; j++) {
            const v = j / 60;
            if (broken && v > vb - 0.012 && v < vb + 0.012) { pen = false; continue; }
            const [x, y] = map(u, v, i);
            if (!pen) { ctx.moveTo(x, y); pen = true; } else ctx.lineTo(x, y);
          }
          ctx.stroke();
          if (broken) {   // frayed ends
            ctx.lineWidth = 0.7; ctx.strokeStyle = TEAL.hi;
            for (const [vv, d] of [[vb - 0.012, 1], [vb + 0.012, -1]]) { const [x, y] = map(u, vv, i); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 1.5, y + d * 3); ctx.moveTo(x, y); ctx.lineTo(x + 1.5, y + d * 3); ctx.stroke(); }
          }
        }
        ctx.restore();
        // jaws
        machine(ctx, cx - jw / 2, top - jh, jw, jh, 1.5);
        machine(ctx, cx - jw / 2, botJaw, jw, jh, 1.5);
        label(st, 'fixed jaw', cx + Math.max(jw, W0) / 2 + 8, top - jh / 2, 'left');
        label(st, 'moving jaw ↓', cx + Math.max(jw, W0) / 2 + 8, botJaw + jh / 2, 'left');
        if (broken) label(st, 'break', cx + W0 / 2 + 8, top + H0 * 0.55, 'left', C.ink);
        // chart
        const ax = axes(st, { title: 'FORCE vs EXTENSION', x0: 0, x1: 0.32, y0: 0, y1: 1.15, yLabel: 'force', xLabel: 'extension →', xTicks: [[0, '0'], [0.1, '10%'], [0.2, '20%'], [0.3, '30%']] });
        const pts = [];
        for (let k = 0; k <= 160 * t; k++) { const tt = k / 160, ee = Math.min(EB + 0.04, EB * tt / TB); pts.push([ee, force(Math.min(EB, ee), tt > TB, tt)]); }
        const cur = [Math.min(EB + 0.04, jawDrop), force(e, broken, t)];
        pts.push(cur);
        plot(ctx, pts, ax.X, ax.Y);
        dot(ctx, ax.X(cur[0]), ax.Y(cur[1]), 2.8);
        if (broken) label(st, 'breaking force', ax.X(EB) - 4, ax.Y(0.94) - 10, 'right', C.ink);
      },
      readout(st) {
        const grab = st.opt.grip !== 'strip';
        const how = grab ? 'Grab: the jaws hold only the middle; the fabric either side helps carry the load.' : 'Strip: the jaws hold the full width.';
        return st.t > TB ? '<strong>Broken.</strong> Force climbed, peaked, and fell as the yarns gave (illustrative). ' + how : 'Pulling at a constant rate · extension ' + Math.round(Math.min(EB, EB * st.t / TB) * 100) + '%. ' + how;
      },
    });
  })();

  // ---- Tear (tongue / single rip). A specimen with a slit; its two tongues
  // are pulled apart and the tear runs on. The yarns across the tear's path
  // load and snap one at a time, so the force trace is a sawtooth.
  (() => {
    const NB = 11;
    figure({
      id: 'ddTear', D: 8,
      layout: STRENGTH,
      draw(st) {
        const { ctx, C } = st, s = st.scene, t = st.t;
        const p = Math.min(NB - 0.001, t * NB), k = Math.floor(p), fr = p - k;
        const Ws = Math.min(s.w - 30, 270), Hs = Math.min(s.h * 0.34, 90), left = s.x + 12, my = s.y + s.h * 0.5;
        const slit = left + Ws * 0.24, dx = (Ws * 0.72) / (NB + 3);
        const xs = i => slit + (i + 0.5) * dx;
        const tip = xs(k) - dx * 0.5 + dx * fr * 0.15;
        const G = 6 + 46 * t;                 // jaw separation, opens the torn part
        const open = x => x >= tip ? 0 : G * (tip - x) / (tip - left) + 4 * fr;
        const shift = (x, upper) => (upper ? -1 : 1) * open(x) / 2;
        // the two halves: weft lines along the tear direction
        ctx.lineCap = 'round';
        for (const upper of [true, false]) {
          // body fill
          ctx.fillStyle = TEAL.deep; ctx.beginPath();
          const y0 = upper ? my - Hs / 2 : my, y1 = upper ? my : my + Hs / 2;
          for (let x = left; x <= left + Ws; x += 4) ctx.lineTo(x, y0 + shift(x, upper));
          for (let x = left + Ws; x >= left; x -= 4) ctx.lineTo(x, y1 + shift(x, upper));
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = TEAL.mid; ctx.lineWidth = 2;
          for (let j = 0; j < 5; j++) {
            const y = (upper ? my - Hs / 2 : my) + (j + 0.5) * Hs / 10;
            ctx.beginPath(); for (let x = left; x <= left + Ws; x += 4) ctx.lineTo(x, y + shift(x, upper)); ctx.stroke();
          }
        }
        // the yarns across the tear path
        ctx.lineWidth = 2;
        for (let i = 0; i < NB + 3; i++) {
          const x = xs(i);
          ctx.strokeStyle = TEAL.light;
          if (i < k) {   // already snapped: two ends, one on each tongue
            const o = open(x) / 2;
            ctx.beginPath(); ctx.moveTo(x, my - Hs / 2 - o); ctx.lineTo(x, my - o - 2); ctx.moveTo(x, my + o + 2); ctx.lineTo(x, my + Hs / 2 + o); ctx.stroke();
          } else if (i === k && t < 1) {   // loaded: stretched across the opening
            const o = 4 * fr;
            ctx.beginPath(); ctx.moveTo(x, my - Hs / 2); ctx.lineTo(x, my - o); ctx.lineTo(x + 1, my + o); ctx.lineTo(x, my + Hs / 2); ctx.stroke();
          } else { ctx.beginPath(); ctx.moveTo(x, my - Hs / 2); ctx.lineTo(x, my + Hs / 2); ctx.stroke(); }
        }
        // the slit's own edges and the grips on the tongues
        const go = open(left) / 2;
        machine(ctx, left - 6, my - Hs / 2 - go - 14, 46, 14, 1.5);
        machine(ctx, left - 6, my + Hs / 2 + go, 46, 14, 1.5);
        label(st, 'tongue · pulled ↑', left + 46, my - Hs / 2 - go - 7, 'left');
        label(st, 'tongue · pulled ↓', left + 46, my + Hs / 2 + go + 7, 'left');
        if (t < 1) label(st, 'tear runs →', tip + 6, my, 'left', C.ink);
        // chart: sawtooth
        const amp = i => 0.55 + 0.4 * hash(i * 5.3);
        const ax = axes(st, { title: 'FORCE vs EXTENSION', x0: 0, x1: NB, y0: 0, y1: 1.2, yLabel: 'force', xLabel: 'jaw travel →', xTicks: [[0, '0']] });
        const pts = [[0, 0.1]];
        for (let i = 0; i < k; i++) { pts.push([i + 1, 0.2 + amp(i)]); pts.push([i + 1, 0.22 + 0.08 * hash(i)]); }
        const curF = 0.22 + (k ? 0.08 * hash(k - 1) : -0.12) + (0.2 + amp(k) - 0.22 - (k ? 0.08 * hash(k - 1) : -0.12)) * fr;
        pts.push([p, curF]);
        plot(ctx, pts, ax.X, ax.Y, { lw: 1.5 });
        dot(ctx, ax.X(p), ax.Y(curF), 2.8);
        if (k >= 2) label(st, 'one yarn snaps', ax.X(1) + 3, ax.Y(0.2 + amp(0)) - 8, 'left', C.ink);
      },
      readout(st) {
        const k = Math.floor(Math.min(NB - 0.001, st.t * NB));
        return st.t >= 1 ? '<strong>Torn.</strong> Each tooth of the trace is one yarn taking the load and snapping (illustrative). Tear strength is read from the peaks.' : 'Tongues pulled apart · <strong>' + k + '</strong> yarns snapped so far…';
      },
    });
  })();

  // ---- Burst (ball). A knit clamped in a ring; a ball pushes up through it
  // until the knit ruptures. Side section, with the loops along the fabric
  // spreading as it stretches over the ball.
  (() => {
    const TR = 0.78;
    figure({
      id: 'ddBurst', D: 7,
      layout: STRENGTH,
      draw(st) {
        const { ctx, C } = st, s = st.scene, t = st.t, burst = t > TR;
        const cx = s.x + s.w * 0.48, yc = s.y + s.h * 0.6, Wc = Math.min(s.w * 0.36, 115, s.h * 0.42), rb = Wc * 0.42;
        const travel = (rb + 14 + Wc * 0.55) * Math.min(t / TR, 1) + (burst ? rb * 0.35 * seg(t, TR, 1) : 0);
        const yb = yc + rb + 14 - travel;
        const Q = [[cx - Wc, yc], [cx + Wc, yc]];
        // the fabric path: straight, or tangents to the ball plus the cap over it
        function path() {
          if (yb - rb >= yc) return [Q[0], Q[1]];
          // each clamp point's tangent to the ball: of the two, the upper one
          const tang = q => {
            const dx = q[0] - cx, dy = q[1] - yb, d = Math.hypot(dx, dy), base = Math.atan2(dy, dx), off = Math.acos(clamp(rb / d, -1, 1));
            const c1 = base + off, c2 = base - off;
            return Math.sin(c1) < Math.sin(c2) ? c1 : c2;
          };
          let from = tang(Q[0]), to = tang(Q[1]);
          while (to < from) to += 2 * Math.PI;   // clockwise on screen: over the top
          const pts = [Q[0]];
          for (let k = 0; k <= 30; k++) { const a = lerp(from, to, k / 30); pts.push([cx + Math.cos(a) * (rb + 2), yb + Math.sin(a) * (rb + 2)]); }
          pts.push(Q[1]);
          return pts;
        }
        const pts = path();
        // ball, below the fabric's line until it pushes through
        ctx.fillStyle = MACH.fill; ctx.strokeStyle = MACH.edge; ctx.lineWidth = 1;
        machine(ctx, cx - 4, yb + rb, 8, s.y + s.h - (yb + rb) - 6, 1);
        ctx.beginPath(); ctx.arc(cx, yb, rb, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(233,236,236,0.18)'; ctx.beginPath(); ctx.arc(cx - rb * 0.35, yb - rb * 0.35, rb * 0.25, 0, Math.PI * 2); ctx.fill();
        // the fabric, with its loops spaced along the length
        const draw = (P, n) => {
          const L = []; let tot = 0; for (let i = 1; i < P.length; i++) { const d = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); L.push(d); tot += d; }
          ctx.strokeStyle = TEAL.deep; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.beginPath(); P.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke();
          ctx.strokeStyle = TEAL.light; ctx.lineWidth = 1.2;
          const stretch = tot / (n * 9);
          for (let m = 0; m < n; m++) {
            let target = (m + 0.5) / n * tot, i = 0; while (i < L.length - 1 && target > L[i]) { target -= L[i]; i++; }
            const f = L[i] ? target / L[i] : 0, x = lerp(P[i][0], P[i + 1][0], f), y = lerp(P[i][1], P[i + 1][1], f), a = Math.atan2(P[i + 1][1] - P[i][1], P[i + 1][0] - P[i][0]);
            ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, 0, 3.4 * Math.min(2.4, stretch), 2.6 / Math.sqrt(Math.max(1, stretch)), 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
          }
          return tot;
        };
        if (!burst) draw(pts, 24);
        else {   // ruptured at the top: two flaps sprung back down the ball's sides
          const k = Math.floor(pts.length / 2), back = seg(t, TR, TR + 0.1);
          const left = pts.slice(0, Math.max(2, k - 3 - Math.round(4 * back))), right = pts.slice(Math.min(pts.length - 2, k + 3 + Math.round(4 * back)));
          draw(left, 11); draw(right, 11);
          label(st, 'ruptured', cx, yb - rb - 14, 'center', C.ink);
        }
        // the ring clamp
        for (const q of Q) { const sg = q[0] < cx ? -1 : 1; machine(ctx, q[0] + (sg < 0 ? -36 : 0), q[1] - 13, 36, 9, 1.5); machine(ctx, q[0] + (sg < 0 ? -36 : 0), q[1] + 4, 36, 9, 1.5); }
        label(st, 'ring clamp', cx - Wc - 18, yc + 24, 'center');
        label(st, 'ball pushes up ↑', cx + 10, s.y + s.h - 12, 'left');
        // chart
        const fz = tt => Math.pow(Math.min(tt / TR, 1), 1.9);
        const ax = axes(st, { title: 'FORCE vs BALL TRAVEL', x0: 0, x1: 1.1, y0: 0, y1: 1.15, yLabel: 'force', xLabel: 'ball travel →', xTicks: [[0, '0']] });
        const P = [];
        for (let k = 0; k <= 160 * t; k++) { const tt = k / 160; P.push([Math.min(tt / TR, 1) + (tt > TR ? 0.1 * seg(tt, TR, 1) : 0), tt > TR ? fz(1) * (1 - seg(tt, TR, TR + 0.05)) * 0.9 + 0.03 : fz(tt)]); }
        if (P.length) { plot(ctx, P, ax.X, ax.Y); const q = P[P.length - 1]; dot(ctx, ax.X(q[0]), ax.Y(q[1]), 2.8); }
        if (burst) label(st, 'bursting force', ax.X(1) - 4, ax.Y(1) - 10, 'right', C.ink);
      },
      readout(st) {
        return st.t > TR ? '<strong>Burst.</strong> The knit stretched in every direction at once, its loops opening over the ball, until it ruptured (illustrative).' : 'The ball pushes the knit up into a dome · loops spreading…';
      },
    });
  })();

  // ============================================================ fatigue
  // A stretch-and-recovery loop, run again and again. Each loop leaves the
  // strip a little longer at rest (permanent growth) and takes a little less
  // force to pull: the load-extension loop drifts right and down, and the
  // share of the stretch it recovers falls.
  (() => {
    const LOOPS = 10, EMAX = 0.6, N_END = 500;
    const growth = j => 0.11 * (1 - Math.exp(-j / 3.2));        // rest-length growth after j loops
    const peak = j => 1 - 0.22 * (1 - Math.exp(-j / 4));
    const recovery = j => (EMAX - growth(j)) / EMAX * 100;
    const loopPts = (j, f) => {   // f: 0..1 progress through loop j
      const g0 = growth(j), g1 = growth(j + 1), P = peak(j), out = [];
      const up = e => P * Math.pow(clamp((e - g0) / (EMAX - g0), 0, 1), 1.6);
      const down = e => P * Math.pow(clamp((e - g1) / (EMAX - g1), 0, 1), 2.8);
      for (let k = 0; k <= 40 * Math.min(1, f * 2); k++) { const e = lerp(g0, EMAX, k / 40); out.push([e, up(e)]); }
      if (f > 0.5) for (let k = 0; k <= 40 * Math.min(1, (f - 0.5) * 2); k++) { const e = lerp(EMAX, g1, k / 40); out.push([e, down(e)]); }
      return out;
    };
    figure({
      id: 'ddFatigue', D: 15,
      layout(w) {
        if (w < 560) {
          const sh = 260, ch = 180;
          return { H: sh + 14 + ch * 2 + 10, stacked: true, scene: { x: 0, y: 0, w, h: sh }, chart: { x: 0, y: sh + 14, w, h: ch }, chart2: { x: 0, y: sh + 14 + ch + 10, w, h: ch }, rules: [['h', sh + 7]] };
        }
        const H = 340, sw = Math.round(w * 0.3);
        return { H, stacked: false, scene: { x: 0, y: 0, w: sw, h: H }, chart: { x: sw + 16, y: 0, w: w - sw - 16, h: H / 2 - 4 }, chart2: { x: sw + 16, y: H / 2 + 6, w: w - sw - 16, h: H / 2 - 6 }, rules: [['v', sw + 8]] };
      },
      draw(st) {
        const { ctx, C } = st, s = st.scene;
        const p = Math.min(LOOPS - 1e-6, st.t * LOOPS), j = Math.floor(p), f = st.t >= 1 ? 1 : p - j;
        const n = Math.round(N_END * st.t);
        counter(st, s.x + 2, s.y + 2, 'CYCLES', fmt(n));
        // the strip in its jaws
        const L0 = (s.h - 110) / (1 + EMAX), W = Math.min(46, s.w * 0.3), cx = s.x + s.w / 2, top = s.y + 52;
        const g0 = growth(j), g1 = growth(j + 1), e = f < 0.5 ? lerp(g0, EMAX, smooth(f * 2)) : lerp(EMAX, g1, smooth((f - 0.5) * 2));
        const Ln = L0 * (1 + e), Wn = W * (1 - 0.35 * e);
        machine(ctx, cx - W / 2 - 10, top - 14, W + 20, 14, 1.5);
        machine(ctx, cx - W / 2 - 10, top + Ln, W + 20, 14, 1.5);
        ctx.save(); ctx.beginPath(); ctx.rect(cx - Wn / 2, top, Wn, Ln); ctx.clip();
        ctx.fillStyle = TEAL.deep; ctx.fillRect(cx - Wn / 2, top, Wn, Ln);
        ctx.strokeStyle = TEAL.light; ctx.lineWidth = 1.2;
        const rows = 14;
        for (let r = 0; r < rows; r++) for (let c = 0; c < 4; c++) {
          const x = cx - Wn / 2 + (c + 0.5) * Wn / 4, y = top + r * Ln / rows, hh = Ln / rows, ww = Wn / 8;
          ctx.beginPath(); ctx.moveTo(x - ww, y); ctx.quadraticCurveTo(x - ww * 0.2, y + hh * 0.5, x, y + hh * 1.1); ctx.quadraticCurveTo(x + ww * 0.2, y + hh * 0.5, x + ww, y); ctx.stroke();
        }
        ctx.restore();
        // the original length, and where the strip comes back to now
        const yo = top + L0, yr = top + L0 * (1 + growth(st.t >= 1 ? LOOPS : j));
        ctx.save(); ctx.setLineDash([2, 3]); ctx.strokeStyle = C.dim; ctx.beginPath(); ctx.moveTo(cx - W / 2 - 20, yo + 0.5); ctx.lineTo(cx + W / 2 + 20, yo + 0.5); ctx.stroke(); ctx.restore();
        label(st, 'original', cx + W / 2 + 22, yo, 'left');
        if (yr - yo > 2) { ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.moveTo(cx - W / 2 - 20, yr + 0.5); ctx.lineTo(cx + W / 2 + 20, yr + 0.5); ctx.stroke(); label(st, 'rest now', cx + W / 2 + 22, yr + 9, 'left', C.ink); }
        // chart 1: the loop, with the earlier loops fading behind it
        const ax = axes(st, { title: 'LOAD vs EXTENSION, EACH LOOP', x0: 0, x1: 0.66, y0: 0, y1: 1.1, yLabel: 'load', xLabel: 'extension →', xTicks: [[0, '0'], [0.3, '30%'], [0.6, '60%']] }, st.L.chart);
        for (let k = 0; k < j; k++) plot(ctx, loopPts(k, 1), ax.X, ax.Y, { lw: 1.2, alpha: 0.15 + 0.35 * (k + 1) / (j + 1) });
        const cur = loopPts(j, f); plot(ctx, cur, ax.X, ax.Y);
        if (cur.length) { const q = cur[cur.length - 1]; dot(ctx, ax.X(q[0]), ax.Y(q[1]), 2.6); }
        // chart 2: recovery against cycles
        const ax2 = axes(st, { title: 'RECOVERY vs CYCLES', x0: 0, x1: N_END, y0: 75, y1: 102, yLabel: 'recovery', xLabel: 'cycles →', xTicks: [[0, '0'], [250, '250'], [500, '500']], yTicks: [[100, '100%'], [80, '80%']] }, st.L.chart2);
        const R = [[0, 100]];
        for (let k = 1; k <= j + (f >= 1 || st.t >= 1 ? 1 : 0); k++) R.push([N_END * k / LOOPS, recovery(k)]);
        plot(ctx, R, ax2.X, ax2.Y);
        const q = R[R.length - 1]; dot(ctx, ax2.X(q[0]), ax2.Y(q[1]), 2.6);
      },
      readout(st) {
        const r = recovery(st.t >= 1 ? LOOPS : Math.floor(st.t * LOOPS));
        return st.t >= 1 ? 'After ' + N_END + ' cycles it recovers <strong>' + Math.round(r) + '%</strong> of the stretch, down from 100% (illustrative). The strip rests longer and pulls easier: it has grown and lost power.'
          : 'Stretch, release, repeat · recovering <strong>' + Math.round(r) + '%</strong>…';
      },
    });
  })();

  // ============================================================ crocking
  // A white test cloth on a rubbing finger, rubbed back and forth over the
  // dyed fabric; colour comes off onto the cloth. Scene only: the result is
  // the stain, graded by eye.
  (() => {
    figure({
      id: 'ddCrock', D: 6,
      layout: w => ({ H: w < 560 ? 270 : 190, scene: { x: 0, y: 0, w, h: w < 560 ? 270 : 190 }, rules: [] }),
      draw(st) {
        const { ctx, C } = st, s = st.scene, t = st.t;
        const narrow = s.w < 560, sideW = narrow ? s.w : s.w * 0.62, band = narrow ? 104 : 0;
        const bx = s.x + 10, bw = sideW - 30, by = s.y + s.h - 50;
        machine(ctx, bx - 6, by + 10, bw + 12, 12, 2);
        ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, 10); ctx.clip(); plainWeave(ctx, bx, by, bw, 10, 5); ctx.restore();
        label(st, 'dyed fabric', bx, by + 34, 'left');
        const A = bw * 0.28, fx = bx + bw / 2 + A * Math.sin(st.el * Math.PI * 2 * 1.2) * (t < 1 ? 1 : 0), fy = by - 30;
        machine(ctx, fx - 8, s.y + 14 + band, 16, fy - s.y - 14 - band, 2);
        // the finger, wrapped in the white cloth, stained as it goes
        ctx.fillStyle = MACH.fill; ctx.strokeStyle = MACH.edge; rrect(ctx, fx - 14, fy, 28, 30, 8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e9ecec'; rrect(ctx, fx - 16, fy + 14, 32, 16, 6); ctx.fill();
        ctx.fillStyle = 'rgba(47,163,163,' + (0.55 * t).toFixed(3) + ')'; ctx.fillRect(fx - 15, by - 4, 30, 4);
        label(st, 'rubbing finger · white test cloth ↔', bx, s.y + 22 + band, 'left');
        // the cloth afterwards and the staining scale
        const cx = narrow ? s.x + 4 : s.x + sideW + 20, cy = narrow ? s.y + 14 : s.y + 34;
        label(st, 'cloth', cx, cy, 'left');
        ctx.fillStyle = '#e9ecec'; ctx.fillRect(cx, cy + 10, 44, 44);
        const g = ctx.createRadialGradient(cx + 22, cy + 32, 2, cx + 22, cy + 32, 20);
        g.addColorStop(0, 'rgba(28,107,107,' + (0.7 * t).toFixed(3) + ')'); g.addColorStop(1, 'rgba(28,107,107,0)');
        ctx.fillStyle = g; ctx.fillRect(cx, cy + 10, 44, 44);
        const kx = narrow ? cx + 64 : cx, ky = narrow ? cy : cy + 72;
        label(st, 'staining scale · 5 = none', kx, ky, 'left');
        for (let k = 0; k < 5; k++) { ctx.fillStyle = '#e9ecec'; ctx.fillRect(kx + k * 22, ky + 10, 18, 18); ctx.fillStyle = 'rgba(28,107,107,' + (k * 0.16).toFixed(2) + ')'; ctx.fillRect(kx + k * 22, ky + 10, 18, 18); label(st, String(5 - k), kx + k * 22 + 9, ky + 36, 'center', k === 2 && t >= 1 ? C.ink : C.dim); }
        if (t >= 1) { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.strokeRect(kx + 44 - 0.5, ky + 9.5, 19, 19); }
      },
      readout(st) {
        return st.t >= 1 ? 'Colour transferred onto the white cloth; graded about <strong>3</strong> on the staining scale (illustrative).' : 'Rubbing back and forth · colour coming off onto the cloth…';
      },
    });
  })();
})();
