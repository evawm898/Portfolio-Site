/* ===================================================================
   THE CROSSING, PHOTOGRAPHED — the corolla-fusion discovery's real-page sheet.

     node tools/shot-bloom-fusion-margins.mjs <out-dir>

   What docs/bloom-corolla-fusion-discovery.md stops on: a web lofted from one
   petal's margin to its neighbour's has nowhere to be where the two margins
   have already CROSSED, and they cross on the shipped default (the margin
   BURIED inside its neighbour's sheet) and on the tube tilts (SHINGLED —
   passing under the neighbour). The numbers are the instrument's, printed
   per cell. These cells are the
   real page, print preview ON (the app's own `shownMode` asserted "export"),
   chrome hidden, autoRotate off, a fixed camera written per cell, settled to
   three byte-identical frames. NO PIXEL DELTA IS QUOTED ANYWHERE, so no
   same-tree control is owed: every number in a caption is a geometry number
   from tools/bloom-fusion-margins.mjs, built by the same module the page runs.

   The macro cells are aimed at the measured crossing itself — the margin
   point of petal 0 at the row where the PLAN gap is most negative (the
   instrument's crossing criterion; see its header for why it is not the
   bridge span) — read from that instrument, never a layout guess.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { decodePNG } from './pngdec.mjs';
import { writePng, text, blit } from './bloom-soft-render.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame,
         settleBuild, shownModeOf } from './bloom-harness.mjs';
import { measure, stateOf } from './bloom-fusion-margins.mjs';
import * as G from '../bloom-geometry.js';

const outDir = process.argv[2] || '/tmp/bloom-fusion-margins';
fs.mkdirSync(outDir, { recursive: true });
const VIEW = 560, DPR = 1;
const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: VIEW, height: VIEW }, deviceScaleFactor: DPR });
async function die(msg) { console.error('HARNESS INVALID: ' + msg); await browser.close(); server.close(); process.exit(2); }
const setOf = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));

async function settleOnly() {
  const clip = { x: 0, y: 0, width: VIEW, height: VIEW };
  let a = null, b = null;
  for (let k = 0; k < 120; k++) {
    await page.waitForTimeout(100);
    const c = await page.screenshot({ clip, timeout: 180000 });
    if (a && b && c.equals(b) && b.equals(a)) return c;
    a = b; b = c;
  }
  return null;
}
async function previewOn() {
  await page.evaluate(() => { const el = document.getElementById('printPreview'); el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await settleBuild(page);
  if (await shownModeOf(page) !== 'export') await die('print preview ON asked for, the app does not report export');
}

/* the crossing's own location, from the instrument */
function crossingPoint(set) {
  const m = measure(set, { exportMode: true });
  const l = m.layers[0];
  const worst = l.rows.slice(1).reduce((a, x) => (x.plan < a.plan ? x : a));
  return { m, worst };
}

const CELLS = [];
const add = (id, set, view, caption) => CELLS.push({ id, set, view, caption });
const whole = (dir, up = [0, 0, 1], k = 0.9) => ({ kind: 'whole', dir, up, k });
add('default-top', {}, whole([0, 0, 1], [0, 1, 0]), 'SHIPPED DEFAULT 8 PETALS FROM ABOVE');
add('default-macro-top', {}, { kind: 'cross', dir: [0, 0, 1], up: [0, 1, 0], r: 9 }, 'DEFAULT - THE CROSSING FROM ABOVE');
add('default-along-seam', {}, { kind: 'cross', alongSeam: true, r: 5 }, 'DEFAULT - LOOKING DOWN THE SEAM TO THE HUB');
add('n12-top', { petalCount: 12 }, whole([0, 0, 1], [0, 1, 0]), '12 PETALS FROM ABOVE');
add('t75n5-side', { petalTilt: 75, petalCount: 5 }, whole([1, -0.6, 0.35]), 'TILT 75 X 5 PETALS');
add('t75n5-macro', { petalTilt: 75, petalCount: 5 }, { kind: 'cross', outward: true, r: 9 }, 'TILT 75 X 5 - THE SEAM FROM OUTSIDE');
add('t60n5-side', { petalTilt: 60, petalCount: 5 }, whole([1, -0.6, 0.35]), 'TILT 60 X 5');
add('twist90', { petalTwist: 90 }, whole([0.75, -0.75, 0.6]), 'TWIST 90');
add('roll180', { petalRoll: 180 }, whole([0.75, -0.75, 0.6]), 'ROLL 180');

const shots = [];
for (const c of CELLS) {
  await openBloom(page, port);
  const bad = await applyConfig(page, setOf(c.set));
  if (bad.length) await die(`${c.id}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, setOf(c.set));
  if (drift.length) await die(`${c.id}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  await previewOn();
  const still = await stillFrame(page);
  if (still.length) await die(`${c.id}: ${still.join('; ')}`);
  const { m, worst } = crossingPoint(c.set);
  const L = m.layers[0].summary;
  let frame;
  if (c.view.kind === 'whole') {
    /* the bloom's own box, from the same module's EXPORT build of the same state */
    const a1 = new G.MeshBuilder({ exportMode: true });
    G.buildBloomInto(a1, stateOf(c.set), { below: null });
    const at = [0, 1, 2].map((k) => (a1.lo[k] + a1.hi[k]) / 2);
    const R = 0.5 * Math.hypot(...a1.boundingSize) * c.view.k;
    frame = { r: R, at, dir: c.view.dir, up: c.view.up };
  } else {
    /* aimed at petal 0's +v margin on the row where the plan gap is most negative */
    const a2 = new G.MeshBuilder({ exportMode: true });
    const b = G.buildBloomInto(a2, stateOf(c.set), { below: null });
    const rows = b.petalsAll[0].lamina[0].rows;
    const A = rows[worst.r].mid[rows[worst.r].mid.length - 1];
    let dir = c.view.dir, up = c.view.up || [0, 0, 1];
    if (c.view.outward) { const ph = Math.atan2(A[1], A[0]); dir = [Math.cos(ph), Math.sin(ph), 0.25]; up = [0, 0, 1]; }
    if (c.view.alongSeam) {
      /* the camera stands further out along the margin and looks back down it,
         so the two sheets' cross-sections meet edge-on at the crossing */
      const A2 = rows[Math.min(worst.r + 6, rows.length - 1)].mid[rows[0].mid.length - 1];
      const d = [A2[0] - A[0], A2[1] - A[1], A2[2] - A[2]]; const l = Math.hypot(...d);
      dir = [d[0] / l, d[1] / l, d[2] / l + 0.15]; up = [0, 0, 1];
    }
    frame = { r: c.view.r, at: A, dir, up };
  }
  await page.evaluate((f) => window.__bloomFrame(f.r, 0, f.at, f.dir, f.up), frame);
  const buf = await settleOnly();
  if (!buf) await die(`${c.id}: never settled in 120 frames`);
  fs.writeFileSync(path.join(outDir, `${c.id}.png`), buf);
  const runs = L.runs.map(([a, b]) => `${a.toFixed(2)}-${b.toFixed(2)}`).join(' ');
  const cap2 = L.crossed ? `CROSSED ${L.crossed}/${L.blade} ROWS U ${runs} PLAN ${L.minPlan.toFixed(2)} MM${L.buried ? ' BURIED ' + L.buried : ''}${L.shingled ? ' SHINGLED ' + L.shingled : ''}` : `NO ROW CROSSED - MIN PLAN GAP ${L.minPlan.toFixed(2)} MM${L.creaseRows ? ' - CREASE ONLY ' + L.creaseRows : ''}`;
  shots.push({ c, buf, cap2 });
  console.log(`${c.id.padEnd(22)} ${cap2}`);
}
await browser.close(); server.close();

/* ---- the sheet ---- */
const COLS = 3, CAP = 40, S = VIEW;
const ROWS = Math.ceil(shots.length / COLS);
const W = COLS * S, H = ROWS * (S + CAP) + 34;
const out = Buffer.alloc(W * H * 3, 16);
text(out, W, H, 8, 8, 'COROLLA FUSION DISCOVERY - WHERE NEIGHBOURING MARGINS CROSS - PRINT PREVIEW ON', [240, 240, 236], 2);
shots.forEach(({ c, buf, cap2 }, i) => {
  const img = decodePNG(buf);
  const rgb = Buffer.alloc(img.width * img.height * 3);
  for (let p = 0; p < img.width * img.height; p++) { rgb[p * 3] = img.data[p * 4]; rgb[p * 3 + 1] = img.data[p * 4 + 1]; rgb[p * 3 + 2] = img.data[p * 4 + 2]; }
  const ox = (i % COLS) * S, oy = 34 + Math.floor(i / COLS) * (S + CAP);
  blit(out, W, H, rgb, img.width, img.height, ox, oy);
  text(out, W, H, ox + 6, oy + S + 6, c.caption, [235, 235, 230], 1);
  text(out, W, H, ox + 6, oy + S + 20, cap2, [235, 180, 120], 1);
});
const sheetFile = path.join(outDir, 'corolla-fusion-crossing.png');
writePng(sheetFile, W, H, out);
console.log(`sheet: ${sheetFile}`);
