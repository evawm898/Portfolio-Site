# Parametric Bloom — TUBE: the closed-ring prototype

*Oct 1, 2026. Base `main` at `da8bf62` (#322 merged). **A prototype only. Nothing that ships moved.**
Every tracked file was sha256-recorded before the first edit and every one is identical at close
(§9); the work is two new tools, this doc and five images. Every figure is **EXPORT** mode (print
preview: the floored sheet, the 0.80 mm tip floor), RADIAL placement, read on **every row of the
petals' own ladder** (3 foot rows + 56 blade rows at `NU` 56), unless a line says otherwise.
Reproduce with `node tools/bloom-tube-ring.mjs` (216 builds, ~8 min; `--attribute` for the fold
table, `--control` for the five must-fails) and `node tools/shot-bloom-tube.mjs <dir>` (the sheets).*

---

# PART B — FUSED PARTWAY, FREE PETALS ABOVE (Eva's rulings on #323)

*Same prototype rules: a scratch builder, and every tracked file sha256-identical to `da8bf62` at
close (§B9). EXPORT throughout. Reproduce with:*
- *`node tools/bloom-tube-ring.mjs --partial` — 244 builds, ~12 min;*
- *`node tools/shot-bloom-tube.mjs <dir>` — the five partial-fusion sheets are now its default.*

*Part A below is the first round (the ring to the nib entry). Its findings stand where Part B does
not say otherwise.*

## B0. The answer

- **The STOP clause is not met.** The transition is fold-free on the default at h = 0.40 at
  **every** blend length tried (0.5, 1, 2, 4, 8, 12 and 16 mm), in both shapes.
- **Over the whole partial-fusion sweep** (244 builds, 240 with a ring): **0 boundary edges, 0
  directed-edge mismatches, 0 inward shells, one connected piece on every build.**
- **191 are fully clean**, ring and transition both. The rest fall into four attributed classes
  (§B5).
- **Partial fusion moves the curl axis fold out of the ring entirely for ROUND** — ring 0 pairs at
  curl 180, 270 and 360, at every h. **But under strong curl it lands in the blend instead** once h
  sits where the midrib is already curling toward the axis (§B6).
- **It costs fewer triangles than today at every state measured** — −2,800 at the default h = 0.40
  (§B7).
- **ROUND is clean everywhere except the inherited seam class and that curl case. STRAIGHT adds its
  crease class to the transition**, which ROUND never shows.

![h strip](img/bloom-tube-partial-h.png)

## B1. What was built

- **`buildTube(set, { h, blendMm })`.** The ring is unchanged in construction (Part A §2: through
  every midrib, ROUND or STRAIGHT, wedge slits, C = 8, the owner's `emitPanel` with the periodic
  arm). It ends at **the last row at or below u = h**.
- **Above it, every petal is today's petal.** The lobe hook (patch P3) hands `emitPanel` the
  petal's own rows, from one row below the ring's top (`PANEL_OVERLAP_ROWS`) to the tip. So above
  the blend the row objects are today's own, untouched.
- **Above the blend the petal is today's petal, bit for bit.** On the default at h = 0.40, 1,346 of
  petal 0's 1,960 emitted triangles are exactly today's. The rest are the blend rows, plus the 3 mm
  rim taper that ramps up from any panel's base end (`emitPanel`'s own ramp).
- **The extra build.** The tool now builds every state once more to collect every petal's rows, so
  the ring's curve exists at every row before any petal is drawn.

## B2. The fusion line — the blend law, and its one owner

Over `BLEND_MM` of **midrib arc length above the ring's top row**, each petal row's section is

```
theta(v) = theta_mid + v * s_half(+/-) / rho_mid     (the petal's own width laid onto the ring by ARC LENGTH)
P(v)     = R(theta(v)) + w * (own(v) - R(theta(v)))
n(v)     = normalise((1 - w) * Rn(theta(v)) + w * n_own(v))
w        = smootherstep(s / BLEND_MM)                (s = midrib arc above the ring's top row; C2 at both ends)
```

- `R` / `Rn` are the ring's own curve and unit normal at that row: the same `ringCurve`, the same
  `du × dv` and the same global sign the ring's panels are built from.
- `own` is the petal's own section, i.e. `petalSurface().rowAt(u).sect`.
- **At the ring's top row (and the overlap row below it) w = 0, so the petal IS the ring there.**
  The midrib point is the same double on both sides.
- **The owner of the line where the petal's base meets the ring's top is the ring's cross-section
  at its top row** (`ringCurve(mids, R1)`). The petal reads it; nothing else defines that line.
- **Above `s = BLEND_MM`, w = 1** and the row is today's.
- **There is no jump at h**, by construction. Position and normal are continuous, and the weight is
  C2.

**THE BLEND LENGTH IS 8 mm, AND IT IS A TRADE.** Transition pairs summed over all eight petals,
ROUND, h = 0.40:

| state | today's petals | 2 mm | 4 mm | **8 mm** | 12 mm | 16 mm |
|---|---|---|---|---|---|---|
| default, cup ±max, twist 180, tilt 75, tilt 75 × 5, curl 180, curl 225 | 0 | 0 | 0 | **0** | 0 | 0 |
| roll 330 | 13,584 | 8,440 | 7,464 | **4,808** | 3,520 | 2,080 |
| curl 270 | 0 | 328 | 136 | **0** | 0 | 0 |
| curl 360 | 920 | 872 | 712 | **248** | 240 | 792 |
| curl 270 at h 0.55 | 0 | 968 | 760 | **280** | 536 | 1,808 |
| curl 360 at h 0.70 | 920 | 3,232 | 3,984 | **4,224** | 4,304 | 4,392 |
| STRAIGHT, 6 layers | 0 | 555 | 1,237 | **5,139** | 8,122 | 9,284 |

- **8 mm is ROUND's best or tied-best on five of the six rows that move.** It is the prototype's
  default: `BLEND_MM`, overridable with `TUBE_BLEND`.
- **STRAIGHT wants it short**, because its crease is carried through every blended row (§B5,
  class C).
- **Roll, attributed by row.** Above the blend the roll fold is today's own, to ±5 pairs: petal 0
  reads 353 ours against 353 today above an 8 mm blend.
- **Inside the blend the transition carries fewer pairs than today's petal does on the same rows**:
  248 against 813 at 8 mm, 243 against 481 at 4 mm. Only a 1 mm blend adds any: 255 against 238 on
  its three rows.

![fusion line, sinus, slit](img/bloom-tube-partial-zoom.png)

**What the zoom shows.**
- Each petal widens out of the ring's rim, and the sinus is a V meeting the rim's bead.
- **A faint line reads across the petal base at the fusion row**, most visibly at tilt 60. Over the
  blend's first rows the ring's top rows and the petal's base rows are the **same surface in two
  closed shells**: a coincident overlap, which the export contract unions. It is not a fold (0
  pairs), and it was not measured further.

## B3. The crossing band (discovery: u 0.161–0.323 on the default)

ROUND; STRAIGHT is within 0.04 mm. "Crossed rows" uses discovery §2a's plan gap, computed on the
petals' own margins row by row from the ring's top up.

| h | ring top u | sinus at the ring's top | crossed rows above h: ours / today | ring / transition pairs |
|---|---|---|---|---|
| 0.10 (below the band) | 0.089 | **+1.67 mm** | 11 (u 0.143–0.323) / 10 | 0 / 0 |
| 0.15 (at its foot) | 0.143 | −0.25 mm | 11 / 10 | 0 / 0 |
| 0.25 (inside) | 0.250 | **−1.61 mm** | 6 (u 0.250–0.343) / 5 | 0 / 0 |
| 0.30 (inside) | 0.286 | −1.40 mm | 4 / 3 | 0 / 0 |
| 0.40 (above) | 0.385 | **+0.61 mm** | **0 / 0** | 0 / 0 |
| 0.55 | 0.533 | +5.36 mm | 0 / 0 | 0 / 0 |
| 0.70 | 0.681 | +11.17 mm | 0 / 0 | 0 / 0 |

- **Below the band**, the free petals above cross exactly as they do today. The rows are today's
  rows, and the margins pass inside each other buried in the sheet, as the builder's own flag
  already reports on every build.
- **Inside the band**, the ring absorbs the part below h. **The petals overlap each other at the
  ring's top edge** (negative sinus: no V opens between them), and the rest of the band crosses as
  today.
- **Somewhere between h 0.30 and 0.40 (not resolved finer), the crossing stops**: from h 0.40
  up nothing crosses and every sinus opens.
- **The one extra crossed row is always inside the blend.** Laying the petal's width onto the ring
  by arc length spreads it slightly further round than the flat petal reaches, so the band's edge
  moves by one row (0.343 instead of 0.323). It is a buried cross-shell overlap between neighbouring
  petals, not a fold. At a 4 mm blend it does not appear (h 0.25: 5 rows on both).
- **None of this is a regression**: these are cross-shell overlaps between separate closed petals,
  allowed by the export contract and already present today.

## B4. The petals still respond above the line

`img/bloom-tube-partial-form.png`: the h strip at cup 1.2, roll 330 and twist 180 (maxima), in both
shapes. Cup, roll and twist act fully above the line — the rows above the blend are today's own. The
ring itself stays bit-identical under all three (Part A §5).

![form above the line](img/bloom-tube-partial-form.png)

## B5. Everything that folds, attributed

**A. The seam turn past ~95°** — inherited, independent of h.
- Tilt 105 (ring 318 / 272 pairs) and `headRise` 1 (316 / 269), at row 3 (u 0.018), at every h.
- The free bloom folds there too: today's petals 384 / 248.
- And the transition reads 0, because the folding rows are now ring.

**B. Strong curl in the blend** (§B6). This is the one way ROUND transitions fold beyond today's
petals.

**C. STRAIGHT's crease off a column** — Part A §3's mechanism, now in two places:
- **The ring's slit panels**: 6 layers k 2, 681 pairs; 40 × 6 k 2 / k 20, 140 / 1,840 pairs.
- **The transition**: STRAIGHT 6 layers, 4,104–7,743 pairs across h; 40 × 6, 3,288; 3 layers at h
  0.7, 789; length 20 at h 0.7, 253. Today's petals read 0 on all of these.
- The blended section carries the ring's crease at v = 0, and **the petal's own 10 columns put no
  column on v = 0**, so the crease always lands between columns.
- **ROUND reads 0 on every one of these states.**

**D. Roll ±330** — today's own declared petal fold, carried and **reduced** (13,584 → 4,808 at h
0.40; 0 at h 0.70). §B2 attributes it row by row.

## B6. Curl: does stopping the ring lower move the axis fold?

**Yes for the ring, no for the petals at high h.**

| curl | ROUND ring, h 0.25 / 0.40 / 0.55 / 0.70 | transition, same h | today's petals |
|---|---|---|---|
| 180 | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 | 0 |
| 270 | 0 / 0 / 0 / 0 | 0 / 0 / **280 / 9,000** | 0 |
| 360 | 0 / 0 / 0 / 0 | 0 / 248 / **1,456 / 4,224** | 920 |

- **In Part A the ring folded from curl ~180 because the midribs reach the axis near the tip.** A
  ring that stops at h ≤ 0.70 never reaches those rows, so **the ring's axis fold is gone for ROUND
  at every h**. STRAIGHT keeps 250 pairs at curl 360, h 0.70.
- **Where it goes instead: into the blend, if h sits where the midrib is already curling inward.**
  Every pair of curl 270 at h 0.70 lies on the blend's rows (located at a 4 mm blend: rows 35–38,
  0 above the blend; the midrib radius there falls to 0.15 mm).
- **The arc-length mapping is the reason.** The petal's width laid onto a ring of tiny radius wraps
  round the axis, so the section folds through itself.
- **Low h is safe at every curl.** At h 0.25 the transition is clean at every curl. At h 0.40 it
  is clean through curl 270, and curl 360 reads 248, a quarter of today's 920.

## B7. Cost (EXPORT triangles)

| state | today | h 0.25 | h 0.40 | h 0.55 | h 0.70 |
|---|---|---|---|---|---|
| **default (8 petals), k 0** | 24,688 | 23,008 (−1,680) | **21,888 (−2,800)** | 20,928 (−3,760) | 19,968 (−4,720) |
| 5 petals, k 0 | 15,502 | 14,452 | 13,752 | 13,152 | 12,552 |
| 12 petals, k 0 | 36,936 | 34,416 | 32,736 | 31,296 | 29,856 |
| 8 × 3 layers | 73,680 | 68,800 | 65,280 | 62,400 | 59,360 |
| 8 × 6 layers | 147,168 | 138,688 | 131,328 | 124,928 | 118,048 |
| 40 × 6 layers (densest) | 735,072 | — | 655,872 (k 0) · 660,432 (k 2) · 701,472 (k 20) | — | — |

- The ring replaces the bottom h of every blade with a cheaper sheet: **lower h saves less**.
- **Each slit adds 396 triangles** at h 0.40: two bead runs, half Part A's 844, because the ring is
  shorter.
- ROUND and STRAIGHT are identical to the triangle.

## B8. The sheets

| file | what it shows |
|---|---|
| `img/bloom-tube-partial-h.png` | h 0.25 / 0.40 / 0.55 / 0.70 on the default and on 5 petals at tilt 60, ROUND then STRAIGHT, one camera per row |
| `img/bloom-tube-partial-form.png` | the same strip at cup 1.2, roll 330 and twist 180 |
| `img/bloom-tube-partial-round.png`, `img/bloom-tube-partial-straight.png` | the n × k grid at h 0.40 |
| `img/bloom-tube-partial-zoom.png` | the fusion line on one petal (n 8, and n 5 at tilt 60), a sinus, a slit |

- **Every caption carries the ring's and the petals' own self-intersection counts.**
- The renders are deterministic soft renders in EXPORT mode with a fixed camera and no chrome, so
  no pixel delta is quoted.
- **Facets are not visible at C = 8** on any of the sheets, so C stays.

![ROUND grid at h 0.40](img/bloom-tube-partial-round.png)
![STRAIGHT grid at h 0.40](img/bloom-tube-partial-straight.png)

## B9. Close

- All 691 tracked files at `da8bf62` are sha256-identical. The tools, the doc and the images are the
  only changes, and they are all additions to #323's branch.
- `--control` still fires all five must-fails (39,559 / 10 / 1 / 3 / 32,453).
- Fusion to the nib (no `h`) still builds Part A's default to the triangle (17,408).

## B10. Questions for Eva (batched; the first two are the ones asked)

1. **Which h should be the default?**
   - **0.40 is the lowest ruled value that is fully clean on the default.** Above the crossing band,
     no petal crosses its neighbour, every sinus opens (+0.61 mm), the blend is clean at every
     length, and the transition is clean through curl 270. It costs −2,800 triangles.
   - **0.25 sits inside the band**: the petals overlap at the ring's top edge, so there is no V
     between them.
   - **0.55 / 0.70 read as a deeper cup**, and fold in the blend under strong curl.
   - The look is yours: see `bloom-tube-partial-h.png`.
2. **ROUND or STRAIGHT?**
   - **ROUND** is clean everywhere except the inherited seam class and strong curl at high h.
   - **STRAIGHT** adds the crease class in both the slit ring and the transition. Fixing it means
     changing `emitPanel`'s rim inset to keep knot columns, and putting a petal column on v = 0.
     It also still thins to 0.97 mm at 5 petals.
3. **The curl-at-high-h case.** Pick one:
   - accept it, declared;
   - clamp h below where the midrib turns inward (a derived bound — the meridian's own minimum
     radius is the measure);
   - cap the arc-length mapping's angle at the sector.
4. **The blend length.** Should it stay a typed 8 mm, or be derived, e.g. from the petal's width at
   h? It is the one new constant here.
5. **The coincident overlap at the fusion line** (ring top rows and petal base rows, one surface in
   two shells). Acceptable as unioned overlap, or should the ring's top rows under each petal be
   trimmed?

WAITING ON EVA (default fusion height + ROUND or STRAIGHT).

---

# PART A — FUSED TO THE NIB (the first round)


## 0. The answer

**Neither STOP clause is met.** On the shipped default the ring has **0 within-shell
self-intersection pairs in both ROUND and STRAIGHT at every valid k**, and its lower edge sits
**inside the hub on every layer of every state measured** — it is built from the petals' own foot
rows, so no new plumbing was needed. Over 204 ring builds: **0 boundary edges, 0 directed-edge
mismatches, 0 degenerate triangles, one connected piece every time.** 157 are clean. The 47 that
fold fall into exactly three classes (§3), and only one of them is new: **when spine curl brings
the midribs to the axis (curl ≥ ~180), a sheet through every midrib has to pass through the axis.**
The free bloom is clean there today.

**The ring costs fewer triangles than the blades it replaces, on every state measured** (−4,550 at
5 petals, −7,280 at the default 8, −151,520 at 40 × 6 layers; §4).

**And the ring removes the petal from the picture.** It reads only the midribs, so the blade's
OUTLINE never appears in it, and cup, roll and twist are inert — the ring is **bit-identical** under
cup, roll and twist at maximum (§5). Width still reaches the ring, but only through the hub: the area
rule sizes the ring radius from the feet. The fused region runs to the nib entry
(u 0.9889 at the default), where the blade is only 1.6 mm wide. So the "lobes" are n small points on
a plain round or polygonal mouth. That is the look question this doc ends on (§8, Q3), and it comes
before ROUND vs STRAIGHT.

![ROUND](img/bloom-tube-round.png)

---

## 1. Premises checked

| premise | checked how | result |
|---|---|---|
| #322 merged; the discovery doc and its instrument are on `main` | `git log`, `ls` | `da8bf62`; both present |
| neighbouring margins cross on the default (u 0.161–0.323) | re-ran `node tools/bloom-fusion-margins.mjs` | **reproduces to the digit**: 10/56 rows, u 0.161–0.323, plan min −0.83 mm at u 0.232, live and export alike |
| the ring row's chord sits outside the hub (discovery §5) | the same run, plus this tool's hub test (§6) | reproduces (0.857 mm, `nnn`); **the ring does not stop there** — it continues down the feet |
| the nib entry is `tipCap.apex.xLawMm / drawnLengthMm` | read off every built petal | u 0.98892 at the default; the ring's last row is the last strictly below it (row 51 of 59) |
| "ring thickness = petal body thickness" | the ring's `tAt` is the petal's own per-row `tUsed` | 1.20 mm at the default sheet |
| `emitPanel` / `emitRimLoop` can be called as they stand | read the source | **No.** Neither is exported, `NV = 10` is a module constant, and there is no periodic panel. See §2 — the k = 0 case needs an owner change, and that is the main architectural finding. |

---

## 2. What was built, and how it reaches the owner without touching it

`tools/bloom-tube-ring.mjs` reads `bloom-geometry.js` **as text**, applies anchored patches (each
must match exactly once or the tool refuses — the mutant table's discipline), writes the result to a
temp file and imports that. The shipped file is never written.

| patch | what it does | why |
|---|---|---|
| P1 | `NV` becomes `let`, with `__tubeWithNV(n, f)` | the ring carries C × n columns (C = 8 per petal sector); every petal still builds at 10 |
| **P2** (six hunks) | `emitPanel` accepts `panel.periodic`: columns wrap, no side inset, and the rim is **two closed loops** (bottom, top) through the owner's own `rimProfile` + `emitRimLoop` | **a k = 0 tube cannot be expressed through the shipped `emitPanel`.** P2 is the exact delta it needs — about 15 lines. This is what a shipped TUBE costs `emitPanel` (the bell doc called it "the largest change to `emitPanel`"; measured, it is small). |
| P3 | `buildPetalInto` honours `cap.tubeLobe(rows)`: the blade is emitted as one panel from that row to the tip, and the rows are returned | the petal becomes its own lobe; the ring reads the petal's own sections |
| P4 | `emitPanel`, `rimProfile`, `emitRimLoop` exported | so the ring calls the owner |

**The edge profile is the owner's code, called and never copied**: taper, bead, K = 4, the 1.0 mm
floor, the inset bisection and the exposed-tip apex ring all run inside `emitPanel` itself. The
ring's bottom edge is buried (its first rows are the feet, u = 0) and gets the flat wall, exactly as
a petal's foot does. The top edge is exposed and gets the bead. Slit edges are panel margins and get
the bead.

**The ring's cross-section at row r** passes through the n midribs `tubeRows[r].sect(0).P` — the
petal's own section, the same double the petal draws its midrib through.
- **ROUND**: a periodic Catmull-Rom on (ρ, z) against azimuth; azimuth itself is exact.
- **STRAIGHT**: straight chords between consecutive midribs.

A column lands on every midrib. Residual against the midrib: **at most 1.1e-13 mm over all 204
builds** (it is not 0 because the azimuth goes through `atan2`). The normal is `du × dv` with **one
global sign** per ring, fixed at the ring row, where twist is exactly 0.

**The lobe join has one owner: the petal's own rows.** The lobe is the petal's panel from one row
below the ring's top (`PANEL_OVERLAP_ROWS`, the cleft/fringe precedent) to the tip, and its base
gets the flat-wall treatment `emitPanel` gives every buried panel end. The ring's top row meets that
same petal's midrib at the same double. The overlap is a by-design cross-shell overlap. Remove the
ring and the lobes detach — the flood fill reads 10 pieces (§7, control 2) — so the ring is what
holds them.

**Defaults this prototype set, not ruled** (flagged):

- C = 8 columns per petal sector.
- A slit is a **wedge** whose width is `MIN_FEATURE_MM` at the ring row's radius, so it opens
  toward the mouth (8.84 mm ring → 6.5°; about 4.5 mm wide at the mouth of the default).
- k = n builds today's FREE bloom through the shipped path, with no capability.
- Mixed per-layer k is refused, because the prototype passes one capability for all layers. The
  divisor list is shared by construction (`petalCount` is shared by every layer).

---

## 3. Self-intersection — the ring's own shells, each censused ALONE

`tools/bloom-self-intersection.mjs`'s `census`, the discovery's instrument. Cross-shell overlap with
the hub and the lobes is the export contract's own and is not counted.

**Clean (0 pairs) in BOTH shapes at EVERY k** on:
- petal counts 5, 6, 8 and 12 at the shipped form;
- tilt 60, 75 and 90 × 5, 8 and 12 petals;
- curl −180, −90 and 90;
- cup at its maximum and minimum, roll at ±330, twist at 90 and 180;
- width 30, length 20 and 60, sheet 2.4;
- tilt 75 combined with cup 1.2, with roll 330, and with curl −180;
- `headRise` 0.5;
- 2 and 3 layers, and ROUND at 6 layers;
- 40 × 6 layers ROUND;
- the ring run to the TIP.

The ring run to the tip is a control: the discovery's web folded at the apex nib on every state, and
the ring does not.

**The 47 folded builds, attributed** (`--attribute`: each pair's site mapped to the nearest meridian
row; the free bloom censused at the same state for comparison):

| class | states | ring pairs | where (row / u) | the meridian says | free bloom today |
|---|---|---|---|---|---|
| **A. seam turn past ~95°** — the petal's own declared EFFECTIVE TILT PAST 90 class | tilt 96–102; tilt 105 × 12; `headRise` 1 (turn 109°); innermost layer of tilt 75 × 12 × 3 layers (99°) | 269–478 | row 3, u 0.018–0.036, every pair | seam turn = 96–109° | **also folds** — 360 pairs at tilt 93, 392 at 96–102, 248 at `headRise` 1, 564 at tilt 75 × 12 × 3 |
| **B. the midribs reach the axis** — NEW | curl 180 (STRAIGHT only), curl 195–360, tilt 105 × 5/8, tilt 120, tilt 75 × curl 360 | 164 – 28,251 | the mouth / mid-blade, at the u where ρ is smallest | minimum midrib radius **0.01–0.26 mm**; curl 360 also returns to its own base (0.60 mm, under one sheet) | **clean at curl 180 and 270** (0 pairs); 920 at curl 360 |
| **C. a STRAIGHT crease off a column** | STRAIGHT with slits on the inner layers of a 6-layer bloom (k 2: 86 / 629 pairs on layers 4 / 5); 40 × 6 STRAIGHT k 2 / 20 (70 / 1,840) | 70 – 1,434 | **100% of pairs within 0.1 sector of a midrib crease** (median 0.002–0.012) | — | 0 |

**Onsets, at slider resolution** (n 8, k 0):
- **Curl**: clean to **165** in both shapes. **Folds from 180 in STRAIGHT** (213 pairs) and from
  **195 in ROUND** (15,541), as the minimum midrib radius falls 8.84 → 2.16 → 0.06 mm.
- **Tilt**: clean to **93**, folds from **96** (319 / 272 pairs) — after the free bloom, which
  already reads 360 pairs at 93.
- **Negative curl**: clean to −180 in both.

So class A is not the ring's fault, and the ring makes it no worse.

**Class B is a real limit of the construction, not a defect to tune.** A sheet through every
midrib must pass through the axis when the midribs converge on it. At curl 150–180 that closes the
corolla into a ball (`tube-strips.png`, row 2), and past it the sheet folds. It narrows the clean
curl range from today's (clean to 270) to 165 under a TUBE.

**Class C is STRAIGHT's own.** `emitPanel`'s rim inset re-spaces the skin columns uniformly in v.
Once an inset is applied (any slit panel), a crease no longer lands on a column, and the two skins'
offsets on either side of it cross on the inside of the corner. The evidence:
- k = 0 has no side inset and is clean;
- ROUND has no crease and is clean;
- doubling C makes it **worse** (layer-6 k 2: 629 → 845 pairs), because finer columns put samples
  closer to the crease.

A shipped STRAIGHT would need the inset to preserve knot columns, or a mitred crease — an owner
change either way. STRAIGHT also thins the wall at every crease to cos(π/n) of the sheet, derived
and not measured: **0.97 mm at n 5** (under the 1.0 mm floor), 1.04 at 6, 1.11 at 8, 1.16 at 12, on
the 1.2 mm sheet.

---

## 4. Cost — the ring minus the blades it replaces

EXPORT triangles. Each ROUND and STRAIGHT pair is identical to the triangle, by construction (same
lattice).

| state | FREE (today) | k = 0 (tube) | Δ | one slit | k = largest proper divisor |
|---|---|---|---|---|---|
| 5 petals | 15,502 | 10,952 | **−4,550** | 11,796 (−3,706) | — |
| 6 petals | 18,564 | 13,104 | −5,460 | 13,948 | k 3: 15,636 (−2,928) |
| **8 petals (default)** | **24,688** | **17,408** | **−7,280** | 18,252 | k 4: 20,784 (−3,904) |
| 12 petals | 36,936 | 26,016 | −10,920 | 26,860 | k 6: 31,080 (−5,856) |
| 8 × 2 layers | 49,184 | 35,040 | −14,144 | — | k 2: 38,416 |
| 8 × 3 layers | 73,680 | 53,152 | −20,528 | — | k 2: 58,120 |
| 8 × 6 layers | 147,168 | 116,864 | −30,304 | — | k 2: 125,648 |
| **40 × 6 layers (densest eligible)** | **735,072** | **583,552** | **−151,520** | — | k 2: 592,336 · k 20: 671,392 (−63,680) |

**Cost goes DOWN everywhere.** One ring of C = 8 columns per sector replaces n blades of 10 columns
plus n perimeter beads. Each slit adds two bead runs: **+844 triangles per slit** at the default
ladder, independent of n. The ring alone is 13,184 triangles at the default. `ALL MAX` is
FRINGE-carrying and is not eligible (discovery §8 Q6), so it does not move. At C = 8, the ROUND
mouth's chord sagitta at the default is ~0.12 mm at its widest — under print resolution — so C need
not rise.

---

## 5. Which controls the ring reads

- **Read** (through the midrib): tilt, length, spine curl and its bias / start, the dome, layers and
  the area rule.
- **Inert, measured — the ring's every float `Object.is`-identical to the default's**: cup at its
  maximum, roll at its maximum, twist at its maximum, in both shapes (`tube-strips.png`, row 3).
  These controls move only the lobes.
- **Width is NOT inert, and the first draft of this doc said it was.** Width 30 builds the
  default's triangle count exactly, but its ring is not bit-identical. Measured, it moves in two
  ways:
  - the hub's **ring radius goes 8.845 → 11.056 mm** (the area rule sizes the ring from the foot
    widths), so the whole ring sits on a larger base — up to 2.23 mm off the default's meridian;
  - the turning-rate ladder re-places the rows (max |Δu| 0.0068, top row u 0.9830 → 0.9858),
    because the stations are a function of the outline.

  What never reaches the ring is the blade's own cross-section width at any u. "The outline is
  inert" is true of the surface's SHAPE across a sector and false of where the ring stands.
  Taper and tip shape act through the same two routes and were not measured separately.

**Twist**: inert in the ring. Recorded because the first cut said otherwise. The ring had folded at
twist 90 and 180 (338–648 pairs, an inward shell), on a ring whose midribs had not moved — the
residual was identical to the default. The cause was the instrument's own orientation. Each point
had been aligned to the nearest petal's normal, and twist rotates that normal. One global sign
fixed it, and twist is 0 pairs now.

---

## 6. The hub

The ring's rows are the petals' own rows, so its first three are the **feet**: rows 0 and 1 run
inward under the hub, and row 2 is the ring row (u = 0). Each row's section was sampled at 96
azimuths and tested by ray parity against the hub, built alone with the shipped `buildHubInto`
(the discovery's §5 construction).

| state | row 0 (innermost foot) | row 1 | row 2 (ring row) |
|---|---|---|---|
| 5 / 8 / 12 petals | 95–96 / 96 inside | 95–96 | ROUND 23/96 · STRAIGHT 89–95/96 |
| `headRise` 0.5 / 1 | 96 / 96 | 95–96 (STRAIGHT at rise 1: 71) | ROUND 41 / 96 at 0.5, 96 at 1 |
| 3 layers, each layer | 95–96 / 96 | 95–96 | outer as above; inner 96/96 |
| 6 layers, each layer | 95–96 / 96 | 96 | outer as above; inner 96/96 |
| 40 × 6, each layer | 96 / 96 | 96 | outer ROUND 23 · STRAIGHT 75; inner 96 |

- **The lower edge — row 0 — is inside the hub on every layer of every state.** That is a different
  answer from the web's (discovery §5), whose edge stopped at the ring row and hung 0.55 mm outside
  the rim. The ring continues down the feet, as the petals do.
- **The ROUND ring row is a circle of exactly the ring radius at z = 0, which is the hub's rim**. So
  ray parity on a point on the boundary reads ambiguous (23/96 — a grazing tie, not "outside").
- **STRAIGHT's polygon dips inside the rim** between midribs.
- **The ring's foot rows lie coplanar with the hub slab**, as the petal feet already do (CLAUDE.md:
  "a foot's bottom skin is COPLANAR with the hub's underside").
- **Connectedness**: one piece on all 216 builds (the shipped gate's own voxel flood fill at 0.6 mm,
  sliced from `verify-bloom-connectedness.mjs`).
- **No new plumbing on any layer**, so STOP clause 2 is not met.

---

## 7. Instrument self-checks (`--control`, all five fire)

| must-fail | reads |
|---|---|
| census on a ring with two rows swapped (40% / 70%) | 39,559 pairs |
| flood fill on a ring lifted 40 mm | 10 pieces (the hub, the ring and 8 lobes: the lobes hang on the ring alone) |
| orientation on a ring wound inward | 1 inward shell |
| boundary census on a ring missing one triangle | 3 boundary edges |
| census on a folded STRAIGHT k 2 slit-panel set | 32,453 pairs |

Two of the stops were also confirmed with independent evidence:
- The pairs' rows (§3) and the free-bloom census at the same states were cross-checked.
- The discovery's own instrument reproduced its premise.

---

## 8. The sheets

- `img/bloom-tube-round.png` and `img/bloom-tube-straight.png`: rows n 5 / 6 / 8 / 12, columns
  every valid k. **Every caption carries the ring's own self-intersection count and the triangle
  count beside FREE.**
- `img/bloom-tube-strips.png`: tilt 60 / 75 / 90; curl 0 / 180 / 360 (the ball at 180 and the fold
  at 360); cup, roll and twist at maximum with "RING BIT-IDENTICAL" measured on the cell.
- `img/bloom-tube-zoom.png`: a slit edge (n 8, k 4), a lobe join (n 5, tilt 60), and the base as a
  3 mm cutaway slab about petal 0's meridian (one layer and three). Print preview on (EXPORT).
- `img/bloom-tube-vs-web.png`: the discovery's web (straight and round, body thickness) beside the
  ring (ROUND and STRAIGHT) on 5 petals at tilt 60 — the one clean state for the web — on one camera.

All are deterministic soft renders (`bloom-soft-render.mjs`) with a fixed camera, no rotation and
no page chrome, so no pixel delta is quoted.

![STRAIGHT](img/bloom-tube-straight.png)
![strips](img/bloom-tube-strips.png)
![zoom](img/bloom-tube-zoom.png)
![ring vs web](img/bloom-tube-vs-web.png)

**What the pictures say, plainly:**

1. **The petals are gone.** The web keeps each petal's oval visible on a corolla. The ring is a
   plain funnel (ROUND) or faceted pot (STRAIGHT) with n 1.6 mm points on the rim.
2. **STRAIGHT** reads as a polygonal cup with the midribs as ridges. **ROUND** reads as a
   morning-glory funnel without its lobes.
3. **Slits read as V-wedges** opening toward the mouth.
4. **Curl 180** closes the corolla into a ball.

---

## 9. Close — what was touched

All 691 tracked files at `da8bf62` were sha256-recorded before the first edit and **all 691 are
identical at close**. Added:
- `tools/bloom-tube-ring.mjs`
- `tools/shot-bloom-tube.mjs`
- this doc
- `docs/img/bloom-tube-{round,straight,strips,zoom,vs-web}.png`

Shipped geometry, registry, app, harness and gates are untouched; flower files are untouched. No
gate imports either new tool and no workflow names them. Note: the flower workflows are
path-filtered on `tools/**`, so they will run on this PR and test flower geometry only.

---

## 10. Questions for Eva (batched; the first two are the ones asked)

1. **ROUND or STRAIGHT?**
   - ROUND: clean everywhere outside classes A/B, costs nothing extra in `emitPanel`'s inset.
   - STRAIGHT: needs an owner change to the rim inset (class C) and thins to 0.97 mm at 5 petals.
2. **Ring or web?**
   - The ring: never crosses, is cheaper, and reaches the hub with no plumbing.
   - The web: keeps the petal shapes readable (`tube-vs-web.png`) but folds on the shipped default
     (discovery).
3. **The look the ruling implies: is a corolla with no visible petals what TUBE should make?**
   - With fusion to the nib entry, the blade outline never appears, cup, roll and twist are inert,
     and the lobes are 1.6 mm points. Width reaches the ring only through the hub radius.
   - A fusion fraction below the nib (e.g. to u 0.6, real petals above it) would bring the lobes
     back. It needs a lobe-base join that is wider than a nib, which this prototype did not build.
4. **Curl under a TUBE.** Class B narrows the clean curl range from 270 to 165. Options:
   - refuse (hide) TUBE above the onset, told;
   - clamp curl when TUBE < n;
   - accept the ball-closing look and declare the fold above it.
5. **The slit's shape.** The prototype's slit is a wedge, 1.0 mm at the ring row and opening toward
   the mouth. The alternative is a parallel 1.0 mm slot (wedge vs slot).
6. **Columns per sector** C = 8 (ROUND sagitta ≈ 0.12 mm at the default mouth) — keep, or derive
   from a chord bar?
7. **The `emitPanel` periodic arm (P2)** is the k = 0 owner change. Confirm it is acceptable as the
   route, rather than a separate ring emitter.

*Part A's questions 2, 3, 5, 6 and 7 were ruled on #323. Question 1 (ROUND or STRAIGHT) and
question 4 (curl) carry into Part B.*
