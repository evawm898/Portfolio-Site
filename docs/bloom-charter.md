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

- ~~**PARKED, and deliberately not built: a "print preview" toggle**~~ **BUILT Sep 3
  (Eva's ruling: the parking is spent at three-figure petal counts) — see the session-13
  entry at the end of this document. The parking note is kept below as written.** It
  proposed rendering the export-floored geometry live. The reasoning that parks it is the same reasoning that
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

## The working loop — who holds the ball

**RULED Sep 2 (Eva). EVERY SESSION REPORT, AT EVERY STOP, ENDS WITH EXACTLY ONE
BALL-HOLDER LINE.** Not a summary sentence, not a status paragraph — one line, in one of
these three forms, as the last thing in the message:

    WAITING ON EVA: <the single question>
    WAITING ON MEASUREMENT/CI: nothing needed from Eva
    DONE — merged as <sha>. Safe to archive this session.

**A REPORT WITHOUT THE LINE IS INCOMPLETE.** It applies to every stop, including the
final one, and including stops where the answer is obviously "nothing" — an obvious state
that is never written down is a state the reader has to infer from prose, which is the
whole problem this fixes.

**EVA NEVER MERGES A PULL REQUEST HERSELF.** The merge is always the session's own final
step, released by her ruling. Her only two recurring actions in this project are RULING ON
SHEETS and CLICKING BRANCH DELETES; a session is archivable the moment its last message
reports a merge sha.

**WHY IT IS A RULE AND NOT A HABIT.** A close-out generates a lot of true sentences —
gate results, row counts, partition tables — and every one of them competes with the only
question the reader actually has: *is this mine now?* The line answers that before the
prose is read, in a fixed place, in fixed words. `WAITING ON EVA` carries exactly ONE
question, because two questions in a ball-holder line is a report that has not decided
what it needs.

**AN AMENDMENT IS PASTED ONLY INTO THE SESSION WHOSE REPORT IT ANSWERS** (Eva, Sep 2, the
second duplicate-session occurrence). Ruling on a report and pasting the ruling back are
two different actions separated in time, and the second one is where a stale tab or a
copied brief can hand the answer to the wrong session — Eva's own amendment for #133 once
reached a fresh, unrelated session instead, which opened on it as if it were a new kickoff.
Verify the branch name in the session's LAST report before pasting; if it does not match
the session in front of you, it is not this session's amendment to answer.

## Incident, Sep 2 — one feature, two parallel sessions

**A DUPLICATED KICKOFF PRODUCED TWO SESSIONS BUILDING THE FAN AT THE SAME TIME.** Both
opened on the same brief against the same `main` (`7877bdf`, #128). One landed as #129 and
is what ships; the other reached the point of an open PR (#130) before discovering the
first had merged underneath it. #130 was closed unmerged and nothing from it reached
`main`.

**THE STALE-PREMISE CHECK IS WHAT CAUGHT IT, and it caught it late rather than early.**
The charter's own rule — *every factual claim in a prompt is a hypothesis, and the
snapshot goes stale the moment you commit* — was applied to the brief's opening line
("`main` carries #128 merged"), which was TRUE at kickoff and FALSE by the time the
second session pushed. The signal was a routine `git fetch` in the close-out, not
anything clever. **A session that never re-fetches `main` before opening its PR would
have proposed a merge of a duplicate and found out in the conflict.**

**WHAT THE DUPLICATE COST, AND WHAT IT WAS WORTH.** It cost an afternoon of compute and
produced nothing that shipped. What it produced instead is a genuine independent
replication: two sessions, working separately, ruled the SAME way on every design
question that had a ruling — full disc at the junction, a two-option choice rather than a
new checkbox kind, `petalCount` HIDDEN rather than relabelled, the flower's 15–60/default-45
spacing, and both involutions already written down. Where they differed, #129 was
better on all three points, which is recorded here because "the duplicate was wasted" and
"the duplicate agreed" are different facts and only the second is evidence about the
design:

  * **Z1's clause is stronger than a geometric assertion.** #130 was going to propose
    "the labellum is the slot nearest the plane, the hood the slot furthest along the
    arc". Measured against #129's shipped instrument — a `LABELLUM`/`HOOD` swap on the
    mirror-through-gap arm, with a clean control run on the same tree (282/282, PASS, 0
    assertions) — **Z1 fired 8 times across 4 rows**, catching it COMBINATORIALLY through
    "a role's controls are visible IFF the role is non-empty" rather than geometrically.
    At one per side with the mirror through the gap the tie-break gives both petals to
    LABELLUM, so the swap empties it while its five sliders stay on screen. Tying
    membership to visibility with ONE owner fires in both directions and is cheaper than
    the assertion it made unnecessary.
  * **`hoodEmpty` beats a minimum-count constant.** #130 gated slot roles below three
    slots with a `MIN_SLOT_ROLE_COUNT`; #129 states the same boundary as a predicate about
    the group itself, which is the condition rather than a proxy for it.
  * **Keeping slot 0 in the labellum AVOIDS a coupling rather than fixing one.** #130
    numbered slots azimuthally across the arc, which put slot 0 at an arc END — and both
    guard residuals are computed for `slot.index === 0` while the metrics hook reports
    DESCRIPTOR 0's petal. Those had been the same petal since the day they were written.
    #130 had to fix it; #129's ordering never separates them.

**THE COUPLING IS LATENT IN `main` AND IS NOT A DEFECT — recorded so it is not
rediscovered as one.** `slot.index === 0` still selects the representative petal at both
sites. It is unreachable today because the shipped derivation always keeps slot 0 in the
labellum, and the swap mutation is the only thing that exposed it (two of its failing rows
also read `guard residual null — not measured`). **A future session that changes the slot
ORDERING re-opens it, and Z1 is not what would catch it** — Z1 saw the role swap, not the
null residuals. The remedy, if that day comes, is to select the representative petal by
"the first slot of THIS descriptor" rather than by index 0.

**THE PREVENTION IS PROCESS, NOT AN INSTRUMENT: ONE KICKOFF, ONE SESSION.** No gate can
see a second session; nothing in this repository can. What makes a duplicate cheap to
detect is the ball-holder line above — a finished session's last message says `DONE —
merged as <sha>`, so "is this already built?" is answerable by reading the previous
session's last line instead of by reading `main`'s diff. **Re-fetch `main` before opening
a PR, and read the ball-holder line of any session covering the same brief, before
building rather than after.**

**SECOND OCCURRENCE, SEP 2, A DIFFERENT SHAPE OF THE SAME FAILURE.** The first
duplicate was two sessions kicked off on the same brief; this one was ONE session that
never should have been kicked off at all. Eva's amendment to the view-system session's
report (four rulings on an already-built, already-green PR #133) reached a fresh,
unrelated session instead — which had no report of its own to check against, so it read
the amendment as a new brief, opened Phase A discovery, then found #133 already built and
matching, and adopted its implementation by cherry-pick rather than re-deriving it. It
added the one thing genuinely missing — the orientation ruling, made from the rendered
preview rather than the numbers — as PR #135, and closed #133 as "superseded." It was not:
#133 was the amendment's actual target and, by the time #135 opened, already carried all
four ruled items (orientation included) plus a fully verified evidence bar #135 never
built. #133 was reopened, reconfirmed green on its unchanged head, and merged; #135 was
closed unmerged by its own session once it re-checked and found the duplication.

**"ONE KICKOFF, ONE SESSION" DID NOT COVER THIS FAILURE, because nothing was kicked off
twice.** The first incident's prevention is about STARTING work; this one is about
ROUTING an answer to work already in flight. The remedy recorded in this charter's working
loop above — verify the branch name in a session's own last report before pasting an
amendment into it — is the corresponding rule for this half of the loop, the same way the
first incident's remedy (re-fetch, read the ball-holder line) covers the kickoff half.

**RULED Sep 2, from this session's own close-out. FROM SESSION 11 ONWARD a session's
close runs the NEWEST baseline plus the LIVE-MATRIX partition; the FULL historical suite
runs only at MILESTONES.** The historical baselines are RETAINED, never deleted — only
their routine byte-comparison is demoted.

**THE REASONING, AND IT IS A MEASUREMENT RATHER THAN AN IMPRESSION.** The suite is
1,049 rows and it grows by the whole live matrix every session — 47, then 76, 86, 106,
125, 158, 205, 246. That is **quadratic in project age**: each session adds a baseline
whose size is the current matrix, and every later close re-runs all of them, on two trees
each. This close-out spent an afternoon on it. Session 11's would spend longer, for
strictly less new information than the same minutes spent anywhere else.

**WHAT A CLOSE RUNS, and why each piece is the right one:**

  * **THE NEWEST BASELINE, on both trees.** It is the parent tree's own matrix, so it
    carries every corner every earlier baseline carries PLUS the ones the last session
    added — which is exactly the reasoning that has promoted each baseline to "strongest"
    in turn since phase4. **This is the load-bearing byte-identity claim**: "nothing that
    shipped before this change moved."
  * **THE LIVE-MATRIX PARTITION.** The new rows cannot appear in any frozen matrix — for
    the fourth session running, `--full` could not compare across the two trees at all
    because the new rows set controls the old registry does not declare. The live
    partition is the only instrument for the region a change actually affects.
  * **CI's `--verify-frozen` IS UNCHANGED AND RUNS ON EVERY PUSH**, proving every frozen
    matrix deep-equal to its own base commit's `buildMatrix()`. So the baselines keep
    being checked for what they ARE; what is demoted is only re-exporting their bytes.

**WHAT A MILESTONE IS, stated so it is not decided by mood:** before any production
publish, or when a change touches the AREA RULE or the EXPORT PATH directly. Both are the
places a byte can move on a row nobody thought to look at — the area rule because every
foot feeds it and the trap has now fired five times, and the export path because the
floor is evaluated there and live/export geometry legitimately differ.

**WHAT THIS GIVES UP, said plainly rather than discovered later.** A defect that moves a
row present in phase2 but absent from the newest baseline would now be caught at the next
milestone instead of the next close. That row set shrinks every session (the newest
baseline is a superset in coverage of nearly everything older) and no such defect has ever
been observed in ten sessions — but "never observed" is not "impossible", and this is the
exposure the ruling accepts in exchange for the minutes.

**RULED Sep 5 (session 17). THE ITERATION LOOP IS THE SMOKE SUBSET; THE FULL MATRIX IS
CI's JOB AND NOT ALSO THE SESSION'S.** This extends the retention ruling above rather
than replacing it: retention decided WHICH BASELINES a close re-exports, this decides
WHERE THE FULL MATRIX RUNS. Everything built for it is ADDITIVE — the full 499 rows on
both STL gates, in CI, on the merge commit, remains the merge criterion, unchanged and
byte-identical in what it checks.

  * **ITERATE ON `node tools/bloom-smoke.mjs`.** 28 of 499 rows through the real export
    gate's own `--only` flag. Measured on one machine in one session: the subset **134 s**
    (three runs, 4.2% spread) against the full export gate's **2,621 s** and the full
    connectedness gate's **2,600 s** — **about 20x against one gate, 40x against both**.
    The subset, its derivation, its path -> row table and the five things it is BLIND to
    are in the tool's own header, which is where a reader needs them at the moment they
    read a green run.

    **THE FIRST RATIO REPORTED FOR THIS WAS 31x AND IT WAS WRONG, in exactly the way this
    session's own brief warned about — recorded because the correction is the useful
    part.** An earlier 23-row version of the subset measured 85 s; the five rows that
    close the block-coverage gap were added; the 28-row set measured 134 s. The 49 s gap
    did not reconcile with those five rows' own timings (30 s including five browser
    starts), so the 23-row set was RE-RUN in the later machine state rather than the
    arithmetic being explained away: **99.8 s, against 84.4 s for the same 23 rows
    earlier — this box drifted about 17% slower across the session.** The only pair
    measured in one state is 23-vs-28 rows (1.34x), which is what pins the added rows at
    ~34 s. The full-gate numbers were taken in the FAST state and the shipped subset in
    the SLOW one, so 2621/134 understates and 2621/113 (the fast-state 28-row estimate)
    overstates; **about 20x is the honest floor**. Runner variance is not a measurement,
    on a laptop as much as on a CI runner — the same workflow on two heads of PR #149
    measured 2,579 s and 4,170 s, a 62% spread.
  * **`--conn` IS REQUIRED, NOT OPTIONAL, WHEN A SESSION INTRODUCES A NEW GEOMETRY MODE.**
    Export-only is right for the modes that exist — the flood fill catches nothing because
    J1-J9 fire first — but it is a BACKSTOP for failures the assertions do not model, and a
    brand-new mode is exactly where they may not. Run `--conn` until the new mode's junction
    assertions are established AND have been shown to fire on a mutant; then drop back.
  * **PUSH, AND LET CI RUN THE FULL MATRIX. DO NOT ALSO RUN IT LOCALLY.** Run it locally at
    a MILESTONE only, on the definition already above: before a production publish, or when
    a change touches the area rule or the export path.
  * **AND THE ARGUMENT IS NOT ONLY MINUTES — IT IS WHAT GETS CERTIFIED, verified from this
    repo's own CI log rather than assumed.** `actions/checkout@v4` on a `pull_request`
    event checks out the MERGE COMMIT: run 33927836353's own log reads
    `git checkout --progress --force refs/remotes/pull/149/merge` /
    `HEAD is now at c1cfd5a Merge 848ae962... into 6b8e94b...`. So CI certifies head-merged-
    into-base — what actually merges. A local run certifies the working tree, which is
    neither that nor the head, and on this repo reads `+dirty` from the gitignored
    node_modules symlink. If `main` moves under a PR, CI covers it and a local run cannot.
  * **WHAT THIS GIVES UP, said plainly.** A session loses its pre-push signal, and a red run
    is now public on the PR where a red local run was not. The smoke subset is the
    replacement for the iterating half of that and is 31x cheaper than what it replaces.
  * **ONE CLOSE-OUT STEP DEPENDS ON A LOCAL FULL-MATRIX RUN AND IS NOT FOLDED IN: THE BYTE
    PARTITION.** `tools/diff-bloom-bytes.mjs` exports the matrix on two trees and diffs
    them; **CI does no byte diffs at all.** That stays local and this ruling does not touch
    it. Everything else a close-out quotes from a gate run — row counts, CROWDED tallies,
    coverage skips, self-contact counts — is in the CI log verbatim.

**AND "SIX VERIFY JOBS GREEN" OVERSTATES THE BLOOM EVIDENCE — one line, so the sentence
stops being misread.** Of the six jobs a bloom PR runs, **two are FLOWER gates**:
`flower-export-watertight.yml` and `flower-geometry-quality.yml` are path-filtered on
`'tools/**'`, so any bloom PR touching a tool runs them, and they test flower geometry. The
bloom evidence is four jobs. **The filter is deliberately NOT changed** — it is a flower
gate's trigger and belongs to that project.

**RULED Sep 5 (session 17). NO DOCS-ONLY COMMITS ON A GATED PR HEAD — a convention,
because the filter that would do it cannot be made to fail safe.**

GitHub evaluates a workflow's `paths` filter on a `pull_request` event against the WHOLE PR
DIFF, never the pushed commit. So once a PR's cumulative diff touches a gated file, every
later commit re-runs everything, whatever it changed. Measured from the Actions API:

| session | commit | files | export gate | connectedness gate |
|---|---|---|---|---|
| 14 (#146) | `5fe2656` outcome doc | 1 file, `docs/` only | 2,767 s | 2,456 s |
| 16 (#149) | `848ae96` outcome doc | 1 file, `docs/` only | 4,170 s | 3,911 s |

**13,304 s — 3 h 42 m of runner time on two commits that changed no gated byte**, and that
is the two bloom gates alone. Session 13 (#145) is worse and was outside the window looked
at: five charter-only commits (`5fa1bc9`, `0af7d4c`, `9ce49be`, `85fda0d`, `538b2f7`) each
ran both gates, roughly another 13,500 s.

**THE MACHINERY WAS COSTED AND DECLINED (Eva, Sep 5), and the reasoning is recorded so it is
not re-proposed.** The risk is a commit that LOOKS docs-only landing on a head whose code has
never been gated — which happens routinely here, since a session pushes code and docs as
separate commits. `[skip ci]` skips the whole run and leaves the head with NO gate result:
fails unsafe. `dorny/paths-filter` against `github.event.before` answers "did this push touch
a gated path", which is not the question — the question is "has this exact gated content
already passed", and a push range says nothing about whether the parent's run was green. The
rule that WOULD fail safe is: skip only when the TREE HASH OF THE GATED PATHS equals that at
a commit whose gate run concluded `success` — both halves, which needs a Checks-API lookup
inside the workflow defaulting to RUN on any error, missing run or ambiguity. That is real
machinery guarding a repo where a wrong skip merges ungated geometry, in a project whose
oldest enemy is a label naming a computation nobody performed. **A convention that works
beats a filter that might skip a gate.**

So: **fold the charter and outcome-doc changes into the code commit, or push them BEFORE the
code.** A close-out doc written after the gates are green is the common case, and the fix is
to amend rather than to append.

**AND `concurrency: cancel-in-progress` IS ON ALL FOUR BLOOM WORKFLOWS (Eva, Sep 5), keyed
to `${{ github.workflow }}-${{ github.ref }}` so it can never cancel across PRs.** Safe by
construction — it only ever cancels a run on a commit that has been SUPERSEDED, and the
final head always runs to completion. It also enforces a discipline already agreed:
**a superseded commit's green run should never have been quotable, and session 16 quoted
one** (runs 84 and 85 started two minutes apart and both ran to completion on a four-CPU
runner).

**AND IT DESTROYS EVIDENCE IN EQUAL MEASURE, WHICH IS THE HALF NOBODY EXPECTS.** A cancelled
run is not a cheaper run; it is NO run. **Three of this PR's own full-gate runs were
superseded before finishing** — the STL gates on `46a72b4`, `550b793` and `8524109` were all
cancelled by the next push, so a PR that had been open for half an hour had no completed gate
result at all. **So: on a gated PR, push once and let it run.** That is the same discipline as
"no docs-only commits on a gated PR head" arriving from the other side — the docs rule says
do not make the gates run again for nothing, and this one says do not stop them proving the
head you have. Batch the close-out into ONE commit; a series of small pushes leaves the final
head unproven and every earlier one abandoned.

**"SHIPPED MEANS REACHABLE" FIRED ON A WORKFLOW, AND THE CASE IS WORTH THE NAME (session 17).**
`bloom-frozen-tags.yml` was written as a `workflow_dispatch` job so the tags could be published
despite the proxy's 403, reported as ready to click, and it could not be clicked: **a
`workflow_dispatch` workflow is only dispatchable once its file is on the DEFAULT branch.**
GitHub registers workflows from `main`, so on a PR branch it did not appear in the Actions UI —
`GET /actions/workflows/bloom-frozen-tags.yml/runs` returned 404 and `list_workflows` returned
sixteen workflows without it. The file parsed, the YAML validated, the job was correct, and the
route was unreachable. **It was caught only because the OUTCOME was checked directly rather
than inferred from the mechanism's own success** (`git ls-remote --tags origin` → zero tags),
which is the flower project's rule about a label naming a computation nobody performed, arriving
in CI configuration. Verify a route by reaching it, never by reading it.

**AND A RESTARTED BRANCH HAS A TRAP OF ITS OWN: A SQUASH-MERGED HEAD IS NEVER AN ANCESTOR OF
`main` (session 17).** `main` squashes, so the merge creates a NEW commit and the branch head
that merged cleanly is not in `main`'s history at all. The obvious safety check before
restarting a branch — `git merge-base --is-ancestor <old head> origin/main`, "is the work I am
about to discard already merged?" — therefore answers **NO on a branch that merged perfectly**,
and answers it every single time, on every restarted branch. Read literally it says "stop"
exactly when it is safe to proceed, which is the worst direction for a safety check to fail
in. **Check the PR's MERGE STATE, not ancestry** (and note the branch is usually gone from the
remote after a merge anyway, so no force-push is needed — a plain push recreates it). Recorded
because it will recur on every restarted branch, and the next session should not have to
work out why its own guard is shouting at it.

**RULED Sep 5 (session 17). A FROZEN BASELINE IS TAKEN AT A COMMIT ON `main`, NEVER AT A
BRANCH HEAD, AND IS TAGGED AT FREEZE TIME. phase10 is the case that produced the rule.**

**HOW IT SURFACED.** `bloom-frozen-matrices` went red on a PR that touches no geometry,
at `fatal: invalid reference: 4f39118` — phase10's declared base. The same workflow had
passed on `main` three hours earlier. Of the TWELVE entries in `FROZEN_BASE_COMMITS`
(`legacyMatrix()` declares none), **phase10's is the only one that is not a commit on
`main`**: it is a mid-PR commit of #140, and `fetch-depth: 0` fetches BRANCHES, so it was
reachable only while `claude/fan-per-petal-sliders-iwbkb6` existed. Branch deletes are one
of Eva's two recurring actions. Everything else about the incident follows from that one
fact, which is why the rule is about WHERE a baseline is frozen and not about the gate.

**THE BASELINE WAS RECOVERED, AND A PREMISE ABOUT HOW WAS CORRECTED ON THE WAY.**
`refs/pull/<N>/head` is a permanent ref on GitHub and survives branch deletion. The
obvious test — "is `refs/pull/140/head` equal to the frozen sha?" — FAILS here: #140 kept
committing afterwards, so its head is `2ea3e19`. **The conclusion that would follow from
that ("the head ref points elsewhere, so this does not recover it") is FALSE, and the
correction is the useful part: fetching a ref brings its HISTORY.** `4f39118` is the sixth
commit back from `refs/pull/140/head`, and fetching that ref restores the object. The
commit immediately AFTER it is `805a191` ("the all-petals group at one whorl; Petal 1 /
Petal N hidden and inert there") — exactly what phase10 is documented as being frozen
BEFORE, so it is the right object and not one that merely resolves. **Proven rather than
asserted: `--verify-frozen --phase10` against a worktree of the recovered commit PASSES,
376 rows deep-equal.** phase10 is intact; nothing was retired and nothing demoted.

**THE FIX IS A PERMANENT REF, NOT A FETCH TWEAK, AND NOT A LOOSER GATE.** Twelve
lightweight tags (`frozen/phase2` .. `frozen/phase13`) pin every declared base. A tag
survives branch deletion AND a force-push to `main` — and `main` is not protected here, so
a force-push would orphan every base that lives only in its history. Tagging converts
twelve implicit dependencies on branch reachability into twelve explicit permanent refs,
which closes the CLASS rather than the instance. **The sha in `FROZEN_BASE_COMMITS` stays
the one owner of WHICH commit a baseline is**; the tag exists only to keep the object
alive, so no second identifier for one thing is introduced and `--verify-frozen` needs no
change — `actions/checkout@v4` at `fetch-depth: 0` fetches tags, so the existing
`git worktree add "$sha"` resolves unchanged.

**AND `--verify-frozen` MUST NEVER SKIP AN UNRESOLVABLE BASE.** The tempting repair — treat
a missing base as a skip — turns a lost proof into a silent pass, which is the one thing
this project never ships. A baseline whose base cannot be resolved is UNVERIFIABLE and must
say so loudly; if that ever becomes the real state, the honest move is a labelled
unverifiable tier and a correction to the claim that CI "proves every one deep-equal on
every push", never a quiet green.

**BLOCKED, AND RECORDED AS AN ENVIRONMENT LIMIT RATHER THAN A REPO ONE:** this session
created all twelve tags locally and could not publish them. The agent proxy returns
**HTTP 403 on a tag ref push** — both as `git push --tags` and as a single explicit
`refs/tags/...` refspec — while ordinary branch pushes to `refs/heads/...` succeed from the
same session, the same 403 that already refuses branch deletes here. No create-ref API is
exposed either. **The tags are still owed**, and until they exist `bloom-frozen-matrices`
is red on every bloom PR.

**A GATE RUN NAMES THE FIRST FAMILY THAT FIRED, NEVER THE ONLY WITNESS (session 17, and it
is a correction to how every prior outcome doc must be read).** Both STL gates abandon a row
at the first failing assertion family, in the order form -> curl -> thickness -> junction ->
zygo -> export floor -> crowding -> coverage. So session 14's P3 (a blade that did not rotate
with its foot) and session 15's Q1 (a `domeLean` computed but never summed) BOTH report
**C1** on today's head, not the J8 and J9 their own sessions record: session 16's C1
reconstructs the whole spine — including `petalTilt + tiltExtra + domeLean` — from other
owners, and silently became a SECOND witness for two mutations from earlier sessions.

**J8 AND J9 DO DISCRIMINATE INDEPENDENTLY — measured, not assumed, because the alternative
would have been a real finding.** With the curl family suppressed in a throwaway worktree and
nothing else changed, P3 fires **J8 alone** (4 times across the two domed smoke rows) and Q1
fires **J9 alone** (twice), each with the message it was written for. So the earlier records
are IMPRECISE, not wrong, and neither assertion is being carried by C1.

**The working rule that follows: establishing that a SPECIFIC assertion discriminates
requires suppressing the families ahead of it.** A green-then-red positive control proves a
witness EXISTS; it cannot name which one, and neither can any gate run. Attributions in prior
outcome docs are to be read as "the first family that fired", and any new attribution that
matters should be measured this way.


- ~~Session 10 — the fan arrangement~~ **BUILT Sep 2. The fourth `placement` value ships:
  a symmetric arc across one axis, in the flower's own control vocabulary, with the
  zygomorphy roles composing onto it rather than being redone.** The ruling that queued it
  is kept below the build notes, unchanged, because every one of its predictions is
  answerable now and three of them were wrong in instructive ways.

    - **THE HUB STAYS A FULL DISC, AND THE LOUD-PLUMBING QUESTION ANSWERED ITSELF IN mm².**
      The sector was analysed and rejected from four directions at once, each measured
      rather than argued. (1) **A sector is not a sector.** A foot is a box of `ring.width`
      across, so it subtends an ANGLE that grows as it runs inward: 13.94° at the ring and
      22.47° at the foot's inner edge at 17 petals, 35.89°/50.33° at two, and **52.20° at
      the ring at spread 0.60**. A sector derived from the occupied span would have to be
      padded by that on both sides — at the tight corner (2 petals × 15° spacing) the
      arrangement spans 15° and the sector needs 15 + 2×50.33 = **115.7°, 7.7× the fan's
      own span**. (2) **It must contain the axis, where its width vanishes.** At spread
      0.60 the feet CROSS the axis — inner edge **−0.894 mm** at two petals ALL THIN — so a
      sector apexed at the axis has vanishing width exactly where J4's overlap box must be
      ≥ 1.5 × 1.6 × 1.0 mm. (3) It breaks `buildCenterInto`'s connectedness clause, which
      is *"centre ∩ hub is a solid region of the centre's FULL footprint — not a band whose
      width has to be argued about"*; over a sector it becomes exactly such a band. (4) It
      **does not reliably save triangles**: 28 at a 30° span but **274 against the disc's
      192 at 340°**, so the state where a sector would matter most is the one where it
      costs more.

      **AND THE DECIDING NUMBER IS THAT THE FAN CANNOT MAKE A PLATE ANYONE HAS NOT ALREADY
      RULED ON.** The fan's worst hub is 17 petals × spread 6.00 → **77.4 mm diameter,
      3,013 mm² of bare plate**, against the RADIAL 40 × spread 6.00 plate that already
      ships at **118.7 mm and 5,064 mm²**. Even by FRACTION the fan's least-covered state
      (2 petals × 15°, **8.7%** under feet) has less bare plate in absolute terms —
      **505 mm² against the shipping RADIAL 3 × spread 6.00's 706 mm²**. The disc was the
      right answer because spread, not the fan, is what makes plumbing loud, and spread was
      ruled Aug 31. **The area-ruled annular band stays parked, now with this evidence
      attached** — and the area rule itself is untouched, because it sums `rFoot²` over
      feet and is blind to where they sit around the axis.

      **J1–J4 SURVIVE THE FAN VERBATIM, and that is a property of how they were written:**
      every clause is stated over radii, thicknesses and foot FRAMES, and not one of them
      mentions an azimuth. The overlap box measures **2.400 mm³ per whorl** at the fan's
      worst corner — the SAME number as the single-ring, layered and continuous corners,
      because none of `overhang`, `width` or `thickness` is a function of azimuth either.

    - **THE COUNT IS DERIVED AND `petalCount` IS HIDDEN — the `layerPhase` treatment
      (Eva, Sep 2).** A fan's count is `2 × perSide + (a mirror-line petal ? 1 : 0)`.
      Reusing `petalCount` was costed and rejected on a sharper ground than a read-out
      lie: a stored 8 would render as 8 petals under RADIAL and **17 under FAN**, which is
      a label lie on a **PERSISTED key** — the thing `RETIRED_IDS` exists for — and
      switching RADIAL → FAN at 40 would silently ask for 81 petals, past every measured
      extreme. Making `petalCount` the TOTAL instead was also rejected: the toggle fixes
      the count's PARITY, so the two controls would fight. The read-out prints the derived
      total, so the number the visitor loses is still on screen, and **three named rows
      assert `petalCount` is hidden AND inert** (3, 8 and 40 under FAN must be
      bit-identical). `layerPhase` hides too, for a reason of its own: offsetting a whorl
      would rotate the inner fan OFF the mirror line — which is also **why the fan is the
      first placement where slot roles reach three whorls**, since `phase` is 0 on every
      descriptor by construction rather than by a value the visitor happened to leave alone.

    - **BOTH INVOLUTIONS WERE ALREADY WRITTEN DOWN, and the fan needed the one derived for
      a different reason.** Toggle ON uses session B's shipped `i ↔ n−i`, whose FIXED POINT
      is slot 0 — so the labellum is the mirror-line petal, which is Eva's original fan
      principle arriving through the role mechanism. Toggle OFF uses the fixed-point-free
      `i ↔ n−1−i` that session B derived while correcting session A's SPIRAL premise, so
      every role is a PAIR: the labellum is the INNER pair, the hood the outer one. The
      arrangement's slot ORDER was built to fit the pairings, not the other way round.
      **That is the third time this project has derived a piece of mathematics before
      discovering its purpose, and the first time the earlier session's spare half was
      picked up unchanged.**

    - **THE TWO-PETAL COLLISION BECAME A STRUCTURAL IMPROVEMENT, which is the entry worth
      keeping.** One per side with the toggle off is `n = 2`, where the inner pair and the
      outer pair are the SAME pair. A slot cannot carry two slot roles, so the tie breaks
      toward the LABELLUM (the fan's defining petal) and the **HOOD comes out EMPTY**.
      Session B's remedy — push the empty group onto LATERAL, which has no controls — is
      unavailable, because here the collision is between two CONTROL-BEARING roles. So the
      other half of that argument was discharged instead: **the hood's controls hide when
      the hood is empty, and Z1's clause was amended from "every control-bearing role is
      non-empty at every reachable count" to "a role's controls are VISIBLE if and only if
      the role is NON-EMPTY", asserted in both directions against `footRing()`'s own
      census.** Membership and visibility became ONE statement with one owner instead of
      two rules that could drift, and the amended form catches a converse the old one could
      not: a role that HAS members while its controls are hidden is "shipped means
      reachable" violated silently. The panel gate's transition route covers the new hide
      for free.

    - **THE HEADLINE FINDING: NOTHING IN TEN SESSIONS OF INSTRUMENTS HAD EVER MEASURED AN
      AZIMUTH — established by grep, not by assumption.** Before this session `azimuth`
      appeared in this repository only inside `buildWhorlInto`, where it is computed, and
      `buildPetalInto`, where it is consumed. Nothing recorded one, so nothing could assert
      one. Both STL gates are azimuth-blind BY CONSTRUCTION — an edge census over a
      topology no control moves, and a flood fill over a hub disc that spans every ring at
      every azimuth — and so is everything built on them: J1 reads foot FRAMES, J2/J3 read
      RADII, J4 reads the overlap box's three dimensions, J5/J6 read the depth sequence,
      and Z1–Z6 read role membership and the effective state. **A FAN that silently built a
      full ring would have passed the export gate, the connectedness gate, the triangle
      count, the STL byte LENGTH, J1–J6 and Z1–Z6 alike.** It was measured on a throwaway
      worktree and it did exactly that. Azimuth telemetry entered `__bloomMetrics` with the
      BUILDER as its owner — the slot payload the whorl primitive emitted, never re-derived
      from `placement` and the controls, because an instrument that recomputed the law
      would agree with a mutated law by mutating alongside it.

    - **J7 — THERE IS AN ARC, AND THERE IS A GAP.** Three clauses, all properties of the
      emitted azimuths: (a) the petals span, about the mirror line, exactly what
      `footRing()` derived; (b) the notch behind them is its complement — which is the
      whole of what the word "fan" claims; (c) the minimum angular separation is bounded
      below, because coincident petals are duplicate geometry (this family's known cause of
      non-manifold edges, measured at 14,832 when two whorls coincided, which is why
      `layerSize` caps at 0.90). A fourth clause asserts the arrangement is CENTRED on its
      own plane, and the "(CAPPED)" flag is asserted in both directions.

      **J7's FIRST DRAFT WAS WRONG AND ITS OWN CONTROL SAID SO, at the corner it exists
      for.** It measured the span as *"360 minus the LARGEST gap"* — the smallest arc
      containing every petal, which is right everywhere except where the arc limit bites
      hard. At 8 per side with a mirror-line petal the step caps to **21.25°** and the
      notch is **20°**, so **the notch is SMALLER than the spacing** and the largest gap is
      an ordinary inter-petal one: the shipped tree failed its own new assertion on that
      row, reporting a 338.82° span against the derived 340°. The span is the extent about
      the PLANE, which is twice the furthest petal from it. A gate that had only ever been
      run on the easy rows would have shipped saying something false about the one state it
      was written for.

    - **Z4 SPLIT INTO Z4a AND Z4b, and the split is what catches a wrong DECLARATION.**
      Z4a is session B's clause with the involution read from one owner rather than
      restated: the ROLE assignment must be symmetric under the pairing this bloom
      declares. It catches an off-by-one in `roleForSlot` — and it cannot catch a wrong
      declaration, because it compares the roles against the very pairing that is wrong and
      agrees with itself. **Z4b reads the GEOMETRY instead**, in two clauses: (i) the
      pairing is a BIJECTION — a permanent clause, because a many-to-one "pairing" reports
      a perfect symmetry for an arrangement that has none, which is the trap the first
      instrument written for session B's SPIRAL measurement fell into; and (ii) there is
      ONE plane — for every slot, the midpoint of its azimuth and its partner's is the same
      angle modulo π. **The FIXED-POINT slots are what make (ii) bite:** a self-paired slot
      must lie ON the plane, and a pairing borrowed from the wrong arm puts it where the
      other pairs' midpoint is not.

    - **THE POSITIVE CONTROLS, RED THEN GREEN, in throwaway worktrees** (`git worktree
      add`, never mutate-and-restore), each run against the FULL shipped instrument BEFORE
      the new assertions were written and again after. Every mutation exports watertight,
      with zero degenerate triangles, at an identical live and export triangle count and an
      identical STL byte LENGTH, and every one leaves the RADIAL and SPIRAL control rows
      clean — so all five are scoped to the new arm.

      | mutation | boundary | degen | STL bytes | before J7/Z4b | after |
      |---|---|---|---|---|---|
      | shipped tree | 0 | 0 | — | (see below) | **0 of 8 rows** |
      | F1 the fan silently builds a RING | 0 | 0 | same length, different bytes | **NOTHING** | **J7 only**, 15 across 6 rows |
      | F2 the toggle is inverted | 0 | 0 | same length | **NOTHING** | **Z4b + Z1 only**, 8 across 6 rows |
      | F3 the arc limit never applied | 0 | 0 | same length | **NOTHING** | **J7 only**, 5 on the one row where it binds |
      | F4 the derived count never reaches the area rule | 0 | 0 | same length | J1 accounting + guard | J1 + guard + Z1, 12 across 4 rows |
      | F5 the WRONG INVOLUTION | 0 | 0 | **BIT-IDENTICAL** | **NOTHING** | **Z4b + Z1 only**, 4 across 3 rows |

      **F5 IS THE ONE THAT MATTERS.** On the fan's default row it is bit-identical to the
      shipped tree — `sha c623982e` on both — because with no slot override engaged the
      role assignment moves no vertex at all. There is no byte to diff, no triangle to
      count and no STL property to measure; **only comparing the declared pairing against
      the emitted azimuths can see it.** F1 is the second: same byte LENGTH, different
      bytes, and invisible to every instrument that existed.

    - **AND THE CONTROLS FOUND A REAL DEFECT IN THE SHIPPED INSTRUMENT BEFORE ANY MUTATION
      DID — six of eight probe rows fired on the SHIPPED tree.** `zygoAssertions` derived
      the slot count as `Math.round(Number(ui.petalCount))`, which was correct while every
      placement's count WAS that slider. The fan makes it inert, so on every FAN row the
      gate compared a 6- or 7- or 17-slot whorl against the slider's 8: Z3 read `multiRole`
      TRUE on an unsplit whorl and demanded an absent residual, Z1 reported *"claims 7 of
      its 8 slots"* on a correct partition, and Z4 read a role for a slot that does not
      exist and got `undefined`. **A gate deriving a boundary from a control instead of
      from the owner is this project's most repeated defect, and it had been sitting inside
      the instrument built to police exactly that.** It reads `m.slotCount` now —
      `footRing()`'s own answer. This is session A's "Z1's first draft failed the shipped
      tree on 5 of 7 rows" repeating, and it is the entire argument for running the control
      before writing the assertion.

    - **BYTE-IDENTITY IS A CONSTRUCTION, AND THE REGROUPING TRAP WAS PREVENTED A FIFTH
      TIME.** The fan is a BRANCH everywhere — `footRing()`, `buildWhorlInto`,
      `roleForSlot` — and never a reformulation, so every pre-existing expression is
      character-for-character what it was. The one thing that had to change shape is the
      effective count, and it is carried in a variable holding **the same double** the
      pre-fan expressions held. Measured on 396 (count × width × sheet × delicacy × mode)
      rows before it was written: substituting that variable is **bit-identical on all
      396**, while REGROUPING the area-rule sum per foot — the tempting "it is the same
      rule" rewrite — moves the derived radius on **124 of 396 at up to 4.00 ULP**.

    - **`--phase8` LANDED IN ONE LIST, because the fall-through trap had fired three
      times.** `diff-bloom-bytes.mjs` carried FOUR places a phase name had to be written —
      the flag constants, `MATRIX_FN`, `--verify-frozen`'s name list and its own function
      map — and the charter records the trap firing once per matrix added: `--phase3`
      recorded `matrix:"legacy"` while running `phase3Matrix()`; `--phase4` was accepted
      while `legacyMatrix()` ran; `--phase7` was added to `MATRIX_FN` and not to
      `MATRIX_FLAGS`, giving a 47-row report under a 205-row label. Each fix removed one
      copy and left the next standing, **which is what a fix to a duplication problem does
      when it does not remove the duplication.** There is one `FROZEN` map now, and adding
      a matrix is one entry in it.

    - **THE MATRIX GREW 246 → 281**, and **`phase8Matrix()` — the 246 rows frozen at
      7877bdf — is the seventh baseline and now the strongest**, on the reasoning that
      promoted each of its predecessors: it is the only one carrying session B's SLOT-ROLE
      corners, which is the region a fourth placement with its OWN involution is most
      likely to disturb. The 35 new rows are the region this change affects, named rather
      than numbered: both toggle positions, the four corners of (perSide × spacing), the
      arc limit binding both ways, the BARE fan, ALL THIN × spread min (with and without
      feet crossing the axis), nested fans at three layers, the roles on both involutions,
      slot roles at depth (which only the fan reaches), the empty-hood gated state, and the
      hidden-and-inert rows for `petalCount` and `layerPhase`. The three fan controls are
      kept out of the blanket sweep by a **derived** `PLACEMENT_SUBS` exclusion — a control
      whose predicate reads `placement` and which is hidden at the shipping defaults —
      which is the latent trap #124 closed arriving from a third direction. Both clauses of
      that predicate are load-bearing: without the second it would also exclude the eight
      slot-role controls, which read `placement` and are deliberately swept at the defaults.

    - **THE EVIDENCE, COMPLETE.** Export gate **281/281** watertight, 0 degenerate, no
      validity failures. Connectedness gate **281/281 one connected piece**, 0 strays, in
      632 s — including the corner the whole junction analysis turned on, two petals at a
      15 deg arc with 345 deg of empty circle behind them. Panel gate PASS, with
      `--negative-control` firing all four routes; its visibility-transition route picked
      up `placement -> FAN`, `fanPerSide` and `fanCenterPetal` from the registry with no
      new code, so the hood's empty-group hide is covered for free. **BYTE-IDENTICAL ON
      1,049 FROZEN ROWS, 0 MOVED**: legacy 47, phase2 76, phase3 86, phase4 106, phase5
      125, phase6 158, phase7 205 and phase8 246, each compared against a worktree at its
      own base commit. All four CI gates green on the head.

    - **A CI FAILURE THIS SESSION CAUSED, AND IT WAS CAUSED BY THE FIX FOR ANOTHER
      DEFECT — which is the part worth carrying.** Collapsing `diff-bloom-bytes.mjs`'s
      four phase-name lists into one `FROZEN` map is the right change and it is what the
      fall-through trap had been asking for since `--phase3`. It also put the list 240
      lines BELOW the `--verify-frozen` block that now reads it, and `const` hoists
      without initialising: every `--verify-frozen` run died with "Cannot access
      'PHASE_NAMES' before initialization". **The four separate lists had been HIDING that
      hazard rather than being free of it** — each sat beside its own reader, so no
      ordering dependency existed to get wrong. Unifying duplicated constants creates one.
      CI caught it on the first run; running `--verify-frozen` once locally would have
      caught it sooner, and the gate that WAS run exercised the other code path.

    - **AND A CAPTION ASSERTED A BYTE TOTAL NOBODY HAD MEASURED.** The sheet's control
      cell read "(0 of 803 frozen rows moved)" as established fact while 293 of those rows
      had actually been compared and the rest were still running. That is the
      label-naming-a-computation-nobody-performed defect **inside the tool built to
      photograph evidence** — and worse than a stale number, because a caption is where a
      figure outlives its run: the total would have sat in that cell across every later
      session whose matrix grew. The caption states the PROPERTY now and names the one
      owner of the number; the frozen matrices measure it and the shot tool does not.

    - **EVA'S RULINGS FROM THE SHEET (Sep 2). THE FAN SHIPS.** Four rulings, and only
      one of them moved anything:

        * **THE TOGGLE DEFAULTS TO ON, DELIBERATELY DIVERGING FROM THE FLOWER'S OWN
          DEFAULT — and both halves are recorded so the divergence reads as chosen.** The
          flower ships `bilCenterPetal` FALSE, and every other thing about this control —
          its range, its labels, its hint text, its spacing law — is the flower's exactly.
          Matching it was the obvious call. What outranked it is Eva's own founding fan
          principle, *the petal on the mirror line is petal number one, and it has its own
          sliders*: with the toggle ON, slot 0 IS that petal and IS the labellum, because
          slot 0 is the through-slot involution's fixed point. A fresh fan should open
          showing the principle it was built on rather than the state where that principle
          has no single petal to point at. **Consistency with the older page lost to the
          idea the newer one is for**, and that is the ruling, not an oversight.
        * **THE SPACING RANGE SHIPS AS-IS** — 15–60°, the flower's own, unchanged.
        * **THE PAIRED LABELLUM ON TOGGLE-OFF IS FINE.** Ruled from the cell where one
          control drives two petals and the area rule multiplies that group by 2.
        * **THE 340° EXTREME KEEPS ITS 170° LIMIT, PHOTOGRAPHED** — the standing pattern
          for extremes, joining the max-roll faceting, the ROLL CLAMP look, the spread-6
          plate and the 135°/161.25° tilts. **Tightening the limit remains one constant
          change with that cell as its evidence; do not tighten it on the strength of the
          number alone.**

    - **THE DEFAULT CHANGE IS ITS OWN EVENT, WITH THE PARTITION ASSERTED IN THREE
      DIRECTIONS** — the `spread` 1.00 → 2.00 and `centerStyle` NONE → DISC precedent,
      which this session followed rather than folding the ruling into the feature commit.
      The third direction is the one worth naming, because it is a claim about the
      GEOMETRY rather than about the rows: **`fanCenterPetal` is INERT outside FAN**, so
      every non-FAN row must be bit-identical no matter what the default is. Measured on
      the live matrix, before and after:

      | partition | rows | expected | measured |
      |---|---|---|---|
      | non-FAN (the control is inert) | 246 | bit-identical | **246, 0 moved** |
      | FAN, PINS the toggle | 10 | bit-identical | **10, 0 moved** |
      | FAN, INHERITS the default | 25 | all move | **25, all 25 moved** |

      **And the 1,049 frozen rows are the same claim at its strongest**: not one of them
      can select FAN, so the whole historical suite is the non-FAN partition. Measured on phase8's 246 rows across both trees:
      **0 moved.** Checked in BOTH directions rather than by counting: **no moved row is
      anything but fan-inheriting, and no fan-inheriting row failed to move.**

      **AND THE DEFAULT CHANGE COST EIGHT ROWS THEIR COVERAGE ON THE WAY THROUGH, which
      is the charter's own "A DEFAULT IS NOT COVERAGE" rule firing on a default this
      session moved.** Eight FAN rows named a toggle position in their LABEL and inherited
      it rather than pinning it — including the two-petal corner and the GATED empty-hood
      row, which is the state this session's one design ruling is about. The moment the
      default moved they all began building the ON arrangement while every label still
      said OFF, **the toggle-OFF region went to zero coverage, and every one of them still
      passed** — on a design nobody had asked them to check. A row that NAMES a state now
      SETS it (`FAN_OFF` / `FAN_ON` beside the inheriting `FAN`), which is the centre
      rig's own rule arriving one level up. Matrix 281 -> 282.

    - **THE FAN SHEET, and the mirror line is drawn from a measurement.**
      `node tools/shot-bloom-fan.mjs <dir>` — the flower-fan composition Eva liked: face-on
      as the headline with the plane running vertically down every frame, the toggle pair
      side by side, a spacing sweep, fan × labellum on both involutions, the two-petal
      corner, the capped extreme, and one RADIAL bloom unchanged as the control. The
      vertical line is legitimate because the face-on camera is rolled so the plane's trace
      is vertical — but a line drawn at a fixed place is exactly the kind of label that
      stops matching its computation, so **every cell measures the plane from the emitted
      azimuths and the sheet aborts if it is not where the line is.**

      **BOTH OF THE SHEET'S OWN CHECKS FIRED BEFORE IT COULD BE PUBLISHED, and neither
      defect was visible by eye.** (1) THE FIRST RENDER CROPPED THE TIGHT FANS. Every
      arrangement before this one was radially symmetric, so its bounding sphere sat on the
      axis and framing at the ORIGIN with a radius was correct; a fan puts all its mass on
      one side, and the `Spacing 15°` cell — the one meant to show the fan at its most
      closed — showed the top third of itself. It targets the model's own bounding-sphere
      centre now (the app reports the sphere it already computes) and DECODES THE PNG to
      require a 12 px clear margin on all four edges, widening in bounded steps and dying
      rather than writing a picture nobody should rule from. (2) THE PLANE MEASUREMENT WAS
      WRONG, and the radial CONTROL cell is what caught it: taking the plane as the
      midpoint of the arrangement's angular EXTENT is right for an arc and meaningless for
      a full circle, where +180 and −180 are the same direction and the normalisation
      decides the answer. It measured 22.500° for a bloom whose plane is plainly at 0. It
      uses the mirror-PAIR midpoints now — the same property Z4b asserts — which gives 0
      for the ring and 0 for both fan arms, because it asks the question the plane
      actually answers.

    - **TWO CLAIMS IN THE QUEUING RULING WERE MEASURED AND CORRECTED — the
      rationale-is-a-premise doctrine again, on this document, which is the failure mode it
      was written to catch.** The ruling below says *"for the first time the hub's job
      changes SHAPE"*: it does not. The feet do occupy an arc, and the hub's job — span
      every foot with a solid overlap — is stated over RADII and is unchanged by where the
      feet sit around the axis. And it says *"every junction assertion J1–J4 is written per
      RING and will need re-reading against an arc: containment, the foot reaching the hub,
      and the overlap box are all stated over a full circle today."* **They are not stated
      over a circle at all** — J1 reads foot frames, J2/J3 read radii, J4 reads three
      lengths, and not one clause mentions an azimuth. None of them needed a character
      changed. That is the same property that made them useless against the fan's own
      failure mode, which is why J7 exists: **the reason J1–J4 survived the fan untouched
      and the reason they could not police it are one reason.**

  **THE RULING THAT QUEUED THIS SESSION, kept verbatim below.**

- ~~Session 10~~ **RULED AND QUEUED (Eva, Sep 2): SESSION 10 IS THE FAN ARRANGEMENT — a
  FOURTH `placement` value.** Not a role, not an override: an arrangement, so it belongs to
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
      **PER-PETAL SLIDERS CAME OFF THIS BOARD ON Sep 3 — see the session 11 entry below.
      Edge treatments, infill and Eva's own presets remain on it, unchanged.**

- ~~Session 11 — per-petal sliders for the fan~~ **BUILT Sep 3. Every petal in the fan
  gets its own control group, the mirror-line petal is petal one, and per-petal roles
  SUPERSEDE slot roles there on Eva's ruling — against the session's own recommendation,
  with the cost stated to her and accepted.**

    - **THE HEADLINE FINDING: THE PER-PETAL GROUPS ALREADY EXISTED, UNNAMED — measured
      from the emitted azimuths before anything was written, never from the derivation.**
      The orbits of the involution this bloom declares ARE the mirror pairs, ordered by
      distance from the plane: at 3 per side with the toggle ON, `P1{0}@0.0` `P2{1,6}@45.0`
      `P3{2,5}@90.0` `P4{3,4}@135.0`; with it OFF, `P1{0,5}@22.5` `P2{1,4}@67.5`
      `P3{2,3}@112.5`; at 8 per side ON, nine groups ending `P9{8,9}@170.0`. **So P1 with
      the toggle on IS the singleton mirror-line petal at 0.0 deg — Eva's founding fan
      principle, measured rather than asserted.** And in EVERY arm `LABELLUM = P1`,
      `HOOD = P_last`, `LATERAL = everything between`: per-petal roles are session B's
      slot-role partition REFINED, from three coarse groups to
      `perSide + (a mirror-line petal ? 1 : 0)` fine ones. Every group is a mirror orbit by
      construction, which is why Z4a needed no new clause and why per-PAIR was structural
      rather than a preference.

    - **THE SEAM HELD FOR THE SECOND TIME, AND THE MECHANISM WAS NOT REWRITTEN.** Session A
      wrote "adding a third axis later is a longer list, not a rewritten resolver"; that is
      exactly what this was. `resolveRoleOverrides()` is untouched; `petalStateFor()`'s
      object-identity guard is untouched CHARACTER FOR CHARACTER; the builder computes
      nothing new, because `slotRings` simply became finer. **`buildBloomInto` needed no
      change at all.**

    - **THE BRIEF'S "OBVIOUS CANDIDATE" WAS THE WRONG OWNER, and naming the real one
      matters.** The kickoff proposed `petalStateFor()` as the one owner of the resolution
      order. It is not: it owns exactly one question — *does a record exist* — and is three
      lines. **The resolution ORDER is `ROLE_OVERRIDES`'s own array order**, walked by the
      resolver's single loop, which iterates the TABLE and tests membership in the roles
      list. Precedence is therefore declared by where a row sits in one table and by nothing
      else; per-petal rows sit last, so per-petal has the last word, clamped once at the end
      into the base's own range.

    - **EVA'S FOUR RULINGS (Sep 3).**
        * **PANEL: ONE SECTION PER GROUP**, in the existing accordion, static labels
          ("Petal 1") with the read-out naming what the group currently is. **Ruled from
          measured heights, with real control rows cloned into the real page** — the
          alternative was the flower's own form, sub-headings inside one section, which is
          what she likes and what the brief pointed at:

          | | 4 groups (the shipping fan) | 9 groups |
          |---|---|---|
          | one section, sub-headings | section **904 px**, panel **1,314 px** | 2,001 / **2,411 px** |
          | one section per group | section 216 px, panel **719 px** | 216 / **874 px** |
          | (today, for scale) | tallest section 417 px, panel 788 px | |

          The sub-heading form is already past the **1,241 px flat panel the accordion was
          built to replace**, at the shipping default. One section per group is BELOW
          today's worst case at the default and 86 px above it at the extreme, needs no cap,
          and needs no new mechanism: a section is hidden when and only when every control
          in it is hidden, which `applyVisibility()` already derives, so groups beyond
          `fanPerSide` and every group under a non-FAN placement disappear for free.
        * **CONTROL SET: size x / tilt / cup / CURL** — the labellum's five minus tip
          breadth, argued rather than inherited: at fan scale the tip silhouette is the
          least legible per-petal difference, while spine curl is what makes a petal hang
          and reflex and is the one control that can. **TIP BREADTH IS DELIBERATELY ABSENT
          per-petal and is ONE ROW IN TWO TABLES the day she wants it.**
        * **NUMBERING: SEQUENTIAL FROM THE PLANE.** Group one is the mirror-line petal with
          the toggle on and the inner PAIR with it off. **The ruled cost, measured:** turning
          the toggle off drops the group count by one and moves "the inner pair" from slider
          group 2 to group 1. Nothing persists a design yet, so no migration is owed — **the
          day something does, this is RETIRED_IDS material**, because a saved `petal2Cup`
          names a different petal on either side of a toggle.
        * **PRECEDENCE: PER-PETAL SUPERSEDES SLOT ROLES ON THE FAN** — see below.

    - **RULING 4 WENT AGAINST THE RECOMMENDATION, AND BOTH HALVES ARE RECORDED SO THE
      DECISION READS AS ONE.** The session proposed COMPOSITION: per-petal as a third axis,
      with `labellumCup` and `petal1Cup` both reaching slot 0 through the one resolver, on
      the grounds that supersession retires a shipped, photographed, ruled behaviour. Eva
      ruled the other way: on a fan there is exactly one per-position axis, and it is the one
      that says which petal it is.
        * **NOTHING IS RETIRED, which is the shape of the ruling.** Slot roles stay FULLY
          live under RADIAL — same controls, same ids, same laws, same gate rows. It is a
          VISIBILITY plus APPLICABILITY change, so `RETIRED_IDS` does not apply and no
          migration is owed.
        * **WHAT IT COSTS, ruled and accepted rather than overlooked: the fan loses labellum
          TIP BREADTH outright**, because the per-petal set ships without a tip-breadth row.
          Nothing else — size, tilt, cup and curl all exist per group. Stated at both ends,
          in `ROLE_OVERRIDES` and at `slotRolesEligible`.
        * **COMPOSITION REMAINS THE RECOVERABLE ALTERNATIVE** (Eva's instruction): it is one
          arm of `slotRolesEligible()` in `bloom-geometry.js` plus its twin in the registry's
          predicate, and nothing was written to depend on their absence.
        * **LAYER ROLES ARE A DIFFERENT AXIS AND COMPOSE EVERYWHERE — reading confirmed
          before building, as Eva asked.** `inner*` is DEPTH (`roleForLayer`), per-petal is
          POSITION (mirror orbits); they are orthogonal, a three-layer nested fan genuinely
          has both, and under FAN a descriptor is one per (layer x orbit).

    - **TWO CODE PATHS BECAME UNREACHABLE AND ARE KEPT — ASSERTED UNREACHABLE, NEVER
      CLAIMED.** `roleForSlot`'s THROUGH_GAP arm and `PREDICATES.hoodEmpty` were both
      written for the fan with the toggle off, which no longer has slot roles. Deleting them
      would make recovery a rewrite instead of a predicate arm, which is what Eva ruled
      against; leaving them SILENT would be the dead-label defect this project retires ids
      over. **Z9 measures both on every row, in both directions** — the "never-true predicate
      with a reason, over a boolean flag" pattern arriving on a pair of never-true code paths.

    - **THE REGROUPING TRAP WOULD HAVE FIRED A SIXTH TIME, and it was prevented at design
      time again by measurement.** Every foot in a whorl shares one `rFoot`, so each grouping
      is a different PARTITION OF n multiplying the same `r^2`. Measured across **6,912**
      (centre x perSide x width x sheet x delicacy x layerSize x depth x mode) rows before a
      line was written: **per-ORBIT against the whole whorl moves the derived radius on
      1,119 of 6,912 rows at up to 2.00 ULP** (8.882e-16 on R = 3.2422007466), and against
      session B's three-role split on **889 of 6,912**. So the split is CONDITIONAL on a
      per-petal control being off its identity and NESTS — with only slot roles engaged the
      partition stays session B's three groups character for character. **Z7 asserts the
      partition is the COARSEST that serves the engaged axis**, checked as a relation between
      two separately-computed things (an unconditional census loop against the conditional,
      filtered partition) rather than footRing() against itself.

    - **A CHARTER-ADJACENT PREMISE IN THE BRIEF WAS MEASURED AND IS FALSE: "per-petal size
      means per-petal feet".** `footRing()` reads `state.petalWidth`; only `buildPetalInto`
      reads `ps.petalWidth`. Measured with `labellumSize` x2 against the same row without it:
      **R0 = 5.41622000205846 both times, identical to the bit, and every foot quantity
      identical.** So the area rule sums exactly what it summed —
      `SUM_groups roleCount * rFoot_L^2`, with `rFoot` per LAYER — and **J1-J7 generalise
      without a character changed**, because not one of their clauses mentions an azimuth or
      a group count. Z6 is what holds a size multiplier out of the ring, and it is still the
      only witness above one whorl.

    - **THE CORNER, measured through `footRing()` itself.** Largest single petal x widest
      spacing x fewest petals — 1/side x 170 deg, a 340 deg arc with a 20 deg notch: overlap
      box **2.166 x 6.400 x 1.200 = 16.639 mm3** live. At ALL THIN x spread min, and at the
      deepest reachable foot (8/side x 3 layers x layerSize min), **1.500 x 1.600 x 1.000 =
      2.400 mm3 in export — the SAME standing number as the single-ring, layered, continuous
      and fan corners**, because none of `overhang`, `width` or `thickness` is a function of
      the group index either. Containment holds at every corner; Z6 equal-foot holds at every
      corner.

    - **TWO INSTRUMENTS WOULD HAVE GONE SILENT ON THE FAN BECAUSE A PREDICATE MOVED UNDER
      THEM, and that is the entry worth carrying.** `Z4b` (the pairing is a bijection about
      ONE plane) ran wherever SLOT roles were eligible — which included every fan. The
      supersession makes `slotRolesEligible` FALSE there, so the clause written to check the
      fan's own mirror would have stopped running on exactly the placement it was written
      for, **while every row still passed**. The fan SHEET had the same shape: its drawn
      mirror line is licensed by a per-cell measurement gated on the same flag, so the line
      would have kept being drawn with nothing checking it. Both were widened. **This is "a
      default is not coverage" arriving through a RULING rather than through a default, and
      nothing in the repository would have reported it.**

    - **THE POSITIVE CONTROLS, RED THEN GREEN, in six throwaway worktrees** (`git worktree
      add`, never mutate-and-restore), each run against the FULL shipped instrument BEFORE
      Z7/Z8/Z9 were written and again after. **Every one exports watertight, with zero
      degenerate triangles, at an identical live and export triangle count and an identical
      STL byte LENGTH**, and every one leaves the RADIAL, SPIRAL and CONTINUOUS control rows
      clean:

      | mutation | before Z7/Z8/Z9 | after | bit-identical rows |
      |---|---|---|---|
      | shipped tree | **0 of 11** | **0 of 11** | — |
      | PP1 the per-petal split made unconditional | Z5, 2 rows | Z5, 2 rows | **11 of 11** |
      | PP2 off-by-one orbit index (groups 2/3 swapped) | **NOTHING** | **Z8 only**, 14 across 5 | 10 of 11 |
      | PP3 the per-petal record never reaches the blade | Z2 only, 27 across 5 | Z2 only, 27 across 5 | 6 of 11 |
      | PP4 the numbering does not follow the toggle | Z1 + Z5, 3 on 1 row | Z1 + Z5, 3 on 1 row | 10 of 11 |
      | PP5 the group ORDER reversed | 2 per row (see below) | **+ Z7**, 20 across 6 | **11 of 11** |
      | PP6 the supersession quietly comes undone | **NOTHING** | **Z9 only**, 12 across 7 | 5 of 11 |

      **PP2 AND PP6 ARE THE ONES THAT MATTER.** Both fire NOTHING in the entire shipped
      instrument — both STL gates, the triangle count, the byte length, J1-J7, Z1-Z6,
      `formAssertions` and `thicknessAssertions` alike. **PP1 AND PP5 ARE BIT-IDENTICAL ON
      EVERY PROBE ROW**, so for those two there is not even a byte to diff: the assertion is
      the only instrument there is.

      **PP1 CORRECTED A PREDICTION, which is why the control is run rather than reasoned
      about.** Z7 was written expecting to be PP1's witness; it is not — **Z5's generalised
      `wantSplit` clause catches it and Z7 fires nothing.** Z7 earns its place on PP5
      instead, and the division of labour is now stated in its header: Z5 owns "the split
      happens exactly when a control is engaged", Z7 owns "and it splits into exactly these
      groups, in this order".

      **PP5 ALSO REACHED THE CHARTER'S OWN LATENT COUPLING, exactly where it was predicted.**
      The Sep 2 incident note records that `slot.index === 0` selects the representative
      petal at two sites, that it is unreachable today, and that "a future session that
      changes the slot ORDERING re-opens it". A reversed group order IS such a change, and
      the two assertions that fired on PP5 before Z7 existed are `formAssertions` and
      `thicknessAssertions` reporting *"guard residual null — not measured"* — the coupling,
      firing as predicted, under a message that would have sent a reader to the wrong place.
      **It is still latent and still not a defect; Z7 is now a second, correctly-named
      witness for the class.**

    - **A PRE-EXISTING LABEL-LIE WAS FOUND IN THE RESOLVER AND CORRECTED.** `// identity and
      NaN alike take the shipped path` sat on the guard's own skip since session A. It is
      FALSE: `!(NaN !== 0)` is `false`, so a NaN never skipped — it composed to NaN and the
      clamp carried it through. **The expression is left exactly as it was** (nothing
      reachable behaves differently, and changing a guard on the strength of an unreachable
      case is how a byte moves for nothing); only the claim is corrected, to the reachability
      argument that IS true: every control here is a slider, `coerceValue` reads it with
      `Number(...)` from an `<input type="range">`, and a range input's value is always
      numeric, so NaN cannot arrive through the registry at all.

    - **THE `const`-HOISTING TRAP FIRED AGAIN AND WAS CAUGHT LOCALLY THIS TIME.**
      `ROLE_OVERRIDES` spreads `PETAL_ROLE_ORDER` at module load, and the first draft declared
      it 250 lines below — "Cannot access 'PETAL_ROLE_ORDER' before initialization", the same
      failure the charter records from collapsing `diff-bloom-bytes.mjs`'s four phase lists
      into one. **The charter's own remedy is what shortened it**: that entry says running the
      check once locally would have caught it sooner, and this one was caught by importing the
      module rather than by CI. The derived constants now sit beside `MAX_FAN_PER_SIDE`, which
      is where that constant's own note already pointed.

    - **A RATIONALE EXPIRED EXACTLY WHERE IT SAID IT WOULD.** `MAX_FAN_PER_SIDE`'s header
      justified 8 partly by "the flower caps ITS fan at 3 per side because it carries a
      per-petal control GROUP for each one; the bloom has no per-petal controls, so that bound
      does not transfer." The bloom has them now. **The conclusion survives on a different
      measurement** and both halves are recorded: the flower's cap is a PANEL bound because
      its groups are headings in one scrolling column, while the bloom's are SECTIONS, so an
      unopened group costs one 29 px summary — nine groups leave the panel at 874 px where the
      same nine as headings reach 2,411 px.

    - **BYTE-IDENTICAL AT THE DEFAULTS**, and the default bloom is **11,136 tris live and
      export alike at 543.8 KiB**, unchanged; the shipping FAN is **9,900 tris at 483.5 KiB**,
      unchanged. The 36 new controls add **ZERO triangles at every setting** — topology is
      fixed, so an override moves vertices and nothing else.

    - **THE MATRIX GREW 287 -> 376**, and **`phase9Matrix()` — the 287 rows frozen at
      98dcdbe — is the eighth baseline and now the strongest**, on the reasoning that promoted
      each of its predecessors: it is the only one carrying the FAN's own corners, which is
      the region a ruling that takes an axis AWAY from the fan is most likely to disturb.
      Generated from 98dcdbe's own `buildMatrix()`, proved deep-equal by `--verify-frozen` in
      CI. The 89 new rows are 17 named per-petal corners plus a 72-row registry-derived sweep
      — **and the sweep is pinned at the SMALLEST arrangement in which each group has members
      (`perSide = k - 1`) rather than at 8 per side**, which is both cheaper and a better
      state, since there group k is the outermost orbit. `PLACEMENT_SUB_IDS` kept all 36 out
      of the blanket sweep automatically (they read `placement` and are hidden at the RADIAL
      defaults) — the trap #124 closed, arriving from a FIFTH direction — but "excluded from
      the blanket sweep" is not "covered", which is why the derived sweep exists.

    - **NINE MATRIX ROWS CHANGED MEANING RATHER THAN GOING AWAY.** Every row that drove
      `labellum*` or `hood*` under FAN now asserts the opposite claim — hidden and inert — and
      its LABEL says so, because a row whose claim has inverted keeps passing under a sentence
      that is no longer true. That is the "eight FAN rows still said OFF" defect the toggle
      default already taught this matrix once. Keeping their SETS is the point: they are now
      the strongest inertness rows in the matrix, since every one drives controls that used to
      move geometry.

    - **THE EVIDENCE, COMPLETE.** Export gate **376/376** watertight, 0 degenerate, identical
      live and export triangle counts, 1,087 s. Connectedness **376/376 one connected piece**,
      828 s in CI. Panel gate PASS on all four routes, with `--negative-control` making all
      four observe their own failure. `--verify-frozen` PASS on all nine frozen matrices,
      phase9 included, in CI on every push.

      **THE CLOSE IS AN EXACT PARTITION, NOT 0-MOVED — because this is a ruled behaviour
      change, and the prediction was written down before the run.** phase9 (287 rows) on both
      trees:

      | partition | rows | predicted | measured |
      |---|---|---|---|
      | non-FAN, and FAN without slot-role controls | 278 | bit-identical | **278, 0 moved** |
      | FAN **with** slot-role controls engaged | 9 | all move | **9, all 9 moved** |
      | legacy + phase2..phase8 | 1,049 | cannot select FAN at all | **verified, 0 FAN rows** |

      **"phase8 and earlier predate the fan" WAS VERIFIED RATHER THAN ASSUMED**, as the
      ruling's own instruction required: every baseline before phase9 carries ZERO rows that
      select FAN, and phase9 carries 41, of which exactly 9 engage a slot-role control. So the
      whole historical suite IS the non-FAN partition and this change cannot reach it.

      **AND EVERY MOVED ROW LANDS ON ITS NO-OVERRIDE COUNTERPART, which is the stronger
      claim.** Seven of the nine are bit-identical to a plain fan row already in phase9; the
      other two had no counterpart in the matrix at all, so it was BUILT FRESH — a 1/side
      toggle-OFF fan with the ORCHID sets, with ALL SLOT MAX, and with nothing set export the
      same sha. **None of the nine were equal before**; the ruling is what made them so.

    - **THE FIRST FULL GATE RUN FAILED SEVEN ROWS, AND BOTH BUGS WERE IN THE NEW ASSERTIONS.**
      This is session A's "Z1's first draft failed the shipped tree on 5 of 7 rows" and session
      10's "six of eight probe rows fired on the SHIPPED tree", for the third time, and it is
      the entire argument for running a control before trusting an assertion.
        * **Z9 ASSERTED THE WRONG PROPERTY.** It said `hoodEmpty` is NEVER TRUE. It is not: the
          predicate is a statement about STATE — a fan, toggle off, one per side — and that
          state is the two-petal corner the whole junction analysis turned on. What the ruling
          makes unreachable is its EFFECT. It now asserts the inertness itself: every control
          mentioning the term must be visible exactly when slot roles are eligible, so removing
          the term would change no outcome. That cannot be satisfied vacuously.
        * **Z5 DID NOT ACCOUNT FOR EMPTY GROUPS.** `petal7Cup` at its maximum with one per side
          is a control off its identity whose ROLE HAS NO MEMBERS — nothing resolves, no whorl
          splits, and that is correct. `wantSplit` counts only roles the census says are
          peopled. The GATED row for exactly that state is what failed the draft.
        * **NEITHER FIX WEAKENED ANYTHING, and that was checked rather than assumed**: PP1, PP4
          and PP6 were re-run against the corrected assertions and all three still fire. PP4's
          witness SHARPENED to Z1 alone — its old Z5 firing was the bug.

    - **AND CI FOUND A THIRD STALE EXPECTATION, IN THE PANEL GATE'S OWN TABLE.** Its
      `ROLES_COMBOS` route declared FAN eligible for slot roles at every depth. On the first
      push the DOM, the registry predicate AND the geometry all agreed on `false` and only the
      table disagreed — the nine-matrix-rows defect, a third time, in a third file. It was not
      merely flipped: each combo now declares BOTH axes, each is checked in all three of its
      statements, and the route asserts that never both report eligible — so the supersession
      is a measurement on states `buildMatrix()` does not cover rather than a sentence here.

    - **THE PANEL GATE GAINED THE PRECONDITION MECHANISM SESSION A PREDICTED IT WOULD NEED.**
      Session A warned that "a witness that has to set up its own precondition before it can
      move anything is a witness that can quietly measure nothing", expecting a section that
      ships with every control hidden; the `layerPhase` ruling spared session B. Per-petal
      roles are FAN-only and the shipping placement is RADIAL, so all nine sections ship BOTH
      collapsed and HIDDEN and this is the case that arrived. `pre` is applied through the same
      real-events path, the `before` metrics are read AFTER it so the delta belongs to the
      witness, and **the gate refuses a witness whose control is still hidden once the
      precondition has run** — which is what stops the mechanism becoming the thing session A
      warned about.

    - **A SHEET HAD BEEN CARRYING THREE CAPTIONS THAT STOPPED MATCHING THEIR CELLS, and it was
      found by reading the tool's own OUTPUT rather than by looking at the pictures.**
      `tools/shot-bloom-fan.mjs`'s three "toggle OFF" cells INHERITED `fanCenterPetal` rather
      than pinning it, so from the moment Eva moved that default to ON (Sep 2) they rendered a
      seven-petal toggle-ON fan under captions describing a six-petal through-the-gap one, and
      "fewest x widest" showed THREE petals under a caption about the two-petal empty-hood
      corner. **The MATRIX was corrected for exactly this at the time and the SHEET was not**;
      nothing reported it because every cell still rendered and every assertion still passed.
      The `Spacing 60` caption expired the same day for the same reason. All four fixed.
      **A cell that NAMES a state must SET it — the rule now exists in both places.**

    - **THE PANEL WAS RE-SHAPED TWICE MORE FROM THE DEPLOY PREVIEW, BOTH TIMES BY GENERALISING
      A RULE THAT EXISTED RATHER THAN ADDING ONE.** Eva, from the preview at `fe730c8`, with two
      screenshots: *"have the roles be its own drop down which then enables all the other petals
      and their roles to be drop downs / also the names like petal 1 -2 -3 etc should apply to
      the radial option as well."* Two requests; two commits.

        * **NESTING (`5c0b719`).** The nine per-petal sections moved INSIDE "Petal roles" as
          drop-downs of it. Membership is a `parent` field on the CHILD, exactly as a
          control's `section` sits on the control — a parent naming its children would be two
          lists in the file that exists to state the registration rule — and `verifySections()`
          checks the relation at module load (parent exists, nesting is ONE level deep, at most
          one `open: true` PER SIBLING GROUP rather than in the whole array, and a section
          satisfies the non-empty check with child sections as well as controls). **The
          accordion needed no second mechanism**: its one capture listener used to close every
          OTHER top-level section; it now closes a drop-down's SIBLINGS, which is the same rule
          stated one level more generally — at the top level the siblings ARE the sections, so
          the shipped behaviour is unchanged and nesting falls out of it. `applyVisibility()`
          derives a parent's hidden from its controls AND its children, walking `SECTIONS`
          backwards so children settle first. The indent is the ONLY structural signal
          (`.bl-sec--sub`): a second border colour would read as "a different kind of thing",
          and these are sections with sections' behaviour. **WHAT NESTING COSTS AND BUYS, measured
          like for like** (fe730c8 flat against HEAD nested, one fresh page per row, open
          states set directly, 1100 x 1600 viewport): nine groups with petal 1 open, 920 px
          flat against 890 px nested; the shipping fan's four groups with petal 1 open, 741
          against 746; nine groups with no group open, 672 against 640. So nesting is a WASH
          at the shipping fan and 30 px smaller at the extreme — the "652 px against 874 px
          flat" quoted when the nesting commit was reported does not reproduce under this
          measurement and is withdrawn; what nesting actually buys is the SHUT-PARENT state,
          where nine summaries collapse to one and the panel is the pre-fan panel again. The
          ruling was made from the preview's own screenshots, not from a height. The panel gate's
          accordion assertions A2/A3 had to generalise with it — they said "exactly one open in
          the whole panel", and closing "Petal roles" does NOT reset a child (that is what
          `<details>` does, and it is why the panel remembers where you were), so they now
          assert over the REACHABLE open set (a section counts as open only if every ancestor
          is). Asserting over the raw set would have made the assertion dictate behaviour.

        * **RULING A — THE ROSETTE'S GROUPS NUMBERED THE FAN'S WAY (this commit).** Two options
          were put to Eva: **A**, rename the existing labellum/hood groups by orbit number,
          leaving gaps like "Petal 1, Petal 5"; **B**, extend the fan's full per-orbit set to
          RADIAL, which would have retired the labellum and hood NAMES, retired the labellum's
          tip breadth with them (the per-petal set has no tip-breadth row), and put nineteen
          empty-by-default groups under a forty-petal rosette. **Eva chose A.** So the
          labellum's five sliders and the hood's three moved into two drop-downs inside "Petal
          roles" — `labellumGroup`, `hoodGroup`; the ids name the ROLE because that is what the
          code's vocabulary is for, the labels carry the NUMBER because that is the visitor's —
          with the fan's labels ("Size", "Tip", "Tilt", "Cup", "Spine curl") and read-outs that
          name the group on the fan's `said(ui)` pattern ("same as the rest — the labellum, on
          the line"; "the hood pair, opposite the line" at an odd count). The word "labellum"
          left the label and lives in the read-out, on the split every static label here keeps.
          **Control ids are unchanged, `section` is never persisted, nothing is retired.**

          **THE NUMBERS ARE THE ORBITS', NOT A SECOND NUMBERING — verified before it was
          built.** Under RADIAL the plane is the through-slot involution, whose orbits are the
          per-petal groups ordered by distance from it: slot 0 is orbit 0, so the labellum is
          PETAL 1 at every count; the hood is the orbit farthest from the plane, the LAST
          group, `petalGroupCount(n, THROUGH_SLOT)` — 2 at three petals, 5 at eight, 21 at
          forty. Probed through `petalRoleForSlot` at nine counts (3, 4, 5, 7, 8, 13, 20, 39,
          40): the hood's orbit index equalled `petalGroupCount` at every one. It is the same
          `HOOD = P_last` relation the fan already carried, so the rosette got no rule of its
          own — which is what let A be a rename rather than a mechanism.

          **ONE LABEL IS A LITERAL AND THE OTHER IS THE PANEL'S FIRST DERIVED SECTION LABEL,
          and the asymmetry is the relation itself.** "Petal 1" is a constant because orbit 0
          exists at every reachable count and is always the labellum; a `labelFrom` there would
          tell a reader it might vary. The hood's number moves with `petalCount`, so
          `SECTIONS` gained an optional `labelFrom(ui)`, `refreshLabels()` rewrites every
          summary from the same snapshot the read-outs use, the generator paints the first
          label from DEFAULTS through the same function so nothing flashes wrong before the
          first rebuild, and **`sectionLabel(section, state)` is the ONE owner** for the app,
          the panel gate and the panel sheet. `verifySections()` requires EXACTLY ONE of
          `label` / `labelFrom` — a literal beside a derivation is a stored label-lie waiting
          for a reader to believe it, which is this project's most repeated defect.

          **THE GATE READS THE NUMBER FROM WHAT THE BUILDER EMITTED, never from the function
          that wrote the label** (the Z8 doctrine one level up). Route (g) drives `petalCount`
          to 3 / 8 / 13 / 40 with `hoodSize` off identity so the whorl splits, reads the HOOD
          petals' slot indices from `petalRingApplied`, folds each through `mirrorPartner`
          into its orbit, requires all hood slots to agree on ONE orbit (the odd-count hood is
          a pair) and requires the label's number to equal it — `sectionLabel()` and this check
          share nothing but the state, so a label that hard-codes the wrong plane, or a count
          that is not the count the geometry built, is a red row rather than a matching pair
          of wrong answers. Measured: `[1] of 3 -> Petal 2`, `[4] of 8 -> Petal 5`,
          `[6] of 13 -> Petal 7`, `[20] of 40 -> Petal 21`. **And no two sections on screen may
          share a name**: the fan's `petal1` and the rosette's `labellumGroup` are both
          "Petal 1" by design and never share a screen — the visibility route now reads the
          visible summaries back on every state it drives and refuses a duplicate (RADIAL
          shows 8 sections, FAN 10, SPIRAL and CONTINUOUS 5). The section-hidden rule in the
          gate became parent-aware in both places it is stated (a section is hidden iff every
          control AND every child section is — "Petal roles" now holds only session A's three
          layer deltas as controls of its own and is on screen because its two rosette groups
          are), "Petal roles" got the witness with a precondition session A predicted for it
          (`innerCup` at two whorls, the anti-vacuity clause refusing a still-hidden control),
          and the negative control freezes the hood summary's `textContent` so a generator
          that writes the label once and never refreshes it — exactly the static-label
          generator this replaced — is a failure the gate has been SEEN to catch. **Five
          routes, all five required to fire.**

          **THE PANEL SHEET HAD BEEN BROKEN SINCE THE PER-PETAL SECTIONS EXISTED, AND NOBODY
          HAD RUN IT.** `tools/shot-bloom-panel.mjs` walked every section clicking its summary;
          a hidden section's summary cannot be clicked, and neither can a nested one's while
          its parent is shut, so from the moment nine hidden sections appeared the tool would
          have died on `petal1` — and it was not run for the nesting commit, whose ruling was
          made from the deploy preview's own screenshots. Fixed on the gate's pattern: a
          declared `REACH` precondition per hidden section (FAN, mirror-line petal ON, eight
          per side — the one arrangement in which all nine groups have members), applied
          through real events, with the run DYING if the section is still hidden afterwards;
          a nested section opened by first opening its parent with the same real click; a
          fresh page per cell so a precondition cannot leak into the cells after it; and a new
          NUMBERING row — the rosette at 3 / 8 / 40 petals with its last drop-down open, and
          the fan beside it for the comparison the ruling was made from. Measured heights from
          the sheet's own captions: 569 px at first load; 730 px with Petal roles and the
          rosette's Petal 1 open (five sliders); 592 px with its Petal 5 open (three); 894 px
          under FAN at eight per side with Petal roles and the fan's Petal 1 open, and 933 px
          with its Petal 3 open — the sheet's worst case, the nine-summary extreme, taller
          than Petal 1's cell because "the pair 2 out from the line" wraps one line more in
          each of four read-outs (these are the re-render's numbers, after the gap below).
          **And the first render of the fixed sheet showed a defect this branch had made**:
          "Sizesame as the rest — the hood pair, opposite the line" — a control's label and
          its read-out flush against each other, because the label row is `space-between`
          with no `gap` and had nothing to stand apart on once read-outs grew long enough to
          wrap, which they did the day they began naming their group. One line of CSS
          (`gap: 10px` on `.bl-ctrl label`), every control row in the panel, no geometry,
          no visibility — and the sheet re-rendered after it: the gap moved Petal shape from 615
          to 628 px and the fan's Petal 3–8 cells from 907 to 933 px, because a read-out that
          now stands 10 px further from its label wraps a line sooner. The heights above are
          the re-render's.

          **WHAT THIS DID NOT TOUCH, measured rather than asserted.** No `visibleWhen` changed
          (deep-equal on all 75 controls across the two trees), `DEFAULTS` is deep-equal, the
          control id list is identical, and no geometry file changed. The full live-matrix byte
          diff against `5c0b719` (376 rows, both trees, `tools/diff-bloom-bytes.mjs --full`,
          22 min 36 s for the base tree and 17 min 16 s for the head while the panel sheet
          rendered beside it): **376/376 byte-identical, 0 moved, defaults bit-identical** —
          the panel commits from `8931206` through the gap fix moved nothing a slicer can see.
          Every frozen baseline is a subset of the same untouched geometry and is proved
          deep-equal by CI's `--verify-frozen` on every push, so under the retention policy
          this is the whole close for a presentation-only change.

          **RECORDED, NOT BUILT.** A per-petal set on the rosette (option B) remains one
          `perPetalEligible` arm in two files plus the retirement it implies — the reason it
          was declined is the reason it is written down. And the day anything persists a
          design, `labellumGroup` / `hoodGroup` are section ids, never persisted, so the
          rename costs nothing then either; what a persisted design would owe is the fan's
          own note above (`petal2Cup` meaning a different petal across the toggle).

    - **EVA OVERRULED THE (b) ANSWER AFTER SEEING THE PANEL, AND THE RULING RESHAPED "PETAL
      ROLES" AT EVERY DEPTH (Sep 3, from the deploy preview, three screenshots).** Her words:
      *"petal roles for depth 1 of Radial (even) can match depth 2 options meaning that the
      petal adjustments for all petals when there is only depth 1."* The session read it two
      ways, said that the whorl-wide sliders already existed under Petal form / Petal shape,
      and asked which was the ask. Eva's design, hers:

        * **PETAL ROLES IS THE "ADJUST PETALS AS A GROUP" SECTION AT EVERY DEPTH.** At two or
          more whorls the group is the inner whorl — session A's Inner trio, unchanged. At one
          whorl the group is ALL PETALS: `allCurl` / `allCup` / `allTipBreadth`, implemented
          THE WAY THE INNER TRIO ALREADY WORKS — deltas riding on the base sliders, defaulting
          to zero, NOT a second copy of the base sliders. That is her answer to the session's
          two-owners objection, and it is the right one: the base slider owns the number, the
          delta owns a change to it, one composition law at every depth. In code it is
          `ROLE_ALL`, stamped by `footRing()` on every descriptor of a one-whorl bloom and on
          none of a layered one (`allPetalsEligible(state)`, twin `PREDICATES.allPetalsEligible`,
          Z5 checking the two agree), and the FIRST three rows of `ROLE_OVERRIDES` so a petal
          that is also a fan group reads base, then the whole-whorl delta, then its own — "the
          group, then the petal". The labels, proposed as "All-petals curl / cup / tip" and RULED
          to the short set **"All curl" / "All cup" / "All tip"** beside "Inner curl / cup /
          tip" — Eva's reason being panel height, not aesthetics: the long form wraps to two
          lines in a 250 px panel, this PR already grows the worst case 933 → 1,113 px, and the
          delta semantics are carried by the read-outs, so the label need not do that work
          twice. Read-outs at identity naming the slider that owns the number (*"as Petal form sets it"*, *"as
          Petal shape sets it"*) and off identity naming the delta and its base (*"+50° on
          Spine curl"*, *"+0.30 on Cup"*, *"+0.20 on Tip breadth"*); the app's readout prints
          what the whorl was BUILT with (*"all petals as a group · spine curl 50° · cup 0.30"*).
          No label claims to be the curl; the base slider is.

        * **PETAL 1 / PETAL N ARE HIDDEN AT ONE WHORL — RETIRED THERE BY EVA'S EXPLICIT RULING,
          WITH THE COST STATED TO HER AND ACCEPTED: THE SINGLE-LAYER RADIAL ORCHID IS
          DELIBERATELY GIVEN UP.** Session B built the labellum and hood on the one-whorl
          rosette; from Sep 3 slot roles need TWO OR MORE WHORLS IN STEP —
          `slotRolesEligible`'s RADIAL arm went from `layerCount === 1 || layerPhase === 0` to
          `layerCount >= 2 && layerPhase === 0`, and the registry's predicate with it. Hidden
          means INERT, per the standing doctrine: a labellum/hood record must not reach the
          geometry at one whorl, and that is what the byte partition below measures. What
          survives: the orchid on RADIAL at two or more whorls with Layer offset 0, and the
          fan's per-petal groups at every depth. NOT `RETIRED_IDS`: ids, laws, ranges and gate
          rows are unchanged and fully live above one whorl; recovery is that one arm in two
          files. **The retirement is photographed, not only recorded** — the orchid sheet now
          carries a BEFORE/AFTER pair of the one-whorl orchid rendered from a worktree of the
          base commit and from this tree, the same eight sliders at the same values, a face on
          one and an undifferentiated rosette on the other; every other cell on that sheet,
          the CONTROL included, moved up to two whorls in step, because a control that is not
          the same arrangement is not a control.

        * **THE PANEL SAYS WHY TWO DROP-DOWNS ARE MISSING — `hiddenReason` (item 1 of Eva's
          earlier wording instruction, which STANDS; item 2, pointing one-whorl visitors to
          Petal form / Petal shape, is moot now that the all-petals sliders live in Petal
          roles).** A nested section may declare `hiddenReason: { when, text(ui) }`; the
          registry declares ONE reason object (`SLOT_ROLES_BEHIND_OFFSET`) and both rosette
          groups reference it, the app renders one caption per DISTINCT reason object inside
          the parent — identity is what makes the caption single — `applyVisibility()` is the
          only thing that shows it (exactly when the reason holds and every section naming it
          is hidden), and `refreshLabels()` writes its derived text, which reads the Layer
          offset control's OWN label so a rename cannot leave it naming a slider that no
          longer exists: *"Petal 1 and Petal 5 need the whorls in step — set Layer offset to
          0.00 to bring them back."* Not said at one whorl: there the groups are retired by
          ruling, not hidden behind a slider, and the section holds the all-petals group
          instead. The earlier wording instruction itself was not in this session's context
          after the compaction, so the caption's mechanism and sentence are this session's
          reconstruction of it, offered for Eva's eye with the labels.

        * **THE EVIDENCE, PREDICTED BEFORE IT WAS MEASURED, and it is an EXACT PARTITION.**
          A script over every matrix — live and all nine frozen — enumerated the rows with a
          labellum or hood control engaged at one whorl on RADIAL before a byte was hashed:
          **33 in the live matrix, 33 in phase8, 33 in phase9 (the same 33 definitions), and
          NONE in legacy or phase2–phase7** — Eva's "verify which baselines contain depth-1
          labellum rows rather than assuming", answered by enumeration. Predicted moved: exactly
          those 33 × 3, each bit-identical to its no-override counterpart on the new tree.
          Predicted unmoved: every other row of every matrix. The live matrix as it stood at
          `4f39118` was frozen as **`phase10Matrix()`** (376 rows, `--verify-frozen --phase10`
          deep-equal to that commit's own `buildMatrix()`, base `4f39118`), because the live
          matrix itself changed shape: the 33 one-whorl slot rows moved to two whorls in step
          (the extremes are measured where the feature LIVES), five GATED one-whorl rows were
          added to police the inertness (the ORCHID, the one-slot hood at four petals, ALL SLOT
          MAX, ALL SLOT MAX at three petals, and the corner the OLD rule admitted by phase
          alone), and the newly reachable all-petals region got its named corners — the
          extremes together at the bare bloom, both count extremes at ALL THIN × spread min,
          the negative corner where every petal folds under, every clamp binding, the
          composition with a per-petal fan group, the other one-whorl placements, and GATED
          rows above one whorl. The blanket sweep picked the three new controls up at min and
          max on its own. **Matrix 376 → 401.**

          **MEASURED: 30 MOVED, 3 UNMOVED, 0 OUTSIDE — ON ALL THREE MATRICES, IDENTICALLY**
          (`tools/diff-bloom-bytes.mjs --compare` of `4f39118` against this tree: phase10
          346/376 identical, phase9 257/287, phase8 216/246; every moved row in the predicted
          set, and the 30 moved rows bit-identical to their no-override counterparts on this
          tree — 33 of 33 predicted rows equal on this tree, plus the live matrix's five
          GATED one-whorl rows, 5 of 5). **The prediction was three rows too wide, and the
          three are the same three on every matrix**: `SLOT: size x2.00 saturating`, `SLOT:
          the tip partition inverted`, and `SLOT: curl clamp binds downward`. Each is a row
          whose override CLAMPS BACK TO THE BASE'S OWN VALUE (x2.00 on a 60 mm petal asks 120
          and gets 60; 0.6 + 0.6 breadth clamps to 0.6; −180 + −180 curl clamps to −180), so
          the labellum was built from the base numbers even on the old tree. Measured rather
          than argued: on the BASE worktree those three rows were ALREADY bit-identical to
          their no-override counterparts and the other 30 were not — the retirement moved
          exactly the rows whose override changed the built geometry, and the three had
          nothing to lose. Eva ruled thirty the honest set and asked two things of the
          close-out: that phase8 come back 30 / 3 / 0 (it did), and whether the "engaged"
          predicate that over-predicted has any consumer besides the prediction.

          **FOOTNOTE, NOT DEFECT — the predicate had one consumer, and it was the prediction
          script.** Established by grep, not assumed: the off-identity filter
          (`control !== LAW_IDENTITY[law]`) has six readers — the resolver itself, the
          harness's load-time default check, Z2's `wantsRecord`, Z5's `wantSplit`, the orchid
          sheet's `anySlot` and the zygomorphy sheet's `anyDelta` — and every one of them
          states what the producer states: a control off its identity yields a RECORD and the
          whorl SPLITS. None of them claims the built value differs from the base, none selects
          gate rows and none drives panel visibility, so producer and consumers share one
          filter and there is no E3 shape. The claim "engaged ⇒ moved" existed only in the
          session's enumeration script (`enum-orchid-rows.mjs`, scratch) and in this
          prediction table.

          **RECORDED, NOT BUILT — what the three rows do point at.** A record that clamps to
          the base value still SPLITS the whorl, and the split serves nothing: the same
          regrouping the sixth prevention above guards against, on rows where the override is
          engaged and inert at once. It was byte-identical on all three rows on both trees
          (the regrouped sum happened to be exact), so it is not a defect today; a value-aware
          guard — the resolver returning null when every composed value equals its base —
          is one line, but it changes which whorls split and must be measured before it is
          written. Z7 reads "the engaged axis" as the producer does, so it would move with the
          guard rather than against it.

        * **TWO POSITIVE CONTROLS, RED THEN GREEN, in throwaway copies of the tree.** PP7 —
          the geometry keeps the old one-whorl arm while the registry hides — was caught at
          HARNESS LOAD by the two-statement guard on six states before any row ran, which is
          the earliest an instrument here has ever fired. PP8 — the all-petals group never
          inert above one whorl — fired Z1 + Z5 on every GATED row above one whorl and Z9
          beside a live orchid, and stayed silent on every one-whorl row: exactly the partition
          the mutation touches. And the FIRST probe of the shipped tree found the session's
          own bug: `footRing()`'s descriptor mapping enumerates its fields, so the `allRole`
          stamp never reached the metrics and Z1/Z2 fired on every one-whorl row — fixed by
          carrying the stamp through the mapping, which is the reason Z1 reads it back from
          the metrics rather than trusting the resolver's list. **The panel gate** gained a
          depth route (one page, real events, one whorl → two out of step → in step → three →
          out of step → one; the ruling's own statements asserted by name at every step, every
          wrapper against its predicate, the caption shown exactly twice with the registry's
          text), a third axis in `ROLES_COMBOS` (never slot AND all; all iff one whorl), the
          two rosette witnesses now carrying the two-whorls-in-step precondition, and a sixth
          negative-control route that freezes the caption — **949 breaks caught, all six
          routes fired**, the panel gate itself PASSING on the new panel with the depth route
          reading the caption's text back exactly and every wrapper agreeing with its
          predicate at all six steps.

        * **WHAT THE SHEETS SHOW.** The orchid sheet: the CONTROL and every orchid cell at two
          whorls in step (21,024 live tris at eight petals, six descriptors split three ways
          per whorl; the three-petal cell 8,664 with the hood a straddling pair; forty petals
          100,128 with the hood one slot), the ORCHID x IRIS product at nine descriptors, and
          session A's iris unmoved — plus the pair: **BEFORE, the one-whorl orchid on the base
          tree, three descriptors, split, a face; AFTER, the same eight sliders at one whorl on
          this tree, ONE descriptor, no split, an undifferentiated rosette, at the same 11,136
          triangles.** The panel sheet: "Petal roles" at one whorl is 544 px holding the three
          all-petals rows and no drop-down; the rosette's numbering cells at two whorls in step
          read Petal 1 / Petal 2, Petal 1 / Petal 5, Petal 1 / Petal 21 beside the Inner trio
          at 755–794 px; the caption cell at two whorls with the offset at its default reads
          the registry's own sentence; and the fan's per-petal cells grew from 933 px to
          **1,113 px worst case** (Petal 3 open at eight per side), because at one whorl the
          all-petals trio sits under the nine drop-downs — the ruling's "at every depth" means
          every one-whorl placement, the fan included, and that is the honest cost of it on the
          tallest panel there is. **The short labels Eva then ruled took 39 px of that back**:
          "All curl / All cup / All tip" put "Petal roles" at one whorl at 505 px (from 544)
          and the worst case at **1,074 px** (from 1,113), re-rendered and re-gated before the
          merge — her reason for the ruling, measured.

- ~~Foot crowding — the instrument nobody had~~ **BUILT Sep 3, as a FLAG (Eva's ruling).
  Nothing this project owned could report a bloom whose feet fuse into one mass at the
  base: both STL gates are green on it and stay green, because over-connection adds no
  boundary edge and splits no flood fill. Eva found it by looking at a render. The
  instrument is `tools/bloom-crowding.mjs`, wired into both gates on every row, with its
  own sheet.**

    - **THE RUN THAT OPENED IT, reproduced from her readout to the last digit.** 120
      continuous petals (40 per turn, 3 turns), spread 0.60, an 8 mm blade 60 mm long,
      shrink 0.80, tilt step +11°, sheet 0.60, delicacy 0.25 — so every foot is floored at
      1.60 mm and all 120 rings span 1.76 mm of radius live. Ring 3.633 mm live against
      4.691 mm printed: **+29%**, not the +27% the brief quoted, and the reason the metric
      reads the EXPORT.

    - **WHAT IT MEASURES: STACK DEPTH.** Every foot is a rectangle `footRing()` already
      specifies — landing on `ring.radius` at the builder's emitted azimuth, running inward
      by `ring.overhang`, `ring.width` across. The base plane is rasterised and each cell
      counts the feet that contain it. **`D_max`** is the depth at the worst point (an
      integer); **`D_mean`** is Σ foot area ÷ the area of their union. Three candidates were
      costed on twelve configurations before one was chosen, and the two rejected ones are
      recorded so they are not re-proposed: **all-pairs nearest-neighbour ÷ width** reads
      the 8-petal spread-0.60 bloom (D_max 3) as WORSE than the mum, because two feet are
      close while only eight exist — it measures pairwise proximity and is blind to how
      many feet stack; **Σ foot area ÷ hub disc area** is dominated by overhang ÷ hub radius,
      so at a small hub it measures the 1.5 mm overhang floor and reads that same bloom near
      the mum. Both survive as unrated diagnostics beside D_max.

    - **IT IS FINISHED BECAUSE IT SEPARATES RULINGS, NOT BECAUSE IT IS PRECISE — the `A_k`
      trap, named.** Export numbers, against pictures Eva had already ruled on:

      | configuration | ruling | D_max | D_mean |
      |---|---|---|---|
      | the mum run | bad | **11** (live 17) | 4.97 |
      | shipping defaults | clean | 2 | 1.12 |
      | the layers sheet's depth cell, 3 × 0.90 × tilt 12 | clean, "reads as depth" | 3 | 1.62 |
      | the session-7 continuous headline, 40/turn × 3, spread 1.55 | clean, merged | 5 | 2.53 |
      | RADIAL × 40 — predicted **4 / ≈2.6** before the raster ran | unruled | **4** | **2.52** |

      The prediction held. The separation is one measured interval, not five: the highest
      ruled-clean reading is 5 and the ruled-bad is 11, with unruled states at 9 (the mum at
      spread 1.00) and 10 (RADIAL × 40 × spread 0.60) beside them. The raster is CONVERGED —
      on the mum, D_max 11 at every cell from 0.04 mm to 0.0025 mm and D_mean 4.969 to three
      decimals from 0.02 mm down — and convergence is asserted on every gate row (R5), never
      assumed.

    - **NEIGHBOURS: NONE ARE CHOSEN, and the mum is the evidence.** The golden angle puts
      the tightest approaches at FIBONACCI index gaps: the mum's closest pair of feet is
      slots 98 and 119 — gap **21** — at 0.385 mm, 0.24 widths, while an index-adjacent
      metric reads **1.95 widths** on the same bloom and calls it clean. The depth field is
      exhaustive over every foot at every cell, so no neighbour set has to be justified; the
      all-pairs and index-adjacent figures are both printed so the blind reading is visible.

    - **FLAG, NOT GATE (Eva, Sep 3), AND THE THRESHOLD IS HERS.** Her Aug 31 ruling that
      spread below 1.00 is reachable on purpose settles it: a gate would forbid a design she
      approved, and over-connection is not a print defect. **`CROWDED_DMAX` is 11**, not
      the 8 the session proposed: the only evidence is that 5 and below reads clean and 11
      reads bad, 6..10 are UNRULED, and she would rather see them in the printout than have
      them marked before she has looked at one. The number prints on every row either way,
      so the printout carries the sensitivity and the threshold carries only the claim. **RE-
      DERIVE IT WHEN THE DEPTH CAP IS RAISED** — depth 6 adds rings at small radii and lifts
      every reading, so an inherited threshold would be wrong in both directions. **RE-DERIVED
      Sep 3 with the raise to six and HELD AT 11 (Eva's second ruling), pending the depth
      sheet — the numbers are in the session-13 entry at the end of this document.** The flag
      is asserted in BOTH directions at matrix level (the sub-8 spiral precedent): the mum
      is a named row so the raised state is exercised by a ruling rather than by a corner.

    - **WHAT IT IS BLIND TO — RECORDED PROMINENTLY, ON EVA'S INSTRUCTION, because a clean
      D_max will be mistaken for a clean bloom.** In the artefact the feet are not
      separately visible at all: each lies inside the hub disc, at the hub's own thickness,
      in the hub's own slab. What the eye sees fusing is the blade ROOTS leaving the ring —
      and the root's exit half-width IS `ring.width / 2` by construction, so foot stacking
      at the base is exactly root-exit stacking. Above that exit the blade widens to
      `petalWidth`, tilts, and curls, and none of it moves this number. **Short, wide blades
      at high tilt crowd above the base with a clean D_max. BLADE-TO-BLADE CROWDING ABOVE
      THE ROOT IS A SECOND INSTRUMENT NOBODY HAS — RECORDED, NOT BUILT — and it is the one
      the mum work will need.** A collar session, or any session reading a green D_max, must
      not take it as a clean bloom; it is a clean BASE.

    - **READING `footRing()`, NOT DUPLICATING IT, and this is what makes it survive #140 for
      free.** The module imports the app's own geometry module INSIDE THE PAGE — the same
      module instance the app built from — calls `buildBloomInto()` with an export-mode
      accumulator, and reads `foot.slotRings[L][i]` and the builder's own `slotAzimuths`.
      No area rule, clamp, overhang law or azimuth law is restated. Five validity assertions
      make that a measurement rather than a claim, all fatal for the run and none a row
      result: **R1** the in-page export build's triangle count equals the exported STL's
      header (the geometry read is the geometry shipped); **R2** the in-page live build
      equals the app's own `liveTris` and hub radius; **R3** feet === `petalsBuilt`; **R4**
      every emitted foot frame sits exactly where the rectangle built from its descriptor's
      numbers puts it — SIGNED along the slot's radial direction, because a foot that crosses
      the axis has an inner row on the far side of the origin, where `hypot()` reads the
      distance unsigned and `atan2()` the azimuth 180° out; the first draft did exactly that
      and fired on every axis-crossing foot of the positive control; **R5** convergence at
      twice the cell. A per-petal descriptor still arrives through `slotRings`, and Z6
      already asserts a role never differentiates the foot.

    - **THE POSITIVE CONTROL, in a throwaway worktree: the overhang law doubled**
      (`max(1.5, 0.4r)` → `max(3.0, 0.8r)`). Predicted before measuring: every reading
      rises and nothing shipped sees it, since J4 bounds overhang only from below. Measured:
      mum **11 → 42**, default **2 → 3**, depth cell **3 → 7**, continuous headline
      **5 → 20** (it would flag), RADIAL × 40 **4 → 9**, RADIAL × 40 × spread 0.60
      **10 → 16** — with the export gate and the connectedness gate BOTH GREEN on the
      mutant across the whole matrix (the export gate 287/287 watertight, 0 degenerate, identical live and export triangle counts, every J and Z assertion clean; the connectedness gate 287/287 ONE piece). The instrument moves; the gates do
      not; the tool was not changed.

    - **THE SHEET, and it is the validation rather than decoration:**
      `node tools/shot-bloom-crowding.mjs <dir>` — the base cropped at a magnification set by
      each bloom's own hub radius, with that configuration's export number in the caption,
      for the four ruled configurations plus the two unruled ones nearest the line. **From
      BELOW the hub plane, and that was forced by the sheet's own frame check:** a camera
      close enough to read the base stands inside the canopy of a 60 mm blade from every
      other side (the first mum frame came back 99.8% content), and every blade rises from
      the plane, so beneath it is the one place the roots are unoccluded. The picture is the
      LIVE render and the caption is the EXPORT number, stated on every cell.

    - **THE GATES: in CI on the head that wired them, the export gate **402/402 watertight**, 402/402 identical live and export triangle counts, 0 degenerate, and the connectedness gate **402/402 ONE piece** — with **8 of 402 rows FLAGGED CROWDED in each**, the mum row among them (it exports 149,568 triangles, boundary 0, one component: over-connection, exactly as claimed), and 394 unflagged, so the flag is exercised in both directions; the live matrix's D_max histogram on the shipped tree peaks at 2 (171 of 287 rows before the matrix grew) with 22 at 1, 60 at 3, and a tail from 4 to 32 at the ALL THIN × spread min corners where feet cross the axis.** Byte identity is A PRIORI here — no geometry file is touched,
      so the export handler builds the same bytes — and it was measured anyway on the
      charter's retention ruling (newest baseline on both trees plus the live partition, not
      the whole suite; the brief said "every frozen baseline" and was corrected to the
      ruling): **phase10 (376 rows frozen at 4f39118, the newest baseline) 376/376 bit-identical, 0 moved, and the live matrix (402 rows, the mum row included) 402/402 bit-identical, 0 moved**, each against a worktree at 09c395b, defaults bit-identical on both. Cost: under a second per row, dominated by the two in-page builds
      rather than the raster (a fixed grid of ~2,400 cells across the hub, floored at 5 µm;
      the first draft capped the pitch instead, which made the LARGEST blooms the finest
      sampled at 37 million cells for no gain).

- ~~Session 13 — the three preconditions for a domed hub~~ **BUILT Sep 3: the print-preview
  toggle (unparked), the depth cap raised to SIX with a read-out line and NO derived clamp,
  and the crowding threshold re-derived and HELD at 11. No collar, no dome, no junction edit.**

    - **WHAT WAS ON `main` WHEN THE SESSION OPENED, and the brief was stale on it.** The
      brief's item 3 — the foot-crowding instrument, its four-config separation, its
      Fibonacci-gap neighbour argument and the flag-versus-gate ruling — had already shipped
      as #144 the same afternoon. Nothing of it was rebuilt; the one line that entry left open
      (re-derive `CROWDED_DMAX` when the depth cap is raised) is answered below. Items 1 and 2
      were open, exactly as the brief said.

    - **THE TOGGLE, and its one owner.** `#printPreview` sits in the VIEW box beside
      Auto-rotate and is view chrome in every sense `viewPreset` is: not a registry row,
      invisible to `readUI()`, DEFAULTS, reset and `fullStateDrift`. `shownMode()` in bloom.js
      is the ONE OWNER of "which geometry is on screen": `regenerate()` builds the viewport
      in that mode, the read-out's first line names it (`on screen: LIVE geometry, as
      authored` / `on screen: PRINT PREVIEW — export floor 1.00 mm applied …`), the
      print-truth pair keeps BOTH its lines and only its `← on screen` marker moves, and
      `__bloomMetrics()` reports `shownMode` and `shownTris` while `liveTris` reads NULL
      whenever the preview is on — never an export count under a live label, on the
      `f3(undefined)` doctrine that a wrong number must be loud.

    - **THE BYTES CANNOT MOVE, AND THE ARGUMENT IS STRUCTURAL.** The Get STL handler builds
      `buildGeometry({ exportMode: true })` from `readUI()`, and the box is not in `readUI()`;
      there is no branch in the export path that can observe it. What the toggle changes is
      the telemetry cache, and that needed a real change: `buildGeometry` used to cache
      `lastRings`/`lastTris` on `!exportMode`, which was the same as "the build on screen"
      only while nothing but regenerate() built live. Now the CALLER says which build is on
      screen (`record: true`, only from regenerate()), so an export click during a preview
      can never overwrite the viewport's numbers. Measured anyway, on the retention ruling: **phase11 (402 rows, the newest baseline) on a
      worktree at 174cc2f and on the branch head: 402/402 bit-identical, 0 moved, defaults
      bit-identical** — with the depth raise in the same tree, so this one run carries both
      changes' byte claims.

    - **THE POSITIVE CONTROL, run against the shipped instruments BEFORE a new assertion was
      written, with `autoRotate` standing in for the not-yet-existing box.** T1, an export
      path that reads view chrome: in the gates' own state (chrome untouched) **8 of 8 rows
      byte-identical to the base tree, every shipped check green** — so a toggle-dependent
      export was invisible to everything the project owned, because no gate ever flips view
      chrome. T2, an export build whose telemetry is cached as if live: the crowding
      instrument's R2 fires on **5 of 8 rows** (every row where the floor binds — mum hub
      3.633 vs 4.691) and is blind on the rest, where live and export share every double.
      So the new coverage is aimed at T1's hole: the panel gate's route (i) flips the REAL
      box on ALL THIN, requires a counted rebuild, `shownMode` export, `liveTris` null, the
      hub radius equal to `footRing()`'s own export answer, the read-out naming the mode, the
      PRINTED line marked, zero registry drift, and **the STL exported with the box ON
      byte-identical to the one exported with it OFF on the same page**; then OFF restoring
      live. Its negative control is the listener-less clone. And BOTH STL gates now assert
      `shownMode === 'live'` on every row as a validity failure, because every "(live)" label
      they print depends on it. Re-run with the real box on a mutant copy (`exportMode:
      shownMode() === 'live'`, correct with the box OFF and wrong with it ON): the gate fails on exactly one clause, `the STL exported with the box ON
      differs from the one with it OFF (556884 vs 556884 bytes) — the toggle reached the
      export path`, with every other assertion in the run green; the same gate passes on the
      real tree, and its negative control (the listener-less clone) fires on the rebuild
      clause. Red on the mutant, green on the fix: the route measures the property.

    - **THE CAPTION CONVENTION: every contact-sheet cell states its mode, from the app.**
      `modeTag(m)` in the harness reads `__bloomMetrics().shownMode` and returns
      `shown: LIVE (as authored)` or `shown: PRINT PREVIEW (export floor 1.00 mm applied)`;
      a tree that predates the toggle says so rather than defaulting to LIVE (the before/after
      sheets render base worktrees). Every canvas sheet appends it to its `<small>` line — one
      helper, no second code path, and a caption that can only ever disagree with its frame
      if the app disagrees with itself. The panel sheet photographs the panel, whose read-out
      now carries the mode on its own first line.

    - **THE DEPTH CAP: THE FORMULA WAS CHECKED AND DOES NOT HOLD, for a structural reason.**
      The brief's hypothesis, `L_max = floor(ln(footFloor / ring0) / ln(shrink))`, predicted
      6 for the shipping defaults and 3 for the mum. Measured on a worktree with the cap at 8,
      8 configurations × RADIAL/CONTINUOUS × depths 1..8 (128 rows): **ring0 is not a property
      of the configuration — the area rule sums every foot, so R0 grows with depth**, 8.85 mm
      at one layer, 13.23 at three, 15.65 at six on the defaults, and the defaults' innermost
      ring is still 1.69 mm at depth 8. The brief's 13.23 was the three-layer figure.

      | configuration | formula, R0 at depth 3 | formula, R0 at depth 1 | measured: deepest depth whose innermost EXPORT ring is ≥ 1.60 mm |
      |---|---|---|---|
      | defaults, RADIAL | 6.43 → 6 | 5.20 → 5 | 8 |
      | defaults, CONTINUOUS | 6.22 → 6 | 4.99 → 4 | 7 |
      | the mum | 4.82 → 4 | 2.36 → 2 | 6 |
      | the depth cell, 3 × 0.90 | 20.96 | 16.23 | beyond 8 |

    - **AND THE COLLISION IT NAMES IS NOT A BUILDABILITY LIMIT.** All 128 rows export
      watertight, as ONE piece, with 0 degenerate and 0 non-manifold triangles, and every
      J1–J6, Z, form and thickness assertion clean — a 0.01 mm blade at depth 8 × shrink
      0.35 included. Nothing collides. What deepens with depth is crowding, which the
      instrument from #144 already flags.

    - **A DERIVED CLAMP WAS PROPOSED BY THE BRIEF AND REJECTED (Eva, Sep 3), on two
      measurements.** First, it could not be byte-identical at depth ≤ 3: eleven reachable
      depth-2/3 states already have an innermost ring under 1.60 mm. **THREE OF THEM ARE
      SHIPPED GATE ROWS, AND THEY ARE A PRE-EXISTING FACT DISCOVERED BY THIS SESSION, NOT
      DAMAGE IT CAUSED** (recorded on Eva's instruction so a later session does not read them
      as new): `LAYERS: 3 x ALL THIN x spread min` (innermost export ring 1.087 mm), `3 layers
      x layerSize min (0.35)` (1.370 mm) and `CONT: 3 turns x layerSize min x petalCount 40`
      (0.470 mm at eight petals; the forty-petal row is the same region). They have exported
      watertight and as one piece since they were written; a ring narrower than a foot is
      feet overlapping each other, which is the state the Aug 31 spread ruling made reachable
      on purpose. Second, a clamp would be a GATE on exactly the property #144 ruled a FLAG
      the same day. So the slider reaches six and nothing caps it against the floor; the
      read-out SAYS instead, in the FOOT WIDTH FLOORED discipline: `RINGS NARROWER THAN A
      FOOT on rings 4–5 (2 of 6) — under 1.60 mm, so the feet on them overlap each other; on
      rings 4–5 (2 of 6) they cross the axis`, from two telemetry flags footRing() stamps on
      every ring (`underFootFloor`, `crossesAxis`), asserted in both directions by the panel
      gate's route (j) against the owner's own flags.

    - **WHY SIX AND NOT EIGHT.** At the shipping defaults six is the last depth at which the
      deepest blade is still wider than its own root in BOTH placements (3.10 mm RADIAL,
      2.32 mm CONTINUOUS against the 1.60 mm foot; at eight it is 1.60 and 1.20 — the
      "blade narrower than its root" the old MAX_LAYERS note named as the binding constraint)
      and the last at which the default base still reads D_max 2 (3 and 5 at seven and
      eight). Export cost at 6 × 40 petals: 297,888 triangles, 20% of the budget. Byte
      identity at depth ≤ 3 is by construction — the layer loop is unchanged and the constant
      is a validation bound and a slider range.

    - **WHAT MOVED IN THE LIVE MATRIX, predicted before the raise: exactly 23 rows**, all
      resolving `layerCount` to the slider's maximum (`layerCount max`, the four ALL MAX rows,
      and block 7's eighteen `N layers × sub-control` rows) — the same predeclared consequence
      as when ALL MAX first meant three. Every frozen matrix pins the literal 3. **phase11 is
      frozen at 174cc2f (402 rows, the crowding instrument's own head and the first baseline
      that carries the mum as a named row)**; the retention close ran it on both trees plus
      the live matrix (434 rows on the branch head, compared by label against the parent
      tree's phase11 export): **379 shared rows bit-identical; exactly 4 MOVED — `ALL MAX
      (centre off)` and `ALL MAX x DOME/DISC/RING max`, the rows that resolve `layerCount` to
      the slider's maximum; 19 block-7 rows relabelled from "3 layers x …" to "6 layers x …"
      (new states, no counterpart on the parent); 32 DEPTH rows new. 4 + 19 = the 23 movers
      predicted before the raise, and nothing outside them.**

    - **THE NEW ROWS: 32** — depth 4/5/6 × spread min/default/max × RADIAL/CONTINUOUS
      (18), then the corners: the mum at six turns (D_max 19), 6 × ALL THIN × spread min (28),
      6 × shrink min (the 0.18 mm blade, 24), 6 turns × shrink min × 40 (a 240-foot base at
      D_max 130, every foot across the axis), the coincidence corner six deep, 6 × 40 × spread
      min in both placements (15 / 25), 6 × ALL FORM MAX, the six-deep BARE bloom, 6 × SPIRAL,
      the 225° effective tilt, ZYGO 6 × ALL INNER MAX, the depth cell taken to six, and a
      clefted petal six whorls deep. Gates, in CI on the first push and again locally: **the export gate 434/434 watertight,
      434/434 identical live and export triangle counts, 0 degenerate, 19 of 434 flagged
      CROWDED (the mum, its six-turn state, and the deep spread-min and shrink-min corners),
      932 s; the panel gate PASS and its negative control firing on all eight routes; the
      frozen-matrices job proving phase11 deep-equal to 174cc2f.** The connectedness gate
      came back **433/434 ONE piece with ONE ROW SKIPPED — `ALL MAX x DOME max`, whose grid
      grew from 605x605x421 (131.8M) to 706x706x421 (209.8M) because ALL MAX now means six
      layers of forty petals, the area rule sums 240 feet, and the DOME scales with the hub to
      a 234 mm centre.** A row that used to be measured and is now skipped is coverage lost to
      a change, so the gate's ceiling moved as its own note prescribes: `MAX_VOXELS` 160M →
      256M (~22% over the new worst case; the next largest row is 50.3M), and that row
      flood-fills to ONE component in 14.5 s at 629 MB peak RSS. With the ceiling raised the
      gate reads 434/434.

    - **SHRINK 1.00 IN CONTINUOUS — MEASURED, NOT CHANGED (the brief asked).** Not
      degenerate: 0 non-manifold, 0 boundary, 0 degenerate at 8 and 40 per turn, with and
      without tilt step, while RADIAL and SPIRAL at 1.00 × offset 0 × tilt 0 reproduce the
      14,832 exactly (and RADIAL at 1.00 with the default offset 0.5 and tilt 12 reads 0 —
      the coincidence needs the offset too). But **J5 fires on every continuous row at 1.00**
      ("rings 0 and 1 do not step"): a zero-step continuum is indistinguishable from the
      ring-building mutation J5 exists to catch. The 0.90 cap is load-bearing for an
      instrument, not for the mesh. It stays; anyone raising it owes J5 a new witness.

    - **THE CROWDING THRESHOLD, RE-DERIVED AND HELD.** D_max in export mode across the raise:

      | configuration | d3 | d4 | d5 | d6 |
      |---|---|---|---|---|
      | the mum (ruled bad) | 11 | 13 | 15 | 19 |
      | defaults (ruled clean) | 2 | 2 | 2 | 2 |
      | the depth cell, 3 × 0.90 (ruled clean at 3) | 3 | 4 | 5 | 4 |
      | RADIAL × 40 × spread 0.60 (unruled) | 13 | 12 | 11 | 15 |

      The ruled-clean maximum is still 5 and the ruled-bad minimum still 11, so the numbers
      do not move the line; the depth cell at 4/5/6 sat unruled at 4–5 just under it, which
      is why those three went on the sheet. **RULED FROM THE SHEET (Eva, Sep 4): the depth cell
      at 4 / 5 / 6 reads CLEAN, the mum stays BAD, the defaults and the three-deep cell stay
      clean, and the threshold HOLDS at 11.** The ruled-clean set now reaches 5 at depth (the
      five-layer cell), which is exactly where it already stood; nothing moves.

    - **THE INSTRUMENT FAILED ITS OWN VALIDITY ON TINY RINGS, AND THE FIX SHIPS IN THE SAME
      PR AS THE ROWS THAT NEED IT (Eva's instruction).** R5 refused six deep rows whose
      innermost ring is a few hundredths of a millimetre — D_max 29 vs 28 on the mum at seven
      turns, 40 vs 38 at depth 8 × shrink 0.35 — because the raster pitch is set from the
      HUB radius and the deepest stack there is a sliver narrower than a hub-scale cell. None
      of the 402 shipped rows hit it; `DEPTH: 6 layers x layerSize min` would have, and a row
      the instrument cannot converge on is a row that gets quietly dropped. So `refineDepth()`
      re-rasters windows of three hub cells around every hub cell within two of the maximum
      at 1/8 and 1/16 of the hub pitch, R5 requires THOSE two to agree, and the reading is the
      resolved one (the line says `resolved locally` when the hub pass had not). Every
      previously failing row converges; **every one of the six ruled configurations reads
      exactly what it read before** (11 / 2 / 3 / 5 / 4 / 10); one row moved by one where
      the hub pass had under-resolved a sliver (shrink min × CONTINUOUS × depth 5, 24 → 25).

    - **THE SHEET:** `node tools/shot-bloom-depth.mjs <dir>` — the mum live beside print
      preview, same page, same camera, same base crop from below; the depth cell at 4 / 5 / 6
      with its numbers; the mum at six turns; the defaults and the three-deep cell as
      controls; every caption carrying the app's own mode tag and the export's crowding
      number registered against a real STL. **The pair does not look the same, and the first render said it did — an instrument
      error caught by looking:** the base crop had been framed from each mode's own hub
      radius, so the 29% larger printed hub was pulled back by 29% and the two cells came out
      the same apparent size. Framed once from the LIVE hub, the print preview shows the hub
      disc visibly larger in the same frame, the rim band taller (1.00 mm against 0.60) and
      every root leaving it thicker; the caption carries hub 3.63 → 4.69 mm, the same 120
      feet, D_max 17 live against 11 printed. **Eva looked at the pair directly (Sep 4): the
      print-preview hub is visibly bigger with a taller rim band, so the toggle earns its
      place. Merged on that ruling.**.

- ~~The domed hub~~ **BUILT Sep 4 (session 14): `headRise`, the whorl primitive's
  `height` argument completed — the junction slab bent into a spherical cap through
  the rim, every foot landing ON it at its own height with its normal, the shell
  following the feet, and the designed centre seated on the apex. For the INCURVE
  MUM (Eva's ruling: the class this serves), not a prettier spider.**

    - **WHAT WAS ON `main` WHEN THE SESSION OPENED, and the brief's account was
      right.** 7ffcbff, #145: the print-preview toggle, `MAX_LAYERS` six with no
      clamp and the two read-out flags, the crowding instrument as a flag at D_max
      11 with the local fine pass; its neighbour set is NONE by design (an
      exhaustive depth field, all-pairs NN as a diagnostic). The shipping default
      read D_max 2 / D_mean 1.12 and the mum 11 / 4.97 printed, 17 / 7.49 live,
      reproduced on the standalone run before anything was touched. The one thing
      the brief's first version had wrong and its amendment fixed: `centerStyle`
      already had a DOME value — the designed ornament on the flat hub, untouched.

    - **THE BRIEF'S 4.75x DID NOT RECONCILE WITH THE METRIC, and the disagreement
      was in the brief's inputs, resolved before anything was built.** 192 mm² of
      foot over a 40.4 mm² annulus multiplies the export THICKNESS floor (1.00 mm)
      as the foot's plan depth; the plan depth is the overhang, 1.50 mm live and
      1.50–1.88 mm printed. The 0.55 mm inner radius matches neither mode, and the
      3.63 mm ring is the LIVE hub while the metric reads the printed one at
      4.69 mm. Redone with the owner's numbers: live 288 mm² over 41.0 mm², 7.02x
      (the metric's live D_mean 7.49); printed 299.9 mm² over 66.5 mm², 4.51x
      (the metric's 4.97). The brief landed within five percent of the printed
      metric by two errors cancelling. The metric stands on its own validity
      assertions; neither number was adopted.

    - **THE DOCTRINE (Eva, Sep 4). A JUNCTION CHANGE, NEVER A CENTRE OPTION; AN
      EXPOSED CONTROL, NOT A CURVATURE DERIVED FROM CROWDING OR DEPTH.** The
      deciding reason was the third of the session's four: a metric consumed as a
      geometric input becomes a target — the A_k lesson made structural. The
      crowding instrument stays an OBSERVER of the geometry, never an input to it.
      The other reasons, measured: a crowding-keyed rule gives no dome on the
      incurve target (D_max 5–6, in the clean band) and none in the brief's own
      spread-2.5 neighbourhood (3–4); a depth-keyed one moves the session-7
      layered control (5 → 4 at a hemisphere); and the byte-identity argument is
      the SAME mechanism either way (a guard plus a residual), so "derived holds
      structurally, a control by a flag" was not a difference. `headRise` is
      `role: 'arrangement'`, because what it owns is where the FEET sit in z —
      the whorl primitive's `height` argument, handed the literal 0 since session
      1 because a foot lifted off a FLAT slab is joined to nothing at |h| ≥ t. The
      "height is not a control" ruling was a measurement about the slab, not
      about height; with the slab following the feet the whole range is usable,
      and the registry comment says so, so the next session reads a completed
      primitive rather than a new axis. The junction itself stays control-free,
      which keeps the registry header's "no junction role, ever" literally true.
      **Ring-radius / spread exposure was NOT reopened**: its phase-2 parking was
      conditioned on a new designed centre, and this session introduced none.

    - **THE FOOT ON THE DOME, and the seam measured three ways before one was
      chosen.** A single flat box tangent at the ring reaches 0.70 mm off the cap
      at the default and 1.07 mm at ALL MIN — past t/2 at every corner. Rows
      along the meridian with straight chords across leave the row ENDS floating
      by hw²/2Rd, 0.58 mm on a default-width foot at a hemisphere. Rows built as
      GREAT-CIRCLE ARCS across (radius Rd about the cap's centre — the roll law's
      own cross-section, with the apex floor as the roll floor) lie IN the cap,
      and the only seam left is the mesh's NV = 10 faceting, 0.007 mm worst case.
      That is what shipped: the ring row placed from `ring.radius` and `ring.z`
      directly (so J1's equality is exact), the two inner rows from the arc law,
      the overhang an ARC length — the same foot laid on a curved surface. What
      remains is a CREASE where the straight first blade row meets the curved last
      foot row, hw²/2Rd: 0.03 mm on the incurve target, 0.06 on the mum, 0.46 on a
      domed default. Blending it is petal-form work; it is photographed, not built.
      **The blade frame rotates rigidly with the foot**: the tilt is measured from
      the tangent plane's outward direction, which points DOWN the slope, so an
      outer floret on a steep cap leans out and an inner one stands at its authored
      tilt — the ball. `petalForm.frameAt` gained an optional `up` (a BRANCH, not
      `up = Z` with a general expression: `-R[0]*sin(phi) + 0*cos(phi)` turns a -0
      into a +0 at petalTilt 0, and that is a byte); the curl arc lives in the
      foot's own (Rs, Up) plane.

    - **THE HUB IS THE FLAT SLAB BENT — A SHELL, NOT A SOLID BOSS** (Eva's ruling
      from the recommendation). Concentric spheres Rd ± t/2 about the cap's centre,
      the rim a band at the rim's polar angle, an explicit apex fan (the centre
      DOME's own construction, which found 48 degenerate triangles per dome when
      a ring was shrunk to zero). Thickness t everywhere, so J4a stays an EQUALITY;
      the feet sit inside it with their faces coincident with its faces exactly as
      in the slab; from below it reads as a bowl, which is what lets the sheet tell
      a domed base from a flat one — a solid dome's underside is the flat disc's.
      **The hub's triangle count is the FIRST in this codebase that depends on a
      slider: 3,456 at any rise above 0 against 192 flat** — a branch, not a ramp;
      the panel gate asserts exactly those two numbers, and the export gate's
      live-equals-export count still holds on every row.

    - **THE APEX: capped by the OUTPUT.** The shell's inner face inverts under
      half a thickness of radius — the roll floor's own failure, watertight and
      connected and invisible to both STL gates — so the cap's radius is floored
      at one sheet thickness (`HEAD_RISE_MIN_RADIUS_FACTOR`, asserted equal to
      `ROLL_MIN_RADIUS_FACTOR` at module load, BELOW both definitions on the
      hoisting-trap rule). Since Rd ≥ R0 always, it binds only where the hub is
      narrower than the sheet: ONE reachable corner, ALL MIN × sheet 2.40 × spread
      min (a 1.149 mm hub), where the rise saturates at 0.25 and the read-out
      says "(CLAMPED: rise 1.00 asked, 0.25 built)". Measured across the domed
      matrix rows: 0 degenerate, 0 non-manifold, boundary 0.

    - **THE DEPTH CEILING ON THE DOME — re-derived, not inherited, and there was
      no clamp to inherit.** Session 13 rejected the derived clamp and shipped two
      flags; those flags are PRODUCERS of a boundary and moved with the owner:
      `underFootFloor` is a circumference claim and needs no second arm;
      `crossesAxis` becomes arc distance from the apex against the overhang.
      Measured across 24 (depth × spread × placement) states: no ring is under
      the floor at spread 2.00 to depth six in either placement, flat or domed, so
      the ceiling stays six; at spread 0.60 the flagged counts are unchanged
      except continuous × depth 4, 8 flat against 7 on the dome — because the arc
      to plan ratio is 1.2–2.9 over the whole ring span and nearly 1 at the
      innermost rings, where the apex is flat.

    - **PRE-REGISTERED CROWDING, AND THE PREDICTION WAS WRONG IN A WAY WORTH
      MORE THAN A CLEAN NUMBER.** Predictions were written to a file from the
      area-ratio rule before the surface raster ran; the raster was validated
      first (at rise 0 it equals the shipped flat raster to the bit on five
      configurations, D_max and D_mean alike). Printed mode:

      | config | flat | predicted at rise 0.5 / 1.0 | measured at rise 0.5 / 1.0 |
      |---|---|---|---|
      | Eva's mum | 11 / 4.97 | 9 / 3.94 and 5 / 2.44 | **10 / 4.11 and 9 / 3.14** |
      | shipping default | 2 / 1.12 | 1 / 0.82 and 1 / 0.45 | 2 / 1.11 and 1 / 1.01 |
      | session-7 bloom | 5 / 2.53 | 4 / 2.01 and 2 / 1.23 | 5 / 2.10 and 4 / 1.69 |
      | depth cell | 3 / 1.62 | 2 / 1.23 and 1 / 0.71 | 3 / 1.38 and 2 / 1.06 |
      | the incurve target (pre-registered after the four above, before the instrument ran) | 6 / 2.47 | 5 / 1.89 | **5 / 2.06** |

      **THE DOME RELIEVES THE MUM'S CROWDING; IT DOES NOT FIX IT, AND THAT IS THE
      RESULT, NOT A FAILURE.** The area-ratio rule over-stated the relief every
      time, for one reason: the cap's extra surface sits at the RIM where the
      slope is steep, while a tight bloom's feet stack at the INNER rings where
      the cap is nearly flat. The mum's peak sits at r 2.1–2.8 mm on a 4.69 mm hub,
      where a hemisphere's local relief is 1.1–1.2x under a whole-annulus 2.0x;
      it takes the mum from D_max 11 to 9, not to 5. Still over-subscribed at 120 florets. The
      incurve target's D_max landed exactly (5) and its D_mean missed by 8% in
      the same direction (local relief 1.24x at its peak against 1.67x at the
      rim) — a second data point on the same finding. **Carried into the
      read-out** (Eva's instruction): the HEAD RISE line prints the surface-to-
      plan ratio over the feet AND the local relief at the rim and at the
      innermost ring, from `footRing()`'s own per-ring `relief`; the crowding
      line prints the relief at the D_max point beside the rim's. Where the
      flags live, because it is the same kind of fact: a number a visitor cannot
      set that decides what the dome did.

    - **THE INCURVE TARGET.** The brief's 15 mm is below the petal-length
      slider's floor of 20 (kept for this session, Eva's ruling); its spread-2.5
      neighbourhood gives a 20–28 mm hub around 20 mm florets, ratio 0.4–0.8, a
      daisy. The class ratio (floret length ÷ head radius 1.0–1.5) is reached
      only with the existing spine-curl control engaged: continuous 40/turn × 3,
      spread 1.60, length 20, width 8, shrink 0.90, tilt 75, tilt step 5, curl
      150, sheet 0.60, delicacy 0.25, rise 0.50 — ratio 1.36 by length over the
      larger of plan reach and height reach. Its flat twin at the same sliders
      folds into a closed bud with its tips 2.8 mm off the plate, so the pair is
      the argument.

    - **THE CENTRE SEAT — PHOTOGRAPHED, NOT FIXED (Eva, Sep 4).** Left at the
      flat seat the designed centre DETACHES under a domed hub: two voxel
      components on the session-7 bloom at rise 0.5, the second being the DISC
      button, surviving at a 0.3 mm cell (its sibling mutant stayed one piece only
      because a horizontal foot happened to brush the button's top). Re-seated on
      the apex slab — the same eighth below the same underside, measured from the
      cap's apex — the overlap is a central PATCH of the footprint and the rim
      HOVERS: on the incurve target, printed, a 5.92 mm patch of a 9.38 mm
      footprint and 1.88 mm of hover; on the mum the whole footprint. RING lifts
      its tube onto the cap and is intersected all round. `buildCenterInto`
      reports the patch and the hover, the read-out prints them, and the sheet
      has a low three-quarter and a profile of the button at readable
      magnification for Eva's eye. A button that follows the cap's curvature is a
      phase-2 centre question, not a junction one.

    - **THE POSITIVE CONTROLS, RUN AGAINST THE SHIPPED INSTRUMENTS FIRST, in
      throwaway worktrees.** Three mutants at a hard-coded rise 0.5: D1 feet on a
      cap over a hub left flat; D2 a shell under feet kept horizontal; D3 correct
      feet under a blade that did not rotate. Every one exported watertight at
      identical live and export triangle counts. The voxel gate read ONE piece on
      every row of D1 and D2 — the mum included, whose inner feet sit 1.8 mm above
      a flat hub — and on D3 two pieces only where the centre detached. **The
      shipped J1 fired on all three, and that is the finding: it was
      INDISCRIMINATE, not blind.** It asserted the flat ruling itself (z = 0
      exactly, the hub plane's own normal), so it rejected a correct dome and a
      wrong one alike and could police nothing once the right build shipped. That
      distinction is in the gate's header.

    - **SO THE JUNCTION ASSERTIONS WERE RE-DERIVED, red then green on the same
      mutants rebuilt on the new tree.** J1: each foot row lies on the cap the
      owner declares (its centre at the cap's radius from the cap's centre,
      within 1e-9) with the cap's normal there, the ring row at the owner's
      radius and height EXACTLY; flat rows keep the pre-dome clauses verbatim.
      J3: the hub BUILDER's own sphere — reported by `buildHubInto` from what it
      built, never copied from `footRing()` — is the owner's to the bit, and
      exists iff the owner declares a dome. J8: the spine's first chord leaves the
      ring row in the foot's own meridian plane at tilt plus half that row's curl
      (every row; exact for a circular arc, and the centreline is curl's alone),
      and on flat-form rows the first blade row's normal is the rigid tilt of the
      foot's frame. Plus the dome guard (exactly 0 on flat builds, absent on domed
      ones) and the guard-versus-control biconditional.

      | mutant | boundary / degen | voxel pieces | after the re-derivation |
      |---|---|---|---|
      | shipped tree | 0 / 0 | 1 | **0 of 13 rows** |
      | P1 hub ignores the owner's dome | 0 / 0 | 1 on every row | **J3 only**, every domed row, flat rows clean |
      | P2 feet lifted but horizontal | 0 / 0 | 1 on every row | **J1 + crowding R4**, every domed row |
      | P3 blade not rotated with its foot | 0 / 0 | 1 | **J8 only** — and its first probe was SILENT on the curled incurve target |
      | P4 the flat path is the general law at zero curvature | 0 / 0 | 1 | bit-identical (0 positions moved), residual 0 |

      **P3's first silence is the entry that matters.** J8's first draft compared
      the root NORMAL on flat-form rows only, and the acceptance config is curled,
      so the mutation this session is most likely to ship passed the row the
      session is for. The chord clause exists because a positive control was run
      before the assertion was trusted — session A's "Z1 failed the shipped tree
      on 5 of 7 rows", the fan's "six of eight probe rows fired on the shipped
      tree", again. **P4 corrected a premise the other way:** the general dome
      law at zero curvature reproduces the flat foot BIT FOR BIT on the default,
      at petalTilt 0 and on the mum, so the guard is a construction on top of an
      identity rather than a cover for a difference. It stays, because a branch is
      a construction and an identity is an argument; the residual is what polices
      the law.

    - **THE CROWDING INSTRUMENT READS ON THE CAP.** Membership in the cap's own
      geometry (a geodesic strip about the foot's meridian), the union a SURFACE
      area, R4 placing every emitted row on the owner's cap at the strip model's
      arc position. Its first draft weighted each occupied cell by the relief at
      its centre and R5 refused every hemisphere row at 0.5%: the sampling was
      measuring the 1/cos singularity at a vertical rim, not the surface. Each
      cell now carries the cap's exact area between its inner and outer plan
      radii, and the hemisphere rows converge. The relief at a vertical rim
      prints as "vertical", never as 1.3e151x — which the first draft printed.

    - **THE MATRIX GREW 434 → 466**, and **`phase12Matrix()` — the 434 rows
      frozen at 7ffcbff — is the twelfth baseline and now the strongest**, proved
      deep-equal to that commit's own `buildMatrix()`. The 32 new rows: the
      blanket sweep's `headRise min` (0, the default, pinned) and `max` (1); the
      dome crossed with spread min / default / max in both placements; rise 0.5
      at petal counts 3 / 8 / 40; the mum at 0.5 and at a hemisphere; the incurve
      target flat and domed; six deep at spread min in both placements (the arc
      flag); the APEX CORNER; a hemisphere under every centre style; ALL FORM
      MAX, petalTilt 0 and the 135°-effective tilt on a hemisphere; FAN, SPIRAL,
      the two-whorl ORCHID and a per-petal fan on a dome; ALL THIN × spread min ×
      3 layers (feet across the apex); the 0.18 mm blade six deep on a
      hemisphere; and a pinned rise-0 row. **Predicted before the run: exactly the
      four ALL MAX rows move**, because `SWEEPABLE()` now resolves `headRise` to
      1 there (its only consumer is block 4), and every frozen matrix pins
      nothing about it. The connectedness ceiling moved 256M → 448M because
      `ALL MAX × DOME max` is now a hemisphere of the 118 mm hub under a 142 mm
      boss, 700×700×743 cells, 364.1M — measured in Node before the gate ran.

    - **THE PANEL GATE'S ROUTE (k)** asserts the HEAD RISE line, the "(CLAMPED"
      clause and the seat line in both directions against the owner's flags on
      five states, plus the hub's triangle count as the two-valued branch it is;
      the negative control freezes the read-out and requires all NINE routes to
      fire, and does.

    - **THE SHEET: `node tools/shot-bloom-dome.mjs <dir>`** — every cell PRINT
      PREVIEW ON, read back from the app's own `shownMode`; the incurve target
      flat beside domed with one camera sized from the flat twin; the base of
      each from a LOW PROFILE at the rim (Eva, Sep 4 — a domed shell hides the
      inner roots from below, and the flat disc and the shell are
      indistinguishable from there) and from below; the mum flat / 0.50 /
      hemisphere; the two controls at rise 0; the centre seat, low three-quarter
      and profile. The profile camera WIDENS in bounded steps when the decoded
      frame comes back all content (the mum's canopy swallowed the first one at
      hub magnification) and says so in the caption.

    - **THE CLOSE-OUT, on the retention ruling (the newest baseline on both
      trees plus the live partition, not the whole suite).**
        * **phase12 (434 rows frozen at 7ffcbff) on a worktree at 7ffcbff and on
          the branch head: 434/434 bit-identical, 0 moved, defaults bit-identical.**
          The live matrix (466 rows) against the base tree's phase12 export by
          label: **430 shared rows bit-identical, exactly the 4 predicted ALL MAX
          rows moved, 32 rows new; the pinned rise-0 row and `headRise min` are
          bit-identical to the default on the new tree.** The prediction held in
          both directions. Runtimes: ~20 min per byte export of 434–466 rows.
        * Export gate **466/466 watertight, 466/466 identical live and export
          triangle counts, 0 degenerate, 23 rows flagged CROWDED, no validity
          failure, 1,579 s** — after two runs that were NOT clean, recorded
          because each found a real defect in the new instruments: the first
          (12 validity failures) was the plan raster's D_mean refusing every
          hemisphere row and R4's tolerance at a rim whose radius was a rounding
          residue above the hub's; the second (1) was J8's chord clause comparing
          angles without a wrap, on the 225°-effective sixth whorl. Both fixed
          on the mechanism, not the tolerance.
        * Connectedness gate **466/466 ONE connected piece, no row skipped at the
          raised 448M ceiling, 1,345 s.**
        * Panel gate PASS with route (k); the negative control fired on all nine
          routes. `--verify-frozen --phase12` PASS against a worktree at 7ffcbff.
        * The shipped tree on the thirteen probe rows: 0 of 13 fired; P3 rebuilt
          on the final tree fires J8 on all 7 domed rows and none of the 6 flat.
        * The default bloom is **11,136 tris live and export alike, unchanged**;
          the incurve target is 152,832 at rise 0.5 (149,568 flat, the shell's
          3,264 on top); the mum at rise 0.5 the same 152,832.


- ~~The petal curl family~~ **BUILT Sep 4 (session 16): curl bias, curl start,
  cross-section taper and — renamed — cup gradient, as sheet geometry on the
  domed hub. The flower's PARAMETERISATION came over; its geometry code and
  its constants' reasons did not. Full numbers in
  `docs/bloom-session-16-outcome.md`.**

    - **THE ACCEPTANCE CRITERION WAS WITHDRAWN BY EVA, AND WHY IS THE ENTRY.**
      The brief demanded the incurve target read 0.0% uncovered and bald-cap
      ≤ 0.08 mm at every new control's min, default and max. Phase A measured
      that curl bias and curl start preserve the total TURN and move the TIP
      — bias 0.5 puts the incurve tips 3–8 mm from the axis and re-opens 5.4%
      of the disc, start 0.95 puts them 9–17 mm out and re-opens 23.1% — and
      coverage is a tip-position property. Eva's ruling: the criterion demanded
      that controls which relocate the tip not relocate the tip; a non-default
      bias or start opening the crown is the controls WORKING, documented, not
      a gate failure. **Crown closure on the incurve target is an EMERGENT
      property of curl 150 × tilt × `domeLean` landing tips within 0.3–1.3 mm
      of the axis. It was never designed and has no margin. A future session
      changing tilt, curl or `domeLean` re-opens it silently unless coverage is
      asserted on the pinned rows** — so the two DOME rows naming the incurve
      target now PIN the four new controls at identity and carry a `coverage`
      assertion, and `tools/bloom-plan-coverage.mjs` is WIRED INTO THE EXPORT
      GATE: its line on every row, its numbers asserted on those two rows only
      (0.0%, ≤ 0.09 mm — the measured 0.08 plus one part in ten), a split whorl
      reported as a LABELLED, LOUD skip and a coverage-asserting row that is
      skipped a validity failure. Cost measured before the ruling: 0.2–1.2 s a
      row in-page.

    - **THE FLOWER'S CONSTANTS ARE LACE CONSTANTS WITH NO THICKNESS BEHIND
      THEM, and the ranges ship FULL, CLAMPED, TOLD (Eva).** Bias power 4 and
      start to 0.95 concentrate curvature past the roll floor's reach by 5× and
      20×; the sheet's inner face inverts under half a thickness of SPINE
      radius exactly as it does under roll, so the spine curvature is floored
      pointwise at one sheet thickness (`ROLL_MIN_RADIUS_FACTOR * t`, the same
      constant), the control saturates, and the read-out's SPINE CURL line
      prints the tightest spine radius, "(CLAMPED at one sheet thickness …)"
      and the turn asked beside the turn built (150° asks 96° at start 0.95 on
      the incurve target, 50° at bias 1 × start 0.95). At curl 150 on a 20 mm
      blade the floor binds from start 0.87 in export and, at bias 1, from
      start 0.35. Trimming the input to hide that cliff is an input proxy; the
      roll floor and FOOT WIDTH FLOORED are the precedents. **The floor is the
      MODIFIERS' floor: a uniform curl is the shipped arc and is never clamped
      — and the first full gate run found it already UNDER one sheet thickness
      on three shipped rows** (six deep × curl 360: the innermost whorl's
      6.8 mm blade has a 1.08 mm spine radius against 1.20), a pre-existing
      state on the session-13 precedent: told by `underFloor` and the read-out's
      UNDER ONE SHEET THICKNESS clause, never clamped, C3 asserting the flag
      against the law both ways. The claim that the uniform arc never reaches
      the floor was true of one whorl and false of six. The flower's bias
      also doubles the total turn (360° → 720° at bias 1): NOT reproduced —
      the total is spine curl's alone, one owner. **Curl start is floored at
      one blade row** (1/NU, told), so the root chord is straight wherever
      start is engaged and J8's normal clause applies there.

    - **RENAMED AND DECLINED, on measurement, so neither is re-proposed.** The
      flower's "Edge curve — profile" is the SAME v² lift along the row normal
      that cup is, with a linear-to-the-tip envelope where cup carries the
      onset ramp; the best-fitting cup leaves a 28% RMS residual at every
      amplitude (0.91 mm max on a 16 mm petal at +1), so it ships as **Cup
      gradient**, the name the geometry earns, and the flower's label is now
      known to be wrong there too. "Edge curve — top-down" is a width
      MULTIPLIER reproducible by petal width × base taper × tip taper to
      0.32 mm max billow and 0.59 mm max pinch on an 8 mm half-width: shipping
      it makes a second producer of the width profile and breaks the
      registration rule — DECLINED. The flower's cup-damping-under-roll is
      declined on the isometry measurement (roll holds |dP/dv| at exactly 1;
      cup composes onto it). The flower's ungated dead sliders are declined:
      bias and start are `visibleWhen: { id: 'petalSpineCurl', awayFrom: 0,
      by: 2.5 }`, taper likewise on roll, hidden AND inert.

    - **MUTANT A IS THE ONE THAT MATTERS, AND ITS WITNESS WAS BUILT FIRST, RED
      THEN GREEN (Eva's instruction).** A build with the controls wired —
      registry rows, telemetry, read-out — and the spine still on the arc is
      BIT-IDENTICAL to the un-biased bloom (same sha on every probe row): it
      exports watertight, as one piece, at the identical triangle count and
      byte length, and passes J1–J9, formAssertions, thicknessAssertions and
      Z1–Z9. Four dead sliders through every gate. `spineLaw()` in
      bloom-geometry.js is the ONE owner of the curled centreline, read by
      `buildPetalInto` and by the gate; **C1** rebuilds it in the gate from
      OTHER owners (bias/start from the registry, the applied curl and length,
      J9's three tilt terms, the ring's thickness) and compares against the
      EMITTED blade-row centres, requiring the builder's own spine record to
      agree with the reconstruction. With `SPINE_WIRED = false` C1 fired on
      every ring of every bias/start row (120 on the incurve target) and was
      silent on the control, flat and hoop rows; wiring the spine turned it
      green with nothing else changing. **C2** is the integrator's own validity
      (the table against the closed-form arc on uniform rows, 1e-14 measured,
      1e-9 asserted; an Euler integrator at the row pitch reads 5e-3); **C3**
      the spine floor in both directions (a floorless spine builds a 0.03 mm
      radius, watertight, and nothing else sees it). Both in both gates on
      every row.

    - **TWO SHIPPED INSTRUMENTS WERE INDISCRIMINATE, session 15's class again,
      and one was blind.** J8's chord clause ("tilt plus half this row's
      curl") is the chord of a CIRCULAR arc: it fired on all 120 rings of every
      CORRECT bias/start build and did not separate the correct build from the
      un-integrated mutant beside it. Re-derived: the expectation is the law's
      own first-row direction from C1's inputs, the closed form kept verbatim
      as a second clause on uniform rows, and the normal clause extended to
      every untwisted row whose start is engaged (the root is straight there
      by construction). formAssertions' isometry clause scoped on `cup === 0`
      fired on a correct cup-gradient build; it scopes on cup OR gradient now.
      And **J1 is blind to a foot SHORTENED by a modifier, flat and domed**
      (Mutant B): the foot rows still lie on the plane or the cap, and J1 reads
      that, not the overhang length; the crowding instrument's R4 is the
      witness, a validity assertion in both gates. Recorded, not fixed.

    - **A NUMERICAL FINDING ON THE WAY TO GREEN, worth more than the clean
      run.** At the tiny curvature a tip-loaded law has near the root, the
      exact-arc substep `(sin p1 − sin p0) / k` cancels catastrophically, and a
      one-ULP difference in `Math.sin` between Node's V8 and Chromium's V8
      became 1.4e-3 mm of spine on the incurve target's ring 0 — the gate and
      the page disagreeing about the same law with the same inputs. The
      substep is the same arc in its product form, `ds · cos(pm) ·
      sinc((p1 − p0)/2)`, portable; and the cumulative turn is taken from the
      closed-form `Phi(u)` so the unclamped total is exact — the first draft's
      midpoint quadrature built 149.9998 of 150 degrees, which C3 read as a
      clamp that was not there.

    - **SELF-INTERSECTION IS A PROPERTY OF THE PETAL ALONE — measured on 243
      combinations, not derived.** The spine self-contact reading was identical
      across all nine rise × shrink states of every (curl, bias, start): the
      brief's corner "curl max × rise max × the innermost rings" does not
      enter it, and what rise and shrink change is blade-into-shell
      interpenetration, allowed since Aug 31. The only single-petal contacts
      are the shipped hoop (curl 360, tip on root) and curl 360 × start 0.5
      (the tip landing on its own mid-blade at 0.000 mm); bias winds the
      spiral inside itself and never touches. **SELF-CONTACT is a FLAG, never
      a gate (Eva)** — it fires on the shipped, photographed hoop — from the
      builder's own rows: the nearest approach between blade rows at least
      three sheet thicknesses apart ALONG THE SPINE, or the blade against its
      own foot, within one thickness. The first draft compared rows three
      apart by INDEX and read every 0.88 mm shrink-0.35 blade as touching —
      row pitch, not contact. Exercised in both directions at matrix level
      (`curlCoverage()`), the crowding flag's own precedent.

    - **THE PANEL: PETAL CURL (Eva's ruling, the session's version over her
      own).** Petal tilt, spine curl, curl bias, curl start, twist. Tilt moves
      WITH curl rather than to Arrangement, because the Sep 1 ruling put it
      beside spine curl and considered and rejected exactly the Arrangement
      alternative; twist is in on `petalForm`'s ordering law. PETAL FORM keeps
      cup, cup gradient, roll, roll taper. Zero geometry. The panel gate's
      route (l) drives curl 0 → 150 → 0 and roll 0 → 90 → 0 on ONE page — route
      (d) drives a slider driver to its two ends only, and both ends of spine
      curl are away from 0, so it could assert that bias and start APPEAR and
      never that they DISAPPEAR — and asserts the SPINE CURL line, "(CLAMPED"
      and SELF-CONTACT in both directions against the builder's record; the
      negative control freezes the read-out and requires all TEN routes to
      fire, and does. `tools/shot-bloom-panel.mjs` gained the two cells.

    - **THE MATRIX GREW 469 → 499, and `phase13Matrix()` — the 469 rows frozen
      at 6b8e94b — is the thirteenth baseline. THE DEBT SESSION 15 LEFT, called
      out on Eva's instruction:** it grew the live matrix 466 → 469 and froze
      nothing, so the newest baseline stayed phase12 at 434 while 35 live rows
      — the domed corners and the crown-coverage rows, exactly the region this
      family disturbs — had no baseline. Paid; proved deep-equal in CI. The
      three gated controls are excluded from block 1's sweep as hidden-at-
      defaults (`CURL_SUBS`, derived from `predicateDrivers` and
      `evalPredicate` at DEFAULTS — the latent trap #124 closed, from a SIXTH
      direction) and swept in block 21 at a curl or roll that shows them; they
      JOIN `SWEEPABLE`, so **the eight ALL rows move, predeclared** (ALL MAX by
      bias 1 / start 0.95 / taper +1 / gradient 1.2; ALL MIN by taper −1 under
      roll −330 and gradient −0.8). Block 1 sweeps cup gradient on its own. The
      two pinned incurve rows are relabelled and gain four identity sets, which
      move no byte. Both STL gates gained `--only <regex>` for a smoke pass
      on a wiring change; the summary counts what ran and matrix-level claims
      are not made on a filtered run.

    - **THE CENTRE RIM HOVER HAS ONE OWNER NOW.** Session 14's 1.88 mm and
      Phase A's 1.67 mm on the incurve target are the same configuration in
      two MODES — printed (the export floor moves the hub from 9.69 to 12.51 mm
      and the button with it) and live; the read-out prints the seat line in
      whichever mode is on screen. No configuration reads 1.2 mm. The hover is
      a centre-versus-shell number and no curl control moves it.

    - **FIELDS: nothing folded.** `domeLean` and `tiltExtra` are untouched;
      the four new controls are separate ids; `spineLaw()` is a separate owner
      handed the three-term tilt the builder always summed.

    - **THE SHEET: `node tools/shot-bloom-curl.mjs <dir> [base-tree]`** — every
      cell PRINT PREVIEW ON, chrome hidden, auto-rotate off, asserted; each
      control swept alone at min/default/max on one camera per sweep; the spine
      floor and the self-contact flag both sides; the incurve target at every
      new control's extremes with coverage and crowding in the caption, bias 1
      beside start 0.95 as the honest picture; a crown crop of the pinned row;
      the foot from a low profile at start 0 and 0.50; and the two controls
      exported from a worktree of the base commit with their sha REQUIRED
      equal on the sheet itself.

    - **THE EVIDENCE — filled at the close-out below this line.**

    - **THE EVIDENCE, COMPLETE.** Export gate **499/499** watertight, 0 degenerate,
      identical live and export triangle counts on every row, 1961 s; plan
      coverage measured on 372 rows, **127 SKIPPED** as split whorls (labelled,
      never silent), **2 ASSERTED** (the pinned incurve rows: 0.0% uncovered,
      bald cap 0.08 mm against a 0.09 mm bound); 56 rows flag SELF-CONTACT, 3
      rows carry the shipped uniform arc under one sheet thickness on the
      innermost of six whorls (told, not clamped), 24 CROWDED. Connectedness
      **499/499** one piece, 1977 s. Panel gate PASS on all ten routes with the
      curl route's under-floor step on the shipping blade and sheet set
      explicitly; the negative control fires on **ALL TEN ROUTES**.
      `--verify-frozen --phase13` PASS. CI on af2cd99: six verify jobs green.
    - **THE RETENTION CLOSE — the newest baseline plus the live partition,
      EXACT.** `phase13Matrix()` exported from a worktree of 6b8e94b and from
      head: **469/469 bit-identical** (the base tree reads "6b8e94b+dirty" from
      the gitignored node_modules symlink, nothing else). Head's live matrix
      against that export by label: 467 shared, **459 bit-identical, 8 moved =
      exactly the eight predeclared ALL MIN / ALL MAX rows, 0 outside the
      prediction**, 32 new (block 21's 28 plus block 1's cup-gradient sweep and
      the relabelled pair), 2 labels absent because they were relabelled — the
      two pinned incurve rows at 4b250b664500 (flat) and cd46ad682fd3 (rise
      0.50) bit-identical under their new labels and their four identity sets.
      The moved ALL rows keep their byte lengths and triangle counts and change
      shape only.
    - **THE POSITIVE CONTROLS ON THE FINAL TREE — four full-tree copies, seven
      rows each, every row watertight, 0 degenerate, identical live and export
      counts on every tree; the STL gates see none of it.** Read as: what the
      curl instruments fire, and where each mutant is bit-identical to a
      correct build so that NOTHING ELSE could:
      A (bias/start read, spine keeps the arc) — bit-identical to the PINNED
      CONTROL on bias 1 and start 0.95 (sha cd46ad682f, the mutant that leaves
      no byte to diff); **C1 fires on every ring** of every bias/start row and
      the re-derived J8 with it; silent on the control, the hoop and the flat
      default. B (start reaches the foot rows) — crowding R4 fires on every
      start row (x480 on the incurve target), silent where start is 0. C
      (Euler integrator at the row pitch) — **C2 fires on the uniform rows**
      (the pinned control and the fiddlehead, where the bytes are identical to
      a correct build) and C1 at 1e-2 mm on the bias/start rows. D (no spine
      floor) — bit-identical to the correct build on every row the floor does
      not bind, and on start 0.95 **C3 fires both ways** (a 0.38 mm spine
      radius told as under the floor while the owners' inputs say clamped) with
      C1 at 3.7e-1 mm. Every tree is silent and bit-identical on DEFAULT (flat).
    - **THE SHEET, RENDERED AND HELD FOR EVA'S EYE:** 33 cells across 26 rows,
      every one PRINT PREVIEW ON, chrome hidden, auto-rotate off, asserted; the
      two BEFORE cells exported from the 6b8e94b worktree with their sha
      required equal to the head's controls (0c377b21350d, cd46ad682fd3) and
      the taper-under-roll-0 cell required equal to the pinned control. Each
      sweep shares one camera framed from its widest cell with a 12 px clear
      margin asserted, so a canopy at start 0.95 no longer crops. The honest
      pair: the incurve target at bias 1 (crown re-opened) and at start 0.95
      (23.1% uncovered, bald cap 5.78 mm, CLAMPED on 120 of 120 rings, 25.6°
      built of 150° asked), with the seat line reading 1.88 mm printed.

- ~~The full sphere — "what if I wanted the bottom half of the sphere as well?"~~ **BUILT
  Sep 5 (session 18): the CAP / SPHERE head. `hubShape` (Head section, CAP default) with
  `headRise` as the cap's own sub-control; SPHERE is the CONTINUOUS spiral RE-KEYED ON
  POLAR ANGLE — one equal-area sequence pole to pole on a closed shell, lean 0, the far pole
  reserved. Numbers and the mutant table in `docs/bloom-session-18-outcome.md`.**

    - **THE RULINGS (Eva, Sep 5), all three from Phase A's ranked list.** Q1: candidate (a),
      which turned out to be (c) built through the existing primitive — the descriptor's
      KEY moves from plan radius (not injective past the equator) to polar angle; no second
      whorl, no reflection, no latitude bands (rejected: rings wearing spiral azimuths, the
      look ruled out Sep 1). Q5: TWO values, not three — a FLAT / DOMED / SPHERICAL enum with
      `headRise` as DOMED's sub-control would have resolved 35 phase13 and 42 live rows to a
      FLAT default and built them flat; CAP carries the rise, so the move is 0 moved. The
      two guarantees are stated APART in the outcome doc: the geometry one (SPHERE is a value
      nothing pre-existing selects) and the UI one (`headRise`'s predicate true on every
      existing row). Q1b: LEAN 0 is the baseline — the cap's restore-the-flat-aim lean
      continued past the equator aims every far-side petal back into the bloom; the faded
      lean is costed, not built, and the sheet decides. Q4: the reserved pole is the pole
      opposite the arc origin, clear of feet by construction, covered by converging blade
      tips, a stem exiting through that canopy later — asserted as S3 in arc, both directions.
      Q6: #106 and #108 are FLOWER issues; the kickoff prompt was wrong about them; neither
      was touched.

    - **SPHERE IS CONTINUOUS-ONLY, HIDDEN AND INERT ELSEWHERE — the `layerPhase` treatment.**
      Under RADIAL / SPIRAL / FAN a sphere would be latitude bands, so the enum shows under
      CONTINUOUS only, a stored SPHERE builds the cap there, and `headRise` stays live (its
      predicate is `not sphereMode`, not `hubShape oneOf CAP`, on purpose). The registry's
      `PREDICATES.sphereMode` and the geometry's `sphereMode()` are the two statements; the
      harness checks them at module load over every placement × shape × rise and per row.

    - **THE SPHERE IS THE RISE-1 CAP CONTINUED PAST ITS OWN RIM.** Rd = R0, the equator on
      the flat hub's plane, `H` still the face pole's height so the centre's apex seat reads
      it unchanged; the apex floor binds on the same one corner and holds the SPHERE at one
      sheet (told). The sequence runs from the RESERVED pole (k = 0, the largest petal, scale
      1) to the face pole, so `layerSize`, `layerTilt` and `layerCount` keep their meanings
      over the whole sphere. Feet run toward the face pole, blades leave toward the reserved
      one. The hub is two concentric spheres closed by an explicit apex fan at each pole —
      the cap arm at 180° collapses its rim band onto 48 coincident points, the DOME centre's
      own defect — so the hub count is a THREE-VALUED branch, 192 / 3,456 / 6,720.

    - **WHAT THE INSTRUMENTS COULD AND COULD NOT SEE, measured before the assertions were
      written and again after.** Everything written in slope terms held for slope in
      [0°, 180°] untouched: the arc-law foot rows, the great-circle cross-sections, the rigid
      frame, J1, J3, C1 — and crowding's R4 (its `atan2(proj, dz)` is signed) needed ONE
      clause, not the rewrite Phase A expected. What could not: the crowding raster's
      membership went through a plan point lifted onto the UPPER sheet, so every far-side
      cell would have been tested against the wrong hemisphere — it evaluates in (s, θ) now,
      over the full arc, the cap path a verbatim branch; the plan-coverage raster cannot
      read a sphere at all (the far hemisphere projects into the disc from below: a FALSE
      CLEAN), so SPHERE rows are a LABELLED, LOUD skip and the export gate FAILS THE RUN if
      one ever emits a number, decided against the app's own `sphereMode` and asserted in
      both directions at matrix level; J5's "radius strictly decreasing" is false on a sphere
      (it rises to the equator and falls) and steps in polar angle there; J6 is NULLED (no
      ringed twin exists for a spherical sequence; a claim nothing can make reads as absent).
      S1 (equal-area, pole to pole, mirror-symmetric, the sphere's own functions of φ), S2
      (the hub is CLOSED iff declared, from the builder's own report), S3 (the reserved pole,
      both directions) and S4 (the rise inert under SPHERE — GATED rows for the bit-identity,
      a per-row owner check for the mechanism) carry the rest. The mutant table is in the
      outcome doc: five mutants, each caught by the family written for it (S1, S2, S3 with S1 suppressed, J9, the loud skip) on all four sphere smoke rows, every one silent on the RADIAL control and watertight with identical counts — and M-COV's emitted number on the incurve sphere was 0.0% uncovered, bald cap 0.08 mm, the false clean exactly as predicted.

    - **THE SPHERE SPREADS THE FEET.** The incurve sliders read D_max 5 / D_mean 2.06 on the
      cap at rise 0.5 and **2 / 1.00 on the sphere**, depth 1 within one equal-area step of
      either pole; 240 feet on a 32.72 mm sphere read 2 / 1.01. Four times the surface of the
      equatorial disc, and every foot owns the same patch. The instrument's blind spot is
      unchanged and is exactly the face pole's question: root-exit stacking, never the blades.

    - **BYTE-IDENTICAL ON THE RETENTION RULING'S TERMS**: phase14 (499 rows frozen at
      5312845, a commit on `main`, the strongest baseline — the only one carrying the curl
      family's rows) **499/499 bit-identical, 0 moved**; the live partition **499 shared rows bit-identical, 0 moved, 28 new (all SPHERE), 0 absent; every GATED inertness pair equal by sha256** (S4 measured, not asserted). The predeclared must-not-touch
      list (every flower file and tool, `chromium-harness`, cards, the tracker, the twelve
      older frozen functions) verified by `sha1sum -c` at close; eleven `frozen/*` tags on the
      remote as session 17 left them; `frozen/phase14` is OWED from `main` after the merge.

    - **THE SHEET: `node tools/shot-bloom-sphere.mjs <dir>`** — the incurve sliders on a
      sphere beside the same sliders on a cap at a hemisphere, one camera; the FACE-POLE crop
      (for Q1b) and the RESERVED pole from below; the 240-foot row, the sparse and mum cases;
      and the byte claim on the sheet itself (two GATED pairs REQUIRED equal by sha). Held for
      Eva's ruling.
