# Session 35 — the apex under cup: the rim-keyed field retired, the apex scale built

**Status: THE APEX SCALE IS BUILT AND MEASURED, COMMITTED LOCALLY, NOT PUSHED AND
NOT MERGED** — Eva's ruling is *"stop for Eva's ruling on the sheet before merging
any geometry."* Sections 1–5 are the earlier half of the session: the mechanism, the
retired rim-keyed field and why it does not ship, and the mutant-sweep strengthening
(including a fix for a mutant that was red on `main`). **Section 6 is what replaced
it.** Both negative controls are green, and both guards are proven by controls that
must fail.

---

## 0. The ruling this session was working to

Eva ruled (session 35): the apex threshold stays at **1.80** as its own exposed
control with a registry row and slider, per session 15 — the measured 1.90–2.15
crossing does not move it, because only the 1.33 onset is a property of the
outline while the crossings move with the reach law. Seven ordered steps, and
*"stop at any gate that does not clear"*.

Step ONE cleared for the wall instrument and found a pre-existing red in the apex
one (§3). **Step TWO did not clear (§2), so the build stopped there.**

---

## 1. What the discovery measured, kept here so it is not re-derived

Cup and margin buckling are both scaled by `h(u)`, the row's own half-width. At
the apex `h` is the terminal half-width — the print floor — so:

* **apex displacement = amplitude × terminal half-width, exactly.** 0.960 mm at
  `petalCup` 1.20 in export (`cup × 0.8`), 0.180 mm live (`cup × 0.15`).
  Independent of tip shape, taper, length and width; measured agreement 9e-16 mm.
* **apex ÷ rim peak is pinned at `terminalHalf / peakHalf`** — 10.00% export,
  1.88% live — for every cup in −0.80…1.20 and every buckle state swept
  (amplitude 0.10–0.60, f 3 and the f 7 ceiling, p 2/3/6).
* So the apex is **not** "undeformed by construction": it is deformed at exactly
  the print floor's share. That is why the ratio is a constant and why no
  setting of either control changes how the apex reads against the sides.

Two instrument lessons from getting there:

* **The turning ladder puts the buckle's own turning into row placement**, so a
  buckled build and its zero-amplitude control sample different stations
  (0.30408 against 0.30309 at row 19). Differencing them mixes the field with
  the ladder. The reference used instead is the flat sheet's **plane**, which at
  spine curl 0 / twist 0 / roll 0 is exact (planarity residual 1.8e-15 mm) and
  is defined everywhere rather than only at sampled stations.
* **The buckle amplitude is clamped**, so the law must be read at the builder's
  `ampBuilt` (0.359) and not the asked 0.600. Compared against the asked value
  the cross-check failed by 1.91 mm, which was the clamp and not the field.

---

## 2. STEP TWO — the rim-keyed field does not close V5, and the derivative is
not the reason

The formulation under test: `r` the plan distance to the rim, `R` the medial
radius at the nearest rim point, `q = 1 − r/R`, `w = c·R·q² = c·(R−r)²/R`.

### The analytic derivative

Derived and implemented: `dw/dy = c·(R−r)·[R_y(R+r) − 2R·r_y]/R²` with
`r_y = n̂·ŷ` (the exact gradient of a polyline distance field) and
`R_y = R'(s)·(t̂·ŷ)`.

**The smooth-curve Jacobian `1/(1 − rκ)` does NOT belong here** and applying it
was measured wrong: `r` is the distance to a *polyline*, whose foot point slides
along straight segments, so `ds/dy` is exactly `t̂·ŷ` with no curvature term.
With the Jacobian in, it ran 0.06–5.01 across the blade interior where a gently
curved rim should hold it near 1.

**κ must be smoothed if it is used at all.** It is a second difference of a
sampled curve: at 1,303 vertices over an 80 mm rim the spacing is ~0.06 mm and
the raw estimate is sampling noise (Jacobian 0.1167–13.8049 raw).

### Why it will not converge

The analytic derivative **cannot** converge against a central difference,
because the field is not continuous. Measured at the worst interior point
(u 0.196, v 0.333), stepping 1.25e-3 mm:

| quantity | across the step | note |
|---|---|---|
| `r` | −9.76e-4 mm | smooth; `r_y` = −0.7819 reproduces it to 4 s.f. |
| `s` (foot point) | **+2.35e-2 mm** | a HOP — `ds/da` reads 18.8 where `t̂·ŷ` is 0.625 |
| `R` | +1.19e-2 mm | inherited from the hop |
| `w` | +7.13e-3 mm | a jump in the field itself |

Convergence ratios over steps 1e-2 → 3.1e-4 mm: **1.04 / 1.23 / 0.88 / 0.68**,
where 4 is the signature of a correct derivative. The max error *doubles* as the
step halves, which is a jump discontinuity, not a wrong gradient.

**`R` is looked up at a foot point, and the foot point on a polyline is not
continuous.** That is structural, not a tuning problem.

### And the geometry is creased, independently of all of that

With the analytic derivative wired in — **no numerical step anywhere** — V5
still fails on every rim-keyed state:

| state | keying | WALL mm | SELF mm | V5 |
|---|---|---|---|---|
| cup 0.40 tip 2.45 | shipped | 1.0333 | 1.0929 | pass |
| cup 0.40 tip 2.45 | rim-keyed | 0.3133 | 0.2559 | **FAIL** |
| cup 0.80 tip 2.45 | shipped | 0.9095 | 1.0119 | pass |
| cup 0.80 tip 2.45 | rim-keyed | 0.0880 | 0.0657 | **FAIL** |
| cup 0.80 tip 1.20 | shipped | 1.1518 | 1.1709 | pass |
| cup 0.80 tip 1.20 | rim-keyed | 0.2929 | 0.5509 | **FAIL** |

Four independent checks say this is the geometry and not the instrument:

1. **V1 calibration is exact on the rim-keyed tree** — a flat build reads
   1.200000 mm.
2. **The patch is additive** — float-identical to shipped over 4 states × 2
   modes with the key absent.
3. **The emitted normal is fine.** Against the mesh's own normal from
   neighbouring emitted points: worst 11.62° rim-keyed against 9.16° shipped,
   and *fewer* points over 5° (22 of 432 against 68 of 432).
4. **The surface is creased.** Principal curvature radius **0.369 mm** at
   (u 0.349, v −0.333) against the shipped 1.760 mm at the same state — and
   against the one-sheet-thickness floor of 1.200 mm below which a shell's inner
   offset inverts.

Note the last row: `cup 0.80 tip 1.20` is the state whose **apex is bit-for-bit
the shipped one**, and the worst point is at u 0.349 — mid-blade, nowhere near
the apex. The rim-keyed reach damages the whole blade, not the end.

### What would have to change

`R` must stop being a foot-point lookup. Either the outline becomes a smooth
curve so the foot point is continuous, or the reach becomes a field over the
plan that is smooth by construction. Both are redesigns of the reach, not
adjustments to it, and neither was ruled.

---

## 3. STEP ONE — what the sweeps needed, and a pre-existing red

**A premise correction first.** Both harnesses already failed loudly on a moved
anchor: `verify-bloom-apex-mutants.mjs:197` counted matches, and
`bloom-wall-thickness.mjs` checked `mutated !== src`. Neither could silently
green from a stale string. The real holes were narrower:

1. **The wall instrument checked "something changed", not "exactly one site
   changed."** `String.replace` takes the first occurrence, so an anchor that
   becomes ambiguous lands the mutation somewhere nobody chose while the guard
   still passes. It counts now, as the apex table has since session 32.
2. **Neither checked that the intended BEHAVIOUR moved.** Every mutant now
   declares a `witness`: a direct call on the *mutated module* proving the
   behaviour changed, run before the assertions are consulted. The witness is
   deliberately not the assertion the mutant names — asking the gate whether the
   gate fired is the circularity the table exists to avoid.

Both guards are proven by controls that must fail:

* `--disarm=<id>` gives one mutant a stale anchor → reported.
* `--neuter=<id>` makes one mutant's edit apply while changing nothing → the
  witness reports it (`ampBuilt is 0.0660, still clamped below the asked 0.6`).

**The witness clause immediately found a real defect in itself and then a real
defect in the table.**

* Its first version rebuilt the profile with a stub ring (`{ width: 6.4 }`) and
  read stations **7.11e-2 away** from the ones the builder emits — a second
  producer of the profile, inside the instrument written to catch second
  producers. Every witness reads `buildBloomInto`'s own report now.
* **`stations-not-increasing` was RED ON `main` before this session** — verified
  by running the committed file from `git show HEAD:`; it named A7 and fired
  nothing. **Fixed here, and the cause is one value.** The row was pinned to
  `petalTipShape 1` when it was chosen at **NU 28** (session 32). At NU 56 that
  is precisely the exponent where the ladder stops saturating, so the
  de-duplication pass had nothing to do on that row: the witness measured the
  mutation moving the ladder by only 9.302e-6 mm at row 23 — above
  `ROOT_BLEND_END`, so outside what A7 asserts — with the stations still
  strictly increasing.

  Swept at NU 56 over **9,072 buckled states**: 2,232 move the ladder at all
  when the repair is removed (worst 5.217e-5 in u) and **159 produce a
  non-increasing pair**. The one nearest the shipped defaults is the harness's
  own row with the exponent simply left alone — two controls off default rather
  than three. With `petalTipShape` removed from the row, **A7 fires and the
  whole table is green.**

  The general lesson is the durable rule arriving from a new direction: *a row
  chosen against a row COUNT goes stale when the count changes.* NU went 28 to
  56 in session 34 and this state went with it, silently, because the harness
  had no way to tell that its chosen row had stopped exercising the branch. The
  witness clause is that way.

---

## 4. §18a — a shipped state already sits under the printable gap

**Filed separately, against shipped geometry, and not folded into anything
above.** `petalCup` 1.20 × `petalTipShape` 2.45 reads **SELF 0.994 mm** against
the `MIN_FEATURE_MM` bar of 1.00 mm, in export at 56 × 10. At 3.00 it reads
0.832 mm.

This reproduces §18a of the session-32 outcome ("1.031 at 1.20, 1.031 at the
shipped 1.70, 1.019 at 2.00, 0.977 at 2.50, 0.832 at 3.00") on today's tree, and
it is the combination hazard that doc records: **the matrix varies one control
at a time, so a two-control product is invisible to it by construction.** The
scheduled item there is a combination gate — a predeclared set of two-control
products through the wall instrument. It is still not built, and this session
did not build it.

---

## 5. Not reached

Steps THREE (the reach `beta` exposed or pinned), FOUR (apex sampling, 2 rows
vs 4 above u 0.99), FIVE (the second copies), SIX (read-outs and prose) and
SEVEN (the rim curve as a shipped primitive with one owner) were **not started**,
because step TWO is the gate they all sit behind. The audit that costed them is
in the session-35 report; the three highest-value items were
`telemetry()` at `bloom-geometry.js:4109-4123` and `:4134-4153` (two more copies
of `sectAt`, both already omitting the buckle), `bladeStations`' wave at
`:3123-3126` (a third copy, assuming `|v|^p = 1` at the rim), and the
source-string pinning in the two negative controls — which is the one item step
ONE did address.

---

## 6. THE APEX SWEEP — what shipped, and what it is not

**Status: BUILT, MEASURED, COMMITTED LOCALLY, NOT PUSHED AND NOT MERGED.** Eva's
ruling: *"Stop for Eva's ruling on the sheet before merging any geometry. She has
still not seen a swept apex that does not crease."* The sheet is
`node tools/shot-bloom-apex-sweep.mjs <dir>`.

### 6.1 The law

`apexScale()` in `bloom-geometry.js` is the one owner:

```
S(u) = h(u)                                              for u <= u0
S(u) = h(u) + sweep * (R - h(u)) * smootherstep((u-u0)/(1-u0))
```

`R` is the tip's **inscribed radius** — the largest disc that fits inside the plan
outline and touches the apex — and `u0` is where `h` falls to `R`. Both are derived
from `widthProfile()`'s own answer. **There is no threshold anywhere**, which was
Eva's constraint from session 15: at a pointed tip the inscribed radius IS the
terminal half-width, `u0` runs to 1, the blend region is empty and `S` is `h`
identically. The outline is untouched — `widthProfile()` keeps sole ownership of the
boundary, so this never competes with the tip law for it.

`petalApexSweep` (PETAL FORM, 0–1 step 0.05, **default 0**) is the one exposed
control. It is a STRENGTH, not a place. It is deliberately NOT a member of
`petalFormIsFlat` or of `FORM_IDS`: at cup 0 with no buckle there is nothing for it
to multiply, so it cannot decide flatness — the curl family's own rule.

### 6.2 The five declared properties, and the one that was withdrawn

Declared in the scratch header **before the blend shape was picked**, because the
blend carries the whole behaviour.

| | property | measured |
|---|---|---|
| P1 | `S` is `h` exactly below `u0` | **0.00e+0** at every exponent, 20,001 stations |
| P2 | C1 at the join and at the apex | identity + measured, see below |
| P3 | `S >= h`, no interior minimum | `S >= h`: **0 of 20,001** below. **Second half WITHDRAWN** |
| P4 | `S(1)` is the tip inscribed radius | apex share = `R/peakHalf` exactly on real builds |
| P5 | closed-form derivative | buckle converges **4.00x / 4.00x / 4.00x**; cup is exact |

**P2 is an IDENTITY, not a limit.** The smootherstep has `w(0)`, `w'(0)` and `w'(1)`
all EXACT doubles 0, so the blend contributes exactly nothing to `S` or `S'` at the
join, and the scale arrives at the apex with zero slope at sweep 1.

**And the obvious negative control for it does not work — which is itself a finding.**
A LINEAR ramp started at `u0` is still C1 there, because `u0` is *defined* as where
`h` falls to `R`, so the blend amplitude `R - h(u0)` is exactly 0 — measured
**-1.8e-15** — and no ramp shape makes a kink out of a zero amplitude. The join is C1
for a structural reason, not because of the smootherstep. The control that *does*
discriminate starts the blend early, at `u0/2`, where `R - h` is nonzero: there the
linear ramp holds a **fixed 1.28e+1** jump (falls 1.00x over two decades) while the
smootherstep falls **102x**.

**P3's second half is unachievable and the reason is a theorem.** `S` leaves `u0`
with `h`'s own FALLING slope (P2) and must return to `R` at the apex (P4), so by the
mean value theorem it has an interior minimum whatever the blend shape. The three
ways out each give up a declared property: end below `R` (drops P4), join with a kink
(drops P2), or start the blend where `h` still exceeds `R` so `S` descends
monotonically — which puts `S` BELOW `h` over that stretch and so reduces the ruled
deformation (drops P1). **P1 is the one Eva named explicitly, so it is kept and the
dip is measured instead.** What is true, and is the property that matters, is that the
scallop is **shallower than the one the shipped build already has at the same place**,
at every exponent:

| tip n | S's dip | today's fall | |
|---|---|---|---|
| 1.60 | 0.1988 | 0.2791 | 1.40x shallower |
| 1.80 | 0.2862 | 0.9089 | 3.18x |
| 2.45 | 0.6286 | 4.5687 | 7.27x |
| 3.00 | 0.5826 | 5.8531 | 10.05x |

The margin lift is `c*S`, so today's apex ALREADY scallops and this reduces the
scallop monotonically rather than introducing one. **It is not zero, and it is on the
sheet for Eva rather than settled here.**

### 6.3 The consumer side is a RATIO, and that is what makes `0 moved` true

Putting `S` where `h` stands gives a derivative `(2*c*S*v)/h`, which at `S === h` is
**one ULP** off the shipped double `2*c*v` (measured 2.22e-16) — on every blade point
of every row, so `0 moved` would be false and a retirement partition would have no
inert class. Instead `k = S/h` is appended as the **last factor**: `h/h` is exactly
1.0 and `x * 1.0` is exactly `x`, so each of the four expressions is the shipped one
with a factor that is the exact double 1. Same doctrine as *roundedness 1 makes the
blend exactly 1* in the tip law. `kAt` additionally returns null where the blend is
inactive so `sectAt` takes the shipped expression by a BRANCH as well.

**Measured: 0 of 171,360 emitted floats move at the shipping default, in BOTH modes**
(`Object.is`, so `-0` is distinguished). **0 triangles added at any setting**
(19,040 live at every state swept).

### 6.4 P4 does NOT reproduce the retired participation figures, and the retired ones are wrong

Eva's requirement was to reproduce the measured rim-keyed participation figures,
*"since those numbers are the inscribed radius times the amplitude"*, and to report
which is wrong if it does not. **It does not, below n 2.15.**

| n | R here | the retired run's own `tipR` column | R/peakHalf | its `Pi` column |
|---|---|---|---|---|
| 1.20 | 0.8000 | 0.8000 | 10.0% | — |
| 1.60 | 1.0791 | 1.0830 | 13.5% | 21.5% |
| 1.80 | 1.7089 | 1.7110 | 21.4% | 29.3% |
| 2.00 | 2.8937 | 2.8950 | 36.2% | 39.3% |
| 2.15 | 3.9794 | 3.9790 | 49.7% | **49.7%** |
| 2.45 | 5.3687 | 5.3690 | 67.1% | **67.1%** |
| 3.00 | 6.6531 | 6.6530 | 83.2% | **83.2%** |

**The `tipR` column agrees on 7 of 7 to within 0.5%** — the two constructions compute
the same inscribed radius. **The participation column agrees on exactly the three at
n >= 2.15.** The retired figures are the wrong half, and three things say so:

1. **Their producer no longer exists.** `rimcurve.mjs` as it now stands returns
   **0.5158 mm** at the apex where that table recorded **1.375** — the file was
   iterated after the table was made, so the participation column cannot be
   re-derived from anything.
2. **The retired field FAILED V5 at every one of those states** (session 35 §2, every
   rim-keyed row). A participation figure produced by a construction that creases the
   blade is not a target to reproduce.
3. **Eva's own premise is what this scale satisfies.** `S(1) = R` at sweep 1, so the
   apex share IS `inscribedRadius / peakHalf` by construction — measured on real
   builds at 16.7 / 21.4 / 67.1 / 83.2% for n 1.70 / 1.80 / 2.45 / 3.00, and 10.0%
   (inert) at 1.20.

**A rig defect found on the way, worth not re-learning:** the inscribed radius from a
coarse scan **had not converged and the error is one-sided**. Near a pointed tip the
outline runs parallel to the axis at the print floor, so the binding station sits in a
well of half-width `sqrt(2*h*eps)` that a 2048-step scan misses until `eps` reaches
~6e-5 mm — and the scan then reports a disc LARGER than fits. Measured: R read
**1.0910 / 1.0835 / 1.0793** at 1303 / 2048 / 65536 steps, monotone downward, quoted
to four decimals throughout. With a local ternary pass (`refineDepth()`'s own
discipline) R is identical to 6 decimals from 512 steps to 65536, spread 3.8e-14 — and
`R - terminal` at a pointed tip becomes **exactly 0**, so the self-cancelling property
is an exact identity rather than a 6.5e-6 mm coincidence.

### 6.5 The printable ceiling, and the three readings ranked

**Reading 1 — principal radius of the mid-surface, normal-free.** A PCA of each
neighbourhood's own points supplies the frame; no emitted normal is read anywhere, so
it is independent of V5's rig as Eva required. **Its V1: it reads a known cylinder
2.41% and a known sphere 1.51% LOW at every radius from 1.2 to 20 mm** — a constant,
scale-independent, conservative bias, stated rather than tuned away.

**AND THE SHIPPED CURVATURE INSTRUMENT IS BLIND TO THIS FEATURE'S OWN REGION.**
`measureCurvature` excludes `u > 0.92`; the sweep acts above `u0`, which is 0.84–0.98.
Extending the window was tried and is **wrong**: a 5x5 quadratic stencil spanning the
tip cap's own corner has no principal curvature to fit, and the readings hop
non-monotonically (0.5547 → 0.5428 → 0.5366 → **1.2995** → 1.3398 across one sweep,
with the worst point moving between u 0.986 and u 0.941). The shipped window is right
and the tip cap is **not measurable by this instrument at this grid** — a limitation
stated, not papered over.

On the measurable window, **the sweep never binds**:

| tip n | R at sweep 0 | R at sweep 1 | change | max sweep >= 1.200 mm |
|---|---|---|---|---|
| 1.20 | inert | inert | 0.0% | inert |
| 1.70 | 1.8012 | 1.8012 | 0.0% | 1.00 |
| 1.80 | 2.2287 | 2.2287 | 0.0% | 1.00 |
| 2.45 | 2.7009 | 2.7003 | −0.0% | 1.00 |
| 3.00 | 2.1460 | 1.8165 | −15.4% | 1.00 |

(petalCup 1.20, EXPORT, 56 x 10. At cup 0.40 and 0.80 the pattern is the same, with
tip 3.00 costing 4.2% and 10.0%.) **So the largest apex participation available is the
full one at every tip shape** — 83.2% at 3.00, 67.1% at 2.45, 21.4% at 1.80, 16.7% at
1.70, 10.0% (inert) at 1.20. Confirmed independently: at `cup 1.20 x tip 3.00 x sweep
1.00`, the most extreme reachable state, the shipped instrument reads **2.3712 mm** and
the normal-free one **1.8165 mm**, both above the 1.200 floor.

**Reading 2 — normal-free self-approach on the mid-surface.** Convention, stated: a
point's approach to another part of the same sheet, excluded by the **undeformed
sheet's own in-plane distance** at three sheet thicknesses (3.600 mm), taken from the
emitted rows' own `u` and `halfWidth`. For a plane that IS the along-surface distance,
so the calibration holds by construction: **a flat build reads 3.6001 mm against its
3.600 mm bar.** Three earlier conventions were falsified by that one calibration —
the shipped +/-2-ROW index window (flat reads 0.6219 mm, which is the row pitch, and
this is the index-window error Eva named), a `hypot` over cumulative arc lengths (flat
reads 2.1598), and an 8-neighbour Dijkstra on the emitted grid (flat reads 3.0785, the
grid being anisotropic at ~0.7 mm row pitch against ~1.7 mm column pitch).

Its answer: **no self-approach anywhere in the sweep's reachable box.** Positive
control, a roll-330 fold, reads **0.019 mm** and is bar-insensitive.

**Reading 3 — V5, the shipped gate.** Third because it reads the two OFFSET SKINS, so
it inherits whatever the emitted normal did.

**AND THE THREE READINGS DISAGREE ABOUT THE SECTION 18a STATE, IN A WAY THAT MATTERS.**
V5 reads **0.994 mm** at `petalCup 1.20 x petalTipShape 2.45`. Sweeping the exclusion
bar separates a fold from a curvature reading — a fold is insensitive to the bar, a
chord under an arc of exactly that length tracks it:

| state | 0.5t | 1t | 2t | 3t | 6t | 10t |
|---|---|---|---|---|---|---|
| FLAT (default) | 0.601 | 1.201 | 2.401 | 3.600 | 7.200 | 12.000 |
| cup 1.20 tip 2.45 | 0.608 | 1.200 | 2.406 | 3.601 | 7.202 | 12.005 |
| roll 330 (a real fold) | 0.019 | 0.019 | 0.019 | 0.019 | 0.019 | 0.028 |

**The section-18a state is indistinguishable from FLAT at every bar.** So its 0.994 mm
is not a mid-surface fold; it is curvature seen through the offset skins, which is why
Eva ranked principal radius first. **This is reported, not acted on** — the
`SELF_XFAIL` entries and section 18a's whole family of numbers may be the same thing,
and re-deriving them is its own scheduled item, not this session's to decide.

**One new sub-floor state, confirmed by two independent instruments:** `petalCup 1.20 x
petalTipShape 1.20` reads **0.9269 mm** (shipped, at u 0.368) and **0.4405 mm**
(normal-free, at u 0.362) — same place, both below the 1.200 floor, **pre-existing and
unaffected by the sweep** (0.0% change across the whole sweep range). Another
section-18a-class two-control product, invisible to a matrix that varies one control at
a time. `petalCup 0.80 x petalTipShape 1.20` is **NOT** confirmed — the two instruments
disagree on both location and verdict, so it is recorded as unconfirmed rather than as
a finding.

### 6.5b The cost, and the one number that is not free

**Triangles: zero added, at every setting.** 19,040 live and export on the default
petal at every sweep; 94,432 on a 40-petal continuous bloom. Export STL 930 KiB
default, 4,611 KiB at 40 petals — identical to the shipped figures, because the scale
changes where points sit and not how many there are.

**Watertightness holds.** A direct edge census on the builder's own export-mode output
over nine swept states — including the maximum reach, a reflex cup, the iris buckle,
the f 7 buckle ceiling, the inert pointed tip, and a 40-petal CONTINUOUS bloom — gives
**boundary = 0, degenerate = 0, non-manifold = 0** on all nine. That is a direct census
and NOT the browser gate; the full matrix on `verify-bloom-export.mjs` and
`verify-bloom-connectedness.mjs` is still what merge requires.

**AND THE CROSS-WIDTH METRIC IS THE COST.** `v` is uniform in PARAMETER, not in arc
length, and the scale multiplies the cross-width derivative — so at `petalCup 1.20 x
petalTipShape 2.45`, sweep 0 to 1 takes `metricMax` from **2.600 to 16.137** and
`polylineMax` from 1.631 to 8.129. CLAUDE.md records 4.12 as the previous worst
reachable metric, so this is four times it.

It is not a defect, it is what "the rim carries around at constant height" means for a
narrowing blade: at `u0` the row is 5.37 mm half-wide and its margin lifts 6.44 mm; at
the apex the row is 0.80 mm half-wide and its margin lifts the same 6.44 mm, so the
surface between midrib and rim is necessarily steeper there. But it means **the apex
row's ten emitted columns are very unevenly spaced in millimetres**, which is a
sampling question the sheet's profile rows are the place to judge, and it is the
strongest argument for a smaller default than 1.00.

**The second-copies audit, re-derived against this scale.** `telemetry()` holds two
more copies of the cross-section — the metric loop at `bloom-geometry.js:4282` and the
polyline loop below it — and both already omitted the buckle before this session. A
scale wired only into `sectAt` would have left them reporting the UNSWEPT stretch on
every swept row: the same defect one layer down, and the reason the numbers above
exist at all. Both read the scale now; the flat default still reports `null`, which is
the guard doing its job.

### 6.6 What is not done

* **The 1.80 threshold control is WITHDRAWN**, per Eva: *"A number that moves when the
  implementation moves cannot be a shipped boundary."* Nothing replaces it; the outline
  decides.
* **The default sweep value is NOT proposed here.** Eva asked which value makes
  `petalTipShape` 1.80 read as a bowl rather than a point, from the sheet. Row 2 of the
  sheet is that axis and the answer is hers to give in front of it. The EXPORT apex
  share at 1.80 runs 10.0 / 12.8 / 15.7 / 18.5 / 21.4% across sweeps 0 to 1.
* **No matrix rows, no gate assertions, no read-out prose yet** — those follow the
  ruling, since a withdrawn form would take them with it.
* The second-copies audit, the apex sampling test (2 rows vs 4) and the read-out pass
  are re-derived against this scale and are **not started**.

### 6.7 Unblocked for another session

**Arc-length parameterisation ALONG the rim is well-posed and is unblocked by this
ruling.** It is a different question from the reach — it is about how the rim's own
samples are spaced, not about how far a deformation carries — and it belongs to the
lobe / serration session. Nothing here forecloses it.
