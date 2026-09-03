/* color-change.js — Field Notes No. 07
   Seven colour-change mechanisms, each animated at the level where the change
   actually happens, grouped by what moves: pigment (electrophoretic ink,
   cephalopod chromatophores), the pigment's chemistry (thermochromic leuco
   dye, electrochromic tungsten oxide, photochromic spiropyran), or the
   structure that selects a wavelength (chameleon guanine lattice, Morpho
   lamellae).

   Every mechanism is an object with a drive (what the user applies), a
   state that follows it with its own time constant, a draw() of the
   cross-section, and a readout(). One animation loop runs them all; a
   canvas that is scrolled out of view is stepped but not drawn.

   Where the colour is set by structure it is computed from wavelength
   (Bragg spacing, multilayer interference) and converted to RGB, so the
   readouts show a λ rather than a hand-picked swatch. Dimensions and rates
   are representative, not measured. */
(() => {
'use strict';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mix = (c0, c1, t) => c0.map((v, i) => Math.round(lerp(v, c1[i], clamp(t, 0, 1))));
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TEAL = [47, 163, 163], INK = [233, 236, 236], DIM = [139, 148, 148], RUST = [165, 107, 46];

// visible-spectrum wavelength (nm) -> RGB, the usual piecewise approximation
function wl2rgb(l) {
  let r, g, b;
  if (l < 440) { r = -(l - 440) / 60; g = 0; b = 1; }
  else if (l < 490) { r = 0; g = (l - 440) / 50; b = 1; }
  else if (l < 510) { r = 0; g = 1; b = -(l - 510) / 20; }
  else if (l < 580) { r = (l - 510) / 70; g = 1; b = 0; }
  else if (l < 645) { r = 1; g = -(l - 645) / 65; b = 0; }
  else { r = 1; g = 0; b = 0; }
  let f = 1; if (l < 420) f = 0.3 + 0.7 * (l - 380) / 40; else if (l > 700) f = 0.3 + 0.7 * (780 - l) / 80;
  return [r, g, b].map(v => Math.round(255 * Math.pow(clamp(v * f, 0, 1), 0.8)));
}
function wlName(l) { return l < 450 ? 'violet-blue' : l < 495 ? 'blue' : l < 570 ? 'green' : l < 590 ? 'yellow' : l < 620 ? 'orange' : 'red'; }
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s % 100000) / 100000; }; }

// ------------------------------------------------------------------ canvas plumbing
function makeCanvas(id) {
  const canvas = document.getElementById(id), ctx = canvas.getContext('2d');
  const c = { canvas, ctx, w: 0, h: 0, dpr: 1, visible: true };
  c.fit = () => {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (c.w !== w || c.h !== h || c.dpr !== dpr) { c.w = w; c.h = h; c.dpr = dpr; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  c.clear = () => { ctx.fillStyle = css('--black-raised'); ctx.fillRect(0, 0, c.w, c.h); };
  c.label = (text, x, y, align = 'left', col = null) => { ctx.font = '10px ' + css('--mono'); ctx.fillStyle = col || css('--ink-dim'); ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y); };
  return c;
}
function swatch(c, x, y, w, h, color, caption) {
  const ctx = c.ctx;
  ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = css('--line-strong'); ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  if (caption) c.label(caption, x + w / 2, y + h + 10, 'center');
}
function arrow(ctx, x0, y0, x1, y1, col, width = 1.5) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = width; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - 7 * Math.cos(a - 0.45), y1 - 7 * Math.sin(a - 0.45)); ctx.lineTo(x1 - 7 * Math.cos(a + 0.45), y1 - 7 * Math.sin(a + 0.45)); ctx.closePath(); ctx.fill();
}
// first-order relaxation toward a target
const relax = (v, target, tau, dt) => (reduceMotion ? target : target + (v - target) * Math.exp(-dt / Math.max(1e-3, tau)));

// ------------------------------------------------------------------ 1.1 electrophoretic
const electrophoretic = {
  id: 'ephoretic', group: 'pigment moving',
  field: 0, pulseT: 0, energy: 0,
  init() {
    this.c = makeCanvas('cv-ephoretic');
    const r = rng(11);
    this.white = []; this.black = [];
    for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.92; this.white.push({ x: Math.cos(a) * d, y: Math.sin(a) * d }); }
    for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.92; this.black.push({ x: Math.cos(a) * d, y: Math.sin(a) * d }); }
    this.jit = rng(5);
  },
  pulse(dir) { this.field = dir; this.pulseT = 0.9; },   // dir +1: white to the top
  step(dt) {
    if (this.pulseT > 0) { this.pulseT -= dt; if (this.pulseT <= 0) this.field = 0; }
    const E = this.field, sp = 1.6 * dt;
    const move = (ps, q) => {
      for (const p of ps) {
        p.y += -E * q * sp + (this.jit() - 0.5) * 0.05; p.x += (this.jit() - 0.5) * 0.05;
        const d = Math.hypot(p.x, p.y); if (d > 0.92) { p.x *= 0.92 / d; p.y *= 0.92 / d; }
      }
    };
    move(this.white, 1); move(this.black, -1);
    // what the eye sees from above: whichever population sits nearer the top
    const mw = this.white.reduce((s, p) => s + p.y, 0) / this.white.length, mb = this.black.reduce((s, p) => s + p.y, 0) / this.black.length;
    this.whiteUp = clamp(0.5 + (mb - mw) / 1.1, 0, 1);
  },
  draw() {
    const c = this.c, ctx = c.ctx, w = c.w, h = c.h; c.clear();
    const cx = w * 0.36, cy = h * 0.53, R = Math.min(w * 0.26, h * 0.36);
    // electrodes
    ctx.fillStyle = 'rgba(139,148,148,0.25)'; ctx.fillRect(cx - R * 1.35, cy - R - 16, R * 2.7, 8); ctx.fillRect(cx - R * 1.35, cy + R + 8, R * 2.7, 8);
    c.label('transparent top electrode' + (this.field ? (this.field > 0 ? ' · −V' : ' · +V') : ' · 0 V'), cx, cy - R - 26, 'center');
    c.label('back electrode' + (this.field ? (this.field > 0 ? ' · +V' : ' · −V') : ''), cx, cy + R + 28, 'center');
    // capsule
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = 'rgba(139,148,148,0.08)'; ctx.fill(); ctx.strokeStyle = css('--line-strong'); ctx.lineWidth = 1; ctx.stroke();
    // field arrows
    if (this.field) for (let i = -1; i <= 1; i++) arrow(ctx, cx + i * R * 0.55 + (this.field > 0 ? 0 : 0), this.field > 0 ? cy + R * 0.9 : cy - R * 0.9, cx + i * R * 0.55, this.field > 0 ? cy - R * 0.9 : cy + R * 0.9, 'rgba(47,163,163,0.35)', 1);
    const pr = Math.max(2, R * 0.055);
    for (const p of this.black) { ctx.beginPath(); ctx.arc(cx + p.x * R, cy + p.y * R, pr, 0, Math.PI * 2); ctx.fillStyle = '#141616'; ctx.fill(); ctx.strokeStyle = 'rgba(139,148,148,0.5)'; ctx.lineWidth = 0.8; ctx.stroke(); }
    for (const p of this.white) { ctx.beginPath(); ctx.arc(cx + p.x * R, cy + p.y * R, pr, 0, Math.PI * 2); ctx.fillStyle = '#e9ecec'; ctx.fill(); }
    // charge key
    c.label('● TiO₂ white · positive', 14, h - 26, 'left', '#e9ecec'); c.label('● carbon black · negative', 14, h - 12, 'left');
    // the pixel as seen
    const g = Math.round(lerp(20, 233, this.whiteUp));
    swatch(c, w * 0.72, cy - 40, w * 0.2, 80, `rgb(${g},${g + 2},${g + 2})`, 'pixel, seen from above');
    c.label(this.field ? 'field on · ' + (this.pulseT * 1000).toFixed(0) + ' ms left' : 'no power · image holds', w * 0.82, cy - 56, 'center', this.field ? css('--petrol-bright') : null);
  },
  readout() {
    return { state: this.field ? 'driving — particles migrating' : 'bistable — holding with no power', pixel: (this.whiteUp * 100).toFixed(0) + '% white', field: this.field ? (this.field > 0 ? 'top electrode negative' : 'top electrode positive') : 'off' };
  },
};

// ------------------------------------------------------------------ 1.2 chromatophores
const chromatophore = {
  id: 'chromatophore', group: 'pigment moving',
  drive: 0, held: false,
  init() {
    this.c = makeCanvas('cv-chromatophore');
    const r = rng(23);
    const cols = [[227, 179, 65], [208, 120, 58], [110, 59, 42], [227, 179, 65], [208, 120, 58], [150, 70, 45]];
    this.cells = [];
    const pts = [[0.2, 0.3], [0.5, 0.25], [0.78, 0.35], [0.32, 0.7], [0.62, 0.72], [0.86, 0.75]];
    pts.forEach((p, i) => this.cells.push({ x: p[0], y: p[1], col: cols[i], s: 0, delay: r() * 0.12, rot: r() * Math.PI, n: 12 + Math.floor(r() * 5) }));
  },
  step(dt) {
    this.drive = relax(this.drive, this.held ? 1 : 0, this.held ? 0.12 : 0.3, dt);
    for (const cell of this.cells) cell.s = relax(cell.s, this.held ? 1 : 0, (this.held ? 0.08 : 0.16) + cell.delay * 0.5, dt);
  },
  draw() {
    const c = this.c, ctx = c.ctx, w = c.w, h = c.h; c.clear();
    // skin with an iridophore sheen beneath
    ctx.fillStyle = 'rgba(47,163,163,0.10)'; ctx.fillRect(0, 0, w, h);
    const r0 = rng(3);
    ctx.fillStyle = 'rgba(47,163,163,0.18)';
    for (let i = 0; i < 90; i++) { ctx.fillRect(r0() * w, r0() * h, 4, 1.5); }
    const rMin = Math.min(w, h) * 0.018, rMax = Math.min(w, h) * 0.16, anchor = rMax * 1.35;
    let area = 0;
    for (const cell of this.cells) {
      const cx = cell.x * w, cy = cell.y * h, r = lerp(rMin, rMax, cell.s);
      area += Math.PI * r * r;
      // radial muscle fibres: shorten and thicken as they contract
      for (let k = 0; k < cell.n; k++) {
        const a = cell.rot + k * Math.PI * 2 / cell.n;
        const x0 = cx + Math.cos(a) * r, y0 = cy + Math.sin(a) * r, x1 = cx + Math.cos(a) * anchor, y1 = cy + Math.sin(a) * anchor;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
        ctx.strokeStyle = `rgba(233,236,236,${0.18 + 0.35 * cell.s})`; ctx.lineWidth = 1 + 1.6 * cell.s; ctx.stroke();
      }
      // pigment sac: same pigment, spread thin
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = rgb(cell.col, 0.95 - 0.25 * cell.s); ctx.fill();
      ctx.strokeStyle = rgb(cell.col, 1); ctx.lineWidth = 1; ctx.stroke();
    }
    this.coverage = clamp(area / (w * h), 0, 1);
    c.label(this.held ? 'motor neurons firing · radial muscles contracted' : 'muscles relaxed · elastic sacs retracted', 12, h - 12, 'left', this.held ? css('--petrol-bright') : null);
  },
  readout() {
    return { state: this.held ? 'expanded — pigment spread into discs' : this.drive > 0.05 ? 'retracting — elastic sac pulling back' : 'punctate — pigment hidden in dots', coverage: (this.coverage * 100).toFixed(0) + '% of the patch', time: 'tens of milliseconds' };
  },
};

// ------------------------------------------------------------------ 2.1 thermochromic leuco dye
const thermochromic = {
  id: 'thermo', group: 'pigment changing chemically',
  T: 20, held: false, liquid: false, melt: 0,
  init() {
    this.c = makeCanvas('cv-thermo');
    const r = rng(41);
    this.solvent = [];
    for (let i = 0; i < 110; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.9; this.solvent.push({ ax: Math.cos(a) * d, ay: Math.sin(a) * d, bx: (r() - 0.5) * 1.8, by: (r() - 0.5) * 1.8, ph: r() * 6.28 }); }
    this.pairs = [];
    for (let i = 0; i < 12; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.7; this.pairs.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, dir: r() * 6.28, thr: 30 + r() * 2.5, bound: 1, wander: r() * 6.28 }); }
    this.t = 0;
  },
  step(dt) {
    this.t += dt;
    this.T = relax(this.T, this.held ? 48 : 20, this.held ? 1.2 : 2.6, dt);
    // the solvent melts at ~31 °C and re-solidifies a few degrees lower — hysteresis
    if (!this.liquid && this.T > 31.5) this.liquid = true;
    if (this.liquid && this.T < 27.5) this.liquid = false;
    this.melt = relax(this.melt, this.liquid ? 1 : 0, 0.5, dt);
    for (const p of this.pairs) { const target = this.liquid && this.T > p.thr - 1.5 ? 0 : 1; p.bound = relax(p.bound, target, 0.4, dt); }
  },
  draw() {
    const c = this.c, ctx = c.ctx, w = c.w, h = c.h; c.clear();
    const cx = w * 0.36, cy = h * 0.5, R = Math.min(w * 0.27, h * 0.4);
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = 'rgba(139,148,148,0.06)'; ctx.fill(); ctx.strokeStyle = css('--line-strong'); ctx.lineWidth = 1; ctx.stroke();
    c.label('microcapsule · ~5 µm', cx, cy - R - 12, 'center');
    // solvent: a lattice when solid, wandering when liquid
    const m = this.melt;
    for (const s of this.solvent) {
      const wx = s.ax + 0.25 * Math.sin(this.t * 1.3 + s.ph) * m, wy = s.ay + 0.25 * Math.cos(this.t * 1.1 + s.ph * 1.7) * m;
      let x = wx, y = wy; const d = Math.hypot(x, y); if (d > 0.93) { x *= 0.93 / d; y *= 0.93 / d; }
      const sz = R * 0.055;
      ctx.save(); ctx.translate(cx + x * R, cy + y * R); ctx.rotate((1 - m) * 0 + m * Math.sin(this.t + s.ph));
      ctx.fillStyle = `rgba(139,148,148,${0.35 - 0.15 * m})`;
      if (m < 0.5) ctx.fillRect(-sz, -sz * 0.6, sz * 2, sz * 1.2); else { ctx.beginPath(); ctx.ellipse(0, 0, sz * 1.1, sz * 0.6, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    // dye–developer pairs
    const dye = [76, 96, 214];
    for (const p of this.pairs) {
      const px = cx + p.x * R, py = cy + p.y * R;
      const sep = R * (0.06 + 0.22 * (1 - p.bound));
      const dx = Math.cos(p.dir + (1 - p.bound) * Math.sin(this.t + p.wander)), dy = Math.sin(p.dir + (1 - p.bound) * Math.sin(this.t + p.wander));
      // developer (weak acid)
      ctx.beginPath(); ctx.arc(px + dx * sep, py + dy * sep, R * 0.035, 0, Math.PI * 2); ctx.fillStyle = 'rgba(233,236,236,0.8)'; ctx.fill();
      // bond
      if (p.bound > 0.15) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + dx * sep, py + dy * sep); ctx.strokeStyle = `rgba(233,236,236,${0.6 * p.bound})`; ctx.lineWidth = 1; ctx.stroke(); }
      // dye: coloured when protonated (ring open), colourless when closed
      ctx.beginPath(); ctx.arc(px, py, R * 0.06, 0, Math.PI * 2);
      ctx.fillStyle = rgb(dye, 0.15 + 0.85 * p.bound); ctx.fill(); ctx.strokeStyle = rgb(dye, 0.9); ctx.lineWidth = 1; ctx.stroke();
    }
    // thermometer
    const tx = w * 0.66, ty0 = h * 0.2, ty1 = h * 0.8;
    ctx.strokeStyle = css('--line-strong'); ctx.lineWidth = 1; ctx.strokeRect(tx - 5, ty0, 10, ty1 - ty0);
    const frac = clamp((this.T - 15) / 40, 0, 1);
    ctx.fillStyle = this.held ? rgb(RUST) : css('--petrol-bright'); ctx.fillRect(tx - 4, ty1 - (ty1 - ty0) * frac, 8, (ty1 - ty0) * frac);
    const yM = ty1 - (ty1 - ty0) * clamp((31 - 15) / 40, 0, 1);
    ctx.setLineDash([2, 3]); ctx.strokeStyle = css('--ink-dim'); ctx.beginPath(); ctx.moveTo(tx - 12, yM); ctx.lineTo(tx + 12, yM); ctx.stroke(); ctx.setLineDash([]);
    c.label('31 °C melt', tx + 16, yM, 'left');
    c.label(this.T.toFixed(0) + ' °C', tx, ty1 + 14, 'center', css('--ink'));
    // the fabric as seen
    const bound = this.pairs.reduce((s, p) => s + p.bound, 0) / this.pairs.length;
    this.bound = bound;
    swatch(c, w * 0.8, cy - 40, w * 0.14, 80, rgb(mix([225, 228, 226], dye, bound)), 'the printed fabric');
  },
  readout() {
    return { T: this.T.toFixed(1) + ' °C', solvent: this.liquid ? (this.melt > 0.9 ? 'liquid' : 'melting') : (this.melt < 0.1 ? 'solid (crystalline)' : 're-solidifying'), dye: (this.bound * 100).toFixed(0) + '% ring-open (coloured)' };
  },
};

// ------------------------------------------------------------------ 2.2 electrochromic
const electrochromic = {
  id: 'echromic', group: 'pigment changing chemically',
  x: 0, mode: 'off', t: 0,
  init() { this.c = makeCanvas('cv-echromic'); const r = rng(77); this.ions = []; for (let i = 0; i < 44; i++) this.ions.push({ u: (i + 0.5) / 44, x: r(), jit: r() * 6.28 }); },
  set(mode) { this.mode = mode; },
  step(dt) {
    this.t += dt;
    if (this.mode === 'color') this.x = relax(this.x, 1, 2.4, dt);
    else if (this.mode === 'bleach') this.x = relax(this.x, 0, 1.8, dt);
    // open circuit: the tint holds
  },
  draw() {
    const c = this.c, ctx = c.ctx, w = c.w, h = c.h; c.clear();
    const L = w * 0.1, Rr = w * 0.62, top = h * 0.16;
    const layers = [['glass + ITO', 0.09, [139, 148, 148], 0.18], ['WO₃ (electrochromic)', 0.16, [40, 70, 190], 0.05 + 0.85 * this.x], ['Li⁺ electrolyte', 0.24, [139, 148, 148], 0.08], ['NiO counter electrode', 0.12, [139, 148, 148], 0.14], ['ITO + glass', 0.09, [139, 148, 148], 0.18]];
    let y = top; const ys = [];
    for (const [name, fh, col, a] of layers) {
      const hh = fh * h; ys.push([y, y + hh]);
      ctx.fillStyle = rgb(col, a); ctx.fillRect(L, y, Rr - L, hh);
      ctx.strokeStyle = css('--line'); ctx.strokeRect(L + 0.5, y + 0.5, Rr - L, hh);
      c.label(name, Rr + 10, y + hh / 2, 'left');
      y += hh;
    }
    // ions: fraction x has crossed into WO3, the rest wait in the electrolyte
    const wo = ys[1], el = ys[2];
    for (const ion of this.ions) {
      const inside = ion.u < this.x;
      const travelling = this.mode !== 'off' && Math.abs(ion.u - this.x) < 0.06;
      const yy = inside ? lerp(wo[0] + 6, wo[1] - 6, ion.x) : lerp(el[0] + 6, el[1] - 6, ion.x);
      const xx = L + 10 + (Rr - L - 20) * ((ion.u * 7.3) % 1);
      ctx.beginPath(); ctx.arc(xx, yy + (travelling ? Math.sin(this.t * 10 + ion.jit) * 2 : 0), 2.6, 0, Math.PI * 2);
      ctx.fillStyle = travelling ? css('--petrol-bright') : 'rgba(233,236,236,0.85)'; ctx.fill();
    }
    c.label('Li⁺', L + 6, el[0] - 7, 'left');
    // external circuit: electrons round the outside
    const wx = L - 22;
    ctx.strokeStyle = css('--line-strong'); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L, ys[0][0] + 6); ctx.lineTo(wx, ys[0][0] + 6); ctx.lineTo(wx, ys[4][1] - 6); ctx.lineTo(L, ys[4][1] - 6); ctx.stroke();
    if (this.mode !== 'off') {
      const dir = this.mode === 'color' ? -1 : 1;   // electrons into WO3 to colour
      for (let k = 0; k < 4; k++) { const ph = ((this.t * 0.6 + k / 4) % 1); const yy = lerp(ys[4][1] - 6, ys[0][0] + 6, dir < 0 ? ph : 1 - ph); ctx.beginPath(); ctx.arc(wx, yy, 2.2, 0, Math.PI * 2); ctx.fillStyle = css('--petrol-bright'); ctx.fill(); }
      c.label('e⁻', wx - 10, (ys[0][0] + ys[4][1]) / 2, 'right', css('--petrol-bright'));
      c.label(this.mode === 'color' ? '−V on WO₃ side' : '+V on WO₃ side', L, top - 12, 'left', css('--petrol-bright'));
    } else c.label('open circuit · tint holds', L, top - 12, 'left');
    // light through the stack
    const lx = (L + Rr) / 2 + 40;
    arrow(ctx, lx, top - 34, lx, top - 4, 'rgba(233,236,236,0.9)', 2);
    const T = 0.78 - 0.63 * this.x; this.T = T;
    arrow(ctx, lx, ys[4][1] + 4, lx, ys[4][1] + 34, `rgba(233,236,236,${0.15 + 0.85 * T})`, 2);
    c.label((T * 100).toFixed(0) + '% transmitted', lx + 10, ys[4][1] + 24, 'left');
    swatch(c, w * 0.8, h * 0.7, w * 0.14, h * 0.2, rgb(mix([215, 222, 224], [26, 46, 140], this.x)), 'window');
  },
  readout() {
    return { state: this.mode === 'color' ? 'colouring — Li⁺ intercalating into WO₃' : this.mode === 'bleach' ? 'bleaching — Li⁺ leaving WO₃' : 'open circuit — holding tint, no power', transmission: (this.T * 100).toFixed(0) + '%', x: 'Li' + (0.35 * this.x).toFixed(2) + 'WO₃' };
  },
};

// ------------------------------------------------------------------ 2.3 photochromic
const photochromic = {
  id: 'photo', group: 'pigment changing chemically',
  f: 0, held: false, t: 0,
  init() { this.c = makeCanvas('cv-photo'); const r = rng(99); this.pop = []; for (let i = 0; i < 160; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 0.92; this.pop.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, u: r() }); } },
  step(dt) {
    this.t += dt;
    const kuv = this.held ? 1 / 0.5 : 0, kback = 1 / 4;
    if (reduceMotion) this.f = this.held ? 1 : 0;
    else this.f = clamp(this.f + (kuv * (1 - this.f) - kback * this.f) * dt, 0, 1);
  },
  draw() {
    const c = this.c, ctx = c.ctx, w = c.w, h = c.h; c.clear();
    const f = this.f;
    // the molecule: two ring halves joined at a spiro carbon, opening to a planar chain
    const mx = w * 0.3, my = h * 0.5, s = Math.min(w, h) * 0.11;
    const open = smooth(0.15, 0.7, f);
    const hex = (x, y, r, rot, fill, stroke) => { ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = rot + k * Math.PI / 3; k ? ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)) : ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a)); } ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); };
    // indoline half (fixed)
    hex(mx - s * 1.15, my, s, 0, null, 'rgba(233,236,236,0.85)');
    // spiro carbon
    ctx.beginPath(); ctx.arc(mx, my, 3, 0, Math.PI * 2); ctx.fillStyle = css('--ink'); ctx.fill();
    // chromene half: drawn edge-on (perpendicular) when closed, rotating flat when open
    const tilt = (1 - open);   // 1 = perpendicular to the page
    ctx.save(); ctx.translate(mx + s * 1.15 + open * s * 0.5, my); ctx.scale(1, lerp(0.18, 1, 1 - tilt));
    hex(0, 0, s, 0, open > 0.5 ? rgb([170, 60, 120], 0.25 * open) : null, open > 0.5 ? rgb([200, 80, 150], 0.9) : 'rgba(233,236,236,0.85)');
    ctx.restore();
    // the C–O bond: intact when closed, broken when open
    const ox = mx + s * 0.55, oy = my - s * 0.55;
    ctx.beginPath(); ctx.arc(ox, oy, 3.5, 0, Math.PI * 2); ctx.fillStyle = rgb(RUST); ctx.fill(); c.label('O', ox + 8, oy - 6, 'left');
    if (open < 0.5) { ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(ox, oy); ctx.strokeStyle = 'rgba(233,236,236,0.85)'; ctx.lineWidth = 1.5; ctx.stroke(); }
    else { ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(ox, oy); ctx.strokeStyle = 'rgba(165,107,46,0.7)'; ctx.stroke(); ctx.setLineDash([]); c.label('C–O broken', ox + 8, oy + 8, 'left', rgb(RUST)); }
    // conjugation across the open form
    if (open > 0.5) { ctx.beginPath(); ctx.moveTo(mx - s * 1.9, my + s * 0.3); ctx.lineTo(mx + s * 2.6, my + s * 0.3); ctx.strokeStyle = rgb([200, 80, 150], 0.5 * open); ctx.lineWidth = 3; ctx.stroke(); c.label('planar · conjugated · absorbs visible light', mx + s * 0.3, my + s * 1.7, 'center', rgb([200, 80, 150])); }
    else c.label('spiro form · halves at 90° · colourless', mx + s * 0.3, my + s * 1.7, 'center');
    c.label(open > 0.5 ? 'merocyanine' : 'spiropyran', mx + s * 0.3, my - s * 1.6, 'center', css('--ink'));
    // UV
    // the lens: a population of molecules, a fraction converted
    const lx = w * 0.74, ly = h * 0.56, LR = Math.min(w * 0.18, h * 0.34);
    if (this.held) {
      for (let k = -2; k <= 2; k++) { const x0 = lx + k * LR * 0.35; arrow(ctx, x0 + 10, ly - LR - 44, x0, ly - LR - 8, 'rgba(160,110,255,0.9)', 1.4); }
      c.label('UV', lx + LR * 0.9, ly - LR - 30, 'left', 'rgba(160,110,255,1)');
    }
    ctx.beginPath(); ctx.arc(lx, ly, LR, 0, Math.PI * 2); ctx.fillStyle = rgb([200, 80, 150], 0.05 + 0.6 * f); ctx.fill(); ctx.strokeStyle = css('--line-strong'); ctx.lineWidth = 1; ctx.stroke();
    for (const p of this.pop) { const on = p.u < f; ctx.beginPath(); ctx.arc(lx + p.x * LR, ly + p.y * LR, 1.8, 0, Math.PI * 2); ctx.fillStyle = on ? rgb([255, 140, 210], 0.95) : 'rgba(233,236,236,0.35)'; ctx.fill(); }
    c.label('lens · ' + (f * 100).toFixed(0) + '% converted', lx, ly + LR + 12, 'center');
  },
  readout() {
    return { state: this.held ? 'UV on — ring opening, τ ≈ 0.5 s' : this.f > 0.02 ? 'dark — thermal ring closure, τ ≈ 4 s' : 'clear — all molecules closed', converted: (this.f * 100).toFixed(0) + '%', form: this.f > 0.5 ? 'mostly merocyanine (coloured)' : 'mostly spiropyran (colourless)' };
  },
};

// ------------------------------------------------------------------ 3.1 chameleon guanine lattice
const chameleon = {
  id: 'chameleon', group: 'structure changing',
  d: 140, held: false, t: 0,
  step(dt) { this.t += dt; this.d = relax(this.d, this.held ? 205 : 140, this.held ? 1.4 : 2.0, dt); },
  init() { this.c = makeCanvas('cv-chameleon'); },
  lambda() { return 2 * 1.6 * this.d; },   // Bragg: λ = 2 n d at normal incidence
  draw() {
    const c = this.c, ctx = c.ctx, w = c.w, h = c.h; c.clear();
    const lam = this.lambda(), col = wl2rgb(lam);
    const lx = w * 0.1, lw = w * 0.5, top = h * 0.4;
    const px = (h * 0.52) / (4 * 205);   // px per nm: four rows of the widest lattice fit below the skin
    // skin above: xanthophores (yellow pigment cells)
    ctx.fillStyle = 'rgba(227,179,65,0.12)'; ctx.fillRect(lx, h * 0.12, lw, top - 10 - h * 0.12);
    for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc(lx + (i + 0.5) * lw / 14, top - 26 + (i % 2) * 10, 4, 0, Math.PI * 2); ctx.fillStyle = 'rgba(227,179,65,0.6)'; ctx.fill(); }
    c.label('xanthophores · yellow pigment', lx + lw + 8, top - 20, 'left');
    // guanine nanocrystal lattice, spacing d
    const rows = 5, dpx = this.d * px;
    for (let r = 0; r < rows; r++) {
      const y = top + r * dpx;
      if (y > h - 12) break;
      for (let k = 0; k < 9; k++) { const x = lx + 8 + k * lw / 9 + (r % 2) * lw / 18; ctx.fillStyle = 'rgba(233,236,236,0.75)'; ctx.beginPath(); ctx.roundRect(x, y - 4, lw / 9 - 10, 8, 2); ctx.fill(); }
    }
    ctx.strokeStyle = css('--ink-dim'); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(lx + lw + 6, top); ctx.lineTo(lx + lw + 6, top + dpx); ctx.stroke();
    c.label('d = ' + this.d.toFixed(0) + ' nm', lx + lw + 12, top + dpx / 2, 'left', css('--ink'));
    c.label('guanine nanocrystals', lx + lw + 8, top + dpx * 1.5 + 6, 'left');
    // white light in, one wavelength out
    const ix = lx + lw * 0.45, iy = top - 6, rl = Math.min(80, top - h * 0.14);
    arrow(ctx, ix - rl, iy - rl, ix, iy, 'rgba(233,236,236,0.85)', 2); c.label('white light', ix - rl - 6, iy - rl - 10, 'right');
    arrow(ctx, ix, iy, ix + rl, iy - rl, rgb(col), 3); c.label('λ ' + lam.toFixed(0) + ' nm · ' + wlName(lam), ix + rl + 6, iy - rl - 10, 'left', rgb(col));
    // as seen: structural colour under the yellow pigment
    const seen = mix(col, [227, 179, 65], 0.35);
    this.seen = seen;
    swatch(c, w * 0.8, h * 0.62, w * 0.14, h * 0.22, rgb(seen), 'skin, seen');
    c.label(this.held ? 'excited · skin stretched · lattice open' : 'relaxed · lattice tight', lx, h - 10, 'left', this.held ? css('--petrol-bright') : null);
  },
  readout() { const lam = this.lambda(); return { state: this.held ? 'excited — lattice spacing widening' : 'relaxed — lattice tight', lambda: lam.toFixed(0) + ' nm (' + wlName(lam) + ')', d: this.d.toFixed(0) + ' nm' }; },
};

// ------------------------------------------------------------------ 3.2 Morpho lamellae
const morpho = {
  id: 'morpho', group: 'structure changing',
  angle: 0, wet: 0, held: false, t: 0,
  dc: 65, dgap: 125, nc: 1.56,
  init() { this.c = makeCanvas('cv-morpho'); },
  step(dt) { this.t += dt; this.wet = relax(this.wet, this.held ? 1 : 0, this.held ? 0.7 : 2.2, dt); },
  ngap() { return lerp(1.0, 1.38, this.wet); },
  lambda() { const th = this.angle * Math.PI / 180; return 2 * (this.nc * this.dc + this.ngap() * this.dgap) * Math.cos(th); },
  draw() {
    const c = this.c, ctx = c.ctx, w = c.w, h = c.h; c.clear();
    const lam = this.lambda(), col = wl2rgb(lam);
    const n = 7, cx = w * 0.36, top = h * 0.14;
    const px = (h * 0.7) / (n * (this.dc + this.dgap));   // px per nm: the whole stack fits the canvas
    const pitch = (this.dc + this.dgap) * px, shelf = w * 0.14;
    // the wet fluid in the gaps
    if (this.wet > 0.02) { ctx.fillStyle = `rgba(47,163,163,${0.18 * this.wet})`; ctx.fillRect(cx - shelf - 6, top - 6, shelf * 2 + 12, pitch * n + 6); }
    // stem
    ctx.fillStyle = 'rgba(120,90,60,0.9)'; ctx.fillRect(cx - 4, top - 6, 8, pitch * n + 6);
    // lamellae, alternating sides
    for (let i = 0; i < n; i++) {
      const y = top + i * pitch, side = i % 2 ? 1 : -1;
      ctx.fillStyle = 'rgba(160,120,80,0.95)';
      ctx.fillRect(side < 0 ? cx - shelf : cx, y, shelf, this.dc * px);
    }
    c.label('chitin lamellae · n 1.56 · ' + this.dc + ' nm', cx + shelf + 10, top + this.dc * px / 2, 'left');
    c.label((this.wet > 0.5 ? 'alcohol' : 'air') + ' gaps · n ' + this.ngap().toFixed(2) + ' · ' + this.dgap + ' nm', cx + shelf + 10, top + this.dc * px + this.dgap * px / 2, 'left');
    // rays: incident at the viewing angle, reflected from successive lamellae
    const th = this.angle * Math.PI / 180;
    for (let i = 0; i < 3; i++) {
      const y = top + i * pitch + this.dc * px / 2, x = cx - shelf * 0.5 - i * 10;
      const L = 60 + i * 12, ox = Math.cos(th) * 4;   // the two rays sit either side of the surface normal
      arrow(ctx, x - ox - Math.sin(th) * L, y - Math.cos(th) * L, x - ox, y, `rgba(233,236,236,${0.8 - i * 0.2})`, 1.4);
      arrow(ctx, x + ox, y, x + ox + Math.sin(th) * L, y - Math.cos(th) * L, rgb(col, 0.95 - i * 0.2), 2);
    }
    c.label('viewing angle ' + this.angle.toFixed(0) + '°', cx - shelf - 8, top - 22, 'right');
    c.label('reflections in phase at λ = 2(n₁d₁ + n₂d₂)cos θ', w * 0.5, h - 12, 'center');
    swatch(c, w * 0.8, h * 0.22, w * 0.14, h * 0.28, rgb(col), 'wing, seen');
    c.label('λ ' + lam.toFixed(0) + ' nm · ' + wlName(lam), w * 0.87, h * 0.62, 'center', rgb(col));
    c.label('no blue pigment anywhere', w * 0.87, h * 0.7, 'center');
  },
  readout() { const lam = this.lambda(); return { state: this.wet > 0.5 ? 'wet — index contrast reduced, peak shifted to green' : this.angle > 30 ? 'tilted — shorter path, bluer' : 'dry, face-on — blue', lambda: lam.toFixed(0) + ' nm (' + wlName(lam) + ')', gap: 'n ' + this.ngap().toFixed(2) + (this.wet > 0.5 ? ' (alcohol)' : this.wet > 0.05 ? ' (evaporating)' : ' (air)') }; },
};

// ------------------------------------------------------------------ wiring
const mechs = [electrophoretic, chromatophore, thermochromic, electrochromic, photochromic, chameleon, morpho];
const byId = {};

function holdButton(btn, onStart, onStop) {
  const start = () => { btn.classList.add('is-active'); onStart(); };
  const stop = () => { btn.classList.remove('is-active'); onStop(); };
  btn.addEventListener('pointerdown', ev => { ev.preventDefault(); btn.setPointerCapture(ev.pointerId); start(); });
  btn.addEventListener('pointerup', stop); btn.addEventListener('pointercancel', stop); btn.addEventListener('lostpointercapture', stop);
  btn.addEventListener('keydown', ev => { if ((ev.key === ' ' || ev.key === 'Enter') && !ev.repeat) { ev.preventDefault(); start(); } });
  btn.addEventListener('keyup', ev => { if (ev.key === ' ' || ev.key === 'Enter') stop(); });
  btn.addEventListener('blur', stop);
}
function bind() {
  document.querySelectorAll('[data-hold]').forEach(btn => { const m = byId[btn.dataset.hold]; holdButton(btn, () => { m.held = true; }, () => { m.held = false; }); });
  document.querySelectorAll('[data-pulse]').forEach(btn => btn.addEventListener('click', () => electrophoretic.pulse(parseInt(btn.dataset.pulse, 10))));
  document.querySelectorAll('[data-echromic]').forEach(btn => btn.addEventListener('click', () => {
    electrochromic.set(btn.dataset.echromic);
    document.querySelectorAll('[data-echromic]').forEach(b => { const on = b === btn; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  }));
  const ang = document.getElementById('ctlMorphoAngle');
  ang.addEventListener('input', () => { morpho.angle = parseFloat(ang.value); document.getElementById('valMorphoAngle').textContent = morpho.angle.toFixed(0) + '°'; });
}
function writeReadouts(m) {
  const r = m.readout();
  for (const k in r) { const el = document.querySelector(`[data-ro="${m.id}:${k}"]`); if (el && el.textContent !== r[k]) el.textContent = r[k]; }
}
let lastT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - (lastT || now)) / 1000); lastT = now;
  for (const m of mechs) {
    m.step(dt);
    if (!m.c.visible) continue;
    m.c.fit(); m.draw(); writeReadouts(m);
  }
  requestAnimationFrame(frame);
}
function init() {
  for (const m of mechs) { m.init(); byId[m.id] = m; }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => { for (const e of entries) { const m = mechs.find(mm => mm.c.canvas === e.target); if (m) m.c.visible = e.isIntersecting; } }, { rootMargin: '120px' });
    for (const m of mechs) io.observe(m.c.canvas);
  }
  bind();
  for (const m of mechs) { m.c.fit(); m.step(0); m.draw(); writeReadouts(m); }
  requestAnimationFrame(frame);
  window.__colorChange = {
    mechs: byId,
    hold(id, on) { byId[id].held = !!on; },
    pulse(dir) { electrophoretic.pulse(dir); },
    echromic(mode) { electrochromic.set(mode); },
    angle(a) { morpho.angle = a; },
    readout(id) { return byId[id].readout(); },
  };
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
