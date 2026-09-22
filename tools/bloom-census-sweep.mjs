/* ===================================================================
   bloom-census-sweep.mjs — THE SAME BUILD, TWO CENSUSES, EVERY ROW.

   WHY THIS EXISTS. `tools/verify-bloom-census-adjacency.mjs` replays stored
   pairs and proves the RULE. It cannot say what the rule does to the matrix,
   and the two questions this PR has to answer are matrix-level: does any row's
   X2 VERDICT move on main, and do the 108 rows PR #278 reddened read 0 here.
   The STL gates answer both in about three and a half hours in CI; this is the
   census half of that answer in Node, in minutes, with no browser.

   THE ONE THING THAT MAKES IT EVIDENCE: the row is built ONCE and handed to
   BOTH censuses as the same Float64Array. Nothing on the build side can account
   for a difference, so a difference is the census's and only the census's. A
   two-pass comparison would leave the build as a second explanation.

   MODE AND SAMPLING, because the durable rule asks: EXPORT mode, the row's own
   capability, its set over DEFAULTS coerced by each control's kind (a matrix
   row's values are strings and the geometry's guards are truthiness tests on
   numbers — `!'0'` is false). That is the path X0 takes in the export gate, so
   the doubles censused here are the doubles the gate censuses. The pair count is
   a property of the tessellation, and the worst span is the largest chord any
   intersecting pair carries — NOT a fold depth. Two artefact points sitting at
   the two ends of one SHARED EDGE report that edge's own length, which is how
   `VARIANCE: size ±50% x 40 petals` came to be read as a 0.8187 mm fold.

   WHAT IT DOES NOT DO. It is not the gate: X0 (the file's floats are these
   doubles) and every other family ride in the STL gates alone. It reads the
   geometry from `--geom`, the matrix and the xfail lists from `--harness`, and
   the two censuses from `--a` and `--b`, so any tree can be measured against
   any other; nothing here restates a clause.

   RUN:
     node tools/bloom-census-sweep.mjs --geom <tree> --harness <tree> \
          --a <tree> --b <tree> [--shard i/n] [--only <regex>] \
          [--maxtri <n>] --out <file.jsonl>
     node tools/bloom-census-sweep.mjs ... --report <file.jsonl>   read a sweep back
   The out file is JSONL appended a row at a time and RESUMABLE — a run
   interrupted by a container bound costs one row, never the sweep.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const argv = process.argv.slice(2);
const arg = (k, d = null) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const REPORT = arg('--report');
/* PREDECLARE, THEN MEASURE. Two of these can never legitimately move and are
   hard failures; the third is a real class that a change may move, so it is
   declared as a number rather than printed and forgotten. A report that only
   PRINTS its findings is a log line, which is this repo's own rule about a
   self-check that does not abort. */
const EXPECT_WORST_MOVES = Number(arg('--expect-worst-moves', '0'));

function report(file) {
  const raw = fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  /* DEDUPE BY LABEL, and say how many. The out file is appended and resumable,
     so two shards racing the same file — or a resume overlapping a run that had
     not yet exited — can write a row twice. Counting it twice would inflate
     every population below silently. A duplicate that DISAGREES is a different
     thing entirely and is a hard failure: the census is deterministic, so two
     readings of one row must be identical. */
  const seen = new Map(); let dupes = 0; const disagree = [];
  for (const r of raw) {
    const k = r.label, was = seen.get(k);
    if (was === undefined) { seen.set(k, r); continue; }
    dupes++;
    if (JSON.stringify(was) !== JSON.stringify(r)) disagree.push(k);
  }
  const recs = [...seen.values()];
  if (dupes) console.log(`deduped ${dupes} repeated row(s) of ${raw.length}; ${disagree.length} disagreed`);
  const cen = recs.filter((r) => r.a && r.b);
  const verdict = (r, s) => r[s].within > 0 && !r.declared;
  const flipped = cen.filter((r) => verdict(r, 'a') !== verdict(r, 'b'));
  const moved = cen.filter((r) => r.a.within !== r.b.within);
  const crossMoved = cen.filter((r) => r.a.cross !== r.b.cross);
  const firedA = cen.filter((r) => verdict(r, 'a'));
  const firedB = cen.filter((r) => verdict(r, 'b'));
  console.log(`rows in file ${recs.length} · censused ${cen.length} · skipped ${recs.filter((r) => r.skipped).length} · errors ${recs.filter((r) => r.error).length}`);
  console.log(`X2 would fire on  : ${firedA.length} row(s) under A · ${firedB.length} under B`);
  console.log(`X2 VERDICT flipped: ${flipped.length}`);
  for (const r of flipped) console.log(`    ${verdict(r, 'a') ? 'fired ' : 'silent'} -> ${verdict(r, 'b') ? 'fires ' : 'silent'}  ${r.a.within} -> ${r.b.within}   ${r.label}`);
  console.log(`CROSS-shell count moved on: ${crossMoved.length} row(s)  (a rule keyed on a SHARED VERTEX cannot reach a cross-shell pair — two triangles with a corner in common are one shell by the census's own union-find — so anything but 0 here refutes that)`);
  for (const r of crossMoved.slice(0, 10)) console.log(`    ${r.a.cross} -> ${r.b.cross}   ${r.label}`);
  const worstMoved = cen.filter((r) => !Object.is(r.a.worst, r.b.worst));
  console.log(`WORST SPAN moved on: ${worstMoved.length} row(s), predeclared ${EXPECT_WORST_MOVES}  (X1 gates the span at +-5e-5 mm, so this is a gated quantity and not a diagnostic)`);
  for (const r of worstMoved.slice(0, 20)) console.log(`    ${r.a.worst.toExponential(4)} -> ${r.b.worst.toExponential(4)}  ${r.declared ? 'declared' : 'UNDECLARED'}  ${r.label}`);
  console.log(`within-shell COUNT moved on: ${moved.length} row(s) (${moved.filter((r) => r.declared).length} declared, ${moved.filter((r) => !r.declared).length} undeclared)`);
  for (const r of moved) console.log(`    ${String(r.a.within).padStart(7)} -> ${String(r.b.within).padStart(7)}  ${r.declared ? 'declared' : 'UNDECLARED'}  ${r.label}`);
  const errs = recs.filter((x) => x.error);
  for (const r of errs) console.log(`    ERROR ${r.label}: ${r.error}`);

  const bad = [];
  if (flipped.length) bad.push(`${flipped.length} row(s) changed their X2 VERDICT`);
  if (crossMoved.length) bad.push(`${crossMoved.length} row(s) moved their CROSS-shell count, which a rule keyed on a shared vertex cannot reach`);
  if (worstMoved.length !== EXPECT_WORST_MOVES) bad.push(`${worstMoved.length} row(s) moved their worst span, ${EXPECT_WORST_MOVES} predeclared`);
  if (errs.length) bad.push(`${errs.length} row(s) failed to build or census`);
  if (disagree.length) bad.push(`${disagree.length} row(s) were censused twice and DISAGREED — the census must be deterministic: ${disagree.slice(0, 3).join(', ')}`);
  if (moved.some((r) => !r.declared)) bad.push(`${moved.filter((r) => !r.declared).length} UNDECLARED row(s) moved their count — that is a finding, not a re-record`);
  console.log(bad.length ? `\nFAIL — ${bad.join('; ')}.` : '\nPASS — no verdict moved, no cross-shell pair moved, no undeclared row moved, and the worst spans moved exactly as predeclared.');
  process.exit(bad.length ? 1 : 0);
}
if (REPORT) report(REPORT);

const GEOM = path.resolve(arg('--geom')), HARN = path.resolve(arg('--harness'));
const A = path.resolve(arg('--a')), B = path.resolve(arg('--b'));
const ONLY = arg('--only') ? new RegExp(arg('--only')) : null;
const SHARD = arg('--shard'), OUT = arg('--out');
const MAXTRI = Number(arg('--maxtri', 'Infinity'));

const load = (root, f) => import(pathToFileURL(path.join(root, f)).href);
const [H, SA, SB, G, R] = await Promise.all([
  load(HARN, 'tools/bloom-harness.mjs'),
  load(A, 'tools/bloom-self-intersection.mjs'),
  load(B, 'tools/bloom-self-intersection.mjs'),
  load(GEOM, 'bloom-geometry.js'),
  load(GEOM, 'bloom-registry.js'),
]);

const kindOf = new Map(H.CONTROLS.map((c) => [c.id, c]));
const stateOf = (row) => {
  const s = { ...R.DEFAULTS };
  for (const w of row.set || []) {
    const c = kindOf.get(w.id); if (!c) throw new Error(`${row.label}: no control ${w.id}`);
    s[w.id] = c.kind === 'slider' ? Number(w.value) : c.kind === 'check' ? (w.value === true || w.value === 'true') : w.value;
  }
  return s;
};

let rows = H.buildMatrix().filter((r) => !ONLY || ONLY.test(r.label));
if (SHARD) { const [i, n] = SHARD.split('/').map(Number); rows = rows.filter((_, k) => k % n === i); }
const refused = new Set(Object.keys(H.EXPORT_REFUSED_XFAIL || {}));
const declared = new Set(Object.keys(H.SELF_INTERSECTION_XFAIL));

const done = new Set();
if (OUT && fs.existsSync(OUT)) for (const ln of fs.readFileSync(OUT, 'utf8').split('\n')) {
  if (!ln.trim()) continue; try { done.add(JSON.parse(ln).label); } catch { /* a torn last line */ }
}
const emit = (rec) => { if (OUT) fs.appendFileSync(OUT, JSON.stringify(rec) + '\n'); };

for (const row of rows) {
  if (done.has(row.label)) continue;
  if (refused.has(row.label)) { emit({ label: row.label, skipped: 'export-refused' }); continue; }
  let rec;
  try {
    const acc = new G.MeshBuilder({ exportMode: true });
    G.buildBloomInto(acc, stateOf(row), { below: null, capability: row.capability || null });
    const pos = new Float64Array(acc.positions);
    const tris = pos.length / 9;
    if (tris > MAXTRI) { emit({ label: row.label, skipped: 'over maxtri', tris }); continue; }
    const ra = SA.census(pos), rb = SB.census(pos);
    rec = { label: row.label, tris, declared: declared.has(row.label),
      a: { within: ra.within, cross: ra.cross, worst: ra.worstSpanMm, shells: ra.shells },
      b: { within: rb.within, cross: rb.cross, worst: rb.worstSpanMm, shells: rb.shells } };
  } catch (e) { rec = { label: row.label, error: String((e && e.message) || e) }; }
  emit(rec);
  const mv = rec.a && rec.a.within !== rec.b.within;
  process.stderr.write(`${mv ? 'MOVED ' : '      '}a=${String(rec.a?.within ?? '-').padStart(7)} b=${String(rec.b?.within ?? '-').padStart(7)}  ${rec.label}\n`);
}
console.log('sweep complete');
