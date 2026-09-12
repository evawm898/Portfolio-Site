# Bloom session 40 — lobes and serration on one rim: discovery

Discovery only. **No geometry moved, no control changed, no row placed differently**
— the one edit to shipped source in this session is to an instrument
(`tools/bloom-lobe-resolution.mjs` gained `--q=` and a per-shape floor report), and
the two new files are instruments that build no mesh. The re-architecture is
**proposed and costed at §6, not built**, as the brief instructed.

## 0a. The record the brief names does not exist, again

The brief says to read `claude/lobes-serration-status.md` "in the project FIRST — it
carries Eva's model and every ruling, and it was rewritten today." **That file is not
in this repository on any branch.** Checked: a filesystem search of the working tree,
`git log --all --diff-filter=A` over every path matching `*lobes-serration*`, and
`git ls-tree -r` over all 21 remote heads after a `git fetch --prune`. The only
mention of the name anywhere is §A's opening paragraph of
`docs/bloom-session-38-outcome.md`, which records the same absence for the same file
and for `claude/edge-treatment-findings.md`.

So, exactly as session 38 did: **the brief's own statement of Eva's model is treated
as binding as written**, and every ruling quoted below is quoted from the brief. If
that file exists outside the repository, nothing here has seen it, and any ruling in
it that the brief does not restate has not been accounted for.

## 0b. Which model is shipped — MODEL A, as an identity rather than a reading

`node tools/bloom-lobe-model-b.mjs --section=0`. The shipping defaults with
`lobeDepth` 0.30 (count 6 asked, 2 built) against the plain default; 4001 samples of
`u`, `Object.is` on `halfWidthAt`, in each mode separately.

| | LIVE | EXPORT |
|---|---|---|
| window `u` | [0.4017, 0.8000] | [0.4017, 0.8000] |
| `windowU[1] === uCap` | **true** | **true** |
| cut at `uCap` | **exactly 0** | **exactly 0** |
| `halfWidthAt(uCap)` `Object.is`-equal to the PLAIN petal | **true** | **true** |
| over `[uCap, 1]` | **4001 of 4001 `Object.is`-equal to plain, 0 differ** | 4001 of 4001, 0 differ |
| inside the window | 3999 of 4001 differ | 3999 of 4001 differ |

**MODEL A.** The treated region is an interval in `u` whose upper end IS the apex
entry; the apex above it is *bit-identical to a petal with no lobes at all*; and the
outline is one half-width `h(u)` applied at `v = ±1`, so it is mirrored across the
spine by construction. The lobe session's own words ("the window ends at the cap on a
crest with the cut exactly 0") are confirmed from the code and from the emitted
outline, not taken on trust.

The cut 1e-4 below `uCap` reads 8.12e-7 — the crest is AT the window end, which is
what makes the cut continuous there and what makes the *derivative* the only thing
that can be discontinuous. That is the whole of the apex defect.

## 0c. Does Model B dissolve the apex defect? — PARTLY, and the part it does not
dissolve is worth more than the part it does

`--section=0b`. Turn angles are DRAWN on the build's own outline through a chord of
±1e-4 in `u`; a negative turn is material turning away (a crest).

**The instrument is calibrated against a figure it did not produce**: Model A's join
at `uCap` reads **−39.748°** at `lobeTipShape` 0.50, against session 38 §B10.3's
**−39.7°** measured by a different tool on a different tree. 0.00° at 1.00 and 2.00,
as that section also reports. Identical LIVE and EXPORT.

**FINDING 1 — the shipped window has TWO corners at `lobeTipShape` 0.50, and the one
nobody has reported is the LARGER.** The window's lower end at `u0` reads
**−44.743°** against the apex end's −39.748°. Same law, same pitch; the base end's
local half-width is 7.04 mm against the apex end's 5.13 mm, and the crest's arm slope
is `π · depth · h / pitch`, so the wider end turns harder. It has never been measured
because every apex instrument looks at the apex.

**FINDING 2 — under Model B the apex JOIN is gone, and it is gone by construction
rather than by tuning: there is no boundary there to join across.** The margin runs
from `u0` to `u = 1` and the treatment runs with it; the rim's midpoint is the middle
of the terminal mini-face, which is not a point of the margin at all. There is no
`u` at which the treated region stops below the apex, so there is no
treated-against-untreated turn to measure. The apex turn column is null by
construction, and that is the answer.

**FINDING 3 — the CORNER CLASS does not dissolve; it relocates to the base.** Model B
still ends its treated arc on a crest at `u0`, and at `lobeTipShape` 0.50 that crest
is still a corner: **−18.2° / −25.9° / −32.5°** at 1 / 2 / 3 teeth, coverage 0.80.
Smaller than Model A's −44.7° only because the same coverage spreads the same teeth
over a rim about twice as long, so the pitch is 21.6 / 14.4 / 10.8 mm against Model
A's 7.14. **So Model B moves the pointed law's corner from the apex, where Eva
objected to it, to the base, where the foot is — and it does not remove it.** A
session opened to "fix the 39.7° corner" would be fixing the corner at the wrong end
even under Model A; under Model B the apex one does not exist to fix.

**FINDING 4 — the apex is where the outline is already AT the print floor in BOTH
modes, and that is what decides how the apex behaves.** The base outline at `u = 1`
is the terminal mini-face: 0.15 mm half-width live, 0.80 mm export, both of them the
mode's own floor. So any cut applied there is clamped away in both modes. Measured at
coverage 0.80, depth 0.30:

| teeth | apex is | cut fraction at `u` = 1 | raw half (mm) | floored (live / export) |
|---|---|---|---|---|
| 1 (odd) | crest | 0.004–0.035 | 0.797–0.772 × | held at 0.150 / 0.800 |
| 2 (even) | **notch** | **0.282–0.295** | 0.564–0.574 × | held at 0.150 / 0.800 |
| 3 (odd) | crest | 0.001–0.069 | 0.799–0.745 × | held at 0.150 / 0.800 |

A **crest at the apex** asks for almost nothing there and gets it: the apex is the
tip law's own shape, essentially untouched, and the treatment arrives at it
continuously. A **notch at the apex** asks to remove 28–30% of a face that is already
the smallest thing the printer can make, and the floor refuses: the notch is
*flattened*. **So the parity coupling is not cosmetic — odd counts are the ones that
work at the apex, and even counts spend their apex notch on a floor.** It belongs in
the read-out, as the brief says, and it is a stronger statement than "odd puts a
crest at twelve".

## 1. What `lobeTipShape` does to the notch — a curve, and the plain answer

`--section=1`. EXPORT, the shipping default petal, `lobeDepth` 0.30, coverage 0.80,
2 lobes, pitch 7.137 mm. Turns are DRAWN on the build's own outline through a chord
of ± the named axial distance; radii and bands are the law's closed form at the
build's own pitch and local half-width. `q` outside [0.50, 2.00] is not reachable
from the slider; the geometry accepts it and the trend is shown.

| `q` | reach | crest turn @0.05 mm | @0.50 mm | notch turn @0.05 mm | @0.50 mm | crest included | notch included | notch radius (mm) |
|---|---|---|---|---|---|---|---|---|
| 0.50 | yes | **−85.7°** | −85.7° | +1.24° | +12.3° | **94.2°** | 180° | **2.259** |
| 0.55 | yes | −64.5° | −77.0° | +1.37° | +13.5° | 180° | 180° | 2.054 |
| 0.60 | yes | −46.5° | −68.7° | +1.50° | +14.8° | 180° | 180° | 1.883 |
| 0.75 | yes | −15.6° | −47.0° | +1.88° | +18.4° | 180° | 180° | 1.506 |
| 1.00 | yes | −2.40° | −23.3° | +2.52° | +24.4° | 180° | 180° | 1.130 |
| 1.25 | yes | −0.41° | −11.4° | +3.16° | +30.2° | 180° | 180° | 0.904 |
| 1.50 | yes | −0.11° | −5.68° | +3.80° | +35.7° | 180° | 180° | 0.753 |
| 2.00 | yes | −0.06° | −1.69° | +5.07° | **+46.1°** | 180° | 180° | **0.565** |
| 3.00 | NO | −0.06° | −0.61° | +7.62° | +64.0° | 180° | 180° | 0.377 |
| 4.00 | NO | −0.06° | −0.56° | +10.2° | +78.4° | 180° | 180° | 0.282 |

**THE NOTCH'S INCLUDED ANGLE IS 180° AT EVERY `q`, as an identity of the law and not
a reading.** The cut is `((1 − cos 2πx)/2)^q = sin(πx)^{2q}`; about the sinus at
`x = ½` that is `1 − q π² e² + O(e⁴)` for every exponent, so the wave is parabolic at
its minimum whatever `q` is. No value of this control opens an angle at the notch.

What `q` does buy at the notch is a RADIUS, `R = pitch² / (2π² q · depth · h)`, and it
TIGHTENS with `q` — from 2.26 mm at the acute end of the control to 0.57 mm at the
flat end. **That is the same end of the control that flattens the crest.** The two
features move in opposition: at `q` 0.50 the crest is a corner (94.2° included) and
the notch is at its ROUNDEST; at `q` 2.00 the notch is at its tightest and there is
no crest left to point.

**SO: CAN ONE CONTROL CARRY BOTH ENDS OF EVA'S RANGE? NO — and widening its range
does not fix it, because the range is not what is wrong.** Eva's serration is acute
at *both* features (a serrate margin is triangular teeth with sharp sinuses); Eva's
lobing is obtuse at both. This family cannot produce "both acute" anywhere in
`(0, ∞)`: it trades one for the other monotonically. The most balanced point is
`q ≈ 1`, where crest and notch read −23.3° and +24.4° at the 0.50 mm scale — which is
the shipped default, and which is neither end of the range Eva described.

**WHAT WOULD CARRY BOTH, AND WHAT IT COSTS.** A triangle wave has corners at BOTH
crest and sinus. At the same depth and pitch as the row above it gives **114.7°
included at the crest AND at the sinus** (a flank of 32.6°, a turn of 65.3° at each)
— less extreme than `q` 0.50's crest, far sharper than its notch, and symmetric. So
the minimal change that covers Eva's description is **one parameter that interpolates
ROUND ↔ TRIANGLE**, replacing the exponent that interpolates pointed-crest ↔
flat-crest. Two ways, costed and neither built:

* **(i) One control, new family.** Keep one slider, change the law so its travel runs
  cosine → triangle (a corner radius on a triangle wave, or a symmetric
  superellipse-of-a-wave). One expression in `widthProfile`'s lobes block; the
  station table, the caps, the demand and the record are untouched. It **retires
  `lobeTipShape`'s meaning** — the same slider position draws a different shape — so
  it is a partition event on every lobed row and owes the three-capture construction.
  The resolution floor must be re-derived (§3): a triangle's bands are the whole
  period, so clause (i) reads differently across the travel.
* **(ii) Two controls.** Crest sharpness and notch sharpness as separate exponents
  (`sin^{2q}` at the crest blended with `1 − cos^{2p}` at the sinus, both 1 at the
  cosine). Strictly more expressive, reaches "both acute" and also the two
  asymmetric leaf margins (crenate, dentate) that neither (i) nor the shipped family
  can draw. Cost: one registry row, one range constant, one more term in the record
  and the read-out, one more axis on every lobe gate row — and it is **a second
  control over one region**, which is exactly the registration rule session 32 used
  to reject a terminal-width control beside the apex exponent. Whether "the crest's
  shape" and "the notch's shape" are one region or two is Eva's ruling, not a
  measurement.

**Serration is not a separate feature under either.** It is one setting of one
generator in both — the brief's rule holds, and nothing here proposes a second
builder.

## 2. Proportional or absolute depth — proportional, and the brief's mitigation does
not reach the problem

`--section=2`. Model B prototype, coverage 1.00 (the whole clock), `q` 1.00, so the
treatment reaches `u = 1`. PROPORTIONAL is a fraction of the local half-width (the
shipped rule); ABSOLUTE is the same millimetres everywhere, matched to what the
proportional rule removes at `u` 0.50.

**FINDING 5 — the two floors are not the same floor, and the one the brief names is
not the one that binds.** The OUTLINE floor holds the half-width at `tipFloor`; a
proportional cut essentially never reaches it, because the cut shrinks with the width
it is cutting. Measured: **0 notches width-floored on every row at or under the
shipped depth cap**, in both modes. The two rows that do show width clamping are at
depth 0.90 against a cap of 0.74–0.81 — states the shipped `depthCap` already
refuses.

What fades toward the apex is the lobe's **RELIEF**: the millimetres of material the
notch removes, which is what a printer has to resolve as a feature. Its floor is the
same physical length the lobe PITCH already derives from,
`max(sheetThickness, MIN_FEATURE_MM)` = 1.20 mm here — one owner, `lobePitchFloor`.

| mode | teeth | depth | cap | notch reliefs, base → apex (mm) | under the relief floor |
|---|---|---|---|---|---|
| EXPORT | 3 | 0.30 | 0.81 | 2.299 · 1.255 | 0 of 2 |
| EXPORT | 5 | 0.30 | 0.74 | 2.366 · 1.923 · **0.933** | **1 of 3** |
| EXPORT | 5 | 0.60 | 0.74 | 4.733 · 3.847 · 1.865 | 0 of 3 |
| LIVE | 5 | 0.30 | 0.74 | 2.366 · 1.924 · **0.933** | **1 of 3** |

It fades SMOOTHLY rather than at a cliff — 2.37 / 1.92 / 0.93 mm across three
notches — and the apex-most notch is under the relief floor at depth 0.30 while the
base-most is twice over it.

**FINDING 6 — ABSOLUTE depth is disqualified by measurement, not by preference.** The
outline reaches **zero half-width** on the converging tip: at `u` 0.999 at depth 0.30
on five teeth, at `u` 0.889 at depth 0.60, at `u` 0.665 at depth 0.90. That is the
petal severed — a split outline, out of scope at any parameter value by the brief's
own binding rule. Absolute millimetres cannot be made safe near an apex whose base
half-width runs to 0.80 mm, because the cut does not know the width has gone.

**FINDING 7 — AND THE BRIEF'S MITIGATION CANNOT REACH THIS.** "coverage that stops
short of where the floor would clamp" assumes coverage can exclude the fading end.
Eva's coverage is measured from TWELVE outward and excludes SIX, so **the apex is the
one arc coverage never removes.** The fade point sits at `u` 0.875 / 0.963 / 0.982 at
depth 0.30 / 0.60 / 0.90 — 6.34 / 2.64 / 1.72 mm of rim either side of the apex — and
a coverage that stopped short of it would have to be an ANNULUS excluding twelve,
which is the one shape the clock model rules out.

**So the working hypothesis is right about proportional and wrong about the
mitigation.** The reachable options, none taken:
* **Accept the fade.** A real leaf's teeth shrink toward the tip; the fade is smooth
  and continuous, which is what "indistinguishable from the side treatment" asks for.
  The apex-most tooth is then present in the model and below print resolution — it
  reads as a smooth tip, not as a defect.
* **Floor the relief** at `max(sheetThickness, MIN_FEATURE_MM)` and let the depth
  fraction rise toward the apex to hold it. This re-introduces §2's severing risk and
  needs its own cap; it also makes depth non-proportional exactly where the shipped
  `depthCap` is derived, so the two would have to be derived together.
* **Taper the depth to zero over the last stretch.** Continuous, printable, and it
  re-introduces a *boundary* — the thing Model B exists to remove.

## 3. Is the resolution floor a function of sharpness? — YES, and it varies the
opposite way to the brief's hypothesis

`node tools/bloom-lobe-resolution.mjs --q=0.5,0.6,...,2.0`. Clause (i) of that
instrument's own derivation — every shape's BROAD band must span two station gaps,
so it is drawn as a bend and not a corner — reported per shape rather than only as
the set-wide constant. The instrument was extended, not restated: its clauses, its
model cell and its ladder placement are unchanged.

| `q` | broad feature | band (of the period) | floor, ladder | floor, uniform |
|---|---|---|---|---|
| 0.50 | sinus | 0.287 | **10** | 7 |
| 0.60 | sinus | 0.263 | 10 | 8 |
| 0.70 | sinus | 0.244 | 10 | 9 |
| 0.80 | sinus | 0.229 | 10 | 9 |
| 0.90 | sinus | 0.216 | **11** | 10 |
| 1.00 | sinus | 0.205 | **11** | 10 |
| 1.10 | crest | 0.228 | 10 | 9 |
| 1.25 | crest | 0.261 | 9 | 8 |
| 1.50 | crest | 0.307 | 9 | 7 |
| 1.75 | crest | 0.347 | 8 | 6 |
| 2.00 | crest | 0.380 | **8** | 6 |

**The floor runs 8 to 11 across the shipped range, and it PEAKS IN THE MIDDLE.** The
brief's hypothesis — "an acute notch is a higher-frequency feature, so a constant
floor is probably wrong across the range" — is right that the floor is not constant
and wrong about the direction: **the acute end needs FEWER stations, not more.** The
reason is structural rather than incidental. A corner does not need resolving — a
station either side of it draws it exactly. What needs resolving is the ROUND band,
and the exponent that points one feature necessarily rounds the other, so the
narrowest broad band in the family sits where neither feature is pointed: `q` ≈
0.9–1.0, both bands 0.205–0.216 of the period, which is the shipped default and the
shipped constant 11.

**Consequence: the resolution demand the ladder receives must carry SHARPNESS, not
just count.** What it buys, measured through the shipped `bladeStations` (§4):

| floor | Model B teeth at coverage 1.00 | at 0.80 | Model A period cap at 1.00 |
|---|---|---|---|
| 11 (`q` ≈ 1, the shipped constant) | 6 | 5 | 2 |
| 10 (`q` 0.50) | 7 | 5 | 3 |
| 8 (`q` 2.00) | **9** | **7** | 3 |

So at the flat end of the sharpness control a shape-aware demand buys **three more
teeth at maximum coverage and two at the default** under Model B, at no cost to how
the shape is drawn — the floor it drops to is that shape's own derived floor, not a
relaxation. Under Model A it buys one period. If the family changes per §1, these
have to be re-derived on the new law's bands; the derivation is `clause (i)` and it
is already per-shape.

## 4. The count ceiling, restated

`--section=4`. EXPORT, the shipping default petal (35 mm, sheet 1.200 mm), buckle
flat, pitch floor 1.200 mm. **The ladder is the SHIPPED `bladeStations()` in both
columns** — the Model B column runs it on a PROXY profile whose `ladderHalfAt`,
`ladderLawActiveAt` and `ladderDemand` are the prototype's and whose placer is the
one owner, unchanged. Model A counts PERIODS in `[u0, uCap]`; Model B counts TEETH
over the whole rim, `Np = teeth + 1`.

| coverage | A: window | cap | rows/pitch cap | **A built** | demand | placed | /lobe | B: `u0` | treated arc | cap | rows/pitch cap | **B built** | apex | demand | placed | /period |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0.10 | [0.752, 0.800] | 13 | 1 / 1 | **1** | 11 | 13 | 13.0 | 0.962 | 5.41 mm | 12 | 2 / 3 | **2** | notch | 12 | 12 | 11.4 |
| 0.40 | [0.604, 0.800] | 19 | 1 / 5 | **1** | 11 | 18 | 18.0 | 0.756 | 21.63 mm | 21 | 3 / 17 | **3** | crest | 21 | 22 | 11.9 |
| 0.80 | [0.402, 0.800] | 27 | 2 / 11 | **2** | 22 | 27 | 13.5 | 0.454 | 43.26 mm | 33 | 5 / 35 | **5** | crest | 32 | 33 | 11.4 |
| 1.00 | [0.300, 0.800] | 31 | 2 / 14 | **2** | 22 | 30 | 15.0 | 0.300 | 54.08 mm | 39 | 6 / 44 | **6** | notch | 38 | 39 | 11.5 |

**The corrected band from the `widest()` session does not move Model A's ceiling, and
that is a structural fact rather than a coincidence.** `ladderWindowCapacity` reads
only `HELD_ROWS` and `ladderGapFactor`; it never calls `widest()`. Its numbers here —
13 / 19 / 27 / 31 — reproduce session 38 §B10.2's exactly on a tree two PRs later.
What #215 changed is which blend the bisection lands on, not how many free rows a
window has.

**Model B roughly triples the ceiling: 2 → 5 at the default coverage and 2 → 6 at
maximum**, with the demand met (11.4–11.9 rows a period placed against a floor of
11). Two structural reasons, both of them the same reason: under Model A the apex
region `[uCap, 1]` is reserved for an untreated law and its 8–10 rows are unavailable
to the window, AND the gap bound must reserve `ceil((1 − u1)/gap)` stations above the
window; under Model B `u1` is 1, the tip reserve is zero, and every free row above
`u0` serves the treatment.

**Which constraint binds where.** The RESOLUTION floor binds from below at every
coverage on both models — the pitch cap is 3–44 where the rows cap is 1–6, and a
pitch cap strictly below the rows cap needs a window narrower than the capacity can
already resolve. **The print pitch floor never binds on the default petal in either
model**; it binds only on a short petal at low coverage (session 38 measured NO ROOM
at 20 mm × coverage 0.10), and Model B's longer arc makes it bind even less often.

**THE PARITY COUPLING, derived rather than asserted.** With the treated arc ending on
crests and `Np` periods over it, the rim's midpoint is a crest iff `Np` is even and a
sinus iff `Np` is odd; the free-standing teeth between adjacent sinuses number
`Np − 1`. So the user-facing COUNT is `Np − 1`, and **an odd count puts a crest at
the apex, an even count a notch** — which is exactly Eva's clock: one lobe at twelve
is count 1, two either side of twelve is count 2, three at eleven / twelve / one is
count 3. It belongs in the read-out, and §0c gives it the extra sentence it deserves:
at an even count the apex notch lands on the terminal face, which is at the print
floor in both modes, so it is *flattened* rather than drawn.

## 5. The image

`node tools/shot-bloom-serration-range.mjs <dir>` → `serration-range.png`, plus each
cell and two same-tree controls. Every cell: the same 35 mm petal, coverage 100%,
PRINT PREVIEW ON with the app's own `shownMode` asserted `"export"`, a macro crop
framed on the petal's own TIP (read from `__bloomMetrics().petalTip` / `petalMid`,
never a layout guess) down its own normal, **so the apex is in every crop.** Each
caption carries all four control values, the built count against the asked one, and
the stations per lobe the ladder emitted.

**ROW 1 IS THE HONEST ANSWER TO "SHOW EVA'S SLIDERS DOING WHAT SHE DESCRIBED": THEY
CANNOT.** The count axis is inert on the shipping tree — the row placer caps the
built count at TWO at every coverage on every petal length the range offers — so all
three cells are two lobes and only depth and sharpness vary. **Serration is not a
slider position on this tree**, and no petal length reaches it: the cap is in `u`
(rows), not in millimetres (pitch), so a longer petal buys pitch and no rows at all.

**ROW 2 shows the same depth and sharpness at Eva's counts through the CAPABILITY
hook**, the non-shipping mechanism session 38's floor demonstration already uses,
with the stations per lobe named on every caption. The serration cell is built at 3
stations a lobe against a floor of 11, so its teeth are drawn as polygons — **that is
the cost of the count, not a property of the shape**, and saying so is the point of
the row.

Same-tree controls are REPORTED and never used as a bar: **`ship-a` 0 px, `desc-a`
0 px**, each cell shot twice on the same tree at the same camera, every cell settled
to two byte-identical frames.

The image is `docs/img/serration-range.png`.

## 6. The proposal, and what it would cost

**Not built.** What §0–§5 support, for Eva to rule on:

1. **Model B is the re-architecture, and its case is the count as much as the apex.**
   It dissolves the apex join by construction (there is no boundary there) and it
   roughly triples the reachable count (2 → 5/6) because the apex region's rows stop
   being reserved for an untreated law. The apex CORNER at a pointed crest is not
   dissolved — it relocates to the base end, where it is already larger today
   (−44.7° against −39.7°) and unreported.
2. **What it touches.** `widthProfile`'s lobes block: the arc table runs over
   `[0, 1]` instead of `[ROOT_BLEND_END, uCap]`, the window becomes `[u0, 1]`, the
   phase is measured from the rim midpoint, and the count becomes teeth rather than
   periods. `ladderWindowCapacity` and `ladderOutsideMinima` need no change — `u1 = 1`
   already gives a zero tip reserve. `petalTipShape` still owns the apex LAW; the cut
   multiplies it exactly as it multiplies the core today, which is not a second owner
   of the region but is a change to what `[uCap, 1]` can be, and that is §5 of
   `docs/bloom-session-32-outcome.md`'s contract to re-rule rather than to assume.
3. **It is a partition event on every lobed row** and owes the three-capture
   construction, plus a re-baselined self-intersection census — the census is the
   verdict, and a cut that now reaches the converging tip is exactly where new
   folds would appear. New gate rows first, seen red.
4. **Sharpness needs a decision before the count does** (§1): the shipped family
   cannot draw Eva's serration at any count, because it cannot point the notch. The
   count work is wasted on a shape that is still the wrong shape.
5. **The resolution demand should carry sharpness** (§3), worth 2–3 teeth at the flat
   end, and must be re-derived on whatever family §1 lands on.
6. **Depth stays proportional** (§2); the relief fade at the apex is intrinsic and
   coverage cannot mitigate it.

## 7. What shipped

* `tools/bloom-lobe-model-b.mjs` — new. The discovery instrument: §0 / §0b / §1 / §2
  / §4 above. Builds no mesh, places no row (it runs the shipped `bladeStations` on a
  proxy profile), is imported by nothing, and emits nothing. `--json=<file>`,
  `--section=`, `--floor=`.
* `tools/bloom-lobe-resolution.mjs` — `--q=<list>` and a PER-SHAPE clause (i) floor in
  both the text and the JSON. The clauses, the model cell and the ladder placement are
  unchanged, and the default invocation reproduces §B10.1's own table to the digit
  (bands 0.064 / 0.287, 0.205 / 0.205, 0.380 / 0.145; `n` 11 ladder reads
  2.44 / 2.20 / 2.66 with chord error 0.026 / 0.030 / 0.038; FLOOR 11 ladder, 10
  uniform) plus the per-shape block. **One defect this change introduced and the
  check that caught it**: generalising the pair list from the shipped triple to every
  unordered pair of `Q` reordered two printed columns while their header stayed a
  LITERAL naming the old order — the header now derives from the sets it labels, and
  the literal is gone. Nothing consumed the tool's JSON.
* `docs/img/serration-range.png` — the image of §5.
* `tools/shot-bloom-serration-range.mjs` — new. The one image of §5.
* This document.

**Zero bytes of geometry.** `bloom-geometry.js`, `bloom-registry.js` and `bloom.js`
are untouched.
