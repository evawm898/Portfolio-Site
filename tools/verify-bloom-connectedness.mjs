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
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, applyCapability, exportStl, analyzeStl, buildMatrix, CAPABILITY_SCOPE } from './bloom-harness.mjs';

const CELL_MM = 0.6;        // below the 1.0 mm min feature (assumed, uncouponed)
const MAX_VOXELS = 90e6;    // grids beyond this are SKIPPED and reported, never passed
const NEGATIVE_CONTROL = process.argv.includes('--negative-control');

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
  await openBloom(page, port);   // fresh page per row
  const bad = await applyConfig(page, row.set);
  if (bad.length) { validity.push(`${row.label}: config did not take: ${bad.join('; ')}`); continue; }
  const drift = await fullStateDrift(page, row.set);
  if (drift.length) { validity.push(`${row.label}: state is not DEFAULTS+set: ${drift.join('; ')}`); continue; }
  const cap = await applyCapability(page, row);
  if (cap.length) { validity.push(`${row.label}: ${cap.join('; ')}`); continue; }
  const buf = await exportStl(page, tmp);
  if (!buf) { validity.push(`${row.label}: no STL download`); continue; }
  const e = analyzeStl(buf);
  const v = voxelComponents(buf, CELL_MM);
  if (v.skipped) results.push({ label: row.label, capability: !!row.capability, ok: null, ...e, note: `SKIPPED — grid ${v.dim.join('x')} exceeds ${MAX_VOXELS.toLocaleString('en-US')} voxels` });
  else results.push({ label: row.label, capability: !!row.capability, ok: v.comps === 1, ...e, ...v });
}
await browser.close();
server.close();
fs.rmSync(tmp, { recursive: true, force: true });

/* VALIDITY 2 — pairwise triangle comparison (see header). */
if (!NEGATIVE_CONTROL) {
  const r3 = results.find((r) => r.label === 'petalCount 3');
  const r40 = results.find((r) => r.label === 'petalCount 40');
  if (!r3 || !r40) validity.push('pairwise check: petalCount 3 / 40 rows missing from results');
  else if (!(r40.tris > r3.tris)) validity.push(`pairwise check: petalCount 40 exports ${r40.tris} tris(export), not more than petalCount 3 at ${r3.tris} — the slider did not drive geometry`);
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
}
console.log(`\n${results.length - failures.length - skipped.length}/${results.length} rows are ONE connected piece`
  + (skipped.length ? `; ${skipped.length} skipped (grid too large — NOT a pass)` : '')
  + `; ${((Date.now() - t0) / 1000).toFixed(0)}s`);
console.log('LIMITS: surface occupancy, not solid; cannot see free ends or sub-cell gaps; covers only the matrix above. See the header.');

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
