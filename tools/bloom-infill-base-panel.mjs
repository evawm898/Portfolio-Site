/* ===================================================================
   bloom-infill-base-panel.mjs — THE SOLID BASE PANEL, AND THE BOUNDARY THAT SETS IT.
   AN INSTRUMENT, NOT WIRED TO ANY GATE. It changes nothing in the repository's
   geometry: it imports `bloom-geometry.js` and the SHIPPED `measureWall` from
   `tools/bloom-wall-thickness.mjs` unchanged, and drives
   `tools/bloom-voronoi-proto.mjs`'s salvage field.

     node tools/bloom-infill-base-panel.mjs [--json <file>] [--quick]
     node tools/bloom-infill-base-panel.mjs --control          (the must-fail)
     node tools/bloom-infill-base-panel.mjs --inert <base-tree> (the plan-capture control)

   WHY IT EXISTS. `docs/bloom-infill-base-boundary.md` (#250) measured the boundary
   as already at its floor and named the binding constraint: `measureWall`'s SELF
   reading on `SHIPPED roll 330`. It also recorded, in its own §2, that the wall
   instrument's twelve STATES carry NO INFILL — so the number pinning the boundary
   was measured on petals with no holes. This tool tests that directly, and it
   sweeps the boundary and the field's basal V TOGETHER, because each alone does
   nothing: lowering the boundary leaves the V converging the pattern out above it,
   and shallowing the V leaves the panel filling the bottom of the picture.

   THE THREE MEASUREMENTS.

   1. THE PANEL'S SHARE OF THE BLADE, per lattice station. The solid base panel is
      a function of the BOUNDARY ALONE — no grading moves a square millimetre of it —
      so its share is the number a reader should have before any grading table.

   2. THE BINDING CONSTRAINT, three ways.
      (a) #250's own truncation, re-run at EVERY lattice station rather than in
          two-row steps. Its published figures are reproduced where the two sweeps
          overlap, which is this section's validity anchor and has a different owner
          (the doc) from the quantity.
      (b) WHERE THE PAIR IS. `measureWall` reports the query point and not the far
          end; the far end is what every truncation argument turns on, so it is
          measured rather than inferred.
      (c) THE MASKED LATTICE — the measurement #250 could not make. The shipped
          56x10 lattice, which is the very grid `measureWall` reads, with every
          sample that falls inside a HOLE removed. WITH NO MASK IT IS `measureWall`,
          to the bit, on every state (V1 below asserts it); with the infill's mask it
          is the same question asked of the material an infilled petal actually
          leaves.

   3. THE GRID — boundary x basal V x base cell size, both walls, eight seeds, with
      the panel's share on every row.

   WHY THE MASKED LATTICE AND NOT THE EMITTED SHELL. Measured, and it is a property
   of the PROTOTYPE rather than of the idea: `cutThrough` tessellates a solid cell as
   a flat FAN over the whole cell polygon. A flat fan across a surface that wraps is a
   CHORD, so under `petalRoll` 330 — a near-closed quill — a cell's own facet cuts
   through the tube and a self-approach measured on those facets reads 0.0009 mm,
   which is the tessellation and not the sheet. The lattice follows the surface at
   exactly the fidelity `measureWall` already reads it at, so masking it measures the
   geometry and not the prototype's emitter.

   WHAT THE MASKED LATTICE DOES NOT COVER, stated rather than left to be found. It
   samples the SHIPPED LATTICE and nothing else, so the hole RIMS — new surface the
   infill adds, which no lattice station sits on — are not measured. A rim sits at a
   hole's edge, which is between two lattice samples; the sample just outside the hole
   is kept and stands for it. A rim-against-rim approach closer than the nearest
   lattice pair would not be seen here. That is the same blindness the shipped
   instrument has to anything off its own grid, inherited rather than introduced.

   THE MASK IS BRACKETED, NOT EXACT. A hole's boundary does not follow the lattice, so
   a quad straddling one is partly material. Both ends are reported: ANY-corner keeps
   the quad if any corner is material (more material, so the SAFE direction — it never
   claims a clearance the geometry does not have) and ALL-corner keeps it only if every
   corner is. The headline is ANY.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import * as G from '../bloom-geometry.js';
import { DEFAULTS } from '../bloom-registry.js';
import { firstSlot } from './bloom-first-slot.mjs';
import * as P from './bloom-voronoi-proto.mjs';
import { measureWall, STATES as WALL_STATES, SELF_XFAIL } from './bloom-wall-thickness.mjs';

const IS_MAIN = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const QUICK = process.argv.includes('--quick');

/* EIGHT SEEDS, ALWAYS — `SEED + i*131`, which is exactly the set `wholeBloom` gives
   the eight petals of the shipping whorl, so the sweep's population IS the bloom's. */
export const SEEDS = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => P.SEED + i * 131);
export const N_CELLS = 16;                 // the salvage doc's own reading of where this pattern reads best
export const WALLS = [1.0, 0.8];
export const FOOT_ROWS = 3;                // measureWall's own default, restated where it is used rather than imported as a magic number
const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const rng = (a) => [Math.min(...a), Math.max(...a)];
const n2 = (x, d = 2) => (x === null || x === undefined || !Number.isFinite(x) ? 'n/a' : x.toFixed(d));
const pct = (x) => `${(100 * x).toFixed(1)} %`;

/* ------------------------------------------------------------ the geometry rig */

/* Closest point on a triangle (Ericson's regions), returning the BARYCENTRIC weights
   as well as the distance — which is what lets a big triangle be indexed where it is
   actually nearest rather than at whichever corner happens to be its minimum. That
   distinction is not cosmetic: a solid cell's fan spans many lattice cells, and
   indexing it at a corner reads its own wall as a fold. */
export function closestOnTri(p, a, b, c) {
  const ab = [b[0]-a[0], b[1]-a[1], b[2]-a[2]], ac = [c[0]-a[0], c[1]-a[1], c[2]-a[2]], ap = [p[0]-a[0], p[1]-a[1], p[2]-a[2]];
  const d1 = ab[0]*ap[0]+ab[1]*ap[1]+ab[2]*ap[2], d2 = ac[0]*ap[0]+ac[1]*ap[1]+ac[2]*ap[2];
  if (d1 <= 0 && d2 <= 0) return { d: Math.hypot(ap[0], ap[1], ap[2]), w: [1, 0, 0] };
  const bp = [p[0]-b[0], p[1]-b[1], p[2]-b[2]];
  const d3 = ab[0]*bp[0]+ab[1]*bp[1]+ab[2]*bp[2], d4 = ac[0]*bp[0]+ac[1]*bp[1]+ac[2]*bp[2];
  if (d3 >= 0 && d4 <= d3) return { d: Math.hypot(bp[0], bp[1], bp[2]), w: [0, 1, 0] };
  const vc = d1*d4 - d3*d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const t = d1/(d1-d3); return { d: Math.hypot(p[0]-(a[0]+ab[0]*t), p[1]-(a[1]+ab[1]*t), p[2]-(a[2]+ab[2]*t)), w: [1-t, t, 0] }; }
  const cp = [p[0]-c[0], p[1]-c[1], p[2]-c[2]];
  const d5 = ab[0]*cp[0]+ab[1]*cp[1]+ab[2]*cp[2], d6 = ac[0]*cp[0]+ac[1]*cp[1]+ac[2]*cp[2];
  if (d6 >= 0 && d5 <= d6) return { d: Math.hypot(cp[0], cp[1], cp[2]), w: [0, 0, 1] };
  const vb = d5*d2 - d1*d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const t = d2/(d2-d6); return { d: Math.hypot(p[0]-(a[0]+ac[0]*t), p[1]-(a[1]+ac[1]*t), p[2]-(a[2]+ac[2]*t)), w: [1-t, 0, t] }; }
  const va = d3*d6 - d5*d4;
  if (va <= 0 && d4-d3 >= 0 && d5-d6 >= 0) { const t = (d4-d3)/((d4-d3)+(d5-d6)); return { d: Math.hypot(p[0]-(b[0]+(c[0]-b[0])*t), p[1]-(b[1]+(c[1]-b[1])*t), p[2]-(b[2]+(c[2]-b[2])*t)), w: [0, 1-t, t] }; }
  const den = 1/(va+vb+vc), v1 = vb*den, w1 = vc*den;
  return { d: Math.hypot(p[0]-(a[0]+ab[0]*v1+ac[0]*w1), p[1]-(a[1]+ab[1]*v1+ac[1]*w1), p[2]-(a[2]+ab[2]*v1+ac[2]*w1)), w: [1-v1-w1, v1, w1] };
}

/* Everything one STATE's petal needs, built once: the shipped captured grid, the two
   skins built exactly as `measureWall` builds them, the plan of every lattice sample,
   and the (row index, column index) of any plan point. */
export function rigFor(set) {
  const st = { ...DEFAULTS, ...set };
  const acc = new G.MeshBuilder({ exportMode: true, captureGrid: true });
  const { ring, slot } = firstSlot(st, acc);
  const p = G.buildPetalInto(acc, st, ring, slot, null, true);
  const surface = G.petalSurface(st, ring, slot, null, acc);
  const rows = p.grid.flatMap((pan) => pan.rows).filter((r) => r.row >= FOOT_ROWS);
  const NV = rows[0].v.length;
  const L = surface.length, hAt = (u) => surface.profile.halfWidthAt(u);
  const stations = rows.map((r) => r.u);
  const iOf = (u) => { if (u <= stations[0]) return 0; for (let k = 0; k + 1 < stations.length; k++) if (u <= stations[k + 1]) return k + (u - stations[k]) / (stations[k + 1] - stations[k]); return stations.length - 1; };
  const idx = (x, y) => { const u = Math.min(1, Math.max(0, x / L)); const h = hAt(u); return [iOf(u), ((h > 1e-9 ? Math.max(-1, Math.min(1, y / h)) : 0) + 1) / 2 * (NV - 1)]; };
  const skin = (s) => rows.map((r) => r.mid.map((Q, j) => [Q[0] + s*r.normal[j][0]*r.thickness/2, Q[1] + s*r.normal[j][1]*r.thickness/2, Q[2] + s*r.normal[j][2]*r.thickness/2]));
  const plan = (i, j) => [rows[i].u * L, rows[i].v[j] * hAt(rows[i].u)];
  return { st, grid: p.grid, rows, NV, L, hAt, idx, plan, T: skin(+1), B: skin(-1), shipped: measureWall(p.grid) };
}

/* THE RULE, STATED ONCE. A top-skin point's nearest bottom-skin triangle more than
   `near` lattice cells away in EITHER index is a SELF approach; anything within is the
   WALL under it. On the lattice the indices are integers and this IS `measureWall`'s
   own rule — V1 asserts that as an identity rather than a tolerance. `isMat` is what
   an infill does to it. */
export function approachMasked(R, isMat = () => true, quadKeep = 'any', near = 2) {
  const { T, B, NV, plan, idx } = R;
  const tops = [], tris = [];
  for (let i = 0; i < T.length; i++) for (let j = 0; j < NV; j++) if (isMat(i, j)) tops.push({ P: T[i][j], i, j });
  for (let i = 0; i < B.length - 1; i++) for (let j = 0; j < NV - 1; j++) {
    const c = [isMat(i, j), isMat(i, j+1), isMat(i+1, j+1), isMat(i+1, j)];
    if (!(quadKeep === 'all' ? c.every(Boolean) : c.some(Boolean))) continue;
    tris.push({ a: B[i][j], b: B[i][j+1], c: B[i+1][j+1], pa: plan(i, j), pb: plan(i, j+1), pc: plan(i+1, j+1) });
    tris.push({ a: B[i][j], b: B[i+1][j+1], c: B[i+1][j], pa: plan(i, j), pb: plan(i+1, j+1), pc: plan(i+1, j) });
  }
  let wall = Infinity, self = Infinity, sq = null, sp = null;
  for (const q of tops) for (const tr of tris) {
    const r = closestOnTri(q.P, tr.a, tr.b, tr.c);
    if (r.d >= wall && r.d >= self) continue;
    const x = r.w[0]*tr.pa[0] + r.w[1]*tr.pb[0] + r.w[2]*tr.pc[0], y = r.w[0]*tr.pa[1] + r.w[1]*tr.pb[1] + r.w[2]*tr.pc[1];
    const [ci, cj] = idx(x, y);
    if (Math.abs(ci - q.i) <= near && Math.abs(cj - q.j) <= near) { if (r.d < wall) wall = r.d; }
    else if (r.d < self) { self = r.d; sq = q; sp = [x, y]; }
  }
  return { wall, self, sq, sp, tops: tops.length, tris: tris.length, samples: T.length * NV };
}

/* WHERE THE PAIR IS — both ends, in the lattice's own indices. `measureWall` reports the
   query point alone, and every truncation argument turns on the FAR end. */
export function selfPair(R, near = 2) {
  const { T, B, NV } = R;
  let self = Infinity, q = null, cell = null;
  for (let i = 0; i < T.length; i++) for (let j = 0; j < NV; j++) {
    for (let a = 0; a < B.length - 1; a++) for (let b = 0; b < NV - 1; b++) {
      if (Math.abs(a - i) <= near && Math.abs(b - j) <= near) continue;
      for (const tr of [[B[a][b], B[a][b+1], B[a+1][b+1]], [B[a][b], B[a+1][b+1], B[a+1][b]]]) {
        const d = closestOnTri(T[i][j], tr[0], tr[1], tr[2]).d;
        if (d < self) { self = d; q = [i, j]; cell = [a, b]; }
      }
    }
  }
  return { self, queryRow: q[0], queryCol: q[1], queryU: R.rows[q[0]].u, queryV: R.rows[q[0]].v[q[1]],
    cellRow: cell[0], cellCol: cell[1], cellULo: R.rows[cell[0]].u, cellUHi: R.rows[cell[0] + 1].u,
    cellVLo: R.rows[cell[0]].v[cell[1]], cellVHi: R.rows[cell[0]].v[cell[1] + 1] };
}

const pointInPoly = (x, y, poly) => { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside; } return inside; };

/* ----------------------------------------------------------- the panel's share */

/* The blade's own plan area, and the share of it the SOLID BASE PANEL holds. The panel
   is a function of the BOUNDARY ALONE — the grading moves none of it — which is why it
   is computed here from the outline rather than read off a field. */
export function areaU(hAt, L, uLo, uHi, n = 20000) { let s = 0; for (let i = 0; i < n; i++) { const a = uLo + ((uHi - uLo) * i) / n, b = uLo + ((uHi - uLo) * (i + 1)) / n; s += (hAt(a) + hAt(b)) * (b - a) * L; } return s; }

export function panelShare(ctx, mSplit) {
  const hAt = (u) => ctx.surface.profile.halfWidthAt(u), L = ctx.L;
  const uPanel = ctx.rows[mSplit].u, uOv = ctx.rows[mSplit - 1].u;
  const blade = areaU(hAt, L, 0, 1);
  return { mSplit, uPanel, uOv, blade, panel: areaU(hAt, L, 0, uPanel), lamina: areaU(hAt, L, uOv, 1),
    share: areaU(hAt, L, 0, uPanel) / blade };
}

/* --------------------------------------------------------------- the sweep */

/* ONE (boundary, grading, wall) STATE over all eight seeds. `bottom45` is the number
   this session is about: the fraction of the blade's own bottom 45 % that is SOLID —
   the base panel and the pattern's wall together, which is what the eye reads as "a
   lot of solid area" and what no grading-only table can report, because the panel is
   outside every grading band. */
export const BOTTOM_BAND_TOP = 0.45;       // the same top `bloom-voronoi-proto.mjs` already calls the basal band's
export function gridState(ctx, target, opts, wall, seeds = SEEDS) {
  const hAtX = (x) => ctx.surface.profile.halfWidthAt(Math.min(1, Math.max(0, x / ctx.L)));
  const xBot = BOTTOM_BAND_TOP * ctx.L;
  const laminaBot = P.laminaAreaX(hAtX, 0, xBot);
  const share0 = { blade: areaU((u) => ctx.surface.profile.halfWidthAt(u), ctx.L, 0, 1) };          /* the OUTLINE's own integral, so a band holding no cell reads 100 % solid rather than dividing by nothing */
  const per = seeds.map((seed) => {
    const F = P.fieldSalvage(ctx, N_CELLS, { ...opts, u0: target, seed });
    const m = P.measure(ctx, F, wall);                     /* the census, the bands and the caps — the proto's own */
    const r = P.cutThrough(ctx, F, wall);                  /* the hole polygons, which `measure` does not return */
    let open = 0; for (const hh of r.holes) { const cl = P.clipBandX(hh, 0, xBot); if (cl) open += P.polyArea(cl); }
    let openAll = 0; for (const hh of r.holes) openAll += P.polyArea(hh);
    return { F, m, bottom45Solid: 1 - open / laminaBot, bladeOpen: openAll / share0.blade };
  });
  const m = per.map((p) => p.m), F0 = per[0].F;
  const pick = (f) => m.map(f);
  const share = panelShare(ctx, F0.mSplit);
  return {
    target, opts, wall, mSplit: F0.mSplit, uPanel: share.uPanel, uOv: share.uOv,
    panelMm2: share.panel, bladeMm2: share.blade, panelShare: share.share,
    lowestHoleU: med(pick((x) => x.lowestHoleU ?? 1)), lowestHoleURange: rng(pick((x) => x.lowestHoleU ?? 1)),
    basalWall: med(pick((x) => x.basal.wallFraction)), basalWallRange: rng(pick((x) => x.basal.wallFraction)),
    basalHoles: med(pick((x) => x.basal.holes)), basalReal: med(pick((x) => x.basal.real)),
    basalEdgeRangeMm: med(pick((x) => x.basal.edgeRangeMm)), basalOnLine: med(pick((x) => x.basal.onLine)),
    bottom45Solid: med(per.map((p) => p.bottom45Solid)), bottom45SolidRange: rng(per.map((p) => p.bottom45Solid)),
    bladeOpen: med(per.map((p) => p.bladeOpen)),
    laminaWall: med(pick((x) => x.wallFraction)),
    real: med(pick((x) => x.real)), holeMin: Math.min(...pick((x) => x.holeMin)), holeMedian: med(pick((x) => x.holeMedian)),
    tipReal: med(pick((x) => x.tip.real)), tipMedian: med(pick((x) => x.tip.medianOpen)), capMm: med(pick((x) => x.capMm)),
    tris: med(pick((x) => x.tris)),
    boundary: rng(pick((x) => x.boundary)), nonManifold: rng(pick((x) => x.nonManifold)),
    shells: rng(pick((x) => x.shells)), voxel06: rng(pick((x) => x.voxel06)), voxel03: rng(pick((x) => x.voxel03)),
    clean: m.every((x) => x.boundary === 0 && x.shells === 1 && x.voxel06 === 1 && x.voxel03 === 1),
  };
}

/* THE INFILLED STATE'S OWN READING. The shipped lattice, masked by the holes the field
   at THIS boundary leaves, through the rule above. */
export function infilledWall(R, ctx, target, opts, wall, seed, quadKeep = 'any') {
  const F = P.fieldSalvage(ctx, N_CELLS, { ...opts, u0: target, seed });
  const r = P.cutThrough(ctx, F, wall);
  const panelTopX = ctx.rows[F.mSplit].u * R.L;
  const isMat = (i, j) => { const [x, y] = R.plan(i, j); if (x <= panelTopX + 1e-9) return true; for (const hh of r.holes) if (pointInPoly(x, y, hh)) return false; return true; };
  const a = approachMasked(R, isMat, quadKeep);
  return { ...a, mSplit: F.mSplit, uPanel: ctx.rows[F.mSplit].u, holes: r.holes.length };
}

/* ------------------------------------------------------------------ controls */

/* V1 — THE IDENTITY. With nothing masked, `approachMasked` must reproduce the SHIPPED
   `measureWall` exactly on every state. It is an IDENTITY and not a tolerance: the two
   read the same lattice through the same rule, and on the lattice the fractional indices
   are integers. A residual here means the rule has stopped being measureWall's, and every
   masked number below would be a different instrument's. */
export function v1(states) {
  const out = [];
  for (const s of states) {
    const R = rigFor(s.set);
    const a = approachMasked(R);
    out.push({ id: s.id, label: s.label, shippedWall: R.shipped.wall, shippedSelf: R.shipped.self,
      ruleWall: a.wall, ruleSelf: a.self, dWall: a.wall - R.shipped.wall, dSelf: a.self - R.shipped.self,
      exact: Object.is(a.wall, R.shipped.wall) && Object.is(a.self, R.shipped.self) });
  }
  return out;
}

async function control() {
  /* THE MUST-FAIL. Three claims, each broken on purpose, each required to be SEEN to
     break — a check that has never been observed failing is a hope. */
  let bad = 0;
  const st = WALL_STATES.filter((s) => ['flat', 'roll-max'].includes(s.id));
  /* C1: the identity is not vacuous — widen the rule's neighbourhood and it must move. */
  const R = rigFor({ petalRoll: 330 });
  const ok = approachMasked(R), wide = approachMasked(R, () => true, 'any', 6);
  console.log(`C1  the identity can fail: near=2 self ${ok.self.toFixed(6)} (= measureWall ${R.shipped.self.toFixed(6)}), near=6 self ${wide.self.toFixed(6)} — ${wide.self !== ok.self ? 'MOVED' : '**DID NOT MOVE**'}`);
  if (wide.self === ok.self) bad++;
  /* C2: the mask is reached — an infilled state must remove samples, or every masked
     reading below is the unmasked one wearing a label. */
  const ctx = P.context({ petalRoll: 330 });
  const m = infilledWall(R, ctx, P.U0, {}, 1.0, P.SEED);
  console.log(`C2  the mask is reached: ${m.samples - m.tops} of ${m.samples} lattice samples removed by the holes — ${m.tops < m.samples ? 'REACHED' : '**NOT REACHED**'}`);
  if (!(m.tops < m.samples)) bad++;
  /* C3: the truncation reproduces #250's own published figures, which have a different
     owner from this tool. */
  const rows = ctx.rows;
  const want = [[19, 0.6974, 0.6586], [16, 0.6974, 0.6941], [14, 0.7010, 0.7216], [12, 0.7403, 1.5441], [10, 0.8348, 1.5441], [8, 0.9749, 1.5441], [6, 1.1172, 1.5501]];
  let c3 = true;
  for (const [ms, w, s] of want) {
    const t = measureWall([{ rows: rows.slice(0, ms + 1) }]);
    const okk = Math.abs(t.wall - w) < 5e-5 && Math.abs(t.self - s) < 5e-5;
    if (!okk) { c3 = false; console.log(`     mSplit ${ms}: read ${t.wall.toFixed(4)}/${t.self.toFixed(4)}, #250 published ${w}/${s}  **DISAGREES**`); }
  }
  console.log(`C3  #250's published truncation table, all seven rows, reproduced: ${c3 ? 'YES' : '**NO**'}`);
  if (!c3) bad++;
  /* C4: masking everything above the panel and TRUNCATING to it must hand the measurement
     the SAME query points and the SAME candidate triangles — which is what ties 2c to 2a.
     It is asserted on the SETS and not on the answer, because the two differ in one thing
     V1 already characterises: `measureWall` calls a triangle "the wall" by its LOWER corner
     and the rule here by its CLOSEST POINT. On the whole grid the two agree to the bit on
     every state (V1); on a truncated strip they need not, and the residual is REPORTED here
     rather than folded into a tolerance. */
  let c4 = true;
  for (const ms of [19, 16, 12]) {
    const panelTopX = rows[ms].u * R.L;
    const a = approachMasked(R, (i, j) => R.plan(i, j)[0] <= panelTopX + 1e-9, 'all');
    const t = measureWall([{ rows: rows.slice(0, ms + 1) }]);
    const wantTops = t.rows * t.columns, wantTris = (t.rows - 1) * (t.columns - 1) * 2;
    const okk = a.tops === wantTops && a.tris === wantTris;
    if (!okk) c4 = false;
    console.log(`     mSplit ${ms}: ${a.tops}/${a.tris} points/triangles against truncation's ${wantTops}/${wantTris} ${okk ? '=' : '**DIFFER**'}  | self ${a.self.toFixed(6)} against ${t.self.toFixed(6)} (residual ${(a.self - t.self).toExponential(2)} — the lower-corner/closest-point difference, V1's subject)`);
  }
  console.log(`C4  masking everything above the panel gives truncation's own sets, on three boundaries: ${c4 ? 'YES' : '**NO**'}`);
  if (!c4) bad++;
  console.log(bad === 0 ? 'PASS' : `FAIL — ${bad} control(s) did not behave`);
  if (bad) process.exit(1);
}

/* THE PLAN-CAPTURE INERTNESS CONTROL. `cutThrough` gained an optional `capturePlan`;
   at its default nothing about the emitted stream may move. */
async function inert(baseDir) {
  const B = await import(pathToFileURL(path.resolve(baseDir, 'tools/bloom-voronoi-proto.mjs')).href);
  const ctx = P.context({}), cB = B.context({});
  let floats = 0, diffs = 0, states = 0;
  for (const wall of WALLS) for (const seed of SEEDS) {
    const a = P.cutThrough(ctx, P.fieldSalvage(ctx, N_CELLS, { u0: P.U0, seed }), wall).acc.pos;
    const b = B.cutThrough(cB, B.fieldSalvage(cB, N_CELLS, { u0: B.U0, seed }), wall).acc.pos;
    states++;
    if (a.length !== b.length) { diffs += Math.max(a.length, b.length); floats += Math.max(a.length, b.length); continue; }
    floats += a.length; for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) diffs++;
  }
  console.log(`INERT AT THE DEFAULT: ${diffs} of ${floats.toLocaleString('en-US')} floats differ over ${states} states (${SEEDS.length} seeds x ${WALLS.length} walls), head against ${baseDir}, Object.is.`);
  const F = P.fieldSalvage(ctx, N_CELLS, { u0: P.U0, seed: SEEDS[0] });
  const withPlan = P.cutThrough(ctx, F, 1.0, { capturePlan: true });
  const without = P.cutThrough(ctx, F, 1.0);
  let d2 = 0; for (let i = 0; i < without.acc.pos.length; i++) if (!Object.is(withPlan.acc.pos[i], without.acc.pos[i])) d2++;
  const reached = withPlan.canon instanceof Map && withPlan.canon.size > 0 && without.canon === undefined;
  console.log(`CONTROL (capturePlan on against off, same field): ${d2} of ${without.acc.pos.length.toLocaleString('en-US')} floats differ, canon returned only when asked (${withPlan.canon.size} entries against ${without.canon === undefined ? 'absent' : '**present**'}) — the option is REACHED and moves nothing.`);
  const ok = diffs === 0 && d2 === 0 && reached;
  console.log(ok ? 'PASS' : 'FAIL');
  if (!ok) process.exit(1);
}

/* ------------------------------------------------------------------- main */

const baseTree = IS_MAIN ? arg('--inert', null) : null;
if (!IS_MAIN) { /* imported — export the machinery and run nothing (bloom-basal-grading's own rule) */ }
else if (process.argv.includes('--control')) { await control(); }
else if (baseTree) { await inert(baseTree); }
else {
  const ctx = P.context({});
  const hAt = (u) => ctx.surface.profile.halfWidthAt(u);
  const out = { petal: { L: ctx.L, sheet: ctx.t, plainTris: ctx.plainTris, N: N_CELLS, seeds: SEEDS, blade: areaU(hAt, ctx.L, 0, 1) },
    shipped: { u0: P.basalSplit(ctx, {}) !== null ? ctx.rows[P.basalSplit(ctx, {})].u : null, laminaFloorU: P.laminaFloorU(ctx), rootBlendEnd: P.U0, converge: P.CONVERGE_FRACTION, baseNarrow: P.BASE_NARROWING, baseReach: P.BASE_REACH, tipGamma: P.TIP_GAMMA },
    panel: [], truncation: [], pairs: [], v1: [], masked: [], grid: [] };
  console.log(`default petal ${ctx.L} mm long, sheet ${ctx.t} mm, EXPORT mode; ${N_CELLS} cells; ${SEEDS.length} seeds.`);
  console.log(`the blade's plan area is ${out.petal.blade.toFixed(1)} mm2. THIS TOOL'S TABLES SWEEP THE BOUNDARY EXPLICITLY and are unchanged; the shipped boundary is no longer ROOT_BLEND_END (${P.U0}) but the derived lamina floor — row ${P.basalSplit(ctx, {})}, u ${ctx.rows[P.basalSplit(ctx, {})].u.toFixed(7)}, floor u ${P.laminaFloorU(ctx).toFixed(7)}. See docs/bloom-infill-lamina-floor.md.\n`);

  /* ---- 1. the panel's share, per lattice station ---- */
  console.log('1. THE SOLID BASE PANEL, PER BOUNDARY. A function of the BOUNDARY ALONE — no grading moves a square millimetre of it.');
  console.log('   `target` snaps to a row: the split is a row index. `panel to u` is the last row the base lattice emits; `cells from u` is where the field starts (one row of overlap).');
  console.log('mSplit | target u   | panel to u | cells from u | panel mm2 | % of blade | lamina mm2');
  const STATION_LO = QUICK ? 14 : 4, STATION_HI = 22;
  for (let m = STATION_LO; m <= STATION_HI; m++) {
    const s = panelShare(ctx, m);
    out.panel.push({ ...s });
    console.log(`${String(m).padStart(6)} | ${ctx.rows[m].u.toFixed(6)} | ${s.uPanel.toFixed(6)} | ${s.uOv.toFixed(6)} | ${s.panel.toFixed(2).padStart(9)} | ${(100 * s.share).toFixed(2).padStart(10)} | ${s.lamina.toFixed(2)}`);
  }

  /* ---- 2a. #250's truncation, at EVERY station ---- */
  console.log('\n2a. THE BINDING CONSTRAINT — #250\'s OWN TRUNCATION, RE-RUN AT EVERY LATTICE STATION.');
  console.log('    #250 stepped about two rows at a time and reported that the next boundary down from the shipped one moves SELF by +0.0354 mm.');
  console.log('    Its own figures are reproduced where the two sweeps overlap (the --control asserts all seven); what it did not run is every station between.');
  const rigRoll = rigFor({ petalRoll: 330 });
  const fullRoll = rigRoll.shipped;
  /* THE TRUNCATION MUST BE OF THE ROLLED PETAL'S OWN GRID, and the boundary stations must
     be the SAME stations the flat petal's `panelShare` is computed on. The ladder reads the
     outline law and the buckle and not the roll, so they are — asserted rather than assumed,
     because a station list that quietly diverged would put every row of this table against
     the wrong boundary. */
  const rollRows = rigRoll.grid.flatMap((pan) => pan.rows);
  if (rollRows.length !== ctx.rows.length || rollRows.some((r, k) => !Object.is(r.u, ctx.rows[k].u))) {
    console.error('the rolled petal\'s station list differs from the flat one — the boundary column of this table would name a different row'); process.exit(1);
  }
  console.log(`    roll 330, whole blade: wall ${fullRoll.wall.toFixed(4)} @u ${fullRoll.wallAt[0].toFixed(6)}   self ${fullRoll.self.toFixed(4)} @u ${fullRoll.selfAt[0].toFixed(6)}`);
  console.log('mSplit | panel to u | % of blade | wall   | d(wall) | self   | d(self)  | reproduces both');
  for (let m = STATION_LO; m <= STATION_HI; m++) {
    const t = measureWall([{ rows: rollRows.slice(0, m + 1) }]);
    const s = panelShare(ctx, m);
    const dw = t.wall - fullRoll.wall, ds = t.self - fullRoll.self;
    const rec = { mSplit: m, uPanel: s.uPanel, share: s.share, wall: t.wall, self: t.self, dWall: dw, dSelf: ds, exact: dw === 0 && ds === 0 };
    out.truncation.push(rec);
    console.log(`${String(m).padStart(6)} | ${s.uPanel.toFixed(6)} | ${(100 * s.share).toFixed(2).padStart(10)} | ${t.wall.toFixed(4)} | ${(dw >= 0 ? '+' : '')}${dw.toFixed(4)} | ${t.self.toFixed(4)} | ${(ds >= 0 ? '+' : '')}${ds.toFixed(4)} | ${rec.exact ? 'YES' : 'no'}`);
  }

  /* ---- 2b. where the pair is ---- */
  console.log('\n2b. WHERE EACH SELF PAIR IS — BOTH ENDS. `measureWall` reports the query point alone; the FAR END is what every truncation argument turns on, so it is measured here rather than inferred.');
  console.log('state           | self mm | query (u, v)          | partner cell (u range, v range)');
  const PAIR_STATES = QUICK ? WALL_STATES.filter((s) => s.id === 'roll-max') : WALL_STATES.filter((s) => ['flat', 'cup-max', 'roll-max', 'twist-max', 'form-max', 'buckle-on-form'].includes(s.id));
  for (const s of PAIR_STATES) {
    const R = rigFor(s.set);
    const pr = selfPair(R);
    out.pairs.push({ id: s.id, label: s.label, ...pr });
    console.log(`${s.id.padEnd(15)} | ${pr.self.toFixed(4)}  | (${pr.queryU.toFixed(6)}, ${pr.queryV.toFixed(3)}) | (${pr.cellULo.toFixed(6)} .. ${pr.cellUHi.toFixed(6)}, ${pr.cellVLo.toFixed(3)} .. ${pr.cellVHi.toFixed(3)})`);
  }

  /* ---- V1 and 2c ---- */
  console.log('\nV1. THE IDENTITY, PER STATE — with NOTHING masked, does the rule below reproduce the SHIPPED `measureWall` to the bit?');
  console.log('    It is not one identity over every state and it is not asserted as one. The two rules differ in ONE thing: `measureWall` calls a');
  console.log('    triangle "the wall under this point" by its LOWER CORNER\'s lattice index, and the rule here by its CLOSEST POINT\'s. They agree');
  console.log('    whenever the minimising contact is at a corner and can disagree when it is in a triangle\'s interior — measured, in BOTH directions.');
  console.log('    The shipped rule is the bar; where the two agree, a masked reading is directly comparable to it, and where they do not, the masked');
  console.log('    reading is compared against THIS rule\'s own plain reading instead and the row says so.');
  const v1r = v1(PAIR_STATES); out.v1 = v1r;
  for (const r of v1r) console.log(`    ${r.id.padEnd(15)} shipped ${r.shippedWall.toFixed(6)} / ${r.shippedSelf.toFixed(6)}  rule ${r.ruleWall.toFixed(6)} / ${r.ruleSelf.toFixed(6)}  ${r.exact ? 'EXACT — comparable to the shipped bar' : `differs by ${r.dWall.toExponential(2)} / ${r.dSelf.toExponential(2)} — the rule\'s own reading is this state\'s reference`}`);
  const exactIds = new Set(v1r.filter((r) => r.exact).map((r) => r.id));
  /* THE ONE STATE THIS SESSION\'S ARGUMENT RESTS ON. 2a, 2b and 2c are all about
     `roll-max` — #250 named it the binding constraint — so a residual THERE would make
     every figure in 2c a different instrument\'s and the section could not be read against
     `SELF_XFAIL`\'s own number. It is asserted, and C1 is what shows the assertion can fail. */
  if (!exactIds.has('roll-max')) { console.error('\nV1 FAILED ON roll-max — the state this whole section is about. Its masked readings could not be read against SELF_XFAIL\'s bar, so nothing below is reported.'); process.exit(1); }
  if (exactIds.size === 0) { console.error('\nV1 FAILED ON EVERY STATE — the rule is nobody\'s measureWall. Nothing below is reported.'); process.exit(1); }
  console.log(`    V1: ${exactIds.size} of ${v1r.length} states EXACT, roll-max among them (asserted — it is what 2a, 2b and 2c are about).`);
  console.log(`    For the record, SELF_XFAIL declares roll-max at ${SELF_XFAIL['roll-max'].selfMm} mm and this tree reads ${v1r.find((r) => r.id === 'roll-max').shippedSelf.toFixed(3)}.`);

  console.log('\n2c. THE INFILLED STATE\'S OWN READING — the measurement #250 could not make. The shipped lattice with every sample inside a HOLE removed,');
  console.log('    at each boundary, over eight seeds, both quad rules. `plain` is this rule\'s own unmasked reading (= measureWall where V1 is EXACT).');
  console.log('    `worst` is the SMALLEST self-approach any seed reads — the safe direction. A reading ABOVE plain means the infill removed the fold\'s own material.');
  const BOUNDS = QUICK ? [19, 16] : [19, 18, 17, 16, 14, 12, 10, 8, 6, 5];
  const maskWalls = QUICK ? [1.0] : WALLS;
  console.log('state           | V1 | wall | mSplit | panel to u | plain self | ANY worst/median | ALL worst | vs plain | samples removed');
  for (const st of PAIR_STATES) {
    const R = rigFor(st.set);
    const cx = P.context(st.set);
    const plainRule = approachMasked(R);
    for (const w of maskWalls) for (const m of BOUNDS) {
      const target = cx.rows[m].u;
      const any = SEEDS.map((sd) => infilledWall(R, cx, target, {}, w, sd, 'any'));
      const all = SEEDS.map((sd) => infilledWall(R, cx, target, {}, w, sd, 'all'));
      const aS = any.map((x) => x.self), lS = all.map((x) => x.self);
      const rec = { id: st.id, v1Exact: exactIds.has(st.id), wall: w, mSplit: any[0].mSplit, uPanel: any[0].uPanel,
        panelShare: panelShare(ctx, any[0].mSplit).share,
        plainSelf: plainRule.self, plainWall: plainRule.wall, shippedSelf: R.shipped.self,
        anyWorst: Math.min(...aS), anyMedian: med(aS), allWorst: Math.min(...lS),
        anyWallWorst: Math.min(...any.map((x) => x.wall)), removed: med(any.map((x) => x.samples - x.tops)), samples: any[0].samples };
      out.masked.push(rec);
      const d = rec.anyWorst - rec.plainSelf;
      console.log(`${st.id.padEnd(15)} | ${rec.v1Exact ? '= ' : '~ '} | ${w.toFixed(1)}  | ${String(rec.mSplit).padStart(6)} | ${rec.uPanel.toFixed(6)} | ${rec.plainSelf.toFixed(4)}     | ${rec.anyWorst.toFixed(4)} / ${rec.anyMedian.toFixed(4)}  | ${rec.allWorst.toFixed(4)}    | ${(d >= 0 ? '+' : '')}${d.toFixed(4)}  | ${rec.removed} of ${rec.samples}`);
    }
  }
  { const worst = out.masked.filter((r) => r.anyWorst < r.plainSelf - 1e-9);
    console.log(`\n    ROWS WHERE THE INFILLED SHEET COMES CLOSER TO ITSELF THAN THE PLAIN ONE: ${worst.length} of ${out.masked.length}${worst.length ? ' — ' + worst.map((r) => `${r.id} w${r.wall} mSplit ${r.mSplit} (${(r.anyWorst - r.plainSelf).toFixed(4)} mm)`).join(', ') : '. None: on the material the shipped lattice samples, the infill never brings the sheet closer to itself at any boundary tested.'}`); }

  /* ---- 3. the grid ---- */
  console.log('\n3. THE GRID — BOUNDARY x BASAL V x BASE CELL SIZE, both walls, eight seeds. The two levers moved TOGETHER, because each alone does nothing.');
  console.log('   `panel %` is the base panel as a fraction of the BLADE and is a function of the boundary alone. `bottom 45 % solid` is the fraction of the blade\'s own bottom 45 % that is SOLID — the panel AND the pattern\'s wall together, which is what the eye reads.');
  const GB = QUICK ? [19, 14] : [19, 18, 16, 14, 12, 10];
  const GV = QUICK ? [0.10] : [0.100, 0.050, 0.025, 0.000];
  const GN = QUICK ? [0.75] : [0.75, 1.50];
  const gWalls = QUICK ? [1.0] : WALLS;
  console.log('bnd u    | panel % | V     | base | wall | lowest hole u | basal wall | bottom 45 % solid | blade open | real | tip real/med | cap  | tris  | census');
  for (const w of gWalls) for (const m of GB) for (const c of GV) for (const b of GN) {
    const s = gridState(ctx, ctx.rows[m].u, { converge: c, baseNarrow: b }, w);
    out.grid.push(s);
    console.log(`${s.uPanel.toFixed(4)}   | ${(100 * s.panelShare).toFixed(1).padStart(7)} | ${c.toFixed(3)} | ${b.toFixed(2)} | ${w.toFixed(1)}  | ${s.lowestHoleU.toFixed(4)}        | ${(100 * s.basalWall).toFixed(1).padStart(9)}% | ${(100 * s.bottom45Solid).toFixed(1).padStart(16)}% | ${(100 * s.bladeOpen).toFixed(1).padStart(9)}% | ${String(s.real).padStart(4)} | ${String(s.tipReal).padStart(3)}/${n2(s.tipMedian)} | ${n2(s.capMm)} | ${String(s.tris).padStart(5)} | ${s.clean ? 'CLEAN' : '**NOT CLEAN**'} b${s.boundary[1]} nm${s.nonManifold[1]} sh${s.shells[0]}-${s.shells[1]} vx${s.voxel06[1]}/${s.voxel03[1]}`);
  }

  const jf = arg('--json', null);
  if (jf) { fs.writeFileSync(jf, JSON.stringify(out, null, 1)); console.log(`\njson: ${jf}`); }
}
