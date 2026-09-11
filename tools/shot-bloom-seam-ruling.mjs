/* ===================================================================
   shot-bloom-seam-ruling.mjs — THE STOP-CONDITION ROW, RENDERED
   (session 38, Eva's ruling: "the pair count is a defect census, not an
   appearance. Nobody has looked at this row.")

     node tools/shot-bloom-seam-ruling.mjs <dir> --base <worktree of main>

   FOUR CELLS, TWO PAIRS. The incurve target at headRise 0.5 is the one row
   that REGRESSED under the seam clearance (7,350 -> 9,944 pairs), and its
   FLAT sibling is the control: the two rows differ by `headRise` alone, and
   the flat one improved fifteen-fold (7,806 -> 510). If the fix is visibly
   worse on the domed row, that is a stop; if the two look the same and the
   flat pair visibly improves, the pair count is a census of a defect nobody
   can see and the merge is Eva's call.

   THE TWO TREES ARE SERVED, NOT MUTATED. `main` is rendered from a real
   worktree over its own HTTP server, so its `bloom.js`, its read-out and its
   geometry are all that commit's — swapping one module into the other tree's
   page would leave the branch's read-out reading fields main does not emit.

   THE CAMERA IS SHARED WITHIN A PAIR AND MEASURED ONCE. It is sized from the
   BRANCH's live geometry and then written verbatim to both trees, because a
   camera sized per tree would make a before/after pair a picture of two
   framings. PRINT PREVIEW IS ON in every cell (the ruling asked for the
   object, not the screen), chrome is hidden and autoRotate is off through the
   harness's own `stillFrame`, and every caption prints the app's OWN
   `shownMode` rather than what this tool believes it set.

   NO PIXEL DELTA IS QUOTED. The renderer is not deterministic between page
   sessions (the contact-sheet rule), these are two different trees on two
   different servers, and the question here is what a person sees — so the
   cells are shown side by side and the numbers beside them are the CENSUS's,
   which is a measurement this tool did not take.
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame,
         settleBuild, shownModeOf, buildMatrix } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-seam-ruling';
const bi = process.argv.indexOf('--base');
const BASE = bi > 0 && process.argv[bi + 1] ? path.resolve(process.argv[bi + 1]) : null;
if (!BASE) { console.error('usage: node tools/shot-bloom-seam-ruling.mjs <dir> --base <worktree>'); process.exit(2); }
fs.mkdirSync(outDir, { recursive: true });

const ROWS = [
  { key: 'domed', prefix: 'DOME: the INCURVE TARGET x rise 0.5',
    title: 'THE STOP CONDITION — the incurve target at headRise 0.5',
    census: 'census 7,350 -> 9,944 pairs (REGRESSED)' },
  { key: 'flat', prefix: 'DOME: the INCURVE TARGET, flat',
    title: 'THE CONTROL — the same configuration, flat (headRise 0)',
    census: 'census 7,806 -> 510 pairs (improved 15x)' },
];
const matrix = buildMatrix();
const rowOf = (p) => { const r = matrix.find((x) => x.label.startsWith(p)); if (!r) { console.error('no row ' + p); process.exit(2); } return r; };

const servers = [];
async function treePage(root) {
  const { server, port } = await serveRepo(root);
  servers.push(server);
  const { browser, page } = await launchPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2 });
  return { browser, page, port };
}
function die(msg) { console.error('HARNESS INVALID: ' + msg); process.exit(2); }

/* One cell. `frame` null means "size it from this build and return it". */
async function cell({ page, port, row, file, frame }) {
  await openBloom(page, port);
  const bad = await applyConfig(page, row.set);
  if (bad.length) die(`${row.label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, row.set);
  if (drift.length) die(`${row.label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  const still = await stillFrame(page);
  if (still.length) die(`${row.label}: ${still.join('; ')}`);
  /* TWO FRAMINGS, and the close one is the one that can answer the question.
     A whole-bloom cell at 900 px cannot resolve a sub-millimetre fold, so a
     pair that looks identical there is weak evidence; the RIM view puts the
     camera on the foot-to-blade seam itself, which is where the clearance
     acts and where every one of this row's intersecting pairs lives. */
  const fit = frame || await page.evaluate(() => {
    const m = window.__bloomMetrics();
    const hub = (m.rings && m.rings[0] && m.rings[0].radius) || 12;
    return { whole: { r: (m.fitRadius || m.bboxRadius || 60) * 2.4, at: [0, 0, 0], dir: [0.55, -0.62, 0.56] },
             rim: { r: hub * 0.85, at: [hub * 0.72, 0, 0], dir: [0.25, -0.93, 0.26] } };
  });
  /* PRINT PREVIEW ON — the object, not the screen. */
  await page.evaluate(() => { const el = document.getElementById('printPreview'); el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await settleBuild(page);
  await page.waitForTimeout(150);
  const mode = await shownModeOf(page);
  if (mode !== 'export') die(`${row.label}: print preview ON asked for, app reports shownMode "${mode}"`);
  const notes = [];
  for (const view of ['whole', 'rim']) {
    await page.evaluate((f) => window.__bloomFrame(f.r, 0.05, f.at, f.dir), fit[view]);
    /* SETTLE ON THE REAL SIGNAL: screenshot until two consecutive frames are
       byte-identical, never a fixed sleep (the contact-sheet rule). Where the
       damping has not stopped inside the budget the cell SAYS SO rather than
       being quietly written as if it had. */
    let prev = null, settled = false;
    const f = file.replace(/\.png$/, `-${view}.png`);
    for (let i = 0; i < 40 && !settled; i++) {
      await page.waitForTimeout(200);
      const buf = await page.screenshot({ clip: { x: 0, y: 0, width: 900, height: 900 } });
      if (prev && Buffer.compare(prev, buf) === 0) { fs.writeFileSync(f, buf); settled = true; }
      prev = buf;
    }
    if (!settled) { fs.writeFileSync(f, prev); notes.push(`${view}: no two identical frames`); }
  }
  return { fit, mode, notes };
}

const cells = [];
for (const spec of ROWS) {
  const row = rowOf(spec.prefix);
  const branch = await treePage(path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'));
  const f1 = path.join(outDir, `${spec.key}-branch.png`);
  const res = await cell({ ...branch, row, file: f1, frame: null });
  const { fit, mode } = res;
  await branch.browser.close();

  const main = await treePage(BASE);
  const f2 = path.join(outDir, `${spec.key}-main.png`);
  const r2 = await cell({ ...main, row, file: f2, frame: fit });
  await main.browser.close();

  cells.push({ ...spec, label: row.label, main: path.basename(f2).replace(/\.png$/, ''), branch: path.basename(f1).replace(/\.png$/, ''),
               fit, modes: [r2.mode, mode], notes: [...(r2.notes || []), ...(res.notes || [])] });
  console.log(`  ${spec.key}: both trees, whole + rim, r=${fit.whole.r.toFixed(1)}/${fit.rim.r.toFixed(1)} (modes ${r2.mode}/${mode})${(r2.notes || []).concat(res.notes || []).length ? ' [' + (r2.notes || []).concat(res.notes || []).join('; ') + ']' : ''}`);
}
for (const s of servers) s.close();

const html = `<!doctype html><meta charset="utf-8"><title>Bloom session 38 — the seam clearance, the stop-condition row</title>
<style>body{background:#0c0f0e;color:#dfe6e3;font:14px/1.55 ui-sans-serif,system-ui;margin:0;padding:28px}
h1{font-size:19px;margin:0 0 4px}h2{font-size:15px;margin:30px 0 6px;color:#9fb8b1}
p{max-width:74ch;color:#b9c6c2}.pair{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:10px 0 4px}
figure{margin:0}img{width:100%;display:block;border:1px solid #22302c;background:#0c0f0e}
figcaption{font-size:12px;color:#8fa39e;padding-top:5px}b{color:#e8f0ed}</style>
<h1>The seam clearance — the row that regressed, rendered</h1>
<p>Both cells of a pair share ONE camera, sized from the branch and written verbatim to both trees.
PRINT PREVIEW is ON in every cell, so this is the exported object rather than the screen geometry.
Chrome hidden, autoRotate off, each frame settled until two consecutive screenshots are byte-identical.
<b>No pixel delta is quoted</b> — two trees on two servers in two page sessions, and the question is
what a person sees. The pair counts beside each row are the census's, not this tool's.</p>
${cells.map((c) => `<h2>${c.title}</h2><p>${c.census}<br><span style="color:#8fa39e">${c.label}</span>${c.notes.length ? `<br><span style="color:#c9a227">note: ${c.notes.join('; ')}</span>` : ''}</p>
${['whole', 'rim'].map((v) => `<div class="pair">
<figure><img src="${c.main}-${v}.png"><figcaption><b>main</b> — ${v} — mode ${c.modes[0]}</figcaption></figure>
<figure><img src="${c.branch}-${v}.png"><figcaption><b>branch</b> (seam clearance) — ${v} — mode ${c.modes[1]}</figcaption></figure>
</div>`).join('')}`).join('\n')}
<p style="margin-top:26px">The domed row's effective seam turn is <b>125.4–128.1°</b> on every one of its 120 rings —
past a right angle, where the clearance law's own algebra reverses. The flat row's is <b>75.0–89.9°</b>,
under it on every ring. That is the only difference between them.</p>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${outDir}/index.html`);
