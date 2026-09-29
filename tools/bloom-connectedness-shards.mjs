/* ===================================================================
   bloom-connectedness-shards.mjs — the connectedness gate split across
   parallel jobs, with its coverage PROVED rather than assumed (C20).

   WHY. `bloom-connectedness` ran the whole matrix in ONE job with no
   `timeout-minutes`, under GitHub's 360-minute default, and its recent
   successes took 134-204 minutes — the same shape the export gate had at
   342 of 360 before #294 sharded it, and nothing here can tell SLOW from
   HUNG mid-run. So the matrix is split across N jobs, each with an explicit
   timeout, and one final job assembles the verdict.

   IT IS THE EXPORT GATE'S OWN SCHEME, NOT A SECOND ONE. Membership is
   `shardOf(index, n)` IMPORTED from tools/bloom-export-shards.mjs — one
   owner of which shard a row is in, by MATRIX INDEX (never a label a regex
   can miss, never a count a matrix edit moves) — and so are the census
   format, `parseShard`, `matrixHash`, `writeCensus`, `reconcile` and
   `unionOf`. What this file owns is only what differs: the SLIM RESULT the
   connectedness summary reads (components, stray fraction, the refinement,
   the two read-out lines), and `summarizeConn()`, the ONE function that
   prints the verdict for the unsharded gate and for the merge alike, so the
   sharded verdict cannot drift from the single-job one (bloom-export-shards'
   rule 4, applied here).

   THE TRAP IS COVERAGE, NOT SPEED — that file's header says why, and the
   reconciliation it exports is what proves it: every expected index attempted
   by EXACTLY ONE shard, none in two, none in none, none outside the matrix,
   against the merge's OWN `buildMatrix()` (the fourth durable rule: an owner
   no shard writes), and a shard with no census is a named finding.

   RUN:
     node tools/bloom-connectedness-shards.mjs --plan N
         print each shard's row count and prove the selector partitions the
         live matrix read from the harness.
     node tools/bloom-connectedness-shards.mjs --merge <dir> --shards N [--only <re>]
         reconcile the N census files in <dir> and print the merged verdict.
     node tools/bloom-connectedness-shards.mjs --negative-control [--shards N]
         censuses from the SHIPPED selector with no browser, then broken —
         one row removed from one shard's selector, a row in two shards, a
         missing shard, an incomplete shard, a matrix mismatch, a dropped row,
         a TWO-PIECE row and a validity failure each hidden in a middle
         shard — every one must FAIL the shipped reconcile + summarize and
         the unbroken set must pass.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMatrix, exportRefusedLine, exportRefusedCoverage, CAPABILITY_SCOPE, JUNCTION_SCOPE, STAMEN_SCOPE, GYNOECIUM_SCOPE,
         STEM_SCOPE, STEM_CHANNEL_SCOPE, ORIENTATION_SCOPE } from './bloom-harness.mjs';
import { crowdingCoverage, CROWDING_SCOPE } from './bloom-crowding.mjs';
import { CENSUS_VERSION, shardOf, parseShard, matrixHash, writeCensus, reconcile, unionOf } from './bloom-export-shards.mjs';

export { shardOf, parseShard, matrixHash, writeCensus };

/* THE SHARD COUNT CI RUNS. The workflow's matrix lists 0..N-1 and passes this
   same N to every shard and to the merge; `--plan` prints it. Four, because the
   single job ran 134-204 min and a shard's install + browser overhead is ~5
   min: four keeps every shard well inside a 150-minute timeout on the slowest
   observed runner while costing the fewest runners. Round-robin by index, so
   the matrix's expensive blocks (ALL MAX, the INFLO and INFILL corners, the
   448M-voxel domes) spread across shards instead of landing in one. */
export const CI_CONN_SHARDS = 4;

/* THE SLIM RESULT — exactly the fields the summary reads, and nothing JSON
   cannot carry. The two read-out lines are rendered by the gate (which holds
   the whole crowding and orientation records) and carried as TEXT, so the
   merge prints what the shard printed. `crowded` is what `crowdingCoverage`
   reads; `ringThickness` / `ringWidth` / `tris` are what the matrix-level
   response checks read. */
export function slimConn(r, lines) {
  return {
    label: r.label, capability: !!r.capability, ok: r.ok, note: r.note || null,
    tris: r.tris, boundary: r.boundary, comps: r.comps ?? null, strayFraction: r.strayFraction ?? null,
    refined: r.refined ? { cell: r.refined.cell, comps: r.refined.comps ?? null, artefact: !!r.refined.artefact, skipped: !!r.refined.skipped } : null,
    coarse: r.coarse ? { comps: r.coarse.comps } : null,
    crowded: !!(r.crowding && r.crowding.crowded),
    crowdingText: lines.crowding, orientationText: lines.orientation,
    ringThickness: r.ringThickness, ringWidth: r.ringWidth,
  };
}

/* THE SUMMARY AND THE VERDICT — one function, two callers. Everything it
   prints was printed by the gate before this file existed, in the same order
   and words. `matrixLevel` makes the claims about the MATRIX (false for
   --only, a shard and the negative control). Returns { bad, dropped,
   failures, skipped, validity } — the caller exits. */
export function summarizeConn({ results, refused, attempted, validity, matrixLevel, elapsedS, cell, log = console.log, err = console.error }) {
  validity = validity.slice();
  /* VALIDITY 2 and 3 — the pairwise triangle comparison and the foot
     controls reaching footRing() — are MATRIX-LEVEL, so not made on a
     filtered run or a shard (see the gate's header). */
  if (matrixLevel) {
    const r3 = results.find((r) => r.label === 'petalCount 3');
    const r40 = results.find((r) => r.label === 'petalCount 40');
    if (!r3 || !r40) validity.push('pairwise check: petalCount 3 / 40 rows missing from results');
    else if (!(r40.tris > r3.tris)) validity.push(`pairwise check: petalCount 40 exports ${r40.tris} tris(export), not more than petalCount 3 at ${r3.tris} — the slider did not drive geometry`);
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
      if (!cmp(row[key], base[key])) validity.push(`response check: "${label}" reports ${key} ${row[key]}, not ${word} than the default's ${base[key]} — the control is not reaching footRing()`);
    }
  }

  log(`connectedness: voxel flood fill at ${cell} mm (assumed min printable feature: 1.0 mm)\n`);
  const failures = [], skipped = [];
  for (const r of results) {
    const verdict = r.ok === null ? 'SKIP' : r.ok ? 'ok  ' : 'FAIL';
    if (r.ok === null) skipped.push(r);
    else if (!r.ok) failures.push(r);
    const detail = r.comps !== null && r.comps !== undefined
      ? `components=${r.comps} stray=${r.strayFraction} tris(export)=${r.tris} boundary=${r.boundary}${r.refined ? (r.refined.artefact ? ` [${r.coarse.comps} components at ${cell} mm read as ONE at ${r.refined.cell} mm — a rasterisation artefact of the sampler, not a gap]` : ` [still ${r.refined.comps} components at ${r.refined.cell} mm — a real gap]`) : ''}`
      : (r.note || '');
    log(`  ${verdict} ${r.label.padEnd(46)} ${detail}`);
    if (r.capability) log(`       ^ SCOPE: ${CAPABILITY_SCOPE}`);
    log(`       ^ ${r.crowdingText}`);
    log(`       ^ ${r.orientationText}`);
  }
  for (const rr of refused) log(`\n${exportRefusedLine(rr.label, rr)}`);
  if (matrixLevel) validity.push(...exportRefusedCoverage(attempted));

  /* THE DENOMINATOR ITSELF, asserted BEFORE the headline (#220). A DECLARED
     REFUSAL IS NOT A DROPPED ROW (XR1). */
  const got = new Set(results.map((r) => r.label));
  const refusedLabels = new Set(refused.map((r) => r.label));
  const dropped = attempted.filter((l) => !got.has(l) && !refusedLabels.has(l));
  if (dropped.length) validity.push(`row census: ${attempted.length} rows attempted but ${results.length} reached the results — dropped: ${dropped.join(', ')}`);
  log(`\nROWS: ${attempted.length} attempted · ${results.length} reached the results · ${results.length - failures.length - skipped.length} are ONE connected piece`
    + (skipped.length ? ` · ${skipped.length} skipped (grid too large — NOT a pass)` : '')
    + (refused.length ? ` · ${refused.length} EXPORT REFUSED by the generator's own triangle budget (declared, asserted by XR1 — not a pass and not a skip)` : '')
    + (dropped.length ? ` · ${dropped.length} DROPPED by a validity assertion — NOT a pass, and every ratio below divides by the ${results.length} that survived` : '')
    + `; ${elapsedS === null ? 'merged' : `${elapsedS.toFixed(0)}s`}`);
  log('LIMITS: surface occupancy, not solid; cannot see free ends or sub-cell gaps; covers only the matrix above. See the header.');
  log('LIMITS (LAYERS): a PASS here does NOT endorse the junction under layers — the wrong-hub mutation passes this gate on every configuration tried.');
  log(`JUNCTION SCOPE: ${JUNCTION_SCOPE}`);
  log(`ANDROECIUM SCOPE: ${STAMEN_SCOPE}`);
  log(`GYNOECIUM SCOPE: ${GYNOECIUM_SCOPE}`);
  log(`STEM SCOPE: ${STEM_SCOPE}`);
  log(`STEM CHANNEL SCOPE: ${STEM_CHANNEL_SCOPE}`);
  log(`ORIENTATION SCOPE: ${ORIENTATION_SCOPE}`);
  const crowdedRows = results.filter((r) => r.crowded);
  log(`${crowdedRows.length}/${results.length} rows FLAGGED CROWDED (a flag, not a failure — a fused base is ONE piece here by definition) · CROWDING SCOPE: ${CROWDING_SCOPE}`);
  if (matrixLevel) validity.push(...crowdingCoverage(results.map((r) => ({ crowded: r.crowded }))));

  let bad = false;
  if (validity.length) {
    bad = true;
    log(`\nconnectedness: ${validity.length} VALIDITY ASSERTION(S) FAILED — see the "HARNESS INVALID" block (stderr; it may appear ABOVE this line in a combined log).`);
    err(`\nconnectedness: HARNESS INVALID — ${validity.length} validity assertion(s) failed. No result above is trustworthy.`);
    for (const v of validity) err(`  - ${v}`);
  }
  if (failures.length) {
    bad = true;
    log(`\nconnectedness: ${failures.length} ROW(S) FAILED — see the detail on stderr.`);
    err(`\nconnectedness: FAIL — ${failures.length} row(s) export as more than one piece:`);
    for (const f of failures) err(`  - ${f.label}: ${f.comps} components, ${(f.strayFraction * 100).toFixed(2)}% of surface detached`);
  }
  return { bad, dropped, failures, skipped, validity };
}

/* THE MERGE: reconcile (imported), union (imported), then the same summary. */
export function mergeConn(censuses, { n, labels, only = null, cell, log = console.log, err = console.error }) {
  const coverage = reconcile(censuses, { n, labels, only });
  const ok = censuses.filter((c) => c && c.complete === true && c.shard);
  log(`SHARDED CONNECTEDNESS GATE — ${n} shard(s) over the ${labels.length}-row matrix${only ? ` (--only ${only})` : ''}`);
  for (const c of [...ok].sort((a, b) => a.shard.k - b.shard.k)) {
    const got = new Set(c.results.map((r) => r.label)), ref = new Set(c.refused.map((r) => r.label));
    const dr = c.attempted.filter((a) => !got.has(a.label) && !ref.has(a.label));
    log(`  shard ${c.shard.k}/${c.shard.n}: ${c.attempted.length} attempted · ${c.results.length} reached · ${c.refused.length} refused · ${dr.length} dropped · ${c.validity.length} validity · ${c.elapsedS != null ? c.elapsedS.toFixed(0) + 's' : '?'}${dr.length ? ` — DROPPED: ${dr.map((a) => a.label).join(', ')}` : ''}`);
  }
  const u = unionOf(ok);
  log(`SHARD COVERAGE: ${coverage.length ? `FAILED — ${coverage.length} finding(s)` : `every one of the ${u.attempted.length} expected row(s) attempted by exactly one shard`}`);
  const validity = [...coverage.map((c) => `SHARD COVERAGE: ${c}`), ...u.validity];
  return summarizeConn({ results: u.results, refused: u.refused, attempted: u.attempted, validity, matrixLevel: !only, elapsedS: null, cell, log, err });
}

/* THE NEGATIVE CONTROL — no browser; censuses from the shipped selector over
   the real matrix with synthetic ONE-PIECE results, which is exactly what the
   reconciliation reads. */
function fakeResult(label) {
  return { label, capability: false, ok: true, note: null, tris: 100, boundary: 0, comps: 1, strayFraction: 0, refined: null, coarse: null,
    crowded: false, crowdingText: 'CROWDING (synthetic)', orientationText: 'ORIENTATION (synthetic)', ringThickness: 1.2, ringWidth: 6.4 };
}
function syntheticCensuses(labels, n, select = shardOf, only = '.') {
  const hash = matrixHash(labels);
  const cs = [];
  for (let k = 0; k < n; k++) {
    const idx = labels.map((l, i) => i).filter((i) => select(i, n) === k);
    cs.push({ version: CENSUS_VERSION, complete: true, shard: { k, n }, only, matrix: { count: labels.length, hash },
      attempted: idx.map((i) => ({ index: i, label: labels[i] })), results: idx.map((i) => fakeResult(labels[i])),
      refused: [], validity: [], elapsedS: 0 });
  }
  return cs;
}
export function negativeControl(n = CI_CONN_SHARDS) {
  const labels = buildMatrix().map((r) => r.label);
  const quiet = { log: () => {}, err: () => {} };
  const mid = Math.floor(n / 2);
  const run = (cs) => mergeConn(cs, { n, labels, only: '.', cell: 0.6, ...quiet });
  const cases = [
    ['the unbroken set', () => syntheticCensuses(labels, n), false],
    ['ONE ROW REMOVED FROM ONE SHARD\'S SELECTOR (the S5 failure)', () => {
      const victim = labels.findIndex((l, i) => shardOf(i, n) === mid);
      return syntheticCensuses(labels, n, (i, m) => (i === victim ? -1 : shardOf(i, m)));
    }, true],
    ['one row in TWO shards', () => syntheticCensuses(labels, n).map((c) => {
      if (c.shard.k === 0) { const i = labels.findIndex((l, j) => shardOf(j, n) === 1); c.attempted.push({ index: i, label: labels[i] }); c.results.push(fakeResult(labels[i])); }
      return c;
    }), true],
    ['a shard with NO census (crashed / timed out)', () => syntheticCensuses(labels, n).filter((c) => c.shard.k !== mid), true],
    ['a shard whose census is INCOMPLETE', () => syntheticCensuses(labels, n).map((c) => (c.shard.k === mid ? { ...c, complete: false } : c)), true],
    ['a shard that saw a DIFFERENT matrix', () => syntheticCensuses(labels, n).map((c) => (c.shard.k === mid ? { ...c, matrix: { ...c.matrix, hash: '0'.repeat(64) } } : c)), true],
    ['a DROPPED row hidden in a middle shard', () => syntheticCensuses(labels, n).map((c) => (c.shard.k === mid ? { ...c, results: c.results.slice(1) } : c)), true],
    ['a TWO-PIECE row hidden in a middle shard', () => syntheticCensuses(labels, n).map((c) => (c.shard.k === mid ? { ...c, results: c.results.map((r, j) => (j === 0 ? { ...r, ok: false, comps: 2, strayFraction: 0.01 } : r)) } : c)), true],
    ['a VALIDITY failure hidden in a middle shard', () => syntheticCensuses(labels, n).map((c) => (c.shard.k === mid ? { ...c, validity: ['planted'] } : c)), true],
  ];
  let ok = true;
  for (const [name, make, mustFail] of cases) {
    const { bad } = run(make());
    const pass = bad === mustFail;
    ok = ok && pass;
    console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${name}: the merged verdict ${bad ? 'FAILED' : 'PASSED'}${mustFail ? ' (must fail)' : ' (must pass)'}`);
  }
  const victim = labels.findIndex((l, i) => shardOf(i, n) === mid);
  const f = reconcile(syntheticCensuses(labels, n, (i, m) => (i === victim ? -1 : shardOf(i, m)), null), { n, labels });
  console.log(`  the finding it prints:\n${f.map((x) => `    - ${x}`).join('\n')}`);
  if (!f.some((x) => x.includes(`${victim} "`))) { ok = false; console.log('  FAIL the finding does not name the removed row'); }
  return ok;
}

/* =================================================================== CLI */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const val = (f) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : undefined);
  const n = val('--shards') ? +val('--shards') : CI_CONN_SHARDS;
  const flush = async (code) => {
    for (const s of [process.stdout, process.stderr]) if (s.writableLength) await new Promise((res) => s.write('', res));
    process.exit(code);
  };
  if (argv.includes('--negative-control')) {
    console.log(`CONNECTEDNESS SHARD NEGATIVE CONTROL — ${n} shards over the real matrix, synthetic censuses, the SHIPPED reconcile + summarize:`);
    const ok = negativeControl(n);
    console.log(ok ? '\nCONNECTEDNESS SHARD NEGATIVE CONTROL: PASS — every break failed the merged verdict and the unbroken set passed.' : '\nCONNECTEDNESS SHARD NEGATIVE CONTROL: FAILED — the reconciliation is not measuring coverage.');
    await flush(ok ? 0 : 1);
  } else if (argv.includes('--plan')) {
    const pn = +(val('--plan') || n);
    const labels = buildMatrix().map((r) => r.label);
    const counts = Array.from({ length: pn }, () => 0);
    for (let i = 0; i < labels.length; i++) counts[shardOf(i, pn)]++;
    const bad = reconcile(syntheticCensuses(labels, pn, shardOf, null), { n: pn, labels });
    console.log(`${labels.length} rows (the live matrix, read from tools/bloom-harness.mjs's buildMatrix()) over ${pn} shards: ${counts.join(' / ')}${bad.length ? `\nPARTITION BROKEN:\n${bad.join('\n')}` : ' — every row in exactly one shard, none in two, the union the matrix'}`);
    await flush(bad.length ? 1 : 0);
  } else if (argv.includes('--merge')) {
    const dir = val('--merge');
    const files = fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }).filter((f) => /census-.*\.json$/.test(String(f))) : [];
    const cs = [];
    for (const f of files) {
      try { cs.push(JSON.parse(fs.readFileSync(path.join(dir, String(f)), 'utf8'))); }
      catch (e) { cs.push({ version: -1, shard: null, error: `${f}: ${e.message}` }); }
    }
    console.log(`read ${files.length} census file(s) from ${dir}`);
    const { bad } = mergeConn(cs, { n, labels: buildMatrix().map((r) => r.label), only: val('--only') || null, cell: +(val('--cell') || 0.6) });
    await flush(bad ? 1 : 0);
  } else {
    console.error('usage: --plan N | --merge <dir> --shards N [--only <re>] [--cell mm] | --negative-control [--shards N]');
    await flush(2);
  }
}
