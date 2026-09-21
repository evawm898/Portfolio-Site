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
         lobeAssertions, LOBE_SCOPE, lobeResultLine,
         fringeAssertions,
         thicknessAssertions, THICKNESS_SCOPE, junctionAssertions, JUNCTION_SCOPE, zygoAssertions, ZYGO_SCOPE, exportFloorAssertion, exportRefusalAssertion, exportRefusedLine, exportRefusedCoverage, shownModeAssertion, curlAssertions, CURL_SCOPE,
         stamenAssertions, STAMEN_SCOPE, gynoeciumAssertions, GYNOECIUM_SCOPE,
         stemAssertions, STEM_SCOPE,
         leafAssertions, sepalAssertions, inflorescenceAssertions, varianceAssertions, LEAF_SCOPE } from './bloom-harness.mjs';
import { footCrowding, crowdingLine, crowdingCoverage, CROWDING_SCOPE } from './bloom-crowding.mjs';
import { stlPositions, orientationAssertions, selfIntersectionAssertions, selfIntersectionCoverage, selfIntersectionRefusedNote, selfIntersectionLine, orientationLine, SELF_INTERSECTION_XFAIL_HAS, SELF_INTERSECTION_XFAIL, SELF_INTERSECTION_TOLERANCE, ORIENTATION_SCOPE, SELF_INTERSECTION_SCOPE, stemChannelAssertions, STEM_CHANNEL_SCOPE } from './bloom-harness.mjs';
import { measure as sagitta, sagittaLine, SAGITTA_SCOPE } from './bloom-sagitta.mjs';
import { measure as planCoverage, coverageLine, coverageAssert } from './bloom-plan-coverage.mjs';
import { measure as solidCoverage, calibrate as solidCalibrate, calibrationLine, solidLine, solidAssert, solidHeadroom } from './bloom-solid-angle-coverage.mjs';
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
/* Rows the generator REFUSED to export, declared in EXPORT_REFUSED_XFAIL and
   asserted by XR1. Collected so the summary NAMES them with their figures —
   a declared row that went quiet would be the coverage loss a skip is. */
const refused = [];
const t0 = Date.now();

/* R6 — THE SOLID-ANGLE MEASURE'S CALIBRATION, once per run before any row
   (session 19, Eva): the cells sum to 4 pi, a closed sphere reads 0 sr open,
   three known cones read their analytic solid angle. A failure here is a
   failure of the RUN — every pin below is stated in steradians. */
{
  await openBloom(page, port);
  const { bad: cb, cal } = await solidCalibrate(page);
  console.log(`SOLID-ANGLE CALIBRATION (R6)\n    ${calibrationLine(cal)}`);
  if (cb.length) validity.push(`solid-angle calibration: ${cb.join('; ')}`);
}
/* EVERY ROW ATTEMPTED — see the connectedness gate's own note. A validity
   failure `continue`s out of this loop, so every ratio below divides by the
   SURVIVORS and a dropped row is invisible in all of them. */
const attempted = [];
for (const row of rows) {
  if (ONLY && !ONLY.test(row.label)) continue;
  attempted.push(row.label);
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
  /* LOBES (L0-L6, session 38) — see lobeAssertions()'s header. Both gates are
     blind to a cut in the wrong place or not made: it exports watertight and
     one piece either way. Rebuilt in Node from the page's own state. */
  const lob = await lobeAssertions(page, row);
  /* THE FRINGE (FR0-FR5, Sep 13) — see fringeAssertions()'s header. Both
     gates are structurally BLIND here: every tooth is its own closed panel
     overlapping the base, so a fringe with the wrong count, the wrong taper,
     the wrong split row or teeth under the printable floor exports
     watertight AND as one connected piece. */
  const frn = await fringeAssertions(page, row);
  if (lob.length) { validity.push(`${row.label}: ${lob.join('; ')}`); continue; }
  if (frn.length) { validity.push(`${row.label}: ${frn.join('; ')}`); continue; }
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
  /* THE ANDROECIUM (JS1-JS5, sessions 21 and 24), on EVERY row in both directions —
     absent where the state says absent (count 0, or SPHERE where it is
     hidden and inert), and where present: the root axis on the owner's
     normal through the full slab, containment, the overlap a solid read from
     the emitted root rings, the free-end census. This gate sees none of it:
     each tube and pill is its own closed solid. */
  const stm = await stamenAssertions(page, row);
  if (stm.length) { validity.push(`${row.label}: ${stm.join('; ')}`); continue; }
  /* THE GYNOECIUM (JG1-JG4, session 22) — see gynoeciumAssertions()'s
     header. The same blindness as the androecium's: the style's rod and its
     three lobes are each their own closed solid, so a style off the axis, a
     hairline root or a missing lobe reads as watertight and one piece. */
  const gyn = await gynoeciumAssertions(page, row);
  if (gyn.length) { validity.push(`${row.label}: ${gyn.join('; ')}`); continue; }
  /* THE STEM AND THE HUB-TO-STEM JOIN (ST0-ST6) — session 43. This gate is
     STRUCTURALLY BLIND to every claim in that family: the stem is a closed
     solid overlapping the hub, so a stem built off the axis, to the wrong
     length, with a bore that is not Eva's rule, rooted as a hairline, or with a
     join whose thickening is not the law it declares, ALL export watertight and
     as one piece. See stemAssertions()'s own header. */
  const stem = await stemAssertions(page, row);
  if (stem.length) { validity.push(`${row.label}: ${stem.join('; ')}`); continue; }
  /* LEAVES (LF0-LF7). Both STL gates are blind to the whole family by
     construction — a leaf declared and never built adds no boundary edge and
     detaches nothing; a petiole rooted on the AXIS of a hollow stem still
     reads ONE PIECE, measured, because a radial rod crosses the wall on its
     way out; and nothing here measures an azimuth, so a leaf set building the
     wrong phyllotaxy exports watertight at an identical triangle count. See
     leafAssertions()'s own header. */
  const leaf = await leafAssertions(page, row);
  if (leaf.length) { validity.push(`${row.label}: ${leaf.join('; ')}`); continue; }
  /* SEPALS (SP0-SP9, sepals part 1). Both STL gates are blind to the whole
     family by construction: a sepal whorl on the wrong ring, at the wrong
     azimuth, from the petal's controls, or clipping through a petal exports
     watertight and as one piece (a sepal through a petal is a cross-shell
     overlap). See sepalAssertions()'s own header. */
  const sep = await sepalAssertions(page, row);
  if (sep.length) { validity.push(`${row.label}: ${sep.join('; ')}`); continue; }
  /* THE INFLORESCENCE (ID0-ID6, this session). BOTH STL GATES ARE BLIND TO
     PLACEMENT BY CONSTRUCTION, and it is measured rather than argued: a
     raceme whose every floret is left at the ORIGIN is one closed watertight
     solid with the identical triangle count and the identical STL byte
     length, and the flood fill reads N heads piled on the rachis as one piece
     more readily than as the right ones. A rigid transform changes no edge
     census and splits no region. See inflorescenceAssertions()'s own
     header for what each of the seven sees. */
  const inflo = await inflorescenceAssertions(page, row);
  if (inflo.length) { validity.push(`${row.label}: ${inflo.join('; ')}`); continue; }
  /* ORGANIC VARIANCE, BUILD 1 — THE SIZE FIELD AND THE TOLD FLAG (VS0-VS5).
     Both STL gates are blind to the whole family by construction: a per-slot
     size factor moves vertices on a fixed lattice, so a field that never
     reaches the blade, a wrong law, a fan field that is not even and an
     aliasing flag that never fires all export watertight and as one piece at
     the identical triangle count. VS5 also holds the told flag to the
     builder's own record on EVERY row. See varianceAssertions()'s header. */
  const vs = await varianceAssertions(page, row);
  if (vs.length) { validity.push(`${row.label}: ${vs.join('; ')}`); continue; }
  /* ZYGOMORPHY (Z1-Z3). Both STL gates are structurally blind to the whole
     layer — measured on three worktrees before these assertions existed, not
     derived: the wrong role, a record that never reaches the blade, and the
     area rule regrouped per foot ALL export watertight, at an identical
     triangle count and an identical byte length. See zygoAssertions()'s
     header for the table. */
  const zyg = await zygoAssertions(page, row);
  if (zyg.length) { validity.push(`${row.label}: ${zyg.join('; ')}`); continue; }
  const buf = await exportStl(page, tmp);
  /* A REFUSAL IS NOT A BROKEN EXPORT (XR1/XR2, Eva's ruling Sep 13) — see
     exportRefusalAssertion()'s header. The generator refuses an over-budget
     model ON PURPOSE, and the bare "no STL download" could not tell that from
     the export breaking. A declared row must refuse, for the budget, with a
     count over it; an undeclared one must export; and a declared row that
     starts exporting fails as hard as one that refuses wrongly. */
  const ref = await exportRefusalAssertion(page, row, !!buf);
  if (ref.bad.length) { validity.push(`${row.label}: ${ref.bad.join('; ')}`); continue; }
  if (!buf) { refused.push({ label: row.label, ...ref.r }); console.log(`  ${exportRefusedLine(row.label, ref.r)}`); continue; }
  /* THE EXPORT FLOOR, read from the app's own post-export read-out — the
     live build never floors, so no live metric can answer this. */
  const flr = await exportFloorAssertion(page);
  if (flr.length) { validity.push(`${row.label}: ${flr.join('; ')}`); continue; }
  const stl = analyzeStl(buf);
  /* ORIENTATION (O1-O2) AND THE SELF-INTERSECTION CENSUS (X1-X2), session
     36 — see their header in bloom-harness.mjs. Read from THIS row's STL
     bytes. Both are things this gate is structurally blind to: an inside-out
     petal and a petal folded through itself are watertight and one piece. */
  const stlPos = stlPositions(buf);
  /* THE HEAD AND THE STEM'S OWN CAVITY, both read from the build's own record:
     O1's declared-inward baseline is a count derived from what this state
     actually builds, never from the head shape alone. `cavity` is non-null iff
     the bore SURVIVES its two closures — a solid stem, a stem at length 0 and
     a stem whose closures meet all leave it null, which is the inertness half
     of the tip-plug ruling arriving in the orientation gate. */
  const ori = orientationAssertions(stlPos, row, await page.evaluate(() => {
    const m = window.__bloomMetrics(), S = m.stem;
    return {
      sphere: m.sphereMode === true,
      /* A SEPARATE INWARD SHELL NEEDS BOTH ENDS SHUT IN THE MESH, which is
         narrower than "the bore survives" and was corrected by measurement:
         O1 read `0 of 10 shells are wound INWARD` against a baseline of 1 on
         every FLAT-hub stem. Where there is no root band the bore is a BLIND
         HOLE — its wall reaches the top face and welds to the outer shell
         through the annulus there, so the stem stays ONE shell. It is only
         where a root band shuts the top as well that the bore's wall shares no
         vertex with anything and becomes its own closed surface. (The PART is
         sealed either way once a slicer unions the hub over the blind hole's
         mouth; this is about what the exported MESH's shells are.) */
      cavity: S && S.voidMm > 0 && S.solidBandMm > 0 && S.tipPlugMm > 0
        ? { boreR: S.boreR, voidMm: S.voidMm, sides: S.sides } : null,
      /* THE FLORETS' OWN INNER FACES. A floret IS a bloom, so it declares
         them by the same two conditions the head does, read off the floret's
         own build record — and O1's baseline is a count over the FILE, so N
         florets multiply it. Every floret on a build is the same unit under a
         different matrix (ID5 measures that as an exact zero), which is why
         one record describes all of them. */
      florets: (() => {
        const B = m.inflorescenceBuilt, U = B && B.unit;
        if (!B || !U) return null;
        return {
          count: B.count,
          sphere: U.sphereMode === true,
          cavity: U.stemVoidMm > 0 && U.stemSolidBandMm > 0 && U.stemTipPlugMm > 0,
        };
      })(),
    };
  }));
  if (ori.bad.length) { validity.push(`${row.label}: ${ori.bad.join('; ')}`); continue; }
  /* ST9 — THE STEM CHANNEL, read from THIS row's STL bytes. ST7 asks the stem
     channel whether the stem channel fired, which is the circularity Eva's
     fourth durable rule is about; this asks the FILE. See STEM_CHANNEL_SCOPE. */
  const chan = stemChannelAssertions(stlPos, row,
    await page.evaluate(() => window.__bloomMetrics()),
    await page.evaluate(() => window.__bloomUIState()));
  if (chan.length) { validity.push(`${row.label}: ${chan.join('; ')}`); continue; }
  const sx = await selfIntersectionAssertions(page, buf, row);
  if (sx.bad.length) { validity.push(`${row.label}: ${sx.bad.join('; ')}`); continue; }
  /* FOOT CROWDING — a FLAG, never a gate (Eva, Sep 3), and the one thing
     here that can see OVER-connection: 120 feet fused into one mass at the
     base add no boundary edge and split no flood fill, so every other
     measure in this file is green on it. Read from footRing()'s own
     export-mode rings in the page and registered against THIS row's STL
     header (R1); its five validity assertions are hard, the CROWDED mark is
     not. See bloom-crowding.mjs for what it is blind to. */
  const crowd = await footCrowding(page, row, stl);
  if (crowd.bad.length) { validity.push(`${row.label}: ${crowd.bad.join('; ')}`); continue; }
  /* THE OUTLINE SAGITTA (session 32) — a REPORT on every row, never a gate:
     no bound has been ruled, and the one number this could be bounded against
     today is the ROOT BLEND's, which is footRing()'s boundary and its own
     scheduled session. It is here rather than in a sixth workflow because it
     costs nothing extra: the page is already built and the profile is already
     the builder's own. Its `skipped` is LOUD and labelled — a row whose
     rebuilt profile is not the builder's is measuring a different flower, and
     must say so rather than print a plausible number. See bloom-sagitta.mjs
     for the three defects its own draft had and what it is blind to. */
  const sag = await sagitta(page, row);
  /* PLAN COVERAGE (session 16, Eva Sep 4) — printed on EVERY row, ASSERTED
     only on rows that declare `coverage` (the pinned incurve rows): crown
     closure there is emergent, curl 150 x tilt x domeLean landing tips
     within 0.3-1.3 mm of the axis, with no margin, and nothing else here
     would see it re-open. A split whorl is out of the raster's scope and is
     a LABELLED, LOUD skip; a row that asserts coverage and is skipped fails. */
  const cov = await planCoverage(page, { capability: row.capability || null });
  if (cov.bad.length) { validity.push(`${row.label}: ${cov.bad.join('; ')}`); continue; }
  /* THE SPHERE MUST BE A LOUD SKIP (session 18, Eva's hard requirement): a
     plan raster reads a full sphere as a FALSE CLEAN (the far hemisphere
     projects into the disc from below), so a SPHERE row that emits ANY
     plan-coverage number fails the RUN. Decided against the APP's own
     sphereMode (footRing()'s flag through the metrics hook), never against
     the tool's answer alone — a tool that forgot to skip would also forget
     to say `sphere`. And in the other direction: a row the app says is not a
     sphere may not be skipped as one. */
  const isSphere = await page.evaluate(() => window.__bloomMetrics().sphereMode === true);
  if (isSphere && (cov.r !== null || !cov.skipped || cov.sphere !== true)) { validity.push(`${row.label}: COVERAGE: a FULL-SPHERE row emitted a plan-coverage reading (${JSON.stringify(cov.r)}) — a plan raster reads a sphere as a FALSE CLEAN; SPHERE rows must be a labelled skip`); continue; }
  if (!isSphere && cov.sphere === true) { validity.push(`${row.label}: COVERAGE: the raster skipped this row as a sphere while the app reports sphereMode false`); continue; }
  if (cov.skipped && row.coverage) { validity.push(`${row.label}: this row ASSERTS coverage but the raster skipped it — ${cov.skipped}`); continue; }
  if (!cov.skipped && row.coverage) {
    const ca = coverageAssert(cov.r, row.coverage);
    if (ca.length) { validity.push(`${row.label}: ${ca.join('; ')}`); continue; }
  }
  /* SOLID-ANGLE COVERAGE (session 19, Eva's ruling) — the sphere's own
     instrument, a sibling of the plan raster: rays from footRing()'s own
     sphere centre. Printed on every row with a centre (a FLAT row is its
     labelled skip, the mirror of the plan raster's sphere skip — and R5,
     the parallel-ray identity against the plan raster, runs on flat rows
     too); ASSERTED on the rows that declare `solidCoverage` (block 22, the
     rows Eva pinned); a SPHERE row this instrument skips is a validity
     failure, because a sphere row with no coverage instrument is the hole
     the loud skip was cut for. The plan raster's sphere skip above STAYS:
     a plan raster cannot read a sphere. The mapped comparison is not run
     here (a reported number of the standalone tool, ruled ill-posed). */
  const sol = await solidCoverage(page, { capability: row.capability || null, plan: cov.r, mapped: false });
  if (sol.bad.length) { validity.push(`${row.label}: ${sol.bad.join('; ')}`); continue; }
  if (isSphere && (sol.skipped || !sol.r)) { validity.push(`${row.label}: SOLID COVERAGE: a FULL-SPHERE row was not read by the solid-angle instrument — ${sol.skipped || 'no reading'}`); continue; }
  if (sol.skipped && row.solidCoverage) { validity.push(`${row.label}: this row ASSERTS solid coverage but the instrument skipped it — ${sol.skipped}`); continue; }
  let solidHead = null;
  if (!sol.skipped && row.solidCoverage) {
    const sa = solidAssert(sol.r, row.solidCoverage);
    if (sa.length) { validity.push(`${row.label}: ${sa.join('; ')}`); continue; }
    solidHead = solidHeadroom(sol.r, row.solidCoverage);
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
    lobes: fm.petalLobes || null,
    solidCensus: sx.r, orientation: ori.r,
    sagitta: sag,
    coverage: cov.r, coverageSkipped: cov.skipped || null, coverageAsserted: !!row.coverage, sphere: isSphere,
    solid: sol.r, solidSkipped: sol.skipped || null, solidAsserted: !!row.solidCoverage, solidHead, solidR5: sol.r ? sol.r.r5 : (sol.r5 || null),
    spine: fm.petalRingSpine, selfContact: (fm.petalRingSpine || []).some((s) => s && s.clearance.selfContact), underFloor: (fm.petalRingSpine || []).some((s) => s && s.underFloor),
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
  if (r.lobes) console.log(`       ^ ${lobeResultLine(r.lobes)} · SCOPE: ${LOBE_SCOPE}`);
  console.log(`       ^ ${crowdingLine(r.crowding)}`);
  console.log(`       ^ ${orientationLine(r.orientation)}`);
  console.log(`       ^ ${selfIntersectionLine(r.solidCensus)}${SELF_INTERSECTION_XFAIL_HAS(r.label) ? ` · XFAIL (declared at ${SELF_INTERSECTION_XFAIL[r.label].pairs} pairs / ${SELF_INTERSECTION_XFAIL[r.label].worstMm.toFixed(4)} mm, still failing at that magnitude — X1)` : ''}`);
  console.log(`       ^ ${sagittaLine(r.sagitta)}`);
  console.log(`       ^ ${r.coverageSkipped ? 'COVERAGE: SKIPPED — ' + r.coverageSkipped : coverageLine(r.coverage) + (r.coverageAsserted ? ' · ASSERTED on this row' : '')}`);
  console.log(`       ^ SOLID: ${r.solidSkipped ? 'SKIPPED — ' + r.solidSkipped : solidLine(r.solid).replace(/\n    /g, '\n         ') + (r.solidAsserted ? '\n         ASSERTED on this row: ' + r.solidHead.join(' · ') : '')}`);
  if (r.spine && r.spine.some((s) => s && s.curlRad !== 0)) console.log(`       ^ ${spineLine(r.spine)}`);
}
/* THE ROWS THE GENERATOR REFUSED, NAMED WITH THEIR FIGURES (XR1, Eva's ruling
   Sep 13). A declared refusal is neither a pass nor a skip — it is an ASSERTED
   outcome — and it is printed on every run with its count so the row can never
   go quiet, which is precisely the coverage loss a skip would have been. */
for (const rr of refused) console.log(`\n${exportRefusedLine(rr.label, rr)}`);
if (!NEGATIVE_CONTROL && !ONLY) validity.push(...exportRefusedCoverage(attempted));

/* THE DENOMINATOR ITSELF, asserted — and the three real populations printed
   beside it (#220). Every ratio in this summary divides by `results.length`,
   which is the SURVIVORS of the validity assertions, so a dropped row shrinks
   BOTH sides of seven ratios at once and each of them still reads as a clean
   pass. The matrix count was never printed to compare them against. */
const got = new Set(results.map((r) => r.label));
/* A DECLARED REFUSAL IS NOT A DROPPED ROW (XR1). It reached no `results`
   entry because there is no STL to analyse, but it is an ASSERTED outcome
   rather than a row the gate lost — so it is excluded from the census and
   named on its own line instead, which is what keeps it from going quiet. */
const refusedLabels = new Set(refused.map((r) => r.label));
const dropped = attempted.filter((l) => !got.has(l) && !refusedLabels.has(l));
if (dropped.length) validity.push(`row census: ${attempted.length} rows attempted but ${results.length} reached the results — dropped: ${dropped.join(', ')}`);
console.log(`\nROWS: ${attempted.length} attempted · ${results.length} reached the results · ${results.length - failures.length} watertight (boundary = 0)`
  + (refused.length ? ` · ${refused.length} EXPORT REFUSED by the generator's own triangle budget (declared, asserted by XR1 — not a pass and not a skip)` : '')
  + (dropped.length ? ` · ${dropped.length} DROPPED by a validity assertion — NOT a pass` : '')
  + `; ${((Date.now() - t0) / 1000).toFixed(0)}s`);
if (dropped.length) console.log(`  ^ every ratio below divides by the ${results.length} row(s) that SURVIVED, not by the ${attempted.length} in the matrix.`);
console.log(`${results.length - countMoved.length}/${results.length} measured configs have IDENTICAL live and export triangle counts (the floor changes geometry, never topology)`);
console.log(`${results.length - degenerates.length}/${results.length} measured configs emit NO degenerate triangles (the converging tip cap's apex, and the DOME's before it)`);
console.log(`JUNCTION SCOPE: ${JUNCTION_SCOPE}`);
console.log(`ORIENTATION SCOPE: ${ORIENTATION_SCOPE}`);
console.log(`SELF-INTERSECTION SCOPE: ${SELF_INTERSECTION_SCOPE}`);
{
  const xf = results.filter((r) => SELF_INTERSECTION_XFAIL_HAS(r.label)).length;
  console.log(`${results.length - xf}/${results.length} configs free of within-shell self-intersection; ${xf} declared XFAIL (each still failing at its RECORDED magnitude — the pair count exactly, the worst span within ±${SELF_INTERSECTION_TOLERANCE.worstMm} mm — asserted by X1) · ${results.filter((r) => r.orientation.inward === r.orientation.declaredInward).length}/${results.length} configs meeting the orientation baseline O1 itself declared for them (every shell outward, plus the SPHERE hub's inner face, the stem bore's own sealed cavity, and every FLORET's own two where each exists)`);
}
console.log(`ZYGOMORPHY SCOPE: ${ZYGO_SCOPE}`);
console.log(`ANDROECIUM SCOPE: ${STAMEN_SCOPE}`);
console.log(`GYNOECIUM SCOPE: ${GYNOECIUM_SCOPE}`);
console.log(`STEM SCOPE: ${STEM_SCOPE}`);
console.log(`STEM CHANNEL SCOPE: ${STEM_CHANNEL_SCOPE}`);
const crowdedRows = results.filter((r) => r.crowding.crowded);
console.log(`${crowdedRows.length}/${results.length} configs FLAGGED CROWDED (a flag, not a failure) · CROWDING SCOPE: ${CROWDING_SCOPE}`);
/* THE SAGITTA SUMMARY — a REPORT, and the worst is named with WHERE it sits,
   because base and apex are different problems with different owners. */
{
  const sg = results.map((r) => r.sagitta).filter((x) => x && !x.skipped);
  const sk = results.filter((r) => r.sagitta && r.sagitta.skipped).length;
  if (sg.length) {
    let w = { d: -1 };
    for (const x of sg) if (x.worst.d > w.d) w = x.worst;
    const mx = (z) => sg.reduce((a, x) => Math.max(a, x.zone[z]), -1);
    console.log(`${sg.length}/${results.length} rows sagitta-measured (${sk} skipped, labelled) · worst ${w.d.toFixed(4)} mm at u=${w.u.toFixed(3)} (${w.zone}) · by zone: base ${mx('base').toFixed(4)} middle ${mx('middle').toFixed(4)} apex ${mx('apex').toFixed(4)} mm`);
    console.log(`  ${SAGITTA_SCOPE}`);
  }
}
/* THE FLAG IN BOTH DIRECTIONS, at matrix level: a matrix on which the flag
   never raises has never shown the flag works, and one on which it always
   raises has a stuck flag. Validity, not a row result. */
/* MATRIX-LEVEL claims (a flag raised somewhere, an asserted row somewhere)
   are claims about the MATRIX, so a filtered `--only` run does not make them. */
if (!NEGATIVE_CONTROL && !ONLY) validity.push(...crowdingCoverage(results.map((r) => r.crowding)));
if (!NEGATIVE_CONTROL && !ONLY) validity.push(...selfIntersectionCoverage(results.map((r) => r.label), refused.map((r) => r.label)));
{ const note = selfIntersectionRefusedNote(refused.map((r) => r.label)); if (note) console.log(note); }
/* THE SELF-CONTACT FLAG, both directions at matrix level (session 16). */
if (!NEGATIVE_CONTROL && !ONLY) validity.push(...curlCoverage(results.map((r) => ({ selfContact: r.selfContact }))));
{
  const skipped = results.filter((r) => r.coverageSkipped), asserted = results.filter((r) => r.coverageAsserted);
  console.log(`${results.length - skipped.length}/${results.length} rows plan-coverage measured; ${skipped.length} SKIPPED (split whorls — labelled, never silent); ${asserted.length} rows coverage-ASSERTED (the pinned incurve rows); ${results.filter((r) => r.selfContact).length} rows flag SELF-CONTACT; ${results.filter((r) => r.underFloor).length} rows carry a shipped uniform arc UNDER ONE SHEET THICKNESS (told, not clamped)`);
  for (const r of skipped) console.log(`  skipped: ${r.label}`);
  if (asserted.length === 0 && !NEGATIVE_CONTROL && !ONLY) validity.push('coverage coverage: no row in this matrix asserts plan coverage — the pinned incurve rows are missing');
  /* THE SPHERE SKIP IN BOTH DIRECTIONS, at matrix level (session 18): at
     least one SPHERE row was skipped as one (the skip has been seen to
     happen), and at least one non-sphere row was measured (the skip is not
     stuck on). */
  const spheres = results.filter((r) => r.sphere);
  const solidMeasured = results.filter((r) => r.solid), solidAsserted = results.filter((r) => r.solidAsserted);
  console.log(`${spheres.length}/${results.length} rows are FULL-SPHERE heads — every one a labelled PLAN-coverage skip (a plan raster reads a sphere as a false clean) and every one READ by the solid-angle instrument; ${solidMeasured.length}/${results.length} rows solid-angle measured (the rest FLAT, labelled), ${solidAsserted.length} rows solid-coverage-ASSERTED (the rows Eva pinned, session 19), R5 mismatches across every row: ${results.reduce((a, r) => a + ((r.solidR5 && r.solidR5.mismatch) || 0), 0)}`);
  if (!NEGATIVE_CONTROL && !ONLY) {
    if (spheres.length === 0) validity.push('coverage coverage: no row in this matrix is a FULL-SPHERE head — the loud skip is unexercised (a default is not coverage; block 22 is missing)');
    if (results.length - skipped.length === 0) validity.push('coverage coverage: every row was skipped — the raster measured nothing');
    if (solidAsserted.length === 0) validity.push('coverage coverage: no row in this matrix asserts SOLID coverage — the pinned SPHERE rows are missing');
    if (solidMeasured.length === 0) validity.push('coverage coverage: no row was solid-angle measured — the instrument read nothing');
  }
}

let bad = false;
if (validity.length) {
  bad = true;
  /* THE POINTER GOES TO STDOUT — stderr is unbuffered and stdout is block
     buffered, so in a combined CI log this block flushes EARLIER than the
     summary it follows. The detail stays here; that there IS detail belongs
     in the stream carrying the summary. */
  console.log(`\nexport gate: ${validity.length} VALIDITY ASSERTION(S) FAILED — see the "HARNESS INVALID" block (stderr; it may appear ABOVE this line in a combined log).`);
  console.error(`\nexport gate: HARNESS INVALID — ${validity.length} validity assertion(s) failed. No result above is trustworthy.`);
  for (const v of validity) console.error(`  - ${v}`);
}
if (failures.length) {
  bad = true;
  console.log(`\nexport gate: ${failures.length} CONFIG(S) NOT WATERTIGHT — see the detail on stderr.`);
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
  console.log(`\nexport gate: ${degenerates.length} CONFIG(S) EMIT DEGENERATE TRIANGLES — see the detail on stderr.`);
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
  console.log(`\nexport gate: ${countMoved.length} CONFIG(S) MOVED TRIANGLE COUNT BETWEEN MODES — see the detail on stderr.`);
  console.error(`\nexport gate: FAIL — ${countMoved.length} config(s) have DIFFERENT live and export triangle counts. The export floor is meant to change geometry and never topology:`);
  for (const f of countMoved) console.error(`  - ${f.label}: tris(live)=${f.liveTris} tris(export)=${f.tris}`);
}
if (NEGATIVE_CONTROL) {
  if (bad) { console.log('\nNEGATIVE CONTROL: PASS — the harness rejected the clamped value, as it must.'); process.exit(0); }
  console.error('\nNEGATIVE CONTROL: FAILED — the harness accepted a value the browser rewrote. The read-back is not measuring anything.');
  process.exit(1);
}
if (bad) {
  /* THE LAST LINE OF STDOUT MUST NEVER READ AS A PASS ON A FAILING RUN. */
  console.log(`\nexport gate: FAILED — ${dropped.length} row(s) dropped of ${attempted.length} attempted, ${validity.length} validity assertion(s), ${failures.length} not watertight, ${degenerates.length} with degenerate triangles, ${countMoved.length} whose triangle count moved between modes. Nothing above is a pass.`);
  process.exit(1);
}
console.log(`\nexport gate: PASS — ${results.length} of ${attempted.length} attempted configs reached the results and every one exports watertight${refused.length ? `; ${refused.length} config(s) the generator REFUSED on its own triangle budget, declared and asserted by XR1 (named above) rather than skipped` : ''}.`);
