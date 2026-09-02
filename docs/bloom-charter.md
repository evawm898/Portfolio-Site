# Parametric Bloom — founding charter

*Aug 31, 2026. Successor project to the parametric flower. This doc records the founding
decisions and how the flower project's learnings map onto the new scope. The
`flower-project` skill remains the procedural source of truth — this doc states only
deltas and scope adaptations, deliberately, so the two never drift into stating the same
rule twice (that drift already bit the flower project once). Once the bloom code exists in
the repo, the repo's copy of this file is canonical.*

## What this is

A new generator, new codebase, new page: **eva-maskalenko.com/bloom**. The bloom and
nothing else.

## Scope

In, in build order:

1. **Petal arrangement** — with the petal's *rough* silhouette and its **foot** (where it
   meets the center) settled early, since the center joins onto the feet.
2. **Bloom center** — the mass at the heart and how the petals join it.
3. **Petal shape** — the detailed silhouette work.

Explicitly out, for now: petal infill, stem, leaves, sepals, base ornament, edge
treatments, per-slot overrides.

## Founding decisions (Eva, Aug 31)

- **Fresh codebase; port the machinery, not the geometry.** The registry-as-single-source
  pattern, the connectedness voxel gate, the export gate (`boundary === 0`), the
  harness read-back assertion, and CI come over from day one. No geometry code is copied
  blindly — the flower repo carries known open defects (#87, #93, #97, #98, GROWTH export
  non-reproducibility) and none of them should immigrate.
- **Sequencing:** arrangement first with the rough silhouette and foot fixed early; the
  center is tuned against the real foot, not a placeholder; detail shape work third.
  Center-first was considered and rejected: a center can't be judged in isolation, and
  its mass *derives* from what feeds it (area rule) — designing it first inverts its own
  sizing rule. The part of center-first that survives: the **foot ring gets its single
  owner in phase 1**, before either consumer exists.
- **Petals are thin solid sheets** until infill work begins. Watertight by construction,
  with a thickness floor. Infill later replaces the interior without changing the outline
  or the foot.

## The invariant, adapted

**The model is always ONE connected watertight solid.** With no stem and no sepals, that
means: every petal connects to the center, always, at every slider position. There is
never a state where a petal is a separate body — including in phase 1, before the
designed center exists: a minimal derived junction joins the feet from the first commit.

What changes from the flower project:

- **The junction is petal-feet-into-center now.** Same doctrine as flower PR #86/#102:
  unconditional, derived from what's present, never a control, as quiet as possible.
  The petal's own material continues into the center — no lathe, no loft, no skin of
  revolution (all three were built, measured, and rejected on sight in the flower).
- **Junction ≠ center ornament.** The flower's junction/base-ornament split recurs here
  one level up: the invisible plumbing that makes it one piece is a different thing from
  the *designed, visible* center (disc, dome, boss — whatever phase 2 decides it is).
  Conflating them cost the flower project several cycles.
- **`below: null` is the only state** for now — but keep the `below` parameter shape
  (`'stem' | 'branch' | null`, never a boolean) so a stem later is a value, not a rewrite.
- **Gate coverage starts where the flower's gate was blind** — and a DEFAULT IS NOT
  COVERAGE. The bare bloom was the shipping default for phases 1–3, so it was exercised
  by the default row and the whole arrangement sweep for free. The archetype ruling made
  DISC the default and deleted that coverage in one character: NONE went from "most rows"
  to zero. It now has EXPLICIT rows — its own named spread sweep and the two pinned
  "(centre off)" corners — because the flower shipped a 7-piece bare bloom for months
  precisely because every gate row enabled the thing that hid the defect. Whenever a
  default moves, check what it stopped covering.
- Sheets change the failure modes: fewer free-wire hazards, more thin-wall ones. The
  connectedness gate still can't see a free end — carry that limitation forward in its
  header.
- **Overlapping closed solids are THE CONSTRUCTION, not an accident — and petals already
  interpenetrate their neighbours at every setting that ships (measured Aug 31).** This is
  recorded so a later session finds it here instead of discovering it and filing it as a
  defect. Half the angular gap between adjacent petals at the foot ring is 4.69 mm at
  petalCount 3 and 1.55 mm at petalCount 40, against a default petal half-width of
  8.00 mm — so blades overlap at the ring in **every** reachable arrangement, flat, with no
  form applied. That is fine and it is deliberate: every primitive is an individually
  closed solid, the slicer unions them, and interpenetration adds no boundary edges and can
  only ever read as MORE connected, never less. The consequence for form work is that
  bending a blade toward a neighbour, toward the hub, or into the designed centre changes
  nothing about either gate's verdict — spine curl at 180° or more sweeps the blade back
  inside the hub rim and reaches r = 0.92 mm at 360°, and that is a shape decision, not a
  hazard. What is NOT covered by this: a single petal self-intersecting, which is a
  different property with its own guard (the roll curvature floor) and is invisible to both
  gates.

- **A coincident face reads as connected, and that bounds what this gate can endorse
  (measured Aug 31).** The cleft's panel overlap was expected to be the thing holding
  the lobes on; dropping it to zero left the panels sharing one cross-section exactly
  and the gate still reported ONE piece — correctly, per its own "two solids that
  merely graze within one cell read as connected" limit. Only a real gap (lobes
  starting a row ABOVE the base) turned it red, at five components with boundary edges
  still zero. So the gate distinguishes touching from separated, NOT overlapping from
  touching; any preference for real shared volume over a coincident touch is a
  slicer-robustness argument, and like every structural argument in this project family
  it is untested until something prints.

## Carried over wholesale (see the flower-project skill for full text)

- **Verification:** numbers, not summaries. A gate must measure the property that can
  fail, in both directions. Harnesses read back what they set (this caught 73/185 configs
  measuring the wrong design) and assert their own validity with a hard abort, verified
  by positive controls that can actually observe the failure. Gates run in CI. xfail rows
  cite issues and fail loud when they start passing. Run the same tree twice before
  concluding a config moved. Envelope deltas are meaningless for interior-aesthetic work —
  use triangle deltas or fixed-camera pixel diffs, chrome hidden, no autoRotate.
- **Registration rule:** every boundary has exactly one definition; one owner, everyone
  else reads it. Check producers as well as consumers, and filters as well as boundaries
  (the E3 defect was one producer, two consumers, different filters). Registry predicates
  are evaluated, never merely named. Applies at option granularity. Prefer a never-true
  predicate with a `hiddenReason` over a boolean flag.
- **Registry:** one registry drives DOM, inputs, defaults, reset, labels, listeners,
  gating, and option tiers. `enabledWhen` gates dependents on the choice that enables
  them (the Lace pattern — Eva's panel ruling). Tier is an input, never a filter.
  Standard is a curated view; edited via Advanced it shows CUSTOM. Shipped means
  reachable. Geometry and silhouette controls are Standard, not Advanced.
- **Conventions:** discovery before writing. New controls default to current behavior,
  verified by byte diff; anything else gets a schema bump and migration. A migration pin
  protects an aesthetic choice, not a defect. Prompt premises are hypotheses — check them;
  instructions bind. One registry PR in flight at a time (squash conflicts are not
  resolvable by preference). Contact sheet before committing anything visual. Batch
  questions.
- **Aesthetics:** loudness budget (~2.0 total, one element ≥0.7). Hierarchy at a measured
  step-down ratio (~0.6). Generated by the shape, never clipped to it. Derive, don't
  expose. Cap the output (measure triangles and refuse), never an input proxy — the
  parameter space has genuine cliffs.
- **Vocabulary:** the four curve terms — cross-section roll, spine curl, petal cup,
  twist — govern the petal-shape phase directly. Never accept "curly" without asking
  which one.
- **Arrangement facts worth having on day one:** ~~phyllotaxis reads as intentional only
  above roughly n≥8 — gate or flag golden-angle placement at low counts.~~ **CORRECTED
  Sep 1, when the arrangement was built: the aesthetic claim stands, "gate or flag" does
  not, and there is no threshold to gate on.** The obvious statistic — the ratio of the
  largest angular gap to the smallest — was measured across the whole count range and
  OSCILLATES between 1.62 and 2.62 at *every* n, driven by which Fibonacci number the
  count sits between: n=3 → 1.62, n=4 → 2.62, n=5 → 1.62, n=6,7 → 2.62, **n=8 → 1.62**,
  n=13,21 → 1.62, n=40 → 2.62. It is scale-free. There is no discontinuity at 8 or
  anywhere else, so a gate would have to invent its boundary. The claim that low-count
  golden angle reads as an irregular whorl rather than as phyllotaxis is REAL and it is
  AESTHETIC, so it ships as a **labelled read-out flag**, asserted in both directions by
  the panel gate (present when it should be, ABSENT when it should not — a flag only ever
  checked present is a flag that can be stuck on). Gating was rejected on two further
  grounds, recorded so it is not re-proposed: hiding the option strands the model IN the
  spiral state with the control unreachable ("shipped means reachable", violated for the
  state the model is in), and auto-resetting to RADIAL moves geometry as a side effect of
  a hidden rule. Same discipline as the roll clamp's "(clamped)" and the print-truth
  line. The sub-8 state is on `tools/shot-bloom-arrangement.mjs`'s placement sheet beside
  the same count in RADIAL, so the aesthetic claim gets ruled on from a picture.
  Arrangement is a whorl — `(count, radius, height, sizeRamp, angleRamp, phase, blade)` —
  and building it as that primitive from the start makes sepals, epicalyx, and involucre
  free later instead of a refactor (the flower learned this the expensive way, as a
  position paper it never got to build). **That prediction paid out in full: layers
  needed NOTHING new in the primitive — every per-layer quantity is one of its existing
  arguments.**

## Deliberately left behind

- **Relief / rib jitter** — retired in the flower for good reasons (the stated rationale
  was wrong; the deletion stood on better grounds). Do not rebuild it here.
- **The edge-treatment machinery** (TOOTHED/SCALLOPED and their defects) — edge is a
  later layer; only its *lesson* (one owner for "is this station covered") comes over.
- **All open flower defects** — they stay in the flower's tracker. Nothing here inherits
  a quarantine or a defect claim without re-verifying it; a defect report is a claim with
  an expiry date.

## Standing gaps that follow the project family

**Nothing in either project has ever been printed.** Every thickness floor and
slenderness argument is theory. The coupon plan (cantilevers at stepped diameters and
free lengths) still converts guesses into measurements the first time anything goes to a
printer — and sheet petals add a min-wall coupon to that list.

**Aug 31: a floor is now CAPPING something Eva asked for by eye, and that changes what the
coupon is worth.** Until the thickness layer every floor was a guess that never bound —
`SHEET_THICKNESS_MM` sat above `MIN_FEATURE_MM`, so nothing was ever clamped and the
assumptions cost nothing. Eva ruled the petal tip too thick; **while the 1.0 mm
minimum-feature assumption stands, the PRINTED tip can only thin from 1.20 mm to 1.00 mm —
17% — however far the slider goes.** The live view shows the full authored thinning and the
print will not have it. Real printed tip delicacy needs either a thicker base sheet
(2.40 mm tapering to 1.00 mm is a genuine 2.4:1 wedge, and it ships) or a coupon showing
1.0 mm is conservative.

Five numbers in this family are now load-bearing guesses that a single coupon print would
turn into measurements — and since the tip ruling, `TIP_HALF_MM` is no longer merely
reported: it is the floor that decides how pointed the PRINTED tip can be, on a shape Eva
ruled by eye. `MIN_FEATURE_MM` 1.0 (which caps the tip's thickness and the foot),
`FOOT_MIN_WIDTH_MM` 1.6 (the most delicate reachable connection), `TIP_CAP_HALF_MM` 0.15 (a
mesh floor, not a print one) and `ROLL_MIN_RADIUS_FACTOR` 1.0 (one sheet thickness, and it
now moves with the sheet).

**`TIP_HALF_MM` 0.8 CHANGED STATUS on Sep 1 and belongs at the top of that list.** For four
sessions it was a quiet constant that blunted a tip nobody had ruled on. It is now the number
that DECIDES HOW POINTED THE PRINTED TIP CAN BE, on a shape Eva ruled by eye and approved
from a picture: live converges to a 0.30 mm terminal face and the print floors it at 1.60 mm,
so the tip she approved is finer than the tip that would come out of a machine. **It has
never been verified by a printer.** That is the sharpest form the standing gap has taken —
an aesthetic decision, made on evidence, whose realisation is capped by a guess. A
coupon print is cheap, converts all four at once, and would retroactively improve every
clamp the thickness layer ships. It is the strongest candidate for the next session — a
better one than arrangement, which can be designed against assumptions but cannot resolve
any of them.

## Rulings to park for phase boundaries

- ~~Phase 2 entry: what *is* the bloom center, visually?~~ **Built as an A/B rig, Aug 31;
  the ruling itself is still open.** Eva's ruling at phase-2 entry was that the question is
  not answered by argument: three archetypes ship behind one `centerStyle` choice —
  DOME (rounded boss), DISC (flat/dished button), RING (open torus collar) — plus NONE,
  which remained the default until she ruled from the contact sheet. **She has: DISC,
  Aug 31, after the form phase — see the archetype entry below.** The centre is DESIGNED and user-chosen;
  the junction stays derived and control-free beneath it, and the registry's `role` field
  now carries that split (`center` vs. the deliberate absence of any `junction` row).

- ~~The archetype ruling itself — DEFERRED until after the petal-shape phase~~
  **SETTLED Aug 31, after the form phase: DISC is the shipping default.** The deferral
  did exactly the job it was parked for, and BOTH halves are recorded here so the
  reversal is legible rather than mysterious:

    - **What session 2 said, and why it was right to wait.** `centerStyle` stayed NONE,
      nothing was deleted, no style promoted — on a finding from the sheet rather than
      indecision: the petals were still placeholder ovate sheets, and a dome or a ring
      should be ruled on against the real silhouettes it will sit among, not against
      stand-ins. That note also observed the four styles were **"visually
      indistinguishable"** at the spreads then in use, and that observation was true of
      what it was looking at.
    - **What supersedes it.** Ruled against petals with REAL FORM — cup, spine curl,
      cross-section roll and twist all reachable — the styles are no longer
      undifferentiated, and DISC is the one that reads. The session-2 "least
      differentiated" observation is therefore SUPERSEDED, not contradicted: it was a
      measurement of the archetypes against flat placeholder blades, and the thing it
      measured no longer exists. A reader who finds only the newer note and wonders why
      an earlier session called these interchangeable has the answer here.

  Sub-control defaults are UNCHANGED. This is the deliberate SECOND EVENT under the
  spread precedent: the rig landed byte-identical in phase 2, and the default moves now,
  as a design ruling, on evidence — which is expected to move exports and did, with the
  partition asserted both ways below.

- **Spread default 1.00 → 2.00 — settled Aug 31, on evidence from the same sheet.** At
  1.00 the foot ring is 4.42 mm against a 35 mm petal and eight 6.4 mm feet tile straight
  over it, so *any* centre is buried under the petal bases; below roughly 2× the four
  styles are visually indistinguishable. A default that hides the thing the panel just
  exposed is the wrong default. Recorded as two separate events, deliberately: the control
  LANDED at 1.00 with every pre-existing export bit-identical (0 of 47 moved — the
  new-control convention, satisfied), and the default THEN moved as a design ruling, which
  is expected to move exports and did: exactly the 57 of 76 matrix rows that inherit the
  default, with all 19 that pin `spread` bit-identical. No schema bump or migration: the
  bloom persists no designs yet, so no saved value can be misread.
- ~~Foot ownership~~ **Settled Aug 31:** the foot ring — where feet land, and the foot
  cross-section — gets one named owner function in **phase 1**; the petal builder and the
  phase-2 center builder both read it. No second definition, ever.
- ~~Phase 3 entry: which of the flower's six absences the petal model should avoid
  inheriting~~ **Settled Aug 31: BOTH, architected from day one, neither shipped.**
  The placeholder ovate is replaced by a width PROFILE over a trimmable DOMAIN.
  Width is a term list with per-term domains combined by plain `Math.max` (Eva's
  ruling: one combinator, trivially bit-exact; the worst reachable kink is
  photographed rather than pre-engineered away). The boundary is a list of spans per
  row, meshed as single-span PANELS, so a cleft is a base panel plus two lobe panels
  rather than one grid with a hole — closed by construction instead of by argument
  about the sinus.

  **Neither claw nor cleft is a control, and both are PROVEN rather than claimed.**
  Two non-shipping capability rows, reachable only through `window.__bloomCapability`
  (no registry row, no DOM input), run in both gates: CLAW asserts a strict interior
  local minimum in the row half-widths — narrower than both its foot and its blade —
  and CLEFT asserts two spans at the tip. Both export watertight and as ONE connected
  piece, so no xfail was needed. The structural assertions read the app's own
  profile/trim evaluation, not the STL; that scope is printed beside each capability
  row's result, not only in a header.

  **Shipped: three Standard controls, all `role: 'petal'`** — Base taper and Tip taper
  (the CORE term's exponents, defaults exactly the placeholder's 1.0 and 1.8) and Tip
  breadth (default exactly 0). The widest point `a/(a+b)` is DERIVED and printed in
  Tip taper's read-out; a control for it would be a second owner. Tip breadth exists
  for a measured reason: `w(0) = w(1) = 0` for every `a,b > 0`, so the exponent family
  is pinched to a point at BOTH ends and cannot reach a truncate or rounded tip — the
  placeholder's tip was never a shape, it was the 0.8 mm blunt-tip floor governing the
  last 4 of 28 blade rows.

  **The engine landed BYTE-IDENTICAL: 0 of 76 configs moved** on `phase2Matrix()`, the
  76 rows frozen at 21d4602 (proved deep-equal to that commit's own `buildMatrix()`
  rather than transcribed and hoped for). The three controls add ZERO triangles at
  every shipped setting — the grid stays 31x10 — so the default bloom is 10,080 tris
  live and export alike, unchanged.

  **The foot is untouched, and it is MEASURED, not asserted.**
  `diff-bloom-bytes.mjs --region foot` hashes the export triangles all of whose
  vertices lie in the hub slab (|z| <= t/2), which at any tilt > 0 is exactly the foot
  rows plus the hub disc: bit-identical on all 71 in-scope rows. The 5 rows at
  petalTilt 0 are reported OUT OF SCOPE — with no tilt the blade lies in the same
  plane and the criterion cannot separate them — never as passes.

- ~~The default silhouette — open, and deliberately separated from the engine~~
  **Settled Aug 31 from the candidate sheet: the POINTED OVATE STAYS.** Eva ruled
  against both candidates; no close-out commit was made and no default moved. So the
  silhouette engine landed as ONE event, not two: the engine is byte-identical (0 of 76)
  and the shipping default is the value the placeholder had.

  This is a decision, NOT an absence of one, and the difference matters to whoever picks
  this up next. ROSE-ish and POPPY-ish were built, rendered face-on beside the ovate with
  their control values in the cell, and rejected on sight. They remain as named rows in
  the gate matrix and as cells on `tools/shot-bloom-silhouette.mjs`'s candidate sheet —
  they are gate coverage of the region the controls are FOR, and they must not be deleted
  as "unused presets". Reopening the default is a fresh ruling needing fresh evidence;
  do not treat the ovate as a placeholder still awaiting replacement, because it is not
  one any more. Were the default ever to move, it would still be its own event with a
  partition report — the spread precedent — since every export inheriting it moves.

- ~~The max-combinator kink — a hypothesis on the sheet~~ **Settled Aug 31: PLAIN
  `Math.max` STAYS, and the kink reads fine.** Eva ruled from the tip-cropped sheet, at
  the worst case the shipped ranges reach (tip breadth 0.60 against the steepest falling
  core, 60 mm petals). No p-norm blend is queued and none should be written.

  The saving is the point, and it is the reason this was photographed rather than
  engineered around: a smooth blend would have needed term-count switching to stay
  bit-exact, plus an epsilon story about the moment a term appears — complexity bought
  against a corner nobody could object to once they saw it. ONE combinator now governs
  the shape terms and the floors alike, which is also what makes the byte argument short
  enough to check by eye. Do not reopen this on the strength of reading the code and
  imagining the corner; the picture exists, and a fresh ruling needs a fresh picture.
- ~~Phase 3, the petal's 3D form: the four curves~~ **Built Aug 31, all four shipped, all
  flat by default.** `petalCup`, `petalSpineCurl`, `petalRoll` and `petalTwist` — Standard,
  `role: 'petal'`, signed, defaulting to exactly 0. Ordering is not free and the argument is
  in `petalForm`'s header: curl builds the centreline and base frame, twist rotates that
  frame about the curled length direction, roll maps the width to an arc in the resulting
  plane, cup lifts along that plane's normal. Curl before twist because curl's bend axis IS
  the width direction — twisting first would make the spine writhe into a helix instead of
  curling in a plane.

  **Petal tilt is not spine curl, and the code says so in one line:** `phi(u) = petalTilt +
  curl*u`. Tilt is the CONSTANT OF INTEGRATION (the frame at u = 0, zero derivative, the
  whole blade rotating rigidly); curl is the RATE. They rotate about the same axis, which is
  exactly why they get conflated, and being the two terms of one affine angle function is
  what makes them unambiguous. Curl's read-out prints the DERIVED spine radius; tilt has
  none, because a rigid rotation has none.

  **Byte-identity is a GUARD, not an IEEE-754 argument, and that was a deliberate
  downgrade.** Cup would have survived one and twist very nearly would; roll and curl carry
  a `1/kappa` that is a genuine 0/0 limit at zero and could not. Resting the whole layer on
  a case analysis about signed zero (`T` is `-0` in its first component at azimuth 0, and
  `-0 + 0` is `+0`) was the wrong trade, so `petalFormIsFlat()` short-circuits to the
  pre-form expression verbatim. The guard is not allowed to be somewhere a bug sits
  unexercised: `formGuardResidual` evaluates the ZERO-form law against the flat law at every
  emitted point and frame, and both gates assert it. It measures **exactly 0**.

- **BOTH SHIPPED GATES ARE STRUCTURALLY BLIND TO PURE DISPLACEMENT (derived and confirmed,
  Aug 31), which is why the form layer had to ship its own instrument.** The export gate's
  criterion is boundary edges on a mesh whose topology is fixed — `NU`, `NV` and the panel
  count depend on no form control — and displacement cannot change an edge census. The
  connectedness gate cannot fire either: the foot is never written by the form layer and the
  hub disc spans it, so no reachable curl / cup / roll / twist detaches a petal. The
  tempting positive controls were checked and rejected for exactly this reason — a roll
  radius below t/2 self-intersects while staying watertight and one piece; interpenetration
  is not a failure at all and only helps connectedness; a skewed sheet leaves topology
  untouched. So `formAssertions()` runs in BOTH gates on EVERY row and asserts what the STL
  cannot show: foot invariance in exact arithmetic, roll isometry, the curvature floor, and
  the guard residual. **And a frozen matrix cannot substitute for it:**
  `--region foot` proves whatever its matrix exercises, and every row of a frozen matrix
  sits at the defaults of every later control — which for the form layer is exactly flat.
  A mutant that deforms the feet on purpose reads `81/81 BIT-IDENTICAL` on the frozen 86
  and `21 of 98 moved` on the live 103. "The foot did not move at defaults" and "the foot
  is invariant under form" are two claims, and only the second is the invariant. **Do not read a green export or connectedness run as endorsing any
  form property.**

- **The roll curvature floor — cap the output, never the input.** A rolled sheet's inner
  offset surface sits at `radius - t/2` and INVERTS below that. At `petalWidth` 8 a full turn
  asks for a 0.637 mm radius against a 0.6 mm half-thickness. The floor is one full sheet
  thickness, applied inside `petalForm` and nowhere else, and the control SATURATES rather
  than degenerating; the read-out says "(clamped)" so a slider that has stopped moving does
  not read as broken. Like every structural number in this project family this is an
  assumption with a number attached, not a printed result.

- **Roll is isometric here too — but the flower's premise needed restating before it could
  be checked, and that restatement is the finding.** "|dP/dv| = 1" is a statement about a
  UNIT-SPEED cross-width parameter. This model's `v` is normalised and scaled by the row
  half-width, so the FLAT sheet already has `|dP/dv| = h(u)`, ranging 0.8–8.0 mm. The
  comparable quantity is the RATIO to flat, which is what the flower's numbers actually are.
  Measured on this model: roll holds the ratio at **1.000000 at every sample and every
  value**; cup is the only one of the four that moves it, at **1.0925 at 0.22 and 1.7532 at
  0.72** — reproducing the flower's 1.09 and 1.75 to three decimals, which is independent
  confirmation that the same parabolic law transfers. At the shipped maximum of 1.20 it is
  **2.600**: kept (Eva, Aug 31) and photographed, because the closed tulip is a real form and
  the flower's 0.72 was a range choice rather than a safety rule.

- **The emitted polyline is not the curve, and no other gate here can see the difference.**
  Roll is isometric as a MAP and NOT as emitted geometry: the panel emits `NV = 10` columns,
  so the cross-section is a 9-segment chord path inscribed in the arc and carries up to
  **7.9% less material** than the flat row at maximum roll (0.9207 at the widest row, 0.9992
  at the tip). `NV` stays 10 (Eva, Aug 31): constant topology is what makes the form layer
  cost exactly zero triangles, and the faceting is photographed with the measured ratio
  printed in the cell rather than bought with triangles. Raising `NV` under roll is later,
  separately-evidenced work with its own triangle-count story — it would also be the first
  thing in this codebase to make triangle count depend on a slider. Do not start it on the
  strength of this note alone.

- **The export feature-size floor cannot move TRIANGLE COUNTS here — but it now moves
  GEOMETRY, and the half of this note that said otherwise has EXPIRED (rewritten Aug 31,
  the thickness layer).** The flower measured a pure-displacement effect changing export
  counts because its floor is evaluated per feature and displacement moved features across
  it, adding or removing tube segments. **The surviving reason** that cannot happen in the
  bloom: every primitive is a fixed-topology grid — `NU`, `NV`, the panel count and every
  centre segment count depend on no control — so the floor changes geometry but never
  triangle count. Re-measured across the thickness layer's own 120-row matrix, ALL-THIN
  corners included: **delta 0 on every row, live against export.**

  **The EXPIRED half, recorded rather than deleted.** This note also said
  `SHEET_THICKNESS_MM` (1.2) is above `MIN_FEATURE_MM` (1.0) so `floorThickness` never
  binds, and concluded "if live and export ever disagree on a bloom row, it is a bug, not
  the floor". That was true of the CONSTANTS and is false of the CONTROLS: `sheetThickness`
  reaches 0.60 mm, and the tip gradient crosses the floor from thinning 0.17 upward at the
  shipping 1.20 mm sheet. Live and export geometry now legitimately differ. Session 4 called
  this "a property of the constants, not a rule" and was exactly right; the claim expired
  where it said it would.

  **The divergence is not confined to a wall, which is the part to carry forward.**
  `footRing()`'s area rule reads the thickness the solids are ACTUALLY built at, so flooring
  the sheet moves the RING RADIUS: at a 0.60 mm sheet the ring is 6.25 mm live against
  8.07 mm printed — a 29% difference in the whole arrangement, not a wall. **Eva's ruling
  (Aug 31): no geometry change in either mode** — the one-owner rule is doing exactly what
  footRing()'s header says it should, and live mode stays authoring-true — **but the
  divergence must be TOLD.** The read-out prints both radii, labelled, whenever they differ,
  on the same discipline the triangle counts have carried since the counts stopped being
  convertible; and the state has its own cell on `tools/shot-bloom-thickness.mjs`'s
  divergence sheet.

- **PARKED, and deliberately not built: a "print preview" toggle** rendering the
  export-floored geometry live. The reasoning that parks it is the same reasoning that
  would eventually build it: a preview that silently shows an arrangement the print will not
  produce is the same lie as an unlabelled triangle count — a labelled one is honest, and a
  second, rendered one would be better still. It is a second rendering path with its own
  camera, read-out and gate story, and the labelling is what makes today's state honest
  without it. Do not start it on the strength of this note alone.

- **The form sheet — RULED Aug 31, all three questions closed.** The teaching sheet
  holds: swept alone, each in the view its own curve is visible in, the four read as
  four different things and the controls ship as authored. Both extreme cells are
  ACCEPTED as shipped extremes rather than tolerated defects, photographed and numbered:

    - **Max-roll faceting stays, and `NV` stays 10.** The emitted cross-section is a
      9-segment chord path inscribed in the arc and carries up to 7.9% less material
      than the flat row (0.9207 at the widest row, 0.9992 at the tip). Constant topology
      is what makes the whole form layer cost exactly zero triangles, and that is worth
      more than the facets cost. **NO NV-under-roll work is queued and none should be
      written.** Reopening needs FRESH EVIDENCE — a new picture, not a fresh reading of
      this number.
    - **The ROLL CLAMP look stays.** The only reachable state where the curvature floor
      binds (roll max × petalWidth 8, radius held at 1.20 mm, printed "(clamped)").
      Saturating is the intended behaviour, not a bug to design around.

  Both cells are on `tools/shot-bloom-form.mjs`'s sheets with their measured numbers in
  the caption. Same standing as the max-combinator kink: the ruling was made on a
  picture, and a fresh ruling needs a fresh picture.

- ~~The thickness layer — a single constant everywhere~~ **BUILT Aug 31, on Eva's ruling
  from the live page: the petal-to-centre connection is too thick, and the petal tip is too
  thick.** Both were one absence: `SHEET_THICKNESS_MM` was read at both call sites, so foot,
  blade and tip were the same number by construction and neither complaint had a slider.

  **Three Standard controls, all `role: 'petal'`, all byte-identical at their defaults:**
  `sheetThickness` (0.60–2.40 mm, default 1.20 — the double the constant held, asserted
  equal to it at harness load so the two cannot drift), `tipThinning` (0–0.80, default 0 —
  the law `base * (1 - thin*u)` is `base * 1` is `base`), and `footDelicacy` (0.25–1.00,
  default 1.00 — `x * 1.0 === x`, the spread precedent). Zero triangles at every setting:
  the default bloom is 11,136 tris live and export alike, unchanged.

  **Delicacy scales the foot's WIDTH, and the argument is a measurement.** A
  thickness-scaling delicacy is INERT IN EXPORT below 0.833 at the default sheet — the
  1.0 mm floor eats 83% of its range — so it would move the live page and nothing that
  prints. Width survives the floor across its whole range, and because the area rule reads
  it, the ring and the hub plate close with the foot. It is NOT the claw: the claw is a
  silhouette term producing a strict interior local minimum; this scales the foot and
  everything that reads it, monotonically, so Eva's rounded/ovate ruling stands untouched.

  **`footRing()` remains the sole owner and gained no second copy.** The new controls FEED
  it; `buildPetalInto` now READS `ring.thickness` instead of computing its own
  `floorThickness()` of the same constant (a harmless second producer until thickness became
  a control). The junction still derives everything from the petal's foot — the hub slab is
  built at `ring.thickness`, so a delicate foot gives a thin hub with no code mentioning
  either control.

  **Foot invariance is STRUCTURAL, not guarded.** The profile is evaluated at the row's own
  `u`, and the three foot rows carry `u = 0`, so `1 - thin*0` is exactly 1 at every thinning
  value. Using the row INDEX instead is a one-character bug that moves the junction, and it
  is this session's positive control — invisible to both STL gates and to every frozen
  matrix, caught only by the reworked foot assertion.

- **The foot–hub overlap at minimum foot dimensions — re-derived Aug 31, still holds by
  construction.** The overlap is a solid box: radial depth `overhang = max(1.5, 0.4·r)`,
  circumferential extent `ring.width`, vertical extent `min(footT, hubT)` — and those two
  are EQUAL by construction, since the hub is built at `ring.thickness`. At the worst
  reachable corner every dimension is bounded below independently of the new controls:
  **≥ 1.5 mm × ≥ 1.6 mm × ≥ 1.0 mm** (the export floor), every edge above the 0.6 mm voxel.
  Delicacy shrinks the radius, but `overhang` is a FRACTION of it with a 1.5 mm absolute
  floor, so it cannot shrink proportionally away. The ALL-THIN corner rows were added
  anyway, in both gates: a default is not coverage, by-construction is an argument rather
  than a measurement, and the thin extreme is precisely the region this change affects.

- ~~The tip's squared-off end~~ **RULED Sep 1, from the tip sheet: THE TIP COMES TO A
  POINT — and the CONSTRUCTION was approved by eye on the before/after sheet, not only the
  intent.** What Eva approved is specifically: the DERIVED cap entry, the TRUNCATED MINI-FACE
  apex, and the partition on `petalTipBreadth === 0`. Three sheets' worth of alternatives
  were not on the table — this is the shape that was seen and accepted, so reopening any of
  the three is a fresh ruling needing a fresh picture, on the max-combinator precedent. The squared end was never the profile. `TIP_HALF_MM` floored EVERY row in BOTH
  modes, so at the shipping defaults four of the 28 blade rows — profile 0.795, 0.398,
  0.119, 0.000 — all clamped to 0.800 and ran PARALLEL, and a flat face square to the blade
  capped that stub. The exponent family already reaches zero; the floor truncated it and
  then capped the truncation.

  **THE POINTED FAMILY ONLY, and that is what makes the partition sharp.**
  `petalTipBreadth === 0` converges; above zero the flat end is an AUTHORED TRUNCATE (rose,
  poppy) and is untouched. Measured both ways on the 125-row live matrix: **117 rows have
  breadth 0 and all 117 moved; 8 do not and all 8 are bit-identical.** This needed a new
  instrument — `--partition-value` — because "pins the control" and "resolves to this value"
  are different axes and they disagree on real rows here (`petalTipBreadth min` pins and
  MOVES; `ALL MAX` pins 0.6 and HOLDS), so the existing `--partition` would have produced a
  confident wrong report.

  **THE CAP ENTRY IS DERIVED, not a fixed length**: `min(1 - TIP_CAP_FRACTION, crossing of
  CAP_ENTRY_FACTOR x TIP_HALF_MM)`. Each rule fails alone — a fixed final fifth covers the
  stub at the defaults, but at `petalTipTaper` 4 the floor flattens TEN rows and the profile
  is 0.125 mm by u = 0.80, so a cap starting there would have to WIDEN toward the tip to
  reach the export floor. Measured: the crossing rule takes over at uCap 0.592 on that row.
  Taking the later start guarantees an entry of at least twice the print floor, so export
  converges at least 2:1 instead of degenerating back into the stub it replaces.

  **THE APEX IS AN EXPLICITLY TRUNCATED MINI-FACE, NOT A TRUE APEX VERTEX**, and the choice
  is forced rather than preferred. (1) Topology must not depend on mode: the export gate now
  rates live-vs-export triangle counts, and a true apex in live with a floored face in export
  is two different meshes. (2) It is the DOME's bug — and this was MEASURED, not argued: a
  true-apex build exports **288 degenerate triangles and 168 non-manifold edges per bloom
  with boundary edges still 0**, watertight and wrong, exactly 36 per petal (the terminal
  face's 9 quads top and bottom collapsing). `analyzeStl` now counts zero-area triangles from
  the raw floats before quantisation, and the export gate FAILS on any.

  **TRIANGLE COST IS STILL ZERO, which was not the prediction.** The cap re-uses the grid it
  already had — same NU, NV, panel count and end face — and moves only where vertices sit. A
  cap built as new geometry beyond the last row would have moved the count for the first time
  in three sessions; this one does not, so the zero-cost claim above stands unamended. The
  default bloom is 11,136 tris, live and export, before and after.

  **WHAT THE FLOOR STILL DOES TO THE PRINTED TIP.** Live converges to a 0.30 mm terminal
  face; export floors it at 1.60 mm. So the point on screen is finer than the point that
  prints — the same live-vs-printed divergence as the sheet thickness, now in the outline as
  well, and one more assumption riding on a coupon nobody has run.

  **PARKED, deliberately, as a FUTURE RULING: the tiny-breadth floor artifact.** The
  partition branches on `petalTipBreadth === 0` EXACTLY, which is what makes it sharp and is
  what was ruled. But at a very small breadth — 0.01 gives a 0.08 mm tip that the print floor
  lifts to 0.80 — the end is still a floor artifact wearing an "authored truncate" label, and
  the sharp rule is what puts it there. The honest alternative is to converge whenever the
  floor binds at the tip, which describes the geometry better and blurs the partition into
  "rows where a floor happened to bind", so it could not have been asserted the way this one
  was. NOT a defect and not open work: it is a ruling Eva has not been asked for, on a region
  of the range nobody has yet had a reason to visit. Raise it with a picture of a
  small-breadth tip beside a pointed one; do not change the branch on the strength of this
  note.

- Presets: Eva authors them herself once the panel is settled (standing ruling from the
  flower panel audit).
- ~~Ring radius / spread exposure — re-decide at phase 2 entry~~ **Settled Aug 31, at
  phase-2 entry: EXPOSED.** The phase-1 grounds for hiding it — that a spread-out ring
  would have nothing in its middle but plumbing — expired the moment the designed centre
  existed to occupy that middle, exactly as parked. `spread` is a Standard slider,
  0.60–6.00, **default 2.00 (Eva, Aug 31)**, applied inside `footRing()` and nowhere else:
  the area rule still *derives* the radius and spread only scales it. Eva's ruling on the
  lower bound: **the area rule is a reference, not a cage** — below 1.00 the ring is
  tighter than the derived radius, feet crowd and at the extreme cross the axis, and that
  state is reachable on purpose. The
  junction reaches every foot by construction at every spread, because `overhang` is
  expressed in the same units as the radius (max(1.5, 0.4·r)), making the foot–hub overlap
  a fixed *fraction* of the ring rather than a tuned length.

- **The hub disc at high spread — a flagged candidate, NOT open work (Aug 31).** The
  junction is a full disc of the foot-ring radius, so its extent tracks spread: at the
  defaults × spread 6.00 with `centerStyle: NONE` it is a 53 mm plate 1.2 mm thick, and
  the plumbing becomes the loudest thing in the frame. This is precisely the state this
  charter predicted when it parked the spread question. Eva's ruling: ship the disc,
  photograph the state honestly, and let the sheet decide — the alternative (rebuilding
  the hub as an area-ruled annular band, extent = ring radius but mass = area rule) is a
  separate piece of work needing its own before/after evidence, and it only becomes real
  work if the plate turns out to be objectionable at spreads anyone would actually use.
  Do not start it on the strength of this note alone.

- ~~The control panel as one flat column~~ **GROUPED INTO SECTIONS Sep 1, on Eva's
  ruling: "the panel is a lot to scroll through and it's only going to become more —
  group it into sections before the arrangement work adds its controls."** Twenty
  controls in one column, with layer and spiral controls still to come. **Zero geometry
  change, and that is the whole acceptance bar:** 0 of 47, 0 of 76, 0 of 86, 0 of 106
  frozen rows and 0 of 125 live rows moved — 440 rows, every exported byte untouched,
  against a worktree at a5cac8b with zero tracked modifications. Both geometry gates
  125/125 in CI on the same head. The default bloom is 11,136 tris live and export alike
  and 543.8 KiB of STL, before and after.

    - **THE GROUPING IS REGISTRY DATA AT SECTION GRANULARITY, and the split of ownership
      is the design.** Membership is a field on the CONTROL (`section: 'form'`);
      identity, order and first-load openness are the `SECTIONS` array; order WITHIN a
      section is the `CONTROLS` array's own order, filtered. No list of ids lives in
      `SECTIONS` — a section naming its members would be two lists to keep in sync in
      the file that exists to state the registration rule, and the panel would silently
      drop whichever an edit missed. `verifySections()` runs at module load and throws,
      so the app, both gates and every shot tool get the relation checked for free.

    - **SECTION IS NOT ROLE, and refusing to conflate them was the first design
      decision.** `role` says which part of the MODEL a control owns and is load-bearing
      in `buildMatrix()`; `section` says where it sits in the panel. They genuinely
      disagree — `sheetThickness` is `role: 'petal'` because the junction derives from
      the petal, and sits in PART THICKNESS because it also governs the hub slab
      and the centre floors. Deriving sections from roles would have forced the re-role this
      registry's own header calls a stop-and-raise, and produced one 14-control "Petal"
      section, which is the problem rather than the fix. **No role changed. Two
      mismatches are FLAGGED and deliberately not acted on:** `petalCount` is
      `role: 'petal'` while being the whorl's own count — literally the first parameter
      of the whorl primitive — and `petalTilt` likewise while being a per-slot rigid
      orientation. Both are reasonable readings awaiting a ruling; neither is a defect.

    - **THE PANEL IS AN ACCORDION — opening a section closes the others (Eva,
      Sep 1, from the panel sheet), WITH THE TRADEOFF STATED AND ACCEPTED:**
      tweaking across two sections costs a reopen click, and the
      layers-are-sections structure makes single-focus the normal case. First
      load is ARRANGEMENT ALONE. Exclusive-open has ONE owner in the panel
      generator — a single capture-phase listener on the panel root, never a
      listener per section, because N copies of one rule is the thing that
      drifts.

    - **THE SUPERSEDED TWO-OPEN RULING, BOTH HALVES, so the reversal is
      legible.** Earlier the same day Eva ruled Arrangement AND Petal shape
      open at first load with the other three collapsed, and that was right
      for what it was ruling on — sections that opened and closed
      independently. The accordion makes any two-open state UNREACHABLE, so
      the earlier ruling was not overridden by preference; its subject stopped
      existing. `open` in `SECTIONS` therefore stopped meaning "which sections
      start open" and now means THE ONE SECTION OPEN AT FIRST LOAD, with
      `verifySections()` enforcing at most one `true` — zero is legal, since
      every section shut is a state a visitor reaches by closing the open one.

    - **`open` IS AN AUTHORED LITERAL, AND THE RULE THAT WOULD HAVE DERIVED IT
      IS DEAD — the second rationale on this one field to die while its
      instruction stood, which is worth a reader's attention.** The proposal
      was "collapse a section iff every control in it is at an identity
      default", exactly true of Petal form's four curves (all 0, the flat
      short-circuit) and Part thickness's three (all reproducing the old
      constant). It was already false of the panel that shipped — CENTER's
      DISC / 0.75 / 0.35 are authored aesthetic defaults, not identities, and
      Petal tilt (default 25°) moved into Petal form — and the accordion makes
      it incoherent as well, since at most one section can be open whatever
      its contents are at. Do not reintroduce it, and do not make `open` a
      predicate: that would put collapse under `visibleWhen` as a second
      hiding mechanism and make the panel rearrange itself under the user
      mid-drag.

    - **"MATERIAL" IS NOW "PART THICKNESS", AND THE ID MOVED WITH THE LABEL**
      (Eva, Sep 1). An id that contradicts its label is a stored label-lie: it
      reads as a declaration, a later reader checks it and believes it, and a
      name for a thing that is not the thing is this project family's most
      repeated defect. Nothing weighed against the rename — `section` is panel
      presentation, never persisted, and it is not a control id, so
      `RETIRED_IDS` does not apply and no migration is owed. **Were a section
      id ever to reach a saved design, that calculus inverts and a rename
      becomes a retirement.** What the name is slightly wrong about is stated
      in the registry rather than left to be discovered: the section also
      holds `footDelicacy`, which scales a WIDTH. It belongs there because the
      three are one layer — the part's own material dimensions, which decide
      how delicate the printed object is — and because delicacy's width is
      what the area rule reads to size the ring. If the name ever reads wrong,
      the LABEL moves on one ruling and the id moves with it, exactly as here.
      Do not fix it by re-homing the control.

    - **`toggle` IS QUEUED, NOT SYNCHRONOUS, and it does NOT BUBBLE — measured
      before the accordion was built on it, and both facts are load-bearing.**
      Capture descends from the document through every ancestor regardless of
      bubbling, which is what makes one listener on the panel root possible at
      all. And because the event is queued, two programmatic opens in one tick
      BOTH land and the handler settles afterwards — so exclusivity is
      eventually-consistent within a tick. It is invisible to a visitor (one
      click is one toggle) and it is exactly what a gate reading exclusivity
      synchronously would fail on, which is the shape of a check that then
      gets "fixed" by weakening the app. Every accordion assertion in
      `verify-bloom-panel.mjs` awaits a frame for that reason. A third fact
      came from the same probe and is the negative control: a capture listener
      added later on the DOCUMENT still runs EARLIER than the panel's, so
      `stopPropagation()` there makes the accordion handler unreachable
      without touching it.

- ~~The arrangement grows up: layers and spiral~~ **BUILT Sep 1. Five Standard controls,
  all `role: 'arrangement'`, all in ARRANGEMENT — `placement` (RADIAL/SPIRAL),
  `layerCount` (1–3, default 1), and three sub-controls gated on it by `visibleWhen`:
  `layerSize` (0.35–0.90, default 0.72), `layerPhase` (0–1 slot, default 0.50),
  `layerTilt` (0–30°, default +12).** Exactly the shape this charter's ROOM TO GROW note
  predicted — a layer-count control in that section with per-layer sub-controls gated on
  it, the `centerStyle` pattern one level up, not a section per layer. **Mirrored was
  explicitly deferred and NOTHING was half-wired for it.**

    - **LAYERS NEEDED NOTHING NEW IN THE WHORL PRIMITIVE, and that is the session's
      cleanest finding.** Every per-layer quantity is one of `buildWhorlInto`'s existing
      arguments: count (shared, derived), radius (derived), height (derived 0), sizeRamp
      (`layerSize`), angleRamp (`layerTilt`), phase (`layerPhase`). The full signature
      carried since session 1 is exactly what this needed. `placement` is the one thing
      the primitive genuinely computes and is the only argument added.

    - **HEIGHT IS NOT A CONTROL AND NEVER WILL BE — the trap this session owned, ruled on
      a measurement.** A foot at z = h spans [h−t/2, h+t/2] against a hub slab spanning
      [−t/2, +t/2], so solid overlap requires |h| < t: **1.20 mm at the shipping sheet,
      0.60 ALL-THIN, against a 35 mm petal.** A height control constrained to keep feet in
      the slab has a range nobody can see, and it CANNOT BE WIDENED because the bound is
      the sheet itself — DEAD ≠ INVISIBLE says delete it, and "widen and re-test" is
      unavailable. **Depth comes from TILT instead: inner whorls tilted steeper raise
      their tips 6.60 mm above the outer whorl (layerSize 0.90 × layerTilt +12) with every
      foot still flat at z = 0 — 5.5× what any safe height control could give.**
      THE COSTED FALLBACK, recorded rather than re-derived: extending the junction to
      REACH lifted feet (a derived collar spanning [0, h] under each inner ring), a second
      junction primitive with its own watertightness argument and gate rows. It is NOT
      built and there is NO STUB. **The only evidence that reopens it is Eva finding the
      tilt-driven layering flat on `tools/shot-bloom-arrangement.mjs`'s layers sheet** —
      which is why that sheet exists and why the ruling was made conditional on it.

    - **BOTH SHIPPED GATES ARE BLIND TO THE JUNCTION UNDER LAYERS, and this is MEASURED,
      not cautious. A GREEN CONNECTEDNESS RUN DOES NOT ENDORSE IT.** Two mutations were
      run against the gate before the instrument was written:
        * **THE WRONG HUB** — building the junction slab at the wrong layer's radius (min
          over layers instead of the owner's R0). At the defaults with three layers the
          outer whorl's feet end 7.94 mm out against a hub stopping at 6.86 mm: joined to
          nothing. **The gate reports ONE region, 0.00% detached — it PASSES**, on all
          five configurations tried. Consecutive foot annuli overlap EACH OTHER (layer 0's
          feet span [7.94, 13.23], layer 1's [5.72, 9.53]), so the outer whorl hangs on by
          a CHAIN through the inner layers, with blade interpenetration on top.
          Connectedness under layers is OVER-DETERMINED and the flood fill cannot separate
          a correct hub from an incorrect one.
        * **THE LIFTED LAYER** — the junction derivation dies at |h| ≥ t = 1.20 mm and the
          gate does not split until h ≥ 2.5 mm. **The band between is detached by
          derivation and reads as one piece**, confirmed across eight scenarios; none
          split before 2.0 mm.
      So the arrangement layer shipped its own instrument, exactly as the form and
      thickness layers each had to: **`junctionAssertions()` (J1–J4), in BOTH gates, on
      EVERY row**, in exact arithmetic from the app's own metrics — J1 every layer's feet
      in the hub plane carrying the ring's own cross-section, J2 containment, **J3 the
      foot REACHES the hub disc (the wrong-hub mutation's only witness)**, J4 the overlap
      box against its own floors plus hub thickness = foot thickness. The foot-frame
      assertion MOVED here out of `formAssertions()`, where it only ever saw layer 0.

    - **THE OVERLAP BOX DOES NOT DEGRADE WITH LAYERS.** None of `overhang` (1.5 mm
      absolute floor), `width` (FOOT_MIN_WIDTH_MM) or `thickness` (MIN_FEATURE_MM in
      export) is a function of the layer index, so the standing worst case — ≥1.5 × ≥1.6 ×
      ≥1.0 mm — is the SAME bound per layer at any layerCount. Measured at ALL THIN ×
      spread min × 3 layers: **2.40 mm³ on every layer**, exactly the single-ring number.
      Containment is a CONSEQUENCE, not a clamp: `layerSize` maxes below 1, so
      radius_L ≤ R0 and each foot's whole footprint lies inside the hub disc — strictly
      stronger than the single-ring argument, where only layer 0's feet overlapped the rim.

    - **`footRing()` RETURNS N RINGS PLUS THE HUB, and the layered return is the design.**
      One call, one owner. A per-layer call satisfies "one owner" on its face and FAILS
      "no per-layer consumer arithmetic": the hub radius and the area-rule total are
      functions of every layer at once, so a consumer would have to sum them. R0 is now
      the area rule over EVERY foot; radius_L = R0 · layerSize^L; hub.radius = R0, which
      IS layers[0].radius rather than a `Math.max` that merely agrees with it.

    - **THE 1-ULP TRAP FIRED ON A REAL ROW, so the guard is LOAD-BEARING rather than
      insurance.** `Math.sqrt(count · rFoot²)` and `rFoot · Math.sqrt(count)` are the same
      number in algebra and not the same double — the flower's `a*(b+c)` vs `a*b + a*c`
      lesson, measured here before the guard was written: **8.88e-16 apart at the shipping
      defaults (0.90 ULP, 4.4223251132330947 against …39) and 1.78e-15 at petalCount 40**,
      exact at count 3, count 7, ALL THIN and sheet 2.40. So the guard is scoped to
      exactly that one expression — everything else is identical without one (`scale` is
      exactly 1, `x * 1 === x`, `radius_L` is `R0 * 1`), and a wider guard would be a
      second copy of the layered law with a bug-shaped place to hide. **`guardResidual`
      cannot be exactly 0 and both gates assert a BOUND (4 ULP relative), NOT a zero** —
      unlike `formGuardResidual`, and stated so nobody "fixes" it to an equality. The
      three components that ARE exact identity at one layer (scale, tiltExtra, phase) are
      asserted separately as equalities, so the tolerance cannot cover a real leak in them.

    - **`layerSize` CAPS AT 0.90, AND THE CAP IS MEASURED.** At 1.00 with `layerPhase` 0
      two whorls are exactly coincident and the export carries **14,832 non-manifold
      edges** — duplicate geometry, this family's known cause, the same defect that made
      the centre's flush base worth dropping. At 0.95 and 0.90 it is **0**. The cap makes
      exact coincidence unreachable rather than merely unlikely, and `LAYERS: 2 ×
      layerSize max × layerPhase 0` is a named gate row that says the cap works.

    - **MAX_LAYERS IS 3, AND THE BINDING CONSTRAINT IS THE PETAL, NOT TRIANGLES** — which
      was not the prediction. Three layers at petalCount 40 is 149,568 export triangles,
      **10% of the 1.5 M budget**, so a cap justified by triangle count would have been a
      made-up number. What binds is the blade shrinking by `layerSize` per layer: the
      third is an 18.1 mm blade at the shipping ratio, a fourth would be 13.0 mm, and at
      `layerSize` ≤ 0.50 the deepest foot hits FOOT_MIN_WIDTH_MM and becomes a floored
      stub narrower than its own root. Raising it is a range change plus gate rows.

    - **BYTE-IDENTICAL AT THE DEFAULTS: 0 of 47, 0 of 76, 0 of 86, 0 of 106 and 0 of 125
      frozen rows moved** — 440 rows across four baselines plus the new fifth. Both
      geometry gates 158/158. The default bloom is **11,136 tris live and export alike**,
      unchanged, and the five new controls add ZERO triangles at layerCount 1.
      **`phase5Matrix()` — the 125 rows frozen at deacded — is the new baseline and now
      the strongest of the five**, on the same reasoning that made phase4 strongest of
      three: it is the only one carrying the thickness layer's own corners and the tip
      cap's partition. It was GENERATED from deacded's own `buildMatrix()` rather than
      transcribed, and `--verify-frozen --phase5` proves it deep-equal, in CI.

    - **ONE ROW-SET CHANGE WAS DECLARED BEFORE THE RUN, AND THE RUN SHOWED IT WAS NOT A
      BYTE MOVE AT ALL — recorded because the prediction was wrong and the correction is
      the useful part.** `ALL MAX` sweeps every non-centre slider to its maximum, which
      now means three layers, so it was declared in advance that those four rows would
      move, to be reported by `--partition-value` on the resolved `layerCount`. What
      actually happens is cleaner: the FROZEN phase5 rows keep deacded's definition and
      pin no `layerCount`, so they inherit the default 1 and are **bit-identical**; only
      the LIVE matrix's row DEFINITION grew, which is added coverage with no `before` to
      compare against. So the honest total is 0 moved everywhere, and "ALL MAX now means
      three layers" is a coverage note, not a partition. The general lesson stands and is
      why the declaration was made anyway: a frozen matrix pins only what existed at its
      commit, so a corner row's MEANING can grow in the live matrix while its frozen twin
      stays fixed — the two are different rows sharing a label.
      The layer SUB-controls are excluded from that sweep and from the blanket min/max
      sweep, under the centre rig's rule one level up: a `layerSize` row at layerCount 1
      builds the default and measures nothing while printing a label saying it did.

    - **THE MATRIX GREW 125 → 158**, including twelve named layered corners: max layers
      against spread min, ALL THIN, petalCount 3 and 40, `layerSize` min, ALL FORM MAX,
      SPIRAL, the coincidence corner, the 135°-effective corner, ALL MIN, and — on the
      lesson that cost the flower a seven-piece bloom — **the layered BARE bloom**, since
      DISC is the default and a layered centre-off state is exercised by nothing unless it
      is written down.

    - **`MAX_VOXELS` RAISED 90M → 160M, because this change made it bind.** `ALL MAX ×
      DOME max` went from 403×403×239 (38.8 M, measured) to 605×605×360 (131.8 M,
      SKIPPED). A row that used to be measured and is now skipped is coverage lost to a
      change, and a skip is never a pass — so the ceiling moved rather than the row going
      quiet. Sized against the matrix, not picked: 131.8 M is the largest of all 158 rows
      and the next largest is 32.9 M. Cost, measured: 8.6 s and 397 MB RSS on that row
      against a 345 s whole-gate run.

    - **THE PANEL GATE GAINED A FOURTH ROUTE, and it closes a gap that predates this
      work.** The census evaluates every predicate at DEFAULTS only — ONE DIRECTION — so a
      control gated on `layerCount >= 2` would pass while never appearing at all, and so
      would `centerRise`, gated on DOME since the centre rig shipped and never once
      asserted to APPEAR. The visibility-transition route drives each driver (derived from
      the registry, never listed) through the real UI to every value that changes the
      dependent set and re-checks EVERY control's `hidden` against its own predicate at
      the new state. It covers the centre's four sub-controls for free. A fifth route
      asserts the low-count spiral flag in both directions. `--negative-control` now
      requires all four routes to fire and does.

    - **THE POSITIVE CONTROL, red then green.** The mutation is the height control this
      session ruled out — `height: 0` → `index * 3.0 mm`, in a throwaway worktree, never a
      switch that ships (the `PANEL_OVERLAP_ROWS` precedent). Mutated: 3 layers exports in
      **2 components**, petalCount 3 in **7 components**, with boundary edges **0
      throughout** — watertight and in pieces at the same time, which is exactly why
      connectedness is a separate gate — and `junctionAssertions()` fires 6 times. Shipped
      tree: one component, clean, on the same rows. **J1 fires at the first millimetre;
      the voxel gate only at 2.5 mm**, which is the blind band above, made concrete.

    - **PARKED, recorded with their reasons, deliberately not built and not stubbed:** a
      per-layer COUNT RATIO (quantises — `round(n·r^L)` makes the slider jump; makes "half
      a slot" ambiguous; reads almost exactly like `layerSize`); a CONTINUOUS CROSS-LAYER
      spiral sequence (`index = L·count + i`, the more phyllotactic reading — each layer
      runs its own sequence today); and a VOGEL RADIUS RAMP (`r ∝ √i`, a spiral *disc*
      rather than a spiral whorl, with its own evidence needs). **MIRRORED remains
      deferred to its own design conversation and nothing here anticipates it.**

    - **THE 135°-EFFECTIVE TILT SHIPS PHOTOGRAPHED, NOT CAPPED (Eva, Sep 1).** petalTilt
      75 × layerTilt 30 puts the third whorl past vertical, leaning back in over the
      centre — a state `petalTilt` (max 75) cannot reach alone. Ruled on Eva's own
      standing pattern for extremes (max-roll faceting, the spread-6 plate, the ROLL CLAMP
      look): ship it and photograph it. It is a named row in both gates, exports
      watertight and as one piece, and has its own cell on the extremes sheet. Capping
      `layerTilt` is one range change **with that cell as its evidence**; do not cap it on
      the strength of this note.

    - **PARKED, and deliberately not work: if the sections outgrow the
      accordion, the flower's VERTICAL TAB RAIL is the form Eva likes.** A
      note about direction, not a queued task. Do not start it on the strength
      of this note; it needs a panel that has actually outgrown five sections,
      and a fresh ruling with a picture.

    - **PETAL TILT SITS BESIDE SPINE CURL** (Eva), because `phi(u) = petalTilt + curl*u`
      and the panel is where that adjacency is visible. One row moved in the `CONTROLS`
      array and nothing else changed. The consequence was MEASURED rather than argued:
      the live matrix's row SET is identical (125 = 125) and 10 rows change position,
      which is inert because both runs of a byte report import the same matrix module
      and `--compare` hard-fails on any label-sequence mismatch.

    - **COLLAPSE IS PRESENTATION, ASSERTED RATHER THAN BELIEVED.** A control inside a
      closed `<details>` keeps its value, listeners and read-out span, answers
      `getElementById`, and takes a programmatic `.value` plus real input/change events —
      which is exactly how every gate and the harness set controls, and never by
      clicking. The whole-state snapshot is identical all-collapsed and all-expanded, and
      toggling every section moves no geometry. **Sections carry no predicate of their
      own:** `applyVisibility()` stays the only thing that hides a control and derives a
      section's hidden state from the same snapshot — hidden iff every control in it is
      hidden. A section needing its own condition is a stop-and-raise.

    - **THE NEW GATE HAS THREE ROUTES because they catch different failures** —
      `tools/verify-bloom-panel.mjs`, CI as `bloom-panel`. The DECLARATION route is a
      render census (every non-retired control exactly once, in its declared section, in
      registry order, one label and one read-out span, nothing in the panel the registry
      does not declare, each wrapper's `hidden` agreeing with its own predicate). The
      PATH route drives a control inside each collapsed section with real events and
      requires the app to react. **Triangle count is deliberately NOT the path route's
      witness:** the four form curves cost zero triangles by construction, so it would
      have made that section's assertion a passing no-op. Each collapsed section names
      its own witness instead — cup moves the metric ratio, the style moves the centre's
      triangle count, the sheet moves the ring radius through the area rule — and the
      witness table is checked against the registry so a later range change cannot leave
      it quietly measuring nothing. The ACCORDION route asserts the panel holds
      at most one open section: the declared one at first load, exactly the
      clicked one after a real summary click, and none after the open one is
      closed. A fourth assertion sits beside them and is the one the whole
      grouping rests on, made BEHAVIOURALLY rather than by scanning source for
      `.click(`: with EVERY section shut, the harness's own `applyConfig` sets
      one control from every section and both its read-back and the
      full-registry `fullStateDrift` must come back clean, with every section
      still shut. `--negative-control` deletes a control's wrapper, replaces
      another control with a listener-less clone (the flower's
      declarations-right / app-doesn't-react defect, reproduced), and
      suppresses the accordion's toggle before the panel's listener sees it —
      and requires ALL THREE routes to observe their own failure; it runs as
      its own CI step and caught 19 breaks on the run that shipped.

      **THE GATE EARNED ITS KEEP ON THIS VERY CHANGE**, which is worth
      recording because a gate that has never caught anything is a hope. The
      accordion made Petal shape collapsed for the first time and the rename
      moved a section id; the gate failed the run immediately with "section
      shape ships collapsed but names no geometry witness" and the same for
      "thickness" — two consequences of the rulings, caught before they could
      ship as a pair of silently vacuous assertions.

    - **MEASURED EFFECT: 2 control rows and a 431 px panel at first load; the
      WORST CASE a visitor can reach is 584 px, the tallest single section
      (Petal shape).** The flat panel this replaces was 18 rows and 1,241 px.
      Worst case is the honest number under an accordion — the tallest the
      panel can ever be is its tallest section — and it replaces the
      "all expanded" figure, which stopped being a reachable state.
      `tools/shot-bloom-panel.mjs` is the sheet: the panel, not the canvas, so
      it never sets `body.bl-preview` (which hides it); every section cell is
      opened by a REAL summary click so no frame shows a state the UI cannot
      reach; and every frame asserts it is not cropped, because a cropped
      panel is the one picture that could carry a grouping ruling with the
      bottom of the list missing.

    - **ROOM TO GROW, so the next session does not reorganise this one.** ARRANGEMENT is
      the home for the arrangement work and ships with two controls precisely so it has
      room: of the whorl primitive `(count, radius, height, sizeRamp, angleRamp, phase,
      blade)`, `petalCount` and `spread` are count and radius, and the other four are
      still derived — all of them land there, as do phyllotaxis and spiral placement. If
      multi-whorl arrives, the shape that fits is a layer-count control in that section
      with per-layer sub-controls gated on it by `visibleWhen` — the `centerStyle`
      pattern one level up — not a section per layer. A stem, leaves or a base ornament
      would be a NEW section, being new parts. **The junction never gets a section, for
      the same reason it never gets a role.**

- ~~A continuous cross-layer spiral sequence, and a Vogel radius ramp — parked~~
  **THE CONTINUOUS SPIRAL WAS BUILT Sep 1; VOGEL WAS NOT, and the two were never the
  same proposal.** Eva's brief, verbatim: *"spiral is still very distinct layers, and I
  don't know if it should be."* Her screenshot — 40 petals × 3 layers × spiral,
  tilt-stepped — reads as three stacked rings wearing spiral azimuths, and what she was
  reaching for is the sunflower / succulent construction: no rings, one sequence winding
  inward, every petal at its own radius, size and tilt.

    - **THE WHOLE LAW IS THAT THE LAYER INDEX STOPS BEING AN INTEGER.** Every per-layer
      quantity in `footRing()` already IS a function of a layer index, so continuous mode
      evaluates the same functions at a non-integer one:

          RINGED      lambda_k = floor(k / petalCount)
          CONTINUOUS  lambda_k = k / petalCount            k = 0 .. petalCount*layerCount - 1

      **NOTHING REINTERPRETS AND NO LABEL LIES**, which was the constraint the design had
      to satisfy before it was worth building. `petalCount` is petals per turn in both
      modes (a ring IS a turn under the ringed arm), `layerCount` is how many turns,
      `layerSize` is the shrink per turn, `layerTilt` the tilt gain per turn. So
      continuous mode ships **no sub-controls of its own** — there is nothing left for
      them to control — and that is the panel story, not an economy.

    - **A THIRD VALUE, NOT A REPLACEMENT (Eva's ruling, Sep 1), and the deciding
      measurement is that SPIRAL IS NOT A SUBSET OF CONTINUOUS AT ANY DEPTH.** At one
      layer SPIRAL is n petals on ONE ring with uneven angular gaps — the state the
      low-count legibility flag exists for — while CONTINUOUS winds 0.875 of a turn
      inward on n rings. Replacing SPIRAL would have deleted a reachable, flagged,
      11-gate-row state rather than upgrading one. The cost comparison was made with
      numbers on the table: a third value lands as **ONE byte event** (nothing selects it,
      so every pre-existing export is bit-identical), replacement as **two**, moving
      exactly the 11 of 158 live rows that pin SPIRAL with all 440 older frozen rows
      holding. And the calculus is asymmetric in TIME: retiring the SPIRAL *option value*
      is free while nothing persists a design and becomes a schema bump plus a migration
      the moment something does — so the ruling that stays available is the cheap one.
      Eva can still kill the layered spiral from the sheet; she cannot un-kill it.

    - **THE DEPTH IS EXTRAPOLATION, NOT INTERPOLATION (Eva, Sep 1, ruled from the
      numbers), and it has a visible consequence recorded rather than discovered later.**
      lambda runs to `layerCount - 1/petalCount`, so a continuous bloom winds a full
      `layerCount` TURNS and reaches deeper than the innermost of `layerCount` stacked
      rings, which are only `layerCount-1` turns apart. At her config the innermost blade
      is **13.17 mm against the ringed 18.14 mm** and R0 is **7.5% smaller**. The
      alternative — `lambda = k(L-1)/(K-1)`, matching ringed's extremes exactly and merely
      dissolving between them — was costed and rejected because it breaks the label story:
      `petalCount` would stop being petals-per-turn (59.5 per turn at that config) and
      CONTINUOUS would collapse onto SPIRAL at layerCount 1. **Recorded, not stubbed.**

    - **THE DISSOLUTION IS A NUMBER, and it is the acceptance evidence.** At Eva's config
      the ringed radius is a STEP FUNCTION over the build order: **117 of the 119 steps
      between consecutive petals are exactly 0.0000 mm and 2 are 6.4209 mm — 28.0% of the
      hub radius in one jump.** Continuous: **every one of the 119 steps is between 0.0658
      and 0.1735 mm**, 0.82% of R0 and about **one percent of a petal width**. Same 120
      petals, same **149,568 export triangles**, same 7,303.2 KiB — the comparison is not
      bought with geometry.

    - **`footRing()` RETURNS `rings`, AND THE TWO ARMS ARE A BRANCH RATHER THAN A
      REFORMULATION** — the precedent `buildWhorlInto`'s RADIAL arm set, applied one level
      up. One descriptor per layer under the ringed arm, one per PETAL under the
      continuous one. The ringed loop is untouched character for character, because
      `SUM_L count*rFoot_L^2` and `SUM_k rFoot_k^2` are the same number in algebra and
      **not the same double** — the `a*(b+c)` vs `a*b + a*c` trap that already fired on a
      real row when layers were written. Rewriting the ringed sum "because it is the same
      rule" would have moved every layered export for nothing. **What the area rule sums
      is unchanged in DEFINITION**; only the grouping of equal terms differs.

    - **CONTAINMENT AND THE OVERLAP BOX BOTH SURVIVE BY CONSTRUCTION, AND CONTAINMENT
      GETS STRONGER.** `layerSize` maxes at 0.90 < 1 and lambda >= 0, so
      `layerSize^lambda <= 1` for every REAL lambda rather than only for integers —
      radius_k <= R0 at every slot, strictly decreasing, with `Math.pow(s, 0)` exactly 1
      keeping `rings[0].radius === hub.radius` an EQUALITY. The overlap box does not
      degrade for exactly the reason it did not degrade under layers: none of `overhang`
      (1.5 mm absolute floor), `width` (`FOOT_MIN_WIDTH_MM`) or `thickness`
      (`MIN_FEATURE_MM` in export) is a function of the slot index. **Measured at the
      deepest reachable foot — 3 turns × ALL THIN × spread min × petalCount 40 ×
      layerSize min, where the innermost ring radius is 0.206 mm — the box is
      1.500 × 1.600 × 1.000 = 2.400 mm³, the SAME number as the single-ring and layered
      corners.**

    - **THE VOXEL GATE IS BLINDER HERE THAN IT WAS UNDER LAYERS — measured, and worse
      than that, SO ARE J1–J4.** Consecutive foot annuli overlap by **3.154 mm** at Eva's
      config (a 0.1735 mm radius step against an 8.486 mm overhang) against 1.981 mm at
      three layers; a wrong hub leaves **57 of 120 slots** joined to nothing and the flood
      fill still reports one region, chained through the 119 feet in between.
      **AND THE MUTATION THIS SESSION IS ACTUALLY ABOUT PASSED EVERYTHING THAT EXISTED.**
      The quantizer mutation — continuous mode silently building rings — exports
      watertight, exports as ONE piece, has the IDENTICAL triangle count, and **passes
      J1, J2, J3 and J4 on every row.** It even passes the multiples-of-*n* identity,
      because `floor(m*n/n)` is `m`. The instrument as it stood could not observe the
      thing the session was for, and that hole was found by checking the positive control
      against the assertions BEFORE writing them rather than after.

    - **SO THE LAYER SHIPPED TWO NEW ASSERTIONS, each catching what the other misses.**
      **J5 — THERE ARE NO LAYERS:** under CONTINUOUS, radius and scale are strictly
      decreasing across the whole sequence (no two consecutive slots share a ring) and
      tiltExtra is non-decreasing, strictly increasing whenever it ends above 0. A
      property of the arrangement, never a second copy of its law. **J6 — THE QUANTIZER
      IDENTITY:** the continuous sequence passes EXACTLY through every ringed layer — at
      `k = m*petalCount`, scale and tiltExtra equal ringed layer *m*'s to the bit.
      Computed in `footRing()` on the `guardResidual` precedent (a gate restating
      `Math.pow(layerSize, m)` would be a second copy of the ringed law inside the
      instrument built to police it) and asserted as an **EQUALITY, not a bound**, because
      `(m*n)/n` is exactly `m` in IEEE-754. A wrong-exponent law passes J5 and fires J6.
      **The single-layer GUARD is now scoped to the ringed arm** — the pre-layer
      expression describes no continuous design, since even a one-turn sequence has
      `petalCount` different feet — and reports `null` there, never a passing 0.

    - **J1 GAINED 40× THE COVERAGE FROM THE SAME EXPRESSION.** `petals` is one entry per
      RING in both modes, and under CONTINUOUS a ring carries exactly one petal — so the
      foot assertion goes from 3 frames per layer to 3 × petalCount × layerCount of them
      (360 at Eva's config). Under the ringed arm slot 0 is representative because the
      whorl shares a ring; under the continuous arm every foot is checked because every
      foot is its own.

    - **WHERE THE FLOORS BIND, AND WHAT BREAKS THERE IS TASTE, NOT TOPOLOGY.** The
      foot-width floor now binds from a CROSSING INDEX onward rather than per layer, so
      "which slots" became a real question and the read-out answers it with two numbers
      (`FOOT WIDTH FLOORED at 1.60 mm on rings 53–119 (67 of 120)`) instead of a bare
      "(CLAMPED)". **At the shipping defaults and at Eva's own config nothing is floored
      at all** — the deepest foot is 2.409 mm. The extreme is `layerSize` min at three
      turns: the deepest reachable scale is `0.35^2.975 = 0.0440`, **a 1.54 mm blade on a
      1.60 mm floored foot — a blade narrower than its own root**, which is the same
      condition that caps `MAX_LAYERS` at three. It stays watertight and one connected
      piece. It is a tab, not a petal; photographed rather than capped, on the standing
      pattern for extremes.

    - **A NEW EXTREME THAT IS GENUINELY NEW: 161.25° EFFECTIVE TILT.** Continuous
      accumulates the tilt gain over 2.975 turns rather than 2 layer steps, so
      `petalTilt` 75 × `layerTilt` 30 reaches **86.25° of gain against the layered arm's
      60** — past the 135° state the charter photographed, and unreachable by any
      combination of the layered controls. Same standing pattern: ship it, photograph it,
      name it in both gates. Capping `layerTilt` is one range change **with that cell as
      its evidence**; do not cap it on the strength of this note.

    - **`layerPhase` IS THE ONE CONTROL THE NEW MODE LEAVES WITHOUT A JOB, AND IT HIDES
      RATHER THAN BEING REINTERPRETED.** It offsets successive whorls by a fraction of a
      slot; a continuous bloom has one whorl, so `rings[k].phase` is exactly 0 at every
      slot. Giving it a second meaning there — a global start azimuth, say — would be an
      invisible rigid rotation under a label naming something else. Its `visibleWhen`
      gains the term; nothing imperative. **PARKED, and deliberately not built on this
      id: a DIVERGENCE ANGLE control** (golden angle against 1/3, 2/5, or free) is the
      genuinely interesting phyllotaxis parameter this mode opens up, and `layerPhase` is
      the worst available id to put it on — a saved slot fraction would feed straight
      into an angle. It gets its own id and its own ruling.

    - **"DEPTH", "SHRINK", "TILT STEP", AND "SPIRAL, LAYERED" (Eva, Sep 1).** A label
      naming one of the two units lies in the other mode, so the LABEL names the axis and
      the READ-OUT names the unit — the same split `placement` has carried since it
      shipped. `layerPhase` KEEPS the word "layer" precisely because it only exists in the
      mode where layers do. **No id moved**: an id is the expensive half of a rename (see
      `RETIRED_IDS`), nothing persists a design yet, and `layerCount` is what the quantity
      IS under both readings. One owner for the unit word — a `perDepth(ui)` helper — so
      three read-outs cannot drift into three wordings.

    - **A LATENT TRAP WAS CLOSED ON THE WAY PAST, and it is the more useful half of this
      entry.** `LAYER_SUBS` matched `c.visibleWhen.id === 'layerCount'` — a SHAPE SNIFF,
      correct only while every layer sub-control's predicate happened to be a bare leaf.
      Giving `layerPhase` its second condition turned its predicate into an `all` node
      with no `.id` at all, so the sniff would have silently stopped matching it, dropping
      it OUT of the excluded set and INTO the blanket sweep — where a `layerPhase` row at
      layerCount 1 builds the shipping default and reports a pass under a label naming a
      control that did nothing. Exactly the defect the exclusion exists to prevent,
      reintroduced by a registry edit two files away. It now derives from
      `predicateDrivers`, which is the registry's own answer and cannot drift.

    - **THE MATRIX GREW 158 → 180**, and `phase6Matrix()` — the 158 rows frozen at
      c1886d0 — is the new baseline and now the strongest of the six, on the reasoning
      that promoted phase5 and phase4 before it: it is the only one carrying the LAYER
      corners and the SPIRAL count sweep, which is the region a placement change is most
      likely to disturb. `--full` could not do the job at all here, since all 22 new rows
      select an option value the old registry does not have.

    - **THE POSITIVE CONTROL, RED THEN GREEN, in throwaway worktrees** (`git worktree add`,
      never mutate-and-restore). Three mutations, the shipped instrument run against each,
      with what the STL gates saw recorded beside what the assertions saw:

      | mutation | fired | boundary edges | export tris | seen by |
      |---|---|---|---|---|
      | shipped tree | **0 of 7 rows** | 0 | unchanged | — (green) |
      | M1 quantizer (`lambda = floor(k/n)`) | 8 across 5 rows | **0** | **identical** | **J5 only** |
      | M2 wrong exponent (`k/(K-1) · L`) | 23 across 5 rows | **0** | **identical** | **J6 only** |
      | M3 floor once per sequence | 67 on the one row where it binds | **0** | **identical** | **J4b only** |

      Every mutation leaves both ringed control rows clean, so all three are scoped to the
      continuous arm. **M1 was then run through the connectedness gate with J5 silenced, to
      measure what the flood fill actually says: 22 of 22 continuous rows report ONE
      CONNECTED PIECE.** (That run self-reports HARNESS INVALID, because scoping its matrix
      to continuous rows removes the rows its own pairwise and response assertions need —
      so it is a measurement of the voxel verdict, never a gate pass. A failing validity
      assertion is not a known-red.)

    - **M2 EXPOSED A BLIND SPOT IN J6 ITSELF, AT THE SHIPPING DEPTH, and closing it is the
      most useful thing the control did.** In its first run M2 fired on every three-turn
      row and NOT on the one-turn row: `quantizerResiduals` carried entries only for
      `m < layerCount`, so at layerCount 1 the single entry was `m = 0`, where every law
      agrees trivially — the sequence stops at `k = n-1`, before its first multiple. The
      law is defined for every k, so the check now also evaluates it ONE TURN PAST THE END
      ("one more turn would land exactly on the next ringed layer"), and the law became a
      closure both the ring loop and the cross-validation call so the two cannot drift into
      two copies. M2 then fired on 5 of 7 rows instead of 4. **The gate that has never
      caught anything is a hope; this one caught a hole in itself before shipping.**

    - **AN UNEXPLAINED INSTRUMENT ANOMALY — OPEN, and it cannot be closed by repetition.**
      M3 reported 67 failures on its first batch run, **0 on the second batch run**, and 67
      on three subsequent runs (two isolated, one batch). The mutation was present in the
      worktree throughout, verified after the fact. No cause was found — Chromium's HTTP
      cache was ruled out (a fresh browser and ephemeral context per process, a random port
      per run) and so was a write race (the mutation was applied minutes before that loop
      iteration). It is recorded because "run the same tree twice" cuts both ways: a
      control that reports NOT FIRED once in five runs would, on a single run, have read as
      a passing instrument.

      **THIS IS THE FLOWER'S #88 SHAPE AND IT INHERITS #88'S RULE: ACCUMULATING CLEAN RUNS
      CANNOT RETIRE IT.** Four agreeing runs are exactly what #88 had, and they are evidence
      about the runs that agreed, not about the one that did not. Any number of further
      green runs leaves this exactly where it is. **What would settle it is a DIFF OF A
      DISAGREEING PAIR** — capture the app's own `rings` array (or the whole
      `__bloomMetrics()` snapshot) on every run of the same seed and tree, keep them, and
      when a pair disagrees compare them field by field to find whether the divergence is
      in the geometry, in the metrics hook, or in the harness's read of it. Until such a
      pair is captured and diffed, treat this as an open question about the INSTRUMENT, not
      as a settled flake and not as a defect in the law: the shipped tree is green on every
      run, and M1 and M2 have never once failed to fire.

      **IT NOW HAS A NAMED SUSPECT (the zygomorphy session, Sep 1), AND THE SETTLING
      STANDARD IS UNCHANGED.** `applyConfig()` did not wait for the rAF-coalesced rebuild
      — see the zygomorphy entry below for the finding and the fix — so any assertion
      reading `__bloomMetrics()` could be reading the PREVIOUS build. **A stale-build read
      produces exactly M3's symptom: NOT FIRED.** M3 mutates the foot-width floor, which
      binds on one row; a read that arrives before the rebuild sees the prior row's or the
      default page's metrics, where the floor does not bind, and the mutation reads as
      absent. That matches every feature of the anomaly — a mutation present in the
      worktree throughout, firing on four runs of five, with no HTTP cache and no write
      race to blame, and 67-versus-0 rather than a partial count (one stale read at the
      wrong moment costs the whole row's assertions at once).

      **THIS IS A SUSPECT, NOT A DIAGNOSIS, and it does not retire the anomaly.** The
      settling standard stated above stands exactly as written: a DIFF OF A DISAGREEING
      PAIR. Nothing here was reproduced, M3's run happened on a tree that has since
      changed, and "a mechanism that could produce the symptom" is not "the mechanism that
      did" — which is the same distinction #88 turns on. What changes is only the ORDER OF
      INVESTIGATION: **any future M3-style flake is checked against build-counter
      telemetry FIRST** (`__bloomBuildState()` — was the build that the assertion read the
      build the row asked for?), because that is now cheap, and it separates "the
      instrument read the wrong model" from "the model differed" before anyone reaches for
      a harder explanation. If the counter is clean on a disagreeing pair, this suspect is
      eliminated and the anomaly is exactly where it was.

    - **EVA'S RULING FROM THE SHEETS (Sep 1): THE CONTINUOUS SPIRAL IS WHAT SHE WAS
      REACHING FOR. MERGED.** This closes the brief the session was opened on —
      *"spiral is still very distinct layers, and I don't know if it should be"* — and it
      closes it with a measurement rather than with an impression, which is why the
      headline pair was built the way it was: the same 40 petals × 3 deep at spread 1.55,
      the same 120 petals and the same 149,568 export triangles on both sides, so the only
      thing that could differ was the arrangement. **The evidence is that the radius stops
      being a step function: 117 of 119 steps at exactly 0.0000 mm and two at 6.4209 mm
      (28.0% of the hub radius in one jump) become 119 steps between 0.0658 and 0.1735 mm,
      about one percent of a petal width.** The second half of her brief — "I don't know if
      it should be" — was answered separately and deliberately NOT by this ruling: the
      layered spiral survives as its own placement value, so ruling it out later remains a
      fresh ruling needing fresh evidence rather than something this merge decided for her.

    - **THE 161.25° EFFECTIVE TILT SHIPS AS PHOTOGRAPHED (Eva, Sep 1).** Ruled from the
      extremes sheet on the same standing pattern as the 135° cell it supersedes in reach,
      the max-roll faceting, the ROLL CLAMP look and the spread-6 plate: ship it,
      photograph it, name it in both gates. **Capping `layerTilt` remains one range change
      with that cell as its evidence** — available if it ever offends, and not to be
      started on the strength of the number alone. Reopening it is a fresh ruling needing a
      fresh picture, exactly as the max-combinator kink and the tip cap are.

- ~~Per-slot petal overrides — the only route to zygomorphy, and one of the two
  capabilities the flower-project skill says nothing else unlocks~~ **OPENED Sep 1, AND
  DELIBERATELY SPLIT IN TWO. SESSION A BUILT: the override architecture plus PER-LAYER
  roles — the iris. Session B is the mirror plane, slot roles, and the orchid.** Eva's
  ruling was full per-slot differentiation, not placement mirroring and not
  modulation-only; this is the first half of that, and the seam is recorded below rather
  than left to be re-derived.

    - **A ROLE IS A GROUP OF SLOTS THAT SHARE ONE OVERRIDE RECORD — not a slot, and not a
      layer. THAT THE GROUP IS THE UNIT IS THE WHOLE DESIGN, AND IT IS LOAD-BEARING
      RATHER THAN STYLISTIC.** Measured before anything was written: the ringed area rule
      accumulates `petalCount * rFoot²` once per whorl, and the obvious reading of
      "per-slot overrides" — regrouping it per FOOT — is the same number in algebra and
      **not the same double**. `n = 8` agrees exactly; **`n = 40` differs by 8.53e-14,
      6.00 ULP**; petalWidth 30 × sheet 2.40 by 2.00 ULP; n = 13 by 1.00. So per-slot
      grouping would have moved **every 40-petal export** for nothing. That is the
      flower's `a*(b+c)` vs `a*b + a*c` trap, **now fired twice in this project family**
      (it fired on a real row when layers were written, and it would have fired here).
      Grouping by ROLE keeps the loop shape: `roleCount` is `state.petalCount` at one role
      per whorl, the same double the pre-role expression multiplied by, so the sum is
      bit-identical by construction. **Do not regroup it.**

    - **SO `zygoGuardResidual` IS AN EQUALITY, NOT A BOUND** — unlike `guardResidual`
      beside it, and stated here so nobody later loosens it. `footRing()` carries the
      pre-role expression verbatim alongside the role-grouped one and compares the two on
      every build where the claim is available; it measures **exactly 0** on every row,
      the continuous arm included (where `roleCount` is 1 and `1 * x * x` is `x * x`
      exactly). It reports **null** once a whorl carries more than one role — which is
      session B — because there is then no pre-role grouping to compare against, and a
      claim nothing can make must read as absent, never as a passing 0.

    - **THE GUARD IS OBJECT IDENTITY, which is the cheapest one available and the
      strongest.** `resolveRoleOverrides()` SKIPS a zero delta outright, so an OUTER ring
      — or an INNER ring with every delta at 0 — carries no record at all, and
      `petalStateFor(state, ring)` then returns **the caller's own `state` object**. Every
      consumer (`widthProfile`, `petalForm`, `thicknessProfile` and the three inline reads
      in `buildPetalInto`) therefore takes the pre-zygomorphy call on the pre-zygomorphy
      object. There is no expression to have got subtly wrong and no `-0 + 0` case
      analysis to rest on — the downgrade the form layer deliberately made is not needed
      here. Z2(ii) asserts in BOTH directions that a record exists exactly when a delta is
      non-zero, so the guard cannot quietly stop being one.

    - **SESSION A'S ROLE DERIVATION IS DELIBERATELY COARSE: OUTER (the outermost whorl)
      and INNER (every whorl above it).** At layerCount 2 that is exactly the iris. At 3
      the second and third whorls are identical to each other, which is visible on the
      sheet and is the evidence — the only evidence — that would refine INNER into
      INNER/INNERMOST. That refinement is a **design ruling with its own partition
      report**, not a rewrite: it changes the derivation and nothing else.

    - **WHAT IS DELIBERATELY NOT OVERRIDABLE, each argued rather than listed.**
      `sheetThickness` — **never**: J4a asserts `hub.thickness === ring.thickness`, and
      one hub has one thickness, so a per-role sheet turns the overlap box's vertical
      extent from *equal by construction* into a genuine `min(footT, hubT)`. That is a
      structural guarantee traded for a control nobody asked for. `footDelicacy` —
      **never**: it scales foot width and so does a per-role width override; two owners of
      one quantity. `petalCount` — **never**: it is the whorl's count and the set the
      partition is defined OVER. `petalWidth` is overridable but must be applied ONCE, in
      `footRing()`, and read back by the builder. **`layerSize` and `layerTilt` are
      absent from the role overrides on Eva's Q5 ruling**: they are λ-ramps that already
      own per-layer size and tilt, and they are the only depth controls that survive
      CONTINUOUS. Two prefixes, two laws — `layer*` is a ramp, `inner*` is a role
      override.

    - **THE OVERRIDE SET SHIPS TRIMMED, AND THE ASYMMETRY DECIDED IT (Eva, Sep 1).**
      Three deltas: `innerCurl`, `innerCup`, `innerTipBreadth`, all Standard,
      `role: 'petal'`, all in ARRANGEMENT, all default 0. Adding a control later is one
      registry row plus one row in `ROLE_OVERRIDES`, forever; retiring one becomes a
      schema bump plus a migration the day anything persists a design. So: minimal, and
      grow on evidence from real use. **RECORDED, NOT BUILT:** `innerRoll`, `innerTwist`,
      per-layer taper deltas, a per-layer `tipThinning` delta. All mechanically identical;
      none needed by the iris.

    - **THEY LIVE IN ARRANGEMENT, WHICH IS THE CHARTER'S OWN PREDICTION** — "a layer-count
      control in that section with per-layer sub-controls gated on it by `visibleWhen`,
      the `centerStyle` pattern one level up, not a section per layer". It also keeps the
      panel gate honest: ARRANGEMENT ships OPEN, so the path route needs no WITNESS for a
      section whose every control is hidden at the shipping default — **a witness that has
      to set up its own precondition before it can move anything is a witness that can
      quietly measure nothing.** When session B's slot roles arrive, a "Whorl differences"
      SECTION is the right home for the pair, and it will need that precondition
      mechanism. Recorded so it is designed rather than discovered.

    - **THE GATING IS A RULING WITH A MEASUREMENT BEHIND IT, AND IT IS NOT THE
      SHIP-THE-EXTREMES PATTERN (Eva, Sep 1 — the distinction is the entry).** Eva's
      standing pattern covers honest extremes of honest controls: the max-roll faceting,
      the ROLL CLAMP look, the spread-6 plate, the 135° and 161.25° tilts. A bilateral
      control under SPIRAL is a different category. Reflecting a golden-angle arrangement
      about any plane leaves the best mirror pairing off by **32.461° at n=5, 20.062° at
      n=8 (45% of a slot gap), 12.399° at n=13 and 4.736° at n=40**, against **0.000° at
      every count under RADIAL**. A "mirror" control there would be a symmetry label
      sitting on a measured asymmetry — a label lying about a computation, which is this
      project's oldest enemy and the one thing it never ships. So: **slot roles (session
      B) are RADIAL-only; layer roles are hidden under CONTINUOUS**, where there are no
      layers to differentiate and J5 asserts exactly that. Both are `visibleWhen`
      predicates, nothing imperative. **Two named rows assert the CONTINUOUS state is
      hidden AND bit-identical with all three deltas at MAXIMUM** — a gated state is
      coverage, and a gated state nobody exercises is a claim nobody checked.

    - **BOTH SHIPPED GATES ARE STRUCTURALLY BLIND TO THIS LAYER, AND THIS TIME THAT WAS
      MEASURED BEFORE THE ASSERTIONS WERE WRITTEN rather than derived and hoped for** —
      which is what found the hole in the first draft. The derivation: topology is fixed
      (no edge census can move), the foot is never written by anything a role may override
      (the three foot rows come from `footRing()`'s own quantities before any curve
      exists, and every profile is evaluated at `u`, where the foot rows carry u = 0), and
      the hub disc spans every ring (no flood fill can split). Then the measurement, on
      three throwaway worktrees:

      | mutation | boundary | degenerate | tris live/export | STL bytes | fired |
      |---|---|---|---|---|---|
      | shipped tree | 0 | 0 | identical | — | **0 of 7 rows** |
      | M1 wrong role (override lands on layer 0) | **0** | 0 | **identical** | **same length** | Z1 on 6 rows (+ Z2(v)) |
      | M2 record never reaches the blade | **0** | 0 | **identical** | **same length** | **Z2(iii) ONLY**, 4 rows |
      | M3 area rule regrouped per foot | **0** | 0 | **identical** | **same length** | **Z3 ONLY**, 5 rows |

      **M2 IS THE ONE THAT MATTERS.** Every existing instrument passes it on every row:
      J1–J6 clean, `formAssertions` clean, `thicknessAssertions` clean, `guardResidual` and
      `zygoGuardResidual` both clean, ring radii identical to the bit, read-out identical.
      The ring even reports a perfectly correct override record. **Only comparing that
      record against what the BUILDER said it used can see it** — which is why
      `petalRingApplied` reports the effective state the builder actually read, and never
      the resolver's answer.

      **M3 IS WHY Z3 IS AN EQUALITY.** It measures 8.88e-16 at two layers, 3.55e-15 at
      three and 5.33e-15 at petalCount 40 — **0.9 ULP on an 11.6 mm radius** — so the
      4-ULP tolerance `guardResidual` legitimately needs would have passed it in silence.
      It also reports **exactly 0 on the shipping default**, so a control that only looked
      at the default row would have called the mutation clean.

      **M1 WAS PARTIALLY CAUGHT BY AN EXISTING INSTRUMENT, and the shape of that is worth
      more than the catch.** `formAssertions` and `thicknessAssertions` read RING 0's
      petal while evaluating their predicates against the ROW's (base) state — so under M1
      they fire on rows whose base state is flat, and see **nothing at all** on the iris
      row itself, where the base curl is already −90. That soundness rests on ring 0
      carrying no override, which is a property of session A's derivation and **not of the
      architecture**. **Z2(v) asserts it**, so session B fails loudly at the boundary
      instead of quietly measuring a petal built from a state it is not checking against.

    - **THE POSITIVE CONTROL FOUND TWO BUGS IN THE ASSERTIONS, WHICH IS THE POINT OF
      RUNNING IT FIRST.** Z1's first draft compared the role groups against
      `m.sequenceLength` — which is `petalCount` under the RINGED arm and
      `petalCount * layerCount` under the continuous one, so it is not the bloom's petal
      count in both modes at all — and **the shipped tree failed on 5 of 7 rows**. It now
      compares against `petalsBuilt`, a tally counted at the whorl loops themselves, so
      the partition is checked against what was BUILT rather than against another number
      the same owner produced. (The second was in the probe, not the tree:
      `formAssertions` derives flatness from `row.set`, and a probe passing no set makes
      it fire spuriously — worth knowing before reading any future run of it.)

    - **BYTE-IDENTICAL AT THE DEFAULTS**, and the default bloom is **11,136 tris live and
      export alike at 543.8 KiB**, unchanged. The three deltas add ZERO triangles at every
      setting — topology is fixed, so an override moves vertices and nothing else, the
      pointed/truncate tip partition included. **`--full` cannot compare across the two
      trees here**: 19 of the new rows set controls the old registry does not have, so the
      frozen matrices are the like-for-like comparison, exactly as they were for the
      continuous spiral.

    - **THE MATRIX GREW 180 → 205** — six rows from the registry-derived layer-sub sweep
      (which picked the three deltas up automatically, through `predicateDrivers` rather
      than a shape sniff, exactly as the latent trap closed in #124 intended), plus
      eighteen named corners and one capability row. The corners are the region this
      change affects: the IRIS by name, the zygomorphic BARE bloom, ALL INNER MAX against
      ALL THIN / spread min / petalCount 3 and 40 / ALL FORM MAX, all three clamp corners,
      the tip partition both ways in one bloom, the SPIRAL row, the two GATED CONTINUOUS
      rows, and the foot's upper clamp.

    - **A PRE-EXISTING DEFECT FOUND BY DISCOVERY: THE FOOT'S UPPER CLAMP HAS BEEN SILENT
      SINCE SESSION 5 (Eva's ruling, Sep 1 — option b, telemetry only).**
      `clamp(authoredWidth, FOOT_MIN_WIDTH_MM, 10)` has always had an upper bound and
      `widthClamped` reported only the lower one. So from `petalWidth` 25 upward — **six
      of that slider's 23 reachable values, 26% of its range** — the blade keeps widening
      and the area-ruled ring does not move at all: **10.8324 mm at 24, 11.0558 mm at 25,
      still 11.0558 mm at 30**. The bare `10` is now `FOOT_MAX_WIDTH_MM`, `widthClampedHigh`
      sits beside `widthClamped`, and the read-out gained a ceiling twin of its floor line
      through one owner for the phrasing. **No geometry moves** — the constant is the same
      double the literal was. This is the "(CLAMPED)" discipline the roll floor, the tip
      floor and the foot floor already carry, arriving where it was always missing. It
      predates the zygomorphy work by four sessions; a per-role size multiplier is simply
      the fastest route to it, which is why it surfaced here rather than in a bug report.

    - **THE SEAM, so session B starts from a stated boundary rather than re-deriving one.**
      Session A built the override PLUMBING on the descriptor that already exists: the
      role-grouped area rule (`roleCount` on every descriptor), `ROLE_OVERRIDES` as the one
      table of what may be overridden and by what law, `resolveRoleOverrides()` and the
      object-identity guard, the per-ring `role` / `overrides` telemetry, the builder's own
      `applied` record, and Z1–Z3. **Session B changes exactly two things: the role
      DERIVATION (from a mirror plane, giving LABELLUM / HOOD / LATERAL) and WHICH
      DESCRIPTORS EXIST (one per (layer × role) instead of one per layer).** The override
      mechanism is not rewritten — it is multiplied. Concretely, session B must:
      `footRing()` returns per-(layer, role) descriptors with `roleCount` the role's own
      group size (the sum stays grouped — **never** regroup it per foot);
      `buildBloomInto` looks a descriptor up by slot index and computes nothing;
      `zygoGuardResidual` goes null on those rows and Z3's `multiRole` branch covers it;
      **Z2(v) fires the moment a record lands on ring 0**, so `formAssertions` and
      `thicknessAssertions` must take the effective state before a slot role may reach it;
      and the mirror-plane control is RADIAL-only on the measurement above. `slotsPerRing`
      becomes per-descriptor and J1's accounting check generalises with it.

    - **RECORDED, REJECTED, so it is not re-proposed: a role SELECTOR** ("editing:
      Labellum / Hood") driving one shared override block. The registry cannot express it
      — one control id is one value, so the per-role values would have to live outside the
      registry. It is the second-source-of-truth defect wearing a UI convenience.

    - **A SECOND PRE-EXISTING DEFECT, IN THE HARNESS ITSELF, AND IT IS THE MORE SERIOUS OF
      THE TWO: `applyConfig()` DID NOT WAIT FOR THE MODEL TO BE BUILT.** `regenerate()` is
      rAF-coalesced through `scheduleRegen()`, so when `applyConfig()` returned — every
      value set, every real event fired, every read-back clean — the model had not
      necessarily been rebuilt. Every assertion that then read `__bloomMetrics()` could be
      reading the PREVIOUS build, which on a fresh page is the DEFAULT bloom. **This is
      the flower's "73 of 185 configs measuring the wrong design" defect with a timer in
      place of a read-back**, and it has been present since the first gate.

      **HOW IT SURFACED, and it is the ugly way rather than the clean one.** The export
      gate's first full run on this branch failed ONE validity assertion —
      `ALL MIN × RING min: form row reports NO form telemetry — the guard short-circuited
      a row that sets a curve` — on a row this session does not touch. That run was
      competing for four CPUs with the byte baseline. The row then passed 3 of 3 in
      isolation, which is precisely the shape that gets written off as a flake.

      **WHAT IS MEASURED AND WHAT IS NOT, stated separately because they differ.** The
      MECHANISM is certain and is a fact about the code, not a statistic: `applyConfig`
      queued a rebuild and returned without waiting for it. The RATE is not: immediate
      reads raced 0 of 40 on an idle machine on BOTH the pre-change and post-change trees;
      a symptom probe under artificial load saw 1 null in 40 on this tree and 0 in 40 on
      `e77bf67`, which is one event and decides nothing; and a direct counter probe under
      load saw 0 of 60. **So this is NOT claimed as a regression and NOT claimed as
      reproducible** — it is claimed as a window whose width no gate should depend on
      (headless Chromium throttles rAF under load), and it was closed on the mechanism
      rather than on the statistic. Accumulating clean runs could not have retired it, on
      #88's rule.

      **THE FIX IS THE REAL SIGNAL, FOLDED INTO `applyConfig` SO NOBODY HAS TO REMEMBER
      IT.** The app exposes `__bloomBuildState() -> { count, pending }`; `settleBuild()`
      waits for `pending === false` and `applyConfig` calls it. `pending` is now cleared
      AFTER the build and in a `finally` — after it, so `false` unambiguously means no
      build is outstanding rather than "the callback started"; in a `finally`, so a
      throwing build cannot leave the flag stuck and silently stop the app rebuilding,
      which is what clearing it first had been defending against. A tree without the hook
      (the byte diff's `--root` before-tree) returns true and the caller proceeds exactly
      as before, rather than a wait quietly claiming to have happened.

      **THE BYTE BASELINE IS UNAFFECTED and that is a property of the export path, not
      luck:** the STL comes from the export handler, which calls `readUI()` and builds
      fresh in export mode, so exported bytes never depend on the coalesced LIVE rebuild.
      The `--region foot` slab likewise reads `sheetThickness` from `__bloomUIState()`,
      not from a build. Half the before-tree baseline ran on the pre-fix harness and half
      on the post-fix one; that is recorded rather than hidden, and it cannot matter for
      the reason just given.

    - **EVA'S RULING FROM THE SHEETS (Sep 1): THE IRIS SHIPS. MERGED.** This closes the
      first half of the brief the zygomorphy work was opened on — full per-slot
      differentiation, with orchid and iris as the target forms — and it closes the IRIS
      half specifically, on a picture rather than an impression. The headline pair is what
      it was ruled from and it was built to make the comparison unfalsifiable: the same
      arrangement, the same 8 petals, the same 21,024 triangles on both sides, so the only
      thing that could differ is which state each whorl was built from. The outer whorl
      curls −90° and hangs; the inner composes −90 + 180 = +90° and cups.

    - **BOTH TASTE OBSERVATIONS WERE RAISED AND BOTH WERE RULED FINE AS-IS, and recording
      the RULING rather than only the observation is the point — an unresolved-looking
      note in a charter gets re-litigated by the next session that finds it.**

        * **The clustered standards are A SLIDER POSITION, not a defect and not a range
          problem.** On the headline cell the inner whorl reads as a tight central crown
          rather than three distinct upright petals; that is `layerSize` 0.62 against
          curl +90, and every one of those numbers is reachable and adjustable. Nothing
          is queued. Do not "fix" the default, widen a range, or add a control on the
          strength of this note.

        * **INNER COVERING EVERY WHORL ABOVE THE OUTERMOST IS ACCEPTED FOR NOW.** At three
          layers the second and third whorls are identical to each other, which is visible
          on the extremes sheet and was ruled acceptable. **The INNER/INNERMOST SPLIT
          STAYS A RECORDED CANDIDATE, and its reopening evidence is named so it cannot be
          reopened on the strength of reading the code: the three-whorl cell READING WRONG
          TO EVA LATER.** Not this look — she has seen this look and accepted it. A fresh
          ruling needs a fresh picture, exactly as the max-combinator kink, the tip cap and
          the parked tilt extremes do. When it comes, it is a design ruling with its own
          partition report — it changes the DERIVATION and nothing else — never a rewrite.

- ~~Session B: the mirror plane, slot roles, and the orchid~~ **BUILT Sep 2. The seam
  held: the override MECHANISM was not rewritten, it was MULTIPLIED.** Session A's
  `ROLE_OVERRIDES`, `resolveRoleOverrides()`, the object-identity guard and the builder's
  own `applied` record all survive; what changed is the role DERIVATION (a mirror plane
  giving LABELLUM / HOOD / LATERAL) and WHICH DESCRIPTORS EXIST (one per (layer × role)).

    - **THE MIRROR PLANE IS DERIVED AND WILL NEVER BE A CONTROL.** It contains the axis and
      slot 0's radial direction. An orientation slider would rotate which slots are the
      labellum on an arrangement that is otherwise radially symmetric — an invisible rigid
      rotation of the whole bloom under a label naming a symmetry, which is `layerPhase`'s
      recorded trap exactly. Putting the labellum at the bottom of a picture is the shot
      tool's CAMERA, not the geometry's azimuths, so it moves no bytes.

    - **THE ASSIGNMENT IS EXACT INTEGER ARITHMETIC — no angle, no tie tolerance, no
      epsilon**, which is what lets Z4 be a property rather than a bound. The plane pairs
      slot *i* with slot *n−i*, and the roles that can be SINGULAR are exactly that
      involution's FIXED POINTS: slot 0 always, and slot *n/2* when *n* is even. One owner,
      `roleForSlot(i, n)`, called by `footRing()`; `buildBloomInto` looks a descriptor up by
      slot index and computes nothing.

    - **AT ODD COUNTS THE ANTIPODE FALLS IN A GAP, so the HOOD IS THE STRADDLING PAIR
      (Eva, Sep 2)** — a mirror pair, so no symmetry claim weakens, and the ordinary
      two-lobed upper lip. **THE EMPTY GROUP IS PUSHED ONTO LATERAL DELIBERATELY, and that
      is the deciding argument rather than a detail:** LATERAL is the role with NO controls,
      so an empty LATERAL strands nothing, whereas an empty HOOD would leave three hood
      sliders naming a group with no members — which is what Z1 already fails INNER on. At
      `petalCount` 3 that is LABELLUM {0}, HOOD {1,2}, LATERAL {} — one of three IS the
      labellum, and it is the orchid.

    - **A CHARTER PREMISE WAS MEASURED AND CORRECTED, AND THE RULING IT SUPPORTED SURVIVED
      ON BETTER GROUND. This is the rationale-is-a-premise doctrine working across sessions,
      on this document itself — which is the failure mode it was written to catch.**
      Session A's four numbers are REAL and reproduce EXACTLY — 32.461° at n=5, 20.062° at
      n=8, 12.399° at n=13, 4.736° at n=40 — but they measure ONE rule: reflect about the
      plane through SLOT 0 and ask how far each image lands from the nearest slot. The
      charter states them as *"reflecting a golden-angle arrangement about **any** plane"*,
      and **that quantifier is FALSE.** A golden-angle whorl is an arithmetic progression on
      a circle, so reversing it gives the same set: it IS exactly mirror-symmetric, about
      the plane at `(n−1)·g/2`, pairing `i ↔ n−1−i`, measured at **≤ 8.14e-13°** at every
      count, with the best free plane at 0.000° everywhere.
      **SLOT ROLES STAY RADIAL-ONLY**, on the corrected and stronger ground: under SPIRAL
      the plane is elsewhere and the pairing is a DIFFERENT involution, so sharing one
      derivation across placements produces precisely session A's measured asymmetry. A
      correct-for-SPIRAL derivation is **RECORDED, NOT BUILT** — it is a second derivation
      needing its own evidence and its own ruling. Do not reopen the gating from the old
      number; the old number was never about "any plane".
      *(The first instrument written for this reported 0.000° for SPIRAL under a
      many-to-one pairing and was caught by its own control — a bijection is required, and
      the control existed because session A's published numbers were there to reproduce.)*

    - **AND SLOT ROLES NEED `layerPhase` 0 ABOVE ONE WHORL (Eva, Sep 2), which is a second
      measurement rather than caution.** The plane is the BLOOM's, so every whorl's slots
      must be symmetric about it; ring L is offset by `L·layerPhase` slots and the
      assignment is by index, so all whorls share the plane only at phase 0. Worst pairing
      error over the best SHARED plane: **2 layers × phase 0.25 → 30.000° at n=3, 11.250° at
      n=8, 2.250° at n=40; 3 layers × phase 0.33 → 39.600° / 14.850° / 2.970°; phase 0 →
      0.000° at every count and depth.** **RECORDED, NOT BUILT:** at phase 0.50 the
      ARRANGEMENT is exactly symmetric (0.000°, measured) because two slots TIE for the
      plane — but expressing that costs a float tie-comparison inside a derivation that is
      otherwise exact integer arithmetic, so it is a refinement with its own ruling.

    - **THE COLLAPSE GUARD IS LOAD-BEARING, AND THE REGROUPING TRAP HAS NOW FIRED A FOURTH
      TIME — prevented at design time again, by measurement.** Splitting a whorl's
      `n · rFoot²` into `1·r² + h·r² + l·r²` **moves the derived ring radius on 46 of 264
      measured (config × mode) rows**, worst **0.99 ULP** (3.553e-15 on a 17.26 mm radius at
      n=39 × petalWidth 30 × sheet 2.40), and it moves at n=3 as readily as at n=40. So the
      split is CONDITIONAL: unless a slot role actually resolves a record, `footRing()`
      returns session A's descriptor list on session A's arithmetic, character for
      character. The gating needs no second mechanism — an ineligible state makes every slot
      LATERAL, LATERAL carries no rows in `ROLE_OVERRIDES`, so nothing resolves and the list
      collapses on its own. **Z5 asserts the collapse in BOTH directions**, so the guard is
      never somewhere a bug sits unexercised.

    - **TWO LAWS NOW — `delta` and `mul` — AND THE TABLE'S KEY MOVED WITH THEM.** Session A
      carried the control id under a key called `delta`, honest while every row was one; a
      multiplier under that key is a stored label-lie. The id lives under `control` and the
      law under `law`, with `LAW_IDENTITY` the one owner of "what is this law's identity".
      **Both identities are SKIPPED rather than applied**, so neither `x + 0` nor `x * 1` is
      evaluated on the shipped path — the guard is still object identity, re-pointed rather
      than extended.

    - **SIZE × NEVER REACHES THE RING, and the ruling's own stated guarantee turned out to
      be the WRONG one — found by measuring the positive control before writing the
      assertion.** J2's containment equality was expected to catch a size override plumbed
      into `footRing()`. **It does not:** every descriptor still takes `radius = R0 · scale`,
      so containment holds and J2 stays silent. What fired on the measured mutation was the
      single-layer guard residual, and **only at layerCount 1**; on the three-layer row the
      mutation fired **NOTHING AT ALL**. **Z6 is the only witness above one whorl** — every
      descriptor of a whorl must report the same foot (`width`, `authoredWidth`, `radius`,
      `overhang`, `thickness`, `scale`, `phase`, `tiltExtra`). A role differentiates the
      BLADE and nothing else.

    - **SIZE × SATURATES, AND IT IS TOLD.** A composed value is clamped into the base
      control's own range, so ×2.00 on a 35 mm petal asks 70 × 32 and gets 60 × 30 — the
      multiplier stops moving before its slider does. The read-out prints what was asked and
      what was built, from `footRing()`'s own out-parameter rather than re-derived (a
      read-out recomputing "what was asked for" would be a second copy of the composition
      law). Same "(CLAMPED)" discipline as the roll floor, the tip floor and both foot
      clamps.

    - **A SESSION-A CHECK WAS MADE MORE GENERAL, NOT WEAKENED.** Its ROLE_OVERRIDES
      load-time guard asserted `delta range === base range` under a header naming the
      property "no dead zone at the end of a shipped slider". That equality is a PROXY that
      holds only while the base's range straddles the delta's useful span — true of all
      three session-A rows, so proxy and property agreed and nothing distinguished them.
      `petalTilt` runs 0..75 and contains no negative part, so a labellum that tilts DOWN
      needs a delta below zero; the genuinely usable reach is `baseMin − baseMax ..
      baseMax − baseMin`. All three of session A's rows satisfy the corrected form
      unchanged, and it still rejects everything the proxy rejected.

    - **Z2(v) WAS DISCHARGED BEFORE THE BOUNDARY WAS CROSSED, not after.** Session A made it
      fire the moment a record lands on ring 0; slot 0 IS the labellum, so it fires
      immediately. **Keeping descriptor 0 clean was NOT available** — at `petalCount` 3 the
      whorl splits into LABELLUM and HOOD with no laterals, so every descriptor carries a
      record and there is no base-state petal to point at. `formAssertions` and
      `thicknessAssertions` now take the effective state the BUILDER reported using, which
      is what the seam named. The tip-partition check moved with them and it MATTERS there:
      `petalTipBreadth` is overridable and the cap partitions on `=== 0` exactly, so reading
      the row would have checked a converging cap against an authored truncate.

    - **THE POSITIVE CONTROLS, RED THEN GREEN, in throwaway worktrees** (`git worktree
      add`, never mutate-and-restore), each run against the FULL shipped instrument before
      Z4–Z6 were written and again after:

      | mutation | boundary | degen | STL bytes | before Z4–Z6 | after |
      |---|---|---|---|---|---|
      | shipped tree | 0 | 0 | — | **0 of 7 rows** | **0 of 7 rows** |
      | M1 off-by-one hood index | 0 | 0 | same length | **NOTHING** | **Z4 only**, 6 across 4 rows |
      | M2 slot record never reaches the blade | 0 | 0 | same length | Z2(iii) only | Z2(iii) only, 48 across 4 rows |
      | M3 collapse guard removed | 0 | 0 | same length | **NOTHING** | **Z5 only**, on the DEFAULT row |
      | M4 size × plumbed into `footRing()` | 0 | 0 | same length | guard only, and **silent at 3 layers** | **Z6**, 22 across 4 rows |

      **M1 AND M3 ARE THE ENTRY THAT MATTERS.** Both are invisible to the entire shipped
      instrument — both STL gates, the triangle count, the byte length, J1–J6,
      `formAssertions`, `thicknessAssertions` and Z1–Z3 alike. M1 keeps the partition total,
      disjoint and identically SIZED, so the area-rule sum is bit-identical; M3 silently
      splits the DEFAULT bloom into three descriptors. Every mutation leaves session A's
      IRIS row and the GATED rows clean, so all four are scoped to the new arm.

    - **BYTE-IDENTICAL AT THE DEFAULTS**, and the default bloom is **11,136 tris live and
      export alike**, unchanged. The eight new controls add **ZERO triangles at every
      setting** — topology is fixed, so an override moves vertices and nothing else — which
      the ORCHID row confirms directly: 11,136 tris and the same STL byte length as the
      undifferentiated control beside it, with R0 identical to the bit.

    - **THE PANEL: A NEW SECTION, "Petal roles" (Eva, Sep 2)**, holding session A's three
      `inner*` deltas (moved from ARRANGEMENT — presentation only, nothing persisted) and
      the eight new ones. Session A predicted the name "Whorl differences"; it was passed
      over because slot roles differentiate WITHIN a whorl, so that name would be wrong for
      eight of eleven controls, and "Zygomorphy" was passed over as jargon on a
      visitor-facing panel.

    - **AND IT NEEDED NO PRECONDITION MECHANISM, which session A predicted it would.**
      Session A reasoned the section would ship with every control hidden and warned that a
      witness arranging its own preconditions is a witness that can quietly measure nothing.
      The `layerPhase` gating ruling changed that before it was built: slot roles apply at
      `layerCount` 1, so the predicate is TRUE at the shipping default and the section
      RENDERS at first load — collapsed, with its eight slot controls visible and session
      A's three hidden. **A session-B design report managed to state this BOTH WAYS in one
      document.** It was settled by EVALUATING the predicate, and the panel gate now asserts
      that exact first-load state in both directions on the DOM, so it can never again be
      settled by reading two paragraphs.

    - **THE MATRIX GREW 205 → 246**, and **`phase7Matrix()` — the 205 rows frozen at
      f626828 — is the sixth baseline and now the strongest**, on the reasoning that
      promoted each of its predecessors: it is the only one carrying session A's zygomorphy
      corners, which is the region a second role axis is most likely to disturb. Generated
      from f626828's own `buildMatrix()`, proved deep-equal in CI. `--full` cannot compare
      across the trees for the third time running: 33 new rows set controls the old registry
      does not declare. **The slot controls are excluded from the layer-sub sweep by
      derivation** — their predicate reads `layerCount`, so `predicateDrivers` correctly
      puts them there, where at three layers and the default phase they are HIDDEN and every
      row would build the shipping default under a label naming a control that did nothing.
      That is the latent trap #124 closed, arriving from the other direction.

    - **`slotsPerRing` WAS RETIRED.** It answered "how many petals does a ring carry" with
      one number, which a split whorl does not have. Its one real consumer was J1's
      accounting, which now sums each descriptor's own `roleCount`. Nothing persists it, so
      no `RETIRED_IDS` entry is owed — that list is for CONTROL ids, which reach saved
      designs.

    - **`fitCamera` GAINED AN EXPLICIT, DEFAULTED `up`.** Looking down the axis passed
      `dir = [0,0,1]` with `up = [0,0,1]`, which are PARALLEL — so "face-on" has never had a
      defined roll in this codebase, and got whatever three.js's degenerate fallback picked.
      That did not matter while every bloom was radially symmetric and it matters completely
      for a bloom with a face. Every existing caller omits the argument and frames
      identically.

    - **A TRAP IN `diff-bloom-bytes.mjs` FIRED EXACTLY AS ITS OWN HEADER PREDICTED.** Adding
      `--phase7` to `MATRIX_FN` without adding it to `MATRIX_FLAGS` made the flag be
      ACCEPTED and `legacyMatrix()` run — a 47-row report under a 205-row label. The header
      records this happening to `--phase3` and again to `--phase4`; it has now happened a
      third time. The one-list fix is in place and worked (the run said 47), but the flag
      constant is a second place to remember.

    - **EVA'S RULING FROM THE SHEETS (Sep 2): THE ORCHID SHIPS. MERGED.** This closes the
      SECOND half of the brief the zygomorphy work was opened on — full per-slot
      differentiation, with orchid and iris as the target forms — and with it the whole
      brief: **the bloom can now face you.** She ruled from **the `petalCount` 3 cell**,
      which is the one that answers the question without needing its caption: one big lip
      below, two raised tepals above, no laterals at all, and it reads as an orchid on
      sight. The headline pair is what makes it unfalsifiable — the same arrangement, the
      same eight petals, **the same 11,136 triangles on both sides**, so the only thing
      that could differ between the control and the orchid is which state each SLOT was
      built from.

    - **THE BROAD FACE-ON READ IS A SLIDER POSITION, NOT A RANGE PROBLEM (Eva, Sep 2), and
      recording the RULING rather than only the observation is the point** — an
      unresolved-looking note in a charter gets re-litigated by the next session that finds
      it. At the headline settings the labellum and hood read as broad rounded masses
      face-on rather than as distinctly petal-shaped: that is `labellumTilt` clamping to
      horizontal plus `labellumCurl` −60 bringing the blade toward the camera, and every one
      of those numbers is reachable and adjustable. Same standing as session A's clustered
      standards. **Nothing is queued. Do not "fix" a default, widen a range, or add a
      control on the strength of this note.**

    - **THE FAN LINEAGE, NAMED (Eva, Sep 2): THE LABELLUM SATISFIES HER ORIGINAL FAN
      PRINCIPLE.** The principle is that *the petal on the mirror line is petal number one,
      and it has its own sliders* — which is exactly what slot 0 became. So the orchid is
      not a detour from the fan idea; it is the fan idea's first half, arriving through the
      role mechanism rather than through an arrangement. **THE FLOWER'S OWN FAN UI IS THE
      RECORDED PATTERN FOR PER-PETAL GRANULARITY** whenever it arrives here: per-petal
      control GROUPS, labelled in the flower's own style (`PETAL 1 — INNER`). It is a
      pattern to borrow, not queued work — and it is the answer to the SELECTOR that
      session A recorded and rejected, since a group per petal is a registry row per petal
      rather than one control id holding several values.

- ~~Session 10: the fan arrangement~~ **BUILT Sep 2. A FOURTH `placement` value ships:
  FAN, a symmetric arc across one axis. Eva's ruling, in the flower's own vocabulary.**
  The entry below records what was QUEUED; this block records what was BUILT and what the
  measurements changed about the queue.

    - **THE HUB KEEPS THE FULL DISC (Eva, Sep 2), AND THE PREMISE THAT MADE IT A QUESTION
      WAS MEASURED AND IS TRUE-BUT-NOT-THE-FAN'S.** The Phase A analysis compared every fan
      against its RADIAL TWIN — the same petal count placed evenly, the same R0, the same
      feet — so the fan's own contribution is isolated from geometry that already ships.
      Across **900 swept configurations the fan's excess bare hub over its twin has a
      MEDIAN of 1.6 percentage points**, a full range of −0.1 to +49.5, and at spread 6
      (the charter's own flagged plate) **−0.1 to +8.6**. At the loudest state a fan
      reaches — spread 6 × centre NONE — the fan is **78.9% bare and its radial twin is
      78.9% bare**, to the tenth of a point. The 49.5-point worst case is a hub 3.9 mm
      across and amounts to **5.7 mm² of bare slab**. The cause is that `overhang` is
      0.4·R0, so feet only ever occupy the outer 40% of the radius and bare hub is
      dominated by the RADIAL direction, not the azimuthal one. **The spread-6 plate is a
      spread problem that has shipped since #123. The fan does not meaningfully worsen it.**

    - **AND THE SECTOR WAS COSTED RATHER THAN DISMISSED, so it is not re-proposed from the
      idea alone.** Four measured costs: (1) **J2 and J3 are pure RADIUS statements with no
      azimuth term** (`r.radius <= hub.radius`, `radius − overhang < hub.radius`), sound
      only because a disc is rotationally symmetric — a sector makes them necessary but not
      sufficient and needs a new clause that is an `atan2` extremum over the foot rectangle,
      i.e. **a bound with a tolerance, in the one place this project has kept equalities**.
      (2) **It saturates to the disc exactly where the geometry is delicate**: the minimum
      sector containing every foot is **≥ 359.6° on 7 of 17 named corners**, because a
      foot's angular half-extent reaches 34.8° at the defaults, 50.3° at fewest×widest,
      76.0° at spread min and **130.7° at ALL THIN, where it crosses the axis and emerges on
      the far side**. (3) **J4's overlap box loses a free guarantee**: the circumferential
      extent is `ring.width` by construction today and becomes `min(ring.width, clipped)` at
      the two end feet. (4) **Triangles are not an argument**: the disc is 192; a sector at
      the same 48/turn is 4M+4 — 164 at 294.7°, 60 at 103.8°, a saving of **0.29–1.2%** of
      the default bloom — and **196 when it saturates, MORE than the disc it replaces**.
      **The area rule is untouched by the choice either way**, because it sizes the RING
      (where feet land) and not the plate's extent. The area-ruled annular band stays parked.

    - **THE COUNT IS DERIVED AND `petalCount` HIDES rather than being relabelled.** A fan
      has no turn, so petals-per-turn describes nothing there. One control with a
      mode-dependent label is the stored-label-lie this project retires ids over; a second
      count control dead in three modes is the same defect in a different hat. So it gets
      the `layerPhase` treatment: hidden by predicate, INERT by derivation (`footRing()`
      reads `fanArrangement().count` on that arm and never the control), value untouched and
      returned the moment the placement is. `fanArrangement()` is its one owner and both
      read-outs print the derived number.

    - **`layerPhase` HIDES TOO, AND IS FORCED TO EXACTLY 0 — for the OPPOSITE reason to
      CONTINUOUS's, which is why both are named rather than merged.** Under CONTINUOUS the
      control has no job. Under FAN it has one and **the job destroys the placement**: the
      mirror plane is the BLOOM's, so offsetting whorl L by L slots swings every inner whorl
      off the one plane the arrangement exists to have — session B's measured
      30.000°-at-n=3. Forcing the phase makes the azimuth antisymmetry hold by construction
      at any depth, which is why the fan needs no depth clause in `slotRolesEligible()`.

    - **ONE LAW COVERS BOTH TOGGLE POSITIONS, AND THE PARITY IS THE TOGGLE.** Slots run in
      AZIMUTHAL ORDER across the arc (`az_i = phase + (i − (n−1)/2)·step`), so the pairing is
      `i ↔ n−1−i` — fixed-point-free at even n, one fixed point at odd n — and
      `n = 2·perSide + (on the line ? 1 : 0)` is odd exactly when a petal is on the line.
      **Nothing in `roleForFanSlot()` branches on the control.** The charter derived this
      involution three sessions early while correcting session A's SPIRAL premise; it needed
      exactly the one that had been written down for a different reason. Measured on all 60
      reachable configurations before anything was built: **pairing error exactly 0.000°,
      the permutation a bijection on every one, and `az[i] + az[n−1−i] === 0` on all 450
      slot pairs.** The instrument's control reproduces session A's four SPIRAL numbers to
      the digit (32.461 / 20.062 / 12.399 / 4.736), so the zero is a result and not a
      harness that always says zero.

    - **ROLES: LABELLUM nearest the plane, HOOD at the ARC'S ENDS.** The hood is the pair
      straddling the OPEN WEDGE, which is the only antipode an arc has and the direct
      analogue of RADIAL's antipodal hood — so it is always a PAIR and never singular. At
      n = 2 the two groups COLLIDE (both petals are the labellum pair, the hood has no
      members), and **Z4's existing clause already rules on that**: a control-bearing role
      with no members is a failure. So `slotRolesEligible()` gains **MIN_SLOT_ROLE_COUNT =
      3**, vacuous under RADIAL (petalCount min 3) and therefore bit-identical there.

    - **A SIGNED-ZERO TRAP, FOUND BEFORE IT COULD BE WRITTEN INTO AN ASSERTION.**
      `Object.is(az[n−1−i], −az[i])` is **FALSE on every toggle-ON row** — at the mirror-line
      petal the azimuth is `+0` and its reflection `−0` — while the residual is exactly 0.
      Z7 is written as `a + b === 0`, which is true for `+0` and `−0` alike. That is the form
      layer's `−0 + 0` case analysis arriving in a new place.

    - **TWO PRE-EXISTING COUPLINGS WERE FOUND BY RUNNING THE FAN THROUGH THE SHIPPED
      INSTRUMENT BEFORE WRITING ANYTHING NEW, and both made assertions measure a design they
      did not name.** Neither is a fan bug; the fan is what separated two things that had
      always been the same thing.
        * **`zygoAssertions` derived `n` from `ui.petalCount`.** Under FAN that names a whorl
          the bloom does not have, and **Z3 fired on the very first fan row**. It now reads
          `slotsPerWhorl` — footRing()'s own answer, cross-checked against `petalsBuilt`, the
          tally counted at the BLADE CALL SITE. This is the flower's "73 of 185 configs
          measuring the wrong design" defect arriving through a placement instead of a
          read-back.
        * **Both guard residuals were computed for SLOT 0 while the metrics hook reports
          DESCRIPTOR 0's petal.** Identical until a fan put slot 0 in the HOOD and the
          labellum in the middle; both then returned null and the gates said **"not
          measured"** on rows that had measured nothing. One definition now
          (`reportedForDescriptor`), and on a split whorl it measures ONE PETAL PER ROLE
          instead of one per bloom — strictly more coverage from the same expression, the
          shape J1 already gained under CONTINUOUS. **A consequence to carry forward: the
          form guard residual is exactly 0 only at azimuth 0.** The charter's "measures
          exactly 0" was a property of slot 0; the extended coverage measures up to
          **3.55e-15**, five orders under the 1e-9 bound.

    - **Z4 WAS GENERALISED, AND HARDCODING RADIAL'S PAIRING WAS NOT A NEUTRAL DEFAULT.** Run
      against a correct fan, `(n − i) % n` pairs slot 1 with slot 5 at n = 6 — a LATERAL
      against a HOOD — so **the shipped tree would have failed Z4 and the natural fix would
      have been to weaken it**. The pairing now comes from `mirrorPairFor(placement, …)`;
      the two arms are DIFFERENT INVOLUTIONS, not one law with a parameter.

    - **BOTH SHIPPED GATES, AND EVERY ASSERTION THIS PROJECT HAD, ARE BLIND TO WHETHER THE
      ARRANGEMENT IS SYMMETRIC AT ALL — measured on throwaway worktrees BEFORE Z7 was
      written.** Four mutations, each run through the full instrument over all 41 fan rows:

      | mutation | boundary | tris live/export | STL bytes | BEFORE Z7 | AFTER Z7 |
      |---|---|---|---|---|---|
      | shipped tree | 0 | identical | — | **0 of 41 rows** | **0 of 41 rows** |
      | M1 the arc loses its mirror (`i − n/2`) | **0** | **identical** | **same length** | **NOTHING** | **Z7 only**, 39 rows |
      | M2 role pairing off by one (`n − i`) | 0 | identical | same length | Z4 only, 12 rows | Z4 only, 12 rows |
      | M3 area rule keeps `petalCount` | 0 | identical | same length | ring-list accounting only, 38 rows | same, 38 rows |
      | M4 `layerPhase` reaches the fan | **0** | **identical** | **same length** | **NOTHING** | **Z7 only**, 6 rows |

      **THE SCOPING IS COUNTED, NOT EYEBALLED.** M1 fires on **39 of 39 rows whose
      placement is FAN and on neither of the two GATED rows that are not** — so it is
      scoped to the new arm exactly. M4 fires on **6 of 6 fan rows with layerCount > 1 and
      on no single-layer fan row**, which is the predicted behaviour rather than a gap: at
      one whorl `lambda` is 0, so `0 · layerPhase · TAU / n` is 0 whatever the control
      says. **A one-whorl run of M4 would have read as a passing instrument** — it had to
      be run deep, which is the same lesson M2 taught session 9B's J6 from the other
      direction.

      **M1 AND M4 ARE THE ENTRY THAT MATTERS.** Every per-row report under both is
      byte-for-byte identical to the shipped tree's — same live and export triangle counts,
      boundary 0, degenerate 0, same KiB — so an arc one half-step off its own mirror plane,
      and inner whorls swung off that plane by a phase offset, are invisible to the export
      gate, the connectedness gate, the triangle count, the byte length, J1–J6, Z1–Z6,
      `formAssertions` and `thicknessAssertions` alike.

    - **SO THE LAYER SHIPPED Z7 — THE ARRANGEMENT ITSELF IS MIRROR-SYMMETRIC**, the first
      assertion in this file about AZIMUTHS rather than roles, radii or records. It reads
      the azimuths **as emitted**, collected at the blade callback — `petalRingApplied`'s
      doctrine pointed at the arrangement, because a mirror claim checked against a
      restatement of the azimuth law would agree with a broken law by being broken alongside
      it. An **EQUALITY, not a bound**: the index offsets are exactly negated small integers
      or half-integers, so IEEE multiplication gives exactly the negated product. It also
      asserts the plane is where the role NAMES say it is — the slot nearest it is the
      labellum, the slot furthest along the arc is the hood.

      **Z4 CANNOT SEE M1 AND Z7 CANNOT SEE M2, and keeping that distinction is the point.**
      Z4 is a statement about INTEGERS (the role assignment is symmetric across the pairing),
      which an azimuth mutation leaves untouched. Z7 is a statement about GEOMETRY (the
      azimuths realise that pairing). Together they say the mirror plane means what its name
      says; **either alone is a label on half a computation.** Z7 is scoped to the FAN
      deliberately: RADIAL is mirror-symmetric too, but its reflection needs a wrap modulo a
      turn and stops being exact integer arithmetic, so one assertion covering both would buy
      a tolerance for the placement that does not need one.

    - **THE TOGGLE IS A TWO-OPTION CHOICE, NOT A CHECKBOX (Eva, Sep 2)**, and that is a
      decision about this registry rather than about the fan. The bloom has exactly two
      control kinds; a checkbox would be a third — new coercion, new DOM generation, new
      equality, new harness handling, and boolean semantics for the predicate leaves. A
      choice needs none of it, its `oneOf` leaf already expresses the eligibility gating, and
      its option labels can name BOTH states where a checkbox label can only name one.

    - **THE ARC CAP IS AN OUTPUT CLAMP, NEVER A RANGE LIMIT** — the roll floor's pattern,
      and the flower's own 170° inherited deliberately because the fan Eva approved was drawn
      under it. It binds only at 6 per side above 30.909°, leaving a 340° arc and a 20°
      wedge, and the read-out says "(CLAMPED)". Photographed rather than hidden, on the
      standing pattern for extremes.

    - **A THIRD PLACE THE BLANKET-SWEEP TRAP COULD HAVE OPENED, closed by asking the
      registry.** `fanPerSide` and `fanSpacing` are plain sliders — neither layer subs nor
      slot subs — so they would have landed in the matrix's blanket min/max sweep, where
      DEFAULTS is RADIAL, they are hidden, and each row builds the shipping default under a
      label naming a control that did nothing. The skip is now the GENERAL form of the three
      named ones: evaluate the control's own predicate at the state the row would build.
      Checked when added: it removes the two fan sliders **and nothing else** — the matrix
      stayed at 246 rows before the fan block was added.

    - **BYTE-IDENTICAL AT THE DEFAULTS, AND MEASURED TWO WAYS THAT COVER DIFFERENT
      THINGS.** The FLOAT-LEVEL comparison imports both trees' geometry modules and
      compares **every emitted coordinate** of every frozen row in BOTH modes against
      `main`: **1,049 frozen rows, 2,098 builds, 0 moved** — 47 / 76 / 86 / 106 / 125 /
      158 / 205 / 246 across the eight baselines. It is strictly finer than a hash (it
      compares floats, not a digest) and it covers LIVE as well as export, which the byte
      report cannot. What it does NOT cover is the shipped path: `readUI()`, the export
      handler and the real Get STL button, which is what the browser byte report exercises
      and what previous sessions quoted. **Both are run; neither substitutes for the
      other**, and saying which is which is the point.

    - **THE MATRIX GREW 246 → 287**, and **`phase8Matrix()` — the 246 rows frozen at
      7877bdf — is the eighth baseline and now the strongest**, on the reasoning that
      promoted each of its predecessors: it is the only one carrying BOTH zygomorphy
      sessions' corners, which is the region a fourth placement value is most likely to
      disturb, since the role derivation and the area rule's grouping are what it touches.
      Generated from that commit's own `buildMatrix()` and proved deep-equal in CI.
      `--full` cannot compare across the trees for the **fourth** time running.
      **The `MATRIX_FLAGS` trap did NOT fire a fourth time**: `--phase8` went into both lists
      in the same edit, which is what its own header says to do.

    - ~~Session 10~~ **THE BRIEF AS IT WAS QUEUED (Eva, Sep 2): SESSION 10 IS THE FAN
  ARRANGEMENT — a FOURTH `placement` value.** Not a role, not an override: an arrangement, so it belongs to
  `buildWhorlInto` and `footRing()` beside RADIAL / SPIRAL / CONTINUOUS. Its controls, as
  ruled: **petals per side, petal spacing, and a petal-on-mirror-line toggle** — the
  vocabulary is the flower's own fan implementation, which the session should READ as the
  reference rather than re-invent (control names, the spacing law, the toggle Eva
  screenshotted). The bloom's disciplines stay the bloom's.

    - **THE TOGGLE'S OFF-POSITION ALREADY HAS ITS MATHEMATICS, DERIVED AND RECORDED HERE
      BEFORE ANYONE KNEW WHAT IT WAS FOR.** A symmetric arc with no petal on the mirror line
      is a MIRROR THROUGH THE GAP, whose pairing is **fixed-point-free: `i <-> n-1-i`** —
      the same involution session B measured while correcting session A's SPIRAL premise
      (a golden-angle whorl is exactly mirror-symmetric about `(n-1)*g/2` under precisely
      that pairing, at <= 8.14e-13 deg). Session B's shipped derivation is the OTHER
      involution, `i <-> n-i`, which has fixed points and is why LABELLUM and HOOD can be
      singular at all. **Both are now written down, with their fixed-point structure stated,
      and the fan needs exactly the one that was built for a different reason.** That is the
      THIRD time this project has derived a piece of mathematics before discovering its
      purpose.

    - **THE ZYGOMORPHY ROLES COMPOSE ONTO IT rather than being redone (Eva's ruling).**
      LABELLUM is the mirror-line petal when the toggle is ON, and the INNER PAIR when it is
      OFF; HOOD and LATERAL follow from the same pairing. So the fan changes the ARRANGEMENT
      and the role DERIVATION reads it — the seam session A wrote and session B kept.

    - **THE GENUINELY NEW PROBLEM IS AT THE JUNCTION, and it is the loud-plumbing question
      from session 2 finally coming home.** A fan's feet occupy an ARC of the ring, not the
      circle, so for the first time the hub's job changes SHAPE: a full disc spans feet that
      are no longer all round it, and most of that disc would be plumbing with nothing on
      it. **Full disc versus a derived SECTOR is the Phase A analysis** — with the
      spread-6.00 plate note as its precedent (ship the disc, photograph it, let the sheet
      decide) and the area-ruled annular band as the costed alternative that was parked
      there. Every junction assertion J1–J4 is written per RING and will need re-reading
      against an arc: containment, the foot reaching the hub, and the overlap box are all
      stated over a full circle today.

    - **AFTER THE FAN, THE STANDING BOARD (Eva, Sep 2):** edge treatments, infill, per-petal
      sliders in the flower's fan UI pattern, and Eva's own presets. Recorded as direction,
      not as queued work; each needs its own ruling and its own evidence.
