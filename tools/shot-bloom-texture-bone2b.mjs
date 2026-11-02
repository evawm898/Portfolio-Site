#!/usr/bin/env node
/* ===================================================================
   shot-bloom-texture-bone2b.mjs — THE BONE v2 ROUND-2 SHEET (the prototype;
   read docs/bloom-surface-texture-bone-v2.md §13-§19).

     node tools/shot-bloom-texture-bone2b.mjs docs/img/bloom-texture-bone-v2b.png
       [--data docs/data/bloom-texture-bone-v2b.json]
       [--browser docs/data/bloom-texture-bone-v2b-browser.json]
       [--limits docs/data/bloom-budget-limits.json]

   Every cell is a Node build drawn by `bloom-soft-render.mjs` (deterministic:
   no pixel figure is quoted and none is owed), EXPORT, the numbers in every
   caption read off the build or the instruments' JSON:
     A  the SAME PETAL at raking light, H 1.0: the grid at 0.1 mm, the HYBRID
        (full), the COARSE build (the v2 field on the lattice) — the refinement
        in a 4.5 mm window on petal 0 (the full build is the same mesher on the
        whole bloom; the window keeps the sheet's build short)
     B  a MERGE SEAM with the wireframe (the plate, H 1.0): the hybrid, the grid
        at 0.1 mm, the rings of round 1 — the same pair of merged pores
     C  the NIB close-up: petal 0's apex, hybrid, H 0.4 and 2.5 (curvature
        decides; no nib mask), with the relief measured on the build
     D  DEPTH CROSS-SECTIONS at H 1.5 and 2.5 (the hybrid against the field)
     E  the budget / time / limits table
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const B = await import(pathToFileURL(path.join(ROOT, 'bloom-texture-bone2.js')).href);
const H2 = await import(pathToFileURL(path.join(ROOT, 'bloom-texture-bone2-hybrid.js')).href);
const PL = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-texture-bone2-plate.mjs')).href);
const MS = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-texture-bone2b-measure.mjs')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const { render, writePng, text, blit } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-soft-render.mjs')).href);
const OUT = process.argv[2];
if (!OUT) { console.error('usage: shot-bloom-texture-bone2b.mjs <out.png> [--data <json>] [--browser <json>] [--limits <json>]'); process.exit(2); }
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const readJ = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const DATA = readJ(arg('--data', path.join(ROOT, 'docs/data/bloom-texture-bone-v2b.json'))) || {};
const BR = readJ(arg('--browser', path.join(ROOT, 'docs/data/bloom-texture-bone-v2b-browser.json')));
const LIM = readJ(arg('--limits', path.join(ROOT, 'docs/data/bloom-budget-limits.json')));
const W = 360, Hc = 360, CAP = 90, COLS = 4;
const RAKE = { light1: [0.95, -0.15, 0.25], light2: [-0.3, 0.4, 0.3] };
const fmt = (n) => (n === undefined || n === null ? '-' : n.toLocaleString('en-US'));
const norm = (v) => { const L = Math.hypot(...v); return v.map((x) => x / L); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function projector(cam, w, h) {
  const fwd = norm(cam.dir.map((c) => -c)), right = norm(cross(fwd, cam.up)), up = norm(cross(right, fwd)), scale = (h / 2) / cam.halfHeight;
  return (p) => { const d = [p[0] - cam.center[0], p[1] - cam.center[1], p[2] - cam.center[2]]; return [w / 2 + dot(d, right) * scale, h / 2 - dot(d, up) * scale]; };
}
function wire(img, w, h, P, tri, cam, col = [30, 200, 220], alpha = 0.55, keep = null) {
  const pr = projector(cam, w, h);
  const seen = new Set();
  for (let t = 0; t < tri.length; t += 3) for (let k = 0; k < 3; k++) {
    const a = tri[t + k], b = tri[t + (k + 1) % 3]; const key = a < b ? `${a},${b}` : `${b},${a}`; if (seen.has(key)) continue; seen.add(key);
    const A = pr([P[a * 3], P[a * 3 + 1], P[a * 3 + 2]]), Bq = pr([P[b * 3], P[b * 3 + 1], P[b * 3 + 2]]);
    const n = Math.ceil(Math.hypot(Bq[0] - A[0], Bq[1] - A[1])) + 1;
    if (n > 4 * w) continue;
    for (let i = 0; i <= n; i++) { const x = Math.round(A[0] + (Bq[0] - A[0]) * i / n), y = Math.round(A[1] + (Bq[1] - A[1]) * i / n); if (x < 0 || y < 0 || x >= w || y >= h) continue; const o = (y * w + x) * 3; for (let c = 0; c < 3; c++) img[o + c] = Math.round(img[o + c] * (1 - alpha) + col[c] * alpha); }
  }
  if (keep) for (const [p, col2] of keep) { const [x, y] = pr(p); for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) { const xx = Math.round(x) + dx, yy = Math.round(y) + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const o = (yy * w + xx) * 3; img[o] = col2[0]; img[o + 1] = col2[1]; img[o + 2] = col2[2]; } }
}
const cells = [];
const push = (img, caption, wide = 1) => cells.push({ img, caption, wide });
const soupOf = (M) => { const pos = new Float32Array(M.tri.length * 3); for (let t = 0; t < M.tri.length; t++) for (let k = 0; k < 3; k++) pos[t * 3 + k] = M.P[M.tri[t] * 3 + k]; return pos; };
const cavity = (M) => (t) => { const f = (M.F[M.tri[t * 3]] + M.F[M.tri[t * 3 + 1]] + M.F[M.tri[t * 3 + 2]]) / 3; return 0.35 + 0.65 * f; };
const pm = (m) => (DATA.petal && DATA.petal.methods[m]) || null;

/* ------------------------------------------------ A: the same petal */
const focus = await MS.petalFocus();
console.log('focus', focus);
{
  const H = 1.0, stH = B.bone2State(DEFAULTS, { textureHeight: H });
  const foc = { organ: 'petal', centre: focus.centre, normal: focus.normal, radiusMm: 4.5 };
  const cam = { center: focus.centre, dir: norm([focus.normal[0] + 0.25, focus.normal[1] - 0.35, focus.normal[2]]), up: [1, 0, 0], halfHeight: 2.6 };
  const L = await B.bone2Bloom(stH, { mode: 'lattice' });
  for (const [name, opt, key] of [['GRID 0.1 mm', { mode: 'grid', edgeMm: 0.1, focus: foc }, 'grid 0.1'], ['HYBRID (full detail / export)', { mode: 'hybrid', focus: foc }, 'HYBRID'], ['COARSE (release preview)', { mode: 'coarse' }, 'lattice (= coarse)']]) {
    const r = await B.bone2Bloom(stH, opt);
    const img = render(new Float32Array(r.acc.positions), W, Hc, cam, { ...RAKE, supersample: 2 });
    const m = pm(key);
    push(img, [`${name}, petal 0, H ${H} mm, raking light (EXPORT)`, m ? `${fmt(m.trisPerMm2)} tris/mm2 here; merged pores ${m.merged.median}% off their circle (median of ${m.merged.n}, p90 ${m.merged.p90}%)` : '', m ? `seam error ${m.seam.rmsMm} mm RMS (max ${m.seam.maxMm}) at H 1.0; +${fmt(r.acc.triangleCount - L.acc.triangleCount)} tris in the window` : '']);
    console.log('A', name, r.acc.triangleCount);
  }
  /* the hybrid's wireframe on the petal, the same window close */
  const r = await B.bone2Bloom(stH, { mode: 'hybrid', focus: foc, capture: { organ: 'petal', centre: focus.centre, normal: focus.normal, radiusMm: 1.4 } });
  const mesh = r.stats.capture.mesh;
  const camW = { center: focus.centre, dir: focus.normal, up: [1, 0, 0], halfHeight: 0.9 };
  const img = render(soupOf({ P: mesh.P, tri: mesh.tri }), W, Hc, camW, { light1: [-0.4, 0.5, 0.75], light2: [0.3, -0.2, 0.4], supersample: 2, tint: cavity(mesh) });
  wire(img, W, Hc, mesh.P, mesh.tri, camW, [30, 200, 220], 0.5);
  push(img, ['THE HYBRID on petal 0, top-down WIREFRAME (undisplaced,', 'shaded by the field: dark = deep): rings on every pore, clipped', 'at each merged neighbour; fine rows only on the creases']);
}

/* ----------------------------------------- B: a merge seam, wireframe */
{
  const H = 1.0, params = B.bone2Params({ textureHeight: H }), field = B.bone2Field(params), dom = PL.plateDomain();
  const win = { x0: 10, x1: 16, y0: -3, y1: 3 };
  /* the pair: two fully admitted, merged pores near the middle, with a wall between them still drawn (a crease) */
  const discs = PL.chartDiscs(dom, field, params, { x0: 9, x1: 17, y0: -4, y1: 4 }).filter((d) => d.a === 1 && !d.nested.length);
  let best = null, sc = -Infinity;
  for (let i = 0; i < discs.length; i++) for (let j = i + 1; j < discs.length; j++) {
    const a = discs[i], b = discs[j], d = Math.hypot(a.c[0] - b.c[0], a.c[1] - b.c[1]);
    if (!(d < 1.15 * (a.rho + b.rho) && d > 0.9 * (a.rho + b.rho))) continue;
    const mid = [(a.c[0] + b.c[0]) / 2, (a.c[1] + b.c[1]) / 2];
    const s = Math.min(a.rho, b.rho) - Math.hypot(mid[0] - 13, mid[1]) * 0.05;
    if (s > sc) { sc = s; best = { a, b, mid }; }
  }
  const cam = { center: [best.mid[0], best.mid[1], 0.3], dir: [0.05, -0.12, 0.99], up: [0, 1, 0], halfHeight: Math.max(best.a.rho, best.b.rho) * 1.25 };
  const pl = DATA.plate && DATA.plate.find((r) => r.domain === 'plate');
  for (const [name, method, o, key] of [['HYBRID', 'hybrid', {}, 'HYBRID'], ['GRID 0.1 mm', 'grid=', { edge: 0.1001 }, 'grid 0.1'], ['RINGS (round 1, power cells)', 'rings', {}, 'rings']]) {
    const opts = { ...o };
    const M = PL.meshPatch(method, dom, field, params, win, opts);
    const img = render(soupOf(M), W, Hc, cam, { light1: [-0.5, 0.6, 0.6], light2: [0.3, -0.2, 0.4], supersample: 2, tint: cavity(M) });
    const dots = [];
    if (opts.hybrid) for (let v = opts.hybrid.nV0; v < opts.hybrid.P.length / 3; v++) { const k = opts.hybrid.kind[v - opts.hybrid.nV0]; if (k === H2.HY_KIND.seam || k === H2.HY_KIND.seamCross || k === H2.HY_KIND.junction) dots.push([[M.P[v * 3], M.P[v * 3 + 1], M.P[v * 3 + 2]], k === H2.HY_KIND.junction ? [250, 80, 200] : [250, 150, 40]]); }
    wire(img, W, Hc, M.P, M.tri, cam, [30, 200, 220], 0.5, dots);
    const m = pl && pl.methods[key];
    push(img, [`MERGE SEAM, ${name}: two merged pores ${(2 * best.a.rho).toFixed(2)} / ${(2 * best.b.rho).toFixed(2)} mm (plate, H 1.0, cavity tint)`, m ? `plate: ${fmt(m.trisPerMm2)} tris/mm2; merged pores ${m.merged.median}% off their circle; seam error RMS ${m.seam.rmsMm} mm (max ${m.seam.maxMm})` : '', opts.hybrid ? 'orange: seam-row points ON the crease; magenta: wall-junction points' : '']);
  }
  /* the depth section at the seam: across the pair, the field and the hybrid */
  const Mh = PL.meshPatch('hybrid', dom, field, params, win, {});
  const Mg = PL.meshPatch('grid=', dom, field, params, win, { edge: 0.1001 });
  push(section(field, H, [best.a.c[0], best.a.c[1]], [best.b.c[0], best.b.c[1]], [[Mh, [30, 150, 200]], [Mg, [230, 120, 40]]], 'black: the field  blue: hybrid  orange: grid 0.1'), ['SECTION through the two merged pores\' centres (1:1, mm), H 1.0:', 'the crease between them is the wall the seam row draws']);
}

/* section plot: the field and meshes' heights along the line p0 -> p1 (extended) */
function section(field, H, p0, p1, meshes, legend) {
  const img = Buffer.alloc(W * Hc * 3, 250);
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L0 = Math.hypot(dx, dy), ux = dx / L0, uy = dy / L0;
  const S0 = -1.2, S1 = L0 + 1.2;
  const at = (s) => [p0[0] + ux * s, p0[1] + uy * s];
  const along = (M, x, y) => { for (let t = 0; t < M.tri.length; t += 3) { const a = M.tri[t], b = M.tri[t + 1], c = M.tri[t + 2]; const ax = M.chartXY[a * 2], ay = M.chartXY[a * 2 + 1], bx = M.chartXY[b * 2], by = M.chartXY[b * 2 + 1], cx = M.chartXY[c * 2], cy = M.chartXY[c * 2 + 1]; const det = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay); if (!det) continue; const l1 = ((bx - x) * (cy - y) - (cx - x) * (by - y)) / det, l2 = ((cx - x) * (ay - y) - (ax - x) * (cy - y)) / det, l3 = 1 - l1 - l2; if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue; return (l1 * M.F[a] + l2 * M.F[b] + l3 * M.F[c]) * H; } return null; };
  const zMax = Math.max(1.5, H);
  const px = (s) => 20 + ((s - S0) / (S1 - S0)) * (W - 40), py = (z) => Hc - 50 - (z / zMax) * (Hc - 110);
  const plot = (f, col) => { let prev = null; for (let i = 0; i <= 900; i++) { const s = S0 + (S1 - S0) * i / 900; const z = f(s); if (z === null) { prev = null; continue; } const p = [px(s), py(z)]; if (prev) { const n = Math.ceil(Math.hypot(p[0] - prev[0], p[1] - prev[1])) + 1; for (let k = 0; k <= n; k++) { const xx = Math.round(prev[0] + (p[0] - prev[0]) * k / n), yy = Math.round(prev[1] + (p[1] - prev[1]) * k / n); for (const [ddx, ddy] of [[0, 0], [1, 0], [0, 1]]) { const o = ((yy + ddy) * W + xx + ddx) * 3; if (o >= 0 && o < img.length - 3) { img[o] = col[0]; img[o + 1] = col[1]; img[o + 2] = col[2]; } } } } prev = p; } };
  for (let z = 0; z <= zMax + 1e-9; z += 0.5) { const y = Math.round(py(z)); for (let x = 20; x < W - 20; x += 2) { const o = (y * W + x) * 3; img[o] = img[o + 1] = img[o + 2] = 200; } text(img, W, Hc, 2, y - 3, z.toFixed(1), [120, 120, 120], 1); }
  plot((s) => { const [x, y] = at(s); return field.F([x, y, 0], [0, 0, 1]) * H; }, [40, 40, 40]);
  for (const [M, col] of meshes) plot((s) => { const [x, y] = at(s); return along(M, x, y); }, col);
  text(img, W, Hc, 20, 16, `SECTION, H ${H} mm, 1:1 mm`, [30, 30, 30], 1);
  text(img, W, Hc, 20, 30, legend, [30, 30, 30], 1);
  return img;
}

/* -------------------------------------------------- C: the nib */
{
  for (const H of [0.4, 2.5]) {
    const st = B.bone2State(DEFAULTS, { textureHeight: H });
    const off = await B.bone2Bloom(st, { mode: 'lattice', capability: { organReliefOff: true } });
    const pr = off.rec.petalsAll[0].triRange, P0 = off.acc.positions;
    let apex = null, best = -Infinity;
    for (let i = pr[0] * 9; i < pr[1] * 9; i += 3) { const r = Math.hypot(P0[i], P0[i + 1]); if (r > best) { best = r; apex = [P0[i], P0[i + 1], P0[i + 2]]; } }
    /* the petal's normal near the apex: the lattice's mean facing direction there */
    let nsum = [0, 0, 0];
    for (let t = pr[0]; t < pr[1]; t++) { const o = t * 9; if (Math.hypot(P0[o] - apex[0], P0[o + 1] - apex[1], P0[o + 2] - apex[2]) > 1.5) continue; const n = cross([P0[o + 3] - P0[o], P0[o + 4] - P0[o + 1], P0[o + 5] - P0[o + 2]], [P0[o + 6] - P0[o], P0[o + 7] - P0[o + 1], P0[o + 8] - P0[o + 2]]); if (n[2] > 0) nsum = nsum.map((v, k) => v + n[k]); }
    const nn = norm(nsum);
    const foc = { organ: 'petal', centre: apex, normal: nn, radiusMm: 2.5 };
    const r = await B.bone2Bloom(st, { mode: 'hybrid', focus: { ...foc, normal: [0, 0, 1], radiusMm: 2.5 }, capture: { organ: 'petal', centre: apex, normal: nn, radiusMm: 1.6 } });
    /* the relief within 1.2 mm of the apex, read on the capture: the field x H x masks would need the masks; the build's own displacement against the undisplaced capture */
    const n04 = DATA.nib && DATA.nib.find((q) => q.H === H);
    const cam = { center: apex, dir: norm([nn[0] * 0.6 - apex[0] * 0.02, nn[1] * 0.6 - apex[1] * 0.02, nn[2] + 0.3]), up: norm([apex[0], apex[1], 0]), halfHeight: 1.6 };
    const img = render(new Float32Array(r.acc.positions), W, Hc, cam, { ...RAKE, supersample: 2 });
    push(img, [`THE NIB, petal 0's apex, HYBRID, H ${H} mm (raking light)`, n04 ? `within 1.2 mm of the apex: ${n04.reliefOver005} corners raised > 0.05 mm, max ${n04.maxMm} mm, nearest ${n04.nearestReliefToApexMm} mm from the apex` : '', 'curvature decides; no nib mask (ruling 5)']);
  }
}

/* ------------------------------------- D: depth cross-sections */
for (const H of [1.5, 2.5]) {
  const params = B.bone2Params({ textureHeight: H }), field = B.bone2Field(params), dom = PL.plateDomain();
  let y0 = 0, bestN = -1;
  for (let y = -2; y <= 2; y += 0.05) { let n = 0; for (let x = 10.5; x < 15.5; x += 0.02) if (field.F([x, y, 0], [0, 0, 1]) < 0.05) n++; if (n > bestN) { bestN = n; y0 = y; } }
  const win = { x0: 10, x1: 16, y0: y0 - 1.5, y1: y0 + 1.5 };
  const Mh = PL.meshPatch('hybrid', dom, field, params, win, {});
  const dd = DATA.depth && DATA.depth.find((q) => q.H === H);
  push(section(field, H, [11.2, y0], [14.8, y0], [[Mh, [30, 150, 200]]], 'black: the field  blue: the hybrid'), [`DEPTH CROSS-SECTION, H ${H} mm, a row of merging pores`, dd ? `depth / diameter: median ${dd.depthOverDiameter.median} (max ${dd.depthOverDiameter.max}); smallest pores ${dd.smallestPores.median}, largest ${dd.largestPores.median}` : '', H === 2.5 ? '2.5 mm is the ruled maximum: UNVALIDATED for powder removal' : 'floors ON the sheet (0), the network at H']);
}

/* -------------------------------------------- E: the table */
{
  const img = Buffer.alloc(W * 3 * Hc * 3, 30);
  const lines = ['BUDGET: EXPORT triangles, % of the 1,500,000 cap (the cap is NOT moved)', ''];
  lines.push('state                         v1        COARSE     HYBRID (full)     coarse-rings');
  for (const r of DATA.budget || []) lines.push(`${r.name.slice(0, 28).padEnd(29)} ${String(r.v1Pct).padStart(5)}%    ${String(r.coarsePct).padStart(5)}%   ${fmt(r.hybridTris).padStart(10)} ${String(r.hybridPct).padStart(5)}%   ${String(r.coarseRingsPct).padStart(5)}%`);
  lines.push('');
  if (BR) {
    lines.push('BROWSER (Chromium, EXPORT, geometry build): drag preview / v1 / COARSE release / FULL');
    for (const [k, v] of Object.entries(BR.states)) lines.push(`${k.padEnd(9)} ${v.preview ? v.preview.ms : '-'} ms / ${v.v1 ? v.v1.ms : '-'} ms / ${v.coarse ? v.coarse.ms : '-'} ms / ${v.full ? (v.full.ms ? `${fmt(v.full.ms)} ms (${fmt(v.full.tris)} tris)` : v.full.crashed ? 'THE PAGE CRASHED (out of memory)' : v.full.stalled ? `stalled > ${v.full.stalled} s` : v.full.error || '-') : '-'}`);
    lines.push('');
  }
  if (LIM) {
    lines.push('WHAT THE CAP PROTECTS (Chromium, the page\'s export path on a synthetic mesh):');
    for (const r of LIM.rows) lines.push(`${(r.N / 1e6).toFixed(1).padStart(5)} M tris: STL ${r.stlMB} MB; build ${r.steps && r.steps.build ? Math.round(r.steps.build) : '-'} ms, STL ${r.steps && r.steps.stl ? Math.round(r.steps.stl) : '-'} ms, render ${r.steps && r.steps.render ? Math.round(r.steps.render) : '-'} ms${r.error ? ' THREW ' + r.error.slice(0, 40) : ''}${r.stalled ? ' STALLED' : ''}${r.crashed ? ' CRASHED' : ''}`);
    lines.push('a print-service upload limit: not recorded in this repository');
  }
  lines.forEach((l, i) => text(img, W * 3, Hc, 10, 12 + i * 15, l, [215, 215, 205], 1));
  cells.push({ img, caption: ['THE BUDGET, TIME AND LIMITS TABLE (docs/data/bloom-texture-bone-v2b*.json, docs/data/bloom-budget-limits.json)'], wide: 3 });
}

/* ----------------------------------------------------- compose */
const rows = [];
let row = [], used = 0;
for (const c of cells) { const w = c.wide || 1; if (used + w > COLS) { rows.push(row); row = []; used = 0; } row.push(c); used += w; }
if (row.length) rows.push(row);
const SW = W * COLS, SH = rows.length * (Hc + CAP) + 40;
const sheet = Buffer.alloc(SW * SH * 3, 18);
text(sheet, SW, SH, 10, 10, 'BONE v2 ROUND 2 (PROTOTYPE): the HYBRID mesh, COARSE vs FULL, the nib, depth. EXPORT, Node builds, soft render.', [240, 200, 120], 2);
const wrap = (lines, cols) => { const out = []; for (const l of lines) { if (!l) continue; let cur = ''; for (const w of l.split(' ')) { if (cur && (cur + ' ' + w).length > cols) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; } if (cur) out.push(cur); } return out; };
rows.forEach((r, ri) => { let x = 0; for (const c of r) { const w = (c.wide || 1) * W; blit(sheet, SW, SH, c.img, w, Hc, x, 40 + ri * (Hc + CAP)); const cap = wrap(c.caption, Math.floor((w - 12) / 6)); if (cap.length > 7) throw new Error(`a caption needs ${cap.length} lines: ${cap.join(' / ')}`); cap.forEach((l, k) => text(sheet, SW, SH, x + 6, 40 + ri * (Hc + CAP) + Hc + 4 + k * 12, l, [220, 220, 210], 1)); x += w; } });
fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
writePng(OUT, SW, SH, sheet);
console.log(`wrote ${OUT} (${SW}x${SH})`);
