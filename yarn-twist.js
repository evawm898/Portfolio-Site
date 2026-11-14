/* ---------------------------------------------------
   yarn-twist.js — twist arithmetic for Yarn Characterization §03.
   Pure (no DOM): the gate imports it in Node, the page imports the
   same file (yarn-twist-ui.js draws it).

   THE ONE IDEA THE SECTION RESTS ON. A fibre on a yarn's surface
   follows a helix whose angle θ to the axis obeys

       tan θ = π · d · T          (d yarn diameter, T turns per length)

   and d grows as √(linear density). So tan θ ∝ T · √tex, which is
   exactly what a TWIST MULTIPLIER measures:

       α_tex = TPM · √tex                     (metric)
       TM    = TPI ÷ √Ne                      (cotton system)

   Because Ne · tex = 590.54 (yarn-count.js's NE_K), the two are one
   number in two units: α_tex = 39.37 · √590.54 · TM ≈ 956.7 · TM.
   Same TM, same surface angle, at ANY count — which is why a spinner
   specifies twist as TM rather than as turns.
--------------------------------------------------- */
import { NE_K, toTex } from './yarn-count.js';

export const IN_PER_M = 1 / 0.0254;                 // 39.3701 TPM per TPI
export const ALPHA_PER_TM = IN_PER_M * Math.sqrt(NE_K); // ≈ 956.7

/** Yarn bulk densities (g/cm³) used for the diameter — fibre density × a
 *  typical packing fraction (about 0.6): cotton 1.52 × 0.6, polyester 1.38 × 0.6. */
export const YARN_TYPES = {
  staple:   { label: 'staple (ring-spun cotton)', density: 0.91 },
  filament: { label: 'filament (polyester)',      density: 0.83 }
};

export const tpiFromTpm = tpm => tpm / IN_PER_M;
export const tpmFromTpi = tpi => tpi * IN_PER_M;

/** TM (cotton system) from turns per metre and tex. */
export function tmFromTpm(tpm, tex) {
  if (!(tpm >= 0) || !(tex > 0)) return NaN;
  return tpiFromTpm(tpm) / Math.sqrt(NE_K / tex);
}

/** Turns per metre for a TM at a tex. */
export function tpmFromTm(tm, tex) {
  if (!(tm >= 0) || !(tex > 0)) return NaN;
  return tpmFromTpi(tm * Math.sqrt(NE_K / tex));
}

export const alphaTexFromTm = tm => tm * ALPHA_PER_TM;

/** Yarn diameter in mm for a tex at a bulk density (g/cm³). */
export function yarnDiameterMm(tex, density) {
  if (!(tex > 0) || !(density > 0)) return NaN;
  const areaM2 = (tex * 1e-3) / (density * 1e6);   // g/m ÷ g/m³
  return Math.sqrt(4 * areaM2 / Math.PI) * 1e3;
}

/** Surface helix angle (degrees) from turns per metre, tex and density. */
export function helixAngleDeg(tpm, tex, density) {
  const d = yarnDiameterMm(tex, density) / 1000;   // m
  if (!Number.isFinite(d) || !(tpm >= 0)) return NaN;
  return Math.atan(Math.PI * d * tpm) * 180 / Math.PI;
}

/* ---------------------------------------------------
   The strength curves. SCHEMATIC, and the page says so: they show
   the SHAPE the literature reports (Hearle, Grosberg & Backer), not a
   measurement of any one yarn.

   Both carry the obliquity law (Gégauff): a fibre at angle θ to the
   axis contributes about cos²θ of its strength to the yarn's.

   FILAMENT: continuous fibres need no friction to carry load, so
   twist buys only a little consolidation (filaments share load more
   evenly) before obliquity wins. Peak at low twist.

   STAPLE: short fibres carry load only through friction with their
   neighbours, which twist supplies, so a GRIP term rises from zero
   (an untwisted sliver has no strength) and saturates. Grip × cos²θ
   rises, peaks and falls: the optimum twist.
--------------------------------------------------- */
const STAPLE_GRIP = { a: 2.6, b: 2.2 };   // grip = 1 − exp(−(TM/a)^b)
const FILAMENT_CONSOL = { base: 0.86, tm0: 0.35 };

function cos2(tm, density) {
  // tan θ is proportional to TM at any count: evaluate at a reference count
  const tex = 20, tpm = tpmFromTm(tm, tex);
  const th = helixAngleDeg(tpm, tex, density) * Math.PI / 180;
  return Math.cos(th) ** 2;
}

function rawStrength(kind, tm) {
  if (kind === 'staple') {
    const g = 1 - Math.exp(-Math.pow(tm / STAPLE_GRIP.a, STAPLE_GRIP.b));
    return g * cos2(tm, YARN_TYPES.staple.density);
  }
  const c = FILAMENT_CONSOL.base + (1 - FILAMENT_CONSOL.base) * (1 - Math.exp(-tm / FILAMENT_CONSOL.tm0));
  return c * cos2(tm, YARN_TYPES.filament.density);
}

export const TM_RANGE = [0, 7];
const peakCache = {};
function peakOf(kind) {
  if (peakCache[kind]) return peakCache[kind];
  let best = { tm: 0, s: -1 };
  for (let i = 0; i <= 7000; i++) {
    const tm = i / 1000, s = rawStrength(kind, tm);
    if (s > best.s) best = { tm, s };
  }
  return (peakCache[kind] = best);
}

/** Relative strength (peak = 1) of a staple or filament yarn at a TM. */
export function relativeStrength(kind, tm) {
  if (!(tm >= 0)) return NaN;
  return rawStrength(kind, tm) / peakOf(kind).s;
}

/** The TM at which the schematic curve peaks. */
export const optimumTm = kind => peakOf(kind).tm;

/* ---------------------------------------------------
   Typical TM bands (cotton system, ring-spun cotton) — rounded
   ranges from Lord, Handbook of Yarn Production; mills differ.
--------------------------------------------------- */
export const TM_BANDS = [
  { id: 'soft',  label: 'knitting / soft', short: 'soft', from: 2.5, to: 3.3 },
  { id: 'weft',  label: 'weft',            short: 'weft', from: 3.3, to: 3.9 },
  { id: 'warp',  label: 'warp',            short: 'warp', from: 3.9, to: 4.7 },
  { id: 'voile', label: 'voile / hard',    short: 'voile', from: 4.7, to: 5.5 },
  { id: 'crepe', label: 'crepe',           short: 'crepe', from: 5.5, to: 7.0 }
];

export function bandOf(tm) {
  if (tm < TM_BANDS[0].from) return { id: 'low', label: 'below the usual range — weak, lofty' };
  return TM_BANDS.find(b => tm >= b.from && tm < b.to) || TM_BANDS[TM_BANDS.length - 1];
}

/** Qualitative read-outs, each 0..1 — DIRECTIONS only, not measurements. */
export function qualities(kind, tm) {
  const x = Math.min(1, Math.max(0, tm / TM_RANGE[1]));
  const hand = x;                                         // soft → hard
  const lively = Math.min(1, Math.pow(x, 1.6) * 1.25);    // torque grows with twist
  const luster = kind === 'filament'
    ? 1 - 0.75 * Math.min(1, x * 1.6)                    // flat filament is brightest untwisted
    : 0.35 + 0.35 * Math.min(1, x * 2) - 0.25 * Math.max(0, x - 0.65) / 0.35; // fewer hairs, then broken up
  const hairy = kind === 'filament' ? 0 : 1 - Math.min(1, x * 1.35);
  return { hand, lively, luster: Math.max(0, Math.min(1, luster)), hairy: Math.max(0, hairy) };
}

/** Does a SINGLE of this twist snarl when let go slack? (liveliness past ~0.45) */
export const snarls = (tm) => qualities('staple', tm).lively > 0.45;

export { toTex };
