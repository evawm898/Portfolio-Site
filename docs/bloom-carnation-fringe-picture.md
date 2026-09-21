# The carnation fringe — the picture, and the station the budget was measured at

**Session of Sep 13, the follow-up to `docs/bloom-squared-tip-discovery.md` §6f.
A PICTURE, NOT A BUILD: no registry row, no control, no matrix block, no
geometry change. `bloom-geometry.js`, `bloom-registry.js` and `bloom.js` are
untouched by this session.** The fringe is a NON-SHIPPING mutation of
`trimPanels` held inside `tools/shot-bloom-fringe.mjs` and served to the page
by `page.route`, in the throwaway-worktree tradition of `PANEL_OVERLAP_ROWS`'s
own positive control.

**THE IMAGE IS `docs/img/carnation-fringe.png`** (`node
tools/shot-bloom-fringe.mjs <dir>`).

**MODE AND SAMPLING ON EVERY FIGURE.** Every width below is EXPORT and is read
from the shipped profile as (span in `v`) × `halfWidthAt(u)` mm — never from a
row count. The finger and the gap are equal by the even-division law, so one
figure carries both. Census figures are EXPORT, each state built once in Node.

---

## 1. THE ANSWER TO EVA'S QUESTION — it is a fringe along the fingers and a spike at the end

**The mechanism works and the picture is not ambiguous.** At ten fingers on a
60 × 30 mm petal the treated stretch reads as a carnation — a row of parallel
fingers, evenly spaced, the right vocabulary. At three, four and five on the
shipping petal it reads as **slits, not a fringe**: a few dramatic fingers, the
ragged-robin outcome the brief named.

**And every cell fails in the same place, which is the finding rather than the
count.** All N fingers converge into ONE SHARED SPIKE at the apex — the end a
carnation's fringe should be most open at. That is not a tuning problem and no
count fixes it.

## 2. THE FINDING — §6f sized the budget at the SPLIT, and the binding station is the TIP

§6f's budget table is arithmetically right and reproduces exactly: at `u` 0.80
the blade is **10.253 mm** across and `N` fingers plus `N−1` gaps all at
`MIN_FEATURE_MM` give **5**. But **a finger runs from the split to `u` = 1**, so
the station that binds is wherever the finger is NARROWEST — and the blade
converges. Measured, EXPORT:

| station | full width | `N` that fits at the 1.0 mm floor |
|---|---|---|
| `u` 0.55 | 14.750 mm | 7 |
| `u` 0.80 (`uCap`) | 10.253 mm | 5 |
| `u` 0.90 | 7.076 mm | 4 |
| **`u` 1.00 (the apex)** | **1.600 mm** = 2 × `TIP_HALF_MM` | **1** |

**Not even TWO fingers fit at the apex** — two need 3.0 mm there and the blade
has 1.600. The shipped `CAPABILITY_CLEFT` already violates this: its two lobes
are 0.66 mm wide with a 0.28 mm gap at `u` = 1.

**THE CONSEQUENCE IS THAT THE SPLIT BUYS NOTHING.** The floor crossing is the
solution of `2h(u)/(2N−1) ≥ F`, which does not contain the split at all —
measured at four splits from 0.55 to 0.90, every count crosses at the same `u`:

| `N` | clears the floor down to `u` | unprintable tip stretch (35 mm petal) | printable share of the fringe |
|---|---|---|---|
| 2 | 0.9778 | 0.78 mm | — |
| 3 | 0.9461 | 1.89 mm | **73%** of 7.000 mm |
| 4 | 0.9020 | 3.43 mm | **51%** |
| 5 | 0.8443 | 5.45 mm | **22%** |

At ten fingers on the 60 × 30 petal it is **0.273 mm of 12.000 mm — 2%**.

## 3. DOES A BIGGER PETAL BUY A FINER FRINGE? — at the split yes, at the tip nothing at all

**`TIP_HALF_MM` IS AN ABSOLUTE CONSTANT, so the apex is 1.600 mm across at
EVERY petal size.** Measured over `petalWidth` {8, 16, 22, 30} × `petalLength`
{20, 60}: **1.6000 mm on all eight, min = max**. A bigger petal buys nothing
whatever where the fringe actually ends.

**LENGTH BUYS NOTHING EITHER, at any station** — the half-width is a function of
`petalWidth` and `u`; the width at the split is identical at every length
measured. **WIDTH is the only lever**, and it is linear: `N` at the split reads
3 / 5 / 7 / 10 at `petalWidth` 8 / 16 / 22 / 30.

`N` fingers need `(2N−1) × MIN_FEATURE_MM` of width at the station. Solved for
`petalWidth` by bisection against the shipped profile, EXPORT:

| `N` | needs | `petalWidth` for that at the split `u` 0.80 | … at `uPk`, the petal's WIDEST station | reachable? |
|---|---|---|---|---|
| 8 | 15 mm | 23.41 mm | 15.00 mm | yes — `petalWidth` ≥ 24 (split) or ≥ 16 (`uPk`) |
| 12 | 23 mm | past 30 mm | 23.00 mm | **only at `uPk`**, `petalWidth` ≥ 24 |
| 20 | 39 mm | past 30 mm | **past 30 mm** | **NO** |

**TWENTY FINGERS IS UNREACHABLE AT ANY PETAL SIZE THE GENERATOR CAN BUILD,
plainly.** It needs 39 mm of width against a `petalWidth` ceiling of 30 — and
that is measured at the petal's own WIDEST station, ignoring the split and the
tip entirely, which is the most generous reading available. **It is the same
physical wall the margin roadmap recorded**: there a longer petal bought pitch
and no rows; here a bigger petal buys length and no width at the end.

## 4. THE MESH CLOSES, AND THE FINGERS DO NOT FOLD

The brief's stop condition did not fire. EXPORT, on the shipping petal:

| state | export triangles | boundary edges | shells | within-shell pairs |
|---|---|---|---|---|
| plain | 19,040 | **0** | 9 | 0 |
| `CAPABILITY_CLEFT` | 28,576 | **0** | 9 | 4,629 (its declared xfail) |
| FRINGE 3 @ 0.80 | 30,464 | **0** | **9** | 5,624 |
| FRINGE 4 @ 0.80 | 35,872 | **0** | **9** | 7,444 |
| FRINGE 5 @ 0.80 | 41,280 | **0** | **9** | 8,786 |
| FRINGE 10, 60 × 30 | 71,200 | **0** | 9 | — |

**`shells` = 9 is the PLAIN build's own count**, so `PANEL_OVERLAP_ROWS = 1`
still welds every finger into one body at N > 2 — §6f's second question,
answered by measurement.

**AND THE PAIRS ARE THE DECLARED CLASS, PROVED RATHER THAN ARGUED.** Pulling
the base panel clear of the fingers (`base rowTo = lF − 1`, which is
`PANEL_OVERLAP_ROWS = −1` used purely as a diagnostic) makes base-on-finger
impossible by construction. Every count then reads **exactly 0** within-shell
pairs. So no finger folds into another or into itself; all of it is the
overlap slab the CLEFT's own xfail entry names.

The census is calibrated on three points it reproduces exactly: the flat
default **0**, a roll-330 fold **18,776** (both `bloom-self-intersection.mjs`'s
own documented calibration) and the shipped CLEFT xfail entry **4,629 / 0.8550
mm**.

**WHERE IT IS NOT CLEAN, reported rather than tuned around.** Against the PLAIN
petal at the same state, fingers-only, EXPORT:

| state | plain petal | FRINGE 5, fingers only |
|---|---|---|
| flat default | 0 | **0** |
| `spineCurl` 180 | 0 | **0** |
| `petalRoll` 330 | 18,776 | 17,736 — below the plain petal's own, so pre-existing |
| `petalCup` 1.2 | 752 | **2,280** — the fringe adds real finger-on-finger contact |
| `buckleAmp` 0.30 f 3 | 8 | **39** |

Cup and buckle bring the fingers into each other. Not a blocker for the
picture, which is the flat default; a boundary the feature would own.

## 5. WHAT A REAL CONTROL WOULD COST — sized, not built

| what the fringe needs | does `trimPanels` already take it? | cost |
|---|---|---|
| **count** | No — the cleft arm hard-codes two panels | the `fringe` arm (≈14 lines, additive) + one registry row |
| **depth (the split `u`)** | **YES** — `cleft.from` is exactly this, a `u` threshold | one registry row |
| **the finger's own tip shape** | **No, and one half is not expressible at all** | see below |

**THE FINGER'S SIDES ARE SHAPEABLE AND ITS END IS NOT.** `emitPanel` calls
`panel.spanAt(i)` with the global row index and the cleft arm simply ignores it,
so a span that varies down the finger — a tapering or pointed tooth — needs **no
change to the emitter**. But the finger's END is the terminal mini-face at
`u` = 1, ONE STATION shared with the whole petal; shaping *that* is §6e's
surviving half, the `u(v)` terminal edge, and is a different and much larger
change.

**NO EXISTING LOBE CONTROL CAN OWN ANY OF THEM, and the reason is the
registration rule rather than tidiness.** `lobeCount` counts TEETH on the rim —
a boundary treatment inside `widthProfile`; the fringe count counts PANELS — a
domain decomposition inside `trimPanels`. Different owner, different object.
`lobeDepth` is a RELIEF in millimetres (session 42); the fringe's depth is a
STATION in `u`. `lobeCrestShape` / `lobeNotchShape` are local powers of a cut
profile, and a fringe gap is a slot, not a cut.

### 5a. IT IS NOT INDEPENDENT OF THE COVERAGE ARC — measured, and the coupling is global

`emitPanel` maps `v ∈ [−1, 1]` onto the row's own half-width, and that
half-width is the one **after** the lobe cut. So turning lobes on under an
identical fringe narrows **every finger, including interior ones nowhere near
the rim**. Measured on the emitted grid, EXPORT, outer reach in mm from the
midrib:

| state | outer finger | **middle finger** |
|---|---|---|
| fringe only | 5.2857 mm | 0.5873 mm |
| × lobes 5 @ coverage 1.00 | 5.2379 mm | 0.5820 mm |
| × lobes 5 @ coverage 0.40 | 4.1389 mm | **0.4599 mm (−22%)** |

A rim treatment moving the petal's CENTRAL fingers is a coupling a control
would have to own or refuse.

### 5b. AND THE SPLIT IS A ROW INDEX, WHICH IS LADDER-SENSITIVE — §6f's third question

`trimPanels` takes the first row whose `u` exceeds `from`. Asking for the same
`u` = 0.80 under three lobe settings, EXPORT:

| state | split lands on row | finger rows | `u` it landed on |
|---|---|---|---|
| fringe only | 43 | 42..58 (**17**) | 0.8079 |
| × lobes 5 @ coverage 1.00 | 46 | 45..58 (**14**) | 0.8047 |
| × lobes 5 @ coverage 0.40 | 41 | 40..58 (**19**) | 0.8056 |

The `u` barely moves; the ROW INDEX moves by 5 and the finger's row count by
36%. A fringe pinned to a row index inherits every ladder change — CLAUDE.md
already records this split moving on two separate sessions.

## 6. WHAT THE PICTURE POINTS AT — the fringe and the squared tip are ONE feature

§6e built `petalTipEnd` (a squared tip) and reverted it, on the ground that a
wide terminal put the LOBE CUT on the terminal face and drew nothing. **That
objection does not apply to the fringe**, whose fingers are `v`-spans down the
LENGTH rather than a cut along the rim arc — a wider terminal is exactly the
thing a fringe needs and the thing it currently lacks.

Applying this session's own `fits(w)` law to **§6e's own measured terminal
widths** (arithmetic on another session's measurement, not a new build):

| `petalTipEnd` | §6e's measured `faceMm` | `N` that fits AT THE APEX |
|---|---|---|
| 0.00 (today) | 1.600 mm | **1** |
| 0.35 | 5.600 mm | **3** |
| 0.50 | 8.000 mm | **4** |
| 1.00 | 16.000 mm | **8** |

So a squared tip at its maximum would carry **eight** fingers at the apex —
within reach of a real fringe, short of twenty, and it is the only lever
measured here that moves the apex at all. **This is a derivation offered for
Eva to rule on, not a recommendation and not built.**

## 7. WHAT THIS DOES NOT SETTLE

That the machinery exists and closes is not evidence that a fringe is
printable: **nothing in this project has ever been printed**, and
`MIN_FEATURE_MM` = 1.0 is a declared guess (§18b). Every "clears the floor"
figure above is a comparison against a line we drew ourselves. The pictures are
of a NON-SHIPPING capability on a tree with no control, and the triangle cost
(2.17× at five fingers, 3.74× at ten on the wide petal) is measured on one
petal shape and is not a budget.

---

## Instruments

* `node tools/shot-bloom-fringe.mjs <dir>` — the image, the cells and the
  captions. Carries the mutation, checks its own anchor matches exactly once,
  and refuses to run if the served module moves the shipping default.
* `node tools/bloom-self-intersection.mjs`'s exported `census()` — every pair
  count above, EXPORT, each state built once.

**The rig was proved on two controls before any cell**: the mutated module at
the DEFAULT with no capability is bit-identical to the clean tree (0 floats
differ, both modes), and a NEUTERED arm with the capability SET is also
bit-identical — so no figure here can be the wiring. The positive moves.
