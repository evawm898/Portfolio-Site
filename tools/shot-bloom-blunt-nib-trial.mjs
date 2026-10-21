#!/usr/bin/env node
/* =========================================================================
   THE BLUNT-NIB LADDER TRIAL, PHOTOGRAPHED — main against the trial demand
   (docs/bloom-blunt-nib-ladder-outcome.md). Runs F6-spoon's own sheet
   (`tools/shot-bloom-spoon-nib.mjs` — print preview on, J/C/AN/OC asserted
   before every shutter, the STL exported watertight) twice: on this tree, and
   on a temp copy with `docs/bloom-blunt-nib-ladder-trial.patch` applied and
   its knobs set to the candidate (the DRAWN outline, 1.0 mm — the criterion
   that leaves every pointed default unbound). Each tree is served by its own
   HTTP server, so the TRIAL cells are a real render of the trial code.

   The captions are NOT the spoon sheet's (those are main's numbers): every
   E2 here is re-measured through the edge-profile gate's own clause
   (`--rows-file`, `--dump-e2`) on the tree that drew the cell. No pixel delta
   is quoted (two trees, two servers, two page sessions — CLAUDE.md).

   RUN: node tools/shot-bloom-blunt-nib-trial.mjs <out-dir> --png <file>
   ========================================================================= */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launchPage } from './bloom-harness.mjs';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.resolve(process.argv[2] || '/tmp/bloom-blunt-nib-trial');
const pngArg = process.argv.indexOf('--png'), PNG_OUT = pngArg > 0 ? path.resolve(process.argv[pngArg + 1]) : null;
fs.mkdirSync(outDir, { recursive: true });

/* the patched copy, its knobs baked in for the browser (no process.env there) */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'blunt-nib-shot-'));
const tree = path.join(tmp, 'tree');
fs.cpSync(HERE, tree, { recursive: true, filter: (src) => !(path.dirname(src) === HERE && ['.git', 'node_modules'].includes(path.basename(src))) });
fs.symlinkSync(path.join(HERE, 'node_modules'), path.join(tree, 'node_modules'));
execFileSync('git', ['apply', path.join(HERE, 'docs', 'bloom-blunt-nib-ladder-trial.patch')], { cwd: tree, stdio: 'inherit' });
const gp = path.join(tree, 'bloom-geometry.js');
let src = fs.readFileSync(gp, 'utf8');
const knobs = [["const NX = (globalThis.process && process.env.NIBX) || 'law';", "const NX = 'drawn';"],
  ['export const NIB_FALL_MM = (globalThis.process && process.env.NIBD) ? Number(process.env.NIBD) : TIP_HALF_MM;', 'export const NIB_FALL_MM = 1.0;']];
for (const [a, b] of knobs) { if (src.split(a).length !== 2) { console.error(`HARNESS INVALID: the trial knob "${a}" does not match exactly once`); process.exit(2); } src = src.replace(a, b); }
fs.writeFileSync(gp, src);

/* the four states the spoon sheet draws, E2 measured on both trees */
const SPOON = { mode: 'symmetric', points: [[0, 0.03], [0.35, 0.05], [0.65, 0.2], [0.85, 0.22], [0.96, 0.12], [1, 0]] };
const RECT = { mode: 'symmetric', points: [[0, 0.15], [0.1, 0.16], [0.9, 0.16], [0.97, 0.12], [1, 0]] };
const CV = (c) => ({ petalOutlineMode: 'CURVE', petalOutlineCurve: JSON.stringify(c) });
const STATES = [
  ['CURVE: the spoon x cup 0.6', { ...CV(SPOON), petalCup: 0.6 }],
  ['CURVE: the near-rectangle x cup 0.6 (NOT waisted)', { ...CV(RECT), petalCup: 0.6 }],
  ['LAW: spatulate (base taper 3, tip taper 0.6, tip shape 1.7) x cup 0.6', { petalBaseTaper: 3, petalTipTaper: 0.6, petalTipShape: 1.7, petalCup: 0.6 }],
  ['CURVE: the spoon x cup 0 (the control)', CV(SPOON)],
];
const rf = path.join(tmp, 'rows.json');
fs.writeFileSync(rf, JSON.stringify(STATES.map(([label, st]) => ({ label, set: Object.entries(st).map(([id, value]) => ({ id, value: String(value) })) }))));
const e2 = (root) => {
  const out = path.join(tmp, `e2-${path.basename(root)}.json`);
  try { execFileSync(process.execPath, [path.join(root, 'tools', 'verify-bloom-edge-profile.mjs'), '--rows-file', rf, '--dump-e2', out], { cwd: root, stdio: 'ignore' }); } catch (e) { /* over-allowance rows fail E2 by design */ }
  return JSON.parse(fs.readFileSync(out, 'utf8'));
};
const E = { main: e2(HERE), trial: e2(tree) };

/* the spoon sheet, once per tree, each served from its own tree */
const dirs = { main: path.join(outDir, 'main'), trial: path.join(outDir, 'trial') };
for (const [k, root] of [['main', HERE], ['trial', tree]]) {
  console.log(`shooting ${k} …`);
  execFileSync(process.execPath, [path.join(root, 'tools', 'shot-bloom-spoon-nib.mjs'), dirs[k]], { cwd: root, stdio: ['ignore', 'inherit', 'inherit'] });
}
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 60);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const rows = STATES.map(([label]) => {
  const fig = (k, v) => `<figure><img src="${k}/${slug(label)}-${v}.png"><figcaption><b>${k === 'main' ? 'MAIN' : 'TRIAL'}</b> · ${v === 'nibSide' ? 'the tip from the side' : 'the tip from outside and above'}, 4.4 mm across · E2 <b>${E[k][label].toFixed(2)}°</b></figcaption></figure>`;
  return `<h2>${esc(label)} — E2 ${E.main[label].toFixed(2)}° → ${E.trial[label].toFixed(2)}°</h2><main>${fig('main', 'nibAbove')}${fig('trial', 'nibAbove')}${fig('main', 'nibSide')}${fig('trial', 'nibSide')}</main>`;
}).join('');
const html = `<title>Blunt nib trial</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:15px;margin:22px 0 4px}p.note{color:#9fb3a9;max-width:120ch}
main{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}
figcaption{margin-top:6px;color:#9fb3a9}</style>
<h1>The blunt-nib ladder trial — main beside the ruled demand (NOT shipped)</h1>
<p class="note">Print preview on every cell; F6-spoon's own sheet run on each tree. TRIAL = <code>docs/bloom-blunt-nib-ladder-trial.patch</code> at its best criterion (no gap on the descent into the nib falls more than 1.0 mm of the DRAWN half-width — every pointed default unbound). It eases the cupped spoon's crease and sharpens the cup-0 one, and over 17 measured blunt and pointed states it turns 10 worse and 3 better (the outcome doc's table). E2 on each caption is the edge-profile gate's own clause on the tree that drew the cell. No pixel delta is quoted.</p>
${rows}`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`wrote ${outDir}/index.html`);
if (PNG_OUT) {
  const { browser, page } = await launchPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(outDir, 'index.html'));
  await page.waitForTimeout(800);
  await page.screenshot({ path: PNG_OUT, fullPage: true });
  await browser.close();
  console.log(`wrote ${PNG_OUT}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
