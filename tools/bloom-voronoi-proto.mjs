/* ===================================================================
   bloom-voronoi-proto.mjs — A VORONOI INFILL PROTOTYPE ON THE REAL PETAL SURFACE.
   AN INSTRUMENT, NOT WIRED TO ANY GATE. It changes nothing in the repository's
   geometry: it imports `bloom-geometry.js` unchanged, asks `petalSurface(u, v)` for
   the mid-surface, and emits its own scratch mesh beside the shipped one so the
   look and the cost of an infill can be ruled on BEFORE any builder is touched.

     node tools/bloom-voronoi-proto.mjs [--out <dir>] [--quick]

   WHAT IT BUILDS. Construction B from the first discovery (`docs/bloom-infill-
   voronoi-salvage.md`): the solid basal zone (foot + root blend, u <= ROOT_BLEND_END,
   one row of overlap) as the shipped lattice, and above it ONE shell whose two skins
   are tiled by the cells' annuli — each cell contributes the ring between its
   straight outer polygon (the wall centrelines, shared with its neighbours exactly)
   and its hole outline; rims only along the outline and around each hole. The plan
   is computed FLAT (x along the spine in mm, y across in mm), clipped against the
   petal's own `halfWidthAt`, and mapped through (u, v) onto the surface.

   TWO FIELDS, so the second can be judged against the first:
     LEGACY   — isotropic metric, uniform spacing, plain Lloyd in the flat metric,
                straight polygon inset. The first sheet, which Eva rejected as
                angular and floating.
     SALVAGE  — Eva's three changes: (1) rounded hole outlines (fillets on the inset,
                so no wall junction carries a hard vertex); (2) an ANISOTROPIC metric
                stretched along the midrib, with Lloyd run IN THAT METRIC and weighted
                by the density; (3) GRADED density — cells shrink toward the tip with
                the local half-width, and cells near the base narrow and lose their
                holes below a converging V so the pattern tapers into the solid base
                instead of ending on a line.

   WHAT IT MEASURES, per (field, N, wall): the built solid apex cap in mm and its
   floor from the outline alone; real holes (>= MIN_FEATURE_MM across) and the median
   hole; the wall fraction of the lamina; the anisotropy actually achieved at mid-blade
   (principal second moments of the cells with centroids at u 0.45-0.75); triangles;
   boundary edges, the vertex-welded shell count and a voxel flood fill at 0.6 and
   0.3 mm.

   WHAT IT DOES NOT COVER, stated here rather than left to be discovered:
     - it is NOT the emitter that would ship. `emitPanel` is untouched; the ring
       bridge here is a prototype's, and the two non-manifold edges it leaves at the
       overlap row are the panel weld's own signature, not a topology problem.
     - the census is a scratch one (sorted-pair edges, exact-position weld). It is
       not `analyzeStl` and quotes no gate.
     - the plan is flat-computed. On the flat default that is exact (stretch 1.000);
       under cup it stretches cells across the width (measured 3.0x at cup 1.2 in the
       first discovery) — the arc-length-metric plan is the build's, not this tool's.
     - fringe and cleft are excluded by ruling; lobes clip by construction and are
       not exercised here.
     - it reads ONE ring (the first slot) for the single-petal cells, and every slot
       for the whole-bloom mesh; the lattice, the ladder and the foot are the shipped
       builder's own captured rows.
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as G from '../bloom-geometry.js';
import { DEFAULTS } from '../bloom-registry.js';
import { firstSlot } from './bloom-first-slot.mjs';

const IS_MAIN = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };

export const WALL_DEFAULT = 1.0;              // mm — MIN_FEATURE_MM, the printable wall

/* THE BOUNDARY'S OWN OWNER, AND WHY `U0` IS NO LONGER IT.

   `U0` IS `ROOT_BLEND_END` AND IT WAS NEVER THE INFILL'S. It is a STATION ON
   THE OUTLINE with seven other readers — `rootBlend`'s own decay, the lobes'
   `laminaStart`, A5's excluded region, `bloom-sagitta.mjs`'s base bucket and
   the sepal builder's four row filters — and it says where the foot's width
   FLOOR decays to nothing, which is 0.30. The outline stops being the root
   blend's five times lower than that, at the term handover the geometry
   declares (u 0.0579388 on the default). So the sentence this file opened
   with — "the solid basal zone (foot + root blend, u <= ROOT_BLEND_END)" —
   described a region five times longer than the one it named, and the panel
   Eva has been objecting to is the difference.

   IT IS KEPT EXPORTED UNDER ITS OWN NAME, because #250/#251/#252 quote it by
   name and their published figures must keep reproducing; every call site
   that depends on it now passes it EXPLICITLY, so the dependency is visible
   rather than a default. Nothing here defaults to it any more.

   `laminaFloorU` IS THE FLOOR AND IT IS DERIVED FROM A LENGTH. It reads the
   profile's own MODE-FREE break list for the station where the ROOT_BLEND term
   stops owning the outline. WHAT THAT STATION IS DEPENDS ON THE PETAL, and both
   cases are asserted by `--control`'s K1 rather than assumed:

     * where the foot OWNS the outline it hands over to the CORE, and the station
       is a genuine local MINIMUM — the blade's WAIST, the narrowest section it
       has between the foot and the tip (5.164 mm across on the default against
       6.400 at the foot and 16.000 at its widest). Below it the outline turns and
       widens again toward the foot, and a cell region containing that turn is
       measurably WORSE: `docs/bloom-infill-lamina-floor.md` §2.
     * where the foot is at or under the print floor it hands over to TIP_FLOOR at
       u ~ 0 (`footDelicacy` 0.25, whose `footHalf` is exactly TIP_HALF_MM), the
       outline is NON-DECREASING throughout and there is no waist at all. This
       floor then reads ~0 and `wallFloorU` below is what binds.

   MODE-FREE BY CONSTRUCTION AND NOT BY OBSERVATION. It is
   `laminaSlopeBreaks`, not `slopeBreaks`: the second floors on the
   accumulator's own `tipFloor`, which differs live and export, and on
   `footDelicacy` 0.25 it names the handover at u 0.015720245 LIVE and 0
   EXPORT. Which rows carry the solid panel is TOPOLOGY, and this project has
   refused a mode-dependent topology five times. */
export const U0 = G.ROOT_BLEND_END;          // RETIRED AS THE DEFAULT (see above); still the root blend's own station
export function laminaFloorU(ctx) {
  const b = ctx.surface.profile.laminaSlopeBreaks().find((x) => x.from === 'ROOT_BLEND');
  return b ? b.u : 0;
}
/* THE SECOND FLOOR, AND THE MUST-FAIL IS WHAT FOUND IT. A region that starts where
   the blade is narrower than two wall insets plus a printable hole carries no hole at
   all: the outline edges are inset by the FULL wall from each side (the established
   constraint — a half-wall lip along the margin is under the print floor), so the
   hole available across the region's base edge is `2 * (h(xB) - wall)` and it must
   clear `MIN_FEATURE_MM`.

   IT BINDS ON A THIN FOOT AND NOWHERE ELSE, measured over eighteen states: at
   `footDelicacy` 0.25 the blade is 1.600 mm across at u = 0 — narrower than two
   1.0 mm walls — and the waist has vanished (the foot never owns the outline), so the
   waist alone would put the region's start at row 4 where no hole can exist. On every
   other state measured the outline already clears it at u = 0 and this floor reads 0.
   It was NOT predicted: the first cut of this feature had the waist alone, and
   `--control`'s K2 fired on `footDelicacy` 0.25 — the petal that was supposed to be
   the control for "no waist, no reversal" and instead turned out to have a different
   floor. Scanned UPWARD FROM THE WAIST because `h` is not monotone below it. */
export function wallFloorU(ctx, wall = WALL_DEFAULT) {
  const hAt = (u) => ctx.surface.profile.halfWidthAt(u);
  const need = wall + G.MIN_FEATURE_MM / 2;
  const from = laminaFloorU(ctx);
  const N = 4096;
  for (let i = 0; i <= N; i++) { const u = from + (1 - from) * i / N; if (hAt(u) >= need) return u; }
  return 1;
}
/* THE FLOOR IS THE STRICTER OF THE TWO, and each is a LENGTH with its own owner —
   the outline's term handover and the printable gap. Neither is a row count. */
export function basalFloorU(ctx, wall = WALL_DEFAULT) { return Math.max(laminaFloorU(ctx), wallFloorU(ctx, wall)); }
export const ANISO = 2.2;                     // the salvage metric's stretch along the midrib
export const LLOYD_PASSES = 4;
export const FILLET_MM = 0.8;                 // target fillet radius on every hole corner
export const CONVERGE_FRACTION = 0.10;        // the basal V reaches this fraction of the length up the margins
export const BASE_NARROWING = 0.75;           // cells at the base are this fraction of the mid-blade spacing
export const BASE_REACH = 0.30;               // over this fraction of the length the base narrowing relaxes back to the tip law
export const TIP_GAMMA = 1.0;                 // spacing follows halfWidth^gamma toward the tip
export const AXIS_SHARE = 0.3;                // share of the seeds placed ON the midrib (the flower's own law), so the apex and the base get one axial cell each
export const SEED = 7;

/* ---------------- plan geometry ---------------- */
export function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function clipHalfPlane(poly, a, b, c) {   // keep a*x + b*y + c <= 0
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const P = poly[i], Q = poly[(i + 1) % poly.length];
    const fp = a * P.x + b * P.y + c, fq = a * Q.x + b * Q.y + c;
    if (fp <= 0) out.push(P);
    if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)) { const t = fp / (fp - fq); out.push({ x: P.x + (Q.x - P.x) * t, y: P.y + (Q.y - P.y) * t }); }
  }
  return out;
}
export function pointInPoly(x, y, poly) { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside; } return inside; }
export function polyArea(p) { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a.x * b.y - b.x * a.y; } return Math.abs(s) / 2; }
export function polyCentroid(p) { let A = 0, cx = 0, cy = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; const w = a.x * b.y - b.x * a.y; A += w; cx += (a.x + b.x) * w; cy += (a.y + b.y) * w; } A /= 2; if (Math.abs(A) < 1e-12) { let x = 0, y = 0; for (const q of p) { x += q.x; y += q.y; } return { x: x / p.length, y: y / p.length }; } return { x: cx / (6 * A), y: cy / (6 * A) }; }
export function ccw(poly) { let s = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a.x * b.y - b.x * a.y; } return s < 0 ? poly.slice().reverse() : poly; }
export function dedupe(poly, eps = 1e-6) { const o = []; for (const p of poly) { const l = o[o.length - 1]; if (!l || Math.hypot(l.x - p.x, l.y - p.y) > eps) o.push(p); } if (o.length > 1 && Math.hypot(o[0].x - o[o.length - 1].x, o[0].y - o[o.length - 1].y) <= eps) o.pop(); return o; }
export function outlinePoly(hAt, xLo, xHi, n = 240) { const top = [], bot = []; for (let i = 0; i <= n; i++) { const x = xLo + ((xHi - xLo) * i) / n; const h = hAt(x); top.push({ x, y: h }); bot.push({ x, y: -h }); } return top.concat(bot.reverse()); }
/* Voronoi cells by half-plane clipping. `metric` scales x before the bisectors are
   formed: d^2 = ((dx)/a)^2 + dy^2 — an anisotropic Voronoi is the isotropic one in
   scaled coordinates, and the cells come back unscaled. */
export function cellsFor(seeds, outline, a = 1) {
  const S = seeds.map((s) => ({ x: s.x / a, y: s.y })), O = outline.map((p) => ({ x: p.x / a, y: p.y }));
  const out = [];
  for (let i = 0; i < S.length; i++) {
    let poly = O.slice(); const s = S[i];
    for (let j = 0; j < S.length && poly.length >= 3; j++) { if (j === i) continue; const q = S[j]; const A = q.x - s.x, B = q.y - s.y; const C = -(A * (s.x + q.x) / 2 + B * (s.y + q.y) / 2); poly = clipHalfPlane(poly, A, B, C); }
    out.push(poly.length >= 3 ? poly.map((p) => ({ x: p.x * a, y: p.y })) : null);
  }
  return out;
}
export function insetConvex(poly, d, dOf = null) {           // dOf(i) may give a per-edge distance (edge i runs P[i] -> P[i+1] on the CCW polygon)
  let out = poly.slice(); const n = poly.length; const P = ccw(poly);
  for (let i = 0; i < n && out.length >= 3; i++) {
    const A = P[i], B = P[(i + 1) % n]; const ex = B.x - A.x, ey = B.y - A.y, L = Math.hypot(ex, ey); if (L < 1e-9) continue;
    const nx = ey / L, ny = -ex / L;                                        // outward normal of a CCW polygon
    out = clipHalfPlane(out, nx, ny, -(nx * A.x + ny * A.y) + (dOf ? dOf(A, B) : d));
  }
  out = dedupe(out); return out.length >= 3 ? out : null;
}
export function inradiusConvex(poly) {
  if (!poly || poly.length < 3) return 0;
  const c = polyCentroid(poly); let best = 0; const cand = [c];
  for (let k = 0; k < 60; k++) { const a = poly[k % poly.length]; const t = ((k % 6) + 1) / 7; cand.push({ x: c.x + (a.x - c.x) * t, y: c.y + (a.y - c.y) * t }); }
  for (const p of cand) { let m = Infinity; for (let i = 0; i < poly.length; i++) { const A = poly[i], B = poly[(i + 1) % poly.length]; const ex = B.x - A.x, ey = B.y - A.y, L = Math.hypot(ex, ey) || 1e-9; m = Math.min(m, Math.abs(ex * (p.y - A.y) - ey * (p.x - A.x)) / L); } best = Math.max(best, m); }
  return best;
}
/* Fillet every corner of a convex CCW polygon: an arc of radius r tangent to both edges,
   r limited so the tangent points stay within each edge. The result is the SMOOTH offset
   curve the salvage asks for — no hard vertex survives. */
export function filletPolygon(poly, r, perArc = 5) {
  const P = ccw(dedupe(poly)); const n = P.length; if (n < 3) return P;
  const out = [];
  for (let i = 0; i < n; i++) {
    const A = P[(i - 1 + n) % n], Q = P[i], B = P[(i + 1) % n];
    const ax = A.x - Q.x, ay = A.y - Q.y, bx = B.x - Q.x, by = B.y - Q.y; const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
    const ua = [ax / la, ay / la], ub = [bx / lb, by / lb];
    const cosT = Math.max(-1, Math.min(1, ua[0] * ub[0] + ua[1] * ub[1])); const theta = Math.acos(cosT);   // interior angle
    if (theta > Math.PI - 1e-3) { out.push(Q); continue; }
    const tMax = 0.45 * Math.min(la, lb); let rr = r; let t = rr / Math.tan(theta / 2); if (t > tMax) { t = tMax; rr = t * Math.tan(theta / 2); }
    const T1 = { x: Q.x + ua[0] * t, y: Q.y + ua[1] * t }, T2 = { x: Q.x + ub[0] * t, y: Q.y + ub[1] * t };
    const bis = [ua[0] + ub[0], ua[1] + ub[1]]; const bl = Math.hypot(...bis) || 1e-9; const dC = rr / Math.sin(theta / 2);
    const C = { x: Q.x + (bis[0] / bl) * dC, y: Q.y + (bis[1] / bl) * dC };
    const a1 = Math.atan2(T1.y - C.y, T1.x - C.x), a2raw = Math.atan2(T2.y - C.y, T2.x - C.x);
    let da = a2raw - a1; while (da <= 0) da += 2 * Math.PI; while (da > 2 * Math.PI) da -= 2 * Math.PI;   // on a CCW polygon the fillet arc runs CCW about C from T1 to T2, and it is the SHORT arc (< pi) at a convex corner
    for (let k = 0; k <= perArc; k++) { const a = a1 + da * k / perArc; out.push({ x: C.x + rr * Math.cos(a), y: C.y + rr * Math.sin(a) }); }
  }
  return dedupe(out);
}
/* Principal-axis ratio of a polygon's area moments — how elongated a cell is, and along what. */
export function elongation(poly) {
  const c = polyCentroid(poly); let Ixx = 0, Iyy = 0, Ixy = 0, A = 0;
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; const x0 = a.x - c.x, y0 = a.y - c.y, x1 = b.x - c.x, y1 = b.y - c.y; const w = x0 * y1 - x1 * y0; A += w / 2; Ixx += w * (x0 * x0 + x0 * x1 + x1 * x1) / 12; Iyy += w * (y0 * y0 + y0 * y1 + y1 * y1) / 12; Ixy += w * (x0 * y1 + 2 * x0 * y0 + 2 * x1 * y1 + x1 * y0) / 24; }
  const s = A < 0 ? -1 : 1; Ixx *= s; Iyy *= s; Ixy *= s;
  const tr = Ixx + Iyy, det = Ixx * Iyy - Ixy * Ixy; const disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
  const l1 = tr / 2 + disc, l2 = Math.max(1e-12, tr / 2 - disc);
  const ang = 0.5 * Math.atan2(2 * Ixy, Ixx - Iyy);                          // principal axis direction
  return { ratio: Math.sqrt(l1 / l2), alongX: Math.abs(Math.cos(ang)) };
}

/* ---------------- the petal ---------------- */
class Acc { constructor() { this.pos = []; } tri(a, b, c) { this.pos.push(...a, ...b, ...c); } quad(a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); } get tris() { return this.pos.length / 9; } }
const add = (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
const f6 = (x) => { const r = Math.round(x * 1e6) / 1e6; return (r === 0 ? 0 : r).toFixed(6); };

export function context(set = {}, cap = null) {
  const st = { ...DEFAULTS, ...set };
  const acc = new G.MeshBuilder({ exportMode: true, captureGrid: true });
  const { ring, slot } = firstSlot(st, acc);
  return slotContext(st, ring, slot, acc, cap);
}
export function slotContext(st, ring, slot, acc, cap = null) {
  const surface = G.petalSurface(st, ring, slot, cap, acc);
  const a2 = new G.MeshBuilder({ exportMode: true, captureGrid: true });
  const p = G.buildPetalInto(a2, st, ring, slot, cap, true);
  return { st, ring, slot, surface, rows: p.grid[0].rows, t: surface.t, L: surface.length, plainTris: a2.triangleCount, frame: { dir: surface.dir, nrm: surface.nrm, base: surface.base } };
}
/* WHERE THE SOLID BASAL ZONE ENDS. `splitRow` SNAPS TO THE NEAREST emitted row,
   which is the mechanism this file always used for an explicit target: the split
   is a row index, so a target between two stations has to land on one of them.
   Only the SPLIT moves — the field's own metric, seeding, relaxation, grading,
   fillet and wall law are untouched, and they read their own region through `xB`
   exactly as before. */
function splitRow(ctx, target) { let m = 0, best = Infinity; for (let i = 0; i < ctx.rows.length; i++) { const d = Math.abs(ctx.rows[i].u - target); if (d < best) { best = d; m = i; } } return m; }

/* THE FEET ARE COUNTED OFF THE ROWS AND NOT TYPED. They are the leading rows the
   builder emits at u = 0 — three on every state measured, and `bloom-infill-base-
   panel.mjs` restates that 3 as `measureWall`'s own. A second copy of a number two
   files already hold is the duplicate-expression defect §9b(i) names, so this one
   is read off the data it is about and cannot drift. */
function footRows(ctx) { let n = 0; while (n < ctx.rows.length && ctx.rows[n].u === 0) n++; return n; }

/* THE FLOOR'S OWN ROW, AND IT IS NOT A NEAREST-SNAP. The cell region starts one
   row BELOW the split (`xB = rows[mSplit - 1].u`), so the row that has to clear
   the floor is the OVERLAP row and not the panel's top. A nearest-snap to the
   floor lands on the wrong side of it: measured on the default, snapping to the
   waist at u 0.0579388 gives row 5, whose cells start at u 0.0357143 — 0.022
   BELOW the floor, which is the one thing the floor exists to prevent. So this
   is the LOWEST row whose own overlap row is at or above the floor, which is a
   statement about the region rather than about the nearest station.

   AND IT NEVER EATS THE FEET. The three rows at u = 0 are the overhanging feet;
   a panel that is feet alone has no blade row to weld its overlap to, and the
   vertex-welded shell count goes 1 -> 2 there on every state measured. So the
   split is floored at one row past the feet — three feet and one blade row, which
   is exactly what the seam-shifted probe (`seamStep` 4) already builds and which
   measures clean. */
function floorRow(ctx, floorU) {
  const first = footRows(ctx) + 1;
  for (let m = first; m < ctx.rows.length; m++) if (ctx.rows[m - 1].u >= floorU - 1e-12) return m;
  return ctx.rows.length - 1;
}
/* THE SHIPPED ANSWER: an explicit `u0` snaps as it always did; with none, the
   boundary is the FLOOR — as low as the blade's own waist allows, which is what
   Eva ruled for after the #252 sheet. It is DERIVED per state and there is no
   constant to be wrong: at the shipping default it lands on row 7, on
   `petalWidth` 30 (whose waist is lower) on row 6, and on the seam-shifted
   `petalTilt` 75 x `petalLength` 20 x `sheetThickness` 2.40 on row 4, where the
   ladder leaves no blade row below the waist at all. */
export function basalSplit(ctx, opts = {}, wall = WALL_DEFAULT) {
  return opts.u0 === undefined || opts.u0 === null ? floorRow(ctx, basalFloorU(ctx, opts.wall ?? wall)) : splitRow(ctx, opts.u0);
}
function mapPt(ctx, x, y) { const u = Math.min(1, Math.max(0, x / ctx.L)); const hh = ctx.surface.profile.halfWidthAt(u); const v = Math.max(-1, Math.min(1, hh > 1e-9 ? y / hh : 0)); return ctx.surface.at(u, v); }

/* Shared: classify every cell edge as OUTLINE (in one cell) or WALL (in two), exactly, by key. */
function classify(cells) {
  const ek = (a, b) => { const ka = `${f6(a.x)},${f6(a.y)}`, kb = `${f6(b.x)},${f6(b.y)}`; return ka < kb ? ka + '|' + kb : kb + '|' + ka; };
  const count = new Map(); for (const c of cells) for (let i = 0; i < c.length; i++) { const k = ek(c[i], c[(i + 1) % c.length]); count.set(k, (count.get(k) || 0) + 1); }
  return { isOutlineEdge: (a, b) => (count.get(ek(a, b)) || 0) < 2 };
}
function simplifyOutlineRuns(cells, onOut) {
  return cells.map((c) => { let out = dedupe(c); let changed = true; while (changed && out.length > 3) { changed = false; for (let i = 0; i < out.length; i++) { const P = out[(i - 1 + out.length) % out.length], Q = out[i], R = out[(i + 1) % out.length]; if (!(onOut(P) && onOut(Q) && onOut(R))) continue; const ex = R.x - P.x, ey = R.y - P.y, l = Math.hypot(ex, ey) || 1e-9; const dev = Math.abs(ex * (Q.y - P.y) - ey * (Q.x - P.x)) / l; if (dev < 0.03) { out.splice(i, 1); changed = true; break; } } } return ccw(out); });
}

/* LEGACY field — the first prototype's: isotropic, uniform, plain Lloyd, no fillet. */
export function fieldLegacy(ctx, N, seed = SEED, opts = {}) {
  const { rows, L, surface } = ctx; const h = (x) => surface.profile.halfWidthAt(x / L);
  const mSplit = basalSplit(ctx, opts); const uOv = rows[mSplit - 1].u; const xB = uOv * L;
  const outline = outlinePoly(h, xB, L, 240); const rng = mulberry32(seed);
  const seeds = []; const target = Math.ceil(N / 2); let guard = 0;
  while (seeds.length < target && guard < 5000) { let best = null, bestD = -1; for (let c = 0; c < 12; c++) { guard++; const x = xB + (L - xB) * rng(); const hh = h(x); if (hh < 0.3) continue; const y = hh * 0.95 * rng(); if (!pointInPoly(x, y, outline)) continue; let d = 1e9; for (const s of seeds) { d = Math.min(d, (s.x - x) ** 2 + (s.y - y) ** 2, (s.x - x) ** 2 + (-s.y - y) ** 2); } d = Math.min(d, (2 * y) ** 2); if (d > bestD) { bestD = d; best = { x, y }; } } if (best) seeds.push(best); }
  let all = seeds.flatMap((s) => [s, { x: s.x, y: -s.y }]);
  for (let p = 0; p < LLOYD_PASSES; p++) { const cells = cellsFor(all, outline, 1); all = all.map((s, i) => (cells[i] ? polyCentroid(cells[i]) : s)); for (let i = 0; i < all.length; i += 2) { const a = all[i], b = all[i + 1]; const x = (a.x + b.x) / 2, y = (a.y - b.y) / 2; all[i] = { x, y }; all[i + 1] = { x, y: -y }; } }
  const onOut = (p, tol = 0.02) => Math.abs(Math.abs(p.y) - h(p.x)) < tol || Math.abs(p.x - xB) < 1e-6 || Math.abs(p.x - L) < 1e-6;
  const cells = simplifyOutlineRuns(cellsFor(all, outline, 1).filter(Boolean), onOut);
  return { kind: 'legacy', mSplit, uOv, xB, outline, cells, h, holeOf: (c, w) => insetConvex(c, w / 2), holeMask: () => true, aniso: 1, passes: LLOYD_PASSES, metric: 'flat', ...classify(cells) };
}

/* SALVAGE field — Eva's three changes. */
export function fieldSalvage(ctx, N, opts = {}) {
  const { rows, L, surface } = ctx; const h = (x) => surface.profile.halfWidthAt(x / L);
  const a = opts.aniso ?? ANISO, passes = opts.passes ?? LLOYD_PASSES, relaxMetric = opts.relaxMetric ?? 'aniso', cellMetric = opts.cellMetric ?? 'aniso', seed = opts.seed ?? SEED;
  /* THE GRADING'S FOUR NUMBERS, each defaulting to its own constant so every prior call is
     unchanged term for term. `converge` is the basal V's reach; `baseNarrow` and `baseReach`
     are the BASE's own rate and how far it relaxes over, INDEPENDENT of `tipGamma`, which is
     the tip's. The base term multiplies the tip term, so lowering `baseNarrow` shrinks cells
     toward the base without touching what the tip law does. */
  const converge = opts.converge ?? CONVERGE_FRACTION, baseNarrow = opts.baseNarrow ?? BASE_NARROWING, baseReach = opts.baseReach ?? BASE_REACH, tipGamma = opts.tipGamma ?? TIP_GAMMA;
  const mSplit = basalSplit(ctx, opts); const uOv = rows[mSplit - 1].u; const xB = uOv * L;
  const outline = outlinePoly(h, xB, L, 240);
  let hMax = 0; for (let i = 0; i <= 200; i++) hMax = Math.max(hMax, h(xB + (L - xB) * i / 200));
  const hB = h(xB); const Lc = converge * L;
  const vAt = (y) => xB + Lc * Math.pow(Math.min(1, Math.abs(y) / hB), 1.5);       // the basal V: the solid zone reaches higher at the margins
  /* relative spacing: shrinks toward the tip with the half-width, narrows toward the base */
  const spacing = (x) => { const tip = Math.pow(Math.max(0.05, h(x) / hMax), tipGamma); const base = baseNarrow + (1 - baseNarrow) * Math.min(1, Math.max(0, (x - xB) / (baseReach * L))); return tip * base; };
  const rho = (x) => 1 / (spacing(x) ** 2);
  const rng = mulberry32(seed);
  const nAxis = Math.max(1, Math.round(N * AXIS_SHARE)); const axis = []; let guard = 0;
  const d2 = (p, q) => ((p.x - q.x) / a) ** 2 + (p.y - q.y) ** 2;
  while (axis.length < nAxis && guard < 8000) { let best = null, bestD = -1; for (let c = 0; c < 14; c++) { guard++; const x = xB + (L - xB) * rng(); if (h(x) < 0.3) continue; let d = 1e9; for (const s of axis) d = Math.min(d, d2(s, { x, y: 0 })); const score = d / (spacing(x) ** 2); if (score > bestD) { bestD = score; best = { x, y: 0 }; } } if (best) axis.push(best); }
  const seeds = []; const target = Math.ceil((N - nAxis) / 2); guard = 0;
  while (seeds.length < target && guard < 8000) { let best = null, bestD = -1; for (let c = 0; c < 14; c++) { guard++; const x = xB + (L - xB) * rng(); const hh = h(x); if (hh < 0.3) continue; const y = hh * 0.95 * rng(); if (!pointInPoly(x, y, outline)) continue; let d = 1e9; for (const s of seeds) d = Math.min(d, d2(s, { x, y }), d2({ x: s.x, y: -s.y }, { x, y })); for (const s of axis) d = Math.min(d, d2(s, { x, y })); d = Math.min(d, (2 * y) ** 2); const score = d / (spacing(x) ** 2); if (score > bestD) { bestD = score; best = { x, y }; } } if (best) seeds.push(best); }
  let all = axis.concat(seeds.flatMap((s) => [s, { x: s.x, y: -s.y }]));
  /* density-weighted centroid: quadrature over the fan triangles of the cell */
  const wCentroid = (c) => { const g = polyCentroid(c); let W = 0, X = 0, Y = 0; for (let i = 0; i < c.length; i++) { const A = c[i], B = c[(i + 1) % c.length]; const area = Math.abs((A.x - g.x) * (B.y - g.y) - (B.x - g.x) * (A.y - g.y)) / 2; for (const [wa, wb, wc] of [[2 / 3, 1 / 6, 1 / 6], [1 / 6, 2 / 3, 1 / 6], [1 / 6, 1 / 6, 2 / 3]]) { const x = wa * g.x + wb * A.x + wc * B.x, y = wa * g.y + wb * A.y + wc * B.y; const w = area / 3 * rho(x); W += w; X += w * x; Y += w * y; } } return W > 0 ? { x: X / W, y: Y / W } : g; };
  for (let p = 0; p < passes; p++) {
    const cells = cellsFor(all, outline, relaxMetric === 'aniso' ? a : 1);        // 'flat' is the control Eva named: relaxing in the flat metric undoes the stretch
    all = all.map((s, i) => (cells[i] ? wCentroid(cells[i]) : s));
    for (let i = 0; i < nAxis; i++) all[i] = { x: all[i].x, y: 0 };
    for (let i = nAxis; i + 1 < all.length; i += 2) { const A = all[i], B = all[i + 1]; const x = (A.x + B.x) / 2, y = (A.y - B.y) / 2; all[i] = { x, y }; all[i + 1] = { x, y: -y }; }
  }
  const onOut = (p, tol = 0.02) => Math.abs(Math.abs(p.y) - h(p.x)) < tol || Math.abs(p.x - xB) < 1e-6 || Math.abs(p.x - L) < 1e-6;
  const cells = simplifyOutlineRuns(cellsFor(all, outline, cellMetric === 'aniso' ? a : 1).filter(Boolean), onOut);
  /* the hole is the inset CLIPPED TO THE V (a convex region, so tangent half-planes at sampled y do it exactly enough), then filleted:
     a cell straddling the V keeps a hole that tapers into the solid base rather than losing it outright */
  const vClip = (poly) => { let out = poly; for (let k = -12; k <= 12 && out && out.length >= 3; k++) { const y0 = (k / 12) * hB; const dy = 1e-4; const slope = (vAt(y0 + dy) - vAt(y0 - dy)) / (2 * dy); /* keep x - vAt(y0) - slope*(y - y0) >= 0  ->  -x + slope*y + (vAt(y0) - slope*y0) <= 0 */ out = clipHalfPlane(out, -1, slope, vAt(y0) - slope * y0); } return out && out.length >= 3 ? dedupe(out) : null; };
  const cls = classify(cells);
  /* OUTLINE EDGES ARE INSET BY THE FULL WALL (the established constraint: a half-wall lip along the margin is under the print floor); shared walls by half, from each side */
  /* the region's own base edge (x = xB) lies over the solid base panel's overlap row, so it is not a margin: half a wall there, and the V decides the rest */
  const onBaseEdge = (A, B) => Math.abs(A.x - xB) < 1e-6 && Math.abs(B.x - xB) < 1e-6;
  const holeOf = (c, w) => { const inner = insetConvex(c, w / 2, (A, B) => (cls.isOutlineEdge(A, B) && !onBaseEdge(A, B) ? w : w / 2)); if (!inner) return null; const clipped = vClip(inner); return clipped ? filletPolygon(clipped, FILLET_MM) : null; };
  const holeMask = () => true;
  return { kind: 'salvage', mSplit, uOv, xB, outline, cells, h, holeOf, holeMask, aniso: a, passes, metric: relaxMetric, cellMetric, vAt, spacing, converge, baseNarrow, baseReach, tipGamma, hB, ...cls };
}

/* ---------------- emission (construction B) ---------------- */
function emitLattice(acc, top, bot) {
  const NR = top.length, NV = top[0].length;
  for (let i = 0; i < NR - 1; i++) for (let j = 0; j < NV - 1; j++) { acc.quad(top[i][j], top[i + 1][j], top[i + 1][j + 1], top[i][j + 1]); acc.quad(bot[i][j], bot[i][j + 1], bot[i + 1][j + 1], bot[i + 1][j]); }
  for (let i = 0; i < NR - 1; i++) { acc.quad(top[i][0], bot[i][0], bot[i + 1][0], top[i + 1][0]); acc.quad(top[i][NV - 1], top[i + 1][NV - 1], bot[i + 1][NV - 1], bot[i][NV - 1]); }
  for (let j = 0; j < NV - 1; j++) { acc.quad(top[0][j], top[0][j + 1], bot[0][j + 1], bot[0][j]); acc.quad(top[NR - 1][j], bot[NR - 1][j], bot[NR - 1][j + 1], top[NR - 1][j + 1]); }
}
/* `rowFrom` defaults to 0, so every existing caller is unchanged term for term. It is
   there for ONE reader: the PLAIN-LAMINA CONTROL over the cell region alone, which is
   what says whether a self-intersection the census finds on an infilled blade is the
   infill's or the PETAL'S OWN — at `petalRoll` 330 the shipped petal already folds
   (a declared census xfail), so an absolute bar there would be asking the emitter for
   something the surface itself does not satisfy. */
export function emitBase(acc, ctx, rowTo, rowFrom = 0) {
  const { rows, t } = ctx; const NV = rows[0].mid.length; const top = [], bot = [];
  for (let i = rowFrom; i <= rowTo; i++) { const r = rows[i]; const ht = [], hb = []; for (let j = 0; j < NV; j++) { const P = r.mid[j], n = r.normal[j]; ht.push(add(P, n, t / 2)); hb.push(add(P, n, -t / 2)); } top.push(ht); bot.push(hb); }
  emitLattice(acc, top, bot);
}
/* ---------------- THE CONFORMING TESSELLATION ----------------

   WHY IT EXISTS. `cutThrough` used to tessellate a solid cell as a FLAT FAN over
   the whole cell polygon and an annular one as a single angular merge-walk between
   the outer ring and the hole. A flat facet spanning several millimetres of a
   surface that WRAPS is a chord, and under `petalRoll` 330 — a shipped matrix row —
   the chord cuts through the tube: measured on the base tree, the worst emitted
   facet stands 2.4990 mm from the mid-surface it is supposed to be drawing, against
   0.5730 mm for the shipped lattice's own worst facet on the same state, and
   6.8717 against 0.6348 on ALL FORM MAX. Session S1 of `docs/bloom-infill-port-plan.md`.

   AND THE BASELINE FOUND A SECOND DEFECT THE BRIEF DOES NOT NAME: THE MERGE-WALK
   COVERS ITS OWN HOLE. Its `advA` arm emits `(a_i, a_{i+1}, b_j)` — two consecutive
   OUTER vertices and one inner one — so wherever an outer edge spans a wide angular
   sector about the hole's centroid the triangle reaches across the hole's own tip.
   Measured on the FLAT default, where no chord error is possible at all (the blade is
   planar there, and a straight plan chord maps to a straight 3-space line: 0.00000 mm
   over the probes), the cells alone still read 822 within-shell pairs against the
   plain lamina's 0 — coplanar overlap of a hole rim against a skin triangle that
   should not have been drawn over it. A facet covering the hole is a facet that
   should not exist, so it is the same sentence as the chord and is fixed here.

   THE CONSTRUCTION, in two independent halves.

   (1) TOPOLOGY — a plan triangulation that cannot cover a hole. A solid cell is a
   CENTROID fan (shorter spokes and better shapes than the old `O[0]` fan, and there
   is no hole to cover). An annular cell is cut into SECTORS: the hole is densified
   with the point where the ray from its own centroid through each outer vertex meets
   it, and the region between one outer EDGE and the inner arc below it is EAR-CLIPPED.
   Ear clipping triangulates a simple polygon using only that polygon's own vertices,
   so no triangle can leave it — which a fan from an outer corner does not guarantee,
   because a convex hole bulging into a wide sector can be cut by a chord whose two
   ends are both outside it. **THE DENSIFICATION IS ON THE INNER RING ONLY**: the
   outer ring is SHARED with the neighbouring cell and a point inserted there that the
   neighbour does not also generate is a crack.

   (2) GEOMETRY — deviation-driven subdivision, crack-free by construction. A plan
   edge is split at its MIDPOINT when its own measured chord deviation exceeds the
   tolerance, and each half is then asked the same question. So the points introduced
   on any plan edge are `splitPoints(A, B)` — a PURE FUNCTION OF THE UNORDERED PAIR —
   and two cells sharing a wall edge produce the same set on it whatever else they do.
   A triangle splits the edge with the greatest deviation and recurses; it stops only
   when all three of its edges are under the tolerance, so every edge is eventually
   taken to its own `splitPoints`. That is the whole crack-freeness argument and it
   does not depend on the order cells are visited in.

   THE MIDPOINT IS SAFE TO SHARE AND THE FLOOR IS NOT A DEPTH. `(a + b) / 2` is
   commutative in IEEE-754, so a midpoint is bit-identical from either side; and the
   recursion is floored on EDGE LENGTH rather than on recursion depth, because a depth
   is a property of the walk (two cells can reach one edge at different depths) while a
   length is a property of the edge. Fifth instance here of a discrete decision being
   taken from something that is not a property of the thing decided.

   THE TOLERANCE IS THE SHIPPED LATTICE'S OWN CHORD ERROR ON THE SAME STATE —
   `latticeChordDevMm`, measured on the rows `buildPetalInto` emitted, an owner the
   infill does not write. "Conforming" therefore means *the cell tessellation follows
   the surface at least as closely as the mesh that already ships*, which is a bar in
   millimetres that moves with the state rather than a constant to be wrong. It is not
   a fraction of the sheet: "the facet is still inside its own sheet" is t/2 = 0.600 mm
   on the default, far looser than the 0.1416 mm the lattice actually draws.

   `{ conform: false }` RESTORES THE LEGACY TESSELLATION BIT-IDENTICALLY. It is kept
   because the must-fail for both gates is "put the flat fan back", and a control that
   runs through the shipped function is worth more than a mutated copy of it; and
   because every figure the four companion tools published was measured through it. */

export const CONFORM_SAMPLES = 7;             // interior samples per plan edge when its chord deviation is measured
export const CONFORM_FACET_SAMPLES = 6;       // barycentric steps per side when a FACET's deviation is measured
/* THE EDGE TOLERANCE IS THREE QUARTERS OF THE FACET BAR, AND THE 3/4 IS DERIVED RATHER
   THAN TUNED. The refiner's criterion is a chord along an EDGE; the bar is the deviation
   over a FACET, and the two are not the same number. For a locally quadratic surface the
   affine interpolant's error on a triangle is `-(l1 l2 q12 + l2 l3 q23 + l3 l1 q31)` in
   barycentric coordinates, where `q_ij` is the second difference along edge ij; an edge
   midpoint reads `q/4` and the interior maximum, at the centroid with all three equal, is
   `q/3`. So a facet can exceed its worst edge by at most 4/3, and an edge tolerance of
   3/4 of the bar makes the facet bound hold. MEASURED against it, the worst observed
   amplification is 1.13 (`petalRoll` 330), 1.05 (`petalCup` 1.2 x curl 360) and 1.02
   (ALL FORM MAX) — inside the bound on every state, which is what says the bound is the
   right shape and not a coincidence of one petal. */
export const CONFORM_EDGE_SHARE = 3 / 4;

const v3 = (a, b, s) => [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s];
const d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/* The plan -> skin map, which is the emitter's own: `mapPt` then the sheet offset.
   ONE OWNER, read by the emitter, by the tolerance and by the gate. */
export function planSkin(ctx, x, y, sign) {
  const s = mapPt(ctx, x, y);
  return [s.P[0] + s.n[0] * sign * ctx.t / 2, s.P[1] + s.n[1] * sign * ctx.t / 2, s.P[2] + s.n[2] * sign * ctx.t / 2];
}
/* How far the straight facet edge A->B stands from the surface it is drawing, worst
   over both skins. Zero exactly when the map is affine along the segment, which is
   what a planar blade gives — measured 0.00000 mm on three probes of the flat default. */
export function chordDevMm(ctx, A, B, samples = CONFORM_SAMPLES) {
  let w = 0;
  for (const sg of [1, -1]) {
    const PA = planSkin(ctx, A.x, A.y, sg), PB = planSkin(ctx, B.x, B.y, sg);
    for (let k = 1; k < samples; k++) {
      const t = k / samples;
      const Q = planSkin(ctx, A.x + (B.x - A.x) * t, A.y + (B.y - A.y) * t, sg);
      const d = d3(Q, v3(PA, PB, t));
      if (d > w) w = d;
    }
  }
  return w;
}
/* THE DEVIATION OF ONE EMITTED FACET from the surface it is drawing — sampled over the
   triangle's INTERIOR, not along its edges, because that is the quantity a chord through
   the tube actually is. ONE OWNER, read by the lattice reference, by the emitter's own
   self-check and by the gate, so the two sides of every comparison are the same measure. */
export function facetDevMm(ctx, T, samples = CONFORM_FACET_SAMPLES) {
  let w = 0;
  for (const sg of [1, -1]) {
    const V = T.map((q) => planSkin(ctx, q.x, q.y, sg));
    for (let i = 0; i <= samples; i++) for (let j = 0; j <= samples - i; j++) {
      const a = i / samples, b = j / samples, c = 1 - a - b;
      const Q = planSkin(ctx, a * T[0].x + b * T[1].x + c * T[2].x, a * T[0].y + b * T[1].y + c * T[2].y, sg);
      const d = d3(Q, [a * V[0][0] + b * V[1][0] + c * V[2][0], a * V[0][1] + b * V[1][1] + c * V[2][1], a * V[0][2] + b * V[1][2] + c * V[2][2]]);
      if (d > w) w = d;
    }
  }
  return w;
}
/* THE SHIPPED LATTICE'S OWN WORST FACET, under the identical measure, over the same
   region. Its inputs are `buildPetalInto`'s emitted rows and `petalSurface` — neither
   of which the infill emitter writes, which is what makes it a reference rather than a
   restatement. The FOOT rows are excluded by name: all three carry u = 0 and are laid
   by `footRowsAt()`, not by `at()`, so the plan map does not describe them (it
   reproduces every BLADE row's own emitted mid point to 0.00e+0 mm and misses a foot
   by 3.54 mm, which is the ring's own overhang). It also returns the lattice's
   SHORTEST emitted edge, which is the floor the subdivision stops at: the infill is
   never refined finer than the mesh that ships. */
export function latticeChordDevMm(ctx, fromU = 0) {
  const rows = ctx.rows, NV = rows[0].mid.length;
  let f0 = 0; while (f0 < rows.length && rows[f0].u === 0) f0++; f0--;          // the last foot row IS the blade's u = 0 row
  const planOf = (i, j) => { const u = rows[i].u, hh = ctx.surface.profile.halfWidthAt(u); return { x: u * ctx.L, y: (-1 + (2 * j) / (NV - 1)) * hh }; };
  let worst = 0, worstAt = null, minEdge = Infinity;
  const seg = (a, b) => { const l = Math.hypot(b.x - a.x, b.y - a.y); if (l > 1e-9 && l < minEdge) minEdge = l; };
  for (let i = Math.max(0, f0); i < rows.length - 1; i++) {
    if (rows[i + 1].u < fromU) continue;
    for (let j = 0; j < NV - 1; j++) {
      const P00 = planOf(i, j), P10 = planOf(i + 1, j), P11 = planOf(i + 1, j + 1), P01 = planOf(i, j + 1);
      seg(P00, P10); seg(P00, P01); seg(P00, P11);
      for (const T of [[P00, P10, P11], [P00, P11, P01]]) { const d = facetDevMm(ctx, T); if (d > worst) { worst = d; worstAt = T[0]; } }
    }
  }
  return { devMm: worst, minEdgeMm: minEdge === Infinity ? 0 : minEdge, at: worstAt };
}

/* Ear clipping — a triangulation of a SIMPLE polygon that uses only its own vertices,
   so no triangle can leave it. The annulus sectors are the one place here that needs
   it: a fan from a corner can be cut by a hole bulging into a wide sector. */
function triArea2(a, b, c) { return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x); }
function inTri2(p, a, b, c, eps) { const s1 = triArea2(a, b, p), s2 = triArea2(b, c, p), s3 = triArea2(c, a, p); return s1 > eps && s2 > eps && s3 > eps; }
export function earClip(poly, eps = 1e-12) {
  const P = ccw(dedupe(poly, 0)); const out = [];   /* NOT the 1e-6 default: a vertex dropped here is one the neighbouring cell keeps, which is a crack */
  if (P.length < 3) return out;
  const idx = P.map((_, i) => i);
  let guard = 0;
  while (idx.length > 3 && guard++ < 8 * P.length) {
    let cut = -1;
    for (let i = 0; i < idx.length; i++) {
      const a = P[idx[(i - 1 + idx.length) % idx.length]], b = P[idx[i]], c = P[idx[(i + 1) % idx.length]];
      if (triArea2(a, b, c) <= eps) continue;                                   // reflex or degenerate on a CCW polygon
      let ok = true;
      for (const j of idx) { const p = P[j]; if (p === a || p === b || p === c) continue; if (inTri2(p, a, b, c, eps)) { ok = false; break; } }
      if (ok) { out.push([a, b, c]); cut = i; break; }
    }
    if (cut < 0) return [];                                                     // no ear: the polygon is not simple. Return NOTHING rather than a partial cover — a caller that cannot tell success from failure will draw the failure
    idx.splice(cut, 1);
  }
  if (idx.length === 3) out.push([P[idx[0]], P[idx[1]], P[idx[2]]]);
  return out;
}

/* Where the ray from `c` at angle `th` leaves the convex polygon `poly`. */
function rayHitConvex(c, th, poly) {
  const dx = Math.cos(th), dy = Math.sin(th);
  let best = null, bestT = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const A = poly[i], B = poly[(i + 1) % poly.length];
    const ex = B.x - A.x, ey = B.y - A.y;
    const den = dx * ey - dy * ex; if (Math.abs(den) < 1e-14) continue;
    const t = ((A.x - c.x) * ey - (A.y - c.y) * ex) / den;
    const s = ((A.x - c.x) * dy - (A.y - c.y) * dx) / den;
    if (t > 1e-12 && s >= -1e-9 && s <= 1 + 1e-9 && t < bestT) { bestT = t; best = { x: c.x + dx * t, y: c.y + dy * t }; }
  }
  return best;
}
/* THE ANNULUS, CUT INTO SECTORS. Returns the sector polygons and the DENSIFIED inner
   loop, which the hole's rim quads must then walk — the rim and the skin have to agree
   on where the hole's boundary points are or the shell opens. */
export function annulusSectors(outer, inner, cq = null) {
  const cc = polyCentroid(inner);
  const ang = (q) => Math.atan2(q.y - cc.y, q.x - cc.x);
  const O = ccw(outer), I = ccw(inner);
  const a0 = ang(O[0]);
  const rel = (q) => { let a = ang(q) - a0; while (a < 0) a += 2 * Math.PI; while (a >= 2 * Math.PI) a -= 2 * Math.PI; return a; };
  const nodes = I.map((q) => ({ q, a: rel(q), cut: -1 }));
  for (let k = 0; k < O.length; k++) {
    const p = rayHitConvex(cc, ang(O[k]), I);
    if (!p) return null;                                                        // not star-shaped about the hole's centroid: caller falls back
    nodes.push({ q: cq ? cq(p) : p, a: k === 0 ? 0 : rel(p), cut: k });
  }
  nodes.sort((x, y) => x.a - y.a || x.cut - y.cut);
  /* drop an inner VERTEX that a cut has landed on, keeping the cut (it carries the index) */
  const loop = []; for (const n of nodes) { const l = loop[loop.length - 1]; if (l && Math.hypot(l.q.x - n.q.x, l.q.y - n.q.y) < 1e-7) { if (n.cut >= 0 && l.cut < 0) loop[loop.length - 1] = n; continue; } loop.push(n); }
  const at = new Array(O.length).fill(-1);
  loop.forEach((n, i) => { if (n.cut >= 0) at[n.cut] = i; });
  if (at.some((i) => i < 0)) return null;
  const sectors = [];
  for (let k = 0; k < O.length; k++) {
    const k2 = (k + 1) % O.length;
    const poly = [O[k], O[k2]];
    for (let i = at[k2]; ; i = (i - 1 + loop.length) % loop.length) { poly.push(loop[i].q); if (i === at[k]) break; }
    const p = dedupe(poly); if (p.length >= 3) sectors.push(p);
  }
  return { sectors, innerLoop: loop.map((n) => n.q) };
}

/* The refinement. `devOf` and `needsSplit` are memoised on the unordered plan pair, so
   the answer for a shared wall edge is one answer and not two that happen to agree. */
function refiner(ctx, tolMm, minEdgeMm, levelBias = 0, cq = (q) => q) {
  const memo = new Map();
  const key = (A, B) => { const ka = `${f6(A.x)},${f6(A.y)}`, kb = `${f6(B.x)},${f6(B.y)}`; return ka < kb ? ka + '|' + kb : kb + '|' + ka; };
  /* EVERY DERIVED POINT GOES THROUGH THE PLAN CANONICALISER, AND THE GATE IS WHAT SAID
     SO. A midpoint is bit-identical from either side only if its two ENDPOINTS are, and
     two cells reach a shared wall edge through different half-plane clip sequences, so
     their copies of it agree to about 1e-12 and not to the bit. `f6` then rounds them to
     the same key for the WELD while `(a + b) / 2` gives two midpoints that can land on
     opposite sides of a 1e-6 rounding boundary — one crack per straddle. Measured before
     this line existed: 6 boundary edges on `buckle 0.6 f3` and 20 on
     `cup 1.2 x cupGradient 1`, with the vertex-welded shell count going 1 -> 2.
     Canonicalising the plan makes the endpoints one object and the midpoint one number. */
  const mid = (A, B) => cq({ x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 });
  let capped = 0, cappedTris = 0, maxDepthSeen = 0;
  const split = (A, B) => {
    const k = key(A, B); let v = memo.get(k);
    if (v === undefined) {
      const len = Math.hypot(B.x - A.x, B.y - A.y);
      v = { dev: chordDevMm(ctx, A, B), len };
      v.split = v.dev > tolMm && len > minEdgeMm;
      if (v.dev > tolMm && len <= minEdgeMm) capped++;
      memo.set(k, v);
    }
    return v;
  };
  /* THE BIAS IS THE MUST-FAIL'S OWN LEVER: -1 halves the subdivision by letting an edge
     through unless BOTH it and its own halves are over the tolerance. It runs through the
     shipped code, so the control exercises the clause that ships. */
  const wants = (A, B) => {
    if (!split(A, B).split) return false;
    for (let i = 0; i < -levelBias; i++) { const M = mid(A, B); if (!split(A, M).split && !split(M, B).split) return false; A = M; }
    return true;
  };
  /* A TRIANGLE WITH A REPEATED VERTEX DRAWS NOTHING AND IS DROPPED, AND WITHOUT THAT
     LINE THE RECURSION CYCLES. Ear clipping legitimately emits the WEDGE between a chord
     A-B and the polyline A-C-B when C lies on that chord (a plan sliver, zero area, real
     in 3-space only as the sagitta between the two paths). Refining it splits A-B at its
     midpoint, the canonicaliser lands that midpoint ON C, and the children are (A, C, C)
     and (C, B, C) — which have the same shape as their parent, so the recursion returned
     to the same triangle for ever and the depth escape emitted it UNSPLIT. That is the
     crack: measured, 6 unmatched directed edges on `buckle 0.6 f3` and 20 on
     `cup 1.2 x cupGradient 1`, with the vertex-welded shell count going 1 -> 2.
     Dropping them is not a loss — the sliver's own material is zero in plan, and the
     triangle across the chord A-B splits it at C by the same rule, so the mesh closes on
     the fine path. THE DEPTH CAP STAYS AND IS NOW LOUD: it counts, the caller reports it,
     and the gate fails on a non-zero count, because a cap that fires silently is exactly
     how this one hid. */
  const refine = (P0, P1, P2, out, depth = 0) => {
    maxDepthSeen = Math.max(maxDepthSeen, depth);
    if (P0 === P1 || P1 === P2 || P2 === P0) return;
    const e = [[P0, P1, P2], [P1, P2, P0], [P2, P0, P1]];
    /* THE LONGEST WANTING EDGE, NOT THE WORST ONE — Rivara's choice, and here it is what
       makes the recursion TERMINATE rather than a preference about shape. Splitting the
       worst-deviating edge can pick a SHORT one for ever: the children still carry the
       long edge, which never shortens, so a sliver on a near-collinear chain recurses
       without bound (measured, depth 65, and the escape hatch then emitted the triangle
       with an edge its neighbour had split — 6 and 20 unmatched edges). The longest edge
       halves whenever it is chosen, so the triangle's diameter strictly decreases and the
       `minEdgeMm` floor is reached. WHICH wanting edge is chosen does not affect
       crack-freeness: the recursion stops only when NO edge wants splitting, so every one
       of them reaches its own `splitPoints` whatever the order. */
    let m = -1, best = -1;
    for (let i = 0; i < 3; i++) { const s = split(e[i][0], e[i][1]); if (s.len > best && wants(e[i][0], e[i][1])) { best = s.len; m = i; } }
    if (m < 0) { out.push([P0, P1, P2]); return; }
    if (depth > 64) { cappedTris++; out.push([P0, P1, P2]); return; }
    const [A, B, C] = e[m];
    const M = mid(A, B);
    refine(A, M, C, out, depth + 1); refine(M, B, C, out, depth + 1);
  };
  /* the points a plan edge carries after refinement — the same recursion, so the rim
     quads and the skin agree by construction rather than by a tolerance */
  const points = (A, B) => { if (!wants(A, B)) return [A, B]; const M = mid(A, B); const l = points(A, M), r = points(M, B); return l.concat(r.slice(1)); };
  return { refine, points, report: () => ({ cappedEdges: capped, cappedTris, maxDepth: maxDepthSeen, edges: memo.size }) };
}

/* `opts.capturePlan` returns `canon` — the plan-keyed map every emitted cell vertex
   came through, each entry carrying the plan (x, y) it was mapped FROM as well as the
   two skin points it was mapped TO. It is the only way a reader of the emitted stream
   can recover which plan point a triangle belongs to, which is what a self-approach
   measurement on a HOLED shell needs to tell "the wall under this point" from "another
   part of this sheet". GATED OFF by default: the map is built either way (it is the
   canonicaliser), so capturing it moves no float and costs one property. */
export function cutThrough(ctx, F, wall = WALL_DEFAULT, opts = {}) {
  const acc = new Acc(); const t = ctx.t; emitBase(acc, ctx, F.mSplit); const baseTris = acc.tris;
  const canon = new Map(); const pt = (q) => { const k = `${f6(q.x)},${f6(q.y)}`; let o = canon.get(k); if (!o) { const s = mapPt(ctx, q.x, q.y); o = { T: add(s.P, s.n, t / 2), B: add(s.P, s.n, -t / 2), x: q.x, y: q.y }; canon.set(k, o); } return o; };
  /* ONE PLAN POINT PER f6 KEY, so a shared wall edge is the SAME two doubles in both of
     the cells that carry it and every midpoint derived from it is one number. */
  const planCanon = new Map(); const cq = (q) => { const k = `${f6(q.x)},${f6(q.y)}`; let v = planCanon.get(k); if (!v) { v = { x: q.x, y: q.y }; planCanon.set(k, v); } return v; };
  const conform = opts.conform !== false;
  const lat = conform ? latticeChordDevMm(ctx, F.uOv) : null;
  const tolMm = conform ? (opts.tolMm ?? lat.devMm * CONFORM_EDGE_SHARE) : 0;
  const minEdgeMm = conform ? (opts.minEdgeMm ?? lat.minEdgeMm) : 0;
  const R = conform ? refiner(ctx, tolMm, minEdgeMm, opts.levelBias ?? 0, cq) : null;
  let solid = 0, annular = 0; const holes = []; const cellOpen = []; let holeArea = 0, apexX = -Infinity;
  let planArea = 0, triArea = 0, tileFail = 0;                            // the partition self-check: the emitted plan triangles must tile the material and nothing else
  const legacySolid = (O, k) => { for (let i = 1; i < k - 1; i++) { acc.tri(O[0].T, O[i].T, O[i + 1].T); acc.tri(O[0].B, O[i + 1].B, O[i].B); triArea += Math.abs(triArea2Plan(O[0], O[i], O[i + 1])) / 2; } };
  const tiles = (tris, want) => { let a = 0; for (const T of tris) a += Math.abs(triArea2Plan(T[0], T[1], T[2])) / 2; return Math.abs(a - want) <= 1e-7 * Math.max(1, want); };
  /* one plan triangle -> two skin facets, wound as the legacy path wound them (top in
     plan order, bottom reversed), so a reader diffing the two paths sees subdivision
     and not a flipped normal */
  const emitPlanTri = (T) => { const a = pt(T[0]), b = pt(T[1]), c = pt(T[2]); acc.tri(a.T, b.T, c.T); acc.tri(a.B, c.B, b.B); triArea += Math.abs(triArea2Plan(T[0], T[1], T[2])) / 2; };
  const emitSkin = (tris) => { if (!conform) { for (const T of tris) emitPlanTri(T); return; } const out = []; for (const T of tris) R.refine(T[0], T[1], T[2], out); for (const T of out) emitPlanTri(T); };
  /* a rim runs along a plan edge and must be split exactly where the skin was */
  const emitRim = (A, B) => { const ps = conform ? R.points(A, B) : [A, B]; for (let i = 0; i + 1 < ps.length; i++) { const p = pt(ps[i]), q = pt(ps[i + 1]); acc.quad(q.T, p.T, p.B, q.B); } };
  for (const cRaw of F.cells) {
    const c = conform ? cRaw.map(cq) : cRaw;
    const k = c.length; const O = c.map(pt); const rimOK = (i) => F.isOutlineEdge(c[i], c[(i + 1) % k]);
    const hole1 = F.holeOf(cRaw, wall); const hole0 = hole1 && conform ? hole1.map(cq) : hole1;
    const open = hole0 && polyArea(hole0) > 0.25 && 2 * inradiusConvex(hole0) >= 0.6 && F.holeMask(c, hole0);
    cellOpen.push(!!open);                                                  // recorded BEFORE the early return, so the array is aligned with F.cells whatever the branch does
    planArea += polyArea(c) - (open ? polyArea(hole0) : 0);
    if (!open) {
      solid++;
      if (!conform) legacySolid(O, k);
      else {
        const tris = earClip(c);
        if (tiles(tris, polyArea(c))) emitSkin(tris);
        else { tileFail++; legacySolid(O, k); }                                 // the field handed over a polygon that is not simple: draw what the legacy drew, and SAY SO
      }
      for (let i = 0; i < k; i++) { const j = (i + 1) % k; if (rimOK(i)) { if (conform) emitRim(c[i], c[j]); else acc.quad(O[j].T, O[i].T, O[i].B, O[j].B); } }
      continue;
    }
    annular++; holes.push(hole0); holeArea += polyArea(hole0); for (const q of hole0) apexX = Math.max(apexX, q.x);
    const sec = conform ? annulusSectors(c, hole0, cq) : null;
    if (conform && sec) {
      let all = [];
      for (const s of sec.sectors) { const tris = opts.sectorFan ? s.slice(1, -1).map((_, i) => [s[0], s[i + 1], s[i + 2]]) : earClip(s); if (!tiles(tris, polyArea(s))) tileFail++; all = all.concat(tris); }
      /* AND THE SECTORS MUST TILE THE ANNULUS, not merely each tile its own sector — two
         different claims, and only the second one was being checked. A cell at the blade's
         WAIST is NOT convex (the outline `{|y| <= h(x)}` is convex only where h is concave,
         and h rises then falls about the waist), and neither a centroid fan nor an angular
         sector walk is valid on a polygon that is not star-shaped. Measured on the
         below-floor rows `bloom-infill-lamina-floor.mjs` sweeps: the emitter drew up to
         4.16 mm2 MORE than the material and the per-sector check saw none of it. */
      if (tiles(all, polyArea(c) - polyArea(hole0))) {
        emitSkin(all);
        const IL = sec.innerLoop; for (let i = 0; i < IL.length; i++) emitRim(IL[(i + 1) % IL.length], IL[i]);
        for (let i = 0; i < k; i++) { const j = (i + 1) % k; if (rimOK(i)) emitRim(c[i], c[j]); }
        continue;
      }
      tileFail++;                                                               // fall through to the legacy walk, counted
    } else if (conform) tileFail++;
    const inn = ccw(hole0); const cc = polyCentroid(inn); const ang = (q) => Math.atan2(q.y - cc.y, q.x - cc.x);
    const I = inn.map((q) => ({ a: ang(q), s: pt(q) })); const Oa = c.map((q, i) => ({ a: ang(q), s: O[i] }));
    const rot = (arr) => { let m = 0; for (let i = 1; i < arr.length; i++) if (arr[i].a < arr[m].a) m = i; return arr.slice(m).concat(arr.slice(0, m)); };
    const A = rot(Oa), Bq = rot(I); let ia = 0, ib = 0; const na = A.length, nb = Bq.length;
    const nextA = (i) => A[(i + 1) % na].a + ((i + 1) >= na ? 2 * Math.PI : 0), nextB = (i) => Bq[(i + 1) % nb].a + ((i + 1) >= nb ? 2 * Math.PI : 0);
    while (ia < na || ib < nb) {
      const advA = ib >= nb || (ia < na && nextA(ia) <= nextB(ib));
      if (advA) { const a0 = A[ia % na].s, a1 = A[(ia + 1) % na].s, b0 = Bq[ib % nb].s; acc.tri(a0.T, a1.T, b0.T); acc.tri(a0.B, b0.B, a1.B); triArea += Math.abs(triArea2Plan(a0, a1, b0)) / 2; ia++; }
      else { const a0 = A[ia % na].s, b0 = Bq[ib % nb].s, b1 = Bq[(ib + 1) % nb].s; acc.tri(a0.T, b1.T, b0.T); acc.tri(a0.B, b0.B, b1.B); triArea += Math.abs(triArea2Plan(a0, b1, b0)) / 2; ib++; }
    }
    for (let i = 0; i < nb; i++) { const j = (i + 1) % nb; acc.quad(Bq[i].s.T, Bq[j].s.T, Bq[j].s.B, Bq[i].s.B); }
    for (let i = 0; i < k; i++) { const j = (i + 1) % k; if (rimOK(i)) acc.quad(O[j].T, O[i].T, O[i].B, O[j].B); }
  }
  return { acc, tris: acc.tris, baseTris, cells: F.cells.length, solid, annular, holes, cellOpen, holeArea, apexX,
    conform, tolMm, minEdgeMm, latticeDevMm: lat ? lat.devMm : null, tileFail,
    planAreaMm2: planArea, triAreaMm2: triArea, refine: R ? R.report() : null,
    ...(opts.capturePlan ? { canon } : {}) };
}
function triArea2Plan(a, b, c) { return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x); }

/* ---------------- measurements ---------------- */
/* BANDS — the pattern's reach DOWN THE BLADE, which is what a grading change is about and what
   no figure in the salvage doc measures. A band is a u interval. Area is the honest measure:
   every hole is CLIPPED to the band's own x range and summed, so a hole straddling a band's edge
   contributes only the part inside it; the lamina underneath is the OUTLINE's own integral of
   2h(x) dx, not the cells' area, so a band holding no cell reads 100 % wall rather than dividing
   by nothing. Counts go by CENTROID, which is the only way to say "how many holes are down here".
   BASAL_BAND_TOP and TIP_BAND_BOTTOM are the two ends this session reports; 0.15 is the brief's
   own line and is reported beside them for what it says. */
export const BASAL_BAND_TOP = 0.45;
export const EDGE_ON_LINE_MM = 0.15;          // two hole bottoms this close are on the same line
export const TIP_BAND_BOTTOM = 0.75;
export function clipBandX(poly, xLo, xHi) { let out = clipHalfPlane(poly, -1, 0, xLo); if (out.length < 3) return null; out = clipHalfPlane(out, 1, 0, -xHi); return out.length >= 3 ? out : null; }
export function laminaAreaX(hAtX, xLo, xHi, n = 800) { if (xHi <= xLo) return 0; let s = 0; for (let i = 0; i < n; i++) { const x0 = xLo + ((xHi - xLo) * i) / n, x1 = xLo + ((xHi - xLo) * (i + 1)) / n; s += (hAtX(x0) + hAtX(x1)) * (x1 - x0); } return s; }
export function bandStats(ctx, F, r, uLo, uHi) {
  const xLo = Math.max(F.xB, uLo * ctx.L), xHi = Math.min(ctx.L, uHi * ctx.L);
  const lamina = laminaAreaX(F.h, xLo, xHi);
  let holeArea = 0; const opens = [];
  for (const hh of r.holes) {
    const cl = clipBandX(hh, xLo, xHi); if (cl) holeArea += polyArea(cl);
    const cu = polyCentroid(hh).x / ctx.L; if (cu >= uLo && cu < uHi) opens.push(2 * inradiusConvex(hh));
  }
  opens.sort((a, b) => a - b);
  /* "ENDS ON A LINE" IS WHAT THE BASAL V EXISTS TO PREVENT, so it gets a number rather than a
     word. `lowOf` is each hole's own lowest x; `edgeRangeMm` is how far apart those bottoms are
     across the band, and `onLine` counts the ones sitting within EDGE_ON_LINE_MM of the lowest
     bottom there is. A band whose holes all bottom out together reads onLine = holes and
     edgeRange ~ 0; one the V has staggered reads onLine small and edgeRange a millimetre or more. */
  const lowOf = []; for (const hh of r.holes) { const cu = polyCentroid(hh).x / ctx.L; if (cu < uLo || cu >= uHi) continue; let mn = Infinity; for (const q of hh) mn = Math.min(mn, q.x); lowOf.push(mn); }
  const edgeLo = lowOf.length ? Math.min(...lowOf) : 0;
  const edgeRangeMm = lowOf.length ? Math.max(...lowOf) - edgeLo : 0;
  const onLine = lowOf.filter((x) => x - edgeLo <= EDGE_ON_LINE_MM).length;
  let cells = 0, solid = 0; const ratios = [];
  for (let i = 0; i < F.cells.length; i++) {
    const cu = polyCentroid(F.cells[i]).x / ctx.L; if (cu < uLo || cu >= uHi) continue;
    cells++; if (!r.cellOpen[i]) solid++; ratios.push(elongation(F.cells[i]).ratio);
  }
  ratios.sort((a, b) => a - b);
  return { uLo, uHi, cells, solid, holes: opens.length, real: opens.filter((o) => o >= G.MIN_FEATURE_MM).length,
    medianOpen: opens.length ? opens[Math.floor(opens.length / 2)] : 0,
    wallFraction: lamina > 0 ? 1 - holeArea / lamina : 1, laminaMm2: lamina, holeMm2: holeArea,
    edgeRangeMm, onLine, edgeLoMm: edgeLo,
    aniso: ratios.length ? ratios[Math.floor(ratios.length / 2)] : null };
}
function key3(p) { return `${p[0].toFixed(7)},${p[1].toFixed(7)},${p[2].toFixed(7)}`; }
export function census(pos) {
  const vid = new Map(); const id = (p) => { const k = key3(p); let v = vid.get(k); if (v === undefined) { v = vid.size; vid.set(k, v); } return v; };
  const und = new Map(); const parent = []; const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
  for (let t = 0; t < pos.length / 9; t++) { const ids = [0, 1, 2].map((k) => id([pos[t * 9 + k * 3], pos[t * 9 + k * 3 + 1], pos[t * 9 + k * 3 + 2]])); while (parent.length < vid.size) parent.push(parent.length);
    for (let e = 0; e < 3; e++) { const a = ids[e], b = ids[(e + 1) % 3]; if (a === b) continue; const u = a < b ? `${a}-${b}` : `${b}-${a}`; und.set(u, (und.get(u) || 0) + 1); const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; } }
  let boundary = 0, nonManifold = 0; for (const c of und.values()) { if (c === 1) boundary++; else if (c > 2) nonManifold++; }
  const roots = new Set(); for (let i = 0; i < parent.length; i++) roots.add(find(i));
  return { boundary, nonManifold, shells: roots.size };
}
export function floodFill(pos, cell) {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], pos[i + k]); mx[k] = Math.max(mx[k], pos[i + k]); }
  const dims = mn.map((m, k) => Math.ceil((mx[k] - m) / cell) + 3); const occ = new Uint8Array(dims[0] * dims[1] * dims[2]); const I = (x, y, z) => (x * dims[1] + y) * dims[2] + z;
  const mark = (p) => { occ[I(Math.floor((p[0] - mn[0]) / cell) + 1, Math.floor((p[1] - mn[1]) / cell) + 1, Math.floor((p[2] - mn[2]) / cell) + 1)] = 1; };
  for (let t = 0; t < pos.length / 9; t++) { const A = pos.slice(t * 9, t * 9 + 3), B = pos.slice(t * 9 + 3, t * 9 + 6), C = pos.slice(t * 9 + 6, t * 9 + 9); const L = Math.max(Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]), Math.hypot(C[0] - A[0], C[1] - A[1], C[2] - A[2]), Math.hypot(C[0] - B[0], C[1] - B[1], C[2] - B[2])); const n = Math.max(1, Math.ceil(L / (cell * 0.4))); for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) { const a = i / n, b = j / n, c = 1 - a - b; mark([A[0] * a + B[0] * b + C[0] * c, A[1] * a + B[1] * b + C[1] * c, A[2] * a + B[2] * b + C[2] * c]); } }
  const seen = new Uint8Array(occ.length); let comps = 0; const stack = new Int32Array(occ.length);
  for (let s = 0; s < occ.length; s++) { if (!occ[s] || seen[s]) continue; comps++; let sp = 0; stack[sp++] = s; seen[s] = 1; while (sp) { const c = stack[--sp]; const z = c % dims[2], y = Math.floor(c / dims[2]) % dims[1], x = Math.floor(c / (dims[1] * dims[2])); for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) { const nx = x + dx, ny = y + dy, nz = z + dz; if (nx < 0 || ny < 0 || nz < 0 || nx >= dims[0] || ny >= dims[1] || nz >= dims[2]) continue; const ni = I(nx, ny, nz); if (occ[ni] && !seen[ni]) { seen[ni] = 1; stack[sp++] = ni; } } } }
  return comps;
}
export function measure(ctx, F, wall) {
  const r = cutThrough(ctx, F, wall); const c = census(r.acc.pos);
  const opens = r.holes.map((hh) => 2 * inradiusConvex(hh)).sort((a, b) => a - b);
  const real = opens.filter((o) => o >= G.MIN_FEATURE_MM).length;
  const lamina = polyArea(F.outline);
  const capMm = r.apexX > -Infinity ? ctx.L - r.apexX : ctx.L - F.xB;
  /* the floor from the outline alone: the last station where a 1.0 mm hole between two walls fits, plus the wall across the tip */
  let xFloor = F.xB; for (let i = 0; i <= 2000; i++) { const x = F.xB + (ctx.L - F.xB) * i / 2000; if (F.h(x) >= wall + G.MIN_FEATURE_MM / 2) xFloor = x; }
  const capFloorMm = ctx.L - xFloor + wall;
  const mid = F.cells.filter((cell) => { const u = polyCentroid(cell).x / ctx.L; return u >= 0.45 && u <= 0.75; }).map(elongation);
  const ratios = mid.map((e) => e.ratio).sort((a, b) => a - b);
  let lowX = Infinity; for (const hh of r.holes) for (const q of hh) lowX = Math.min(lowX, q.x);
  const basal = bandStats(ctx, F, r, F.uOv, BASAL_BAND_TOP), tip = bandStats(ctx, F, r, TIP_BAND_BOTTOM, 1.0), below015 = bandStats(ctx, F, r, 0, 0.15);
  return { lowestHoleU: lowX < Infinity ? lowX / ctx.L : null, basal, tip, below015, kind: F.kind, wall, cells: F.cells.length, tris: r.tris, baseTris: r.baseTris, holes: r.annular, solid: r.solid, real, holeMedian: opens.length ? opens[Math.floor(opens.length / 2)] : 0, holeMin: opens[0] ?? 0, holeMax: opens[opens.length - 1] ?? 0, wallFraction: 1 - r.holeArea / lamina, capMm, capFloorMm, anisoMid: ratios.length ? ratios[Math.floor(ratios.length / 2)] : null, anisoAlongX: mid.length ? mid.reduce((a, e) => a + e.alongX, 0) / mid.length : null, boundary: c.boundary, nonManifold: c.nonManifold, shells: c.shells, voxel06: floodFill(r.acc.pos, 0.6), voxel03: floodFill(r.acc.pos, 0.3), acc: r.acc };
}
/* The whole bloom: every slot of the shipped whorl, each petal from its own seed, plus the shipped hub. */
export function wholeBloom(field, N, wall, st = { ...DEFAULTS }, opts = {}) {
  const accB = new G.MeshBuilder({ exportMode: true }); const fr = G.footRing(st, accB); const out = new Acc(); let petals = 0;
  const ring0 = fr.slotRings[0][0];
  G.buildWhorlInto({ count: fr.slotCount, radius: ring0.radius, height: 0, sizeRamp: () => ring0.scale, angleRamp: () => ring0.tiltExtra, phase: ring0.phase, placement: st.placement, fan: fr.fan,
    blade: (slot) => { const c2 = slotContext(st, fr.slotRings[0][slot.index], slot, accB); const F = field === 'legacy' ? fieldLegacy(c2, N, SEED + slot.index * 131, opts) : fieldSalvage(c2, N, { ...opts, seed: SEED + slot.index * 131 }); const r = cutThrough(c2, F, wall, opts); out.pos.push(...r.acc.pos); petals++; } });
  G.buildHubInto(accB, st, fr.hub); out.pos.push(...accB.positions);
  return { acc: out, tris: out.tris, petals, hubTris: accB.triangleCount };
}

if (IS_MAIN) {
  const outDir = arg('--out', path.join(os.tmpdir(), 'bloom-voronoi-proto')); fs.mkdirSync(outDir, { recursive: true });
  const quick = process.argv.includes('--quick');
  const ctx = context({});
  const save = (name, acc) => fs.writeFileSync(path.join(outDir, `${name}.bin`), Buffer.from(new Float32Array(acc.pos).buffer));
  const mShip = basalSplit(ctx, {});
  const report = { petal: { L: ctx.L, plainTris: ctx.plainTris, sheet: ctx.t, boundaryRow: mShip, boundaryU: ctx.rows[mShip].u, cellsFromU: ctx.rows[mShip - 1].u, laminaFloorU: laminaFloorU(ctx), wallFloorU: wallFloorU(ctx, WALL_DEFAULT), basalFloorU: basalFloorU(ctx, WALL_DEFAULT), U0, ANISO, LLOYD_PASSES, FILLET_MM, CONVERGE_FRACTION, BASE_NARROWING, BASE_REACH, TIP_GAMMA }, rows: [] };
  { const a = new Acc(); emitBase(a, ctx, ctx.rows.length - 1); save('plain', a); }
  console.log(`default petal: L ${ctx.L} mm, sheet ${ctx.t} mm, plain ${ctx.plainTris} tris (export); solid basal zone u <= ${ctx.rows[mShip].u.toFixed(7)} (row ${mShip}, the DERIVED floor: waist ${laminaFloorU(ctx).toFixed(7)}, wall ${wallFloorU(ctx, WALL_DEFAULT).toFixed(7)}). ROOT_BLEND_END is ${U0} and owns the outline, not this.`);
  console.log('field | N | wall | cells | holes/solid | real (>=1.0) | hole min/med/max | wall frac | cap built / floor mm | aniso mid-blade (median, |cos| to midrib) | tris | boundary | nonMan | shells | voxel 0.6/0.3');
  const Ns = quick ? [16] : [10, 16, 24]; const walls = quick ? [1.0] : [1.0, 0.8];
  for (const wall of walls) for (const N of Ns) for (const kind of ['legacy', 'salvage']) {
    const F = kind === 'legacy' ? fieldLegacy(ctx, N) : fieldSalvage(ctx, N);
    const m = measure(ctx, F, wall); const name = `${kind}_N${N}_w${wall.toFixed(1)}`; save(name, m.acc); delete m.acc; m.N = N; m.name = name; report.rows.push(m);
    console.log(`${kind.padEnd(7)} | ${String(N).padStart(2)} | ${wall.toFixed(1)} | ${String(m.cells).padStart(3)} | ${m.holes}/${m.solid} | ${String(m.real).padStart(3)} | ${m.holeMin.toFixed(2)} / ${m.holeMedian.toFixed(2)} / ${m.holeMax.toFixed(2)} | ${(100 * m.wallFraction).toFixed(0)}% | ${m.capMm.toFixed(2)} / ${m.capFloorMm.toFixed(2)} | ${m.anisoMid === null ? 'n/a' : m.anisoMid.toFixed(2) + ', ' + m.anisoAlongX.toFixed(2)} | ${m.tris} | ${m.boundary} | ${m.nonManifold} | ${m.shells} | ${m.voxel06}/${m.voxel03}`);
  }
  /* the control Eva named: the same salvage field with Lloyd run in the FLAT metric */
  { const ship = report.rows.find((r) => r.name === 'salvage_N16_w1.0');
    const c1 = measure(ctx, fieldSalvage(ctx, 16, { relaxMetric: 'flat' }), 1.0); delete c1.acc;
    const c2 = measure(ctx, fieldSalvage(ctx, 16, { relaxMetric: 'flat', cellMetric: 'flat' }), 1.0); delete c2.acc;
    const c3 = measure(ctx, fieldSalvage(ctx, 16, { passes: 0 }), 1.0); delete c3.acc;
    const c4 = measure(ctx, fieldSalvage(ctx, 16, { relaxMetric: 'aniso', cellMetric: 'flat' }), 1.0); delete c4.acc;
    report.metricControls = { shipped: ship.anisoMid, relaxFlatCellAniso: c1.anisoMid, relaxFlatCellFlat: c2.anisoMid, noRelaxCellAniso: c3.anisoMid, relaxAnisoCellFlat: c4.anisoMid };
    console.log(`METRIC CONTROLS (median principal ratio of the mid-blade cells, N16 w1.0): shipped (seed+relax+cells all anisotropic) ${ship.anisoMid.toFixed(2)} | relax FLAT, cells anisotropic ${c1.anisoMid.toFixed(2)} | relax FLAT, cells FLAT ${c2.anisoMid.toFixed(2)} | no relaxation, cells anisotropic ${c3.anisoMid.toFixed(2)} | relax anisotropic, cells FLAT ${c4.anisoMid.toFixed(2)}`); }
  if (!quick) {
    for (const kind of ['legacy', 'salvage']) { const b = wholeBloom(kind, 16, 1.0); save(`bloom_${kind}16`, b.acc); report[`bloom_${kind}16`] = { tris: b.tris, petals: b.petals, hubTris: b.hubTris, census: census(b.acc.pos), voxel06: floodFill(b.acc.pos, 0.6) }; console.log(`WHOLE BLOOM ${kind} N16 w1.0: ${b.tris} tris (${b.petals} petals + hub ${b.hubTris}); boundary ${report[`bloom_${kind}16`].census.boundary}, voxel pieces ${report[`bloom_${kind}16`].voxel06}`); }
    const accP = new G.MeshBuilder({ exportMode: true }); G.buildBloomInto(accP, { ...DEFAULTS }); save('bloom_plain', { pos: Array.from(accP.positions) }); report.bloom_plain = { tris: accP.triangleCount };
  }
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 1));
  console.log(`meshes and report.json in ${outDir}`);
}
