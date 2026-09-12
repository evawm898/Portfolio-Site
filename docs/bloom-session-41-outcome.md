# Bloom session 41 — the lobe cut law, rebuilt on two independent exponents

Build, not discovery. The cut family is replaced, `lobeTipShape` is retired, the
resolution demand becomes a function of the shape, and **the count ceiling goes from
2 to 10**. Model B — the continuous rim — is explicitly NOT in this PR.

Eva's model is now in the repository, verbatim, as `docs/bloom-lobe-model.md`; that
was this session's first commit and it exists so that a fourth session does not go
looking for `claude/lobes-serration-status.md`, which does not exist and never did.

## 1. The family, and the three that were rejected

The cut within one period is

```
g(r) = r^a / (r^a + (1 - r)^b)        on   r = 1 - |2f - 1|
```

`a` is `lobeCrestShape`, `b` is `lobeNotchShape`, and each is **the LOCAL POWER of
the cut at its own feature** — 1.00 a corner, 2.00 parabolic, 3.00 flat, below 1.00 a
cusp. Near `r = 0` the denominator tends to 1 so `g ~ r^a`; near `r = 1` it tends to
1 the other way so `1 - g ~ (1-r)^b`. **Measured by log-log slope, `a` and `b` come
back to six figures and neither moves with the other.**

**THE BRIEF ASKED FOR THE SUPERELLIPSE BY PREFERENCE** so the generator would carry
one law family rather than two. It does not fit, and the reasons are measurements:

| form | crest / notch powers | why not |
|---|---|---|
| one exponent, `(1 - (1-r)^n)^{1/n}` and friends | `n` and `1/n` | **coupled inversely** — precisely the trade session 40 measured; "both acute" is unreachable anywhere in (0, ∞) |
| two-exponent Lamé, `g = (1 - (1-r)^b)^a` | `a` and `b`, independent | **not symmetric at a = b**: `g(1/2) = 0.5625` at `a = b = 2`, so equal settings draw a lopsided wave and the two controls do not read as calibrated against each other |
| piecewise power, `(2r)^a/2` mirrored | `a` and `b`, independent | symmetric, but the halves meet with slopes `a` and `b` — a **third tangent break mid-flank** whenever `a ≠ b`, i.e. a crease down the side of every tooth |

The ratio has all three properties the others each miss one of: exact independent
powers, `g(1/2) = 1/2` whenever `a = b`, and C^∞ strictly inside the period (a ratio
of smooth functions over a positive denominator), so the only tangent breaks it can
carry are AT its two features, which is where they belong. Its symmetry under
`(a ↔ b, r → 1-r, g → 1-g)` is exact, which is the formal statement that the crest
control and the notch control are the same control read at opposite ends of the tooth.

**TWO EXACT VALUES, BOTH LOAD-BEARING.** `g(0) = 0` and `g(1) = 1` to the bit at
every exponent — including the cusped ones, where `Math.pow(0, 0.6)` is 0 — so the
crests still meet the base outline EXACTLY and L6's `Object.is` clause holds
unchanged. And **at `a = b = 1` the law is the triangle wave to the bit**: `r + (1-r)`
is exactly 1 in IEEE-754 over the whole unit interval, measured as
`max |g(r) - r| = 0` over 100,001 samples. The serrate margin is drawn by an identity
rather than approached.

### 1a. The reachable angle region, MEASURED

`node tools/bloom-lobe-model-b.mjs --section=1`. EXPORT, the shipping default petal,
`lobeDepth` 0.30, 2 lobes, pitch 7.137 mm. Included angles read on the EMITTED
outline through a chord of a named axial distance either side — **fine 0.05 mm** (the
limit the exponent sets) and **coarse 0.50 mm** (about a nozzle).

On the coarse chord the notch spans **32.6° (acute) to 178.6° (obtuse)** and the
crest **67.7° to 178.0°**. Eva's "obtuse through acute, to the limit where it is
barely an angle at all" is reachable at the notch, which is the thing the retired
family could not do at any value.

**INDEPENDENCE AS A NUMBER RATHER THAN A PICTURE.** Across a row of the square (the
crest held) the NOTCH angle spans up to **110.3°** while the crest drifts at most
**16.5°**; down a column (the notch held) the CREST spans up to **105.7°** while the
notch drifts at most **16.7°**. Each control owns its own feature; the ≈16° is the
shared denominator of the law, reported as the measured size of the cross-talk rather
than claimed absent.

**WHY THE CONTROLS ARE NOT CALIBRATED IN DEGREES**, which is the obvious thing to
want given Eva named one of them "notch angle". The angle a given exponent DRAWS
depends on the depth, the pitch AND the local half-width, so a slider reading 90°
would draw something else the moment any of the three moved — and the fine/coarse
columns differ by up to 145° on one state, so even "the" angle is not one number. The
exponent is the control; the DRAWN angle is measured on the build's own outline and
printed in the read-out beside the chord it was read through, which is the one place
a degree figure can be true. The number rises as the feature blunts, the same sense
in both controls (session 31's `antherPinch` ruling: a control must read the way it
behaves).

### 1b. It composes, and that is a property of the form

The cut enters the outline as a **reduction factor** — `shapeBase * (1 - cut)` — so a
second, shorter-wavelength level is **one more factor in the same product**,
`shapeBase * (1 - cut1) * (1 - cut2)`, which stays in (0, 1] by construction and
therefore cannot make the outline multi-valued however the two levels are set. The
law is a function of a PHASE alone, so the second level needs only its own phase,
count and pair of exponents — and **no change to the law**.

Verified rather than argued: two levels at 0.90 depth each, the second at 4× the
frequency, over all 1,296 exponent quadruples × 201 phases — the composed factor
leaves (0, 1] on **0 of 260,496 samples**, its smallest value 0.011.

**WHAT A SECOND LEVEL WOULD COST, in one paragraph.** Four registry rows (a second
count, depth and pair of exponents — or two, if the second level's shape is ruled to
follow the first), one more factor in `shapeAt`, and a `cutAt` that sums the two
phases. The expensive parts are not the law: the RESOLUTION demand becomes the finer
level's (`count1 × count2 × samplesPerLobe`, which the ladder's capacity will refuse
long before the range does — at the shipped capacity of 31 free rows, two levels of 3
teeth at 3 stations a lobe is already 27), the depth cap must be derived on the
COMPOSED cut rather than on either level, and `slopeBreaks` must declare both levels'
features. None of that is foreclosed and none of it is retrofitting: the product form
is what makes it additive work rather than a rewrite.

## 2. The resolution demand is a function of the shape

`LOBE_DEMAND_ROWS` in `bloom-geometry.js` is a **49 × 49 table over the control's own
steps** — one cell per reachable slider pair, no interpolation — derived by
`node tools/bloom-lobe-resolution.mjs --table` and verified cell for cell by
`--verify`. **That is the table's only independent witness**: the harness's L3 READS
the table, so it can prove the record carries the demand the shape asks for and can
never prove the table itself. `--verify` re-derives all 2,401 cells from the clauses
and reports PASS only on an exact match; it also re-runs the calibration and asserts
no cell exceeds the ruled ceiling.

### 2a. Clause (i) is session 40's own premise, made operative

Session 40 wrote the premise in prose — *"a corner does not need resolving; a station
either side of it draws it exactly. What needs resolving is the ROUND band"* — and its
formula did not implement it, because on the shipped family the distinction never bit:
the binding feature there is parabolic or flatter at every reachable value.

The bar is now `2 × clamp(power - 1, 0, 1)`. Where the binding feature is parabolic
or flatter the weight is 1 and the bar is **exactly** session 38's "two station
gaps", so the generalisation is provably one:

| retired `q` | binding | band | power | weight | bar | ladder | ruled | uniform | ruled |
|---|---|---|---|---|---|---|---|---|---|
| 0.50 | sinus | 0.287 | 2.00 | 1.00 | 2.00 | **10** | 10 | **7** | 7 |
| 1.00 | crest | 0.205 | 2.00 | 1.00 | 2.00 | **11** | 11 | **10** | 10 |
| 2.00 | crest | 0.380 | 4.00 | 1.00 | 2.00 | **8** | 8 | **6** | 6 |

3 of 3, on both placements.

**A BINARY CORNER TEST WAS TRIED FIRST AND REJECTED BY MEASUREMENT.** Excluding a
feature outright at power ≤ 1 put a step from **2 to 20 stations** between notch 1.00
and 1.25 — a cliff in the count ceiling under one slider step, on a shipped control.
The weight is continuous, so no step of either control can collapse the count
(measured across the corner at crest 0.60: 2, 2, 2, 2, 4, 5, 8 as the notch power
goes 0.9 → 1.5).

### 2b. A third clause was owed, and it is why no cell reads 2

The per-period model places the period's ends **ON crests**, which is what the builder
does at the WINDOW's two ends and at no interior crest. So the model reads the
**favourable phase**. Measured over 200 offsets, the drawn tooth at 2 stations a
period ranges from **100% of its true amplitude down to ZERO** — at the worst phase
both stations land at mid-flank and the tooth vanishes entirely, for every shape:

| shape | n=2 | n=3 | n=4 | n=6 | n=9 |
|---|---|---|---|---|---|
| triangle | **0–100%** | 67% | 50–100% | 67–100% | 89% |
| round (the default) | **0–100%** | 80–92% | 80–100% | 92–100% | 98–99% |
| needle + slit | **0–100%** | 45–60% | 32–100% | 45–100% | 69–78% |

Clause (iii) is that the drawn amplitude keeps at least **half** at **every** phase —
clause (ii)'s own ruled "keeps at least half" convention applied to the amplitude
rather than to a pair's separation. It is SLACK on the whole retired family (4 / 3 / 3
against clause (i)'s 10 / 11 / 8), so **session 38's ruled constant is untouched by
it**, and it binds only where clause (i) has gone quiet.

A piecewise-linear function's extrema are at its breakpoints, so the drawn amplitude
over one period IS the spread of the law over the stations — the clause is exact and
needs no dense sampling.

### 2c. No cell exceeds the ruled ceiling, and that is asserted rather than clamped

The surface runs **2 to 10** over the square; `LOBE_SAMPLES_PER_LOBE` (11) stays the
CEILING and `--verify` fails if any cell passes it. This session's contribution is the
reduction BELOW the ruled figure where the shape is sharp — never a relaxation of it.

### 2d. One defect in the shipped clause, found by running it on the new law

`gapsPerBroad` divided the band by the widest gap **overlapping** it without requiring
the gaps to **cover** it. Two coincident stations therefore left one gap of ≈0 touching
the band and the ratio blew up: **the clause PASSED ON PILING**, which is the opposite
of what it asks. It never bit on the shipped family (at most one corner, and the floor
search started at n = 3) and it bit immediately on a law with two corners. The gaps are
read on the **circle** now, so they tile the period and sum to 1, the crest band needs
no phase shift, and the answers are identical wherever the old form's gaps did tile.

### 2e. And the law must be the SHIPPED EXPRESSION, not an algebraic equivalent

`((1 - cos 2πf)/2)^q` and `sin(πf)^{2q}` are the same function on [0, 1] and **not**
outside it — the first is even and periodic, the second is not — and the tool's
tangent probe reads slightly outside at the period's ends. Substituting the second
moved the q = 0.50 ladder floor from **10 to 7**: a station set 0.072 from the crest
became one 0.150 away. The law is imported from the geometry now, and any law reached
through a triangle phase is wrapped explicitly, because `Math.pow` of a negative `r`
is NaN and would poison the whole measure.

## 3. The relief fade — the new law does nothing to it, provably

Eva's item 2: session 40 measured the relief fading **2.37 / 1.92 / 0.93 mm** across
three successive notches toward the tip, and asked what the new law does to that fade.

**It is invariant, and not merely unchanged.** The relief at a sinus is
`hb(us) × depth × g(1)`, and `g(1) = 1` exactly at every pair of exponents — so the
fade cannot be a function of the shape. Measured on the emitted outline over the
shape square (crest × notch ∈ {0.6, 1, 2, 3}, EXPORT, coverage 1.00, depth 0.30,
3 lobes): every shape reads **2.393324 / 2.206358 / 1.816836 mm**, the worst
difference against the (2.00, 2.00) reference being **1.7e-9 mm** — the station
arithmetic, not the law.

`--section=2` re-measures session 40's own five-tooth row on the new tree: **2.366 /
1.923 / 0.933 mm**, reproducing 2.37 / 1.92 / 0.93.

**So the fade belongs to the PROPORTIONAL depth rule against a converging blade, and
the shape controls cannot reach it.** Not fixed here, as instructed. Model B, which
moves where the teeth sit, is what can — and the reason coverage cannot is in
`docs/bloom-lobe-model.md` §1: Eva's coverage is an arc about the apex, so the apex is
the one arc coverage never removes.

## 4. The count ceiling: 2 → 10

`node tools/bloom-lobe-resolution.mjs --surface` for the demand; the ceiling below is
the SHIPPED build's own `countBuilt` with 10 asked. EXPORT, the shipping default petal
(35 mm, sheet 1.200 mm), buckle flat.

| shape | demand | cov 0.10 | 0.40 | 0.80 | 1.00 |
|---|---|---|---|---|---|
| **every shape, before this PR** | 11 | 1 | 1 | **2** | **2** |
| triangle / SERRATION (1.00, 1.00) | 3 | 1 | 5 | **9** | **10** |
| near-triangle (1.25, 1.25) | 4 | 1 | 4 | 6 | 7 |
| needle + slit (0.60, 0.60) | 5 | 1 | 3 | 5 | 6 |
| flat / flat (3.00, 3.00) | 8 | 1 | 2 | 3 | 3 |
| dentate (3.00, 0.60) | 8 | 1 | 2 | 3 | 3 |
| crenate (2.00, 1.00) | 9 | 1 | 2 | 3 | 3 |
| **the default round lobe (2.00, 2.00)** | 9 | 1 | 2 | **3** | **3** |

**10 is `LOBE_COUNT_RANGE`'s own maximum**, so at the serrate end of the shape square
the count control is no longer capped at all. Serration is reachable through the
shipped sliders, with **no capability hook** — session 40's image needed one for its
whole second row.

### 4a. How much of the remaining gap is Model B's

Said plainly, because the brief asked for it:

* **THE COUNT IS NOT THE BLOCKER ANY MORE, at the shipping petal and at or above the
  default coverage.** 9 at coverage 0.80 and 10 at 1.00 is Eva's "high count". That
  part of the gap is closed by this PR.
* **AT LOW COVERAGE IT STILL IS.** Coverage 0.10 gives 1 lobe at every shape: the
  window is 1.8 mm of rim and the pitch floor (`max(sheet, MIN_FEATURE_MM)` = 1.20 mm)
  allows one tooth. That is a PHYSICAL floor, not a resolution one, and Model B
  relieves it only by lengthening the arc — session 40 measured Model B's coverage-0.10
  arc at 5.41 mm against Model A's, so it buys 2 rather than 1.
* **THE APEX IS MODEL B'S WHOLE SHARE, AND IT IS A MODEL REQUIREMENT RATHER THAN A
  RANGE.** Eva's model says *"the rim is ONE CONTINUOUS CURVE and the apex is a point
  on it, not a boundary. Apex treatment must be indistinguishable from side
  treatment."* Model A cannot satisfy that at ANY parameter value: session 40 proved
  as an identity that the treated region is an interval in `u` whose upper end IS the
  apex entry, and that the apex above it is bit-identical to a petal with no lobes at
  all (4001 of 4001 `Object.is`-equal, both modes). Nothing in this PR touches that,
  and no setting of the two new controls can.
* **AND MODEL B WOULD RAISE THE COUNT AGAIN**, on top of this PR: session 40 measured
  that the apex region `[uCap, 1]` reserves 8–10 rows for an untreated law, which under
  Model B become available to the treatment. Those two effects multiply rather than
  overlap — this PR lowered the demand per tooth, Model B raises the rows available.

## 5. The images

`node tools/shot-bloom-serration-range.mjs <dir>` renders both, each cell macro, PRINT
PREVIEW ON with the app's own `shownMode` asserted `"export"`, cropped on the petal's
own TIP down its own normal (read from `__bloomMetrics()`, never a layout guess) so the
apex is in every crop, every cell settled to two byte-identical frames, and same-tree
controls REPORTED and never used as a bar.

**(a) THE SHAPE SQUARE, 3 × 3** — the notch exponent across, the crest exponent down,
at a fixed count and depth, so the only thing varying is the pair of shape controls.
**The count is 3 and not 4, and that is a measurement rather than a layout choice**:
the demand is a function of the shape, so at count 4 the sharp corner of the square
builds 4 and the blunt corner CLAMPS to 3 — the grid would be varying the count as
well as the shape, which is the one thing it must not do. 3 is the largest count all
nine cells reach unclamped. Every caption carries all five control values, both DRAWN
included angles and the chord they were read on, and the demand.

**(b) SERRATION / THE MIDPOINT / LOBING**, the three cells session 40 rendered, on the
new law at the counts now reachable — 8, 4 and 2, all built at their asked count
through the shipped sliders.

## 6. Verification

**THE GATE WAS WRITTEN FIRST AND SEEN RED.** Commit `fb844c2` adds L7 and the matrix
rows; on that tree `node tools/bloom-smoke.mjs --check` fails at harness module load
with *"the registry declares no `lobeCrestShape` control — the lobes' controls and
their laws have diverged"*. The law is the commit after it.

**L7 — the new family, and the only witness for the SHAPE.** The two exponents ARE the
local powers of the cut at its two features by construction, so they are readable off
the emitted half-width: `removed(u) = hb - h` is exactly 0 at a crest and greatest at
a sinus, and its log-log slope against the offset from a feature IS that feature's
exponent, with no constant to cancel — neither the depth nor the local half-width has
to be known. The feature is PINNED ON THE CURVE by a ternary search over `removed`;
the record's `crestU` / `sinusU` only bracket it, so a record that misplaced a feature
is caught rather than believed.

**THE REFERENCE IS THE PAGE'S OWN READ-BACK CONTROL STATE**, an owner `widthProfile`
does not write. A clause that took its expected exponent out of the lobe record would
move with the defect and could not fail — session 39's A8 blend clause and session
38's `seam-floor-removed`, the same defect twice, and the brief names both.

### 6c. L7's first version fired on the clean tree, and only the mutant table said so

**The measurement was wrong, and wrong in the way that looks right.** It read the
log-log slope of the REMOVED MATERIAL, `hb - h`. That is `hb · depth · g(r)` — a
PRODUCT — so the base outline's own taper rides in it, and its maximum is not the
sinus but the point where `hb' · g + hb · g' = 0`, which is a **stationary point**.
A log-log slope read at a stationary point is 2 whatever the exponent: the notch
measured **2.021 for an asked 2.50**, and the crest measured correctly only where its
own exponent was at or below 1 (where the minimum is a genuine corner).

So L7 fired on the UNMUTATED tree, and `shapes-swapped`'s witness reported the
exchange failing for a reason that was the instrument's rather than the geometry's:
clean (crest 1.011, notch 2.021), mutant (crest 2.508, notch 1.013) — the swap had in
fact worked perfectly, and the clean tree's notch reading is what did not.

**THE FIX IS THE RATIO, NOT THE DIFFERENCE.** `1 - h/hb` IS `depth · g(r)` wherever
the shape term wins: `hb` divides out, so its minimum IS the crest (exactly 0), its
maximum IS the sinus (exactly `depthBuilt`), and its local powers ARE the two
exponents. Measured over ten states spanning the whole square, the worst error is
**0.0269** against a tolerance of 0.10, and the triangle wave returns exactly
**1.0000 / 1.0000**.

**WHAT THIS IS AN INSTANCE OF**, because it is not a new class: a clause whose
reference is entangled with something it did not mean to measure. The brief names
three prior cases and this is a fourth in the same family — the quantity under test
was the exponent and the measurement carried the base outline's taper as well. The
mutant table is what found it; nothing else could, because on the clean tree the
number was plausible (2.021 is a believable notch power) and on the mutated tree the
swap still looked like a swap.

**WHAT L0–L6 ARE BLIND TO, measured rather than assumed:** the count, the two caps, the
window, the pitch, the demand and the crests-at-the-ends identity are all unchanged by
swapping the two controls, coupling them, or serving both from one expression.

**THE MUTANT TABLE WAS RE-RUN BECAUSE A FAMILY WAS ADDED**, which is this project's own
rule. `tools/verify-bloom-apex-mutants.mjs` now runs the LOBE family beside the apex
one (it was A-only) and carries two new mutants, each with a witness on the MUTATED
MODULE that is deliberately **not** the assertion it names:

| mutant | what it does | witness |
|---|---|---|
| `shapes-swapped` | the crest exponent is applied at the notch and vice versa | the emitted powers must EXCHANGE against the clean tree's |
| `shapes-coupled` | both features read the crest exponent — the retired family's own error, returning | the emitted notch power must FOLLOW the crest's, where the clean tree's differ by > 0.5 |

A lobed row with the two exponents set APART (crest 1.00, notch 2.50, 3 lobes at
0.30×) is added to the table's row set, because a swap of equal values is undetectable
by construction and because L7's two measurements both need an unclamped depth and an
interior crest.

**L3's demand clause is PLUMBING and says so in its own message**: it proves the record
carries the demand the shape asks for and cannot prove the table, because it reads that
table. The message names `--verify` as the table's witness.

**THE CENSUS** is green: 63 smoke rows over 25 matrix blocks of 674 rows, **61 families
asserted and all 61 claimed by a row's path, both directions**, with L7 among them. No
matrix BLOCK was added, so the block count is unchanged at 25 — the shape rows went
into block 29 where they belong.

### 6a. The byte partition, predeclared

The matrix grew **666 → 674**: eight rows for the shape axis (the two retired
tip-shape rows replaced by eight), plus two from the blanket slider sweep for the net
new slider.

**PREDECLARED FROM THE BUILDER'S OWN RECORD rather than written by hand**: a row MOVES
iff a ring of it actually BUILDS a cut — `lobes` present, not `noRoom`, `countBuilt ≥ 1`
and `depthBuilt > 0` — because the cut's SHAPE changed and nothing else did.
**39 MOVERS / 635 HOLDERS**, and the predeclaring regex is exact against that partition
(0 disagreements in either direction).

Three lobe-labelled rows are HOLDERS and each for a stated reason: `NO ROOM by the pitch
floor` builds no cut (the outline is the plain petal's by branch), and the two GATED rows
are at depth 0. **Two non-lobe rows are MOVERS** — `lobeDepth max (1)` from the blanket
sweep and `ALL MAX` — which is session 38's own lesson honoured (*a row that sweeps every
control is a mover of any control a feature adds*; that session's first predeclaration
left `ALL MAX` off and the tool failed the run on it).

**LAYER 0 ALONE DECIDES A ROW, and that is an argument rather than a saving**: the inner
whorls carry shorter petals, so their lobe window is shorter and the pitch floor refuses
them sooner — layer 0 building a cut implies the row moves, and layer 0 getting NO ROOM
implies no ring builds one.

### 6b. A frozen phase IS owed

The matrix grew, so `frozen/phase25` is owed at **`3f238bd`** (main's head before this
session — the 666 rows session 40 closed on). `frozen/phase24` (624 rows at `59c0657`)
remains the previous baseline; its bytes were already not fully reproducible after the
seam and lobe work, and this session moves its lobed rows too.

## 7. The ladder was re-checked and does not pile

The turning measure integrates `|Δtangent|` per sample, and a kink is a **delta** — this
project's recorded bug class, four prior instances. Under the new law a sharp crest AND a
sharp notch are both kinks, twice as many as the retired family could produce, so the
question is live rather than inherited.

**Measured, EXPORT, the default petal, 2 and 8 lobes, crest exponent 0.60 / 1.00 / 1.50 /
2.00 / 3.00: ZERO gaps at or under `bladeStations`' own 1e-5 repair step and ZERO gaps
under uniform/10, on every row.** The narrowest gap is 6.0e-3 against a uniform 1.786e-2.
The same sweep on the shipped tree before the change reads the same. What contains it is
the `LADDER_MAX_GAP_FACTOR` blend, which bounds the widest gap and therefore raises the
narrowest toward uniform — a third job for a constant session 39 already found doing two.
Recorded, not relied on: if that bound is ever removed (session 39's ruling 2 proposes
exactly that), **this measurement must be retaken**, because the blend is what is holding
the stations apart.

## 8. What this session did NOT do

* **Model B.** Not started. §4a says what is left for it and why the apex part of it is
  a model requirement rather than a range.
* **The relief fade.** Measured and reported (§3), not fixed, as instructed.
* **The second cut level.** Costed in one paragraph (§1b) and proved not foreclosed.
  Not built.
* **`LOBE_BREAK_POWER`'s level.** The threshold at which a feature is DECLARED a tangent
  break is 1.5, which is the retired control's own margin carried over (it declared a
  break below crest power 1.5). Over-declaring costs one node in `petalRim`'s arc table
  and under-declaring costs its accuracy, so the margin is on the safe side — but the
  level is typed, not derived, and is a candidate for the same treatment session 39 gave
  `LADDER_MAX_GAP_FACTOR`.
* **The two shape defaults.** 2.00 / 2.00 reproduces the retired default's own LOCAL
  ORDERS exactly (the raised cosine is parabolic at both features), so the default lobed
  row moves as little as a family change allows — max 0.051 of depth, 0.083 mm at the
  model cell. Whether the shipped default should be a rounder or a sharper tooth is
  Eva's to rule from image (a), and the range reaches both.
