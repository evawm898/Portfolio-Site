/* ===================================================================
   bloom-outline-curve-measure.mjs — THE OUTLINE CURVE'S ROWS, NIB AND INFILL,
   MEASURED (F6-sym; docs/bloom-outline-curve-outcome.md). Node only, seconds.

   For each of block 65's shapes beside the nearest LAW petal, in BOTH modes:
     * the CHORD ERROR the mesh draws (bloom-sagitta.mjs's own `sagittaOf` —
       the perpendicular distance from the outline to the chord between two of
       the BUILDER's stations, never reconstructed), by zone, and the same over
       a UNIFORM ladder of the same count: whether the turning ladder put rows
       where the drawn curve turns;
     * the worst turn between two consecutive emitted chords (a faceted corner
       reads as one large turn);
     * the fitted nib (regime, the half-width it left the curve at, its corner)
       and the drawn length against the asked one;
     * with the Voronoi infill on: holes asked / built / solid, or the word it
       refused with.
   It READS the builder (a real build, the profile `petalSurface` owns) and
   asserts nothing: it is a report. OC1 / AN / C1 are the gates.
   =================================================================== */
import * as G from '../bloom-geometry.js';
import { DEFAULTS } from '../bloom-registry.js';
import { sagittaOf } from './bloom-sagitta.mjs';
import { firstSlot } from './bloom-first-slot.mjs';

const C = (pts) => ({ petalOutlineMode: 'CURVE', petalOutlineCurve: { mode: 'symmetric', points: pts } });
export const SHAPES = [
  ['default curve', C([[0, 0.05], [0.15, 0.16], [0.36, 0.2286], [0.7, 0.178], [0.9, 0.1], [1, 0]]), 'the shipping LAW petal', {}],
  ['long tail (orchid sepal)', C([[0, 0.06], [0.15, 0.14], [0.3, 0.12], [0.5, 0.05], [0.85, 0.03], [1, 0]]), 'LAW: tip taper 4, tip shape 0.60', { petalTipTaper: 4, petalTipShape: 0.6 }],
  ['spoon on a claw', C([[0, 0.03], [0.35, 0.05], [0.65, 0.2], [0.85, 0.22], [0.96, 0.12], [1, 0]]), 'LAW: base taper 3, tip taper 0.6', { petalBaseTaper: 3, petalTipTaper: 0.6 }],
  ['near-rectangle', C([[0, 0.15], [0.1, 0.16], [0.9, 0.16], [0.97, 0.12], [1, 0]]), 'LAW: base taper 0.3, tip shape 3, squared end 1', { petalBaseTaper: 0.3, petalTipShape: 3, petalTipEnd: 1 }],
  ['sharp diamond', C([[0, 0.03], [0.4, 0.22], [0.45, 0.25], [0.5, 0.22], [1, 0]]), 'LAW: tapers 1 / 1.2, tip shape 1', { petalBaseTaper: 1, petalTipTaper: 1.2, petalTipShape: 1, petalWidth: 17 }],
];

function measure(extra, exportMode, infill = false) {
  const st = { ...DEFAULTS, ...extra, ...(infill ? { petalInfill: 'VORONOI' } : {}) };
  const acc = new G.MeshBuilder({ exportMode });
  const b = G.buildBloomInto(acc, st, { below: null });
  const p = b.petal;
  const { ring, slot } = firstSlot(st, new G.MeshBuilder({ exportMode }));
  const surf = G.petalSurface(st, ring, slot, null, new G.MeshBuilder({ exportMode }));
  const at = (u) => surf.profile.halfWidthAt(u), L = p.length;
  const stations = p.profileU.filter((u) => u > 0);
  const sag = sagittaOf(at, L, stations);
  const uni = sagittaOf(at, L, stations.map((_, i) => (i + 1) / stations.length));
  let turn = 0, turnU = 0;
  const xs = [0, ...stations].map((u) => [u * L, at(u)]);
  for (let i = 1; i < xs.length - 1; i++) {
    const a1 = Math.atan2(xs[i][1] - xs[i - 1][1], xs[i][0] - xs[i - 1][0]), a2 = Math.atan2(xs[i + 1][1] - xs[i][1], xs[i + 1][0] - xs[i][0]);
    const d = Math.abs(a2 - a1) * 180 / Math.PI;
    if (xs[i][0] / L > G.ROOT_BLEND_END && d > turn) { turn = d; turnU = xs[i][0] / L; }
  }
  const ap = p.tipCap.apex, inf = p.infill;
  return { tris: acc.triangleCount, rows: stations.length, L, asked: p.askedLength, sag, uni, turn, turnU, ap,
    infill: infill ? (inf ? `${inf.achieved ?? '?'} holes, ${inf.solid ?? '?'} solid${inf.refused ? `, REFUSED (${inf.refused})` : ''}` : 'no record') : null };
}
const f4 = (x) => (x < 0 ? '  n/a ' : x.toFixed(4));
const line = (r) => `rows ${r.rows} · chord error base ${f4(r.sag.zone.base)} middle ${f4(r.sag.zone.middle)} apex ${f4(r.sag.zone.apex)} mm (uniform: ${f4(r.uni.zone.base)} / ${f4(r.uni.zone.middle)} / ${f4(r.uni.zone.apex)}) · worst chord turn ${r.turn.toFixed(2)}° at u ${r.turnU.toFixed(3)} · drawn ${r.L.toFixed(3)} of ${r.asked.toFixed(3)} mm`
  + (r.ap.regime ? ` · nib ${r.ap.regime}, leaves at ${(2 * r.ap.startHalfMm).toFixed(2)} mm, corner ${r.ap.kinkDeg.toFixed(2)}°` : ` · nib ${r.ap.active ? 'petal plan' : 'INERT'}`) + ` · ${r.tris} tris`;

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const [name, curve, lawName, law] of SHAPES) {
    console.log(`\n== ${name}`);
    for (const ex of [false, true]) {
      const c = measure(curve, ex), l = measure(law, ex), ci = measure(curve, ex, true), li = measure(law, ex, true);
      console.log(`  ${ex ? 'EXPORT' : 'LIVE  '} CURVE ${line(c)}`);
      console.log(`         ${lawName}: ${line(l)}`);
      console.log(`         infill: CURVE ${ci.infill} (${ci.tris} tris) · LAW ${li.infill} (${li.tris} tris)`);
    }
  }
}
