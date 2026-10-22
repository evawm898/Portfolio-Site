#!/usr/bin/env node
/* ===================================================================
   bloom-texture-lab-lattice.mjs — T2: B'S OWN LATTICE, CHECKED AND COUNTED
   (docs/bloom-surface-texture-discovery.md §12; PROTOTYPE ONLY — not a gate in
   CI, no workflow names it, and it touches no shipped file).

   The lattice is bloom-texture-lab-lattice.js (read its header). This tool
   builds every demo state at each edge target three ways — the SHIPPED module,
   the patched copy with the lattice OFF, and the patched copy with it ON — and
   asserts the TX family on the 'lattice' build:

     TX0  OFF IS SHIPPED. The patched copy with the lattice switched off emits
          the shipped stream: every float, positionally, under Object.is.
     TX1  THE LADDER NEVER MOVES. (a) every vertex of every shipped ladder FACE
          triangle of a petal, sepal or leaf (emitPanel's skins) is present in
          the lattice emission as the very same doubles; (b) every organ
          instance's captured ladder samples (the grid's mid points and
          normals, a leaf's row centres and normals) are identical. Reference:
          the SHIPPED module's build — an owner the patch cannot reach.
     TX2  ON THE SURFACE. Every lattice skin vertex is its row's own
          `sect(v)` offset by its thickness, recomputed HERE through the
          organ's own row law (the shipped row object for a ladder row; the
          organ's `rowAt(u)` for a sub-row) and compared to the bit; every
          sub-row's u lies strictly between its two ladder neighbours and every
          row's columns strictly increase in v. A sub-point on a CHORD (a lerp
          of two ladder points) is not on the row law, and the chord's own
          distance from the surface is reported as what the lattice resolves.
     TX3  WATERTIGHT, AND WOUND OUTWARD. The combined mesh (lattice + T1's
          split of the rest) has 0 boundary edges in index space and no
          non-manifold edge the shipped soup did not already have; the
          lattice's own triangles have 0 unmatched DIRECTED edges (an
          undirected census cannot see a strip wound backwards).
     TX4  COUNT. Per organ, the lattice's own triangles against the CONFORMING
          FLOOR of the shipped panel triangles they replace (T1's TQ1 floor,
          Eva's ruling Q14: never a typed ratio of 2A/e^2). ASSERTED at TQ1's
          own 2.0x; the strict reading — at or under 1.0x the floor — is
          REPORTED beside it and is an open question (§12).

   --control  THE NEGATIVE CONTROL (required before quoting a pass from a
     changed tool): mutants of the lattice arm, each anchored exactly once in
     the patched text, each required to fail the clause it names —
       a-shipped-row-moves                 every ladder row re-evaluated 1e-9 of u up      -> TX1
       sub-rows-on-flat-chords             a sub-row is the lerp of its two ladder rows    -> TX2
       sub-columns-on-flat-chords          a sub-column is the lerp of two ladder columns  -> TX2
       the-margin-arc-is-read-on-the-lattice  the bead ramp's arc measured on the refined
                                           margin, so ladder skins near a buried end move  -> TX1
       the-grid-captures-the-lattice       the captured grid written from every lattice row-> TX1
       the-zip-winds-the-bottom-skin-backwards                                             -> TX3
       the-off-path-moves                  the shipped path, under its new name, nudged    -> TX0
     and the chord mutants must also report a chord distance > 0 on the
     curled control state (so the clause is not firing on rounding alone).

   --browser  ENGINE AGREEMENT (Q16): the same counts in Chromium (the page's
     engine) and in Node, organ by organ, state by state, edge by edge — the
     lattice's own and T1's split of the rest — and both engines' decision
     margins. A disagreement is REPORTED with both figures, never hidden.
   --budget   the four demo states and the two cost corners, counts only.

   Usage: node tools/bloom-texture-lab-lattice.mjs [--only default,whole,infill,tube]
          [--edges 0.6,0.4] [--out <json>] [--resume] [--control] [--browser]
          [--budget] [--corners-only]
   SAMPLING, NAMED: EXPORT mode throughout; the shipped stream positionally;
   every lattice skin row (TX2); every shipped ladder face vertex (TX1).
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import * as C from '../bloom-texture-lab-core.js';
import * as L from '../bloom-texture-lab-lattice.js';
import { DEFAULTS } from '../bloom-registry.js';
import { EXPORT_TRI_BUDGET } from '../bloom-geometry.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const OUT = arg('--out', null);
const RESUME = args.includes('--resume');
const ONLY = arg('--only', 'default,whole,infill,tube').split(',');
const EDGES = arg('--edges', '0.6,0.4').split(',').map(Number);
const CONTROL = args.includes('--control');
const BROWSER = args.includes('--browser');
const BUDGET = args.includes('--budget');
const FLOOR_BAR = 2.0;
const CORNERS = {
  'INFILL: x 40 petals x 3 whorls': { petalInfill: 'VORONOI', petalCount: 40, layerCount: 3 },
  'whole bloom x 40 petals x 3 whorls': { ...C.DEMO_STATES.whole, petalCount: 40, layerCount: 3 },
};
/* the control's adversarial state: rows curl and sections cup, so a chord is far from the surface */
const CURLED = { petalSpineCurl: 180, petalCup: 0.6, leafLength: 30 };
const PANEL_ORGANS = new Set(['petal', 'sepal', 'leaf']);
const r3 = (x, k = 3) => (x == null || !Number.isFinite(x) ? x : +x.toFixed(k));
const pct = (a, q) => { if (!a.length) return null; const s = Float64Array.from(a).sort(); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const key3 = (P, i) => `${P[i]},${P[i + 1]},${P[i + 2]}`;
const d2 = (P, i, j) => (P[i * 3] - P[j * 3]) ** 2 + (P[i * 3 + 1] - P[j * 3 + 1]) ** 2 + (P[i * 3 + 2] - P[j * 3 + 2]) ** 2;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/* ---------------------------------------------------- the TX clauses */
function tx0(shipped, off) {
  const a = shipped.positions, b = off.positions;
  let moved = 0; for (let i = 0; i < Math.max(a.length, b.length); i++) if (!Object.is(a[i], b[i])) moved++;
  return { floats: a.length, moved, lengths: [a.length, b.length], fails: moved ? [`TX0: ${moved} of ${a.length} floats differ between the shipped module and the patched copy with the lattice OFF`] : [] };
}
function tx1(shipped, lat) {
  const fails = [];
  const have = new Set();
  const P = lat.positions;
  for (let t = 0; t < lat.triCount; t++) if (lat.latIx[t]) for (let q = 0; q < 3; q++) have.add(key3(P, t * 9 + q * 3));
  let subject = 0, missing = 0; const seen = new Set();
  for (let t = 0; t < shipped.triCount; t++) {
    if (shipped.panelIx[t] !== 2 || !PANEL_ORGANS.has(C.ORGANS[shipped.organIx[t]])) continue;
    for (let q = 0; q < 3; q++) { const k = key3(shipped.positions, t * 9 + q * 3); if (seen.has(k)) continue; seen.add(k); subject++; if (!have.has(k)) missing++; }
  }
  if (!subject) fails.push('TX1(a): no shipped ladder face vertex in the subject — the clause is vacuous');
  if (missing) fails.push(`TX1(a): ${missing} of ${subject} shipped ladder face vertices are not emitted by the lattice (a ladder row or column moved)`);
  /* (b) the captured ladder samples, instance by instance */
  let samples = 0, diff = 0, lenDiff = 0;
  if (shipped.instances.length !== lat.instances.length) fails.push(`TX1(b): ${shipped.instances.length} shipped organ instances, ${lat.instances.length} on the lattice`);
  for (let k = 0; k < Math.min(shipped.instances.length, lat.instances.length); k++) {
    const A = shipped.instances[k].samples, B = lat.instances[k].samples;
    if (A.length !== B.length) { lenDiff++; continue; }
    for (let i = 0; i < A.length; i++) {
      samples++;
      const same = A[i].u === B[i].u && [0, 1, 2].every((c) => Object.is(A[i].m[c], B[i].m[c]) && Object.is(A[i].n[c], B[i].n[c]));
      if (!same) diff++;
    }
  }
  if (diff || lenDiff) fails.push(`TX1(b): ${lenDiff} organ instances captured a different number of ladder samples, and ${diff} of ${samples} samples differ, against the shipped capture (the grid must keep the ladder's rows)`);
  return { subject, missing, samples, sampleDiff: diff, instanceLenDiff: lenDiff, fails };
}
function tx2(ctx) {
  const fails = [];
  let checked = 0, bad = 0, subRows = 0, order = 0, colOrder = 0;
  const chord = {};
  /* records arrive panel by panel, in row order: ladder, its sub-rows, ladder */
  let lastShip = null, pend = [];
  const flush = (next) => {
    for (const r of pend) {
      if (!lastShip || !next || !(lastShip.u < r.u && r.u < next.u)) order++;
      /* how far the chord between the two ladder rows would have stood from the surface */
      if (lastShip && next) {
        const f = (r.u - lastShip.u) / (next.u - lastShip.u);
        let w = 0;
        for (const v of [-1, -0.5, 0, 0.5, 1]) {
          const A = lastShip.row.sect(v).P, B = next.row.sect(v).P, Q = r.rowAt(r.u).sect(v).P;
          const d = dist(Q, [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f]);
          if (d > w) w = d;
        }
        chord[r.organ] = Math.max(chord[r.organ] || 0, w);
      }
    }
    pend = [];
  };
  let prevPanel = null;
  for (const r of ctx.rows) {
    if (r.panel !== prevPanel) { flush(null); lastShip = null; prevPanel = r.panel; }
    const row = r.sIdx >= 0 ? r.row : r.rowAt(r.u);
    for (let j = 0; j < r.vs.length; j++) {
      if (j > 0 && !(r.vs[j] > r.vs[j - 1])) colOrder++;
      const q = row.sect(r.vs[j]), b = r.Bs[j];
      const T = [q.P[0] + q.n[0] * b, q.P[1] + q.n[1] * b, q.P[2] + q.n[2] * b];
      const B = [q.P[0] - q.n[0] * b, q.P[1] - q.n[1] * b, q.P[2] - q.n[2] * b];
      checked += 2;
      for (let c = 0; c < 3; c++) { if (!Object.is(T[c], r.top[j][c])) { bad++; break; } }
      for (let c = 0; c < 3; c++) { if (!Object.is(B[c], r.bot[j][c])) { bad++; break; } }
    }
    if (r.sIdx >= 0) { flush(r); lastShip = r; } else { pend.push(r); subRows++; }
  }
  flush(null);
  if (!checked || !subRows) fails.push(`TX2: vacuous — ${checked} vertices, ${subRows} sub-rows checked`);
  if (bad) fails.push(`TX2: ${bad} of ${checked} lattice skin vertices are not their row law's own point (a sub-point off the surface)`);
  if (order) fails.push(`TX2: ${order} sub-rows not strictly between their two ladder neighbours`);
  if (colOrder) fails.push(`TX2: ${colOrder} columns not strictly increasing in v`);
  return { checked, subRows, chordMm: Object.fromEntries(Object.entries(chord).map(([o, w]) => [o, +w.toExponential(3)])), fails };
}
function tx3(prep, soup, shippedNm) {
  const fails = [];
  const E = new Map();
  for (let t = 0; t < prep.tri.length; t += 3) for (let j = 0; j < 3; j++) {
    const a = prep.tri[t + j], b = prep.tri[t + (j + 1) % 3], k = a < b ? a * 4294967296 + b : b * 4294967296 + a;
    E.set(k, (E.get(k) || 0) + 1);
  }
  let boundary = 0, nonManifold = 0; for (const n of E.values()) { if (n === 1) boundary++; else if (n > 2) nonManifold++; }
  /* the lattice's own triangles: every directed edge matched by its reverse */
  const D = new Map();
  for (let t = 0; t < prep.tri.length / 3; t++) {
    if (!soup.latIx[prep.src[t]]) continue;
    for (let j = 0; j < 3; j++) { const a = prep.tri[t * 3 + j], b = prep.tri[t * 3 + (j + 1) % 3]; const k = a * 4294967296 + b; D.set(k, (D.get(k) || 0) + 1); }
  }
  let directed = 0; for (const [k, n] of D) { const a = Math.floor(k / 4294967296), b = k % 4294967296; if ((D.get(b * 4294967296 + a) || 0) !== n) directed++; }
  if (boundary) fails.push(`TX3: ${boundary} boundary edges (index space)`);
  if (nonManifold > shippedNm) fails.push(`TX3: ${nonManifold} non-manifold edges against the shipped soup's ${shippedNm}`);
  if (directed) fails.push(`TX3: ${directed} unmatched directed edges on the lattice's own triangles (a strip wound backwards)`);
  const census = C.edgeCensus(prep.P, prep.tri);
  return { boundary, nonManifold, shippedNonManifold: shippedNm, directed, float32: census, fails };
}
/* the conforming floor of the shipped triangles, per organ, split into the
   panel triangles the lattice replaces and the rest T1 splits */
function floors(soup, base, e) {
  const segs = (i, j) => { const d = d2(base.P, i, j); return d <= e * e ? 1 : Math.ceil(Math.sqrt(d) / e); };
  const panel = {}, rest = {}, shipped = {};
  for (let t = 0; t < base.tri.length / 3; t++) {
    const s = base.src[t], o = C.ORGANS[soup.organIx[s]];
    const a = base.tri[t * 3], b = base.tri[t * 3 + 1], c = base.tri[t * 3 + 2];
    const A = C.surfaceArea(base.P, [a, b, c]);
    const f = Math.max(segs(a, b) + segs(b, c) + segs(c, a) - 2, 2 * A / (e * e));
    const into = soup.panelIx[s] && PANEL_ORGANS.has(o) ? panel : rest;
    into[o] = (into[o] || 0) + f; shipped[o] = (shipped[o] || 0) + 1;
  }
  return { panel, rest, shipped };
}
/* WHERE THE LONG EDGES ARE. Every lattice FACE triangle is placed between the
   two skin rows its vertices were emitted on (the records' own arrays, matched
   by exact position); one spanning a gap the arm declared EXEMPT (the foot, the
   seam, a reshaped or buckled row) is counted apart. Reported, per organ, as a
   multiple of the edge target: the refined faces' cells have sides at most e by
   the count law, so their diagonals are bounded by about sqrt(2) e. */
function edgeAttribution(soup, ctx, e) {
  const at = new Map();
  ctx.rows.forEach((r, i) => { for (let j = 0; j < r.top.length; j++) { at.set(`${r.top[j][0]},${r.top[j][1]},${r.top[j][2]}`, i); at.set(`${r.bot[j][0]},${r.bot[j][1]},${r.bot[j][2]}`, i); } });
  const P = soup.positions, by = {};
  for (let t = 0; t < soup.triCount; t++) {
    if (!soup.latIx[t] || soup.panelIx[t] !== 2) continue;
    const o = C.ORGANS[soup.organIx[t]], q = by[o] || (by[o] = { refined: [], exempt: 0, exemptMax: 0, unplaced: 0 });
    const ks = [0, 1, 2].map((v) => at.get(key3(P, t * 9 + v * 3)));
    if (ks.some((k) => k === undefined)) { q.unplaced++; continue; }
    const lo = Math.min(...ks), hi = Math.max(...ks);
    let m = 0; for (let k = 0; k < 3; k++) { const a = t * 9 + k * 3, b = t * 9 + ((k + 1) % 3) * 3; m = Math.max(m, Math.hypot(P[a] - P[b], P[a + 1] - P[b + 1], P[a + 2] - P[b + 2])); }
    if (ctx.rows[lo].exempt && hi === lo + 1) { q.exempt++; q.exemptMax = Math.max(q.exemptMax, m); } else q.refined.push(m);
  }
  return Object.fromEntries(Object.entries(by).map(([o, q]) => [o, { refinedFaces: q.refined.length, refinedP99xE: r3(pct(q.refined, 0.99) / e), refinedMaxxE: r3(pct(q.refined, 1 - 1e-12) / e), exemptFaces: q.exempt, exemptMaxMm: r3(q.exemptMax), unplaced: q.unplaced }]));
}
function quality(P, tri, keepT) {
  const q = C.triangleQuality(P, tri);
  const ang = [], asp = []; let under1 = 0, under5 = 0, maxEdge = 0; const edges = [];
  for (let t = 0; t < tri.length / 3; t++) {
    if (keepT && !keepT(t)) continue;
    ang.push(q.minAngle[t]); asp.push(q.aspect[t]);
    if (q.minAngle[t] < 1) under1++; if (q.minAngle[t] < 5) under5++;
    for (let k = 0; k < 3; k++) { const L = Math.sqrt(d2(P, tri[t * 3 + k], tri[t * 3 + (k + 1) % 3])); edges.push(L); if (L > maxEdge) maxEdge = L; }
  }
  return { tris: ang.length, minAngleP1: r3(pct(ang, 0.01), 2), minAngleP5: r3(pct(ang, 0.05), 2), minAngleP50: r3(pct(ang, 0.5), 2), aspectP99: r3(pct(asp, 0.99), 1), under1, under5, edgeP99: r3(pct(edges, 0.99)), edgeMax: r3(maxEdge) };
}

/* ------------------------------------------------- one state, all edges */
async function assessState(name, state, edges, { extraEdits = [], key, only = null } = {}) {
  const res = { name, runs: [] };
  const shipped = C.buildTagged(state);
  const base = C.weld(shipped);
  const shippedNm = indexNonManifold(base.tri);
  const LG = await L.latticeGeometry({ extraEdits, key });
  if (!only || only.has('TX0')) {
    const off = C.buildTagged(state, { geometry: LG });
    res.tx0 = tx0(shipped, off);
  }
  for (const e of edges) {
    const t0 = Date.now();
    const B = await L.buildLattice(state, e, { record: true, extraEdits, key });
    const run = { edgeMm: e, latticeTris: B.soup.triCount, panels: summarisePanels(B.ctx.panels), margins: B.ctx.margins, decisions: B.ctx.decisions };
    run.tx1 = (!only || only.has('TX1')) ? tx1(shipped, B.soup) : { fails: [] };
    run.tx2 = (!only || only.has('TX2')) ? tx2(B.ctx) : { fails: [] };
    if (!only) run.edges = edgeAttribution(B.soup, B.ctx, e);
    if (!only || only.has('TX3') || only.has('TX4')) {
      const prep = C.prepare(B.soup, e, { lattice: B.ctx });
      run.tx3 = tx3(prep, B.soup, shippedNm);
      const counts = L.latticeCounts(B.soup, e);
      run.counts = counts;
      run.prepTris = prep.tri.length / 3;
      if (run.prepTris !== counts.total) run.tx3.fails.push(`TX3: the combined mesh has ${run.prepTris} triangles, the count path ${counts.total} — two producers disagree`);
      const fl = floors(shipped, base, e);
      const t1 = C.subdivide(base, e, [], { split: 'rows', canPair: C.pairPredicate(shipped) });
      const t1By = {}; for (let t = 0; t < t1.tri.length / 3; t++) { const o = C.ORGANS[shipped.organIx[t1.src[t]]]; t1By[o] = (t1By[o] || 0) + 1; }
      const organs = {};
      for (const o of new Set([...Object.keys(fl.shipped)])) {
        const nat = counts.native[o] || 0, rst = counts.rest[o] || 0;
        organs[o] = { shipped: fl.shipped[o], lattice: nat, panelFloor: Math.round(fl.panel[o] || 0), xPanelFloor: nat ? r3(nat / fl.panel[o], 2) : null,
          total: nat + rst, floor: Math.round((fl.panel[o] || 0) + (fl.rest[o] || 0)), xFloor: r3((nat + rst) / ((fl.panel[o] || 0) + (fl.rest[o] || 0)), 2), t1Rows: t1By[o] || 0 };
        organs[o].quality = nat ? quality(prep.P, prep.tri, (t) => B.soup.latIx[prep.src[t]] && C.ORGANS[B.soup.organIx[prep.src[t]]] === o) : null;
      }
      run.organs = organs; run.t1RowsTotal = t1.tri.length / 3;
      run.tx4 = { fails: [], strict: [] };
      for (const [o, v] of Object.entries(organs)) {
        if (v.xPanelFloor == null) continue;
        if (v.xPanelFloor > FLOOR_BAR) run.tx4.fails.push(`TX4: ${o} ${v.lattice} lattice triangles = ${v.xPanelFloor}x the conforming floor ${v.panelFloor} (bar ${FLOOR_BAR}x, TQ1's)`);
        if (v.xPanelFloor > 1) run.tx4.strict.push(`${o} ${v.xPanelFloor}x`);
      }
    }
    run.ms = Date.now() - t0;
    res.runs.push(run);
  }
  return res;
}
function indexNonManifold(tri) {
  const E = new Map();
  for (let t = 0; t < tri.length; t += 3) for (let j = 0; j < 3; j++) { const a = tri[t + j], b = tri[t + (j + 1) % 3], k = a < b ? a * 4294967296 + b : b * 4294967296 + a; E.set(k, (E.get(k) || 0) + 1); }
  let n = 0; for (const c of E.values()) if (c > 2) n++;
  return n;
}
function summarisePanels(panels) {
  const by = {};
  for (const p of panels) { const o = by[p.organ] || (by[p.organ] = { panels: 0, shippedRows: 0, subRows: 0, cfMax: 0, noSub: {} }); o.panels++; o.shippedRows += p.shippedRows; o.subRows += p.subRows; o.cfMax = Math.max(o.cfMax, p.cfMax); if (p.noSub) o.noSub[p.noSub] = (o.noSub[p.noSub] || 0) + 1; }
  return by;
}
const allFails = (res) => [...(res.tx0 ? res.tx0.fails : []), ...res.runs.flatMap((r) => [...r.tx1.fails, ...r.tx2.fails, ...(r.tx3 ? r.tx3.fails : []), ...(r.tx4 ? r.tx4.fails : [])])];

/* ------------------------------------------------------- the mutants */
const MUTANTS = [
  { id: 'a-shipped-row-moves', fires: 'TX1', only: ['TX1'],
    edit: ['    X.push({ row: s.row, sIdx: i, sp: s.sp, b: s.b, sM: s.sM, t: s.t });',
      '    X.push({ row: (i >= firstSub && !noSub && s.row.u > 0 && own(s.row)) ? rowAt(s.row.u + 1e-9) : s.row, sIdx: i, sp: s.sp, b: s.b, sM: s.sM, t: s.t });'] },
  { id: 'sub-rows-on-flat-chords', fires: 'TX2', only: ['TX2'], chord: true,
    edit: ['          const row = rowAt(u);\n',
      '          const __r0 = rowAt(u), __A = s.row, __B = s2.row;\n          const row = Object.assign({}, __r0, { sect: (v) => { const a = __A.sect(v), b = __B.sect(v); const n = [a.n[0] + (b.n[0] - a.n[0]) * f, a.n[1] + (b.n[1] - a.n[1]) * f, a.n[2] + (b.n[2] - a.n[2]) * f], l = Math.hypot(n[0], n[1], n[2]); return { P: [a.P[0] + (b.P[0] - a.P[0]) * f, a.P[1] + (b.P[1] - a.P[1]) * f, a.P[2] + (b.P[2] - a.P[2]) * f], n: [n[0] / l, n[1] / l, n[2] / l] }; } });\n'] },
  { id: 'sub-columns-on-flat-chords', fires: 'TX2', only: ['TX2'],
    edit: ['      const q = side ? row.sect(v) : { P: oP[k][j], n: oN[k][j] }; /* the lattice skin point */',
      '      const __c = Math.floor(j / cf) * cf, __f = (j - __c) / cf;\n      const q = side ? (__f === 0 ? row.sect(v) : (() => { const vA = inLo + ((inHi - inLo) * (__c / cf)) / (NB - 1), vB = inLo + ((inHi - inLo) * ((__c + cf) / cf)) / (NB - 1); const a = row.sect(vA), b = row.sect(vB); return { P: [a.P[0] + (b.P[0] - a.P[0]) * __f, a.P[1] + (b.P[1] - a.P[1]) * __f, a.P[2] + (b.P[2] - a.P[2]) * __f], n: a.n }; })()) : { P: oP[k][j], n: oN[k][j] }; /* the lattice skin point */'] },
  { id: 'the-margin-arc-is-read-on-the-lattice', fires: 'TX1', only: ['TX1'],
    edit: ['  const kOf = (i) => E[i - rowFrom];\n',
      '  const kOf = (i) => E[i - rowFrom];\n  { let __s = 0; for (let k = 1; k < X.length; k++) { __s += rimDist(X[k - 1].b.Ps[0], X[k].b.Ps[0]); X[k].sM = __s; } }\n'] },
  { id: 'the-grid-captures-the-lattice', fires: 'TX1', only: ['TX1'],
    edit: ['    for (let i = rowFrom; i <= rowTo; i++) {\n      const k = kOf(i), b = X[k].b;',
      '    for (let k = 0; k < X.length; k++) {\n      const i = X[k].sIdx >= 0 ? X[k].sIdx : rowFrom, b = X[k].b;'] },
  { id: 'the-zip-winds-the-bottom-skin-backwards', fires: 'TX3', only: ['TX3'],
    edit: ['acc.tri(As[i], Bs[j + 1], Bs[j]); j++;', 'acc.tri(As[i], Bs[j], Bs[j + 1]); j++;'] },
  { id: 'the-off-path-moves', fires: 'TX0', only: ['TX0'],
    edit: ['    if (k > 0) sAcc += rimDist(oP[k - 1][0], Ps[0]);', '    if (k > 0) sAcc += rimDist(oP[k - 1][0], Ps[0]) * (1 + 1e-12);'] },
];

/* ------------------------------------------------- the browser parity */
async function browserCounts(jobs) {
  const require = createRequire(import.meta.url);
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    if (u === '/__lattice.html') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><meta charset=utf-8><title>lattice</title>'); return; }
    const f = path.join(ROOT, u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': f.endsWith('.js') || f.endsWith('.mjs') ? 'text/javascript' : 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(0, r));
  const browser = await chromium.launch({ args: ['--js-flags=--max-old-space-size=8192'] });
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/__lattice.html`);
    const out = [];
    for (const job of jobs) {
      const r = await page.evaluate(async ({ state, e }) => {
        const L = await import('/bloom-texture-lab-lattice.js');
        const B = await L.buildLattice(state, e);
        return { counts: L.latticeCounts(B.soup, e), shippedTris: null, latticeTris: B.soup.triCount, margins: B.ctx.margins, ua: navigator.userAgent.match(/Chrome\/[\d.]+/)?.[0] };
      }, job);
      out.push({ ...job, ...r });
    }
    return out;
  } finally { await browser.close(); server.close(); }
}

/* ============================================================== run */
const save = (o) => { if (OUT) fs.writeFileSync(OUT, JSON.stringify(o, null, 1)); };
if (CONTROL) {
  let bad = 0; const rows = [];
  const clean = await assessState('whole', { ...DEFAULTS, ...C.DEMO_STATES.whole }, [0.6], {});
  const cf = allFails(clean);
  rows.push(['clean tree passes every TX clause on the whole bloom at 0.6 mm', cf.length === 0, cf.join('; ') || 'clean']);
  for (const m of MUTANTS) {
    const only = new Set(m.only);
    const res = await assessState('whole', { ...DEFAULTS, ...C.DEMO_STATES.whole }, [0.6], { extraEdits: [[m.id, m.edit[0], m.edit[1]]], key: m.id, only });
    const f = allFails(res).filter((x) => x.startsWith(m.fires));
    rows.push([`mutant ${m.id} fires ${m.fires}`, f.length > 0, f.slice(0, 2).join('; ') || 'silent']);
    if (m.chord) {
      const cur = await assessState('curled', { ...DEFAULTS, ...CURLED }, [0.6], { extraEdits: [[m.id, m.edit[0], m.edit[1]]], key: m.id, only: new Set(['TX2']) });
      const run = cur.runs[0];
      const clean2 = await assessState('curled', { ...DEFAULTS, ...CURLED }, [0.6], { only: new Set(['TX2']) });
      const w = clean2.runs[0].tx2.chordMm;
      rows.push([`mutant ${m.id} fires TX2 on the curled state, and the chord stands off the surface there`, run.tx2.fails.length > 0 && Object.values(w).some((x) => x > 1e-3), `${run.tx2.fails[0] || 'silent'}; chord distance by organ ${JSON.stringify(w)} mm`]);
    }
  }
  for (const [what, ok, detail] of rows) { console.log(`  ${ok ? 'ok  ' : 'MISS'} ${what} — ${detail}`); if (!ok) bad++; }
  console.log(bad ? `CONTROL FAILED: ${bad} of ${rows.length}` : `CONTROL PASS: ${rows.length} of ${rows.length} behave`);
  process.exit(bad ? 1 : 0);
}

if (BUDGET) {
  const report = (RESUME && OUT && fs.existsSync(OUT)) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { budget: EXPORT_TRI_BUDGET, edges: EDGES, rows: {} };
  report.complete = false;
  const pctB = (n) => +(100 * n / EXPORT_TRI_BUDGET).toFixed(1);
  const states = args.includes('--corners-only') ? {} : Object.fromEntries(ONLY.map((n) => [n, C.DEMO_STATES[n]]));
  for (const [label, delta] of [...Object.entries(states), ...Object.entries(CORNERS)]) {
    for (const e of EDGES) {
      const k = `${label}|${e}`;
      if (report.rows[k]) { console.log(`== ${k}: in ${OUT}, skipped`); continue; }
      const t0 = Date.now();
      const st = { ...DEFAULTS, ...delta };
      const B = await L.buildLattice(st, e);
      const c = L.latticeCounts(B.soup, e);
      const shippedTris = C.buildTagged(st).triCount;
      report.rows[k] = { label, edgeMm: e, shippedTris, total: c.total, pctBudget: pctB(c.total), native: c.native, rest: c.rest, ms: Date.now() - t0 };
      console.log(`${label.padEnd(36)} e ${e}: shipped ${shippedTris} -> ${c.total} (${pctB(c.total)}% of budget) native ${JSON.stringify(c.native)} rest ${JSON.stringify(c.rest)} (${Date.now() - t0} ms)`);
      save(report);
    }
  }
  report.complete = true; save(report);
  process.exit(0);
}

if (BROWSER) {
  const jobs = [];
  for (const n of ONLY) for (const e of EDGES) jobs.push({ label: n, state: { ...DEFAULTS, ...(C.DEMO_STATES[n] || CORNERS[n]) }, e });
  const web = await browserCounts(jobs);
  let diffs = 0; const out = [];
  for (const w of web) {
    const B = await L.buildLattice(w.state, w.e);
    const node = L.latticeCounts(B.soup, w.e);
    const organs = new Set([...Object.keys(node.native), ...Object.keys(node.rest), ...Object.keys(w.counts.native), ...Object.keys(w.counts.rest)]);
    const rows = [];
    for (const o of organs) {
      const a = [node.native[o] || 0, node.rest[o] || 0], b = [w.counts.native[o] || 0, w.counts.rest[o] || 0];
      if (a[0] !== b[0] || a[1] !== b[1]) { diffs++; rows.push(`${o}: Node ${a.join('+')} vs Chromium ${b.join('+')}`); }
    }
    out.push({ label: w.label, e: w.e, node: { total: node.total, native: node.native, rest: node.rest, margins: B.ctx.margins }, chromium: { total: w.counts.total, native: w.counts.native, rest: w.counts.rest, margins: w.margins, ua: w.ua }, differ: rows });
    console.log(`${w.label.padEnd(36)} e ${w.e}: Node ${node.total} · ${w.ua} ${w.counts.total}${rows.length ? '  DIFFER: ' + rows.join('; ') : '  — every organ agrees'}`);
  }
  if (OUT) save({ parity: out });
  console.log(diffs ? `TX5: ${diffs} organ counts differ between the engines (reported above, both figures)` : `TX5 PASS: Node and Chromium agree on every organ count, every state, every edge`);
  process.exit(diffs ? 1 : 0);
}

const report = (RESUME && OUT && fs.existsSync(OUT)) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { floorBar: FLOOR_BAR, edges: EDGES, states: {} };
report.complete = false;
let bad = 0;
for (const name of ONLY) {
  if (report.states[name]) { console.log(`== ${name}: in ${OUT}, skipped`); bad += allFails(report.states[name]).length; continue; }
  const res = await assessState(name, { ...DEFAULTS, ...C.DEMO_STATES[name] }, EDGES);
  report.states[name] = res;
  console.log(`== ${name}: TX0 ${res.tx0.moved} of ${res.tx0.floats} floats moved with the lattice off`);
  for (const r of res.runs) {
    console.log(`  e ${r.edgeMm}: lattice build ${r.latticeTris} tris, combined ${r.prepTris} (T1 rows ${r.t1RowsTotal}) in ${r.ms} ms · TX1 ${r.tx1.missing}/${r.tx1.subject} ladder face vertices missing, ${r.tx1.sampleDiff}/${r.tx1.samples} samples differ · TX2 ${r.tx2.checked} vertices, ${r.tx2.subRows} sub-rows, chord ${JSON.stringify(r.tx2.chordMm)} · TX3 bnd ${r.tx3.boundary} nm ${r.tx3.nonManifold} (shipped ${r.tx3.shippedNonManifold}) directed ${r.tx3.directed} float32 bnd ${r.tx3.float32.boundary} nm ${r.tx3.float32.nonManifold} · margins ${JSON.stringify(r.margins)}`);
    for (const [o, v] of Object.entries(r.organs)) console.log(`      ${o.padEnd(7)} shipped ${String(v.shipped).padStart(6)} · lattice ${String(v.lattice).padStart(7)} = ${v.xPanelFloor ?? '—'}x panel floor ${v.panelFloor} · organ total ${v.total} = ${v.xFloor}x floor ${v.floor} (T1 rows ${v.t1Rows})${v.quality ? ` · min angle p1/p5/p50 ${v.quality.minAngleP1}/${v.quality.minAngleP5}/${v.quality.minAngleP50} · <1° ${v.quality.under1} <5° ${v.quality.under5} · edge p99/max ${v.quality.edgeP99}/${v.quality.edgeMax}` : ''}`);
    for (const [o, v] of Object.entries(r.edges || {})) console.log(`      ${o.padEnd(7)} faces between refined rows: ${v.refinedFaces}, longest edge p99 ${v.refinedP99xE}e max ${v.refinedMaxxE}e · faces across an exempt gap (foot / seam / reshaped / buckled): ${v.exemptFaces}, longest ${v.exemptMaxMm} mm${v.unplaced ? ` · ${v.unplaced} UNPLACED` : ''}`);
    if (r.tx4.strict.length) console.log(`      (strict reading, over 1.0x the floor: ${r.tx4.strict.join(', ')})`);
  }
  const f = allFails(res);
  for (const x of f) console.log(`  FAIL ${name} — ${x}`);
  bad += f.length;
  save(report);
}
report.complete = ONLY.every((n) => report.states[n]);
save(report);
console.log(bad ? `FAILED: ${bad} TX failures` : `PASS: TX0-TX4 on ${ONLY.join(', ')} at ${EDGES.join(' and ')} mm`);
process.exit(bad ? 1 : 0);
