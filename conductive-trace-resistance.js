/* conductive-trace-resistance.js — Field Notes No. 06
   Drag to stretch a conductive trace and watch its resistance change, with
   the electrons drawn on the path they actually have to take.

   Three structures, each with its own mechanism:

   PRINTED   — rigid silver flakes in a stretchable binder. Stretch moves the
               flakes apart, thinning the percolating network (resistance
               rises exponentially), then edge cracks open and the current
               has to detour round their tips. Cracks do not fully close:
               damage is retained on release.
   LAMINATED — an etched copper serpentine on TPU. The geometry does the
               stretching: the meander straightens at constant copper length
               and constant resistance. Once it is straight the metal itself
               strains (gauge factor 2, a few percent change) and then
               fractures — an open circuit, permanently.
   YARN      — a silver-plated multifilament yarn. Conduction between
               filaments happens at contact points; each contact breaks at
               its own strain and re-forms (with hysteresis) on release.
               The number of intact contacts sets the resistance.

   The specimen is a 20 mm gauge length between two clamps. Lengths are to
   scale; widths of the meander and the yarn are exaggerated ×2.5 so their
   structure is legible. Electron speed is proportional to current at
   constant voltage (∝ R₀/R), so it collapses as resistance climbs.
   The numbers are calibrated to be plausible for the materials named, not
   measured from them. */
(() => {
'use strict';

const L0 = 20;            // mm gauge length
const EPS_MAX = 0.8;
const NU = 0.45;          // substrate lateral contraction exponent
const TEAL = [47, 163, 163], TEAL_DEEP = [28, 107, 107], COPPER = [201, 126, 66], COPPER_HI = [240, 190, 140];
const SILVER = [196, 204, 204], SILVER_DIM = [128, 138, 138], RUST = [165, 107, 46];
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mix = (c0, c1, t) => c0.map((v, i) => Math.round(lerp(v, c1[i], clamp(t, 0, 1))));
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';

// deterministic PRNG so a "sample" is reproducible for the gate, fresh per new sample
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s % 100000) / 100000; }; }

// ------------------------------------------------------------------ state
const state = {
  type: 'printed',
  eps: 0, epsMax: 0, epsAtDown: 0,
  drag: null,           // { x0, virtual }
  spring: null,         // { from, t0 }
  sample: null,
  history: [],          // [eps, R] this sample's loading history for the chart
  electrons: [],
  sparks: [],
  seed: 7,
};

// ------------------------------------------------------------------ view
const view = { canvas: null, ctx: null, w: 0, h: 0, dpr: 1, pxmm: 1, x0: 0, cy: 0 };
const chart = { canvas: null, ctx: null, w: 0, h: 0, dpr: 1 };
function fit(c) {
  const r = c.canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  if (c.w !== w || c.h !== h || c.dpr !== dpr) { c.w = w; c.h = h; c.dpr = dpr; c.canvas.width = Math.round(w * dpr); c.canvas.height = Math.round(h * dpr); }
  c.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (c === view) { view.pxmm = 0.5 * w / L0; view.x0 = 0.06 * w; view.cy = h * 0.5; }
}
// rest mm along the trace -> screen x, given strain; mm across (y up) -> screen y with the type's exaggeration
const sx = (xmm, eps) => view.x0 + xmm * (1 + eps) * view.pxmm;
const sy = (ymm, yex) => view.cy - ymm * yex * view.pxmm;

// ------------------------------------------------------------------ samples
class Printed {
  constructor(seed) {
    const r = rng(seed);
    this.name = 'printed'; this.R0 = 0.6; this.w0 = 2.0; this.yex = 1;
    this.epsC = 0.15;
    this.flakes = [];
    for (let i = 0; i < 520; i++) this.flakes.push({ x: r() * L0, y: (r() - 0.5) * this.w0 * 0.96, a: r() * Math.PI, l: 0.36 + r() * 0.3, t: 0.11 + r() * 0.08 });
    this.cracks = [];
    for (let i = 0; i < 13; i++) this.cracks.push({ x: 1.2 + r() * (L0 - 2.4), top: r() < 0.5, onset: this.epsC + r() * 0.3, maxDepth: 0, maxOpen: 0, jag: [r(), r(), r()] });
    this.cracks.sort((a, b) => a.x - b.x);
    this.lanes = 7;
    this.spec = 'silver-flake ink, 12 µm on TPU · 20 × 2 mm · R₀ 0.60 Ω';
  }
  // crack state at this strain, remembering what has already opened
  update(eps) {
    for (const c of this.cracks) {
      const over = Math.max(0, eps - c.onset);
      const depth = Math.min(0.85, 6 * over), open = 2.0 * over;
      c.maxDepth = Math.max(c.maxDepth, depth); c.maxOpen = Math.max(c.maxOpen, open);
      c.depth = c.maxDepth;                                  // a crack does not heal in depth
      c.open = Math.max(0.3 * c.maxOpen, open);              // it closes to a hairline
      c.active = c.maxDepth > 0;
    }
  }
  resistance(eps, epsMax) {
    const x = Math.max(0, eps - this.epsC), xm = Math.max(0, epsMax - this.epsC);
    const R = this.R0 * Math.pow(1 + eps, 2) * Math.exp(6 * eps) * (1 + 400 * x * x + 200 * xm * xm);
    return Math.min(R, 1e5);
  }
  static expectedCurve(eps) { const P = { R0: 1, epsC: 0.15 }; const x = Math.max(0, eps - P.epsC); return Math.pow(1 + eps, 2) * Math.exp(6 * eps) * (1 + 400 * x * x); }
  statusLine(eps) {
    const open = this.cracks.filter(c => c.active && c.open > 0.02).length;
    const xm = Math.max(0, state.epsMax - this.epsC);
    return open + ' crack' + (open === 1 ? '' : 's') + ' open · damage retained ×' + (1 + 200 * xm * xm).toFixed(1);
  }
  regime(eps) {
    if (eps < 0.02) return state.epsMax > this.epsC ? 'relaxed — cracks closed to hairlines, damage kept' : 'intact network';
    if (eps < this.epsC) return 'flakes separating — the network is thinning';
    return 'cracks open — current detours round their tips';
  }
  // the conduction lanes as polylines in rest-mm (x) / mm (y), at this strain
  lanePath(k, eps) {
    const y = (k + 0.5) / this.lanes * this.w0 - this.w0 / 2;
    const yScale = Math.pow(1 + eps, -NU);
    const pts = [[0, y * yScale]];
    for (const c of this.cracks) {
      if (!c.active) continue;
      const tipY = (c.top ? this.w0 / 2 - c.depth * this.w0 : -this.w0 / 2 + c.depth * this.w0) * yScale;
      const blocked = c.top ? y * yScale > tipY : y * yScale < tipY;
      if (!blocked) continue;
      const g = c.open / (1 + eps) / 2 + 0.05;              // half-gap in rest-mm
      const detourY = tipY + (c.top ? -0.12 : 0.12) * yScale;
      pts.push([c.x - g, y * yScale], [c.x - g, detourY], [c.x + g, detourY], [c.x + g, y * yScale]);
    }
    pts.push([L0, y * yScale]);
    return pts;
  }
  draw(ctx, eps) {
    const yScale = Math.pow(1 + eps, -NU);
    const bg = css('--black-raised');
    drawSubstrate(ctx, eps, 3.2 * yScale, this.yex);
    // binder film
    const top = sy(this.w0 / 2 * yScale, 1), bot = sy(-this.w0 / 2 * yScale, 1);
    ctx.fillStyle = 'rgba(28,107,107,0.28)';
    ctx.fillRect(sx(0, eps), top, sx(L0, eps) - sx(0, eps), bot - top);
    // flakes: rigid, carried apart by the binder
    ctx.fillStyle = rgb(TEAL_DEEP, 0.9);
    for (const f of this.flakes) {
      const x = sx(f.x, eps), y = sy(f.y * yScale, 1);
      ctx.save(); ctx.translate(x, y); ctx.rotate(f.a);
      ctx.beginPath(); ctx.ellipse(0, 0, f.l * view.pxmm / 2, f.t * view.pxmm / 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // cracks: jagged gaps from an edge inward
    for (const c of this.cracks) {
      if (!c.active) continue;
      const xc = sx(c.x, eps), halfw = Math.max(0.6, c.open * view.pxmm / 2);
      const edgeY = c.top ? top - 1 : bot + 1;
      const tipY = c.top ? top + c.depth * (bot - top) : bot - c.depth * (bot - top);
      const j = c.jag.map(v => (v - 0.5) * 6);
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(xc - halfw - 1.5, edgeY);
      ctx.lineTo(xc - halfw + j[0], lerp(edgeY, tipY, 0.35));
      ctx.lineTo(xc - halfw * 0.5 + j[1], lerp(edgeY, tipY, 0.75));
      ctx.lineTo(xc + j[2] * 0.3, tipY);
      ctx.lineTo(xc + halfw * 0.5 + j[1], lerp(edgeY, tipY, 0.75));
      ctx.lineTo(xc + halfw + j[0], lerp(edgeY, tipY, 0.35));
      ctx.lineTo(xc + halfw + 1.5, edgeY);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(165,107,46,0.55)'; ctx.lineWidth = 1; ctx.stroke();
    }
  }
  seedElectrons(n) {
    const out = [];
    for (let i = 0; i < n; i++) out.push({ lane: i % this.lanes, s: Math.random(), prev: null });
    return out;
  }
  stepElectrons(els, eps, dt, vmm) {
    for (const e of els) {
      const path = this.lanePath(e.lane, eps);
      const len = pathLength(path, eps);
      e.s += vmm * dt / Math.max(1e-6, len);
      if (e.s > 1) { e.s -= 1; e.lane = Math.floor(Math.random() * this.lanes); }
      const p = pointAt(path, eps, e.s);
      e.prev = e.pos || p; e.pos = p;
    }
  }
}

class Laminated {
  constructor(seed) {
    const r = rng(seed);
    this.name = 'laminated'; this.R0 = 0.05; this.yex = 2.5;
    this.p0 = 2.5; this.A0 = 0.56; this.tw = 0.25; this.n = L0 / this.p0;
    this.perLen0 = perLen(this.A0, this.p0);        // copper per period, fixed
    this.epsStr = this.perLen0 / this.p0 - 1;         // strain at which the meander is straight
    this.epsBreakMetal = 0.035;
    this.broken = false; this.breakX = (2 + Math.floor(r() * (this.n - 4)) + 0.5) * this.p0; this.epsAtBreak = 0;
    this.spec = 'etched copper 35 µm on TPU · 0.25 mm serpentine, ' + this.n + ' periods · R₀ 0.05 Ω';
  }
  amplitude(eps) {
    if (eps >= this.epsStr) return 0;
    const p = this.p0 * (1 + eps);
    let lo = 0, hi = this.A0;
    for (let i = 0; i < 30; i++) { const m = 0.5 * (lo + hi); if (perLen(m, p) > this.perLen0) hi = m; else lo = m; }
    return 0.5 * (lo + hi);
  }
  metalStrain(eps) { return Math.max(0, (1 + eps) / (1 + this.epsStr) - 1); }
  update(eps) {
    if (!this.broken && this.metalStrain(eps) >= this.epsBreakMetal) { this.broken = true; this.epsAtBreak = eps; state.sparks.push({ x: sx(this.breakX, eps), y: view.cy, t: 0, big: true }); }
  }
  resistance(eps) {
    if (this.broken) return Infinity;
    return this.R0 * (1 + 2 * this.metalStrain(eps));
  }
  static expectedCurve(eps) { const epsStr = perLen(0.56, 2.5) / 2.5 - 1; const m = Math.max(0, (1 + eps) / (1 + epsStr) - 1); return m >= 0.035 ? Infinity : 1 + 2 * m; }
  statusLine(eps) {
    const frac = clamp(eps / this.epsStr, 0, 1);
    if (this.broken) return 'fractured at ' + (this.epsAtBreak * 100).toFixed(0) + '% — open circuit';
    return 'meander ' + (frac * 100).toFixed(0) + '% straightened · metal strain ' + (this.metalStrain(eps) * 100).toFixed(1) + '%';
  }
  regime(eps) {
    if (this.broken) return 'open circuit — the copper has fractured';
    if (eps < 0.02) return 'at rest — serpentine slack';
    if (eps < this.epsStr) return 'meander straightening — copper unstrained, R constant';
    return 'straight — the metal itself is now straining';
  }
  centerline(eps) {
    const A = this.amplitude(eps), pts = [];
    const N = 220;
    for (let i = 0; i <= N; i++) { const x = L0 * i / N; pts.push([x, A * Math.sin(2 * Math.PI * x / this.p0)]); }
    return pts;
  }
  draw(ctx, eps) {
    drawSubstrate(ctx, eps, 1.7 * Math.pow(1 + eps, -NU), this.yex);
    const pts = this.centerline(eps);
    const wpx = this.tw * this.yex * view.pxmm;
    const strained = this.metalStrain(eps);
    const col = this.broken ? mix(COPPER, [120, 70, 40], 0.5) : mix(COPPER, RUST, clamp(strained / this.epsBreakMetal, 0, 1) * 0.6);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    pts.forEach((p, i) => { const X = sx(p[0], eps), Y = sy(p[1], this.yex); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.lineWidth = wpx; ctx.strokeStyle = rgb(col); ctx.stroke();
    ctx.lineWidth = Math.max(1, wpx * 0.3); ctx.strokeStyle = rgb(COPPER_HI, 0.55); ctx.stroke();
    if (this.broken) {
      const gap = (0.25 + 6 * Math.max(0, eps - this.epsAtBreak)) * view.pxmm + 2;
      const X = sx(this.breakX, eps), Y = sy(0, this.yex);
      ctx.fillStyle = css('--black-raised');
      ctx.beginPath(); ctx.moveTo(X - gap / 2, Y - wpx); ctx.lineTo(X + gap / 2 - 2, Y - wpx); ctx.lineTo(X + gap / 2 + 1, Y); ctx.lineTo(X + gap / 2 - 2, Y + wpx); ctx.lineTo(X - gap / 2, Y + wpx); ctx.lineTo(X - gap / 2 + 2, Y); ctx.closePath(); ctx.fill();
    }
  }
  seedElectrons(n) { const out = []; for (let i = 0; i < n; i++) out.push({ s: i / n, prev: null }); return out; }
  stepElectrons(els, eps, dt, vmm) {
    const path = this.centerline(eps);
    const len = pathLength(path, eps, this.yex);
    const sBreak = this.broken ? this.breakX / L0 : 2;
    for (const e of els) {
      if (!this.broken) { e.s += vmm * dt / Math.max(1e-6, len); if (e.s > 1) e.s -= 1; }
      else if (e.s < sBreak - 0.01) e.s = Math.min(sBreak - 0.01, e.s + vmm * dt / len);   // pile up at the break
      const p = pointAt(path, eps, e.s, this.yex);
      e.prev = e.pos || p; e.pos = p;
    }
  }
}

class Yarn {
  constructor(seed) {
    const r = rng(seed);
    this.name = 'yarn'; this.R0 = 0.8; this.yex = 2.5;
    this.nf = 6; this.fil = [];
    for (let j = 0; j < this.nf; j++) this.fil.push({ y0: (j / (this.nf - 1) - 0.5) * 0.36, a: 0.13 + r() * 0.12, lam: 2.2 + r() * 1.6, ph: r() * Math.PI * 2 });
    this.contacts = [];
    this.n0 = 60;
    for (let i = 0; i < this.n0; i++) {
      const j = Math.floor(r() * (this.nf - 1));
      this.contacts.push({ x: 0.6 + r() * (L0 - 1.2), j, k: j + 1, b: 0.12 - 0.22 * Math.log(1 - r() * 0.999), intact: true });
    }
    this.contacts.sort((a, b) => a.x - b.x);
    this.spec = 'silver-plated nylon, 2-ply multifilament · 20 mm stitched · R₀ 0.80 Ω';
  }
  update(eps) {
    for (const c of this.contacts) {
      if (c.intact && eps >= c.b) { c.intact = false; state.sparks.push({ x: sx(c.x, eps), y: this.contactY(c, eps), t: 0 }); }
      else if (!c.intact && eps < 0.85 * c.b) c.intact = true;
    }
  }
  intactCount() { return this.contacts.filter(c => c.intact).length; }
  resistance(eps) {
    const nc = Math.max(3, this.intactCount());
    const dip = 1 - 0.15 * (eps / 0.12) * Math.exp(1 - eps / 0.12);
    return this.R0 * Math.pow(1 + eps, 1.2) * Math.pow(this.n0 / nc, 0.9) * dip;
  }
  static expectedCurve(eps) {
    const frac = eps < 0.12 ? 1 : Math.exp(-(eps - 0.12) / 0.22);
    const nc = Math.max(3, 60 * frac);
    const dip = 1 - 0.15 * (eps / 0.12) * Math.exp(1 - eps / 0.12);
    return Math.pow(1 + eps, 1.2) * Math.pow(60 / nc, 0.9) * dip;
  }
  statusLine(eps) { return this.intactCount() + ' / ' + this.n0 + ' contacts intact'; }
  regime(eps) {
    const nc = this.intactCount();
    if (eps < 0.02) return nc === this.n0 ? 'at rest — all contacts touching' : 'relaxing — contacts re-forming';
    if (eps < 0.12) return 'filaments aligning — contacts pressed tighter';
    if (nc > this.n0 * 0.5) return 'contacts breaking — fewer paths between filaments';
    if (nc > 8) return 'most contacts open — long single-filament runs';
    return 'network nearly open — a few contacts carry everything';
  }
  filY(j, xr, eps) {
    const f = this.fil[j];
    const yScale = Math.pow(1 + eps, -0.35);
    return f.y0 * yScale + f.a / Math.pow(1 + eps, 1.6) * Math.sin(2 * Math.PI * xr / f.lam + f.ph);
  }
  // deflection of filament j at rest-x from broken contacts near it
  deflect(j, xr, eps) {
    let d = 0;
    for (const c of this.contacts) {
      if (c.intact || Math.abs(c.x - xr) > 1.4) continue;
      const u = (c.x - xr) / 1.4, bump = Math.exp(-4 * u * u) * 0.2;
      if (c.j === j) d -= bump; else if (c.k === j) d += bump;
    }
    return d;
  }
  contactY(c, eps) { return sy(0.5 * (this.filY(c.j, c.x, eps) + this.filY(c.k, c.x, eps)), this.yex); }
  filPath(j, eps) {
    const pts = []; const N = 240;
    for (let i = 0; i <= N; i++) { const x = L0 * i / N; pts.push([x, this.filY(j, x, eps) + this.deflect(j, x, eps)]); }
    return pts;
  }
  draw(ctx, eps) {
    drawSubstrate(ctx, eps, 1.3 * Math.pow(1 + eps, -NU), this.yex);
    const wpx = Math.max(1.5, 0.07 * this.yex * view.pxmm);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    this.paths = [];
    for (let j = 0; j < this.nf; j++) {
      const pts = this.filPath(j, eps); this.paths.push(pts);
      ctx.beginPath();
      pts.forEach((p, i) => { const X = sx(p[0], eps), Y = sy(p[1], this.yex); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.lineWidth = wpx + 1.5; ctx.strokeStyle = css('--black-raised'); ctx.stroke();
      ctx.lineWidth = wpx; ctx.strokeStyle = rgb(SILVER_DIM); ctx.stroke();
      ctx.lineWidth = Math.max(0.8, wpx * 0.35); ctx.strokeStyle = rgb(SILVER, 0.8); ctx.stroke();
    }
    // contact points
    for (const c of this.contacts) {
      const X = sx(c.x, eps), Y = this.contactY(c, eps);
      if (c.intact) {
        const press = eps < 0.12 ? 1 + 0.6 * (eps / 0.12) : 1;
        ctx.beginPath(); ctx.arc(X, Y, 2.2 * press, 0, Math.PI * 2); ctx.fillStyle = rgb(TEAL, 0.95); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(X, Y, 2.4, 0, Math.PI * 2); ctx.strokeStyle = rgb(RUST, 0.8); ctx.lineWidth = 1; ctx.stroke();
      }
    }
  }
  seedElectrons(n) { const out = []; for (let i = 0; i < n; i++) out.push({ j: i % this.nf, x: Math.random() * L0, prev: null }); return out; }
  stepElectrons(els, eps, dt, vmm) {
    const dx = vmm * dt / (1 + eps);   // rest-mm advanced per step
    for (const e of els) {
      const x1 = e.x + dx;
      for (const c of this.contacts) {
        if (!c.intact || c.x <= e.x || c.x > x1) continue;
        if (c.j === e.j && Math.random() < 0.5) e.j = c.k; else if (c.k === e.j && Math.random() < 0.5) e.j = c.j;
      }
      e.x = x1; if (e.x > L0) e.x -= L0;
      const p = [sx(e.x, eps), sy(this.filY(e.j, e.x, eps) + this.deflect(e.j, e.x, eps), this.yex)];
      e.prev = e.pos || p; e.pos = p;
    }
  }
}

// ------------------------------------------------------------------ geometry helpers
// arc length of one period of a sinusoidal meander of amplitude A and period p
function perLen(A, p) {
  let len = 0, px = 0, py = 0; const N = 160;
  for (let i = 1; i <= N; i++) { const x = p * i / N, y = A * Math.sin(2 * Math.PI * x / p); len += Math.hypot(x - px, y - py); px = x; py = y; }
  return len;
}
function pathLength(pts, eps, yex = 1) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot((pts[i][0] - pts[i - 1][0]) * (1 + eps), (pts[i][1] - pts[i - 1][1]) * yex);
  return len;
}
function pointAt(pts, eps, s, yex = 1) {
  const total = pathLength(pts, eps, yex); let target = clamp(s, 0, 1) * total;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot((pts[i][0] - pts[i - 1][0]) * (1 + eps), (pts[i][1] - pts[i - 1][1]) * yex);
    if (target <= seg || i === pts.length - 1) {
      const t = seg > 0 ? clamp(target / seg, 0, 1) : 0;
      return [sx(lerp(pts[i - 1][0], pts[i][0], t), eps), sy(lerp(pts[i - 1][1], pts[i][1], t), yex)];
    }
    target -= seg;
  }
  return [sx(pts[0][0], eps), sy(pts[0][1], yex)];
}

function drawSubstrate(ctx, eps, halfWmm, yex) {
  const top = sy(halfWmm, yex), bot = sy(-halfWmm, yex);
  ctx.fillStyle = 'rgba(139,148,148,0.07)';
  ctx.fillRect(sx(0, eps) - 6, top, sx(L0, eps) - sx(0, eps) + 12, bot - top);
  ctx.strokeStyle = 'rgba(139,148,148,0.25)'; ctx.lineWidth = 1;
  ctx.strokeRect(sx(0, eps) - 6 + 0.5, top + 0.5, sx(L0, eps) - sx(0, eps) + 12, bot - top);
}
function drawClamps(ctx, eps) {
  const h = 46, w = 12;
  const line = css('--line-strong');
  for (const [x, fixed] of [[sx(0, eps) - 6 - w, true], [sx(L0, eps) + 6, false]]) {
    ctx.fillStyle = css('--black'); ctx.fillRect(x, view.cy - h / 2, w, h);
    ctx.strokeStyle = fixed ? line : css('--petrol-bright'); ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, view.cy - h / 2 + 0.5, w, h);
    ctx.strokeStyle = 'rgba(139,148,148,0.5)';
    for (let k = 1; k < 5; k++) { const y = view.cy - h / 2 + k * h / 5; ctx.beginPath(); ctx.moveTo(x + 2, y); ctx.lineTo(x + w - 2, y); ctx.stroke(); }
  }
}

// ------------------------------------------------------------------ electrons
const N_ELECTRONS = 36;
function newSample() {
  state.seed = (state.seed * 7919 + 13) % 100000 + 1;
  const S = state.type === 'printed' ? new Printed(state.seed) : state.type === 'laminated' ? new Laminated(state.seed) : new Yarn(state.seed);
  state.sample = S;
  state.eps = 0; state.epsMax = 0; state.spring = null; state.history = []; state.sparks = [];
  S.update(0);
  state.electrons = S.seedElectrons(N_ELECTRONS);
  syncTypeLabels();
  if (ro.spec) ro.spec.textContent = S.spec;
}
function drawElectrons(ctx, els, R, R0) {
  const speedFrac = isFinite(R) ? clamp(R0 / R, 0, 1) : 0;
  const glow = rgb(TEAL, 0.18 + 0.25 * speedFrac);
  for (const e of els) {
    if (!e.pos) continue;
    if (e.prev && Math.hypot(e.prev[0] - e.pos[0], e.prev[1] - e.pos[1]) < 40) {
      ctx.beginPath(); ctx.moveTo(e.prev[0], e.prev[1]); ctx.lineTo(e.pos[0], e.pos[1]); ctx.strokeStyle = rgb(TEAL, 0.5); ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(e.pos[0], e.pos[1], 4.5, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill();
    ctx.beginPath(); ctx.arc(e.pos[0], e.pos[1], 1.9, 0, Math.PI * 2); ctx.fillStyle = '#dff6f6'; ctx.fill();
  }
}
function drawSparks(ctx, dt) {
  for (const s of state.sparks) {
    s.t += dt;
    const life = s.big ? 0.9 : 0.45, k = clamp(s.t / life, 0, 1);
    const r = (s.big ? 22 : 9) * k + 2;
    ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.strokeStyle = rgb(RUST, (1 - k) * 0.9); ctx.lineWidth = s.big ? 2 : 1.2; ctx.stroke();
  }
  state.sparks = state.sparks.filter(s => s.t < (s.big ? 0.9 : 0.45));
}

// ------------------------------------------------------------------ chart
function drawChart() {
  const ctx = chart.ctx, w = chart.w, h = chart.h;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = css('--black-raised'); ctx.fillRect(0, 0, w, h);
  const mono = css('--mono');
  const padL = 40, padR = 14, padT = 10, padB = 24;
  const X0 = padL, X1 = w - padR, Y0 = h - padB, Y1 = padT;
  const xmax = EPS_MAX, ymaxLog = 4;
  const fx = e => X0 + (X1 - X0) * clamp(e / xmax, 0, 1);
  const fy = ratio => Y0 - (Y0 - Y1) * clamp(Math.log10(Math.max(1e-3, ratio)) / ymaxLog, 0, 1);
  ctx.strokeStyle = 'rgba(139,148,148,0.18)'; ctx.lineWidth = 1;
  for (let e = 0; e <= xmax + 1e-9; e += 0.2) { ctx.beginPath(); ctx.moveTo(fx(e) + 0.5, Y0); ctx.lineTo(fx(e) + 0.5, Y1); ctx.stroke(); }
  for (let d = 0; d <= ymaxLog; d++) { ctx.beginPath(); ctx.moveTo(X0, fy(Math.pow(10, d)) + 0.5); ctx.lineTo(X1, fy(Math.pow(10, d)) + 0.5); ctx.stroke(); }
  ctx.font = '10px ' + mono; ctx.fillStyle = css('--ink-faint'); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let e = 0; e <= xmax + 1e-9; e += 0.2) ctx.fillText((e * 100).toFixed(0) + '%', fx(e), Y0 + 6);
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let d = 0; d <= ymaxLog; d++) ctx.fillText(d === 0 ? '×1' : '×10' + '⁰¹²³⁴'[d], X0 - 5, fy(Math.pow(10, d)));
  // reference curves for the three structures, the live one solid
  const series = [
    { key: 'printed', col: TEAL, f: Printed.expectedCurve, label: 'printed' },
    { key: 'laminated', col: COPPER, f: Laminated.expectedCurve, label: 'laminated' },
    { key: 'yarn', col: SILVER, f: Yarn.expectedCurve, label: 'yarn' },
  ];
  for (const s of series) {
    const live = s.key === state.type;
    ctx.lineWidth = live ? 2 : 1.2; ctx.strokeStyle = rgb(s.col, live ? 1 : 0.45); ctx.setLineDash(live ? [] : [3, 3]);
    ctx.beginPath(); let started = false, lastPt = null;
    for (let i = 0; i <= 80; i++) {
      const e = xmax * i / 80, r = s.f(e);
      if (!isFinite(r)) { if (lastPt) { ctx.lineTo(lastPt[0], Y1); } break; }
      const X = fx(e), Y = fy(r);
      if (!started) { ctx.moveTo(X, Y); started = true; } else ctx.lineTo(X, Y);
      lastPt = [X, Y];
    }
    ctx.stroke(); ctx.setLineDash([]);
    // direct label at the curve's right end
    let le = xmax, lr = s.f(le), lx, ly;
    // an open curve is labelled to the left of its vertical, a row below the
    // top edge, so it never collides with a curve that exits at the top right
    let openLabel = false;
    if (!isFinite(lr)) { let ee = 0; for (let i = 0; i <= 80; i++) { const e = xmax * i / 80; if (isFinite(s.f(e))) ee = e; } lx = fx(ee) + 5; ly = Y1 + 26; openLabel = true; }
    else { lx = fx(le) - 3; ly = Math.max(Y1 + 12, fy(lr) - 7); }
    ctx.fillStyle = rgb(s.col, live ? 1 : 0.7); ctx.textAlign = openLabel ? 'left' : 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText(s.label + (isFinite(lr) ? '' : ' · open'), lx, ly);
  }
  // this sample's history — the loading and unloading path actually taken
  const S = state.sample;
  if (state.history.length > 1) {
    ctx.beginPath(); ctx.strokeStyle = 'rgba(233,236,236,0.35)'; ctx.lineWidth = 1;
    let started = false;
    for (const [e, R] of state.history) { if (!isFinite(R)) break; const X = fx(e), Y = fy(R / S.R0); if (!started) { ctx.moveTo(X, Y); started = true; } else ctx.lineTo(X, Y); }
    ctx.stroke();
  }
  const R = state.R;
  const X = fx(state.eps), Y = isFinite(R) ? fy(R / S.R0) : Y1;
  ctx.beginPath(); ctx.arc(X, Y, 4.5, 0, Math.PI * 2); ctx.fillStyle = css('--black-raised'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = isFinite(R) ? css('--ink') : rgb(RUST); ctx.stroke();
}

// ------------------------------------------------------------------ readouts
const ro = {};
function fmtR(R) {
  if (!isFinite(R)) return 'open';
  if (R >= 1000) return (R / 1000).toFixed(R >= 10000 ? 0 : 1) + ' kΩ';
  if (R >= 100) return R.toFixed(0) + ' Ω';
  if (R >= 10) return R.toFixed(1) + ' Ω';
  return R.toFixed(R >= 1 ? 2 : 3) + ' Ω';
}
function fmtRatio(R, R0) {
  if (!isFinite(R)) return '∞';
  const k = R / R0;
  return '×' + (k >= 100 ? k.toFixed(0) : k >= 10 ? k.toFixed(1) : k.toFixed(2));
}
function updateReadouts() {
  const S = state.sample, R = state.R;
  ro.r.textContent = fmtR(R);
  ro.ratio.textContent = fmtRatio(R, S.R0);
  ro.strain.textContent = (state.eps * 100).toFixed(0) + '%';
  ro.peak.textContent = (state.epsMax * 100).toFixed(0) + '%';
  ro.regime.textContent = S.regime(state.eps);
  ro.regime.classList.toggle('is-warn', !isFinite(R));
  ro.structure.textContent = S.statusLine(state.eps);
  ro.spec.textContent = S.spec;
  const frac = isFinite(R) ? clamp(S.R0 / R, 0, 1) : 0;
  ro.current.textContent = isFinite(R) ? (frac * 100).toFixed(frac < 0.1 ? 1 : 0) + '% of the rest current' : 'none — circuit open';
  ro.currentBar.style.width = (frac * 100).toFixed(1) + '%';
}

// ------------------------------------------------------------------ frame
let lastT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - (lastT || now)) / 1000); lastT = now;
  fit(view); fit(chart);
  const S = state.sample;
  // strain: drag, hold button, or spring back
  if (state.drag) {
    if (!state.drag.virtual) state.eps = clamp(state.epsAtDown + (state.drag.x - state.drag.x0) / (L0 * view.pxmm), 0, EPS_MAX);
    else state.eps = clamp(state.eps + 0.38 * dt, 0, EPS_MAX);
  } else if (state.spring) {
    const t = (now - state.spring.t0) / 1000, tau = reduceMotion ? 0.001 : 0.12;
    state.eps = state.spring.from * (1 + t / tau) * Math.exp(-t / tau);
    if (state.eps < 0.002) { state.eps = 0; state.spring = null; }
  }
  state.epsMax = Math.max(state.epsMax, state.eps);
  S.update(state.eps);
  state.R = S.resistance(state.eps, state.epsMax);
  const last = state.history[state.history.length - 1];
  if (!last || Math.abs(last[0] - state.eps) > 0.004) { state.history.push([state.eps, state.R]); if (state.history.length > 900) state.history.shift(); }
  // draw
  const ctx = view.ctx;
  ctx.fillStyle = css('--black-raised'); ctx.fillRect(0, 0, view.w, view.h);
  // mm grid
  ctx.fillStyle = 'rgba(139,148,148,0.14)';
  for (let x = view.x0 % view.pxmm; x < view.w; x += view.pxmm) for (let y = view.cy % view.pxmm; y < view.h; y += view.pxmm) ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
  // rest-length ghost
  ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(139,148,148,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(sx(L0, 0) + 6, view.cy - 34); ctx.lineTo(sx(L0, 0) + 6, view.cy + 34); ctx.stroke(); ctx.setLineDash([]);
  S.draw(ctx, state.eps);
  const vmm = 14 * (isFinite(state.R) ? Math.max(0.02, S.R0 / state.R) : 0);
  S.stepElectrons(state.electrons, state.eps, dt, vmm);
  drawElectrons(ctx, state.electrons, state.R, S.R0);
  drawSparks(ctx, dt);
  drawClamps(ctx, state.eps);
  // strain label at the moving clamp
  ctx.font = '11px ' + css('--mono'); ctx.fillStyle = css('--ink'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText((state.eps * 100).toFixed(0) + '%', sx(L0, state.eps) + 24, view.cy);
  // scale bar
  const bx = 18, by = view.h - 18;
  ctx.strokeStyle = css('--ink-dim'); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 5 * view.pxmm, by); ctx.moveTo(bx, by - 4); ctx.lineTo(bx, by + 4); ctx.moveTo(bx + 5 * view.pxmm, by - 4); ctx.lineTo(bx + 5 * view.pxmm, by + 4); ctx.stroke();
  ctx.fillStyle = css('--ink-dim'); ctx.font = '10px ' + css('--mono'); ctx.textBaseline = 'bottom'; ctx.textAlign = 'left';
  ctx.fillText('5 mm along' + (S.yex > 1 ? ' · widths ×' + S.yex : ''), bx, by - 6);
  drawChart();
  updateReadouts();
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------------ input
function bindPointer() {
  const c = view.canvas;
  c.addEventListener('pointerdown', ev => {
    if (ev.button !== undefined && ev.button !== 0) return;
    ev.preventDefault(); c.setPointerCapture(ev.pointerId);
    const r = c.getBoundingClientRect();
    state.spring = null; state.epsAtDown = state.eps;
    state.drag = { x0: ev.clientX - r.left, x: ev.clientX - r.left, virtual: false };
    document.body.classList.add('is-pulling');
  });
  c.addEventListener('pointermove', ev => { if (!state.drag || state.drag.virtual) return; const r = c.getBoundingClientRect(); state.drag.x = ev.clientX - r.left; });
  const up = () => { if (state.drag && !state.drag.virtual) release(); };
  c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up); c.addEventListener('lostpointercapture', up);
}
function release() {
  state.drag = null; document.body.classList.remove('is-pulling');
  state.spring = { from: state.eps, t0: performance.now() };
}
function bindHold() {
  const btn = document.getElementById('ctlStretch');
  const start = () => { if (state.drag) return; state.spring = null; state.drag = { virtual: true }; btn.classList.add('is-active'); document.body.classList.add('is-pulling'); };
  const stop = () => { btn.classList.remove('is-active'); if (state.drag && state.drag.virtual) release(); };
  btn.addEventListener('pointerdown', ev => { ev.preventDefault(); btn.setPointerCapture(ev.pointerId); start(); });
  btn.addEventListener('pointerup', stop); btn.addEventListener('pointercancel', stop); btn.addEventListener('lostpointercapture', stop);
  btn.addEventListener('keydown', ev => { if ((ev.key === ' ' || ev.key === 'Enter') && !ev.repeat) { ev.preventDefault(); start(); } });
  btn.addEventListener('keyup', ev => { if (ev.key === ' ' || ev.key === 'Enter') stop(); });
  btn.addEventListener('blur', stop);
}
function bindControls() {
  document.querySelectorAll('[data-type]').forEach(b => b.addEventListener('click', () => setType(b.dataset.type)));
  document.getElementById('ctlNew').addEventListener('click', newSample);
}
function setType(t) { if (state.type === t && state.sample) return; state.type = t; newSample(); }
function syncTypeLabels() {
  document.querySelectorAll('[data-type]').forEach(b => { const on = b.dataset.type === state.type; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  document.querySelectorAll('.ctr-typed').forEach(el => { el.textContent = el.dataset[state.type] || ''; });
}

function init() {
  view.canvas = document.getElementById('traceCanvas'); view.ctx = view.canvas.getContext('2d');
  chart.canvas = document.getElementById('chartCanvas'); chart.ctx = chart.canvas.getContext('2d');
  ['r', 'ratio', 'strain', 'peak', 'regime', 'structure', 'spec', 'current', 'currentBar'].forEach(k => { ro[k] = document.getElementById('ro-' + k); });
  bindControls(); bindPointer(); bindHold();
  newSample();
  requestAnimationFrame(frame);
  window.__traceSim = {
    get state() { return state; },
    setType, newSample, release,
    setStrain(e) { state.spring = null; state.drag = null; state.eps = clamp(e, 0, EPS_MAX); },
    hold() { state.spring = null; state.drag = { virtual: true }; },
    curves: { printed: Printed.expectedCurve, laminated: Laminated.expectedCurve, yarn: Yarn.expectedCurve },
  };
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
