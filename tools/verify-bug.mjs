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

   --negative-control  breaks built models thirteen ways (plus the L clause at reach 1) and requires each to be
                       caught by the clause that names it.
   --seeds N           number of random bugs (default 40). */

import * as G from '../bug-geometry.js';
import { HAND_OUTLINES, CROSSING_BLEND, THIN_TAIL, blendedThin } from './bug-fixtures.mjs';

const args = process.argv.slice(2);
const NEG = args.includes('--negative-control');
const seedsArg = args.indexOf('--seeds');
const NSEEDS = seedsArg >= 0 ? +args[seedsArg + 1] : 40;

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
  let tubeMin = Infinity, thickMin = Infinity, waistMin = Infinity; const bad = [];
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
    for (const [a, b] of part.meta.thickPairs || []) thickMin = Math.min(thickMin, Math.hypot(P[3 * a] - P[3 * b], P[3 * a + 1] - P[3 * b + 1], P[3 * a + 2] - P[3 * b + 2]));
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
  return { tubeMin, thickMin, waistMin, bad };
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
  let stray = 0;
  for (const part of model.parts.filter((q) => /^wing\d$|^tail$/.test(q.kind))) {
    const L = G.contourLoops(model, part);
    if (L.length < 2) continue;
    const big = L.reduce((a, l) => (l.length > a.length ? l : a));
    for (const l of L) if (l !== big) for (const [x, y] of l) {
      let d = Infinity; for (const [bx, by] of big) d = Math.min(d, Math.hypot(x - bx, y - by));
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
    const builderThin = model.floorViolations.some((v) => `wing${v.pair + 1}` === part.kind);
    if (depth > tau + 2 * h) { gateThin = true; if (!builderThin) bad.push(`${part.name}: thin by this file's measure (${depth.toFixed(2)} mm past the floor disc) and NOT reported by the builder`); }
    else if (depth < tau - 2 * h) { if (builderThin) bad.push(`${part.name}: reported thin by the builder, clear by this file's measure (${depth.toFixed(2)} mm)`); }
    else border = true;
  }
  let refused = false, reason = '';
  try { G.exportStl(model); } catch (e) { refused = e instanceof G.FloorError; reason = e.message; if (!refused) throw e; }
  if (gateThin && !refused) bad.push('the STL exported although a drawn outline is narrower than the floor');
  if (refused !== model.floorViolations.length > 0) bad.push(`the STL ${refused ? 'was refused' : 'exported'} while the model reports ${model.floorViolations.length} floor violation(s)`);
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
  return { label, fails, md, stl, cn, mf, sv, rc, le, fc, notes: model.notes };
}

function fmt(r) {
  const f = (x) => (Number.isFinite(x) ? x.toFixed(3) : '  — ');
  return `${r.fails.length ? 'FAIL' : 'ok  '} ${r.label.padEnd(26)} tris=${String(r.stl.triangles).padStart(6)} stl=${(r.stl.bytes / 1024).toFixed(0).padStart(5)}KiB `
    + `mirror=${r.md} boundary=${r.stl.boundary} nonManifold(unrated)=${r.stl.nonManifold} regions=${r.cn.comps} `
    + `minTube=${f(r.mf.tubeMin)} minThick=${f(r.mf.thickMin)} waist=${f(r.mf.waistMin)} roots=${r.rc.roots.length}${r.rc.roots.length > 1 ? `@${f(r.rc.minGap)}mm` : ''} cutRegions=${r.sv.regions}`
    + ` floor=${r.fc.refused ? 'STL-REFUSED' : 'ok'}(${r.fc.worst.toFixed(2)}mm${r.fc.border ? ',borderline' : ''})`
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
  ];
  const clean = [check('default (clean)', base), check('default tucked (clean)', tuck, { tucked: true }), check('tail ON 4 pairs (clean)', tail4on, { tailIso: tail4off }), check('thin tail (clean: refused)', thinModel, { expectThin: true }), check('blended thin (clean: refused)', blendedModel, { expectBlended: true })];
  let ok = clean.every((r) => !r.fails.length);
  for (const r of clean) console.log(fmt(r));
  for (const [name, clause, src, opts, fn] of muts) {
    const m = clone(src); fn(m);
    const r = check(name, m, opts);
    const fired = r.fails.some((f) => f.startsWith(clause + ':'));
    console.log(`${fired ? 'CAUGHT' : 'MISSED'} ${name.padEnd(32)} by ${clause}  — ${r.fails.join(' | ') || 'nothing fired'}`);
    if (!fired) ok = false;
  }
  const splay = legExposure(base);
  const lfires = !(splay.outside <= 0.02 * splay.area);
  console.log(`${lfires ? 'CAUGHT' : 'MISSED'} L at reach 1 (splayed legs must read as showing): ${splay.outside.toFixed(2)} of ${splay.area.toFixed(2)} mm² outside`);
  if (!lfires) ok = false;
  console.log(ok ? '\nNEGATIVE CONTROL PASS — every mutation caught by the clause that names it.' : '\nNEGATIVE CONTROL FAIL');
  process.exit(ok ? 0 : 1);
}

let failed = 0;
const fc = functionChecks();
for (const [c, msg] of fc) { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) failed++; }
const rows = rowsFor(NSEEDS);
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
