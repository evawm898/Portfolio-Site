/* ===================================================================
   verify-bloom-surface-bytes.mjs — THE SURFACE EXTRACTION MOVED NOTHING.

     node tools/verify-bloom-surface-bytes.mjs --base <worktree> [--from K] [--rows N] [--only <label regex>] [--control] [--movers <label regex>]

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
        IT ALSO CARRIES WHETHER EACH SLOT WAS BUILT AT ALL, because the sphere
        stem's omission mask can leave `built.petals[slot]` NULL — see
        `gridFloatsOf`'s own header for why that is a value and not a skip.

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
/* THE PARTITION (session 38, PR 2). A feature that ADDS rows to the matrix
   cannot claim "0 floats moved" over the whole matrix: the base tree does not
   know the new controls, so every row that engages them builds the default on
   the base and the feature here, and differs BY DESIGN. `--movers <regex>`
   names those rows by label, predeclared: every matching row MUST move (at
   least one float, in at least one mode — a mover that holds is a feature that
   did nothing, refused as vacuous), every other row must hold to the bit, and
   the verdict prints both counts. Without it the tool is the session-37 shape:
   every row holds. A generated `<id> min/max` row for a new control whose
   guard is off (the count, coverage and tip shape at depth 0) is a HOLDER and
   must not be named. */
const MOVERS = argOf('--movers') ? new RegExp(argOf('--movers')) : null;
/* `--movers-predicate <name>` — THE PARTITION FROM A GUARD PREDICATE, never
   from a label (#299's port: the stem's nodes). A label regex is a claim ABOUT
   the rows; a predicate on the row's own state is the claim the change makes —
   "a row moves iff its state engages the feature" — and it is evaluated per
   row, on the coerced state, so a row whose label says one thing and whose set
   does another is classified by what it BUILDS. The predicates are declared
   in `PREDICATE_MOVERS` below, each with its reason; an unknown name refuses.
   `--range a:b` compares matrix rows a..b-1 only and `--json <file>` writes the
   run's counters and findings, so a full-matrix partition closes in
   foreground chunks that survive this container (CLAUDE.md: background work
   does not outlive a turn); `--merge f1,f2,...` closes the chunks into one
   verdict and REFUSES a set of chunks that does not tile the matrix. */
const MOVERS_PRED = argOf('--movers-predicate');
const RANGE = argOf('--range');
const JSON_OUT = argOf('--json');
const MERGE = argOf('--merge');
if (MERGE) {
  const fs = await import('node:fs');
  const parts = MERGE.split(',').map((f) => JSON.parse(fs.readFileSync(f, 'utf8'))).sort((a, b) => a.from - b.from);
  const bad = [];
  const total = parts[0].matrixRows;
  let at = 0;
  for (const p of parts) {
    if (p.matrixRows !== total) bad.push(`chunk ${p.from}:${p.to} was taken over a ${p.matrixRows}-row matrix, not ${total}`);
    if (p.from !== at) bad.push(`the chunks do not tile the matrix: expected a chunk from row ${at}, got ${p.from}`);
    at = p.to;
    if (p.predicate !== parts[0].predicate || p.base !== parts[0].base) bad.push(`chunk ${p.from}:${p.to} ran a different predicate or base`);
  }
  if (at !== total) bad.push(`the chunks end at row ${at} of ${total}`);
  const sum = (k) => parts.reduce((n, p) => n + p[k], 0);
  const fails = [...bad, ...parts.flatMap((p) => p.fails)];
  console.log(`MERGED ${parts.length} chunks over ${total} rows x 2 modes, predicate ${parts[0].predicate}, base ${parts[0].base}`);
  console.log(`partition     : ${sum('moversMoved')} of ${sum('moversSeen')} predeclared movers MOVED (every one must), ${sum('holdersSeen')} holders compared to the bit`);
  console.log(`export stream : ${sum('floats').toLocaleString()} floats over ${sum('tris').toLocaleString()} triangles`);
  console.log(`captured grid : ${sum('gridFloats').toLocaleString()} values over ${sum('panels').toLocaleString()} panels (live)`);
  if (!sum('moversSeen')) fails.push('VACUOUS: no mover in the matrix');
  if (fails.length) { console.log(`\nFAIL — ${fails.length} finding(s):`); for (const f of fails.slice(0, 60)) console.log('  ' + f); process.exit(1); }
  console.log(`\nPASS — 0 floats moved on the ${sum('holdersSeen')} holders, positionally, under Object.is; all ${sum('moversSeen')} predeclared movers moved.`);
  process.exit(0);
}
if (!BASE || !existsSync(path.join(BASE, 'bloom-geometry.js'))) {
  console.error('usage: node tools/verify-bloom-surface-bytes.mjs --base <worktree of the base commit> [--rows N] [--control] [--movers <label regex>]');
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

const ONLY = argOf('--only') ? new RegExp(argOf('--only')) : null;
const MATRIX = harness.buildMatrix();
const [RFROM, RTO] = RANGE ? RANGE.split(':').map(Number) : [0, MATRIX.length];
/* `--from K` starts at the K-th selected row (0-based), so a full-matrix run
   can be closed out in foreground chunks of `--from K --rows N` without a
   label regex that might miss a row. The union of the chunks is the matrix.
   `--range a:b` is the same idea by MATRIX index, and composes with it. */
const FROM = +(argOf('--from') || 0) || 0;
const rows = MATRIX.slice(RFROM, RTO).filter((r) => !ONLY || ONLY.test(r.label)).slice(FROM, FROM + LIMIT);
/* THE PREDICATES. Each reads the row's own coerced state and, where the
   change moves a record the BASE tree owns, the BASE tree's own builder — so
   the prediction's owner is never the quantity under test. */
const PREDICATE_MOVERS = {
  /* ORGANIC VARIANCE, BUILD 2 (form). A row moves iff the FORM field exists on
     this tree — the geometry's own `varianceFormIsAbsent`, the guard. Every
     other row, the SIZE rows included, must hold to the bit: that is the claim
     that the form amount at 0 is inert AND that factoring the shared wave out
     of the size field moved no size float. The base tree does not know
     `varianceForm` at all, so a mover builds its default form there. */
  'variance-form': (st) => !mine.varianceFormIsAbsent(st),
  /* FORM VARIANCE HEADROOM (the build-2 follow-up — docs/bloom-organic-
     variance-form-outcome.md §19). The law changed only where a petal's
     slot term meets a side with LESS room than the half-span, so a row moves
     iff SOME petal the BASE tree built carries a non-zero term on a base whose
     room on that side — measured from the BASE tree's own role composition
     (`resolveRoleOverrides` without the slot term), clamped — is under the
     half-span AND above zero (see the two identities below). Read off the BASE tree's builder and resolver, never this
     tree's `formScaled`, so the prediction's owner is not the quantity under
     test. Every row with the amount at 0 is a holder by this predicate's
     first line, which is the byte-inertness claim re-measured. */
  'form-headroom': (st) => {
    if (base.varianceFormIsAbsent(st)) return false;
    const acc = new base.MeshBuilder({ exportMode: true });
    const b = base.buildBloomInto(acc, st);
    for (const p of b.petalsAll) {
      if (!p || !p.formTerm) continue;
      const roles = [p.role, p.allRole, p.slotRole, p.petalRole].filter((r) => r !== null && r !== undefined);
      const comp = base.resolveRoleOverrides(st, roles) || {};
      for (const q of base.FORM_VARIANCE_BASES) {
        const t = p.formTerm[q.base];
        if (!(t !== 0)) continue;
        const from = q.base in comp ? comp[q.base] : Number(st[q.base]);
        const at = Math.min(q.max, Math.max(q.min, from));
        const room = t >= 0 ? q.max - at : at - q.min;
        const half = (q.max - q.min) / 2;
        /* THE OLD LAW IS clamp(at + t) AND THE NEW ONE at + t * room / half,
           and they are the SAME number in two cases this predicate first
           missed: room 0 (both give `at` — a slider at its END, where headroom
           IS the clamp; the first run predeclared `ALL MAX`, every slider at an
           end, and it held to the bit, which is the tool doing its job) and
           |t| = half with the term past the room (both give the range end).
           A petal moves iff 0 < room < half and neither holds. */
        if (room > 0 && room < half && !(Math.abs(t) > room && Math.abs(t) === half)) return true;
      }
    }
    return false;
  },
  /* THE STEM'S NODES. A row moves iff (i) its state engages the node law on
     THIS tree (the geometry's own `stemNodesAbsent`, which is the guard), or
     (ii) the leaf node pitch floor, made mode-free by the same change, moves
     the LIVE leaf count — read off the BASE tree's own `leafPlan` in LIVE mode
     against this tree's, which is the only place that change can act. */
  'stem-nodes': (st) => {
    if (!mine.stemNodesAbsent(st)) return true;
    if (mine.leafIsAbsent(st)) return false;
    const liveCount = (G) => {
      const acc = new G.MeshBuilder({ exportMode: false });
      const fr = G.footRing(st, acc);
      const sp = G.stemPlan(st, fr.hub, acc);
      return G.leafPlan(st, sp, acc).nodes;
    };
    return liveCount(mine) !== liveCount(base);
  },
};
if (MOVERS_PRED && !PREDICATE_MOVERS[MOVERS_PRED]) { console.error(`--movers-predicate ${MOVERS_PRED}: no such predicate (${Object.keys(PREDICATE_MOVERS).join(', ')})`); process.exit(2); }
if (MOVERS_PRED && MOVERS) { console.error('--movers and --movers-predicate are two declarations of one partition; give one'); process.exit(2); }
console.log(`${rows.length} rows x 2 modes — this tree against ${BASE}`);
const allFails = [];
let floats = 0, gridFloats = 0, tris = 0, rowsDone = 0, panels = 0;
let controlFired = 0;

/* Walk a captured grid into a flat list of [label, value] so the comparison is
   one loop and a shape change (a panel that appeared or vanished) is a failure
   rather than a silently shorter walk.

   A SLOT THAT WAS NOT BUILT IS A VALUE IN THE STREAM, NEVER A SKIP. This loop
   read `petals[p].grid` unguarded, and `built.petals` carries a NULL wherever a
   slot was declared and not built — which the sphere stem's omission mask is the
   first thing in this project ever to produce. So the tool THREW on eleven rows
   of the live matrix (the ten `SPHERE STEM:` rows that actually build a stem,
   plus `LEAVES: x a SPHERE with a stem`) and could not complete a full-matrix
   run at all; CLAUDE.md names that class in as many words — an instrument that
   indexes by slot and never asks whether the slot was built.
   A BARE `continue` WOULD BE THE OTHER DEFECT: it defines the subject so as to
   exclude the thing this clause doubts, because a petal built on one tree and
   omitted on the other would then contribute nothing to either side and the
   comparison would be silent about the one difference that matters most. The
   built-ness goes into the stream instead, so an omission that MOVED is a
   string mismatch (and, since a built petal also contributes its panel walk, a
   length mismatch too — which this tool already reports as a shape change). */
function gridFloatsOf(petals) {
  const out = [];
  for (let p = 0; p < petals.length; p++) {
    out.push(`p${p}.built:${petals[p] ? 1 : 0}`);
    const g = petals[p] && petals[p].grid;
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

let moversSeen = 0, moversMoved = 0, holdersSeen = 0;
for (const row of rows) {
  const st = stateOf(row);
  const opts = { below: null, capability: row.capability ?? null };
  const mover = MOVERS ? MOVERS.test(row.label) : MOVERS_PRED ? PREDICATE_MOVERS[MOVERS_PRED](st) : false;
  if (mover) moversSeen++; else holdersSeen++;
  const rowFails = [];
  const fails = mover ? rowFails : allFails;
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
  if (mover) {
    if (rowFails.length) moversMoved++;
    else allFails.push(`${row.label}: named a MOVER by --movers and held to the bit in both modes — the feature did nothing on a row declared to engage it`);
  }
  rowsDone++;
  if (rowsDone % 50 === 0) process.stderr.write(`  ${rowsDone}/${rows.length} rows\n`);
}
const fails = allFails;
if (JSON_OUT) {
  const fs = await import('node:fs');
  fs.writeFileSync(JSON_OUT, JSON.stringify({ from: RFROM, to: Math.min(RTO, MATRIX.length), matrixRows: MATRIX.length, predicate: MOVERS_PRED || (MOVERS ? String(MOVERS) : null), base: BASE,
    moversSeen, moversMoved, holdersSeen, floats, tris, gridFloats, panels, rowsDone, fails: allFails.slice() }));
}
if ((MOVERS || MOVERS_PRED) && !moversSeen && !JSON_OUT) fails.push(`VACUOUS: --movers ${MOVERS} matched no row of the matrix`);
if ((MOVERS || MOVERS_PRED) && !holdersSeen && !JSON_OUT) fails.push('VACUOUS: --movers matched EVERY row — nothing is being held');

/* VACUITY. A comparison that compared nothing passes trivially. */
if (!rows.length) fails.push('VACUOUS: the matrix returned no rows');
if (!floats) fails.push('VACUOUS: no export floats were compared');
if (!gridFloats) fails.push('VACUOUS: no grid values were compared — captureGrid produced nothing');
if (!panels) fails.push('VACUOUS: no captured panels — the grid path never ran');
if (CONTROL && controlFired !== 2) fails.push(`VACUOUS: --control perturbed ${controlFired} clause(s), expected 2 (export stream and captured grid)`);
if (CONTROL && fails.filter((f) => !f.startsWith('VACUOUS')).length !== 2) {
  fails.push(`CONTROL DID NOT FIRE BOTH CLAUSES: ${fails.filter((f) => !f.startsWith('VACUOUS')).length} finding(s), expected exactly 2 — a clause that cannot produce a verdict is not a check`);
}

if (MOVERS || MOVERS_PRED) console.log(`\npartition     : ${moversMoved} of ${moversSeen} rows named by --movers MOVED (every one must), ${holdersSeen} holders compared to the bit`);
console.log(`${MOVERS ? '' : '\n'}export stream : ${floats.toLocaleString()} floats over ${tris.toLocaleString()} triangles, ${rowsDone} rows x 2 modes${MOVERS ? ' (movers counted in the floats only where their lengths agree)' : ''}`);
console.log(`captured grid : ${gridFloats.toLocaleString()} values over ${panels.toLocaleString()} panels (live)`);
if (CONTROL) console.log('positive control: one coordinate perturbed by 1e-9 — the run MUST fail below');

if (fails.length) {
  console.log(`\nFAIL — ${fails.length} finding(s):`);
  for (const f of fails.slice(0, 40)) console.log('  ' + f);
  if (fails.length > 40) console.log(`  ... and ${fails.length - 40} more`);
  process.exit(1);
}
console.log((MOVERS || MOVERS_PRED) ? `\nPASS — 0 floats moved on the ${holdersSeen} holders, positionally, under Object.is; all ${moversSeen} predeclared movers moved.` : '\nPASS — 0 floats moved, positionally, under Object.is.');
