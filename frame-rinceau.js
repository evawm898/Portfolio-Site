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

   STEP 1 STATE: reached only through the hidden param `ornRinceau: 'on'`
   (with `rinWave` / `rinTurns` / `rinLeaf`), which no control writes — the
   vocabulary sheet (tools/shot-frame-rinceau.mjs) sets it. With it absent
   every frame builds as on main, by branch. Read docs/frame-charter.md §18. */

import { MIN_FEATURE_MM } from './frame-registry.js';
import { scrollCurve, buildLeaf, carvedCap, selfGap, LEAF_ASPECT } from './frame-filigree.js';

const F = MIN_FEATURE_MM;

/* the variants the sheet rules between (Eva picks one; each a measured
   choice in §18) */
export const RIN_WAVE = { loose: 1.4, medium: 1.0, tight: 0.72 };   // × the half wavelength
export const RIN_TURNS = { few: 0.6, medium: 0.95, many: 1.35 };   // the VOLUTE's asked turns (held to the coil gap, told)
export const RIN_LEAF = {
  // light: one sheath leaf along the tendril's outer side
  light: { leaves: 1, len: 0.3, aspect: 0.5, lobes: 4, lap: 0.8 },
  // full: the sheath leaf longer and broader, plus a second leaf on the
  // stem's own continuation (the acanthus calyx about the node)
  full: { leaves: 2, len: 0.38, aspect: 0.62, lobes: 5, lap: 1.0 },
};

/* the stem and the tendril, × the molding width M, each [base, slope in w_h] */
/* the fit's schedule: [size, turns] shares tried in order — a volute that does
   not fit is first given FEWER TURNS (a curved run compresses its coils),
   then made smaller; past the last it is not built (told, as a count) */
export const RIN_TRY = [[1, 1], [1, 0.85], [0.85, 0.85], [1, 0.7], [0.85, 0.7], [0.72, 0.7], [0.85, 0.55], [0.72, 0.55], [0.6, 0.55]];
export const RIN = {
  A: [0.3, 0.1],       // the meander's amplitude (capped by the band, in vineFor)
  P: [1.15, 0.55],     // its half wavelength (one volute per half wave)
  len: [1.05, 0.45],   // the tendril's length, × M (its bay is ~0.75 M deep: the stem near one edge, the sweep across and the volute in it)
  share: 0.62,         // the volute's share of the tendril's length (the rest the sweep)
  sweep: 1.1,          // the sweep's radius, × the tendril's length (gentle: it leaves the stem near its tangent)
  branch: 0.18,        // the branch point stands this share of the half wave past the extremum (on the stem's descent)
  diverge: 0.25,       // rad: the tendril leaves the stem's tangent this far into the hollow (near-tangent: a branch, not a spur)
  stemW: [0.12, 0.05], // the rinceau's stem width (thinner than the vine's: the volutes carry the weight)
  wireK: 0.85,         // the tendril's cap: at most this share of the stem's own width (a branch is thinner than its stem)
  sheath: -0.3,       // rad: the sheath leaf's heading off the tendril's (negative: toward the stem — it covers the crotch and laps the sweep)
  calyx: 0.45,         // rad: the full calyx's second leaf turns this far off the stem's tangent the other way
  leafCurl: 1.0,       // rad: an acanthus leaf's turn (it hugs the curl, it does not roll back)
};

/* the spec the vine reads, from the hidden params */
export function rinceauSpec(p) {
  if (p.ornRinceau !== 'on') return null;
  const wave = RIN_WAVE[p.rinWave] ?? RIN_WAVE.medium;
  const turns = RIN_TURNS[p.rinTurns] ?? RIN_TURNS.medium;
  const leaf = RIN_LEAF[p.rinLeaf] ?? RIN_LEAF.light;
  return { wave, turns, leaf, names: { wave: p.rinWave || 'medium', turns: p.rinTurns || 'medium', leaf: p.rinLeaf || 'light' } };
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
