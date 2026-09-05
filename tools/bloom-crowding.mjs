/* ===================================================================
   bloom-crowding.mjs — FOOT CROWDING: how many petal feet are stacked on the
   most crowded point of the base. A FLAG, never a gate (Eva, Sep 3).

   WHY IT EXISTS. Eva ran, on the live page, 120 continuous petals (40 per
   turn, 3 turns) at spread 0.60 with the foot floored at 1.60 mm, and every
   foot landed inside 1.76 mm of radius: the feet fused into one mass at the
   base. Both STL gates were green and will stay green on that bloom — this is
   OVER-connection, not detachment, so it adds no boundary edge and splits no
   flood fill — and nothing this project owned reported it. It was found by a
   human looking at a render. This is the instrument that reports it.

   WHAT IT MEASURES — IN EXPORT MODE, from the exported geometry's own owner.
   Every foot is a rectangle footRing() already specifies: it lands on
   `ring.radius` at the azimuth the builder emitted for its slot, runs inward
   by `ring.overhang`, and is `ring.width` across. The base plane is
   rasterised and each cell counts the foot rectangles that contain it:

     D_max   the STACK DEPTH at the worst point — how many feet lie on the
             most crowded point of the base. The headline number, an integer.
     D_mean  the sum of every foot's plan area divided by the area of their
             UNION — the average depth over the ground the feet actually
             occupy. The companion: smooth where D_max steps.

   THE EXPORT IS THE ARTEFACT, AND IT DIFFERS FROM THE LIVE RENDER. footRing's
   area rule reads the thickness the solids are actually built at, so the
   export floor moves the ring radius: on Eva's run the ring is 3.63 mm live
   and 4.69 mm printed (+29%), and the reading is D_max 17 live against 11 in
   the export. Every number this module reports is the EXPORT's, and the live
   value is printed beside it only when the two differ, on the print-truth
   line's discipline. A picture on a contact sheet is the LIVE render (the
   print-preview toggle is parked in the charter); its caption is the export
   number, and it says so.

   THE THRESHOLD IS EVA'S, AND IT CARRIES ONLY THE CLAIM. `CROWDED_DMAX` is
   11 (Eva, Sep 3): the only evidence is that every configuration she has
   ruled clean reads 5 or below and the one she ruled bad reads 11, so 6..10
   are UNRULED and print without a mark rather than being called CROWDED
   before she has looked at one. The number prints on every row regardless,
   so the printout carries the sensitivity.
   RE-DERIVED WHEN THE DEPTH CAP WAS RAISED TO SIX (Sep 3, the same day) and
   HELD AT 11 by Eva's second ruling, pending the depth sheet: measured at
   depths 4/5/6 the mum reads 13/15/19 (bad, and flagged), the defaults
   2/2/2, the ruled-clean depth cell 4/5/4 and RADIAL x 40 x spread 0.60
   12/11/15 — so the ruled-clean maximum is still 5 and the ruled-bad
   minimum still 11, and the deeper depth-cell states sit unruled just under
   the line, on tools/shot-bloom-depth.mjs for her eye.

   WHAT IT IS BLIND TO — read before quoting a clean reading:
     - BLADE-TO-BLADE CROWDING ABOVE THE ROOT. In the artefact the feet are
       not separately visible at all: each lies inside the hub disc, at the
       hub's own thickness, in the hub's own slab. What an eye sees fusing is
       the blade ROOTS leaving the ring — and the root's exit half-width IS
       `ring.width / 2` by construction (the first blade rows carry footHalf
       and rootBlend reads it), so foot stacking at the base is exactly
       root-exit stacking. Above that exit the blade widens to petalWidth,
       tilts by petalTilt + tiltExtra, and curls, and NONE of that moves this
       number. Short, wide blades at high tilt crowd above the base with a
       clean D_max. THAT IS A SECOND INSTRUMENT NOBODY HAS — RECORDED, NOT
       BUILT — and it is the one the mum work will need. A clean D_max is a
       clean BASE, never a clean bloom.
     - The hub itself. Feet inside the hub disc are counted; the disc is not
       a foot and is not.
     - Whether stacking is GOOD. Eva ruled spread below 1.00 reachable on
       purpose (Aug 31: the area rule is a reference, not a cage); a spider
       mum may want a fused base. That is why this flags and does not gate.

   ON THE DOME (Sep 4) THE FEET LIE ON A SPHERICAL CAP, AND THE RASTER
   MEASURES ON THAT SURFACE. Membership is decided in the cap's own geometry
   — a foot is a geodesic strip about its meridian, `width` wide across and
   `overhang` long along the arc from its ring, exactly what buildPetalInto
   emits (rows along the meridian, great-circle arcs across) — and the union
   is a SURFACE area (each occupied plan cell weighted by 1 / cos of the
   local slope). D_max is an exact integer either way; D_mean is the surface
   figure. At zero rise every expression reduces to the flat rectangle, and
   that was VALIDATED rather than assumed: the surface raster at rise 0
   equals the shipped flat raster to the bit on five configurations (D_max
   and D_mean alike) before either was trusted with a dome. R4 places every
   emitted foot row on the owner's cap; the reading itself is registered
   against the owner's per-ring `arc` and `slope`, never a re-derivation.

   WHAT THE DOME DOES AND DOES NOT DO — measured Sep 4, and the reason the
   local relief factor is printed beside D_max: the cap's extra surface sits
   at the RIM where the slope is steep, and a tight bloom's feet stack at the
   INNER rings where the cap is nearly flat. On the mum a hemisphere's
   whole-annulus area ratio is 2.0x, the local relief at its peak (r 2.1–2.8 mm
   on a 4.69 mm hub) is 1.1–1.2x, and D_max goes 11 -> 9, not 11 -> 5. The
   crowding instrument OBSERVES the geometry and is never an input to it
   (Eva, Sep 4).

   ON THE FULL SPHERE (session 18) THE RASTER RUNS POLE TO POLE IN THE
   SURFACE'S OWN COORDINATES, and membership is evaluated THERE, never
   through a plan point: a plan point names TWO points on a sphere, one on
   each side of the equator, so the cap's membership (which lifts the plan
   point onto the UPPER sheet) would test every far-side cell against the
   wrong hemisphere and read the reserved pole as the face pole's own feet.
   `surfaceMembership()` takes (arc from the face pole, azimuth) directly —
   the same along/across formulae the cap uses, with cos(phi) signed rather
   than a positive square root — and the fine pass windows in (s, theta) as
   well. The CAP path is a branch and is verbatim; the sphere arm is used
   only when the owner declares `closed`. R4 needed ONE clause, not a
   rewrite: `atan2(proj, dz)` already reads a far-side row's arc correctly
   (dz is signed), so the clause added is that no foot row lies at or past
   the reserved pole. The pole readings (the deepest cell within one
   equal-area step of each pole) are printed for the sheet, because the face
   pole is where the sphere's crowding question lives.

   NEIGHBOURS: NONE ARE CHOSEN, AND THAT IS THE JUSTIFICATION. The golden
   angle puts the tightest approaches at FIBONACCI index gaps, not adjacent
   ones: on Eva's run the closest pair of feet is slots 98 and 119 — gap 21 —
   at 0.385 mm centre distance, while index-adjacent slots are 137.5 deg
   apart, roughly twelve times further. A metric inspecting index-adjacent
   neighbours reads that bloom clean. The depth field is exhaustive over EVERY
   foot at EVERY cell, so an approach at any gap is counted whether or not
   anyone anticipated it. The all-pairs nearest-neighbour distance (centre to
   centre, in foot widths, with the index gap it fell on) is reported beside
   D_max as a diagnostic, and the index-adjacent figure is printed next to it
   so the blind reading is visible rather than argued.

   READING footRing(), NOT DUPLICATING IT. This module imports the app's own
   geometry module INSIDE THE PAGE (the same module instance the app built
   from) and calls buildBloomInto() with an export-mode accumulator, then
   reads `foot.slotRings[L][i]` (one descriptor per slot; `foot.rings[k]`
   under CONTINUOUS) and the builder's own `slotAzimuths`. No area rule, no
   clamp, no overhang law and no azimuth law is restated here. That the
   reading IS the exported geometry is asserted per row rather than trusted:
     R1  the in-page export build's triangle count equals the exported STL's
         header count — the geometry this read is the geometry that shipped;
     R2  the in-page live build equals the app's own liveTris and hub radius;
     R3  every foot the builder emitted has exactly one rectangle here
         (feet === petalsBuilt);
     R4  every emitted foot FRAME (three rows per descriptor's representative
         petal, all 120 under CONTINUOUS) lies exactly where the rectangle
         built from that descriptor's numbers puts it — J1's expected-from-
         owner check, pointed at this model;
     R5  the raster is CONVERGED: D_max is identical at two pitches and
         D_mean within 0.5% at twice the cell. A depth reading that moves
         with the cell is a sampling artefact wearing a geometry costume
         (the flower's lesson), and it is refused rather than reported.
         D_MAX IS RESOLVED LOCALLY (Sep 3, the depth raise): the hub-pitch
         raster alone wobbled by one on six deep rows whose innermost ring
         is a few hundredths of a millimetre — 29 vs 28 on the mum at seven
         turns, 40 vs 38 at depth 8 x shrink 0.35 — because the deepest
         stack there is a sliver narrower than a hub-scale cell. So the
         reading is taken by refineDepth(): windows around every hub cell
         within two of the hub maximum, re-rastered at 1/8 and 1/16 of the
         hub pitch, and R5 requires THOSE two to agree. Same cell budget
         order as the hub pass; the six rows converge; every shipped row's
         number is unchanged (checked on the standalone run below).
   This is also why it survives per-petal work for free: a per-petal
   descriptor still arrives through `slotRings`, and Z6 already asserts a
   role never differentiates the foot.

   Any R-failure is a VALIDITY failure — fatal for the run, never a row
   result — and CROWDED is never one. Both gates print `crowdingLine()` on
   every row and count the flagged rows; the flag is asserted in BOTH
   directions at matrix level (at least one row raises it and at least one
   does not), because a flag only ever checked absent is a flag that can be
   stuck off — the sub-8 spiral precedent.

   RUN (the numbers alone, no sheet):
         node tools/bloom-crowding.mjs            the four ruled configs + two
                                                  unruled ones, export mode
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, exportStl, analyzeStl } from './bloom-harness.mjs';

/* THE FLAG'S THRESHOLD — Eva, Sep 3. See the header: 5 and below is ruled
   clean, 11 is ruled bad, 6..10 are unruled and print unmarked. Re-derive
   when MAX_LAYERS (the depth cap) is raised. */
export const CROWDED_DMAX = 11;

export const CROWDING_SCOPE =
  'foot crowding reads footRing()\'s own export-mode rings and the builder\'s emitted azimuths, NOT the STL; it measures root-exit stacking at the base and is BLIND to blade-to-blade crowding above the root (recorded, not built); CROWDED is a FLAG at D_max >= ' + CROWDED_DMAX + ' (Eva, Sep 3), never a gate — over-connection adds no boundary edge and splits no flood fill, so both STL gates are green on a fused base';

/* ---------------------------------------------------------------------
   THE MEASUREMENT ITSELF, a pure function of the feet — exported so the
   convergence check, the shot tool and a positive control all run the same
   code, and so it can be exercised without a browser.

   `feet` is one record per foot: { radius, overhang, width, az, layer, slot,
   ring }. `R` is the hub radius, used only to size the raster. `cell` is the
   raster pitch in mm. Membership in a foot's rectangle is EXACT (the point
   is expressed in the foot's own radial/tangential frame); only the
   sampling is approximate, and R5 measures that. A foot that crosses the
   axis (spread 0.60 at two petals ALL THIN reaches -0.894 mm) is handled by
   the cartesian raster with no special case. */
/* MEMBERSHIP, one owner for both passes. Flat: the rectangle, verbatim. On
   the dome: the point's arc position along the foot's meridian and its
   geodesic distance from that meridian, from the cap's own sphere. A foot
   longer than its arc to the apex continues past it (atan2 goes negative),
   exactly as a flat foot that crosses the axis. */
export function footMembership(dome) {
  if (!dome) {
    return (f, x, y) => {
      const sr = x * f.c + y * f.s - f.radius;   // along the foot: 0 at the ring, -overhang at the inner end
      const v = -x * f.s + y * f.c;              // across the foot
      return sr <= 0 && sr >= -f.overhang && Math.abs(v) <= f.hw;
    };
  }
  const Rd = dome.Rd;
  return (f, x, y) => {
    const r2 = x * x + y * y;
    if (r2 > Rd * Rd) return false;
    const zc = Math.sqrt(Rd * Rd - r2);
    const proj = x * f.c + y * f.s, v = -x * f.s + y * f.c;
    const along = Rd * Math.atan2(proj, zc) - f.arc;
    const across = Rd * Math.asin(Math.max(-1, Math.min(1, v / Rd)));
    return along <= 0 && along >= -f.overhang && Math.abs(across) <= f.hw;
  };
}
/* MEMBERSHIP IN THE SURFACE'S OWN COORDINATES (session 18) — arc from the
   face pole `s` and azimuth `th`. The same two quantities the plan form
   computes, with cos(phi) SIGNED so the far side of the equator is the far
   side: `along` is the arc position of the point's projection onto the
   foot's meridian great circle, `across` its geodesic distance from that
   circle. A foot crossing the face pole reads exactly as it does on the cap
   (a negative `along` past the origin); no foot reaches the reserved pole
   (S3), so the meridian never wraps. */
export function surfaceMembership(dome) {
  const Rd = dome.Rd;
  return (f, s, th) => {
    const phi = s / Rd, sinP = Math.sin(phi), cosP = Math.cos(phi);
    const dth = th - f.az;
    const along = Rd * Math.atan2(sinP * Math.cos(dth), cosP) - f.arc;
    const across = Rd * Math.asin(Math.max(-1, Math.min(1, sinP * Math.sin(dth))));
    return along <= 0 && along >= -f.overhang && Math.abs(across) <= f.hw;
  };
}
/* The local surface-to-plan factor at plan radius r — 1 flat, INFINITE at a
   vertical rim (a hemisphere's outermost ring), never a large finite number
   wearing a factor's clothes. */
export function reliefAt(dome, r) {
  if (!dome) return 1;
  const d2 = dome.Rd * dome.Rd - r * r;
  return d2 <= 1e-9 * dome.Rd * dome.Rd ? Infinity : dome.Rd / Math.sqrt(d2);
}
/* THE SURFACE AREA OF ONE PLAN CELL ON THE CAP — the cap's own area between
   the cell's inner and outer plan radii, divided by the plan annulus between
   them and multiplied by the cell. Exact in r, so a cell touching a vertical
   rim carries the FINITE area the cap actually has there rather than a
   sampled 1 / cos that diverges: the first draft weighted each cell by the
   relief at its centre and R5 refused every hemisphere row at 0.5% (the
   sampling was measuring the singularity, not the surface). */
function cellSurfaceArea(dome, r, cell) {
  const Rd = dome.Rd;
  const r1 = Math.max(0, r - cell / 2), r2 = Math.min(Rd, r + cell / 2);
  if (r2 <= r1) return cell * cell;
  const surf = 2 * Math.PI * Rd * (Math.sqrt(Rd * Rd - r1 * r1) - Math.sqrt(Math.max(0, Rd * Rd - r2 * r2)));
  const plan = Math.PI * (r2 * r2 - r1 * r1);
  return cell * cell * (surf / plan);
}

/* ---------------------------------------------------------------------
   THE SURFACE RASTER (the dome). Cells in the cap's OWN coordinates — arc
   from the apex along the meridian, and azimuth — with the cell's area
   ds * r(s) * dtheta exact and regular everywhere, the vertical rim of a
   hemisphere included. A plan raster cannot do this: at rise 1 the outer
   ring's foot stands on a vertical wall whose plan footprint is a line, and
   the cap's area per plan cell there goes like 1/sqrt(distance to the rim),
   so a plan D_mean converges like sqrt(cell) and R5 refused every hemisphere
   row at 0.5% — measured, twice (once weighting cells by the relief at
   their centre, once by the exact cap area between their radii). Membership
   is the same exact test the plan pass uses, evaluated at the cell's plan
   point; only the sampling lattice changes, which is what R5 compares.
   Per-foot bounds in (s, theta): the foot's arc range, and the azimuth
   half-width a geodesic strip of half-width hw subtends at its smallest polar
   angle (sin(dtheta) = sin(hw/Rd) / sin(phi)); a foot that crosses the apex
   also covers the far side about az + pi, and near the apex every azimuth. */
export function surfaceDepth(feet, R, cell, dome) {
  const Rd = dome.Rd;
  /* POLE TO POLE on a closed sphere; apex to rim on a cap (verbatim). */
  const closed = dome.closed === true;
  const sRim = closed ? Math.PI * Rd : Rd * Math.asin(Math.min(1, R / Rd));
  const Ns = Math.max(1, Math.ceil(sRim / cell)), Nt = Math.max(8, Math.ceil((2 * Math.PI * R) / cell));
  const ds = sRim / Ns, dt = (2 * Math.PI) / Nt;
  const depth = new Uint16Array(Ns * Nt);
  const inside = footMembership(dome);
  const insideS = closed ? surfaceMembership(dome) : null;
  let sumArea = 0;
  /* The azimuth half-width a geodesic strip subtends at polar angle phi:
     sin(dtheta) = sin(hw/Rd) / sin(phi). On the closed sphere sin(phi) falls
     again past the equator, so the strip widens toward BOTH poles; the cap
     expression is kept verbatim on its own arm. */
  const halfAt = closed
    ? (s) => { const phi = Math.min(Math.max(s, 0.5 * ds), sRim - 0.5 * ds) / Rd; const q = Math.sin(Math.min(Math.PI / 2, (feetHw) / Rd)) / Math.max(Math.sin(phi), 1e-12); return q >= 1 ? Math.PI : Math.asin(q) + dt; }
    : (s) => { const phi = Math.max(s, 0.5 * ds) / Rd; const q = Math.sin(Math.min(Math.PI / 2, (feetHw) / Rd)) / Math.sin(Math.min(phi, Math.PI / 2)); return q >= 1 ? Math.PI : Math.asin(q) + dt; };
  let feetHw = 0;
  for (const f0 of feet) {
    const f = { ...f0, c: Math.cos(f0.az), s: Math.sin(f0.az), hw: f0.width / 2, arc: f0.arc ?? f0.radius };
    feetHw = f.hw;
    sumArea += f.width * f.overhang;
    const lo = f.arc - f.overhang, hi = f.arc;
    const sides = lo >= 0 ? [[lo, hi, f.az]] : [[0, hi, f.az], [0, -lo, f.az + Math.PI]];
    for (const [sLo, sHi, azC] of sides) {
      const i0 = Math.max(0, Math.floor(sLo / ds)), i1 = Math.min(Ns - 1, Math.ceil(sHi / ds));
      for (let i = i0; i <= i1; i++) {
        const s = (i + 0.5) * ds;
        const r = Rd * Math.sin(s / Rd);
        const hwT = halfAt(s);
        const jc = Math.round(azC / dt);
        const span = hwT >= Math.PI ? Math.floor(Nt / 2) : Math.ceil(hwT / dt) + 1;
        for (let dj = -span; dj <= span; dj++) {
          const j = ((jc + dj) % Nt + Nt) % Nt;
          const th = (j + 0.5) * dt;
          if (closed ? insideS(f, s, th) : inside(f, r * Math.cos(th), r * Math.sin(th))) depth[i * Nt + j]++;
        }
      }
    }
  }
  /* A cell touched by two sides of one apex-crossing foot is counted once
     per membership test above only if the two loops never visit the same
     cell; they can, near the apex. Membership is exact, so re-test the
     over-counted cells: any cell whose count exceeds the number of feet
     that actually contain it is corrected here. */
  const pre = feet.map((f) => ({ c: Math.cos(f.az), s: Math.sin(f.az), hw: f.width / 2, arc: f.arc ?? f.radius, overhang: f.overhang, radius: f.radius, az: f.az }));
  let dmax = 0, at = -1, union = 0, occ = 0;
  const cellArea = (i) => ds * Rd * Math.sin(((i + 0.5) * ds) / Rd) * dt;
  /* THE POLE READINGS (session 18, for the sheet): the deepest cell within
     `poleArc` of each pole — one equal-area step, handed in by the caller
     from the owner's own stepCos. Null on a cap (one pole, and the apex
     reading is the innermost ring's, already printed). */
  const poleArc = closed && dome.stepCos ? Rd * Math.acos(1 - dome.stepCos) : null;
  let faceD = 0, reservedD = 0;
  for (let k = 0; k < depth.length; k++) {
    let d = depth[k];
    if (!d) continue;
    if (d > 1) {
      const i = Math.floor(k / Nt), j = k % Nt; const s = (i + 0.5) * ds, r = Rd * Math.sin(s / Rd), th = (j + 0.5) * dt;
      const x = r * Math.cos(th), y = r * Math.sin(th);
      let dd = 0; for (const f of pre) if (closed ? insideS(f, s, th) : inside(f, x, y)) dd++;
      d = dd; depth[k] = dd;
      if (!d) continue;
    }
    occ++; union += cellArea(Math.floor(k / Nt));
    if (d > dmax) { dmax = d; at = k; }
    if (poleArc !== null) {
      const s = (Math.floor(k / Nt) + 0.5) * ds;
      if (s <= poleArc && d > faceD) faceD = d;
      if (sRim - s <= poleArc && d > reservedD) reservedD = d;
    }
  }
  const stOf = (k) => { const i = Math.floor(k / Nt), j = k % Nt; return [(i + 0.5) * ds, (j + 0.5) * dt]; };
  const planOf = (k) => { const [s, th] = stOf(k); const r = Rd * Math.sin(s / Rd); return [r * Math.cos(th), r * Math.sin(th)]; };
  let dmaxAt = null, dmaxXY = null, dmaxST = null;
  if (at >= 0) {
    const [x, y] = planOf(at); const [s, th] = stOf(at);
    dmaxAt = { r: Math.hypot(x, y), thetaDeg: (Math.atan2(y, x) * 180) / Math.PI, polarDeg: closed ? ((s / Rd) * 180) / Math.PI : null, arcMm: s };
    dmaxXY = [x, y]; dmaxST = [s, th];
  }
  const candidates = [];
  for (let k = 0; k < depth.length; k++) if (depth[k] >= dmax - 2 && depth[k] > 0) candidates.push(k);
  candidates.sort((a, b) => depth[b] - depth[a]);
  /* CANDIDATES IN (s, theta) ON THE CLOSED SPHERE — a plan point would name
     two cells there — and in plan on the cap, verbatim, where refineDepth's
     plan windows are what was validated. */
  const top = candidates.slice(0, 96).map((k) => ({ c: closed ? stOf(k) : planOf(k), d: depth[k] }));
  return { dmax, dmaxAt, dmaxXY, dmaxST, dmean: union > 0 ? sumArea / union : 0, dmeanRaster: 0, union, sumArea, cell, N: Ns, Nt, candidates: top, closed,
    poles: poleArc !== null ? { face: faceD, reserved: reservedD, withinMm: poleArc } : null };
}

export function stackDepth(feet, R, cell, dome = null) {
  if (dome) return surfaceDepth(feet, R, cell, dome);
  const half = R + 2;
  const N = Math.ceil((2 * half) / cell);
  const depth = new Uint16Array(N * N);
  const inside = footMembership(dome);
  let sumArea = 0;
  for (const f0 of feet) {
    const f = { ...f0, c: Math.cos(f0.az), s: Math.sin(f0.az), hw: f0.width / 2, arc: f0.arc ?? f0.radius };
    sumArea += f.width * f.overhang;
    const c = f.c, s = f.s, hw = f.hw;
    /* The plan bounding box of the FLAT rectangle contains the domed strip's
       plan footprint (foreshortened along, and |v| <= hw across), so one box
       serves both. */
    const corners = [[f.radius, hw], [f.radius, -hw], [f.radius - f.overhang, hw], [f.radius - f.overhang, -hw]]
      .map(([rr, v]) => [rr * c - v * s, rr * s + v * c]);
    const xs = corners.map((p) => p[0]), ys = corners.map((p) => p[1]);
    const i0 = Math.max(0, Math.floor((Math.min(...xs) + half) / cell)), i1 = Math.min(N - 1, Math.ceil((Math.max(...xs) + half) / cell));
    const j0 = Math.max(0, Math.floor((Math.min(...ys) + half) / cell)), j1 = Math.min(N - 1, Math.ceil((Math.max(...ys) + half) / cell));
    for (let i = i0; i <= i1; i++) {
      const x = -half + (i + 0.5) * cell;
      for (let j = j0; j <= j1; j++) {
        const y = -half + (j + 0.5) * cell;
        if (inside(f, x, y)) depth[i * N + j]++;
      }
    }
  }
  let dmax = 0, occ = 0, tot = 0, at = -1, unionSurf = 0;
  for (let k = 0; k < depth.length; k++) {
    const d = depth[k];
    if (!d) continue;
    occ++; tot += d;
    if (dome) { const x = -half + (Math.floor(k / N) + 0.5) * cell, y = -half + ((k % N) + 0.5) * cell; unionSurf += cellSurfaceArea(dome, Math.min(Math.hypot(x, y), dome.Rd), cell); }
    if (d > dmax) { dmax = d; at = k; }
  }
  const union = dome ? unionSurf : occ * cell * cell;
  const centreOf = (k) => [-half + (Math.floor(k / N) + 0.5) * cell, -half + ((k % N) + 0.5) * cell];
  let dmaxAt = null, dmaxXY = null;
  if (at >= 0) {
    const [x, y] = centreOf(at);
    dmaxAt = { r: Math.hypot(x, y), thetaDeg: (Math.atan2(y, x) * 180) / Math.PI };
    dmaxXY = [x, y];
  }
  /* THE CANDIDATE CELLS for the local passes: every cell within two of the
     maximum, deepest first, capped so the cost stays bounded on a fused base
     where thousands of cells share the top reading. A sliver of depth D is
     bordered by faces of depth D-1 (one rectangle fewer), which the hub
     raster does see, so centring windows on D-1 and D-2 cells is what lets
     the fine pass find a maximum the coarse pass could not resolve. */
  const candidates = [];
  for (let k = 0; k < depth.length; k++) if (depth[k] >= dmax - 2 && depth[k] > 0) candidates.push(k);
  candidates.sort((a, b) => depth[b] - depth[a]);
  const top = candidates.slice(0, 96).map((k) => ({ c: centreOf(k), d: depth[k] }));
  return { dmax, dmaxAt, dmaxXY, dmean: union > 0 ? sumArea / union : 0, dmeanRaster: occ ? tot / occ : 0, union, sumArea, cell, N, candidates: top };
}

/* THE LOCAL PASS. Around each candidate cell of a hub-pitch raster, a window
   of three hub cells on a side is re-rastered at `pitch`, with an odd sample
   count so the candidate's own centre is a sample (the window can then never
   read lower than the cell it was centred on). Membership is the same exact
   test stackDepth() uses; only the sampling changes, which is the whole
   point of comparing two of these. */
export function refineDepth(feet, base, pitch, dome = null) {
  let dmax = 0, dmaxAt = null;
  const half = 1.5 * base.cell;
  const n = 2 * Math.ceil(half / pitch) + 1;
  const inside = footMembership(dome);
  const pre = feet.map((f) => ({ c: Math.cos(f.az), s: Math.sin(f.az), hw: f.width / 2, radius: f.radius, overhang: f.overhang, arc: f.arc ?? f.radius, az: f.az }));
  /* THE CLOSED SPHERE'S WINDOWS ARE IN (s, theta): `pitch` along the arc,
     and the angular pitch that is `pitch` of arc length at the window's own
     latitude (bounded at the poles, where a cell is a wedge). Membership is
     the surface form; the cap keeps its validated plan windows below. */
  if (dome && dome.closed) {
    const Rd = dome.Rd, insideS = surfaceMembership(dome);
    for (const cand of base.candidates) {
      for (let i = 0; i < n; i++) {
        const s = cand.c[0] + (i - (n - 1) / 2) * pitch;
        if (s < 0 || s > Math.PI * Rd) continue;
        const dth = pitch / Math.max(Rd * Math.sin(s / Rd), pitch);
        for (let j = 0; j < n; j++) {
          const th = cand.c[1] + (j - (n - 1) / 2) * dth;
          let d = 0;
          for (const f of pre) if (insideS(f, s, th)) d++;
          if (d > dmax) { dmax = d; dmaxAt = { r: Rd * Math.sin(s / Rd), thetaDeg: (th * 180) / Math.PI, polarDeg: ((s / Rd) * 180) / Math.PI, arcMm: s }; }
        }
      }
    }
    return { dmax, dmaxAt, pitch };
  }
  for (const cand of base.candidates) {
    for (let i = 0; i < n; i++) {
      const x = cand.c[0] + (i - (n - 1) / 2) * pitch;
      for (let j = 0; j < n; j++) {
        const y = cand.c[1] + (j - (n - 1) / 2) * pitch;
        let d = 0;
        for (const f of pre) if (inside(f, x, y)) d++;
        if (d > dmax) { dmax = d; dmaxAt = { r: Math.hypot(x, y), thetaDeg: (Math.atan2(y, x) * 180) / Math.PI }; }
      }
    }
  }
  return { dmax, dmaxAt, pitch };
}

/* All-pairs nearest neighbour — centre to centre, in mean foot widths — and
   the same statistic restricted to index-adjacent slots of one whorl, which
   is what a neighbour-picking metric would have read. Diagnostics. */
export function nearestFeet(feet, dome = null) {
  /* ON THE CLOSED SPHERE the foot's centre is a point ON the sphere (the
     meridian at arc minus half the overhang) and the distance is the chord —
     a plan centre would fold the far side onto the near side. Cap and flat:
     the plan centre, verbatim. */
  const closed = dome && dome.closed === true;
  const centre = closed
    ? (f) => { const ph = (f.arc - f.overhang / 2) / dome.Rd; const rr = dome.Rd * Math.sin(ph); return [rr * Math.cos(f.az), rr * Math.sin(f.az), dome.Rd * Math.cos(ph)]; }
    : (f) => { const rc = f.radius - f.overhang / 2; return [rc * Math.cos(f.az), rc * Math.sin(f.az), 0]; };
  const C = feet.map(centre);
  let all = { q: Infinity, d: Infinity, a: null, b: null, gap: null };
  let adj = { q: Infinity, d: Infinity, a: null, b: null, gap: 1 };
  for (let i = 0; i < feet.length; i++) {
    for (let j = i + 1; j < feet.length; j++) {
      const d = Math.hypot(C[i][0] - C[j][0], C[i][1] - C[j][1], C[i][2] - C[j][2]);
      const q = d / ((feet[i].width + feet[j].width) / 2);
      if (q < all.q) all = { q, d, a: feet[i], b: feet[j], gap: Math.abs(feet[i].slot - feet[j].slot) };
      if (feet[i].layer === feet[j].layer && Math.abs(feet[i].slot - feet[j].slot) === 1 && q < adj.q) adj = { q, d, a: feet[i], b: feet[j], gap: 1 };
    }
  }
  return { all, adjacent: adj };
}

/* The raster pitch: a FIXED GRID of about 2,400 cells across the hub's
   diameter, floored at 5 microns — so a spread-6 plate (R 59 mm) samples at
   0.05 mm, where the narrowest reachable foot (FOOT_MIN_WIDTH_MM, 1.6 mm) is
   still 31 cells across, and the mum's 4.7 mm hub samples at 0.0056 mm. The
   first draft capped the pitch at 0.02 mm instead, which made the LARGEST
   blooms the finest-sampled (37 million cells at spread 6) for no gain. R5
   is what says the pitch was fine enough, on every row. */
export function cellFor(R) { return Math.max(0.005, (2 * (R + 2)) / 2400); }

/* ---------------------------------------------------------------------
   READ THE FEET FROM THE OWNER, inside the page. Returns both modes: the
   export (the artefact, what the flag is about) and the live (the read-out's
   and the sheet's geometry), each with the builder's own tallies so R1-R4
   can be made. `capability` is the row's non-shipping petal-model spec, or
   null, exactly as the export handler would pass it. */
export async function readFeet(page, capability = null) {
  return page.evaluate(async (cap) => {
    const mod = await import('/bloom-geometry.js');
    const ui = window.__bloomUIState();
    const out = {};
    for (const mode of ['live', 'export']) {
      const acc = new mod.MeshBuilder({ exportMode: mode === 'export' });
      const built = mod.buildBloomInto(acc, ui, { below: null, capability: cap });
      const fr = built.foot;
      const feet = [];
      const rec = (d, az, layer, slot) => ({ radius: d.radius, overhang: d.overhang, width: d.width, az, ring: d.index, layer, slot, z: d.z, slope: d.slope, arc: d.arc });
      if (fr.continuousMode) {
        fr.rings.forEach((r, k) => feet.push(rec(r, built.slotAzimuths[0][k], 0, k)));
      } else {
        for (let L = 0; L < fr.layerCount; L++) {
          const row = fr.slotRings[L];
          for (let i = 0; i < row.length; i++) feet.push(rec(row[i], built.slotAzimuths[L][i], L, i));
        }
      }
      out[mode] = {
        feet,
        hub: { radius: fr.hub.radius, thickness: fr.hub.thickness, dome: fr.hub.dome ? { rise: fr.hub.dome.rise, riseBuilt: fr.hub.dome.riseBuilt, Rd: fr.hub.dome.Rd, H: fr.hub.dome.H, centreZ: fr.hub.dome.centreZ, clamped: fr.hub.dome.clamped,
          /* THE SPHERE'S OWN (session 18): closed, the equal-area step (for
             the pole readings' window) and the reserved clearance. */
          closed: fr.hub.dome.closed === true, stepCos: fr.hub.dome.stepCos ?? null, reserved: fr.hub.dome.reserved ? { ...fr.hub.dome.reserved } : null, faceReach: fr.hub.dome.faceReach ? { ...fr.hub.dome.faceReach } : null } : null },
        tris: acc.triangleCount,
        petalsBuilt: built.petalsBuilt,
        continuousMode: fr.continuousMode,
        /* One representative petal per descriptor, with its foot frames as
           EMITTED and the slot it was built for — R4's input. */
        reps: built.petals.map((p, i) => (p ? { slotIndex: p.slotIndex, layer: fr.continuousMode ? 0 : fr.rings[i].lambda, frames: p.footFrames } : null)),
      };
    }
    out.app = { liveTris: window.__bloomMetrics().liveTris, hubRadius: window.__bloomMetrics().hubRadius };
    return out;
  }, capability);
}

/* ---------------------------------------------------------------------
   THE PER-ROW MEASUREMENT WITH ITS VALIDITY ASSERTIONS. `stl` is the
   analyzeStl() result of the STL the row actually exported, or null when the
   caller did not export (R1 is then reported as not made, never as passed).
   Returns { bad, r }: `bad` is validity failures (fatal for the run), `r` the
   report crowdingLine() prints. */
export async function footCrowding(page, row, stl = null) {
  const bad = [];
  const F = await readFeet(page, (row && row.capability) || null);
  const E = F.export, Lv = F.live;

  /* R1 */
  let registered = null;
  if (stl) {
    registered = E.tris === stl.tris;
    if (!registered) bad.push(`crowding R1: the in-page export build has ${E.tris} triangles but the exported STL header says ${stl.tris} — the feet this metric read are not the geometry that was exported`);
  }
  /* R2 */
  if (Lv.tris !== F.app.liveTris) bad.push(`crowding R2: the in-page live build has ${Lv.tris} triangles but the app's last build reports ${F.app.liveTris} — the module instance or the state differs from the app's`);
  if (Lv.hub.radius !== F.app.hubRadius) bad.push(`crowding R2: the in-page live hub radius ${Lv.hub.radius} is not the app's ${F.app.hubRadius}`);
  /* R3 */
  for (const [name, M] of [['export', E], ['live', Lv]]) {
    if (M.feet.length !== M.petalsBuilt) bad.push(`crowding R3 (${name}): ${M.feet.length} foot rectangles for ${M.petalsBuilt} petals built — a foot is missing or counted twice`);
  }
  /* R4 — every emitted frame sits where the rectangle model puts it. */
  for (const [name, M] of [['export', E], ['live', Lv]]) {
    M.reps.forEach((rep, i) => {
      if (!rep) { bad.push(`crowding R4 (${name}): descriptor ${i} reports no representative petal`); return; }
      const f = M.feet.find((x) => x.layer === rep.layer && x.slot === rep.slotIndex);
      if (!f) { bad.push(`crowding R4 (${name}): descriptor ${i}'s petal (layer ${rep.layer}, slot ${rep.slotIndex}) has no foot rectangle`); return; }
      if (!Array.isArray(rep.frames) || rep.frames.length !== 3) { bad.push(`crowding R4 (${name}): descriptor ${i} reports ${rep.frames && rep.frames.length} foot frames, expected 3`); return; }
      /* SIGNED, along the slot's own radial direction — not a polar radius.
         A foot that crosses the axis (spread 0.60 at two petals ALL THIN
         reaches -0.894 mm) has an inner row on the FAR side of the origin,
         where hypot() reads the distance unsigned and atan2() reads the
         azimuth 180 deg out. The first draft of this clause did exactly that
         and fired on every axis-crossing foot of the positive control; the
         projection onto the builder's R = [cos az, sin az] is the quantity
         the emitted row actually is, and the cross-component must be zero. */
      const cs = Math.cos(f.az), sn = Math.sin(f.az);
      const dome = M.hub.dome;
      if (dome) {
        /* ON THE DOME: each emitted row sits on the owner's cap at the arc
           position the strip model puts it — the ring row at the ring's own
           arc, the inner rows an overhang/2 and an overhang along the
           meridian toward the apex — with no cross-component. */
        const wantArc = [f.arc - f.overhang, f.arc - f.overhang / 2, f.arc];
        rep.frames.forEach((fr, k) => {
          const proj = fr.C[0] * cs + fr.C[1] * sn;
          const across = -fr.C[0] * sn + fr.C[1] * cs;
          const dz = fr.C[2] - dome.centreZ;
          const dist = Math.hypot(proj, across, dz);
          if (Math.abs(dist - dome.Rd) > 1e-9) bad.push(`crowding R4 (${name}): descriptor ${i} foot row ${k} is ${dist} mm from the cap's centre, the cap's radius is ${dome.Rd} — the foot is not on the surface this metric rasterises`);
          const arc = dome.Rd * Math.atan2(proj, dz);
          if (Math.abs(arc - wantArc[k]) > 1e-9) bad.push(`crowding R4 (${name}): descriptor ${i} foot row ${k} sits ${arc} mm along its meridian, the strip model puts it at ${wantArc[k]} — the foot is not where footRing() says it lands`);
          /* THE RESERVED POLE (session 18): on the closed sphere no emitted
             foot row may lie at or past the far pole — a row there would be
             a foot on the point a stem is reserved for, and `atan2` would
             read it as the far side of another meridian. */
          if (dome.closed && !(arc < Math.PI * dome.Rd - 1e-9)) bad.push(`crowding R4 (${name}): descriptor ${i} foot row ${k} sits ${arc} mm along its meridian, at or past the reserved pole (${Math.PI * dome.Rd} mm)`);
          if (Math.abs(across) > 1e-9) bad.push(`crowding R4 (${name}): descriptor ${i} foot row ${k} is ${across} mm off its slot's meridian — the emitted foot and the recorded azimuth disagree`);
          if (k === 2 && fr.C[2] !== f.z) bad.push(`crowding R4 (${name}): descriptor ${i} ring row is at z = ${fr.C[2]}, footRing() puts the ring at ${f.z}`);
          if (fr.h !== f.width / 2) bad.push(`crowding R4 (${name}): descriptor ${i} foot row ${k} half-width ${fr.h} is not width/2 = ${f.width / 2}`);
        });
        return;
      }
      const wantS = [f.radius - f.overhang, f.radius - f.overhang / 2, f.radius];
      rep.frames.forEach((fr, k) => {
        const along = fr.C[0] * cs + fr.C[1] * sn;
        const across = -fr.C[0] * sn + fr.C[1] * cs;
        if (Math.abs(along - wantS[k]) > 1e-9) bad.push(`crowding R4 (${name}): descriptor ${i} foot row ${k} sits ${along} mm along its slot's radial direction, the rectangle model puts it at ${wantS[k]} — the foot is not where footRing() says it lands`);
        if (Math.abs(across) > 1e-9) bad.push(`crowding R4 (${name}): descriptor ${i} foot row ${k} is ${across} mm off its slot's radial line — the emitted foot and the recorded azimuth disagree`);
        if (fr.C[2] !== 0) bad.push(`crowding R4 (${name}): descriptor ${i} foot row ${k} is at z = ${fr.C[2]}, not in the base plane this metric rasterises`);
        if (fr.h !== f.width / 2) bad.push(`crowding R4 (${name}): descriptor ${i} foot row ${k} half-width ${fr.h} is not width/2 = ${f.width / 2}`);
      });
    });
  }

  /* THE NUMBERS, export first, then live for the divergence line. */
  const cell = cellFor(E.hub.radius);
  const domeE = E.hub.dome, domeL = Lv.hub.dome;
  const fine = stackDepth(E.feet, E.hub.radius, cell, domeE);
  const coarse = stackDepth(E.feet, E.hub.radius, cell * 2, domeE);
  /* THE LOCAL RESOLUTION OF D_MAX — see the header's R5 note. The hub pass
     locates the candidates; the two local passes decide the number. */
  /* The coarse pass's own maximum cell is seeded into the candidates: on a
     fused base hundreds of cells share the top readings and the cap could
     otherwise leave the coarse pass's peak outside every window, which
     would trip the "a window missed the cell" clause for a sampling reason. */
  const seeded = { ...fine, candidates: [...fine.candidates, ...(fine.closed ? (coarse.dmaxST ? [{ c: coarse.dmaxST, d: coarse.dmax }] : []) : (coarse.dmaxXY ? [{ c: coarse.dmaxXY, d: coarse.dmax }] : []))] };
  const r8 = refineDepth(E.feet, seeded, cell / 8, domeE);
  const r16 = refineDepth(E.feet, seeded, cell / 16, domeE);
  /* R5 */
  if (r8.dmax !== r16.dmax) bad.push(`crowding R5: D_max reads ${r8.dmax} at cell ${cell / 8} mm and ${r16.dmax} at ${cell / 16} mm around the hub pass's candidates (hub pass ${fine.dmax} / ${coarse.dmax}) — the reading depends on the sampling, so it is not a reading`);
  if (r16.dmax < fine.dmax || r16.dmax < coarse.dmax) bad.push(`crowding R5: the local passes read D_max ${r16.dmax} but the hub pass read ${fine.dmax} / ${coarse.dmax} — a window missed the cell it was centred on`);
  if (fine.dmean > 0 && Math.abs(fine.dmean - coarse.dmean) > 0.005 * fine.dmean) bad.push(`crowding R5: D_mean reads ${fine.dmean.toFixed(4)} at cell ${cell} mm and ${coarse.dmean.toFixed(4)} at ${cell * 2} mm — more than 0.5% apart`);
  /* The reading is the resolved one; where the hub pass already had it (every
     shipped row) the two are equal and `dmaxPass` says so. */
  const resolved = { dmax: r16.dmax, dmaxAt: r16.dmaxAt, pass: r16.dmax === fine.dmax ? 'hub' : 'local' };
  /* THE LIVE READING, for the divergence line only. Whenever the export
     floor does not bind the two geometries are the same feet on the same hub
     (the same doubles — asserted, not assumed), so the export raster IS the
     live one and is reused; only a row where the floor moved the ring pays
     for a second raster. */
  const sameFeet = Lv.hub.radius === E.hub.radius && Lv.feet.length === E.feet.length
    && ((domeL === null) === (domeE === null)) && (!domeE || (domeL.Rd === domeE.Rd && domeL.centreZ === domeE.centreZ))
    && Lv.feet.every((f, i) => f.radius === E.feet[i].radius && f.overhang === E.feet[i].overhang && f.width === E.feet[i].width && f.az === E.feet[i].az && f.arc === E.feet[i].arc);
  const live = sameFeet
    ? { dmax: resolved.dmax, dmean: fine.dmean }
    : (() => {
        /* Resolved the same way as the export reading, so the divergence line
           compares like with like; not asserted, because it is a diagnostic
           and the export number is the reading. */
        const lf = stackDepth(Lv.feet, Lv.hub.radius, cellFor(Lv.hub.radius), domeL);
        return { dmax: refineDepth(Lv.feet, lf, cellFor(Lv.hub.radius) / 16, domeL).dmax, dmean: lf.dmean };
      })();
  const nn = nearestFeet(E.feet, domeE);

  const r = {
    n: E.feet.length,
    hubR: E.hub.radius, hubRLive: Lv.hub.radius,
    footW: E.feet[0].width, footWLive: Lv.feet[0].width,
    dmax: resolved.dmax, dmaxAt: resolved.dmaxAt, dmaxPass: resolved.pass, hubPassDmax: fine.dmax,
    dmean: fine.dmean, union: fine.union, sumArea: fine.sumArea, cell,
    liveDmax: live.dmax, liveDmean: live.dmean,
    nn: { q: nn.all.q, d: nn.all.d, gap: nn.all.gap, a: nn.all.a && `${nn.all.a.layer}/${nn.all.a.slot}`, b: nn.all.b && `${nn.all.b.layer}/${nn.all.b.slot}` },
    nnAdjacent: { q: nn.adjacent.q, d: nn.adjacent.d },
    crowded: resolved.dmax >= CROWDED_DMAX,
    registered,
    exportTris: E.tris,
    /* THE DOME'S READING beside the number: the rise built, and the local
       relief at the point D_max was found — the factor the dome actually
       delivered where the crowding is, against the rim's, where it is not. */
    dome: domeE ? { rise: domeE.rise, riseBuilt: domeE.riseBuilt, Rd: domeE.Rd, clamped: domeE.clamped,
      reliefAtDmax: resolved.dmaxAt ? reliefAt(domeE, Math.min(resolved.dmaxAt.r, domeE.Rd)) : null,
      reliefAtRim: reliefAt(domeE, Math.min(E.hub.radius, domeE.Rd)),
      /* THE SPHERE (session 18): the pole readings from the hub pass (the
         deepest cell within one equal-area step of each pole), the reserved
         clearance from the owner, and where D_max sits in polar angle. */
      closed: domeE.closed === true, poles: fine.poles, reserved: domeE.reserved, faceReach: domeE.faceReach,
      dmaxPolarDeg: resolved.dmaxAt && resolved.dmaxAt.polarDeg != null ? resolved.dmaxAt.polarDeg : null } : null,
  };
  return { bad, r };
}

/* One line, every gate row. EXPORT numbers; live printed only where it
   differs, on the print-truth line's discipline. */
export function crowdingLine(r) {
  const at = r.dmaxAt ? ` at r ${r.dmaxAt.r.toFixed(2)} mm` : '';
  const diverges = r.liveDmax !== r.dmax || Math.abs(r.liveDmean - r.dmean) > 0.005;
  return `CROWDING (export): feet ${r.n} · stack D_max ${r.dmax}${at}${r.dmaxPass === 'local' ? ` (resolved locally; hub-pitch raster read ${r.hubPassDmax})` : ''} · D_mean ${r.dmean.toFixed(2)}`
    + ` · foot ${r.footW.toFixed(2)} mm on hub ${r.hubR.toFixed(2)} mm`
    + ` · NN ${isFinite(r.nn.q) ? r.nn.q.toFixed(2) + ' w (gap ' + r.nn.gap + ')' : 'n/a'}`
    + (diverges ? ` · live reads D_max ${r.liveDmax} · D_mean ${r.liveDmean.toFixed(2)} (ring ${r.hubRLive.toFixed(2)} mm)` : '')
    + (r.dome && r.dome.closed
      ? ` · SPHERE radius ${r.dome.Rd.toFixed(2)} mm${r.dome.clamped ? ' (CLAMPED at one sheet)' : ''} · D_max at polar ${r.dome.dmaxPolarDeg != null ? r.dome.dmaxPolarDeg.toFixed(1) + '°' : 'n/a'}`
        + (r.dome.poles ? ` · within one step (${r.dome.poles.withinMm.toFixed(2)} mm) of the FACE pole D ${r.dome.poles.face}, of the RESERVED pole D ${r.dome.poles.reserved}` : '')
        + (r.dome.reserved ? ` · reserved pole clear by ${r.dome.reserved.mm.toFixed(2)} mm` : '')
      : r.dome ? ` · DOME rise ${r.dome.riseBuilt.toFixed(2)}${r.dome.clamped ? ' (CLAMPED from ' + r.dome.rise.toFixed(2) + ')' : ''} · local relief at D_max ${isFinite(r.dome.reliefAtDmax) ? r.dome.reliefAtDmax.toFixed(2) + 'x' : 'vertical'}, at the rim ${isFinite(r.dome.reliefAtRim) ? r.dome.reliefAtRim.toFixed(2) + 'x' : 'vertical'}` : '')
    + (r.crowded ? ` · CROWDED (D_max >= ${CROWDED_DMAX}, Eva Sep 3)` : '');
}

/* MATRIX-LEVEL: the flag in both directions. A flag that never raises on
   the matrix is a flag nobody has seen work; one that raises on every row
   is stuck on. Returns failure strings. */
export function crowdingCoverage(reports) {
  const bad = [];
  const raised = reports.filter((r) => r.crowded).length;
  if (reports.length && raised === 0) bad.push(`crowding coverage: no row in this matrix raises CROWDED — the raised state is unexercised (a default is not coverage; name a row that reaches D_max >= ${CROWDED_DMAX})`);
  if (reports.length && raised === reports.length) bad.push('crowding coverage: every row raises CROWDED — the flag is stuck on');
  return bad;
}

/* ---------------------------------------------------------------------
   STANDALONE: the ruled configs, with numbers, and nothing else. */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));
  const CONFIGS = [
    ['MUM (Eva\'s run, ruled BAD)', { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 0.6, petalLength: 60, petalWidth: 8, layerSize: 0.8, layerTilt: 11, sheetThickness: 0.6, footDelicacy: 0.25 }],
    ['DEFAULT (ruled clean)', {}],
    ['LAYERED depth cell, 3 x 0.90 x tilt 12 (ruled clean)', { layerCount: 3, layerSize: 0.9 }],
    ['CONTINUOUS headline, 40/turn x 3, spread 1.55 (ruled clean, merged)', { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 1.55 }],
    ['RADIAL x 40 (unruled)', { petalCount: 40 }],
    ['RADIAL x 40 x spread 0.60 (unruled)', { petalCount: 40, spread: 0.6 }],
    ['MUM x head rise 0.50 (the dome, Sep 4)', { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 0.6, petalLength: 60, petalWidth: 8, layerSize: 0.8, layerTilt: 11, sheetThickness: 0.6, footDelicacy: 0.25, headRise: 0.5 }],
    ['MUM x head rise 1.00 (a hemisphere)', { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 0.6, petalLength: 60, petalWidth: 8, layerSize: 0.8, layerTilt: 11, sheetThickness: 0.6, footDelicacy: 0.25, headRise: 1 }],
    ['INCURVE target, flat', { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 1.6, petalLength: 20, petalWidth: 8, layerSize: 0.9, petalTilt: 75, layerTilt: 5, petalSpineCurl: 150, sheetThickness: 0.6, footDelicacy: 0.25 }],
    ['INCURVE target x head rise 0.50', { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 1.6, petalLength: 20, petalWidth: 8, layerSize: 0.9, petalTilt: 75, layerTilt: 5, petalSpineCurl: 150, sheetThickness: 0.6, footDelicacy: 0.25, headRise: 0.5 }],
    ['INCURVE sliders on a FULL SPHERE (session 18)', { placement: 'CONTINUOUS', hubShape: 'SPHERE', petalCount: 40, layerCount: 3, spread: 1.6, petalLength: 20, petalWidth: 8, layerSize: 0.9, petalTilt: 75, layerTilt: 5, petalSpineCurl: 150, sheetThickness: 0.6, footDelicacy: 0.25 }],
    ['40 per turn x 6 turns on a FULL SPHERE (240 feet)', { placement: 'CONTINUOUS', hubShape: 'SPHERE', petalCount: 40, layerCount: 6 }],
  ];
  const { server, port } = await serveRepo();
  const { browser, page } = await launchPage();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-crowding-'));
  const validity = [];
  console.log(`foot crowding — export mode. SCOPE: ${CROWDING_SCOPE}\n`);
  for (const [label, cfg] of CONFIGS) {
    await openBloom(page, port);
    const bad = await applyConfig(page, set(cfg));
    if (bad.length) { validity.push(`${label}: ${bad.join('; ')}`); continue; }
    const drift = await fullStateDrift(page, set(cfg));
    if (drift.length) { validity.push(`${label}: ${drift.join('; ')}`); continue; }
    const buf = await exportStl(page, tmp);
    if (!buf) { validity.push(`${label}: no STL download`); continue; }
    const { bad: cb, r } = await footCrowding(page, { label, set: set(cfg) }, analyzeStl(buf));
    if (cb.length) validity.push(`${label}: ${cb.join('; ')}`);
    console.log(`  ${label}\n    ${crowdingLine(r)}\n    index-adjacent NN would read ${isFinite(r.nnAdjacent.q) ? r.nnAdjacent.q.toFixed(2) + ' w' : 'n/a'} · registered against the STL: ${r.registered}`);
  }
  await browser.close(); server.close(); fs.rmSync(tmp, { recursive: true, force: true });
  if (validity.length) {
    console.error(`\nHARNESS INVALID — ${validity.length} validity assertion(s) failed:`);
    for (const v of validity) console.error(`  - ${v}`);
    process.exit(1);
  }
}
