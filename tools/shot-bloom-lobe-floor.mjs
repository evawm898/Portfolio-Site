/* ===================================================================
   THE SAMPLES-PER-LOBE FLOOR, DEMONSTRATED — twenty-one images, not a sheet
   (Eva's ruling amendment, session 38).

   WHAT IT PRODUCES, in the scratch directory named on the command line:
     floor-11-q{050,100,200}.png   tip shape 0.50 / 1.00 / 2.00 AT THE FLOOR
                                   (11 stations a lobe, exactly, two lobes)
     floor-10-q{050,100,200}.png   the same three ONE STEP BELOW
     floor-08-q{050,100,200}.png   and at EIGHT and SIX — where the range's
     floor-06-q{050,100,200}.png   ends stop reading apart, for Eva's eye
     floor-04-q{050,100,200}.png   the same three at FOUR — the first
                                   sheet's condition at this pitch
     six-04-q{050,100,200}.png     the triptych Eva ruled on, reproduced:
                                   six lobes at four stations a lobe
     trip-c100.png / trip-c200.png / trip-c300.png
                                             THE TRIPTYCH at a count the floor
                                   permits, on the shipping tree (item 4)
     floor-11-c100--control.png              the same-tree control: the
                                             first cell shot twice
     trip-c100--control.png                  the triptych's own same-tree
                                             control (its first cell twice)
     captions.txt                            every cell's read-out line and
                                             both controls' pixel differences
   Every cell: PRINT PREVIEW ON (the app's shownMode asserted "export"), a
   MACRO crop down the first petal's own normal at its midpoint, two lobes at
   depth 0.30 on the default petal. The exact station count per lobe is set
   through the CAPABILITY hook — `{ label: 'LOBE_SAMPLES', lobeSamplesPerLobe:
   n, lobeExactDemand: true }` — the non-shipping configuration mechanism
   (CLAW / CLEFT's), read back from the app's own metrics; the shipping tree
   carries 11 and no control reaches below it, which is the point.

   RUN:  node tools/shot-bloom-lobe-floor.mjs <out-dir> [--only <id regex>]
         (--only re-renders a subset; the frame is still the first cell's, so
         the FIRST matched cell is shot first and every other cell reuses it)
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame,
         settleBuild, modeTag, shownModeOf, DEFAULTS } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-lobe-floor';
const onlyArg = process.argv.indexOf('--only');
const ONLY = onlyArg >= 0 ? new RegExp(process.argv[onlyArg + 1]) : null;
fs.mkdirSync(outDir, { recursive: true });
const VIEW = 560, DPR = 2;
const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: VIEW, height: VIEW }, deviceScaleFactor: DPR });
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));

async function settleOnly() {
  const clip = { x: 0, y: 0, width: VIEW, height: VIEW };
  let a = null, b = null;
  for (let k = 0; k < 90; k++) {
    await page.waitForTimeout(100);
    const c = await page.screenshot({ clip, timeout: 180000 });
    if (a && b && c.equals(b) && b.equals(a)) return k;
    a = b; b = c;
  }
  return -1;
}
async function shoot(file, frame) {
  await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir, null), frame);
  const settled = await settleOnly();
  const buf = await page.screenshot({ clip: { x: 0, y: 0, width: VIEW, height: VIEW }, timeout: 180000 });
  if (settled < 0) await die(`${path.basename(file)}: never settled in 90 frames`);
  fs.writeFileSync(file, buf);
  return buf;
}
function pixelDiff(a, b) {
  const A = decodePNG(a), B = decodePNG(b);
  let n = 0;
  for (let o = 0; o < A.data.length; o += 4) if (A.data[o] !== B.data[o] || A.data[o + 1] !== B.data[o + 1] || A.data[o + 2] !== B.data[o + 2]) n++;
  return n;
}
async function previewOn() {
  await page.evaluate(() => { const el = document.getElementById('printPreview'); el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await settleBuild(page);
  const got = await shownModeOf(page);
  if (got !== 'export') await die(`print preview ON asked for, app reports shownMode "${got}"`);
}

/* RE-KEYED ON THE CREST EXPONENT (session 41). `lobeTipShape` is retired.
   The retired 0.50 / 1.00 / 2.00 were crest powers 1 / 2 / 4 over a notch
   that was parabolic at every value, so the three shapes this sheet
   distinguishes are now crest 1.00 / 2.00 / 3.00 with the notch held at its
   default — the same visual range (a point, a round crest, a flat one) on
   the law that ships, and the third is the new range's own ceiling rather
   than the retired law's unreachable 4. */
async function cell({ id, crest, samples, frame, count = 2 }) {
  const sets = { lobeDepth: 0.3, lobeCount: count, lobeCrestShape: crest };
  await openBloom(page, port);
  const bad = await applyConfig(page, set(sets));
  if (bad.length) await die(`${id}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, set(sets));
  if (drift.length) await die(`${id}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  if (samples !== null) {
    const capName = await page.evaluate((n) => { window.__bloomCapability({ label: 'LOBE_SAMPLES', lobeSamplesPerLobe: n, lobeExactDemand: true }); return window.__bloomMetrics().capability; }, samples);
    if (capName !== 'LOBE_SAMPLES') await die(`${id}: capability reads back ${JSON.stringify(capName)}`);
  }
  await previewOn();
  const still = await stillFrame(page);
  if (still.length) await die(`${id}: ${still.join('; ')}`);
  const m = await page.evaluate(() => window.__bloomMetrics());
  if (m.shownMode !== 'export' || m.liveTris !== null) await die(`${id}: not the export build on screen`);
  const L = m.petalLobes;
  if (!L || L.noRoom) await die(`${id}: no lobes built`);
  const want = samples === null ? 11 : samples;
  if (L.samplesPerLobe !== want) await die(`${id}: built at ${L.samplesPerLobe} stations a lobe, ${want} asked`);
  if (samples !== null && L.demand.stations !== count * samples) await die(`${id}: demand ${L.demand.stations}, expected ${count * samples}`);
  if (L.countBuilt !== count) await die(`${id}: ${L.countBuilt} lobes built, ${count} asked — the count must be reachable for the cell to mean what it says`);
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  const line = (readout.match(/LOBES [^\n]+/) || [''])[0];
  if (await settleOnly() < 0) await die(`${id}: never came to rest`);
  const fr = frame || { r: Number(DEFAULTS.petalLength) * 0.30, at: m.petalMid, dir: m.petalNormal };
  const buf = await shoot(path.join(outDir, `${id}.png`), fr);
  const cap = `${id}: tip shape ${q.toFixed(2)} · ${samples === null ? 'the shipping floor (11)' : `CAPABILITY ${samples} stations a lobe, exact`} · ${L.rowsInWindow} stations in [u0, u1] (the crest at u0 included), demand ${L.demand.stations} · ${modeTag(m)} · ${line}`;
  return { id, buf, frame: fr, cap };
}

const lines = [];
const cells = [
  /* the floor: the range's floor 0.50 against the default 1.00 (Eva's pair) and the range's top 2.00 */
  { id: 'floor-11-c100', crest: 1, samples: 11 }, { id: 'floor-11-c200', crest: 2, samples: 11 }, { id: 'floor-11-c300', crest: 3, samples: 11 },
  /* one step below */
  { id: 'floor-10-c100', crest: 1, samples: 10 }, { id: 'floor-10-c200', crest: 2, samples: 10 }, { id: 'floor-10-c300', crest: 3, samples: 10 },
  /* and where the range's ENDS stop being distinguishable by eye — the derivation's
     clause (i) fails at 10 on the DEFAULT shape's roundness, while 0.50 against 2.00
     still reads at 10; 8 and 6 are for Eva to rule on, with the count each would buy */
  { id: 'floor-08-c100', crest: 1, samples: 8 }, { id: 'floor-08-c200', crest: 2, samples: 8 }, { id: 'floor-08-c300', crest: 3, samples: 8 },
  { id: 'floor-06-c100', crest: 1, samples: 6 }, { id: 'floor-06-c200', crest: 2, samples: 6 }, { id: 'floor-06-c300', crest: 3, samples: 6 },
  /* the first sheet's condition — four stations a lobe — at two lobes (the same pitch as above) */
  { id: 'floor-04-c100', crest: 1, samples: 4 }, { id: 'floor-04-c200', crest: 2, samples: 4 }, { id: 'floor-04-c300', crest: 3, samples: 4 },
  /* and at SIX lobes, the triptych Eva ruled on, reproduced: 4 stations a lobe on a 2.38 mm pitch */
  { id: 'six-04-c100', crest: 1, samples: 4, count: 6 }, { id: 'six-04-c200', crest: 2, samples: 4, count: 6 }, { id: 'six-04-c300', crest: 3, samples: 4, count: 6 },
  /* THE TRIPTYCH on the shipping tree, at the count the floor permits */
  { id: 'trip-c100', crest: 1, samples: null }, { id: 'trip-c200', crest: 2, samples: null }, { id: 'trip-c300', crest: 3, samples: null },
];
const chosen = ONLY ? cells.filter((c) => ONLY.test(c.id)) : cells;
if (!chosen.length) { console.error(`--only ${ONLY} matched no cell`); process.exit(2); }
/* A same-tree control on the first cell, and on the triptych's own first
   cell: the triptych is the one cell Eva asked for and its control has to be
   its own (same tree, same camera, same state, shot twice), not another
   row's. Reported, never a floor. */
const CONTROLLED = new Set([cells[0].id, 'trip-c100']);
const first = await cell(chosen[0]);
const shotControl = async (r) => {
  const control = await shoot(path.join(outDir, `${r.id}--control.png`), r.frame);
  lines.push(`same-tree control: ${pixelDiff(r.buf, control)} px between two draws of ${r.id} (reported, never a floor)`);
  console.log(lines[lines.length - 1]);
};
if (CONTROLLED.has(first.id)) await shotControl(first);
lines.push(first.cap); console.log(first.cap);
let controls = CONTROLLED.has(first.id) ? 1 : 0;
for (const c of chosen.slice(1)) { const r = await cell({ ...c, frame: first.frame }); if (CONTROLLED.has(r.id)) { await shotControl(r); controls++; } lines.push(r.cap); console.log(r.cap); }
fs.writeFileSync(path.join(outDir, ONLY ? 'captions-only.txt' : 'captions.txt'), lines.join('\n') + '\n');
console.log(`\n${chosen.length} images + ${controls} control(s) in ${outDir}`);
await browser.close();
server.close();
