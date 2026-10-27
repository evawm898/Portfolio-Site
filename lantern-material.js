/* lantern-material.js — the paper star lantern's MATERIAL MODEL and MACHINE
   PROFILES (lantern-design-doc.md §5 and §8). One module, no DOM, no three.

   STARTING VALUES — CONFIRM WITH TEST CUTS. Nothing here has been cut. Every
   rule below is a declared guess scaled from the stock's caliper `t` (mm)
   with a floor the cutters we know can hold, written so a coupon (phase 4)
   can move ONE number: the bridge, the smallest hole, the smallest stroke,
   the fold keep-out, the rim margin, the spine, the tab width, the kerf. The
   pattern module reads the derived RULES; the geometry reads the tab width.

   The floors are the brief's: bridge ≥ 1.0 mm on card (a 1.2 mm bridge in
   200 gsm survives weeding by hand), hole ≥ 1.5 mm (a laser's smallest clean
   hole in card), stroke ≥ 1.0 mm. The scaling is linear in `t` above them —
   thicker stock holds a narrower bridge in proportion to its own stiffness,
   and a thin stock needs a wider one — and is the thing to measure first. */

import { registerDesignFields } from './lantern-geometry.js';

export const MATERIALS = [
  { id: 'kraft120', name: 'kraft 120 gsm', gsm: 120, t: 0.16, note: 'light; folds crisply, sags on a 24″ star' },
  { id: 'card160', name: 'card 160 gsm', gsm: 160, t: 0.20, note: 'copy-shop card; the lightest that holds a 20″ star' },
  { id: 'card200', name: 'card 200 gsm', gsm: 200, t: 0.25, note: 'the default — cover stock, laser and blade both cut it clean' },
  { id: 'bristol250', name: 'bristol 250 gsm', gsm: 250, t: 0.32, note: 'stiff; scores need a deeper pass' },
  { id: 'cover300', name: 'cover 300 gsm', gsm: 300, t: 0.38, note: 'heavy; valleys must be perforated, not scored' },
  { id: 'custom', name: 'custom', gsm: 200, t: 0.25, note: 'your own gsm and caliper' },
];
export const MATERIAL_DEFAULT = 'card200';
export const GSM_RANGE = [80, 400];
export const CALIPER_RANGE = [0.08, 0.6];

/* every derived rule, in mm, from the caliper (and the machine's kerf) */
export function rulesFor({ t, gsm }, machine) {
  const k = machine ? machine.kerf : 0;
  const r = {
    bridge: clamp(4.8 * t, 1.0, 2.2),           // the paper between two cuts
    minHole: clamp(6 * t, 1.5, 2.6),            // the smallest solid cut
    minCut: clamp(4 * t, 1.0, 1.8),             // the narrowest stroke
    foldKeepout: clamp(16 * t, 3.5, 6),         // no cut nearer a fold: the score tears into a cut
    rimMargin: clamp(20 * t, 4.5, 7),           // solid paper inside the rim, where the halves are glued
    spine: clamp(40 * t, 9, 14),                // the solid band along each ridge (both halves of it)
    tabWidth: clamp(32 * t, 7, 11),             // the glue tab's width
    kerf: k,                                     // the machine's, reported; the geometry is not offset by it (ruling 15)
    strokeWidth: clamp(6.4 * t, 1.5, 2.4),      // the pattern's default stroke, 1.6 at the default stock
  };
  r.gsm = gsm; r.t = t;
  return r;
}
const clamp = (v, lo, hi) => Math.round(Math.min(hi, Math.max(lo, v)) * 20) / 20;   // to 0.05 mm, so a rule reads as a number a hand can check

/* the stock's weight per area, and a star's estimated weight: paper area × gsm, the cut-away share removed */
export function weightEstimate(areaMm2, cutFraction, gsm) { return (areaMm2 / 1e6) * gsm * (1 - cutFraction); }

/* SAG — a declared rule of thumb: a facet's free ridge (centre to tip, R_o in
   mm) is carried by the sheet's own stiffness, which goes as t³; a 200 gsm
   point of 260 mm (the default) just holds. The warning fires when R_o
   exceeds the allowed length for this caliper, scaled by the cube root. */
export const SAG_REF = { t: 0.25, Ro: 300 };
export function sagLimitMm(t) { return SAG_REF.Ro * Math.cbrt(t / SAG_REF.t); }

/* ---- machines ------------------------------------------------------------- */
export const MACHINES = [
  { id: 'laser', name: 'laser cutter', kerf: 0.15, score: 'scored', valley: 'perforated', note: 'mountains scored on the SCORE layer at low power; valleys perforated 1 mm cut / 1 mm gap on PERF' },
  { id: 'blade', name: 'blade cutter (Cricut / Silhouette)', kerf: 0, score: 'scored', valley: 'scored', note: 'both fold families on the SCORE layer, drawn with the scoring wheel; PERF is empty' },
];
export const BEDS = [
  { id: 'k40', name: 'K40 laser — 300 × 200 mm', w: 300, h: 200 },
  { id: 'glowforge', name: 'Glowforge — 495 × 279 mm', w: 495, h: 279 },
  { id: 'laser600', name: 'laser 600 × 400 mm', w: 600, h: 400 },
  { id: 'laser900', name: 'laser 900 × 600 mm', w: 900, h: 600 },
  { id: 'cricut12', name: 'Cricut mat — 12 × 12″ (305 × 305 mm)', w: 305, h: 305 },
  { id: 'cricut24', name: 'Cricut mat — 12 × 24″ (305 × 610 mm)', w: 305, h: 610 },
  { id: 'a3', name: 'A3 sheet — 420 × 297 mm', w: 420, h: 297 },
  { id: 'letter', name: 'US letter — 279 × 216 mm', w: 279, h: 216 },
];
export const BED_DEFAULT = 'glowforge';
export const BED_MARGIN_MM = 6;     // from every edge of the bed
export const PERF_CUT_MM = 1, PERF_GAP_MM = 1;

export const EXPORT_FIELDS = ['material', 'gsm', 'caliper', 'machine', 'bed'];
export const EXPORT_STATE_DEFAULTS = Object.freeze({ material: MATERIAL_DEFAULT, gsm: 200, caliper: 0.25, machine: 'laser', bed: BED_DEFAULT });
export function readExport(raw) {
  const o = {};
  o.material = MATERIALS.some((m) => m.id === raw.material) ? raw.material : MATERIAL_DEFAULT;
  const m = MATERIALS.find((x) => x.id === o.material);
  o.gsm = o.material === 'custom' ? Math.min(GSM_RANGE[1], Math.max(GSM_RANGE[0], +raw.gsm || m.gsm)) : m.gsm;
  o.caliper = o.material === 'custom' ? Math.min(CALIPER_RANGE[1], Math.max(CALIPER_RANGE[0], +raw.caliper || m.t)) : m.t;
  o.machine = MACHINES.some((x) => x.id === raw.machine) ? raw.machine : 'laser';
  o.bed = BEDS.some((x) => x.id === raw.bed) ? raw.bed : BED_DEFAULT;
  return o;
}
registerDesignFields(EXPORT_FIELDS, readExport);
export const stockOf = (state) => ({ t: state.caliper, gsm: state.gsm });
export const machineOf = (state) => MACHINES.find((m) => m.id === state.machine);
export const bedOf = (state) => BEDS.find((b) => b.id === state.bed);
