// Contact sheet for /plot's BACKGROUND SHAPES and the KNOCKOUT they make.
//
//   node tools/shot-plot-shapes.mjs <dir>
//
// WHAT IS ON IT, which is what the brief asked to review: a bloom crossing a
// panel's edge in BOTH polarities (the rule — "a panel is the opposite tone to
// the ground, and the drawing reverses inside it" — holds in either, and the
// pair is the argument); a close crop of that edge, where a single stroke
// changes ink and nothing else; each FILL in both polarities; two shapes
// overlapping, both ways round; and the composition SAVED, the page RELOADED
// (which throws every shape away) and RESTORED, with the measured per-field
// difference in the caption. The PNG and SVG of the overlapping composition
// are written beside the sheet, because the knockout has to survive into the
// artefacts too.
//
// NO PIXEL DELTA IS QUOTED ANYWHERE — the renderer is not deterministic between
// page sessions, so a pixel figure is a measurement only with its own same-tree
// control and none of these cells needs one. Every cell settles on the real
// signal: screenshot until two consecutive frames are byte-identical. The
// measured claims live in the gate (`tools/verify-plot.mjs`, the
// `knockout/*` and `shapes/*` checks), which reads the framebuffer itself.
//
// Dev-only deps, not in package.json: npm i --no-save playwright-core three@0.161.0

import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2];
if (!OUT) { console.error('usage: node tools/shot-plot-shapes.mjs <dir>'); process.exit(2); }
mkdirSync(OUT, { recursive: true });

const HOME = [0.62, 0.46, 1];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/plot') p = '/plot.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !existsSync(f)) { r.writeHead(404); return r.end('nf'); }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  r.end(readFileSync(f));
});
await new Promise(r => server.listen(0, r));
const PORT = server.address().port;

const browser = await chromium.launch({ executablePath: process.env.PLOT_CHROME || '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 900, height: 1100 },
                                       deviceScaleFactor: 2, acceptDownloads: true });
await ctx.route('https://cdn.jsdelivr.net/npm/three@0.161.0/**', route => {
  const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
  const f = path.join(ROOT, 'node_modules/three', rel);
  if (!existsSync(f)) return route.fulfill({ status: 404, body: 'nf' });
  route.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(f, 'utf8') });
});
await ctx.route('https://fonts.googleapis.com/**', r =>
  r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

const q = fn => page.evaluate(fn);
const set = o => page.evaluate(o => {
  for (const [k, v] of Object.entries(o)) {
    const el = document.getElementById(k);
    if (el.type === 'checkbox') el.checked = !!v; else el.value = String(v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}, o);
const view = (dir, margin = 1.06) =>
  page.evaluate(([d, m]) => window.__plot.setView(d, m), [dir, margin]);
const chrome = show => page.addStyleTag({
  content: `#plot-left,#plot-side{display:${show ? 'flex' : 'none'} !important}` });
const SHC = { kind: 'shapeKind', tone: 'shapeTone', fill: 'shapeFill', x: 'shapeX', y: 'shapeY',
  w: 'shapeW', h: 'shapeH', rotationDeg: 'shapeRot', angleDeg: 'shapeAngle',
  spacing: 'shapeSpacing', weight: 'shapeWeight' };
const clearShapes = () => page.evaluate(() => {
  let n = 0;
  while (window.__plot.shapes().list.length && n++ < 20) {
    const pk = document.getElementById('shapePick');
    pk.value = '0'; pk.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('shapeRemove').click();
  }
});
const addShape = async (o = {}) => {
  await page.evaluate(() => document.getElementById('shapeAdd').click());
  const w = {};
  for (const [k, v] of Object.entries(o)) w[SHC[k]] = v;
  await set(w);
};
// The picked shape's outline is chrome; the cells are pictures, so nothing is picked.
const unpick = () => set({ shapePick: -1 });

async function boot() {
  await page.goto(`http://127.0.0.1:${PORT}/plot`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__plot, null, { timeout: 30000 });
  await page.evaluate(() => window.__plot.ready);
}
await boot();
await chrome(false);

async function settled(clip) {
  await q(() => window.__plot.settle());
  let prev = null;
  for (let i = 0; i < 40; i++) {
    const b = await page.screenshot(clip ? { clip } : {});
    if (prev && Buffer.compare(prev, b) === 0) return { bytes: b, frames: i };
    prev = b;
    await page.waitForTimeout(90);
  }
  return { bytes: prev, frames: 40, unsettled: true };
}

const cells = [];
async function cell(file, caption, { clip = null } = {}) {
  const { bytes, unsettled, frames } = await settled(clip);
  writeFileSync(path.join(OUT, file), bytes);
  const st = await q(() => window.__plot.shapes());
  const pol = (await q(() => window.__plot.state())).polarity;
  cells.push({ file, caption, shapes: st.list, stats: st.stats, polarity: pol,
               settleFrames: frames, unsettled: !!unsettled });
  console.log(`  ${file.padEnd(30)} ${pol.padEnd(7)} ${st.list.length} shape(s)`
    + `   settled in ${frames}${unsettled ? ' (NOT SETTLED)' : ''}`);
}

const DEFAULTS = { frame: 'on', frameShape: 'rect', frameRatio: '2:3', frameMargin: 6,
                   families: 'both', uDensity: 12, vDensity: 12, weight: 1.1,
                   polarity: 'screen', brightness: 30, depthDim: 55, stem: 'on', stemBundle: 0.35,
                   stemJoin: 12, stemLength: 170, stemDroop: 0, stemNeck: 45,
                   stemHandles: false, petalHandles: false };
const reset = async (o = {}) => {
  await clearShapes();
  await set({ ...DEFAULTS, ...o });
  await view(HOME);
};
const levelFor = p => (p === 'print' ? 16 : 30);

/* THE PANEL'S EDGE RUNS THROUGH THE MIDDLE OF THE HEAD, measured off the
   drawing's own projection against the frame's own box — so the bloom crosses
   it whatever the viewport. In the frame's percent, on the controls' 0.5 step. */
await reset();
const box = await q(() => window.__plot.shapeSpace());
const head = (await q(() => window.__plot.screenBoxes())).grid;
const edgePct = Math.round(((head.y0 + head.y1) / 2 - box.y) / box.height * 200) / 2;
const PANEL = { y: (edgePct + 100) / 2, h: 100 - edgePct + 0.5, x: 50, w: 102 };

// --- 1. a bloom across a panel's edge, both polarities -----------------------
for (const p of ['screen', 'print']) {
  await reset({ polarity: p, brightness: levelFor(p) });
  await addShape(PANEL); await unpick();
  await cell(`01-edge-${p}.png`, `a solid OPPOSITE panel whose top edge runs through the middle of the head — `
    + `${p === 'screen' ? 'white on black, so the panel is WHITE and the drawing inside it black'
                        : 'black on white, so the panel is BLACK and the drawing inside it white'}. `
    + 'The stem is drawn too, and reverses with the head.');
}
// The edge, close: one stroke, two inks, one path.
const edgeY = box.y + edgePct / 100 * box.height;
for (const p of ['screen', 'print']) {
  await reset({ polarity: p, brightness: levelFor(p) });
  await addShape(PANEL); await unpick();
  await cell(`02-edge-close-${p}.png`, 'the same edge, close: every stroke that crosses it changes ink AT the edge '
    + 'and nowhere else — the drawing is in front of the panel, never behind it',
    { clip: { x: box.x + box.width * 0.18, y: edgeY - 70, width: box.width * 0.64, height: 140 } });
}

// --- 2. each fill, both polarities ---------------------------------------------
const FILLS = [
  ['stripes', { spacing: 3, weight: 50, angleDeg: 20 }, 'bands at 20°, half of each 3% period'],
  ['halftone', { spacing: 2.2, weight: 120, angleDeg: 90 }, 'dots densest at the bottom (the ramp points to 90°)'],
  ['outline', { spacing: 4, weight: 30 }, 'a ring inside the boundary, 30% of a 4% spacing wide'],
];
for (const [fill, o, words] of FILLS) {
  for (const p of ['screen', 'print']) {
    await reset({ polarity: p, brightness: levelFor(p) });
    await addShape({ ...PANEL, w: 90, fill, ...o }); await unpick();
    await cell(`03-${fill}-${p}.png`, `<b>${fill}</b> — ${words}. The drawing reverses wherever a mark is `
      + 'painted, and only there: a stroke crossing the pattern changes ink at every mark.');
  }
}

// --- 3. two shapes overlapping ---------------------------------------------------
const overlap = async (p, lower) => {
  await reset({ polarity: p, brightness: levelFor(p) });
  await addShape(PANEL);
  await addShape({ kind: 'ellipse', tone: 'ground', x: 50, y: edgePct + 12, w: 60, h: 18 });
  // A GROUND halftone across the stem, low on the panel: every dot paints the
  // ground's tone, so the stem reverses back at each one.
  await addShape({ kind: 'ellipse', tone: 'ground', fill: 'halftone', x: 58, y: 76, w: 50, h: 26,
                   spacing: 2.4, weight: 115, angleDeg: 0 });
  if (lower) {
    await set({ shapePick: 1 });
    await page.evaluate(() => document.getElementById('shapeLower').click());
  }
  await unpick();
};
await overlap('screen', false);
await cell('04-overlap-hole-screen.png', 'three shapes: the panel; a GROUND ellipse on top of it, which cuts a hole '
  + '— the drawing reverses back inside it; and a GROUND halftone across the stem, whose every dot reverses '
  + 'the stem back where it crosses');
await overlap('print', false);
await cell('04-overlap-hole-print.png', 'the same three in print');
await overlap('screen', true);
await cell('05-overlap-lowered-screen.png', 'the ground ellipse LOWERED beneath the panel — list order is the '
  + 'z-order, so the panel now covers it and the hole is gone');

// The artefacts of the overlapping composition, both polarities.
for (const p of ['screen', 'print']) {
  await overlap(p, false);
  const svg = await q(() => window.__plot.exportSvg());
  writeFileSync(path.join(OUT, `overlap-${p}.svg`), svg.text);
  const png = await q(() => window.__plot.exportRaster({ scale: 2, withData: true }));
  writeFileSync(path.join(OUT, `overlap-${p}.png`), Buffer.from(png.dataUrl.split(',')[1], 'base64'));
  console.log(`  overlap-${p}: SVG ${svg.paths} paths x2 under complementary masks, ${svg.shapes} shapes; `
    + `PNG ${png.width}x${png.height}, ${png.stats.notGrey} non-grey pixels`);
}

// --- 4. saved, reloaded, restored ------------------------------------------------
await overlap('screen', false);
await set({ shapePick: 2 });
const savedText = await q(() => window.__plot.compositionText());
const savedShapes = (await q(() => window.__plot.shapes()));
writeFileSync(path.join(OUT, 'composition.json'), savedText);
await unpick();
await cell('06-before-save.png', 'the composition as saved (shape 3 picked in the file; nothing picked for the picture)');
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => window.__plot, null, { timeout: 30000 });
await page.evaluate(() => window.__plot.ready);
await chrome(false);
await set({ ...DEFAULTS });
await view(HOME);
await cell('07-after-reload.png', 'the page RELOADED — every shape is gone with it, so the restore has nothing '
  + 'to lean on but the file');
await page.evaluate(t => window.__plot.loadComposition(t, 'composition.json'), savedText);
const restored = await q(() => window.__plot.shapes());
const restState = await q(() => window.__plot.compositionState());
const diff = [];
const FIELDS = Object.keys(SHC);
savedShapes.list.forEach((sh, k) => {
  for (const f of FIELDS) if (!restored.list[k] || restored.list[k][f] !== sh[f]) diff.push(`shapes[${k}].${f}`);
});
if (restored.list.length !== savedShapes.list.length) diff.push('count');
if (restored.selected !== savedShapes.selected) diff.push('selection.shape');
const restoredPick = restored.selected;
await unpick();
await cell('08-restored.png', `RESTORED from the file: ${restored.list.length} shapes, ${diff.length} field`
  + `${diff.length === 1 ? '' : 's'} differ, shape ${restoredPick + 1} picked as saved, `
  + `${restState ? restState.notes.length : '—'} notes`);
const shapeReadOut = await q(() => window.__plot.shapeText());

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const SECTIONS = [
  ['a bloom across a panel edge', 0, 4],
  ['each fill, both polarities', 4, 10],
  ['two shapes overlapping', 10, 13],
  ['saved, reloaded, restored', 13, 16],
];
const html = `<!doctype html><meta charset="utf-8"><title>/plot shapes and knockout</title>
<style>body{background:#0a0e0e;color:#c8d2d1;font:14px/1.5 ui-monospace,monospace;max-width:1000px;margin:2rem auto;padding:0 1rem}
figure{margin:0 0 1.6rem}img{max-width:100%;border:1px solid #2b3333;display:block;background:#000}
figcaption{color:#96a2a1;padding:.5rem 0}b{color:#c8d2d1}
p.note{color:#96a2a1;border-left:2px solid #e0a03a;padding-left:.8rem}
pre{white-space:pre-wrap;color:#96a2a1;border:1px solid #222a2a;padding:.8rem}</style>
<h1>/plot — background shapes, and the knockout</h1>
<p><b>A panel is the opposite tone to the ground, and the drawing reverses inside it.</b> That holds in either
polarity: on screen the ground is black and a panel is white with the drawing black in it; in print the
ground is white and a panel black with the drawing white in it. Inside a panel the drawing is the OTHER
polarity exactly — its blend, its ink transfer at the same level, its fog. Knockout is not polarity, and the two
stack.</p>
<p class="note">THE DRAWING IS ALWAYS IN FRONT. Shapes are their own pass, in the picture plane, drawn before the
ink; the ink is drawn twice, each pass clipped by the stencil to its own tone — an inverse clip, never
draw-and-cover — so a shape changes which ink a line is drawn in and never whether it is drawn.</p>
<p class="note">NO PIXEL DELTA IS QUOTED ANYWHERE. The measured claims are the gate's (<b>tools/verify-plot.mjs</b>,
<b>knockout/*</b> and <b>shapes/*</b>), read off the framebuffer itself. The round trip in section 4:
<b>${diff.length} field${diff.length === 1 ? '' : 's'} differ</b>${diff.length ? ` (${esc(diff.join(', '))})` : ''}.
The saved file is <a href="composition.json" style="color:#6fb7ae">composition.json</a>; the overlapping
composition's artefacts are <a href="overlap-screen.svg" style="color:#6fb7ae">overlap-screen.svg</a>,
<a href="overlap-print.svg" style="color:#6fb7ae">overlap-print.svg</a>,
<a href="overlap-screen.png" style="color:#6fb7ae">overlap-screen.png</a> and
<a href="overlap-print.png" style="color:#6fb7ae">overlap-print.png</a>.</p>
${SECTIONS.map(([title, a, b]) => `<h2>${title}</h2>` + cells.slice(a, b).map(c =>
  `<figure><img src="${c.file}"><figcaption><b>${c.file}</b> · ${c.polarity} — ${c.caption}`
  + `<br>${c.shapes.length ? c.shapes.map((s, k) => `${k + 1}: ${s.tone} ${s.kind} ${s.fill} `
      + `(${(c.stats[k] || {}).marks ?? '—'} marks)`).join(' · ') : 'no shapes'}`
  + (c.unsettled ? '<br><b style="color:#e07a6a">DID NOT SETTLE</b>' : '')
  + '</figcaption></figure>').join('\n')).join('\n')}
<h2>the SHAPES read-out, as the page prints it</h2>
<pre>${esc(shapeReadOut)}</pre>
<p class="note">page errors: ${errs.length ? esc(errs.join(' | ')) : 'none'}</p>`;
writeFileSync(path.join(OUT, 'index.html'), html);

console.log(`\n${cells.length} cells -> ${path.join(OUT, 'index.html')}`);
console.log(`round trip: ${diff.length} fields differ${diff.length ? ': ' + diff.join(', ') : ''}`);
console.log('page errors:', errs.length ? errs : 'none');
await browser.close();
server.close();
