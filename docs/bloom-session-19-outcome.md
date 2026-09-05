# The solid-angle coverage instrument, session 19 — built, validated, calibrated, and WIRED on Eva's ruling; the pins with their headroom, and the two pieces of session-18 debt

Session 19 built `tools/bloom-solid-angle-coverage.mjs` as a SIBLING of
`tools/bloom-plan-coverage.mjs`, ran its validity checks and controls, measured the rows
the ruling was about, STOPPED for the ruling, and then — on it — added a closed-form
calibration of the measure (R6), a witness table for the negative control, and WIRED the
instrument into the export gate with the four pins Eva ruled. The plan raster's own
SPHERE skip stays (a plan raster cannot read a sphere); what is lifted is that a sphere
row had no coverage instrument. No geometry file was touched (verified by diff at close —
see the end). Everything below is the EXPORT reading in the page's own export-mode build.

**Two sizing misses, for Eva's estimates:** Phase A put the sibling at ~250 lines and it
came in at 666 before the ruling and ~900 after it (the header, R0, R5, R6 and the
negative control are more than half); Phase A put the cost at 1–3 s a row and the sphere
rows read 2.5–3.7 s, cap rows 2–8 s with the mapped comparison (which the gate does not
run).

## What was on `main` when the session opened — confirmed from source, not the brief

`dddd934` (#155). All eight things the brief listed were read in the code rather than
taken from it: `footRing()`'s SPHERE arm keyed on polar angle (`phiAt(k)`, cos φ linear
in the slot index, 2/K a step, the sequence from the reserved pole to the face pole); the
Head section with the CAP / SPHERE enum and `headRise` gated `not sphereMode`; the closed
two-sphere hub arm with explicit apex fans at both poles (6,720 triangles); S1–S4 in the
harness (S1/S3 at the sphere's own polar-angle properties, S2 against the hub builder's
`closed` report, S4 per row and by the GATED byte pairs); the crowding raster's (s, θ)
membership over the full arc; the loud coverage skip — the plan raster returns
`{ r: null, sphere: true, skipped }` from `footRing()`'s own flag before a petal is built,
and the export gate fails the RUN if a row the app calls a sphere emits any number OR if
the tool calls a non-sphere row a sphere; matrix block 22 (28 SPHERE rows) with its five
smoke rows; and the `--only` guard on the connectedness gate's VALIDITY 2 and 3. Also
found from the remote rather than the docs: **twelve `frozen/*` tags are published,
`frozen/phase14` among them; only `frozen/phase5` is missing** (the session-18 doc still
said phase14 was owed — it was paid by the workflow run below).

## The readings BEFORE anything was touched (the shipped instruments, standalone)

| configuration | crowding D_max / D_mean (export) | plan coverage |
|---|---|---|
| shipping default | 2 / 1.12 | 38.3% of the disc uncovered · bald cap 5.34 mm |
| incurve target, flat | 6 / 2.47 | 0.0% · bald cap 0.08 mm (the pinned row) |
| incurve target × rise 0.50 | 5 / 2.06 | 0.0% · bald cap 0.08 mm (the pinned row) |
| the incurve sphere | 2 / 1.00 (face pole D 1, reserved D 1, reserved clear 1.62 mm) | SKIPPED — FULL SPHERE, labelled |
| 40 × 6 on a sphere (240 feet) | 2 / 1.01 (D_max at polar 83.1°, reserved clear 2.99 mm) | SKIPPED — FULL SPHERE, labelled |

Every number reproduces session 18's to the digit.

## The instrument

Covered iff a ray from the sphere's centre in direction (φ, θ) hits any petal triangle at a
positive ray parameter — foot rows and blade rows, never the hub shell or the designed
centre (coverage is a claim about petals; the plan raster makes the same exclusion). The
centre is `footRing()`'s own `dome.centreZ`: the cap's sphere on a CAP row, the closed
sphere's on a SPHERE row; a FLAT row is a labelled skip (no centre — the plan raster is the
parallel-ray limit of this instrument). Sampling is uniform in φ and θ (0.5°, refined to
0.25°), weighted by sin φ so the sums are steradians; the triangle index is binned in
(φ, θ) by each triangle's enclosing spherical cap. The kernel is the scalar-triple-product
cone test plus a t > 0 clause, and the SAME function serves the parallel-ray case.

**The real numbers against Phase A's estimate:** 666 lines against ~250 at the first
stop, ~900 after the ruling's additions; **2.0–8.2 s a row on this box, the sphere rows
2.5–3.7 s** against the estimated 1–3 s — the raster at both grids is 0.4–2.0 s, R5
1.2–1.7 s, and the mapped comparison (cap rows only, standalone only) 1.2–5.4 s.

### Validity — the load-bearing part

- **R0, the kernel's self-test**, through the real binning, before any petal is built: a
  synthetic soup (a triangle ahead on +z, one behind on −z, one straddling the θ = ±π seam
  at the equator) with eleven known answers, plus the parallel path.
- **R1–R3**, the petal capture against the owner — plan-coverage's own, verbatim.
- **R4**, converged: uncovered fraction within 1% and every bald angle within two coarse
  cells between 0.5° and 0.25°.
- **R5, the parallel-ray identity — exact, no tolerance.** This kernel with one vertical
  ray per cell of the plan raster's OWN grid (same n, same centres, same disc) must
  reproduce the plan raster's flag on EVERY cell: (a) against a verbatim copy of its 2D
  test, and (b) on rows the shipped `bloom-plan-coverage.mjs` measures, against its
  RETURNED `uncoveredFraction` and `baldCapRadius` to the bit. **Measured: 0 of 38,024
  cells differ on every row, and (b) holds to the bit on every row the shipped plan
  raster measures.** The sphere rows have (a) only, because the shipped tool skips them
  by design. **R5 has NO scope limit on rows without a centre** (Eva asked): it needs no
  centre — it is vertical rays against the plan raster's own grid — and since the ruling
  it runs on FLAT rows too, BEFORE the flat skip is decided; the skip line carries its
  count (`R5 still ran here: 0 of 38024 cells differ, equal to the shipped plan raster to
  the bit` on the shipping default and the flat incurve target). "All eight rows with a
  centre" in the first report was a description of the run as it then was, not a limit.
- **R6, the closed-form calibration of the MEASURE** (added on the ruling — R5 says
  nothing about bin resolution, the sin φ weighting, the θ seam or the poles, and every
  pin is in steradians). Once per process, before any row, through the same installed
  kernel and the same grids the rows use; tolerances stated, actual errors printed:

  | clause | fixture | tolerance | measured |
  |---|---|---|---|
  | R6a cells sum to 4π | the 360×720 and 720×1440 grids | 1e-5 relative | **3.17e-6 and 7.93e-7** |
  | R6b a closed sphere reads 0 open | a 48×24 UV sphere, 2,208 triangles, radius 5 | **0 sr, exactly** | **0 sr** |
  | R6c a known cone, +z pole | 360-triangle disc fan, half-angle 20°, distance 10 | 0.5% of the exact Van Oosterom–Strackee sum | **0.005%** (0.37892 vs 0.37890 sr) |
  | R6c a known cone, the θ = ±π seam | 12-triangle fan, one triangle CENTRED on the seam | 0.5% | **0.369%** (0.36194 vs 0.36328 sr — a coarse polygon's boundary at 0.25° sampling; the headroom is 26% of the tolerance) |
  | R6c a known cone, 45° off-axis | 360-triangle fan | 0.5% | **0.058%** |
  | R6c each cone's axis reads covered and its antipode uncovered | all three | exact | **holds on all three** |

  **The calibration failed its first run, and the failure was in the FIXTURE — reported
  here rather than quietly repaired.** The first UV sphere emitted the degenerate triangle
  at each pole ring and skipped the real one, leaving both 7.5° polar caps open. R6b read
  **0.107507 sr** open; two caps of half-angle 7.5° are analytically 4π(1 − cos 7.5°) =
  **0.107507 sr**. The measure read a fixture defect to six significant figures, which is a
  fourth calibration datum, and the fixture was corrected (the two conditions were
  swapped). The seam cone is COARSE on purpose: a 360-triangle fan has no triangle that
  straddles the seam by more than half a degree, so a lost wrap changed its reading by
  0.011% and witnessed nothing; a 30° triangle centred on the seam loses 15° of azimuth to
  the mutation and reads short by 3.7%.

### Eva's named validity check — measured exactly as asked, and it DISAGREES

"On the rise-1 hemisphere the solid-angle reading must agree with the plan raster mapped
through the sphere." Every central-ray sample inside the rim's polar angle was mapped to
its point on the cap, the plan raster's 2D test evaluated there, and the flags compared
sample by sample, solid-angle weighted. **No tolerance was widened. The numbers:**

| rise-1 hemisphere | agree | uncovered, central ray | uncovered, plan mapped | where the disagreement is |
|---|---|---|---|---|
| the incurve target | 75.54% | 24.46% | 0.00% | 0–60°: 100% agree, both 0% open · 60–75°: 88.9% (central 11.1%) · **75–90°: 15.8% (central 84.2% open, plan 0.0%)** |
| the mum | 74.02% | 28.25% | 2.27% | 0–15°: 82.9% (both open at the eye: central 83.6%, plan 66.5%) · 15–60°: 100% · 60–75°: 85.6% · **75–90°: 15.3% (central 84.7%, plan 0.0%)** |
| the shipping default | 86.51% | 62.95% | 49.77% | 0–45°: 100% (both 100% open) · 45–60°: 96.1% · **60–75°: 50.8% (central 50.3%, plan 1.2%)** · 75–90°: 96.8% |
| the incurve target × rise 0.5 (a 53° cap) | 89.99% | 10.01% | 0.00% | 0–45°: 100% · **45–53°: 63.1% (central 36.9%, plan 0.0%)** |

**The two instruments agree exactly wherever the crown is, and part company only at the
rim — and the reason is the ray, not a defect in either.** The plan raster asks whether a
VERTICAL line through a point on the cap meets a petal; this instrument asks whether the
RADIAL ray from the centre through the same point does. Those are the same ray only on the
axis. At the rim of a hemisphere the radial ray is horizontal: it leaves the centre, passes
under the canopy between the petal roots and out through the equator, while the vertical
line through the same rim point runs up through the blades above it. So the plan raster
reads the rim covered (correctly, for a viewer looking down) and the solid-angle reading
reads it open (correctly, for a viewer at the centre). The premise "there both instruments
see the same surface" is true of the SURFACE and false of the RAYS through it, which is
the kind of premise the charter says to check before building on. Per the brief this is
reported with its numbers, and the session stops here on it: **R5 is the check that is
exact by construction (the same rays through both formulations), and the mapped
comparison is a measurement of the two projections' geometry, not of the instrument's
correctness.** Which of the two is the load-bearing validity check is Eva's to rule, and
the pinning proposal below assumes R5 — if the mapped check is to be the criterion, the
instrument as specified (rays from the centre) cannot satisfy it on any cap with blades
that lean, and a different instrument (parallel rays through the sphere) would be a
second plan raster, not a solid-angle one.

### The negative control (`--negative-control`) — PASS, with witnesses

Three kernel mutations — **antipode** (the t clause dropped AND the antipodal cap binned:
the central version of the false clean), **inward** (rays cast toward the centre),
**no-wrap** (the θ seam lost) — each run three ways on the one cheap hemisphere row, as
Eva asked (a check that fails shows the gate fails, not that the clause aimed at is
load-bearing; session 18 suppressed S1 to make S3 a witness):

| mutation | every check on: first to fire | R0 SUPPRESSED, on the row | witness with no R0 at all (`calibrate()`) |
|---|---|---|---|
| antipode | R0 | **silent** — the row reads 62.95% open, face 67.13° | **R6c**: the seam cone's and the off-axis cone's ANTIPODE read covered |
| inward | R0 | **silent** — reads 81.48% open, face 90.13° (the whole-sphere fraction is invariant under the flip; the poles swap) | **R6c**: all three cones' own AXIS reads uncovered |
| no-wrap | R0 | **silent** — reads 81.49% open | **R6c**: the seam cone reads 3.7% short |

The second column is the honest one: on a real row a broken kernel changes the READING,
not a validity check — which is exactly why R6 runs before any row and why the gate
fails the whole run on it. A finding on the way: dropping the t clause ALONE changes
nothing, because a planar triangle that does not contain the centre subtends less than a
hemisphere and its bins never contain its antipode — the binning already encodes
direction, so the mutation had to break both. R5 is a LINE test by construction and
cannot see the sign of t either way; the header says so.

### The positive control, in a throwaway worktree — the instrument moves, the gate does not

Mutant W2: every blade row with 0.05 < u < 0.6 narrowed to 15% of its half-width (the
foot rows and the tip cap untouched, so the tip-cap validity — which caught a first,
cruder mutant W on the last row's half-width — stays quiet).

| row | export gate on the mutant | solid-angle reading, shipped → mutant |
|---|---|---|
| SPHERE: the incurve sliders | **1/1 watertight, every family green, a labelled coverage skip — NOTHING fires** | uncovered 4.20% → **27.23%** of 4π |
| SPHERE: 40 × 6 (240 feet) | not run through the gate | 24.98% → 33.69%; face region 2.58 → 2.89 sr |
| DOME: the incurve target, flat (pinned) | plan COVERAGE assertion only: 4.34% uncovered against 0.05% | (flat: no centre) |
| DOME: the incurve target × rise 0.5 (pinned) | plan COVERAGE assertion only: 4.22% against 0.05% | cap 10.01% → (not re-run) |
| the incurve target × rise 1 | — | cap 24.46% → 31.75% |

So on a SPHERE row a blade that no longer covers is invisible to both STL gates, J1–J9,
S1–S4, C1–C3, Z1–Z9, the thickness and form families and the crowding instrument alike —
exactly the hole the loud skip was cut for — and this instrument is the only thing that
moves. On the cap rows the plan raster's own assertion is the witness, as it should be.

## The readings — the rows the ruling is about

| row | uncovered of 4π | FACE pole: bald cone · connected open region | RESERVED pole: bald cone · region | nearest vertex to the axis (face / reserved half) |
|---|---|---|---|---|
| SPHERE: defaults (8 feet, R 8.25) | 52.98% (6.66 sr) | 17.88° (2.53 mm chord) · 6.66 sr (one region, the whole open sphere) | 0.12° · 0 sr (closed) | 2.36 / 0.11 mm |
| **SPHERE: the incurve sliders (R 12.51)** | **4.20% (0.53 sr)** | **0.13° · 0 sr — CLOSED**, the same emergent crown the cap rows pin | **4.38° (0.95 mm chord) · 0.22 sr (≡ a 15.2° cone)** | 0.11 / 1.05 mm |
| **SPHERE: 40 × 6, 240 feet (R 32.72)** | **24.98% (3.14 sr)** | **bald cone 2.63° (1.50 mm chord, 0.0066 sr) · connected open region 2.58 sr (≡ a 53.9° cone, reaching 88° from the pole)** | 0.12° · 0 sr (closed) | 1.46 / 0.11 mm |
| SPHERE: the mum sliders (R 4.69) | 0.00% | closed | closed | 0.13 / 0.09 mm |

**The face-pole solid angle on the 240-foot row, measured and not acted on** (the number
phase 2 asked for): the petals leave a CONNECTED open region of **2.58 sr** around the
face pole — not a bald cap (the nearest covered direction is 2.63° from the pole, a
1.50 mm chord) but a network of gaps between the innermost rings' blades reaching 88° down
the sphere. The designed DISC's footprint from the builder's own report is **rC = 24.54 mm
= 0.75 × the sphere radius, a 48.6° cone about the face pole, 2.12 sr** (so session 18's
"24.5 mm" is the RADIUS; the lid is 49 mm across). Of that cone **63.75% (1.35 sr) is
open to the petals**, and **1.79 sr of open sphere lies OUTSIDE the plate's cone** — so
the plate as it stands would cover about half the open solid angle at the face and leave
1.79 sr of gaps beyond its rim; a centre sized from a foot instead of the hub would cover
correspondingly less. Recorded for the phase-2 centre question, nothing changed.

**A finding the sheet did not have: the incurve sphere's RESERVED pole is not closed.**
Session 18 read it, by eye from below, as roofed by the overlapping bases of the first
rings' blades. From the centre, directions within **4.38° of the reserved pole hit no
petal** — a 0.95 mm-radius bald spot on the 12.51 mm sphere, inside a 0.22 sr connected
open region — and the vertex bound agrees in scale (no petal vertex within 1.05 mm of the
axis on that half). The feet are 1.62 mm from the pole (S3), the blades leave toward it,
and they close over it in projection from an off-axis camera without any of them crossing
the axis. Not a defect (the reserved pole is the STEM's someday, and a stem exits through
exactly that spot); it is the difference between a picture and a measurement, and it is
on the table for Eva's eye before any reserved-pole claim is pinned.

## The pins — RULED (Eva, Sep 5) and WIRED, with the headroom of every one

Approved as proposed with one change: the incurve sphere's reserved pole is PINNED AT ITS
MEASURED HOLE with headroom rather than left unpinned — "an unpinned measured hole is one
that can grow silently"; 0.95 mm is the known value, recorded with the phase-2 stem
work, and the bound trips on growth. A row in block 22 declares
`solidCoverage: { maxUncovered, maxFaceBaldDeg, maxFaceRegionSr, maxReservedBaldDeg,
maxReservedRegionSr }` (each optional), `solidAssert()` checks it, and the gate prints
`solidHeadroom()` on every asserted row so the margin is visible on every run:

| row | pin | reading | threshold | headroom |
|---|---|---|---|---|
| SPHERE: the incurve sliders | uncovered share of 4π | 4.20% | 4.6% | 8.7% |
| | face-pole bald cone | 0.1250° (one sample cell; closed) | 0.3° | 58.3% |
| | face-pole connected open region | 0.0000 sr | 0.001 sr | 100% |
| | **reserved-pole bald cone (the 0.95 mm hole)** | **4.3750°** | **5.0°** | **12.5%** |
| | **reserved-pole connected open region** | **0.2205 sr** | **0.25 sr** | **11.8%** |
| SPHERE: defaults (8 feet) | reserved-pole bald cone (closed) | 0.1250° | 0.3° | 58.3% |
| SPHERE: the mum sliders | reserved-pole bald cone (closed) | 0.1250° | 0.3° | 58.3% |
| SPHERE: 40 × 6 (240 feet) | reserved-pole bald cone (closed) | 0.1250° | 0.3° | 58.3% |
| SPHERE: 40 × 6 (240 feet) | face pole | 2.58 sr open | **not pinned** — open by design; phase 2's number | — |

(These are the figures the gate itself printed on the asserted rows, `--only` on the four pinned rows plus the two pinned cap rows and the shipping default: 7/7 watertight, 4 asserted, R5 mismatches 0 across every row, 389 s.)
A closed pole reads one sample cell (0.125° at the fine grid), so 0.3° is "closed within
two cells"; the bounds on the incurve total and its reserved hole are the plan raster's
precedent, measured plus roughly one part in ten. The proposal as it stood before the
ruling is kept below for the record.

1. **PIN the incurve sphere's FACE-POLE CLOSURE** — the same emergent-crown claim the two
   pinned cap rows already carry, now on the sphere: `maxFaceBaldDeg: 0.3` (measured 0.13°,
   which is one sample cell — numerically closed) and `maxFaceRegionSr: 0.001` (measured
   0). This is the claim a future tilt / curl / lean change would silently break.
2. **PIN the incurve sphere's total** at `maxUncovered: 0.046` (measured 4.20%) — an upper
   bound on the whole sphere, which is what "the bloom wraps the ball" means in a number.
3. **DO NOT PIN the reserved pole on the incurve sphere** until Eva has looked at the
   0.95 mm spot; **DO pin the reserved pole CLOSED on the three rows where it is** —
   defaults, the mum and the 240-foot row, `maxReservedBaldDeg: 0.3` (measured 0.12°) —
   because "the reserved pole is covered by converging tips" is session 18's Q4 claim and
   these are the rows on which it is measured true.
4. **DO NOT PIN the 240-foot row's face pole**: it is open by design (25% of the sphere)
   and the number belongs to the deferred centre question. Print its line; assert nothing.
5. The mum sphere reads 0.00% — pinnable as a curiosity, not proposed: it is a preset's
   behaviour, not a claim anyone made.

**Wired as ruled:** R6 once per gate run before any row (a failure fails the RUN); the
tool's `measure()` beside `planCoverage()` on every row, its line printed under the plan
raster's, R5 on every row including flat ones; a FLAT row a labelled skip; asserted on the
four declared rows with the headroom line; **a SPHERE row the instrument skips is a
validity failure**, and at matrix level at least one row must assert solid coverage and
at least one must be measured. The plan raster's sphere skip and its fail-if-emits clause
STAY — a plan raster cannot read a sphere — and the summary line now says every sphere
row was READ by the solid-angle instrument. The mapped comparison is not run in the gate
(ruled ill-posed; a reported number of the standalone tool only). ~40 lines in the gate,
~25 in the harness.

## The validity ruling — R5 is the standard; the mapped check is ILL-POSED (Eva, Sep 5)

Recorded so no future session re-proposes it as a bug: the brief's "solid-angle reading
must agree with the plan raster mapped through the sphere on a rise-1 hemisphere" asks
two DIFFERENT RAY FAMILIES to agree — a vertical line through a rim point and the radial
ray through it coincide only on the axis — so the 100% agreement inside the crown and the
divergence at 75–90° are both instruments being correct. R5, the same rays through both
formulations, exact and without tolerance, is the validity standard for this instrument;
R6 calibrates the measure the pins are stated in.

## Session-18 debt 1 — the `bloom-frozen-tags` run, read from its log

Run 33983799670 (dispatched from `main` at `dddd934`, 2026-09-05 18:21 UTC) — the job
log, fetched through the GitHub API this session, contains exactly: thirteen bases
resolved; `* [new tag] frozen/phase14 -> frozen/phase14` PUSHED; `! [remote rejected]
frozen/phase5 -> frozen/phase5 (refusing to allow a GitHub App to create or update
workflow .github/workflows/bloom-frozen-matrices.yml without workflows permission)`; the
script's read-back listing twelve tags PUBLISHED and `frozen/phase5 **NOT PUBLISHED**`;
its own explanation block; exit code 1. **The phase5 refusal is the only failure content.**
The only other thing in the log is a runner deprecation notice (`actions/checkout@v4` and
`setup-node@v4` target Node 20 and are being forced onto Node 24; a warning, not an
error, and not a failure of anything here). Session 18's inference was correct, and
`git ls-remote --tags origin` confirms twelve `frozen/*` tags including phase14.
**Recorded in the charter: this workflow fails BY DESIGN on every dispatch until phase5
is published from a user's clone (or `main` is protected and the tag is let go); a red
run of it is not new information.**

## Session-18 debt 2 — a charter amendment PROPOSAL for the docs-only collision (not made)

**The collision.** "No docs-only commits on a gated PR head — fold docs into the code
commit" (Sep 5, session 17) cannot hold for the RULING, because Eva's ruling on a sheet
arrives after the code is pushed and the gates have run — always. Session 18 recorded her
three rulings as a docs-only commit on a gated head, which cancelled two full-matrix runs
in flight and re-ran both (about an hour of runner time), exactly what the rule exists to
prevent; session 19 will hit the same wall at its own close.

**The options, costed:**

- (a) *Rulings go in a docs commit that deliberately re-triggers the gates.* Honest and
  simple; costs ~1 h of runner time per session, for a run that certifies the same gated
  bytes a second time. This is what session 18 did by accident.
- (b) *Rulings are recorded post-merge, in a docs-only PR of their own.* A docs-only PR
  touches no gated path, so no bloom gate runs at all (the filters are on the PR diff).
  Costs a second PR and a second merge per session, and puts the ruling on `main` a few
  minutes after the code rather than in the same squash — the ruling's commit still names
  the PR it answers.
- (c) *Rulings go in the outcome doc BEFORE the code push.* Impossible in general: the
  ruling is made from the sheet, which is rendered from the pushed code.
- (d) *The session leaves the ruling to the NEXT session's kickoff prompt* (Eva's brief
  already carries her rulings verbatim). Costs nothing in CI; costs a session-long window
  in which `main` does not record the ruling, and the charter has already been wrong
  across such a window twice.

**Proposed amendment — (b), targeted at the Sep 5 session-17 ruling "NO DOCS-ONLY COMMITS
ON A GATED PR HEAD" in the charter's CI conventions, as its one exception — APPROVED
(Eva, Sep 5) with one condition: the docs-only PR is opened AND merged by the same
session, before it reports DONE; a ruling that depends on a future session to record it
is not recorded. Recorded in the charter by this session's own docs-only PR, which is the
amendment's first use. The proposal as put:**

> *EXCEPTION, ruled ___ (Eva): a RULING made from a sheet after the code has run its gates
> is recorded in a DOCS-ONLY PR of its own, opened and merged by the session as its last
> step after the code PR merges — never as a docs commit on the gated head. A docs-only PR
> runs no bloom gate (the filters read the PR diff), so it is free; its commit message
> names the code PR it rules on; and the session's `DONE` line carries BOTH shas. The
> outcome doc and the charter entry still go in the CODE commit, written to the point of
> "held for Eva's ruling", so the docs-only PR is the ruling and nothing else.*

The first use is this session: the code PR carries the tool, the gate, the pins and this
document; the docs-only PR that follows its merge carries the charter's ruling text and
the two merge shas.

## What this session did not touch — predeclared, verified at close

Predeclared before a line was written, as a sha1 manifest taken from a worktree of
`dddd934`: `bloom-geometry.js`, `bloom-registry.js`, `bloom.js`, `bloom.html`, every
`flower*` file, `tools/chromium-harness.mjs`, the flower gates, the cards and tracker
files and their gates, `tools/bloom-crowding.mjs`, the connectedness and panel gates,
`tools/diff-bloom-bytes.mjs`, `tools/publish-frozen-tags.sh`, every workflow file — 51
files. Touched: the new tool; `verify-bloom-export.mjs` (the wiring: calibration once,
the line on every row, the assertion on declared rows, the sphere-row and matrix-level
clauses, and the summary line); `bloom-harness.mjs` (four `solidCoverage` pins in block
22 — labels verbatim, so the smoke subset's drift guard is unmoved); one wording change
in `bloom-plan-coverage.mjs`'s skip message; this document; the session-18 outcome doc
and the charter where the "24.5 mm" was recorded as if a diameter; and the CLAUDE.md
pointer. **Verification is at the end of this document.**

**No new frozen tag is owed** (stated rather than left ambiguous): the matrix's ROW SET
and every row's SET are unchanged — four rows gained a `solidCoverage` field, nothing
moved a byte — so `phase14` (499 rows at 5312845) remains the newest baseline and
`frozen/phase14` is already on the remote. The next baseline freezes at the next
geometry change, from `main`, tagged at freeze time.

## Corrections carried

- Session 18's outcome doc and charter recorded the DISC footprint on the 240-foot row as
  "24.5 mm across". It is the RADIUS (`rC = 0.75 × 32.72 mm = 24.54 mm`, from the
  builder's own report); the lid is 49 mm across. Corrected at both sites and in CLAUDE.md
  so phase 2 does not inherit a figure half the real one.
- The sizing miss is at the top of this document.

## Verification (the final tree, after the ruling)

- `node tools/bloom-solid-angle-coverage.mjs`: R6 calibration PASS (the table above); 10
  configs, 8 measured (2 FLAT skips, each still carrying R5), R0–R5 clean on every row, R5
  0 of 38,024 cells on all ten and bit-equal to the shipped plan raster on every row it
  measures. `--negative-control`: PASS — three of three caught with every check on, and
  each naming its own R6c witness with R0 suppressed (the table above).
- `node tools/verify-bloom-export.mjs --only` on the four pinned SPHERE rows, the two
  pinned cap rows and the shipping default: 7/7 watertight, calibration PASS, 5/7
  solid-angle measured (2 FLAT, labelled, R5 0 mismatches on them too), 4 rows asserted
  with the headroom lines quoted in the pins table, R5 mismatches 0 across every row,
  389 s.
- The smoke subset (`node tools/bloom-smoke.mjs`, export-only — no new geometry mode this
  session) on the final tree: 33/33 watertight, 0 degenerate, identical counts, every
  family green, 4 SPHERE rows each a labelled PLAN skip AND read by the solid-angle
  instrument, 6/33 solid-angle measured, 2 asserted (the pinned rows in the subset),
  218 s. (Before the ruling, the same subset on the first tree: 33/33, 224 s and 248 s.)
- The retention close: `phase14Matrix()` (499 rows frozen at 5312845, the newest baseline)
  exported from a worktree of `dddd934` and from the head: **499/499 byte-identical, 0
  moved, defaults bit-identical** (both trees read "dddd934+dirty" from the gitignored
  node_modules symlink, nothing else). Byte identity is a construction here (no geometry
  file changed, by sha1) and was measured anyway on the brief's instruction.
- The full 527-row matrix on both STL gates runs in CI on the merge commit — the merge
  criterion, not run locally (session 17's ruling).

- The predeclared untouched list: all 51 files byte-identical to `dddd934` by
  `sha1sum -c` at close, re-verified after the ruling's edits (the harness and the export
  gate were never on the list; the three geometry files, `bloom.html` and every flower,
  cards and tracker file were); all fourteen frozen matrix functions (legacy,
  phase2–phase14) and `FROZEN_BASE_COMMITS` deep-equal to the base tree's by a JSON
  comparison of their output (sha1 `0f5fab7c…` on both trees);
  `git ls-remote --tags origin` reads twelve `frozen/*` tags (phase2–phase4, phase6–phase14).
- CI on the pushed head: the four bloom gates plus the two flower gates (path-filtered on
  `tools/**`, testing flower geometry — not evidence about this instrument). The full
  matrix is CI's job and was not run locally.
