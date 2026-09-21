# The uniform arc's near-zero branch — outcome

*The arc-stability session. Discharges ruling 6 of
`docs/bloom-organic-variance-discovery.md` §9: **the near-zero curl branch is fixed BEFORE
any field lands**, by the arc's closed form made sinc-stable, matching the remedy
`spineLaw`'s general branch has carried since session 16. Read §4 of that document first;
this one records what shipped, what it moved, and the three things it measured that the
discovery's own instrument could not see.*

**Nothing else in this PR.** No control, no matrix row, no registry row, no default moved.
`bloom-registry.js`, `bloom.js`, `bloom.html` and `bloom.css` are untouched, verified by diff
against `ae90b70` at the close. (Stated as a measurement rather than as a predeclaration:
the scope was read off the ruling, not written down as a manifest before the first edit.)

---

## 1. The defect, and the one line that is it

`buildPetalInto`'s uniform spine was the phase-1 closed form, character for character:

```js
const phi = tilt + kC * s;
const dR = (Math.sin(phi) - Math.sin(tilt)) / kC;
const dZ = (Math.cos(tilt) - Math.cos(phi)) / kC;
```

Exact in real arithmetic and CANCELLING as `kC -> 0`. The numerator is a difference of two
nearly equal sines whose own rounding is one ulp of a number near 1; the true difference is
of order `kC * s`; dividing a one-ulp error by a vanishing `kC` returns a displacement of
arbitrary size. At the shipping tilt of 25 degrees, `cos(tilt)` is 0.9063 with an ulp of
1.11e-16, and at a curl of 1e-14 degrees the true `dZ` increment is 8.1e-17 — **less than
one ulp of the quantity it is subtracted from, so it rounds to exactly zero and the tip
lands on the hub plane.**

`petalFormIsFlat` guards the flat branch on EXACT zeros, so a curl of 1.1e-14 constructs the
form and reaches that arc. **No slider can**, and neither can a matrix row — see §7a, where
the reason turned out to be sharper than "the harness would refuse it". **A per-slot variance
field can, on every even-count whorl:** at 8 petals a wave `180 cos(theta)` hands the slots at
90 and 270 degrees `180 * cos(pi/2)` = 1.1e-14, not 0.

## 2. What shipped

`sinc` and `arcStep` are lifted to module scope in `bloom-geometry.js` as **the one owner of
a circular arc's own displacement**, and both `spineLaw`'s integrator and the uniform arc
read them. The product form is the same arc algebraically — `sin p1 - sin p0` is
`2 cos((p0+p1)/2) sin((p1-p0)/2)` exactly — with the cancellation moved out of a difference
and into `sinc`, whose small-argument branch is a Taylor series rather than a quotient.

It is not a guard and there is no threshold: at `k = 0` it returns `ds * cos(p0)`, which is
the `kC === 0` branch's own expression, so the two arms meet continuously.

**`spineLaw` IS BYTE-IDENTICAL, MEASURED RATHER THAN ARGUED** — the extraction re-expressed
its integrator through `arcStep` and its `at()` accessor through the same call, and both are
the same arithmetic in the same order. Swept over **1,536 laws** (8 curls x 4 biases x 4
starts x 4 tilts x 3 lengths) and **9,216 stations**, plus all seven reported scalars per
law: **0 values moved, worst |d| exactly 0**, under `Object.is`.

**THE EXACT-ZERO RESOLVER RULE WAS CONSIDERED AND REJECTED** (Eva, ruling 6) and the
rejection is recorded in the comment that owns the fix, because it is the obvious saving and
will be re-proposed otherwise. It would have a per-slot field snap a slot delta below a fixed
fraction of the base's slider step to exactly 0 — byte-identical and cheaper. It is refused
because it is a fifth typed threshold on a project that has found four typed constants
standing in for physical quantities, and because it fixes the FIELD rather than the
ARITHMETIC: the arc would still return a displacement of arbitrary size for any `k` the
resolver let through, and the next producer of a small `k` would find it again.

## 3. The measurement, and what the discovery's instrument could not see

Whole default bloom, EXPORT and LIVE **reading identically**, every emitted float against the
same bloom at curl exactly 0 — the `kC === 0` straight-line branch, which this fix does not
touch. The bound is geometry rather than a tuned number: bending a blade by a total turn of
`curlRad` about a pivot inside the model cannot move any vertex further than
`|curlRad| x (the model's own bounding diagonal)`, and the float floor is 16 ulp of the
largest coordinate.

| curl (deg) | worst \|dx\| on `main` | worst \|dx\| here | bound | on `main` | here |
|---|---|---|---|---|---|
| 1e-16 | 3.1721e+1 mm | 7.1054e-15 mm | 1.4522e-13 mm | **2.18e+14 x** | 0.049 x |
| 1e-14 | 1.4792e+1 mm | 7.1054e-15 mm | 1.6536e-13 mm | **8.95e+13 x** | 0.043 x |
| -1e-14 | 1.4905e+1 mm | 7.1054e-15 mm | 1.6536e-13 mm | **9.01e+13 x** | 0.043 x |
| 1e-12 | 1.9234e-1 mm | 2.8066e-13 mm | 2.1792e-12 mm | **8.83e+10 x** | 0.129 x |
| 1e-10 | 1.6763e-3 mm | 2.8127e-11 mm | 2.0356e-10 mm | **8.23e+6 x** | 0.138 x |
| 1e-9 | 1.8195e-4 mm | 2.8124e-10 mm | 2.0343e-9 mm | **8.94e+4 x** | 0.138 x |
| 1e-8 | 1.7681e-5 mm | 2.8124e-9 mm | 2.0342e-8 mm | **8.69e+2 x** | 0.138 x |
| 1e-7 | 1.9822e-6 mm | 2.8124e-8 mm | 2.0341e-7 mm | **9.74 x** | 0.138 x |
| 1e-6 | 3.3472e-7 mm | 2.8124e-7 mm | 2.0341e-6 mm | 0.165 x | 0.138 x |
| 1e-5 .. 1e-3 | — | — | — | 0.138 x | 0.138 x |

**THE DEFECT REACHES TO ABOUT CURL 1e-6, NOT ONLY TO 1e-14, AND THAT IS A CORRECTION TO THE
DISCOVERY'S OWN TABLE.** §4 read *"from 1e-9 up, clean"* — clean as measured **by the
census**, which is the instrument that session had. At curl 1e-9 the blade stands 1.8e-4 mm
from where it belongs, 89,000 times the most a curl that size can move it; at 1e-7 it is
2.0e-6 mm and 9.7 times over. Neither displaces enough to fold anything, so no pair count can
see either. The ladder above is the instrument that can, and the two populations do not touch
— **0.045 to 0.165 on every value the arithmetic gets right, 9.7 to 2.2e14 on every value it
gets wrong** — so nothing in the bound is fitted to the data in hand.

On the fixed tree the ratio is **0.138 at every magnitude over ten decades**, which is the
real arc deflection scaling linearly, and it bottoms out at 7.1054e-15 mm — **0.78 ulp** of
the 40.819 mm coordinate — at 1e-14 and below.

**AND THE DEFECT IS TILT-DEPENDENT — AT `petalTilt` 0 THE OLD FORM IS ACCIDENTALLY CORRECT.**
Found by the negative control rather than by reading the code, and it is the "is this the
hardest member of the subject" question answering itself. The cancellation is not
tilt-neutral: `dR`'s numerator `sin(phi) - sin(tilt)` loses an ulp of `sin(tilt)` against a
true increment of `cos(tilt) * k * s`, so its relative error runs away as the tilt approaches
90 degrees, and `dZ`'s does the mirror image and runs away at 0. At tilt exactly 0, `dR` is
`sin(phi) / kC` with nothing to cancel against and `dZ` is `(1 - cos(phi)) / kC`, whose
numerator rounds to exactly 0 where the true value is 1.5e-36 mm — **so returning 0 is right
to every bit that matters, and the restored closed form produces NO finding there.** The
shipping 25 degrees fails on `dZ`, which is precisely why the tip lands on the hub plane.

Two consequences, both recorded rather than left to be rediscovered. **A variance field
applied to a bloom at zero tilt would never have shown this defect** — the shipping tilt is
what shows it. And **AS1's tilt-0 rungs are a clause whose subject this mutation is not in**,
so the witness DECLARES that (`CONTROL_REACHES`) and asserts the per-tilt coverage in both
directions, rather than leaving a puzzling silence for a later reader to mistake for a hole.
They stay in AS1 because the arc must be stable there too and a different future defect could
break it. Measured: **26 findings at the shipping tilt, 13 at tilt 75, 0 at tilt 0.**

## 4. The noisy band, per code path — measured, and the answer is NO

The discovery also recorded a second, different class: curl 1e-6 to 1e-3, cup 1e-6 and twist
1e-6 reading tens to hundreds of **span-zero touches** on the census, the session-42
knife-edge class. The brief asked whether the sinc fix covers any of it. **It does not, on
any path, and the two halves of that answer are different.**

Whole default bloom, EXPORT, within-shell census, `main` against this tree:

| state | `main` | here | worst span |
|---|---|---|---|
| curl 1e-6 | 925 | **0** | 0.0000 both |
| curl -1e-6 | 1,214 | **2** | 0.0000 both |
| curl 1e-5 | 200 | **17** | 0.0000 both |
| curl 1e-4 | 521 | **463** | 0.0000 both |
| curl 1e-3 | 456 | **461** | 0.0000 both |
| curl -1e-3 | 495 | **572** | 0.0000 both |
| curl 1e-2 | 0 | 0 | — |
| cup 1e-6 | 10 | 10 | 0.0000 both |
| cup -1e-6 | 16 | 16 | 0.0000 both |
| twist 1e-6 | 129 | 129 | 0.0000 both |
| twist -1e-6 | 93 | 93 | 0.0000 both |
| twist 1e-4 | 1,814 | 1,814 | 0.0000 both |
| roll 1e-6 | 1,264 | 1,264 | 0.0000 both |
| cup gradient 1e-6 | 820 | 820 | 0.0000 both |
| buckle 1e-6 | 696 | 696 | 0.0000 both |

**CUP, TWIST, ROLL, CUP GRADIENT AND BUCKLE ARE EXACTLY INERT — the same count to the
integer on every one.** They are separate code paths from the arc: cup and cup gradient are
`sectAt`'s own `c*a^2/h`, twist and roll are `frameAt`'s rotations, the buckle is
`petalForm`'s displacement field. The arc cannot reach any of them and does not.

**ON THE ARC'S OWN PATH THE COUNTS MOVE, IN BOTH DIRECTIONS, AND THE BAND DOES NOT GO
AWAY.** 925 to 0 at 1e-6 and 200 to 17 at 1e-5 look like a fix; 456 to 461 and 495 to 572 at
1e-3 are the same phenomenon moving the other way. **Every one of them is at worst span
0.0000 mm** — a sheet grazing itself at a crease, decided by where the stations happen to
land, which is precisely session 42's finding about `LOBES: x cup 0.40`: *a span-0 touch is
a property of where the stations land on a crease, not of a fold, and the list cannot tell
those apart.* Correcting the arc's last bits moves the landing and therefore moves the count.

**So the honest statement is that this fix covers none of that band.** It is a second
finding and it is a second PR — and a real one, because the band is reachable by the same
field: a wave that hands a slot 1e-14 hands its neighbours values all the way up through
1e-6. What it is NOT is a fold, which is why it is reported here rather than gated.

## 5. The byte partition

**THE MOVER SET IS PREDECLARED FROM THE BASE TREE'S OWN BUILDER RECORD**, not from the
control set and not from a label: a row moves iff some BUILT petal takes the uniform
closed-form arc, which the builder reports per petal as `spine.curlRad !== 0 &&
spine.uniform`. That is exactly where `buildPetalInto` sets `generalSpine` false with a law
present. The record is read on EVERY petal the builder retained — `petalsAll` for the corolla
and `sepals.built` for the sepal whorl, because a sepal is the petal builder on a second ring
and reaches the same branch through its own `sepalSpineCurl` twin. **Leaves cannot** reach it
(`leafBladeState` pins `petalSpineCurl` to 0) and **stamens and the style cannot** (`rodInto`
calls `spineLaw` directly, which is untouched).

**IT IS READ FROM THE BASE TREE ON PURPOSE.** The prediction then has a different owner from
the quantity under test — the emitted floats of THIS tree — which is the fourth durable rule
applied to a partition rather than to an assertion.

`node tools/verify-bloom-seam-bytes.mjs --base <worktree> --change arc --matrix live
--control --control-mode`. The comparison rides in the tool session 38 wrote and session 39
generalised, because the five claims are the same five: a predeclared partition, the default
held to the bit, the FOOT untouched on every row (moved ones included), triangle counts
unchanged except where declared, and the two modes agreeing. **One thing is stronger here
than for the two ladder changes: `arc` predeclares the mover SET, in both directions, where
`seam` and `widest` predeclare counts. 157 moved could in principle be the wrong 157.**

**THE RESULT — PASS, the whole 852-row live matrix in both modes against a worktree of
`ae90b70`:**

| | |
|---|---|
| floats compared, positionally under `Object.is` | **832,328,424** |
| **MOVED** | **116** |
| **HELD** | **736** |
| the mover SET against the base tree's prediction | **exactly equal, both directions** — 116 rows build a uniform curled arc and those are the 116 whose bytes moved |
| the shipping default | **HELD** |
| triangle counts | unchanged on **every** row; 0 declared exceptions |
| the FOOT | identical on every row, moved ones included — **6,480,054** captured foot values |
| the two modes | agree on every row |

The first movers are `petalSpineCurl min (-180)`, `petalSpineCurl max (360)`, `ALL MIN`,
`FORM: FIDDLEHEAD (spine curl alone)` and `FORM: REFLEXED (cup min x curl below the plane)`.
**Both controls fired**: `--control` perturbs a HELD row by 1e-9 and the run reports it moved
(the held class can produce a verdict), and `--control-mode` reclassifies one row's live
answer and the mode clause reports it exactly once.

**THE DEFAULT IS HELD BY BRANCH AND THAT IS WHY IT IS ASSERTED RATHER THAN ASSUMED**: at
`petalSpineCurl` 0 there is no `form`, so `kC` is 0 and `spineAt` takes the straight-line arm
this fix does not touch. **The FOOT is untouched by construction** — `footRowsAt()` never
reads `spineAt` and the foot rows are pushed before any station is evaluated — and it is
measured rather than argued because J1-J4, the crowding raster and the whole junction
argument read those rows.

### 5b. The xfail magnitudes — five entries re-recorded, one removed

`node tools/bloom-xfail-magnitudes.mjs --include-refused`: **281 declared rows measured, 276
at their recorded magnitude.** Every mover is a row that builds a uniform curled arc —
checked against the builder's own record, not inferred from the label.

| row | pairs | worst span |
|---|---|---|
| `FRINGE: x spine curl 180` | 9,218 -> **9,219** | 1.2703 -> **1.3256 mm** |
| `FRINGE: x ALL FORM MAX` | 12,586 -> **12,351** | 1.6905, unmoved |
| `ORCHID x the IRIS` | 55 -> **57** | 0.1413, unmoved |
| `DOME: rise 1 x ORCHID at two whorls in step` | 351 -> **352** | 0.6233, unmoved |
| `FAN x PER-PETAL: a MIDDLE group only` | 2 -> **0** | entry REMOVED |

Re-recorded in this commit with **the previous figure kept in each entry's note**, never a
widened band — #213's own discipline. **They move in both directions** (one improved by 235
pairs) and the list does not gate magnitude, so all of it would have passed silently.

**`ALL MAX` IS UNMOVED** at 129,803 pairs / 3.1556 mm, and its `EXPORT_REFUSED_XFAIL`
triangle count is untouched because the arc moves no triangle.

**THE ONE REMOVAL IS A SPAN-0 KNIFE EDGE AND IS RECORDED AS ONE.** Two pairs at worst span
0.0000 mm are a tangency of the census triangles against a crease, not a fold — session 42's
`LOBES: x cup 0.40` verbatim — so correcting the arc's last bits moved where the stations land
and the touch went away. X1 requires the entry off in the commit that fixed it, and it is off;
**it can come back** the next time anything moves a curled row's last bits, and if it does
that is a knife edge returning rather than a regression. Session 42 removed such an entry on
an intermediate tree and had to put it back.

**AND ALL FIVE WERE RE-CHECKED IN THE BROWSER, not only in Node**, because X1 and X2 run
inside the STL gates on a Chromium build and a span-0 count is decided by last bits that the
two V8s do not have to agree on (session 38 §B10.7). `node tools/verify-bloom-export.mjs
--only '<the five>'`: **5 of 5 export watertight, 4 declared XFAIL each still failing at its
newly recorded magnitude (the pair count exactly, the span within ±0.00005 mm), and the fifth
— the removed one — is the row reported FREE of within-shell self-intersection.** So the
removal is right in the gate's own engine and not only in Node's.


## 6. The frozen phase — NOT OWED, and the tags whose bytes stop reproducing

**THE BRIEF ASKED FOR A NEW FROZEN PHASE AND ONE IS NOT OWED. The premise is checked rather
than inherited, which is this project's own rule about a prompt.** The charter is explicit
(session 24, Eva, Sep 6): *"NO NEW PHASE IS OWED FOR A BYTE MOVE ALONE. Freezing a phase
every time bytes move would freeze one per session and put the suite back on the quadratic
path the retention ruling closed; the row set is what a baseline is FOR. A phase is still
owed when the row set changes, and never for a move the outcome doc names."*

**The row set does not change here, and it cannot.** Measured: the live matrix is **852 rows
on both trees with 0 rows differing in definition**, and the reason is structural rather than
incidental — the failing values are unreachable through the registry (spine curl steps by 5
degrees) and `applyConfig`'s read-back would refuse a matrix row that tried to set one, which
is exactly why the witness has to call the geometry directly (§7). So `frozen/phase34`
remains the newest baseline, and what this session owes instead is the naming below.

**WHAT IS OWED, AND IT IS DISCHARGED HERE** (charter, session 24): *"WHEN A SESSION MOVES
FROZEN BYTES, ITS OUTCOME DOC MUST NAME WHICH TAG'S BYTES NO LONGER REPRODUCE, with the row
count, even though that tag's definitions still do."* `node
tools/verify-bloom-seam-bytes.mjs --change arc --frozen-sweep`:

| tag | rows moved | of | | tag | rows moved | of |
|---|---|---|---|---|---|---|
| `frozen/phase2` | **0** | 76 | | `frozen/phase19` | 102 | 549 |
| `frozen/phase3` | **0** | 86 | | `frozen/phase20` | 102 | 571 |
| `frozen/phase4` | 15 | 106 | | `frozen/phase21` | 102 | 572 |
| `frozen/phase5` | 16 | 125 | | `frozen/phase22` | 102 | 562 |
| `frozen/phase6` | 17 | 158 | | `frozen/phase23` | 106 | 596 |
| `frozen/phase7` | 34 | 205 | | `frozen/phase24` | 108 | 624 |
| `frozen/phase8` | 39 | 246 | | `frozen/phase25` | 110 | 666 |
| `frozen/phase9` | 40 | 287 | | `frozen/phase26` | 110 | 674 |
| `frozen/phase10` | 72 | 376 | | `frozen/phase27` | 110 | 680 |
| `frozen/phase11` | 99 | 402 | | `frozen/phase28` | 110 | 699 |
| `frozen/phase12` | 101 | 434 | | `frozen/phase29` | 112 | 736 |
| `frozen/phase13` | 106 | 469 | | `frozen/phase30` | 112 | 744 |
| `frozen/phase14` | 102 | 499 | | `frozen/phase31` | 112 | 746 |
| `frozen/phase15` | 107 | 527 | | `frozen/phase32` | 112 | 758 |
| `frozen/phase16` | 100 | 481 | | `frozen/phase33` | 112 | 762 |
| `frozen/phase17` | 101 | 507 | | **`frozen/phase34`** | **112** | **778** |
| `frozen/phase18` | 102 | 528 | | | | |

**31 of the 33 registered baselines carry at least one row whose bytes no longer reproduce;
2,785 of 16,229 frozen rows in total.** The two that hold entirely are `frozen/phase2` and
`frozen/phase3` — the matrix carried no curled row until phase4. **Every one of those tags'
DEFINITIONS is untouched**, and `--verify-frozen` (which deep-compares row order, labels and
set lists, and has never compared a byte) is green on all 33.

**HOW THAT TABLE IS MEASURED, because the honest answer is not "33 byte re-exports".**
Byte-re-exporting all 33 baselines on two trees is the quadratic run the retention ruling
closed — and two of them (phase19 and phase20) cannot be byte-re-exported from any tree after
session 31 at all. So the sweep answers the same question through the change's **own mover
predicate**, which the full byte comparison PROVES EXACT in both directions on the live
matrix (§5) and on `frozen/phase34` before this is quoted. It is a consequence of that proof,
not a substitute for it; a change with no predicate in `MOVER_BY_CHANGE` cannot use the sweep
at all. It is memoised on the (control set, capability) pair, so 16,229 rows cost 999 builds.


## 7. The witness — AS0 to AS4, and why it cannot be a matrix row

`node tools/verify-bloom-arc-stability.mjs` (+ `--negative-control`). Node only, under a
minute, and it rides in `bloom-export-watertight.yml` **beside the wall instrument and before
the npm install**, for the wall instrument's own two reasons: it is the same question (a blade
folded through itself is not printable), and it imports `playwright` not at all —
`bloom-self-intersection.mjs` and the geometry, and nothing else.

### 7a. A matrix row would not be refused — it would silently measure something else

**IT IS THE ONLY THING IN THIS REPOSITORY THAT CAN MAKE THIS CLAIM, AND THE REASON IS SHARPER
THAN THE ONE THIS SESSION FIRST WROTE DOWN.** The first draft of this section said the harness
*would refuse* a matrix row that set a near-zero curl, because `applyConfig` writes through
the real input and reads the value back. **That is false below 1e-9, and measuring it is what
found that out.** `petalSpineCurl` is `step: 5`, and a stepped range input snaps — driven on
the real page:

| set on `#petalSpineCurl` | reads back |
|---|---|
| `1e-14` | **0** |
| `1e-9` | **0** |
| `1e-6` | **0** |
| `0.001` | **0** |
| `2.5` | 5 |

**`applyConfig`'s read-back band for a slider is `|set - got| < 1e-9`.** So a row asking for
1e-14 reads back 0, `|1e-14 - 0|` is inside the band, and **the row PASSES while the page
holds curl 0 and builds the flat default** — the harness measuring a different design from
the one it names, which is the exact class the read-back assertion exists to prevent and
which catches 73 of 185 configs when it was first added to the flower. A row at 1e-6 or 1e-3
WOULD be refused (the difference is outside the band), so the band and the defect's own band
overlap rather than nest.

That is a stronger argument for the witness than the one it replaces: a matrix row cannot
exercise this branch, and a matrix row that tried would be **silently green**. So the witness
calls the geometry directly — and the corollary is that **no matrix row is added and
therefore no frozen phase is owed** (§6).

**RECORDED FOR WHOEVER BUILDS THE VARIANCE FIELD:** the field will hand the geometry values
off the slider grid by design, so its own matrix rows will set FIELD controls (amplitude,
frequency, phase) that ARE on their grids, and the off-grid values will be produced inside
`footRing`. Nothing about that is affected by the band above. What is affected is any future
attempt to pin a near-zero value through a control: it will not work, and it will not say so.

| clause | what it says | reference owner | under test |
|---|---|---|---|
| **AS0** | the shipping default never reaches the arc — `curlRad === 0` on every built petal, so the fix is inert there BY BRANCH | the shipped `DEFAULTS` | the builder's own record |
| **AS1** | the ladder: every rung within `\|curlRad\| x bbox diagonal + 16 ulp` of the flat build, BOTH modes, sixteen values from 1e-16 to 1e-3 | the `kC === 0` straight-line branch, a different arm of the same ternary, untouched by this fix | the arc branch |
| **AS2** | at curl ±1e-14 the within-shell census is EXACTLY the flat build's. An integer, no tolerance | `bloom-self-intersection.mjs` over the flat build | the arc branch |
| **AS3** | a curl that small may not move a triangle | the flat build's count | the emitted stream |
| **AS4** | the curl-graded 8-petal whorl is clean AND each near-zero slot lands where the same petal at curl exactly 0 lands, **per petal** | the same petal at curl 0 | the whorl the field's own `180 cos(theta)` builds |

**AS4's NEAR-ZERO VALUES ARE PRODUCED, NEVER CHOSEN.** The fixture runs `180 cos(theta)` at
the EMITTED azimuth and then asks which slots came out under 1e-9; it fails if that is not
exactly 2 of 8, so a fixture that stopped exercising the branch it names is a red rather than
a quiet pass. And the per-petal comparison is what stops one slot landing right from covering
for another — the whorl census alone would not.

**`--negative-control`** restores `(sin p1 - sin p0) / k` in a copy of `bloom-geometry.js`,
imports it, and REFUSES if the anchor does not match exactly once — a refactor disarms a
mutant by moving its anchor or by making it match twice, and a control that silently mutated
nothing is worth less than none. **AS1, AS2 and AS4 all fire.** The red, verbatim:

```
  the mutant fired: AS1, AS2, AS4
    AS1: curl 1e-16 [export]: the blade is 3.1721e+1 mm from where a flat build puts it,
         against a bound of 1.4522e-13 mm (2.18e+14 x) — the arc has cancelled
    AS1: curl 1e-14 [export]: the blade is 1.4792e+1 mm from where a flat build puts it,
         against a bound of 1.6536e-13 mm (8.95e+13 x) — the arc has cancelled
    AS2: curl 1e-14 [export]: 8806 within-shell self-intersection pairs (worst span 1.1978 mm)
         against the flat build's 0 — the blade has folded through itself
    AS2: curl -1e-14 [export]: 11027 within-shell self-intersection pairs (worst span 1.2928 mm)
         against the flat build's 0 — the blade has folded through itself
    AS1: curl 1e-9 [export]: the blade is 1.8195e-4 mm from where a flat build puts it,
         against a bound of 2.0343e-9 mm (8.94e+4 x) — the arc has cancelled
    ... and 17 more
  AS0 is SILENT, as declared: the shipping default is at curl exactly 0 on both trees, so the
      arc branch is unreached either way — which is the whole of what AS0 says.
  AS3 is SILENT, as declared: the cancelling arc moves vertices, never triangle counts, so the
      topology clause has nothing to report on this mutation.
```

**AS0 AND AS3 ARE DECLARED SILENT WITH THEIR REASONS RATHER THAN DEMANDED.** Each has a subject
the restored closed form is not in, and stating that here is the difference between a coverage
fact and a puzzling MISSED. Both stay asserted: they are real properties of the arc that a
future change could break, and neither costs anything to check. The run also fails if either
one FIRES, which is what keeps the declaration honest.

**WHAT IT DOES NOT SAY, and its own header carries this too.** AS1's bound is an ENVELOPE, not
an equality, so an arc that bent the right way by the wrong amount within the envelope would
pass. What pins the arc's VALUE on every shipped row is the harness's **C2**, which compares
the closed form against `spineLaw`'s independently integrated table on every uniform curled row
of the matrix and bars the residual at 1e-9 mm — and which is now comparing two consumers of
one owner rather than two expressions.

## 8. What this session did not do

- **No control, no matrix row, no registry row, no default.** `bloom-registry.js`, `bloom.js`,
  `bloom.html` and `bloom.css` are untouched, verified by diff against `ae90b70` at the close.
- **No variance field.** Ruling 6 is the precondition; the field itself is rulings 1 through 5
  and 7, in build order size -> form -> spacing, and none of it is here.
- **No render.** Nothing about this is visible: the largest state it moves is a last-bit
  difference on a curled row, and the state it FIXES is unreachable through the UI.
- **The noisy band (§4) is left where it is**, named as a second finding with its per-path
  measurement rather than chased into this PR.
- **No charter entry.** There is no new ruling here — ruling 6 is Eva's and this discharges
  it — and the durable lessons belong in `CLAUDE.md` beside the other numbered ones rather
  than in a second copy. The charter and `CLAUDE.md` deliberately do not restate each other.
- **The `--frozen-sweep` is not a byte re-export** and its header says so. It applies the
  change's own mover predicate, which §5 and `frozen/phase34` prove exact first.

## 9. What the next session should know

1. **THE NOISY BAND IS THE SECOND PR** (§4). Curl 1e-6 to 1e-3, cup 1e-6, twist 1e-6, roll
   1e-6, cup gradient 1e-6 and buckle 1e-6 all read span-zero touches on the census, and the
   same field that hands a slot 1e-14 hands its neighbours everything up through 1e-6. It is
   a sampling coincidence against a crease rather than a fold — so the question that PR has
   to answer first is whether a pair count at worst span 0.0000 should be in X1/X2's
   population at all, not how to make the number smaller.
2. **A ROW THAT PINS A NEAR-ZERO VALUE THROUGH A CONTROL IS SILENTLY GREEN** (§7a). The
   read-back band is 1e-9 and a stepped range input snaps. Any future attempt to reach a
   sub-step value through the matrix will build something else and say nothing.
3. **THE ONE REMOVED XFAIL ENTRY CAN COME BACK** (§5b) — `FAN x PER-PETAL: a MIDDLE group
   only`, two span-0 touches, off in this commit because X1 requires it. If it returns after
   some later change moves a curled row's last bits, that is a knife edge returning.
4. **`arcStep` IS THE ONE OWNER NOW.** A third caller wanting a circular arc's displacement
   reads it rather than writing `(sin p1 - sin p0) / k` again — which is the whole point, and
   the thing this session's own defect was.
