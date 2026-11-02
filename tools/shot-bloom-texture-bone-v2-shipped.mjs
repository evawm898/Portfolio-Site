#!/usr/bin/env node
/* ===================================================================
   shot-bloom-texture-bone-v2-shipped.mjs — THE SHIPPED BONE v2 SHEET
   (docs/bloom-surface-texture-bone-v2-shipped.md).

     node tools/shot-bloom-texture-bone-v2-shipped.mjs docs/img/bloom-texture-bone-v2-shipped.png
       [--data docs/data/bloom-texture-bone-v2-shipped.json]
       [--browser docs/data/bloom-texture-bone-v2-browser.json]
       [--ladder <manifest.json>]

   Every cell is a NODE build of the SHIPPED geometry drawn by
   `bloom-soft-render.mjs` (deterministic: no pixel figure is quoted and none
   is owed), EXPORT, the default bloom with BONE (the ruled controls), and the
   numbers in every caption read off the build or the instruments' JSON:
     A  WHERE IT SHOWS: the allocator's exposure per cell as a heat-map on the
        coarse stream (cool = low, warm = high; the cells the cap bought full
        detail for drawn warm-bright, the rest dimmed; grey = no pore), face-on
        and from the side
     B  FULL against COARSE at raking light, the same camera, on the best-
        exposed selected cell
     C  THE BOUNDARY: a selected cell beside an unselected one, the full build
        with its wireframe (cyan) — the coarse triangles fanned to meet the
        refined edges read as fans of thin triangles along the seam
     D  the budget / time / heap table
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const { render, writePng, text, blit } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-soft-render.mjs')).href);
const OUT = process.argv[2];
if (!OUT) { console.error('usage: shot-bloom-texture-bone-v2-shipped.mjs <out.png> [--data <json>] [--browser <json>] [--ladder <json>]'); process.exit(2); }
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const readJ = (f) => (f && fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const DATA = readJ(arg('--data', path.join(ROOT, 'docs/data/bloom-texture-bone-v2-shipped.json'))) || {};
const BR = readJ(arg('--browser', path.join(ROOT, 'docs/data/bloom-texture-bone-v2-browser.json')));
const LAD = readJ(arg('--ladder', null));
const W = 420, Hc = 420, CAP = 96, COLS = 3;
const RAKE = { light1: [0.95, -0.15, 0.25], light2: [-0.3, 0.4, 0.3] };
const fmt = (n) => (n === undefined || n === null ? '-' : Number(n).toLocaleString('en-US'));
const norm = (v) => { const L = Math.hypot(...v); return v.map((x) => x / L); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cells = [];
const push = (img, caption, wide = 1) => cells.push({ img, caption, wide });

const ST = { ...DEFAULTS, petalTexture: 'BONE' };
const build = (detail, capability = null) => { const acc = new G.MeshBuilder({ exportMode: true, boneDetail: detail }); const t0 = performance.now(); const rec = G.buildBloomInto(acc, ST, { below: null, capability, scopes: null }); return { acc, rec, ms: Math.round(performance.now() - t0) }; };
console.log('building coarse …'); const C = build('coarse');
console.log('building full …'); const Fb = build('full');
const F = Fb.rec.texture.bone.full;
console.log(`coarse ${C.acc.triangleCount}, full ${Fb.acc.triangleCount} (${F.selectedCells}/${F.cells} cells, share ${F.fullShare.toFixed(3)})`);
const cellTris = F.cellTris, L = F.cellList;
if (C.acc.triangleCount !== F.baseTris) throw new Error(`the coarse build (${C.acc.triangleCount}) is not the full build's base (${F.baseTris})`);

/* ------------------------------------------------ A: the heat-map */
{
  const nT = C.acc.triangleCount, col = new Array(nT).fill(null);
  const Es = L.map((c) => c.E), Emax = Math.max(...Es, 1e-9);
  const ramp = (e, sel) => { const x = Math.max(0, Math.min(1, e / Emax)); const c = [40 + 215 * x, 70 + 120 * (1 - Math.abs(x - 0.5) * 2) + 40 * x, 230 - 200 * x]; return sel ? c : c.map((v) => v * 0.45 + 30); };
  L.forEach((c, i) => { for (const t of cellTris[i]) col[t] = ramp(c.E, c.selected); });
  const colorOf = (t) => col[t] || [150, 150, 150];
  const P = C.acc.positions;
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], P[i + k]); hi[k] = Math.max(hi[k], P[i + k]); }
  const ctr = lo.map((v, k) => (v + hi[k]) / 2), half = Math.max(hi[0] - lo[0], hi[1] - lo[1]) / 2 * 1.05;
  push(render(new Float32Array(P), W, Hc, { center: ctr, dir: [0, 0, 1], up: [0, 1, 0], halfHeight: half }, { colorOf, supersample: 2 }),
    [`WHERE IT SHOWS: exposure per cell (${fmt(F.cells)} cells of ${F.cellMm.toFixed(1)} mm), face-on`, `bright warm = the ${fmt(F.selectedCells)} cells the 2.0 M cap bought full detail (${(100 * F.fullShare).toFixed(1)}% of the porous area); dimmed = coarse; grey = no pore`, 'exposure: the share of a hemisphere of view directions the cell sees past every part (escape rays, derived; no organ list)']);
  push(render(new Float32Array(P), W, Hc, { center: ctr, dir: norm([0.2, -1, 0.55]), up: [0, 0, 1], halfHeight: half }, { colorOf, supersample: 2 }),
    ['WHERE IT SHOWS, from the side: the undersides and the hub between the feet read low (dim), the open faces high', `cells ranked by exposure; the allocator buys the highest first until the cap; ${F.passes} pass(es)`]);
}

/* ------------------------------------- B: full against coarse, raking */
const best = L.map((c, i) => ({ ...c, i })).filter((c) => c.selected && c.organ === 'petal').sort((a, b) => b.E - a.E)[0] || L.find((c) => c.selected);
{
  const n = norm(best.n), cam = { center: best.p, dir: norm([n[0] + 0.3, n[1] - 0.3, n[2] + 0.15]), up: Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], halfHeight: 3.2 };
  push(render(new Float32Array(Fb.acc.positions), W, Hc, cam, { ...RAKE, supersample: 2 }), [`FULL (the export): ${fmt(Fb.acc.triangleCount)} tris, ${((84 + 50 * Fb.acc.triangleCount) / 1e6).toFixed(1)} MB, raking light`, `the best-exposed selected cell (exposure ${best.E.toFixed(2)}), ${best.organ}; pores on their own rings, creases on rows, junctions patched`]);
  push(render(new Float32Array(C.acc.positions), W, Hc, cam, { ...RAKE, supersample: 2 }), [`COARSE (the release build, and the export's unselected cells): ${fmt(C.acc.triangleCount)} tris, the same camera`, 'the same pores at the same centres (TXB12) on the shipped 0.4 mm lattice']);
}

/* ------------------------------------------------ C: the boundary */
{
  /* a selected cell with an unselected porous neighbour on the same organ */
  let pair = null;
  for (const a of L) { if (!a.selected) continue; for (const b of L) { if (b.selected || b.organ !== a.organ || dot(norm(a.n), norm(b.n)) < 0.97) continue; const d = Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1], a.p[2] - b.p[2]); if (d < F.cellMm * 1.2 && (!pair || a.E > pair.a.E)) pair = { a, b, d }; } }
  if (pair) {
    const c = pair.a.p.map((v, k) => (v + pair.b.p[k]) / 2), n = norm(pair.a.n.map((v, k) => v + pair.b.n[k]));
    const cam = { center: c, dir: n, up: Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], halfHeight: 2.2 };
    const img = render(new Float32Array(Fb.acc.positions), W, Hc, cam, { ...RAKE, supersample: 2, color: [200, 192, 176] });
    /* the wireframe of every triangle within the window, fans amber */
    const fwd = norm(cam.dir.map((v) => -v)), right = norm(cross(fwd, cam.up)), up = norm(cross(right, fwd)), sc = (Hc / 2) / cam.halfHeight;
    const pr = (p) => { const d = [p[0] - c[0], p[1] - c[1], p[2] - c[2]]; return [W / 2 + dot(d, right) * sc, Hc / 2 - dot(d, up) * sc, dot(d, n)]; };
    const P = Fb.acc.positions;
    const line = (A, B, col) => { const k = Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1])) + 1; if (k > 2 * W) return; for (let i = 0; i <= k; i++) { const x = Math.round(A[0] + (B[0] - A[0]) * i / k), y = Math.round(A[1] + (B[1] - A[1]) * i / k); if (x < 0 || y < 0 || x >= W || y >= Hc) continue; const o = (y * W + x) * 3; for (let q = 0; q < 3; q++) img[o + q] = Math.round(img[o + q] * 0.4 + col[q] * 0.6); } };
    let nAll = 0;
    for (let t = 0; t < P.length / 9; t++) {
      const o = t * 9, q = [0, 1, 2].map((k) => pr([P[o + k * 3], P[o + k * 3 + 1], P[o + k * 3 + 2]]));
      if (q.some((v) => Math.abs(v[2]) > 0.6 || v[0] < -20 || v[0] > W + 20 || v[1] < -20 || v[1] > Hc + 20)) continue;
      nAll++;
      for (let k = 0; k < 3; k++) line(q[k], q[(k + 1) % 3], [40, 200, 220]);
    }
    push(img, [`THE FULL / COARSE BOUNDARY with the wireframe, ${fmt(nAll)} triangles in the window`, `left of the seam a selected cell (exposure ${pair.a.E.toFixed(2)}) on its rings; beside it a coarse one (${pair.b.E.toFixed(2)}); every coarse triangle touching a refined edge is fanned to its points — no T-junction, no open edge (TXB10)`]);
  }
}

/* -------------------------------------------- D: the table */
{
  const lines = [`BUDGET (Node, EXPORT): triangles / MB of binary STL / % of the 2,000,000 cap (PROVISIONAL)`, ''];
  lines.push('state                         COARSE                     FULL                       full share  cells');
  for (const r of DATA.budget || []) lines.push(`${r.key.padEnd(10)} ${fmt(r.coarseTris).padStart(10)} ${String(r.coarseMB).padStart(6)} MB ${String(r.coarsePct).padStart(5)}%   ${fmt(r.fullTris).padStart(10)} ${String(r.fullMB).padStart(6)} MB ${String(r.fullPct).padStart(5)}%   ${r.share === null ? '-' : (100 * r.share).toFixed(1).padStart(5) + '%'}   ${r.selectedCells}/${r.cells}   (${(r.fullMs / 1000).toFixed(0)} s)`);
  lines.push('');
  if (BR && BR.rows) {
    lines.push('ENGINES (Node / Chromium, the page\'s own module): build seconds, Chromium heap at the end, AGREE = count + float32 hash');
    for (const r of BR.rows) lines.push(`${r.key.padEnd(10)} ${r.detail.padEnd(7)} ${fmt(r.node.tris).padStart(10)}  node ${String(r.node.s).padStart(6)} s  chromium ${r.chromium.error ? 'ERROR ' + r.chromium.error.slice(0, 40) : `${String(r.chromium.s).padStart(6)} s  heap ${r.chromium.heapEndGB} GB`}  ${r.agree ? 'AGREE' : 'DIFFER'}`);
    lines.push('');
  }
  if (DATA.print) { lines.push('PRINT (the default, FULL):'); for (const p of DATA.print) lines.push(`H ${p.H} mm: ${fmt(p.tris)} tris, ${p.shells} shells, ${p.open} open edges, ${p.withinPairs} within-shell pairs (worst span ${p.worstSpanMm} mm), gaps closed ${p.gaps ? p.gaps.newlyClosedPrintableGaps : '-'}`); lines.push(''); }
  if (DATA.walls) { lines.push('WALLS between adjacent pores (the shipped field, mid-height):'); for (const w of DATA.walls) lines.push(`${w.label.slice(0, 44).padEnd(45)} thinnest ${w.walls.min} median ${w.walls.median} mm; under 0.7 mm: ${w.under} of ${w.walls.n}`); lines.push(''); }
  if (DATA.roundPlate) { lines.push('ROUNDNESS (round 2\'s plate, H 1.0; drawn mid-wall against its circle; median % off round):'); for (const [dom, M] of Object.entries(DATA.roundPlate)) for (const [m, r] of Object.entries(M)) lines.push(`${dom.padEnd(12)} ${m.padEnd(20)} ${String(r.trisPerMm2).padStart(4)}/mm2  free ${r.free.median}%  merged ${r.merged.median}% (p90 ${r.merged.p90}%, n ${r.merged.n})`); }
  if (LAD) { lines.push(''); lines.push('PREFORM LADDER (only the cap varies; committed nowhere):'); for (const r of LAD) lines.push(r.file ? `${r.design.padEnd(8)} cap ${fmt(r.cap).padStart(9)}: ${r.file}  ${r.capBinds ? '' : '(the design\'s ceiling)'}` : `${r.design} cap ${fmt(r.cap)}: skipped (${r.skipped})`); }
  /* 26 lines a panel: the table runs over as many full-width panels as it needs */
  for (let at = 0, k = 1; at < lines.length; at += 26, k++) {
    const pane = Buffer.alloc(W * 3 * Hc * 3, 30);
    lines.slice(at, at + 26).forEach((l, i) => text(pane, W * 3, Hc, 10, 12 + i * 15, l, [215, 215, 205], 1));
    cells.push({ img: pane, caption: [`THE BUDGET, TIME, HEAP, PRINT, WALL, ROUNDNESS AND LADDER TABLE, part ${k} (docs/data/bloom-texture-bone-v2-*.json)`], wide: 3 });
  }
}

/* ----------------------------------------------------- compose */
const rows = []; let row = [], used = 0;
for (const c of cells) { const w = c.wide || 1; if (used + w > COLS) { rows.push(row); row = []; used = 0; } row.push(c); used += w; }
if (row.length) rows.push(row);
const SW = W * COLS, SH = rows.length * (Hc + CAP) + 40;
const sheet = Buffer.alloc(SW * SH * 3, 18);
text(sheet, SW, SH, 10, 10, 'BONE v2 SHIPPED: COARSE RELEASE, FULL DETAIL WHERE IT SHOWS UNDER THE 2.0 M CAP. EXPORT, NODE BUILDS, SOFT RENDER.', [240, 200, 120], 2);
const wrap = (lines, cols) => { const out = []; for (const l of lines) { if (!l) continue; let cur = ''; for (const w of l.split(' ')) { if (cur && (cur + ' ' + w).length > cols) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; } if (cur) out.push(cur); } return out; };
rows.forEach((r, ri) => { let x = 0; for (const c of r) { const w = (c.wide || 1) * W; blit(sheet, SW, SH, c.img, w, Hc, x, 40 + ri * (Hc + CAP)); const cap = wrap(c.caption, Math.floor((w - 12) / 6)); if (cap.length > 7) throw new Error(`a caption needs ${cap.length} lines: ${cap.join(' / ')}`); cap.forEach((l, k) => text(sheet, SW, SH, x + 6, 40 + ri * (Hc + CAP) + Hc + 4 + k * 12, l, [220, 220, 210], 1)); x += w; } });
fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
writePng(OUT, SW, SH, sheet);
console.log(`wrote ${OUT} (${SW}x${SH})`);
