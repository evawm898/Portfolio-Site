# The tip primitive and the migration, session 26 — `tipInto` as the one owner; the anther byte-identical, the trifid moved

Session 24 ruled the parametric tip in eight parts and sized it at four sessions. This is
session 2 of those four: **the primitive and the migration alone, zero new controls.** The
seven sliders are sessions 3 and 4. A ruled byte event gets its own commit — the session-20
shape — and this is that commit.

**What ships:** `tipInto` in `bloom-geometry.js`, the one owner of a tip's geometry, with
`pillInto` retired into it; the one-exponent outline law with its parameters hard-wired at
today's equivalents; the Rodrigues frame with no guard; the elongation floor; both consumers
migrated; `TIP_SHAPE` on both descriptors; `STAMEN_TRIS` and `STYLE_TRIS` retired into
`tippedRodTris(lumps)`; and two new assertion families, **JS6** and **JG5**.

---

## The rulings this implements (Eva, Sep 6, carried — not re-derived)

| | ruling | where it is in the code |
|---|---|---|
| **Q1** | the one-exponent outline law, `h(u) = (\|cos(nu/4)\|^s + \|sin(nu/4)\|^s)^(−1/s)`, blended by roundedness | `tipOutline()`; roundedness 1, sharpness 2, lobes 4 |
| **Q2** | **RODRIGUES, AND NO GUARD** | `tipInto()`, parameterised by the ANGLES rather than by two vectors |
| **Q5** | **FLOOR THE ELONGATION**, not an ellipsoid | `TIP_BAND_FLOOR`, `Math.max` on the cylinder band |
| **Q6** | **NO SELF-INTERSECTION INSTRUMENT** — bound the ranges instead | `TIP_SHARPNESS_RANGE`, `TIP_LOBES_RANGE`, clamped inside `tipOutline()` |

Q3 shipped in session 24. Q4 is the frozen-tag rule, applied at the close below. Q7 (the
nesting bound and one table instanced twice) and Q8 (`size` as a real slider) are sessions 3
and 4; nothing here anticipates them beyond `TIP_SHAPE` being ONE frozen object shared by both
tips, which is what makes "the two tips cannot drift" literal until there are two tables.

---

## THE PARTITION, RE-MEASURED — 17 live rows, 0 frozen

The discovery's 17 was **not inherited.** It was measured against a tree that no longer exists,
before the annulus law landed, and the live matrix has moved since. Re-derived on this tree
from the rule rather than from a memory:

> **A row moves iff it emits a TRIFID** — iff its resolved state has `gynoecium: STYLE` AND the
> gynoecium is eligible (not a SPHERE head). The anther is byte-identical, the rod is untouched,
> and nothing else in the bloom reaches `tipInto`.

Enumerated from `buildMatrix()` + `DEFAULTS` + `gynoeciumEligible()`, predeclared before any
capture ran:

| matrix | rows | name a STYLE | **predeclared movers** | hold |
|---|---|---|---|---|
| live `buildMatrix()` | 528 | 20 | **17** | 511 |
| `phase17Matrix()` (the newest baseline) | 507 | 0 | **0** | 507 |
| `phase16` / `phase15` / `phase2` | 481 / 527 / 76 | 0 | 0 | all |

**The number coming back 17 again is a coincidence worth naming rather than a confirmation:**
session 24's annulus law moved DISC radii, which cannot add or remove a style row, so the count
could not have changed — but that is an argument made *after* re-deriving it, not a reason to
have skipped the derivation.

**The other direction is inside the 511, and it is the sharper half of the claim.** Three rows name `gynoecium: STYLE` and
must NOT move — the GATED rows where the whole centre is at maximum under SPHERE, hidden AND
inert. They are in the 511. A tip primitive that leaked past the eligibility guard would move
exactly those three, and nothing else would notice.

### Which frozen tag's bytes no longer reproduce: **NONE** (Q4 / the session-24 rule)

The change is reachable only through `gynoecium: STYLE`. **No frozen matrix names a gynoecium
control** — the gynoecium landed in session 22 and `phase17` was frozen at `6335ac4`, the head
of `main` when session 22 opened — so every frozen baseline holds *by construction*, and
`--phase17` measures it. Session 24's standing note that **phase17's bytes no longer reproduce
(8 of 507 rows)** is untouched and still stands; this session adds no second such tag.

**No new frozen phase is owed:** no row was added (528 before, 528 after) and no frozen row
moved. That is the session-18/19/23/25 case, not the last several sessions'.

---

## THE ANTHER IS BYTE-IDENTICAL — proved, float-exact and -0 aware

`tools/verify-bloom-tip-bytes.mjs`, run against a `git worktree` of `2fee2c2`. **The base side
is the whole shipped module imported from that worktree, not a function re-typed into a
harness** — a copy is a second producer of the thing under test, and the registration rule says
the copy is what drifts.

| | |
|---|---|
| anther rows (7 corners × live and export) | **0 of 3,183,552 floats moved** |
| trifid rows (4 × live and export) | **41,760 of 914,112 moved**, 5,220 per row per mode |
| comparison | `Object.is` over `MeshBuilder.positions` — `+0` and `-0` are DIFFERENT |

**Why it holds, as a construction rather than a hope.** At roundedness exactly 1 the outline
blend is `1 + 0 * h`, which is exactly `1` in IEEE-754 for any finite `h`, so `r * f === r` and
the pill's radius arithmetic is untouched. And the Rodrigues rotation is parameterised by the
ANGLES, not by two vectors: at a spread of 0, `cos` is exactly 1 and `1 − cos` is exactly 0, so
the coefficient of the rod's `T` is exactly 1 and the other two are zero. Deriving the rotation
from `D × L` instead would normalise a zero vector at the identity and put `D · L` — which is 1
only to rounding — on `T`'s coefficient. That is the version that needs a guard; this is the
version that does not.

### The -0 hazard is real, and it is measured on both halves

No arrangement of `x + 0` preserves a negative zero, and the no-guard formula adds two zero
terms. So:

- **The frame DOES flip.** The anther at azimuth 0 had ring vector `[-0, 1, 0]` and now has
  `[+0, 1, 0]`. At a filament curl of exactly 180 the tip AXIS flips a zero the same way — a
  difference of exactly 0, which is why JS6 compares the axis by VALUE and says so in its own
  comment rather than asserting something the ruled formula cannot do.
- **It reaches no emitted position.** `-0 among the compared floats: 0` on every row, both
  trees. The rig prints both halves; neither is a sentence.

*(That second measurement is what turned a too-strict first draft of JS6 red on two smoke rows.
The clause was wrong, not the code — it asserted bit-identity of a direction where the ruling
only needs the direction.)*

---

## HOW FAR THE TRIFID MOVED — 0.047 mm of surface, 1.855 mm of vertex

The old lobe frame was `D × P`, which **is the rotation axis** and is therefore left fixed by
the rotation; the new one is `Rot(T)`. The two differ by a turn about the lobe's own axis of
`acos(−sin ψ)` — **90°, 150° and 30°** on the trifid's three lobes. So the solid is the same
solid rotated on its own axis.

Two numbers, and they are not the same claim:

| | measured on this tree, EXPORT mode |
|---|---|
| triangles that moved | **600** (3 lobes × 200) |
| floats that moved | **5,220 of 5,400** — the 180 that held are the pole vertices, which lie on the axis of the rotation |
| max **VERTEX** displacement | **1.8546 mm** |
| max **SURFACE** deviation (each new point to the nearest point of the old solid) | **0.0470 mm** |

The closed form for a regular *n*-gon rotated on its own axis is the sagitta at the widest ring,
`a(1 − cos(π/n))` = 0.96 × 0.048943 = **0.046986 mm** at the shipping 1.20 mm sheet. The
measured 0.0470 agrees; the closed form was a prediction the run could have contradicted. **The
deviation is proportional to the tip radius, so it scales with the sheet** — 0.094 mm at
`sheetThickness` 2.40, which is the sheet's worst-case row.

---

## `STAMEN_TRIS` and `STYLE_TRIS` ARE NOW `tippedRodTris(lumps)`

Two constants became one function of the lump count. `tippedRodTris(1)` = **560** and
`tippedRodTris(3)` = **960**, which are exactly the retired constants' values, so the census
itself did not change — what changed is that the number is now derived from a count the OWNER
declares rather than written down once. Session 4 makes the stigma's lobe count a control; a
constant would be a number that quietly stops being true with nothing failing.

- **JS4** calls it with **1** — an anther is one tip, A1, fixed — and pins the emitted lump list
  at 1 beside it, because the count and the triangles are two claims and a tip that vanished
  from both at once would satisfy either alone.
- **JG4** calls it with **`G.lobe.count`**, the count this owner declares, and pins the emitted
  lobe list against the same number.

This is a real change to two assertions, so it has its own mutants (M4, M5, M6 below) rather
than a note.

---

## THE TWO NEW ASSERTION FAMILIES — JS6 and JG5

Both STL gates are blind to everything here, and that was measured, not assumed: **a tip rolled
on its own axis exports watertight, one piece, at an identical triangle count and an identical
STL byte length.** Nothing in this project looks at a ring vector. So the gate rebuilds the law
from OTHER owners and compares it against what was emitted — C1's discipline.

`tipClauses()` is shared by both families so the anther and a stigma lobe are held to ONE
statement:

1. the ring vector is **unit** — a property, not a restatement;
2. the ring vector is **perpendicular to the tip's own axis** — likewise;
3. the ring vector is the **Rodrigues image** of the rod frame, rebuilt from the emitted rod
   direction, the slot's azimuth, and the owner's spread and psi;
4. the outline factors are the law applied to **the shape the owner declares**;
5. and that shape is the **hard-wired circle**, whose factors are **exactly 1**.

Clauses 4 and 5 are two directions, and clause 5 is the one that does the work this session:
4 compares the shipped function against itself and is vacuous under a mutation of the law, while
5 is how "session 26 ships zero tip controls" becomes a measurement.

**What JS6/JG5 cannot see, in the harness's own header rather than here:** clause 3 restates
the formula, so a law wrong in the same way in both places passes. Clauses 1 and 2 hold for no
restatement reason and are the guard against that.

---

## THE MUTANT TABLE — six positive controls

Each mutation is applied to a copy of this tree and driven through the REAL export gate on three
centre rows (`STAMENS: 6 on a RING`, `GYNOECIUM: a style on the bare apex`, `GYNOECIUM: style x 6
stamens on a RING`). **Every one of the six still prints `configs watertight (boundary = 0)`** —
the blind-spot claim is measured, not asserted.

| | mutation | caught by | the message |
|---|---|---|---|
| **M1** | the tip frame is the rod's `T` unconditionally — the rotation is never applied | **JG5** | *a ring vector that is not perpendicular to its own axis*, and separately *the minimal rotation … is …* |
| **M2a** | `tipOutline` returns the raw law unblended — geometrically **1.1e-16** of a radius, but not EXACTLY 1 | **JS6, JG5** | *scaled side 9 by 0.9999999999999999 — with no tip control shipped the outline must be EXACTLY 1* |
| **M2b** | the tip ships as a star (roundedness forced to 0) — the loud version of M2a | **JS6, JG5** | same clause |
| **M3** | `Math.min` for `Math.max` — the elongation floor becomes a ceiling | **JS4, JG4** | *apex is not one radius past the floored band (3.84 mm) along its axis* |
| **M4** | `tippedRodTris` ignores its argument — the pre-session-26 constant, restored | **JG4** | *the style emitted 960 triangles, a rod tipped with the 3 lumps this owner declares is 560* |
| **M5** | the trifid emits two lobes and still declares three | **JG4** | *emitted 760 triangles … is 960*, and *2 lobes emitted, the trifid is 3* |
| **M6** | the anther emits a second tip on the same seat | **JS4** | *stamen 0 emitted 760 triangles, a rod tipped with one lump is 560* |

**Three things the table says that a pass would not.**

- **M1 fires JG5 and NOT JS6, and that is correct rather than a miss.** The anther's frame is
  the identity under both the shipped law and this mutation, so there is nothing on the stamen
  side to see. M1 is a lobe mutation by nature — which is the same fact as the anther being
  byte-identical, arriving from the other direction.
- **M2a is the mutant that matters, and only ONE clause catches it.** The unblended law differs
  from 1 by 1.1e-16 — about 1e-16 mm on a 0.96 mm tip, invisible to any geometric tolerance and
  to both STL gates — while moving bytes. The clause that compares the emitted factors against
  `tipOutline(shape)` is VACUOUS here, because it compares the mutated function against itself;
  `Object.is(f, 1)` is the sole witness. That is why the outline check is two-sided.
- **M3 originally fired JG4 ALONE, and that was a real hole.** The elongation floor had no
  witness on the anther at all, because JS4 had no apex-reach clause — exactly the half session
  3 turns into a control. The clause was added and M3 re-run: it now fires **JS4 and JG4**. Found
  by running the mutant, not by reading the code.

**M4 does not fire JS4, correctly:** a stamen has one lump, and the constant version equals the
function at 1. The census-as-a-function change is only observable where the count is not 1,
which is the trifid — and session 4's stigma control.

*(Caveat carried from the charter: a gate run names the FIRST family to fire on a row, and these
are the families that appear in each run's output. Establishing that a specific clause is the
SOLE witness needs the families ahead of it suppressed; the M2a claim above is made on the
clause structure — one comparison is provably vacuous under that mutation — rather than on the
run order.)*

---

## Predeclared untouched, verified on the final tree

Named BEFORE a line was edited, in the session's scratch manifest, and re-verified by
`git hash-object` on the final tree — **11 of 12 held, with ONE deliberate exception reported
rather than quietly taken**:

`bloom.js` · `bloom.html` · `bloom-registry.js` · `tools/verify-bloom-export.mjs` ·
`tools/verify-bloom-connectedness.mjs` · `tools/verify-bloom-panel.mjs` ·
`tools/diff-bloom-bytes.mjs` · `tools/bloom-crowding.mjs` ·
`tools/bloom-plan-coverage.mjs` · `tools/bloom-solid-angle-coverage.mjs` ·
`tools/compare-bloom-captures.mjs`

**THE EXCEPTION IS `tools/bloom-smoke.mjs`, and it is comments only** — 11 insertions,
6 deletions, no row added, no code line changed, the block guard untouched. Blocks 23 and 24
declared *the families that need a witness are JS1-JS5 / JG1-JG4*, and after this session that
sentence is short by one on each side. It was predeclared untouched because no matrix BLOCK is
added, which is still true; but a stale family list in a gate's own header is this codebase's
most repeated defect in the worst possible place, and the smoke tool's own hole 5 is precisely
*a new assertion family with no smoke row, which the drift guard cannot see*. Correcting the
sentence beats leaving it — and reporting the exception beats correcting it silently.
**`bloom-registry.js`, `bloom.html` and `bloom.js` holding is the whole "zero new controls"
claim, as a construction rather than a sentence.** No registry row, no markup, no read-out
line. The new tip records reach the harness because `bloom.js` already SPREADS the stamen and
lobe records into `__bloomMetrics()` — a field added in the geometry arrives without the app
being told about it, which is why this session could add JS6 and JG5 without touching the app.

**No matrix block was added,** so the smoke guard's block coverage is untouched and blocks 23
and 24 already carry the rows this change lives on. What the guard CANNOT see is a new
assertion FAMILY with no smoke row — its own header says so — which is why the mutant table
above was re-run rather than assumed, and why the two block comments now name JS6 and JG5.

**Movers:** `bloom-geometry.js`, `tools/bloom-harness.mjs`, `tools/bloom-smoke.mjs`
(comments), `CLAUDE.md`,
`docs/bloom-charter.md`, and three new files (`docs/bloom-session-26-outcome.md`,
`tools/verify-bloom-tip-bytes.mjs`, `tools/shot-bloom-tip.mjs`).

---

## The close

**Verified on the FINAL tree** — this commit's, with `bloom-geometry.js` frozen before the runs below:

| | |
|---|---|
| `node tools/bloom-smoke.mjs --conn` | **39/39 watertight**, **39/39 one connected piece** — the subset, not the matrix; `--conn` was run because the tip is a new primitive and the smoke header requires it while a new mode's assertions are still being established |
| `node tools/verify-bloom-panel.mjs` | **PASS** — no control changed, and the retired-id scanner (session 25's character walk) reads the new source clean |
| `node tools/diff-bloom-bytes.mjs --verify-frozen --phase17 --base <6335ac4>` | **PASS** — 507 rows deep-equal to the base commit's own `buildMatrix()` |
| `node tools/verify-bloom-tip-bytes.mjs --base <2fee2c2>` | **PASS** — 0 anther floats moved, every trifid row moved |
| the mutant table | **6 of 6 fired**, every one still watertight |

**THE MERGE CRITERION IS UNCHANGED and is not any of the above:** the full 528-row matrix on
BOTH STL gates, in CI, on the merge commit. Note that a bloom PR runs **six** verify jobs and
only **four** of them are bloom evidence — `flower-export-watertight` and
`flower-geometry-quality` are path-filtered on `'tools/**'`, so adding a tool here makes them
run, and they still test flower geometry.

**Still measuring at the time of this commit, and it is the reason there will be a second one:**
the four byte captures (`--full` and `--phase17`, each tree) that close the partition by
measurement rather than by the enumeration above. The numbers go in the table at the top of
this section when they land. CI does no byte diffs, so this is the one close-out step that
genuinely needs a local run.

### What the sheet measured about ITSELF, and why it reports rather than asserts

The first sheet run asserted the anther pairs PIXEL-IDENTICAL and turned red at
10,028 / 27,156 / 27,262 px. **The same-tree renderer control is what said that was not a
finding:** shooting the base tree twice at the same camera differed by 4,925–7,426 px, spread
over the whole frame. The cause is the flower project's own recorded lesson arriving again —
the camera flight and the orbit damping are still easing at the ~2 fps software GL gives
headless, so a fixed 260 ms wait samples an arbitrary point on the way in. `shoot()` now waits
until **two consecutive screenshots are byte-identical**, and the anther row came back **0 px,
worst channel step 0, on all three views.**

**That did not make pixel-identity assertable, and the control is again what said so.** On the
120-stamen row — 80,544 triangles, and a state the byte rig proves identical to 724,896 floats
— the settled pair still differs by **13 px of 2,560,000**, at channel steps of 1 (eleven of
them), 4 and 17, scattered across a bounding box spanning nearly the whole frame. That is edge
rasterisation on a dense scene, and **no threshold that passed it would be a measurement** — it
would be a bar tuned to this data.

So the division of labour is the project's own: **the gate asserts the property that can
actually fail and the sheet shows the picture.** Every row is now shot twice on the base tree,
the two differences are printed side by side, and the only pixel ASSERTION left is the vacuity
guard — a trifid row must move by at least ten times its own control, which is never a tuned
bar because the control measures tens of pixels and a real move measures tens of thousands.
*Is the anther unchanged* is settled float-exactly in the byte rig, where it belongs.

**STOP AT THE SHEET.** This change is visual — 0.047 mm of surface on a part that ships absent
by default — so **merge waits on Eva's ruling on `tools/shot-bloom-tip.mjs`**, not on green CI.
The sheet is what the ruling is made from, and the ruling being asked for is narrow: *is the
trifid's move visible at the size the bloom ships?* If it is, ruling Q2 (Rodrigues, and no
guard) should be revisited before sessions 3 and 4 build seven sliders on top of it.
