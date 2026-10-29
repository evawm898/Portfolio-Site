/* frame-pattern.js — the /frame BAND PATTERN: a repeat laid along a band's
   edge (phase 3e, step 1 of the element vocabulary). Pure functions, no
   DOM, Node-importable. Read docs/frame-charter.md §15 before touching it.

   ONE OWNER of "repeat along a path": the path is offsetCurve (the one
   producer of every curve parallel to a spine) at the column the pattern
   sits on, in PRINT millimetres; the seat is the profile's own height at
   that column — the band's surface as the STL carries it, read from the
   profile samples over the element's own span across the band. Two
   patterns ride it today:
     BEADING    spheres, FUSED: the pitch is held at or under BEAD_FUSE × r
                (1.8 r — at 2 r two beads touch at a point and print a
                knife-edge web), so every neighbouring pair overlaps by a
                measured neck. A bead's centre stands r − F above the
                highest molding under it, so its bottom embeds the band by
                the feature at that column.
     LEAF TIPS  overlapping leaves, a laurel run: each leaf's BASE lies over
                the previous leaf's tip (a stacked shell, phase 3c's), so
                the pitch is held inside [LEAF_RUN_PITCH_MIN, LEAF_RUN_PITCH_MAX]
                × the leaf's length (under half, a third leaf would stack
                and the run would climb; over three quarters they part).
   Both are mirror-symmetric to the bit (the right half is built and
   mirrored, x negated) and SEAMLESS: every path STARTS ON THE AXIS and is
   extended through its own mirror image, so an element may cross the axis
   (the two first leaves cross base over base rather than meeting face to
   face) and, on a closed loop, the seam (the two last leaves cross tip over
   tip). A closed loop's half runs from the top centre to the bottom centre
   at one spacing, so the axis and the seam are two more pitches; the arch's
   inner edge of head and jamb is ONE path from the apex to the sill, and the
   sill its own from its centre.

   What reaches the paper: nothing — the band pattern is a print feature
   (the relief is the primary output, ruling 1) and its rows live in the
   registry's print section; the read-out says so.

   MIN_FEATURE_MM (registry) is an ASSUMPTION; a bead or a leaf under it is
   built at it and told. */

import { offsetCurve } from './frame-geometry.js';
import { solidTriBound, FRAME_TRI_BUDGET, PATTERN_LAT, PATTERN_LON } from './frame-relief.js';
import { MIN_FEATURE_MM } from './frame-registry.js';
import { buildLeaf, leafProfile, LEAF_ASPECT, LEAF_RELIEF } from './frame-filigree.js';

/* the pitch cap on beading, × the bead radius: two beads at 2 r touch at a
   point and print a knife-edge web (Eva's ruling) */
export const BEAD_FUSE = 1.8;
/* the leaf run's pitch, × the leaf's length: the band each leaf's base lies
   over the previous one's tip (a stacked shell) without a third stacking */
export const LEAF_RUN_PITCH_MIN = 0.5, LEAF_RUN_PITCH_MAX = 0.75;
/* the first leaf's base stands this share of its length PAST the axis, so
   the mirrored pair cross base over base (met face to face on the axis
   they would graze, which the voxel gate cannot tell from an overlap) */
export const LEAF_RUN_AXIS_CROSS = 0.15;
export const LEAF_RUN_LOBES = 1;     // a laurel leaf: one smooth bulge, no serration
export const PATTERN_LEAF_STATIONS = 16;   // stations along a pattern leaf (its length is a few mm)

/* The profile's highest z over the across-fractions [f0, f1] (0 the outer
   edge, 1 the inner), at the profile's own samples and 16 stations between. */
export function profileMax(prof, f0, f1) {
  const x = prof.x, z = prof.z;
  const zAt = (f) => { if (f <= x[0]) return z[0]; for (let k = 1; k < x.length; k++) if (f <= x[k]) return z[k - 1] + (z[k] - z[k - 1]) * (f - x[k - 1]) / (x[k] - x[k - 1]); return z[x.length - 1]; };
  const lo = Math.max(0, Math.min(f0, f1)), hi = Math.min(1, Math.max(f0, f1));
  let m = 0;
  for (let k = 0; k <= 16; k++) m = Math.max(m, zAt(lo + (hi - lo) * k / 16));
  for (let k = 0; k < x.length; k++) if (x[k] >= lo && x[k] <= hi) m = Math.max(m, z[k]);
  return m;
}

export const cumLen = (poly) => { const c = [0]; for (let k = 1; k < poly.length; k++) c.push(c[k - 1] + Math.hypot(poly[k][0] - poly[k - 1][0], poly[k][1] - poly[k - 1][1])); return c; };
/* The point and unit tangent at arc length s along a polyline. */
export const atS = (poly, cum, s) => {
  let k = 0; while (k < cum.length - 2 && cum[k + 1] < s) k++;
  const t = (s - cum[k]) / Math.max(1e-12, cum[k + 1] - cum[k]);
  const dx = poly[k + 1][0] - poly[k][0], dy = poly[k + 1][1] - poly[k][1], l = Math.hypot(dx, dy) || 1;
  return { p: [poly[k][0] + t * dx, poly[k][1] + t * dy], tan: [dx / l, dy / l] };
};
const mirrorPts = (pts) => pts.map(([x, y]) => [-x, y]);

/* The column's offset polyline in PRINT mm (nulls past a join's bisector
   become the join's mitre point, as the relief's grid does), as the spine
   orders it. */
function column(spine, d, scale) {
  const off = offsetCurve(spine, d);
  const joins = spine.joins || [];
  const near = (i) => { let best = joins[0], bd = Infinity; const n = off.length; for (const j of joins) { const dd = spine.closed ? Math.min((i - j + n) % n, (j - i + n) % n) : Math.abs(i - j); if (dd < bd) { bd = dd; best = j; } } return best; };
  return off.map((q, i) => { const r = q || off[near(i)]; return [r[0] * scale, r[1] * scale]; });
}
/* The axis crossings of a polyline, as arc lengths where x passes 0, each
   with its y; `highest` picks the topmost (a closed loop crosses twice —
   the top and the seam). */
const axisCrossings = (pts, cum) => {
  const out = [];
  for (let k = 0; k < pts.length - 1; k++) if ((pts[k][0] <= 0) !== (pts[k + 1][0] <= 0) || (pts[k][0] === 0 && pts[k + 1][0] !== 0)) { const t = pts[k][0] === pts[k + 1][0] ? 0 : pts[k][0] / (pts[k][0] - pts[k + 1][0]); out.push({ s: cum[k] + t * (cum[k + 1] - cum[k]), y: pts[k][1] + t * (pts[k + 1][1] - pts[k][1]) }); }
  return out;
};
const axisCrossing = (pts, cum, highest = false) => { const c = axisCrossings(pts, cum); if (!c.length) return null; return highest ? c.reduce((a, b) => (b.y > a.y ? b : a)).s : c[0].s; };
/* A polyline resampled from arc length s0 to s1 (either order) every ~1 mm,
   its ends exact. */
/* The sub-polyline between arc lengths s0 < s1, keeping every vertex between
   them (a corner is kept, never cut by a chord) with the two ends interpolated. */
const slice = (pts, cum, s0, s1) => { const out = [atS(pts, cum, s0).p]; for (let k = 0; k < pts.length; k++) if (cum[k] > s0 + 1e-9 && cum[k] < s1 - 1e-9) out.push(pts[k]); out.push(atS(pts, cum, s1).p); return out; };

/* THE RIGHT-HAND PATHS a pattern runs along, in print mm, each starting ON
   THE AXIS and running away from it: the half loop top → bottom of a closed
   frame; the arch's head-then-jamb from the apex to the sill, and its sill
   from the centre. Each is { id, pts, closedPair, ext, off, L }: pts is the
   right half; closedPair says its far end is the loop's seam, where it
   meets its own mirror image; ext is the path EXTENDED through its mirror
   (the left run reversed before it, and after it on a closed loop), with
   off the arc length of pts[0] along ext, so an element can cross the axis
   or the seam. */
export function patternPaths(model, scale, d) {
  const sp = (id) => model.spines.find((s) => s.id === id);
  const paths = [];
  const finish = (id, pts, closedPair) => {
    const m = mirrorPts(pts).reverse();
    const ext = closedPair ? [...m, ...pts.slice(1), ...m.slice(1)] : [...m, ...pts.slice(1)];
    const cum = cumLen(ext), pre = cumLen(m);
    paths.push({ id, pts, closedPair, ext, cum, off: pre[pre.length - 1], L: cumLen(pts).at(-1) });
  };
  if (model.spines.length === 1 && model.spines[0].closed) {
    const s = model.spines[0], pts = column(s, d, scale);
    // the loop's two axis crossings — the TOP (the highest) and the SEAM (the
    // lowest) — found on the column itself, never at a vertex: an eared
    // frame's highest vertex is an ear's, off the axis, and a path begun
    // there would leave the band. The right half runs top → seam on the
    // side where x > 0.
    const ring = [...pts, pts[0]], cumR = cumLen(ring), cr = axisCrossings(ring, cumR);
    const top = cr.reduce((a, b) => (b.y > a.y ? b : a)), bot = cr.reduce((a, b) => (b.y < a.y ? b : a));
    const lap = cumR[cumR.length - 1];
    const half = (fwd) => { const P = fwd ? ring : [...ring].reverse(), C = fwd ? cumR : cumLen(P); const sT = fwd ? top.s : lap - top.s, sB0 = fwd ? bot.s : lap - bot.s, sB = sB0 > sT ? sB0 : sB0 + lap; return slice([...P, ...P.slice(1)], cumLen([...P, ...P.slice(1)]), sT, sB); };
    let out = half(true); if (atS(out, cumLen(out), Math.min(1, cumLen(out).at(-1) / 2)).p[0] < 0) out = half(false);
    out[0] = [0, out[0][1]]; out[out.length - 1] = [0, out[out.length - 1][1]];   // the crossings, to the double
    finish('loop', out, true);
    return paths;
  }
  const head = sp('head'), jamb = sp('jambR'), sill = sp('sill');
  if (head) {
    const hp = column(head, d, scale);
    // the head runs from jambR to jambL: the apex is its join; from the apex
    // toward its start (the right springing), then down the jamb to the sill
    const j = head.joins && head.joins.length ? head.joins[0] : Math.floor(hp.length / 2);
    const pts = []; for (let i = j; i >= 0; i--) pts.push(hp[i]);
    if (jamb) {
      const jp = column(jamb, d, scale);            // the jamb runs sill → head
      for (let i = jp.length - 1; i >= 0; i--) if (Math.hypot(jp[i][0] - pts[pts.length - 1][0], jp[i][1] - pts[pts.length - 1][1]) > 1e-9) pts.push(jp[i]);
    }
    pts[0] = [0, pts[0][1]];                          // the mitre point is on the axis to the bit
    finish('head', pts, false);
  }
  if (sill) {
    const spt = column(sill, d, scale), cum = cumLen(spt), s0 = axisCrossing(spt, cum);
    const rightEnd = spt[0][0] >= spt[spt.length - 1][0] ? 0 : cum[cum.length - 1];
    finish('sill', slice(spt, cum, s0, rightEnd), false);
  }
  return paths;
}

/* Stations along a path from its axis end: one every `step` ≤ pitch, the
   step chosen so the run from `start` to its usable end divides exactly.
   closedPair: the run ends ON the axis again (the seam) — a bead there is
   its own mirror, so `last` includes it; a leaf there would meet its mirror
   base to base, so `last` excludes it and the last leaf crosses the seam. */
export function stations(path, pitch, { start = 0, endClear = 0, last = true, seamHalf = false } = {}) {
  const usable = path.closedPair ? path.L : path.L - endClear;
  if (usable <= start) return { s: [], step: pitch };
  if (seamHalf && path.closedPair) {
    // an element that may not sit ON the seam (a leaf crosses it): the last
    // base stands half a step before the seam, its mirror half a step past,
    // so the gap across the seam is the run's own step — N stations, the
    // step the largest at or under the pitch that lands so
    const N = Math.max(1, Math.ceil((usable - start) / pitch + 0.5 - 1e-9)), step = (usable - start) / (N - 0.5);
    const s = []; for (let k = 0; k < N; k++) s.push(start + k * step);
    return { s, step };
  }
  const N = Math.max(1, Math.ceil((usable - start) / pitch - 1e-9)), step = (usable - start) / N;
  const s = []; for (let k = 0; k <= N - (last ? 0 : 1); k++) s.push(start + k * step);
  return { s, step };
}

/* THE PATTERN of a frame model, in print mm above the plate: beads as
   { kind: 'bead', c: [x, y], z, r, seq, path, side } and leaves as band
   spines for the relief's bandSolid, { kind: 'leaf-tip', spine, prof,
   depth, seq, path, side }. p carries the controls. */
export function bandPatternFor(model, { triBudget = Infinity, usedTris = 0 } = {}) {
  const p = model.params;
  if (!p.bandPattern || p.bandPattern === 'none') return null;
  const fb = model.frameBox || model.box, scale = p.printHeight / (fb.y1 - fb.y0);
  const reliefDepth = p.moldingDepth * scale * p.reliefScale;
  const prof = model.prof, F = MIN_FEATURE_MM;
  const W = p.moldingWidth * scale;             // the band, print mm
  const told = [];
  let size = p.bandSize, pitch = p.bandPitch;
  if (size < F) { told.push(`pattern size ${size.toFixed(2)} mm built at the ${F.toFixed(1)} mm assumed minimum feature`); size = F; }
  const edges = p.bandEdge === 'both' ? ['inner', 'outer'] : [p.bandEdge === 'outer' ? 'outer' : 'inner'];
  const beads = [], leaves = [];
  let tris = usedTris, runs = 0;
  for (const edge of edges) {
    const sign = edge === 'inner' ? 1 : -1;
    if (p.bandPattern === 'beading') {
      let r = size / 2;
      if (2 * r > W) { told.push(`beads ${size.toFixed(2)} mm across on a ${W.toFixed(2)} mm band — built ${W.toFixed(2)} mm across`); r = W / 2; }
      let pt = pitch;
      if (pt > BEAD_FUSE * r) { told.push(`bead pitch ${pitch.toFixed(2)} mm held at ${(BEAD_FUSE * r).toFixed(2)} mm (${BEAD_FUSE} × the radius) — beads further apart print a knife-edge web`); pt = BEAD_FUSE * r; }
      if (pt < r) { told.push(`bead pitch ${pitch.toFixed(2)} mm raised to ${r.toFixed(2)} mm (the radius) — closer, the beads read as a rope`); pt = r; }
      // the column: the bead's edge flush with the band's edge
      const dPrint = sign * (W / 2 - r), f = dPrint / W + 0.5;
      const seat = profileMax(prof, f - r / W, f + r / W) * reliefDepth;
      const z = seat + r - F;                    // the bottom embeds the band by the feature
      for (const path of patternPaths(model, scale, dPrint / scale)) {
        const st = stations(path, pt, { endClear: r, last: true });
        const right = st.s.map((s, k) => ({ kind: 'bead', c: atS(path.ext, path.cum, path.off + s).p, z, r, seq: k, path: `${edge}:${path.id}`, side: 'R', step: st.step }));
        const mine = right.length * 2 * 2 * PATTERN_LON * (PATTERN_LAT - 1);
        if (tris + mine > triBudget) { told.push(`the ${edge} ${path.id} beading is not built — it would take the relief to ${(tris + mine).toLocaleString('en-US')} triangles, past the ${triBudget.toLocaleString('en-US')} budget`); continue; }
        tris += mine; runs++;
        beads.push(...right);
        // THE MIRROR: x negated, to the double; a bead on the axis is its own
        for (const b of right) if (Math.abs(b.c[0]) > 1e-9) beads.push({ ...b, c: [-b.c[0], b.c[1]], side: 'L' });
      }
    } else {
      const len = size;
      let Wl = LEAF_ASPECT * len;
      if (Wl > W) { told.push(`leaf tips ${Wl.toFixed(2)} mm wide on a ${W.toFixed(2)} mm band — built ${W.toFixed(2)} mm wide`); Wl = W; }
      let pt = pitch;
      if (pt > LEAF_RUN_PITCH_MAX * len) { told.push(`leaf pitch ${pitch.toFixed(2)} mm held at ${(LEAF_RUN_PITCH_MAX * len).toFixed(2)} mm (${LEAF_RUN_PITCH_MAX} × the leaf) — further apart the run parts; a laurel run overlaps`); pt = LEAF_RUN_PITCH_MAX * len; }
      if (pt < LEAF_RUN_PITCH_MIN * len) { told.push(`leaf pitch ${pitch.toFixed(2)} mm raised to ${(LEAF_RUN_PITCH_MIN * len).toFixed(2)} mm (${LEAF_RUN_PITCH_MIN} × the leaf) — closer, a third leaf would stack and the run would climb`); pt = LEAF_RUN_PITCH_MIN * len; }
      const dPrint = sign * (W / 2 - Wl / 2), f = dPrint / W + 0.5;
      const depth = Math.max(F, LEAF_RELIEF * Wl * p.ornProjection);   // the blade's crown, floored at the feature
      // a straight laurel leaf, PATTERN_LEAF_STATIONS stations along it
      const lf = buildLeaf({ length: len, width: Wl, side: 1, curl: 0, lobes: LEAF_RUN_LOBES, step: len / PATTERN_LEAF_STATIONS, minStations: PATTERN_LEAF_STATIONS });
      const prof2 = leafProfile();
      // the seat per row: the profile's highest z under the row's own width
      const seatRow = lf.w.map((w) => profileMax(prof, f - w / 2 / W, f + w / 2 / W) * reliefDepth);
      const over = len - pt;
      for (const path of patternPaths(model, scale, dPrint / scale)) {
        const st = stations(path, pt, { start: -LEAF_RUN_AXIS_CROSS * len, endClear: len, last: true, seamHalf: true });
        const right = st.s.map((s0, k) => {
          // the leaf laid along the path, its base at s0, tip at s0 + len
          const pts = [], nrm = [];
          for (let i = 0; i < lf.pts.length; i++) { const { p: q, tan } = atS(path.ext, path.cum, path.off + s0 + lf.pts[i][0]); pts.push(q); nrm.push([-tan[1], tan[0]]); }
          // THE STACK: the base lies over the previous leaf's tip — a lift of
          // one crown at the base, falling to the molding where the previous
          // leaf ends; the first leaf of a run crosses its own mirror base
          // over base and takes none
          const lift = lf.u.map((x, i) => seatRow[i] + (k > 0 ? depth * Math.max(0, 1 - x / Math.max(1e-9, over)) : 0));
          const spine = { id: `pat-${edge}-${path.id}-${k}`, pts, nrm, bandWidth: Wl, widthScale: lf.w.map((x) => x / Wl), baseLift: lift };
          return { kind: 'leaf-tip', spine, prof: prof2, depth, seq: k, path: `${edge}:${path.id}`, side: 'R', step: st.step, len, s0 };
        });
        const mine = right.reduce((a, l) => a + 2 * solidTriBound(l.spine.pts.length, prof2.x.length), 0);
        if (tris + mine > triBudget) { told.push(`the ${edge} ${path.id} leaf run is not built — it would take the relief to ${(tris + mine).toLocaleString('en-US')} triangles, past the ${triBudget.toLocaleString('en-US')} budget`); continue; }
        tris += mine; runs++;
        leaves.push(...right);
        for (const l of right) leaves.push({ ...l, side: 'L', spine: { ...l.spine, id: l.spine.id + 'L', pts: mirrorPts(l.spine.pts), nrm: l.spine.nrm.map(([x, y]) => [-x, y]) } });
      }
    }
  }
  return { kind: p.bandPattern, edges, size, pitch, beads, leaves, runs, told, scale, tris: { bound: tris, budget: triBudget } };
}

/* The model with its band pattern (frame.js applies it after the ornament);
   off, the model itself. */
export function withPattern(model, opts = {}) {
  // the budget is the whole relief's: what the frame and the ornament hold
  const frameTris = model.spines.reduce((a, sp) => a + solidTriBound(sp.pts.length + 2, model.prof.x.length + 1), 0);
  const pat = bandPatternFor(model, { triBudget: FRAME_TRI_BUDGET, usedTris: model.ornament ? model.ornament.tris.bound : frameTris, ...opts });
  return pat ? { ...model, pattern: pat } : model;
}
