# Bloom infill — grading the field at the base (Sep 18 2026)

**No repository geometry, registry or gate was touched.** Four files under `tools/`:
`bloom-voronoi-proto.mjs` gained its grading numbers as options (inert at their defaults —
measured, §1) and a BAND measurement it did not have; `bloom-basal-grading.mjs` and
`shot-bloom-basal-grading.mjs` are new; `shot-bloom-infill-base.mjs` moved one call site.
The salvage's field is used **as it stands** everywhere else: its anisotropic metric, its
seeding law, its four density-weighted Lloyd passes, its 0.8 mm fillet, its tip grading and
its wall law are untouched.

**THE BASE BOUNDARY IS FIXED at `ROOT_BLEND_END` (Eva's ruling) and nothing here moves it.**
`docs/bloom-infill-base-boundary.md` measured it as already the floor; that measurement was
not repeated.

The sheet is published as a private artifact:
**https://claude.ai/artifact/Aizz8CGP4g4XhkGp6eRv4x**.

Adding files under `tools/` makes the two FLOWER gates run on the PR (their `tools/**` filter);
no bloom gate keys on these files. They test flower geometry and are not evidence about this.

---

## 0. The three answers, before the tables

Eva's reading of the last sheet: *the infill still does not do enough at the bottom, there is
still a lot of solid area.* Three changes were asked for. Here is what each did.

**1. THE BASAL V IS THE LEVER, AND THE CENSUS NEVER BINDS.** Sweeping `converge` from 0.20
down to 0 moves the basal band from **85 % wall to 50 %** at a 1.0 mm wall, monotonically, and
**every value is clean**: 74 states × 8 seeds = **592 builds, all boundary 0, one vertex-welded
shell, one voxel piece at 0.6 mm and at 0.3 mm.** So "the shallowest that still keeps the
census clean and one shell" is **0.000** — and the answer is unhelpful, because what bounds the
V downward is not the census. **At 0 every basal hole bottoms on exactly ONE LINE** (bottoms
spread 0.00 mm, 5 of 5 on it), which is the look the V was introduced to prevent. **The
shallowest that stays clean AND staggers the bottom is 0.025** (3 of 5 on the line, 0.22 mm of
spread, 50.7 % basal wall against the shipped 65.8 %); **0.050 buys a real stagger** (1 of 5,
0.93 mm) at 55.3 %.

**2. SHRINKING CELLS TOWARD THE BASE — THE CHANGE AS BRIEFED — MAKES THE BASE HEAVIER, AND IT
IS MONOTONE.** At a 1.0 mm wall the basal band goes **56.4 % → 73.6 % wall as `baseNarrow`
falls from 1.80 to 0.25**; the shipped 0.75 sits at 65.8 %. The mechanism is measured, not
argued (§3b): **the wall is an ABSOLUTE width, so a cell's open fraction is about
`1 − c·w/√A`** — smaller cells are a higher share wall. Below about 5 mm² a cell carries no
hole at all at either wall. **The direction that lightens the base is the opposite one:**
`baseNarrow` 1.50 takes the basal band to 59.3 % on its own and to **46.7 %** with the V at
0.050.

**3. WALL WIDTH IS THE BIGGEST SINGLE LEVER ON THE WHOLE BLADE.** Every state was rendered and
measured at both. Across the four shortlisted gradings the whole-blade OPEN fraction moves
**30.3 % → 34.1 % at a 1.0 mm wall**, and **30.3 % → 35.7 % by changing nothing but the wall** —
so on the blade as a whole the wall is worth more than the grading the shortlist spans. In the
BASAL BAND the ranking reverses: the grading is worth 34 % → 53 % open and the wall 34 % → 39 %.
*(Read against the FULL sweep rather than the shortlist the grading's span is wider — 26.2 % to
34.1 % of the blade open at a 1.0 mm wall — but all of that extra span is in the HEAVIER
direction, at `converge` 0.150 and 0.200, which is not a place anyone wants to go.)* Eva has not
ruled on wall width and rules it from the sheet.

**AND ONE THING NO GRADING CAN REACH, said plainly because the eye will blame the pattern for
it.** The blade's plan area is **406.8 mm²**. The solid base panel — everything below
u 0.3007, which the boundary ruling fixes — is **111.9 mm², 27.5 % of the blade.** The basal
band the grading acts in is 91.1 mm², 22.4 %. So a little over a quarter of the blade is solid
by ruling, and the macro cells on the sheet show that region filling the bottom of the frame at
every setting.

---

## 1. What moved, and the proof it is inert

`tools/bloom-voronoi-proto.mjs`:
* `fieldSalvage` reads `converge`, `baseNarrow`, `baseReach` and `tipGamma` off `opts`, each
  defaulting to its own constant. `BASE_REACH = 0.30` is named where it was a literal.
* `cutThrough` returns `cellOpen`, a boolean per cell aligned with `F.cells`, recorded BEFORE
  the early return so the array is aligned whatever branch the cell takes.
* `bandStats` / `clipBandX` / `laminaAreaX` / `BASAL_BAND_TOP` / `TIP_BAND_BOTTOM` /
  `EDGE_ON_LINE_MM` are new; `measure` carries `basal`, `tip`, `below015` and `lowestHoleU`.
* `wholeBloom`'s fifth argument is the field's `opts` rather than one of them. Its one existing
  caller (`shot-bloom-infill-base.mjs`) passes `{ u0: b.target }` where it passed `b.target`.

**INERT AT THE DEFAULTS: 0 of 394,848 floats differ** over 16 states (8 seeds × 2 walls), head
against a `git worktree` of `eac6d8a`, compared with `Object.is`. **The control:** the same
comparison with `converge: 0.05, baseNarrow: 0.45` on the head reports **the streams differ in
LENGTH — 2,736 triangles against 2,564** — so the option is reached and the comparison can
fail. *(A length change and a value change must not share one word — session 34; the control
says which of the two it got and is satisfied by either.)* Re-runnable:
`node tools/bloom-basal-grading.mjs --inert <base-tree>`.

And the shipped `--quick` run of `bloom-voronoi-proto.mjs` reproduces the salvage doc's own
table row for row, including all five metric controls (1.91 / 1.79 / 1.28 / 2.84 / 1.10).

**THE SWEEP IS EIGHT SEEDS, ALWAYS.** One layout is not a measurement. The seeds are
`SEED + i*131` for i = 0..7, which is exactly the set `wholeBloom` gives the eight petals of the
shipping whorl — so the sweep's population IS the bloom's. Every figure below is the MEDIAN over
those eight with the range in brackets. The sheet's petal pictures are ONE seed and say so in
their own captions, with the eight-seed median printed beside them.

---

## 2. Change 1 — the basal V

`converge` is the fraction of the petal's length the solid zone reaches UP THE MARGINS from the
boundary. Everything else shipped; 16 cells; the boundary fixed.

**Wall 1.0 mm.** `bottoms` is the spread of the basal holes' own lowest x; `on line` counts the
ones within 0.15 mm of the lowest bottom there is.

| converge | lowest hole u | basal holes | basal wall | on line | bottoms mm | lamina wall | blade open | real holes | smallest hole mm | tris |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.000 | 0.3000 | 5 | **50.3 %** [45.3–51.6] | 5 of 5 | **0.00** | 54.3 % | 34.1 % | 14 | 0.90 | 2,692 |
| 0.025 | 0.3000 | 5 | **50.7 %** [46.2–52.4] | 3 of 5 | 0.22 | 54.5 % | 33.9 % | 14 | 0.90 | 2,740 |
| 0.050 | 0.3000 | 5 | 55.3 % [51.7–56.4] | 1 of 5 | 0.93 | 55.8 % | 32.9 % | 14 | 0.90 | 2,740 |
| 0.075 | 0.3052 | 5 | 60.6 % [58.0–61.5] | 1 of 5 | 1.45 | 57.5 % | 31.7 % | 14 | 0.90 | 2,716 |
| **0.100 (shipped)** | 0.3120 | 5 | **65.8 %** [63.4–66.7] | 1 of 5 | 1.91 | 59.3 % | 30.3 % | 14 | 0.90 | 2,716 |
| 0.150 | 0.3261 | 3 | 76.0 % [73.6–77.7] | 1 of 3 | 2.52 | 62.3 % | 28.1 % | 14 | **0.67** | 2,704 |
| 0.200 | 0.3406 | 1 | 85.1 % [83.2–87.0] | 1 of 1 | — | 64.9 % | 26.2 % | **12** | 0.76 | 2,634 |

**Wall 0.8 mm**, the same seven, basal wall: **42.3 / 43.8 / 49.4 / 55.4 / 61.4 / 73.1 / 83.4 %**;
lamina wall 46.1 / 46.6 / 48.2 / 50.1 / 52.1 / 55.7 / 59.0 %; the bottoms spread
0.00 / 0.32 / 0.99 / 1.46 / 1.92 / 1.88 / — mm (the last is a single hole, so it has no spread);
`real` 14 and the smallest hole 0.69 mm at **every** value, so the thinner wall does not pay the
print-floor cost the 1.0 mm wall pays at `converge` 0.150 and above.

**Four things the sweep says.**

* **The census never binds.** All fourteen states, both walls, eight seeds each: boundary 0, one
  shell, one voxel piece at 0.6 mm and at 0.3 mm; the two non-manifold edges on every row are the
  base panel's own overlap weld, unrated here as in the gates. So the shallowest CLEAN setting is
  0.000 and that number decides nothing.
* **What bounds it downward is the line.** At `converge` 0 the V's clip is vacuous, every basal
  cell reaches the region's own lower edge, and every basal hole bottoms at `xB + w/2` — the same
  x, to the bit. Bottoms spread **0.00 mm** and all five are on the line. That is the look the V
  was introduced to prevent. **0.025 is the shallowest that both stays clean and staggers it**
  (3 of 5 on the line, 0.22 mm), and it costs 0.4 points of basal wall against 0.000.
* **The shipped 0.100 sits exactly at the top of the range that costs no real hole.** Up to 0.100
  the smallest hole holds at 0.90 mm and 14 of 17 are real; at 0.150 the smallest falls to 0.67 mm
  and at 0.200 two more holes drop under the print floor and only one basal hole survives. So the
  V's own ceiling is already where it is for a reason — what is available is the room BELOW it.
* **THE V CANNOT REACH THE TIP AT ALL.** It clips holes from below inside the basal band.
  Measured: the tip band's real-hole count, median hole, wall fraction, the apex cap and its
  floor are **identical at every one of the seven `converge` values, 0 through 0.200** — tip
  median 1.58 mm, tip wall 72 %, cap 2.72 mm at a 1.0 mm wall; 1.74 mm, 64 % and 2.46 at 0.8.
  What DOES move above 0.100 is the WHOLE-PETAL smallest hole and real count, and that is the V
  eating basal holes, not anything happening at the tip.

---

## 3. Change 2 — the base's cell-size rate

The grading is `spacing(x) = tip(x) · base(x)` with
`tip = (h(x)/h_max)^tipGamma` and `base = baseNarrow + (1 − baseNarrow)·min(1, (x − xB)/(baseReach·L))`.
`baseNarrow` is the BASE's own rate and is independent of `tipGamma`; the sweep moves only it.
Below 1 the cells at the boundary are SMALLER than the mid-blade spacing (the brief's "shrink
toward both ends"); above 1 they are LARGER. Both directions were run, because at a fixed
printable wall the direction is an open question rather than an obvious one.

**Wall 1.0 mm**, basal V at its shipped 0.10:

| baseNarrow | basal cells | basal holes | basal median hole | basal wall | basal aniso | lamina wall | tip real | tip median | apex cap | smallest hole | real |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1.80 | 3 | 3 | **3.15** | **56.4 %** [54.8–60.5] | 1.97 | 57.9 % | 3 | **1.36** | 2.86 | **0.63** | **13** |
| 1.50 | 3 | 3 | 2.88 | **59.3 %** [55.3–67.2] | 1.93 | 58.5 % | 3 | 1.55 | 2.75 | 0.61 | 12.5 |
| 1.25 | 3 | 3 | 2.49 | 61.8 % [55.3–66.8] | 1.84 | 58.5 % | 3 | 1.37 | 2.92 | 0.68 | 13.5 |
| 1.00 | 5 | 3 | 2.24 | 63.8 % [61.6–65.8] | 2.45 | 58.8 % | 4 | 1.53 | 2.65 | 0.84 | 14 |
| 0.85 | 5 | 5 | 2.22 | 64.6 % [63.2–66.6] | 2.54 | 58.9 % | 3.5 | 1.54 | 2.71 | 0.89 | 14 |
| **0.75 (shipped)** | 5 | 5 | 2.23 | **65.8 %** [63.4–66.7] | 2.54 | 59.3 % | 3 | 1.58 | 2.72 | 0.90 | 14 |
| 0.60 | 5 | 5 | 2.16 | 66.2 % [64.1–75.2] | 2.65 | 59.0 % | 4 | 1.83 | 2.73 | 0.92 | 14 |
| 0.45 | 5 | 5 | 2.10 | 68.8 % [66.2–75.2] | 2.43 | 59.2 % | 4 | 1.85 | 2.63 | 0.93 | 14 |
| 0.35 | 5 | 5 | 2.04 | 71.3 % [66.4–75.4] | 2.21 | 58.9 % | 3.5 | 1.77 | 2.33 | 0.64 | 14 |
| 0.25 | 7 | 5 | **1.19** | **73.6 %** [71.0–75.7] | 3.03 | 59.2 % | 3 | 1.90 | 2.52 | 0.63 | 13 |

**Wall 0.8 mm**, basal wall over the same ten: **53.5 / 55.7 / 57.9 / 59.6 / 60.2 / 61.4 / 61.6 /
64.1 / 65.9 / 66.8 %.** Same direction, same monotonicity, 8 points of range against 17.

### 3a. The answer: the brief's direction is the wrong one, measured

Shrinking cells toward the base raises the basal wall fraction **monotonically**, at both walls,
on eight seeds. It also starts killing holes outright: **basal cells that emit NO hole appear only
at `baseNarrow` ≤ 0.60 at a 1.0 mm wall** (up to 2 of 5 seeds, median 0) and nowhere at
`baseNarrow` ≥ 0.75 — and the only other state on the whole sweep that loses a basal hole is
`converge` 0.200, where the V eats it. What it does buy is ANISOTROPY (2.54 → 3.03 at 0.25) and
more cells (5 → 7), which is a finer pattern made of more wall — and the basal band's MEDIAN HOLE
falls with it, **2.23 → 1.19 mm at `baseNarrow` 0.25**, a fifth of a millimetre over the print
floor. In the other direction the median basal hole rises to **2.88 mm at 1.50 and 3.15 at 1.80**.

### 3b. Why — the mechanism, measured rather than reasoned

Over all 8 seeds and every cell of the shipped field, the open fraction of a cell by cell area:

| cell area | wall 1.0 mm | wall 0.8 mm |
|---|---|---|
| 0–5 mm² | **0.0 %** (16 cells — solid) | **0.0 %** (16 cells) |
| 5–10 mm² | 16.4 % | 28.0 % |
| 10–15 mm² | 36.8 % | 46.7 % |
| 15–20 mm² | 38.3 % | 45.9 % |
| 20–30 mm² | 46.3 % | 53.0 % |

Fitting `open = 1 − c·w/√A` gives **c = 2.478** at a 1.0 mm wall (range 1.73–3.94 over 114 open
cells) and **2.671** at 0.8 (1.79–4.51 over 118). So **a 50 % open cell needs √A = 4.96 mm — a
24.6 mm² cell — at a 1.0 mm wall, and 4.27 mm / 18.3 mm² at 0.8.** The wall is an absolute width
and the perimeter-to-area ratio of a cell goes as `1/√A`: **a region cannot be lightened by
subdividing it.** The two levers that do lighten it are FEWER, LARGER cells and a THINNER wall.

### 3c. The tip did not regress at `baseNarrow` 1.50, and it did at 1.80 — with numbers

**The structural half first, because it bounds what can possibly happen.** The base term
saturates at `xB + baseReach·L` = **20.500 mm = u 0.585714**; above that station `min(1, …)` is
exactly 1 and `spacing(x)` is **bit-identical at every `baseNarrow`** — measured over 20,001
samples, with the last disagreement at u 0.585679. The TIP BAND begins at u 0.75. So
`baseNarrow` cannot reach the tip through the spacing law at all; its only channel there is SEED
ALLOCATION, because the farthest-candidate seeding scores by `d/spacing²` and moving the base's
spacing moves where seeds go.

**And that channel is small against the seed noise.** At a 1.0 mm wall the apex cap's MEDIAN
across all ten `baseNarrow` values spans **2.33–2.92 mm (0.59 mm)** while a SINGLE setting's own
eight-seed range spans **2.20–3.72 mm (1.52 mm)** — the between-setting spread sits well inside
the within-setting one, so most of what the tip columns do is seeds.

**What survives that, at the values the shortlist uses:**

| | tip real holes | tip median hole | tip wall | apex cap | smallest hole anywhere | real holes |
|---|---|---|---|---|---|---|
| shipped `baseNarrow` 0.75, w 1.0 | 3 [3–5] | 1.58 mm | 72 % | 2.72 mm | 0.90 mm | 14 |
| **1.50**, w 1.0 | 3 [3–5] | **1.55 mm** | 73 % | **2.75 mm** | 0.61 mm | 12.5 |
| **1.80**, w 1.0 | 3 [3–5] | **1.36 mm** | 72 % | **2.86 mm** | **0.63 mm** | **13** |
| shipped 0.75, w 0.8 | 4.5 [3–5] | 1.74 mm | 64 % | 2.46 mm | 0.69 mm | 14 |
| **1.50**, w 0.8 | 4 [3–6] | **1.69 mm** | 63 % | **2.12 mm** | 0.61 mm | 14 |
| **1.80**, w 0.8 | 3 [3–5] | **1.58 mm** | 64 % | 2.57 mm | 0.63 mm | 13.5 |

**At 1.50 the tip does not regress**: the median tip hole moves −0.03 mm at a 1.0 mm wall and
−0.05 at 0.8, the cap +0.03 and −0.34, the real-hole count is level at both. **At 1.80 it does,
and the cost is stated:** the median tip hole falls **1.58 → 1.36 mm (−14 %)** at a 1.0 mm wall
and 1.74 → 1.58 at 0.8, the apex cap grows 2.72 → 2.86 mm, and the whole-petal real-hole count
falls 14 → 13. **1.80 is past the point; 1.50 is not.** What 1.50 does cost, at a 1.0 mm wall
only, is the smallest hole on the petal (0.90 → 0.61 mm) and the real count (14 → 12.5) — that is
the basal band trading five middling holes for three larger ones and a couple of slivers, and the
0.8 mm wall does not pay it (14 either way).

---

## 4. Change 3 — wall width, at every state

Every figure above is given at both walls and every cell on the sheet is rendered at both. The
summary, over the four shortlisted gradings, as OPEN AREA — the fraction of the blade's own
406.8 mm² of plan area that the pattern leaves open:

| grading | blade open, w 1.0 | blade open, w 0.8 | basal band open, w 1.0 | basal band open, w 0.8 |
|---|---|---|---|---|
| as it stands (V 0.100 × base 0.75) | 30.3 % | **35.7 %** | 34.2 % | 38.6 % |
| A — V 0.050 × base 1.00 | 33.1 % | 38.5 % | 46.2 % | 51.9 % |
| B — V 0.050 × base 1.50 | 33.8 % | 39.1 % | **53.3 %** | **58.0 %** |
| C — V 0.000 × base 0.75 | 34.1 % | 40.2 % | 49.7 % | 57.7 % |

**So the two levers act on different regions and the comparison should be read that way.** In the
BASAL BAND the grading is worth 19 points of open area and the wall 4–5. On the BLADE the wall is
worth 5–6 points and the entire grading sweep 4. The lightest state on the sheet is
C at 0.8 mm (40.2 % of the blade open) and the lightest that does not end on a line is
**B at 0.8 mm: 39.1 % of the blade and 58.0 % of the basal band.**

**What the 0.8 mm wall is, and what it is not.** It is 0.8 of `MIN_FEATURE_MM`, which this project
has never printed — the charter's standing gap. Everything above is a comparison against a line we
drew ourselves. The 0.8 mm wall also makes MORE of the petal's holes real at a given grading
(14 against 12.5 at `baseNarrow` 1.50), because a thinner wall leaves a wider hole in the same cell.

---

## 5. The shortlist, and what the sheet shows

`node tools/shot-bloom-basal-grading.mjs [--out <dir>] [--quick]` →
**https://claude.ai/artifact/Aizz8CGP4g4XhkGp6eRv4x**

Four settings — the field as it stands, then three — each at both walls: the petal alone, the base
close, and the whole bloom from above and three-quarter, with a plain bloom as the control. Every
petal picture is ONE SEED and says so; the eight-seed median is in the caption beside it and in the
table. No pixel delta is quoted: the rasteriser is deterministic, so no same-tree control is owed
and none is claimed.

| | converge | baseNarrow | what it is |
|---|---|---|---|
| **as it stands** | 0.100 | 0.75 | the control every other cell is read against |
| **A** | 0.050 | 1.00 | the V halved and the base narrowing removed — keeps five basal holes and 0.9 mm of stagger |
| **B** | 0.050 | 1.50 | and the base's cells enlarged — three larger basal holes, the lightest that does not end on a line |
| **C** | 0.000 | 0.75 | no V at all — the lightest, and every basal hole bottoms on one line |

Whole-bloom triangle counts, 16 cells a petal, each petal from its own seed: plain **19,040**;
as it stands **21,844** (w 1.0) / **22,412** (w 0.8); A **21,960 / 22,088**; B **21,824 / 22,424**;
C **21,700 / 22,220**. Boundary 0 and one voxel piece at 0.6 mm on every one.

**WHAT THE MACROS SHOW THAT THE TABLES DO NOT, and it is the honest caveat on this whole session.**
At every setting the bottom of the frame is a large solid U, and most of it is the BASE PANEL
rather than the pattern's wall — 27.5 % of the blade, fixed by the boundary ruling. The grading
moves the band immediately above it, and on the macros that reads as the holes coming down two or
three millimetres and, at C, squaring off on a line. If Eva's "a lot of solid area" is about the
panel rather than the band, no grading on this sheet answers it and the boundary ruling is what
would have to move.

---

## 6. What is Eva's to rule

1. **The basal V.** 0.025 keeps almost all of 0.000's lightness with a real stagger; 0.050 buys a
   millimetre of stagger for five points of basal wall; the shipped 0.100 is the heaviest of the
   three and the only one with two millimetres of taper.
2. **The base's cell size.** Whether three larger basal holes (`baseNarrow` 1.50) read better than
   five middling ones (1.00) or the shipped narrowed five (0.75). 1.50 costs the petal's smallest
   hole at a 1.0 mm wall and costs nothing at 0.8.
3. **The wall.** 0.8 mm against 1.0 mm, on an unprinted floor.

---

## 7. Recorded, not built

* **`baseReach` was not swept.** It is now an option (0.30 shipped — the fraction of the length the
  base narrowing relaxes over) and only `baseNarrow` was moved, because the brief asked for the
  base's RATE. A shorter reach would confine whatever the rate does to a narrower band at the base;
  it is one number and one sweep.
* **`tipGamma` was not swept either.** The tip is the part Eva has accepted and this session did not
  touch its law; the tip band is reported only so a base change cannot pay for itself there unnoticed.
* **The count `N` is fixed at 16** — the salvage doc's own reading of where this pattern reads best on
  the default petal. Every trade above is at a fixed cell count, so a grading that moves cells to the
  base takes them from the tip. Letting `N` vary with the grading is a different experiment.
* **The basal band is u 0.2857–0.45, a choice.** It is 22.4 % of the blade and it is where the eye
  reads "the bottom"; the numbers would move with a different top and the direction of every finding
  would not.
* **A hole's COUNT is by its centroid and its AREA is clipped to the band.** They disagree at high
  `converge`, where the V pushes a hole's centroid up out of the band while its area stays partly in:
  at 0.200 the band reports 1 hole by centroid and 0 solid cells, which is the V clipping holes
  rather than killing them. The area-based wall fraction is the figure to read; the counts are beside it.
* **`bloom-basal-grading.mjs`'s `state()` is imported by the sheet tool**, so its main block is guarded
  on `IS_MAIN`; an unguarded top level would run the whole 22-second sweep every time a caller wanted
  one number out of it.
