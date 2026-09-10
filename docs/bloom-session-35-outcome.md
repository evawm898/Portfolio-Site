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

### 6.5c EVA'S OWN QUESTION, ANSWERED — and the answer is not a sweep value

Eva asked which sweep makes `petalTipShape` 1.80 read as a bowl rather than a point,
and to propose it as the default. **No value does, and the reason is the outline
rather than the control.** The sweep cannot carry the apex past the tip's own
inscribed radius, so the CEILING on apex participation is set by the shape:

| tip n | inscribed R | ceiling on apex share at sweep 1.00 |
|---|---|---|
| 1.20 | 0.8000 | 10.0% (inert — R IS the terminal half-width) |
| 1.40 | 0.8190 | 10.2% |
| 1.60 | 1.0791 | 13.5% |
| 1.70 | 1.3393 | 16.7% |
| **1.80** | **1.7089** | **21.4%** |
| 2.00 | 2.8937 | 36.2% |
| 2.15 | 3.9794 | 49.7% |
| 2.45 | 5.3687 | 67.1% |
| 3.00 | 6.6531 | 83.2% |

(peakHalf 8.00 mm on the shipping petal, EXPORT, 56 x 10.)

At 1.80 the apex can reach **at most a fifth** of the rim's peak however hard the
control is pushed. **The bowl only becomes available above 2.00**, and it is
unmistakable at 2.45 and 3.00.

**This bears on the original ruling.** The 1.80 boundary was chosen against the
rim-keyed construction, which is retired; measured against the outline itself the
physical crossover is higher. That is reported, not acted on — the threshold control
is withdrawn either way, so nothing in the shipped code depends on where the crossover
sits. **A default for the sweep is therefore not proposed here**: it is a taste
decision about how far the bowl should carry on the tip shapes where it CAN carry, and
it belongs in front of the sheet.

### 6.5d THE CEILING, CORRECTED — AND THE FEATURE DOES NOT CLEAR IT

**Section 6.5's conclusion that "the sweep never binds" IS WITHDRAWN. It was wrong,
and the error is one this session had already named out loud and then walked into.**

Both curvature instruments exclude `u > 0.92` — the shipped `measureCurvature` by
its own `uMax`, and the normal-free one because a 5x5 stencil across the tip cap's
corner has no curvature to fit. The apex sweep acts at `u` 0.84–0.98. §6.5 states
that limitation and then reads a ceiling off those instruments anyway. **A reading
taken outside the region a feature acts in is not evidence about that feature**, and
this is the fifth instance in this project of a label naming a computation nobody
performed.

`measureWall` is not blind there: it reads EMITTED POINTS rather than fitting a
stencil. Re-run on swept states (EXPORT, 56 x 10, the shipped conventions):

| state | WALL mm | SELF mm | V4 | V5 |
|---|---|---|---|---|
| flat — the shipping default | 1.2000 | 1.2460 | ok | ok |
| SHIPPED cup 1.2 | 1.0710 | 1.0310 | ok | ok |
| cup 1.2 tip 1.80 **sweep 0** | 1.0485 | 1.0310 | RED | ok |
| cup 1.2 tip 1.80 **sweep 1.00** | 0.7514 | **0.7333** | RED | **RED** |
| cup 1.2 tip 2.45 sweep 0 | 0.8528 | 0.9941 | RED | RED |
| cup 1.2 tip 2.45 **sweep 1.00** | 0.3374 | **0.4821** | RED | RED |
| cup 1.2 tip 3.00 **sweep 1.00** | 0.2104 | 0.5500 | RED | RED |
| tip 1.20 sweep 1.00 (INERT) | 1.0740 | 1.0310 | ok | ok |

**At tip 1.80 the sweep takes a PASSING state to a FAILING one** — SELF 1.0310 to
0.7333 — which is precisely what Eva's stopping rule exists to catch.

**THE CEILING, from V4 and V5, per (cup, tip shape):**

| cup | tip n | baseline V4 / V5 | largest sweep holding both | apex share there |
|---|---|---|---|---|
| 0.40 | 1.20 | ok / ok | 1.00 (INERT) | 10.0% |
| 0.40 | 1.70 | ok / ok | 0.75 | 15.1% |
| 0.40 | 1.80 | ok / ok | **0.30** | 13.4% |
| 0.40 | 2.45 | RED / ok | none — red at sweep 0 | — |
| 0.40 | 3.00 | RED / RED | none — red at sweep 0 | — |
| 0.80 | 1.70 | ok / ok | 0.40 | 12.7% |
| 0.80 | 1.80 | ok / ok | **0.00** | 10.0% |
| 1.20 | 1.70 | ok / ok | **0.05** | 10.3% |
| 1.20 | 1.80 | RED / ok | none — red at sweep 0 | — |
| 1.20 | 2.45 / 3.00 | RED / RED | none — red at sweep 0 | — |

**THE FEATURE AS BUILT DOES NOT DELIVER A PRINTABLE BOWL ANYWHERE, and the reason is
structural rather than a tuning miss.** The two halves of the range fail for opposite
reasons:

* where V5 holds, the tip is POINTED, so the inscribed radius is small and the sweep
  buys between 0 and 5 percentage points of apex share over the 10.0% already there;
* where a real bowl is available (2.45 at 67.1%, 3.00 at 83.2%), the geometry is
  **already below the printable bar at sweep 0** — the pre-existing section-18a
  family — so there is nothing safe to sweep from.

**So the proposed default is 0**, which is what ships, and the earlier proposal of
1.00 in this session's report is withdrawn. The three readings' disagreement is
itself the substantive result: the mid-surface does NOT approach itself (reading 2
stays saturated at its bar on every swept state), and the principal radius on the
measurable window barely moves — but the OFFSET SKINS invert, in the tip-cap region
neither curvature instrument can see. **A skin-to-skin collapse under a curved sheet
is a curvature symptom, and the curvature that causes it is exactly where this grid
cannot resolve it.**

**WHAT WOULD HAVE TO CHANGE**, recorded rather than attempted: the sweep raises the
cross-width metric at the apex to 16.137 (§6.5b) because it scales the derivative on
a row that is 0.80 mm half-wide. The wall collapses for the same reason. Any version
of this that clears V4 and V5 has to either put more columns where the metric is
large, or bound the sweep by the wall the row can actually carry — and the second is
a clamp derived from a measurement, which is the shape session 34 ruled acceptable
for the buckle. Neither is built, and neither should be without a ruling.

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

---

## 7. THE SELF-INTERSECTION CENSUS — and V5 was not over-reporting, it was blind

**Eva's ruling: the evidence the sweep was judged on did not hold together.** Three
readings disagreed and only one of them redded. Watertight means no open boundary
edges; connected means one region; **neither catches a solid that passes through
itself**, which is the condition that actually breaks a slicer. There was no such
test anywhere in the gates and V5 had been standing in for one.

`tools/bloom-self-intersection.mjs` is that test.

### 7.1 What it measures, and the scoping decision that is the whole design

The export contract is *"every primitive is an individually closed solid"* and
**"overlapping closed shells are fine — the slicer unions them."** The bloom relies
on that: the cleft's lobe panels reach `PANEL_OVERLAP_ROWS` down into the base panel,
every stamen and style is rooted THROUGH the hub slab, every petal foot sits inside
the hub. **A census over the whole mesh would report thousands of intersecting pairs
BY DESIGN and mean nothing** — 4,720 of them on the flat shipping default.

So the census runs WITHIN each closed shell and reports cross-shell hits separately
as by-design. That is the question the export contract poses, and it is the same
question a folded petal poses: does THIS sheet pass through ITSELF?

### 7.2 The adjacency exclusion is per intersection POINT, not per pair

Two triangles sharing a vertex meet there; two sharing an edge meet along it. A
blanket "skip pairs that share a vertex" would also skip a pair that shares a vertex
**and crosses somewhere else** — a real fold, silently dropped. So every intersection
point is computed, and a point is discarded only if it IS the shared feature: equal
to a shared vertex, or lying on the segment between two shared vertices. The
discarded set is exactly the topology and nothing more.

`--prove-exclusion` demonstrates it on a written-down pair sharing exactly one
vertex: **arranged to cross elsewhere it reports 1; touching only at the shared
vertex it reports 0.**

### 7.3 CALIBRATION — and it took two goes, both the same error class

| | |
|---|---|
| flat shipping default | **0 within-shell pairs** — exactly zero, PASS |
| roll 330 (a known fold) | **18,776 pairs**, worst span 1.3837 mm — detected, PASS |

**Two defects in the instrument, both an epsilon that should have been a
measurement**, and neither would have announced itself:

1. **The parallel test was ABSOLUTE where the quantity is a volume.** `det` is a
   triple product, so on a millimetre mesh its natural scale is `|e1|·|p|`; an
   exactly-parallel edge computes to ~1e-17 rather than 0, and a guard of `< 1e-18`
   let it through with `1/det ≈ 1e17`, manufacturing barycentric coordinates that
   land in [0,1] by accident. **The flat default read 27,356 within-shell
   intersections**, every one an edge parallel to the other triangle's plane
   reporting a hit at its own start vertex. Relative guard: 1,220.
2. **The barycentric solve is ill-conditioned near parallel and cannot be fixed by
   any epsilon.** A surviving pair reported `u=1, v=0, t=0` — placing the hit at the
   edge's start AND at the triangle's second corner, **0.63 mm apart**, on an edge
   whose direction cosine against the normal was 8.5e-6. No threshold separates that
   from a real shallow crossing. The fix is to **verify the point** (is it on the
   segment? is it in the triangle?) rather than trust the solve. Flat then reads 0.

### 7.4 THE VERDICT, per state — EXPORT, 56 × 10

| state | V4 wall | V5 self | census pairs | worst span | sound? |
|---|---|---|---|---|---|
| flat — the shipping default | ok | ok | **0** | — | **SOUND** |
| cup 1.20 × tip **1.70** (the SHIPPING tip) | ok 1.0710 | ok 1.0310 | 750 | 0.1268 mm | **no** |
| cup 1.20 × tip 1.80 | RED 1.0485 | ok 1.0310 | 748 | 0.1164 mm | **no** |
| cup 1.20 × tip 2.45 | RED 0.8528 | RED 0.9941 | 771 | 0.1213 mm | **no** |
| cup 1.20 × tip 3.00 | RED 0.7160 | RED 0.8320 | 785 | 0.1164 mm | **no** |
| cup 1.2 × tip 1.80 × **sweep 1.00** | RED | RED 0.733 | 668 | 0.4343 mm | **no** |
| cup 1.2 × tip 2.45 × **sweep 1.00** | RED | RED 0.482 | 579 | 1.6379 mm | **no** |
| cup 1.2 × tip 3.00 × **sweep 1.00** | RED | RED | 537 | 2.0437 mm | **no** |
| buckle at the clamp (A 0.60, f 3) | ok | ok | 8 | 0.0179 mm | **no** |
| buckle at the frequency ceiling (f 7) | ok | ok | **0** | — | **SOUND** |
| twist 180 | ok | ok | **0** | — | **SOUND** |
| curl 360 | — | — | 1,008 | 0.5233 mm | no |
| roll 330 | RED (xfail) | RED (xfail) | 18,776 | 1.3837 mm | no |
| all form at maximum | RED (xfail) | RED (xfail) | 11,056 | 1.7810 mm | no |

### 7.5 **V5 WAS NOT OVER-REPORTING. IT IS BLIND TO THIS FAILURE.**

Eva offered two branches — the census contradicts V5, or it confirms it. **Neither is
what happened.** The onset table is the finding:

| cup | V4 wall | V5 self | census |
|---|---|---|---|
| 0.00 – 0.50 | ok | ok | 0 — SOUND |
| **0.60** | ok 1.1085 | ok 1.1785 | **12 pairs** |
| 0.80 | ok 1.0890 | ok 1.1494 | **375**, 0.2104 mm |
| 1.00 | ok 1.0776 | ok 1.1020 | **679**, 0.2022 mm |
| 1.20 | ok 1.0710 | ok 1.0310 | **750**, 0.1268 mm |

**V4 and V5 pass at EVERY cup value, including 1.20 where the solid genuinely
self-intersects in 750 triangle pairs.** So V5 is not a conservative proxy that
over-reports — it misses the failure entirely, and only starts complaining much later
when the TIP SHAPE is also pushed. The ruling's second branch is the closer one:
**the shapes really are unsound, and they are unsound earlier and more widely than
V5 ever said.**

**WHERE, and the mechanism, read off a pair by hand rather than inferred.** Every
worst case sits at radius 39.7–40.2 mm of a 40 mm petal — the apex. The worst pair on
the shipping tip is `T1[1] = (28.0338, −28.0419)` against `T2[0] = (28.0419,
−28.0338)`: **mirror images across the petal's own midrib**, normals 64.7° apart,
centroids 0.0764 mm apart. At the terminal row the blade is 1.6 mm wide and 1.2 mm
thick and cup lifts each margin 0.96 mm — **a sheet that thick bent into a V that
narrow must invert its inner offset.** It is geometrically necessary, not a bug in a
blend.

**IT IS PRE-EXISTING, verified on a real worktree of `main` at `a827b6d`** rather than
inferred from the byte-identity claim: flat 0, cup 1.20 × tip 1.70 → 750 / 0.1268 mm,
tip 2.45 → 771 / 0.1213, tip 3.00 → 785 / 0.1164 — **identical to this branch**, which
independently corroborates that the apex sweep moves nothing at its default.

**AND SHEET THICKNESS AND PETAL SCALE DO NOT FIX IT** — the ruling's proposed next
question, answered while the instrument was open. At cup 1.20:

| variation | pairs | worst span |
|---|---|---|
| as shipped (sheet 1.20, length 40) | 750 | 0.1268 mm |
| sheet 0.60 (the thinnest reachable) | 481 | **0.2240 mm** |
| sheet 2.00 | 1,408 | 0.4354 mm |
| petalLength 60 | 799 | 0.2340 mm |
| petalWidth 24 | 798 | 0.1259 mm |
| petalWidth 8 | 840 | 0.4039 mm |
| tipThinning 1 | 470 | 0.2240 mm |

None clears it, and a thinner sheet makes the worst crossing DEEPER while making it
rarer. The lever is the apex's own terminal width against the sheet thickness, which
is `TIP_HALF_MM` and `MIN_FEATURE_MM` — not a blend shape and not a scale.

### 7.6 Cost — no bound needed

| mesh | triangles | census |
|---|---|---|
| shipping default | 19,040 | 387 ms |
| cup 1.20 | 19,040 | 627 ms |
| roll 330 (18,776 hits) | 19,040 | 590 ms |
| CONTINUOUS 40 petals | 94,432 | 6.0 s |
| CONTINUOUS 40 + cup 1.2 | 94,432 | 8.8 s |

Exact, via a uniform grid over triangle AABBs — a pair is tested only if their boxes
share a cell, which cannot miss an intersecting pair because intersecting triangles
have overlapping boxes. **Sub-second on a typical row against a gate that already
runs 74–118 minutes, so the exact census needs no bound.**

### 7.7 What V5 should become — proposed, not done

**Do not delete it and do not weaken its bar.** Three separate properties are in play
and they were being carried by two instruments:

1. **Self-intersection** — does the shell pass through itself? **The census owns
   this, and it is the printability verdict.** Nothing else measures it.
2. **Offset inversion** — is the emitted wall as thick as declared? **V4 owns this**
   and it stays exactly as it is; it is a real and distinct property.
3. **The printable air gap** — are two parts of the sheet that are far apart *along
   the surface* too close in space for a slicer to keep them separate? That is what
   V5 was reaching for, it is a genuine printability question, and it is **not**
   self-intersection.

So the proposal is to **re-scope V5 to (3) under its own name** — a MINIMUM GAP
assertion — and fix its exclusion at the same time, because as implemented it is
wrong for that purpose too: its ±2-ROW index window is 1.4 mm of blade at NU 56, so
it reads the chord under an arc rather than a gap (a flat build reports 0.6219 mm).
The convention calibrated in §6.5d is the fix — the **undeformed sheet's own in-plane
distance**, at which a flat build reads its own 3.600 mm bar by construction.

**AND THE CENSUS CANNOT BE WIRED AS A HARD GATE TODAY**, because it reds on shipped
geometry from cup 0.60 up. Landing it means a declared xfail list measured on `main`
— exactly the pattern session 34 used for `SELF_XFAIL`, and for the same reason: an
unenforced number becomes folklore within two sessions, but a gate that reds the
whole matrix on day one gets disabled. That is a ruling, and it is not made here.

### 7.8 The free cross-check is out

The exact STL for `petalCup` 1.20 × `petalTipShape` 2.45 — EXPORT, 56 × 10, every
other control at its default, 19,040 triangles, 930 KiB, boundary edges 0 — was
emitted to the conversation. The census on those exact bytes: **771 within-shell
intersecting pairs, worst span 0.1213 mm, at the apex.** If the slicer accepts that
file cleanly, the census is over-strict and this whole section needs revisiting; if
it refuses or produces garbage at the petal tips, the census is right and so is
§7.5. **That reading outranks every instrument here.**
