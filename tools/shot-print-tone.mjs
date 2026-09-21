// Contact sheet for the TONAL FILL family.
//
//   node tools/shot-print-tone.mjs <dir>
//
// The review this sheet is for is a comparison against reference drawings whose
// tone is FILLED MASS: leaves that are solid black shapes with their veins left
// as white lines through the ink, light petals with dark cores, and depth that
// comes from a dark shape sitting next to a light one. Those references are not
// in this repo, so the sheet cannot put them side by side — hold them beside it.
// What it can do is photograph each of the three things the family claims, on
// geometry where the claim is decidable:
//
//   * SOLID FILL and RESERVED VEINS on a genuinely SEPARATE LEAF. This is the
//     row #157 could not shoot: the old bundle's leaves are part of the stem
//     solid, so that sheet's "leaf" cells were the stem part framed on a leaf.
//     bloom-stem-leaf-bundle.glb has the leaf as its own node and mesh, and it
//     is loaded here through the page's real file input.
//   * TONAL CONTRAST between two real parts, BOTH WAYS ROUND — leaf dark
//     against light stem, then the reverse. One of them alone is a picture; the
//     pair is the argument, because it shows the tone is authored per part and
//     not a property of what the geometry happens to be.
//   * THE LIMIT, photographed rather than tuned around: the bloom is one fused
//     solid, so it fills as ONE shape. The reference's petal-against-petal
//     contrast is not reachable on either bundle here and is blocked on
//     multi-part export, not on this stage.
//
// Every caption's numbers are read back from the page's own read-out and stats,
// never from what this script asked for, and every crop is measured from the
// part's own projected silhouette rather than hardcoded.

import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2];
if (!OUT) { console.error('usage: node tools/shot-print-tone.mjs <dir>'); process.exit(2); }
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
// 2x, for the reason the infill sheet gives: at 1x a reserved 3 px vein and a
// smudge are the same grey.
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

// The separate-leaf bundle, through the page's own file input — the same path
// a hand takes, not a synthesized state hook.
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

// A quieter outline than the shipped default, so the FILL is what the eye
// reads. Stated in the manifest, because it is a setting, not the default.
await call(() => { window.__printLineArt.setDetailWidget(14); window.__printLineArt.setWeightWidget(1.2); });
// The anchor rings are a CONTROL, not part of the drawing, and one sitting on a
// solid black leaf reads as a defect in it.
await call(() => { const b = document.getElementById('showAnchors'); b.checked = false;
                   b.dispatchEvent(new Event('change')); });

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
  const file = `${name}.png`;
  const clip = typeof clipSrc === 'function' ? await clipSrc() : clipSrc;
  await page.screenshot(clip ? { path: path.join(OUT, file), clip } : { path: path.join(OUT, file) });
  const st = await call(() => window.__printInfill.stats());
  const opts = await call(() => window.__printInfill.options());
  const mode = await call(() => window.__printInfill.mode());
  const parts = st ? st.parts.map(p => `${p.name} ${p.darkness.toFixed(0)}% / ${p.segments} segs`).join(' · ') : '';
  cells.push({ file, caption, mode, opts, parts,
    segments: st ? st.segments : 0, rows: st ? st.seeds : 0,
    frameMs: st ? +st.frameMs.toFixed(1) : 0, ...extra });
  console.log(`  ${file.padEnd(36)} ${mode.padEnd(5)} ${st ? st.segments : 0} segs  ${caption}`);
  await openAll();
}

const set = async (id, v) => { await call(([i, x]) => window.__printInfill.setWidget(i, x), [id, v]); };
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
// THE LEAF — the row this session exists for.
console.log('\n--- the separate leaf ---');
await view('leaf', [0.25, -1.5, 0.25]);
await mode('off');
await cell('01-leaf-lines-only', () => clipFor(LEAF),
  'the leaf, line art alone — the control for every cell below. Its own node and its own mesh, '
  + 'not a lobe of the stem solid');

await mode('tone');
await set('gradient', 0); await set('veinWidth', 0); await set('fillWeight', 1.1);
await dark(LEAF, 100); await dark(STEM, 100); await dark(BLOOM, 100);
await settle();
await cell('02-leaf-solid', () => clipFor(LEAF),
  'SOLID FILL. The whole silhouette inked, out to the outline — the reference leaf, and the default');

await set('veins', 4); await set('veinWidth', 4); await settle();
await cell('03-leaf-veins-reserved', () => clipFor(LEAF),
  'RESERVED VEINS, 4 px. The veins are UNFILLED PAPER cut out of the ink, not strokes drawn over it — '
  + 'a midrib snapped to the shape\'s own medial line, laterals scaled by the measured half-width on their side');
await set('veinWidth', 8); await settle();
await cell('04-leaf-veins-wide', () => clipFor(LEAF), 'the same veins at 8 px — the width is what is withheld');
await set('veins', 8); await set('veinWidth', 3.5); await settle();
await cell('05-leaf-veins-many', () => clipFor(LEAF), '8 lateral pairs at 3.5 px');
await set('veins', 0); await settle();
await cell('06-leaf-midrib-only', () => clipFor(LEAF), '0 pairs — the midrib alone');
await set('veins', 4); await set('veinWidth', 4); await settle();

await set('gradient', 60); await set('reach', 90); await settle();
await cell('07-leaf-graded', () => clipFor(LEAF),
  'GRADIENT 60% — the same fill ramped away from the part\'s own anchor, by an ordered dither on the rows. '
  + 'Every threshold is a circle, so the ramp costs an interval clip and nothing else');
await set('gradient', 100); await settle();
await cell('08-leaf-graded-full', () => clipFor(LEAF), 'gradient 100% — the ink is only where the tone field is');
await set('gradient', 0); await settle();

await set('fillWeight', 3.0); await settle();
await cell('09-leaf-fat-nib', () => clipFor(LEAF),
  'the NIB at 3.0 px. Rows are laid at 0.80 x the nib, so a fatter nib is the same solid shape in a third '
  + 'of the rows — the mark and the cost are one control');
await set('fillWeight', 1.1); await settle();

// ===========================================================================
// TONAL CONTRAST — two real parts, both ways round.
console.log('\n--- tonal contrast, two real parts ---');
await view('leaf', [0.9, -2.6, 0.9]);
// The LEAF's box, opened out far enough that the stem beside it is in shot.
// NOT the union of the two: the stem runs the whole length of the scene, so a
// union crop is the entire viewport with the two shapes lost in the middle of
// it, and the point of these cells is the pair read together.
const PAIR = async (grow = 0.75) => {
  const a = await call(i => window.__printInfill.frame(i), LEAF);
  const w = a.maxX - a.minX, h = a.maxY - a.minY;
  const px = w * grow, py = h * grow * 0.25;
  const x = Math.max(0, Math.floor(a.minX - px)), y = Math.max(0, Math.floor(a.minY - py));
  return { x, y,
    width: Math.max(32, Math.min(VIEW.w - x, Math.ceil(w + px * 2))),
    height: Math.max(32, Math.min(VIEW.h - y, Math.ceil(h + py * 2))) };
};
await dark(BLOOM, 0);
await dark(LEAF, 100); await dark(STEM, 0); await settle();
await cell('10-contrast-leaf-dark', PAIR,
  'LEAF DARK, STEM LIGHT. The stem keeps its outline — a part at 0% is drawn, just not filled — '
  + 'and the depth is the contrast between two adjacent shapes, which is exactly what the reference does');
await dark(LEAF, 0); await dark(STEM, 100); await settle();
await cell('11-contrast-stem-dark', PAIR,
  'THE SAME TWO PARTS, REVERSED. Nothing about the geometry changed; the tone is authored per part '
  + 'and this pair is the argument that it is');
await dark(LEAF, 100); await dark(STEM, 45); await settle();
await cell('12-contrast-midtone', PAIR,
  'leaf 100%, stem 45% — darkness is a ramp, not a switch: at 45% the ordered dither draws roughly '
  + 'half the rows and the stem reads as a mid grey');
await dark(STEM, 0); await settle();

// THE VOCABULARY ROW — CROSS-HATCH AND LINE-FLOW ON THIS LEAF — IS NOT SHOT,
// and the reason is measured rather than a preference. At the zoom these leaf
// cells need, the 301,152-triangle bloom fills the viewport behind the leaf,
// and LINE-FLOW there seeds its whole bounding box and tests every integration
// step against that part's 45,000-edge index: it ran for over ten minutes on
// one cell before this row was cut. Tonal fill survives the same view at ~1.3 s
// (see the cost table in print-infill.js) because it is a scanline and not a
// per-point walk. Hatch and flow were out of scope for this session anyway, and
// their own sheet is `tools/shot-print-infill.mjs`, on the smaller bundle.

// ===========================================================================
// THE LIMIT, photographed.
console.log('\n--- the fused bloom ---');
await view('bloom', [0.1, -1.35, 0.35]);
await dark(BLOOM, 100); await settle();
await cell('13-bloom-one-shape', () => clipFor(BLOOM),
  'THE BLOOM IS ONE FUSED SOLID, so it fills as ONE shape. This is the limit, not a tuning problem: '
  + 'the reference\'s petal-against-petal contrast needs per-petal solids and is blocked on multi-part export');
await set('gradient', 85); await set('reach', 70); await settle();
await cell('14-bloom-graded', () => clipFor(BLOOM),
  'the fused bloom graded from its anchor — the most the tone field can say about a shape with no '
  + 'petal-level granularity to say it about');
await set('gradient', 0); await settle();

// ===========================================================================
console.log('\n--- the whole plant, and the panel ---');
await view('stem', [0.35, -1.25, 0.15]);
await dark(LEAF, 100); await dark(STEM, 35); await dark(BLOOM, 0); await settle();
await cell('15-whole-plant', null,
  'the whole plant: leaf solid, stem a mid tone, bloom left as outline — three parts, three tones, one control each');

await mode('tone'); await settle();
await openAll();
await page.screenshot({ path: path.join(OUT, '16-panel.png') });
cells.push({ file: '19-panel.png', mode: 'tone',
  caption: 'the INFILL panel in the tonal family: gradient, veins, reserve width, nib, and ONE DARKNESS ROW '
    + 'PER PART, built from the bundle that is loaded' });

const readout = await call(() => window.__printInfill.infillText());

writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({
  generated: new Date().toISOString(),
  bundle: 'assets/print-test/bloom-stem-leaf-bundle.glb',
  parts: NAMES,
  note: 'outline set to detail 14 / weight 1.2 for every cell, so the FILL is what the eye reads',
  reference: 'the reference drawings are not in this repo — hold them beside the sheet',
  infillReadout: readout, pageErrors: errs, cells,
}, null, 2));

const esc = (t) => String(t).replace(/[<>&]/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[ch]));
const SECTIONS = [
  ['the separate leaf — solid fill, reserved veins, the gradient, the nib', 0, 9],
  ['tonal contrast between two real parts', 9, 12],
  ['the fused bloom — the limit, photographed', 12, 14],
  ['the whole plant, and the panel', 14, 16],
];
const html = `<!doctype html><meta charset="utf-8"><title>print tonal fill — contact sheet</title>
<style>body{margin:0;background:#0c0e0e;color:#d8dedd;font:13px/1.6 ui-monospace,monospace;padding:2rem;max-width:1100px}
h1{color:#6fb7ae;font-size:1rem;letter-spacing:.08em}h2{color:#e0a03a;font-size:.85rem;margin:2.5rem 0 .5rem;letter-spacing:.06em}
figure{margin:0 0 1.6rem}img{max-width:100%;border:1px solid #2b3333;display:block;background:#f2f0ea}
figcaption{color:#96a2a1;padding:.5rem 0}b{color:#c8d2d1}
p.note{color:#96a2a1;border-left:2px solid #e0a03a;padding-left:.8rem}
pre{white-space:pre-wrap;color:#96a2a1;border:1px solid #222a2a;padding:.8rem}</style>
<h1>/print — tonal fill</h1>
<p>Tone out of FILLED MASS rather than line density: the silhouette inked solid or graded, with vein paths
withheld from the fill as negative space, and a darkness per part so one shape can read dark against its
neighbour. Bundle: <b>bloom-stem-leaf-bundle.glb</b> — parts ${NAMES.map(n => `<b>${esc(n)}</b>`).join(', ')}.</p>
<p class="note">The reference drawings this is measured against are not in the repo. Hold them beside the sheet:
what to look for is a leaf that is a solid black shape with white veins running through it, and depth that comes
from a dark shape next to a light one rather than from packing strokes closer together.</p>
${SECTIONS.map(([title, a, b]) => `<h2>${title}</h2>` + cells.slice(a, b).map(c =>
  `<figure><img src="${c.file}"><figcaption><b>${c.file}</b> — ${esc(c.caption)}`
  + (c.segments ? `<br>${c.segments} segments from ${c.rows} fill rows, ${c.frameMs} ms` : '')
  + (c.parts ? `<br>${esc(c.parts)}` : '')
  + `</figcaption></figure>`).join('\n')).join('\n')}
<h2>the read-out, as the page prints it</h2><pre>${esc(readout)}</pre>`;
writeFileSync(path.join(OUT, 'index.html'), html);

console.log(`\n${cells.length} cells -> ${OUT}`);
console.log('page errors:', errs.length ? errs : 'none');
await browser.close();
server.close();
