# Organic variance, build 2 of 3 — FORM: what was built, what was measured, and what is waiting on a ruling

The second of the three builds ruled in `docs/bloom-organic-variance-discovery.md` §9 (Eva,
Sep 17): the FORM amount, reading the SHARED frequency and phase of build 1. Every figure below
names its MODE and its SAMPLING. **The branch is not merged and no PR is open: the hazard
measurement in §4 un-accepts the accepted-look ruling at the top of the range, X2 reddens on
fourteen rows of the new block, and the brief says that is Eva's to rule on before anything is
declared.**

## 0. Reconciliation (before any work)

`main` since `398b9e7`: one commit, **#306** (`2fee3f7`) — merged Sep 29, a colour-change page
(`color-change.css/html/js`, `tools/verify-color-change.mjs`). It touches no bloom file and
nothing in this brief collides with it. PRs #312–#319 are closed DISPOSABLE C19 trigger probes
from #307. **No form-variance work exists anywhere** — not on `main`, not on a branch, not in an
open PR (open PRs: #111, #230).

## 1. Housekeeping (committed separately, first)

`tools/bloom-petal-separation.mjs` promoted, and the size addendum written as §13 of
`docs/bloom-organic-variance-size-outcome.md`. Two corrections to what the last session reported:

- **The triangle count is NOT independent of the amount.** That report compared each base's
  first count against its MAXIMUM, and every move is a fall, so none could show: the four stacked
  6-layer corners lose up to 960 of 731,232 at size 0.50. Mechanism not traced; recorded as a
  hypothesis (the rim bead's degeneracy skip on half-size inner petals).
- **The corners were five, not four** (16 bases × 9 = 144).
- **The hub-ring reason is VERIFIED** (`--foot`): `petalSurface`'s `footRowsAt` reads
  `ring.radius`, `ring.width`, `ring.overhang` and `slot.z` and no `slot.scale`; 18 foot rows at
  the slot's own scale and at half of it, 0 differ under `Object.is`.
- Eva's ruling recorded: the foot is left alone; uniform bases accepted; closed.

## 2. The control set — declared before the field was written

Ruling 3 names the set: *"the form deltas at each control's base range (spine curl −180..360,
cup −0.8..1.2, twist −180..180, clamped once into `OVERRIDE_BOUNDS`)"*. So:

| control | in/out | why |
|---|---|---|
| `petalSpineCurl` | **IN** | named by ruling 3 |
| `petalCup` | **IN** | named by ruling 3 |
| `petalTwist` | **IN** | named by ruling 3; it had no role row, so its bound is declared in `FORM_VARIANCE_BASES` and checked against the registry control at harness load |
| `petalTilt` | out | the descending seam fold fires from −8° and the floor is 0 (discovery §3) |
| `petalTipShape` | out | sets the row count per petal (`bladeRowsFor`), so a per-slot value is a TOPOLOGY change; it owns the apex outline |
| `petalRoll`, `petalRollTaper` | out | not in the ruling; roll-max is the widest single-control fold the combination gate holds (0.658 mm) |
| `curlBias`, `curlStart` | out | redistribute a curl, not a curve of their own |
| `petalCupGradient` | out | composes with cup into ONE coefficient (#265's sum rule) — varying both is one control twice |
| `buckleAmp`/`Freq`/`Env` | out | the buckle's phase is already per slot (`slotIndex * GOLDEN_ANGLE`); its amplitude is clamped against the curvature budget |
| length, width, lobes, fringe, tip end | out | outline, not form; size is build 1's |

**The delta at amount A is `A · g(θ) · half-span`** — half of each control's own range (270°,
1.0, 180°). "At each control's own base range" is read as a FRACTION of that range, the one
reading under which one amount means the same thing to three controls with three units. **That is
a decision made without a ruling.** At A = 1 a slot can be pushed half its control's range either
way from where the whorl puts it.

**All three deltas share ONE `g(θ)`**, because ruling 2 gives one frequency and one phase. The
consequence is the finding in §4: the slot at the crest takes curl, cup AND twist at their
maxima together.

## 3. What was built

- `bloom-geometry.js` — `varianceWave()` holds the shared wave (the size field's own expressions,
  moved verbatim; the byte partition in §5 is what says the size field is the same doubles);
  `formVarianceField()` (null at amount 0 — the guard); the whorl primitive hands every slot
  `formTerm` (null with no field); `resolveRoleOverrides` takes the slot term LAST, after every
  table row, and clamps ONCE (`composedBoundsOf`); `petalSurface` takes `petalStateForSlot` only
  where the slot carries a term, so the shipped path is `petalStateFor` verbatim; the omission
  mask is handed the field. Each petal records `formTerm`, `formClamped`, and `applied` gains
  twist. **And a build-1 defect fixed:** the sepal scan's congruence key was (descriptor,
  relative azimuth) only, so under ANY per-slot field it tested one sepal for a whorl of distinct
  neighbourhoods — SP8 found it on the first form row. The key now carries each facing petal's
  size factor and form value; with no field every suffix is identical and the grouping is
  unchanged (measured: the size-and-sepals row moves 0 floats; it read 1 configuration where 8
  exist, and the limit came out the same).
- `bloom-registry.js` — `varianceForm` (0–1, step 0.01, default 0), `varianceFormPresent`, and
  the shared frequency and phase now visible when EITHER amount is (`varianceAnyPresent`).
- `bloom.js` — the FORM VARIANCE read-out line (the curl / cup / twist range over the petals
  built, the clamp count, ALIASED), the frequency/phase controls' record fallback, and the
  metrics (`formVariance`, `varianceFormAbsent`, `petalSlotForms`).
- `tools/bloom-harness.mjs` — FV0–FV4 (§6), Z2 hands the three varied bases to FV2 on a petal
  carrying a term, `effectiveFor` reads the FIRST BUILT petal (it read ring 0's entry, which is
  NULL where the sphere stem omits slot 0), block 43 (19 rows), `phase47Matrix()`.
- Both coverage instruments hand the whorl the form field (R3 fired on the first form row, as it
  did for size).

## 4. THE HAZARD — the accepted-look ruling does not survive the top of the range

`node tools/bloom-form-variance-hazard.mjs` (an instrument, wired to no gate): the combination
gate's own `self` measure (`measureWall`, imported, with its `nibFromU`) on **EVERY PETAL**, EXPORT,
form at 1, frequency 1 and 20, phase 0 and 90.

**The shipping default with form at 1** — petal self-approach, 8 petals, f 1 phase 0:
`0.076 0.234 1.238 0.323 0.467 0.323 1.238 0.234` mm. The worst petal is the crest (curl 270, cup
1.0, twist 180): **0.076 mm against the 1.0 mm bar.** The aliased regime (f 20 phase 0) reads the
same worst and puts it on four petals; f 20 phase 90 on 8 slots is `cos(k·180° + 90°) = 0` on
every slot, so the field is exactly zero there and the bloom reads 1.238 throughout.

**The four declared pairs, per-petal excursion vs the declared worst:**

| pair | declared worst | worst per-petal under the field | from SLIDER states that clear on their own |
|---|---|---|---|
| cup × roll | 0.002 mm (0.6 × 270) | 0.000 mm | 5 clear cells → worst 0.003 mm; **15 of 20** runs put a petal under the bar |
| curl × twist | 0.007 mm (360 × 180) | 0.007 mm | 10 clear cells → worst 0.021 mm; **30 of 40** |
| cup × tip shape | 0.743 mm (1.2 × 3.00) | **0.000 mm** | 7 clear cells → worst **0.000 mm**; **21 of 28** |
| leaf × stem | 0.000 mm (85°) | — | a leaf takes no form field: identical under `Object.is` on **48 of 48** (cell × setting) |

(In each "from clear" count the runs that stay clear are the f 20 / phase 90 runs, where the
field is exactly zero on 8 slots.) So: **a bloom whose sliders sit where every declared pair
clears can hold a petal under the bar at every setting of the field that draws a wave.**

**Where it starts — the amount at which the first petal goes under 1.0 mm** (`--sweep`, 0.01 steps
from 0.30, EXPORT):

| state | f 1 | f 20 |
|---|---|---|
| the default | 0.49 (0.972 mm at curl −132, cup −0.49, twist −88) | 0.49 (aliased) |
| 40 petals | 0.49 | 0.49 |
| 3 petals | 0.54 | 0.54 (aliased) |
| FAN | 0.54 | 0.49 (aliased) |
| CONTINUOUS × 3 turns | 0.45 | 0.46 (aliased) |
| 3 whorls | 0.45 | 0.45 (aliased) |
| tilt 75 | 0.49 | 0.49 |
| sheet 2.40 | 0.63 | 0.63 (aliased) |

**The aliased regime reaches the hazard at the same amount, not a smaller one** — aliasing changes
WHICH petals take the extremes and how many (four crest petals at f 20 against one at f 1), never
how far one petal goes, because every slot's term is bounded by the same `A · half-span`.

**THE MECHANISM IS A THREE-CONTROL CORNER NOTHING HERE MEASURES.** Every worst petal carries curl,
cup AND twist together, because one `g` drives all three. The combination gate is two-control by
construction. The same triple on the SLIDERS with no variance at all:

| sliders, EXPORT | within-shell pairs | worst span |
|---|---|---|
| curl 270 × cup 1.0 × twist 180 | **688** (= 8 × 86) | **0.8771 mm** |
| curl 270 alone | 0 | — |
| curl 270 × cup 1.0 | 1,472 | 0.2295 |
| curl 270 × twist 180 | 168 | 0.4034 |
| cup 1.0 × twist 180 | 0 | — |
| **form amount 1, the default** | **86** | **0.8771** — the triple, on one petal |

So form variance does not invent a new fold: it puts a slider-reachable triple-corner fold on one
petal of a bloom whose sliders are at their defaults.

## 5. X2 — it reddens, and nothing was declared

Block 43 through the real export gate (`verify-bloom-export.mjs --only`, Chromium) and the same
rows censused in Node — **the two agree on every row**. Every other clause (FV0–FV4, VS, Z, J, SP,
ST, O, X0…) passes on all 25 rows run.

| row | within-shell pairs | worst span |
|---|---|---|
| `varianceForm max (1)` (blanket sweep) | 86 | 0.8771 |
| amount 1 · phase 180 · × 3 petals · × FAN phase 90 · × SEPALS · × LEAVES | 86 each | 0.8771 |
| 20 cycles on 8 slots (ALIASED) | 344 | 0.8771 |
| × SPIRAL | 160 | 0.8771 |
| × CONTINUOUS × 3 turns | 410 | 0.8771 |
| × 40 petals (20 cycles, not aliased) | 1,720 | 0.8771 |
| × a SPHERE with a stem | 59 | 0.4981 |
| × 3 whorls, curl 180 + innerCurl 360 | 4,273 | 0.9467 |
| × size ±50 % | 92 | 2.1669 |
| amount 0.40 · 0.01 · the ramp · 20 cycles phase 90 · both GATED | **0** | — |

**Fourteen rows, none declared.** Per the brief, no xfail entry was added and nothing was
clamped. **`ALL MAX`** (the blanket sweep hands it form 1) moves **91,808 → 99,004 pairs**, worst
span unmoved at 10.1332 mm, triangle count unmoved at 3,090,816 in both modes (its export refusal
holds); its census entry is NOT re-recorded yet, for the same reason.

**The census onset on the default is between 0.60 and 0.80** (0 pairs at 0.40 and 0.60, 48 at
0.80, 86 at 1.00). `self` goes under the bar earlier (0.49): the two measure different things —
the census a fold, `self` an approach.

## 6. The harness — FV0–FV4

Both STL gates are blind to all of it: a per-slot curve moves vertices on a fixed lattice.

- **FV0** the two statements (registry `varianceFormPresent` against the geometry's
  `varianceFormIsAbsent`, through the page).
- **FV1** the record is null iff amount 0 (and then every petal's term and clamp report are
  null); when present, every petal's term is restated from the CONTROLS and its EMITTED azimuth,
  half-spans read off the REGISTRY's control ranges — never the geometry's `halves`.
- **FV2** the value the blade was built with (`applied`) is the ROLE TABLE's composition from the
  UI plus the term, clamped ONCE into the registry control's range; and `formClamped` names
  exactly the bases that clamp moved.
- **FV3** fan mirror petals carry identical terms, not vacuously.
- **FV4** one wave, one aliasing judgement (the size and form records agree; `f > nyquist`).

## 7. Amount 0 is byte-inert — the whole matrix, both modes

`node tools/verify-bloom-surface-bytes.mjs --base <worktree of 2fee3f7> --movers-predicate
variance-form`, 48 chunks merged:

    MERGED 48 chunks over 992 rows x 2 modes, predicate variance-form
    partition     : 19 of 19 predeclared movers MOVED (every one must), 973 holders compared to the bit
    export stream : 1,293,491,196 floats over 143,721,244 triangles
    captured grid : 80,703,620 values over 9,296 panels (live)
    PASS — 0 floats moved on the 973 holders, positionally, under Object.is

**Movers predeclared from the guard function** (`varianceFormIsAbsent`), never from labels: the
17 non-GATED block-43 rows, `varianceForm max (1)` and `ALL MAX`. **The holders include every one
of `main`'s 971 rows except `ALL MAX`** — every SIZE-variance row among them, which is the
measurement that factoring the wave out of the size field moved no size float, and the full-matrix
closure of build 1's 909-row gap for the size amount at 0 as well. `--control` fires BOTH clauses
on a holder (`1 of 222192 floats moved … grid — 1 of 4430 values moved`).

**REDEFINED: `ALL MAX` gains `varianceForm 1`** through the blanket sweep (build 1's precedent for
the size amount); the two blanket rows `varianceForm min/max` are inserted into block 1, not
appended, because that is where the sweep writes them. The surface-bytes tool builds each row's
own state on both trees, so it does not pair by index.

## 8. Separation, determinism, live = export

- **Separation** (`tools/bloom-petal-separation.mjs --field form`, 144 builds, 128 with the field,
  EXPORT, calibrated): **every build one connected piece at 0.6 mm.** The triangle count RISES by
  up to 1,920 on the 6-layer corners (731,232 → 733,152) and 96 on the 3-petal 6-layer corner;
  1-layer bases unmoved.
- **Determinism** (`verify-bloom-build-order.mjs`, 45 variance rows × 2 modes, forward / reverse /
  shuffle in three separate processes): **every digest identical, bit for bit.** No
  `Math.random`, no `Date`; the field is a pure function of the controls and the emitted azimuth.
- **Live = export**: the triangle count is equal in both modes on every block-43 row (Node) and on
  every row the gate reached (Chromium).

## 9. Mutants and must-fails

Six new, each witnessed on the MUTATED module's own per-petal record, never on the FV clause it
names; the clean tree SILENT on every row; all 83 anchors match exactly once.

| mutant | names | fired |
|---|---|---|
| `form-field-never-reaches-the-blade` | FV2 | FV2 |
| `form-amount-0-is-not-the-identity` — **the standing mutant for the form guard** | FV1 | FV1 |
| `form-clamped-twice` | FV2 | FV2 |
| `form-guard-moves-off-zero` | FV0, FV1 | FV0, FV1 |
| `form-half-span-is-the-whole-range` | FV1 | FV1 |
| `fan-field-is-not-even` (build 1's, now also the form field's) | VS1, VS3, FV1, FV3 | all four (+ AN0–AN2 collateral) |
| `aliasing-is-never-told` (widened likewise) | VS4, FV4 | both |

Also re-run: `amount-0-is-not-the-identity` and `size-field-never-reaches-the-blade` (anchors moved
into the shared wave; both fire their names). **The neuter control, judged on its own witness**
(#307's fix): `--only=form-amount-0-is-not-the-identity --neuter=…` reports *"the edit applied but
the BEHAVIOUR did not move — at amount 0 the mutant carries 0 petal term(s) (no record)"* and the
guard check passes on THAT mutant's report. **A SUBSET: 9 of 83 run.**

The smoke census (`bloom-smoke --check`) rose to 39 blocks, 132 rows, 126 families, FV0–FV4
claimed both ways. The panel gate passes (its `--negative-control` was NOT run).

## 10. The registry gap (report only)

Ruling 5 wants the sepal frequency and phase to DEFAULT to the petals' values. A registry default
is a literal (`default: 1`), `DEFAULTS` is derived from those literals, every gate's read-back
compares against `DEFAULTS`, and a range input always holds a number — so "unset, follow the
petals" has no representation anywhere. What it would take: **a CHOICE per followed property**
(`sepalVarianceFrequencyFrom`: PETALS / OWN, default PETALS) with the sepal slider hidden and inert
at PETALS (the ordinary `visibleWhen` guard), and the geometry resolving `PETALS` to the petal
control's value in `sepalBladeState` — no new registry mechanism, the coherent case the
out-of-box one, a saved design that says PETALS keeps following, and the panel gate's existing
hidden-AND-inert routes covering it. The alternative, a `follows:` field on the row, touches
`DEFAULTS`, `readUI`, the read-back in both STL gates and the panel gate's census, and would be the
registry's first non-literal default. Its own PR, after build 3.

## 11. Not done, named

- **No xfail entry, no clamp, no ALL MAX re-record** — §4/§5 are Eva's.
- **No PR and no push.** CLAUDE.md: while a ruling is outstanding, commit locally and do not push;
  a PR starts the 3.5-hour gates, which would read red on X2 by construction.
- **`frozen/phase47`** (the 971 rows at `2fee3f7`) is registered in both maps and proved
  deep-equal (`--verify-frozen --phase47`: PASS); **not dispatched** — the dispatch follows the
  merge. **No workflow file is edited by this branch**, so nothing here costs a tag.
- **No panel route for the FORM VARIANCE line** (route (y) covers the size line); and no clause
  asserts a SEPAL carries no form term — the sepal whorl is simply not handed the field.
- The full mutant sweep (74 not run) and the panel gate's negative control.
