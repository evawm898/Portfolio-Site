/* Quantifying Comfort — part two, touch.
   Five figures, one shared frame. Each figure is one canvas holding two
   things kept visibly apart: the SCENE (the fabric, drawn to look like that
   fabric, and the machine, in muted grey) and the CHART (the instrument's
   output, in orange, on its own axes, drawn live as the test runs). Every
   curve is illustrative: the shapes follow the published behaviour, the
   values are not measurements.

   Shared rules, enforced here rather than per figure:
   - the chart is mint (#b3dbb4, a DESIGN.md companion: data, never text)
     and nothing in a scene is drawn in it; the chart's words are ink;
   - a fabric toggle restarts that figure's test from the beginning;
   - a test plays once when the figure first scrolls into view, holds its end
     state, and replays on a click or Enter/Space on the canvas;
   - prefers-reduced-motion shows the end state and never animates;
   - the layout stacks scene above chart below 560 px of figure width, so the
     figure works at a 380 px viewport. */
(() => {
  'use strict';

  const CHART = '#b3dbb4';   // --color-mint
  const STILL = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const rootStyle = getComputedStyle(document.documentElement);
  const cssVar = (n, f) => rootStyle.getPropertyValue(n).trim() || f;
  const CHART_TEXT = cssVar('--color-ink', '#e9ecec');   // a chart's words are ink, never the series colour
  const colours = () => ({
    ink: cssVar('--ink', '#e9ecec'), dim: cssVar('--ink-dim', '#8b9494'), faint: cssVar('--ink-faint', '#565f5f'),
    line: cssVar('--line-strong', '#34393a'), bg: cssVar('--black-raised', '#0c0e0e'), mono: cssVar('--mono', 'monospace'),
  });
  // machine parts: muted grey, never the fabric's colour and never the chart's
  const MACH = { fill: '#3d4444', edge: '#7d8686', dark: '#2a2f2f' };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, f) => a + (b - a) * f;
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);           // 0..1 progress of t through [a, b]
  const hash = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const wobble = (u, k) => 0.5 * Math.sin(u * 61.3 + k) + 0.3 * Math.sin(u * 137.9 + 2.1 * k) + 0.2 * Math.sin(u * 263.1 + 0.7 * k);

  // ---------------------------------------------------------------- the frame

  function figure(cfg) {
    const fig = document.getElementById(cfg.id);
    if (!fig) return;
    const c = fig.querySelector('canvas'), ctx = c.getContext('2d');
    const out = fig.querySelector('[data-readout]');
    const btns = [...fig.querySelectorAll('[data-fab]')];
    let fab = (btns.find(b => b.getAttribute('aria-pressed') === 'true') || btns[0]).dataset.fab;
    let w = 0, h = 0, L = null, el = 0, last = 0, running = false, visible = true;

    function layout() {
      const r = c.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(200, Math.round(r.width));
      let scene, chart, H;
      const stacked = w < 560;
      if (stacked) {
        const sh = Math.round(clamp(w * cfg.sceneRatio, cfg.sceneMin || 150, cfg.sceneMax || 240));
        const chH = Math.round(clamp(w * 0.52, 160, 210));
        H = sh + 14 + chH;
        scene = { x: 0, y: 0, w, h: sh }; chart = { x: 0, y: sh + 14, w, h: chH };
      } else {
        H = cfg.wideH || 290;
        const sw = Math.round(w * 0.56);
        scene = { x: 0, y: 0, w: sw, h: H }; chart = { x: sw + 16, y: 0, w: w - sw - 16, h: H };
      }
      if (c.style.height !== H + 'px') c.style.height = H + 'px';
      h = H;
      if (c.width !== Math.round(w * d) || c.height !== Math.round(h * d)) { c.width = Math.round(w * d); c.height = Math.round(h * d); }
      ctx.setTransform(d, 0, 0, d, 0, 0);
      L = { scene, chart, stacked };
    }

    function render() {
      layout();
      const C = colours();
      ctx.clearRect(0, 0, w, h);
      const st = { ctx, C, fab, t: clamp(el / cfg.D, 0, 1), el: Math.min(el, cfg.D), D: cfg.D, scene: L.scene, chart: L.chart, stacked: L.stacked };
      cfg.draw(st);
      // the rule between what the fabric does and what the instrument records
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath();
      if (L.stacked) { const y = Math.round(L.chart.y - 7) + 0.5; ctx.moveTo(0, y); ctx.lineTo(w, y); }
      else { const x = Math.round(L.chart.x - 8) + 0.5; ctx.moveTo(x, 6); ctx.lineTo(x, h - 6); }
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
      if (cfg.reset) cfg.reset(fab);
      el = STILL ? cfg.D : 0; last = 0;
      render();
      if (!STILL && !running) { running = true; requestAnimationFrame(tick); }
    }

    btns.forEach(b => b.addEventListener('click', () => {
      fab = b.dataset.fab;
      btns.forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      restart();
    }));
    c.tabIndex = 0;
    c.addEventListener('click', restart);
    c.addEventListener('keydown', ev => { if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); restart(); } });
    window.addEventListener('resize', () => { if (cfg.resize) cfg.resize(); render(); });

    if (cfg.reset) cfg.reset(fab);
    render();
    if (STILL) { restart(); return; }
    if ('IntersectionObserver' in window) {
      let first = true;
      new IntersectionObserver(es => {
        visible = es[0].isIntersecting;
        if (visible && first) { first = false; restart(); }
      }, { threshold: 0.35 }).observe(c);
    } else restart();
  }

  // ---------------------------------------------------------------- chart kit

  // Axes for the instrument's output. Grey frame, orange data, and a title
  // that says on its face this is the instrument and the values are illustrative.
  function axes(st, o) {
    const { ctx, C } = st, r = st.chart;
    const padL = 36, padR = 10, padT = 40, padB = 26;
    const px = r.x + padL, py = r.y + padT, pw = r.w - padL - padR, ph = r.h - padT - padB;
    const X = v => px + (v - o.x0) / (o.x1 - o.x0) * pw;
    const Y = v => py + ph - (v - o.y0) / (o.y1 - o.y0) * ph;
    ctx.save();
    ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.font = '500 10px ' + C.mono; ctx.fillStyle = C.ink;
    ctx.fillText(o.title, r.x + 2, r.y + 4);
    ctx.font = '9.5px ' + C.mono; ctx.fillStyle = CHART_TEXT;
    ctx.fillText('instrument output', r.x + 2, r.y + 17);
    const lw = ctx.measureText('instrument output').width;
    ctx.fillStyle = C.dim; ctx.fillText(' · illustrative', r.x + 2 + lw, r.y + 17);
    // frame
    ctx.strokeStyle = C.faint; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(px + 0.5, py - 4); ctx.lineTo(px + 0.5, py + ph + 0.5); ctx.lineTo(px + pw, py + ph + 0.5); ctx.stroke();
    ctx.font = '9px ' + C.mono; ctx.fillStyle = C.dim;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (const [v, lab] of o.yTicks || []) { const y = Math.round(Y(v)) + 0.5; ctx.beginPath(); ctx.moveTo(px - 3, y); ctx.lineTo(px, y); ctx.stroke(); ctx.fillText(lab, px - 5, y); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (const [v, lab] of o.xTicks || []) { const x = Math.round(X(v)) + 0.5; ctx.beginPath(); ctx.moveTo(x, py + ph); ctx.lineTo(x, py + ph + 3); ctx.stroke(); ctx.fillText(lab, x, py + ph + 5); }
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillStyle = C.dim;
    ctx.fillText(o.yLabel, px + 4, py - 3);
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText(o.xLabel, px + pw, py + ph - 3);
    ctx.restore();
    return { X, Y, px, py, pw, ph };
  }

  function plot(ctx, pts, X, Y, dash) {
    if (pts.length < 2) return;
    ctx.save(); ctx.strokeStyle = CHART; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); pts.forEach(([a, b], i) => i ? ctx.lineTo(X(a), Y(b)) : ctx.moveTo(X(a), Y(b))); ctx.stroke();
    ctx.restore();
  }
  function dot(ctx, x, y, r) { ctx.fillStyle = CHART; ctx.beginPath(); ctx.arc(x, y, r || 3.5, 0, Math.PI * 2); ctx.fill(); }
  function label(st, text, x, y, align, col) {
    const { ctx, C } = st; ctx.save(); ctx.font = '9.5px ' + C.mono; ctx.fillStyle = col || C.dim;
    ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y); ctx.restore();
  }
  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function machine(ctx, x, y, w, h, r) { rrect(ctx, x, y, w, h, r || 2); ctx.fillStyle = MACH.fill; ctx.fill(); ctx.strokeStyle = MACH.edge; ctx.lineWidth = 1; ctx.stroke(); }

  // ============================================================ 1. surface

  // Side view. A probe on a vertical arm runs left to right at constant speed.
  // Crepe is one continuous wavy profile the probe rides over. Fur is a
  // backing with fibres leaning one way (the nap); each fibre is a damped
  // spring on its angle, so with the nap the probe presses them flat and they
  // ease back, and against it they are pushed upright and flick back past
  // their rest angle once the probe lets go.
  (() => {
    const FAB = {
      crepe: { name: 'Crepe', col: '#c99088', dark: '#8a5b55', light: '#e8beb6' },
      nap:   { name: 'Fur, with the nap', col: '#b6946e', dark: '#6b5641', sign: 1 },
      anti:  { name: 'Fur, against the nap', col: '#b6946e', dark: '#6b5641', sign: -1 },
    };
    const N_TRACE = 420, DT = 1 / 240, R = 10;
    let fab = 'crepe', fibres = [], simT = 0, builtFor = '', trace = [];
    const prof = xn => 0.86 * Math.sin(2 * Math.PI * 11 * xn) + 0.14 * Math.sin(2 * Math.PI * 29 * xn + 1.1);
    const dprof = xn => (prof(xn + 1e-4) - prof(xn - 1e-4)) / 2e-4;

    function mu(f, u) {
      if (f === 'crepe') return 0.30 + 0.07 * dprof(u) / (2 * Math.PI * 11) + 0.005 * wobble(u, 1);   // drag rises on every climb
      if (f === 'nap') return 0.13 + 0.007 * wobble(u, 2);
      // against the nap: a high mean with stick-slip spikes, each a slow build and a sudden release
      let s = 0, a = 0, k = 0;
      while (a < 1.05) { const len = 0.022 + 0.04 * hash(k * 3 + 1), amp = 0.06 + 0.13 * hash(k * 5 + 2); if (u >= a && u < a + len) { s = amp * Math.pow((u - a) / len, 2); break; } a += len; k++; }
      return 0.38 + 0.022 * wobble(u, 3) + s;
    }

    function geom(st) {
      const s = st.scene, x0 = s.x + 6, x1 = s.x + s.w - 6, yb = s.y + s.h * 0.88;
      return { s, x0, x1, yb, xa: x0 + 24, xb: x1 - 24, pile: s.h * 0.36, back: 6 };
    }
    const travel = el => seg(el, 0.35, 5.65);                             // seconds of a 6 s test the probe is moving
    const probeX = (g, el) => g.xa + (g.xb - g.xa) * travel(el);

    function build(g) {
      fibres = [];
      const n = Math.floor((g.x1 - g.x0) / 3.1);
      for (let i = 0; i < n; i++) {
        const sgn = FAB[fab].sign;
        const th0 = sgn * (50 + 10 * hash(i + 7)) * Math.PI / 180;
        fibres.push({ x: g.x0 + 2 + i * 3.1, L: g.pile * (0.82 + 0.3 * hash(i + 3)), th0, th: th0, om: 0, shade: hash(i + 11) });
      }
      simT = 0; builtFor = fab + '|' + Math.round(g.x1 - g.x0) + '|' + Math.round(g.pile);
    }
    function shoeY(g) { return g.yb - g.back - g.pile * 0.36; }
    function step(g, el) {
      const px = probeX(g, el), sgn = FAB[fab].sign;
      for (const f of fibres) {
        const tipRest = f.x + f.L * Math.sin(f.th0);
        let contact, target, k, z;
        if (sgn > 0) {          // with the nap: pressed flat under the shoe, eased back after
          contact = Math.abs(tipRest - px) < R + 6;
          target = contact ? 80 * Math.PI / 180 : f.th0; k = contact ? 1400 : 240; z = contact ? 1 : 1.15;
        } else {                // against: caught, stood up past vertical, released into a flick
          contact = f.x > px - R * 0.5 && tipRest < px + R + 2;
          target = contact ? 6 * Math.PI / 180 : f.th0; k = contact ? 1400 : 360; z = contact ? 1 : 0.11;
        }
        const cdamp = 2 * z * Math.sqrt(k);
        f.om += (k * (target - f.th) - cdamp * f.om) * DT; f.th += f.om * DT;
      }
    }
    function advance(g, el) {
      if (builtFor !== fab + '|' + Math.round(g.x1 - g.x0) + '|' + Math.round(g.pile)) build(g);
      if (el < simT) build(g);
      while (simT + DT <= el) { simT += DT; step(g, simT); }
    }

    function drawFur(st, g) {
      const { ctx } = st, F = FAB[fab], sy = shoeY(g), px = probeX(g, st.el), yr = g.yb - g.back;
      ctx.fillStyle = F.dark; ctx.fillRect(g.x0, yr, g.x1 - g.x0, g.back);
      ctx.lineWidth = 1.25; ctx.lineCap = 'round';
      for (const f of fibres) {
        let tx = f.x + f.L * Math.sin(f.th), ty = yr - f.L * Math.cos(f.th);
        if (ty < sy && Math.abs(tx - px) < R + 3) {       // a fibre under the shoe is bent down to it, keeping its length
          ty = sy + 0.5; const dy = yr - ty; tx = f.x + Math.sign(Math.sin(f.th) || 1) * Math.sqrt(Math.max(0, f.L * f.L - dy * dy));
        }
        ctx.strokeStyle = f.shade < 0.33 ? F.dark : f.shade < 0.8 ? F.col : '#d9bd98';
        ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.moveTo(f.x, yr); ctx.quadraticCurveTo(f.x + (tx - f.x) * 0.2, yr - (yr - ty) * 0.65, tx, ty); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      label(st, F.sign > 0 ? 'nap →' : '← nap', g.x0 + 4, g.yb + 8);
    }

    function drawCrepe(st, g) {
      const { ctx } = st, F = FAB.crepe, T = g.s.h * 0.13, A = g.s.h * 0.055;
      const top = x => g.yb - T - A * prof((x - g.x0) / (g.x1 - g.x0));
      const bot = x => g.yb - A * 0.35 * prof((x - g.x0) / (g.x1 - g.x0));
      ctx.beginPath(); ctx.moveTo(g.x0, top(g.x0));
      for (let x = g.x0; x <= g.x1; x += 2) ctx.lineTo(x, top(x));
      for (let x = g.x1; x >= g.x0; x -= 2) ctx.lineTo(x, bot(x));
      ctx.closePath(); ctx.fillStyle = F.col; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.strokeStyle = F.dark; ctx.lineWidth = 0.9; ctx.globalAlpha = 0.6;   // the crinkle: short pebbly strokes through the cloth
      for (let x = g.x0 + 2, i = 0; x < g.x1; x += 4.5, i++) {
        const y0 = top(x) + 2 + 3 * hash(i), y1 = bot(x) - 2;
        ctx.beginPath(); ctx.moveTo(x, y0); for (let y = y0; y < y1; y += 3) ctx.lineTo(x + 1.6 * Math.sin(y * 0.9 + i), y); ctx.stroke();
      }
      ctx.restore(); ctx.globalAlpha = 1;
      ctx.strokeStyle = F.light; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = g.x0; x <= g.x1; x += 2) x === g.x0 ? ctx.moveTo(x, top(x)) : ctx.lineTo(x, top(x));
      ctx.stroke();
      return top;
    }

    function drawProbe(st, g, bottomY) {
      const { ctx } = st, px = probeX(g, st.el), rail = g.s.y + 14;
      ctx.strokeStyle = MACH.edge; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.x0, rail + 0.5); ctx.lineTo(g.x1, rail + 0.5); ctx.stroke();
      machine(ctx, px - 12, rail - 5, 24, 10, 2);
      ctx.fillStyle = MACH.edge; ctx.fillRect(px - 1.25, rail + 5, 2.5, bottomY - 7 - rail - 5);
      rrect(ctx, px - R, bottomY - 7, 2 * R, 7, 3.5); ctx.fillStyle = MACH.fill; ctx.fill(); ctx.strokeStyle = MACH.edge; ctx.stroke();
      const right = px < (g.x0 + g.x1) / 2; label(st, 'probe', px + (right ? 16 : -16), rail + 16, right ? 'left' : 'right');
      label(st, '→', g.x1 - 2, rail - 8, 'right');
    }

    figure({
      id: 'qcSurf', D: 6, sceneRatio: 0.52, sceneMin: 165, sceneMax: 220,
      reset(f) { fab = f; builtFor = ''; },
      draw(st) {
        const g = geom(st);
        if (fab === 'crepe') {
          const top = drawCrepe(st, g), px = probeX(g, st.el);
          let yMin = Infinity; for (let x = px - R; x <= px + R; x += 1) yMin = Math.min(yMin, top(x));
          drawProbe(st, g, yMin);
        } else { advance(g, st.el); drawFur(st, g); drawProbe(st, g, shoeY(g)); }
        const ax = axes(st, { title: 'FRICTION TRACE', x0: 0, x1: 1, y0: 0, y1: 0.62, yLabel: 'friction (μ)', xLabel: 'distance →', yTicks: [[0, '0'], [0.2, '.2'], [0.4, '.4'], [0.6, '.6']] });
        const u = travel(st.el), pts = [];
        for (let i = 0; i <= N_TRACE * u; i++) { const v = i / N_TRACE; pts.push([v, mu(fab, v)]); }
        if (u > 0) { pts.push([u, mu(fab, u)]); plot(st.ctx, pts, ax.X, ax.Y); dot(st.ctx, ax.X(u), ax.Y(mu(fab, u)), 2.6); }
      },
      readout(st) {
        const done = st.t >= 1;
        if (fab === 'crepe') return '<strong>Crepe.</strong> The probe rides up and down every crinkle, so the trace undulates with the surface' + (done ? ': moderate mean friction, a regular ripple, high roughness.' : '…');
        if (fab === 'nap') return '<strong>Fur, with the nap.</strong> Fibres near the probe lie down and ease back' + (done ? ': low, steady friction.' : '…');
        return '<strong>Fur, against the nap.</strong> Fibres catch, stand up and flick back as the probe passes' + (done ? ': high, spiky friction. Same fabric, opposite direction.' : '…');
      },
    });
  })();

  // ============================================================ 2. bending

  // The cantilever test (ASTM D1388). The overhang is the large-deflection
  // elastica: split into 70 segments, curvature at s is the moment of the
  // overhang beyond s under its own weight over c³ (c = bending length), angles
  // integrated from the clamped edge, positions back from the angles, iterated
  // 14 times with 50% relaxation (less past 2.5c, see below), capped at 90°. It is a droop, never
  // a kink. The reading is the overhang at which the line from the edge to the
  // tip first reaches 41.5°; half of it is the bending length.
  (() => {
    const FAB = {
      denim:     { name: 'Cotton denim', c: 95, Lmax: 225, col: '#4566a8', w: 5.6, texture: '#7d98cc', word: 'stiff (koshi)' },
      poplin:    { name: 'Poplin shirting', c: 58, Lmax: 160, col: '#efebe1', w: 3.0, edge: '#8b9494', word: 'medium' },
      charmeuse: { name: 'Silk charmeuse', c: 22, Lmax: 95, col: '#d9c39a', w: 1.6, sheen: '#fff4da', word: 'limp; it drapes' },
    };
    const WW = 380, WH = 236, E = 112, TOP = 40, ANG = 41.5 * Math.PI / 180;
    let fab = 'denim';
    const cache = {};

    function cantilever(l, c, init) {
      const N = 70, ds = l / N, th = init ? Float64Array.from(init) : new Float64Array(N), x = new Float64Array(N + 1), y = new Float64Array(N + 1), M = new Float64Array(N + 1);
      if (l <= 0) return { x, y, th };
      const c3 = c * c * c;
      // 50% relaxation, as specified, up to an overhang of 2.5 bending lengths; past
      // that the fixed point oscillates between two shapes at 50% (measured: the
      // tip angle jumps backwards near 2.9c), so the step shrinks with (2.5c/l)².
      const RX = Math.min(0.5, 0.5 * Math.pow(2.5 * c / l, 2));
      for (let it = 0; it < 14; it++) {
        for (let i = 0; i < N; i++) { x[i + 1] = x[i] + ds * Math.cos(th[i]); y[i + 1] = y[i] + ds * Math.sin(th[i]); }
        let S0 = 0, S1 = 0;                                       // moment of everything beyond node j about node j
        for (let j = N; j >= 0; j--) { M[j] = S1 - x[j] * S0; if (j > 0) { S0 += ds; S1 += ds * (x[j - 1] + x[j]) / 2; } }
        let acc = 0;
        for (let i = 0; i < N; i++) {
          const k0 = M[i] / c3, k1 = M[i + 1] / c3;
          const mid = Math.min(Math.PI / 2, acc + ds * 0.5 * (0.75 * k0 + 0.25 * k1));
          th[i] = (1 - RX) * th[i] + RX * mid;
          acc += ds * 0.5 * (k0 + k1);
        }
      }
      for (let i = 0; i < N; i++) { x[i + 1] = x[i] + ds * Math.cos(th[i]); y[i + 1] = y[i] + ds * Math.sin(th[i]); }
      return { x, y, th };
    }
    // Continuation: each overhang on a fine grid starts its iteration from the
    // converged shape one step shorter, so a limp strip far past l = 3c still
    // converges inside the 14 iterations instead of jittering.
    const GRID = 240;
    function solveAt(f, l) {
      const cv = curve(f), F = FAB[f], i = Math.min(GRID, Math.floor(l / F.Lmax * GRID));
      return cantilever(l, F.c, cv.th[i]);
    }
    const tipAngle = s => { const n = s.x.length - 1; return s.x[n] === 0 && s.y[n] === 0 ? 0 : Math.atan2(s.y[n], s.x[n]); };

    function curve(f) {
      if (cache[f]) return cache[f];
      const F = FAB[f], pts = [], th = [];
      let star = null, prev = null;
      for (let i = 0; i <= GRID; i++) {
        const l = F.Lmax * i / GRID, s = cantilever(l, F.c, prev), a = tipAngle(s);
        if (!star && a >= ANG && i > 0) {                          // refine the first crossing by bisection
          let lo = F.Lmax * (i - 1) / GRID, hi = l;
          for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (tipAngle(cantilever(m, F.c, prev)) >= ANG) hi = m; else lo = m; }
          const t = cantilever(hi, F.c, prev), n = t.x.length - 1;
          star = { l: hi, x: t.x[n], y: t.y[n] };
        }
        th.push(prev = s.th); pts.push([l, a * 180 / Math.PI]);
      }
      return (cache[f] = { pts, star, th });
    }
    const slideL = (f, el) => FAB[f].Lmax * seg(el, 0.4, 6.6);

    function swatch(ctx, f, x, y, s) {
      ctx.save(); rrect(ctx, x, y, s, s, 1); ctx.clip();
      if (f === 'denim') {
        ctx.fillStyle = '#2f4d8a'; ctx.fillRect(x, y, s, s);
        ctx.strokeStyle = '#7d98cc'; ctx.lineWidth = 1.4;
        for (let k = -s; k < s * 2; k += 4) { ctx.beginPath(); ctx.moveTo(x + k, y + s); ctx.lineTo(x + k + s * 0.75, y); ctx.stroke(); }
      } else if (f === 'poplin') {
        ctx.fillStyle = '#efebe1'; ctx.fillRect(x, y, s, s);
        ctx.strokeStyle = '#c8c3b6'; ctx.lineWidth = 0.8;
        for (let k = 0; k <= s; k += 3) { ctx.beginPath(); ctx.moveTo(x + k + 0.5, y); ctx.lineTo(x + k + 0.5, y + s); ctx.moveTo(x, y + k + 0.5); ctx.lineTo(x + s, y + k + 0.5); ctx.stroke(); }
        ctx.fillStyle = '#dcd7ca'; for (let i = 0; i < s; i += 3) for (let j = (i / 3) % 2 ? 0 : 3; j < s; j += 6) ctx.fillRect(x + i, y + j, 3, 3);
      } else {
        const g = ctx.createLinearGradient(x, y, x + s, y + s);
        g.addColorStop(0, '#b89d6e'); g.addColorStop(0.35, '#f3e2bd'); g.addColorStop(0.5, '#fff7e2'); g.addColorStop(0.65, '#e7d2a6'); g.addColorStop(1, '#b4996a');
        ctx.fillStyle = g; ctx.fillRect(x, y, s, s);
      }
      ctx.restore();
      ctx.strokeStyle = '#8b9494'; ctx.lineWidth = 0.8; rrect(ctx, x + 0.5, y + 0.5, s - 1, s - 1, 1); ctx.stroke();
    }

    figure({
      id: 'qcBend', D: 7, sceneRatio: 0.66, sceneMin: 200, sceneMax: 250, wideH: 300,
      reset(f) { fab = f; curve(f); },
      draw(st) {
        const { ctx, C } = st, s = st.scene, F = FAB[fab];
        const k = Math.min(s.w / WW, s.h / WH), ox = s.x + (s.w - WW * k) / 2, oy = s.y + (s.h - WH * k) / 2;
        const P = (x, y) => [ox + x * k, oy + y * k];
        const l = slideL(fab, st.el), cv = curve(fab);
        // the 41.5° line from the table edge
        ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = C.dim; ctx.lineWidth = 1;
        const [ex, ey] = P(E, TOP), [lx, ly] = P(E + 250 * Math.cos(ANG), TOP + 250 * Math.sin(ANG));
        ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(lx, ly); ctx.stroke(); ctx.restore();
        ctx.strokeStyle = C.faint; ctx.beginPath(); ctx.arc(ex, ey, 26 * k, 0, ANG); ctx.stroke();
        { const d = 150, [qx, qy] = P(E + d * Math.cos(ANG) + 9 * Math.sin(ANG), TOP + d * Math.sin(ANG) - 9 * Math.cos(ANG)); label(st, '41.5°', qx, qy, 'left'); }
        // the table, the specimen on it, the slide weight on the specimen
        const [tx, ty] = P(-20, TOP); machine(ctx, tx, ty, ex - tx, 14 * k, 0);
        label(st, 'table edge', ex - 4, ty + 22 * k, 'right');
        const sh = solveAt(fab, l), back = F.Lmax + 110 - l;
        const pts = [P(E - back, TOP - F.w / 2 / Math.max(k, 0.6))];
        for (let i = 0; i < sh.x.length; i++) pts.push(P(E + sh.x[i], TOP - F.w / 2 / Math.max(k, 0.6) + sh.y[i]));
        const stroke = (col, lw, dash, dy) => { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'butt'; if (dash) ctx.setLineDash(dash); ctx.beginPath(); pts.forEach(([a, b], i) => i ? ctx.lineTo(a, b + (dy || 0)) : ctx.moveTo(a, b + (dy || 0))); ctx.stroke(); ctx.restore(); };
        if (F.edge) stroke(F.edge, F.w + 1.4);
        stroke(F.col, F.w);
        if (F.texture) stroke(F.texture, 1.2, [2, 3]);
        if (F.sheen) stroke(F.sheen, 0.7, null, -0.45);
        const wx0 = E - back + 6, [wa, wb] = P(wx0, TOP - F.w / Math.max(k, 0.6) - 10);
        machine(ctx, wa, wb, Math.min(80 * k, ex - 4 * k - wa), 10 * k, 1.5);
        // the reading: where the tip first crossed the line
        if (cv.star && l >= cv.star.l) {
          const [dx, dy] = P(E + cv.star.x, TOP + cv.star.y);
          dot(ctx, dx, dy, 3.6);
          label(st, 'tip crossed here', dx + 8, dy + 1, 'left');
        }
        // a face view of the cloth, so the three read as three fabrics
        const sw = Math.round(clamp(40 * k, 26, 40)), sx = s.x + s.w - sw - 6, sy = s.y + 18;
        swatch(ctx, fab, sx, sy, sw);
        label(st, 'face', sx + sw / 2, sy - 9, 'center');
        // the chart
        const ax = axes(st, { title: 'TIP ANGLE vs OVERHANG', x0: 0, x1: 240, y0: 0, y1: 90, yLabel: 'tip angle', xLabel: 'overhang →', yTicks: [[0, '0'], [41.5, '41.5°'], [90, '90°']], xTicks: [[0, '0'], [100, '100'], [200, '200']] });
        ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = C.faint; ctx.beginPath(); ctx.moveTo(ax.px, Math.round(ax.Y(41.5)) + 0.5); ctx.lineTo(ax.px + ax.pw, Math.round(ax.Y(41.5)) + 0.5); ctx.stroke(); ctx.restore();
        const live = cv.pts.filter(p => p[0] <= l); if (l > 0) live.push([l, tipAngle(sh) * 180 / Math.PI]);
        plot(ctx, live, ax.X, ax.Y);
        if (cv.star && l >= cv.star.l) dot(ctx, ax.X(cv.star.l), ax.Y(41.5), 3.6);
      },
      readout(st) {
        const F = FAB[fab], cv = curve(fab), l = slideL(fab, st.el);
        if (cv.star && l >= cv.star.l) {
          const o = Math.round(cv.star.l);
          return '<strong>' + F.name + '.</strong> Tip crossed 41.5° at an overhang of <strong>' + o + '</strong> → bending length ≈ <strong>' + Math.round(o / 2) + '</strong> (panel units; illustrative). ' + F.word.charAt(0).toUpperCase() + F.word.slice(1) + '.';
        }
        return '<strong>' + F.name + '.</strong> Sliding off the edge · overhang ' + Math.round(l) + '…';
      },
    });
  })();

  // ============================================================ 3. stretch

  // A strip between two jaws, pulled at a constant rate to a fixed load and
  // returned. The structure is drawn in the strip's own coordinates and mapped
  // through the stretch (longer by e, narrower by nu·e), so jersey's V stitches
  // elongate and narrow and the mesh's diamonds go tall. Loading is solid,
  // unloading dashed; the gap at zero load is growth.
  (() => {
    const FAB = {
      jersey: { name: 'Cotton jersey', emax: 0.60, set: 0.15, p: 1.7, q: 3.0, nu: 0.55, col: '#7f8a96', yarn: '#d3d9df' },
      mesh:   { name: 'Nylon/elastane power mesh', emax: 0.42, set: 0.02, p: 1.15, q: 1.6, nu: 0.38, col: '#c49a82', yarn: '#e2bba4' },
    };
    let fab = 'jersey';
    const loadUp = (F, e) => Math.pow(clamp(e / F.emax, 0, 1), F.p);
    const loadDown = (F, e) => Math.pow(clamp((e - F.set) / (F.emax - F.set), 0, 1), F.q);
    function state(F, el) {             // extension and phase at time el of a 6.5 s test
      const a = seg(el, 0.4, 2.9), b = seg(el, 3.3, 5.8);
      if (el < 3.3) return { e: F.emax * a, up: true, a, b: 0 };
      return { e: lerp(F.emax, F.set, b), up: false, a: 1, b };
    }

    function drawStrip(st, F, e) {
      const { ctx } = st, s = st.scene;
      const L0 = s.h * 0.40, W0 = Math.min(130, s.w * 0.36), cx = s.x + s.w / 2;
      const jawH = 16, top = s.y + 12 + jawH;
      const W = W0 * (1 - F.nu * e), Ln = L0 * (1 + e);
      const map = (u, v) => [cx + u * W, top + v * Ln];
      // jaws
      machine(ctx, cx - W0 / 2 - 16, s.y + 12, W0 + 32, jawH, 1.5);
      machine(ctx, cx - W0 / 2 - 16, top + Ln, W0 + 32, jawH, 1.5);
      ctx.strokeStyle = MACH.dark; ctx.lineWidth = 1;
      for (const yy of [s.y + 12 + jawH - 3, top + Ln + 3]) { ctx.beginPath(); for (let x = cx - W0 / 2 - 12; x < cx + W0 / 2 + 14; x += 4) { ctx.moveTo(x, yy - 1.5); ctx.lineTo(x + 2, yy + 1.5); } ctx.stroke(); }
      label(st, 'jaw', cx + W0 / 2 + 20, s.y + 12 + jawH / 2);
      label(st, 'jaw · moves', cx + W0 / 2 + 20, top + Ln + jawH / 2);
      // the strip
      ctx.save();
      ctx.beginPath(); ctx.rect(cx - W / 2, top, W, Ln); ctx.clip();
      ctx.fillStyle = F.col; ctx.globalAlpha = fab === 'mesh' ? 0.25 : 1; ctx.fillRect(cx - W / 2, top, W, Ln); ctx.globalAlpha = 1;
      if (fab === 'jersey') {
        const nW = Math.max(5, Math.round(W0 / 12)), nR = Math.max(8, Math.round(L0 / 9));
        ctx.strokeStyle = F.yarn; ctx.lineWidth = 1.3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let i = 0; i < nW; i++) for (let j = -1; j < nR; j++) {
          const u = -0.5 + (i + 0.5) / nW, v = (j + 0.2) / nR, a = 0.40 / nW, b = 1.15 / nR;
          const p1 = map(u - a, v), p2 = map(u, v + b), p3 = map(u + a, v);
          ctx.beginPath(); ctx.moveTo(...p1); ctx.quadraticCurveTo(...map(u - a * 0.2, v + b * 0.35), ...p2); ctx.quadraticCurveTo(...map(u + a * 0.2, v + b * 0.35), ...p3); ctx.stroke();
        }
      } else {
        const nD = 7, dw = 1 / nD, dh = dw * W0 / L0 * 1.3;
        ctx.strokeStyle = F.yarn; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
        for (let r = -1; r * dh / 2 < 1 + dh; r++) for (let i = -1; i <= nD; i++) {
          const uc = -0.5 + (i + (r % 2 ? 0.5 : 0)) * dw + dw / 2, vc = r * dh / 2;
          ctx.beginPath(); ctx.moveTo(...map(uc, vc - dh / 2)); ctx.lineTo(...map(uc + dw / 2, vc)); ctx.lineTo(...map(uc, vc + dh / 2)); ctx.lineTo(...map(uc - dw / 2, vc)); ctx.closePath(); ctx.stroke();
        }
      }
      ctx.restore();
      ctx.strokeStyle = F.yarn; ctx.globalAlpha = 0.5; ctx.lineWidth = 1; ctx.strokeRect(cx - W / 2 + 0.5, top, W - 1, Ln); ctx.globalAlpha = 1;
    }

    figure({
      id: 'qcStretch', D: 6.5, sceneRatio: 0.62, sceneMin: 200, sceneMax: 240,
      reset(f) { fab = f; },
      draw(st) {
        const F = FAB[fab], S = state(F, st.el);
        drawStrip(st, F, S.e);
        const { ctx } = st;
        const ax = axes(st, { title: 'LOAD vs EXTENSION', x0: 0, x1: 0.7, y0: 0, y1: 1.08, yLabel: 'load', xLabel: 'extension →', xTicks: [[0, '0'], [0.2, '20%'], [0.4, '40%'], [0.6, '60%']] });
        const up = [], down = [];
        for (let i = 0; i <= 120 * S.a; i++) { const e = F.emax * i / 120; up.push([e, loadUp(F, e)]); }
        if (!S.up) for (let i = 0; i <= 120 * S.b; i++) { const e = lerp(F.emax, F.set, i / 120); down.push([e, loadDown(F, e)]); }
        if (S.up && S.a > 0) up.push([S.e, loadUp(F, S.e)]);
        if (st.t >= 1) {                                // the energy lost on the round trip
          ctx.save(); ctx.fillStyle = CHART; ctx.globalAlpha = 0.13; ctx.beginPath();
          up.forEach(([a, b], i) => i ? ctx.lineTo(ax.X(a), ax.Y(b)) : ctx.moveTo(ax.X(a), ax.Y(b)));
          down.forEach(([a, b]) => ctx.lineTo(ax.X(a), ax.Y(b)));
          ctx.closePath(); ctx.fill(); ctx.restore();
          const y = ax.Y(0) - 7, x0 = ax.X(0), x1 = ax.X(F.set);
          ctx.strokeStyle = CHART; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y - 3); ctx.lineTo(x0, y); ctx.lineTo(x1, y); ctx.lineTo(x1, y - 3); ctx.stroke();
          label(st, 'growth', x1 + 4, y - 3, 'left', CHART_TEXT);
          const em = F.emax * 0.62;
          if (fab === 'jersey') label(st, 'energy lost', ax.X(em), ax.Y((loadUp(F, em) + loadDown(F, em)) / 2), 'center', CHART_TEXT);
          else label(st, 'energy lost', ax.X(em) + 14, ax.Y(loadDown(F, em)) + 4, 'left', CHART_TEXT);
        }
        plot(ctx, up, ax.X, ax.Y);
        plot(ctx, down, ax.X, ax.Y, [5, 4]);
        const cur = S.up ? [S.e, loadUp(F, S.e)] : [S.e, loadDown(F, S.e)];
        if (st.el > 0.4) dot(ctx, ax.X(cur[0]), ax.Y(cur[1]), 2.8);
        label(st, '— loading   - - unloading', ax.px + 6, ax.py + 8, 'left', st.C.dim);
      },
      readout(st) {
        const F = FAB[fab], S = state(F, st.el);
        if (st.t >= 1) return fab === 'jersey'
          ? '<strong>Cotton jersey.</strong> Soft to pull, a wide loop, and it comes back about <strong>15%</strong> longer than it started: it bags.'
          : '<strong>Power mesh.</strong> Steeper to pull, a narrow loop, and back within about <strong>2%</strong>: it snaps home.';
        return '<strong>' + F.name + '.</strong> ' + (S.up ? 'Loading' : 'Unloading') + ' · extension ' + Math.round(S.e * 100) + '%…';
      },
    });
  })();

  // ============================================================ 4. squish

  // A platen presses down at a constant rate to a fixed pressure and lifts
  // off. Spacer mesh is two mesh faces held apart by crossed monofilaments; a
  // filament keeps its length, so as the gap closes it bows sideways (the
  // plateau is them buckling). Fleece is a backing with crimped fibres; a
  // fibre keeps its length too, so its crimp tightens as it is pressed.
  (() => {
    const FAB = {
      spacer: { name: 'Spacer mesh', xm: 0.70, xr: 0.04, q: 1.4, face: '#d6dde0', mono: '#a9bcc4' },
      fleece: { name: 'Fleece', xm: 0.75, xr: 0.08, q: 2.2, col: '#cdbd9c', dark: '#8f7f62' },
    };
    let fab = 'spacer';
    const pUp = (f, x) => f === 'spacer'
      ? 0.30 * (1 - Math.exp(-x / 0.035)) + 0.12 * x + (x > 0.5 ? 0.62 * Math.pow((x - 0.5) / 0.2, 2.6) : 0)
      : (Math.exp(x / 0.17) - 1) / (Math.exp(0.75 / 0.17) - 1);
    const pDown = (f, x) => { const F = FAB[f]; return pUp(f, x) * Math.pow(clamp((x - F.xr) / (F.xm - F.xr), 0, 1), F.q); };
    function state(f, el) {             // 6.5 s: press, hold, release, lift off
      const F = FAB[f];
      const a = seg(el, 0.4, 2.9), b = seg(el, 3.3, 5.8), lift = seg(el, 5.8, 6.4);
      if (el < 3.3) return { x: F.xm * a, up: true, a, b: 0, lift: 0 };
      return { x: lerp(F.xm, F.xr, b), up: false, a: 1, b, lift };
    }

    function drawSpacer(st, g, x) {
      const { ctx } = st, F = FAB.spacer;
      const fh0 = g.T0 * 0.17, fh = fh0 * (1 - 0.15 * x), Tn = g.T0 * (1 - x), ytop = g.yb - Tn;
      const g0 = g.T0 - 2 * fh0, gap = Tn - 2 * fh;
      // monofilaments first, so the faces sit over their ends
      const d = 10, pitch = 15;
      ctx.strokeStyle = F.mono; ctx.lineWidth = 1;
      let n = 0;
      for (let xi = g.x0 + 4; xi + d < g.x1 - 2; xi += pitch, n++) {
        for (const [xa, xb, side] of [[xi, xi + d, 1], [xi + d, xi, -1]]) {
          const Lm = Math.hypot(g0, d), C = Math.hypot(gap, d), bow = Math.sqrt(Math.max(0, 3 * C * (Lm - C) / 8));
          const y0 = g.yb - fh, y1 = ytop + fh, mx = (xa + xb) / 2, my = (y0 + y1) / 2;
          const nx = (y1 - y0) / C, ny = -(xb - xa) / C, sgn = side * (n % 2 ? 1 : -1);
          ctx.beginPath(); ctx.moveTo(xa, y0); ctx.quadraticCurveTo(mx + nx * 2 * bow * sgn, my + ny * 2 * bow * sgn, xb, y1); ctx.stroke();
        }
      }
      // two mesh faces: rows of small loops
      for (const [y0] of [[g.yb - fh], [ytop]]) {
        ctx.fillStyle = F.face; ctx.globalAlpha = 0.22; ctx.fillRect(g.x0, y0, g.x1 - g.x0, fh); ctx.globalAlpha = 1;
        ctx.strokeStyle = F.face; ctx.lineWidth = 1.1;
        const rows = 2, rh = fh / rows;
        for (let r = 0; r < rows; r++) for (let xx = g.x0 + 3 + (r % 2) * 3; xx < g.x1 - 2; xx += 6) {
          ctx.beginPath(); ctx.ellipse(xx, y0 + rh * (r + 0.5), 2.6, Math.max(1, rh * 0.42), 0, 0, Math.PI * 2); ctx.stroke();
        }
      }
      return ytop;
    }

    function drawFleece(st, g, x) {
      const { ctx } = st, F = FAB.fleece;
      const bh = g.T0 * 0.13, Tn = g.T0 * (1 - x), ytop = g.yb - Tn, base = g.yb - bh;
      ctx.fillStyle = F.dark; ctx.fillRect(g.x0, base, g.x1 - g.x0, bh);
      ctx.strokeStyle = F.col; ctx.lineWidth = 0.9; ctx.globalAlpha = 0.7;
      for (let xx = g.x0 + 3; xx < g.x1; xx += 5) { ctx.beginPath(); ctx.ellipse(xx, base + bh / 2, 2.2, bh * 0.36, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.globalAlpha = 1;
      const nWaves = 3.5, a0 = 2.4;
      let i = 0;
      for (let xx = g.x0 + 2; xx < g.x1 - 1; xx += 4.2, i++) {
        const restH = (g.T0 - bh) * (0.88 + 0.12 * hash(i + 5));
        const hF = Math.min(restH, Tn - bh);
        const L0 = restH * Math.sqrt(1 + 2 * Math.pow(Math.PI * a0 * nWaves / restH, 2));
        const a = hF / (Math.PI * nWaves * Math.SQRT2) * Math.sqrt(Math.max(0, Math.pow(L0 / hF, 2) - 1));
        const ph = hash(i + 9) * Math.PI * 2;
        ctx.strokeStyle = hash(i + 2) < 0.3 ? '#e2d5ba' : F.col; ctx.lineWidth = 1; ctx.globalAlpha = 0.85;
        ctx.beginPath();
        for (let k = 0; k <= 28; k++) { const v = k / 28; const px = xx + a * Math.sin(2 * Math.PI * nWaves * v + ph); const py = base - hF * v; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      return ytop;
    }

    figure({
      id: 'qcSquish', D: 6.5, sceneRatio: 0.56, sceneMin: 180, sceneMax: 230,
      reset(f) { fab = f; },
      draw(st) {
        const { ctx } = st, s = st.scene, S = state(fab, st.el), F = FAB[fab];
        const yb = s.y + s.h - 18, T0 = s.h * 0.5, wF = s.w * 0.66;
        const g = { yb, T0, x0: s.x + (s.w - wF) / 2, x1: s.x + (s.w + wF) / 2 };
        machine(ctx, s.x + s.w * 0.08, yb, s.w * 0.84, 12, 1);                         // the anvil
        const ytop = fab === 'spacer' ? drawSpacer(st, g, S.x) : drawFleece(st, g, S.x);
        const wP = s.w * 0.74, pTop = ytop - 12 - S.lift * T0 * 0.35;
        ctx.fillStyle = MACH.edge; ctx.fillRect(s.x + s.w / 2 - 2, s.y + 4, 4, pTop - s.y - 4);
        machine(ctx, s.x + (s.w - wP) / 2, pTop, wP, 12, 1.5);
        label(st, 'platen', s.x + (s.w + wP) / 2 - 4, pTop - 8, 'right');
        const ax = axes(st, { title: 'PRESSURE vs COMPRESSION', x0: 0, x1: 0.8, y0: 0, y1: 1.08, yLabel: 'pressure', xLabel: 'compression →', xTicks: [[0, '0'], [0.4, '40%'], [0.8, '80%']] });
        const up = [], down = [];
        for (let i = 0; i <= 140 * S.a; i++) { const x = F.xm * i / 140; up.push([x, pUp(fab, x)]); }
        if (S.up && S.a > 0) up.push([S.x, pUp(fab, S.x)]);
        if (!S.up) for (let i = 0; i <= 140 * S.b; i++) { const x = lerp(F.xm, F.xr, i / 140); down.push([x, pDown(fab, x)]); }
        plot(ctx, up, ax.X, ax.Y); plot(ctx, down, ax.X, ax.Y, [5, 4]);
        const p = S.up ? pUp(fab, S.x) : pDown(fab, S.x);
        if (st.el > 0.4) { dot(ctx, ax.X(S.x), ax.Y(p), 4); ctx.fillStyle = st.C.bg; ctx.beginPath(); ctx.arc(ax.X(S.x), ax.Y(p), 1.6, 0, Math.PI * 2); ctx.fill(); }
        if (fab === 'spacer' && S.a > 0.55) label(st, 'plateau', ax.X(0.3), ax.Y(0.36) - 10, 'center', CHART_TEXT);
        label(st, '— press   - - release', ax.px + 6, ax.py + 8, 'left', st.C.dim);
      },
      readout(st) {
        const S = state(fab, st.el);
        if (st.t >= 1) return fab === 'spacer'
          ? '<strong>Spacer mesh.</strong> Firm at first, then a long plateau while the monofilaments buckle, then steep once the faces meet.'
          : '<strong>Fleece.</strong> Gives easily from the first touch and firms up gradually as the fibres pack: full, soft (fukurami).';
        return '<strong>' + FAB[fab].name + '.</strong> ' + (S.up ? 'Pressing' : 'Releasing') + ' · compressed ' + Math.round(S.x * 100) + '%…';
      },
    });
  })();

  // ============================================================ 5. warm or cool

  // A warmed plate is dropped onto the fabric and the heat flowing out of it
  // is logged against time: a spike at contact, then a decay. The peak is
  // q-max. The test is drawn at 2.5× slow motion: 5 s of animation for the
  // first 2 s of contact.
  (() => {
    const FAB = {
      fleece: { name: 'Brushed fleece', qm: 0.38, td: 0.55, col: '#cdbd9c', dark: '#8f7f62' },
      nylon:  { name: 'Dense smooth nylon', qm: 1.0, td: 0.35, col: '#3f639c', sheen: '#7f9fd0' },
    };
    const TC = 0.2, SPAN = 2.0, D = 5;
    let fab = 'fleece';
    const shape = (tau, td) => (1 - Math.exp(-tau / 0.02)) * Math.exp(-tau / td);
    const norms = {};
    const norm = td => norms[td] || (norms[td] = (() => { let m = 0; for (let i = 1; i < 4000; i++) m = Math.max(m, shape(i / 4000, td)); return m; })());
    const flux = (f, ts) => { const F = FAB[f]; return ts <= TC ? 0 : F.qm * shape(ts - TC, F.td) / norm(F.td); };
    const simT = el => el / D * SPAN;

    figure({
      id: 'qcWarm', D, sceneRatio: 0.52, sceneMin: 170, sceneMax: 220,
      reset(f) { fab = f; },
      draw(st) {
        const { ctx } = st, s = st.scene, F = FAB[fab], ts = simT(st.el);
        const yb = s.y + s.h - 16, wF = s.w * 0.72, x0 = s.x + (s.w - wF) / 2, x1 = x0 + wF;
        machine(ctx, s.x + s.w * 0.1, yb, s.w * 0.8, 10, 1);
        // the fabric
        let surface, contacts = [];
        if (fab === 'fleece') {
          const bh = 6, base = yb - bh, pile = s.h * 0.30;
          ctx.fillStyle = F.dark; ctx.fillRect(x0, base, wF, bh);
          let i = 0, top = Infinity;
          const tips = [];
          for (let x = x0 + 2; x < x1 - 1; x += 4.4, i++) { const hgt = pile * (0.62 + 0.38 * hash(i + 1)); tips.push([x, hgt, i]); top = Math.min(top, base - hgt); }
          surface = top;
          for (const [x, hgt, j] of tips) {
            const touched = base - hgt <= top + 2.2;
            const hh = touched ? hgt - 1.2 : hgt;
            ctx.strokeStyle = hash(j + 4) < 0.3 ? '#e4d8bf' : F.col; ctx.lineWidth = 1; ctx.globalAlpha = 0.85;
            ctx.beginPath();
            for (let k = 0; k <= 16; k++) { const v = k / 16; const px = x + 1.6 * Math.sin(v * 9 + j); const py = base - hh * v; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
            ctx.stroke();
            ctx.beginPath(); ctx.arc(x + 1.6 * Math.sin(9 + j), base - hh, 1.3, 0, Math.PI * 2); ctx.stroke();   // fuzzy tip
            if (touched) contacts.push(x);
          }
          ctx.globalAlpha = 1;
          label(st, 'air gaps', x0, base - pile - 10, 'left');
        } else {
          const T = s.h * 0.12;
          surface = yb - T;
          ctx.fillStyle = F.col; ctx.fillRect(x0, surface, wF, T);
          ctx.strokeStyle = F.sheen; ctx.lineWidth = 1; ctx.globalAlpha = 0.7;
          ctx.beginPath(); ctx.moveTo(x0, surface + 1.5); ctx.lineTo(x1, surface + 1.5); ctx.stroke();
          ctx.globalAlpha = 0.25; for (let y = surface + 4; y < yb - 1; y += 2.2) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
          ctx.globalAlpha = 1;
          for (let x = x0 + 4; x < x1 - 2; x += 5) contacts.push(x);
          label(st, 'solid, dense', x0 + 6, surface + T / 2 + 1, 'left', '#e6eefb');
        }
        // the plate: falls, then rests
        const wP = s.w * 0.40, hP = 20, px0 = s.x + (s.w - wP) / 2;
        const fall = seg(ts, 0, TC), restY = surface - hP;
        const py = lerp(s.y + 12, restY, fall * fall);
        ctx.fillStyle = MACH.edge; ctx.fillRect(s.x + s.w / 2 - 2, s.y, 4, Math.max(0, py - s.y));
        const gr = ctx.createLinearGradient(0, py, 0, py + hP); gr.addColorStop(0, '#f1b57d'); gr.addColorStop(1, '#e48a4c');
        rrect(ctx, px0, py, wP, hP, 2); ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = '#f6c99f'; ctx.lineWidth = 1; ctx.stroke();
        label(st, 'warm plate', px0 + wP / 2, py + hP / 2, 'center', '#3a1d0c');
        // heat leaving the plate, as ticks into the fabric, fading as the flux decays
        const q = flux(fab, ts);
        if (q > 0.002) {
          ctx.save(); ctx.strokeStyle = '#f1b57d'; ctx.lineCap = 'round';
          ctx.lineWidth = 0.6 + 3.2 * q; ctx.globalAlpha = clamp(0.15 + q, 0, 1);
          ctx.setLineDash([3, 3]); ctx.lineDashOffset = -st.el * 24;
          for (const x of contacts) if (x > px0 + 2 && x < px0 + wP - 2) { ctx.beginPath(); ctx.moveTo(x, surface + 1); ctx.lineTo(x, surface + 13); ctx.stroke(); }
          ctx.restore();
        }
        // the chart
        const ax = axes(st, { title: 'HEAT FLUX vs TIME', x0: 0, x1: SPAN, y0: 0, y1: 1.12, yLabel: 'heat flux', xLabel: 'time →', xTicks: [[0, '0'], [TC + 0.5, '+0.5 s'], [TC + 1.5, '+1.5 s']] });
        const pts = [];
        for (let i = 0; i <= 300 * ts / SPAN; i++) { const tt = SPAN * i / 300; pts.push([tt, flux(fab, tt)]); }
        if (ts > 0) pts.push([ts, q]);
        ctx.save(); ctx.setLineDash([2, 3]); ctx.strokeStyle = st.C.faint; ctx.beginPath(); ctx.moveTo(Math.round(ax.X(TC)) + 0.5, ax.py); ctx.lineTo(Math.round(ax.X(TC)) + 0.5, ax.py + ax.ph); ctx.stroke(); ctx.restore();
        label(st, 'contact', ax.X(TC) + 4, ax.py + ax.ph - 8, 'left');
        plot(ctx, pts, ax.X, ax.Y);
        const tPeak = TC + (() => { let best = 0, bv = -1; for (let i = 1; i < 2000; i++) { const v = shape(i / 2000, F.td); if (v > bv) { bv = v; best = i / 2000; } } return best; })();
        if (ts >= tPeak + 0.05) {
          ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = CHART; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(ax.X(TC), Math.round(ax.Y(F.qm)) + 0.5); ctx.lineTo(ax.px + ax.pw, Math.round(ax.Y(F.qm)) + 0.5); ctx.stroke(); ctx.restore();
          dot(ctx, ax.X(tPeak), ax.Y(F.qm), 3.2);
          label(st, 'q-max', ax.px + ax.pw, ax.Y(F.qm) - 8, 'right', CHART_TEXT);
        }
      },
      readout(st) {
        const ts = simT(st.el);
        if (ts <= TC) return '<strong>' + FAB[fab].name + '.</strong> The warm plate drops…';
        if (st.t < 1) return '<strong>' + FAB[fab].name + '.</strong> Contact · heat flowing out of the plate…';
        return fab === 'nylon'
          ? '<strong>Dense smooth nylon.</strong> Touches the plate everywhere: heat floods out, a <strong>high q-max</strong>. It feels cool.'
          : '<strong>Brushed fleece.</strong> Touches only at fibre tips, with air between: little heat flows, a <strong>low q-max</strong>. It feels warm.';
      },
    });
  })();
})();
