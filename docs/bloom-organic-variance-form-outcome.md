# Organic variance, build 2 of 3 — FORM: what was built, what was measured, and what is waiting on a ruling

The second of the three builds ruled in `docs/bloom-organic-variance-discovery.md` §9 (Eva,
Sep 17): the FORM amount, reading the SHARED frequency and phase of build 1. Every figure below
names its MODE and its SAMPLING.

**READ §12 FIRST.** §4 and §5 are the measurements that stopped the first build: one wave drove
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
without any clamp.) Reported, not fixed; Eva rules on it separately.

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
