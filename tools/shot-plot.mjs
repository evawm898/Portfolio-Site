// Contact sheet for /plot — the curve viewer for the bloom's grid export.
//
//   node tools/shot-plot.mjs <dir>
//
// THIS IS A LOOK-AND-FEEL STAGE, so the sheet is not the review gate: the six
// controls are live on the page and the picture is meant to be tuned on the
// deploy preview. What the sheet is for is fixing what shipped — the two
// families apart and together at a low angle, two density settings, each lever
// as a pair, and the drag-and-drop swap actually swapping, with the page's own
// census in every caption.
//
// NO PIXEL DELTA IS QUOTED ANYWHERE ON IT. The renderer is not deterministic
// between page sessions (orbit damping is still easing at any fixed wait), so
// a pixel number is a measurement only with its own same-tree control, and
// none of these cells needs one. What every cell DOES do is settle on the real
// signal — screenshot until two consecutive frames are byte-identical, never a
// fixed sleep — so the images are stable and comparable by eye.

import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2];
if (!OUT) { console.error('usage: node tools/shot-plot.mjs <dir>'); process.exit(2); }
mkdirSync(OUT, { recursive: true });

const GRID = 'assets/plot-test/bloom-grid-live.glb';
const LOW = [0.94, 0.13, 1];     // a low camera angle — the whorls overlap most here
const HOME = [0.62, 0.46, 1];    // the page's own default direction

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
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
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
    el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}, o);
const view = (dir, margin = 1.06) => page.evaluate(([d, m]) => window.__plot.setView(d, m), [dir, margin]);
const chrome = show => page.addStyleTag({
  content: `#plot-left,#plot-side{display:${show ? 'flex' : 'none'} !important}` });

// SETTLE ON THE REAL SIGNAL. Damping keeps the camera easing for seconds under
// software GL, so a fixed wait samples an arbitrary point on the way in.
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

const DEFAULTS = { families: 'both', uDensity: 12, vDensity: 12, weight: 1.1,
                   brightness: 30, depthDim: 55 };
const cells = [];
async function cell(file, caption) {
  const { bytes, unsettled, frames } = await settled();
  writeFileSync(path.join(OUT, file), bytes);
  const s = await q(() => window.__plot.state());
  const d = await q(() => window.__plot.drawn());
  const c = await q(() => window.__plot.census());
  const ms = await q(() => window.__plot.frameMs());
  cells.push({ file, caption, state: s, drawn: d, census: c, frameMs: +ms.toFixed(2),
               settleFrames: frames, unsettled: !!unsettled,
               source: await q(() => window.__plot.source()) });
  console.log(`  ${file.padEnd(30)} ${String(d.total).padStart(6)} segments  `
    + `${ms.toFixed(2)} ms  settled in ${frames}${unsettled ? ' (NOT SETTLED)' : ''}`);
}

await chrome(false);

// --- the two families, at a low angle -------------------------------------
await set(DEFAULTS); await view(LOW);
await cell('01-both-low.png',
  'u + v at a LOW camera angle, shipped defaults. Every stroke here is a curve that was already in '
  + 'the file — the render reads the LINE_STRIPs, projects them and strokes them, and nothing is '
  + 'inferred from a surface.');
await set({ ...DEFAULTS, families: 'u' });
await cell('02-u-only-low.png',
  'u ONLY, same camera. The long curves that run base to tip, one per column of the petal grid. '
  + 'The family comes from extras.kind on each primitive — never from the shape of the line.');
await set({ ...DEFAULTS, families: 'v' });
await cell('03-v-only-low.png',
  'v ONLY, same camera. The cross-sections, one per row. Note this is the LARGER family by strip '
  + 'count and the SMALLER by segments: 812 strips of 10 points against 280 of 29.');
await set(DEFAULTS); await view(HOME);
await cell('04-both-home.png',
  'u + v from the page\'s own default direction, which is what a fresh load and `reset view` give. '
  + 'The fit projects every grid point onto the camera\'s own axes rather than fitting a bounding '
  + 'sphere — a bloom is a wide flat disc and a sphere fit leaves most of the frame empty.');

// --- two density settings --------------------------------------------------
await view(LOW);
await set({ ...DEFAULTS, uDensity: 12, vDensity: 6 });
await cell('05-density-v-every-7th.png',
  'DENSITY, setting one: every u line, every 7th v. Thinning the cross-family is what opens the '
  + 'bloom up — at full density the hub is a solid mass and the additive glow has nowhere to go.');
await set({ ...DEFAULTS, uDensity: 8, vDensity: 4 });
await cell('06-density-u-5th-v-9th.png',
  'DENSITY, setting two: every 5th u, every 9th v. Both sliders keep BOTH MARGINS of every petal '
  + 'whatever the stride — for the u family those two lines are the petal\'s own outline, and '
  + 'dropping one at an even stride makes every petal read lopsided.');

// --- the levers, as pairs --------------------------------------------------
await set({ ...DEFAULTS, uDensity: 12, vDensity: 6, weight: 0.5 });
await cell('07-weight-0-5.png', 'WEIGHT 0.5 px. Screen-space width, so it does not change with zoom.');
await set({ ...DEFAULTS, uDensity: 12, vDensity: 6, weight: 3.0 });
await cell('08-weight-3-0.png', 'WEIGHT 3.0 px — the same lines, more ink. The segment count in the '
  + 'caption is identical to the cell above it.');

await set({ ...DEFAULTS, uDensity: 12, vDensity: 6, depthDim: 0 });
await cell('09-dim-off.png', 'DEPTH DIM off. Every line at full brightness; nothing says which petals '
  + 'are in front.');
await set({ ...DEFAULTS, uDensity: 12, vDensity: 6, depthDim: 85 });
await cell('10-dim-85.png', 'DEPTH DIM 85% — the farthest line in the grid draws at 15% of its '
  + 'brightness, exactly. The far plane is SOLVED from the inverse of smoothstep against the model\'s '
  + 'own depth range on the live camera, so the number on the slider is the number delivered.');

await set({ ...DEFAULTS, uDensity: 12, vDensity: 6, brightness: 12 });
await cell('11-brightness-12.png', 'BRIGHTNESS 12%. This is the glow control and the one addition to '
  + 'the four controls the brief lists: under additive blending a line already at full white cannot '
  + 'brighten where a second crosses it, so the single-line level is how much a crossing can add.');
await set({ ...DEFAULTS, uDensity: 12, vDensity: 6, brightness: 70 });
await cell('12-brightness-70.png', 'BRIGHTNESS 70% — the same lines, but the crossings have almost no '
  + 'headroom left and the hub flattens into a white mass.');

// --- the swap ---------------------------------------------------------------
await set(DEFAULTS); await view(HOME);
await cell('13-swap-before.png', 'THE SWAP, before: the default grid as shipped, 28 petals.');

const raw = readFileSync(path.join(ROOT, GRID));
function trimmed(buf, petals) {
  const total = buf.readUInt32LE(8);
  let off = 12, json = null, bin = null;
  while (off < total) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
    const body = buf.subarray(off + 8, off + 8 + len);
    if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(body));
    if (type === 0x004E4942) bin = Buffer.from(body);
    off += 8 + len;
  }
  json.scenes[json.scene ?? 0].nodes = json.scenes[json.scene ?? 0].nodes.slice(0, petals);
  const pad = (b, f) => { const r = (4 - (b.length % 4)) % 4; return r ? Buffer.concat([b, Buffer.alloc(r, f)]) : b; };
  const j = pad(Buffer.from(JSON.stringify(json), 'utf8'), 0x20), bb = pad(bin, 0);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(j.length, 0); jh.writeUInt32LE(0x4E4F534A, 4);
  const bh = Buffer.alloc(8); bh.writeUInt32LE(bb.length, 0); bh.writeUInt32LE(0x004E4942, 4);
  const body = Buffer.concat([jh, j, bh, bb]);
  const head = Buffer.alloc(12);
  head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + body.length, 8);
  return Buffer.concat([head, body]);
}

// A REAL File on a REAL DataTransfer through a REAL dispatched DragEvent — the
// same path a hand uses, not a state hook.
async function dropGlb(bytes, name) {
  await page.evaluate(async ([b64, n]) => {
    const bin = atob(b64), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const dt = new DataTransfer();
    dt.items.add(new File([arr], n, { type: 'model/gltf-binary' }));
    document.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true }));
    document.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 500));
  }, [bytes.toString('base64'), name]);
}

await dropGlb(trimmed(raw, 5), 'bloom-grid-5petals.glb');
await cell('14-swap-after.png', 'THE SWAP, after: a DIFFERENT grid .glb dropped on the page — a real '
  + 'File on a real DataTransfer through a real dispatched drop, parsed straight from its bytes. The '
  + 'census in this caption is the page\'s own and is what proves the swap landed.');

// --- the panels, and the visible failure ------------------------------------
await chrome(true);
await dropGlb(raw, 'bloom-grid-live.glb');
await set(DEFAULTS); await view(HOME);
await cell('15-panel.png', 'THE PANELS. Three, all present, each collapsing on its own, none ever '
  + 'conditionally hidden. GRID reports the export\'s own asset.extras — `mode` above all, because '
  + 'every other number in this project is labelled live/export. DRAW carries the six controls and '
  + 'says what each one means: the stride each density lands on, where the slider bottoms out, and '
  + 'what the depth dim percentage delivers.');

const mesh = (() => {
  const pos = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0]);
  const bin = Buffer.from(pos.buffer);
  const json = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'a_solid' }],
    meshes: [{ name: 'a_solid', primitives: [{ attributes: { POSITION: 0 }, mode: 4 }] }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 6, type: 'VEC3', min: [0, 0, 0], max: [1, 1, 0] }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: bin.length }], buffers: [{ byteLength: bin.length }] };
  const pad = (b, f) => { const r = (4 - (b.length % 4)) % 4; return r ? Buffer.concat([b, Buffer.alloc(r, f)]) : b; };
  const j = pad(Buffer.from(JSON.stringify(json), 'utf8'), 0x20), bb = pad(bin, 0);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(j.length, 0); jh.writeUInt32LE(0x4E4F534A, 4);
  const bh = Buffer.alloc(8); bh.writeUInt32LE(bb.length, 0); bh.writeUInt32LE(0x004E4942, 4);
  const body = Buffer.concat([jh, j, bh, bb]);
  const head = Buffer.alloc(12);
  head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + body.length, 8);
  return Buffer.concat([head, body]);
})();
await dropGlb(mesh, 'a-solid.glb');
await cell('16-mesh-glb-refused.png', 'A MESH glTF, DROPPED. Almost always what someone reaches for by '
  + 'mistake, so it says what it found instead of drawing nothing — and the grid that was on screen is '
  + 'still on screen. Rendering an empty viewport would be indistinguishable from a page that broke.');
const refusal = await q(() => window.__plot.error());

const readouts = { grid: await q(() => window.__plot.gridText()), draw: await q(() => window.__plot.drawText()) };
writeFileSync(path.join(OUT, 'cells.json'), JSON.stringify(
  { grid: GRID, refusal, readouts, pageErrors: errs, cells }, null, 2));

const esc = t => String(t).replace(/[<>&]/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[ch]));
const SECTIONS = [
  ['the two families, at a low camera angle', 0, 4],
  ['two density settings', 4, 6],
  ['each lever, as a pair', 6, 12],
  ['the drag-and-drop swap', 12, 14],
  ['the panels, and the file that is not a grid', 14, 16],
];
const html = `<!doctype html><meta charset="utf-8"><title>/plot — contact sheet</title>
<style>body{margin:0;background:#080a0a;color:#d8dedd;font:13px/1.6 ui-monospace,monospace;padding:2rem;max-width:1180px}
h1{color:#6fb7ae;font-size:1rem;letter-spacing:.08em}h2{color:#e0a03a;font-size:.85rem;margin:2.5rem 0 .5rem;letter-spacing:.06em}
figure{margin:0 0 1.6rem}img{max-width:100%;border:1px solid #2b3333;display:block;background:#000}
figcaption{color:#96a2a1;padding:.5rem 0}b{color:#c8d2d1}
p.note{color:#96a2a1;border-left:2px solid #e0a03a;padding-left:.8rem}
pre{white-space:pre-wrap;color:#96a2a1;border:1px solid #222a2a;padding:.8rem}</style>
<h1>/plot — the bloom grid, as line art</h1>
<p>The bloom generator's <b>Get grid ↓</b> export drawn white on black with additive blending. Every stroke is a
LINE_STRIP that was already in the file; the whole render is read, project, stroke. Grid:
<b>${esc(GRID)}</b> — ${cells[0].census.strips} strips (${cells[0].census.u} u · ${cells[0].census.v} v),
<b>${cells[0].census.segments}</b> segments, 28 petals, mode <b>live</b>.</p>
<p class="note">THE REVIEW GATE IS THE DEPLOY PREVIEW, not this sheet — six live controls, nothing needing a
re-export. What the sheet fixes is what shipped and what the numbers are. <b>No pixel delta is quoted
anywhere on it:</b> the renderer is not deterministic between page sessions, so a pixel figure would need its
own same-tree control and none of these cells needs one. Every cell settles on the real signal instead —
screenshot until two consecutive frames are byte-identical.</p>
<p class="note">A limitation this sheet photographs rather than compensates for: this bloom is SPLAYED
(spread 0.60, tilt 25°) and so reads flatter than a cupped reference form. That is a bloom parameter, not a
rendering one, and the viewer does not correct for it.</p>
${SECTIONS.map(([title, a, b]) => {
  const sel = cells.slice(a, b);
  if (!sel.length) return '';
  return `<h2>${title}</h2>` + sel.map(c =>
    `<figure><img src="${c.file}"><figcaption><b>${c.file}</b> — ${esc(c.caption)}`
    + `<br>${esc(c.source)} · lines <b>${esc(c.state.families)}</b> · u density ${c.state.uDensity}`
    + ` · v density ${c.state.vDensity} · weight ${c.state.weight} px · brightness `
    + `${Math.round(c.state.brightness * 100)}% · depth dim ${Math.round(c.state.depthDim * 100)}%`
    + `<br><b>${c.drawn.total}</b> of ${c.census.segments} segments drawn `
    + `(u ${c.drawn.u} · v ${c.drawn.v}) — ${c.frameMs} ms/frame`
    + (c.unsettled ? '<br><b style="color:#e07a6a">DID NOT SETTLE</b>' : '')
    + `</figcaption></figure>`).join('\n');
}).join('\n')}
<h2>what a file that is not a grid gets told</h2><pre>${esc(refusal)}</pre>
<h2>the read-outs, as the page prints them</h2><pre>${esc(readouts.grid)}\n\n${esc(readouts.draw)}</pre>
<p class="note">page errors: ${errs.length ? esc(errs.join(' | ')) : 'none'}</p>`;
writeFileSync(path.join(OUT, 'index.html'), html);

console.log(`\n${cells.length} cells -> ${path.join(OUT, 'index.html')}`);
console.log('page errors:', errs.length ? errs : 'none');
await browser.close();
server.close();
