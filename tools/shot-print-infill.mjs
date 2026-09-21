// Contact sheet for the authored infill.
//
//   node tools/shot-print-infill.mjs <dir>
//
// The brief for this session asked for both families on the bloom AND on a
// leaf, at a couple of densities, plus the "where is dark" decision shown
// rather than asserted. That last one is why the sheet is arranged the way it
// is: the ANCHOR ROW is the argument. It photographs the same bloom with the
// anchor in three places, and the shading follows it — which is the whole
// claim, and the thing a single pretty render cannot demonstrate.
//
// A NOTE ON THE LEAF. The shipped bundle has three meshes — stem, bloom and
// the exporter's pivot marker — and the leaves are part of the STEM solid, not
// separate parts. There is no leaf bundle to load either, because runtime
// bundle loading is a different PR. So "on the leaf" here means what it can
// honestly mean today: the stem part's infill, framed on a leaf, with that
// part's anchor DRAGGED ONTO the leaf so the leaf is what the shading is
// organised around. That is a real demonstration that the stage works on
// whatever solid it is handed and needs no petal-level granularity — and it is
// not a demonstration of per-leaf infill, which waits on multi-part export.
//
// Every caption is read back from the page's own read-out, never from what
// this script asked for.

import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2];
if (!OUT) { console.error('usage: node tools/shot-print-infill.mjs <dir>'); process.exit(2); }
mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png' };
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/print') p = '/print.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !existsSync(f)) { r.writeHead(404); return r.end('nf'); }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  r.end(readFileSync(f));
});
await new Promise(r => server.listen(0, r));

const browser = await chromium.launch({ executablePath: process.env.PRINT_CHROME || '/opt/pw-browsers/chromium' });
// 2x, because the marks this sheet exists to show are one-pixel lines a few
// pixels apart; at 1x a cross-hatch and a scribble are the same grey.
const ctx = await browser.newContext({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 2 });
await ctx.route('https://cdn.jsdelivr.net/npm/three@0.161.0/**', route => {
  const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
  const f = path.join(ROOT, 'node_modules/three', rel);
  if (!existsSync(f)) return route.fulfill({ status: 404, body: 'nf' });
  route.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(f, 'utf8') });
});
await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));

const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
const call = (fn, ...a) => page.evaluate(fn, ...a);
const settle = (ms = 900) => page.waitForTimeout(ms);

await page.goto(`http://127.0.0.1:${server.address().port}/print`);
await page.waitForFunction(() => window.__printScaffold && window.__printScaffold.ready, { timeout: 40000 });
await settle(1500);

// Shut every panel: this sheet is about the drawing, and the panels cover a
// third of it. That they CAN be shut, one at a time, is item two of the
// session and is photographed on its own cell at the end.
const shutAll = async () => {
  await call(() => ['print-debug', 'print-pose', 'print-stylize', 'print-infill']
    .forEach(id => { const d = document.getElementById(id); if (d) d.open = false; }));
  await page.waitForTimeout(120);
};
const openAll = async () => {
  await call(() => ['print-debug', 'print-pose', 'print-stylize', 'print-infill']
    .forEach(id => { const d = document.getElementById(id); if (d) d.open = true; }));
  await page.waitForTimeout(120);
};

// A quieter outline than the shipped default, so the INFILL is what the eye
// reads. Stated in the manifest, because it is a setting, not the default.
await call(() => { window.__printLineArt.setDetailWidget(16); window.__printLineArt.setWeightWidget(1.3); });
await settle();

const cells = [];

// Crops are READ FROM THE PAGE, never guessed: each part reports the pixel
// bounding box of its own projected silhouette, so a cell frames the thing it
// is about even after the camera has been moved or the stem bent.
const VIEW = { w: 1180, h: 900 };
async function clipFor(partIndex, pad = 24) {
  const f = await call(i => window.__printInfill.frame(i), partIndex);
  if (!f.ok) return null;
  const x = Math.max(0, Math.floor(f.minX - pad));
  const y = Math.max(0, Math.floor(f.minY - pad));
  return {
    x, y,
    width: Math.min(VIEW.w - x, Math.ceil(f.maxX - f.minX + pad * 2)),
    height: Math.min(VIEW.h - y, Math.ceil(f.maxY - f.minY + pad * 2)),
  };
}
// A crop around a point, for framing one leaf rather than the whole stem.
async function clipAround(px, py, w, h) {
  const x = Math.max(0, Math.min(VIEW.w - w, Math.round(px - w / 2)));
  const y = Math.max(0, Math.min(VIEW.h - h, Math.round(py - h / 2)));
  return { x, y, width: w, height: h };
}
const BLOOM = 1, STEM = 0;

async function cell(name, clipSrc, caption, extra = {}) {
  await shutAll();
  await settle(700);
  const file = `${name}.png`;
  const clip = typeof clipSrc === 'function' ? await clipSrc() : clipSrc;
  await page.screenshot(clip ? { path: path.join(OUT, file), clip } : { path: path.join(OUT, file) });
  const st = await call(() => window.__printInfill.stats());
  const opts = await call(() => window.__printInfill.options());
  const mode = await call(() => window.__printInfill.mode());
  cells.push({ file, caption, mode, opts,
    segments: st ? st.segments : 0, seeds: st ? st.seeds : 0,
    frameMs: st ? +st.frameMs.toFixed(2) : 0, ...extra });
  console.log(`  ${file.padEnd(34)} ${mode.padEnd(6)} ${st ? st.segments : 0} segs  ${caption}`);
  await openAll();
}

const set = async (id, v) => { await call(([i, x]) => window.__printInfill.setWidget(i, x), [id, v]); };
const mode = async (m) => { await call(x => window.__printInfill.setMode(x), m); await settle(); };

console.log('\n--- the bloom ---');
await mode('off');
await cell('01-bloom-off', () => clipFor(BLOOM), 'line art alone — no infill, the control for every cell below');

await mode('hatch');
await set('spacing', 11); await set('layers', 2); await set('angle', 35); await settle();
await cell('02-bloom-hatch-coarse', () => clipFor(BLOOM), 'cross-hatch, spacing 11 px, 2 layers');
await set('spacing', 5); await settle();
await cell('03-bloom-hatch-fine', () => clipFor(BLOOM), 'cross-hatch, spacing 5 px — density is the same control at both ends');
await set('layers', 3); await set('spacing', 7); await settle();
await cell('04-bloom-hatch-3layer', () => clipFor(BLOOM), 'three layers: each one needs a darker tone before it joins in');

await mode('flow');
await set('spacing', 9); await set('curvature', 85); await settle();
await cell('05-bloom-flow-concentric', () => clipFor(BLOOM), 'line-flow, concentric about the anchor — fold lines');
await set('curvature', -85); await settle();
await cell('06-bloom-flow-radial', () => clipFor(BLOOM), 'line-flow, radial from the anchor — veins');
await set('curvature', 0); await set('angle', 20); await settle();
await cell('07-bloom-flow-grain', () => clipFor(BLOOM), 'line-flow, curvature 0 — straight grain at the hatch angle');
await set('spacing', 5); await set('curvature', 85); await settle();
await cell('08-bloom-flow-dense', () => clipFor(BLOOM), 'line-flow, spacing 5 px — the same field, more of it');

// ---- WHERE IS DARK: the argument, in one row --------------------------------
console.log('\n--- where is dark: the anchor row ---');
await mode('hatch');
await set('spacing', 6); await set('layers', 3); await set('reach', 80); await settle();
// THE OUTLINE IS TURNED DOWN TO ITS THINNEST FOR THIS ROW, and that is worth
// saying plainly. The bloom is a fused 73k-triangle solid whose projected
// silhouette is over nineteen thousand edges, so at any normal weight the line
// work is a dense scribble and a tonal gradient inside it cannot be read at
// all. That is a property of the linework on this bundle, not of the infill —
// it is the contour curve-fitting work queued as its own session — but this
// row exists to let the shading decision be judged, so the outline gets out of
// its way here. Every other row is at the sheet's normal weight.
await call(() => { window.__printLineArt.setWeightWidget(0.5); window.__printLineArt.setDetailWidget(0); });
await settle();
const home = await call(() => window.__printInfill.anchorLocal(1));
const anchorCell = async (name, delta, caption) => {
  await call(([h, d]) => window.__printInfill.setAnchorLocal(1, [h[0] + d[0], h[1] + d[1], h[2] + d[2]]), [home, delta]);
  await settle();
  const px = (await call(() => window.__printInfill.frame(1)));
  await cell(name, () => clipFor(BLOOM), caption, { anchorPx: [Math.round(px.ax), Math.round(px.ay)] });
};
await anchorCell('09-dark-anchor-centre', [0, 0, 0],
  'anchor at the centroid — the DEFAULT, and the botanical convention: dark where the petals overlap');
await anchorCell('10-dark-anchor-left', [-45, 0, 0],
  'the SAME bloom, anchor dragged left — the dark follows it. Nothing about the geometry changed');
await anchorCell('11-dark-anchor-right', [45, 0, 0],
  'and dragged right. This is the whole "where is dark" decision: authored, not simulated');
await call(h => window.__printInfill.setAnchorLocal(1, h), home); await settle();

await set('falloff', 40); await settle();
await cell('12-dark-falloff-soft', () => clipFor(BLOOM), 'falloff 0.40 — a broad, soft passage');
await set('falloff', 260); await settle();
await cell('13-dark-falloff-hard', () => clipFor(BLOOM), 'falloff 2.60 — a tight dark core, everything else left white');
await set('falloff', 100); await set('jitter', 0); await settle();
await cell('14-dark-jitter-off', () => clipFor(BLOOM), 'jitter 0 — the tonal layers show their true shape: concentric CIRCLES');
await set('jitter', 55); await settle();
await cell('15-dark-jitter-on', () => clipFor(BLOOM), 'jitter 55% — the same circles, broken up so the edge reads as a hand');
await set('jitter', 35); await settle();
// back to the sheet's normal linework for everything below
await call(() => { window.__printLineArt.setWeightWidget(1.3); window.__printLineArt.setDetailWidget(16); });
await settle();

// ---- the leaf ---------------------------------------------------------------
// The leaves belong to the STEM solid. Moving that part's anchor onto a leaf
// is what makes the leaf the thing the shading is organised around, and is a
// live demonstration that the stage needs no per-part granularity to work.
console.log('\n--- the leaf (part of the stem solid; anchor dragged onto it) ---');
const leafAnchor = await call(() => {
  // the vertex furthest from the stem axis on the lower half — a leaf tip
  const names = window.__printInfill.partNames();
  return { names };
});
const stemHome = await call(() => window.__printInfill.anchorLocal(0));
// Put the stem part's anchor down among the leaves, then frame there.
await call(h => window.__printInfill.setAnchorLocal(0, [h[0], h[1] - 55, h[2]]), stemHome);
await set('reach', 120); await settle();

// Frame on the anchor itself: it has just been put on the leaf, so the leaf is
// where it is. Measured, not a hardcoded rectangle — a bent stem moves it.
const LEAFCLIP = async () => {
  const f = await call(() => window.__printInfill.frame(0));
  return clipAround(f.ax, f.ay, 300, 260);
};

await mode('off');
await cell('16-leaf-off', LEAFCLIP, 'the leaf, line art alone — the control');
await mode('hatch');
await set('spacing', 8); await set('layers', 2); await set('angle', 60); await settle();
await cell('17-leaf-hatch-coarse', LEAFCLIP, 'leaf, cross-hatch, spacing 8 px — clipped to a lobed, concave outline');
await set('spacing', 4); await settle();
await cell('18-leaf-hatch-fine', LEAFCLIP, 'leaf, cross-hatch, spacing 4 px');
await mode('flow');
await set('spacing', 6); await set('curvature', -70); await settle();
await cell('19-leaf-flow-veins', LEAFCLIP, 'leaf, line-flow radial from the anchor — the vein reading');
await set('curvature', 80); await settle();
await cell('20-leaf-flow-contour', LEAFCLIP, 'leaf, line-flow concentric — the fold reading');
await call(h => window.__printInfill.setAnchorLocal(0, h), stemHome); await settle();

// ---- the whole picture, and the panels ---------------------------------------
console.log('\n--- the whole plant, and the panel set ---');
await set('reach', 85); await mode('hatch');
await set('spacing', 7); await set('layers', 2); await settle();
await cell('21-whole-hatch', null, 'the whole plant, cross-hatch — stem and bloom each shaded about their own anchor');
await mode('flow'); await set('curvature', 70); await settle();
await cell('22-whole-flow', null, 'the whole plant, line-flow');

// The panels: always present, individually collapsible (session item two).
await mode('hatch'); await settle();
await openAll();
await page.screenshot({ path: path.join(OUT, '23-panels-open.png') });
cells.push({ file: '23-panels-open.png', caption: 'all four panels open — BUNDLE, POSE, STYLIZE, INFILL, always present', mode: 'hatch' });
await call(() => { document.getElementById('print-debug').open = false;
                   document.getElementById('print-pose').open = false; });
await page.waitForTimeout(150);
await page.screenshot({ path: path.join(OUT, '24-panels-collapsed.png') });
cells.push({ file: '24-panels-collapsed.png', caption: 'BUNDLE and POSE collapsed individually — the panels never disappear, they fold', mode: 'hatch' });

const readout = await call(() => window.__printInfill.infillText());
const artText = await call(() => window.__printLineArt.artText());

writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({
  generated: new Date().toISOString(),
  note: 'outline set to detail 16 / weight 1.3 for every cell, so the INFILL is what the eye reads',
  infillReadout: readout, lineArtReadout: artText,
  pageErrors: errs, cells,
}, null, 2));

// A single-page index, so the sheet is reviewable as one thing.
const html = `<!doctype html><meta charset="utf-8"><title>print infill — contact sheet</title>
<style>body{margin:0;background:#0c0e0e;color:#d8dedd;font:13px/1.6 ui-monospace,monospace;padding:2rem}
h1{color:#6fb7ae;font-size:1rem;letter-spacing:.08em}h2{color:#e0a03a;font-size:.85rem;margin:2.5rem 0 .5rem;letter-spacing:.06em}
figure{margin:0 0 1.6rem}img{max-width:100%;border:1px solid #2b3333;display:block;background:#f2f0ea}
figcaption{color:#96a2a1;padding:.5rem 0}b{color:#c8d2d1}
pre{white-space:pre-wrap;color:#96a2a1;border:1px solid #222a2a;padding:.8rem}</style>
<h1>/print — authored infill</h1>
<p>Cross-hatch and line-flow, generated inside each solid's 2D silhouette. No creases, no normals, no light.</p>
${['the bloom', 'where is dark', 'the leaf', 'the whole plant and the panels'].map((sec, si) => {
  const range = [[0, 8], [8, 15], [15, 20], [20, 26]][si];
  return `<h2>${sec}</h2>` + cells.slice(range[0], range[1]).map(c =>
    `<figure><img src="${c.file}"><figcaption><b>${c.file}</b> — ${c.caption}`
    + (c.segments ? `<br>${c.segments} segments from ${c.seeds} ${c.mode === 'hatch' ? 'hatch lines' : 'seeds'}, ${c.frameMs} ms` : '')
    + (c.anchorPx ? `<br>anchor at ${c.anchorPx.join(', ')} px` : '')
    + `</figcaption></figure>`).join('\n');
}).join('\n')}
<h2>the read-out, as the page prints it</h2><pre>${readout.replace(/[<>&]/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[ch]))}</pre>`;
writeFileSync(path.join(OUT, 'index.html'), html);

console.log(`\n${cells.length} cells -> ${OUT}`);
console.log('page errors:', errs.length ? errs : 'none');
await browser.close();
server.close();
