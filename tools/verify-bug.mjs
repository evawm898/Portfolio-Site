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
     D  a design round-trips through JSON exactly; an invalid outline in a file
        is refused with a note; a newer version is refused.

   It also REPORTS (not gates) FDM/resin overhang at the model's own
   orientation, and the tucked-leg exposure across the random seeds.

   NOT COVERED: planform WIDTHS of a drawn outline (a hand-drawn spike can be
   narrower than the floor — not measured); free ends; self-intersection
   BETWEEN parts (overlapping closed shells are the export contract).

   --negative-control  breaks built models nine ways (plus the L clause at reach 1) and requires each to be
                       caught by the clause that names it.
   --seeds N           number of random bugs (default 40). */

import * as G from '../bug-geometry.js';
import { HAND_OUTLINES, CROSSING_BLEND } from './bug-fixtures.mjs';

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

/* ---------- run ---------- */
function check(label, model, opts = {}) {
  const fails = [];
  const md = G.mirrorDiff(model);
  if (md !== 0) fails.push(`M: mirrorDiff ${md}`);
  const stl = analyzeStl(G.exportStl(model));
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
  if (opts.repaired && !model.notes.some((n) => /eased toward the nearer drawn pair/.test(n))) fails.push('I: the crossing blend was not reported repaired');
  return { label, fails, md, stl, cn, mf, sv, rc, le, notes: model.notes };
}

function fmt(r) {
  const f = (x) => (Number.isFinite(x) ? x.toFixed(3) : '  — ');
  return `${r.fails.length ? 'FAIL' : 'ok  '} ${r.label.padEnd(26)} tris=${String(r.stl.triangles).padStart(6)} stl=${(r.stl.bytes / 1024).toFixed(0).padStart(5)}KiB `
    + `mirror=${r.md} boundary=${r.stl.boundary} nonManifold(unrated)=${r.stl.nonManifold} regions=${r.cn.comps} `
    + `minTube=${f(r.mf.tubeMin)} minThick=${f(r.mf.thickMin)} waist=${f(r.mf.waistMin)} roots=${r.rc.roots.length}${r.rc.roots.length > 1 ? `@${f(r.rc.minGap)}mm` : ''} cutRegions=${r.sv.regions}`
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
  { const p = d(); p.wingPairs = 4; p.wings.first.points = HAND_OUTLINES.swallowtail; p.wings.last.points = HAND_OUTLINES.notched; p.wings.last.scallop = 0.18; p.tailLength = 10;
    rows.push(['drawn: swallowtail -> notched, scallop + tail', p, {}]); }
  { const p = d(); p.wingPairs = 4; p.wings.unlinked[1] = { ...p.wings.first, points: HAND_OUTLINES.falcate, sweep: 40, dihedral: -20 }; rows.push(['pair 2 unlinked, falcate', p, {}]); }
  { const p = d(); p.wingPairs = 3; p.wings.first.points = CROSSING_BLEND.first; p.wings.last.points = CROSSING_BLEND.last; rows.push(['crossing blend (3 pairs)', p, { repaired: true }]); }
  return rows;
}

if (NEG) {
  const base = G.buildBug(G.defaultParams());
  const tuckP = G.defaultParams(); tuckP.legReach = 0;
  const tuck = G.buildBug(tuckP);
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
    ['untuck the legs (move out 4 mm)', 'L', tuck, { tucked: true }, (m) => shiftPart(m, (q) => q.kind === 'leg', [4, 0, 0])],
  ];
  const clean = [check('default (clean)', base), check('default tucked (clean)', tuck, { tucked: true })];
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
