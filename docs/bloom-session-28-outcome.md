# The anther's seven, session 28 (tip plan 3b) — the tip's controls, 0 moved, `frozen/phase18`

Session 24 ruled the parametric tip in eight parts and sized it at four sessions. Session 26
was session 2 — the primitive and the migration, zero controls. Session 27 was 3a — the
nesting bound lifted and the smoke gate's family census derived. **This is 3b: the anther's
seven controls, and nothing else.** The stigma's seven are session 4, which instances both
from one table; the generator is deliberately NOT carried here, because a session that cannot
observe drift cannot verify the mechanism that prevents it.

---

## The seven, as they ship

All under `Androecium ▸ Tip` — the panel's first **third level**, which session 27 made legal.

| control | range | default | what it is |
|---|---|---|---|
| `antherSize` | 0.60 – 6.00 | **1.60** (`ANTHER_DIAMETER_FACTOR`) | the anther's diameter, × the filament's |
| `antherElongation` | 1.00 – 6.00 | **2.50** (`ANTHER_LENGTH_FACTOR`) | its length, × its own diameter |
| `antherRoundedness` | 0.00 – 1.00 | **1.00** | the blend toward a circle — the ONLY producer of one |
| `antherPoints` | 2 – 12 | **4** | the outline's symmetry order *n* |
| `antherSharpness` | 0.25 – 8.00 | **2.00** | the one exponent *s* — star ▸ polygon ▸ circle ▸ rounded *n*-gon |
| `antherLumps` ("Lobes") | 1 – 6 | **1** | tips sharing the filament's end |
| `antherSpread` ("Lobe spread") | 0 – 90° | **0** | how far each leaves the filament's own direction |

Two are **hidden AND inert at a roundedness of exactly 1** (`antherOutlineLive`): the point
count and the sharpness. That is Q1's ruling — *roundedness is the only producer of the
circle and sharpness is inert there* — and here the inertness is **in the arithmetic**, not in
a branch: the blend is `1 + 0 * h`, which is exactly 1 in IEEE-754 for any finite `h`, and
`tipSides()` returns the rod's own lattice for a circle whatever the point count says. The
roundedness read-out says so, with the two kept values, on the stamen count's own precedent.

`antherSpread` is **not** gated on the lobe count. At one lobe a spread above 0 *leans* the
anther off its filament, which is a shape and not a dead slider — the DEAD-is-not-INVISIBLE
rule, checked rather than assumed. The reverse corner, **two lobes at a spread of 0**, emits
coincident tips: duplicate geometry, which is this family's known cause of non-manifold edges.
It is **told, never refused** (`lumpsCoincident` on the ANTHER line), because refusing it would
mean a spread with a non-zero minimum and 0 at one lobe is the shipping default.

---

## 0 moved is a CONSTRUCTION, and here is the construction

Predeclared before a line was edited; measured afterwards.

1. **The two proportions are the constants' own expressions, term for term.** `size * diameter`
   stands where `ANTHER_DIAMETER_FACTOR * diameter` stood, and
   `elongation * size * diameter` where `ANTHER_LENGTH_FACTOR * ANTHER_DIAMETER_FACTOR *
   diameter` stood — the same two products in the same order on the same doubles. This is not
   pedantry: `(e * s) * d` is not `e * (s * d)` in floating point, and the whole claim is that
   order.
2. **The two defaults ARE the two constants**, imported by the registry from
   `bloom-geometry.js` rather than retyped, and asserted equal at harness load.
3. **The outline is exactly 1** at roundedness 1, so `r * f === r` in `revolveInto` — session
   26's own argument, unchanged.
4. **The lattice is the rod's own ten** at roundedness 1, so the tip's tessellation is
   untouched (see below — this is the one thing that is genuinely new).
5. **One lobe at a spread of 0** runs the new loop once at `psi = 0 * TAU / 1 = 0` with
   `spreadRad` 0, which is the Rodrigues identity: term for term, session 26's single call.

**Measured, on `frozen/phase18` (the 528 rows at `cb798f6`), a plain capture per tree:**

```
528/528 byte-identical; 0 moved
byte diff: PASS — 0 of 528 configs moved. Defaults are bit-identical.
```

Because `phase18Matrix()` **is** `cb798f6`'s own `buildMatrix()`, that one pair is both halves
of the charter's close-out at once: the newest frozen baseline, and the live-matrix partition
over every row the two trees share. The twenty-one rows of block 25 exist only on the new tree
and are new states, not movers.

---

## The one thing that is genuinely new: the tip's lattice is no longer a constant

`STAMEN_SIDES` is 10, and the outline law's extrema sit at **2n azimuths** — *n* points and
*n* valleys. Ten samples land on all of them **for n = 5 and for no other point count in the
range.** A triangle sampled every 36° is an irregular blob; `antherPoints` on a fixed 10-gon
would be a control that tells the truth at one of its eleven values. So:

```
tipSides(shape) = roundedness === 1 ? STAMEN_SIDES
                                    : n * 2 * ceil(STAMEN_SIDES / (2n))
```

— *k* even and at least 2, so every point and every valley is sampled, and the whole at least
the rod's ten. **10 sides at n = 5; 12 at n = 2, 3 and 6; 16 at n = 4; up to 24 at n = 12.**
`revolveInto` now reads the lattice off the **outline array's own length**, so a shape and its
tessellation cannot disagree; the rod's arm still passes `null` and does no arithmetic at all.

The circle arm is not a special case bolted on for the bytes — it is the same statement as the
outline's. **It is also what makes the two hidden controls inert rather than merely invisible:**
with the factors exactly 1 *and* the lattice fixed, the emitted tip is independent of both, and
JS7 measures that at the opposite corner of both controls rather than arguing it from the
arithmetic.

**Cost**, from `tippedRodTris()` itself. A tip is `20 × sides` triangles, so 200 at the
default and up to 480; a stamen is the rod's 360 plus its lobes. **560 today; 840 at a
12-point outline; 1,560 at six lobes on the circle's lattice; 3,240 at both.** The worst
reachable androecium — 120 stamens, six lobes, 24 sides — is **388,800 triangles** against
today's 67,200, a factor of 5.79. That ceiling is reachable through the sliders and is
reported here rather than clamped: every earlier ceiling in this project (`MAX_LAYERS`,
`MAX_STAMENS`) is a stated bound, and this one is the product of two of them plus a lattice.
The shipping default is unchanged, because the androecium still ships absent.

---

## The sharpness floor — Eva's ruling, and what it does *not* bound

`R_min = MIN_FEATURE_MM / 2 = 0.50 mm`, carried with **`UNMEASURED — no coupon has been
printed`** verbatim wherever it is printed. Full range, **CLAMPED, TOLD** — the spine curl's
discipline.

**What it bounds is the WAIST:** the narrowest radius anywhere on the emitted outline,
`a · min_j f_j`. Below a sharpness of 2 the law pinches inward at the diagonals
(`h` dips to `2^(1/2 − 1/s)`), and at 0.25 on the shipping anther that waist is **0.085 mm** —
a hairline. Closed form, and it is a floor on *sharpness* because sharpness is the only control
that makes the waist: with `need = R_min / a`,

```
h_min ≥ m = (need − rho)/(1 − rho)   ⟹   s ≥ 1 / (1/2 − log₂ m)
```

Three corners, all told and none refused: `rho ≥ need` needs no clamp at all (**the default's
arm**, where `rho` is exactly 1 and no arithmetic runs); `need > 1` means the whole tip is
thinner than the floor and no sharpness saves it (`underFloor`); everything between clamps
upward to `sNeed`, which is `≤ 2` by construction, so the clamp can never push a shape past
the circle.

**It does NOT bound the included ANGLE of a point** — the other thing a printer would care
about, and which nothing here derives. Two claims; one measured, one absent. And the floor's
own number is an assumption on top of an assumption: `MIN_FEATURE_MM` has never met a printer
either.

---

## Q6 discharged rather than instrumented

Ruling Q6 is **no self-intersection instrument, ever** — the ranges are what keep the outline
from inverting. `f` is a radial graph about the tip's axis, so it is simple iff it is strictly
positive; `f ≥ min(1, h)` and `h ≥ 2^(1/2 − 1/s)`, so at the shipped floor of `s = 0.25` the
worst case is `2^(−3.5) = 0.0884 > 0`. **The bound is the proof**, which is why the registry
*imports* `TIP_SHARPNESS_RANGE` and the rest from the geometry rather than restating them, and
why the harness fails at module load if that import quietly became a literal. A wider slider
than the law was proved on would make the ruling false with nothing failing — both STL gates
are blind to a self-intersection by design.

---

## JS7 — the new assertion family, and why it is not JS4 or JS6

JS4 and JS6 ask what was **emitted**. **A tip built perfectly from the wrong seven passes both
of them.** JS7 asks whether the descriptor *is* the seven controls:

- **(i)** every one of the seven equals its control's value, and the spread's radians are the
  degrees converted;
- **(ii)** the two proportions **rebuilt from the slab** (`m.hubThickness`), never read back off
  the descriptor that computed them — C1's and JS5's discipline;
- **(iii)** the sharpness floor **restated in closed form** here rather than calling
  `tipSharpnessFloor()`, so a floor derived from the wrong quantity fails instead of agreeing
  with itself; `floored` and `underFloor` both **two-sided**; the built sharpness never below
  the asked; the reported waist equal to the narrowest *emitted* radius;
- **(iv)** the lattice law restated **and** asserted as a property of the number itself (a
  multiple of 2n, at least `STAMEN_SIDES`) — which no restatement can give away;
- **(v)** **the inertness, measured**: at roundedness 1 both laws are evaluated at the opposite
  corner of both controls and must give an identical answer. This is a different claim from
  *the factors are exactly 1*: it fires on a lattice that varied with *n*, which is what a
  shipped, hidden, NOT-inert slider looks like;
- **(vi)** `bandFloored` and `lumpsCoincident`, both directions.

**JS4 and JS6 generalised with it.** The census now calls `tippedRodTris(lumps, sides)` with
the count and the lattice *this owner declares* — a constant would be a number that stops being
true with nothing failing. JS6 runs per lobe at its own azimuth, keeps the stronger
`axis === the rod's direction` clause **only where the spread is exactly 0**, and session 26's
apex-reach clause (the elongation floor's only anther witness) moved onto each lobe's own axis.
The shared `tipClauses` gained the **axis** rebuild — it was the caller's while an anther could
only be aimed at no spread — and its `must be exactly 1` clause became the **roundedness
biconditional**: exactly 1 at roundedness 1, and *not* all 1 below it, because the first clause
compares a mutated law against itself (session 26's M2a, where the unblended law differed from 1
by 1.1e-16). JG5 keeps the hard-wired-`TIP_SHAPE` clause the shared statement gave up; the
stigma is session 4's.

**The census caught the omission before a human did.** `node tools/bloom-smoke.mjs --check` on
the first run reported *matrix block 25 has no smoke row* and *assertion family JS7 is asserted
and claimed by NO smoke row* — the biconditional session 27 built, firing in both directions the
first time it was needed.

---

## Panel route (t) — and why route (d) could not do it

Route (d) derives its drivers from the registry, so `antherRoundedness` became one the day it
landed. **But route (d) drives from the DEFAULTS, where the androecium is absent** — so
`antherPoints` is hidden at *both* ends of the roundedness slider, its predicate agrees at both,
and its pass there is vacuous. Route (t) is the transition with six stamens present, and it also
carries:

- **the third level as a NUMBER** — the count of enclosing `<details>` must be 2, so a Tip that
  quietly re-parented to the top fails here rather than reading identically to route (a)'s census;
- **the inertness behaviourally** — the two hidden controls driven to their extremes at
  roundedness 1, with the triangle count required not to move from the shipped pill's. That is a
  stronger claim than `hidden` for a control whose whole job is the tessellation;
- **the ANTHER read-out line** against the owner's own record: the lattice, the waist, the
  verbatim UNMEASURED tag, and four flags each in both directions.

Under `--negative-control` route (t) fires **11 assertions**.

**The third level's CSS is paid.** Session 27 said `bl-sec--sub` is "nested at all", not "nested
at depth k", and that the rule was owed by whoever first declared one. It is a **descendant
selector** in `bloom.css` — the indent steps down and the containment rule fades — so `bloom.js`
keeps one class and a fourth level costs nothing there either.

---

## `frozen/phase18` — and why a phase IS owed here

**528 rows at `cb798f6`**, the head of `main` when this session opened. Q4's rule (session 24,
in the charter): *a frozen tag pins ROW DEFINITIONS, not bytes*, so a phase is owed when the ROW
SET changes and not when bytes move. This session adds block 25 (528 → **549**, twenty-one rows)
and moves no byte — the phase16 and phase17 case exactly, and the mirror of session 24, which
moved eight of phase17's bytes, added no row, and correctly froze nothing.

`frozen/phase18` must be published from `main` after the merge
(`tools/publish-frozen-tags.sh`, or the `bloom-frozen-tags` workflow) — session 17's rule, and
the reason phase10 went unfetchable.

---

## What this session is blind to, stated

- **Nothing here has been printed.** The 0.50 mm waist floor, `MIN_FEATURE_MM`, the sheet
  thickness floor and the slenderness line are all assumptions. The cantilever coupon is still
  parked.
- **Both STL gates are blind to every JS7 claim** — an anther built from the wrong seven, a
  waist floor that stopped binding, a lattice that is not the outline's, and a hidden control
  that is not inert all export watertight and as one piece. That is the same blindness JS1–JS6
  were written for, and it is why JS7 exists rather than a triangle count.
- **The smoke subset does not carry the COINCIDENT or LEANING corners, or the 120-stamen cost
  corner** — those are live-matrix rows. Named in block 25's own smoke header.
- **`tools/verify-bloom-tip-bytes.mjs` is session 26's instrument and was deliberately not
  run.** Its rows predeclare that the *trifid moves*, which was true of that migration and is
  false of this one; running it here would fail its own vacuity guard for the right reason. It
  is on the untouched list.
- **The stigma still reads the hard-wired `TIP_SHAPE`.** That is session 4, and JG5 asserts it
  rather than leaving it to habit.

---

## Two real defects, found by RUNNING rather than by reading

### Defect 1 — session 21's `not the fixed proportion` clause in JS4

JS4 pinned the anther to `ANTHER_DIAMETER_FACTOR * t`: correct while the proportion was a
constant, and a **harness-invalid row on every non-default `size` or `elongation`**. Four
live-matrix rows failed it, and **every smoke row stayed green**, because block 25's first four
smoke rows all sat at the two shipping proportions.

**WHAT IT WOULD HAVE LET THROUGH — and it is not the four rows.** The export gate's own rule is
that a failing validity assertion makes the whole run untrustworthy: *"HARNESS INVALID — 4
validity assertion(s) failed. No result above is trustworthy."* So shipping this would not have
produced four red rows beside 545 good ones; it would have produced **a 549-row matrix whose
every pass was unverified**, wearing a row list that reads green line by line. That is the
charter's own "a failing validity assertion is not a known-red" trap, and the fix is not to
weaken the clause but to notice that its subject changed.

**AND WHAT THE REPLACEMENT CATCHES THAT IT COULD NOT.** JS7 rebuilds both proportions from the
SLAB and the two CONTROLS, so it fails on **a size that is not the control's** — a claim the old
clause could not make once `size` was a slider, because it compared the descriptor against a
constant the control had superseded. Strictly stronger, not merely relocated.

**Found by `node tools/verify-bloom-export.mjs --only "^ANTHER:"` in two minutes**, not by
reading the diff. A fifth smoke row (`elongation min — A SPHERE`) was added for exactly that
path, and the remaining blindness is named in block 25's own smoke header. The narrow run is
now a charter convention — see *Debugging an instrument*.

### Defect 2 — `PIXEL-IDENTICAL` was the wrong assertion, and so was the bound that replaced it

**THE WHOLE-BLOOM VIEW'S SAME-TREE CONTROL IS BIMODAL, and it took two failed sheet runs to
establish that rather than one.** The INERT row was first predeclared **pixel-identical** to the
pill; it came back 51 px on `whole` and 45 px on `lens` against controls of 50 px and 8 px on the
very rows being compared. The claim was then weakened to *within the two rows' own measured
controls* — and it failed again, at **10,491 px against a floor of 51 px**. What the second run
showed is that the floor is not a floor: the `whole` control across seven rows of one run read

> **0, 51, 50, 10,486, 0, 52, 10,635 px**

— two of eight rows' own controls in the high mode. That is an **intermittent renderer state that
catches some page sessions and not others**, and settling on byte-identical FRAMES does not remove
it. (Settling removes the orbit damping, which is a different thing; session 26 measured the same
phenomenon from the other side — 0 px at 13,440 triangles, 13 px at 80,544.)

**So the sheet asserts on `macro` alone**, whose control measured **0 px on every row of both
runs**, and reports `whole` and `lens` beside their controls with no claim attached. The INERT
row's weight is carried by **two exact, noise-free claims**: its triangle count and its whole
ANTHER read-out line — the lattice, the waist, the flags — must be the pill's character for
character. That is the charter's Sep 7 rule applied rather than a tolerance chosen to fit the
data: *report the residue beside its control and assert the property that can actually fail.*

**This extends the charter's noise-floor entry with a bigger number and a named view.** The Sep 7
ruling recorded 0 px at 13,440 triangles and 13 px at 80,544 after settling; this is ~10,500 px on
a 13,440-triangle bloom, *intermittently*, on the whole-bloom framing alone. **A pixel figure from
the `whole` view of a bloom sheet is not evidence unless its own control was taken in the same
page session and came back low.**

**WHAT A BIMODAL-CONTROL BOUND WOULD HAVE LET THROUGH, in both directions.** Draw the low mode
and the bar is ~50 px, so the assertion fires on a picture that did not change — which is what
happened, twice, and is the cheap direction because it costs a run. Draw the high mode and the
bar is ~10,500 px, so **a real 10,000-pixel geometry change on the whole view passes silently** —
and that is the expensive direction, because a sheet that reports a shape as unchanged is
exactly the evidence a ruling gets made from. The failure is not that the number was too tight
or too loose; it is that a bar set from one draw of a two-mode distribution is not a bar at all.

**WHAT THE REPLACEMENT GIVES UP, said rather than assumed away.** The bound now runs on `macro`
alone, so a difference visible only at whole-bloom framing and not at macro would pass. For a
tip that is not a reachable state — macro is a crop of the same geometry at the same camera —
but it is a real narrowing of the claim, and the two EXACT clauses (triangle count, and the
whole ANTHER read-out line character for character) are what carry the row instead of a pixel
count.

**AND IT RETRACTS EVIDENCE ALREADY ON THE RECORD.** Session 26's Q2 sheet cited *4,800 px
against a 6,868 px floor* for the trifid at whole-bloom scale. There is no floor there, so that
pair is **withdrawn** — marked RETRACTED in `docs/bloom-session-26-outcome.md` and in the
charter rather than left to be re-cited two sessions on. **Q2 itself stands**: its grounds were
the facet phase and the two-session expiry, and Eva said at the time that the pixels were
corroboration and not the argument — which is precisely why withdrawing them does not move it.
The centre and stigma framings there stand too (controls 0–25 px in every observation across two
sessions), as does the 120-stamen row's exact whole-bloom equality, which is an identity rather
than a comparison against a floor.

**And that floor is itself a finding about the anther.** A shape difference of ~10,500 px at
whole-bloom scale is at the noise, so **the anther's shape is not visible at the size it actually
ships** — which is Q8's argument for the size slider arriving as a measurement: *points are
unreachable on a 1.92 mm anther.* The sheet labels every comparison at or below ten times its own
control rather than letting a number imply otherwise.

### And a process finding that is now a charter convention

**The sheet tool took FIVE full runs to debug, and the geometry passed all sixteen rows on every
one of them.** The five failures: an assertion stated against zero where the renderer is noisy;
the same assertion restated against a bimodal control; a Playwright screenshot timeout on the
heaviest cell (120 stamens at size 6.00, macro-framed — fill rate, not triangles); a drift check
run against the wrong tree's control set; and two temporal-dead-zone slips in the page writer.
**Not one was about the bloom.** The method that worked arrived at attempt five — cut the shape
and count arrays to two cells, run that in four minutes, confirm the tail, then run the grid
once. That is now the charter's *Debugging an instrument* section, and it applies to the matrix
gates too: this session's own JS4 defect was found by `--only "^ANTHER:"` in two minutes.

The tool also now **writes its page before the optional before/after pair**, so a failure in a
nice-to-have cell at the end of a fifty-minute run no longer leaves the run with no sheet.

---

## Predeclared untouched, verified on the final tree

Named in the session's scratch manifest and re-verified by `git diff` at the close: **46 files,
0 moved.** The bloom half of the list, in full: `bloom.html`, `bloom-view-presets.js`,
`tools/bloom-crowding.mjs`, `tools/bloom-plan-coverage.mjs`,
`tools/bloom-solid-angle-coverage.mjs`, `tools/verify-bloom-export.mjs`,
`tools/verify-bloom-connectedness.mjs`, `tools/verify-bloom-tip-bytes.mjs`,
`tools/verify-bloom-presentation-only.mjs`, `tools/compare-bloom-captures.mjs`,
`tools/publish-frozen-tags.sh`, all sixteen `tools/shot-bloom-*.mjs` that existed before this
session, and all five `.github/workflows/bloom-*.yml`. The flower, `/print`, cards and tracker
files are on it too and none moved.

**Both STL gates and the connectedness gate are UNTOUCHED**, which matters for reading the
results below: the export gate that passed block 25 is the one that shipped at `cb798f6`.

**One file outside the plan WAS edited, on Eva's instruction and named here rather than left to
be noticed:** `docs/bloom-session-26-outcome.md`, to mark its whole-bloom pixel comparison
RETRACTED. It carries no code and no rows; the edit strikes numbers through and states the
grounds. A retracted number left standing in a doc is how it gets cited as evidence two sessions
on.

The four files the page actually serves were fixed before the byte captures ran and have not
moved since (`sha256`, final tree): `bloom-geometry.js`
`4d14fa4e1fcd7e94b5b7ebf4a76407ba6e9a2961d7c101a0c27119a57309c865`, `bloom.js`
`55c3b68b21e274df4329a90c02d5195102cf112806a6e890787f1eec6e72e92e`, `bloom-registry.js`
`0d35fefb85453970c7ae619eb86dcf983eaec89a5bedc851cced42087270b3df`, `bloom.css`
`c4af19209ad30b7a9a054424d14786e4ed6f496b4fb1e3440c4fab07caf60966`. Every edit after that point
was to a harness, a tool or a document, none of which the browser loads.

---

## The close

| instrument | result |
|---|---|
| `diff-bloom-bytes --compare` (phase18, both trees) | **528/528 byte-identical; 0 moved** |
| `diff-bloom-bytes --verify-frozen --phase18` | **PASS** — deep-equal to `cb798f6`'s own `buildMatrix()`, row for row |
| `bloom-smoke.mjs` (44 rows) | **44/44 watertight, identical live/export counts, 0 degenerate** (290 s) |
| `bloom-smoke.mjs --conn` | **43/43 one connected piece** *(run before the fifth smoke row was added; that row, `elongation min`, is separately green on the export gate)* |
| `verify-bloom-export.mjs --only "^ANTHER:"` | **21/21 watertight** — the whole of block 25 |
| `verify-bloom-panel.mjs` | **PASS**, including route (t) and the new witness |
| `verify-bloom-panel.mjs --negative-control` | **1,806 assertions fire**, 11 of them route (t)'s |
| `bloom-smoke.mjs --check --negative-control` | 44 rows over 21 blocks of 549; **40 families, both directions**; census negative control PASS |

**Triangle counts, live = export on every row:** the shipping default is **10,080** (504 KB);
six stamens at the pill **13,440** (656 KB); a triangle **13,680**; a 24-side star **15,120**;
three lobes **15,840**; six lobes at 90° **19,440**; the 120-stamen cost corner **110,880**
(5,414 KB); the mum with a shaped tip **152,112** (7,427 KB). **The shipping default is
unchanged**, because the androecium still ships absent.

**Two rows carry a nonManifold count and both are expected and unrated:** `COINCIDENT — 2 lobes
at a spread of 0` reads **1,800** (two tips emitted in the same place — the duplicate geometry
the flag exists to tell), and `6 lobes at 90°` reads **60**. Boundary edges are 0 on both, which
is the only pass criterion; the flag says so on the read-out.

### The sheet — `node tools/shot-bloom-anther.mjs <dir> [base-tree]`

Sixteen grid rows (eight shapes x two stamen counts), three scales each, plus the migration
pair: **49 cells, 148 frames**. Every assertion passed on the final run.

| | vs the shipping pill, at 6 stamens | at 120 on the disc |
|---|---|---|
| a SPHERE (elongation 1.00) | macro **825,696 px** | **1,983,634 px** |
| a TRIANGLE (3 points, sharpness 8) | **924,038 px** | **1,914,522 px** |
| a ROUNDED STAR (6 points, sharpness 1, roundedness 0.35) | **844,370 px** | **1,948,867 px** |
| the WAIST FLOOR binding (sharpness 0.25, CLAMPED) | **836,449 px** | **1,985,384 px** |
| a TRIFID anther (3 lobes at 40°) | **1,282,567 px** | **1,989,721 px** |
| SIZE 6.00x (Q8's row) | **2,559,132 px** | **2,559,978 px** |
| **INERT** (12 points at sharpness 0.25, roundedness 1) | **0 px** | **0 px** |

Macro-view controls were **0 px on every row**, which is why the assertion lives there. The
INERT row is the one to read twice: **0 px against the pill on all three views**, while its own
whole-view control on the same run read **10,492 px** — the clearest available statement that
the control measures the renderer and not the geometry.

**The migration pair HELD at 0 px on all three views against controls of 0 px** — the shipping
pill on `cb798f6` and on this tree are the same picture. That is the visual half of the byte
claim; the byte instrument owns the claim itself.

**Not run, and why:** `tools/verify-bloom-tip-bytes.mjs` (session 26's, whose rows predeclare a
moving trifid — false of this session, so it would fail its own vacuity guard for the right
reason) and `tools/verify-bloom-presentation-only.mjs` (session 27's, for a presentation-only
claim; this session moves code deliberately). Both are on the untouched list. The FULL 549-row
matrix on both STL gates is CI's, per the charter's retention ruling — a local full run plus the
same jobs in CI is the duplication that ruling exists to stop.
