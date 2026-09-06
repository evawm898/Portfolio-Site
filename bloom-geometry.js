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
   slider position. It is plumbing, not a designed centre (the reproductive
   parts are phase 2, B2; the A/B rig that stood in for them is retired).
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

/* HOW MANY WHORLS THE ARRANGEMENT MAY STACK. SIX (Eva, Sep 3, raised from
   three), and the number is argued from a measurement rather than from a
   formula — the formula was checked and does not hold.

   THE HYPOTHESIS THAT WAS CHECKED: L_max = floor(ln(footFloor / ring0) /
   ln(shrink)), the depth at which the innermost ring falls under one
   FOOT_MIN_WIDTH_MM foot. It predicted 6 for the shipping defaults and 3 for
   Eva's mum run. Measured on a worktree with this cap at 8, every
   configuration x RADIAL/CONTINUOUS x depth 1..8: ring0 is NOT a property of
   the configuration. The area rule sums every foot, so R0 GROWS WITH DEPTH —
   8.85 mm at one layer, 13.23 at three, 15.65 at six on the defaults — and the
   defaults' innermost ring is still 1.69 mm at depth 8. The formula
   underestimates everywhere because its input moves under it.

   AND THE COLLISION IT NAMES IS NOT A BUILDABILITY LIMIT. All 128 rows
   export watertight, as ONE piece, with 0 degenerate and 0 non-manifold
   triangles and every J/Z/form/thickness assertion clean — including a
   0.01 mm blade at depth 8 x shrink 0.35. What deepens with depth is foot
   CROWDING, which tools/bloom-crowding.mjs already flags, and which Eva
   ruled a flag rather than a gate. A derived clamp on ring-versus-floor was
   proposed and REJECTED (Eva, Sep 3): eleven reachable depth-2/3 states
   already sit under the floor, three of them shipped gate rows, so the clamp
   could not be byte-identical at depth <= 3 — and it would gate the state
   the Aug 31 spread ruling made reachable on purpose. The read-out SAYS
   where rings fall under the floor instead (`underFootFloor` /
   `crossesAxis` below, telemetry only).

   WHY SIX AND NOT EIGHT: at the shipping defaults, six is the last depth at
   which the deepest blade is still wider than its own root in BOTH
   placements (3.10 mm RADIAL, 2.32 mm CONTINUOUS against the 1.60 mm foot;
   at eight it is 1.60 and 1.20) and the last at which the default base still
   reads D_max 2 (3 and 5 at seven and eight). Export cost at 6 x 40 petals is
   297,888 triangles, 20% of EXPORT_TRI_BUDGET. Raising this further is a
   range change here and in the registry plus gate rows — `layerCount.max`
   is asserted equal to it by the harness so the two cannot drift — and the
   crowding threshold must be re-derived with it (bloom-crowding.mjs). */
export const MAX_LAYERS = 6;

/* ===================================================================
   HEAD RISE — the whorl primitive's `height` argument, COMPLETED (Eva,
   Sep 4). Since session 1 buildWhorlInto has carried a `height` argument
   and been handed the literal 0, because a foot lifted off a FLAT slab is
   joined to nothing at |h| >= t (measured Sep 1: 1.20 mm at the shipping
   sheet — a range nobody can see, which is why "height is not a control"
   was ruled). The domed hub is that argument finally getting a value: the
   junction slab is bent into a spherical cap through the rim, every ring's
   foot lands ON the cap at its own height with the cap's own normal, and
   the shell follows the feet exactly as the flat slab did — so the height
   is usable across its whole range. `headRise` (0.00–1.00 of the hub
   radius, default 0, role: 'arrangement') is the ONE input; footRing()
   derives the cap (radius, apex, per-ring height / slope / arc) and every
   consumer reads it. The junction stays control-free.

   NOT DERIVED FROM CROWDING OR DEPTH (Eva, Sep 4, on the session's third
   reason): a metric consumed as a geometric input becomes a target — the
   A_k lesson made structural. The crowding instrument stays an OBSERVER of
   the geometry, never an input to it. And measured before the ruling: a
   crowding-keyed rule gives no dome on the incurve target (D_max 5–6, in the
   clean band) and a depth-keyed one moves the session-7 layered control.

   THE APEX FLOOR — cap the OUTPUT, never an input proxy. The shell's inner
   face is the mid-surface offset inward by t/2, so it INVERTS when the cap's
   radius falls below t/2: the same failure as the roll floor's, and it stays
   watertight and connected, so neither STL gate can see it. The floor is one
   full sheet thickness (asserted equal to ROLL_MIN_RADIUS_FACTOR at module
   load, below that constant's definition — the two are one argument). It
   binds on exactly one reachable corner, measured: ALL MIN x spread min x
   sheet 2.40 has a 1.149 mm hub against a 2.40 mm sheet, and the rise
   saturates at 0.25 and reads "(CLAMPED)". Everywhere else Rd >= R0 >= t. */
export const HEAD_RISE_MIN_RADIUS_FACTOR = 1.0;
/* Rings on the shell's two caps — the SAME constant the designed DOME centre
   uses, so a domed junction and a domed ornament facet alike. Fixed: topology
   depends on no slider, and the export gate's live-equals-export triangle
   count still holds. WHAT IS NEW, stated loudly: at rise 0 the hub is the
   192-triangle disc verbatim and at any rise above 0 it is this shell, so the
   hub's triangle count is the FIRST in this codebase that depends on where a
   slider sits (3,456 against 192). It is a BRANCH, not a ramp — there is no
   rise at which the count is anything but one of those two numbers. */
export const HUB_DOME_RINGS = 18;

/* THE GUARD's predicate — exported so the app, the builder, the gates and the
   read-out all ask the same question. Exact: the default IS 0 and a range
   input at its default yields it. When it holds, footRing() stamps no dome,
   every consumer takes its pre-dome expression VERBATIM, and byte-identity at
   the shipping default is a construction rather than a measurement — the
   petalFormIsFlat precedent, chosen over an IEEE-754 argument for the same
   reason: the rotated radial vector is [cos a, sin a, -sin(0)] = [.., -0] at
   zero slope, and -0 + 0 is +0, so a "the law at zero rise IS the flat law"
   argument is true of the NUMBERS and false of the BYTES. domeGuardResidual
   in buildPetalInto measures the law; the byte diff measures the bytes. */
/* THE FULL SPHERE (session 18, Eva Sep 5) — the twin of the registry's
   `PREDICATES.sphereMode`: the registry HIDES `headRise` and the `hubShape`
   control on this condition, this makes them INERT, and the harness asserts
   the two statements agree at module load (the slotRolesEligible precedent).
   CONTINUOUS only: the sphere is the continuous spiral re-keyed on polar
   angle; under any other placement a stored SPHERE is hidden and inert and
   the head is the cap `headRise` builds. */
export function sphereMode(state) { return state.placement === 'CONTINUOUS' && state.hubShape === 'SPHERE'; }
/* Flat iff no sphere and no rise. The second clause is the pre-session-18
   expression verbatim; the first is a branch, so every cap and flat build
   takes exactly the doubles it took before SPHERE existed. */
export function domeIsFlat(state) { return !sphereMode(state) && state.headRise === 0; }

/* ===================================================================
   THE ANDROECIUM (session 21, phase 2 B2 — Eva's Phase A rulings, carried,
   not re-derived). The stamens: a filament rooted THROUGH the hub slab on the
   surface normal, curved by spineLaw() at a curl of 0 as the identity, tipped
   with ONE anther shape — the PILL (A1, FIXED: not an enum, not a control).
   A2 BILOBED is RETIRED from the candidate set permanently; A3 T-BAR is a
   later value addition once six curved filaments have been seen in the real
   generator; A4 CLUB is a tapered pill and is dropped. The descriptor is
   footRing()'s SECOND KIND (`fr.androecium`), sharing the dome object and the
   surface law with the petal rings; the builders read it and compute nothing.

   THE FILAMENT IS ONE SHEET THICK: its diameter is `sheetThickness`, floored
   at export exactly as the sheet is — one owner of the part's material
   dimension, and nothing in this family has been printed. The pill is a fixed
   PROPORTION of it (ANTHER_DIAMETER_FACTOR across, ANTHER_LENGTH_FACTOR of
   its own diameter long) — two constants for Eva's eye on the sheet, never
   controls. Ships ABSENT: `stamenCount` defaults to 0, so 0 moved is by
   construction.

   HIDDEN AND INERT UNDER SPHERE (Eva, Sep 5: a full-sphere bloom is a flower
   head and its reproductive parts belong to its florets). This function is the
   geometry's statement; `PREDICATES.androeciumEligible` in the registry is the
   twin that HIDES; the harness asserts the two agree at module load, the gates
   per row, and the GATED matrix rows prove the androecium at maximum under
   SPHERE byte-identical to the bare sphere. */
export const MAX_STAMENS = 120;
export const ANTHER_DIAMETER_FACTOR = 1.6;
export const ANTHER_LENGTH_FACTOR = 2.5;
/* Mesh resolution — FIXED, so topology depends on no slider and the export
   gate's live-equals-export count holds: STAMEN_SIDES around every tube and
   pill ring, STAMEN_ROWS stations along the free filament, ANTHER_CAP_RINGS per
   hemisphere of the pill. 560 triangles per stamen, 67,200 at 120. */
export const STAMEN_SIDES = 10;
export const STAMEN_ROWS = 16;
export const ANTHER_CAP_RINGS = 5;
/* Triangles per stamen, from the constants — the tube (STAMEN_ROWS + 1
   bands, two fan caps) plus the pill (2 x ANTHER_CAP_RINGS - 1 bands, two
   apex fans). JS4's census compares every stamen's EMITTED count (the
   accumulator's own delta) against this: a dropped pill or a doubled tube
   moves it. */
export const STAMEN_TRIS = ((STAMEN_ROWS + 1) * STAMEN_SIDES * 2 + 2 * STAMEN_SIDES) + ((2 * ANTHER_CAP_RINGS - 1) * STAMEN_SIDES * 2 + 2 * STAMEN_SIDES);
export function androeciumEligible(state) { return !sphereMode(state); }

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
   GROUP for each one. 8 is where the arc limit starts binding across most of
   the spacing slider (at 8 per side the cap takes over from 30 degrees
   upward), which is the point past which the control stops doing anything
   new.

   THE HALF OF THIS NOTE THAT SAID "the bloom has no per-petal controls, so
   that bound does not transfer" EXPIRED ON SEP 3, when it grew some. It is
   recorded rather than deleted, because the conclusion survived on a
   different measurement and a reader who finds only the number should know
   why. The flower's cap is a PANEL bound: its per-petal groups are headings
   inside one scrolling column, so each extra group costs the full height of
   its sliders. The bloom's per-petal groups are SECTIONS in an accordion, so
   an unopened group costs one 29 px summary — measured, with real rows cloned
   into the real page: nine groups of four sliders leave the panel at 874 px
   against today's 788 px worst case, where the same nine as headings inside
   one section reach 2,411 px. So the ceiling still does not transfer, for a
   reason that is now about the panel's shape rather than about an absence.
   MAX_FAN_GROUPS below is derived from this constant, never restated. */
export const MAX_FAN_PER_SIDE = 8;

/* HOW MANY PER-PETAL GROUPS THE FAN CAN REACH — DERIVED from the per-side
   ceiling, never restated. `2*P + 1` slots give `P + 1` orbits and `2*P` give
   `P`, so the maximum is `MAX_FAN_PER_SIDE + 1`. The registry generates
   exactly this many control groups and the harness asserts the two agree (the
   MAX_LAYERS and SHEET_THICKNESS_MM precedent). */
export const MAX_FAN_GROUPS = MAX_FAN_PER_SIDE + 1;

/* THE ROLE IDS, in group order. Ordering fixes the order the area rule sums
   the groups in, so a reordering is a byte event made on purpose rather than
   by an object-key accident — the SLOT_ROLE_ORDER precedent, one axis over. */
export const PETAL_ROLE_ORDER =
  Array.from({ length: MAX_FAN_GROUPS }, (_, k) => `PETAL_${k + 1}`);

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
/* THE WHOLE-WHORL ROLE AT ONE WHORL (Eva's ruling, Sep 3, from the deploy
   preview): "Petal roles is the 'adjust petals as a group' section at EVERY
   depth. At 2+ layers that group is the inner whorl; at depth 1 the group is
   ALL petals." So a single-whorl bloom carries this role on every descriptor
   and a layered one on none — `allPetalsEligible()` is the one statement of
   that boundary here, `PREDICATES.allPetalsEligible` its twin in the
   registry, and Z5 checks the two agree on every row. It composes exactly as
   INNER does: three DELTA rows in ROLE_OVERRIDES riding on the base sliders
   in Petal form / Petal shape, identity 0, skipped at identity, clamped once
   into the base's own range. Nothing owns a number twice — the base slider
   owns the number and this owns a delta on it, which is the same relation
   `innerCurl` has had to `petalSpineCurl` since session A. */
export const ROLE_ALL = 'ALL';

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
  /* ALL PETALS AT ONE WHORL — first in the table on purpose. Row order is the
     composition order (see resolveRoleOverrides), so a petal that is also a
     labellum or a per-petal group reads base, then the whole-whorl delta,
     then its own: "the group, then the petal". Same bases, same laws, same
     bounds as the INNER trio below; only the role differs. */
  { role: ROLE_ALL, base: 'petalSpineCurl',  control: 'allCurl',       law: 'delta', min: -180, max: 360 },
  { role: ROLE_ALL, base: 'petalCup',        control: 'allCup',        law: 'delta', min: -0.8, max: 1.2 },
  { role: ROLE_ALL, base: 'petalTipBreadth', control: 'allTipBreadth', law: 'delta', min: 0,    max: 0.6 },
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

  /* ===================================================================
     PER-PETAL ROLES — session 11, the fan's own per-position axis, GENERATED
     from one declaration rather than typed out nine times.

     WHY GENERATED, when every other row here is a literal. Nine groups times
     five rows is forty-five, and the alternative is forty-five places for a
     typo in a table whose whole job is to be the one answer to "what may a
     role override". The generated form has ONE declaration of the set and ONE
     of the bounds, and the registry generates its matching control rows from
     the same shape in the same order — so the two cannot drift into two
     lists, which is the failure this table exists to prevent. The ids are
     still ordinary ids (`petal3Cup` is a real registry row with a real DOM
     input); only the typing is saved. A grep for one of them finds this
     comment, which names the pattern.

     THE SET IS FOUR CONTROLS (Eva's ruling 2, Sep 3): size x, tilt delta, cup
     delta, curl delta. It is the labellum's five MINUS TIP BREADTH, and the
     swap was argued rather than inherited — at fan scale the tip silhouette is
     the least legible per-petal difference, while spine curl is, in this
     charter's own words about the labellum, "what makes a lip hang and reflex,
     and it is the one control that can". That is the defining fan gesture and
     the one the outer groups need.

     TIP BREADTH IS DELIBERATELY ABSENT PER-PETAL, recorded so it reads as a
     decision rather than an oversight: it is ONE ROW IN THIS TABLE AND ONE IN
     THE REGISTRY the day Eva wants it. It is also the control whose absence
     the supersession ruling costs the fan outright — `labellumTipBreadth` no
     longer applies under FAN, so until that row exists a fan cannot vary tip
     breadth per position at all. Stated at both ends, here and at
     slotRolesEligible.

     SIZE IS TWO ROWS PER GROUP, exactly as `labellumSize` is: one control
     scaling petalLength AND petalWidth, because "size" is both, with the
     per-base clamp ranges stated separately because they genuinely differ.
     Every bound below is an EXISTING base's, so OVERRIDE_BOUNDS gains no
     entry and the load-time agreement check has nothing new to reconcile. */
  ...PETAL_ROLE_ORDER.flatMap((role, k) => {
    const c = (suffix) => `petal${k + 1}${suffix}`;
    return [
      { role, base: 'petalLength',    control: c('Size'), law: 'mul',   min: 20,   max: 60 },
      { role, base: 'petalWidth',     control: c('Size'), law: 'mul',   min: 8,    max: 30 },
      { role, base: 'petalTilt',      control: c('Tilt'), law: 'delta', min: 0,    max: 75 },
      { role, base: 'petalCup',       control: c('Cup'),  law: 'delta', min: -0.8, max: 1.2 },
      { role, base: 'petalSpineCurl', control: c('Curl'), law: 'delta', min: -180, max: 360 },
    ];
  }),
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

/* ===================================================================
   PER-PETAL ROLES — session 11, and THE WHOLE FINDING IS THAT THEY ALREADY
   EXISTED, UNNAMED.

   Eva's founding fan principle is "the petal on the mirror line is petal
   number one, and it has its own sliders". Measured from the EMITTED azimuths
   before any of this was written — never from the derivation, on the Z4b
   doctrine — the orbits of the involution this bloom declares are exactly the
   mirror pairs, ordered by distance from the plane:

     perSide 3  centre ON   n=7   THROUGH_SLOT
        P1{0}@0.0  P2{1,6}@45.0  P3{2,5}@90.0  P4{3,4}@135.0
     perSide 3  centre OFF  n=6   THROUGH_GAP
        P1{0,5}@22.5  P2{1,4}@67.5  P3{2,3}@112.5
     perSide 8  centre ON   n=17  THROUGH_SLOT
        P1{0}@0.0  P2@21.3 ... P8@148.8  P9{8,9}@170.0

   So with the toggle ON, P1 IS the singleton mirror-line petal at 0.0 deg —
   Eva's principle, measured rather than asserted. And in EVERY arm
   LABELLUM = P1, HOOD = P_last, LATERAL = everything between: per-petal roles
   are session B's slot-role partition REFINED, from three coarse groups to
   `perSide + (a mirror-line petal ? 1 : 0)` fine ones. Every group is a mirror
   orbit by construction, which is what keeps Z4a true without a new clause.

   THE ROLE IS THE ORBIT, AND THE INDEX IS THE DISTANCE FROM THE PLANE IN
   STEPS — exact integer arithmetic, no angle and no tie tolerance, exactly as
   `roleForSlot` is. Under THROUGH_SLOT slot i and slot n-i are the pair at
   +-i steps, so the orbit index is `min(i, n-i)`; under THROUGH_GAP slot i and
   slot n-1-i are the pair at +-(i+0.5) steps, so it is `min(i, n-1-i)`. Both
   are `min(i, mirrorPartner(i))`, which is why this reads the partner from its
   ONE owner instead of writing either expression out.

   Z8 ASSERTS THIS AGAINST THE AZIMUTHS rather than against this function, for
   the reason Z4b exists: an instrument that recomputed the orbit derivation
   would agree with a mutated one by mutating alongside it. A numbering that is
   total, disjoint, mirror-symmetric, correctly sized and correctly visible can
   STILL label the petals in the wrong order, and that is precisely what "petal
   one is the mirror-line petal" is a claim about.

   PER-PETAL IS PER PAIR, NEVER PER PETAL-INSTANCE, and the reason is
   structural rather than aesthetic. The flower does the same — buildLayerInto
   builds ONE `over(k)` object and pushes it to both sides, commented "shares
   seed + controls -> exact mirror" — but the binding argument here is that Z4a
   already asserts the role assignment is mirror-symmetric under the declared
   involution, in both gates, on every row. Independent left and right would
   require WEAKENING a shipped assertion, and it would make false the one
   property the arrangement is defined by. It stays available as its own
   feature with its own ruling and its own symmetry story; nothing here
   anticipates it.

   WHERE EVA'S RULING DIVERGES FROM THE FLOWER, recorded as chosen rather than
   copied: the flower gives its centre petal PETAL 1's controls
   (`if (bilCenter) placements.push({az: 0, ..., over: over(1)})`, hinted
   "applies to the centre petal too, if on"), so its group 1 is the inner PAIR
   plus the mirror-line petal riding along. Eva ruled the mirror-line petal
   gets sliders ALL OF ITS OWN, so here it is its own group. Same standing as
   `fanCenterPetal` defaulting ON against the flower's OFF: consistency with
   the older page lost to the idea the newer one is for.

   THE NUMBERING SHIFTS WITH THE TOGGLE, AND THAT IS THE RULED COST (Eva's
   ruling (i), Sep 3). Measured at 3 per side: ON gives four groups with P1 the
   mirror-line petal and P2 the inner pair at 45 deg; OFF gives three, with P1
   the inner pair at 22.5 deg. So turning the toggle off drops the group count
   by one and moves "the inner pair" from slider group 2 to slider group 1.
   The alternative — reserving group 1 for the mirror-line petal and hiding it
   when the toggle is off, so the pairs keep their numbers — was costed and
   ruled against: it shows a numbering that visibly starts at 2.
   NOTHING PERSISTS A DESIGN YET (`RETIRED_IDS` is empty and there is no
   CURRENT_SCHEMA), so no migration is owed. THE DAY SOMETHING DOES, this
   becomes RETIRED_IDS material: a saved `petal2Cup` names a different petal on
   either side of the toggle, which is a stored label-lie on a persisted key —
   exactly what that list exists for. Recorded now rather than discovered then.
   =================================================================== */

/* The role ids and the group ceiling are declared beside MAX_FAN_PER_SIDE,
   which they derive from — `const` hoists WITHOUT initialising, and
   ROLE_OVERRIDES spreads PETAL_ROLE_ORDER at module load, so declaring them
   here would be the "Cannot access X before initialization" trap this project
   has already met once (the charter records it collapsing
   diff-bloom-bytes.mjs's four phase lists into one). Caught locally this time
   rather than in CI. */

/* HOW MANY GROUPS THIS ARRANGEMENT ACTUALLY HAS. One owner: footRing() stamps
   the answer onto each descriptor, the registry's per-group predicates are
   asserted against it by Z1's biconditional, and no consumer counts orbits for
   itself. Derived from the slot count and the plane, which is what makes it
   true in both toggle positions without naming the toggle.

   THE THROUGH-SLOT ARM WAS WRONG FOR EVEN n, AND IT WAS UNREACHABLE — found
   Sep 3, by enumerating the orbits and comparing rather than by reading the
   expression. It said `(n + 1) >> 1`, which counts the orbits of
   `i <-> (n-i) mod n` correctly only when that involution has ONE fixed point.
   It has TWO at even n: slot 0 AND slot n/2. So the count is short by one on
   every even n — measured, 20 disagreements across n = 2..40.

   WHY NOTHING SAW IT. Under FAN the two arms are paired with a parity: a
   mirror-line petal gives `n = 2*perSide + 1`, always ODD, and that is the
   only way the through-slot arm is reached; the toggle-off arm is
   through-GAP, where `n / 2` is right. So every reachable state was correct
   and a general-looking function was wrong everywhere else — which is this
   project's label-lie shape, in arithmetic. `Math.floor(n/2) + 1` is the
   orbit count for the through-slot arm at BOTH parities (fixed points plus
   pairs, `(n + fixedPoints) / 2`), and it agrees with the old expression on
   every state the fan can reach, so nothing shipped moves.

   IT IS ASSERTED AGAINST THE CENSUS NOW rather than trusted: footRing()'s
   `slotRoleCensus`/`petalRoleCensus` are built by an unconditional loop over
   the slots, so comparing this closed form against that count is a comparison
   between two separate computations. See Z8's group-count clause. */
export function petalGroupCount(n, mirror) {
  return mirror === MIRROR_THROUGH_GAP ? n / 2 : Math.floor(n / 2) + 1;
}

/* THE SLOT -> PER-PETAL-ROLE ASSIGNMENT, and it has exactly ONE owner.
   `min(i, partner)` is the orbit's index and the orbit's distance from the
   plane at the same time, in both arms — see the block above. */
export function petalRoleForSlot(i, n, mirror) {
  const k = Math.min(i, mirrorPartner(i, n, mirror));
  return PETAL_ROLE_ORDER[k];
}

/* WHETHER PER-PETAL ROLES APPLY AT ALL — FAN only, and the counterpart of
   `slotRolesEligible` below. Stated HERE as well as in the registry for the
   reason that function's header gives: neither file can read the other's
   answer and both must act on it, so the relation is CHECKED (Z5) rather than
   commented.

   A FAN AT ANY DEPTH, on the same consequence that admitted slot roles there:
   `layerPhase` is hidden under FAN and `phase` is exactly 0 on every
   descriptor by construction, so every whorl shares the one plane with no
   value the visitor could leave wrong. */
export function perPetalEligible(state) {
  return state.placement === 'FAN';
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
  /* ===================================================================
     THE FAN ARM IS GONE — PER-PETAL ROLES SUPERSEDE SLOT ROLES THERE (Eva's
     ruling 4, Sep 3), AGAINST THE SESSION'S OWN RECOMMENDATION AND WITH THE
     COST STATED TO HER AND ACCEPTED.

     Session 10 admitted the fan here, and it was right for what it was ruling
     on: slot roles were then the ONLY per-position axis, so composing them
     onto the fan was the difference between a fan that could have a labellum
     and one that could not. Per-petal roles are a per-position axis too, and
     they REFINE this one exactly — LABELLUM is P1, HOOD is P_last, LATERAL is
     everything between (see petalRoleForSlot's header for the measurement). So
     on a fan the two axes are not orthogonal, and the session proposed they
     COMPOSE, with `labellumCup` and `petal1Cup` both reaching slot 0 through
     the one resolver. Eva ruled the other way: per-petal is the ONLY
     per-position axis on the fan.

     WHAT IT COSTS, RULED AND ACCEPTED RATHER THAN OVERLOOKED. The fan loses
     labellum TIP BREADTH entirely, because the per-petal set ships without a
     tip-breadth row (Eva's ruling 2 — spine curl earned that slot instead) and
     `labellumTipBreadth` no longer applies there. Nothing else is lost: size,
     tilt, cup and curl all exist per group. It is one row in this table and
     one in the registry the day she wants it back.

     NOTHING IS RETIRED, AND THAT IS THE SHAPE OF THE RULING. Slot roles stay
     FULLY LIVE under RADIAL — same controls, same ids, same laws, same gate
     rows. This is a VISIBILITY plus APPLICABILITY change, so `RETIRED_IDS`
     does not apply and no migration is owed. COMPOSITION (the session's option
     B) REMAINS THE RECOVERABLE ALTERNATIVE if Eva ever wants the labellum
     vocabulary back on the fan: it is this one arm plus the matching arm of
     the registry's `slotRolesEligible` predicate, and nothing else was written
     to depend on their absence.

     TWO THINGS THE RULING MAKES UNREACHABLE, KEPT ON PURPOSE AND ASSERTED
     RATHER THAN CLAIMED. `roleForSlot`'s THROUGH_GAP arm assigns LABELLUM and
     HOOD under the fixed-point-free involution — written for the fan with the
     toggle off, which no longer has slot roles — and `PREDICATES.hoodEmpty` is
     never true, since all three of its terms are FAN terms and under RADIAL
     the hood is non-empty at every reachable count. Deleting either would make
     recovery a rewrite instead of a predicate arm, which is exactly what Eva
     ruled against; leaving them SILENT would be the dead-label defect this
     project retires ids over. So they stay, and **Z9 asserts their
     unreachability on every row, in both directions** — which is the
     "never-true predicate with a reason, over a boolean flag" pattern arriving
     on a pair of never-true code paths.
     =================================================================== */
  /* ===================================================================
     THE ONE-WHORL ARM IS GONE TOO — THE SINGLE-LAYER ORCHID IS RETIRED (Eva's
     ruling, Sep 3, from the deploy preview, WITH THE COST STATED TO HER AND
     ACCEPTED). Session B built the labellum and hood on the one-whorl rosette
     and this function admitted it with "nothing above the outermost whorl to
     fall out of step". Eva ruled that at one whorl "Petal roles" is the
     ALL-PETALS group (ROLE_ALL, above) and Petal 1 / Petal N are HIDDEN there
     — and hidden means INERT, so a labellum or hood record must not reach the
     geometry at one whorl. What survives: the orchid on RADIAL at two or more
     whorls with Layer offset 0, and the fan's per-petal groups at every
     depth. What is given up: the one-whorl radial orchid, deliberately.

     RECOVERABLE, NOT RETIRED IN THE `RETIRED_IDS` SENSE: the controls, their
     ids, laws and gate rows are unchanged and fully live above one whorl.
     Recovery is this one `>= 2` back to `=== 1 ||` plus the matching arm of
     the registry's predicate — nothing else was written to depend on it.

     MEASURED, NOT ASSUMED: of the 33 matrix rows with a labellum or hood
     control engaged at one whorl on RADIAL (33 in each of phase10, phase9 and
     phase8; none in any earlier baseline) exactly 30 moved and 3 did not, on
     all three identically, and nothing outside them moved. The three are
     rows whose override clamps back to the base's own value, already
     identical to their no-override counterparts before the change. All 33
     are bit-identical to those counterparts on this tree — see the charter's
     session-11 entry.
     =================================================================== */
  if (state.placement !== 'RADIAL') return false;
  return Math.round(state.layerCount) >= 2 && state.layerPhase === 0;
}

/* WHERE THE ALL-PETALS GROUP APPLIES — one whorl, every placement. At one
   whorl "all petals" is well-defined everywhere: the rosette's one ring, the
   spiral's one sequence, the continuous mode's one turn, the fan's one arc.
   Above one whorl the group is the INNER whorl (session A's trio) and this
   returns false, which makes the three `all*` controls INERT there exactly as
   the registry HIDES them — two statements of one boundary, checked against
   each other by Z5 on every row rather than trusted. `layerCount` is rounded
   as everywhere else it is read. */
export function allPetalsEligible(state) {
  return Math.round(state.layerCount) === 1;
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
    /* A ROW AT ITS LAW'S IDENTITY IS SKIPPED, which is the whole guard.
       THE OLD COMMENT HERE SAID "identity and NaN alike take the shipped
       path" AND THAT WAS FALSE — measured, Sep 3, while checking this
       expression for a third axis: `!(NaN !== 0)` is `!(true)` is `false`, so
       a NaN never skipped; it composed to NaN and the clamp carried it
       through. A label naming a computation nobody performed, in the guard.
       WHAT IS ACTUALLY TRUE, and it is a reachability argument rather than a
       handler: every control here is a `kind: 'slider'`, `coerceValue` reads
       it with `Number(...)` from an `<input type="range">`, and a range
       input's value is always a numeric string — so NaN cannot arrive through
       the registry at all. The expression is left exactly as it was (nothing
       reachable behaves differently either way, and changing a guard on the
       strength of an unreachable case is how a byte moves for nothing); only
       the claim is corrected. */
    if (!(v !== LAW_IDENTITY[o.law])) continue;
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
  /* THE ALL-PETALS ROLE, stamped on every descriptor of a one-whorl bloom and
     on none of a layered one — decided once here, read by the resolver and
     reported to the read-out and the gates, exactly as `role` is. */
  const allRole = allPetalsEligible(state) ? ROLE_ALL : null;
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
  /* ===================================================================
     THE SPHERE'S OWN KEY (session 18) — POLAR ANGLE FROM THE FACE POLE, as
     a closure, for the same reason `lambdaAt` is one: the ring map below
     evaluates it and nothing else restates it. Equal-area: cos(phi) is
     LINEAR in the slot index, one step of 2/K per slot, so every foot owns
     the same patch of the sphere — the Fibonacci sphere, which is the one
     lattice with no seam and no privileged band, expressed through the
     continuous arm's existing descriptor-per-petal shape rather than by
     replacing it (Phase A, Q1: candidates (a) and (c) are the same build).

     THE SEQUENCE RUNS FROM THE RESERVED POLE TO THE FACE POLE: k = 0 (the
     largest petal, scale 1, the same lambda-0 petal the cap arm puts at its
     rim) sits one half-step from the far pole (cos phi = -1 + 1/K), and
     k = K-1 (the smallest, deepest) one half-step from the face pole. So
     `layerSize` is still the shrink per turn, `layerTilt` the tilt gain per
     turn and `layerCount` the number of turns — over the whole sphere. Feet
     run toward the face pole along the meridian (the arc origin, exactly as
     they run toward the cap's apex) and blades leave toward the far pole,
     which is what leaves the far pole clear of feet BY CONSTRUCTION and
     covered by converging blade tips (Eva's Q4 reading, asserted as S3 in
     arc, both directions). The far pole is the STEM's someday; `below` is
     still null. */
  const phiAt = (k) => Math.acos(-1 + (2 * (k + 0.5)) / sequenceLength);
  const sphere = sphereMode(state);
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

     WHY IT IS SEPARATE FROM `positionGroups` (session 10): the split is
     conditional on a control being off its identity (the collapse guard), but
     the QUESTION "does the hood have any members" is about the arrangement
     alone and has an answer at every eligible state — including the shipping
     default, where nothing is overridden and nothing splits. The hood's
     controls hide on that answer and Z1 asserts visibility against it in both
     directions, so it has to exist without a split. Telemetry plus the
     collapse guard's input; nothing geometric reads the counts. */
  /* ONE CENSUS PER POSITION AXIS, from the SAME expression — a `roleAt`
     function and a loop over the slots. Writing it once and passing the
     assignment in is what keeps the two arms from becoming two loops that
     could drift; the arms differ in WHICH assignment they pass, which is the
     only thing that actually differs. */
  const censusOf = (roleAt) => {
    const bySlot = new Map();
    for (let i = 0; i < n; i++) {
      const r = roleAt(i, n, mirror);
      if (!bySlot.has(r)) bySlot.set(r, []);
      bySlot.get(r).push(i);
    }
    return bySlot;
  };
  const slotRoleCensus = (continuousMode || !slotRolesEligible(state)) ? null : censusOf(roleForSlot);
  /* ===================================================================
     THE PER-PETAL CENSUS — session 11's own, and MUTUALLY EXCLUSIVE with the
     slot one by RULING rather than by accident (Eva's ruling 4, Sep 3).

     Per-petal roles are FAN-only and slot roles are RADIAL-only, so at most
     one position axis is ever eligible and there is never a join to compute.
     That is what makes this a BRANCH beside the slot arm rather than a
     generalisation of it, and it is why the RADIAL path below is character for
     character what it was — the standing rule that kept the continuous, the
     fan and the slot arms bit-identical, applied a fourth time. **Z9 asserts
     the exclusivity in both directions**, so it is a measurement rather than a
     property of how this file happens to be written today. */
  const petalRoleCensus = (continuousMode || !perPetalEligible(state)) ? null : censusOf(petalRoleForSlot);

  /* ===================================================================
     THE POSITION PARTITION, AND IT IS CONDITIONAL — THE SIXTH PREVENTION OF
     THE REGROUPING TRAP, measured before a line of it was written.

     Every foot in a whorl shares one `rFoot`, so each grouping is a different
     PARTITION OF n multiplying the same `r^2` — the `a*(b+c)` vs `a*b + a*c`
     trap in its purest form. Measured across 6,912 (centre x perSide x width x
     sheet x delicacy x layerSize x depth x mode) rows BEFORE this was built:

       per-ORBIT vs the whole whorl        moved 1,119 / 6,912   worst 2.00 ULP
       per-ORBIT vs the 3-role slot split  moved   889 / 6,912   worst 2.00 ULP

     (8.882e-16 on R = 3.2422007466, at centre ON x perSide 2 x petalWidth 8.)
     So a split taken whenever the fan is merely ELIGIBLE would move exports on
     every fan row for nothing — invisibly to both STL gates, at an identical
     triangle count and an identical STL byte length. It is conditional on a
     control being off its identity, exactly as session B's is, and **Z7
     asserts the partition is the COARSEST that serves the engaged axes**, in
     both directions, so the guard is never somewhere a bug sits unexercised.

     THE COLLAPSE STILL NEEDS NO SECOND MECHANISM. An ineligible state produces
     no census; a census whose roles resolve nothing returns null; and null
     means "session A's descriptor list", on session A's arithmetic, character
     for character. */
  const positionGroups = (() => {
    const census = slotRoleCensus !== null ? slotRoleCensus : petalRoleCensus;
    if (census === null) return null;
    const order = slotRoleCensus !== null ? SLOT_ROLE_ORDER : PETAL_ROLE_ORDER;
    const roles = order.filter((r) => census.has(r));
    if (!roles.some((r) => resolveRoleOverrides(state, [r]) !== null)) return null;
    /* THE DESCRIPTOR CARRIES THE AXIS IT CAME FROM, and the other reads null.
       "This whorl was split by position" and "this group is a slot role" are
       different claims, and a reader must not have to infer which axis a value
       came from — the same reason `slotRole` is null rather than LATERAL on an
       unsplit descriptor. */
    const isSlot = slotRoleCensus !== null;
    return roles.map((r) => ({
      slotRole: isSlot ? r : null,
      petalRole: isSlot ? null : r,
      slots: census.get(r),
    }));
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
      raw.push({ lambda, scale, authoredWidth, width, rFoot, roleCount, role: roleForLayer(k, true), allRole, slotRole: null, petalRole: null, slots: null, clamped: [] });
    }
  } else {
  for (let L = 0; L < layerCount; L++) {
    const scale = Math.pow(state.layerSize, L);
    const authoredWidth = state.petalWidth * scale * 0.4 * state.footDelicacy;
    const width = clamp(authoredWidth, FOOT_MIN_WIDTH_MM, FOOT_MAX_WIDTH_MM);
    const rFoot = Math.sqrt((width * thickness) / Math.PI);
    const layerRole = roleForLayer(L, false);
    preRoleSumSq += slotCount * rFoot * rFoot;
    if (positionGroups === null) {
      /* THE COLLAPSED ARM — SESSION A'S, CHARACTER FOR CHARACTER, and it is
         the shipped path at every default. The group is the whole whorl and
         `roleCount` is `state.petalCount` — the SAME DOUBLE the pre-role
         expression multiplied by, deliberately read unrounded exactly as that
         expression read it. */
      const roleCount = slotCount;
      sumSq += roleCount * rFoot * rFoot;
      raw.push({ lambda: L, scale, authoredWidth, width, rFoot, roleCount, role: layerRole, allRole, slotRole: null, petalRole: null, slots: null, clamped: [] });
    } else {
      /* THE SPLIT ARM — one descriptor per (layer x slot role), in
         SLOT_ROLE_ORDER. The sum stays GROUPED BY ROLE and is never regrouped
         per foot; see the collapse note above for why the split itself has to
         be conditional. */
      for (const g of positionGroups) {
        const roleCount = g.slots.length;
        sumSq += roleCount * rFoot * rFoot;
        raw.push({ lambda: L, scale, authoredWidth, width, rFoot, roleCount, role: layerRole, allRole, slotRole: g.slotRole, petalRole: g.petalRole, slots: g.slots, clamped: [] });
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
  /* ===================================================================
     THE DOME (Sep 4) — a spherical cap through the rim (R0, z = 0) rising
     H = headRise * R0 at the axis: Rd = (R0^2 + H^2) / 2H, centre on the axis
     at H - Rd. ONE OWNER: every ring's height, slope and arc from the apex
     are stamped here; the petal builder, the hub builder and the centre read
     them and compute nothing. Null under the guard, so the flat path below is
     character for character what it was.

     THE APEX FLOOR binds when Rd would fall under one sheet thickness (see
     HEAD_RISE_MIN_RADIUS_FACTOR): Rd is held at the floor, the rise that
     actually built is reported beside the one asked for, and the read-out
     says "(CLAMPED)". Since Rd >= R0 always, this can only bind when the hub
     itself is narrower than the sheet — one reachable corner.

     WHAT THE DOME DOES TO CROWDING, measured before it was built and kept
     here because it will be forgotten: the surface the feet lie on is larger
     than its plan by 1 / cos(slope), and that factor is LARGEST AT THE RIM and
     1 at the apex — so the relief is greatest where the slope is steepest and
     least where a tight bloom's feet actually stack. The mum's peak sits at
     r 2.1–2.8 mm on a 4.69 mm hub, where a hemisphere's slope is 26–36 degrees
     and the local relief 1.1–1.2x; the whole-annulus area ratio there is 2.0x.
     A hemisphere takes the mum from D_max 11 to 9, not to 5. `relief` on every
     ring and `surfaceToPlan` on the dome carry that reading to the read-out. */
  /* THE SPHERE IS THE RISE-1 CAP CONTINUED PAST ITS OWN RIM: Rd = R0, the
     equator at z = 0 (the flat hub's plane, where the cap's rim always was),
     the face pole at +Rd and the reserved pole at -Rd. `H` keeps its meaning
     — the face pole's height above z = 0 — so the centre's apex seat and the
     seat's patch/hover expressions read it unchanged. THE APEX FLOOR still
     binds where R0 is narrower than one sheet (the same one reachable corner
     the cap has): the sphere is then held at the floor radius and every
     ring's plan radius follows Rd, not R0, so containment (J2) holds by
     construction; the read-out says "(CLAMPED)". `closed` is what the hub
     builder branches on and what S2 asserts against the builder's own
     report. `headRise` is NOT read here: hidden and inert under SPHERE. */
  const dome = sphere ? (() => {
    const floor = HEAD_RISE_MIN_RADIUS_FACTOR * thickness;
    const clamped = R0 < floor;
    const Rd = clamped ? floor : R0;
    return { rise: 1, riseBuilt: 1, H: Rd, Rd, centreZ: 0, clamped, floorRadius: floor, surfaceToPlan: null, closed: true, K: sequenceLength, stepCos: 2 / sequenceLength, reserved: null, faceReach: null };
  })() : domeIsFlat(state) ? null : (() => {
    const rise = state.headRise;
    const floor = HEAD_RISE_MIN_RADIUS_FACTOR * thickness;
    let H = rise * R0;
    /* AT RISE 1 THE CAP IS A HEMISPHERE AND Rd IS R0 EXACTLY — written so,
       not left to (2 R0^2) / (2 R0), which rounds a ULP either side of R0
       and puts the rim ring's height at sqrt(a rounding residue) instead of
       0: a 2e-7 mm "height" that made the gate's arc position of the rim
       row disagree with the owner's by 4e-9 (measured on the orchid row). */
    let Rd = rise === 1 ? R0 : (R0 * R0 + H * H) / (2 * H);
    let clamped = false;
    if (Rd < floor) { clamped = true; Rd = floor; H = floor - Math.sqrt(floor * floor - R0 * R0); }
    return { rise, riseBuilt: H / R0, H, Rd, centreZ: H - Rd, clamped, floorRadius: floor, surfaceToPlan: null };
  })();
  /* THE SURFACE LAW, ONE HELPER FOR BOTH DESCRIPTOR KINDS (session 21): where
     a plan radius (or, on the sphere, a polar angle) lands on the head the
     owner declares — height, slope (the polar angle from the apex, which is
     also the tangent plane's tilt), arc distance from the apex, and the local
     relief 1 / cos(slope) (on the sphere against the equatorial plane,
     symmetric about the equator; vertical AT the equator). Flat: 0 / 0 / the
     plan radius / 1. The ring map below and the androecium map read it; the
     expressions are the ring map's own, moved here VERBATIM, so every petal
     ring takes the same doubles it took before the androecium existed — the
     byte diff on the newest frozen baseline is what measures that. */
  const surfaceAt = (radius, polar) => {
    const slope = sphere ? polar : dome ? Math.asin(Math.min(1, radius / dome.Rd)) : 0;
    const z = sphere ? dome.Rd * Math.cos(polar) + dome.centreZ : dome ? Math.sqrt(dome.Rd * dome.Rd - radius * radius) + dome.centreZ : 0;
    const arc = dome ? dome.Rd * slope : radius;
    const relief = sphere ? (Math.abs(Math.cos(slope)) < 1e-9 ? Infinity : 1 / Math.abs(Math.cos(slope))) : dome ? (slope >= Math.PI / 2 - 1e-9 ? Infinity : 1 / Math.cos(slope)) : 1;
    return { slope, z, arc, relief };
  };
  const rings = raw.map((p, L) => {
    /* ON THE SPHERE THE KEY IS THE POLAR ANGLE (session 18): under the
       continuous arm `L` IS the slot index k, so `phiAt(L)` places this
       ring and its plan radius is DERIVED, Rd sin(phi) — plan radius is not
       injective past the equator, which is exactly why the cap's key cannot
       be continued there and this arm exists. Cap and flat: verbatim. */
    const polar = sphere ? phiAt(L) : null;
    const radius = sphere ? dome.Rd * Math.sin(polar) : R0 * p.scale;
    /* WHERE ON THE DOME THIS RING LANDS — from the one surface law above.
       Containment (J2) is what makes radius <= Rd: Rd >= R0 by AM-GM. */
    const { slope, z, arc, relief } = surfaceAt(radius, polar);
    /* How far inside the ring each foot continues, so foot–hub overlap is a
       solid annulus, not a hairline touch. A FRACTION of this layer's own
       radius with an absolute floor, so the guarantee is scale-free per
       layer exactly as it was for the single ring. Named once here — the
       same expression on the same double as the field it has always been —
       so the axis-crossing flag below reads it rather than restating it. */
    const overhang = Math.max(1.5, radius * 0.4);
    return {
      index: L,
      radius, derivedRadius, width: p.width, thickness,
      overhang,
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
      /* ===================================================================
         DOME LEAN (Sep 4, the crown-coverage session) — a boost DERIVED FROM
         THE DOME, never a control, never a default. Zero and byte-identical
         at headRise 0 by the same `dome ? X : 0` construction every other
         dome-derived quantity here uses (`slope` itself is 0 there), so it
         needs no guard of its own beyond the one `slope` already carries.

         WHY +slope EXACTLY, not a tuned constant: buildPetalInto's domed path
         builds the blade frame from (Rs, Up), and algebraically
         (Rs, Up) = (R, Z) rotated by -slope in the ring's own meridian plane
         (Rs = [R cos(slope), -sin(slope)], Up = [R sin(slope), cos(slope)] in
         (radial, z) — a rotation by -slope of (R, Z), verified against the
         domeGuardResidual precedent: at slope 0 this is the identity and the
         flat expression comes back verbatim). So a domed ring's blade at
         authored tilt T points where a FLAT ring's blade would point at tilt
         (T - slope) — dir_dome(T) = dir_flat(T - slope) — and its tip lands
         at the same PLAN RADIUS a flat ring's would at (T - slope), since
         Rs/Up carry no tangential component (no azimuth drift). Adding
         +slope is therefore the value, and the only value, that makes a
         domed ring's tilt T behave like the SAME flat tilt T: solving
         dir_dome(T') = dir_flat(T) gives T' = T + slope exactly, not a fitted
         approximation.

         WHAT THIS DOES NOT CLAIM. It restores ONE ring's own aim to its flat
         equivalent; crown COVERAGE is an ENSEMBLE property of every ring's
         swept footprint together, which is why it is verified against
         tools/bloom-plan-coverage.mjs's raster rather than asserted
         sufficient from the algebra alone. And it is a function of THIS
         RING'S OWN SLOPE, not of whether the arrangement's CROWN reads bare
         in the first place: a recipe whose crown is already uncovered at
         headRise 0 (measured Sep 4: a zero-curl, moderate-tilt continuous
         recipe can read ~1.15mm bald at rise 0 AND at rise 1 alike, nearly
         unchanged) has a shortfall this term was never aimed at and does not
         move — the dome did not cause that gap, so a term derived from the
         dome does not owe it a fix. That is scope, not an oversight; see
         docs/bloom-charter.md's crown-coverage entry for the measurement.

         IT IS A SEPARATE FIELD, NEVER FOLDED INTO tiltExtra — measured, not
         merely preferred. `tiltExtra` is the layered ramp's own law and nine
         existing clauses already police it as exactly that: J5 asserts it is
         MONOTONE in depth under CONTINUOUS, J6 asserts it passes EXACTLY
         through the ringed law at every quantized point, and the
         layerCount-1 guard asserts it is EXACTLY 0 there. domeLean is a
         function of a ring's own PLAN RADIUS, which for a CONTINUOUS spiral
         runs the OPPOSITE way from depth — the rim (shallow, large slope)
         sits at low lambda and the apex (deep, slope near 0) at high lambda
         — so folding it into `tiltExtra` breaks J5's monotonicity on real
         rows and J6's identity by exactly `domeLean` at every quantized
         point: MEASURED on this branch before this field was split out,
         firing both on the mum, the incurve target and Eva's own screenshot
         config alike. `buildPetalInto` reads `ring.domeLean` and
         `slot.tiltExtra` separately and sums three terms
         (`petalTilt + tiltExtra + domeLean`) at the one place the angle is
         actually used, so the layered law's own five existing assertions
         need not change a character, and this field's own correctness is
         J9's alone to state. */
      /* LEAN 0 ON THE SPHERE (Eva's ruling, Sep 5, Phase A Q1b): the cap's
         +slope restores a flat ring's GLOBAL aim, which assumes a privileged
         up; continued past the equator it aims every far-side petal back up
         into the bloom (at the far pole, minus the local direction), and the
         mirror alternative puts a jump of twice the tilt across the equator.
         So on the sphere the blade leaves the surface at its authored tilt
         from the local tangent, heading away from the face pole, everywhere
         — the primitive's own frame, no fitted constant. The FADED lean
         (slope x cos^2(phi/2)) is costed in the session-18 outcome doc and
         deliberately not built; the sheet decides. The cap arm is verbatim:
         `dome && !sphere` is `dome` on every cap. */
      domeLean: dome && !sphere ? (slope * 180) / Math.PI : 0,
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
      /* THE PER-PETAL ROLE — this descriptor's mirror ORBIT, counted outward
         from the plane, or null. Never both this and `slotRole`: the two
         position axes are mutually exclusive by placement (Eva's ruling 4),
         and Z9 asserts that rather than trusting it. */
      petalRole: p.petalRole,
      /* THE ALL-PETALS STAMP TRAVELS WITH THE OTHER ROLES — the probe that
         found it missing here is why Z1 reads it back from the metrics. */
      allRole: p.allRole,
      slots: p.slots,
      /* THE RESOLVED OVERRIDE RECORD, or null. Null on every descriptor whose
         roles carry no non-identity control — every OUTER-and-unsplit ring,
         every LATERAL, and any INNER ring whose deltas are all 0 — which is
         what makes petalStateFor() an identity guard rather than a merge. */
      /* THE ROLES THIS DESCRIPTOR CARRIES — layer, then position. A THIRD
         AXIS IS A LONGER LIST, NOT A REWRITTEN RESOLVER, which is what the
         seam session A wrote said it would be; `resolveRoleOverrides` walks
         the TABLE and tests membership in this list, so precedence is
         declared by where a row sits in ROLE_OVERRIDES and by nothing else.
         Per-petal rows sit last, so per-petal has the last word, and the
         composed value is clamped ONCE at the end into the base's own
         range. */
      overrides: resolveRoleOverrides(state, [p.role, p.allRole, p.slotRole, p.petalRole].filter((r) => r !== null), p.clamped),
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
      /* THE DEPTH TELEMETRY (Eva, Sep 3) — the two facts a derived depth
         clamp would have acted on, REPORTED instead of enforced, in the
         FOOT WIDTH FLOORED discipline: a ring narrower than one foot means
         the feet on it overlap each other; a ring inside its own overhang
         means they cross the axis. Both are reachable on purpose (the Aug 31
         spread ruling) and both already occur at depth 1..3 on shipped rows,
         so the read-out says WHERE rather than a clamp deciding silently.
         Telemetry only: nothing geometric may read these. */
      underFootFloor: radius < FOOT_MIN_WIDTH_MM,
      /* ON THE DOME the foot runs inward along the ARC, so it crosses the
         apex when the arc distance is shorter than the overhang — the flat
         expression is kept verbatim on the flat path. A circumference does
         not change on a dome, so `underFootFloor` needs no second arm. */
      crossesAxis: dome ? arc < overhang : radius < overhang,
      /* THE DOME'S PER-RING TELEMETRY, and the one thing consumers READ:
         z / slope / arc place the foot; `relief` is the local surface-to-
         plan factor 1 / cos(slope), the number the read-out prints at the
         rim and at the innermost ring so the relief finding is legible. */
      z, slope, arc, relief,
      dome,
    };
  });
  /* THE SPHERE'S TELEMETRY (session 18), stamped on the dome after the rings
     exist and read by the read-out, S1 and S3 — never re-derived there:
       reserved   the far pole's clearance: the arc from the pole to the
                  nearest foot's RING row (feet run the other way, toward
                  the face pole, so the ring row is the nearest point). The
                  reservation is structural — a future `below: 'stem'` value
                  attaches here — and S3 asserts it > 0 AND within one
                  equal-area step of the pole, so a sequence that stopped
                  short cannot pass it vacuously.
       faceReach  the nearest any foot's inner end comes to the FACE pole
                  along its meridian (negative: feet cross it — the same
                  `crossesAxis` flag the cap already carries).
       surfaceToPlan  4, exactly: a sphere over its own equatorial disc. */
  if (sphere) {
    let near = 0;
    for (let k = 1; k < rings.length; k++) if (rings[k].arc > rings[near].arc) near = k;
    const reservedMm = Math.PI * dome.Rd - rings[near].arc;
    dome.reserved = { mm: reservedMm, deg: (reservedMm / dome.Rd) * (180 / Math.PI), ring: near, stepMm: (dome.Rd * Math.acos(1 - dome.stepCos)) };
    let reach = Infinity;
    for (const r of rings) if (r.arc - r.overhang < reach) reach = r.arc - r.overhang;
    dome.faceReach = { mm: reach, crossing: rings.filter((r) => r.crossesAxis).length };
    dome.surfaceToPlan = 4;
  }
  /* THE SURFACE-TO-PLAN RATIO OVER THE FEET'S OWN ANNULUS — the whole-annulus
     figure, beside which the per-ring relief shows how uneven it is. Telemetry
     only; nothing geometric reads it. */
  if (dome && !sphere) {
    const rIn = Math.max(0, Math.min(...rings.map((r) => r.radius - r.overhang)));
    const plan = Math.PI * (R0 * R0 - rIn * rIn);
    const surf = 2 * Math.PI * dome.Rd * (Math.sqrt(dome.Rd * dome.Rd - rIn * rIn) - Math.sqrt(Math.max(0, dome.Rd * dome.Rd - R0 * R0)));
    dome.surfaceToPlan = plan > 0 ? surf / plan : 1;
  }

  /* THE HUB the junction is built on. Its radius is R0, which is
     layers[0].radius exactly — not a `Math.max` over the layers, because a max
     would be a SECOND derivation that merely happens to agree, and the
     one-owner rule is about which is which. Containment is asserted (J2/J3)
     rather than achieved by picking the largest. */
  /* ON THE SPHERE THE HUB'S RADIUS IS THE SPHERE'S — the equator, which
     every ring's plan radius is under by construction (Rd sin phi <= Rd).
     Cap and flat: R0, verbatim. */
  const hub = { radius: sphere ? dome.Rd : R0, thickness, derivedRadius, dome };

  /* ===================================================================
     THE ANDROECIUM DESCRIPTOR (session 21) — this owner's second kind. Null
     when ABSENT (count 0) and null under SPHERE (hidden and inert — the
     geometry's half of the registry's predicate); a claim nothing can make
     reads as absent.

     ITS OWN COUNT, ITS OWN LAW, NO PAIRING WITH PETALS (Q1). The radial
     extent is a RANGE: the reference is the androecium's OWN area rule,
     R_A^2 = SUM r_filament^2 = count x (d/2)^2 — the disc the filament
     cross-sections would exactly tile, the spread precedent's "reference,
     not a cage" — and `stamenSpread` multiplies it, out to the HUB RADIUS,
     where it is CLAMPED and told. Stamen roots do NOT enter the petal ring's
     area rule (Q5, amended): `spread` scales the petal ring and nothing else,
     and R0 above is untouched by this block — it reads `hub`, never writes.

     TWO LAYOUTS. RING is the shipped RADIAL law — every stamen on one ring at
     R_A, evenly (the six-stamen candidate). DISC is the VOGEL disc, r_i =
     R_A sqrt((i + 1/2) / count) at the golden angle — the equal-area
     seed-head law the charter parked for PETALS because they shrink with
     layerSize; stamens are constant-size, so that objection does not apply.
     Both place through buildWhorlInto's existing azimuth arms; the radii are
     stamped here and the builder indexes them.

     THE OVERLAP FLAG (Eva: a flag, never a refusal): a stamen whose root
     footprint stands inside any ring's petal-root annulus [radius - overhang,
     radius] is counted; the read-out says how many, beside the clear disc.
     Telemetry, like every clamp flag here — nothing geometric reads it. */
  const androecium = (() => {
    if (!androeciumEligible(state)) return null;
    const count = Math.round(state.stamenCount);
    if (!(count >= 0 && count <= MAX_STAMENS)) throw new Error(`stamenCount ${JSON.stringify(state.stamenCount)} is outside 0..${MAX_STAMENS} — the registry and the builder have diverged`);
    if (count === 0) return null;
    if (state.stamenLayout !== 'RING' && state.stamenLayout !== 'DISC') throw new Error(`unknown stamenLayout ${JSON.stringify(state.stamenLayout)} — the registry and the builder have diverged`);
    const disc = state.stamenLayout === 'DISC';
    const diameter = thickness;                       // one sheet thick, floored with it
    const rFil = diameter / 2;
    const derivedRadius = rFil * Math.sqrt(count);    // the androecium's own area rule
    const asked = derivedRadius * state.stamenSpread;
    /* OUT TO THE HUB RADIUS means the outermost FOOTPRINT reaches the rim:
       the disc radius is clamped at the hub radius less one filament radius,
       so every root stands whole on the slab (JS2). MEASURED before this was
       written: clamping the CENTRE at the rim put 16 of 120 roots half over
       the edge on the defaults. ONE REACHABLE CORNER — a hub narrower than a
       filament radius (ALL MIN x spread min x sheet 2.40, the apex floor's
       own corner) — collapses the androecium onto the axis: told (`onAxis`),
       never refused, on the crosses-axis precedent. */
    const limit = Math.max(0, hub.radius - rFil);
    const clamped = asked > limit;
    const radius = clamped ? limit : asked;
    const onAxis = limit === 0;
    const anther = { diameter: ANTHER_DIAMETER_FACTOR * diameter, length: ANTHER_LENGTH_FACTOR * ANTHER_DIAMETER_FACTOR * diameter };
    const clearRadius = Math.max(0, Math.min(...rings.map((r) => r.radius - r.overhang)));
    const stamens = [];
    for (let i = 0; i < count; i++) {
      const r = disc ? radius * Math.sqrt((i + 0.5) / count) : radius;
      const s = surfaceAt(r, null);
      const inPetalRootAnnulus = rings.some((rg) => r + rFil > rg.radius - rg.overhang && r - rFil < rg.radius);
      stamens.push({ index: i, radius: r, slope: s.slope, z: s.z, arc: s.arc, relief: s.relief, inPetalRootAnnulus });
    }
    return {
      count, layout: state.stamenLayout, diameter, rFil, length: state.stamenLength, curlDeg: state.stamenCurl, curlRad: state.stamenCurl * D2R,
      derivedRadius, spread: state.stamenSpread, asked, radius, clamped, limit, onAxis, hubRadius: hub.radius, clearRadius, anther, thickness, dome,
      stamens,
      inPetalRootAnnulus: stamens.filter((s) => s.inPetalRootAnnulus).length,
      /* SLENDERNESS — free length over the FLOORED diameter, telemetry only
         (Q7). UNMEASURED — no coupon has been printed: the six-stamen
         candidate at L/d 18.3 is past anything this family has printed. */
      slenderness: state.stamenLength / diameter,
    };
  })();

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
  /* NULL ON THE SPHERE (session 18, Eva's ruling: J6 nulled with a clause).
     The identity states that the continuous sequence passes through every
     RINGED layer's scale and tilt; no ringed placement has a sphere arm, so
     there is no ringed twin for a spherical sequence to agree with, and a
     claim nothing can make reads as absent. (The scale and tilt laws are
     unchanged on the sphere, so the numbers would still agree — which is
     precisely why asserting them would be an assertion about nothing.) */
  if (continuousMode && !sphere) {
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
    /* THE DOME, footRing()'s own — null under the guard. */
    dome,
    /* THE ANDROECIUM, this owner's second kind — null when absent or under
       SPHERE (session 21). */
    androecium,
    /* WHETHER THE HEAD IS THE FULL SPHERE (session 18) — this file's own
       answer, cross-checked against the registry's `sphereMode` predicate by
       the harness on every row. */
    sphereMode: sphere,
    continuousMode, sequenceLength, quantizerResiduals, zygoGuardResidual,
    slotRings,
    /* WHETHER SLOT ROLES APPLY IN THIS STATE, and whether a whorl actually
       split. Two different claims: the first is the gating (placement and
       depth), the second additionally needs a control off its identity. Both
       are reported so Z5 can assert the collapse in both directions and the
       gates can cross-check the first against the registry's own predicate. */
    slotRolesEligible: !continuousMode && slotRolesEligible(state),
    /* WHETHER PER-PETAL ROLES APPLY, the counterpart flag — cross-checked
       against the registry's own `perPetalEligible` predicate by both gates,
       exactly as its slot-role twin is. Two statements of one boundary is a
       registration risk; checking them is what makes it one owner. */
    perPetalEligible: !continuousMode && perPetalEligible(state),
    allPetalsEligible: allRole !== null,
    /* WHETHER A WHORL ACTUALLY SPLIT. One flag for both axes, because the
       question it answers — "is the area rule summing the whole whorl or a
       partition of it" — is the same question whichever axis did it, and it
       is the question Z7 is about. WHICH axis split is readable from any
       descriptor's own `slotRole` / `petalRole`, which is where that claim
       belongs. */
    slotRolesSplit: positionGroups !== null,
    /* GROUP SIZES PER PER-PETAL ROLE, whenever per-petal roles are eligible —
       the answer each group's visibility predicate is about, and what Z1's
       biconditional checks it against. Computed independently of whether a
       whorl actually SPLIT, for the reason its slot-role twin is: "does group
       5 have any members" is a question about the ARRANGEMENT and has an
       answer at the shipping fan default, where nothing is overridden and
       nothing splits. */
    petalRoleCensus: petalRoleCensus === null ? null
      : Object.fromEntries(PETAL_ROLE_ORDER.map((r) => [r, (petalRoleCensus.get(r) || []).length])),
    /* HOW MANY GROUPS THIS ARRANGEMENT HAS — footRing()'s own answer, so no
       consumer counts orbits for itself. null where per-petal does not apply,
       because a claim nothing can make must read as absent. */
    petalGroupCount: petalRoleCensus === null ? null : petalGroupCount(n, mirror),
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
       2. IT IS THE (since-retired) CENTRE DOME'S BUG. `domeInto` closed its cap on a ring of 48
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
/* The domed hub's apex floor is this same argument (a shell's inner offset
   inverts under half a thickness of radius), so the two constants are
   asserted equal here — below both definitions, because a top-level
   `const A = B` reading a later `const` is the hoisting trap this project has
   fired twice. */
if (HEAD_RISE_MIN_RADIUS_FACTOR !== ROLL_MIN_RADIUS_FACTOR) throw new Error(`HEAD_RISE_MIN_RADIUS_FACTOR ${HEAD_RISE_MIN_RADIUS_FACTOR} is not ROLL_MIN_RADIUS_FACTOR ${ROLL_MIN_RADIUS_FACTOR} — the two floors are one argument and have diverged`);

const D2R = Math.PI / 180;

/* THE GUARD's predicate, exported so the app, the builder and the gates all
   ask the same question. Exact zero comparisons: every one of the four
   defaults IS exactly 0, and a range input at its default yields it. */
export function petalFormIsFlat(state) {
  return state.petalCup === 0 && state.petalSpineCurl === 0
      && state.petalRoll === 0 && state.petalTwist === 0
      /* CUP GRADIENT (session 16) is the one member of the curl family that
         is a deformation of its own: bias and start multiply the curl, roll
         taper multiplies the roll, and all three are inert by construction
         where their base is 0, so only this one joins the guard. */
      && state.petalCupGradient === 0;
}

/* ===================================================================
   THE SPINE LAW (session 16, the petal curl family) — ONE OWNER of where the
   curled centreline goes, read by buildPetalInto AND by the gate's C1.

   The shipped spine is a constant-curvature arc, `phi(s) = tilt + kC*s`,
   in closed form. Curl bias and curl start REDISTRIBUTE that same total
   turn along the length (the flower's parameterisation, re-derived for a
   sheet): cumulative turn `curlRad * remap(u)^(p+1)` with `p = CURL_BIAS_
   POWER * bias` (0 = uniform, the arc verbatim; 1 = tip-loaded, a crozier)
   and `remap` a hard threshold at `start` (u below it dead straight, the
   whole turn squeezed into what remains). What the flower does NOT get to
   keep: its bias doubles the total turn (360 to 720 degrees at bias 1),
   which would be a second owner of the total — here the total is spine
   curl's alone and the modifiers only move it.

   THE FLOOR — cap the OUTPUT, never an input proxy. The sheet's inner face
   inverts under half a thickness of SPINE radius exactly as it does under
   roll, and the modifiers concentrate curvature far past the roll floor's
   reach: bias 1 multiplies the peak by (p+1) = 5, start 0.95 by 20. The
   curvature is floored pointwise at one sheet thickness of radius (the roll
   floor's own constant, `ROLL_MIN_RADIUS_FACTOR * t`), the control
   SATURATES, and the read-out says "(CLAMPED)" with the turn that actually
   built beside the turn asked — 150 degrees asked can build 33 at the worst
   reachable corner. Eva, Sep 4: full ranges, clamped, told; trimming the
   input to hide a cliff is an input proxy. The flower's constants (power 4,
   start to 0.95) are LACE constants with no thickness behind them; on a
   printed sheet the floor binds over most of their range, and the read-out
   is what tells a visitor where.

   The uniform arc is NOT floored — it is the shipped geometry, byte for
   byte — and it does reach under one sheet thickness on shrunk inner
   whorls (six deep x curl 360: 1.08 mm against 1.20), a pre-existing state
   on three shipped rows that C3 found on the first full run. It is TOLD
   (`underFloor`) and never clamped; see the note at kMax.

   INTEGRATION. Curvature is sampled at SPINE_SUBSTEPS substeps per blade row
   and each substep is an EXACT circular arc at that curvature, so the
   uniform law reproduces the closed-form arc to floating-point summation
   (measured 1e-14 mm; C2 asserts 1e-9) and the tabulated law is what both
   the builder and the gate read. CURL START IS FLOORED AT ONE BLADE ROW
   (Eva, Sep 4): any non-zero start is at least 1/NU, so the root chord is
   straight wherever start is engaged and J8's normal clause applies there.
   =================================================================== */
export const SPINE_SUBSTEPS = 32;
export const CURL_BIAS_POWER = 4;
/* RED-THEN-GREEN (session 16, Eva's instruction: build Mutant A's witness
   before the controls). With this false the controls are read, the law is
   evaluated and reported, and the spine keeps the arc — the four-dead-
   sliders state that is bit-identical to the un-biased bloom and invisible
   to every instrument that existed. C1 must fire on it before it is true. */
const SPINE_WIRED = true;
export const CURL_START_MIN = 1 / NU;
export function curlIsUniform(state) { return state.curlBias === 0 && state.curlStart === 0; }
export function curlStartFloored(start) { return start === 0 ? 0 : Math.max(start, CURL_START_MIN); }
export function spineLaw({ curlRad, bias, start, length, tilt, floorRadius }) {
  const p = CURL_BIAS_POWER * bias;
  const s0 = curlStartFloored(start);
  const remap = (u) => (s0 === 0 ? u : Math.max(0, (u - s0) / (1 - s0)));
  /* The CUMULATIVE turn at u — the law in closed form, before the floor.
     Each substep's curvature is the exact mean of the law over it, so the
     unclamped total is Phi(1) = curlRad to the last bit rather than a
     quadrature of the derivative (the first draft sampled the derivative at
     midpoints and built 149.9998 of 150 degrees, which C3 then read as a
     clamp that was not there). */
  const Phi = (u) => (s0 !== 0 && u <= s0 ? 0 : curlRad * Math.pow(remap(u), p + 1));
  /* THE FLOOR IS THE MODIFIERS' FLOOR. A UNIFORM curl is the shipped arc,
     built verbatim by buildPetalInto for byte identity, and it is NOT
     clamped here either — measured on the first full gate run: under LAYERS
     the blade shrinks by layerSize per whorl, and at six deep x curl 360 the
     innermost whorl's 6.8 mm blade has a 1.08 mm spine radius against a
     1.20 mm floor. Three SHIPPED rows sit there (6 layers x innerCurl 360,
     DEPTH 6 x ALL FORM MAX, ZYGO 6 x ALL INNER MAX) — a PRE-EXISTING state
     found by C3, not damage it caused, on the session-13 precedent: a clamp
     could not be byte-identical, so it is TOLD (`underFloor`, the read-out's
     UNDER ONE SHEET THICKNESS clause) and never applied. The claim that the
     uniform arc never reaches the floor was true of one whorl and false of
     six, and the gate found it before this sentence did. */
  const uniform = bias === 0 && s0 === 0;
  const kMax = uniform ? Infinity : 1 / floorRadius;
  const N = NU * SPINE_SUBSTEPS, ds = length / N;
  const dR = new Float64Array(N + 1), dZ = new Float64Array(N + 1), phi = new Float64Array(N + 1);
  phi[0] = tilt;
  let peakK = 0, clamped = false;
  /* sin(x)/x, stable at the small x a tip-loaded law has near the root. The
     exact-arc form (sin p1 - sin p0) / k CANCELS there: measured, a one-ULP
     difference in Math.sin between Node's V8 and Chromium's V8 became
     1.4e-3 mm of spine on the incurve target's ring 0, because k at the
     first substep of a bias-1 law is ~1e-13. The product form below is the
     same arc, algebraically, and it is portable. */
  const sinc = (x) => (Math.abs(x) < 1e-4 ? 1 - (x * x) / 6 : Math.sin(x) / x);
  for (let i = 0; i < N; i++) {
    const u1 = (i + 1) / N;
    const kRaw = (Phi(u1) - Phi(i / N)) / ds;
    const over = Math.abs(kRaw) > kMax;
    const k = over ? Math.sign(kRaw) * kMax : kRaw;
    if (over) clamped = true;
    if (Math.abs(k) > peakK) peakK = Math.abs(k);
    const p0 = phi[i];
    /* Exact where nothing has clamped yet, accumulated once something has. */
    const p1 = clamped ? p0 + k * ds : tilt + Phi(u1);
    phi[i + 1] = p1;
    if (k === 0) { dR[i + 1] = dR[i] + Math.cos(p0) * ds; dZ[i + 1] = dZ[i] + Math.sin(p0) * ds; }
    else {
      const pm = (p0 + p1) / 2, sc = ds * sinc((p1 - p0) / 2);
      dR[i + 1] = dR[i] + Math.cos(pm) * sc;
      dZ[i + 1] = dZ[i] + Math.sin(pm) * sc;
    }
  }
  return {
    /* Position and angle at arc length s, in the foot's own (Rs, Up) plane:
       dR along the rotated radial, dZ along the rotated up. */
    at(s) { const i = Math.round(s / ds); return { dR: dR[i], dZ: dZ[i], phi: phi[i] }; },
    peakRadius: peakK === 0 ? Infinity : 1 / peakK,
    clamped,
    /* A UNIFORM curl whose arc sits under one sheet thickness — told, never
       clamped (see the note at kMax). Exactly false wherever the floor was
       applied, since the clamped peak IS the floor. */
    underFloor: peakK * floorRadius > 1,
    turnBuilt: phi[N] - tilt,
    turnAsked: curlRad,
    startFloored: s0,
  };
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

  /* THE CURL FAMILY (session 16). Bias and start are read here and handed
     to spineLaw() by the builder (the spine needs tilt and length, which are
     the builder's). Roll TAPER is an envelope on the roll's curvature along
     the length — smootherstep from 1 to 1-|taper|, opening toward the tip
     for a positive value and toward the base for a negative one (the
     flower's own sign convention). CUP GRADIENT is the flower's "edge curve
     — profile" under the name the geometry earns: the SAME v^2 lift along
     the row normal that cup is, with an envelope that grows linearly to the
     tip instead of cup's onset ramp — measured 28% RMS residual against the
     best-fitting cup at every amplitude, so it is a cup that grows toward
     the tip, not a second cup. The flower's cup-damping-under-roll is NOT
     ported: roll is isometric here (|dP/dv| ratio exactly 1) and cup
     composes onto it without the two fighting for one plane.

     EVERY identity takes the shipped expression by a BRANCH, on the form
     guard's own doctrine: `kappa * r` and `cup * r` verbatim at taper 0 and
     gradient 0, never `x * 1` or `x + 0` argued exact. */
  const bias = state.curlBias, start = state.curlStart;
  const rollTaper = state.petalRollTaper, cupGrad = state.petalCupGradient;
  const curlUniform = curlIsUniform(state);
  const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
  const rollEnv = (u) => 1 - Math.abs(rollTaper) * smoother(rollTaper > 0 ? u : 1 - u);
  const kAt = (u, r) => (rollTaper === 0 ? kappa * r : kappa * r * rollEnv(u));
  const cAt = (u, r) => (cupGrad === 0 ? cup * r : cup * r + cupGrad * u);

  const ramp = (u) => (u >= FORM_ONSET_END ? 1 : u / FORM_ONSET_END);

  /* The row's frame. ONE definition, read by the row loop and by the
     contact sheet's framing alike — under twist the width direction is not
     the ring tangent any more, so a consumer recomputing it would not
     merely be a second owner, it would be wrong. */
  /* `up` (Sep 4, the domed hub): the direction the blade's tilt is measured
     toward. Absent, it is the axis and every expression below is the
     pre-dome one verbatim — a foot on a dome passes the tangent plane's own
     normal instead, and the frame rotates rigidly with the foot. Written as
     a BRANCH rather than as `up = Z` with a general expression, because
     `-R[0]*sin(phi) + 0*cos(phi)` turns a -0 into a +0 at petalTilt 0 and
     that is a byte. */
  const frameAt = (R, T, phi, u, up = null) => {
    if (up !== null) {
      const N0 = [-R[0] * Math.sin(phi) + up[0] * Math.cos(phi), -R[1] * Math.sin(phi) + up[1] * Math.cos(phi), -R[2] * Math.sin(phi) + up[2] * Math.cos(phi)];
      const tau = twistRad * u;
      const ct = Math.cos(tau), st = Math.sin(tau);
      return {
        D: [R[0] * Math.cos(phi) + up[0] * Math.sin(phi), R[1] * Math.cos(phi) + up[1] * Math.sin(phi), R[2] * Math.cos(phi) + up[2] * Math.sin(phi)],
        T: [T[0] * ct + N0[0] * st, T[1] * ct + N0[1] * st, T[2] * ct + N0[2] * st],
        N: [-T[0] * st + N0[0] * ct, -T[1] * st + N0[1] * ct, -T[2] * st + N0[2] * ct],
      };
    }
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
    const k = kAt(u, r);
    const c = cAt(u, r);
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
    curlRad, twistRad, kappa, frameAt, sectAt, curlUniform,
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
        const k = kAt(row.u, rr), c = cAt(row.u, rr);
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
        const k = kAt(row.u, rr), c = cAt(row.u, rr);
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
        /* THE CURL FAMILY's own numbers travel with the form telemetry; the
           spine's (floor, clamp, built turn, clearance) are the builder's,
           under `spine`, because they need tilt and length. */
        curlBias: bias, curlStart: start, curlUniform,
        rollTaper, cupGradient: cupGrad,
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
  /* THE AFFINE ANGLE, PLUS THE DOME'S OWN LEAN (Sep 4) — three terms, read
     from three owners: `ps.petalTilt` the base control, `slot.tiltExtra` the
     layered ramp footRing() computed per this descriptor, `ring.domeLean`
     the SAME owner's per-ring cap correction, kept a separate field rather
     than folded into `tiltExtra` (see footRing()'s own note on that ring
     field: folding it in broke two existing assertions about the LAYERED
     term's own shape). `ring.domeLean` is 0 at every flat build by the same
     construction `ring.slope` already is, so this line is byte-identical to
     its pre-Sep-4 form whenever headRise is 0. */
  const tilt = ((ps.petalTilt + slot.tiltExtra + ring.domeLean) * Math.PI) / 180;
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
  /* ON THE DOME (Sep 4) the same three rows lie ON the cap footRing() owns:
     spaced along the meridian ARC by the same offsets (the overhang is arc
     length — the same foot, laid on a curved surface), each row a great-
     circle arc across of radius Rd (the roll law's own cross-section, with
     the sphere's centre on the row's normal), so the foot's mid-surface is
     IN the shell's mid-surface with no seam beyond the mesh's own faceting
     (0.007 mm worst case at NV 10). The alternatives were measured and
     rejected: a single tangent box reaches 0.70 mm off the surface at the
     default and 1.07 mm at ALL MIN, past t/2; rows along the arc with
     straight chords across leave the row ENDS floating by hw^2 / 2Rd,
     0.58 mm on a default-width foot at a hemisphere.
     THE RING ROW is placed from ring.radius and ring.z DIRECTLY, so J1's
     equality against the owner is exact; the two inner rows come from the
     arc law. A foot longer than its arc to the apex crosses it (phi < 0, a
     negative plan radius) exactly as a flat foot crosses the axis. */
  const dome = ring.dome;
  const domeRows = (kappa) => {
    /* THE DOME LAW AT A CURVATURE — kappa = 1 / Rd, and kappa === 0 is a
       legitimate input whose every branch is the flat expression. That is
       what makes the guard residual below a measurement of the LAW rather
       than of the guard: the residual calls this at kappa 0 and compares. */
    const out = [];
    for (const s of footS) {
      let C, N;
      if (kappa === 0) { C = [R[0] * (ring.radius + s), R[1] * (ring.radius + s), slot.z]; N = [0, 0, 1]; }
      else if (s === 0) { C = [R[0] * ring.radius, R[1] * ring.radius, ring.z]; N = [R[0] * Math.sin(ring.slope), R[1] * Math.sin(ring.slope), Math.cos(ring.slope)]; }
      else {
        const phi = ring.slope + s * kappa, rr = Math.sin(phi) / kappa;
        C = [R[0] * rr, R[1] * rr, Math.cos(phi) / kappa + ring.dome.centreZ];
        N = [R[0] * Math.sin(phi), R[1] * Math.sin(phi), Math.cos(phi)];
      }
      const sect = (v) => {
        const a = footHalf * v * kappa;
        if (kappa === 0) return { P: [C[0] + T[0] * footHalf * v, C[1] + T[1] * footHalf * v, C[2] + T[2] * footHalf * v], n: N };
        const ca = Math.cos(a), sa = Math.sin(a);
        const n = [N[0] * ca + T[0] * sa, N[1] * ca + T[1] * sa, N[2] * ca + T[2] * sa];
        return { P: [C[0] + (n[0] - N[0]) / kappa, C[1] + (n[1] - N[1]) / kappa, C[2] + (n[2] - N[2]) / kappa], n };
      };
      out.push({ C, N, T, h: footHalf, u: 0, sect });
    }
    return out;
  };
  if (dome === null) {
    for (const s of footS) {
      const C = [R[0] * (ring.radius + s), R[1] * (ring.radius + s), slot.z];
      rows.push({ C, N: Z, T, h: footHalf, u: 0, sect: flatSect(C, Z, footHalf) });
    }
  } else {
    for (const row of domeRows(1 / dome.Rd)) rows.push(row);
  }

  /* THE BLADE FRAME ROTATES RIGIDLY WITH THE FOOT: on the dome the tilt is
     measured from the tangent plane's outward direction (which points DOWN
     the slope) toward its normal, so an outer floret on a steep cap leans
     out and an inner one stands at its authored tilt — the ball. The flat
     path is verbatim. */
  const Rs = dome === null ? R : [R[0] * Math.cos(ring.slope), R[1] * Math.cos(ring.slope), -Math.sin(ring.slope)];
  const Up = dome === null ? Z : [R[0] * Math.sin(ring.slope), R[1] * Math.sin(ring.slope), Math.cos(ring.slope)];
  const dir = dome === null
    ? [R[0] * Math.cos(tilt), R[1] * Math.cos(tilt), Math.sin(tilt)]       // blade direction
    : [Rs[0] * Math.cos(tilt) + Up[0] * Math.sin(tilt), Rs[1] * Math.cos(tilt) + Up[1] * Math.sin(tilt), Rs[2] * Math.cos(tilt) + Up[2] * Math.sin(tilt)];
  const nrm = dome === null
    ? [-R[0] * Math.sin(tilt), -R[1] * Math.sin(tilt), Math.cos(tilt)]     // blade sheet normal
    : [-Rs[0] * Math.sin(tilt) + Up[0] * Math.cos(tilt), -Rs[1] * Math.sin(tilt) + Up[1] * Math.cos(tilt), -Rs[2] * Math.sin(tilt) + Up[2] * Math.cos(tilt)];
  const base = dome === null ? [ring.radius * R[0], ring.radius * R[1], slot.z] : [ring.radius * R[0], ring.radius * R[1], ring.z];

  /* THE SPINE. Straight when there is no curl — the same expression as
     before — and a constant-curvature arc when there is. The arc is the
     integral of a direction whose angle is `tilt + kappa*s`, so at s = 0 it
     leaves the foot at exactly the tilt angle and exactly the ring: curl
     moves the TIP, never the attachment. That is why curl cannot disturb
     the foot even though it acts on the frame the foot's neighbour uses. */
  const kC = form ? form.curlRad / length : 0;
  /* THE CURL FAMILY (session 16): with bias or start engaged the spine is
     spineLaw()'s table — the same turn, redistributed, floored at one sheet
     thickness of radius in the foot's own (Rs, Up) plane. The two arc
     branches below are the shipped closed form, character for character,
     and they are what a UNIFORM curl still builds from: `curlUniform` is a
     BRANCH, not an argument that `Math.pow(u, 1)` is `u`. The law is
     evaluated on every curled row regardless, because the gate's C1 reads
     its inputs from other owners and compares against the emitted rows,
     and C2 compares the table against the closed form on uniform rows —
     the integrator's own validity, never assumed. */
  const floorRadius = ROLL_MIN_RADIUS_FACTOR * t;
  const law = form && kC !== 0 ? spineLaw({ curlRad: form.curlRad, bias: ps.curlBias, start: ps.curlStart, length, tilt, floorRadius }) : null;
  const generalSpine = SPINE_WIRED && law !== null && !form.curlUniform;
  const spineAt = generalSpine
    ? (s) => {
      const q = law.at(s);
      return { C: [base[0] + Rs[0] * q.dR + Up[0] * q.dZ, base[1] + Rs[1] * q.dR + Up[1] * q.dZ, base[2] + Rs[2] * q.dR + Up[2] * q.dZ], phi: q.phi };
    }
    : kC === 0
    ? (s) => ({
      C: [base[0] + dir[0] * s, base[1] + dir[1] * s, base[2] + dir[2] * s],
      phi: tilt,
    })
    : dome === null ? (s) => {
      const phi = tilt + kC * s;
      const dR = (Math.sin(phi) - Math.sin(tilt)) / kC;
      const dZ = (Math.cos(tilt) - Math.cos(phi)) / kC;
      return { C: [base[0] + R[0] * dR, base[1] + R[1] * dR, base[2] + dZ], phi };
    } : (s) => {
      /* The same arc in the foot's own (Rs, Up) plane. */
      const phi = tilt + kC * s;
      const dR = (Math.sin(phi) - Math.sin(tilt)) / kC;
      const dZ = (Math.cos(tilt) - Math.cos(phi)) / kC;
      return { C: [base[0] + Rs[0] * dR + Up[0] * dZ, base[1] + Rs[1] * dR + Up[1] * dZ, base[2] + Rs[2] * dR + Up[2] * dZ], phi };
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
    const f = form.frameAt(Rs, T, phi, u, dome === null ? null : Up);
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
    const zero = petalForm({ petalCup: 0, petalSpineCurl: 0, petalRoll: 0, petalTwist: 0, curlBias: 0, curlStart: 0, petalRollTaper: 0, petalCupGradient: 0 }, halfW, t);
    guardResidual = 0;
    const dev = (a, b) => { for (let k = 0; k < 3; k++) guardResidual = Math.max(guardResidual, Math.abs(a[k] - b[k])); };
    for (let i = footS.length; i < rows.length; i++) {
      const row = rows[i];
      const zf = zero.frameAt(Rs, T, tilt, row.u, dome === null ? null : Up);
      dev(zf.T, T); dev(zf.N, nrm);
      const zs = zero.sectAt(row.C, row.T, row.N, row.h, row.u);
      for (let j = 0; j < NV; j++) {
        const v = -1 + (2 * j) / (NV - 1);
        const A = row.sect(v), B = zs(v);
        dev(A.P, B.P); dev(A.n, B.n);
      }
    }
  }

  /* THE SPINE'S OWN TELEMETRY (session 16) — what the curl family can break
     that neither STL gate can see. `rows` is every blade row's centre AS
     EMITTED; the gate's C1 rebuilds the law from OTHER owners (the effective
     controls, the ring's tilt terms, the ring's thickness) and compares,
     because a spine that keeps the arc while the controls are wired is
     bit-identical to the un-biased bloom — Mutant A, measured before this
     existed, invisible to every other instrument. `integrationResidual` is
     the table against the closed form on UNIFORM curled rows (slot 0): the
     integrator's validity, C2. `clearance` is the SELF-CONTACT FLAG (never a
     gate, Eva Sep 4 — it fires on the shipped, photographed hoop): the
     nearest approach between blade rows at least three sheet thicknesses
     apart ALONG the spine, and between the blade and its own foot, against
     one sheet thickness. Row pitch is not contact: the shrink-0.35 blade
     is 0.88 mm long and every row is within a sheet of its neighbours. */
  const spineRows = rows.slice(footS.length).map((r) => r.C);
  let integrationResidual = null;
  if (law !== null && form.curlUniform && slot.index === 0) {
    integrationResidual = 0;
    for (let i = 1; i <= NU; i++) {
      const s = (i / NU) * length, q = law.at(s), c = spineAt(s).C;
      const g = [base[0] + Rs[0] * q.dR + Up[0] * q.dZ, base[1] + Rs[1] * q.dR + Up[1] * q.dZ, base[2] + Rs[2] * q.dR + Up[2] * q.dZ];
      for (let k = 0; k < 3; k++) integrationResidual = Math.max(integrationResidual, Math.abs(g[k] - c[k]));
    }
  }
  const clearance = (() => {
    const f0 = footS.length, ds = length / NU;
    const minSep = Math.max(1, Math.ceil((3 * t) / ds));
    let minMm = Infinity, rowsAt = [-1, -1];
    for (let i = f0; i < rows.length; i++) for (let j = i + minSep; j < rows.length; j++) {
      const a = rows[i].C, b = rows[j].C;
      const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      if (d < minMm) { minMm = d; rowsAt = [i - f0 + 1, j - f0 + 1]; }
    }
    let minToFootMm = Infinity, footRowAt = -1;
    for (let i = f0 + minSep; i < rows.length; i++) for (let j = 0; j < f0; j++) {
      const a = rows[i].C, b = rows[j].C;
      const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      if (d < minToFootMm) { minToFootMm = d; footRowAt = i - f0 + 1; }
    }
    const nearest = Math.min(minMm, minToFootMm);
    return { minMm, rows: rowsAt, minToFootMm, footRow: footRowAt, sheetT: t, minSepRows: minSep, selfContact: nearest < t };
  })();
  const spine = {
    rows: spineRows,
    tiltRad: tilt, length, curlRad: form ? form.curlRad : 0,
    bias: ps.curlBias, start: ps.curlStart, floorRadius,
    uniform: form ? form.curlUniform : true,
    peakRadiusMm: law ? law.peakRadius : Infinity,
    clamped: law ? law.clamped : false,
    underFloor: law ? law.underFloor : false,
    turnAskedDeg: ps.petalSpineCurl,
    turnBuiltDeg: law ? law.turnBuilt / D2R : 0,
    startFloored: law ? law.startFloored : 0,
    integrationResidual,
    clearance,
  };

  const midS = 0.5 * length;
  const midRow = spineAt(midS);
  /* The blade's own frame AT THE MIDPOINT, for the contact sheet's framing.
     Reported rather than re-derived: face-on is down the normal, profile is
     down the width direction, and a shot tool recomputing either from tilt
     and azimuth would be a second owner of the petal frame — which under
     curl and twist would also be WRONG, since neither is constant along the
     blade any more. */
  const midU = 0.5;
  const midFrame = form ? form.frameAt(Rs, T, midRow.phi, midU, dome === null ? null : Up) : { T, N: nrm };
  /* THE DOME GUARD'S OWN CHECK — the dome law evaluated at ZERO curvature
     against the flat rows the guard just emitted, on flat (rise 0) builds,
     slot 0 only: every foot row's centre, normal and every cross-section
     column, plus the blade frame at the root. Asserted EXACTLY 0 by both
     gates — the kappa-0 branches ARE the flat expressions — and it measures
     the LAW, never the bytes: the rotated radial at zero slope carries a -0
     where the flat one carries +0, |(-0) - 0| is 0, and the byte diff is
     the instrument for that. Null on domed builds: a claim nothing can make
     reads as absent, never as a passing 0. */
  let domeGuardResidual = null;
  if (dome === null && slot.index === 0) {
    domeGuardResidual = 0;
    const dev = (a, b) => { for (let k = 0; k < 3; k++) domeGuardResidual = Math.max(domeGuardResidual, Math.abs(a[k] - b[k])); };
    const zeroRows = domeRows(0);
    for (let i = 0; i < footS.length; i++) {
      dev(zeroRows[i].C, rows[i].C); dev(zeroRows[i].N, rows[i].N);
      for (let j = 0; j < NV; j++) {
        const v = -1 + (2 * j) / (NV - 1);
        const A = zeroRows[i].sect(v), B = rows[i].sect(v);
        dev(A.P, B.P); dev(A.n, B.n);
      }
    }
    const Rs0 = [R[0] * Math.cos(0), R[1] * Math.cos(0), -Math.sin(0)], Up0 = [R[0] * Math.sin(0), R[1] * Math.sin(0), Math.cos(0)];
    dev([Rs0[0] * Math.cos(tilt) + Up0[0] * Math.sin(tilt), Rs0[1] * Math.cos(tilt) + Up0[1] * Math.sin(tilt), Rs0[2] * Math.cos(tilt) + Up0[2] * Math.sin(tilt)], dir);
    dev([-Rs0[0] * Math.sin(tilt) + Up0[0] * Math.cos(tilt), -Rs0[1] * Math.sin(tilt) + Up0[1] * Math.cos(tilt), -Rs0[2] * Math.sin(tilt) + Up0[2] * Math.cos(tilt)], nrm);
  }
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
    /* THE PER-PETAL ROLE THE BUILDER ACTUALLY READ (session 11) — reported
       beside `slotRole` for the same reason it is: Z2 compares the builder's
       own answer against footRing()'s, and a descriptor looked up under the
       wrong axis would otherwise be indistinguishable from a correct one. */
    petalRole: ring.petalRole, allRole: ring.allRole ?? null,
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
    /* THE ROOT — the first BLADE row as emitted, beside the frame the builder
       leaves the foot with. J8 compares the emitted normal against the rigid
       tilt of the foot's own frame, built from the owner's slope: the blade
       that forgot to rotate with its foot (measured, Sep 4) exports
       watertight and as one piece and passes everything else. */
    rootRow: { C: rows[footS.length].C, N: rows[footS.length].N, flat: form === null, tiltRad: tilt, u: rows[footS.length].u, curlRad: form ? form.curlRad : 0, ringC: rows[footS.length - 1].C },
    domeGuardResidual,
    spine,
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
   buildHubInto — the derived junction. PLUMBING, not a designed centre
   (phase 2 B2 owns the reproductive parts; conflating the two cost the
   flower several cycles, and the A/B centre rig that stood in for them is
   retired as of session 20).

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
  /* THE DOMED SHELL (Sep 4) — the flat slab BENT, not a solid boss: the
     mid-surface is footRing()'s cap, the two faces are its normal offsets
     by t/2 (concentric spheres of radius Rd +/- t/2), the rim is the band
     between them at the rim's polar angle. Thickness t everywhere, so J4a's
     hub-thickness-equals-foot-thickness stays an EQUALITY; the feet sit
     inside it with their faces coincident with its faces exactly as they
     sit in the slab today; and from below it reads as a bowl, which is what
     lets the crowding sheet tell a domed base from a flat one. A solid dome
     was costed and set aside: it would be the loudest thing under a tight
     mum and its underside is indistinguishable from the flat disc.
     Rings and apex: the designed DOME centre's own construction — the apex
     is an explicit fan, never a ring shrunk to radius 0 (that emitted 48
     degenerate triangles per dome, measured). The flat path below is
     verbatim. Returns what it built, so J3 can compare the hub's OWN sphere
     against the feet rather than trusting that the builder read the owner. */
  const dome = ring.dome;
  /* THE CLOSED SPHERE (session 18) — two concentric spheres, Rd +/- t/2,
     each closed by an EXPLICIT apex fan at BOTH poles, and NO rim band. The
     cap arm's rim band at a rim angle of 180 degrees would be 48 coincident
     points — the DOME centre's 48-degenerate-triangle defect (watertight and
     wrong, measured Sep 1) — which is why this is an arm and not the cap arm
     handed pi. Latitude steps: twice the cap's ring count over the whole
     sphere, so a hemisphere of it facets exactly as the cap does. Thickness
     t everywhere, so J4a stays an equality; the feet sit inside it with
     their faces coincident with its faces exactly as in the cap. Triangle
     count: 2N(M-1) per sphere, 6,720 for the pair at N 48, M 36 — the hub's
     count is a three-valued branch now (192 flat / 3,456 cap / 6,720
     sphere), asserted by the panel gate, never a ramp. Returns what it
     built, `closed` included, so S2 compares the owner's declaration
     against the builder's own report rather than trusting the read. */
  if (dome && dome.closed) {
    const Rd = dome.Rd, cz = dome.centreZ, M = 2 * HUB_DOME_RINGS;
    const ringAt = (rad, phi) => Array.from({ length: N }, (_, k) => { const th = (k * TAU) / N; return [rad * Math.sin(phi) * Math.cos(th), rad * Math.sin(phi) * Math.sin(th), cz + rad * Math.cos(phi)]; });
    const sphereInto = (rad, outward) => {
      const apexN = [0, 0, cz + rad], apexS = [0, 0, cz - rad];
      let upper = ringAt(rad, Math.PI / M);
      for (let k = 0; k < N; k++) { const k2 = (k + 1) % N; if (outward) acc.tri(upper[k], upper[k2], apexN); else acc.tri(upper[k2], upper[k], apexN); }
      for (let i = 2; i < M; i++) {
        const lower = ringAt(rad, (i * Math.PI) / M);
        for (let k = 0; k < N; k++) { const k2 = (k + 1) % N; if (outward) acc.quad(lower[k], lower[k2], upper[k2], upper[k]); else acc.quad(lower[k2], lower[k], upper[k], upper[k2]); }
        upper = lower;
      }
      for (let k = 0; k < N; k++) { const k2 = (k + 1) % N; if (outward) acc.tri(upper[k2], upper[k], apexS); else acc.tri(upper[k], upper[k2], apexS); }
    };
    const before = acc.triangleCount;
    sphereInto(Rd + t / 2, true);
    sphereInto(Rd - t / 2, false);
    return { dome: { Rd, centreZ: cz, H: dome.H, closed: true, rimPhi: Math.PI, thickness: t, outerRadius: Rd + t / 2, innerRadius: Rd - t / 2 }, tris: acc.triangleCount - before };
  }
  if (dome) {
    const Rd = dome.Rd, cz = dome.centreZ, K = HUB_DOME_RINGS;
    const phiRim = Math.asin(Math.min(1, ring.radius / Rd));
    const ringAt = (rad, phi) => Array.from({ length: N }, (_, k) => { const th = (k * TAU) / N; return [rad * Math.sin(phi) * Math.cos(th), rad * Math.sin(phi) * Math.sin(th), cz + rad * Math.cos(phi)]; });
    const cap = (rad, outward) => {
      let lower = ringAt(rad, phiRim);
      for (let i = 1; i < K; i++) {
        const upper = ringAt(rad, phiRim * (1 - i / K));
        for (let k = 0; k < N; k++) { const k2 = (k + 1) % N; if (outward) acc.quad(lower[k], lower[k2], upper[k2], upper[k]); else acc.quad(lower[k2], lower[k], upper[k], upper[k2]); }
        lower = upper;
      }
      const apex = [0, 0, cz + rad];
      for (let k = 0; k < N; k++) { const k2 = (k + 1) % N; if (outward) acc.tri(lower[k], lower[k2], apex); else acc.tri(lower[k2], lower[k], apex); }
    };
    const before = acc.triangleCount;
    cap(Rd + t / 2, true);
    cap(Rd - t / 2, false);
    const top = ringAt(Rd + t / 2, phiRim), bot = ringAt(Rd - t / 2, phiRim);
    for (let k = 0; k < N; k++) { const k2 = (k + 1) % N; acc.quad(top[k], bot[k], bot[k2], top[k2]); }
    return { dome: { Rd, centreZ: cz, H: dome.H, closed: false, rimPhi: phiRim, thickness: t, outerRadius: Rd + t / 2, innerRadius: Rd - t / 2 }, tris: acc.triangleCount - before };
  }
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
  return { dome: null, tris: N * 4 };
}

/* ===================================================================
   THE ANDROECIUM BUILDERS (session 21) — one stamen: a closed filament tube
   rooted through the slab, and a closed PILL anther on its tip. Two closed
   solids that overlap (the tube's last ring sits inside the pill's lower
   hemisphere; its first ring sits inside the hub slab) — the export contract
   exactly as the feet satisfy it.

   THE ROOT AXIS IS THE OWNER'S NORMAL THROUGH THE FULL SLAB (JS1): the
   centreline starts on the shell's INNER face, runs along the cap's normal
   `Up` to the OUTER face — a straight cylinder of diameter d and height t, so
   the overlap with the slab is a solid and never a hairline (JS3) — and the
   free filament leaves the outer face along spineLaw() at TILT 0 in the
   (Up, -Rs) plane: at curl 0 every substep of the law is `cos(0) * ds` along
   Up and `sin(0) * ds = 0` across, so the straight rod IS the law's own
   zero-curvature branch (Q3), and positive curl bends the filament INWARD over
   the centre — the petal spine's own sign. Tilt is 0 with the axes mapped,
   not pi/2 on the petal's axes, for exactly that exactness: cos(pi/2) is
   6e-17, not 0.

   The tube's ring frame is (T, D x T) — T the azimuthal tangent, constant
   along a planar curve, so the frame never twists and never degenerates. The
   pill is a surface of revolution about the tip direction with EXPLICIT apex
   fans at both poles (a ring shrunk to radius 0 emitted 48 degenerate
   triangles per dome, measured Sep 1). Both go through one emitter.
   =================================================================== */
function revolveInto(acc, rings, south, north) {
  const NS = STAMEN_SIDES;
  const pts = rings.map(({ C, e1, e2, r }) => Array.from({ length: NS }, (_, j) => {
    const a = (j * TAU) / NS, ca = Math.cos(a), sa = Math.sin(a);
    return [C[0] + r * (e1[0] * ca + e2[0] * sa), C[1] + r * (e1[1] * ca + e2[1] * sa), C[2] + r * (e1[2] * ca + e2[2] * sa)];
  }));
  for (let j = 0; j < NS; j++) { const j2 = (j + 1) % NS; acc.tri(south, pts[0][j2], pts[0][j]); }
  for (let k = 0; k < pts.length - 1; k++) for (let j = 0; j < NS; j++) { const j2 = (j + 1) % NS; acc.quad(pts[k][j], pts[k][j2], pts[k + 1][j2], pts[k + 1][j]); }
  const last = pts[pts.length - 1];
  for (let j = 0; j < NS; j++) { const j2 = (j + 1) % NS; acc.tri(north, last[j], last[j2]); }
  return pts;
}

export function buildStamenInto(acc, andro, s, slot) {
  const t = andro.thickness, rf = andro.rFil;
  const cosA = Math.cos(slot.azimuth), sinA = Math.sin(slot.azimuth);
  const R = [cosA, sinA, 0], T = [-sinA, cosA, 0];
  /* The foot's own frame on the cap — buildPetalInto's (Rs, Up), verbatim. */
  const Rs = [R[0] * Math.cos(s.slope), R[1] * Math.cos(s.slope), -Math.sin(s.slope)];
  const Up = [R[0] * Math.sin(s.slope), R[1] * Math.sin(s.slope), Math.cos(s.slope)];
  const P = [R[0] * s.radius, R[1] * s.radius, s.z];                       // the owner's surface point
  const off = (h) => [P[0] + Up[0] * h, P[1] + Up[1] * h, P[2] + Up[2] * h];
  const inner = off(-t / 2), outer = off(t / 2);
  const law = spineLaw({ curlRad: andro.curlRad, bias: 0, start: 0, length: andro.length, tilt: 0, floorRadius: andro.diameter });
  const at = (sArc) => {
    const q = law.at(sArc), c = Math.cos(q.phi), sn = Math.sin(q.phi);
    return { C: [outer[0] + Up[0] * q.dR - Rs[0] * q.dZ, outer[1] + Up[1] * q.dR - Rs[1] * q.dZ, outer[2] + Up[2] * q.dR - Rs[2] * q.dZ],
             D: [Up[0] * c - Rs[0] * sn, Up[1] * c - Rs[1] * sn, Up[2] * c - Rs[2] * sn] };
  };
  const ring = (C, D, r) => ({ C, e1: T, e2: [D[1] * T[2] - D[2] * T[1], D[2] * T[0] - D[0] * T[2], D[0] * T[1] - D[1] * T[0]], r });
  const stations = [ring(inner, Up, rf), ring(outer, Up, rf)];
  for (let k = 1; k <= STAMEN_ROWS; k++) { const q = at((k / STAMEN_ROWS) * andro.length); stations.push(ring(q.C, q.D, rf)); }
  const before = acc.triangleCount;
  const tubePts = revolveInto(acc, stations, inner, stations[stations.length - 1].C);
  /* THE PILL: lower hemisphere centred ON the tip (the tube's last ring is
     inside it), a cylinder, the upper hemisphere, apex fans at both poles. */
  const tip = stations[stations.length - 1], a = andro.anther.diameter / 2, Lc = andro.anther.length - 2 * a;
  const D = at(andro.length).D;
  const along = (h) => [tip.C[0] + D[0] * h, tip.C[1] + D[1] * h, tip.C[2] + D[2] * h];
  const pill = [], K = ANTHER_CAP_RINGS;
  for (let k = 1; k <= K; k++) { const al = (k / K) * (Math.PI / 2); pill.push(ring(along(-a * Math.cos(al)), D, a * Math.sin(al))); }
  pill.push(ring(along(Lc), D, a));
  for (let k = 1; k < K; k++) { const be = (k / K) * (Math.PI / 2); pill.push(ring(along(Lc + a * Math.sin(be)), D, a * Math.cos(be))); }
  const apex = along(Lc + a);
  revolveInto(acc, pill, along(-a), apex);
  /* WHAT WAS EMITTED, for the gate: the root axis (JS1), the surface point
     (JS2), the two root rings AS EMITTED (JS3), the apex (JS4). */
  return { index: slot.index, azimuth: slot.azimuth, root: P, N: Up, inner, outer, rootRings: [tubePts[0], tubePts[1]], tip: tip.C, dir: D, apex, tris: acc.triangleCount - before,
           law: { turnAskedDeg: andro.curlDeg, turnBuiltDeg: law.turnBuilt / D2R, peakRadiusMm: law.peakRadius, underFloor: law.underFloor, clamped: law.clamped, floorRadius: andro.diameter } };
}

/* ===================================================================
   THE DESIGNED CENTRE WAS HERE — buildCenterInto() with its DOME / DISC / RING
   arms (domeInto, discInto, torusInto: 1,728 / 1,056 / 2,304 triangles, seated
   an eighth of a slab below the hub's underside) — and it is RETIRED (session
   20, Eva's ruling Sep 5, phase 2 B1). The centre is the reproductive parts and
   nothing else; DISC and DOME were placeholders for a surface (HEAD's) and for
   covering the junction (the junction's, never a control), and RING was a torus
   standing in for a corona, which is a flared collar between petals and stamens
   and will be its own group with its own controls. Its five control ids are
   reserved in bloom-registry.js's RETIRED_IDS. The androecium and gynoecium
   that replace it are phase 2 B2 and root through footRing() like the feet.

   WHAT THE DELETION PROVES, said in the builder's own old words: "DELETE THIS
   FUNCTION AND THE BLOOM IS STILL ONE CONNECTED SOLID. The centre contributes
   nothing to the invariant." The hub below is the whole junction. The byte
   argument for every pre-existing export follows from the same fact and is
   MEASURED at the close, row by row, against each row's centre-off twin on the
   old tree (docs/bloom-session-20-outcome.md, "the comparison shape").
   =================================================================== */
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
  const hubBuilt = buildHubInto(acc, state, fr.hub);    // unconditional — the invariant's plumbing
  /* THE ANDROECIUM (session 21) — read from the descriptor, placed through
     the arrangement primitive's EXISTING azimuth arms (RING: the RADIAL law;
     DISC: SPIRAL's golden angle over the Vogel radii the owner stamped), one
     closed filament and one closed pill per stamen. Absent when the
     descriptor is null — count 0, or SPHERE, where it is hidden and inert.
     `freeEnds` is the builder's own tally, JS4's independent quantity. */
  const stamens = [];
  let freeEnds = 0;
  if (fr.androecium) {
    const A = fr.androecium;
    buildWhorlInto({
      count: A.count,
      radius: (i) => A.stamens[i].radius,
      height: 0,
      sizeRamp: () => 1,
      angleRamp: () => 0,
      phase: 0,
      placement: A.layout === 'DISC' ? 'SPIRAL' : 'RADIAL',
      blade: (slot) => { stamens.push(buildStamenInto(acc, A, A.stamens[slot.index], slot)); freeEnds++; },
    });
  }
  /* THE TWO DISTANCE FLAGS (Q8, flags never gates): the nearest pair of ROOTS
     (surface points, a chord on the dome) against the filament diameter, and
     the nearest pair of ANTHER APEXES against the pill's — stamen-on-stamen
     and tip-to-tip in their simplest form. All pairs, no chosen neighbours:
     the golden angle's tightest approaches sit at Fibonacci index gaps. */
  const nearest = (pts) => { let mm = Infinity, pair = null; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1], pts[i][2] - pts[j][2]); if (d < mm) { mm = d; pair = [i, j]; } } return { mm, pair }; };
  const stamenNearest = stamens.length > 1 ? { root: nearest(stamens.map((s) => s.root)), apex: nearest(stamens.map((s) => s.apex)) } : null;
  return { ring: fr.rings[0], rings: fr.rings, hub: fr.hub, hubBuilt, foot: fr, petal: petals[0], petals, petalsBuilt, slotAzimuths, androecium: fr.androecium, stamens, freeEnds, stamenNearest };
}
