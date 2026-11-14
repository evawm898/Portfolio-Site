/* ---------------------------------------------------
   yarn-fineness.js — Yarn Characterization §05 (Filament count &
   fineness; the outline's §06). Pure (no DOM): the gate imports it
   in Node, yarn-fineness-ui.js draws it.

   THE CAVEAT THE SECTION IS BUILT ON: everything here compares
   bundles of the SAME TOTAL DENIER. Split one total into more
   filaments and each filament gets finer:

     dpf = D / n
     filament diameter d ∝ √(dpf / ρ)        (yarn-count.js's owner)

   Then, for the bundle (filaments free to slide past each other —
   the loose end of the range; a tightly bonded bundle bends more
   like one solid rod):

     bending stiffness of one filament ∝ d⁴ ∝ dpf²
     the bundle's ∝ n · dpf² = D · dpf     → ∝ dpf at fixed D
     surface per unit mass ∝ 1/d           → ∝ 1/√dpf
     projected width (cover) ∝ n · d        → ∝ D/√dpf
     one filament's breaking force = tenacity × its dtex → ∝ dpf
--------------------------------------------------- */
import { filamentDiameterUm, fromTex, toTex } from './yarn-count.js';

export const DPF_MICRO = 1.0;          // below: commonly called microfiber (definitions vary)
export const DPF_SUPER_MICRO = 0.3;    // below: commonly "super-" or "ultra-micro"
export const FILAMENT_STEPS = [24, 36, 48, 72, 96, 144, 192, 288, 576];
export const TOTALS = [50, 75, 100, 150, 300];

/** Everything about one bundle. totalDen in denier, n filaments, density g/cm³, tenacity cN/dtex. */
export function bundle(totalDen, n, density = 1.38, tenacity = 4.2) {
  if (!(totalDen > 0) || !(n >= 1) || !Number.isInteger(n)) return null;
  const dpf = totalDen / n;
  const dtexPerFil = fromTex(toTex(dpf, 'den'), 'dtex');
  const dUm = filamentDiameterUm(dtexPerFil, density);
  return {
    totalDen, n, dpf, dtexPerFil, dUm,
    // relative quantities in a consistent arbitrary unit; compare two bundles by ratio
    filStiff: dUm ** 4,                       // one filament: second moment of area ∝ d⁴
    bundleStiff: n * dUm ** 4,                // free-sliding bundle
    surfacePerMass: 1 / dUm,                  // ∝ perimeter / area
    cover: n * dUm,                           // side-by-side projected width
    filForceCn: tenacity * dtexPerFil,        // what breaks one filament
    cls: microClass(dpf)
  };
}

export function microClass(dpf) {
  if (dpf < DPF_SUPER_MICRO) return { id: 'super', label: 'super-microfiber' };
  if (dpf < DPF_MICRO) return { id: 'micro', label: 'microfiber' };
  return { id: 'regular', label: 'regular filament' };
}

/** b relative to a, for every compared quantity. */
export function ratios(a, b) {
  return {
    dpf: b.dpf / a.dpf, dUm: b.dUm / a.dUm, bundleStiff: b.bundleStiff / a.bundleStiff,
    filStiff: b.filStiff / a.filStiff, surfacePerMass: b.surfacePerMass / a.surfacePerMass,
    cover: b.cover / a.cover, filForceCn: b.filForceCn / a.filForceCn, totalDen: b.totalDen / a.totalDen
  };
}

/** A qualitative 0..1 "snag / pill / abrasion risk" that rises as filaments get finer —
 *  a DIRECTION, from 1/dpf, clamped: 3 dpf reads low, 0.3 dpf reads high. */
export function fineRisk(dpf) {
  const x = Math.log10(3 / dpf) / Math.log10(10);   // 3 dpf → 0, 0.3 dpf → 1
  return Math.max(0, Math.min(1, x));
}

/** Hexagonal packing of n equal circles (radius r) in the plane, the n nearest the centre:
 *  centres on a triangular lattice of pitch 2r, so no two overlap by construction. */
export function packCircles(n, r = 1) {
  const pts = [];
  const pitch = 2 * r, rows = Math.ceil(Math.sqrt(n)) + 3;
  for (let j = -rows; j <= rows; j++) {
    for (let i = -rows; i <= rows; i++) {
      const x = (i + (j & 1 ? 0.5 : 0)) * pitch, y = j * pitch * Math.sqrt(3) / 2;
      pts.push({ x, y, d: x * x + y * y + 1e-9 * (i * 7 + j * 13) });   // tiny tie-break: stable order
    }
  }
  pts.sort((a, b) => a.d - b.d);
  return pts.slice(0, n).map(p => ({ x: p.x, y: p.y }));
}
