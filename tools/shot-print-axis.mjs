// Contact sheet for the SHAPE-DERIVED DIRECTION.
//
//   node tools/shot-print-axis.mjs <dir>
//
// The claim being reviewed is that strokes DESCRIBE the form instead of sitting
// on top of it, and that is a judgement about a picture — so the sheet is the
// review gate and the numbers in the captions are read back off the page's own
// stats, never off what this script asked for.
//
// What it photographs, in the order the argument runs:
//
//   * THE LEAF with shape-derived strokes, at two densities, beside the SAME
//     leaf in global-angle mode. One of them alone is a picture; the pair is
//     the argument, because it is the only way to see that the direction came
//     from the shape and not from a slider that happened to be near it.
//   * THE DERIVED AXIS ITSELF, with the base and tip marked, so the thing the
//     strokes are following can be pointed at rather than inferred.
//   * THE SHEAR, on and off, on the same leaf — a straight axis is a CHORD of a
//     curved part, and this is the cell where the difference at the ends is
//     visible or is not.
//   * THE AXIAL RAMP, base to tip, as a sweep — the reference's "heavier at the
//     attachment, thinning to the tip", as an adjustable amount.
//   * THE BLOOM, UNRETOUCHED. It is one fused solid: whatever axis is derived
//     is ONE axis for the entire flower, and its "centre line" is a fiction
//     over a radial blob. Photographed, not tuned around. Per-petal direction
//     is blocked on multi-part export.
//
// The reference drawings are not in this repo; hold them beside the sheet.

import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2];
if (!OUT) { console.error('usage: node tools/shot-print-axis.mjs <dir>'); process.exit(2); }
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
const VIEW = { w: 1180, h: 900 };
const ctx = await browser.newContext({ viewport: { width: VIEW.w, height: VIEW.h }, deviceScaleFactor: 2 });
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
await page.waitForFunction(() => window.__printScaffold && window.__printScaffold.ready, { timeout: 60000 });
await settle(1200);

console.log('loading bloom-stem-leaf-bundle.glb …');
await page.setInputFiles('#bundleFile', {
  name: 'bloom-stem-leaf-bundle.glb', mimeType: 'model/gltf-binary',
  buffer: readFileSync(path.join(ROOT, 'assets/print-test/bloom-stem-leaf-bundle.glb')),
});
await page.waitForFunction(
  () => window.__printScaffold && window.__printScaffold.source === 'bloom-stem-leaf-bundle.glb',
  { timeout: 180000 });
await page.waitForFunction(() => !!window.__printInfill, { timeout: 180000 });
await settle(3000);

const NAMES = await call(() => window.__printInfill.partNames());
const LEAF = NAMES.indexOf('leaf'), STEM = NAMES.indexOf('stem'), BLOOM = NAMES.indexOf('bloom');
console.log(`parts: ${NAMES.join(', ')}`);

// The panel columns are position:fixed OVER the canvas, so hiding them by
// VISIBILITY (never by display, which would re-lay-out the page and reproject
// everything) takes the chrome out of a cell without moving the picture.
const shutAll = async () => {
  await call(() => {
    ['print-debug', 'print-pose', 'print-stylize', 'print-infill']
      .forEach(id => { const d = document.getElementById(id); if (d) d.open = false; });
    ['print-left', 'print-side'].forEach(id => {
      const e = document.getElementById(id); if (e) e.style.visibility = 'hidden';
    });
  });
  await page.waitForTimeout(120);
};
const openAll = async () => {
  await call(() => {
    ['print-debug', 'print-pose', 'print-stylize', 'print-infill']
      .forEach(id => { const d = document.getElementById(id); if (d) d.open = true; });
    ['print-left', 'print-side'].forEach(id => {
      const e = document.getElementById(id); if (e) e.style.visibility = '';
    });
  });
  await page.waitForTimeout(120);
};

await call(() => { window.__printLineArt.setDetailWidget(14); window.__printLineArt.setWeightWidget(1.2); });
await call(() => { const b = document.getElementById('showAnchors'); b.checked = false;
                   b.dispatchEvent(new Event('change')); });

// THE AXIS OVERLAY. Drawn from the page's OWN reported axis — base, tip and the
// line between them — so the sheet cannot draw a different axis from the one
// the strokes were run along. Removed again before any other cell is shot.
async function axisOverlay(partIndex, on) {
  await call(([i, show]) => {
    const id = 'axisOverlay';
    document.getElementById(id)?.remove();
    if (!show) return;
    const a = window.__printInfill.axis(i);
    if (!a) return;
    const c = document.querySelector('canvas').getBoundingClientRect();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = id;
    Object.assign(svg.style, { position: 'fixed', left: `${c.left}px`, top: `${c.top}px`,
      width: `${c.width}px`, height: `${c.height}px`, pointerEvents: 'none', zIndex: 40 });
    svg.setAttribute('viewBox', `0 0 ${c.width} ${c.height}`);
    svg.innerHTML =
      `<line x1="${a.base[0]}" y1="${a.base[1]}" x2="${a.tip[0]}" y2="${a.tip[1]}"
             stroke="#e0a03a" stroke-width="2" stroke-dasharray="7 5"/>
       <circle cx="${a.base[0]}" cy="${a.base[1]}" r="7" fill="none" stroke="#e0a03a" stroke-width="2.5"/>
       <circle cx="${a.base[0]}" cy="${a.base[1]}" r="2.5" fill="#e0a03a"/>
       <circle cx="${a.tip[0]}" cy="${a.tip[1]}" r="4" fill="none" stroke="#6fb7ae" stroke-width="2.5"/>`;
    document.body.append(svg);
  }, [partIndex, on]);
  await page.waitForTimeout(80);
}

// The leaf is a flat-ish solid ~21 x 15 x 10 units; looked at from the side it
// is a sliver and no direction is legible on it. This looks down its THINNEST
// bbox dimension, which is what puts the blade in the picture plane.
const LEAF_VIEW = [0, 0, 1.7];

// The crop is measured ONCE, from the leaf's own projected silhouette while
// the stage is drawing, and reused for every leaf cell — including the
// lines-only control, where the infill is off and there is no frame to measure.
let LEAF_CLIP = null;

const cells = [];
async function clipFor(partIndex, pad = 26) {
  const f = await call(i => window.__printInfill.frame(i), partIndex);
  if (!f.ok) return null;
  const x = Math.max(0, Math.floor(f.minX - pad));
  const y = Math.max(0, Math.floor(f.minY - pad));
  return { x, y,
    width: Math.max(32, Math.min(VIEW.w - x, Math.ceil(f.maxX - f.minX + pad * 2))),
    height: Math.max(32, Math.min(VIEW.h - y, Math.ceil(f.maxY - f.minY + pad * 2))) };
}

async function cell(name, clipSrc, caption, extra = {}) {
  await shutAll();
  await settle(700);
  const clip = typeof clipSrc === 'function' ? await clipSrc() : clipSrc;
  const file = `${name}.png`;
  await page.screenshot(clip ? { path: path.join(OUT, file), clip } : { path: path.join(OUT, file) });
  const st = await call(() => window.__printInfill.stats());
  const opts = await call(() => window.__printInfill.options());
  const mode = await call(() => window.__printInfill.mode());
  const ax = extra.part !== undefined ? await call(i => window.__printInfill.axis(i), extra.part) : null;
  cells.push({ file, caption, mode,
    direction: opts.direction, angleDeg: opts.angleDeg, axialBias: opts.axialBias,
    spacing: opts.spacing, gradient: opts.gradient,
    axis: ax ? { angleDeg: +ax.angleDeg.toFixed(1), lengthPx: Math.round(ax.lengthPx),
      basis: ax.basis, bendPx: +ax.warpDeviationPx.toFixed(1), pieces: ax.warpPieces } : null,
    segments: st ? st.segments : 0, frameMs: st ? +st.frameMs.toFixed(1) : 0, ...extra });
  console.log(`  ${file.padEnd(34)} ${mode.padEnd(5)} ${String(opts.direction).padEnd(6)} `
    + `${st ? st.segments : 0} segs  ${st ? st.frameMs.toFixed(0) : '?'} ms  ${caption.slice(0, 60)}`);
  await openAll();
}

const set = async (id, v) => { await call(([i, x]) => window.__printInfill.setWidget(i, x), [id, v]); };
const dir = async (v) => { await call(x => window.__printInfill.setDirection(x), v); await settle(); };
const dark = async (i, v) => { await call(([k, x]) => window.__printInfill.setDarknessWidget(k, x), [i, v]); };
const mode = async (m) => { await call(x => window.__printInfill.setMode(x), m); await settle(); };
const view = async (name, mul) => {
  const box = await call(n => window.__printScaffold.partBox(n), name);
  if (!box) return;
  const c = box.min.map((v, i) => (v + box.max[i]) / 2);
  const r = Math.max(...box.max.map((v, i) => v - box.min[i]));
  await call(([p, t]) => window.__printScaffold.setView(p, t),
    [[c[0] + r * mul[0], c[1] + r * mul[1], c[2] + r * mul[2]], c]);
  await settle();
};

// ===========================================================================
// THE LEAF — the review target.
console.log('\n--- the leaf: derived direction against a global angle ---');
await view('leaf', LEAF_VIEW);
await mode('hatch');
await set('layers', 1); await set('spacing', 7); await set('angle', 35);
await dir('global'); await settle();
LEAF_CLIP = await clipFor(LEAF);
await mode('off');
await cell('01-leaf-lines-only', () => LEAF_CLIP,
  'the leaf, line art alone — the control for every cell below', { part: LEAF });
await mode('hatch'); await settle();
await cell('02-leaf-global-35', () => LEAF_CLIP,
  'GLOBAL ANGLE, 35° — the shipped default, and the thing that is wrong: one angle for the whole '
  + 'model, so the strokes cut across the leaf instead of running down it', { part: LEAF });
await set('angle', 90); await settle();
await cell('03-leaf-global-90', () => LEAF_CLIP,
  'the same leaf at a global 90°. Still one angle; the strokes are only differently wrong', { part: LEAF });

await dir('axis'); await settle();
await cell('04-leaf-axis', () => LEAF_CLIP,
  'SHAPE AXIS. The direction is derived from the leaf\'s own filled region, and the global angle '
  + 'above is still sitting at 90° — nothing about the picture obeys it any more', { part: LEAF });

await axisOverlay(LEAF, true);
await cell('05-leaf-axis-shown', () => LEAF_CLIP,
  'the derived axis drawn over the same frame, from the page\'s OWN reported numbers: '
  + 'the ringed dot is the BASE (the end nearest where the leaf joins the stem), the small circle the tip',
  { part: LEAF });
await axisOverlay(LEAF, false);

await set('spacing', 4); await settle();
await cell('06-leaf-axis-dense', () => LEAF_CLIP,
  'the same, denser — 4 px spacing. The second density the review asked for', { part: LEAF });
await set('spacing', 11); await settle();
await cell('07-leaf-axis-open', () => LEAF_CLIP,
  'and open, at 11 px', { part: LEAF });
await set('spacing', 7); await settle();

await set('layers', 2); await settle();
await cell('08-leaf-axis-two-layers', () => LEAF_CLIP,
  'two cross-hatch layers. The second family is an offset from the DERIVED axis, not from a global '
  + 'angle, so the cross-hatch turns with the leaf as one', { part: LEAF });
await set('layers', 1); await settle();

// ===========================================================================
// THE AXIAL RAMP
console.log('\n--- the axial ramp ---');
await mode('tone');
await set('veinWidth', 0); await set('gradient', 0); await set('fillWeight', 1.4);
await dark(LEAF, 100); await dark(STEM, 100); await dark(BLOOM, 100);
for (const b of [0, 40, 70, 95]) {
  await set('axial', b); await settle();
  await cell(`09-ramp-${String(b).padStart(2, '0')}`, () => LEAF_CLIP,
    b === 0
      ? 'AXIAL RAMP 0% — inert, and span for span the fill that shipped in #160. The default'
      : `axial ramp ${b}% — coverage falls from the base toward the tip. The ramp is the SECOND `
        + 'component of the coverage the anchor already supplies, min\'d with it, so it is still '
        + 'a closed-form interval clip and costs nothing',
    { part: LEAF });
}
await set('axial', 0); await settle();

// ===========================================================================
// THE SHEAR — the straight axis is a CHORD
console.log('\n--- the shear ---');
await mode('hatch'); await set('layers', 1); await set('spacing', 6);
await dir('global'); await set('angle', 0); await settle();
await cell('10-shear-off-global', () => LEAF_CLIP,
  'for the shear comparison: the leaf hatched at a global angle chosen to lie along it. Straight '
  + 'strokes, and where the leaf bends they drift off the margin — the failure the shear exists for',
  { part: LEAF });
await dir('axis'); await settle();
await cell('11-shear-on', () => LEAF_CLIP,
  'the same leaf in axis mode. The frame is SHEARED by the shape\'s own centre line, so a stroke at '
  + 'constant cross-offset follows the bend rather than cutting the chord. The caption\'s "bend" is '
  + 'how far the centre line departs from the straight axis, measured this frame', { part: LEAF });

// ===========================================================================
// THE STEM — the honest reading of "base"
console.log('\n--- the stem ---');
await view('stem', [0.1, -1.4, 0.4]);
await settle();
await axisOverlay(STEM, true);
await cell('12-stem-axis', null,
  'THE STEM, and the one place the derived base is not the botanical one. "Base" here means WHERE '
  + 'THIS PART MEETS THE REST OF THE PLANT, read off the geometry as the nearest point to another '
  + 'part — which on the stem is the bloom junction at the top, not the cut end at the bottom. '
  + 'Said rather than tuned: the axial ramp on a stem therefore runs down from the flower',
  { part: STEM });
await axisOverlay(STEM, false);

// ===========================================================================
// THE BLOOM — the limit
console.log('\n--- the fused bloom ---');
await view('bloom', [0, -1.6, 0.35]);
await mode('hatch'); await dir('global'); await set('angle', 35); await set('spacing', 9);
await settle();
await cell('13-bloom-global', () => clipFor(BLOOM),
  'the bloom in global-angle mode — which for a shape with no long axis is the CORRECT mode, and is '
  + 'why it was not removed', { part: BLOOM });
await dir('axis'); await settle();
await axisOverlay(BLOOM, true);
await cell('14-bloom-axis', () => clipFor(BLOOM),
  'THE BLOOM IN AXIS MODE, UNRETOUCHED, AND THIS IS THE LIMIT. It is ONE FUSED SOLID: there are no '
  + 'interior petal boundaries in the data, so the derived axis is a single axis for the entire '
  + 'flower and its "centre line" is a fiction over a radial blob. The result is one uniformly '
  + 'directed hatch, with the shear dragging it about. Per-petal direction is blocked on multi-part '
  + 'export — not a bug in this stage and not something to tune around', { part: BLOOM });
await axisOverlay(BLOOM, false);

// ===========================================================================
console.log('\n--- the panel ---');
await view('leaf', LEAF_VIEW);
await dir('axis'); await mode('hatch'); await settle();
await openAll();
await page.screenshot({ path: path.join(OUT, '15-panel.png') });
cells.push({ file: '15-panel.png', mode: 'hatch', direction: 'axis',
  caption: 'the INFILL panel with the direction choice: "global angle" / "shape axis". The angle '
    + 'slider hides in axis mode (no stroke obeys it) and the axial ramp hides in global (there is '
    + 'no axis to ramp along)' });

const readout = await call(() => window.__printInfill.infillText());

writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({
  generated: new Date().toISOString(),
  bundle: 'assets/print-test/bloom-stem-leaf-bundle.glb',
  parts: NAMES,
  note: 'outline set to detail 14 / weight 1.2 for every cell, so the STROKES are what the eye reads',
  reference: 'the reference drawings are not in this repo — hold them beside the sheet',
  infillReadout: readout, pageErrors: errs, cells,
}, null, 2));

const esc = (t) => String(t).replace(/[<>&]/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[ch]));
const SECTIONS = [
  ['the leaf — a global angle against the shape\'s own axis', 0, 8],
  ['the axial ramp — heavier at the base, thinning to the tip', 8, 12],
  ['the shear — a straight axis is a chord of a curved part', 12, 14],
  ['the stem — what "base" means here', 14, 15],
  ['the fused bloom — the limit, photographed', 15, 17],
  ['the panel', 17, 18],
];
const html = `<!doctype html><meta charset="utf-8"><title>print shape-derived direction — contact sheet</title>
<style>body{margin:0;background:#0c0e0e;color:#d8dedd;font:13px/1.6 ui-monospace,monospace;padding:2rem;max-width:1100px}
h1{color:#6fb7ae;font-size:1rem;letter-spacing:.08em}h2{color:#e0a03a;font-size:.85rem;margin:2.5rem 0 .5rem;letter-spacing:.06em}
figure{margin:0 0 1.6rem}img{max-width:100%;border:1px solid #2b3333;display:block;background:#f2f0ea}
figcaption{color:#96a2a1;padding:.5rem 0}b{color:#c8d2d1}
p.note{color:#96a2a1;border-left:2px solid #e0a03a;padding-left:.8rem}
pre{white-space:pre-wrap;color:#96a2a1;border:1px solid #222a2a;padding:.8rem}</style>
<h1>/print — shape-derived shading direction</h1>
<p>A direction derived PER PART from that part's own filled region, so strokes run along the form instead of
across it — with the global-angle mode kept, because it is the right answer for a shape with no long axis.
Bundle: <b>bloom-stem-leaf-bundle.glb</b> — parts ${NAMES.map(n => `<b>${esc(n)}</b>`).join(', ')}.</p>
<p class="note">The reference drawings are not in the repo. Hold them beside the sheet: what to look for is
strokes that radiate from where the leaf attaches and curve with it, and density that is heavier at the base
and thins toward the tip.</p>
${SECTIONS.map(([title, a, b]) => `<h2>${title}</h2>` + cells.slice(a, b).map(c =>
  `<figure><img src="${c.file}"><figcaption><b>${c.file}</b> — ${esc(c.caption)}`
  + `<br>direction <b>${esc(c.direction)}</b>`
  + (c.direction === 'global' ? `, angle ${c.angleDeg}°` : '')
  + (c.axialBias ? `, axial ${c.axialBias}%` : '')
  + (c.axis ? `<br>derived axis ${c.axis.angleDeg}°, ${c.axis.lengthPx} px long, base from the `
      + `${esc(c.axis.basis)}; centre line bends ${c.axis.bendPx} px, strokes in ${c.axis.pieces} piece(s)` : '')
  + (c.segments ? `<br>${c.segments} segments, ${c.frameMs} ms` : '')
  + `</figcaption></figure>`).join('\n')).join('\n')}
<h2>the read-out, as the page prints it</h2><pre>${esc(readout)}</pre>`;
writeFileSync(path.join(OUT, 'index.html'), html);

console.log(`\n${cells.length} cells -> ${OUT}`);
console.log('page errors:', errs.length ? errs : 'none');
await browser.close();
server.close();
