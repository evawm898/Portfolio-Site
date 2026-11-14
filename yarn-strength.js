/* ---------------------------------------------------
   yarn-strength.js — Yarn Characterization §04 (Strength).
   Pure (no DOM): the gate imports it in Node, yarn-strength-ui.js
   draws it.

   UNITS. Tenacity is breaking force per linear density, so yarns of
   different counts compare. The three common forms:
       cN/dtex,  cN/tex (= 10 × cN/dtex),  gf/den
   1 gf = 0.980665 cN (standard gravity) and 1 den = 1/9 tex, so
       1 gf/den = 9 × 0.980665 cN/tex = 0.8826 cN/dtex.
   And because N/tex is force per (mass per length), multiplying by
   the fibre's density gives an ordinary stress:
       stress (GPa) = tenacity (N/tex) × density (g/cm³).

   CURVES. The stress–strain curves are ILLUSTRATIVE: one smooth law
   per preset, tuned so the curve starts at the stated relative
   stiffness, bends at a yield knee, and ends exactly at the preset's
   breaking tenacity and elongation (typical mid-range values). They
   show shapes and directions, not any one yarn's test.

       σ(ε) = M·ε0·(1 − e^(−ε/ε0)) + k·ε^p,   σ(Eb) = Tb
--------------------------------------------------- */
import { relativeStrength } from './yarn-twist.js';

export const G_N = 9.80665;                         // m/s², standard gravity
export const GF_CN = G_N / 10;                      // 1 gf in cN = 0.980665
export const GPD_PER_CNDTEX = 1 / (9 * GF_CN / 10); // g/den per cN/dtex ≈ 1.133

export const gpdToCnDtex = g => g * 9 * GF_CN / 10;
export const cnDtexToGpd = c => c / (9 * GF_CN / 10);
export const cnDtexToCnTex = c => c * 10;
/** Stress in GPa from tenacity (cN/dtex) and fibre density (g/cm³). */
export const cnDtexToGpa = (c, density) => (c / 10) * density;   // cN/dtex → N/tex, × ρ

/* ---------- typical ranges (fibres and filament yarns) ----------
   Rounded mid-ranges from Morton & Hearle, Physical Properties of
   Textile Fibres; individual products sit anywhere in or past them. */
export const TYPICAL = [
  { name: 'Cotton (fibre)',          ten: [2.6, 4.3],  elong: [6, 10],     density: 1.52 },
  { name: 'Wool (fibre)',            ten: [0.9, 1.5],  elong: [25, 35],    density: 1.31 },
  { name: 'Viscose, regular',        ten: [1.8, 2.6],  elong: [15, 30],    density: 1.51 },
  { name: 'Silk',                    ten: [3.5, 4.5],  elong: [15, 25],    density: 1.34 },
  { name: 'Polyester, textile',      ten: [3.5, 5.0],  elong: [20, 40],    density: 1.38 },
  { name: 'Polyester, high-tenacity',ten: [6.5, 8.5],  elong: [8, 15],     density: 1.38 },
  { name: 'Nylon 6,6, textile',      ten: [4.0, 5.5],  elong: [25, 40],    density: 1.14 },
  { name: 'Nylon 6,6, high-tenacity',ten: [6.5, 8.5],  elong: [15, 25],    density: 1.14 },
  { name: 'Elastane',                ten: [0.5, 1.0],  elong: [400, 700],  density: 1.21 },
  { name: 'Para-aramid',             ten: [18, 22],    elong: [3, 4],      density: 1.44 },
  { name: 'UHMW polyethylene',       ten: [28, 40],    elong: [3, 4],      density: 0.97 }
];

/* ---------- presets for the curve explorer ----------
   Tb cN/dtex, Eb strain (fraction), stiff = relative initial
   modulus (1 = textile polyester), e0 yield-knee strain, p hardening. */
export const PRESETS = {
  'pet':      { label: 'Polyester FDY, textile',      Tb: 4.2, Eb: 0.30, stiff: 1.0,  e0: 0.025, p: 2.2, synthetic: true },
  'pet-ht':   { label: 'Polyester, high-tenacity',    Tb: 7.5, Eb: 0.12, stiff: 1.6,  e0: 0.02,  p: 2.0, synthetic: true },
  'pa66':     { label: 'Nylon 6,6, textile',          Tb: 4.6, Eb: 0.34, stiff: 0.55, e0: 0.03,  p: 1.8, synthetic: true },
  'cotton':   { label: 'Cotton, ring-spun yarn',      Tb: 1.6, Eb: 0.065, stiff: 0.6, e0: 0.02,  p: 1.4, spun: true },
  'elastane': { label: 'Elastane',                    Tb: 0.8, Eb: 5.5,  stiff: 0.003, e0: 0.5,  p: 3.0 }
};
const M_REF = 70;    // cN/dtex per unit strain for stiff = 1: sets the curves' scale only

/* ---------- levers ---------- */
export const DRAW = {
  lower:    { label: 'lower',    Tb: 0.78, Eb: 1.6,  stiff: 0.7 },
  standard: { label: 'standard', Tb: 1,    Eb: 1,    stiff: 1 },
  higher:   { label: 'higher',   Tb: 1.15, Eb: 0.65, stiff: 1.25 }
};
export const TWIST_TM = { low: 2.8, standard: 3.8, high: 5.5 };
export const FLAW_FRACTION = 0.7;   // a weak place carries 70% of the sound yarn's load

/** Resolve a preset plus levers into curve parameters. */
export function curveParams(presetId, opts = {}) {
  const P = PRESETS[presetId];
  if (!P) throw new Error('unknown preset ' + presetId);
  let { Tb, Eb, stiff, e0, p } = P;
  const notes = [];
  if (P.synthetic && opts.draw && opts.draw !== 'standard') {
    const d = DRAW[opts.draw];
    Tb *= d.Tb; Eb *= d.Eb; stiff *= d.stiff;
    notes.push('draw ratio ' + d.label);
  }
  if (P.synthetic && opts.heatset) {
    // heat setting relaxes the structure: a little less peak, a little more stretch, much less shrinkage
    Tb *= 0.96; Eb *= 1.08; stiff *= 0.95;
    notes.push('heat set');
  }
  if (P.spun && opts.twist && opts.twist !== 'standard') {
    const tm = TWIST_TM[opts.twist];
    Tb *= relativeStrength('staple', tm) / relativeStrength('staple', TWIST_TM.standard);
    Eb *= opts.twist === 'high' ? 1.12 : 0.92;    // more twist, more extension from straightening the helix
    notes.push('twist TM ' + tm);
  }
  const M = stiff * M_REF;
  const lin = M * e0 * (1 - Math.exp(-Eb / e0));
  let k = (Tb - lin) / Math.pow(Eb, p);
  if (k < 0) k = 0;                                  // never happens on the presets; the gate checks
  return { presetId, label: P.label, Tb, Eb, M, e0, p, k, stiff, flaw: !!opts.flaw, notes };
}

/** σ (cN/dtex) at strain ε, BEFORE any flaw stops it. */
export function stressAt(c, eps) {
  if (eps <= 0) return 0;
  return c.M * c.e0 * (1 - Math.exp(-eps / c.e0)) + c.k * Math.pow(eps, c.p);
}

/** Where the specimen breaks: the sound yarn at (Eb, Tb); a flawed one where σ first reaches FLAW_FRACTION·Tb. */
export function breakPoint(c) {
  if (!c.flaw) return { eps: c.Eb, sigma: stressAt(c, c.Eb) };
  const target = FLAW_FRACTION * stressAt(c, c.Eb);
  let lo = 0, hi = c.Eb;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (stressAt(c, m) < target) lo = m; else hi = m; }
  return { eps: hi, sigma: target };
}

/** Work of rupture: area under the curve to the break, in cN/dtex × strain. ×100 → J/g. */
export function workOfRupture(c) {
  const b = breakPoint(c), n = 400;
  let a = 0;
  for (let i = 0; i < n; i++) {
    const x0 = b.eps * i / n, x1 = b.eps * (i + 1) / n;
    a += (stressAt(c, x0) + stressAt(c, x1)) / 2 * (x1 - x0);
  }
  return a;
}
/** cN/dtex × (unit strain) → J/g: 1 cN/dtex = 0.1 N/tex = 0.1 N per 1e-6 kg/m = 1e5 J/kg. */
export const workToJg = w => w * 100;

/* ---------- the weakest link (Peirce, 1926) ----------
   A yarn under test breaks at its weakest place inside the gauge
   length. Model the yarn as segments whose strengths scatter about 1
   with a coefficient of variation; a test of n segments reads the
   MINIMUM. The longer the gauge, the more chances of a weak place,
   the lower the mean reading. Deterministic: a fixed-seed generator. */
function lcg(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return (s + 0.5) / 4294967296; };
}
function normal(rand) {
  const u = rand(), v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
/** Mean measured strength (fraction of the segment mean) for gauge n segments at CV (fraction). */
export function weakLinkMean(cv, n, trials = 400, seed = 7) {
  if (!(n >= 1)) return NaN;
  const rand = lcg(seed);
  let sum = 0;
  for (let t = 0; t < trials; t++) {
    let m = Infinity;
    for (let i = 0; i < n; i++) m = Math.min(m, 1 + cv * normal(rand));
    sum += Math.max(0, m);
  }
  return sum / trials;
}
