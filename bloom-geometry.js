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

   NO FORM WORK LIVES HERE — the four curves are a separate layer with its
   own owner (petalForm, below). This file's silhouette layer answers "how
   WIDE is the blade at u" and nothing else; the form layer answers "where
   in space does that width sit". Keeping them apart is what lets the byte
   report attribute a moved export to one or the other.
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
   THE PETAL'S 3D FORM — the four curves, and they are not interchangeable.

   The flower project lost a full session to conflating these, and its
   working agreements carry a table for exactly that reason. Never accept
   "curly" as a spec; ask which one.

     PETAL CUP          parabolic lift ACROSS the width — cupped spoon
                        through flat to reflexed.
     SPINE CURL         bend ALONG the length — up to fiddlehead territory,
                        and below the bloom plane in the reflex direction.
     CROSS-SECTION ROLL curl ACROSS the width — flat sheet toward a quilled
                        tube.
     TWIST              rotation about the midrib ALONG the length —
                        contorted aestivation, chirality.

   No amount of range on one produces another. A fiddlehead is spine curl; a
   quill is cross-section roll; a taco is cup. Cup and roll BOTH bend the
   cross-section and are the pair most easily confused — what separates them
   is the LAW, not the look: roll is a constant-curvature arc and is
   isometric (it can close into a tube), cup is a parabolic lift and is not
   (it can never wrap, and it is signed through flat into reflexed).

   ORDER OF APPLICATION, and why it is not free:
     1. SPINE CURL      builds the centreline and the row's base frame.
     2. TWIST           rotates the width/normal pair about the CURLED
                        length direction.
     3. CROSS-SECTION   ROLL maps v to an arc in the row's (T, N) plane.
     4. CUP             adds its lift along that row's N, after the roll.

   1 before 2 because curl's bend axis IS the width direction: twisting
   first would rotate the bend axis along the length and the spine would
   WRITHE into a helix instead of curling in a plane — a fiddlehead would
   stop being a fiddlehead. 2 before 3 and 4 because roll and cup are
   cross-section shape IN THE ROW'S FRAME; expressed in an untwisted frame,
   "across the width" stops meaning across the width. 3 before 4 because
   roll decides where material sits along the arc and cup then lifts along
   the rolled normal; reversing them rotates cup's lift into the width
   direction and cup stops being a lift at all.

   1 and 2 are FRAME operations — rigid per row, no metric change across the
   width at all. 3 and 4 are CROSS-SECTION operations. That split is why
   only roll and cup have a |dP/dv| story, and it is measured rather than
   asserted (see `metricMin`/`metricMax` in the telemetry below).

   PETAL TILT IS NOT SPINE CURL, and the code says so in one line:
   `phi(u) = petalTilt + curl*u`. Tilt is the CONSTANT OF INTEGRATION — the
   frame at u = 0, zero derivative, the whole blade rotating rigidly. Curl
   is the RATE. They rotate about the same axis, which is exactly why they
   get conflated, and being the two terms of one affine angle function is
   what makes them unambiguous. `tilt 0 + curl 360` is a flat-emerging
   fiddlehead; `tilt 75 + curl 0` is an upright straight petal; neither is
   reachable from the other.

   WHERE THE INFLUENCE BEGINS: strictly u > 0, and stronger than "we do not
   write the foot rows". Curl and twist are EXACTLY zero at u = 0 by
   construction (phi(0) = tilt, tau(0) = 0). Roll and cup are not naturally
   zero there, so both ramp in over FORM_ONSET_END. All four therefore have
   identically zero influence at the junction, which is what makes the foot
   invariant structural rather than a matter of inspection.

   BYTE-IDENTITY AT DEFAULTS is a GUARD, deliberately, and not the IEEE-754
   argument the silhouette engine used. Cup would survive one (`+ N*(0*h*v*v)`
   adds exactly +0) and twist very nearly would (`cos(0) === 1`,
   `sin(0) === 0` — but `T = [-sinA, cosA, 0]` is `-0` in its first
   component at azimuth 0, and `-0 + 0` is `+0`). Roll and curl cannot
   survive one at all: both carry a `1/kappa` that is a genuine 0/0 limit at
   zero. So rather than rest byte-identity on a case analysis about signed
   zero, `petalFormIsFlat()` short-circuits to the pre-form expression
   verbatim, and byte-identity becomes the statement that the shipped
   default executes the same instructions as before. The guard is not
   allowed to hide a wrong form path: `formGuardResidual` in the metrics
   measures the zero-form law against the flat law at every emitted point,
   and both gates assert it below 1e-9 on every row.
   =================================================================== */

/* Where the form curves have fully faded in, as a fraction of blade length.
   Deliberately NOT sharing ROOT_BLEND_END's constant even though both are
   0.30 today: the root blend answers "where does the foot stop flooring the
   width", this answers "where has the form reached full strength". Two
   different boundaries that happen to share a length scale — collapsing
   them would mean a later change to one silently moved the other, which is
   the registration rule misapplied rather than obeyed. */
export const FORM_ONSET_END = 0.30;

/* THE ROLL CURVATURE FLOOR — cap the OUTPUT, never an input proxy.
   A rolled sheet's inner offset surface sits at `radius - t/2`. Let the
   radius fall to t/2 and that surface inverts: the solid turns inside out
   and self-intersects while staying watertight and connected, so NEITHER
   GATE CAN SEE IT. Measured at the ranges that ship: petalWidth 8 asks for
   a 0.637 mm radius at a full turn, leaving 0.037 mm of inner wall. The
   floor is one full sheet thickness, so the inner surface keeps t/2 of
   radius at the tightest reachable fold and the control saturates instead
   of degenerating. Like every structural number in this project family this
   is an ASSUMPTION with a number attached, not a printed result. */
export const ROLL_MIN_RADIUS_FACTOR = 1.0;

const D2R = Math.PI / 180;

/* THE GUARD's predicate, exported so the app, the builder and the gates all
   ask the same question. Exact zero comparisons: every one of the four
   defaults IS exactly 0, and a range input at its default yields it. */
export function petalFormIsFlat(state) {
  return state.petalCup === 0 && state.petalSpineCurl === 0
      && state.petalRoll === 0 && state.petalTwist === 0;
}

/* THE ONE OWNER of the four curves. Always returns the law (it is the
   CALLER that decides whether to use it — see petalFormIsFlat), so the
   zero-form law is constructible for the guard's residual check.

   `halfW` and `t` are passed rather than recomputed: the roll clamp must be
   expressed against the thickness the solids are ACTUALLY built at, or the
   floor would protect a wall nothing has. */
export function petalForm(state, halfW, t) {
  const cup = state.petalCup;
  const curlRad = state.petalSpineCurl * D2R;
  const twistRad = state.petalTwist * D2R;

  /* Roll: the control asks for a WRAP ANGLE at the nominal half-width, and
     the geometry answers with a CURVATURE. One curvature for the whole
     petal means the quill is a tube of one radius; the alternative (one
     wrap angle per row, radius proportional to that row's half-width) puts
     a 0.127 mm radius at the 0.8 mm tip row and inverts on every petal. */
  const kReq = (state.petalRoll * D2R) / halfW;
  const kMax = 1 / (ROLL_MIN_RADIUS_FACTOR * t);
  const kappa = Math.sign(kReq) * Math.min(Math.abs(kReq), kMax);
  const clamped = Math.abs(kReq) > kMax;

  const ramp = (u) => (u >= FORM_ONSET_END ? 1 : u / FORM_ONSET_END);

  /* The row's frame. ONE definition, read by the row loop and by the
     contact sheet's framing alike — under twist the width direction is not
     the ring tangent any more, so a consumer recomputing it would not
     merely be a second owner, it would be wrong. */
  const frameAt = (R, T, phi, u) => {
    const N0 = [-R[0] * Math.sin(phi), -R[1] * Math.sin(phi), Math.cos(phi)];
    const tau = twistRad * u;
    const ct = Math.cos(tau), st = Math.sin(tau);
    return {
      D: [R[0] * Math.cos(phi), R[1] * Math.cos(phi), Math.sin(phi)],
      T: [T[0] * ct + N0[0] * st, T[1] * ct + N0[1] * st, T[2] * ct + N0[2] * st],
      N: [-T[0] * st + N0[0] * ct, -T[1] * st + N0[1] * ct, -T[2] * st + N0[2] * ct],
    };
  };

  /* The cross-section, in the row's own (T, N) plane. `a = h*v` is
     millimetres from the midrib, so the roll is an arc parameterised BY ARC
     LENGTH — which is what makes it isometric: |d(aT, aN)/da| is
     (cos, sin) and has magnitude exactly 1 at every sample.

     The normal travels with the point. A rolled sheet offset by one
     constant per-row normal is a wedge of varying thickness, not a sheet;
     the unit normal here is dP/dv rotated a quarter turn in the same
     plane, which keeps the offset a true constant-thickness shell. */
  const sectAt = (C, T1, N1, h, u) => {
    const r = ramp(u);
    const k = kappa * r;
    const c = cup * r;
    return (v) => {
      const a = h * v;
      const aT = k === 0 ? a : Math.sin(k * a) / k;
      const aN = (k === 0 ? 0 : (1 - Math.cos(k * a)) / k) + c * h * v * v;
      const dT = k === 0 ? 1 : Math.cos(k * a);
      const dN = (k === 0 ? 0 : Math.sin(k * a)) + 2 * c * v;
      const L = Math.hypot(dT, dN);
      const nT = -dN / L, nN = dT / L;
      return {
        P: [C[0] + T1[0] * aT + N1[0] * aN, C[1] + T1[1] * aT + N1[1] * aN, C[2] + T1[2] * aT + N1[2] * aN],
        n: [T1[0] * nT + N1[0] * nN, T1[1] * nT + N1[1] * nN, T1[2] * nT + N1[2] * nN],
      };
    };
  };

  return {
    curlRad, twistRad, kappa, frameAt, sectAt,
    /* WHAT THE EXPORT CANNOT SHOW. Watertightness and connectedness are
       measured on the STL; these are the properties a pure-displacement
       change can break while leaving both of those green, so they are read
       from the builder that made the geometry. Scope is printed beside
       every gate result, never only in a header. */
    telemetry(rows, footRows) {
      let mMin = Infinity, mMax = -Infinity;
      for (let i = footRows; i < rows.length; i++) {
        const row = rows[i];
        const rr = ramp(row.u);
        const k = kappa * rr, c = cup * rr;
        for (let j = 0; j < NV; j++) {
          const v = -1 + (2 * j) / (NV - 1);
          const a = row.h * v;
          const dT = k === 0 ? 1 : Math.cos(k * a);
          const dN = (k === 0 ? 0 : Math.sin(k * a)) + 2 * c * v;
          const g = Math.hypot(dT, dN);              // |dP/dv| / h — the RATIO
          if (g < mMin) mMin = g;
          if (g > mMax) mMax = g;
        }
      }
      /* THE EMITTED POLYLINE IS NOT THE CURVE, and that distinction is the
         one thing the |dP/dv| ratio above cannot show. The roll is
         isometric as a MAP — ratio exactly 1 at every sample — while the
         panel emits NV columns, so the cross-section is an (NV-1)-segment
         chord path inscribed in the arc and carries LESS material than the
         flat row it came from. Measured here rather than reasoned about,
         and printed on the contact sheet beside the picture of the
         faceting it causes. Cup runs the other way (a parabola is longer
         than its chord), which is why this is a range and not a deficit. */
      let pMin = Infinity, pMax = -Infinity;
      for (let i = footRows; i < rows.length; i++) {
        const row = rows[i];
        const rr = ramp(row.u);
        const k = kappa * rr, c = cup * rr;
        const pt = (v) => {
          const a = row.h * v;
          return [k === 0 ? a : Math.sin(k * a) / k,
                  (k === 0 ? 0 : (1 - Math.cos(k * a)) / k) + c * row.h * v * v];
        };
        let chord = 0, prev = pt(-1);
        for (let j = 1; j < NV; j++) {
          const q = pt(-1 + (2 * j) / (NV - 1));
          chord += Math.hypot(q[0] - prev[0], q[1] - prev[1]);
          prev = q;
        }
        const ratio = chord / (2 * row.h);
        if (ratio < pMin) pMin = ratio;
        if (ratio > pMax) pMax = ratio;
      }

      return {
        cup, curlDeg: state.petalSpineCurl, rollDeg: state.petalRoll, twistDeg: state.petalTwist,
        polylineMin: pMin, polylineMax: pMax,
        rollRadiusMm: kappa === 0 ? Infinity : 1 / Math.abs(kappa),
        rollClamped: clamped,
        /* The ratio |dP/dv| / |dP/dv|_flat. The flat sheet already has
           |dP/dv| = h(u) (v is normalised, not arc length), so the raw
           magnitude is not the comparable quantity — the RATIO is, and it
           is what the flower's 1.09 / 1.75 cup numbers are. Roll holds it
           at exactly 1; cup is the only one of the four that moves it. */
        metricMin: mMin, metricMax: mMax,
        onsetEnd: FORM_ONSET_END,
      };
    },
  };
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
                           from trimPanels(), and 3D FORM from petalForm().
                           28 rows.

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
  /* THE GUARD. petalFormIsFlat() is the predicate; when it holds, `form`
     stays null and every row below takes the pre-form expression verbatim.
     That — not an IEEE-754 argument — is what makes the shipped default
     byte-identical. */
  const form = petalFormIsFlat(state) ? null : petalForm(state, halfW, t);

  /* THE FLAT CROSS-SECTION, and the reason it is a closure.

     Every row carries a `sect(v)` returning the mid-surface point and the
     unit normal THERE. Flat rows return the row's own constant normal and
     the expression `C + T*h*v` — operation for operation, in the same
     order, as the pre-form code. Curving a sheet makes the normal vary
     ACROSS the width (a rolled sheet offset by one constant normal is a
     wedge, not a sheet of constant thickness), so the normal has to travel
     with the point; making that one closure is what keeps emitPanel from
     needing to know which law produced the row. */
  const flatSect = (C, N, h) => (v) => ({
    P: [C[0] + T[0] * h * v, C[1] + T[1] * h * v, C[2] + T[2] * h * v],
    n: N,
  });

  const rows = [];
  /* THE FOOT — three flat rows in the hub plane. NOTHING in the form layer
     reaches them: they are emitted here, from footRing()'s quantities only,
     before any curve exists. That is the whole junction argument, and
     `node tools/diff-bloom-bytes.mjs --region foot` is what measures it. */
  const footS = [-ring.overhang, -ring.overhang / 2, 0];
  for (const s of footS) {
    const C = [R[0] * (ring.radius + s), R[1] * (ring.radius + s), slot.z];
    rows.push({ C, N: Z, T, h: footHalf, u: 0, sect: flatSect(C, Z, footHalf) });
  }

  const dir = [R[0] * Math.cos(tilt), R[1] * Math.cos(tilt), Math.sin(tilt)];       // blade direction
  const nrm = [-R[0] * Math.sin(tilt), -R[1] * Math.sin(tilt), Math.cos(tilt)];     // blade sheet normal
  const base = [ring.radius * R[0], ring.radius * R[1], slot.z];

  /* THE SPINE. Straight when there is no curl — the same expression as
     before — and a constant-curvature arc when there is. The arc is the
     integral of a direction whose angle is `tilt + kappa*s`, so at s = 0 it
     leaves the foot at exactly the tilt angle and exactly the ring: curl
     moves the TIP, never the attachment. That is why curl cannot disturb
     the foot even though it acts on the frame the foot's neighbour uses. */
  const kC = form ? form.curlRad / length : 0;
  const spineAt = kC === 0
    ? (s) => ({
      C: [base[0] + dir[0] * s, base[1] + dir[1] * s, base[2] + dir[2] * s],
      phi: tilt,
    })
    : (s) => {
      const phi = tilt + kC * s;
      const dR = (Math.sin(phi) - Math.sin(tilt)) / kC;
      const dZ = (Math.cos(tilt) - Math.cos(phi)) / kC;
      return { C: [base[0] + R[0] * dR, base[1] + R[1] * dR, base[2] + dZ], phi };
    };

  for (let i = 1; i <= NU; i++) {
    const u = i / NU;
    const s = u * length;
    const h = profile.halfWidthAt(u);
    const { C, phi } = spineAt(s);
    if (!form) { rows.push({ C, N: nrm, T, h, u, sect: flatSect(C, nrm, h) }); continue; }
    /* The row's own frame, READ from petalForm's frameAt rather than
       recomputed here — the contact sheet's framing reads the same
       function, and two copies of a frame is how this project's most
       repeated defect starts. Twist follows the spine because frameAt
       rotates about the CURRENT length direction; see the ordering
       argument in petalForm's header. */
    const f = form.frameAt(R, T, phi, u);
    rows.push({ C, N: f.N, T: f.T, D: f.D, h, u, sect: form.sectAt(C, f.T, f.N, h, u) });
  }

  const panels = trimPanels(rows.length, (i) => rows[i].u, cap);
  for (const panel of panels) emitPanel(acc, rows, panel, t);

  /* THE GUARD'S OWN CHECK — the thing that stops the short-circuit hiding
     a wrong form path. On shipped (flat) builds only, and for slot 0 only,
     the ZERO-form law is constructed and evaluated at every point the flat
     law just emitted, frame included. The frame comparison is not padding:
     it is precisely where the signed-zero case lives (`T = [-sinA, cosA, 0]`
     is `-0` in its first component at azimuth 0, and `-0 + 0` is `+0`),
     which is the case that made a pure IEEE-754 argument unattractive in
     the first place. Both gates assert this below 1e-9 on every row. */
  let guardResidual = null;
  if (!form && slot.index === 0) {
    const zero = petalForm({ petalCup: 0, petalSpineCurl: 0, petalRoll: 0, petalTwist: 0 }, halfW, t);
    guardResidual = 0;
    const dev = (a, b) => { for (let k = 0; k < 3; k++) guardResidual = Math.max(guardResidual, Math.abs(a[k] - b[k])); };
    for (let i = footS.length; i < rows.length; i++) {
      const row = rows[i];
      const zf = zero.frameAt(R, T, tilt, row.u);
      dev(zf.T, T); dev(zf.N, nrm);
      const zs = zero.sectAt(row.C, row.T, row.N, row.h, row.u);
      for (let j = 0; j < NV; j++) {
        const v = -1 + (2 * j) / (NV - 1);
        const A = row.sect(v), B = zs(v);
        dev(A.P, B.P); dev(A.n, B.n);
      }
    }
  }

  const midS = 0.5 * length;
  const midRow = spineAt(midS);
  /* The blade's own frame AT THE MIDPOINT, for the contact sheet's framing.
     Reported rather than re-derived: face-on is down the normal, profile is
     down the width direction, and a shot tool recomputing either from tilt
     and azimuth would be a second owner of the petal frame — which under
     curl and twist would also be WRONG, since neither is constant along the
     blade any more. */
  const midU = 0.5;
  const midFrame = form ? form.frameAt(R, T, midRow.phi, midU) : { T, N: nrm };
  return {
    /* Row half-widths, FOOT ROWS INCLUDED — a claw is narrower than both
       its foot and its blade, so the foot rows are part of the evidence. */
    profile: rows.map((r) => r.h),
    footRows: footS.length,
    panels: panels.map((p) => p.label),
    tipSpans: panels.filter((p) => p.rowTo === rows.length - 1).length,
    mid: midRow.C,
    normal: midFrame.N,
    /* The width direction — a PROFILE view looks down this. New in the form
       session: with a flat sheet it was the ring tangent and a consumer
       could get away with recomputing it; under twist it is not. */
    tangent: midFrame.T,
    /* The blade's LENGTH direction at the midpoint. An END-ON view looks
       down this, and end-on is the only view a cross-section curve is
       visible in at all — face-on shows the silhouette, profile shows the
       spine. Three views because there are three planes and the four curves
       do not all live in one. Derived here from the same frame the geometry
       used; the flat case is the tilted blade direction exactly. */
    axis: form ? midFrame.D : dir,
    tip: spineAt(length).C,
    /* FORM TELEMETRY — what the structural assertions read. The gates
       measure watertightness and connectedness on the export; these are the
       properties the export CANNOT show, read from the builder that made
       the geometry. Scope is printed beside every result, never only here. */
    form: form ? form.telemetry(rows, footS.length) : null,
    guardResidual,
    footFrames: rows.slice(0, footS.length).map((r) => ({ C: r.C, N: r.N, T: r.T, h: r.h })),
  };
}

/* One panel: a single-span quad grid, individually closed. Emission order
   is the placeholder's exactly — all face quads, then both side rims, then
   the two end caps — because at the default there is exactly ONE panel and
   the byte report is a two-sided assertion that nothing moved.

   THE ROW OWNS ITS CROSS-SECTION. This asks each row for the mid-surface
   point and the unit normal AT that point, rather than adding a per-row
   constant normal itself: a curved cross-section has a normal that varies
   across the width, and offsetting it by one constant would build a wedge
   instead of a sheet. For a flat row the closure returns the row's own
   constant normal and the same expression as before, so the shipped default
   is unmoved — which the byte report measures rather than assumes. */
function emitPanel(acc, rows, panel, t) {
  const top = [], bot = [];
  for (let i = panel.rowFrom; i <= panel.rowTo; i++) {
    const row = rows[i];
    const span = panel.spanAt(i);
    const vLo = span[0], vHi = span[1];
    const ht = [], hb = [];
    for (let j = 0; j < NV; j++) {
      /* The span-form column map. A trimmed panel evaluates the row's
         cross-section at ITS OWN v values, and the cross-section is a
         function of the GLOBAL v — so a cleft's two lobes stay on the one
         arc their base panel is on instead of drifting onto two of their
         own. That is what keeps a rolled cleft one connected body. */
      const v = vLo + ((vHi - vLo) * j) / (NV - 1);
      const { P, n } = row.sect(v);
      ht.push([P[0] + n[0] * t / 2, P[1] + n[1] * t / 2, P[2] + n[2] * t / 2]);
      hb.push([P[0] - n[0] * t / 2, P[1] - n[1] * t / 2, P[2] - n[2] * t / 2]);
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
