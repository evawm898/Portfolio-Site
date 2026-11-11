/* frame-rinceau.js — the /frame RINCEAU (phase 3f, step 1: the vocabulary,
   NOT WIRED). A classical running scroll: ONE continuous stem per run waving
   in an S across the band, and at every wave a TENDRIL that branches off
   into the hollow the stem bends around and curls into a VOLUTE (the
   approved carved scroll — self-similar width, arris section), the volutes
   alternating sides because the wave's extrema do; ACANTHUS leaves sheathe
   each branch point and lap over the volute's root (stacked shells, no
   undercut), springing from the stem.

   It is not a second vine: frame-vine.js's vineFor owns the run paths, the
   seat law, the weight field w(s), the curvature compression, the band cap,
   the junction motifs, the settling and the budget, and reads this module
   only for (a) the stem's meander law and (b) what springs at each extremum.
   Pure functions, no DOM.

   STEP 2 (§18.6): the layout's default — the rinceau replaced the vine's
   stem and items AND phase 3d's chains — on a band WIDENED to RIN_BAY_MM
   (frame-geometry's rinceauBand, Eva's ruling (b)) at Eva's picks B / E
   (medium wave, medium turns: ~1.05 drawn on a straight run, ruling (d)),
   and the acanthus FULLER than pick I: on the wide band the stem and the
   leaves are weighted up to fill it (Eva, Nov 10) — the stem 0.16 + 0.07 w
   of the band, the tendril 1.25 + 0.5 w, the leaf H's two (sheath and
   calyx), the sheath 1.33× pick I's length (0.42 of a longer tendril) and
   broader (0.75), the calyx 0.85 of it. Read docs/frame-charter.md §18. */

import { MIN_FEATURE_MM } from './frame-registry.js';
import { scrollCurve, buildLeaf, carvedCap, selfGap, LEAF_ASPECT } from './frame-filigree.js';

const F = MIN_FEATURE_MM;

/* the picks (§18.5) and the weight Eva asked for on the wide band (§18.6):
   the half wavelength factor (pick B), the asked volute turns (pick E; held
   to the coil gap, told) and the acanthus. The step-1 variants (loose /
   tight waves, few / many turns, the light leaf) are in the charter's
   tables; no control reaches them. */
export const RIN_WAVE = 1.0;
export const RIN_TURNS = 0.95;
// two leaves (H's sheath and calyx), the sheath longer and broader than
// pick I's — × the tendril's length, its breadth × its own length
export const RIN_LEAF = { leaves: 2, len: 0.42, aspect: 0.75, lobes: 5, lap: 1.0 };

/* the stem and the tendril, × the molding width M, each [base, slope in w_h] */
/* the fit: at each SIZE share (tried in order) the volute takes the most
   turns that fit, bisected down to RIN_TK_MIN of what its own coil gap holds
   on a straight run (a curved run compresses its inner coils); past the last
   size it is not built (told, as a count) */
export const RIN_SIZES = [1, 0.85, 0.72, 0.6];
export const RIN_TK_MIN = 0.45;
export const RIN = {
  A: [0.3, 0.1],       // the meander's amplitude (capped by the band, in vineFor)
  P: [1.15, 0.55],     // its half wavelength (one volute per half wave)
  len: [1.25, 0.5],    // the tendril's length, × M (its bay is ~0.75 M deep: the stem near one edge, the sweep across and the volute in it; 1.05 + 0.45 w on step 1's sheets, weighted up on the wide band)
  share: 0.62,         // the volute's share of the tendril's length (the rest the sweep)
  sweep: 1.1,          // the sweep's radius, × the tendril's length (gentle: it leaves the stem near its tangent)
  branch: 0.18,        // the branch point stands this share of the half wave past the extremum (on the stem's descent)
  diverge: 0.25,       // rad: the tendril leaves the stem's tangent this far into the hollow (near-tangent: a branch, not a spur)
  stemW: [0.16, 0.07], // the stem's width (0.12 + 0.05 w on step 1's sheets: on the 16 mm band it read as a fine line, Eva — weighted up)
  wireK: 0.85,         // the tendril's cap: at most this share of the stem's own width (a branch is thinner than its stem)
  sheath: -0.45,      // rad (−0.3 on step 1's sheets: the fuller leaf, lying further over the stem, keeps off the tendril's sweep): the sheath leaf's heading off the tendril's (negative: toward the stem — it covers the crotch and laps the sweep)
  calyx: 0.45,         // rad: the calyx's second leaf turns this far off the stem's tangent the other way
  calyxLen: 0.85,      // the calyx leaf's length, × the sheath leaf's
  leafCurl: 1.0,       // rad: an acanthus leaf's turn (it hugs the curl, it does not roll back)
};

/* the spec the vine reads */
export function rinceauSpec() {
  return { wave: RIN_WAVE, turns: RIN_TURNS, leaf: RIN_LEAF };
}

/* THE TENDRIL: the second half of a carved C — a SWEEP off the stem (a
   gentle arc, radius RIN.sweep × its length, leaving near the stem's tangent
   and crossing the hollow) and then a VOLUTE winding `turns` down to the eye
   (the carved scroll's own law: its radius falling linearly, a log spiral at
   the pole). `turns` is the VOLUTE's (asked; lowered by bisection until every
   coil gap is RIN_GAP, and the turn drawn reported). Root at the origin,
   tangent +x, curling toward +y; its width the carved law under `cap`. */
export const RIN_GAP = F + 0.1;   // the coil gap the tendril holds (the vine's own clearance, F + VINE_MARGIN)
export function rinceauTendril(len, turns, cap) {
  const wire = Math.max(F, Math.min(carvedCap(2 * len), cap));
  const spec = { kind: 'C', length: 2 * len, wire, balance: 1, carved: true, share: RIN.share, rBody: RIN.sweep * len };
  // the second half of the C (root → eye) is the tendril: the gap read on it alone
  const half = (t) => {
    const c = scrollCurve({ ...spec, turns: t }), r = c.root, sl = (a) => (Array.isArray(a) ? a.slice(r) : a);
    return { ...c, kind: 'tendril', pts: sl(c.pts), nrm: sl(c.nrm), tan: sl(c.tan), u: sl(c.u), kap: sl(c.kap), w: sl(c.w).map((x) => Math.min(x, wire)), root: 0 };
  };
  const ok = (t) => selfGap(half(t)).gap >= RIN_GAP;
  let held = turns;
  if (!ok(turns)) { let lo = 0, hi = turns; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (ok(m)) lo = m; else hi = m; } held = lo; }
  const out = half(held);
  // the turn actually drawn (the tendril's own tangent, root to eye)
  const drawn = Math.abs(out.tan[out.tan.length - 1] - out.tan[0]) / (2 * Math.PI);
  out.info = { ...out.info, wire, tip: F, role: 'volute', L: len, turnsAsked: turns, turnsHeld: held, turnsDrawn: drawn };
  return out;
}

/* AN ACANTHUS LEAF: phase 3c's leaf (a lobed, notched blade, a midrib, its
   tip curling over) at the rinceau's own proportions — broader, more lobes,
   a gentler curl so it lies along the curl it sheathes */
export function acanthusLeaf(length, fullness, side) {
  return buildLeaf({ length, width: Math.max(LEAF_ASPECT, fullness.aspect) * length, side, curl: RIN.leafCurl, lobes: fullness.lobes });
}
