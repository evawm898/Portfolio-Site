/* ===================================================================
   verify-bloom-export.mjs — print-safety gate for the Parametric Bloom.

   WHAT IT MEASURES. Loads /bloom.html headless, and for every config in the
   shared matrix clicks the real Get STL button, captures the binary STL, and
   runs one edge census. THE PASS CRITERION IS boundary === 0 AND NOTHING
   ELSE: an edge used by exactly one triangle is an open edge, and any open
   edge means the export does not enclose a volume. `nonManifold` (edge count
   > 2) and `shells` (vertex-weld components) are printed as UNRATED
   DIAGNOSTICS — this geometry is closed solids that interpenetrate without
   sharing welded vertices, so both columns are nonzero/large on healthy
   models and neither can gate. The flower project once believed its export
   gate rated non-manifold edges; it never did, and the false belief shaped
   decisions for weeks. Stating the criterion here, exactly, is the fix.

   WHAT IT DOES NOT COVER (read before quoting a PASS):
     - Connectedness. Two separate closed solids have zero boundary edges.
       That property has its own gate: tools/verify-bloom-connectedness.mjs.
     - Shape correctness. Watertight and WRONG is a real state.
     - Anything outside the matrix: the sweep is every registry control at
       min/default/max plus the petal-count range — a config this file does
       not build is unknown, not passing.

   VALIDITY. Every row runs on a FRESH PAGE; every set value is READ BACK
   through the real input and the whole registry state is compared against
   DEFAULTS + set via the app's own snapshot. Any mismatch fails the RUN
   (harness-invalid), never just the row — a harness measuring the wrong
   design produces passes that mean nothing (the flower's read-back caught
   73/185 configs doing exactly that).

   TRIANGLE COUNTS printed here are EXPORT-mode counts from the STL header.
   Live counts are a different number (the export floor changes geometry) and
   the two are NOT convertible; every printed count is labelled.

   RUN:  node tools/verify-bloom-export.mjs
         node tools/verify-bloom-export.mjs --negative-control
           Deliberately sets petalCount to an out-of-range value the browser
           must clamp, and requires the run to FAIL on read-back. A validity
           check nobody has seen fail is a hope, not a check.
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, exportStl, analyzeStl, buildMatrix } from './bloom-harness.mjs';

const NEGATIVE_CONTROL = process.argv.includes('--negative-control');

const rows = buildMatrix();
if (NEGATIVE_CONTROL) {
  rows.length = 1;
  rows[0] = { label: 'NEGATIVE CONTROL: petalCount 999 (browser must clamp; read-back must reject)', set: [{ id: 'petalCount', value: '999' }] };
  console.log('NEGATIVE CONTROL: this run MUST fail on read-back.\n');
}

const { server, port } = await serveRepo();
const { browser, page } = await launchPage();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-export-'));

const results = [];
const validity = [];
const t0 = Date.now();
for (const row of rows) {
  await openBloom(page, port);   // fresh page per row — isolation by reload, not by a clear-list
  const bad = await applyConfig(page, row.set);
  if (bad.length) { validity.push(`${row.label}: config did not take: ${bad.join('; ')}`); continue; }
  const drift = await fullStateDrift(page, row.set);
  if (drift.length) { validity.push(`${row.label}: state is not DEFAULTS+set: ${drift.join('; ')}`); continue; }
  const buf = await exportStl(page, tmp);
  if (!buf) { validity.push(`${row.label}: no STL download`); continue; }
  results.push({ label: row.label, bytes: buf.length, ...analyzeStl(buf) });
}
await browser.close();
server.close();
fs.rmSync(tmp, { recursive: true, force: true });

console.log('export gate: pass criterion is boundary === 0, nothing else. nonManifold and shells are unrated diagnostics.\n');
const failures = [];
for (const r of results) {
  const ok = r.boundary === 0;
  if (!ok) failures.push(r);
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${r.label.padEnd(46)} tris(export)=${String(r.tris).padStart(6)} boundary=${r.boundary} nonManifold=${r.nonManifold} (unrated) shells=${r.shells} (unrated) ${(r.bytes / 1024).toFixed(0)} KiB`);
}
console.log(`\n${results.length - failures.length}/${results.length} configs watertight (boundary = 0); ${((Date.now() - t0) / 1000).toFixed(0)}s`);

let bad = false;
if (validity.length) {
  bad = true;
  console.error(`\nexport gate: HARNESS INVALID — ${validity.length} validity assertion(s) failed. No result above is trustworthy.`);
  for (const v of validity) console.error(`  - ${v}`);
}
if (failures.length) {
  bad = true;
  console.error(`\nexport gate: FAIL — ${failures.length} config(s) export with open (boundary) edges:`);
  for (const f of failures) console.error(`  - ${f.label}: boundary=${f.boundary}`);
}
if (NEGATIVE_CONTROL) {
  if (bad) { console.log('\nNEGATIVE CONTROL: PASS — the harness rejected the clamped value, as it must.'); process.exit(0); }
  console.error('\nNEGATIVE CONTROL: FAILED — the harness accepted a value the browser rewrote. The read-back is not measuring anything.');
  process.exit(1);
}
if (bad) process.exit(1);
console.log('export gate: PASS — every config above exports watertight.');
