# Organic variance, build 2 of 3 — FORM: what was built, what was measured, and what is waiting on a ruling

The second of the three builds ruled in `docs/bloom-organic-variance-discovery.md` §9 (Eva,
Sep 17): the FORM amount, reading the SHARED frequency and phase of build 1. Every figure below
names its MODE and its SAMPLING.

**READ §12 FIRST, then §19 (headroom scaling — the clamp is gone from the field's path) and §21
(the four triples).** §4 and §5 are the measurements that stopped the first build: one wave drove
curl, cup and twist together, so the crest petal took all three maxima at once and X2 reddened on
fourteen rows. Eva ruled on them (Sep 30): **the three bases take fixed phase offsets off the shared
wave — the offset law, §12** — and the curl-360 fold the field can still reach is **DECLARED**, not
clamped (§13). §4/§5 are kept as the record of the single-g law; every figure after §11 is the
offset law's.

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

## 11. Not done, named (superseded by §12–§17 for everything the rulings closed)

- **No panel route for the FORM VARIANCE line** (route (y) covers the size line); and no clause
  asserts a SEPAL carries no form term — the sepal whorl is simply not handed the field.
- The full mutant sweep locally (CI runs the table) and the panel gate's negative control.

## 12. THE OFFSET LAW (Eva's ruling 1, Sep 30)

**Curl, cup and twist read the SAME wave, each advanced by a fixed phase offset a third of a cycle
apart, so no petal receives all three maxima.** Five controls, not eight: the offsets are constants
of the law and are not exposed, so ruling 2 (one frequency, one phase) holds exactly.

    FORM_VARIANCE_OFFSET_DEG = { petalCup: 0, petalSpineCurl: 120, petalTwist: 240 }
    term[base] = A · g(θ, offset[base]) · half-span[base]
      ring:  g = cos(fθ + φ + offset)          fan:  g = cos(f|θ| + offset)   (still even)
      ramp:  the seam slides a fraction offset/360 of the way round (see §14b)

`bloom-geometry.js` owns the constants beside `FORM_VARIANCE_BASES`; `tools/bloom-harness.mjs`
**restates them** (`FORM_OFFSET_DEG_RESTATED`), never imports them, so FV1's reference has a
different owner from the quantity under test and a tree whose offsets have gone back to zero fails
FV1 — the standing mutant `the-form-offsets-collapse-to-zero` is that witness (§16).

**Why this assignment.** Under a 120° spacing every PAIR of the three meets at +0.5 / +0.5 on some
petal whatever the assignment — where one base is at its crest the other two sit at cos 120 = −0.5,
and midway between two crests two sit at +0.5 and the third at −1 — so the assignment does not
choose which pairs meet. What it chooses is which base is at its crest on the wave's ORIGIN (the
phase-0 petal of a ring and, on a FAN, the petal on the mirror line) and the order the others
follow outward. **Cup takes 0:** a fan is read face-on and its mirror-line petal is the lip; cup is
the one form a face-on eye reads as the petal opening or closing, so the variance reads first as the
lip cupped rather than turned. **Twist takes 240**, putting its crest a third of a cycle out
(cos(fθ + 240) peaks at fθ = 120) — the petals turning from facing the viewer to edge-on, where a
twist is what that turn is. **Curl takes 120**, crest two thirds out, on the petals seen nearest to
profile, the only view in which a spine curl reads. Outward from the origin: cup, cup + twist,
twist, twist + curl, curl, curl + cup.

**The size field is untouched by construction and by measurement:** `gAt(az, 0)` returns `g(az)` by
BRANCH (never `x + 0`), and the full-matrix byte partition (§15) holds every size row to the bit.

## 13. What the law changed — re-measured, and the one row that still reddens

**The three-way excursion, worst petal `self`, form amount 1, EXPORT, every petal**
(`node tools/bloom-form-variance-hazard.mjs --headline`):

| state | f 1 ph 0 | f 1 ph 90 | f 20 ph 0 | f 20 ph 90 |
|---|---|---|---|---|
| the DEFAULT bloom (8) | **0.527** | 0.527 | 1.097 (aliased) | 0.527 |
| FAN (7) | 0.620 | 0.620 | 1.097 | 1.097 |
| CONTINUOUS × 3 turns (24) | 0.358 | 0.375 | 0.311 | 0.305 |
| 3 whorls (24) — first crossing 0.45 under the old law | 0.334 | 0.334 | 0.331 | 0.334 |

Against the 1.0 mm bar every drawn wave still puts a petal under it — **0.076 → 0.527 mm on the
default**. The worst petal is no longer all three at their crests: it is **curl ≈ +234° with twist ≈
−156° and cup ≈ 0**, the curl × twist pair at opposite signs. The first amount at which the
default's worst petal goes under the bar moved **0.49 → 0.70** (`--sweep`, f 1; f 20 clears at every
amount to 1.00).

**The 1.0 mm bar is an ADVISORY margin; X2 is the gate** (Eva's note, for her benefit). `self` is a
nearest approach between two faces of one petal; X2 is whether the solid passes through itself.
Whether a 0.527 mm gap between two faces of one petal survives an FDM nozzle is a question only the
coupon print answers — nothing in this project has ever been printed.

**X2, block 43, Node census, EXPORT: 13 of the 14 rows that reddened under the single-g law now read
0 pairs.** The default at amount 1, phase 180, 3 and 40 petals, FAN, SPIRAL, CONTINUOUS × 3, the
aliased rows, the sphere with a stem, size ±50 %, sepals, leaves — all 0.

**The one that still reddens, and Eva's ruling on it: DECLARE, do not change the field's reach.**

| row | field OFF (same controls, amount 0) | field ON | the field's |
|---|---|---|---|
| `FORM VARIANCE: x 3 whorls with innerCurl 360 on curl 180` | **1,968** pairs / 0.4218 mm | **4,080** / 0.7533 | 2,112 |
| `ALL MAX` (export-refused; Node) | **91,808** / 10.1332 (main's own) | **116,847** / 15.8503 | 25,039 |

It is **the declared curl-360 fold reached through the field** (`petalSpineCurl max (360)`, 920 /
0.5158 on `main`): curl 180 + 270 clamps to 360. The controls say so — one whorl at curl 180 reads 0
off and 427 / 0.7078 on; three whorls at curl 180 with `innerCurl` 0 read 0 off and 1,577 / 0.7533
on. The row's composed base state folds by itself (see §17 — it has no row on `main`). Eva's reasons,
recorded: (1) curl 360 is already a declared fold, so this is a new path to a known place; (2) the
worst row is majority pre-existing, 1,968 of 4,080; (3) capping the field's curl would make it weaker
than the slider for one control only and buys nothing — curl 360 is directly settable — and headroom
scaling or a soft clamp is a fifth typed threshold. Both entries are in `SELF_INTERSECTION_XFAIL`
with both numbers in their text; X1 reads them in both directions. `ALL MAX` under the single-g law
read 99,004 / 10.1332.

## 14. Three measurements Eva asked for (none changes the ruling)

### 14a. The clamp is flattening the variance

20 petals, amount 1, frequency 1, phase 0, EXPORT; how many DISTINCT values each varied control
takes, and the fraction pinned at a range end:

| control at | distinct | pinned |
|---|---|---|
| curl −180 | 11 of 20 | 10 at −180 — **50 %** |
| curl 0 (the default) | 15 | 6 at −180 — **30 %** |
| curl 90 | 20 | 0 — 0 % |
| curl 180 | 15 | 6 at 360 — **30 %** |
| curl 270 | 13 | 8 at 360 — **40 %** |
| curl 360 | 11 | 10 at 360 — **50 %** |
| cup −0.8 / 0 / 0.6 / 1.2 | 6 / 10 / 9 / 6 | 50 % / 25 % / 25 % / 50 % |
| twist −180 / 0 / 90 / 180 | 11 / 20 / 14 / 11 | 50 % / 0 % / 35 % / 50 % |

**A meaningful fraction is pinned at every slider position but the range's own middle** — and at
the shipped default curl of 0 already 30 % of petals sit identically at curl −180, because 0 − 270
passes the −180 floor. At a slider end half the petals are identical. (Cup's counts are halved
further by the wave's own symmetry: cup takes offset 0, so mirror azimuths ±θ read the same value
without any clamp.) Reported, not fixed; Eva rules on it separately. **(RULED: headroom scaling, §19 — zero
pinned at every interior slider setting.)**

### 14b. The fan's ramp seam

On a FAN at frequency 0 the offset slides each base's ramp, so curl (120) and twist (240) gain a
seam the fan's ramp did not have; cup (0) does not. **It shows in neither instrument:** X2 reads
**0 pairs** on all four fan ramp states (default, 6 and 1 per side, no centre petal) at amounts 0.5
and 1, where the single-g law read **172 / 0.8771 on every one** (the triple at the fan's edge); and
the neighbour approach is crossing on the shipping fan with the field off, so a seam cannot move
it past a state it is already in. **It is in the look:** on the default fan (3 per side) at amount 1
curl steps from **+90° on the mirror-line petal to −180° on its two neighbours** — a 270° jump
between adjacent petals, where the single-g ramp stepped 90° per petal monotonically outward — and
twist steps from +60° to −180° between the first and second petal out. Visible at any amount above 0,
frequency 0, FAN only.

### 14c. The composed base state

In the shortlist, §17.

## 15. Amount 0 is still byte-inert — re-run at the full matrix under the offset law

Not taken by construction (Eva: that reasoning let build 1's 909-row gap and the sepal grouping
defect sit unnoticed). The same chunked driver, 48 chunks, worktree of `2fee3f7`:

    MERGED 48 chunks over 992 rows x 2 modes, predicate variance-form
    partition     : 19 of 19 predeclared movers MOVED (every one must), 973 holders compared to the bit
    export stream : 1,293,491,196 floats over 143,721,244 triangles
    captured grid : 80,703,620 values over 9,295 panels (live)
    PASS — 0 floats moved on the 973 holders, positionally, under Object.is

## 16. Re-measured under the offset law

**The four declared pairs** (the same grids and settings as §4):

| pair | worst per-petal, single-g → offset | from clear cells, single-g → offset | runs under the bar |
|---|---|---|---|
| cup × roll | 0.000 → 0.000 | 0.003 → 0.018 | 15/20 → **16/20** |
| **curl × twist** | **0.007 → 0.000** | **0.021 → 0.000** | **30/40 → 34/40** |
| cup × tip shape | 0.000 → 0.001 | 0.000 → 0.012 | 21/28 → **24/28** |
| leaf × stem | identical under `Object.is` on 48/48 | — | — |

**Decorrelating three controls correlated two, as Eva predicted it might:** curl × twist is WORSE
under the offsets — its worst per-petal excursion falls from 0.007 to 0.000 mm and more runs from
clear cells go under the bar — because curl (120) and twist (240) now sit at opposite signs on the
petals between their crests, which is exactly the pairing the combination gate declares at
curl 360 × twist 180. The other two pairs read better at their worst and put slightly MORE runs
under the bar, because a petal no longer needs all three crests to reach it.

- **Separation** (`bloom-petal-separation.mjs --field form`, 143 builds over the 16 bases, EXPORT):
  every build **one connected piece at 0.6 mm**. The triangle count still moves with the amount on
  the four 6-layer corners (by up to 1,512 on base 13, 1,128 on 11/12, 192 on base 14).
- **Determinism** (`verify-bloom-build-order.mjs`, the 45 variance rows × 2 modes, forward / reverse
  / shuffle seed 7 in three processes): **every digest identical, bit for bit** (90 keys, 180
  pairwise comparisons, 3,321,656 triangles a pass).
- **Mutants**, 11 of 84 run locally, every one firing its names and the clean tree silent, all 84
  anchors matching exactly once: the NEW standing mutant **`the-form-offsets-collapse-to-zero`**
  (FV1; witnessed on the mutated module as the joint crest — the largest over petals of the
  smallest of the three per-base waves — reading 1 on the mutant against ≤ 0.5 clean), the five
  FORM mutants (`form-half-span-is-the-whole-range` re-anchored onto the new `halves` line), the two
  shared-wave mutants and three SIZE mutants through the changed `varianceWave`. CI runs the table.

## 17. THE TRIPLE IN THE COMBINATION GATE (Eva's ruling 2), and the shortlist

`petalSpineCurl × petalCup × petalTwist`, tier 1, the gate's first TRIPLE (`TRIPLES` in
`tools/bloom-combination-gate.mjs`, the same clauses generalised by one axis and the same
`COMBINATION_XFAIL` list). **18 cells: extremes only** — each axis's registry DEFAULT (CG0, so every
face is a pair cell the gate already holds) and its slider MAXIMUM, plus on curl and cup ONLY the one
interior value the form field's own reach puts a petal at from the shipped default (curl 270, cup
1.0; the twist reach IS its maximum). The minima were measured and not carried: every cell with
curl −180 or cup −0.8 reads higher than the same cell at the maximum, and twist −180 reads within
0.01 mm of +180.

| cell (curl × cup × twist) | self, mm | nearest face | the third control costs |
|---|---|---|---|
| **270 × 1 × 180** — the single-g crest petal | **0.076** | 270 × 0 × 180, 0.275 | **0.199 mm** |
| 270 × 1.2 × 180 | 0.227 | 270 × 1.2 × 0, 0.182 | −0.045 (relieves) |
| 360 × 1 × 180 | 0.065 | 360 × 0 × 180, 0.007 | −0.058 |
| 360 × 1.2 × 180 — every slider max | 0.014 | 360 × 1.2 × 0, 0.000 | −0.014 |

**Worst cell 0.000 mm (0.0002) at curl 360 × cup 1.2 × twist 0 — a FACE, the cup-x-curl pair's own
worst cell.** Verdict **PAIR-REACHES** (6 cells with two or fewer axes moved are under the bar, 4
all-three cells) — the honest one: the three-control corner is a product only at the field's own
interior reach, not at the slider extremes. **Ten cells declared**, each read both ways (CG2/CG3).
The gate: 22 pairs and 1 triple, 312 cells, 74 under the bar and all 74 declared; `--control` fires
every clause including six new triple legs.

**The gate's figure is not the scratch figure, and both are right.** Eva expected ~0.8771 mm; that is
the census's WORST SPAN on this state (688 pairs, how far the fold reaches through the sheet), and
the gate reads `self` — the NEAREST APPROACH, 0.076 mm. Two quantities of one fold.

**The shortlist — which declared pairs have an obvious third** (for Eva to rule on at once):

- **cup × roll → curl.** Roll closes the cross-section into a tube, cup lifts its margins, and curl
  bends that tube into a hoop along the spine — the same hoop that makes curl × twist a hazard. The
  most obvious third on the list; `cupGradient` is NOT a third here, it is cup's own coefficient
  (#265's sum rule).
- **curl × twist → cup (built, above) and roll.** Roll is the second obvious third: it acts in the
  cross-section twist wrings, on the blade curl has already bent.
- **cup × tip shape → width, or tip thinning.** All three act at the tip, and `cup-x-width` and
  `cup-x-thinning` are both already declared PRODUCT-ONLY — cup × tip shape × width is two
  product-only pairs sharing a control and a region.
- **leaf × stem → none worth a cell.** Six partners were swept and move the approach by at most
  0.002 mm; the hazard is `leafAngle`'s alone.
- **The composed base state: `layerCount` × `petalSpineCurl` × `innerCurl`.** Three whorls with
  curl 180 and `innerCurl` 360 fold at **1,968 pairs / 0.4218 mm with NO field** (census, EXPORT),
  and no row on `main` carries it: the matrix varies one control at a time and the gate tests pairs,
  which is the same blindness that let the curl × cup × twist corner go undeclared. Not added as a
  row or a gate entry in this PR, by ruling.

## 18. Findings carried from the build (for the record)

- **The build-1 sepal grouping defect.** The sepal angle scan groups sepals by congruent
  neighbourhood, and its key was (descriptor, relative azimuth) only — so under ANY per-slot field
  (build 1's size field included) it tested ONE sepal where eight distinct neighbourhoods exist. SP8
  found it on the first form row. The key now carries each facing petal's size factor and all three
  form deltas (the offset law made `g` alone insufficient: cos x does not determine cos(x + 120)).
  With no field every suffix is identical, so grouping is unchanged.
- **Three harness bugs, each found by a red rather than a reading:** (1) `effectiveFor` read ring
  0's representative petal, which is NULL where the sphere stem's channel omits slot 0 — it reads
  the first BUILT petal now ("flat row reports form telemetry" on the sphere-stem row); (2) both
  coverage instruments re-emit the whorl and were not handed the form field, so R3 fired on the
  first form row, as it did for size; (3) Z2 asserted a petal's varied bases equal the whorl's
  composed value — true until a slot term exists — and hands those bases to FV2 on a petal carrying
  a term.
- **The hub-ring result, VERIFIED rather than cited** (`bloom-petal-separation.mjs --foot`):
  `petalSurface`'s `footRowsAt` reads `ring.radius`, `ring.width`, `ring.overhang` and `slot.z` and no
  `slot.scale`; 18 foot rows at the slot's own scale and at half of it, **0 differ under
  `Object.is`**.
- **The first CI run found an E2 class the default smoke subset never ran** (`verify-bloom-edge-profile`,
  the `gates` job): three form rows add more rim-surface turn than the 45° allowance. **It is the petal's
  own surface, not the rim treatment, and it is on `main` by one slider**: `petalTwist max (180)` adds
  45.307323° on `main` (in no row the gate's default subset carries), and each form petal's composed
  (curl, cup, twist) set directly on the sliders reproduces its row — the aliased row's worst petal,
  curl 135 × cup −0.8 × twist 90, reads **74.408025° on the sliders alone, identical to the sixth
  decimal**; seven of the eight per-petal slider states of the default amount-1 row exceed the allowance.
  Declared in `E2_TURN_XFAIL` with their magnitudes (73.633038 / 29.408025 / 24.729474° of excess), the
  buckle's out-of-plane class. The gate and its `--control` (6 of 6) pass.

## 19. HEADROOM SCALING (Eva's ruling on the clamp pinning, the build-2 follow-up)

**§14a's measurement was the finding:** at 20 petals, amount 1, the one clamp pinned 30 % of the
petals identically at curl −180 on the SHIPPING default (slider curl 0), because 0 − 270 passes the
floor, and half of them at any slider end. Nearly a third of the ring the same petal, on the
configuration most people will ever see. Eva's ruling replaces the clamp-after-sum with a
composition that cannot leave the range:

    base      = the role table's composition, clamped      (the value the petal has at amount 0)
    deltaUp   = min(half, max − base)        deltaDown = min(half, base − min)
    applied   = base + amount · g · (g ≥ 0 ? deltaUp : deltaDown)

`resolveRoleOverrides` owns it (`bloom-geometry.js`); the slot term `formTerm[base]` is still the
ASKED delta `amount · g · half` (FV1 unchanged), and the room enters as the factor `room / half`
only where the room is short — `room >= half` is a BRANCH, so a petal with the full half-span of
room on the side its wave takes is built from the doubles it was before. **There is no threshold
and no constant**: `min(half, max − base)` is the geometry of the range. Eva's note, recorded as
she asked: her earlier rejection of headroom scaling "alongside soft-clamping as a fifth typed
threshold" was wrong about headroom — it contains neither — while her reason for not
special-casing curl stands and never bore on the general rule.

**`base` is the CLAMPED composition, and that is a decision with a reason.** Curl 180 + innerCurl
360 composes to 540 on every inner whorl; measured from 540 the room above reads −180 and every
petal whose wave points up would be pushed DOWN — the sign of the wave flipped on exactly the
whorls a role row already pushed past the range. The clamped 360 is what those petals are at
amount 0, so it is what the field varies about. That is also why `form-clamped-twice` is RETIRED
rather than re-anchored: "clamp the group value before the slot term" is now the law.
`the-headroom-reads-the-unclamped-composition` is its successor.

**Reflection was considered and NOT preferred**, so no stop was owed: reflecting the overshoot
inward keeps both sides of the wave but folds `+g` and `−g` petals onto one value, which is the
coincidence this ruling exists to remove, in a different place. Headroom is monotone in `g`, so no
two petals with different `g` ever coincide unless the room on their side is zero.

**The record.** Each petal carries `formScaled` (the bases whose term the headroom shortened,
asked and got) beside `formClamped` (now only a base a ROLE ROW put out of range); FV2 restates
the whole law from the REGISTRY's ranges and asserts both reports; the FORM VARIANCE read-out says
how many petals the headroom held in.

### 19a. Measurement 1, re-run exactly as §14a (20 petals, amount 1, f 1 phase 0, EXPORT)

`node tools/bloom-form-variance-hazard.mjs --pinning` (new; the same run on a worktree of `1f0b3f0`
reproduces §14a to the digit). Distinct values counted to 1e-9 of the base's own units, because
mirror azimuths ±θ read cos values that differ in the last bit. PINNED = a petal exactly at a range
end.

| slider | clamp (main): curl · cup · twist pinned | HEADROOM: curl · cup · twist pinned | curl distinct, main → headroom |
|---|---|---|---|
| curl −180 | 10 · 5 · 0 | **10 · 1 · 0** | 11 → 11 |
| **curl 0 (default)** | **6 · 5 · 0** | **0 · 1 · 0** | **15 → 20** |
| curl 90 | 0 · 5 · 0 | 0 · 1 · 0 | 20 → 20 |
| curl 180 | 6 · 5 · 0 | **0** · 1 · 0 | 15 → 20 |
| curl 270 | 8 · 5 · 0 | **0** · 1 · 0 | 13 → 20 |
| curl 360 | 10 · 5 · 0 | **10** · 1 · 0 | 11 → 11 |
| cup −0.8 | 6 · 10 · 0 | 0 · **10** · 0 | 15 → 20 |
| cup 0 / 0.6 | 6 · 5 · 0 | 0 · 1 · 0 | 15 → 20 |
| cup 1.2 | 6 · 10 · 0 | 0 · **10** · 0 | 15 → 20 |
| twist −180 / 180 | 6 · 5 · 10 | 0 · 1 · **10** | 15 → 20 |
| twist 90 | 6 · 5 · 7 | 0 · 1 · 0 | 15 → 20 |

**Zero pinned petals at every INTERIOR slider setting of every control. AT A SLIDER END HALF THE
PETALS STILL SIT AT THAT END — 10 of 20 — and that is the law, not a defect of it**: at the end the
room on the outward side is zero, so every petal whose wave points outward takes zero delta.
Reported at the settings it happens rather than the law adjusted to hit the target, per the brief.
The ONE cup petal at −0.8 on every row is not pinning: it is the single petal at g = −1 exactly,
which lands on the floor because the room below cup 0 is 0.8 and it takes all of it — one petal,
the wave's own trough, distinct from every other.

**At a slider end headroom IS the old clamp, term for term** (room 0 outward, the full half-span
inward), which is why `ALL MAX` — every slider at an end — reads **116,847 / 15.8503 unmoved**
(`bloom-xfail-magnitudes --include-refused --only '^ALL MAX$'`, 223 s).

### 19b. Self-approach, worst petal, amount 1, EXPORT, every petal (`--headline`)

| state | f 1 ph 0 | f 1 ph 90 | f 20 ph 0 | f 20 ph 90 |
|---|---|---|---|---|
| the DEFAULT bloom (8) | 0.527 → **0.527** | 0.527 → 0.527 | 1.097 → 1.098 | 0.527 → 0.527 |
| FAN (7) | 0.620 → **0.767** | 0.620 → 0.767 | 1.097 → 1.098 | 1.097 → 1.098 |
| CONTINUOUS × 3 turns (24) | 0.358 → 0.358 | **0.375 → 0.365 (WORSE)** | 0.311 → 0.311 | 0.305 → 0.305 |
| 3 whorls (24) | 0.334 → 0.334 | 0.334 → 0.334 | 0.331 → 0.331 | 0.334 → 0.334 |

**One figure gets WORSE and it is reported, not clamped:** CONTINUOUS × 3 turns at phase 90 goes
0.375 → 0.365 mm, its worst petal (curl 239.2, cup −0.033, twist −152.0) a petal whose cup the
clamp used to put at −0.041 and headroom now puts at −0.033 — the cup's room below 0 is 0.8 of a
1.0 half-span, so every downward cup term is scaled by 0.8. The worst petal on the default is the
curl-up / twist-down pair at opposite signs and never met the clamp, so it is unmoved to the
digit. The FAN improves because its worst petal WAS a clamped one (curl −180 → −155.9).

### 19c. X2 across block 43 (Node census, EXPORT, both trees)

**13 of the 14 non-GATED rows read 0 within-shell pairs on both trees**, and the declared row moves:

| row | main (offset law) | headroom |
|---|---|---|
| `x 3 whorls with innerCurl 360 on curl 180` (declared) | 4,080 / 0.7533 | **2,464 / 0.7505** |
| `x a SPHERE with a stem` | 0 · 19,444 tris · 7 shells | 0 · **22,506 tris · 8 shells** |
| every other row | 0 | 0 |

The sphere row's triangle count moves because the stem channel probes each slot at its own form
(the omission mask is handed the field): one more petal clears the channel under headroom and is
built. The census reads 0 on it either way.

**The curl-360 declaration is RE-RECORDED, NOT RETIRED, because the brief's premise does not hold**:
headroom does NOT stop the field driving curl to 360 from a slider at 90 — the room above 90 is
270, exactly the half-span, so the crest petal (g = 1) lands on 360 from ANY slider value at or
above 90. What headroom stops is the field driving curl PAST 360 and pinning half the whorl there.
On this row the inner whorls compose to 540, clamp to 360 and have no room above, so every inner
petal whose wave points up stays at 360. Controls (EXPORT, Node, `SelfIntersection.census`):

| state | field OFF | main ON | headroom ON |
|---|---|---|---|
| 3 whorls, curl 180, innerCurl 360 | 1,968 / 0.4218 | 4,080 / 0.7533 | **2,464 / 0.7505** |
| 1 whorl, curl 180 | 0 | 427 / 0.7078 | 405 / 0.4888 |
| 3 whorls, curl 180, innerCurl 0 | 0 | 1,577 / 0.7533 | 1,176 / 0.6731 |
| curl 360 (the declared single) | 920 / 0.5158 | 845 / 0.7473 | 842 / 0.7473 |
| curl 90 | 0 | 208 / 0.4593 | 208 / 0.4992 |

So on the declared row 1,968 of 2,464 are pre-existing and 496 are the field's (was 2,112 of
4,080). The last line is not a matrix row and is recorded because it is the same class: from a
slider at 90 the field folds one petal at amount 1 on both laws.

### 19d. The four declared pair hazards (the §4 / §16 grids and settings)

| pair | worst per-petal: single-g → offset → headroom | from clear cells: single-g → offset → headroom | runs under the bar |
|---|---|---|---|
| cup × roll | 0.000 → 0.000 → **0.000** | 0.003 → 0.018 → **0.021** | 15 → 16 → **16** of 20 |
| **curl × twist** | 0.007 → 0.000 → **0.000** | 0.021 → 0.000 → **0.000** | 30 → 34 → **33** of 40 |
| cup × tip shape | 0.000 → 0.001 → **0.001** | 0.000 → 0.012 → **0.012** | 21 → 24 → **24** of 28 |
| leaf × stem | identical under `Object.is` on 48 / 48 on every law | — | — |

**curl × twist: headroom leaves it where the offsets put it — 0.000 mm per petal, from a clear
slider cell**, and one fewer run goes under the bar (33 of 40). The worst petal moved cell (curl
270 × twist 60 now, its petal curl 293.3 / cup 0.707 / twist −113.9; curl 180 × twist 120 under the
offsets) without moving its reading, so the offsets' finding stands: decorrelating the three put
curl and twist at opposite signs between their crests, and headroom does not undo that.

### 19e. Mutants

`form-clamped-twice` RETIRED (§19). Two new, each witnessed on the MUTATED module's own per-petal
record: **`the-headroom-is-the-old-clamp` — the STANDING mutant** (the slot term added whole and the
sum clamped, as on `main`; witness: petals at curl −180 on the shipping default at 20 petals, >0 on
the mutant and 0 clean) and `the-headroom-reads-the-unclamped-composition` (witness: the composed
curls differ on the 3-whorl curl-180 + innerCurl-360 state). Both name FV2. The standing
`the-form-offsets-collapse-to-zero` must still fire FV1. Results in §20.

## 20. Verification — phase 1, then the small items

### 20a. The byte partition — run, not argued, and the FIRST predicate was wrong

`node tools/verify-bloom-surface-bytes.mjs --base <worktree of 1f0b3f0> --movers-predicate
form-headroom`, the full 992-row live matrix in both modes, in foreground chunks merged with
`--merge`. The movers are PREDECLARED from the BASE tree's own builder and resolver — a row moves
iff some petal the base built carries a non-zero term on a side whose room is under the half-span
— never from this tree's `formScaled`, which is the quantity under test.

**THE FIRST RUN FAILED, AND IT WAS THE PREDICATE, NOT THE GEOMETRY:** 18 of 19 predeclared movers
moved, 973 holders held to the bit, and `ALL MAX` — predeclared a mover — **held to the bit in both
modes.** Every slider on that row is at an END, where the room outward is ZERO; `clamp(at + t)` and
`at + t · 0 / half` are then the same number, so "room < half" over-predicts. The predicate now
requires `0 < room < half` and excludes the second identity the same algebra gives (`|t| = half`
with the term past the room, where both laws land on the range end). That `ALL MAX` holds is the
same fact §19a states and its census re-measurement shows (116,847 / 15.8503 unmoved): three
readings, one mechanism.

**RE-RUN WITH THE CORRECTED PREDICATE: PASS.** `verify-bloom-surface-bytes --base <worktree of
1f0b3f0> --movers-predicate form-headroom`, four `--range` chunks merged: **992 rows x both modes,
18 of 18 predeclared movers moved, 974 holders held to the bit — 1,293,491,196 export floats over
143,721,244 triangles and 80,703,620 captured-grid values over 9,296 panels, positionally under
`Object.is`.** The movers are the 17 non-GATED block-43 rows and `varianceForm max (1)`; `ALL MAX`
and every size-variance row are holders. One mover is worth naming: `20 cycles, phase 90`, whose
label says every slot reads cos 90 — it reads cos 90 to an ULP, so its terms are ~1e-14 of a
half-span, and on the petals whose room is under a half-span even those are scaled. It moves at
the last bit and nowhere visible, and the predicate predicts it because it reads the base tree's
own terms rather than the label.

**No frozen baseline's bytes stop reproducing, and that is a measurement:** over all 46 registered
frozen matrices (28,311 rows) the form field is present on **0** rows — the newest, `phase47`, is
`main` before build 2 — and the predicate's first clause is the field's presence. **No phase is
owed**: this PR adds no matrix row (the triples are gate cells, not rows; `petalTwist max (180)`
was already a row and only joined the smoke subset).

**VERIFICATION, ALL RUN ON THIS TREE:**

| instrument | result |
|---|---|
| `verify-bloom-export --only '^(FORM VARIANCE\|varianceForm max)'` (Chromium) | PASS, 20 of 20; FV0-FV4 silent; the curl-360 row still failing at **2464 / 0.7505 — X1, browser-confirmed** |
| apex mutant table, the seven form mutants (`--only`) | 7 of 7 fire the family they name, clean tree silent; anchors 85 of 85 match once |
| `bloom-combination-gate --control` | green; 43 legs each fire on their own plant, including per-triple CG2 / CG3 both ways / CG4 flips on every triple and CG1 on the composed triple measured on one petal (395 s) |
| `verify-bloom-panel` and `--negative-control` | PASS; **ALL TWENTY-ONE ROUTES OBSERVED THE FAILURE** — the first time this control has been run |
| `verify-bloom-edge-profile` (default subset, now with `petalTwist max (180)`) | 1 finding and it was this change's: the FAN form row's E2 excess moved **24.729474 -> 14.498401 deg**, re-recorded in this commit (the row's self-approach moved the same way, 0.620 -> 0.767 mm); re-run on both declared rows, PASS |
| `bloom-smoke --check` | OK: 133 rows, 39 blocks, 126 families |

**NOT RE-RUN, SAID RATHER THAN IMPLIED:** `bloom-petal-separation --field form` was killed twice by
worker restarts before it wrote its summary, so no separation figure under headroom is quoted here;
the build-order determinism pass over the variance rows was not run. Both are Node-only and cheap,
and neither is in CI — CI's two matrix gates are the merge criterion.

## 21. PHASE 2 — THE FOUR TRIPLES, against the settled law

Eva bought four from §17's shortlist. They are in `TRIPLES` in `tools/bloom-combination-gate.mjs`,
under the same clauses and the same `COMBINATION_XFAIL` list as the pairs and the tier-1 triple.

**The grid rule, and why the minima now matter.** Extremes only: each axis's registry DEFAULT
(CG0), its slider MAXIMUM, and on the form axes the field's own reach from the shipped default.
Under headroom that reach is +270 / −180 on curl, +1.0 / −0.8 on cup and ±180 on twist — **so on
the form axes the minima ARE the field's downward reach**, which §17 could skip under the old law
(where the field's downward reach was clamped into the same place) and this PR cannot. A minimum
was **measured on a probe grid** (every minimum included) and CARRIED only where some cell with it
reads worse than the same cell at the maximum AND under the bar — iterated to a fixed point, because
dropping one axis's minimum can remove the only cell another axis's minimum was worse at.

| triple | axes (after the minima rule) | cells | verdict | under the bar |
|---|---|---|---|---|
| `cup-x-roll-x-curl` | cup 0 / −0.8 / 1 / 1.2 · roll 0 / −330 / 330 · curl 0 / −180 / 270 / 360 | **48** | PAIR-REACHES | 33 (15 faces, 18 all-three) |
| `curl-x-twist-x-roll` | curl 0 / 270 / 360 · twist 0 / −180 / 180 · roll 0 / 330 | **18** | PAIR-REACHES | 13 (9 faces, 4 all-three) |
| `cup-x-tipshape-x-width` | cup 0 / 1 / 1.2 · tip shape 1.70 / 3.00 · width 16 / 30 | **12** | PAIR-REACHES | 6 (4 faces, 2 all-three) |
| `layers-x-curl-x-innercurl` | layers 1 / 3 / 6 · curl 0 / 180 / 270 / 360 · innerCurl 0 / 360 | **24** | **CLEARS** | 0 |

**Why each minimum went where it went** (probe tables: 48 / 36 / 36 / 45 cells, EXPORT):

- **cup × roll × curl — every minimum carried.** cup −0.8 × roll 330 reads **0.012** against cup
  1.2's 0.107; roll −330 × cup 1 reads **0.0003** against +330's 0.041 — a reversed quill the
  `cup-x-roll` pair never measures, because its roll axis stops at 0; curl −180 × roll −330 reads
  0.901 against curl 360's 1.176.
- **curl × twist × roll — curl −180 and roll −330 dropped, twist −180 carried.** Roll −330 never
  reads worse than +330, and the only cell where curl −180 read worse than 360 was at roll −330;
  twist −180 reads 0.587 against +180's 0.610 at curl 270 × roll 330, both under the bar.
- **cup × tip shape × width — every minimum dropped.** cup −0.8, tip shape 0.60 and width 8 each
  read worse than their maximum somewhere (cup −0.8 × tip 0.60 × width 16: 1.038 against 1.221), but
  never under the bar there.
- **layers × curl × innerCurl — every minimum dropped**: no cell of the 45-cell probe comes within
  the bar.

**WIDTH, NOT TIP THINNING, for the third** — both are declared product-only with cup. Width acts on
the SAME quantity the other two do: the cup's amplitude is a fraction of the half-width, the tip
shape decides how long the half-width is HELD toward the tip, and the width scales it — three
controls composing through one variable. Tip thinning acts on the sheet's thickness, orthogonal to
that, and in EXPORT it saturates at the 1.00 mm floor by 0.4, so half its axis would be dead
travel. The measurement agrees: the third control costs **0.331 / 0.352 mm** against the nearest
face at cup 1 / 1.2 × tip 3.00 × width 30 (0.457 and **0.390** mm, the triple's worst cell).

**What each triple's own interior buys**, against its nearest face at the same values:

- cup × roll × curl: **cup 1.2 × roll 330 × curl 270 reads 0.001 mm against its nearest face's
  0.107 — the curl costs 0.105 mm**; its worst cell is a face (cup 1.2 × curl 360, 0.0002).
- curl × twist × roll: the third control RELIEVES — every all-three cell reads 0.31–0.52 mm ABOVE
  its nearest face (the roll opens the hoop the twist wrings); worst cell the curl × twist face,
  0.007.
- cup × tip shape × width: the width costs 0.33–0.35 mm, the largest interior effect of the four.

### 21a. The composed state — the gate's own measure against the census

**`self` cannot see it, and the triple ships CLEARS because that is what the measure reads.**
3 whorls × curl 180 × innerCurl 360 reads **1.222 mm** on the gate's measure and **1,968
within-shell pairs / 0.4218 mm worst span** on the census, both EXPORT, same state, no field.
They are two quantities — `self` is the NEAREST APPROACH between the sheet and another part of
itself away from the nib (`measureWall`), the census counts triangle pairs that CROSS and reports
how deep the deepest crossing reaches — and here they disagree in kind rather than in size: the
composed state clamps every inner whorl to curl 360, and the curl-360 fold is a class `self` does
not see on the slider alone either (`petalSpineCurl max (360)`: census 920 / 0.5158, `self` 1.230,
`cup-x-curl`'s own single-axis cell). §17's 0.076-against-0.8771 was one fold read by two measures
that both saw it; this is a fold one of them is blind to.

**A NEW MEASURE WAS OWED EVEN TO GET THAT FAR.** `self` reads ONE petal (`built.petal`, ring 0's
representative), and `innerCurl` never reaches ring 0 — so on `self` the innerCurl axis is inert by
construction and CG1 refuses it (the must-fail below plants exactly that). `self-every` is the same
`measureWall` on every petal the builder emitted, the smallest of them; the composed-state triple is
its only user. Kept as `clears` so the day the approach comes within the bar it fails loudly; the
fold itself stays X2's, declared on block 43's row.

### 21b. Declarations, the must-fail, and what it cost

**52 new cells declared** (33 / 13 / 6 / 0), every one at the gate's own reading to three decimals,
read both ways by CG2/CG3; the notes say which cells are faces a pair would also produce and which
are the triple's own. The gate: **22 pairs and 5 triples, 414 cells (120 the triples'), 126 under
the bar and 126 declared** — against 312 cells / 74 declared this morning (+102 cells, +52 declared).

**Runtime, this box, idle, the whole gate, one run each: 296.8 s on `main` (1f0b3f0) against
377.6 s here — +80.8 s, +27 %, for +33 % cells.** The composed-state triple is the dearest per cell
(six-whorl builds with `measureWall` on every one of 48 petals). The gate runs before the browser
install in `bloom-export-watertight.yml`'s preflight job; read its step time off the PR's own run
rather than off this figure.

**The must-fail is per triple now**, each leg counting only a finding that NAMES its triple: the
CG2 removal and both CG3 records on each triple with a declared cell, the two CG4 flips its own
verdict does not allow, the CG0 plant on the first, and on the composed-state triple the one
rebuild that is its reason to exist — **its measure put back to `self`, where CG1 must refuse
`innerCurl`**. Results in §20.
