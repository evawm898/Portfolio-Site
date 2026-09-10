// Contact sheet for /plot's POLARITY and its two EXPORTS.
//
//   node tools/shot-plot-export.mjs <dir>
//
// THIS SHEET PRODUCES THE ARTEFACTS, NOT ONLY PICTURES OF THEM. A screenshot of
// a canvas is not evidence that an export works: the whole question is whether
// what comes OUT of the tool is the picture, at a real size, in a form a plotter
// can draw. So the cells that matter are the exported FILES themselves — a PNG
// at each polarity, written to disk and shown; an SVG at each polarity, written
// to disk, RENDERED BACK through the browser's own SVG engine and shown beside
// its measured physical size and path count. The index embeds the real .svg
// files with <img>, so opening the sheet IS opening the SVGs.
//
// POLARITY IS THE RULING THIS SHEET IS FOR. Additive-toward-white and
// multiply-toward-black are symmetric in principle and are not symmetric in
// practice, because blending here happens on sRGB-ENCODED values: a single line
// is transferred so it lands at the same ink either way, and the CROSSINGS are
// what cannot carry across. Whether that reads as the same drawing is a
// judgement somebody makes with their eyes, so the two are shot at one camera,
// one after the other, with the measured ladder in every caption.
//
// NO PIXEL DELTA IS QUOTED ANYWHERE, the discipline every sheet here follows:
// the renderer is not deterministic between page sessions, so a pixel figure is
// a measurement only with its own same-tree control and no cell here needs one.
// Every cell settles on the real signal — screenshot until two consecutive
// frames are byte-identical — and the numbers that ARE quoted (the ink ladder,
// the physical size, the path count, the pen-down count) come out of the page's
// own accessors rather than off a picture.
//
// Dev-only deps, not in package.json: npm i --no-save playwright-core three@0.161.0

import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2];
if (!OUT) { console.error('usage: node tools/shot-plot-export.mjs <dir>'); process.exit(2); }
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
                                       deviceScaleFactor: 2 });
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

await page.goto(`http://127.0.0.1:${PORT}/plot`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__plot, null, { timeout: 30000 });
await page.evaluate(() => window.__plot.ready);
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
// The ink ladder, from the page's own arithmetic at the level the control is on
// — so a caption reports what the shader will do rather than what a picture
// looks like it did.
const ladderNow = () => q(() => {
  const p = window.__plot.polarityInfo();
  return { id: p.id, blend: p.blendName,
           single: Math.round(p.singleLinePixel * 255),
           text: window.__plot.drawText().split('\n').slice(-2).join(' · ') };
});

async function cell(file, caption, opts = {}) {
  const { bytes, unsettled, frames } = await settled(opts.target || null);
  writeFileSync(path.join(OUT, file), bytes);
  const l = await ladderNow();
  cells.push({ file, caption, ...opts.meta, ladder: l, settleFrames: frames,
               unsettled: !!unsettled, kind: opts.kind || 'shot' });
  console.log(`  ${file.padEnd(32)} ${l.id.padEnd(7)} ${l.blend.padEnd(9)} single ${String(l.single).padStart(3)}`
    + `   settled in ${frames}${unsettled ? '  (NOT SETTLED)' : ''}`);
}

const DEFAULTS = { frame: 'on', frameShape: 'rect', frameRatio: '2:3', frameMargin: 6,
                   families: 'both', uDensity: 12, vDensity: 12, weight: 1.1,
                   polarity: 'screen', brightness: 30, depthDim: 55,
                   stem: 'on', stemBundle: 0.35, stemJoin: 12, stemLength: 170,
                   stemDroop: 0, stemNeck: 45, stemHandles: false,
                   petalPick: -1, petalHandles: false };
const reset = async (o = {}, dir = HOME) => {
  await page.evaluate(() => document.getElementById('bendReset').click());
  await set({ ...DEFAULTS, ...o });
  await view(dir);
};

// ===========================================================================
// THE POLARITY, AT ONE CAMERA
console.log('\npolarity — the same drawing, the same camera, both regimes');
await reset();
await cell('01-screen.png',
  'WHAT SHIPS — white ink on black under ADDITIVE blending. Crossings brighten toward white '
  + 'because the fragments genuinely add, and that glow is most of what makes the drawing read. '
  + 'The single-line level is the glow control precisely because a line already at full white has '
  + 'no headroom left.');

await set({ polarity: 'print' });
await cell('02-print.png',
  'THE SAME DRAWING, THE SAME CAMERA, THE SAME SLIDER — black ink on white under MULTIPLY. Not a '
  + 'colour swap: inverting the colours alone gives a white rectangle, because additive ink on a '
  + 'white ground saturates on the first line. A single line lands at exactly the same INK as the '
  + 'cell above (the two framebuffer values sum to 255), so what you are comparing is the '
  + 'CROSSINGS and nothing else.');

// THE ASYMMETRY, ON PURPOSE, AT A LEVEL WHERE IT IS UNMISSABLE.
console.log('\nthe ink level — where the two regimes part company');
for (const b of [12, 30, 60]) {
  await reset({ polarity: 'screen', brightness: b, depthDim: 0 });
  await cell(`03-level-${b}-screen.png`,
    `SCREEN at ${b}%, depth dim off. Additive CLIPS: past two crossings every value is the same `
    + 'white, so the drawing has a line, a crossing, and then nothing further to say.');
  await set({ polarity: 'print' });
  await cell(`04-level-${b}-print.png`,
    `PRINT at ${b}%, the same camera. Multiply never reaches the ground, so the crossings keep `
    + 'separating — six distinguishable levels where the screen has two. That asymmetry is '
    + 'irreducible and it is in the GOOD direction, which is why it is reported rather than tuned.');
}

// THE DEPTH DIM — the same law, the other ground
console.log('\nthe depth dim — the same law, the other ground');
await reset({ depthDim: 90, polarity: 'screen' });
await cell('05-dim-screen.png',
  'DEPTH DIM 90% on black — the farthest line draws at 10% of its ink, fading into the BLACK.');
await set({ polarity: 'print' });
await cell('06-dim-print.png',
  'DEPTH DIM 90% on white — the same law with only the fog’s COLOUR flipped: a far line’s ink is '
  + '(1 − f) times a near one’s in both regimes, algebraically. A black fog here would drive far '
  + 'lines toward dst×0 and make the most DISTANT lines the heaviest thing on the page.');

// ===========================================================================
// THE ARTEFACTS
console.log('\nthe exports — the actual files');
const artefacts = [];

async function shootExports(tag, o, note) {
  await reset(o);
  const raster = await q(() => window.__plot.exportRaster({ withData: true }));
  const svg = await q(() => window.__plot.exportSvg());
  const pngName = `export-${tag}.png`, svgName = `export-${tag}.svg`;
  writeFileSync(path.join(OUT, pngName),
    Buffer.from(raster.dataUrl.split(',')[1], 'base64'));
  writeFileSync(path.join(OUT, svgName), svg.text);
  // RENDERED BACK THROUGH THE BROWSER'S OWN SVG ENGINE, so "it renders" is a
  // picture and not a claim. Magenta shows through wherever the file put
  // nothing at all, which is how the clip is legible on a white artefact.
  const shot = await page.evaluate(async t => {
    const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(t)));
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const cv = document.createElement('canvas');
    const H = 900, W = Math.round(H * img.naturalWidth / img.naturalHeight);
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.fillStyle = '#ff00ff'; g.fillRect(0, 0, W, H);
    g.drawImage(img, 0, 0, W, H);
    return cv.toDataURL('image/png');
  }, svg.text);
  writeFileSync(path.join(OUT, `render-${tag}.png`), Buffer.from(shot.split(',')[1], 'base64'));
  const rec = { tag, note, pngName, svgName, renderName: `render-${tag}.png`,
    raster: { w: raster.width, h: raster.height, scale: raster.scale,
              requested: raster.requestedScale, cleared: raster.cleared,
              notGrey: raster.stats.notGrey, pixels: raster.stats.pixels,
              opaque: raster.stats.opaque, ink: raster.stats.ink, name: raster.name },
    svg: { paths: svg.paths, strips: svg.strips, points: svg.points, dropped: svg.dropped,
           widthMm: svg.widthMm, heightMm: svg.heightMm, strokeMm: svg.strokeMm,
           unit: svg.unit, bytes: svg.text.length, name: svg.name,
           penDowns: (svg.text.match(/M-?[\d.]/g) || []).length,
           draws: (svg.text.match(/L-?[\d.]/g) || []).length } };
  artefacts.push(rec);
  console.log(`  ${tag.padEnd(16)} PNG ${rec.raster.w}x${rec.raster.h} @${rec.raster.scale}x`
    + `  notGrey ${rec.raster.notGrey}`
    + `   SVG ${rec.svg.paths} paths / ${rec.svg.penDowns} pen-downs / ${rec.svg.draws} draws`
    + `  ${rec.svg.widthMm.toFixed(1)}x${rec.svg.heightMm.toFixed(1)} ${rec.svg.unit}`);
  return rec;
}

await shootExports('screen-rect', { polarity: 'screen' },
  'SCREEN POLARITY, RECTANGLE. The PNG is the framebuffer itself at 4x — the additive result '
  + 'survives because it IS the render. The SVG cannot be that picture and does not pretend to be.');
await shootExports('print-rect', { polarity: 'print' },
  'PRINT POLARITY, RECTANGLE — the artefact this session exists for. The SVG here carries no '
  + 'background at all: on white paper the absence of ink IS the ground, which is what a plotter '
  + 'wants and what a filled rectangle would only get in the way of.');
await shootExports('print-ellipse', { polarity: 'print', frameShape: 'ellipse' },
  'ELLIPSE. Outside the boundary the PNG is TRANSPARENT rather than filled — alpha is the '
  + 'recoverable way round, since a ground fill cannot have its corners taken back off — and the '
  + 'SVG carries a real clipPath rather than a crop to the bounding box.');
await shootExports('screen-ellipse', { polarity: 'screen', frameShape: 'ellipse' },
  'ELLIPSE ON BLACK. The SVG’s ground rect is INSIDE the clip with the ink: outside it, this cell '
  + 'would be a full black RECTANGLE with an ellipse of white lines floating in it.');

// The chrome test, photographed: every editor affordance on, and the export grey.
console.log('\nchrome — on screen, and not in the file');
await reset({ polarity: 'screen', stemHandles: true, petalHandles: true, petalPick: 11 });
await cell('07-chrome-on-screen.png',
  'ON SCREEN: the boundary in teal, both handle sets, and petal 11 highlighted in the accent. '
  + 'Every one of these is an EDITOR affordance.', { meta: { chrome: true } });
const chromeExport = await q(() => window.__plot.exportRaster({ withData: true, scale: 2 }));
writeFileSync(path.join(OUT, '08-chrome-not-in-the-export.png'),
  Buffer.from(chromeExport.dataUrl.split(',')[1], 'base64'));
cells.push({ file: '08-chrome-not-in-the-export.png', kind: 'artefact',
  ladder: await ladderNow(),
  caption: `THE SAME STATE, EXPORTED. None of it is here — and the witness is that the result is `
    + `GREY: ${chromeExport.stats.notGrey} of ${chromeExport.stats.pixels} pixels are non-neutral, `
    + `where the accent is 0x6fb7ae and the petal handles 0xd6a15c and neither is grey in any `
    + `channel. One identity catches a leaked boundary, a leaked handle and a leaked highlight.` });
console.log(`  08-chrome-not-in-the-export.png  notGrey ${chromeExport.stats.notGrey}`
  + ` of ${chromeExport.stats.pixels}`);

// The panel
await reset({ polarity: 'print' });
await chrome(true);
const panel = await page.$('#plot-frame');
await cell('09-panel-frame.png', 'THE FRAME PANEL, which is where the exports live because the '
  + 'frame is what defines the output bounds. It says what each artefact would be before you ask '
  + 'for it, and it says plainly that the SVG is flat strokes with no glow.',
  { target: panel });
const drawPanel = await page.$('#plot-draw');
await cell('10-panel-draw.png', 'THE DRAW PANEL in print polarity. The level control’s LABEL reads '
  + '“darkness” — the same number is an amount of light on black and an amount of ink on white — '
  + 'while its id stays `brightness`, because that is what every saved composition names. The '
  + 'read-out prints the crossing ladder rather than describing it.',
  { target: drawPanel });
await chrome(false);

// ===========================================================================
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const html = `<!DOCTYPE html><meta charset="utf-8"><title>/plot — polarity and export</title>
<style>
 body{background:#14181a;color:#c8d2d1;font:14px/1.55 "IBM Plex Mono",ui-monospace,monospace;
      margin:0;padding:2rem;max-width:1100px}
 h1{font-size:1.2rem;letter-spacing:.08em} h2{font-size:.95rem;color:#6fb7ae;margin-top:2.5rem}
 .cell{margin:2rem 0;border-top:1px solid #263033;padding-top:1rem}
 .cell img{max-width:100%;display:block;border:1px solid #263033}
 .cap{margin:.6rem 0;color:#9fb0ae}
 .num{color:#6fb7ae}
 .warn{color:#d6a15c}
 /* THE CHECKERBOARD IS THE POINT for an ellipse PNG: it is what makes the alpha
    outside the boundary visible instead of reading as a white fill. */
 .alpha{background-image:linear-gradient(45deg,#2a3033 25%,transparent 25%),
        linear-gradient(-45deg,#2a3033 25%,transparent 25%),
        linear-gradient(45deg,transparent 75%,#2a3033 75%),
        linear-gradient(-45deg,transparent 75%,#2a3033 75%);
        background-size:20px 20px;background-position:0 0,0 10px,10px -10px,-10px 0}
 table{border-collapse:collapse;margin:.6rem 0;font-size:12.5px}
 td,th{border:1px solid #263033;padding:.25rem .6rem;text-align:left}
</style>
<h1>/plot — polarity, and the first print out of the tool</h1>
<p class="cap">Every cell settles on the real signal (screenshot until two consecutive frames are
byte-identical) and <b>no pixel delta is quoted anywhere</b> — the renderer is not deterministic
between page sessions. The numbers below come out of the page's own accessors and out of the
exported files themselves.</p>

<h2>The polarity</h2>
${cells.filter(c => /^0[1-7]/.test(c.file)).map(c => `<div class="cell">
  <img src="${c.file}" alt="">
  <p class="cap">${esc(c.caption)}</p>
  <p class="cap"><span class="num">${c.ladder.id} · ${c.ladder.blend} · single line
  ${c.ladder.single}/255</span> — ${esc(c.ladder.text)}</p></div>`).join('\n')}

<h2>The chrome is on the page and not in the file</h2>
${cells.filter(c => /^08/.test(c.file)).map(c => `<div class="cell">
  <img src="${c.file}" alt=""><p class="cap">${esc(c.caption)}</p></div>`).join('\n')}

<h2>The artefacts — these are the actual exported files</h2>
${artefacts.map(a => `<div class="cell">
  <p class="cap">${esc(a.note)}</p>
  <table>
    <tr><th>PNG</th><td><a href="${a.pngName}" style="color:#6fb7ae">${esc(a.raster.name)}</a></td>
        <td class="num">${a.raster.w} × ${a.raster.h} px at ${a.raster.scale}×</td>
        <td>${a.raster.cleared ? `<span class="num">${a.raster.cleared}</span> px cleared outside the ellipse`
          : 'fully opaque'}</td>
        <td>non-neutral pixels: <span class="num">${a.raster.notGrey}</span></td></tr>
    <tr><th>SVG</th><td><a href="${a.svgName}" style="color:#6fb7ae">${esc(a.svg.name)}</a></td>
        <td class="num">${a.svg.widthMm.toFixed(2)} × ${a.svg.heightMm.toFixed(2)} ${a.svg.unit}</td>
        <td><span class="num">${a.svg.paths}</span> paths from
            <span class="num">${a.svg.strips}</span> strips</td>
        <td>stroke <span class="num">${a.svg.strokeMm.toFixed(3)} ${a.svg.unit}</span></td></tr>
    <tr><th></th><td colspan="4"><span class="num">${a.svg.penDowns}</span> pen-downs and
        <span class="num">${a.svg.draws}</span> draws over ${a.svg.points} points —
        emitted per SEGMENT it would be ${a.svg.draws} pen-downs.
        ${a.svg.dropped ? `${a.svg.dropped} points were off screen.` : ''}
        ${(a.svg.bytes / 1048576).toFixed(2)} MB.</td></tr>
  </table>
  <p class="cap">the PNG, on a checkerboard so alpha is visible:</p>
  <img class="alpha" src="${a.pngName}" alt="" style="max-height:520px;width:auto">
  <p class="cap">the SVG, as this browser renders it (magenta = the file put nothing there):</p>
  <img src="${a.renderName}" alt="" style="max-height:520px;width:auto">
  <p class="cap">and the same SVG embedded directly, so opening this sheet IS opening the file:</p>
  <img src="${a.svgName}" alt="" style="max-height:520px;width:auto;background:#fff">
</div>`).join('\n')}

<h2>The panels</h2>
${cells.filter(c => /^(09|10)/.test(c.file)).map(c => `<div class="cell">
  <img src="${c.file}" alt=""><p class="cap">${esc(c.caption)}</p></div>`).join('\n')}

<p class="cap">page errors: ${errs.length ? `<span class="warn">${esc(errs.join(' | '))}</span>` : 'none'}</p>
`;
writeFileSync(path.join(OUT, 'index.html'), html);
writeFileSync(path.join(OUT, 'artefacts.json'), JSON.stringify({ artefacts, cells }, null, 2));

console.log(`\n${cells.length} cells + ${artefacts.length} artefact sets -> ${OUT}/index.html`);
console.log('page errors:', errs.length ? errs : 'none');
const unsettled = cells.filter(c => c.unsettled).map(c => c.file);
if (unsettled.length) console.log('NOT SETTLED:', unsettled.join(', '));
await browser.close();
server.close();
