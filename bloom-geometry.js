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
  }
  /* Every solid's thickness passes through here. Floored ONLY at export, so
     the live view shows the authored value and the print never goes below
     the printable minimum. */
  floorThickness(t) {
    if (this.exportMode) {
      const f = Math.max(t, MIN_FEATURE_MM);
      if (f < this.minThickness) this.minThickness = f;
      return f;
    }
    return t;
  }
  tri(a, b, c) { this.positions.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); }
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

   RADIUS IS DERIVED, NOT A CONTROL (phase-1 ruling, parked for phase 2 —
   docs/bloom-charter.md): the area rule r_ring² = Σ r_foot² sizes the circle
   from what feeds it, where r_foot is the effective radius of one foot's
   cross-section (width × thickness → the circle of equal area). Feet land ON
   that circle and run inward past it (`overhang`), so the hub — a slab of
   exactly this radius — always reaches every foot by construction.

   Takes the accumulator because the foot thickness is floored geometry: the
   ring's answer in export mode must match what the solids are actually built
   at, or the area rule would size the junction from a thickness nothing has. */
export function footRing(state, acc) {
  const thickness = acc.floorThickness(SHEET_THICKNESS_MM);
  /* Foot width follows the petal it feeds — a fraction of blade width with a
     floor so very narrow petals keep a printable root. */
  const width = clamp(state.petalWidth * 0.4, 3, 10);
  const rFoot = Math.sqrt((width * thickness) / Math.PI);
  const radius = rFoot * Math.sqrt(state.petalCount);   // area rule
  /* How far inside the ring each foot continues, so foot–hub overlap is a
     solid annulus, not a hairline touch. */
  const overhang = Math.max(1.5, radius * 0.4);
  return { radius, width, thickness, overhang };
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
   buildPetalInto — one placeholder petal: a thin SOLID sheet, simple ovate.

   Closed by construction: a mid-surface grid, offset ±t/2 along the per-row
   sheet normal into a top face and a bottom face, then a rim strip around the
   whole perimeter (inner end cap, tip cap, both side edges). Zero boundary
   edges per petal, independent of every other solid.

   Layout along the local length coordinate s:
     s ∈ [-overhang, 0]   the FOOT — flat in the hub plane (z = ring plane),
                          constant half-width ring.width/2. Staying flat until
                          the ring is what guarantees the foot lies inside the
                          hub slab whatever the tilt slider does.
     s ∈ (0, length]      the BLADE — tilted up by petalTilt about the ring
                          tangent; ovate half-width profile (widest below the
                          middle), blended out of the foot width near the base.

   The tip is blunted to TIP_HALF_MM rather than pinched to a point: a
   zero-width tip row would collapse the rim strip into degenerate triangles.
   Placeholder silhouette; phase 3 owns the real one. */
const TIP_HALF_MM = 0.8;

export function buildPetalInto(acc, state, ring, slot) {
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

  /* Ovate half-width profile on u ∈ [0,1]: g(u) = u^a (1-u)^b, peak at
     a/(a+b) ≈ 0.36 — broadest below the middle, which is what "ovate" means.
     Normalised so the peak equals 1. */
  const a = 1.0, b = 1.8;
  const uPk = a / (a + b);
  const gPk = Math.pow(uPk, a) * Math.pow(1 - uPk, b);
  const ovate = (u) => (Math.pow(u, a) * Math.pow(1 - u, b)) / gPk;

  const NU = 28;   // blade rows
  const NV = 10;   // columns across the width
  /* Row list: foot rows (flat), then blade rows. Each row: mid-surface centre
     point C, per-row unit normal N (constant across the width — the sheet is
     flat across its width; no cup in phase 1), half-width h. */
  const rows = [];
  const footS = [-ring.overhang, -ring.overhang / 2, 0];
  for (const s of footS) {
    rows.push({
      C: [R[0] * (ring.radius + s), R[1] * (ring.radius + s), slot.z],
      N: Z, h: footHalf,
    });
  }
  const dir = [R[0] * Math.cos(tilt), R[1] * Math.cos(tilt), Math.sin(tilt)];       // blade direction
  const nrm = [-R[0] * Math.sin(tilt), -R[1] * Math.sin(tilt), Math.cos(tilt)];     // blade sheet normal
  for (let i = 1; i <= NU; i++) {
    const u = i / NU;
    const s = u * length;
    /* Half-width: the ovate profile, never narrower than the foot taper near
       the base (so blade and foot meet without a waist), never narrower than
       the blunt tip. */
    const h = Math.max(halfW * ovate(u), footHalf * Math.max(0, 1 - u / 0.3), TIP_HALF_MM);
    rows.push({
      C: [ring.radius * R[0] + dir[0] * s, ring.radius * R[1] + dir[1] * s, slot.z + dir[2] * s],
      N: nrm, h,
    });
  }

  /* Vertex grids: top[i][j], bot[i][j]; j spans v ∈ [-1, 1] across the width. */
  const top = [], bot = [];
  for (const row of rows) {
    const ht = [], hb = [];
    for (let j = 0; j < NV; j++) {
      const v = -1 + (2 * j) / (NV - 1);
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

  const NR = rows.length;
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
   buildBloomInto — the whole model. `below` carries what sits beneath the
   bloom: 'stem' | 'branch' | null — a value, NEVER a boolean (flower lesson:
   buildBudInto keys off the thing itself, not a label correlating with it).
   Only null exists in phase 1; passing anything else is a loud error rather
   than a silent ignore, so the first stem session cannot half-wire it. */
export function buildBloomInto(acc, state, { below = null } = {}) {
  if (below !== null && below !== 'stem' && below !== 'branch') {
    throw new Error(`below must be 'stem' | 'branch' | null, got ${JSON.stringify(below)}`);
  }
  if (below !== null) throw new Error(`below='${below}' is phase-2+ work; only null is built today`);

  const ring = footRing(state, acc);
  buildWhorlInto({
    count: state.petalCount,
    radius: ring.radius,
    height: 0,
    sizeRamp: () => 1,
    angleRamp: () => 0,
    phase: 0,
    blade: (slot) => buildPetalInto(acc, state, ring, slot),
  });
  buildHubInto(acc, state, ring);   // unconditional — the invariant's plumbing
  return { ring };
}
