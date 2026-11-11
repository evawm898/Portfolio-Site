/* frame-vine.js — the /frame VINE (phase 3e, step 3): the placed elements
   wired into the chains as ONE CONTINUOUS STEM per run, with a SCALE
   HIERARCHY read off a weight field around the frame. Pure functions, no
   DOM, Node-importable. Read docs/frame-charter.md §17 before touching it.

   THE WEIGHT FIELD w(s). One weight per point of every run, derived from
   the skeleton's own named anchors, never placed per frame:
     - each anchor a run begins or ends at carries an AMPLITUDE by its class —
       the CREST (an anchor on the axis in the upper half) 1.0; a JUNCTION
       (an anchor two runs of the skeleton share: a springing, a corner, an
       oval's side) 0.75; the BOTTOM (on the axis in the lower half) 0.7; a
       TERMINAL (an anchor only one run reaches: an arch's sill end) 0.3;
     - along a run of length L the weight is the larger of the two ends'
       amplitudes, each falling off as 1 − smoothstep(d / (HIER.reach · L))
       with the distance d from its anchor, floored at HIER.floor — so it is
       highest at the crest, secondary at the corners / springings / sides /
       bottom and lowest mid-run;
     - the HIERARCHY STRENGTH h (ornHierarchy) blends it toward a uniform
       0.5: w_h = (1 − h) · 0.5 + h · w. h = 0 is not this module at all: the
       chains of phase 3d run instead, by branch (withOrnament).
   The CLASS of everything placed is read off w_h: heavy (shell, palmette,
   rose) only as the junction motifs at the peaks; medium (a sunk rosette, a
   scroll-and-leaf cluster) approaching them; light (a bud, a leaf, a sprig,
   or the bare stem) mid-run. Scale, the stem's meander amplitude and
   wavelength, and the density all follow w_h; everything along a run
   compresses where the band's path curves (c(x) = 1 / (1 + CURVE_K · M · |κ|),
   M the molding width, κ the path's own curvature over one molding width).

   THE VINE. One stem per run, laid in the run's path frame (runPath, the
   chains' own: offsetCurve inside the band's outer edge), meandering across
   the band about its centre line, y = y_c + A(x) sin θ(x), θ' = π / P(x):
   an extremum every half wavelength P. The stem is SEATED by the chains'
   law (the molding's own height field, read at the emitted columns). Its
   ends: on the axis it stops a feature short of its own mirror (the axis
   motif covers both ends); at a junction it runs on past the anchor along
   its own tangent until it crosses the next run's stem (one group per side,
   so the two stems JOIN — an overlap, never a graze). Items spring from
   the stem at its extrema, each into the bay the stem bends around, grown
   forward (away from the crest): every item's root lies on the stem (a
   JOINT, ≥ EMBED_MM of overlap), and every item is a feature clear of every
   other, of the band's opening and of every other side's wire — an item
   that is not is shrunk 15 % up to five times, then not built (told, as a
   count). A sunk rosette at a zero crossing of the meander sits ON the stem.
   Junction motifs are placed by placeMotif (frame-filigree), the law the
   chains' motifs use: the same primitive. */

import { MIN_FEATURE_MM } from './frame-registry.js';
import { FRAME_TRI_BUDGET, solidTriBound, plateOutline, EMBED_MM, Mesh, bandSolid } from './frame-relief.js';
import {
  CHAIN_RUNS, CHAIN_SEAT, runPath, mapToPath, bandRegion, moldingHeightField, seatOn, slitWorst, mirrorCurve,
  wireClear, wireClearBound, joinsCleanly, LEAF_CROSS, buildScroll, buildLeaf, carvedCap, LEAF_ASPECT, wAt, selfGap, profileFor, rigid, pip, placeMotif, wireHeight, wireProfile, LEAF_RELIEF, crownScale,
} from './frame-filigree.js';
import { rinceauSpec, rinceauTendril, acanthusLeaf, RIN, RIN_SIZES, RIN_TK_MIN } from './frame-rinceau.js';
import { placeElement, relift, liftEach, drapeElement, mirrorElement, symmetrizeElement, remapElement, wireElementContact, elementClear, elementDepth, footprintTouches } from './frame-elements.js';

/* the field's constants (one each, every one a measured choice in §17) */
export const HIER = {
  crest: 1.0, junction: 0.75, bottom: 0.7, terminal: 0.3,   // anchor amplitudes by class
  floor: 0.15,                                               // the least weight mid-run
  reach: 0.55,                                               // a peak's falloff, × its run's length
  uniform: 0.5,                                              // what h → 0 blends toward
  heavy: 0.68, medium: 0.4,                                  // the class thresholds on w_h
};
export const CURVE_K = 1.2;            // the curvature compression: c = 1 / (1 + CURVE_K · M · |κ|)
export const VINE_MARGIN = 0.1;       // mm: the build's clearances stand this far past F
export const AXIS_GAP = 0.1;          // mm past the half feature: where a stem stops short of its mirror
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/* THE BAND IS THE CAP (Eva's rulings on the first sheet, 1 and 2). Nothing
   stands past the band's outer edge — the frame's own silhouette, plateOutline
   — with ONE exception: the CREST may rise above the top, but it spreads ALONG
   the band and stays low and wide; it never sticks out sideways. So the crest
   is built in a frame laid on the band's outer edge (x the arc length from
   the axis along it, y the offset outward along its normal) and DRAPED: it
   follows the edge round a curve, its part past the edge never more than
   CREST.rise of the molding width out, its reach along the edge CREST.span.
   The crest is a low, wide, cupped SHELL on every top (Eva: upright fan
   blades read as a fruit crown on a soft curve; on the second sheet "shell
   works, spray doesn't", so the arch's pointed apex takes the shell too).
   Every other motif sits inside the band (placeMotif's `beyond`). Each a
   measured choice in §17. */
export const CREST = {
  rise: 0.45,     // × M: how far past the outer edge the crest may stand (low)
  span: { shell: 1.35 },   // × M: its half reach along the edge from the axis (wide) — the shell's own proportion
  hinge: 0.7,     // × M: its root inside the band, under the edge (the stems' ends there)
  blend: 1.0,     // × M: the frame's normals averaged over this either side (a mitred apex turns smoothly)
  build: { shell: 0.9 },   // × M: the size the element is BUILT at (its HEIGHT is the built one's; its plan is then scaled, evenly, into the rise and the span)
  stretch: 1.5,   // its plan widened along the band at most this much over its own proportion
  slope: 1,       // its top falls off the band's edge at this slope (1: 45°) — draped in z as well as in plan
  // the ARCH (Eva's ruling (b), fourth sheet): its pointed apex leaves the band
  // only 1.16 M deep on the axis, so a deeper root reaches the opening, and
  // deeper is NARROWER (the apex's sloping normals pull the points in). Its
  // shell reaches further ALONG the two slopes instead: span and stretch both
  // 1.8 — 24 mm across on the default arch, the rise unchanged (measured, §17.10)
  slopes: { span: 1.8, stretch: 1.8 },
  round: 1.5,     // mm: the fall's first stretch is a parabola, not a cone (a cone's tip leaves a CREASE in the lift where the band's crown ends, which the shell's fan grid crosses at a slant — a jagged line across the soft crest, third round)
};
/* THE EDGE FRAME on the silhouette `sil` (print mm): its top crossing of the
   axis, the right half walked from there at `step`, each station's outward
   normal averaged over ±blendMm (a mitred apex turns smoothly, so a point
   offset inward never folds), the left half the right's mirror to the bit.
   at(x, y) → the plan point x along the edge (arc length; negative the left
   half) and y out from it. */
export function edgeFrame(sil, M, step = 0.1, blendMm = CREST.blend * M) {
  const n = sil.length;
  let area = 0; for (let i = 0; i < n; i++) { const a = sil[i], b = sil[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  let best = null;
  for (let i = 0; i < n; i++) {
    const a = sil[i], b = sil[(i + 1) % n];
    if ((a[0] <= 0 && b[0] > 0) || (b[0] <= 0 && a[0] > 0)) { const t = a[0] === 0 ? 0 : b[0] === 0 ? 1 : -a[0] / (b[0] - a[0]), y = a[1] + t * (b[1] - a[1]); if (!best || y > best.y) best = { i, y, fwd: b[0] > a[0] }; }
  }
  // the right half from the crossing, as a polyline
  const poly = [[0, best.y]];
  for (let k = 1; k <= n; k++) { const j = best.fwd ? (best.i + k) % n : (best.i + 1 - k + 2 * n) % n; poly.push(sil[j]); if (sil[j][0] < 0) break; }
  const segN = (a, b) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; const t = [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; return [t[1], -t[0]]; };
  // outward: the polygon's interior is to the left of its own travel when CCW
  const sgn = (area > 0) === best.fwd ? 1 : -1;
  const E = [], N = [];
  let acc = 0;
  for (let k = 0; k < poly.length - 1; k++) {
    const a = poly[k], b = poly[k + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]), nn = segN(a, b).map((v) => sgn * v);
    while (E.length * step <= acc + l + 1e-12) { const t = (E.length * step - acc) / (l || 1); E.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]); N.push(nn); }
    acc += l;
  }
  E[0] = [0, best.y];
  const r = Math.max(0, Math.round(blendMm / step)), Ns = N.map((_, k) => {
    let x = 0, y = 0;
    for (let d = -r; d <= r; d++) { const j = k + d; if (j >= 0 && j < N.length) { x += N[j][0]; y += N[j][1]; } else if (j < 0 && -j < N.length) { x -= N[-j][0]; y += N[-j][1]; } }
    const l = Math.hypot(x, y) || 1; return [x / l, y / l];
  });
  Ns[0] = [0, 1];
  // the stations averaged the same way (a mitred apex rounded off over the
  // blend: an element laid across it bends, never creases — the first cut
  // creased the spray's boss along the axis); a rounded corner lies inside
  // the edge, so a point draped y out of it stands at most y past it
  const Es = E.map((_, k) => {
    let x = 0, y = 0, c = 0;
    for (let d = -r; d <= r; d++) { const j = k + d; if (j >= 0 && j < E.length) { x += E[j][0]; y += E[j][1]; c++; } else if (j < 0 && -j < E.length) { x -= E[-j][0]; y += E[-j][1]; c++; } }
    return [x / c, y / c];
  });
  Es[0] = [0, Es[0][1]];
  E.splice(0, E.length, ...Es);
  const interp = (A, s) => { const u = Math.min(A.length - 1.000001, Math.max(0, s / step)), k = Math.floor(u), f = u - k; return [A[k][0] + f * (A[k + 1][0] - A[k][0]), A[k][1] + f * (A[k + 1][1] - A[k][1])]; };
  const at = ([x, y]) => { const s = Math.abs(x), e = interp(E, s), nn = interp(Ns, s), l = Math.hypot(nn[0], nn[1]); const q = [e[0] + y * nn[0] / l, e[1] + y * nn[1] / l]; return x < 0 ? [-q[0], q[1]] : x === 0 ? [0, q[1]] : q; };
  return { at, E, N: Ns, step, length: (E.length - 1) * step, topY: best.y };
}
/* the signed distance of a plan point to a closed polygon (positive inside) */
export function silDistance(sil, q) {
  let d = Infinity; for (let i = 0; i < sil.length; i++) { const a = sil[i], b = sil[(i + 1) % sil.length], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; let t = l2 ? ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); d = Math.min(d, Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dy)); }
  return pip(q, sil) ? d : -d;
}
/* THE CREST, built about the origin, its plan stretched to the span and the
   rise (x to ±span·M, y from −hinge·M to +rise·M), then draped on the edge
   frame: low and wide past the edge, never sideways */
export function crestElement(kind, { M, frame, hinge = CREST.hinge, span = CREST.span[kind], stretch = CREST.stretch, riseK = 1 }) {
  const el = placeElement(kind, { size: CREST.build[kind] * M, at: [0, 0], angle: 0, lift: 0, soft: kind === 'shell' });   // the crest's shell is the SOFT one (rounded lobes)
  let xm = 0, ym = -Infinity, y0 = Infinity; for (const l of el.loops) for (const [x, y] of l) { xm = Math.max(xm, Math.abs(x)); ym = Math.max(ym, y); y0 = Math.min(y0, y); }
  // its plan scaled into the rise (from its root under the edge to the most
  // it may stand past it)
  // and widened along the band by at most CREST.stretch (a stretch past it
  // turns the shell's scallops into a sunburst's points — measured on the
  // first sheet at 3×)
  const k = (riseK * CREST.rise + hinge) * M / (ym - y0), kx = Math.min(stretch * k, span * M / xm);
  const flat = remapElement(el, ([x, y]) => [kx * x, -hinge * M + k * (y - y0)]);
  return { ...remapElement(flat, frame.at), at: frame.at([0, 0]) };   // its place: the edge on the axis
}
/* the crest's lift at a plan point: the molding under it and its mirror,
   and off the band's edge the molding's height falling at CREST.slope — the
   highest of Hz(q + d) − slope·|d| over d (CREST_LIFT_RINGS out to 8 mm, 32 directions),
   a hundredth over (the raster against the emitted surface, as the leaves'
   crest margin) */
// the rings are DENSE where the fall is read (0.1 mm to 2, 0.25 to 4, 0.5 to
// 8; 32 directions): a max over coarse rings terraces the lift in steps of
// the ring spacing times the slope, and the third round's soft crest showed
// that terrace as a jagged line across the shell where it crosses the
// band's crown
const CREST_LIFT_RINGS = [0, ...Array.from({ length: 20 }, (_, k) => 0.1 * (k + 1)), ...Array.from({ length: 8 }, (_, k) => 2 + 0.25 * (k + 1)), ...Array.from({ length: 8 }, (_, k) => 4 + 0.5 * (k + 1))];
export function crestLift(Hz) {
  const R = CREST_LIFT_RINGS, D = 32;
  return ([x, y]) => {
    let m = 0;
    for (const r of R) for (let a = 0; a < (r ? D : 1); a++) { const t = 2 * Math.PI * a / D, dx = r * Math.cos(t), dy = r * Math.sin(t); const f = CREST.slope * (r < CREST.round ? r * r / (2 * CREST.round) : r - CREST.round / 2); m = Math.max(m, Hz([x + dx, y + dy]) - f, Hz([-x - dx, y + dy]) - f); }
    return m > 0 ? m + 0.01 : 0;
  };
}

/* THE DRAPED CREST, searched: the root's depth under the edge first moved up
   (a crest reaching into the opening), then the span narrowed, until `fits`
   (the vine: it joins both stems; the chains: it grazes no chain) — then
   lifted per vertex (crestLift; the plan's mirror symmetry kept, the lift
   reading a point and its mirror alike) and made its own mirror again. One
   owner for the vine's crest and the chains'. Returns { el, note }. */
export function drapedCrest(kind, { M, frame, opening, Hz, fits, why, slopes = false, sil = null }) {
  const span0 = slopes ? CREST.slopes.span : CREST.span[kind], stretch = slopes ? CREST.slopes.stretch : CREST.stretch;
  let el = null, note = '';
  search: for (const span of [span0, 0.85 * span0, 0.7 * span0]) for (const hg of [CREST.hinge, 0.6, 0.5, 0.4]) {
    // the rise is a CAP, read back off the draped plan (the frame's normals
    // are averaged, so where the edge is not straight under the crest a
    // point y out stands a little further than y from the silhouette —
    // 0.02 mm on an eared rectangle's 16 mm band): lowered until it holds
    let c = null;
    for (const rk of [1, 0.99, 0.97, 0.94, 0.9]) {
      c = crestElement(kind, { M, frame, hinge: hg, span, stretch, riseK: rk });
      if (!sil || c.loops.every((l) => l.every((q) => -silDistance(sil, q) <= CREST.rise * M))) break;
      c = null;
    }
    if (!c || footprintTouches(c, opening)) continue;
    c = symmetrizeElement(c); if (c.asymmetric) continue;
    c.sunk = false; c.out = [0, 1]; c.pushed = 0; c.crest = { hinge: hg, span, stretch, rise: CREST.rise };
    if (fits(c)) { el = c; if (span < span0 || hg < CREST.hinge) note = ` (span ${(span / span0 * 100).toFixed(0)}%, root ${hg.toFixed(2)} M under the edge)`; break search; }
  }
  if (!el) return { el: null, note: `the ${kind} crest is not built — draped low on the band it cannot ${why} without grazing` };
  const cr = el.crest;
  // the lift is raisedCrestLift's at d = 0 — crestLift's own doubles (see
  // there) — kept with the undraped plan so the stand pass (standMotifs)
  // drapes it again higher without reading the molding a second time
  const plan = el, raise = raisedCrestLift(Hz);
  el = symmetrizeElement(liftEach(el, raise(0)));
  el.plan = plan; el.raise = raise;
  if (el.asymmetric) return { el: null, note: `the ${kind} crest is not built — its draped lift is not symmetric` };
  el.sunk = false; el.out = [0, 1]; el.pushed = 0; el.crest = cr;
  let xw = 0; for (const l of el.loops) for (const [x] of l) xw = Math.max(xw, Math.abs(x));
  return { el, note: `the crest is a ${kind}, draped along the band: ${(CREST.rise * M).toFixed(1)} mm past the edge at most, ${(2 * xw).toFixed(0)} mm across${note}` };
}

/* the CLASS of an anchor, from the skeleton alone: on the axis (the upper
   half the crest, the lower the bottom), a junction where two of the
   skeleton's runs meet, else a terminal */
export function anchorClass(model, id) {
  const a = model.info.anchors[id];
  if (Math.abs(a.pt[0]) < 1e-9) return a.pt[1] > (model.box.y0 + model.box.y1) / 2 ? 'crest' : 'bottom';
  const touching = (CHAIN_RUNS[model.info.kind] || []).filter((r) => r.from === id || r.to === id).length;
  return touching >= 2 ? 'junction' : 'terminal';
}
export const ampOf = (cls) => HIER[cls];
/* the weight at distance x along a run of length L between amplitudes Aa
   (at x = 0) and Ab (at x = L), before the hierarchy strength */
export function weightAt(x, L, Aa, Ab) {
  const r = HIER.reach * L, f = (d) => 1 - smooth(Math.max(0, d) / r);
  return Math.max(HIER.floor, Aa * f(x), Ab * f(L - x));
}
export const withStrength = (w, h) => (1 - h) * HIER.uniform + h * w;
export const classOf = (w) => (w >= HIER.heavy ? 'heavy' : w >= HIER.medium ? 'medium' : 'light');

/* THE WEIGHT PROFILE of a skeleton for the sheet's plot: s from the crest
   along the right half through every run the skeleton has (built or not),
   with w(s) and w_h(s). */
export function weightProfile(model, h = 1, step = 1) {
  const p = model.params, scale = p.printHeight / (model.box.y1 - model.box.y0);
  const depth = CHAIN_SEAT * p.moldingWidth * scale;
  const out = { runs: [], samples: [] };
  let s0 = 0;
  for (const run of CHAIN_RUNS[model.info.kind] || []) {
    if (!model.info.anchors[run.from] || !model.info.anchors[run.to]) continue;
    const path = runPath(model, run, scale, depth), L = path.length;
    const Aa = ampOf(anchorClass(model, run.from)), Ab = ampOf(anchorClass(model, run.to));
    out.runs.push({ id: run.id, from: run.from, to: run.to, s0, L, Aa, Ab, classFrom: anchorClass(model, run.from), classTo: anchorClass(model, run.to) });
    for (let x = 0; x <= L + 1e-9; x += step) { const w = weightAt(x, L, Aa, Ab); out.samples.push({ run: run.id, s: s0 + x, w, wh: withStrength(w, h) }); }
    s0 += L;
  }
  out.total = s0;
  return out;
}

/* the path's curvature, smoothed over a window (mm), per station */
function pathCurvature(path, win) {
  const n = path.pts.length, ds = path.length / Math.max(1, n - 1), ang = [0];
  for (let k = 1; k < n; k++) { let d = Math.atan2(path.tan[k][1], path.tan[k][0]) - Math.atan2(path.tan[k - 1][1], path.tan[k - 1][0]); while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; ang.push(ang[k - 1] + d); }
  const half = Math.max(1, Math.round(win / 2 / ds));
  return path.pts.map((_, k) => { const a = Math.max(0, k - half), b = Math.min(n - 1, k + half); return b > a ? (ang[b] - ang[a]) / ((b - a) * ds) : 0; });
}
const at1 = (arr, path, x) => { const n = arr.length, q = Math.min(path.length, Math.max(0, x)), k = Math.min(n - 1, Math.round(q / path.length * (n - 1))); return arr[k]; };

/* lay a local curve (root at its origin, growing along +x) at `root` in a
   run's local frame, heading `phi`, curling right of its march when
   `flip`; then mapped onto the path */
function lay(c, root, phi, flip, path) {
  const local = flip ? rigid(c, { at: root, angle: phi + Math.PI, mirrorX: true }) : rigid(c, { at: root, angle: phi });
  const on = mapToPath(local, path, 0);
  on.localY = local.pts.map((q) => q[1]);
  on.localX = local.pts.map((q) => q[0]);
  return on;
}

/* THE VINE: the same record chainsFor returns, plus the weight field and the
   items placed (what the gate restates). */
/* A stem mapped onto a run whose path turns INWARD (a notched corner's
   jogs) loops back on itself: the mapping offsets every station along the
   path's own normal, and an offset larger than an inside corner's radius is a
   swallow-tail. The loop is cut where the stem crosses itself and the kink
   left behind is rounded — a windowed relaxation of the stations within a
   few stem widths of it, its ends held — until the stem's half width is under
   its radius of curvature everywhere (a carved wire never folds, CV3's law).
   Returns the kept source stations beside the new points, or null. */
function untangle(c, xs, ys) {
  let pts = c.pts.map((q) => q.slice()), X = xs.slice(), Y = ys.slice(), w = c.w.slice(), N0 = c.nrm.slice(), cut = 0;
  const cross = (a, b, p2, q) => { const d = (b[0] - a[0]) * (q[1] - p2[1]) - (b[1] - a[1]) * (q[0] - p2[0]); if (Math.abs(d) < 1e-15) return null; const t = ((p2[0] - a[0]) * (q[1] - p2[1]) - (p2[1] - a[1]) * (q[0] - p2[0])) / d, u = ((p2[0] - a[0]) * (b[1] - a[1]) - (p2[1] - a[1]) * (b[0] - a[0])) / d; return t > 0 && t < 1 && u > 0 && u < 1 ? t : null; };
  for (let guard = 0; guard < 50; guard++) {
    let hit = null;
    for (let i = 0; i < pts.length - 1 && !hit; i++) for (let j = i + 2; j < pts.length - 1; j++) { const t = cross(pts[i], pts[i + 1], pts[j], pts[j + 1]); if (t !== null) { hit = [i, j, t]; break; } }
    if (!hit) break;
    const [i, j, t] = hit, at = [pts[i][0] + t * (pts[i + 1][0] - pts[i][0]), pts[i][1] + t * (pts[i + 1][1] - pts[i][1])];
    const xx = X[i] + t * (X[i + 1] - X[i]), yy = Y[i] + t * (Y[i + 1] - Y[i]), ww = w[i] + t * (w[i + 1] - w[i]);
    pts.splice(i + 1, j - i, at); X.splice(i + 1, j - i, xx); Y.splice(i + 1, j - i, yy); w.splice(i + 1, j - i, ww); N0.splice(i + 1, j - i, N0[i]);
    cut++;
  }
  if (!cut) return null;
  const n = pts.length;
  const turnAt = (k) => { const a = pts[k - 1], b = pts[k], q = pts[k + 1]; return Math.abs(Math.atan2((b[0] - a[0]) * (q[1] - b[1]) - (b[1] - a[1]) * (q[0] - b[0]), (b[0] - a[0]) * (q[0] - b[0]) + (b[1] - a[1]) * (q[1] - b[1]))); };
  const rho = (k) => { const a = pts[k - 1], b = pts[k], q = pts[k + 1]; const A2 = Math.hypot(q[0] - b[0], q[1] - b[1]), B2 = Math.hypot(a[0] - q[0], a[1] - q[1]), C2 = Math.hypot(a[0] - b[0], a[1] - b[1]); const ar = Math.abs((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0])) / 2; return ar > 1e-15 ? A2 * B2 * C2 / (4 * ar) : Infinity; };
  const kinks = []; for (let k = 1; k < n - 1; k++) if (turnAt(k) > 0.35) kinks.push(k);
  let ok = false;
  for (let pass = 0; pass < 8 && !ok; pass++) {
    for (const k of kinks) {
      const span = Math.ceil((3 + 2 * pass) * w[k] / Math.max(1e-6, Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1])));
      const lo = Math.max(1, k - span), hi = Math.min(n - 2, k + span);
      for (let it = 0; it < 60; it++) { const nxt = pts.map((q) => q.slice()); for (let m = lo; m <= hi; m++) { nxt[m][0] = (pts[m - 1][0] + 2 * pts[m][0] + pts[m + 1][0]) / 4; nxt[m][1] = (pts[m - 1][1] + 2 * pts[m][1] + pts[m + 1][1]) / 4; } pts = nxt; }
    }
    ok = true; for (let k = 1; k < n - 1; k++) if (w[k] / 2 >= 0.9 * rho(k)) { ok = false; break; }
  }
  if (!ok) return null;
  const tan = pts.map((_, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; return Math.atan2(b[1] - a[1], b[0] - a[0]); });
  for (let i = 1; i < n; i++) { while (tan[i] - tan[i - 1] > Math.PI) tan[i] -= 2 * Math.PI; while (tan[i] - tan[i - 1] < -Math.PI) tan[i] += 2 * Math.PI; }
  const nrm = tan.map((f, i) => { const nn = [-Math.sin(f), Math.cos(f)]; return nn[0] * N0[i][0] + nn[1] * N0[i][1] >= 0 ? nn : [-nn[0], -nn[1]]; });
  return { curve: { ...c, pts, tan, nrm, w }, xs: X, ys: Y, cut };
}

export function vineFor(model, { triBudget = FRAME_TRI_BUDGET, weightOverride = null } = {}) {
  const p = model.params, kind = model.info.kind, F = MIN_FEATURE_MM, Fm = F + VINE_MARGIN, E = EMBED_MM;
  const frameH = model.box.y1 - model.box.y0, scale = p.printHeight / frameH;
  const region = bandRegion(model, scale);
  const told = [];
  const M = p.moldingWidth * scale, h = p.ornHierarchy;
  // the band WIDENED for the rinceau (frame-geometry's rinceauBand, Eva's (b))
  if (p.bandAsked != null) told.push(`the band is drawn ${M.toFixed(1)} mm wide for the rinceau (the profile width asks ${(p.bandAsked * scale).toFixed(1)} mm): a volute takes a whole turn only on a band about 16 mm wide`);
  const sil = plateOutline(model).map(([x, y]) => [x * scale, y * scale]);
  const opening = (q) => pip(q, sil) && !region.inside(q);
  // past the band's outer edge: outside the frame's own silhouette
  const beyond = (q) => !pip(q, sil);
  const capped = [];
  const H = moldingHeightField(model, scale);
  const Hz = (q) => Math.max(0, H(q));
  const depth = CHAIN_SEAT * M;
  const dens = 0.6 + 0.2 * p.ornDensity;
  const leafK = p.ornLeafSize / 0.42;
  const leaves = p.ornLeaves === 'on';
  // the RINCEAU's laws (frame-rinceau.js, Eva's picks)
  const rin = rinceauSpec();
  // the band in a run's local frame: the path lies `depth` inside the outer
  // edge, so the band spans y ∈ [depth − M, depth]; its centre line y_c
  const yc = depth - M / 2;
  let tris = model.spines.reduce((a, sp) => a + solidTriBound(sp.pts.length + 2, model.prof.x.length + 1), 0);
  const frameTris = tris;
  const W = weightOverride || ((x, L, Aa, Ab) => withStrength(weightAt(x, L, Aa, Ab), h));

  // ---- 1. the runs, their paths, their stems ----
  const runs = [];
  for (const run of CHAIN_RUNS[kind] || []) {
    if (p[run.control] !== 'on') continue;
    if (!model.info.anchors[run.from] || !model.info.anchors[run.to]) { told.push(`no ${!model.info.anchors[run.from] ? run.from : run.to} on this frame — its ${run.id} run is not built`); continue; }
    const path = runPath(model, run, scale, depth), L = path.length;
    const cFrom = anchorClass(model, run.from), cTo = anchorClass(model, run.to);
    const Aa = ampOf(cFrom), Ab = ampOf(cTo);
    const kap = pathCurvature(path, M);
    const comp = kap.map((k) => 1 / (1 + CURVE_K * M * Math.abs(k)));
    const wOf = (x) => W(x, L, Aa, Ab);
    const cOf = (x) => at1(comp, path, x);
    const axisA = cFrom === 'crest' || cFrom === 'bottom', axisB = cTo === 'crest' || cTo === 'bottom';
    // the stem's width, amplitude and half wavelength follow w_h
    const wsOf = (x) => Math.max(F, (RIN.stemW[0] + RIN.stemW[1] * wOf(x)) * M);
    let ak = 1;      // the meander's share: lowered where the run's own turns fold it (below)
    const ampOfX = (x) => ak * Math.max(0.5, Math.min((RIN.A[0] + RIN.A[1] * wOf(x)) * M, M / 2 - wsOf(x) / 2 - 0.6 * F));
    const P0 = (x) => M * (RIN.P[0] + RIN.P[1] * wOf(x)) * rin.wave * cOf(x) / dens;
    // the stem's x range: a feature short of the axis (its mirror) at an
    // axis end; run on past an interior end
    const ws0 = wsOf(0), wsL = wsOf(L);
    // on the axis the stem stops where its MAPPED end stands AXIS_GAP off
    // x = 0 (the path's arc length is not the distance to the axis where the
    // band turns — the arch's apex is a mitre), found by bisection
    // the phase: θ' = π / P(x), scaled so the ends land where they must —
    // an EXTREMUM on the axis (the stem symmetric there), a ZERO at an
    // interior end (the stem on the band's centre line where runs meet)
    const th0 = axisA ? Math.PI / 2 : 0;
    const wantOf = (sp) => (axisB ? Math.max(1, Math.round((sp - (th0 % Math.PI) - Math.PI / 2) / Math.PI)) * Math.PI + Math.PI / 2 - th0 % Math.PI : Math.max(1, Math.round(sp / Math.PI - (axisA ? 0.5 : 0))) * Math.PI + (axisA ? Math.PI / 2 : 0));
    // on the axis the stem stops where its MAPPED end stands AXIS_GAP off
    // x = 0 — read on the side of the centre line its end ACTUALLY lies (the
    // head is a crest, sin = +1; the far end's sign is the phase's: taking
    // the nearer of the two put a stem 4.1 mm off the axis on the arch)
    let x0, x1, n, xs, raw, span, want, sc, sB = 1, eA = 1, eB = 1;   // eA, eB: the run-on past an interior end, cut back where it would leave the band (below)
    // (and, once a phase exists, at the stem's own y there: the end station
    // is not the extremum itself — the phase is anchored at x = 0 — and on the
    // arch's mitred apex the mapped x moves with y)
    const mappedX = (x, end) => Math.abs(mapToPath({ pts: [[x, raw ? yOf(x) : yc + (end ? sB : 1) * ampOfX(end ? L : 0)]], nrm: [[0, 1]], tan: [0], info: {} }, path, 0).pts[0][0]);
    // (set by its BODY's width: its end is rounded to the floor afterwards —
    // roundEnds — but the two stems meet the apex at a slant, so a stop set
    // for the rounded tip brought them 0.78 mm apart behind it, OR3)
    const axisStop = (end) => { const wnt = (F + (end ? wsL : ws0)) / 2 + AXIS_GAP; let lo = 0, hi = Math.min(L / 2, 6 * wnt); for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2, xx = end ? L - m : m; if (mappedX(xx, end) < wnt) lo = m; else hi = m; } return hi; };
    const rawAt = (x) => { const t = (x - x0) / (x1 - x0) * n, k = Math.min(n - 1, Math.max(0, Math.floor(t))); return raw[k] + (raw[k + 1] - raw[k]) * (t - k); };
    const theta = (x) => th0 + (rawAt(x) - rawAt(0)) * sc;
    const yOf = (x) => yc + ampOfX(Math.min(L, Math.max(0, x))) * Math.sin(theta(x));
    const layout = () => {
      raw = null;
      for (let pass = 0; pass < 6; pass++) {
        const px0 = x0, px1 = x1, pB = sB;
        x0 = axisA ? axisStop(false) : -eA * (E + ws0 + Math.abs(yc));
        x1 = axisB ? L - axisStop(true) : L + eB * (E + wsL + Math.abs(yc));
        n = Math.max(8, Math.ceil((x1 - x0) / 0.4));
        xs = []; raw = [0];
        for (let k = 0; k <= n; k++) xs.push(x0 + (x1 - x0) * k / n);
        for (let k = 1; k <= n; k++) { const xm = (xs[k - 1] + xs[k]) / 2; raw.push(raw[k - 1] + Math.PI / P0(Math.min(L, Math.max(0, xm))) * (xs[k] - xs[k - 1])); }
        span = rawAt(L) - rawAt(0); want = wantOf(span); sc = want / span;
        sB = Math.sign(Math.sin(th0 + want)) || 1;
        if (pass && sB === pB && Math.abs(x0 - px0) < 1e-9 && Math.abs(x1 - px1) < 1e-9) return;
      }
    };
    // the stem curve, local then mapped. Where the run's own path turns hard
    // (a notched corner's jogs) the meander can bring the stem back within a
    // feature of itself: its share is lowered — 1, 0.6, 0.3, 0 — until the
    // stem's own gap is a feature (told), else the run is not built
    let stem = null, lp = null;
    for (const a of [1, 0.6, 0.3, 0]) {
    for (let cut = 0; cut < 10; cut++) {
      ak = a;
      layout();
      lp = xs.map((x) => [x, yOf(x)]);
      const tanL = lp.map((_, i) => { const q0 = lp[Math.max(0, i - 1)], q1 = lp[Math.min(n, i + 1)]; return Math.atan2(q1[1] - q0[1], q1[0] - q0[0]); });
      const local = { kind: 'stem', pts: lp, nrm: tanL.map((f) => [-Math.sin(f), Math.cos(f)]), tan: tanL, w: xs.map((x) => wsOf(Math.min(L, Math.max(0, x)))), root: 0, info: { kind: 'stem', role: 'stem', wire: 0, tip: 0 } };
      local.info.wire = Math.max(...local.w); local.info.tip = Math.min(...local.w);
      let cand = mapToPath(local, path, 0), kx = xs, ky = lp.map((q) => q[1]);
      // a run that turns inward (a notched corner) loops the mapped stem:
      // cut the loop and round the kink, told (untangle)
      const un = untangle(cand, xs, ky);
      if (un) { cand = un.curve; kx = un.xs; ky = un.ys; }
      // THE BAND IS THE CAP: the run-on past an interior end (where the next
      // run's stem crosses it) may not leave the band — cut back 30 % at a
      // time until its edge is inside the outer edge, then to none
      const out = { A: false, B: false, mid: false };
      cand.pts.forEach((q, i) => { if (silDistance(sil, q) < cand.w[i] / 2 - 1e-9) { if (kx[i] < 0) out.A = true; else if (kx[i] > L) out.B = true; else out.mid = true; } });
      if (out.A || out.B) { if (out.A) eA = eA > 0.05 ? eA * 0.7 : 0; if (out.B) eB = eB > 0.05 ? eB * 0.7 : 0; if (cut < 9) continue; }
      // a meander that swings past the edge along the run (an ear's notch
      // pinches the band) is lowered, as a meander that folds is
      if (out.mid) break;
      if (selfGap(cand).gap >= Fm) { stem = cand; stem.localX = kx; stem.localY = ky; if (un) told.push(`the ${run.id} stem is cut where the run's inward turn would loop it (${un.cut} loop${un.cut > 1 ? 's' : ''}) and rounded there`); }
      break;
    }
    if (stem) break;
    }
    if (!stem) { told.push(`the ${run.id} stem is not built — the run folds it onto itself at any meander`); continue; }
    if (ak < 1) told.push(`the ${run.id} stem meanders at ${(100 * ak).toFixed(0)}% — at full swing it would come within a feature of itself or past the band's edge`);
    stem.run = run.id; stem.meander = ak;
    runs.push({ run, path, L, Aa, Ab, cFrom, cTo, axisA, axisB, wOf, cOf, wsOf, ampOfX, theta, yOf, stem, sc, x0, x1, want, P0 });
  }

  // ---- 2. the seat (the chains' law: the molding's own height field) ----
  // the stem stands on the highest molding under its own EMITTED vertices
  // (withOrnament's seatEmitted, read at every vertex and its mirror): the
  // lift here is 0 so nothing but that reading raises it (VN5 measures it)
  // ROUNDED ENDS (third round, Eva: "nothing reads as a cut slab from any
  // angle"): a swept wire closes on a face square to its path, and a stem's
  // end showed as a flat collar where it lies inside the next run's stem — so
  // over its last half width each end narrows on a quarter circle to the
  // floor (its crown follows the width, crownScale, floored at the feature)
  const roundEnds = (c) => {
    // the ends are sampled finer first (0.1 mm over the rounding), every
    // per-vertex field interpolated, so the quarter circle is drawn and not
    // two or three chords of it
    { const L0 = c.pts.reduce((a, q, i) => a + (i ? Math.hypot(q[0] - c.pts[i - 1][0], q[1] - c.pts[i - 1][1]) : 0), 0);
      const keys = ['pts', 'nrm', 'tan', 'w', 'localX', 'localY'].filter((k) => Array.isArray(c[k]) && c[k].length === c.pts.length);
      const out = Object.fromEntries(keys.map((k) => [k, []]));
      let acc = 0;
      for (let i = 0; i < c.pts.length; i++) {
        if (i) {
          const l = Math.hypot(c.pts[i][0] - c.pts[i - 1][0], c.pts[i][1] - c.pts[i - 1][1]), r = Math.max(c.w[0], c.w[c.pts.length - 1]);
          if (acc < 1.5 * r || acc + l > L0 - 1.5 * r) {
            const m = Math.ceil(l / 0.1);
            for (let t = 1; t < m; t++) for (const k of keys) { const A = c[k][i - 1], B = c[k][i], f = t / m; out[k].push(Array.isArray(A) ? A.map((v, j) => v + f * (B[j] - v)) : A + f * (B - A)); }
          }
          acc += l;
        }
        for (const k of keys) out[k].push(c[k][i]);
      }
      if (out.nrm) out.nrm = out.nrm.map(([x, y]) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; });
      Object.assign(c, out); }
    const n = c.pts.length, s = [0];
    for (let i = 1; i < n; i++) s.push(s[i - 1] + Math.hypot(c.pts[i][0] - c.pts[i - 1][0], c.pts[i][1] - c.pts[i - 1][1]));
    const w = c.w.slice(), L = s[n - 1];
    for (const [end, w0] of [[0, c.w[0]], [1, c.w[n - 1]]]) {
      const r = w0 / 2;
      for (let i = 0; i < n; i++) { const d = end ? L - s[i] : s[i]; if (d >= r) continue; const q = 1 - d / r; w[i] = Math.min(w[i], F + (w0 - F) * Math.sqrt(Math.max(0, 1 - q * q))); }
    }
    c.w = w; return c;
  };
  const finishStem = (c) => { roundEnds(c); c.lift = c.pts.map(() => 0); return c; };
  for (const r of runs) finishStem(r.stem);
  const stems = runs.map((r) => r.stem);

  // ---- 3. the junction motifs (heavy at the peaks; medium a sunk rosette) ----
  const elements = [];       // { el (right), mirror (left or null), role, anchor, w, station }
  const ends = new Map();
  for (const r of runs) {
    for (const [id, cls, x, end] of [[r.run.from, r.cFrom, 0, 0], [r.run.to, r.cTo, r.L, 1]]) {
      if (!ends.has(id)) ends.set(id, { id, cls, items: [] });
      // the stem's point at the junction (its own end on the axis)
      const sx = end ? Math.min(x, r.x1) : Math.max(x, r.x0);
      const k = r.stem.localX.reduce((b, q, i) => (Math.abs(q - sx) < Math.abs(r.stem.localX[b] - sx) ? i : b), 0);
      ends.get(id).items.push({ r, w: r.wOf(x), P: r.stem.pts[k], N: r.path.out[end ? r.path.out.length - 1 : 0] });
    }
  }
  // the CREST (the axis at the top): a draped shell, the one thing
  // that may stand past the band; every other motif inside the band
  const motifKind = (cls, wcl) => (wcl === 'heavy' ? (cls === 'crest' || cls === 'bottom' ? 'shell' : 'rosette') : wcl === 'medium' ? 'rosette' : null);
  const Mm = M;
  const frame = edgeFrame(sil, Mm);
  // a motif's fit: it JOINS every stem that ends at it (an overlap of the
  // embed, no graze) and grazes nothing (the other stems, its mirror, the
  // motifs already kept)
  const joins = (e, el, onAxis) => {
    const mates = onAxis ? [el] : [el, mirrorElement(el)];
    return e.items.every((q2) => { const c = wireElementContact(q2.r.stem, el, E); return c.graze === -Infinity && c.clear <= -E; })
      && mates.every((m) => stems.every((st) => wireElementContact(st, m, E).graze === -Infinity && wireElementContact(mirrorCurve(st), m, E).graze === -Infinity))
      && elements.every((o) => [o.el, o.mirror].filter(Boolean).every((oe) => mates.every((m) => elementClear(m, oe) >= Fm)));
  };
  for (const [id, e] of ends) {
    if (e.cls === 'terminal') continue;
    const onAxis = e.cls === 'crest' || e.cls === 'bottom';
    if (!onAxis && p.ornCorners !== 'on') continue;
    const w = Math.max(...e.items.map((q) => q.w)), wcl = classOf(w);
    const mk = motifKind(e.cls, wcl);
    if (!mk) continue;
    let el = null, note = '';
    if (e.cls === 'crest' && wcl === 'heavy') {
      const r = drapedCrest(mk, { M: Mm, frame, opening, Hz, fits: (c) => joins(e, c, true), why: 'join both stems', slopes: kind === 'arch', sil });
      told.push(r.note);
      if (!r.el) continue;
      el = r.el;
    } else {
      let nx = 0, ny = 0; for (const q of e.items) { nx += q.N[0]; ny += q.N[1]; } const nl = Math.hypot(nx, ny);
      const P = onAxis ? [0, e.items[0].P[1]] : e.items.reduce((a, q) => [a[0] + q.P[0] / e.items.length, a[1] + q.P[1] / e.items.length], [0, 0]);
      const size = mk === 'palmette' ? (1.6 + 1.2 * w) * Mm : mk === 'shell' ? (1.4 + 1.0 * w) * Mm : mk === 'rose' ? (1.2 + 0.8 * w) * Mm : (1.0 + 0.6 * w) * Mm;
      // a SHELL opens from its hinge, so its hinge sits inward of the stems'
      // meeting point by a quarter of its size
      // CAPPED TO THE BAND: the weight's size, made 10 % smaller until the
      // motif fits between the opening and the outer edge AND joins its stems
      let f = 1;
      for (let q = 0; q < 16; q++, f *= 0.9) {
        const sz = size * f, inset = mk === 'shell' ? 0.25 * sz : 0;
        const c = placeMotif(mk, { size: sz, at: [P[0] - inset * nx / nl, P[1] - inset * ny / nl], out: [nx / nl, ny / nl], H, opening, onAxis, sunk: mk === 'rosette', beyond, reach: 0.5 * Mm });
        if (c && joins(e, c, onAxis)) { el = c; break; }
      }
      if (!el) { told.push(`the ${mk} at ${id} is not built — it cannot fit inside the band and join its stems`); continue; }
      if (f < 1) capped.push(`${mk} at ${id} ${(100 * f).toFixed(0)}%`);
    }
    elements.push({ el, mirror: onAxis ? null : mirrorElement(el), role: 'motif', kind: mk, cls: wcl, anchor: id, w, onAxis, crest: !!el.crest });
  }
  if (capped.length) told.push(`held inside the band (their weight's size made smaller to fit): ${capped.join(', ')}`);

  // ---- 4. the items along each run, heaviest first ----
  const items = [];          // { run, x, w, kind, side, curves: [...], el }
  const cand = [];
  for (const r of runs) {
    // extrema θ = π/2 + kπ and zero crossings θ = kπ inside the run, away
    // from an axis end (the motif's) by a half wavelength
    const thA = r.theta(0), thB = r.theta(r.L);
    const kMin = Math.ceil((thA - Math.PI / 2) / Math.PI - 1e-9), kMax = Math.floor((thB - Math.PI / 2) / Math.PI + 1e-9);
    const solveX = (target) => { let lo = 0, hi = r.L; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (r.theta(m) < target) lo = m; else hi = m; } return (lo + hi) / 2; };
    const guard = (x) => x > 0.35 * M && x < r.L - 0.35 * M;
    let nExt = 0;
    for (let k = kMin; k <= kMax; k++) {
      const x = solveX(Math.PI / 2 + k * Math.PI); if (!guard(x)) continue;
      const side = Math.sign(Math.sin(r.theta(x))) || 1, w = r.wOf(x);
      cand.push({ r, x, w, side, at: 'extremum', n: nExt++ });
    }
  }
  cand.sort((a, b) => b.w - a.w || a.x - b.x);
  // the rinceau's one item: a volute at every extremum
  const itemKind = (c) => (c.at === 'extremum' ? 'volute' : null);
  // what is kept, both sides, for the clearances
  const keptWires = [...stems, ...stems.map((st) => { const m = mirrorCurve(st); m.mirrorOf = st; return m; })];
  const keptEls = elements.flatMap((o) => [o.el, o.mirror].filter(Boolean));
  const near = (c) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of c.pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return region.near([(x0 + x1) / 2, (y0 + y1) / 2], Math.hypot(x1 - x0, y1 - y0) / 2 + 3 * F + 4); };
  const bandOK = (c) => !c.pts.some((q) => opening(q)) && c.pts.every((q, i) => silDistance(sil, q) >= wAt(c, i) / 2) && !(slitWorst(c, near(c)) > -Infinity);   // in the band: not in the opening, not past the outer edge (the wire's half width inside it)
  const clearOf = (a, b) => (wireClearBound(a, b) >= Fm ? Infinity : wireClear(a, b));
  let dropped = 0, shrunk = 0;
  for (const c of cand) {
    const kd = itemKind(c); if (!kd) continue;
    const r = c.r, stem = r.stem;
    const cc = r.cOf(c.x), w = c.w;
    // THE RINCEAU's wave: a tendril branching off just past the extremum on
    // the stem's descent, leaving its tangent into the hollow the stem bends
    // around and curling back into it (toward the crest of this wave) — so
    // the volutes alternate sides as the extrema do; acanthus sheathes the
    // branch point. `f` the size share, `tk` the share of the turns the coil
    // gap holds at that size
    const make = (f, tk = 1) => {
      const P = r.P0(c.x) * r.sc;   // the local half wavelength as laid (the phase's own scale)
      const xb = Math.min(r.L, c.x + RIN.branch * P), yb = r.yOf(xb), dydx = (r.yOf(xb + 0.05) - r.yOf(xb - 0.05)) / 0.1;
      const tanb = Math.atan2(dydx, 1), phi = tanb - c.side * RIN.diverge;
      const len = (RIN.len[0] + RIN.len[1] * w) * M * cc * f;
      // its root starts back across the stem, behind the stem's centre line
      // along its own heading, so the joint is a full overlap and never the
      // two wires' edges kissing
      const rootB = [xb - Math.cos(phi) * 0.75 * r.wsOf(xb), yb - Math.sin(phi) * 0.75 * r.wsOf(xb)];
      // fewer turns are taken off what the coil gap HOLDS at this size (asked past it, the bisection already lowered them)
      const cap = RIN.wireK * r.wsOf(xb), held = tk < 1 ? rinceauTendril(len, rin.turns, cap).info.turnsHeld : rin.turns;
      const tt = rinceauTendril(len, held * tk, cap); tt.info.turnsAsked = rin.turns;
      const t = lay(tt, rootB, phi, c.side > 0, r.path);
      t.info = { ...t.info, role: 'volute' };
      const out = [t];
      if (leaves) {
        const fl = rin.leaf, ll = fl.len * len * leafK;
        // the sheath leaf: rooted on the stem just behind the branch, lying
        // along the tendril's outer side, curling with it
        const ph1 = tanb - c.side * (RIN.diverge + RIN.sheath), xr = xb - 0.3 * r.wsOf(xb);
        const r1 = [xr - Math.cos(ph1) * 0.75 * r.wsOf(xr), r.yOf(xr) - Math.sin(ph1) * 0.75 * r.wsOf(xr)];
        const lf = lay(acanthusLeaf(ll, fl, -c.side), r1, ph1, false, r.path); lf.info = { ...lf.info, role: 'acanthus' }; out.push(lf);
        if (fl.leaves > 1) {
          // the calyx's second leaf: on the stem's continuation, turning
          // the other way, over the stem going on
          const ph2 = tanb + c.side * RIN.calyx;
          const r2 = [xb - Math.cos(ph2) * 0.75 * r.wsOf(xb), yb - Math.sin(ph2) * 0.75 * r.wsOf(xb)];
          const l2 = lay(acanthusLeaf(RIN.calyxLen * ll, fl, c.side), r2, ph2, false, r.path); l2.info = { ...l2.info, role: 'acanthus' }; out.push(l2);
        }
      }
      return { curves: out, f, len };
    };
    const fits = (it) => {
      const why = (m) => { if (globalThis.__vineWhy) globalThis.__vineWhy.push(m); return false; };   // (the reason is the argument: not reported; a probe may collect it)
      if (!it) return why('make null');
      if (it.el) {
        const e = it.el, m = mirrorElement(e);
        const st = wireElementContact(stem, e, E);
        if (!(st.graze === -Infinity && st.clear <= -E)) return why(`stem contact clear ${st.clear.toFixed(2)} graze ${st.graze}`);
        for (const o of keptWires) { if (o !== stem) { const q = wireElementContact(o, e, E); if (q.clear < Fm) return why(`wire ${o.kind} clear ${q.clear.toFixed(2)}`); } if (o.mirrorOf !== stem) { const q2 = wireElementContact(o, m, E); if (q2.clear < Fm) return why(`mirror wire ${o.kind} ${q2.clear.toFixed(2)}`); } }
        if (keptEls.some((o) => elementClear(e, o) < Fm || elementClear(m, o) < Fm)) return why('element');
        return elementClear(e, m) >= Fm || why('own mirror');
      }
      for (const cv of it.curves) {
        // (a leaf too: mapped across a corner's jog it can fold back over itself)
        if (selfGap(cv).gap < Fm) return why(`${cv.kind} self gap ${selfGap(cv).gap.toFixed(2)}`);
        if (!bandOK(cv)) return why(`band: opening ${cv.pts.some((q) => opening(q))} slit ${slitWorst(cv, near(cv))}`);
        if (wireClear(cv, stem) > -E + 1e-9) return why(`${cv.kind} not on its stem (${(-wireClear(cv, stem)).toFixed(2)} mm of overlap)`);   // a joint, not merely no graze (joinsCleanly passes a wire that never touches)
        if (!joinsCleanly(cv, stem)) return why(`${cv.kind} not joined to stem`);
        const mates = [cv, mirrorCurve(cv)];
        if (clearOf(mates[0], mates[1]) < Fm) return why('own mirror');
        for (const m of mates) {
          for (const o of keptWires) { if ((o === stem && m === cv) || (o.mirrorOf === stem && m !== cv)) continue; if (clearOf(m, o) < Fm) return why(`${cv.kind} vs ${o.kind} ${clearOf(m, o).toFixed(2)}`); }
          for (const e of keptEls) { const q = wireElementContact(m, e, E); if (q.clear < Fm) return why(`${cv.kind} vs element ${q.clear.toFixed(2)}`); }
        }
      }
      // within the item every leaf laps the volute's root and the other leaf:
      // a CROSSING (the leaf lies OVER them, its lobes in and out of their
      // edges — the leaves' own crossing rule, phase 3c's LEAF_CROSS) or a
      // feature clear, never a graze
      for (let a = 0; a < it.curves.length; a++) for (let b = a + 1; b < it.curves.length; b++) if (!joinsCleanly(it.curves[a], it.curves[b], LEAF_CROSS)) return why(`pair ${a}-${b}`);
      return true;
    };
    let it = null, q = 0;
    {
      // at each size share the volute takes the MOST turns that fit on the
      // MAPPED path (bisected — a curved run compresses the coils on its
      // inner side, so the gap the local tendril holds is not the gap it
      // keeps), and only where no turns fit is it made smaller
      for (const f of RIN_SIZES) {
        const t1 = make(f, 1); if (fits(t1)) { it = t1; break; }
        q = 1;
        let a = RIN_TK_MIN, b = 1, best = null;
        const t0 = make(f, a);
        if (fits(t0)) { best = t0; for (let k = 0; k < 6; k++) { const m = (a + b) / 2, t = make(f, m); if (fits(t)) { best = t; a = m; } else b = m; } }
        if (best) { it = best; break; }
      }
    }
    if (!it) { dropped++; continue; }
    if (q) shrunk++;
    const rec = { run: r.run.id, x: c.x, w, c: cc, f: it.f, len: it.len, kind: kd, side: c.side, at: c.at, curves: it.curves || [], el: it.el || null };
    for (const cv of rec.curves) { cv.vineItem = rec; keptWires.push(cv, mirrorCurve(cv)); }
    if (rec.el) { rec.el.vineItem = rec; keptEls.push(rec.el, mirrorElement(rec.el)); }
    items.push(rec);
  }
  if (dropped) told.push(`${dropped} volute${dropped > 1 ? "s" : ""} not built — no room a feature clear at any size`);
  if (shrunk) told.push(`${shrunk} volute${shrunk > 1 ? "s" : ""} made smaller or given fewer turns to fit`);

  // ---- 5. seat the items: on the molding, their root riding on the stem ----
  const leafPeak = Math.max(...wireProfile('leaf').z);
  // aimed a hundredth over the feature: the seat reads the molding's
  // RASTER and the gate the emitted surface, which differ by up to 1.4e-4 mm
  // (measured on the arch default) — a crest aimed exactly at F lands that
  // much under it
  const LEAF_CREST_MARGIN = 0.01;
  for (const it of items) {
    const r = runs.find((q) => q.run.id === it.run), stem = r.stem;
    const k0 = stem.localX.reduce((b, q, i) => (Math.abs(q - it.x) < Math.abs(stem.localX[b] - it.x) ? i : b), 0);
    const crown = Math.max(F, wireHeight(stem.info.wire, 'half-round') * p.ornProjection);
    const ride = stem.lift[k0] + 0.6 * crown, ws = stem.w[k0];
    for (const cv of it.curves) {
      let s = 0; const sAt = cv.pts.map((q, i) => (i ? (s += Math.hypot(q[0] - cv.pts[i - 1][0], q[1] - cv.pts[i - 1][1])) : 0));
      // a LEAF's own section peaks under its crown (its midrib on a blade —
      // wireProfile('leaf') tops out under 1), so a leaf is lifted by the
      // shortfall to stand a feature over the molding, as a chain's leaf
      // stands on its host's crown
      // (per row: the crown follows the leaf's width, floored at the feature
      // — crownScale — so a narrowing leaf's crest is lower where it narrows)
      const dLeaf = Math.max(F, LEAF_RELIEF * cv.info.wire * p.ornProjection), kLeaf = cv.kind === 'leaf' ? crownScale(cv, dLeaf) : null;
      const extraAt = (i) => (cv.kind === 'leaf' ? Math.max(0, F + LEAF_CREST_MARGIN - leafPeak * dLeaf * (kLeaf ? kLeaf[i] : 1)) : 0);
      // a rinceau's acanthus laps OVER its volute's root (a stacked shell):
      // it rides a crown higher than the tendril and falls over longer
      const lap = cv.info.role === 'acanthus' ? rin.leaf.lap : 0;
      const rideC = ride + lap * crown, fall = lap ? 3.5 : 2;
      cv.lift = cv.pts.map((_, i) => Math.max(Math.max(0, seatOn(H, cv, i)) + extraAt(i), rideC * (1 - smooth(sAt[i] / (fall * ws)))));
      if (cv.kind === 'leaf') cv.seatExtra = cv.pts.map((_, i) => extraAt(i));
    }
  }

  // ---- 6. THE TRIANGLE BUDGET (the frame's 1.5 M): priced off the solids'
  // own bounds; past it the vine gives way item by item, lightest first, then
  // whole runs from the last (their stems and the motifs only they reach),
  // told ----
  const priceC = (c) => 2 * solidTriBound(c.pts.length, profileFor(c, p).x.length);       // a curve and its mirror
  const priceE = (e, both = true) => (both ? 2 : 1) * e.indices.length / 3;
  let keptRuns = runs.slice(), keptItems = items.slice(), keptMotifs = elements.slice();
  const total = () => tris + keptRuns.reduce((a, r) => a + priceC(r.stem), 0) + keptItems.reduce((a, it) => a + it.curves.reduce((b, c) => b + priceC(c), 0) + (it.el ? priceE(it.el) : 0), 0) + keptMotifs.reduce((a, o) => a + priceE(o.el, !o.onAxis), 0);
  let gaveItems = 0, gaveRuns = 0;
  if (total() > triBudget) {
    const byW = keptItems.slice().sort((a, b) => a.w - b.w);
    while (byW.length && total() > triBudget) { const it = byW.shift(); keptItems = keptItems.filter((q) => q !== it); gaveItems++; }
    while (keptRuns.length && total() > triBudget) {
      const r = keptRuns.pop(); gaveRuns++;
      keptMotifs = keptMotifs.filter((o) => keptRuns.some((q) => q.run.from === o.anchor || q.run.to === o.anchor));
    }
    if (gaveItems) told.push(`${gaveItems} volute${gaveItems > 1 ? "s" : ""} given way to the ${triBudget.toLocaleString('en-US')}-triangle budget (the lightest first)`);
    if (gaveRuns) told.push(`${gaveRuns} run${gaveRuns > 1 ? 's' : ''} of the rinceau not built — past the ${triBudget.toLocaleString('en-US')}-triangle budget`);
  }
  // ---- 7. the record: one group per side of curves (stems + items), the
  // motifs as element groups ----
  const curves = [...keptRuns.map((r) => r.stem), ...keptItems.flatMap((it) => it.curves)];
  const groups = keptRuns.length ? [{ group: 'rinceau', anchor: keptRuns.map((r) => `${r.run.from}→${r.run.to}`).join(', '), onAxis: false, curves, mirrored: curves.map(mirrorCurve), push: depth, told: [], chain: { vine: true, runs: keptRuns.map((r) => ({ id: r.run.id, L: r.L, from: r.run.from, to: r.run.to, cFrom: r.cFrom, cTo: r.cTo, Aa: r.Aa, Ab: r.Ab, path: r.path })) } }] : [];
  for (const o of keptMotifs) groups.push({ group: o.kind, anchor: o.anchor, onAxis: o.onAxis, curves: [], mirrored: [], elements: [o.el, o.mirror].filter(Boolean), motif: o });
  const els = groups.flatMap((g) => g.elements || []);
  for (const it of keptItems) if (it.el) els.push(it.el, mirrorElement(it.el));
  const all = groups.flatMap((g) => [...g.curves, ...g.mirrored]);
  tris = total();
  items.length = 0; items.push(...keptItems);
  const tip = all.length ? Math.min(...all.map((c) => c.info.tip ?? c.info.wire)) : F;
  const weight = { h, runs: keptRuns.map((r) => ({ id: r.run.id, from: r.run.from, to: r.run.to, L: r.L, Aa: r.Aa, Ab: r.Ab, cFrom: r.cFrom, cTo: r.cTo })) };
  return { scale, length: M, wire: F, style: 'carved', layout: 'rinceau', tip, groups, curves: all, elements: els, items, motifs: keptMotifs, weight, region, H, told, tris: { bound: tris, frame: frameTris, budget: triBudget } };
}

/* THE FLOWER IS THE FEATURE (Eva's ruling on the step-2 sheet, Nov 11 —
   superseding "the rosettes sink into the molding" for the rinceau's
   flowers). The relief's order is: the crest shell highest, then the flowers
   (every other junction motif: the corner, springing and side rosettes, a
   bottom shell), then the rinceau (its stems, volutes and acanthus), then the
   molding. So, once the wires are seated and built (withOrnament hands this
   their solids):
     - a FLOWER is DOMED (domeFlower, below) until (a) every wire vertex under
       its footprint lies under the flower's own top surface by STAND.margin —
       the stems run UNDER it, ending beneath it or emerging from behind it,
       embedded in its underside, never over it — and (b) its crown stands
       STAND.step over the highest wire within STAND.near of its footprint;
     - the CREST is draped again over the molding raised by d (the same
       crestLift, so past the band's edge it still falls at CREST.slope and
       stands no slab) until it covers its own stems likewise and its crown
       stands STAND.step over every flower's and every wire near it.
   Nothing moves in plan, so every plan check
   (the band cap, the opening, the joins, the grazes) holds as placed. The
   heights are read off the solids as built (the relief adds one plate
   thickness to every part, so relative heights are the file's), the wires at
   their emitted vertices and a motif at its own top triangles. */
export const STAND = { step: MIN_FEATURE_MM, margin: VINE_MARGIN, near: 2 * MIN_FEATURE_MM, ease: 0.3 };   // ease: the cover's spread (mm of raise per mm away from a stem) — 1 (45°) printed every stem through the petals, measured on the sheet
/* an element's top surface: z(x, y) the highest of its triangles over the
   point (-Infinity off its footprint), bucketed */
export function elementTop(el) {
  const P = el.positions, I = el.indices, cell = 0.5, B = new Map(), tris = [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, crown = 0;
  for (let k = 2; k < P.length; k += 3) crown = Math.max(crown, P[k]);
  for (let t = 0; t < I.length / 3; t++) {
    const a = I[3 * t], b = I[3 * t + 1], c = I[3 * t + 2];
    const ax = P[3 * a], ay = P[3 * a + 1], bx = P[3 * b], by = P[3 * b + 1], cx = P[3 * c], cy = P[3 * c + 1];
    const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(d) < 1e-12) continue;   // a wall: no top over any point
    if (P[3 * a + 2] === 0 && P[3 * b + 2] === 0 && P[3 * c + 2] === 0) continue;   // the base
    const tx0 = Math.min(ax, bx, cx), tx1 = Math.max(ax, bx, cx), ty0 = Math.min(ay, by, cy), ty1 = Math.max(ay, by, cy);
    x0 = Math.min(x0, tx0); x1 = Math.max(x1, tx1); y0 = Math.min(y0, ty0); y1 = Math.max(y1, ty1);
    const id = tris.length; tris.push([a, b, c, d]);
    for (let i = Math.floor(tx0 / cell); i <= Math.floor(tx1 / cell); i++) for (let j = Math.floor(ty0 / cell); j <= Math.floor(ty1 / cell); j++) { const k = `${i},${j}`; if (!B.has(k)) B.set(k, []); B.get(k).push(id); }
  }
  const at = (x, y) => {
    const list = B.get(`${Math.floor(x / cell)},${Math.floor(y / cell)}`); if (!list) return -Infinity;
    let best = -Infinity;
    for (const id of list) {
      const [a, b, c, d] = tris[id], ax = P[3 * a], ay = P[3 * a + 1], bx = P[3 * b], by = P[3 * b + 1], cx = P[3 * c], cy = P[3 * c + 1];
      const l1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d, l2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d, l3 = 1 - l1 - l2;
      if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
      best = Math.max(best, l1 * P[3 * a + 2] + l2 * P[3 * b + 2] + l3 * P[3 * c + 2]);
    }
    return best;
  };
  return { at, crown, box: { x0, y0, x1, y1 } };
}
/* what an element is short of standing: the most any wire vertex under it
   rises past its top less the margin, and the most its crown falls short of
   STAND.step over the wires near it (and over `over`, a height it must clear) */
export function standDeficit(el, W, over = -Infinity) {
  const top = elementTop(el), { box } = top, n = STAND.near;
  let cover = -Infinity, near = -Infinity;
  for (let v = 0; v < W.length; v += 3) {
    const x = W[v], y = W[v + 1];
    if (x < box.x0 - n || x > box.x1 + n || y < box.y0 - n || y > box.y1 + n) continue;
    const z = W[v + 2], s = top.at(x, y);
    if (s > -Infinity) { cover = Math.max(cover, z + STAND.margin - s); near = Math.max(near, z); continue; }
    // near: within STAND.near of the footprint (read at its four sides)
    if (top.at(x + n, y) > -Infinity || top.at(x - n, y) > -Infinity || top.at(x, y + n) > -Infinity || top.at(x, y - n) > -Infinity) near = Math.max(near, z);
  }
  return { cover, crown: Math.max(near, over) + STAND.step + STAND.margin - top.crown, top };
}
/* the crest's lift over the molding raised by d inside the band: the same
   law as crestLift (and its doubles at d = 0), the band's reach per point
   cached so a raise costs nothing to try again */
export function raisedCrestLift(Hz) {
  const R = CREST_LIFT_RINGS, D = 32, cache = new Map();
  const reach = (x, y) => {
    const k = `${x},${y}`; if (cache.has(k)) return cache.get(k);
    let m = -Infinity;
    for (const r of R) for (let a = 0; a < (r ? D : 1); a++) { const t = 2 * Math.PI * a / D, dx = r * Math.cos(t), dy = r * Math.sin(t); const f = CREST.slope * (r < CREST.round ? r * r / (2 * CREST.round) : r - CREST.round / 2); const h1 = Hz([x + dx, y + dy]), h2 = Hz([-x - dx, y + dy]); if (h1 > 0) m = Math.max(m, h1 - f); if (h2 > 0) m = Math.max(m, h2 - f); }
    cache.set(k, m); return m;
  };
  return (d) => ([x, y]) => { const m = Math.max(0, reach(x, y) + d); return m > 0 ? m + 0.01 : 0; };
}
/* A FLOWER STOOD AS A DOME (not a rigid block: raised whole, a petal over
   the band's falling edge stood as a cut wall — the slab Eva ruled out in
   the fourth round). Every top vertex is raised by
     δ(q) = max(0, C(q) + e, h − h · s(ρ(q)))
   — C the COVER: over every wire vertex under the flower, what the flower's
   top there falls short of the wire plus the margin, spread gently (the
   greatest of r − STAND.ease·|q − p|), so the petals ride over the stems
   beneath them as one broad hill (at 45° every stem showed through them as
   a ridge); h the HEART's raise, full at the boss and falling
   (s the smoothstep over the petals' reach, from the boss's edge to the
   footprint's rim) to nothing at the tips, so the petals fall back to where
   they lay and the flower domes out of the molding; e a top-up should the
   drawn triangles read under C between their vertices. h is stepped by the
   crown's own deficit until the crown stands STAND.step over the wires near
   it. On the axis the field is read at a point and its mirror alike. */
export function domeFlower(el0, W, onAxis = false) {
  const top0 = elementTop(el0), { box } = top0;
  const pts = [];
  for (let v = 0; v < W.length; v += 3) {
    const x = W[v], y = W[v + 1];
    if (x < box.x0 || x > box.x1 || y < box.y0 || y > box.y1) continue;
    const s0 = top0.at(x, y); if (s0 === -Infinity) continue;
    const r = W[v + 2] + STAND.margin - s0; if (r > 0) pts.push([x, y, r]);
  }
  const C1 = ([x, y]) => { let m = -Infinity; for (const [px, py, r] of pts) m = Math.max(m, r - STAND.ease * Math.hypot(x - px, y - py)); return m; };
  const C0 = onAxis ? (q) => Math.max(C1(q), C1([-q[0], q[1]])) : C1;
  const memo = new Map(), C = (q) => { const k = `${q[0]},${q[1]}`; let v = memo.get(k); if (v === undefined) { v = pts.length ? C0(q) : -Infinity; memo.set(k, v); } return v; };
  const c = el0.at, P0 = el0.positions;
  let R = 0; for (let k = 0; k < P0.length; k += 3) R = Math.max(R, Math.hypot(P0[k] - c[0], P0[k + 1] - c[1]));
  const rho0 = 0.25 * R;   // the boss's own reach: the heart is raised whole inside it
  const fall = (q) => { const t = Math.min(1, Math.max(0, (Math.hypot(q[0] - c[0], q[1] - c[1]) - rho0) / (R - rho0))); return t * t * (3 - 2 * t); };
  // on the axis the field is exactly symmetric (C reads a point and its
  // mirror, the fall a distance from a centre on x = 0), so the drape keeps
  // the placed flower's own mirror symmetry to the bit — and is NOT
  // re-symmetrized here: that would be a second owner of the axis symmetry,
  // and it hid a placement that was not its own mirror (PL4's mutant)
  const build = (h, e) => ({ ...drapeElement(el0, (q) => Math.max(0, C(q) + e, h * (1 - fall(q)))), sunk: el0.sunk, out: el0.out, pushed: el0.pushed, lift: el0.lift });
  let h = 0, e = 0, el = el0, def = { cover: Infinity, crown: Infinity };
  for (let k = 0; k < 12; k++) {
    el = build(h, e); def = standDeficit(el, W);
    if (def.cover <= 1e-9 && def.crown <= 1e-9) break;
    if (def.cover > 1e-9) e += def.cover;
    if (def.crown > 1e-9) h = Math.max(h, C(c) + e) + def.crown;
  }
  el.stood = Math.max(h, C(c) + e, 0);
  if (def.cover > 1e-9 || def.crown > 1e-9) el.standShort = Math.max(def.cover, def.crown);
  return el;
}
export function standMotifs(orn, solids) {
  const motifs = orn.motifs || [];
  if (!motifs.length) return orn;
  const mesh = new Mesh();
  for (const o of solids) bandSolid(mesh, o.spine, o.prof, { scale: 1, plateT: o.lift || 0, reliefDepth: o.depth });
  const W = mesh.pos;
  const swap = new Map();   // an old element → the one standing in its place
  let flowerCrown = -Infinity, flowers = 0, raisedMax = 0;
  const kinds = new Set();
  for (const o of motifs) {
    if (o.crest) continue;
    const el = domeFlower(o.el, W, o.onAxis);
    const mirror = o.mirror ? mirrorElement(el) : null;
    swap.set(o.el, el); if (o.mirror) swap.set(o.mirror, mirror);
    o.el = el; o.mirror = mirror; o.stood = el.stood;
    flowerCrown = Math.max(flowerCrown, elementTop(el).crown); flowers++; raisedMax = Math.max(raisedMax, el.stood); kinds.add(o.kind);
  }
  if (flowers) orn.told.push(`the ${[...kinds].join(' and ')}${flowers > 1 ? 's' : ''} stand in front: domed up to ${raisedMax.toFixed(2)} mm at the heart, every stem under one running beneath it, its crown ${STAND.step.toFixed(1)} mm over the rinceau near it`);
  const Hz = (q) => Math.max(0, orn.H(q));
  for (const o of motifs) {
    if (!o.crest || !o.el.plan) continue;
    const lift = o.el.raise || raisedCrestLift(Hz), plan = o.el.plan;
    let el = o.el, d = 0, def = standDeficit(el, W, flowerCrown), short = Math.max(def.cover, def.crown);
    for (let k = 0; k < 10 && short > 1e-9; k++) {
      d += short;
      const c = symmetrizeElement(liftEach(plan, lift(d)));
      if (c.asymmetric) break;
      Object.assign(c, { sunk: false, out: o.el.out, pushed: o.el.pushed, crest: o.el.crest, plan, raise: lift, at: o.el.at });
      el = c; def = standDeficit(el, W, flowerCrown); short = Math.max(def.cover, def.crown);
    }
    if (short > 1e-9) orn.told.push(`the crest cannot be raised over its stems and the flowers (${short.toFixed(2)} mm short)`);
    else if (d > 0) orn.told.push(`the crest is draped ${d.toFixed(2)} mm higher, the highest of the relief: over its own stems and ${STAND.step.toFixed(1)} mm over every flower`);
    swap.set(o.el, el); o.el = el; o.stood = d;
  }
  orn.elements = orn.elements.map((e) => swap.get(e) || e);
  for (const g of orn.groups) if (g.elements) g.elements = g.elements.map((e) => swap.get(e) || e);
  return orn;
}
