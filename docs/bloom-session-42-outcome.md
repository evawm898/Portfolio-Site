# Session 42 — MODEL B: the lobe treatment runs over the apex

Read `docs/bloom-lobe-model.md` first; it carries Eva's binding model. This
document is what session 42 built against it, and every figure here names its
MODE and its SAMPLING.

The one-line result: **the rim is one curve now, coverage is a symmetric arc
centred on the apex, and the apex is INTERIOR to the treatment at every
coverage.** Session 40 established MODEL A as an identity — the profile above
`uCap` `Object.is`-equal to a petal with no lobes at all, 4001 of 4001 samples,
both modes — and its own instrument, unchanged, now reads **3075 of 4001
samples differing** on the shipped defaults with `lobeDepth 0.30`.

---

## 0. The three jobs, and what each one cost

| job | what shipped | where it is measured |
|---|---|---|
| 1 — the window becomes an arc | coverage is `arc / halfRim` about the apex; `windowU[1] === 1`; count = TEETH, parity derived | `bloom-lobe-model-b.mjs --section=0`, L8 |
| 2 — kill the relief fade | a RELIEF IN MILLIMETRES with a PER-PERIOD guard; no global depth clamp | `bloom-lobe-relief.mjs --section=1,2,3` |
| 3 — the corner that survives | the treated arc's base end is a CREST: one arm of the corner every interior crest already carries | `bloom-lobe-relief.mjs --section=4` |

---

## 1. The arc (job 1)

`widthProfile`'s lobes block now measures the rim as ONE curve: the margin's
own arc from `ROOT_BLEND_END` to `u = 1`, plus HALF the terminal mini-face,
whose midpoint IS the apex. `dAt(u)` is the distance from that midpoint. The
treated arc is `[-Wh, +Wh]` with `Wh = coverage x halfRim`, so twelve o'clock
is the one point coverage never removes.

**The parity is derived, not chosen.** With `periods = count + 1` over the arc
the crests sit at `d = Wh - k*pitch`, so the rim's midpoint is a CREST iff
`periods` is even. An ODD count therefore puts a crest at twelve and an EVEN
one a notch — one lobe at twelve is count 1, two either side of twelve is
count 2, three at eleven / twelve / one is count 3. That is Eva's clock,
derived. `LOBE_COUNT_RANGE` opens to **[1, 10]** for it: under MODEL A a count
of 1 was half a window with nothing symmetric about it.

**And an even count's apex notch has nothing to cut.** Its sinus sits at
`d = 0`, on the terminal mini-face, where the base outline is already at the
print floor in BOTH modes — so its headroom is exactly zero and its relief is
exactly zero, at every depth, and the two teeth either side read as one wide
one. This is a printability fact rather than a look. It is told on the
read-out, carried in the record as `apexIsCrest` / `apexReliefMm`, asserted by
L8 in both directions, and photographed as the second row of the image. It is
NOT fixable from this side: fixing it means SHORTENING the petal at the apex,
which is `petalLength`'s and `petalTipShape`'s region, and the `u = 1`
mini-face may never be collapsed (session 32's upstream contract, §5).

**A mode-free break list was owed the moment the table ran through the tip
floor.** The lobe arc table is built on the mode-free lamina
(`max(shape, rootBlend, TIP_HALF_MM)`) so live and export station the same
teeth — but its BREAKS came from `winnerOf`, which reads the mode's own
`tipFloor`. Under MODEL A the table was never queried above `uCap` and that
break sat far above it; MODEL B queries it to `u = 1`, THROUGH the break — at
u 0.9945 in export and 0.9993 in live — so a mode-dependent break list would
have put the graded patch in two places and stationed the teeth differently in
the two modes. `laminaWinner` is the mode-free twin. Row positions are
topology; this is session 32's mode-dependence defect refusing a third
shipping.

**MODEL A's `region` NO ROOM is unreachable now** (the margin always exists)
and L3 says so rather than deleting the clause. A FOURTH cause replaces it:
**`relief`** — the whole treated arc lying where the outline has already
converged to the print floor, so the law removes nothing anywhere. Reachable
on a 20 mm petal at coverage 0.10, told, nothing cut.

---

## 2. The relief fade, killed (job 2)

Session 40 measured the fade at **2.37 / 1.92 / 0.93 mm** across three
successive notches toward the tip; session 41 proved it INVARIANT to 1.7e-9 mm
over the whole shape square, because `g(1) = 1` exactly at every exponent. So
the fade was never the cut law's. It was the PROPORTIONAL depth rule's: relief
= depth x the LOCAL half-width, and the half-width runs to the print floor at
the apex.

The shipped law:

```
R      = depth * (peakHalf - TIP_HALF_MM)     the asked relief, in mm
R_k    = min(R, headroom(u_k))                what period k can take
cut(u) = R_k * g(phase(u))                    the mm removed at u
```

`headroom` is the mode-free lamina less the print floor, read at `|d|` so a
mirror period is the same tooth as its reflection. `depth` is therefore still
a fraction of a half-width — of the petal's OWN WIDEST one rather than of the
local one — and depth 1.00 means "cut to the print floor at the widest point".

**There is no global depth clamp any more.** MODEL A clamped the depth for the
whole petal by its shallowest sinus, which is exactly the coupling that let the
apex's scarcity shorten every tooth on the blade. `depthBuilt === depthAsked`
always; `depthCap` survives as TELEMETRY (the depth at which the FIRST period
with room saturates) and as a tick on the track.

**§1 of `tools/bloom-lobe-relief.mjs`, EXPORT and LIVE (identical on every row
of the table), the shipped law against MODEL A's rule on the SAME stations:**

| depth · teeth · coverage | SHIPPED relief (mm, base → apex) | spread | PROPORTIONAL | spread |
|---|---|---|---|---|
| 0.30 · 3 · 0.80 | 2.160 2.160 | **0.000** | 2.104 1.070 | 1.034 |
| 0.30 · 5 · 0.80 | 2.160 2.160 1.804 | 0.356 | 2.202 1.698 0.781 | 1.421 |
| **0.30 · 5 · 1.00** | **2.160 2.160 2.160** | **0.000** | **2.366 1.923 0.933** | **1.434** |
| 0.30 · 7 · 1.00 | 2.160 2.160 2.160 1.669 | 0.491 | 2.388 2.143 1.633 0.741 | 1.647 |
| 0.60 · 5 · 1.00 | 4.320 4.320 2.308 | 2.012 | 4.733 3.847 1.865 | 2.867 |

The bold row is session 40's own state: **2.366 / 1.923 / 0.933 becomes
2.160 / 2.160 / 2.160.** At the default coverage with the default count the
spread is 0.000 and `reliefLimited` is 0 — every tooth on the margin gets the
asked relief exactly.

**THE RESIDUAL IS REPORTED AND IS NOT CLAIMED GONE.** Where the material runs
out the relief still falls, and §2 names it: 0.491 mm of shortfall at 7 teeth
over the full clock, 2.012 at depth 0.60, **4.892 at depth 1.00** (asking to
remove 7.2 mm from a blade that has 2.3 mm at its apex-most sinus). And at
coverage 0.10 the whole treated arc lies in the converging tip: the single
tooth at twelve gets **0.243 mm** of relief against 2.160 asked. **The apex has
the least material on the petal; exact parity at the last fraction of a
millimetre is not available on a 1 mm sheet and is not claimed.**

### 2b. The guard is PER PERIOD and that was measured, not preferred

Three candidate laws were built and measured before one was chosen.

* **Pointwise `min(R, headroom(u))`** gives the IDENTICAL relief at every
  sinus — identical to the digit on every row of the candidate table — and
  introduces a TANGENT BREAK where the `min` switches: **26.8 to 37.8 degrees
  mid-flank in LIVE at depth 0.30** on a 0.20 mm chord, on a petal whose plain
  outline turns 11.1 degrees at its worst.
* **A strict per-period guard** (`min` over the whole period of
  `headroom/g`) has no break and no over-reach, and ZEROES the apex-most
  tooth at every setting, because a 0.19 mm stretch at the very end of the
  blade where the headroom is exactly 0 drags the whole period's envelope to
  0. Measured: `2.160 / 2.160 / 0.000` where the shipped law reads
  `2.160 / 2.160 / 2.160`.
* **The shipped per-period envelope** changes only AT crests, where `g` is
  exactly 0 and both one-sided slopes are `R_k g'` with `g' = 0` for every
  crest power above 1 — so it adds no break where the crest is smooth, and
  where the crest power is at or below 1 the break is the DECLARED
  `LOBE_CREST` one already there.

**What the shipped choice costs is over-reach tip-ward of the last sinus**,
where the cut exceeds the material and the outline's own floor absorbs it.
§3, 4001 samples of `[ROOT_BLEND_END, 1]`, against the PLAIN petal's own
floored stretch:

| mode · depth · teeth · coverage | plain floored | lobed floored | ABSORBED | under the print floor on the LAMINA (worst) | severed |
|---|---|---|---|---|---|
| export · 0.30 · 6 · 0.80 | 44 | 44 | **0** | 0 (0.000 mm) | 0 |
| export · 0.30 · 7 · 1.00 | 44 | 302 | 258 | **0** (0.000 mm) | 0 |
| export · 1.00 · 5 · 1.00 | 44 | 597 | 553 | **0** (0.000 mm) | 0 |
| live · 0.30 · 7 · 1.00 | 3 | 10 | 7 | 299 (**0.404 mm**) | 0 |
| live · 1.00 · 5 · 1.00 | 3 | 7 | 4 | 594 (0.420 mm) | 0 |

**In EXPORT — the object — the print-floor claim holds at every one of 4001
samples on every row.** In LIVE the mesh floor is 0.15 mm rather than 0.8, so
the cut reaches below the mode-free bound over the last stretch of blade, by at
most 0.420 mm. Live is authoring-true and explicitly not a print number; the
stationing and the row count are mode-free, so nothing topological moves. The
outline is single-valued and at or above its own floor in both modes: **0
severed samples on every row.**

---

## 3. The corner that survives (job 3)

MODEL B has no apex join to measure — the treatment does not end there.
Session 40 reported a SECOND corner at the window's BASE end, **−44.743
degrees**, larger than the −39.748 at the apex Eva objected to. Under MODEL B
that base end is a CREST like any other, and its join is ONE ARM of the corner
every interior crest already carries.

§4, drawn through a 0.20 mm chord in x, 5 teeth at coverage 0.80, depth 0.30:

| crest exponent | plain petal's worst | BASE end | interior crests |
|---|---|---|---|
| 0.60 | 69.8° (live) / 56.8° (export) | −56.7° | −121.6° −119.0° |
| 1.00 | " | −30.9° | −64.2° −60.1° |
| **2.00 (default)** | " | **−2.4°** | −4.5° −4.4° |
| 3.00 | " | −0.4° | −0.5° −0.7° |

**The base end is consistently about half the interior crest's turn**, which is
the identity the geometry predicts (one arm against two) measured on the
emitted outline. It is never the sharpest corner on the petal, and at the
shipped crest exponent of 2.00 it is 2.4 degrees — against a plain petal that
already turns 56.8 in export at its own tip-floor join. The corner a user gets
at the base end is the corner they asked for at every crest; it is the crest
control's, and it is reported.

---

## 4. The count ceiling, restated

The arc is longer than MODEL A's window, so the arithmetic changes again.
§5, EXPORT, the shipping default petal, 10 asked (the range's own maximum),
depth 0.30, through the SHIPPED `bladeStations()`:

| shape | 0.10 | 0.20 | 0.40 | 0.80 | 1.00 | what binds |
|---|---|---|---|---|---|---|
| the shipped shape (2.00/2.00, floor 9) | 2 | 2 | 4 | **6** | **7** | rows everywhere |
| the triangle wave (1.00/1.00, floor 3) | 3 | 8 | 10 | 10 | 10 | PITCH at 0.10, then neither |
| both cusped (0.60/0.60, floor 5) | 3 | 6 | 8 | 10 | 10 | pitch at 0.10, then rows |
| both flat (3.00/3.00, floor 8) | 3 | 3 | 4 | 7 | 9 | rows everywhere |

Against MODEL A (session 41): **3 at the round default, now 7**; the triangle
wave reached 10 only at coverage 1.00 and now reaches it from 0.40.

**Which constraint binds where, plainly: the RESOLUTION floor from below at
the blunt end of the shape square and at every coverage on the shipped shape;
the PRINT PITCH floor from above at the sharp end and at the narrowest
coverages, where the arc is short enough that a period would be finer than
`max(sheet, MIN_FEATURE_MM)`.**

---

## 5. The demand carries arc position

Session 39 found that a window TOTAL cannot express a PER-PERIOD criterion.
Session 42 measured the same thing again under the arc: at **7 teeth and
coverage 1.00 the ladder hands 10 / 11 / 10 / 8 against a floor of 9**, and
raising the total cannot fix it because the window already holds every free
row. So the demand is a LIST — one sub-region per period, each with its own
floor, the tip-most one partial and asking pro rata — and `bladeStations`
places each at equal increments of the SAME measure, handing out the SURPLUS
above the floors by the measure's own masses so the turning term keeps what it
earns. The ladder is still the ONE owner of row placement; it is told where
the periods are, never where the rows go. Measured after: `10/10/10/9`.

`LOBE_DEMAND_ROWS` — the 49x49 table over the two shape exponents — is
unchanged and still verifies cell for cell (`--verify`: 2401 cells, the three
ruled calibration floors reproduced, no cell above the ruled ceiling of 11).
What changed is that the demand it feeds is now positional.

---

## 6. The discrete decision on a continuous quantity — the FIFTH instance

X0 went red on `LOBES: x petalTipShape 0.60`: the exported STL and the Node
rebuild of the page's own state differed at one float, 37.219521 against
37.219772 — **2.5e-4 mm**.

Diagnosed by dumping both records side by side rather than by reading the code.
Every scalar of the lobe record agreed exactly; `sinusU` differed by **2.220e-16**
(one ulp), `reliefMm` by 1.776e-15 (that ulp times the outline's own slope), the
blend was identical to the bit — and ONE STATION, number 51, differed by
**7.978e-6 in u**. That is one ladder SAMPLE, damped by the blend.

The cause is `placeInto`'s binary search: it finds the first sample whose
cumulative measure reaches the target and takes THAT SAMPLE's `u`. The measure
is transcendental at every term and reads ~1e-12 apart between the page's V8
and Node's (session 38 §B10.7 measured 8.1e-13), so wherever a target sits
within that of a sample boundary the two engines take different samples.
**This exposure is PRE-EXISTING and identical on the plain path; MODEL B
reshuffled which rows sit on the knife edge.**

### The first fix was tried, measured, and REVERTED

Interpolating between the two bracketing samples makes the station a
CONTINUOUS function of the measure, so an ulp of disagreement moves it by an
ulp instead of by a sample. It removes the discreteness at the root, and it is
the wrong trade here — **measured, not reasoned about**: `sampleU(hi)` is an
exactly-computed function of an INTEGER, so two engines that agree on `hi`
emit the same double TO THE BIT, which is why main's 674 rows pass X0 at all.
Interpolation makes EVERY station a function of the diverging sum, so every
coordinate differs in its last bits and X0's exact float32 comparison straddles
a rounding boundary somewhere. The run that followed turned ONE row's 2.5e-4 mm
sample jump into last-bit disagreements on TWO OTHER rows
(`LOBES: x CONTINUOUS x 3 turns` at 2.4e-10 mm, `LOBES: x SPHERE` at 9.3e-10) —
smaller in millimetres and worse as a gate outcome, because they are one
float32 ulp apart at a boundary rather than a real move.

### Half the fix: the one NEW input to the measure lands on a grid

The first diagnosis said the divergence came from the RELIEF, and **that was
right about two rows of three and wrong as a general statement** — it is
recorded that way rather than rewritten, because the incomplete reading is
what cost the extra cycle. Each period's relief is read at a sinus station a
BISECTION on the arc table produces, so it carries that station's last bit
times the outline's own slope — measured **1.776e-15 mm** between the two
engines, against `sinusU`'s own **2.220e-16**. The relief enters
`ladderHalfAt`, which is the turning measure, and `placeInto`'s search is a
discrete decision on it.

So `reliefMm` is FLOORED onto `LOBE_RELIEF_GRID = 2^-16` mm — a power of two,
so the quantisation is exact in IEEE-754 and the only arithmetic left is a
floor; FLOORED and not rounded, so the per-period guard's inequality stays
intact (a relief rounded UP could take the outline a few parts in 10^5 below
the print floor). 1.5e-5 mm is four orders under the print floor and eleven
above the divergence it removes.

**It cleared `LOBES: x CONTINUOUS x 3 turns` and `LOBES: x SPHERE` and did
NOTHING for `LOBES: x petalTipShape 0.60`**, which came back on the next gate
run at the same 2.5e-4 mm. The relief was A source of divergence, not THE one.

### The rest of the fix: the target and the sample are EQUAL BY CONSTRUCTION

Re-diagnosed by MEASURING THE SEARCH'S OWN MARGINS rather than by reasoning
about the measure again — for every station `placeInto` places on that row,
how far is the target from the sample it landed on? Four of the 56 decisions
sit within 1e-9 of a sample. Three of them are the `j === count` case session
38 already made exact, at a margin of **exactly 0**. The fourth is the one
that moved:

| decision | target | sample | margin | local step |
|---|---|---|---|---|
| tip sub-region, station 4 of 8 | `cA + (cB-cA)/2` | 6943 | **1.97e-13** | 8.19e-4 |

That is not a coincidence and it is not sensitivity. **Over any stretch where
the outline law is inactive — the tip cap's straight lerp among them — the
turning term is identically zero and the arc term is constant, so `cum` is an
exact ARITHMETIC PROGRESSION**; the sub-region spans 2114 samples, and its
midpoint therefore IS sample 6943. The two sides of the comparison are the
same number reached by two routes: `cA + (cB - cA) * j / count` on one side,
6943 accumulated additions on the other. A strict `<` between them is decided
by their last bits, and the last bits are not the same in every engine.

**This is session 38 §B10.7's own finding at the INTERIOR stations.** That
session fixed the region's LAST station by asking for `cB` itself; the
interior ones were left computing a target by a different route from the
samples, and Model B is what made a whole sub-region linear enough for one to
land on a sample exactly.

**THE FIX IS A SLACK DERIVED FROM THE ACCUMULATION, NOT A TYPED TOLERANCE.**
`cum[m]` is m roundings of values bounded by `total`, so its representation
error is at most `m * EPS * total / 2`; the terms themselves (a difference of
two `atan2`, which V8 rounds to within an ulp) add at most `EPS * total`.
`tol = LADDER_SAMPLES * EPS * total` bounds both — **1.86e-11** on this row —
and the search becomes `cum[m] < target - tol`, so a target within `tol` of a
sample takes THAT sample in either engine. The emitted station is still
`sampleU` of an integer; nothing about the geometry is made approximate.

**MEASURED, in both directions.**

* **It is inert on the geometry.** Pre-fix tree against post-fix tree, the
  whole 680-row live matrix, both modes, every ring — **2,352 ladders
  compared, 0 stations moved**. So the Node-side byte partition below is
  untouched by it, by construction rather than by re-running: `placeInto`'s
  only output is the stations.
* **The sweep can see the tree it is comparing against.** Positive control —
  the same sweep with the pre-fix tree given a 1e-6 tolerance reports **78
  moved stations** across 11 rows. Five orders of magnitude separate "inert"
  from "moves things", and the derived bound sits at the inert end.
* **It is what the page needed.** The failing row's page build and Node
  rebuild now agree on **all 56 stations, bit for bit, in both modes**, where
  before they differed at station 51. The row passes X0 through the real gate.

The tolerance is the one that changes an ANSWER on the page and not in Node,
which is exactly the asymmetry to expect: Node was already landing on the
sample, and the page was landing one past it.

### What is still open

**Removing the exposure at its root is still the schedulable item**, and it is
now better specified than before this session. The remaining exposure is a
target that is NEARLY but not exactly a sample — genuine sensitivity rather
than a tie, at a probability this session did not measure. Interpolation is
the right law for that and the wrong instrument-compatibility, so it wants
X0's comparison re-derived alongside it — a bound in float32 ulps rather than
an exact equality. That is a whole-matrix byte partition, a frozen phase, a
full census re-baseline and a gate-clause change, and it should be its own
session.

---

## 7. The L5 ulp bound, re-derived against the new stationing

Session 41's bar is `LOBE_SINUS_STATION_ULPS = 8` times the per-ulp
sensitivity measured from the build's own profile, floored at 1e-9. MODEL B
moves every station, so the bound was re-derived rather than assumed.

Measured per-ulp sensitivity of the emitted half-width at a sinus, over the
shape square x three depth/count/coverage states, both modes:

| notch exponent | per-ulp sensitivity | the bar it gives |
|---|---|---|
| 0.60 (a cusp, Hölder) | **2.012e-9 … 3.259e-9 mm** | 1.6e-8 … 2.6e-8 mm |
| 1.00 – 3.00 | 2.2e-16 … 9.8e-15 mm | 1e-9 (the floor) |

Session 41 measured **4.041e-9** at notch 0.60 under MODEL A. Under MODEL B it
is **2.0–3.3e-9** — the same order and slightly LOWER, so the self-adapting bar
needs no change and `LOBE_SINUS_STATION_ULPS` stays at 8. The bar is the
quantity's own conditioning, so it opens by exactly as much as a cusped notch
requires and does not open at all for a smooth one.

---

## 8. L8 — the new family, and what the old ones could not see

L0–L7 are every one of them blind to WHICH MODEL the stationing follows: the
count, the caps, the pitch, the relief, the demand and the two shape powers
are all statements about a treated arc and say nothing about where that arc
ENDS. A tree that reverted to MODEL A would pass all of them with the same
numbers on a shorter rim.

**L8 is session 40's identity, negated, and measured on the emitted outline.**
It asserts the apex parity in BOTH directions, that an even count's apex relief
is exactly 0 and that its sinus carries no station on the margin, that the
treated arc is symmetric about the apex (the margin carries exactly the
treated half less the half-face it does not own), and — the load-bearing
clause — that the outline over `[uCap, 1]` is NOT identical to a plain petal.

**Seen red on MODEL A**: session 40's own `bloom-lobe-model-b.mjs --section=0`
is the independent witness. On `main` it reads `windowU[1] === uCap : true`,
`cut at uCap = exactly zero`, `4001 of 4001 samples Object.is-equal to the
plain petal`; on this tree, unchanged, it reads `false`, `2.53e-4`, and **3075
of 4001 differing**. Its verdict is now DERIVED from those rows rather than
written as a literal, so it stays a witness when the answer moves again.

### The load-bearing clause needed a SECOND half, and re-reading the diff is what found it

The clause above builds `h` and `hb` as two NODE rebuilds of the state the
page reports. **In CI that is the right pairing** — the page and the rebuild
run one source, so a shipped regression moves both together and the clause
catches it. **Under the mutant table it is worth nothing**, because the table
serves its mutation to the PAGE alone (`page.route`) and imports a separate
in-memory copy only for the witness: a tree that reverted to MODEL A on the
page would leave both halves of the clause unmutated and green. That is
session 41's own L7 finding — *a clause with no record to disagree with has
both halves on the same unmutated module* — arriving in the very family it was
learned in, one session later.

So L8 gained a clause that reads TWO ARRAYS THE BUILDER EMITTED: the
half-width drawn at each station (`petalProfile`) against the BASE half-width
it was drawn from (`petalProfileBase`). A cut that stops at the apex entry
shows there as the two agreeing on every row above `uCap`. The reference is
`shapeBaseAt`, which the treatment does not write; the quantity under test is
`shapeAt`, which is what a MODEL A revert moves — different owners, as
session 39's rule requires. It refuses to pass vacuously if no emitted row
stands above `uCap` at all.

And **`the-treatment-terminates-at-the-apex-entry` is the mutant** — one
clause added to `cutMm`, the single change that makes this session's whole
premise false — with a witness that reads the MUTATED module's own outline
(`halfWidthBaseAt` against `halfWidthAt` over `[uCap, 1]`, in LIVE so the
export floor cannot mask it), never the assertion it names.

**PENDING MEASUREMENT — the claim above is read off the code and not yet
run.** The experiment that settles it is the mutant against the harness
WITHOUT the page-side clause: if that pairing really is blind, it names L8 and
L8 stays green. Until that run is in hand this paragraph is a prediction, and
it is labelled one.

### What the other L clauses needed, and why

* **L7's instrument INVERTED with the law's form.** Session 41 wrote that the
  RATIO `1 - h/hb` is the right quantity and the DIFFERENCE `hb - h` is not,
  because under MODEL A's multiplicative cut the ratio was exactly `depth*g`
  and the difference carried the base outline's taper as a product. Under
  MODEL B the cut is a relief in millimetres, so the DIFFERENCE is exactly
  `R_k*g` and it is the RATIO that carries the taper — whose `1/hb` term is
  LINEAR in the offset and swamps an `e^3` notch. Measured before it was
  changed: an asked notch power of 3.00 read **1.966**. Session 41's note is
  kept above the new one so the inversion is checkable.
* **L7's bracket had to become the feature's OWN period in `u`.** MODEL B's
  periods are even in ARC and the arc runs through the converging tip, so a
  bracket sized from `(u1 - u0) / count` reaches several periods away at one
  end and a third of one at the other.
* **L7 must not pick `crestU[0]`** — the treated arc's base end, where the cut
  is exactly 0 on the outside; the search walked 0.06 below `u0` and reported
  no measurable power. And **both of a crest's neighbouring periods must
  actually cut**: an even count's apex period removes nothing, so the crest
  below it has no power to measure. Both are now skips, keyed on the record's
  own per-period reliefs.
* **L3's minima count had to move onto the mode-free lamina.** The mode's own
  floor manufactures a dip in `h/hb` that belongs to neither the law nor the
  cut — measured, it put a THIRD dip on a 3-tooth row whose law has two
  sinuses on the margin.
* **L6 splits its per-period clause in two.** The ladder PLACED the demand
  (an identity on `placedSub`, reported by `bladeStations`), and the
  gap-bound blend then moved stations — which is a different moment and a
  different claim, bounded at one station per boundary and reported.

---

## 9. Both STL gates tell the truth about a failing run (#220)

Shipped as the session's first commit, before any geometry. Both gates could
print a PASS-shaped tail on a run that had exited 1: the headline divided by
`results.length`, which is the SURVIVORS, so a dropped row left both numerator
and denominator and the ratio read N/N; and the failure block went to stderr
while the summary went to stdout, so in a combined CI log it flushed EARLIER
than the summary it follows. Session 41 read `672/672 rows are ONE connected
piece` off a 674-row matrix.

Three changes per gate, no assertion touched: the headline is the three real
populations and carries a DROPPED marker inline; a one-line pointer goes to
stdout when the validity block fires; the verdict is printed to stdout on BOTH
branches. Verified with a two-row `--only` run against a copy with one row
force-dropped.

**This session leaned on that fix immediately and repeatedly.** Every
diagnosis in §6 and §8 above started from a summary line that named the dropped
rows and the clause that dropped them.


---

## 10. Cost

**Zero triangles.** MODEL B is a boundary change on a fixed row-and-column
lattice: the row count is `NU` and the column count `NV` whatever the teeth
do. Measured on both trees:

| state | live tris | export tris | STL |
|---|---|---|---|
| the shipping default | 19,040 | 19,040 | 929.8 KiB |
| the default with `lobeDepth 0.30` | 19,040 | 19,040 | 929.8 KiB |
| 40 petals x 6 layers | 565,632 | 565,632 | 27,618.8 KiB |

Identical to `main` on every row of that table. The demand moves rows around
inside the window; it never adds one.

---

## 11. What is NOT done, and what it would cost

* **The second cut level** (sub-teeth riding on lobes) stays unbuilt, as
  session 41 left it. The law still composes — the cut is a reduction in
  millimetres subtracted from the base shape, so a second level is one more
  subtraction guarded by the same headroom — and what it would really cost is
  the DEMAND and the depth cap, not the law.
* **`placeInto`'s RESIDUAL knife edge.** §6: the by-construction tie is closed
  on every path (the derived slack is not scoped to the demand — it is in the
  one search both paths take, and it moves 0 stations over the whole matrix).
  What is left is the case the slack cannot reach: a target NEARLY but not
  exactly on a sample, where the two engines genuinely disagree about which
  side of it they are on. Interpolation is the law for that, and it needs X0's
  exact float32 comparison re-derived as an ULP BOUND in the same commit —
  a whole-matrix partition, a frozen phase and a full census re-baseline, and
  it should be its own session. **This session did not measure how often that
  residual case is close enough to bite**, which is the first thing that
  session should do.
* **`LOBE_BREAK_POWER`'s level is still typed** at 1.5 (session 41 flagged it).
  Nothing here moved it: the crest and notch powers below which a feature is
  DECLARED a tangent break are the same numbers on the same scale, and MODEL B
  changes where the features sit rather than what they are.
* **An even count's apex notch cannot be cut** — §1. Fixing it means shortening
  the petal at the apex, which is another control's region.
* **`shot-bloom-serration-range.mjs`'s own cells are MODEL A's counts**, and
  the image it writes (`lobe-shape-law.png`) is session 41's record. It still
  runs and its captions are still true of the shape law; what has moved under
  it is the count ceiling, which §4 restates. Re-rendering it is a one-line
  change and is not this session's.

