#!/usr/bin/env node
/* verify-tile.mjs — the /tile gate (tile-design-doc.md §9). Node only.

   Rows: every hand-drawn tile in tools/tile-fixtures.mjs, N seeded random
   tiles, and parameter rows (unequal round counts and sheets, a thin print, a
   deep dough, small rollers, two refusals). For each, through the SHIPPED
   modules:

     T  TESSELLATION, by this file's own geometry. T1 the outline is simple
        (this file's segment test, not the builder's); T2 its signed area is
        |tA × tB| (1e-9 relative) and the nine tiles of the 3x3 patch sum to 9×;
        T3 a scanline census over the patch finds no x-run covered twice (no
        overlap); T4 a probe 1 µm outside every boundary segment of the centre
        tile lands in exactly one neighbour and 1 µm inside lands in the centre
        tile only (no gap); T5 the top is the bottom + tB and the right the left
        + tA (1e-12).
     D  DIRECTION — every blade is a RING running AROUND its roller, never a
        bar running along it (Eva's ruling), read off the MESH: D1 each blade's
        tip edges cover every azimuth (the union of their angular spans is the
        whole circle); D2 each blade's axial extent is its line's own extent
        ACROSS the line (this file's projection of the edge on the axis) plus
        the root width — a bar running along the roller is a pitch or more
        long; D3 the blades are spaced along the axis by the perpendicular
        distance between neighbouring lines, |tA × tB| / |chord| (θ counted),
        and there are cookies + 1 of them.
     S  SEAM. Both rollers rolled three revolutions either way in tile-sim.js:
        S1 every corner of every stamped line lands on a lattice point (1e-6
        mm), all of one row (A) or column (B); S2 the rows (A) are 0..rows and
        the columns (B) 0..cols, each exactly once, every ring gaining exactly
        one period of travel per time round (it closes on itself round the
        roller, once); S3 every stamped line is the ideal line of its row or
        column, both ways, over every revolution boundary — the seam; S4 every
        blade's mesh is a closed tube round the roller (a torus: V − E + F = 0)
        whose tip face hugs its spec ring all the way round, seam included.
     R  REGISTRATION. R0 the mesh is the spec: every spec ring point has blade
        tip beside it; every peg and tooth cone is centred on its spec point.
        R1 the rolling radius read off the mesh is the blade tips' (the blades
        touch the board; nothing stands proud of them). R2 the track: A's
        slanted peg row lays one dimple on each corner (m*, k), k = 0..rows.
        R3 B, posed by seating one collar tooth in the first dimple and rolled
        both ways: every tooth that lands on the track lands in a dimple, and
        every dimple gets a tooth; and seated by a DIFFERENT tooth in a
        DIFFERENT dimple it stamps the same lines — one seat fixes both of B's
        free placements. R4 every corner of the cookie sheet lies on its A line
        and its B line (1e-6 mm). R5 the sheet's A and B lines meet at lattice
        corners only, (cols+1)(rows+1) of them.
     W  WATERTIGHT. Each STL (A, B, handle) re-welded from its float32 bytes:
        no unmatched and no duplicated DIRECTED edge (an undirected census passes
        a face wound inside out), no degenerate triangle; every shell's signed
        volume positive. W5 a design whose blade cannot clear the dough, or
        whose roller cannot hold its bore, is REFUSED an STL, with the reason.
     H  HEIGHTS, measured off the mesh. H1 blade height > dough + 1.5 mm;
        H2 peg and tooth tips inside the dough and above the board, the tooth
        shallower than the peg; H3 the collar band above the dough; H4 every
        cone founded in the body.
     F  FLAGS. Each fixture's neck / spike / close-point flags are exactly the
        ones it expects; A's peg row's second pass is flagged iff the
        simulation lands a dimple on a cookie corner.

   And, once, pure-function checks of the editor (E): INVALID tiles refused and
   really crossing (this file's test); a drag into a crossing BLOCKED with the
   tile unchanged; moves, inserts, deletes and toggles land; a corner cannot be
   deleted; a corner resize keeps θ and lands the corner at the pointer; a smooth
   corner's line is C1 there (its turn shrinks with the sampling) and a sharp one
   kinks; a saved tile round-trips.

   --negative-control  writes mutated copies of the modules into
                       .tile-mutant-<pid>-<k>/ and requires each mutation to be
                       caught by the clause that names it. Every anchor is
                       checked FIRST.
   --seeds N           random tiles (default 12)
   --only <regex>      rows whose label matches (a SUBSET, never a gate pass)
   --mutant <regex>    with --negative-control: only the mutations whose name
                       matches (every anchor is still checked; a SUBSET)
   --verbose           print every row's measured heights and errors (the
                       default fixture always prints them)
   --browser           also drive the page (tools/verify-tile-page.mjs) */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { FIXTURES, INVALID, randomTile } from './tile-fixtures.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const NEG = args.includes('--negative-control');
const seedsArg = args.indexOf('--seeds');
const NSEEDS = seedsArg >= 0 ? +args[seedsArg + 1] : 12;
const onlyArg = args.indexOf('--only');
const ONLY = onlyArg >= 0 ? new RegExp(args[onlyArg + 1]) : null;
const mutArg = args.indexOf('--mutant');
const MUT = mutArg >= 0 ? new RegExp(args[mutArg + 1]) : null;
const TOL = 1e-6;

async function load(dir) {
  const u = (f) => pathToFileURL(path.join(dir, f)).href;
  return { G: await import(u('tile-geometry.js')), RL: await import(u('tile-roller.js')), S: await import(u('tile-sim.js')) };
}

/* ---------------- this file's own 2D geometry ---------------- */
const orient = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
function segsMeet(a, b, c, d) {
  const d1 = orient(c, d, a), d2 = orient(c, d, b), d3 = orient(a, b, c), d4 = orient(a, b, d);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  const on = (p, q, r) => Math.min(p[0], q[0]) <= r[0] && r[0] <= Math.max(p[0], q[0]) && Math.min(p[1], q[1]) <= r[1] && r[1] <= Math.max(p[1], q[1]);
  return (d1 === 0 && on(c, d, a)) || (d2 === 0 && on(c, d, b)) || (d3 === 0 && on(a, b, c)) || (d4 === 0 && on(a, b, d));
}
/* simple: no two non-adjacent edges meet (touching counts) */
function ownSimple(poly) {
  const n = poly.length;
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;
    if (segsMeet(poly[i], poly[(i + 1) % n], poly[j], poly[(j + 1) % n])) return false;
  }
  return true;
}
const shoelace = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - a[1] * b[0]; } return s / 2; };
function inside(poly, q) {                       // even-odd (the tiles are simple)
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < ((b[0] - a[0]) * (q[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
function spans(poly, y) {
  const xs = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if ((a[1] <= y) !== (b[1] <= y)) xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
  }
  xs.sort((p, q) => p - q);
  const out = []; for (let k = 0; k + 1 < xs.length; k += 2) out.push([xs[k], xs[k + 1]]);
  return out;
}
const segDist = (p, a, b) => { const ab = [b[0] - a[0], b[1] - a[1]], L2 = ab[0] * ab[0] + ab[1] * ab[1] || 1e-30; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / L2)); return Math.hypot(p[0] - a[0] - t * ab[0], p[1] - a[1] - t * ab[1]); };
const polyDist = (p, poly) => { let b = Infinity; for (let k = 0; k + 1 < poly.length; k++) b = Math.min(b, segDist(p, poly[k], poly[k + 1])); return b; };

/* ---------------- T ---------------- */
function tessellation(M, tile) {
  const { G } = M, bad = [];
  const o = G.outline(tile);
  if (!ownSimple(o.pts)) bad.push('T1: the outline is not simple (this file\'s own segment test)');
  const cell = Math.abs(G.cellArea(tile));
  const a = shoelace(o.pts);
  if (Math.abs(a - cell) > 1e-9 * cell) bad.push(`T2: signed area ${a.toFixed(6)} against the cell's ${cell.toFixed(6)}`);
  const tiles = G.patch(tile, 1);
  const sum = tiles.reduce((s, t) => s + shoelace(t.pts), 0);
  if (Math.abs(sum - 9 * cell) > 1e-8 * cell) bad.push(`T2: the patch's nine areas sum to ${sum.toFixed(6)}, not 9 × ${cell.toFixed(6)}`);
  // T3 overlap census
  let y0 = Infinity, y1 = -Infinity;
  for (const t of tiles) for (const [, y] of t.pts) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const ROWS = 700;
  let overlap = 0;
  for (let r = 0; r < ROWS; r++) {
    const y = y0 + ((r + 0.5) / ROWS) * (y1 - y0);
    const ev = [];
    for (const t of tiles) for (const [p, q] of spans(t.pts, y)) { ev.push([p, 1], [q, -1]); }
    ev.sort((u, v) => u[0] - v[0] || u[1] - v[1]);
    let c = 0, x = -Infinity;
    for (const [ex, d] of ev) { if (c >= 2 && ex - x > 1e-7) overlap += ex - x; c += d; x = ex; }
  }
  if (overlap > 0) bad.push(`T3: the 3x3 patch overlaps itself (${overlap.toExponential(2)} mm of doubly-covered scanline)`);
  // T4 gap probes around the centre tile
  const centre = tiles.find((t) => t.m === 0 && t.k === 0).pts, others = tiles.filter((t) => t.m || t.k);
  let gaps = 0, doubles = 0, inner = 0;
  for (let i = 0; i < centre.length; i++) {
    const a = centre[i], b = centre[(i + 1) % centre.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-6) continue;
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], n = [(b[1] - a[1]) / L, -(b[0] - a[0]) / L];   // outward (CCW)
    const out = [mid[0] + 1e-3 * n[0], mid[1] + 1e-3 * n[1]], inn = [mid[0] - 1e-3 * n[0], mid[1] - 1e-3 * n[1]];
    const hits = others.filter((t) => inside(t.pts, out)).length;
    if (hits === 0) gaps++; else if (hits > 1) doubles++;
    if (inside(centre, out) || !inside(centre, inn) || others.some((t) => inside(t.pts, inn))) inner++;
  }
  if (gaps || doubles || inner) bad.push(`T4: around the centre tile ${gaps} probes fell in a gap, ${doubles} in two neighbours, ${inner} inner probes were wrong`);
  // T5 copies
  const A = G.edgeDense(tile, 'A'), B = G.edgeDense(tile, 'B'), { tA, tB } = G.latticeVectors(tile);
  const nA = A.pts.length, nB = B.pts.length;
  let dev = 0;
  for (let k = 1; k < nA; k++) { const top = o.pts[nA - 1 + nB - 1 + (nA - 1 - k)]; dev = Math.max(dev, Math.hypot(top[0] - A.pts[k][0] - tB[0], top[1] - A.pts[k][1] - tB[1])); }
  for (let k = 0; k < nB - 1; k++) { const rt = o.pts[nA - 1 + k]; dev = Math.max(dev, Math.hypot(rt[0] - B.pts[k][0] - tA[0], rt[1] - B.pts[k][1] - tA[1])); }
  if (dev > 1e-12) bad.push(`T5: a copied edge is not its edge translated (${dev.toExponential(2)} mm)`);
  return bad;
}

/* ---------------- W ---------------- */
function census(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const n = dv.getUint32(80, true);
  const id = new Map(); let nv = 0; const P = [];
  const vid = (o) => { const x = dv.getFloat32(o, true), y = dv.getFloat32(o + 4, true), z = dv.getFloat32(o + 8, true); const k = `${x},${y},${z}`; let v = id.get(k); if (v === undefined) { v = nv++; id.set(k, v); P.push([x, y, z]); } return v; };
  const dir = new Map(); let degen = 0;
  for (let t = 0; t < n; t++) {
    const o = 84 + 50 * t + 12;
    const a = vid(o), b = vid(o + 12), c = vid(o + 24);
    const u = [P[b][0] - P[a][0], P[b][1] - P[a][1], P[b][2] - P[a][2]], w = [P[c][0] - P[a][0], P[c][1] - P[a][1], P[c][2] - P[a][2]];
    const area = 0.5 * Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]);
    if (a === b || b === c || a === c || area < 1e-12) degen++;
    for (const [p, q] of [[a, b], [b, c], [c, a]]) { const k = p * 4294967296 + q; dir.set(k, (dir.get(k) || 0) + 1); }
  }
  let unmatched = 0, dup = 0;
  for (const [k, c] of dir) { if (c > 1) dup++; const p = Math.floor(k / 4294967296), q = k - p * 4294967296; if ((dir.get(q * 4294967296 + p) || 0) !== c) unmatched++; }
  return { n, unmatched, dup, degen, bytes: bytes.length };
}
function watertight(M, built) {
  const { RL } = M, bad = [], info = {};
  for (const [nm, b] of [['A', built.A], ['B', built.B], ['handle', built.H]]) {
    const c = census(RL.exportStl(b.mesh, nm, { layout: built.layout, allowRefused: true }));
    info[nm] = c;
    if (c.unmatched || c.dup || c.degen) bad.push(`W: ${nm}.stl has ${c.unmatched} unmatched and ${c.dup} duplicated directed edges, ${c.degen} degenerate triangles`);
    for (const p of b.mesh.parts) {
      const v = RL.signedVolume(b.mesh.positions, b.mesh.indices, p.t0, p.t1);
      if (!(v > 0)) bad.push(`W: ${nm}/${p.name} signed volume ${v.toExponential(3)} (inward or empty)`);
    }
  }
  return { bad, info };
}

/* ---------------- H and R0 ---------------- */
const rad = (P, v) => Math.hypot(P[3 * v], P[3 * v + 1]);
/* a ray through a SHARED edge (or vertex) of two triangles must hit both, never
   neither: the barycentric bounds take this much slack, and crossings() merges
   the two hits at the same distance into one. A peg sits exactly on a revolve
   seam whenever 360° / (tiles round) is a whole number of the body's 2° steps —
   six round A puts peg 0 at 60° — and the strict bounds missed it there. */
const EDGE_EPS = 1e-9;
/* every crossing (distance from the axis) of the ray from (0, 0, z) toward
   angle `ang` with a part's triangles, sorted, duplicates at shared edges merged */
function crossings(mesh, part, z, ang) {
  const P = mesh.positions, I = mesh.indices, d = [Math.cos(ang), Math.sin(ang), 0], out = [];
  for (let t = part.t0; t < part.t1; t++) {
    const a = 3 * I[3 * t], b = 3 * I[3 * t + 1], c = 3 * I[3 * t + 2];
    const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
    const pv = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
    const det = e1[0] * pv[0] + e1[1] * pv[1] + e1[2] * pv[2];
    if (Math.abs(det) < 1e-14) continue;
    const s = [-P[a], -P[a + 1], z - P[a + 2]];
    const u = (s[0] * pv[0] + s[1] * pv[1] + s[2] * pv[2]) / det;
    if (u < -EDGE_EPS || u > 1 + EDGE_EPS) continue;
    const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
    const v = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) / det;
    if (v < -EDGE_EPS || u + v > 1 + EDGE_EPS) continue;
    out.push((e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) / det);
  }
  out.sort((x, y) => x - y);
  return out.filter((t, i) => t > 0 && (i === 0 || t - out[i - 1] > 1e-7));
}
/* the farthest crossing of the ray from (0, 0, z) toward angle `ang` with a
   part's triangles (Möller–Trumbore) */
function outerHit(mesh, part, z, ang) {
  const P = mesh.positions, I = mesh.indices, d = [Math.cos(ang), Math.sin(ang), 0];
  let best = -Infinity;
  for (let t = part.t0; t < part.t1; t++) {
    const a = 3 * I[3 * t], b = 3 * I[3 * t + 1], c = 3 * I[3 * t + 2];
    const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
    const pv = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
    const det = e1[0] * pv[0] + e1[1] * pv[1] + e1[2] * pv[2];
    if (Math.abs(det) < 1e-14) continue;
    const s = [-P[a], -P[a + 1], z - P[a + 2]];
    const u = (s[0] * pv[0] + s[1] * pv[1] + s[2] * pv[2]) / det;
    if (u < -EDGE_EPS || u > 1 + EDGE_EPS) continue;
    const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
    const v = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) / det;
    if (v < -EDGE_EPS || u + v > 1 + EDGE_EPS) continue;
    const tt = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) / det;
    if (tt > best) best = tt;
  }
  return best;
}
/* nearest distance from p to a polyline, through a uniform grid of its
   segments (2D or 3D; `closed` adds the last-to-first segment). Distances
   beyond the cell size come back as the cell size or more, never less. */
function segGrid(pts, closed, cell = 2) {
  const dim = pts[0].length, grid = new Map();
  const key = (c) => c.join(',');
  const segs = [];
  const n = pts.length, m = closed ? n : n - 1;
  for (let k = 0; k < m; k++) {
    const a = pts[k], b = pts[(k + 1) % n];
    segs.push([a, b]);
    const lo = a.map((v, i) => Math.floor(Math.min(v, b[i]) / cell)), hi = a.map((v, i) => Math.floor(Math.max(v, b[i]) / cell));
    const rec = (i, c) => {
      if (i === dim) { const kk = key(c); if (!grid.has(kk)) grid.set(kk, []); grid.get(kk).push(k); return; }
      for (let x = lo[i]; x <= hi[i]; x++) rec(i + 1, [...c, x]);
    };
    rec(0, []);
  }
  const d2 = (p, a, b) => {
    let ab2 = 0, t = 0;
    for (let i = 0; i < dim; i++) { const ab = b[i] - a[i]; ab2 += ab * ab; t += (p[i] - a[i]) * ab; }
    t = ab2 ? Math.max(0, Math.min(1, t / ab2)) : 0;
    let s = 0; for (let i = 0; i < dim; i++) { const q = p[i] - a[i] - t * (b[i] - a[i]); s += q * q; }
    return Math.sqrt(s);
  };
  return (p) => {
    const c0 = p.map((v) => Math.floor(v / cell));
    let best = Infinity;
    const rec = (i, c) => {
      if (i === dim) { for (const k of grid.get(key(c)) || []) best = Math.min(best, d2(p, segs[k][0], segs[k][1])); return; }
      for (let x = c0[i] - 1; x <= c0[i] + 1; x++) rec(i + 1, [...c, x]);
    };
    rec(0, []);
    return Math.min(best, Infinity);
  };
}
const ringParts = (mesh) => mesh.parts.filter((q) => /^ring\d+$/.test(q.name)).sort((p, q) => +p.name.slice(4) - +q.name.slice(4));
/* a blade's tip vertices: those at the mesh's outermost blade radius */
function tipOf(mesh, part, R) {
  const P = mesh.positions, out = [];
  for (let v = part.v0; v < part.v1; v++) if (Math.abs(rad(P, v) - R) < 1e-9) out.push(v);
  return out;
}

/* ---------------- H ---------------- */
function heights(M, built, print, meas = {}) {
  const bad = [];
  for (const which of ['A', 'B']) {
    const { mesh } = built[which], P = mesh.positions;
    let tip = 0; for (const p of ringParts(mesh)) for (let v = p.v0; v < p.v1; v++) tip = Math.max(tip, rad(P, v));
    let roll = 0; for (let v = 0; v < P.length / 3; v++) roll = Math.max(roll, rad(P, v));
    /* The body's OUTER radius, read by casting rays out from the axis against
       the body's own triangles and keeping the farthest hit — the outer skin,
       never the cavity's or the bore's (a vertex scan cannot tell them apart:
       the outer cylinder has vertices only at its ends and at the collar). */
    const body = mesh.parts.find((q) => q.name === 'body');
    let zlo = Infinity, zhi = -Infinity, rband = 0;
    for (let v = body.v0; v < body.v1; v++) { zlo = Math.min(zlo, P[3 * v + 2]); zhi = Math.max(zhi, P[3 * v + 2]); rband = Math.max(rband, rad(P, v)); }
    let rbody = Infinity;
    const lo = zlo + 2, hi = zhi - 2;                          // past the end chamfers
    for (let i = 0; i <= 60; i++) {
      const z = lo + ((hi - lo) * i) / 60;
      for (const ang of [0.1, 1.7, 3.3, 4.9]) rbody = Math.min(rbody, outerHit(mesh, body, z, ang));
    }
    const h = tip - rbody;
    meas[`blade${which}`] = h;
    if (which === 'B') meas.bandAbove = roll - rband;
    if (!(h > print.dough + 1.5 - 1e-9)) bad.push(`H1: roller ${which}'s blade stands ${h.toFixed(3)} mm, not more than the dough ${print.dough} + 1.5 mm`);
    if (Math.abs(tip - roll) > 1e-9) bad.push(`R1: roller ${which} rolls on radius ${roll.toFixed(6)} but its blade tips reach ${tip.toFixed(6)} — ${tip < roll ? 'something stands proud of the blades, and they never touch the board' : 'the blades are not the outermost'}`);
    meas[`roll${which}`] = roll;
    const cones = mesh.parts.filter((q) => /^(peg|tooth)/.test(q.name));
    for (const c of cones) {
      let r = 0; for (let v = c.v0; v < c.v1; v++) r = Math.max(r, rad(P, v));
      const above = roll - r;
      /* the doc's law restated (§4.3): a peg reaches δ = min(½·dough, ½·D − 0.8)
         into the dough — never more than half of it, so it dimples and never
         punches — and a tooth 0.3 mm less, so it seats on the dimple's wall */
      const delta = Math.min(0.5 * print.dough, print.pegSize / 2 - 0.8), want = /^peg/.test(c.name) ? delta : delta - 0.3;
      if (!(Math.abs(print.dough - above - want) < 1e-6)) bad.push(`H2: ${which}/${c.name} reaches ${(print.dough - above).toFixed(4)} mm into the ${print.dough} mm dough, not the ${want.toFixed(4)} mm its law gives`);
      /* H4 the cone is FOUNDED: its base disk's centre (its innermost vertex)
         lies in the body's material along its own radial line — a ray from the
         axis through it crosses the body's skin an odd number of times first */
      /* the base disk's centre: the innermost vertex — and the base RIM's two
         axial extremes are exactly as far from the axis, so among the ties the
         one midway between them in z (the centre is the mean of its rim) */
      let rmin = Infinity; for (let v = c.v0; v < c.v1; v++) rmin = Math.min(rmin, rad(P, v));
      const ties = []; for (let v = c.v0; v < c.v1; v++) if (rad(P, v) - rmin < 1e-9) ties.push(v);
      const zMid = ties.reduce((a, v) => a + P[3 * v + 2], 0) / ties.length;
      let vin = ties[0]; for (const v of ties) if (Math.abs(P[3 * v + 2] - zMid) < Math.abs(P[3 * vin + 2] - zMid)) vin = v;
      const ang = Math.atan2(P[3 * vin + 1], P[3 * vin]), rin = rad(P, vin);
      const hits = crossings(mesh, body, P[3 * vin + 2], ang).filter((t) => t < rin);
      if (hits.length % 2 !== 1) bad.push(`H4: ${which}/${c.name}'s foot (radius ${rin.toFixed(3)} mm) is not inside the body — ${hits.length} skin crossings below it`);
    }
    if (which === 'B') {
      if (!(roll - rband > print.dough)) bad.push(`H3: the collar band reaches ${(roll - rband).toFixed(3)} mm above the board — into the dough`);
      const tipR = (m, parts) => Math.max(...parts.map((q) => { let r = 0; for (let v = q.v0; v < q.v1; v++) r = Math.max(r, rad(m.positions, v)); return r; }));
      const pegTip = tipR(built.A.mesh, built.A.mesh.parts.filter((q) => /^peg/.test(q.name)));
      let rollA = 0; for (let v = 0; v < built.A.mesh.positions.length / 3; v++) rollA = Math.max(rollA, rad(built.A.mesh.positions, v));
      const pegDepth = print.dough - (rollA - pegTip), toothDepth = print.dough - (roll - tipR(mesh, cones));
      meas.pegDepth = pegDepth; meas.toothDepth = toothDepth;
      if (!(toothDepth < pegDepth)) bad.push(`H2: a tooth reaches ${toothDepth.toFixed(3)} mm into the dough, not shallower than the peg's ${pegDepth.toFixed(3)} mm dimple`);
    }
  }
  return bad;
}

/* ---------------- R0: the mesh is the spec ---------------- */
function meshIsSpec(M, built, layout) {
  const bad = [];
  for (const which of ['A', 'B']) {
    const { mesh, spec } = built[which], P = mesh.positions, R = spec.Rtip;
    const halfTip = layout.wTip / 2;
    const parts = ringParts(mesh);
    if (parts.length !== spec.rings.length) { bad.push(`R0: roller ${which} has ${parts.length} blade meshes for ${spec.rings.length} spec rings`); continue; }
    parts.forEach((part, j) => {
      const tips = tipOf(mesh, part, R).map((v) => [P[3 * v], P[3 * v + 1], P[3 * v + 2]]);
      let lonely = 0;
      for (const [phi, Z] of spec.rings[j]) {
        const c = [R * Math.cos(phi), R * Math.sin(phi), Z];
        let b = Infinity; for (const t of tips) { const d = Math.hypot(t[0] - c[0], t[1] - c[1], t[2] - c[2]); if (d < b) b = d; if (b < halfTip + 0.6) break; }
        if (b > halfTip + 0.6) lonely++;
      }
      if (lonely) bad.push(`R0: ${lonely} of ${which}/ring${j}'s spec points have no blade tip beside them`);
    });
    for (const f of [...(spec.pegs || []).map((p) => ['peg', p]), ...(spec.teeth || []).map((p) => ['tooth', p])]) {
      const [kind, s] = f;
      const part = mesh.parts.find((q) => q.name === `${kind}${s.i}`);
      if (!part) { bad.push(`R0: no mesh for ${which}/${kind}${s.i}`); continue; }
      // a frustum's rings are circles about its axis: the mean of all its vertices is on the axis
      let x = 0, y = 0, z = 0; const nv = part.v1 - part.v0;
      for (let v = part.v0; v < part.v1; v++) { x += P[3 * v]; y += P[3 * v + 1]; z += P[3 * v + 2]; }
      x /= nv; y /= nv; z /= nv;
      const phi = Math.atan2(y, x), dphi = Math.atan2(Math.sin(phi - s.phi), Math.cos(phi - s.phi));
      if (Math.abs(dphi) * R > 0.05 || Math.abs(z - s.Z) > 0.05) bad.push(`R0: ${which}/${kind}${s.i} is built ${(Math.abs(dphi) * R).toFixed(3)} mm round and ${Math.abs(z - s.Z).toFixed(3)} mm along from its spec point`);
    }
  }
  return bad;
}

/* ---------------- D: the blades run AROUND the roller ---------------- */
function direction(M, tile, built, print, rollers, dm = {}) {
  const { G } = M, bad = [];
  const { tA, tB } = G.latticeVectors(tile);
  const area = Math.abs(tA[0] * tB[1] - tA[1] * tB[0]);
  const wRoot = print.bladeWall + 2 * (print.bladeHeight + 0.4) * Math.tan(print.draft * Math.PI / 180);   // the doc's law, §3.4
  for (const which of ['A', 'B']) {
    const { mesh } = built[which], P = mesh.positions, I = mesh.indices;
    const parts = ringParts(mesh);
    let Rt = 0; for (const p of parts) for (let v = p.v0; v < p.v1; v++) Rt = Math.max(Rt, rad(P, v));
    // this file's own frame: the line's chord tX, the axis 90° left of it
    const tX = which === 'A' ? tA : tB, Lx = Math.hypot(tX[0], tX[1]);
    const ax = [-tX[1] / Lx, tX[0] / Lx];
    let a0 = Infinity, a1 = -Infinity, segMax = 0;
    const dense = G.edgeDense(tile, which).pts;
    dense.forEach((p, i) => { const z = p[0] * ax[0] + p[1] * ax[1]; a0 = Math.min(a0, z); a1 = Math.max(a1, z); if (i) segMax = Math.max(segMax, Math.hypot(p[0] - dense[i - 1][0], p[1] - dense[i - 1][1])); });
    const wantExtent = a1 - a0 + wRoot, wantSpacing = area / Lx;
    const wantCount = (which === 'A' ? rollers.rows : rollers.cols) + 1;
    if (parts.length !== wantCount) bad.push(`D3: roller ${which} carries ${parts.length} blades — a sheet of ${rollers.cols} × ${rollers.rows} cookies needs ${wantCount}`);
    const means = [];
    let worstGap = 0, worstExt = 0;
    for (const part of parts) {
      const tip = new Set(tipOf(mesh, part, Rt));
      /* D1 the union of the tip edges' angular spans; and the edges ALONG the
         blade's edge (those with one all-tip triangle beside them, not two) are
         no longer than the line's own sampling — a chord across the roller,
         bridging a ring that does not go round, is */
      const iv = [], onEdge = new Map();
      for (let t = part.t0; t < part.t1; t++) {
        const tri = [I[3 * t], I[3 * t + 1], I[3 * t + 2]];
        if (!tri.every((v) => tip.has(v))) continue;
        for (let e = 0; e < 3; e++) { const u = tri[e], w = tri[(e + 1) % 3], kk = u < w ? `${u},${w}` : `${w},${u}`; onEdge.set(kk, (onEdge.get(kk) || 0) + 1); }
      }
      let longest = 0;
      for (const [kk, c] of onEdge) { if (c !== 1) continue; const [u, w] = kk.split(',').map(Number); longest = Math.max(longest, Math.hypot(P[3 * u] - P[3 * w], P[3 * u + 1] - P[3 * w + 1], P[3 * u + 2] - P[3 * w + 2])); }
      if (longest > segMax + 1e-6) bad.push(`D1: roller ${which}/${part.name} has an edge ${longest.toFixed(3)} mm long along its tip, where its line is sampled every ${segMax.toFixed(3)} mm or less — a chord across the roller, not the line going round`);
      for (let t = part.t0; t < part.t1; t++) {
        const tri = [I[3 * t], I[3 * t + 1], I[3 * t + 2]];
        for (let e = 0; e < 3; e++) {
          const u = tri[e], w = tri[(e + 1) % 3];
          if (!tip.has(u) || !tip.has(w)) continue;
          let x = Math.atan2(P[3 * u + 1], P[3 * u]), y = Math.atan2(P[3 * w + 1], P[3 * w]);
          let d = y - x; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
          if (d < 0) { x = x + d; d = -d; }
          x = ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
          if (x + d > 2 * Math.PI) { iv.push([x, 2 * Math.PI], [0, x + d - 2 * Math.PI]); } else iv.push([x, x + d]);
        }
      }
      iv.sort((p, q) => p[0] - q[0]);
      let reach = 0, gap = 0;
      for (const [s, e] of iv) { if (s > reach) gap = Math.max(gap, s - reach); reach = Math.max(reach, e); }
      gap = Math.max(gap, 2 * Math.PI - reach);
      if (!iv.length) gap = 2 * Math.PI;
      worstGap = Math.max(worstGap, gap);
      // D2 the axial extent; D3 the axial position (mean Z of the tip)
      let zlo = Infinity, zhi = -Infinity;
      for (let v = part.v0; v < part.v1; v++) { zlo = Math.min(zlo, P[3 * v + 2]); zhi = Math.max(zhi, P[3 * v + 2]); }
      worstExt = Math.max(worstExt, Math.abs(zhi - zlo - wantExtent));
      let zs = 0; for (const v of tip) zs += P[3 * v + 2];
      means.push(tip.size ? zs / tip.size : NaN);
      if (gap > 1e-9) bad.push(`D1: roller ${which}/${part.name} covers ${(360 - gap * 180 / Math.PI).toFixed(1)}° of the circumference — a gap of ${(gap * 180 / Math.PI).toFixed(1)}°: it does not run all the way round`);
      if (Math.abs(zhi - zlo - wantExtent) > 0.05) bad.push(`D2: roller ${which}/${part.name} runs ${(zhi - zlo).toFixed(3)} mm along the axis where a ring of edge ${which} spans ${wantExtent.toFixed(3)} mm (the line's own width across itself, plus the root) — ${zhi - zlo > wantExtent ? 'it runs ALONG the roller' : 'it is cut short'}`);
    }
    let worstSp = 0;
    for (let j = 1; j < means.length; j++) worstSp = Math.max(worstSp, Math.abs(Math.abs(means[j] - means[j - 1]) - wantSpacing));
    if (!(worstSp < 1e-6)) bad.push(`D3: roller ${which}'s rings are spaced ${means.slice(1).map((m, j) => Math.abs(m - means[j]).toFixed(4)).join(', ')} mm along the axis, not the ${wantSpacing.toFixed(4)} mm between neighbouring lines (|tA × tB| / |t${which}|)`);
    dm[which] = { gap: worstGap, ext: worstExt, sp: worstSp, spacing: wantSpacing };
  }
  return bad;
}

/* ---------------- R and S ---------------- */
function registration(M, tile, built, r4 = {}) {
  const { S } = M, bad = [];
  const sim = S.simulate(tile, built, { revs: 1 });
  const { KA, KB, mStar } = sim;
  // R2 the track: one dimple on each corner (m*, k), k = 0..KB
  const track = sim.dimples.filter((d) => d.lm === mStar);   // the peg row's later passes land n_A columns further on
  for (let k = 0; k <= KB; k++) {
    const at = track.filter((d) => d.lk === k);
    if (at.length !== 1) { bad.push(`R2: corner (${mStar}, ${k}) of the track has ${at.length} dimples`); continue; }
    const c = S.cornerOf(tile, sim, mStar, k), e = Math.hypot(at[0].at[0] - c[0], at[0].at[1] - c[1]);
    if (e > TOL) bad.push(`R2: the dimple for corner (${mStar}, ${k}) is ${e.toExponential(2)} mm off the corner`);
  }
  if (track.some((d) => d.lk < 0 || d.lk > KB)) bad.push(`R2: A lays track dimples outside rows 0–${KB}`);
  // R3 teeth in dimples
  const tr = S.trackDimples(sim);
  const onTrack = sim.teeth.filter((t) => t.lm === mStar && t.lk >= 0 && t.lk <= KB);
  let stray = 0;
  for (const t of onTrack) if (!tr.some((d) => Math.hypot(d.at[0] - t.at[0], d.at[1] - t.at[1]) < TOL)) stray++;
  const fed = tr.filter((d) => onTrack.some((t) => Math.hypot(d.at[0] - t.at[0], d.at[1] - t.at[1]) < TOL)).length;
  if (stray) bad.push(`R3: ${stray} collar teeth land on the track beside its dimples`);
  if (fed !== tr.length) bad.push(`R3: ${tr.length - fed} of ${tr.length} track dimples receive no tooth`);
  if (!sim.teeth.some((t) => t.lm === mStar)) bad.push('R3: no collar tooth lands on the track column at all');
  // R4 corners on both lines
  const cornersOnLines = (s) => {
    const { a, b } = S.blockLines(s);
    let wA = 0, wB = 0, missing = 0;
    for (let m = 0; m <= KA; m++) for (let k = 0; k <= KB; k++) {
      const c = S.cornerOf(tile, s, m, k);
      const la = a.find((L) => L.k === k), lb = b.find((L) => L.m === m);
      if (!la || !lb) { missing++; continue; }
      wA = Math.max(wA, polyDist(c, la.pts)); wB = Math.max(wB, polyDist(c, lb.pts));
    }
    return { wA, wB, missing };
  };
  const c0 = cornersOnLines(sim);
  if (c0.missing) bad.push(`R4: ${c0.missing} corners of the sheet have no A line or no B line stamped through their row / column`);
  r4.worst = Math.max(c0.wA, c0.wB);
  if (c0.wA > TOL || c0.wB > TOL) bad.push(`R4: a sheet corner stands ${c0.wA.toExponential(2)} mm off its A line, ${c0.wB.toExponential(2)} mm off its B line`);
  /* R3 one seat fixes both free placements: B seated by a DIFFERENT tooth in a
     DIFFERENT dimple of the track stamps the same lines through the same corners */
  const nB = built.B.spec.teeth.length;
  for (const seat of [{ tooth: nB - 1, row: KB }, { tooth: Math.floor(nB / 2), row: Math.min(1, KB) }]) {
    if (!track.some((d) => d.lk === seat.row)) { bad.push(`R3: there is no track dimple in row ${seat.row} to seat B in`); continue; }
    const s2 = S.simulate(tile, built, { revs: 1, seat });
    const c2 = cornersOnLines(s2);
    if (c2.missing || c2.wB > TOL) bad.push(`R3: seated by tooth ${seat.tooth} in the dimple of row ${seat.row}, B's lines miss the sheet's corners by ${c2.wB.toExponential(2)} mm (${c2.missing} missing) — one seat does not fix B`);
  }
  // R5 meetings only at corners
  const { a, b } = S.blockLines(sim);
  const cs = S.contacts(a, b, TOL);
  let off = 0;
  for (const p of cs) { const [u, v] = S.latticeOf(tile, sim, p); const c = S.cornerOf(tile, sim, Math.round(u), Math.round(v)); if (Math.hypot(c[0] - p[0], c[1] - p[1]) > 10 * TOL) off++; }
  if (off) bad.push(`R5: the sheet's A and B lines meet at ${off} points that are not tile corners`);
  r4.meetings = cs.length - off; r4.want = (KA + 1) * (KB + 1);
  if (cs.length - off !== (KA + 1) * (KB + 1)) bad.push(`R5: ${cs.length - off} corner meetings, not ${(KA + 1) * (KB + 1)}`);
  // F: the peg row's second pass lands on a cookie corner iff flagged
  const cookieDimples = sim.dimples.filter((d) => d.lk >= 0 && d.lk <= KB && d.lm >= 0 && d.lm <= KA).length;
  const flagged = built.layout.flags.some((f) => f.id === 'pegRecur');
  if ((cookieDimples > 0) !== flagged) bad.push(`F: the simulation lands ${cookieDimples} dimples on cookie corners but the recurrence flag is ${flagged ? 'raised' : 'not raised'}`);
  return { bad, sim };
}
function seam(M, tile, built, rollers, print, sm = {}) {
  const { S } = M, bad = [];
  const sim = S.simulate(tile, built, { revs: 3 });
  for (const [fam, lines, want, P] of [['A', sim.aLines, rollers.rows, sim.PA], ['B', sim.bLines, rollers.cols, sim.PB]]) {
    // S1 every corner on a lattice point, all of one row / column
    let w1 = 0, mixed = 0;
    for (const L of lines) {
      for (const c of L.corners) { const p = L.pts[c], [u, v] = S.latticeOf(tile, sim, p), q = S.cornerOf(tile, sim, Math.round(u), Math.round(v)); w1 = Math.max(w1, Math.hypot(p[0] - q[0], p[1] - q[1])); }
      if (L.mixed) mixed++;
    }
    if (w1 > TOL) bad.push(`S1: a corner of a stamped ${fam} line lands ${w1.toExponential(2)} mm off a lattice point`);
    if (mixed) bad.push(`S1: ${mixed} stamped ${fam} lines have corners on more than one ${fam === 'A' ? 'row' : 'column'}`);
    // S2 each row / column exactly once; each ring closes round the roller once
    const idx = lines.map((L) => (fam === 'A' ? L.k : L.m)).sort((p, q) => p - q);
    const wantIdx = Array.from({ length: want + 1 }, (_, i) => i);
    if (JSON.stringify(idx) !== JSON.stringify(wantIdx)) bad.push(`S2: roller ${fam} stamps ${fam === 'A' ? 'rows' : 'columns'} ${idx.join(',')} — not ${wantIdx.join(',')} each once`);
    for (const L of lines) {
      const turns = L.turn / P.period;
      if (Math.abs(turns - 1) > 1e-9) bad.push(`S2: roller ${fam}'s ring ${L.ring} gains ${turns.toFixed(6)} periods of travel per time round, not one — it does not close on itself round the roller`);
    }
    const revs = Math.min(...lines.map((L) => L.revs));
    if (revs < 6) bad.push(`S2: roller ${fam} was stamped over ${revs} revolutions, not at least 3 either way`);
    // S3 each stamped line IS the ideal line of its row / column, both ways, over every seam
    let worst = 0, worstSeam = 0;
    for (const L of lines) {
      const c0 = Math.floor(L.span[0]) - 1, c1 = Math.ceil(L.span[1]) + 1;
      const ideal = fam === 'A' ? S.idealLine(tile, sim, 'A', 0, L.k, c0, c1) : S.idealLine(tile, sim, 'B', L.m, 0, c0, c1);
      const toIdeal = segGrid(ideal, false), toLine = segGrid(L.pts, false);
      const seamSet = new Set(); for (const s0 of L.seams) for (let d = -3; d <= 3; d++) seamSet.add(s0 + d);
      L.pts.forEach((p, i) => { const d = toIdeal(p); worst = Math.max(worst, d); if (seamSet.has(i)) worstSeam = Math.max(worstSeam, d); });
      // the ideal's points within the stamped span, away from its two ends
      for (const p of ideal) {
        const [u, v] = S.latticeOf(tile, sim, p), along = fam === 'A' ? u : v;
        if (along <= L.span[0] + 1 || along >= L.span[1] - 1) continue;
        worst = Math.max(worst, toLine(p));
      }
    }
    sm[fam] = worst; sm[`seam${fam}`] = worstSeam; sm[`revs${fam}`] = revs;
    if (worst > TOL) bad.push(`S3: a stamped ${fam} line departs ${worst.toExponential(2)} mm from the ideal line of its ${fam === 'A' ? 'row' : 'column'} (${worstSeam.toExponential(2)} mm at a revolution seam)`);
  }
  // S4 each blade's mesh: a closed tube round the roller, its tip on its spec ring all the way round
  const halfTip = print.bladeWall / 2;
  for (const which of ['A', 'B']) {
    const { mesh, spec } = built[which], P = mesh.positions, I = mesh.indices, R = spec.Rtip;
    ringParts(mesh).forEach((part, j) => {
      const verts = new Set(), edges = new Set();
      for (let t = part.t0; t < part.t1; t++) {
        const tri = [I[3 * t], I[3 * t + 1], I[3 * t + 2]];
        for (let e = 0; e < 3; e++) { const u = tri[e], w = tri[(e + 1) % 3]; verts.add(u); edges.add(u < w ? `${u},${w}` : `${w},${u}`); }
      }
      const chi = verts.size - edges.size + (part.t1 - part.t0);
      if (chi !== 0) bad.push(`S4: ${which}/${part.name} is not a closed tube round the roller (Euler characteristic ${chi}, a torus has 0${chi === 2 ? ' — this one has ends' : ''})`);
      const ring = spec.rings[j] ? spec.rings[j].map(([phi, Z]) => [R * Math.cos(phi), R * Math.sin(phi), Z]) : null;
      if (!ring) return;
      const near = segGrid(ring, true, 2);
      let worstTip = 0;
      for (const v of tipOf(mesh, part, R)) worstTip = Math.max(worstTip, near([P[3 * v], P[3 * v + 1], P[3 * v + 2]]));
      sm[`tip${which}`] = Math.max(sm[`tip${which}`] || 0, worstTip);
      if (worstTip > halfTip + 0.05) bad.push(`S4: ${which}/${part.name}'s tip stands ${worstTip.toFixed(3)} mm from its spec ring (half a blade is ${halfTip.toFixed(3)}) — the tube does not follow the ring all the way round`);
    });
  }
  return bad;
}

/* ---------------- F ---------------- */
function shapeFlags(M, tile, print, expect) {
  if (!expect) return [];
  const { G } = M, bad = [];
  const th = G.thinAnalysis(tile, print.minCookie), cl = G.closePoints(tile, print.bladeWall);
  const got = { neck: th.necks.length > 0, spike: th.spikes.length > 0, close: cl.length > 0 };
  for (const k of ['neck', 'spike', 'close']) if (got[k] !== expect.includes(k)) bad.push(`F: the ${k} flag is ${got[k] ? 'raised' : 'not raised'} where the fixture expects ${expect.includes(k) ? 'it' : 'none'}`);
  // the close-point flag is the bar restated: consecutive chain points under the blade wall
  for (const which of ['A', 'B']) {
    const { chain } = G.edgeChain(tile, which);
    for (let i = 0; i + 1 < chain.length; i++) {
      const d = Math.hypot(chain[i + 1][0] - chain[i][0], chain[i + 1][1] - chain[i][1]);
      if ((d < print.bladeWall) !== cl.some((c) => c.which === which && c.i === i)) bad.push(`F: edge ${which} points ${i}–${i + 1} are ${d.toFixed(2)} mm apart and the close-point flag disagrees`);
    }
  }
  return bad;
}


/* ---------------- one row ---------------- */
function checkRow(M, label, tile, print, rollers, opts = {}) {
  const { G, RL } = M;
  const fails = [];
  const v = G.validate(tile);
  if (!v.ok) return { label, fails: [`E: a row's tile is invalid: ${v.reason}`] };
  fails.push(...tessellation(M, tile));
  const built = RL.buildAll(tile, print, rollers);
  const w = watertight(M, built);
  let refused = false;
  try { RL.exportStl(built.A.mesh, 'A', { layout: built.layout }); } catch (e) { refused = e instanceof RL.RefusedError; }
  /* W5: refused exactly when the MEASURED roller cannot work — its blade (tip
     less body, off the mesh) does not clear the dough by 1.5 mm, or its rolling
     radius (off the mesh) less the blade leaves no cylinder wall round the bore.
     Never read off the builder's own flag: that is the quantity under test. */
  const meas = {}, r4 = {}, sm = {}, dm = {};
  /* a stage that throws is a failure OF THAT STAGE, reported under its own
     clause — never a crash that loses what the other stages found */
  const stage = (clause, f) => { try { return f(); } catch (e) { return [`${clause}: (threw) ${e.message}`]; } };
  const hb = stage('H', () => heights(M, built, print, meas));
  const why = [];
  for (const which of ['A', 'B']) {
    if (!(meas[`blade${which}`] > print.dough + 1.5 - 1e-9)) why.push(`${which}'s blade stands ${meas[`blade${which}`].toFixed(2)} mm against ${print.dough} + 1.5`);
    const body = meas[`roll${which}`] - print.bladeHeight;
    if (body < print.bore / 2 + print.cylWall + 0.4 - 1e-9) why.push(`${which}'s body is ${(2 * body).toFixed(1)} mm across round a ${print.bore} mm bore`);
  }
  if (meas.rollA === undefined || meas.rollB === undefined) fails.push('W5: the rollers could not be measured, so the refusal cannot be checked');
  else if ((why.length > 0) !== refused) fails.push(`W5: the STL is ${refused ? 'refused' : 'exported'} while ${why.length ? why.join('; ') : 'the rollers measure sound'}`);
  if (!refused) { fails.push(...w.bad); fails.push(...hb); }
  fails.push(...stage('R0', () => meshIsSpec(M, built, built.layout)));
  fails.push(...stage('D', () => direction(M, tile, built, print, rollers, dm)));
  fails.push(...stage('R', () => registration(M, tile, built, r4).bad));
  if (!opts.noSeam) fails.push(...stage('S', () => seam(M, tile, built, rollers, print, sm)));
  fails.push(...stage('F', () => shapeFlags(M, tile, print, opts.expect)));
  return { label, fails, tris: [w.info.A.n, w.info.B.n, w.info.handle.n], bytes: [w.info.A.bytes, w.info.B.bytes, w.info.handle.bytes], layout: built.layout, meas, r4, sm, dm };
}

/* ---------------- E: the editor, as functions ---------------- */
function editorChecks(M) {
  const { G } = M, out = [];
  const ok = (c, m) => out.push([!!c, m]);
  for (const f of INVALID) {
    const v = G.validate(f.tile);
    ok(!v.ok && !ownSimple(G.outline(f.tile).pts), `E1: "${f.name}" is refused (${v.reason || 'ACCEPTED'}) and really crosses by this file's test`);
  }
  // E2: drag a point step by step toward the left edge; the first crossing step is blocked, unchanged
  const t0 = G.defaultTile();
  let cur = t0, blocked = null, crossed = false;
  for (let s = 1; s <= 60 && !blocked; s++) {
    const f = s / 60, uv = [0.3 + (-0.2 - 0.3) * f, 0.13 + (0.45 - 0.13) * f];
    const want = G.cloneTile(cur); want.edgeA[0] = [uv[0], uv[1], 0];
    const reallyCrosses = !ownSimple(G.outline(want).pts);
    const r = G.movePoint(cur, 'A', 0, uv);
    if (reallyCrosses) { crossed = true; blocked = r; break; }
    if (!r.ok) { blocked = r; break; }
    cur = r.tile;
  }
  ok(crossed && blocked && !blocked.ok && JSON.stringify(blocked.tile) === JSON.stringify(cur) && /cross/.test(blocked.reason), 'E2: a drag into a crossing is BLOCKED at the first crossing step, the tile returned unchanged, with the reason');
  // E3 valid operations land
  const mv = G.movePoint(t0, 'A', 0, [0.32, 0.16]);
  ok(mv.ok && mv.tile.edgeA[0][0] === 0.32 && mv.tile.edgeA[0][1] === 0.16 && ownSimple(G.outline(mv.tile).pts), 'E3: a valid move lands at the requested point');
  const ins = G.insertPoint(t0, 'B', [0.05, 0.5]);
  ok(ins.ok && ins.tile.edgeB.length === 3 && ins.tile.edgeB[ins.index][0] === 0.05 && ins.tile.edgeB[ins.index][1] === 0.5 && ins.index === 1, `E3: an insert lands in the nearest segment (index ${ins.index})`);
  const del = G.deletePoint(t0, 'B', 1);
  ok(del.ok && del.tile.edgeB.length === 1 && del.tile.edgeB[0][1] === 0.3, 'E3: a delete removes exactly that point');
  const tg = G.togglePoint(t0, 'A', 1);
  ok(tg.ok && tg.tile.edgeA[1][2] === 1 && t0.edgeA[1][2] === 0, 'E3: a toggle flips that point to sharp and leaves the input alone');
  const tc = G.toggleCorner(t0);
  ok(tc.ok && tc.tile.cornerSmooth === false, 'E3: the corner toggles');
  // E4 corners cannot be deleted
  const dc = G.deletePoint(t0, 'A', 2);
  ok(!dc.ok && dc.tile === t0, 'E4: a corner (past the interior points) cannot be deleted');
  // E5 resize keeps θ and puts the corner at the pointer, opposite fixed
  let e5 = true, e5m = '';
  for (const t of [t0, FIXTURES.find((f) => /hook/.test(f.name)).tile]) for (let c = 0; c < 4; c++) {
    const o = (c + 2) % 4, O = G.cornerAt(t, o), C = G.cornerAt(t, c);
    const target = [C[0] + (c === 1 || c === 2 ? 4 : -4), C[1] + (c >= 2 ? 3 : -3)];
    const r = G.resizeFromCorner(t, c, target, O);
    if (!r.ok) { e5 = false; e5m = `corner ${c}: ${r.reason}`; continue; }
    const C2 = G.cornerAt(r.tile, c), O2 = G.cornerAt(r.tile, o);
    const got = [C2[0] - O2[0], C2[1] - O2[1]], want = [target[0] - O[0], target[1] - O[1]];
    if (r.tile.angle !== t.angle || Math.hypot(got[0] - want[0], got[1] - want[1]) > 1e-9) { e5 = false; e5m = `corner ${c} landed ${Math.hypot(got[0] - want[0], got[1] - want[1]).toExponential(2)} mm off`; }
  }
  ok(e5, `E5: a corner drag resizes with the opposite corner fixed and θ kept, the corner at the pointer ${e5m}`);
  // E6 smooth corners are C1 (the turn shrinks with the sampling), sharp ones kink
  const turn = (t, which, per) => {
    const d = G.edgeDense(t, which, per), n = d.pts.length;
    const a = Math.atan2(d.pts[n - 1][1] - d.pts[n - 2][1], d.pts[n - 1][0] - d.pts[n - 2][0]), b = Math.atan2(d.pts[1][1] - d.pts[0][1], d.pts[1][0] - d.pts[0][0]);
    return Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a))) * 180 / Math.PI;
  };
  const asym = { pitchA: 40, pitchB: 40, angle: 90, cornerSmooth: true, edgeA: [[0.25, 0.2, 0], [0.8, 0.05, 0]], edgeB: [[0.1, 0.4, 0]] };
  const s20 = turn(asym, 'A', 20), s160 = turn(asym, 'A', 160);
  const sharp = { ...asym, cornerSmooth: false };
  // a C1 join's sampled turn is O(h): eight times the sampling, an eighth of the turn
  // (a kink keeps its angle at any sampling — the sharp control below)
  ok(s160 < s20 / 5, `E6: a smooth corner's line turns ${s20.toFixed(3)}° at 20 samples a segment and ${s160.toFixed(3)}° at 160 (${(s20 / s160).toFixed(2)}x for 8x) — C1`);
  ok(turn(sharp, 'A', 160) > 5, `E6: a sharp corner kinks the line (${turn(sharp, 'A', 160).toFixed(2)}°)`);
  // E7 a saved tile round-trips
  const back = G.readTile(JSON.parse(JSON.stringify(t0)));
  ok(back.ok && JSON.stringify(back.tile) === JSON.stringify({ ...t0, edgeA: t0.edgeA, edgeB: t0.edgeB }), 'E7: a tile round-trips through JSON');
  ok(!G.readTile({ ...INVALID[0].tile }).ok, 'E7: a crossing tile in a file is refused');
  return out;
}


/* ---------------- rows ---------------- */
function rowsFor(M) {
  const { G, RL } = M;
  const P = RL.PRINT_DEFAULTS, R = RL.ROLLER_DEFAULTS;
  const rows = FIXTURES.map((f) => [`fixture: ${f.name}`, f.tile, P, R, { expect: f.expect }]);
  for (let s = 1; s <= NSEEDS; s++) rows.push([`random ${s}`, randomTile(s, G.validate), P, R, {}]);
  rows.push(['default: round 3/7, sheet 2 × 5 (dimples cookies: flagged)', G.defaultTile(), P, { roundA: 3, roundB: 7, cols: 2, rows: 5 }, {}]);
  rows.push(['default: round 8/3, sheet 6 × 3 (B turns more than once to cross the sheet)', G.defaultTile(), P, { roundA: 8, roundB: 3, cols: 6, rows: 3 }, {}]);
  rows.push(['hook: thin print (dough 3, blade 5, wall 0.8, draft 6, peg 4, bore 6)', FIXTURES.find((f) => /hook/.test(f.name)).tile, { ...P, dough: 3, bladeHeight: 5, bladeWall: 0.8, draft: 6, pegSize: 4, bore: 6 }, R, {}]);
  rows.push(['obtuse: deep dough (dough 9, blade 14, peg 10, cylinder 5)', FIXTURES.find((f) => /obtuse/.test(f.name)).tile, { ...P, dough: 9, bladeHeight: 14, pegSize: 10, cylWall: 5 }, R, {}]);
  rows.push(['default: blade cannot clear the dough (refused)', G.defaultTile(), { ...P, dough: 6, bladeHeight: 7 }, R, {}]);
  rows.push(['straight 30 mm square: round 5/4, sheet 2 × 1 (small rollers: the peg feet founded on the hollow\'s roof)', FIXTURES.find((f) => /30 mm square/.test(f.name)).tile, P, { roundA: 5, roundB: 4, cols: 2, rows: 1 }, {}]);
  rows.push(['default: round 2/5 (roller A too small for its bore: refused)', G.defaultTile(), P, { roundA: 2, roundB: 5, cols: 4, rows: 1 }, {}]);
  return rows.filter(([label]) => !ONLY || ONLY.test(label));
}


async function main() {
  const M = await load(ROOT);
  let failed = 0;
  const ec = editorChecks(M);
  for (const [c, m] of ec) { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) failed++; }
  const rows = rowsFor(M);
  for (const [label, tile, print, rollers, opts] of rows) {
    const t0 = performance.now();
    const r = checkRow(M, label, tile, print, rollers, opts);
    const ms = performance.now() - t0;
    const L = r.layout;
    const meta = L ? ` · ⌀ ${L.A.dTip.toFixed(1)}/${L.B.dTip.toFixed(1)} mm · L ${L.A.L.toFixed(0)}/${L.B.L.toFixed(0)} mm · rings ${L.A.rings}/${L.B.rings} · tris ${r.tris.join('/')} · m* ${L.mStar} · flags [${L.flags.map((f) => f.id).join(',')}] · ${ms.toFixed(0)} ms` : '';
    console.log(`${r.fails.length ? 'FAIL' : 'ok  '} ${label}${meta}`);
    if (r.meas && (args.includes('--verbose') || /^fixture: default$/.test(label))) {
      const m = r.meas, f = (x, d = 2) => (x === undefined ? '—' : x.toFixed(d)), e = (x) => (x === undefined ? '—' : x.toExponential(1));
      console.log(`       measured: blade A/B ${f(m.bladeA)}/${f(m.bladeB)} mm above the body · peg dimple ${f(m.pegDepth)} mm, tooth ${f(m.toothDepth)} mm deep · collar band ${f(m.bandAbove)} mm above the board`);
      console.log(`       rings: spacing ${f(r.dm.A && r.dm.A.spacing, 3)}/${f(r.dm.B && r.dm.B.spacing, 3)} mm (off by ${e(Math.max(r.dm.A ? r.dm.A.sp : 0, r.dm.B ? r.dm.B.sp : 0))}) · azimuth gap ${e(Math.max(r.dm.A ? r.dm.A.gap : 0, r.dm.B ? r.dm.B.gap : 0))} rad · extent off ${f(Math.max(r.dm.A ? r.dm.A.ext : 0, r.dm.B ? r.dm.B.ext : 0), 4)} mm · tip within ${f(Math.max(r.sm.tipA || 0, r.sm.tipB || 0), 3)} mm of the spec ring`);
      console.log(`       sheet corners within ${e(r.r4.worst)} mm of both lines · ${r.r4.meetings}/${r.r4.want} line meetings · stamped lines within ${e(Math.max(r.sm.A ?? 0, r.sm.B ?? 0))} mm of ideal (${e(Math.max(r.sm.seamA ?? 0, r.sm.seamB ?? 0))} at the seams) over ${r.sm.revsA}/${r.sm.revsB} revolutions`);
    }
    for (const f of r.fails) console.log('       ' + f);
    if (r.fails.length) failed++;
  }
  const total = ec.length + rows.length;
  console.log(`\n${total - failed}/${total} pass (${ec.length} editor checks + ${rows.length} rows: ${NSEEDS} random).`);
  console.log(failed ? 'VERDICT: FAIL' : ONLY ? `VERDICT: SUBSET PASS (--only ${ONLY}) — not a gate pass` : 'VERDICT: PASS');
  if (args.includes('--browser') && !failed) {
    const { status } = await import('node:child_process').then((cp) => ({ status: cp.spawnSync(process.execPath, [path.join(ROOT, 'tools/verify-tile-page.mjs')], { stdio: 'inherit' }).status }));
    if (status) failed++;
  }
  process.exit(failed ? 1 : 0);
}

/* ---------------- negative control ---------------- */
/* [name, file, from, to, clause, rows] — `rows` picks the rows it runs on. */
const MUTANTS = [
  // the tile
  ['smooth corners lose their periodic neighbour', 'tile-geometry.js', "if (a === 0 && tile.cornerSmooth) { run = [sub2(chain[n - 2], t), ...run]; pre = 1; }", 'if (false) { run = [sub2(chain[n - 2], t), ...run]; pre = 1; }', 'E6', 'none'],
  ['the top edge is not the bottom moved by tB', 'tile-geometry.js', 'for (let k = A.pts.length - 1; k > 0; k--) { pts.push(add2(A.pts[k], tB)); side.push([\'A\', 1, k]); }', 'for (let k = A.pts.length - 1; k > 0; k--) { pts.push(add2(A.pts[k], [tB[0] * 1.02, tB[1] * 1.02])); side.push([\'A\', 1, k]); }', 'T', 'default'],
  ['the validator stops checking simplicity', 'tile-geometry.js', "if (!polygonSimple(o.pts)) return { ok: false, reason: 'the outline would cross or touch itself' };", '', 'E1', 'none'],
  ['a corner resize ignores the opposite corner', 'tile-geometry.js', 'const [sA, sB] = CORNER_SIGNS[corner];', 'const [sA, sB] = [1, 1];', 'E5', 'none'],
  ['the neck test never sees two pieces', 'tile-geometry.js', 'const isNeck = touch.size >= 2;', 'const isNeck = touch.size >= 99;', 'F', 'pinch'],
  ['the close-point flag uses a tenth of the blade', 'tile-geometry.js', 'if (d < bar) out.push({ which, i, j: i + 1, d });', 'if (d < 0.1 * bar) out.push({ which, i, j: i + 1, d });', 'F', 'close points'],
  // the rings: their direction, size, seam and spacing
  ['the line is laid ALONG the axis — a bar, not a ring', 'tile-roller.js', 'const one = d.pts.slice(0, -1).map((p) => F.toUnrolled(p));\n  return { one, T: [F.pitch, 0], frame: F };', 'const one = d.pts.slice(0, -1).map((p) => F.toUnrolled(p).reverse());\n  return { one, T: [0, F.pitch], frame: F };', 'D', 'default'],
  ['the ring spacing ignores the crossing angle', 'tile-roller.js', 'const step = F.toUnrolled(F.tY);', 'const step = [0, len2(F.tY)];', 'D', 'hook'],
  ['a roller carries one ring too few', 'tile-roller.js', "const rings = (which === 'A' ? rollers.rows : rollers.cols) + 1;", "const rings = (which === 'A' ? rollers.rows : rollers.cols);", 'D', 'default'],
  ['the circumference is laid on the other pitch', 'tile-roller.js', 'const C = n * F.pitch, Rtip = C / TAU,', "const C = n * (which === 'A' ? tile.pitchB : tile.pitchA), Rtip = C / TAU,", 'S', 'hook'],
  ['the circumference uses π = 3.14', 'tile-roller.js', 'const C = n * F.pitch, Rtip = C / TAU,', 'const C = n * F.pitch, Rtip = C / 6.28,', 'S', 'default'],
  ['the spec ring\'s copies are laid 0.05 mm off the pitch', 'tile-roller.js', 'const s = one[i][0] + c * T[0] + j * R.step[0]', 'const s = one[i][0] + c * (T[0] + 0.05) + j * R.step[0]', 'S', 'default'],
  ['a ring\'s tube is one copy short, bridged by a chord', 'tile-roller.js', 'for (let c = 0; c < R.n; c++) for (const [s, z] of pts)', 'for (let c = 0; c < R.n - 1; c++) for (const [s, z] of pts)', 'R0', 'default'],
  ['each copy of a ring\'s offset repeats the point the copies meet at', 'tile-roller.js', 'if (a !== undefined && b !== undefined && b > a) return { pts: Q.slice(a, b) };', 'if (a !== undefined && b !== undefined && b > a) return { pts: Q.slice(a, b + 1) };', 'W', 'default'],
  ['the ring tubes are not turned with their lines', 'tile-roller.js', 'const dphi = -(j * R.step[0]) / R.Rtip, dZ = j * R.step[1];', 'const dphi = 0, dZ = j * R.step[1];', 'S', 'hook'],
  ['the spec rings are not turned with their lines', 'tile-roller.js', 'const s = one[i][0] + c * T[0] + j * R.step[0]', 'const s = one[i][0] + c * T[0]', 'R', 'hook'],
  ['the tip face is wound backwards', 'tile-roller.js', 'zipClosed(mesh, Lt, Rt); zipClosed(mesh, Rt, Rr);', 'zipClosed(mesh, Rt, Lt); zipClosed(mesh, Rt, Rr);', 'W', 'default'],
  ['the roller axis points right of the roll', 'tile-roller.js', 'const a = [-r[1], r[0]];', 'const a = [r[1], -r[0]];', 'R', 'default|hook'],
  // the index marks
  ['the pegs sit mid-tile, not on corners', 'tile-roller.js', 'fA.toUnrolled(add2(mul2(fA.tX, layout.mStar), mul2(fA.tY, k)))', 'fA.toUnrolled(add2(mul2(fA.tX, layout.mStar + 0.5), mul2(fA.tY, k)))', 'R', 'hook'],
  ['the peg row runs straight across A, not slanted with the lines', 'tile-roller.js', 'const [s, z] = fA.toUnrolled(add2(mul2(fA.tX, layout.mStar), mul2(fA.tY, k)));', 'const [s, z] = [layout.mStar * A.pitch, k * A.step[1]];', 'R', 'hook'],
  ['the collar teeth sit one column too far out', 'tile-roller.js', 'fB.toUnrolled(add2(mul2(fB.tY, layout.mStar), mul2(fB.tX, j)))', 'fB.toUnrolled(add2(mul2(fB.tY, layout.mStar - 1), mul2(fB.tX, j)))', 'R', 'default'],
  ['the teeth ignore the track\'s phase round B', 'tile-roller.js', 'spec.B.teeth.push({ i: j, phi: -s / B.Rtip, Z: z + B.Z0, rho: B.toothTopRho });', 'spec.B.teeth.push({ i: j, phi: -(j * B.pitch) / B.Rtip, Z: z + B.Z0, rho: B.toothTopRho });', 'R', 'hook'],
  ['a peg stands proud of the blades', 'tile-roller.js', 'A.pegTopRho = A.Rtip - td + delta;', 'A.pegTopRho = A.Rtip + 0.5;', 'R1', 'default'],
  ['the pegs reach through the dough', 'tile-roller.js', 'A.pegTopRho = A.Rtip - td + delta;', 'A.pegTopRho = A.Rtip - 0.2;', 'H2', 'default'],
  ['a peg\'s flat tip is centred on the dough line, its rim past it', 'tile-roller.js', 'const tip = coneBase(topRho, topRho, tipR);', 'const tip = { rho: topRho, r: tipR };', 'H2', 'default'],
  ['a peg foot sinks into the hollow', 'tile-roller.js', 'const rho = Math.min(limit, Math.max(disc >= 0 ? (c + Math.sqrt(disc)) / 2 : c / 2, inner + 0.3));', 'const rho = Math.min(limit, disc >= 0 ? (c + Math.sqrt(disc)) / 2 : c / 2);', 'H4', 'small rollers'],
  // refusals and flags
  ['the STL is never refused', 'tile-roller.js', "if (opts.layout && opts.layout.flags.some((f) => f.stl) && !opts.allowRefused)", 'if (false)', 'W5', 'cannot clear'],
  ['the blade-clearance flag is never raised', 'tile-roller.js', 'if (!(h > td + BODY_CLEARANCE_MM)) out.flags.push', 'if (false) out.flags.push', 'W5', 'cannot clear'],
  ['the too-small refusal is never raised', 'tile-roller.js', "if (R.Rbody < need) out.flags.push({ id: 'small'", "if (false) out.flags.push({ id: 'small'", 'W5', 'too small'],
  ['the recurrence flag is never raised', 'tile-roller.js', 'if (A.n < need) out.flags.push', 'if (false) out.flags.push', 'F', 'dimples cookies'],
];
async function negativeControl() {
  const src = {}; for (const f of ['tile-geometry.js', 'tile-roller.js', 'tile-sim.js']) src[f] = fs.readFileSync(path.join(ROOT, f), 'utf8');
  let ok = true;
  for (const [name, file, from] of MUTANTS) {
    const n = src[file].split(from).length - 1;
    if (n !== 1) { console.log(`ANCHOR ${name}: matches ${n} times in ${file} (must be exactly 1) — the mutant is disarmed`); ok = false; }
  }
  if (!ok) { console.log('\nNEGATIVE CONTROL FAIL (anchors)'); process.exit(1); }
  const clean = await load(ROOT);
  const pick = (M, sel) => (sel === 'none' ? [] : rowsFor(M).filter(([label]) => new RegExp(sel).test(label)));
  // the clean tree must pass every row a mutant uses, and the editor checks
  const cleanFails = [...editorChecks(clean).filter(([c]) => !c).map(([, m]) => m)];
  const used = new Set(MUTANTS.filter(([name]) => !MUT || MUT.test(name)).map((m) => m[5]));
  for (const sel of used) for (const [label, tile, print, rollers, opts] of pick(clean, sel)) cleanFails.push(...checkRow(clean, label, tile, print, rollers, opts).fails);
  console.log(cleanFails.length ? `CLEAN RUN FAILED: ${cleanFails.slice(0, 4).join(' | ')}` : 'clean run: every check passes on every row the mutants use');
  if (cleanFails.length) ok = false;
  let k = 0;
  const run = MUTANTS.filter(([name]) => !MUT || MUT.test(name));
  for (const [name, file, from, to, clause, sel] of run) {
    const dir = path.join(ROOT, `.tile-mutant-${process.pid}-${k++}`);
    fs.mkdirSync(dir, { recursive: true });
    let fails = [];
    try {
      for (const f of Object.keys(src)) {
        let t = src[f].replace("from './bug-geometry.js'", "from '../bug-geometry.js'");
        if (f === file) t = t.replace(from, to);
        fs.writeFileSync(path.join(dir, f), t);
      }
      const M = await load(dir);
      fails = editorChecks(M).filter(([c]) => !c).map(([, m]) => m);
      for (const [label, tile, print, rollers, opts] of pick(M, sel)) {
        try { fails.push(...checkRow(M, label, tile, print, rollers, opts).fails); } catch (e) { fails.push(`(threw) ${e.message}`); }
      }
    } catch (e) { fails.push(`(threw) ${e.message}`); }
    finally { fs.rmSync(dir, { recursive: true, force: true }); }
    const fired = fails.some((f) => f.startsWith(clause));
    const also = [...new Set(fails.map((f) => (/^([A-Z]+\d*):/.exec(f) || [, '?'])[1]))].filter((c) => !c.startsWith(clause));
    console.log(`${fired ? 'CAUGHT' : 'MISSED'} ${name.padEnd(56)} by ${clause.padEnd(3)} — ${fails.filter((f) => f.startsWith(clause)).slice(0, 1).join('') || fails.slice(0, 1).join('') || 'nothing fired'}`.slice(0, 240) + (also.length ? `\n       (also fired: ${also.join(', ')})` : ''));
    if (!fired) ok = false;
  }
  console.log(!ok ? '\nNEGATIVE CONTROL FAIL' : MUT ? `\nNEGATIVE CONTROL SUBSET PASS — ${run.length} of ${MUTANTS.length} mutations (--mutant ${MUT}), each caught by the clause that names it` : `\nNEGATIVE CONTROL PASS — all ${MUTANTS.length} mutations caught by the clause that names each.`);
  process.exit(ok ? 0 : 1);
}

/* ---------------- main ---------------- */
if (NEG) await negativeControl();
else await main();
