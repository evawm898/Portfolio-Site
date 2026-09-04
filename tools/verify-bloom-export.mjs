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
         thicknessAssertions, THICKNESS_SCOPE, junctionAssertions, JUNCTION_SCOPE, zygoAssertions, ZYGO_SCOPE, exportFloorAssertion, shownModeAssertion, curlAssertions, CURL_SCOPE } from './bloom-harness.mjs';
import { footCrowding, crowdingLine, crowdingCoverage, CROWDING_SCOPE } from './bloom-crowding.mjs';
import { measure as planCoverage, coverageLine, coverageAssert } from './bloom-plan-coverage.mjs';
import { spineLine, curlCoverage } from './bloom-harness.mjs';

const NEGATIVE_CONTROL = process.argv.includes('--negative-control');
/* `--only <regex>` (session 16): run the rows whose LABEL matches, for a
   smoke pass on a wiring change before the full matrix. The summary still
   counts what actually ran; a filtered run is never quoted as a pass of the
   matrix. */
const ONLY = process.argv.includes('--only') ? new RegExp(process.argv[process.argv.indexOf('--only') + 1]) : null;

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
  if (ONLY && !ONLY.test(row.label)) continue;
  await openBloom(page, port);   // fresh page per row — isolation by reload, not by a clear-list
  const bad = await applyConfig(page, row.set);
  if (bad.length) { validity.push(`${row.label}: config did not take: ${bad.join('; ')}`); continue; }
  const drift = await fullStateDrift(page, row.set);
  if (drift.length) { validity.push(`${row.label}: state is not DEFAULTS+set: ${drift.join('; ')}`); continue; }
  /* THE VIEWPORT MUST BE SHOWING LIVE GEOMETRY (Sep 3, the print-preview
     toggle). The toggle is view chrome and invisible to the registry
     read-back above, yet every "(live)" number this gate prints — liveTris,
     the hub radius, the rings the J and Z assertions read — is the build on
     screen. A row measured with the preview on would be a row measuring a
     design it does not name, so the mode is read back from the app's own
     metrics and a mismatch fails the RUN. */
  const shown = await shownModeAssertion(page, 'live');
  if (shown.length) { validity.push(`${row.label}: ${shown.join('; ')}`); continue; }
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
  /* THE CURL FAMILY (C1-C3, session 16) — read from the builder's own
     emitted spine rows against the law rebuilt from OTHER owners. Both STL
     gates, J1-J9, form, thickness and Z1-Z9 are all blind to a spine that
     keeps the arc while curl bias / curl start are wired: that state is
     BIT-IDENTICAL to the un-biased bloom (Mutant A, measured Sep 4). C1 is
     its only witness; C2 is the integrator's own validity; C3 the spine
     floor in both directions. The SELF-CONTACT clearance is a flag, printed,
     never asserted. */
  const crl = await curlAssertions(page, row);
  if (crl.length) { validity.push(`${row.label}: ${crl.join('; ')}`); continue; }
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
  const stl = analyzeStl(buf);
  /* FOOT CROWDING — a FLAG, never a gate (Eva, Sep 3), and the one thing
     here that can see OVER-connection: 120 feet fused into one mass at the
     base add no boundary edge and split no flood fill, so every other
     measure in this file is green on it. Read from footRing()'s own
     export-mode rings in the page and registered against THIS row's STL
     header (R1); its five validity assertions are hard, the CROWDED mark is
     not. See bloom-crowding.mjs for what it is blind to. */
  const crowd = await footCrowding(page, row, stl);
  if (crowd.bad.length) { validity.push(`${row.label}: ${crowd.bad.join('; ')}`); continue; }
  /* PLAN COVERAGE (session 16, Eva Sep 4) — printed on EVERY row, ASSERTED
     only on rows that declare `coverage` (the pinned incurve rows): crown
     closure there is emergent, curl 150 x tilt x domeLean landing tips
     within 0.3-1.3 mm of the axis, with no margin, and nothing else here
     would see it re-open. A split whorl is out of the raster's scope and is
     a LABELLED, LOUD skip; a row that asserts coverage and is skipped fails. */
  const cov = await planCoverage(page, { capability: row.capability || null });
  if (cov.bad.length) { validity.push(`${row.label}: ${cov.bad.join('; ')}`); continue; }
  if (cov.skipped && row.coverage) { validity.push(`${row.label}: this row ASSERTS coverage but the raster skipped it — ${cov.skipped}`); continue; }
  if (!cov.skipped && row.coverage) {
    const ca = coverageAssert(cov.r, row.coverage);
    if (ca.length) { validity.push(`${row.label}: ${ca.join('; ')}`); continue; }
  }
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
    crowding: crowd.r,
    coverage: cov.r, coverageSkipped: cov.skipped || null, coverageAsserted: !!row.coverage,
    spine: fm.petalSpine, selfContact: !!(fm.petalSpine && fm.petalSpine.clearance.selfContact),
    ...stl,
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
  console.log(`       ^ ${crowdingLine(r.crowding)}`);
  console.log(`       ^ ${r.coverageSkipped ? 'COVERAGE: SKIPPED — ' + r.coverageSkipped : coverageLine(r.coverage) + (r.coverageAsserted ? ' · ASSERTED on this row' : '')}`);
  if (r.spine && r.spine.curlRad !== 0) console.log(`       ^ ${spineLine(r.spine)}`);
}
console.log(`\n${results.length - failures.length}/${results.length} configs watertight (boundary = 0); ${((Date.now() - t0) / 1000).toFixed(0)}s`);
console.log(`${results.length - countMoved.length}/${results.length} configs have IDENTICAL live and export triangle counts (the floor changes geometry, never topology)`);
console.log(`${results.length - degenerates.length}/${results.length} configs emit NO degenerate triangles (the converging tip cap's apex, and the DOME's before it)`);
console.log(`JUNCTION SCOPE: ${JUNCTION_SCOPE}`);
console.log(`ZYGOMORPHY SCOPE: ${ZYGO_SCOPE}`);
const crowdedRows = results.filter((r) => r.crowding.crowded);
console.log(`${crowdedRows.length}/${results.length} configs FLAGGED CROWDED (a flag, not a failure) · CROWDING SCOPE: ${CROWDING_SCOPE}`);
/* THE FLAG IN BOTH DIRECTIONS, at matrix level: a matrix on which the flag
   never raises has never shown the flag works, and one on which it always
   raises has a stuck flag. Validity, not a row result. */
/* MATRIX-LEVEL claims (a flag raised somewhere, an asserted row somewhere)
   are claims about the MATRIX, so a filtered `--only` run does not make them. */
if (!NEGATIVE_CONTROL && !ONLY) validity.push(...crowdingCoverage(results.map((r) => r.crowding)));
/* THE SELF-CONTACT FLAG, both directions at matrix level (session 16). */
if (!NEGATIVE_CONTROL && !ONLY) validity.push(...curlCoverage(results.map((r) => ({ selfContact: r.selfContact }))));
{
  const skipped = results.filter((r) => r.coverageSkipped), asserted = results.filter((r) => r.coverageAsserted);
  console.log(`${results.length - skipped.length}/${results.length} rows plan-coverage measured; ${skipped.length} SKIPPED (split whorls — labelled, never silent); ${asserted.length} rows coverage-ASSERTED (the pinned incurve rows); ${results.filter((r) => r.selfContact).length} rows flag SELF-CONTACT`);
  for (const r of skipped) console.log(`  skipped: ${r.label}`);
  if (asserted.length === 0 && !NEGATIVE_CONTROL && !ONLY) validity.push('coverage coverage: no row in this matrix asserts plan coverage — the pinned incurve rows are missing');
}

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
