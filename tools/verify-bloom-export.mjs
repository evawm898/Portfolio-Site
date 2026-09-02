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
     - The CAPABILITY rows' structural claims. Those rows assert
       non-monotone width and a two-span domain from the APP'S OWN profile
       and trim evaluation, not from the STL; this gate only measures that
       whatever was built exports watertight. The scope is printed beside
       each capability row so a reader of a green run sees it next to the
       claim, and connectedness is a separate gate again.

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
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, applyCapability, exportStl, analyzeStl, buildMatrix, CAPABILITY_SCOPE, formAssertions, FORM_SCOPE,
         thicknessAssertions, THICKNESS_SCOPE, junctionAssertions, JUNCTION_SCOPE, zygoAssertions, ZYGO_SCOPE, exportFloorAssertion } from './bloom-harness.mjs';

const NEGATIVE_CONTROL = process.argv.includes('--negative-control');
/* --only <substring> — run just the rows whose label contains it. A
   DIAGNOSTIC filter for positive-control work and nothing else: it is never
   used by CI, and a filtered run is NEVER a gate pass. Every filtered run
   says so on its own last line, because "the rows I chose to look at were
   clean" and "the gate passed" are different claims and this project has
   already reported one as the other once (the continuous-arm connectedness
   measurement that self-reported HARNESS INVALID). */
const ONLY = (() => { const i = process.argv.indexOf('--only'); return i >= 0 ? process.argv[i + 1] : null; })();

const rows = ONLY ? buildMatrix().filter((r) => r.label.includes(ONLY)) : buildMatrix();
if (ONLY && !rows.length) { console.error(`--only ${JSON.stringify(ONLY)} matched no row`); process.exit(2); }
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
  /* The capability is invisible to fullStateDrift (it is not a registry
     control), so it carries its own read-back AND its structural assertion.
     This also asserts the NEGATIVE on every ordinary row: no capability may
     be live on a row that did not ask for one. */
  const cap = await applyCapability(page, row);
  if (cap.length) { validity.push(`${row.label}: ${cap.join('; ')}`); continue; }
  /* THE FORM ASSERTIONS, on EVERY row rather than only the form rows. Both
     directions matter: a form row must report the form it names, and a flat
     row must report none — the guard not short-circuiting is the failure
     that would quietly cost byte-identity. Foot invariance is asserted
     everywhere because the junction is everywhere. */
  const frm = await formAssertions(page, row);
  if (frm.length) { validity.push(`${row.label}: ${frm.join('; ')}`); continue; }
  /* THE THICKNESS ASSERTIONS, on EVERY row for the same reason as the form
     ones: the foot is everywhere, the guard's both-directions read-back is
     what byte-identity rests on, and both of this gate's own measures are
     structurally blind to a thickness bug (fixed topology, and a thinner
     sheet is still spanned by a hub built at the same thickness). */
  const thk = await thicknessAssertions(page, row);
  if (thk.length) { validity.push(`${row.label}: ${thk.join('; ')}`); continue; }
  /* THE JUNCTION ASSERTIONS, on EVERY row, and THIS GATE CANNOT SUBSTITUTE
     FOR THEM — measured, not supposed. Building the hub at the wrong layer's
     radius leaves the outer whorl joined to nothing and this gate reports ONE
     region, 0% detached, on all five configurations it was tried on: the foot
     annuli overlap each other, so connectedness under layers is
     over-determined. A lifted layer is detached by derivation at 1.20 mm and
     does not split the flood fill until roughly 2.5 mm. J1-J4 carry what the
     bytes cannot show.
     AND UNDER THE CONTINUOUS SPIRAL, NEITHER STL GATE NOR J1-J4 CAN SEE THE
     ONE FAILURE THAT MODE INTRODUCES: continuous placement silently building
     rings exports watertight, exports as one connected piece, carries the
     identical triangle count, and passes J1, J2, J3 and J4 on every row —
     it even passes the multiples-of-n identity, since floor(m*n/n) is m.
     J5 (no two consecutive slots share a ring) and J6 (the quantizer
     identity, an exact equality computed in footRing) are what observe it. */
  const jct = await junctionAssertions(page, row);
  if (jct.length) { validity.push(`${row.label}: ${jct.join('; ')}`); continue; }
  /* ZYGOMORPHY (Z1-Z3). Both STL gates are structurally blind to the whole
     layer — measured on three worktrees before these assertions existed, not
     derived: the wrong role, a record that never reaches the blade, and the
     area rule regrouped per foot ALL export watertight, at an identical
     triangle count and an identical byte length. See zygoAssertions()'s
     header for the table. */
  const zyg = await zygoAssertions(page, row);
  if (zyg.length) { validity.push(`${row.label}: ${zyg.join('; ')}`); continue; }
  const buf = await exportStl(page, tmp);
  if (!buf) { validity.push(`${row.label}: no STL download`); continue; }
  /* THE EXPORT FLOOR, read from the app's own post-export read-out — the
     live build never floors, so no live metric can answer this. */
  const flr = await exportFloorAssertion(page);
  if (flr.length) { validity.push(`${row.label}: ${flr.join('; ')}`); continue; }
  const fm = await page.evaluate(() => window.__bloomMetrics());
  results.push({
    label: row.label, capability: !!row.capability, bytes: buf.length,
    /* LIVE count beside the EXPORT count, per row. The charter's claim that
       the export floor cannot move triangle counts here rests on every
       primitive being a fixed-topology grid — NU, NV, the panel count and
       every centre segment count depend on no control — and the thickness
       layer is the first change that makes the floor actually BIND, so the
       claim stops being free. Measured on every row rather than quoted: the
       floor now changes geometry, and this is what says it still does not
       change topology. `liveTris` comes from the app's last LIVE build;
       `tris` is parsed from the exported STL's own header. */
    liveTris: fm.liveTris,
    /* THE THICKNESS NUMBERS TRAVEL WITH THE ROW, so a green run is a record
       of where the clamps bound rather than only that nothing broke — and
       every figure carries its mode, because live and export geometry are no
       longer the same thing. */
    thickness: fm.petalThickness
      ? `sheet ${fm.petalThickness.authored.toFixed(2)} mm · tip ${fm.petalThickness.tipAuthored.toFixed(2)} mm (live)`
        + `${fm.petalThickness.floorBinds ? ` → ${(1.0).toFixed(2)} mm (CLAMPED at export)` : ''}`
        + ` · foot ${fm.ringWidth.toFixed(2)} mm${fm.ringWidthClamped ? ' (CLAMPED)' : ''}`
        + ` · ring ${fm.ringRadius.toFixed(2)} mm (live)`
      : null,
    /* The form numbers travel WITH the row's result, so a green run is a
       record of what was measured rather than only that it passed. */
    form: fm.petalForm
      ? `roll radius ${isFinite(fm.petalForm.rollRadiusMm) ? fm.petalForm.rollRadiusMm.toFixed(2) + ' mm' : 'flat'}`
        + `${fm.petalForm.rollClamped ? ' (CLAMPED)' : ''}`
        + ` · |dP/dv|/h ${fm.petalForm.metricMin.toFixed(4)}..${fm.petalForm.metricMax.toFixed(4)}`
      : null,
    ...analyzeStl(buf),
  });
}
await browser.close();
server.close();
fs.rmSync(tmp, { recursive: true, force: true });

console.log('export gate: pass criterion is boundary === 0, nothing else. nonManifold and shells are unrated diagnostics.\n');
const failures = [], countMoved = [], degenerates = [];
for (const r of results) {
  const ok = r.boundary === 0;
  if (!ok) failures.push(r);
  if (r.liveTris !== r.tris) countMoved.push(r);
  if (r.degenerate !== 0) degenerates.push(r);
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${r.label.padEnd(46)} tris(live)=${String(r.liveTris).padStart(6)} tris(export)=${String(r.tris).padStart(6)} boundary=${r.boundary} degenerate=${r.degenerate} nonManifold=${r.nonManifold} (unrated) shells=${r.shells} (unrated) ${(r.bytes / 1024).toFixed(0)} KiB`);
  if (r.capability) console.log(`       ^ SCOPE: ${CAPABILITY_SCOPE}`);
  if (r.form) console.log(`       ^ FORM: ${r.form} · SCOPE: ${FORM_SCOPE}`);
  if (r.thickness) console.log(`       ^ THICKNESS: ${r.thickness} · SCOPE: ${THICKNESS_SCOPE}`);
}
console.log(`\n${results.length - failures.length}/${results.length} configs watertight (boundary = 0); ${((Date.now() - t0) / 1000).toFixed(0)}s`);
console.log(`${results.length - countMoved.length}/${results.length} configs have IDENTICAL live and export triangle counts (the floor changes geometry, never topology)`);
console.log(`${results.length - degenerates.length}/${results.length} configs emit NO degenerate triangles (the converging tip cap's apex, and the DOME's before it)`);
console.log(`JUNCTION SCOPE: ${JUNCTION_SCOPE}`);
console.log(`ZYGOMORPHY SCOPE: ${ZYGO_SCOPE}`);
if (ONLY) console.log(`\nFILTERED RUN — --only ${JSON.stringify(ONLY)} selected ${rows.length} of ${buildMatrix().length} rows. THIS IS NOT A GATE PASS; it is a measurement of the rows named.`);

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
/* A zero-area triangle encloses no volume while still contributing to the
   edge census, so it can put an unexplained number in the unrated nonManifold
   column — the DOME's defect, which passed the gated criterion for months
   while being wrong. A converging tip cap is the same construction, so this is
   rated rather than reported. */
if (degenerates.length) {
  bad = true;
  console.error(`\nexport gate: FAIL — ${degenerates.length} config(s) emit degenerate (zero-area) triangles:`);
  for (const f of degenerates) console.error(`  - ${f.label}: degenerate=${f.degenerate} of ${f.tris} (export)`);
}
/* A count that moved between modes means the fixed-topology premise is false
   somewhere, which is a finding about the model rather than about this row —
   the flower's floor moves features across a size threshold and adds or
   removes tube segments, and the bloom is supposed to have no such mechanism.
   Reported as its own failure rather than folded into the boundary criterion,
   because it is a different property and this gate's pass criterion is stated
   as boundary === 0 and nothing else. */
if (countMoved.length) {
  bad = true;
  console.error(`\nexport gate: FAIL — ${countMoved.length} config(s) have DIFFERENT live and export triangle counts. The export floor is meant to change geometry and never topology:`);
  for (const f of countMoved) console.error(`  - ${f.label}: tris(live)=${f.liveTris} tris(export)=${f.tris}`);
}
if (NEGATIVE_CONTROL) {
  if (bad) { console.log('\nNEGATIVE CONTROL: PASS — the harness rejected the clamped value, as it must.'); process.exit(0); }
  console.error('\nNEGATIVE CONTROL: FAILED — the harness accepted a value the browser rewrote. The read-back is not measuring anything.');
  process.exit(1);
}
if (bad) process.exit(1);
console.log('export gate: PASS — every config above exports watertight.');
