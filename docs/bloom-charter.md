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
