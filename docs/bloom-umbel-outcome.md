# The umbel — outcome (Oct 22)

Eva's rulings of Oct 21–22: the spider lily. Florets on pedicels radiating
from ONE junction at the top of the stem, with the head an optional toggle that
ships OFF. This document is the record of what was measured, what was built,
what was declared rather than fixed, and what is open for Eva.

## 1. The raceme probe first (the ruling's own first step)

Before a line was written the raceme was asked how close it already gets:
`inflorescence RACEME`, `floretNodes 1`, `floretPhyllotaxy whorled`, a 120 mm
stem, the shipped defaults otherwise (measured, Node, EXPORT, `probe1.mjs` in
the session scratchpad):

* **It builds exactly three florets, at 0 / 120 / 240 deg** — `whorled` is the
  leaves' law, three a node, and nothing reaches any other count.
* **The one node sits 66 mm down the stem** (`LEAF_NODE_SOLO`, 0.55 of the
  length), not at the top, and its pedicels are **rooted in the stem WALL** at
  r 2.25 mm (`rodWallRootMm`), each through its own hole.
* **The head is always there**: a raceme is a terminal head with florets under
  it; nothing turns the head off.

So the raceme reaches "three florets on one node" and nothing else the spider
lily needs: not the count, not the top of the stem, not the junction, not a
headless stem. **What was built is exactly the missing part** — one new TYPE of
the existing inflorescence plan (`inflorescence: UMBEL`), never a second
inflorescence law: the plan, the floret build, the per-unit memo, the
placement, the pedicel's area rule, the reach inset and the approach measures
are all the raceme's own, asked on ONE node.

## 2. The controls

| control | values | default | what it is |
|---|---|---|---|
| `inflorescence` | NONE / RACEME / **UMBEL** | NONE | UMBEL is the third value |
| `umbelFlorets` | 2–12 | **6** | NEW — the umbel's own count (`floretNodes` is a raceme's node count and `floretPhyllotaxy` its arrangement; neither means anything on one evenly spread node, so they hide under UMBEL rather than being reused) |
| `umbelHead` | **OFF** / ON | **OFF** | NEW — the spider lily has no head |
| `pedicelLength`, `pedicelAngle` | unchanged | 20 mm, 35 deg | read as they are on a raceme |
| `floretPetals`, `floretScale`, `nodeVariance` | unchanged | | the floret's own |

`floretNodes`, `floretPhyllotaxy`, `pedicelCorymb` and `pedicelGradient` are
RACEME-only (`racemePresent`) — hidden and inert under UMBEL, by ONE predicate
in each file. With the head OFF the petal count (`petalCount`), the scope
toggles and every head-only control hide (`headPresent`); the PETAL SHAPE
controls stay, because they still define every floret through `floretState`,
and **the Petal section's own label says so**: `Petal — the head is off: these
shape the umbel's FLORETS` (a derived section label, the hood's mechanism).

## 3. The junction knot — derived, never typed

**[Oct 23: the SPHERE below is SUPERSEDED by the boss, §9 — the ring `rho` and
its two gaps are unchanged; the solid built around it is.]**

The pedicels root on a horizontal ring about the knot's centre, at the whorl
law's own evenly spread azimuths (`buildWhorlInto`'s RADIAL arm — no third
azimuth owner). Two lengths decide the ring, both from radii:

* **one printable gap between neighbours**: `ringRho = (rP + gap/2) / sin(pi/n)`
  — the case the gap is for is 90 deg, where every pedicel is VERTICAL and
  parallel to its neighbours along its whole length (exact tangency would share
  a line of vertices: measured on paper at n = 2);
* **with the head ON, one printable gap off the stem** that runs on past the
  knot to the head: `stemRho = outerR + rP + gap`. Measured before it was
  derived: 623 within-shell pairs on `UMBEL: 6 florets at 90 deg, head ON`, the
  six pedicels standing inside the stem wall above a 6 mm stem's knot. With the
  head OFF the stem ENDS at the knot and nothing runs beside the pedicels.

`rho = max(ringRho, stemRho)`, and the KNOT is the sphere of radius
`rho + rP + gap/2` about the ring's centre — half a printable gap past the least
sphere holding every pedicel's root disc, so every pedicel is rooted inside
solid by construction and its edge never lies ON the knot. The least sphere was
built first and is an exact tangency at each disc's outermost point, where the
two emitted surfaces can share a double and weld into one shell: measured, 749
within-shell pairs on `UMBEL: 6 florets at 90 deg, head ON`, every one at that
point; half a gap in, 0. `rP` is the raceme's own area rule read downward from
the ASKED count.

* **Head OFF**: the knot's centre is the stem's own TOP end (`topZ`); the stem
  ends there. The florist's cut stays on the FREE end, untouched (UM4).
* **Head ON**: the knot sits on the stem at the reach-inset law's depth (the
  florets' highest point one printable gap under the head's lowest material),
  floored at the raceme's own bottom bound.

Knot radii on a 6 mm stem, head OFF: n 2 — 5.243 mm, n 6 — 6.000 mm,
n 12 — 9.727 mm (the least sphere plus half a gap).

## 4. Budget, before building

The worst corner the controls reach — 12 florets x 12 petals x floret scale
1.00, head ON, on the 120 mm stem — was costed before the builder existed:
**1,381,266 export triangles, 92.1 % of the 1,500,000 budget** (one floret
build, twelve appends: O(1) in the count). It is a matrix row
(`UMBEL: SIZE CORNER`).

## 5. Reachability of the spider lily's own features on a floret

The floret is the head's own build through `floretState`, which pins only
what an inflorescence must pin (`PEDICEL_PINS`: the floret's own stem nodes and
cut, its own leaves, its own inflorescence). None of the three features is
pinned:

* **recurved narrow petals**: `petalSpineCurl` negative (−180 on the row) with
  `petalWidth` 8 — reaches every floret;
* **a buckled margin**: `buckleAmp` 0.4 / `buckleFreq` 5 — reaches every floret;
* **long upturned stamens**: `stamenCount` 6, `stamenLength` 70, `stamenCurl`
  60 — reaches every floret.

`UMBEL: THE SPIDER LILY` is the row that holds all three at once, head OFF.

## 6. Gates

* **UM0–UM4** (`umbelClauses`, both STL gates, every inflorescence row): UM0
  the head toggle's two statements (registry `headPresent`, geometry
  `umbelHeadIsAbsent`) both ways and the artefact; UM1 the knot RESTATED from
  the controls and the stem's radius against the EMITTED knot; UM2 every
  pedicel's emitted root disc inside the knot, at `i 2pi/n`, on the ring; UM3
  the knot on the stem's top end (OFF) or on the stem below the head (ON); UM4
  the cut on the free end.
* **The ID family** reads the umbel: ID1/ID2 count the knot's triangles and
  the umbel's one node; ID9 (e) the umbel's inset and (d) is not asked of a
  headless umbel (there is no head to clear); ID10's pair classes are the
  umbel's own (every pair on one node).
* **ST9** names every pedicel (the rod list) AND the knot (its own declared
  triangle range), never a region; a headless umbel has no sphere channel.
* Head-only families (form telemetry, J, ST4+, JS, JG, SP, Z, VS5, coverage,
  crowding) stand down on a headless build by the hub's own `absent` record —
  UM0 is what holds that record true.
* **Four mutants** in the apex table, each with a witness on the mutated
  module: the pedicel rooted off the junction, the head built while toggled off,
  a typed knot, the umbel on the cut end. **[Oct 23: five — the typed knot is
  re-anchored onto the boss's rim (`the-boss-radius-is-typed`) and a typed band
  height added (`the-boss-height-is-typed`); §9.]**
* **Panel route (ap)** (THIRTY-THREE routes): the umbel controls appear and the
  raceme's hide under UMBEL, the head-off label, two registry mutants.

## 6b. A pre-existing defect found on the way — the inflorescence read-outs

`bloom.js` hands every control's `fmt` a `shown` record of the build on screen,
and **on `main` that record never carried the inflorescence plan**. So the
`Type` read-out said *"a raceme — but there is no stem to carry it, so nothing
is built"* on EVERY raceme with a stem, the pedicel read-outs never quoted
their plan's numbers, and **the gradient cap's hatch on `pedicelGradient`
(build 3's ruling 2, "hatched on the control") was never drawn** — its `cap`
reads `shown.inflorescence.gradientMax`. Panel route (ap) found it (its
"the read-out says there is no head" clause read the stem line). Fixed by
adding `inflorescence` / `inflorescenceBuilt` to `shown`; read-out only, no
byte moves.

## 6c. What was measured (local, this tree)

* **Export gate, block 78**: PASS, 27 of 27 rows watertight, 0 degenerate,
  live and export counts equal.
* **Connectedness, block 78**: PASS, 27 of 27 one connected body — every
  pedicel reaches the knot at 2 / 5 / 6 / 7 / 12 florets and at -60 / 35 / 90
  deg (UM2 asserts the root disc inside the knot on every row).
* **Apex mutants**: the four umbel mutants each fire what they name (with the
  ID collateral their mutation genuinely causes), the clean tree silent; the
  raceme's `the-pedicel-roots-on-the-axis` was RE-ANCHORED (its line gained the
  umbel arm — the anchor scan said so before anything ran) and still fires ID2.
* **Panel gate**: PASS; `--negative-control` — all THIRTY-THREE routes observed
  their failure, route (ap)'s two mutants among them.
* **Byte partition** (`verify-bloom-surface-bytes --base <89bb3bf> --movers-predicate
  umbel`, both modes, two ranges merged — re-run after merging T3): **25 movers /
  1,527 holders, 0 floats moved on any holder** over 1,860,556,356 export floats
  and 82,324,856 captured-grid values; every predeclared mover moved (block 78
  less its two GATED rows); T3's nineteen block-77 rows are holders. Every
  existing row holds by branch. (Before the merge, against `56f91f4`: 25 / 1,508,
  0 floats, `--control` firing both clauses.)
* **Combination gate**: three umbel pairs; `umbel-florets-x-angle` and
  `umbel-length-x-angle` SINGLE-REACHES (12 cells declared by value),
  `umbel-head-length-x-angle` CLEARS (nearest 1.087 mm, a 5 mm pedicel at 35).
* **`frozen/phase84`** = the 1,525 rows at `89bb3bf`, `--verify-frozen` PASS.
  Surface texture T3 (#451) merged while this was in CI and took block 77,
  `phase83` and panel route (ao); its `phase83` is the same 1,506 rows this
  session had frozen at `e4ce6eb` (deep-equal), so that copy was dropped in
  the merge and the umbel moved to block 78, route (ap) and `phase84`.

The sheet's measured approaches (EXPORT, emitted vertices against triangles):

| cell | tris (export) | knot radius | floret-floret | floret-stem | floret-head |
|---|---|---|---|---|---|
| the spider lily, 6, head OFF | 136,026 | 6.000 | 0.000 | 23.365 | — |
| 2 florets, head OFF | 37,998 | 5.243 | 15.000 (cap) | 21.261 | — |
| 5 florets, head OFF | 89,868 | 5.403 | 0.000 | 21.777 | — |
| 12 florets, head OFF | 211,794 | 9.727 | 0.000 | 25.331 | — |
| 6 florets, head ON | 133,606 | 7.500 | 0.000 | 12.268 | 4.920 |
| 6 florets at -60 deg | 107,286 | 6.000 | 0.000 | **0.000** | — |
| 6 florets at 90 deg | 107,286 | 6.000 | 0.000 | 22.517 | — |

## 7. Declared, never clamped

* **The florets of one umbel overlap** — every row but the two-floret ones
  reads 0.0000 mm floret-to-floret (ID10 (d), `INFLO_APPROACH_XFAIL`, and the
  combination gate's `umbel-florets-x-angle`). There is no internode to move
  them apart; a real umbel's florets interleave. Declared by value. The one
  exception is five SPHERE florets, 0.9127 mm apart, declared at that value.
* **At -60 deg a 5 or 20 mm pedicel stands its floret against the stem below
  the knot** (floret-stem 0.000; 60 mm and longer clear) — declared in the
  combination gate.

## 8. Open for Eva — RULED Oct 23

* **RULED Oct 23: 6 florets, head OFF is the default.** (`umbelFlorets` 6,
  `umbelHead` OFF, unchanged.)
* **RULED Oct 23: the floret-stem contact at -60° is accepted as declared.**
  (The combination gate's `umbel-length-x-angle` declarations stand.)
* **RULED Oct 23: the knot becomes a flatter boss (this session).** §9.

## 9. The boss (Oct 23, Eva's third ruling)

The least sphere read as a BALL — 12.00 mm across at six florets and
19.45 mm at twelve on a 6 mm stem. It is replaced by a squat solid of
revolution about the stem axis (`umbelBoss`), whose profile in (r, z) about
the ring's centre is a flat-topped BAND of radius `R` and half-height `h`,
its underside a 45° cone running in to the stem's wall:

    (0, +h) — (R, +h) — (R, -h) — (rF, -h - (R - rF)) — (0, -h - (R - rF))

Every length is DERIVED, none typed:

* **`R` holds the root disc ACROSS**: the farthest point of a pedicel's root
  disc (radius `rP`, normal to a pedicel at `a` from horizontal, centred on the
  ring `rho`) from the axis is
  `max over phi sqrt((rho - rP sin phi sin a)^2 + rP^2 cos^2 phi)`, closed form
  in `umbelRootDiscReachMm`; plus half a gap.
* **`h` holds the root disc UP AND DOWN**: the disc reaches `rP |cos a|` above
  and below the ring's plane, plus half a gap. Every pedicel of an umbel stands
  at the one `pedicelAngle`, so that disc IS the steepest pedicel's — a
  pedicel at -60 and one at 90 get different bands (2.50 and 1.00 mm tall at
  six florets), never a typed fraction.
* **Half a gap, never zero, on both**: a disc whose rim lies ON the boss is
  the tangency that welded on the sphere (749 within-shell pairs).
* **The underside is the overhang law**: 45° is the steepest overhang that
  prints unsupported, so the band never hangs a flat ledge `R - outerR` wide
  over the stem. It runs in to `rF = outerR - gap/2` — inside Eva's 1.5 mm
  wall, never ON the stem's cylinder — and closes there on a flat disc across
  the stem. Head OFF the stem's top end lies inside the band and the boss reads
  as the stem flaring into it; head ON the stem runs on through it to the head.
  The ring `rho` is unchanged (one gap between neighbours; head ON, one gap off
  the stem).

Measured before it was built (6 mm stem; across = `2R`; tall = band + flare):

| | sphere across = tall | boss across | band | flare | boss tall |
|---|---|---|---|---|---|
| OFF, 2 florets, -60° | 10.49 | 9.92 | 3.12 | 2.46 | 5.58 |
| OFF, 2 florets, 35° | 10.49 | 8.68 | 4.48 | 1.84 | 6.31 |
| OFF, 2 florets, 90° | 10.49 | 10.49 | 1.00 | 2.74 | 3.74 |
| OFF, 6 florets, -60° | 12.00 | 11.60 | 2.50 | 3.30 | 5.80 |
| OFF, 6 florets, 35° | 12.00 | 10.72 | 3.46 | 2.86 | 6.32 |
| OFF, 6 florets, 90° | 12.00 | 12.00 | 1.00 | 3.50 | 4.50 |
| OFF, 12 florets, -60° | 19.45 | 19.05 | 2.50 | 7.03 | 9.53 |
| OFF, 12 florets, 35° | 19.45 | 18.18 | 3.46 | 6.59 | 10.05 |
| OFF, 12 florets, 90° | 19.45 | 19.45 | 1.00 | 7.23 | 8.23 |
| ON, 6 florets, 35° | 15.00 | 13.72 | 3.46 | 4.36 | 7.82 |

The boss is never wider than the sphere (it equals it at 90°, where the disc
lies flat on the ring) and is 0.36–0.59 as tall as it is wide where the
sphere was 1.00. **The underside is most of its height at twelve florets**
(7 of 10 mm) — the price of no unsupported ledge. A flat underside (the band
alone) would be 0.18 as tall as wide at twelve; it is not built, and is the
one-branch alternative if the cone reads too heavy.

**Triangles: 288 against the sphere's 2,208** (three rings of 48: the flat
bottom fan, the cone, the rim, the flat top fan; 192 where there is no cone).
The spider lily drops 1,920 triangles; nothing else moves.

**The pedicel crosses less solid**, and at 90° exactly the floor: a vertical
pedicel's root disc lies half a gap under the band's top face, so it crosses
0.500 mm of the boss — ID2's own half-feature floor for a weld, met and not
exceeded (the sphere gave several mm). At 35° on six florets it crosses
1.661 mm (through the rim). Reported, not widened: holding the disc is the
ruling's law, and a deeper band at 90° would be a typed height.

### 9b. Measured on this tree (local)

* **Export gate, block 78**: PASS — 27 of 27 rows reach the results, watertight,
  0 within-shell self-intersections, UM0–UM4 silent (1,084 s).
* **Connectedness, block 78**: PASS — 27 of 27 one connected body at every count
  (2 / 5 / 6 / 7 / 12) and angle (-60 / 35 / 90), head off and on, sessile, on a
  3 mm solid and a 12 mm stem (826 s).
* **Byte partition** (`verify-bloom-surface-bytes --base <8e75e1c> --movers-predicate
  umbel-boss`): rows 1525–1551 PASS, 25 movers moved and the 2 GATED holders held to
  the bit in both modes; rows 0–1524 recorded in the PR.
* **Combination gate, the three umbel pairs**: unchanged — every declared magnitude
  reproduces, `umbel-head-length-x-angle` still CLEARS at 1.087 mm.


## 10. The flat underside and the crossing's margin (Oct 24, Eva's two rulings)

**RULED Oct 27 (from the deploy preview): the flat coin bosses read as unnatural ("the disk is
just everywhere"); every umbel junction becomes a HUB — the hub-to-stem join run in reverse, a
flare from the incoming rod out to the band that holds the root discs, driven by the three Hub
controls (the umbel-hubs session). The flat-underside ruling of Oct 24 below is SUPERSEDED by
the hub's own flare; the band, its disc-holding law and the 90° crossing margin stand.**

**RULED Oct 24: flat underside; the overhang rule was FDM's and the target
process is SLS.** The first print is SLS PA12, which needs no supports, so the
45° underside cone goes. The profile is now

    (0, +h) — (R, +h) — (R, -h) — (0, -h)

— a flat-topped, flat-bottomed band: the boss reads as a disc.

**The height, re-derived from what holds the discs.** The cone held no root
disc. Each pedicel's root disc (radius `rP`, normal to the pedicel, centred on
the ring) reaches `rP |cos a|` above and below the ring's plane and
`umbelRootDiscReachMm` out from the axis; the band alone already holds that
whole disc half a gap inside all four faces (UM2, unchanged, now on a
flat-bottomed boss). So `h = rP |cos a| + gap/2` and `R = reach + gap/2` stand,
and the cone below them was material holding nothing. With the head OFF the
stem's top end sits at the boss's centre, so the stem crosses `h` of the boss
— the same crossing a vertical pedicel makes, and the margin below covers it.

**RULED Oct 24: the 90° knife edge clears by a derived margin.** A pedicel
crosses the boss from its root on the ring out along its own direction — through
the top or bottom face after `h / |sin a|`, through the rim after
`(R - rho) / cos a`. At 90° the disc lies flat, `h` was exactly `gap/2`, and a
vertical pedicel crossed **0.500 mm — ON ID2's half-feature minimum**. The band
now grows where the crossing is shortest, and only there:

    h = max(rP |cos a| + gap/2, Cmin |sin a|)
    R = max(reach + gap/2,      rho + Cmin cos a)
    Cmin = gap/2 + margin

**Where the margin comes from: the check's own conditioning, carried to the
artefact.** The band's faces and the pedicel's root are written to the STL as
float32; each coordinate there is rounded by at most one float32 step, and the
float32 step at magnitude `M` is at most `M · 2^-23`. The margin is **eight such
steps** of the boss's own coordinate magnitude — the same 8 as X0's
`X0_TOL_ULPS` and the foot clearance (`FOOT_CAP_CLEARANCE_RAD`), which Eva ruled
on Oct 22:

    margin = M · 2^-20,   M = max(R0, |cz| + h0) + gap

(`UMBEL_CROSSING_MARGIN_REL`; `R0`, `h0` the disc-holding values, `cz` the
boss's centre height; `M` is an upper bound on every coordinate the boss emits,
since the growth is less than a gap). It is CONTINUOUS in `M` — never rounded to
a power of two — so UM1's restatement, which reads `M` off the EMITTED centre,
agrees with the geometry to the ulp. Not typed: every factor is a float32 step,
the project's 8, or a length the boss already owns.

Measured: the margin is **6.0e-6 to 3.3e-5 mm** (it scales with how far the boss
stands from the origin — head ON puts it further down the stem), so a vertical
pedicel crosses 0.500006–0.500033 mm, never exactly 0.500. It binds on the
height only at 90°, and on the rim nowhere: the rim crossing is
`(R0 - rho)/cos a`, and `R0 - rho` already exceeds `gap/2` by at least the
disc's own excess (`~rP^2/(2 rho)` at 0°, 0.07 mm at twelve florets, more at
any other angle) — four orders over the margin.

**The print-floor alternative, costed and not built.** Requiring the crossing to
be a whole printable feature (`Cmin = MIN_FEATURE_MM`) would make the 90° boss
2.00 mm tall instead of 1.00 and grow the rim at 0° by ~0.4 mm; it is one
constant (`crossMinMm`) and is Eva's to ask for. The conditioning margin fixes
the knife edge the ruling named — a crossing the float32 file can fall either
side of — without changing what the boss looks like.

### 10a. §9's table re-measured (6 mm stem, EXPORT)

across = `2R`; tall = the boss's emitted top to its emitted bottom (both poles
included). Before = main at `2621100` (the coned boss); after = this tree.

| | sphere across = tall | across (before = after) | tall before | **tall after** |
|---|---|---|---|---|
| OFF, 2 florets, -60° | 10.49 | 9.92 | 5.58 | **3.12** |
| OFF, 2 florets, 35° | 10.49 | 8.68 | 6.31 | **4.48** |
| OFF, 2 florets, 90° | 10.49 | 10.49 | 3.74 | **1.000012** |
| OFF, 6 florets, -60° | 12.00 | 11.60 | 5.80 | **2.50** |
| OFF, 6 florets, 35° | 12.00 | 10.72 | 6.32 | **3.46** |
| OFF, 6 florets, 90° | 12.00 | 12.00 | 4.50 | **1.000013** |
| OFF, 12 florets, -60° | 19.45 | 19.05 | 9.53 | **2.50** |
| OFF, 12 florets, 35° | 19.45 | 18.18 | 10.05 | **3.46** |
| OFF, 12 florets, 90° | 19.45 | 19.45 | 8.23 | **1.000020** |
| ON, 2 florets, -60° | — | 16.92 | 9.08 | **3.12** |
| ON, 2 florets, 35° | — | 15.68 | 9.81 | **4.48** |
| ON, 2 florets, 90° | — | 17.49 | 7.24 | **1.000066** |
| ON, 6 florets, -60° | — | 14.60 | 7.30 | **2.50** |
| ON, 6 florets, 35° | 15.00 | 13.72 | 7.82 | **3.46** |
| ON, 6 florets, 90° | — | 15.00 | 6.00 | **1.000065** |
| ON, 12 florets, -60° | — | 19.05 | 9.53 | **2.50** |
| ON, 12 florets, 35° | — | 18.18 | 10.05 | **3.46** |
| ON, 12 florets, 90° | — | 19.45 | 8.23 | **1.000065** |

The across never moves (the rim margin binds on no row). The boss is now
**0.05–0.52 as tall as it is wide** where the cone's was 0.36–0.59 and the
sphere's 1.00; at twelve florets 0.05–0.19. At 90° the disc is 1 mm thick
across 12–19 mm — a vertical pedicel's root disc lies flat in it, half a gap
plus the margin from each face.

**Triangles: the boss is 192 against the cone's 288**, on every umbel row:
the spider lily 134,106 → 134,010 (−96, the export gate's own reading), the bloom totals in the table's own
rows 36,078 → 35,982, 105,366 → 105,270, 209,874 → 209,778, 62,398 → 62,302,
131,686 → 131,590, 236,194 → 236,098. Nothing else moves.

**Byte partition, the whole 1,555-row matrix in both modes** (`verify-bloom-surface-bytes
--base <worktree of 2621100> --movers-predicate umbel-boss`, four shards by `--from/--rows`):
**25 movers moved, 1,530 holders held — 0 floats moved on any holder**, positionally under
`Object.is`, over 1,945,703,052 export floats and 82,404,596 captured-grid values. A row moves
iff the base tree builds an umbel on it (the 25 `UMBEL:` rows that build one; the two GATED
rows hold). Shards 0–2 hold no umbel row and so report the tool's VACUOUS guard (no mover in
range) beside a clean holder comparison; shard 3 reads PASS.

**Gates.** UM1 restates the margin from the emitted centre and asserts the band,
the rim, the FLAT underside (its emitted bottom — now including the south pole —
at the band's own foot) and the crossing itself through the emitted boss; UM2 is
unchanged. Two new witnessed mutants (`the-boss-underside-cones-again`,
`the-boss-crossing-margin-is-dropped`) and a 90° row in the apex table for the
second to fire on; `the-boss-radius-is-typed` and `the-boss-height-is-typed`
re-anchored onto the grown `max`; the two `rootR` mutants re-anchored onto
`ring.rho` (the ring is computed before the boss now, which is placed once its
centre depth is known).
