# Bloom infill — the solid base panel, and the boundary that sets it (Sep 18 2026)

**No repository geometry, registry or gate was touched.** Three files under `tools/`:
`bloom-voronoi-proto.mjs` gained an optional plan capture (gated OFF — inert at its default,
measured, §1); `bloom-infill-base-panel.mjs` and `shot-bloom-base-panel.mjs` are new. The
salvage's field is used **as it stands** everywhere else: its anisotropic metric, its seeding
law, its four density-weighted Lloyd passes, its 0.8 mm fillet, its tip grading and its wall
law are untouched.

The sheet is published as a private artifact:
**https://claude.ai/artifact/1KoMvwxAZ8NpvADZXHnddr**

Adding files under `tools/` makes the two FLOWER gates run on the PR (their `tools/**` filter);
no bloom gate keys on these files. They test flower geometry and are not evidence about this.

---

## 0. The answers, before the tables

**THE OBJECT EVA HAS BEEN OBJECTING TO IS THE SOLID BASE PANEL, AND IT IS A FUNCTION OF THE
BOUNDARY ALONE.** The blade's plan area is **406.8 mm²**; the panel — everything below the
boundary — is **111.87 mm², 27.50 % of it**. No grading moves a square millimetre of it, which
is why two sessions of field grading could not answer the complaint. `docs/bloom-infill-basal-grading.md`
said so in one line at the end of its §5; that line is the finding, and this session acts on it.

**1. THE CONSTRAINT THAT PINNED THE BOUNDARY DOES NOT BIND ON AN INFILLED STATE, AND #250's OWN
READING WAS ALSO ONE LATTICE ROW OFF.** Two separate results, and they point the same way.

  * On the **plain** petal, re-running #250's own truncation at EVERY lattice station rather
    than in two-row steps: **row 18, u = 0.2857143, reproduces both roll-330 readings EXACTLY**
    (wall 0.6974, self 0.6586). #250 tested row 19 and then row 16 and reported that "the next
    boundary down moves SELF by +0.0354 mm" — true of the boundary it tested, and false of the
    next boundary down, which it did not run. **The panel goes 27.50 % → 25.49 % for nothing.**
  * On an **infilled** state — the measurement #250 could not make, and said so — the reading is
    the plain petal's at every boundary swept. Over **120 (state × wall × boundary) rows,
    0 read closer than the plain petal.** §3c.

**2. THE `HELD_ROWS` / `A7` COLLISION IS REAL AND IT HAS BOTH SIGNS.** `HELD_ROWS =
floor(ROOT_BLEND_END * NU) = floor(16.8) = 16` is a COUNT derived from a STATION, and it stopped
describing that station the day the block could start anywhere but row 1. At `seamStep` 1 the
infill's panel top (u 0.3007143) sits **one row ABOVE** the last held station (0.2857143); at
`seamStep` 4 it sits **two rows BELOW** it. Options for Eva in §4; nothing is resolved in code.

**3. WHAT THE TWO LEVERS DO TOGETHER.** Moving the boundary alone takes the panel from 27.50 %
of the blade to 25.49 % at the lowest station #250's own constraint permits and to **8.83 %** at
the lowest station swept; with the field's basal V halved and its base cells enlarged at the
same time, **the blade's bottom 45 % goes from 84.0 % solid to 72.7 % and 54.3 %** at a 1.0 mm
wall. §5.

**4. AND THE STRUCTURAL NOTE, SAID ONCE AND NOT SOLVED.** The base is where a cantilevered
petal's bending moment is highest, so removing material there is structurally the worst place
for it. Nothing in this project has ever been printed, so that is a statement about beams and
not a measurement of this object. It is recorded, it is not what any answer above rests on, and
it is not addressed anywhere below.

---

## 1. What moved, and the proof it is inert

`tools/bloom-voronoi-proto.mjs`: `cutThrough(ctx, F, wall, opts = {})` returns `canon` — the
plan-keyed map every emitted cell vertex came through — when `opts.capturePlan` is set, and each
entry now carries the plan `(x, y)` it was mapped FROM beside the two skin points it was mapped
TO. The map is built either way (it IS the canonicaliser), so capturing it moves no float and
costs one property. Nothing else in that file changed.

**INERT AT THE DEFAULT: 0 of 394,848 floats differ** over 16 states (8 seeds × 2 walls), head
against a `git worktree` of `a11219b`, compared with `Object.is`. **The control:** the same field
cut with `capturePlan` on and off differs in **0 of 23,076 floats** while `canon` comes back
only when asked (429 entries against absent) — the option is REACHED and moves nothing.
Re-runnable: `node tools/bloom-infill-base-panel.mjs --inert <base-tree>`. Last session's own
control still passes unchanged on this tree
(`node tools/bloom-basal-grading.mjs --inert <base-tree>`, 0 of 394,848).

### 1b. `main` moved under this session, and every figure was re-measured rather than trusted

Every number below was taken against **`a11219b`**, which was `main`'s head when this session
started. The sepals merge (**`eb2aaa7`**, #243) landed on `main` while the sweeps were running and
moved `bloom-geometry.js` by 862 lines, `bloom-registry.js` by 169 and `tools/bloom-harness.mjs` by
1,390. It touches **none of this branch's six paths**, so the merge is textually clean — but a
clean merge is not evidence about a measurement, and this project's own rule is that a partition
cannot be carried across a base it was not measured against.

So the whole instrument was re-run on the merged tree and diffed against the recorded `a11219b`
run, value by value: **0 divergences over 6,363 leaf values (5,978 of them numeric), under
`Object.is`** — the 19 truncation rows, the 120 masked-lattice rows, the 96 grid cells, the pair
locations, the per-station panel shares and the V1 residuals, all identical. All four controls
fire on the merged tree as well (C1 moves, C2 removes 112 of 560, C3 reproduces #250's seven
rows, C4 matches on three boundaries). The sepals work moved nothing this doc rests on, which is
what its own byte partition (72 movers / 780 holders) predicted and is now measured from this
side.

**EIGHT SEEDS, ALWAYS** — `SEED + i*131`, which is exactly the set `wholeBloom` gives the eight
petals of the shipping whorl, so the sweep's population IS the bloom's. Every figure below is
the MEDIAN over those eight unless it says otherwise; the sheet's petal pictures are ONE seed
and say so in their own captions.

**THE MUST-FAIL IS `node tools/bloom-infill-base-panel.mjs --control`, four claims, all seen to
behave:**

| | what is broken | must |
|---|---|---|
| C1 | the rule's neighbourhood widened from 2 cells to 6 | the identity in §3c MOVE (0.658649 → 0.694096) |
| C2 | — | the infill's mask actually REMOVE lattice samples (112 of 560) |
| C3 | — | #250's published truncation table reproduce, **all seven rows** |
| C4 | — | masking everything above the panel give TRUNCATION's own point and triangle sets, on three boundaries |

C3 is the anchor with a different owner: the seven figures it reproduces are the published
doc's, not this tool's.

---

## 2. The panel's share of the blade, per boundary

A function of the BOUNDARY ALONE. `target` snaps to a ROW, because the split is a row index and
a target between two stations has to land on one of them; `panel to u` is the last row the base
lattice emits and `cells from u` is where the field starts, one row of overlap below it.

| row | panel to u | cells from u | panel mm² | **% of blade** | lamina mm² |
|---|---|---|---|---|---|
| 22 | 0.346875 | 0.331250 | 137.51 | 33.80 | 278.06 |
| 21 | 0.331250 | 0.315893 | 128.78 | 31.65 | 286.60 |
| 20 | 0.315893 | 0.300714 | 120.24 | 29.55 | 294.97 |
| **19 (shipped)** | **0.300714** | **0.285714** | **111.87** | **27.50** | **303.15** |
| **18** | **0.285714** | **0.267857** | **103.69** | **25.49** | **312.73** |
| 17 | 0.267857 | 0.250000 | 94.11 | 23.13 | 322.09 |
| 16 | 0.250000 | 0.232143 | 84.75 | 20.83 | 331.19 |
| 15 | 0.232143 | 0.214286 | 75.65 | 18.59 | 339.97 |
| **14** | **0.214286** | **0.196429** | **66.87** | **16.44** | **348.39** |
| 13 | 0.196429 | 0.178571 | 58.45 | 14.37 | 356.39 |
| 12 | 0.178571 | 0.160714 | 50.45 | 12.40 | 363.92 |
| 11 | 0.160714 | 0.142857 | 42.92 | 10.55 | 370.92 |
| **10** | **0.142857** | **0.125000** | **35.92** | **8.83** | **377.33** |
| 9 | 0.125000 | 0.107143 | 29.51 | 7.25 | 383.09 |
| 8 | 0.107143 | 0.089286 | 23.75 | 5.84 | 388.14 |
| 7 | 0.089286 | 0.071429 | 18.69 | 4.60 | 392.43 |
| 6 | 0.071429 | 0.053571 | 14.41 | 3.54 | 395.91 |
| 5 | 0.053571 | 0.035714 | 10.93 | 2.69 | 399.32 |
| 4 | 0.035714 | 0.017857 | 7.52 | 1.85 | 402.96 |

**The panel is not linear in the boundary and the table is why it is here rather than derived in
a reader's head**: the blade is widening fast through this stretch, so the last four rows below
the shipped boundary cost 2.0, 2.4, 2.3 and 2.2 points each while four rows further down cost
about 1.9 each. Halving the panel is six rows, not ten.

---

## 3. The binding constraint, confronted

### 3a. #250's own truncation, at every lattice station

#250 named the binding constraint as **`measureWall`'s SELF reading on `SHIPPED roll 330`** —
V5's own number on one of its three declared `SELF_XFAIL` rows — and measured it by truncating
the captured grid to the solid base, which is what a cut petal does to the capture. Its sweep
stepped about two rows at a time. Re-run at EVERY station, same tool, same rows:

whole blade: **wall 0.6974 at u 0.214286, self 0.6586 at u 0.267857.**

| row | panel to u | % of blade | wall | Δ | self | Δ | reproduces both |
|---|---|---|---|---|---|---|---|
| 22 | 0.346875 | 33.80 | 0.6974 | 0 | 0.6586 | 0 | **YES** |
| 21 | 0.331250 | 31.65 | 0.6974 | 0 | 0.6586 | 0 | **YES** |
| 20 | 0.315893 | 29.55 | 0.6974 | 0 | 0.6586 | 0 | **YES** |
| **19 (shipped)** | 0.300714 | 27.50 | 0.6974 | 0 | 0.6586 | 0 | **YES** |
| **18** | **0.285714** | **25.49** | **0.6974** | **0** | **0.6586** | **0** | **YES** |
| 17 | 0.267857 | 23.13 | 0.6974 | 0 | 0.6941 | +0.0354 | no |
| 16 | 0.250000 | 20.83 | 0.6974 | 0 | 0.6941 | +0.0354 | no |
| 15 | 0.232143 | 18.59 | 0.6974 | 0 | 0.6941 | +0.0354 | no |
| 14 | 0.214286 | 16.44 | 0.7010 | +0.0037 | 0.7216 | +0.0629 | no |
| 13 | 0.196429 | 14.37 | 0.7144 | +0.0170 | 1.1702 | +0.5116 | no |
| 12 | 0.178571 | 12.40 | 0.7403 | +0.0429 | 1.5441 | +0.8855 | no |
| 10 | 0.142857 | 8.83 | 0.8348 | +0.1374 | 1.5441 | +0.8855 | no |
| 8 | 0.107143 | 5.84 | 0.9749 | +0.2775 | 1.5441 | +0.8855 | no |
| 6 | 0.071429 | 3.54 | 1.1172 | +0.4198 | 1.5501 | +0.8914 | no |
| 4 | 0.035714 | 1.85 | 1.1573 | +0.4599 | 1.7329 | +1.0743 | no |

**Every figure #250 published is reproduced where the two sweeps overlap** (rows 19, 16, 14, 12,
10, 8 and 6 are its seven targets, and `--control`'s C3 asserts all seven). **What it did not
run is row 18**, which reproduces both readings exactly and takes the panel from 27.50 % to
25.49 %. Its sentence — *"the next boundary down moves SELF by 0.0354 mm"* — is true of the
boundary it tested and false of the next boundary down.

### 3b. Where the pair is — measured, not inferred

`measureWall` reports the QUERY point and not the far end, and every truncation argument turns
on the far end. #250 stated it as *"the pair's far end sits between 0.2857 and 0.3007"*. It does
not:

| state | self mm | query (u, v) | partner cell (u range, v range) |
|---|---|---|---|
| flat | 1.2460 | (0.989732, 1.000) | (0.979196 … 0.985089, 0.333 … 0.556) |
| cup-max | 1.0310 | (1.000000, −0.333) | (0.989732 … 1.000000, 0.556 … 0.778) |
| **roll-max** | **0.6586** | **(0.267857, −0.333)** | **(0.267857 … 0.285714, 0.778 … 1.000)** |
| twist-max | 1.1633 | (0.331250, −1.000) | (0.285714 … 0.300714, −1.000 … −0.778) |
| form-max | 0.0417 | (0.363125, 0.556) | (0.346875 … 0.363125, −0.556 … −0.333) |
| buckle-on-form | 0.2543 | (0.381518, −1.000) | (0.285714 … 0.302321, −1.000 … −0.778) |

**Both ends of roll-max's pair are in the SAME row band and both are at or below u = 0.285714**
— the last held station. That is exactly why row 18 reproduces and row 17 does not, and it is
the mechanism §3a measures. The inferred version was off by one row band, and the correction is
worth 2.01 points of the blade.

**Two of the other five pairs straddle the shipped boundary** (twist-max's and
buckle-on-form's partners sit at u 0.2857…0.3007 and 0.2857…0.3023), which is presumably where
the inferred sentence came from — it is true of those two states and not of the one the
constraint is about.

### 3c. The infilled state's own reading — the measurement #250 could not make

#250 recorded, in its own §2, that *"`bloom-wall-thickness.mjs`'s twelve STATES carry no infill
today, so V5 would meet this only once a session adds an infilled state"*. So the number pinning
the boundary was measured on petals with no holes. This is that measurement.

**THE INSTRUMENT IS THE SHIPPED LATTICE, MASKED.** The 56 × 10 lattice is the very grid
`measureWall` reads. A sample that falls inside a HOLE is removed; everything else is kept.
**With no mask the rule IS `measureWall`** — not to a tolerance, to the bit:

| state | shipped wall / self | the rule's wall / self | |
|---|---|---|---|
| flat | 1.200000 / 1.246047 | 1.200000 / 1.246047 | **EXACT** |
| cup-max | 1.071043 / 1.031037 | 1.071043 / 1.031037 | **EXACT** |
| **roll-max** | **0.697374 / 0.658649** | **0.697374 / 0.658649** | **EXACT** |
| twist-max | 0.974219 / 1.163284 | 0.974219 / 1.227490 | differs by 0 / +6.42e-2 |
| form-max | 0.003579 / 0.041712 | 0.003579 / 0.018422 | differs by 0 / −2.33e-2 |
| buckle-on-form | 0.297800 / 0.254289 | 0.300686 / 0.254289 | differs by +2.89e-3 / 0 |

**IT IS NOT ONE IDENTITY OVER EVERY STATE AND IT IS NOT ASSERTED AS ONE.** The two rules differ
in exactly one thing: `measureWall` calls a triangle "the wall under this point" by its LOWER
CORNER's lattice index, and the rule here by its CLOSEST POINT's. They agree whenever the
minimising contact is at a corner and can disagree when it is in a triangle's interior —
**measured, in both directions**. The shipped rule is the bar. Where the two agree a masked
reading is directly comparable to it; where they do not, the masked reading is compared against
THIS rule's own plain reading and the row says so. **`roll-max` is EXACT and is asserted to be**,
because §3a, §3b and this section are all about it and a residual there would make every figure
here a different instrument's. C1 is what shows that assertion can fail.

**THE RESULT.** Six states × two walls × ten boundaries from row 19 down to row 5, eight seeds
each, both quad rules:

> **ROWS WHERE THE INFILLED SHEET COMES CLOSER TO ITSELF THAN THE PLAIN ONE: 0 of 120.**

`roll-max` reads **0.6586 — the plain petal's own number — at every boundary from row 19 down to
row 5**, at both walls, with one exception in the safe direction: at a 0.8 mm wall, rows 10 and
8, the worst seed reads **0.6925 (+0.0339)**, because there a hole happens to remove the
v = −0.333 sample and the next-closest pair is further apart. **Six of the 120 rows read ABOVE
the plain petal and 114 read exactly equal to it; none reads below.** The other four above are
twist-max at rows 16 and 14, both walls, at +0.0019.

**AND THAT IS A THEOREM BEFORE IT IS A MEASUREMENT, which is why it is stated both ways.** The
infilled solid's material is a SUBSET of the plain solid's: the base panel is the plain
lattice's own rows, each cell's annulus is part of that cell, and every hole rim lies between
the same two skins at a plan point inside the cell. Removing material can delete a close pair
and cannot create one, so **every self-approach and every clearance to another body is
monotonically non-decreasing under an infill.** The masked lattice measures it on a tessellation
both sides share, so the comparison is exact for the material it samples; the theorem is why the
answer could not have gone the other way, and the measurement is why it is not being asserted
from an argument alone.

**#250's OTHER TRUNCATION FIGURE IS CONFIRMED AND RE-ATTRIBUTED.** It recorded that
*"all-form-max's SELF already moves at the shipped boundary, by 0.0017 mm, because its partner
sits at u = 0.3631 — above 0.30"*. The 0.0017 reproduces exactly (0.0417 → 0.0434), and it is
flat across every boundary from row 22 to row 16. **On the masked lattice it is +0.0000 at every
boundary**, because the infill leaves material at that pair. So the 0.0017 is the instrument
losing the lamina, not the geometry moving — which is the same thing this section says about the
roll-330 number, arriving on the one row #250 itself flagged.

### 3d. What this does not cover, stated rather than left to be found

* **It samples the SHIPPED LATTICE and nothing else, so the hole RIMS are not measured.** A rim
  is new surface the infill adds and no lattice station sits on one. A rim lies at a hole's edge,
  between two lattice samples, and the sample just outside the hole is kept and stands for it. A
  rim-against-rim approach closer than the nearest lattice pair would not be seen here. That is
  the shipped instrument's own blindness to anything off its grid, inherited rather than
  introduced — and it is the thing an infilled STATE in `bloom-wall-thickness.mjs` would close,
  which is still owed and is still the build's.
* **The mask is bracketed, not exact.** A hole's boundary does not follow the lattice, so a quad
  straddling one is partly material. Both ends are reported: ANY-corner keeps the quad if any
  corner is material (more material, the SAFE direction — it never claims a clearance the
  geometry does not have) and ALL-corner keeps it only if every corner is. The headline is ANY;
  the two agree on 106 of 120 rows and **on all 14 that differ, ALL is the LARGER reading** —
  the bracket only ever opens in the direction the headline is already conservative about.
* **WHY NOT THE EMITTED SHELL, which is the obvious instrument and is the wrong one here.**
  Measured, and it is a property of the PROTOTYPE rather than of the idea: `cutThrough`
  tessellates a solid cell as a flat FAN over the whole cell polygon, and a flat fan across a
  surface that wraps is a CHORD. Under `petalRoll` 330 — a near-closed quill — a cell's own facet
  cuts through the tube and a self-approach measured on those facets reads **0.0009 mm**, which
  is the tessellation and not the sheet. The prototype's own header already says it is not the
  emitter that would ship; this is what that costs an instrument built on it. A build's emitter
  would subdivide, and then the emitted shell is the right thing to measure.

---

## 4. The `HELD_ROWS` / `A7` collision — laid out, not resolved

**ONE NUMBER, TWO OWNERS, NEITHER CHOSEN FOR THE OTHER.**

```
ROOT_BLEND_END = 0.30                              bloom-geometry.js:2999
HELD_ROWS      = floor(ROOT_BLEND_END * NU)        bloom-geometry.js:3137
               = floor(0.30 * 56) = floor(16.8) = 16
```

* **`ROOT_BLEND_END` is a STATION on the outline.** `rootBlend(u) = footHalf · max(0, 1 − u/0.30)`
  — where the foot's width floor decays to nothing and the core takes the outline. It is also
  `laminaStart` for the lobes (`bloom-geometry.js:3839`), A5's excluded region by name, and the
  `base` bucket of `bloom-sagitta.mjs`.
* **`HELD_ROWS` is a COUNT on the row plan.** It is how many ladder stations `bladeStations`
  keeps at their uniform lattice positions, and it is A7's subject: *"the held stations are
  `(seamStep + i) / rows` … still a bit identity, still `held` consecutive rows one row apart."*

**A COUNT DERIVED FROM A STATION STOPS DESCRIBING THAT STATION THE MOMENT THE BLOCK CAN START
ANYWHERE BUT ROW 1.** Session 38's seam clearance made it start at `seamStep`. Measured:

| state | seamStep | held block runs | `ROOT_BLEND_END` | the infill's panel top | |
|---|---|---|---|---|---|
| the shipping default | 1 | 0.0178571 … **0.2857143** | 0.30 | **0.3007143** | one row **ABOVE** the last held station |
| `petalTilt` 75 × `petalLength` 20 × `sheetThickness` 2.40 | 4 | 0.0714286 … **0.3392857** | 0.30 | **0.3035714** | two rows **BELOW** it |

**Both signs occur, which is what makes it a collision rather than an offset.** At the default
the panel swallows one row the root blend does not own; on the seam-shifted state the infill
cuts holes into two rows that the root blend DOES own and that A7 pins as a bit identity. And
at `seamStep` 4 only 13 of the 16 held rows lie below `ROOT_BLEND_END` at all — the count no
longer spans the length it was derived from.

**IT IS THIS PROJECT'S OWN FIRST DURABLE RULE, ARRIVING FROM THE OTHER SIDE.** CLAUDE.md's
mode-and-sampling rule says a constant standing for a PHYSICAL LENGTH must be derived from that
length and never from a ROW COUNT, *"because a row count is only a length under UNIFORM
spacing"*. `HELD_ROWS` is the converse — a COUNT derived from a LENGTH — and it is correct only
while the block starts at row 1, which is exactly the uniform case.

**THE OPTIONS, with what each costs. This is Eva's ruling and nothing here is resolved in code.**

1. **The ROOT BLEND owns it; `HELD_ROWS` becomes derived from the station in every state.**
   `held = max(0, floor(ROOT_BLEND_END · NU) − seamStep + 1)`, so the held block always ends at
   the blend's own station and never above it, and the infill reading `ROOT_BLEND_END` names the
   same place. **Cost:** the held COUNT becomes state-dependent, A7's "16 consecutive rows"
   becomes "the rows below the blend", and every seam-shifted row's ladder changes — a byte event
   on the 160 rows session 39 already measured as carrying a seam step of 2 or more. It also
   makes the block shorter exactly where the seam floor already shortened the blade.
2. **The LADDER owns it; the infill's boundary reads `HELD_ROWS` instead of `ROOT_BLEND_END`.**
   The boundary is `(seamStep + HELD_ROWS − 1) / NU` — the last held station, a row index the
   BUILDER declares. **Cost:** nothing in the repository moves (the infill is not built), and the
   panel's top becomes exactly the block A7 pins, in every state, seam-aware and mode-free. On a
   seam-shifted state the panel would reach ABOVE 0.30 (to 0.3392857 in the probe) — more solid,
   not less, and on the shipping default it lands on **row 18, u 0.2857143, 25.49 % of the
   blade.** What it gives up is the boundary meaning "where the outline stops being the foot's".
3. **They are two boundaries and both stay, named apart.** `ROOT_BLEND_END` keeps the outline,
   `HELD_ROWS` keeps the lattice, and the infill picks one EXPLICITLY and says which. **Cost:**
   nothing moves and the disagreement stays — but it stops being accidental, which is the whole
   of what is wrong with it today.

**THE RECOMMENDATION, and the reason rather than the preference: option 2 for the INFILL's own
boundary.** The panel is a MESH REGION. A mesh region should be bounded by a row the builder
declares, not by a continuous station that has to be snapped to the nearest row — and the snap
is what makes today's boundary arbitrary: 0.30 sits **0.0007 below row 19 and 0.0143 above row
18**, so which row the panel stops at is decided by where the ladder's first free station happens
to fall. Move `LADDER_ARC_SHARE` or the gap bound and the panel's size changes with it, for a
reason nobody stated. Option 2 removes that, makes the boundary follow the seam clearance (which
today it does not — `splitRow` snaps against a fixed 0.30 whatever `seamStep` is), and
**independently lands on exactly the boundary §3a finds keeps #250's own constraint exact.**

**Option 1 is a separate and larger question about `HELD_ROWS` ITSELF and is the ladder's, not
the infill's.** It moves shipped bytes; this session's does not, and the two should not be ruled
on as one.

---

## 5. The grid — boundary × basal V × base cell size

**BOTH LEVERS AT ONCE, which is the point.** Every session before this one moved one at a time,
and each alone does nothing: lowering the boundary leaves the V converging the pattern out above
it, and shallowing the V leaves the panel filling the bottom of the picture. `baseNarrow` 1.50 is
included because `docs/bloom-infill-basal-grading.md` §3c established it lightens the base
without regressing the tip, where 1.80 does regress it.

**`bottom 45 % solid` is the number to read.** It is the fraction of the blade's own bottom 45 %
that is SOLID — the base panel AND the pattern's wall together — so it is the one figure that
moves with both levers and the one the eye is actually judging. `panel %` is the base panel as a
fraction of the blade and is a function of the boundary alone.

**Wall 1.0 mm**, medians over eight seeds. Every cell: boundary edges 0, one vertex-welded shell,
one voxel piece at 0.6 mm and at 0.3 mm; the two non-manifold edges are the base panel's own
overlap weld, unrated here as in the gates.

| boundary | panel % | V | base | lowest hole u | basal wall | **bottom 45 % solid** | blade open | real holes | tris |
|---|---|---|---|---|---|---|---|---|---|
| **0.3007 (shipped)** | 27.5 | **0.100** | **0.75** | 0.3120 | 65.8 % | **84.0 %** | 30.3 % | 14 | 2716 |
| 0.3007 | 27.5 | 0.050 | 1.50 | 0.3000 | 46.7 % | 75.1 % | 33.8 % | 12.5 | 2730 |
| 0.3007 | 27.5 | 0.000 | 1.50 | 0.3000 | 40.2 % | 72.0 % | 35.2 % | 12.5 | 2682 |
| **0.2857** | **25.5** | **0.050** | **1.50** | 0.2821 | 47.1 % | **72.7 %** | 35.3 % | 12 | 2692 |
| 0.2857 | 25.5 | 0.025 | 1.50 | 0.2821 | 42.4 % | 70.2 % | 36.5 % | 12 | 2644 |
| 0.2500 | 20.8 | 0.050 | 1.50 | 0.2464 | 47.6 % | 67.9 % | 38.0 % | 13 | 2650 |
| **0.2143** | **16.4** | **0.050** | **1.50** | 0.2107 | 46.3 % | **62.4 %** | 40.6 % | 14 | 2572 |
| 0.1786 | 12.4 | 0.050 | 1.50 | 0.1750 | 44.1 % | 56.4 % | 44.5 % | 14 | 2584 |
| **0.1429** | **8.8** | **0.050** | **1.50** | 0.1393 | 46.1 % | **54.3 %** | 45.4 % | 14 | 2460 |
| 0.1429 | 8.8 | 0.025 | 1.50 | 0.1364 | 44.2 % | 52.7 % | 46.2 % | 14 | 2416 |

**Wall 0.8 mm**, the same four shortlisted cells: **81.9 / 70.3 / 58.6 / 49.2 %** bottom-45 solid,
against blade-open **35.7 / 40.7 / 46.8 / 51.8 %**. The wall is worth 2–5 points of bottom-45
solid at every boundary; the boundary is worth 30 points across the range. **Both levers are
smaller than the boundary**, which is the session's own summary of the last two sessions.

**The full grid is 96 cells** — six boundaries × four `converge` values × two `baseNarrow` × two
walls, eight seeds each — and **every one is CLEAN**: boundary edges 0, one shell, one voxel
piece at 0.6 mm and at 0.3 mm, on all **768 (cell × seed) states**. **The census never binds anywhere on this sheet**,
which is the same answer `docs/bloom-infill-basal-grading.md` §2 got for the V alone and is now
established for the boundary too. Re-runnable: `node tools/bloom-infill-base-panel.mjs`.

**THREE THINGS THE GRID SAYS THAT WERE NOT PREDICTED.**

* **Lowering the boundary makes the pattern lighter PER UNIT AREA as well as smaller in total,
  and it is the LAMINA's wall fraction that says so rather than the basal band's.** At a fixed
  grading the lamina goes **59.3 % → 54.7 % wall** (V 0.100 × base 0.75) and **54.7 % → 51.0 %**
  (V 0.050 × base 1.50) from row 19 to row 10. #250 measured 61 % → 56 % for the boundary alone
  and this is the same four-to-five points, so the effect composes with the grading rather than
  cancelling it. **The BASAL BAND's own wall fraction is nearly flat at the lightened grading**
  (46.7 → 46.1 % over the same range) and that is not a contradiction: the band runs from the
  cells' start to u 0.45, so it GROWS as the boundary falls and takes in more mid-blade. The
  band answers "how heavy is the pattern down there"; the lamina answers "how heavy is the
  pattern", and the boundary moves the second.
* **The whole bloom gets CHEAPER as the boundary drops.** 21,844 triangles at the shipped
  boundary, 21,512 at row 18, 20,856 at row 14, **19,808 at row 10 — 768 above the plain bloom's
  19,040.** The pattern reaching further down removes more material than its rims add back.
* **The smallest hole on the petal falls below the print floor at `baseNarrow` 1.50 at a 1.0 mm
  wall** (0.90 → 0.61 mm at the shipped boundary), which is the trade
  `docs/bloom-infill-basal-grading.md` §3a already recorded; `real` holes stay at 12–14 and the
  0.8 mm wall does not pay it. Unchanged by anything here, restated because it is on every
  shortlisted cell.

---

## 6. The sheet

`node tools/shot-bloom-base-panel.mjs [--out <dir>] [--quick]` →
**https://claude.ai/artifact/1KoMvwxAZ8NpvADZXHnddr**

Four settings, each at both walls: the petal alone, the base close, and the whole bloom from
above and three-quarter with a plain bloom as the control. **The panel's share of the blade is on
every caption and in the table**, because it is what Eva is judging and it should not have to be
inferred from a picture.

| | boundary row | panel % | V | base | bottom 45 % solid (w 1.0) |
|---|---|---|---|---|---|
| **as it stands** | 19 | 27.5 | 0.100 | 0.75 | 84.0 % |
| **D** | 18 | 25.5 | 0.050 | 1.50 | 72.7 % |
| **E** | 14 | 16.4 | 0.050 | 1.50 | 62.4 % |
| **F** | 10 | 8.8 | 0.050 | 1.50 | 54.3 % |

**D is the conservative pick and is available even under the superseded reading** — it is the
lowest boundary at which #250's own truncation still reproduces the roll-330 readings exactly,
and it is also where option 2 of §4 lands. **E and F rest on §3c**: nothing measured binds there.
`converge` 0.050 is used on all three because it is the shallowest V that keeps a real stagger at
every boundary (`docs/bloom-infill-basal-grading.md` §2: 0.000 puts every basal hole on one line).

Each petal picture is ONE SEED and says so; the eight-seed median is in every caption. The
whole-bloom cells are the eight petals at their own eight seeds, which IS that population. No
pixel delta is quoted anywhere: the rasteriser is deterministic, so no same-tree control is owed
and none is claimed.

---

## 7. What is Eva's to rule

1. **The boundary.** 27.5 % of the blade today; 25.5 % at row 18 for nothing; 16.4 % and 8.8 %
   at rows 14 and 10, on §3c's finding that no self-approach constraint binds there.
2. **The `HELD_ROWS` / `A7` collision** — §4's three options. The recommendation is option 2 for
   the infill's boundary, and option 1 is a separate ruling that moves shipped bytes.
3. **The wall.** 0.8 mm against 1.0 mm, on an unprinted floor. Unchanged from the last two
   sessions and restated because every cell on the sheet carries both.

---

## 8. Recorded, not built

* **`bloom-wall-thickness.mjs` STILL CARRIES NO INFILLED STATE.** #250 recorded that it must
  gain one the day the infill ships, because V5 is the only gate on self-approach. This session
  measured around that rather than closing it: the masked lattice is an instrument, not a gate
  row, and it samples no rim. The state itself is the build's.
* **The hole RIMS are unsampled by anything.** §3d. Closing it needs either an emitter that
  subdivides its cells (so the emitted shell can be measured directly) or a rim-aware sampler.
  Neither is this session's.
* **`splitRow` snaps against a fixed 0.30 whatever `seamStep` is**, so the infill's boundary does
  not follow the seam clearance today. §4 option 2 fixes it as a side effect; option 3 does not.
  Named here so it is not rediscovered as a defect after the ruling.
* **The count `N` is fixed at 16** and `tipGamma`, `baseReach`, `ANISO` and the fillet radius are
  untouched — the salvage doc's own readings. Every trade above is at a fixed cell count, so a
  boundary that opens more lamina takes cells from nowhere: the cells simply spread. Letting `N`
  rise with the lamina is a different experiment.
* **The basal band is u [cells-from, 0.45] and the bottom band is u [0, 0.45], both choices.**
  The first is the last two sessions' own band and adapts with the boundary; the second is fixed
  and is what makes rows comparable across boundaries. Their numbers would move with a different
  top and the direction of every finding would not.
