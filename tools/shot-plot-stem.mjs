// Contact sheet for /plot's INFERRED STEM.
//
//   node tools/shot-plot-stem.mjs <dir>
//
// THE REVIEW GATE IS THE DEPLOY PREVIEW, NOT THIS SHEET. Six live controls and
// a draggable handle set; the picture is meant to be tuned by hand. What the
// sheet is for is fixing what shipped and putting the numbers beside the
// pictures — in particular the two the page measures on itself: the SEAM (the
// largest gap between the head's own answer for a foot and the stem's, over
// every drawn line) and the CHORD (how far the eased station ladder cuts the
// corner).
//
// EVERY BEND CELL IS PRODUCED BY A REAL POINTER DRAG on a handle found through
// the page's own projection. A picture of a bend the hand cannot reach is not
// evidence about the tool.
//
// NO PIXEL DELTA IS QUOTED ANYWHERE. The renderer is not deterministic between
// page sessions, so a pixel figure is a measurement only with its own same-tree
// control, and none of these cells needs one. Every cell settles on the real
// signal instead — screenshot until two consecutive frames are byte-identical.
//
// Dev-only deps, not in package.json: npm i --no-save playwright-core three@0.161.0

import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2];
if (!OUT) { console.error('usage: node tools/shot-plot-stem.mjs <dir>'); process.exit(2); }
mkdirSync(OUT, { recursive: true });

const GRID = 'assets/plot-test/bloom-grid-live.glb';
const HOME = [0.62, 0.46, 1];      // the page's own default direction
/* SQUARE ON TO THE DROOP. The droop tips the head from grid +Z toward grid +Y,
   and the Z-up correction sends grid +Y to world −Z — so the whole droop lives
   in the world Y–Z plane and is only legible from along world X. The first run
   of this sheet used a direction that was mostly world +Z, which is the way the
   head is tipping, and photographed an 80° droop as a face-on rosette. */
const SIDE = [1, 0.20, 0.06];

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
/* A TALL VIEWPORT, because the subject is. The camera fit is height-limited on
   a 170 mm stem under a 36 mm head, so a 16:9 frame spends most of itself on
   black at the sides; this is roughly the proportion the reference drawings
   sit at. */
const ctx = await browser.newContext({ viewport: { width: 900, height: 1150 }, deviceScaleFactor: 2 });
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
await page.goto(`http://127.0.0.1:${PORT}/plot`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__plot, null, { timeout: 30000 });
await page.evaluate(() => window.__plot.ready);

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
const click = id => page.evaluate(i => document.getElementById(i).click(), id);

// SETTLE ON THE REAL SIGNAL — damping keeps easing for seconds under software
// GL, so a fixed wait samples an arbitrary point on the way in.
async function settled() {
  await q(() => window.__plot.settle());
  let prev = null;
  for (let i = 0; i < 40; i++) {
    const b = await page.screenshot();
    if (prev && Buffer.compare(prev, b) === 0) return { bytes: b, frames: i };
    prev = b;
    await page.waitForTimeout(90);
  }
  return { bytes: prev, frames: 40, unsettled: true };
}

/* A REAL DRAG, on a handle the page itself projected to the screen. Handles
   have to be SHOWN for the pointer to reach one — the pick list is the visible
   handles — so a cell that wants a clean drawing bends first and hides them
   afterwards, exactly as a hand would. */
async function dragHandle(k, dx, dy) {
  await set({ stemHandles: true });
  const p = await page.evaluate(i => window.__plot.handleScreenPos(i), k);
  if (!p) throw new Error(`handle ${k} has no screen position`);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + dx, p.y + dy, { steps: 8 });
  await page.mouse.up();
}

const DEFAULTS = { families: 'both', uDensity: 12, vDensity: 12, weight: 1.1,
                   brightness: 30, depthDim: 55, stem: 'on', stemBundle: 0.35,
                   stemJoin: 12, stemLength: 170, stemDroop: 0, stemNeck: 45,
                   stemHandles: false };
const reset = async (o = {}, dir = HOME, margin = 1.06) => {
  await click('bendReset');
  await set({ ...DEFAULTS, ...o });
  await view(dir, margin);
};

const cells = [];
async function cell(file, caption) {
  const { bytes, unsettled, frames } = await settled();
  writeFileSync(path.join(OUT, file), bytes);
  cells.push({ file, caption,
    stem: await q(() => window.__plot.stem()),
    info: await q(() => window.__plot.stemInfo()),
    bends: await q(() => window.__plot.bends()),
    drawn: await q(() => window.__plot.drawn()),
    frameMs: +(await q(() => window.__plot.frameMs())).toFixed(2),
    settleFrames: frames, unsettled: !!unsettled });
  const i = cells[cells.length - 1].info;
  console.log(`  ${file.padEnd(32)} ${String(i.segments).padStart(6)} stem seg  seam `
    + `${i.seamMm.toExponential(1)} mm  chord ${i.sagittaMm.toFixed(3)} mm  `
    + `${cells[cells.length - 1].frameMs} ms  settled in ${frames}${unsettled ? ' (NOT SETTLED)' : ''}`);
}

await chrome(false);

// --- what ships -----------------------------------------------------------
await reset();
await cell('01-shipped.png',
  'THE SHIPPED DEFAULTS, with the handles hidden. There is no stem in the export — the generator\'s '
  + '`below` throws, and that is phase-2 work there. Every stroke below the head is a u-line of the '
  + 'grid, continued downward and pulled in toward a bundle. Nothing new was loaded and no second '
  + 'curve was stroked beside them.');
await reset({ stemHandles: true });
await cell('02-as-the-page-opens.png',
  'THE SAME DRAWING AS THE PAGE OPENS IT — three bend handles down the stem, at a third, two thirds '
  + 'and the root. They are on by default because you cannot drag what you cannot see, and the '
  + 'checkbox that hides them is right above.');

// --- the bundle -----------------------------------------------------------
await reset({ stemBundle: 0.10 });
await cell('03-bundle-tight.png',
  'BUNDLE 0.10 mm — the 280 lines gather to a thread. Under the additive blending they stack in '
  + 'nearly the same place, so the stem reads bright for free; nothing is told to brighten it.');
await reset({ stemBundle: 1.60 });
await cell('04-bundle-loose.png',
  'BUNDLE 1.60 mm. At this framing 3.2 mm across a 170 mm stem is about a dozen pixels, so it reads '
  + 'as a tube with bright edges rather than as separate strands — the strands are there, and the '
  + 'next two cells go and look at them.');
await reset({ stemBundle: 0.35 }, HOME, 0.30);
await cell('05-bundle-close-tight.png',
  'THE DEFAULT BUNDLE, CLOSE. Same drawing, camera pushed in — a crisp stem.');
await reset({ stemBundle: 3.00 }, HOME, 0.30);
await cell('06-bundle-close-loose.png',
  'BUNDLE 3.00 mm, SAME CAMERA. Every line keeps its own azimuth all the way down, so a loose bundle '
  + 'stays a set of strands instead of collapsing onto one line. This is the stipple the tight '
  + 'setting hides.');

// --- droop and the neck ---------------------------------------------------
await reset({ stemDroop: 35 }, SIDE);
await cell('07-droop-35.png',
  'DROOP 35°, seen square on. The head takes the FULL rotation about the ring; the stem takes it '
  + 'decayed to zero by the end of the neck. That decay is the curve — a rigid rotation would give a '
  + 'bent stick, and the lines here are continuous so the head cannot turn without the stem.');
await reset({ stemDroop: 80 }, SIDE);
await cell('08-droop-80.png',
  'DROOP 80°. The neck carries the whole turn in its first 45 mm and the stalk below is straight. '
  + 'Nothing tears at the junction: the stem\'s own s = 0 point evaluates to the same float as the '
  + 'head\'s answer for the same foot, and the page prints the measured gap.');
await reset({ stemDroop: 60, stemNeck: 15 }, SIDE);
await cell('09-neck-15-stiff.png',
  'DROOP 60° INTO A 15 mm NECK — a stiff stalk with a sharp elbow.');
await reset({ stemDroop: 60, stemNeck: 130 }, SIDE);
await cell('10-neck-130-nodding.png',
  'THE SAME 60° HEAD INTO A 130 mm NECK — a heavy nodding bloom. Same droop, entirely different '
  + 'plant: the neck is not derivable from the angle, which is why it is its own control.');

// --- the join -------------------------------------------------------------
await reset({ stemJoin: 1.5 });
await cell('11-join-hard.png',
  'JOIN 1.5 mm — the lines gather almost at once and the head sits on the stem with a hard shoulder.');
await reset({ stemJoin: 45 });
await cell('12-join-funnel.png',
  'JOIN 45 mm. One number does two jobs on purpose: how gradually the lines gather IS the '
  + 'head-to-stem taper, so the funnel comes for free rather than from a second control that could '
  + 'disagree with it.');

// --- length ---------------------------------------------------------------
await reset({ stemLength: 60 });
await cell('13-length-60.png', 'LENGTH 60 mm. The camera fit follows the drawing, so the frame grows with the stem.');
await reset({ stemLength: 380 });
await cell('14-length-380.png', 'LENGTH 380 mm — the proportion the reference drawings sit at.');

// --- bend points ----------------------------------------------------------
await reset();
await dragHandle(1, 150, -20);
await dragHandle(0, -95, 10);
await set({ stemHandles: false });
await cell('15-bend-s-curve.png',
  'A CURVED STEM, from two real drags on the top two handles — the drawing with the handles hidden '
  + 'afterwards. Each control point has a gaussian influence whose width comes from how far its '
  + 'neighbours are, so two of them BLEND into one curve instead of meeting at a kink. The head has '
  + 'not moved: the bend is multiplied by the funnel\'s own convergence curve, which is zero at the '
  + 'ring.');
await set({ stemHandles: true });
await cell('16-bend-s-curve-handles.png',
  'THE SAME BEND WITH ITS HANDLES. A handle sits on the stem\'s own centre line, through the same law '
  + 'the lines went through, so a handle that cannot move the drawing does not move either.');
await reset();
await dragHandle(2, -170, 30);
await set({ stemHandles: true });
await cell('17-root-moved.png',
  'THE ROOT, DRAGGED. It is a control point like any other — a locked root only makes sense for a '
  + 'plant in the ground, and this is a picture.');
await reset();
await click('bendAdd'); await click('bendAdd'); await click('bendAdd');
await dragHandle(1, 90, 0); await dragHandle(3, -80, 0); await dragHandle(5, 70, 0);
await set({ stemHandles: false });
await cell('18-six-points.png',
  'SIX CONTROL POINTS, three of them pulled. "Add" subdivides the widest stretch and every point\'s '
  + 'width comes from its neighbours, so adding one makes the ones around it a LOCAL adjustment — '
  + 'which is what adding a control point should do, and why there is no width slider to get wrong.');

// --- the coupling ---------------------------------------------------------
await reset({ families: 'v' });
await cell('19-no-u-no-stem.png',
  'V ONLY — AND NO STEM. The stem IS the u-lines continued, so lines that are not drawn have nothing '
  + 'to continue. The panel says so rather than quietly drawing a stem for lines that are not on '
  + 'screen.');
await reset({ uDensity: 5 });
await cell('20-thinned.png',
  'U DENSITY 5. The stem thins in step with the family it is made of, and dims with it under the '
  + 'additive blending — one drawing, thinned consistently, rather than a grid that thins beside a '
  + 'stem that does not.');

// --- the panel ------------------------------------------------------------
await reset({ stemDroop: 40, stemHandles: true });
await chrome(true);
await cell('21-panel.png',
  'THE PANEL. Six controls, the bend count, and a read-out that states the law with numbers — '
  + 'including the two the page measures on itself: the SEAM between the head and the stem at the '
  + 'ring, and the CHORD the eased station ladder cuts.');

const readout = await q(() => window.__plot.stemText());
writeFileSync(path.join(OUT, 'cells.json'), JSON.stringify(
  { grid: GRID, readout, pageErrors: errs, cells }, null, 2));

const esc = t => String(t).replace(/[<>&]/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[ch]));
const SECTIONS = [
  ['what ships', 0, 2],
  ['the bundle — how tightly the lines gather', 2, 6],
  ['droop, and the neck it washes out over', 6, 10],
  ['the join — the gather IS the taper', 10, 12],
  ['length', 12, 14],
  ['bend points, every one of them a real drag', 14, 18],
  ['the stem is the u-lines, and says so', 18, 20],
  ['the panel', 20, 21],
];
const html = `<!doctype html><meta charset="utf-8"><title>/plot — the inferred stem</title>
<style>body{margin:0;background:#080a0a;color:#d8dedd;font:13px/1.6 ui-monospace,monospace;padding:2rem;max-width:1180px}
h1{color:#6fb7ae;font-size:1rem;letter-spacing:.08em}h2{color:#e0a03a;font-size:.85rem;margin:2.5rem 0 .5rem;letter-spacing:.06em}
figure{margin:0 0 1.6rem}img{max-width:100%;border:1px solid #2b3333;display:block;background:#000}
figcaption{color:#96a2a1;padding:.5rem 0}b{color:#c8d2d1}
p.note{color:#96a2a1;border-left:2px solid #e0a03a;padding-left:.8rem}
pre{white-space:pre-wrap;color:#96a2a1;border:1px solid #222a2a;padding:.8rem}</style>
<h1>/plot — the stem, inferred from the petal lines</h1>
<p>The bloom export has no stem geometry. What it has is <b>${cells[0].info.ring.count} u-lines that all start
on the attachment ring at z = 0</b>, ${cells[0].info.ring.rMin.toFixed(2)}–${cells[0].info.ring.rMax.toFixed(2)} mm
out from its centre. The stem is those same lines continued downward and pulled in toward a bundle:
<b>${cells[0].info.segments}</b> stem segments beside the grid's <b>${cells[0].drawn.total}</b>, at
<b>${cells[0].frameMs} ms/frame</b>.</p>
<p class="note">THE REVIEW GATE IS THE DEPLOY PREVIEW, not this sheet — six live controls and a draggable
handle set, meant to be tuned by hand. Every bend cell here is a REAL pointer drag on a handle the page itself
projected to the screen. <b>No pixel delta is quoted anywhere:</b> the renderer is not deterministic between
page sessions, so a pixel figure would need its own same-tree control and none of these cells needs one. Every
cell settles on the real signal instead — screenshot until two consecutive frames are byte-identical.</p>
<p class="note">TWO NUMBERS RUN DOWN EVERY CAPTION. <b>SEAM</b> is the largest gap between the head's own
answer for a foot and the stem's, over every drawn line — the head takes the full droop and the stem takes it
decayed, and they have to agree at the ring or the lines tear. It reads 0 because both boundary values are
exact rather than approached. <b>CHORD</b> is how far the graded 64-row station ladder cuts the corner, which
is the one thing sampling the curve costs.</p>
${SECTIONS.map(([title, a, b]) => {
  const sel = cells.slice(a, b);
  if (!sel.length) return '';
  return `<h2>${title}</h2>` + sel.map(c =>
    `<figure><img src="${c.file}"><figcaption><b>${c.file}</b> — ${esc(c.caption)}`
    + `<br>bundle ${c.stem.bundle} mm · join ${c.stem.join} mm · length ${c.stem.length} mm`
    + ` · droop ${c.stem.droopDeg}° · neck ${c.stem.neck} mm · ${c.bends.length} bend point`
    + `${c.bends.length === 1 ? '' : 's'}${c.info.rest ? ' (at rest)' : ' (displaced)'}`
    + `<br><b>${c.info.segments}</b> stem segments from ${c.info.lines} u-lines`
    + ` · seam <b>${c.info.seamMm.toExponential(1)} mm</b> · chord <b>${c.info.sagittaMm.toFixed(3)} mm</b>`
    + ` — ${c.frameMs} ms/frame`
    + (c.unsettled ? '<br><b style="color:#e07a6a">DID NOT SETTLE</b>' : '')
    + `</figcaption></figure>`).join('\n');
}).join('\n')}
<h2>the stem read-out, as the page prints it</h2><pre>${esc(readout)}</pre>
<p class="note">page errors: ${errs.length ? esc(errs.join(' | ')) : 'none'}</p>`;
writeFileSync(path.join(OUT, 'index.html'), html);

console.log(`\n${cells.length} cells -> ${path.join(OUT, 'index.html')}`);
console.log('page errors:', errs.length ? errs : 'none');
await browser.close();
server.close();
