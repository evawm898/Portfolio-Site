#!/usr/bin/env node
/* verify-bug.mjs — the Parametric Bug's gate. Node only, no browser.

   Builds the ONE model through the shipped bug-geometry.js for the neutral
   default, 1-4 wing pairs, tucked legs, N seeded RANDOMIZED bugs, the same
   bugs forced to 4 wing pairs, every hand-drawn outline in
   tools/bug-fixtures.mjs (as the first pair of a 4-pair bug), an UNLINKED
   middle pair, and a first/last pair that blends into a crossing. Asserts:

     M  mirrorDiff === 0 — every emitted triangle matches the mirror of another,
        exact doubles (an identity, not a tolerance).
     W  boundary edges === 0 on the welded float32 STL bytes exportStl wrote.
     P  every primitive part is closed on its own indices and has POSITIVE signed
        volume (outward).
     C  ONE connected region: surface-occupancy voxels at 0.4 mm, 6-connected
        flood fill, a multi-region result re-read at 0.2 mm.
     F  minimum feature: tube rings, wing/tail thickness and the neck/waist,
        MEASURED off the emitted vertices against the CONTROL's minDiameter.
     S  the layered SVG's contour loops are mirror-symmetric, the cut-safe SVG
        is ONE region, and no wing has a contour loop standing more than 0.5 mm
        inside its outline (a hairline stroke across the wing).
     R  wing roots: every pair's root (measured off the emitted wing vertices
        nearest the body axis) sits at a DISTINCT y, consecutive roots at least
        strictly in pair order (>= 0.1 mm apart; the measured root carries the
        sweep's lean, the hinges themselves are >= 0.7 Lt / (N-1) apart), and the body's thorax is the control's length lengthened
        by the law restated here: thoraxLength * (1 + 0.3 * max(0, N - 2)).
     O  every wing planform polygon is SIMPLE — checked by this file's own
        segment test, not the builder's.
     N  drawn-width floor: every wing planform measured by this file's OWN
        brute-force opening (not the builder's raster); where it is thin the
        builder must report it and exportStl must REFUSE with the reason;
        where it is clear the builder must not and the STL must export. A row
        within two grid steps of the bar is reported 'borderline', not judged.
     T  the tail lives on the bottom pair only: on each TAIL row the same bug
        is built with TAIL off and every non-bottom wing part must be
        bit-identical (so no middle pair carries tail geometry, at 1-4 pairs),
        while the bottom pair must differ.
     L  tucked legs (reach 0) on the default: the legs' top-down projection
        outside the body's projection is <= 2% of the legs' own projected area.
        At reach 1 it must be large (the clause can fail).

     V  venation (Phase 2), on every row with veins:
        V1 the CELLS TILE THE WING EXACTLY: the cells' areas sum to the wing's
           (1e-9 relative), every vein edge is carried by exactly two cells in
           opposite directions and every outline/root edge by exactly one, no
           cell polygon crosses itself (this file's own segment test), and
           every outline edge of a cell lies ON the drawn planform;
        V2 HOLES: every hole lies inside its own cell, holes stand at least the
           narrowest vein width apart and the margin border from the outline
           (measured vertex-to-segment, this file's own), the wing's top face
           is ONE connected triangle set, and a stigma cell is never cut;
        V3 a LINKED middle pair blends its venation: its terminal count and
           its root vein width equal the law restated here (lerp of the first
           and last pairs' fields, integers rounded);
        V4 the vein floor: the narrowest vein (width x (1 - taper)) and, in
           HOLES, the margin border, re-derived from the PARAMETERS, must be
           reported as a 'vein' violation iff under minDiameter, with the STL
           refused and the veins drawn red; in RIDGES the emitted strip width
           is MEASURED (ridgeWidthPairs) against the floor;
        V5 a wing with a TAIL has a vein whose tip lies on a tail-tagged
           stretch of the outline (the tags re-read by this file);
        V6 the discal cell touches the root chord when asked for; the
           pterostigma is exactly one cell, solid in HOLES and a plate in RIDGES.

     The ELEGANCE PASS (design doc §9), on every row:
     B  the wing's EDGE PROFILE: the taper + chamfer law restated here from
        the parameters and the drawn planform, against the emitted top/bottom
        pair of EVERY planform point (1e-9 mm); nothing under the floor; with a
        chamfer every outline vertex reads the floor exactly.
     X  POINTED terminations: from the parameters, every leg and antenna end a
        point — its last ring at or over the floor, its apex at least a ring
        radius beyond it — and no ball left; the abdomen at or over the floor
        except its last 1.6 floor radii (restated); with them off, none of it.
     G  SEGMENT style: at each boundary clear of the floor the ring dips
        against the same bug with its segments unmarked by at least half of
        what the style asks (groove share x (1 - style), bead share x style);
        a groove puts a ring exactly ON the boundary.
     Y  (specimen rows) the forewing's inner margin square to the body,
        measured off the emitted vertices with the tornus found by this file's
        own rule — or, where the margin needs a sweep outside the slider, the
        sweep at the bound; every wing flat; the antennae straight.

   And, as pure-function checks of the editor and the interpolation:
     E  a drag that would make the outline cross itself is BLOCKED (points
        returned unchanged) and the requested outline really does cross (this
        file's own test); a valid drag, an insert and a delete are accepted;
        deleting a root is refused.
     I  the crossing blend's raw mix crosses (vacuity) and the built middle pair
        is reported REPAIRED and is simple (O).
     K  Randomize, over 500 seeds: a 3-part bug has 3 leg pairs; a 2-part bug
        has 4 leg pairs, NO wings and no antennae; no bug has 0 legs.
     T  (functions) TAIL off composes exactly the base; on adds exactly the
        tail points; a tail drag edits only the tail; off-then-on restores the
        EDITED tail; inserting between tail points keeps the tag; the edited
        tail follows the bottom pair at 1, 2 and 4 pairs; a design with the
        retired tail sliders migrates into an ON tail group with a note.
     D  a design round-trips through JSON exactly; an invalid outline in a file
        is refused with a note; a newer version is refused.

   It also REPORTS (not gates) FDM/resin overhang at the model's own
   orientation, and the tucked-leg exposure across the random seeds.

   NOT COVERED: planform WIDTHS of a drawn outline (a hand-drawn spike can be
   narrower than the floor — not measured); free ends; self-intersection
   BETWEEN parts (overlapping closed shells are the export contract).

   --negative-control  breaks built models twenty-eight ways (plus the L clause at reach 1) and requires each to be
                       caught by the clause that names it.
   --seeds N           number of random bugs (default 40).
   --only RE           iteration only: build the rows whose label matches RE (the run says it is a subset). */

import * as G from '../bug-geometry.js';
import { polyArea as venArea } from '../bug-venation.js';
import * as LACE from '../bug-lace.js';
import { HAND_OUTLINES, CROSSING_BLEND, THIN_TAIL, blendedThin, LACE_FIXTURE_SVG } from './bug-fixtures.mjs';

const args = process.argv.slice(2);
const NEG = args.includes('--negative-control');
const seedsArg = args.indexOf('--seeds');
const NSEEDS = seedsArg >= 0 ? +args[seedsArg + 1] : 40;

const segDist = (p, a, b) => { const ab = [b[0] - a[0], b[1] - a[1]], L2 = ab[0] * ab[0] + ab[1] * ab[1] || 1e-18; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / L2)); return Math.hypot(p[0] - a[0] - t * ab[0], p[1] - a[1] - t * ab[1]); };

/* ---------- W: STL edge census on welded float32 bytes ---------- */
function analyzeStl(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const n = dv.getUint32(80, true);
  const id = new Map(); let nv = 0;
  const vid = (o) => {
    const k = `${dv.getFloat32(o, true)},${dv.getFloat32(o + 4, true)},${dv.getFloat32(o + 8, true)}`;
    let v = id.get(k); if (v === undefined) { v = nv++; id.set(k, v); } return v;
  };
  const edges = new Map();
  for (let t = 0; t < n; t++) {
    const o = 84 + 50 * t + 12;
    const a = vid(o), b = vid(o + 12), c = vid(o + 24);
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      const k = p < q ? p * 4294967296 + q : q * 4294967296 + p;
      edges.set(k, (edges.get(k) || 0) + 1);
    }
  }
  let boundary = 0, nonManifold = 0;
  for (const c of edges.values()) { if (c === 1) boundary++; else if (c > 2) nonManifold++; }
  return { triangles: n, boundary, nonManifold, bytes: bytes.length };
}

/* ---------- P: per-part closure + orientation ---------- */
function partChecks(model) {
  const I = model.indices, bad = [];
  for (const part of model.parts) {
    const directed = new Map();
    for (let t = part.t0; t < part.t1; t++) {
      const v = [I[3 * t], I[3 * t + 1], I[3 * t + 2]];
      for (let e = 0; e < 3; e++) { const k = `${v[e]}>${v[(e + 1) % 3]}`; directed.set(k, (directed.get(k) || 0) + 1); }
    }
    let unmatched = 0;
    for (const [k, c] of directed) { const [a, b] = k.split('>'); if ((directed.get(`${b}>${a}`) || 0) !== c) unmatched++; }
    const vol = G.signedVolume(model.positions, I, part.t0, part.t1);
    if (unmatched) bad.push(`${part.name}-${part.side}: ${unmatched} unmatched directed edges`);
    if (!(vol > 0)) bad.push(`${part.name}-${part.side}: signed volume ${vol.toExponential(3)} (inward)`);
  }
  return bad;
}

/* ---------- C: voxel connectivity ---------- */
function voxelComponents(model, cell, partFilter = null) {
  const P = model.positions;
  const I = partFilter ? Uint32Array.from(model.parts.filter(partFilter).flatMap((q) => Array.from(model.indices.subarray(3 * q.t0, 3 * q.t1)))) : model.indices;
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (let i = 0; i < P.length; i += 3) {
    x0 = Math.min(x0, P[i]); x1 = Math.max(x1, P[i]); y0 = Math.min(y0, P[i + 1]); y1 = Math.max(y1, P[i + 1]); z0 = Math.min(z0, P[i + 2]); z1 = Math.max(z1, P[i + 2]);
  }
  const nx = Math.ceil((x1 - x0) / cell) + 3, ny = Math.ceil((y1 - y0) / cell) + 3, nz = Math.ceil((z1 - z0) / cell) + 3;
  const vox = new Uint8Array(nx * ny * nz);
  const mark = (x, y, z) => { vox[(Math.floor((z - z0) / cell) + 1) * nx * ny + (Math.floor((y - y0) / cell) + 1) * nx + Math.floor((x - x0) / cell) + 1] = 1; };
  // Sampling step: at 0.35 of a cell two consecutive samples could cross a
  // voxel CORNER and leave a one-voxel island (random:40 read 2 regions at both
  // 0.4 and 0.2 mm, the island one voxel big and in a different place each
  // time — the sampling signature, not a gap). Denser sampling only adds cells
  // the surface genuinely passes through; 6-connectivity is NOT loosened.
  const step = cell * 0.12;
  for (let t = 0; t < I.length; t += 3) {
    const a = 3 * I[t], b = 3 * I[t + 1], c = 3 * I[t + 2];
    const L = Math.max(Math.hypot(P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]), Math.hypot(P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]), Math.hypot(P[c] - P[b], P[c + 1] - P[b + 1], P[c + 2] - P[b + 2]));
    const n = Math.max(1, Math.ceil(L / step));
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) {
      const u = i / n, v = j / n, w = 1 - u - v;
      mark(w * P[a] + u * P[b] + v * P[c], w * P[a + 1] + u * P[b + 1] + v * P[c + 1], w * P[a + 2] + u * P[b + 2] + v * P[c + 2]);
    }
  }
  const lab = new Int32Array(vox.length); const q = new Int32Array(vox.length);
  let comps = 0; const sizes = [];
  for (let s = 0; s < vox.length; s++) {
    if (!vox[s] || lab[s]) continue;
    comps++; let h = 0, tl = 0; q[tl++] = s; lab[s] = comps;
    while (h < tl) {
      const c = q[h++];
      for (const d of [1, -1, nx, -nx, nx * ny, -nx * ny]) { const m = c + d; if (m >= 0 && m < vox.length && vox[m] && !lab[m]) { lab[m] = comps; q[tl++] = m; } }
    }
    sizes.push(tl);
  }
  return { comps, sizes };
}
/* The solid the STL carries, less any loose lace island (Phase 4): those are
   their own parts by construction, the STL is BLOCKED while they exist (LA3
   holds that biconditional), and everything else must still be one piece.
   An SVG-ONLY lace is not in the STL at all. */
const STL_SOLID = (q) => !q.meta.svgOnly && !q.meta.island;
function connected(model) {
  const a = voxelComponents(model, 0.4, STL_SOLID);
  if (a.comps === 1) return { comps: 1, cell: 0.4 };
  const b = voxelComponents(model, 0.2, STL_SOLID);
  return { comps: b.comps, cell: 0.2, first: a.comps, sizes: b.sizes.slice(0, 6) };
}

/* ---------- F: minimum feature, measured ---------- */
function minFeature(model) {
  const P = model.positions, p = model.params, L = model.layout;
  const floor = p.minDiameter, eps = 1e-9;
  let tubeMin = Infinity, thickMin = Infinity, waistMin = Infinity, ridgeMin = Infinity; const bad = [];
  const veinViolation = model.floorViolations.some((v) => v.kind === 'vein');
  for (const part of model.parts) {
    for (const [v0, n] of part.meta.tubeRings || []) {
      let cx = 0, cy = 0, cz = 0;
      for (let k = 0; k < n; k++) { cx += P[3 * (v0 + k)]; cy += P[3 * (v0 + k) + 1]; cz += P[3 * (v0 + k) + 2]; }
      cx /= n; cy /= n; cz /= n;
      let r = Infinity;
      for (let k = 0; k < n; k++) r = Math.min(r, Math.hypot(P[3 * (v0 + k)] - cx, P[3 * (v0 + k) + 1] - cy, P[3 * (v0 + k) + 2] - cz));
      // a polygon's inscribed diameter is 2 r cos(pi/n): what a printer actually gets
      tubeMin = Math.min(tubeMin, 2 * r * Math.cos(Math.PI / n));
    }
    for (const [a, b] of [...(part.meta.edgePairs ? [...part.meta.edgePairs.outline, ...part.meta.edgePairs.other] : [])]) thickMin = Math.min(thickMin, Math.hypot(P[3 * a] - P[3 * b], P[3 * a + 1] - P[3 * b + 1], P[3 * a + 2] - P[3 * b + 2]));
    for (const [a, b] of part.meta.thickPairs || []) thickMin = Math.min(thickMin, Math.hypot(P[3 * a] - P[3 * b], P[3 * a + 1] - P[3 * b + 1], P[3 * a + 2] - P[3 * b + 2]));
    for (const [a, b] of part.meta.ridgeWidthPairs || []) ridgeMin = Math.min(ridgeMin, Math.hypot(P[3 * a] - P[3 * b], P[3 * a + 1] - P[3 * b + 1], P[3 * a + 2] - P[3 * b + 2]));
    if (part.kind === 'body') {
      const back = L.yA0 - 0.5 * (L.yA0 - L.yA1), front = L.insect ? L.yh : L.Lt / 4;
      for (const ring of part.meta.rings) {
        if (ring.y <= back || ring.y >= front) continue;
        let xa = Infinity, xb = -Infinity, za = Infinity, zb = -Infinity;
        for (let k = 0; k < ring.n; k++) { const i = 3 * (ring.v0 + k); xa = Math.min(xa, P[i]); xb = Math.max(xb, P[i]); za = Math.min(za, P[i + 2]); zb = Math.max(zb, P[i + 2]); }
        waistMin = Math.min(waistMin, xb - xa, zb - za);
      }
    }
  }
  if (tubeMin < floor - eps) bad.push(`tube diameter ${tubeMin.toFixed(4)} < floor ${floor}`);
  if (thickMin < floor - eps) bad.push(`wing thickness ${thickMin.toFixed(4)} < floor ${floor}`);
  if (waistMin < floor - eps) bad.push(`neck/waist ${waistMin.toFixed(4)} < floor ${floor}`);
  if (!veinViolation && ridgeMin < floor - eps) bad.push(`ridge width ${ridgeMin.toFixed(4)} < floor ${floor} and no vein violation reported`);
  return { tubeMin, thickMin, waistMin, ridgeMin, bad };
}

/* ---------- S: SVG symmetry + cut-safe ---------- */
function svgChecks(model) {
  const bad = [];
  const counts = new Map();
  const loops = model.parts.flatMap((part) => G.contourLoops(model, part));
  for (const L of loops) for (const [x, y] of L) { const k = `${x === 0 ? 0 : x},${y}`; counts.set(k, (counts.get(k) || 0) + 1); }
  let unmatched = 0;
  for (const L of loops) for (const [x, y] of L) { const k = `${x === 0 ? 0 : -x},${y}`; const c = counts.get(k) || 0; if (c) counts.set(k, c - 1); else unmatched++; }
  if (unmatched) bad.push(`SVG contour not mirror-symmetric: ${unmatched} unmatched points`);
  // No HAIRLINE: a wing's extra contour loops (rim facets flipping facing at a
  // nearly vertical rim) must hug its main outline. An extra loop out in the
  // wing's interior is a stroke the solid does not have — the revised sheet's
  // first render showed exactly that, from needle facets.
  // In HOLES a wing's contour legitimately has one loop per hole: a loop is
  // stray only when it hugs neither the outline nor one of the builder's own
  // hole polygons (part.meta.holeLoops — both rims of each hole, projected).
  let stray = 0;
  for (const part of model.parts.filter((q) => /^wing\d$|^tail$/.test(q.kind))) {
    const L = G.contourLoops(model, part);
    if (L.length < 2) continue;
    // the OUTLINE is the loop that encloses the most area — not the one with
    // the most points: a lace hole (Phase 4) can carry more vertices than the
    // outline, and choosing by count read the outline itself as a stray
    const big = L.reduce((a, l) => (Math.abs(venArea(l)) > Math.abs(venArea(a)) ? l : a));
    // distance to the outline by its vertices (it is dense), to a hole polygon
    // by its SEGMENTS (a hole has a dozen long straight edges)
    const holes = part.meta.holeLoops || [];
    for (const l of L) if (l !== big) for (const [x, y] of l) {
      let d = Infinity; for (const [bx, by] of big) d = Math.min(d, Math.hypot(x - bx, y - by));
      for (const h of holes) for (let i = 0; i < h.length; i++) d = Math.min(d, segDist([x, y], h[i], h[(i + 1) % h.length]));
      stray = Math.max(stray, d);
    }
  }
  if (stray > 0.5) bad.push(`a wing contour loop stands ${stray.toFixed(3)} mm inside its outline (a hairline)`);
  const cs = G.exportSvg(model, { cutSafe: true });
  if (cs.regions !== 1) bad.push(`cut-safe SVG has ${cs.regions} regions`);
  return { unmatched, regions: cs.regions, loops: loops.length, bad };
}

/* ---------- report: FDM/resin overhang at model orientation ---------- */
function overhang(model) {
  const P = model.positions, I = model.indices;
  let zmin = Infinity; for (let i = 2; i < P.length; i += 3) zmin = Math.min(zmin, P[i]);
  const byKind = {};
  for (const part of model.parts) for (let t = part.t0; t < part.t1; t++) {
    const a = 3 * I[3 * t], b = 3 * I[3 * t + 1], c = 3 * I[3 * t + 2];
    const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const A2 = Math.hypot(...n); if (!A2) continue;
    const zc = (P[a + 2] + P[b + 2] + P[c + 2]) / 3;
    if (n[2] / A2 < -Math.SQRT1_2 && zc > zmin + 0.3) byKind[part.kind] = (byKind[part.kind] || 0) + A2 / 2;
  }
  return byKind;
}

/* ---------- independent geometry helpers (NOT the builder's) ---------- */
function segCross(a, b, c, d) {
  const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  const o1 = o(a, b, c), o2 = o(a, b, d), o3 = o(c, d, a), o4 = o(c, d, b);
  if (o1 * o2 < 0 && o3 * o4 < 0) return true;
  const on = (p, q, r) => Math.min(p[0], q[0]) <= r[0] && r[0] <= Math.max(p[0], q[0]) && Math.min(p[1], q[1]) <= r[1] && r[1] <= Math.max(p[1], q[1]);
  return (o1 === 0 && on(a, b, c)) || (o2 === 0 && on(a, b, d)) || (o3 === 0 && on(c, d, a)) || (o4 === 0 && on(c, d, b));
}
function selfCrossings(poly) {
  let n = 0; const N = poly.length;
  for (let i = 0; i < N; i++) for (let j = i + 2; j < N; j++) {
    if (i === 0 && j === N - 1) continue;
    if (segCross(poly[i], poly[(i + 1) % N], poly[j], poly[(j + 1) % N])) n++;
  }
  return n;
}
function fillRaster(loops, px, box) {
  const nx = Math.ceil((box.x1 - box.x0) / px), ny = Math.ceil((box.y1 - box.y0) / px), g = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const y = box.y0 + (j + 0.5) * px, xs = [];
    for (const L of loops) for (let i = 0; i < L.length; i++) {
      const a = L[i], b = L[(i + 1) % L.length];
      if ((a[1] <= y) !== (b[1] <= y)) xs.push([a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]), b[1] > a[1] ? 1 : -1]);
    }
    xs.sort((p, q) => p[0] - q[0]);
    let w = 0;
    for (let k = 0; k + 1 < xs.length; k++) {
      w += xs[k][1];
      if (w === 0) continue;
      const i0 = Math.max(0, Math.ceil((xs[k][0] - box.x0) / px - 0.5)), i1 = Math.min(nx - 1, Math.floor((xs[k + 1][0] - box.x0) / px - 0.5));
      for (let i = i0; i <= i1; i++) g[j * nx + i] = 1;
    }
  }
  return g;
}
/* Leg area seen from above, and the part of it outside the body's projection. */
function legExposure(model) {
  const body = model.parts.filter((q) => q.kind === 'body').flatMap((q) => G.contourLoops(model, q));
  const legs = model.parts.filter((q) => q.kind === 'leg').flatMap((q) => G.contourLoops(model, q));
  if (!legs.length) return { area: 0, outside: 0 };
  const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const L of [...body, ...legs]) for (const [x, y] of L) { b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y); }
  const px = 0.1, gb = fillRaster(body, px, b), gl = fillRaster(legs, px, b);
  let n = 0, out = 0;
  for (let i = 0; i < gl.length; i++) if (gl[i]) { n++; if (!gb[i]) out++; }
  return { area: n * px * px, outside: out * px * px };
}

/* ---------- R: wing roots, measured ---------- */
function rootChecks(model) {
  const P = model.positions, p = model.params, bad = [];
  const roots = [];
  // A pair's ROOT, read off the emitted triangles (not the builder's hinge):
  // the mean y of the wing's vertices within 0.3 mm of its innermost x — the
  // deep end of the tab embedded in the thorax. Translation in y moves it by
  // exactly that translation, which is what lets the stacking mutation fire.
  // (An earlier version took the centroid of the vertices inside the thorax
  // ellipsoid; the stacking mutation MISSED it, because moving a wing changes
  // WHICH vertices are inside — an instrument that resamples its own subject.)
  for (const part of model.parts.filter((q) => /^wing\d$/.test(q.kind) && q.side === 'R')) {
    let xmin = Infinity;
    for (let v = part.v0; v < part.v1; v++) xmin = Math.min(xmin, P[3 * v]);
    let ys = 0, n = 0;
    for (let v = part.v0; v < part.v1; v++) if (P[3 * v] < xmin + 0.3) { ys += P[3 * v + 1]; n++; }
    roots.push(ys / n);
  }
  // parts are emitted pair 1 first: the roots must run front to back IN PAIR
  // ORDER, each strictly behind the last. The measured root also carries the
  // pair's sweep (a swept tab leans inside the body), so the bar is "distinct
  // and ordered", 0.1 mm — the hinge spacing itself is >= 0.7 Lt / (N - 1).
  let minGap = Infinity;
  for (let i = 0; i + 1 < roots.length; i++) minGap = Math.min(minGap, roots[i] - roots[i + 1]);
  if (roots.length !== p.wingPairs) bad.push(`${roots.length} wing parts for ${p.wingPairs} pairs`);
  if (roots.length > 1 && !(minGap >= 0.1)) bad.push(`wing roots ${minGap.toFixed(3)} mm apart or out of order (stacked)`);
  const want = p.thoraxLength * (1 + 0.3 * Math.max(0, p.wingPairs - 2));
  if (Math.abs(model.layout.Lt - want) > 1e-9) bad.push(`thorax ${model.layout.Lt} mm, the law says ${want}`);
  return { roots, minGap, bad };
}
/* ---------- O: planforms simple ---------- */
function planformChecks(model) {
  const bad = [];
  for (const part of model.parts.filter((q) => /^wing\d$/.test(q.kind) && q.side === 'R')) {
    const x = selfCrossings(part.meta.planform);
    if (x) bad.push(`${part.name} planform crosses itself (${x} edge pairs)`);
  }
  return bad;
}

/* ---------- N: drawn-width floor, this file's OWN measure ---------- */
/* Not the builder's raster: interior points on a grid at floor/12, each one's
   distance to the planform boundary by exact point-to-segment distance; a
   point is COVERED if it lies within floor/2 of a point that can centre a
   floor-wide disc; the depth of the thin part is how far an uncovered point
   stands from the nearest covered one. Grid floor/12, neighbours found through
   buckets of side floor/2 (a covered point is within r of a core point, so it
   is in the 3x3 block around it). Read off part.meta.planform — the
   polygon that was triangulated — less its two root-tab vertices (inside the
   body). Decisive only outside a band of two grid steps around the bar; the
   rows in that band are reported, not asserted. */
function gateThinDepth(poly, floor, H = 12) {
  const h = floor / H, r = floor / 2;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const segD = (p) => { let d = Infinity; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; const ab = [b[0] - a[0], b[1] - a[1]], L2 = ab[0] * ab[0] + ab[1] * ab[1] || 1e-12; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / L2)); d = Math.min(d, Math.hypot(p[0] - a[0] - t * ab[0], p[1] - a[1] - t * ab[1])); } return d; };
  const inPoly = (p) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  // buckets of side r: every point within r of a query lies in the 3x3 block
  const key = (x, y) => `${Math.floor((x - x0) / r)},${Math.floor((y - y0) / r)}`;
  const bucket = (list) => { const m = new Map(); for (const p of list) { const k = key(p[0], p[1]); (m.get(k) || m.set(k, []).get(k)).push(p); } return m; };
  const near = (m, p, ring) => { const cx = Math.floor((p[0] - x0) / r), cy = Math.floor((p[1] - y0) / r), out = []; for (let dx = -ring; dx <= ring; dx++) for (let dy = -ring; dy <= ring; dy++) { const v = m.get(`${cx + dx},${cy + dy}`); if (v) out.push(...v); } return out; };
  const pts = [];
  for (let y = y0 + h / 2; y < y1; y += h) for (let x = x0 + h / 2; x < x1; x += h) if (inPoly([x, y])) pts.push([x, y]);
  const coreM = bucket(pts.filter((p) => segD(p) >= r));
  const covered = pts.map((p) => near(coreM, p, 1).some((c) => Math.hypot(p[0] - c[0], p[1] - c[1]) <= r + 1e-9));
  const covM = bucket(pts.filter((_, i) => covered[i]));
  let depth = 0;
  pts.forEach((p, i) => {
    if (covered[i]) return;
    let d = Infinity;
    for (let ring = 1; ring < 400 && d === Infinity; ring *= 2) for (const c of near(covM, p, ring)) d = Math.min(d, Math.hypot(p[0] - c[0], p[1] - c[1]));
    depth = Math.max(depth, d);
  });
  return { depth, h };
}
function floorChecks(model) {
  const bad = [], floor = model.params.minDiameter, tau = G.THIN_DEPTH_FRAC * floor;
  let worst = 0, gateThin = false, border = false;
  for (const part of model.parts.filter((q) => /^wing\d$/.test(q.kind) && q.side === 'R')) {
    const { depth, h } = gateThinDepth(part.meta.planform.slice(1, -1), floor);
    worst = Math.max(worst, depth);
    const builderThin = model.floorViolations.some((v) => v.kind === 'outline' && `wing${v.pair + 1}` === part.kind);
    if (depth > tau + 2 * h) { gateThin = true; if (!builderThin) bad.push(`${part.name}: thin by this file's measure (${depth.toFixed(2)} mm past the floor disc) and NOT reported by the builder`); }
    else if (depth < tau - 2 * h) { if (builderThin) bad.push(`${part.name}: reported thin by the builder, clear by this file's measure (${depth.toFixed(2)} mm)`); }
    else border = true;
  }
  let refused = false, reason = '';
  try { G.exportStl(model); } catch (e) { refused = e instanceof G.FloorError; reason = e.message; if (!refused) throw e; }
  if (gateThin && !refused) bad.push('the STL exported although a drawn outline is narrower than the floor');
  if (refused !== model.floorViolations.length > 0) bad.push(`the STL ${refused ? 'was refused' : 'exported'} while the model reports ${model.floorViolations.length} floor violation(s)`);
  if (gateVein(model).under && !refused) bad.push('the STL exported although a pair\'s veins are narrower than the floor');
  if (refused && !/narrower than the .* floor|floating island/.test(reason)) bad.push(`the refusal does not say why: "${reason}"`);
  // WHICH pairs are blended is derived here from the PARAMETERS (a middle pair
  // with no unlinked drawing), never read off the builder's violation record:
  // a blended pair's sentence must name the two drawn pairs it comes from and
  // offer unlinking; a drawn pair's must not claim a blend. Every violating
  // pair must also be drawn red in the view (its world segments non-empty).
  const N = model.params.wingPairs, unl = model.params.wings.unlinked || {};
  let blended = 0;
  for (const v of model.floorViolations) {
    const k = v.pair + 1, isBlend = v.pair > 0 && v.pair < N - 1 && !unl[v.pair];
    const says = v.kind === 'lace' || v.kind === 'island' ? `Pair ${k} is blended from pairs 1 and ${N}. Change those, or unlink pair ${k} to edit it directly.` : `Pair ${k} is blended from pairs 1 and ${N}. Widen those, or unlink pair ${k} to edit it directly.`;
    if (isBlend) { blended++; if (refused && !reason.includes(says)) bad.push(`pair ${k} is blended but the refusal does not say "${says}": "${reason}"`); }
    else if (refused && reason.includes(`Pair ${k} is blended`)) bad.push(`pair ${k} is drawn but the refusal calls it blended`);
    if (!(model.wingPairs[v.pair].thinSegments || []).length) bad.push(`pair ${k} is below the floor but nothing is drawn red for it in the view`);
  }
  return { worst, gateThin, refused, border, bad, blended };
}

/* ---------- V: venation (Phase 2) ---------- */
/* The per-pair fields a LINKED middle pair should carry, by the law restated
   here (lerp by pair index, integer-stepped fields rounded), from the
   PARAMETERS — never from the builder's resolved record. */
function pairFieldsFor(p, k) {
  const N = p.wingPairs, W = p.wings;
  if (k === 0) return W.first; if (k === N - 1) return W.last;
  if (W.unlinked && W.unlinked[k]) return W.unlinked[k];
  const t = k / (N - 1), out = {};
  for (const f of G.WING_FIELDS) { const v = W.first[f.id] + (W.last[f.id] - W.first[f.id]) * t; out[f.id] = f.step >= 1 ? Math.round(v) : v; }
  return out;
}
/* this file's own reading of the vein floor from the parameters */
function gateVein(model) {
  const p = model.params, floor = p.minDiameter, per = [];
  if (p.venation === 'none') return { under: false, per };
  for (let k = 0; k < p.wingPairs; k++) {
    const s = pairFieldsFor(p, k);
    const veinMin = s.veinWidth * (1 - s.veinTaper), border = p.venation === 'holes' ? s.marginBorder : Infinity;
    per.push({ pair: k, veinMin, border, under: veinMin < floor - 1e-9 || border < floor - 1e-9 });
  }
  return { under: per.some((x) => x.under), per };
}
const inPoly = (p, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
function venationChecks(model, opts) {
  const bad = [], p = model.params, mode = p.venation;
  if (mode === 'none') return { bad, cells: 0, holes: 0 };
  let cellsTotal = 0, holesTotal = 0, minGap = Infinity, minBorder = Infinity;
  const gv = gateVein(model);
  for (const w of model.wingPairs) {
    const V = w.venation, k = w.index + 1;
    if (!V) { bad.push(`V: pair ${k} has no venation record`); continue; }
    const part = model.parts.find((q) => q.kind === `wing${w.index}` + 0 && q.side === 'R') || model.parts.find((q) => q.kind === `wing${k}` && q.side === 'R');
    // V1 — tiling
    const outline = V.outline, wingArea = Math.abs(venArea(outline));
    let sum = 0; const dir = new Map(), outlineEdges = 0;
    const key = (a, b) => `${a[0]},${a[1]}>${b[0]},${b[1]}`;
    for (const c of V.cells) {
      const A = venArea(c.points); sum += A;
      if (!(A > 0)) bad.push(`V1: pair ${k} cell ${c.id} has area ${A.toExponential(2)} (not CCW or empty)`);
      if (selfCrossings(c.points)) bad.push(`V1: pair ${k} cell ${c.id} crosses itself`);
      for (let i = 0; i < c.points.length; i++) { const kk = key(c.points[i], c.points[(i + 1) % c.points.length]); if (dir.has(kk)) bad.push(`V1: pair ${k} edge ${kk} carried twice in the same direction`); dir.set(kk, c.edges[i]); }
    }
    if (Math.abs(sum - wingArea) > 1e-9 * wingArea) bad.push(`V1: pair ${k} cells sum to ${sum.toFixed(6)} mm², the wing is ${wingArea.toFixed(6)} (gap or overlap)`);
    let unpaired = 0, offOutline = 0;
    for (const [kk, tag] of dir) {
      const [a, b] = kk.split('>').map((q) => q.split(',').map(Number));
      const twin = dir.has(key(b, a));
      if (tag.kind === 'vein' && !twin) unpaired++;
      if (tag.kind !== 'vein' && twin) bad.push(`V1: pair ${k} an outline edge is shared by two cells`);
      if (tag.kind === 'outline') {
        let d = Infinity; for (let i = 0; i < outline.length; i++) d = Math.min(d, segDist(a, outline[i], outline[(i + 1) % outline.length]) + segDist(b, outline[i], outline[(i + 1) % outline.length]));
        if (d > 1e-7) offOutline++;
      }
    }
    if (unpaired) bad.push(`V1: pair ${k} has ${unpaired} vein edge(s) carried by one cell only`);
    if (offOutline) bad.push(`V1: pair ${k} has ${offOutline} 'outline' cell edge(s) that do not lie on the drawn planform`);
    cellsTotal += V.cells.length;
    // V2 — holes
    if (mode === 'holes') {
      const holes = V.cells.flatMap((c) => c.holes.map((h) => ({ h, c })));
      holesTotal += holes.length;
      let gapHere = Infinity, borderHere = Infinity;
      const s = pairFieldsFor(p, w.index), veinMin = s.veinWidth * (1 - s.veinTaper);
      for (const { h, c } of holes) {
        if (!h.every((q) => inPoly(q, c.points))) bad.push(`V2: pair ${k} cell ${c.id} has a hole vertex outside the cell`);
        if (selfCrossings(h)) bad.push(`V2: pair ${k} cell ${c.id} hole crosses itself`);
        if (c.role === 'stigma') bad.push(`V2: pair ${k} the stigma cell is cut`);
        for (const q of h) for (let i = 0; i < outline.length; i++) borderHere = Math.min(borderHere, segDist(q, outline[i], outline[(i + 1) % outline.length]));
      }
      for (let i = 0; i < holes.length; i++) for (let j = i + 1; j < holes.length; j++) {
        const A = holes[i].h, B = holes[j].h;
        for (const q of A) for (let e = 0; e < B.length; e++) gapHere = Math.min(gapHere, segDist(q, B[e], B[(e + 1) % B.length]));
        for (const q of B) for (let e = 0; e < A.length; e++) gapHere = Math.min(gapHere, segDist(q, A[e], A[(e + 1) % A.length]));
      }
      // per PAIR: a thin-veined pair's legitimately close holes must not be judged against the next pair's veins
      if (holes.length > 1 && gapHere < veinMin - 1e-6) bad.push(`V2: pair ${k} two holes stand ${gapHere.toFixed(4)} mm apart, under the narrowest vein ${veinMin.toFixed(4)}`);
      if (holes.length && borderHere < s.marginBorder - 1e-6) bad.push(`V2: pair ${k} a hole stands ${borderHere.toFixed(4)} mm from the outline, under the border ${s.marginBorder.toFixed(4)}`);
      minGap = Math.min(minGap, gapHere); minBorder = Math.min(minBorder, borderHere);
      // the wing's top face is one connected triangle set
      if (part) {
        const I = model.indices, P = model.positions, nT = part.t1 - part.t0;
        const top = [];
        // the top face: triangles whose unit normal points clearly UP (z > 0.5) — a near-vertical hole wall on a tilted wing flips facing at the edge-on threshold and is not the top face
        for (let t = part.t0; t < part.t1; t++) { const a = I[3 * t], b = I[3 * t + 1], c = I[3 * t + 2]; const e1 = [P[3 * b] - P[3 * a], P[3 * b + 1] - P[3 * a + 1], P[3 * b + 2] - P[3 * a + 2]], e2 = [P[3 * c] - P[3 * a], P[3 * c + 1] - P[3 * a + 1], P[3 * c + 2] - P[3 * a + 2]]; const nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0]; const L = Math.hypot(nx, ny, nz); if (L > 0 && nz / L > 0.5) top.push(t); }
        const owner = new Map(); const adj = new Map();
        for (const t of top) { const v = [I[3 * t], I[3 * t + 1], I[3 * t + 2]]; for (let e = 0; e < 3; e++) { const a = v[e], b = v[(e + 1) % 3], kk = a < b ? `${a},${b}` : `${b},${a}`; if (owner.has(kk)) { const o = owner.get(kk); (adj.get(o) || adj.set(o, []).get(o)).push(t); (adj.get(t) || adj.set(t, []).get(t)).push(o); } else owner.set(kk, t); } }
        const seen = new Set([top[0]]), q = [top[0]];
        while (q.length) { const t = q.pop(); for (const n of adj.get(t) || []) if (!seen.has(n)) { seen.add(n); q.push(n); } }
        if (seen.size !== top.length) bad.push(`V2: pair ${k} top face is ${top.length - seen.size + 1} pieces (of ${nT} triangles)`);
      }
    }
    // V3 — a linked middle pair blends
    const N = p.wingPairs, isLinkedMid = w.index > 0 && w.index < N - 1 && !(p.wings.unlinked || {})[w.index];
    if (isLinkedMid) {
      const s = pairFieldsFor(p, w.index), K = s.veinCount * (1 + s.veinBranch);
      if (V.stats.terminals !== K) bad.push(`V3: pair ${k} (linked) records ${V.stats.terminals} terminals, the blend law gives ${K}`);
      const mains = V.veins.filter((v) => v.kind === 'main');
      if (mains.length && Math.abs(mains[0].width[0] - s.veinWidth) > 1e-9) bad.push(`V3: pair ${k} (linked) root vein width ${mains[0].width[0].toFixed(4)}, the blend law gives ${s.veinWidth.toFixed(4)}`);
    }
    // V4 — the vein floor, from the parameters
    const g = gv.per[w.index], rep = model.floorViolations.find((v) => v.kind === 'vein' && v.pair === w.index);
    if (g.under && !rep) bad.push(`V4: pair ${k} veins ${g.veinMin.toFixed(3)} mm / border ${g.border.toFixed(3)} are under the floor by this file's reading and not reported`);
    if (!g.under && rep) bad.push(`V4: pair ${k} reports a vein floor violation that this file does not find`);
    if (rep && !(w.thinSegments || []).length) bad.push(`V4: pair ${k} veins under the floor but nothing drawn red`);
    // V5 — the tail vein
    if (w.hasTail && w.tags) {
      const T = w.tags.map((t) => t[0] === 'tail'), per = G.CR_SAMPLES, dense = w.dense;
      const tailIdx = []; for (let d = 0; d < dense.length; d++) { const i = Math.ceil(d / per); if (d === 0 ? T[0] : d % per === 0 ? T[i] : T[i - 1] && T[i]) tailIdx.push(d); }
      const spec = pairFieldsFor(p, w.index), scale = (q) => [q[0] * spec.length, q[1] * spec.length * spec.stretch];
      // the DRAWN planform (part.meta.planform — the planform owner's record,
      // scallops applied), not the raw samples: a scallop pulls the trailing
      // half toward the span line, tail included, and the veins are planned on
      // the drawn outline (random:6 read 0.023 mm off the raw tail tip).
      // planform is the CCW poly [tabLead, scalloped reversed..., tabTrail]; its
      // reverse is [tabTrail, scalloped[0..], tabLead], so dense[d] is drawn[d+1]
      const rpart = model.parts.find((q) => q.kind === `wing${w.index + 1}` && q.side === 'R');
      const drawn = rpart.meta.planform.slice().reverse();
      if (drawn.length !== dense.length + 2) bad.push(`V5: pair ${k} drawn planform has ${drawn.length} points against ${dense.length + 2} expected`);
      const tailPts = tailIdx.map((d) => drawn[d + 1] || scale(dense[d]));
      const tv = V.veins.find((v) => v.kind === 'main' && v.tail);
      if (!tv) bad.push(`V5: pair ${k} has a tail but no vein runs into it`);
      else { const tip = tv.points[tv.points.length - 1]; const d = Math.min(...tailPts.map((q) => Math.hypot(q[0] - tip[0], q[1] - tip[1]))); if (d > 1e-6) bad.push(`V5: pair ${k} the tail vein ends ${d.toFixed(3)} mm from any tail point of the outline`); }
      if (!V.stats.tailTargeted) bad.push(`V5: pair ${k} record says no vein was targeted at the tail`);
    }
    // V6 — discal and stigma
    const s6 = pairFieldsFor(p, w.index);
    const discal = V.cells.filter((c) => c.role === 'discal'), stig = V.cells.filter((c) => c.role === 'stigma');
    if (s6.discal >= 0.5 && V.stats.discal) { if (discal.length !== 1 || !discal[0].edges.some((e) => e.kind === 'root')) bad.push(`V6: pair ${k} discal cell is ${discal.length} cell(s) or does not touch the root chord`); }
    if (s6.stigma >= 0.5 && V.stats.stigma) {
      if (stig.length !== 1) bad.push(`V6: pair ${k} pterostigma is ${stig.length} cells`);
      else if (mode === 'holes' && stig[0].holes.length) bad.push(`V6: pair ${k} the pterostigma is cut through`);
      else if (mode === 'ridges' && !model.parts.some((q) => q.name === `stigma${k}` && q.side === 'R')) bad.push(`V6: pair ${k} no stigma plate part in RIDGES`);
    }
    if (opts.expectStigma && !V.stats.stigma) bad.push(`V6: pair ${k} was asked for a pterostigma and the record has none (vacuous)`);
    if (opts.expectDiscal && !V.stats.discal) bad.push(`V6: pair ${k} was asked for a discal cell and the record has none (vacuous)`);
  }
  if (mode === 'ridges') {
    const strips = model.parts.filter((q) => q.kind === 'vein' && q.side === 'R' && /^vein/.test(q.name)).length;
    const want = model.wingPairs.reduce((n, w) => n + (w.venation ? w.venation.veins.filter((v) => !v.dropped).length : 0), 0);
    if (strips !== want) bad.push(`V: ${strips} ridge strips emitted for ${want} veins in the record`);
  }
  return { bad, cells: cellsTotal, holes: holesTotal, minGap, minBorder };
}

/* ---------- the ELEGANCE PASS (design doc §9): B / X / G / Y ---------- */
/* B — the wing's EDGE PROFILE. The law restated here from the PARAMETERS (the
   pair's own thickness, the two edge controls, the floor) and the drawn
   planform polygon (part.meta.planform, less its two root-tab vertices), with
   this file's own distance-to-outline; the measured side is the emitted top /
   bottom vertex pair of EVERY planform point (part.meta.slab: vertex v0 + i is
   point i's top, v0 + n + i its bottom). Asserts: every point's emitted
   thickness equals the law (1e-9 mm) and none is under the floor; with a
   chamfer every vertex ON the outline reads the floor exactly. */
function edgeChecks(model) {
  const bad = [], p = model.params, floor = p.minDiameter, P = model.positions;
  let minT = Infinity, worst = 0, onOutline = 0;
  for (const part of model.parts.filter((q) => /^wing\d$/.test(q.kind) && q.side === 'R')) {
    const k = +part.kind.slice(4) - 1, spec = pairFieldsFor(p, k);
    const S = part.meta.slab;
    if (!S) { bad.push(`B: ${part.name} records no slab layout`); continue; }
    const outline = part.meta.planform.slice(1, -1).reverse();            // the drawn outline, root lead -> root trail (open: the root chord is inside the body)
    const umax = Math.max(...outline.map((q) => q[0]));
    const thick = Math.max(floor, spec.thickness), taper = p.wingEdgeTaper, bevel = p.wingEdgeBevel;
    const tip = Math.max(floor, thick * (1 - taper));
    const dOut = (u, w) => { let d = Infinity; for (let i = 0; i + 1 < outline.length; i++) d = Math.min(d, segDist([u, w], outline[i], outline[i + 1])); return d; };
    const law = (u, w) => {
      if (!(taper > 0) && !(bevel > 0)) return thick;
      const body = thick + (tip - thick) * Math.max(0, Math.min(1, u / umax));
      if (!(bevel > 0)) return body;
      const d = dOut(u, w);
      return d >= bevel ? body : floor + (body - floor) * (d / bevel);
    };
    for (let i = 0; i < S.n; i++) {
      const a = part.v0 + i, b = part.v0 + S.n + i;
      const t = Math.hypot(P[3 * a] - P[3 * b], P[3 * a + 1] - P[3 * b + 1], P[3 * a + 2] - P[3 * b + 2]);
      const [u, w] = S.uw[i], want = law(u, w);
      minT = Math.min(minT, t); worst = Math.max(worst, Math.abs(t - want));
      if (bevel > 0 && u >= 0 && dOut(u, w) < 1e-9) { onOutline++; if (Math.abs(t - floor) > 1e-6) bad.push(`B: ${part.name} an outline vertex is ${t.toFixed(4)} mm thick, the chamfer brings the outline to the ${floor} mm floor`); }
    }
    if (worst > 1e-9) bad.push(`B: ${part.name} emitted thickness departs from the edge law by ${worst.toExponential(2)} mm (taper ${taper}, chamfer ${bevel} mm)`);
  }
  if (minT < floor - 1e-9) bad.push(`B: a wing is ${minT.toFixed(4)} mm thick somewhere, under the ${floor} mm floor`);
  if (p.wingEdgeBevel > 0 && p.wingPairs > 0 && !onOutline) bad.push('B: a chamfer is asked for and no vertex lies on the outline (vacuous)');
  return { bad, minT: Number.isFinite(minT) ? minT : null, onOutline };
}

/* X — POINTED terminations. From the PARAMETERS: with pointed tips every leg
   and antenna END is a point — the part records one (meta.points: its apex
   and its last ring), measured here: the last ring's inscribed diameter at or
   over the floor, the apex standing beyond the ring along the axis by at least
   one ring radius (it is a point, not a cap); no ball at a tarsus end or an
   antenna tip; the abdomen floored at the floor over all of it but the last
   1.6 floor radii (restated here) before its tip. With them off, none of it. */
function tipChecks(model) {
  const bad = [], p = model.params, floor = p.minDiameter, P = model.positions;
  const V = (v) => [P[3 * v], P[3 * v + 1], P[3 * v + 2]];
  let pts = 0;
  for (const part of model.parts) for (const q of part.meta.points || []) {
    pts++;
    const [v0, n] = q.ring;
    const c = [0, 0, 0]; for (let k = 0; k < n; k++) for (let d = 0; d < 3; d++) c[d] += V(v0 + k)[d] / n;
    let r = Infinity; for (let k = 0; k < n; k++) r = Math.min(r, Math.hypot(...V(v0 + k).map((x, d) => x - c[d])));
    const dia = 2 * r * Math.cos(Math.PI / n), apex = V(q.apex), h = Math.hypot(...apex.map((x, d) => x - c[d]));
    if (dia < floor - 1e-9) bad.push(`X: ${part.name}-${part.side} a pointed end's last ring is ${dia.toFixed(4)} mm across, under the floor`);
    if (!(h >= r)) bad.push(`X: ${part.name}-${part.side} a pointed end's apex stands ${h.toFixed(3)} mm past its ring (radius ${r.toFixed(3)}) — not a point`);
  }
  const legs = model.parts.filter((q) => q.kind === 'leg' && /^leg\d$/.test(q.name));
  const wantLegPts = p.pointedTips ? legs.length : 0, gotLegPts = legs.reduce((a, q) => a + (q.meta.points || []).length, 0);
  if (gotLegPts !== wantLegPts) bad.push(`X: ${gotLegPts} pointed tarsus ends for ${legs.length} legs (pointed ${p.pointedTips})`);
  const balls = model.parts.filter((q) => /^leg\d-joint4$/.test(q.name)).length;
  if (p.pointedTips && balls) bad.push(`X: ${balls} tarsus ends still carry a ball`);
  if (!p.pointedTips && legs.length && balls !== legs.length) bad.push(`X: rounded tips asked and ${balls} tarsus balls for ${legs.length} legs`);
  const ant = model.parts.filter((q) => q.name === 'antenna');
  if (ant.length && p.pointedTips && ant.some((q) => !(q.meta.points || []).length)) bad.push('X: an antenna end is not pointed');
  if (p.pointedTips && model.parts.some((q) => q.name === 'antenna-tip')) bad.push('X: an antenna tip still carries a ball');
  // the abdomen, from the body's own rings
  const body = model.parts.find((q) => q.kind === 'body'), L = model.layout;
  if (p.pointedTips) {
    const cone = 1.6 * floor / 2;
    let thin = Infinity;
    for (const ring of body.meta.rings) {
      if (!(ring.y < L.yA0 && ring.y >= L.yA1 + cone + 1e-9)) continue;
      let xa = Infinity, xb = -Infinity, za = Infinity, zb = -Infinity;
      for (let k = 0; k < ring.n; k++) { const [x, , z] = V(ring.v0 + k); xa = Math.min(xa, x); xb = Math.max(xb, x); za = Math.min(za, z); zb = Math.max(zb, z); }
      thin = Math.min(thin, xb - xa, zb - za);
    }
    if (thin < floor - 1e-6) bad.push(`X: the pointed abdomen is ${thin.toFixed(4)} mm across above its tip cone, under the floor`);
    const tipY = Math.min(...body.meta.rings.map((r) => r.y));
    if (!(tipY - L.yA1 < cone)) bad.push('X: the pointed abdomen has no tip cone (its last ring is not inside the cone)');
  }
  return { bad, pts };
}

/* G — the SEGMENT style, measured on the body's own rings against the SAME
   bug with its segments unmarked (banding off: a different branch of the
   builder, the envelope alone), interpolated at the ring's own y. At a segment
   boundary clear of the floor the dip must reach at least half of what the
   style asks — a groove's share GROOVE_DEPTH x (1 - style) and a bead's
   BAND_DEPTH x style (the bead's own constant restated here: 0.14) — and a
   groove style must put a ring exactly ON the boundary. */
function segmentChecks(model) {
  const bad = [], p = model.params;
  if (!(p.banding && p.abdomenSegments > 1)) return { bad, seen: 0 };
  const twin = G.buildBug({ ...p, banding: false });
  const body = model.parts.find((q) => q.kind === 'body'), tb = twin.parts.find((q) => q.kind === 'body'), L = model.layout;
  const width = (m, ring) => { let a = Infinity, b = -Infinity; for (let k = 0; k < ring.n; k++) { const x = m.positions[3 * (ring.v0 + k)]; a = Math.min(a, x); b = Math.max(b, x); } return b - a; };
  const twinAt = (y) => { const R = tb.meta.rings; let i = 0; while (i + 2 < R.length && R[i + 1].y < y) i++; const t = (y - R[i].y) / (R[i + 1].y - R[i].y); return width(twin, R[i]) + (width(twin, R[i + 1]) - width(twin, R[i])) * t; };
  const seg = (L.yA0 - L.yA1) / p.abdomenSegments, s = p.segmentStyle;
  const dip = 1 - (1 - 0.14 * s) * (1 - G.GROOVE_DEPTH * (1 - s));
  let seen = 0;
  for (let k = 1; k < p.abdomenSegments; k++) {
    const yb = L.yA0 - k * seg;
    const r0 = body.meta.rings.reduce((a, r) => (Math.abs(r.y - yb) < Math.abs(a.y - yb) ? r : a));
    const ref = twinAt(r0.y);
    if (ref < 1.4 * p.minDiameter) continue;          // the floor holds it there: nothing can show
    seen++;
    if (s < 1 && Math.abs(r0.y - yb) > 1e-9) bad.push(`G: no ring at segment boundary ${k} (nearest ${Math.abs(r0.y - yb).toFixed(3)} mm off)`);
    const ratio = width(model, r0) / ref;
    if (!(ratio <= 1 - 0.5 * dip)) bad.push(`G: segment boundary ${k} is not marked (width ${ratio.toFixed(4)} of the unmarked body, the style ${s} asks a ${(100 * dip).toFixed(1)}% dip)`);
  }
  return { bad, seen };
}

/* Y — the SPECIMEN pose, measured off the emitted right forewing: its inner
   margin (root trail -> tornus, the tornus found by this file's own rule on
   the drawn planform) lies square to the body — the two emitted top vertices
   at the same y; every wing's mid-surface is flat (one z); the antennae run
   straight (ring centres on one line). Rows without venation (the slab's
   first vertices are the planform polygon's own, in order). */
function specimenChecks(model) {
  const bad = [], P = model.positions;
  const part = model.parts.find((q) => q.kind === 'wing1' && q.side === 'R');
  if (!part) return { bad: ['Y: no forewing'] };
  const poly = part.meta.planform, outline = poly.slice(1, -1).reverse();
  let apex = 0; for (let i = 1; i < outline.length; i++) if (outline[i][0] > outline[apex][0]) apex = i;
  const rt = outline[outline.length - 1], A = outline[apex];
  let best = -1, bc = 0;
  for (let i = apex + 1; i < outline.length - 1; i++) { const c = (rt[0] - A[0]) * (outline[i][1] - A[1]) - (rt[1] - A[1]) * (outline[i][0] - A[0]); if (c > bc) { bc = c; best = i; } }
  const toPoly = (j) => outline.length - j;                    // outline[j] is planform[outline.length - j]
  const vy = (i) => P[3 * (part.v0 + i) + 1];
  if (!(part.meta.slab && part.meta.slab.uw[toPoly(best)][0] === outline[best][0] && part.meta.slab.uw[toPoly(best)][1] === outline[best][1])) bad.push('Y: the slab does not start with the planform polygon (cannot read the margin)');
  else {
    // the sweep the margin NEEDS, by this file's own reading of the planform.
    // Eva's ruling: the pose must SUCCEED on any wing — no clamp. The need
    // must lie inside the slider's range and the emitted margin be square.
    const need = Math.atan2(outline[best][1] - rt[1], outline[best][0] - rt[0]) * 180 / Math.PI;
    const f = G.WING_FIELDS.find((x) => x.id === 'sweep');
    const dy = vy(toPoly(best)) - vy(toPoly(outline.length - 1));
    if (need < f.min || need > f.max) bad.push(`Y: the margin needs ${need.toFixed(1)}°, outside the slider (${f.min}–${f.max}°) — Set specimen would clamp`);
    else if (Math.abs(dy) > 1e-6) bad.push(`Y: the forewing's inner margin is not square to the body — its ends differ by ${dy.toFixed(4)} mm in y`);
  }
  for (const w of model.parts.filter((q) => /^wing\d$/.test(q.kind) && q.side === 'R')) {
    const n = w.meta.slab.n; let z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < n; i++) { const z = (P[3 * (w.v0 + i) + 2] + P[3 * (w.v0 + n + i) + 2]) / 2; z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    if (z1 - z0 > 1e-9) bad.push(`Y: ${w.name} is not flat (mid-surface spans ${(z1 - z0).toFixed(4)} mm in z)`);
  }
  const ant = model.parts.find((q) => q.name === 'antenna' && q.side === 'R');
  if (ant) {
    const C = ant.meta.tubeRings.map(([v0, n]) => { const c = [0, 0, 0]; for (let k = 0; k < n; k++) for (let d = 0; d < 3; d++) c[d] += P[3 * (v0 + k) + d] / n; return c; });
    const a = C[0], b = C[C.length - 1], ab = b.map((x, d) => x - a[d]), L2 = ab.reduce((s, x) => s + x * x, 0);
    let dev = 0; for (const c of C) { const t = ab.reduce((s, x, d) => s + x * (c[d] - a[d]), 0) / L2; dev = Math.max(dev, Math.hypot(...c.map((x, d) => x - a[d] - t * ab[d]))); }
    if (dev > 1e-6) bad.push(`Y: the antennae are not straight (a ring centre stands ${dev.toFixed(4)} mm off the line)`);
  }
  return { bad };
}

/* ---------- T: the tail lives on the bottom pair only ---------- */
/* Build the same bug with TAIL off and compare: every wing part that is NOT the
   bottom pair must be bit-identical (so no middle pair carries any tail
   geometry), and the bottom pair must differ (the clause can see a tail). */
function tailIsolation(modelOn, modelOff) {
  const bad = [], N = modelOn.params.wingPairs;
  const vtx = (m, kind, side) => { const q = m.parts.find((x) => x.kind === kind && x.side === side); return q ? Array.from(m.positions.slice(3 * q.v0, 3 * q.v1)) : null; };
  for (let k = 1; k <= N; k++) for (const side of ['R', 'L']) {
    const a = vtx(modelOn, `wing${k}`, side), b = vtx(modelOff, `wing${k}`, side);
    const same = a && b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
    if (k < N && !same) bad.push(`pair ${k} (${side}) changes with the TAIL toggle — a non-bottom pair carries tail geometry`);
    if (k === N && same) bad.push(`the bottom pair ${k} (${side}) does not change with the TAIL toggle (no tail drawn)`);
  }
  if (!modelOn.wingPairs[N - 1].hasTail) bad.push('the bottom pair reports no tail');
  if (modelOn.wingPairs.slice(0, N - 1).some((w) => w.hasTail)) bad.push('a non-bottom pair reports a tail');
  return bad;
}

/* ---------- run ---------- */
/* ---------- LA: the lace import (Phase 4) ---------- */
/* this file's own reading of a lace record's MATERIAL, rasterised at floor/10
   (not the builder's 0.05 mm raster, not its EDT): HOLES — the regions less
   their holes, plus the islands; RIDGES — the plates. Outside the wing counts
   as material (the outline has its own floor), as in the builder. */
function laceMaterial(L, outline, floor) {
  const h = floor / 10;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of outline) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const box = { x0: x0 - 3 * h, y0: y0 - 3 * h, x1: x1 + 3 * h, y1: y1 + 3 * h };
  const nx = Math.ceil((box.x1 - box.x0) / h), ny = Math.ceil((box.y1 - box.y0) / h);
  const inside = fillRaster([outline], h, box), mat = new Uint8Array(nx * ny);
  if (L.mode === 'holes') {
    const holes = fillRaster(L.regions.flatMap((R) => R.holes), h, box);
    const iso = fillRaster(L.islands.map((x) => x.outer), h, box), isoH = fillRaster(L.islands.flatMap((x) => x.holes), h, box);
    for (let k = 0; k < mat.length; k++) mat[k] = inside[k] && (!holes[k] || (iso[k] && !isoH[k])) ? 1 : 0;
  } else {
    const pl = fillRaster(L.plates.map((x) => x.outer), h, box), plH = fillRaster(L.plates.flatMap((x) => x.holes), h, box);
    for (let k = 0; k < mat.length; k++) mat[k] = pl[k] && !plH[k] ? 1 : 0;
  }
  return { mat, inside, nx, ny, h };
}
/* the thin depth by binary opening with a floor-wide disc (brute offsets),
   then dilation steps from the opened set: a Chebyshev depth, judged outside
   a band of two grid steps around the bar like N */
function laceThinDepth(L, outline, floor) {
  const { mat, inside, nx, ny, h } = laceMaterial(L, outline, floor);
  const N = nx * ny, solid = new Uint8Array(N);
  for (let k = 0; k < N; k++) solid[k] = mat[k] || !inside[k] ? 1 : 0;
  const r = Math.round(floor / 2 / h), offs = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) offs.push([dx, dy]);
  const at = (g, i, j) => (i < 0 || j < 0 || i >= nx || j >= ny ? 1 : g[j * nx + i]);
  const er = new Uint8Array(N);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { let ok = 1; for (const [dx, dy] of offs) if (!at(solid, i + dx, j + dy)) { ok = 0; break; } er[j * nx + i] = ok; }
  const cov = new Uint8Array(N);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { if (!er[j * nx + i]) continue; for (const [dx, dy] of offs) { const a = i + dx, b = j + dy; if (a >= 0 && b >= 0 && a < nx && b < ny) cov[b * nx + a] = 1; } }
  let front = []; const seen = cov.slice();
  for (let k = 0; k < N; k++) if (cov[k]) front.push(k);
  let depth = 0, steps = 0, left = 0;
  for (let k = 0; k < N; k++) if (mat[k] && inside[k] && !cov[k]) left++;
  while (left > 0 && front.length && steps < 400) {
    steps++; const nf = [];
    for (const c of front) { const ci = c % nx; for (const d of [1, -1, nx, -nx, nx + 1, nx - 1, -nx + 1, -nx - 1]) { const m = c + d; if (m < 0 || m >= N || seen[m]) continue; if (Math.abs((m % nx) - ci) > 1) continue; seen[m] = 1; nf.push(m); if (mat[m] && inside[m]) { left--; depth = steps; } } }
    front = nf;
  }
  return { depth: depth * h, h };
}
function laceChecks(model, opts) {
  const bad = [], p = model.params, floor = p.minDiameter, tau = G.THIN_DEPTH_FRAC * floor;
  let any = false, holes = 0, islands = 0, ties = 0, plates = 0, gateThin = false;
  const N = p.wingPairs;
  for (const w of model.wingPairs) {
    const L = w.lace, k = w.index + 1;
    const s = pairFieldsFor(p, w.index);
    const wants = p.venation !== 'none' && s.laceRole >= 0.5 && s.laceBlend > 0;
    if (!!L !== wants) { bad.push(`LA0: pair ${k} ${L ? 'carries a lace record its fields do not ask for' : 'asks for a lace (role and blend from the parameters) and carries no record'}`); continue; }
    if (!L) continue;
    any = true;
    // LA0 — the source is said: the stand-in when nothing is loaded
    if ((p.lace.svg === '') !== L.standIn) bad.push(`LA0: pair ${k} lace standIn=${L.standIn} with ${p.lace.svg ? 'a file' : 'no file'} loaded`);
    if (L.standIn && L.name !== G.STAND_IN_NAME) bad.push(`LA0: pair ${k} the stand-in is not labelled as one ("${L.name}")`);
    // LA1 — clipped inside its region (each cell in FILL, the outline in REPLACE)
    const V = w.venation, O = V.outline;
    if ((L.role === 'fill') !== (s.laceRole < 1.5)) bad.push(`LA1: pair ${k} role ${L.role} but the field reads ${s.laceRole}`);
    if (L.mode === 'holes') {
      if (L.role === 'fill' && L.regions.length !== V.cells.length) bad.push(`LA1: pair ${k} FILL CELLS has ${L.regions.length} regions for ${V.cells.length} cells`);
      for (const R of L.regions) {
        const poly = R.polygon;
        for (const hl of R.holes) { holes++; if (!hl.every((q) => inPoly(q, poly))) bad.push(`LA1: pair ${k} a lace hole leaves its ${L.role === 'fill' ? 'cell' : 'outline'} (region ${R.id})`); if (selfCrossings(hl)) bad.push(`LA1: pair ${k} a lace hole crosses itself`); }
        for (const x of R.islands) { islands++; if (!x.outer.every((q) => inPoly(q, poly))) bad.push(`LA1: pair ${k} a lace island leaves its region (${R.id})`); }
      }
    } else {
      for (const x of L.plates) { plates++; for (const q of x.outer) if (!inPoly(q, O)) { let d = Infinity; for (let i = 0; i < O.length; i++) d = Math.min(d, segDist(q, O[i], O[(i + 1) % O.length])); if (d > LACE.LACE_PX) { bad.push(`LA1: pair ${k} a lace plate stands ${d.toFixed(3)} mm outside the outline`); break; } } }
    }
    // LA5 — the BLEND: below 1 a vein-wide arc about the root chord's middle
    // at (1 - blend) of the farthest outline point divides the procedural root
    // from the import; no hole crosses it (radius re-derived here)
    if (L.spec.laceBlend < 1) {
      const S = L.seam;
      const rootPts = O.filter((q) => q[0] === 0), ow = rootPts.reduce((a, q) => a + q[1], 0) / rootPts.length;
      const Rmax = Math.max(...O.map(([u, w2]) => Math.hypot(u, w2 - ow))), want = (1 - L.spec.laceBlend) * Rmax;
      if (!S || Math.abs(S.radius - want) > 1e-9 || S.origin[1] !== ow) bad.push(`LA5: pair ${k} blend ${L.spec.laceBlend}: the seam arc is at ${S ? S.radius.toFixed(3) : 'nothing'}, the law gives ${want.toFixed(3)} mm`);
      else if (L.mode === 'holes') for (const R of L.regions) for (const hl of R.holes) { const ds = hl.map(([u, w2]) => Math.hypot(u - S.origin[0], w2 - S.origin[1])); if (Math.min(...ds) < S.radius - S.width / 2 + 1e-6 && Math.max(...ds) > S.radius + S.width / 2 - 1e-6) { bad.push(`LA5: pair ${k} a hole crosses the blend's seam arc`); break; } }
    }
    // LA2 — a linked middle pair blends its import settings (the law restated here)
    const isLinkedMid = w.index > 0 && w.index < N - 1 && !(p.wings.unlinked || {})[w.index];
    if (isLinkedMid) for (const id of G.LACE_FIELD_IDS) if (L.spec[id] !== s[id]) bad.push(`LA2: pair ${k} (linked) ${id} ${L.spec[id]}, the blend law gives ${s[id]}`);
    // LA3 — islands, per option, against the parameters
    const islandParts = model.parts.filter((q) => q.kind === `island${k}`);
    const viol = model.floorViolations.find((v) => v.kind === 'island' && v.pair === w.index);
    if (L.mode === 'holes') {
      const found = L.stats.islandsFound, opt = p.laceIslands;
      if (opt === 'svg') {
        if (viol) bad.push(`LA3: pair ${k} SVG-only lace reports an island violation`);
        if (!model.parts.some((q) => q.kind === `svglace${k}` && q.meta.svgOnly)) bad.push(`LA3: pair ${k} SVG-only lace has no SVG-only part`);
      } else {
        const wantDropped = opt === 'drop' ? L.stats.islandAreas.filter((a) => a < p.laceDropMm2).length : 0;
        const wantKept = opt === 'bridge' ? 0 : found - wantDropped;
        if (L.stats.dropped !== wantDropped) bad.push(`LA3: pair ${k} dropped ${L.stats.dropped} islands, ${wantDropped} are under ${p.laceDropMm2} mm²`);
        if (L.keptIslands !== wantKept) bad.push(`LA3: pair ${k} keeps ${L.keptIslands} islands loose, the option says ${wantKept}`);
        if (!!viol !== (wantKept > 0)) bad.push(`LA3: pair ${k} ${wantKept} islands left loose but ${viol ? 'an' : 'no'} island violation is reported`);
        if ((islandParts.length > 0) !== (wantKept > 0)) bad.push(`LA3: pair ${k} has ${islandParts.length} island parts for ${wantKept} loose islands`);
        if (opt === 'bridge') {
          if (L.ties.length !== found) bad.push(`LA3: pair ${k} ${found} islands and ${L.ties.length} ties`);
          for (const t of L.ties) { ties++; if (t.width < floor - 1e-9) bad.push(`LA3: pair ${k} a tie is ${t.width.toFixed(3)} mm, under the ${floor} mm floor`); if (!inPoly(t.a, O) || !inPoly(t.b, O)) bad.push(`LA3: pair ${k} a tie leaves the outline`); }
        }
      }
    } else if (viol || islandParts.length) bad.push(`LA3: pair ${k} a RIDGES lace has islands reported or built (a raised lace sits on a solid wing)`);
    // LA4 — the thread floor, this file's own measure, against the report
    if (!L.svgOnly) {
      const { depth, h } = laceThinDepth(L, O, floor), rep = model.floorViolations.some((v) => v.kind === 'lace' && v.pair === w.index);
      if (depth > tau + 2 * h) { gateThin = true; if (!rep) bad.push(`LA4: pair ${k} lace is thin by this file's measure (${depth.toFixed(2)} mm past the floor disc) and not reported`); }
      else if (depth < tau - 2 * h && rep) bad.push(`LA4: pair ${k} lace reported thin, clear by this file's measure (${depth.toFixed(2)} mm)`);
      if (rep && !(w.thinSegments || []).length) bad.push(`LA4: pair ${k} lace thin but nothing drawn red`);
    }
  }
  // LA3 — the SVG-ONLY exception, measured: the STL is byte for byte the
  // same bug with every lace switched off
  if (any && p.venation === 'holes' && p.laceIslands === 'svg') {
    const q = JSON.parse(JSON.stringify(p));
    for (const w of [q.wings.first, q.wings.last, ...Object.values(q.wings.unlinked)]) w.laceRole = 0;
    const a = G.exportStl(model, { allowBelowFloor: true }), b = G.exportStl(G.buildBug(q), { allowBelowFloor: true });
    if (a.length !== b.length || a.some((x, i) => x !== b[i])) bad.push('LA3: the SVG-only lace changed the STL (it must be the procedural bug, byte for byte)');
  }
  // LA3 — every island option: island parts exist iff an island violation does
  if (model.parts.some((q) => q.meta.island && !q.meta.svgOnly) !== model.floorViolations.some((v) => v.kind === 'island')) bad.push('LA3: loose island parts and island violations disagree');
  // LA6 — the lace reaches the SVG: every HOLES lace hole is a contour loop of
  // its wing; a RIDGES lace is drawn in ink on a paper wing; an SVG-only lace
  // replaces its wing in the file
  if (any) {
    const svg = G.exportSvg(model).svg;
    for (const w of model.wingPairs) {
      const L = w.lace, k = w.index + 1; if (!L) continue;
      if (L.svgOnly) { if (!svg.includes(`data-part="svglace${k}-R"`) || svg.includes(`data-part="wing${k}-R"`)) bad.push(`LA6: pair ${k} the SVG-only lace does not replace its wing in the SVG`); continue; }
      if (L.mode === 'ridges') { if (L.plates.length && !svg.includes(`data-lace="lace${k}-R"`)) bad.push(`LA6: pair ${k} the raised lace is not in the SVG`); if (!new RegExp(`data-part="wing${k}-R"[^>]*fill="${G.SVG_LINE}"`).test(svg)) bad.push(`LA6: pair ${k} the wing under a raised lace is not drawn as paper`); continue; }
      const part = model.parts.find((q) => q.kind === `wing${k}` && q.side === 'R');
      const loops = G.contourLoops(model, part);
      const P = model.positions;
      // the hole's world image: the builder's own wing transform is not exposed, so the
      // check is on COUNT and on position via holeLoops — each lace hole's top rim is a
      // recorded loop, and some contour loop must lie on it
      const rims = part.meta.holeLoops.filter((_, i) => i % 2 === 0);
      const nh = L.regions.reduce((n, R) => n + R.holes.length, 0);
      if (rims.length !== nh) bad.push(`LA6: pair ${k} records ${rims.length} hole rims for ${nh} lace holes`);
      let missing = 0;
      for (const rim of rims) { const c = rim.reduce((a, q) => [a[0] + q[0] / rim.length, a[1] + q[1] / rim.length], [0, 0]); if (!loops.some((l) => l.length >= 3 && l.some((q) => Math.min(...rim.map((r) => Math.hypot(r[0] - q[0], r[1] - q[1]))) < 0.05) && inPoly(c, l))) missing++; }
      if (missing) bad.push(`LA6: pair ${k} ${missing} lace hole(s) do not appear in the SVG`);
      void P;
    }
  }
  if (opts.expectLace && !any) bad.push('LA0: the lace row carries no lace (vacuous)');
  if (opts.expectIslands && !model.wingPairs.some((w) => w.lace && w.lace.stats.islandsFound > 0)) bad.push('LA3: the island row finds no island (vacuous)');
  if (opts.expectLaceThin && !gateThin) bad.push('LA4: the deliberately thin lace row is not thin by this file\'s measure (vacuous)');
  return { bad, any, holes, islands, ties, plates };
}

function check(label, model, opts = {}) {
  const fails = [];
  const md = G.mirrorDiff(model);
  if (md !== 0) fails.push(`M: mirrorDiff ${md}`);
  const stl = analyzeStl(G.exportStl(model, { allowBelowFloor: true }));   // N below checks the refusal itself
  if (stl.boundary !== 0) fails.push(`W: ${stl.boundary} boundary edges`);
  for (const b of partChecks(model)) fails.push(`P: ${b}`);
  const cn = connected(model);
  if (cn.comps !== 1) fails.push(`C: ${cn.comps} connected regions at ${cn.cell} mm (sizes ${cn.sizes})`);
  const mf = minFeature(model);
  for (const b of mf.bad) fails.push(`F: ${b}`);
  const sv = svgChecks(model);
  for (const b of sv.bad) fails.push(`S: ${b}`);
  const rc = rootChecks(model);
  for (const b of rc.bad) fails.push(`R: ${b}`);
  for (const b of planformChecks(model)) fails.push(`O: ${b}`);
  let le = null;
  if (opts.tucked) {
    le = legExposure(model);
    if (!(le.outside <= 0.02 * le.area)) fails.push(`L: tucked legs show ${le.outside.toFixed(2)} of ${le.area.toFixed(2)} mm² outside the body from above`);
  }
  const fc = floorChecks(model);
  for (const b of fc.bad) fails.push(`N: ${b}`);
  if (opts.expectThin && !fc.gateThin) fails.push('N: the deliberately thin row is not thin by this file\'s measure (vacuous)');
  if (opts.expectBlended && !fc.blended) fails.push('N: the blended-pair row has no blended pair below the floor (vacuous)');
  if (opts.tailIso) for (const b of tailIsolation(model, opts.tailIso)) fails.push(`T: ${b}`);
  if (opts.repaired && !model.notes.some((n) => /eased toward the nearer drawn pair/.test(n))) fails.push('I: the crossing blend was not reported repaired');
  const ec = edgeChecks(model); for (const b of ec.bad) fails.push(b);
  const xc = tipChecks(model); for (const b of xc.bad) fails.push(b);
  const gc = segmentChecks(model); for (const b of gc.bad) fails.push(b);
  if (opts.expectGrooves && !gc.seen) fails.push('G: the segment row measured no boundary (vacuous)');
  if (opts.specimen) for (const b of specimenChecks(model).bad) fails.push(b);
  const vn = venationChecks(model, opts);
  for (const b of vn.bad) fails.push(b.startsWith('V') ? b : `V: ${b}`);
  if (opts.expectVeinThin && !gateVein(model).under) fails.push('V4: the deliberately thin-vein row is not under the floor by this file\'s reading (vacuous)');
  if (opts.expectTailVein && !model.wingPairs.some((w) => w.hasTail)) fails.push('V5: the tail-vein row has no tail (vacuous)');
  const la = laceChecks(model, opts);
  for (const b of la.bad) fails.push(b);
  return { label, fails, md, stl, cn, mf, sv, rc, le, fc, vn, ec, xc, gc, la, notes: model.notes };
}

function fmt(r) {
  const f = (x) => (Number.isFinite(x) ? x.toFixed(3) : '  — ');
  return `${r.fails.length ? 'FAIL' : 'ok  '} ${r.label.padEnd(26)} tris=${String(r.stl.triangles).padStart(6)} stl=${(r.stl.bytes / 1024).toFixed(0).padStart(5)}KiB `
    + `mirror=${r.md} boundary=${r.stl.boundary} nonManifold(unrated)=${r.stl.nonManifold} regions=${r.cn.comps} `
    + `minTube=${f(r.mf.tubeMin)} minThick=${f(r.mf.thickMin)} waist=${f(r.mf.waistMin)} roots=${r.rc.roots.length}${r.rc.roots.length > 1 ? `@${f(r.rc.minGap)}mm` : ''} cutRegions=${r.sv.regions}`
    + ` floor=${r.fc.refused ? 'STL-REFUSED' : 'ok'}(${r.fc.worst.toFixed(2)}mm${r.fc.border ? ',borderline' : ''})`
    + (r.vn.cells ? ` cells=${r.vn.cells}${r.vn.holes ? ` holes=${r.vn.holes} gap=${f(r.vn.minGap)} border=${f(r.vn.minBorder)}` : ''}` : '')
    + ` edge=${r.ec.minT === null ? '—' : r.ec.minT.toFixed(3)}mm${r.ec.onOutline ? `(${r.ec.onOutline} on the outline)` : ''} points=${r.xc.pts}${r.gc.seen ? ` grooves=${r.gc.seen}` : ''}`
    + (r.le ? ` legsOutside=${r.le.outside.toFixed(2)}/${r.le.area.toFixed(2)}mm²` : '')
    + (r.la && r.la.any ? ` lace: holes=${r.la.holes} islands=${r.la.islands} ties=${r.la.ties} plates=${r.la.plates}` : '') + (r.notes.length ? `  notes: ${r.notes.join('; ')}` : '');
}

/* ---------- E / K / D: pure-function checks ---------- */
function functionChecks() {
  const out = [];
  const ok = (cond, msg) => out.push([cond, msg]);
  // E
  const pts = G.DEFAULT_WINGS.first.points;
  const target = [0.6, -0.4];
  const req = pts.map((q) => q.slice()); req[2] = target;
  const reqCross = selfCrossings(G.sampleOutline(req));
  const mv = G.moveControlPoint(pts, 2, target);
  ok(reqCross > 0, `E: the requested drag really crosses (${reqCross} edge pairs, this file's test)`);
  ok(!mv.ok && mv.points === pts && /cross/.test(mv.reason), `E: the crossing drag is BLOCKED, points unchanged (${mv.reason})`);
  const good = G.moveControlPoint(pts, 2, [0.8, 0.2]);
  ok(good.ok && good.points[2][0] === 0.8 && good.points[2][1] === 0.2, 'E: a valid drag is accepted');
  const rootMv = G.moveControlPoint(pts, 0, [0.4, 0.12]);
  ok(rootMv.ok && rootMv.points[0][0] === 0, 'E: a root point stays pinned at u = 0 when dragged');
  const ins = G.insertControlPoint(pts, [0.6, 0.17]);
  ok(ins.ok && ins.points.length === pts.length + 1, `E: inserting a point on the curve is accepted (at index ${ins.index})`);
  const del = G.deleteControlPoint(pts, 3);
  ok(del.ok && del.points.length === pts.length - 1, 'E: deleting an interior point is accepted');
  ok(!G.deleteControlPoint(pts, 0).ok, 'E: deleting a root is refused');
  ok(!G.deleteControlPoint(HAND_OUTLINES.minimal, 1).ok, 'E: deleting below the minimum point count is refused');
  // I (vacuity half; the built half rides in the crossing-blend row)
  const A = G.resampleApexAligned(G.sampleOutline(CROSSING_BLEND.first)), B = G.resampleApexAligned(G.sampleOutline(CROSSING_BLEND.last));
  const raw = A.map((a, k) => [(a[0] + B[k][0]) / 2, (a[1] + B[k][1]) / 2]);
  ok(selfCrossings(raw) > 0, `I: the crossing blend's raw mix at t = 0.5 really crosses (${selfCrossings(raw)} edge pairs)`);
  // K
  const tally = { '3': 0, '2': 0, wings: [0, 0, 0, 0, 0], ant: {} }; let badK = [];
  for (let s = 1; s <= 500; s++) {
    const p = G.randomParams(s);
    tally[p.bodyParts]++; tally.wings[p.wingPairs]++; tally.ant[p.antennaType] = (tally.ant[p.antennaType] || 0) + 1;
    if (!(p.legPairs > 0 && p.legsVisible)) badK.push(`seed ${s}: no legs`);
    if (p.bodyParts === '3' && p.legPairs !== 3) badK.push(`seed ${s}: 3-part with ${p.legPairs} leg pairs`);
    if (p.bodyParts === '2' && (p.legPairs !== 4 || p.wingPairs !== 0 || p.antennaType !== 'none')) badK.push(`seed ${s}: 2-part with ${p.legPairs} legs / ${p.wingPairs} wings / ${p.antennaType}`);
  }
  ok(!badK.length, `K: 500 randomized bugs plausible — 3-part ${tally['3']}, 2-part ${tally['2']}; wing pairs 0-4: ${tally.wings.join('/')}; antennae ${JSON.stringify(tally.ant)}${badK.length ? ' — ' + badK.slice(0, 4).join('; ') : ''}`);
  // T — the tail group, at the level of the outline operations
  const tBase = G.DEFAULT_WINGS.last.points, tail0 = { ...G.STARTER_TAIL, on: true };
  const sameArr = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  ok(sameArr(G.composeOutline(tBase, { ...tail0, on: false }).points, tBase), 'T: TAIL off composes exactly the base outline (no point added, none moved)');
  const cOn = G.composeOutline(tBase, tail0);
  ok(cOn.points.length === tBase.length + tail0.points.length && sameArr(cOn.points.filter((_, i) => cOn.tags[i][0] === 'base'), tBase), `T: TAIL on adds exactly the ${tail0.points.length} tail points and leaves every base point as it was`);
  const ti = cOn.tags.findIndex((t) => t[0] === 'tail' && t[1] === 4);
  const tTarget = [cOn.points[ti][0] + 0.03, cOn.points[ti][1] - 0.02];
  const ed = G.moveComposed(tBase, tail0, ti, tTarget);
  ok(ed.ok && sameArr(ed.base, tBase) && !sameArr(ed.tail.points, tail0.points), 'T: dragging a tail point edits the tail group only');
  const offAgain = G.composeOutline(ed.base, { ...ed.tail, on: false });
  const onAgain = G.composeOutline(ed.base, { ...ed.tail, on: true });
  const tBack = onAgain.points[onAgain.tags.findIndex((t) => t[0] === 'tail' && t[1] === 4)];
  ok(sameArr(offAgain.points, tBase) && Math.hypot(tBack[0] - tTarget[0], tBack[1] - tTarget[1]) < 1e-12, `T: OFF removes exactly the tail; ON again restores the EDITED tail (point back at ${tBack.map((v) => v.toFixed(3))}), not the starter`);
  const midTail = (cOn.points[ti] .map((v, k) => (v + cOn.points[ti + 1][k]) / 2));
  const insT = G.insertComposed(tBase, tail0, midTail);
  ok(insT.ok && insT.tail.points.length === tail0.points.length + 1 && sameArr(insT.base, tBase), 'T: a point added between two tail points joins the tail group (the tag is preserved)');
  const insB = G.insertComposed(tBase, tail0, [0.6, 0.18]);
  ok(insB.ok && insB.base.length === tBase.length + 1 && sameArr(insB.tail.points, tail0.points), 'T: a point added on the base outline joins the base, the tail group is untouched');
  const two = { ...tail0, points: tail0.points.slice(0, 2) };
  const c2 = G.composeOutline(tBase, two);
  ok(!G.deleteComposed(tBase, two, c2.tags.findIndex((t) => t[0] === 'tail')).ok, 'T: deleting below 2 tail points is refused (turn TAIL off instead)');
  // the tail follows the bottom pair when the pair count changes, edits included
  const pt = G.defaultParams(); pt.wings.tail = { ...ed.tail, on: true };
  const shapes = [];
  for (const n of [1, 2, 4]) {
    pt.wingPairs = n; const m = G.buildBug(pt);
    const bottom = m.wingPairs[n - 1];
    const tagged = bottom.tags.filter((t) => t[0] === 'tail').length;
    shapes.push(`${n}:${m.wingPairs.map((w) => (w.hasTail ? 'T' : '-')).join('')}`);
    ok(bottom.hasTail && tagged === ed.tail.points.length && m.wingPairs.slice(0, n - 1).every((w) => !w.hasTail), `T: at ${n} pair(s) the edited tail (${tagged} points) is on the bottom pair only`);
  }
  // migration of the retired sliders
  const oldDoc = { format: G.DESIGN_FORMAT, version: 1, name: 'old', params: { ...G.defaultParams(), tailLength: 9, tailWidth: 2.4, tailClub: 0.5 } };
  delete oldDoc.params.wings.tail;
  const mig = G.paramsFromDesign(JSON.parse(JSON.stringify(oldDoc)));
  const mm = G.buildBug(mig.params);
  ok(mig.ok && mig.params.wings.tail.on && mig.params.wings.tail.points.length === 11 && !('tailLength' in mig.params) && mig.notes.some((n) => /migrated into a TAIL group/.test(n)) && mm.wingPairs[1].hasTail,
    `T: a design with the retired tail sliders (length 9 mm) migrates into an ON tail group of ${mig.params.wings.tail.points.length} points on the bottom pair, with a note`);
  // D
  const p0 = G.randomParams(7); p0.wingPairs = 4; p0.wings.unlinked[2] = { ...p0.wings.first, points: HAND_OUTLINES.falcate };
  const norm = G.normalizeParams(p0);
  const back = G.paramsFromDesign(JSON.parse(JSON.stringify(G.designFromParams(norm, 'x'))));
  ok(back.ok && JSON.stringify(back.params) === JSON.stringify(norm) && !back.notes.length, 'D: a design (4 pairs, one unlinked) round-trips through JSON exactly');
  const broken = G.designFromParams(norm); broken.params.wings.first.points = [[0, 0.1], [0.8, -0.3], [0.8, 0.3], [0, -0.1]];
  const bb = G.paramsFromDesign(JSON.parse(JSON.stringify(broken)));
  ok(bb.ok && bb.notes.some((n) => /first pair outline refused/.test(n)), `D: an invalid outline in a file is refused with a note (${bb.notes[0]})`);
  const newer = G.designFromParams(norm); newer.version = 99;
  ok(!G.paramsFromDesign(newer).ok, 'D: a newer design version is refused, not partly read');
  // the elegance pass (§9): a design saved before it loads at the OLD ends
  const v3 = G.designFromParams(G.legacyDefaultParams(), 'v3'); v3.version = 3;
  for (const k of Object.keys(G.LEGACY_STYLE)) delete v3.params[k];
  const r3 = G.paramsFromDesign(JSON.parse(JSON.stringify(v3)));
  const b3 = G.buildBug(r3.params), bl = G.buildBug(G.legacyDefaultParams());
  ok(r3.ok && b3.positions.length === bl.positions.length && b3.positions.every((x, i) => Object.is(x, bl.positions[i])), 'D: a version-3 design (no elegance fields) loads at the OLD ends and builds bit-identically to the legacy default');
  // the teardrop club never under the floor, at the grid of its controls
  let clubMin = Infinity; const fr = 0.5 / Math.cos(Math.PI / 10);
  for (const w of [1, 1.8, 4]) for (const t of [0, 0.35, 1]) for (let i = 0; i <= 200; i++) clubMin = Math.min(clubMin, G.clubRadius(i / 200, fr, w, t, fr) / fr);
  ok(clubMin >= 1 - 1e-12, `X: the teardrop club's radius never falls under the floor (min ${clubMin.toFixed(4)} x the floor radius)`);
  // the specimen pose SETS values and returns notes; it leaves the rest alone
  const sp = G.specimenPose(G.defaultParams());
  ok(sp.params.legReach === 0 && sp.params.antennaCurl === 0 && sp.params.wings.first.dihedral === 0 && sp.params.wings.last.dihedral === 0 && sp.params.abdomenLength === G.defaultParams().abdomenLength, `Y: specimenPose sets legs tucked, antennae straight, wings flat, and leaves the body alone (forewing sweep ${sp.params.wings.first.sweep.toFixed(3)}°)`);
  ok(Math.abs(sp.params.wings.first.sweep - G.DEFAULTS.wings.first.sweep) < 1e-12, 'Y: the default IS the specimen pose of itself (its forewing sweep derived, not typed)');
  // PHASE 4 — the SVG reader (LP), on a file whose answer is written down
  {
    const t = '<svg xmlns="http://www.w3.org/2000/svg"><g transform="translate(10 20)"><rect x="0" y="0" width="4" height="2" transform="rotate(90)"/></g>'
      + '<circle cx="0" cy="0" r="1" style="display:none"/><path d="M0 0 A1 1 0 0 1 2 0 Z" fill="none" stroke="black" stroke-width="0.5" transform="scale(2)"/>'
      + '<defs><rect width="99" height="99"/></defs><image href="a.png"/></svg>';
    const r = LACE.parseSvg(t);
    const rect = r.ok && r.elements[0], arc = r.ok && r.elements[1];
    const rp = rect ? rect.subpaths[0].pts : [];
    const want = [[10, 20], [10, 24], [8, 24], [8, 20]];
    const near = (a, b) => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
    ok(r.ok && r.elements.length === 2 && rp.length === 4 && want.every((q, i) => near(rp[i], q)), `LP: a rect rotated then translated lands on the corners worked by hand (${rp.map((q) => q.map((v) => v.toFixed(2)).join(',')).join(' ')})`);
    const ys = arc ? arc.subpaths[0].pts.map((q) => Math.abs(q[1])) : [0];
    ok(arc && !arc.fill && Math.abs(arc.stroke - 1) < 1e-12 && Math.abs(Math.max(...ys) - 2) < 0.02 && near(arc.subpaths[0].pts[0], [0, 0]), `LP: an arc is a semicircle of radius 2 after scale(2), stroke-only at width 1 (peak |y| ${Math.max(...ys).toFixed(3)})`);
    ok(r.ok && r.bbox.x1 < 11 && r.notes.some((n) => /raster image/.test(n)), 'LP: a hidden shape and a <defs> shape are ignored; a raster <image> is ignored and SAID');
    ok(!LACE.parseSvg('not an svg').ok && !LACE.parseSvg('').ok && !LACE.parseSvg('<svg><g/></svg>').ok, 'LP: not-SVG, empty and nothing-drawn are refused with a reason');
    const big = LACE.parseSvg('<svg>' + ' '.repeat(LACE.LACE_MAX_BYTES) + '</svg>');
    ok(!big.ok && /limit/.test(big.reason), 'LP: a file over the size limit is refused, naming the limit');
    const fx = LACE.parseSvg(LACE_FIXTURE_SVG);
    ok(fx.ok && fx.elements.filter((e) => e.stroke > 0 && !e.fill).length === 28 && fx.elements.filter((e) => e.fill).length === 14, `LP: the honeycomb fixture reads as 28 stroked hexagons and 14 filled dots (${fx.ok ? fx.elements.length : fx.reason} elements)`);
    const si = LACE.lacePattern({ name: '', svg: '' });
    ok(si.ok && si.standIn && si.name === LACE.STAND_IN_NAME && si.elements.length === 31, 'LA0: no file loaded means the STAND-IN, named as one (15 rings, 15 dots, one stroked edge)');
  }
  // LA5 — blend 0 is the procedural wing BY BRANCH (bit for bit); role 0 is no lace at all
  {
    const a = G.defaultParams(); a.venation = 'holes';
    const b = JSON.parse(JSON.stringify(a)); for (const w of [b.wings.first, b.wings.last]) { w.laceRole = 2; w.laceBlend = 0; }
    const ma = G.buildBug(a), mb = G.buildBug(b);
    ok(ma.positions.length === mb.positions.length && ma.positions.every((v, i) => Object.is(v, mb.positions[i])) && ma.indices.every((v, i) => v === mb.indices[i]) && !mb.wingPairs.some((w) => w.lace), `LA5: blend 0 builds the procedural HOLES bug bit for bit (${ma.triangleCount} triangles both)`);
    ok(!G.buildBug(G.defaultParams()).wingPairs.some((w) => w.lace), 'LA5: the default carries no lace (role none on every pair)');
  }
  // D — a design carries the lace (the artwork's text and every per-pair field) through JSON
  {
    const p = G.defaultParams(); p.venation = 'holes'; p.laceIslands = 'bridge'; p.lace = { name: 'fixture', svg: LACE_FIXTURE_SVG }; p.wings.first.laceRole = 2; p.wings.first.laceWarp = 1; p.wings.first.laceScale = 1.7;
    const r = G.paramsFromDesign(JSON.parse(JSON.stringify(G.designFromParams(p, 'x'))));
    ok(r.ok && JSON.stringify(r.params) === JSON.stringify(G.normalizeParams(p)) && r.params.lace.svg === LACE_FIXTURE_SVG, 'D: a design with a lace round-trips exactly (artwork text, island option, per-pair fields)');
    const old = { format: 'parametric-bug-design', version: 4, params: { venation: 'holes' } };
    const ro = G.paramsFromDesign(old);
    ok(ro.ok && ro.params.wings.first.laceRole === 0 && ro.params.lace.svg === '' && ro.params.laceIslands === 'unset', 'D: a v4 design (before the lace) loads with no lace on any pair');
  }
  // Eva's ruling: Set specimen SUCCEEDS — never clamps — on every random wing.
  // Seeds well past the build rows (it is a planform read, so cheap), plus every
  // wing-pair count the randomizer can produce forced on.
  {
    const clamped = [], f = G.WING_FIELDS.find((x) => x.id === 'sweep'); let lo = Infinity, hi = -Infinity, n = 0;
    for (let s = 1; s <= Math.max(400, NSEEDS * 10); s++) {
      const p = G.randomParams(s); if (!p.wingPairs) { p.bodyParts = '3'; p.wingPairs = 2; }
      const r = G.specimenPose(p); n++;
      if (r.notes.length) clamped.push(`random:${s}`);
      const sw = r.params.wings.first.sweep; lo = Math.min(lo, sw); hi = Math.max(hi, sw);
    }
    ok(clamped.length === 0 && lo > f.min && hi < f.max, `Y: Set specimen squares the forewing without clamping on ${n} random bugs (sweep ${lo.toFixed(1)}..${hi.toFixed(1)}° inside ${f.min}..${f.max}°)${clamped.length ? ` — CLAMPED: ${clamped.slice(0, 8).join(', ')}` : ''}`);
  }
  return out;
}

/* ---------- rows ---------- */
function rowsFor(nseeds) {
  const rows = [];
  const d = () => G.defaultParams();
  rows.push(['default', d(), {}]);
  for (const n of [0, 1, 3, 4]) { const p = d(); p.wingPairs = n; rows.push([`default ${n} wing pairs`, p, {}]); }
  { const p = d(); p.legReach = 0; rows.push(['default, legs tucked', p, { tucked: true }]); }
  { const p = d(); p.wingPairs = 4; p.thoraxLength = 3; p.thoraxWidth = 2.5; p.thoraxDepth = 2.5; rows.push(['4 pairs on the smallest thorax', p, {}]); }
  for (let s = 1; s <= nseeds; s++) rows.push([`random:${s}`, G.randomParams(s), {}]);
  for (let s = 1; s <= 8; s++) { const p = G.randomParams(s); p.bodyParts = '3'; p.wingPairs = 4; rows.push([`random:${s} at 4 pairs`, p, {}]); }
  for (const [name, pts] of Object.entries(HAND_OUTLINES)) {
    const p = d(); p.wingPairs = 4; p.wings.first.points = pts; rows.push([`drawn:${name} (4 pairs)`, p, {}]);
  }
  { const p = d(); p.wingPairs = 4; p.wings.first.points = HAND_OUTLINES.swallowtail; p.wings.last.points = HAND_OUTLINES.notched; p.wings.last.scallop = 0.18; p.wings.tail.on = true;
    rows.push(['drawn: swallowtail -> notched, scallop + tail', p, {}]); }
  { const p = d(); p.wingPairs = 4; p.wings.unlinked[1] = { ...p.wings.first, points: HAND_OUTLINES.falcate, sweep: 40, dihedral: -20 }; rows.push(['pair 2 unlinked, falcate', p, {}]); }
  // TAIL rows: the tail on the bottom pair only, at every pair count, checked
  // against the same bug with the tail OFF (T); and a tail drawn thinner than
  // the floor, whose STL must be refused (N)
  for (const n of [1, 2, 3, 4]) {
    const on = d(); on.wingPairs = n; on.wings.tail.on = true;
    const off = d(); off.wingPairs = n;
    rows.push([`tail ON, ${n} pair(s)`, on, { tailIso: G.buildBug(off) }]);
  }
  { const p = d(); p.wingPairs = 4; p.wings.first.points = HAND_OUTLINES.swallowtail; p.wings.tail.on = true; p.wings.unlinked[2] = { ...p.wings.first, points: HAND_OUTLINES.falcate };
    const off = JSON.parse(JSON.stringify(p)); off.wings.tail.on = false;
    rows.push(['tail ON, 4 pairs, one unlinked', p, { tailIso: G.buildBug(off) }]); }
  { const p = d(); p.wings.tail = JSON.parse(JSON.stringify(THIN_TAIL)); rows.push(['tail drawn under the floor', p, { expectThin: true }]); }
  { const p = d(); p.wingPairs = 3; p.wings.first.points = CROSSING_BLEND.first; p.wings.last.points = CROSSING_BLEND.last; rows.push(['crossing blend (3 pairs)', p, { repaired: true }]); }
  rows.push(['blended pair under the floor', blendedThin(), { repaired: true, expectBlended: true }]);
  // VENATION rows (Phase 2): both modes on the default and at 4 pairs (V3 on
  // the linked middle pairs), the cross-vein density axis, the regularity
  // axis, a tail with a vein into it, the pterostigma, veins drawn under the
  // floor (refused), and random bugs forced into each mode.
  const ven = (mode, fn, label, opts = {}) => { const p = d(); p.venation = mode; p.wingPairs = 2; fn(p); rows.push([`${mode}: ${label}`, p, opts]); };
  for (const mode of ['holes', 'ridges']) {
    ven(mode, () => {}, 'default');
    ven(mode, (p) => { p.wingPairs = 4; }, '4 pairs (linked middles blend)');
    ven(mode, (p) => { p.wingPairs = 3; p.wings.first.veinCount = 8; p.wings.first.crossDensity = 1; p.wings.last.veinCount = 3; p.wings.last.crossDensity = 0; }, '3 pairs, 8→3 veins / density 1→0');
    for (const dens of [0, 0.5, 1]) ven(mode, (p) => { for (const w of [p.wings.first, p.wings.last]) { w.crossDensity = dens; w.length = 40; w.stretch = 1.3; } }, `cross density ${dens}, long wing`);
    ven(mode, (p) => { for (const w of [p.wings.first, p.wings.last]) { w.crossDensity = 0.8; w.cellRegularity = 0; w.veinBranch = 2; w.veinCount = 6; w.length = 44; w.stretch = 1.4; } }, 'irregular dense net, 6 veins x 3');
    ven(mode, (p) => { for (const w of [p.wings.first, p.wings.last]) { w.stigma = 1; w.discal = 1; w.length = 40; w.stretch = 1.3; } }, 'pterostigma + discal', { expectStigma: true, expectDiscal: true });
    ven(mode, (p) => { p.wings.first.points = HAND_OUTLINES.swallowtail; p.wings.tail.on = true; p.wings.last.length = 30; p.wings.last.stretch = 1.4; }, 'swallowtail with a tail', { expectTailVein: true });
    ven(mode, (p) => { p.wings.first.veinWidth = 0.6; p.wings.first.veinTaper = 0.5; }, 'veins drawn under the floor', { expectVeinThin: true });
    ven(mode, (p) => { p.wingPairs = 4; p.thoraxLength = 3; p.thoraxWidth = 2.5; p.thoraxDepth = 2.5; }, '4 pairs on the smallest thorax');
    for (let s = 1; s <= Math.max(4, Math.round(nseeds / 5)); s++) { const p = G.randomParams(s); if (!p.wingPairs) { p.bodyParts = '3'; p.wingPairs = 2; } p.venation = mode; rows.push([`${mode}: random:${s}`, p, {}]); }
  }
  // ELEGANCE PASS rows (design doc §9): the OLD default (every new control at
  // its old end), each new control at both ends of its range on the new
  // default, the floor at both ends against the edge law, both venation modes
  // with the edge profile, and the specimen pose on the new default, the old
  // default and random bugs (Y on each)
  rows.push(['legacy default (the old ends)', G.legacyDefaultParams(), {}]);
  const ends = [['wingEdgeTaper', 0, 0.9], ['wingEdgeBevel', 0, 4], ['clubLength', 0, 0.5], ['clubWidth', 1, 4], ['clubTaper', 0, 1], ['segmentStyle', 0, 1], ['pointedTips', false, true]];
  for (const [id, lo, hi] of ends) for (const v of [lo, hi]) { const p = d(); p[id] = v; rows.push([`${id} ${v}`, p, id === 'segmentStyle' ? { expectGrooves: true } : {}]); }
  { const p = d(); p.segmentStyle = 0.5; rows.push(['segmentStyle 0.5', p, { expectGrooves: true }]); }
  for (const pt of [true, false]) { const p = d(); p.antennaType = 'feathered'; p.pointedTips = pt; p.legReach = 1; rows.push([`feathered, splayed, pointed ${pt}`, p, {}]); }
  for (const t of ['filiform', 'bristle']) { const p = d(); p.antennaType = t; rows.push([`antenna ${t}, pointed`, p, {}]); }
  { const p = d(); p.bodyParts = '2'; p.wingPairs = 0; p.legPairs = 4; p.antennaType = 'none'; p.abdomenWidth = 6; rows.push(['2-part, pointed abdomen', p, {}]); }
  for (const f of [0.6, 2]) { const p = d(); p.minDiameter = f; rows.push([`floor ${f} mm against the edge law`, p, {}]); }
  for (const mode of ['holes', 'ridges']) { const p = d(); p.venation = mode; p.wingEdgeBevel = 2; rows.push([`${mode} with taper + 2 mm chamfer`, p, {}]); }
  rows.push(['specimen: the new default', G.specimenPose(d()).params, { specimen: true }]);
  rows.push(['specimen: the old default', G.specimenPose(G.legacyDefaultParams()).params, { specimen: true }]);
  { const p = d(); p.wingPairs = 4; rows.push(['specimen: 4 pairs', G.specimenPose(p).params, { specimen: true }]); }
  for (let s = 1; s <= 6; s++) { const p = G.randomParams(s); if (!p.wingPairs) { p.bodyParts = '3'; p.wingPairs = 2; } rows.push([`specimen: random:${s}`, G.specimenPose(p).params, { specimen: true }]); }
  for (const name of ['falcate', 'notched', 'strap']) { const p = d(); p.venation = 'holes'; p.wingPairs = 2; p.wings.first.points = HAND_OUTLINES[name]; p.wings.first.length = 36; p.wings.first.stretch = 1.3; rows.push([`holes: drawn:${name}`, p, {}]); }
  // PHASE 4 — LACE rows (§10): both roles under every island option, the
  // three warps, scale / rotation / offset / tiling, the blend, RIDGES, linked
  // middle pairs that blend their import settings, a tilted pair, a lace drawn
  // too fine (refused), an imported artwork that is not the stand-in, and
  // random bugs carrying a lace
  const lace = (label, fn, opts = {}) => { const p = d(); p.venation = 'holes'; fn(p); rows.push([`lace: ${label}`, p, { expectLace: true, ...opts }]); };
  const both = (p, f) => { for (const w of [p.wings.first, p.wings.last]) f(w); };
  for (const [role, rn] of [[1, 'FILL CELLS'], [2, 'REPLACE VEINS']]) {
    lace(`${rn}, islands unset (blocked)`, (p) => both(p, (w) => { w.laceRole = role; }), { expectIslands: true });
    lace(`${rn}, drop`, (p) => { p.laceIslands = 'drop'; both(p, (w) => { w.laceRole = role; }); }, { expectIslands: true });
    lace(`${rn}, bridge`, (p) => { p.laceIslands = 'bridge'; both(p, (w) => { w.laceRole = role; }); }, { expectIslands: true });
    lace(`${rn}, SVG-only`, (p) => { p.laceIslands = 'svg'; both(p, (w) => { w.laceRole = role; }); }, { expectIslands: true });
  }
  lace('REPLACE, drop nothing (0.5 mm²): blocked', (p) => { p.laceIslands = 'drop'; p.laceDropMm2 = 0.5; both(p, (w) => { w.laceRole = 2; }); }, { expectIslands: true });
  lace('REPLACE, bridge with 2 mm ties', (p) => { p.laceIslands = 'bridge'; p.laceTieMm = 2; both(p, (w) => { w.laceRole = 2; }); }, { expectIslands: true });
  for (const [warp, wn] of [[1, 'RADIAL'], [2, 'ENVELOPE']]) for (const role of [1, 2]) lace(`${wn}, role ${role}, bridge`, (p) => { p.laceIslands = 'bridge'; both(p, (w) => { w.laceRole = role; w.laceWarp = warp; }); });
  lace('CLIP, rotated 35, offset, scale 1.3', (p) => { p.laceIslands = 'bridge'; both(p, (w) => { w.laceRole = 2; w.laceRotate = 35; w.laceOffsetU = 0.12; w.laceOffsetW = -0.08; w.laceScale = 1.3; }); });
  lace('CLIP, once (no tiling), scale 0.8', (p) => { p.laceIslands = 'bridge'; both(p, (w) => { w.laceRole = 2; w.laceTile = 0; w.laceScale = 0.8; }); });
  for (const b of [0.25, 0.5, 0.75]) lace(`blend ${b}, REPLACE, bridge`, (p) => { p.laceIslands = 'bridge'; both(p, (w) => { w.laceRole = 2; w.laceBlend = b; }); });
  lace('blend 0.5, FILL, drop', (p) => { p.laceIslands = 'drop'; both(p, (w) => { w.laceRole = 1; w.laceBlend = 0.5; }); });
  for (const role of [1, 2]) lace(`RIDGES, role ${role}`, (p) => { p.venation = 'ridges'; both(p, (w) => { w.laceRole = role; }); });
  lace('RIDGES, ENVELOPE, blend 0.5', (p) => { p.venation = 'ridges'; both(p, (w) => { w.laceRole = 2; w.laceWarp = 2; w.laceBlend = 0.5; }); });
  lace('3 pairs, linked middle blends FILL/CLIP 1.0 -> REPLACE/ENVELOPE 1.6', (p) => { p.wingPairs = 3; p.laceIslands = 'bridge'; p.wings.first.laceRole = 1; p.wings.last.laceRole = 2; p.wings.last.laceWarp = 2; p.wings.last.laceScale = 1.6; p.wings.last.laceRotate = 20; });
  lace('4 pairs, REPLACE, bridge', (p) => { p.wingPairs = 4; p.laceIslands = 'bridge'; both(p, (w) => { w.laceRole = 2; }); });
  lace('tilted pairs (dihedral 30, pitch 10), REPLACE, bridge', (p) => { p.laceIslands = 'bridge'; both(p, (w) => { w.laceRole = 2; w.dihedral = 30; w.pitch = 10; }); });
  lace('threads too fine (scale 0.45): refused', (p) => { p.laceIslands = 'bridge'; both(p, (w) => { w.laceRole = 2; w.laceScale = 0.45; }); }, { expectLaceThin: true });
  lace('an imported artwork (fixture honeycomb, strokes + transforms), REPLACE, bridge', (p) => { p.laceIslands = 'bridge'; p.lace = { name: 'LACE_FIXTURE_SVG', svg: LACE_FIXTURE_SVG }; both(p, (w) => { w.laceRole = 2; }); });
  lace('an imported artwork, FILL, drop', (p) => { p.laceIslands = 'drop'; p.lace = { name: 'LACE_FIXTURE_SVG', svg: LACE_FIXTURE_SVG }; both(p, (w) => { w.laceRole = 1; }); });
  lace('the specimen default, REPLACE, bridge', (p) => { p.laceIslands = 'bridge'; both(p, (w) => { w.laceRole = 2; }); Object.assign(p, G.specimenPose(p).params); }, { specimen: true });
  for (let sd = 1; sd <= 4; sd++) { const p = G.randomParams(sd); if (!p.wingPairs) { p.bodyParts = '3'; p.wingPairs = 2; } p.venation = 'holes'; p.laceIslands = 'bridge'; both(p, (w) => { w.laceRole = 1 + (sd % 2); w.laceWarp = sd % 3; }); rows.push([`lace: random:${sd}`, p, { expectLace: true }]); }
  return rows;
}

if (NEG) {
  const base = G.buildBug(G.defaultParams());
  const tuckP = G.defaultParams(); tuckP.legReach = 0;
  const tuck = G.buildBug(tuckP);
  const t4 = G.defaultParams(); t4.wingPairs = 4; t4.wings.tail.on = true;
  const tail4on = G.buildBug(t4); t4.wings.tail.on = false; const tail4off = G.buildBug(t4);
  const thinP = G.defaultParams(); thinP.wings.tail = JSON.parse(JSON.stringify(THIN_TAIL));
  const thinModel = G.buildBug(thinP);
  const blendedModel = G.buildBug(blendedThin());
  const holesP = G.defaultParams(); holesP.venation = 'holes'; holesP.wingPairs = 3; for (const w of [holesP.wings.first, holesP.wings.last]) { w.length = 40; w.stretch = 1.3; w.stigma = 1; }
  const holesModel = G.buildBug(holesP);
  const ridgesP = JSON.parse(JSON.stringify(holesP)); ridgesP.venation = 'ridges';
  const ridgesModel = G.buildBug(ridgesP);
  const thinVeinP = G.defaultParams(); thinVeinP.venation = 'holes'; thinVeinP.wings.first.veinWidth = 0.6; thinVeinP.wings.first.veinTaper = 0.5;
  const thinVeinModel = G.buildBug(thinVeinP);
  const tailVeinP = G.defaultParams(); tailVeinP.venation = 'ridges'; tailVeinP.wings.first.points = HAND_OUTLINES.swallowtail; tailVeinP.wings.tail.on = true; tailVeinP.wings.last.length = 30; tailVeinP.wings.last.stretch = 1.4;
  const tailVeinModel = G.buildBug(tailVeinP);
  const specModel = G.buildBug(G.specimenPose(G.defaultParams()).params);
  // the first cut's clamp: random:6's forewing needs ~−43°; the old slider stopped at −30
  const clampP = (() => { const p = G.randomParams(6); if (!p.wingPairs) { p.bodyParts = '3'; p.wingPairs = 2; } const q = G.specimenPose(p).params; q.wings.first.sweep = Math.max(-30, q.wings.first.sweep); return q; })();
  const clampModel = G.buildBug(clampP);
  // the right forewing's outline vertex pairs (top, bottom), and their mirror twins
  const mutPair = (m, fn) => {
    const R = m.parts.find((q) => q.kind === 'wing1' && q.side === 'R'), L = m.parts.find((q) => q.kind === 'wing1' && q.side === 'L');
    const P = m.positions, V = (v) => [P[3 * v], P[3 * v + 1], P[3 * v + 2]];
    for (const [a, b] of R.meta.edgePairs.outline.slice(3, 9)) {
      const nt = fn(V(a), V(b)), la = a - R.v0 + L.v0;   // the left part is the right's vertices in order, x negated
      for (let d = 0; d < 3; d++) P[3 * a + d] = nt[d];
      P[3 * la] = -nt[0]; P[3 * la + 1] = nt[1]; P[3 * la + 2] = nt[2];
    }
  };
  const deepClone = (o) => JSON.parse(JSON.stringify(o));
  const clone = (m) => ({ ...m, positions: Float64Array.from(m.positions), indices: Uint32Array.from(m.indices), parts: m.parts.map((p) => ({ ...p, meta: { ...p.meta } })) });
  const shiftPart = (m, pred, d) => { for (const p of m.parts.filter(pred)) for (let v = p.v0; v < p.v1; v++) for (let k = 0; k < 3; k++) m.positions[3 * v + k] += d[k] * (k === 0 && p.side === 'L' ? -1 : 1); };
  const muts = [
    ['detach a wing', 'C', base, {}, (m) => shiftPart(m, (q) => q.kind === 'wing1', [0, 0, 40])],
    ['open a shell', 'W', base, {}, (m) => { m.indices = m.indices.slice(0, m.indices.length - 3); m.parts[m.parts.length - 1].t1 -= 1; }],
    ['nudge one vertex 1e-6', 'M', base, {}, (m) => { const p = m.parts.find((q) => q.kind === 'wing1' && q.side === 'R'); m.positions[3 * (p.v0 + 5)] += 1e-6; }],
    ['thin a leg ring', 'F', base, {}, (m) => {
      const p = m.parts.find((q) => q.kind === 'leg' && q.meta.tubeRings); const [v0, n] = p.meta.tubeRings[3];
      let c = [0, 0, 0]; for (let k = 0; k < n; k++) for (let d = 0; d < 3; d++) c[d] += m.positions[3 * (v0 + k) + d] / n;
      for (let k = 0; k < n; k++) for (let d = 0; d < 3; d++) m.positions[3 * (v0 + k) + d] = c[d] + 0.4 * (m.positions[3 * (v0 + k) + d] - c[d]);
    }],
    ['invert a part', 'P', base, {}, (m) => { const p = m.parts.find((q) => q.kind === 'leg'); for (let t = p.t0; t < p.t1; t++) { const s = m.indices[3 * t + 1]; m.indices[3 * t + 1] = m.indices[3 * t + 2]; m.indices[3 * t + 2] = s; } }],
    ['stack pair 2 on pair 1', 'R', base, {}, (m) => {
      // move pair 2 so its root lands on pair 1's (the shift is along y only)
      const r = rootChecks(m).roots;
      shiftPart(m, (q) => q.kind === 'wing2', [0, r[0] - r[1] + 0.3, 0]);   // onto pair 1's root and just past it
    }],
    ['cross a planform', 'O', base, {}, (m) => { const p = m.parts.find((q) => q.kind === 'wing1' && q.side === 'R'); const pl = p.meta.planform.map((q) => q.slice()); const a = 10, b = pl.length - 12; [pl[a], pl[b]] = [pl[b], pl[a]]; p.meta.planform = pl; }],
    ['fold a wing top face (hairline)', 'S', base, {}, (m) => {
      // the top-face vertex nearest the wing's centroid, pushed 3 mm along y on
      // BOTH sides (so M stays clean): its facets fold back -> an interior loop
      for (const side of ['R', 'L']) {
        const p = m.parts.find((q) => q.kind === 'wing1' && q.side === side), nTop = (p.v1 - p.v0) / 2;
        let cx = 0, cy = 0; for (let v = p.v0; v < p.v0 + nTop; v++) { cx += m.positions[3 * v] / nTop; cy += m.positions[3 * v + 1] / nTop; }
        let best = p.v0, bd = Infinity;
        for (let v = p.v0; v < p.v0 + nTop; v++) { const d = Math.hypot(m.positions[3 * v] - cx, m.positions[3 * v + 1] - cy); if (d < bd) { bd = d; best = v; } }
        m.positions[3 * best + 1] += 3;
      }
    }],
    ['a middle pair carries tail geometry', 'T', tail4on, { tailIso: tail4off }, (m) => {
      for (const side of ['R', 'L']) { const p = m.parts.find((q) => q.kind === 'wing2' && q.side === side); m.positions[3 * p.v0 + 1] -= 2; }
    }],
    ['a floor violation goes unreported', 'N', thinModel, { expectThin: true }, (m) => { m.floorViolations = []; }],
    ['the blended-pair refusal names no drawn pairs', 'N', blendedModel, { expectBlended: true }, (m) => { m.floorViolations = m.floorViolations.map((v) => ({ ...v, blendedFrom: null })); }],
    ['a thin pair is not red in the view', 'N', blendedModel, { expectBlended: true }, (m) => { m.wingPairs = m.wingPairs.map((w) => ({ ...w, thinSegments: [] })); }],
    ['untuck the legs (move out 4 mm)', 'L', tuck, { tucked: true }, (m) => shiftPart(m, (q) => q.kind === 'leg', [4, 0, 0])],
    // Phase 2 — the venation RECORD is what Phase 4 will read, so the record is what is mutated
    ['a cell vertex pushed (cells overlap)', 'V1', holesModel, {}, (m) => { m.wingPairs = deepClone(m.wingPairs); const c = m.wingPairs[0].venation.cells[2]; c.points[1] = [c.points[1][0] + 0.7, c.points[1][1] + 0.4]; }],
    ['a cell dropped from the record', 'V1', holesModel, {}, (m) => { m.wingPairs = deepClone(m.wingPairs); m.wingPairs[0].venation.cells.splice(3, 1); }],
    ['a hole shifted across its vein', 'V2', holesModel, {}, (m) => { m.wingPairs = deepClone(m.wingPairs); const c = m.wingPairs[0].venation.cells.find((x) => x.holes.length); c.holes[0] = c.holes[0].map(([x, y]) => [x + 1.5, y]); }],
    ['the stigma cut through', 'V6', holesModel, { expectStigma: true }, (m) => { m.wingPairs = deepClone(m.wingPairs); const V = m.wingPairs[0].venation; const st = V.cells.find((x) => x.role === 'stigma'), src = V.cells.find((x) => x.holes.length); st.holes = [src.holes[0]]; }],
    ['the linked pair carries the first pair\'s venation', 'V3', ridgesModel, {}, (m) => { m.wingPairs = deepClone(m.wingPairs); const V = m.wingPairs[1].venation; for (const v of V.veins) if (v.kind === 'main') v.width[0] = m.params.wings.first.veinWidth + 0.3; }],
    ['a vein floor violation goes unreported', 'V4', thinVeinModel, { expectVeinThin: true }, (m) => { m.floorViolations = m.floorViolations.filter((v) => v.kind !== 'vein'); }],
    ['the tail vein stops short of the tail', 'V5', tailVeinModel, { expectTailVein: true }, (m) => { m.wingPairs = deepClone(m.wingPairs); const V = m.wingPairs[1].venation; const tv = V.veins.find((v) => v.tail); const n = tv.points.length; tv.points[n - 1] = [(tv.points[n - 1][0] + tv.points[n - 2][0]) / 2, (tv.points[n - 1][1] + tv.points[n - 2][1]) / 2]; }],
    ['a ridge strip missing', 'V', ridgesModel, {}, (m) => { const i = m.parts.findIndex((q) => q.kind === 'vein' && q.side === 'R'); m.parts.splice(i, 1); }],
    // the elegance pass (§9) — each on BOTH sides so the mirror stays clean
    ['an outline vertex thinned under the floor', 'B', base, {}, (m) => mutPair(m, (t, b) => b.map((x, d) => x + 0.4 * (t[d] - x)))],
    ['the chamfer misses the outline', 'B', base, {}, (m) => mutPair(m, (t, b) => t.map((x, d) => x + 0.25 * (t[d] - b[d])))],
    ['a pointed end blunted onto its ring', 'X', base, {}, (m) => { for (const side of ['R', 'L']) { const q = m.parts.find((x) => /^leg\d$/.test(x.name) && x.side === side); const pt = q.meta.points[0], [v0, n] = pt.ring; const c = [0, 0, 0]; for (let k = 0; k < n; k++) for (let d = 0; d < 3; d++) c[d] += m.positions[3 * (v0 + k) + d] / n; for (let d = 0; d < 3; d++) m.positions[3 * pt.apex + d] = c[d]; } }],
    ['a tip ring thinned under the floor', 'X', base, {}, (m) => { for (const side of ['R', 'L']) { const q = m.parts.find((x) => x.name === 'antenna' && x.side === side); const [v0, n] = q.meta.points[0].ring; const c = [0, 0, 0]; for (let k = 0; k < n; k++) for (let d = 0; d < 3; d++) c[d] += m.positions[3 * (v0 + k) + d] / n; for (let k = 0; k < n; k++) for (let d = 0; d < 3; d++) m.positions[3 * (v0 + k) + d] = c[d] + 0.5 * (m.positions[3 * (v0 + k) + d] - c[d]); } }],
    ['a segment groove filled', 'G', base, { expectGrooves: true }, (m) => { const body = m.parts.find((q) => q.kind === 'body'), L = m.layout; for (let k = 1; k < m.params.abdomenSegments; k++) { const yb = L.yA0 - (k / m.params.abdomenSegments) * (L.yA0 - L.yA1); for (const r of body.meta.rings) if (Math.abs(r.y - yb) < 0.3) for (let j = 0; j < r.n; j++) { m.positions[3 * (r.v0 + j)] /= 1 - G.GROOVE_DEPTH * Math.exp(-(((r.y - yb) / G.GROOVE_SIGMA_MM) ** 2)); } } }],
    ['the pose clamps at the old -30° bound (random:6)', 'Y', clampModel, { specimen: true }, () => {}],
    ['the forewing margin not square to the body', 'Y', specModel, { specimen: true }, (m) => { for (const side of ['R', 'L']) { const q = m.parts.find((x) => x.kind === 'wing1' && x.side === side); for (let v = q.v0 + 1; v <= q.v0 + 12; v++) m.positions[3 * v + 1] += 1.5; } }],
  ];
  const clean = [check('default (clean)', base), check('default tucked (clean)', tuck, { tucked: true }), check('tail ON 4 pairs (clean)', tail4on, { tailIso: tail4off }), check('thin tail (clean: refused)', thinModel, { expectThin: true }), check('blended thin (clean: refused)', blendedModel, { expectBlended: true }),
    check('specimen (clean)', specModel, { specimen: true }),
    check('holes 3 pairs + stigma (clean)', holesModel, { expectStigma: true }), check('ridges 3 pairs (clean)', ridgesModel, {}), check('thin veins (clean: refused)', thinVeinModel, { expectVeinThin: true }), check('tail vein (clean)', tailVeinModel, { expectTailVein: true })];
  let ok = clean.every((r) => !r.fails.length);
  for (const r of clean) { console.log(fmt(r)); for (const x of r.fails) console.log('     ' + x); }
  for (const [name, clause, src, opts, fn] of muts) {
    const m = clone(src); fn(m);
    const r = check(name, m, opts);
    const fired = r.fails.some((f) => f.startsWith(clause + ':') || (clause === 'V' && /^V\d?:/.test(f)));
    console.log(`${fired ? 'CAUGHT' : 'MISSED'} ${name.padEnd(32)} by ${clause}  — ${r.fails.join(' | ') || 'nothing fired'}`);
    if (!fired) ok = false;
  }
  const splayP = G.defaultParams(); splayP.legReach = 1;              // the default is tucked now: splay it explicitly
  const splay = legExposure(G.buildBug(splayP));
  const lfires = !(splay.outside <= 0.02 * splay.area);
  console.log(`${lfires ? 'CAUGHT' : 'MISSED'} L at reach 1 (splayed legs must read as showing): ${splay.outside.toFixed(2)} of ${splay.area.toFixed(2)} mm² outside`);
  if (!lfires) ok = false;
  console.log(ok ? '\nNEGATIVE CONTROL PASS — every mutation caught by the clause that names it.' : '\nNEGATIVE CONTROL FAIL');
  process.exit(ok ? 0 : 1);
}

let failed = 0;
const fc = functionChecks();
for (const [c, msg] of fc) { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) failed++; }
const onlyArg = args.indexOf('--only');
const ONLY = onlyArg >= 0 ? new RegExp(args[onlyArg + 1]) : null;   // iteration only: a SUBSET of rows, and the run says so
const rows = rowsFor(NSEEDS).filter(([label]) => !ONLY || ONLY.test(label));
if (ONLY) console.log(`SUBSET: ${rows.length} rows match ${ONLY} — not a gate pass`);
const support = [];
for (const [label, params, opts] of rows) {
  const model = G.buildBug(params);
  const r = check(label, model, opts);
  console.log(fmt(r));
  for (const f of r.fails) console.log('     ' + f);
  if (r.fails.length) failed++;
  if (label === 'default' || label.startsWith('default ') || label.startsWith('drawn: swallow')) support.push([label, overhang(model)]);
}
console.log('\nTUCKED-LEG EXPOSURE (reported, not gated) — random seeds 1-12 forced to reach 0 (and 8, whose own draw is tucked), leg area outside the body from above:');
for (let s = 1; s <= 12; s++) { const p = G.randomParams(s); p.legReach = 0; const e = legExposure(G.buildBug(p)); console.log(`  random:${String(s).padEnd(3)} ${p.bodyParts}-part  ${e.outside.toFixed(2).padStart(6)} of ${e.area.toFixed(2).padStart(6)} mm²  (${(100 * e.outside / Math.max(e.area, 1e-9)).toFixed(1)}%)`); }
console.log('\nSUPPORTS — downward area steeper than 45 deg, off the plate, at the model\'s own orientation (FDM/resin; SLS needs none):');
for (const [label, k] of support) {
  const tot = Object.values(k).reduce((a, b) => a + b, 0);
  console.log(`  ${label.padEnd(30)} ${tot.toFixed(0).padStart(5)} mm²  ` + Object.entries(k).map(([a, b]) => `${a} ${b.toFixed(0)}`).join(' · '));
}
const total = rows.length + fc.length;
console.log(`\n${total - failed}/${total} pass (${fc.length} function checks + ${rows.length} built rows: ${NSEEDS} random).`);
console.log(failed ? 'VERDICT: FAIL' : 'VERDICT: PASS');
process.exit(failed ? 1 : 0);
