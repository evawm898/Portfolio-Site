/* ===================================================================
   bloom-infill-lamina-floor.mjs — HOW FAR BELOW F THE BOUNDARY GOES, AND WHAT
   STOPS IT. AN INSTRUMENT, NOT WIRED TO ANY GATE. It imports `bloom-geometry.js`
   unchanged and drives `tools/bloom-voronoi-proto.mjs`'s salvage field.

     node tools/bloom-infill-lamina-floor.mjs [--json <file>] [--quick]
     node tools/bloom-infill-lamina-floor.mjs --control      (the must-fail)

   WHY IT EXISTS. `docs/bloom-infill-base-panel.md` (#252) swept the boundary from
   row 19 down to row 10 and found nothing binding: 768 (cell x seed) states all
   clean, and 0 of 120 masked-lattice rows reading closer than the plain petal. Eva
   ruled row 10 — cell F, panel 8.83 % of the blade — the best cell on that sheet and
   asked for the lattice to reach FURTHER toward the base. F was the end of a sweep,
   not a floor, so this continues it and names what actually stops it.

   THE ANSWER, and it is a LENGTH rather than a row count: THE BLADE'S OWN WAIST.
   `halfWidthAt` is a `max`, and below the station where the foot's width floor hands
   the outline to the core the blade WIDENS again toward the foot. That station is the
   narrowest section the blade has between the foot and the tip, the geometry declares
   it (`profile.laminaSlopeBreaks()`, `from: 'ROOT_BLEND'`), and a cell region that
   contains it is measurably WORSE than one that stops above it — more solid in the
   bottom 45 %, not less, which is the opposite of what lowering the boundary is for.

   THE FIVE SECTIONS.
     1  THE SWEEP — every lattice station from the shipped boundary down to the last
        one that builds, at the grading Eva's F used, both walls, eight seeds: the
        panel's share, the bottom-45 % solid, the census, the holes lost and the
        triangles. §1's own STRUCTURAL COLUMNS are the two Eva asked to see on every
        new cell, in the same units as #252's.
     2  THE MECHANISM — the waist: where it is, what the section there measures, and
        three independent confirmations that it is what binds. A CONTROL (a petal with
        no waist at all shows no reversal at that row) and a MOVER (`petalWidth` 30
        puts the waist a row lower and the reversal follows it) are what make the
        correlation a mechanism.
     3  THE `HELD_ROWS` / `A7` COLLISION — bounded rather than argued: the infill
        places no station, so the ladder is bit-identical at every boundary, and #252's
        recommended option 2 is REFUTED by Eva's own ruling rather than by a
        measurement (it lands on row 18, eight rows ABOVE the cell she picked).
     4  THE SELF-APPROACH — #252's §3c extended below F, on the masked lattice, to the
        last boundary that builds.
     5  THE MODE — the floor is read off the MODE-FREE break list, and the reason is a
        measurement: `slopeBreaks` disagrees live/export on a reachable state.

   WHAT IT DOES NOT COVER, stated rather than left to be found.
     - THE HOLE RIMS ARE UNSAMPLED, inherited from #252 §3d: §4 masks the SHIPPED
       lattice and no lattice station sits on a rim. Unchanged here, and still the
       build's to close.
     - THE REVERSAL IS MEASURED ON THIS FIELD. The waist is the petal's and the
       control and the mover pin it to the petal; how much a DIFFERENT field would
       lose at the same crossing is not measured, and a field that cut usable holes
       below the waist would move the floor. What would not move is the section: the
       waist is the thinnest the blade gets, whatever is cut there.
     - IT IS A PROTOTYPE'S EMITTER. `cutThrough` fans a solid cell flat, which is a
       chord across a surface that wraps; the census here is a scratch one and quotes
       no gate. Both are the prototype's own header's, not this tool's.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as G from '../bloom-geometry.js';
import { DEFAULTS } from '../bloom-registry.js';
import { firstSlot } from './bloom-first-slot.mjs';
import * as P from './bloom-voronoi-proto.mjs';
import { rigFor, approachMasked, infilledWall, areaU, BOTTOM_BAND_TOP, SEEDS, N_CELLS } from './bloom-infill-base-panel.mjs';
import { STATES as WALL_STATES } from './bloom-wall-thickness.mjs';

const IS_MAIN = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const QUICK = process.argv.includes('--quick');

/* EVA'S OWN CELL F — the grading she ruled best, restated here so every row below is
   read at it and the comparison is against the cell she approved rather than against
   a setting this tool chose. */
export const F_OPTS = { converge: 0.050, baseNarrow: 1.50 };
export const F_ROW = 10;
export const WALLS = [1.0, 0.8];

const footRowsOf = (ctx) => { let n = 0; while (n < ctx.rows.length && ctx.rows[n].u === 0) n++; return n; };
const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const rngOf = (a) => `${Math.min(...a)}-${Math.max(...a)}`;

/* ------------------------------------------------------------ the waist */

/* WHERE THE OUTLINE'S TERMS HAND OVER, read from the ONE owner that declares it.
   `laminaFloorU` is the prototype's; this adds what the section there MEASURES,
   because "the narrowest section between the foot and the tip" is the sentence the
   structural note rests on and it should be a number rather than an adjective. */
export const SEARCH_N = 200000;
export function waistOf(ctx, wall = 1.0) {
  const prof = ctx.surface.profile;
  const u = P.laminaFloorU(ctx);
  const hAt = (uu) => prof.halfWidthAt(uu);
  /* THE OUTLINE'S OWN MINIMUM over the basal stretch, found by SEARCH rather than
     read off the declaration — so a declaration that has stopped describing the
     outline shows as the two disagreeing (K1). The two owners are different: the
     declaration is `laminaSlopeBreaks`, the search is `halfWidthAt`. */
  let best = Infinity, uMin = 0;
  const du = G.ROOT_BLEND_END / SEARCH_N;
  for (let i = 0; i <= SEARCH_N; i++) { const uu = G.ROOT_BLEND_END * i / SEARCH_N; const h = hAt(uu); if (h < best) { best = h; uMin = uu; } }
  /* AND THE BAR IS THE SEARCH'S OWN STEP, NOT A TYPED EPSILON. The minimum is a
     CORNER (two terms crossing), so the half-width's error over one step is FIRST
     order and is whatever the outline itself moves over that step — measured here
     rather than guessed, which is the only way the comparison is in the unit the
     quantity carries. */
  const stepMm = Math.max(Math.abs(hAt(uMin + du) - best), Math.abs(hAt(Math.max(0, uMin - du)) - best));
  return { u, halfMm: hAt(u), acrossMm: 2 * hAt(u), searchU: uMin, searchHalfMm: best, searchStepU: du, searchStepMm: stepMm,
    wallFloorU: P.wallFloorU(ctx, wall), floorU: P.basalFloorU(ctx, wall), wallBinds: P.wallFloorU(ctx, wall) > P.laminaFloorU(ctx) + 1e-12,
    footAcrossMm: 2 * hAt(0), peakAcrossMm: 2 * prof.halfWidthBaseAt(prof.uPk), t: ctx.t };
}

/* ------------------------------------------------------- one boundary row */

/* ONE (boundary, wall) CELL over all eight seeds, at Eva's own grading. `panelShare`
   and `bottom45Solid` are #252's, term for term, so every figure below is directly
   comparable to the table she ruled from. */
export function cell(ctx, row, wall, opts = F_OPTS, seeds = SEEDS) {
  const prof = ctx.surface.profile;
  const hAt = (u) => prof.halfWidthAt(u);
  const hAtX = (x) => hAt(Math.min(1, Math.max(0, x / ctx.L)));
  const xBot = BOTTOM_BAND_TOP * ctx.L;
  const laminaBot = P.laminaAreaX(hAtX, 0, xBot);
  const blade = areaU(hAt, ctx.L, 0, 1);
  const waistX = P.basalFloorU(ctx, wall) * ctx.L;
  const per = seeds.map((seed) => {
    const F = P.fieldSalvage(ctx, N_CELLS, { ...opts, u0: ctx.rows[row].u, seed });
    const m = P.measure(ctx, F, wall);
    const r = P.cutThrough(ctx, F, wall);
    let openBot = 0, openAll = 0, openBelowWaist = 0;
    for (const h of r.holes) {
      const cl = P.clipBandX(h, 0, xBot); if (cl) openBot += P.polyArea(cl);
      const lo = P.clipBandX(h, 0, waistX); if (lo) openBelowWaist += P.polyArea(lo);
      openAll += P.polyArea(h);
    }
    const nullHoles = F.cells.filter((c) => !F.holeOf(c, wall)).length;
    return { F, m, openBot, openAll, openBelowWaist, nullHoles };
  });
  const m = per.map((p) => p.m), F0 = per[0].F;
  const pick = (f) => m.map(f);
  return {
    row, wall, uPanel: ctx.rows[row].u, uOv: F0.uOv, aboveFloor: F0.uOv >= P.basalFloorU(ctx, wall) - 1e-12,
    panelMm2: areaU(hAt, ctx.L, 0, ctx.rows[row].u), bladeMm2: blade,
    panelShare: areaU(hAt, ctx.L, 0, ctx.rows[row].u) / blade,
    bottom45Solid: med(per.map((p) => 1 - p.openBot / laminaBot)),
    openBotMm2: med(per.map((p) => p.openBot)),
    openBelowWaistMm2: med(per.map((p) => p.openBelowWaist)),
    bladeOpen: med(per.map((p) => p.openAll / blade)),
    laminaWall: med(pick((x) => x.wallFraction)),
    holes: med(pick((x) => x.holes)), real: med(pick((x) => x.real)),
    nullHoles: med(per.map((p) => p.nullHoles)),
    holeMin: Math.min(...pick((x) => x.holeMin)),
    tris: med(pick((x) => x.tris)),
    boundary: rngOf(pick((x) => x.boundary)), nonManifold: rngOf(pick((x) => x.nonManifold)),
    shells: rngOf(pick((x) => x.shells)), voxel06: rngOf(pick((x) => x.voxel06)), voxel03: rngOf(pick((x) => x.voxel03)),
    clean: m.every((x) => x.boundary === 0 && x.shells === 1 && x.voxel06 === 1 && x.voxel03 === 1),
  };
}

/* THE SWEEP'S OWN RANGE. From #252's shipped boundary down to the last row that
   BUILDS — which is bounded by `splitRow`'s own arithmetic rather than by geometry:
   the three feet all carry u = 0, so a target at or below the third one snaps to row
   0 and `rows[mSplit - 1]` is undefined. Reported as the arithmetic floor it is. */
export function sweepRows(ctx) {
  const out = [];
  for (let r = 19; r >= 1; r--) { if (r - 1 < 0) break; if (ctx.rows[r] === undefined) continue; if (ctx.rows[r].u === 0) break; out.push(r); }
  return out;
}

/* ------------------------------------------------------ the A7 / HELD_ROWS bound */

/* THE LADDER IS THE BUILDER'S AND THE INFILL NEVER TOUCHES IT — asserted on the
   EMITTED stations rather than argued from the call graph, because "it does not call
   `bladeStations`" is a claim about code and this is a claim about the artefact.

   WHAT IT CAN ACTUALLY CATCH, stated so the clause is not read as stronger than it is.
   The boundary is not a state field, so it cannot reach `bladeStations` by any route;
   the ONE way the infill could move the ladder is by MUTATING the rows the builder
   handed it, and that is what this measures. A fresh build supplies the reference —
   an owner the field does not write — the field is then run at every boundary on the
   shared context, and the shared context's stations are compared against that
   reference afterwards under `Object.is`. `ref` is injectable so K4 can perturb it
   and require the comparison to report. */
export function ladderHeld(ctx, rows, ref = null) {
  const fresh = () => {
    const st = { ...DEFAULTS };
    const acc = new G.MeshBuilder({ exportMode: true, captureGrid: true });
    const { ring, slot } = firstSlot(st, acc);
    return G.buildPetalInto(acc, st, ring, slot, null, true).grid[0].rows.map((r) => r.u);
  };
  const reference = ref || fresh();
  let built = 0;
  for (const row of rows) { P.fieldSalvage(ctx, N_CELLS, { ...F_OPTS, u0: ctx.rows[row].u, seed: SEEDS[0] }); built++; }
  const after = ctx.rows.map((r) => r.u);
  let moved = 0, worst = 0;
  if (after.length !== reference.length) { moved = Math.abs(after.length - reference.length); worst = Infinity; }
  else for (let i = 0; i < after.length; i++) if (!Object.is(after[i], reference[i])) { moved++; worst = Math.max(worst, Math.abs(after[i] - reference[i])); }
  const seamStep = Math.round(ctx.rows.filter((r) => r.u > 0)[0].u * G.BLADE_ROWS);
  return { checked: built, stations: after.length, moved, worst, seamStep,
    heldTopU: (seamStep + G.HELD_ROWS - 1) / G.BLADE_ROWS, heldRows: G.HELD_ROWS, rootBlendEnd: G.ROOT_BLEND_END };
}

/* ------------------------------------------------------------------- report */

function fmtCell(c) {
  return `${String(c.row).padStart(3)} | ${c.uPanel.toFixed(7)} | ${c.uOv.toFixed(7)} | ${(c.aboveFloor ? 'above' : 'BELOW').padStart(5)} | ${(100 * c.panelShare).toFixed(2).padStart(6)} | ${(100 * c.bottom45Solid).toFixed(1).padStart(8)} | ${c.openBotMm2.toFixed(2).padStart(8)} | ${(100 * c.laminaWall).toFixed(1).padStart(6)} | ${String(c.holes).padStart(5)} | ${String(c.nullHoles).padStart(5)} | ${c.holeMin.toFixed(3).padStart(7)} | ${String(c.tris).padStart(5)} | ${c.boundary.padStart(3)} | ${c.nonManifold.padStart(6)} | ${c.shells.padStart(6)} | ${c.voxel06.padStart(5)} | ${c.voxel03.padStart(5)}`;
}
const HEAD = 'row | panel to u | cells from | floor | panel% | b45solid | openMm2 | wall% | holes | nulls | holeMin |  tris | bnd | nonMan | shells | vox.6 | vox.3';

async function main() {
  const ctx = P.context({});
  const w = waistOf(ctx);
  const rows = sweepRows(ctx);
  const out = { petal: { L: ctx.L, sheet: ctx.t, plainTris: ctx.plainTris, N: N_CELLS, seeds: SEEDS, opts: F_OPTS }, waist: w, sweep: [], mechanism: {}, ladder: {}, self: [], mode: [] };

  console.log(`default petal ${ctx.L} mm long, sheet ${ctx.t} mm, EXPORT mode; ${N_CELLS} cells; ${SEEDS.length} seeds; Eva's own grading (converge ${F_OPTS.converge}, baseNarrow ${F_OPTS.baseNarrow}).`);
  console.log(`THE FLOOR: the outline's ROOT_BLEND -> CORE handover at u ${w.u.toFixed(7)} — the blade's WAIST, ${w.acrossMm.toFixed(3)} mm across against ${w.footAcrossMm.toFixed(3)} at the foot and ${w.peakAcrossMm.toFixed(3)} at its widest.`);
  console.log(`  the section there is ${(w.acrossMm * w.t).toFixed(2)} mm2 against ${(w.footAcrossMm * w.t).toFixed(2)} at the foot and ${(w.peakAcrossMm * w.t).toFixed(2)} at the peak — the narrowest the blade gets between the foot and the tip.`);
  console.log(`  the SHIPPED boundary is now row ${P.basalSplit(ctx, {})} (u ${ctx.rows[P.basalSplit(ctx, {})].u.toFixed(7)}), derived; ROOT_BLEND_END is ${G.ROOT_BLEND_END} and owns the outline, not this.\n`);

  /* ---- 1. the sweep ---- */
  console.log('1. THE SWEEP. Every lattice station from #252\'s shipped boundary down to the last one that builds, at Eva\'s own grading.');
  console.log(`   F is row ${F_ROW}. \`floor\` says whether the cell region starts at or above the waist.\n`);
  for (const wall of (QUICK ? [1.0] : WALLS)) {
    console.log(`   wall ${wall.toFixed(1)} mm`);
    console.log(`   ${HEAD}`);
    for (const row of rows) {
      const c = cell(ctx, row, wall);
      out.sweep.push(c);
      const mark = row === F_ROW ? '  <- F (Eva\'s cell)' : row === P.basalSplit(ctx, {}) ? '  <- THE FLOOR' : '';
      console.log(`   ${fmtCell(c)}${mark}`);
    }
    console.log('');
  }

  /* ---- 2. the mechanism ---- */
  console.log('2. THE MECHANISM — the waist, and three confirmations that it is what binds.');
  const mech = [];
  for (const [nm, set, note] of [['DEFAULTS', {}, 'the WAIST binds'],
                                 ['footDelicacy 0.25', { footDelicacy: 0.25 }, 'no waist at all — the WALL floor binds instead'],
                                 ['petalWidth 30', { petalWidth: 30 }, 'the waist sits a row lower and the floor follows it']]) {
    const c2 = P.context(set);
    const ww = waistOf(c2, 1.0);
    const mF = P.basalSplit(c2, {});
    const band = sweepRows(c2).filter((r) => r <= mF + 3 && r >= mF - 2);
    console.log(`   ${nm} — ${note}`);
    console.log(`     waist u ${ww.u.toFixed(7)} (${ww.acrossMm.toFixed(3)} mm across) | wall floor u ${ww.wallFloorU.toFixed(7)} | FLOOR u ${ww.floorU.toFixed(7)} -> row ${mF}`);
    console.log('     row | cells from | floor | b45solid | openMm2 | open below the floor | nulls | tris');
    const line = [];
    for (const row of band) {
      const c = cell(c2, row, 1.0);
      line.push(c);
      console.log(`     ${String(row).padStart(3)} | ${c.uOv.toFixed(7)} | ${(c.aboveFloor ? 'above' : 'BELOW').padStart(5)} | ${(100 * c.bottom45Solid).toFixed(1).padStart(8)} | ${c.openBotMm2.toFixed(2).padStart(7)} | ${c.openBelowWaistMm2.toFixed(3).padStart(20)} | ${String(c.nullHoles).padStart(5)} | ${String(c.tris).padStart(5)}`);
    }
    /* THE STEP, NOT THE SIGN. A sweep drifts; what the floor predicts is a STEP, so the
       largest one and where it is are what the line reports — a rise of 0.4 points and a
       rise of 19.7 are not the same reading and a bare "reverses at row N" says they are.
       No threshold: the largest step is the largest step. */
    let rev = null, big = null, bigD = -Infinity;
    for (let i = 1; i < line.length; i++) {
      const d = line[i].bottom45Solid - line[i - 1].bottom45Solid;
      if (rev === null && d > 1e-9) rev = line[i].row;
      if (d > bigD) { bigD = d; big = line[i].row; }
    }
    const firstBelow = line.find((c) => !c.aboveFloor);
    const same = big !== null && firstBelow && big === firstBelow.row;
    console.log(`     -> the LARGEST step in the band is at row ${big} (+${(100 * bigD).toFixed(1)} points); the first row below the floor is ${firstBelow ? firstBelow.row : 'none in this band'}.${same ? '  THE SAME ROW.' : ''}`);
    console.log(`        (the first row that reads worse at all is ${rev === null ? 'none' : rev}; every step in the band: ${line.slice(1).map((c, i) => `${c.row}: ${((100 * (c.bottom45Solid - line[i].bottom45Solid)) >= 0 ? '+' : '') + (100 * (c.bottom45Solid - line[i].bottom45Solid)).toFixed(1)}`).join(', ')})\n`);
    mech.push({ name: nm, note, waist: ww, floorRow: mF, reversalRow: rev, largestStepRow: big, largestStepPoints: 100 * bigD, firstBelowFloorRow: firstBelow ? firstBelow.row : null, sameRow: same, rows: line });
  }
  out.mechanism = mech;

  /* ---- 3. the collision ---- */
  console.log('3. THE `HELD_ROWS` / `A7` COLLISION — bounded.');
  const lad = ladderHeld(ctx, rows);
  out.ladder = lad;
  console.log(`   the field was run at every one of ${lad.checked} boundaries and the builder's ${lad.stations} stations compared afterwards against a FRESH build: ${lad.moved} moved${lad.moved ? `, worst |delta| ${lad.worst}` : ' — IDENTICAL under Object.is'}`);
  console.log(`   seamStep ${lad.seamStep}; HELD_ROWS ${lad.heldRows}; the held block ends at u ${lad.heldTopU.toFixed(7)} (row ${Math.round(lad.heldTopU * G.BLADE_ROWS) - lad.seamStep + 1 + 3}); ROOT_BLEND_END ${lad.rootBlendEnd}`);
  const opt2Row = ctx.rows.findIndex((r) => Math.abs(r.u - lad.heldTopU) < 1e-9);
  console.log(`   #252's option 2 puts the boundary AT the last held station — row ${opt2Row}, u ${lad.heldTopU.toFixed(7)}, panel ${(100 * areaU((u) => ctx.surface.profile.halfWidthAt(u), ctx.L, 0, ctx.rows[opt2Row].u) / areaU((u) => ctx.surface.profile.halfWidthAt(u), ctx.L, 0, 1)).toFixed(2)} % of the blade.`);
  console.log(`   Eva ruled row ${F_ROW} (panel 8.83 %) the best cell and asked for LOWER. Option 2 is ${opt2Row - F_ROW} rows ABOVE it: REFUTED by the ruling, not by a measurement.\n`);

  /* ---- 4. the self-approach ---- */
  console.log('4. THE SELF-APPROACH, below F, on the masked lattice (#252 §3c extended).');
  let below = 0, eq = 0, above = 0, total = 0, worst = 0, worstWhere = '';
  const states = QUICK ? WALL_STATES.filter((s) => ['flat', 'roll-max', 'form-max'].includes(s.id)) : WALL_STATES;
  const selfRows = QUICK ? [F_ROW, 7, 5] : rows.filter((r) => r <= F_ROW);
  for (const s of states) {
    const R = rigFor(s.set), c2 = P.context(s.set);
    const plain = approachMasked(R).self;
    let mn = Infinity, nb = 0;
    for (const wall of (QUICK ? [1.0] : WALLS)) for (const row of selfRows) for (const seed of SEEDS) {
      const v = infilledWall(R, c2, c2.rows[row].u, F_OPTS, wall, seed).self;
      total++; mn = Math.min(mn, v);
      if (v < plain - 1e-12) { nb++; below++; const d = plain - v; if (d > worst) { worst = d; worstWhere = `${s.id} wall ${wall} row ${row}`; } }
      else if (Math.abs(v - plain) <= 1e-12) eq++; else above++;
    }
    out.self.push({ id: s.id, plain, shipped: R.shipped.self, min: mn, below: nb });
    console.log(`   ${s.id.padEnd(14)} | the rule's own plain self ${plain.toFixed(6)} | measureWall ${R.shipped.self.toFixed(6)} | masked min ${mn.toFixed(6)} | ${nb === 0 ? 'none below' : `**${nb} BELOW**`}`);
  }
  console.log(`   -> over ${total} (state x wall x boundary x seed) readings: ${below} below the plain petal, ${eq} exactly equal, ${above} above.${below ? ` worst deficit ${worst.toExponential(3)} mm at ${worstWhere}` : ''}\n`);
  out.selfTotals = { total, below, eq, above };

  /* ---- 5. the mode ---- */
  console.log('5. THE MODE. The floor reads `laminaSlopeBreaks` and not `slopeBreaks`, and the reason is a measurement.');
  const modeSets = QUICK ? [['DEFAULTS', {}], ['footDelicacy 0.25', { footDelicacy: 0.25 }]]
    : [['DEFAULTS', {}], ['sheet 0.6', { sheetThickness: 0.6 }], ['sheet 2.4', { sheetThickness: 2.4 }], ['petalWidth 8', { petalWidth: 8 }], ['petalWidth 30', { petalWidth: 30 }], ['footDelicacy 0.25', { footDelicacy: 0.25 }], ['footDelicacy 1.0', { footDelicacy: 1.0 }], ['petalLength 20', { petalLength: 20 }], ['petalLength 60', { petalLength: 60 }], ['hubRadius 3', { hubRadius: 3 }], ['hubRadius 14', { hubRadius: 14 }], ['tipShape 0.6', { petalTipShape: 0.6 }], ['tipShape 3.0', { petalTipShape: 3.0 }], ['petalTipEnd 1', { petalTipEnd: 1 }], ['lobeDepth 1 x 3', { lobeDepth: 1, lobeCount: 3 }], ['layerCount 6', { layerCount: 6 }], ['petalCount 40', { petalCount: 40 }], ['cup 1.2', { petalCup: 1.2 }], ['tilt 75 x len 20 x sheet 2.4', { petalTilt: 75, petalLength: 20, sheetThickness: 2.4 }]];
  const profOf = (set, exportMode) => { const st = { ...DEFAULTS, ...set }; const acc = new G.MeshBuilder({ exportMode, captureGrid: true }); const { ring, slot } = firstSlot(st, acc); return G.petalSurface(st, ring, slot, null, acc).profile; };
  const breakU = (pr, fn) => { const b = pr[fn]().find((x) => x.from === 'ROOT_BLEND'); return b ? b.u : null; };
  let dLam = 0, dSlope = 0;
  console.log('   state                        | laminaSlopeBreaks live/export | slopeBreaks live | slopeBreaks export | mode-dependent?');
  for (const [nm, set] of modeSets) {
    const pL = profOf(set, false), pE = profOf(set, true);
    const lL = breakU(pL, 'laminaSlopeBreaks'), lE = breakU(pE, 'laminaSlopeBreaks');
    const sL = breakU(pL, 'slopeBreaks'), sE = breakU(pE, 'slopeBreaks');
    const sameL = Object.is(lL, lE), sameS = Object.is(sL, sE);
    if (!sameL) dLam++; if (!sameS) dSlope++;
    out.mode.push({ name: nm, laminaLive: lL, laminaExport: lE, slopeLive: sL, slopeExport: sE, laminaSame: sameL, slopeSame: sameS });
    console.log(`   ${nm.padEnd(28)} | ${(sameL ? String(lL === null ? 'NONE' : lL.toFixed(9)) + ' (same)' : '**' + lL + ' / ' + lE + '**').padStart(29)} | ${String(sL === null ? 'NONE' : sL.toFixed(9)).padStart(16)} | ${String(sE === null ? 'NONE' : sE.toFixed(9)).padStart(18)} | ${sameS ? 'no' : '**YES**'}`);
  }
  console.log(`   -> laminaSlopeBreaks differs live/export on ${dLam} of ${modeSets.length}; slopeBreaks differs on ${dSlope}.`);
  out.modeTotals = { states: modeSets.length, laminaDiffers: dLam, slopeDiffers: dSlope };

  const jf = arg('--json', null);
  if (jf) { fs.writeFileSync(jf, JSON.stringify(out, null, 1)); console.log(`\njson -> ${jf}`); }
}

/* ------------------------------------------------------------------ the must-fail */

/* FOUR CLAIMS, EACH BROKEN ON PURPOSE AND EACH REQUIRED TO BE SEEN TO BREAK. A check
   that has never been observed failing is a hope. */
async function control() {
  let bad = 0;
  const ctx = P.context({});

  /* K1 — THE DECLARATION IS THE OUTLINE'S. The floor is read off
     `laminaSlopeBreaks`, which is a DECLARATION; a declaration can lie. It is pinned
     to the outline by SEARCH — the minimum of the emitted half-width over the basal
     stretch — whose owner is `halfWidthAt` and not the break list. The must-fail
     looks up the WRONG break (the tip's) and requires the two to disagree. */
  const w = waistOf(ctx);
  const dU = Math.abs(w.u - w.searchU), dMm = Math.abs(w.halfMm - w.searchHalfMm);
  const okDecl = dU <= w.searchStepU && dMm <= w.searchStepMm;
  const wrong = ctx.surface.profile.laminaSlopeBreaks().find((x) => x.to === 'TIP_FLOOR');
  const wrongU = wrong ? wrong.u : null;
  const canFail = wrongU !== null && Math.abs(wrongU - w.searchU) > w.searchStepU;
  console.log(`K1  the declared floor IS the outline's own minimum: declared u ${w.u.toFixed(7)} (half ${w.halfMm.toFixed(6)} mm) against the search's u ${w.searchU.toFixed(7)} (half ${w.searchHalfMm.toFixed(6)})`);
  console.log(`    |du| ${dU.toExponential(2)} against the search's own step ${w.searchStepU.toExponential(2)}, |dh| ${dMm.toExponential(2)} mm against what the outline moves over that step ${w.searchStepMm.toExponential(2)} mm — ${okDecl ? 'AGREE' : '**DISAGREE**'}`);
  console.log(`    and the clause can fail: the TIP_FLOOR break sits at u ${wrongU === null ? 'n/a' : wrongU.toFixed(7)}, which the same test ${canFail ? 'REJECTS' : '**ACCEPTS**'}`);
  if (!(okDecl && canFail)) bad++;

  /* K2 — THE REVERSAL IS NOT VACUOUS, AND IT IS THE WAIST'S. Three petals: one with a
     waist (the reversal must land on the first row below it), one with NO waist (there
     must be no reversal at that row), and one whose waist is a row lower (the reversal
     must MOVE with it). A correlation on one petal is not a mechanism. */
  const probes = [['DEFAULTS', {}], ['footDelicacy 0.25 (no waist, WALL floor)', { footDelicacy: 0.25 }], ['petalWidth 30 (waist a row lower)', { petalWidth: 30 }]];
  let k2a = true, k2b = true, k2cFired = 0, k2cExplained = 0;
  for (const [nm, set] of probes) {
    const c2 = P.context(set);
    const hAt = (u) => c2.surface.profile.halfWidthAt(u);
    const mFloor = P.basalSplit(c2, {});
    const fl = P.basalFloorU(c2, 1.0);
    /* K2a — THE CRITERION, on the OUTLINE. The floor row's own overlap row clears the
       floor and the row below it does NOT, which is what makes `floorRow` the FIRST
       admissible row rather than some row. Owner: `halfWidthAt` and the two floors —
       not the field, not the answer. */
    const atOk = c2.rows[mFloor - 1].u >= fl - 1e-12;
    const belowBad = mFloor - 2 >= 0 ? c2.rows[mFloor - 2].u < fl - 1e-12 : true;
    const firstRow = mFloor - 1 <= footRowsOf(c2);          /* or the feet floor is what bound it */
    if (!(atOk && (belowBad || firstRow))) k2a = false;
    console.log(`K2a ${nm.padEnd(38)} floor u ${fl.toFixed(7)}: row ${mFloor} starts at u ${c2.rows[mFloor - 1].u.toFixed(7)} (clears), row ${mFloor - 1} would start at u ${mFloor - 2 >= 0 ? c2.rows[mFloor - 2].u.toFixed(7) : 'n/a'} (${belowBad ? 'does NOT' : firstRow ? 'the FEET floor bound it' : '**also clears — floorRow is not the first admissible row**'}); half-widths ${hAt(c2.rows[mFloor - 1].u).toFixed(4)} / ${mFloor - 2 >= 0 ? hAt(c2.rows[mFloor - 2].u).toFixed(4) : 'n/a'} mm`);

    /* K2b — THE ANSWER. Every row below the floor reads MORE solid in the bottom 45 %
       than the floor does. A strict comparison, no threshold. Owner: the field's own
       emitted holes, which neither floor writes. */
    const atFloor = cell(c2, mFloor, 1.0);
    const belowRows = sweepRows(c2).filter((r) => r < mFloor);
    const worse = belowRows.map((r) => cell(c2, r, 1.0));
    const allWorse = worse.every((c) => c.bottom45Solid > atFloor.bottom45Solid);
    if (!allWorse) k2b = false;
    console.log(`K2b ${nm.padEnd(38)} floor row ${mFloor} reads ${(100 * atFloor.bottom45Solid).toFixed(1)} % solid in the bottom 45; the ${belowRows.length} row(s) below read ${worse.map((c) => (100 * c.bottom45Solid).toFixed(1)).join(', ')} — ${allWorse ? 'ALL WORSE, as the floor claims' : '**one is BETTER**'}`);

    /* K2c — IS THE FLOOR LOAD-BEARING IN THE ANSWER? Move it DOWN one row and K2b has
       to break, or "everything below is worse" is true of any row and says nothing.
       ITS SUBJECT IS A SET AND THE SET IS NAMED: petals whose bottom-45 curve is
       NON-MONOTONE below the floor. On a petal where the curve degrades monotonically
       all the way to the last buildable row, NO row is distinguishable by K2b and a
       control that claimed otherwise would be the "cannot fail" defect in reverse —
       so monotonicity is MEASURED here and reported, never assumed. */
    const mFake = mFloor - 1;
    if (mFake >= 1 && sweepRows(c2).includes(mFake)) {
      const atFake = cell(c2, mFake, 1.0);
      const fakeBelow = sweepRows(c2).filter((r) => r < mFake).map((r) => cell(c2, r, 1.0));
      const fakeHolds = fakeBelow.length > 0 && fakeBelow.every((c) => c.bottom45Solid > atFake.bottom45Solid);
      /* monotone = every step DOWN the sweep from the floor reads worse than the last */
      const chain = [atFloor, ...worse];
      let monotone = true;
      for (let i = 1; i < chain.length; i++) if (!(chain[i].bottom45Solid > chain[i - 1].bottom45Solid)) monotone = false;
      if (!fakeHolds) { k2cFired++; console.log(`K2c ${nm.padEnd(38)} floor moved DOWN one row (${mFake}): K2b BREAKS — the floor is load-bearing`); }
      else if (monotone) { k2cExplained++; console.log(`K2c ${nm.padEnd(38)} floor moved DOWN one row (${mFake}): K2b still holds, AND the curve below the floor is MONOTONE (${chain.map((c) => (100 * c.bottom45Solid).toFixed(1)).join(' < ')}) — no row is distinguishable by K2b on this petal, so K2b is not a witness for the floor here and K2a is`); }
      else { console.log(`K2c ${nm.padEnd(38)} floor moved DOWN one row (${mFake}): K2b still holds and the curve is NOT monotone — **unexplained**`); k2b = false; }
    }
  }
  if (!k2a) bad++;
  if (!k2b) bad++;
  if (k2cFired === 0) { console.log('K2c **the negative fired on NO petal — K2b is not shown able to fail anywhere**'); bad++; }
  else console.log(`K2c the negative fired on ${k2cFired} of ${probes.length} petals and is explained by a measured monotone curve on ${k2cExplained}.`);

  /* K3 — THE FLOOR IS REACHED AND IT IS NOT A NEAREST-SNAP. `basalSplit` with no `u0`
     must land on the lowest row whose OVERLAP row clears the floor, and a nearest-snap
     to the same floor must land BELOW it — which is the defect the rule exists to
     avoid and is measured here rather than asserted. */
  const m = P.basalSplit(ctx, {});
  const fl = P.basalFloorU(ctx, 1.0);
  const snapped = P.basalSplit(ctx, { u0: fl });
  const derivedOk = ctx.rows[m - 1].u >= fl - 1e-12;
  const snapBelow = ctx.rows[snapped - 1].u < fl - 1e-12;
  console.log(`K3  the derived split is row ${m} (cells from u ${ctx.rows[m - 1].u.toFixed(7)}, floor u ${fl.toFixed(7)}) — ${derivedOk ? 'CLEARS the floor' : '**BELOW the floor**'}`);
  console.log(`    a NEAREST-snap to the same floor gives row ${snapped} (cells from u ${ctx.rows[snapped - 1].u.toFixed(7)}) — ${snapBelow ? 'BELOW it, which is why the rule is not a snap' : '**also clears it, so this clause proves nothing on this petal**'}`);
  if (!(derivedOk && snapBelow)) bad++;

  /* K4 — THE LADDER CLAUSE CAN FAIL. §3 compares the emitted stations against a
     fresh build; a comparison that cannot report a difference is a log line. The
     reference is perturbed by ONE ULP at one station and the SHIPPED clause — not a
     copy of it — has to see it. */
  const clean = ladderHeld(ctx, [P.basalSplit(ctx, {})]);
  const ref = ctx.rows.map((r) => r.u);
  const bent = ref.slice(); bent[20] = bent[20] + Number.EPSILON * bent[20];
  const bad4 = ladderHeld(ctx, [P.basalSplit(ctx, {})], bent);
  const ok4 = clean.moved === 0 && bad4.moved > 0;
  console.log(`K4  the shipped ladder clause reports ${clean.moved} moved against a fresh build, and ${bad4.moved} against a reference bent by one ULP at station 20 (${bent[20] - ref[20] === 0 ? '**the bend was below the double**' : `+${(bent[20] - ref[20]).toExponential(2)}`}) — ${ok4 ? 'IT CAN FAIL' : '**IT CANNOT**'}`);
  if (!ok4) bad++;

  console.log(bad === 0 ? 'PASS' : `FAIL — ${bad} control(s) did not behave`);
  if (bad) process.exit(1);
}

if (IS_MAIN) { if (process.argv.includes('--control')) await control(); else await main(); }
