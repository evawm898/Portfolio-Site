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
     node tools/bloom-connectedness-shards.mjs --merge <dir> --shards N [--only <re>] [--jobs <json>] [--timeout-min M]
         reconcile the N census files in <dir> and print the merged verdict.
         `--jobs` is the run's OWN job list (`gh api .../runs/$GITHUB_RUN_ID/jobs`)
         and `--timeout-min` the shard job's `timeout-minutes`: see THE
         CANCELLED-AFTER-COMPLETE HOLE below.
     node tools/bloom-connectedness-shards.mjs --negative-control [--shards N]
         censuses from the SHIPPED selector with no browser, then broken —
         one row removed from one shard's selector, a row in two shards, a
         missing shard, an incomplete shard, a matrix mismatch, a dropped row,
         a TWO-PIECE row and a validity failure each hidden in a middle
         shard — every one must FAIL the shipped reconcile + summarize and
         the unbroken set must pass. Then THROUGH THE FILES, the way the CI
         step reads them: a shard's artifact missing from the directory, a
         census TRUNCATED mid-write, a shard job the run reports CANCELLED
         with a complete census beside it, a shard whose own elapsed reads
         past the job timeout — each must fail, and the complete set with
         every job green must pass; a shard past SHARD_FLAG_SHARE of the
         timeout must be FLAGGED and not failed, and the projection must
         read the rows' own ms.

   THE SHARD COUNT IS EIGHT, RULED ON SHARD-LEVEL EVIDENCE (Eva, Nov 4, the
   shard-headroom session — more shards, not a longer timeout). Four shards
   measured on the same 1,653 rows: 150.2 / 114.2 / 147.1 / 128.7 min on
   main's run for #483 (shard 0 cancelled at the limit) and 95.4 / 143.7 /
   92.0 / 133.7 min on #487's run — the SAME rows swing 95 to 150 min between
   runners, so no model from the rows' triangle counts holds (shard 0 carries
   the most triangles and was both the fastest and the slowest). Balanced,
   eight shards is 58-68 min a shard (39-45% of the timeout) against 78-90
   (52-60%) at six, which the measured round-robin imbalance (+/-15% on
   triangle share) puts at the 70% bar. The rows' own ms (`attempted[].ms`,
   stamped by the gate since #487) are in every census now, so EVERY MERGE
   PRINTS THE PER-ROW TABLE AND THE PROJECTED PER-SHARD TOTALS FOR 6 / 8 / 10
   SHARDS from them — the next run measures what this count was chosen
   without. A shard over SHARD_FLAG_SHARE (70%) of the timeout is a FLAG in
   the verdict's output, by ruling, never a fail; at the timeout less a
   minute it is the HEADROOM finding above.

   THE CANCELLED-AFTER-COMPLETE HOLE (Nov 4, the shard-headroom session).
   main's push run for #483 (07c2997, run 41586065592) had shard 0 CANCELLED
   at its 150-minute timeout and the verdict PASSED over all 1,653 rows.
   Measured from the job's own log: the gate printed its `connectedness:
   PASS — 413 of 414` line at 08:19:50.965 and the runner's `The operation
   was canceled` at 08:19:51.111 — the census had been written, complete,
   146 ms before the timeout hit the process in its final flush, and the
   upload step (`if: always()`) carried it to the verdict. So the verdict
   read four COMPLETE censuses and was right about every row; what it could
   not see is that a shard RAN TO ITS TIMEOUT, which the workflow's own
   comment calls a HANG DECLARED. Nothing in a census says the job was
   cancelled, and the elapsed it carries is the gate's own clock (it starts
   after node loads) so a shard at the limit reads a few seconds UNDER it.
   Two clauses now, with two owners: the run's own job list (`--jobs`, the
   runner's conclusion for each `shard (k)`, read from the API the verdict job
   is granted `actions: read` for) must say every shard job SUCCEEDED; and
   each census's `elapsedS` must sit under the job timeout less one minute
   (`--timeout-min`; the minute is the step's own non-gate overhead — node
   start and the flush — measured on that run at 13 s, bounded here rather
   than typed exactly). Either fires on main's run shape; neither relaxes
   what a census says about a row. A shard that finished and was cancelled
   is a shard with NO HEADROOM, and the verdict says so instead of green.
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMatrix, exportRefusedLine, exportRefusedCoverage, CAPABILITY_SCOPE, JUNCTION_SCOPE, STAMEN_SCOPE, GYNOECIUM_SCOPE,
         STEM_SCOPE, STEM_CHANNEL_SCOPE, ORIENTATION_SCOPE } from './bloom-harness.mjs';
import { crowdingCoverage, CROWDING_SCOPE } from './bloom-crowding.mjs';
import { CENSUS_VERSION, shardOf, parseShard, matrixHash, writeCensus, reconcile, unionOf } from './bloom-export-shards.mjs';

export { shardOf, parseShard, matrixHash, writeCensus };

/* THE SHARD COUNT CI RUNS. The workflow's matrix lists 0..N-1 and passes this
   same N to every shard and to the merge; `--plan` prints it. EIGHT since
   Nov 4 (four ran a shard to its 150-min timeout on main — the header's
   numbers): balanced, 58-68 min a shard on the two measured runs, so a runner
   half again slower still sits under SHARD_FLAG_SHARE. Round-robin by index,
   so the matrix's expensive blocks (ALL MAX, the INFLO and INFILL corners,
   the 448M-voxel domes) spread across shards instead of landing in one.
   Changing it is THREE edits: this constant, and `SHARDS` plus the matrix
   list in BOTH jobs of .github/workflows/bloom-connectedness.yml. */
export const CI_CONN_SHARDS = 8;

/* THE SHARE OF THE TIMEOUT PAST WHICH A SHARD IS FLAGGED in the verdict's
   output — a flag, never a fail (Eva, Nov 4) — and the counts the projection
   is printed for on every merge. */
export const SHARD_FLAG_SHARE = 0.70;
export const PROJECTED_SHARD_COUNTS = [6, 8, 10];

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
/* THE STEP'S OWN NON-GATE OVERHEAD, in minutes: node start before the gate's
   clock begins and the flush after it stops. Measured 13 s on run 41586065592
   (step start 05:49:37, gate clock to the PASS line 08:19:50) and bounded at
   a minute, so a census whose elapsed reads within a minute of the timeout
   is a shard the runner cancelled at or after its last write. */
export const SHARD_OVERHEAD_MIN = 1;

/* THE RUN'S OWN JOB LIST against the shard count: every `shard (k)` job for
   k in 0..n-1 present exactly once and SUCCEEDED. `jobs` is the API's
   `{ jobs: [{ name, status, conclusion }] }` (or that array); null means the
   caller did not supply one, which the merge REPORTS rather than passes. */
export function jobClauses(jobs, n) {
  const bad = [];
  if (jobs == null) return bad;
  const list = Array.isArray(jobs) ? jobs : jobs.jobs;
  if (!Array.isArray(list)) { bad.push('JOBS: the job list is not a list'); return bad; }
  for (let k = 0; k < n; k++) {
    const mine = list.filter((j) => j && j.name === `shard (${k})`);
    if (mine.length !== 1) { bad.push(`JOBS: shard ${k}/${n}: ${mine.length} job(s) named "shard (${k})" in the run's job list, expected exactly one`); continue; }
    const j = mine[0];
    if (j.status !== 'completed' || j.conclusion !== 'success') bad.push(`JOBS: shard ${k}/${n}: the runner reports its job ${j.status}/${j.conclusion ?? 'null'}, not completed/success — a CANCELLED shard with a complete census is a shard that ran to its timeout, and the verdict does not pass over it`);
  }
  return bad;
}

/* THE HEADROOM every complete census declares against the job timeout:
   reported per shard, and a FINDING where the gate's own clock reaches the
   timeout less the step overhead. */
export function headroomClauses(censuses, timeoutMin) {
  const bad = [];
  if (timeoutMin == null) return bad;
  if (!(timeoutMin > 0)) { bad.push(`HEADROOM: --timeout-min ${timeoutMin} is not a positive number`); return bad; }
  for (const c of censuses) {
    if (!c || c.complete !== true || !c.shard) continue;
    if (typeof c.elapsedS !== 'number') { bad.push(`HEADROOM: shard ${c.shard.k}/${c.shard.n}: census carries no elapsedS`); continue; }
    const min = c.elapsedS / 60;
    if (min >= timeoutMin - SHARD_OVERHEAD_MIN) bad.push(`HEADROOM: shard ${c.shard.k}/${c.shard.n}: its gate ran ${min.toFixed(1)} min against a ${timeoutMin}-min job timeout (within ${SHARD_OVERHEAD_MIN} min of it) — a shard at its limit is the hang the workflow declares, whatever its census says`);
  }
  return bad;
}

/* THE TIMING REPORT, from the rows' own ms. The table is every attempted row
   in MATRIX order (index · the shard it ran in · its ms · its label), and the
   projection sums the same ms by `shardOf(index, m)` for each candidate m —
   the measured split THIS count would have made of THIS run, on this run's
   runners (the header says how far two runs of one shard differ). A row with
   no ms (a census older than #487) is counted and said, never read as 0. */
export function timingReport(censuses, { n, labels, timeoutMin, counts = PROJECTED_SHARD_COUNTS, log = console.log }) {
  const ok = censuses.filter((c) => c && c.complete === true && c.shard && Array.isArray(c.attempted));
  const byIndex = new Map();
  let untimed = 0;
  for (const c of ok) for (const a of c.attempted) {
    if (typeof a.ms === 'number' && Number.isFinite(a.ms)) byIndex.set(a.index, { ms: a.ms, shard: c.shard.k, label: a.label });
    else untimed++;
  }
  const idx = [...byIndex.keys()].sort((a, b) => a - b);
  log(`\nROW TIMINGS (ms, the gate's own clock around each row, ${idx.length} timed row(s)${untimed ? `, ${untimed} attempted row(s) carry no ms` : ''}):`);
  for (const i of idx) { const r = byIndex.get(i); log(`  ${String(i).padStart(5)}  shard ${String(r.shard).padStart(2)}  ${String(r.ms).padStart(8)} ms  ${r.label}`); }
  if (!idx.length) { log('  (no row carries a timing; no projection)'); return { timed: 0, untimed, projections: [] }; }
  const total = idx.reduce((s, i) => s + byIndex.get(i).ms, 0);
  const projections = [];
  const sets = [...new Set([n, ...counts])].sort((a, b) => a - b);
  log(`PROJECTED PER-SHARD TOTALS from those ms (round-robin by matrix index, this run's own rows and runners; the total is ${(total / 60000).toFixed(1)} min over ${idx.length} rows; install and browser overhead not included):`);
  for (const m of sets) {
    const sums = Array.from({ length: m }, () => 0);
    for (const i of idx) sums[shardOf(i, m)] += byIndex.get(i).ms;
    const mins = sums.map((x) => x / 60000);
    const worst = Math.max(...mins);
    const share = timeoutMin ? worst / timeoutMin : null;
    const over = timeoutMin ? mins.filter((x) => x / timeoutMin > SHARD_FLAG_SHARE).length : 0;
    projections.push({ m, mins, worst, share, over });
    log(`  ${m} shards${m === n ? ' (this run\'s count)' : ''}: ${mins.map((x) => x.toFixed(1)).join(' / ')} min · worst ${worst.toFixed(1)}${share != null ? ` = ${(100 * share).toFixed(0)}% of the ${timeoutMin}-min timeout` : ''}${over ? ` · ${over} shard(s) would be past ${Math.round(100 * SHARD_FLAG_SHARE)}% — FLAG` : ''}`);
  }
  return { timed: idx.length, untimed, projections };
}

export function mergeConn(censuses, { n, labels, only = null, cell, jobs = null, timeoutMin = null, log = console.log, err = console.error }) {
  const coverage = reconcile(censuses, { n, labels, only });
  const ok = censuses.filter((c) => c && c.complete === true && c.shard);
  log(`SHARDED CONNECTEDNESS GATE — ${n} shard(s) over the ${labels.length}-row matrix${only ? ` (--only ${only})` : ''}`);
  for (const c of [...ok].sort((a, b) => a.shard.k - b.shard.k)) {
    const got = new Set(c.results.map((r) => r.label)), ref = new Set(c.refused.map((r) => r.label));
    const dr = c.attempted.filter((a) => !got.has(a.label) && !ref.has(a.label));
    const head = timeoutMin && typeof c.elapsedS === 'number' ? ` · ${(100 * c.elapsedS / 60 / timeoutMin).toFixed(0)}% of the ${timeoutMin}-min timeout` : '';
    const timed = c.attempted.filter((a) => typeof a.ms === 'number');
    const slowest = timed.length ? timed.reduce((a, b) => (b.ms > a.ms ? b : a)) : null;
    log(`  shard ${c.shard.k}/${c.shard.n}: ${c.attempted.length} attempted · ${c.results.length} reached · ${c.refused.length} refused · ${dr.length} dropped · ${c.validity.length} validity · ${c.elapsedS != null ? c.elapsedS.toFixed(0) + 's' : '?'}${head}${slowest ? ` · slowest row ${(slowest.ms / 1000).toFixed(0)}s "${slowest.label}"` : ''}${dr.length ? ` — DROPPED: ${dr.map((a) => a.label).join(', ')}` : ''}`);
  }
  const jobBad = jobClauses(jobs, n);
  const headBad = headroomClauses(censuses, timeoutMin);
  log(`SHARD JOBS: ${jobs == null ? 'NOT CHECKED — no --jobs list was supplied (a cancelled shard with a complete census would pass here)' : jobBad.length ? `FAILED — ${jobBad.length} finding(s)` : `every one of the ${n} shard jobs completed/success in the run's own job list`}`);
  log(`SHARD HEADROOM: ${timeoutMin == null ? 'NOT CHECKED — no --timeout-min was supplied' : headBad.length ? `FAILED — ${headBad.length} finding(s)` : `every shard's gate clock under the ${timeoutMin}-min timeout less ${SHARD_OVERHEAD_MIN} min`}`);
  /* THE FLAG (a flag, not a fail — Eva's ruling, Nov 4): a shard past
     SHARD_FLAG_SHARE of the timeout is named here so the next reader sees
     the count needs raising before a shard reaches the limit. */
  if (timeoutMin) for (const c of [...ok].sort((a, b) => a.shard.k - b.shard.k)) {
    if (typeof c.elapsedS !== 'number') continue;
    const share = c.elapsedS / 60 / timeoutMin;
    if (share > SHARD_FLAG_SHARE) log(`SHARD HEADROOM FLAG: shard ${c.shard.k}/${c.shard.n} ran ${(c.elapsedS / 60).toFixed(1)} min = ${(100 * share).toFixed(0)}% of the ${timeoutMin}-min timeout, past ${Math.round(100 * SHARD_FLAG_SHARE)}% — a flag, not a failure: raise the shard count (three edits, see CI_CONN_SHARDS) before a shard reaches the limit`);
  }
  timingReport(censuses, { n, labels, timeoutMin, log });
  const u = unionOf(ok);
  log(`SHARD COVERAGE: ${coverage.length ? `FAILED — ${coverage.length} finding(s)` : `every one of the ${u.attempted.length} expected row(s) attempted by exactly one shard`}`);
  const validity = [...coverage.map((c) => `SHARD COVERAGE: ${c}`), ...jobBad, ...headBad, ...u.validity];
  return summarizeConn({ results: u.results, refused: u.refused, attempted: u.attempted, validity, matrixLevel: !only, elapsedS: null, cell, log, err });
}

/* THE CENSUS DIRECTORY, read the way the CI step reads it: every
   census-*.json under <dir>, a file that does not parse carried as a census
   with version -1 and its error, so `reconcile` names it rather than the
   merge throwing. ONE reader for the CLI and the file-level control. */
export function readCensusDir(dir) {
  const files = fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }).filter((f) => /census-.*\.json$/.test(String(f))) : [];
  const cs = [];
  for (const f of files) {
    try { cs.push(JSON.parse(fs.readFileSync(path.join(dir, String(f)), 'utf8'))); }
    catch (e) { cs.push({ version: -1, shard: null, error: `${f}: ${e.message}` }); }
  }
  return { files, censuses: cs };
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
      attempted: idx.map((i) => ({ index: i, label: labels[i], ms: 1000 })), results: idx.map((i) => fakeResult(labels[i])),
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

  /* THROUGH THE FILES. Write the unbroken set to a directory as the shards
     do, then break it the ways a RUN breaks it — the ways the synthetic
     objects above cannot be broken, because they never touch disk or the
     runner. Each case must fail through the SAME reader and merge the CI
     step calls, and its finding must name the shard. */
  const TIMEOUT = 150;
  const jobsOk = () => ({ jobs: Array.from({ length: n }, (_, k) => ({ name: `shard (${k})`, status: 'completed', conclusion: 'success' })) });
  const fileCases = [
    ['the complete set on disk, every job green', (dir) => ({ jobs: jobsOk() }), false, null],
    ['a shard\'s ARTIFACT MISSING from the directory', (dir) => { fs.unlinkSync(path.join(dir, `census-${mid}.json`)); return { jobs: jobsOk() }; }, true, `shard ${mid}/${n}: NO CENSUS`],
    ['a census TRUNCATED mid-write', (dir) => { const f = path.join(dir, `census-${mid}.json`); const t = fs.readFileSync(f, 'utf8'); fs.writeFileSync(f, t.slice(0, Math.floor(t.length / 2))); return { jobs: jobsOk() }; }, true, `census-${mid}.json`],
    ['a shard job the run reports CANCELLED beside its complete census', (dir) => { const j = jobsOk(); j.jobs[mid].conclusion = 'cancelled'; return { jobs: j }; }, true, `JOBS: shard ${mid}/${n}`],
    ['a shard job MISSING from the run\'s job list', (dir) => { const j = jobsOk(); j.jobs.splice(mid, 1); return { jobs: j }; }, true, `JOBS: shard ${mid}/${n}`],
    ['a shard whose gate clock reads at the job timeout (main\'s run shape, 07c2997)', (dir) => { const f = path.join(dir, `census-${mid}.json`); const c = JSON.parse(fs.readFileSync(f, 'utf8')); c.elapsedS = TIMEOUT * 60 - 10; fs.writeFileSync(f, JSON.stringify(c)); return { jobs: jobsOk() }; }, true, `HEADROOM: shard ${mid}/${n}`],
    ['no job list supplied at all (reported, and the complete set still passes — the workflow is what supplies it)', (dir) => ({ jobs: null }), false, null],
    ['a shard at 80% of the timeout: FLAGGED in the output and NOT failed (the ruling)', (dir) => { const f = path.join(dir, `census-${mid}.json`); const c = JSON.parse(fs.readFileSync(f, 'utf8')); c.elapsedS = TIMEOUT * 60 * 0.8; fs.writeFileSync(f, JSON.stringify(c)); return { jobs: jobsOk() }; }, false, `SHARD HEADROOM FLAG: shard ${mid}/${n}`],
    ['the projection reads the rows\' own ms (every row 1000 ms here, so 8 shards project to the row counts in minutes)', (dir) => ({ jobs: jobsOk() }), false, `  8 shards${n === 8 ? ' (this run\'s count)' : ''}: ${(() => { const m = 8, sums = Array.from({ length: m }, () => 0); labels.forEach((l, i) => { sums[shardOf(i, m)] += 1000; }); return sums.map((x) => (x / 60000).toFixed(1)).join(' / '); })()} min`],
    ['a census with NO row timings says so and projects from the rest, and still passes', (dir) => { const f = path.join(dir, `census-${mid}.json`); const c = JSON.parse(fs.readFileSync(f, 'utf8')); for (const a of c.attempted) delete a.ms; fs.writeFileSync(f, JSON.stringify(c)); return { jobs: jobsOk() }; }, false, `${labels.filter((l, i) => shardOf(i, n) === mid).length} attempted row(s) carry no ms`],
  ];
  for (const [name, breakIt, mustFail, needle] of fileCases) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'conn-census-'));
    try {
      for (const c of syntheticCensuses(labels, n)) { const { version, complete, ...rest } = c; writeCensus(path.join(dir, `census-${c.shard.k}.json`), rest); }
      const { jobs } = breakIt(dir);
      const { censuses } = readCensusDir(dir);
      const lines = [];
      const { bad } = mergeConn(censuses, { n, labels, only: '.', cell: 0.6, jobs, timeoutMin: TIMEOUT, log: (l) => lines.push(String(l)), err: (l) => lines.push(String(l)) });
      const named = needle ? lines.some((l) => l.includes(needle)) : true;
      const pass = bad === mustFail && named;
      ok = ok && pass;
      console.log(`  ${pass ? 'ok  ' : 'FAIL'} [files] ${name}: the merged verdict ${bad ? 'FAILED' : 'PASSED'}${mustFail ? ' (must fail)' : ' (must pass)'}${needle && !named ? ` — the finding does not name "${needle}"` : ''}`);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
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
    const { files, censuses: cs } = readCensusDir(dir);
    console.log(`read ${files.length} census file(s) from ${dir}`);
    let jobs = null;
    if (val('--jobs')) {
      try { jobs = JSON.parse(fs.readFileSync(val('--jobs'), 'utf8')); }
      catch (e) { jobs = { jobs: null, error: e.message }; console.log(`the job list at ${val('--jobs')} did not parse: ${e.message}`); }
    }
    const timeoutMin = val('--timeout-min') ? +val('--timeout-min') : null;
    const { bad } = mergeConn(cs, { n, labels: buildMatrix().map((r) => r.label), only: val('--only') || null, cell: +(val('--cell') || 0.6), jobs, timeoutMin });
    await flush(bad ? 1 : 0);
  } else {
    console.error('usage: --plan N | --merge <dir> --shards N [--only <re>] [--cell mm] [--jobs <json>] [--timeout-min M] | --negative-control [--shards N]');
    await flush(2);
  }
}
