/* ===================================================================
   verify-bloom-seam-bytes.mjs — WHICH ROWS A SPINE-SIDE CHANGE MOVED
   (session 38, generalised session 39, widened by the arc-stability session)

     node tools/verify-bloom-seam-bytes.mjs --base <worktree>
          [--change seam|widest|arc] [--matrix live|phase23]
          [--expect <moved>/<held>] [--control] [--control-mode]

   THE FILE IS NAMED FOR ITS FIRST CALLER AND THE TOOL IS NOT. Every clause
   below is a property of a change to the BLADE'S SPINE that leaves the FOOT
   and the LATTICE alone — the foot rows are pushed by `footRowsAt()` before
   any station is read, and the row count is fixed at NU — and the seam
   clearance was simply the first of them. Session 39's `widest()` fix is the
   second. The arc-stability session's is the THIRD and the first that is not
   ladder-side: it moves the centreline the rows sit ON rather than the `u`
   they sit at, which is a different change with the SAME five claims (a
   predeclared partition, the default held to the bit, the foot untouched,
   triangle counts unchanged except where declared, and the two modes
   agreeing), so it rides here rather than in a fourth copy of this
   comparison. `--change` names whose declarations to use; adding another
   means one entry in TRI_COUNT_XFAIL_BY_CHANGE, not a new file.

   ONE THING IS STRONGER FOR `arc` THAN FOR THE OTHER TWO, and it is stated
   here because it is the difference between a partition and a count: the arc
   change PREDECLARES THE MOVER SET ITSELF, from the BASE tree's own builder
   record, and the run fails on any row in one set and not the other. The two
   ladder changes predeclare counts only (`--expect`), which is what was
   available when they were written — 157 moved could in principle be the
   wrong 157. `MOVER_BY_CHANGE` is where a change says which rows it expects
   to move and why; a change with no entry there keeps the count-only shape.

   THE CLAIM THIS EXISTS TO STATE PRECISELY. Session 38 puts a floor under the
   FIRST BLADE STATION so the foot-to-blade offset fold cannot happen. Session
   39 stops the gap bound from MEASURING that floor as its own redistribution,
   which had been discarding the whole turning-rate ladder wherever it binds.
   Both are ladder-side: they move WHERE rows sit, never how many there are
   and never the surface they sample. So the byte claim splits in three and
   each part is measured here rather than argued:

     1  THE PARTITION. Every row is MOVED or HELD, per mode, and the counts
        are PREDECLARED with `--expect`. A partition that is merely reported
        is a number nobody can be wrong about.
     2  THE SHIPPING DEFAULT IS HELD, and held means `Object.is` on every
        float in position — not "within a tolerance", not "equivalent". Both
        changes hold it BY CONSTRUCTION and for different reasons, which is
        why it is asserted rather than assumed: the clearance does not reach
        the first lattice station there, so the seam step is 1 and
        `bladeStations` takes the same `uniform.slice(0, held)` it always
        took; and with a seam step of 1 the leading gap is 1/NU, under every
        cap this function is handed, so whether the gap measure counts it or
        not cannot change the answer.
     3  TRIANGLE COUNTS ARE UNCHANGED EXCEPT WHERE THE CHANGE DECLARES
        OTHERWISE, and each exception is DECLARED rather than tolerated. The
        row count is fixed at NU and only the stations move, so the topology
        should not move with them — and for the seam change, on 665 of 666
        rows it does not. It does on
        `CAPABILITY: cleft x 6 layers`, and the reason is a property of the
        CLEFT rather than of that change: `trimPanels()` splits the blade into
        three panels at a ROW INDEX (the row nearest the cleft onset in u), and
        the two lobes then share that boundary row with the base panel. Move
        the stations and a different row is nearest the onset; the base panel
        loses a row and BOTH lobes gain one, so the emitted total changes.
        Measured on that row, ring by ring, the split lands at row 32/32/33/
        32/31/31 where main puts it at 32 on every ring — 168,256 -> 170,816
        triangles, +2,560.

        THIS IS PRE-EXISTING IN KIND: ANY ladder change can move that split,
        which is exactly why the table is per change rather than per tool —
        and session 32's own redistribution acts above u0 = 0.2857 where the
        cleft onset at 0.55 sits. What is new is that something finally
        MEASURES it. So the exception is one named entry with its numbers, it
        FAILS HARD if any other row's count moves, and it FAILS HARD if this
        row's count stops moving or moves to a different number — the xfail
        doctrine this project already applies to the connectedness gate and to
        SELF_INTERSECTION_XFAIL. It is not a tolerance and it is not a skip.

   BOTH MODES, EVERY ROW. Row positions are topology and the export floor may
   not move them, so a row that moved in export must move identically in live
   — and a row whose CLASS differs between the modes is reported as a failure
   in its own right. That is the session-32 mode-dependence defect wired as a
   check rather than trusted. (The seam change satisfies it by reading the
   EXPORT thickness in both modes; session 39's fix satisfies it by touching
   no mode-dependent quantity at all.)

   THE COMPARISON IS POSITIONAL (`pa[i]` against `pb[i]`, `Object.is`, so a
   one-ULP move and a `-0` that became `+0` both count as moved), following
   `verify-bloom-surface-bytes.mjs`. Nothing here is allowed to reorder the
   stream, so a multiset match would be the wrong instrument.

   CAPABILITY ROWS ARE PASSED — the CLAW and CLEFT rows are the only ones
   with more than one panel, and a panel split is decided by a ROW INDEX, so
   they are exactly where a station change could reach the topology.

   `--control` perturbs one coordinate of one HELD row by 1e-9 and requires
   the run to report it as moved; without that the "held" class is a
   computation nobody has shown can produce a verdict. The run also REFUSES
   A VACUOUS PASS: zero rows, zero floats, or zero moved rows is a failure.
   =================================================================== */
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const baseDir = arg('--base');
const frozenSweep = argv.includes('--frozen-sweep');
if (!baseDir && !frozenSweep) { console.error('usage: --base <worktree of the base commit>  |  --change <c> --frozen-sweep'); process.exit(2); }
const which = arg('--matrix', 'live');
const change = arg('--change', 'seam');
const expect = arg('--expect');
const control = argv.includes('--control');
const controlMode = argv.includes('--control-mode');

const HERE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BASE = baseDir ? path.resolve(baseDir) : null;

const load = async (root) => ({
  G: await import(`${root}/bloom-geometry.js`),
  R: await import(`${root}/bloom-registry.js`),
  H: await import(`${root}/tools/bloom-harness.mjs`),
});
const A = await load(HERE), B = BASE ? await load(BASE) : null;

const stateFor = (D, row) => {
  const st = { ...D };
  for (const { id, value } of (row.set || [])) {
    if (!(id in D)) { st[id] = value; continue; }
    const d = D[id];
    st[id] = typeof d === 'number' ? Number(value)
           : typeof d === 'boolean' ? (value === true || value === 'true') : value;
  }
  return st;
};
/* ONE build per tree per row per mode, yielding BOTH the export stream and the
   foot capture. Two builds would double a run that is already the whole matrix
   on two trees; the capture is a property of the accumulator and costs no
   triangles (session 28), so asking for it changes nothing it measures. */
const buildOn = ({ G, R }, row, exportMode) => {
  const acc = new G.MeshBuilder({ exportMode, captureGrid: true });
  const b = G.buildBloomInto(acc, stateFor(R.DEFAULTS, row), { below: null, capability: row.capability || null });
  const foot = [];
  for (const p of (b.petalsAll || b.petals || [])) {
    if (!p || !p.grid) continue;
    for (const panel of p.grid) for (const r of panel.rows) {
      if (r.row >= p.footRows) continue;
      foot.push(r.halfWidth, r.thickness, r.u);
      for (const P of r.mid) foot.push(P[0], P[1], P[2]);
      for (const n of r.normal) foot.push(n[0], n[1], n[2]);
    }
  }
  return { positions: acc.positions, foot, built: b };
};

/* THE ROWS WHOSE TRIANGLE COUNT MOVES, WITH THEIR NUMBERS — see clause 3.
   ONE TABLE PER CHANGE, named on the command line, because the declaration is
   a property of the CHANGE and not of this tool: `--change seam` is session
   38's, `--change widest` is session 39's. Keeping them here rather than on
   the command line is deliberate — a predeclaration a caller types is a
   predeclaration a typo can weaken, and these are reviewed in the diff. A
   change whose name is not in this table is REFUSED rather than run with an
   empty one, so "no exceptions" has to be written down as `{}`. */
const TRI_COUNT_XFAIL_BY_CHANGE = {
  seam: { 'CAPABILITY: cleft x 6 layers': '168256 -> 170816' },
  /* SESSION 39 restores the turning-rate ladder wherever the seam floor
     binds, so the same `trimPanels()` mechanism moves the same split on the
     same kind of row — and on THREE of them rather than one, because the
     rows it reaches are the ones with an inner whorl turning far enough to
     shift the seam. Every other cleft and claw row in the matrix is a single
     whorl at the shipping tilt, seam step 1, and its count is unmoved. */
  widest: {
    'CAPABILITY: cleft x 3 layers': '85024 -> 85344',
    'CAPABILITY: cleft x CONTINUOUS x 3 turns': '84944 -> 85424',
    'CAPABILITY: cleft x 6 layers': '170816 -> 171456',
  },
  /* THE ARC CHANGE MOVES NO STATION, so `trimPanels()`'s split cannot move
     with it and no cleft row's count can either. Declared empty rather than
     omitted — the refusal below makes "no exceptions" something somebody had
     to write down. */
  arc: {},
};

/* WHICH ROWS A CHANGE EXPECTS TO MOVE, READ OFF THE BASE TREE'S OWN BUILDER
   RECORD — never off the control set and never off a label. A change with no
   entry here predeclares COUNTS only, through `--expect`.

   For `arc`: the uniform closed-form arc is taken exactly where
   `buildPetalInto` sets `generalSpine` false with a law present, i.e. where
   `form` exists, `kC !== 0` and `form.curlUniform` — which the builder
   reports per built petal as `spine.curlRad !== 0 && spine.uniform`. The
   record is on EVERY petal the builder retained, `petalsAll` for the corolla
   and `sepals.built` for the sepal whorl, because a sepal is the petal
   builder on a second ring and reaches the same branch through its own
   `sepalSpineCurl` twin. Leaves cannot: `leafBladeState` pins
   `petalSpineCurl` to 0. Stamens and the style cannot: `rodInto` calls
   `spineLaw` directly, which is untouched.

   IT IS READ FROM THE BASE TREE ON PURPOSE. The prediction then has a
   different owner from the quantity under test — the emitted floats of THIS
   tree — which is the fourth durable rule applied to a partition rather than
   to an assertion. (The record is in fact identical on both trees, since the
   fix touches no telemetry; reading the base's is what makes that not
   something this tool has to assume.) */
const MOVER_BY_CHANGE = {
  arc: (built) => [...(built.petalsAll || []), ...((built.sepals && built.sepals.built) || [])]
    .some((p) => p && p.spine && p.spine.curlRad !== 0 && p.spine.uniform),
};
if (!(change in TRI_COUNT_XFAIL_BY_CHANGE)) {
  console.error(`REFUSED: --change ${change} has no declared triangle-count table. Add one (even an empty {}) rather than running without a declaration.`);
  process.exit(2);
}
const TRI_COUNT_XFAIL = TRI_COUNT_XFAIL_BY_CHANGE[change];
const triXfailSeen = new Set();
const MOVER_OF = MOVER_BY_CHANGE[change] || null;
const predicted = new Map();      // label -> true (predeclared mover) | false

/* ===================================================================
   `--frozen-sweep` — WHICH FROZEN BASELINES' BYTES STOP REPRODUCING, AND ON
   HOW MANY ROWS.

   A frozen tag pins ROW DEFINITIONS, never bytes (charter, session 24), and
   the obligation a byte move creates is on the OUTCOME DOC: name the tags
   whose bytes no longer reproduce, with the row count. Byte-re-exporting all
   33 registered baselines on two trees is the quadratic run the retention
   ruling closed, so this answers the same question through the change's own
   mover predicate instead — the one the full byte comparison PROVES EXACT on
   the live matrix and on the newest baseline, in both directions, before this
   is quoted. It is a consequence of that proof, not a substitute for it, and
   a change with no predicate in MOVER_BY_CHANGE cannot use it at all.

   It reads THIS tree's builder record. The record is untouched by any change
   that rides here (none of them writes `spine`), and the two byte
   comparisons are what establish that rather than this sweep assuming it.
   Rows whose controls were retired after their freeze still BUILD in Node —
   an unknown id in the state is inert to the geometry — so a baseline that
   can no longer be byte-re-exported through the page is still counted here.
   =================================================================== */
if (frozenSweep) {
  if (!MOVER_OF) { console.error(`REFUSED: --change ${change} declares no mover predicate, so there is nothing to sweep with.`); process.exit(2); }
  const names = Object.keys(A.H.FROZEN_MATRICES);
  console.log(`--frozen-sweep, change "${change}": ${names.length} registered frozen matrices, this tree's builder record.
`);
  let tags = 0, rowsTotal = 0, moversTotal = 0, builds = 0;
  /* MEMOISED ON THE STATE, not on the label. A frozen matrix is a snapshot, so
     consecutive baselines repeat most of each other's rows; the predicate is a
     pure function of (control set, capability), so one build per DISTINCT
     state answers for every row that carries it, and a row present in six
     baselines is built once rather than six times. */
  const memo = new Map();
  for (const name of names) {
    const rows = A.H.FROZEN_MATRICES[name]();
    let n = 0, threw = 0;
    for (const row of rows) {
      const st = stateFor(A.R.DEFAULTS, row);
      const key = JSON.stringify([st, row.capability || null]);
      let v = memo.get(key);
      if (v === undefined) {
        builds++;
        const acc = new A.G.MeshBuilder({ exportMode: true });
        try { v = MOVER_OF(A.G.buildBloomInto(acc, st, { below: null, capability: row.capability || null })); }
        catch { v = 'threw'; }
        memo.set(key, v);
      }
      if (v === 'threw') threw++; else if (v) n++;
    }
    rowsTotal += rows.length; moversTotal += n; if (n) tags++;
    console.log(`  frozen/${name.padEnd(8)} ${String(n).padStart(4)} of ${String(rows.length).padStart(4)} rows move${threw ? `   (${threw} row(s) threw and are counted as neither)` : ''}`);
    if (threw) process.exitCode = 1;
  }
  console.log(`
  ${tags} of ${names.length} baselines carry at least one row whose bytes stop reproducing; ${moversTotal} of ${rowsTotal} frozen rows in total (${builds} distinct states built).`);
  console.log('  Their DEFINITIONS are untouched — `--verify-frozen` deep-compares row order, labels and set lists and has never compared a byte.');
  process.exit(process.exitCode || 0);
}

const rowsOf = (T) => which === 'live' ? T.H.buildMatrix() : T.H.FROZEN_MATRICES[which]();
const rowsA = rowsOf(A), rowsB = rowsOf(B);
if (rowsA.length !== rowsB.length) {
  console.error(`REFUSED: the ${which} matrix has ${rowsA.length} rows here and ${rowsB.length} on the base — a partition over two different populations is not a partition.`);
  process.exit(1);
}


const bad = [];
let floats = 0, footValues = 0, movedCount = 0, heldCount = 0, controlSaw = false;
const classes = new Map();       // label -> { export: 'moved'|'held', live: ... }
const movers = [];

for (const mode of ['export', 'live']) {
  const exportMode = mode === 'export';
  for (let i = 0; i < rowsA.length; i++) {
    const row = rowsA[i];
    if (row.label !== rowsB[i].label) { bad.push(`row ${i}: label differs between trees ("${row.label}" / "${rowsB[i].label}")`); continue; }
    let pa, pb;   // reassigned to the position arrays below
    try { pa = buildOn(A, row, exportMode); pb = buildOn(B, rowsB[i], exportMode); }
    catch (e) { bad.push(`row ${i} (${row.label}) [${mode}]: build threw — ${e && e.message || e}`); continue; }
    /* THE PREDECLARATION, from the BASE tree's record, taken once per row. */
    if (MOVER_OF && mode === 'export') {
      try { predicted.set(row.label, !!MOVER_OF(pb.built)); }
      catch (e) { bad.push(`row ${i} (${row.label}): the mover predicate threw on the base tree's record — ${e && e.message || e}`); }
    }
    const fa = pa.foot, fb = pb.foot; pa = pa.positions; pb = pb.positions;
    if (pa.length !== pb.length) {
      const want = TRI_COUNT_XFAIL[row.label];
      const got = `${pb.length / 9} -> ${pa.length / 9}`;
      if (!want) bad.push(`TRIANGLE COUNT MOVED on "${row.label}" [${mode}]: ${got} — a ${change} change may not reach the topology, and this row is not one of the ${Object.keys(TRI_COUNT_XFAIL).length} declared`);
      else if (want !== got) bad.push(`TRIANGLE COUNT on "${row.label}" [${mode}] is ${got} where its declared exception says ${want} — the panel split moved somewhere new`);
      else triXfailSeen.add(row.label);
      /* it still counts as MOVED — the stations moved, which is the claim */
      const rec0 = classes.get(row.label) || {}; rec0[mode] = 'moved'; classes.set(row.label, rec0);
      if (mode === 'export') movers.push(row.label);
      continue;
    }
    floats += pa.length;
    let moved = false;
    for (let k = 0; k < pa.length; k++) if (!Object.is(pa[k], pb[k])) { moved = true; break; }
    if (control && !moved && !controlSaw) {
      /* the positive control: one held row, one coordinate, 1e-9 */
      const probe = Float64Array.from(pa); probe[0] += 1e-9;
      let saw = false;
      for (let k = 0; k < probe.length; k++) if (!Object.is(probe[k], pb[k])) { saw = true; break; }
      controlSaw = true;
      if (!saw) bad.push('CONTROL: a held row perturbed by 1e-9 still compared equal — the "held" class cannot produce a verdict');
      else console.log(`  control: "${row.label}" [${mode}] perturbed by 1e-9 is reported MOVED — the held class can fail.`);
    }
    /* THE FOOT IS UNTOUCHED ON EVERY ROW, MOVED ONES INCLUDED. `footRowsAt()`
       is untouched by all three changes and the foot rows are pushed before
       any station is read or any spine evaluated, so the foot is invariant BY
       CONSTRUCTION — and this measures it rather than arguing it, because
       J1-J4, the crowding raster and the whole junction argument read those
       rows. NOT `diff-bloom-bytes --region foot`: that slab is a documented
       SUPERSET that also carries the UNDERSIDE of the first blade rows, which
       this change does move, so it would report a true thing that is not this
       claim. */
    if (fa.length !== fb.length) bad.push(`FOOT MOVED on "${row.label}" [${mode}]: ${fa.length} captured foot values here against ${fb.length} on the base`);
    else { footValues += fa.length;
      for (let k = 0; k < fa.length; k++) if (!Object.is(fa[k], fb[k])) { bad.push(`FOOT MOVED on "${row.label}" [${mode}]: captured foot value ${k} is ${fa[k]} here and ${fb[k]} on the base — J1-J4 and the crowding raster read these rows`); break; } }
    const rec = classes.get(row.label) || {}; rec[mode] = moved ? 'moved' : 'held'; classes.set(row.label, rec);
    if (moved) { movedCount++; if (mode === 'export') movers.push(row.label); } else heldCount++;
  }
}

/* THE MODE CLAUSE'S OWN CONTROL. A control that only fires the partition
   clause leaves this one exactly what this project calls a log line: a
   computation nobody has shown can produce a verdict. `--control-mode`
   reclassifies one row's live answer and requires the run to report it. */
/* THE DEFAULT'S VERDICT IS TAKEN BEFORE THE PLANT, because the plant lands ON
   the default (it reclassifies the first row, and the first row is the
   shipping configuration). Reading the corrupted record would make the
   default clause report a second finding about a deliberate lie — two
   findings for one planted change, against a budget of one, so the control
   failed the run it exists to validate. Measured, session 39. */
const defBefore = classes.has(rowsA[0].label) ? { ...classes.get(rowsA[0].label) } : null;
if (controlMode) {
  const first = [...classes.keys()][0];
  const rec = classes.get(first);
  rec.live = rec.export === 'moved' ? 'held' : 'moved';
  console.log(`  control-mode: "${first}" reclassified live as ${rec.live} against export ${rec.export} — the mode clause must report it.`);
}
let modeFindings = 0;
/* mode agreement — the session-32 defect, wired */
for (const [label, rec] of classes) {
  if (rec.export && rec.live && rec.export !== rec.live) {
    modeFindings++;
    bad.push(`MODE-DEPENDENT: "${label}" is ${rec.export} in export and ${rec.live} in live — which rows exist and where they sit are TOPOLOGY, and no ${change} change may move them with the mode`);
  }
}
if (controlMode && modeFindings !== 1) bad.push(`CONTROL: the mode clause reported ${modeFindings} findings on a deliberately reclassified row, expected exactly 1 — the clause cannot produce a verdict`);
if (controlMode && modeFindings === 1) { console.log('  the mode clause fired on the control, exactly once.'); }

const def = defBefore;
if (which === 'live' && def && (def.export !== 'held' || def.live !== 'held')) {
  bad.push(`THE SHIPPING DEFAULT MOVED (${def.export} / ${def.live}) — every ladder change here holds it by construction and the stations must be bit-identical`);
}

if (!rowsA.length || !floats) bad.push('VACUOUS: no rows or no floats were compared');
if (!footValues) bad.push('VACUOUS: no captured foot values were compared — the foot clause proved nothing');
/* A DECLARED EXCEPTION THAT STOPPED HAPPENING IS A FIX LANDING, and its entry
   must come off in the same commit — the connectedness gate's own rule. */
if (which === 'live') for (const l of Object.keys(TRI_COUNT_XFAIL)) {
  if (!triXfailSeen.has(l)) bad.push(`"${l}" is declared as a moved triangle count (${TRI_COUNT_XFAIL[l]}) and its count no longer moves — remove the entry in the same commit as the fix`);
}
/* THE VACUITY GUARD IS ABOUT THE TOOL, NOT ABOUT THE MATRIX. "No row moved"
   is a legitimate ANSWER on an old frozen baseline whose rows never reach a
   binding kink — measured, phase2's 76 rows are all held — so it is only a
   failure when nothing has shown this run could have said otherwise. Either
   `--control` (which perturbs a held row and requires the verdict to move) or
   an explicit `--expect` discharges it. */
if (!movers.length && !control && !expect) bad.push('VACUOUS: no row moved, and neither --control nor --expect ran — nothing here has shown this tool could report movement at all');

/* THE SET, EXACT IN BOTH DIRECTIONS — where the change declares one. A count
   that matches over the wrong rows is not a partition. */
const movedSet = new Set(movers);
if (MOVER_OF) {
  const wrongHold = [], wrongMove = [];
  for (const [label, want] of predicted) {
    const got = movedSet.has(label);
    if (want && !got) wrongHold.push(label);
    if (!want && got) wrongMove.push(label);
  }
  if (predicted.size !== rowsA.length) bad.push(`the mover predicate answered on ${predicted.size} of ${rowsA.length} rows — a partition over a subset is not a partition`);
  const declared = [...predicted.values()].filter(Boolean).length;
  if (!declared) bad.push(`the mover predicate declares NO row a mover — a vacuous predeclaration cannot be wrong`);
  for (const l of wrongHold.slice(0, 10)) bad.push(`PREDECLARED MOVER HELD: "${l}" — the base tree's own record says a petal takes the uniform arc there and not one float moved`);
  for (const l of wrongMove.slice(0, 10)) bad.push(`UNDECLARED MOVER: "${l}" — no built petal takes the uniform arc there and its bytes moved anyway`);
  if (wrongHold.length > 10) bad.push(`... and ${wrongHold.length - 10} further predeclared movers that held`);
  if (wrongMove.length > 10) bad.push(`... and ${wrongMove.length - 10} further undeclared movers`);
  if (!wrongHold.length && !wrongMove.length) console.log(`  the MOVER SET is exactly as the base tree's builder record predeclares it: ${declared} rows build a uniform curled arc, and those are the ${movedSet.size} rows whose bytes moved.`);
}

const movedRows = movers.length, heldRows = rowsA.length - movedRows;
console.log(`\n${which} matrix, change "${change}": ${rowsA.length} rows, both modes, ${floats.toLocaleString()} floats compared positionally under Object.is`);
console.log(`  MOVED ${movedRows}   HELD ${heldRows}   (per row, export; live agrees on every row or this run has already failed)`);
if (expect) {
  const [wm, wh] = expect.split('/').map(Number);
  if (movedRows !== wm || heldRows !== wh) bad.push(`PARTITION: predeclared ${wm} moved / ${wh} held, measured ${movedRows} / ${heldRows}`);
  else console.log(`  the partition is EXACTLY as predeclared (${wm} moved / ${wh} held).`);
}
console.log(`  triangle counts unchanged on every row but the ${Object.keys(TRI_COUNT_XFAIL).length} declared (${Object.entries(TRI_COUNT_XFAIL).map(([k, v]) => `"${k}" ${v}`).join('; ')})`);
console.log(`  the FOOT is identical on every row: ${footValues.toLocaleString()} captured foot values (mid-surface point, normal, half-width, thickness, u) under Object.is`);
console.log(`  first movers: ${movers.slice(0, 5).map((l) => `"${l.slice(0, 60)}"`).join(', ')}${movers.length > 5 ? ', …' : ''}`);

const planted = controlMode ? 1 : 0;
if (bad.length > planted) { console.error(`\nFAIL — ${bad.length} finding(s):`); for (const b of bad.slice(0, 40)) console.error('  ' + b); process.exit(1); }
console.log(controlMode ? '\nPASS (control: the planted mode finding was reported and is not counted against the run)' : '\nPASS');
