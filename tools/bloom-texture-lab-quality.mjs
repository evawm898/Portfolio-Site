#!/usr/bin/env node
/* ===================================================================
   bloom-texture-lab-quality.mjs — TRIANGLE QUALITY OF THE SURFACE-TEXTURE
   PROTOTYPE'S SPLIT, AND THE CHECK THAT THE SPLIT DOES NOT MAKE SLIVERS
   (T1 of docs/bloom-surface-texture-discovery.md §10; prototype only, not a
   gate; nothing runs it in CI).

   For each demo state x edge target x split ('rows', the T1 split, and
   'redgreen', the discovery's), per organ: the triangle count against two
   references, the smallest-angle percentiles, the aspect (Lmax^2 / 2A, 1.155
   for an equilateral), and how many triangles are under 1 and 5 degrees.

   THE TWO REFERENCES, NAMED (CLAUDE.md, durable rule 4 — neither is read off
   the split under test; both come from the SHIPPED soup and the edge target):
     IDEAL  2A/e^2 — a regular lattice of edge e over the organ's area. Not
            reachable by any split that keeps the shipped vertices: the stem's
            circumference is 48 sectors of 0.39 mm (outer) and 0.20 mm (bore),
            already under e.
     FLOOR  sum over shipped triangles of max(n_ab + n_bc + n_ca - 2, 2A/e^2),
            n = ceil(L/e) per edge. A triangle whose three edges are cut into
            n_ab + n_bc + n_ca points is a polygon of that many vertices and
            needs at least that many minus two triangles to tile; a fat one
            needs interior points too, at about the lattice's density. It is
            the least any CONFORMING split that keeps the shipped edges can
            emit.

   THE CHECK (TQ), asserted on the 'rows' split for every state and edge:
     TQ0  watertight, in INDEX space (the split's own topology): 0 boundary
          edges, and every non-manifold edge belongs to pieces of shipped
          triangles that are ALREADY non-manifold — the infill carries 224
          such edges by design (coincident sheets), and a deterministic split
          of two coincident sheets makes the same rows on both, so their
          interior edges coincide too. A non-manifold edge on a shipped
          triangle that had none is the split's. The float32 census (the STL gates'
          view) is reported beside it: it also merges coincident points of
          DIFFERENT shells, so a split whose points on two overlapping shells
          happen to land on one float32 position reads extra non-manifold
          edges there without either shell being open (rows at 0.6 mm: 60 on
          the default, all index-clean).
     TQ1  count: every organ within 2.0x its FLOOR. Measured on the shipped
          tree: 'rows' reads 1.00-1.48x on every organ of every state at 0.6
          and 0.4 mm; 'redgreen' reads 11.1x / 21.9x on the stem. The bar is
          set between the two distributions, not on either.
     TQ2  no fans: per shipped triangle, the sub-1-degree pieces it yields
          are at most what its OWN geometry forces. A corner of angle alpha
          whose sides are cut into segments of e is under 1 degree for the
          first ~1/alpha segments out from it (its width there is x*alpha),
          two pieces a segment: the allowance is the sum over the three
          corners of 2*ceil(1 deg / alpha) (2 for a corner of 1 degree or
          more). A CAP — altitude onto its longest edge under e*tan(1 deg),
          0.0105 mm at 0.6 and 0.0070 at 0.4 — is thin all the way along, so
          every piece may be, and its allowance is TQ1's own bar on its own
          floor: 2.0 x (n_ab + n_bc + n_ca - 2). (The infill's cell skins
          carry such caps: 1.904 x 0.006 mm and 2.006 x 0.003 mm, angles
          0.15-0.40 / 179.3-179.7 degrees; 'rows' cuts them into 14-17 pieces
          against a polygon floor of 10.) AND A COPLANAR STRIP QUAD IS ONE
          REGION: two shipped triangles sharing their mutual longest edge,
          coplanar, convex, both rails at least as long (in segments) as
          either end, are judged as the quad they form, its allowance summed
          over the QUAD's four corners — a 55.89 x 0.39 mm stem wall quad has
          four right angles and forces no sliver at all; only cutting it as
          two triangles does (measured: 119 bore folds at 0.6 mm that way,
          with every lone triangle inside its own allowance). The tool
          RESTATES that criterion (`restatedQuads`, written a second time on
          purpose) rather than reading the split's own pairs: a split that
          stopped pairing would otherwise hand over the very grouping that
          excuses it.
     TQ3  partition: each shipped triangle's pieces sum to its area (relative
          1e-9) and every piece faces the way its source does.

   --control  THE NEGATIVE CONTROL (required before quoting a pass from a
     changed tool): the discovery's 'redgreen' split must FAIL TQ1 and TQ2 on
     the stem of the whole bloom, and two mutants of 'rows', built in copies of
     the core, must fail what they name: `the-base-row-is-recut` (each triangle cuts
     its base row afresh, so neighbours stop sharing vertices -> TQ0),
     `apex-at-the-long-edge` (a triangle's apex is chosen opposite the edge
     with the MOST segments, so it fans from its far corner -> TQ2) and
     `the-quad-rows-fan-from-one-corner` (a paired quad's rows all run to one
     corner -> TQ2 on the stem, whose walls are such quads), and
     `quads-are-cut-as-two-triangles` (no quad is paired — T1's intermediate,
     which reads 119 bore folds at 0.6 mm -> TQ2 on the stem).

   Usage: node tools/bloom-texture-lab-quality.mjs [--out <json>] [--control]
          [--only default,whole,infill,tube] [--edges 0.6,0.4]
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as C from '../bloom-texture-lab-core.js';
import { DEFAULTS } from '../bloom-registry.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const OUT = arg('--out', null);
const CONTROL = args.includes('--control');
const ONLY = arg('--only', 'default,whole,infill,tube').split(',');
const EDGES = arg('--edges', '0.6,0.4').split(',').map(Number);
const FLOOR_BAR = 2.0;
const SLIVER_DEG = 1;

const d2 = (P, i, j) => (P[i * 3] - P[j * 3]) ** 2 + (P[i * 3 + 1] - P[j * 3 + 1]) ** 2 + (P[i * 3 + 2] - P[j * 3 + 2]) ** 2;
function areaN(P, a, b, c) {
  const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2];
  const vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  return [nx, ny, nz, Math.hypot(nx, ny, nz) / 2];
}
const pct = (arr, q) => { if (!arr.length) return null; const a = Float64Array.from(arr).sort(); return a[Math.min(a.length - 1, Math.floor(q * a.length))]; };
const r = (x, k = 3) => (x == null || !Number.isFinite(x) ? x : +x.toFixed(k));

/* everything about one split of one welded soup: per organ stats + TQ0..TQ3 */
export function assess(core, soup, base, e, split) {
  const t0 = Date.now();
  const s = core.subdivide(base, e, [], { split, canPair: core.pairPredicate(soup) });
  const ms = Date.now() - t0;
  const nS = base.tri.length / 3;
  /* references from the SHIPPED soup */
  const segs = (i, j) => { const d = d2(base.P, i, j); return d <= e * e ? 1 : Math.ceil(Math.sqrt(d) / e); };
  const capH = e * Math.tan(SLIVER_DEG * Math.PI / 180);
  const allowOf = new Int32Array(nS);
  const quad = restatedQuads(soup, base, e * e, segs);
  const srcRow = new Map(); base.src.forEach((sid, t) => srcRow.set(sid, t));
  /* a paired quad's pieces all carry its first source; TQ2 and TQ3 read the
     pair as one group (its two areas and allowances summed) */
  const groupOf = Int32Array.from({ length: nS }, (_, t) => t);
  for (const [a, b] of s.pairs || []) groupOf[srcRow.get(b)] = srcRow.get(a);
  const org = {};
  const O = (o) => org[o] || (org[o] = { shipped: 0, area: 0, ideal: 0, floor: 0, tris: 0, ang: [], asp: [], under1: 0, under5: 0, worstExcess: 0, excessSources: 0 });
  const srcArea = new Float64Array(nS), srcN = [];
  for (let t = 0; t < nS; t++) {
    const a = base.tri[t * 3], b = base.tri[t * 3 + 1], c = base.tri[t * 3 + 2];
    const [nx, ny, nz, A] = areaN(base.P, a, b, c);
    srcArea[t] = A; srcN.push([nx, ny, nz]);
    const la = Math.sqrt(d2(base.P, b, c)), lb = Math.sqrt(d2(base.P, c, a)), lc = Math.sqrt(d2(base.P, a, b));
    if (quad.partner[t] >= 0) { if (quad.partner[t] > t) allowOf[t] = quad.allow[t]; }
    else if (2 * A / Math.max(la, lb, lc) < capH) allowOf[t] = Math.floor(FLOOR_BAR * (segs(a, b) + segs(b, c) + segs(c, a) - 2));
    else for (const [o1, o2, opp] of [[lb, lc, la], [lc, la, lb], [la, lb, lc]]) {
      const cosA = Math.max(-1, Math.min(1, (o1 * o1 + o2 * o2 - opp * opp) / (2 * o1 * o2)));
      const deg = Math.acos(cosA) * 180 / Math.PI;
      allowOf[t] += 2 * Math.ceil(SLIVER_DEG / Math.max(deg, 1e-6));
    }
    const o = O(core.ORGANS[soup.organIx[base.src[t]]]);
    o.shipped++; o.area += A; o.ideal += 2 * A / (e * e);
    o.floor += Math.max(segs(a, b) + segs(b, c) + segs(c, a) - 2, 2 * A / (e * e));
  }
  const q = core.triangleQuality(s.P, s.tri);
  const pieceArea = new Float64Array(nS), slivers = new Int32Array(nS);
  const quadRep = (k) => (quad.partner[k] >= 0 ? Math.min(k, quad.partner[k]) : k);
  let flipped = 0;
  for (let t = 0; t < s.tri.length / 3; t++) {
    const k = srcRow.get(s.src[t]);
    const o = O(core.ORGANS[soup.organIx[s.src[t]]]);
    o.tris++; o.ang.push(q.minAngle[t]); o.asp.push(q.aspect[t]);
    if (q.minAngle[t] < SLIVER_DEG) { o.under1++; slivers[quadRep(k)]++; }
    if (q.minAngle[t] < 5) o.under5++;
    const [nx, ny, nz, A] = areaN(s.P, s.tri[t * 3], s.tri[t * 3 + 1], s.tri[t * 3 + 2]);
    pieceArea[k] += A;
    const sn = srcN[k];
    if (A > 0 && nx * sn[0] + ny * sn[1] + nz * sn[2] < 0) flipped++;
  }
  for (let k = 0; k < nS; k++) if (groupOf[k] !== k) { srcArea[groupOf[k]] += srcArea[k]; srcArea[k] = 0; }
  let areaBad = 0, worstArea = 0;
  for (let k = 0; k < nS; k++) {
    const rel = Math.abs(pieceArea[k] - srcArea[k]) / Math.max(srcArea[k], 1e-12);
    if (srcArea[k] > 0 && rel > 1e-9) { areaBad++; worstArea = Math.max(worstArea, rel); }
    const ex = slivers[k] - allowOf[k];
    if (ex > 0) { const o = O(core.ORGANS[soup.organIx[base.src[k]]]); o.excessSources++; o.worstExcess = Math.max(o.worstExcess, ex); }
  }
  const census = core.edgeCensus(s.P, s.tri);
  const idx = indexCensus(s.tri), baseIdx = indexCensus(base.tri);
  /* shipped triangles that carry a non-manifold edge, and every piece's group */
  const nmKey = new Set(baseIdx.nmEdges.map(([i, j]) => i * 4294967296 + j));
  const nmSrc = new Uint8Array(nS);
  for (let t = 0; t < nS; t++) for (let k = 0; k < 3; k++) {
    const a = base.tri[t * 3 + k], b = base.tri[t * 3 + (k + 1) % 3];
    if (nmKey.has(a < b ? a * 4294967296 + b : b * 4294967296 + a)) nmSrc[groupOf[t]] = 1;
  }
  let nmNew = 0;
  for (const tris of idx.nmUsers) if (tris.some((pt) => !nmSrc[srcRow.get(s.src[pt])])) nmNew++;
  const organs = {};
  for (const [name, o] of Object.entries(org)) {
    organs[name] = {
      shipped: o.shipped, areaMm2: r(o.area, 1), tris: o.tris,
      ideal: Math.round(o.ideal), floor: Math.round(o.floor), xIdeal: r(o.tris / o.ideal, 2), xFloor: r(o.tris / o.floor, 2),
      minAngleP1: r(pct(o.ang, 0.01), 2), minAngleP5: r(pct(o.ang, 0.05), 2), minAngleP50: r(pct(o.ang, 0.5), 2),
      aspectP50: r(pct(o.asp, 0.5), 2), aspectP99: r(pct(o.asp, 0.99), 1), aspectMax: r(pct(o.asp, 1), 0),
      under1: o.under1, under5: o.under5, under1Pct: r(100 * o.under1 / o.tris, 2), fanSources: o.excessSources, worstFanExcess: o.worstExcess,
    };
  }
  const fails = [];
  if (idx.boundary !== 0) fails.push(`TQ0: ${idx.boundary} boundary edges (index space)`);
  if (nmNew) fails.push(`TQ0: ${nmNew} non-manifold edges (index space) on shipped triangles that had none`);
  for (const [name, o] of Object.entries(organs)) {
    if (o.xFloor > FLOOR_BAR) fails.push(`TQ1: ${name} ${o.tris} triangles = ${o.xFloor}x its conforming floor ${o.floor} (bar ${FLOOR_BAR}x)`);
    if (o.fanSources > 0) fails.push(`TQ2: ${name}: ${o.fanSources} shipped triangles yield more sub-${SLIVER_DEG}-degree triangles than their own apex forces (worst +${o.worstFanExcess})`);
  }
  if (areaBad || flipped) fails.push(`TQ3: ${areaBad} shipped triangles whose pieces do not sum to their area (worst rel ${worstArea.toExponential(2)}), ${flipped} pieces flipped`);
  return { split, edgeMm: e, tris: s.tri.length / 3, ms, quadPairs: (s.pairs || []).length, census, indexCensus: { boundary: idx.boundary, nonManifold: idx.nonManifold, nonManifoldNew: nmNew, shippedNonManifold: baseIdx.nonManifold }, organs, fails };
}
/* THE COPLANAR STRIP QUADS OF THE SHIPPED SOUP, restated from the split's
   criterion (bloom-texture-lab-core.js `quadPairs`) and NOT imported: same
   organ / feature / instance, the shared edge the longest of both and used
   by no third triangle, the fourth point within 1e-9 mm of the plane, convex,
   and both rails at least as long, in segments, as either end. Returns each
   paired triangle's partner and, on the lower index, the quad's allowance:
   2 * ceil(1 deg / corner) summed over its four corners. */
function restatedQuads(soup, base, e2, segs) {
  const P = base.P, T = base.tri, nT = T.length / 3;
  const partner = new Int32Array(nT).fill(-1), allow = new Int32Array(nT);
  const inst = new Int32Array(soup.triCount).fill(-1);
  soup.instances.forEach((it, k) => { for (let t = it.from; t < it.to; t++) inst[t] = k; });
  const key = (i, j) => (i < j ? i * 4294967296 + j : j * 4294967296 + i);
  const users = new Map();
  for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) { const kk = key(T[t * 3 + k], T[t * 3 + (k + 1) % 3]); const l = users.get(kk); if (l) l.push(t); else users.set(kk, [t]); }
  const longest = (t) => { let bd = -1, bk = 0; for (let k = 0; k < 3; k++) { const i = T[t * 3 + k], j = T[t * 3 + (k + 1) % 3], dd = d2(P, i, j); if (dd > bd) { bd = dd; bk = key(i, j); } } return [bk, bd]; };
  const sub = (x, y) => [P[x * 3] - P[y * 3], P[x * 3 + 1] - P[y * 3 + 1], P[x * 3 + 2] - P[y * 3 + 2]];
  const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  for (let t = 0; t < nT; t++) {
    if (partner[t] >= 0) continue;
    const [kt, dt] = longest(t);
    if (dt <= e2) continue;
    const us = users.get(kt);
    if (us.length !== 2) continue;
    const u = us[0] === t ? us[1] : us[0];
    if (partner[u] >= 0 || longest(u)[0] !== kt) continue;
    const sa = base.src[t], sb = base.src[u];
    if (soup.organIx[sa] !== soup.organIx[sb] || soup.featIx[sa] !== soup.featIx[sb] || inst[sa] !== inst[sb]) continue;
    const A = [T[t * 3], T[t * 3 + 1], T[t * 3 + 2]], B = [T[u * 3], T[u * 3 + 1], T[u * 3 + 2]];
    let r = 0; while (B.includes(A[(r + 2) % 3])) r++;
    const i = A[r], j = A[(r + 1) % 3], p = A[(r + 2) % 3], q = B.find((x) => x !== i && x !== j);
    const n = cross(sub(j, i), sub(p, i)), nl = Math.hypot(...n);
    if (!(nl > 0) || Math.abs(dot(sub(q, i), n) / nl) > 1e-9) continue;
    const L = [j, p, i, q];
    let convex = true; const corners = [];
    for (let k = 0; k < 4; k++) {
      const a = L[k], b = L[(k + 1) % 4], c = L[(k + 2) % 4];
      const u1 = sub(b, a), v1 = sub(c, b);
      if (dot(cross(u1, v1), n) <= 0) convex = false;
      const x = sub(a, b), y = sub(c, b);
      corners.push(Math.acos(Math.max(-1, Math.min(1, dot(x, y) / (Math.hypot(...x) * Math.hypot(...y))))) * 180 / Math.PI);
    }
    if (!convex) continue;
    const s01 = segs(L[0], L[1]), s12 = segs(L[1], L[2]), s23 = segs(L[2], L[3]), s30 = segs(L[3], L[0]);
    if (Math.max(Math.min(s01, s23), Math.min(s12, s30)) < (Math.min(s01, s23) >= Math.min(s12, s30) ? Math.max(s12, s30) : Math.max(s01, s23))) continue;
    partner[t] = u; partner[u] = t;
    allow[Math.min(t, u)] = corners.reduce((acc, c) => acc + 2 * Math.ceil(SLIVER_DEG / Math.max(c, 1e-6)), 0);
  }
  return { partner, allow };
}
function indexCensus(tri) {
  const E = new Map();
  for (let t = 0; t < tri.length; t += 3) for (let j = 0; j < 3; j++) {
    const a = tri[t + j], b = tri[t + (j + 1) % 3], k = a < b ? a * 4294967296 + b : b * 4294967296 + a;
    const l = E.get(k); if (l) l.push(t / 3); else E.set(k, [t / 3]);
  }
  let boundary = 0, nonManifold = 0; const nmEdges = [], nmUsers = [];
  for (const [k, l] of E) { if (l.length === 1) boundary++; else if (l.length > 2) { nonManifold++; nmEdges.push([Math.floor(k / 4294967296), k % 4294967296]); nmUsers.push(l); } }
  return { boundary, nonManifold, nmEdges, nmUsers };
}

async function loadCore(id, edit) {
  if (!edit) return C;
  const src = fs.readFileSync(path.join(ROOT, 'bloom-texture-lab-core.js'), 'utf8');
  const n = src.split(edit.from).length - 1;
  if (n !== 1) throw new Error(`mutant ${id}: anchor matches ${n} times (want exactly 1) — the mutant is disarmed`);
  let out = src.replace(edit.from, edit.to);
  for (const [from, to] of edit.also || []) {
    const k = out.split(from).length - 1;
    if (k !== 1) throw new Error(`mutant ${id}: second anchor matches ${k} times (want exactly 1)`);
    out = out.replace(from, to);
  }
  const file = path.join(ROOT, `.bloom-texture-lab-core.mutant-${id}.mjs`);
  fs.writeFileSync(file, out);
  try { return await import(pathToFileURL(file).href); } finally { fs.unlinkSync(file); }
}
const MUTANTS = [
  /* the base row re-cut to the triangle's own count instead of taken as the
     edge's own points: the neighbour across that edge disagrees -> TQ0. (A
     mutant that only drops the edge CACHE is inert, and was tried first: the
     points are computed from the lower id either way, so the copies are
     bit-identical and weld into one.) */
  { id: 'the-base-row-is-recut', fires: 'TQ0', organ: null, from: "      if (k === K) row = base; // B .. C, the edge's own points\n      else {", to: '      {',
    also: [['        const m = segs(L, R);\n        row = [L];\n        for (let q = 1;', '        const m = segs(L, R) + (k === K ? 1 : 0);\n        row = [L];\n        for (let q = 1;']] },
  /* the quads are cut as two triangles again (T1's intermediate): every lone
     sliver inside its own allowance, the stem's quads over theirs */
  { id: 'quads-are-cut-as-two-triangles', fires: 'TQ2', organ: 'stem', from: '    if (canPair && !canPair(mesh.src[t], mesh.src[u])) continue;', to: '    if (true) continue;' },
  /* a paired quad's rows all run to rail B's first point: a fan from one
     corner across the whole strip — the stem's walls are such quads */
  { id: 'the-quad-rows-fan-from-one-corner', fires: 'TQ2', organ: 'stem', from: 'const L = rA[Math.round(k * n1 / K)], R = rB[Math.round(k * n2 / K)];', to: 'const L = rA[Math.round(k * n1 / K)], R = rB[0];' },
  { id: 'apex-at-the-long-edge', fires: 'TQ2', organ: null, from: '(x[0].length - y[0].length) || (x[4] - y[4])', to: '(y[0].length - x[0].length) || (y[4] - x[4])' },
];

const soups = {};
const getSoup = (name) => soups[name] || (soups[name] = (() => { const soup = C.buildTagged({ ...DEFAULTS, ...C.DEMO_STATES[name] }); return { soup, base: C.weld(soup) }; })());
const line = (st, a) => `  ${st.padEnd(7)} e ${a.edgeMm} ${a.split.padEnd(8)} ${String(a.tris).padStart(9)} tris (${a.ms} ms, ${a.quadPairs} quad pairs) index bnd ${a.indexCensus.boundary} nm ${a.indexCensus.nonManifold} (${a.indexCensus.nonManifoldNew} new; shipped ${a.indexCensus.shippedNonManifold}) · float32 bnd ${a.census.boundary} nm ${a.census.nonManifold}\n` +
  Object.entries(a.organs).map(([o, v]) => `      ${o.padEnd(7)} ${String(v.tris).padStart(8)}  ${v.xFloor}x floor ${v.floor} · ${v.xIdeal}x ideal ${v.ideal} · minAngle p1/p5/p50 ${v.minAngleP1}/${v.minAngleP5}/${v.minAngleP50} · aspect p50/p99/max ${v.aspectP50}/${v.aspectP99}/${v.aspectMax} · <1° ${v.under1} (${v.under1Pct}%) <5° ${v.under5} · fan sources ${v.fanSources}`).join('\n');

const report = { floorBar: FLOOR_BAR, sliverDeg: SLIVER_DEG, edges: EDGES, states: {} };
let bad = 0;
if (!CONTROL) {
  for (const name of ONLY) {
    const { soup, base } = getSoup(name);
    report.states[name] = { shippedTris: soup.triCount, runs: [] };
    for (const e of EDGES) for (const split of ['rows', 'redgreen']) {
      const a = assess(C, soup, base, e, split);
      report.states[name].runs.push(a);
      console.log(line(name, a));
      if (split === 'rows') { for (const f of a.fails) { console.log(`  FAIL ${name} e ${e} rows — ${f}`); bad++; } }
      else console.log(`      (redgreen, not asserted: ${a.fails.length ? a.fails.length + ' TQ failures, e.g. ' + a.fails[0] : 'would pass'})`);
    }
  }
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
  console.log(bad ? `FAILED: ${bad} TQ failures on the rows split` : `PASS: the rows split passes TQ0-TQ3 on ${ONLY.join(', ')} at ${EDGES.join(' and ')} mm`);
  process.exit(bad ? 1 : 0);
}

/* ---------------------------------------------- the negative control */
const { soup, base } = getSoup('whole');
const want = [];
for (const e of EDGES) {
  const clean = assess(C, soup, base, e, 'rows');
  want.push([`rows passes at ${e} mm`, clean.fails.length === 0, clean.fails.join('; ') || 'clean']);
  const rg = assess(C, soup, base, e, 'redgreen');
  const st = rg.organs.stem;
  const stemTQ1 = rg.fails.some((f) => f.startsWith('TQ1: stem')), stemTQ2 = rg.fails.some((f) => f.startsWith('TQ2: stem'));
  want.push([`redgreen fails TQ1 on the stem at ${e} mm`, stemTQ1, `${st.tris} tris = ${st.xFloor}x floor ${st.floor}`]);
  want.push([`redgreen fails TQ2 on the stem at ${e} mm`, stemTQ2, `${st.fanSources} fanning sources, worst +${st.worstFanExcess}, ${st.under1Pct}% under 1°`]);
}
for (const m of MUTANTS) {
  const core = await loadCore(m.id, m);
  const a = assess(core, soup, base, EDGES[EDGES.length - 1], 'rows');
  const fired = a.fails.some((f) => f.startsWith(m.organ ? `${m.fires}: ${m.organ}` : m.fires));
  want.push([`mutant ${m.id} fires ${m.fires}${m.organ ? ` on the ${m.organ}` : ''}`, fired, a.fails.filter((f) => f.startsWith(m.fires)).slice(0, 2).join('; ') || 'silent']);
}
for (const [what, ok, detail] of want) { console.log(`  ${ok ? 'ok  ' : 'MISS'} ${what} — ${detail}`); if (!ok) bad++; }
console.log(bad ? `CONTROL FAILED: ${bad} of ${want.length}` : `CONTROL PASS: ${want.length} of ${want.length} behave`);
process.exit(bad ? 1 : 0);
