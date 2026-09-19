# The tilt range ruling — recorded, measured, and NOT shipped

*Sep 19, 2026. The session opened to ship Eva's Sep 17 ruling that `petalTilt` opens from
0–75 to −30..120, and to put the bell/corolla discovery's rulings into the repository. **The
second half shipped; the first did not.** Two of the brief's own stop conditions fired, both
on measurements the brief asked for. Nothing in `bloom-registry.js`, `bloom-geometry.js`,
`bloom.js`, `tools/` or any gate was touched — `git diff --stat` against `main` is three
documentation files — so no byte moved, no frozen phase is owed, and no bloom gate ran.*

**Every figure below was built by the SHIPPED `buildBloomInto` in Node from
`bloom-registry.js`'s `DEFAULTS` plus a named set, on the builder's own doubles, and measured
by the shipped within-shell census (`tools/bloom-self-intersection.mjs`, the same call chain
`tools/bloom-xfail-magnitudes.mjs`'s own `measure()` uses).** Every measurement names its MODE
and its SAMPLING (the session-32 rule). `main` was at `9853a4f`. Measurement scripts lived in
the session scratchpad and are not committed; each is reproducible from the sets named here.

---

## 0. The two findings, in one paragraph each

**FINDING 1 — the negative end is not clear, and the brief's own instruction for that case is
to stop.** The brief said *"−30 should sit clear of [the descending seam fold] … but confirm
it rather than assuming, and if −30 does reach that regime, report it and stop rather than
quietly clamping somewhere else."* It reaches it, and so do angles far short of it: swept at
one degree from 0 to −30 over 22 states, the within-shell census leaves zero at **−8° on six
whorls at the thickest sheet**, −9° on a six-turn continuous head, −10°, −16° on three states
including six whorls at the SHIPPING sheet, and at −17 / −22 / −23 / −28 / −29 on five more,
with nine states clean to −30. **EXPORT and LIVE agree on the first firing angle on all twelve
states checked in both modes.** Every worst site sits at exactly `z = −t/2` — the foot slab's
underside — and the same `|θ|` read UP is **0 pairs on 13 of 13 probes**, so it is the
DESCENDING case the sepal session named and not the seam clearance's own regime (which is
symmetric in the tilt by construction: `seamTurnRad = Math.abs(tilt)`).

**FINDING 2 — the range and the role-override envelope are one number, so "prove the existing
matrix is 0 moved" is not reachable.** `ROLE_OVERRIDES` restates `petalTilt`'s `0..75` as the
clamp envelope for `labellumTilt`, `hoodTilt` and the nine `petalNTilt` rows, and
`tools/bloom-harness.mjs` **throws at module load** if the two disagree — it is one law in two
files with an equality check, because `bloom-geometry.js` cannot import the registry. So a
range change IS an envelope change. Measured: **43 live rows have a `petalTilt` clamp biting
today and the new envelope changes the built value on all 43** — 18 read WORSE on the census,
10 better, 15 unchanged in count, with **eleven going from 0 pairs to 42–84 pairs** (0.3880 to
0.5139 mm). **23 rows cross 90° of seam turn only under the new envelope.** And **1,072 rows
across 27 frozen baselines** (phase8 … phase34) carry the same clamp, so their bytes stop
reproducing.

---

## 1. Finding 1 — the descending seam fold, measured

### What it is, and whose it is

The sepal session recorded it and handed it to the seam owner
(`docs/bloom-sepals-outcome.md` §8): *"A sepal turned DOWN past about −55° folds at its own
foot-to-blade seam … It is the PETAL BUILDER's, not the sepal's — a petal at tilt −60 reads 56
pairs and at −90 64 / 0.5878 mm, identically — and no petal control reaches it (`petalTilt`'s
floor is 0)."* Opening the floor to −30 is the first thing in this project that would let a
PETAL reach it, which is why the brief asked for the check.

`seamClearanceMm(turnRad, sheetMm)` reads `Math.abs(tilt)`, so the clearance and the lattice
step are **identical at +θ and −θ**. The law was derived for the TOP skin crossing the foot's
top plane; the descending blade's BOTTOM skin against the foot's underside at the rim is the
case it was never asked about. That is a statement about the law, and the measurement below is
what turns it into a bound on the range.

### How far down is clean — 22 states, EXPORT, one degree

`petalTilt` walked 0 → −30 in one-degree steps; the first angle at which the within-shell
census leaves zero. **The sampling is named rather than implied: these 22 states, not an
exhaustive sweep of the control space.**

| first firing angle | states |
|---|---|
| **−8** | 6 whorls × layerTilt 0 × sheet 2.40 |
| **−9** | CONTINUOUS × 6 turns × layerTilt 0 |
| **−10** | 6 whorls × layerTilt 0 × layerSize min |
| **−16** | 5 whorls × layerTilt 0 · 6 whorls × layerTilt 0 · 6 whorls × layerTilt 0 × spread min |
| **−17** | 20 × 8 × sheet 2.40 |
| **−22** | 4 whorls × layerTilt 0 |
| **−23** | CONTINUOUS × 3 turns × layerTilt 0 · SPHERE × 3 turns |
| **−28** | sheet 2.40 |
| **−29** | 3 whorls × layerTilt 0 |
| clean to −30 | DEFAULTS · sheet 2.40 × delicacy min · 2 whorls × layerTilt 0 · SPIRAL · FAN · spine curl −180 · a hemisphere · 60 × 30 × sheet 2.40 · 3 petals |

**THE SHALLOWEST DESCENDING ONSET OVER THESE 22 STATES IS −8°**, on six whorls at the thickest
sheet — a quarter of the way into the ruled floor, not near its end. Depth is the strongest
lever (2 whorls clean to −30, 3 at −29, 4 at −22, 5 and 6 at −16, 6 × sheet 2.40 at −8), the
sheet the second.

**ONE ROW IN THAT SWEEP IS NOT THIS FOLD AND IS EXCLUDED FROM THE FIGURE ABOVE.** `cup max`
reads non-zero at tilt **0**, which is the apex fold of session 32 §18a — the cup's own bound,
757 pairs at tilt 0 in the discovery doc's own T1, present at every tilt from −30 to 90 and
independent of it. It is the pre-existing state ruling 6 says not to touch, and reading it as a
descending onset would have put the shallowest figure at 0 and been wrong about which fold it
named.

### The onset in detail, with the readings and both modes

A twelve-state set — six shared with the sweep above and six others (the thinner sheets, the
plain 20 × 8 and 60 × 30 petals, 40 petals, and three whorls at a 2.40 mm sheet) — carrying
each firing angle's own readings and run in BOTH modes:

| state | EXPORT | LIVE | the non-zero readings (pairs / worst span mm, EXPORT) |
|---|---|---|---|
| DEFAULTS | clean to −30 | clean to −30 | — |
| sheet 0.60 | clean to −30 | clean to −30 | — |
| sheet 1.80 | clean to −30 | clean to −30 | — |
| 20 × 8 | clean to −30 | clean to −30 | — |
| 60 × 30 | clean to −30 | clean to −30 | — |
| 40 petals | clean to −30 | clean to −30 | — |
| **6 whorls × layerTilt 0** | **−16** | **−16** | −16: 56/0.0052 · −22: 168/0.0097 · −23: 112/0.0114 · −29: 56/0.0175 · −30: 112/0.0213 |
| **20 × 8 × sheet 2.40** | **−17** | **−17** | −17: 56/0.0116 |
| **3 whorls × layerTilt 0 × sheet 2.40** | **−21** | **−21** | −21: 56/0.0179 · −22: 56/0.0315 · −28: 56/0.0327 · −29: 112/0.0602 · −30: 112/0.0620 |
| **CONTINUOUS × 3 turns × layerTilt 0** | **−23** | **−23** | −23: 14/0.0110 … −30: 21/0.0291 |
| **sheet 2.40** | **−28** | **−28** | −28: 56/0.0327 · −29: 56/0.0338 · −30: 56/0.0557 |
| **3 whorls × layerTilt 0** | **−29** | **−29** | −29: 56/0.0175 · −30: 56/0.0183 |

**THE ONSET IS NOT MONOTONE IN THE ANGLE, and that is the seam lattice rather than noise.** On
six whorls it fires at −16, is clean from −17 to −21, and fires again from −22. The first blade
row is the first lattice station STRICTLY beyond the clearance (`seamLatticeStepRaw`), so the
step is an integer function of the angle and the blade's length: at some angles the row lands
clear of the foot's underside and at the next it does not. The seam session's own §2 sweep has
the same shape on the ascending side.

**BOTH MODES AGREE ON THE ONSET ANGLE ON ALL TWELVE**, which matters because whether a solid
passes through itself is not allowed to be a property of the mode (session 32's
mode-dependence defect, refused four times since). The READINGS differ on the six-whorl row —
LIVE −22 reads 112/0.0174 where EXPORT reads 168/0.0097 — because the export floor moves the
foot width; the ANGLE does not move.

### It is the DESCENDING case, established rather than inferred

Two independent checks, both on the shipped builder:

**(a) WHERE THE SITE IS.** The census's own `worstAt` sits at exactly `z = −t/2` on every
firing state — −0.6000 at the shipping 1.20 mm sheet, −1.2000 at 2.40 mm — which is the foot
slab's underside to the last digit, not the top plane the clearance law is about. (Two rows
read −0.6174 and −0.6051, a blade row just under the slab rather than on it; every other probe
is exactly on the plane.)

**(b) THE SAME `|θ|` READ UP.** Thirteen (state, angle) probes that fire at −θ, built again at
+θ:

| state | \|tilt\| | DOWN (pairs / mm, z) | UP |
|---|---|---|---|
| sheet 2.40 | 28 / 29 / 30 | 56/0.0327 · 56/0.0338 · 56/0.0557, all at z −1.2000 | **0 / 0 / 0** |
| 3 whorls × layerTilt 0 | 29 / 30 | 56/0.0175 (z −0.6174) · 56/0.0183 (z −0.6000) | **0 / 0** |
| 6 whorls × layerTilt 0 | 16 / 22 / 30 | 56/0.0052 (z −0.6051) · 168/0.0097 · 112/0.0213 | **0 / 0 / 0** |
| 20 × 8 × sheet 2.40 | 17 | 56/0.0116 at z −1.2000 | **0** |
| CONTINUOUS × 3 turns × layerTilt 0 | 23 / 30 | 14/0.0110 · 21/0.0291, z −0.6000 | **0 / 0** |
| 3 whorls × layerTilt 0 × sheet 2.40 | 21 / 30 | 56/0.0179 · 112/0.0620, z −1.2000 | **0 / 0** |

**13 of 13 read exactly zero at +θ.** The clearance is symmetric in the tilt and the fold is
not, which is the whole of the claim.

**(c) RUN THE SAME TREE TWICE** (the project's own rule). `sheet 2.40 × tilt −30` reads
56/0.0557 then 56/0.0557; `3 whorls × layerTilt 0 × tilt −30` reads 56/0.0183 then 56/0.0183.
Exact both times.

### The discovery doc's own cell reproduces — it was true of ONE state

`docs/bloom-bell-corolla-discovery.md` §2 row F reads *"Tilt −30 and tilt 0 × curl −90, hung,
sweep the petals back past the receptacle: the reflexed shooting-star / cyclamen form, 0 pairs
at cup 0."* **That reproduces**: DEFAULTS is clean to −30 in both modes. The premise that
carried it into the brief — *"−30 should sit clear of that"* — generalised one state to the
range, and the states that break it are a thicker sheet and a deeper head, neither of which
that cell varies. This is the charter's own rule about a rationale being a premise, arriving on
a cell rather than on a sentence.

### What this does NOT say

* It does not say −30 is unreachable. Every one of these states exports watertight and as one
  connected piece; a within-shell pair is the self-intersection census's finding, which is a
  PRINTABILITY statement and never the export gate's.
* It does not pick a floor. The brief's instruction is *"report it and stop rather than quietly
  clamping somewhere else"*, and choosing −7, or declaring the folds as xfail entries, would
  both be deciding for Eva. §4 lays out what each choice would cost, measured.
* It does not touch the seam law. The window derivation (§4 of the discovery doc) is about the
  OBTUSE side and has nothing to say about the underside case.

---

## 2. Finding 2 — the range and the override envelope are one number

### The mechanism, read from source

`bloom-geometry.js`'s `ROLE_OVERRIDES` carries, for each override row, the clamp range its
composed value is held to:

```
{ role: SLOT_LABELLUM, base: 'petalTilt', control: 'labellumTilt', law: 'delta', min: 0, max: 75 },
{ role: SLOT_HOOD,     base: 'petalTilt', control: 'hoodTilt',     law: 'delta', min: 0, max: 75 },
{ role,                base: 'petalTilt', control: c('Tilt'),      law: 'delta', min: 0, max: 75 },   // x9 groups
```

`OVERRIDE_BOUNDS` derives one range per base from that table, `resolveRoleOverrides` clamps the
composed value into it ONCE after composition, and `tools/bloom-harness.mjs` refuses to load
when the table and the registry disagree:

> `ROLE_OVERRIDES clamps "petalTilt" to 0..75, but the registry declares −30..120 —
> bloom-geometry.js cannot import the registry, so this is the check that keeps its restatement
> from becoming a second owner`

**KEEPING THE ENVELOPE AT 0..75 IS NOT AVAILABLE, and the reason is geometric rather than
procedural.** At a base tilt above 75 — which the new range makes reachable — ANY non-identity
tilt delta composes past the old ceiling and is clamped BACK to 75: a `+5°` labellum delta on a
base of 120 would drop that petal **45° BELOW** every other petal in the whorl. Saturation is
this project's ruled behaviour (*"the multiplier stops moving before its slider does"*); a
composed value landing below its own base is not saturation, it is a discontinuity in a shipped
slider. So the envelope moves with the range whether or not the load-time check exists.

### What the envelope costs, measured

Isolated by mutating `OVERRIDE_BOUNDS` in process — `resolveRoleOverrides` reads the Map at
call time, so nothing else in the build moves — and read through `footRing()`'s own
`overrideClamped` telemetry rather than re-derived.

**43 live rows have a `petalTilt` clamp biting today, and the envelope changes the built value
on every one.** The census, EXPORT, both envelopes:

| verdict | rows |
|---|---|
| **WORSE** | **18** |
| better | 10 |
| same count | 15 |

**Eleven rows go from clean to folded** — the nine `PER-PETAL: petalNTilt max (75)` rows,
`SLOT: labellumTilt max (75) × 2 whorls in step` and `SLOT: hoodTilt max (75) × 2 whorls in
step`. None of them carries an entry in `SELF_INTERSECTION_XFAIL` today, because none of them
folds today:

| row | 0..75 | −30..120 |
|---|---|---|
| `SLOT: labellumTilt max (75) x 2 whorls in step` | 0 | **42 / 0.4919** |
| `SLOT: hoodTilt max (75) x 2 whorls in step` | 0 | **42 / 0.4919** |
| `PER-PETAL: petal1Tilt max (75) at 1/side` | 0 | **42 / 0.4694** |
| `PER-PETAL: petal2Tilt max (75) at 1/side` | 0 | **84 / 0.4694** |
| `PER-PETAL: petal3Tilt max (75) at 2/side` | 0 | **84 / 0.3880** |
| `PER-PETAL: petal4Tilt max (75) at 3/side` | 0 | **84 / 0.4038** |
| `PER-PETAL: petal5Tilt max (75) at 4/side` | 0 | **84 / 0.4401** |
| `PER-PETAL: petal6Tilt max (75) at 5/side` | 0 | **84 / 0.4660** |
| `PER-PETAL: petal7Tilt max (75) at 6/side` | 0 | **84 / 0.4856** |
| `PER-PETAL: petal8Tilt max (75) at 7/side` | 0 | **80 / 0.5012** |
| `PER-PETAL: petal9Tilt max (75) at 8/side` | 0 | **80 / 0.5139** |

The other seven WORSE rows already fold today and move their pair count while keeping their
worst span — `SLOT: ALL MAX × ALL FORM MAX … × 2 whorls in step` 19,790 → 19,918, `FAN ×
PER-PETAL: ALL PER-PETAL MAX × 3 layers` 24,801 → 25,270, `SLOT: ALL MIN × 2 whorls in step`
222 → 243 — and ten move the other way, `FAN × PER-PETAL: ALL PER-PETAL MAX × 8/side × 60deg`
21,233 → 20,349 being the largest. **#213's list holds a declared row to its recorded count
EXACTLY**, so **seventeen declared magnitudes** (7 worse + 10 better) would have to be
re-recorded in the same commit and **eleven rows declared for the first time**. One declared
row is unmoved (`FAN × PER-PETAL: petal 1 × 3 layers × inner*`, 169/0.2089 either way).

**TRIANGLE COUNTS ARE UNCHANGED ON ALL 43** — the envelope moves vertices, not topology.

### Where the 90° line sits

Read off each descriptor's own effective seam turn (`|petalTilt + tiltExtra + domeLean|`):

* **23 rows cross 90° only under the new envelope** — the eleven above plus twelve more, mostly
  the `FAN × PER-PETAL` and `SLOT: ALL MAX` corners, going 75° → 100° or 87° → 112°.
* **4 rows already past 90° go further**: `ORCHID × the IRIS` 105 → 110, `SLOT: ALL MAX × 3
  layers × phase 0` 99 → 124, `FAN × PER-PETAL: ALL PER-PETAL MAX × 3 layers` 99 → 124, and
  `DOME: rise 1 × FAN 3/side × petal 1 max` **165 → 190**.

The discovery doc's §4 window closes at exactly 120°, and **three of these land past it** — the
two 124° rows and the 190° dome. The 23 crossings top out at 112°, so all of them are inside
the window; it is the four already-obtuse rows that move past its edge.

### The frozen cost

The same sweep over all 33 registered frozen matrices plus the live one:

| baselines | rows carrying a `petalTilt` clamp |
|---|---|
| phase2 … phase7 | 0 |
| phase8, phase9 | 2 each |
| phase10 | 33 |
| phase11, phase12 | 43 each |
| phase13, phase14, phase15 | 44 each |
| phase16 … phase34 | 43 each |
| **total, frozen** | **1,072 across 27 baselines** |
| live | 43 |

A frozen tag pins ROW DEFINITIONS and never bytes (charter, session 24), so nothing goes red —
what is owed is the naming, and it would be twenty-seven tags rather than one.

---

## 3. What this means for the brief, item by item

| # | the brief asked | what happened |
|---|---|---|
| 1 | widen the range in `bloom-registry.js`, with 120's derivation in the comment that owns it | **not done** — blocked by item 2's own stop condition. The derivation is recorded in the rulings section of the discovery doc instead, so it survives this session either way. |
| 2 | check the negative end; *"if −30 does reach that regime, report it and stop"* | **done, and it fires** — §1. Reported; stopped. |
| 3 | byte partition, *"prove the existing matrix is 0 moved. Any row that moves is a finding"* | **done as a prediction, and it is a finding** — §2. 43 live rows, 1,072 frozen. Not reachable as 0 moved. |
| 4 | new gate rows for the past-90 regime, declared as magnitudes per #246 | **not done** — the rows exist only if the range does. §2's 23 crossings are what the same declaration would have to cover on rows that already ship. |
| 5 | record that the seam-law extension was considered and rejected | **done** — in the rulings section, where it is findable without a code change. |
| 6 | do not touch the cup bound | **untouched** — nothing in this PR reaches any geometry file. |

---

## 4. What the options cost, so the re-ruling is made in front of numbers

Nothing below is a recommendation. Each is priced from the measurements above.

**(i) A shallower floor.** There is no useful one. The shallowest descending onset over the 22
states is **−8°**, so a floor clean on all of them is −7 — which does not reach the reflexed
shooting-star / cyclamen form the range was ruled for, and is a seventh of the ruled travel.
"Clean at −7" is also only a claim about 22 states, not a proof. **A shallower floor buys
safety by giving up the look the floor was opened for.**

**(ii) −30 with the descending folds DECLARED.** The folds are small (0.0052 to 0.0620 mm of
worst span, 14 to 168 pairs) and every state is watertight and one piece, so they are
declarable in the same form as the past-90 ones the ruling already accepts. **What it costs is
that the declarations are not enumerable from a matrix row set**: the onset depends on the
sheet, the whorl count and the placement TOGETHER — six whorls alone fires at −16 and six
whorls at a 2.40 mm sheet at −8 — and the matrix varies one control at a time, so it is
invisible to the matrix by construction. This is session 32 §18a's `cup × petalTipShape`
sentence arriving on a third pair of controls, and the combination gate that section recorded
is the instrument that would have to exist first.

**(iii) The ceiling alone, 0..120.** Half a ruled range, which item 2 forbids in the other
direction; and it avoids none of §2's FOLD cost, because every one of the eleven
clean-to-folded rows is a `… max` row. It would halve §2's BYTE cost — the rows asking a
composed −50 move only because the floor moved — but not the part that needs declaring.

**(iv) The envelope, whenever either end moves.** The 43 live rows and 1,072 frozen rows move
with it, and the work is re-recording **seventeen** declared magnitudes and declaring **eleven**
new ones. That is mechanical (`node tools/bloom-xfail-magnitudes.mjs --emit`) and it is real.
It is also the part no choice of range avoids, short of not moving the range at all.

---

## 5. What was not done, said plainly

No geometry, registry, app, tool or gate file was touched — the PR is
`docs/bloom-bell-corolla-discovery.md`, this file and a `CLAUDE.md` pointer. So: **no byte
moved** (nothing that the export path reads changed), **no frozen phase is owed** (the row set
is the same 852 and `frozen/phase34` stays the newest baseline), **no tag's bytes stop
reproducing**, and **no bloom gate ran** — each of the five bloom workflows path-filters on an
explicit list of `bloom*` sources and named `tools/` files, and this PR matches none of them.
The two FLOWER gates path-filter on `tools/**`, which this PR also does not match, so it
triggers nothing at all and a green check-suite on it is not evidence about anything in it.

No sheet is owed: nothing visual changed.
