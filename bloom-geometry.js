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

/* THE DEFAULT sheet thickness, in mm. Until the thickness layer this was the
   thickness — one constant read at both call sites, so foot, blade and tip
   were the same number by construction. It is now the DEFAULT of the
   `sheetThickness` control and nothing reads it at build time; the geometry
   reads `state.sheetThickness`. It is still exported, and it is still the one
   owner of that number: the registry's default must BE this value, and
   bloom-harness asserts `DEFAULTS.sheetThickness === SHEET_THICKNESS_MM` on
   every gate run so the two cannot drift into two constants that agree today.

   1.2 is above MIN_FEATURE_MM, which used to mean the export floor could
   never bind. THAT IS NO LONGER TRUE and the charter's bullet saying so has
   been rewritten: the control reaches 0.60 mm and the tip-thinning gradient
   reaches below the floor from 0.17 upward at this default, so live and
   export geometry now legitimately differ. Every count and every dimension
   printed anywhere must carry its mode. */
export const SHEET_THICKNESS_MM = 1.2;

/* THE FOOT'S MINIMUM WIDTH — an ASSUMPTION with a number attached, like every
   other floor in this project family, and nothing here has ever been printed.
   1.6 mm is twice MIN_FEATURE_MM: at the export floor the most delicate
   reachable foot is 1.6 mm wide by 1.0 mm thick, which is still a wall rather
   than a wire. It replaces a hardcoded 3.0 that could never bind (the
   smallest raw value reachable without a delicacy control was petalWidth 8 x
   0.4 = 3.2 mm), so lowering it moved no byte anywhere; under `footDelicacy`
   it becomes the clamp that answers "how thin can this connection get", and
   it is printed with (CLAMPED) in the read-out when it takes over.
   A printed coupon replaces this guess with a measurement. */
export const FOOT_MIN_WIDTH_MM = 1.6;

/* THE FOOT'S UPPER CLAMP — a number that has always been here as a bare `10`
   inside footRing()'s clamp, given a name (Eva's ruling, Sep 1, option b)
   because it BINDS and nothing said so.

   WHAT WAS WRONG, found by discovery rather than by a visitor wondering why
   the ring stopped growing. `widthClamped` telemetry reports only the LOWER
   floor, so from `petalWidth` 25 upward — SIX of the slider's 23 reachable
   values, 26% of its range — the authored foot exceeds 10 mm, the clamp takes
   over, and the blade keeps widening while the foot and therefore the whole
   area-ruled ring stand still. Measured at n=8, t=1.2, spread 2:

       petalWidth 24 -> foot  9.60 mm, ring 10.8324 mm
       petalWidth 25 -> foot 10.00 mm, ring 11.0558 mm
       petalWidth 30 -> foot 10.00 mm, ring 11.0558 mm   (blade +20%, ring +0%)

   This predates the zygomorphy work by four sessions; a per-role size
   multiplier is simply the fastest route to it, which is why it surfaced
   here. NO GEOMETRY MOVES: the constant is the same double the literal was,
   and the fix is the (CLAMPED) discipline this project already applies
   everywhere else arriving where it was always missing — `widthClampedHigh`
   beside `widthClamped`, and a ceiling twin of the read-out's floor line.
   A slider that has stopped moving must say so. */
export const FOOT_MAX_WIDTH_MM = 10;

/* HOW MANY WHORLS THE ARRANGEMENT MAY STACK. Three, and the binding
   constraint is THE PETAL, not the triangle count — which was the surprise.
   Measured Sep 1: three layers at petalCount 40 is 149,568 export triangles,
   10% of EXPORT_TRI_BUDGET (1.5 M), so the budget is nowhere near binding and
   a cap justified by triangles would have been a made-up number. What binds
   is that the blade shrinks by `layerSize` per layer: at the shipping ratio
   0.72 the third layer is an 18.1 mm blade, a fourth would be 13.0 mm, and at
   `layerSize` <= 0.50 the deepest foot hits FOOT_MIN_WIDTH_MM and becomes a
   floored stub with a blade narrower than its own root.
   Raising this is a range change in the registry plus gate rows, not a
   rewrite — `layerCount.max` is asserted equal to it by the harness so the
   two cannot drift. */
export const MAX_LAYERS = 3;

/* THE GOLDEN ANGLE — SPIRAL placement's azimuth step, 137.50776 degrees.
   pi*(3 - sqrt(5)) rather than a decimal literal so the constant IS the
   definition instead of a rounding of it.

   THE CHARTER'S "PHYLLOTAXIS NEEDS n >= 8" RULE WAS MEASURED AND DOES NOT
   HOLD AS A GEOMETRIC THRESHOLD (Sep 1). The obvious statistic — the ratio of
   the largest angular gap to the smallest — oscillates between 1.62 and 2.62
   at EVERY count, driven by which Fibonacci number the count sits between:
   n=3 -> 1.62, n=4 -> 2.62, n=5 -> 1.62, n=6,7 -> 2.62, n=8 -> 1.62,
   n=13,21 -> 1.62, n=40 -> 2.62. It is scale-free; there is no discontinuity
   at 8 or anywhere else. The rule is a real AESTHETIC claim about when
   parastichies become legible, and it is not a number anything can gate on —
   which is why low counts are ALLOWED and FLAGGED rather than hidden. See
   the flag in bloom.js's read-out and the charter entry it corrected. */
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/* WHERE THE LOW-COUNT SPIRAL FLAG TURNS ON. An AESTHETIC boundary, and it
   lives here — rather than in the read-out that prints it — so the panel gate
   can assert the flag in BOTH directions without keeping its own copy of the
   number. A gate re-stating a threshold is this project's most repeated
   defect; a gate importing the one definition cannot drift from it. */
export const SPIRAL_LEGIBLE_COUNT = 8;

/* ===================================================================
   THE FAN — a symmetric arc across one axis instead of a full circle, and the
   fourth `placement` value (Eva, Sep 2). Its vocabulary is the FLOWER's own
   bilateral arrangement, read as the reference rather than re-invented:
   petals per side, petal spacing (the angle between neighbours) and a
   petal-on-mirror-line toggle. The bloom's disciplines are its own.

   THE ARC LIMIT — the half-arc ceiling, in degrees, and it is the one number
   that makes exact coincidence UNREACHABLE rather than merely unlikely. The
   fan's outermost petal sits at `maxK * step`, so without a ceiling a wide
   spacing at many petals sweeps the two sides past each other and two slots
   land on ONE azimuth. That is duplicate geometry — this family's known cause
   of non-manifold edges, measured at 14,832 of them when `layerSize` 1.00 put
   two whorls exactly on top of each other, which is why THAT control caps at
   0.90. Same argument, same remedy: the step is clamped so the two sides
   cannot meet, and the guaranteed back notch is exactly `360 - 2*LIMIT` = 20
   degrees. `fanGapDeg` reports it and J7 asserts a floor on the minimum
   angular separation, so the cap is measured rather than trusted.

   170 IS THE FLOWER'S OWN VALUE, ported (Eva, Sep 2). At the widest reachable
   corner it produces a 340-degree fan with a 20-degree notch, which reads as
   a ring with a nick rather than as a fan — a taste question, not a hazard,
   and it ships PHOTOGRAPHED on the fan sheet under the standing pattern for
   extremes (max-roll faceting, the ROLL CLAMP look, the spread-6 plate, the
   135 and 161.25 degree tilts). Tightening it is one constant change WITH
   THAT CELL AS ITS EVIDENCE; do not tighten it on the strength of this note.

   CLAMPING THE OUTPUT, NEVER THE INPUT — the project's standing rule, and the
   reason the whole (perSide x spacing) rectangle stays reachable. The slider
   SATURATES and the read-out says "(CAPPED)", exactly as the roll floor, the
   tip floor and both foot clamps do. A slider that has stopped moving must
   say so rather than read as broken. */
export const FAN_ARC_LIMIT_DEG = 170;

/* THE FAN'S PETAL-PER-SIDE CEILING, asserted equal to the registry's own max
   by the harness (the MAX_LAYERS and SHEET_THICKNESS_MM precedent — two
   statements of one bound, checked rather than commented).

   WHAT BINDS IT IS NOT TRIANGLES, measured before it was chosen: 8 per side
   with a mirror-line petal is 17 petals, and at three whorls that is 51
   petals for 64,284 export triangles — 4.3% of the 1.5 M budget, and well
   under the 149,568 a 40-petal three-layer RADIAL bloom already exports. The
   flower caps ITS fan at 3 per side because it carries a per-petal control
   GROUP for each one; the bloom has no per-petal controls, so that bound does
   not transfer. 8 is where the arc limit starts binding across most of the
   spacing slider (at 8 per side the cap takes over from 30 degrees upward),
   which is the point past which the control stops doing anything new. */
export const MAX_FAN_PER_SIDE = 8;

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
  /* THE SHEET THICKNESS ACTUALLY EMITTED, recorded by emitPanel at the moment
     it offsets a row. It is deliberately NOT the same thing as "every value
     that was passed to floorThickness": a bug that routed a row's thickness
     around the floor would also route it around that telemetry, so `min
     sheet` in the read-out would keep reporting the floored number while the
     geometry carried a thinner one — a label naming a computation nobody
     performed, in the one figure a reader would use to check the floor. This
     measures the emission. It is the channel the export-floor assertion
     reads, and the reason that assertion can fail. */
  noteSheet(t) { if (this.exportMode && t < this.minThickness) this.minThickness = t; }
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
   at, or the area rule would size the junction from a thickness nothing has.

   ===================================================================
   LAYERS: ONE OWNER, N RINGS (Sep 1). This function now returns
   `{ layers: [...], hub, ... }` — one descriptor per whorl plus the hub the
   junction is built on. Each layer descriptor has the SAME SHAPE the single
   ring always had, so buildPetalInto is unchanged and reads one of them.

   WHY A LAYERED RETURN AND NOT ONE CALL PER LAYER. Both satisfy "exactly one
   owner" on their face; only one of them satisfies "no per-layer consumer
   arithmetic". The hub radius and the area-rule total are NOT per-layer
   quantities — they are functions of every layer at once — so a per-layer
   call cannot produce them, and the consumer would have to sum. That is the
   arithmetic the invariant forbids, so the sum happens here, once.

   EACH LAYER'S PLACEMENT LIVES HERE TOO — `scale`, `phase`, `tiltExtra`
   alongside `radius`, `width`, `thickness`, `overhang`. That is deliberate
   and slightly wider than this function's name: `width` ALREADY derives from
   the layer's scale, so scale is inside this function whether or not it is
   returned, and a second owner for "what is layer L's placement" would be one
   more thing to keep in step every time a layer parameter is added. One
   owner answers "what is layer L", not merely "where is its foot ring".

   THE RADIUS MODEL, and what derives from what:
     R0        = sqrt( SUM over layers of count * rFoot_L^2 ) * spread
                 the area rule, now over EVERY foot that feeds the hub
     radius_L  = R0 * layerSize^L        (one factor, applied here)
     hub.radius = R0  ( = layers[0].radius, since layerSize^0 is exactly 1)

   CONTAINMENT IS A CONSEQUENCE, NOT A CLAMP. `layerSize` maxes at 0.90 < 1,
   so radius_L <= R0 for every L and each foot's WHOLE footprint lies inside
   the hub disc — strictly stronger than the single-ring argument, where only
   layer 0's feet overlapped the rim. Nothing here clamps to achieve that; it
   falls out of the model, which is why it cannot be tuned away by accident.

   THE OVERLAP BOX DOES NOT DEGRADE WITH LAYERS. None of `overhang` (absolute
   1.5 mm floor), `width` (FOOT_MIN_WIDTH_MM) or `thickness` (MIN_FEATURE_MM
   in export) is a function of the layer index, so the charter's standing
   worst case — >= 1.5 x >= 1.6 x >= 1.0 mm — is the SAME bound per layer at
   any layerCount. Measured at ALL THIN x spread min x 3 layers: 2.40 mm^3 on
   every layer, exactly the single-ring corner's number.

   HEIGHT IS NOT HERE, AND THAT IS THE RULING (Eva, Sep 1). Every layer's feet
   sit at z = 0. A foot at z = h spans [h - t/2, h + t/2] against a hub slab
   spanning [-t/2, +t/2], so solid overlap requires |h| < t — 1.20 mm at the
   shipping sheet and 0.60 mm ALL-THIN, against a 35 mm petal. A height
   control constrained to keep feet in the slab has a range nobody can see and
   CANNOT BE WIDENED, because the bound is the sheet itself: DEAD != INVISIBLE
   says delete it. Depth comes from tilt instead, which lifts the inner
   whorl's tips 6.60 mm above the outer one (layerSize 0.90, layerTilt +12)
   with the feet never leaving the plane — 5.5x what a safe height control
   could ever give.
   THE COSTED FALLBACK, recorded so it is not re-derived: extending the
   junction to REACH lifted feet (a derived collar spanning [0, h] under each
   inner ring). It is a second junction primitive with its own watertightness
   argument and gate rows. It is NOT built and there is no stub for it. The
   evidence that would reopen it is Eva finding the tilt-driven layering flat
   on the arrangement sheet — nothing else.

   ===================================================================
   CONTINUOUS: ONE LAW, TWO QUANTIZERS (Sep 1, Eva's ruling from the brief
   "the spiral is still very distinct layers, and I don't know if it should
   be"). The layered spiral placed three rings and wrote spiral azimuths on
   them; what a sunflower or a succulent rosette actually is has no rings at
   all — one sequence winding inward, every element at its own radius, size
   and tilt.

   THE WHOLE PROPOSAL IS THAT THE LAYER INDEX STOPS BEING AN INTEGER. Every
   per-layer quantity in this function is already a function of a layer index
   L; continuous mode evaluates the SAME functions at non-integer L:

       RINGED      lambda_k = floor(k / petalCount)
       CONTINUOUS  lambda_k = k / petalCount            k = 0 .. K-1
                   K = petalCount * layerCount

       radius_k = R0 * layerSize^lambda_k
       scale_k  = layerSize^lambda_k
       tilt_k   = lambda_k * layerTilt

   NOTHING REINTERPRETS AND NO LABEL LIES, which was the constraint this had
   to satisfy before any of it was worth building. `petalCount` is petals per
   turn in both modes (under RINGED a "turn" is a ring). `layerCount` is how
   many turns. `layerSize` is the shrink per turn. `layerTilt` is the tilt
   gain per turn. That is why continuous mode ships NO sub-controls of its
   own: there is nothing left for them to control. The one control that does
   lose its meaning is `layerPhase` — a whorl-to-whorl offset with no whorls
   to offset — and it is HIDDEN by a registry predicate, never reinterpreted.

   THE DEPTH IS EXTRAPOLATION, NOT INTERPOLATION (Eva, Sep 1, ruled from the
   numbers). lambda runs to layerCount - 1/petalCount, so a continuous bloom
   winds a full `layerCount` turns and reaches DEEPER than the innermost of
   `layerCount` stacked rings, which are only layerCount-1 turns apart. At the
   config the ruling was made on (40 petals, spread 1.55, 3 layers, the
   shipping 0.72 ratio) the innermost blade is 13.17 mm against the ringed
   18.14 mm, and R0 is 7.5% smaller. The alternative — lambda = k(L-1)/(K-1),
   matching ringed's extremes exactly and merely dissolving between them — was
   costed and rejected because it breaks the label story: `petalCount` would
   stop being petals-per-turn (59.5 per turn at that config) and CONTINUOUS
   would collapse onto SPIRAL at layerCount 1. Recorded, not stubbed.

   THE HUB SHRINKS, DERIVED, and that is the area rule working rather than a
   side effect to correct: continuous mode has less total foot area at the
   same settings, because its inner feet are smaller than a full ring of
   innermost-layer feet. Measured — 0.9251 of the ringed R0 at Eva's config,
   0.9749 at layerSize max, 0.8455 at layerSize min.

   CONTAINMENT SURVIVES BY CONSTRUCTION AND GETS STRONGER. `layerSize` maxes
   at 0.90 < 1 and lambda >= 0, so layerSize^lambda <= 1 for every REAL
   lambda, not merely for integers — radius_k <= R0 at every slot, strictly
   decreasing, with `Math.pow(s, 0)` exactly 1 keeping rings[0].radius ===
   hub.radius an EQUALITY. Nothing clamps to achieve it.

   THE OVERLAP BOX DOES NOT DEGRADE EITHER, for exactly the reason it did not
   degrade under layers: none of `overhang` (1.5 mm absolute floor), `width`
   (FOOT_MIN_WIDTH_MM) or `thickness` (MIN_FEATURE_MM in export) is a function
   of the slot index. Measured at the deepest reachable foot — 3 turns x ALL
   THIN x spread min x petalCount 40 x layerSize min, where the innermost ring
   radius is 0.206 mm — the box is 1.500 x 1.600 x 1.000 = 2.400 mm^3, the
   SAME number as the single-ring and layered corners.

   AND THE VOXEL GATE IS BLINDER HERE THAN IT WAS UNDER LAYERS, which is why
   J5 and J6 had to be written. Consecutive foot annuli overlap by 3.154 mm at
   Eva's config (a 0.1735 mm radius step against an 8.486 mm overhang) against
   1.981 mm at three layers: a wrong hub leaves 57 of 120 slots joined to
   nothing and the flood fill still reports one region, chained through the
   119 feet in between. See junctionAssertions() in tools/bloom-harness.mjs. */

/* ===================================================================
   ZYGOMORPHY — petals that differ by POSITION. Session A of two: the override
   architecture plus PER-LAYER roles (the iris). Session B derives roles from a
   mirror plane and gives one slot in a whorl its own record (the orchid's
   labellum and hood). Charter: docs/bloom-charter.md, "Zygomorphy".

   A ROLE IS A GROUP OF SLOTS THAT SHARE ONE OVERRIDE RECORD — not a slot and
   not a layer. That the group is the unit is the whole design, and it is
   MEASURED rather than preferred:

     grouped `n * r^2`  vs  a per-foot `SUM r^2` at the same values
       n = 8    19.556959407132098  ==  identical
       n = 40   97.784797035660489  vs  97.784797035660574   = 6.00 ULP
       n = 40 (petalWidth 30, sheet 2.40)                    = 2.00 ULP

   Had "per-slot overrides" been built as PER-SLOT GROUPING — the obvious
   reading — the ringed area-rule sum would have had to be regrouped per foot
   and EVERY 40-petal export would have moved by 6 ULP for nothing. That is
   the flower's `a*(b+c)` vs `a*b + a*c` trap, which has now fired twice in
   this project family. Grouping by ROLE keeps the loop shape, so at one role
   per layer `roleCount === petalCount` and the sum is bit-identical — which
   `zygoGuardResidual` below asserts as an EQUALITY, not a bound. Grouping by
   role is therefore LOAD-BEARING, not stylistic. Do not regroup it.

   SESSION A'S ROLE DERIVATION IS DELIBERATELY COARSE: two roles, OUTER (the
   outermost whorl) and INNER (every whorl above it). At layerCount 2 that is
   exactly the iris — falls at OUTER, standards at INNER — which is the form
   the session was opened on. It is a DERIVATION, and session B changes only
   the derivation and which descriptors exist; the override MECHANISM below is
   unchanged by it. That is the seam, stated so session B starts from a
   boundary rather than re-deriving one.

   ROLES ARE A RINGED-ARM FEATURE. Under CONTINUOUS there are no layers to
   differentiate — that is precisely what J5 asserts — so every ring is OUTER
   and the override controls are hidden by their own registry predicates.
   Reinterpreting a layer role as a turn role would be a label naming
   something else, which is `layerPhase`'s precedent exactly. Slot roles
   (session B) are additionally RADIAL-only: reflecting a SPIRAL arrangement
   about any plane leaves the best mirror pairing off by up to 20.062 deg at
   n=8 — 45% of a slot gap, measured — so a "mirror" control there would be a
   symmetry label sitting on a measured asymmetry. This project does not ship
   labels that lie about a computation; it is gated, with named rows asserting
   hidden-and-bit-identical, because a gated state is coverage.
   =================================================================== */
export const ROLE_OUTER = 'OUTER';
export const ROLE_INNER = 'INNER';

/* ===================================================================
   SESSION B — SLOT ROLES, THE MIRROR PLANE, AND THE ORCHID.

   A LAYER role says WHICH WHORL a petal is in; a SLOT role says WHERE IN ITS
   WHORL it sits. They are independent axes and a descriptor is one
   (layer x slotRole) cell — which is the whole of what session B changes, per
   the seam. The override MECHANISM below is session A's, multiplied.

   THE MIRROR PLANE IS DERIVED AND IS NEVER A CONTROL: it contains the axis
   and slot 0's radial direction. An orientation slider would rotate WHICH
   slots are the labellum on an arrangement that is otherwise radially
   symmetric — an invisible rigid rotation of the whole bloom under a label
   naming a symmetry, which is `layerPhase`'s recorded trap exactly. Face-on
   framing is the shot tool's camera, not this file's azimuths, so no byte
   moves to put the labellum at the bottom of a picture.

   THE ASSIGNMENT IS EXACT INTEGER ARITHMETIC — no angular comparison, no tie
   tolerance, no epsilon. The plane pairs slot i with slot n-i (mod n), and
   the slots that lie ON it are that involution's FIXED POINTS: slot 0 always,
   and slot n/2 when n is even. So the roles that can be singular are exactly
   the fixed points, which is a fact about the mirror rather than a choice:

     n even   LABELLUM {0}   HOOD {n/2}              LATERAL n-2 slots
     n odd    LABELLUM {0}   HOOD {(n-1)/2, (n+1)/2} LATERAL n-3 slots

   AT ODD n THE ANTIPODE FALLS IN A GAP, so no single slot can be the hood and
   the two slots straddling it take the role together (Eva, Sep 2). They are a
   mirror pair, so nothing about the symmetry claim weakens — a two-lobed
   upper lip is the ordinary bilabiate form. THE EMPTY GROUP IS PUSHED ONTO
   LATERAL DELIBERATELY, and that is the deciding argument rather than a
   detail: LATERAL carries no controls, so an empty LATERAL strands nothing,
   whereas an empty HOOD would leave three hood controls naming a group with
   no members — which is what Z1 already fails INNER on. At petalCount 3 that
   is LABELLUM {0}, HOOD {1,2}, LATERAL {} — one of three IS the labellum, and
   it is the orchid.

   SLOT ROLES ARE RADIAL-ONLY, AND THE CHARTER'S OWN GROUND FOR THAT WAS
   CORRECTED BEFORE IT WAS BUILT ON (session B, Sep 2). Session A's four
   numbers are REAL and reproduce exactly — 32.461 deg at n=5, 20.062 at n=8,
   12.399 at n=13, 4.736 at n=40 — but they measure THIS rule (reflect about
   slot 0's plane, distance from each image to the nearest slot) applied to a
   golden-angle whorl. The charter states them as "reflecting a golden-angle
   arrangement about ANY plane", and that quantifier is FALSE: a golden-angle
   whorl is an arithmetic progression on a circle, so reversing it gives the
   same set and it IS exactly mirror-symmetric — about the plane at
   (n-1)*GOLDEN_ANGLE/2, pairing i <-> n-1-i, measured at <= 8.14e-13 deg at
   every count. The RULING STANDS, on the corrected and stronger ground: under
   SPIRAL the plane is elsewhere and the pairing is a different involution, so
   sharing ONE derivation across placements produces precisely session A's
   measured asymmetry. A correct-for-SPIRAL derivation is RECORDED, NOT BUILT
   — it needs its own evidence and its own ruling. (Rationale is a premise;
   only the instruction binds. The doctrine caught a charter entry this time.)

   AND IT NEEDS layerPhase 0 ABOVE ONE WHORL, which is a second measurement
   rather than caution. The plane is the BLOOM's, so every whorl's slots must
   be symmetric about it; ring L is offset by L*layerPhase slots, and the
   assignment is by index, so all whorls share the plane only at layerPhase 0.
   Measured, worst pairing error over the best SHARED plane:

     2 layers  phase 0.25   30.000 deg at n=3, 11.250 at n=8, 2.250 at n=40
     3 layers  phase 0.33   39.600 deg at n=3, 14.850 at n=8, 2.970 at n=40
     any depth phase 0                                  0.000 at every count

   RECORDED, NOT BUILT: at phase 0.50 the ARRANGEMENT is exactly symmetric
   (0.000, measured) because two slots tie for the plane — but expressing that
   costs a float tie-comparison inside a derivation that is otherwise exact
   integer arithmetic, so it is a refinement with its own ruling, not an
   omission.
   =================================================================== */
export const SLOT_LABELLUM = 'LABELLUM';
export const SLOT_HOOD = 'HOOD';
export const SLOT_LATERAL = 'LATERAL';

/* THE GROUP ORDER, declared once. It fixes the order the area rule sums the
   role groups in, so a reordering is a byte event that has to be made on
   purpose rather than by an object-key accident. */
export const SLOT_ROLE_ORDER = [SLOT_LABELLUM, SLOT_HOOD, SLOT_LATERAL];

/* WHAT A ROLE MAY OVERRIDE, AND BY WHAT LAW — one owner, one table.

   EVERY ENTRY IS A DELTA ON A BASE CONTROL, defaulting to 0, so byte-identity
   at the shipping default is a CONSTRUCTION and not an argument: a zero delta
   is skipped outright (see resolveRoleOverrides), which leaves the guard
   below returning the caller's own `state` object and every consumer taking
   the pre-zygomorphy call character for character. Absolute values were
   rejected: they need a per-control "use base / override" flag, which is the
   flower's CUSTOM problem and makes byte-identity an argument.

   THE SET IS TRIMMED, AND THE ASYMMETRY IS WHY (Eva, Sep 1). Adding a control
   later is one registry row and always will be; retiring one becomes a schema
   bump plus a migration the day anything persists a design. So this starts
   minimal and grows on evidence from real use. RECORDED, NOT BUILT: roll and
   twist deltas, a per-layer tip-taper/base-taper delta, and a per-layer
   `tipThinning` delta — all mechanically identical to the three below, none
   asked for by either target form. A request for "roll on the standards" is
   one row in this table plus one in the registry.

   SIZE AND TILT ARE ABSENT ON PURPOSE (Eva's Q5 ruling). `layerSize` and
   `layerTilt` are lambda-RAMPS that already own per-layer size and tilt, and
   they are the only depth controls that survive CONTINUOUS. A per-layer role
   override of either would be a second owner of one quantity. So layer roles
   override exactly what the ramps do not. Two prefixes, two laws: `layer*` is
   a ramp, `inner*` is a role override.

   THE BOUNDS ARE DECLARED HERE AND ASSERTED AGAINST THE REGISTRY by both
   gates (the SHEET_THICKNESS_MM precedent). bloom-geometry.js imports nothing,
   so it cannot read the registry's ranges; restating them without a check
   would be a second owner, and the check is what makes it one. A composed
   value is clamped into the BASE control's own range so it is always a value
   the base control could itself hold — which keeps every downstream
   invariant, and every gate row's reasoning, inside the proven envelope.
   `petalTipBreadth` matters most: the tip cap partitions on `=== 0` EXACTLY,
   so a negative composed breadth would silently leave the pointed family and
   re-square the tip Eva ruled to a point.

   TWO LAWS NOW, AND THE KEY WAS RENAMED WITH THEM. Session A's rows carried
   the control id under a key called `delta`, which was honest while every row
   WAS one; a multiplier row under that key would be a stored label-lie, this
   project's most repeated defect. So the id lives under `control` and the law
   is named in `law`. Nothing persists these (they are code, not a design), so
   the rename is free and no retirement is owed.

     law 'delta'  composed = base + value      identity 0
     law 'mul'    composed = base * value      identity 1

   BOTH IDENTITIES ARE SKIPPED OUTRIGHT rather than applied (see
   resolveOverrides), so neither `x + 0` nor `x * 1` is ever evaluated on the
   shipped path — the guard is object identity, exactly as session A built it,
   and it did not need extending so much as re-pointing.

   ONE CONTROL MAY DRIVE SEVERAL BASES: `labellumSize` scales petalLength AND
   petalWidth, because "size" is both. Two rows sharing one control id is the
   explicit form; a row naming a list of bases would hide the per-base clamp
   ranges, which genuinely differ.

   SIZE x NEVER REACHES THE RING, and that is structural rather than careful.
   footRing() reads `state.petalWidth` for the foot's authored width; only
   buildPetalInto reads `ps.petalLength` / `ps.petalWidth`. So a size
   multiplier moves the BLADE and cannot move rFoot, the area-rule sum, R0 or
   hub.radius — which is why J2's containment stays an EQUALITY rather than
   acquiring a tolerance, and why pointing those two footRing lines at `ps` is
   a positive control (M4) with J2 and Z6 as its witnesses.

   SIZE x SATURATES, and the read-out says so. A composed value is clamped
   into the BASE control's own range (session A's envelope rule), so at the
   default 35 mm x 16 mm a x2.00 labellum asks for 70 x 32 and gets 60 x 30 —
   the multiplier stops moving before its slider does. That is the roll
   floor's "(clamped)" discipline, arriving on a multiplier.

   TILT IS OVERRIDABLE AT SLOT LEVEL AND NOT AT LAYER LEVEL, which is not an
   inconsistency: `layerTilt` is the lambda-ramp that owns per-LAYER tilt, so a
   layer-role tilt override would be a second owner of one quantity (Eva's Q5
   ruling). No ramp owns per-SLOT tilt, so there is no second owner here.
   petalTilt's own range starts at 0, so a labellum tilt delta reaches
   HORIZONTAL and never drooping — which is why the labellum also gets a CURL
   delta (Eva, Sep 2): spine curl is what makes a lip hang and reflex, and it
   is the one control that can. */
export const ROLE_OVERRIDES = [
  /* LAYER ROLES — session A's three, unchanged in law, range and effect. */
  { role: ROLE_INNER, base: 'petalSpineCurl',  control: 'innerCurl',       law: 'delta', min: -180, max: 360 },
  { role: ROLE_INNER, base: 'petalCup',        control: 'innerCup',        law: 'delta', min: -0.8, max: 1.2 },
  { role: ROLE_INNER, base: 'petalTipBreadth', control: 'innerTipBreadth', law: 'delta', min: 0,    max: 0.6 },

  /* SLOT ROLES — the orchid. Labellum 5, hood 3 (Eva, Sep 2). */
  { role: SLOT_LABELLUM, base: 'petalLength',     control: 'labellumSize',       law: 'mul',   min: 20,   max: 60 },
  { role: SLOT_LABELLUM, base: 'petalWidth',      control: 'labellumSize',       law: 'mul',   min: 8,    max: 30 },
  { role: SLOT_LABELLUM, base: 'petalTipBreadth', control: 'labellumTipBreadth', law: 'delta', min: 0,    max: 0.6 },
  { role: SLOT_LABELLUM, base: 'petalTilt',       control: 'labellumTilt',       law: 'delta', min: 0,    max: 75 },
  { role: SLOT_LABELLUM, base: 'petalCup',        control: 'labellumCup',        law: 'delta', min: -0.8, max: 1.2 },
  { role: SLOT_LABELLUM, base: 'petalSpineCurl',  control: 'labellumCurl',       law: 'delta', min: -180, max: 360 },

  { role: SLOT_HOOD, base: 'petalLength', control: 'hoodSize', law: 'mul',   min: 20,   max: 60 },
  { role: SLOT_HOOD, base: 'petalWidth',  control: 'hoodSize', law: 'mul',   min: 8,    max: 30 },
  { role: SLOT_HOOD, base: 'petalTilt',   control: 'hoodTilt', law: 'delta', min: 0,    max: 75 },
  { role: SLOT_HOOD, base: 'petalCup',    control: 'hoodCup',  law: 'delta', min: -0.8, max: 1.2 },
];

/* THE LAW'S IDENTITY VALUE — one owner, because three places ask "is this
   control at its identity": the resolver's skip, the registry's defaults, and
   both gates. A second copy is how a `mul` row would eventually get tested
   against 0. */
export const LAW_IDENTITY = { delta: 0, mul: 1 };

/* THE CLAMP RANGE PER BASE, derived from the table rather than restated, and
   CHECKED at module load. Several rows may name one base (petalCup is reached
   by innerCup, labellumCup and hoodCup); they must agree, because the composed
   value is clamped ONCE at the end and a per-row range would then be three
   answers to one question. Throws loudly: a disagreement here is a bug that
   would otherwise show up as a silently different clamp on one role. */
export const OVERRIDE_BOUNDS = (() => {
  const out = new Map();
  for (const o of ROLE_OVERRIDES) {
    if (!(o.law in LAW_IDENTITY)) throw new Error(`ROLE_OVERRIDES: ${o.control} declares unknown law "${o.law}"`);
    const prev = out.get(o.base);
    if (!prev) { out.set(o.base, { min: o.min, max: o.max }); continue; }
    if (prev.min !== o.min || prev.max !== o.max) {
      throw new Error(`ROLE_OVERRIDES: base "${o.base}" is clamped to ${prev.min}..${prev.max} by one row and ${o.min}..${o.max} by ${o.control} — one base, one range`);
    }
  }
  return out;
})();

/* ===================================================================
   THE TWO INVOLUTIONS — session 10, and BOTH WERE ALREADY WRITTEN DOWN before
   the fan existed to need one. Session B corrected session A's SPIRAL premise
   and, in doing so, derived the OTHER pairing: a golden-angle whorl is exactly
   mirror-symmetric about the plane at (n-1)*GOLDEN_ANGLE/2, pairing
   `i <-> n-1-i`, at <= 8.14e-13 deg. That pairing is FIXED-POINT-FREE, and a
   symmetric arc with NO petal on the mirror line is exactly a mirror through
   the GAP — so the fan needs precisely the involution that was derived for a
   different reason. That is the third time this project has produced a piece
   of mathematics before discovering its purpose, and the charter says so.

     MIRROR_THROUGH_SLOT   i <-> n-i (mod n)   fixed points: 0 always, n/2 at
                                               even n. LABELLUM and HOOD can
                                               be SINGULAR. RADIAL, and the
                                               fan with a mirror-line petal.
     MIRROR_THROUGH_GAP    i <-> n-1-i         NO fixed points. Every role is
                                               a PAIR. The fan with the toggle
                                               off, where the plane runs
                                               between the two inner petals.

   WHICH ONE APPLIES IS DERIVED FROM THE ARRANGEMENT, never chosen: an
   orientation or pairing control would rotate which slots are the labellum on
   an otherwise symmetric bloom, which is `layerPhase`'s recorded trap exactly.
   =================================================================== */
export const MIRROR_THROUGH_SLOT = 'THROUGH_SLOT';
export const MIRROR_THROUGH_GAP = 'THROUGH_GAP';

/* THE PAIRING ITSELF — one owner, exact integer arithmetic, no angle and no
   tolerance. `mirrorPartner(mirrorPartner(i)) === i` for every i in both arms,
   which is what makes each an involution and what Z4b checks as a BIJECTION
   against the emitted azimuths. */
export function mirrorPartner(i, n, mirror) {
  return mirror === MIRROR_THROUGH_GAP ? n - 1 - i : (n - i) % n;
}

/* WHICH PLANE THIS STATE'S ARRANGEMENT HAS. Derived from the placement and
   the toggle, in one place, so `roleForSlot`, the read-out's phrasing and
   both gates cannot keep three answers. */
export function mirrorFor(state) {
  return (state.placement === 'FAN' && state.fanCenterPetal === 'OFF')
    ? MIRROR_THROUGH_GAP
    : MIRROR_THROUGH_SLOT;
}

/* THE SLOT -> ROLE ASSIGNMENT. Exact integer arithmetic; see the block above
   for the derivation and for why the odd-n hood is a pair. ONE OWNER:
   footRing() calls this and stamps the answer onto each descriptor, and
   buildBloomInto looks a descriptor up by slot index and computes nothing.

   THE SECOND ARM IS THE FAN'S (session 10), and its shape follows from the
   pairing rather than from taste. With no fixed point every role is a PAIR:
   the pair CLOSEST to the plane is the LABELLUM — Eva's ruling, "the inner
   pair when the toggle is off" — and the pair FARTHEST from it is the HOOD,
   which is the same relation the through-slot arm has (labellum at the plane,
   hood at its far end) with singletons replaced by pairs.

   AT TWO PETALS THE TWO PAIRS ARE THE SAME PAIR, AND LABELLUM WINS (Eva,
   Sep 2). One per side with no mirror-line petal is n = 2, where the inner
   pair IS the outer pair, and a slot cannot carry two slot roles — a
   descriptor is one (layer x slotRole) cell and two would break the partition
   Z1 checks. So the tie breaks toward the labellum, which is the fan's
   defining petal ("the petal on the mirror line is petal number one, and it
   has its own sliders" — Eva's original fan principle), and the HOOD comes
   out EMPTY.

   AN EMPTY HOOD IS NOT LEFT DANGLING, and this is where the edge case turned
   into a rule. Session B pushed the empty group onto LATERAL precisely because
   LATERAL carries no controls, so an empty LATERAL strands nothing while an
   empty HOOD would leave three sliders naming a group with no members. Here
   the empty group CANNOT be moved to LATERAL — the collision is between two
   control-bearing roles — so the other half of that argument is discharged
   instead: the hood's controls HIDE when the hood is empty
   (PREDICATES.hoodEmpty in bloom-registry.js), and Z1 asserts, in both
   directions, that a role's controls are visible IFF the role is non-empty.
   Membership and visibility became ONE statement with one owner rather than
   two rules that could drift apart. */
export function roleForSlot(i, n, mirror = MIRROR_THROUGH_SLOT) {
  if (mirror === MIRROR_THROUGH_GAP) {
    /* n is even here by construction (2 * perSide), so n/2 is exact. The
       labellum test runs FIRST, which is the whole of the n = 2 tie-break. */
    if (i === 0 || i === n - 1) return SLOT_LABELLUM;
    return (i === n / 2 - 1 || i === n / 2) ? SLOT_HOOD : SLOT_LATERAL;
  }
  if (i === 0) return SLOT_LABELLUM;
  if (n % 2 === 0) return i === n / 2 ? SLOT_HOOD : SLOT_LATERAL;
  return (i === (n - 1) / 2 || i === (n + 1) / 2) ? SLOT_HOOD : SLOT_LATERAL;
}

/* WHETHER SLOT ROLES APPLY AT ALL — the gating, expressed HERE as well as in
   the registry because neither file can read the other's answer and both must
   act on it (the SHEET_THICKNESS_MM precedent). The registry HIDES the
   controls; this makes them INERT, so a hidden slider cannot move geometry —
   which is exactly what the named GATED rows assert. Two statements of one
   boundary is a registration risk, so both gates assert this function agrees
   with the registry's `slotRolesEligible` predicate on EVERY matrix row.

   The gating lives in the DERIVATION rather than in a separate flag: when it
   does not hold every slot is LATERAL, LATERAL carries no controls, so no
   record resolves and the descriptor list collapses on its own. That is
   session A's pattern for CONTINUOUS one level down. */
export function slotRolesEligible(state) {
  /* THE FAN IS ELIGIBLE AT EVERY DEPTH, and that is a consequence rather than
     an exemption (session 10). The condition below is "every whorl shares the
     one plane", which under RADIAL needs `layerPhase` 0 above one whorl. A fan
     has no whorl-to-whorl offset at all — `layerPhase` is HIDDEN there and
     `phase` is exactly 0 on every descriptor by construction — so the shared
     plane holds at any layerCount. The fan is therefore the first placement
     where slot roles reach three whorls, which is its own named gate row. */
  if (state.placement === 'FAN') return true;
  if (state.placement !== 'RADIAL') return false;
  return Math.round(state.layerCount) === 1 || state.layerPhase === 0;
}

/* THE SLOT -> ROLE ASSIGNMENT, and it has exactly ONE owner. footRing() calls
   it and stamps the answer onto each descriptor; buildPetalInto READS
   `ring.role` and computes nothing. That is the same relation `scale`,
   `phase` and `tiltExtra` have carried since layers shipped. */
export function roleForLayer(layerIndex, continuousMode) {
  return (continuousMode || layerIndex === 0) ? ROLE_OUTER : ROLE_INNER;
}

/* THE RESOLVED RECORD, or null. Null is the guard's whole mechanism: an OUTER
   ring, or an INNER ring with every delta at 0, carries no record at all, and
   petalStateFor() then hands the builder the caller's own state OBJECT.

   A zero delta is SKIPPED rather than added. `x + 0` is exact for every
   finite x and the clamp would be a no-op, so the skip is not needed for the
   arithmetic — it is needed so that "no overrides" produces `null` and the
   identity guard has something to test. Resting the layer on `-0 + 0` being
   `+0` is the case analysis the form layer deliberately declined to rest on;
   this does not need it. */
/* SESSION B COMPOSES TWO ROLE AXES, and the composition law is stated rather
   than left to argument. For each base, start from `state[base]`, apply every
   matching row IN TABLE ORDER (layer rows first, then slot rows — a whorl's
   character, then how one slot differs within it), and clamp ONCE at the end
   into the base's own range. Clamping per row instead would let an
   intermediate clip eat the second row's reach, silently.

   `roles` is the list of roles this descriptor carries — [layerRole] under
   session A's shape, [layerRole, slotRole] once a whorl is split. Passing a
   LIST rather than two arguments is what keeps this one loop: adding a third
   axis later is a longer list, not a rewritten resolver.

   THE ZERO/ONE SKIP IS THE WHOLE GUARD, unchanged from session A in mechanism
   and merely re-pointed at the law's own identity. A row at its identity is
   SKIPPED, never applied, so `x + 0` and `x * 1` are not evaluated at all on
   the shipped path; with every row skipped `out` stays null, and
   petalStateFor() then returns the caller's own state OBJECT. That is why
   byte-identity at the defaults is a construction rather than an argument,
   and why it survived gaining a second law. */
export function resolveRoleOverrides(state, roles, clampedOut = null) {
  let out = null;
  for (const o of ROLE_OVERRIDES) {
    if (!roles.includes(o.role)) continue;
    const v = state[o.control];
    if (!(v !== LAW_IDENTITY[o.law])) continue;   // identity and NaN alike take the shipped path
    const from = (out && o.base in out) ? out[o.base] : state[o.base];
    (out || (out = {}))[o.base] = o.law === 'mul' ? from * v : from + v;
  }
  if (out === null) return null;
  /* THE CLAMP, ONCE, AFTER COMPOSITION. Every composed value must be one the
     BASE control could itself hold, so every downstream invariant and every
     gate row's reasoning stays inside the proven envelope. `petalTipBreadth`
     matters most: the tip cap partitions on `=== 0` EXACTLY, so a negative
     composed breadth would silently leave the pointed family and re-square
     the tip Eva ruled to a point. */
  for (const base of Object.keys(out)) {
    const b = OVERRIDE_BOUNDS.get(base);
    const composed = out[base];
    out[base] = clamp(composed, b.min, b.max);
    /* WHICH BASES THE CLAMP ACTUALLY BIT, reported through an out-parameter
       rather than recomputed by the read-out. A size multiplier saturates
       long before its slider ends (x2.00 on a 35 mm petal asks 70 and gets
       60), and a slider that has stopped moving must not read as broken —
       the roll floor's "(clamped)" discipline. An out-parameter keeps ONE
       copy of the composition law: a read-out that re-derived "what was
       asked for" would be a second one, and it is the second copy that
       drifts. */
    if (clampedOut && out[base] !== composed) clampedOut.push({ base, asked: composed, got: out[base] });
  }
  return out;
}

/* THE GUARD, AND IT IS OBJECT IDENTITY — the cheapest one available and the
   strongest. With no record this returns the SAME OBJECT it was handed, so
   widthProfile, petalForm, thicknessProfile and the three inline reads in
   buildPetalInto take the pre-zygomorphy call on the pre-zygomorphy object.
   There is no expression to have got subtly wrong, which is why this is
   stated as a construction rather than measured as a residual — and the byte
   report is still what confirms it, on 598 frozen rows plus the live matrix.

   NOT ALLOWED TO BE SOMEWHERE A BUG SITS UNEXERCISED (formGuardResidual's
   doctrine): the gates assert, on every row, that a ring with no record makes
   the builder report EXACTLY the base state's values (Z2), so the guarded
   path is measured rather than assumed to be taken. */
export function petalStateFor(state, ring) {
  if (!ring.overrides) return state;
  return { ...state, ...ring.overrides };
}

export function footRing(state, acc) {
  const thickness = acc.floorThickness(state.sheetThickness);
  const layerCount = Math.round(state.layerCount);
  if (!(layerCount >= 1 && layerCount <= MAX_LAYERS)) {
    throw new Error(`layerCount ${JSON.stringify(state.layerCount)} is outside 1..${MAX_LAYERS} — the registry and the builder have diverged`);
  }
  /* PLACEMENT IS VALIDATED HERE TOO, and loudly, for the same reason
     buildWhorlInto validates it: this function now BRANCHES on it, so an
     unknown value would silently take the ringed arm and build a design
     nobody asked for. Two validations of one enum are not two owners of a
     boundary — the registry owns the option list, and each consumer that
     branches says out loud when it is handed something outside it. */
  if (state.placement !== 'RADIAL' && state.placement !== 'SPIRAL' && state.placement !== 'CONTINUOUS' && state.placement !== 'FAN') {
    throw new Error(`unknown placement ${JSON.stringify(state.placement)} — the registry and the builder have diverged`);
  }
  const continuousMode = state.placement === 'CONTINUOUS';
  /* ===================================================================
     THE FAN'S OWN DERIVED QUANTITIES, owned HERE (session 10) — the step, the
     span, the notch and whether the arc limit bit. They live in footRing()
     for the reason every other derived placement quantity does: it owns the
     ring list, and buildWhorlInto is handed the law's parameters rather than
     deriving them, exactly as it is handed `radius`, `phase` and the two
     ramps today. A second owner for "how wide is a step" would be one more
     thing to keep in step, and the read-out and both gates would each be able
     to disagree with the geometry.

     THE COUNT IS DERIVED AND `petalCount` IS HIDDEN (Eva's ruling, Sep 2).
     A fan's petal count is `2 * perSide + (a mirror-line petal ? 1 : 0)`, so
     reusing `petalCount` would mean a stored 8 rendering as 8 petals under
     RADIAL and 17 under FAN — a label lie on a PERSISTED key, which is worse
     than one on a read-out because a saved design carries it forever. So
     `petalCount` takes the `layerPhase` treatment: hidden by a registry
     predicate, never reinterpreted, with the derived total printed in the
     read-out so the number the visitor lost is still on screen.

     `fanCount` IS THE DOUBLE EVERY DOWNSTREAM EXPRESSION TAKES, and that is a
     byte argument rather than a convenience: on the non-fan path the same
     expressions must receive `state.petalCount` ITSELF, the identical double
     the pre-fan code multiplied by, so the area rule is bit-identical by
     construction. Measured on 396 (count x width x sheet x delicacy x mode)
     rows before this was written: substituting a variable holding the same
     double is bit-identical on all 396, while REGROUPING the sum per foot —
     the tempting "same rule" rewrite — moves the derived radius on 124 of
     them at up to 4.00 ULP. That is the `a*(b+c)` vs `a*b + a*c` trap, and
     preventing it here is its FIFTH prevention in this project family. */
  const fanMode = state.placement === 'FAN';
  const fanCentre = fanMode && state.fanCenterPetal === 'ON';
  const fanPerSide = fanMode ? Math.round(state.fanPerSide) : 0;
  if (fanMode && !(fanPerSide >= 1 && fanPerSide <= MAX_FAN_PER_SIDE)) {
    throw new Error(`fanPerSide ${JSON.stringify(state.fanPerSide)} is outside 1..${MAX_FAN_PER_SIDE} — the registry and the builder have diverged`);
  }
  /* THE OUTERMOST PETAL'S INDEX IN STEP UNITS — `perSide` with a mirror-line
     petal (petals at 1..P steps), `perSide - 0.5` without (petals at
     0.5..P-0.5 steps). The flower's own expression, ported. */
  const fanMaxK = fanCentre ? fanPerSide : fanPerSide - 0.5;
  const fanAsked = fanMode ? Number(state.fanSpacing) : 0;
  const fanStepDeg = fanMode ? Math.min(fanAsked, FAN_ARC_LIMIT_DEG / fanMaxK) : 0;
  const fanCapped = fanMode && fanStepDeg < fanAsked;
  const fan = fanMode ? {
    perSide: fanPerSide,
    centre: fanCentre,
    /* RADIANS is what the primitive places with; degrees are what the panel
       and the read-out speak. Both are here so no consumer converts. */
    step: (fanStepDeg * Math.PI) / 180,
    stepDeg: fanStepDeg,
    askedDeg: fanAsked,
    capped: fanCapped,
    spanDeg: 2 * fanMaxK * fanStepDeg,
    gapDeg: 360 - 2 * fanMaxK * fanStepDeg,
    limitDeg: FAN_ARC_LIMIT_DEG,
  } : null;
  const fanCount = 2 * fanPerSide + (fanCentre ? 1 : 0);
  /* The SLOT COUNT as an integer (role loops, slot maps) and as the DOUBLE
     every pre-fan expression already held (the area rule, buildWhorlInto's
     count and its RADIAL azimuth divisor). Two names because the pre-fan code
     genuinely used two — `Math.round(state.petalCount)` for the role loop and
     `state.petalCount` unrounded for the sum — and collapsing them would move
     bytes for nothing. */
  const n = fanMode ? fanCount : Math.round(state.petalCount);
  const slotCount = fanMode ? fanCount : state.petalCount;
  /* THE CONTINUOUS LAW ITSELF, as a closure, so the ring loop and the
     quantizer cross-validation below evaluate the SAME expression. Written
     inline in both places it would be two copies of the one thing this whole
     layer is — and the cross-validation would then agree with a mutated loop
     by mutating alongside it, which is a check that cannot fail. */
  const lambdaAt = (k) => k / n;
  /* THE GOLDEN-ANGLE SEQUENCE'S LENGTH — one owner, because two consumers
     need it and neither may keep its own answer: buildBloomInto uses it as
     the slot count of the single continuous whorl, and the read-out's
     legibility flag compares it against SPIRAL_LEGIBLE_COUNT. Under SPIRAL
     each whorl runs its OWN sequence, so the length is `petalCount`; under
     CONTINUOUS there is one sequence over the whole bloom. RADIAL has no
     golden-angle sequence at all and reports `petalCount`, which is what the
     flag's predicate already ignores. */
  const sequenceLength = continuousMode ? layerCount * n : n;
  /* Foot width follows the petal it feeds — a fraction of blade width, scaled
     by `footDelicacy`, with a floor so very narrow petals keep a printable
     root. THIS IS THE ONLY PLACE `footDelicacy` EXISTS, exactly as spread is
     applied here and nowhere else: every consumer reads `width` and knows
     nothing about how it was sized. widthProfile's root blend reads it too,
     so the blade's base slims with its foot instead of leaving a waist —
     that is the registration rule, not a side effect.

     WHY DELICACY IS THE WIDTH AND NOT THE THICKNESS (measured, Aug 31). A
     thickness-scaling delicacy is INERT IN EXPORT below 0.833 at the default
     1.2 mm sheet, because MIN_FEATURE_MM eats it — 83% of the range would
     move the live view and nothing that prints. The width survives the floor
     across its whole range. Sheet thickness is a control of its own; this is
     the dimension that answers "how narrow is the connection".

     IT IS NOT THE CLAW. The claw is a SILHOUETTE term producing a strict
     interior local minimum, narrower than its own foot; this scales the foot
     and everything that reads it, monotonically, so no profile is made
     non-monotone. Eva's rounded/ovate ruling is untouched. */
  /* PER-LAYER FOOT CROSS-SECTIONS. At layerCount 1 the loop runs once with
     `scale` EXACTLY 1 (Math.pow(x, 0) is exactly 1), so `petalWidth * 1` is
     `petalWidth` and this evaluates the same operations, in the same order,
     on the same doubles as the pre-layer code. The single-layer default is
     byte-identical here BY CONSTRUCTION; the byte report confirms it. */
  const raw = [];
  /* THE AREA-RULE TOTAL, GROUPED BY ROLE — the shipped sum from here on, and
     the reason the grouping is by role rather than by slot is measured in the
     ZYGOMORPHY block above (per-slot grouping moves every 40-petal export by
     6 ULP). At one role per ring `roleCount` is exactly the group size the
     pre-role expression used, so both arms are bit-identical here today; that
     is asserted, not asserted-by-comment, by `zygoGuardResidual` below.
     WHAT THE AREA RULE SUMS IS UNCHANGED IN DEFINITION: r_ring^2 = SUM of
     r_foot^2 over every foot that feeds the hub. Only the grouping is named. */
  let sumSq = 0;
  /* THE PRE-ROLE EXPRESSION, VERBATIM, carried alongside purely to be
     compared against — the guardResidual doctrine one layer up. It is the
     ringed `state.petalCount * rFoot * rFoot` and the continuous
     `rFoot * rFoot` character for character, so the comparison is between two
     genuinely different groupings rather than between an expression and a
     restatement of itself. Nothing geometric reads it. */
  let preRoleSumSq = 0;
  /* ===================================================================
     THE COLLAPSE GUARD — null means "one descriptor per layer, exactly as
     session A", and it is LOAD-BEARING RATHER THAN TIDINESS. MEASURED before
     it was written: splitting a whorl's `n * rFoot^2` into
     `1*r^2 + h*r^2 + l*r^2` moves the derived ring radius on 46 of 264
     (config x mode) rows — worst 0.99 ULP, 3.553e-15 on a 17.26 mm radius at
     n=39 x petalWidth 30 x sheet 2.40 — and it moves at n=3 as readily as at
     n=40. So an UNCONDITIONAL split would move those exports for nothing.
     That is the flower's `a*(b+c)` vs `a*b + a*c` trap, and this is its
     FOURTH appearance in this project family (it fired on a real row when
     layers were written, would have fired on per-slot grouping in session A,
     is why the continuous arm is a branch rather than a reformulation, and
     would have fired here). Prevented at design time again, by measurement.

     SO THE SPLIT IS CONDITIONAL ON A RECORD EXISTING, never on a flag: the
     partition is dropped entirely unless some slot role actually resolves an
     override. Ineligible placement or depth makes every slot LATERAL, LATERAL
     carries no rows in ROLE_OVERRIDES, so nothing resolves and this returns
     null on its own — the gating needs no second mechanism. Z5 asserts the
     collapse in BOTH directions, so the guard is never somewhere a bug sits
     unexercised (formGuardResidual's doctrine, one level up). */
  /* WHICH PLANE THIS ARRANGEMENT HAS — one owner (mirrorFor), read once and
     passed down, so the role derivation, the read-out's phrasing and the
     gates cannot end up with three answers to one question. */
  const mirror = mirrorFor(state);
  /* ===================================================================
     THE SLOT-ROLE CENSUS — WHO IS IN EACH GROUP, computed whenever slot roles
     are ELIGIBLE and independently of whether a whorl actually SPLIT.

     WHY IT IS SEPARATE FROM `slotGroups` (session 10): the split is
     conditional on a control being off its identity (the collapse guard), but
     the QUESTION "does the hood have any members" is about the arrangement
     alone and has an answer at every eligible state — including the shipping
     default, where nothing is overridden and nothing splits. The hood's
     controls hide on that answer and Z1 asserts visibility against it in both
     directions, so it has to exist without a split. Telemetry plus the
     collapse guard's input; nothing geometric reads the counts. */
  const slotRoleCensus = (continuousMode || !slotRolesEligible(state)) ? null : (() => {
    const bySlot = new Map();
    for (let i = 0; i < n; i++) {
      const r = roleForSlot(i, n, mirror);
      if (!bySlot.has(r)) bySlot.set(r, []);
      bySlot.get(r).push(i);
    }
    return bySlot;
  })();
  const slotGroups = (() => {
    if (slotRoleCensus === null) return null;
    const roles = SLOT_ROLE_ORDER.filter((r) => slotRoleCensus.has(r));
    if (!roles.some((r) => resolveRoleOverrides(state, [r]) !== null)) return null;
    return roles.map((r) => ({ role: r, slots: slotRoleCensus.get(r) }));
  })();
  if (continuousMode) {
    /* THE CONTINUOUS ARM — one ring per PETAL, `lambda` a real number.

       IT IS A BRANCH AND NOT A REFORMULATION, exactly as buildWhorlInto's
       RADIAL arm is, and for a reason measured rather than preferred: the
       ringed arm accumulates `count * rFoot^2` once per layer and this arm
       accumulates `rFoot^2` once per foot. Those are the same number in
       algebra and NOT the same double — the `a*(b+c)` vs `a*b + a*c` trap
       that fired on a real row when the layered law was written. Rewriting
       the ringed sum as a per-foot sum "because it is the same rule" would
       move every layered export by an ULP or two for nothing. So the ringed
       loop below is untouched, character for character, and this one stands
       beside it. Nothing is shared between them except the per-foot
       expressions, which are identical in both.

       WHAT THE AREA RULE SUMS IS UNCHANGED IN DEFINITION: r_ring^2 = SUM of
       r_foot^2 over every foot that feeds the hub. Only the grouping of equal
       terms differs. */
    for (let k = 0; k < sequenceLength; k++) {
      const lambda = lambdaAt(k);
      const scale = Math.pow(state.layerSize, lambda);
      const authoredWidth = state.petalWidth * scale * 0.4 * state.footDelicacy;
      const width = clamp(authoredWidth, FOOT_MIN_WIDTH_MM, FOOT_MAX_WIDTH_MM);
      const rFoot = Math.sqrt((width * thickness) / Math.PI);
      /* A CONTINUOUS RING CARRIES EXACTLY ONE PETAL, so its role group is one
         slot. `1 * x * x` is `x * x` exactly in IEEE-754 (multiplication by
         1.0 is exact for every finite x), which the residual measures rather
         than assumes. */
      const roleCount = 1;
      sumSq += roleCount * rFoot * rFoot;
      preRoleSumSq += rFoot * rFoot;
      raw.push({ lambda, scale, authoredWidth, width, rFoot, roleCount, role: roleForLayer(k, true), slotRole: null, slots: null, clamped: [] });
    }
  } else {
  for (let L = 0; L < layerCount; L++) {
    const scale = Math.pow(state.layerSize, L);
    const authoredWidth = state.petalWidth * scale * 0.4 * state.footDelicacy;
    const width = clamp(authoredWidth, FOOT_MIN_WIDTH_MM, FOOT_MAX_WIDTH_MM);
    const rFoot = Math.sqrt((width * thickness) / Math.PI);
    const layerRole = roleForLayer(L, false);
    preRoleSumSq += slotCount * rFoot * rFoot;
    if (slotGroups === null) {
      /* THE COLLAPSED ARM — SESSION A'S, CHARACTER FOR CHARACTER, and it is
         the shipped path at every default. The group is the whole whorl and
         `roleCount` is `state.petalCount` — the SAME DOUBLE the pre-role
         expression multiplied by, deliberately read unrounded exactly as that
         expression read it. */
      const roleCount = slotCount;
      sumSq += roleCount * rFoot * rFoot;
      raw.push({ lambda: L, scale, authoredWidth, width, rFoot, roleCount, role: layerRole, slotRole: null, slots: null, clamped: [] });
    } else {
      /* THE SPLIT ARM — one descriptor per (layer x slot role), in
         SLOT_ROLE_ORDER. The sum stays GROUPED BY ROLE and is never regrouped
         per foot; see the collapse note above for why the split itself has to
         be conditional. */
      for (const g of slotGroups) {
        const roleCount = g.slots.length;
        sumSq += roleCount * rFoot * rFoot;
        raw.push({ lambda: L, scale, authoredWidth, width, rFoot, roleCount, role: layerRole, slotRole: g.role, slots: g.slots, clamped: [] });
      }
    }
  }
  }

  /* THE GUARD, AND IT IS LOAD-BEARING RATHER THAN INSURANCE — the one place
     the layered law is not bit-exact, scoped to exactly that place.

     `Math.sqrt(count * rFoot^2)` and `rFoot * Math.sqrt(count)` are the same
     number in algebra and NOT the same double: this is the flower's
     `a*b + a*c` vs `a*(b+c)` trap firing on a real row, measured before the
     guard was written. At the shipping defaults the two differ by 8.88e-16
     (0.90 ULP, 4.4223251132330947 against ...39) and at petalCount 40 by
     1.78e-15 (0.81 ULP); at count 3, count 7, ALL THIN and sheet 2.40 they
     agree exactly. So the divergence is real, row-dependent, and invisible to
     any argument that stops at "algebraically identical".

     Everything ELSE in this function is identical without a guard, shown
     rather than hoped: `scale` is exactly 1, `x * 1 === x`, and `radius_L`
     below is `R0 * 1`. Only this line needed guarding, so only this line is
     guarded — a wider guard would be a second copy of the layered law with a
     bug-shaped place to hide.

     `guardResidual` measures the two laws against each other on EVERY
     single-layer build, so the guard is never somewhere a bug sits
     unexercised (formGuardResidual's doctrine). UNLIKE formGuardResidual it
     CANNOT be exactly 0 and both gates assert a BOUND, not a zero — stated
     here so nobody later "fixes" the assertion to an equality. Above one
     layer there is no guard law to compare against and it is null: a claim
     nothing can make is reported as absent, never as a passing 0. */
  const generalDerived = Math.sqrt(sumSq);
  /* THE GUARD IS A RINGED-ARM CLAIM. The pre-layer expression it
     cross-validates against — one ring of `petalCount` identical feet —
     describes no continuous design at all: at layerCount 1 the continuous arm
     already has `petalCount` DIFFERENT feet. A residual computed there would
     be a claim nothing can make, which this file reports as ABSENT (null) and
     never as a passing 0. The continuous arm carries its own cross-validation
     instead: `quantizerResiduals` below. */
  const guarded = !continuousMode && layerCount === 1;
  const derivedRadius = guarded
    ? raw[0].rFoot * Math.sqrt(slotCount)   // area rule — the pre-layer expression, verbatim
    : generalDerived;
  const guardResidual = guarded ? Math.abs(generalDerived - derivedRadius) : null;

  const R0 = derivedRadius * state.spread;         // the ONLY use of spread
  const rings = raw.map((p, L) => {
    const radius = R0 * p.scale;
    return {
      index: L,
      radius, derivedRadius, width: p.width, thickness,
      /* How far inside the ring each foot continues, so foot–hub overlap is a
         solid annulus, not a hairline touch. A FRACTION of this layer's own
         radius with an absolute floor, so the guarantee is scale-free per
         layer exactly as it was for the single ring. */
      overhang: Math.max(1.5, radius * 0.4),
      /* THE LAYER'S PLACEMENT, owned here so no consumer computes it. All
         three are EXACTLY the pre-layer constants at L = 0: Math.pow(x, 0) is
         1, `0 * layerTilt` is +0 for layerTilt >= 0 (its range starts at 0),
         and `(0 * layerPhase * TAU) / count` is +0. buildBloomInto passed
         literal 1 / 0 / 0 before this existed, so the shipped default takes
         the same doubles through the same arithmetic. Both gates assert these
         three are EXACTLY 0/1 at layerCount 1, separately from the residual
         bound above, so a real leak cannot hide inside a tolerance. */
      scale: p.scale,
      /* PHASE IS A WHORL-TO-WHORL OFFSET AND CONTINUOUS HAS ONE WHORL, so it
         is exactly 0 at every slot there — not a small number, and not a
         reinterpretation of `layerPhase` into something the label would then
         be lying about. `layerPhase` is hidden in that mode by its own
         registry predicate, which is where every reason a control can be
         hidden lives. */
      /* KEYED OFF THE LAYER, NOT THE DESCRIPTOR INDEX. Several descriptors
         now share one whorl, so `L` (this map's index) stopped being the
         layer the moment a whorl could split. `p.lambda` IS the integer layer
         index under the ringed arm — the same double `L` was — so the
         collapsed path takes the identical arithmetic, and the continuous arm
         takes the 0 branch as before. */
      /* AND THE FAN IS 0 TOO, for a reason of its own rather than by analogy.
         `layerPhase` offsets whorl L by L slots' worth of azimuth; on a fan
         that is a rigid rotation of the inner fan OFF the mirror line, which
         destroys the one plane the whole arrangement is about. So it is
         HIDDEN there by its own registry predicate and inert here — and that
         is exactly what lets slotRolesEligible() admit a fan at any depth. */
      phase: (continuousMode || fanMode) ? 0 : (p.lambda * state.layerPhase * TAU) / state.petalCount,
      /* THE AFFINE ANGLE, at this ring's own lambda. In the ringed arm
         `p.lambda` IS the integer L, so this is `L * state.layerTilt`
         character for character on the same doubles. */
      tiltExtra: p.lambda * state.layerTilt,
      /* TELEMETRY ONLY, like derivedRadius: what the clamps did, so the
         read-out and the gates can say WHERE a floor started binding instead
         of a slider silently going quiet. Nothing geometric may read these. */
      /* THE ROLE AND ITS GROUP SIZE, owned here so no consumer derives them.
         buildPetalInto READS `role` and `overrides`; it computes neither. */
      /* THE LAYER THIS DESCRIPTOR BELONGS TO. `index` is the descriptor's
         position in `rings`, which stopped being the layer index the moment a
         whorl could split; `lambda` is the layer (an integer under the ringed
         arm, the real depth under the continuous one) and is what `phase` and
         `tiltExtra` are keyed off. Two names because they are two numbers. */
      lambda: p.lambda,
      role: p.role,
      roleCount: p.roleCount,
      /* THE SLOT ROLE AND THE SLOTS THAT CARRY IT. `slotRole` is null on a
         COLLAPSED descriptor — which is session A's shape and every shipped
         default — and never LATERAL there, because "this whorl was not split"
         and "this group is the laterals" are different claims and a reader
         must not have to guess which one a value means. `slots` is the
         descriptor's own slot indices, owned here so buildBloomInto can look
         a descriptor up by slot index and compute nothing. */
      slotRole: p.slotRole,
      slots: p.slots,
      /* THE RESOLVED OVERRIDE RECORD, or null. Null on every descriptor whose
         roles carry no non-identity control — every OUTER-and-unsplit ring,
         every LATERAL, and any INNER ring whose deltas are all 0 — which is
         what makes petalStateFor() an identity guard rather than a merge. */
      overrides: resolveRoleOverrides(state, p.slotRole === null ? [p.role] : [p.role, p.slotRole], p.clamped),
      /* TELEMETRY ONLY — which composed values the envelope clamp bit, for
         the read-out and for the gates. Nothing geometric reads it. */
      overrideClamped: p.clamped,
      authoredWidth: p.authoredWidth,
      widthClamped: p.authoredWidth < FOOT_MIN_WIDTH_MM,
      /* THE CEILING TWIN (Eva, Sep 1). The floor has been reported since the
         thickness layer and the ceiling never was, so a quarter of the
         petalWidth slider moved the blade and not the ring in silence. See
         FOOT_MAX_WIDTH_MM's note for the measurement. Telemetry only. */
      widthClampedHigh: p.authoredWidth > FOOT_MAX_WIDTH_MM,
      /* A statement about the EXPORT, true in either mode — the read-out has
         to warn about a floor it is not currently applying. */
      thicknessFloorBinds: state.sheetThickness < MIN_FEATURE_MM,
    };
  });

  /* THE HUB the junction is built on. Its radius is R0, which is
     layers[0].radius exactly — not a `Math.max` over the layers, because a max
     would be a SECOND derivation that merely happens to agree, and the
     one-owner rule is about which is which. Containment is asserted (J2/J3)
     rather than achieved by picking the largest. */
  const hub = { radius: R0, thickness, derivedRadius };

  /* THE QUANTIZER IDENTITY, CROSS-VALIDATED IN THE OWNER — the continuous
     arm's answer to `guardResidual`, and it exists for the same reason: a
     guard must not be somewhere a bug can sit unexercised.

     THE CLAIM THIS LAYER RESTS ON is that ringed and continuous are ONE LAW
     under two quantizers of the same layer index:

         RINGED      lambda_k = floor(k / petalCount)
         CONTINUOUS  lambda_k = k / petalCount

     which means the continuous sequence must pass exactly through every
     ringed layer: at k = m * petalCount the two agree. `(m * n) / n` is
     EXACTLY m in IEEE-754 for every reachable m and n (the true quotient is
     representable, and division is correctly rounded), so `Math.pow(s, (m*n)/n)`
     is the same call on the same double as `Math.pow(s, m)`. This is therefore
     an EQUALITY, not a bound — unlike `guardResidual`, and stated here so
     nobody later loosens it to a tolerance.

     IT IS COMPUTED HERE RATHER THAN IN THE GATES on the guardResidual
     precedent: a gate restating `Math.pow(layerSize, m)` would be a second
     copy of the ringed law living inside the instrument built to police it.
     Null under the ringed arm — there is no second law there to agree with. */
  let quantizerResiduals = null;
  if (continuousMode) {
    quantizerResiduals = [];
    /* ONE PAST THE END, and that bound is a POSITIVE-CONTROL FINDING rather
       than a flourish. Checking only m < layerCount leaves layerCount 1 with
       a single entry at m = 0, where every law agrees trivially — the
       sequence stops at k = n-1, before its first multiple. A wrong-exponent
       mutation was run against that and fired on the three-turn rows and NOT
       on the one-turn row, so the assertion had a reachable blind spot at the
       shipping depth. Evaluating the law at m = layerCount closes it: the law
       is defined for every k, and "one more turn would land exactly on the
       next ringed layer" is the same identity stated where the sequence can
       still be asked about it.

       INSIDE THE SEQUENCE IT READS THE RING THAT WAS ACTUALLY BUILT, not the
       law again — otherwise a ring map that ignored `lambdaAt` would agree
       with itself. Past the end there is no ring to read, so the law is
       evaluated through the same closure the loop used. */
    for (let m = 0; m <= layerCount; m++) {
      const inSequence = m < layerCount;
      const lam = inSequence ? null : lambdaAt(m * n);
      const scale = inSequence ? rings[m * n].scale : Math.pow(state.layerSize, lam);
      const tilt = inSequence ? rings[m * n].tiltExtra : lam * state.layerTilt;
      quantizerResiduals.push({
        m,
        inSequence,
        dScale: scale - Math.pow(state.layerSize, m),
        dTilt: tilt - m * state.layerTilt,
      });
    }
  }

  /* ===================================================================
     THE ROLE-GROUPING RESIDUAL — an EQUALITY, deliberately not a bound, and
     the reason it can be one is the measurement in the ZYGOMORPHY block:
     grouping by ROLE preserves the pre-role loop shape, so at one role per
     ring the two sums are the same double. Grouping by SLOT would not have
     been, at 6 ULP on a real 40-petal row, and stating that here is what
     stops a later session "simplifying" the grouping away.

     ASSERTED ON EVERY BUILD THAT CAN MAKE THE CLAIM, so the guard is never
     somewhere a bug sits unexercised. The claim is only available while every
     ring's role group is the pre-role expression's own group — the whole
     whorl under the ringed arm, the single petal under the continuous one.
     Session B splits a whorl into LABELLUM / HOOD / LATERAL, at which point
     the two groupings legitimately differ and there is no law to compare
     against: it reports null there, never a passing 0. That is the same
     shape as guardResidual above and for the same reason — a claim nothing
     can make must read as absent. */
  const preRoleGroup = continuousMode ? 1 : slotCount;
  /* SESSION B REACHES THIS. A split whorl carries LABELLUM / HOOD / LATERAL
     groups whose sizes are not the pre-role group, so there is no pre-role
     grouping to compare against and the residual is ABSENT rather than a
     passing 0 — exactly as session A wrote this line to behave. */
  const oneRolePerRing = rings.every((r) => r.roleCount === preRoleGroup);
  const zygoGuardResidual = oneRolePerRing
    ? Math.abs(Math.sqrt(sumSq) - Math.sqrt(preRoleSumSq))
    : null;

  /* THE SLOT -> DESCRIPTOR MAP, owned here because footRing() owns the ring
     list and a consumer that decided for itself which descriptor a slot
     belongs to would be a second copy of the role derivation.

     `slotRings[L][i]` is the descriptor for slot i of whorl L. WHEN THE
     WHORL IS UNSPLIT EVERY ENTRY IS THE SAME OBJECT — literally `rings[L]`,
     the object session A passed — so buildPetalInto receives an identical
     `ring` reference on the shipped path and the byte argument needs no
     further clause. Null under CONTINUOUS, where a ring IS a petal and
     buildBloomInto indexes the ring list directly.

     `slotsPerRing` RETIRED WITH THIS (Sep 2). It was a scalar answering "how
     many petals does a ring carry", which stops being one number the moment a
     whorl splits — 1 labellum, 1 hood, n-2 laterals. Keeping it would have
     been a name for a thing that is no longer the thing, on a value J1 does
     arithmetic with. Its one real consumer was J1's accounting check, which
     now sums each descriptor's own `roleCount`; nothing persists it, so the
     retirement is free and no RETIRED_IDS entry is owed (that list is for
     CONTROL ids, which reach saved designs). */
  const slotRings = continuousMode ? null : (() => {
    const byLayer = [];
    for (let L = 0; L < layerCount; L++) {
      const forLayer = rings.filter((r) => r.lambda === L);
      const row = new Array(n);
      for (const d of forLayer) {
        if (d.slots === null) { row.fill(d); break; }
        for (const i of d.slots) row[i] = d;
      }
      byLayer.push(row);
    }
    return byLayer;
  })();

  return {
    rings, hub, derivedRadius, guardResidual, layerCount,
    continuousMode, sequenceLength, quantizerResiduals, zygoGuardResidual,
    slotRings,
    /* WHETHER SLOT ROLES APPLY IN THIS STATE, and whether a whorl actually
       split. Two different claims: the first is the gating (placement and
       depth), the second additionally needs a control off its identity. Both
       are reported so Z5 can assert the collapse in both directions and the
       gates can cross-check the first against the registry's own predicate. */
    slotRolesEligible: !continuousMode && slotRolesEligible(state),
    slotRolesSplit: slotGroups !== null,
    /* THE FAN'S DERIVED LAW AND ITS CONSEQUENCES — null under every other
       placement, because a claim nothing can make must read as absent rather
       than as a passing zero (guardResidual's doctrine, and quantizerResiduals'
       beside it). J7 reads `step`, `spanDeg` and `gapDeg`; the read-out reads
       `capped`. */
    fan,
    /* THE MIRROR THIS ARRANGEMENT HAS, and the SLOT COUNT the builder places.
       Both are footRing()'s answers rather than anything a consumer derives
       from `placement` — buildBloomInto passes `slotCount` to the whorl
       primitive and the read-out names the plane from `mirror`. */
    mirror,
    slotCount,
    /* GROUP SIZES PER SLOT ROLE, whenever slot roles are eligible — the
       answer the hood's visibility predicate and Z1's amended clause are
       both about. A Map does not survive structuredClone through the metrics
       hook, so it is flattened to a plain object here, by the owner. */
    slotRoleCensus: slotRoleCensus === null ? null
      : Object.fromEntries(SLOT_ROLE_ORDER.map((r) => [r, (slotRoleCensus.get(r) || []).length])),
  };
}

/* ===================================================================
   buildWhorlInto — the arrangement primitive, built as a whorl from day one
   (charter: "Arrangement facts worth having on day one"). Full signature
   (count, radius, height, sizeRamp, angleRamp, phase, blade) even though
   phase 1 feeds several of them constants; sepals / epicalyx / involucre
   later are then more whorls, not a refactor.

   PLACEMENT (Sep 1) is the one thing this primitive computes: where slot i
   sits around the axis. RADIAL is even spacing; SPIRAL and CONTINUOUS both
   step by the golden angle. It is a BRANCH, not a reformulation — the RADIAL
   arm is the pre-spiral expression character for character — so byte-identity
   on that side is structural and needs no residual to cross-validate it
   (there is no algebraic identity between the two arms to check).

   CONTINUOUS SHARES SPIRAL'S AZIMUTH LAW EXACTLY, and that is the point
   rather than an economy: the difference between the two is NOT how slot i is
   placed around the axis, it is HOW MANY RINGS THERE ARE. A layered spiral is
   `layerCount` calls of `petalCount` slots, each call on its own ring; a
   continuous spiral is ONE call of `petalCount * layerCount` slots, each slot
   on a ring of its own. Both walk `phase + i * GOLDEN_ANGLE`. So the third
   value is written here as a third NAME on the same expression — never a
   second copy of it — and every quantity that actually differs comes from
   footRing(), which owns the ring list. See footRing()'s CONTINUOUS section
   for the law and for the quantizer identity that cross-validates it.

   SPIRAL MOVES AZIMUTH ONLY. Every foot stays on its layer's ring, so the
   junction argument is untouched by that value: the feet the hub has to reach
   are the same feet, at the same radius, in the same plane. CONTINUOUS DOES
   MOVE RADIUS — every slot gets its own — and the junction argument survives
   for a different, stronger reason: `layerSize < 1` makes radius_k <= R0 for
   every k, so every foot's whole footprint lies inside the hub disc. That is
   footRing()'s containment note, and J2/J3 assert it per slot rather than per
   layer. A Vogel radius ramp (r proportional to sqrt(k), CONSTANT petal size,
   the equal-area seed-head law) is still a DIFFERENT feature and is still not
   built: it is the flat-disc packing law, and this model's petals shrink with
   `layerSize`, so its per-turn ratio would have nothing to attach to and
   `layerSize` would be orphaned. Recorded here, no stub.

   RADIUS MAY BE A RAMP, like sizeRamp and angleRamp beside it. A layered
   whorl passes the scalar its ring carries (the same double, so the slot
   payload is unchanged bit for bit); a continuous whorl passes a function of
   the slot index. Nothing in the petal builder reads `slot.radius` today — it
   takes the radius from its `ring` argument — but a slot that CARRIED the hub
   radius while sitting somewhere else would be a stored lie waiting for the
   first consumer to believe it, which is this project family's most repeated
   defect. So the payload tells the truth in both modes.

   LOW COUNTS ARE ALLOWED AND FLAGGED, NOT GATED. See GOLDEN_ANGLE's note:
   the "n >= 8" rule is an aesthetic legibility claim and the geometry
   contains no threshold to gate on, so the read-out labels the state and
   nothing hides. What the flag compares the threshold against is the length
   of the GOLDEN-ANGLE SEQUENCE — `petalCount` under SPIRAL, where each whorl
   runs its own sequence, and `petalCount * layerCount` under CONTINUOUS,
   where there is one. footRing() owns that number (`sequenceLength`) so the
   read-out and the panel gate cannot keep two answers. */
/* THE FAN'S AZIMUTH LAW, and the SIGN SYMMETRY IS EXACT BY CONSTRUCTION —
   which is what lets Z4b compare a reflected azimuth against its partner's as
   an EQUALITY with no epsilon. Each mirror pair is built as `+m * step` and
   `-m * step` from ONE magnitude `m`, and IEEE-754 negation is exact, so
   `-az_i === az_j` holds to the bit. Writing the minus side as
   `(TAU - something)` or as its own accumulation would have made that a
   tolerance question instead, on the arrangement whose entire point is a
   symmetry.

   THE SLOT ORDER is what makes the roles compose (session 10): with a
   mirror-line petal, slot 0 is ON the plane and slots 1..P / n-1..n-P are the
   + and - sides, so the involution `i <-> n-i` pairs them — which is session
   B's shipped derivation, unchanged. Without one, slot 0 is the innermost +
   petal and slot n-1 the innermost -, so `i <-> n-1-i` pairs them, which is
   the fixed-point-free involution session B derived while correcting the
   SPIRAL premise. The arrangement was built to fit the pairings, not the
   other way round.

   `perSide` and `centre` are NOT re-derived here — footRing() owns them and
   hands them over, exactly as it hands over `radius` and `phase`. */
function fanAzimuth(i, { perSide, centre, step }) {
  if (centre) {
    if (i === 0) return 0;
    return i <= perSide ? i * step : -((2 * perSide + 1 - i) * step);
  }
  return i < perSide ? (i + 0.5) * step : -((2 * perSide - 0.5 - i) * step);
}

export function buildWhorlInto({ count, radius, height, sizeRamp, angleRamp, phase, blade, placement = 'RADIAL', fan = null }) {
  if (placement !== 'RADIAL' && placement !== 'SPIRAL' && placement !== 'CONTINUOUS' && placement !== 'FAN') {
    throw new Error(`unknown placement "${placement}" — the registry and the builder have diverged`);
  }
  /* THE FAN'S LAW IS REQUIRED EXACTLY WHERE IT APPLIES, checked in BOTH
     directions. A FAN without it would silently fall through to the golden
     angle; a non-FAN carrying one is a caller that thinks it is placing a fan
     and is not. Neither is a state any assertion downstream would name. */
  if ((placement === 'FAN') !== (fan !== null)) {
    throw new Error(`placement "${placement}" ${fan ? 'was handed' : 'was handed no'} fan law — the two must arrive together`);
  }
  const radiusAt = typeof radius === 'function' ? radius : () => radius;
  for (let i = 0; i < count; i++) {
    blade({
      index: i,
      azimuth: placement === 'FAN'
        ? phase + fanAzimuth(i, fan)
        : (placement === 'RADIAL' ? phase + (i * TAU) / count : phase + i * GOLDEN_ANGLE),
      radius: radiusAt(i, count),
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

/* THE PRINT FLOOR on the tip's half-width — an ASSUMPTION with a number
   attached, like every floor in this project family, and nothing here has ever
   been printed. It applies IN EXPORT ONLY from the pointed-tip ruling onward.

   WHAT IT USED TO DO, AND WHY EVA RULED AGAINST IT (Aug 31/Sep 1). It was a
   floor on EVERY row in BOTH modes, so the last rows of the blade did not
   taper — they ran PARALLEL at 2 x 0.8 mm and were then closed with a flat
   face square to the blade. Measured at the shipping defaults: four of the
   28 blade rows (u = 0.893 upward, where the profile falls to 0.795, 0.398,
   0.119, 0.000) all clamped to 0.800. That stub, not the profile, was the
   squared-off end. The exponent family already wants to reach zero; the floor
   truncated it and then capped the truncation. */
export const TIP_HALF_MM = 0.8;

/* THE LIVE MESH FLOOR on the terminal face — NOT a print number and
   deliberately an order of magnitude below one. Live is authoring-true, so it
   should reach a point; a true apex cannot ship, for two measured reasons
   stated where the cap is built (see CONVERGING TIP CAP below). 0.15 gives a
   0.30 mm terminal face, five times under the print floor and well under a
   pixel at any framing the contact sheet uses, so it reads as a point without
   being one. It exists to keep the mesh non-degenerate, nothing else. */
export const TIP_CAP_HALF_MM = 0.15;

/* WHERE THE CONVERGING CAP BEGINS. Two rules, and the LATER of the two starts
   is taken, because each fails alone:
     - a fixed final fraction of the blade covers the stub at the shipping
       defaults (the floor flattened the last 14% there), but is far too short
       when the profile is very pointy — at petalTipTaper 4 the floor flattens
       TEN of 28 rows and the profile is already at 0.125 mm by u = 0.80, so a
       cap starting there would have to WIDEN toward the tip to reach the
       export floor;
     - a crossing rule alone (start where the profile falls to CAP_ENTRY)
       starts absurdly early on a broad tip.
   Taking min(1 - FRACTION, crossing) means the cap entry half-width is ALWAYS
   at least CAP_ENTRY_FACTOR x TIP_HALF_MM, so in export the cap converges by
   at least 2:1 rather than degenerating into the parallel stub it replaces.
   The crossing is found by deterministic bisection on a monotone branch, so
   it is bit-reproducible. */
export const TIP_CAP_FRACTION = 0.20;
export const CAP_ENTRY_FACTOR = 2;
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
export function widthProfile(state, ring, halfW, cap, acc) {
  const a = state.petalBaseTaper;
  const b = state.petalTipTaper;
  const uPk = a / (a + b);                                     // the derived widest point
  const gPk = Math.pow(uPk, a) * Math.pow(1 - uPk, b);         // normalise the peak to 1
  const core = (u) => (Math.pow(u, a) * Math.pow(1 - u, b)) / gPk;
  const footHalf = ring.width / 2;
  const stalk = (cap && cap.stalk) || null;
  /* The TERMINAL half-width: the print floor in export, the mesh floor live.
     This is the ONE mode-dependent quantity in the silhouette layer, and it
     changes the cap's SHAPE, never its topology — see the cap's own note. */
  const tipFloor = acc && acc.exportMode ? TIP_HALF_MM : TIP_CAP_HALF_MM;

  const terms = [
    { name: 'CORE', from: stalk ? stalk.until : 0, to: 1, at: (u) => halfW * core(u) },
    { name: 'TIP_PLATEAU', from: 0, to: 1,
      at: (u) => state.petalTipBreadth * halfW * clamp((u - uPk) / (1 - uPk), 0, 1) },
  ];
  if (stalk) terms.push({ name: 'STALK', from: 0, to: stalk.until, at: () => stalk.halfWidth });

  /* The claw's shoulder: a stalk narrower than the foot is the whole point,
     so the foot-continuity floor stands down for it — and ONLY for it. */
  const rootBlend = stalk ? () => 0 : (u) => footHalf * Math.max(0, 1 - u / ROOT_BLEND_END);

  const shapeAt = (u) => {
    let shape = 0;
    for (const t of terms) {
      if (u < t.from || u > t.to) continue;
      const v = t.at(u);
      if (v > shape) shape = v;
    }
    return shape;
  };

  /* ===================================================================
     THE CONVERGING TIP CAP — Eva's ruling, Sep 1, from the tip sheet.

     THE POINTED FAMILY ONLY. `petalTipBreadth === 0` is the exponent family,
     which is pinched to zero at the tip by construction; above zero the flat
     end is an AUTHORED TRUNCATE (rose, poppy) and stays exactly as it was,
     byte for byte. That split is not a convenience — it is what makes this
     change's partition sharp: every row at breadth 0 moves, every row above
     it is bit-identical, asserted both ways.

     WHAT REPLACES THE STUB. Below the cap the profile is floored at the
     TERMINAL floor rather than the print floor, so it is free to taper; from
     `uCap` the half-width lerps linearly to that terminal floor. The result
     converges into the end instead of running parallel to it. In live the
     terminal face is 0.30 mm wide; in export it is 1.60 mm — floored, and
     reached by a taper of at least 2:1 rather than by truncation.

     THE APEX IS AN EXPLICITLY TRUNCATED MINI-FACE, NOT A TRUE APEX VERTEX,
     and the choice is forced rather than preferred:

       1. TOPOLOGY MUST NOT DEPEND ON MODE. The export gate now asserts that
          live and export triangle counts are identical on every row — the
          property the whole fixed-topology argument rests on. A true apex in
          live (columns collapsing to one edge) with a floored face in export
          is two different meshes, and it would fail that assertion by
          construction.
       2. IT IS THE DOME'S BUG. `domeInto` closed its cap on a ring of 48
          vertices 6.1e-17 apart, because `cos(PI/2)` is not 0 — 48 degenerate
          triangles and 49 non-manifold edges on every dome, passing the gated
          criterion while being wrong. Collapsing NV columns onto one apex
          edge is that construction exactly, and the edge census welds at 1e-4.

     So the cap keeps a real, measurable terminal face in both modes, and the
     gates assert there are no degenerate triangles anywhere in the export.

     THE COST IS ZERO TRIANGLES, and that was not the prediction. The cap
     re-uses the grid it already had — same NU, same NV, same panel count,
     same end face — and changes only where the vertices sit. A cap built as
     new geometry beyond the last row would have moved the count for the first
     time in three sessions; this one does not, and the zero-cost claim in the
     charter stands unamended.
     =================================================================== */
  /* The capability rows are included deliberately: a claw's interior minimum
     sits near u = 0.3 and a cleft's two lobes each end at the tip row, so both
     exercise the cap rather than sidestepping it — and the cleft is the
     stronger test, since it caps two panels that must stay on one arc. */
  const pointed = state.petalTipBreadth === 0;
  let uCap = 1, hEntry = 0;
  if (pointed) {
    /* The crossing of CAP_ENTRY_FACTOR x the print floor, by bisection on
       (uPk, 1) where the pointed profile is monotone decreasing from halfW to
       0. Deterministic, so the bytes are reproducible. */
    const target = CAP_ENTRY_FACTOR * TIP_HALF_MM;
    let lo = uPk, hi = 1;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (shapeAt(mid) > target) lo = mid; else hi = mid;
    }
    uCap = Math.min(1 - TIP_CAP_FRACTION, lo);
    hEntry = Math.max(shapeAt(uCap), rootBlend(uCap), tipFloor);
  }

  return {
    uPk, terms, footHalf, pointed, uCap, tipFloor,
    /* The cap's entry and terminal half-widths, reported for the gates and
       the contact sheet rather than re-derived by either. */
    capEntryHalf: hEntry, capTerminalHalf: pointed ? tipFloor : TIP_HALF_MM,
    halfWidthAt(u) {
      const shape = shapeAt(u);
      if (!pointed) return Math.max(shape, rootBlend(u), TIP_HALF_MM);
      if (u >= uCap) {
        const s = (u - uCap) / (1 - uCap);
        return hEntry + (tipFloor - hEntry) * s;
      }
      return Math.max(shape, rootBlend(u), tipFloor);
    },
  };
}

/* ===================================================================
   thicknessProfile — THE ONE OWNER of "how thick is the sheet at u".

   Until this layer there was no such question: SHEET_THICKNESS_MM was read
   at both call sites and foot, blade and tip were the same number by
   construction. Eva's ruling (Aug 31, from the live page) was that the
   petal-to-centre connection is too thick AND the tip is too thick — one
   absence, not two, and this function is it.

   THE LAW: t(u) = base * (1 - tipThinning * u), linear in the blade's own
   length coordinate.
     base   is ring.thickness. footRing() OWNS it — this is a consumer, and
            buildPetalInto no longer computes its own floorThickness() copy
            of the same number (it did, harmlessly, until this layer; two
            producers of one quantity is how every registration bug in this
            project family started).
     u      is the row's own length coordinate, and using it rather than the
            row INDEX is what makes foot invariance STRUCTURAL: the three
            foot rows carry u = 0, so 1 - thin*0 is exactly 1 and
            base * 1 === base for every finite base, at every thinning
            value. No guard, no ramp constant, no epsilon — the foot is the
            profile evaluated where the profile is the identity. That is the
            same shape as curl and twist being exactly zero at u = 0.

   Linear, and deliberately not eased. It makes a wedge — thickest where the
   petal meets the centre, thinnest at the tip — which is what a petal is,
   and it needs no third onset constant beside ROOT_BLEND_END and
   FORM_ONSET_END. Those two exist because they answer two different
   questions that happen to share a length scale; a third that answered
   nothing new would be the registration rule misapplied.

   THE FLOOR IS APPLIED PER ROW, in export mode only, through the
   accumulator — so `min sheet` in the read-out keeps meaning what its label
   says, and so a thinned tip can never export below MIN_FEATURE_MM. THIS IS
   WHERE THE EXPORT FLOOR STARTS BINDING FOR THE FIRST TIME IN THIS
   CODEBASE. At the default 1.2 mm sheet it binds from tipThinning 0.17
   upward: at 0.40 the tip is 0.720 mm live and 1.000 mm exported. Live and
   export geometry legitimately differ from here on, which is why every
   printed number carries its mode and why the read-out says (CLAMPED).

   THE HEADLINE, because a slider that saturates must say so: while the
   1.0 mm minimum-feature ASSUMPTION stands, the PRINTED tip can only thin
   from 1.2 to 1.0 mm — 17% — however far the slider goes. A genuine printed
   gradient needs a thicker base sheet (2.40 mm tapering to 1.00 mm is a
   real 2.4:1 wedge) or a printed coupon showing 1.0 mm is conservative.
   Nothing in this project family has ever been printed.
   =================================================================== */

/* THE GUARD's predicate, exported so the app, the builder and the gates all
   ask the same question. Exact zero comparison: the default IS exactly 0 and
   a range input at its default yields it. */
export function thicknessIsUniform(state) {
  return state.tipThinning === 0;
}

export function thicknessProfile(ring, state) {
  const base = ring.thickness;          // footRing() is the owner; this reads it
  const thin = state.tipThinning;
  return {
    base, thin,
    /* Unfloored — the AUTHORED law. The caller applies the accumulator's
       floor, so the floor is applied in exactly one place and the telemetry
       can report both the authored and the emitted number. */
    at(u) { return base * (1 - thin * u); },
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
        /* THE FLOOR THIS BUILD ACTUALLY USED, reported rather than left for a
           consumer to recompute. Until the thickness layer the harness held
           `ROLL_MIN_RADIUS_FACTOR * SHEET_THICKNESS_MM` as a module constant
           and compared every roll radius against 1.2 mm. With thickness a
           control that constant is simply wrong in both directions: a 0.60 mm
           sheet legitimately permits a 0.60 mm radius and would have read as
           a FAIL, and a 2.40 mm sheet clamps at 2.40 so a genuinely inverting
           radius would have read as a PASS. One owner, and it is here. */
        rollMinRadiusMm: ROLL_MIN_RADIUS_FACTOR * t,
        sheetThicknessMm: t,
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
  /* READ from footRing(), never a second floorThickness() of the same
     constant. Identical value, one producer. */
  const t = ring.thickness;
  /* THE EFFECTIVE STATE FOR THIS RING'S ROLE — and with no override record it
     is the caller's own `state` OBJECT, not a copy of it (petalStateFor's
     identity guard). Every read below therefore takes the pre-zygomorphy call
     on the pre-zygomorphy object at the shipping default, which is why the
     byte report is a construction here rather than a hope.

     WHY THE WHOLE BUILDER READS `ps` AND NOT ONLY THE OVERRIDDEN KEYS: `ps`
     inherits every key it does not override, so the two are the same value on
     a non-overridable control — and a builder that read `state` for some
     petal quantities and `ps` for others would be two sources for one petal,
     which is the defect this project repeats most. One object, one petal. */
  const ps = petalStateFor(state, ring);
  const length = ps.petalLength * slot.scale;
  const tilt = ((ps.petalTilt + slot.tiltExtra) * Math.PI) / 180;
  const halfW = (ps.petalWidth * slot.scale) / 2;
  const footHalf = ring.width / 2;

  /* Local frame: R radial (out), T tangent, Z up. */
  const cosA = Math.cos(slot.azimuth), sinA = Math.sin(slot.azimuth);
  const R = [cosA, sinA, 0];
  const T = [-sinA, cosA, 0];
  const Z = [0, 0, 1];

  const profile = widthProfile(ps, ring, halfW, cap, acc);
  /* THE GUARD. petalFormIsFlat() is the predicate; when it holds, `form`
     stays null and every row below takes the pre-form expression verbatim.
     That — not an IEEE-754 argument — is what makes the shipped default
     byte-identical. */
  const form = petalFormIsFlat(ps) ? null : petalForm(ps, halfW, t);

  /* THE THICKNESS GUARD, same doctrine as the form guard above. When the
     profile is uniform, `tAt` is the pre-change scalar verbatim, so every
     emitted coordinate is computed from the same doubles by the same
     operations in the same order and the shipped default cannot move a byte.
     The law is exact at the default anyway (`base * (1 - 0*u)` is
     `base * 1` is `base`), so the guard is insurance rather than the
     argument — and like the form guard it is not allowed to be somewhere a
     bug sits unexercised: `thicknessGuardResidual` below evaluates the full
     profile law against this scalar at every emitted row, and both gates
     assert it below 1e-9.

     The roll curvature floor is expressed against `t` — the THICKEST row,
     since thinning only ever removes material — so the floor keeps
     protecting the whole blade rather than only its tip. */
  const uniformThickness = thicknessIsUniform(ps);
  const profileT = thicknessProfile(ring, ps);
  const tAt = uniformThickness ? () => t : (u) => acc.floorThickness(profileT.at(u));

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
  for (const panel of panels) emitPanel(acc, rows, panel, tAt);

  /* THE THICKNESS GUARD'S OWN CHECK. On uniform (shipped-default) builds
     only, and for slot 0 only, the full profile law is evaluated at every
     row the scalar path just emitted and compared against it. This is what
     stops the short-circuit hiding a wrong thick path — the same role
     formGuardResidual plays for the four curves. */
  let thicknessGuardResidual = null;
  if (uniformThickness && slot.index === 0) {
    thicknessGuardResidual = 0;
    for (const row of rows) {
      thicknessGuardResidual = Math.max(thicknessGuardResidual, Math.abs(acc.floorThickness(profileT.at(row.u)) - row.tUsed));
    }
  }
  /* What the sheet ACTUALLY came out at, read from what emitPanel recorded on
     each row — not from re-evaluating the profile, for the reason stated at
     `row.tUsed`. A row no panel covered would be a hole in the mesh and shows
     up here as an undefined rather than as a plausible number. */
  let tMin = Infinity, tMax = -Infinity;
  for (const row of rows) {
    if (typeof row.tUsed !== 'number') throw new Error(`row u=${row.u} was never emitted by any panel — the trim domain does not cover the blade`);
    if (row.tUsed < tMin) tMin = row.tUsed;
    if (row.tUsed > tMax) tMax = row.tUsed;
  }

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
    /* THE TIP CAP's own numbers, from the profile that built it. The gates
       assert the cap converges and the contact sheet prints these; neither
       re-derives a crossing or a terminal width. */
    /* NOT `tip` — that name is already taken, three keys below, by the tip's
       POSITION (which the contact sheet frames on). Two quantities sharing one
       word in an output is a defect this project has a rule about; here it
       would also have silently shadowed the position, since a later key wins
       in an object literal. */
    tipCap: {
      pointed: profile.pointed,
      uCap: profile.uCap,
      entryHalf: profile.capEntryHalf,
      terminalHalf: profile.capTerminalHalf,
      /* What the LAST ROW actually came out at — the emitted number, not the
         intended one, for the same reason row.tUsed exists. */
      lastRowHalf: rows[rows.length - 1].h,
      exportMode: acc.exportMode,
    },
    /* ZYGOMORPHY TELEMETRY — READ FROM THE EFFECTIVE STATE THE BUILDER
       ACTUALLY USED, which is the whole point of reporting it here rather
       than from the resolver. A ring can carry a perfectly correct override
       record that never reaches the blade (petalStateFor short-circuiting
       unconditionally is a one-word mutation), and that failure exports
       watertight, exports as ONE piece, has an identical triangle count and
       passes J1-J6 and the record-side assertions alike. This array is the
       only thing that sees it — Z2's third clause. Every key in
       ROLE_OVERRIDES appears, whether or not it was overridden, so "the
       override did not arrive" and "there was no override" are distinguished
       rather than both rendering as the base value with nothing to compare. */
    role: ring.role,
    slotRole: ring.slotRole,
    slotIndex: slot.index,
    /* WHERE THIS PETAL SITS AROUND THE AXIS, from the slot payload the whorl
       primitive produced. Reported for the same reason `tangent` is: a shot
       tool or an assertion deriving it from the controls would be a second
       owner of the azimuth law, and under FAN that law has two arms. */
    azimuth: slot.azimuth,
    /* KEYED BY UNIQUE BASE, from OVERRIDE_BOUNDS rather than by walking
       ROLE_OVERRIDES — several rows now name one base (petalCup is reached by
       innerCup, labellumCup and hoodCup), and building the object from the
       row list would write the same key three times and quietly depend on
       which write landed last. */
    applied: Object.fromEntries([...OVERRIDE_BOUNDS.keys()].map((b) => [b, ps[b]])),
    overridden: !!ring.overrides,
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
    /* THE FOOT ROWS AS EMITTED, cross-section included. `h` and `t` are what
       the reworked foot assertion compares against footRing()'s OWN answer
       (ring.width / 2 and ring.thickness) — expected-from-state, read from
       the owner, never a fixed number and never a second derivation. Adding
       `t` is what makes a thickness leak onto the foot observable at all:
       until this layer nothing read the foot's cross-section back. */
    footFrames: rows.slice(0, footS.length).map((r) => ({ C: r.C, N: r.N, T: r.T, h: r.h, t: r.tUsed })),
    /* THICKNESS TELEMETRY — the properties neither STL gate can show. Both
       are structurally blind here for the same reason they are blind to the
       form layer: thickness is pure vertex offset on a fixed-topology grid,
       so no edge census can move, and a thinner sheet is still spanned by
       the hub, so no flood fill can split. Scope is printed beside every
       gate result, never only in a header. */
    thickness: {
      authored: ps.sheetThickness,
      thin: ps.tipThinning,
      base: rows[0].tUsed,
      /* The tip BEFORE and AFTER the floor, so "(CLAMPED)" is a measurement
         rather than a prediction from the slider value. */
      tipAuthored: profileT.at(1),
      tipEmitted: rows[rows.length - 1].tUsed,
      minEmitted: tMin,
      maxEmitted: tMax,
      /* Would the EXPORT floor change this design's geometry? A statement
         about the export, answered identically in either mode, because the
         read-out has to warn about a floor it is not currently applying.
         The tip is the thinnest authored row (thinning only removes), so one
         comparison decides it. */
      floorBinds: profileT.at(1) < MIN_FEATURE_MM,
      exportMode: acc.exportMode,
      uniform: uniformThickness,
    },
    thicknessGuardResidual,
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
function emitPanel(acc, rows, panel, tAt) {
  const top = [], bot = [];
  for (let i = panel.rowFrom; i <= panel.rowTo; i++) {
    const row = rows[i];
    /* THE ROW OWNS ITS THICKNESS as well as its cross-section, and it asks
       thicknessProfile through the same closure the builder made. A panel
       computing its own thickness would be a second owner of the quantity
       whose single ownership this whole layer is about. At a uniform
       profile this returns the identical scalar for every row. */
    const t = tAt(row.u);
    /* RECORDED ON THE ROW, so every consumer of "how thick was this row"
       reads the number that was EMITTED rather than re-asking the profile.
       The foot assertion compares this against footRing()'s own answer; if
       it re-asked the profile it would agree with the profile by
       construction and could never catch an emission that disagreed with
       it — which is exactly the leak it exists to catch. */
    row.tUsed = t;
    acc.noteSheet(t);
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
   control: NONE / DOME / DISC / RING. Eva ruled the archetype by eye from a
   contact sheet, Aug 31, after the form phase: **DISC is the default.** NONE
   remains a reachable state and keeps EXPLICIT gate coverage — it stopped
   being the default, which is exactly when a state stops being exercised for
   free (see the matrix header in tools/bloom-harness.mjs).

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

  const fr = footRing(state, acc);
  /* ONE WHORL PER LAYER — layers are instances of the arrangement primitive,
     which is what its full signature has been for since session 1. Every
     per-layer quantity is read off the layer descriptor footRing() produced;
     nothing is computed here, because a consumer computing a per-layer value
     is exactly the arithmetic the one-owner rule forbids.

     `height: 0` for EVERY layer, and it is not a control — see footRing()'s
     header for the measurement that settled it. The whorl primitive keeps its
     `height` argument (it has carried it since session 1 and sepals will use
     it); it is passed the same literal 0 it has always been passed.

     PER-RING MEASUREMENTS, not one of them. Under the ringed arm slot 0 of
     each whorl is that ring's petal (sizeRamp and angleRamp are per-whorl
     constants), so slot 0 is the whorl. Reporting a single `petal` would have
     silently meant "layer 0" the moment layers existed — the same defect the
     pre-layer comment here warned per-slot overrides would cause. `petal` is
     kept pointing at ring 0 so every existing consumer reads what it always
     read.

     `petals` IS ONE ENTRY PER RING IN BOTH MODES, which is what keeps every
     consumer — and J1 above all — mode-blind: under CONTINUOUS a ring carries
     exactly one petal, so that array becomes every petal in the bloom and the
     foot assertion goes from three frames to 3 * petalCount * layerCount of
     them. Strictly more coverage, from the same expression.

     THE CONTINUOUS ARM IS ONE WHORL, NOT petalCount OF THEM, and that is the
     whole structural difference between the two placements. Every per-slot
     quantity is read off the ring descriptor footRing() produced — the ramps
     INDEX the ring list rather than computing anything, because a consumer
     computing a per-slot value is exactly the arithmetic the one-owner rule
     forbids, and it is the same rule that made the layered arm read
     `ring.scale` instead of raising layerSize to a power out here. */
  const petals = [];
  /* ===================================================================
     EVERY SLOT'S AZIMUTH, one array per whorl, indexed by slot — J7's and
     Z4b's only input, and NEW IN THIS SESSION because nothing here had ever
     recorded one.

     THAT ABSENCE WAS THE DISCOVERY THE FAN TURNED ON, and it was found by
     grepping rather than assumed: before this array existed, NOTHING in the
     entire verification stack measured where a petal sits around the axis.
     Both STL gates are azimuth-blind by construction (an edge census over a
     fixed topology; a flood fill over a hub disc that spans every ring), and
     so is every assertion built on top of them — J1 checks foot FRAMES, J2/J3
     check RADII, J4 checks the overlap box's three dimensions, and Z1-Z6
     check role membership and the effective state, none of them a position
     around the circle. So a FAN that silently built a full ring would have
     passed the export gate, the connectedness gate, the triangle count, the
     STL byte LENGTH, J1-J6 and Z1-Z6 alike — ten sessions of instruments, all
     blind to the one property this feature is about.

     REPORTED BY THE BUILDER, from the slot payload the whorl primitive
     produced, never re-derived from `placement` and the controls: an
     instrument that recomputed the azimuth law would agree with a mutated law
     by mutating alongside it, which is the check that cannot fail. */
  const slotAzimuths = [];
  /* HOW MANY PETALS THE WHORL LOOPS ACTUALLY EMITTED — counted at the call
     site rather than derived from a control, because it is what Z1 compares
     the role partition AGAINST. A partition checked against another number
     footRing() invented would agree with a broken derivation by being broken
     alongside it; checked against the builder's own tally it cannot. */
  let petalsBuilt = 0;
  if (fr.continuousMode) {
    /* ONE WHORL, so one azimuth row — the continuous sequence's own. */
    const azOf = new Array(fr.rings.length);
    buildWhorlInto({
      count: fr.rings.length,
      radius: (i) => fr.rings[i].radius,
      height: 0,
      sizeRamp: (i) => fr.rings[i].scale,
      angleRamp: (i) => fr.rings[i].tiltExtra,
      /* The sequence's own starting azimuth. rings[0].phase is exactly 0 in
         this mode (footRing owns that); reading it rather than writing a
         literal 0 keeps the one-owner rule honest if a start phase is ever
         a thing. */
      phase: fr.rings[0].phase,
      placement: state.placement,
      blade: (slot) => { petalsBuilt++; azOf[slot.index] = slot.azimuth; petals.push(buildPetalInto(acc, state, fr.rings[slot.index], slot, capability)); },
    });
    slotAzimuths.push(azOf);
  } else {
  /* ONE WHORL PER LAYER STILL — a split whorl is several DESCRIPTORS, never
     several whorls. Every per-slot quantity is read off the descriptor
     footRing() produced, and WHICH descriptor a slot gets is footRing()'s
     answer too (`slotRings`): a consumer deciding that for itself would be a
     second copy of the role derivation, which is exactly the arithmetic the
     one-owner rule forbids.

     `radius`, `sizeRamp`, `angleRamp` and `phase` stay PER-WHORL constants
     and are read off the layer's first descriptor, because every descriptor
     in a layer shares them — a size override scales the BLADE and never the
     ring (see ROLE_OVERRIDES), which is what keeps that true and what Z6
     asserts rather than assumes. */
  for (let L = 0; L < fr.layerCount; L++) {
    const slotsFor = fr.slotRings[L];
    const ring = slotsFor[0];
    const perDescriptor = new Map();
    const azOf = new Array(slotsFor.length);
    buildWhorlInto({
      /* footRing() OWNS THE SLOT COUNT NOW, because under FAN it is derived
         (2 * perSide + a mirror-line petal) rather than a control. On every
         other placement `fr.slotCount` IS `state.petalCount` — the identical
         double this line held before — so the whorl loop and its RADIAL
         azimuth divisor take the same arithmetic they always did. */
      count: fr.slotCount,
      radius: ring.radius,
      height: 0,
      sizeRamp: () => ring.scale,
      angleRamp: () => ring.tiltExtra,
      phase: ring.phase,
      placement: state.placement,
      fan: fr.fan,
      blade: (slot) => {
        petalsBuilt++;
        azOf[slot.index] = slot.azimuth;
        const d = slotsFor[slot.index];
        const p = buildPetalInto(acc, state, d, slot, capability);
        /* ONE REPORTED PETAL PER DESCRIPTOR — its first slot's. Under the
           collapsed arm that is slot 0 of the whorl, which is what every
           pre-session-B consumer read; under a split whorl it becomes one
           petal per role, so the metrics hook reports the labellum, the hood
           and a lateral rather than silently reporting whichever role slot 0
           happened to land in. */
        if (!perDescriptor.has(d)) perDescriptor.set(d, p);
      },
    });
    slotAzimuths.push(azOf);
    for (const d of fr.rings) if (d.lambda === L) petals.push(perDescriptor.get(d) ?? null);
  }
  }
  buildHubInto(acc, state, fr.hub);          // unconditional — the invariant's plumbing
  const center = buildCenterInto(acc, state, fr.hub);   // optional — the designed mass
  return { ring: fr.rings[0], rings: fr.rings, hub: fr.hub, foot: fr, center, petal: petals[0], petals, petalsBuilt, slotAzimuths };
}
