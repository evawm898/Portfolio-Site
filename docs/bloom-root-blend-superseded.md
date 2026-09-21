# The root blend at `layerCount >= 3` — measured, and it is not there

**Status: DIAGNOSED, NOT FIXED, BECAUSE THERE IS NOTHING LEFT TO FIX.** This session was
opened to fix the defect `docs/bloom-session-36-outcome.md` §5 scheduled: *the root blend
self-intersects at `layerCount >= 3`, at the defaults; 0 pairs at 1–2 layers, 72 at 3, 416
at 4; 138 xfail rows carry it; a multi-layer bloom is unprintable before any deformation
control is touched.*

**Every one of those numbers reproduces on the tree they were measured against, and every
one of them reads 0 on `main` today.** The defect was diagnosed and fixed by the
foot-to-blade seam session (PR #210, `a24ed69`, Sep) — under a different name, from a
different mechanism, six merges ago. `docs/bloom-foot-to-blade-seam-outcome.md` §1 says so
in its own first paragraph, and the shipped `SELF_INTERSECTION_XFAIL` header says so too.

**What had not happened is the record being corrected where a session actually reads it.**
`CLAUDE.md` carries the session-35/36 claim in the PRESENT TENSE at two places near the top
of its bloom pointer, and carries the session-38 supersession 3,200 lines further down — so
the file contradicts itself and a reader meets the false half first. That is the
registration rule pointed at documentation, and it has now cost a whole session: this one's
brief was written from it.

> **The rule this is an instance of** — the flower-project skill, verbatim: *a defect report
> is a claim with an expiry date … Re-verify the defect before re-asserting it, and never
> let a quarantine outlive a check of its own premise.* The BILATERAL bloom was quarantined
> for months on a claim nobody re-rendered. This is the same shape, in the bloom, on a claim
> nobody re-censused.

---

## 1. The instrument, calibrated before it was believed

Everything below is the SHIPPED census (`tools/bloom-self-intersection.mjs`, `census()`)
run in Node on the builder's own doubles — the same path `tools/bloom-xfail-magnitudes.mjs`
and the export gate's X family take.

**MODE: EXPORT. SAMPLING: `NU` 56 × `NV` 10 per panel, the builder's own doubles**, which is
the mode and sampling every figure in session 36 §5 was taken at, so the two are comparable.

It reproduces today's declared list to the pair before it is used on anything:

| state | declared in `SELF_INTERSECTION_XFAIL` | this probe reads |
|---|---|---|
| `petalSpineCurl` 360 | 1008 / 0.5233 mm | **1008 / 0.5233 mm** |
| `petalCup` 1.2 | 752 / 0.1268 mm | **752 / 0.1268 mm** |
| `petalCupGradient` 1.2 | 720 / 0.1179 mm | **720 / 0.1179 mm** |
| the shipping default, flat | (undeclared) | **0** |

A census that reads 0 on a state it cannot see a fold in is worth nothing. This one sees
every fold the list declares, at the recorded magnitude.

## 2. ONE CENSUS, TWO GEOMETRIES — the decisive measurement

The instrument is held fixed (this tree's `census()`) and the GEOMETRY is swapped: a
`git worktree` at **`1740a2e`** — `main`'s head immediately before the seam fix
`a24ed69`, i.e. the exact tree that fix was applied to — against `main` today.

Column one is session 36 §5's own published figure, and column two is what this session
measures on the tree it was published against.

| state | §5's figure | **pre-fix `1740a2e`** | **today** | triangles |
|---|---|---|---|---|
| `petalCount` 8 × `layerCount` 1 | 0 | 0 | 0 | 19,040 |
| `petalCount` 40 × `layerCount` 1 | 0 | 0 | 0 | 94,432 |
| `petalCount` 8 × `layerCount` 2 | 0 | 0 | 0 | 37,888 |
| `petalCount` 8 × `layerCount` 3 | 72 | **72** / 0.1648 mm | **0** | 56,736 |
| `petalCount` 3 × `layerCount` 4 | 162 | **162** / 0.2359 mm | **0** | 28,464 |
| `petalCount` 7 × `layerCount` 4 | 364 | **364** / 0.2359 mm | **0** | 66,160 |
| `petalCount` 8 × `layerCount` 4 | 416 | **416** / 0.2359 mm | **0** | 75,584 |
| `petalCount` 12 × `layerCount` 4 | 624 | **624** / 0.2359 mm | **0** | 113,280 |
| 7×4 × `layerSize` 0.90 | 49 | **49** / 0.1442 mm | **0** | 66,160 |
| 7×4 × `petalTilt` 0 | 63 | **63** / 0.1440 mm | **0** | 66,160 |
| 7×4 × `footDelicacy` 0.25 | 595 | **595** / 0.2602 mm | **0** | 66,160 |
| 1 layer × tilt 75 × length 20 × sheet 2.4 | 376 (session 38's) | **376** / 0.5875 mm | **0** | 19,040 |

**Twelve published figures, twelve exact reproductions on the pre-fix tree, twelve zeros
today — at an identical triangle count on every row.** The triangle count holding is what
says the fold went away rather than the mesh changing underneath the question: the seam fix
moves blade STATIONS on a lattice whose size is fixed at `NU`.

### 2b. And the attribution is ONE COMMIT, measured here rather than inherited

§2 shows the figures going to zero somewhere between `1740a2e` and `main` — which is six
merges wide. Narrowed by adding a third worktree at the fix itself, same census, three
geometries:

| state | parent `1740a2e` | **the fix `a24ed69`** | `main` today |
|---|---|---|---|
| 8 × 3 layers | 72 / 0.1648 mm | **0** | 0 |
| 7 × 4 layers | 364 / 0.2359 mm | **0** | 0 |
| 8 × 4 layers | 416 / 0.2359 mm | **0** | 0 |
| 12 × 4 layers | 624 / 0.2359 mm | **0** | 0 |
| 7×4 × `footDelicacy` 0.25 | 595 / 0.2602 mm | **0** | 0 |
| 1 layer × tilt 75 × len 20 × sheet 2.4 | 376 / 0.5875 mm | **0** | 0 |

**`a24ed69` — "Bloom: the foot-to-blade seam clearance, derived" (#210) — is the single
commit that did it**, and it has stayed at zero through every merge since. That is session
38's own claim, re-established by a session that did not make it.

This is a closed loop broken open deliberately. The 87-rows-fixed partition in
`docs/bloom-foot-to-blade-seam-outcome.md` was that session's own sweep of its own defect
with its own instrument. The table above is a different session reproducing *somebody
else's* published numbers, on a tree neither session chose, and then watching them go to
zero.

## 3. The depth axis, swept on `main` today

Every reading 0 pairs, EXPORT mode:

* **`layerCount` 1 / 2 / 3 / 4 / 5 / 6 at the shipping defaults** — 0 on every one, from
  19,040 to 113,280 triangles.
* **`layerSize` 0.35 / 0.50 / 0.62 / 0.72 / 0.80 / 0.90 at 4 layers** — 0 on every one.
  §5 named `layerSize` 0.90 as the control that took 364 down to 49; the whole slider is
  now clean.
* **`footDelicacy` 0.25 / 0.50 / 0.75 / 1.00 at 4 layers** — 0 on every one. §5 called
  0.25 *"a shipped control makes it dramatically worse, which is why it belongs in this
  brief"* at 595 pairs. It is 0.
* **`petalCount` 3 / 7 / 8 / 12 / 20 / 40 at 6 layers** — 0 on every one, including the
  565,632-triangle corner.

## 4. The onset on the depth axis is the EFFECTIVE TILT, and it is not at three layers

There IS still a state on this axis that folds, and it is a different, already-declared
class. At 4 layers the deepest ring's effective tilt is `petalTilt + 3 × layerTilt`; the
shipping `petalTilt` is 25:

| `layerTilt` | effective tilt at the deepest ring | within-shell pairs | worst span |
|---|---|---|---|
| 0 / 10 / 18 / 20 | 25° / 55° / 79° / 85° | **0** | — |
| 21 / 21.5 | 88° / 89.5° | **0** | — |
| 22 / 23 / 24 | 91° / 94° / 97° | **0** | — |
| 26 | 103° | 336 | 0.1671 mm |
| 28 | 109° | 336 | 0.2858 mm |
| 30 (the slider's maximum) | 115° | 384 | 0.4027 mm |

Across the seam fix, on the same two trees as §2: `layerTilt` **20 went 656 → 0**, and
`layerTilt` **30 went 808 → 384** — improved, not fixed, which is exactly what
`SELF_INTERSECTION_XFAIL`'s **EFFECTIVE TILT PAST 90** class says about itself: *the
blade's own mid-surface lies back over its foot and no station spacing can clear it.*

**Stated precisely rather than rounded to the class name:** 90° is where the clearance
ALGEBRA reverses (`docs/bloom-bell-corolla-discovery.md` §4 — past a right angle the
admissible spacing becomes a WINDOW, `|cos θ| ≤ ½`, empty beyond 120°), and the measured
onset on THIS axis at this tessellation is between **97° and 103°**. The geometry takes a
few degrees past the right angle to actually produce a crossing. The class is correctly
named and the boundary is sharp; it is not at exactly 90.

**So the shipping defaults are not near this edge.** `layerTilt` ships at 12: effective 61°
at four layers and 85° at six, and every one of those states reads 0.

## 5. The 138 rows, accounted for

Session 36's list is read at **`1a3dfe1`** (session 37's merge — the list exactly as
session 36 shipped it, before the seam work began). **318 entries, of which exactly 138
carry the literal tag `— the root blend`.** The brief's figure reproduces.

Today's list is 298 entries. Of the 138:

| | rows |
|---|---|
| **gone from the list entirely** (they read 0, and X1 requires the entry to come off) | **73** |
| still declared | 65 |

And of the 65 that are still declared, **not one carries a root-blend attribution any
more.** Classified by the note each entry carries today:

| current attribution | rows |
|---|---|
| `EFFECTIVE TILT PAST 90` (95.5° … 225° at the deepest ring) | 27 |
| re-recorded by the magnitude gate (#246) — WORSE / IMPROVED / MOVED BOTH WAYS | 19 |
| no note — a different by-design overlap or a GATED inertness row (see below) | 14 |
| `RE-RECORDED by the TILT RANGE opening to 0..120` (#261) | 3 |
| `SEAM CLAMPED — the blade is SHORTER than the fold it has to clear` | 2 |

The 14 note-less survivors are named rather than waved at, because "no note" is not an
answer: four read **exactly 272** (`GYNOECIUM: style × 3 layers`, `× CONTINUOUS × 3 turns
× 120 DISC`, `× the mum`, `STIGMA: a shaped stigma × the mum`) — the STYLE's own rod
passing through the hub slab, which session 36's own doc already documented as *"34 rows
read exactly 272 pairs, and they are every row with a STYLE"*; two are the buckle's own
apex fold (`BUCKLE: × 3 whorls`, `× CONTINUOUS × 3 turns`, 16 and 19 pairs); three are
GATED inertness rows at 5–6 pairs; and the rest are the incurve DOME/SPHERE form rows and
`FAN × PER-PETAL`. Every one of them had a layer count in its LABEL and a cause somewhere
else — which is what made "138 rows at three layers or more" a classification by label
rather than by mechanism in the first place.

**So: 0 of the 138 are the root blend. 73 came off because they read zero; 65 stayed
because they fold for a different, named reason.**

## 6. What still asserts the defect, and what this session did about each

| where | what it says | status |
|---|---|---|
| `CLAUDE.md`, two blocks near the top of the bloom pointer | *"THE ROOT BLEND IS NOT FIXED"*, *"AND THE ROOT BLEND SELF-INTERSECTS AT `layerCount >= 3`, AT THE DEFAULTS"*, *"a multi-layer bloom is unprintable before any deformation control is touched"*, *"Do not judge a deformation feature's printability on a multi-layer build until this is fixed"* | **corrected by this PR** |
| `bloom.js:1006`, `rootBlendLine()` | the shipped read-out tells a visitor at 3+ layers that *"the inner layers' short petals fold through themselves at the root (a measured self-intersection at the defaults, session 35)"* | **NOT touched — Eva's ruling, see below** |
| `tools/verify-bloom-panel.mjs`, route (v) | asserts that sentence APPEARS, on a row labelled *"3 layers (the first depth that folds)"* | **NOT touched — same ruling** |

**Why the read-out was left alone.** Its leading clause is now false and its trailing clause
is still true (*"a bloom of ONE OR TWO layers exports free of self-intersection at any petal
count at the default form; what still folds a single petal is its own form … not the
depth"* — measured, still exactly right). But the line exists BY A RULING: session 36 put it
where the layer count is set and built route (v) to assert it in both directions.
**Retiring a ruled read-out line is a ruling, not a cleanup**, and it is the one change here
that touches a gated path (`bloom.js`), so it costs a full matrix cycle. It is costed in
§7 and it is Eva's.

## 7. The cost of the change this session did NOT make

Correcting the read-out is **one function in `bloom.js` and one route's three rows in
`tools/verify-bloom-panel.mjs`** — no geometry, no registry row, no matrix row, and zero
bytes of export (the read-out is built beside the export path, never inside it: the Get STL
handler builds from `readUI()` and never reads a read-out string). So:

* **byte partition: 0 moved, by construction**, and provable in one `verify-bloom-surface-bytes`
  run;
* **no frozen phase owed** — no row added, removed or redefined; `frozen/phase35` stays the
  newest baseline and no tag's bytes stop reproducing;
* **the gate cost is the whole cost**: `bloom.js` is in both long gates' path filters, so it
  buys a full `bloom-export-watertight` + `bloom-connectedness` cycle. Read
  `actions_list` at the time for the current spread — the export gate has widened seven
  times and the most recent run recorded in the brief took 254.4 min.

Three options, none taken:

1. **Delete `rootBlendLine()` and route (v)'s rows.** The line's true half goes with it.
2. **Rewrite the line** to keep the true half and drop the false one — *"a bloom of one or
   two layers …"* is a statement about FORM, not depth, so it arguably belongs somewhere
   that is not keyed on `layers >= 3` at all.
3. **Re-point the line at the class that IS still there** — an EFFECTIVE TILT line, shown
   when `petalTilt + (L−1)·layerTilt` passes the right angle, which is the real boundary
   §4 measures and which no read-out currently names.

Option 3 is the one that would leave the panel telling the truth about the thing that
actually folds, and it is the largest of the three.

## 8. What was NOT done, said plainly

* **No geometry changed.** `bloom-geometry.js`, `bloom-registry.js`, `bloom.js`,
  `bloom.html` and `bloom.css` are untouched by this PR — predeclared before a line was
  written and verified by `git diff --name-only` at close.
* **No gate changed**, so no assertion was weakened to accommodate anything.
* **No xfail entry moved.** The 65 surviving entries are measuring what they record; the 73
  that came off came off in the seam session's own commit, as X1 requires.
* **The full matrix was not re-censused here, deliberately** — the charter's *do not run
  the full matrix locally AND in CI*. §3 and §4 are targeted sweeps of the depth axis. The
  matrix-level claim already exists and is CI's: **`bloom-export-watertight` run
  [35484824539](https://github.com/evawm898/Portfolio-Site/actions/runs/35484824539) on
  `main` at `8a9476b`, conclusion `success`, 254.3 min** — and X1/X2 run on every row of
  that matrix, X2 failing any UNDECLARED row that self-intersects and X1 failing any
  DECLARED row that reads zero. A green run there is exactly the statement *"every row of
  the 860 is either clean or declared, and every declaration still measures its record."*
  There is nothing a local re-census of the 206 depth rows could add to that.

## 9. The one-line answer to the question behind the brief

**Is a multi-layer bloom unprintable before any deformation control is touched?**
No — not since `a24ed69`. `layerCount` 1 through 6 at the shipping defaults reads **0
within-shell pairs** at every depth, and so does every value of `layerSize`,
`footDelicacy` and `petalCount` crossed with it. What still folds on that axis is the
**effective tilt past a right angle**, which is a declared class with its own name, its
own derivation (`|cos θ| ≤ ½`, empty past 120°) and its own 27 entries — and the shipping
`layerTilt` of 12 puts six whorls at 85°, under it.

The standing caveat is unchanged and is not this defect's: **nothing in this project has
ever been printed**, so "clean" here means the census reads zero, not that a machine has
made one.
