/* ===================================================================
   verify-bloom-connectedness.mjs — is the exported bloom ONE printed piece?

   WHY A SEPARATE GATE. The export gate measures MANIFOLDNESS (boundary edges
   = 0) and nothing else — and two entirely separate closed solids floating
   apart also have zero boundary edges. The bloom's invariant (charter:
   docs/bloom-charter.md) is ONE connected watertight solid at every slider
   position; "connected" needs its own measure.

   WHY THE OBVIOUS MEASURES DO NOT WORK — recorded here so nobody re-derives
   them; both dead ends cost the flower project real time (its gate's header
   is the primary record):
     - Vertex-weld shell count is NOT connectedness. This geometry is many
       individually-closed solids that interpenetrate WITHOUT sharing welded
       vertices; union-find over welded vertices reported 15–26,684 shells on
       healthy flower configs. A labelled diagnostic, never a gate.
     - An AABB-overlap graph is WORSE THAN NOTHING. Bounding boxes can
       overlap when the solids inside them do not, so it passes broken
       models — a gate that can only produce false negatives is more
       dangerous than no gate.
   Connectedness is volumetric, so the measure is volumetric.

   WHAT THIS MEASURES. Rasterise every export triangle into a voxel grid at
   CELL_MM = 0.6 — below the bloom's 1.0 mm minimum feature (itself an
   ASSUMPTION until a coupon is printed), so a genuine gap at printable scale
   cannot hide inside one cell — then 6-connected flood-fill the occupied
   voxels. One region: the slicer unions everything into one body. More than
   one: the print arrives in parts.

   SAMPLING. Barycentric triangle sampling at a QUARTER cell, not a half:
   the flower measured (its #96) that half-cell stepping derived from the
   longest edge leaves a thin oblique feature occupying a cell none of whose
   six face-neighbours were sampled — a false single-voxel component with a
   degenerate bounding box. Denser sampling only adds cells the surface
   genuinely passes through; it can never bridge a real gap. If a component
   report ever shows that signature (one or few voxels, 0-extent bbox),
   re-check at a finer cell before believing it: a REAL gap survives cell
   shrinking, a sampling artefact vanishes.

   WHAT THIS DOES NOT COVER — read before quoting a PASS:
     - FREE ENDS. A member attached at one end and dangling at the other is
       one connected piece and a print hazard at the same time; this gate
       cannot see it (charter carries this limitation forward). Sheet petals
       make free wires rarer and thin walls likelier; a thin-wall gate is
       future work.
     - SURFACE, NOT SOLID, occupancy: two solids that merely graze within
       one cell read as connected.
     - Sub-cell gaps: at 0.6 mm a genuine 0.2 mm gap reads as joined. The
       cell is a floor, not a proof; shrink CELL_MM to tighten, cubic cost.
     - Anything outside the matrix: the sweep is the shipping default, petal
       count 3–40, and every exposed slider at min/default/max. A config not
       in the matrix — and every future control until its rows are added —
       is unknown, not passing.
     - The CAPABILITY rows' structural claims. Non-monotone width and the
       two-span domain are asserted from the APP'S OWN profile and trim
       evaluation, not from the STL; what this gate measures on those rows is
       the same thing it measures everywhere — one connected body. The scope
       is printed beside each capability row, not only here.
     - **THE JUNCTION UNDER LAYERS. A PASS HERE DOES NOT ENDORSE IT**, and
       that is measured rather than cautious (Sep 1). Two mutations were run
       against this gate before junctionAssertions() was written:
         * THE WRONG HUB — building the junction slab at the wrong layer's
           radius (min over layers, not the owner's R0). At the defaults with
           three layers the outer whorl's feet end 7.94 mm out against a hub
           stopping at 6.86 mm: joined to nothing. THIS GATE REPORTS ONE
           REGION, 0.00% DETACHED, on all five configurations tried (2 and 3
           layers, layerSize max, ALL THIN x spread min, petalCount 40). It
           passes because consecutive foot annuli overlap EACH OTHER — layer
           0's feet span [7.94, 13.23] and layer 1's span [5.72, 9.53] — so
           the outer whorl hangs on by a CHAIN through the inner layers, with
           blade interpenetration on top. Connectedness under layers is
           OVER-DETERMINED and this measure cannot separate a correct hub from
           an incorrect one.
         * THE LIFTED LAYER — feet off the hub plane. The junction derivation
           dies at |h| >= t (1.20 mm at the shipping sheet, 0.60 ALL-THIN),
           and this gate does not split until h >= 2.5 mm. The band between is
           DETACHED BY DERIVATION AND READS AS ONE PIECE. Confirmed across
           eight scenarios; none split before 2.0 mm.
       J1–J4 in junctionAssertions() carry what this gate cannot, in exact
       arithmetic from the app's own metrics, on every row. Do not weaken them
       on the strength of a green run here.
     - **THE CONTINUOUS SPIRAL MAKES THAT BLINDNESS WORSE, NOT BETTER**, and
       the number is the point (Sep 1). At the shipping continuous config the
       radius step between consecutive slots is 0.1735 mm against an 8.486 mm
       overhang, so consecutive foot annuli overlap by 3.154 mm — against
       1.981 mm at three layers. A wrong hub there leaves 57 of 120 slots
       joined to nothing and this gate still reports one region, chained
       through the 119 feet in between. Worse still, THE ONE MUTATION THIS
       SESSION IS ACTUALLY ABOUT — continuous mode silently building rings —
       is invisible to every measure in this file AND to J1–J4: it exports
       watertight, exports as one piece, and has the identical triangle count.
       J5 and J6 are what observe it. A green run here endorses one connected
       body and NOTHING about whether the arrangement is a continuum.
   There are no presets yet; when presets exist they become named rows here
   FIRST (charter: coverage starts where the flower's gate was blind).

   VALIDITY — asserted, all hard failures, never coverable by any xfail:
     1. FRESH PAGE per row + READ-BACK of every set value + FULL-STATE
        comparison of every registry control against DEFAULTS + set, via the
        app's own snapshot. A row measuring a design other than the one its
        label names invalidates the run, passes included. A capability row
        additionally reads its capability back and asserts the structure it
        names (a claw with no interior local minimum, or a cleft with one
        span at the tip, invalidates the run) — and every ORDINARY row
        asserts no capability is live, so one cannot leak between rows.
     2. PAIRWISE TRIANGLE COMPARISON: the petalCount 40 row must export more
        triangles than the petalCount 3 row. Matched pair, never a global
        reference — it proves the slider actually drove geometry through the
        real UI, which the state read-back alone cannot.
   There are no xfail rows today. If one is ever added it must cite a tracked
   issue, PASS while the defect persists, and FAIL HARD the moment the row
   exports as one piece (the fix landing — remove the marker in that commit).

   RUN:  node tools/verify-bloom-connectedness.mjs
         node tools/verify-bloom-connectedness.mjs --negative-control
           Deliberately sets petalCount to an out-of-range value the browser
           must clamp, and requires the run to FAIL on read-back. A validity
           check nobody has seen fail is a hope, not a check.
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, applyCapability, exportStl, analyzeStl, buildMatrix, CAPABILITY_SCOPE, formAssertions, FORM_SCOPE,
         thicknessAssertions, THICKNESS_SCOPE, junctionAssertions, JUNCTION_SCOPE, zygoAssertions, ZYGO_SCOPE, exportFloorAssertion, shownModeAssertion, curlAssertions, CURL_SCOPE,
         stamenAssertions, STAMEN_SCOPE, gynoeciumAssertions, GYNOECIUM_SCOPE } from './bloom-harness.mjs';
import { footCrowding, crowdingLine, crowdingCoverage, CROWDING_SCOPE } from './bloom-crowding.mjs';

const CELL_MM = 0.6;        // below the 1.0 mm min feature (assumed, uncouponed)
/* Grids beyond this are SKIPPED and reported, NEVER passed — so this number
   decides how much of the matrix is actually measured, and it is sized
   against the matrix rather than picked.

   RAISED 90M -> 160M (Sep 1), because the layer work made it bind. `ALL MAX`
   sweeps every non-centre slider to its maximum, which now includes
   layerCount 3, and `ALL MAX x DOME max` went from 403x403x239 (38.8M,
   measured) to 605x605x360 (131.8M, skipped). A row that USED to be measured
   and is now skipped is coverage lost to a change, which is exactly what this
   report is supposed to make impossible to miss — so the ceiling moves rather
   than the row going quiet.

   SIZED, NOT GUESSED: the largest grid across all 158 rows is that row's
   131.8M; the next largest is 32.9M. 160M leaves ~21% headroom over the
   worst case with a real gap to everything else. COST, measured: that row
   takes 8.6 s and peaks at 397 MB RSS (one byte per voxel, so the array
   itself is 132 MB) against a 331 s whole-gate run — about 2.5%. If a future
   control pushes the worst case past this, the honest move is the same one:
   measure the new maximum and raise it, or shrink what the row reaches. */
/* RAISED 160M -> 256M (Sep 3), because the depth raise made it bind again, in
   exactly the way this note predicted. `ALL MAX` now means SIX layers of forty
   petals; the area rule sums 240 feet, the hub grows, and the DOME scales
   with the hub — so `ALL MAX x DOME max` went from 605x605x360 (131.8M) to
   706x706x421 (209.8M, measured) and CI reported it SKIPPED on the first
   push. A row that used to be measured and is now skipped is coverage lost
   to a change, so the ceiling moves: 256M is ~22% over the new worst case,
   the same margin 160M gave the old one; the next largest row is 50.3M
   (ALL MAX x DISC max). Cost, measured on that row: see the charter's
   session-13 entry. */
/* RAISED AGAIN 256M -> 448M (Sep 4, the domed hub): ALL MAX now resolves
   `headRise` to 1, so the ALL MAX x DOME max row carries a hemisphere of the
   118 mm hub under a 142 mm boss — 700x700x743 cells, 364.1M, measured in
   Node before the gate ran. Same rule as both raises before it: a row that
   used to be measured and would now be skipped is coverage lost to a change,
   so the ceiling moves, ~23% over the new worst case; the next largest row is
   ALL MAX x DISC max at 207.3M. */
const MAX_VOXELS = 448e6;
const NEGATIVE_CONTROL = process.argv.includes('--negative-control');
/* `--only <regex>` (session 16): run the rows whose LABEL matches, for a
   smoke pass on a wiring change before the full matrix. The summary still
   counts what actually ran; a filtered run is never quoted as a pass of the
   matrix. */
const ONLY = process.argv.includes('--only') ? new RegExp(process.argv[process.argv.indexOf('--only') + 1]) : null;

function voxelComponents(buf, cell) {
  const n = buf.readUInt32LE(80);
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9], tri = [];
  for (let i = 0; i < n; i++) {
    const o = 84 + i * 50, t = [];
    for (let k = 0; k < 3; k++) {
      const b = o + 12 + k * 12, p = [buf.readFloatLE(b), buf.readFloatLE(b + 4), buf.readFloatLE(b + 8)];
      for (let d = 0; d < 3; d++) { if (p[d] < lo[d]) lo[d] = p[d]; if (p[d] > hi[d]) hi[d] = p[d]; }
      t.push(p);
    }
    tri.push(t);
  }
  const dim = hi.map((h, k) => Math.max(1, Math.ceil((h - lo[k]) / cell) + 1));
  if (dim[0] * dim[1] * dim[2] > MAX_VOXELS) return { skipped: true, dim };
  const occ = new Uint8Array(dim[0] * dim[1] * dim[2]);
  const at = (x, y, z) => (z * dim[1] + y) * dim[0] + x;
  for (const t of tri) {
    const e1 = [t[1][0] - t[0][0], t[1][1] - t[0][1], t[1][2] - t[0][2]];
    const e2 = [t[2][0] - t[0][0], t[2][1] - t[0][1], t[2][2] - t[0][2]];
    /* Quarter-cell step from the longest edge — see SAMPLING in the header. */
    const s = Math.max(2, Math.ceil(Math.max(Math.hypot(...e1), Math.hypot(...e2)) / (cell * 0.25)));
    for (let a = 0; a <= s; a++) for (let b = 0; b + a <= s; b++) {
      const u = a / s, v = b / s;
      const x = Math.round((t[0][0] + e1[0] * u + e2[0] * v - lo[0]) / cell);
      const y = Math.round((t[0][1] + e1[1] * u + e2[1] * v - lo[1]) / cell);
      const z = Math.round((t[0][2] + e1[2] * u + e2[2] * v - lo[2]) / cell);
      if (x >= 0 && y >= 0 && z >= 0 && x < dim[0] && y < dim[1] && z < dim[2]) occ[at(x, y, z)] = 1;
    }
  }
  const seen = new Uint8Array(occ.length), stack = [];
  let comps = 0, biggest = 0, total = 0;
  for (let i = 0; i < occ.length; i++) if (occ[i]) total++;
  for (let i = 0; i < occ.length; i++) {
    if (!occ[i] || seen[i]) continue;
    comps++; let sz = 0; stack.push(i); seen[i] = 1;
    while (stack.length) {
      const c = stack.pop(); sz++;
      const x = c % dim[0], y = Math.floor(c / dim[0]) % dim[1], z = Math.floor(c / (dim[0] * dim[1]));
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const nx = x + dx, ny = y + dy, nz = z + dz;
        if (nx < 0 || ny < 0 || nz < 0 || nx >= dim[0] || ny >= dim[1] || nz >= dim[2]) continue;
        const j = at(nx, ny, nz); if (occ[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
      }
    }
    if (sz > biggest) biggest = sz;
  }
  return { dim, comps, biggest, total, strayFraction: total ? +(1 - biggest / total).toFixed(5) : 0 };
}

const rows = buildMatrix();
if (NEGATIVE_CONTROL) {
  rows.length = 1;
  rows[0] = { label: 'NEGATIVE CONTROL: petalCount 999 (browser must clamp; read-back must reject)', set: [{ id: 'petalCount', value: '999' }] };
  console.log('NEGATIVE CONTROL: this run MUST fail on read-back.\n');
}

const { server, port } = await serveRepo();
const { browser, page } = await launchPage();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-conn-'));

const results = [];
const validity = [];
const t0 = Date.now();
for (const row of rows) {
  if (ONLY && !ONLY.test(row.label)) continue;
  await openBloom(page, port);   // fresh page per row
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
     bytes cannot show. */
  const jct = await junctionAssertions(page, row);
  if (jct.length) { validity.push(`${row.label}: ${jct.join('; ')}`); continue; }
  /* THE ANDROECIUM (JS1-JS5, sessions 21 and 24) — see stamenAssertions()'s header.
     The flood fill is blind to a filament rooted off the normal or a hairline
     root exactly as it is to the wrong hub: the tube crosses the slab, so it
     reads as one piece either way. */
  const stm = await stamenAssertions(page, row);
  if (stm.length) { validity.push(`${row.label}: ${stm.join('; ')}`); continue; }
  /* THE GYNOECIUM (JG1-JG4, session 22) — see gynoeciumAssertions()'s
     header. The same blindness as the androecium's: the style's rod and its
     three lobes are each their own closed solid, so a style off the axis, a
     hairline root or a missing lobe reads as watertight and one piece. */
  const gyn = await gynoeciumAssertions(page, row);
  if (gyn.length) { validity.push(`${row.label}: ${gyn.join('; ')}`); continue; }
  /* ZYGOMORPHY (Z1-Z6) — see zygoAssertions()'s header. This gate is as blind
     to the layer as the export gate is: the foot is never written by anything
     a role may override, and the hub disc spans every ring, so no reachable
     override can split the flood fill. ALL SEVEN positive-control mutations
     across both zygomorphy sessions export as ONE connected piece, the
     off-by-one hood and the removed collapse guard included — and those two
     fired nothing anywhere in the shipped instrument until Z4 and Z5 existed.
     A green run here endorses none of it. */
  const zyg = await zygoAssertions(page, row);
  if (zyg.length) { validity.push(`${row.label}: ${zyg.join('; ')}`); continue; }
  const buf = await exportStl(page, tmp);
  if (!buf) { validity.push(`${row.label}: no STL download`); continue; }
  /* THE EXPORT FLOOR, read from the app's own post-export read-out — the
     live build never floors, so no live metric can answer this. */
  const flr = await exportFloorAssertion(page);
  if (flr.length) { validity.push(`${row.label}: ${flr.join('; ')}`); continue; }
  const e = analyzeStl(buf);
  /* FOOT CROWDING — a FLAG, never a gate (Eva, Sep 3), and the ONE thing in
     this file that can see OVER-connection. This gate's whole criterion is
     "one region": 120 feet fused into a single mass at the base are the most
     connected bloom there is, and it passes here with 0% stray on the very
     configuration Eva called a fused mass. Read from footRing()'s own
     export-mode rings and registered against THIS row's STL header (R1). Its
     validity assertions are hard; the CROWDED mark is not. */
  const crowd = await footCrowding(page, row, e);
  if (crowd.bad.length) { validity.push(`${row.label}: ${crowd.bad.join('; ')}`); continue; }
  const v = voxelComponents(buf, CELL_MM);
  const fm = await page.evaluate(() => window.__bloomMetrics());
  const probe = { ringWidth: fm.ringWidth, ringThickness: fm.ringThickness, ringRadius: fm.ringRadius, crowding: crowd.r };
  if (v.skipped) results.push({ label: row.label, capability: !!row.capability, ok: null, ...e, ...probe, note: `SKIPPED — grid ${v.dim.join('x')} exceeds ${MAX_VOXELS.toLocaleString('en-US')} voxels` });
  else results.push({ label: row.label, capability: !!row.capability, ok: v.comps === 1, ...e, ...v, ...probe });
}
await browser.close();
server.close();
fs.rmSync(tmp, { recursive: true, force: true });

/* VALIDITY 2 — pairwise triangle comparison (see header).
   MATRIX-LEVEL, SO NOT MADE ON A FILTERED RUN (session 18): this check and
   VALIDITY 3 below need the petalCount 3 / 40 rows, the DEFAULT row and the
   three foot-response rows, and a `--only` run that does not select them
   reported HARNESS INVALID on every smoke pass — which is why session 17's
   `--conn` measurement could only ever be quoted as "the voxel verdict, with
   the run self-reporting invalid". Suppressed under --only exactly as the
   crowding-coverage claim below already is and as the export gate suppresses
   its own matrix-level claims; the per-row validity (fresh page, read-back,
   every J / Z / C family) is untouched, and a filtered run is still never a
   pass of the matrix. */
if (!NEGATIVE_CONTROL && !ONLY) {
  const r3 = results.find((r) => r.label === 'petalCount 3');
  const r40 = results.find((r) => r.label === 'petalCount 40');
  if (!r3 || !r40) validity.push('pairwise check: petalCount 3 / 40 rows missing from results');
  else if (!(r40.tris > r3.tris)) validity.push(`pairwise check: petalCount 40 exports ${r40.tris} tris(export), not more than petalCount 3 at ${r3.tris} — the slider did not drive geometry`);

  /* VALIDITY 3 — THE FOOT CONTROLS ACTUALLY REACH footRing().

     The reworked foot assertion compares the emitted foot against
     footRing()'s OWN answer, which is the only comparison that is not a
     second copy of the derivation — and it is therefore blind by
     construction to footRing() ignoring its inputs entirely. A footRing()
     that returned a constant would satisfy it on every row. So the second
     half of that claim is asserted here, the same way the petalCount pair
     asserts that a slider drove geometry rather than merely being held:
     matched pairs against the DEFAULT row, never a global reference.
     Thickness is a strict inequality both ways; the delicacy pair is strict
     because 0.25 x 6.40 mm = 1.60 mm lands exactly ON the assumed floor and
     the default does not. */
  const base = results.find((r) => r.label === 'DEFAULT (the shipping configuration)');
  const pairs = [
    ['sheetThickness min (0.6)', 'ringThickness', (a, b) => a < b, 'thinner'],
    ['sheetThickness max (2.4)', 'ringThickness', (a, b) => a > b, 'thicker'],
    ['footDelicacy min (0.25)', 'ringWidth', (a, b) => a < b, 'narrower'],
  ];
  if (!base) validity.push('response check: DEFAULT row missing from results');
  else for (const [label, key, cmp, word] of pairs) {
    const row = results.find((r) => r.label === label);
    if (!row) { validity.push(`response check: row "${label}" missing from results`); continue; }
    if (!cmp(row[key], base[key])) {
      validity.push(`response check: "${label}" reports ${key} ${row[key]}, not ${word} than the default's ${base[key]} — the control is not reaching footRing()`);
    }
  }
}

console.log(`connectedness: voxel flood fill at ${CELL_MM} mm (assumed min printable feature: 1.0 mm)\n`);
const failures = [], skipped = [];
for (const r of results) {
  const verdict = r.ok === null ? 'SKIP' : r.ok ? 'ok  ' : 'FAIL';
  if (r.ok === null) skipped.push(r);
  else if (!r.ok) failures.push(r);
  const detail = r.comps !== undefined
    ? `components=${r.comps} stray=${r.strayFraction} tris(export)=${r.tris} boundary=${r.boundary}`
    : (r.note || '');
  console.log(`  ${verdict} ${r.label.padEnd(46)} ${detail}`);
  if (r.capability) console.log(`       ^ SCOPE: ${CAPABILITY_SCOPE}`);
  console.log(`       ^ ${crowdingLine(r.crowding)}`);
}
console.log(`\n${results.length - failures.length - skipped.length}/${results.length} rows are ONE connected piece`
  + (skipped.length ? `; ${skipped.length} skipped (grid too large — NOT a pass)` : '')
  + `; ${((Date.now() - t0) / 1000).toFixed(0)}s`);
console.log('LIMITS: surface occupancy, not solid; cannot see free ends or sub-cell gaps; covers only the matrix above. See the header.');
console.log('LIMITS (LAYERS): a PASS here does NOT endorse the junction under layers — the wrong-hub mutation passes this gate on every configuration tried.');
console.log(`JUNCTION SCOPE: ${JUNCTION_SCOPE}`);
console.log(`ANDROECIUM SCOPE: ${STAMEN_SCOPE}`);
console.log(`GYNOECIUM SCOPE: ${GYNOECIUM_SCOPE}`);
const crowdedRows = results.filter((r) => r.crowding.crowded);
console.log(`${crowdedRows.length}/${results.length} rows FLAGGED CROWDED (a flag, not a failure — a fused base is ONE piece here by definition) · CROWDING SCOPE: ${CROWDING_SCOPE}`);
/* THE FLAG IN BOTH DIRECTIONS, at matrix level — validity, never a row result. */
if (!NEGATIVE_CONTROL && !ONLY) validity.push(...crowdingCoverage(results.map((r) => r.crowding)));

let bad = false;
if (validity.length) {
  bad = true;
  console.error(`\nconnectedness: HARNESS INVALID — ${validity.length} validity assertion(s) failed. No result above is trustworthy.`);
  for (const v of validity) console.error(`  - ${v}`);
}
if (failures.length) {
  bad = true;
  console.error(`\nconnectedness: FAIL — ${failures.length} row(s) export as more than one piece:`);
  for (const f of failures) console.error(`  - ${f.label}: ${f.comps} components, ${(f.strayFraction * 100).toFixed(2)}% of surface detached`);
}
if (NEGATIVE_CONTROL) {
  if (bad) { console.log('\nNEGATIVE CONTROL: PASS — the harness rejected the clamped value, as it must.'); process.exit(0); }
  console.error('\nNEGATIVE CONTROL: FAILED — the harness accepted a value the browser rewrote. The read-back is not measuring anything.');
  process.exit(1);
}
if (bad) process.exit(1);
console.log('connectedness: PASS — every row above exports as a single connected body.');
