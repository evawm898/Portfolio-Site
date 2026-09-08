// Contact sheet for /plot's PETAL SELECTION AND WARP.
//
//   node tools/shot-plot-petal.mjs <dir>
//
// THE REVIEW GATE IS THE DEPLOY PREVIEW, NOT THIS SHEET. A picker, two scales
// and a draggable handle set: the picture is meant to be tuned by hand. What
// the sheet is for is fixing what shipped and putting the numbers beside the
// pictures — in particular the three the page measures on itself and that no
// picture can show:
//
//   SEAM      the largest movement of any point the file placed at u = 0. Zero
//             is the claim; the petal's base is shared with the attachment ring
//             the inferred stem hangs from, and a base that drifted would tear
//             the petal off the bundle.
//   MOVED     how far this petal actually travelled, in millimetres.
//   OFF IT    how many strips on the other 27 petals came back as the very
//             arrays the file wrote. An identity, not a tolerance.
//
// EVERY BEND CELL IS PRODUCED BY A REAL POINTER DRAG on a handle the page
// itself projected to the screen. A picture of a bend the hand cannot reach is
// not evidence about the tool.
//
// THE CLOSE CELLS CROP TO THE PETAL'S OWN MEASURED BOX, never to a hardcoded
// rectangle — /print's sheets read each part's silhouette box for the same
// reason. At whole-bloom framing 15,148 segments of white line cannot show
// whether one petal's lattice is torn, which is the thing three of these cells
// exist to answer.
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
if (!OUT) { console.error('usage: node tools/shot-plot-petal.mjs <dir>'); process.exit(2); }
mkdirSync(OUT, { recursive: true });

const HOME = [0.62, 0.46, 1];      // the page's own default direction
// Down on the rosette, where the whorls read apart and a single petal can be
// followed from its foot to its tip.
const PLAN = [0.18, 1, 0.30];
// Square on to the droop — the droop tips the head from grid +Z toward grid +Y
// and the Z-up correction sends grid +Y to world −Z, so it lives in the world
// Y–Z plane and is only legible from along world X (the stem sheet's own
// measured lesson).
const SIDE = [1, 0.20, 0.06];
// A low angle, where the whorls overlap most and click-picking is at its worst.
const LOW = [0.92, 0.14, 1];

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
const ctx = await browser.newContext({ viewport: { width: 1000, height: 1000 }, deviceScaleFactor: 2 });
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
async function settled(clip) {
  await q(() => window.__plot.settle());
  let prev = null;
  for (let i = 0; i < 40; i++) {
    const b = await page.screenshot(clip ? { clip } : undefined);
    if (prev && Buffer.compare(prev, b) === 0) return { bytes: b, frames: i };
    prev = b;
    await page.waitForTimeout(90);
  }
  return { bytes: prev, frames: 40, unsettled: true };
}

/* A REAL DRAG, on a handle the page itself projected to the screen. The panels
   are hidden for every canvas cell, so nothing is in the pointer's way — with
   them shown, a handle projecting under a control column cannot be grabbed at
   all, which is /print's own measured lesson and is a real limit of the tool
   rather than of the sheet. */
async function dragPetalHandle(k, dx, dy) {
  await set({ petalHandles: true });
  const p = await page.evaluate(i => window.__plot.petalHandleScreenPos(i), k);
  if (!p) throw new Error(`petal handle ${k} has no screen position`);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + dx, p.y + dy, { steps: 8 });
  await page.mouse.up();
}

// The crop for a close cell: the petal's own measured box, padded, clamped to
// the viewport and squared up so the cells sit together on the page.
async function boxOf(index, pad = 60) {
  const b = await page.evaluate(i => window.__plot.petalScreenBox(i), index);
  if (!b) return null;
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  const half = Math.max(b.width, b.height) / 2 + pad;
  const x = Math.max(0, Math.min(1000 - 2 * half, cx - half));
  const y = Math.max(0, Math.min(1000 - 2 * half, cy - half));
  return { x, y, width: Math.min(2 * half, 1000), height: Math.min(2 * half, 1000) };
}

const DEFAULTS = { families: 'both', uDensity: 12, vDensity: 12, weight: 1.1,
                   brightness: 30, depthDim: 55, stem: 'off', stemBundle: 0.35,
                   stemJoin: 12, stemLength: 170, stemDroop: 0, stemNeck: 45,
                   stemHandles: false,
                   petalPick: -1, petalAlong: 1, petalAcross: 1, petalHandles: false };
const reset = async (o = {}, dir = HOME, margin = 1.06) => {
  await click('petalBendReset');
  await set({ ...DEFAULTS, ...o });
  await view(dir, margin);
};

const cells = [];
async function cell(file, caption, clip) {
  const { bytes, unsettled, frames } = await settled(clip);
  writeFileSync(path.join(OUT, file), bytes);
  const info = await q(() => window.__plot.petalInfo());
  cells.push({ file, caption, info,
    petal: await q(() => window.__plot.petal()),
    frame: await q(() => window.__plot.petalFrame()),
    bends: await q(() => window.__plot.petalBends()),
    drawn: await q(() => window.__plot.drawn()),
    ui: await q(() => window.__plot.state()),
    frameMs: +(await q(() => window.__plot.frameMs())).toFixed(2),
    settleFrames: frames, unsettled: !!unsettled });
  console.log(`  ${file.padEnd(34)} petal ${String(info.selected).padStart(3)}  `
    + (info.rest ? `at rest, all ${info.untouched} strips as written        `
                 : `seam ${info.seamMm.toExponential(1)} mm  moved `
                   + `${info.movedMm.toFixed(2).padStart(5)} mm  off it `
                   + `${info.untouched}/${info.offPetal}`)
    + `  ${cells[cells.length - 1].frameMs} ms  `
    + `settled in ${frames}${unsettled ? ' (NOT SETTLED)' : ''}`);
}

// THE ONE PETAL EVERY CELL IS ABOUT. petal_0 sits at azimuth 0 and is the
// longest in the file at 35.00 mm, so it is the easiest to follow from its foot
// to its tip and the one a reader can find again from cell to cell.
const SUBJECT = 0;

await chrome(false);

// --- what ships -----------------------------------------------------------
await reset({}, PLAN);
await cell('01-nothing-picked.png',
  'NOTHING PICKED, which is how a grid loads. 28 petals, 1,092 strips, 15,148 segments, all drawn '
  + 'white. A page that picked one for you would be deciding which petal the drawing is about.');
await reset({ petalPick: SUBJECT }, PLAN);
await cell('02-picked-at-rest.png',
  'PETAL_0 PICKED, NOTHING ASKED OF IT. The highlight is a HUE and nothing else: the accent is '
  + 'normalised to its own brightest channel, so a selected line tops out at exactly the level a '
  + 'white line does. That is the one signal this page cannot spend — overlapping petals already '
  + 'brighten where they cross, so a petal drawn brighter or dimmer would read as nearer or '
  + 'further. Every one of the file\'s 1,092 strips is still being drawn from the array it wrote.');
await reset({ petalPick: SUBJECT, petalHandles: true }, PLAN);
await cell('03-handles.png',
  'THE SAME, WITH THE BEND HANDLES SHOWN — two of them, at the middle of the petal and at its tip. '
  + 'They are AMBER where the stem\'s are teal, because with a drooped head the two runs can cross '
  + 'and "which one am I about to grab" is a question the picture has to answer on its own. They '
  + 'stand on the petal\'s own centre line, through the same law its points go through.');

// --- the bend -------------------------------------------------------------
await reset({ petalPick: SUBJECT }, PLAN);
await dragPetalHandle(0, 150, -110);
await set({ petalHandles: false });
await cell('04-bent.png',
  'ONE PETAL BENT, BY A REAL DRAG ON ITS MIDDLE HANDLE — 150 px across and 110 px up. The other 27 '
  + 'petals are not merely unchanged to the eye: their 1,053 strips came back as the very arrays '
  + 'the file wrote, which is an identity rather than a tolerance. The control points, the gaussian '
  + 'and the width law are plot-warp.js — the same mechanism the stem bends by, pointed at this '
  + 'petal\'s own axis rather than rewritten for it.');
await cell('05-bent-close.png',
  'THE SAME BEND, CROPPED TO THE PETAL\'S OWN MEASURED BOX, with BOTH line families on. This is the '
  + 'cell to read for internal tearing: 10 u-lines run along the petal and 29 v-lines run across it '
  + 'over one lattice, and the two hold the same 290 points. Every term of the law depends on a '
  + 'point and on its station and on nothing else, so the two copies of a shared point take the '
  + 'same displacement — measured, bit for bit, over every crossing.', await boxOf(SUBJECT));
await set({ families: 'u' });
await cell('06-bent-u-only.png',
  'THE SAME BEND, U LINES ONLY — the family the axis is measured from.', await boxOf(SUBJECT));
await set({ families: 'v' });
await cell('07-bent-v-only.png',
  'AND V LINES ONLY, same camera. The v family is the more numerous one (812 strips against 280 '
  + 'across the bundle), so a warp that reached the u lines and not these would be conspicuous — '
  + 'and easy to miss while developing with "u only" on, which is why it has its own check.',
  await boxOf(SUBJECT));

// --- stretch --------------------------------------------------------------
await reset({ petalPick: SUBJECT, petalAlong: 2.2 }, PLAN);
await cell('08-along-long.png',
  'ALONG 2.20x — a longer petal. The scale is applied to the petal\'s own CENTRE LINE, about its '
  + 'base, so the cross-sections keep their size and the petal leaves the ring from the same point '
  + 'at the same angle. Nothing else in the bloom moved.');
await reset({ petalPick: SUBJECT, petalAlong: 0.4 }, PLAN);
await cell('09-along-short.png',
  'ALONG 0.40x — the same petal, short. A stub of the same width, which is what an along scale '
  + 'that leaves the width alone has to look like.');
await reset({ petalPick: SUBJECT, petalAcross: 2.2 }, PLAN);
await cell('10-across-wide.png',
  'ACROSS 2.20x — a wider petal of the same length. The width scale acts on each point\'s offset '
  + 'from the centre line, which is the other half of the same decomposition, so the two controls '
  + 'are independent by construction rather than by tuning.');
await reset({ petalPick: SUBJECT, petalAcross: 0.4 }, PLAN);
await cell('11-across-narrow.png',
  'ACROSS 0.40x — a strap. Note the FOOT: the width scale is held over the first three rows of the '
  + 'file\'s own lattice and opens flat out of them, so the petal flares from an attachment whose '
  + 'width the junction owns. 28 petals share one ring, and a petal that widened its own foot would '
  + 'overrun its neighbours\' and move the feet the stem is built from.');
await reset({ petalPick: SUBJECT, petalAcross: 0.4 }, PLAN);
await cell('12-across-narrow-close.png',
  'THE NARROW PETAL AT ITS OWN BOX. The foot is exactly where the file put it — the base row is '
  + 'compared to the BIT, not to a tolerance — and the blade past the hold is at 0.40x.',
  await boxOf(SUBJECT));
await reset({ petalPick: SUBJECT, petalAlong: 2.2, petalAcross: 0.4 }, PLAN);
await cell('13-long-and-narrow.png',
  'ALONG 2.20x AND ACROSS 0.40x TOGETHER. Both at k would be a similarity; either alone is not, and '
  + 'this is the corner that says so.');

// --- the selection, and the rest of the bloom -----------------------------
await reset({ petalPick: SUBJECT, petalAlong: 1.9 }, PLAN);
await cell('14-one-of-twenty-eight.png',
  'ONE OF TWENTY-EIGHT, at along 1.90x. The argument this whole session is about is in the other '
  + '27: read the caption\'s "off it" number rather than the picture, because a leak into a '
  + 'neighbour that shares the ring is exactly the failure a line drawing cannot show.');
await reset({ petalPick: 14, petalAlong: 1.9 }, PLAN);
await cell('15-the-warp-follows-the-selection.png',
  'THE SAME SETTINGS ON PETAL_14. The two scales carry when you pick another petal; the BEND '
  + 'offsets do not, and rest instead — a scale means the same thing on any petal, while a bend '
  + 'offset is a world displacement in millimetres and would point the opposite way relative to a '
  + 'petal facing the other way. Petal_0 is back on the file\'s own points.');

// --- under load, with the stem --------------------------------------------
await reset({ petalPick: SUBJECT, petalAlong: 1.8, petalAcross: 1.6,
              stem: 'on', stemDroop: 45 }, SIDE);
await cell('16-with-the-stem-and-a-droop.png',
  'A STRETCHED PETAL ON A DROOPING STEM. The stem is built from the u-lines\' feet, and the petal '
  + 'law is exactly the identity at the base — so the stem does not notice a warp at all, and its '
  + 'own seam is still zero with the head turned 45°. Two seams, both measured, both zero, at the '
  + 'same ring.');
await reset({ petalPick: SUBJECT, stem: 'on', stemDroop: 45, petalHandles: true }, SIDE);
await dragPetalHandle(1, 120, 80);
await cell('17-bent-on-a-drooping-stem.png',
  'AND THE TIP HANDLE DRAGGED WITH THE HEAD ALREADY DROOPED 45°. The handle is placed through the '
  + 'droop as well as through the warp, so it stands on the blade it belongs to rather than where '
  + 'that blade used to be, and the drag is solved back through both.');

// --- the panel ------------------------------------------------------------
await reset({ petalPick: SUBJECT, petalAlong: 1.7, petalAcross: 0.6 }, PLAN);
await dragPetalHandle(0, 90, -70);
await chrome(true);
await cell('18-the-panel.png',
  'THE PANEL. The picker is a dropdown flanked by two steppers because click-picking on a bloom '
  + 'this dense is ambiguous more often than not — the numbers are in the index below. The read-out '
  + 'says what the law is doing with numbers rather than with adjectives: the axis measured along '
  + 'this petal\'s own centre line, how far down the base is held, the gaussian widths the bend '
  + 'points derived from their neighbours, the seam, and how many strips off this petal came back '
  + 'as the file\'s own arrays.');
await chrome(false);

/* --- HOW CLICK PICKING ACTUALLY BEHAVES, at two cameras --------------------
   The measurement the picker's design rests on, taken here so that every number
   quoted about it comes out of a committed tool rather than out of a header.
   Swept over the canvas with the page's own `petalDistancesAt`, which is the
   material the pick is a DECISION over — so "ambiguous" and "front vs nearest"
   are properties of the drawing, not restatements of the rule. The LOW angle is
   included because it is where the whorls overlap most and the answer is worst;
   quoting only the flattering camera would be quoting half a measurement. */
const TOLERANCES = [4, 14];   // either side of the shipped one
const probeAt = async (dir, label) => {
  await reset({}, dir);
  const r = await page.evaluate(tols => {
    const tol = window.__plot.pickTolerance();
    let probes = 0, hits = 0, ambiguous = 0, disagree = 0;
    // THE HIT RATE AT OTHER TOLERANCES COMES FREE from the same sweep, because
    // `petalDistancesAt` reports each petal's own nearest distance whatever the
    // shipped tolerance is. That is what says whether widening the tolerance is
    // the lever — and it is not: what is scarce here is INK, not reach.
    const other = tols.map(() => 0);
    for (let y = 30; y < 970; y += 20) {
      for (let x = 30; x < 970; x += 20) {
        probes++;
        const all = window.__plot.petalDistancesAt(x, y);
        tols.forEach((t, i) => { if (all.some(n => n.d <= t)) other[i]++; });
        const near = all.filter(n => n.d <= tol);
        if (!near.length) continue;
        hits++;
        if (near.length > 1) ambiguous++;
        const front = near.reduce((a, b) => (b.z < a.z ? b : a));
        const closest = near.reduce((a, b) => (b.d < a.d ? b : a));
        if (front.petal !== closest.petal) disagree++;
      }
    }
    return { tol, probes, hits, ambiguous, disagree, other };
  }, TOLERANCES);
  return { ...r, label };
};
const probe = await probeAt(HOME, 'the home framing');
const probeLow = await probeAt(LOW, 'a low angle, where the whorls overlap most');

const petalCount = (await q(() => window.__plot.petalList())).length;
const html = `<!doctype html><meta charset="utf-8"><title>/plot — petal selection and warp</title>
<style>body{background:#000;color:#c8d2d1;font:14px/1.65 "IBM Plex Mono",ui-monospace,monospace;
margin:0;padding:2rem}h1{color:#6fb7ae;font-size:1.1rem;letter-spacing:.08em}
figure{margin:0 0 2.6rem}img{max-width:100%;border:1px solid #223}
figcaption{margin-top:.6rem;max-width:62rem}.n{color:#6fb7ae}.m{color:#96a2a1}
.head{max-width:62rem;margin-bottom:2.4rem}</style>
<h1>/plot — one petal, picked and deformed</h1>
<div class="head">
<p>Every canvas cell has the two control panels hidden. Every bend is a real pointer drag on a
handle the page itself projected to the screen. The close cells are cropped to the petal's own
measured on-screen box, never to a fixed rectangle. No pixel delta is quoted anywhere: the
renderer is not deterministic between page sessions, so a pixel figure would need its own
same-tree control and none of these cells needs one — each settles instead until two consecutive
frames are byte-identical.</p>
<p><b class="n">The three numbers under every cell are the argument.</b>
<b class="n">seam</b> is the largest movement of any point the file placed at u&nbsp;=&nbsp;0 — the
petal's base is shared with the attachment ring the inferred stem hangs from, so zero there is what
keeps the drawing one plant. <b class="n">moved</b> is how far this petal actually travelled.
<b class="n">off&nbsp;it</b> is how many strips on the other ${petalCount - 1} petals came back as
the very arrays the file wrote — an array identity, so a strip that shifted by a millionth of a
millimetre would fail it where a tolerance would not.</p>
<p><b class="n">Why the picker is a list first and a click second, measured on this bloom with
the shipped ${probe.tol}&nbsp;px tolerance:</b></p>
<table style="border-collapse:collapse;margin:0 0 1rem"><tr style="color:#6fb7ae">
<th style="text-align:left;padding-right:2rem">camera</th>
<th style="text-align:right;padding-right:2rem">any line in reach</th>
<th style="text-align:right;padding-right:2rem">2+ petals in reach</th>
<th style="text-align:right">front &ne; nearest</th></tr>
${[probe, probeLow].map(r => `<tr><td style="padding-right:2rem">${r.label}</td>
<td style="text-align:right;padding-right:2rem">${(100 * r.hits / r.probes).toFixed(1)}%</td>
<td style="text-align:right;padding-right:2rem">${(100 * r.ambiguous / r.hits).toFixed(1)}%</td>
<td style="text-align:right">${(100 * r.disagree / r.hits).toFixed(1)}%</td></tr>`).join('')}
</table>
<p>Of ${probe.probes} probes across the canvas, only a fifth have any line within reach of a click
at all; of the ones that do, most have two or more petals in reach, and better than a third are
ones where "nearest line on screen" and "front-most line" name DIFFERENT petals. So the click takes
the front-most — with depth testing off every line is drawn, and the front petal is the one the eye
means — and it is offered as a convenience over a control you can rely on.</p>
<p><b class="n">And widening the tolerance is not the lever</b>, because what is scarce is ink and
not reach: at the home framing a click finds a line at
${TOLERANCES.map((t, i) => `<b>${(100 * probe.other[i] / probe.probes).toFixed(1)}%</b> of pixels
at ${t}&nbsp;px`).join(' and ')}, against
<b>${(100 * probe.hits / probe.probes).toFixed(1)}%</b> at the shipped ${probe.tol}&nbsp;px — a
range of a few points across a factor of three and a half in radius.</p>
</div>
${cells.map(c => `<figure><img src="${c.file}" alt="${c.file}">
<figcaption><b class="n">${c.file}</b><br>${c.caption}
<br><span class="m">petal ${c.info.selected < 0 ? 'none' : c.info.selected}
${c.info.selected >= 0 && c.frame ? `· axis ${c.frame.length.toFixed(2)} mm · hold ${c.frame.hold.toFixed(2)} mm (${c.frame.holdRows} rows)` : ''}
· along ${c.petal.along.toFixed(2)}x · across ${c.petal.across.toFixed(2)}x
· bends ${c.bends.length}${c.info.bendsRest ? ' at rest' : ' displaced'}
<br>${c.info.rest
  ? `at rest — all ${c.info.untouched} of the file's strips are the arrays it wrote`
  : `seam ${c.info.seamMm.toExponential(1)} mm · moved ${c.info.movedMm.toFixed(2)} mm`
    + ` · off it ${c.info.untouched} of the ${c.info.offPetal} strips on the other petals untouched`}
· lines ${c.ui.families} · ${c.drawn.total} segments drawn
· ${c.frameMs} ms/frame · settled in ${c.settleFrames} frames${c.unsettled ? ' (NOT SETTLED)' : ''}</span>
</figcaption></figure>`).join('\n')}
<p class="m">page errors: ${errs.length ? errs.join(' | ') : 'none'}</p>`;
writeFileSync(path.join(OUT, 'index.html'), html);

console.log(`\n${cells.length} cells -> ${path.join(OUT, 'index.html')}`);
for (const r of [probe, probeLow]) {
  console.log(`click picking, ${r.label}: ${r.hits} of ${r.probes} probes hit at ${r.tol} px `
    + `(${(100 * r.hits / r.probes).toFixed(1)}%); `
    + `${(100 * r.ambiguous / r.hits).toFixed(1)}% ambiguous, `
    + `${(100 * r.disagree / r.hits).toFixed(1)}% front-vs-nearest disagreement; `
    + `hit rate ${TOLERANCES.map((t, i) =>
        `${(100 * r.other[i] / r.probes).toFixed(1)}% at ${t} px`).join(', ')}`);
}
console.log('page errors:', errs.length ? errs : 'none');
const unsettled = cells.filter(c => c.unsettled).map(c => c.file);
if (unsettled.length) console.log('DID NOT SETTLE:', unsettled.join(', '));
await browser.close();
server.close();
