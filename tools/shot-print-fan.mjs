// Contact sheet for the FAN — strokes that converge at a part's base, spread
// toward its tip, and curve with the shape.
//
//   node tools/shot-print-fan.mjs <dir> [base-tree]
//
// THIS SHEET IS NOT THE REVIEW GATE THIS TIME, and that is deliberate. Three
// sessions in a row built a shading field from a verbal description, produced
// a contact sheet, and missed; the field's parameters are now LIVE CONTROLS on
// the page with a debug view that draws the field itself, and the review is
// Eva tuning it on the deploy preview. The sheet exists to say what was built,
// to fix the numbers, and — with a `base-tree` — to render the BEFORE/AFTER
// pair against #163 from a real worktree of that commit rather than a
// remembered one.
//
// What it photographs, in the order the argument runs:
//
//   * THE LEAF, fanned, beside #163's shape-derived CROSS-HATCH on the same
//     leaf at the same camera. One of them alone is a picture; the pair is the
//     argument, because "the strokes are not parallel" is only visible against
//     strokes that are.
//   * THE FIELD ITSELF, drawn: the axis, the measured centre line, the origin
//     bar, the termination boundary and every inserted ray's birth. This is
//     the cell that makes the rest arguable.
//   * THE CONVERGE SWEEP — the session's one real design question, as the
//     three readings of it: uniform density, the shipped middle, and a fixed
//     pencil. The captions carry the MEASURED ink density base-to-tip, so the
//     claim "convergence is the gradient" is a number on the sheet.
//   * THE SPACING, THE ORIGIN BAR AND THE TIP, each as a pair.
//   * THE STEM, whose "base" is the bloom junction at the top — a defensible
//     reading of where a part meets the rest of the plant, and not the
//     botanical one. Photographed, not tuned.
//   * THE FUSED BLOOM, UNRETOUCHED. One solid, so ONE origin and one fan for
//     the entire flower over a radial blob. Per-petal fans are blocked on
//     multi-part export.
//
// The reference drawings are not in this repo; hold them beside the sheet.

import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2];
const BASE_TREE = process.argv[3] || null;
if (!OUT) { console.error('usage: node tools/shot-print-fan.mjs <dir> [base-tree]'); process.exit(2); }
mkdirSync(OUT, { recursive: true });

// A worktree of the base commit, served instead of the working tree, so a
// before/after pair is a real render of the old code. Same construction the
// line-art and curl sheets use.
let WORKTREE = null;
if (BASE_TREE) {
  WORKTREE = path.join(ROOT, `.fan-sheet-base-${process.pid}`);
  try { rmSync(WORKTREE, { recursive: true, force: true }); } catch {}
  execFileSync('git', ['worktree', 'add', '--detach', WORKTREE, BASE_TREE], { cwd: ROOT, stdio: 'inherit' });
}
let SERVE = ROOT;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png' };
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/print') p = '/print.html';
  // assets always come from the working tree — the bundle is the same file and
  // a worktree checkout of a 1.9 MB binary is not what is under test.
  const root = p.startsWith('/assets/') || p.startsWith('/node_modules/') ? ROOT : SERVE;
  const f = path.join(root, p);
  if (!f.startsWith(root) || !existsSync(f)) { r.writeHead(404); return r.end('nf'); }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  r.end(readFileSync(f));
});
await new Promise(r => server.listen(0, r));
const PORT = server.address().port;

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

async function boot() {
  await page.goto(`http://127.0.0.1:${PORT}/print`);
  await page.waitForFunction(() => window.__printScaffold && window.__printScaffold.ready, { timeout: 60000 });
  await settle(1200);
  await page.setInputFiles('#bundleFile', {
    name: 'bloom-stem-leaf-bundle.glb', mimeType: 'model/gltf-binary',
    buffer: readFileSync(path.join(ROOT, 'assets/print-test/bloom-stem-leaf-bundle.glb')),
  });
  await page.waitForFunction(
    () => window.__printScaffold && window.__printScaffold.source === 'bloom-stem-leaf-bundle.glb',
    { timeout: 180000 });
  await page.waitForFunction(() => !!window.__printInfill, { timeout: 180000 });
  await settle(3000);
  await call(() => { window.__printLineArt.setDetailWidget(14); window.__printLineArt.setWeightWidget(1.2); });
  await call(() => { const b = document.getElementById('showAnchors'); b.checked = false;
                     b.dispatchEvent(new Event('change')); });
}
await boot();

const NAMES = await call(() => window.__printInfill.partNames());
const LEAF = NAMES.indexOf('leaf'), STEM = NAMES.indexOf('stem'), BLOOM = NAMES.indexOf('bloom');
console.log(`parts: ${NAMES.join(', ')}`);

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

// The leaf is a flat-ish solid; looked at from the side it is a sliver and no
// fan is legible on it. This looks down its THINNEST bbox dimension.
const LEAF_VIEW = [0, 0, 1.7];
const cells = [];

const set = async (id, v) => { await call(([i, x]) => window.__printInfill.setWidget(i, x), [id, v]); };
const dark = async (i, v) => { await call(([k, x]) => window.__printInfill.setDarknessWidget(k, x), [i, v]); };
const mode = async (m) => { await call(x => window.__printInfill.setMode(x), m); await settle(); };
const field = async (on) => { await call(x => window.__printInfill.setFanDebug(x), on); await settle(400); };
const view = async (name, mul) => {
  const box = await call(n => window.__printScaffold.partBox(n), name);
  if (!box) return;
  const c = box.min.map((v, i) => (v + box.max[i]) / 2);
  const r = Math.max(...box.max.map((v, i) => v - box.min[i]));
  await call(([p, t]) => window.__printScaffold.setView(p, t),
    [[c[0] + r * mul[0], c[1] + r * mul[1], c[2] + r * mul[2]], c]);
  await settle();
};

// The crop is measured ONCE, from the part's own projected silhouette while
// the stage is drawing, and reused — never hardcoded.
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
  const m = await call(() => window.__printInfill.mode());
  const p = extra.part !== undefined && st ? st.parts[extra.part] : null;
  const fan = p && p.fan ? p.fan : null;
  const den = fan ? fan.bins.map((b, k) => (fan.area[k] > 1 ? b / fan.area[k] : 0)) : null;
  const ratio = den
    ? (den.slice(-3, -1).reduce((a, b) => a + b, 0) > 0
      ? den.slice(0, 2).reduce((a, b) => a + b, 0) / den.slice(-3, -1).reduce((a, b) => a + b, 0) : null)
    : null;
  cells.push({ file, caption, mode: m,
    fanSpacing: opts.fanSpacing, fanConverge: opts.fanConverge, fanOrigin: opts.fanOrigin,
    fanInset: opts.fanInset, fanTipReach: opts.fanTipReach, fanTipJitter: opts.fanTipJitter,
    fanDebug: opts.fanDebug, spacing: opts.spacing, direction: opts.direction,
    rays: fan ? fan.rays : null, levels: fan ? fan.levels : null,
    gaps: fan ? fan.gaps.map(g => `${(g.frac * 100) | 0}%: ${g.n} rays ${g.median.toFixed(1)} px`) : null,
    density: den ? den.map(v => +v.toFixed(3)) : null,
    baseTip: ratio !== null ? +ratio.toFixed(2) : null,
    axis: p && p.axis ? { angleDeg: +p.axis.angleDeg.toFixed(1), lengthPx: Math.round(p.axis.lengthPx),
      basis: p.axis.basis, bendPx: +p.axis.warpDeviationPx.toFixed(1) } : null,
    segments: st ? st.segments : 0, frameMs: st ? +st.frameMs.toFixed(1) : 0, ...extra });
  console.log(`  ${file.padEnd(36)} ${String(m).padEnd(5)} ${st ? st.segments : 0} segs  `
    + `${st ? st.frameMs.toFixed(0) : '?'} ms  ${caption.slice(0, 62)}`);
  await openAll();
}

// ===========================================================================
// THE LEAF — the review target.
console.log('\n--- the leaf: the fan, against the parallel families it replaces ---');
await view('leaf', LEAF_VIEW);
await mode('fan');
// THE OTHER TWO PARTS ARE TURNED DOWN FOR EVERY LEAF CELL, and every caption
// says so. At this camera the stem runs edge-on straight across the leaf's
// crop, and its own fan — correct, and drawn — is indistinguishable from the
// leaf's until you know it is there. The stem and the bloom get their own
// cells further down.
await dark(STEM, 0); await dark(BLOOM, 0);
await settle(1200);
const CLIP = await clipFor(LEAF);

await cell('01-leaf-fan', CLIP,
  'THE FAN at the shipped defaults, with the stem and bloom turned down to 0 so the leaf is the '
  + 'only thing drawn. Rays leave the origin bar at the base, spread with the '
  + 'shape\'s own measured width, and stop short of the tip. No two strokes are parallel.',
  { part: LEAF });

await field(true);
await cell('02-leaf-the-field', CLIP,
  'THE FIELD ITSELF, in teal over the same ink: the derived axis base->tip, the measured centre '
  + 'line the rays are offsets from, the origin bar they leave, the ragged termination boundary, '
  + 'and a tick at each inserted ray\'s birth. This is the cell that makes the rest arguable.',
  { part: LEAF });
await field(false);

await mode('hatch');
await call(() => window.__printInfill.setDirection('axis'));
await set('layers', 1); await set('spacing', 7);
// Cross-hatch clips to the ANCHOR's tone field as well as to the outline, and
// at the shipped 85% reach that leaves 78 segments on this leaf — a comparison
// against almost no ink is not a comparison. Opened up so the two pictures are
// both pictures.
await set('reach', 200);
await settle();
await cell('03-leaf-163-cross-hatch', CLIP,
  '#163 ON THE SAME LEAF AT THE SAME CAMERA — one layer of shape-derived cross-hatch. Every '
  + 'stroke runs the same direction as every other stroke. This is the picture that was rejected, '
  + 'and the pair is the argument.',
  { part: LEAF });
await mode('flow');
await call(() => window.__printInfill.setWidget('curvature', -100));
await settle();
await cell('04-leaf-157-radial-flow', CLIP,
  '#157\'s LINE-FLOW at curvature -100 — the nearest thing that already shipped: rays radiating '
  + 'from the ANCHOR at the centroid. Straight lines from a point, seeded on a bounding-box grid, '
  + 'with no knowledge of the shape. Checked before the fan was built, and this is why it is not '
  + 'a setting on this family.',
  { part: LEAF });
await set('reach', 85);
await mode('fan');
await settle();

// --- the converge sweep: the session's one real design question ------------
// AND A CAVEAT THE SHEET OWES ITS READER: on THIS leaf the three cells look
// very alike, because the target-spacing law only differs where the shape's
// width does, and that is the first few percent of a blade this long. The
// difference is real and is in the caption as a NUMBER — the measured ink
// density base-to-tip — not in a picture at this crop. Somewhere with a
// broader base it is a picture.
console.log('\n--- converge: the trade, as its three readings ---');
for (const [n, cv, note] of [
  ['05-converge-000', 0, 'CONVERGE 0 — the target spacing is constant along the length, so rays are '
    + 'inserted as the leaf widens and the density is uniform. Convergence stops being a gradient.'],
  ['06-converge-055', 55, 'CONVERGE 55 — the shipped default, and a starting point for tuning rather '
    + 'than a ruling.'],
  ['07-converge-100', 100, 'CONVERGE 100 — the target is proportional to the width, so the ray set is '
    + 'fixed and the whole pencil crowds into the base. Dark base for free; a wide tip as the price.'],
]) {
  await set('fanConverge', cv);
  await settle();
  await cell(n, CLIP, note, { part: LEAF });
}
await set('fanConverge', 55);

// --- the other levers, each as a pair --------------------------------------
console.log('\n--- the levers ---');
for (const [n, id, v, note] of [
  ['08-spacing-4', 'fanSpacing', 4, 'SPACING 4 px — the target gap. Insertion goes deeper to hold it.'],
  ['09-spacing-20', 'fanSpacing', 20, 'SPACING 20 px — and levels drop out rather than the gaps opening.'],
  ['10-origin-0', 'fanOrigin', 0, 'ORIGIN 0 — no floor on the half-width. A FLOOR only acts where the '
    + 'part is narrower than it, so on a blunt base this cell and the next may be identical; the '
    + 'read-out says at how many stations it is binding.'],
  ['11-origin-16', 'fanOrigin', 16, 'ORIGIN 16 px — a 32 px bar at the base instead of a point.'],
  ['12-tip-40', 'fanTipReach', 40, 'TIP REACH 40% — strokes stop well short and the tip is left light.'],
  ['13-tip-100', 'fanTipReach', 100, 'TIP REACH 100% — every ray runs to the end. The re-convergence at '
    + 'a pointed tip is what the default 88% is avoiding.'],
  ['14-ragged-0', 'fanTipJitter', 0, 'TIP RAGGED 0 — every stroke ends on the same station, and the '
    + 'boundary reads as a machined arc. The same argument `jitter` makes for the tonal layers.'],
]) {
  await set(id, v);
  await settle();
  await cell(n, CLIP, note, { part: LEAF });
  await set(id, { fanSpacing: 9, fanOrigin: 3, fanTipReach: 88, fanTipJitter: 35 }[id]);
}
await settle();

// --- per-part contrast ------------------------------------------------------
await dark(LEAF, 45);
await settle();
await cell('15-darkness-45', CLIP,
  'PER-PART DARKNESS 45% — in a family whose tone IS line density, "how dark is this part" is its '
  + 'target spacing. It is also the lever that takes a bloom filling the viewport out of the frame '
  + 'time.', { part: LEAF });
await dark(LEAF, 100);
await settle();

// --- the stem ----------------------------------------------------------------
console.log('\n--- the stem, and the fused bloom ---');
await dark(STEM, 100); await dark(BLOOM, 100);
await view('stem', [1.4, 0, 1.4]);
await settle();
await cell('16-stem', () => clipFor(STEM, 40),
  'THE STEM. Its attachment is the nearest point to any other part, which on this bundle is the '
  + 'BLOOM JUNCTION at the top — so the fan converges there and not at the cut end. A defensible '
  + 'reading of "where this part meets the rest of the plant", and not the botanical one. Stated '
  + 'rather than tuned, exactly as #163 left it.', { part: STEM });

await view('bloom', [0, 0, 2.0]);
await settle();
await cell('17-bloom', () => clipFor(BLOOM, 30),
  'THE FUSED BLOOM, UNRETOUCHED. It is one solid: no interior petal boundaries exist in the data, '
  + 'so the fan gets ONE origin and one centre line for the entire flower and runs its rays across '
  + 'a radial blob. THE BLOOM CANNOT PASS THIS TEST. Per-petal fans are blocked on multi-part '
  + 'export; this is photographed, not tuned around.', { part: BLOOM });
await field(true);
await cell('18-bloom-the-field', () => clipFor(BLOOM, 30),
  'and the same thing with the field drawn, which is the clearest statement of the limit: one axis, '
  + 'one origin bar, one termination boundary, for forty petals.', { part: BLOOM });
await field(false);

// --- the panel ---------------------------------------------------------------
await view('leaf', LEAF_VIEW);
await settle();
await call(() => { document.getElementById('print-infill').open = true;
                   document.getElementById('print-debug').open = false;
                   document.getElementById('print-pose').open = false;
                   document.getElementById('print-stylize').open = false; });
await settle(500);
{
  const box = await page.locator('#print-infill').boundingBox();
  await page.screenshot({ path: path.join(OUT, '19-panel.png'),
    clip: { x: Math.max(0, box.x - 6), y: Math.max(0, box.y - 6),
      width: Math.min(VIEW.w, box.width + 12), height: Math.min(VIEW.h - box.y, box.height + 12) } });
  cells.push({ file: '19-panel.png', mode: 'fan',
    caption: 'THE PANEL. Six live controls and the field toggle; the direction select, the anchor '
      + 'block with its reach and falloff, the global angle and #163\'s axial ramp are all DOWN, '
      + 'because none of them decides anything in this family. The read-out says what the field is '
      + 'doing, including the measured ink density base-to-tip and the measured gaps between '
      + 'neighbouring rays — the two numbers the design is arguable on.' });
}

const readout = await call(() => window.__printInfill.infillText());

// ===========================================================================
if (WORKTREE) {
  console.log('\n--- the before/after pair, rendered from the base tree ---');
  SERVE = WORKTREE;
  await boot();
  await view('leaf', LEAF_VIEW);
  await call(() => window.__printInfill.setMode('hatch'));
  await call(() => window.__printInfill.setDirection('axis'));
  await call(([i, x]) => window.__printInfill.setWidget(i, x), ['layers', 1]);
  await call(([i, x]) => window.__printInfill.setWidget(i, x), ['spacing', 7]);
  await call(([i, x]) => window.__printInfill.setWidget(i, x), ['reach', 200]);
  await call(([k, x]) => window.__printInfill.setDarknessWidget(k, x), [STEM, 0]);
  await call(([k, x]) => window.__printInfill.setDarknessWidget(k, x), [BLOOM, 0]);
  await settle(1200);
  await cell('20-before-base-tree', await clipFor(LEAF),
    `BEFORE — the same leaf and the same camera, rendered from a git worktree of ${BASE_TREE}. `
    + 'A real render of the old code, not a remembered one.', { part: LEAF, baseTree: BASE_TREE });
  SERVE = ROOT;
}

writeFileSync(path.join(OUT, 'cells.json'), JSON.stringify({
  bundle: 'bloom-stem-leaf-bundle.glb', parts: NAMES, baseTree: BASE_TREE,
  infillReadout: readout, pageErrors: errs, cells,
}, null, 2));

const esc = (t) => String(t).replace(/[<>&]/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[ch]));
const SECTIONS = [
  ['the leaf — the fan, against the parallel families it does not replace', 0, 4],
  ['converge — the one real design question, as its three readings', 4, 7],
  ['the levers', 7, 14],
  ['per-part contrast', 14, 15],
  ['the stem, and the fused bloom', 15, 18],
  ['the panel', 18, 19],
  ['before / after', 19, 20],
];
const html = `<!doctype html><meta charset="utf-8"><title>print fan shading — contact sheet</title>
<style>body{margin:0;background:#0c0e0e;color:#d8dedd;font:13px/1.6 ui-monospace,monospace;padding:2rem;max-width:1100px}
h1{color:#6fb7ae;font-size:1rem;letter-spacing:.08em}h2{color:#e0a03a;font-size:.85rem;margin:2.5rem 0 .5rem;letter-spacing:.06em}
figure{margin:0 0 1.6rem}img{max-width:100%;border:1px solid #2b3333;display:block;background:#f2f0ea}
figcaption{color:#96a2a1;padding:.5rem 0}b{color:#c8d2d1}
p.note{color:#96a2a1;border-left:2px solid #e0a03a;padding-left:.8rem}
pre{white-space:pre-wrap;color:#96a2a1;border:1px solid #222a2a;padding:.8rem}</style>
<h1>/print — the fan</h1>
<p>Strokes that converge at a part's base, spread toward its tip, and curve with the shape. A ray is a curve of
CONSTANT NORMALISED OFFSET in the part's own (station, offset) frame — its offset is a fraction of the
half-width MEASURED at that station — so it converges, spreads and stays inside the outline because the shape
does. Bundle: <b>bloom-stem-leaf-bundle.glb</b> — parts ${NAMES.map(n => `<b>${esc(n)}</b>`).join(', ')}.</p>
<p class="note">THE REVIEW GATE IS NOT THIS SHEET. The field's six parameters are live controls on the page and
the debug view draws the field itself — tune it on the deploy preview. This sheet says what was built and
fixes the numbers. The reference drawings are not in the repo; hold them beside it.</p>
<p class="note">A caveat the converge cells owe you: on THIS leaf they look very alike, because the
target-spacing law only differs where the shape's width does and that is the first few percent of a
blade this long. The difference is real and is the MEASURED ink density base-to-tip in each caption,
not something this crop can show.</p>
${SECTIONS.map(([title, a, b]) => {
  const sel = cells.slice(a, b);
  if (!sel.length) return '';
  return `<h2>${title}</h2>` + sel.map(c =>
    `<figure><img src="${c.file}"><figcaption><b>${c.file}</b> — ${esc(c.caption)}`
    + `<br>family <b>${esc(c.mode)}</b>`
    + (c.mode === 'fan' ? `, spacing ${c.fanSpacing} px, converge ${c.fanConverge}%, origin `
        + `${c.fanOrigin} px, inset ${c.fanInset}%, tip ${c.fanTipReach}% ragged ${c.fanTipJitter}%`
        + (c.fanDebug ? ', FIELD DRAWN' : '') : `, spacing ${c.spacing} px, direction ${esc(String(c.direction))}`)
    + (c.rays !== null && c.rays !== undefined ? `<br>${c.rays} rays to level ${c.levels}` : '')
    + (c.gaps ? `<br>measured gaps — ${c.gaps.map(esc).join(' · ')}` : '')
    + (c.baseTip !== null && c.baseTip !== undefined
        ? `<br>ink density base/tip <b>${c.baseTip}x</b> — [${(c.density || []).join(', ')}]` : '')
    + (c.axis ? `<br>derived axis ${c.axis.angleDeg}°, ${c.axis.lengthPx} px long, base from the `
        + `${esc(c.axis.basis)}; centre line bends ${c.axis.bendPx} px` : '')
    + (c.segments ? `<br>${c.segments} segments, ${c.frameMs} ms` : '')
    + `</figcaption></figure>`).join('\n');
}).join('\n')}
<h2>the read-out, as the page prints it</h2><pre>${esc(readout)}</pre>`;
writeFileSync(path.join(OUT, 'index.html'), html);

console.log(`\n${cells.length} cells -> ${OUT}`);
console.log('page errors:', errs.length ? errs : 'none');
await browser.close();
server.close();
if (WORKTREE) {
  try { execFileSync('git', ['worktree', 'remove', '--force', WORKTREE], { cwd: ROOT, stdio: 'inherit' }); }
  catch { try { rmSync(WORKTREE, { recursive: true, force: true }); } catch {} }
}
