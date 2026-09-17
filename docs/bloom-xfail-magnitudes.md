# The xfail lists gate HOW MUCH, not only WHICH — #213 closed

**The brief, in one line:** *the xfail list declares which rows fail and never by how much;
that is how fifteen regressions once landed without a red. Fix the instrument, not the rows.*

**What shipped.** Every bloom xfail entry now carries its measured magnitude as a NUMBER the
gate reads — the within-shell pair count and worst span for `SELF_INTERSECTION_XFAIL`, the
triangle count for `EXPORT_REFUSED_XFAIL`, the self-approach for the wall instrument's
`SELF_XFAIL`, the buckle's own contribution for its V4 marker — and the clause that used to ask
only "does this row still fail?" now also asks "does it still fail BY THIS MUCH?", in both
directions, with a band derived from the record's own precision. A module refuses to load on
an entry with no number. `node tools/bloom-xfail-magnitudes.mjs` re-measures the whole list in
Node in minutes so a session that legitimately moves a declared row re-records it BEFORE the
3.5-hour gate says so. **Geometry is untouched** — §5 is the byte partition.

**What it found on the way in, stated first because it is the finding:** the list was stale
on **23 of 261** self-intersection rows (9 worse, 12 better, 2 moved both ways), on the refused
row's triangle count (2,412,512 recorded, 2,412,412 built), and on **3 of the wall
instrument's 4** figures (one worse). None of it had reddened anything, which is exactly the
gap #213 named. §3 says how each is recorded and §6 says which merged PRs moved them.

---

## 1. Every xfail declaration and every consumer

Found by grep over every `.mjs`, `.js` and `.yml` in the repository (`xfail`, case-insensitive),
then by reading each hit. **The bloom carries FIVE xfail lists; four of them recorded a
magnitude as prose that nothing read, and one already gated it exactly.**

| list | file | entries | what the entry records | consumers (before this change) | gated magnitude before |
|---|---|---|---|---|---|
| `SELF_INTERSECTION_XFAIL` | `tools/bloom-harness.mjs` | **261** | pairs, worst span mm | `selfIntersectionAssertions` (X1/X2, export gate, every row); `orientationAssertions` (O2's parity clause is asserted only on undeclared rows); `selfIntersectionCoverage`, `selfIntersectionRefusedNote`; `SELF_INTERSECTION_XFAIL_HAS` in `tools/verify-bloom-export.mjs` (the per-row `XFAIL` marker and the summary count); `tools/bloom-lobe-composition.mjs` (parsed the string for 5 plain rows — the one consumer that ever read the number) | no (boolean only) |
| `EXPORT_REFUSED_XFAIL` | `tools/bloom-harness.mjs` | 1 (`ALL MAX`) | triangle count | `exportRefusalAssertion` (XR1/XR2 in BOTH STL gates), `exportRefusedLine`, `exportRefusedCoverage`, the census's refused exemption, the smoke row's `path` | no (over-budget only) |
| `SELF_XFAIL` | `tools/bloom-wall-thickness.mjs` | 3 | self-approach mm | V5 (the export workflow's Node-only step) | no (under-bar only) |
| the V4 `xfail` marker on `STATES` | `tools/bloom-wall-thickness.mjs` | 1 (`buckle-on-form`) | own contribution mm | V4's xfail loop, its vacuity clause, the table print | no (over-tolerance only) |
| `TRI_COUNT_XFAIL_BY_CHANGE` | `tools/verify-bloom-seam-bytes.mjs` | 2 tables, 1 + 3 | `before -> after` triangle counts | clause 3 of that tool (a close-out instrument, not in CI) | **yes, exact, both directions** — unchanged here and the precedent for the ruling |

Mentions that are not declarations: comments in `bloom.js:929` and `bloom-geometry.js:4726`,
the census tool's header, the smoke tool's row paths, the buckle sheet's captions.

**The flower's lists, reported and deliberately not changed** (they are the flower project's,
and this session's charter is the bloom's): `tools/verify-connectedness.mjs` carries
`xfail: 106` on five `SPINE LAW` rows (a boolean — one piece or not — so the magnitude there
would be the component count and stray fraction, both of which the gate already prints and
neither of which it records); `tools/verify-geometry-quality.mjs`'s `XFAILS` is empty, with an
age cap and a count cap; `tools/verify-junction-continuity.mjs`'s `XFAIL_LAW_MISSING_ISSUE`
marks a whole gate green until a law exists. `textile-gauge-tests.yml` runs pytest's own strict
xfails, a different project.

**So the count:** 5 bloom lists, 269 entries, of which 266 carried an ungated magnitude; 3
flower lists plus one Python suite, out of scope and named.

---

## 2. What was measured

**MODE AND SAMPLING, named.** Every figure below is EXPORT mode on the builder's own doubles —
the path the export gate's X0 proves is the STL's own — each row built with its capability and
its set over `DEFAULTS` coerced by each control's kind, then censused within-shell
(`tools/bloom-self-intersection.mjs`'s `census`, the gate's own function). The pair count is a
property of the tessellation (56 × 10 per panel at NU 56); the worst span is the longest chord
any intersecting pair carries. The wall figures are the wall instrument's own `verify()` on the
shipped 56 × 10 grid.

**TWO ENGINES, THE WHOLE LIST.** CI runs Node 20 and this box Node 22, and a census on doubles
is entitled to differ between engines at a tangency. Measured: every one of the 261 rows was
built and censused under BOTH, and **0 of 261 differ** — pair count and worst span equal to
the double. The wall instrument was run under Node 20. That measurement is what licenses an
exact band on the count (§3).

**SAME TREE TWICE** (the charter's own rule): the two engine sweeps are also two independent
runs of the same tree, and they agree on every row.

| | rows |
|---|---|
| declared rows measured | 261 |
| at their recorded figures (pairs exact, span within 5e-5 mm) | 238 |
| **WORSE than recorded** | **9** |
| better than recorded | 12 |
| moved in both quantities, opposite ways | 2 |

### Rows that read WORSE than their recorded figure — findings (9)

| row | recorded pairs / span | measured pairs / span | Δ pairs | Δ span mm |
|---|---|---|---|---|
| ZYGO: 3 layers x ALL INNER MAX x petalCount 40 | 100040 / 0.6466 | 102440 / 0.6466 | +2400 | -0.0000 |
| ZYGO: 3 layers x ALL INNER MAX (one role over two whorls) | 18792 / 0.6466 | 19272 / 0.6466 | +480 | -0.0000 |
| ZYGO: 3 layers x ALL INNER MAX x spread min (crowded feet) | 17352 / 0.6466 | 17768 / 0.6466 | +416 | -0.0000 |
| DEPTH: 6 layers x ALL FORM MAX | 53816 / 1.2616 | 54168 / 1.2616 | +352 | -0.0000 |
| ZYGO: 3 layers x ALL INNER MAX x ALL THIN | 16264 / 0.5356 | 16496 / 0.5356 | +232 | -0.0000 |
| 6 layers x innerCup max (1.2) | 5222 / 0.2361 | 5385 / 0.2361 | +163 | -0.0000 |
| ZYGO: 3 layers x ALL INNER MAX x petalCount 3 | 6687 / 0.6466 | 6837 / 0.6466 | +150 | -0.0000 |
| SPHERE: FIDDLEHEAD (curl 360) x 3 turns | 4188 / 0.9263 | 4320 / 0.9263 | +132 | -0.0000 |
| ORCHID x the foot UPPER clamp (petalWidth 30) x 2 whorls in step | 39 / 0.0000 | 46 / 0.0000 | +7 | 0.0000 |

### Rows that moved both ways at once (2)

| row | recorded pairs / span | measured pairs / span | Δ pairs | Δ span mm |
|---|---|---|---|---|
| CONT: 3 turns x ALL FORM MAX | 26937 / 1.6044 | 26992 / 1.3646 | +55 | -0.2398 |
| 6 layers x innerCup min (-0.8) | 2578 / 0.1682 | 2522 / 0.2509 | -56 | +0.0827 |

### Rows that read BETTER than their recorded figure and were never re-recorded (12)

| row | recorded pairs / span | measured pairs / span | Δ pairs | Δ span mm |
|---|---|---|---|---|
| LOBES: x roll 330 (over the quill, declared on main) | 16360 / 1.6115 | 16360 / 1.6103 | 0 | -0.0012 |
| LOBES: x curl 360 (over the fiddlehead, declared on main) | 864 / 0.8971 | 864 / 0.5070 | 0 | -0.3901 |
| CAPABILITY: cleft x CONTINUOUS x 3 turns | 13985 / 0.8550 | 13980 / 0.8550 | -5 | +0.0000 |
| CAPABILITY: cleft x 3 layers | 13976 / 0.8550 | 13953 / 0.8550 | -23 | +0.0000 |
| SLOT: ALL MAX x 3 layers x phase 0 | 3912 / 1.4909 | 3844 / 1.4909 | -68 | +0.0000 |
| CAPABILITY: cleft x 6 layers | 28058 / 0.8550 | 27990 / 0.8550 | -68 | +0.0000 |
| LAYERS: 3 x ALL FORM MAX | 29672 / 1.2616 | 29568 / 1.2616 | -104 | -0.0000 |
| ZYGO: 3 layers x ALL INNER MAX x ALL FORM MAX (every clamp binds) | 29672 / 1.2616 | 29568 / 1.2616 | -104 | -0.0000 |
| 6 layers x innerCurl max (360) | 8256 / 0.5646 | 8096 / 0.5646 | -160 | -0.0000 |
| ALL MAX | 130004 / 3.1556 | 129803 / 3.1556 | -201 | -0.0000 |
| FAN x PER-PETAL: ALL PER-PETAL MAX x 3 layers | 25319 / 1.4909 | 24801 / 1.4909 | -518 | +0.0000 |
| DEPTH: ZYGO 6 layers x ALL INNER MAX (one role over five whorls) | 62344 / 0.6466 | 60384 / 0.6466 | -1960 | -0.0000 |

### Every declared row, as measured (261)

| row | pairs | worst span mm | tris (export) | census ms |
|---|---|---|---|---|
| petalCup min (-0.8) | 384 | 0.2104 | 19040 | 723 |
| petalCup max (1.2) | 752 | 0.1268 | 19040 | 716 |
| petalCupGradient min (-0.8) | 360 | 0.1930 | 19040 | 639 |
| petalCupGradient max (1.2) | 720 | 0.1179 | 19040 | 649 |
| buckleAmp max (0.6) | 8 | 0.0179 | 19040 | 701 |
| petalSpineCurl max (360) | 1008 | 0.5233 | 19040 | 738 |
| petalRoll min (-330) | 18776 | 1.3837 | 19040 | 780 |
| petalRoll max (330) | 18776 | 1.3837 | 19040 | 734 |
| headRise max (1) | 216 | 0.4176 | 22304 | 418 |
| ALL MIN | 537 | 0.4270 | 7260 | 288 |
| FRINGE: THE CARNATION — 7 teeth on a 0.50 terminal at the shipped depth | 7288 | 1.2000 | 34912 | 701 |
| FRINGE: THE CENSUS ROW — the MAXIMUM count on the MAXIMUM terminal (the state nothing has measured) | 3670 | 0.7593 | 41824 | 971 |
| FRINGE: THE CENSUS ROW at the deepest split (10 teeth, depth 0.50 — the longest teeth reachable) | 3876 | 1.2000 | 68704 | 1476 |
| FRINGE: the shallowest split (depth 0.05 — a toothed edge rather than a fringe) | 8166 | 1.2000 | 23392 | 533 |
| FRINGE: TWO teeth (the cleft the shipped capability hook has always drawn, now reachable) | 4938 | 1.1150 | 24736 | 483 |
| FRINGE: CLAMPED — 10 teeth asked on a terminal that cannot carry them (0.30; told, never refused) | 5048 | 1.2000 | 25056 | 471 |
| FRINGE: CLAMPED — 10 teeth on the narrowest petal (8 mm, the tightest count ceiling reachable) | 6904 | 1.1248 | 29152 | 587 |
| FRINGE: x the thickest sheet (2.40 mm — the print floor doubles under the same terminal) | 7267 | 2.4000 | 34912 | 676 |
| FRINGE: x the thinnest sheet (0.60 mm, floored to 1.00 in export) | 7292 | 1.0000 | 34912 | 706 |
| FRINGE: x cup 1.2 (the picture measured fingers reaching each other here) | 4250 | 1.2000 | 34912 | 1111 |
| FRINGE: x the buckle at 0.30 f 3 (the other state that brought fingers together) | 2778 | 1.4645 | 32032 | 1032 |
| FRINGE: x roll 330 (a quilled tube with a fringed end) | 32840 | 1.3908 | 34912 | 1189 |
| FRINGE: x spine curl 180 (the fringe carried round a fiddlehead) | 9218 | 1.2703 | 34912 | 1248 |
| FRINGE: x ALL FORM MAX (a fringed end under every deformation at once) | 12586 | 1.6905 | 32032 | 1360 |
| FRINGE: x 40 petals (forty fringed ends on one hub) | 40759 | 1.2000 | 173792 | 4627 |
| FRINGE: x CONTINUOUS x 3 turns (a fringe on every petal of a spiral) | 14696 | 1.2000 | 84080 | 1580 |
| FRINGE: x 3 layers (the inner whorls fringed too) | 15823 | 1.2000 | 89088 | 1712 |
| FRINGE: GATED — LOBES asked for under a fringe (hidden AND inert, by ruling — the fringe wins) | 7288 | 1.2000 | 34912 | 675 |
| FORM: QUILL (roll alone, toward a tube) | 18776 | 1.3837 | 19040 | 732 |
| FORM: FIDDLEHEAD (spine curl alone) | 1008 | 0.5233 | 19040 | 754 |
| FORM: REFLEXED (cup min x curl below the plane) | 360 | 0.1991 | 19040 | 709 |
| FORM: ROLL CLAMP (roll max x narrowest petal) | 2048 | 0.9622 | 19040 | 692 |
| FORM: ALL MAX (all four curves together) | 9912 | 1.2616 | 19040 | 1102 |
| FORM: ALL MIN (all four curves together) | 6608 | 0.9791 | 19040 | 652 |
| THIN: ALL THIN × form max | 9336 | 1.2357 | 19040 | 1128 |
| APEX: fine end × roll max | 18776 | 1.3837 | 19040 | 722 |
| CAPABILITY: cleft (two-span domain) | 4629 | 0.8550 | 28576 | 495 |
| CAPABILITY: claw x form max | 7656 | 2.4618 | 19040 | 1178 |
| CAPABILITY: cleft x roll max | 35144 | 1.3837 | 28576 | 827 |
| CAPABILITY: cleft x all thin | 4643 | 0.7125 | 28576 | 416 |
| 6 layers x layerSize min (0.35) | 20912 | 1.0649 | 113280 | 15045 |
| 6 layers x layerTilt max (30) | 2944 | 0.8739 | 113280 | 2800 |
| 6 layers x innerCurl max (360) | 8096 | 0.5646 | 113280 | 4653 |
| 6 layers x innerCup min (-0.8) | 2522 | 0.2509 | 113280 | 3292 |
| 6 layers x innerCup max (1.2) | 5385 | 0.2361 | 113280 | 3955 |
| LAYERS: 3 x ALL FORM MAX | 29568 | 1.2616 | 56736 | 4362 |
| LAYERS: 3 x layerTilt max (135° effective at petalTilt max) | 1056 | 0.3572 | 56736 | 1312 |
| CAPABILITY: cleft x 3 layers | 13953 | 0.8550 | 85344 | 1602 |
| CONT: 3 turns x layerTilt max x petalTilt max (161.25° effective — past the layered 135°) | 1342 | 0.4459 | 56736 | 1296 |
| CONT: 3 turns x ALL FORM MAX | 26992 | 1.3646 | 56736 | 4751 |
| CAPABILITY: cleft x CONTINUOUS x 3 turns | 13980 | 0.8550 | 85424 | 1379 |
| ZYGO: 2 layers x ALL INNER MAX | 9312 | 0.6466 | 37888 | 1212 |
| ZYGO: 3 layers x ALL INNER MAX (one role over two whorls) | 19272 | 0.6466 | 56736 | 2934 |
| ZYGO: 3 layers x ALL INNER MAX x ALL THIN | 16496 | 0.5356 | 56736 | 4748 |
| ZYGO: 3 layers x ALL INNER MAX x spread min (crowded feet) | 17768 | 0.6466 | 56736 | 6646 |
| ZYGO: 3 layers x ALL INNER MAX x petalCount 3 | 6837 | 0.6466 | 21396 | 1044 |
| ZYGO: 3 layers x ALL INNER MAX x petalCount 40 | 102440 | 0.6466 | 282912 | 20083 |
| ZYGO: 3 layers x ALL INNER MAX x ALL FORM MAX (every clamp binds) | 29568 | 1.2616 | 56736 | 3814 |
| ZYGO: curl clamp binds (base 360 + delta 360 -> 360) | 2064 | 0.5549 | 37888 | 1250 |
| ZYGO: cup clamp binds (base 1.2 + delta 1.2 -> 1.2) | 1528 | 0.2361 | 37888 | 1256 |
| ZYGO: the foot UPPER clamp (petalWidth 30 — ring frozen at 11.06 mm) | 14768 | 1.0071 | 37888 | 1778 |
| CAPABILITY: cleft x ZYGO 2 layers x ALL INNER MAX | 21051 | 1.1369 | 56960 | 1705 |
| SLOT: labellumCup min (-0.8) x 2 whorls in step | 95 | 0.2104 | 37888 | 734 |
| SLOT: labellumCup max (1.2) x 2 whorls in step | 195 | 0.2361 | 37888 | 690 |
| SLOT: labellumCurl max (360) x 2 whorls in step | 258 | 0.5549 | 37888 | 734 |
| SLOT: hoodCup min (-0.8) x 2 whorls in step | 99 | 0.2104 | 37888 | 643 |
| SLOT: hoodCup max (1.2) x 2 whorls in step | 195 | 0.2361 | 37888 | 620 |
| ORCHID: the labellum and the hood (the flower has a face) x 2 whorls in step | 2 | 0.0000 | 37888 | 743 |
| ORCHID x petalCount 3 (one of three is the labellum, no laterals) x 2 whorls in step | 3 | 0.0000 | 14328 | 486 |
| ORCHID x petalCount 4 (smallest even — hood is one slot) x 2 whorls in step | 3 | 0.0000 | 19040 | 494 |
| ORCHID x petalCount 39 (odd at scale — hood is a straddling pair) x 2 whorls in step | 1 | 0.0000 | 183960 | 4865 |
| ORCHID x 3 layers x phase 0 (slot roles x layer roles) | 5 | 0.0000 | 56736 | 1235 |
| ORCHID x the IRIS (both role axes, one bloom) | 55 | 0.1413 | 37888 | 1344 |
| ORCHID x ALL THIN x spread min (the junction at its thinnest) x 2 whorls in step | 4 | 0.0000 | 37888 | 1142 |
| ORCHID x the foot UPPER clamp (petalWidth 30) x 2 whorls in step | 46 | 0.0000 | 37888 | 931 |
| SLOT: ALL MAX x 2 whorls in step | 2619 | 1.4909 | 37888 | 1088 |
| SLOT: ALL MIN x 2 whorls in step | 222 | 0.2538 | 37888 | 820 |
| SLOT: ALL MAX x 3 layers x phase 0 | 3844 | 1.4909 | 56736 | 1811 |
| SLOT: ALL MAX x petalCount 3 x 2 whorls in step | 2793 | 1.4909 | 14328 | 713 |
| SLOT: ALL MAX x petalCount 40 x 2 whorls in step | 2599 | 1.4909 | 188672 | 5215 |
| SLOT: ALL MAX x ALL FORM MAX (every clamp binds at once) x 2 whorls in step | 19790 | 2.4700 | 37888 | 2707 |
| FAN: ALL FORM MAX | 8631 | 1.2616 | 16684 | 970 |
| FAN: 3 layers x toggle ON x layerTilt max | 910 | 0.3572 | 49668 | 1155 |
| FAN x PER-PETAL: a MIDDLE group only (petal 2 — an orbit that was LATERAL and had no controls) | 2 | 0.0000 | 16684 | 372 |
| FAN x PER-PETAL: 1/side x 170deg x petal 1 MAX (largest petal, widest spacing, fewest petals) | 1247 | 1.4909 | 7260 | 225 |
| FAN x PER-PETAL: 1/side x 170deg x toggle OFF x petal 1 MAX (two petals, both are petal 1) | 2494 | 1.4909 | 4904 | 277 |
| FAN x PER-PETAL: ALL PER-PETAL MAX x 8/side x 60deg (nine groups on a capped arc) | 21233 | 1.4909 | 40244 | 6152 |
| FAN x PER-PETAL: ALL PER-PETAL MAX x 1/side (one group is the whole bloom) | 3741 | 1.4909 | 7260 | 489 |
| FAN x PER-PETAL: petal 1 x 3 layers x inner* (position and depth composing) | 169 | 0.2089 | 49668 | 1513 |
| FAN x PER-PETAL: ALL PER-PETAL MAX x 3 layers | 24801 | 1.4909 | 49668 | 8004 |
| FAN x PER-PETAL: ALL PER-PETAL MAX x ALL THIN x spread min | 8064 | 1.4801 | 16684 | 1194 |
| FAN x PER-PETAL: ALL PER-PETAL MAX x ALL FORM MAX | 8330 | 2.4700 | 16684 | 978 |
| PER-PETAL: petal1Cup min (-0.8) at 1/side | 46 | 0.2104 | 7260 | 134 |
| PER-PETAL: petal1Cup max (1.2) at 1/side | 99 | 0.1268 | 7260 | 135 |
| PER-PETAL: petal2Cup min (-0.8) at 1/side | 94 | 0.2104 | 7260 | 166 |
| PER-PETAL: petal2Cup max (1.2) at 1/side | 185 | 0.1268 | 7260 | 165 |
| PER-PETAL: petal3Cup min (-0.8) at 2/side | 97 | 0.2104 | 11972 | 262 |
| PER-PETAL: petal3Cup max (1.2) at 2/side | 189 | 0.1268 | 11972 | 283 |
| PER-PETAL: petal4Cup min (-0.8) at 3/side | 93 | 0.2104 | 16684 | 356 |
| PER-PETAL: petal4Cup max (1.2) at 3/side | 186 | 0.1268 | 16684 | 377 |
| PER-PETAL: petal5Cup min (-0.8) at 4/side | 95 | 0.2104 | 21396 | 467 |
| PER-PETAL: petal5Cup max (1.2) at 4/side | 191 | 0.1268 | 21396 | 474 |
| PER-PETAL: petal6Cup min (-0.8) at 5/side | 96 | 0.2104 | 26108 | 564 |
| PER-PETAL: petal6Cup max (1.2) at 5/side | 191 | 0.1268 | 26108 | 557 |
| PER-PETAL: petal7Cup min (-0.8) at 6/side | 104 | 0.2104 | 30820 | 699 |
| PER-PETAL: petal7Cup max (1.2) at 6/side | 184 | 0.1268 | 30820 | 687 |
| PER-PETAL: petal8Cup min (-0.8) at 7/side | 94 | 0.2104 | 35532 | 695 |
| PER-PETAL: petal8Cup max (1.2) at 7/side | 192 | 0.1268 | 35532 | 638 |
| PER-PETAL: petal9Cup min (-0.8) at 8/side | 98 | 0.2104 | 40244 | 745 |
| PER-PETAL: petal9Cup max (1.2) at 8/side | 189 | 0.1268 | 40244 | 881 |
| PER-PETAL: petal1Curl max (360) at 1/side | 108 | 0.6162 | 7260 | 165 |
| PER-PETAL: petal2Curl max (360) at 1/side | 216 | 0.6162 | 7260 | 201 |
| PER-PETAL: petal3Curl max (360) at 2/side | 236 | 0.5213 | 11972 | 267 |
| PER-PETAL: petal4Curl max (360) at 3/side | 240 | 0.5233 | 16684 | 360 |
| PER-PETAL: petal5Curl max (360) at 4/side | 256 | 0.5233 | 21396 | 456 |
| PER-PETAL: petal6Curl max (360) at 5/side | 260 | 0.5573 | 26108 | 549 |
| PER-PETAL: petal7Curl max (360) at 6/side | 268 | 0.5929 | 30820 | 648 |
| PER-PETAL: petal8Curl max (360) at 7/side | 388 | 0.7089 | 35532 | 746 |
| PER-PETAL: petal9Curl max (360) at 8/side | 392 | 0.6227 | 40244 | 870 |
| CAPABILITY: cleft x FAN x toggle ON x ALL PER-PETAL MAX | 13699 | 2.8811 | 25308 | 2301 |
| ALL PETALS: max (curl +360, cup +1.20, tip +0.60) | 8448 | 0.7972 | 19040 | 1249 |
| ALL PETALS: min (curl -180, cup -0.80) | 360 | 0.1991 | 19040 | 701 |
| ALL PETALS: max x petalCount 3 x ALL THIN x spread min | 3027 | 0.7156 | 7260 | 494 |
| ALL PETALS: max x petalCount 40 x ALL THIN x spread min | 40360 | 0.7156 | 94432 | 47921 |
| ALL PETALS: max x every base at max (curl 360+360, cup 1.2+1.2 — every clamp binds) | 8448 | 0.7972 | 19040 | 1214 |
| ALL PETALS: min x base curl and cup at min (-180 + -180 -> -180) | 360 | 0.1991 | 19040 | 705 |
| ALL PETALS: max x FAN 3/side toggle ON x petal 1 max (the group, then the petal) | 7593 | 1.4909 | 16684 | 1227 |
| ALL PETALS: max x CONTINUOUS 1 turn (one sequence is one whorl) | 8749 | 0.7884 | 19040 | 1301 |
| ALL PETALS: max x SPIRAL | 8448 | 0.7972 | 19040 | 1207 |
| ALL PETALS: GATED — max x 3 layers x phase 0 x ORCHID (inert beside a live orchid) | 5 | 0.0000 | 56736 | 1225 |
| ALL PETALS: GATED — max x Inner max x 2 layers (only the Inner pair applies) | 9312 | 0.6466 | 37888 | 1455 |
| DEPTH: 6 turns x CONTINUOUS x spread min (0.6) | 61 | 0.1490 | 113280 | 3622 |
| DEPTH: 6 turns x CONTINUOUS x spread default (2) | 61 | 0.1490 | 113280 | 2326 |
| DEPTH: 6 turns x CONTINUOUS x spread max (6) | 61 | 0.1490 | 113280 | 2099 |
| DEPTH: 6 layers x layerSize min (a 0.18 mm blade on a 1.60 mm foot; crowding R5 needs its fine pass) | 20912 | 1.0649 | 113280 | 13986 |
| DEPTH: 6 turns x layerSize min x petalCount 40 (the deepest continuous foot) | 109295 | 1.1587 | 565632 | 338363 |
| DEPTH: 6 turns x petalCount 40 x spread min (D_max 25 measured, CROWDED) | 610 | 0.4215 | 565632 | 25425 |
| DEPTH: 6 layers x ALL FORM MAX | 54168 | 1.2616 | 113280 | 11716 |
| DEPTH: 6 layers x layerTilt max x petalTilt max (225° effective on the sixth whorl) | 4744 | 1.0161 | 113280 | 3537 |
| DEPTH: ZYGO 6 layers x ALL INNER MAX (one role over five whorls) | 60384 | 0.6466 | 113280 | 9380 |
| CAPABILITY: cleft x 6 layers | 27990 | 0.8550 | 171456 | 3142 |
| DOME: rise 1 x RADIAL x spread min (0.6) | 152 | 0.5414 | 22304 | 454 |
| DOME: rise 1 x CONTINUOUS x spread min (0.6) | 19 | 0.5232 | 22304 | 442 |
| DOME: rise 1 x RADIAL x spread default (2) | 216 | 0.4176 | 22304 | 411 |
| DOME: rise 1 x CONTINUOUS x spread default (2) | 27 | 0.3974 | 22304 | 398 |
| DOME: rise 1 x RADIAL x spread max (6) | 320 | 0.4997 | 22304 | 396 |
| DOME: rise 1 x CONTINUOUS x spread max (6) | 40 | 0.4991 | 22304 | 407 |
| DOME: the INCURVE TARGET, flat (40/turn x 3, spread 1.60, length 20, tilt 75, curl 150, ALL THIN feet) · curl family pinned at identity, COVERAGE ASSERTED | 510 | 0.2656 | 282912 | 23667 |
| DOME: the INCURVE TARGET x rise 0.5 (the sheet's headline; pre-registered D_max 5) · curl family pinned at identity, COVERAGE ASSERTED | 9944 | 0.3709 | 286176 | 40831 |
| DOME: rise 1 x 6 layers x spread min (the arc-based crossing flag) | 320 | 0.4737 | 116544 | 3429 |
| DOME: rise 1 x 6 turns x spread min x petalCount 40 (the arc-based crossing flag, continuous) | 1408 | 0.4607 | 568896 | 23164 |
| DOME: rise 1 x ALL FORM MAX (the four curves on the rotated frame) | 10016 | 1.2616 | 22304 | 1039 |
| DOME: rise 1 x petalTilt 75 x 3 layers x layerTilt 30 (135 deg effective on a hemisphere) | 3168 | 0.6435 | 60000 | 1208 |
| DOME: rise 1 x FAN 3/side toggle ON | 189 | 0.3982 | 19948 | 311 |
| DOME: rise 1 x SPIRAL | 216 | 0.4176 | 22304 | 341 |
| DOME: rise 1 x ORCHID at two whorls in step | 351 | 0.6233 | 41152 | 753 |
| DOME: rise 1 x FAN 3/side x petal 1 max | 1473 | 1.4909 | 19948 | 474 |
| DOME: rise 1 x ALL THIN x spread min x 3 layers (feet across the apex) | 136 | 0.2728 | 60000 | 1555 |
| DOME: rise 1 x 6 layers x layerSize min (the 0.18 mm blade on a hemisphere) | 6528 | 0.4946 | 116544 | 13309 |
| DOME LEAN: EVA_CONFIG flat (the headRise-independent baseline the lean must not touch) | 610 | 0.4215 | 565632 | 14424 |
| DOME LEAN: EVA_CONFIG x rise 1 (GATED — bald-cap unmoved by domeLean; a shortfall the dome did not cause) | 1678 | 0.5608 | 568896 | 15767 |
| DOME LEAN: EVA_CONFIG x rise 1 x layerTilt 18 (closes the gap via the EXISTING ramp, not domeLean) | 7866 | 0.5604 | 568896 | 23725 |
| CURL: bias max x incurve target x rise 0.5 (documented: re-opens 16.0% of the crown, tips 5-11 mm out) | 7227 | 0.3152 | 286176 | 11536 |
| CURL: bias 0.5 x incurve target x rise 0.5 (documented: re-opens 5.4%) | 7227 | 0.3153 | 286176 | 11777 |
| CURL: start max x incurve target x rise 0.5 (the spine floor binds: 150 asked, 96 built; re-opens 23.1%) | 7227 | 0.3152 | 286176 | 10324 |
| CURL: bias max x start max x incurve target x rise 0.5 (CLAMPED: 50 built) | 7227 | 0.3152 | 286176 | 10533 |
| CURL: start floored at one blade row (0.02 -> 0.036) x incurve target x rise 0.5 | 7251 | 0.3091 | 286176 | 39414 |
| CURL: bias 0.5 x start 0.5 x incurve target x rise 1 | 14763 | 0.5759 | 286176 | 11261 |
| CURL: FIDDLEHEAD x start 0.5 (SELF-CONTACT: the tip lands on its own mid-blade) | 1104 | 0.5302 | 19040 | 561 |
| CURL: crozier x rise 1 x 6 deep (curl max x bias max x start max) | 608 | 0.4954 | 116544 | 3161 |
| CURL: ALL FORM MAX x bias max x start 0.5 | 6640 | 2.1026 | 19040 | 711 |
| TAPER: QUILL x taper max (roll clamp; opens toward the tip) | 768 | 0.8985 | 19040 | 610 |
| TAPER: roll min (-330) x taper min | 3744 | 1.2919 | 19040 | 626 |
| GRADIENT: cup gradient max x cup max x widest petal (the metric reaches 2.6 at the tip) | 680 | 0.3944 | 19040 | 763 |
| GRADIENT: cup gradient min x cup min (reflexed, more so at the tip) | 768 | 0.2271 | 19040 | 546 |
| GRADIENT: cup gradient max x ALL THIN x spread min | 432 | 0.2130 | 19040 | 666 |
| GRADIENT: cup gradient max x QUILL (cup composes onto an isometric roll; no damping) | 5240 | 0.7145 | 19040 | 616 |
| SPHERE: the INCURVE sliders (40/turn x 3, spread 1.60, length 20, tilt 75, curl 150, ALL THIN feet) — the sheet's headline | 67 | 0.2109 | 289440 | 7906 |
| SPHERE: 40 per turn x 6 turns (240 feet — the densest reachable pole) | 199 | 0.2394 | 572160 | 11263 |
| SPHERE: ALL FORM MAX (the four curves on the sphere's frame) | 10024 | 1.3646 | 25568 | 1013 |
| SPHERE: petalTilt 75 x layerTilt 30 x 3 turns (the tilt extreme, lean 0) | 1231 | 0.5565 | 63264 | 1204 |
| SPHERE: 6 turns x layerSize min (the 0.18 mm blade at the face pole) | 5021 | 0.1681 | 119808 | 2983 |
| SPHERE: FIDDLEHEAD (curl 360) x 3 turns | 4320 | 0.9263 | 63264 | 1852 |
| SPHERE: GATED — Head rise 0.5 x the incurve sliders under SPHERE (bit-identical to the incurve sphere) | 67 | 0.2109 | 289440 | 8808 |
| STAMENS: 120 DISC x Head rise 1 (a hemisphere) | 216 | 0.4176 | 89504 | 1779 |
| STAMENS: 6 x the APEX CORNER — ALL MIN x sheet 2.40 x spread min (a hub narrower than a filament radius: the stamens stand ON THE AXIS, told) | 45539 | 5.7600 | 10620 | 399 |
| STAMENS: GATED — every control at MAXIMUM under the INCURVE sphere (bit-identical to the incurve sphere) | 67 | 0.2109 | 289440 | 8714 |
| GYNOECIUM: a style on the bare apex (the four states — style only) | 272 | 0.0796 | 20000 | 372 |
| GYNOECIUM: style x 6 stamens on a RING (the four states — both present) | 272 | 0.0796 | 23360 | 348 |
| GYNOECIUM: style x 120 on the DISC (the trifid against the cushion) | 272 | 0.0796 | 87200 | 2007 |
| GYNOECIUM: style length min (5) x 6 stamens — the stigma below the anthers | 272 | 0.0796 | 23360 | 364 |
| GYNOECIUM: style length max (40) — L/d 33 | 272 | 0.0796 | 20000 | 288 |
| GYNOECIUM: style curl min (-180) x 6 stamens | 272 | 0.0796 | 23360 | 345 |
| GYNOECIUM: style curl max (180) — bent over the apex | 272 | 0.0796 | 20000 | 291 |
| GYNOECIUM: style x 6 x filament curl max (180) — the filaments cross the axis the style stands on | 272 | 0.0796 | 23360 | 426 |
| GYNOECIUM: style x Head rise 1 (rooted at the cap's apex) | 286 | 0.4176 | 23264 | 435 |
| GYNOECIUM: style x the mum (the 4.69 mm printed hub) | 272 | 0.0664 | 283872 | 7983 |
| GYNOECIUM: style x sheet 2.40 (the fat style) | 272 | 0.1593 | 20000 | 355 |
| GYNOECIUM: style x ALL THIN x spread min (the thinnest slab) | 272 | 0.0664 | 20000 | 472 |
| GYNOECIUM: style x the APEX CORNER — ALL MIN x sheet 2.40 x spread min (a hub narrower than the style: WIDER THAN THE HUB, told) | 300 | 1.6149 | 8220 | 165 |
| GYNOECIUM: style x 3 layers (deeper petal roots) | 272 | 0.0796 | 57696 | 1018 |
| GYNOECIUM: style x CONTINUOUS x 3 turns x 120 DISC | 272 | 0.0796 | 124896 | 2636 |
| GYNOECIUM: style x FAN (the fan's full-disc hub) | 272 | 0.0796 | 17644 | 321 |
| GYNOECIUM: GATED — every control at MAXIMUM under the INCURVE sphere (bit-identical to the incurve sphere) | 67 | 0.2109 | 289440 | 9258 |
| ANTHER: 6 lobes at 90° — the widest fan | 619 | 0.5933 | 28400 | 746 |
| ANTHER: a shaped tip x a style (the trifid beside a triangle, on one scale) | 272 | 0.0796 | 23600 | 372 |
| STIGMA: a style at the shipped trifid x 6 stamens (the tip block's own control row) | 272 | 0.0796 | 23360 | 439 |
| STIGMA: size min (0.6) — the whole lobe under the 0.50 mm floor, told | 272 | 0.0796 | 20000 | 369 |
| STIGMA: size max (6.00) — 7.20 mm lobes on a 1.20 mm style | 272 | 0.0796 | 20000 | 362 |
| STIGMA: elongation min (1.00) — SPHERES, the band floored | 272 | 0.0796 | 20000 | 366 |
| STIGMA: elongation max (6.00) — rod-lobes | 272 | 0.0796 | 20000 | 375 |
| STIGMA: a TRIANGLE (3 points, pinch 1.00 — the polygon, roundedness 0) | 272 | 0.0796 | 20120 | 355 |
| STIGMA: a ROUNDED STAR (6 points, pinch 1.00, roundedness 0.35) | 272 | 0.0796 | 20120 | 357 |
| STIGMA: the WAIST FLOOR binding (pinch max 7.00 at roundedness 0 — CLAMPED, told) | 272 | 0.0796 | 20360 | 378 |
| STIGMA: the lattice at n = 5 (ten sides) | 272 | 0.0796 | 20000 | 358 |
| STIGMA: the lattice at n = 12 (24 sides) | 272 | 0.0796 | 20840 | 397 |
| STIGMA: ONE lobe at 0° — a pill on the style (the anther's own default shape) | 272 | 0.0796 | 19600 | 347 |
| STIGMA: 6 lobes at 90° — the widest fan | 272 | 0.0796 | 20600 | 389 |
| STIGMA: COINCIDENT — 3 lobes at a spread of 0 (duplicate geometry, told, never refused) | 272 | 0.0796 | 20000 | 348 |
| STIGMA: one lobe LEANING (spread 45 at a count of 1 — not a dead slider) | 272 | 0.0796 | 19600 | 295 |
| STIGMA: a shaped stigma x 120 on the DISC (the cushion around a 12-point star) | 272 | 0.0796 | 88040 | 2012 |
| STIGMA: a shaped stigma x the mum (the 4.69 mm printed hub) | 272 | 0.0664 | 283992 | 7756 |
| STIGMA: a shaped stigma x sheet 2.40 (the fat style) | 272 | 0.1593 | 20120 | 376 |
| STIGMA: the NEAREST REACHABLE TO THE CIRCLE (pinch min 0.05 at roundedness 0 — every factor 0.983, none exactly 1, on the 16-side lattice; the singular exponent sits one step below) | 272 | 0.0796 | 20360 | 372 |
| STIGMA: THE FAMILY — the same seven on both tips (3-point polygons at pinch 1, roundedness 0, on six anthers and the trifid) | 272 | 0.0796 | 23720 | 429 |
| STIGMA: INERT — the points and the pinch at their extremes with roundedness 1 (bit-identical to the shipped trifid) | 272 | 0.0796 | 20000 | 350 |
| BUCKLE: the default frequency at a strong amplitude (0.30 x, f 3) | 8 | 0.0104 | 19040 | 654 |
| BUCKLE: f min (1) — one cycle along the blade, the whole range live | 225 | 0.4502 | 19040 | 596 |
| BUCKLE: the clamp NOT binding (0.60 asked at f 1 — the cap is 3.23x) | 225 | 0.4502 | 19040 | 530 |
| BUCKLE: reach max (p 6) — confined to the outer 32% | 48 | 0.3779 | 19040 | 526 |
| BUCKLE: THE ROSE look — low amplitude, high p (a narrow band at the edge) | 4 | 0.0011 | 19040 | 523 |
| BUCKLE: over a cupped blade (cup 1.2) | 479 | 0.2457 | 19040 | 659 |
| BUCKLE: THE COMPOSITION (cup 1.2 x curl 180) — a tracked wall xfail that must still export clean | 2078 | 3.6160 | 19040 | 958 |
| BUCKLE: x ALL FORM MAX (every clamp binds at once) | 9391 | 1.8659 | 19040 | 1154 |
| BUCKLE: x the thickest sheet (2.40 — the floor doubles, the cap halves) | 29 | 0.1710 | 19040 | 628 |
| BUCKLE: x the longest, widest petal (60 x 30) | 20 | 0.2016 | 19040 | 575 |
| BUCKLE: x petalCount 3 (the per-slot phase over three petals) | 4 | 0.0104 | 7260 | 203 |
| BUCKLE: x petalCount 40 (forty phases at the golden angle) | 31 | 0.0104 | 94432 | 3798 |
| BUCKLE: x 3 whorls (the phase runs over the slot index, not the whorl) | 16 | 0.0104 | 56736 | 1947 |
| BUCKLE: x CONTINUOUS x 3 turns | 19 | 0.0368 | 56736 | 1584 |
| BUCKLE: x SPHERE (a buckled margin on a full-sphere head) | 28 | 0.0102 | 63264 | 1958 |
| BUCKLE: x the whole centre (stamens and a style under a buckled whorl) | 280 | 0.0796 | 53600 | 1465 |
| BUCKLE: x ZYGO 2 whorls x ALL INNER MAX (the buckle is not role-differentiated) | 22657 | 2.1213 | 37888 | 2006 |
| TIP SHAPE: 3.00 x ALL FORM MAX (the ladder under every deformation at once) | 10760 | 1.0968 | 19040 | 1133 |
| TIP SHAPE: x the whole centre (stamens and a style under a round tip) | 272 | 0.0796 | 53600 | 1258 |
| TIP SHAPE: x ZYGO 2 whorls x ALL INNER MAX | 4584 | 0.5275 | 37888 | 1311 |
| LADDER x BUCKLE: f 7 — the ceiling, where the gap bound collapses the ladder to uniform | 12 | 0.8685 | 19040 | 641 |
| LADDER x BUCKLE: f 5 — the ladder is bounded but still redistributes | 37 | 0.1931 | 19040 | 588 |
| LADDER x BUCKLE: f 1 — one cycle, the ladder is unbounded by the buckle | 254 | 0.6514 | 19040 | 660 |
| LADDER x BUCKLE: the clamp binding under a round tip | 10 | 0.1778 | 19040 | 624 |
| TIP SHAPE: 3.00 x a cleft margin | 4647 | 0.8550 | 29216 | 489 |
| LOBES: x cup 0.40 (the cup alone carries 2 span-0 touches at the form-onset crease; the lobed ladder lands 3 — a sampling coincidence of the stations against the crease, never a fold) | 1 | 0.0000 | 19040 | 1227 |
| LOBES: x cup 1.2 (over a fold declared on main — must not gain a new one) | 724 | 0.2155 | 19040 | 1231 |
| LOBES: x roll 330 (over the quill, declared on main) | 16360 | 1.6103 | 19040 | 1213 |
| LOBES: x curl 360 (over the fiddlehead, declared on main) | 864 | 0.5070 | 19040 | 1273 |
| LOBES: x the whole centre (stamens and a style under a lobed whorl) | 272 | 0.0796 | 53600 | 1460 |
| LOBES: x ZYGO 2 whorls x ALL INNER MAX (the cut is not role-differentiated) | 6176 | 0.4481 | 37888 | 2101 |
| LOBES: x the domed hub (head rise 1.00) | 216 | 0.4176 | 22304 | 633 |
| STEM: x a hemisphere (rise 1.00 — the deepest bowl, the most hidden length) | 216 | 0.4176 | 22780 | 411 |
| SPHERE STEM: x 40 petals x 6 turns (240 feet — the most the channel ever sorts) | 199 | 0.2394 | 527872 | 13458 |
| ALL MAX | 129803 | 3.1556 | 2412412 | 75990 |

**The refused row.** `ALL MAX` builds **2,412,412** triangles in EXPORT mode and 2,412,412 in
LIVE mode under Node 20 (the two are asserted equal by the new XR1 clause); the entry recorded
2,412,512. The hundred triangles are the stem tip plug's — a hollow stem's bore closed at the
bottom (`docs/bloom-stem-tip-plug-outcome.md`, "moves … 100 triangles") — which landed after
the fringe session wrote the number, and moved it without a red because the count was prose.
Its census reads 129,803 pairs / 3.1556 mm against a recorded 130,004 / 3.1556: better, and
unrecorded. PR #243's own body reports the same drift from the other side ("re-measured at
104,563 pairs … the entry read 130,004 — stale again"), on ITS tree, which carries the sepals.

**The wall instrument** (Node 20, `node tools/bloom-wall-thickness.mjs`):

| record | recorded (session 34) | measured on `7ebfb7f` | direction |
|---|---|---|---|
| `SELF_XFAIL['roll-max']` self-approach | 0.659 mm | 0.659 mm | reproduces |
| `SELF_XFAIL['form-max']` self-approach | 0.010 mm | 0.042 mm | better (further from itself), unrecorded |
| `SELF_XFAIL['buckle-on-form']` self-approach | 0.299 mm | **0.254 mm** | **WORSE** — the sheet comes 0.045 mm closer to itself |
| V4 marker `buckle-on-form` own contribution | 0.602 mm | **0.607 mm** | **WORSE** by 0.005 mm |

---

## 3. The tolerance ruling

**The discipline is a stated bar per assertion class, and for the counts that bar is zero.**
Three candidates were on the table — a fixed band, a relative band, a per-class bar in the
quantity's own unit — and the third is the only one with a derivation for every number in
it. A **pair count** is an integer property of the tessellation, not a length: on one engine it
has no noise at all (0 of 261 rows differ between Node 20 and Node 22, above), the seam-bytes
list already holds its triangle counts exactly in both directions ("it is not a tolerance and
it is not a skip"), and `bloom-lobe-composition.mjs` has held five of these very entries to
the exact pair since session 38 — so the count's band is **0**. A **worst span** is a length,
and its band is the record's OWN ROUNDING: the list records four decimals, so **±5e-5 mm**
(half a unit in the last place) is the widest claim "the tree still reads what was written
down" can make without inventing a threshold; it is the same figure the lobe-composition tool
has used against this list since session 38, and four orders above the ~1e-12 mm an engine ulp
moves a station by. The wall instrument prints three decimals, so its two records get
**±5e-4 mm**. The refused row's triangle count is topology and gets **0**. **A relative band
was rejected because it is wrong in both directions at once**: at 25% it passes the +17%
`ALL MAX` regression session 42 called "the one real regression" and reddens a four-pair row
on one tangency touch; there is no percentage that separates a regression from a sampling
coincidence on a quantity that runs from 4 to 129,803. **A fixed band on the count was
rejected for the same reason in one direction** — ±10 pairs is a third of a small row and
nothing on a large one. And **both directions are gated**, because an entry is a record of the
tree and a record that stops reproducing is stale whether the row got worse or better; the
message names which, because they mean different things. What this costs a session that
legitimately moves the tessellation is one Node run of `node tools/bloom-xfail-magnitudes.mjs`
and the re-recorded entries in the same commit, with the movers named in its outcome doc —
which is what the seam session and session 42 already did by hand.

**Which rows the choice makes newly red today, and how they are recorded.** Against the figures
the lists carried on `main` at `7ebfb7f`, the ruling reddens **23 self-intersection rows**
(§2's tables), **the refused row's triangle count**, and **three of the wall instrument's four
figures** — 27 findings. **No band was widened to absorb any of them.** Because this PR may not
move a byte of geometry, each is recorded at the magnitude the tree measures TODAY, with the
previous figure kept verbatim in the entry's own note (`WORSE since the magnitude gate
landed: this entry read N / X.XXXX until 2026-09-17 …`) so the drift is legible in the list
itself and not only here; the nine rows that are WORSE are findings for the owner of the
change that moved them (§6), not numbers typed around. From this commit on, the same drift on
any of these rows is a red in CI.

---

## 4. The instrument proven

**(a) The real export gate, on a scratch commit, record made stale.** Branch
`scratch/xfail-perturb` (commit `38e6358`, never pushed) changes ONE entry —
`petalRoll max (330)` recorded at 18000 pairs / 1.3000 mm where the row reads 18776 / 1.3837 —
and runs `node tools/verify-bloom-export.mjs --only '^petalRoll max \(330\)$'` through a real
browser, a real STL and the shipped clause:

```
export gate: pass criterion is boundary === 0, nothing else. nonManifold and shells are unrated diagnostics.
ROWS: 1 attempted · 0 reached the results · 0 watertight (boundary = 0) · 1 DROPPED by a validity assertion — NOT a pass; 8s
export gate: 2 VALIDITY ASSERTION(S) FAILED — see the "HARNESS INVALID" block (stderr; it may appear ABOVE this line in a combined log).
export gate: HARNESS INVALID — 2 validity assertion(s) failed. No result above is trustworthy.
  - petalRoll max (330): X1: this row is declared at 18000 within-shell pair(s) and reads 18776 (+776, band ±0) — the declared self-intersection got WORSE. The entry is a measurement of the tree: re-measure with node tools/bloom-xfail-magnitudes.mjs and re-record it in the commit that moved it, naming the move in its outcome doc. Declared: 18000 pairs, worst span 1.3000 mm; X1: this row is declared at a worst span of 1.3000 mm and reads 1.3837 (+0.0837 mm, band ±0.00005 mm) — the declared fold reaches FURTHER through the sheet. Re-measure with node tools/bloom-xfail-magnitudes.mjs and re-record it in the commit that moved it, naming the move in its outcome doc.
  - row census: 1 rows attempted but 0 reached the results — dropped: petalRoll max (330)
export gate: FAILED — 1 row(s) dropped of 1 attempted, 2 validity assertion(s), 0 not watertight, 0 with degenerate triangles, 0 whose triangle count moved between modes. Nothing above is a pass.
```

**(b) The record-side control in the tool** (`node tools/bloom-xfail-magnitudes.mjs --control`):
one row's true reading against six records — the true one, each quantity one unit stale in
each direction, both wrong at once — must fire exactly the clause named and nothing on the
true record:

```
control row: "petalCup min (-0.8)" reads 384 pairs, worst span 0.2104 mm; declared 384 pairs, worst span 0.2104 mm
  ok   true record (must be silent)                         fired 0 X1 clause(s), wanted 0
  ok   pairs recorded one too FEW (the row reads worse)     fired 1 X1 clause(s), wanted 1
         X1: this row is declared at 383 within-shell pair(s) and reads 384 (+1, band ±0) — the declared self-intersection got WORSE. The entry is a measurement of the t…
  ok   pairs recorded one too MANY (the row reads better)   fired 1 X1 clause(s), wanted 1
         X1: this row is declared at 385 within-shell pair(s) and reads 384 (-1, band ±0) — the declared self-intersection IMPROVED and nobody re-recorded it. The entry …
  ok   span recorded shallower than the row reads (worse)   fired 1 X1 clause(s), wanted 1
         X1: this row is declared at a worst span of 0.2093 mm and reads 0.2104 (+0.0011 mm, band ±0.00005 mm) — the declared fold reaches FURTHER through the sheet. Re-…
  ok   span recorded deeper than the row reads (better)     fired 1 X1 clause(s), wanted 1
         X1: this row is declared at a worst span of 0.2115 mm and reads 0.2104 (-0.0011 mm, band ±0.00005 mm) — the declared fold is SHALLOWER and nobody re-recorded it…
  ok   both wrong at once                                   fired 2 X1 clause(s), wanted 2
         X1: this row is declared at 768 within-shell pair(s) and reads 384 (-384, band ±0) — the declared self-intersection IMPROVED and nobody re-recorded it. The entr…
         X1: this row is declared at a worst span of 0.4218 mm and reads 0.2104 (-0.2114 mm, band ±0.00005 mm) — the declared fold is SHALLOWER and nobody re-recorded it…

control: the magnitude clause fires on a stale record in both directions on both quantities, and is silent on the true one.
```

**(c) The geometry-side control** (`--root <worktree>`): a worktree of `main` with the buckle
field 20% too big (`const A = Math.min(asked, cap) * 1.2` — a scratch mutation, never committed)
measured against THIS tree's records. The clause is the gate's own function, imported from
this tree; only the geometry is the mutant's:

```
geometry from /tmp/claude-0/-home-user-Portfolio-Site/2d78e12c-e14c-58b6-8d6c-1b2b2d77b3ae/scratchpad/wt-mut — bloom-geometry.js DIFFERS from this tree's; the list and the clause are this tree's
  MOVED       4 pairs · 0.0146 mm   declared       8 · 0.0179     1107ms  buckleAmp max (0.6)
  MOVED       8 pairs · 0.0180 mm   declared       8 · 0.0104      918ms  BUCKLE: the default frequency at a strong amplitude (0.30 x, f 3)
  MOVED       5 pairs · 0.0997 mm   declared       4 · 0.0011      505ms  BUCKLE: THE ROSE look — low amplitude, high p (a narrow band at the edge)

3 declared row(s) measured (a --only subset; no matrix-level claim), 0 at their recorded magnitude; band: pairs exactly, span ±0.00005 mm; v20.20.2

FAIL — 5 finding(s):
  "buckleAmp max (0.6)": X1: this row is declared at 8 within-shell pair(s) and reads 4 (-4, band ±0) — the declared self-intersection IMPROVED and nobody re-recorded it. The entry is a measurement of the tree: re-measure with node tools/bloom-xfail-magnitudes.mjs and re-record it in the commit that moved it, naming the move in its outcome doc. Declared: 8 pairs, worst span 0.0179 mm
  "buckleAmp max (0.6)": X1: this row is declared at a worst span of 0.0179 mm and reads 0.0146 (-0.0033 mm, band ±0.00005 mm) — the declared fold is SHALLOWER and nobody re-recorded it. Re-measure with node tools/bloom-xfail-magnitudes.mjs and re-record it in the commit that moved it, naming the move in its outcome doc.
  "BUCKLE: the default frequency at a strong amplitude (0.30 x, f 3)": X1: this row is declared at a worst span of 0.0104 mm and reads 0.0180 (+0.0076 mm, band ±0.00005 mm) — the declared fold reaches FURTHER through the sheet. Re-measure with node tools/bloom-xfail-magnitudes.mjs and re-record it in the commit that moved it, naming the move in its outcome doc.
  "BUCKLE: THE ROSE look — low amplitude, high p (a narrow band at the edge)": X1: this row is declared at 4 within-shell pair(s) and reads 5 (+1, band ±0) — the declared self-intersection got WORSE. The entry is a measurement of the tree: re-measure with node tools/bloom-xfail-magnitudes.mjs and re-record it in the commit that moved it, naming the move in its outcome doc. Declared: 4 pairs, worst span 0.0011 mm
  "BUCKLE: THE ROSE look — low amplitude, high p (a narrow band at the edge)": X1: this row is declared at a worst span of 0.0011 mm and reads 0.0997 (+0.0986 mm, band ±0.00005 mm) — the declared fold reaches FURTHER through the sheet. Re-measure with node tools/bloom-xfail-magnitudes.mjs and re-record it in the commit that moved it, naming the move in its outcome doc.
```

Note `buckleAmp max (0.6)` IMPROVES under a larger field (8 → 4 pairs) while the two rows beside
it get worse — which is the measured reason a closed form in the field's parameters cannot
stand in for the census, and why both directions are gated.

**(d) The wall instrument's record control**, riding inside its existing `--negative-control`
so CI carries it (Node 20, this tree, the four geometry mutants green above it):

```
  ok   record control: V5 record stale, worse   fired V5 xfail magnitude
  ok   record control: V5 record stale, better  fired V5 xfail magnitude
  ok   record control: V4 record stale, worse   fired V4 xfail magnitude
  ok   record control: V4 record stale, better  fired V4 xfail magnitude
negative control: all mutants behaved.
```

**(e) The real export gate on the refused row** (`--only '^ALL MAX$'`, this tree): XR1's new
exact-count clauses against the page's own read-out and the builder's tally:

```
  EXPORT REFUSED, DECLARED (ALL MAX): 2,412,412 tris (export) over the 1,500,000 budget, 115.0 MiB — the generator's own guard, asserted by XR1, not a pass and not a skip
EXPORT REFUSED, DECLARED (ALL MAX): 2,412,412 tris (export) over the 1,500,000 budget, 115.0 MiB — the generator's own guard, asserted by XR1, not a pass and not a skip
ROWS: 1 attempted · 0 reached the results · 0 watertight (boundary = 0) · 1 EXPORT REFUSED by the generator's own triangle budget (declared, asserted by XR1 — not a pass and not a skip); 206s
```

**What is NOT proven by any of this, said plainly:** X1's magnitude clause cannot run on the
refused row in CI (no STL, so no X0 and no census) — its figure is measured here in Node with
`--include-refused` and stands as last measured, which the gate's own coverage note says on
every run. And O2's parity clause stays exempt on declared rows by design (parity is undefined
on a shell that passes through itself), so a declared row's orientation is reported, never
asserted — unchanged by this PR.

---

## 5. The byte partition — geometry byte-identical to `main`

**By construction:** the files the export path reads — `bloom-geometry.js`,
`bloom-registry.js`, `bloom.js`, `bloom.html`, `bloom.css` — are untouched, sha256-identical
to `origin/main` at `7ebfb7f`; the diff names only `tools/`, `docs/` and `CLAUDE.md`:

```
<<DIFF-STAT>>
```

**Measured anyway, on the charter's convention:** every row of the live matrix but the refused
one, built in BOTH modes on a worktree of `7ebfb7f` and on this tree, compared float for float
with `Object.is`:

```
<<BYTES>>
```

No row was added or removed, so **no frozen phase is owed**; `frozen/phase33` stays the newest
baseline and no tag's bytes stop reproducing.

---

## 6. Where the drift came from

<<ATTRIBUTION>>

---

## 7. Open, and named

- **PR #243 (sepals, draft) touches `tools/bloom-harness.mjs` and adds entries to this list in
  the old string form.** Whichever merges second rebases onto a list whose shape changed; its
  session re-emits its entries with `--emit` and re-records `ALL MAX` (its own body already
  measured 104,563 pairs and 2,506,652 triangles on its tree). Left to Eva's ordering.
- The flower's three lists (§1) carry boolean xfails; a magnitude there is a candidate, not
  built.
- The per-row magnitude is asserted only in the EXPORT gate (X1 rides there; the connectedness
  gate runs no census). XR1's exact count rides in both.
