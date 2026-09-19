/* ===================================================================
   bloom-xfail-magnitudes.mjs — DOES EVERY DECLARED FAILURE STILL MEASURE
   WHAT ITS DECLARATION RECORDS? (#213, closed — docs/bloom-xfail-magnitudes.md)

   WHY THIS EXISTS. The bloom's xfail lists used to declare WHICH rows fail
   and never BY HOW MUCH: every entry carried its count and its worst span
   as prose that nothing read, and fifteen rows once regressed under them
   without a red (the seam session, PR #210). The gates now hold each
   declared row to its recorded magnitude — X1 in both STL gates for
   SELF_INTERSECTION_XFAIL, XR1 for EXPORT_REFUSED_XFAIL, V5 and V4 in the
   wall instrument for its own two records, and CG2/CG3 in the combination
   gate for COMBINATION_XFAIL (#263). Those clauses run on the full
   matrix in CI, which is a 3.5-hour answer. This tool is the SAME clauses
   run in Node in minutes, with no browser: it is how a session that
   legitimately moves a declared row's magnitude (a ladder change, a hub
   change) re-measures and re-records BEFORE it pushes, and how a reader
   checks that the list in front of them is the tree in front of them.

   WHAT IT DOES, per declared row: builds the row exactly as the export
   gate's X0 does — EXPORT mode, the row's own capability, its set over
   DEFAULTS coerced by each control's kind (a matrix row's values are
   strings; the geometry's guards are truthiness tests on numbers) — runs the
   within-shell census on the builder's own doubles, and hands the result to
   the harness's own `selfIntersectionMagnitudeClauses`. It does NOT restate
   the clause or the tolerance: a tool restating the gate's statement is a
   second owner, and the day they drift the tool is green on a red gate.

   WHAT IT DOES NOT DO. It is not the gate: X0 (the file's floats are these
   doubles), X2 (every undeclared row reads 0) and every other family are
   the STL gates' and run only there. A green run here says the DECLARED
   rows still measure their records under this Node; it says nothing about
   an undeclared row. And the list is measured, never rewritten: `--emit`
   prints the entries the current tree would declare, for a session to copy
   deliberately into the list with the movers named in its outcome doc.

   MODE AND SAMPLING, named because the durable rule asks: every figure is
   EXPORT mode on the builder's doubles (the gate's own path), the pair
   count is a property of the tessellation (56 x 10 per panel at NU 56),
   and the worst span is the largest chord any intersecting pair carries.
   Node 20 (CI's) and Node 22 agree on every row of the list to the pair
   and to the double on the span (measured 2026-09-17 over all 261 rows).

   RUN:
     node tools/bloom-xfail-magnitudes.mjs                 every declared row that exports
     node tools/bloom-xfail-magnitudes.mjs --only <regex>  a subset (matrix-level claims are not made)
     node tools/bloom-xfail-magnitudes.mjs --include-refused   ALL MAX too (2.4M triangles; minutes, no export needed here)
     node tools/bloom-xfail-magnitudes.mjs --wall          the wall instrument's two records beside its readings
     node tools/bloom-xfail-magnitudes.mjs --combination   the combination gate's cell records beside its readings
     node tools/bloom-xfail-magnitudes.mjs --emit          print the entries this tree measures, in list form
     node tools/bloom-xfail-magnitudes.mjs --root <tree>   measure ANOTHER tree's geometry against THIS tree's list
     node tools/bloom-xfail-magnitudes.mjs --control       the must-fail: one record perturbed each way, the clause must fire
   Exits non-zero on any declared row that does not measure its record, on
   a declared row the matrix no longer has, and on a control that does not fire.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const HERE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const arg = (k) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null);
const ROOT = arg('--root') ? path.resolve(arg('--root')) : HERE;
const ONLY = arg('--only') ? new RegExp(arg('--only')) : null;
const INCLUDE_REFUSED = argv.includes('--include-refused');
const EMIT = argv.includes('--emit');
const CONTROL = argv.includes('--control');
const WALL = argv.includes('--wall');
const COMBINATION = argv.includes('--combination');
const JSON_OUT = argv.includes('--json');

/* THE LIST AND THE CLAUSE COME FROM THIS TREE'S HARNESS; the GEOMETRY from
   `--root` (this tree by default). That split is what makes `--root` a
   control on the measured side: a mutated geometry against an unmutated
   record must fire the unmutated clause. */
const load = (root, f) => import(pathToFileURL(path.join(root, f)).href);
const [H, SI] = await Promise.all([load(HERE, 'tools/bloom-harness.mjs'), load(HERE, 'tools/bloom-self-intersection.mjs')]);
const [G, R] = await Promise.all([load(ROOT, 'bloom-geometry.js'), load(ROOT, 'bloom-registry.js')]);
if (ROOT !== HERE) {
  const a = fs.readFileSync(path.join(HERE, 'bloom-geometry.js')), b = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'));
  console.log(`geometry from ${ROOT} — bloom-geometry.js ${a.equals(b) ? 'IDENTICAL to this tree\'s (so --root is measuring the same law)' : 'DIFFERS from this tree\'s'}; the list and the clause are this tree's`);
}

const kindOf = new Map(H.CONTROLS.map((c) => [c.id, c]));
function stateOf(row) {
  const s = { ...R.DEFAULTS };
  for (const w of row.set || []) {
    const c = kindOf.get(w.id); if (!c) throw new Error(`${row.label}: no control ${w.id}`);
    s[w.id] = c.kind === 'slider' ? Number(w.value) : c.kind === 'check' ? (w.value === true || w.value === 'true') : w.value;
  }
  return s;
}
function measure(row) {
  const acc = new G.MeshBuilder({ exportMode: true });
  G.buildBloomInto(acc, stateOf(row), { below: null, capability: row.capability || null });
  const pos = new Float64Array(acc.positions);
  const r = SI.census(pos);
  return { tris: pos.length / 9, within: r.within, cross: r.cross, worstSpanMm: r.worstSpanMm, worstAt: r.worstAt || null };
}
const fmt = (n) => n.toLocaleString('en-US');

const matrix = H.buildMatrix();
const byLabel = new Map(matrix.map((r) => [r.label, r]));
const bad = [];
const out = [];
let measured = 0, agreed = 0, skippedRefused = 0;

if (CONTROL) {
  /* THE MUST-FAIL. The clause is handed the row's REAL reading and a record
     that is wrong by more than its band — in each direction, on each of the
     two quantities — and must fire exactly the clause named, and nothing on
     the true record. One row, seconds, no browser: a clause nobody has seen
     go red is a hope. `--root <mutated tree>` is the OTHER control, on the
     measured side, and is run by hand (docs/bloom-xfail-magnitudes.md §4). */
  const label = [...Object.keys(H.SELF_INTERSECTION_XFAIL)].find((l) => byLabel.has(l) && !H.EXPORT_REFUSED_HAS(l) && (!ONLY || ONLY.test(l)));
  const row = byLabel.get(label);
  const r = measure(row);
  const d = H.SELF_INTERSECTION_XFAIL[label];
  const tol = H.SELF_INTERSECTION_TOLERANCE;
  console.log(`control row: "${label}" reads ${r.within} pairs, worst span ${r.worstSpanMm.toFixed(4)} mm; declared ${H.xfailMagnitudeText(d)}`);
  const legs = [
    ['true record (must be silent)', d, 0],
    ['pairs recorded one too FEW (the row reads worse)', { ...d, pairs: d.pairs - 1 - tol.pairs }, 1],
    ['pairs recorded one too MANY (the row reads better)', { ...d, pairs: d.pairs + 1 + tol.pairs }, 1],
    ['span recorded shallower than the row reads (worse)', { ...d, worstMm: d.worstMm - 2 * tol.worstMm - 1e-3 }, 1],
    ['span recorded deeper than the row reads (better)', { ...d, worstMm: d.worstMm + 2 * tol.worstMm + 1e-3 }, 1],
    ['both wrong at once', { ...d, pairs: d.pairs * 2, worstMm: d.worstMm * 2 + 1e-3 }, 2],
  ];
  let n = 0;
  for (const [name, rec, want] of legs) {
    const fired = H.selfIntersectionMagnitudeClauses(label, r, rec, tol);
    const ok = fired.length === want && fired.every((f) => f.startsWith('X1:'));
    if (!ok) n++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(52)} fired ${fired.length} X1 clause(s), wanted ${want}`);
    for (const f of fired) console.log(`         ${f.slice(0, 160)}…`);
  }
  console.log(n ? `\ncontrol: FAIL — ${n} leg(s) did not behave` : '\ncontrol: the magnitude clause fires on a stale record in both directions on both quantities, and is silent on the true one.');
  process.exit(n ? 1 : 0);
}

const labels = Object.keys(H.SELF_INTERSECTION_XFAIL).filter((l) => !ONLY || ONLY.test(l));
labels.sort((a, b) => (H.EXPORT_REFUSED_HAS(a) ? 1 : 0) - (H.EXPORT_REFUSED_HAS(b) ? 1 : 0));   // the refused giant last
for (const label of labels) {
  const row = byLabel.get(label);
  const d = H.SELF_INTERSECTION_XFAIL[label];
  if (!row) { bad.push(`"${label}" is declared and the matrix has no such row — a declaration nothing measures is worse than an absence`); continue; }
  const refused = H.EXPORT_REFUSED_HAS(label);
  if (refused && !INCLUDE_REFUSED) { skippedRefused++; if (!JSON_OUT) console.log(`  skip ${label} — EXPORT-REFUSED (XR1), not censused by the gate; --include-refused measures it here`); continue; }
  const t0 = Date.now();
  const r = measure(row);
  measured++;
  const fired = H.selfIntersectionMagnitudeClauses(label, r);
  const fixed = r.within === 0;
  if (fixed) bad.push(`"${label}" reads 0 pairs — declared ${H.xfailMagnitudeText(d)}: the self-intersection is FIXED and the entry must come off (X1)`);
  for (const f of fired) bad.push(`"${label}": ${f}`);
  if (!fixed && !fired.length) agreed++;
  const mark = fixed ? 'FIXED' : fired.length ? 'MOVED' : 'ok   ';
  out.push({ label, refused, tris: r.tris, within: r.within, worstSpanMm: r.worstSpanMm, worstAt: r.worstAt, declared: { pairs: d.pairs, worstMm: d.worstMm }, verdict: mark.trim(), ms: Date.now() - t0 });
  if (!JSON_OUT && !EMIT) console.log(`  ${mark} ${String(r.within).padStart(7)} pairs · ${r.worstSpanMm.toFixed(4)} mm   declared ${String(d.pairs).padStart(7)} · ${d.worstMm.toFixed(4)}   ${(Date.now() - t0 + 'ms').padStart(8)}  ${label.slice(0, 90)}${refused ? '  [EXPORT-REFUSED: measured here in Node, ungated in CI]' : ''}`);
}

if (WALL) {
  /* The wall instrument's two records, beside what it reads now — through
     its own shipped `verify`, whose V5/V4 clauses ARE the gate. */
  const W = await load(HERE, 'tools/bloom-wall-thickness.mjs');
  const { fails, rows } = await W.verify({ root: ROOT, quiet: true });
  console.log('\nwall instrument (EXPORT mode, the shipped grid):');
  for (const [id, e] of Object.entries(W.SELF_XFAIL)) {
    const r = rows.find((x) => x.id === id);
    console.log(`  ${r ? (Math.abs(r.self - e.selfMm) <= W.SELF_XFAIL_TOLERANCE_MM ? 'ok   ' : 'MOVED') : 'GONE ' } SELF_XFAIL ${id.padEnd(16)} reads ${r ? r.self.toFixed(3) : '—'} mm · declared ${e.selfMm.toFixed(3)} ±${W.SELF_XFAIL_TOLERANCE_MM}`);
  }
  for (const r of rows.filter((x) => x.xfail)) console.log(`  ${Math.abs(r.ownDeficit - r.xfail.ownDeficitMm) <= W.SELF_XFAIL_TOLERANCE_MM ? 'ok   ' : 'MOVED'} V4 xfail   ${r.id.padEnd(16)} costs ${r.ownDeficit.toFixed(3)} mm · declared ${r.xfail.ownDeficitMm.toFixed(3)} ±${W.SELF_XFAIL_TOLERANCE_MM}`);
  for (const f of fails) bad.push(`wall: ${f}`);
}

if (COMBINATION) {
  /* THE COMBINATION GATE'S CELL RECORDS (#263), beside what it reads now —
     through its own shipped `verify`, whose CG2/CG3 clauses ARE the gate.
     Nothing here restates a clause or a band: a tool restating the gate's
     statement is a second owner, and the day they drift the tool is green
     on a red gate. */
  const C = await load(HERE, 'tools/bloom-combination-gate.mjs');
  const { fails, rows: cRows, bar } = await C.verify({ root: ROOT, quiet: true });
  const read = new Map();
  for (const { grid } of cRows) for (const cell of grid.flat()) read.set(cell.key, cell.mm);
  console.log(`\ncombination gate (EXPORT mode, the shipped grid; bar ${bar.toFixed(2)} mm):`);
  for (const [key, e] of Object.entries(C.COMBINATION_XFAIL)) {
    const got = read.get(key);
    const mark = got === undefined ? 'GONE ' : Math.abs(got - e.mm) <= C.COMBINATION_TOLERANCE_MM ? 'ok   ' : 'MOVED';
    console.log(`  ${mark} ${key.padEnd(52)} reads ${got === undefined ? '—' : got.toFixed(3)} mm \u00b7 declared ${e.mm.toFixed(3)} +/-${C.COMBINATION_TOLERANCE_MM}`);
  }
  for (const f of fails) bad.push(`combination: ${f}`);
}

if (EMIT) {
  console.log('\n/* entries as THIS tree measures them (EXPORT mode, the builder\'s doubles) — copy deliberately, name every mover in the outcome doc */');
  for (const o of out) {
    const note = H.SELF_INTERSECTION_XFAIL[o.label].note;
    console.log(`  ${JSON.stringify(o.label).replace(/^"|"$/g, "'")}: { pairs: ${o.within}, worstMm: ${o.worstSpanMm.toFixed(4)}${note ? `, note: ${JSON.stringify(note)}` : ''} },`);
  }
}
if (JSON_OUT) console.log(JSON.stringify({ root: ROOT, node: process.version, rows: out, bad }, null, 1));

console.log(`\n${measured} declared row(s) measured${ONLY ? ' (a --only subset; no matrix-level claim)' : ''}, ${agreed} at their recorded magnitude${skippedRefused ? `, ${skippedRefused} export-refused row(s) not measured (--include-refused)` : ''}; band: pairs exactly, span ±${H.SELF_INTERSECTION_TOLERANCE.worstMm} mm; ${process.version}`);
if (bad.length) { console.error(`\nFAIL — ${bad.length} finding(s):`); for (const b of bad) console.error('  ' + b); process.exit(1); }
console.log('every declared magnitude reproduces on this tree.');
