// Zero-byte check for the grid export's petal retention (session of Sep 10).
//
//   node tools/verify-bloom-petalsall-bytes.mjs --base <worktree> [--rows N]
//
// WHAT THIS PROVES AND WHY IT IS WORTH PROVING. `buildBloomInto` now collects a
// SECOND array — every petal the builder emitted, beside the one-per-ring array
// it always returned — so that the grid export can write a whole bloom instead
// of one blade per whorl. Nothing about the BUILD moved: no expression that
// produces a coordinate was touched, and the petals whose references are now
// kept were being built and thrown away before.
//
// THAT IS AN ARGUMENT, AND THIS PROJECT'S RULE IS THAT AN ARGUMENT ABOUT BYTES
// IS NOT A MEASUREMENT OF THEM. So every float of `acc.positions` is compared
// against a build of the BASE COMMIT'S OWN SOURCE, in both modes, with
// `Object.is` so that a `-0` is distinguished from a `0` and a NaN from a NaN.
// A hash would quantise; a tolerance would swallow the one class of change this
// is looking for.
//
// THE POSITIVE CONTROL IS NOT OPTIONAL. `--control` perturbs one coordinate of
// the new build by 1e-9 and requires the comparison to FAIL — a comparison that
// cannot detect a difference proves nothing about the absence of one, and this
// file is short enough that the mistake would be invisible.
//
// It walks the FULL live matrix from the harness, both modes, so what it covers
// is every row the STL gates cover. Dev-only deps: none beyond node.

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { existsSync } from 'node:fs';

const argv = process.argv.slice(2);
const argOf = (n) => { const i = argv.indexOf(n); return i < 0 ? null : argv[i + 1]; };
const BASE = argOf('--base');
const LIMIT = +(argOf('--rows') || 0) || Infinity;
const CONTROL = argv.includes('--control');
if (!BASE) { console.error('usage: node tools/verify-bloom-petalsall-bytes.mjs --base <worktree> [--rows N] [--control]'); process.exit(2); }
if (!existsSync(path.join(BASE, 'bloom-geometry.js'))) {
  console.error(`no bloom-geometry.js in ${BASE} — point --base at a worktree of the commit this session started from`);
  process.exit(2);
}

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const load = (dir, f) => import(pathToFileURL(path.join(dir, f)).href);

const [mine, base, harness] = await Promise.all([
  load(ROOT, 'bloom-geometry.js'),
  load(BASE, 'bloom-geometry.js'),
  load(ROOT, 'tools/bloom-harness.mjs'),
]);

/* A MATRIX ROW IS A LIST OF CONTROL WRITES, and the values in it are STRINGS
   because that is what a control holds. `stateOf` applies them over the
   registry's own DEFAULTS and coerces each by the control's own kind — never by
   guessing from the string, which would turn a choice whose value happens to
   read as a number into one. Both trees are handed the SAME object, built once,
   so a coercion that is wrong is wrong identically on both sides and cannot
   manufacture a difference. */
const kindOf = new Map(harness.CONTROLS.map((c) => [c.id, c]));
function stateOf(row) {
  const s = { ...harness.DEFAULTS };
  for (const w of row.set || []) {
    const c = kindOf.get(w.id);
    if (!c) throw new Error(`${row.label}: no control ${w.id}`);
    s[w.id] = (c.kind === 'slider') ? Number(w.value)
      : (c.kind === 'check') ? (w.value === true || w.value === 'true')
      : w.value;
  }
  return s;
}

const rows = harness.buildMatrix().slice(0, LIMIT);
console.log(`${rows.length} rows x 2 modes, this tree against ${BASE}`);

let floats = 0, differ = 0, firstDiff = null, rowsDone = 0;
let countsDiffer = 0, retainedGain = 0;

for (const row of rows) {
  const label = row.label;
  const state = stateOf(row);
  for (const exportMode of [false, true]) {
    const A = new mine.MeshBuilder({ exportMode });
    const B = new base.MeshBuilder({ exportMode });
    const bA = mine.buildBloomInto(A, { ...state });
    const bB = base.buildBloomInto(B, { ...state });
    const pa = A.positions, pb = B.positions;
    if (pa.length !== pb.length) {
      differ++;
      firstDiff = firstDiff || `${label} (${exportMode ? 'export' : 'live'}): ${pa.length} floats against ${pb.length} — a LENGTH change, which is not a value change and must never be reported as one`;
      continue;
    }
    /* THE POSITIVE CONTROL PERTURBS THE NEW BUILD, not the comparison — a
       control that edited the loop would be testing the control. */
    if (CONTROL && rowsDone === 0 && !exportMode && pa.length) pa[0] += 1e-9;
    for (let i = 0; i < pa.length; i++) {
      floats++;
      if (!Object.is(pa[i], pb[i])) {
        differ++;
        firstDiff = firstDiff || `${label} (${exportMode ? 'export' : 'live'}) float ${i}: ${pa[i]} against ${pb[i]}`;
      }
    }
    /* AND THE THING THE CHANGE IS FOR, counted rather than assumed: how many
       petals reach the exporter on this row, before and after. */
    const before = bB.petals.length, after = (bA.petalsAll || bA.petals).length;
    if (after !== before) { countsDiffer++; retainedGain += after - before; }
    if (after !== bA.petalsBuilt) {
      console.log(`  [warn] ${label} (${exportMode ? 'export' : 'live'}): petalsAll ${after} against petalsBuilt ${bA.petalsBuilt}`);
    }
  }
  rowsDone++;
  if (rowsDone % 50 === 0) console.log(`  ${rowsDone}/${rows.length} rows · ${floats.toLocaleString('en-US')} floats · ${differ} differing`);
}

console.log(`\n${floats.toLocaleString('en-US')} floats compared with Object.is over ${rowsDone} rows x 2 modes`);
console.log(`${differ} differ${firstDiff ? ` — first: ${firstDiff}` : ''}`);
console.log(`${countsDiffer} of ${rowsDone * 2} row-modes now hand the exporter MORE petals `
  + `(+${retainedGain} petal grids in total) — which is the whole point of the change`);

if (CONTROL) {
  const ok = differ > 0;
  console.log(ok ? '\nPOSITIVE CONTROL PASS — a 1e-9 perturbation is detected'
                 : '\nPOSITIVE CONTROL FAIL — the comparison cannot see a 1e-9 perturbation and proves nothing');
  process.exit(ok ? 0 : 1);
}
if (countsDiffer === 0) {
  console.log('\nFAIL — no row hands the exporter more petals than before, so this run is VACUOUS: '
    + 'it would pass identically against a tree where nothing changed at all');
  process.exit(1);
}
console.log(differ === 0 ? '\nPASS' : '\nFAIL');
process.exit(differ === 0 ? 0 : 1);
