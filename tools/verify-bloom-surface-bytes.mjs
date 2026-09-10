/* ===================================================================
   verify-bloom-surface-bytes.mjs — THE SURFACE EXTRACTION MOVED NOTHING.

     node tools/verify-bloom-surface-bytes.mjs --base <worktree> [--rows N] [--control]

   Session 37 lifted the petal's mid-surface law out of `buildPetalInto`'s row
   loop into `petalSurface()`. The claim is the strongest one available and
   the only one worth making about a refactor: EVERY EMITTED FLOAT IS THE SAME
   FLOAT, IN THE SAME POSITION, ON EVERY ROW OF THE FULL MATRIX IN BOTH MODES.
   Not "equivalent", not "within a tolerance" — `Object.is`, so a one-ULP move
   and a `-0` that became `+0` both fail.

   WHY IT IS ORDER-SENSITIVE AND ITS SIBLING IS NOT. Session 36's
   `verify-bloom-winding-bytes.mjs` matches triangles as unordered vertex sets
   because reversing a winding genuinely reorders the stream. Nothing here is
   allowed to reorder anything, so the comparison is positional: `pa[i]`
   against `pb[i]`. A tool that matched multisets would pass a refactor that
   emitted the same geometry in a different order, and that is a change to the
   export this session is not entitled to make.

   WHAT IT COMPARES, per row, per mode:
     1  THE EXPORT STREAM — `MeshBuilder.positions`, length then every element
        under `Object.is`. This is the artefact.
     2  THE CAPTURED GRID — the same rows built again with `captureGrid`, and
        every `u`, `halfWidth`, `thickness`, `v`, mid-surface point and normal
        compared the same way. The grid is the SECOND consumer of `sect(v)`
        and it carries quantities the STL never sees (the mid-surface itself,
        the per-column normal), so a change that cancelled in the two skins
        would still show here. Session 28's own numbers came from this path.

   CAPABILITY ROWS ARE PASSED, and that is deliberate rather than inherited:
   the matrix's CLAW and CLEFT rows are the only ones with a non-rectangular
   `trimPanels` domain and the only ones that build more than one panel, which
   is exactly where a row-loop refactor would bite. `verify-bloom-winding-bytes`
   drops `row.capability`; this does not.

   THE POSITIVE CONTROL is `--control`, and it perturbs BOTH clauses by 1e-9 —
   one coordinate of the export stream and one mid-surface coordinate of the
   captured grid — because a control that only fires clause 1 leaves clause 2
   exactly what this project calls a log line: a computation nobody has shown
   can produce a verdict. The run must report TWO findings, one per clause, and
   fails if it does not. It also REFUSES A VACUOUS PASS — zero rows, zero
   floats, or zero captured panels is a failure and not a silent success.

   WHAT IT DOES NOT PROVE, in its own header:
     - IT SAYS NOTHING ABOUT OFF-STATION BEHAVIOUR. It compares the points the
       MESH samples. That the evaluator is right BETWEEN them is a different
       claim with a different instrument — `verify-bloom-surface-offstation.mjs`.
     - IT IS A NODE-SIDE COMPARISON over the matrix's declared control sets,
       applied raw. It is not read-back-verified through the UI the way the
       STL gates are, so it inherits nothing about whether a row's values are
       REACHABLE; it proves only that both trees, given identical inputs,
       emit identical outputs. That is the whole claim a refactor owes.
     - THE MATRIX IS THE COVERAGE. A state no row visits is not compared.
   =================================================================== */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { existsSync } from 'node:fs';

const argv = process.argv.slice(2);
const argOf = (n) => { const i = argv.indexOf(n); return i < 0 ? null : argv[i + 1]; };
const BASE = argOf('--base');
const LIMIT = +(argOf('--rows') || 0) || Infinity;
const CONTROL = argv.includes('--control');
if (!BASE || !existsSync(path.join(BASE, 'bloom-geometry.js'))) {
  console.error('usage: node tools/verify-bloom-surface-bytes.mjs --base <worktree of the base commit> [--rows N] [--control]');
  process.exit(2);
}
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const load = (dir, f) => import(pathToFileURL(path.join(dir, f)).href);
const [mine, base, harness] = await Promise.all([
  load(ROOT, 'bloom-geometry.js'), load(BASE, 'bloom-geometry.js'), load(ROOT, 'tools/bloom-harness.mjs'),
]);

/* The row -> state map, read from the harness's own CONTROLS so a row's value
   is coerced by the control's declared kind rather than by a guess here. */
const kindOf = new Map(harness.CONTROLS.map((c) => [c.id, c]));
function stateOf(row) {
  const s = { ...harness.DEFAULTS };
  for (const w of row.set || []) {
    const c = kindOf.get(w.id); if (!c) throw new Error(`${row.label}: no control ${w.id}`);
    s[w.id] = c.kind === 'slider' ? Number(w.value) : c.kind === 'check' ? (w.value === true || w.value === 'true') : w.value;
  }
  return s;
}

const rows = harness.buildMatrix().slice(0, LIMIT);
console.log(`${rows.length} rows x 2 modes — this tree against ${BASE}`);
const fails = [];
let floats = 0, gridFloats = 0, tris = 0, rowsDone = 0, panels = 0;
let controlFired = 0;

/* Walk a captured grid into a flat list of [label, value] so the comparison is
   one loop and a shape change (a panel that appeared or vanished) is a failure
   rather than a silently shorter walk. */
function gridFloatsOf(petals) {
  const out = [];
  for (let p = 0; p < petals.length; p++) {
    const g = petals[p].grid;
    if (!g) continue;
    for (let q = 0; q < g.length; q++) {
      const pan = g[q];
      out.push(`p${p}.${q}.label:${pan.label}`, pan.rowFrom, pan.rowTo, pan.rows.length);
      for (const r of pan.rows) {
        out.push(r.row, r.u, r.halfWidth, r.thickness, r.v.length);
        for (let j = 0; j < r.v.length; j++) {
          out.push(r.v[j], r.mid[j][0], r.mid[j][1], r.mid[j][2], r.normal[j][0], r.normal[j][1], r.normal[j][2]);
        }
      }
    }
  }
  return out;
}

for (const row of rows) {
  const st = stateOf(row);
  const opts = { below: null, capability: row.capability ?? null };
  for (const exportMode of [false, true]) {
    const tag = `${row.label} (${exportMode ? 'export' : 'live'})`;

    /* 1. THE EXPORT STREAM, positionally. */
    const A = new mine.MeshBuilder({ exportMode }), B = new base.MeshBuilder({ exportMode });
    mine.buildBloomInto(A, { ...st }, opts); base.buildBloomInto(B, { ...st }, opts);
    const pa = A.positions, pb = B.positions;
    if (CONTROL && rowsDone === 0 && !exportMode) { pa[0] += 1e-9; controlFired++; }
    if (pa.length !== pb.length) {
      fails.push(`${tag}: ${pa.length} floats against ${pb.length} — the triangle COUNT moved`);
    } else {
      let bad = 0, first = -1;
      for (let i = 0; i < pa.length; i++) if (!Object.is(pa[i], pb[i])) { bad++; if (first < 0) first = i; }
      if (bad) fails.push(`${tag}: ${bad} of ${pa.length} floats moved, first at index ${first} (tri ${Math.floor(first / 9)}): ${pa[first]} against ${pb[first]}`);
      floats += pa.length; tris += pa.length / 9;
    }

    /* 2. THE CAPTURED GRID — the mid-surface itself, which the STL never sees. */
    const GA = new mine.MeshBuilder({ exportMode, captureGrid: true });
    const GB = new base.MeshBuilder({ exportMode, captureGrid: true });
    const ga = gridFloatsOf(mine.buildBloomInto(GA, { ...st }, opts).petals);
    /* CLAUSE 2's OWN CONTROL — the first numeric grid value, perturbed. It is
       a separate perturbation from clause 1's because the two clauses read
       two different builds through two different paths, and a control that
       fired only the first would leave this one unproven. */
    if (CONTROL && rowsDone === 0 && !exportMode) {
      const k = ga.findIndex((x) => typeof x === 'number');
      if (k >= 0) { ga[k] += 1e-9; controlFired++; }
    }
    const gb = gridFloatsOf(base.buildBloomInto(GB, { ...st }, opts).petals);
    if (ga.length !== gb.length) {
      fails.push(`${tag}: grid shape moved — ${ga.length} captured values against ${gb.length}`);
    } else {
      let bad = 0, first = -1;
      for (let i = 0; i < ga.length; i++) if (!Object.is(ga[i], gb[i])) { bad++; if (first < 0) first = i; }
      if (bad) fails.push(`${tag}: grid — ${bad} of ${ga.length} values moved, first at ${first}: ${ga[first]} against ${gb[first]}`);
      gridFloats += ga.length;
    }
    if (!exportMode) panels += ga.filter((x) => typeof x === 'string' && x.includes('.label:')).length;
  }
  rowsDone++;
  if (rowsDone % 50 === 0) process.stderr.write(`  ${rowsDone}/${rows.length} rows\n`);
}

/* VACUITY. A comparison that compared nothing passes trivially. */
if (!rows.length) fails.push('VACUOUS: the matrix returned no rows');
if (!floats) fails.push('VACUOUS: no export floats were compared');
if (!gridFloats) fails.push('VACUOUS: no grid values were compared — captureGrid produced nothing');
if (!panels) fails.push('VACUOUS: no captured panels — the grid path never ran');
if (CONTROL && controlFired !== 2) fails.push(`VACUOUS: --control perturbed ${controlFired} clause(s), expected 2 (export stream and captured grid)`);
if (CONTROL && fails.filter((f) => !f.startsWith('VACUOUS')).length !== 2) {
  fails.push(`CONTROL DID NOT FIRE BOTH CLAUSES: ${fails.filter((f) => !f.startsWith('VACUOUS')).length} finding(s), expected exactly 2 — a clause that cannot produce a verdict is not a check`);
}

console.log(`\nexport stream : ${floats.toLocaleString()} floats over ${tris.toLocaleString()} triangles, ${rowsDone} rows x 2 modes`);
console.log(`captured grid : ${gridFloats.toLocaleString()} values over ${panels.toLocaleString()} panels (live)`);
if (CONTROL) console.log('positive control: one coordinate perturbed by 1e-9 — the run MUST fail below');

if (fails.length) {
  console.log(`\nFAIL — ${fails.length} finding(s):`);
  for (const f of fails.slice(0, 40)) console.log('  ' + f);
  if (fails.length > 40) console.log(`  ... and ${fails.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS — 0 floats moved, positionally, under Object.is.');
