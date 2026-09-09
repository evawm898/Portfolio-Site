// Contact sheet for /plot's FRAME and its COMPOSITION file.
//
//   node tools/shot-plot-frame.mjs <dir>
//
// TWO THINGS, AND THEY ARE PHOTOGRAPHED FOR DIFFERENT REASONS. The FRAME is a
// picture and has to be looked at: whether a teal boundary line reads as the
// edge of a composition, or as chrome in the way, is a ruling somebody makes
// with their eyes. The COMPOSITION FILE is not a picture at all — a restore
// that quietly drops a field looks exactly like one that did not — so its cells
// are a real save, a real page RELOAD, and a real restore, with the measured
// per-field difference printed in the caption. A picture of a round trip is
// worth nothing without the number beside it.
//
// THE RELOAD IS A REAL ONE. `page.reload()` throws the page away — the stem
// pose, both petal warps, the frame and the camera all go, which cell 12
// photographs — and the restore then has nothing to lean on but the file.
//
// NO PIXEL DELTA IS QUOTED ANYWHERE, the discipline every sheet here follows:
// the renderer is not deterministic between page sessions, so a pixel figure is
// a measurement only with its own same-tree control and none of these cells
// needs one. Every cell settles on the real signal — screenshot until two
// consecutive frames are byte-identical.
//
// Dev-only deps, not in package.json: npm i --no-save playwright-core three@0.161.0

import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2];
if (!OUT) { console.error('usage: node tools/shot-plot-frame.mjs <dir>'); process.exit(2); }
mkdirSync(OUT, { recursive: true });

const HOME = [0.62, 0.46, 1];
const SIDE = [1, 0.20, 0.06];      // square on to the droop — see the stem sheet

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
/* A TALLISH VIEWPORT. The subject is a 170 mm stem under a 36 mm head, so a
   portrait frame is the interesting case — but not so tall that a 16:9
   boundary has nothing to sit in. */
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
// PICK AND SET ARE TWO SEPARATE WRITES, the petal sheet's own lesson: selecting
// LOADS that petal's values, so one blanket sweep carrying both the picker and
// the scales puts 1.00x straight back over what it just loaded.
const pick = i => page.evaluate(k => {
  const el = document.getElementById('petalPick');
  el.value = String(k); el.dispatchEvent(new Event('input', { bubbles: true }));
}, i);
const view = (dir, margin = 1.06) =>
  page.evaluate(([d, m]) => window.__plot.setView(d, m), [dir, margin]);
const chrome = show => page.addStyleTag({
  content: `#plot-left,#plot-side{display:${show ? 'flex' : 'none'} !important}` });

async function boot() {
  await page.goto(`http://127.0.0.1:${PORT}/plot`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__plot, null, { timeout: 30000 });
  await page.evaluate(() => window.__plot.ready);
}
await boot();
await chrome(false);

async function settled(target) {
  await q(() => window.__plot.settle());
  let prev = null;
  for (let i = 0; i < 40; i++) {
    const b = target ? await target.screenshot() : await page.screenshot();
    if (prev && Buffer.compare(prev, b) === 0) return { bytes: b, frames: i };
    prev = b;
    await page.waitForTimeout(90);
  }
  return { bytes: prev, frames: 40, unsettled: true };
}

const cells = [];
async function cell(file, caption, { target = null, extra = '' } = {}) {
  const { bytes, unsettled, frames } = await settled(target);
  writeFileSync(path.join(OUT, file), bytes);
  const frame = await q(() => window.__plot.frame());
  const box = await q(() => window.__plot.frameBox());
  const drawnBox = await q(() => window.__plot.drawnScreenBox());
  cells.push({ file, caption, extra, frame, box, drawnBox,
    stem: await q(() => window.__plot.stem()),
    stemInfo: await q(() => window.__plot.stemInfo()),
    petals: await q(() => window.__plot.petalWarpStore()),
    settleFrames: frames, unsettled: !!unsettled });
  console.log(`  ${file.padEnd(34)} ${frame.on ? `${frame.shape} ${frame.ratio} @${frame.margin}%`
    .padEnd(22) : 'no frame'.padEnd(22)}`
    + `${box ? `${box.width.toFixed(0)}x${box.height.toFixed(0)} px` : '—'}`
    + `   settled in ${frames}${unsettled ? ' (NOT SETTLED)' : ''}`);
}

const DEFAULTS = { frame: 'on', frameShape: 'rect', frameRatio: '2:3', frameMargin: 6,
                   families: 'both', uDensity: 12, vDensity: 12, weight: 1.1,
                   brightness: 30, depthDim: 55, stem: 'on', stemBundle: 0.35,
                   stemJoin: 12, stemLength: 170, stemDroop: 0, stemNeck: 45,
                   stemHandles: false, petalHandles: false };
const reset = async (o = {}, dir = HOME) => {
  await page.evaluate(() => document.getElementById('bendReset').click());
  await pick(-1);
  await set({ ...DEFAULTS, ...o });
  await view(dir);
};

// =========================================================================
// THE BOUNDARY
await reset();
await cell('01-shipped.png',
  'WHAT SHIPS — a rectangle at 2:3 with a 6% margin, and the drawing fitted to it. The boundary is '
  + 'drawn as a LINE in the panel’s own teal rather than as a dimmed exterior or a letterbox, and '
  + 'that is a choice with a reason: on a black ground under additive white ink, dimming the outside '
  + 'dims only the INK (the ground is already black either way) and a letterbox is indistinguishable '
  + 'from the ground entirely — so wherever the drawing does not reach the edge, which is most of '
  + 'it, neither treatment states where the frame is at all. A line does, everywhere.');
await reset({ frame: 'off' });
await cell('02-no-frame.png',
  'THE SAME CAMERA WITH THE BOUNDARY OFF — the pair. Nothing about the drawing changed: the frame '
  + 'is its own primitive in its own overlay scene, so the drawn segment counts are identical with it '
  + 'on and off, and it composites NORMAL where the drawing is additive. It cannot brighten a crossing.');
await reset({ frameShape: 'ellipse' });
await cell('03-ellipse-2-3.png',
  'AN ELLIPSE AT THE SAME 2:3 — inscribed in the very same box, so switching the shape moves no '
  + 'edge. Two shapes and a separate ratio, not four named types.');
await reset({ frameRatio: '1:1' });
await cell('04-square.png',
  'A SQUARE — which is to say the rectangle at 1:1. There is no "square" type, and that is the '
  + 'point: one axis is the shape and the other is the ratio, so the two can never disagree.');
await reset({ frameShape: 'ellipse', frameRatio: '1:1' });
await cell('05-circle.png',
  'AND A CIRCLE — the ellipse at 1:1, exactly. Its semi-axes are half the box’s own width and '
  + 'height, so 1:1 gives a circle by construction rather than by a fourth option agreeing with a ratio.');
await reset({ frameRatio: '16:9' });
await cell('06-landscape.png',
  'A LANDSCAPE BOUNDARY. At 16:9 on this viewport the box is width-limited, so the margin stops binding '
  + 'on the sides and the composition is the one that is wrong for this subject — which is a thing '
  + 'to be able to see.');
await reset({ frameMargin: 0 });
await cell('07-margin-0.png',
  'MARGIN 0 — the boundary sits on the viewport edge on its limiting axis. The margin insets from '
  + 'the SHORTER side, so one number means the same visual gap on a wide window and a tall one.');
await reset({ frameMargin: 30 });
await cell('08-margin-30.png',
  'MARGIN 30% — the pair. The drawing is fitted to the boundary, so a bigger margin is a smaller '
  + 'picture rather than a cropped one.');

// =========================================================================
// THE BOUNDARY AND THE FIT
await reset({ frame: 'off' });
await set({ frame: 'on', frameShape: 'rect', frameRatio: '2:3', frameMargin: 6 });
await cell('09-control-does-not-refit.png',
  'A FRAME CONTROL NEVER MOVES THE CAMERA. This drawing was fitted with no boundary and the boundary '
  + 'was then switched on: it hangs past the bottom and the top, because this page’s rule is that '
  + 'a control changes what you see and never where you are standing.');
await view(HOME);
await cell('10-reset-fits-the-frame.png',
  'AND RESET FITS THE BOUNDARY — the other half, and what makes the first half survivable. The '
  + 'same drawing after one press of <b>reset view</b>. With no boundary at all the fit is the '
  + 'expression /plot shipped, term for term.');

// =========================================================================
// SAVE, RELOAD, RESTORE
const snapshot = () => q(() => ({
  frame: window.__plot.frame(),
  draw: window.__plot.state(),
  stem: window.__plot.stem(),
  bends: window.__plot.bends().map(b => ({ t: b.t, offset: b.offset })),
  /* SORTED BY INDEX — the store is a `Map` and its ITERATION ORDER is not
     state. This sheet picks petal 7 then petal 2, so the page iterates 7, 2;
     a restore inserts them in the file's own sorted order. Unsorted, the
     round-trip caption read "1 field differs: petals" about nothing at all.
     The gate has its own copy of this helper and learned the same thing —
     the two are separate tools and each owns its own snapshot. */
  petals: window.__plot.petalWarpStore()
    .map(e => ({ index: e.index, along: e.along, across: e.across, bends: e.bends }))
    .sort((a, b) => a.index - b.index),
  selected: window.__plot.petalInfo().selected,
  camera: window.__plot.cameraInfo(),
}));
const diffState = (a, b) => {
  const out = [];
  for (const k of ['on', 'shape', 'ratio', 'margin']) if (a.frame[k] !== b.frame[k]) out.push(`frame.${k}`);
  for (const k of Object.keys(a.draw)) if (a.draw[k] !== b.draw[k]) out.push(`draw.${k}`);
  for (const k of ['on', 'bundle', 'join', 'length', 'droopDeg', 'neck', 'showHandles']) {
    if (a.stem[k] !== b.stem[k]) out.push(`stem.${k}`);
  }
  if (JSON.stringify(a.bends) !== JSON.stringify(b.bends)) out.push('stem.bends');
  if (JSON.stringify(a.petals) !== JSON.stringify(b.petals)) out.push('petals');
  if (a.selected !== b.selected) out.push('selection');
  for (const i of [0, 1, 2]) {
    if (Math.abs(a.camera.position[i] - b.camera.position[i]) > 1e-6) out.push(`camera.position[${i}]`);
    if (Math.abs(a.camera.target[i] - b.camera.target[i]) > 1e-6) out.push(`camera.target[${i}]`);
  }
  return out;
};

// A composition worth restoring: a drooping stem with a real bend on it, two
// petals at two different shapes, and an elliptical boundary.
await reset({ frameShape: 'ellipse', frameRatio: '4:5', frameMargin: 10,
              stemDroop: 42, stemNeck: 80, stemLength: 200, stemBundle: 0.9 }, SIDE);
await pick(7); await set({ petalAlong: 2.2, petalAcross: 0.6 });
await pick(2); await set({ petalAlong: 0.7, petalAcross: 2.3 });
await pick(7);
await set({ stemHandles: true });
const grab = await q(() => window.__plot.handleScreenPos(1));
if (grab) {
  await page.mouse.move(grab.x, grab.y);
  await page.mouse.down();
  await page.mouse.move(grab.x + 90, grab.y - 20, { steps: 8 });
  await page.mouse.up();
}
await set({ stemHandles: false });
const composed = await snapshot();
const savedText = await q(() => window.__plot.compositionText());
await cell('11-composed.png',
  `THE COMPOSITION TO BE SAVED — a 42° droop over an 80 mm neck with a real dragged bend on the `
  + `stem, petal 7 stretched to 2.2x along and petal 2 to 2.3x across, inside a 4:5 ellipse. `
  + `${savedText.length} bytes of JSON describe all of it; the 1.9 MB grid is not in the file, only `
  + `enough identity to notice a mismatch.`);

// A REAL RELOAD. Everything the page held is gone.
await boot();
await chrome(false);
await cell('12-after-a-reload.png',
  'THE SAME PAGE AFTER A REAL RELOAD. The pose, both petal warps, the boundary and the camera are all '
  + 'gone — nothing about /plot persisted before this session, which is what the file is for. The '
  + 'restore below has nothing to lean on except the bytes.');

await page.evaluate(t => window.__plot.loadComposition(t, 'composition.json'), savedText);
const back = await snapshot();
const diff = diffState(composed, back);
const compState = await q(() => window.__plot.compositionState());
await cell('13-restored.png',
  `RESTORED FROM THE FILE, and here is the number the picture is worth nothing without: `
  + `<b>${diff.length} of the fields differ</b> between the composition above and this one — the `
  + `frame, all six draw settings, all six stem parameters, every bend point, both petals’ own `
  + `warps, the selection and the camera${diff.length ? `; the ones that did not come back are `
  + `${diff.join(', ')}` : ''}. The panel reports `
  + `${compState.notes.length} note${compState.notes.length === 1 ? '' : 's'}, which is what a clean `
  + 'read looks like: every departure — a missing field, an unknown one, a clamped value, a '
  + 'dropped warp — is a note, so "nothing to report" is a measurement.');

// =========================================================================
// THE PANELS
await chrome(true);
await cell('14-frame-panel.png',
  'THE FRAME PANEL. Four controls and the box in pixels, and it SAYS that ink outside the boundary is '
  + 'still drawn — this marks the crop, it does not apply it. Clipping, alpha outside an ellipse '
  + 'and a real SVG clip path are the export session’s, and are noted in plot-frame.js so they are '
  + 'not rediscovered.',
  { target: page.locator('#plot-frame') });
await cell('15-composition-panel.png',
  'THE COMPOSITION PANEL after that clean restore.',
  { target: page.locator('#plot-composition') });

// AND THE ONE FAILURE THAT MATTERS MOST.
const foreign = JSON.parse(savedText);
foreign.instances[0].grid.name = 'some-other-bloom.glb';
foreign.instances[0].grid.petals = 40;
foreign.instances[0].grid.segments = 21400;
await page.evaluate(t => window.__plot.loadComposition(t, 'other-bloom.json'),
                    JSON.stringify(foreign));
await cell('16-a-different-grid.png',
  'A COMPOSITION RESTORED AGAINST A DIFFERENT GRID. Warps are applied by petal INDEX, so silently '
  + 'putting them on the wrong petals is the worst thing this format could do — and it is '
  + 'indistinguishable from the right answer in the picture. So the mismatch is the loudest line in '
  + 'the panel and it names what differs, field by field, rather than saying that something did.',
  { target: page.locator('#plot-composition') });

const frameReadOut = await q(() => window.__plot.frameInfoText());
const compReadOut = await q(() => window.__plot.compositionReadOut());
writeFileSync(path.join(OUT, 'composition.json'), savedText);

const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const SECTIONS = [
  ['the boundary', 0, 8],
  ['the boundary and the fit', 8, 10],
  ['save → reload → restore', 10, 13],
  ['the panels', 13, 16],
];
const html = `<!doctype html><meta charset="utf-8"><title>/plot — the frame and the composition file</title>
<style>body{margin:0;background:#080a0a;color:#d8dedd;font:13px/1.6 ui-monospace,monospace;padding:2rem;max-width:1180px}
h1{color:#6fb7ae;font-size:1rem;letter-spacing:.08em}h2{color:#e0a03a;font-size:.85rem;margin:2.5rem 0 .5rem;letter-spacing:.06em}
figure{margin:0 0 1.6rem}img{max-width:100%;border:1px solid #2b3333;display:block;background:#000}
figcaption{color:#96a2a1;padding:.5rem 0}b{color:#c8d2d1}
p.note{color:#96a2a1;border-left:2px solid #e0a03a;padding-left:.8rem}
pre{white-space:pre-wrap;color:#96a2a1;border:1px solid #222a2a;padding:.8rem}</style>
<h1>/plot — the frame, and a composition that survives a reload</h1>
<p>The boundary is a crop region in the <b>viewport's own pixel space</b> — an aspect ratio is a property of an
output image, and a boundary in grid millimetres would change shape every time the camera turned. Two shapes and
a separate ratio, so a square is a rectangle at 1:1 and a circle is an ellipse at 1:1, reachable exactly.
<b>Reset view fits the boundary; a frame control never moves the camera.</b></p>
<p class="note">THE ROUND TRIP IS THE PART THAT CANNOT BE JUDGED BY EYE. A restore that silently drops a field
looks exactly like one that did not, so cells 11–13 are a real save, a real <b>page reload</b> and a real
restore, and the caption on 13 carries the measured per-field difference:
<b>${diff.length} field${diff.length === 1 ? '' : 's'} differ</b>. The saved file is beside this page as
<a href="composition.json" style="color:#6fb7ae">composition.json</a> — ${savedText.length} bytes, and the
1.9 MB grid is not in it.</p>
<p class="note">NO PIXEL DELTA IS QUOTED ANYWHERE — the renderer is not deterministic between page sessions, so
a pixel figure is a measurement only with its own same-tree control and none of these cells needs one. Every
cell settles on the real signal: screenshot until two consecutive frames are byte-identical.</p>
${SECTIONS.map(([title, a, b]) => {
  const sel = cells.slice(a, b);
  if (!sel.length) return '';
  return `<h2>${title}</h2>` + sel.map(c =>
    `<figure><img src="${c.file}"><figcaption><b>${c.file}</b> — ${c.caption}`
    + `<br>${c.frame.on ? `${c.frame.shape} ${c.frame.ratio} at margin ${c.frame.margin}% — `
        + `<b>${c.box.width.toFixed(1)} x ${c.box.height.toFixed(1)} px</b>, `
        + `${c.box.inset.toFixed(1)} px inset` : '<b>no boundary</b>'}`
    + (c.drawnBox ? ` · the drawing occupies ${c.drawnBox.width.toFixed(0)} x `
        + `${c.drawnBox.height.toFixed(0)} px` : '')
    + `<br>stem ${c.stem.on ? `${c.stem.length} mm, droop ${c.stem.droopDeg}°, neck ${c.stem.neck} mm`
        + ` — seam <b>${c.stemInfo.seamMm.toExponential(1)} mm</b>` : 'off'}`
    + ` · ${c.petals.filter(p => p.warped).length} petal${c.petals.filter(p => p.warped).length === 1 ? '' : 's'} warped`
    + (c.unsettled ? '<br><b style="color:#e07a6a">DID NOT SETTLE</b>' : '')
    + `</figcaption></figure>`).join('\n');
}).join('\n')}
<h2>the two read-outs, as the page prints them</h2>
<pre>${esc(frameReadOut)}</pre>
<pre>${esc(compReadOut)}</pre>
<p class="note">page errors: ${errs.length ? esc(errs.join(' | ')) : 'none'}</p>`;
writeFileSync(path.join(OUT, 'index.html'), html);

console.log(`\n${cells.length} cells -> ${path.join(OUT, 'index.html')}`);
console.log(`round trip: ${diff.length} fields differ${diff.length ? ': ' + diff.join(', ') : ''}`);
console.log('page errors:', errs.length ? errs : 'none');
await browser.close();
server.close();
