/* ===================================================================
   bloom-form-variance-hazard.mjs — DOES FORM VARIANCE PUT ONE PETAL IN A
   DECLARED COMBINATION HAZARD WHILE THE SLIDERS SIT CLEAR OF IT?

     node tools/bloom-form-variance-hazard.mjs [--pair <id,...>] [--amount A] [--quick]

   AN INSTRUMENT, WIRED TO NO GATE (organic variance, build 2 —
   docs/bloom-organic-variance-form-outcome.md §4). The combination gate
   (tools/bloom-combination-gate.mjs) declares hazards measured at SLIDER
   settings, on ONE petal (`built.petal`), because every petal of an unvaried
   whorl is the same petal. Form variance ends that: it moves curl, cup and
   twist PER SLOT, so a bloom whose sliders sit nowhere near a hazard can still
   hold one petal that is. This asks exactly that, with the gate's own measure
   and the gate's own grids:

   FOR EACH DECLARED PAIR whose measure is `self` (cup x roll, curl x twist,
   cup x tip shape) and EVERY cell of that pair's own grid as the SLIDER
   state, build the bloom with `varianceForm` at its limit, at frequency 1
   and 20 (1 draws a wave on every whorl here; 20 is past n/2 on every one —
   the ALIASED regime, where neighbouring petals take uncorrelated deltas) and
   phase 0 and 90, EXPORT, and run `measureWall(grid).self` — IMPORTED from
   tools/bloom-wall-thickness.mjs, the gate's own quantity through the gate's
   own function, with the gate's own `nibFromU` exclusion — on EVERY PETAL the
   builder emitted (`petalsAll`, each carrying its own captured grid), never on
   the representative alone. Reports, per pair:

     - the worst per-petal `self` reached anywhere on the grid under the field,
       beside the pair's worst DECLARED magnitude (COMBINATION_XFAIL, imported)
       and the petal's own composed (curl, cup, twist) — read off `applied`,
       the values the builder built with;
     - the same restricted to SLIDER STATES THAT CLEAR (the cell's own unvaried
       `self` at or above MIN_FEATURE_MM, measured here, not read off the list):
       the question the brief asks — can a clear-looking bloom hide a hazard.

   `leafangle-x-stem` is the fourth declared pair and its measure is not
   `self`: a leaf takes no form field (`leafBladeState` pins its curl, cup and
   twist by declaration), so the tool builds each of that pair's cells with
   the field at its limit and at 0 and requires the leaf-against-stem figure
   to be IDENTICAL — `Object.is` — which is the claim, measured.

   The DEFAULT BLOOM is reported first: every slider at its default, the
   field at its limit, the worst petal — the headline.
   =================================================================== */
import * as G from '../bloom-geometry.js';
import { DEFAULTS } from '../bloom-registry.js';
import { measureWall } from './bloom-wall-thickness.mjs';
import { PAIRS, COMBINATION_XFAIL, cellKey, measureLeafStemApproachMm } from './bloom-combination-gate.mjs';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const AMOUNT = Number(opt('--amount', G.VARIANCE_FORM_RANGE[1]));
const ONLY = opt('--pair', null);
const QUICK = argv.includes('--quick');
const SETTINGS = QUICK ? [[1, 0], [20, 0]] : [[1, 0], [1, 90], [20, 0], [20, 90]];
const f3 = (x) => (Number.isFinite(x) ? x.toFixed(3) : String(x));

function nibOf(p) {
  const ap = p.tipCap && p.tipCap.apex;
  return ap && ap.active && ap.drawnLengthMm > 0 ? ap.xLawMm / ap.drawnLengthMm : null;
}
export function perPetalSelf(state) {
  const acc = new G.MeshBuilder({ exportMode: true, captureGrid: true });
  const m = G.buildBloomInto(acc, state);
  const out = [];
  for (const p of m.petalsAll) {
    if (!p || !p.grid) continue;
    const r = measureWall(p.grid, { nibFromU: nibOf(p) });
    out.push({ self: r.self, slot: p.slotIndex, whorl: p.whorl, az: p.azimuth,
      curl: p.applied.petalSpineCurl, cup: p.applied.petalCup, twist: p.applied.petalTwist, term: p.formTerm });
  }
  return { petals: out, aliased: m.formVariance ? m.formVariance.aliased : null, n: m.formVariance ? m.formVariance.n : null };
}
const worstOf = (ps) => ps.reduce((a, b) => (b.self < a.self ? b : a), { self: Infinity });

/* `--sweep`: the amount at which the WORST petal of a bloom first falls under
   the bar, stepped at the control's own 0.01, on the defaults and on the
   pair grids' clear corners — the number a ruling on the range would need. */
const STATES = [['the DEFAULT bloom', {}], ['40 petals', { petalCount: 40 }], ['3 petals', { petalCount: 3 }], ['FAN', { placement: 'FAN' }],
  ['CONTINUOUS x 3 turns', { placement: 'CONTINUOUS', layerCount: 3 }], ['3 whorls', { layerCount: 3 }], ['tilt 75', { petalTilt: 75 }], ['sheet 2.40', { sheetThickness: 2.4 }]];
/* `--headline`: the worst per-petal `self` at the amount asked, over every
   setting, on each state (or `--state i,j`) — the three-way excursion the
   offset ruling is judged on. */
function headline() {
  const BAR = G.MIN_FEATURE_MM;
  const pick = opt('--state', null);
  for (const [si, [label, set]] of STATES.entries()) {
    if (pick !== null && !pick.split(',').map(Number).includes(si)) continue;
    for (const [f, ph] of SETTINGS) {
      const r = perPetalSelf({ ...DEFAULTS, ...set, varianceForm: AMOUNT, varianceFrequency: f, variancePhase: ph });
      const w = worstOf(r.petals);
      console.log(`  ${label.padEnd(22)} f ${String(f).padStart(2)} ph ${String(ph).padStart(2)}${r.aliased ? ' ALIASED' : '        '} worst ${f3(w.self)} mm at curl ${f3(w.curl)} cup ${f3(w.cup)} twist ${f3(w.twist)}  ${w.self < BAR ? 'UNDER THE BAR' : 'clears'}  (${r.petals.length} petals)`);
    }
  }
}
function sweep() {
  const BAR = G.MIN_FEATURE_MM;
  const states = STATES;
  const pick = opt('--state', null);
  for (const [si, [label, set]] of states.entries()) for (const [f, ph] of [[1, 0], [20, 0]]) {
    if (pick !== null && !pick.split(',').map(Number).includes(si)) continue;
    let first = null, at = null, last = null;
    /* from 0.30: every state swept reads clear well below it (measured), and a
       linear 0.01 walk from 0 costs minutes a state for nothing */
    for (let k = 30; k <= 100; k++) {
      const a = k / 100;
      const r = perPetalSelf({ ...DEFAULTS, ...set, varianceForm: a, varianceFrequency: f, variancePhase: ph });
      const w = worstOf(r.petals);
      last = { a, w, aliased: r.aliased };
      if (w.self < BAR) { first = a; at = w; break; }
    }
    console.log(`  ${label.padEnd(22)} f ${String(f).padStart(2)}${last.aliased ? ' ALIASED' : '        '}: ${first === null ? `clears at every amount to 1.00 (worst ${f3(last.w.self)} mm)` : `first petal under ${BAR} mm at amount ${first.toFixed(2)} — ${f3(at.self)} mm at curl ${f3(at.curl)} cup ${f3(at.cup)} twist ${f3(at.twist)}`}`);
  }
}
function main() {
  if (argv.includes('--sweep')) { sweep(); return; }
  if (argv.includes('--headline')) { headline(); return; }
  const BAR = G.MIN_FEATURE_MM;
  console.log(`form variance at ${AMOUNT} (curl ±${AMOUNT * 270}°, cup ±${AMOUNT * 1}, twist ±${AMOUNT * 180}° per slot), EXPORT, bar ${BAR} mm`);
  /* THE HEADLINE — the shipping default with the field at its limit */
  console.log('\n== the DEFAULT bloom ==');
  for (const [f, ph] of SETTINGS) {
    const r = perPetalSelf({ ...DEFAULTS, varianceForm: AMOUNT, varianceFrequency: f, variancePhase: ph });
    const w = worstOf(r.petals);
    console.log(`  f ${String(f).padStart(2)} phase ${String(ph).padStart(2)}${r.aliased ? ' ALIASED' : '        '}  worst petal self ${f3(w.self)} mm at curl ${f3(w.curl)} cup ${f3(w.cup)} twist ${f3(w.twist)}   ${w.self < BAR ? 'UNDER THE BAR' : 'clears'}   [${r.petals.map((p) => f3(p.self)).join(' ')}]`);
  }
  const want = ONLY ? new Set(ONLY.split(',')) : null;
  for (const pair of PAIRS) {
    if (want && !want.has(pair.id)) continue;
    if (!['cup-x-roll', 'curl-x-twist', 'cup-x-tipshape', 'leafangle-x-stem'].includes(pair.id)) continue;
    const declared = Object.entries(COMBINATION_XFAIL).filter(([k]) => k.startsWith(`${pair.id} @`)).map(([k, v]) => ({ k, mm: v.mm }));
    const decWorst = declared.reduce((a, b) => (b.mm < a.mm ? b : a), { mm: Infinity });
    console.log(`\n== ${pair.id} (${pair.a.id} x ${pair.b.id}) — declared worst ${f3(decWorst.mm)} mm at ${decWorst.k ?? 'none'} ==`);
    if (pair.measure === 'leaf-stem') {
      let same = 0, cells = 0;
      for (const va of pair.a.values) for (const vb of pair.b.values) {
        const st = { ...DEFAULTS, ...(pair.base || {}), [pair.a.id]: va, [pair.b.id]: vb };
        const a0 = measureLeafStemApproachMm(G, { ...st, varianceForm: 0 }, true);
        for (const [f, ph] of SETTINGS) {
          const a1 = measureLeafStemApproachMm(G, { ...st, varianceForm: AMOUNT, varianceFrequency: f, variancePhase: ph }, true);
          cells++; if (Object.is(a0.mm, a1.mm)) same++;
          else console.log(`  MOVED ${cellKey(pair, va, vb)} f ${f} ph ${ph}: ${a0.mm} -> ${a1.mm}`);
        }
      }
      console.log(`  leaf-against-stem identical under Object.is with the field on and off on ${same} of ${cells} (cell x setting) — a leaf takes no form field`);
      continue;
    }
    let worstAll = { self: Infinity }, worstClear = { self: Infinity }, clearCells = 0, underFromClear = 0, clearRuns = 0;
    for (const va of pair.a.values) for (const vb of pair.b.values) {
      const st = { ...DEFAULTS, ...(pair.base || {}), [pair.a.id]: va, [pair.b.id]: vb };
      const base = worstOf(perPetalSelf({ ...st, varianceForm: 0 }).petals).self;
      const clear = base >= BAR;
      if (clear) clearCells++;
      let cellWorst = { self: Infinity };
      for (const [f, ph] of SETTINGS) {
        const r = perPetalSelf({ ...st, varianceForm: AMOUNT, varianceFrequency: f, variancePhase: ph });
        const w = { ...worstOf(r.petals), f, ph, aliased: r.aliased, cell: cellKey(pair, va, vb), base };
        if (w.self < cellWorst.self) cellWorst = w;
        if (clear) { clearRuns++; if (w.self < BAR) underFromClear++; }
      }
      console.log(`  ${cellKey(pair, va, vb).padEnd(56)} unvaried ${f3(base)}${clear ? ' (clear)' : ' (under)'}  -> worst petal under the field ${f3(cellWorst.self)} at f ${cellWorst.f} ph ${cellWorst.ph}${cellWorst.aliased ? ' ALIASED' : ''} (curl ${f3(cellWorst.curl)} cup ${f3(cellWorst.cup)} twist ${f3(cellWorst.twist)})`);
      if (cellWorst.self < worstAll.self) worstAll = cellWorst;
      if (clear && cellWorst.self < worstClear.self) worstClear = cellWorst;
    }
    console.log(`  WORST per-petal self anywhere on the grid: ${f3(worstAll.self)} mm (${worstAll.cell}, f ${worstAll.f} ph ${worstAll.ph}, petal curl ${f3(worstAll.curl)} cup ${f3(worstAll.cup)} twist ${f3(worstAll.twist)}) against the declared worst ${f3(decWorst.mm)}`);
    console.log(`  from SLIDER STATES THAT CLEAR (${clearCells} cells): worst ${f3(worstClear.self)} mm (${worstClear.cell ?? '-'}); ${underFromClear} of ${clearRuns} (cell x setting) runs put a petal UNDER the ${BAR} mm bar`);
  }
}
main();
