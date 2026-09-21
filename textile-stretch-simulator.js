/* textile-stretch-simulator.js — Field Notes No. 05
   An interactive, quasi-static model of how a knitted and a woven fabric
   stretch, drawn at the yarn level.

   The swatch is homogeneous: one unit cell, repeated. The user's drag is a
   FORCE, not a position — the cursor pulls the swatch through a compliant
   "hand", the fabric extends along its own load–extension curve, and the gap
   between hand and fabric is what stiffness feels like. A jersey follows the
   cursor; a poplin pulled on grain barely moves; the same poplin pulled on the
   bias trellises open.

   Knit (weft-knit jersey, technical face). The loop is drawn from four
   dimensions — head half-width a, sinker half-width s, shoulder height yh, and
   the head/sinker arc heights — all tied to one free number, the loop height
   H. Yarn length per wale ℓ is a function of (W', H). In the structural
   regime the yarn is inextensible: for the stretched cell width W' the loop
   height is whatever conserves ℓ₀, so a course-wise pull flattens the loop
   and a wale-wise pull (which narrows the cell through lateral contraction)
   makes it tall. Interlock demands H ≥ C' + d; when conserving ℓ₀ would put H
   below that floor the loop is jammed and the excess is yarn strain — the
   second, stiff regime.

   Woven (plain weave). On grain: crimp interchange — the pulled yarn
   straightens (soft, up to the crimp percentage) and then extends (stiff).
   Off grain: the shear component rotates the yarns about their crossings — the
   trellis — soft until the locking angle where adjacent yarns touch.

   Units: mm for geometry; strain as a fraction; load in N per 50 mm strip.
   The constants are calibrated to be plausible, not measured — see the
   page's "What the model is" section. */
(() => {
'use strict';

const YARN_D = 0.30;          // mm — one yarn for every configuration
const SWATCH_MM = 20;         // rest swatch is 20 mm square
const KAPPA = 0.35;           // fraction of loop height in the two arcs
const HEAD_FRAC = 0.26, SINK_FRAC = 0.09; // head / sinker half-widths as a fraction of W
const K_HAND = 0.22;          // N per px of hand–fabric gap
const SIGMA_MAX = 60;         // N — the grip's limit
const EPS_TABLE_MAX = 2.0;    // axial tables sampled 0..200 % extension
const EPS_TABLE_N = 201;
const BEZ_K = 0.5523;         // quarter-ellipse Bézier constant
const RUST = [165, 107, 46];
const TEAL = [28, 107, 107];
const TEAL_BRIGHT = [47, 163, 163];

const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------- state
const state = {
  fabric: 'knit',
  spandex: 0,            // percent
  density: 5.5,          // wales/cm (knit) or threads/cm (woven)
  elasticity: 0.3,       // 0 rigid (cotton) .. 1 elastic (textured nylon)
  P: null,               // derived parameters + tables
  theta: 0,              // pull direction, radians from the horizontal yarn axis
  sigma: 0,              // current load along the pull, N
  elastic: { e1: 0, e2: 0, g: 0 },   // strains carried by the current load
  residual: { e1: 0, e2: 0, g: 0 },  // strain that outlives the load
  release: null,         // { t0, peak:{e1,e2,g}, rImm:[...], rPerm:[...], tauE }
  drag: null,            // { G:{x,y}, Q:{x,y}, Gm:[x,y] rest mm, uc, virtual }
  anchor: [0, 0],        // the pinned material point, rest mm (opposite the grab, along −pull)
  T: [0, 0],             // translation that keeps the map continuous across grabs, mm
  off: [0, 0],           // per-frame: −M·A + A + T
  broken: false,
  lastFrame: 0,
};

const PRESETS = {
  'cotton-jersey':  { fabric: 'knit',  spandex: 0,  density: 6.0, elasticity: 0.15 },
  'spandex-jersey': { fabric: 'knit',  spandex: 8,  density: 7.0, elasticity: 0.35 },
  'cotton-poplin':  { fabric: 'woven', spandex: 0,  density: 22,  elasticity: 0.1 },
  'stretch-denim':  { fabric: 'woven', spandex: 2,  density: 16,  elasticity: 0.2 },
  'wool-knit':      { fabric: 'knit',  spandex: 0,  density: 4.0, elasticity: 0.8 },
};

// ---------------------------------------------------------------- helpers
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const softplus = (x, w) => (x / w > 30 ? x : w * Math.log1p(Math.exp(x / w)));
const fmtPct = (v, d = 0) => (v * 100).toFixed(d) + '%';
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mix = (c0, c1, t) => c0.map((v, i) => Math.round(lerp(v, c1[i], clamp(t, 0, 1))));

// ---------------------------------------------------------------- knit loop geometry
// One wale of one course, wale centre at x = 0, feet on y = 0, y up.
function loopDims(W, H) {
  const a = HEAD_FRAC * W, s = SINK_FRAC * W;
  const hsum = KAPPA * H;
  const ha = hsum * a / (a + s), hs = hsum * s / (a + s);
  const yh = (1 - KAPPA) * H;
  return { a, s, b: W / 2 - s, ha, hs, yh, H, W };
}

// Cubic Bézier segments for one wale, starting at the left sinker bottom.
function loopSegments(L, x0) {
  const { a, s, b, ha, hs, yh, W } = L;
  const k = BEZ_K;
  const P = (x, y) => [x0 + x, y];
  return [
    // left sinker: bottom -> left foot (quarter ellipse centred at (-W/2, 0))
    [P(-W / 2, -hs), P(-W / 2 + k * s, -hs), P(-b, -k * hs), P(-b, 0)],
    // left leg
    [P(-b, 0), P(-b + (a - b) / 3, yh / 3), P(-b + 2 * (a - b) / 3, 2 * yh / 3), P(-a, yh)],
    // head, left half
    [P(-a, yh), P(-a, yh + k * ha), P(-k * a, yh + ha), P(0, yh + ha)],
    // head, right half
    [P(0, yh + ha), P(k * a, yh + ha), P(a, yh + k * ha), P(a, yh)],
    // right leg
    [P(a, yh), P(a + (b - a) / 3, 2 * yh / 3), P(a + 2 * (b - a) / 3, yh / 3), P(b, 0)],
    // right sinker: right foot -> bottom at (W/2, -hs)
    [P(b, 0), P(b, -k * hs), P(W / 2 - k * s, -hs), P(W / 2, -hs)],
  ];
}

function bezLength(seg, n = 14) {
  let len = 0, px = seg[0][0], py = seg[0][1];
  for (let i = 1; i <= n; i++) {
    const t = i / n, u = 1 - t;
    const x = u * u * u * seg[0][0] + 3 * u * u * t * seg[1][0] + 3 * u * t * t * seg[2][0] + t * t * t * seg[3][0];
    const y = u * u * u * seg[0][1] + 3 * u * u * t * seg[1][1] + 3 * u * t * t * seg[2][1] + t * t * t * seg[3][1];
    len += Math.hypot(x - px, y - py); px = x; py = y;
  }
  return len;
}

function loopLength(W, H) {
  const segs = loopSegments(loopDims(W, H), 0);
  let len = 0;
  for (const s of segs) len += bezLength(s);
  return len;
}

// Given the deformed cell (W', C'), the relaxed yarn length ℓ₀ and yarn
// diameter d: the loop height that conserves ℓ₀, floored by interlock.
function solveLoop(W, C, len0, d) {
  const Hmin = C + d;
  const lenAtMin = loopLength(W, Hmin);
  if (lenAtMin >= len0) {
    return { ...loopDims(W, Hmin), jammed: true, yarnStrain: lenAtMin / len0 - 1, len: lenAtMin };
  }
  let lo = Hmin, hi = Math.max(Hmin * 1.01, 8 * C);
  if (loopLength(W, hi) < len0) return { ...loopDims(W, hi), jammed: false, yarnStrain: 0, len: len0 };
  for (let i = 0; i < 40; i++) {
    const mid = 0.5 * (lo + hi);
    if (loopLength(W, mid) < len0) lo = mid; else hi = mid;
  }
  const H = 0.5 * (lo + hi);
  return { ...loopDims(W, H), jammed: false, yarnStrain: 0, len: len0 };
}

// ---------------------------------------------------------------- parameters
function deriveParams() {
  const sp = state.spandex / 100, e = state.elasticity, d = YARN_D;
  // The yarn: a hard fibre (cotton .. textured nylon) with, when spandex is
  // present, an elastane core that carries the load softly until the sheath
  // fibres lock at epsSp; from there the hard fibre's modulus takes over.
  const Khard = 250 * (1 - e) + 25 * e;      // N per unit yarn strain, per knit strip
  const Ksoft = 15;                           // elastane-dominated modulus
  const epsSp = Math.min(0.8, 12 * sp);       // yarn strain the spandex core allows before lock
  const yarnMax = epsSp + 0.05 + 0.30 * e;    // yarn strain at break
  const P = { fabric: state.fabric, d, sp, e, yarnMax, Khard, Ksoft, epsSp };
  if (state.fabric === 'knit') {
    P.W0 = 10 / state.density;
    P.C0 = P.W0 / 1.3;
    P.H0 = 1.3 * P.C0 + d;                 // relaxed loop height: ~30 % wale slack
    P.len0 = loopLength(P.W0, P.H0);
    P.tight = clamp((d / P.W0 - 0.105) / (0.24 - 0.105), 0, 1);
    P.Ks = 3 * (1 + 2 * P.tight) * (1 - 0.4 * e) * (1 + 3 * sp);
    P.Kmul = 1;
    P.nu = 0.7;
    P.Ksh = 8; P.gLock = 0.9; P.KLock = 60;
    P.Wmin = 4 * d; P.Cmin = 2.5 * d;
    P.nx = Math.max(3, Math.round(SWATCH_MM / P.W0));
    P.ny = Math.max(3, Math.round(SWATCH_MM / P.C0));
    P.resBaseAx = 0.45; P.resBaseSh = 0.5;
  } else {
    P.p = 10 / state.density;
    P.cover = clamp(d / P.p, 0, 0.95);
    P.crimp = 0.02 + 0.08 * clamp((P.cover - 0.3) / 0.48, 0, 1);
    P.Kc = 60 + 80 * P.cover;
    P.Kmul = 5;                            // many more yarns across a woven strip
    P.nu = 0.25;
    P.Ksh = 2 * (0.5 + P.cover);
    P.gLock = Math.min(Math.PI / 3, Math.acos(Math.min(0.99, P.cover)));
    P.KLock = 600;
    P.n = Math.max(6, Math.round(SWATCH_MM / P.p));
    P.resBaseAx = 0.25; P.resBaseSh = 0.5;
  }
  // residual (set) fractions right after the elastic snap-back, and the
  // permanent set that survives creep recovery
  const rel = (1 - 0.5 * e) * Math.exp(-sp / 0.02);
  P.rImmAx = clamp(P.resBaseAx * rel, 0, 0.9);
  P.rImmSh = clamp(P.resBaseSh * rel, 0, 0.9);
  P.rPermAx = P.rImmAx * 0.35;
  P.rPermSh = P.rImmSh * 0.4;
  P.tauE = sp > 0.02 ? 0.08 : 0.14;
  // axial load tables, one per yarn axis
  P.tab1 = axialTable(P, 1);
  P.tab2 = axialTable(P, 2);
  P.sigBreak1 = breakLoad(P.tab1, yarnMax);
  P.sigBreak2 = breakLoad(P.tab2, yarnMax);
  state.P = P;
}

// F(ε) for a pure pull along axis 1 (horizontal yarn direction) or axis 2,
// with the lateral contraction the structure would have. Monotone by
// construction (running max).
function axialTable(P, axis) {
  const F = new Float64Array(EPS_TABLE_N), Y = new Float64Array(EPS_TABLE_N);
  let fmax = 0;
  for (let i = 0; i < EPS_TABLE_N; i++) {
    const eps = EPS_TABLE_MAX * i / (EPS_TABLE_N - 1);
    let f, ys;
    if (P.fabric === 'knit') {
      let W, C;
      if (axis === 1) { W = P.W0 * (1 + eps); C = Math.max(P.C0 * (1 - P.nu * eps), P.Cmin); }
      else { C = P.C0 * (1 + eps); W = Math.max(P.W0 * (1 - P.nu * eps), P.Wmin); }
      const L = solveLoop(W, C, P.len0, P.d);
      ys = L.yarnStrain;
      f = P.Ks * eps + yarnForce(P, ys);
    } else {
      ys = softplus(eps - P.crimp, 0.004);
      f = P.Kc * eps + yarnForce(P, ys);
    }
    fmax = Math.max(fmax, f);
    F[i] = fmax; Y[i] = ys;
  }
  return { F, Y };
}

function yarnForce(P, ys) {
  return P.Kmul * (P.Ksoft * ys + P.Khard * softplus(ys - P.epsSp, 0.008));
}

function breakLoad(tab, yarnMax) {
  for (let i = 0; i < EPS_TABLE_N; i++) if (tab.Y[i] >= yarnMax) return tab.F[i];
  return Infinity;
}

// invert a table: load -> strain (linear interpolation)
function strainFromLoad(tab, f) {
  const F = tab.F;
  if (f <= 0) return 0;
  if (f >= F[EPS_TABLE_N - 1]) return EPS_TABLE_MAX;
  let lo = 0, hi = EPS_TABLE_N - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (F[m] < f) lo = m; else hi = m; }
  const t = (F[hi] - F[lo]) > 1e-12 ? (f - F[lo]) / (F[hi] - F[lo]) : 0;
  return EPS_TABLE_MAX * (lo + t) / (EPS_TABLE_N - 1);
}
function yarnStrainAt(tab, eps) {
  const x = clamp(eps / EPS_TABLE_MAX, 0, 1) * (EPS_TABLE_N - 1);
  const i = Math.min(EPS_TABLE_N - 2, Math.floor(x)), t = x - i;
  return lerp(tab.Y[i], tab.Y[i + 1], t);
}

function shearFromLoad(P, tau) {
  // K_sh·γ + K_lock·(γ − γ_lock)⁺² = |τ|, solved by bisection
  const target = Math.abs(tau);
  const f = g => P.Ksh * g + P.KLock * Math.pow(Math.max(0, g - P.gLock), 2);
  let lo = 0, hi = 2.5;
  if (f(hi) < target) return Math.sign(tau) * hi;
  for (let i = 0; i < 40; i++) { const m = 0.5 * (lo + hi); if (f(m) < target) lo = m; else hi = m; }
  return Math.sign(tau) * 0.5 * (lo + hi);
}

// elastic material-frame strains for a load σ along direction θ
function elasticStrains(P, sigma, theta) {
  const c = Math.cos(theta), s = Math.sin(theta);
  const s1 = sigma * c * c, s2 = sigma * s * s, tau = sigma * s * c;
  return { e1: strainFromLoad(P.tab1, s1), e2: strainFromLoad(P.tab2, s2), g: shearFromLoad(P, tau) };
}
// Extension along the pull from the three material strains. The shear term
// is the exact trellis: yarns of fixed length each rotate by γ/2 toward the
// bisector, so the diagonal stretches by cos(γ/2)+sin(γ/2) — 32 % at a 49°
// shear, not the 43 % a linearised γ/2 would claim.
function strainAlong(E, theta) {
  const c = Math.cos(theta), s = Math.sin(theta);
  const trellis = Math.cos(E.g / 2) + Math.sin(E.g / 2) - 1;
  return E.e1 * c * c + E.e2 * s * s + 2 * s * c * trellis;
}
function pullExtent(P, theta) {
  // rest extent of the swatch along the pull, mm
  const dims = restDims(P);
  return dims.w * Math.abs(Math.cos(theta)) + dims.h * Math.abs(Math.sin(theta));
}
function restDims(P) {
  if (P.fabric === 'knit') return { w: P.nx * P.W0, h: (P.ny - 1) * P.C0 + P.H0 };
  return { w: P.n * P.p, h: P.n * P.p };
}

function loadCap(P, theta) {
  const c2 = Math.cos(theta) ** 2, s2 = Math.sin(theta) ** 2;
  let cap = SIGMA_MAX;
  if (c2 > 1e-6) cap = Math.min(cap, P.sigBreak1 / c2);
  if (s2 > 1e-6) cap = Math.min(cap, P.sigBreak2 / s2);
  return cap;
}

// Solve the hand spring: K_hand·(u_c − u_fabric(σ)) = σ, where the fabric
// displacement at the grab point is the strain along the pull times the
// lever from the pinned anchor to the grab point.
function solveLoad(P, uc_px, theta, leverMm) {
  if (uc_px <= 0) return { sigma: 0, broken: false };
  const Ln = leverMm * view.scale;   // px
  const cap = loadCap(P, theta);
  const gap = sig => K_HAND * (uc_px - strainAlong(elasticStrains(P, sig, theta), theta) * Ln) - sig;
  if (gap(cap) >= 0) return { sigma: cap, broken: cap < SIGMA_MAX };
  let lo = 0, hi = cap;
  for (let i = 0; i < 36; i++) { const m = 0.5 * (lo + hi); if (gap(m) > 0) lo = m; else hi = m; }
  return { sigma: 0.5 * (lo + hi), broken: false };
}

// ---------------------------------------------------------------- deformation map
// total strains -> 2x2 linear map M (material mm -> deformed mm), pull axis kept fixed
function buildMap(P, E, theta) {
  const c = Math.cos(theta), s = Math.sin(theta);
  // material-frame deformation: each yarn family stretched along itself and
  // rotated by γ/2 toward the other (the trellis), columns Fe1=(a,cc) Fe2=(b,dd)
  const ch = Math.cos(E.g / 2), sh = Math.sin(E.g / 2);
  const a = (1 + E.e1) * ch, cc = (1 + E.e1) * sh, b = (1 + E.e2) * sh, dd = (1 + E.e2) * ch;
  // lateral contraction from the axial part, applied perpendicular to the pull
  const axial = E.e1 * c * c + E.e2 * s * s;
  const eperp = -P.nu * axial;
  const px = -s, py = c;  // ⊥ unit
  // S = I + eperp (⊥⊗⊥)
  const S = [1 + eperp * px * px, eperp * px * py, eperp * px * py, 1 + eperp * py * py];
  const m = mul(S, [a, b, cc, dd]);
  // rotate so that M n ∥ n
  const nx = m[0] * c + m[1] * s, ny = m[2] * c + m[3] * s;
  const phi = Math.atan2(c * ny - s * nx, c * nx + s * ny);
  const R = [Math.cos(-phi), -Math.sin(-phi), Math.sin(-phi), Math.cos(-phi)];
  return mul(R, m);
}
function mul(A, B) { // row-major 2x2
  return [A[0] * B[0] + A[1] * B[2], A[0] * B[1] + A[1] * B[3], A[2] * B[0] + A[3] * B[2], A[2] * B[1] + A[3] * B[3]];
}
function apply(M, x, y) { return [M[0] * x + M[1] * y, M[2] * x + M[3] * y]; }

// Where the ray from the grab point, running against the pull, leaves the
// rest swatch: that is the pinned point. Continuous in θ, so a pull that
// swings round slides the pin along the edge rather than jumping it.
function anchorFor(P, Gm, theta) {
  const r = restDims(P);
  const dx = -Math.cos(theta), dy = -Math.sin(theta);
  let t = Infinity;
  if (dx > 1e-9) t = Math.min(t, (r.w / 2 - Gm[0]) / dx); else if (dx < -1e-9) t = Math.min(t, (-r.w / 2 - Gm[0]) / dx);
  if (dy > 1e-9) t = Math.min(t, (r.h / 2 - Gm[1]) / dy); else if (dy < -1e-9) t = Math.min(t, (-r.h / 2 - Gm[1]) / dy);
  if (!isFinite(t)) t = 0;
  return [Gm[0] + t * dx, Gm[1] + t * dy];
}
function clampToRest(P, pt) {
  const r = restDims(P);
  return [clamp(pt[0], -r.w / 2, r.w / 2), clamp(pt[1], -r.h / 2, r.h / 2)];
}
function invert(M) {
  const det = M[0] * M[3] - M[1] * M[2] || 1e-9;
  return [M[3] / det, -M[1] / det, -M[2] / det, M[0] / det];
}

function totalStrains() {
  return { e1: state.elastic.e1 + state.residual.e1, e2: state.elastic.e2 + state.residual.e2, g: state.elastic.g + state.residual.g };
}

// ---------------------------------------------------------------- recovery
function startRelease() {
  const P = state.P;
  const peak = totalStrains();
  state.release = {
    t0: performance.now(), peak,
    rImm: [P.rImmAx, P.rImmAx, P.rImmSh], rPerm: [P.rPermAx, P.rPermAx, P.rPermSh],
    tauE: reduceMotion ? 0.001 : P.tauE, tauC: 2.5,
    T0: state.T.slice(),
  };
  state.elastic = { e1: 0, e2: 0, g: 0 };
  state.sigma = 0;
  state.broken = false;
}
function stepRelease(now) {
  const r = state.release; if (!r) return;
  const t = (now - r.t0) / 1000;
  const keys = ['e1', 'e2', 'g'];
  let facAx = 1;
  keys.forEach((k, i) => {
    const el = (1 - r.rImm[i]) * (1 + t / r.tauE) * Math.exp(-t / r.tauE);   // critically damped snap
    const creep = (r.rImm[i] - r.rPerm[i]) * Math.exp(-t / r.tauC);
    const fac = r.rPerm[i] + creep + el;
    state.residual[k] = r.peak[k] * fac;
    if (i === 0) facAx = fac;
  });
  state.T = [r.T0[0] * facAx, r.T0[1] * facAx];
  if (t > 12) state.release = null;
}

// ---------------------------------------------------------------- view / canvas
const view = { canvas: null, ctx: null, w: 0, h: 0, dpr: 1, scale: 1, cx: 0, cy: 0 };
const inset = { canvas: null, ctx: null, w: 0, h: 0 };
const chart = { canvas: null, ctx: null, w: 0, h: 0 };

function fitCanvas(c, obj) {
  const rect = c.canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(rect.width)), h = Math.max(1, Math.round(rect.height));
  if (c.w !== w || c.h !== h || c.dpr !== dpr) {
    c.w = w; c.h = h; c.dpr = dpr;
    c.canvas.width = Math.round(w * dpr); c.canvas.height = Math.round(h * dpr);
  }
  c.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (obj === view) { view.scale = 0.38 * Math.min(w, h) / SWATCH_MM; view.cx = w / 2; view.cy = h / 2; }
}

// deformed-frame mm (x right, y up, origin = rest-swatch centre) -> screen px.
// The full map is x' = M(x − A) + A + T; state.off carries −M·A + A + T.
function toScreen(M, x, y) {
  const [dx, dy] = apply(M, x, y);
  return [view.cx + (dx + state.off[0]) * view.scale, view.cy - (dy + state.off[1]) * view.scale];
}

function yarnColor(yarnStrain, P) {
  const t = P.yarnMax > 0 ? yarnStrain / P.yarnMax : 0;
  const flip = clamp(yarnStrain / 0.01, 0, 1);              // teal -> rust over the first 1 % of yarn strain
  const glow = clamp(t, 0, 1);                              // then brighten toward the break
  return { body: mix(mix(TEAL, RUST, flip), [214, 132, 52], glow * 0.7), hi: mix(TEAL_BRIGHT, [242, 200, 140], flip) };
}

function strokePath(ctx, build, widthPx, col, bg) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); build();
  ctx.lineWidth = widthPx + 2.2; ctx.strokeStyle = bg; ctx.stroke();
  ctx.lineWidth = widthPx; ctx.strokeStyle = rgb(col.body); ctx.stroke();
  ctx.lineWidth = Math.max(0.6, widthPx * 0.32); ctx.strokeStyle = rgb(col.hi, 0.75); ctx.stroke();
}

function drawKnit(ctx, P, M, E, bg) {
  const W = P.W0 * Math.hypot(M[0], M[2]);
  const C = P.C0 * Math.hypot(M[1], M[3]);
  const L = solveLoop(Math.max(W, P.Wmin), Math.max(C, P.Cmin), P.len0, P.d);
  state.loop = L;
  // draw in the rectangular (W', C') frame, then map its axes onto M's
  const Md = [M[0] / Math.hypot(M[0], M[2]), M[1] / Math.hypot(M[1], M[3]), M[2] / Math.hypot(M[0], M[2]), M[3] / Math.hypot(M[1], M[3])];
  const width = P.nx * W, height = (P.ny - 1) * C + L.H;
  const ox = -width / 2, oy = -height / 2 + L.hs;
  const dpx = P.d / Math.sqrt(1 + L.yarnStrain) * view.scale;
  const col = yarnColor(L.yarnStrain, P);
  const pt = (x, y) => toScreen(Md, x, y);
  for (let i = 0; i < P.ny; i++) {
    const y0 = oy + i * C;
    strokePath(ctx, () => {
      let first = true;
      for (let j = 0; j < P.nx; j++) {
        const segs = loopSegments(L, ox + (j + 0.5) * W);
        for (const s of segs) {
          if (first) { const p = pt(s[0][0], s[0][1] + y0); ctx.moveTo(p[0], p[1]); first = false; }
          const p1 = pt(s[1][0], s[1][1] + y0), p2 = pt(s[2][0], s[2][1] + y0), p3 = pt(s[3][0], s[3][1] + y0);
          ctx.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);
        }
      }
    }, dpx, col, bg);
  }
  return { M: Md, width, height, yarnStrain: L.yarnStrain };
}

function drawWoven(ctx, P, M, E, bg) {
  const pw = P.p * Math.hypot(M[0], M[2]);   // warp spacing (along x)
  const pf = P.p * Math.hypot(M[1], M[3]);   // weft spacing (along y)
  const Md = [M[0] / Math.hypot(M[0], M[2]), M[1] / Math.hypot(M[1], M[3]), M[2] / Math.hypot(M[0], M[2]), M[3] / Math.hypot(M[1], M[3])];
  const n = P.n, width = n * pw, height = n * pf;
  const ox = -width / 2, oy = -height / 2;
  const ys1 = yarnStrainAt(P.tab1, Math.max(0, E.e1)), ys2 = yarnStrainAt(P.tab2, Math.max(0, E.e2));
  const colW = yarnColor(ys2, P), colF = yarnColor(ys1, P);   // warp carries axis-2 strain, weft axis-1
  const dW = P.d / Math.sqrt(1 + ys2) * view.scale, dF = P.d / Math.sqrt(1 + ys1) * view.scale;
  const pt = (x, y) => toScreen(Md, x, y);
  // warps (vertical, along axis 2)
  for (let j = 0; j < n; j++) {
    const x = ox + (j + 0.5) * pw;
    strokePath(ctx, () => { const a = pt(x, oy - pf * 0.5), b = pt(x, oy + height + pf * 0.5); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }, dW, colW, bg);
  }
  // wefts (horizontal, along axis 1)
  for (let i = 0; i < n; i++) {
    const y = oy + (i + 0.5) * pf;
    strokePath(ctx, () => { const a = pt(ox - pw * 0.5, y), b = pt(ox + width + pw * 0.5, y); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }, dF, colF, bg);
  }
  // warp-over crossings: redraw a short warp segment over the weft
  const u = apply(Md, 0, 1); const ul = Math.hypot(u[0], u[1]); const ux = u[0] / ul, uy = -u[1] / ul;
  const v = apply(Md, 1, 0); const vl = Math.hypot(v[0], v[1]);
  const sinA = Math.abs((u[0] * v[1] - u[1] * v[0]) / (ul * vl)) || 1;
  const half = (dF / 2) / sinA + 1.6;
  // one path for every patch (they never overlap), three strokes in total
  ctx.lineCap = 'butt';
  ctx.beginPath();
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if ((i + j) % 2) continue;
    const c = pt(ox + (j + 0.5) * pw, oy + (i + 0.5) * pf);
    ctx.moveTo(c[0] - ux * half, c[1] - uy * half); ctx.lineTo(c[0] + ux * half, c[1] + uy * half);
  }
  ctx.lineWidth = dW + 2.2; ctx.strokeStyle = bg; ctx.stroke();
  ctx.lineWidth = dW; ctx.strokeStyle = rgb(colW.body); ctx.stroke();
  ctx.lineWidth = Math.max(0.6, dW * 0.32); ctx.strokeStyle = rgb(colW.hi, 0.75); ctx.stroke();
  state.woven = { ys1, ys2, sinA, shear: Math.acos(clamp(sinA, 0, 1)) };
  return { M: Md, width, height, yarnStrain: Math.max(ys1, ys2) };
}

function drawGrid(ctx, w, h) {
  ctx.fillStyle = css('--black-raised'); ctx.fillRect(0, 0, w, h);
  const step = view.scale; // 1 mm
  ctx.fillStyle = 'rgba(139,148,148,0.16)';
  const x0 = view.cx % step, y0 = view.cy % step;
  for (let x = x0; x < w; x += step) for (let y = y0; y < h; y += step) ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
}

function drawOutlines(ctx, P, M, draw) {
  const line = css('--line-strong');
  // rest ghost
  const r = restDims(P);
  ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(139,148,148,0.55)'; ctx.lineWidth = 1;
  ctx.strokeRect(view.cx - r.w * view.scale / 2, view.cy - r.h * view.scale / 2, r.w * view.scale, r.h * view.scale);
  ctx.setLineDash([]);
  // deformed outline
  const cs = [[-draw.width / 2, -draw.height / 2], [draw.width / 2, -draw.height / 2], [draw.width / 2, draw.height / 2], [-draw.width / 2, draw.height / 2]].map(p => toScreen(draw.M, p[0], p[1]));
  ctx.beginPath(); cs.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
  ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.stroke();
  // the pin
  if (state.drag || state.release) {
    const A = state.anchor;
    const px = view.cx + (A[0] + state.T[0]) * view.scale, py = view.cy - (A[1] + state.T[1]) * view.scale;
    ctx.strokeStyle = css('--ink-dim'); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px - 7, py); ctx.lineTo(px + 7, py); ctx.moveTo(px, py - 7); ctx.lineTo(px, py + 7); ctx.stroke();
  }
  // scale bar — 5 mm at rest
  const bx = 18, by = view.h - 18;
  ctx.strokeStyle = css('--ink-dim'); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 5 * view.scale, by); ctx.moveTo(bx, by - 4); ctx.lineTo(bx, by + 4); ctx.moveTo(bx + 5 * view.scale, by - 4); ctx.lineTo(bx + 5 * view.scale, by + 4); ctx.stroke();
  ctx.fillStyle = css('--ink-dim'); ctx.font = '10px ' + css('--mono'); ctx.textBaseline = 'bottom'; ctx.textAlign = 'left';
  ctx.fillText('5 mm', bx, by - 6);
}

function drawPull(ctx, P, draw, M) {
  const d = state.drag; if (!d) return;
  // the grabbed material point, where the fabric has carried it
  const g = apply(M, d.Gm[0], d.Gm[1]);
  const ex = view.cx + (g[0] + state.off[0]) * view.scale, ey = view.cy - (g[1] + state.off[1]) * view.scale;
  const qx = d.Q.x, qy = d.Q.y;
  const accent = css('--petrol-bright');
  const A = state.anchor;
  const ax = view.cx + (A[0] + state.T[0]) * view.scale, ay = view.cy - (A[1] + state.T[1]) * view.scale;
  ctx.setLineDash([2, 3]); ctx.strokeStyle = 'rgba(47,163,163,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
  const ink = state.broken ? rgb([232, 176, 110]) : css('--ink');
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(qx, qy); ctx.strokeStyle = css('--black'); ctx.lineWidth = 4; ctx.stroke();
  ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(qx, qy, 5, 0, Math.PI * 2); ctx.fillStyle = css('--black'); ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI * 2); ctx.fillStyle = ink; ctx.fill();
  // label
  ctx.font = '11px ' + css('--mono'); ctx.textBaseline = 'middle';
  const label = state.sigma.toFixed(1) + ' N';
  ctx.textAlign = qx > view.cx ? 'left' : 'right';
  const lx = qx + (qx > view.cx ? 12 : -12);
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = css('--black'); ctx.fillRect(qx > view.cx ? lx - 3 : lx - tw - 3, qy - 8, tw + 6, 16);
  ctx.fillStyle = css('--ink'); ctx.fillText(label, lx, qy);
}

function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888'; }

// ---------------------------------------------------------------- inset (mechanism)
function drawInset(P, E, draw) {
  const ctx = inset.ctx, w = inset.w, h = inset.h;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = css('--black-raised'); ctx.fillRect(0, 0, w, h);
  const bg = css('--black-raised');
  const mono = css('--mono');
  ctx.font = '10px ' + mono; ctx.fillStyle = css('--ink-dim'); ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  if (P.fabric === 'knit') {
    const L = state.loop; if (!L) return;
    if (L.C_draw === undefined) L.C_draw = P.C0;
    ro.insetTitle.textContent = 'One loop · yarn length ' + L.len.toFixed(2) + ' mm' + (L.jammed ? ' (+' + fmtPct(L.yarnStrain, 1) + ' yarn strain)' : ' (conserved)');
    const sc = Math.min((w - 70) / (L.W * 1.1), (h - 34) / (L.H * 1.02));
    const cx = w / 2 - 10, cy = h / 2 - 9 + (L.H / 2 - L.hs) * sc;
    const col = yarnColor(L.yarnStrain, P);
    const segs = loopSegments(L, 0);
    const pt = (x, y) => [cx + x * sc, cy - y * sc];
    // faint neighbours: course above (legs through the head) and the sinker of the course below
    ctx.globalAlpha = 0.28;
    strokePath(ctx, () => { let f = true; for (const s of loopSegments(L, 0)) { const p0 = pt(s[0][0], s[0][1] + L.C_draw); if (f) { ctx.moveTo(p0[0], p0[1]); f = false; } const a = pt(s[1][0], s[1][1] + L.C_draw), b = pt(s[2][0], s[2][1] + L.C_draw), c = pt(s[3][0], s[3][1] + L.C_draw); ctx.bezierCurveTo(a[0], a[1], b[0], b[1], c[0], c[1]); } }, P.d * sc, col, bg);
    ctx.globalAlpha = 1;
    strokePath(ctx, () => { let f = true; for (const s of segs) { const p0 = pt(s[0][0], s[0][1]); if (f) { ctx.moveTo(p0[0], p0[1]); f = false; } const a = pt(s[1][0], s[1][1]), b = pt(s[2][0], s[2][1]), c = pt(s[3][0], s[3][1]); ctx.bezierCurveTo(a[0], a[1], b[0], b[1], c[0], c[1]); } }, P.d * sc, col, bg);
    // dimension lines
    ctx.strokeStyle = css('--ink-faint'); ctx.fillStyle = css('--ink-dim'); ctx.lineWidth = 1; ctx.font = '10px ' + mono;
    const yb = cy + L.hs * sc + 12;
    ctx.beginPath(); ctx.moveTo(cx - L.W / 2 * sc, yb); ctx.lineTo(cx + L.W / 2 * sc, yb); ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('W ' + L.W.toFixed(2) + ' mm', cx, yb + 3);
    const xr = cx + L.W / 2 * sc + 10;
    ctx.beginPath(); ctx.moveTo(xr, cy + L.hs * sc); ctx.lineTo(xr, cy - (L.H - L.hs) * sc); ctx.stroke();
    ctx.save(); ctx.translate(xr + 4, cy - (L.H / 2 - L.hs) * sc); ctx.rotate(-Math.PI / 2); ctx.textBaseline = 'bottom'; ctx.fillText('H ' + L.H.toFixed(2), 0, 0); ctx.restore();
  } else {
    const wv = state.woven || { ys1: 0, ys2: 0, shear: 0 };
    const offGrain = Math.abs(Math.sin(2 * state.theta));
    if (offGrain > 0.5 && Math.abs(E.g) > 0.02) {
      // trellis: one crossing, yarn angle and the lock
      const ang = Math.PI / 2 - Math.abs(E.g);
      ro.insetTitle.textContent = 'Trellis · yarn angle ' + (ang * 180 / Math.PI).toFixed(0) + '° · locks at ' + ((Math.PI / 2 - P.gLock) * 180 / Math.PI).toFixed(0) + '°';
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.42;
      const bis = Math.PI / 4 + (state.theta > 0 ? 0 : Math.PI / 2);
      const a1 = bis - ang / 2, a2 = bis + ang / 2;
      const col = yarnColor(Math.max(wv.ys1, wv.ys2), P);
      const dpx = Math.max(4, P.d * R / P.p * 0.9);
      for (const a of [a1, a2]) {
        strokePath(ctx, () => { ctx.moveTo(cx - Math.cos(a) * R, cy + Math.sin(a) * R); ctx.lineTo(cx + Math.cos(a) * R, cy - Math.sin(a) * R); }, dpx, col, bg);
      }
      ctx.strokeStyle = css('--petrol-bright'); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R * 0.5, -a2, -a1); ctx.stroke();
      ctx.strokeStyle = 'rgba(165,107,46,0.8)'; ctx.setLineDash([2, 3]); ctx.beginPath();
      const lockAng = Math.PI / 2 - P.gLock; ctx.arc(cx, cy, R * 0.62, -(bis + lockAng / 2), -(bis - lockAng / 2)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = css('--ink-dim'); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText('lock', cx + Math.cos(bis) * R * 0.66 + 4, cy - Math.sin(bis) * R * 0.66);
    } else {
      // crimp section along the pulled yarn
      const alongWeft = Math.abs(Math.cos(state.theta)) >= Math.abs(Math.sin(state.theta));
      const eAx = alongWeft ? Math.max(0, E.e1) : Math.max(0, E.e2);
      const eLat = alongWeft ? E.e2 : E.e1;
      const ys = alongWeft ? wv.ys1 : wv.ys2;
      const crimpNow = Math.max(0, P.crimp - eAx);
      ro.insetTitle.textContent = 'Section · ' + (alongWeft ? 'weft' : 'warp') + ' crimp ' + fmtPct(P.crimp, 1) + ' → ' + fmtPct(crimpNow, 1) + (ys > 0.001 ? ' · yarn +' + fmtPct(ys, 1) : '');
      const nCross = 7;
      const spacing = Math.min((w - 40) / nCross, 44) * (1 + eAx);
      const rr = Math.min(spacing * 0.28, 11);
      const amp0 = rr * 1.05;                       // rest amplitude of the pulled yarn's undulation
      const amp = amp0 * (crimpNow / P.crimp);      // straightens as crimp is used up
      const cx0 = (w - spacing * (nCross - 1)) / 2, cy = h / 2;
      const col = yarnColor(ys, P);
      const colX = yarnColor(alongWeft ? wv.ys2 : wv.ys1, P);
      // cross yarns as circles; as the pulled yarn straightens they are pushed out of plane
      for (let i = 0; i < nCross; i++) {
        const sgn = i % 2 ? 1 : -1;
        const off = sgn * (amp0 - amp);
        ctx.beginPath(); ctx.arc(cx0 + i * spacing, cy + off, rr, 0, Math.PI * 2);
        ctx.fillStyle = rgb(colX.body); ctx.fill(); ctx.strokeStyle = bg; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx0 + i * spacing - rr * 0.3, cy + off - rr * 0.3, rr * 0.35, 0, Math.PI * 2); ctx.fillStyle = rgb(colX.hi, 0.5); ctx.fill();
      }
      // the pulled yarn: over one cross yarn, under the next — a cosine through the row
      const dpx = rr * 1.5 / Math.sqrt(1 + ys);
      strokePath(ctx, () => {
        const x0 = cx0 - spacing * 0.8, x1 = cx0 + (nCross - 1) * spacing + spacing * 0.8;
        for (let x = x0; x <= x1; x += 2) {
          const y = cy - Math.cos((x - cx0) / spacing * Math.PI) * amp;
          if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
      }, dpx, col, bg);
    }
  }
}

// ---------------------------------------------------------------- chart (load–extension)
function drawChart(P) {
  const ctx = chart.ctx, w = chart.w, h = chart.h;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = css('--black-raised'); ctx.fillRect(0, 0, w, h);
  const mono = css('--mono');
  const padL = 34, padR = 12, padT = 12, padB = 24;
  const X0 = padL, X1 = w - padR, Y0 = h - padB, Y1 = padT;
  const xmax = 1.5, ymax = 35;
  const sx = e => X0 + (X1 - X0) * clamp(e / xmax, 0, 1);
  const sy = f => Y0 - (Y0 - Y1) * clamp(f / ymax, 0, 1);
  // grid
  ctx.strokeStyle = 'rgba(139,148,148,0.18)'; ctx.lineWidth = 1;
  for (let e = 0; e <= xmax + 1e-9; e += 0.5) { ctx.beginPath(); ctx.moveTo(sx(e) + 0.5, Y0); ctx.lineTo(sx(e) + 0.5, Y1); ctx.stroke(); }
  for (let f = 0; f <= ymax; f += 10) { ctx.beginPath(); ctx.moveTo(X0, sy(f) + 0.5); ctx.lineTo(X1, sy(f) + 0.5); ctx.stroke(); }
  ctx.fillStyle = css('--ink-faint'); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let e = 0; e <= xmax + 1e-9; e += 0.5) ctx.fillText((e * 100).toFixed(0) + '%', sx(e), Y0 + 6);
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let f = 0; f <= ymax; f += 10) ctx.fillText(f + '', X0 - 5, sy(f));
  ctx.save(); ctx.translate(9, (Y0 + Y1) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('N', 0, 0); ctx.restore();
  // curve
  const cap = loadCap(P, state.theta);
  const pts = [];
  const N = 90;
  for (let i = 0; i <= N; i++) {
    const sig = cap * i / N;
    const E = elasticStrains(P, sig, state.theta);
    const ys = Math.max(yarnStrainAt(P.tab1, E.e1) * Math.cos(state.theta) ** 2, yarnStrainAt(P.tab2, E.e2) * Math.sin(state.theta) ** 2);
    pts.push({ e: strainAlong(E, state.theta), f: sig, ys });
  }
  ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (a.f > ymax && b.f > ymax) break;
    ctx.beginPath(); ctx.moveTo(sx(a.e), sy(a.f)); ctx.lineTo(sx(b.e), sy(b.f));
    ctx.strokeStyle = rgb(mix(TEAL_BRIGHT, RUST, b.ys > 0.002 ? 1 : 0)); ctx.stroke();
  }
  if (cap < SIGMA_MAX && cap <= ymax) {
    const last = pts[pts.length - 1];
    ctx.fillStyle = rgb(RUST); ctx.beginPath(); ctx.arc(sx(last.e), sy(last.f), 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = css('--ink-dim'); ctx.textAlign = last.e > 0.9 ? 'right' : 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText('yarn break', sx(last.e) + (last.e > 0.9 ? -6 : 6), sy(last.f) - 4);
  }
  // current point
  const eNow = strainAlong(state.elastic, state.theta);
  if (state.sigma > 0) {
    ctx.beginPath(); ctx.arc(sx(eNow), sy(state.sigma), 4.5, 0, Math.PI * 2);
    ctx.fillStyle = css('--black-raised'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = css('--ink'); ctx.stroke();
  }
}

// ---------------------------------------------------------------- readouts
const ro = {};
function updateReadouts(P, E, draw) {
  const theta = state.theta;
  const eN = strainAlong(totalStrains(), theta);
  const axial = E.e1 * Math.cos(theta) ** 2 + E.e2 * Math.sin(theta) ** 2;
  const lat = -P.nu * axial - (Math.abs(E.g) > 0 ? Math.abs(E.g) * Math.abs(Math.sin(theta) * Math.cos(theta)) : 0);
  const deg = Math.abs(((theta * 180 / Math.PI) % 180 + 180) % 180);
  const off = deg > 90 ? 180 - deg : deg;
  const axisName = P.fabric === 'knit' ? ['course', 'wale'] : ['weft', 'warp'];
  let dirText;
  if (off < 8) dirText = 'along the ' + axisName[0] + ' direction';
  else if (off > 82) dirText = 'along the ' + axisName[1] + ' direction';
  else if (off > 35 && off < 55) dirText = 'on the bias (' + off.toFixed(0) + '° off ' + axisName[0] + ')';
  else dirText = off.toFixed(0) + '° off the ' + axisName[0] + ' direction';
  ro.load.textContent = state.sigma.toFixed(1) + ' N';
  ro.ext.textContent = (eN >= 0 ? '+' : '') + fmtPct(eN);
  ro.lat.textContent = fmtPct(lat);
  ro.dir.textContent = dirText;
  const cap = loadCap(P, theta);
  if (cap < SIGMA_MAX) {
    const eCap = strainAlong(elasticStrains(P, cap, theta), theta);
    ro.cap.textContent = '+' + fmtPct(eCap);
    ro.capN.textContent = 'yarn breaks at ' + cap.toFixed(0) + ' N';
  } else { ro.cap.textContent = '\u2014'; ro.capN.textContent = 'grip slips first (60 N)'; }
  // regime
  let regime, yarnStrain = draw.yarnStrain;
  if (P.fabric === 'knit') {
    const L = state.loop;
    if (state.sigma <= 0 && !state.release) regime = 'at rest';
    else if (state.sigma <= 0) regime = 'recovering';
    else if (!L.jammed) regime = 'loops rearranging — yarn slack, length conserved';
    else regime = 'loops jammed — the yarn itself is stretching';
  } else {
    const shear = Math.abs(E.g);
    if (state.sigma <= 0 && !state.release) regime = 'at rest';
    else if (state.sigma <= 0) regime = 'recovering';
    else if (shear > 0.25 * Math.max(0.05, axial + shear)) regime = shear >= P.gLock ? 'trellis locked — yarns jammed against each other' : 'trellis shear — yarns rotating about their crossings';
    else if (yarnStrain > 0.002) regime = 'crimp gone — the yarn itself is stretching';
    else regime = 'crimp interchange — the pulled yarns are straightening';
  }
  if (state.broken) regime = 'YARN AT BREAK ELONGATION — the grip is slipping, not the fabric';
  ro.regime.textContent = regime;
  ro.regime.classList.toggle('is-warn', state.broken);
  const yPct = clamp(yarnStrain / P.yarnMax, 0, 1);
  ro.yarnBar.style.width = (yPct * 100).toFixed(1) + '%';
  ro.yarnBar.classList.toggle('is-warn', yPct > 0.85);
  ro.yarn.textContent = fmtPct(yarnStrain, 1) + ' of ' + fmtPct(P.yarnMax, 0) + ' break';
  ro.recovery.textContent = 'snaps back ' + fmtPct(1 - P.rImmAx) + ' · permanent set ' + fmtPct(P.rPermAx) + ' of the stretch';
  if (P.fabric === 'knit') {
    ro.structure.textContent = state.density.toFixed(1) + ' wales/cm · ' + (10 / P.C0).toFixed(1) + ' courses/cm · loop length ' + P.len0.toFixed(2) + ' mm';
  } else {
    ro.structure.textContent = state.density.toFixed(0) + ' ends & picks/cm · cover ' + fmtPct(P.cover) + ' · crimp ' + fmtPct(P.crimp, 1) + ' · lock ' + ((Math.PI / 2 - P.gLock) * 180 / Math.PI).toFixed(0) + '°';
  }
}

// ---------------------------------------------------------------- frame
function frame(now) {
  const P = state.P;
  fitCanvas(view, view); fitCanvas(inset); fitCanvas(chart);
  if (state.release) stepRelease(now);
  if (state.drag) {
    const d = state.drag;
    const dx = d.Q.x - d.G.x, dy = -(d.Q.y - d.G.y);
    const dist = Math.hypot(dx, dy);
    if (dist > 6) {
      const target = Math.atan2(dy, dx);
      let diff = target - state.theta; while (diff > Math.PI) diff -= 2 * Math.PI; while (diff < -Math.PI) diff += 2 * Math.PI;
      state.theta += diff * (d.virtual ? 1 : 0.35);
    }
    const c = Math.cos(state.theta), s = Math.sin(state.theta);
    d.uc = dx * c + dy * s;
    state.anchor = anchorFor(P, d.Gm, state.theta);
    const lever = Math.max(0.3 * pullExtent(P, state.theta), Math.hypot(d.Gm[0] - state.anchor[0], d.Gm[1] - state.anchor[1]));
    const sol = solveLoad(P, d.uc, state.theta, lever);
    state.sigma = sol.sigma; state.broken = sol.broken;
    state.elastic = elasticStrains(P, state.sigma, state.theta);
  }
  const E = totalStrains();
  const M = buildMap(P, E, state.theta);
  const MA = apply(M, state.anchor[0], state.anchor[1]);
  state.off = [state.anchor[0] + state.T[0] - MA[0], state.anchor[1] + state.T[1] - MA[1]];
  state.M = M;
  const ctx = view.ctx;
  drawGrid(ctx, view.w, view.h);
  const bg = css('--black-raised');
  const draw = P.fabric === 'knit' ? drawKnit(ctx, P, M, E, bg) : drawWoven(ctx, P, M, E, bg);
  if (state.loop) state.loop.C_draw = P.C0 * Math.hypot(M[1], M[3]);
  drawOutlines(ctx, P, M, draw);
  drawPull(ctx, P, draw, M);
  drawInset(P, E, draw);
  drawChart(P);
  updateReadouts(P, E, draw);
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- input
function canvasPoint(ev) {
  const r = view.canvas.getBoundingClientRect();
  return { x: ev.clientX - r.left, y: ev.clientY - r.top };
}
function beginDrag(pt, virtual) {
  const P = state.P;
  state.release = null;
  // the grabbed point, back in rest-material mm through the current map
  const M = state.M || [1, 0, 0, 1];
  const sm = [(pt.x - view.cx) / view.scale - state.off[0], -(pt.y - view.cy) / view.scale - state.off[1]];
  const Gm = clampToRest(P, apply(invert(M), sm[0], sm[1]));
  // re-pin without moving anything: keep off unchanged for the new anchor
  const A = anchorFor(P, Gm, state.theta);
  const MA = apply(M, A[0], A[1]);
  state.T = [state.off[0] + MA[0] - A[0], state.off[1] + MA[1] - A[1]];
  state.anchor = A;
  state.drag = { G: pt, Q: { ...pt }, Gm, uc: 0, virtual: !!virtual };
  document.body.classList.add('is-pulling');
}
function endDrag() {
  if (!state.drag) return;
  state.drag = null;
  document.body.classList.remove('is-pulling');
  startRelease();
}

function bindPointer() {
  const c = view.canvas;
  c.addEventListener('pointerdown', ev => {
    if (ev.button !== undefined && ev.button !== 0) return;
    ev.preventDefault();
    c.setPointerCapture(ev.pointerId);
    beginDrag(canvasPoint(ev), false);
  });
  c.addEventListener('pointermove', ev => {
    if (!state.drag || state.drag.virtual) return;
    state.drag.Q = canvasPoint(ev);
  });
  const up = ev => { if (state.drag && !state.drag.virtual) endDrag(); };
  c.addEventListener('pointerup', up);
  c.addEventListener('pointercancel', up);
  c.addEventListener('lostpointercapture', up);
}

// Press-and-hold pull buttons: a virtual drag that ramps up while held.
function bindPullButtons() {
  document.querySelectorAll('[data-pull]').forEach(btn => {
    const angle = parseFloat(btn.dataset.pull) * Math.PI / 180;
    let raf = null, t0 = 0;
    const start = () => {
      if (state.drag) return;
      const G = { x: view.cx, y: view.cy };
      state.theta = angle;
      beginDrag(G, true);
      t0 = performance.now();
      const tick = now => {
        if (!state.drag || !state.drag.virtual) return;
        const dist = Math.min(0.42 * Math.min(view.w, view.h), (now - t0) * 0.12);
        state.drag.Q = { x: G.x + Math.cos(angle) * dist, y: G.y - Math.sin(angle) * dist };
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      btn.classList.add('is-active');
    };
    const stop = () => { if (raf) cancelAnimationFrame(raf); raf = null; btn.classList.remove('is-active'); if (state.drag && state.drag.virtual) endDrag(); };
    btn.addEventListener('pointerdown', ev => { ev.preventDefault(); btn.setPointerCapture(ev.pointerId); start(); });
    btn.addEventListener('pointerup', stop);
    btn.addEventListener('pointercancel', stop);
    btn.addEventListener('lostpointercapture', stop);
    btn.addEventListener('keydown', ev => { if ((ev.key === ' ' || ev.key === 'Enter') && !ev.repeat) { ev.preventDefault(); start(); } });
    btn.addEventListener('keyup', ev => { if (ev.key === ' ' || ev.key === 'Enter') stop(); });
    btn.addEventListener('blur', stop);
  });
}

function bindControls() {
  const fabricBtns = document.querySelectorAll('[data-fabric]');
  fabricBtns.forEach(b => b.addEventListener('click', () => { setFabric(b.dataset.fabric); }));
  const sp = document.getElementById('ctlSpandex');
  const de = document.getElementById('ctlDensity');
  const el = document.getElementById('ctlElastic');
  sp.addEventListener('input', () => { state.spandex = parseFloat(sp.value); onParamChange(); });
  de.addEventListener('input', () => { state.density = parseFloat(de.value); onParamChange(); });
  el.addEventListener('input', () => { state.elasticity = parseFloat(el.value) / 100; onParamChange(); });
  document.getElementById('ctlReset').addEventListener('click', relax);
  document.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => applyPreset(b.dataset.preset)));
}

function setFabric(f) {
  if (state.fabric === f) return;
  state.fabric = f;
  const de = document.getElementById('ctlDensity');
  if (f === 'knit') { de.min = 3.5; de.max = 8; de.step = 0.1; state.density = clamp(state.density, 3.5, 8); if (state.density > 8) state.density = 6; }
  else { de.min = 10; de.max = 26; de.step = 1; if (state.density < 10) state.density = 18; }
  de.value = state.density;
  relax();
  onParamChange();
}
function relax() {
  state.residual = { e1: 0, e2: 0, g: 0 }; state.elastic = { e1: 0, e2: 0, g: 0 };
  state.release = null; state.sigma = 0; state.broken = false;
  state.T = [0, 0]; state.off = [0, 0]; state.anchor = [0, 0];
  document.querySelectorAll('[data-preset]').forEach(b => b.classList.remove('is-active'));
}
function onParamChange() {
  deriveParams();
  syncLabels();
  // keep any current load consistent with the new material
  if (state.drag) state.elastic = elasticStrains(state.P, state.sigma, state.theta);
}
function syncLabels() {
  const P = state.P;
  document.querySelectorAll('[data-fabric]').forEach(b => { const on = b.dataset.fabric === state.fabric; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  document.getElementById('valSpandex').textContent = state.spandex.toFixed(0) + '%';
  document.getElementById('valDensity').textContent = state.fabric === 'knit' ? state.density.toFixed(1) + ' wales/cm' : state.density.toFixed(0) + ' threads/cm';
  document.getElementById('lblDensity').textContent = state.fabric === 'knit' ? 'Stitch density' : 'Thread density';
  const e = state.elasticity;
  document.getElementById('valElastic').textContent = (e * 100).toFixed(0) + ' · ' + (e < 0.25 ? 'rigid (cotton, linen)' : e < 0.55 ? 'moderate (polyester, silk)' : e < 0.8 ? 'springy (wool)' : 'elastic (textured nylon)');
  document.getElementById('ctlSpandex').value = state.spandex;
  document.getElementById('ctlDensity').value = state.density;
  document.getElementById('ctlElastic').value = Math.round(e * 100);
  document.querySelectorAll('.sim-axis').forEach(el => { el.textContent = el.dataset[state.fabric]; });
}
function applyPreset(name) {
  const p = PRESETS[name]; if (!p) return;
  state.fabric = p.fabric;
  const de = document.getElementById('ctlDensity');
  if (p.fabric === 'knit') { de.min = 3.5; de.max = 8; de.step = 0.1; } else { de.min = 10; de.max = 26; de.step = 1; }
  state.spandex = p.spandex; state.density = p.density; state.elasticity = p.elasticity;
  relax();
  onParamChange();
  document.querySelectorAll('[data-preset]').forEach(b => b.classList.toggle('is-active', b.dataset.preset === name));
}

// ---------------------------------------------------------------- boot
function init() {
  view.canvas = document.getElementById('swatchCanvas'); view.ctx = view.canvas.getContext('2d');
  inset.canvas = document.getElementById('insetCanvas'); inset.ctx = inset.canvas.getContext('2d');
  chart.canvas = document.getElementById('chartCanvas'); chart.ctx = chart.canvas.getContext('2d');
  ['load', 'ext', 'lat', 'cap', 'capN', 'dir', 'regime', 'yarn', 'yarnBar', 'recovery', 'structure', 'insetTitle'].forEach(k => { ro[k] = document.getElementById('ro-' + k); });
  bindControls(); bindPointer(); bindPullButtons();
  applyPreset('cotton-jersey');
  requestAnimationFrame(frame);
  // test hook — read-only view of the model for tools/verify-stretch-sim.mjs
  window.__stretchSim = {
    get state() { return state; },
    solveLoop, loopLength, elasticStrains, strainAlong, loadCap, deriveParams,
    pull(thetaDeg, px) {
      const G = { x: view.cx, y: view.cy };
      state.theta = thetaDeg * Math.PI / 180;
      beginDrag(G, true);
      state.drag.Q = { x: G.x + Math.cos(state.theta) * px, y: G.y - Math.sin(state.theta) * px };
    },
    release() { endDrag(); },
    relax, applyPreset, setFabric,
    setParams(o) { Object.assign(state, o); onParamChange(); },
  };
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
