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

   The EDGES PASS (design doc §10), on every row:
     E  the ROUNDED EDGE, read off the emitted bead rings: E1 every ring a half
        ellipse (M + sin t D + cos t V, 1e-9 mm where untwisted), never more
        than a half-round, its radius square to the sheet; E2 no rim point
        keeps a square wall (top joined straight to bottom) — and at round 0
        every one does and no bead is recorded; E3 no rim point past the root
        left square; E4 every bead's apex ON the drawn outline or a planned
        hole, and every planned hole vertex some bead's apex; E5 every bead as
        tall as the floor; E6 no top-skin triangle flipped by the inset; E7 a
        flat wing's silhouette is the drawn outline in world mm.
     Q  (function check) the ON-WING EDITOR: a drag to a point of the SVG view
        lands there — measured on the EMITTED bead apex of the moved control
        point in the rebuilt flat display — under stretch, sweep, tilt and an
        unlinked middle pair; the points are drawn on the emitted wing; the
        flat display moves only the edited pair.

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

   IMAGE -> BUG (design doc §11) — the IM family, tools/verify-bug-image.mjs:
     IM1-IM9 run against synthetic pictures drawn from KNOWN bugs (rotated,
     asymmetric, noisy, patterned): pair count and mode, the mirror axis, the
     outline against the KNOWN bug (never the fit's own reading), mirror-exact
     from an asymmetric picture, the tail found (and not found where there is
     none), a busy background refused, the tolerance at both ends, the split
     line refitting both pairs, the erase brush. Every successful fit is ALSO
     built as an ordinary row ('image: <name> (fitted)') through every clause
     above: the fitted outline obeys every rule a drawn one does.

   The WING-SHAPE LIBRARY (design doc §13) — the LB family,
   tools/verify-bug-library.mjs: LB1 every library shape applied to the default
   bug builds valid; LB2 applying leaves every non-wing setting byte-identical
   (the writable fields restated there, not imported) and writes the shape; LB3
   at 3–4 pairs the shape sets the first and last pairs and the middles blend;
   LB4 RANDOMIZE WINGS never produces an invalid wing across seeds and bases,
   and the re-roll is exercised; LB5 the label is the blend applied (re-derived
   byte for byte); LB6 the whole-bug Randomize draws its wings from it. Every
   shape, and eight random blends, are ALSO built rows ('library: ...').

   It also REPORTS (not gates) FDM/resin overhang at the model's own
   orientation, and the tucked-leg exposure across the random seeds.

   NOT COVERED: planform WIDTHS of a drawn outline (a hand-drawn spike can be
   narrower than the floor — not measured); free ends; self-intersection
   BETWEEN parts (overlapping closed shells are the export contract).

   --negative-control  breaks built models thirty-five ways (plus the L clause at reach 1, three
                       broken editor frames for Q, ten CODE mutants of bug-image.js for IM, eight CODE
                       mutants of bug-geometry.js plus one data mutant for LB, and two ROW mutants of
                       bug-geometry.js built on the §15 fixtures for N and E1 — every anchor checked to
                       match exactly once before any of them runs) and requires each
                       to be caught by the clause that names it.
   --seeds N           number of random bugs (default 40). */

import * as G from '../bug-geometry.js';
import { JUNCTION_RES } from '../bug-junction.js';
import { makeJunctionMeasures, segDist, fillRaster } from './bug-junction-measure.mjs';
import { polyArea as venArea } from '../bug-venation.js';
import { HAND_OUTLINES, CROSSING_BLEND, THIN_TAIL, blendedThin, rootUnderFloor, pitchedBeadHoles } from './bug-fixtures.mjs';
// the junction's own fixture: the hindwing-root-under-the-floor bug with the
// blend at its default (the fixture itself pins the blend OFF, which is the
// state it was written to refuse)
const junctionFixture = () => ({ ...rootUnderFloor(), wingJunction: G.JUNCTION_DEFAULT_MM });
import * as IMG from '../bug-image.js';
import { imageChecks, imageRows, IMAGE_MUTANTS } from './verify-bug-image.mjs';
import { libraryChecks, libraryRows, LIBRARY_MUTANTS, angleChecks, angleRows, ANGLE_MUTANTS } from './verify-bug-library.mjs';
import { THREE_PAIR_SHAPE } from './bug-fixtures.mjs';
import { bodyChecks, bodyRows, bodyFitClause, BODY_MUTANTS } from './verify-bug-body.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const NEG = args.includes('--negative-control');
const seedsArg = args.indexOf('--seeds');
const NSEEDS = seedsArg >= 0 ? +args[seedsArg + 1] : 40;
const onlyArg = args.indexOf('--only');                   // iteration only: rows whose label matches; reported as a SUBSET, never a pass of the gate
const ONLY = onlyArg >= 0 ? new RegExp(args[onlyArg + 1]) : null;


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
function voxelComponents(model, cell) {
  const P = model.positions, I = model.indices;
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
function connected(model) {
  const a = voxelComponents(model, 0.4);
  if (a.comps === 1) return { comps: 1, cell: 0.4 };
  const b = voxelComponents(model, 0.2);
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
    const big = L.reduce((a, l) => (l.length > a.length ? l : a));
    // distance to the outline by its vertices (it is dense), to a hole polygon
    // by its SEGMENTS (a hole has a dozen long straight edges)
    const holes = part.meta.holeLoops || [];
    // (a loop wholly inside the body's own contour is drawn UNDER the body —
    // the body is drawn last — and is no stroke anyone sees: under the
    // junction blend the bead runs out to nothing there)
    const bvS = part.meta.junction ? bodyView(model) : null;
    for (const l of L) if (l !== big && !(bvS && l.every(([x, y]) => bvS.sd(x, y) < 0))) for (const [x, y] of l) {
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

/* ---------- the JUNCTION BLEND (design doc §16): the gate's view ---------- */
/* The measures themselves (the body's emitted contour, the wing transform
   restated from the parameters, JB1's slot, JB2's neck, JB3's burial) are
   tools/bug-junction-measure.mjs, built on this tree's module — one owner,
   shared with the junction sheet. */
const { bodyView, wingXY, slotScan, neckScan, buriedScan, SLOT_DEPTH_MM, NECK_FLOORS, JB3_INSET_MM } = makeJunctionMeasures(G);
// judged by the PARAMETER, not by the builder's record: a blend asked for and
// never built (a dropped pass) is held to the same three clauses
const junctionOn = (model) => model.params.wingJunction > 0 && model.parts.some((q) => /^wing\d$/.test(q.kind));
// past this far from the body's contour the burial does nothing: its fade
// runs BURY_FADE_MM past a silhouette smoothed over BURY_SMOOTH_MM either side
// (a running maximum then a mean) — one smoothing span either way more is a
// bound on how far that silhouette stands out from the emitted one
const BURY_CLEAR = () => G.BURY_FADE_MM + 2 * G.BURY_SMOOTH_MM;
function junctionChecks(model) {
  const bad = [], r = model.params.wingJunction, floor = model.params.minDiameter;
  if (!junctionOn(model)) return { bad, slot: null, necks: [], buried: [] };
  // JB1: the closing at r fills every gap under 2r; the stated minimum is 3/4
  // of that (1.5 mm at the default 1 mm), clear of the raster's own reading
  const gap = 1.5 * r, sl = slotScan(model, gap);
  // (the bar: SLOT_DEPTH_MM, or two of the blend's own raster pixels when that
  // is coarser — at a large radius its traced boundary is read to its pixel)
  const depthBar = Math.max(SLOT_DEPTH_MM, 2 * r * JUNCTION_RES);
  if (sl.depth > depthBar) bad.push(`JB1: a slot narrower than ${gap.toFixed(2)} mm runs ${sl.depth.toFixed(2)} mm deep between a wing and the body (at ${sl.at.map((v) => v.toFixed(2)).join(', ')})`);
  const necks = neckScan(model);
  for (const nk of necks) if (!(nk.neck >= NECK_FLOORS * floor)) bad.push(`JB2: ${nk.part} hangs from the body by a ${nk.neck.toFixed(2)} mm neck, under ${NECK_FLOORS} x the ${floor} mm floor`);
  const buried = buriedScan(model);
  for (const bq of buried) if (bq.exposed) bad.push(`JB3: ${bq.part} ${bq.exposed} of ${bq.judged} vertices ${JB3_INSET_MM} mm or more inside the body's contour show outside its solid (worst ${bq.worst.inset.toFixed(2)} mm in, at ${bq.worst.at.map((v) => v.toFixed(2)).join(', ')})`);
  for (const bq of buried) if (bq.thinOver) bad.push(`JB3: ${bq.part} ${bq.thinOver} vertices over a body thinner than the ${floor} mm floor stand out more than half the difference (worst ${bq.thinWorst.out.toFixed(3)} mm over a ${bq.thinWorst.T.toFixed(3)} mm body, ${bq.thinWorst.excess.toFixed(3)} mm past (floor - T) / 2, at ${bq.thinWorst.at.map((v) => v.toFixed(2)).join(', ')})`);
  if (!buried.some((bq) => bq.judged)) bad.push('JB3: no wing vertex lies inside the body (vacuous)');
  return { bad, slot: sl, necks, buried };
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
  // Under the JUNCTION BLEND there is no tab: a wing's buried part is an AREA
  // the closing grew (a hindwing's runs down the abdomen), so no set of its
  // vertices says where it attaches. There the root is read at the DRAWN root
  // chord's midpoint (meta.junction.drawn: its first and last points): the
  // top-skin triangle of the slab's own planform layout (meta.slab.uw) that
  // holds it, and the emitted mid-surface there by barycentric weights — so a
  // translated wing moves its root by exactly that translation.
  for (const part of model.parts.filter((q) => /^wing\d$/.test(q.kind) && q.side === 'R')) {
    if (part.meta.junction) {
      const dr = part.meta.junction.drawn, c = [(dr[0][0] + dr[dr.length - 1][0]) / 2, (dr[0][1] + dr[dr.length - 1][1]) / 2];
      const S = part.meta.slab, n = S.n, I = model.indices;
      let y = NaN;
      for (let t = part.t0; t < part.t1 && Number.isNaN(y); t++) {
        const a = I[3 * t] - part.v0, b = I[3 * t + 1] - part.v0, e = I[3 * t + 2] - part.v0;
        if (!(a >= 0 && b >= 0 && e >= 0 && a < n && b < n && e < n)) continue;
        const A = S.uw[a], B = S.uw[b], C = S.uw[e], den = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
        if (!(Math.abs(den) > 1e-14)) continue;
        const l1 = ((B[1] - C[1]) * (c[0] - C[0]) + (C[0] - B[0]) * (c[1] - C[1])) / den, l2 = ((C[1] - A[1]) * (c[0] - C[0]) + (A[0] - C[0]) * (c[1] - C[1])) / den, l3 = 1 - l1 - l2;
        if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
        const my = (i) => (P[3 * (part.v0 + i) + 1] + P[3 * (part.v0 + n + i) + 1]) / 2;
        y = l1 * my(a) + l2 * my(b) + l3 * my(e);
      }
      roots.push(y);
      continue;
    }
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

/* ---------- J: every wing outline smooth (§12.2) ---------- */
/* JAGGEDNESS, read off the planform POLYLINE the model triangulates (root lead
   -> root trail, mm, the root tab excluded), vertex by vertex. Each vertex turns
   the outline by an angle; a vertex whose curvature (turn over its two half
   edges) is under JAG_DEADBAND per mm is straight. Consecutive vertices turning
   the same way form a RUN, which COUNTS when it turns at least JAG_TURN degrees
   in all. A counting run is a CUSP when it is one vertex (all its turn at a
   point) and a LOBE otherwise; its length is its arc (half edges included).
   The outline is JAGGED where two consecutive counting runs of OPPOSITE sense
   (with no more than the floor of straight outline between them) are
     - both CUSPS — a zig-zag, corner against corner; or
     - both LOBES shorter than JAG_LOBE x the floor — a wobble finer than the
       print can make, the noise of a fit that followed the pixels.
   WHY A SCALLOP IS NOT FLAGGED, AT ANY DEPTH OR COUNT: the scallop law cuts
   ROUND LOBES between SHARP NOTCHES, and on the polyline every notch is one
   vertex — a CUSP — while every lobe is several vertices turning the other way
   — a LOBE. A scallop is therefore cusp, lobe, cusp, lobe: never two cusps
   together and never two lobes together, however small the lobes are on a
   small wing. The same holds for a sharp apex or tail tip (one cusp between
   long runs) and for the blended root (a concave fillet lobe between straight
   neck and the drawn edge). What the measure cannot tell from a deliberate
   shape is a deliberate WAVE of smooth lobes finer than the floor, which the
   floor would not print either. */
const JAG_DEADBAND = 0.05, JAG_TURN = 6, JAG_LOBE = 0.8;
/* Every TAIL row pins its forewing's sweep to main's derived default (-25.59
   degrees). The swallowtail's drawn tail tip is narrower than two 0.05 mm
   raster pixels on the diagonal, and at some sweeps (-27.34, -26.12, -20 all
   measured) it leaves a one-pixel cut-safe island on ONE side — with the root
   pinch at 0 too, i.e. on main's own geometry (§12.4). The derived sweep moves
   with the default root pinch, so without the pin every change of that default
   would flip these rows; their subject is the tail, not that tip. */
const TAIL_ROW_SWEEP = -25.59;
export function jaggedness(outline, floor) {
  const P = []; for (const q of outline) if (!P.length || Math.hypot(q[0] - P[P.length - 1][0], q[1] - P[P.length - 1][1]) > 1e-9) P.push(q);
  const V = [];
  for (let i = 1; i + 1 < P.length; i++) {
    const a = [P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]], b = [P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]];
    const la = Math.hypot(...a), lb = Math.hypot(...b), th = Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]);
    const half = (la + lb) / 2;
    V.push({ at: P[i], th, half, sg: Math.abs(th) / half < JAG_DEADBAND ? 0 : Math.sign(th) });
  }
  const runs = []; let cur = null;
  for (const v of V) {
    if (!cur || v.sg !== cur.sg) { if (cur) runs.push(cur); cur = { sg: v.sg, n: 0, len: 0, turn: 0, at: v.at }; }
    cur.n++; cur.len += v.half; cur.turn += v.th;
  }
  if (cur) runs.push(cur);
  const deg = (t) => (Math.abs(t) * 180) / Math.PI;
  const counting = runs.map((r, i) => ({ ...r, i })).filter((r) => r.sg !== 0 && deg(r.turn) >= JAG_TURN);
  let worst = null;
  for (let k = 0; k + 1 < counting.length; k++) {
    const A = counting[k], B = counting[k + 1];
    if (A.sg === B.sg) continue;
    const between = runs.slice(A.i + 1, B.i).reduce((s, r) => s + r.len, 0);
    if (between > floor) continue;
    const zig = A.n === 1 && B.n === 1, wob = A.n > 1 && B.n > 1 && A.len < JAG_LOBE * floor && B.len < JAG_LOBE * floor;
    if (zig || wob) { worst = { at: A.at, kind: zig ? 'zig-zag (corner against corner)' : 'wobble finer than the floor', lens: [A.len, B.len], turns: [deg(A.turn), deg(B.turn)] }; break; }
  }
  return { jagged: !!worst, worst, runs: counting.length };
}
/* J's subject is the VISIBLE outline: the stretch of a wing's drawn outline
   that lies inside the body's top-down silhouette — the root tab, buried in the
   thorax — is drawn in neither export (the layered SVG paints the body over
   it, the STL unions it into the body) and is skipped; the outline is judged
   run by run between such stretches. The silhouette is read off the BODY's own
   emitted contour (contourLoops), and the outline is carried into the world by
   the editor's frame (editorFrame — the map the Q clause holds to the emitted
   wing). A point counts as buried only 0.05 mm or more inside the silhouette.
   The blended root's NECK is never buried: the builder keeps it at least one
   floor out from the silhouette (§13.3), so the fillet lobe J was written to
   allow stays in its subject. */
function visibleRuns(model, part, outline) {
  const body = model.parts.find((q) => q.kind === 'body');
  const F = G.editorFrame(model.params, part.meta.pair);
  if (!body || !F) return [outline];
  const loops = G.contourLoops(model, body);
  const sw = (F.sweep * Math.PI) / 180, cs = Math.cos(sw), sn = Math.sin(sw);
  const toW = ([a, b]) => [F.hinge[0] + a * cs + b * sn, F.hinge[1] - a * sn + b * cs];
  const buried = (q) => { const p = toW(q); let inside = false; for (const L of loops) if (inPoly(p, L)) inside = !inside; if (!inside) return false; for (const L of loops) for (let i = 0; i < L.length; i++) if (segDist(p, L[i], L[(i + 1) % L.length]) < 0.05) return false; return true; };
  const runs = []; let cur = [];
  for (const q of outline) { if (buried(q)) { if (cur.length >= 3) runs.push(cur); cur = []; } else cur.push(q); }
  if (cur.length >= 3) runs.push(cur);
  return runs;
}
function smoothChecks(model) {
  const bad = [], floor = model.params.minDiameter;
  for (const part of model.parts.filter((q) => /^wing\d$/.test(q.kind) && q.side === 'R')) {
    const outline = part.meta.drawnMm;
    if (!outline) { bad.push(`${part.name} carries no drawn outline (meta.drawnMm) to read`); continue; }
    let j = { jagged: false };
    for (const run of visibleRuns(model, part, outline)) { j = jaggedness(run, floor); if (j.jagged) break; }
    if (j.jagged) bad.push(`${part.name} outline is jagged at (${j.worst.at.map((v) => v.toFixed(2)).join(', ')}) mm planform — a ${j.worst.kind}: runs of ${j.worst.lens.map((v) => v.toFixed(2)).join(' and ')} mm turning ${j.worst.turns.map((v) => v.toFixed(0)).join(' and ')} degrees`);
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
function gateThinDepth(poly, floor, H = 12, ignoreXBelow = -Infinity, skip = null) {
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
    if (covered[i] || p[0] < ignoreXBelow || (skip && skip(p[0], p[1]))) return;
    let d = Infinity;
    for (let ring = 1; ring < 400 && d === Infinity; ring *= 2) for (const c of near(covM, p, ring)) d = Math.min(d, Math.hypot(p[0] - c[0], p[1] - c[1]));
    depth = Math.max(depth, d);
  });
  return { depth, h };
}
const fusedSkip = (model, part) => { const bv = bodyView(model), xy = wingXY(model, part.meta.pair), band = G.JUNCTION_FUSED_FRAC * model.params.minDiameter; return (u, w) => bv.sd(...xy(u, w)) <= band; };
function floorChecks(model) {
  const bad = [], floor = model.params.minDiameter, tau = G.THIN_DEPTH_FRAC * floor;
  let worst = 0, gateThin = false, border = false;
  for (const part of model.parts.filter((q) => /^wing\d$/.test(q.kind) && q.side === 'R')) {
    // with the blended root the root chord is no edge (the wing runs on into the
    // body as its tab): the whole planform, nothing inside the body judged
    // under the junction blend: the whole BLENDED planform, with material
    // within half a floor of the body (fused into it) not judged alone — this
    // file's own distance to the body's emitted contour, through its own map
    const { depth, h } = part.meta.junction ? gateThinDepth(part.meta.planform, floor, 12, -Infinity, fusedSkip(model, part))
      : part.meta.root ? gateThinDepth(part.meta.planform, floor, 12, 0) : gateThinDepth(part.meta.planform.slice(1, -1), floor);
    worst = Math.max(worst, depth);
    const builderThin = model.floorViolations.some((v) => v.kind !== 'vein' && `wing${v.pair + 1}` === part.kind);
    if (depth > tau + 2 * h) { gateThin = true; if (!builderThin) bad.push(`${part.name}: thin by this file's measure (${depth.toFixed(2)} mm past the floor disc) and NOT reported by the builder`); }
    else if (depth < tau - 2 * h) { if (builderThin) bad.push(`${part.name}: reported thin by the builder, clear by this file's measure (${depth.toFixed(2)} mm)`); }
    else border = true;
  }
  let refused = false, reason = '';
  try { G.exportStl(model); } catch (e) { refused = e instanceof G.FloorError; reason = e.message; if (!refused) throw e; }
  if (gateThin && !refused) bad.push('the STL exported although a drawn outline is narrower than the floor');
  if (refused !== model.floorViolations.length > 0) bad.push(`the STL ${refused ? 'was refused' : 'exported'} while the model reports ${model.floorViolations.length} floor violation(s)`);
  if (gateVein(model).under && !refused) bad.push('the STL exported although a pair\'s veins are narrower than the floor');
  if (refused && !/narrower than the .* floor/.test(reason)) bad.push(`the refusal does not say why: "${reason}"`);
  // WHICH pairs are blended is derived here from the PARAMETERS (a middle pair
  // with no unlinked drawing), never read off the builder's violation record:
  // a blended pair's sentence must name the two drawn pairs it comes from and
  // offer unlinking; a drawn pair's must not claim a blend. Every violating
  // pair must also be drawn red in the view (its world segments non-empty).
  const N = model.params.wingPairs, unl = model.params.wings.unlinked || {};
  let blended = 0;
  for (const v of model.floorViolations) {
    const k = v.pair + 1, isBlend = v.pair > 0 && v.pair < N - 1 && !unl[v.pair];
    const says = `Pair ${k} is blended from pairs 1 and ${N}. Widen those, or unlink pair ${k} to edit it directly.`;
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
        // the top face: triangles all three of whose vertices are TOP-SKIN
        // vertices by the slab's own layout (v0 + i, i < n). (It was "unit
        // normal z > 0.5" until the edges pass; a rounded rim has sloped bead
        // facets, and a single facet of a slightly twisted bead quad read as
        // its own "piece" of the top face — the instrument's definition, not
        // the wing. The layout is topological and needs no threshold.)
        const nS = part.meta.slab.n;
        for (let t = part.t0; t < part.t1; t++) { const a = I[3 * t] - part.v0, b = I[3 * t + 1] - part.v0, c = I[3 * t + 2] - part.v0; if (a < nS && b < nS && c < nS) top.push(t); }
        void P;
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
      const at = rpart.meta.denseAt;
      // (under the junction blend the planform is the BLENDED outline, read
      // through the builder's own map from a dense sample to its planform point)
      const Jv = rpart.meta.junction, atJ = rpart.meta.denseAtPlanform;
      if (Jv) { if (!atJ || atJ.length !== dense.length) bad.push(`V5: pair ${k} carries no planform index per dense sample`); }
      else if (!at || at.length !== dense.length || drawn.length !== at[at.length - 1] + 3) bad.push(`V5: pair ${k} drawn planform has ${drawn.length} points against ${at ? at[at.length - 1] + 3 : '?'} expected`);
      const tailPts = tailIdx.map((d) => (Jv ? rpart.meta.planform[atJ[d]] : drawn[at[d] + 1]) || scale(dense[d]));
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
    // the drawn outline, root lead -> root trail (open: the root chord is inside
    // the body); under the junction blend the BLENDED outline, closed (it has no
    // root chord) — and the law is held EXACTLY only where the burial cannot
    // reach (this file's own distance to the body's emitted contour, past the
    // fade and past the chamfer's reach of any stretch inside the body); nearer,
    // the burial may only thin the slab: between the floor and the taper's law
    const J = part.meta.junction, bv = J ? bodyView(model) : null, xy = J ? wingXY(model, k) : null;
    const outline = J ? [...part.meta.planform, part.meta.planform[0]] : part.meta.planform.slice(1, -1).reverse();
    const umax = Math.max(...outline.map((q) => q[0]));
    const clearB = Math.max(BURY_CLEAR(), p.wingEdgeBevel + 1.5);
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
      const [u, w] = S.uw[i];
      minT = Math.min(minT, t);
      if (J && bv.sd(...xy(u, w)) < clearB) {
        const taperOnly = thick + (tip - thick) * Math.max(0, Math.min(1, u / umax));
        if (t > taperOnly + 1e-9) worst = Math.max(worst, t - taperOnly);
        continue;
      }
      const want = law(u, w);
      worst = Math.max(worst, Math.abs(t - want));
      if (bevel > 0 && !(p.wingEdgeRound > 0) && u >= 0 && dOut(u, w) < 1e-9) { onOutline++; if (Math.abs(t - floor) > 1e-6) bad.push(`B: ${part.name} an outline vertex is ${t.toFixed(4)} mm thick, the chamfer brings the outline to the ${floor} mm floor`); }
    }
    if (worst > 1e-9) bad.push(`B: ${part.name} emitted thickness departs from the edge law by ${worst.toExponential(2)} mm (taper ${taper}, chamfer ${bevel} mm)`);
  }
  if (minT < floor - 1e-9) bad.push(`B: a wing is ${minT.toFixed(4)} mm thick somewhere, under the ${floor} mm floor`);
  // (with the rounded edge the skins stop short of the outline by the bead's
  // radius, so no SKIN vertex is on it: the bead's own clauses, E, take over)
  if (p.wingEdgeBevel > 0 && !(p.wingEdgeRound > 0) && p.wingPairs > 0 && !onOutline) bad.push('B: a chamfer is asked for and no vertex lies on the outline (vacuous)');
  return { bad, minT: Number.isFinite(minT) ? minT : null, onOutline };
}

/* E — the ROUNDED EDGE (edges pass, design doc §10). The reference is the
   PARAMETERS (wingEdgeRound, the floor) and the drawn planform / the planned
   holes; the measured side is the EMITTED bead: per rim point the builder
   records its ring of vertex ids (meta.bead.rings: top-skin vertex first,
   bottom-skin vertex last, the apex in the middle), and every number below is
   read off those vertices' positions.
     E1 the bead IS a half ellipse: with M the mid-point of its two skin
        vertices, V = top - M (the half-thickness, across the sheet) and D =
        apex - M (the in-plane radius), every ring vertex j sits at
        M + sin(t_j) D + cos(t_j) V (1e-9 mm) — exact where the wing is
        untwisted (pitch 0), reported otherwise; |D| <= |V| (never more than a
        half-round) and D is square to V.
     E2 NO SQUARE WALL: no emitted edge joins a rim point's top-skin vertex to
        its own bottom twin (the wall a square edge is made of) — structural.
        At round 0 the clause turns round: every rim point MUST be so joined
        and no bead may be recorded (the shipped slab, by branch).
     E3 every free edge is rounded: every rim point beyond the root ramp
        (apex u > 1 mm) has |D| > 0 — no point of the outline or of a hole rim
        left square.
     E4 the SILHOUETTE DOES NOT MOVE: every bead's apex (the record) lies ON the
        drawn planform or ON a planned hole polygon (this file's own segment
        distance, 1e-9 mm); and in HOLES every planned hole vertex is the apex
        of some bead (every hole rim rounded).
     E5 the floor: every bead's height 2|V| (the local thickness) is at or
        over minDiameter — at a full round the bead is a rod of the sheet's
        own thickness, never thinner than the floor.
     E6 the inset skin stays an embedding: every top-skin triangle keeps one
        orientation in the planform frame (none flipped by the inset).
     E7 on a FLAT wing the contour (the SVG's silhouette, G.contourLoops) runs
        through every outline apex — the projection is the drawn outline. */
function edgeRoundChecks(model) {
  const bad = [], p = model.params, P = model.positions, floor = p.minDiameter, round = p.wingEdgeRound;
  const V3 = (v) => [P[3 * v], P[3 * v + 1], P[3 * v + 2]];
  let beads = 0, full = 0, aMin = Infinity, ellRes = 0, ellSkipped = 0, holeApex = 0;
  for (const part of model.parts.filter((q) => /^wing\d$/.test(q.kind) && q.side === 'R')) {
    const S = part.meta.slab, B = part.meta.bead, n = S.n;
    const k = +part.kind.slice(4) - 1, spec = pairFieldsFor(p, k);
    // edges of the part, for E2
    const E = new Set(), I = model.indices;
    for (let t = part.t0; t < part.t1; t++) { const v = [I[3 * t], I[3 * t + 1], I[3 * t + 2]]; for (let e = 0; e < 3; e++) { const a = v[e], b = v[(e + 1) % 3]; E.add(a < b ? `${a},${b}` : `${b},${a}`); } }
    const joined = (a, b) => E.has(a < b ? `${a},${b}` : `${b},${a}`);
    const rim = (part.meta.edgePairs ? [...part.meta.edgePairs.outline, ...part.meta.edgePairs.other] : []);
    if (!(round > 0)) {
      if (B) bad.push(`E2: ${part.name} records a bead at round 0`);
      const walls = rim.filter(([a, b]) => joined(a, b)).length;
      if (walls !== rim.length) bad.push(`E2: ${part.name} at round 0 only ${walls} of ${rim.length} rim points have the square wall`);
      continue;
    }
    if (!B) { bad.push(`E2: ${part.name} records no bead at round ${round} (a square-walled rim)`); continue; }
    const walls = rim.filter(([a, b]) => joined(a, b)).length;
    if (walls) bad.push(`E2: ${part.name} ${walls} rim point(s) still have a square wall (top joined straight to bottom)`);
    // under the junction blend the silhouette is the BLENDED outline, closed,
    // and "past the root" is "outside the body's emitted contour"
    const J = part.meta.junction, bv = J ? bodyView(model) : null, xyJ = J ? wingXY(model, k) : null;
    const outline = J ? [...part.meta.planform, part.meta.planform[0]] : part.meta.planform.slice(1, -1).reverse();
    const holes = (part.meta.venation ? part.meta.venation.cells.flatMap((c) => c.holes) : []);
    const onCurve = (q) => {
      let d = Infinity;
      for (let i = 0; i + 1 < outline.length; i++) d = Math.min(d, segDist(q, outline[i], outline[i + 1]));
      for (const h of holes) for (let i = 0; i < h.length; i++) d = Math.min(d, segDist(q, h[i], h[(i + 1) % h.length]));
      return d;
    };
    const K = B.K, untwisted = !(spec.pitch) ;
    // the bead's ramp ends 1 mm past its start: the root chord, or — under the
    // blended root (§12.1) — 1 mm short of the body's silhouette, restated here
    // from the hinge (half the thorax's local half-width out), not read off the part
    const kH = G.wingHinges(p, model.layout)[part.meta.pair].k;
    const rampEnd = (part.meta.root ? Math.max(0, 0.5 * model.layout.rt * kH - 1) : 0) + 1;
    let off = 0, flat = 0, under = 0, over = 0;
    const apexKeys = new Set();
    for (const r of B.rings) {
      const top = V3(r.ids[0]), bot = V3(r.ids[K]), M = top.map((x, d) => (x + bot[d]) / 2);
      const Vv = top.map((x, d) => x - M[d]), Dv = V3(r.ids[K / 2]).map((x, d) => x - M[d]);
      const Vn = Math.hypot(...Vv), Dn = Math.hypot(...Dv);
      beads++;
      if (2 * Vn < floor - 1e-9) under++;
      if (Dn > Vn * (1 + 1e-9) + 1e-12) over++;   // the WORLD chord, on a pitched wing too: a pitched wing is a helicoid that stretches planform distances along the span, so the builder sizes the bead by its world chord (design doc §15.3); the old 1% allowance for pitch let a 1.12% bead through (#55/#27 at 0.37, holes)
      if (J ? bv.sd(...xyJ(...r.apex)) > 0 : r.apex[0] > rampEnd + 1e-9) { aMin = Math.min(aMin, Dn / Vn); if (!(Dn > 0)) flat++; if (Dn >= 0.98 * Vn) full++; }
      if (untwisted) {
        for (let j = 0; j <= K; j++) { const t = (Math.PI * j) / K, X = V3(r.ids[j]); ellRes = Math.max(ellRes, Math.hypot(...X.map((x, d) => x - M[d] - Math.sin(t) * Dv[d] - Math.cos(t) * Vv[d]))); }
        const dot = Vv.reduce((a, x, d) => a + x * Dv[d], 0);
        if (Vn > 0 && Dn > 1e-6 && Math.abs(dot) / (Vn * Dn) > 1e-6) bad.push(`E1: ${part.name} a bead's radius is not square to the sheet (cos ${(dot / (Vn * Dn)).toExponential(2)})`);
      } else ellSkipped++;
      if ((J || r.apex[0] > 1e-9) && onCurve(r.apex) > 1e-9) off++;
      apexKeys.add(`${r.apex[0]},${r.apex[1]}`);
    }
    if (under) bad.push(`E5: ${part.name} ${under} bead(s) lower than the ${floor} mm floor`);
    if (over) bad.push(`E1: ${part.name} ${over} bead(s) wider in plane than half the thickness (more than a half-round)`);
    if (flat) bad.push(`E3: ${part.name} ${flat} rim point(s) past the root left square (radius 0)`);
    if (off) bad.push(`E4: ${part.name} ${off} bead apex(es) off the drawn outline / the planned holes — the silhouette moved`);
    for (const h of holes) for (const q of h) { if (!apexKeys.has(`${q[0]},${q[1]}`)) { bad.push(`E4: ${part.name} a planned hole vertex (${q[0].toFixed(3)}, ${q[1].toFixed(3)}) is the apex of no bead — that hole rim is not rounded`); break; } holeApex++; }
    // E6: top-skin triangles keep one orientation — read off the EMITTED top
    // vertices (x, y) on a flat wing, off the layout's (u, w) on a tilted one
    const flatWing = !spec.pitch && !spec.dihedral;
    const xyOf = (i) => (flatWing ? [P[3 * (part.v0 + i)], P[3 * (part.v0 + i) + 1]] : S.uw[i]);
    let pos = 0, neg = 0;
    for (let t = part.t0; t < part.t1; t++) {
      const a = I[3 * t] - part.v0, b = I[3 * t + 1] - part.v0, c = I[3 * t + 2] - part.v0;
      if (!(a < n && b < n && c < n)) continue;
      const A = xyOf(a), Bq = xyOf(b), C = xyOf(c), cr = (Bq[0] - A[0]) * (C[1] - A[1]) - (Bq[1] - A[1]) * (C[0] - A[0]);
      if (cr > 0) pos++; else neg++;
    }
    if (pos && neg) bad.push(`E6: ${part.name} ${Math.min(pos, neg)} top-skin triangle(s) flipped`);
    // E7: a flat wing's SILHOUETTE is the drawn outline, in world mm — every
    // point of its outer contour loop past the root lies on the drawn outline
    // carried into the world by the flat wing transform (editorFrame, which Q
    // measures independently against the emitted geometry)
    if (flatWing) {
      const F = G.editorFrame(p, k), Lmm = F.length, Smm = F.length * F.stretch;
      // the planform is already in mm with the blended root applied: undo the
      // root map before the frame (whose toWorld applies it to drawn points)
      const wo = outline.map(([u, w]) => { const [a, b] = F.rootWarp ? F.rootWarp.inv(u, w) : [u, w]; return F.toWorld(a / Lmm, b / Smm); });
      const loops = G.contourLoops(model, part), big = loops.reduce((a, l) => (l.length > a.length ? l : a), []);
      let worst = 0, seen = 0, grown = 0;
      // under the junction blend the wing also THINS over the burial fade
      // (BURY_FADE_MM outside the body's silhouette as the builder smooths it,
      // half a millimetre either way) and its bead shrinks with it, so in that
      // band a ring beside a smaller one carries the contour INSIDE the outline
      // as on the root ramp — never outside it. Past the fade plus one
      // millimetre (a ring spacing beyond its edge, with room) the silhouette
      // IS the outline again. Measured over 212 rows (the library x none /
      // holes / ridges, the drawn outlines, 40 random): every point the blend
      // moves lies inside the outline, the farthest 2.81 mm from the body,
      // 0.060 mm in (lib #25, holes)
      const fadeOut = G.BURY_FADE_MM + 1;
      const inside = (x, y) => { let c = false; for (let i = 0, j = wo.length - 1; i < wo.length; j = i++) { const a = wo[i], b = wo[j]; if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
      for (const [x, y] of big) {
        // past the root ramp (the bead grows from 0 over the first mm of span,
        // and a ring next to a much smaller one can carry the contour along its
        // 60-degree vertex, up to 0.13 a inside the outline — 0.029 mm measured
        // on the blended row): past 2 mm the silhouette IS the outline
        // (under the junction blend: 2 mm outside the body's emitted contour —
        // the bead runs out to nothing over the millimetre inside the body's
        // silhouette, read off a silhouette smoothed half a millimetre either
        // way, and a ring beside a smaller one carries the contour inside the
        // outline there, as past the drawn root's first 2 mm above)
        let inFade = false;
        if (J) { const s = bv.sd(x, y); if (s < 2) continue; inFade = s < fadeOut; } else { const [u] = F.fromWorld(x, y); if (u * Lmm <= 2 + 1e-9) continue; }
        let d = Infinity; for (let i = 0; i + 1 < wo.length; i++) d = Math.min(d, segDist([x, y], wo[i], wo[i + 1]));
        if (inFade) { if (d > 1e-6 && !inside(x, y)) grown = Math.max(grown, d); continue; }
        worst = Math.max(worst, d); seen++;
      }
      if (!seen) bad.push(`E7: ${part.name} the flat wing has no silhouette past its root (vacuous)`);
      else if (worst > 1e-6) bad.push(`E7: ${part.name} the flat wing's silhouette stands ${worst.toFixed(4)} mm off the drawn outline — the edge moved it`);
      if (grown) bad.push(`E7: ${part.name} over the burial fade the silhouette stands ${grown.toFixed(4)} mm OUTSIDE the drawn outline — the edge grew it`);
    }
  }
  if (ellRes > 1e-9) bad.push(`E1: a bead departs from its half ellipse by ${ellRes.toExponential(2)} mm`);
  return { bad, beads, full, aMin: Number.isFinite(aMin) ? aMin : null, ellRes, ellSkipped, holeApex };
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
  // under the junction blend the margin is read on the DRAWN planform the blend
  // started from (meta.junction.drawn); a drawn point the blend kept is read off
  // its emitted bead apex as before, one it swallowed (inside the body) off the
  // wing transform restated here (the specimen wing is flat: a rigid map)
  const Jy = part.meta.junction;
  const poly = part.meta.planform, outline = Jy ? Jy.drawn : poly.slice(1, -1).reverse();
  let apex = 0; for (let i = 1; i < outline.length; i++) if (outline[i][0] > outline[apex][0]) apex = i;
  const rt = outline[outline.length - 1], A = outline[apex];
  let best = -1, bc = 0;
  for (let i = apex + 1; i < outline.length - 1; i++) { const c = (rt[0] - A[0]) * (outline[i][1] - A[1]) - (rt[1] - A[1]) * (outline[i][0] - A[0]); if (c > bc) { bc = c; best = i; } }
  const toPoly = Jy ? (j) => Jy.src.indexOf(j) : (j) => outline.length - j;                    // outline[j] is planform[outline.length - j]
  // with the rounded edge the skins are inset: the margin is read off the
  // BEAD's apex vertex of that planform point (it sits on the drawn outline)
  const apexOf = new Map(); if (part.meta.bead) for (const r of part.meta.bead.rings) apexOf.set(r.i, r.ids[part.meta.bead.K / 2]);
  const xyY = Jy ? wingXY(model, 0) : null;
  const vy = (i, j) => (i < 0 ? xyY(...outline[j])[1] : P[3 * (apexOf.has(i) ? apexOf.get(i) : part.v0 + i) + 1]);
  const atPoint = (i, q) => { const r = part.meta.bead ? part.meta.bead.rings.find((x) => x.i === i) : null; const at = r ? r.apex : part.meta.slab && part.meta.slab.uw[i]; return at && at[0] === q[0] && at[1] === q[1]; };
  const atOk = (j) => (Jy && toPoly(j) < 0) || atPoint(toPoly(j), outline[j]);
  if (!(part.meta.slab && atOk(best) && atOk(outline.length - 1))) bad.push('Y: the slab does not start with the planform polygon (cannot read the margin)');
  else {
    // the sweep the margin NEEDS, by this file's own reading of the planform.
    // Eva's ruling: the pose must SUCCEED on any wing — no clamp. The need
    // must lie inside the slider's range and the emitted margin be square.
    const need = Math.atan2(outline[best][1] - rt[1], outline[best][0] - rt[0]) * 180 / Math.PI;
    const f = G.WING_FIELDS.find((x) => x.id === 'sweep');
    const dy = vy(toPoly(best), best) - vy(toPoly(outline.length - 1), outline.length - 1);
    if (need < f.min || need > f.max) bad.push(`Y: the margin needs ${need.toFixed(1)}°, outside the slider (${f.min}–${f.max}°) — Set specimen would clamp`);
    else if (Math.abs(dy) > 1e-6) bad.push(`Y: the forewing's inner margin is not square to the body — its ends differ by ${dy.toFixed(4)} mm in y`);
  }
  // (under the junction blend the buried part sinks to the body's mid-plane:
  // flat means flat wherever the burial cannot reach, by this file's own
  // distance to the body's emitted contour)
  for (const w of model.parts.filter((q) => /^wing\d$/.test(q.kind) && q.side === 'R')) {
    const n = w.meta.slab.n; let z0 = Infinity, z1 = -Infinity;
    const bvY = w.meta.junction ? bodyView(model) : null, xyW = bvY ? wingXY(model, w.meta.pair) : null;
    for (let i = 0; i < n; i++) { if (bvY && bvY.sd(...xyW(...w.meta.slab.uw[i])) < BURY_CLEAR()) continue; const z = (P[3 * (w.v0 + i) + 2] + P[3 * (w.v0 + n + i) + 2]) / 2; z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
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
  for (const b of smoothChecks(model)) fails.push(`J: ${b}`);
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
  const er = edgeRoundChecks(model); for (const b of er.bad) fails.push(b);
  const xc = tipChecks(model); for (const b of xc.bad) fails.push(b);
  const gc = segmentChecks(model); for (const b of gc.bad) fails.push(b);
  if (opts.expectGrooves && !gc.seen) fails.push('G: the segment row measured no boundary (vacuous)');
  if (opts.specimen) for (const b of specimenChecks(model).bad) fails.push(b);
  const vn = venationChecks(model, opts);
  for (const b of vn.bad) fails.push(b.startsWith('V') ? b : `V: ${b}`);
  if (opts.expectVeinThin && !gateVein(model).under) fails.push('V4: the deliberately thin-vein row is not under the floor by this file\'s reading (vacuous)');
  if (opts.expectTailVein && !model.wingPairs.some((w) => w.hasTail)) fails.push('V5: the tail-vein row has no tail (vacuous)');
  const jb = junctionChecks(model); for (const b of jb.bad) fails.push(b);
  if (opts.bodyFit) for (const b of bodyFitClause(G, model, opts.bodyFit)) fails.push(b);
  return { label, fails, md, stl, cn, mf, sv, rc, le, fc, vn, ec, er, xc, gc, jb, notes: model.notes };
}

function fmt(r) {
  const f = (x) => (Number.isFinite(x) ? x.toFixed(3) : '  — ');
  return `${r.fails.length ? 'FAIL' : 'ok  '} ${r.label.padEnd(26)} tris=${String(r.stl.triangles).padStart(6)} stl=${(r.stl.bytes / 1024).toFixed(0).padStart(5)}KiB `
    + `mirror=${r.md} boundary=${r.stl.boundary} nonManifold(unrated)=${r.stl.nonManifold} regions=${r.cn.comps} `
    + `minTube=${f(r.mf.tubeMin)} minThick=${f(r.mf.thickMin)} waist=${f(r.mf.waistMin)} roots=${r.rc.roots.length}${r.rc.roots.length > 1 ? `@${f(r.rc.minGap)}mm` : ''} cutRegions=${r.sv.regions}`
    + ` floor=${r.fc.refused ? 'STL-REFUSED' : 'ok'}(${r.fc.worst.toFixed(2)}mm${r.fc.border ? ',borderline' : ''})`
    + (r.vn.cells ? ` cells=${r.vn.cells}${r.vn.holes ? ` holes=${r.vn.holes} gap=${f(r.vn.minGap)} border=${f(r.vn.minBorder)}` : ''}` : '')
    + ` edge=${r.ec.minT === null ? '—' : r.ec.minT.toFixed(3)}mm${r.ec.onOutline ? `(${r.ec.onOutline} on the outline)` : ''}`
    + (r.er.beads ? ` beads=${r.er.beads}(full ${r.er.full}, min a/H ${r.er.aMin === null ? '—' : r.er.aMin.toFixed(2)}${r.er.ellSkipped ? `, ${r.er.ellSkipped} twisted unchecked` : ''})` : '')
    + ` points=${r.xc.pts}${r.gc.seen ? ` grooves=${r.gc.seen}` : ''}`
    + (r.jb && r.jb.slot ? ` junction=slot ${r.jb.slot.depth.toFixed(2)}mm neck ${r.jb.necks.map((q) => q.neck.toFixed(2)).join('/')}mm buried ${r.jb.buried.map((q) => `${q.judged - q.exposed - q.thinOver}/${q.judged}${q.thin ? `(${q.thin} over a body under the floor)` : ''}`).join(' ')}` : '')
    + (r.le ? ` legsOutside=${r.le.outside.toFixed(2)}/${r.le.area.toFixed(2)}mm²` : '') + (r.notes.length ? `  notes: ${r.notes.join('; ')}` : '');
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
  // Q — the on-wing editor: a drag lands where the pointer is
  { const qc = qCheck(qCases()); ok(!qc.bad.length, `Q: ${qc.n} drags on the flat-displayed wing land where the pointer is (worst ${qc.worstLand.toExponential(1)} mm; points drawn on the wing to ${qc.worstDraw.toExponential(1)} mm), the display changes only the edited pair${qc.bad.length ? ' — ' + qc.bad.join('; ') : ''}`); }
  // the edges pass (§10): a version-4 design (no round radius) loads with the round at 0
  { const v4 = G.designFromParams(G.defaultParams(), 'v4'); v4.version = 4; delete v4.params.wingEdgeRound; v4.params.wingEdgeBevel = 4;
    const r4 = G.paramsFromDesign(JSON.parse(JSON.stringify(v4))), want = G.defaultParams(); want.wingEdgeRound = 0; want.wingEdgeBevel = 4;
    const b4 = G.buildBug(r4.params), bw = G.buildBug(want);
    ok(r4.ok && r4.params.wingEdgeRound === 0 && b4.positions.length === bw.positions.length && b4.positions.every((x, i) => Object.is(x, bw.positions[i])), 'D: a version-4 design (no round radius) loads with the round at 0 — the square-walled chamfer it was saved with, bit for bit'); }
  // the junction blend (§16): a version-6 design (saved before it) loads with
  // the blend OFF — the wings it was saved with, root tabs and all, bit for bit
  { const v6 = G.designFromParams(G.defaultParams(), 'v6'); v6.version = 6; delete v6.params.wingJunction;
    const r6 = G.paramsFromDesign(JSON.parse(JSON.stringify(v6))), want = G.defaultParams(); want.wingJunction = 0;
    const b6 = G.buildBug(r6.params), bw = G.buildBug(want), bj = G.buildBug(G.defaultParams());
    const same = (a, b) => a.positions.length === b.positions.length && a.positions.every((x, i) => Object.is(x, b.positions[i]));
    ok(r6.ok && r6.params.wingJunction === 0 && same(b6, bw) && !same(bj, bw), 'D: a version-6 design (no junction blend) loads with the blend at 0 — the bug it was saved with, bit for bit (and the default with the blend on is a different bug: the check is not vacuous)'); }
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
  // N0 (§15.2): the builder's floor measure and this file's are ONE definition
  // on one lattice — a floor-disc centre is a grid point at least floor/2 from
  // the boundary by exact segment distance — so they agree to the grid on every
  // wing; on the root-under-floor fixture's hindwing both read it thin and the
  // builder reports it
  {
    const bad = []; let n = 0, worst = 0, fx = null;
    const rowsN0 = [['fixture root under floor', rootUnderFloor()], ['default', G.defaultParams()], ['blended thin', blendedThin()], ...[1, 2, 3, 4, 5, 6].map((s) => [`random:${s}`, G.randomParams(s)])];
    for (const [name, p] of rowsN0) {
      const m = G.buildBug(p), floor = m.params.minDiameter;
      for (const part of m.parts.filter((q) => /^wing\d$/.test(q.kind) && q.side === 'R')) {
        const J = part.meta.junction, skip = J ? fusedSkip(m, part) : null;
        const poly = J || part.meta.root ? part.meta.planform : part.meta.planform.slice(1, -1), ig = !J && part.meta.root ? 0 : -Infinity;
        const g = gateThinDepth(poly, floor, 12, ig, skip), b = G.thinAnalysis(poly, floor, { ignoreXBelow: ig, ...(skip ? { skip } : {}) });
        n++; worst = Math.max(worst, Math.abs(g.depth - b.maxDepth));
        if (Math.abs(g.depth - b.maxDepth) > g.h + 1e-9) bad.push(`${name} ${part.name}: gate ${g.depth.toFixed(3)} mm, builder ${b.maxDepth.toFixed(3)}`);
        if (name.startsWith('fixture') && part.kind === 'wing3') fx = { g: g.depth, b: b.maxDepth, viol: m.floorViolations.some((v) => v.pair === 2 && v.kind !== 'vein') };
      }
    }
    ok(!bad.length && fx && fx.g > 0.5 + 1e-9 && fx.b > 0.5 + 1e-9 && fx.viol, `N0: the builder's floor measure and this file's agree within one grid step on ${n} wings (worst ${worst.toFixed(3)} mm); the #20/#31 hindwing root reads ${fx ? fx.g.toFixed(2) : '?'} / ${fx ? fx.b.toFixed(2) : '?'} mm past the floor disc${fx && fx.viol ? ' and is reported' : ' — NOT reported by the builder'}${bad.length ? ' — ' + bad.slice(0, 3).join(' | ') : ''}`);
  }
  return out;
}

/* ---------- Q: the on-wing editor's frame ---------- */
/* The page edits a wing in the TOP view on the SVG projection, the wing being
   edited displayed FLAT (buildBug's flatPair). A pointer lands at a point S in
   the SVG's own user units (the browser's getScreenCTM is the page's half);
   the page carries it into the world (worldFromSvg, the export's frame) and
   into the outline (editorFrame.fromWorld), and moves the control point there.
   This clause performs exactly that and MEASURES where the moved point lands
   in the rebuilt display model — its EMITTED bead apex vertex, carried back
   through the export's frame — against S. The reference is the target the
   gate picked; the measured side is geometry no part of the mapping wrote.
   Under non-zero stretch and sweep, on a TILTED pair (displayed flat), and on
   an unlinked middle pair. Also: the overlay draws every control point on the
   emitted wing (toWorld against the apex), and the flat display changes ONLY
   the edited pair (every other part bit-identical to the real model). */
function apexOfControl(model, k, i) {
  const part = model.parts.find((q) => q.kind === `wing${k + 1}` && q.side === 'R');
  // (under the junction blend the builder's own map from a dense sample to its
  // blended planform point; a control point the blend swallowed has none)
  const n = part.meta.planform.length, d = part.meta.denseAt[i * G.CR_SAMPLES], idx = part.meta.junction ? part.meta.denseAtPlanform[i * G.CR_SAMPLES] : n - 1 - (d + 1);
  const r = part.meta.bead.rings.find((x) => x.i === idx);
  const v = r.ids[part.meta.bead.K / 2], P = model.positions;
  return [P[3 * v], P[3 * v + 1], P[3 * v + 2]];
}
function qCheck(cases, mut = {}) {
  const bad = [], frameOf = mut.frame || G.editorFrame;
  let worstLand = 0, worstDraw = 0, n = 0;
  for (const { label, p, k, i, du, dw } of cases) {
    const disp = G.buildBug(p, mut.notFlat ? {} : { flatPair: k });
    const F = frameOf(p, k), fr = G.exportSvg(disp).frame;
    const spec = k === 0 ? p.wings.first : k === p.wingPairs - 1 ? p.wings.last : p.wings.unlinked[k];
    // the overlay draws control point i ON the emitted wing
    const A = apexOfControl(disp, k, i), Wd = F.toWorld(...spec.points[i]);
    worstDraw = Math.max(worstDraw, Math.hypot(A[0] - Wd[0], A[1] - Wd[1]));
    // a drag to S lands at S
    const targetWorld = [A[0] + du, A[1] + dw], S = G.svgFromWorld(fr, ...targetWorld);
    const q = F.fromWorld(...G.worldFromSvg(fr, ...S));
    const mv = G.moveControlPoint(spec.points, i, q);
    if (!mv.ok) { bad.push(`Q: ${label} the test drag was refused (${mv.reason}) — pick another`); continue; }
    const p2 = JSON.parse(JSON.stringify(p)); const s2 = k === 0 ? p2.wings.first : k === p.wingPairs - 1 ? p2.wings.last : p2.wings.unlinked[k]; s2.points = mv.points;
    const disp2 = G.buildBug(p2, mut.notFlat ? {} : { flatPair: k });
    const A2 = apexOfControl(disp2, k, i), S2 = G.svgFromWorld(G.exportSvg(disp2).frame, A2[0], A2[1]);
    // the frame of the REBUILT svg can move (its bounds moved): compare in world
    const land = Math.hypot(A2[0] - targetWorld[0], A2[1] - targetWorld[1]);
    void S2;
    worstLand = Math.max(worstLand, land); n++;
    if (land > 1e-9) bad.push(`Q: ${label} a drag to (${targetWorld.map((x) => x.toFixed(3))}) mm landed ${land.toFixed(4)} mm away — the screen does not map onto the outline`);
    // the flat display is display only: every part but pair k is the real model's
    const real = G.buildBug(p);
    for (const part of real.parts) {
      if (part.kind === `wing${k + 1}`) continue;
      const o = disp.parts.find((x) => x.name === part.name && x.side === part.side);
      const same = o && o.v1 - o.v0 === part.v1 - part.v0 && Array.from(real.positions.slice(3 * part.v0, 3 * part.v1)).every((x, j) => Object.is(x, disp.positions[3 * o.v0 + j]));
      if (!same) { bad.push(`Q: ${label} the flat display moved ${part.name}-${part.side}, not only the edited pair`); break; }
    }
  }
  if (worstDraw > 1e-9) bad.push(`Q: a control point is drawn ${worstDraw.toFixed(4)} mm off the emitted wing`);
  return { bad, worstLand, worstDraw, n };
}
function qCases() {
  const a = G.defaultParams(); a.wings.first.stretch = 1.3; a.wings.first.sweep = -20; a.wings.first.dihedral = 30; a.wings.first.pitch = 15;
  const b = G.defaultParams(); b.wings.last.stretch = 0.8; b.wings.last.sweep = 35; b.wings.last.dihedral = -15; b.wings.last.pitch = -10;
  const c = G.defaultParams(); c.wingPairs = 4; c.wings.unlinked[1] = { ...JSON.parse(JSON.stringify(c.wings.first)), stretch: 1.6, sweep: 50, dihedral: 20, pitch: 8 };
  return [
    { label: 'forewing, stretch 1.3, sweep -20, tilted 30/15', p: a, k: 0, i: 2, du: 0.6, dw: 0.4 },
    { label: 'hindwing, stretch 0.8, sweep 35, tilted -15/-10', p: b, k: 1, i: 1, du: -0.5, dw: 0.7 },
    { label: 'unlinked pair 2 of 4, stretch 1.6, sweep 50', p: c, k: 1, i: 2, du: 0.4, dw: -0.5 },
  ];
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
  // BLENDED ROOT rows (§12.1). The default pinch is 0 (Eva), so the root map is
  // exercised only where a row asks for it: the default bug across the pinch
  // ladder and the length range, at 4 pairs, under both venation modes (the
  // holes row is the layout that found the flat-triangle hole), and the random
  // bugs each given a seeded pinch and length — the page's Randomize leaves the
  // root off; these are the gate's own draws.
  for (const [pin, len] of [[0.15, 1], [0.3, 1], [0.45, 0.5], [0.6, 1], [0.6, 2], [1, 1], [1, 2], [1, 0.5]]) { const p = d(); p.wingRootPinch = pin; p.wingRootLength = len; rows.push([`root pinch ${pin}, length ${len}`, p, {}]); }
  { const p = d(); p.wingRootPinch = 0.6; p.wingPairs = 4; rows.push(['root pinch 0.6, 4 pairs', p, {}]); }
  { const p = d(); p.wingRootPinch = 0.3; p.venation = 'holes'; p.wingPairs = 3; p.wings.first.veinCount = 8; p.wings.first.crossDensity = 1; p.wings.last.veinCount = 3; p.wings.last.crossDensity = 0; rows.push(['root pinch 0.3, holes 3 pairs 8→3 veins', p, {}]); }
  { const p = d(); p.wingRootPinch = 0.6; p.venation = 'ridges'; p.wingPairs = 3; rows.push(['root pinch 0.6, ridges 3 pairs', p, {}]); }
  { const p = d(); p.wingRootPinch = 0.45; p.wingRootLength = 2; p.venation = 'holes'; for (const w of [p.wings.first, p.wings.last]) { w.crossDensity = 0.8; w.cellRegularity = 0; w.veinBranch = 2; w.veinCount = 6; w.length = 44; w.stretch = 1.4; } rows.push(['root pinch 0.45 x2, holes irregular dense net', p, {}]); }
  for (let s = 1; s <= nseeds; s++) { const p = G.randomParams(s); p.wingRootPinch = [0.15, 0.3, 0.45, 0.6, 0.8, 1][s % 6]; p.wingRootLength = [1, 0.5, 2, 1, 1.75, 1.5, 0.75][s % 7]; rows.push([`random:${s} root ${p.wingRootPinch}x${p.wingRootLength}`, p, {}]); }
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
    const on = d(); on.wingPairs = n; on.wings.tail.on = true; on.wings.first.sweep = TAIL_ROW_SWEEP;
    const off = d(); off.wingPairs = n; off.wings.first.sweep = TAIL_ROW_SWEEP;
    rows.push([`tail ON, ${n} pair(s)`, on, { tailIso: G.buildBug(off) }]);
  }
  { const p = d(); p.wingPairs = 4; p.wings.first.sweep = TAIL_ROW_SWEEP; p.wings.first.points = HAND_OUTLINES.swallowtail; p.wings.tail.on = true; p.wings.unlinked[2] = { ...p.wings.first, points: HAND_OUTLINES.falcate };
    const off = JSON.parse(JSON.stringify(p)); off.wings.tail.on = false;
    rows.push(['tail ON, 4 pairs, one unlinked', p, { tailIso: G.buildBug(off) }]); }
  { const p = d(); p.wings.tail = JSON.parse(JSON.stringify(THIN_TAIL)); rows.push(['tail drawn under the floor', p, { expectThin: true }]); }
  { const p = d(); p.wingPairs = 3; p.wings.first.points = CROSSING_BLEND.first; p.wings.last.points = CROSSING_BLEND.last; rows.push(['crossing blend (3 pairs)', p, { repaired: true }]); }
  rows.push(['blended pair under the floor', blendedThin(), { repaired: true, expectBlended: true }]);
  // §15.2: a library blend whose hindwing root channel is under the floor —
  // the builder's disc test once read it clear (0.42 mm against the gate's
  // 1.04) and exported; §15.3: a pitched holes blend whose world beads were
  // wider than a half-round (E1). Both kept as params (tools/bug-fixtures.mjs).
  rows.push(['fixture: #20/#31 at 0.62, hindwing root under the floor (refused)', rootUnderFloor(), { expectThin: true }]);
  rows.push(['fixture: #55/#27 at 0.37, pitched, holes', pitchedBeadHoles(), {}]);
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
    ven(mode, (p) => { p.wings.first.points = HAND_OUTLINES.swallowtail; p.wings.first.sweep = TAIL_ROW_SWEEP; p.wings.tail.on = true; p.wings.last.length = 30; p.wings.last.stretch = 1.4; }, 'swallowtail with a tail', { expectTailVein: true });
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
  const ends = [['wingEdgeTaper', 0, 0.9], ['wingEdgeBevel', 0, 4], ['wingEdgeRound', 0, 1], ['clubLength', 0, 0.5], ['clubWidth', 1, 4], ['clubTaper', 0, 1], ['segmentStyle', 0, 1], ['pointedTips', false, true]];
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
  // EDGES PASS rows (design doc §10): the round at half, over a chamfer, the
  // old chamfer default (square wall), both venation modes at half a round, a
  // 3 mm sheet in HOLES (the veins as near-round rods), the floor at 2 mm, a
  // tilted and pitched pair, the tail, and random bugs in each mode
  { const p = d(); p.wingEdgeRound = 0.5; rows.push(['round 0.5', p, {}]); }
  { const p = d(); p.wingEdgeBevel = 4; rows.push(['round 1 over a 4 mm chamfer', p, {}]); }
  { const p = d(); p.wingEdgeBevel = 4; p.wingEdgeRound = 0; rows.push(['the old default edge (4 mm chamfer, square wall)', p, {}]); }
  for (const mode of ['holes', 'ridges']) { const p = d(); p.venation = mode; p.wingEdgeRound = 0.5; rows.push([`${mode} with round 0.5`, p, {}]); }
  { const p = d(); p.venation = 'holes'; for (const w of [p.wings.first, p.wings.last]) w.thickness = 3; rows.push(['holes on a 3 mm sheet (veins near-round rods)', p, {}]); }
  { const p = d(); p.venation = 'holes'; p.wings.first.veinWidth = 1.0; p.wings.first.veinTaper = 0; p.wings.first.thickness = 1.0; rows.push(['holes: veins at the floor, 1 x 1 mm (round rods)', p, {}]); }
  { const p = d(); p.minDiameter = 2; p.wingEdgeRound = 1; rows.push(['round 1 with a 2 mm floor', p, {}]); }
  { const p = d(); p.wings.first.dihedral = 35; p.wings.first.pitch = 20; p.wings.last.dihedral = -25; p.wings.last.pitch = -15; rows.push(['round 1, tilted and pitched pairs', p, {}]); }
  { const p = d(); p.wings.tail.on = true; p.wings.first.sweep = TAIL_ROW_SWEEP; p.venation = 'holes'; rows.push(['holes, tail ON (rounded tail rims)', p, {}]); }
  // the strap on main's pre-type thorax (5 mm): on the Butterfly default's
  // 7.09 mm its hindwing silhouette dips 0.0039 mm inside the outline (E7),
  // PRE-EXISTING on main's own geometry at that body and flickering with the
  // thorax (0.001-0.034 mm over 5.5-7.5 mm) — HOLES + the junction blend, not
  // the body types (bug-project-design-doc.md §17.8)
  for (const name of ['falcate', 'notched', 'strap']) { const p = d(); p.venation = 'holes'; p.wingPairs = 2; p.wings.first.points = HAND_OUTLINES[name]; p.wings.first.length = 36; p.wings.first.stretch = 1.3; if (name === 'strap') { p.thoraxLength = 5; p.bodyType = 'custom'; p.bodyRatios = null; } rows.push([`holes: drawn:${name}`, p, {}]); }
  // JUNCTION rows (design doc §16): the blend off (the old root, bit for bit
  // — JB is not asked of it), the radius ladder on the default, the junction
  // fixture (a hindwing root the old code refused) at the default radius, the
  // largest radius in HOLES, 4 pairs, and a drawn wing with a tail
  { const p = d(); p.wingJunction = 0; rows.push(['junction 0 (blend off: the old root)', p, {}]); }
  for (const r of [0.5, 2, 3]) { const p = d(); p.wingJunction = r; rows.push([`junction ${r} mm`, p, {}]); }
  rows.push(['junction fixture: #20/#31 root at the default blend', junctionFixture(), {}]);
  { const p = d(); p.venation = 'holes'; p.wingJunction = 3; rows.push(['holes, junction 3 mm', p, {}]); }
  { const p = d(); p.wingPairs = 4; p.wingJunction = 2; rows.push(['4 pairs, junction 2 mm', p, {}]); }
  // (the hindwing is the tail rows' own 30 mm x 1.4 one: on the DEFAULT
  // hindwing at this pinned sweep the tail tip leaves the one-pixel cut-safe
  // island TAIL_ROW_SWEEP's note describes — measured identical with the blend
  // off and on main's own code, so it is not the junction's)
  { const p = d(); p.wings.first.points = HAND_OUTLINES.swallowtail; p.wings.first.sweep = TAIL_ROW_SWEEP; p.wings.tail.on = true; p.wings.last.length = 30; p.wings.last.stretch = 1.4; p.wingJunction = 2; rows.push(['drawn swallowtail + tail, junction 2 mm', p, {}]); }
  return rows;
}

if (NEG) {
  const base = G.buildBug(G.defaultParams());
  const tuckP = G.defaultParams(); tuckP.legReach = 0;
  const tuck = G.buildBug(tuckP);
  const t4 = G.defaultParams(); t4.wingPairs = 4; t4.wings.tail.on = true; t4.wings.first.sweep = TAIL_ROW_SWEEP;
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
  const tailVeinP = G.defaultParams(); tailVeinP.venation = 'ridges'; tailVeinP.wings.first.points = HAND_OUTLINES.swallowtail; tailVeinP.wings.first.sweep = TAIL_ROW_SWEEP; tailVeinP.wings.tail.on = true; tailVeinP.wings.last.length = 30; tailVeinP.wings.last.stretch = 1.4;
  const tailVeinModel = G.buildBug(tailVeinP);
  const specModel = G.buildBug(G.specimenPose(G.defaultParams()).params);
  // the first cut's clamp: a forewing that needs a sweep past the old slider's −30
  // (random:70 needs −38.6°; it was random:6 at −43° until the whole-bug
  // Randomize took its wings from the library, §13, and random:6 stopped needing it)
  const CLAMP_SEED = 70;
  const clampP = (() => { const p = G.randomParams(CLAMP_SEED); if (!p.wingPairs) { p.bodyParts = '3'; p.wingPairs = 2; } const q = G.specimenPose(p).params; q.wings.first.sweep = Math.max(-30, q.wings.first.sweep); return q; })();
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
  // the rounded edge (§10): mutate the EMITTED bead rings of the right
  // forewing (and their mirror twins, so M stays clean)
  const beadMut = (m, pick, fn) => {
    const R = m.parts.find((q) => q.kind === 'wing1' && q.side === 'R'), L = m.parts.find((q) => q.kind === 'wing1' && q.side === 'L');
    const P = m.positions, V = (v) => [P[3 * v], P[3 * v + 1], P[3 * v + 2]], B = R.meta.bead;
    for (const r of B.rings.filter(pick)) {
      const ids = r.ids, top = V(ids[0]), bot = V(ids[B.K]), M = top.map((x, d) => (x + bot[d]) / 2);
      const Vv = top.map((x, d) => x - M[d]), Dv = V(ids[B.K / 2]).map((x, d) => x - M[d]);
      ids.forEach((v, j) => { const nt = fn(j, B.K, M, Vv, Dv, V(v)); if (!nt) return; const lv = v - R.v0 + L.v0; for (let d = 0; d < 3; d++) P[3 * v + d] = nt[d]; P[3 * lv] = -nt[0]; P[3 * lv + 1] = nt[1]; P[3 * lv + 2] = nt[2]; });
    }
  };
  const along = (r) => r.apex[0] > 8 && r.apex[0] < 30;          // a stretch of the outer margin, clear of the root
  const holeRim = (m) => { const R = m.parts.find((q) => q.kind === 'wing1' && q.side === 'R'); const h = R.meta.venation.cells.find((c) => c.holes.length).holes[0]; const keys = new Set(h.map((q) => `${q[0]},${q[1]}`)); return (r) => keys.has(`${r.apex[0]},${r.apex[1]}`); };
  const square0 = G.defaultParams(); square0.wingEdgeRound = 0; const squareModel = G.buildBug(square0);
  const holesRound = G.buildBug(holesP);
  const muts = [
    ['a bead flattened into a square wall', 'E3', base, {}, (m) => beadMut(m, along, (j, K, M, V) => { const t = (Math.PI * j) / K; return M.map((x, d) => x + Math.cos(t) * V[d]); })],
    ['a bead dented (not a half ellipse)', 'E1', base, {}, (m) => beadMut(m, along, (j, K, M, V, D) => (j === 1 ? M.map((x, d) => x + 0.2 * D[d] + Math.cos(Math.PI / K) * V[d]) : null))],
    ['a bead thinned under the floor', 'E5', base, {}, (m) => beadMut(m, along, (j, K, M, V, D) => { const t = (Math.PI * j) / K; return M.map((x, d) => x + Math.sin(t) * D[d] + 0.4 * Math.cos(t) * V[d]); })],
    ['the silhouette pushed out past the outline', 'E7', base, {}, (m) => beadMut(m, along, (j, K, M, V, D) => { const t = (Math.PI * j) / K, f = 1 + 0.4 * Math.sin(t); return M.map((x, d) => x + f * Math.sin(t) * D[d] + Math.cos(t) * V[d]); })],
    ['a hole rim left square (not rounded)', 'E4', holesRound, {}, (m) => { const R = m.parts.find((q) => q.kind === 'wing1' && q.side === 'R'); const pick = holeRim(m); beadMut(m, pick, (j, K, M, V) => { const t = (Math.PI * j) / K; return M.map((x, d) => x + Math.cos(t) * V[d]); }); R.meta.bead = { ...R.meta.bead, rings: R.meta.bead.rings.filter((r) => !pick(r)) }; }],
    ['square walls under a round asked for', 'E2', squareModel, {}, (m) => { m.params = { ...m.params, wingEdgeRound: 1 }; }],
    ['a top-skin triangle flipped by the inset', 'E6', base, {}, (m) => { for (const side of ['R', 'L']) { const q = m.parts.find((x) => x.kind === 'wing1' && x.side === side); const r = m.parts.find((x) => x.kind === 'wing1' && x.side === 'R').meta.bead.rings.find(along); const v = q.v0 + r.i; m.positions[3 * v + 1] += 4; } }],
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
    // J: a zig-zag laid along the forewing's margin (0.2 mm either side every
    // 0.4 mm of outline: finer than the 1 mm floor, coarser than the measure's
    // smoothing) — a jagged fit, which no other clause sees
    ['a jagged outline', 'J', base, {}, (m) => { const p = m.parts.find((q) => q.kind === 'wing1' && q.side === 'R'); const pl = p.meta.drawnMm.map((q) => q.slice()); const n = pl.length, mid = Math.floor(n / 2); const out = []; for (let i = 0; i < n; i++) { out.push(pl[i]); if (i >= mid - 12 && i < mid + 12 && i + 1 < n) { const A = pl[i], B = pl[i + 1], L = Math.hypot(B[0] - A[0], B[1] - A[1]), k = Math.max(1, Math.round(L / 0.4)); const nx = -(B[1] - A[1]) / L, ny = (B[0] - A[0]) / L; for (let t = 1; t < k; t++) { const z = (out.length % 2 ? 0.2 : -0.2); out.push([A[0] + ((B[0] - A[0]) * t) / k + nx * z, A[1] + ((B[1] - A[1]) * t) / k + ny * z]); } } } p.meta.drawnMm = out; }],
    ['cross a planform', 'O', base, {}, (m) => { const p = m.parts.find((q) => q.kind === 'wing1' && q.side === 'R'); const pl = p.meta.planform.map((q) => q.slice()); const a = 10, b = pl.length - 12; [pl[a], pl[b]] = [pl[b], pl[a]]; p.meta.planform = pl; }],
    ['fold a wing top face (hairline)', 'S', base, {}, (m) => {
      // the INTERIOR top-face vertex nearest the wing's centroid (the top face
      // is the slab's first meta.slab.n vertices; a rim vertex only reshapes
      // the outline) pushed past its farthest neighbour, on BOTH sides (so M
      // stays clean): its facets fold back -> an interior loop. (It used to
      // take half the part's vertices as the top face and push the nearest
      // one 3 mm along y — right by luck of the vertex it landed on, and
      // silent once the root pinch moved the centroid.)
      const P = m.positions;
      for (const side of ['R', 'L']) {
        const p = m.parts.find((q) => q.kind === 'wing1' && q.side === side), nTop = p.meta.slab.n;
        const rim = new Set(); for (const [t] of [...p.meta.edgePairs.outline, ...p.meta.edgePairs.other]) rim.add(t);
        let cx = 0, cy = 0; for (let v = p.v0; v < p.v0 + nTop; v++) { cx += P[3 * v] / nTop; cy += P[3 * v + 1] / nTop; }
        let best = -1, bd = Infinity;
        for (let v = p.v0; v < p.v0 + nTop; v++) { if (rim.has(v)) continue; const d = Math.hypot(P[3 * v] - cx, P[3 * v + 1] - cy); if (d < bd) { bd = d; best = v; } }
        let far = -1, fd = -1;
        for (let t = p.t0; t < p.t1; t++) { const tr = [0, 1, 2].map((k) => m.indices[3 * t + k]); if (!tr.includes(best)) continue; for (const v of tr) if (v !== best) { const d = Math.hypot(P[3 * v] - P[3 * best], P[3 * v + 1] - P[3 * best + 1]); if (d > fd) { fd = d; far = v; } } }
        P[3 * best] += 2 * (P[3 * far] - P[3 * best]); P[3 * best + 1] += 2 * (P[3 * far + 1] - P[3 * best + 1]);
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
    [`the pose clamps at the old -30° bound (random:${CLAMP_SEED})`, 'Y', clampModel, { specimen: true }, () => {}],
    // (the margin is read off the bead apexes now: the mutation shears the
    // forewing's outer half back 1.5 mm, rings and all)
    ['the forewing margin not square to the body', 'Y', specModel, { specimen: true }, (m) => { for (const side of ['R', 'L']) { const q = m.parts.find((x) => x.kind === 'wing1' && x.side === side); for (let v = q.v0; v < q.v1; v++) if (Math.abs(m.positions[3 * v]) > 12) m.positions[3 * v + 1] += 1.5; } }],
  ];
  const clean = [check('default (clean)', base), check('square edge, round 0 (clean)', squareModel), check('holes, rounded (clean)', holesRound), check('default tucked (clean)', tuck, { tucked: true }), check('tail ON 4 pairs (clean)', tail4on, { tailIso: tail4off }), check('thin tail (clean: refused)', thinModel, { expectThin: true }), check('blended thin (clean: refused)', blendedModel, { expectBlended: true }),
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
  // Q — the on-wing editor's frame, broken three ways the page could break it
  const qmuts = [
    ['the editor ignores the stretch', { frame: (p, k) => { const F = G.editorFrame(p, k); return { ...F, fromWorld: (x, y) => { const [u, w] = F.fromWorld(x, y); return [u, w * F.stretch]; }, toWorld: (u, w) => F.toWorld(u, w / F.stretch) }; } }],
    ['the editor turns the sweep the wrong way', { frame: (p, k) => { const q = JSON.parse(JSON.stringify(p)); for (const w of [q.wings.first, q.wings.last, ...Object.values(q.wings.unlinked)]) w.sweep = -w.sweep; return G.editorFrame(q, k); } }],
    ['the edited wing is not displayed flat', { notFlat: true }],
  ];
  for (const [name, mut] of qmuts) {
    const r = qCheck(qCases(), mut), fired = r.bad.some((b) => b.startsWith('Q:'));
    console.log(`${fired ? 'CAUGHT' : 'MISSED'} ${name.padEnd(32)} by Q  — ${r.bad.slice(0, 2).join(' | ') || 'nothing fired'}`);
    if (!fired) ok = false;
  }
  // IM — code mutants of bug-image.js, each a copy written beside it (it
  // imports './bug-geometry.js') and imported; every anchor is checked FIRST
  {
    const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const src = fs.readFileSync(path.join(ROOT, 'bug-image.js'), 'utf8');
    const edits = (m) => [[m[1], m[2]], ...(m[4] || [])];
    const anchored = (m) => edits(m).every(([from]) => src.split(from).length - 1 === 1);
    for (const m of IMAGE_MUTANTS) for (const [from] of edits(m)) {
      const n = src.split(from).length - 1;
      if (n !== 1) { console.log(`ANCHOR ${m[0]}: "${from.slice(0, 50)}" matches ${n} times (must be exactly 1) — the mutant is disarmed`); ok = false; }
    }
    const cleanIm = imageChecks(IMG).checks.filter(([c]) => !c);
    console.log(cleanIm.length ? `IM clean run FAILED: ${cleanIm.map(([, m]) => m).join(' | ')}` : 'IM clean run: every check passes');
    if (cleanIm.length) ok = false;
    let k = 0;
    for (const m of IMAGE_MUTANTS) {
      const [name, , , clause] = m;
      if (!anchored(m)) continue;
      const file = path.join(ROOT, `.bug-image.mutant-${process.pid}-${k++}.mjs`);
      fs.writeFileSync(file, edits(m).reduce((t, [from, to]) => t.replace(from, to), src));
      let fails = [];
      try { const M = await import(pathToFileURL(file).href); fails = imageChecks(M).checks.filter(([c]) => !c).map(([, m]) => m); }
      catch (e) { fails = [`(threw) ${e.message}`]; }
      finally { fs.unlinkSync(file); }
      const fired = fails.some((f) => f.startsWith(clause + ':'));
      console.log(`${fired ? 'CAUGHT' : 'MISSED'} ${name.padEnd(32)} by ${clause}  — ${fails.slice(0, 2).join(' | ') || 'nothing fired'}`);
      if (!fired) ok = false;
    }
  }
  // LB — code mutants of bug-geometry.js (the wing-shape library's apply /
  // blend / randomize), each a copy written beside it (it imports
  // './bug-venation.js' and './bug-wing-library.js') and imported; every anchor
  // is checked FIRST; plus one DATA mutant (a library shape that crosses itself)
  {
    const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const src = fs.readFileSync(path.join(ROOT, 'bug-geometry.js'), 'utf8');
    for (const [name, from] of [...LIBRARY_MUTANTS, ...ANGLE_MUTANTS]) { const n = src.split(from).length - 1; if (n !== 1) { console.log(`ANCHOR ${name}: "${from.slice(0, 50)}" matches ${n} times (must be exactly 1) — the mutant is disarmed`); ok = false; } }
    const cleanLb = [...libraryChecks(G), ...angleChecks(G)].filter(([c]) => !c);
    console.log(cleanLb.length ? `LB clean run FAILED: ${cleanLb.map(([, m]) => m).join(' | ')}` : 'LB clean run: every check passes');
    if (cleanLb.length) ok = false;
    let k = 0;
    for (const [name, from, to, clause] of [...LIBRARY_MUTANTS, ...ANGLE_MUTANTS]) {
      if (src.split(from).length - 1 !== 1) continue;
      const lbOpts = { lb7: clause === 'LB7' };   // LB7 only where it is the clause named (cost; see libraryChecks)
      const file = path.join(ROOT, `.bug-geometry.mutant-${process.pid}-${k++}.mjs`);
      fs.writeFileSync(file, src.replace(from, to));
      let fails = [];
      try { const M = await import(pathToFileURL(file).href); const run = (f) => { try { return f(M).filter(([c]) => !c).map(([, m]) => m); } catch (e) { return [`(threw) ${e.message}`]; } };
        fails = [...run((X) => libraryChecks(X, lbOpts)), ...run(angleChecks)]; }
      catch (e) { fails = [`(threw) ${e.message}`]; }
      finally { fs.unlinkSync(file); }
      const fired = fails.some((f) => f.startsWith(clause + ':'));
      console.log(`${fired ? 'CAUGHT' : 'MISSED'} ${name.padEnd(32)} by ${clause}  — ${fails.slice(0, 2).join(' | ').slice(0, 300) || 'nothing fired'}`);
      if (!fired) ok = false;
    }
    // a library shape whose forewing crosses itself (two interior points swapped)
    const lib = JSON.parse(JSON.stringify(G.WING_LIBRARY)), f = lib[4].fore.points; [f[3], f[f.length - 4]] = [f[f.length - 4], f[3]];
    const fails = libraryChecks({ ...G, WING_LIBRARY: lib }, { lb7: false }).filter(([c]) => !c).map(([, m]) => m), fired = fails.some((x) => x.startsWith('LB1:'));
    console.log(`${fired ? 'CAUGHT' : 'MISSED'} ${'a library shape crosses itself'.padEnd(32)} by LB1  — ${fails.slice(0, 1).join(' | ').slice(0, 300) || 'nothing fired'}`);
    if (!fired) ok = false;
    // the stored wing angles ZEROED (a library that forgot where its wings were found)
    { const lib0 = JSON.parse(JSON.stringify(G.WING_LIBRARY)); for (const s of lib0) { s.fore.sweep = 0; s.hind.sweep = 0; }
      const f0 = angleChecks({ ...G, WING_LIBRARY: lib0 }).filter(([c]) => !c).map(([, m]) => m), fired0 = f0.some((x) => x.startsWith('WA1:')) && f0.some((x) => x.startsWith('WA2:'));
      console.log(`${fired0 ? 'CAUGHT' : 'MISSED'} ${'the stored angles are zeroed'.padEnd(32)} by WA1+WA2  — ${f0.slice(0, 2).join(' | ').slice(0, 300) || 'nothing fired'}`);
      if (!fired0) ok = false; }
    // a three-pair entry whose MIDDLE pair's stored angle is zeroed (the fixture, damaged)
    { const fx = JSON.parse(JSON.stringify(THREE_PAIR_SHAPE)); fx.pairs[1].sweep = 0;
      const f1 = libraryChecks(G, { lb7: false, fixture: fx }).filter(([c]) => !c).map(([, m]) => m), fired1 = f1.some((x) => x.startsWith('LB8:'));
      console.log(`${fired1 ? 'CAUGHT' : 'MISSED'} ${'a three-pair middle angle is zeroed'.padEnd(32)} by LB8  — ${f1.slice(0, 1).join(' | ').slice(0, 300) || 'nothing fired'}`);
      if (!fired1) ok = false; }
  }
  // BP — code mutants of bug-geometry.js (body types, §17), each a copy written
  // beside it and imported, run through the ONE clause it names (every anchor
  // checked FIRST; the clean module must pass every clause)
  {
    const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const src = fs.readFileSync(path.join(ROOT, 'bug-geometry.js'), 'utf8');
    for (const [name, from] of BODY_MUTANTS) { const n = src.split(from).length - 1; if (n !== 1) { console.log(`ANCHOR ${name}: "${from.slice(0, 50)}" matches ${n} times (must be exactly 1) — the mutant is disarmed`); ok = false; } }
    const cleanBp = bodyChecks(G).filter(([c]) => !c);
    console.log(cleanBp.length ? `BP clean run FAILED: ${cleanBp.map(([, m]) => m).join(' | ')}` : 'BP clean run: every check passes');
    if (cleanBp.length) ok = false;
    let k = 0;
    for (const [name, from, to, clause] of BODY_MUTANTS) {
      if (src.split(from).length - 1 !== 1) continue;
      const file = path.join(ROOT, `.bug-geometry.bodymutant-${process.pid}-${k++}.mjs`);
      fs.writeFileSync(file, src.replace(from, to));
      let fails = [];
      try { const M = await import(pathToFileURL(file).href); fails = bodyChecks(M, { only: clause }).filter(([c]) => !c).map(([, m]) => m); }
      catch (e) { fails = [`(threw) ${e.message}`]; }
      finally { fs.unlinkSync(file); }
      const fired = fails.some((f) => f.startsWith(clause + ':'));
      console.log(`${fired ? 'CAUGHT' : 'MISSED'} ${name.padEnd(32)} by ${clause}  — ${fails.slice(0, 2).join(' | ').slice(0, 300) || 'nothing fired'}`);
      if (!fired) ok = false;
    }
  }
  // ROW mutants of bug-geometry.js (§15.2, §15.3): the builder fixes undone,
  // each a copy written beside it and imported; the fixture row is BUILT by the
  // mutated module and run through this file's own row clauses, which must name
  // the defect (every anchor checked first; the clean module must pass the row)
  {
    const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const src = fs.readFileSync(path.join(ROOT, 'bug-geometry.js'), 'utf8');
    const OLD_CORE = `  const outside = new Uint8Array(nx * ny); for (let i = 0; i < outside.length; i++) outside[i] = inside[i] ? 0 : 1;
  const dOut = edt2(outside, nx, ny);
  const core = new Uint8Array(nx * ny);
  const r2 = (r / h) ** 2;
  for (let i = 0; i < core.length; i++) core[i] = inside[i] && dOut[i] >= r2 ? 1 : 0;
  if (0) {`;
    const ROW_MUTANTS = [
      ['the disc test reads a pixel distance again', '  const core = new Uint8Array(nx * ny);\n  const r2 = (r / h) ** 2;\n  {', OLD_CORE, 'N', rootUnderFloor, { expectThin: true }],
      ['a pitched bead is sized in the planform', 'const kPitch = spec.pitch ? Math.abs((spec.pitch * D2R) / span) : 0;', 'const kPitch = 0;', 'E1', pitchedBeadHoles, {}],
      // the junction blend (design doc §16): on the fixture whose hindwing root
      // is under the floor, the blend switched off must leave a SLOT and a NECK
      // (JB1+JB2 both fire), and its tabs show (JB3); the burial switched off
      // alone leaves the tabs showing through the body and nothing else
      ['the junction blend is never built', 'const junction = p.wingJunction > 0 && pairs.length ? junctionFor(p, L, pairs, hinges) : null;', 'const junction = null;', 'JB1+JB2+JB3', junctionFixture, {}],
      ['the buried part is not buried', '  const bury = J ? (u, w, Hh) => {', '  const bury = J ? (u, w, Hh) => { return null;', 'JB3', junctionFixture, {}],
      // JB3's other arm: at a 2 mm floor the default abdomen (1.74 mm) is
      // thinner than the floor, so the sheet sits centred and stands out by half
      // the difference; stepping the hindwing down the full pair step regardless
      // of the room the body has puts it 0.3 mm further out than that
      ['a later pair is stepped down past the body', 'zT = -Math.min(room, spec.index * BURY_PAIR_STEP_MM);', 'zT = -spec.index * BURY_PAIR_STEP_MM;', 'JB3', () => ({ ...G.defaultParams(), minDiameter: 2 }), {}],
    ];
    for (const [name, from] of ROW_MUTANTS) { const n = src.split(from).length - 1; if (n !== 1) { console.log(`ANCHOR ${name}: "${from.slice(0, 50)}" matches ${n} times (must be exactly 1) — the mutant is disarmed`); ok = false; } }
    for (const [name, , , , fx, opts] of ROW_MUTANTS) { const r = check(`${name} (clean)`, G.buildBug(fx()), opts); console.log(fmt(r)); for (const x of r.fails) console.log('     ' + x); if (r.fails.length) ok = false; }
    let k = 0;
    for (const [name, from, to, clause, fx, opts] of ROW_MUTANTS) {
      if (src.split(from).length - 1 !== 1) continue;
      const file = path.join(ROOT, `.bug-geometry.rowmutant-${process.pid}-${k++}.mjs`);
      fs.writeFileSync(file, src.replace(from, to));
      let fails = [];
      try { const M = await import(pathToFileURL(file).href); fails = check(name, M.buildBug(fx()), opts).fails; }
      catch (e) { fails = [`(threw) ${e.message}`]; }
      finally { fs.unlinkSync(file); }
      const fired = clause.split('+').every((c) => fails.some((f) => f.startsWith(c + ':')));
      console.log(`${fired ? 'CAUGHT' : 'MISSED'} ${name.padEnd(32)} by ${clause}  — ${fails.slice(0, 2).join(' | ').slice(0, 300) || 'nothing fired'}`);
      if (!fired) ok = false;
    }
  }
  const splayP = G.defaultParams(); splayP.legReach = 1;              // the default is tucked now: splay it explicitly
  const splay = legExposure(G.buildBug(splayP));
  const lfires = !(splay.outside <= 0.02 * splay.area);
  console.log(`${lfires ? 'CAUGHT' : 'MISSED'} L at reach 1 (splayed legs must read as showing): ${splay.outside.toFixed(2)} of ${splay.area.toFixed(2)} mm² outside`);
  if (!lfires) ok = false;
  console.log(ok ? '\nNEGATIVE CONTROL PASS — every mutation caught by the clause that names it.' : '\nNEGATIVE CONTROL FAIL');
  process.exit(ok ? 0 : 1);
}

/* --rows <file.json>: [[label, params], ...] built through every row clause
   and NOTHING else (no function checks, no fixture rows) — the wing-angle
   sweep's instrument (tools/bug-wing-angles.mjs). Never a gate pass. */
const rowsArg = args.indexOf('--rows');
if (rowsArg >= 0) {
  let bad = 0; const list = JSON.parse(fs.readFileSync(args[rowsArg + 1], 'utf8'));
  for (const [label, params, opts = {}] of list) {
    let r; try { r = check(label, G.buildBug(params), opts); } catch (e) { r = { label, fails: [`THROW: ${e.message}`] }; }
    console.log(`${r.fails.length ? 'FAIL' : 'ok  '} ${label}`); for (const f of r.fails) console.log('     ' + f);
    if (r.fails.length) bad++;
  }
  console.log(`ROWS: ${list.length - bad}/${list.length} pass — not a gate pass`);
  process.exit(bad ? 1 : 0);
}

let failed = 0;
const fc = functionChecks();
for (const [c, msg] of fc) { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) failed++; }
const im = imageChecks(IMG);
for (const [c, msg] of im.checks) { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) failed++; }
fc.push(...im.checks);
const lb = [...libraryChecks(G), ...angleChecks(G)];
for (const [c, msg] of lb) { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) failed++; }
fc.push(...lb);
const bp = bodyChecks(G);
for (const [c, msg] of bp) { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) failed++; }
fc.push(...bp);
const rows = [...rowsFor(NSEEDS), ...imageRows(im.results), ...libraryRows(G), ...angleRows(G), ...bodyRows(G)].filter(([label]) => !ONLY || ONLY.test(label));
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
console.log(failed ? 'VERDICT: FAIL' : ONLY ? `VERDICT: SUBSET PASS (--only ${ONLY}) — not a gate pass` : 'VERDICT: PASS');
process.exit(failed ? 1 : 0);
