/* ===================================================================
   bloom-texture-bone2.js — BONE v2: FINER, ROUNDER, DEEPER PORES. PROTOTYPE.

   NOT SHIPPED, AND IT TOUCHES NO SHIPPED FILE. Read
   docs/bloom-surface-texture-bone-v2.md before changing anything here.

   Eva's verdict on BONE v1 (#470): too macro and not deep enough — pores read
   as rounded SQUARES (the 0.4 mm lattice shows through at ~5 edges a 2 mm
   pore), too large, and shallow. Her rulings of Nov 1 (in force here):
     - pores 0.5-1.5 mm, plus a NESTED band of small pits inside pore floors;
       the pore-size slider's minimum is 0.5 mm (UNVALIDATED: a blind pit this
       small may trap SLS powder);
     - STEEPER WALLS + TALLER MAX: cup-shaped pits, depth comparable to the
       diameter; the height's maximum ~2.5 mm, its minimum still 0.4;
     - refinement ONLY inside porous patches (where curvature mask x patch
       field > 0), derived from pore size, never a typed edge;
     - a HYPOTHESIS TO TEST, not adopt: mesh each pore with its own rings of
       vertices about its centre (PORE-CONFORMING) against a finer regular
       grid (GRID). Eva rules.
   Outward only, pore floors on the original sheet, never below.

   THIS MODULE IS THREE THINGS, ONE OWNER EACH:
     (1) `bone2Params(state)` — the controls as the prototype reads them
         (ranges and defaults are PROPOSALS for Eva, §9 of the doc);
     (2) `bone2Field(params)` — the field: `F(p, n)` in [0, 1] (1 the network
         top, 0 the deepest floor, on the original sheet), and `poresNear` —
         the SAME pore list the field is built from, for the pore-conforming
         mesher (one generator, two readers: a mesher that rebuilt the pores
         would agree with a broken field by being broken alongside it);
     (3) the two refiners over a welded triangle mesh with per-vertex
         attributes: `gridRefine` (longest-edge bisection, conforming by
         construction) and `poreConformingMesh` (rings about each pore centre
         plus a network fill, Delaunay-triangulated in a 2D chart). The grid
         runs on any organ; the rings need a near-isometric 2D chart and run
         here on charted domains only (a plate, a cylinder patch) — porting
         them to the generator's organs is §6 of the doc.

   ENGINE AGREEMENT: the field is products, floor, an integer hash, sqrt and
   division only (no sin/cos/atan2/hypot), the shipped field's own discipline
   (X0 compares Chromium against Node at 8 ulp). The ring angles in the
   pore-conforming mesher DO use cos/sin: that mesher is a prototype on a
   charted domain and is never compared across engines.
   =================================================================== */

/* ---------------------------------------------------------- controls --- */
/* PROPOSED (Eva's to rule, the doc's §9). The pore-size slider is the
   SMALLEST pore's diameter, as v1's was; the spread is largest / smallest.
   The defaults draw the ruled 0.5-1.5 mm. */
export const B2_PORE_RANGE = Object.freeze([0.5, 1.0]);
export const B2_PORE_DEFAULT = 0.5;
export const B2_SPREAD_RANGE = Object.freeze([1.5, 3]);
export const B2_SPREAD_DEFAULT = 3;
/* the height: minimum 0.4 (Q13, unchanged); maximum 2.5 (the ruling's ~2.5 —
   the doc's §3 derives what "depth comparable to diameter" gives, and it is
   NOT 2.5 for the ruled pores: it is a question) */
export const B2_HEIGHT_RANGE = Object.freeze([0.4, 2.5]);
/* RULED (Nov 1, round 2): the maximum IS 2.5 mm (depth up to ~3.4x the
   diameter at the smallest pores). It has never been printed, and a blind pit
   that deep may keep its powder — the slider's help text must say so, word for
   word what a shipping registry row carries: */
export const B2_HEIGHT_HELP = 'Relief height, 0.4 to 2.5 mm. Above about 1.5 mm the smallest pores become blind wells up to 3.4 times deeper than they are wide: UNVALIDATED for powder removal (nothing this deep has been printed).';
export const B2_HEIGHT_DEFAULT = 0.4;
export const B2_DENSITY_DEFAULT = 0.9;

/* ------------------------------------------------- the look's constants */
/* PROVISIONAL, like v1's: tuned on renders, none decides a count. */
export const B2_BANDS = 3;                       // log-spaced size bands between D and spread x D
export const B2_CELL_K = 1.0;                   // a band's cell, in its own LARGEST sphere diameters
export const B2_BAND_OCC = Object.freeze([1, 1, 1]);   // the candidates' occupancy per band (x density); the packing thins them
export const B2_ADMIT_FULL = 0.85;               // a sphere's cut is a full pore while its disc is at least this of the sphere's radius ...
export const B2_ADMIT_ZERO = 0.70;               // ... and no pore under this (a barely-cut cap is no pore)
export const B2_CUP_M = 3;                       // the cup: a superellipse 1 - (1 - u^m)^(1/m) — flat floor, steep wall
export const B2_LIP_K = 0.5;                     // the lip's smooth-minimum radius (height fraction)
export const B2_LIP_SLOPE = 3.5;                 // the cup carried past its rim, so the smooth minimum rounds the lip
export const B2_NEST_P = 0.55;                   // a pore large enough carries nested pits with this chance
export const B2_NEST_FRAC = 0.32;                // a nested pit's diameter, of its pore's
export const B2_NEST_MIN_MM = 0.25;              // no nested pit under this (UNVALIDATED; SLS resolves ~0.35-0.4)
export const B2_NEST_SHELF = 0.4;                // a pore with nested pits floors at this fraction of its depth
export const B2_NEST_FLOOR_U = 0.55;             // nested pits sit inside this fraction of the pore's radius
export const B2_SEED = 23;
/* HARD-CORE: a pore is kept only if no pore of higher priority (a hash, so the
   size mix is untouched) comes within (1 + B2_WALL_K) x the sum of their radii
   — Matérn's type II, a local rule over the pore's own neighbours, so it is a
   pure function of position (no order, no state). It is what leaves a WALL
   between every two pores (the references' thin rounded walls) and what lets a
   pore carry its own rings: 0.2 keeps the lip's outermost ring (1.15 R) of
   two neighbours apart. */
export const B2_WALL_K = 0.2;

/* the controls as read, clamped and said */
export function bone2Params(state = {}) {
  const clamp = (x, r) => (x < r[0] ? r[0] : x > r[1] ? r[1] : x);
  const num = (k, d) => { const v = Number(state[k]); return Number.isFinite(v) ? v : d; };
  const D = clamp(num('bonePoreSize', B2_PORE_DEFAULT), B2_PORE_RANGE);
  const spread = clamp(num('boneBandRatio', B2_SPREAD_DEFAULT), B2_SPREAD_RANGE);
  const H = clamp(num('textureHeight', B2_HEIGHT_DEFAULT), B2_HEIGHT_RANGE);
  const density = clamp(num('bonePoreDensity', B2_DENSITY_DEFAULT), [0.2, 1]);
  return { D, spread, Dmax: D * spread, H, density, packing: state.bone2Packing === 'hardcore' || state.bone2Packing === 'overlap' ? state.bone2Packing : B2_PACKING };
}

import { hybridOrganMesh, organDiscs, HYBRID_LAYOUTS } from './.bone2-mutant-refinement-leaks-into-smooth-areas-3670-hybrid.mjs';

/* ------------------------------------------------------------- hashing --- */
function hash3(x, y, z, s) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + s * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return h >>> 0;
}
const u10 = (h, k) => ((h >>> (10 * k)) & 1023) / 1023;
/* the polynomial smooth minimum — engine-exact */
function smin(a, b, k) {
  const m = a < b ? a : b;
  const h = k - (a > b ? a - b : b - a);
  return h > 0 ? m - (h * h) / (4 * k) : m;
}

/* ---------------------------------------------------------- the profile */
/* THE CUP, in its own normalised radius u = r / R: 0 at the centre, 1 at the
   rim, a superellipse — flat floor, steep wall (vertical at the rim before
   the lip rounds it). Past the rim it is carried on up at a fixed slope, so
   the smooth minimum against the network's top ROUNDS THE LIP rather than
   leaving a knife edge. */
export function bone2Cup(u) {
  if (u >= 1) return 1 + B2_LIP_SLOPE * (u - 1);
  const w = 1 - u * u * u;          // CUP_M = 3, written out: no Math.pow
  return 1 - Math.cbrt(w);
}
/* the radius (in u) at which the lip-rounded profile crosses a level — for
   the instruments (the drawn mid-wall must sit here) */
export function bone2LevelU(level, shelf = 0) {
  let lo = 0, hi = 1.5;
  const at = (u) => { const c = shelf + (1 - shelf) * bone2Cup(u); return smin(1, c, B2_LIP_K); };
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (at(m) < level) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

/* ------------------------------------------------------------ the field --- */
/* The pores are SPHERES of the world (attachment B), packed HARD-CORE: per
   band a jittered cell lattice holds B2_CANDIDATES candidate spheres a cell
   (radius drawn log-uniform in the band's slice), and a candidate SURVIVES iff
   no SURVIVING candidate of higher priority (a hash) overlaps it within
   (1 + B2_WALL_K) x the sum of their radii — random sequential packing,
   decided locally by recursion up the priority chain (a pure function of
   position: no order, no state). Disjoint balls cut any surface in disjoint
   discs, so every surface carries pores that keep a WALL between them — the
   references' thin rounded walls — and every pore is one disc the ring mesher
   can lay its own rings in. (Merging is given up for it: the doc's §2 and
   question 4.)
   A surface meets a sphere in a disc of radius rho = sqrt(S^2 - d^2), d the
   centre's distance from the surface (read along the query's own normal); the
   cup is laid on THAT disc, so a pore is cup-shaped however the surface cuts
   it. A cut is ADMITTED fully while rho >= B2_ADMIT_FULL x S, fades to nothing
   at B2_ADMIT_ZERO x S (a shallower pore), and a barely-cut cap is no pore —
   so no surface carries a sliver pit under the ruled size. Its depth is the
   whole relief H times its admission (its deepest point on the original sheet);
   one with nested pits floors on a SHELF at B2_NEST_SHELF of that depth and
   its pits go the rest of the way. */
/* PACKING: 'overlap' (pores merge where they meet, v1's ruling) or 'hardcore'
   (a wall between every two; sparse — the doc's §2) */
export const B2_PACKING = 'overlap';
export const B2_CANDIDATES = 1;
/* a shrunk sphere is kept down to this of the smallest drawn (its fully
   admitted cut is then still at least the ruled smallest pore x this) */
export const B2_SHRINK_FLOOR = 1.0;
export function bone2Field(params, seed = B2_SEED) {
  const { D, spread, density } = params;
  /* the sphere radii: a FULLY admitted cut is at least the asked smallest pore */
  const Smin = D / 2 / B2_ADMIT_FULL, Smax = (spread * D) / 2;
  const bands = [];
  for (let b = 0; b < B2_BANDS; b++) {
    const lo = Smin * Math.exp(Math.log(Smax / Smin) * (b / B2_BANDS)), hi = Smin * Math.exp(Math.log(Smax / Smin) * ((b + 1) / B2_BANDS));
    bands.push({ b, lo, hi, cell: 2 * B2_CELL_K * hi, occK: Math.floor(B2_BAND_OCC[b] * density * 1024), s: seed + 31 * b });
  }
  const SmaxAll = bands[bands.length - 1].hi;
  /* the candidates of a cell — ONE OWNER of a pore */
  const candMemo = new Map();
  const cands = (band, cx, cy, cz) => {
    const mk = (((band.b * 20011 + cx + 10000) * 20011 + cy + 10000) * 20011 + cz + 10000);
    let list = candMemo.get(mk);
    if (list) return list;
    list = [];
    const c = band.cell;
    for (let m = 0; m < B2_CANDIDATES; m++) {
      const h = hash3(cx + 7919 * m, cy, cz, band.s);
      if ((h & 1023) >= band.occK) continue;
      const h2 = hash3(cx + 7919 * m, cy, cz, band.s + 7), h3 = hash3(cx + 7919 * m, cy, cz, band.s + 13);
      const S = band.lo * Math.exp(Math.log(band.hi / band.lo) * u10(h, 1));
      const pore = { band: band.b, key: `${band.b}:${cx},${cy},${cz}:${m}`, centre: [(cx + u10(h2, 0)) * c, (cy + u10(h2, 1)) * c, (cz + u10(h2, 2)) * c], S, S0: S, R: S, D: 2 * S, nested: [], priority: hash3(cx + 7919 * m, cy, cz, band.s + 59) };
      const dn = B2_NEST_FRAC * 2 * S;
      if (dn >= B2_NEST_MIN_MM && u10(h3, 0) < B2_NEST_P) {
        const count = 1 + (u10(h3, 1) < 0.35 ? 1 : 0);
        for (let k = 0; k < count; k++) {
          const hk = hash3(cx + 17 * k + 7919 * m, cy, cz, band.s + 41);
          const rr = (dn / 2) * (0.85 + 0.3 * u10(hk, 2));
          let ox = u10(hk, 0) * 2 - 1, oy = u10(hk, 1) * 2 - 1;
          const L2 = ox * ox + oy * oy;
          if (L2 > 1) { const L = Math.sqrt(L2); ox /= L; oy /= L; }
          /* the offset is a FRACTION of the room on the disc's floor, laid at
             query time on the cut disc's own radius */
          pore.nested.push({ fx: ox, fy: oy, fr: rr / S });
        }
      }
      list.push(pore);
    }
    if (candMemo.size > 3000000) { candMemo.clear(); alive.clear(); }
    candMemo.set(mk, list);
    return list;
  };
  /* survival: a candidate keeps its radius if no SURVIVING candidate of higher
     priority comes within the hard core; otherwise it SHRINKS to fit beside
     them (so the packing fills its gaps with smaller pores, as bone does) and
     dies only if that leaves it under the smallest sphere. `S` is the size
     the survivor is built at (the drawn size is `S0`). */
  const alive = new Map();
  const survives = (p) => {
    if (params.packing === 'overlap') return true;
    let v = alive.get(p.key);
    if (v !== undefined) return v;
    let S = p.S0;
    for (const b2 of bands) {
      const c = b2.cell, reach = (1 + B2_WALL_K) * (p.S0 + b2.hi);
      const x0 = Math.floor((p.centre[0] - reach) / c), x1 = Math.floor((p.centre[0] + reach) / c);
      const y0 = Math.floor((p.centre[1] - reach) / c), y1 = Math.floor((p.centre[1] + reach) / c);
      const z0 = Math.floor((p.centre[2] - reach) / c), z1 = Math.floor((p.centre[2] + reach) / c);
      for (let zi = z0; zi <= z1; zi++) for (let yi = y0; yi <= y1; yi++) for (let xi = x0; xi <= x1; xi++) for (const q of cands(b2, xi, yi, zi)) {
        if (q === p || q.priority < p.priority || (q.priority === p.priority && q.key <= p.key)) continue;
        const dx = q.centre[0] - p.centre[0], dy = q.centre[1] - p.centre[1], dz = q.centre[2] - p.centre[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist >= (1 + B2_WALL_K) * (S + q.S0)) continue;   // clear even of q at its largest
        if (!survives(q)) continue;
        const fit = dist / (1 + B2_WALL_K) - q.S;
        if (fit < S) S = fit;
      }
    }
    v = S >= Smin * B2_SHRINK_FLOOR;
    if (v) { p.S = S; p.R = S; p.D = 2 * S; }
    alive.set(p.key, v);
    return v;
  };
  /* the cut: the disc a surface through p with normal n meets this sphere in,
     and its admission */
  const cut = (pore, p, n) => {
    const d = [p[0] - pore.centre[0], p[1] - pore.centre[1], p[2] - pore.centre[2]];
    const dn = d[0] * n[0] + d[1] * n[1] + d[2] * n[2];
    const rho2 = pore.S * pore.S - dn * dn;
    if (!(rho2 > 0)) return null;
    const rho = Math.sqrt(rho2), k = rho / pore.S;
    if (k <= B2_ADMIT_ZERO) return null;
    let a = 1;
    if (k < B2_ADMIT_FULL) { const t = (k - B2_ADMIT_ZERO) / (B2_ADMIT_FULL - B2_ADMIT_ZERO); a = t * t * (3 - 2 * t); }
    return { d, dn, rho, a };
  };
  const admission = (pore, p, n) => { const c = cut(pore, p, n); return c ? c.a : 0; };
  /* a tangent frame at n — one owner (no trigonometry) */
  const frame = (n) => {
    const ax = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    let t1 = [ax[1] * n[2] - ax[2] * n[1], ax[2] * n[0] - ax[0] * n[2], ax[0] * n[1] - ax[1] * n[0]];
    const L = Math.sqrt(t1[0] * t1[0] + t1[1] * t1[1] + t1[2] * t1[2]);
    t1 = [t1[0] / L, t1[1] / L, t1[2] / L];
    const t2 = [n[1] * t1[2] - n[2] * t1[1], n[2] * t1[0] - n[0] * t1[2], n[0] * t1[1] - n[1] * t1[0]];
    return { t1, t2 };
  };
  /* a nested pit's centre (offset from the cut disc's centre, in the tangent
     frame) and radius, on a disc of radius rho */
  const nestedOn = (q, rho) => { const r = q.fr * rho; const room = Math.max(0, B2_NEST_FLOOR_U * rho - r); return { ox: q.fx * room, oy: q.fy * room, R: r }; };
  const lipReach = 1 + B2_LIP_K / B2_LIP_SLOPE + 0.01;
  /* every surviving pore whose sphere reaches p */
  const each = (p, fn) => {
    for (const band of bands) {
      const c = band.cell, reach = band.hi * lipReach;
      const x0 = Math.floor((p[0] - reach) / c), x1 = Math.floor((p[0] + reach) / c);
      const y0 = Math.floor((p[1] - reach) / c), y1 = Math.floor((p[1] + reach) / c);
      const z0 = Math.floor((p[2] - reach) / c), z1 = Math.floor((p[2] + reach) / c);
      for (let zi = z0; zi <= z1; zi++) for (let yi = y0; yi <= y1; yi++) for (let xi = x0; xi <= x1; xi++) for (const q of cands(band, xi, yi, zi)) {
        const dx = p[0] - q.centre[0], dy = p[1] - q.centre[1], dz = p[2] - q.centre[2];
        if (dx * dx + dy * dy + dz * dz > (q.S * lipReach) ** 2) continue;
        if (survives(q)) fn(q);
      }
    }
  };
  /* THE FIELD. F in [0, 1]: 1 the network's top, 0 the deepest floor */
  const F = (p, n) => {
    let v = 1;
    let fr = null;
    each(p, (pore) => {
      const c = cut(pore, p, n);
      if (!c) return;
      const { d, dn, rho, a } = c;
      const tx = d[0] - dn * n[0], ty = d[1] - dn * n[1], tz = d[2] - dn * n[2];
      const u = Math.sqrt(tx * tx + ty * ty + tz * tz) / rho;
      if (u > lipReach) return;
      const floor = 1 - a;                                   // a fully admitted pore floors on the sheet
      const shelf = pore.nested.length ? floor + a * B2_NEST_SHELF : floor;
      v = smin(v, shelf + (1 - shelf) * bone2Cup(u), B2_LIP_K);
      if (pore.nested.length && u < B2_NEST_FLOOR_U + 0.05) {
        if (!fr) fr = frame(n);
        for (const q0 of pore.nested) {
          const q = nestedOn(q0, rho);
          const ex = tx - (q.ox * fr.t1[0] + q.oy * fr.t2[0]), ey = ty - (q.ox * fr.t1[1] + q.oy * fr.t2[1]), ez = tz - (q.ox * fr.t1[2] + q.oy * fr.t2[2]);
          const un = Math.sqrt(ex * ex + ey * ey + ez * ez) / q.R;
          v = smin(v, floor + (shelf - floor) * bone2Cup(un), B2_LIP_K * (shelf - floor));
        }
      }
    });
    return v < 0 ? 0 : v > 1 ? 1 : v;
  };
  /* THE SAME PORES, for the ring mesher and the instruments: every surviving
     pore whose sphere reaches a box */
  const poresIn = (lo, hi) => {
    const out = [];
    for (const band of bands) {
      const c = band.cell, r = band.hi;
      for (let zi = Math.floor((lo[2] - r) / c); zi <= Math.floor((hi[2] + r) / c); zi++)
        for (let yi = Math.floor((lo[1] - r) / c); yi <= Math.floor((hi[1] + r) / c); yi++)
          for (let xi = Math.floor((lo[0] - r) / c); xi <= Math.floor((hi[0] + r) / c); xi++)
            for (const q of cands(band, xi, yi, zi)) if (survives(q)) out.push(q);
    }
    return out;
  };
  /* the cut disc of a pore on a surface through p with normal n, for a mesher:
     its centre on the surface, its radius, its admission, its nested pits */
  const discOf = (pore, p, n) => {
    const c = cut(pore, p, n);
    if (!c) return null;
    const centre = [pore.centre[0] + c.dn * n[0], pore.centre[1] + c.dn * n[1], pore.centre[2] + c.dn * n[2]];
    return { centre, rho: c.rho, a: c.a, nested: pore.nested.map((q) => nestedOn(q, c.rho)) };
  };
  void SmaxAll;
  return { F, poresIn, admission, discOf, frame, bands, params, survives };
}

/* ------------------------------------------- THE DERIVED EDGES (§4) --- */
/* THE LIP'S DRAWN WIDTH, from the profile alone: the radial distance (in u)
   over which the lip-rounded wall climbs from 20% to 80% of the relief. The
   wall is what the eye reads as the pore's edge, so a mesh must put vertices
   ACROSS it: the GRID's edge is half of it at the SMALLEST pore (v1's own
   "the rim spans at least two edges", applied to the steeper v2 wall), and
   the RINGS' radii are laid at the profile's own breakpoints. */
export function bone2WallU() { return bone2LevelU(0.8) - bone2LevelU(0.2); }
export const B2_GRID_WALL_EDGES = 2;
export function bone2GridEdgeMm(params) {
  const Rmin = params.D / 2;
  return (bone2WallU() * Rmin) / B2_GRID_WALL_EDGES;
}
/* the rings: the profile's breakpoints in u (the floor, the wall, the lip),
   and the sides of a ring — the arc between two ring vertices at the rim at
   most B2_RING_ARC_K of the pore's own radius, never under B2_RING_MIN */
export const B2_RING_LAYOUTS = Object.freeze({
  /* FULL: the profile's breakpoints (floor, wall, lip, lip-out), 16 sides —
     a 16-gon's sagitta is 1.9% of its radius */
  full: Object.freeze({ u: Object.freeze([0.45, 0.75, 0.9, 0.97, 1.0, 1.07, 1.15]), sides: 16, nestedU: Object.freeze([0.45, 0.75, 0.9, 1.0, 1.1]), nestedSides: 12 }),
  /* LEAN: the fewest that keep the wall and the lip — 12 sides (3.4%) */
  lean: Object.freeze({ u: Object.freeze([0.6, 0.92, 1.0, 1.07, 1.15]), sides: 12, nestedU: Object.freeze([0.6, 1.0, 1.1]), nestedSides: 10 }),
});
export const B2_RING_U = B2_RING_LAYOUTS.full.u;
export function bone2RingSides(Rmm, nested = false, layout = 'full') { const L = B2_RING_LAYOUTS[layout]; return nested ? L.nestedSides : L.sides; }
/* the network between pores: the plateau and its saddles; the edge is the
   lip's own drawn width at the LARGEST pore (the network carries no feature
   finer than a lip, and the rings carry the lips) */
export function bone2NetworkEdgeMm(params) { return Math.max(bone2WallU() * (params.D / 2), 0.08); }

/* ================================================= THE GRID REFINER --- */
/* LONGEST-EDGE BISECTION, CONFORMING BY CONSTRUCTION. Input: a welded mesh
   (P flat xyz, tri indices) with per-vertex attribute arrays (each `dim`
   numbers per vertex, interpolated linearly — normals, weights), a per-
   triangle `porous` flag and the edge target `e`.
   - An edge is SPLIT iff it belongs to a porous triangle and is longer than
     e — at its MIDPOINT, memoised on the edge's two vertex ids, so the two
     triangles that share it insert the SAME vertex (no crack, no T-junction).
   - A porous triangle is bisected on its longest edge until every edge is at
     most e; a sub-edge is then split iff it is longer than e, whichever
     triangle reaches it first (the argument is in the doc's §4: an edge
     longer than e is the longest edge of some descendant of every triangle
     that carries it, so it is always bisected, and always at its midpoint).
   - A NON-porous triangle that carries a split edge is fanned from its own
     centroid over its boundary points, so it meets its porous neighbour
     exactly and is refined nowhere else.
   Refinement therefore reaches only porous triangles and the one row of
   their neighbours that must close against them (a transition fan). */
export function gridRefine(P, tri, attrs, porous, e) {
  const Pn = P.slice();
  const A = attrs.map((a) => ({ dim: a.dim, v: a.v.slice() }));
  const nV0 = P.length / 3;
  const mid = new Map();
  const marked = new Set();
  const ek = (a, b) => (a < b ? a * 4294967296 + b : b * 4294967296 + a);
  for (let t = 0; t < tri.length / 3; t++) if (porous[t]) for (let c = 0; c < 3; c++) marked.add(ek(tri[t * 3 + c], tri[t * 3 + (c + 1) % 3]));
  const len = (a, b) => { const dx = Pn[a * 3] - Pn[b * 3], dy = Pn[a * 3 + 1] - Pn[b * 3 + 1], dz = Pn[a * 3 + 2] - Pn[b * 3 + 2]; return Math.sqrt(dx * dx + dy * dy + dz * dz); };
  const midOf = (a, b) => {
    const k = ek(a, b);
    let m = mid.get(k);
    if (m !== undefined) return m;
    m = Pn.length / 3;
    for (let k3 = 0; k3 < 3; k3++) Pn.push((Pn[a * 3 + k3] + Pn[b * 3 + k3]) / 2);
    for (const at of A) for (let d = 0; d < at.dim; d++) at.v.push((at.v[a * at.dim + d] + at.v[b * at.dim + d]) / 2);
    mid.set(k, m);
    return m;
  };
  const out = [];
  const parent = [];   // per output triangle: its source triangle
  const bisect = (a, b, c, src, depth) => {
    const lab = len(a, b), lbc = len(b, c), lca = len(c, a);
    const L = Math.max(lab, lbc, lca);
    if (!(L > e) || depth > 40) { out.push(a, b, c); parent.push(src); return; }
    if (lab === L) { const m = midOf(a, b); bisect(a, m, c, src, depth + 1); bisect(m, b, c, src, depth + 1); }
    else if (lbc === L) { const m = midOf(b, c); bisect(a, b, m, src, depth + 1); bisect(a, m, c, src, depth + 1); }
    else { const m = midOf(c, a); bisect(a, b, m, src, depth + 1); bisect(m, b, c, src, depth + 1); }
  };
  /* the points a marked edge carries, a -> b, by the same recursion */
  const edgePts = (a, b, acc) => { if (!(len(a, b) > e)) return; const m = midOf(a, b); edgePts(a, m, acc); acc.push(m); edgePts(m, b, acc); };
  let transition = 0;
  for (let t = 0; t < tri.length / 3; t++) {
    const a = tri[t * 3], b = tri[t * 3 + 1], c = tri[t * 3 + 2];
    { bisect(a, b, c, t, 0); continue; }
    const ring = [];
    let extra = false;
    for (const [u, v] of [[a, b], [b, c], [c, a]]) {
      ring.push(u);
      if (marked.has(ek(u, v))) { const pts = []; edgePts(u, v, pts); if (pts.length) extra = true; ring.push(...pts); }
    }
    if (!extra) { out.push(a, b, c); parent.push(t); continue; }
    transition++;
    const g = Pn.length / 3;
    for (let k3 = 0; k3 < 3; k3++) Pn.push((Pn[a * 3 + k3] + Pn[b * 3 + k3] + Pn[c * 3 + k3]) / 3);
    for (const at of A) for (let d = 0; d < at.dim; d++) at.v.push((at.v[a * at.dim + d] + at.v[b * at.dim + d] + at.v[c * at.dim + d]) / 3);
    for (let i = 0; i < ring.length; i++) { out.push(ring[i], ring[(i + 1) % ring.length], g); parent.push(t); }
  }
  return { P: Pn, tri: out, attrs: A, parent, nV0, transition };
}

/* ======================================== DELAUNAY (Bowyer-Watson) --- */
/* Incremental, with adjacency and a walking point location, the points
   inserted in a snake order of a coarse grid so every walk is short. For the
   pore-conforming mesher's 2D charts; the rings are STAGGERED by half a side
   between consecutive radii so no four points are co-circular by
   construction. Returns triangles (CCW) not touching the super-triangle. */
export function delaunay2(xy) {
  const n = xy.length / 2;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) { const x = xy[i * 2], y = xy[i * 2 + 1]; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  const dx = maxX - minX, dy = maxY - minY, dmax = Math.max(dx, dy) || 1, mx = (minX + maxX) / 2, my = (minY + maxY) / 2;
  const X = new Float64Array(n + 3), Y = new Float64Array(n + 3);
  for (let i = 0; i < n; i++) { X[i] = xy[i * 2]; Y[i] = xy[i * 2 + 1]; }
  /* the super-triangle is FAR (2000x the extent): a finite one can make a
     convex-hull edge non-Delaunay against its own vertices, and the edge is then
     lost with the triangles that touch them — measured, 6 of a hole's 92
     lattice edges on a sparse window at 20x (Gabriel edges, no point inside
     their diametral circles). Doubles keep the predicates exact enough here:
     the squared terms reach ~1e9 against details of ~1e-2. */
  const SK = 2000;
  X[n] = mx - SK * dmax; Y[n] = my - SK * dmax; X[n + 1] = mx + SK * dmax; Y[n + 1] = my - SK * dmax; X[n + 2] = mx; Y[n + 2] = my + SK * dmax;   // CCW
  /* triangles: v (3 per), nb (3 per: the neighbour opposite vertex k), alive */
  let V = [n, n + 1, n + 2], NB = [-1, -1, -1], alive = [1];
  const orient = (a, b, c) => (X[b] - X[a]) * (Y[c] - Y[a]) - (Y[b] - Y[a]) * (X[c] - X[a]);
  const inCirc = (t, px, py) => {
    const a = V[t * 3], b = V[t * 3 + 1], c = V[t * 3 + 2];
    const ax = X[a] - px, ay = Y[a] - py, bx = X[b] - px, by = Y[b] - py, cx = X[c] - px, cy = Y[c] - py;
    return (ax * ax + ay * ay) * (bx * cy - cx * by) - (bx * bx + by * by) * (ax * cy - cx * ay) + (cx * cx + cy * cy) * (ax * by - bx * ay) > 0;
  };
  /* insertion order: a snake over a grid of ~sqrt(n) cells */
  const G = Math.max(1, Math.round(Math.sqrt(n / 4)));
  const order = Array.from({ length: n }, (_, i) => i);
  const cellOf = (i) => { const gx = Math.min(G - 1, Math.floor(((X[i] - minX) / (dx || 1)) * G)), gy = Math.min(G - 1, Math.floor(((Y[i] - minY) / (dy || 1)) * G)); return gy * G + (gy % 2 ? G - 1 - gx : gx); };
  const ck = order.map(cellOf);
  order.sort((a, b) => ck[a] - ck[b] || a - b);
  let last = 0;
  for (const p of order) {
    const px = X[p], py = Y[p];
    /* walk to a triangle containing p */
    let t = last, steps = 0;
    if (!alive[t]) { t = alive.lastIndexOf(1); }
    for (;;) {
      if (++steps > 4 * alive.length + 100) { t = -1; break; }
      let moved = false;
      for (let k = 0; k < 3; k++) {
        const a = V[t * 3 + (k + 1) % 3], b = V[t * 3 + (k + 2) % 3];
        if ((X[b] - X[a]) * (py - Y[a]) - (Y[b] - Y[a]) * (px - X[a]) < 0) { const q = NB[t * 3 + k]; if (q >= 0) { t = q; moved = true; break; } }
      }
      if (!moved) break;
    }
    if (t < 0) { for (let s = 0; s < alive.length; s++) if (alive[s]) { let ins = true; for (let k = 0; k < 3; k++) { const a = V[s * 3 + (k + 1) % 3], b = V[s * 3 + (k + 2) % 3]; if ((X[b] - X[a]) * (py - Y[a]) - (Y[b] - Y[a]) * (px - X[a]) < 0) { ins = false; break; } } if (ins) { t = s; break; } } }
    /* the cavity: connected triangles whose circumcircle holds p */
    const cav = [t], inCav = new Set([t]);
    for (let i = 0; i < cav.length; i++) {
      const s = cav[i];
      for (let k = 0; k < 3; k++) { const q = NB[s * 3 + k]; if (q >= 0 && !inCav.has(q) && inCirc(q, px, py)) { inCav.add(q); cav.push(q); } }
    }
    /* its boundary edges, CCW, with the outside neighbour */
    const edges = [];
    for (const s of cav) for (let k = 0; k < 3; k++) {
      const q = NB[s * 3 + k];
      if (q >= 0 && inCav.has(q)) continue;
      edges.push([V[s * 3 + (k + 1) % 3], V[s * 3 + (k + 2) % 3], q, s, k]);
    }
    for (const s of cav) alive[s] = 0;
    const startEdge = new Map();
    const made = [];
    for (const [a, b, q, s, k] of edges) {
      const id = alive.length;
      V.push(a, b, p); NB.push(-1, -1, q); alive.push(1);
      if (q >= 0) for (let kk = 0; kk < 3; kk++) if (NB[q * 3 + kk] === s) { NB[q * 3 + kk] = id; break; }
      startEdge.set(a, id);
      made.push(id);
    }
    /* link the fan: triangle (a, b, p): opposite a is the edge (b, p) shared with the triangle starting at b */
    for (const id of made) {
      const a = V[id * 3], b = V[id * 3 + 1];
      const nbB = startEdge.get(b);            // the triangle (b, c, p): shares (b, p)
      NB[id * 3] = nbB;
      if (nbB !== undefined) NB[nbB * 3 + 1] = id;   // opposite its vertex b... (b,c,p): opposite c is (p, b)
    }
    last = made[0];
  }
  const out = [];
  for (let t = 0; t < alive.length; t++) if (alive[t]) { const a = V[t * 3], b = V[t * 3 + 1], c = V[t * 3 + 2]; if (a >= n || b >= n || c >= n) continue; if (orient(a, b, c) > 0) out.push(a, b, c); else out.push(a, c, b); }
  return out;
}

/* ===================================== THE PATCHED COPY OF THE GEOMETRY --- */
/* The shipped bloom-geometry.js is read as TEXT and five anchored edits are
   applied to a COPY in memory (each anchor must match exactly once, or the
   load refuses — the T2 lattice lab's discipline). The shipped module is never
   written. The edits:
     1  the hook's slot, before the first import;
     2  the height's range to [0.4, 2.5] (the ruling) and 3 the pore range to
        [0.5, 4] (the slider minimum the ruling sets; v1 clamps to its 2.0);
     4  the field: BONE's `f` is the v2 field when the hook is on (v1's
        otherwise — so the copy with the hook OFF is v1 to the byte, which
        `bone2Bloom(..., { mode: 'v1' })` relies on);
     5  the relief pass hands the v2 field each vertex's own normal, and its
        WRITE stage defers to the hook (the refinement), after the masks and
        the derived owner have been decided on the shipped lattice. */
export const BONE2_EDITS = Object.freeze([
  ['hook-slot', "import { curveSamples,", "let __B2 = null;\nexport function __setBone2(x) { __B2 = x; }\nimport { curveSamples,"],
  ['height-range', 'export const TEXTURE_HEIGHT_RANGE = Object.freeze([0.4, 1.5]);', 'export const TEXTURE_HEIGHT_RANGE = Object.freeze([0.4, 2.5]);'],
  ['pore-range', 'export const BONE_PORE_RANGE = Object.freeze([BONE_PORE_FLOOR_MM, 4]);', 'export const BONE_PORE_RANGE = Object.freeze([0.5, 4]);'],
  ['field', 'f: refused ? null : boneField(b.pore, b.ratio, b.density), mp:', 'f: refused ? null : (__B2 && __B2.field ? __B2.field(state, heightMm) : boneField(b.pore, b.ratio, b.density)), mp:'],
  ['field-normal', '      const f = T.f(q);\n', '      const f = T.f(q, [O.N[i * 3], O.N[i * 3 + 1], O.N[i * 3 + 2]]);\n'],
  ['write-hook', '  /* ---- write, and the records ---- */\n', '  if (__B2 && __B2.write) { const __r = __B2.write(acc, T, per, capability); if (__r) return __r; }\n  /* ---- write, and the records ---- */\n'],
]);
export function applyEdits(src, edits) {
  let out = src;
  for (const [label, from, to] of edits) {
    const n = out.split(from).length - 1;
    if (n !== 1) throw new Error(`bone2: edit '${label}' anchor matched ${n} times (must be exactly once)`);
    out = out.replace(from, () => to);
  }
  return out;
}
const IS_NODE = typeof window === 'undefined';
let GEO = null;
/* the copy, loaded once: in Node a temporary file (a stack frame would carry a
   megabyte of data: URL), in the browser a Blob URL */
export async function bone2Geometry() {
  if (GEO) return GEO;
  const geoUrl = new URL('./bloom-geometry.js', import.meta.url), curveUrl = new URL('./bloom-curve.js', import.meta.url);
  let src;
  if (IS_NODE) { const fs = await import('node:fs'); src = fs.readFileSync(geoUrl, 'utf8'); }
  else src = await (await fetch(geoUrl)).text();
  src = applyEdits(src, [['curve-import', "from './bloom-curve.js'", `from '${curveUrl.href}'`], ...BONE2_EDITS]);
  if (IS_NODE) {
    const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path'), { pathToFileURL } = await import('node:url');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bone2-'));
    const file = path.join(dir, 'bloom-geometry-bone2.mjs');
    fs.writeFileSync(file, src);
    try { GEO = await import(pathToFileURL(file).href); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  } else { const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' })); try { GEO = await import(url); } finally { URL.revokeObjectURL(url); } }
  return GEO;
}

/* ============================== THE REFINEMENT INSIDE THE RELIEF PASS --- */
/* The v2 controls as a state: the shipped state plus the prototype's
   defaults written explicitly, so v1's own clamps and its patch scale (a
   law of the pore size and the spread, kept) see the v2 values. */
export function bone2State(base, extra = {}) {
  return { ...base, petalTexture: 'BONE', bonePoreSize: B2_PORE_DEFAULT, boneBandRatio: B2_SPREAD_DEFAULT, bonePoreDensity: B2_DENSITY_DEFAULT, ...extra };
}
const triArea = (P, a, b, c) => {
  const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2];
  const vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2];
  const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
  return Math.sqrt(x * x + y * y + z * z) / 2;
};
/* how many triangles the grid refiner WOULD emit for a triangle of these
   three edge lengths at edge e (the bisection on lengths alone, no vertices)
   — so a refinement too big to build (the derived grid on a whole bloom) is
   still counted exactly */
function bisectCount(la, lb, lc, e, depth = 0) {
  const L = Math.max(la, lb, lc);
  if (!(L > e) || depth > 40) return 1;
  /* the triangle (a, b, c) with |ab| = la, |bc| = lb, |ca| = lc, bisected on its
     longest edge: the median to the midpoint, by Apollonius */
  if (la === L) { const m = Math.sqrt(Math.max(0, (2 * lb * lb + 2 * lc * lc - la * la) / 4)); return bisectCount(la / 2, m, lc, e, depth + 1) + bisectCount(la / 2, lb, m, e, depth + 1); }
  if (lb === L) { const m = Math.sqrt(Math.max(0, (2 * la * la + 2 * lc * lc - lb * lb) / 4)); return bisectCount(la, lb / 2, m, e, depth + 1) + bisectCount(m, lb / 2, lc, e, depth + 1); }
  const m = Math.sqrt(Math.max(0, (2 * la * la + 2 * lb * lb - lc * lc) / 4));
  return bisectCount(la, m, lc / 2, e, depth + 1) + bisectCount(lc / 2, m, lb, e, depth + 1);
}
/* THE PETAL CAPTURE (round 2's instrument, docs §14): one organ's emitted
   mesh inside a window, UNDISPLACED, with the field evaluated at every vertex
   on its own normal — so a contour of F on it is the DRAWN mid-wall, measured
   in each pore's own tangent chart, the plate's instrument carried to a real
   sheet. `cap` = { organ, centre, normal, radiusMm }. */
function captureMesh(stats, T, P, N, tri, nrmAt = null, reliefAt = null) {
  const cap = stats.capture; if (!cap) return;
  const c0 = cap.centre, R2 = cap.radiusMm * cap.radiusMm;
  const near = (v) => { const dx = P[v * 3] - c0[0], dy = P[v * 3 + 1] - c0[1], dz = P[v * 3 + 2] - c0[2]; return dx * dx + dy * dy + dz * dz <= R2; };
  const keep = [], idx = new Map(), Pc = [], Fc = [], Rc = [];
  const id = (v) => { let k = idx.get(v); if (k !== undefined) return k; k = Pc.length / 3; idx.set(v, k); const p = [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]]; let n = nrmAt ? nrmAt(v) : [N[v * 3], N[v * 3 + 1], N[v * 3 + 2]]; const L = Math.hypot(n[0], n[1], n[2]) || 1; n = [n[0] / L, n[1] / L, n[2] / L]; Pc.push(...p); Fc.push(T.f(p, n)); Rc.push(reliefAt ? reliefAt(v) : null); return k; };
  for (let t = 0; t < tri.length / 3; t++) { const a = tri[t * 3], b = tri[t * 3 + 1], c = tri[t * 3 + 2]; if (near(a) && near(b) && near(c)) keep.push(id(a), id(b), id(c)); }
  cap.mesh = { P: Pc, F: Fc, tri: keep, relief: Rc };
}
/* the plan a capture reads: the first organ of the asked kind with a vertex
   at the window's centre, facing its normal */
function capturePlan(stats, plans) {
  const cap = stats.capture; if (!cap) return -1;
  return plans.findIndex((pl) => { const O = pl.X.O; if (O.organ !== cap.organ) return false; for (let v = 0; v < pl.X.nV; v++) { const d = Math.hypot(O.P[v * 3] - cap.centre[0], O.P[v * 3 + 1] - cap.centre[1], O.P[v * 3 + 2] - cap.centre[2]); if (d < 0.6 && O.N[v * 3] * cap.normal[0] + O.N[v * 3 + 1] * cap.normal[1] + O.N[v * 3 + 2] * cap.normal[2] > 0.8) return true; } return false; });
}

/* THE RINGS ON A REAL SHEET, IN A FOCUS WINDOW (the sheet's close-up; §6 of
   the doc says what porting them to every organ takes). The window's
   triangles of one organ are cut out; the hole is re-meshed in the tangent
   plane at the window's centre — every pore whose outer ring fits inside the
   hole gets its rings, the plateau is filled at the smallest pore's radius,
   and the hole's own boundary vertices are kept, so the patch closes against
   the shipped lattice around it exactly. Each new point is carried onto the
   surface through the cut triangle it projects into (its position, normal,
   weights by barycentric interpolation) and relieved by the one field. */
function ringsWindowOrgan(X, mw, focus, T, FIELD, layout, stats) {
  const O = X.O, nV = X.nV, nT = O.tri.length / 3;
  const n0 = focus.normal, { t1, t2 } = FIELD.frame(n0), c0 = focus.centre;
  const ch = (x, y, z) => { const dx = x - c0[0], dy = y - c0[1], dz = z - c0[2]; return [dx * t1[0] + dy * t1[1] + dz * t1[2], dx * t2[0] + dy * t2[1] + dz * t2[2]]; };
  const inWin = new Uint8Array(nT);
  let nIn = 0;
  for (let t = 0; t < nT; t++) {
    let ok = true;
    for (let k = 0; k < 3 && ok; k++) { const v = O.tri[t * 3 + k]; const dx = O.P[v * 3] - c0[0], dy = O.P[v * 3 + 1] - c0[1], dz = O.P[v * 3 + 2] - c0[2]; if (dx * dx + dy * dy + dz * dz > focus.radiusMm * focus.radiusMm || O.N[v * 3] * n0[0] + O.N[v * 3 + 1] * n0[1] + O.N[v * 3 + 2] * n0[2] < 0.3) ok = false; }
    if (ok) { inWin[t] = 1; nIn++; }
  }
  if (!nIn) return null;
  /* the hole's boundary: the cut triangles' edges used once, chained */
  const cnt = new Map(), dir = new Map();
  const ek = (a, b) => (a < b ? a * 4294967296 + b : b * 4294967296 + a);
  for (let t = 0; t < nT; t++) if (inWin[t]) for (let k = 0; k < 3; k++) { const a = O.tri[t * 3 + k], b = O.tri[t * 3 + (k + 1) % 3]; cnt.set(ek(a, b), (cnt.get(ek(a, b)) || 0) + 1); dir.set(a * 4294967296 + b, 1); }
  const next = new Map();
  for (let t = 0; t < nT; t++) if (inWin[t]) for (let k = 0; k < 3; k++) { const a = O.tri[t * 3 + k], b = O.tri[t * 3 + (k + 1) % 3]; if (cnt.get(ek(a, b)) === 1) next.set(a, b); }
  const loop = [];
  { const start = next.keys().next().value; let v = start; do { loop.push(v); v = next.get(v); } while (v !== undefined && v !== start && loop.length <= next.size); }
  if (loop.length !== next.size) { stats.ringsWindow = { refused: `the hole is not one loop (${loop.length} of ${next.size} boundary edges chained)` }; return null; }
  const poly = loop.map((v) => ch(O.P[v * 3], O.P[v * 3 + 1], O.P[v * 3 + 2]));
  let area2 = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; area2 += a[0] * b[1] - b[0] * a[1]; }
  const ccw = area2 > 0;
  const inPoly = (x, y) => { let w = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) w = !w; } return w; };
  const distPoly = (x, y) => { let d = Infinity; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; const ux = b[0] - a[0], uy = b[1] - a[1]; const L2 = ux * ux + uy * uy; let s = L2 > 0 ? ((x - a[0]) * ux + (y - a[1]) * uy) / L2 : 0; s = s < 0 ? 0 : s > 1 ? 1 : s; const dx = x - a[0] - s * ux, dy = y - a[1] - s * uy; d = Math.min(d, Math.sqrt(dx * dx + dy * dy)); } return d; };
  /* the cut triangles, projected, for carrying a chart point onto the surface */
  const cut = [];
  for (let t = 0; t < nT; t++) if (inWin[t]) cut.push(t);
  const proj = new Map();
  const pv = (v) => { let q = proj.get(v); if (!q) { q = ch(O.P[v * 3], O.P[v * 3 + 1], O.P[v * 3 + 2]); proj.set(v, q); } return q; };
  const carry = (x, y) => {
    for (const t of cut) {
      const a = O.tri[t * 3], b = O.tri[t * 3 + 1], c = O.tri[t * 3 + 2];
      const A = pv(a), Bq = pv(b), C = pv(c);
      const det = (Bq[0] - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (Bq[1] - A[1]);
      if (!(Math.abs(det) > 0)) continue;
      const l1 = ((Bq[0] - x) * (C[1] - y) - (C[0] - x) * (Bq[1] - y)) / det, l2 = ((C[0] - x) * (A[1] - y) - (A[0] - x) * (C[1] - y)) / det, l3 = 1 - l1 - l2;
      if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
      const mix = (arr, dim, k) => l1 * arr[a * dim + k] + l2 * arr[b * dim + k] + l3 * arr[c * dim + k];
      const p = [mix(O.P, 3, 0), mix(O.P, 3, 1), mix(O.P, 3, 2)];
      let n = [mix(O.N, 3, 0), mix(O.N, 3, 1), mix(O.N, 3, 2)]; const L = Math.hypot(n[0], n[1], n[2]); n = [n[0] / L, n[1] / L, n[2] / L];
      return { p, n, m: mix(mw, 1, 0), clr: mix(X.clr, 1, 0) };
    }
    return null;
  };
  const params = FIELD.params, LAY = B2_RING_LAYOUTS[layout], en = params.D / 2, uOut = LAY.u[LAY.u.length - 1];
  /* THE HOLE'S EDGES ARE THE LATTICE'S (0.4 mm) AND MUST SURVIVE THE DELAUNAY.
     An edge is in the triangulation when no other point lies inside the circle
     on it as diameter (the Gabriel condition): a point at distance d from the
     edge can be inside that circle only if d < L/2. So the fill and every
     ringed pore keep half the longest hole edge (+0.5%) clear of the hole.
     The first cut kept en/2 = 0.125 mm, under 0.2, and lost 7 hole edges on a
     sparse (hard-core) window. */
  let Lmax = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; Lmax = Math.max(Lmax, Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const holeClear = Math.max(en * 0.5, Lmax * 0.505);
  const clearOfHole = (x, y) => distPoly(x, y) - (holeClear - en * 0.5);
  /* the pores: every pore whose outer ring fits inside the hole */
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const t of cut) for (let k = 0; k < 3; k++) { const v = O.tri[t * 3 + k]; for (let j = 0; j < 3; j++) { lo[j] = Math.min(lo[j], O.P[v * 3 + j]); hi[j] = Math.max(hi[j], O.P[v * 3 + j]); } }
  const placed = [];
  let ringed = 0, edgeSkipped = 0, nestedRinged = 0;
  for (const pore of FIELD.poresIn(lo, hi)) {
    const c0p = ch(pore.centre[0], pore.centre[1], pore.centre[2]);
    const at0 = carry(c0p[0], c0p[1]);
    if (!at0) continue;
    const disc = FIELD.discOf(pore, at0.p, at0.n);
    if (!disc) continue;
    const c2 = ch(disc.centre[0], disc.centre[1], disc.centre[2]);
    if (distPoly(c2[0], c2[1]) < disc.rho * uOut + holeClear || !inPoly(c2[0], c2[1])) { edgeSkipped++; continue; }
    ringed++;
    const fr = FIELD.frame(at0.n);
    const nested = disc.nested.map((q) => { const o = [q.ox * fr.t1[0] + q.oy * fr.t2[0], q.ox * fr.t1[1] + q.oy * fr.t2[1], q.ox * fr.t1[2] + q.oy * fr.t2[2]]; nestedRinged++; return { x: c2[0] + o[0] * t1[0] + o[1] * t1[1] + o[2] * t1[2], y: c2[1] + o[0] * t2[0] + o[1] * t2[1] + o[2] * t2[2], R: q.R }; });
    placed.push({ x: c2[0], y: c2[1], R: disc.rho, nested });
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const q of poly) { minX = Math.min(minX, q[0]); maxX = Math.max(maxX, q[0]); minY = Math.min(minY, q[1]); maxY = Math.max(maxY, q[1]); }
  const RM = ringsMeshChart({ pores: placed, layout, boundary: poly, fill: { spacing: en, inside: inPoly, clearOf: clearOfHole, bbox: [minX, minY, maxX, maxY] } });
  const pts = []; for (let i = 0; i < RM.xy.length / 2; i++) pts.push([RM.xy[i * 2], RM.xy[i * 2 + 1]]);
  const ids = pts.map((_, i) => (i < loop.length ? loop[i] : -1));
  const kept = RM.tri;
  /* the hole's edges must all be recovered, or the patch does not close */
  const have = new Set(); for (let i = 0; i < kept.length; i += 3) for (let k = 0; k < 3; k++) have.add(ek(kept[i + k], kept[i + (k + 1) % 3]));
  let missing = 0; for (let i = 0; i < loop.length; i++) if (!have.has(ek(i, (i + 1) % loop.length))) missing++;
  /* the new points onto the surface, relieved */
  const H = T.heightMm;
  const D = pts.map((q, i) => {
    if (ids[i] >= 0) { const v = ids[i], s = X.s[v] + X.clr[v]; return [O.P[v * 3] + (s > 0 ? O.N[v * 3] * s : 0), O.P[v * 3 + 1] + (s > 0 ? O.N[v * 3 + 1] * s : 0), O.P[v * 3 + 2] + (s > 0 ? O.N[v * 3 + 2] * s : 0)]; }
    const at = carry(q[0], q[1]);
    if (!at) return null;
    let s = at.clr;
    if (at.m > 0) { const mp = T.mp(at.p); if (mp > 0) s += at.m * mp * H * T.f(at.p, at.n); }
    return [at.p[0] + at.n[0] * s, at.p[1] + at.n[1] * s, at.p[2] + at.n[2] * s];
  });
  /* the base triangles outside the window, then the patch, wound as the organ */
  const out = [];
  const baseV = (v) => { const s = X.s[v] + X.clr[v]; return [O.P[v * 3] + (s > 0 ? O.N[v * 3] * s : 0), O.P[v * 3 + 1] + (s > 0 ? O.N[v * 3 + 1] * s : 0), O.P[v * 3 + 2] + (s > 0 ? O.N[v * 3 + 2] * s : 0)]; };
  for (let t = 0; t < nT; t++) if (!inWin[t]) for (let k = 0; k < 3; k++) out.push(...baseV(O.tri[t * 3 + k]));
  /* the organ's winding in the chart: one cut triangle's projected sign */
  const t0 = cut[0]; const A0 = pv(O.tri[t0 * 3]), B0 = pv(O.tri[t0 * 3 + 1]), C0 = pv(O.tri[t0 * 3 + 2]);
  const organCCW = (B0[0] - A0[0]) * (C0[1] - A0[1]) - (C0[0] - A0[0]) * (B0[1] - A0[1]) > 0;
  let dropped = 0;
  for (let i = 0; i < kept.length; i += 3) {
    let a = kept[i], b = kept[i + 1], c = kept[i + 2];
    if (!D[a] || !D[b] || !D[c]) { dropped++; continue; }
    if (!organCCW) { const tmp = b; b = c; c = tmp; }
    out.push(...D[a], ...D[b], ...D[c]);
  }
  void ccw;
  stats.ringsWindow = { cut: nIn, loop: loop.length, ringed, edgeSkipped, nestedRinged, points: pts.length, patchTris: kept.length / 3, missingBoundaryEdges: missing, dropped };
  if (stats.capture) {
    /* the window's own patch, undisplaced, plus the lattice around it */
    const Pu = [], Nu = [];
    pts.forEach((q, i) => { if (ids[i] >= 0) { const v = ids[i]; Pu.push(O.P[v * 3], O.P[v * 3 + 1], O.P[v * 3 + 2]); Nu.push(O.N[v * 3], O.N[v * 3 + 1], O.N[v * 3 + 2]); } else { const at = carry(q[0], q[1]); if (at) { Pu.push(...at.p); Nu.push(...at.n); } else { Pu.push(0, 0, 0); Nu.push(0, 0, 1); } } });
    const base = Pu.length / 3, triC = [];
    for (let i = 0; i < kept.length; i++) triC.push(kept[i]);
    for (let t = 0; t < nT; t++) if (!inWin[t]) for (let k = 0; k < 3; k++) { const v = O.tri[t * 3 + k]; Pu.push(O.P[v * 3], O.P[v * 3 + 1], O.P[v * 3 + 2]); Nu.push(O.N[v * 3], O.N[v * 3 + 1], O.N[v * 3 + 2]); triC.push(base + triC.length - kept.length); }
    captureMesh(stats, T, Pu, Nu, triC);
  }
  return new Float64Array(out);
}
/* THE HOOK: `mode` 'lattice' (the v2 field on the shipped lattice — the
   pass's own write), 'grid' (refined at `edgeMm`), 'count' (no geometry:
   the porous area and the derived grid's exact count, per organ) */
export function bone2Hook({ mode = 'grid', edgeMm = null, stats = {}, focus = null, countEdges = [] } = {}) {
  /* a FOCUS window (a sheet's close-up): only triangles with every vertex within
     `radiusMm` of `centre` and facing `normal` are refined */
  const focusOut = (O, a, b, c) => {
    if (!focus) return false;
    if (focus.organ && O.organ !== focus.organ) return true;
    for (const v of [a, b, c]) {
      const dx = O.P[v * 3] - focus.centre[0], dy = O.P[v * 3 + 1] - focus.centre[1], dz = O.P[v * 3 + 2] - focus.centre[2];
      if (dx * dx + dy * dy + dz * dz > focus.radiusMm * focus.radiusMm) return true;
      if (O.N[v * 3] * focus.normal[0] + O.N[v * 3 + 1] * focus.normal[1] + O.N[v * 3 + 2] * focus.normal[2] < 0.3) return true;
    }
    return false;
  };
  stats.countAt = {};
  let FIELD = null, FIELD_KEY = null;
  return {
    stats,
    field(state, H) {
      const params = bone2Params({ ...state, textureHeight: H });
      const key = JSON.stringify(params);
      if (key !== FIELD_KEY) { FIELD = bone2Field(params); FIELD_KEY = key; }
      stats.params = params;
      return FIELD.F;
    },
    write(acc, T, per) {
      const params = stats.params;
      const eDerived = bone2GridEdgeMm(params);
      const e = edgeMm || eDerived;
      stats.edgeDerivedMm = eDerived; stats.edgeMm = e; stats.mode = mode;
      stats.organs = {};
      const t0 = performance.now();
      /* a position two ORGANS both emit (keyed on the STL's float32s, the
         derived owner's own key) is a junction: a triangle carrying one is
         never refined, so no refined vertex lands on an edge two organs share
         — a midpoint there would be one position in two closed shells and the
         file would weld them (v1's 10,208-pair finding, §3.4 of its doc) */
      const f32 = Math.fround, owners = new Map();
      per.forEach((X, oi) => { for (let i = 0; i < X.nV; i++) { const k = `${f32(X.O.P[i * 3])}|${f32(X.O.P[i * 3 + 1])}|${f32(X.O.P[i * 3 + 2])}`; const o = owners.get(k); if (o === undefined) owners.set(k, oi); else if (o !== oi) owners.set(k, -1); } });
      const junction = (O, v) => owners.get(`${f32(O.P[v * 3])}|${f32(O.P[v * 3 + 1])}|${f32(O.P[v * 3 + 2])}`) === -1;
      let junctionTris = 0;
      const plans = [];
      for (const X of per) {
        const O = X.O, nV = X.nV;
        const mw = new Float64Array(nV);
        for (let i = 0; i < nV; i++) mw[i] = X.w0[i] > 0 && X.mc[i] > 0 ? X.w0[i] * X.mc[i] : 0;
        const nT = O.tri.length / 3;
        const porous = new Uint8Array(nT);
        let porousArea = 0, porousTris = 0, derivedCount = 0;
        for (let t = 0; t < nT; t++) {
          const a = O.tri[t * 3], b = O.tri[t * 3 + 1], c = O.tri[t * 3 + 2];
          if ((mw[a] > 0 && X.mpv[a] > 0) || (mw[b] > 0 && X.mpv[b] > 0) || (mw[c] > 0 && X.mpv[c] > 0)) {
            if (focusOut(O, a, b, c)) continue;
            if (junction(O, a) || junction(O, b) || junction(O, c)) { junctionTris++; continue; }
            porous[t] = 1; porousTris++; porousArea += triArea(O.P, a, b, c);
            if (mode === 'count') {
              const L = (u, v) => Math.hypot(O.P[u * 3] - O.P[v * 3], O.P[u * 3 + 1] - O.P[v * 3 + 1], O.P[u * 3 + 2] - O.P[v * 3 + 2]);
              derivedCount += bisectCount(L(a, b), L(b, c), L(c, a), eDerived);
              for (const ec of countEdges) stats.countAt[ec] = (stats.countAt[ec] || 0) + bisectCount(L(a, b), L(b, c), L(c, a), ec) - 1;
            }
          }
        }
        const st = stats.organs[O.organ] || (stats.organs[O.organ] = { parts: 0, tris: 0, porousTris: 0, porousAreaMm2: 0, areaMm2: 0, derivedGridTris: 0, refinedTris: 0 });
        st.parts++; st.tris += nT; st.porousTris += porousTris; st.porousAreaMm2 += porousArea; st.derivedGridTris += derivedCount - porousTris;
        for (let t = 0; t < nT; t++) st.areaMm2 += triArea(O.P, O.tri[t * 3], O.tri[t * 3 + 1], O.tri[t * 3 + 2]);
        plans.push({ X, mw, porous, porousTris });
      }
      stats.junctionTris = junctionTris;
      /* COARSE (the release preview, round 2's ruling 4) IS the v2 field on the
         shipped lattice: no point added, so its cost is v1's to the triangle,
         and its pores are the full build's (one field) drawn at the lattice */
      if (mode === 'count' || mode === 'lattice' || mode === 'coarse') { stats.passMs = performance.now() - t0; { const ci = capturePlan(stats, plans); if (ci >= 0) { const O = plans[ci].X.O, X = plans[ci].X; captureMesh(stats, T, O.P, O.N, O.tri, null, (v) => Math.max(0, X.s[v] + X.clr[v])); stats.capture.lattice = { P: Array.from(O.P), N: Array.from(O.N), tri: Array.from(O.tri), porous: Array.from(plans[ci].porous) }; } } if (mode === 'coarse' && stats.wantDiscs) stats.coarseDiscs = coarseDiscList(plans, FIELD); return null; }
      if (mode === 'hybrid' || mode === 'coarse-rings' || mode === 'hybrid-count' || mode === 'coarse-rings-count') return hybridWrite(acc, T, per, plans, FIELD, mode, stats, t0);
      if (mode === 'rings' && !focus) throw new Error('bone2: the rings run in a FOCUS window only (a charted patch) — see the doc §6');
      /* GRID: refine each organ's porous triangles; rebuild the stream */
      const H = T.heightMm;
      const repl = [];
      let added = 0;
      /* A REFINED VERTEX MAY NOT LAND ON ANOTHER ORGAN'S VERTEX. The junction
         rule above keeps refinement off positions two organs already share,
         and that is not enough: a midpoint (or a transition fan's centroid)
         can land EXACTLY on a vertex of a neighbouring organ — measured, five
         hub/petal positions at the rim on the 45-degree petals (6.2541,
         6.2541, +-0.6), which welded three petals to the hub (9 -> 7 shells,
         4,492 within-shell pairs). So refine, look for a new vertex whose
         float32 key another organ also carries, withdraw the porous triangles
         that produced it (and the porous neighbours of a transition triangle
         that produced it), and refine again until none is left. */
      const keyOf = (PP, v) => `${f32(PP[v * 3])}|${f32(PP[v * 3 + 1])}|${f32(PP[v * 3 + 2])}`;
      const refined = new Map();
      const refineAll = (onlyIdx) => { plans.forEach((pl, i) => { if (onlyIdx && !onlyIdx.has(i)) return; if (mode === 'rings' || !pl.porousTris) { refined.set(i, null); return; } const O = pl.X.O; refined.set(i, gridRefine(Array.from(O.P), Array.from(O.tri), [{ dim: 3, v: Array.from(O.N) }, { dim: 1, v: Array.from(pl.mw) }, { dim: 1, v: Array.from(pl.X.clr) }], pl.porous, e)); }); };
      if (mode !== 'rings') {
        refineAll(null);
        let withdrawn = 0;
        for (let pass = 0; pass < 6; pass++) {
          const seen = new Map();
          plans.forEach((pl, i) => { const R = refined.get(i); const PP = R ? R.P : pl.X.O.P; const n = PP.length / 3; for (let v = 0; v < n; v++) { const k = keyOf(PP, v); const o = seen.get(k); if (o === undefined) seen.set(k, i); else if (o !== i) seen.set(k, -1); } });
          const redo = new Set();
          plans.forEach((pl, i) => {
            const R = refined.get(i); if (!R) return;
            const bad = new Set();
            for (let v = R.nV0; v < R.P.length / 3; v++) if (seen.get(keyOf(R.P, v)) === -1) bad.add(v);
            if (!bad.size) return;
            const O = pl.X.O, src = new Set();
            for (let t = 0; t < R.tri.length / 3; t++) if (bad.has(R.tri[t * 3]) || bad.has(R.tri[t * 3 + 1]) || bad.has(R.tri[t * 3 + 2])) src.add(R.parent[t]);
            for (const t of src) {
              if (pl.porous[t]) { pl.porous[t] = 0; pl.porousTris--; withdrawn++; continue; }
              const vs = [O.tri[t * 3], O.tri[t * 3 + 1], O.tri[t * 3 + 2]];
              for (let u = 0; u < O.tri.length / 3; u++) if (pl.porous[u]) { let sh = 0; for (let c = 0; c < 3; c++) if (vs.includes(O.tri[u * 3 + c])) sh++; if (sh >= 2) { pl.porous[u] = 0; pl.porousTris--; withdrawn++; } }
            }
            redo.add(i);
          });
          if (!redo.size) break;
          refineAll(redo);
        }
        stats.coincidentWithdrawn = withdrawn;
        const ci = capturePlan(stats, plans);
        if (ci >= 0) { const R = refined.get(ci), O = plans[ci].X.O; if (R) captureMesh(stats, T, R.P, R.attrs[0].v, R.tri); else captureMesh(stats, T, O.P, O.N, O.tri); }
      }
      for (const [pi, { X, mw, porous, porousTris }] of plans.entries()) {
        const O = X.O, nV = X.nV;
        if (mode === 'rings') { repl.push({ from: O.from, to: O.to, X, out: (focus.organ ? O.organ === focus.organ : true) ? ringsWindowOrgan(X, mw, focus, T, FIELD, focus.layout || 'full', stats) : null }); continue; }
        if (!porousTris) { repl.push({ from: O.from, to: O.to, X, out: null }); continue; }
        const clr = X.clr;
        const R = refined.get(pi);
        const nN = R.P.length / 3;
        const D = new Float64Array(nN * 3);
        for (let i = 0; i < nN; i++) {
          let n = [R.attrs[0].v[i * 3], R.attrs[0].v[i * 3 + 1], R.attrs[0].v[i * 3 + 2]];
          let s;
          if (i < nV) s = X.s[i] + clr[i];
          else {
            const L = Math.hypot(n[0], n[1], n[2]);
            const m = R.attrs[1].v[i];
            s = R.attrs[2].v[i];
            if (L > 0) {
              n = [n[0] / L, n[1] / L, n[2] / L];
              if (m > 0) { const p = [R.P[i * 3], R.P[i * 3 + 1], R.P[i * 3 + 2]]; const mp = T.mp(p); if (mp > 0) s += m * mp * H * T.f(p, n); }
            }
          }
          for (let k = 0; k < 3; k++) D[i * 3 + k] = R.P[i * 3 + k] + (s > 0 ? n[k] * s : 0);
        }
        const out = new Float64Array(R.tri.length * 3);
        for (let j = 0; j < R.tri.length; j++) for (let k = 0; k < 3; k++) out[j * 3 + k] = D[R.tri[j] * 3 + k];
        added += R.tri.length / 3 - O.tri.length / 3;
        stats.organs[O.organ].refinedTris += R.tri.length / 3;
        stats.transition = (stats.transition || 0) + R.transition;
        repl.push({ from: O.from, to: O.to, X, out });
      }
      /* the base displacement for organs with no porous triangle, and the stream rebuilt */
      repl.sort((a, b) => a.from - b.from);
      const old = acc.positions, oldN = acc.normals;
      const pos = [], nrm = oldN ? [] : null;
      let cur = 0;
      const pushOld = (t0x, t1x) => { for (let i = t0x * 9; i < t1x * 9; i++) pos.push(old[i]); if (nrm) for (let i = t0x * 9; i < t1x * 9; i++) nrm.push(oldN[i]); };
      stats.ranges = [];
      for (const r of repl) {
        if (r.from < cur) continue;           // an overlap: kept as emitted (none expected)
        pushOld(cur, r.from);
        const outFrom = pos.length / 9;
        let out = r.out;
        if (!out) {
          const O = r.X.O; out = new Float64Array(O.tri.length * 3);
          for (let j = 0; j < O.tri.length; j++) { const v = O.tri[j], s = r.X.s[v] + r.X.clr[v]; for (let k = 0; k < 3; k++) out[j * 3 + k] = O.P[v * 3 + k] + (s > 0 ? O.N[v * 3 + k] * s : 0); }
        }
        for (let i = 0; i < out.length; i++) pos.push(out[i]);
        if (nrm) for (let t = 0; t < out.length / 9; t++) {
          const b = t * 9; const ux = out[b + 3] - out[b], uy = out[b + 4] - out[b + 1], uz = out[b + 5] - out[b + 2], vx = out[b + 6] - out[b], vy = out[b + 7] - out[b + 1], vz = out[b + 8] - out[b + 2];
          let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const L = Math.hypot(nx, ny, nz) || 1;
          for (let c = 0; c < 3; c++) nrm.push(nx / L, ny / L, nz / L);
        }
        stats.ranges.push({ organ: r.X.O.organ, from: outFrom, to: pos.length / 9, refined: !!r.out });
        cur = r.to;
      }
      pushOld(cur, old.length / 9);
      acc.positions = pos; if (nrm) acc.normals = nrm;
      for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { const x = pos[i + k]; if (x < acc.lo[k]) acc.lo[k] = x; if (x > acc.hi[k]) acc.hi[k] = x; }
      stats.added = added; stats.passMs = performance.now() - t0;
      return {};
    },
  };
}
/* ============================= ROUND 2: THE HYBRID IN THE RELIEF PASS --- */
/* Every organ with a porous triangle is re-meshed by `hybridOrganMesh` (the
   hybrid module's header says how) from the field's own discs cut by that
   organ; the new points take the organ's attributes by their lattice
   triangle's barycentrics and are relieved by the one field. 'hybrid' is the
   FULL build (the export and the full-detail button), 'coarse' the release
   preview (every length the lattice's own); '-count' counts exactly
   (b + 2i - 2 a triangle) without triangulating. The coincidence rule of
   round 1 is kept: a new vertex whose float32 key another organ also emits
   withdraws the lattice triangles it belongs to, and that organ is re-meshed
   (at most six passes). */
/* the pores a coarse build draws: the same discs the full build would mesh,
   from the same field and the same porous triangles (B2f compares the two) */
function coarseDiscList(plans, FIELD) {
  const out = [];
  for (const pl of plans) if (pl.porousTris) for (const d of organDiscs(pl.X.O.P, pl.X.O.N, pl.X.O.tri, pl.porous, FIELD)) out.push({ key: d.key, c: d.c, rho: d.rho });
  return out;
}
export { hybridWrite as __hybridWrite };   // the gate's planted-coincidence fixture calls it on two synthetic organs
function hybridWrite(acc, T, per, plans, FIELD, mode, stats, t0) {
  const full = mode.startsWith('hybrid'), countOnly = mode.endsWith('-count');   // 'coarse-rings': the measured alternative to the lattice coarse (doc §15)
  const layout = HYBRID_LAYOUTS[full ? 'full' : 'coarse'], wallU = bone2WallU();
  const H = T.heightMm, f32 = Math.fround;
  stats.hybrid = { mode, organs: 0, count: 0, discs: 0, pairs: 0, free: 0, merged: 0, junctions: 0, kinds: {}, consFail: 0, aborted: 0, countMismatch: 0, withdrawn: 0, discList: [] };
  const HS = stats.hybrid;
  const run = (pl) => {
    const O = pl.X.O;
    const discs = organDiscs(O.P, O.N, O.tri, pl.porous, FIELD);
    const R = hybridOrganMesh({ P: O.P, tri: O.tri, porous: pl.porous }, discs, { layout, wallU, countOnly, debug: !!stats.debugHybrid });
    if (stats.debugHybrid && R.stats.failSites) (stats.failSites = stats.failSites || []).push(...R.stats.failSites.map((f) => ({ ...f, organ: O.organ, discs: [...new Set(f.failed.flatMap((q) => [q.da, q.db]).concat(f.blockers.flatMap((q) => [q.da, q.db])))].filter((x) => x >= 0).map((x) => ({ x, key: discs[x].key, rho: discs[x].rho, c: discs[x].c, n: discs[x].n })) })));
    return { discs, R };
  };
  const results = plans.map((pl) => (pl.porousTris ? run(pl) : null));
  let total = 0;
  for (const [i, pl] of plans.entries()) total += results[i] ? results[i].R.stats.count : pl.X.O.tri.length / 3;
  const tally = () => {
    for (const r of results) {
      if (!r) continue;
      HS.organs++; HS.discs += r.discs.length; const st = r.R.stats;
      for (const [k2, v] of Object.entries(st)) if (k2.startsWith('abort_')) HS[k2] = (HS[k2] || 0) + v;
      HS.pairs += st.pairs; HS.free += st.free; HS.merged += st.merged; HS.junctions += st.junctions || 0; HS.consFail += st.consFail; HS.aborted += st.aborted; HS.countMismatch += st.countMismatch || 0;
      for (const d of r.discs) HS.discList.push({ key: d.key, c: d.c, rho: d.rho });
      if (r.R.kind) for (const k of r.R.kind) HS.kinds[k] = (HS.kinds[k] || 0) + 1;
      else for (const [k2, v] of Object.entries({ ring: st.ringPts, cross: st.crossPts, seam: st.seamPts, seamCross: st.seamCross, junction: st.junctionPts || 0 })) HS.kinds[k2] = (HS.kinds[k2] || 0) + v;
    }
  };
  if (countOnly) {
    /* every organ outside the plans (none: plans covers per) plus the stream outside the relief pass */
    let inPass = 0; for (const pl of plans) inPass += pl.X.O.tri.length / 3;
    HS.count = acc.triangleCount - inPass + total;
    tally();
    stats.passMs = performance.now() - t0;
    return null;
  }
  /* the displaced positions of an organ's (old + new) vertices */
  const displaced = (pl, R) => {
    const X = pl.X, O = X.O, nV = X.nV, nN = R.P.length / 3;
    const D = new Float64Array(nN * 3);
    for (let i = 0; i < nN; i++) {
      let s, p, n;
      if (i < nV) { s = X.s[i] + X.clr[i]; p = [O.P[i * 3], O.P[i * 3 + 1], O.P[i * 3 + 2]]; n = [O.N[i * 3], O.N[i * 3 + 1], O.N[i * 3 + 2]]; }
      else {
        const j = i - nV, t = R.src.t[j], l = [R.src.b[j * 3], R.src.b[j * 3 + 1], R.src.b[j * 3 + 2]], c = [O.tri[t * 3], O.tri[t * 3 + 1], O.tri[t * 3 + 2]];
        p = [R.P[i * 3], R.P[i * 3 + 1], R.P[i * 3 + 2]];
        n = [0, 1, 2].map((k) => l[0] * O.N[c[0] * 3 + k] + l[1] * O.N[c[1] * 3 + k] + l[2] * O.N[c[2] * 3 + k]);
        const L = Math.hypot(n[0], n[1], n[2]) || 1; n = [n[0] / L, n[1] / L, n[2] / L];
        const m = l[0] * pl.mw[c[0]] + l[1] * pl.mw[c[1]] + l[2] * pl.mw[c[2]];
        s = l[0] * X.clr[c[0]] + l[1] * X.clr[c[1]] + l[2] * X.clr[c[2]];
        if (m > 0) { const mp = T.mp(p); if (mp > 0) s += m * mp * H * T.f(p, n); }
      }
      for (let k = 0; k < 3; k++) D[i * 3 + k] = p[k] + (s > 0 ? n[k] * s : 0);
    }
    return D;
  };
  const keyOf = (D, v) => `${f32(D[v * 3])}|${f32(D[v * 3 + 1])}|${f32(D[v * 3 + 2])}`;
  let Ds = plans.map((pl, i) => (results[i] ? displaced(pl, results[i].R) : null));
  for (let pass = 0; pass < 6; pass++) {
    const seen = new Map();
    plans.forEach((pl, i) => {
      const n = results[i] ? Ds[i].length / 3 : pl.X.nV;
      for (let v = 0; v < n; v++) {
        let k;
        if (results[i]) k = keyOf(Ds[i], v);
        else { const X = pl.X, O = X.O, s = X.s[v] + X.clr[v]; k = `${f32(O.P[v * 3] + (s > 0 ? O.N[v * 3] * s : 0))}|${f32(O.P[v * 3 + 1] + (s > 0 ? O.N[v * 3 + 1] * s : 0))}|${f32(O.P[v * 3 + 2] + (s > 0 ? O.N[v * 3 + 2] * s : 0))}`; }
        const o = seen.get(k); if (o === undefined) seen.set(k, i); else if (o !== i) seen.set(k, -1);
      }
    });
    const redo = [];
    plans.forEach((pl, i) => {
      const r = results[i]; if (!r) return;
      const R = r.R, nV = pl.X.nV; let hit = false;
      for (let v = nV; v < Ds[i].length / 3; v++) if (seen.get(keyOf(Ds[i], v)) === -1) { for (const t of R.attach[v - nV]) if (pl.porous[t]) { pl.porous[t] = 0; pl.porousTris--; HS.withdrawn++; } hit = true; }
      if (hit) redo.push(i);
    });
    if (!redo.length) break;
    for (const i of redo) { results[i] = plans[i].porousTris ? run(plans[i]) : null; Ds[i] = results[i] ? displaced(plans[i], results[i].R) : null; }
  }
  stats.coincidentWithdrawn = HS.withdrawn;
  { const ci = capturePlan(stats, plans); if (ci >= 0 && results[ci]) { const R = results[ci].R, O = plans[ci].X.O, nV = plans[ci].X.nV, Dc = Ds[ci]; captureMesh(stats, T, R.P, null, R.tri, (v) => { if (v < nV) return [O.N[v * 3], O.N[v * 3 + 1], O.N[v * 3 + 2]]; const j = v - nV, t = R.src.t[j], l = [R.src.b[j * 3], R.src.b[j * 3 + 1], R.src.b[j * 3 + 2]], c = [O.tri[t * 3], O.tri[t * 3 + 1], O.tri[t * 3 + 2]]; return [0, 1, 2].map((k) => l[0] * O.N[c[0] * 3 + k] + l[1] * O.N[c[1] * 3 + k] + l[2] * O.N[c[2] * 3 + k]); }, (v) => Math.hypot(Dc[v * 3] - R.P[v * 3], Dc[v * 3 + 1] - R.P[v * 3 + 1], Dc[v * 3 + 2] - R.P[v * 3 + 2])); stats.capture.discs = results[ci].discs; } }
  tally();
  /* the stream rebuilt: each re-meshed organ's range replaced */
  const repl = [];
  plans.forEach((pl, i) => { const O = pl.X.O; if (!results[i]) return; const R = results[i].R, D = Ds[i]; const out = new Float64Array(R.tri.length * 3); for (let j = 0; j < R.tri.length; j++) for (let k = 0; k < 3; k++) out[j * 3 + k] = D[R.tri[j] * 3 + k]; repl.push({ from: O.from, to: O.to, X: pl.X, out }); });
  /* organs with no porous triangle: their base displacement, as the pass writes it */
  plans.forEach((pl, i) => { if (results[i]) return; const X = pl.X, O = X.O; const out = new Float64Array(O.tri.length * 3); for (let j = 0; j < O.tri.length; j++) { const v = O.tri[j], s = X.s[v] + X.clr[v]; for (let k = 0; k < 3; k++) out[j * 3 + k] = O.P[v * 3 + k] + (s > 0 ? O.N[v * 3 + k] * s : 0); } repl.push({ from: O.from, to: O.to, X, out }); });
  repl.sort((a, b) => a.from - b.from);
  const old = acc.positions, oldN = acc.normals;
  const pos = [], nrm = oldN ? [] : null;
  let cur = 0;
  const pushOld = (a, b) => { for (let i = a * 9; i < b * 9; i++) pos.push(old[i]); if (nrm) for (let i = a * 9; i < b * 9; i++) nrm.push(oldN[i]); };
  stats.ranges = [];
  for (const r of repl) {
    if (r.from < cur) continue;
    pushOld(cur, r.from);
    const outFrom = pos.length / 9, out = r.out;
    for (let i = 0; i < out.length; i++) pos.push(out[i]);
    if (nrm) for (let t = 0; t < out.length / 9; t++) {
      const b = t * 9; const ux = out[b + 3] - out[b], uy = out[b + 4] - out[b + 1], uz = out[b + 5] - out[b + 2], vx = out[b + 6] - out[b], vy = out[b + 7] - out[b + 1], vz = out[b + 8] - out[b + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, L = Math.hypot(nx, ny, nz) || 1;
      for (let c = 0; c < 3; c++) nrm.push(nx / L, ny / L, nz / L);
    }
    stats.ranges.push({ organ: r.X.O.organ, from: outFrom, to: pos.length / 9, refined: true });
    cur = r.to;
  }
  pushOld(cur, old.length / 9);
  acc.positions = pos; if (nrm) acc.normals = nrm;
  for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { const x = pos[i + k]; if (x < acc.lo[k]) acc.lo[k] = x; if (x > acc.hi[k]) acc.hi[k] = x; }
  HS.count = pos.length / 9;
  stats.passMs = performance.now() - t0;
  return {};
}

/* one bloom under v1 (the hook off), the v2 field on the lattice, or the
   grid; returns the accumulator, the record and the hook's stats */
export async function bone2Bloom(state, { mode = "grid", edgeMm = null, exportMode = true, captureNormals = false, capability = null, focus = null, countEdges = [], discs: wantDiscs = false, capture = null } = {}) {
  const G = await bone2Geometry();
  const stats = { debugHybrid: !!globalThis.__B2_DEBUG_HYBRID, wantDiscs, capture: capture ? { ...capture } : null };
  G.__setBone2(mode === 'v1' ? null : bone2Hook({ mode, edgeMm, stats, focus, countEdges }));
  try {
    const acc = new G.MeshBuilder({ exportMode, captureNormals });
    const t0 = performance.now();
    const rec = G.buildBloomInto(acc, state, { below: null, capability, scopes: null });
    stats.buildMs = performance.now() - t0;
    return { acc, rec, stats, G };
  } finally { G.__setBone2(null); }
}

/* ============================== THE PORE-CONFORMING MESH, IN A 2D CHART --- */
/* Every pore is meshed in its OWN rings about its centre, as STRUCTURED strips
   (each ring the same number of sides, aligned, every quad split on the same
   diagonal — a structure Delaunay would not keep: a wall ring is a few
   hundredths of the radius from the next and a side a third of it, and the
   empty-circle test then joins rings past the wall). Only the NETWORK between
   pores (and a nested pore's floor) is Delaunay-filled. Because pores are
   hard-core (B2_WALL_K), no two pores' outermost rings meet, so every pore is
   one closed disc of structure; its outermost ring is a convex polygon whose
   circumcircle holds no other point, so its edges are in the network's
   Delaunay and a network triangle whose three vertices are one pore's outer
   ring is that pore's interior and is dropped.
     input:  pores  [{ x, y, R, nested: [{ x, y, R }] }] in the chart (mm)
             fill   { spacing, inside(x, y), clearOf(x, y) -> distance to the
                      domain's boundary (Infinity for none) }
             boundary [[x, y], ...] the domain's own boundary loop (kept as the
                      first points, in order) or null
             layout  B2_RING_LAYOUTS key
     output: { xy, tri (CCW in the chart), owner (per point: -1 boundary,
               -2 fill, else the pore's index) } */
export function ringsMeshChart({ pores, fill, boundary = null, layout = 'full' }) {
  const L = B2_RING_LAYOUTS[layout];
  const xy = [], owner = [];
  const P = (x, y, o) => { xy.push(x, y); owner.push(o); return owner.length - 1; };
  const tri = [];
  const orient = (a, b, c) => (xy[b * 2] - xy[a * 2]) * (xy[c * 2 + 1] - xy[a * 2 + 1]) - (xy[b * 2 + 1] - xy[a * 2 + 1]) * (xy[c * 2] - xy[a * 2]);
  const T = (a, b, c) => { if (orient(a, b, c) > 0) tri.push(a, b, c); else tri.push(a, c, b); };
  if (boundary) for (const q of boundary) P(q[0], q[1], -1);
  /* a disc of rings: the centre, then each ring; strips between consecutive
     rings; returns the ids of each ring */
  const disc = (cx, cy, R, us, sides, o, withCentre) => {
    const rings = us.map((u) => { const ids = []; for (let i = 0; i < sides; i++) { const th = (2 * Math.PI * i) / sides; ids.push(P(cx + u * R * Math.cos(th), cy + u * R * Math.sin(th), o)); } return ids; });
    if (withCentre) { const c = P(cx, cy, o); for (let i = 0; i < sides; i++) T(c, rings[0][i], rings[0][(i + 1) % sides]); }
    for (let j = 0; j + 1 < rings.length; j++) for (let i = 0; i < sides; i++) { const a = rings[j][i], b = rings[j][(i + 1) % sides], c = rings[j + 1][i], d = rings[j + 1][(i + 1) % sides]; T(a, b, d); T(a, d, c); }
    return rings;
  };
  /* the free space between given loops (each a convex ring, dropped inside),
     filled at `spacing`, Delaunay; `outer` (a ring id list or null) bounds it */
  const region = (loops, outerIds, spacing, inside, clearOf, bbox, outers = null) => {
    const ids = [];
    if (outerIds) ids.push(...outerIds);
    for (const l of loops) ids.push(...l.ids);
    const loopOf = new Map(); loops.forEach((l, k) => { for (const v of l.ids) loopOf.set(v, k); });
    /* the fill: the plateau at `spacing`; inside a merged pore's outer disc but
       past its last kept ring (a merge's saddle) at that pore's own side
       length, so the saddle's walls are drawn */
    const lay = (sp, keep) => {
      const h = sp * Math.sqrt(3) / 2;
      /* a regular hex lattice puts every point's six neighbours on ONE circle,
         and a Bowyer-Watson insertion on cocircular points decides its cavity
         by the last bit (measured: 171 of 1,943 triangles not Delaunay and 6
         of a hole's lattice edges lost, on a sparse window). So each fill
         point is moved by a deterministic jitter of up to 2% of the spacing:
         nothing reads the fill's exact positions, only that it is even. */
      const jit = (i, j, s) => { let h = (Math.imul(i + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(j + s, 0xc2b2ae35)) >>> 0; h = Math.imul(h ^ (h >>> 13), 0x27d4eb2d) >>> 0; return ((h & 0xffff) / 0xffff - 0.5) * 0.04 * sp; };
      for (let j = 0, y0 = bbox[1]; y0 <= bbox[3]; j++, y0 += h) for (let i = 0, x0 = bbox[0] + (j % 2) * sp / 2; x0 <= bbox[2]; i++, x0 += sp) {
        const x = x0 + jit(i, j, 1), y = y0 + jit(i, j, 7);
        if (!inside(x, y) || clearOf(x, y) < sp * 0.5 || !keep(x, y)) continue;
        let ok = true;
        for (const l of loops) { const dx = x - l.x, dy = y - l.y; if (dx * dx + dy * dy < (l.r + sp * 0.5) ** 2) { ok = false; break; } }
        if (ok) ids.push(P(x, y, -2));
      }
    };
    const seams = (outers || []).filter((o) => o.cut);
    const inSeam = (x, y) => seams.some((o) => (x - o.x) ** 2 + (y - o.y) ** 2 < o.R2);
    lay(spacing, (x, y) => !inSeam(x, y));
    if (seams.length) { const sp = Math.min(...seams.map((o) => o.side)); lay(sp, inSeam); }
    const pts = []; for (const v of ids) pts.push(xy[v * 2], xy[v * 2 + 1]);
    const dt = delaunay2(pts);
    let missing = 0, dropped = 0;
    for (let i = 0; i < dt.length; i += 3) {
      const a = ids[dt[i]], b = ids[dt[i + 1]], c = ids[dt[i + 2]];
      const la = loopOf.get(a), lb = loopOf.get(b), lc = loopOf.get(c);
      if (la !== undefined && la === lb && la === lc) { dropped++; continue; }   // inside a ring: the disc owns it
      if (!inside((xy[a * 2] + xy[b * 2] + xy[c * 2]) / 3, (xy[a * 2 + 1] + xy[b * 2 + 1] + xy[c * 2 + 1]) / 3)) continue;
      T(a, b, c);
    }
    void missing; void dropped;
  };
  const uFloorK = L.u.findIndex((u) => u >= (layout === 'lean' ? 0.6 : 0.75));
  /* MERGED PORES: each keeps the rings that lie inside its own POWER CELL (the
     radical lines of its outer disc against every overlapping neighbour's) —
     two kept rings in disjoint convex cells cannot meet, so each is still a
     loop whose circumcircle is empty and the network's Delaunay holds its
     edges. What lies beyond a pore's last kept ring (the merge's saddle) is
     network, filled with the rest. A pore that keeps no ring is a point. */
  const uOut = L.u[L.u.length - 1];
  const keepR = pores.map((pr, k) => {
    let r = Infinity;
    pores.forEach((q, j) => {
      if (j === k) return;
      const d = Math.hypot(q.x - pr.x, q.y - pr.y), Ra = uOut * pr.R, Rb = uOut * q.R;
      if (d >= Ra + Rb || d === 0) { if (d === 0) r = 0; return; }
      r = Math.min(r, (d * d + Ra * Ra - Rb * Rb) / (2 * d));
    });
    return r;
  });
  const loops = [];
  let merged = 0, pointOnly = 0;
  pores.forEach((pr, k) => {
    const us = L.u.filter((u) => u * pr.R < keepR[k] * (1 - 1e-6));
    if (us.length < L.u.length) merged++;
    if (!us.length) { pointOnly++; P(pr.x, pr.y, k); return; }
    const nestedOK = pr.nested && pr.nested.length && us.length > uFloorK && uFloorK >= 0;
    if (!nestedOK) {
      const rings = disc(pr.x, pr.y, pr.R, us, L.sides, k, true);
      loops.push({ ids: rings[rings.length - 1], x: pr.x, y: pr.y, r: us[us.length - 1] * pr.R });
      return;
    }
    /* a shelved pore: its annulus from the floor ring out is structured; its
       floor is a region holding the nested pits' own discs */
    const rings = disc(pr.x, pr.y, pr.R, us.slice(uFloorK), L.sides, k, false);
    loops.push({ ids: rings[rings.length - 1], x: pr.x, y: pr.y, r: us[us.length - 1] * pr.R });
    const floorR = us[uFloorK] * pr.R;
    const nloops = [];
    for (const q of pr.nested) { const nr = disc(q.x, q.y, q.R, L.nestedU, L.nestedSides, k, true); nloops.push({ ids: nr[nr.length - 1], x: q.x, y: q.y, r: L.nestedU[L.nestedU.length - 1] * q.R }); }
    const sp = (2 * Math.PI * floorR) / L.sides;
    region(nloops, rings[0], sp, (x, y) => (x - pr.x) ** 2 + (y - pr.y) ** 2 < (floorR * Math.cos(Math.PI / L.sides)) ** 2, (x, y) => floorR - Math.hypot(x - pr.x, y - pr.y), [pr.x - floorR, pr.y - floorR, pr.x + floorR, pr.y + floorR]);
  });
  /* the network */
  const outers = pores.map((pr, k) => ({ x: pr.x, y: pr.y, R2: (uOut * pr.R) ** 2, side: (2 * Math.PI * pr.R) / L.sides, cut: keepR[k] < uOut * pr.R }));
  region(loops, boundary ? boundary.map((_, i) => i) : null, fill.spacing, fill.inside, fill.clearOf, fill.bbox, outers);
  return { xy, tri, owner, merged, pointOnly };
}
