#!/usr/bin/env node
/* verify-tile.mjs — the /tile gate (tile-design-doc.md §9). Node only.

   Rows: every hand-drawn tile in tools/tile-fixtures.mjs, N seeded random
   tiles, and parameter rows (unequal repeats and spans, a thin print, a blade
   that cannot clear the dough). For each, through the SHIPPED modules:

     T  TESSELLATION, by this file's own geometry. T1 the outline is simple
        (this file's segment test, not the builder's); T2 its signed area is
        |tA × tB| (1e-9 relative) and the nine tiles of the 3x3 patch sum to 9×;
        T3 a scanline census over the patch finds no x-run covered twice (no
        overlap); T4 a probe 1 µm outside every boundary segment of the centre
        tile lands in exactly one neighbour and 1 µm inside lands in the centre
        tile only (no gap); T5 the top is the bottom + tB and the right the left
        + tA (1e-12).
     S  SEAM. Both rollers rolled three revolutions either way in tile-sim.js:
        every stamped line is labelled by the lattice point its first corner
        landed on (S1: on a lattice point, 1e-6 mm), the rows (A) and columns
        (B) are one contiguous run with each exactly once — across every
        revolution boundary (S2), and every stamped line is the ideal line of
        its row or column, both ways (S3).
     R  REGISTRATION. R0 the mesh is the spec: every bar's tip vertices stand
        within half a blade of its spec centreline and every centreline vertex
        has tip vertices beside it; every peg and tooth cone is centred on its
        spec point. R1 the rolling radius read off the mesh is the blade tips'
        (the blades touch the board). R2 the track: A's pegged bar lays one
        dimple on each corner m = 0..KA of row k*. R3 B, posed by seating one
        collar tooth in the first dimple and rolled both ways: every tooth that
        lands on the track lands in a dimple, and every dimple gets a tooth.
        R4 every corner of the cookie block lies on its A line and its B line
        (1e-6 mm). R5 the block's A and B lines meet at lattice corners only,
        (KA+1)(KB+1) of them.
     W  WATERTIGHT. Each STL (A, B, handle) re-welded from its float32 bytes:
        no unmatched and no duplicated DIRECTED edge (an undirected census passes
        a face wound inside out), no degenerate triangle; every shell's signed
        volume positive. W5 a design whose blade cannot clear the dough is
        REFUSED an STL, with the reason.
     H  HEIGHTS, measured off the mesh. H1 blade height > dough + 1.5 mm;
        H2 peg and tooth tips inside the dough and above the board, the tooth
        shallower than the peg; H3 the collar band above the dough.
     F  FLAGS. Each fixture's neck / spike / close-point flags are exactly the
        ones it expects; the pegged bar's second pass is flagged iff the
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
    if (u < 0 || u > 1) continue;
    const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
    const v = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) / det;
    if (v < 0 || u + v > 1) continue;
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
    if (u < 0 || u > 1) continue;
    const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
    const v = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) / det;
    if (v < 0 || u + v > 1) continue;
    const tt = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) / det;
    if (tt > best) best = tt;
  }
  return best;
}
function heights(M, built, print, meas = {}) {
  const bad = [];
  for (const which of ['A', 'B']) {
    const { mesh } = built[which], P = mesh.positions;
    let tip = 0; for (const p of mesh.parts.filter((q) => /^bar/.test(q.name))) for (let v = p.v0; v < p.v1; v++) tip = Math.max(tip, rad(P, v));
    let roll = 0; for (let v = 0; v < P.length / 3; v++) roll = Math.max(roll, rad(P, v));
    /* The body's OUTER radius between the rims, read by casting rays out from the
       axis against the body's own triangles and keeping the farthest hit — the
       outer skin, never the cavity's or the bore's (a vertex scan cannot tell
       them apart: the outer cylinder has vertices only at its two ends). */
    const body = mesh.parts.find((q) => q.name === 'body');
    let zlo = Infinity, zhi = -Infinity;
    for (let v = body.v0; v < body.v1; v++) { zlo = Math.min(zlo, P[3 * v + 2]); zhi = Math.max(zhi, P[3 * v + 2]); }
    let rbody = Infinity, rband = 0;
    const lo = zlo + 4 + print.bladeHeight + 1, hi = zhi - 4 - print.bladeHeight - 1;
    for (let i = 0; i <= 60; i++) {
      const z = lo + ((hi - lo) * i) / 60;
      for (const ang of [0.1, 1.7, 3.3, 4.9]) {
        const r = outerHit(mesh, body, z, ang);
        rbody = Math.min(rbody, r); rband = Math.max(rband, r);
      }
    }
    const h = tip - rbody;
    meas[`blade${which}`] = h;
    if (which === 'B') meas.bandAbove = roll - rband;
    if (!(h > print.dough + 1.5 - 1e-9)) bad.push(`H1: roller ${which}'s blade stands ${h.toFixed(3)} mm, not more than the dough ${print.dough} + 1.5 mm`);
    if (Math.abs(tip - roll) > 1e-9) bad.push(`R1: roller ${which} rolls on radius ${roll.toFixed(6)} but its blade tips reach ${tip.toFixed(6)} — the blades ${tip < roll ? 'never touch the board' : 'carry it, not the rims'}`);
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
      let vin = c.v0; for (let v = c.v0; v < c.v1; v++) if (rad(P, v) < rad(P, vin)) vin = v;
      const ang = Math.atan2(P[3 * vin + 1], P[3 * vin]), rin = rad(P, vin);
      const hits = crossings(mesh, body, P[3 * vin + 2], ang).filter((t) => t < rin);
      if (hits.length % 2 !== 1) bad.push(`H4: ${which}/${c.name}'s foot (radius ${rin.toFixed(3)} mm) is not inside the body — ${hits.length} skin crossings below it`);
    }
    if (which === 'B') {
      if (!(roll - rband > print.dough)) bad.push(`H3: the collar band reaches ${(roll - rband).toFixed(3)} mm above the board — into the dough`);
      const pegTip = Math.max(...built.A.mesh.parts.filter((q) => /^peg/.test(q.name)).map((q) => { let r = 0; for (let v = q.v0; v < q.v1; v++) r = Math.max(r, rad(built.A.mesh.positions, v)); return r; }));
      const toothTip = Math.max(...cones.map((q) => { let r = 0; for (let v = q.v0; v < q.v1; v++) r = Math.max(r, rad(P, v)); return r; }));
      const pegDepth = print.dough - (Math.max(...[built.A].map((b) => { let rr = 0; for (let v = 0; v < b.mesh.positions.length / 3; v++) rr = Math.max(rr, rad(b.mesh.positions, v)); return rr; })) - pegTip);
      const toothDepth = print.dough - (roll - toothTip);
      meas.pegDepth = pegDepth; meas.toothDepth = toothDepth;
      if (!(toothDepth < pegDepth)) bad.push(`H2: a tooth reaches ${toothDepth.toFixed(3)} mm into the dough, not shallower than the peg's ${pegDepth.toFixed(3)} mm dimple`);
    }
  }
  return bad;
}
function meshIsSpec(M, built, layout) {
  const bad = [];
  for (const which of ['A', 'B']) {
    const { mesh, spec } = built[which], P = mesh.positions, R = spec.Rtip;
    const halfTip = layout.wTip / 2;
    spec.bars.forEach((bar, j) => {
      const part = mesh.parts.find((q) => q.name === `bar${j}`);
      const cen = bar.map(([phi, Z]) => [R * Math.cos(phi), R * Math.sin(phi), Z]);
      const d3 = (p, a, b) => { const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1e-30; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / L2)); return Math.hypot(p[0] - a[0] - t * ab[0], p[1] - a[1] - t * ab[1], p[2] - a[2] - t * ab[2]); };
      const tips = [];
      for (let v = part.v0; v < part.v1; v++) if (Math.abs(rad(P, v) - R) < 1e-9) tips.push([P[3 * v], P[3 * v + 1], P[3 * v + 2]]);
      let worst = 0;
      for (const t of tips) { let b = Infinity; for (let k = 0; k + 1 < cen.length; k++) b = Math.min(b, d3(t, cen[k], cen[k + 1])); worst = Math.max(worst, b); }
      if (worst > halfTip + 0.05) bad.push(`R0: ${which}/bar${j}'s tip stands ${worst.toFixed(3)} mm from its spec centreline (half a blade is ${halfTip.toFixed(3)})`);
      let lonely = 0;
      for (const c of cen) { let b = Infinity; for (const t of tips) b = Math.min(b, Math.hypot(t[0] - c[0], t[1] - c[1], t[2] - c[2])); if (b > halfTip + 0.6) lonely++; }
      if (lonely) bad.push(`R0: ${lonely} of ${which}/bar${j}'s spec centreline points have no blade tip beside them`);
    });
    for (const f of [...(spec.pegs || []).map((p) => ['peg', p]), ...(spec.teeth || []).map((p) => ['tooth', p])]) {
      const [kind, s] = f;
      const part = mesh.parts.find((q) => q.name === `${kind}${s.m}`);
      if (!part) { bad.push(`R0: no mesh for ${which}/${kind}${s.m}`); continue; }
      // a frustum's rings are circles about its axis: the mean of all its vertices is on the axis
      let x = 0, y = 0, z = 0; const nv = part.v1 - part.v0;
      for (let v = part.v0; v < part.v1; v++) { x += P[3 * v]; y += P[3 * v + 1]; z += P[3 * v + 2]; }
      x /= nv; y /= nv; z /= nv;
      const phi = Math.atan2(y, x), dphi = Math.atan2(Math.sin(phi - s.phi), Math.cos(phi - s.phi));
      if (Math.abs(dphi) * R > 0.05 || Math.abs(z - s.Z) > 0.05) bad.push(`R0: ${which}/${kind}${s.m} is built ${(Math.abs(dphi) * R).toFixed(3)} mm round and ${Math.abs(z - s.Z).toFixed(3)} mm along from its spec point`);
    }
  }
  return bad;
}

/* ---------------- R and S ---------------- */
function registration(M, tile, built, r4 = {}) {
  const { S } = M, bad = [];
  const sim = S.simulate(tile, built, { revs: 1 });
  const { KA, KB, kStar } = sim;
  // R2 the track
  const track = sim.dimples.filter((d) => d.lk === kStar);
  for (let m = 0; m <= KA; m++) {
    const at = track.filter((d) => d.lm === m);   // the pegged bar's later passes land rows of n_A further on
    if (at.length !== 1) { bad.push(`R2: corner (${m}, ${kStar}) of the track has ${at.length} dimples`); continue; }
    const c = S.cornerOf(tile, sim, m, kStar), e = Math.hypot(at[0].at[0] - c[0], at[0].at[1] - c[1]);
    if (e > TOL) bad.push(`R2: the dimple for corner (${m}, ${kStar}) is ${e.toExponential(2)} mm off the corner`);
  }
  // R3 teeth in dimples
  const tr = S.trackDimples(sim);
  const onTrack = sim.teeth.filter((t) => t.lk === kStar && t.lm >= 0 && t.lm <= KA);
  let stray = 0;
  for (const t of onTrack) if (!tr.some((d) => Math.hypot(d.at[0] - t.at[0], d.at[1] - t.at[1]) < TOL)) stray++;
  const fed = tr.filter((d) => onTrack.some((t) => Math.hypot(d.at[0] - t.at[0], d.at[1] - t.at[1]) < TOL)).length;
  if (stray) bad.push(`R3: ${stray} collar teeth land on the track beside its dimples`);
  if (fed !== tr.length) bad.push(`R3: ${tr.length - fed} of ${tr.length} track dimples receive no tooth`);
  const offTrack = sim.teeth.filter((t) => !(t.lk === kStar)).length;
  if (offTrack && !sim.teeth.some((t) => t.lk === kStar)) bad.push('R3: no collar tooth lands on the track row at all');
  // R4 corners on both lines
  const { a, b } = S.blockLines(sim);
  let worstA = 0, worstB = 0, missing = 0;
  for (let m = 0; m <= KA; m++) for (let k = 0; k <= KB; k++) {
    const c = S.cornerOf(tile, sim, m, k);
    const la = a.find((L) => L.k === k), lb = b.find((L) => L.m === m);
    if (!la || !lb) { missing++; continue; }
    worstA = Math.max(worstA, polyDist(c, la.pts)); worstB = Math.max(worstB, polyDist(c, lb.pts));
  }
  if (missing) bad.push(`R4: ${missing} corners of the block have no A line or no B line stamped through their row / column`);
  r4.worst = Math.max(worstA, worstB);
  if (worstA > TOL || worstB > TOL) bad.push(`R4: a block corner stands ${worstA.toExponential(2)} mm off its A line, ${worstB.toExponential(2)} mm off its B line`);
  // R5 meetings only at corners
  const cs = S.contacts(a, b, TOL);
  let off = 0;
  for (const p of cs) { const [u, v] = S.latticeOf(tile, sim, p); const c = S.cornerOf(tile, sim, Math.round(u), Math.round(v)); if (Math.hypot(c[0] - p[0], c[1] - p[1]) > 10 * TOL) off++; }
  if (off) bad.push(`R5: the block's A and B lines meet at ${off} points that are not tile corners`);
  r4.meetings = cs.length - off; r4.want = (KA + 1) * (KB + 1);
  if (cs.length - off !== (KA + 1) * (KB + 1)) bad.push(`R5: ${cs.length - off} corner meetings, not ${(KA + 1) * (KB + 1)}`);
  // F: the pegged bar's second pass lands on a cookie corner iff flagged
  const cookieDimples = sim.dimples.filter((d) => d.lk >= 0 && d.lk <= KB && d.lm >= 0 && d.lm <= KA).length;
  const flagged = built.layout.flags.some((f) => f.id === 'pegRecur');
  if ((cookieDimples > 0) !== flagged) bad.push(`F: the simulation lands ${cookieDimples} dimples on cookie corners but the recurrence flag is ${flagged ? 'raised' : 'not raised'}`);
  return { bad, sim };
}
function seam(M, tile, built, sm = {}) {
  const { S } = M, bad = [];
  const sim = S.simulate(tile, built, { revs: 3 });
  for (const [fam, lines, KX] of [['A', sim.aLines, sim.KA], ['B', sim.bLines, sim.KB]]) {
    const worstOff = Math.max(...lines.map((L) => L.off));
    const pitch = fam === 'A' ? tile.pitchB : tile.pitchA;
    if (worstOff * pitch > TOL) bad.push(`S1: a stamped ${fam} line starts ${(worstOff * pitch).toExponential(2)} mm off a lattice point`);
    const idx = lines.map((L) => (fam === 'A' ? L.k : L.m)).sort((p, q) => p - q);
    let gaps = 0, dups = 0;
    for (let i = 1; i < idx.length; i++) { if (idx[i] === idx[i - 1]) dups++; else if (idx[i] !== idx[i - 1] + 1) gaps++; }
    if (gaps || dups) bad.push(`S2: roller ${fam}'s stamped ${fam === 'A' ? 'rows' : 'columns'} over three revolutions skip ${gaps} and repeat ${dups} (${idx[0]}..${idx[idx.length - 1]})`);
    const revs = new Set(lines.map((L) => L.rev));
    if (revs.size < 3) bad.push(`S2: roller ${fam} was stamped over ${revs.size} revolutions, not at least 3`);
    let worst = 0;
    for (const L of lines) {
      const ideal = fam === 'A' ? S.idealLine(tile, sim, 'A', L.m, L.k, -1, KX + 1) : S.idealLine(tile, sim, 'B', L.m, L.k, -1, KX + 1);
      for (const p of L.pts) worst = Math.max(worst, polyDist(p, ideal));
      const core = fam === 'A' ? S.idealLine(tile, sim, 'A', L.m, L.k, 0, KX - 1) : S.idealLine(tile, sim, 'B', L.m, L.k, 0, KX - 1);
      for (let i = 0; i < core.length; i += 3) worst = Math.max(worst, polyDist(core[i], L.pts));
    }
    sm[fam] = worst; sm[`revs${fam}`] = new Set(lines.map((L) => L.rev)).size;
    if (worst > TOL) bad.push(`S3: a stamped ${fam} line departs ${worst.toExponential(2)} mm from the ideal line of its ${fam === 'A' ? 'row' : 'column'}`);
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
  const meas = {}, r4 = {}, sm = {};
  const hb = heights(M, built, print, meas);
  const why = [];
  for (const which of ['A', 'B']) {
    if (!(meas[`blade${which}`] > print.dough + 1.5 - 1e-9)) why.push(`${which}'s blade stands ${meas[`blade${which}`].toFixed(2)} mm against ${print.dough} + 1.5`);
    const body = meas[`roll${which}`] - print.bladeHeight;
    if (body < print.bore / 2 + print.cylWall + 0.4 - 1e-9) why.push(`${which}'s body is ${(2 * body).toFixed(1)} mm across round a ${print.bore} mm bore`);
  }
  if ((why.length > 0) !== refused) fails.push(`W5: the STL is ${refused ? 'refused' : 'exported'} while ${why.length ? why.join('; ') : 'the rollers measure sound'}`);
  if (!refused) { fails.push(...w.bad); fails.push(...hb); }
  fails.push(...meshIsSpec(M, built, built.layout));
  const r = registration(M, tile, built, r4);
  fails.push(...r.bad);
  if (!opts.noSeam) fails.push(...seam(M, tile, built, sm));
  fails.push(...shapeFlags(M, tile, print, opts.expect));
  return { label, fails, tris: [w.info.A.n, w.info.B.n, w.info.handle.n], bytes: [w.info.A.bytes, w.info.B.bytes, w.info.handle.bytes], layout: built.layout, meas, r4, sm };
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
  rows.push(['default: repeats 3/7, spans 2/5 (dimples cookies: flagged)', G.defaultTile(), P, { repeatsA: 3, repeatsB: 7, spanA: 2, spanB: 5 }, {}]);
  rows.push(['default: repeats 8/3, spans 6/1 (B turns twice to cross the block)', G.defaultTile(), P, { repeatsA: 8, repeatsB: 3, spanA: 6, spanB: 1 }, {}]);
  rows.push(['hook: thin print (dough 3, blade 5, wall 0.8, draft 6, peg 4, bore 6)', FIXTURES.find((f) => /hook/.test(f.name)).tile, { ...P, dough: 3, bladeHeight: 5, bladeWall: 0.8, draft: 6, pegSize: 4, bore: 6 }, R, {}]);
  rows.push(['obtuse: deep dough (dough 9, blade 14, peg 10, cylinder 5)', FIXTURES.find((f) => /obtuse/.test(f.name)).tile, { ...P, dough: 9, bladeHeight: 14, pegSize: 10, cylWall: 5 }, R, {}]);
  rows.push(['default: blade cannot clear the dough (refused)', G.defaultTile(), { ...P, dough: 6, bladeHeight: 7 }, R, {}]);
  rows.push(['default: repeats 3/3, spans 2/1 (small rollers: the pegs founded below the curve)', G.defaultTile(), P, { repeatsA: 3, repeatsB: 3, spanA: 2, spanB: 1 }, {}]);
  rows.push(['default: repeats 2/5 (roller A too small for its bore: refused)', G.defaultTile(), P, { repeatsA: 2, repeatsB: 5, spanA: 4, spanB: 1 }, {}]);
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
    const meta = L ? ` · D ${L.A.dTip.toFixed(1)}/${L.B.dTip.toFixed(1)} mm · L ${L.A.L.toFixed(0)}/${L.B.L.toFixed(0)} mm · tris ${r.tris.join('/')} · k* ${L.kStar} · flags [${L.flags.map((f) => f.id).join(',')}] · ${ms.toFixed(0)} ms` : '';
    console.log(`${r.fails.length ? 'FAIL' : 'ok  '} ${label}${meta}`);
    if (r.meas && (args.includes('--verbose') || /^fixture: default$/.test(label))) {
      const m = r.meas, f = (x, d = 2) => (x === undefined ? '—' : x.toFixed(d));
      console.log(`       measured: blade A/B ${f(m.bladeA)}/${f(m.bladeB)} mm above the body · peg dimple ${f(m.pegDepth)} mm, tooth ${f(m.toothDepth)} mm deep · collar band ${f(m.bladeB === undefined ? undefined : m.bandAbove)} mm above the board · block corners within ${(r.r4.worst ?? NaN).toExponential(1)} mm of both lines · ${r.r4.meetings}/${r.r4.want} line meetings · stamped lines within ${Math.max(r.sm.A ?? 0, r.sm.B ?? 0).toExponential(1)} mm of ideal over ${r.sm.revsA}/${r.sm.revsB} revolutions`);
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
  ['smooth corners lose their periodic neighbour', 'tile-geometry.js', "if (a === 0 && tile.cornerSmooth) { run = [sub2(chain[n - 2], t), ...run]; pre = 1; }", 'if (false) { run = [sub2(chain[n - 2], t), ...run]; pre = 1; }', 'E6', 'none'],
  ['the top edge is not the bottom moved by tB', 'tile-geometry.js', 'for (let k = A.pts.length - 1; k > 0; k--) { pts.push(add2(A.pts[k], tB)); side.push([\'A\', 1, k]); }', 'for (let k = A.pts.length - 1; k > 0; k--) { pts.push(add2(A.pts[k], [tB[0] * 1.02, tB[1] * 1.02])); side.push([\'A\', 1, k]); }', 'T', 'default'],
  ['the validator stops checking simplicity', 'tile-geometry.js', "if (!polygonSimple(o.pts)) return { ok: false, reason: 'the outline would cross or touch itself' };", '', 'E1', 'none'],
  ['a corner resize ignores the opposite corner', 'tile-geometry.js', 'const [sA, sB] = CORNER_SIGNS[corner];', 'const [sA, sB] = [1, 1];', 'E5', 'none'],
  ['the neck test never sees two pieces', 'tile-geometry.js', 'const isNeck = touch.size >= 2;', 'const isNeck = touch.size >= 99;', 'F', 'pinch'],
  ['the close-point flag uses a tenth of the blade', 'tile-geometry.js', 'if (d < bar) out.push({ which, i, j: i + 1, d });', 'if (d < 0.1 * bar) out.push({ which, i, j: i + 1, d });', 'F', 'close points'],
  ['the roller axis points right of the roll', 'tile-roller.js', 'const a = [-r[1], r[0]];', 'const a = [r[1], -r[0]];', 'R', 'default|hook'],
  ['each roller is laid out on its own pitch, not the other', 'tile-roller.js', "const pitchRoll = which === 'A' ? tile.pitchB : tile.pitchA;", "const pitchRoll = which === 'A' ? tile.pitchA : tile.pitchB;", 'R', 'hook'],
  ['the circumference uses π = 3.14', 'tile-roller.js', 'const C = n * pitchRoll, Rtip = C / TAU,', 'const C = n * pitchRoll, Rtip = C / 6.28,', 'S', 'default'],
  ['the collar teeth sit one row too far out', 'tile-roller.js', 'const P = add2(mul2(fB.tY, m), mul2(fB.tX, layout.kStar));', 'const P = add2(mul2(fB.tY, m), mul2(fB.tX, layout.kStar - 1));', 'R', 'default'],
  ['the teeth ignore the slant of the bars', 'tile-roller.js', 'spec.B.teeth.push({ m, phi: -s / B.Rtip, Z: z + B.Z0, rho: B.toothTopRho });', 'spec.B.teeth.push({ m, phi: -(m * B.pitchRoll) / B.Rtip, Z: z + B.Z0, rho: B.toothTopRho });', 'R', 'hook'],
  ['the pegs sit mid-tile, not on corners', 'tile-roller.js', 'const [s, z] = fA.toUnrolled(mul2(fA.tX, m));\n    spec.A.pegs.push', 'const [s, z] = fA.toUnrolled(mul2(fA.tX, m + 0.5));\n    spec.A.pegs.push', 'R', 'default'],
  ['a bar loses its start cap', 'tile-roller.js', 'mesh.t(Lt[s].id, Rt[s].id, Rr[s].id); mesh.t(Lt[s].id, Rr[s].id, Lr[s].id);', '', 'W', 'default'],
  ['the tip face is wound backwards', 'tile-roller.js', 'zip(mesh, Lt, Rt); zip(mesh, Rt, Rr);', 'zip(mesh, Rt, Lt); zip(mesh, Rt, Rr);', 'W', 'default'],
  ['the rims stand proud of the blades', 'tile-roller.js', 'const { Rtip, Rbody, L } = R;\n  const rb = print.bore / 2', 'const { Rbody, L } = R; const Rtip = R.Rtip + 0.5;\n  const rb = print.bore / 2', 'R1', 'default'],
  ['the STL is never refused', 'tile-roller.js', "if (opts.layout && opts.layout.flags.some((f) => f.stl) && !opts.allowRefused)", 'if (false)', 'W5', 'cannot clear'],
  ['the recurrence flag is never raised', 'tile-roller.js', 'if (A.n < need) out.flags.push', 'if (false) out.flags.push', 'F', 'dimples cookies'],
  ['the blade-clearance flag is never raised', 'tile-roller.js', 'if (!(h > td + BODY_CLEARANCE_MM)) out.flags.push', 'if (false) out.flags.push', 'W5', 'cannot clear'],
  ['the pegs reach through the dough', 'tile-roller.js', 'A.pegTopRho = A.Rtip - td + delta;', 'A.pegTopRho = A.Rtip - 0.2;', 'H2', 'default'],
  ['a peg\'s flat tip is centred on the dough line, its rim past it', 'tile-roller.js', 'const tip = coneBase(topRho, topRho, tipR);', 'const tip = { rho: topRho, r: tipR };', 'H2', 'default'],
  ['a peg foot sinks into the hollow', 'tile-roller.js', 'const rho = Math.min(limit, Math.max(disc >= 0 ? (c + Math.sqrt(disc)) / 2 : c / 2, inner + 0.3));', 'const rho = Math.min(limit, disc >= 0 ? (c + Math.sqrt(disc)) / 2 : c / 2);', 'H4', 'small rollers|30 mm square'],
  ['the too-small refusal is never raised', 'tile-roller.js', "if (R.Rbody < need) out.flags.push({ id: 'small'", "if (false) out.flags.push({ id: 'small'", 'W5', 'too small'],
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
  const used = new Set(MUTANTS.map((m) => m[5]));
  for (const sel of used) for (const [label, tile, print, rollers, opts] of pick(clean, sel)) cleanFails.push(...checkRow(clean, label, tile, print, rollers, { ...opts, noSeam: false }).fails);
  console.log(cleanFails.length ? `CLEAN RUN FAILED: ${cleanFails.slice(0, 4).join(' | ')}` : 'clean run: every check passes on every row the mutants use');
  if (cleanFails.length) ok = false;
  let k = 0;
  for (const [name, file, from, to, clause, sel] of MUTANTS) {
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
    console.log(`${fired ? 'CAUGHT' : 'MISSED'} ${name.padEnd(52)} by ${clause.padEnd(3)} — ${fails.filter((f) => f.startsWith(clause)).slice(0, 1).join('') || fails.slice(0, 1).join('') || 'nothing fired'}`.slice(0, 220) + (also.length ? `\n       (also fired: ${also.join(', ')})` : ''));
    if (!fired) ok = false;
  }
  console.log(ok ? '\nNEGATIVE CONTROL PASS — every mutation caught by the clause that names it.' : '\nNEGATIVE CONTROL FAIL');
  process.exit(ok ? 0 : 1);
}

/* ---------------- main ---------------- */
if (NEG) await negativeControl();
else await main();
