/* ===================================================================
   bloom-infill-wall.mjs — THE IN-SHEET WALL BETWEEN TWO HOLES, ON THE SHIPPED
   PLAN (S4 of the Voronoi infill).

   ONE OWNER of the measure the combination gate's two infill pairs read, and
   the I family's I11. It is S2's acceptance quantity (`wallSurfaceMm` in
   tools/verify-bloom-infill-metric.mjs, which reads the PROTOTYPE's field)
   restated on the objects the SHIPPED builder produces, because the prototype
   is an instrument and the thing that ships is `petalInfillPlan`.

   WHY `measureWall`'s SELF CANNOT BE THE MEASURE HERE, MEASURED: on the
   combination gate's `self` the density is BIT-IDENTICALLY INERT — 1.238 /
   1.125 / 1.097 / 1.097 mm at cup 0 / 0.6 / 0.9 / 1.2 whatever the density
   (8, 16, 24 or 40), to the digit — because `self` is the sheet approaching
   ANOTHER PART OF ITSELF and the nearest such approach on a cupped or curled
   blade is at the margins and the tip, in material the cells never reach (the
   wall inset keeps INFILL_WALL_MM of sheet inside the outline). The hazard the
   port plan's §1 names is the MATERIAL BRIDGE BETWEEN TWO HOLES, which `self`
   is blind to by its own subject. CG1 refused both pairs, correctly.

   THE QUANTITY: over every pair of points on two different hole rims (or a
   hole rim against the outline) whose plan segment stays IN MATERIAL, the
   minimum LENGTH OF THAT SEGMENT ON THE SURFACE — the 3-D polyline through
   `surface.at(u, v)`, the same front door the emitter's `mapPlan` uses, at
   IN_SHEET_STEPS samples. A bridge measured in the plan would be S2's own
   defect (the plan millimetre that is 0.118 mm of material); a bridge
   measured as a 3-D chord would read a fold as a wall.

   ITS REFERENCE HAS A DIFFERENT OWNER FROM THE QUANTITY (the fourth durable
   rule): the plan's holes are laid out through `infillOffsetPlanMm` and the
   METRIC FIELD; this measure reads the surface DIRECTLY and never the field,
   so a field that lied about a millimetre would show here as a wall that is
   not one.

   WHAT IT DOES NOT COVER: one petal (the FIRST slot the whorl primitive
   emits), the mode asked for, and the plan as `petalInfillPlan` returns it —
   so a defect between the plan and the emitter is I5's (the mask) and I1's
   (the emitted rim), not this file's.
   =================================================================== */
import { firstSlot } from './bloom-first-slot.mjs';

export const RIM_STEP_MM = 0.15;
export const IN_SHEET_STEPS = 24;
export const REFINE_FACTOR = 16;

const hyp = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function densify(poly, step) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const n = Math.max(1, Math.ceil(hyp(a, b) / step));
    for (let k = 0; k < n; k++) out.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n });
  }
  return out;
}
function pointInPoly(x, y, poly) { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside; } return inside; }
function segsCross(a, b, c, d) {
  const o = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const o1 = o(a, b, c), o2 = o(a, b, d), o3 = o(c, d, a), o4 = o(c, d, b);
  return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0);
}
function hitsPoly(a, b, poly) { for (let i = 0; i < poly.length; i++) if (segsCross(a, b, poly[i], poly[(i + 1) % poly.length])) return true; return false; }
function inMaterial(a, b, holes) {
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  for (const h of holes) if (pointInPoly(m.x, m.y, h) || hitsPoly(a, b, h)) return false;
  return true;
}

/* The plan (the SHIPPED `petalInfillPlan`) and the surface for one state, the
   way tools/verify-bloom-infill.mjs builds them. */
export function infillPlanFor(G, DEFAULTS, set, exportMode = true, opts = null) {
  const st = { ...DEFAULTS, ...set, petalInfill: 'VORONOI' };
  for (const k of Object.keys(st)) if (typeof st[k] === 'string' && st[k] !== '' && !isNaN(Number(st[k]))) st[k] = Number(st[k]);
  const acc0 = new G.MeshBuilder({ exportMode });
  const { ring, slot } = firstSlot(st, acc0);
  const a = new G.MeshBuilder({ exportMode, captureGrid: true });
  const petal = G.buildPetalInto(a, st, ring, slot, null, true);
  const surface = G.petalSurface(st, ring, slot, null, acc0);
  const g = petal.grid[0];
  const panel = { rowFrom: g.rowFrom, rowTo: g.rowTo, label: g.label, spanAt: () => [-1, 1] };
  const plan = G.petalInfillPlan(surface, g.rows, panel, { density: st.infillDensity, passes: st.infillRelax, gamma: st.infillLaw, aniso: st.infillAniso, baseFrac: st.infillBase, ...(opts || null) });
  return { state: st, petal, surface, plan, acc: a };
}

/* THE IN-SHEET LENGTH of the plan segment A->B, on the surface. */
export function inSheetLenMm(surface, A, B, n = IN_SHEET_STEPS) {
  const L = surface.length;
  const at = (x, y) => { const u = Math.min(1, Math.max(0, x / L)); const hh = surface.profile.laminaHalfAt(u); const v = Math.max(-1, Math.min(1, hh > 1e-9 ? y / hh : 0)); return surface.at(u, v).P; };
  let s = 0, prev = at(A.x, A.y);
  for (let k = 1; k <= n; k++) { const p = at(A.x + (B.x - A.x) * k / n, A.y + (B.y - A.y) * k / n); s += Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]); prev = p; }
  return s;
}

/* THE WALL. `null` where the plan cut no hole (a refusal, or every cell solid). */
export function infillWallSurfaceMm(surface, plan, step = RIM_STEP_MM) {
  if (!plan || plan.refused || !plan.holes) return null;
  const holes = plan.holes.filter((h, i) => h && plan.cellOpen[i]);
  if (!holes.length) return null;
  const rim = []; holes.forEach((h, i) => densify(h, step).forEach((q) => rim.push({ q, h: i })));
  const other = rim.concat(densify(plan.outline, step).map((q) => ({ q, h: -1 })));
  let best = Infinity, pair = null, crossed = 0;
  for (const a of rim) {
    const near = other.filter((b) => b.h !== a.h).map((b) => ({ b, d: hyp(a.q, b.q) })).sort((x, y) => x.d - y.d).slice(0, 40);
    for (const { b } of near) {
      if (!inMaterial(a.q, b.q, holes)) { crossed++; continue; }
      const s = inSheetLenMm(surface, a.q, b.q);
      if (s < best) { best = s; pair = [a, b]; }
    }
  }
  if (!pair) return null;
  const coarse = best;
  /* THE LOCAL RE-WALK — a sampled minimum is biased HIGH by the step squared
     (S2's own finding, "ask the bias's size against the margin the clause
     has"), so the winning pair is re-sampled REFINE_FACTOR finer in a window
     of three coarse steps. */
  const win = 3 * step, fine = step / REFINE_FACTOR;
  const nearOf = (c) => { const o = []; for (const poly of holes.concat([plan.outline])) for (const q of densify(poly, fine)) if (hyp(q, c) <= win) o.push(q); return o; };
  const NA = nearOf(pair[0].q), NB = nearOf(pair[1].q);
  for (const a of NA) for (const b of NB) {
    if (hyp(a, b) > coarse + 2 * win) continue;
    if (!inMaterial(a, b, holes)) continue;
    const s = inSheetLenMm(surface, a, b);
    if (s < best) { best = s; pair = [{ q: a, h: pair[0].h }, { q: b, h: pair[1].h }]; }
  }
  return { mm: best, coarseMm: coarse, planMm: hyp(pair[0].q, pair[1].q), u: pair[0].q.x / surface.length,
    against: pair[1].h < 0 ? 'the outline' : `hole ${pair[1].h}`, holes: holes.length, rimPoints: rim.length, crossed };
}

/* The combination gate's entry: one state, EXPORT, the narrowest wall in mm. */
export function measureInfillWallMm(G, DEFAULTS, state) {
  const r = infillPlanFor(G, DEFAULTS, state, true);
  const w = infillWallSurfaceMm(r.surface, r.plan);
  if (!w) return { mm: Infinity, why: r.plan.refused ? `the plan refused (${r.plan.refused})` : 'the plan cut no hole' };
  return { mm: w.mm, at: { u: w.u, against: w.against }, holes: w.holes, planMm: w.planMm };
}
