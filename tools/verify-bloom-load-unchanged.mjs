#!/usr/bin/env node
/* ===================================================================
   THE OLD LOAD PATH IS UNCHANGED (photo-to-bloom S1). Load-as-new is a
   SEPARATE entry point; this proves the existing one — the Load button,
   `__bloomDesign.load`, `applyDesign` over `readDoc` — behaves on this tree
   exactly as it did on the base commit, BY MEASUREMENT on both trees.

   For each sample design, on each tree (two servers, two pages, one sample at
   a time, a fresh page for each): open the page, optionally load a DIRTY design
   first (so rule 3 — a missing field keeps the PAGE's value — is exercised
   rather than vacuous), load the sample through the OLD path, settle, then
   compare base against head on FIVE things, byte for byte:
     1. the load record the page hands back (action, counts, every note);
     2. the page's readUI() state;
     3. the scopes record;
     4. the page's own save of what it now holds (savedAt stripped);
     5. the EXPORTED STL's bytes (sha256 of the file the Export button writes).

   THE SAMPLE: the six dry-run complete files (docs/photo-to-bloom/*.bloom-design.json),
   DEFAULTS composed, fifteen live matrix rows composed by the file's own writer
   (one per feature family, scope records included), and four files that make
   the reader TALK — a subset onto a dirty page (rule 3's `missing` notes), a
   clamp, an unknown key, a retired id with its exact migration.

   `--control`: the head side of one sample gets petalCup + 0.05; the run must
   then report that sample as DIFFERENT on clauses 2, 4 and 5 (or the
   comparison could not see a change at all).

   RUN:  node tools/verify-bloom-load-unchanged.mjs --base <worktree of the base commit> [--control]
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { CONTROLS, DEFAULTS, SCOPES_SET_ID } from '../bloom-registry.js';
import { composeDoc, toText } from '../bloom-file.js';
import * as H from './bloom-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const bi = argv.indexOf('--base');
const BASE = bi >= 0 ? path.resolve(argv[bi + 1]) : null;
const CONTROL = argv.includes('--control');
if (!BASE || !fs.existsSync(path.join(BASE, 'bloom.js'))) { console.error('need --base <worktree of the base commit>'); process.exit(2); }

const kindOf = new Map(CONTROLS.map((c) => [c.id, c]));
function stateOf(row) {
  const s = { ...DEFAULTS };
  for (const w of row.set || []) {
    if (w.id === SCOPES_SET_ID) continue;
    const c = kindOf.get(w.id); if (!c) throw new Error(`${row.label}: no control ${w.id}`);
    s[w.id] = c.kind === 'slider' ? Number(w.value) : c.kind === 'curve' && typeof w.value === 'string' ? JSON.parse(w.value) : w.value;
  }
  return s;
}
const ROWS = [
  'DEFAULT (the shipping configuration)', 'ALL MIN', 'FORM: FIDDLEHEAD (spine curl alone)', 'SPIRAL x defaults',
  'CONTINUOUS x 3 turns', 'STAMENS: 6 on a RING (the six-stamen candidate)', 'LEAVES: alternate x 3 nodes at the ruled 35 deg',
  'INFILL: the ruled defaults (20 cells, 5 Lloyd passes, law 0.30, stretch 1.65, a 1.00 mm wall, a 1.50 mm hole bar)',
  'SEPALS: the shipped whorl (5 of 8, interleaved, size 0.60, angle 0)', 'INFLO: the raceme (5 nodes x 1, 5-petal florets on 20 mm pedicels)',
  'TUBE: 8 petals x k 2 (2 panels)', 'LOBES: 10 asked at the default coverage — CLAMPED to 6, told',
  'VARIANCE: size ±50% (1 cycle round the shipping whorl, phase 0)', 'FRINGE: THE CARNATION — 7 teeth on a 0.50 terminal at the shipped depth', '6 layers x innerCup min (-0.8)',
];
const MATRIX = H.buildMatrix();
const SAVED = 'savedAt-fixed';
const samples = [];
for (const f of fs.readdirSync(path.join(ROOT, 'docs/photo-to-bloom')).filter((x) => x.endsWith('.bloom-design.json')).sort()) {
  samples.push({ name: f, text: fs.readFileSync(path.join(ROOT, 'docs/photo-to-bloom', f), 'utf8') });
}
samples.push({ name: 'DEFAULTS', text: toText(composeDoc(DEFAULTS, { savedAt: SAVED })) });
for (const l of ROWS) {
  const row = MATRIX.find((r) => r.label === l);
  if (!row) { console.log(`  (row not in the matrix, skipped and named: ${l})`); continue; }
  const sc = H.rowScopes(row);
  samples.push({ name: `row: ${l}`, text: toText(composeDoc(stateOf(row), { savedAt: SAVED, ...(sc ? { scopes: sc } : {}) })) });
}
const tulip = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/photo-to-bloom/tulip-v2.subset.json'), 'utf8'));
const DIRTY = toText(composeDoc({ ...DEFAULTS, petalCount: 13, layerCount: 3, petalTilt: 47, sepalCount: 5, stemLength: 60, gynoecium: 'STYLE' }, { savedAt: SAVED }));
samples.push({ name: 'a SUBSET onto a dirty page (rule 3)', dirty: true, text: JSON.stringify({ format: 'bloom-design', version: 1, controls: tulip.controls }) });
const full = JSON.parse(toText(composeDoc(DEFAULTS, { savedAt: SAVED })));
samples.push({ name: 'a clamp (petalLength 140)', text: JSON.stringify({ ...full, controls: { ...full.controls, petalLength: 140 } }) });
samples.push({ name: 'an unknown key', text: JSON.stringify({ ...full, controls: { ...full.controls, petalColour: 'red' }, sidecar: 1 }) });
const ret = { ...full.controls }; delete ret.stemNodeSwelling; delete ret.stemNodeKink;
samples.push({ name: 'a retired id (stemNodeProminence 0.48)', text: JSON.stringify({ ...full, controls: { ...ret, stemNodeProminence: 0.48, stemLength: 100 } }) });

const strip = (t) => t.replace(/"savedAt": "[^"]*"/, '"savedAt": "-"');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-load-unchanged-'));
async function capture(root, s, perturb) {
  const { server, port } = await H.serveRepo(root);
  const { browser, page } = await H.launchPage({ viewport: { width: 900, height: 700 } });
  try {
    await H.openBloom(page, port);
    if (s.dirty) { await page.evaluate(([t]) => window.__bloomDesign.load(t, 'dirty.json'), [DIRTY]); await H.settleBuild(page, 120000); }
    let text = s.text;
    if (perturb) { const o = JSON.parse(text); o.controls.petalCup = Math.round((Number(o.controls.petalCup) + 0.05) * 100) / 100; text = JSON.stringify(o); }
    const rec = await page.evaluate(([t, n]) => window.__bloomDesign.load(t, n), [text, s.name]);
    await H.settleBuild(page, 120000);
    const st = await page.evaluate(() => ({ ui: window.__bloomUIState(), scopes: window.__bloomDesign.scopes(), save: window.__bloomDesign.save() }));
    const stl = await H.exportStl(page, tmp);
    return { rec: JSON.stringify(rec), ui: JSON.stringify(st.ui), scopes: JSON.stringify(st.scopes), save: strip(st.save), stl: stl ? crypto.createHash('sha256').update(stl).digest('hex') : 'no-stl' };
  } finally { await browser.close(); server.close(); }
}
let failed = false, held = 0;
for (let i = 0; i < samples.length; i++) {
  const s = samples[i];
  const perturb = CONTROL && i === 0;
  const a = await capture(BASE, s, false), b = await capture(ROOT, s, perturb);
  const moved = ['rec', 'ui', 'scopes', 'save', 'stl'].filter((k) => a[k] !== b[k]);
  const notes = (JSON.parse(b.rec).notes || []).length;
  if (perturb) {
    const ok = ['ui', 'save', 'stl'].every((k) => moved.includes(k));
    console.log(`${ok ? 'ok  ' : 'FAIL'}  CONTROL ${s.name}: petalCup +0.05 on the head side moved [${moved.join(' ')}]`);
    if (!ok) failed = true;
    continue;
  }
  console.log(`${moved.length ? 'FAIL' : 'same'}  ${s.name} — ${notes} note(s) on both trees${moved.length ? `; DIFFERS on ${moved.join(', ')}` : `; stl ${b.stl.slice(0, 12)}`}`);
  if (moved.length) failed = true; else held++;
}
console.log(failed ? '\nOLD LOAD PATH: FAIL' : `\nOLD LOAD PATH: UNCHANGED — ${held} of ${samples.length - (CONTROL ? 1 : 0)} samples identical on record, state, scopes, save and STL bytes${CONTROL ? '; the control moved' : ''}`);
process.exit(failed ? 1 : 0);
