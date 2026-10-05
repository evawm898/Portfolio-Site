/* ===================================================================
   bloom-export-shards.mjs — the export gate split across parallel jobs,
   with its coverage PROVED rather than assumed.

   WHY. `bloom-export-watertight` ran 342 minutes on b4088e3 (#292's head,
   run 36324870437: 26 min of Node preflight, 315 min of matrix) against
   GitHub's 360-minute job limit, and nothing here can tell SLOW from HUNG
   mid-run. So the 952-row matrix is split across N jobs, each with an
   explicit timeout, and one final job assembles the verdict.

   THE TRAP IS COVERAGE, NOT SPEED. A shard scheme that silently omits a row
   produces a green gate that checked less than it says — S5's eleven-chunk
   local run dropped exactly one row to a regex, found only by an explicit
   reconciliation. So:

     1. ONE OWNER OF WHICH SHARD A ROW IS IN: `shardOf(index, n)`, a pure
        function of the row's MATRIX INDEX (not its label, which a regex can
        miss, and not a count, which a matrix edit moves). The gate imports it
        and so does the reconciliation; nothing else decides membership.
     2. EVERY SHARD WRITES A CENSUS: the matrix it saw (count + a hash of every
        label in order), the indices it ATTEMPTED, the slim results it
        REACHED, the rows the generator REFUSED, its validity failures, and
        `complete: true` as the last thing written. A shard that crashed,
        timed out or never started leaves no census, and that is a finding.
     3. THE RECONCILIATION REBUILDS THE EXPECTED SET FROM ITS OWN
        `buildMatrix()` — an owner no shard writes (the fourth durable rule:
        a clause that took the row count from the shards would agree with a
        shard that lost one). Every expected index must be attempted by
        EXACTLY ONE shard: none in two, none in none, none outside the matrix,
        and the label at that index must be the matrix's own.
     4. THE VERDICT IS ASSEMBLED FROM ALL SHARDS BY THE SAME FUNCTION THE
        UNSHARDED GATE USES — `summarize()` below. The headline divides by the
        UNION, a dropped row in any shard is named in the merged census, and
        the matrix-level claims (crowding raised both ways, the XFAIL lists
        naming only rows the matrix ran, the pinned coverage rows present) are
        made once, over the union, never per shard, where they are false by
        construction.

   WHAT IT DOES NOT COVER: whether a shard measured its rows CORRECTLY — that
   is the gate's own business, row by row, exactly as unsharded. This file
   proves only that the union of what the shards claim to have measured is
   the matrix, once, and that the verdict reads every shard.

   RUN:
     node tools/bloom-export-shards.mjs --plan N
         print each shard's row count and prove the selector partitions.
     node tools/bloom-export-shards.mjs --merge <dir> --shards N [--only <re>]
         reconcile the N census files in <dir> and print the merged verdict.
     node tools/bloom-export-shards.mjs --negative-control [--shards N]
         builds censuses from the SHIPPED selector with no browser, then
         breaks them — one row removed from one shard's selector, one row in
         two shards, a missing shard, an incomplete shard, a matrix mismatch,
         a dropped row hidden in a middle shard, a failure hidden in a middle
         shard — and requires the shipped reconcile + summarize to FAIL on
         every one, and to PASS on the unbroken set.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildMatrix, exportRefusedLine, exportRefusedCoverage, infloOvertopCoverage, infloApproachCoverage, JUNCTION_SCOPE, ZYGO_SCOPE, STAMEN_SCOPE, GYNOECIUM_SCOPE, STEM_SCOPE, curlCoverage,
         ORIENTATION_SCOPE, SELF_INTERSECTION_SCOPE, SELF_INTERSECTION_XFAIL_HAS, SELF_INTERSECTION_TOLERANCE, STEM_CHANNEL_SCOPE,
         selfIntersectionCoverage, selfIntersectionRefusedNote } from './bloom-harness.mjs';
import { crowdingCoverage, CROWDING_SCOPE } from './bloom-crowding.mjs';
import { SAGITTA_SCOPE } from './bloom-sagitta.mjs';

export const CENSUS_VERSION = 1;
/* THE SHARD COUNT CI RUNS. The workflow's matrix lists 0..N-1 and passes this
   same N to every shard and to the merge; `--plan` prints it. Round-robin by
   index, so the matrix's expensive blocks (ALL MAX, the INFLO and INFILL
   corners) spread across shards instead of landing in one. */
export const CI_SHARDS = 8;

/* THE ONE OWNER OF MEMBERSHIP. */
export function shardOf(index, n) {
  if (!Number.isInteger(n) || n < 1) throw new Error(`shard count must be a positive integer, got ${n}`);
  return index % n;
}

export function parseShard(argv) {
  const i = argv.indexOf('--shard');
  if (i < 0) return null;
  const m = /^(\d+)\/(\d+)$/.exec(argv[i + 1] || '');
  if (!m) throw new Error(`--shard wants k/n (e.g. 3/8), got "${argv[i + 1]}"`);
  const k = +m[1], n = +m[2];
  if (n < 1 || k >= n) throw new Error(`--shard ${k}/${n}: need 0 <= k < n`);
  return { k, n };
}

export function matrixHash(labels) {
  return crypto.createHash('sha256').update(JSON.stringify(labels)).digest('hex');
}

/* THE SLIM RESULT — exactly the fields the summary reads, and nothing that
   JSON cannot carry (an Infinity would come back as null and read as a
   different number). The unsharded gate summarizes the SAME slim records, so
   a field the summary needs and the slim drops fails both paths at once
   rather than only the sharded one. */
export function slimResult(r) {
  const sag = r.sagitta;
  return {
    label: r.label, boundary: r.boundary, liveTris: r.liveTris, tris: r.tris, degenerate: r.degenerate,
    crowded: !!(r.crowding && r.crowding.crowded),
    orientationOk: r.orientation.inward === r.orientation.declaredInward,
    sagitta: !sag ? null : sag.skipped ? { skipped: true }
      : { worst: { d: sag.worst.d, u: sag.worst.u, zone: sag.worst.zone }, zone: { base: sag.zone.base, middle: sag.zone.middle, apex: sag.zone.apex } },
    coverageSkipped: !!r.coverageSkipped, coverageAsserted: !!r.coverageAsserted,
    selfContact: !!r.selfContact, underFloor: !!r.underFloor, sphere: !!r.sphere,
    solid: !!r.solid, solidAsserted: !!r.solidAsserted, solidR5mismatch: (r.solidR5 && r.solidR5.mismatch) || 0,
  };
}

/* ===================================================================
   THE SUMMARY AND THE VERDICT — one function, two callers (the unsharded
   gate and the merge). Everything it prints was printed by the gate before
   this file existed, in the same order and words.
     matrixLevel: make the claims about the MATRIX (false for --only, a shard
                  and the negative control, exactly as before).
   Returns { bad, lines } — the caller exits. */
export function summarize({ results, refused, attempted, validity, matrixLevel, elapsedS, negativeControl = false, log = console.log, err = console.error }) {
  validity = validity.slice();
  const failures = [], countMoved = [], degenerates = [];
  for (const r of results) {
    if (r.boundary !== 0) failures.push(r);
    if (r.liveTris !== r.tris) countMoved.push(r);
    if (r.degenerate !== 0) degenerates.push(r);
  }
  if (matrixLevel) validity.push(...exportRefusedCoverage(attempted), ...infloOvertopCoverage(attempted), ...infloApproachCoverage(attempted));
  /* THE DENOMINATOR ITSELF, asserted — and the three real populations printed
     beside it (#220). A DECLARED REFUSAL IS NOT A DROPPED ROW (XR1). */
  const got = new Set(results.map((r) => r.label));
  const refusedLabels = new Set(refused.map((r) => r.label));
  const dropped = attempted.filter((l) => !got.has(l) && !refusedLabels.has(l));
  if (dropped.length) validity.push(`row census: ${attempted.length} rows attempted but ${results.length} reached the results — dropped: ${dropped.join(', ')}`);
  log(`\nROWS: ${attempted.length} attempted · ${results.length} reached the results · ${results.length - failures.length} watertight (boundary = 0)`
    + (refused.length ? ` · ${refused.length} EXPORT REFUSED by the generator's own triangle budget (declared, asserted by XR1 — not a pass and not a skip)` : '')
    + (dropped.length ? ` · ${dropped.length} DROPPED by a validity assertion — NOT a pass` : '')
    + (elapsedS != null ? `; ${elapsedS.toFixed(0)}s` : ''));
  if (dropped.length) log(`  ^ every ratio below divides by the ${results.length} row(s) that SURVIVED, not by the ${attempted.length} in the matrix.`);
  log(`${results.length - countMoved.length}/${results.length} measured configs have IDENTICAL live and export triangle counts (the floor changes geometry, never topology)`);
  log(`${results.length - degenerates.length}/${results.length} measured configs emit NO degenerate triangles (the converging tip cap's apex, and the DOME's before it)`);
  log(`JUNCTION SCOPE: ${JUNCTION_SCOPE}`);
  log(`ORIENTATION SCOPE: ${ORIENTATION_SCOPE}`);
  log(`SELF-INTERSECTION SCOPE: ${SELF_INTERSECTION_SCOPE}`);
  {
    const xf = results.filter((r) => SELF_INTERSECTION_XFAIL_HAS(r.label)).length;
    log(`${results.length - xf}/${results.length} configs free of within-shell self-intersection; ${xf} declared XFAIL (each still failing at its RECORDED magnitude — the pair count exactly, the worst span within ±${SELF_INTERSECTION_TOLERANCE.worstMm} mm — asserted by X1) · ${results.filter((r) => r.orientationOk).length}/${results.length} configs meeting the orientation baseline O1 itself declared for them (every shell outward, plus the SPHERE hub's inner face, the stem bore's own sealed cavity, and every FLORET's own two where each exists)`);
  }
  log(`ZYGOMORPHY SCOPE: ${ZYGO_SCOPE}`);
  log(`ANDROECIUM SCOPE: ${STAMEN_SCOPE}`);
  log(`GYNOECIUM SCOPE: ${GYNOECIUM_SCOPE}`);
  log(`STEM SCOPE: ${STEM_SCOPE}`);
  log(`STEM CHANNEL SCOPE: ${STEM_CHANNEL_SCOPE}`);
  log(`${results.filter((r) => r.crowded).length}/${results.length} configs FLAGGED CROWDED (a flag, not a failure) · CROWDING SCOPE: ${CROWDING_SCOPE}`);
  {
    const sg = results.map((r) => r.sagitta).filter((x) => x && !x.skipped);
    const sk = results.filter((r) => r.sagitta && r.sagitta.skipped).length;
    if (sg.length) {
      let w = { d: -1 };
      for (const x of sg) if (x.worst.d > w.d) w = x.worst;
      const mx = (z) => sg.reduce((a, x) => Math.max(a, x.zone[z]), -1);
      log(`${sg.length}/${results.length} rows sagitta-measured (${sk} skipped, labelled) · worst ${w.d.toFixed(4)} mm at u=${w.u.toFixed(3)} (${w.zone}) · by zone: base ${mx('base').toFixed(4)} middle ${mx('middle').toFixed(4)} apex ${mx('apex').toFixed(4)} mm`);
      log(`  ${SAGITTA_SCOPE}`);
    }
  }
  /* MATRIX-LEVEL claims are claims about the MATRIX: never made by --only, a
     shard, or the negative control — made by the merge, over the union. */
  if (matrixLevel) validity.push(...crowdingCoverage(results.map((r) => ({ crowded: r.crowded }))));
  if (matrixLevel) validity.push(...selfIntersectionCoverage(results.map((r) => r.label), refused.map((r) => r.label)));
  { const note = selfIntersectionRefusedNote(refused.map((r) => r.label)); if (note) log(note); }
  if (matrixLevel) validity.push(...curlCoverage(results.map((r) => ({ selfContact: r.selfContact }))));
  {
    const skipped = results.filter((r) => r.coverageSkipped), asserted = results.filter((r) => r.coverageAsserted);
    log(`${results.length - skipped.length}/${results.length} rows plan-coverage measured; ${skipped.length} SKIPPED (split whorls — labelled, never silent); ${asserted.length} rows coverage-ASSERTED (the pinned incurve rows); ${results.filter((r) => r.selfContact).length} rows flag SELF-CONTACT; ${results.filter((r) => r.underFloor).length} rows carry a shipped uniform arc UNDER ONE SHEET THICKNESS (told, not clamped)`);
    for (const r of skipped) log(`  skipped: ${r.label}`);
    if (asserted.length === 0 && matrixLevel) validity.push('coverage coverage: no row in this matrix asserts plan coverage — the pinned incurve rows are missing');
    const spheres = results.filter((r) => r.sphere);
    const solidMeasured = results.filter((r) => r.solid), solidAsserted = results.filter((r) => r.solidAsserted);
    log(`${spheres.length}/${results.length} rows are FULL-SPHERE heads — every one a labelled PLAN-coverage skip (a plan raster reads a sphere as a false clean) and every one READ by the solid-angle instrument; ${solidMeasured.length}/${results.length} rows solid-angle measured (the rest FLAT, labelled), ${solidAsserted.length} rows solid-coverage-ASSERTED (the rows Eva pinned, session 19), R5 mismatches across every row: ${results.reduce((a, r) => a + r.solidR5mismatch, 0)}`);
    if (matrixLevel) {
      if (spheres.length === 0) validity.push('coverage coverage: no row in this matrix is a FULL-SPHERE head — the loud skip is unexercised (a default is not coverage; block 22 is missing)');
      if (results.length - skipped.length === 0) validity.push('coverage coverage: every row was skipped — the raster measured nothing');
      if (solidAsserted.length === 0) validity.push('coverage coverage: no row in this matrix asserts SOLID coverage — the pinned SPHERE rows are missing');
      if (solidMeasured.length === 0) validity.push('coverage coverage: no row was solid-angle measured — the instrument read nothing');
    }
  }

  let bad = false;
  if (validity.length) {
    bad = true;
    log(`\nexport gate: ${validity.length} VALIDITY ASSERTION(S) FAILED — see the "HARNESS INVALID" block (stderr; it may appear ABOVE this line in a combined log).`);
    err(`\nexport gate: HARNESS INVALID — ${validity.length} validity assertion(s) failed. No result above is trustworthy.`);
    for (const v of validity) err(`  - ${v}`);
  }
  if (failures.length) {
    bad = true;
    log(`\nexport gate: ${failures.length} CONFIG(S) NOT WATERTIGHT — see the detail on stderr.`);
    err(`\nexport gate: FAIL — ${failures.length} config(s) export with open (boundary) edges:`);
    for (const f of failures) err(`  - ${f.label}: boundary=${f.boundary}`);
  }
  if (degenerates.length) {
    bad = true;
    log(`\nexport gate: ${degenerates.length} CONFIG(S) EMIT DEGENERATE TRIANGLES — see the detail on stderr.`);
    err(`\nexport gate: FAIL — ${degenerates.length} config(s) emit degenerate (zero-area) triangles:`);
    for (const f of degenerates) err(`  - ${f.label}: degenerate=${f.degenerate} of ${f.tris} (export)`);
  }
  if (countMoved.length) {
    bad = true;
    log(`\nexport gate: ${countMoved.length} CONFIG(S) MOVED TRIANGLE COUNT BETWEEN MODES — see the detail on stderr.`);
    err(`\nexport gate: FAIL — ${countMoved.length} config(s) have DIFFERENT live and export triangle counts. The export floor is meant to change geometry and never topology:`);
    for (const f of countMoved) err(`  - ${f.label}: tris(live)=${f.liveTris} tris(export)=${f.tris}`);
  }
  if (negativeControl) return { bad, dropped, validity };
  if (bad) {
    /* THE LAST LINE OF STDOUT MUST NEVER READ AS A PASS ON A FAILING RUN. */
    log(`\nexport gate: FAILED — ${dropped.length} row(s) dropped of ${attempted.length} attempted, ${validity.length} validity assertion(s), ${failures.length} not watertight, ${degenerates.length} with degenerate triangles, ${countMoved.length} whose triangle count moved between modes. Nothing above is a pass.`);
  } else {
    log(`\nexport gate: PASS — ${results.length} of ${attempted.length} attempted configs reached the results and every one exports watertight${refused.length ? `; ${refused.length} config(s) the generator REFUSED on its own triangle budget, declared and asserted by XR1 (named above) rather than skipped` : ''}.`);
  }
  return { bad, dropped, validity };
}

/* ===================================================================
   THE CENSUS a shard writes. `attempted` carries INDICES — the reconciliation
   is about positions in the matrix, and two rows with one label (there are
   none today; nothing forbids it) would otherwise be one row twice. */
export function writeCensus(file, c) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ version: CENSUS_VERSION, ...c, complete: true }));
}

/* ===================================================================
   THE RECONCILIATION. `labels` is the reconciler's OWN buildMatrix(), never
   the shards'. Returns a list of findings; empty is the only pass. */
export function reconcile(censuses, { n, labels, only = null, select = shardOf }) {
  const bad = [];
  const want = new Set(labels.map((l, i) => i).filter((i) => !only || new RegExp(only).test(labels[i])));
  const hash = matrixHash(labels);
  const byK = new Map();
  for (const c of censuses) {
    const tag = `shard ${c && c.shard ? `${c.shard.k}/${c.shard.n}` : '?'}`;
    if (!c || c.version !== CENSUS_VERSION) { bad.push(`${tag}: census version ${c && c.version} is not ${CENSUS_VERSION}`); continue; }
    if (c.complete !== true) { bad.push(`${tag}: census is INCOMPLETE — the shard did not finish writing it`); continue; }
    if (!c.shard || c.shard.n !== n) { bad.push(`${tag}: ran as one of ${c.shard && c.shard.n} shards, the merge expects ${n}`); continue; }
    if (byK.has(c.shard.k)) { bad.push(`${tag}: TWO censuses claim this shard`); continue; }
    byK.set(c.shard.k, c);
    if (c.matrix.count !== labels.length) bad.push(`${tag}: saw a ${c.matrix.count}-row matrix, the merge's own buildMatrix() has ${labels.length}`);
    if (c.matrix.hash !== hash) bad.push(`${tag}: saw a DIFFERENT matrix (label hash ${c.matrix.hash.slice(0, 12)} against the merge's ${hash.slice(0, 12)})`);
    if ((c.only || null) !== (only || null)) bad.push(`${tag}: ran with --only ${JSON.stringify(c.only)}, the merge with ${JSON.stringify(only)}`);
  }
  for (let k = 0; k < n; k++) if (!byK.has(k)) bad.push(`shard ${k}/${n}: NO CENSUS — the shard crashed, timed out, never ran, or its artifact was lost. Its rows were measured by nobody.`);
  /* EXACTLY ONCE, against the merge's own expected set. */
  const seen = new Map();
  for (const [k, c] of byK) {
    const mine = new Set();
    for (const a of c.attempted) {
      if (!Number.isInteger(a.index) || a.index < 0 || a.index >= labels.length) { bad.push(`shard ${k}/${n}: attempted index ${a.index}, outside the ${labels.length}-row matrix`); continue; }
      if (labels[a.index] !== a.label) bad.push(`shard ${k}/${n}: row ${a.index} is "${a.label}" in its census and "${labels[a.index]}" in the matrix`);
      if (!want.has(a.index)) bad.push(`shard ${k}/${n}: attempted row ${a.index} ("${a.label}"), which is not in the expected set`);
      if (seen.has(a.index)) bad.push(`row ${a.index} ("${labels[a.index]}") was attempted by shard ${seen.get(a.index)} AND shard ${k} — measured twice`);
      else seen.set(a.index, k);
      mine.add(a.index);
    }
    /* THE SHARD RAN ITS OWN SELECTOR — a second, per-shard statement of the
       same partition, which names the shard where the union check can only
       name the row. */
    const should = [...want].filter((i) => select(i, n) === k);
    const missing = should.filter((i) => !mine.has(i));
    if (missing.length) bad.push(`shard ${k}/${n}: its selector owes ${should.length} row(s) and it attempted ${mine.size}; missing ${missing.map((i) => `${i} "${labels[i]}"`).join(', ')}`);
    const att = new Set(c.attempted.map((a) => a.label));
    for (const r of [...c.results, ...c.refused]) if (!att.has(r.label)) bad.push(`shard ${k}/${n}: reports a result for "${r.label}", which it never attempted`);
  }
  const none = [...want].filter((i) => !seen.has(i));
  if (none.length) bad.push(`${none.length} row(s) of the ${want.size} the matrix owes were attempted by NO shard: ${none.map((i) => `${i} "${labels[i]}"`).join(', ')}`);
  return bad;
}

/* THE UNION, in MATRIX ORDER — so every list the summary prints (the plan
   coverage skips, the dropped rows) reads in the order the unsharded gate
   prints it, and the two runs can be compared line for line. */
export function unionOf(censuses) {
  const idx = new Map();
  for (const c of censuses) for (const a of c.attempted || []) idx.set(a.label, a.index);
  const by = (a, b) => (idx.get(a.label) ?? 1e9) - (idx.get(b.label) ?? 1e9);
  return {
    attempted: censuses.flatMap((c) => c.attempted || []).sort((a, b) => a.index - b.index).map((a) => a.label),
    results: censuses.flatMap((c) => c.results || []).sort(by),
    refused: censuses.flatMap((c) => c.refused || []).sort(by),
    validity: censuses.flatMap((c) => (c.validity || []).map((v) => `[shard ${c.shard.k}/${c.shard.n}] ${v}`)),
  };
}

export function merge(censuses, { n, labels, only = null, log = console.log, err = console.error }) {
  const coverage = reconcile(censuses, { n, labels, only });
  const ok = censuses.filter((c) => c && c.complete === true && c.shard);
  log(`SHARDED EXPORT GATE — ${n} shard(s) over the ${labels.length}-row matrix${only ? ` (--only ${only})` : ''}`);
  for (const c of [...ok].sort((a, b) => a.shard.k - b.shard.k)) {
    const got = new Set(c.results.map((r) => r.label)), ref = new Set(c.refused.map((r) => r.label));
    const dr = c.attempted.filter((a) => !got.has(a.label) && !ref.has(a.label));
    log(`  shard ${c.shard.k}/${c.shard.n}: ${c.attempted.length} attempted · ${c.results.length} reached · ${c.refused.length} refused · ${dr.length} dropped · ${c.validity.length} validity · ${c.elapsedS != null ? c.elapsedS.toFixed(0) + 's' : '?'}${dr.length ? ` — DROPPED: ${dr.map((a) => a.label).join(', ')}` : ''}`);
  }
  const u = unionOf(ok);
  log(`SHARD COVERAGE: ${coverage.length ? `FAILED — ${coverage.length} finding(s)` : `every one of the ${u.attempted.length} expected row(s) attempted by exactly one shard`}`);
  for (const r of u.refused) log(`\n${exportRefusedLine(r.label, r)}`);
  const validity = [...coverage.map((c) => `SHARD COVERAGE: ${c}`), ...u.validity];
  return summarize({ results: u.results, refused: u.refused, attempted: u.attempted, validity, matrixLevel: !only, elapsedS: null, log, err });
}

/* ===================================================================
   THE NEGATIVE CONTROL — every break must fail through the SHIPPED reconcile
   and summarize; the unbroken set must pass. No browser: the censuses are
   built from the shipped selector over the real matrix, with synthetic
   passing results, which is exactly what the reconciliation reads. */
function fakeResult(label) {
  return { label, boundary: 0, liveTris: 100, tris: 100, degenerate: 0, crowded: false, orientationOk: true,
    sagitta: null, coverageSkipped: false, coverageAsserted: false, selfContact: false, underFloor: false,
    sphere: false, solid: false, solidAsserted: false, solidR5mismatch: 0 };
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
export function negativeControl(n = CI_SHARDS) {
  const labels = buildMatrix().map((r) => r.label);
  const quiet = { log: () => {}, err: () => {} };
  const mid = Math.floor(n / 2);
  /* The synthetic results cannot satisfy the matrix-level claims (no CROWDED
     row, no pinned coverage row), so they are judged with matrixLevel off —
     via --only '.' , which the reconciliation treats as "every row" — and the
     coverage findings are what must move. */
  const run = (cs) => merge(cs, { n, labels, only: '.', ...quiet });
  const cases = [
    ['the unbroken set', () => syntheticCensuses(labels, n), false],
    ['ONE ROW REMOVED FROM ONE SHARD\'S SELECTOR (the S5 failure)', () => {
      const victim = labels.findIndex((l, i) => shardOf(i, n) === mid);
      return syntheticCensuses(labels, n, (i, m) => (i === victim ? -1 : shardOf(i, m)));
    }, true],
    ['one row in TWO shards', () => syntheticCensuses(labels, n, (i, m) => shardOf(i, m)).map((c) => {
      if (c.shard.k === 0) { const i = labels.findIndex((l, j) => shardOf(j, n) === 1); c.attempted.push({ index: i, label: labels[i] }); c.results.push(fakeResult(labels[i])); }
      return c;
    }), true],
    ['a shard with NO census (crashed / timed out)', () => syntheticCensuses(labels, n).filter((c) => c.shard.k !== mid), true],
    ['a shard whose census is INCOMPLETE', () => syntheticCensuses(labels, n).map((c) => (c.shard.k === mid ? { ...c, complete: false } : c)), true],
    ['a shard that saw a DIFFERENT matrix', () => syntheticCensuses(labels, n).map((c) => (c.shard.k === mid ? { ...c, matrix: { ...c.matrix, hash: '0'.repeat(64) } } : c)), true],
    ['a DROPPED row hidden in a middle shard', () => syntheticCensuses(labels, n).map((c) => (c.shard.k === mid ? { ...c, results: c.results.slice(1) } : c)), true],
    ['a NOT-WATERTIGHT row hidden in a middle shard', () => syntheticCensuses(labels, n).map((c) => (c.shard.k === mid ? { ...c, results: c.results.map((r, j) => (j === 0 ? { ...r, boundary: 3 } : r)) } : c)), true],
    ['a VALIDITY failure hidden in a middle shard', () => syntheticCensuses(labels, n).map((c) => (c.shard.k === mid ? { ...c, validity: ['planted'] } : c)), true],
  ];
  let ok = true;
  for (const [name, make, mustFail] of cases) {
    const { bad } = run(make());
    const pass = bad === mustFail;
    ok = ok && pass;
    console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${name}: the merged verdict ${bad ? 'FAILED' : 'PASSED'}${mustFail ? ' (must fail)' : ' (must pass)'}`);
  }
  /* And the S5 case through reconcile alone, with the finding printed, so the
     message a reader would get is on the record. */
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
  const n = val('--shards') ? +val('--shards') : CI_SHARDS;
  const flush = async (code) => {
    for (const s of [process.stdout, process.stderr]) if (s.writableLength) await new Promise((res) => s.write('', res));
    process.exit(code);
  };
  if (argv.includes('--negative-control')) {
    console.log(`SHARD NEGATIVE CONTROL — ${n} shards over the real matrix, synthetic censuses, the SHIPPED reconcile + summarize:`);
    const ok = negativeControl(n);
    console.log(ok ? '\nSHARD NEGATIVE CONTROL: PASS — every break failed the merged verdict and the unbroken set passed.' : '\nSHARD NEGATIVE CONTROL: FAILED — the reconciliation is not measuring coverage.');
    await flush(ok ? 0 : 1);
  } else if (argv.includes('--plan')) {
    const pn = +(val('--plan') || n);
    const labels = buildMatrix().map((r) => r.label);
    const counts = Array.from({ length: pn }, () => 0);
    for (let i = 0; i < labels.length; i++) counts[shardOf(i, pn)]++;
    const bad = reconcile(syntheticCensuses(labels, pn, shardOf, null), { n: pn, labels });
    console.log(`${labels.length} rows over ${pn} shards: ${counts.join(' / ')}${bad.length ? `\nPARTITION BROKEN:\n${bad.join('\n')}` : ' — every row in exactly one shard'}`);
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
    const { bad } = merge(cs, { n, labels: buildMatrix().map((r) => r.label), only: val('--only') || null });
    await flush(bad ? 1 : 0);
  } else {
    console.error('usage: --plan N | --merge <dir> --shards N [--only <re>] | --negative-control [--shards N]');
    await flush(2);
  }
}
