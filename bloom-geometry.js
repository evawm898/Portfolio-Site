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
/* THE ANTHER'S TWO PROPORTIONS — constants until session 29, and now the
   DEFAULTS of `antherSize` and `antherElongation` (Q8: `size` becomes a real
   slider, superseding ANTHER_DIAMETER_FACTOR, because points are unreachable
   on a 1.92 mm anther and without it the sharp end of the range is
   decorative). They stay HERE, exported, and the registry reads them for its
   defaults: one owner for the shipping proportion, so the control cannot
   drift from the number every earlier export was built at. The gynoecium's
   lobe still reads them directly — the stigma's own seven are session 30. */
export const ANTHER_DIAMETER_FACTOR = 1.6;
export const ANTHER_LENGTH_FACTOR = 2.5;
/* Mesh resolution — FIXED, so topology depends on no slider and the export
   gate's live-equals-export count holds: STAMEN_SIDES around every tube and
   tip ring, STAMEN_ROWS stations along the free filament, TIP_CAP_RINGS per
   hemisphere of the tip. 560 triangles per stamen, 67,200 at 120. */
export const STAMEN_SIDES = 10;
export const STAMEN_ROWS = 16;
export function androeciumEligible(state) { return !sphereMode(state); }

/* ===================================================================
   THE GYNOECIUM (session 22, phase 2 B3 — Eva's rulings, carried, not
   re-derived). The style: ONE rod, one sheet thick, rooted THROUGH the hub
   slab ON THE AXIS — count 1, radius 0, the apex, where every cap's normal
   is exactly +z — curved by spineLaw() at a curl of 0 as the identity
   exactly as the filament is (the rod is ONE helper both builders call,
   rodInto, extracted VERBATIM from the stamen builder), tipped with ONE
   stigma shape — the TRIFID (S2, FIXED: not an enum, not a control). S4
   BILOBED is retired from the candidate set permanently; S3 PAD is a later
   value addition if a second is ever wanted; S1 KNOB is dropped (Phase A:
   easy to lose against 120 pills). The descriptor is footRing()'s THIRD
   KIND (`fr.gynoecium`), sharing the dome object and surfaceAt() with the
   rings and the androecium; the builder reads it and computes nothing.

   THE TRIFID IS THREE TIPS SHARING THE TIP. Each lobe is the anther's own
   solid (tipInto — one emitter, one vocabulary) whose lower cap is
   centred ON the style's tip, so the rod's last ring is
   inside every lobe exactly as it is inside an anther, aimed
   STIGMA_LOBE_SPREAD_DEG off the tip direction toward three azimuths a
   third of a turn apart. A lobe's proportions are the anther's own two
   factors (ANTHER_DIAMETER_FACTOR across the style, ANTHER_LENGTH_FACTOR of
   its own diameter long), so the trifid and the pill read on ONE scale
   beside each other — the pair the sheet puts in front of Eva. Two
   constants of its own (the lobe count and the spread), never controls.

   Ships ABSENT: `gynoecium` defaults to NONE, so 0 moved is by
   construction. HIDDEN AND INERT UNDER SPHERE on the androecium's ruling,
   verbatim (a full-sphere bloom is a flower head; its reproductive parts
   belong to its florets): this function is the geometry's statement,
   `PREDICATES.gynoeciumEligible` in the registry is the twin that HIDES,
   the harness asserts the two agree at module load, the gates per row, and
   the GATED matrix rows prove the style at maximum under SPHERE
   byte-identical to the bare sphere. */
/* THE TRIFID'S TWO NUMBERS — the DEFAULTS of `stigmaLumps` and `stigmaSpread`
   since session 30 (they were constants read by footRing() from session 22 to
   29), imported by the registry so the default and the constant cannot drift,
   and asserted paired at harness load. */
export const STIGMA_LOBES = 3;
export const STIGMA_LOBE_SPREAD_DEG = 40;
export function gynoeciumEligible(state) { return !sphereMode(state); }

/* ===================================================================
   THE TIP (session 26 — Eva's rulings of Sep 6, carried, not re-derived).
   THE ONE OWNER OF A TIP'S GEOMETRY. An anther is ONE tip; the trifid
   stigma is THREE of them sharing a style's tip; `pillInto` is retired
   into `tipInto` below and there is no second emitter. Nothing here is a
   control yet — the seven sliders are sessions 3 and 4 — so every value
   below is hard-wired at TODAY'S EQUIVALENT and the migration is a byte
   event, not a feature.

   THE OUTLINE LAW (Q1), one exponent, in the tip's CROSS-SECTION:

       h(u) = (|cos(n u / 4)|^s + |sin(n u / 4)|^s)^(-1/s)
       f(u) = roundedness + (1 - roundedness) * h(u)

   `n` is the symmetry order (TIP_LOBES) and `s` the exponent. THE EXPONENT
   IS DERIVED FROM THE PINCH, NEVER CARRIED BY A CONTROL (session 31, Eva's
   ruling): `s = 2 / (1 + k)`, `tipExponent()` below the one owner, where
   `k` is the pinch the slider carries. One number sweeps rounded polygon
   (k below 1) -> polygon (k = 1, the exact |cos| + |sin| family) -> star
   (k above 1), and the waist — the narrowest radius as a fraction of the
   point's — is `2^(-k/2)`: every 2.00 of pinch halves it. The circle is
   NOT on the travel: `s = 2` is a SINGULAR POINT of the law (h is exactly 1
   at every azimuth, so roundedness and the point count are inert there —
   sessions 29 and 30 each met it in a different instrument), and it sits at
   k = 0, one step BELOW TIP_PINCH_RANGE[0]. ROUNDEDNESS IS THE ONLY
   PRODUCER OF THE CIRCLE and the pinch is inert there — the curl-bias
   precedent, hidden and inert, and here it is inert IN THE ARITHMETIC: at
   roundedness 1 the blend is `1 + 0 * h`, which is exactly 1 in IEEE-754
   for any finite h, so `r * f === r` and the pill's radius arithmetic is
   untouched. That is the whole byte-identity argument for the anther, and
   it is a construction rather than a hope; tools/verify-bloom-tip-bytes.mjs
   is what measures it.

   WHAT WAS GIVEN UP WITH THE OLD `sharpness` (Eva, session 31, a deliberate
   loss with the shape named): the exponent's far half, `s > 2`, which
   pinched at the OTHER azimuth — at three or four points it is a half-step
   ROTATION of the polygon and a visibly different shape, not only a second
   path to the rounded polygon. A rotation living inside a sharpness dial is
   two things in one control; if it is wanted later it returns as its own
   PHASE control, never as the far half of this one. The old control also
   ran backwards from its label (8 was the bulge, 0.25 the star); the pinch
   reads the way it behaves. `antherSharpness` / `stigmaSharpness` are in
   RETIRED_IDS.

   NO SELF-INTERSECTION INSTRUMENT, EVER (Q6) — the ranges are bounded so
   the outline CANNOT invert, and a law that cannot turn inside out needs
   no check that it hasn't. f(u) is a RADIAL GRAPH about the tip's axis, so
   it is simple iff it is strictly positive. f is a convex combination of 1
   and h, so f >= min(1, h); and h is bounded below by 2^(-k/2) (the worst
   azimuth is 45 degrees), so with the pinch bounded ABOVE at
   TIP_PINCH_RANGE[1] = 7 the floor is 2^(-3.5) = 0.0884 > 0 — which is the
   measured worst case over the shipped side count, exactly, and the same
   bound the old range's floor of 0.25 gave (0.25 is 2 / (1 + 7)). The BOUND
   is what makes the claim, and `tipOutline()` clamps rather than trusting
   its caller.

   TODAY'S EQUIVALENT IS THE CIRCLE BY ROUNDEDNESS ALONE: roundedness 1
   makes the blend exactly 1 whatever h is, so a mutation that dropped the
   blend would still land on a circle to within rounding, which is why the
   gate asserts the emitted FACTORS are exactly 1 rather than asserting the
   picture looks round. */
export const TIP_CAP_RINGS = 5;
export const TIP_LOBES = 4;
export const TIP_ROUNDEDNESS = 1;
/* THE PINCH RANGE (session 31). The MINIMUM is one step above the singular
   point on purpose — 0 is the circle, and the circle is roundedness 1's —
   so no reachable pinch makes every factor 1 below roundedness 1, and the
   two instruments that once needed a special case there (the JS6/JG5
   exemption, the read-out's "circle's own exponent" branch) are gone rather
   than papered over. At the minimum the outline differs from a circle by
   1.7% of radius, which every gate sees at 1e-12. The MAXIMUM is the old
   floor of 0.25 exactly (k = 2 / 0.25 - 1 = 7), so the star end is where it
   was. */
export const TIP_PINCH_RANGE = Object.freeze([0.05, 7]);
export const TIP_LOBES_RANGE = Object.freeze([2, 12]);
/* THE ELONGATION FLOOR (Q5), not an ellipsoid. At an elongation of exactly
   1 the tip is a true sphere: the cylinder band between the two
   hemispheres has zero height and every triangle in it has zero area. An
   ellipsoid is the more correct shape and MOVES THE PILL; a floor keeps it
   byte-identical, and the difference between a hundredth-of-a-radius band
   and none is invisible. No second partition for something nobody can see.
   Expressed on the BAND because that is the degenerate quantity: the band
   is at least TIP_BAND_FLOOR of the tip's own radius, which is an
   elongation floor of 1.005. Inert today — the shipping anther's band is
   3.00 radii — and Math.max returns its larger argument unchanged, so the
   floor costs no byte. */
export const TIP_BAND_FLOOR = 0.01;
/* THE SHAPE WAS A FROZEN OBJECT HERE (`TIP_SHAPE`, sessions 26-29) — the
   stigma's hard-wired outline while the anther's was a control. RETIRED in
   session 30: both tips now read their seven from the state through ONE
   function, `tipDescriptor()` below, so "they cannot drift" is a property of
   the code path rather than of a shared literal, and TIP_SHARPNESS (the
   circle's own exponent 2.00 — the singular point, off the travel entirely
   since session 31) has no reader left. Nothing may import either name. */
/* THE REMAINING FIVE RANGES (session 29) — the two proportions, the two that
   aim the lumps, and roundedness. Beside TIP_PINCH_RANGE and
   TIP_LOBES_RANGE above, these are the ONE OWNER of every tip control's
   bounds; the registry reads them for its `min`/`max` and the harness asserts
   the two agree at module load, the MAX_LAYERS move. A range restated in the
   registry is a range that drifts, and here the bound is what discharges Q6
   (no self-intersection instrument, ever). */
/* THE TIP FAMILY'S SHIPPING PINCH — 1.00, THE POLYGON, for BOTH tips. The
   value is the one derived in sessions 29 and 30 for the old `sharpness`
   (where it was also 1.00: s = 2 / (1 + 1) = 1, the SAME exponent, exactly,
   so the default matrix holds by construction), and the derivation is
   unchanged because it was always about the WAIST: at pinch 1 the waist is
   2^(-1/2) = 0.707 of the point radius — 0.679 mm at roundedness 0 on the
   default 0.96 mm tip, 36% clear of the 0.50 mm floor, and 13% clear on the
   thinnest sheet the export floors to 1.00 mm (a 0.80 mm tip: 0.566 mm),
   which is why 1.00 and not 1.65 (the old 0.75: 8%, and CLAMPED on that
   sheet). A NAMED value rather than a tuned one — the exact |cos| + |sin|
   family, straight-sided in the 4-fold base — and at the default point
   count of four it pinches at the diagonals, which is the tetrasporangiate
   anther: four pollen sacs with grooves between them.

   WHAT IT IS NO LONGER: "1.00 and not the circle's own 2.00" (session 29's
   framing). The circle is not on this travel at all, so the default is not
   chosen AWAY from anything — it is chosen for its waist headroom, which is
   the part of the session-29 ruling that was always load-bearing.

   THE STIGMA'S DEFAULT WAS RE-DERIVED, NOT COPIED (session 30, Eva's
   instruction: "a trifid lobe is a different size, so the floor binds at a
   different sharpness"). The premise was CHECKED and does not hold on this
   tree: a stigma lobe is `stigmaSize * thickness` with the size defaulting to
   ANTHER_DIAMETER_FACTOR, and the style is one sheet thick exactly as the
   filament is (partRadius is the ONE owner of both), so the lobe radius IS
   the anther's — 0.96 mm on the default 1.20 mm sheet, in BOTH modes, since
   the export floor only raises a sheet under MIN_FEATURE_MM — at every sheet
   thickness. The floor `k <= -2 log2((need - rho) / (1 - rho))` is a
   function of that radius and roundedness alone, so it binds at the SAME
   pinch on both tips: above 1.88 at rho 0 on the default sheet. It is ONE
   constant because it is one derivation on one radius — a second constant
   with the same value would be the drift session 30 exists to make
   impossible. A different stigma value is one per-instance default in the
   registry's tip table the day Eva rules it.

   IT MOVES NO BYTE ON EITHER TIP at the shipping roundedness of 1 (the
   blend is exactly 1 and tipSides() returns the rod's own lattice), and
   NONE below it either where the old value was 1.00: the exponent is the
   same double. The harness asserts BOTH registries' defaults against this
   one constant at module load. */
export const TIP_PINCH_DEFAULT = 1;
export const TIP_SIZE_RANGE = Object.freeze([0.6, 6]);
export const TIP_ELONGATION_RANGE = Object.freeze([1, 6]);
export const TIP_ROUNDEDNESS_RANGE = Object.freeze([0, 1]);
export const TIP_LUMPS_RANGE = Object.freeze([1, 6]);
export const TIP_SPREAD_DEG_RANGE = Object.freeze([0, 90]);
/* THE WAIST FLOOR, ON THE PINCH (Eva's ruling, Sep 6; re-based on the
   pinch in session 31) — R_min = MIN_FEATURE_MM / 2 = 0.50 mm, and it
   carries `UNMEASURED — no coupon has been printed` verbatim wherever it is
   printed, because 0.50 mm is an assumption about SLS and NOTHING IN THIS
   PROJECT HAS BEEN PRINTED. It is the sheet's own floor and the spine's own
   discipline: full range, CLAMPED, TOLD.

   WHAT IT BOUNDS, said rather than implied: the WAIST — the narrowest radius
   anywhere on the emitted outline, `a * min_j f_j`. The law pinches inward
   at the diagonals (h dips to 2^(-k/2) < 1) and that waist is what a star's
   points hang off; at pinch 7 on the shipping anther it is 0.085 mm, a
   hairline. It does NOT bound the included ANGLE of a point, which is the
   other thing a printer would care about and which no number here is
   derived from. Two claims, one measured, one absent.

   CLOSED FORM, and it is a CAP on the PINCH because the pinch is the only
   control that makes the waist: f_min = rho + (1 - rho) h_min(k), so with
   `need = R_min / a` the requirement h_min >= m = (need - rho)/(1 - rho)
   becomes k <= -2 log2 m. (The old floor on the exponent, s >= 1 / (1/2 -
   log2 m), is this line through s = 2 / (1 + k) — bit-identical on a
   1,528-point sweep of radius and roundedness, measured, since scaling by 2
   commutes with rounding.) Three corners, all told and none refused:
   rho >= need needs no clamp at all (the blend's own floor already clears
   it — the DEFAULT's arm, where rho is exactly 1 and no arithmetic runs);
   need > 1 means the whole tip is thinner than the floor and no pinch saves
   it (`underFloor` on the descriptor, the crosses-axis precedent); and
   everything between clamps DOWNWARD to `kMax`, which is >= 0 by
   construction, so the clamp can never push a shape past the circle.

   THE SAMPLED MINIMUM IS THE CONTINUOUS ONE, not an approximation of it:
   tipSides() makes the lattice n*k with k EVEN, so a sample lands on u = 0
   and on u = pi/n — the law's two extrema — and `a * min_j f_j` over the
   EMITTED factors equals `a * (rho + (1-rho) h_min)` exactly. JS7 asserts
   that equality against the emitted outline rather than trusting it. */
export const TIP_MIN_RADIUS_MM = MIN_FEATURE_MM / 2;
export function tipPinchFloor(a, roundedness, pinch) {
  const rho = clamp(roundedness, TIP_ROUNDEDNESS_RANGE[0], TIP_ROUNDEDNESS_RANGE[1]);
  const asked = clamp(pinch, TIP_PINCH_RANGE[0], TIP_PINCH_RANGE[1]);
  const need = TIP_MIN_RADIUS_MM / a;
  if (!(need > rho)) return { pinch: asked, asked, waist: a * (rho + (1 - rho) * tipWaistFactor(asked)), floored: false, underFloor: false };
  if (need > 1) return { pinch: asked, asked, waist: a * (rho + (1 - rho) * tipWaistFactor(asked)), floored: false, underFloor: true };
  const m = (need - rho) / (1 - rho);
  const kMax = -2 * Math.log2(m);
  const built = asked > kMax ? kMax : asked;
  return { pinch: built, asked, waist: a * (rho + (1 - rho) * tipWaistFactor(built)), floored: built !== asked, underFloor: false };
}
/* h's own minimum over the azimuth — 2^(-k/2) at the 45-degree worst case,
   which is where the law pinches. ONE owner, read by the floor and by the
   read-out. */
export function tipWaistFactor(pinch) {
  const k = clamp(pinch, TIP_PINCH_RANGE[0], TIP_PINCH_RANGE[1]);
  return Math.pow(2, -k / 2);
}
/* THE EXPONENT FROM THE PINCH — the one place `s = 2 / (1 + k)` is formed.
   Exact where it matters: pinch 1 is exponent 1, pinch 3 is 0.5, pinch 7 is
   0.25 (the old range's floor), so every shape the old control reached at
   those values is reached at the same double. */
export function tipExponent(pinch) {
  return 2 / (1 + clamp(pinch, TIP_PINCH_RANGE[0], TIP_PINCH_RANGE[1]));
}
/* THE TIP'S OWN LATTICE (session 29) — how many sides the tip is revolved
   through, and the OUTLINE is its one owner: `revolveInto` reads the array's
   length rather than a constant, so a shape and its tessellation cannot
   disagree.

   WHY IT IS NOT STAMEN_SIDES ANY MORE, measured rather than argued. The tip
   ships on a 10-gon, and the outline law's extrema sit at 2n azimuths (n
   points and n valleys). Ten samples land on all of them for n = 5 and for
   NO OTHER point count in the range — a triangle sampled at 36 degrees is an
   irregular blob, and `number of points` would be a control that only tells
   the truth at one of its eleven values. So the lattice is n * k with k EVEN
   and at least 2 (a sample at every point AND every valley) and the whole at
   least STAMEN_SIDES: 10 sides at n = 5, 12 at n = 2, 3 and 6, up to 24 at
   n = 12.

   A CIRCLE HAS NO LOBES, so at roundedness exactly 1 the lattice is the rod's
   own STAMEN_SIDES whatever the point count says. That is not a special case
   bolted on for the bytes — it is the same statement as the outline's, where
   `1 + 0 * h` is exactly 1 — and it is what makes the point count and the
   pinch INERT at roundedness 1 rather than merely invisible: with the
   factors exactly 1 AND the lattice fixed, the emitted tip is independent of
   both, which JS7 asserts as a property. It is also the whole byte-identity
   argument for the shipping anther, whose roundedness default is 1.

   THIS ARM IS THE CIRCLE'S OWN LATTICE LAW AND NOT A SINGULARITY PATCH
   (Eva, session 31, correcting her own count of the singularity's sites
   from three to two). It is keyed on ROUNDEDNESS 1, not on the exponent; it
   only LOOKED like a patch while the singular exponent was reachable,
   because there leaving roundedness 1 jumped the lattice 10 -> 16 with no
   form change. With that exponent off the travel, leaving roundedness 1
   always changes the form, so the sides are always earned. Deleting the arm
   was costed and refused: every row with a tip at roundedness 1 moves (79
   live, 59 of phase19) for 60% more triangles per tip. */
export function tipSides(shape) {
  if (clamp(shape.roundedness, TIP_ROUNDEDNESS_RANGE[0], TIP_ROUNDEDNESS_RANGE[1]) === 1) return STAMEN_SIDES;
  const n = Math.round(clamp(shape.lobes, TIP_LOBES_RANGE[0], TIP_LOBES_RANGE[1]));
  return n * 2 * Math.ceil(STAMEN_SIDES / (2 * n));
}
/* TRIANGLES PER TIPPED ROD — a rod (the tube: STAMEN_ROWS + 1 bands and two
   fan caps) plus `lumps` tips (each 2 * TIP_CAP_RINGS - 1 bands and two apex
   fans). A FUNCTION OF THE LUMP COUNT and no longer two constants: a stamen
   is one lump, the trifid is three, and session 4 makes the stigma's count a
   control — so a constant would be a number that stops being true without
   anything failing. JS4 and JG4 both compare an EMITTED count (the
   accumulator's own delta) against this ONE owner, each called with the
   count its own owner declares. */
export function tippedRodTris(lumps, sides = STAMEN_SIDES) {
  return ((STAMEN_ROWS + 1) * STAMEN_SIDES * 2 + 2 * STAMEN_SIDES) + lumps * ((2 * TIP_CAP_RINGS - 1) * sides * 2 + 2 * sides);
}
/* THE OUTLINE, evaluated ONCE per tip and indexed by SIDE — the same factor
   applies at every ring, which is what makes the tip a scaled radial graph
   rather than a per-ring shape. Clamped here, so no caller can hand the law
   a parameter that inverts it. */
export function tipOutline(shape, sides = tipSides(shape)) {
  const rho = clamp(shape.roundedness, 0, 1);
  const sh = tipExponent(shape.pinch);
  const n = Math.round(clamp(shape.lobes, TIP_LOBES_RANGE[0], TIP_LOBES_RANGE[1]));
  const out = new Array(sides);
  for (let j = 0; j < sides; j++) {
    const q = (n * ((j * TAU) / sides)) / 4;
    const h = Math.pow(Math.pow(Math.abs(Math.cos(q)), sh) + Math.pow(Math.abs(Math.sin(q)), sh), -1 / sh);
    out[j] = rho + (1 - rho) * h;
  }
  return out;
}

/* THE TIP DESCRIPTOR — THE ONE OWNER OF "THE SEVEN CONTROLS BECOME A TIP"
   (session 30, Eva's Q7: seven descriptors authored once, instanced twice).
   footRing() calls this ONCE for the anther (`prefix` 'anther', on the
   filament's diameter) and ONCE for the stigma's lobe (`prefix` 'stigma', on
   the style's), and NOTHING else computes a tip's size, length, shape,
   floor, lattice, count or spread. The registry's tip table generates the
   fourteen controls from one spec with the same two prefixes; the harness's
   `tipSevenClauses` asserts this record against those controls under one
   statement per tip (JS7, JG6). One table, one owner, one witness: an
   instance that drifted from the other has nowhere to drift IN.

   THE EXPRESSIONS ARE THE CONSTANTS' OWN, TERM FOR TERM, on both tips.
   `size * diameter` is where `ANTHER_DIAMETER_FACTOR * diameter` stood and
   `elongation * size * diameter` where `ANTHER_LENGTH_FACTOR *
   ANTHER_DIAMETER_FACTOR * diameter` stood — the same two products in the
   same order on the same doubles, because algebraically identical is not
   bit-identical and `(e * s) * d` is not `e * (s * d)`. `spread * D2R` is
   where `STIGMA_LOBE_SPREAD_DEG * D2R` stood. With the defaults reading
   exactly 1.6, 2.5, 3 and 40 the trifid is byte-identical BY CONSTRUCTION
   (session 29's argument for the anther, verbatim), and phase19 on both
   trees measures it anyway.

   THE FLOOR IS ON THE WAIST AND IT IS TOLD, NEVER REFUSED — the spine curl's
   discipline; `tipPinchFloor` is its one owner and what it does not
   bound is in its own header. At the shipping roundedness of exactly 1 the
   `rho >= need` arm returns with no arithmetic done, so the pinch comes
   back the asked value unchanged — and is INERT, because the blend is
   exactly 1 there and the lattice is the rod's own (tipSides).

   LUMPS AND SPREAD AIM THE TIPS on ONE law: `lumps` tips sharing the rod's
   end, each `spreadRad` off its direction at azimuths a whole turn apart.
   One lump at spread 0 is the pill on the rod's own axis (the anther's
   default); three at 40 degrees is the trifid (the stigma's); one lump at a
   spread above 0 LEANS, which is a shape and not a dead slider, so spread is
   not gated on the count; two or more at a spread of 0 are COINCIDENT —
   duplicate geometry, told rather than refused, because a spread with a
   non-zero minimum would put the anther's own default out of reach. */
export const TIP_PREFIXES = Object.freeze(['anther', 'stigma']);
export function tipDescriptor(state, prefix, diameter) {
  if (!TIP_PREFIXES.includes(prefix)) throw new Error(`tipDescriptor: unknown tip "${prefix}" — the registry and the geometry name two tips, ${TIP_PREFIXES.join(' and ')}`);
  const g = (k) => state[`${prefix}${k}`];
  const size = g('Size'), elongation = g('Elongation'), roundedness = g('Roundedness'), spreadDeg = g('Spread');
  for (const [k, v] of [['Size', size], ['Elongation', elongation], ['Roundedness', roundedness], ['Points', g('Points')], ['Pinch', g('Pinch')], ['Lumps', g('Lumps')], ['Spread', spreadDeg]]) {
    if (!Number.isFinite(Number(v))) throw new Error(`tipDescriptor: ${prefix}${k} is ${JSON.stringify(v)} — the state carries no such control; the registry's tip table and the geometry have diverged`);
  }
  const dia = size * diameter;
  const a = dia / 2;
  const floor = tipPinchFloor(a, roundedness, g('Pinch'));
  const shape = { lobes: Math.round(g('Points')), pinch: floor.pinch, roundedness };
  const lumps = Math.round(g('Lumps'));
  return { prefix, diameter: dia, length: elongation * size * diameter, shape,
           lumps, spreadDeg, spreadRad: spreadDeg * D2R,
           sides: tipSides(shape), sizeFactor: size, elongation,
           pinchAsked: floor.asked, pinchFloored: floor.floored, waistMm: floor.waist,
           minRadiusMm: TIP_MIN_RADIUS_MM, underFloor: floor.underFloor,
           /* THE ELONGATION FLOOR (Q5, session 26) told rather than silent:
              the band is at least TIP_BAND_FLOOR of the tip's own radius, an
              elongation floor of 1.005. Inert at the shipping 2.5 (Math.max
              returns its larger argument unchanged), binding only at the very
              bottom of the slider. */
           bandFloored: (elongation * size * diameter - 2 * a) < TIP_BAND_FLOOR * a,
           lumpsCoincident: lumps > 1 && spreadDeg === 0 };
}

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
  constructor({ exportMode = false, captureGrid = false } = {}) {
    this.exportMode = !!exportMode;
    /* THE MID-SURFACE CAPTURE (session 28) — OFF by default, and off is what
       every existing caller gets: `new MeshBuilder({ exportMode })` reads this
       as false, so the live rebuild and both STL gates allocate nothing new.

       WHY A FLAG AND NOT ALWAYS-ON. The grid is the points emitPanel already
       evaluates, so capturing costs no arithmetic — but it costs MEMORY, and
       the reachable extreme is 240 petals x 31 rows x 10 columns of vectors on
       every slider drag. A capture nobody asked for that allocates tens of
       megabytes per rebuild is a performance regression wearing a feature's
       label.

       IT IS NOT A GEOMETRY SWITCH, and that is the property that has to hold:
       nothing downstream of this flag reads it to decide what to BUILD. It
       gates one `if` in emitPanel that pushes already-computed vectors into an
       array, and one field on buildPetalInto's return. The export bytes are
       identical with it on and off — asserted by tools/verify-bloom-grid.mjs
       clause 1 rather than argued here. */
    this.captureGrid = !!captureGrid;
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
   NO ROW IN THIS TABLE REACHES THE APEX ANY MORE. The tip's three role deltas
   went with `petalTipBreadth` (session 32); the apex is one unconditional cap
   with no control of its own until the superellipse lands, so a role cannot
   differentiate it. The clamp still matters for every remaining base.

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
  /* LAYER ROLES — session A's three, unchanged in law, range and effect. */
  { role: ROLE_INNER, base: 'petalSpineCurl',  control: 'innerCurl',       law: 'delta', min: -180, max: 360 },
  { role: ROLE_INNER, base: 'petalCup',        control: 'innerCup',        law: 'delta', min: -0.8, max: 1.2 },

  /* SLOT ROLES — the orchid. Labellum 5, hood 3 (Eva, Sep 2). */
  { role: SLOT_LABELLUM, base: 'petalLength',     control: 'labellumSize',       law: 'mul',   min: 20,   max: 60 },
  { role: SLOT_LABELLUM, base: 'petalWidth',      control: 'labellumSize',       law: 'mul',   min: 8,    max: 30 },
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

     THE TIP IS DELIBERATELY ABSENT PER-PETAL, recorded so it reads as a
     decision rather than an oversight: it is ONE ROW IN THIS TABLE AND ONE IN
     THE REGISTRY the day Eva wants it. It is also the control whose absence
     the supersession ruling cost the fan outright was the labellum's TIP
     delta — and that row is gone entirely now, retired with
     `petalTipBreadth` (session 32), so no placement can vary the apex per
     position. It returns as one row here plus one in the registry the day the
     apex has a control again.

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
     the labellum's TIP delta no longer exists at all. Nothing else is lost: size,
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
     gate row's reasoning stays inside the proven envelope. Nothing in the
     table reaches the apex since session 32 retired the tip deltas, so the
     clamp's job is now entirely the size, tilt, cup and curl bases. */
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

  /* THE REPRODUCTIVE PARTS' OWN RADIUS — ONE OWNER (session 24). A filament
     and a style are each ONE SHEET THICK (Part thickness owns the material
     dimension), so their radius is ONE number rather than two that happen to
     agree: the androecium's `rFil`, the gynoecium's `rSty` and the disc's
     INNER LIMIT below are all this, and buildBloomInto's filament-against-
     style flag READS the limit instead of re-deriving it from the two
     descriptors. Both expressions it replaces were `thickness / 2` on the
     same double, so nothing moves by introducing it — the block-23 and
     block-24 rows on both trees are what MEASURE that, not this sentence.

     IT EXISTS WHETHER OR NOT A STYLE IS BUILT, which is what lets the limit
     apply ALWAYS (Eva, Sep 6): a limit that only existed with a style
     present would make turning the style on move every stamen, which is
     exactly the coupling session 22 ruled against when it made each part
     independently present or absent. */
  const partRadius = thickness / 2;

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
    const rFil = partRadius;                          // the ONE owner above; `thickness / 2`, the expression it replaces
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
    /* THE ANTHER'S SEVEN (session 29) come through tipDescriptor(), the ONE
       owner shared with the stigma's lobe (session 30) — see its header for
       the term-for-term byte argument and the floor. `anther` is read by
       buildStamenInto and by JS4/JS6/JS7; nothing here re-derives a field. */
    const anther = tipDescriptor(state, 'anther', diameter);
    const clearRadius = Math.max(0, Math.min(...rings.map((r) => r.radius - r.overhang)));
    /* THE DISC'S INNER LIMIT (session 24, Eva's ruling Sep 6). The Vogel law
       had no inner limit, so its innermost stamen stood at
       `rFil * spread / sqrt(2)` — 0.85 mm on every UNCLAMPED disc at ANY
       count (the N cancels: R = rFil sqrt(N) spread and r_0 = R sqrt(0.5/N)),
       and 0.53 mm on the clamped 120. With a style present that is INSIDE the
       style's own tube, so the filament-against-style flag fired at the root
       on every disc setting; the RING layout never does it, since every
       stamen sits at R.

       THE LIMIT IS `rFil + rSty` — where a filament's tube clears a style's —
       and that is EXACTLY the flag's own threshold: one quantity, stamped
       here from `partRadius` and READ by the flag, never a second derivation
       that agrees. ALWAYS, not only with a style (Eva's ruling and its
       reason are at partRadius above).

       THE LAW IS THE EQUAL-AREA LAW RE-BASED ON THE ANNULUS [inner, R]
       instead of the disc [0, R] — "start the spiral's index past zero" with
       the integer rounded away. Every annulus keeps exactly the same area,
       `pi (R^2 - inner^2) / N` (measured: the spread across all 120 is
       3.6e-14 mm^2), and unlike an integer offset it is CONTINUOUS in R, so
       the spread slider never jumps. Chosen over flooring each radius, which
       was measured to take the 120-disc's closest pair of roots from 1.164 mm
       to 0.991 mm — deeper into the ROOTS FUSE flag it was meant to relieve —
       while this takes it to 1.233 mm and clears it.

       NO ROOM is told, never refused, on the crosses-axis precedent: when the
       disc radius is inside the limit the annulus has no width and every
       stamen stands on the rim (`STAMENS: 1 stamen on the DISC` is that row,
       at R = inner = 1.20 mm exactly). At the on-axis corner R is 0, `inner`
       with it, and every stamen is on the axis as before — byte-identical
       there by construction, and a gate row proves it. `innerUsed` and
       `noRoom` are NULL under RING: a claim nothing can make reads as absent,
       and JS5 asserts that biconditional in both directions. */
    const innerLimit = partRadius + partRadius;       // a filament radius plus a style radius — the flag's own threshold
    const innerUsed = disc ? Math.min(innerLimit, radius) : null;
    const noRoom = disc ? radius <= innerLimit : null;
    const stamens = [];
    for (let i = 0; i < count; i++) {
      const r = disc ? Math.sqrt(innerUsed * innerUsed + ((i + 0.5) * (radius * radius - innerUsed * innerUsed)) / count) : radius;
      const s = surfaceAt(r, null);
      const inPetalRootAnnulus = rings.some((rg) => r + rFil > rg.radius - rg.overhang && r - rFil < rg.radius);
      stamens.push({ index: i, radius: r, slope: s.slope, z: s.z, arc: s.arc, relief: s.relief, inPetalRootAnnulus });
    }
    return {
      count, layout: state.stamenLayout, diameter, rFil, length: state.stamenLength, curlDeg: state.stamenCurl, curlRad: state.stamenCurl * D2R,
      derivedRadius, spread: state.stamenSpread, asked, radius, clamped, limit, onAxis, hubRadius: hub.radius, clearRadius, anther, thickness, dome,
      /* THE INNER LIMIT (session 24) — see the block above. `innerLimit` is a
         property of the PARTS and is a number on both layouts; `innerUsed`
         and `noRoom` describe the DISC and are null under RING. */
      innerLimit, innerUsed, noRoom,
      /* WHERE THE MULTIPLIER RUNS OUT ON THIS BLOOM — the limit over the
         reference, (hub - r) / (r sqrt N): 1.25 at 120 stamens on the shipping
         hub, 13.7 at one, 123 on the largest hub, 0.03 on the smallest.
         Telemetry, so the read-out can say how much of the slider is dead
         HERE and the panel gate can assert it (Eva, Sep 6): a static range
         cannot be narrowed to remove it, because it is a function of the
         count and the hub, and the ruled answer to dead travel in this
         codebase is the curl's — full ranges, clamped, TOLD. */
      saturation: derivedRadius > 0 ? limit / derivedRadius : 0,
      stamens,
      inPetalRootAnnulus: stamens.filter((s) => s.inPetalRootAnnulus).length,
      /* SLENDERNESS — free length over the FLOORED diameter, telemetry only
         (Q7). UNMEASURED — no coupon has been printed: the six-stamen
         candidate at L/d 18.3 is past anything this family has printed. */
      slenderness: state.stamenLength / diameter,
    };
  })();

  /* THE GYNOECIUM (session 22) — this owner's THIRD kind: ONE style on the
     axis. Its surface point is the apex, surfaceAt(0): slope 0 (the cap's
     normal there is exactly +z — cos 0 and sin 0 are exact), z the face
     pole's height on a cap and 0 flat. The style is ONE SHEET THICK, floored
     with it (Part thickness owns the material dimension), so on the one
     reachable apex corner where the androecium goes on-axis (a hub narrower
     than a filament radius) the style's root ring stands WIDER THAN THE HUB:
     told, never refused — the root still crosses the whole slab, so the
     invariant holds. A style foot reaching into a petal-root annulus is the
     same FLAG the stamens carry. Null when absent or under SPHERE. */
  const gynoecium = (() => {
    if (!gynoeciumEligible(state)) return null;
    if (state.gynoecium !== 'NONE' && state.gynoecium !== 'STYLE') throw new Error(`unknown gynoecium ${JSON.stringify(state.gynoecium)} — the registry and the builder have diverged`);
    if (state.gynoecium === 'NONE') return null;
    const diameter = thickness, rSty = partRadius;        // one sheet thick, floored with it — the ONE owner above
    const s = surfaceAt(0, null);
    /* THE STIGMA'S SEVEN (session 30) — the same owner as the anther's,
       instanced on the style's diameter. STIGMA_LOBES and
       STIGMA_LOBE_SPREAD_DEG are the two controls' DEFAULTS now (the
       registry imports them, the harness asserts the pairing), so the trifid
       is what the state says at rest and what the visitor says otherwise. */
    const lobe = tipDescriptor(state, 'stigma', diameter);
    return {
      count: 1, diameter, rSty, length: state.styleLength, curlDeg: state.styleCurl, curlRad: state.styleCurl * D2R,
      radius: 0, slope: s.slope, z: s.z, arc: s.arc, relief: s.relief,
      hubRadius: hub.radius, widerThanHub: rSty > hub.radius,
      inPetalRootAnnulus: rings.some((rg) => rSty > rg.radius - rg.overhang),
      clearRadius: Math.max(0, Math.min(...rings.map((r) => r.radius - r.overhang))),
      lobe, thickness, dome,
      /* SLENDERNESS — free length over the FLOORED diameter, telemetry only
         (Q7), on the same read-out line as the filament's: UNMEASURED — no
         coupon has been printed. */
      slenderness: state.styleLength / diameter,
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
    /* THE GYNOECIUM, this owner's third kind — null when absent or under
       SPHERE (session 22). */
    gynoecium,
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
   placeholder's value — moving it moves every export. EXPORTED since session
   32 because the apex assertion A5 must not scan below it: the root blend
   legitimately FALLS to meet the rising core, so a profile whose foot is wider
   than its blade peak (reachable at foot width 10 mm against petalWidth 8 —
   4.405 mm against 4.000) shows a rise-after-a-fall at the BASE that is the
   foot's continuity floor doing its job, not an apex that widens. The gate
   reads this number rather than restating 0.30. */
export const ROOT_BLEND_END = 0.30;
/* BLADE ROWS. 56 SINCE SESSION 34, FIXED AND NOT DERIVED (Eva's ruling).
   Margin buckling needs about eight rows per cycle before the emitted
   polyline is the law's curve rather than a sawtooth — measured in part 1's
   discovery, where the same state read a 1.381 mm along-margin radius at 28
   rows and 0.314 mm at 224, i.e. at 28 the mesh could not BUILD the curvature
   the law asked for and the export gate's green was an artefact of that.

   WHY FIXED AND NOT DERIVED FROM THE FREQUENCY, which is what "derive, don't
   expose" would ordinarily want: `CURL_START_MIN = 1 / NU` below, and the
   registry IMPORTS it as curlStart's floor. A row count that moved with the
   buckle frequency would silently move an unrelated CURL slider's declared
   bound — one control reaching into another's range, the registration
   violation this project has unpicked five times. So the buckle's frequency
   is CAPPED at NU / BUCKLE_ROWS_PER_CYCLE_MIN instead, and the cap is a
   constant because NU is.

   IT MOVES BYTES, and that is predeclared rather than discovered: every blade
   has more rows, so EVERY row of the live matrix moves. The partition and the
   attribution (the controls move nothing; NU moves everything) are in
   docs/bloom-session-34-outcome.md. `curlStart`'s floor halves with it,
   0.0357 -> 0.0179, which is part of the same move. */
const NU = 56;   // blade rows
/* The blade's row count, EXPORTED under a name that says what it is, so the
   harness can check the frequency ceiling against it rather than restating
   56. `NU` stays the internal name every expression here already uses. */
export const BLADE_ROWS = NU;

/* ===================================================================
   WHERE THE BLADE ROWS SIT — the turning-rate ladder (Eva, session 32).

   THE ROW COUNT IS UNCHANGED; ONLY THE POSITIONS MOVE. NU rows, as before;
   `bladeStations()` is the ONE owner of which u each one takes, and it is a
   pure function of the profile, so the SURFACE is untouched. That split is
   the reason the law and the redistribution are two commits with two proofs:
   the law changes the surface and is proved by reading the exponent back;
   this changes only the sampling and is proved by DENSE SAMPLING agreeing on
   both trees.

   *** NAME THE MODE AND THE SAMPLING; DERIVE A LENGTH FROM A LENGTH. ***
   The project rule (Eva, session 32; CLAUDE.md's bloom pointer carries it, §18h
   of the session-32 outcome doc has the table) and it lives here because FOUR
   of the five defects that produced it were in this file or in what reads it:
   the buckle's rows-per-cycle ceiling, C1's `(i + 1) / n` station, the
   self-contact flag's row-count skip, and this ladder reading the LIVE floor so
   the export split a cleft's panels at a different row. A ROW COUNT IS ONLY A
   LENGTH UNDER UNIFORM SPACING, and below this line the spacing is not uniform.
   Anything added here that means a distance must be written as a distance
   (`ladderHalfAt` is why this ladder is mode-free), and any figure reported off
   it must say which mode and which row count it was measured at.

   WHY. Rows evenly spaced in u put the same number through the apex whatever
   the outline is doing there, and the apex turn grows with the exponent
   across the whole upper half of a range Eva ruled reachable — so the
   sampling has to serve n 3.00, not only the shipped 1.70. Measured on THIS
   tree over 9 tapers x 8 exponents at NU 56, worst apex chord error:
   0.3952 -> 0.2147 mm in EXPORT (1.84x) and 0.3952 -> 0.1319 in LIVE (3.00x).

   NAME THE MODE. An earlier draft of this comment quoted `0.2423 -> 0.1025 mm,
   2.36x` and attributed it to this sweep. That figure was LIVE mode, measured
   on a scratch re-implementation, with the ladder reading the LIVE floor —
   and it does not reproduce here, because making the ladder mode-independent
   (`ladderHalfAt`, the export floor in both modes, which topology requires)
   moved every live station. Two different measurements had been welded into
   one sentence. Fifth instance of this project's mode-conflation class.

   THE MEASURE counts TURNING, blended with arc length so no stretch is ever
   starved: `d(theta) + beta * ds/S`, with beta set so arc length carries
   LADDER_ARC_SHARE of the total. It keeps a real turning term, and that is
   MEASURED rather than argued: pure arc length (ARC 1.00, where beta
   diverges) collapses to 1.31x with 30 of 72 states' whole-blade chord WORSE
   than uniform, because an ellipse's apex is precisely where the outline
   turns fastest, so arc length spaces rows EVENLY through it.

   0.70 IS A TRADE, NOT AN OPTIMUM, and re-deriving it is how that was found.
   On this tree it is a local minimum in LIVE and is NOT one in EXPORT (0.80
   reads 0.1992 against its 0.2147). The grid optimum sits near 0.90-0.95 in
   both modes — and moving there is TAIL AGAINST TYPICAL, not a free win: at
   0.90 the worst state improves 1.84x -> 2.04x and whole-blade regressions
   fall 4/72 -> 1/72, while the SHIPPING DEFAULT's own apex gain drops
   1.61x -> 1.29x and Eva's reference taper's 1.44x -> 1.22x (EXPORT, n 1.70).
   0.70 is kept because it serves the settings that actually ship. Do not tune
   this to three digits: the objective is the worst of 72 states and it HOPS
   (0.75 spikes to 0.2732 in both modes while 0.70 and 0.80 sit near 0.14 and
   0.20), so a decimal place here is sampling, not signal. §18d of
   docs/bloom-session-32-outcome.md has the full sweep; the value is Eva's.

   TURNING IS COUNTED ONLY WHERE THE LAW IS THE ACTIVE BRANCH, AND THIS NOTE
   IS THE POINT OF THE CLAUSE. A kink's turning is a delta function, so
   integrating through the root-blend and tip-floor joins makes the cumulative
   measure STEP, and equal increments of a stepping function stack rows onto
   the step: measured, 5 rows on u 0.058 and 8 duplicates on u 1.000, which
   then reported an 84 degree "apex turn" that was a zero-length segment.
   That is the fourth instance of this bug class in this project (the third
   was this same ladder's first draft; the fourth was reading the exponent
   back THROUGH the print floor, which biased an asked 0.60 to 0.6080). If a
   later change adds a branch to widthProfile(), it belongs in `lawActive`.

   THE ROOT BLEND'S OWN ROWS ARE THE ROW LATTICE, AND SESSION 38 MOVED WHERE
   THAT LATTICE STARTS. Until then the sentence here read "every station below
   ROOT_BLEND_END keeps its uniform value exactly", and the redistribution
   still does not touch them: what changed is that the block may now START AT
   ROW m rather than at row 1, so that the first blade row clears the
   foot-to-blade offset fold (see THE SEAM CLEARANCE above). The held rows are
   `(m + i) / NU` — still `held` consecutive lattice steps, still one row
   apart, still a BIT identity, and still bit-identical to the old expression
   at every state where the floor does not bind, the shipping default among
   them. The ladder above the block is untouched either way: it runs over
   [u0, 1] from wherever the block ends. That boundary belongs to footRing()
   and a tip control must not resample it; the seam floor is not a tip
   control, it is that boundary's own print-safety condition.

   `CURL_START_MIN = 1 / NU` IS RE-DERIVED, NOT RELAXED. It used to be able to
   say "the first blade row is still at 1/NU, because it is one of the held
   ones", and that is what made Eva's Sep 4 floor mean "the root chord is
   straight wherever start is engaged" — the premise J8's stronger normal
   clause rests on. The first blade row is now at m/NU, so the CONTROL's bound
   is unchanged (the registry still imports 1/NU; a bound that moved with the
   tilt would be one control reaching into another's range) while the floor
   the LAW applies is `max(start, 1/NU, the first blade row)` — see
   `startFloor` at spineLaw's call site. Relaxing instead would have made J8's
   clause SKIP those rows rather than fail them, which is coverage lost
   silently rather than loudly.

   THE WIDEST GAP IS BOUNDED at LADDER_MAX_GAP_FACTOR / NU. This is NOT a
   quality lever — measured, it costs the apex nothing at all (0.1025 mm with
   the bound and without) — it exists because the buckle's frequency ceiling
   is NU / BUCKLE_ROWS_PER_CYCLE_MIN, which is a statement about row SPACING
   derived from row COUNT, and those stop being the same thing the moment the
   ladder is not uniform. THE BOUND DOES NOT MAKE THAT CEILING TRUE AGAIN:
   uniform uniquely maximises the minimum local rows-per-cycle, so ANY
   redistribution lowers it. At the frequency cap the minimum falls 8.00 ->
   5.71 with this bound (4.73 without). Reported, not resolved: whoever lands
   second owns reconciling the two. */
/* HOW MANY BLADE ROWS THE ROOT BLEND OWNS — ONE OWNER (session 38). This
   expression stood in three places (the ladder, the seam's lattice step and
   the ladder telemetry) and two of them were textually identical, which is
   enough to make an anchored mutation land twice and say nothing. */
export const HELD_ROWS = Math.floor(ROOT_BLEND_END * NU);
export const LADDER_ARC_SHARE = 0.70;
export const LADDER_MAX_GAP_FACTOR = 1.4;
const LADDER_SAMPLES = 8000;

/* THE BOUND THE BUCKLE IMPOSES, read from ITS OWN constants rather than
   restated. `BUCKLE_ROWS_PER_CYCLE_MIN` is the bar below which the emitted
   polyline stops being the wave's curve, and the frequency ceiling is
   `NU / that` — a statement about row SPACING derived from row COUNT, which
   is exactly what stops being the same thing once the ladder is not uniform.
   Measured at the ceiling: an unbounded ladder DOUBLES the buckle's
   along-margin chord error (0.2808 -> 0.5626 mm at maximum amplitude).

   AT f = 7 THIS RETURNS EXACTLY 1, WHICH IS UNIFORM. 56 rows over 7 cycles is
   8 per cycle with no slack at all, so there is nothing to redistribute and
   the apex keeps today's faceting there — the honest trade, not a bug. Below
   the ceiling the bound opens up and both features are served: measured, the
   buckle's chord error IMPROVES at every f <= 5 rather than merely holding. */
export function ladderGapFactor(buckleFreq) {
  if (!buckleFreq) return LADDER_MAX_GAP_FACTOR;
  return Math.min(LADDER_MAX_GAP_FACTOR, NU / (BUCKLE_ROWS_PER_CYCLE_MIN * buckleFreq));
}

/* ===================================================================
   THE SEAM CLEARANCE — how far the first blade row must stand off the foot
   (session 38, Eva's ruling: DERIVE k, do not dial it).

   THE DEFECT. At the foot-to-blade kink the two skins are offset along the
   ROWS' own normals — the foot's (the hub plane's) at one end and the
   blade's, turned by the tilt, at the other. That makes the seam panel a
   WEDGE, and when the first blade row sits too close to the ring the wedge's
   own top skin re-enters the foot's slab: measured, every site on the top
   skin at the ring radius at dz = t/2, both triangles of every pair a seam
   quad, zero pairs at zero tilt, and a SINGLE layer at tilt 75 with length
   20 and sheet 2.4 folding 376 pairs with no layers involved at all. Layer
   count was a proxy for shorter petals and stacked tilt, never the cause.

   THE DERIVATION. Work in the petal's own radial cross-section, with the
   ring row at the origin, the foot running along +r, the blade leaving at
   the seam turn `th`, and a = t/2. Write c = cos th, s = sin th. The first
   blade row's centre is s1*(c, s); its two skin points are

     T = ( s1 c - a s ,  s1 s + a c )     (top)
     B = ( s1 c + a s ,  s1 s - a c )     (bottom)

   while the foot's own skins sit at (0, +/-a) and run inward. The seam
   panel's RIM (the closing face at v = +/-1) is the quad through the foot's
   two skin points and T, B; it is what carries the panel across the foot's
   top plane z = a. That plane cuts the rim on the edge T->B at

     lambda = (z_T - a) / (z_T - z_B) = (s1 s + a c - a) / (2 a c),

   and the crossing lands at r = r_T + lambda (r_B - r_T). Requiring that
   crossing to fall OUTSIDE the foot — r >= 0, i.e. at or beyond the ring —
   and clearing the denominator:

     s1 c - a s + 2 a s (s1 s + a c - a) / (2 a c)  >=  0
     s1 c^2 - a s c + s1 s^2 + a s c - a s          >=  0
     s1 (c^2 + s^2)                                 >=  a s

                    ***  s1  >  (t/2) * sin(th)  ***

   NOTHING IS TUNED. The naive offset-corner bound — put the first row's own
   skin point above the foot's top plane — is a*tan(th/2), and that is the
   "bare geometric bound" the brief expected: it is NECESSARY AND NOT
   SUFFICIENT, and at exactly that value the result is WORSE than main (the
   tilt-75 case goes 376 -> 632 pairs, every site at z = t/2 EXACTLY, because
   the row lands coplanar with the foot's top skin rather than clear of it).
   The gap between the two is the factor

     sin(th) / tan(th/2) = 1 + cos(th),

   which is 2 at a shallow kink, 1.906 at the shipping tilt of 25 degrees,
   and 1 at a right angle — the answer to "if the derivation lands near 2.0".
   It is the cost of the mesh drawing the seam as a flat CHORD from the
   foot's offset ring to the blade's offset first row where the bound assumes
   the corner is mitred.

   MEASURED AGAINST THE CENSUS, which is what makes this a derivation rather
   than a fit: sweeping the constant in front of a*sin(th), every state flips
   from non-zero to EXACTLY ZERO between 1.0000 and 1.0005 — tilt 45, 60 and
   75, sheet 1.2 and 2.4, three layers and six. At exactly 1.0000 all four
   probe states read the SAME 64 pairs, which is the signature of the
   equality touching rather than of geometry.

   THE INEQUALITY IS STRICT, AND STRICTNESS COSTS NO EPSILON — see
   bladeStations: the first blade row is not placed AT the clearance, it is
   the first station of the row lattice STRICTLY BEYOND it. A margin dialled
   until the count reached zero would have been the invented-constant defect
   this project keeps finding, and it would have been carrying a printability
   guarantee.

   BOTH MODES, and this is the session-32 mode-dependence defect refusing to
   ship a third time: the thickness read here is max(sheetThickness,
   MIN_FEATURE_MM) — the EXPORT thickness — in live mode too, exactly as
   `ladderHalfAt` reads the export floor in both modes. Row positions are
   topology; the export floor may not move them. Measured on the scratch
   patch that read the live thickness: on a 0.6 mm sheet ring 2's first
   station differed live from export.

   PAST A RIGHT ANGLE THE LAW SATURATES AND SAYS SO. The algebra above
   multiplies by c = cos(th), so beyond a right angle the inequality REVERSES
   and no spacing satisfies it — which is the geometry telling the truth: at
   an effective tilt past 90 degrees the blade's own MID-SURFACE lies back
   over its foot, and that is a mid-surface overlap no offset spacing can
   fix. The clearance is held at its right-angle value (a) there rather than
   falling away with sin, and those rows stay declared. Whether the tilt
   control should reach past 90 at all is a separate ruling.
   =================================================================== */
/* THE ONE OWNER of the half-thickness the clearance is built on — the EXPORT
   thickness in both modes. Both `seamClearanceMm` and petalSurface's reported
   `seamHalfMm` call this rather than restating it, so the live gate's A7
   clause and the clearance itself cannot drift apart. */
export function seamHalfThicknessMm(sheetMm) { return Math.max(sheetMm, MIN_FEATURE_MM) / 2; }
export function seamClearanceMm(turnRad, sheetMm) {
  return seamHalfThicknessMm(sheetMm) * Math.sin(Math.max(0, Math.min(turnRad, Math.PI / 2)));
}
/* THE ONE OWNER of which lattice station the blade starts at — the first
   station STRICTLY beyond the clearance, never nearer than the first. Both
   `bladeStations` and the ladder telemetry A7 reads call this, so the
   assertion pins the block the builder built rather than a second law. */
/* THE FURTHEST OUT THE BLOCK CAN START and still leave the redistributed
   ladder a domain at all: the last held row then lands at (SEAM_MAX_STEP +
   HELD_ROWS - 1) / NU, one row short of the tip. */
export const SEAM_MAX_STEP = Math.max(1, NU - HELD_ROWS);
export function seamLatticeStepRaw(seamMm, length) {
  const uSeam = length > 0 ? seamMm / length : 0;
  return Math.max(1, Math.floor(uSeam * NU) + 1);
}
export function seamLatticeStep(seamMm, length) {
  return Math.min(seamLatticeStepRaw(seamMm, length), SEAM_MAX_STEP);
}

/* The blend grid a demand's ladder is taken down to — see the note at the
   end of bladeStations. EXPORTED because A8 bounds how far below the bound a
   blended ladder may sit, and that slack IS one step of this grid: restating
   4096 in the harness would make the bound agree with itself. */
export const LADDER_BLEND_GRID = 4096;
export function bladeStations(profile, length, buckle = null, seamMm = 0, report = null) {
  /* WHAT THE BLEND DID, for A8's own clause (session 39). 1 says "the
     bisection never ran", which is what every early return below means. It is
     the ONE thing the gate cannot read off the emitted stations: whether this
     ladder is the base measure's own or something pulled back toward uniform.
     The gap it is judged against is read from the rows, never reported here —
     a measure that reported its own verdict would justify its own defect. */
  if (report) report.blend = 1;
  const uniform = Array.from({ length: NU }, (_, i) => (i + 1) / NU);
  /* The rows the root blend can reach keep their uniform stations, exactly. */
  const held = HELD_ROWS;
  /* THE SEAM FLOOR — REDISTRIBUTE, NEVER PILE (Eva, session 38). The held
     block keeps the uniform ROW LATTICE exactly and simply STARTS LATER: the
     first blade row is the first station of that lattice standing strictly
     clear of the seam, and the block is `held` consecutive lattice steps
     from there. So the held rows are still (m + i) / NU for an integer m,
     their spacing is still one row, and nothing can stack against a floor.

     A first draft floored each station instead (`max(u_i, uMin)`) and let
     the strictly-increasing repair separate the survivors by 1e-4. That
     PILES, and it trades this defect for another: the scratch patch that did
     it took the mum on a hemisphere from 0 to 72 pairs and the incurve target
     at rise 0.5 from 7,350 to 8,641 (Eva's ruling, session 38 — those two
     figures are that patch's, not this one's; both rows are re-measured under
     the shipped redistribution in docs/bloom-foot-to-blade-seam-outcome.md).

     WHY THE LATTICE AND NOT THE CLEARANCE ITSELF. Placing the first row AT
     the clearance realises the derivation's inequality as an EQUALITY, which
     is exactly the coplanar-touch case the derivation warns about. Taking
     the next lattice station instead makes it strict with no epsilon: the
     margin is one row, which is a length this file already owns, rather than
     a number chosen because the count reached zero.

     m IS 1 WHENEVER THE FLOOR DOES NOT BIND, and then `base` is `1 / NU`
     from the same expression `uniform[0]` used, so the stations below are
     BIT-IDENTICAL to the un-floored ladder and the shipping default cannot
     move. */
  const mUsed = seamLatticeStep(seamMm, length);
  const seamBinds = mUsed > 1;
  const heldRows = seamBinds
    ? Array.from({ length: held }, (_, i) => (mUsed + i) / NU)
    : uniform.slice(0, held);
  const u0 = held > 0 ? heldRows[held - 1] : 0;
  if (held >= NU) return heldRows;
  if (!(u0 < 1)) return heldRows.concat(uniform.slice(held));

  /* THE LADDER'S OWN VIEW, which is the export floor in BOTH modes — see
     `ladderHalfAt` in widthProfile(). Row positions are topology; the export
     floor may not move them. ASKED, never re-derived: widthProfile() is the
     one owner of which term wins, and this is its one caller. */
  const at = (u) => profile.ladderHalfAt(u);
  const active = (u) => profile.ladderLawActiveAt(u);
  const tangent = (f, u) => {
    const h = 1e-6, lo = Math.max(u0, u - h), hi = Math.min(1, u + h);
    return Math.atan2(f(hi) - f(lo), (hi - lo) * length);
  };
  /* THE MARGIN WAVE IS PART OF WHAT IS EMITTED, so its turning buys its own
     rows. Weighting by the outline alone would place rows for the apex and
     leave the buckle to be sampled by whatever fell out — which is how an
     unbounded ladder made the wave worse. Along the margin the field is
     `A * h(u) * ramp(u) * cos(2 pi f u + phase)`; the envelope is exactly 1
     at v = +/-1 whatever the reach exponent is, which is why this does not
     read `p` at all — the same reason buckleAmpCap does not. */
  const wave = buckle && buckle.A
    ? (u) => buckle.A * at(u) * Math.min(1, u / FORM_ONSET_END)
        * Math.cos(2 * Math.PI * buckle.f * u + (buckle.phaseRad || 0))
    : null;

  const dT = [], dA = [];
  let turn = 0, arc = 0, pT = tangent(at, u0 + 1e-9), pX = u0 * length, pY = at(u0);
  let pW = wave ? tangent(wave, u0 + 1e-9) : 0;
  for (let i = 1; i <= LADDER_SAMPLES; i++) {
    const u = u0 + (1 - u0) * i / LADDER_SAMPLES;
    const t = tangent(at, u), x = u * length, y = at(u);
    let d = Math.abs(t - pT);
    if (d > Math.PI) d = 2 * Math.PI - d;
    if (!(active(u) && active(u0 + (1 - u0) * (i - 1) / LADDER_SAMPLES))) d = 0;
    if (wave) {
      const tw = tangent(wave, u);
      let dw = Math.abs(tw - pW);
      if (dw > Math.PI) dw = 2 * Math.PI - dw;
      d += dw; pW = tw;
    }
    const s = Math.hypot(x - pX, y - pY);
    dT.push(d); dA.push(s); turn += d; arc += s; pT = t; pX = x; pY = y;
  }
  /* THE DEGENERATE PATHS MUST STILL CLEAR THE SEAM (session 38). If the
     measure is empty there is nothing to redistribute, but returning the
     UNIFORM ladder would put the first blade rows back under the clearance
     and break A7. The even ladder over the held block's own domain is the
     answer, and with no seam shift it is `uniform` verbatim. */
  const fallback = () => heldRows.concat(Array.from({ length: NU - held }, (_, j) => u0 + (1 - u0) * (j + 1) / (NU - held)));
  if (!(arc > 0)) return seamBinds ? fallback() : uniform;

  const beta = (LADDER_ARC_SHARE / (1 - LADDER_ARC_SHARE)) * turn;
  const want = NU - held;
  const sampleU = (i) => u0 + (1 - u0) * i / LADDER_SAMPLES;
  /* THE RESOLUTION DEMAND (Eva's ruling amendment, session 38). The ladder
     stays the ONE place rows are placed; it no longer places them from the
     petal's curvature alone. A rim feature hands it a demand — a window and
     the stations that window needs — and the ladder satisfies it INSIDE ITS
     OWN MEASURE: three REGION COUNTS decided first (the window raised to the
     demand and held at the ladder's capacity for it, the stretch below and
     the tip above split by the base measure's own masses, each raised to the
     gap bound's minimum), then each region placed at equal increments of the
     SAME cumulative measure. (The first form — one multiplicative factor on
     the window's increments solved by bisection — left the stretch two rows
     and its gaps at 1.62 x uniform; A8 caught it, session 38.) No second
     placer, no station inserted behind the ladder's back: with no demand
     the whole blade is one region and every line below is today's, to the
     bit. */
  /* At the buckle's frequency cap the ladder is uniform (the gap factor is
     exactly 1 and the blend below takes it there whatever the measure says),
     so a demand is not placed — it is SERVED by uniform's own rows, which is
     what ladderWindowCapacity counts there. */
  const demand = ladderGapFactor(buckle && buckle.A ? buckle.f : 0) === 1 ? null
    : profile.ladderDemand ? profile.ladderDemand() : null;
  const cum = [0];
  for (let i = 0; i < LADDER_SAMPLES; i++) cum.push(cum[i] + dT[i] + beta * (dA[i] / arc));
  const total = cum[LADDER_SAMPLES];
  if (!(total > 0)) return seamBinds ? fallback() : uniform;
  /* Stations at equal increments of the measure between two of its values —
     the whole blade when there is no demand (today's placement, verbatim), one
     region at a time when there is. */
  const placeInto = (rows, cA, cB, count) => {
    for (let j = 1; j <= count; j++) {
      /* The region's LAST station is asked for at cB ITSELF, not at
         `cA + (cB - cA)`, which is cB give or take an ulp: under a demand cB
         is one of `cum`'s own samples, so that ulp decides whether the
         search lands ON the sample or one past it — a whole ladder sample
         (~4e-4 of u) riding on the last bit of a sum. The last bit is not
         the same in every engine (measured: the page and the Node rebuild
         of one state placed a station 5.5e-4 apart, and X0 refused the
         export as not this state's build). With no demand cB is `total`
         and the answer is the top sample either way. */
      const target = j === count ? cB : cA + (cB - cA) * j / count;
      let lo = 0, hi = LADDER_SAMPLES;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < target) lo = m; else hi = m; }
      rows.push(sampleU(hi));
    }
  };
  const cumAt = (u) => { const i = Math.min(LADDER_SAMPLES, Math.max(0, Math.round((u - u0) / (1 - u0) * LADDER_SAMPLES))); return cum[i]; };
  const out = heldRows.slice();
  let regions = null;
  if (demand === null) {
    placeInto(out, 0, total, want);
  } else {
    /* THE REGION COUNTS. The window gets what the base measure would give it,
       raised to the demand and held at the capacity (or EXACTLY the demand
       under a capability that asks for it — the floor demonstration's non-
       shipping configuration); the rest is split between the stretch below
       and the tip above by the base measure's own masses, each raised to the
       minimum the gap bound needs of it. Feasible by construction: the
       capacity is the free rows less those two minima. */
    const { minStretch, minTip } = ladderOutsideMinima(demand.u0, demand.u1, buckle && buckle.A ? buckle.f : 0);
    const capRows = Math.max(0, want - minStretch - minTip);
    const cS = cumAt(demand.u0), cW = cumAt(demand.u1);
    const mS = cS, mW = cW - cS, mT = total - cW;
    const baseW = Math.round(want * mW / total);
    const W = demand.exact ? Math.min(demand.stations, capRows) : Math.min(Math.max(baseW, demand.stations), capRows);
    const R = want - W;
    let S = mS + mT > 0 ? Math.round(R * mS / (mS + mT)) : 0;
    S = Math.max(minStretch, S);
    let T = R - S;
    if (T < minTip) { T = minTip; S = R - T; }
    if (S < 0) { S = 0; T = R; }
    regions = { S, W, T };
    placeInto(out, 0, cS, S);
    placeInto(out, cS, cW, W);
    placeInto(out, cW, total, T);
  }
  out[NU - 1] = 1;
  /* Strictly increasing, always: two rows at one station is a zero-length
     panel, and the assertion families read `profileU` expecting an order. */
  for (let i = 1; i < NU; i++) if (out[i] <= out[i - 1]) out[i] = Math.min(1, out[i - 1] + 1e-5);

  /* Bound the widest gap by blending back toward uniform in u. Monotone in
     the blend, so a bisection finds the largest admissible ladder.

     THE GAPS BETWEEN STATIONS, AND THE LEADING ONE IS A7'S (session 39, and
     the reason that session exists). This measure opened with `r[0]` — the
     offset from the seam to the FIRST BLADE ROW. Before session 38 that was
     always exactly 1 / NU, so it could never be the widest gap and the term
     was vacuous; with the seam floor it is `seamStep / NU`, and at a seam
     step of 2 it already exceeds every cap this function is ever handed.
     THE BLEND CANNOT MOVE IT — `mix()` keeps every held row by construction,
     for the bit-identity reason below — so the cap was unsatisfiable for
     every blend, the bisection converged to 0, and the whole turning-rate
     ladder was DISCARDED: the blade placed EXACTLY uniformly wherever the
     seam floor binds. Nothing could see it. A uniform ladder is watertight,
     one piece, the right triangle count, inside every bound and past every
     assertion; it is simply session 32's redistribution switched off, at 16x
     the apex chord error in EXPORT on the incurve target (0.0660 mm against
     0.0041 with the ladder).

     A8 IN THE HARNESS ALREADY EXCLUDES THIS GAP BY NAME and says why — it is
     "placed by the clearance law and PINNED by A7", where the ladder's own
     question is whether its REDISTRIBUTION starved the wave. This is that
     same clause, in the geometry, so the one rule stops having two owners
     that disagree; it is deliberately not a second rule. A8 gained the
     matching assertion on the same day, and it reads the gap off the EMITTED
     stations rather than off anything reported from here: a measure that
     handed the gate its own verdict would hand over the number that excuses
     it. What IS reported is the blend alone — the one thing the emitted rows
     cannot say. */
  const widest = (r) => { let m = 0; for (let i = 1; i < NU; i++) m = Math.max(m, r[i] - r[i - 1]); return m; };
  const cap = ladderGapFactor(buckle && buckle.A ? buckle.f : 0) / NU;
  if (widest(out) <= cap) return out;
  /* The blend touches ONLY the redistributed rows. Running it over the held
     ones too would move them by an ulp (`l*u + (1-l)*u` is not `u` in
     floating point) and the base's identity claim is a BIT identity, not a
     four-decimal agreement — measured: 23 of the held stations moved.

     UNDER A DEMAND THE BLEND TARGET KEEPS THE DEMAND. Blending toward the
     global uniform ladder would pull rows out of the window and quietly
     break the count the demand was solved for; so the target is uniform
     WITHIN EACH REGION — the stretch below the window, the window, the tip
     above it — with the region counts `out` already has, so row i lies in
     the same region in both lists and the mix cannot leave it. The window's
     count is at most the capacity, which is what makes the target's outside
     gaps admissible. With no demand the target is the uniform ladder, as
     before. */
  /* THE BLEND'S TARGET FOLLOWS THE SEAM SHIFT (session 38). The target is the
     EVEN ladder over the domain the redistributed rows actually occupy, which
     the seam floor moves: `u0` is the last HELD row, not `held / NU`, whenever
     the floor binds. Kept as `uniform` / `held / NU` VERBATIM when it does not,
     so a bounded ladder on an unshifted block stays bit-identical to main's. */
  const target = demand === null
    ? (seamBinds
        ? out.map((u, i) => (i < held ? u : u0 + (1 - u0) * (i + 1 - held) / want))
        : uniform)
    : (() => {
    const ref = heldRows.slice();
    const bandBase = seamBinds ? u0 : held / NU;
    const bands = [[bandBase, Math.max(bandBase, demand.u0)], [Math.max(bandBase, demand.u0), demand.u1], [demand.u1, 1]];
    const counts = [regions.S, regions.W, regions.T];
    for (let b = 0; b < 3; b++) for (let k = 1; k <= counts[b]; k++) ref.push(bands[b][0] + (bands[b][1] - bands[b][0]) * k / counts[b]);
    ref[NU - 1] = 1;
    return ref;
  })();
  const mix = (l) => out.map((u, i) => (i < held ? u : l * u + (1 - l) * target[i]));
  let lo = 0, hi = 1;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (widest(mix(m)) <= cap) lo = m; else hi = m; }
  /* UNDER A DEMAND THE BLEND IS THE NORMAL CASE (the window's rows are
     raised past what the base measure gave, so the gaps outside it widen to
     the bound on most lobed petals), and a bisection run to 2^-60 hands back
     the largest admissible blend TO THE LAST BIT — a value whose low bits
     are a function of the low bits of every measure sample, which differ
     between engines by an ulp through the transcendental functions (the page
     and the Node rebuild of one state disagreed at one station by exactly one
     ulp, and X0 refused the export). The blend is therefore taken DOWN to a
     grid of 1/4096: still admissible (the widest gap is monotone in the
     blend), and unmoved by an ulp unless the exact boundary sits within an
     ulp of a grid line. Only under a demand: with none, every row keeps the
     placement main ships, to the bit. */
  if (demand !== null) lo = Math.floor(lo * LADDER_BLEND_GRID) / LADDER_BLEND_GRID;
  if (report) report.blend = lo;
  return mix(lo);
}
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
                   and it is UNIMODAL — its widest point is a/(a+b), which
                   reaches 0.833 at the shipped ranges, so obovate and
                   spatulate silhouettes are the two tapers' own to make.

   THE APEX IS THE CAP, AND IT IS THE ONLY THING BELOW THAT TOUCHES THE TIP.
   It is UNCONDITIONAL and has NO CONTROL OF ITS OWN: it converges to the mode
   floor along a straight lerp on every petal. That is deliberate and
   temporary — Eva ruled (session 32) that the petal tip law is a SUPERELLIPSE
   over [widest point, 1], a reparameterisation of the existing tip taper
   rather than a control beside it, and it lands with the row redistribution
   that the faceting at its round end requires. Two controls over one region
   would violate the registration rule, which is why nothing was left here to
   compete with it.

   RETIRED HERE (session 32, Eva's `blunt` ruling): TIP_PLATEAU, a linear ramp
   from the widest point to `petalTipBreadth` of the max half-width, combined
   by `max` with the core. It was the only term that reached outside the
   exponent family, and the way it did so was a defect rather than a shape:
   `max`-ing a RISING ramp against a FALLING core puts a waist in the blade and
   then widens it back out to the tip. Measured across the full shipped taper
   ranges: 0 of 3,795 (a, b) pairs show a rise-after-a-fall above the peak at
   breadth 0, and 3,795 of 3,795 do at every breadth above 0 — so the waist was
   not an edge case, it was the term's signature. The cap below produces 0 of
   14,364 swept states with one.

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
export function widthProfile(state, ring, halfW, cap, acc, length = null) {
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

  /* THE PETAL TIP LAW (Eva, session 32). Over [uPk, 1] the outline is the
     SUPERELLIPSE `(1 - s^n)^(1/n)`, s = (u - uPk)/(1 - uPk), exposed as its
     exponent directly: 0.60 acute, 1.00 a straight point, ~1.20 today's
     pointed petal, 2.00 the true ellipse, 2.50 the default, 3.00 the
     held-width round tip. It REPARAMETERISES the tip taper rather than
     standing beside it — the core already is this family over this region —
     so there is exactly one producer of the half-width above the peak and
     `widthProfile()` remains its one owner.

     BELOW uPk THE CORE IS UNTOUCHED. The two limbs meet at the peak, where
     the core's slope is exactly 0 (uPk is its maximum) and the superellipse's
     tends to 0 for every n > 1. */
  const n = state.petalTipShape;
  const tipLaw = (u) => {
    if (u <= uPk) return core(u);
    const s = (u - uPk) / (1 - uPk);
    return Math.pow(Math.max(0, 1 - Math.pow(s, n)), 1 / n);
  };

  const terms = [
    { name: 'CORE', from: stalk ? stalk.until : 0, to: 1, at: (u) => halfW * tipLaw(u) },
  ];
  if (stalk) terms.push({ name: 'STALK', from: 0, to: stalk.until, at: () => stalk.halfWidth });

  /* The claw's shoulder: a stalk narrower than the foot is the whole point,
     so the foot-continuity floor stands down for it — and ONLY for it. */
  const rootBlend = stalk ? () => 0 : (u) => footHalf * Math.max(0, 1 - u / ROOT_BLEND_END);

  /* ONE LOOP over the term list, returning the winning term's NAME beside
     its value — so `winnerAt` below can say WHICH term the outline is on
     without a second walk over the same list with the same comparison.
     `shapeAt` is this loop's value, and its arithmetic is unchanged: the
     same `>` on the same terms in the same order. */
  const shapeWinner = (u) => {
    let shape = 0, name = null;
    for (const t of terms) {
      if (u < t.from || u > t.to) continue;
      const v = t.at(u);
      if (v > shape) { shape = v; name = t.name; }
    }
    return { shape, name };
  };
  /* THE BASE OUTLINE — the shape before any cut. The cap entry, the lobe
     stationing and the lobes' own depth cap all read THIS; the lobed shape
     (`shapeAt`, below the cap) is what the floors are max-ed against. */
  const shapeBaseAt = (u) => shapeWinner(u).shape;

  /* ===================================================================
     THE CONVERGING TIP CAP — Eva's ruling, Sep 1, from the tip sheet.

     EVERY PETAL, SINCE SESSION 32. The cap was the pointed family's alone
     while `petalTipBreadth === 0` was an EXACT branch and a positive breadth
     built a different apex entirely. Eva's `blunt` ruling collapsed that into
     one construction: the cap is unconditional, it owns the terminal width,
     and the two families are gone along with the discontinuity between them
     (the live terminal used to jump 0.150 -> 0.800 mm on the first step off
     zero) and the C0 corner where the two terms crossed (up to 16.4 deg).

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
  /* THE CAP IS UNCONDITIONAL. There is no longer a pointed family and a
     truncate family with two different apex constructions and an EXACT branch
     between them: every petal's apex is this one cap. Bisection on (uPk, 1),
     deterministic, so the bytes are reproducible. */
  const target = CAP_ENTRY_FACTOR * TIP_HALF_MM;
  let lo = uPk, hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (shapeBaseAt(mid) > target) lo = mid; else hi = mid;
  }
  const uCap = Math.min(1 - TIP_CAP_FRACTION, lo);

  /* THE OUTLINE'S OWN SLOPE BREAKS, from a given winner — the lobes read the
     BASE outline's (to lay their stations on it), the profile reports the
     final outline's. */
  const winnerOf = (shapeFn) => (u) => {
    const { name } = shapeWinner(u), shape = shapeFn(u), blend = rootBlend(u);
    const h = Math.max(shape, blend, tipFloor);
    return { h, term: h === shape ? name : h === blend ? 'ROOT_BLEND' : 'TIP_FLOOR' };
  };
  const breaksOf = (winnerAt, grid = 4096) => {
    const out = [];
    let prev = winnerAt(0).term;
    for (let i = 1; i <= grid; i++) {
      const b = i / grid, cur = winnerAt(b).term;
      if (cur === prev) continue;
      let lo2 = (i - 1) / grid, hi2 = b;
      const from = prev;
      for (let k = 0; k < 60; k++) {
        const m = (lo2 + hi2) / 2;
        if (winnerAt(m).term === from) lo2 = m; else hi2 = m;
      }
      out.push({ u: hi2, kind: 'TERM_CHANGE', from, to: cur });
      prev = cur;
    }
    out.push({ u: uPk, kind: 'TIP_LAW_JOIN', from: 'CORE', to: 'CORE' });
    out.sort((a, b) => a.u - b.u);
    return out;
  };

  /* ===================================================================
     LOBES ON THE RIM (session 38, PR 2) — the cut, stationed on the lamina.

     WHAT IT IS. Between the root blend's end (ROOT_BLEND_END — the foot's
     boundary, footRing()'s, never touched) and the apex entry (uCap — the
     region PETAL TIP SHAPE owns, never touched) the outline carries a window
     of `coverage` of that stretch, measured from the apex down, in which the
     CORE is multiplied by (1 - depth * c(u)): c is 0 at every crest and 1 at
     every sinus, so the crests ARE the base outline and the sinuses are cut
     toward the midrib. Material is only ever removed; the floors below are
     max-ed against the cut shape exactly as they are against the plain one;
     one span at every u by construction.

     STATIONED ON ARC LENGTH, NOT ON u. The lobes are laid at even intervals
     of the BASE outline's own 2D arc — (u * length, max(shape, rootBlend,
     TIP_HALF_MM)), the ladder's mode-free view, so live and export station
     the same lobes — through the same engine petalRim() uses on the surface
     in space (rimArcTable). Even spacing in u bunches where the outline
     curves and reads as damage; the lamina's arc is what a leaf's teeth are
     even in. The rim IN SPACE (cup, buckle) is petalRim's to report and the
     hand checks measure it; laying lobes on the deformed rim would make the
     outline a function of the form that reads the outline (apexScale), which
     is circular, and would move the lobes every time a form slider moved.

     THE CUT PROFILE within one period, from crest to crest, is
     ((1 - cos 2 pi x) / 2) ^ q — LOBE TIP SHAPE's q: 0.5 a pointed crest
     (near x = 0 the bump is (pi x)^(2q), a V at q = 0.5, round above it),
     1.0 the cosine, 2.0 a flat-topped crest with a narrower sinus. Every
     sinus is parabolic at every q: a notch the printer can fill.

     THE WINDOW ENDS ON CRESTS, so the outline meets the base exactly there
     (a BRANCH: outside (u0, u1) the shape is the base's own closure, not a
     multiplication by 1), and the cut is continuous at both ends.

     THE TWO CAPS are derived here, told through the record, and drawn on
     the sliders by bloom.js: the count is the least of what was asked, the
     ladder's capacity for this window over the samples-per-lobe floor
     (ladderWindowCapacity / LOBE_SAMPLES_PER_LOBE — the amendment's rows
     cap) and what the pitch floor allows (floor(window / max(sheet,
     MIN_FEATURE_MM))); under one of either it is NO ROOM, told, and nothing
     is cut (the stamens' ruling: told, never refused, and here there is
     nothing to build); the depth is the least of what was asked and the cap at
     which the deepest sinus reaches the print floor's half-width (see the
     LOBES block above for the derivation). A region that does not exist
     (uCap at or below the root blend's end — the parallel-stub corner)
     builds no cut and says `noRoom`.
     =================================================================== */
  const lobes = (() => {
    if (!lobesEngaged(state)) return null;
    if (!(length > 0)) throw new Error('widthProfile: a lobed outline needs the blade LENGTH in mm to station its lobes on the lamina — pass it');
    const coverage = state.lobeCoverage === undefined ? LOBE_COVERAGE_DEFAULT : Number(state.lobeCoverage);
    const crestShape = state.lobeCrestShape === undefined ? LOBE_SHAPE_DEFAULT : Number(state.lobeCrestShape);
    const notchShape = state.lobeNotchShape === undefined ? LOBE_SHAPE_DEFAULT : Number(state.lobeNotchShape);
    const countAsked = state.lobeCount === undefined ? LOBE_COUNT_DEFAULT : Number(state.lobeCount);
    const depthAsked = Number(state.lobeDepth);
    const pitchFloorMm = lobePitchFloor(ring.thickness);
    /* THE FLOOR the demand is made at. A CAPABILITY may name another — a
       non-shipping configuration, labelled, for the floor demonstration
       (one step below the floor cannot be reached by any control). */
    const samplesPerLobe = cap && cap.lobeSamplesPerLobe ? Number(cap.lobeSamplesPerLobe) : lobeSamplesPerLobe(crestShape, notchShape);
    const buckleFreq = buckleIsFlat(state) ? 0 : Number(state.buckleFreq);
    const base = { coverage, crestShape, notchShape, countAsked, depthAsked, pitchFloorMm, samplesPerLobe };
    const noRoom = (why, extra = {}) => ({ ...base, noRoom: true, noRoomWhy: why, countBuilt: 0, rowsCapacity: 0, countRowsCap: 0, countFloorCap: 0, countCap: 0,
      countClamped: countAsked > 0, clampedBy: why === 'region' ? 'rows' : why,
      depthBuilt: 0, depthCap: 0, depthClamped: depthAsked > 0, pitchMm: 0, pitchBelowFloor: false, windowMm: 0, regionMm: 0,
      windowU: [uCap, uCap], askedWindowU: [uCap, uCap], sinusU: [], crestU: [], cutAt: () => 0, u0: uCap, u1: uCap, demand: null,
      crestAngleDeg: null, notchAngleDeg: null, angleChordMm: 0, ...extra });
    if (!(uCap > ROOT_BLEND_END)) return noRoom('region');
    const laminaHalf = (u) => Math.max(shapeBaseAt(u), rootBlend(u), TIP_HALF_MM);
    const table = rimArcTable((u) => [u * length, laminaHalf(u), 0], breaksOf(winnerOf(shapeBaseAt)), uPk, LOBE_ARC_SAMPLES);
    const s0 = table.sAt(ROOT_BLEND_END), s1 = table.sAt(uCap);
    const regionMm = s1 - s0;
    const windowMm = coverage * regionMm;
    const sStart = s1 - windowMm;
    const u0 = coverage >= 1 ? ROOT_BLEND_END : table.uAt(sStart);
    const u1 = uCap;
    /* THE TWO CAPS, from the other direction each: the ladder's rows cannot
       be too few for a lobe (capacity over the floor), and the teeth cannot
       be too fine for the printer (the window over the pitch floor). The
       count is the least of asked and both; under one it is NO ROOM, told,
       and nothing is cut. */
    const rowsCapacity = ladderWindowCapacity(u0, u1, buckleFreq);
    const countRowsCap = Math.floor(rowsCapacity / samplesPerLobe + 1e-9);
    const countFloorCap = Math.floor(windowMm / pitchFloorMm + 1e-9);
    const countBuilt = Math.min(countAsked, countRowsCap, countFloorCap);
    if (countBuilt < 1) return noRoom(countRowsCap < 1 ? 'rows' : 'pitch', { rowsCapacity, countRowsCap, countFloorCap, windowMm, regionMm, askedWindowU: [u0, u1] });
    const countClamped = countAsked > countBuilt;
    const clampedBy = !countClamped ? null : (countFloorCap < countRowsCap && countFloorCap < countAsked) ? 'pitch' : 'rows';
    const pitchMm = windowMm / countBuilt;
    /* False by construction now that the pitch cap clamps the count all the
       way down; kept as telemetry the gate asserts false. */
    const pitchBelowFloor = pitchMm < pitchFloorMm - 1e-9;
    const crestU = [], sinusU = [];
    for (let k = 0; k <= countBuilt; k++) crestU.push(k === 0 ? u0 : k === countBuilt ? u1 : table.uAt(sStart + k * pitchMm));
    for (let k = 0; k < countBuilt; k++) sinusU.push(table.uAt(sStart + (k + 0.5) * pitchMm));
    let hMin = Infinity;
    for (const us of sinusU) hMin = Math.min(hMin, shapeBaseAt(us));
    const depthCap = Math.max(0, 1 - TIP_HALF_MM / hMin);
    const depthBuilt = Math.min(depthAsked, depthCap);
    const depthClamped = depthAsked > depthCap;
    const cutAt = (u) => depthBuilt * lobeCutProfile((table.sAt(u) - sStart) / pitchMm, crestShape, notchShape);
    /* THE DRAWN INCLUDED ANGLES, so the read-out can answer Eva's control by
       its own name ("notch angle") in degrees without the CONTROL carrying
       degrees — which it must not, because the angle a given exponent draws
       depends on the depth, the pitch and the local half-width, so a slider
       calibrated in degrees would say 90 and draw something else the moment
       any of the three moved.

       NAME THE SAMPLING: this is the angle of the LAW on the build's own
       outline, read through a chord of ONE EIGHTH OF THIS BUILD'S PITCH
       either side of the feature — a length derived from the feature's own
       length, so it scales with the tooth instead of standing for it. A
       different chord reads a different angle on the same geometry wherever
       the feature is curved (session 40 measured the retired family at two
       chords a decade apart and got 94.2 degrees at one and 180 at the
       other on ONE state), which is why the chord is reported beside the
       angle and never dropped.

       The crest angle needs an INTERIOR crest and so is null at one lobe:
       the window's two ends are the branch boundary between the cut and the
       base outline, and the turn there is the apex/base JOIN that session 38
       measured (-39.7 and -44.7 degrees), a different quantity with a
       different owner.

       AND IT READS THE EMITTED OUTLINE, FLOORS AND ALL, not the cut law's
       own product. Under the shipped depth cap the two agree inside the
       window by construction — the cap is derived so the deepest sinus keeps
       at least the print floor's half-width — but a read-out that reported
       the LAW's angle would be reporting a shape the geometry does not draw
       the moment a floor did bind, and the whole point of printing a degree
       figure here is that it is the one the object carries. Same expression
       the shape term goes through below. */
    const hOf = (uu) => Math.max(shapeBaseAt(uu) * (1 - cutAt(uu)), rootBlend(uu), tipFloor);
    const angleChordMm = pitchMm / 8;
    const includedAt = (uf) => {
      const sf = table.sAt(uf), d = angleChordMm;
      if (!(sf - d > sStart && sf + d < s1)) return null;
      const tL = Math.atan2(hOf(uf) - hOf(table.uAt(sf - d)), d);
      const tR = Math.atan2(hOf(table.uAt(sf + d)) - hOf(uf), d);
      return 180 - Math.abs((tR - tL) * 180 / Math.PI);
    };
    return { ...base, noRoom: false, noRoomWhy: null, countBuilt, rowsCapacity, countRowsCap, countFloorCap, countCap: Math.min(countRowsCap, countFloorCap),
      countClamped, clampedBy, depthBuilt, depthCap, depthClamped, pitchMm, pitchBelowFloor, windowMm, regionMm,
      windowU: [u0, u1], askedWindowU: [u0, u1], sinusU, crestU, cutAt, u0, u1,
      angleChordMm,
      notchAngleDeg: sinusU.length ? includedAt(sinusU[Math.floor(sinusU.length / 2)]) : null,
      crestAngleDeg: countBuilt >= 2 ? includedAt(crestU[Math.round(crestU.length / 2) - 1]) : null,
      /* THE RESOLUTION DEMAND the ladder reads: rows it must place inside
         the window. A count, because that is what a row placer places; the
         floor it comes from is stations per PERIOD. */
      demand: { u0, u1, stations: countBuilt * samplesPerLobe, exact: !!(cap && cap.lobeExactDemand) } };
  })();
  /* THE SHAPE THE FLOORS ARE MAX-ED AGAINST. With no lobes it IS the base
     closure — the branch, not a multiplication by 1 — so the plain petal's
     bytes are the plain petal's bytes. */
  const shapeAt = (lobes === null || lobes.noRoom)
    ? shapeBaseAt
    : (u) => (u > lobes.u0 && u < lobes.u1 ? shapeBaseAt(u) * (1 - lobes.cutAt(u)) : shapeBaseAt(u));
  const hEntry = Math.max(shapeAt(uCap), rootBlend(uCap), tipFloor);

  return {
    uPk, terms, footHalf, uCap, tipFloor,
    /* THE SHAPE TERM BEFORE THE FLOORS — on a lobed profile the cut one, on a
       plain profile the base's own closure. The L family re-derives the depth
       cap from a plain profile's `shapeAt` at the sinus stations. */
    shapeAt,
    /* The cap's entry and terminal half-widths, reported for the gates and
       the contact sheet rather than re-derived by either. */
    capEntryHalf: hEntry, capTerminalHalf: tipFloor,
    /* WHICH TERM WON, from the ONE expression that decides it. The turning
       ladder needs to know where the LAW is the active branch — a kink's
       turning is a delta function, so it must not integrate through the
       root-blend or tip-floor joins. Answering that with its own copy of the
       `max` below would be a second, independent statement of the same fact,
       which is precisely how this project's most repeated defect starts (the
       harness predicate that did not know `buckleAmp` existed, session 34).
       So it is answered HERE, beside the max it is about, and a term added to
       the max is a term this reads by construction. */
    lawIsActiveAt(u) {
      const shape = shapeAt(u), blend = rootBlend(u);
      return shape >= blend && shape >= tipFloor;
    },
    /* THE RESOLUTION DEMAND (Eva's amendment, session 38): the rim feature
       tells the one row placer how many stations its window needs, and the
       placer satisfies it — the lobes never place a station themselves.
       Null on a plain petal and under NO ROOM, so the ladder's path there is
       today's to the bit. */
    ladderDemand() { return lobes !== null && !lobes.noRoom ? lobes.demand : null; },
    /* THE LADDER'S OWN VIEW OF THE PROFILE, AT THE EXPORT FLOOR IN BOTH MODES.
       Row POSITIONS are topology and the export floor may not touch topology —
       it "is meant to change geometry and never topology", which is the export
       gate's own sentence. But `tipFloor` above is mode-dependent by design, so
       a ladder reading `halfWidthAt` places its rows differently in live and in
       export; `trimPanels` then splits a cleft at the first row index past
       `cleft.from`, that index moves, and the two modes emit different numbers
       of triangles. Measured: 39 of 56 stations differed, and the cleft row
       came back 28,896 live against 28,576 export.

       THE EXPORT FLOOR IS THE REFERENCE, not the live one, for two reasons:
       the export is the object, so the printable minimum is a real property of
       the shape being made rather than a preview convenience; and it is the
       conservative direction — the larger floor truncates the region where the
       superellipse is steepest, so the ladder does not crowd rows into a sliver
       that export flattens anyway. EXPORT-mode stations are therefore
       unchanged by this and only the live preview's sampling moves, to agree
       with the object. */
    ladderHalfAt(u) { return Math.max(shapeAt(u), rootBlend(u), TIP_HALF_MM); },
    ladderLawActiveAt(u) {
      const shape = shapeAt(u), blend = rootBlend(u);
      return shape >= blend && shape >= TIP_HALF_MM;
    },
    /* THE BASE OUTLINE'S HALF-WIDTH — the same three-way max over the shape
       BEFORE any cut. On a plain profile this is halfWidthAt's own double
       (shapeAt IS shapeBaseAt there). The form laws that scale with the
       half-width (cup, cup gradient, the buckle, the apex sweep) read THIS,
       because a lobe removes material from the outline and leaves the sheet's
       surface alone: the cupped, ruffled surface is the same surface with a
       different boundary, never a surface that dents at every sinus.
       Measured before this existed: lobes over a 0.30 x buckle read 63
       within-shell pairs (worst span 0.258 mm), every worst site at a sinus,
       because the ruffle's amplitude stepped with the cut and the true-normal
       offset turned each step into a wedge. */
    halfWidthBaseAt(u) {
      return Math.max(shapeBaseAt(u), rootBlend(u), tipFloor);
    },
    halfWidthAt(u) {
      const shape = shapeAt(u);
      /* THE CAP IS DEMOTED (Eva, session 32, from the rendered sheet). It is a
         PRINT-FLOOR CLAMP and nothing else: the `max` below is the whole of
         it. It was a SHAPE — a straight lerp owning the last fifth — and that
         made the upper range unreachable: with 2.50 ruled the default at
         the time, an asked n of 2.50 drew as 1.740,
         because the lerp overwrote exactly the region the law is about.
         Measured with it demoted, drawn n equals asked n to four decimals at
         every value on both tapers. `uCap` and the entry half-width are kept
         as TELEMETRY for the gates and the sheet; nothing reads them to build. */
      return Math.max(shape, rootBlend(u), tipFloor);
    },
    /* WHICH OF THE THREE WON, BY NAME — the same `max` as halfWidthAt, asked
       which of its arguments it returned. `Math.max` returns one of its
       arguments exactly, so `h === shape` is a statement about that call and
       never a tolerance; a tie is resolved shape, then blend, then floor, and
       a tie IS a crossover, so either answer names the seam correctly. Reads
       the same three values in the same order as halfWidthAt; a term added
       to the max is a term this reports by construction. The rim query
       (petalRim) places integration nodes on the crossovers it finds, because
       the outline is C0 there and a chord laid across a kink loses first
       order rather than second. */
    winnerAt: winnerOf(shapeAt),
    /* THE OUTLINE'S SLOPE BREAKS, LOCATED: every u where the winning term
       changes (bisected to the crossover between two grid cells that name
       different winners), plus the CORE's own tip-law join at uPk. Below
       n = 1 the superellipse leaves uPk with an infinite slope, so that
       join is a genuine break; above it the two limbs meet C1 and the node
       is harmless. A term that wins only inside one grid cell (1/grid of u,
       ~0.01 mm at 4096) is not seen — stated here, and the rim query's
       Richardson check is what bounds what that could cost.
       This reports the SHIPPED law's own seams (session 37 measured 44.5
       and 73.7 degrees at u 0.057939 and 0.999562 on the default) and it
       rules nothing about them. */
    slopeBreaks(grid = 4096) {
      const out = breaksOf(winnerOf(shapeAt), grid);
      /* A FEATURE OF THE CUT IS A TANGENT BREAK WHEN ITS LOCAL POWER IS AT
         OR BELOW 1 — a finite non-zero slope at exactly 1, an unbounded one
         below it — and under the two-exponent law (session 41) EITHER
         feature can be one, independently. The SINUS break is new: the
         retired one-exponent family was parabolic at its minimum at every
         value, so a notch could never be a break and none was ever
         declared.

         THE MARGIN IS THE SHIPPED ONE. The retired control declared a break
         below crest power 1.5 (`tipShape < 0.75`, whose crest power is 2q),
         and the same threshold is kept for both features here: a power a
         little above 1 still has a slope of `p r^(p-1)`, which at p = 1.05
         is 63% of the corner's value a ten-thousandth of a period out, so it
         draws as a corner whatever the limit says. Over-declaring costs one
         node in petalRim's arc table; under-declaring costs its accuracy.

         THESE DO NOT REACH THE LOBE STATIONING and cannot: `table` above is
         built on `shapeBaseAt`, the outline BEFORE the cut, so its nodes are
         the base outline's own breaks. A cut that fed its own breaks back
         into the arc it is stationed on would be the circularity the
         stationing comment already refuses. */
      if (lobes !== null && !lobes.noRoom) {
        const before = out.length;
        if (lobes.crestShape < LOBE_BREAK_POWER) for (const u of lobes.crestU) if (u > 0 && u < 1) out.push({ u, kind: 'LOBE_CREST', from: 'CORE', to: 'CORE' });
        if (lobes.notchShape < LOBE_BREAK_POWER) for (const u of lobes.sinusU) if (u > 0 && u < 1) out.push({ u, kind: 'LOBE_SINUS', from: 'CORE', to: 'CORE' });
        if (out.length !== before) out.sort((a, b) => a.u - b.u);
      }
      return out;
    },
    /* THE LOBES' RECORD — what was asked, what was built, the two caps and
       which bound, the pitch against its floor, the window and every
       station; `sinusMinHalfMm` is the deepest sinus AS BUILT (the max with
       the floors applied). Null on a plain petal. The builder adds the rows
       the ladder gave each lobe. */
    lobes: lobes === null ? null : (() => {
      const { cutAt, u0, u1, ...rec } = lobes;
      let sinusMin = Infinity;
      for (const us of rec.sinusU) sinusMin = Math.min(sinusMin, Math.max(shapeAt(us), rootBlend(us), tipFloor));
      return { ...rec, sinusMinHalfMm: rec.sinusU.length ? sinusMin : null };
    })(),
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

/* ===================================================================
   MARGIN BUCKLING — the lettuce edge (session 33, the FIELD and its NORMAL;
   the controls, their ranges and the clamp are part 2).

   WHAT IT IS, and what it is NOT. This is a DISPLACEMENT FIELD of the
   mid-surface, the same family as cup and cross-section roll — it adds a
   term to `aN` in sectAt — the slot cup already occupies. It does NOT touch
   `widthProfile`: `h(u)` is unchanged, `v` still runs -1..1, and the petal's
   plan outline is byte for byte what it was. So it does not compete with the
   tip-shape work for ownership of the outline, and the two can be sequenced
   in either order. A wavy OUTLINE would be a different change with a
   different owner; this is not that.

     w(u, v) = A * h(u) * |v|^p * cos(2 pi f u + phase)

   AMPLITUDE IS A FRACTION OF THE LOCAL HALF-WIDTH, NOT MILLIMETRES (Eva,
   session 33, ruling 1). Scale-free is the principle. An absolute mm
   amplitude fails in one specific way: it is applied UNCHANGED where the
   blade has already tapered to its tip floor, so the tip crumples while the
   body of the blade ripples gently — measured and photographed on the
   discovery sheet's row E. Multiplying by the row's own `h` makes the wave
   taper with the blade, which is what a leaf does.

   `|v|^p` IS WHAT MAKES IT A MARGIN BUCKLE. At p = 0 the whole sheet ripples
   (a different plant); as p rises the wave is confined to the edge. p = 1 is
   C0 AT THE MIDRIB — |v| is not differentiable at 0 — and creases the blade
   down its centre, so part 2's floor is 2 and 1 is out of range rather
   than merely discouraged.

   THE RAMP. The field rides `ramp(u)`, the same onset the other curves use,
   so it is exactly 0 at u = 0 and the FOOT and root blend are untouched by
   construction rather than by a special case.

   THE ONE PLACE IT IS NOT LIKE CUP AND ROLL, and the reason this session
   exists. Cup and roll are functions of `v` alone at a given row, so the
   row's cross-section is a PLANE CURVE and the shipped normal — `dP/dv`
   rotated a quarter turn in the row's own (T, N) plane — is the surface
   normal to the accuracy the along-length variation allows. Every existing
   deformation varies SLOWLY along u (a taper, an onset ramp), which is what
   makes that approximation good. A buckle varies FAST along u; that is what
   a buckle IS. Measured on the discovery rig: the cross-section normal sits
   up to 71 degrees off the true surface normal at the top corner, and 29
   degrees at a moderate setting. Offsetting the two skins along it makes a
   WEDGE, not a sheet. So the buckled branch takes its normal from
   `cross(dP/du, dP/dv)` instead — see `trueNormalRows` in buildPetalInto,
   which is the ONE place that happens.
   =================================================================== */
/* THE THREE RANGES ARE THE GEOMETRY'S, AND THE REGISTRY IMPORTS THEM. Q6's
   discipline: a slider wider than the law was reasoned on would make a bound
   false with nothing failing, so the ONE owner is here and the harness fails
   at module load if the registry's import quietly became a literal.

   AMPLITUDE is a FRACTION OF THE LOCAL HALF-WIDTH (Eva, ruling 1) — never
   millimetres, because an absolute amplitude is applied unchanged where the
   blade has tapered to its tip floor and crumples the point.

   FREQUENCY is in CYCLES along the blade and is CAPPED AT 7 (ruling 4). It
   starts at 1, not 0: a zero would be a second way to say "no buckle" beside
   amplitude 0, and a control whose bottom step means what another control's
   bottom step already means is a dead step by construction. Seven is where
   NU = 56 still gives 8 rows per cycle, the bar below which the emitted
   polyline stops being the law's curve.

   THE FALLOFF EXPONENT p (Eva's amendment, from the reference photographs) —
   "how far the ruffle reaches in from the edge", higher = more confined. TWO
   is a FLOOR and not a taste: |v| is not differentiable at 0, so p = 1 is C0
   at the midrib and creases the blade down its centre. p is what separates
   the two references — a bearded iris ruffles at high amplitude AND wide, a
   rose at low amplitude AND narrow — and one fixed exponent draws one or the
   other, never both. */
export const BUCKLE_AMP_RANGE = Object.freeze([0, 0.6]);
export const BUCKLE_FREQ_RANGE = Object.freeze([1, 7]);
export const BUCKLE_ENV_RANGE = Object.freeze([2, 6]);

/* THE APEX SWEEP's range (session 35), exported for the registry to IMPORT
   rather than restate — Q6, and the harness fails at module load if this
   became a literal there. 0 is the shipped build, bit for bit. */
export const APEX_SWEEP_RANGE = Object.freeze([0, 1]);
export const BUCKLE_ENV_DEFAULT = 3;
export const BUCKLE_FREQ_DEFAULT = 3;
/* Rows per cycle below which the emitted polyline is not the law's curve.
   NU is 56, so the frequency ceiling above is exactly NU / this. */
export const BUCKLE_ROWS_PER_CYCLE_MIN = 8;

/* ===================================================================
   LOBES ON THE RIM (session 38, PR 2) — THE RANGES, THE TWO CAPS AND THE
   ENGAGEMENT PREDICATE. The cut itself lives in widthProfile(), the
   outline's one owner; nothing here builds geometry.

   THE RULINGS THIS IMPLEMENTS (the brief, binding): lobes are CUT IN, never
   built out — material is removed from the existing outline and nothing is
   appended to the boundary (the appendage construction is what put 19 and
   37 detached components into the flower at boundary === 0); the outline
   stays SINGLE-VALUED, one span of material at every u; the count ceiling is
   2–8 at the default coverage and 10 at maximum coverage; the turning-rate
   ladder stays the ONE owner of row placement (lobes place no rows — they
   are part of the outline the ladder reads, and buy their rows through its
   turning term exactly as the buckle does); LOBE TIP SHAPE is its own
   control at the lobe's scale and never touches the whole-petal apex, which
   PETAL TIP SHAPE owns over [uCap, 1]; `coverage` keeps its name (the id is
   namespaced `lobeCoverage`, the label is "Coverage").

   THE COUNT CAP IS THE LADDER'S CAPACITY OVER THE SAMPLES-PER-LOBE FLOOR,
   derived per build and never a ruled pair of numbers (the amendment): the
   lobe feature DEMANDS LOBE_SAMPLES_PER_LOBE stations per lobe of the one
   row placer, the ladder can put at most ladderWindowCapacity(u0, u1) of its
   free rows inside the window without its own gap bound breaking outside
   it, and the count is the least of what was asked, capacity / floor and
   the pitch floor's own cap. The ruled 2-8 / 10-at-max was issued without
   the floor under it and does not survive it — what survives is reported in
   the read-out (`countRowsCap`, `rowsCapacity`) and in docs §B10, plainly.
   NAME THE SAMPLING: the built rows-per-lobe is MEASURED on the emitted
   stations and printed (L6), and L6 asserts the demand was met.

   THE PITCH FLOOR IS A PHYSICAL LENGTH, derived from one: max(the emitted
   sheet thickness, MIN_FEATURE_MM). A lobe pitch under it is two teeth the
   printer cannot separate. The count is clamped to floor(window / floor),
   told as CLAMPED, and the read-out prints the floor beside the pitch.

   THE DEPTH CAP IS WHERE "ONE SPAN OF MATERIAL" STOPS BEING TRUE, derived
   per build: the depth is a fraction of the LOCAL half-width (scale-free,
   the buckle's own ruling, so a deep cut on a wide row and a shallow one on
   the tip row are the same slider position), the sinus keeps
   `(1 - depth) * h` of half-width, and at depth 1 the sinus reaches the
   midrib and the petal is DIVIDED — which is a split petal, out of scope.
   The cap is the depth at which the deepest sinus reaches the print floor's
   half-width (TIP_HALF_MM, the same 1.60 mm span the apex face keeps):
   depthCap = 1 - TIP_HALF_MM / min over the sinuses of the base half-width.
   Below it every u carries a span wider than the print floor; above it the
   floor holds the width and the travel is dead — told, and marked.
   =================================================================== */
export const LOBE_COUNT_RANGE = Object.freeze([2, 10]);
export const LOBE_DEPTH_RANGE = Object.freeze([0, 1]);
export const LOBE_COVERAGE_RANGE = Object.freeze([0.1, 1]);
/* THE TWO SHAPE EXPONENTS share one range and one default: they are the same
   KIND of quantity — a local power at a feature — read at two different
   features, so a value means the same thing in either control. The step is
   petalTipShape's own, and the range is the range Eva's brief named. */
export const LOBE_SHAPE_RANGE = Object.freeze([0.6, 3]);
export const LOBE_SHAPE_STEP = 0.05;
export const LOBE_SHAPE_DEFAULT = 2;
/* The local power at or below which a feature of the cut is a TANGENT BREAK
   and is declared as one. The retired control's own margin — see slopeBreaks. */
export const LOBE_BREAK_POWER = 1.5;
export const LOBE_COUNT_DEFAULT = 6;
export const LOBE_COVERAGE_DEFAULT = 0.8;
/* THE SAMPLES-PER-LOBE FLOOR — DERIVED, and the reason the count is what
   it is (Eva's ruling amendment, session 38). The first lobe sheet stood on
   a sampling floor: 3.0 rows per lobe at eight lobes and 4.2 at six drew
   three tip shapes as three identical triangle waves, the control inert to
   the eye — the buckle's own f 7 at NU 28, four samples per period cannot
   carry a shape. `node tools/bloom-lobe-resolution.mjs` derives the floor:
   one period of the law at the sheet's own depth and pitch, its polyline
   through n stations placed as the LADDER places them (turning plus the arc
   share, ends on crests), and two clauses — every tip shape's BROAD feature
   (the round sinus of 0.50, the flat crest of 2.00, either of 1.00's) spans
   at least two station gaps, so it is drawn as a bend and not a corner; and
   every pair is drawn further apart than either drawing's own chord error
   while keeping half the laws' true separation. The floor is 11 under the
   ladder's placement and 10 under a uniform one: the ladder's rows land on
   the SHOULDERS, where the outline turns, and leave the round bands' centres
   the widest gaps, and the binding shape is the default 1.00, whose crest
   and sinus bands (0.205 of the period each) are the narrowest broad
   feature in the range. NAME THE SAMPLING: this is stations per lobe PERIOD,
   scale-free by construction, and the demand it sets is a COUNT of rows in
   the window that the ladder must place — see ladderWindowCapacity and
   bladeStations. Ten happens to be the buckle's own bar plus two; eight is
   what the three-lobe cell had, and it was not picked. */
export const LOBE_SAMPLES_PER_LOBE = 11;
/* The lamina arc table's density for stationing (rimArcTable cells). 1024
   rather than petalRim's 4096 because it runs per petal on every rebuild:
   the residual scales with the cell squared on the smooth stretches, and the
   graded patches carry the outline's own singular points at any density
   (PR 1's R3 table), so 1024 is within ~2e-4 mm of the limit on the default
   — three orders under the pitch floor. */
export const LOBE_ARC_SAMPLES = 1024;
/* THE GUARD. `!x` rather than `=== 0` for the reason buckleIsFlat gives: a
   state with no registry row reads the key as undefined and must read as
   plain. The registry's twin is PREDICATES.lobesEngaged; the harness checks
   the two agree at load and on every row (L0). */
export function lobesEngaged(state) { return !!state.lobeDepth; }
/* THE LADDER'S CAPACITY FOR A WINDOW — how many of its free rows it can
   place inside [u0, u1] without the rows OUTSIDE breaking its own widest-gap
   bound (LADDER_MAX_GAP_FACTOR / NU in u, or uniform at the buckle's
   frequency cap). The rows below ROOT_BLEND_END are held and never counted;
   the stretch between the last held row and u0 needs ceil(its length / the
   gap) gaps, whose interior stations are outside the window; the tip above u1
   needs ceil(its length / the gap) stations including u = 1. What is left of
   NU - held is the window's. The lobes' count cap is this over the
   samples-per-lobe floor — the ONE derivation of "how many lobes the rim can
   carry", and it is the ladder's, not a ruled number: 8 and 10 were ruled
   without this floor under them and do not survive it (docs, §B10). */
export function ladderWindowCapacity(u0, u1, buckleFreq = 0) {
  /* HELD_ROWS is the ONE owner of this count (session 38): it stood in three
     places, which is what made an anchored mutation match three times. */
  const held = HELD_ROWS;
  const free = NU - held;
  /* AT THE BUCKLE'S FREQUENCY CAP THE LADDER IS UNIFORM, BY THE BUCKLE'S OWN
     RULE (56 rows over 7 cycles is 8 per cycle with no slack; A8 asserts it),
     so the window's capacity there is what the uniform ladder puts in it —
     counted, not bounded — and a demand is served by exactly those rows. */
  if (ladderGapFactor(buckleFreq) === 1) {
    let n = 0;
    for (let k = held + 1; k <= NU; k++) { const u = k / NU; if (u > u0 && u <= u1) n++; }
    return n;
  }
  const gap = ladderGapFactor(buckleFreq) / NU;
  const stretch = Math.max(0, u0 - held / NU), tip = Math.max(0, 1 - u1);
  const outside = Math.ceil(stretch / gap - 1e-9) + Math.ceil(tip / gap - 1e-9);
  return Math.max(0, free - outside);
}
/* The two outside regions' minimum station counts under the bound, the same
   arithmetic as the capacity's, exposed for the ladder's own use so the two
   cannot drift: the stretch's rows run from the last held row up to u0 (its
   last row AT u0), the tip's from u1 up to 1 (its last row AT 1). */
export function ladderOutsideMinima(u0, u1, buckleFreq = 0) {
  /* HELD_ROWS is the ONE owner of this count (session 38): it stood in three
     places, which is what made an anchored mutation match three times. */
  const held = HELD_ROWS;
  const gap = ladderGapFactor(buckleFreq) / NU;
  return { held, minStretch: Math.ceil(Math.max(0, u0 - held / NU) / gap - 1e-9), minTip: Math.ceil(Math.max(0, 1 - u1) / gap - 1e-9) };
}
export function lobePitchFloor(sheetThicknessMm) { return Math.max(sheetThicknessMm, MIN_FEATURE_MM); }

/* ===================================================================
   THE CUT PROFILE — ONE PERIOD, TWO INDEPENDENT EXPONENTS (session 41).

   THE FAMILY. In the crest-to-sinus coordinate `r` (0 at a crest, 1 at a
   sinus), the cut is

       g(r) = r^a / (r^a + (1 - r)^b)

   and the period is the even extension of it through the triangle phase
   `r = 1 - |2f - 1|`, so a crest sits at f = 0 and a sinus at f = 1/2.

   WHAT a AND b ARE: the LOCAL POWER of the cut at its own feature, exactly.
   Near r = 0 the denominator tends to 1, so g ~ r^a; near r = 1 it tends to
   1 the other way, so 1 - g ~ (1 - r)^b. Measured by log-log slope, a and b
   come back to six figures and NEITHER MOVES WITH THE OTHER — which is the
   whole point, and is what the shipped family could not do.

   WHAT THE SHIPPED FAMILY COULD NOT DO, and why no range fixed it (session
   40 established this as an identity): `((1 - cos 2 pi f)/2)^q` is
   `sin(pi f)^{2q}`, whose expansion about the sinus is `1 - q pi^2 e^2 +
   O(e^4)` for EVERY exponent. So the notch was parabolic — 180 degrees
   included — at every value of the one control, while the crest's power was
   2q. One exponent, two features, coupled: `q` bought a pointed crest only
   by rounding the notch and a tight notch only by flattening the crest.

   WHY NOT THE SUPERELLIPSE, which the brief asked for by preference so the
   generator would carry one law family. Three forms were tried and the
   reasons are measurements, not taste:
     - ONE exponent (`(1 - (1-r)^n)^{1/n}` and friends) gives crest power n
       and notch power 1/n — COUPLED INVERSELY, which is the very trade
       session 40 measured. It cannot reach "both acute" anywhere.
     - TWO exponents as a Lame curve, `g = (1 - (1-r)^b)^a`, does decouple
       them (crest a, notch b) but is NOT SYMMETRIC when a = b: at a = b = 2
       it reads g(1/2) = 0.5625 rather than 0.5, so equal settings would draw
       a lopsided wave and the two controls would not read as calibrated
       against each other.
     - The PIECEWISE POWER (`(2r)^a / 2` below the midpoint, mirrored above)
       is symmetric and exact at the features, but its two halves meet with
       slopes a and b, so it puts a THIRD tangent break mid-flank whenever
       a != b — a crease down the side of every tooth.
   The ratio above has all three properties the others each miss one of:
   exact independent powers, g(1/2) = 1/2 whenever a = b, and C-infinity
   strictly inside the period (a ratio of smooth functions over a positive
   denominator), so the only tangent breaks it can carry are AT its two
   features, which is where they belong.

   THE SYMMETRY IS EXACT, not approximate: swapping a and b and reflecting
   r -> 1 - r gives 1 - g(r) identically, so the crest control and the notch
   control are the same control read at opposite ends of the tooth.

   TWO EXACT VALUES, and both are load-bearing. g(0) = 0 and g(1) = 1 to the
   bit (the numerator or the denominator's second term is exactly 0 there,
   at every exponent, including the cusped ones where `Math.pow(0, 0.6)` is
   0), so the crests still meet the base outline EXACTLY and L6's `Object.is`
   clause holds unchanged. And at a = b = 1 the law is the TRIANGLE WAVE to
   the bit — `r + (1 - r)` is exactly 1 in IEEE-754 over the whole unit
   interval (measured: max |g(r) - r| = 0 over 100001 samples), so the
   serrate margin is drawn by the identity rather than approached.

   IT COMPOSES, and that is a property of the FORM rather than a feature.
   The cut enters the outline as a REDUCTION FACTOR — `shapeBase * (1 - cut)`
   — so a second, shorter-wavelength level is one more factor in the same
   product, `shapeBase * (1 - cut1) * (1 - cut2)`, which stays in (0, 1] by
   construction and therefore cannot make the outline multi-valued however
   the two levels are set. The law is a function of a PHASE alone, so the
   second level needs only its own phase, count and pair of exponents; it
   needs no change here.
   =================================================================== */
export function lobeCutProfile(f, crest, notch) {
  const ph = f - Math.floor(f);
  const r = 1 - Math.abs(2 * ph - 1);
  const P = Math.pow(r, crest), Q = Math.pow(1 - r, notch);
  return P / (P + Q);
}

/* ===================================================================
   THE RESOLUTION DEMAND, AS A FUNCTION OF THE SHAPE (session 41, Eva's
   item 3). Session 38 derived ONE constant, 11 stations a lobe, from the
   shipped family's three tip shapes; session 40 measured that the floor is
   NOT constant across that family (10 / 11 / 8 at q 0.50 / 1.00 / 2.00) and
   peaks in the middle. With two independent exponents the floor is a
   surface, and it is what decides the count ceiling — so the count the user
   can reach is now a function of the shape they asked for.

   THE DERIVATION HAS ONE OWNER AND IT IS NOT THIS FILE.
   `node tools/bloom-lobe-resolution.mjs` derives every cell from its own
   clauses — one period of the law at the sheet's own depth and pitch, its
   polyline through n stations placed as the LADDER places them, and the
   clauses below — and PRINTS the table in exactly the form it is pasted
   here. `--verify` re-derives it and compares cell for cell, which is the
   table's only independent witness: the harness's L3 reads this table, so
   L3 can prove the record carries the demand the shape asks for and can
   never prove the table itself.

   THE CLAUSES, and what changed from session 38's:
     (i)  THE BINDING FEATURE IS THE WIDER BAND (session 38, unchanged), and
          its band must span `2 x roundness` station gaps, where roundness
          is `clamp(power - 1, 0, 1)`. Session 40 stated the premise in
          prose — "a corner does not need resolving; a station either side of
          it draws it exactly. What needs resolving is the ROUND band" — and
          its formula did not implement it, because on the shipped family the
          distinction never bit: the binding feature there is parabolic or
          flatter on every reachable value, so the weight is 1 and the bar is
          session 38's own "two station gaps", EXACTLY. The generalisation is
          therefore proved to be one: it reproduces 10 / 11 / 8 and the
          uniform 7 / 10 / 6 on all three shipped shapes.
          A BINARY corner test was tried first and rejected by measurement:
          it put a step from 2 to 20 stations between notch 1.00 and 1.25,
          which is a cliff in the count ceiling under one slider step. The
          weight is continuous, so no step of either control can collapse
          the count.
     (ii) THE PAIRWISE CLAUSE (session 38) is unchanged and is a statement
          about a SET, so it sets the ceiling rather than a cell.
     (iii) THE PHASE THE MODEL DOES NOT PIN — NEW, and it is why no cell
          reads 2. The per-period model places the period's ends ON crests,
          which is what the builder does at the WINDOW's two ends and at no
          interior crest; so the model reads the FAVOURABLE phase. Measured
          over 200 offsets, the drawn tooth at 2 stations a period ranges
          from 100% of its true amplitude down to ZERO — at the worst phase
          both stations land at mid-flank and the tooth vanishes entirely,
          for every shape. The clause is that the drawn amplitude keeps at
          least HALF at EVERY phase, which is clause (ii)'s own ruled
          "keeps at least half" convention applied to the amplitude. It
          binds only where clause (i) has gone quiet, and it is slack on the
          whole shipped family (4 / 3 / 3 against clause (i)'s 10 / 11 / 8),
          so session 38's ruled constant is untouched by it.

   NO CELL EXCEEDS `LOBE_SAMPLES_PER_LOBE`, and that is asserted rather than
   clamped: the ruled constant stays the CEILING of the surface, and this
   session's contribution is the reduction below it where the shape is sharp.
   =================================================================== */
export const LOBE_DEMAND_ROWS = Object.freeze([
/* DERIVED — do not edit by hand. Regenerate with:
 *   node tools/bloom-lobe-resolution.mjs --table
 * 49 x 49 cells over [0.6, 3] at a step of 0.05: row = the CREST
 * exponent, column = the NOTCH exponent, the cell the demand in base 36.
 * `--verify` re-derives every cell from the clauses and compares. */
  '55553333333345555688888899aaaaaaaaaaaaaaaaaaaaaaa',   // crest 0.60
  '555333333333455556788888999aaaaaaaaaaaaaaaaaaaa88',
  '553333333333455556788888999aaaaaaaaaaaaaaaaaa8888',
  '5333333333334555567888889999aaaaaaaaaaaaaaaa88888',
  '3333333333334455556788888999aaaaaaaaaaaaaaa888888',
  '3333333333334455556788888999aaaaaaaaaaaaa88888888',
  '33333333333334555566788888999aaaaaaaaaa8888888888',
  '333333333333345666667888888999999aaaa888888888888',
  '3333333333333446666667888889999999888888888888888',
  '3333333333333446666667888889999999888888888888888',
  '333333333333344666666788888999999aa88888888888888',
  '333333333333344666666778888999999aa88888888888888',
  '44444444444444466666677888899999aaa88888888888888',
  '5555444444444446666667788889999aaaaa8888888888888',
  '555555554444444566666778888999aaaaaa8888888888888',
  '666555555555555566666778888999aaaaaa8888888888888',
  '66666655555555555666677888899aaaaaaaa888888888888',
  '66666666555555555566677888899aaaaaaaa888888888888',
  '77776666666666666666677888899aaaaaaaa888888888888',
  '7777776666666666666667778889aaaaaaaaa888888888888',
  '7777777766666666666667778889aaaaaaaaaa88888888888',
  '8888777777777777777777778889aaaaaaaaaa88888888888',
  '8888887777777777777777778889aaaaaaaaaa88888888888',
  '8888888777777777777777778889aaaaaaaaaaa8888888888',
  '9999888888888888888888888889aaaaaaaaaaa8888888888',
  '9999998888888888888888888889aaaaaaaaaaa8888888888',
  '9999999888888888888888888889aaaaaaaaaaaa888888888',
  'aaaa999999999999999999999999aaaaaaaaaaaa888888888',
  'aaaaaa99999999999999999999999aaaaaaaaaaa888888888',
  'aaaaa9999999999999999999999999aaaaaaaaaa888888888',
  'aaaaa99999999999999999999999999aaaaaaaaaa88888888',
  'aaaa9999999999999999999999999999aaaaaaaaa88888888',
  'aaa999999999999999999999999999999aaaaaaaa88888888',
  'aa99999999999999999999999999999999aaaaaaa88888888',
  '99999999899999999999999999999999999aaaaaaa8888888',
  '999999998888999999999999999999999999aaaaaa8888888',
  '9999999988888888999999999999999999999aaaaa8888888',
  '99999998888888888888999999999999999999aaaaa888888',
  '999999988888888888888889999999999999999aaaa888888',
  '9999998888888888888888888899999999999999aaa888888',
  '99999988888888888888888888888899999999999aa888888',
  '999998888888888888888888888888888899999999aa88888',
  '9999988888888888888888888888888888888999999a88888',
  '9999888888888888888888888888888888888888899988888',
  '9998888888888888888888888888888888888888888888888',
  '9888888888888888888888888888888888888888888888888',
  '8888888888888888888888888888888888888888888888888',
  '8888888888888888888888888888888888888888888888888',
  '8888888888888888888888888888888888888888888888888',   // crest 3.00
]);

/* The demand for one period at these two exponents. Base-36 so a cell is one
   character; the index is the control's own step, so every reachable slider
   position has its own cell and nothing is interpolated. */
export function lobeSamplesPerLobe(crest, notch) {
  const last = LOBE_DEMAND_ROWS.length - 1;
  const ix = (v) => Math.min(last, Math.max(0, Math.round((Number(v) - LOBE_SHAPE_RANGE[0]) / LOBE_SHAPE_STEP)));
  return parseInt(LOBE_DEMAND_ROWS[ix(crest)][ix(notch)], 36);
}

/* THE PER-SLOT PHASE (Eva, ruling 5) — DERIVED, never a control. One phase
   for the whole whorl makes every petal identical, which reads machined; the
   slot index at the golden angle spreads them so no two petals in a reachable
   count share one, and it is deterministic, so the same design rebuilds the
   same bloom. GOLDEN_ANGLE is the arrangement's own constant, read rather
   than restated. */
export function bucklePhaseForSlot(slotIndex) { return slotIndex * GOLDEN_ANGLE; }
/* THE GUARD. Either factor absent means no field, and the whole buckle layer
   is then skipped by a BRANCH — not by an argument that multiplying by zero
   is exact. Written as `!x` rather than `x === 0` because with no registry
   row for these keys yet, every shipped build reads them as `undefined`;
   part 2's controls make them real numbers whose defaults are 0, and the
   predicate is true in both worlds. */
export function buckleIsFlat(state) { return !state.buckleAmp || !state.buckleFreq; }
/* THE CLAMP — CAP THE OUTPUT, NEVER AN INPUT PROXY, spineLaw's own treatment:
   full ranges exposed, the built curvature clamped, and the read-out told
   what was asked beside what was built.

   WHAT IS BOUNDED. Along the margin the field is `A*h*cos(2 pi f s / L)`, so
   its curvature there is `A*h*(2 pi f / L)^2` — the |v|^p envelope is exactly
   1 at v = +/-1 whatever p is, which is why THIS bound does not see p at all.
   Floored at the roll floor's own radius, one sheet thickness, the largest
   amplitude that clears it is

       A_max = L^2 / (h * (2 pi f)^2 * ROLL_MIN_RADIUS_FACTOR * t)

   and `h` is the NOMINAL half-width rather than a row's own, so the bound
   protects the widest row instead of only the row it was evaluated at — the
   roll floor's discipline, which expresses itself against the THICKEST row.

   WHAT IT DOES NOT BOUND, said here rather than discovered later. This is a
   bound on ONE principal direction of ONE term. It does not see the ACROSS-
   WIDTH curvature, which is where p acts (`A*p*(p-1)/h` at the margin, so 2,
   6 and 30 at p = 2, 3 and 6), and it does not see curvature the cup, the
   roll or the spine have already spent — measured in part 1: a buckle over
   cup 1.2 and curl 180 DIVERGES under refinement where this bound says it is
   clear. It is NECESSARY AND NOT SUFFICIENT, it ships as ruled, and what a
   sufficient condition would look like is measured and reported in
   docs/bloom-session-34-outcome.md rather than decided here. */
export function buckleAmpCap({ halfW, length, floorRadius, freq }) {
  if (!freq || !halfW || !length) return Infinity;
  const k = (2 * Math.PI * freq) / length;
  return 1 / (halfW * k * k * floorRadius);
}

export function buckleLaw(state, ctx = null) {
  const asked = state.buckleAmp, f = state.buckleFreq;
  const p = state.buckleEnv === undefined ? BUCKLE_ENV_DEFAULT : state.buckleEnv;
  /* The phase is the SLOT's, derived; `bucklePhase` survives only as the
     instruments' own way in and is degrees, as it was in part 1. */
  const ph = ctx && ctx.slotIndex !== undefined
    ? bucklePhaseForSlot(ctx.slotIndex)
    : (state.bucklePhase || 0) * (Math.PI / 180);
  const cap = ctx ? buckleAmpCap({ ...ctx, freq: f }) : Infinity;
  const A = Math.min(asked, cap);
  const clamped = asked > cap;
  /* `w` takes the row half-width rather than closing over one: the amplitude
     is a fraction of the LOCAL half-width, so h is a per-row input and a law
     that captured a single h would be the absolute-mm parameterisation
     wearing this one's name. */
  /* The tightest ALONG-MARGIN radius this build actually has, and the one it
     was asked for — the read-out prints both, spineLaw's `turnBuilt` beside
     `turnAsked`. Infinity where there is no curvature to report. */
  const radiusAt = (amp) => {
    if (!ctx || !amp) return Infinity;
    const k = (2 * Math.PI * f) / ctx.length;
    return 1 / (amp * ctx.halfW * k * k);
  };
  return {
    A, f, p, phaseRad: ph,
    ampAsked: asked, ampBuilt: A, ampCap: cap, clamped,
    radiusMm: radiusAt(A), radiusAskedMm: radiusAt(asked),
    floorRadiusMm: ctx ? ctx.floorRadius : null,
    /* THE ACROSS-WIDTH CURVATURE AT THE MARGIN, which the cap above does not
       bound. Reported so the read-out and the instruments read one owner
       rather than three re-derivations of `p*(p-1)`. */
    crossCurvatureAtMargin: ctx ? (A * p * (p - 1)) / ctx.halfW : null,
    w: (u, v, h) => A * h * Math.pow(Math.abs(v), p) * Math.cos(2 * Math.PI * f * u + ph),
    /* d/da at a = h*v, which is the convention dT/dN already use (roll's
       cos(k*a); cup's `2*c*v`, which is d(c*a^2/h)/da). Differentiating in v
       instead overstates the cross-width slope by a factor of h — about 8 mm
       on the shipping petal — and the discovery rig read a thinning that was
       the instrument's before this was written down. */
    dwda: (u, v, h) => (v === 0 && p > 1 ? 0
      : A * p * Math.pow(Math.abs(v), p - 1) * (v < 0 ? -1 : 1) * Math.cos(2 * Math.PI * f * u + ph)),
  };
}

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
      && state.petalCupGradient === 0
      /* MARGIN BUCKLING (session 33) joins the guard for the same reason
         cupGradient did: this predicate is what decides whether petalForm()
         is CONSTRUCTED AT ALL, and at the shipping default it is true. A
         buckle wired only inside sectAt would be a dead slider — measured on
         the discovery rig, which built the field, saw an identical triangle
         count and an identical byte, and was right to. */
      && buckleIsFlat(state);
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
   SESSION 38 RE-DERIVED WHICH ROW THAT IS. The seam clearance can start the
   blade's row lattice at row m rather than row 1, and "one blade row" has to
   go on meaning THE FIRST ONE or the property above quietly stops holding —
   so `curlStartFloored` takes a `startFloor` (the first blade station) beside
   `CURL_START_MIN`, and the two are maxed. At every state where the seam
   floor does not bind the two are the same number and nothing moves.
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
export function curlStartFloored(start, startFloor = CURL_START_MIN) { return start === 0 ? 0 : Math.max(start, CURL_START_MIN, startFloor); }
export function spineLaw({ curlRad, bias, start, length, tilt, floorRadius, startFloor = CURL_START_MIN }) {
  const p = CURL_BIAS_POWER * bias;
  const s0 = curlStartFloored(start, startFloor);
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
    /* EXACT AT ANY STATION, not only at a substep. This used to be
       `Math.round(s / ds)` — a SNAP to the nearest tabulated substep, which
       is exact when and only when every station is substep-aligned. Uniform
       blade rows always were (`(i/NU)*length` is substep `i*SPINE_SUBSTEPS`
       exactly), so the assumption was invisible; session 32's turning ladder
       moved the rows off the grid and it became a real error of up to ds/2 —
       measured, 8.8e-3 mm, which is what C1 reported while blaming the spine.

       It matters to the GEOMETRY and not only to the gate: `generalSpine`
       (any curl bias or start) is the one arm of the builder that evaluates
       this rather than the closed-form arc, so a snapped `at()` would have
       quantised those rows' own centreline to the substep grid.

       The remaining fraction of a substep is advanced along the SAME arc
       construction the table itself is built with, so at f = 0 this returns
       the tabulated value bit-for-bit and nothing substep-aligned moves. */
    at(s) {
      const x = s / ds, i = Math.min(N, Math.max(0, Math.floor(x))), f = x - i;
      if (!(f > 0) || i >= N) return { dR: dR[i], dZ: dZ[i], phi: phi[i] };
      const k = (phi[i + 1] - phi[i]) / ds;
      const p0 = phi[i], p1 = p0 + k * f * ds;
      if (k === 0) return { dR: dR[i] + Math.cos(p0) * f * ds, dZ: dZ[i] + Math.sin(p0) * f * ds, phi: p1 };
      const pm = (p0 + p1) / 2, sc = f * ds * sinc((p1 - p0) / 2);
      return { dR: dR[i] + Math.cos(pm) * sc, dZ: dZ[i] + Math.sin(pm) * sc, phi: p1 };
    },
    peakRadius: peakK === 0 ? Infinity : 1 / peakK,
    clamped,
    /* A UNIFORM curl whose arc sits under one sheet thickness — told, never
       clamped (see the note at kMax). Exactly false wherever the floor was
       applied, since the clamped peak IS the floor. */
    underFloor: peakK * floorRadius > 1,
    turnBuilt: phi[N] - tilt,
    turnAsked: curlRad,
    startFloored: s0,
    startFloor,
  };
}

/* ===================================================================
   apexScale — THE ONE OWNER of how far the cup and the buckle reach around
   the APEX (session 35).

   THE DEFECT. Cup and margin buckling are both scaled by `h(u)`, the row's
   own half-width: cup `c*h*v^2`, buckle `A*h*|v|^p*cos(...)`. At the apex `h`
   IS the print floor, so the apex is deformed at exactly `amplitude x
   terminalHalf` and its share of the rim's peak is PINNED at
   `terminalHalf / peakHalf` — 10.00% in export, 1.88% live — whatever the
   sliders say. Measured to 9e-16 mm, independent of tip shape, taper, length
   and width. That is why the sides bowl and the apex keeps a point: not
   "undeformed by construction", but deformed at the print floor's share.

   It is a ONE-DIMENSIONAL fact about how the amplitude is scaled, so the fix
   is one dimensional. `S(u)` replaces the `h` in the AMPLITUDE while `v` stays
   the profile coordinate; the OUTLINE is untouched, so this never competes
   with widthProfile() for ownership of the boundary.

   A PER-POINT DISTANCE FIELD WAS BUILT FIRST AND IS RETIRED. Keying the reach
   on the plan distance to the rim creased the blade — principal radius
   0.369 mm against the 1.200 mm floor, mid-blade at u 0.349, nowhere near the
   apex — and its derivative cannot converge, because `R` is looked up at a
   foot point and a foot point on a polyline is not continuous (the field
   itself jumps 7.13e-3 mm across a 1.25e-3 mm step). See
   docs/bloom-session-35-outcome.md.

   THE LAW.  S(u) = h(u)                                    for u <= u0
             S(u) = h(u) + beta * (R - h(u)) * smootherstep((u-u0)/(1-u0))

   R is the TIP'S INSCRIBED RADIUS — the largest disc that fits inside the plan
   outline and touches the apex — and u0 is where h falls to R. Both are
   DERIVED from the profile alone; neither is a threshold and neither is a
   chosen constant. Where the tip is pointed the inscribed radius IS the
   terminal half-width, u0 runs to 1, the blend region is empty and S is h
   identically — so a point stays a point with no threshold anywhere.

   FOUR PROPERTIES, declared before the blend shape was picked, all measured in
   docs/bloom-session-35-outcome.md:
     - S is h EXACTLY below u0 (0.00e+0 at every exponent), so the margin
       buckling Eva approved is preserved unchanged along the sides;
     - C1 at the join AND at the apex, as an IDENTITY: the smootherstep's
       w(0), w'(0) and w'(1) are all EXACT doubles 0, so the blend contributes
       exactly nothing to S or S' at the join and the scale arrives at the apex
       with zero slope;
     - S >= h everywhere (0 of 20,001 stations below, every exponent);
     - S(1) = R, which is what makes the apex participate at `R / peakHalf`.

   AND ONE DECLARED PROPERTY THAT IS WITHDRAWN AS UNACHIEVABLE. "S introduces
   no interior local minimum" cannot hold: S leaves u0 with h's own FALLING
   slope and must return to R at the apex, so the mean value theorem gives it a
   minimum whatever the blend shape. What is true, and is the property that
   matters, is that the resulting scallop is SHALLOWER than the one the shipped
   build already has at the same place — 0.6286 mm against today's 4.5687 mm at
   tip shape 2.45, 1.4x to 10.0x shallower across the range.

   THE CONSUMER SIDE IS A RATIO, NOT A SUBSTITUTION, and that is what makes the
   shipped build BIT-IDENTICAL. Putting S where `h` stands gives a derivative
   `(2*c*S*v)/h`, which at S === h is ONE ULP off the shipped double `2*c*v` —
   on every blade point of every row, so `0 moved` would be false. Instead the
   scale enters as `k = S/h`, appended as the LAST factor: `h/h` is exactly 1.0
   and `x * 1.0` is exactly `x`, so each expression is the shipped one with a
   factor that is the exact double 1. Same doctrine as `roundedness 1 makes the
   blend exactly 1` in the tip law. `kAt` returns null when the scale is inert
   so `sectAt` can take the shipped expression by a BRANCH as well.
   =================================================================== */
export function apexScale(profile, length, sweep) {
  const halfWidthAt = (u) => profile.halfWidthAt(u);
  const terminal = halfWidthAt(1);
  const R = tipInscribedRadius(halfWidthAt, length);
  const u0 = R > terminal ? blendStart(halfWidthAt, R) : 1;
  if (!(sweep > 0) || !(u0 < 1)) return null;
  const span = 1 - u0;
  const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
  /* `at` is a named local so `kAt` calls the SAME function, rather than a
     second expression of the blend. */
  const at = (u) => {
    if (u <= u0) return halfWidthAt(u);
    return halfWidthAt(u) + sweep * (R - halfWidthAt(u)) * smoother((u - u0) / span);
  };
  return {
    R, u0, sweep, span, at, terminal,
    /* THE RATIO. Null below u0 — where the blend weight is exactly 0 — so the
       caller takes the shipped expression rather than multiplying by a 1. `h`
       is the row's own half-width, passed in rather than recomputed, so this
       and the builder cannot disagree about which row they are on. */
    kAt(u, h) { return u <= u0 || h === 0 ? null : at(u) / h; },
  };
}

/* THE TIP'S INSCRIBED RADIUS, from the profile alone — no rim polyline and no
   nearest-point search, which is what the retired field needed and could not
   make continuous. The largest disc that touches the apex face is centred on
   the midrib at `L - R`, so the condition is that every margin point clears
   it, and the answer is a bisection on that condition.

   A COARSE SCAN UNDER-RESOLVES IT AND THE ERROR IS ONE-SIDED. Near a pointed
   tip the outline runs parallel to the axis at the print floor, so the binding
   station sits in a narrow well of half-width sqrt(2*h*eps): at 2048 steps on
   a 40 mm petal the well is missed until eps reaches ~6e-5 mm, and the scan
   reports a disc LARGER than fits, every time. Measured: R read 1.0910 /
   1.0835 / 1.0793 mm at 1303 / 2048 / 65536 steps on one profile, monotone
   downward — a number that had not converged, reported to four decimals. So
   the coarse scan only LOCATES the well and a local ternary pass resolves it,
   which is `refineDepth()`'s own discipline in the crowding raster for exactly
   the same reason. With it, R is identical to 6 decimals from 512 steps to
   65536 (spread 3.8e-14). */
export function tipInscribedRadius(halfWidthAt, length, steps = 2048) {
  const clearance = (R) => {
    const cx = length - R;
    const dist = (u) => Math.hypot(u * length - cx, halfWidthAt(u));
    let best = Infinity, bi = 0;
    for (let i = 0; i <= steps; i++) { const d = dist(i / steps); if (d < best) { best = d; bi = i; } }
    let lo = Math.max(0, (bi - 1) / steps), hi = Math.min(1, (bi + 1) / steps);
    for (let i = 0; i < 200 && hi - lo > 1e-15; i++) {
      const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
      if (dist(m1) < dist(m2)) hi = m2; else lo = m1;
    }
    return Math.min(best, dist((lo + hi) / 2)) - R;
  };
  let lo = halfWidthAt(1), hi = length;
  if (clearance(lo) < 0) return lo;
  for (let i = 0; i < 200 && hi - lo > 1e-14; i++) {
    const m = (lo + hi) / 2; if (clearance(m) >= 0) lo = m; else hi = m;
  }
  return lo;
}

/* WHERE THE BLEND STARTS: the last station at which h still exceeds R.
   Bisected on the falling limb, so it is derived rather than chosen. */
function blendStart(halfWidthAt, R, steps = 2048) {
  let lo = null;
  for (let i = steps; i >= 0; i--) { const u = i / steps; if (halfWidthAt(u) >= R) { lo = u; break; } }
  if (lo === null) return 0;
  if (lo >= 1) return 1;
  let a = lo, b = lo + 1 / steps;
  for (let i = 0; i < 60; i++) { const m = (a + b) / 2; if (halfWidthAt(m) >= R) a = m; else b = m; }
  return a;
}

/* THE ONE OWNER of the four curves. Always returns the law (it is the
   CALLER that decides whether to use it — see petalFormIsFlat), so the
   zero-form law is constructible for the guard's residual check.

   `halfW` and `t` are passed rather than recomputed: the roll clamp must be
   expressed against the thickness the solids are ACTUALLY built at, or the
   floor would protect a wall nothing has. */
export function petalForm(state, halfW, t, buckleCtx = null) {
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
  /* MARGIN BUCKLING (session 33; the controls and the clamp are session 34).
     Null unless engaged; see buckleLaw above. `ctx` carries what the CLAMP and
     the per-slot phase need and the cross-section does not: the slot index,
     the blade length and the floor. Absent it (the zero-form guard's own call)
     there is no buckle to clamp anyway. */
  const buckle = buckleIsFlat(state) ? null : buckleLaw(state, buckleCtx);
  /* THE APEX SWEEP (session 35). Null unless engaged, and null without a ctx —
     the zero-form guard's own call has no profile to derive R from and no
     deformation to scale anyway. It is NOT a member of petalFormIsFlat: at cup
     0 with no buckle there is nothing for it to multiply, so it cannot decide
     flatness. The curl family's own rule (frequency and reach are inert at
     amplitude 0), and the reason it is absent from FORM_IDS too. */
  const apex = buckleCtx && buckleCtx.profile
    ? apexScale(buckleCtx.profile, buckleCtx.length, state.petalApexSweep) : null;
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
  const sectAt = (C, T1, N1, h, u, hb = h) => {
    const r = ramp(u);
    const k = kAt(u, r);
    const c = cAt(u, r);
    /* THE CUT LEAVES THE SURFACE ALONE (session 38). `h` is where the boundary
       is; `hb` is the BASE outline's half-width, the scale every law below
       reads. Where the two are the same double (every plain petal — the
       profile computes both from the same max over the same shape) the
       shipped expressions run verbatim by a BRANCH on `hb === h`; on a lobed
       row the laws are the same functions of `a` (millimetres from the midrib)
       with the base width as their scale, so the cupped, ruffled surface at a
       sinus is the surface the crest beside it lies on. */
    const cut = hb !== h;
    /* THE BUCKLE'S TWO TERMS FOR THIS ROW, or null. `buckle === null` makes
       every expression below the pre-session-31 one character for character,
       which is what the byte report is a construction rather than a hope. On
       a lobed row the wave is evaluated at the base outline's own v for this
       a — `v * h / hb` — and scaled by the base width. */
    const bw = buckle === null ? null : cut ? (v) => r * buckle.w(u, v * h / hb, hb) : (v) => r * buckle.w(u, v, h);
    const bd = buckle === null ? null : cut ? (v) => r * buckle.dwda(u, v * h / hb, hb) : (v) => r * buckle.dwda(u, v, h);
    /* THE APEX SCALE'S RATIO for this row, or null where the blend is inactive
       — `apex === null` and `kS === null` both make every expression below the
       pre-session-35 one CHARACTER FOR CHARACTER, which is what makes the byte
       report a construction rather than a hope. Even where it is non-null the
       ratio is the LAST factor, so at S === h it would be a multiplication by
       the exact double 1; the branch is belt and braces on top of that. */
    const kS = apex === null ? null : apex.kAt(u, hb);
    /* The cup's lift is c * a^2 / hb — the same parabola on every row of a
       lobe — written on the plain branch as the shipped `c * h * v * v`. */
    const cupLift = cut ? (v) => c * (h * v) * (h * v) / hb : (v) => c * h * v * v;
    const cupSlope = cut ? (v) => 2 * c * (h * v) / hb : (v) => 2 * c * v;
    return (v) => {
      const a = h * v;
      const aT = k === 0 ? a : Math.sin(k * a) / k;
      const aN = (k === 0 ? 0 : (1 - Math.cos(k * a)) / k)
        + (kS === null ? cupLift(v) : cupLift(v) * kS)
        + (bw === null ? 0 : (kS === null ? bw(v) : bw(v) * kS));
      const dT = k === 0 ? 1 : Math.cos(k * a);
      const dN = (k === 0 ? 0 : Math.sin(k * a))
        + (kS === null ? cupSlope(v) : cupSlope(v) * kS)
        + (bd === null ? 0 : (kS === null ? bd(v) : bd(v) * kS));
      const L = Math.hypot(dT, dN);
      const nT = -dN / L, nN = dT / L;
      return {
        P: [C[0] + T1[0] * aT + N1[0] * aN, C[1] + T1[1] * aT + N1[1] * aN, C[2] + T1[2] * aT + N1[2] * aN],
        n: [T1[0] * nT + N1[0] * nN, T1[1] * nT + N1[1] * nN, T1[2] * nT + N1[2] * nN],
        /* dP/dv lifted into 3D. Only the buckled branch reads it — it is what
           `trueNormalRows` crosses against dP/du — and it is emitted here
           rather than recomputed there because these are the SAME two
           components the 2D normal was just built from. Two expressions of
           one tangent is how this project's most repeated defect starts. */
        dv: buckle === null ? null : [T1[0] * dT + N1[0] * dN, T1[1] * dT + N1[1] * dN, T1[2] * dT + N1[2] * dN],
      };
    };
  };

  return {
    curlRad, twistRad, kappa, frameAt, sectAt, curlUniform, buckle,
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
        /* THE APEX SCALE REACHES HERE TOO. This loop is a SECOND COPY of
           `sectAt`'s cross-section derivative, and it already omitted the
           buckle before session 35 — so a scale wired only into `sectAt`
           would leave the metric telemetry reporting the UNSWEPT stretch on
           every swept row, which is the same defect one layer down. */
        const kS = apex === null ? null : apex.kAt(row.u, row.h);
        for (let j = 0; j < NV; j++) {
          const v = -1 + (2 * j) / (NV - 1);
          const a = row.h * v;
          const dT = k === 0 ? 1 : Math.cos(k * a);
          const dN = (k === 0 ? 0 : Math.sin(k * a)) + (kS === null ? 2 * c * v : 2 * c * v * kS);
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
        /* And a THIRD copy, of the cross-section POINT. Same reason. */
        const kS = apex === null ? null : apex.kAt(row.u, row.h);
        const pt = (v) => {
          const a = row.h * v;
          return [k === 0 ? a : Math.sin(k * a) / k,
                  (k === 0 ? 0 : (1 - Math.cos(k * a)) / k)
                    + (kS === null ? c * row.h * v * v : c * row.h * v * v * kS)];
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
        /* MARGIN BUCKLING's numbers travel with the form telemetry for the
           same reason the curl family's do — one owner, read by the read-out,
           both STL gates and the sheet. `null` where there is no buckle: a
           claim nothing can make reads as absent, never as a passing 0. */
        buckle: buckle === null ? null : {
          ampAsked: buckle.ampAsked, ampBuilt: buckle.ampBuilt, ampCap: buckle.ampCap,
          clamped: buckle.clamped, freq: buckle.f, env: buckle.p,
          phaseRad: buckle.phaseRad,
          radiusMm: buckle.radiusMm, radiusAskedMm: buckle.radiusAskedMm,
          floorRadiusMm: buckle.floorRadiusMm,
          crossCurvatureAtMargin: buckle.crossCurvatureAtMargin,
          rowsPerCycle: NU / buckle.f,
        },
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
   petalSurface — THE PETAL'S MID-SURFACE, EVALUABLE AT ANY (u, v).

   WHY IT EXISTS. Until session 37 the surface law lived inside
   buildPetalInto's row loop, so the only points on a petal anyone could ask
   for were the NU stations the mesh happens to sample. Everything that wants
   the surface between them was blocked on that, and two consumers had already
   written the blockage down: `tools/bloom-sagitta.mjs`'s header ("reaching
   [the 3D margin] needs the row construction callable at arbitrary `u` — a
   closure inside `buildPetalInto`"), and the flower's Voronoi/veins port,
   whose cell vertices land wherever the diagram puts them and never on a row.

   WHAT IT IS. A factory over one petal's constants returning:
     rowAt(u)  the ROW PLAN at u — spine centre, frame, half-width, and the
               row's own `sect(v)`. It IS the object the row loop pushes.
     at(u, v)  the front door: `rowAt(u).sect(v)`, giving the mid-surface
               point and its unit normal.
   `at` is NOT a second statement of the law — it is `rowAt` applied. This is
   the same shape /plot's `stemPointFromPlan` / `stemPointAt` pair already has,
   and for the same reason: the per-station work (a spine evaluation, a frame,
   a half-width) is a property of the STATION, not of the column, so a caller
   walking one row pays it once while a caller asking for one point still goes
   through the one owner.

   WHAT IT DOES NOT OWN, stated here rather than discovered later:

   - THE LADDER. `bladeStations()` decides WHICH u the mesh samples; this
     decides what the surface IS there. Two different questions, and folding
     the ladder in would make the evaluator a function of the mesh it is
     supposed to be independent of.

   - THE BUCKLED NORMAL. `sect(v).n` here is the CROSS-SECTION's normal, which
     is the emitted normal on every build with no buckle — which is every
     shipping state (`buckleIsFlat` holds unless BOTH buckleAmp and buckleFreq
     are non-zero). On a buckled build buildPetalInto then wraps each blade
     row through `trueNormalRows`, which crosses dP/dv against a difference
     over the NEIGHBOURING ROWS. That is a LATTICE quantity by construction —
     it is a function of where the ladder put the rows — so it cannot live in
     a continuous evaluator, and a continuous dP/du here would NOT reproduce
     the emitted normal at the stations. The honest split is: this owns the
     surface, `trueNormalRows` owns the offset direction the mesh is built on.
     Off-station on a buckled build, `n` is the cross-section normal and the
     measured gap to the emitted one is in docs/bloom-session-37-outcome.md.

   - THE FOOT'S SURFACE. `footRowsAt()` is here because it is built from the
     same constants, but the three foot rows all carry u = 0 and are a
     different surface with a different width law. They are not reachable
     through `at`, and differencing across that seam is a derivative of
     nothing.

   `acc` IS REQUIRED, NOT DEFAULTED. widthProfile() reads `acc.exportMode` to
   choose the tip's terminal floor and thicknessProfile's `tAt` reads
   `acc.floorThickness`, so a null accumulator would silently build the LIVE
   surface whatever mode the caller meant — a mode decision by omission. Pass
   the accumulator you will emit into, or one in the mode you want to ask
   about.
   =================================================================== */
export function petalSurface(state, ring, slot, cap, acc) {
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

  /* THE SEAM (session 38) — the ONE owner of the foot-to-blade clearance and
     of where the blade's first row therefore sits. It is computed HERE, above
     the form, because the spine law needs it: see `startFloor` below.

     THE TURN IS `tilt`, and that is a derivation rather than a shortcut. The
     foot's own surface normal at the ring row is +Z on a flat hub and the
     cap's `Up` on a dome; the blade's sheet normal `nrm` is, in BOTH of this
     file's branches, that same up-vector rotated by `tilt` toward -Rs. So the
     angle between them is exactly |tilt| whatever the hub is doing. It is not
     ASSUMED: `seamFrameResidual` below re-reads it off the two emitted frames
     and both STL gates assert that residual is zero, which is the project's
     own "compute from one owner, check the other reading agrees" shape rather
     than a second producer. */
  const seamTurnRad = Math.abs(tilt);
  /* THE THICKNESS THE CLEARANCE READS, reported so the LIVE gate can pin it:
     it is `max(sheetThickness, MIN_FEATURE_MM) / 2` in BOTH modes, never the
     accumulator's mode-dependent `t`. Row positions are topology and the
     export floor may not move them — `ladderHalfAt`'s own rule, and session
     32's mode-dependence defect refusing to ship a third time. */
  const seamHalfMm = seamHalfThicknessMm(ps.sheetThickness);
  const seamClearMm = seamClearanceMm(seamTurnRad, ps.sheetThickness);
  const seamStep = seamLatticeStep(seamClearMm, length);
  const seamBaseU = seamStep / NU;

  /* Local frame: R radial (out), T tangent, Z up. */
  const cosA = Math.cos(slot.azimuth), sinA = Math.sin(slot.azimuth);
  const R = [cosA, sinA, 0];
  const T = [-sinA, cosA, 0];
  const Z = [0, 0, 1];

  const profile = widthProfile(ps, ring, halfW, cap, acc, length);
  /* THE GUARD. petalFormIsFlat() is the predicate; when it holds, `form`
     stays null and every row below takes the pre-form expression verbatim.
     That — not an IEEE-754 argument — is what makes the shipped default
     byte-identical. */
  const form = petalFormIsFlat(ps) ? null : petalForm(ps, halfW, t, {
    slotIndex: slot.index, halfW, length, floorRadius: ROLL_MIN_RADIUS_FACTOR * t,
    /* The profile, so apexScale() derives R and u0 from widthProfile()`s own
       answer rather than from a second statement of the outline. */
    profile,
  });

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
  /* THE FOOT ROWS, built on demand rather than into a shared array: an
     evaluator handing every caller the same three mutable objects would let
     one caller's `tUsed` and one caller's `trueNormalRows` wrap reach
     another's. Same three expressions, same order, fresh objects. */
  const footRowsAt = () => {
    const out = [];
    if (dome === null) {
      for (const s of footS) {
        const C = [R[0] * (ring.radius + s), R[1] * (ring.radius + s), slot.z];
        out.push({ C, N: Z, T, h: footHalf, u: 0, sect: flatSect(C, Z, footHalf) });
      }
    } else {
      for (const row of domeRows(1 / dome.Rd)) out.push(row);
    }
    return out;
  };

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
  /* THE CURL START IS FLOORED AT THE FIRST BLADE ROW, RE-DERIVED (session 38).
     Eva's Sep 4 ruling floored it at ONE BLADE ROW so that "the root chord is
     straight wherever start is engaged", which is what lets J8 assert its
     stronger normal clause there. `CURL_START_MIN = 1 / NU` said that exactly
     while the first blade row was always row 1. Under the seam floor the
     first row is row `seamStep`, so the SAME property now needs the same
     floor stated against the same thing: the first blade row's own station.
     The CONTROL's declared bound is untouched (the registry still imports
     `CURL_START_MIN`, and a bound that moved with the tilt would be one
     control reaching into another's range — the violation NU = 56 exists to
     avoid); what moves is the floor the LAW applies, which the read-out
     already prints. Relaxing instead would have made J8's clause SKIP those
     rows rather than fail them, which is coverage lost silently. */
  const law = form && kC !== 0 ? spineLaw({ curlRad: form.curlRad, bias: ps.curlBias, start: ps.curlStart, length, tilt, floorRadius, startFloor: seamBaseU }) : null;
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

  /* ===================================================================
     THE ROW PLAN AT ANY u — the ONE owner, and one return.

     Every expression below is the row loop's own, character for character;
     what changed is only that it is reachable at a u the mesh does not
     sample. The flat arm is written as a ternary on a frame that is `null`
     when there is no form, rather than as an early return, so there is a
     single return path AND `form.frameAt` is still never called on a flat
     build — the guard doctrine the whole builder rests on.
     =================================================================== */
  const rowAt = (u) => {
    const s = u * length;
    const h = profile.halfWidthAt(u);
    /* THE SURFACE'S OWN WIDTH SCALE (session 38): the base outline's, so a
       lobe cuts the boundary without denting the sheet. Identical to `h` on
       every plain petal, and `sectAt` takes the shipped branch there. */
    const hb = profile.halfWidthBaseAt(u);
    const { C, phi } = spineAt(s);
    /* The row's own frame, READ from petalForm's frameAt rather than
       recomputed here — the contact sheet's framing reads the same
       function, and two copies of a frame is how this project's most
       repeated defect starts. Twist follows the spine because frameAt
       rotates about the CURRENT length direction; see the ordering
       argument in petalForm's header. */
    const f = form ? form.frameAt(Rs, T, phi, u, dome === null ? null : Up) : null;
    return f === null
      ? { C, N: nrm, T, h, u, sect: flatSect(C, nrm, h) }
      : { C, N: f.N, T: f.T, D: f.D, h, u, sect: form.sectAt(C, f.T, f.N, h, u, hb) };
  };

  return {
    /* THE FRONT DOOR. `rowAt` applied — never a second law. */
    at: (u, v) => rowAt(u).sect(v),
    rowAt, footRowsAt,
    /* WHERE THE SURFACE'S TANGENT BREAKS ALONG u, DECLARED BY ITS OWNERS
       (session 38). Two producers of C0 points reach a rim point P(u, v):
       the OUTLINE (widthProfile's `max` — its own `slopeBreaks()`), and the
       FORM's onset ramp, which is `u / FORM_ONSET_END` then 1, so cup, roll
       and the buckle each arrive with a slope that stops dead at u =
       FORM_ONSET_END. Measured before this existed: a rim polyline that cut
       that point with a chord converged at FIRST order on every formed
       state (order 0.8–1.0 on the buckle, non-monotone on cup + roll), and
       at second order once the node was placed. Curl and twist are smooth
       there (a curvature jump costs a chord nothing at second order), so
       the node is declared only when a form exists — on a flat build the
       list is the profile's alone, and the constant is the one FORM_ONSET_END
       petalForm's own ramp reads. Consumers integrating along u (petalRim)
       read this; nothing here re-derives a seam. */
    tangentBreaks: () => {
      const out = profile.slopeBreaks();
      if (form !== null) out.push({ u: FORM_ONSET_END, kind: 'FORM_ONSET', from: 'ramp', to: 'full' });
      out.sort((a, b) => a.u - b.u);
      return out;
    },
    /* The petal's constants, so a consumer reads them from the one place
       that derived them instead of re-deriving any of them. */
    t, ps, length, tilt, halfW, footHalf, R, T, Z, Rs, Up, dir, nrm, base,
    profile, form, dome, footS, domeRows, flatSect, spineAt, law, kC,
    floorRadius, uniformThickness, profileT, tAt,
    seamTurnRad, seamClearMm, seamStep, seamBaseU, seamHalfMm,
  };
}

/* ===================================================================
   petalRim — WHERE THE RIM IS IN SPACE, AND HOW FAR ALONG IT A POINT SITS.
   (session 38, PR 1 — the structural prerequisite for lobes; no feature.)

   WHAT IT ANSWERS. For one petal, on either margin (v = +1 or v = -1): the
   rim point at any u, the ARC LENGTH s(u) along the rim from the ring row
   (u = 0) to that point, its inverse u(s), the total length, and the width
   of the terminal mini-face the two margins meet across at u = 1. Even
   spacing of teeth and lobes depends on this: spacing evenly in u bunches
   where the outline curves fastest (the apex, where h(u) falls through the
   tip law) and reads as damage rather than as a treatment.

   WHAT THE RIM IS. The mid-surface's margin, `surface.at(u, +/-1).P` — the
   curve the exporter's rim quads are built about (emitPanel offsets the two
   skins +/- t/2 from exactly these points at every station, and the rim
   strip joins them). It is the rim IN SPACE, so cup, roll, curl, twist and
   the buckle all lengthen or shorten it while leaving h(u) alone; the
   correspondence proof in tools/verify-bloom-rim-arc.mjs samples those.
   The FOOT's edges (s < 0, the three rows at u = 0) are footRing()'s and are
   not part of this curve; a cleft's inner edges are not either — a
   capability petal has more boundary than its two margins, and this query
   describes the two margins only.

   HOW s IS MEASURED, and why it is a construction rather than a quadrature.
   There is no analytic dP/du (the spine law is a table on the curl family,
   the buckle differentiates in v only), so s(u) is the chord length of a
   DENSE POLYLINE through `at(u_k, side).P` over `samples` cells of u, with
   every tangent break the surface declares (`surface.tangentBreaks()`: the
   outline's crossovers from widthProfile, and the form onset ramp's corner
   at FORM_ONSET_END when a form exists) inserted as nodes. The nodes matter:
   a chord laid ACROSS a kink converges at first order where chords that land
   on it converge at second, and the correspondence tool's R3 measures that
   order rather than assuming it. `sAt(u)` for an arbitrary u appends u to the
   polyline as one more node (s at the node before it, plus the chord to
   u), so by the triangle inequality the reported arc between any two u is
   never less than the straight chord between them — which is what lets the
   correspondence tool assert `arc >= the exported chord` EXACTLY rather than
   within a tolerance. `RIM_SAMPLES` is the default density; the residual it
   leaves against a doubled and quadrupled density is measured, not assumed
   (the tool's R3), and a consumer that needs it cheaper passes fewer.

   NAME THE MODE. The surface this is built on already carries its
   accumulator's mode (widthProfile reads acc.exportMode for the terminal
   floor), so a rim built from an export-mode surface is the export's rim
   and a live one the preview's; the two differ at the tip and every number
   reported off either says which.
   =================================================================== */
export const RIM_SAMPLES = 4096;
export const RIM_SIDES = Object.freeze([1, -1]);
/* The graded patch around a singular point of the ladder: this many uniform
   cells either side, halved this many times toward it. See the ladder note
   inside petalRim. */
export const RIM_GRADE_CELLS = 4;
export const RIM_GRADE_DEPTH = 32;

/* THE ARC-LENGTH ENGINE, one implementation for two callers (session 38,
   PR 2): petalRim() runs it along each margin of the surface in space, and
   widthProfile() runs it along the base outline's own 2D curve
   (u * length, h(u)) to station the lobes on the lamina. The ladder, the
   graded patches and `sAt`'s appended node are all here and nowhere else.
   `P(u)` returns a point (any dimension the caller likes, three here);
   `breaks` are the u of every tangent break to place nodes on; `uPk` sets the
   graded patch's span scale. See petalRim's note for why the patch is
   self-similar under refinement and why the endpoints are unconditional. */
export function rimArcTable(P, breaks, uPk, samples) {
  if (!(Number.isInteger(samples) && samples >= 2)) throw new Error(`rimArcTable: samples must be an integer >= 2, got ${samples}`);
  const span = RIM_GRADE_CELLS / samples;
  const singular = [...breaks.filter((b) => b.u > 0 && b.u < 1).map((b) => b.u), 1];
  const nodes = [0, 1];
  for (let i = 1; i < samples; i++) {
    const u = i / samples;
    if (!singular.some((x) => Math.abs(u - x) < span)) nodes.push(u);
  }
  for (const x of singular) {
    if (x < 1) nodes.push(x);
    for (let k = 0; k <= RIM_GRADE_DEPTH; k++) {
      const d = span * Math.pow(2, -k);
      if (x - d > 0) nodes.push(x - d);
      if (x + d < 1) nodes.push(x + d);
    }
  }
  nodes.sort((a, b) => a - b);
  const U = [nodes[0]];
  for (let i = 1; i < nodes.length; i++) if (nodes[i] !== U[U.length - 1]) U.push(nodes[i]);
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const Pt = U.map((u) => P(u));
  const S = [0];
  for (let i = 1; i < U.length; i++) S.push(S[i - 1] + dist(Pt[i], Pt[i - 1]));
  const cellOf = (u) => {
    let lo = 0, hi = U.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (U[m] <= u) lo = m; else hi = m; }
    return lo;
  };
  const sAt = (u) => {
    if (!(u >= 0 && u <= 1)) throw new Error(`rimArcTable: u must be in [0, 1], got ${u}`);
    const k = u >= 1 ? U.length - 1 : cellOf(u);
    if (U[k] === u) return S[k];
    return S[k] + dist(P(u), Pt[k]);
  };
  const length = S[S.length - 1];
  const uAt = (s) => {
    if (!(s >= 0 && s <= length)) throw new Error(`rimArcTable: s must be in [0, ${length}], got ${s}`);
    let lo = 0, hi = S.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] <= s) lo = m; else hi = m; }
    if (S[lo] === s) return U[lo];
    let a = U[lo], b = U[hi];
    for (let k = 0; k < 50; k++) { const m = (a + b) / 2; if (sAt(m) < s) a = m; else b = m; }
    return (a + b) / 2;
  };
  return { length, sAt, uAt, nodesU: U, nodesS: S, pointAt: P };
}

export function petalRim(surface, samples = RIM_SAMPLES) {
  const breaks = surface.tangentBreaks();
  const uPk = surface.profile.uPk;
  const sideOf = (side) => {
    if (side !== 1 && side !== -1) throw new Error(`petalRim: side must be +1 or -1, got ${side}`);
    const t = rimArcTable((u) => surface.at(u, side).P, breaks, uPk, samples);
    return { side, ...t };
  };
  const sides = { [1]: sideOf(1), [-1]: sideOf(-1) };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const U = sides[1].nodesU;

  /* THE TERMINAL MINI-FACE: the margins meet across the u = 1 row. Its
     length is measured the same way, as a dense polyline over v — and beside
     it the length the MESH draws it at, NV - 1 chords, so a consumer knows
     both the curve and what the exporter emits. */
  const faceNodes = 256;
  let faceLen = 0, faceMesh = 0, prevF = surface.at(1, -1).P;
  for (let j = 1; j <= faceNodes; j++) { const q = surface.at(1, -1 + (2 * j) / faceNodes).P; faceLen += dist(q, prevF); prevF = q; }
  prevF = surface.at(1, -1).P;
  for (let j = 1; j < NV; j++) { const q = surface.at(1, -1 + (2 * j) / (NV - 1)).P; faceMesh += dist(q, prevF); prevF = q; }

  return {
    samples, breaks, nodesU: U,
    /* Per-side queries, keyed by the v sign. */
    side: (s) => sides[s],
    sAt: (u, side = 1) => sides[side].sAt(u),
    uAt: (s, side = 1) => sides[side].uAt(s),
    pointAt: (u, side = 1) => sides[side].pointAt(u),
    length: (side = 1) => sides[side].length,
    tipFace: { length: faceLen, meshLength: faceMesh, columns: NV },
    /* THE WHOLE BOUNDARY the blade presents outside the hub: up one margin,
       across the terminal face, down the other. The foot's own edges are not
       in it. */
    loopLength: sides[1].length + faceLen + sides[-1].length,
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
                           NU rows, at the stations bladeStations() picks.
                           (This said "28 rows" from the placeholder until
                           session 37; NU has been 56 since session 32.)

   THE SURFACE LAW IS NOT HERE — it is petalSurface() above, and this reads
   it. What stayed: the ladder (which u to sample), the true-surface-normal
   wrap (a lattice quantity), the panels, and every measurement the gates and
   the contact sheet ask the builder for.

   Returns the petal's own measurements for the metrics hook, so the gates
   and the contact sheet ASK THE BUILDER rather than recomputing anything.
   =================================================================== */
export function buildPetalInto(acc, state, ring, slot, cap = null) {
  /* ONE construction of the surface, and every constant below is READ off
     it. A builder that re-derived any of them beside the evaluator would be
     the two-producers defect this project repeats most. */
  const surface = petalSurface(state, ring, slot, cap, acc);
  const {
    t, ps, length, tilt, halfW, R, T, Rs, Up, dir, nrm, base,
    profile, form, dome, footS, domeRows, spineAt, law, floorRadius,
    uniformThickness, profileT, tAt,
    seamTurnRad, seamClearMm, seamStep, seamBaseU, seamHalfMm,
  } = surface;

  const rows = surface.footRowsAt();
  /* THE ONE READ of the ladder. The row COUNT is NU exactly as before; only
     where each row sits has moved, and it moved as a function of the profile
     alone, so this samples the same surface differently. */
  /* THE SEAM — ASKED, never re-derived. petalSurface() owns the clearance and
     the turn it came from; this reads them. What is computed here is the
     RESIDUAL: the same turn re-read off the two frames the builder actually
     emitted (the last foot row's normal against the blade's sheet normal),
     against the owner's own answer. Both STL gates assert it is zero, so the
     "the turn is |tilt|" derivation in petalSurface() is checked rather than
     trusted — without there being two producers of it. */
  const footN = rows[rows.length - 1].N;
  /* COMPARED AS COSINES, not as angles. Two unit normals can only report the
     unsigned angle between them, in [0, pi]; an effective tilt past half a
     turn (the sixth whorl at 225 degrees is reachable) reads back as its
     complement, and comparing the angles would make this residual fire on
     the wrap rather than on the derivation. J8's own clause takes the same
     care for the same reason. */
  const seamFrameResidual = Math.abs(
    (footN[0] * nrm[0] + footN[1] * nrm[1] + footN[2] * nrm[2]) - Math.cos(seamTurnRad));
  /* ASKED, never re-derived: the ladder reports what its own bound did, so
     A8 can assert the blend ran for a reason inside its own measure. */
  const ladderReport = {};
  const stations = bladeStations(profile, length, form && form.buckle, seamClearMm, ladderReport);
  for (let i = 1; i <= NU; i++) rows.push(surface.rowAt(stations[i - 1]));
  /* ===================================================================
     THE TRUE SURFACE NORMAL — the ONE place the offset direction stops being
     the cross-section's own normal, and the reason session 33 exists.

     WHY IT IS NEEDED. emitPanel offsets the two skins by +/- t/2 along the
     normal `sect(v)` hands it. That normal is `dP/dv` rotated a quarter turn
     in the row's own (T, N) plane — the CROSS-SECTION's normal. It equals the
     SURFACE normal only while the surface varies slowly along u, which every
     deformation before this one does (a taper, an onset ramp, a constant-
     curvature spine). A buckle varies fast along u by definition. Measured on
     the discovery rig: 29 degrees off at a moderate setting and 71 at the top
     corner, which offsets the skins into a wedge whose perpendicular
     thickness is t*cos(that angle).

     WHAT REPLACES IT. n = normalise(dP/du x dP/dv), oriented onto the
     cross-section normal so the WINDING cannot flip (emitPanel's quads are
     wound off `n`, and a sign flip there is a boundary-edge failure, not a
     shading one). dP/dv is analytic and comes back on the row's own section
     (`dv`); dP/du is a difference over the NEIGHBOURING ROWS' OWN sections at
     the same v — legitimate because a section is a function of the GLOBAL v,
     which is what already lets a cleft's two lobes stay on one arc.

     THE FOOT IS NOT TOUCHED. Only blade rows are wrapped. The foot's three
     rows are a different surface with a different width law, so differencing
     across the seam would be a derivative of nothing; and the buckle's ramp
     is exactly 0 there anyway. The first blade row therefore takes a ONE-
     SIDED difference forward, the last one backward, the rest central.

     COST: a buckled build evaluates three sections per emitted column instead
     of one. It adds NO triangles. Unbuckled builds do not enter here at all.
     =================================================================== */
  const trueNormalRows = (rowList, from) => {
    const raw = rowList.map((r) => r.sect);
    for (let i = from; i < rowList.length; i++) {
      const ia = i === from ? i : i - 1;
      const ib = i === rowList.length - 1 ? i : i + 1;
      const own = raw[i], before = raw[ia], after = raw[ib];
      /* THE STATION SPACING EITHER SIDE, because since session 32's turning
         ladder the rows are NOT evenly spaced and a raw central difference
         stops being a tangent. `Pb - Pa` is the secant from row i-1 to row
         i+1; it points along dP/du only when the two half-intervals are
         EQUAL, and with unequal ones it skews toward the longer side. The
         cross product then tilts and the two skins are offset along a
         direction that is not the surface normal — which is precisely what
         the wall instrument reported (V4, three buckled states at 0.166 to
         0.259 mm against their own buckle-free controls, past a 0.12 mm bar).

         The unequal case takes the second-order non-uniform difference,
         `(h1/h2)(Pb - P) + (h2/h1)(P - Pa)`. The EQUAL case is kept as its
         own branch and left as the plain secant: the two agree analytically,
         but not bit-for-bit in floating point, and every row of every
         un-redistributed build is the equal case — so this branch is what
         keeps those bytes identical rather than merely equivalent. */
      const h1 = rowList[i].u - rowList[ia].u, h2 = rowList[ib].u - rowList[i].u;
      const skew = ia !== i && ib !== i && h1 !== h2 && h1 > 0 && h2 > 0;
      rowList[i].sect = (v) => {
        const q = own(v);
        const Pa = before(v).P, Pb = after(v).P;
        const du = skew
          ? [(h1 / h2) * (Pb[0] - q.P[0]) + (h2 / h1) * (q.P[0] - Pa[0]),
             (h1 / h2) * (Pb[1] - q.P[1]) + (h2 / h1) * (q.P[1] - Pa[1]),
             (h1 / h2) * (Pb[2] - q.P[2]) + (h2 / h1) * (q.P[2] - Pa[2])]
          : [Pb[0] - Pa[0], Pb[1] - Pa[1], Pb[2] - Pa[2]];
        const cx = du[1] * q.dv[2] - du[2] * q.dv[1];
        const cy = du[2] * q.dv[0] - du[0] * q.dv[2];
        const cz = du[0] * q.dv[1] - du[1] * q.dv[0];
        const L = Math.hypot(cx, cy, cz);
        /* A degenerate cross means the two tangents are parallel and there is
           no surface normal to be had; the cross-section's own normal is the
           honest answer there, not a zero vector. */
        if (!(L > 1e-12)) return q;
        const sgn = (cx * q.n[0] + cy * q.n[1] + cz * q.n[2]) < 0 ? -1 / L : 1 / L;
        return { P: q.P, n: [cx * sgn, cy * sgn, cz * sgn], dv: q.dv };
      };
    }
  };
  if (form && form.buckle !== null) trueNormalRows(rows, footS.length);

  const panels = trimPanels(rows.length, (i) => rows[i].u, cap);
  /* ONE CAPTURED GRID PER PANEL, in emission order and labelled with the
     panel's own name. A cleft is three panels — a shared base and two lobes
     that BOTH start PANEL_OVERLAP_ROWS below the split — so the petal's
     surface is not one rectangular grid there and flattening the three into
     one array would be a claim the geometry does not make. At the shipping
     default `panels` is the single 'full' span and this is a one-element
     list, which is the case the export path draws. */
  const capturedPanels = acc.captureGrid ? [] : null;
  for (const panel of panels) {
    const g = emitPanel(acc, rows, panel, tAt);
    if (capturedPanels) capturedPanels.push({ label: panel.label, rowFrom: panel.rowFrom, rowTo: panel.rowTo, rows: g });
  }

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
  /* THE STATIONS THOSE CENTRES SIT AT, emitted rather than left to be
     re-derived. C1 rebuilds the curl law and compares it against these
     centres, and it used to locate each one as `(i + 1) / n` — the uniform
     ladder, restated. That is a SECOND, INDEPENDENT statement of where the
     blade rows are, and the turning ladder made it false: C1 fired on every
     continuous row at 5.8e-1 mm, reporting "the controls were read but the
     spine did not follow them" about a spine that was correct. Session 32's
     A5/A6 fix is the precedent — the builder emits `profileU` and the gate
     reads it — and this is the same repair on the same class of defect. */
  const spineRowU = rows.slice(footS.length).map((r) => r.u);
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
    /* THE SEPARATION IS A DISTANCE ALONG THE SPINE, NEVER A COUNT OF ROWS.
       The flag asks whether the blade comes within one sheet thickness of
       ITSELF, and it must not answer yes for two rows that are simply
       neighbours — so it skips rows nearer than three sheet thicknesses along
       the length. That skip used to be `ceil(3t / (length / NU))`, a ROW COUNT
       computed from the UNIFORM row pitch, which is the same thing as a
       distance only while the rows are evenly spaced. Session 32's turning
       ladder made them not, and the count became wrong exactly where the
       ladder packs rows: measured on a FLAT, STRAIGHT, UNCURLED blade at the
       shipping default, rows 50 and 56 sat 0.84 mm apart along the spine and
       the flag fired on a petal that touches nothing at all.

       Third instance of this bug class in one change — the buckle's
       rows-per-cycle and C1's station reconstruction are the other two — and
       the shape is always the same: a count standing in for a length, true
       only under a uniformity that no longer holds.

       IT REDUCES EXACTLY TO THE OLD TEST ON A UNIFORM LADDER: there
       `u_j - u_i` is `(j - i) / NU`, so `(u_j - u_i) * length >= 3t` is
       `j - i >= 3t / ds`, which for integer `j - i` is the old `ceil`. The
       foot arm asks the same question against the foot's own station, u = 0.
       Telemetry only — this decides no geometry and moves no bytes. */
    const f0 = footS.length, sep = 3 * t;
    const far = (a, b) => Math.abs(rows[b].u - rows[a].u) * length >= sep;
    let minMm = Infinity, rowsAt = [-1, -1];
    for (let i = f0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
      if (!far(i, j)) continue;
      const a = rows[i].C, b = rows[j].C;
      const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      if (d < minMm) { minMm = d; rowsAt = [i - f0 + 1, j - f0 + 1]; }
    }
    let minToFootMm = Infinity, footRowAt = -1;
    for (let i = f0; i < rows.length; i++) {
      if (!(rows[i].u * length >= sep)) continue;
      for (let j = 0; j < f0; j++) {
        const a = rows[i].C, b = rows[j].C;
        const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
        if (d < minToFootMm) { minToFootMm = d; footRowAt = i - f0 + 1; }
      }
    }
    const nearest = Math.min(minMm, minToFootMm);
    return { minMm, rows: rowsAt, minToFootMm, footRow: footRowAt, sheetT: t, minSepMm: sep, selfContact: nearest < t };
  })();
  const spine = {
    rows: spineRows,
    rowU: spineRowU,
    tiltRad: tilt, length, curlRad: form ? form.curlRad : 0,
    bias: ps.curlBias, start: ps.curlStart, floorRadius,
    uniform: form ? form.curlUniform : true,
    peakRadiusMm: law ? law.peakRadius : Infinity,
    clamped: law ? law.clamped : false,
    underFloor: law ? law.underFloor : false,
    turnAskedDeg: ps.petalSpineCurl,
    turnBuiltDeg: law ? law.turnBuilt / D2R : 0,
    startFloored: law ? law.startFloored : 0,
    startFloor: law ? law.startFloor : CURL_START_MIN,
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
    /* AND EACH ROW'S OWN STATION, because half-widths alone cannot say where
       a row IS. The apex clauses A5 and A6 both need that, and both got it
       wrong first by reconstructing `u` from the array index — which is off by
       however many FOOT rows precede the blade (one, plus the dome's when a
       head rise is set). A5 then scanned the wrong region and went silent on
       the mutation it exists for, and A6 fired on the clean tree. The builder
       already knows the number; this emits it rather than having a reader
       derive it. Foot rows carry u = 0. */
    profileU: rows.map((r) => r.u),
    /* THE TIP CAP's own numbers, from the profile that built it. The gates
       assert the cap converges and the contact sheet prints these; neither
       re-derives a crossing or a terminal width. */
    /* NOT `tip` — that name is already taken, three keys below, by the tip's
       POSITION (which the contact sheet frames on). Two quantities sharing one
       word in an output is a defect this project has a rule about; here it
       would also have silently shadowed the position, since a later key wins
       in an object literal. */
    tipCap: {
      /* NO `pointed` KEY. The cap is unconditional since session 32, so a
         boolean naming a family that no longer exists would be a label for a
         computation nobody performs — and both gates read this object. */
      uCap: profile.uCap,
      entryHalf: profile.capEntryHalf,
      terminalHalf: profile.capTerminalHalf,
      /* What the LAST ROW actually came out at — the emitted number, not the
         intended one, for the same reason row.tUsed exists. */
      lastRowHalf: rows[rows.length - 1].h,
      exportMode: acc.exportMode,
      /* THE LAW'S OWN TWO NUMBERS, so a gate can read the exponent back off
         the emitted rows instead of re-deriving where the apex starts. */
      uPk: profile.uPk,
      shapeN: state.petalTipShape,
      /* THE PEAK THE LAW IS NORMALISED AGAINST, declared rather than left to
         be estimated as the largest emitted row. Those are different numbers
         the moment the ladder stops putting a row near uPk: measured on the
         saturated ladder the largest emitted row is 7.9936 mm against a true
         8.0000, and a fit that takes the emitted maximum as the peak absorbs
         that into the exponent and reads 1.5014 for an asked 1.50. Reading
         the sampling as if it were the geometry — this project's own most
         repeated defect. */
      peakHalf: profile.halfWidthBaseAt(profile.uPk),
    },
    /* THE LOBES (session 38, PR 2): the profile's own record plus the rows
       the ladder actually gave the window — a ROW COUNT, read off the emitted
       stations, said as one. Null on a plain petal. */
    lobes: profile.lobes === null ? null : (() => {
      const [u0, u1] = profile.lobes.windowU;
      const inWin = rows.filter((r) => r.u > 0 && r.u >= u0 && r.u <= u1).length;
      return { ...profile.lobes, rowsInWindow: inWin, rowsPerLobe: profile.lobes.countBuilt ? inWin / profile.lobes.countBuilt : 0 };
    })(),
    /* THE LADDER, reported so its two identities can be asserted on the
       EMITTED stations rather than on the expression that made them: the
       rows below ROOT_BLEND_END are the uniform ones, and the widest gap
       respects whatever bound was in force. */
    bladeLadder: {
      held: HELD_ROWS,
      rows: NU,
      /* THE SEAM FLOOR, declared so A7 asserts the block the builder built
         rather than restating the law. */
      seamTurnDeg: seamTurnRad * 180 / Math.PI,
      seamClearMm,
      seamHalfMm,
      /* The integer lattice offset the block starts at — 1 when the floor
         does not bind, and what A7 pins the held stations against. */
      seamStep,
      /* CLAMPED AND TOLD, never silently passed. A petal can be SHORTER than
         the fold it has to clear — measured, the 0.18 mm blade at six whorls
         of layerSize 0.35 asks 1.0925 of its own length — and no station
         inside the blade satisfies the derivation there. The block starts as
         far out as it can and the row stays a declared self-intersector; the
         read-out says so and A7 asserts the biconditional in both
         directions. */
      seamStepRaw: seamLatticeStepRaw(seamClearMm, length),
      seamMaxStep: SEAM_MAX_STEP,
      seamClamped: seamLatticeStepRaw(seamClearMm, length) > SEAM_MAX_STEP,
      seamClearU: length > 0 ? seamClearMm / length : 0,
      seamBaseU: stations[0],
      /* The owner's turn re-read off the two EMITTED frames, so the
         derivation that it is |tilt| is checked and not trusted. */
      seamFrameResidual,
      gapFactor: ladderGapFactor(form && form.buckle && form.buckle.A ? form.buckle.f : 0),
      buckleFreq: form && form.buckle && form.buckle.A ? form.buckle.f : 0,
      /* THE MIX THE BISECTION LANDED ON, 1 when it never ran (session 39).
         The bound is enforced by blending the redistributed rows back toward
         uniform, so the blend is the one thing that can throw the whole
         turning-rate ladder away — and a discarded ladder is watertight, one
         piece, the right triangle count and inside every bound, so without
         this field no gate here can tell that it happened. A8 pairs it with
         the gap measured off the EMITTED rows. */
      blend: ladderReport.blend,
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
    /* THE MID-SURFACE GRID (session 28) — null unless the accumulator was
       asked to capture, so every existing caller reads absence rather than an
       empty array that could be mistaken for an empty petal.

       WHAT IT IS: one entry per PANEL, each carrying the rows emitPanel
       actually emitted, each row carrying its `u`, its half-width, the
       thickness it was emitted at, and the per-column `v` / mid-surface point
       / unit normal. It is the mesh's own mid-surface, not a re-derivation:
       emitPanel stores the vectors it offset the two skins from.

       WHAT IT IS NOT: the FOOT is in it. Rows 0..footRows-1 are the three
       flat foot rows and all three carry `u: 0` — they are at
       -overhang / -overhang/2 / 0 along the radial, not at three parameters.
       A consumer wanting a grid uniform in u drops the first two and keeps
       the third, which is the s = 0 row; `footRows` above says how many there
       are, and the export path does exactly that. See
       docs/bloom-session-28-outcome.md for the measured step at that seam —
       it is the TILT, not a change of cross-section law. */
    grid: capturedPanels,
    /* WHERE THIS PETAL MEETS THE HUB — the quantity a downstream consumer
       cannot recover from the grid without knowing the foot's layout: the
       grid's own first row is the INNERMOST foot row, the one that runs
       furthest in under the hub (measured 5.31 mm from the axis at the
       shipping default against the ring's 8.84), and the blade leaves from
       the LAST of the three, on the ring itself.

       `base` is the builder's own variable, the point every blade row is
       measured from (`spineAt(0).C === base`, exactly — the s = 0 branch of
       every spine arm returns it unmodified). It is reported rather than
       recomputed from ring.radius and the azimuth for the reason `tangent`
       is: on a dome the z comes from `ring.z` and not `slot.z`, and a
       consumer rebuilding it from the controls would be a second owner of a
       boundary footRing() already owns. */
    attachment: {
      point: base,
      /* The frame the blade LEAVES the hub with — the same three vectors the
         first blade row was built in, at s = 0. `dir` is the blade's length
         direction there, `nrm` its sheet normal, `T` the width direction. */
      dir, normal: nrm, tangent: T,
      /* THE FOOT'S OWN PLANE, which `normal` above is NOT: at the shipping
         petalTilt of 25 degrees these differ by 25 degrees, and that angle is
         the seam a consumer of the grid will see at u = 0. Reported so it can
         be read rather than measured off the points. */
      footNormal: rows[footS.length - 1].N,
      ringRadius: ring.radius, ringZ: rows[footS.length - 1].C[2],
      tiltRad: tilt, azimuth: slot.azimuth,
    },
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
/* THE MID-SURFACE CAPTURE (session 28) rides in this function and nowhere
   else, for the reason the header above already gives: `row.sect(v)` is
   evaluated HERE, once per grid point, and the mid-surface `P` it returns is
   the thing the two skins are offset from. A capture that re-evaluated the
   cross-section somewhere else would be a second reader of the row's closure
   and could disagree with the emitted mesh — the one defect this project
   repeats most. What is stored is the SAME object the offsets were taken
   from, so "the grid" and "what was emitted" are the same numbers by
   construction rather than by comparison.

   IT ADDS NO ARITHMETIC. `P` and `n` are already computed and already
   consumed; the capture pushes references. Nothing is recomputed, nothing is
   reordered, and no float is touched — so the emitted bytes cannot move,
   which clause 1 of tools/verify-bloom-grid.mjs measures rather than assumes.

   RETURNS null when the accumulator was not asked to capture. */
function emitPanel(acc, rows, panel, tAt) {
  const grid = acc.captureGrid ? [] : null;
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
    /* THE ROW'S CAPTURED COLUMNS. Built beside ht/hb and pushed with them, so
       a row that reached the mesh reached the grid — there is no path that
       emits one and not the other. */
    const gm = grid ? { row: i, u: row.u, halfWidth: row.h, thickness: t, v: [], mid: [], normal: [] } : null;
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
      /* THE GLOBAL v IS STORED, not the column index. On a trimmed panel the
         columns run over [vLo, vHi] rather than [-1, 1], so a consumer that
         reconstructed v from j would be right on the shipping default and
         wrong on every cleft — and it is exactly the quantity a downstream
         drawing needs, since v is uniform in PARAMETER and not in arc length
         (see metricMin/metricMax on the form telemetry). */
      gm && (gm.v.push(v), gm.mid.push(P), gm.normal.push(n));
    }
    top.push(ht); bot.push(hb);
    if (gm) grid.push(gm);
  }
  const NR = top.length;
  /* THE WINDING IS OUTWARD, AND THAT IS MEASURED RATHER THAN ASSERTED
     (session 36, fixing session 35's finding). The top skin is offset along
     +n, so its triangles must be wound counter-clockwise SEEN FROM +n — the
     convention MeshBuilder.quad documents and buildHubInto follows. From the
     day this emitter was written until session 35 the comment here read
     "Top face (outward = +N side)" while every quad below was wound the OTHER
     way: all six triangles touching a top-skin point pointed INTO the sheet,
     every petal shell had NEGATIVE signed volume (−515.19 mm³ each on the
     shipping default against the hub's +294.07), and six gates passed on it,
     because watertight, connected, manifold, winding-consistent,
     degenerate-free and Euler all hold on an inside-out solid. It mattered
     because the export contract leans on a slicer UNIONING overlapping closed
     shells, and a union handed a negative-volume shell can SUBTRACT it.
     Each quad is now emitted as (a, d, c, b) where it was (a, b, c, d): the
     same two triangles as vertex SETS, each with its winding reversed. The
     witness is the O family in both STL gates (per-shell signed volume by the
     divergence theorem AND a ray-parity test, agreeing), calibrated on a unit
     cube in `node tools/bloom-self-intersection.mjs --orientation`. */
  for (let i = 0; i < NR - 1; i++) {
    for (let j = 0; j < NV - 1; j++) {
      acc.quad(top[i][j], top[i + 1][j], top[i + 1][j + 1], top[i][j + 1]);   // top skin: normal +n
      acc.quad(bot[i][j], bot[i][j + 1], bot[i + 1][j + 1], bot[i + 1][j]);   // bottom skin: normal -n
    }
  }
  /* Rim: both side edges along every row pair, plus the two end caps. Every
     perimeter edge of the grid gets exactly one rim quad, which is what makes
     each edge of the closed solid shared by exactly two triangles. Wound to
     match the skins above, so the shell is one consistent outward surface. */
  for (let i = 0; i < NR - 1; i++) {
    acc.quad(top[i][0], bot[i][0], bot[i + 1][0], top[i + 1][0]);                         // v = -1 side
    acc.quad(top[i][NV - 1], top[i + 1][NV - 1], bot[i + 1][NV - 1], bot[i][NV - 1]);     // v = +1 side
  }
  for (let j = 0; j < NV - 1; j++) {
    acc.quad(top[0][j], top[0][j + 1], bot[0][j + 1], bot[0][j]);                         // inner end cap
    acc.quad(top[NR - 1][j], bot[NR - 1][j], bot[NR - 1][j + 1], top[NR - 1][j + 1]);     // tip cap
  }
  return grid;
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
function revolveInto(acc, rings, south, north, outline = null) {
  /* THE OUTLINE OWNS THE LATTICE (session 29). `null` is the ROD's arm — the
     tube keeps STAMEN_SIDES and no arithmetic here moved — and a tip hands in
     an array whose LENGTH is tipSides(shape), so a shape and its tessellation
     cannot disagree. At roundedness 1 that length is STAMEN_SIDES. */
  const NS = outline === null ? STAMEN_SIDES : outline.length;
  const pts = rings.map(({ C, e1, e2, r }) => Array.from({ length: NS }, (_, j) => {
    const a = (j * TAU) / NS, ca = Math.cos(a), sa = Math.sin(a);
    /* THE OUTLINE (session 26) scales the ring's radius PER SIDE, so one
       cross-section shape applies at every ring and the solid stays a radial
       graph about the axis. `null` is the ROD's arm — no arithmetic at all,
       so the tube's bytes cannot move — and a tip at roundedness 1 hands in
       a factor of exactly 1, where `r * 1 === r`. */
    const rr = outline === null ? r : r * outline[j];
    return [C[0] + rr * (e1[0] * ca + e2[0] * sa), C[1] + rr * (e1[1] * ca + e2[1] * sa), C[2] + rr * (e1[2] * ca + e2[2] * sa)];
  }));
  for (let j = 0; j < NS; j++) { const j2 = (j + 1) % NS; acc.tri(south, pts[0][j2], pts[0][j]); }
  for (let k = 0; k < pts.length - 1; k++) for (let j = 0; j < NS; j++) { const j2 = (j + 1) % NS; acc.quad(pts[k][j], pts[k][j2], pts[k + 1][j2], pts[k + 1][j]); }
  const last = pts[pts.length - 1];
  for (let j = 0; j < NS; j++) { const j2 = (j + 1) % NS; acc.tri(north, last[j], last[j2]); }
  return pts;
}

/* THE ROD — a filament's or a style's, ONE helper (session 22). The root
   axis inner->outer on the owner's normal through the full slab, then the
   free length along spineLaw() at TILT 0 in the (Up, -Rs) plane, the tube's
   ring frame (T, D x T). EXTRACTED VERBATIM from buildStamenInto — the same
   expressions on the same doubles in the same order — so every stamen takes
   exactly the bytes it took in session 21; the block-23 live partition on
   both trees is what MEASURES that, not this sentence. `s` is the owner's
   surface record (radius, slope, z); `r` the rod's radius; `t` the slab. */
function rodInto(acc, { t, r, curlRad, length, floorRadius }, s, azimuth) {
  const cosA = Math.cos(azimuth), sinA = Math.sin(azimuth);
  const R = [cosA, sinA, 0], T = [-sinA, cosA, 0];
  /* The foot's own frame on the cap — buildPetalInto's (Rs, Up), verbatim. */
  const Rs = [R[0] * Math.cos(s.slope), R[1] * Math.cos(s.slope), -Math.sin(s.slope)];
  const Up = [R[0] * Math.sin(s.slope), R[1] * Math.sin(s.slope), Math.cos(s.slope)];
  const P = [R[0] * s.radius, R[1] * s.radius, s.z];                       // the owner's surface point
  const off = (h) => [P[0] + Up[0] * h, P[1] + Up[1] * h, P[2] + Up[2] * h];
  const inner = off(-t / 2), outer = off(t / 2);
  const law = spineLaw({ curlRad, bias: 0, start: 0, length, tilt: 0, floorRadius });
  const at = (sArc) => {
    const q = law.at(sArc), c = Math.cos(q.phi), sn = Math.sin(q.phi);
    return { C: [outer[0] + Up[0] * q.dR - Rs[0] * q.dZ, outer[1] + Up[1] * q.dR - Rs[1] * q.dZ, outer[2] + Up[2] * q.dR - Rs[2] * q.dZ],
             D: [Up[0] * c - Rs[0] * sn, Up[1] * c - Rs[1] * sn, Up[2] * c - Rs[2] * sn] };
  };
  const ring = (C, D, rr) => ({ C, e1: T, e2: [D[1] * T[2] - D[2] * T[1], D[2] * T[0] - D[0] * T[2], D[0] * T[1] - D[1] * T[0]], r: rr });
  const stations = [ring(inner, Up, r), ring(outer, Up, r)];
  for (let k = 1; k <= STAMEN_ROWS; k++) { const q = at((k / STAMEN_ROWS) * length); stations.push(ring(q.C, q.D, r)); }
  const before = acc.triangleCount;
  const tubePts = revolveInto(acc, stations, inner, stations[stations.length - 1].C);
  return { P, Up, T, inner, outer, stations, tubePts, at, law, before };
}

/* THE TIP (session 26) — an anther, or ONE LOBE of the trifid stigma: ONE
   OWNER, and `pillInto` is retired into it. The solid is a radial graph about
   the tip's own axis with EXPLICIT apex fans at both poles, its lower cap
   centred ON `C` (a rod's tip), so the rod's last ring is inside it.

   THE AXIS AND THE FRAME COME FROM THE ROD, AND THE ROTATION IS RODRIGUES
   (Q2, and NO GUARD). `rod` is the rod's own tip frame — `D` its direction,
   `T` its ring vector, both unit and perpendicular; `aim` says where this tip
   points relative to that frame: `spreadRad` off `D`, toward the azimuth
   `psi` around it. The tip's axis is then `L = D cos + P sin` (the expression
   session 22's trifid already used, verbatim) and its ring vector is the
   MINIMAL ROTATION of `T` onto `L` — the rod's frame carried along, not an
   arbitrary perpendicular.

   WHY IT MATTERS AND WHY NO GUARD. A circle has no orientation, so the old
   `e1` (the rod's `T` for an anther, `D x P` for a lobe) was free; an outline
   with corners does have one, and a frame that is not a continuous function
   of the axis makes the cross-section JUMP the moment roundedness leaves 1.
   Eva ruled the discontinuity worse than the move: `a slider that jumps is a
   defect a user meets; a predeclared partition is an accounting entry`. The
   formula is parameterised by the ANGLES rather than by two vectors, which is
   what lets the identity be exact without a special case: at `spreadRad` 0,
   `cos` is exactly 1 and `1 - cs` is exactly 0, so the coefficient of `T` is
   exactly 1 and the other two are zero — the anther's frame comes back as its
   rod's `T`, term for term. Deriving the rotation from `D x L` instead would
   normalise a zero vector at the identity and put `D . L` (which is 1 only to
   rounding) on `T`'s coefficient; that is the version with a guard, and this
   is the version without one.

   THE LOBES MOVE AND THE ANTHER DOES NOT. On a lobe the old `e1` was `D x P`,
   which is the ROTATION AXIS and is therefore left fixed by the rotation,
   while the new one is `Rot(T)`; the two differ by a turn about `L` of
   `acos(-sin psi)` — 90, 150 and 30 degrees on the trifid's three lobes. The
   SOLID is the same solid rotated on its own axis, so its surface moves by at
   most the emitted polygon's sagitta; individual VERTICES move much further,
   and the two numbers are not the same claim. Both are measured on the tree
   by tools/verify-bloom-tip-bytes.mjs rather than argued here.

   Returns what was emitted, for the gate: the axis, the ring vector, the
   outline factors and the apex. */
function tipInto(acc, C, rod, aim, tip) {
  const { D, T } = rod;
  const B = [D[1] * T[2] - D[2] * T[1], D[2] * T[0] - D[0] * T[2], D[0] * T[1] - D[1] * T[0]];
  const cs = Math.cos(aim.spreadRad), sn = Math.sin(aim.spreadRad);
  const cp = Math.cos(aim.psi), sp = Math.sin(aim.psi);
  const P = [T[0] * cp + B[0] * sp, T[1] * cp + B[1] * sp, T[2] * cp + B[2] * sp];
  const L = [D[0] * cs + P[0] * sn, D[1] * cs + P[1] * sn, D[2] * cs + P[2] * sn];
  /* Rot(T) about (D x P) by `spreadRad`, in the rod's own (T, B, D) basis. */
  const kT = 1 - cp * cp * (1 - cs), kB = -(cp * sp * (1 - cs)), kD = -(cp * sn);
  const e1 = [T[0] * kT + B[0] * kB + D[0] * kD, T[1] * kT + B[1] * kB + D[1] * kD, T[2] * kT + B[2] * kB + D[2] * kD];
  const ring = (Cc, r) => ({ C: Cc, e1, e2: [L[1] * e1[2] - L[2] * e1[1], L[2] * e1[0] - L[0] * e1[2], L[0] * e1[1] - L[1] * e1[0]], r });
  const along = (h) => [C[0] + L[0] * h, C[1] + L[1] * h, C[2] + L[2] * h];
  const a = tip.a, band = Math.max(tip.Lc, TIP_BAND_FLOOR * a);
  const outline = tipOutline(tip.shape);
  const rings = [], K = TIP_CAP_RINGS;
  for (let k = 1; k <= K; k++) { const al = (k / K) * (Math.PI / 2); rings.push(ring(along(-a * Math.cos(al)), a * Math.sin(al))); }
  rings.push(ring(along(band), a));
  for (let k = 1; k < K; k++) { const be = (k / K) * (Math.PI / 2); rings.push(ring(along(band + a * Math.sin(be)), a * Math.cos(be))); }
  const apex = along(band + a);
  revolveInto(acc, rings, along(-a), apex, outline);
  return { L, e1, apex, outline, band };
}

export function buildStamenInto(acc, andro, s, slot) {
  const rod = rodInto(acc, { t: andro.thickness, r: andro.rFil, curlRad: andro.curlRad, length: andro.length, floorRadius: andro.diameter }, s, slot.azimuth);
  /* THE TIP: `lumps` of them sharing the rod's end, each `spreadRad` off its
     direction at azimuths a whole turn apart — the TRIFID's own law, one
     statement for both owners (session 29). At the shipping default the count
     is 1 and the spread is 0, so the loop runs once at psi = 0 * TAU / 1 = 0
     and `spreadRad` 0 is the Rodrigues identity: the ring vector comes back
     as the rod's `T` and the anther's bytes do not move (session 26).

     TWO LUMPS AT A SPREAD OF ZERO ARE COINCIDENT, and that is TOLD rather
     than refused (`lumpsCoincident` on the read-out): the tips are emitted
     one on top of another, which is duplicate geometry — the family's known
     cause of non-manifold edges — and still exports watertight and as one
     piece. Refusing it would mean a spread with a non-zero minimum, and 0 at
     one lump is the shipping default. */
  const tip = rod.stations[rod.stations.length - 1], a = andro.anther.diameter / 2, Lc = andro.anther.length - 2 * a;
  const D = rod.at(andro.length).D;
  const lumpRecs = [];
  for (let k = 0; k < andro.anther.lumps; k++) {
    const l = tipInto(acc, tip.C, { D, T: rod.T }, { spreadRad: andro.anther.spreadRad, psi: (k * TAU) / andro.anther.lumps }, { a, Lc, shape: andro.anther.shape });
    lumpRecs.push({ index: k, axis: l.L, e1: l.e1, outline: l.outline, apex: l.apex });
  }
  const lump = lumpRecs[0];
  /* WHAT WAS EMITTED, for the gate: the root axis (JS1), the surface point
     (JS2), the two root rings AS EMITTED (JS3), the apex (JS4). */
  /* `stations` (session 23): every ring CENTRE the rod was revolved through
     — inner root, outer root, then STAMEN_ROWS free stations to the tip —
     the builder's own centreline, read by the filament-against-style flag
     in buildBloomInto (the ROOTS FUSE pattern: the builder's record, never a
     re-derivation). Telemetry; nothing geometric reads it. */
  /* `lumps` (session 26): what the TIP primitive emitted, for JS6 — its axis,
     its Rodrigues ring vector and the outline factors it scaled every ring
     by. One entry, because an anther is one tip; the trifid reports three. */
  /* `apex` is the FIRST lump's, which is the anther's whole reach at the
     default count of one; `lumps[k].apex` carries every one of them, and the
     read-out's `highest anther` reads those while the pairwise ANTHERS TOUCH
     flag stays on the first (said on the line itself when the count is
     above one, rather than left for a reader to assume). */
  return { index: slot.index, azimuth: slot.azimuth, root: rod.P, N: rod.Up, inner: rod.inner, outer: rod.outer, rootRings: [rod.tubePts[0], rod.tubePts[1]], tip: tip.C, dir: D, apex: lump.apex, tris: acc.triangleCount - rod.before,
           lumps: lumpRecs,
           stations: rod.stations.map((st) => st.C),
           law: { turnAskedDeg: andro.curlDeg, turnBuiltDeg: rod.law.turnBuilt / D2R, peakRadiusMm: rod.law.peakRadius, underFloor: rod.law.underFloor, clamped: rod.law.clamped, floorRadius: andro.diameter } };
}

/* THE STYLE (session 22): the same rod as a filament's, on the axis at
   azimuth 0 (R = [1,0,0], T = [0,1,0] — exact), from the owner's apex
   record, then the TRIFID: STIGMA_LOBES pills sharing the tip, each aimed
   `spread` off the tip direction D toward a direction P in the (T, D x T)
   plane at azimuths a third of a turn apart. P is unit and perpendicular to
   D by construction, so the lobe axis D cos + P sin is unit, and D x P is
   the lobe's own ring vector. Positive curl bends the style toward -Rs, the
   filament's own sign (at azimuth 0 that is -x). */
export function buildStyleInto(acc, G) {
  const rod = rodInto(acc, { t: G.thickness, r: G.rSty, curlRad: G.curlRad, length: G.length, floorRadius: G.diameter }, G, 0);
  const tip = rod.stations[rod.stations.length - 1], a = G.lobe.diameter / 2, Lc = G.lobe.length - 2 * a;
  const D = rod.at(G.length).D;
  /* THE TRIFID: `lobe.lumps` tips sharing the rod's tip (a control since session 30), each `spreadRad` off
     its direction at azimuths a whole turn apart. The axis is the expression
     session 22 used, now inside tipInto and computed once — the LOBE AXES are
     byte-identical; what moved is the ring vector, which was `D x P` (the
     rotation axis, left fixed) and is now the Rodrigues image of the rod's
     `T`. Predeclared, ruled, and measured rather than described. */
  const lobes = [];
  for (let k = 0; k < G.lobe.lumps; k++) {
    const lump = tipInto(acc, tip.C, { D, T: rod.T }, { spreadRad: G.lobe.spreadRad, psi: (k * TAU) / G.lobe.lumps }, { a, Lc, shape: G.lobe.shape });
    lobes.push({ index: k, dir: lump.L, apex: lump.apex, e1: lump.e1, outline: lump.outline });
  }
  /* WHAT WAS EMITTED, for the gate: the root axis (JG1), the surface point
     (JG2), the two root rings AS EMITTED (JG3), the tip, its direction and
     every lobe's axis and apex (JG4 — the trifid as a PROPERTY). */
  /* `stations` (session 23): the style's own centreline, inner root to tip
     — the polyline the filament-against-style flag measures against, BELOW
     the stigma (the lobes sit on the tip and are not in it). Telemetry. */
  return { root: rod.P, N: rod.Up, inner: rod.inner, outer: rod.outer, rootRings: [rod.tubePts[0], rod.tubePts[1]], tip: tip.C, dir: D, lobes, tris: acc.triangleCount - rod.before,
           stations: rod.stations.map((st) => st.C),
           law: { turnAskedDeg: G.curlDeg, turnBuiltDeg: rod.law.turnBuilt / D2R, peakRadiusMm: rod.law.peakRadius, underFloor: rod.law.underFloor, clamped: rod.law.clamped, floorRadius: G.diameter } };
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
  /* AND EVERY PETAL THE BUILDER EMITTED, IN SLOT ORDER — a SECOND array beside
     the per-ring one, not a replacement for it, and the distinction is the
     whole of this change.

     `petals` answers "one representative per RING", and four of the metrics
     hook's arrays are INDEX-MATCHED to `fr.rings` through it — `petalRingSpine`,
     `petalRingRootRows`, `petalRingFootFrames`, `petalRingApplied`, which are
     J1's, Z2's and Z6's own inputs. Re-keying it per slot would move every one
     of those correspondences for no gain to the thing that actually needed
     fixing.

     What needed fixing is the GRID EXPORT, which wants a different question
     answered: not "one per ring" but "every petal there is". Under the layered
     arm the two differ by the whole bloom — a RADIAL bloom of eight petals
     reached the exporter as ONE — so a grid exported from any placement but
     CONTINUOUS was nearly empty. Two questions, two arrays, and no consumer of
     either has to change its mind about what it is holding.

     IT COSTS NOTHING TO BUILD. Every petal already captures its grid when the
     accumulator was asked to — the capture is a property of the accumulator,
     not of retention — so what was happening before was that the grids of all
     but one petal per ring were built and then thrown away. This keeps the
     references. */
  const petalsAll = [];
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
      blade: (slot) => { petalsBuilt++; azOf[slot.index] = slot.azimuth; const p = buildPetalInto(acc, state, fr.rings[slot.index], slot, capability); petals.push(p); petalsAll.push(p); },
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
        petalsAll.push(p);
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
  /* THE GYNOECIUM (session 22) — one style on the axis, read from the third
     descriptor; absent when it is null (NONE, or SPHERE where it is hidden
     and inert). Its free end is its own census (JG4), never folded into the
     androecium's. */
  const styles = [];
  if (fr.gynoecium) styles.push(buildStyleInto(acc, fr.gynoecium));
  /* THE FILAMENT-AGAINST-STYLE FLAG (session 23; B2b's family, built on
     Eva's ruling of Sep 6 on the ±180 curl range: the crossing is not a
     property of the range's ends, so what closes the question is an
     instrument, not a narrowing). A FLAG, NEVER A GATE — a filament passing
     through the style exports watertight and one piece, because overlapping
     closed solids are legal by construction; both STL gates are blind to it
     and must stay so. THE MEASUREMENT, on the ROOTS FUSE pattern (the
     builder's own records, never a re-derivation): the nearest approach of
     any filament's FREE station (the outer root surface and the STAMEN_ROWS
     stations above it — the root inside the slab is excluded, since on the
     on-axis corner every root shares the slab and that is told already) to
     the style's centreline BELOW THE STIGMA (the style's own stations from
     its outer root to its tip, as segments — the lobes are on the tip and
     not in it), against one filament radius plus one style radius: under
     that, the two tubes intersect. Null when either part is absent — a claim
     nothing can make reads as absent, never as a passing distance. The
     read-out's STAMENS line prints the distance, the height, and the flag;
     the panel gate asserts all three against this record in both
     directions. Session 22's own table from spineLaw() (six on the shipping
     ring: 0.34 mm at 15° of curl, 0.00 at 20°, ≤ 0.11 to 180°) is what this
     reproduces from the emitted stations. */
  const filamentStyle = (() => {
    if (!stamens.length || !styles.length) return null;
    /* THE THRESHOLD IS THE DISC'S INNER LIMIT (session 24) — one quantity,
       READ from footRing()'s androecium descriptor rather than re-derived
       here from the two parts' radii. It was `fr.androecium.rFil +
       fr.gynoecium.rSty`, which is the same double on the same owner; making
       the limit and the flag one number is what stops the disc's law and the
       flag from ever disagreeing about where a filament clears a style. */
    const threshold = fr.androecium.innerLimit;
    const axis = styles[0].stations.slice(1);
    const segDist = (p, a, b) => {
      const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
      const l2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
      const t = l2 > 0 ? Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / l2)) : 0;
      return Math.hypot(p[0] - (a[0] + ab[0] * t), p[1] - (a[1] + ab[1] * t), p[2] - (a[2] + ab[2] * t));
    };
    let best = { mm: Infinity, stamen: -1, station: -1, z: null };
    for (const s of stamens) {
      for (let k = 1; k < s.stations.length; k++) {
        const p = s.stations[k];
        for (let j = 0; j + 1 < axis.length; j++) {
          const d = segDist(p, axis[j], axis[j + 1]);
          if (d < best.mm) best = { mm: d, stamen: s.index, station: k, z: p[2] };
        }
      }
    }
    return { ...best, threshold, crossing: best.mm < threshold };
  })();
  return { ring: fr.rings[0], rings: fr.rings, hub: fr.hub, hubBuilt, foot: fr, petal: petals[0], petals, petalsAll, petalsBuilt, slotAzimuths, androecium: fr.androecium, stamens, freeEnds, stamenNearest, gynoecium: fr.gynoecium, styles, filamentStyle };
}
