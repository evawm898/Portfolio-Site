# The squared tip — the petal's distal end, and the carnation fringe

Discovery session, named for the work. **Two sessions have both called themselves
38 on this project and their doc filenames collided; this one is `squared-tip`.**

Read `docs/bloom-lobe-model.md` first for Eva's binding lobe model, then
`docs/bloom-session-41-outcome.md` (the cut law) and
`docs/bloom-session-42-outcome.md` (MODEL B, the arc). This document is about the
petal's **END**, not about the teeth. Nothing in the cut law, the count, the
depth, the coverage arc or the 49×49 demand table is touched by it.

**And do not go looking for `claude/lobes-serration-status.md`.** It is not in this
repository and never was — it lives in a Cowork project the sessions cannot read.
Sessions 38, 40 and 41 each established that. `docs/bloom-lobe-model.md` exists so
a fifth session does not.

> ## → IF YOU ARE THE FOLLOW-UP SESSION, READ §6f FIRST
>
> This document costs three routes to a carnation fringe and **takes none**, and
> two of the three need Eva's single-valued-outline invariant to move. **Do not
> start there.** §6f is the cheaper question that comes before all of them, and
> it is Eva's ruling of Sep 13: **the bloom already has cleft rows, so a fringe
> may be N shallow clefts confined to the tip rather than a new topology** — in
> which case the invariant never has to move and the three routes are moot.
> `trimPanels` is verified to hold the machinery, the budget is four to five
> fingers on the shipping petal, and the first question is an IMAGE, not a build.

---

## 0. Eva's ask, and the translation that is the whole brief

> "The lobes are never parallel to the width of the petal — like how a carnation
> serration works, just the tip. I'd like an option to have lobes and serration
> basically rotate 90 degrees."

**Teeth always bite perpendicular to the edge they are cut into, so the teeth
cannot rotate independently of the rim.** "Rotate the teeth 90 degrees" means
MAKE THE PETAL'S DISTAL END A FLAT EDGE RUNNING ACROSS THE WIDTH, so the existing
teeth land on it pointing along the length. Today the rim near the apex curves
around a point, so the teeth follow that curve.

This is a question about the petal's END. It is not a question about the teeth.

---

## 1. THE FINDING — it is not reachable, and the reason is an IDENTITY

**The superellipse reaches exactly zero half-width at `u = 1` at every exponent.**
`profile.shapeAt(1)` reads `0.00e+0` at `petalTipShape` 0.60 / 1.70 / 3.00 / 10 /
100 — an identity, not a reading.

So **the flat end the petal already has is not the law's at all.** It is
manufactured entirely by the print-floor clamp in

```js
halfWidthAt(u) = max(shapeAt(u), rootBlend(u), tipFloor)
```

and its width is `2 × tipFloor` — **1.6000 mm in EXPORT and 0.3000 mm in LIVE,
constant at every exponent**. On the shipping 16.00 mm petal that is **10.00% of
the width**.

**`petalTipShape` moves the SHOULDER. It never moves the END.** That is the
one-line answer.

### 1a. The measurement

Distal-rim tangent from the width axis, EXPORT, on the **uncut** outline, over the
arc the smallest coverage (0.10) actually treats. 4001 arc samples, central
difference `du = 1e-5`. 0° = the rim runs ACROSS the width (teeth would point
along the length — a carnation); 90° = it runs ALONG the length (a side margin).

The width axis is the **terminal mini-face's own direction**, read off the shipped
surface as `at(1,+1).P − at(1,−1).P` — the geometry's own statement of "across the
petal at the tip", not a frame this session picked. The tangent is a central
difference of `petalRim.pointAt(u, side)` — the shipped rim query, the same arc
engine the lobe stationing uses. **Two owners, named.**

| `petalTipShape` | within 30° of the width axis | contiguous flat arc from the apex |
|---|---|---|
| 0.60 | 28.8% | 0.800 mm |
| **1.70** (shipped) | 30.5% | 0.800 mm |
| 2.00 | 61.3% | 0.801 mm |
| 2.50 | 99.0% | 0.801 mm |
| 3.00 | 99.8% | 0.801 mm |

The rig was proved on two controls before any grid, and both came back known:
a tangent measured ON the terminal face reads **exactly `0.00e+0`°** (an identity
— the convention is right), and a mid-margin station reads 81.7° / 87.0° (a side
margin, as it must).

### 1b. THE MECHANISM, which is the finding behind the finding

The per-period guard limits each tooth to the headroom at its own sinus, and the
shipped law is

```js
headroomAt(u) = max(0, laminaHalf(u) - TIP_HALF_MM)
```

**On a terminal running at the print floor the headroom is exactly zero.** So the
squared tip the generator can ALREADY draw carries no teeth, and cannot, at any
setting.

Measured at `petalTipShape` 0.60, whose **8.607 mm parallel-sided terminal IS a
squared tip** (photographed — see §5):

| `lobeDepth` | teeth built | deepest relief built | relief asked |
|---|---|---|---|
| 0.30 | 6 | 0.0199 mm | 2.16 mm |
| 0.45 | 6 | 0.0199 mm | 3.24 mm |
| 0.60 | 6 | 0.0199 mm | 4.32 mm |
| 0.80 | 6 | 0.0199 mm | 5.76 mm |
| 1.00 | 6 | 0.0199 mm | 7.20 mm |

**Depth is completely inert there.** The relief a tooth on a squared terminal can
carry is exactly `terminalHalf − TIP_HALF_MM`, and today that is `0.80 − 0.80 = 0`.

A 2 mm fringe therefore needs a **5.60 mm terminal — 35% of this petal's width**,
against 10.0% today.

---

## 2. TWO SELF-CORRECTIONS, recorded because each was load-bearing

### 2a. The first pass measured a FRINGED rim and read the teeth as the petal's end

The initial angle sweep ran on a petal with the fringe applied, so the "distal rim
tangent" it reported was the tangent of the **teeth's own flanks**. The angle
oscillated between adjacent flanks — `90.00 → 17.36 → 17.64 → 39.04` along one row
— and a mean taken over that is a statistic about the fringe, not about the end.

Corrected by measuring the **uncut** outline (`lobeDepth 0`, the guard) at the same
exponent, and taking the ARC GEOMETRY (`faceMm`, `marginArcMm`, `halfRimMm`,
`treatedHalfMm`) from the shipped lobe record of a fringed build at the same state
— two owners rather than one.

This is a member of the class this project keeps finding: **a reading taken over a
region a feature has already modified is not evidence about the region.**

### 2b. THE STATISTIC THE RENDER REFUTED — the more important one

At `petalTipShape` 3.00 with coverage 0.10, **99.8% of the treated arc lies within
30° of the width axis.** That is the most favourable number anywhere in this
session, it is correctly measured, and **it is meaningless as an answer to Eva's
question.**

The render refutes it. The treated arc there is 2.864 mm long and sits on a nub
1.6 mm wide. **An arc's DIRECTION says nothing about its EXTENT across the width.**
A fringe can run exactly across the width and still span a tenth of the petal.

Corroborated in the other direction by the same render: at `petalTipShape` 0.60 the
image shows a long parallel-sided needle with a flat top, which is the **8.607 mm
clamp strip** the Node sweep measured independently. Two instruments, one answer.

**The rule this leaves:** a direction statistic over a treated arc must be reported
beside the arc's span across the width, or it will be read as the carnation answer
when it is not. Neither number alone settles it, and the picture settled it here.

---

## 3. THE THREE OPTIONS, COSTED — Eva ruled (c)

### (a) Extend `petalTipShape`'s range past 3.00 — REJECTED ON MEASUREMENT

**This is NOT session 41's mistake, and it was checked rather than assumed.**
Session 41's retired notch exponent read 180° included at EVERY value — the control
had *zero* authority over the quantity, so no range change could have helped. Here
`petalTipShape` has strong, monotone authority: the near-flat reach goes **10.0% →
91.2%** of the petal's width as `n` goes 1.70 → 20.

**It fails differently, and the failure is measured.** Holding the law fixed and
refining the sampling — uniform `k` rows over `[uPk, 1]`, an analytic probe, stated
as not the shipped ladder — the drawn end depth behaves like this:

| `n` | k=56 | k=224 | k=896 | k=3584 | k=14336 | k=57344 | shipped ladder (NU=56) |
|---|---|---|---|---|---|---|---|
| 3 | 15.670 | 15.569 | 15.544 | 15.538 | 15.533 | 15.532 | 15.635 mm |
| 20 | 2.009 | 1.908 | 1.858 | 1.839 | 1.838 | 1.837 | 1.905 mm |
| 100 | 0.402 | 0.201 | 0.126 | 0.107 | 0.104 | 0.102 | 0.326 mm |
| **1000** | 0.402 | 0.100 | 0.025 | 0.006 | 0.002 | **0.000** | 0.329 mm |

**At n = 1000 the drawn end depth converges to ZERO**, because the law drops
**7.782 mm in a single ulp** of `s`: `shapeAt` reads 7.782 mm one ulp before `u = 1`
and exactly 0 at it. Below about n = 20 it does converge, so there *is* a real shape
there — but the apex chord sagitta at the shipped NU = 56 reads:

| `n` | 3 | 6 | 10 | 20 | 100 | 1000 |
|---|---|---|---|---|---|---|
| turn at the last full-width vertex | 12.76° | 21.19° | 32.02° | 52.98° | 84.45° | 87.38° |
| **chord sagitta vs the law** | 0.384 | 2.323 | 3.822 | **5.327** | 6.796 | 7.159 mm |

**For scale: session 32 shipped the turning-rate ladder to take apex chord error
from 0.1693 → 0.1054 mm, and Eva ruled 0.0361 mm — about a third of a layer height
— sub-resolution.** 5.327 mm is roughly thirty times the entire error budget that
session was about.

**Said plainly, as Eva asked: what option (a) would ship is the ladder's last chord
promoted into the geometry.** The shape would be a function of the row count rather
than of the law — the drawn-versus-analytic confusion this project has now made
four times (session 32's turning integrated through a kink, twice; the apex fit
through the print floor; the withdrawn live-mode ladder ratios). Resolving it means
rows at the apex, i.e. raising `NU` — barred, because `CURL_START_MIN = 1 / NU` is
imported by the registry as an unrelated curl slider's bound.

And even where it IS resolvable, it does not give a carnation: the terminal face
stays 1.6 mm at every `n` and the headroom there stays 0.00 mm.

*Cost, for the record:* default unmoved (1.70); **not** a partition event, since
extending a range moves no existing value; frozen matrices keep 3.00 as row DATA
and still reproduce (a frozen matrix's values are a verbatim snapshot and are never
edited — session 32's phase11 lesson). 29 of the 680 live rows set `petalTipShape`.

### (b) A separate squared-tip law replacing the superellipse near the apex — REJECTED as strictly dominated

Two owners over one region — the exact registration rule session 32 cited when it
made `petalTipShape` a *reparameterisation* of the tip taper rather than a control
beside it. A partition event on every row where the new law binds, and every petal
has an apex, so at worst all 680 live rows plus the newest frozen baseline. A
replacement law rarely reproduces the incumbent bit-for-bit at its default, so the
byte-identical-default claim is not available by construction.

**Scoped to the terminal alone it stops being (b) and becomes (c).**

### (c) The width profile terminates on a flat edge — RULED, and it is session 32's own deferred item

Session 32's outcome doc, verbatim:

> **A terminal-width control is DROPPED.** It was built as `petalTipEnd`, measured,
> and dropped on this ruling. **Terminal width is DEFERRED as a separate shape
> family** — recorded here so it is schedulable rather than forgotten. What it
> would buy, from the phase-B measurements: truncate and rounded-truncate apices
> (rose, poppy), which no other control reaches; what it costs is a second owner
> over the same region as the superellipse **unless it is scoped to the terminal
> alone.**

**Eva's carnation ask is that family, and the scoping that avoids the registration
violation was written down before the question was asked.**

**The mechanism already ships.** `halfWidthAt = max(shape, rootBlend, tipFloor)` —
the flat terminal edge IS the clamp; the only thing missing is that its value is a
print constant rather than a control. At `petalTipShape` 0.60 that clamp already
draws a real squared tip, 8.607 mm of parallel rim, photographed in §5.

The fold is `max(shape, rootBlend, max(terminal, tipFloor))`, and at `terminal = 0`
that is **the shipped expression term for term** — byte-identical by branch, the
`lobeDepth`-0 / `buckleAmp`-0 guard pattern. **Not a partition event.** Movers are
the rows a build adds, plus **`ALL MAX`** — session 38's own lesson, that a row
sweeping every control is a mover of any control a feature adds.

`petalTipEnd` is **not** in `RETIRED_IDS` (it appears only inside
`petalTipBreadth`'s `why` prose, describing a control that was never merged), so the
id is free. The four `*TipBreadth` ids are retired and stay retired.

A new control adds rows, so **a frozen phase is owed.**

---

## 4. THE RANGE, DERIVED — not picked

Eva: *derive the ceiling from what the per-period guard can actually deliver rather
than picking a number, and report the fringe relief reachable at each end.*

**The guard supplies the relief curve, not the ceiling.** On a terminal of
half-width `Wt` the deepest a sinus can go is `Wt − TIP_HALF_MM`, reached at depth
1.0. That is monotone in `Wt`, so the guard has no internal maximum.

**The PEAK supplies the ceiling, and it is derived from a retired id's own reason.**
The terminal is a FLOOR under the shape, so a `Wt` above the peak half-width raises
the outline above its own widest point — a rise after a fall. That is precisely what
retired `petalTipBreadth`: *"max-ing a RISING ramp against a FALLING core puts a
waist in the blade"*. So **`Wt ≤ peakHalf`**, i.e. the control is a fraction `t` of
the peak half-width with ceiling **t = 1.00**.

**THE DEFAULT IS t = 0 AND THAT IS A MODE CHECK, not a preference.** `tipFloor` is
mode-dependent (0.80 export / 0.15 live):

| mode | `tipFloor` | `max(0, tipFloor)` | `max(TIP_HALF_MM, tipFloor)` |
|---|---|---|---|
| export | 0.80 | 0.80 `=== tipFloor` | 0.80 `=== tipFloor` |
| live | 0.15 | 0.15 `=== tipFloor` | **0.80 `!== tipFloor` — moves every live row** |

A control defaulting to `TIP_HALF_MM` would move every LIVE row 0.15 → 0.80 and
would reproduce `petalTipBreadth`'s retirement reason word for word (*"jumped the
live terminal 0.150 → 0.800 mm on its first step off zero"*). **Defaulting to 0 is
the shipped expression term for term, in both modes.**

### The relief reachable at each end (mode-free — the headroom reads `TIP_HALF_MM`, never the accumulator's floor)

| `petalWidth` | peakHalf | ceiling `Wt` | relief at t=0 | relief at t=1 | dead travel |
|---|---|---|---|---|---|
| 8 mm | 4.000 | 4.000 | 0.00 mm | 3.20 mm | 20.0% of the track |
| **16 mm** (shipped) | 8.000 | 8.000 | **0.00 mm** | **7.20 mm** | **10.0%** |
| 30 mm | 15.000 | 15.000 | 0.00 mm | 14.20 mm | 5.3% |

On the shipping petal:

| `t` (of peak) | terminal `Wt` | terminal width | % of petal width | deepest fringe the guard allows |
|---|---|---|---|---|
| 0.00 | 0.00 | 0.00 mm | 0.0% | 0.00 mm |
| 0.10 | 0.80 | 1.60 mm | 10.0% | 0.00 mm — **DEAD** |
| 0.20 | 1.60 | 3.20 mm | 20.0% | 0.80 mm |
| **0.35** | 2.80 | **5.60 mm** | **35.0%** | **2.00 mm** |
| 0.50 | 4.00 | 8.00 mm | 50.0% | 3.20 mm |
| 1.00 | 8.00 | 16.00 mm | 100.0% | 7.20 mm |

**THE DEAD TRAVEL IS TOLD, NEVER TRIMMED** — `t ≤ TIP_HALF_MM / peakHalf` delivers
no fringe at all, and that fraction moves with the petal's width (20.0% at
`petalWidth` 8, 5.3% at 30), so **no static range is dead-free**. That is
`stamenSpread`'s situation exactly, and it takes `stamenSpread`'s ruling: the range
is not narrowed, the maximum is not adaptive, the read-out prints the number and the
panel hatches the track.

### 4a. "Scoped to the terminal alone" has to mean something OPERATIONAL

A terminal floor folded in as a **global** `max` is a floor under the whole blade,
not under its end. Measured on the shipped profile, EXPORT, 20001 samples — the
fraction of the blade a floor at `Wt` would raise:

| `Wt` | `t` | raised by a GLOBAL floor | raised by a floor scoped to `u ≥ uPk` |
|---|---|---|---|
| 1.60 mm | 0.20 | 5.9% of `u ∈ [0,1]` | 3.9% of `u ∈ [uPk,1]` |
| 2.80 mm | 0.35 | 12.9% | 10.3% |
| 4.00 mm | 0.50 | 22.2% | 19.5% |
| 8.00 mm | **1.00** | **100.0%** | 100.0% |

**At the ceiling a global floor binds over the entire blade: the petal becomes a
full-width rectangle from the foot up and the BASE taper is destroyed** — a region
`petalBaseTaper` owns, which this family must not reach. Even at `t` 0.35 a global
floor already reaches below `uPk`.

**Scoping the floor to `u ≥ uPk` — the region `petalTipShape` already owns — confines
it to the tip taper by construction**, and is what makes "scoped to the terminal
alone" a statement about the code rather than about intent. At the ceiling the tip
taper is then fully squared and the base taper is untouched, which is the intended
top of the family.

---

## 5. THE IMAGE

`carnation/` — three cells at `petalTipShape` 0.60 / 2.00 / 3.00 with **identical**
fringe (6 teeth, depth 0.45, coverage 0.40, triangle wave), plus item 1's own
best-attempt pair at the ceiling with an odd count so a CREST sits at twelve.

EXPORT throughout, print preview ON with the app's own `shownMode` asserted, macro
crops framed on the petal's own tip down its own normal so the apex is in every
crop, every cell settled to two byte-identical frames.

**Same-tree control: 0 bytes differ** — an exact identity, so these pixel figures
rest on no noise floor. (A single control draw is never a floor on this renderer;
here it happens to be an identity, which is a different and stronger thing.)

**Coverage 0.40 on the three cells was forced by measurement, not chosen:** at
`petalTipShape` 0.60 every coverage at or below 0.30 returns `NO ROOM / relief`,
because the whole treated arc lies where the outline has already reached the print
floor.

What the cells show: the teeth bite **inward from the two side margins as sideways
spurs**, and the end is a narrow nub. That is Eva's complaint, photographed.

---

## 6. THE CONSTRAINT THAT WILL BIND — measured, and mostly already handled

### 6a. The two corners are NOT new in kind — they already exist and are already declared

The `TIP_FLOOR` break, measured on shipped geometry through `petalRim`'s own break
list, with the turn measured across it:

| `n` | mode | break `u` | turn | terminal run | half-width there |
|---|---|---|---|---|---|
| 0.60 | export | 0.754092 | 9.75° | 8.607 mm | 0.800 |
| 0.60 | live | 0.904481 | 4.43° | 3.343 mm | 0.150 |
| 1.70 | export | 0.992424 | **60.23°** | 0.265 mm | 0.800 |
| 1.70 | live | 0.999562 | 78.52° | 0.015 mm | 0.150 |
| 3.00 | export | 0.999786 | **87.50°** | 0.008 mm | 0.800 |
| 3.00 | live | 0.999999 | 88.45° | 0.000 mm | 0.150 |

**The shipped default already carries a 60° corner there; the range ceiling already
carries a right angle.** A squared tip moves that corner out to a larger half-width.
It does not invent it.

Note it is **mode-dependent today**, which is why session 42 needed `laminaWinner`.
A terminal *control* makes it mode-**independent** wherever it binds — an
improvement, but the interaction with `laminaWinner` must be got right or row
positions become mode-dependent, which is session 32's defect refusing a fourth
shipping.

### 6b. The rim arc query already handles both corners — nothing owed

`rimArcTable` inserts every declared break as a node **plus a self-similar graded
patch** (`RIM_GRADE_CELLS` / `RIM_GRADE_DEPTH`), and **`u = 1` is unconditionally in
its `singular` list**, so the margin/terminal-face junction gets the same treatment
by construction. A widened terminal moves the `TIP_FLOOR` node to a larger
half-width and adds no new KIND of node.

### 6c. THE DEMAND TABLE CANNOT SEE THE CORNER — the one real gap

`lobeSamplesPerLobe(crest, notch)` is indexed on the two **cut exponents** and
nothing else. Measured, not inferred: a rim whose corner sits **8.607 mm** inside the
treated arc (`n` 0.60) and one whose corner sits **0.008 mm** from the apex (`n`
3.00) demand **identically** 10 stations, 3 a period, placed `[3,3,3,1]`.

So a squared tip would put a right-angle corner inside the treated arc and the
demand table would not notice.

**EVA'S RULING ON THE ORDER OF WORK, and it is the part most likely to be got wrong
by a later session:**

> Do not add a rim-shape input on that hypothesis.
> 1. Build the terminal control.
> 2. MEASURE whether teeth on a wide flat terminal actually resolve at the existing
>    demand. **A tooth on a straight edge is a larger, simpler feature than one on a
>    curving edge, so the existing table may be conservative rather than wrong** —
>    and the corners are already handled (§6b).
> 3. If they do not resolve, THAT is a finding with a number behind it, and the
>    table change is its own ruling.
>
> Adding an input to a table verified 2401/2401 on a guess is the wrong order.

**The 49×49 table is not touched by the build.**

### 6d. The census reading is CALIBRATION, NOT COVERAGE — and closing it is the build's first job

The shipped census reads **0 within-shell pairs** — plain and fringed, at
`petalTipShape` 0.60 / 1.70 / 3.00, coverage 0.40, EXPORT, each state built twice so
a pre-existing fold is not read as the fringe's.

**That is not evidence about a wide squared terminal, and this session does not
claim it is.** Two reasons, both measured:

* **The `n` 0.60 row is VACUOUS.** Its relief is 0.0199 mm (§1b) — no teeth were
  actually cut, so nothing straddled the corner.
* At `n` 1.70 and 3.00 the corner sits 0.265 mm and 0.008 mm from the apex, so **no
  tooth straddles it** at any reachable coverage.

What is established is that the corner class is not *automatically* a folder at the
width available today. **A wide squared terminal with real teeth ON the corner is
UNMEASURED.** Eva's ruling: those rows are **the first thing the build closes — added
before the feature and seen red.**

This is the "calibration is not coverage" rule (Eva, session 35) applied to this
session's own strongest-looking number.

---

## 6e. THE BUILD WAS STARTED AND STOPPED — a squared tip CANNOT carry the fringe, and the reason is structural

**Written after Eva ruled option (c) and the build began. The control was
written, measured, and reverted; the finding is why.** The diff is preserved at
`terminal-control.patch` in the session scratchpad and is reproducible from §9's
rigs.

### What worked

`petalTipEnd` as a shape TERM (not a floor) squares the tip exactly as derived.
Measured, EXPORT and LIVE: at 0.35 of the peak, `halfWidthAt(1)` reads **2.8000
mm in BOTH modes** — a 5.60 mm flat end, 35% of the width, and mode-independent
where it binds, which is the improvement §6a predicted. The guard then has real
headroom: relief **2.00 mm uniform across all four periods** (asked 4.32,
limited by `terminal − TIP_HALF_MM` = exactly 2.0, as §1b derived).

### And the first version was wrong in a way the gate caught

Folded in beside the print floor, the terminal is applied **after** the lobe
cut, so it fills every tooth back in: `L8` reported *"the outline over [uCap, 1]
is identical to a plain petal at all 2001 samples — the apex is untreated and
this is MODEL A"*, on a tree that had just been given a terminal. The teeth have
to bite INTO the squared end, so the terminal belongs in the `terms` list the
cut is subtracted from. Moving it there cleared L8.

### THE FINDING — the end is ONE STATION, and a fringe across it is not a half-width

`L5` stayed red, and chasing it down is the session's real result.
`Math.min(...[])` is `Infinity` because **`sinusU` was empty**: with a wide
terminal the treated arc lands on the terminal FACE and not on the margin at
all. Measured, EXPORT, coverage 0.10:

| `petalTipEnd` | faceMm | treatedHalf | MARGIN sinuses | face share of the treated arc |
|---|---|---|---|---|
| 0.00 (today) | 1.600 | 2.704 | 1 | 29.6% |
| 0.15 | 2.400 | 2.722 | 1 | 44.1% |
| **0.35** | 5.600 | 2.820 | **0** | **99.3%** |
| 0.50 | 8.000 | 2.908 | **0** | **100.0%** |
| 1.00 | 16.000 | 3.251 | **0** | **100.0%** |

**The wider the terminal, the MORE of the fringe lands on the face** — and the
face is the single station `u = 1`. The emitted geometry says what that costs,
fringed against plain at the same terminal:

```
 v      FRINGED end point           PLAIN end point
-1.00   40.565, -2.743, 14.792      40.565, -2.800, 14.792
 0.00   40.565,  0.000, 14.792      40.565,  0.000, 14.792
+1.00   40.565,  2.743, 14.792      40.565,  2.800, 14.792
```

Every point shares the same along-length coordinate in **both** builds: the end
is **perfectly straight**. The only difference is a uniform 2% narrowing,
2.800 → 2.743 mm. **The record claimed 3 teeth and 2.000 mm of relief on four
periods while the emitted end carried no notch at all.**

**THE STRUCTURAL STATEMENT, and it is a property of the type rather than a
measurement:** `widthProfile` holds `h(u)` — ONE half-width per station — so the
material at station `u` is the single span `[−h, +h]`, one interval, at every
parameter value. A fringe across the END needs the end's position to vary with
the across-coordinate, `u(v)`; and a fringe of separate teeth needs SEVERAL
disjoint spans at one station. Neither is expressible **in `widthProfile`**, and
no control on the outline can make them so.

> **CORRECTION, and it is the third self-correction of this session — see §6f.**
> The sentence above originally ended *"Neither is expressible, and no control can
> make them so."* That named `widthProfile`'s owner correctly and then made a
> claim about the **petal**, which has a different owner. Several disjoint spans
> at one station ARE expressible, one layer up, by `trimPanels` — whose own
> header says so in as many words. The half about `u(v)` survives unchanged; the
> half about disjoint spans does not. **The same class of error the fourth
> durable rule is about: I checked who owned the quantity and not who owned the
> capability.**

**This collides with the lobe model's own invariant.** `docs/bloom-lobe-model.md`
§1: *"The outline stays single-valued — split and cleft petals are out of scope
at every parameter value."* A carnation's fringe IS a row of separate fingers at
the petal's end. **Eva's carnation ask and that invariant cannot both hold as
stated**, and which gives way is a ruling rather than a measurement — *and Eva
has since said which: the invariant is her ruling of Sep 5 ("lobe and cleft are
dropped — not parked, removed"), carried into the model doc on Sep 12, and it
CAN be changed.* §6f is what must be measured before anyone changes it.

### So the trade has no good corner, and that is measured rather than argued

* **Small coverage + wide terminal** → the whole fringe is on the face (99.3% at
  0.35) → the cut only narrows the end, drawing nothing.
* **Large coverage + wide terminal** → the teeth return to the MARGIN → the
  sideways spurs of §5, which is the complaint this session opened on.

### 6f. THE FIRST QUESTION FOR THE FOLLOW-UP SESSION — the cleft machinery ALREADY EXISTS

**Eva's ruling, Sep 13, and it comes before every route below.** The
single-valued-outline invariant is not a property of the code; it is Eva's ruling
of Sep 5, carried into `docs/bloom-lobe-model.md` §1 on Sep 12, and it can be
changed. **But a carnation fringe may be N shallow clefts confined to the tip
rather than a new topology — in which case the invariant never has to move and
all three routes below are moot.** That is the first thing to measure.

**The premise is verified, and it is stronger than the ruling assumed.** Checked
against the source rather than taken on trust:

* **`trimPanels` is THE ONE OWNER of the petal's domain decomposition**, and its
  own header states the capability §6e said did not exist: *"The petal's boundary
  is a TRIMMABLE DOMAIN: per row, which spans of the cross-width coordinate `v`
  carry material. The default is one span over every row. **A CLEFT is two spans
  with a gap**, and the machinery that makes that watertight is the reason this
  abstraction exists at all."*
* **Watertightness is by construction, not by argument.** *"A clefted petal is
  not one grid with a hole, it is a base panel plus two lobe panels, each
  individually closed"* — two faces, two side rims, two end caps each — so the
  export contract holds however many panels there are.
* **Nothing hard-codes three panels.** `trimPanels` returns a LIST and
  `buildPetalInto` loops it (`for (const panel of panels)`); the only place a
  count appears is the cleft arm's own literal.
* **`spanAt` already receives the row index** — `emitPanel` calls
  `panel.spanAt(i)` with the GLOBAL row index, and the cleft arm simply ignores
  it (`spanAt: () => [-1, -gHalf]`, a constant gap). So a span that varies down
  the finger — a **tapering, pointed** tooth rather than a parallel-sided slot —
  needs no change to the emitter at all.
* **Connectedness has a named mechanism**: `PANEL_OVERLAP_ROWS = 1`. The lobe
  panels start one row BELOW the split and evaluate their span there too, so the
  shared slab is a real overlapping volume and the separate solids are one body.
* **It is proven, not claimed.** `CAPABILITY_CLEFT = { cleft: { from: 0.55, gap:
  0.35 } }` drives nine `CAPABILITY: cleft*` matrix rows plus `TIP SHAPE: 3.00 x
  a cleft margin`, each declared in `SELF_INTERSECTION_XFAIL` with its reason
  (*"the lobe panels reach `PANEL_OVERLAP_ROWS` into the base panel by design and
  share its vertices, so one shell"*). It is a **capability hook and has never
  been a shipping control** — which is exactly what Eva's Sep 5 ruling did.

**AND THE SHAPE IS RIGHT, not merely the mechanism.** A carnation's fringe
fingers run ALONG the length and are separated ACROSS the width. That is
precisely a `v`-span decomposition at a row — what `trimPanels` does — and NOT
the `u(v)` terminal edge of route 1. §6e's surviving half (teeth *across* the
terminal mini-face need `u(v)`) is about a different object from the one a
carnation actually has.

**THE BUDGET, measured on the shipping default so the question is not asked
blind.** EXPORT and LIVE agree to the station on every figure below, as row
positions must (session 32's mode-dependence rule). Petal 35 mm long, 16.00 mm
wide, `uPk` 0.3571, `uCap` 0.8000, `NU` 56, `HELD_ROWS` 16. Fingers-that-fit is
`N` fingers and `N−1` gaps all at `MIN_FEATURE_MM` (1.0 mm, itself a declared
guess — §18b):

| split `u` | rows above it (a finger's own rows) | width there | fingers that fit at the printable floor |
|---|---|---|---|
| 0.55 *(today's cleft)* | 27 | 14.750 mm | 7 |
| 0.70 | 21 | 12.492 mm | 6 |
| **0.80** *(= `uCap` exactly)* | **16** | **10.253 mm** | **5** |
| **0.85** | **13** | **8.822 mm** | **4** |
| 0.90 | 10 | 7.076 mm | 4 |
| 0.95 | 7 | 4.788 mm | 2 |

**So rows are NOT the scarce resource** — 13 rows down a finger at a
tip-confined split is ample. **The scarce axis is the WIDTH**, and the budget is
four to five fingers before the printable floor binds. A split at `uCap`
(0.8000) is where the apex law already takes over, which makes it the natural
candidate rather than a tuned number.

**WHAT THE FOLLOW-UP SESSION MUST ESTABLISH, in this order:**

1. **Does a 4–5 finger tip-confined cleft READ as a carnation?** Four fingers is
   coarse against the reference photograph. This is Eva's to rule from an image
   and it is the cheapest question in the whole problem — the machinery to render
   it already exists behind the capability hook, so it costs a render and no
   geometry at all. **If the answer is no, ask it again at a longer or wider
   petal before concluding anything**: the budget above is a fact about the
   shipping petal's proportions, not about the law.
2. **Does `trimPanels` generalise from 3 panels to N+1 without a rewrite?** The
   loop and `spanAt`'s signature say it should. What is NOT yet checked: the
   triangle cost (each panel is its own `NV`-column grid plus caps and rims, so
   cost scales with N), whether `PANEL_OVERLAP_ROWS = 1` still connects every
   finger at N > 2, and what `SELF_INTERSECTION_XFAIL`'s cleft class does when
   the declared overlap count rises.
3. **The split is a ROW INDEX, and that is ladder-sensitive.** `trimPanels` takes
   the first row whose `u` exceeds `cleft.from`; CLAUDE.md already records that
   this split has MOVED on two separate sessions (session 38's seam clearance and
   session 39's `widest()` fix each changed three cleft rows' triangle counts). A
   fringe pinned to a row index inherits that. Whether the split should be placed
   in ARC LENGTH instead is the same question the lobe stationing already
   answered once.
4. **Only if all three fail** does the invariant have to move, and only then are
   the routes below live.

**What this does NOT settle**, stated so it is not read as more than it is: that
the machinery *exists* is not evidence that a fringe drawn through it is
printable, watertight at N fingers, or good-looking. It is evidence that the
question is cheap to answer, which is why it goes first.

### What would actually reach it, costed, none taken

1. **The terminal edge becomes a curve `u(v)` rather than a station.** This is
   the one that draws the reference. It is not a `widthProfile` change at all —
   it changes how the blade's last row is laid, so it reaches `buildPetalInto`,
   the panel emitter and the terminal mini-face's own contract (session 32 §5:
   the `u = 1` mini-face may never be collapsed). Substantial, and its own
   session.
2. **A second field acting on LENGTH near the end.** Forbidden by the model as
   stated — *"serration is NOT a separate feature to schedule"* — and it is a
   second generator over one region.
3. **Relax the single-valued invariant at the apex only.** The smallest change
   that reaches a true fringe, and the one that needs Eva's ruling first,
   because the invariant is hers and every lobe cap exists to keep it.

### What is NOT owed, and why the branch is where it is

The geometry and the registry row are **reverted**, and so is matrix block 31
(`a110531`) — a PR permanently red on a control that no longer exists teaches
everyone to ignore its red. The branch is docs-only; the rows come back the day
there is a control to test. Shipping the control as written would ship a record that reports teeth
the geometry does not draw, and `petalTipEnd` as a pure shape control — a
squared tip that the fringe cannot land on — is a different feature from the one
Eva asked for and is hers to rule on, not a session's to substitute.

---

## 7. SEQUENCING — why this doc exists before any branch

**PR #225 (the stem on the hub) is open against `bloom-geometry.js`.** Builds
serialise on this project: sessions 28 and 29 collided on exactly that file and lost
ninety minutes to a text-clean merge on a tree nobody had built.

**HOLD. No branch until #225 merges.** This document is the work that can be done
while holding; the build is not started.

## 8. WHAT THE BUILD MUST NOT TOUCH (Eva's ruling, restated so it survives the gap)

* the cut law `g(r)`, `lobeCrestShape`, `lobeNotchShape`, the count, the depth, the
  coverage arc
* the 49×49 demand table (see §6c for the order of work instead)
* anything below the foot, or the stem work
* `bladeStations`, the turning-rate ladder's ownership, `HELD_ROWS`,
  `CURL_START_MIN`, `trimPanels`
* `SHEET_THICKNESS_MM`, `MIN_FEATURE_MM`, `TIP_HALF_MM` — none of them move
* `NU` does not rise

## 9. Instruments

Every figure here is reproducible from the shipped producers with no browser except
§5. The rigs live in the session scratchpad and are committed with the build PR, not
with this doc:

* the distal-angle rig — `petalRim.pointAt` against the terminal face's own
  direction, proved on two controls (the face reads exactly 0°, a mid-margin reads
  ~90°) before any grid
* the drawn-versus-analytic sweep — the shipped `bladeStations()` against uniform
  probes of the law
* the guard sweep — `lobeDepth` 0.30…1.00 on the `n` 0.60 terminal
* the census — `tools/bloom-self-intersection.mjs`'s exported `census()` / `meshFor()`,
  Node-side, each state built twice

**Mode and sampling are named on every figure.** Where a constant stands for a
physical length it is derived from that length: the ceiling from `peakHalf`, the
relief from `TIP_HALF_MM`, the dead travel from their ratio — never from a row count.
