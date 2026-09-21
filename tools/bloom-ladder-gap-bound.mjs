/* ===================================================================
   bloom-ladder-gap-bound.mjs — WHAT `LADDER_MAX_GAP_FACTOR` ACTUALLY DOES.

     node tools/bloom-ladder-gap-bound.mjs [--json]

   THE QUESTION (Eva, session 39): is 1.40 a real number? The header above
   `bladeStations()` says the widest-gap bound "exists because the buckle's
   frequency ceiling is NU / BUCKLE_ROWS_PER_CYCLE_MIN" — but the buckle's own
   requirement is already the OTHER arm of the same `min`
   (`NU / (BUCKLE_ROWS_PER_CYCLE_MIN * f)`, which is exactly the statement "no
   local rows-per-cycle below the bar"), so the 1.40 arm can only bind where
   the buckle does not ask for it: at f <= 4, and at f = 0, which is every
   plain petal and every lobed one. This measures what it does there.

   WHAT IT MEASURES, over the LIVE MATRIX, both modes, first slot of layer 0:
     1. THE BUCKLE CLAUSE. The minimum local rows-per-cycle on every buckled
        row, with the arm and without. If the arm is the buckle's protection,
        removing it must take some row below BUCKLE_ROWS_PER_CYCLE_MIN.
     2. THE BINDING CENSUS. Which row-modes the arm actually constrains, and
        by how much.
     3. THE COST, in millimetres, through the SHIPPED sagitta instrument
        (`sagittaOf` from tools/bloom-sagitta.mjs, over the builder's own
        stations): the apex, middle and whole-blade chord error with the arm
        and without.
     4. THE LOBE CAP. `ladderWindowCapacity` over `LOBE_SAMPLES_PER_LOBE` —
        the arm is the only thing deciding how many lobes the rim carries.
     5. THE SEAM COLLAPSE. `bladeStations`' own `widest()` USED TO OPEN with
        `r[0]`, the offset from the seam to the FIRST BLADE ROW, which the
        blend cannot move (it keeps every held row) — so wherever the seam
        floor bound, `mUsed / NU` exceeded the cap for every blend and the
        bisection landed on 0: the ladder discarded and the blade placed
        UNIFORMLY. A8 in the harness already ruled that gap A7's and not the
        ladder's; the geometry was not given the same clause until PR 2 of
        this session gave it one. THIS SECTION IS NOW THE STANDING WITNESS
        rather than the finding: it read 34 of 36 collapsed on `main` and
        reads 0 here, with the 2 that stay uniform doing so at the buckle's
        frequency ceiling, where the bound IS uniform.

   HOW THE COMPARISON IS MADE. A one-line variant of bloom-geometry.js is
   written to a temp directory (the mutant tables' own mechanism) with
   `LADDER_MAX_GAP_FACTOR` raised so the arm cannot bind; the buckle arm is
   untouched, so the variant IS "the derived bound and nothing else". Nothing
   is re-implemented: both trees run their own `petalSurface` /
   `widthProfile` / `bladeStations`, and the sagitta is the shipped one.

   NAME THE MODE AND THE SAMPLING. Every figure below is taken in LIVE and
   EXPORT separately and says which; the sampling is the FIRST SLOT of layer 0
   of each matrix row (the sagitta instrument's own scope), and the sagitta is
   over the builder's own 56 stations. A row whose ladder cannot be rebuilt
   from its declared state is a loud skip, never a silent number.

   ZERO BYTES. It reads and emits nothing; it is a measurement, not a gate,
   and it runs no browser.
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const JSON_OUT = process.argv.includes('--json');
/* High enough that the arm can never bind at any petal length; the buckle arm
   of the same `min` is untouched, so buckled rows keep their derived bound. */
const OPEN = '1e9';

/* ---------- the two trees ---------- */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-gap-'));
const SHIPPED = 'export const LADDER_MAX_GAP_FACTOR = 1.4;';
const geomSrc = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
if ((geomSrc.match(new RegExp(SHIPPED.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length !== 1) {
  console.error(`HARNESS INVALID: the anchor \`${SHIPPED}\` is not unique in bloom-geometry.js — re-anchor this tool rather than trusting its variant.`);
  process.exit(2);
}
fs.writeFileSync(path.join(tmp, 'geom.js'), geomSrc.replace(SHIPPED, `export const LADDER_MAX_GAP_FACTOR = ${OPEN};`));
fs.writeFileSync(path.join(tmp, 'slot.mjs'),
  fs.readFileSync(path.join(ROOT, 'tools/bloom-first-slot.mjs'), 'utf8').replace("from '../bloom-geometry.js'", "from './geom.js'"));

const G = { on: await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href),
            off: await import(pathToFileURL(path.join(tmp, 'geom.js')).href) };
const SLOT = { on: (await import(pathToFileURL(path.join(ROOT, 'tools/bloom-first-slot.mjs')).href)).firstSlot,
               off: (await import(pathToFileURL(path.join(tmp, 'slot.mjs')).href)).firstSlot };
const { sagittaOf } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-sagitta.mjs')).href);
const { buildMatrix } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-harness.mjs')).href);
const { DEFAULTS, CONTROLS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);

if (G.on.LADDER_MAX_GAP_FACTOR !== 1.4 || G.off.LADDER_MAX_GAP_FACTOR !== Number(OPEN)) {
  console.error(`HARNESS INVALID: the two trees read ${G.on.LADDER_MAX_GAP_FACTOR} and ${G.off.LADDER_MAX_GAP_FACTOR} — the variant did not apply.`);
  process.exit(2);
}

/* ---------- one build, on whichever tree ---------- */
const stateOf = (row) => {
  const s = { ...DEFAULTS };
  for (const e of (row.set || [])) {
    const id = e.id ?? e[0], v = e.value ?? e[1];
    const c = CONTROLS.find((k) => k.id === id);
    s[id] = (c && (c.kind === 'range' || c.kind === 'number')) ? Number(v)
          : (typeof DEFAULTS[id] === 'number' ? Number(v) : v);
  }
  return s;
};
function build(side, state, exportMode) {
  const g = G[side];
  const acc = new g.MeshBuilder({ exportMode });
  const { ring, slot } = SLOT[side](state, acc, 0);
  const surf = g.petalSurface(state, ring, slot, null, acc);
  const buckle = surf.form && surf.form.buckle;
  const st = g.bladeStations(surf.profile, surf.length, buckle, surf.seamClearMm);
  const blade = st.filter((u) => u > 0);
  let widest = 0;
  for (let i = 1; i < blade.length; i++) widest = Math.max(widest, blade[i] - blade[i - 1]);
  const held = g.HELD_ROWS, tail = st.slice(held), u0 = st[held - 1];
  let fromUniform = 0;
  for (let i = 0; i < tail.length; i++) fromUniform = Math.max(fromUniform, Math.abs(tail[i] - (u0 + (1 - u0) * (i + 1) / tail.length)));
  return {
    widest, rows: st.length, stations: st,
    seamStep: g.seamLatticeStep(surf.seamClearMm, surf.length),
    gapFactor: g.ladderGapFactor(buckle && buckle.A ? buckle.f : 0),
    buckleFreq: buckle && buckle.A ? buckle.f : 0,
    fromUniform,
    lobes: surf.profile.lobes || null,
    sag: sagittaOf((u) => surf.profile.halfWidthAt(u), surf.length, st),
  };
}

/* ---------- the sweep ---------- */
const rows = buildMatrix();
const out = [];
const skipped = [];
for (const row of rows) {
  const state = stateOf(row);
  for (const exportMode of [false, true]) {
    let a, b;
    try { a = build('on', state, exportMode); b = build('off', state, exportMode); }
    catch (e) { skipped.push(`${row.label} (${exportMode ? 'export' : 'live'}): ${e.message.slice(0, 80)}`); continue; }
    const NU = a.rows;
    out.push({
      label: row.label, mode: exportMode ? 'export' : 'live', NU,
      buckleFreq: a.buckleFreq, gapFactor: a.gapFactor, seamStep: a.seamStep,
      lobed: !!(a.lobes && !a.lobes.noRoom),
      wOn: a.widest * NU, wOff: b.widest * NU,
      uniformOn: a.fromUniform, uniformOff: b.fromUniform,
      countOn: a.lobes && !a.lobes.noRoom ? a.lobes.countBuilt : 0,
      countOff: b.lobes && !b.lobes.noRoom ? b.lobes.countBuilt : 0,
      capOn: a.lobes ? a.lobes.rowsCapacity : null, capOff: b.lobes ? b.lobes.rowsCapacity : null,
      apexOn: a.sag.zone.apex, apexOff: b.sag.zone.apex,
      midOn: a.sag.zone.middle, midOff: b.sag.zone.middle,
      worstOn: a.sag.worst.d, worstOff: b.sag.worst.d,
    });
  }
}
if (!out.length) { console.error('HARNESS INVALID: no row measured.'); process.exit(2); }

/* ---------- 1. the buckle clause ---------- */
const BAR = G.on.BUCKLE_ROWS_PER_CYCLE_MIN;
const buckled = out.filter((r) => r.buckleFreq > 0);
const perCycle = (r, w) => (1 / r.buckleFreq) / (w / r.NU);
const belowBarOff = buckled.filter((r) => perCycle(r, r.wOff) < BAR - 1e-9);
const worstOff = buckled.length ? Math.min(...buckled.map((r) => perCycle(r, r.wOff))) : null;
const worstOn = buckled.length ? Math.min(...buckled.map((r) => perCycle(r, r.wOn))) : null;

/* ---------- 2. the binding census ---------- */
const binds = out.filter((r) => r.wOff > r.gapFactor + 1e-9);
const plain = out.filter((r) => !r.lobed);

/* ---------- 3. the cost ---------- */
const moved = out.filter((r) => Math.abs(r.apexOn - r.apexOff) > 1e-9 || Math.abs(r.midOn - r.midOff) > 1e-9);
const apexWorse = moved.filter((r) => r.apexOn > r.apexOff + 1e-9);
const apexBetter = moved.filter((r) => r.apexOn < r.apexOff - 1e-9);
const byDeg = [...apexWorse].sort((x, y) => (y.apexOn - y.apexOff) - (x.apexOn - x.apexOff));

/* ---------- 4. the lobe cap ---------- */
const lobeRows = out.filter((r) => r.lobed);
const freed = lobeRows.filter((r) => r.countOff > r.countOn);

/* ---------- 5. the seam collapse ---------- */
const UNI = 1e-12;
const collapsedOn = out.filter((r) => r.uniformOn < UNI);
/* THE TWO CLASSES OVERLAP, AND ON A FIXED TREE THE OVERLAP IS ALL THAT IS
   LEFT (session 39, PR 2). A uniform ladder at the buckle's frequency ceiling
   is uniform BY DESIGN — the bound there is exactly 1 — whether or not the
   seam floor also binds on that row, so "the seam discarded it" is only true
   of a uniform row whose bound is NOT already uniform. Classified as a
   disjoint partition for that reason: the first reading of this section
   counted the two overlapping and would have reported 2 rows as a surviving
   defect on a tree where the defect is gone. */
const seamCollapsed = collapsedOn.filter((r) => r.seamStep > 1 && r.gapFactor !== 1);
const seamRows = out.filter((r) => r.seamStep > 1);

const report = {
  measured: out.length, rows: rows.length, skipped,
  arithmetic: {
    shipped: G.on.LADDER_MAX_GAP_FACTOR,
    equalsBuckleBoundAtF5: G.on.LADDER_MAX_GAP_FACTOR === out[0].NU / (BAR * 5),
  },
  buckleClause: { bar: BAR, buckledRowModes: buckled.length, minRowsPerCycleWithArm: worstOn, minRowsPerCycleWithoutArm: worstOff, belowBarWithoutArm: belowBarOff.length },
  binding: { rowModes: binds.length, plainRowModes: binds.filter((r) => !r.lobed).length, worstUnbounded: binds.length ? Math.max(...binds.map((r) => r.wOff)) : null },
  cost: { moved: moved.length, apexWorseWithArm: apexWorse.length, apexBetterWithArm: apexBetter.length,
          worstDegradations: byDeg.slice(0, 6).map((r) => ({ label: r.label, mode: r.mode, withArm: r.apexOn, withoutArm: r.apexOff, x: r.apexOn / Math.max(r.apexOff, 1e-12) })) },
  lobeCap: { lobedRowModes: lobeRows.length, freed: freed.length,
             counts: [...new Set(lobeRows.map((r) => `${r.countOn} -> ${r.countOff}`))].sort() },
  seamCollapse: { seamShiftedRowModes: seamRows.length, collapsedToUniform: collapsedOn.length,
                  ofWhichSeamShifted: seamCollapsed.length,
                  ofWhichAtTheBuckleCeiling: collapsedOn.filter((r) => r.gapFactor === 1).length,
                  seamShiftedNotCollapsed: seamRows.filter((r) => r.uniformOn >= UNI).length },
};

if (JSON_OUT) { console.log(JSON.stringify({ ...report, out }, null, 1)); }
else {
  const p = (x, n = 4) => (x === null || x === undefined ? '  --  ' : Number(x).toFixed(n));
  console.log(`LADDER GAP BOUND — ${report.measured} row-modes over ${report.rows} live matrix rows, both modes, first slot of layer 0.`);
  console.log(`shipped arm ${report.arithmetic.shipped}; comparison tree ${OPEN} (the arm removed, the buckle arm untouched).`);
  if (skipped.length) console.log(`SKIPPED ${skipped.length}: ${skipped.slice(0, 3).join(' | ')}`);
  console.log('');
  console.log(`1. THE BUCKLE CLAUSE — the stated reason for the arm.`);
  console.log(`   bar ${BAR} rows per cycle · ${report.buckleClause.buckledRowModes} buckled row-modes`);
  console.log(`   minimum local rows-per-cycle: ${p(worstOn, 2)} with the arm, ${p(worstOff, 2)} without · below the bar without it: ${report.buckleClause.belowBarWithoutArm}`);
  console.log(`   the arm is numerically identical to the buckle's own bound at f = 5 (NU / (BAR * 5)): ${report.arithmetic.equalsBuckleBoundAtF5}`);
  console.log('');
  console.log(`2. THE BINDING CENSUS — ${report.binding.rowModes} row-modes constrained by the arm (${report.binding.plainRowModes} of them plain), worst unbounded gap ${p(report.binding.worstUnbounded, 3)} x uniform.`);
  console.log('');
  console.log(`3. THE COST, mm of outline chord error (the shipped sagitta, over the builder's own stations).`);
  console.log(`   ${report.cost.moved} row-modes move · apex WORSE with the arm on ${report.cost.apexWorseWithArm}, BETTER on ${report.cost.apexBetterWithArm}`);
  for (const d of report.cost.worstDegradations) {
    console.log(`     +${p(d.withArm - d.withoutArm)} mm (${p(d.withArm)} with, ${p(d.withoutArm)} without, ${d.x.toFixed(1)}x) ${d.mode} ${d.label.slice(0, 54)}`);
  }
  console.log('');
  console.log(`4. THE LOBE CAP — ${report.lobeCap.lobedRowModes} lobed row-modes, ${report.lobeCap.freed} build MORE lobes without the arm.`);
  console.log(`   counts (with the arm -> without): ${report.lobeCap.counts.join(' · ')}`);
  console.log('');
  console.log(`5. THE SEAM COLLAPSE — the ladder discarded where the seam floor binds.`);
  console.log(`   ${report.seamCollapse.seamShiftedRowModes} row-modes have seamStep >= 2 · ${report.seamCollapse.collapsedToUniform} row-modes place the blade EXACTLY uniformly`);
  console.log(`   of those, ${report.seamCollapse.ofWhichAtTheBuckleCeiling} are the buckle's frequency ceiling (uniform BY DESIGN, whatever the seam does) and ${report.seamCollapse.ofWhichSeamShifted} are the seam floor with a bound that is NOT uniform (not by design)`);
  console.log(`   seam-shifted row-modes that keep a real ladder: ${report.seamCollapse.seamShiftedNotCollapsed}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
