/* ===================================================================
   bloom-geometry.js — geometry builders for the Parametric Bloom.

   NEW CODE. Machinery patterns are ported from the flower project by rewrite
   (closed-solid construction, export-mode thickness floor, one-owner
   boundaries); no flower geometry code is copied. Charter: docs/bloom-charter.md.

   UNITS: millimetres, live and export alike. The flower splits world units
   from mm at export and that split has confused triangle-count reporting
   (live and export counts are not convertible); the bloom avoids the unit
   split entirely. Counts still differ by MODE (the export floor changes
   geometry), so every printed count must be labelled live or export.

   EXPORT CONTRACT (same as the flower's, restated for this codebase): every
   primitive is an individually closed solid, so the exported STL has ZERO
   boundary edges. Overlapping closed solids are fine — the slicer unions
   them. Never a bare single-sided surface or zero-thickness membrane.

   THE INVARIANT: the model is always ONE connected watertight solid. The hub
   (the derived junction) is UNCONDITIONAL — built for every design, at every
   slider position. It is plumbing, not the designed center (that is phase 2).
   =================================================================== */

/* MIN_FEATURE_MM = 1.0 is an ASSUMPTION, not a measurement. Nothing in this
   project family has ever been printed; the flower uses 0.8 mm on the same
   theory. 1.0 mm is the sheet-petal floor until a printed min-wall coupon
   replaces the guess with a number (charter, "Standing gaps"). Applied only
   in export mode, like the flower's floor. */
export const MIN_FEATURE_MM = 1.0;

/* Live sheet thickness. Above the export floor, so default exports are
   byte-stable against the floor kicking in. */
export const SHEET_THICKNESS_MM = 1.2;

/* MeshBuilder — flat triangle-soup accumulator (positions only; the app wraps
   it in a three.js BufferGeometry, the exporter reads it directly). Rewritten
   from the flower's MeshAccumulator idea: the one behavior that matters here
   is the export-mode thickness floor. */
export class MeshBuilder {
  constructor({ exportMode = false } = {}) {
    this.exportMode = !!exportMode;
    this.positions = [];          // 9 floats per triangle
    this.minThickness = Infinity; // telemetry: thinnest floored sheet emitted
    /* Bounding box of everything emitted, accumulated as triangles arrive.
       THE ONE OWNER of the model's extent: the readout reads this rather than
       measuring the BufferGeometry separately, so live and export can each
       report their own (the export floor changes geometry, so the two are
       different numbers and each is labelled). The camera's bounding SPHERE
       is a different quantity for a different job and stays where it is. */
    this.lo = [Infinity, Infinity, Infinity];
    this.hi = [-Infinity, -Infinity, -Infinity];
  }
  /* Extent along each axis, and the max bounding dimension in mm — the number
     that decides whether a design fits a given process. SLS nests in any
     orientation, so the only question is whether the box fits. */
  get boundingSize() {
    if (!isFinite(this.lo[0])) return [0, 0, 0];
    return [this.hi[0] - this.lo[0], this.hi[1] - this.lo[1], this.hi[2] - this.lo[2]];
  }
  get maxDimensionMm() { return Math.max(...this.boundingSize); }
  /* Every solid's thickness passes through here. Floored ONLY at export, so
     the live view shows the authored value and the print never goes below
     the printable minimum. */
  floorThickness(t) {
    const f = this.floorFeature(t);
    if (this.exportMode && f < this.minThickness) this.minThickness = f;
    return f;
  }
  /* The same floor, for a feature that is NOT a sheet thickness — a dome's
     height, a torus tube's diameter, a dished button's residual wall. Same
     rule, one definition; only floorThickness() feeds the `min sheet`
     telemetry, so that readout keeps meaning what its label says. */
  floorFeature(x) { return this.exportMode ? Math.max(x, MIN_FEATURE_MM) : x; }
  tri(a, b, c) {
    this.positions.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    for (const p of [a, b, c]) {
      for (let k = 0; k < 3; k++) { if (p[k] < this.lo[k]) this.lo[k] = p[k]; if (p[k] > this.hi[k]) this.hi[k] = p[k]; }
    }
  }
  /* Quad a-b-c-d (counter-clockwise seen from outside) as two triangles. */
  quad(a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); }
  get triangleCount() { return this.positions.length / 9; }
}

const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ===================================================================
   footRing(state, acc) — THE ONE OWNER of the foot boundary.

   Defines (a) the circle petal feet land on and (b) the foot cross-section.
   The petal builder reads it; the hub reads it; the phase-2 center builder
   will read it. No consumer ever computes its own copy — that rule is the
   registration rule from the flower project, and every registration bug there
   was a consumer inventing a private copy of a boundary.

   RADIUS IS DERIVED AND THEN SCALED. The area rule r_ring² = Σ r_foot² sizes
   the circle from what feeds it, where r_foot is the effective radius of one
   foot's cross-section (width × thickness → the circle of equal area). That
   derived value is then multiplied by `spread`, and THIS IS THE ONLY PLACE
   `spread` EXISTS in the geometry — every consumer reads the scaled `radius`
   and expresses its own dimensions as fractions of it, so nothing downstream
   knows or needs to know that spread happened.

   `derivedRadius` is returned for TELEMETRY ONLY. Nothing geometric may read
   it: the moment something does, there are two radii and the one-owner rule
   is gone (Eva's phase-2 note, and the flower's most repeated defect).

   Byte-safety at the default: `x * 1.0 === x` exactly in IEEE-754, so at
   spread 1.00 this function returns bit-identical values to the pre-spread
   code. The default is byte-identical BY CONSTRUCTION; the byte-diff run
   confirms it rather than establishing it.

   BELOW 1.00 the ring is tighter than the area rule's derived radius (Eva,
   Aug 31: the area rule is a reference, not a cage). Feet crowd, overlap each
   other, and at the extreme cross the axis. That stays watertight — each foot
   is its own closed solid — and stays connected, because the hub still spans
   the ring. It is a design state, not a defect.

   Feet land ON the circle and run inward past it (`overhang`), so the hub — a
   slab of exactly this radius — always reaches every foot by construction.
   `overhang` is expressed in the same units as `radius` (max(1.5, 0.4·r)), so
   the foot–hub overlap is 40% of the ring radius at EVERY spread: the
   guarantee is scale-free, not tuned to one radius.

   Takes the accumulator because the foot thickness is floored geometry: the
   ring's answer in export mode must match what the solids are actually built
   at, or the area rule would size the junction from a thickness nothing has. */
export function footRing(state, acc) {
  const thickness = acc.floorThickness(SHEET_THICKNESS_MM);
  /* Foot width follows the petal it feeds — a fraction of blade width with a
     floor so very narrow petals keep a printable root. */
  const width = clamp(state.petalWidth * 0.4, 3, 10);
  const rFoot = Math.sqrt((width * thickness) / Math.PI);
  const derivedRadius = rFoot * Math.sqrt(state.petalCount);   // area rule
  const radius = derivedRadius * state.spread;                 // the ONLY use of spread
  /* How far inside the ring each foot continues, so foot–hub overlap is a
     solid annulus, not a hairline touch. */
  const overhang = Math.max(1.5, radius * 0.4);
  return { radius, derivedRadius, width, thickness, overhang };
}

/* ===================================================================
   buildWhorlInto — the arrangement primitive, built as a whorl from day one
   (charter: "Arrangement facts worth having on day one"). Full signature
   (count, radius, height, sizeRamp, angleRamp, phase, blade) even though
   phase 1 feeds several of them constants; sepals / epicalyx / involucre
   later are then more whorls, not a refactor.

   No golden-angle / spiral placement exists in phase 1 at all — slots are
   evenly spaced, so the "gate phyllotaxis below n≈8" rule does not yet bind.
   If spiral placement is added, gate or flag it below 8 petals (charter). */
export function buildWhorlInto({ count, radius, height, sizeRamp, angleRamp, phase, blade }) {
  for (let i = 0; i < count; i++) {
    blade({
      index: i,
      azimuth: phase + (i * TAU) / count,
      radius,
      z: height,
      scale: sizeRamp(i, count),
      tiltExtra: angleRamp(i, count),
    });
  }
}

/* ===================================================================
   THE PETAL SILHOUETTE MODEL — a width PROFILE over a trimmable DOMAIN.

   This replaces the placeholder ovate (37e160d..21d4602) with the real
   model. It is architected for CLAW and CLEFT from day one even though
   neither ships: those were the flower project's two hard absences, and
   retrofitting them is the expensive path this project exists to avoid
   (charter, "Phase 3 entry"). Neither is a control; both are proven by
   non-shipping capability rows in the gates, never by this sentence.

   BYTE-IDENTITY AT DEFAULTS IS A PROPERTY OF THE CODE, not a lucky result.
   Three things make it hold, and each is load-bearing:
     - the CORE term evaluates the SAME expression in the SAME order as the
       placeholder's `halfW * (u^a (1-u)^b) / gPk`, with a and b now read
       from controls whose defaults are exactly 1.0 and 1.8;
     - the TIP_PLATEAU term evaluates to EXACTLY 0 at its default, and
       `Math.max(x, 0) === x` for every x >= 0 (verified over the range);
     - the default domain is the single span [-1, 1], and the span-form
       column map `vLo + ((vHi - vLo) * j) / (NV - 1)` is bit-identical to
       the placeholder's `-1 + (2 * j) / (NV - 1)` for every j (verified for
       all ten columns; vHi - vLo is exactly 2).
   Change any of those three and the byte report is the thing that tells
   you — it is a two-sided measurement, not a hope.

   WHERE THE PROFILE'S INFLUENCE BEGINS: strictly at s > 0, the blade rows.
   THE FOOT IS NOT TOUCHED BY ANYTHING IN THIS FILE'S SILHOUETTE LAYER. The
   three foot rows are flat in the hub plane at half-width ring.width / 2,
   landing on ring.radius and running inward by ring.overhang — all four
   quantities owned by footRing() and none of them a function of the
   silhouette. That is why the junction argument is unchanged: the hub is a
   disc of ring.radius, the feet overlap it by a fixed FRACTION of the ring,
   and no profile or trim setting can move either. Measured per row, before
   and after, by `node tools/diff-bloom-bytes.mjs --region foot`.

   THE COMBINATOR IS PLAIN Math.max, AND THAT IS SETTLED (Eva, Aug 31). One
   combinator for the shape terms and the floors alike, trivially bit-exact.
   It puts a C0 kink at each crossover; the placeholder already had two and
   they read fine. The worst reachable case — max tip breadth against the
   steepest falling core — was PHOTOGRAPHED tip-cropped rather than
   pre-engineered away, and Eva ruled from that picture that it reads fine.
   NO p-norm blend is queued and none should be written: it would need
   term-count switching to stay bit-exact plus an epsilon story about the
   moment a term appears, bought against a corner nobody objected to on
   sight. Do not reopen this from reading the code and imagining the corner
   — the picture exists (tools/shot-bloom-silhouette.mjs), and a fresh
   ruling needs a fresh picture.

   NO FORM WORK LIVES HERE. Cup, spine curl, cross-section roll and twist
   are the NEXT session (charter: the four curve terms). Sheets stay flat:
   one normal per row, constant across the width, exactly as before.
   =================================================================== */

/* The blunt-tip floor. A zero-width tip row would collapse the rim strip
   into degenerate triangles, so the tip is blunted rather than pinched. */
export const TIP_HALF_MM = 0.8;
/* Where the foot's width stops floor-ing the blade. Frozen at the
   placeholder's value — moving it moves every export. */
const ROOT_BLEND_END = 0.30;
const NU = 28;   // blade rows
const NV = 10;   // columns across one span
/* How many rows adjacent panels share. ONE gives a real overlapping VOLUME:
   both panels occupy the slab between these rows, so the slicer unions
   solid material rather than being asked to join two shells that merely
   touch on a plane.

   WHAT THE POSITIVE CONTROL ACTUALLY MEASURED (Aug 31), because the obvious
   reading of this constant is wrong and cost a run to find out:
     - overlap 1  -> 15,136 tris, ONE connected component. Ships.
     - overlap 0  -> 14,496 tris, still ONE connected component. The lobe
                    panels start on the base panel's LAST row, so the two
                    share a cross-section exactly. That is a coincident face,
                    not a gap, and the connectedness gate reads it as joined
                    — correctly, and consistently with its own documented
                    limit that two solids grazing within one cell read as
                    connected. So overlap 0 is NOT the failure mode.
     - overlap -1 -> 13,856 tris, FIVE components, 10.86% of the surface
                    detached, gate exit 1. The lobes start one row ABOVE the
                    base panel, leaving a genuine 1.25 mm gap at the defaults
                    — wider than the 0.6 mm voxel. THIS is the failure this
                    machinery can actually produce, and it is the one the
                    gate can observe. Boundary edges stayed 0 throughout:
                    watertight and in five pieces at the same time, which is
                    exactly why connectedness is a separate gate.
   The gate therefore cannot distinguish overlap 1 from overlap 0. One is
   chosen over zero on slicer-robustness grounds — shared volume rather than
   a zero-thickness coincident touch — and that is an ARGUMENT, not a
   measurement, until something prints. Do not read the gate as endorsing it.
   The mutation lives in a throwaway worktree, never as a switch that ships. */
const PANEL_OVERLAP_ROWS = 1;

/* ===================================================================
   widthProfile — THE ONE OWNER of "how wide is the blade at u".

   The profile is a TERM LIST combined by max, floored by the printability
   and continuity clamps. Each term carries its own domain [from, to] and
   contributes nothing outside it — which is what lets a term NARROW the
   blade (by restricting the core's domain) rather than only widen it. A
   pure max-envelope cannot express a claw; a domained one can.

   SHIPPED TERMS
     CORE          the power curve u^a (1-u)^b, a = petalBaseTaper,
                   b = petalTipTaper. Every member of this family is pinched
                   to a point at BOTH ends (w(0) = w(1) = 0 for all a,b > 0),
                   which is exactly why TIP_PLATEAU has to exist.
     TIP_PLATEAU   rises from 0 at the widest point to petalTipBreadth of
                   the max half-width at the tip. The only shipped term that
                   reaches outside the exponent family — truncate and
                   rounded tips (rose, poppy) are unreachable without it.
                   EXACTLY ZERO at its default, so it cannot move a byte.

   CAPABILITY TERM — non-shipping, reachable only through the harness hook
     STALK         a narrow constant below `until`, which also restricts
                   CORE's domain to [until, 1] and suppresses the root
                   blend. The result is narrower than BOTH its foot and its
                   blade — a strict interior local minimum in the row
                   half-widths, which is what a claw IS and what the gate
                   asserts. Non-monotone, proven rather than claimed.

   FLOORS (hard clamps, not shape — one owner, this list)
     rootBlend     the foot's own half-width, decaying to zero by
                   ROOT_BLEND_END, so blade and foot meet without a waist.
                   Reads ring.width — footRing() is the owner, this is a
                   consumer. Suppressed only by STALK, which is the claw's
                   shoulder and is deliberate.
     TIP_HALF_MM   the blunt-tip floor.
   =================================================================== */
export function widthProfile(state, ring, halfW, cap) {
  const a = state.petalBaseTaper;
  const b = state.petalTipTaper;
  const uPk = a / (a + b);                                     // the derived widest point
  const gPk = Math.pow(uPk, a) * Math.pow(1 - uPk, b);         // normalise the peak to 1
  const core = (u) => (Math.pow(u, a) * Math.pow(1 - u, b)) / gPk;
  const footHalf = ring.width / 2;
  const stalk = (cap && cap.stalk) || null;

  const terms = [
    { name: 'CORE', from: stalk ? stalk.until : 0, to: 1, at: (u) => halfW * core(u) },
    { name: 'TIP_PLATEAU', from: 0, to: 1,
      at: (u) => state.petalTipBreadth * halfW * clamp((u - uPk) / (1 - uPk), 0, 1) },
  ];
  if (stalk) terms.push({ name: 'STALK', from: 0, to: stalk.until, at: () => stalk.halfWidth });

  /* The claw's shoulder: a stalk narrower than the foot is the whole point,
     so the foot-continuity floor stands down for it — and ONLY for it. */
  const rootBlend = stalk ? () => 0 : (u) => footHalf * Math.max(0, 1 - u / ROOT_BLEND_END);

  return {
    uPk, terms, footHalf,
    halfWidthAt(u) {
      let shape = 0;
      for (const t of terms) {
        if (u < t.from || u > t.to) continue;
        const v = t.at(u);
        if (v > shape) shape = v;
      }
      return Math.max(shape, rootBlend(u), TIP_HALF_MM);
    },
  };
}

/* ===================================================================
   trimPanels — THE ONE OWNER of the petal's domain decomposition.

   The petal's boundary is a TRIMMABLE DOMAIN: per row, which spans of the
   cross-width coordinate v carry material. The default is one span over
   every row. A CLEFT is two spans with a gap, and the machinery that makes
   that watertight is the reason this abstraction exists at all.

   A PANEL IS A SINGLE-SPAN QUAD GRID over a contiguous run of rows, closed
   on its own (two faces + two side rims + two end caps). That is the whole
   trick: a clefted petal is not one grid with a hole, it is a base panel
   plus two lobe panels, each individually closed — so the export contract
   (every primitive an individually closed solid, zero boundary edges) holds
   by construction rather than by argument about the sinus.

   The lobe panels start PANEL_OVERLAP_ROWS below the split and evaluate
   their span there too, so they reach DOWN INTO the base panel's material.
   The shared slab is a real overlapping volume, which is what makes the
   three solids one connected body. See PANEL_OVERLAP_ROWS above for what
   happens when that overlap is dropped, and why it is the positive control.
   =================================================================== */
export function trimPanels(rowCount, uAt, cap) {
  const cleft = (cap && cap.cleft) || null;
  if (!cleft) return [{ label: 'full', rowFrom: 0, rowTo: rowCount - 1, spanAt: () => [-1, 1] }];

  let mSplit = rowCount - 1;
  for (let i = 0; i < rowCount; i++) { if (uAt(i) > cleft.from) { mSplit = i; break; } }
  const gHalf = cleft.gap / 2;
  const lobeFrom = Math.max(0, mSplit - PANEL_OVERLAP_ROWS);
  return [
    { label: 'base', rowFrom: 0, rowTo: mSplit, spanAt: () => [-1, 1] },
    { label: 'lobe-', rowFrom: lobeFrom, rowTo: rowCount - 1, spanAt: () => [-1, -gHalf] },
    { label: 'lobe+', rowFrom: lobeFrom, rowTo: rowCount - 1, spanAt: () => [gHalf, 1] },
  ];
}

/* ===================================================================
   buildPetalInto — one petal: thin SOLID sheet panels, closed by
   construction.

   Layout along the local length coordinate s, unchanged from the
   placeholder because the FOOT IS SETTLED AND OWNED:
     s in [-overhang, 0]   the FOOT — flat in the hub plane (z = ring
                           plane), constant half-width ring.width / 2. Three
                           rows. The silhouette layer never writes these.
     s in (0, length]      the BLADE — tilted by petalTilt about the ring
                           tangent, half-width from widthProfile(), domain
                           from trimPanels(). 28 rows.

   Returns the petal's own measurements for the metrics hook, so the gates
   and the contact sheet ASK THE BUILDER rather than recomputing anything.
   =================================================================== */
export function buildPetalInto(acc, state, ring, slot, cap = null) {
  const t = acc.floorThickness(SHEET_THICKNESS_MM);
  const length = state.petalLength * slot.scale;
  const tilt = ((state.petalTilt + slot.tiltExtra) * Math.PI) / 180;
  const halfW = (state.petalWidth * slot.scale) / 2;
  const footHalf = ring.width / 2;

  /* Local frame: R radial (out), T tangent, Z up. */
  const cosA = Math.cos(slot.azimuth), sinA = Math.sin(slot.azimuth);
  const R = [cosA, sinA, 0];
  const T = [-sinA, cosA, 0];
  const Z = [0, 0, 1];

  const profile = widthProfile(state, ring, halfW, cap);

  /* Row list: foot rows (flat), then blade rows. Each row: mid-surface
     centre point C, per-row unit normal N (constant across the width — the
     sheet is flat across its width; no cup, no roll, no twist in phase 3),
     half-width h, and u (0 through the foot, i/NU on the blade). */
  const rows = [];
  const footS = [-ring.overhang, -ring.overhang / 2, 0];
  for (const s of footS) {
    rows.push({
      C: [R[0] * (ring.radius + s), R[1] * (ring.radius + s), slot.z],
      N: Z, h: footHalf, u: 0,
    });
  }
  const dir = [R[0] * Math.cos(tilt), R[1] * Math.cos(tilt), Math.sin(tilt)];       // blade direction
  const nrm = [-R[0] * Math.sin(tilt), -R[1] * Math.sin(tilt), Math.cos(tilt)];     // blade sheet normal
  for (let i = 1; i <= NU; i++) {
    const u = i / NU;
    const s = u * length;
    rows.push({
      C: [ring.radius * R[0] + dir[0] * s, ring.radius * R[1] + dir[1] * s, slot.z + dir[2] * s],
      N: nrm, h: profile.halfWidthAt(u), u,
    });
  }

  const panels = trimPanels(rows.length, (i) => rows[i].u, cap);
  for (const panel of panels) emitPanel(acc, rows, panel, t, T);

  const midS = 0.5 * length;
  return {
    /* Row half-widths, FOOT ROWS INCLUDED — a claw is narrower than both
       its foot and its blade, so the foot rows are part of the evidence. */
    profile: rows.map((r) => r.h),
    footRows: footS.length,
    panels: panels.map((p) => p.label),
    tipSpans: panels.filter((p) => p.rowTo === rows.length - 1).length,
    mid: [ring.radius * R[0] + dir[0] * midS, ring.radius * R[1] + dir[1] * midS, slot.z + dir[2] * midS],
    /* The blade's own sheet normal — what a face-on view of the SILHOUETTE
       must look down. Reported rather than re-derived by the shot tool: a
       consumer recomputing this from tilt and azimuth would be a second
       owner of the petal frame. */
    normal: nrm,
    tip: [ring.radius * R[0] + dir[0] * length, ring.radius * R[1] + dir[1] * length, slot.z + dir[2] * length],
  };
}

/* One panel: a single-span quad grid, individually closed. Emission order
   is the placeholder's exactly — all face quads, then both side rims, then
   the two end caps — because at the default there is exactly ONE panel and
   the byte report is a two-sided assertion that nothing moved. */
function emitPanel(acc, rows, panel, t, T) {
  const top = [], bot = [];
  for (let i = panel.rowFrom; i <= panel.rowTo; i++) {
    const row = rows[i];
    const span = panel.spanAt(i);
    const vLo = span[0], vHi = span[1];
    const ht = [], hb = [];
    for (let j = 0; j < NV; j++) {
      const v = vLo + ((vHi - vLo) * j) / (NV - 1);
      const P = [
        row.C[0] + T[0] * row.h * v,
        row.C[1] + T[1] * row.h * v,
        row.C[2] + T[2] * row.h * v,
      ];
      ht.push([P[0] + row.N[0] * t / 2, P[1] + row.N[1] * t / 2, P[2] + row.N[2] * t / 2]);
      hb.push([P[0] - row.N[0] * t / 2, P[1] - row.N[1] * t / 2, P[2] - row.N[2] * t / 2]);
    }
    top.push(ht); bot.push(hb);
  }

  const NR = top.length;
  /* Top face (outward = +N side) and bottom face (reversed winding). */
  for (let i = 0; i < NR - 1; i++) {
    for (let j = 0; j < NV - 1; j++) {
      acc.quad(top[i][j], top[i][j + 1], top[i + 1][j + 1], top[i + 1][j]);
      acc.quad(bot[i][j], bot[i + 1][j], bot[i + 1][j + 1], bot[i][j + 1]);
    }
  }
  /* Rim: both side edges along every row pair, plus the two end caps. Every
     perimeter edge of the grid gets exactly one rim quad, which is what makes
     each edge of the closed solid shared by exactly two triangles. */
  for (let i = 0; i < NR - 1; i++) {
    acc.quad(top[i][0], top[i + 1][0], bot[i + 1][0], bot[i][0]);                         // v = -1 side
    acc.quad(top[i][NV - 1], bot[i][NV - 1], bot[i + 1][NV - 1], top[i + 1][NV - 1]);     // v = +1 side
  }
  for (let j = 0; j < NV - 1; j++) {
    acc.quad(top[0][j], bot[0][j], bot[0][j + 1], top[0][j + 1]);                         // inner end cap
    acc.quad(top[NR - 1][j], top[NR - 1][j + 1], bot[NR - 1][j + 1], bot[NR - 1][j]);     // tip cap
  }
}

/* ===================================================================
   buildHubInto — the derived junction. PLUMBING, not the designed center
   (phase 2 owns that; conflating them cost the flower several cycles).

   UNCONDITIONAL: built for every design. Derived, no controls. A sealed
   extruded polygon slab of the petals' own material — same thickness as the
   sheets — spanning the foot ring, whose radius the area rule already sized
   from the feet (footRing). Feet overhang inward past the rim, so hub–foot
   overlap is a solid annulus at every slider position. No lathe, no loft, no
   surface of revolution: all three were built, measured and rejected in the
   flower (charter). */
export function buildHubInto(acc, state, ring) {
  const t = acc.floorThickness(ring.thickness);
  const N = 48;
  const r = ring.radius;
  const zTop = t / 2, zBot = -t / 2;
  const pt = (k, z) => [r * Math.cos((k * TAU) / N), r * Math.sin((k * TAU) / N), z];
  const cTop = [0, 0, zTop], cBot = [0, 0, zBot];
  for (let k = 0; k < N; k++) {
    const k2 = (k + 1) % N;
    acc.tri(cTop, pt(k, zTop), pt(k2, zTop));                      // top fan (up)
    acc.tri(cBot, pt(k2, zBot), pt(k, zBot));                      // bottom fan (down)
    acc.quad(pt(k, zTop), pt(k, zBot), pt(k2, zBot), pt(k2, zTop)); // rim
  }
}

/* ===================================================================
   buildCenterInto — THE DESIGNED CENTER. An A/B rig behind one choice
   control: NONE / DOME / DISC / RING (Eva, Aug 31 — she rules on the
   archetype by eye from a contact sheet; NONE is and stays the default until
   she does).

   THIS IS NOT THE JUNCTION, and the separation is structural, not a naming
   convention. buildHubInto above is derived plumbing that makes the model one
   piece; this is user-chosen decoration that makes it look like something.
   The proof they are separate: DELETE THIS FUNCTION AND THE BLOOM IS STILL
   ONE CONNECTED SOLID. The centre contributes nothing to the invariant.

   HOW IT READS THE FOOT RING. It never calls footRing() and never recomputes
   a radius. It receives the same `ring` object footRing() produced once in
   buildBloomInto — the object the petal builder and the hub builder are also
   holding — and expresses every dimension as a FRACTION of `ring.radius`.
   That is why the centre tracks `spread` with no code that mentions spread.
   `ring.derivedRadius` is telemetry and is deliberately not read here.

   CONNECTEDNESS BY CONSTRUCTION, not by measurement. The hub is a disc of
   radius ring.radius spanning z ∈ [−t/2, +t/2], and it is already welded to
   every foot. So a centre is joined to the whole model if two clauses hold:

     (1) its radial footprint lies inside [0, ring.radius], and
     (2) its z-span crosses [−t/2, +t/2].

   Then centre ∩ hub is a solid region of the centre's FULL footprint — not a
   band whose width has to be argued about, and not something the voxel gate
   discovers. Each style satisfies both clauses by construction, and the
   arithmetic is stated at each one. The `centerSize` ceiling of 1.00 is what
   makes clause (1) unconditional; that is why it is 1.00 and not 1.25.

   EXPORT CONTRACT. Every style is ONE individually closed solid — no bare
   surface, no zero-thickness membrane, every perimeter edge shared by exactly
   two triangles. Minimum dimensions go through the accumulator's floor in
   export mode exactly as the sheets do.

   TRIANGLE COST (fixed, independent of every slider): DOME 1,728 · DISC 1,056
   · RING 2,304. Against the 10,080-tri default bloom that is +10% to +23%;
   against the 49,632-tri petalCount-40 bloom, +2.1% to +4.6%.
   =================================================================== */
const CENTER_SEG = 48;   // segments around the axis — matches the hub's 48
const DOME_RINGS = 18;
const DISC_RINGS = 10;
const RING_SEG_MINOR = 24;

export function buildCenterInto(acc, state, ring) {
  const style = state.centerStyle;
  if (style === 'NONE') return { style, tris: 0 };

  const t = acc.floorThickness(ring.thickness);   // the hub slab's thickness
  /* The seated styles start an eighth of a slab BELOW the hub's underside,
     not flush with it. Flush is exactly coincident: at centerSize 1.00 the
     centre's outer radius equals ring.radius and its base fan shares the hub
     bottom fan's centre vertex and all 48 rim vertices, so it emitted 48
     triangles BIT-IDENTICAL to the hub's — measured, not guessed (DOME 48,
     DISC 48, RING 0, and 0 at centerSize 0.99). That is duplicate geometry,
     the known cause of non-manifold edges in this family, and it showed up as
     nonManifold 96/192 on precisely the centerSize-max rows. The column is
     unrated and the model was watertight and connected either way, but an
     unexplained number in a gate's output is how a false belief starts here.
     Dropping the base also strengthens clause (2): the centre now spans the
     slab outright instead of sharing its boundary plane. */
  const zBase = -t / 2 - t / 8;
  /* Outer radius: a fraction of the foot ring, floored on its DIAMETER so a
     tiny centre is printable rather than a sliver. The floor can never push
     it past the ring: the smallest reachable ring radius is 1.149 mm
     (ALL-MIN × spread 0.60) and the floor is 1.0 mm on the diameter, so
     rC ≤ max(ring.radius, 0.5) = ring.radius. Clause (1) holds. */
  const rC = acc.floorFeature(2 * ring.radius * state.centerSize) / 2;

  const before = acc.triangleCount;
  if (style === 'DOME') domeInto(acc, state, rC, zBase, t);
  else if (style === 'DISC') discInto(acc, state, rC, zBase, t);
  else if (style === 'RING') torusInto(acc, state, rC);
  else throw new Error(`unknown centerStyle "${style}" — the registry and the builder have diverged`);
  return { style, rC, tris: acc.triangleCount - before };
}

const ringPts = (n, r, z) => Array.from({ length: n }, (_, k) => [r * Math.cos((k * TAU) / n), r * Math.sin((k * TAU) / n), z]);

/* DOME — a rounded boss: an ellipsoidal cap on a flat base disc.
   Clause (2): the base sits at z = −t/2 and the height is floored to at least
   t, so the cap spans the whole slab rather than sitting inside it as a
   sliver. Closed: base fan + cap quads + apex fan. */
function domeInto(acc, state, rC, zBase, t) {
  const h = Math.max(acc.floorFeature(state.centerRise * rC), t);
  const N = CENTER_SEG;
  const rings = [];
  for (let i = 0; i <= DOME_RINGS; i++) {
    const a = (i / DOME_RINGS) * (Math.PI / 2);
    rings.push({ r: rC * Math.cos(a), z: zBase + h * Math.sin(a) });
  }
  const base = ringPts(N, rC, zBase);
  const cBase = [0, 0, zBase];
  for (let k = 0; k < N; k++) acc.tri(cBase, base[(k + 1) % N], base[k]);   // faces down
  /* The apex is emitted EXPLICITLY, never discovered by a radius reaching
     zero. `rC * Math.cos(Math.PI/2)` is 6.1e-17, not 0, so a `r <= 0` test
     never fires: the cap closed on a ring of 48 vertices 6e-17 apart, which
     welds to a point in any quantised edge census — boundary edges 0, and 48
     degenerate triangles plus 49 non-manifold edges on EVERY dome. It passed
     the gated criterion while being wrong, which is the exact shape of defect
     this project keeps finding. The loop now stops one ring short and the
     apex fan is unconditional. */
  let lower = base;
  for (let i = 1; i < DOME_RINGS; i++) {
    const upper = ringPts(N, rings[i].r, rings[i].z);
    for (let k = 0; k < N; k++) { const k2 = (k + 1) % N; acc.quad(lower[k], lower[k2], upper[k2], upper[k]); }
    lower = upper;
  }
  const apex = [0, 0, zBase + h];
  for (let k = 0; k < N; k++) acc.tri(lower[k], lower[(k + 1) % N], apex);
}

/* DISC — a flat or dished button. Thickness is DERIVED (0.22 × radius, never
   below the slab), so the style costs one control, not two.
   The dish is a paraboloid depression whose residual wall is floored, so the
   button can never be pierced or reduced to a knife edge: at centerDish 0.90
   in export mode the centre still carries a full 1.0 mm of material.
   Clause (2): the body runs from z = −t/2 upward by at least t.
   Closed: base fan + cylindrical wall + dished top + centre fan. */
function discInto(acc, state, rC, zBase, t) {
  const N = CENTER_SEG;
  const h = Math.max(acc.floorFeature(0.22 * rC), t);
  const residual = Math.min(h, acc.floorFeature(h * (1 - state.centerDish)));
  const dish = h - residual;
  const zTopAt = (r) => zBase + h - dish * (1 - (r / rC) ** 2);

  const base = ringPts(N, rC, zBase);
  const rim = ringPts(N, rC, zBase + h);            // zTopAt(rC) === zBase + h
  const cBase = [0, 0, zBase];
  for (let k = 0; k < N; k++) acc.tri(cBase, base[(k + 1) % N], base[k]);                    // faces down
  for (let k = 0; k < N; k++) { const k2 = (k + 1) % N; acc.quad(base[k], base[k2], rim[k2], rim[k]); }  // wall
  let outer = rim;
  for (let i = 1; i <= DISC_RINGS; i++) {
    const r = rC * (1 - i / DISC_RINGS);
    if (r <= 0) {
      const c = [0, 0, zTopAt(0)];
      for (let k = 0; k < N; k++) acc.tri(outer[k], outer[(k + 1) % N], c);
      return;
    }
    const inner = ringPts(N, r, zTopAt(r));
    for (let k = 0; k < N; k++) { const k2 = (k + 1) % N; acc.quad(outer[k], outer[k2], inner[k2], inner[k]); }
    outer = inner;
  }
}

/* RING — an open collar: a torus on the hub's mid-plane, closed by
   construction (a torus has no boundary at all).
   Tube diameter is floored, and the major radius is then held at ≥ 1.2× the
   tube radius so the hole never pinches shut into a degenerate axis.
   Clause (1): outer edge R + r = max(rC, 2.2·r). In live mode the guard never
   binds and that is exactly rC ≤ ring.radius. In export mode the guard can
   only bind when the tube was floored to r = 0.5, giving 2.2·r = 1.1 mm —
   below the smallest reachable ring radius of 1.149 mm. So the whole torus
   sits over the hub disc at every setting.
   Clause (2): the tube spans z ∈ [−r, +r] about z = 0, the slab's mid-plane,
   so it crosses the slab for any r > 0. */
function torusInto(acc, state, rC) {
  const r = acc.floorFeature(rC * (1 - state.centerBore)) / 2;
  const R = Math.max(rC - r, 1.2 * r);
  const NS = CENTER_SEG, NM = RING_SEG_MINOR;
  const P = (i, j) => {
    const th = (i % NS) * TAU / NS, ph = (j % NM) * TAU / NM;
    const rr = R + r * Math.cos(ph);
    return [rr * Math.cos(th), rr * Math.sin(th), r * Math.sin(ph)];
  };
  for (let i = 0; i < NS; i++) {
    for (let j = 0; j < NM; j++) acc.quad(P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1));
  }
}

/* ===================================================================
   buildBloomInto — the whole model. `below` carries what sits beneath the
   bloom: 'stem' | 'branch' | null — a value, NEVER a boolean (flower lesson:
   buildBudInto keys off the thing itself, not a label correlating with it).
   Only null exists in phase 1; passing anything else is a loud error rather
   than a silent ignore, so the first stem session cannot half-wire it.

   `capability` is the NON-SHIPPING petal-model override: null in every
   shipped state, and settable ONLY through window.__bloomCapability by the
   gates and the contact sheet. It has NO REGISTRY ROW and no DOM input by
   design — "architected for claw and cleft" has to be provable, and a
   capability that is only asserted in a comment is exactly the label-naming-
   a-computation-nobody-performed defect this project keeps finding. It is
   an ARGUMENT here rather than a state key so it cannot be reached by
   anything that reads the control set. */
export function buildBloomInto(acc, state, { below = null, capability = null } = {}) {
  if (below !== null && below !== 'stem' && below !== 'branch') {
    throw new Error(`below must be 'stem' | 'branch' | null, got ${JSON.stringify(below)}`);
  }
  if (below !== null) throw new Error(`below='${below}' is phase-2+ work; only null is built today`);

  const ring = footRing(state, acc);
  /* Slot 0's own measurements, kept for the metrics hook. Every slot in a
     phase-3 whorl is the same petal (sizeRamp and angleRamp are constants),
     so slot 0 is the whorl — when per-slot overrides arrive that stops being
     true and this must report per slot, not one of them. */
  let petal = null;
  buildWhorlInto({
    count: state.petalCount,
    radius: ring.radius,
    height: 0,
    sizeRamp: () => 1,
    angleRamp: () => 0,
    phase: 0,
    blade: (slot) => {
      const p = buildPetalInto(acc, state, ring, slot, capability);
      if (slot.index === 0) petal = p;
    },
  });
  buildHubInto(acc, state, ring);          // unconditional — the invariant's plumbing
  const center = buildCenterInto(acc, state, ring);   // optional — the designed mass
  return { ring, center, petal };
}
