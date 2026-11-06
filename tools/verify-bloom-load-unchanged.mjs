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

   `--per-layer` (#495, the ring-options discovery): ALSO the designs S1's set
   never reaches, because none of them turns Per-layer values on — the photo
   set's per-layer subsets (v4 onward, each through the OLD path as a subset)
   and every live matrix row whose scopes OWN a layer's size (block 64's law
   rows and their kin). A change to where a ring goes can move only those.
   `--only <regex>` runs the samples whose name matches (a foreground chunk).

   `--added <id,...>` (#495, the first shipping change this tool closes): a
   registry control the HEAD adds and the base does not have. Every sample is
   then loaded WITHOUT that field — what every design saved before it existed
   looks like (the samples composed here by the head's own writer would carry
   it) — and the head side is normalised by exactly what a new field costs and
   nothing else: its `controls.<id> is missing` note dropped and `fields` less
   one per id in the load record, the id dropped from the page state and from
   the save, EACH ASSERTED to read the registry's default first (an added field
   a design moved is a finding, never normalised). Everything else — every
   other note, every other value, the scopes, the STL's bytes — byte for byte.

   RUN:  node tools/verify-bloom-load-unchanged.mjs --base <worktree of the base commit> [--control] [--per-layer] [--only <regex>]
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
samples.push({ name: 'a retired id (stemNodeProminence 0.48)', text: JSON.stringify({ ...full, controls: { ...ret, 'stemNodeProminence': 0.48, stemLength: 100 } }) });

if (argv.includes('--per-layer')) {
  const SET = path.join(ROOT, 'docs/photo-to-bloom/eva-set');
  for (const fl of fs.readdirSync(SET).sort()) for (const f of fs.readdirSync(path.join(SET, fl)).filter((x) => x.endsWith('.subset.bloom-design.json')).sort()) {
    const text = fs.readFileSync(path.join(SET, fl, f), 'utf8');
    if (JSON.parse(text).controls.scopeLayers === 'ON') samples.push({ name: `per-layer subset ${f}`, text });
  }
  for (const row of MATRIX) {
    const sc = H.rowScopes(row);
    if (!sc || !(sc.layers || []).some((e) => ['petalLength', 'petalWidth', 'petalTilt'].some((k) => k in (e.offsets || {})))) continue;
    /* a row whose record OWNS A RING (#495's block 85) is a design no tree before
       that change could hold — not a saved design, so not this compare's subject */
    if ((sc.layers || []).some((e) => e.values && 'layerRing' in e.values)) continue;
    samples.push({ name: `per-layer row: ${row.label}`, text: toText(composeDoc(stateOf(row), { savedAt: SAVED, scopes: sc })) });
  }
}
const ai = argv.indexOf('--added');
const ADDED = ai >= 0 ? argv[ai + 1].split(',').filter(Boolean) : [];
for (const id of ADDED) if (!kindOf.has(id)) { console.error(`--added ${id}: not a control on this tree`); process.exit(2); }
if (ADDED.length) for (const s of samples) {
  const o = JSON.parse(s.text);
  if (o && o.controls) { for (const id of ADDED) delete o.controls[id]; s.text = JSON.stringify(o); }
}
const oi = argv.indexOf('--only');
if (oi >= 0) { const re = new RegExp(argv[oi + 1]); for (let i = samples.length - 1; i >= 0; i--) if (!re.test(samples[i].name)) samples.splice(i, 1); }

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
    let save = strip(st.save);
    if (root === ROOT && ADDED.length) {
      /* the head's normalisation (`--added`, above) — each added field must read its default */
      for (const id of ADDED) {
        const dflt = DEFAULTS[id];
        if (!(id in st.ui) || String(st.ui[id]) !== String(dflt)) throw new Error(`${s.name}: the added field ${id} reads ${JSON.stringify(st.ui[id])} in the page state, not its default ${dflt}`);
        delete st.ui[id];
        const i = (rec.notes || []).findIndex((n) => n.kind === 'missing' && n.text.startsWith(`controls.${id} is missing`));
        if (i < 0 && rec.action === 'loaded') throw new Error(`${s.name}: the head told no missing ${id} — the file was not the field-less design it was meant to be`);
        if (i >= 0) rec.notes.splice(i, 1);
        if (typeof rec.fields === 'number') rec.fields -= 1;
        const o = JSON.parse(save);
        if (!o.controls || String(o.controls[id]) !== String(dflt)) throw new Error(`${s.name}: the head saved ${id} = ${JSON.stringify(o.controls && o.controls[id])}, not its default ${dflt}`);
        save = save.replace(new RegExp(`\\n\\s*"${id}": [^,\\n]*,`), '');
        if (save.includes(`"${id}"`)) throw new Error(`${s.name}: could not drop ${id} from the head's save text`);
      }
    }
    return { rec: JSON.stringify(rec), ui: JSON.stringify(st.ui), scopes: JSON.stringify(st.scopes), save, stl: stl ? crypto.createHash('sha256').update(stl).digest('hex') : 'no-stl' };
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
