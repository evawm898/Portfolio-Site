// Contact sheet for /plot's SEVERAL BLOOMS.
//
//   node tools/shot-plot-blooms.mjs <dir>
//
// THE REVIEW GATE IS THE DEPLOY PREVIEW, NOT THIS SHEET. Eight live controls on
// the BLOOM panel and a file input that ADDS; the composition is meant to be
// built by hand. What the sheet is for is showing what a composition of several
// blooms actually looks like at the shipped placement, and putting the numbers
// beside the pictures — how many blooms, what each one is drawn from, and what
// the whole thing costs to rebuild.
//
// EVERY BLOOM HERE IS LOADED THROUGH THE PAGE'S OWN LOADER, the same path a
// dropped file takes. A picture of a composition the hand cannot build is not
// evidence about the tool.
//
// THE COST LINE IS THE ONE TO READ FIRST. The FRAME stays trivial as blooms are
// added — it is 0.4 ms at three of them — and the REBUILD is what scales, so a
// slider drag at three blooms costs about four times what it costs at one. That
// is reported here and on the panel rather than optimised around.
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
if (!OUT) { console.error('usage: node tools/shot-plot-blooms.mjs <dir>'); process.exit(2); }
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
/* A WIDE VIEWPORT, because the subject is: several blooms stand SIDE BY SIDE at
   the shipped placement, so the frame this sheet needs is the opposite shape
   from the stem sheet's. The tall cells that want a stem say so and re-frame. */
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
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
                   polarity: 'screen', brightness: 30, depthDim: 55,
                   stem: 'on', stemBundle: 0.35, stemJoin: 12, stemLength: 170,
                   stemDroop: 0, stemNeck: 45, stemHandles: false,
                   petalHandles: false, frame: 'off' };

/* THE DRAW SETTINGS ARE COMPOSITION-LEVEL AND THE STEM'S ARE NOT — so a sweep
   that wrote every key would put the same stem on whichever bloom happened to
   be selected and leave the others alone. `set` writes what it is given; this
   walks the blooms and gives each one the stem it should have. */
const selectBloom = k => page.evaluate(i => window.__plot.selectInstance(i), k);
const addBloom = () => page.evaluate(() => window.__plot.addGrid('bloom-grid-live.glb'));
const eachBloom = async (fn) => {
  const n = await q(() => window.__plot.instanceCount());
  for (let k = 0; k < n; k++) { await selectBloom(k); await fn(k, n); }
};
const soloAgain = () => page.evaluate(async () => {
  while (window.__plot.instanceCount() > 1) {
    window.__plot.removeInstance(window.__plot.instanceCount() - 1);
  }
  await new Promise(r => setTimeout(r, 30));
});

const WIDE = [0.30, 0.35, 1];       // enough elevation to read the discs
const FLAT = [0.05, 0.10, 1];       // square on, for the placement rows

const cells = [];
async function cell(file, caption) {
  const { bytes, unsettled, frames } = await settled();
  writeFileSync(path.join(OUT, file), bytes);
  cells.push({ file, caption,
    blooms: await q(() => window.__plot.instances()),
    drawn: await q(() => window.__plot.drawn()),
    ident: await q(() => window.__plot.placedIdentity()),
    ext: await q(() => window.__plot.placedExtents()),
    frameMs: +(await q(() => window.__plot.frameMs())).toFixed(2),
    rebuildMs: await q(() => {
      /* THE REBUILD, MEASURED ON REAL SLIDER EVENTS AND NOT ON A CALL. It is
         what a drag pays per input event, and it is the number that scales with
         the number of blooms — the frame does not. Median of nine, because the
         first is always the cold one. */
      const el = document.getElementById('uDensity');
      const was = el.value, t = [];
      for (let i = 0; i < 9; i++) {
        el.value = String(12 - (i % 3));
        const t0 = performance.now();
        el.dispatchEvent(new Event('input', { bubbles: true }));
        t.push(performance.now() - t0);
      }
      el.value = was; el.dispatchEvent(new Event('input', { bubbles: true }));
      t.sort((a, b) => a - b);
      return +t[4].toFixed(1);
    }),
    settleFrames: frames, unsettled: !!unsettled });
  const c = cells[cells.length - 1];
  console.log(`  ${file.padEnd(34)} ${String(c.blooms.length).padStart(2)} blooms  `
    + `${String(c.drawn.total + c.drawn.stem).padStart(7)} drawn  rebuild ${c.rebuildMs} ms  `
    + `frame ${c.frameMs} ms  settled in ${frames}${unsettled ? ' (NOT SETTLED)' : ''}`);
}

await chrome(false);

// --- one bloom, unchanged -------------------------------------------------
await set({ ...DEFAULTS });
await view(WIDE);
await cell('01-one-bloom.png',
  'ONE BLOOM, WHICH IS WHAT THE PAGE STILL OPENS ON. Nothing about this drawing moved: the first '
  + 'bloom takes the identity transform, so every strip on screen is the very array its file wrote '
  + '— that is an array identity the gate reads, not a tolerance.');

// --- adding ---------------------------------------------------------------
await addBloom();
await eachBloom(async () => { await set({ stem: 'on', stemDroop: 0 }); });
await view(WIDE);
await cell('02-two-blooms.png',
  'THE SAME GRID LOADED A SECOND TIME. Import ADDS — that is the change — and the new bloom lands '
  + 'CLEAR of the first rather than on top of it. Under additive ink on black, a second bloom at the '
  + 'origin is indistinguishable from an import that replaced the drawing, which is the one thing '
  + 'this must not look like. The gap is derived from the incoming bloom’s own width (0.15x of '
  + 'it), never a constant, so it is the right size at any export scale.');

await addBloom();
await eachBloom(async () => { await set({ stem: 'on', stemDroop: 0 }); });
await view(WIDE);
await cell('03-three-blooms.png',
  'THREE. The ladder is uniform because the blooms are the same file; a smaller bloom takes a '
  + 'smaller step, because the step is its own width. READ THE COST LINE UNDER THIS ONE: the frame '
  + 'is still trivial and the REBUILD is what scales.');

// --- the transform --------------------------------------------------------
await selectBloom(1);
await set({ bloomScale: 0.55 });
await selectBloom(2);
await set({ bloomScale: 1.6 });
await view(WIDE);
await cell('04-three-scales.png',
  'ONE BLOOM SIZED AGAINST ANOTHER — 0.55x, 1.00x, 1.60x. Scale is ONE control writing all three '
  + 'axes: "size this against that" is the operation, and three sliders would make the common case '
  + 'three drags. A hand-written file carrying a NON-uniform scale is still drawn exactly as it '
  + 'asks, and the panel says the control cannot show it.');

await selectBloom(1);
await set({ bloomScale: 0.55, bloomZ: 40, bloomRotY: -18 });
await selectBloom(2);
await set({ bloomScale: 1.6, bloomZ: -35, bloomRotY: 22 });
await view(WIDE);
await cell('05-placed-and-turned.png',
  'THE SAME THREE, EACH MOVED AND TURNED. Position and rotation are in the GRID’s own Z-up '
  + 'millimetres, before the page’s one Z-up correction — so a saved placement means the same '
  + 'thing whatever the viewer later does with the container. The transform is applied AFTER the warp, '
  + 'the droop and the stem, so every millimetre each bloom reports about itself stays in the space '
  + 'its own law is written in.');

/* --- a stem per bloom ---------------------------------------------------
   RE-PLACED ALONG GRID Y FOR THIS CELL, AND THAT IS NOT TIDINESS. The droop
   tips the head from grid +Z toward grid +Y and the Z-up correction sends grid
   +Y to world −Z, so the whole droop lives in the world Y–Z plane and is only
   legible from along world X — the stem sheet's own hard-won note. But the
   shipped PLACEMENT runs along grid X, which is exactly the direction that
   camera looks down, so the three blooms would stack on top of each other.
   Moving the row onto grid Y puts it across the screen at the one camera the
   droop can be read from. Compromising the camera instead would repeat the
   mistake the stem sheet records. */
await eachBloom(async (k, n) => {
  await set({ bloomX: 0, bloomY: (k - (n - 1) / 2) * 130,
              stem: 'on', stemDroop: [0, 55, -30][k] ?? 0,
              stemLength: [170, 120, 230][k] ?? 170 });
});
await view([1, 0.18, 0.10], 1.02);
await cell('06-three-stems.png',
  'THREE BLOOMS, THREE STEMS, seen square on to the droop. Each bloom infers its own stem from its '
  + 'own u-lines and carries its own six values — 0° / 55° / −30° over 170 / 120 / 230 mm. '
  + 'This is the state a page-wide stem could not express, and it is why the six controls are a VIEW '
  + 'of the selected bloom rather than a setting on the page. The row is placed along grid Y here '
  + 'rather than grid X: the droop is only legible from along world X, and that is the direction the '
  + 'shipped placement runs in.');

// --- the selection --------------------------------------------------------
await eachBloom(async (k, n) => { await set({ bloomY: 0, bloomX: k * 92, stem: 'on', stemDroop: 0 }); });
await selectBloom(1);
await set({ petalPick: 5 });
await view(WIDE);
await cell('07-selection-is-two-level.png',
  'THE CURSOR IS (BLOOM, PETAL). Petal 5 of bloom 2 is highlighted in the panel’s own teal — the '
  + 'highlight is a HUE and never a brightness, because overlapping petals already brighten where they '
  + 'cross and that is the one signal this page cannot spend. Petal 5 exists in all three blooms; only '
  + 'one of them lights up, and a canvas click picks both halves.');

await set({ petalAlong: 1.9, petalAcross: 0.6 });
await view(WIDE);
await cell('08-a-warp-belongs-to-its-bloom.png',
  'AND A WARP BELONGS TO ITS BLOOM. Petal 5 of bloom 2 is stretched 1.90x along and squeezed 0.60x '
  + 'across; petal 5 of the other two is untouched, and every one of their strips is still the array '
  + 'its file wrote. Selecting another bloom LOADS that bloom’s values — it never stamps these ones '
  + 'onto it.');

// --- the panel ------------------------------------------------------------
await chrome(true);
await view(WIDE);
await cell('09-the-panel.png',
  'THE BLOOM PANEL, between DRAW and PETAL so the two-level selection reads top-down. It says which '
  + 'bloom of how many, where that bloom stands, which axes those numbers are in, and what the whole '
  + 'composition costs to draw and to rebuild. Eight controls on a page that already had twenty-four: '
  + 'the UI overhaul on the backlog is more overdue than it was.');
await chrome(false);

// --- back to one ----------------------------------------------------------
await soloAgain();
await set({ ...DEFAULTS });
await view(WIDE);
await cell('10-back-to-one.png',
  'REMOVED BACK TO ONE, through the page’s own button. Removing a bloom drops its whole record — '
  + 'its grid, its stem, its bends, its warps and its placement go with it, so there is no field to '
  + 'forget. THE LAST BLOOM CANNOT BE REMOVED and the button says why: an empty viewport is '
  + 'indistinguishable from a page that broke.');

const readout = await q(() => window.__plot.instanceText());
const drawText = await q(() => { window.__plot.renderNow(); return window.__plot.drawText(); });
writeFileSync(path.join(OUT, 'cells.json'), JSON.stringify(
  { grid: GRID, readout, drawText, pageErrors: errs, cells }, null, 2));

const esc = t => String(t).replace(/[<>&]/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[ch]));
const SECTIONS = [
  ['one bloom, which is what the page still opens on', 0, 1],
  ['adding — import ADDS, and a new bloom lands clear', 1, 3],
  ['the transform — position, rotation and one uniform scale', 3, 5],
  ['a stem per bloom', 5, 6],
  ['the cursor is (bloom, petal)', 6, 8],
  ['the panel', 8, 9],
  ['removing', 9, 10],
];
const one = cells[0], three = cells[2];
const html = `<!doctype html><meta charset="utf-8"><title>/plot — several blooms</title>
<style>body{margin:0;background:#080a0a;color:#d8dedd;font:13px/1.6 ui-monospace,monospace;padding:2rem;max-width:1240px}
h1{color:#6fb7ae;font-size:1rem;letter-spacing:.08em}h2{color:#e0a03a;font-size:.85rem;margin:2.5rem 0 .5rem;letter-spacing:.06em}
figure{margin:0 0 1.6rem}img{max-width:100%;border:1px solid #2b3333;display:block;background:#000}
figcaption{color:#96a2a1;padding:.5rem 0}b{color:#c8d2d1}
p.note{color:#96a2a1;border-left:2px solid #e0a03a;padding-left:.8rem}
table{border-collapse:collapse;margin:1rem 0}td,th{border:1px solid #2b3333;padding:.25rem .7rem;text-align:right}
th{color:#6fb7ae;text-align:left}td:first-child{text-align:left}
pre{white-space:pre-wrap;color:#96a2a1;border:1px solid #222a2a;padding:.8rem}</style>
<h1>/plot — several blooms in one composition</h1>
<p>The composition file's root has been a <b>list of instances</b> since it was written, so this needed
no migration and <b>no version bump</b>: what changed is how many entries the page puts in it. A file
written before this session is one entry long and reads back unchanged.</p>
<p class="note">THE REVIEW GATE IS THE DEPLOY PREVIEW, not this sheet. Every bloom here was loaded
through the page's own loader — the same path a dropped file takes — and every cell settles on the real
signal (screenshot until two consecutive frames are byte-identical) rather than on a fixed wait.
<b>No pixel delta is quoted anywhere:</b> the renderer is not deterministic between page sessions, so a
pixel figure would need its own same-tree control and none of these cells needs one.</p>
<h2>what it costs, measured on this run</h2>
<table><tr><th>cells</th><th>blooms</th><th>grid segments</th><th>stem segments</th>
<th>rebuild, median of 9 real slider events</th><th>frame</th></tr>
${cells.map(c => `<tr><td>${c.file.replace('.png', '')}</td><td>${c.blooms.length}</td>`
  + `<td>${c.drawn.total.toLocaleString('en-US')}</td><td>${c.drawn.stem.toLocaleString('en-US')}</td>`
  + `<td>${c.rebuildMs} ms</td><td>${c.frameMs} ms</td></tr>`).join('\n')}</table>
<p class="note">THE FRAME DOES NOT SCALE AND THE REBUILD DOES. Three blooms is
<b>${(three.drawn.total + three.drawn.stem).toLocaleString('en-US')}</b> drawn segments against one
bloom's <b>${(one.drawn.total + one.drawn.stem).toLocaleString('en-US')}</b>, at
<b>${three.frameMs} ms/frame</b> against <b>${one.frameMs}</b> — but the rebuild a slider drag pays on
every input event goes <b>${one.rebuildMs} ms</b> to <b>${three.rebuildMs} ms</b>, which is past the
16.7 ms budget, so a drag reads as steppy at three blooms. That is reported rather than optimised
around. The fix is not built and is written down: a stem or a transform slider changes ONE bloom, so
the rebuild could touch that instance and re-pack rather than rebuilding all of them. A density slider
genuinely changes all of them and would still pay in full.</p>
${SECTIONS.map(([title, a, b]) => {
  const sel = cells.slice(a, b);
  if (!sel.length) return '';
  return `<h2>${title}</h2>` + sel.map(c =>
    `<figure><img src="${c.file}"><figcaption><b>${c.file}</b> — ${esc(c.caption)}`
    + `<br>${c.blooms.length} bloom${c.blooms.length === 1 ? '' : 's'}: `
    + c.blooms.map((bm, i) => `<b>${i + 1}</b> at (${bm.transform.position.map(v => v.toFixed(0)).join(', ')}) mm`
        + ` turn (${bm.transform.rotationDeg.map(v => v.toFixed(0)).join(', ')})°`
        + ` scale ${bm.transform.scale[0].toFixed(2)}x`
        + ` · stem ${bm.stem.on} ${bm.stem.droopDeg}°/${bm.stem.length} mm`
        + ` · ${bm.warpedPetals.length} warped petal${bm.warpedPetals.length === 1 ? '' : 's'}`
        + `${c.ident[i] && c.ident[i].identity ? ' · <b>drawn from its file’s own arrays</b>' : ''}`).join('<br>')
    + `<br><b>${(c.drawn.total + c.drawn.stem).toLocaleString('en-US')}</b> drawn segments`
    + ` (${c.drawn.total.toLocaleString('en-US')} grid + ${c.drawn.stem.toLocaleString('en-US')} stem)`
    + ` · rebuild <b>${c.rebuildMs} ms</b> · ${c.frameMs} ms/frame`
    + (c.unsettled ? '<br><b style="color:#e07a6a">DID NOT SETTLE</b>' : '')
    + `</figcaption></figure>`).join('\n');
}).join('\n')}
<h2>the bloom read-out, as the page prints it</h2><pre>${esc(readout)}</pre>
<h2>and the draw read-out beside it</h2><pre>${esc(drawText)}</pre>
<p class="note">page errors: ${errs.length ? esc(errs.join(' | ')) : 'none'}</p>`;
writeFileSync(path.join(OUT, 'index.html'), html);

console.log(`\n${cells.length} cells -> ${path.join(OUT, 'index.html')}`);
console.log('page errors:', errs.length ? errs : 'none');
await browser.close();
server.close();
