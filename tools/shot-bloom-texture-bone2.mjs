#!/usr/bin/env node
/* ===================================================================
   shot-bloom-texture-bone2.mjs — THE BONE v2 SHEET (the prototype; read
   docs/bloom-surface-texture-bone-v2.md).

     node tools/shot-bloom-texture-bone2.mjs docs/img/bloom-texture-bone-v2.png
       [--data docs/data/bloom-texture-bone-v2.json] [--browser docs/data/bloom-texture-bone-v2-browser.json]

   Every cell is a Node build drawn by `bloom-soft-render.mjs` (deterministic:
   no pixel figure is quoted and none is owed), EXPORT, the numbers in every
   caption read off the build or the instruments' JSON:
     A  v1 against v2 on the SAME PETAL at raking light (the default height,
        then 1.0 mm): v1 as shipped; the v2 field on the shipped lattice; the
        v2 grid at 0.1 mm; the v2 rings (pores merging); the v2 rings (a wall
        between every two pores) — the refinement in a 5 mm window on petal 0
     B  a pore close-up with the wireframe, the plate: the grid at its derived
        edge, the grid at 0.1 mm, the rings (merging), the rings (hard-core)
     C  a depth cross-section through a row of pores (the field and the two
        meshes), and the nested specks close-up
     D  a sweep of pore size and of height (the plate, on the DERIVED grid: the
        field as drawn, so the sweep shows the look and not a mesher)
     E  the budget and time table
   Cells B-D carry a CAVITY TINT (darker with depth) so a pit reads as a pit,
   as the references' do (photographs, where a pit's floor is in shadow); the
   A row is plain raking light like v1's sheet. Said in every caption.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const B = await import(pathToFileURL(path.join(ROOT, 'bloom-texture-bone2.js')).href);
const PL = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-texture-bone2-plate.mjs')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const { render, writePng, text, blit } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-soft-render.mjs')).href);
const OUT = process.argv[2];
if (!OUT) { console.error('usage: shot-bloom-texture-bone2.mjs <out.png> [--data <json>] [--browser <json>]'); process.exit(2); }
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const DATA = JSON.parse(fs.readFileSync(arg('--data', path.join(ROOT, 'docs/data/bloom-texture-bone-v2.json')), 'utf8'));
const BR = fs.existsSync(arg('--browser', path.join(ROOT, 'docs/data/bloom-texture-bone-v2-browser.json'))) ? JSON.parse(fs.readFileSync(arg('--browser', path.join(ROOT, 'docs/data/bloom-texture-bone-v2-browser.json')), 'utf8')) : null;
const W = 360, Hc = 360, CAP = 64, COLS = 5;
const RAKE = { light1: [0.95, -0.15, 0.25], light2: [-0.3, 0.4, 0.3] };
const fmt = (n) => n.toLocaleString('en-US');
const norm = (v) => { const L = Math.hypot(...v); return v.map((x) => x / L); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/* the renderer's own projection, restated for the wireframe overlay */
function projector(cam, w, h) {
  const fwd = norm(cam.dir.map((c) => -c)), right = norm(cross(fwd, cam.up)), up = norm(cross(right, fwd)), scale = (h / 2) / cam.halfHeight;
  return (p) => { const d = [p[0] - cam.center[0], p[1] - cam.center[1], p[2] - cam.center[2]]; return [w / 2 + dot(d, right) * scale, h / 2 - dot(d, up) * scale]; };
}
function wire(img, w, h, P, tri, cam, col = [30, 200, 220], alpha = 0.55) {
  const pr = projector(cam, w, h);
  const seen = new Set();
  for (let t = 0; t < tri.length; t += 3) for (let k = 0; k < 3; k++) {
    const a = tri[t + k], b = tri[t + (k + 1) % 3]; const key = a < b ? `${a},${b}` : `${b},${a}`; if (seen.has(key)) continue; seen.add(key);
    const A = pr([P[a * 3], P[a * 3 + 1], P[a * 3 + 2]]), Bq = pr([P[b * 3], P[b * 3 + 1], P[b * 3 + 2]]);
    const n = Math.ceil(Math.hypot(Bq[0] - A[0], Bq[1] - A[1])) + 1;
    if (n > 4 * w) continue;
    for (let i = 0; i <= n; i++) { const x = Math.round(A[0] + (Bq[0] - A[0]) * i / n), y = Math.round(A[1] + (Bq[1] - A[1]) * i / n); if (x < 0 || y < 0 || x >= w || y >= h) continue; const o = (y * w + x) * 3; for (let c = 0; c < 3; c++) img[o + c] = Math.round(img[o + c] * (1 - alpha) + col[c] * alpha); }
  }
}
const cells = [];
const push = (img, caption) => cells.push({ img, caption });
const blank = (lines) => { const img = Buffer.alloc(W * Hc * 3, 30); lines.forEach((l, i) => text(img, W, Hc, 10, 12 + i * 16, l, [215, 215, 205], 1)); return img; };
const soupOf = (M) => { const pos = new Float32Array(M.tri.length * 3); for (let t = 0; t < M.tri.length; t++) for (let k = 0; k < 3; k++) pos[t * 3 + k] = M.P[M.tri[t] * 3 + k]; return pos; };
const cavity = (M) => (t) => { const f = (M.F[M.tri[t * 3]] + M.F[M.tri[t * 3 + 1]] + M.F[M.tri[t * 3 + 2]]) / 3; return 0.35 + 0.65 * f; };

/* ------------------------------------------------ A: the same petal */
const st0 = B.bone2State(DEFAULTS);
const L = await B.bone2Bloom(st0, { mode: 'lattice' });
const MO = new Float32Array(L.acc.triangleCount * 12 + 8);
await B.bone2Bloom(st0, { mode: 'lattice', capability: { boneMaskOut: MO } });
const pr0 = L.rec.petalsAll[0].triRange;
/* the focus: the upward-facing point of petal 0 whose 2.6 mm neighbourhood (what
   the cell shows) is the MOST porous — so the cell shows pores, not the smooth
   ground between two patches */
let focus = null, best = -1;
{
  const pos = L.acc.positions, tris = [];
  for (let t = pr0[0]; t < pr0[1]; t++) {
    const o = t * 9;
    let m = 1; for (let c = 0; c < 3; c++) { const q = (t * 3 + c) * 4; m = Math.min(m, MO[q] * MO[q + 1] * MO[q + 2]); }
    const n = norm(cross([pos[o + 3] - pos[o], pos[o + 4] - pos[o + 1], pos[o + 5] - pos[o + 2]], [pos[o + 6] - pos[o], pos[o + 7] - pos[o + 1], pos[o + 8] - pos[o + 2]]));
    tris.push({ m, n, c: [(pos[o] + pos[o + 3] + pos[o + 6]) / 3, (pos[o + 1] + pos[o + 4] + pos[o + 7]) / 3, (pos[o + 2] + pos[o + 5] + pos[o + 8]) / 3] });
  }
  for (let i = 0; i < tris.length; i += 3) {
    const T0 = tris[i]; if (T0.n[2] < 0.5 || T0.m < 0.9) continue;
    /* x the share of the 4.5 mm refinement window that faces the same way: the
       rings run in a planar chart of that window and need it nearly flat */
    let tot = 0, por = 0, win = 0, flat = 0;
    for (const q of tris) { const d = Math.hypot(q.c[0] - T0.c[0], q.c[1] - T0.c[1], q.c[2] - T0.c[2]); if (d <= 4.5) { win++; if (dot(q.n, T0.n) >= 0.9) flat++; } if (d > 2.6) continue; tot++; if (q.m > 0.5) por++; }
    const sc = tot && win ? (por / tot) * (flat / win) : 0;
    if (sc > best) { best = sc; focus = { centre: T0.c, normal: T0.n }; }
  }
  console.log('focus score (porous share within 2.6 mm x flat share within 4.5)', best.toFixed(3));
}
console.log('focus', focus);
const petalCam = { center: focus.centre, dir: norm([focus.normal[0] + 0.25, focus.normal[1] - 0.35, focus.normal[2]]), up: [1, 0, 0], halfHeight: 2.6 };
for (const H of [0.4, 1.0]) {
  const stH = B.bone2State(DEFAULTS, { textureHeight: H });
  const runs = [
    ['v1 as shipped', { ...DEFAULTS, petalTexture: 'BONE', textureHeight: H }, { mode: 'v1' }],
    ['v2 field on the 0.4 lattice', stH, { mode: 'lattice' }],
    ['v2 GRID 0.1 mm (merging)', stH, { mode: 'grid', edgeMm: 0.1, focus: { organ: 'petal', ...focus, radiusMm: 4.5 } }],
    ['v2 RINGS (merging)', stH, { mode: 'rings', focus: { organ: 'petal', ...focus, radiusMm: 4.5 } }],
    ['v2 RINGS (hard-core)', { ...stH, bone2Packing: 'hardcore' }, { mode: 'rings', focus: { organ: 'petal', ...focus, radiusMm: 4.5 } }],
  ];
  for (const [name, st, opt] of runs) {
    const MOv = opt.mode === 'v1' ? new Float32Array(158912 * 12 + 8) : null;
    const r = await B.bone2Bloom(st, { ...opt, captureNormals: false, ...(MOv ? { capability: { boneMaskOut: MOv } } : {}) });
    /* v1's own relief in the cell (MO[3] is s/H per corner): how much of what the
       cell shows v1 relieves at all, and by how much at most */
    let v1Note = '';
    if (MOv) {
      let n = 0, lit = 0, mx = 0; const pos = r.acc.positions;
      for (let t = 0; t < r.acc.triangleCount; t++) for (let c = 0; c < 3; c++) { const o = t * 9 + c * 3; if (Math.hypot(pos[o] - focus.centre[0], pos[o + 1] - focus.centre[1], pos[o + 2] - focus.centre[2]) > 2.6) continue; const rel = MOv[(t * 3 + c) * 4 + 3] * H; n++; if (rel > 1e-3) lit++; mx = Math.max(mx, rel); }
      v1Note = `; within 2.6 mm: ${lit} of ${n} corners relieved, max ${mx.toFixed(3)} mm (v1's 20 mm patches)`;
    }
    const img = render(new Float32Array(r.acc.positions), W, Hc, petalCam, { ...RAKE, supersample: 2 });
    const rw = r.stats.ringsWindow;
    push(img, [`${name}, H ${H} mm (EXPORT, raking light)`, opt.mode === 'v1' ? `v1: pores ${DEFAULTS.bonePoreSize ?? 2} mm x ratio 2.5; ${fmt(r.acc.triangleCount)} tris${v1Note}` : opt.mode === 'lattice' ? `v2 pores 0.5-1.5 mm on 0.4 mm edges: ${fmt(r.acc.triangleCount)} tris` : opt.mode === 'grid' ? `refined in the window: +${fmt(r.acc.triangleCount - L.acc.triangleCount)} tris` : `window: ${rw ? rw.ringed : 0} pores ringed, ${rw ? rw.nestedRinged : 0} nested, +${fmt(r.acc.triangleCount - L.acc.triangleCount)} tris${rw && rw.missingBoundaryEdges ? `, ${rw.missingBoundaryEdges} open edges` : ''}`]);
    console.log('A', name, H, r.acc.triangleCount, JSON.stringify(rw || {}));
  }
}

/* -------------------------------------------- B: the pore close-up */
{
  const dom = PL.plateDomain();
  const win = { x0: 10, x1: 16, y0: -3, y1: 3 };
  /* the camera: a fully admitted, unmerged pore with a nested pit, if any */
  const pick = (packing) => {
    const params = { ...B.bone2Params({ textureHeight: 1.0 }), packing };
    const field = B.bone2Field(params);
    let c = null, sc = -1;
    for (const pore of field.poresIn([11, -2, -0.6], [15, 2, 0.6])) { const d = field.discOf(pore, [pore.centre[0], pore.centre[1], 0], [0, 0, 1]); if (!d || d.a < 1) continue; const s = d.rho + (d.nested.length ? 1 : 0) - Math.hypot(d.centre[0] - 13, d.centre[1]) * 0.1; if (s > sc) { sc = s; c = d; } }
    return { params, field, c };
  };
  for (const [name, method, packing, edge] of [['GRID at its derived edge', 'grid', 'overlap'], ['GRID at 0.1 mm', 'grid=', 'overlap', 0.1001], ['RINGS (merging)', 'rings', 'overlap'], ['RINGS (hard-core)', 'rings', 'hardcore']]) {
    const { params, field, c } = pick(packing);
    const M = PL.meshPatch(method, dom, field, params, win, { edge });
    const cam = { center: [c.centre[0], c.centre[1], 0.5], dir: [0.12, -0.22, 0.97], up: [0, 1, 0], halfHeight: Math.max(0.55, c.rho * 1.9) };
    const img = render(soupOf(M), W, Hc, cam, { light1: [-0.5, 0.6, 0.6], light2: [0.3, -0.2, 0.4], supersample: 2, tint: cavity(M) });
    wire(img, W, Hc, M.P, M.tri, cam);
    const rr = PL.poreRoundness(M, dom, field, params, win);
    const med = (k) => { const v = rr.map((q) => q[k]).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : NaN; };
    push(img, [`${name}: one pore, wireframe (plate, H 1.0)`, `${fmt(Math.round(M.trisPerMm2))} tris/mm2, edge ${(M.eUsed ?? 0.4).toFixed(3)} mm; this pore ${(2 * c.rho).toFixed(2)} mm${c.nested.length ? `, ${c.nested.length} nested` : ''}`, `window: ${med('edges')} segments/circumference, ${med('devPct').toFixed(1)}% off its circle (median)`]);
  }
  /* the nested specks, top-down, cavity tint */
  const params = { ...B.bone2Params({ textureHeight: 1.0 }), packing: 'hardcore' };
  const field = B.bone2Field(params);
  const M = PL.meshPatch('rings', dom, field, params, win);
  const img = render(soupOf(M), W, Hc, { center: [13, 0, 0], dir: [0, 0, 1], up: [0, 1, 0], halfHeight: 2.0 }, { light1: [-0.4, 0.5, 0.75], light2: [0.3, -0.2, 0.4], supersample: 2, tint: cavity(M) });
  push(img, ['THE NESTED SPECKS, top-down (rings, hard-core,', `cavity tint): ${M.nested} nested pits in ${M.ringPores} pores; a pit of`, `${B.B2_NEST_FRAC} x its pore, never under ${B.B2_NEST_MIN_MM} mm (UNVALIDATED)`]);
}

/* ------------------------------------- C: the depth cross-section */
for (const H of [1.0, 2.5]) {
  const params = { ...B.bone2Params({ textureHeight: H }), packing: 'hardcore' };
  const field = B.bone2Field(params);
  const dom = PL.plateDomain();
  /* a line through the most pores: the row y0 with the most crossings */
  let y0 = 0, bestN = -1;
  for (let y = -2; y <= 2; y += 0.05) { let n = 0; for (let x = 10; x < 16; x += 0.02) if (field.F([x, y, 0], [0, 0, 1]) < 0.05) n++; if (n > bestN) { bestN = n; y0 = y; } }
  const win = { x0: 10, x1: 16, y0: y0 - 1.5, y1: y0 + 1.5 };
  const Mr = PL.meshPatch('rings', dom, field, params, win), Mg = PL.meshPatch('grid=', dom, field, params, win, { edge: 0.1001 });
  /* the meshes' heights along the line: the triangle each sample falls in, interpolated */
  const along = (M, x) => { for (let t = 0; t < M.tri.length; t += 3) { const a = M.tri[t], b = M.tri[t + 1], c = M.tri[t + 2]; const ax = M.chartXY[a * 2], ay = M.chartXY[a * 2 + 1], bx = M.chartXY[b * 2], by = M.chartXY[b * 2 + 1], cx = M.chartXY[c * 2], cy = M.chartXY[c * 2 + 1]; const det = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay); if (!det) continue; const l1 = ((bx - x) * (cy - y0) - (cx - x) * (by - y0)) / det, l2 = ((cx - x) * (ay - y0) - (ax - x) * (cy - y0)) / det, l3 = 1 - l1 - l2; if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue; return (l1 * M.F[a] + l2 * M.F[b] + l3 * M.F[c]) * H; } return null; };
  const img = Buffer.alloc(W * Hc * 3, 250);
  const X0 = 10.5, X1 = 15.5, px = (x) => 20 + ((x - X0) / (X1 - X0)) * (W - 40), py = (z) => Hc - 50 - (z / Math.max(2.5, H)) * (Hc - 110);
  const plot = (f, col) => { let prev = null; for (let i = 0; i <= 1200; i++) { const x = X0 + (X1 - X0) * i / 1200; const z = f(x); if (z === null) { prev = null; continue; } const p = [px(x), py(z)]; if (prev) { const n = Math.ceil(Math.hypot(p[0] - prev[0], p[1] - prev[1])) + 1; for (let k = 0; k <= n; k++) { const xx = Math.round(prev[0] + (p[0] - prev[0]) * k / n), yy = Math.round(prev[1] + (p[1] - prev[1]) * k / n); for (const [dx, dy] of [[0, 0], [1, 0], [0, 1]]) { const o = ((yy + dy) * W + xx + dx) * 3; if (o >= 0 && o < img.length - 3) { img[o] = col[0]; img[o + 1] = col[1]; img[o + 2] = col[2]; } } } } prev = p; } };
  for (let z = 0; z <= Math.max(2.5, H) + 1e-9; z += 0.5) { const y = Math.round(py(z)); for (let x = 20; x < W - 20; x += 2) { const o = (y * W + x) * 3; img[o] = img[o + 1] = img[o + 2] = 200; } text(img, W, Hc, 2, y - 3, z.toFixed(1), [120, 120, 120], 1); }
  plot((x) => field.F([x, y0, 0], [0, 0, 1]) * H, [40, 40, 40]);
  plot((x) => along(Mg, x), [230, 120, 40]);
  plot((x) => along(Mr, x), [30, 150, 200]);
  text(img, W, Hc, 20, 16, `SECTION at H ${H} mm, 1:1 (mm), hard-core`, [30, 30, 30], 1);
  text(img, W, Hc, 20, 30, 'black: the field  blue: rings  orange: grid 0.1', [30, 30, 30], 1);
  const pl = DATA.plate.find((r) => r.domain === 'plate' && r.params.packing === 'hardcore' && r.params.D === 0.5 && Math.abs(r.params.H - (H === 1.0 ? 0.4 : 2.5)) < 1e-9);
  push(img, [`DEPTH CROSS-SECTION through a row of pores, H ${H} mm`, `the pores 0.5-1.5 mm; depth/diameter at H ${H}: ${pl ? `${pl.methods.rings.depthOverDiamMedian} median` : '-'}`, 'floors ON the sheet (0), the network at H']);
}

/* ------------------------------------------------------ D: sweeps */
{
  const dom = PL.plateDomain();
  const win = { x0: 10, x1: 16, y0: -3, y1: 3 };
  const cam = { center: [13, 0, 0], dir: [0.12, -0.22, 0.97], up: [0, 1, 0], halfHeight: 2.2 };   // near top-down, raking light: a pit reads as a pit
  for (const D of [0.5, 0.75, 1.0]) {
    const params = { ...B.bone2Params({ textureHeight: 1.0, bonePoreSize: D }) };
    const field = B.bone2Field(params);
    const M = PL.meshPatch('grid', dom, field, params, win);
    push(render(soupOf(M), W, Hc, cam, { ...RAKE, supersample: 2, tint: cavity(M) }), [`SIZE: smallest pore ${D} mm (x3 spread), H 1.0, near top-down`, `the derived grid (the field as drawn): edge ${(M.eUsed ?? 0).toFixed(3)} mm asked, ${(0.4 / 2 ** Math.ceil(Math.log2(0.4 / M.eUsed))).toFixed(4)} landed (0.4/2^k), ${fmt(Math.round(M.trisPerMm2))} tris/mm2`, 'merging pores, cavity tint']);
  }
  for (const H of [0.4, 1.5, 2.5]) {
    const params = { ...B.bone2Params({ textureHeight: H }) };
    const field = B.bone2Field(params);
    const M = PL.meshPatch('grid', dom, field, params, win);
    push(render(soupOf(M), W, Hc, cam, { ...RAKE, supersample: 2, tint: cavity(M) }), [`HEIGHT ${H} mm (smallest pore 0.5, x3), near top-down`, `the derived grid (the field as drawn); fade from a ridge ${Math.max(H * 15 / 8, 0.4).toFixed(2)} mm on a bloom`, 'merging pores, cavity tint']);
  }
}

/* -------------------------------------------- E: the budget table */
{
  const img = Buffer.alloc(W * 2 * Hc * 3, 30);
  const lines = ['BUDGET (EXPORT triangles, % of 1,500,000) and TIME', ''];
  lines.push('state            v1      v2 grid 0.1   rings*   rings* hc   derived grid');
  for (const r of DATA.bloom || []) {
    if (r.refused) { lines.push(`${r.name.slice(0, 15).padEnd(16)} ${String(r.v1Pct).padStart(5)}%  texture refused (${r.refused}): untextured, nothing to refine`); continue; }
    lines.push(`${r.name.slice(0, 15).padEnd(16)} ${String(r.v1Pct).padStart(5)}%  ${String(r.grid01Pct).padStart(7)}%   ${String(r.ringsEstPct).padStart(6)}%  ${String(r.ringsHardcoreEstPct).padStart(6)}%   ${String(r.derivedGridPct).padStart(8)}%`);
  }
  lines.push('* estimated: porous area x the plate\'s measured density');
  lines.push('');
  if (BR) {
    lines.push('BROWSER (Chromium, EXPORT): drag preview / v1 release / v2');
    for (const [k, v] of Object.entries(BR.states)) { const e = v.export; lines.push(`${k.padEnd(9)} ${e.previewMs} ms / ${e.v1Ms} ms / lattice ${e.v2LatticeMs} ms${e.v2Grid01Ms ? `, grid ${e.v2Grid01Ms} ms` : ''}, rings* ${e.v2RingsEstMs.overlap} ms`); }
  }
  lines.forEach((l, i) => text(img, W * 2, Hc, 10, 12 + i * 15, l, [215, 215, 205], 1));
  cells.push({ img, caption: ['THE BUDGET AND TIME TABLE (docs/data/bloom-texture-bone-v2*.json)'], wide: 2 });
}

/* ----------------------------------------------------- compose */
const rows = [];
let row = [], used = 0;
for (const c of cells) { const w = c.wide || 1; if (used + w > COLS) { rows.push(row); row = []; used = 0; } row.push(c); used += w; }
if (row.length) rows.push(row);
const SW = W * COLS, SH = rows.length * (Hc + CAP) + 40;
const sheet = Buffer.alloc(SW * SH * 3, 18);
text(sheet, SW, SH, 10, 10, 'BONE v2 (PROTOTYPE): finer, rounder, deeper pores. EXPORT, Node builds, deterministic soft render.', [240, 200, 120], 2);
/* captions wrap at the cell's width (6 px a glyph): a caption may not run into
   the next cell */
const wrap = (lines, cols) => { const out = []; for (const l of lines) { let cur = ''; for (const w of l.split(' ')) { if (cur && (cur + ' ' + w).length > cols) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; } if (cur) out.push(cur); } return out; };
rows.forEach((r, ri) => { let x = 0; for (const c of r) { const w = (c.wide || 1) * W; blit(sheet, SW, SH, c.img, w, Hc, x, 40 + ri * (Hc + CAP)); const cap = wrap(c.caption, Math.floor((w - 12) / 6)); if (cap.length > 5) throw new Error(`a caption needs ${cap.length} lines: ${cap.join(' / ')}`); cap.forEach((l, k) => text(sheet, SW, SH, x + 6, 40 + ri * (Hc + CAP) + Hc + 4 + k * 12, l, [220, 220, 210], 1)); x += w; } });
fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
writePng(OUT, SW, SH, sheet);
console.log(`wrote ${OUT} (${SW}x${SH})`);
