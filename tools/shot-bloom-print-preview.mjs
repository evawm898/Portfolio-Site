#!/usr/bin/env node
/* F7 SHEET — the panel before and after "print preview always on".
   node tools/shot-bloom-print-preview.mjs <out.png> --base <worktree of the base commit>

   Both trees are served from their own HTTP server and opened AS SHIPPED (no
   harness flip). Three elements per tree: the VIEW box (where the checkbox
   was), the generated control panel (#panelControls) and the read-out. The
   pixel figures are EXACT comparisons of DOM elements with no canvas in them,
   so no same-tree control is owed for them (CLAUDE.md's pixel rule is about
   the WebGL viewport, which is not compared here); the dimensions are
   reported beside them because a moved layout changes the size first. */
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launchPage, openBloom } from './bloom-harness.mjs';
import { decodePNG } from './pngdec.mjs';

const outPng = path.resolve(process.argv[2] || 'print-preview.png');
const base = process.argv[process.argv.indexOf('--base') + 1];
if (!base || !fs.existsSync(base)) { console.error('--base <worktree> is required'); process.exit(2); }
const VIEW = { width: 1400, height: 3200 };

async function shoot(root) {
  const { server, port } = await serveRepo(path.resolve(root));
  const { browser, page } = await launchPage({ viewport: VIEW });
  await openBloom(page, port, { asShipped: true });
  await page.evaluate(() => { const ar = document.getElementById('autoRotate'); if (ar.checked) { ar.checked = false; ar.dispatchEvent(new Event('change', { bubbles: true })); } });
  await page.waitForTimeout(300);
  const out = {};
  for (const [k, sel] of [['view', '.bl-viewpanel'], ['controls', '#panelControls'], ['readout', '#readout']]) out[k] = await page.locator(sel).screenshot();
  /* and EVERY SECTION OPENED IN TURN — a read-out deep in a collapsed section
     can read the build's own record, which is mode-dependent. The panel is an
     ACCORDION (opening one section closes its siblings), so "open them all at
     once" is not a state the panel can be in: each section is opened with its
     ancestors, alone, and the panel shot. */
  const nSec = await page.evaluate(() => document.querySelectorAll('#panelControls details').length);
  out.sections = [];
  for (let i = 0; i < nSec; i++) {
    const name = await page.evaluate((k) => {
      const all = [...document.querySelectorAll('#panelControls details')];
      all.forEach((d) => { d.open = false; });
      const chain = []; for (let d = all[k]; d; d = d.parentElement && d.parentElement.closest('#panelControls details')) chain.unshift(d);
      chain.forEach((d) => { d.open = true; });
      return all[k].querySelector('summary') ? all[k].querySelector('summary').textContent.trim() : String(k);
    }, i);
    await page.waitForTimeout(60);
    out.sections.push({ name, png: await page.locator('#panelControls').screenshot() });
  }
  out.box = await page.evaluate(() => { const el = document.getElementById('printPreview'); return el ? { checked: el.checked, visible: el.getClientRects().length > 0 } : null; });
  await browser.close(); server.close();
  return out;
}
function diff(a, b) {
  const A = decodePNG(a), B = decodePNG(b);
  if (A.width !== B.width || A.height !== B.height) return { same: false, dims: `${A.width}x${A.height} -> ${B.width}x${B.height}`, px: null };
  let px = 0;
  for (let i = 0; i < A.data.length; i += 4) if (A.data[i] !== B.data[i] || A.data[i + 1] !== B.data[i + 1] || A.data[i + 2] !== B.data[i + 2] || A.data[i + 3] !== B.data[i + 3]) px++;
  return { same: px === 0, dims: `${A.width}x${A.height}`, px };
}
const before = await shoot(base), after = await shoot('.');
const d = { view: diff(before.view, after.view), controls: diff(before.controls, after.controls), readout: diff(before.readout, after.readout) };
const secDiff = before.sections.map((b, k) => ({ name: b.name, after: after.sections[k] && after.sections[k].name, ...diff(b.png, after.sections[k].png) }));
const secBad = secDiff.filter((x) => !x.same || x.name !== x.after);
d.sections = { count: secDiff.length, countAfter: after.sections.length, differing: secBad.map((x) => `${x.name}: ${x.px === null ? x.dims : x.px + ' px'}`) };
console.log(JSON.stringify({ before: before.box, after: after.box, d }, null, 1));
const dir = path.dirname(outPng);
fs.mkdirSync(dir, { recursive: true });
const tmp = fs.mkdtempSync(path.join(dir, '.pp-'));
for (const t of ['view', 'controls', 'readout']) { fs.writeFileSync(path.join(tmp, `b-${t}.png`), before[t]); fs.writeFileSync(path.join(tmp, `a-${t}.png`), after[t]); }
const cap = (t) => d[t].px === null ? `size changed: ${d[t].dims}` : `${d[t].dims} · ${d[t].px} px differ`;
const html = `<!doctype html><meta charset=utf-8><style>body{background:#0a0a0c;color:#ddd;font:12px monospace;margin:16px}h2{font-size:13px;color:#6fb7ae;margin:14px 0 4px}.r{display:flex;gap:16px;align-items:flex-start}.r div{flex:0 0 auto}.r img{display:block;border:1px solid #333;max-width:640px}</style>
<h1 style="font-size:15px">F7 — the panel before (main) and after (print preview always on)</h1>
<p>Both pages opened as shipped. Before: print-preview box ${before.box && before.box.visible ? 'VISIBLE' : 'hidden'}, ${before.box && before.box.checked ? 'checked' : 'unchecked'}. After: ${after.box && after.box.visible ? 'VISIBLE' : 'hidden'}, ${after.box && after.box.checked ? 'checked' : 'unchecked'}.</p>
<h2>VIEW box — ${cap('view')}</h2><div class=r><div>before<img src="${path.basename(tmp)}/b-view.png"></div><div>after<img src="${path.basename(tmp)}/a-view.png"></div></div>
<h2>Control panel (#panelControls) — ${cap('controls')}</h2><p>(the panel is shown collapsed as shipped)</p><div class=r><div>before<img src="${path.basename(tmp)}/b-controls.png"></div><div>after<img src="${path.basename(tmp)}/a-controls.png"></div></div>
<h2>Control panel, each of its ${d.sections.count} sections opened in turn (with its ancestors) — ${d.sections.differing.length ? 'DIFFER: ' + d.sections.differing.join('; ') : '0 px differ on every one'} (not pictured)</h2>
<h2>Read-out — ${cap('readout')} (expected: the first line names the geometry on screen, and the on-screen marker moves to the PRINTED line)</h2><div class=r><div>before<img src="${path.basename(tmp)}/b-readout.png"></div><div>after<img src="${path.basename(tmp)}/a-readout.png"></div></div>`;
const htmlPath = path.join(dir, 'print-preview-sheet.html');
fs.writeFileSync(htmlPath, html);
const { browser, page } = await launchPage({ viewport: { width: 1400, height: 900 } });
await page.goto('file://' + htmlPath);
await page.screenshot({ path: outPng, fullPage: true });
await browser.close();
fs.rmSync(tmp, { recursive: true, force: true }); fs.rmSync(htmlPath);
console.log('wrote', outPng);
