/* ===================================================================
   verify-bloom-seam-bytes.mjs — WHICH ROWS THE SEAM CLEARANCE MOVED
   (session 38)

     node tools/verify-bloom-seam-bytes.mjs --base <worktree>
          [--matrix live|phase23] [--expect <moved>/<held>] [--control]

   THE CLAIM THIS EXISTS TO STATE PRECISELY. Session 38 puts a floor under the
   FIRST BLADE STATION so the foot-to-blade offset fold cannot happen. That is
   a ladder-side change: it moves WHERE rows sit, never how many there are and
   never the surface they sample. So the byte claim splits in three and each
   part is measured here rather than argued:

     1  THE PARTITION. Every row is MOVED or HELD, per mode, and the counts
        are PREDECLARED with `--expect`. A partition that is merely reported
        is a number nobody can be wrong about.
     2  THE SHIPPING DEFAULT IS HELD, and held means `Object.is` on every
        float in position — not "within a tolerance", not "equivalent". It is
        held BY CONSTRUCTION: when the clearance does not reach the first
        lattice station the seam step is 1 and `bladeStations` takes the same
        `uniform.slice(0, held)` it always took.
     3  TRIANGLE COUNTS ARE UNCHANGED ON EVERY ROW, moved rows included,
        because the row count is fixed at NU and only the stations move. A
        moved row whose triangle count also moved would mean this change had
        reached the topology, and that is asserted, not assumed.

   BOTH MODES, EVERY ROW. The clearance reads the EXPORT thickness in both
   modes on purpose (row positions are topology), so a row that moved in
   export must move identically in live — and a row whose CLASS differs
   between the modes is reported as a failure in its own right. That is the
   session-32 mode-dependence defect wired as a check rather than trusted.

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
if (!baseDir) { console.error('usage: --base <worktree of the base commit>'); process.exit(2); }
const which = arg('--matrix', 'live');
const expect = arg('--expect');
const control = argv.includes('--control');
const controlMode = argv.includes('--control-mode');

const HERE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BASE = path.resolve(baseDir);

const load = async (root) => ({
  G: await import(`${root}/bloom-geometry.js`),
  R: await import(`${root}/bloom-registry.js`),
  H: await import(`${root}/tools/bloom-harness.mjs`),
});
const A = await load(HERE), B = await load(BASE);

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
  return { positions: acc.positions, foot };
};

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
    const fa = pa.foot, fb = pb.foot; pa = pa.positions; pb = pb.positions;
    if (pa.length !== pb.length) {
      bad.push(`TRIANGLE COUNT MOVED on "${row.label}" [${mode}]: ${pa.length / 9} here against ${pb.length / 9} on the base — a ladder change may not reach the topology`);
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
    /* THE FOOT IS UNTOUCHED ON EVERY ROW, MOVED ONES INCLUDED. The seam floor
       is a LADDER change: `footRowsAt()` is untouched and the foot rows are
       pushed before any station is read, so the foot is invariant BY
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
    bad.push(`MODE-DEPENDENT: "${label}" is ${rec.export} in export and ${rec.live} in live — the clearance must read the export thickness in BOTH modes`);
  }
}
if (controlMode && modeFindings !== 1) bad.push(`CONTROL: the mode clause reported ${modeFindings} findings on a deliberately reclassified row, expected exactly 1 — the clause cannot produce a verdict`);
if (controlMode && modeFindings === 1) { console.log('  the mode clause fired on the control, exactly once.'); }

const def = classes.get(rowsA[0].label);
if (which === 'live' && def && (def.export !== 'held' || def.live !== 'held')) {
  bad.push(`THE SHIPPING DEFAULT MOVED (${def.export} / ${def.live}) — the seam step is 1 there and the stations must be bit-identical`);
}

if (!rowsA.length || !floats) bad.push('VACUOUS: no rows or no floats were compared');
if (!footValues) bad.push('VACUOUS: no captured foot values were compared — the foot clause proved nothing');
/* THE VACUITY GUARD IS ABOUT THE TOOL, NOT ABOUT THE MATRIX. "No row moved"
   is a legitimate ANSWER on an old frozen baseline whose rows never reach a
   binding kink — measured, phase2's 76 rows are all held — so it is only a
   failure when nothing has shown this run could have said otherwise. Either
   `--control` (which perturbs a held row and requires the verdict to move) or
   an explicit `--expect` discharges it. */
if (!movers.length && !control && !expect) bad.push('VACUOUS: no row moved, and neither --control nor --expect ran — nothing here has shown this tool could report movement at all');

const movedRows = movers.length, heldRows = rowsA.length - movedRows;
console.log(`\n${which} matrix: ${rowsA.length} rows, both modes, ${floats.toLocaleString()} floats compared positionally under Object.is`);
console.log(`  MOVED ${movedRows}   HELD ${heldRows}   (per row, export; live agrees on every row or this run has already failed)`);
if (expect) {
  const [wm, wh] = expect.split('/').map(Number);
  if (movedRows !== wm || heldRows !== wh) bad.push(`PARTITION: predeclared ${wm} moved / ${wh} held, measured ${movedRows} / ${heldRows}`);
  else console.log(`  the partition is EXACTLY as predeclared (${wm} moved / ${wh} held).`);
}
console.log(`  the FOOT is identical on every row: ${footValues.toLocaleString()} captured foot values (mid-surface point, normal, half-width, thickness, u) under Object.is`);
console.log(`  first movers: ${movers.slice(0, 5).map((l) => `"${l.slice(0, 60)}"`).join(', ')}${movers.length > 5 ? ', …' : ''}`);

const planted = controlMode ? 1 : 0;
if (bad.length > planted) { console.error(`\nFAIL — ${bad.length} finding(s):`); for (const b of bad.slice(0, 40)) console.error('  ' + b); process.exit(1); }
console.log(controlMode ? '\nPASS (control: the planted mode finding was reported and is not counted against the run)' : '\nPASS');
