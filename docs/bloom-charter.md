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
- **Gate coverage starts where the flower's gate was blind:** the bare bloom *is* the
  shipping default here, so the connectedness gate's first rows are the default and every
  preset, before any interesting cases. The flower shipped a 7-piece bare bloom for
  months because every gate row enabled the thing that hid the defect.
- Sheets change the failure modes: fewer free-wire hazards, more thin-wall ones. The
  connectedness gate still can't see a free end — carry that limitation forward in its
  header.

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
- **Arrangement facts worth having on day one:** phyllotaxis reads as intentional only
  above roughly n≥8 — gate or flag golden-angle placement at low counts. Arrangement is
  a whorl — `(count, radius, height, sizeRamp, angleRamp, phase, blade)` — and building
  it as that primitive from the start makes sepals, epicalyx, and involucre free later
  instead of a refactor (the flower learned this the expensive way, as a position paper
  it never got to build).

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

## Rulings to park for phase boundaries

- ~~Phase 2 entry: what *is* the bloom center, visually?~~ **Built as an A/B rig, Aug 31;
  the ruling itself is still open.** Eva's ruling at phase-2 entry was that the question is
  not answered by argument: three archetypes ship behind one `centerStyle` choice —
  DOME (rounded boss), DISC (flat/dished button), RING (open torus collar) — plus NONE,
  which is and remains the default until she rules from the contact sheet. Wiring the
  winner as the default is a later session's job. The centre is DESIGNED and user-chosen;
  the junction stays derived and control-free beneath it, and the registry's `role` field
  now carries that split (`center` vs. the deliberate absence of any `junction` row).
- ~~Foot ownership~~ **Settled Aug 31:** the foot ring — where feet land, and the foot
  cross-section — gets one named owner function in **phase 1**; the petal builder and the
  phase-2 center builder both read it. No second definition, ever.
- Phase 3 entry: which of the flower's six absences (gap analysis) the bloom's petal
  model should avoid inheriting — non-monotone width (claw) and domain trimming (cleft)
  are the two that change what the silhouette can be.
- Presets: Eva authors them herself once the panel is settled (standing ruling from the
  flower panel audit).
- ~~Ring radius / spread exposure — re-decide at phase 2 entry~~ **Settled Aug 31, at
  phase-2 entry: EXPOSED.** The phase-1 grounds for hiding it — that a spread-out ring
  would have nothing in its middle but plumbing — expired the moment the designed centre
  existed to occupy that middle, exactly as parked. `spread` is a Standard slider,
  0.60–6.00, default 1.00, applied inside `footRing()` and nowhere else: the area rule
  still *derives* the radius and spread only scales it. At the 1.00 default the multiply
  is exact in IEEE-754, so every pre-change export is bit-identical by construction
  (confirmed: 0 of 47 configs moved). Eva's ruling on the lower bound: **the area rule is
  a reference, not a cage** — below 1.00 the ring is tighter than the derived radius, feet
  crowd and at the extreme cross the axis, and that state is reachable on purpose. The
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
