# RIBS — radial spoke ribbing, the third texture choice. Prototype and look sheet

Nov 9. A prototype and a sheet for Eva's spacing ruling. **No shipped bloom file
changes**: `bloom-geometry.js`, `bloom-registry.js`, `bloom.js`, `bloom.html` are
untouched. The sheet is `docs/img/bloom-texture-ribs.png`; every number below is in
`docs/data/bloom-texture-ribs.json`. Read §1 for what was built, §2 for the meshing
answer, §7 for the questions. **§10 is the second round (Eva's rulings of Nov 9 on #541): law
A the default, the stem and rods excluded by name, and the three centre treatments for
her ruling** — sheet `docs/img/bloom-texture-ribs-centre.png`. **§12 is the third round: Eva
chose STARBURST and asked it to reach further toward the edges** — sheet
`docs/img/bloom-texture-ribs-starburst.png`. **§13: the rim eases off (Eva, fourth round).** §2–§6 and the main sheet are
the first round's record and predate the exclusion (their stem rows are fluted).

## 0. The rulings in force

Eva's of Nov 9: RIBS is a THIRD choice (NONE / BONE / RIBS), one at a time, never
layered with BONE; radial spokes about the bloom's axis as ONE shared world field
(petals, sepals, leaves, the hub and the stem read the same spokes; on the stem they
are vertical flutes); SHARP crests; coverage EVERYWHERE VISIBLE (no BONE patch
islands); the spacing law rendered both ways — (A) a fixed spoke count, fanning, (B)
constant spacing, new ribs beginning partway out — with each saying how it handles
the axis on the hub top. And the texture rulings for every pattern: attachment B,
OUTWARD ONLY, peak-to-valley height 0.4–2.5 mm, visible surfaces only, T5's coverage
and owner rules, exclusive with the infill, ships OFF as a choice, the one
`EXPORT_TRI_CAP` (2.0 M, provisional), engine-agreed arithmetic only.

## 1. What was built

`bloom-texture-ribs.js` (the module) and four tools, all prototype:

| file | what |
|---|---|
| `bloom-texture-ribs.js` | the field, the schedules, the crest-line cutter, the patched copy of the geometry with its hook, `ribsBuild` |
| `tools/verify-bloom-ribs.mjs` | the gate R0–R6, `--negative-control` (seven mutants), `--browser` (R5's engine half) |
| `tools/bloom-texture-ribs-measure.mjs` | crest quality, print reality, budget, rods (§2–§5) |
| `tools/bloom-texture-ribs-browser.mjs` | Chromium build times and engine agreement (§5) |
| `tools/shot-bloom-texture-ribs.mjs` | the sheet |

**How it rides the shipped pipeline.** The shipped geometry is read as text and five
anchored edits are applied to a copy in memory (each anchor must match once, BONE v2's
own prototype discipline). With the hook on, BONE's texture record takes the RIBS field
for `f` and the constant 1 for the patch mask `mp`, and no BONE v2 record (its
allocator never runs). Everything else is the shipped BONE relief pass, unchanged:
the sheets' emitter ramps, T5's visibility and coverage, the geodesic fade, the
curvature mask, the derived owner. So "everywhere visible" here IS the shipped
definition of visible, decided on the shipped lattice. After the shipped coarse write,
the hook re-meshes each organ (§2) and rebuilds the stream.

**The field.** `F(p)` in [0, 1] of the point's (x, y) alone — the angle about the axis
by an arithmetic `eatan2` (two exact half-angle reductions and a 13-term series; agrees
with `Math.atan2` to 1e-15) and the radius by `Math.sqrt`. Across a pitch the profile is
`g(u) = (1 − u)^2`, u = 0 at a crest, 1 at the valley: concave flutes meeting at a sharp
arris (the slope at the crest is finite and nonzero — a kink, never a cusp). A
`ribCrest` rounding w in [0, 0.5] of the half-pitch replaces u < w by the matching
parabola, renormalised; 0 (sharp) is the default the ruling asks for. Relief is
`w0 x mc x H x F`, outward along each vertex's own normal: the floor of every flute is
the sheet.

**The schedules** (`ribSchedule`). A count is always n0 × 2^L; level L begins at
`rStart[L]`; a level's new ribs (the odd ones of its grid) grow from the flute's floor
to full height over one asked spacing outward (`RIB_EMERGE_K` 1, a proposal):

| law | count | at the default 2.5 mm spacing |
|---|---|---|
| A (fade, start) | K = round(2π × 20 / s), fixed | 50 spokes; pitch 0.38 mm at r 3, 2.5 at 20, 5.7 at 45 |
| A (thin) | K rounded to 4 × 2^M; every other spoke ends INWARD where the spacing would fall under the 1.6 mm floor, down to 4 | 64 outside 16.3 mm; 32 from 8.15; 16 from 4.07; 8 from 2.04; 4 |
| B | 4 × 2^L, unbounded; level L begins where its spacing is s/√2 | 4; 8 from 2.25; 16 from 4.50; 32 from 9.00; 64 from 18.0; 128 from 36.0 mm — the pitch stays in [1.77, 3.54] mm |

**The axis.** Every law's innermost level converges on the axis; its spacing reaches the
floor `RIB_SPACING_FLOOR_MM` = 4 × the 0.4 mm lattice edge = 1.6 mm (T3's own
four-edge floor, derived, never typed per law) at r0 = n0 × 1.6 / 2π:

- **FADE** eases the height to 0 between r0/2 and r0 (quintic);
- **START** holds full height to r0 and drops it over one lattice edge inside;
- **THIN** is A's inward halving (above), then a fade on its last 4 spokes.

**What that does, measured** (rows 3–4 of the sheet): A's 50 spokes reach the floor at
**r0 = 12.73 mm — outside the 8.8 mm hub** — so A-FADE and A-START leave the whole hub
top SMOOTH and the petals' inner thirds ribless, and **A's stem (r 3) is smooth**: its 50
spokes would stand 0.38 mm apart there. A-THIN keeps ribs on both. B thins by
definition; only its last 4 spokes converge, inside r0 = 1.02 mm: FADE leaves a soft
cross, START a crisp one ending on a ~1 mm flat disc. **B has no THIN** (refused by
name in `ribParams`). On the stem, B and A-THIN both give **8 vertical flutes** (pitch
2.36 mm); B's 8 are 4 full flutes and 4 still emerging (the 8-level begins at 2.25 mm
and grows over 2.5 mm), A-THIN's 8 are all full (its 8-level begins at 2.04 mm).

## 2. Meshing: a crest is only crisp on a mesh edge

Three options, measured on a petal, the hub top and the stem (EXPORT, Node). Each
crest sample is a point on a crest line on the shipped lattice where the relief is at
full weight and the rib at full strength (no fade, no emergence); the EMITTED displaced
triangles of that organ are cut by the plane through it square to the crest, and the
upper envelope is the profile the file holds. Reported: the included crest angle from
secant slopes over pitch/8 either side (beside the same angle of the field RESTATED
with `Math.atan2`, a different owner), the zigzag (the peak's lateral offset from the
true crest), the crest height lost, triangles / mm².

| option | what | default bloom, triangles |
|---|---|---|
| (i) lattice | the field on the shipped 0.4 mm lattice — BONE's release build | 158,912 (A and B) |
| (ii) crest | every crest half-plane cut into each organ's lattice as constraint edges | A 189,836 · B 190,130 (+19.5–19.6 %) |
| (ii+) crest + flank | crest, half-flank and valley lines (4 a pitch) | A 282,608 · B 297,464 (+78–87 %) |
| (iii) split | (i) live, (ii) on export | — (a policy over (i) and (ii)) |

**Crest quality, the petal** (60 samples a row, medians; the asked angle differs
between the laws because their pitch at the sampled radii differs):

| law | H | option | crest built (asked) | zigzag median / max | height lost | tris/mm² |
|---|---|---|---|---|---|---|
| A | 0.4 | lattice | 143.8° (126.4°) | 0.093 / 0.169 mm | 0.055 mm (14 %) | 20.6 |
| A | 0.4 | crest | 127.3° (126.4°) | 0 / 0 | 0 | 24.8 |
| A | 2.5 | lattice | **72.0° (33.3°)** | 0.111 / 0.166 mm | **0.480 mm (19 %)** | 20.6 |
| A | 2.5 | crest | 34.3° (33.3°) | 0 / 0 | 0 | 24.8 |
| B | 0.4 | lattice | 141.0° (124.6°) | 0.074 / 0.171 mm | 0.048 mm (12 %) | 20.6 |
| B | 0.4 | crest | 124.4° (124.6°) | 0 / 0 | 0 | 24.7 |
| B | 2.5 | lattice | **53.8° (30.2°)** | 0.082 / 0.166 mm | **0.436 mm (17 %)** | 20.6 |
| B | 2.5 | crest | 30.8° (30.2°) | 0 / 0 | 0 | 24.7 |

Crest + flank lines read the crest identically to crest lines (A 127.3° / 34.3°, B
124.4° / 30.8°) at 37.4 / 38.9 tris/mm².

**The hub top (B, H 2.5):** lattice 49.3° (asked 21.5°), zigzag 0.045 mm, 0.78 mm of
crest lost; crest lines 21.5° (21.5°), no zigzag, 0.02 mm (40 samples each). **The stem (B):** the shipped stem lattice's
48 sector columns already stand on B's 8 flutes, so all three options build the same
crest — 137.3° (asked 140.0°) at H 0.4 and **67.5° (asked 47.4°) at H 2.5**. That gap
is not meshing: on a 3 mm cylinder the relief radiates along the normals, so a flank
point at azimuth φ lands at lateral (3 + h) sin φ rather than 3 sin φ and the rib fans
open; the restated "asked" figure is taken on the tangent line and does not carry the
surface's curvature. A's stem has no samples: it is smooth (§1).

**Findings.** (i) is not a sharp crest: on the lattice the arris falls between lattice
vertices, so the drawn ridge zigzags laterally by up to 0.17 mm and loses up to 19 % of
its height — at H 2.5 the crest reads 72° (A) and 54° (B) where 33° and 30° are asked. (ii)
puts every crest on a mesh edge and reproduces the asked angle to ~1° with no zigzag, for **+19.5 %
triangles** on the default. (ii+) buys nothing at the crest (identical angles) — its
quarter-pitch lines sample the concave flank, which the shipped lattice already samples
at four-plus edges a pitch — for +80 % more. (iii) is available and cheap either way:
the cut is 0.9–1.4 s on the default in Node.

**The cutter.** A line is a vertical half-plane through the axis at angle 2πj/G; each
lattice edge is cut where it crosses, with the point's line id and its lerp weight;
each lattice triangle is split along its chords (a line meets a triangle in at most one
chord; the pieces are convex) and each piece fanned from the apex whose smallest
triangle is largest (a centroid fan where none is clean — 0 on every measured row). A
cut point is a function of its EDGE alone, so the result is conforming by construction.
A lattice edge that already lies on a line (both ends within the 3 µm snap — the stem's
columns) is claimed as it stands and never cut. Three rules keep parts apart: an edge
with a junction vertex (a position two parts emit) is never cut; a new point whose
float32 key another part carries withdraws its edge (up to four passes; 0–96 withdrawn
on the measured rows); an edge cut only where the relief reaches it.

**Engine agreement, and the one defect it found.** The first crest build agreed with
Chromium on its COUNT and differed on 4,910 float32s (up to 0.53 mm): the shipped
lattice's doubles differ in the last bit between the engines (its petals are laid with
`Math.cos` / `Math.sin`; float32 hides it, which is why the lattice build agrees to the
bit), and the cutter decided a quad's diagonal on them. Every input the cutter decides
on is snapped to 2⁻²⁰ mm now (BONE v2's own `BONE2_QUANT`), the new points lie on the
snapped edge (≤ 7e-7 mm off the emitted one; both triangles share the point, nothing
cracks), and **Node and Chromium agree on the count and every float32** (§5).

## 3. Print reality (SLS PA12)

The default bloom, EXPORT, at H 0.4 and 2.5, both laws, lattice and crest:

| law | option | H | triangles | within-shell pairs | shells | open / doubled / degenerate | printable gaps newly closed | cutter flips |
|---|---|---|---|---|---|---|---|---|
| A | lattice | 0.4 | 158,912 | 0 | 9 | 0 / 0 / 0 | 0 of 6,486 | — |
| A | lattice | 2.5 | 158,912 | 0 | 9 | 0 / 0 / 0 | 0 of 28,772 | — |
| A | crest | 0.4 | 189,836 | 0 | 9 | 0 / 0 / 0 | 0 of 9,865 | 0 |
| A | crest | 2.5 | 189,836 | 0 | 9 | 0 / 0 / 0 | 0 of 39,983 | 0 |
| B | lattice | 0.4 | 158,912 | 0 | 9 | 0 / 0 / 0 | 0 of 7,606 | — |
| B | lattice | 2.5 | 158,912 | 0 | 9 | 0 / 0 / 0 | 0 of 31,062 | — |
| B | crest | 0.4 | 190,130 | 0 | 9 | 0 / 0 / 0 | 0 of 9,190 | 0 |
| B | crest | 2.5 | 190,130 | 0 | 9 | 0 / 0 / 0 | 0 of 41,063 | 0 |

(Gaps: every third triangle's relieved vertices against every other part within 1 + H,
on the same mesh built with nothing raised; `boneNoRelief`, paired vertex for vertex.)
No fold, no new contact, no gap closed, on either law at either height.

**The crest that will print — UNVALIDATED.** A sharp crest prints ROUNDED. SLS PA12
resolves about 0.35–0.4 mm of detail; a crest radius under about **0.2 mm** is unlikely to
survive the laser spot and powder fusing. That is an assumption from the process's
published resolution, never a measurement: nothing here has been printed. At H 2.5 on
B's 2.3 mm pitch the asked crest is ~29°, a knife edge the process will round to roughly
that radius; at H 0.4 it is ~124°, where 0.2 mm of rounding is barely visible. The
`ribCrest` control exists so a rounded crest can be asked for rather than left to the
printer (question 5).

## 4. Budget against `EXPORT_TRI_CAP` (2.0 M, provisional)

Node, EXPORT; % of the cap:

| state | law | lattice (release) | crest (export) | the cut alone | crest + flank |
|---|---|---|---|---|---|
| default | A | 158,912 · 7.9 % · 1.3 s | 189,836 · 9.5 % · 1.8 s | 0.9 s | 282,608 · 14.1 % |
| default | B | 158,912 · 7.9 % · 1.1 s | 190,130 · 9.5 % · 2.4 s | 1.4 s | 297,464 · 14.9 % |
| umbel (head ON) | A | 530,634 · 26.5 % · 5.3 s | 597,696 · 29.9 % · 9.5 s | 4.6 s | 808,832 · 40.4 % |
| umbel (head ON) | B | 530,634 · 26.5 % · 5.3 s | 609,962 · 30.5 % · 9.3 s | 4.7 s | 870,238 · 43.5 % |
| mophead (depth 2) | A | 1,762,254 · 88.1 % · 61 s | 1,894,982 · **94.7 %** · 73 s | 16.2 s | 2,300,482 · **115 % OVER** |
| mophead (depth 2) | B | 1,762,254 · 88.1 % · 65 s | 1,960,690 · **98.0 %** · 71 s | 15.4 s | 2,586,968 · **129 % OVER** |

Every crest build closes: 0 open, 0 doubled, 0 degenerate directed edges; shells 9 /
53 / 458, the lattice build's. **The mophead fits the cap with crest lines and only
just** (B leaves 39,310 triangles); crest + flank lines do not fit it. The lattice build
IS BONE's coarse count to the triangle (the same lattice, a different field). There is
no allocator: were a heavier state over the cap, the export would be refused as any
over-cap build is today.

## 5. Release and full times in Chromium; engine agreement

`tools/bloom-texture-ribs-browser.mjs`: a fresh Chromium page per build, the
prototype's own module, EXPORT; Node beside it. AGREE = the same triangle count and the
same FNV-1a hash of every float32.

| state | law | lattice (release): Chromium · Node | crest (full): Chromium · Node | heap at the end | engines |
|---|---|---|---|---|---|
| default | A | 0.80 s · 1.25 s | 1.45 s · 2.26 s | 0.11 / 0.14 GB | AGREE |
| default | B | 0.89 s · 1.03 s | 1.96 s · 2.58 s | 0.11 / 0.08 GB | AGREE |
| umbel | A | 3.84 s · 4.76 s | 5.54 s · 7.84 s | 0.36 / 0.32 GB | AGREE |
| umbel | B | 3.62 s · 4.69 s | 5.84 s · 8.09 s | 0.24 / 0.28 GB | AGREE |
| mophead | A | 41.7 s · 52.7 s | 46.4 s · 62.9 s | 0.85 / 1.30 GB | AGREE |
| mophead | B | 42.6 s · 53.3 s | 47.4 s · 62.8 s | 1.11 / 0.74 GB | AGREE |

12 of 12 agree to the bit. The crest build costs the default +0.6–1.1 s and the mophead
+4.7–4.8 s over the release build in Chromium; unlike BONE v2's full build (38.8 s on
the default, a crashed page on the mophead) it is cheap enough to be the live build too
(question 3). The mophead's 42 s release build is BONE's coarse cost, not the ribs'.

## 6. What the shipped curvature and visibility rules do under ribs (reported, not special-cased)

`node tools/bloom-texture-ribs-measure.mjs --section rods` (law B, the lattice build;
"relieved" = vertices carrying any relief):

| state | boneCurvature | relieved: petal / hub / stem | rods |
|---|---|---|---|
| default | 1 /mm (BONE's default) | 64,336 / 75,816 (84.9 %) · 1,204 / 6,694 (18.0 %) | — |
| default | 4 /mm (its maximum) | 74,256 / 75,816 (97.9 %) · 1,240 / 6,694 (18.5 %) | — |
| 12 stamens + style + 60 mm stem | 1 | 84.9 % · 22.3 % · 91.3 % | **all 13 smooth** (every vertex a ridge, κ ≥ 1.04 /mm) |
| the same | 4 | 97.9 % · 22.9 % · 95.5 % | stamens 72.0 %, style 71.3 % relieved |
| 6 braided stamens + style | 1 | 84.9 % · 23.1 % · 91.5 % | **all 7 smooth** |

- **Rods.** At BONE's default 1 /mm the curvature rule smooths every stamen, the style
  and every braided strand (their tightest curvature is 1.04 /mm). At 4 /mm they take the
  spokes; on a stamen near the axis that is a few flutes round a 1.2 mm rod.
- **Bead and nib.** At 1 /mm, 11,000 petal vertices are ridges (the bead's half-round,
  0.45 mm radius, and the nib) and are smoothed with a geodesic fade; at 4 /mm only 1,080
  are. Row 9 of the sheet shows the tip both ways.
- **Visibility.** Everywhere visible is the shipped definition: the petals' and the hub's
  undersides carry spokes, and the hub top under the feet is covered and smooth (only
  18 % of the hub's vertices are relieved on the default). The fade at a covered edge is
  max(H × 15/8, e): 0.75 mm at H 0.4, 4.7 mm at 2.5.

Nothing was special-cased; questions 6 and 8 ask.

## 7. The gate (`tools/verify-bloom-ribs.mjs`, local only, not in CI)

Every clause reads its reference from an owner the module under test does not write.

| clause | holds |
|---|---|
| R0 outward only | on the emitted file, every displaced vertex moved along the outward side of its own undisplaced incident faces (the file's winding), by no more than H; reference: the same build with nothing raised, paired vertex for vertex |
| R1 one shared field, derived from the axis | every vertex at full weight carries exactly H × the field RESTATED in the gate (`Math.atan2`, `Math.round`, the schedule restated from the brief's laws); none carries more than weight × H × field; old and new vertices of every organ |
| R2 crest edges on the constraint lines | every claimed crest edge is an edge of the file (float32 keys); its ends lie on the restated half-plane it names (1e-9 mm for cut points; the 3 µm snap for a lattice edge already on a line) and it names a crest of the level standing there; the chords cover every petal lattice triangle a restated crest crosses at full weight, exemptions (a junction vertex; a crossing within 12 µm of a vertex) counted and printed |
| R3 zero open edges | 0 unmatched, 0 doubled, 0 degenerate directed edges on the float32s |
| R4 no cross-part coincident vertex | no added vertex carries a float32 key another part emits; the shell count equals the lattice build's; and a written-down two-part fixture (a shared edge relieved on both sides, which no default row has) gets no point on the shared edge |
| R5 engine agreement | the decision code names no `Math.atan2/atan/cos/sin/tan/exp/log/log2/pow/hypot/cbrt` and no `**`; with `--browser`, count and float32 hash equal in Node and Chromium |
| R6 the axis rule | no vertex inside the schedule's cut radius carries relief |

Rows: A at H 0.4, B at 2.5, A-THIN with crest + flank at 2.5, B-START with a 40 mm stem.
**PASS on all four.** R5's browser half: the tool in §5 builds 12 rows in both engines, all AGREE.

**Seven mutants, each with a witness on the mutated module** (never the gate asked
whether the gate fired) — **7 of 7 behave**:

| mutant | fires | witness |
|---|---|---|
| `relief-points-inward` | R0 (476,448 corners into their faces) | a new vertex's displacement against its normal |
| `the-hub-reads-its-own-field` (the petals read a field rotated 1.8°) | R1 (2,752 of 16,250 full-weight vertices off the restated field) | a full-weight petal vertex's relief ≠ H × the module's own field |
| `cut-points-off-the-crest` | R2 (32,432 ends off their half-plane by up to 15 µm) | a written-down triangle's cut point off the line |
| `the-chords-are-ignored` | R2 (coverage 0 of 9,220) | the same triangle yields no chord |
| `the-junction-rule-is-removed` | R4 (the fixture: 2 points on the shared edge) | the fixture's own count |
| `math-atan2-restored` | R5 (the static clause) | `eatan2` returns `Math.atan2`'s double |
| `the-axis-rule-is-dropped` | R6 (1,218 vertices inside 6.37 mm relieved; R1 also, truly) | the field nonzero inside the cut |

Two findings the negative control made about the gate itself, both fixed: the junction
rule is UNREACHABLE on every default row (a shared hub/foot edge is buried on both
sides, so the relief-reach rule alone keeps it uncut) — hence the written-down fixture,
whose first version was itself vacuous (every edge touched a shared corner, so the clean
cutter added nothing); and the first axis-rule mutant was a no-op (the fade multiplier
already zeroes inside the cut radius), so the mutant drops the whole rule.

## 8. Questions for Eva (numbered, with options; my recommendation first)

**[Nov 9: questions 1 and 8 are RULED — A is the default, B an alternative; both faces.
Question 6's rods are moot (excluded by name, §10.1). Question 2 is now the CENTRE (§10).
The rest stay open for the shipping prompt.]**

1. **The spacing law — A or B?** (the sheet's rows 1–5)
   - **(a) B, constant spacing (recommended).** It alone keeps a near-constant pitch from
     the hub to the leaf tips (1.8–3.5 mm), ribs the hub top and fluted the stem with no
     extra rule, and its axis rule acts only inside 1 mm.
   - (b) A, fixed count, THIN at the axis — fans outward (2.5 mm at 20, 5.7 at 45) and
     halves inward; inside 16 mm it is B's branching run backwards.
   - (c) A, fixed count, FADE or START — fans everywhere, and leaves the hub top, the
     inner thirds of the petals and the stem smooth (r0 12.7 mm).
2. **The axis rule for the chosen law.** B: (a) FADE (recommended: a soft 4-spoke cross,
   no flat disc) or (b) START (crisp, ending on a ~1 mm flat disc). A: THIN, FADE, START.
3. **Meshing.** (a) crest lines as edges in both the live build and the export
   (recommended: +19.5 % on the default, +0.6–1.1 s in Chromium; the lattice blunts a
   sharp crest to 54–72° where 30–33° is asked at H 2.5); (b) the BONE split — lattice live, crest lines on export; (c) crest +
   flank lines on export (no crest gain; over the cap on the mophead).
4. **Spacing range and default** (proposals): 1.6–8 mm, default 2.5; A's count taken at
   a 20 mm reference radius. The 1.6 mm floor is four 0.4 mm lattice edges.
5. **The crest.** (a) keep SHARP the default (the ruling) and let the print round it,
   saying so on the control (recommended); (b) floor the crest rounding at a ~0.2 mm
   radius so the file says what the print will do.
6. **Rods, bead and nib under the shipped curvature rule** (§6): (a) keep BONE's mask at
   1 /mm — stamens, style, braid smooth, the bead and nib smooth (recommended: one rule
   for both textures); (b) a ribs-only curvature default of 4 /mm — rods and the bead take
   the spokes.
7. **New ribs grow over one spacing** (B's branching, A's thinning): keep, or longer?
8. **Undersides.** Everywhere visible relieves the petals' and the hub's undersides too
   (the shipped definition of visible): keep (recommended), or upper faces only?
9. **Height default.** 0.4 mm (the texture floor) reads faintly on ribs (a 124° crest):
   keep, or a ribs default nearer 1.0?

## 10. Second round: Eva's rulings of Nov 9, and the centre

### 10.1 What was ruled, and what it changed

1. **SPACING.** Law A (a fixed count, fanning) is the DEFAULT; law B (constant spacing,
   branching) ships as an alternative, a "spacing" choice under RIBS. Both stay in the
   prototype (`ribLaw`, default `'A'`).
2. **ORGANS — EVA'S NAMED EXCLUSION.** Ribs on the petals, sepals, leaves and the hub's
   TOP. The stem and every rod — stamens, style, braid, pedicels, petioles, a compound
   leaf's stalks — are excluded **by name**: `RIB_EXCLUDED_ORGANS` (`stem`, `stamen`,
   `style`, `petiole`, `stalk`) plus any organ the shipped pass marks as a rod, and the
   hub's vertices whose own normal does not point up (its underside and side wall). This
   is a LIST Eva ruled, recorded as such; it is not the derived visibility rule and not
   the derived curvature mask (both still act, unchanged, on what remains). One new
   anchored edit carries it (`excluded`, in `boneReliefPass`'s weight loop) and the
   hook's relief weight reads the same predicate, so an excluded vertex is neither raised
   nor cut. **A's stem fade and B's stem flutes are moot**; §6's rod findings now apply
   only to the leaf blades and the bead/nib.
3. **UNDERSIDES.** Both faces of petals and sepals, as prototyped (question 8 answered).
4. **CENTRE.** Three treatments rendered for Eva's ruling (below).

The default bloom carries no stem and no rods, so ruling 2 changed only its hub: the
underside is no longer raised (R7 counts the hub corners that move — all upward).

### 10.2 The three centres, and the derived radius

`ribCentre`: `'collar'`, `'starburst'`, `'concentric'` (in `RIB_CENTRES`). When one is
asked it decides the axis rule (STARBURST takes A-THIN under A and B's own branching
under B; COLLAR and CONCENTRIC take the plain schedule outside a ring).

**The ring radius is derived at the start of the relief pass, never typed:**

    R = max(r0, rFeet)

- `r0` — where the plain schedule's spacing reaches the 1.6 mm floor (four 0.4 mm lattice
  edges): `n0 × 1.6 / 2π`. A: 50 spokes → **12.73 mm**. B: 4 spokes → **1.02 mm**.
- `rFeet` — the petal feet's INNER EDGE: the least distance from the axis of any petal
  vertex the pass is handed, i.e. where the petals stop covering the hub top. **5.32 mm**
  on the default bloom.
- Snapped to 2^-20 mm (a cut is decided on it).

So **A's ring is its floor radius** (it can print its 50 spokes no closer) and **B's ring
is the feet's inner edge** (where the visible hub disc begins). The ring's half-width
(collar) and the concentric pitch are the same floor spacing, 1.6 mm.

| treatment | how the ribs end | inside |
|---|---|---|
| COLLAR | ribs rise out of a soft raised ring's outer flank, `(1 − (d/1.6)²)²`, over 1.6 mm | smooth inside R − 1.6 |
| STARBURST | every other rib drops inward where the spacing meets the floor (A-THIN; B's levels run the other way); the last 4 fade inside r0/2 | the 4-spoke cross |
| CONCENTRIC | ribs end at a sharp ring crest at R | sharp concentric ridges every 1.6 mm, faded inside 0.8 mm; cut into the mesh as constraint circles (line ids −1, −2, …) |

### 10.3 What it looks like (the centre sheet)

The default bloom, petal feet in place, EXPORT, crest lines, H 1.0. Per treatment × law:
from directly above at raking light, at 45°, and the exact radial section along a petal's
midline (the emitted triangles cut by a vertical half-plane, ribbed against the same mesh
with nothing raised, R marked).

- **A's ring lands OUTSIDE the hub** (12.73 mm against a hub of ~8.8 mm): on the petal
  bases, both faces. Under A-COLLAR the whole visible hub top is smooth; under
  A-CONCENTRIC it carries the rings that fall on relieved surface (6 of 8: the two at
  7.93 and 6.33 mm are wholly under the feet).
- **B's ring sits at the feet's inner edge, inside T5's coverage fade.** The fade is
  `max(H × 15/8, e)` — 1.875 mm at H 1, 4.69 mm at H 2.5 — measured from the feet, so
  B's collar comes out only ~0.15 mm tall on the section at H 1, and at H 2.5 no hub
  vertex inside it reaches full weight. The ring is there; the coverage rule is what
  shades it. Moving R outward of the fade would put it under the feet.
- **STARBURST** is a 4/8/16/32-spoke run inward on the hub (A at 2.04 / 4.07 / 8.15 mm,
  B at 2.25 / 4.50 / 9.00 mm) — the two laws look alike on the hub top and differ on the
  petals.

| law | centre | R (from) | tris | within-shell pairs | open / doubled / degenerate | shells | withdrawn |
|---|---|---|---|---|---|---|---|
| A | collar | 12.73 (the floor) | 185,564 | 0 | 0 / 0 / 0 | 9 | 0 |
| A | starburst | — | 189,642 | 0 | 0 / 0 / 0 | 9 | 64 |
| A | concentric | 12.73 (the floor) | 190,080 | 0 | 0 / 0 / 0 | 9 | 0 |
| B | collar | 5.32 (the feet) | 189,364 | 0 | 0 / 0 / 0 | 9 | 64 |
| B | starburst | — | 189,706 | 0 | 0 / 0 / 0 | 9 | 64 |
| B | concentric | 5.32 (the feet) | 190,060 | 0 | 0 / 0 / 0 | 9 | 64 |

Identical at H 1.0 and H 2.5 (the cut does not depend on the height); 0 folded triangles
everywhere. "Withdrawn" counts edges the cutter gave up because a new point's float32 key
coincided with another part's (the junction rule).

### 10.4 The gate, second round

R0–R6 unchanged in meaning; R1 now restates the centre (R from the plain schedule's r0
and the petal feet read off the LATTICE build — a different build from the one under
test — and requires the build's own R to equal it); R2 holds every concentric ring
crest's ends on its restated circle (≤ 3.6e-15 mm) and every relieved lattice triangle a
ring crosses to carry its chord (A 1,624 / 1,624, B 272 / 272); R6 holds the collar's
smooth disc; **R7 is new: Eva's named exclusion** — every stem and rod triangle equals
the unraised twin's to the bit, and every hub corner that moves moves up. Eight rows
(the four of §7 plus A-COLLAR, A-CONCENTRIC, B-CONCENTRIC, and B-STARBURST on a bloom with
a 40 mm stem, 24 stamens and a style — 11,838 stem/rod triangles unmoved). **PASS on all
eight.**

Two over-strict first drafts of the ring clause, both corrected by measurement: "every
circle carries an edge" failed on A's two rings that lie wholly under the feet, and
"full-weight triangles" was vacuous on B, whose rings all sit in the coverage fade.

**Ten mutants, 10 of 10 behave** — the seven of §7 (unchanged figures) plus three for the
second round, each with a witness on the mutated module:

| mutant | fires | witness |
|---|---|---|
| `the-named-exclusion-is-dropped` | R7 (31,963 stem/rod corners moved; R1 too) | the mutated build raises a stem vertex |
| `the-centre-radius-is-typed` (R = 10) | R1 (the build's R 10 against the restated 12.73; R6 too, 2,556 vertices in the collar's disc) | the mutated build reports R 10 |
| `the-rings-are-not-cut` | R2 (ring chords on 0 of 272 relieved triangles) | the mutated build claims no ring edge |

## 11. Not done (second round)

No shipped file. The centre's ring is drawn at every azimuth, between the petals and
under them alike; whether it should stop at the feet is part of the centre ruling. The
main sheet and §2–§6 were not re-measured after the exclusion (the default bloom has
neither a stem nor rods; the mophead's budget will fall by its pedicels' and stamens'
cut triangles).

## 12. Third round: the starburst, reaching the edge

**RULED (Eva, Nov 9): the centre is STARBURST** — "starburst but have it go further along
the center closer to the edges". Collar and concentric stay in the prototype as the record.

### 12.1 Why the second round's starburst stopped at ~4.7 mm

Measured on the default bloom (8 petals), by the weights the shipped relief pass hands out:

- **The flat octagon from 5.32 to 8.84 mm is the petal FEET**, their top skin flush with the
  hub top (both at z = +0.6). The hub top under them is COVERED (T5's rule: smooth under a
  foot) — 931 of the 981 hub-top vertices beyond the feet's inner edge read weight 0 — and the feet themselves
  carry none (a petal's relief ramp is 0 on every foot row and climbs over the first 3 mm of
  blade; it is the bead's buried-end ramp).
- **Covered vertices SEED the coverage fade**, so the hub's own ribs fade out over
  `max(H × 15/8, e)` — 1.88 mm at H 1, 4.69 mm at H 2.5 — inside the feet's edge.
- **And the hub's RIM is a 90° convex crease, so the shipped curvature mask counts it a
  ridge** and fades relief in from it over the same length. At H 2.5 that alone leaves no
  hub-top vertex beyond the feet's edge at full weight (0 of 981).

### 12.2 What was built (four + one anchored edits, all inert unless the hook asks)

`ribStarburstReach` (`'edge'`, the ruled default under starburst; `'hub'`, the second
round's, kept for the before/after):

1. **The hub top is ribbed over the feet.** A hub vertex the feet cover is marked, is NOT a
   seed of the coverage fade, and takes full weight (edits `cover-decl`, `cover-mark`,
   `cover-seed`, `cover-full`). The feet stay as shipped beneath the raised hub top; at a
   flute floor the two surfaces are one plane, so nothing shows between them.
2. **[SUPERSEDED by §13: the rim eases off over 1.875 mm.]** **The rim crease keeps its smoothing but over one lattice edge** (`rim-ridge`): on the
   hub, under the edge reach, the curvature fade's length is `e` (0.4 mm) instead of
   `max(H × 15/8, e)`. **A decision made without a ruling**, and the one thing here that
   moves a ruled law: the 45° fade is BONE's (and T5's), and under it the burst cannot reach
   full height anywhere beyond the feet at H 2.5 — so "closer to the edges" is not reachable
   without it. What it costs: the burst ends at the rim in a steep 0.4 mm drop — at H 2.5 a
   raised medallion with a crisp toothed edge (the sheet's 45° cells).

**Tried first and withdrawn:** ribbing the FEET's own top skin (weight 1 on every petal
row, foot rows flagged, flank lines cut into the unlatticed feet). It reached the edge too,
but **folded at H 2.5 — 161 within-shell pairs (A) / 97 (B), worst 0.69 mm** — at the
foot-to-blade crease (r 8.5–8.9 mm, ribs on both sides of the 25° crease along converging
normals) and at the feet's buried inner wall (r 5.3–5.7, z −0.6). Ribbing the hub top over
the feet needs neither and reads the same from above.

### 12.3 Measured

| law | reach | H | tris | within-shell pairs | open / doubled / degen | shells | flipped |
|---|---|---|---|---|---|---|---|
| A | hub (2nd round) | 1.0 | 189,642 | 0 | 0 / 0 / 0 | 9 | 0 |
| A | **edge** | 1.0 | 190,110 | 0 | 0 / 0 / 0 | 9 | 0 |
| A | **edge** | 2.5 | 190,110 | 0 | 0 / 0 / 0 | 9 | 0 |
| B | hub (2nd round) | 1.0 | 189,706 | 0 | 0 / 0 / 0 | 9 | 0 |
| B | **edge** | 1.0 | 190,154 | 0 | 0 / 0 / 0 | 9 | 0 |
| B | **edge** | 2.5 | 190,154 | 0 | 0 / 0 / 0 | 9 | 0 |

Hub-top vertices beyond the feet's inner edge at full weight: **0 → 783 of 981 at H 1, 0 →
733 at H 2.5**; the rest are the rim crease's last 0.4–0.8 mm. +468 / +448 triangles (the
crest lines now cross the covered hub top).

**With stamens or a style** the rods root THROUGH the hub top and occlude it, and the shipped
fade runs around each root (134 of 515 hub-top vertices short of full weight on the gate's
24-stamen row). That is the visibility rule working around an excluded rod, and is left.

### 12.4 The gate, third round

**R8 is new: the starburst reaches the edge** — on the plain starburst rows (A at H 1, B at
H 2.5), every hub-top vertex between the feet's inner edge + e and the rim − 3e (both radii
read off the LATTICE build's petals and hub) carries full weight: 515 of 515 on both. Ten
rows, **PASS on all**. Two new mutants, each with a witness on the mutated module:
`the-starburst-stops-at-the-feet` (the covered hub top back at 0) and
`the-rim-fades-over-the-45-degree-length` (the rim edit reverted). **12 of 12 mutants
behave**: the first fires R8 with 515 of 515 vertices at 0, the second with 515 of 515 short
(least 0.099).

### 12.5 Open

Whether starburst becomes the shipped default centre is the shipping prompt's (the prototype
still takes `ribCentre` explicitly; unset is the first round's axis rule, so §2–§7 reproduce).
Whether the rim's 0.4 mm drop is right, or a softer one (say the fade at H 1's 1.88 mm at any
height), is Eva's from the sheet. §8's other questions stay open.

## 13. Fourth round: the rim eases off

**RULED (Eva, Nov 9): "ease off"** — §12's 0.4 mm drop at the hub's rim is withdrawn. On the
hub, under the edge reach, the curvature mask's fade from the rim crease is now **the ruled
fade at H 1.0, `max(1 × 15/8, e)` = 1.875 mm, at every height**, never wider than the ruled
`max(H × 15/8, e)` (so at H ≤ 1 it IS the ruled 45° fade; at H 2.5 it is a 53° ease where the
ruled 4.69 mm would be wider than the 3.5 mm band between the feet and the rim). One edit
(`rim-ridge`) changed: `T.edgeMm` → `Math.min(Lam, textureFadeWidthMm(1, T.edgeMm))`.

| law | H | tris | within-shell pairs | open / doubled / degen | flipped | full height beyond the feet |
|---|---|---|---|---|---|---|
| A | 1.0 | 190,110 | 0 | 0 / 0 / 0 | 0 | 376 of 981 |
| A | 2.5 | 190,110 | 0 | 0 / 0 / 0 | 0 | — |
| B | 1.0 | 190,154 | 0 | 0 / 0 / 0 | 0 | — |
| B | 2.5 | 190,154 | 0 | 0 / 0 / 0 | 0 | 326 of 981 |

The rest of the band is the ease (and, at H 2.5, 50 vertices at the feet's edge). The
sheet `docs/img/bloom-texture-ribs-starburst.png` is re-rendered: the medallion's toothed
edge at H 2.5 is gone, the ribs round off into the rim.

**R8 restated** — full weight from the feet's edge + e to the rim − ease − 2e (188 of 188 on
both starburst rows), and, where the ease is wider than three lattice edges, some vertex
inside it short of full weight (121 of 121 easing). A thirteenth mutant,
`the-rim-drops-in-one-lattice-edge` (§12's drop restored), must fire it; the 45-degree mutant
is re-anchored. **13 of 13 mutants behave**: the new one fires R8 with "no hub-top vertex inside the rim's 1.875 mm ease is short of full weight (121 looked at)".

## 9. Not done

No shipped file, no registry row, no control, no matrix row, no CI. Sepals and leaves
take the field through the shipped pass and were not measured separately (the default
bloom has neither). The cutter re-meshes every organ on every build; on the mophead it
is 14–17 s in Node (§4) — an allocator like BONE v2's is not built. The emergence
length, the floor spacing and A's reference radius are proposals (questions 4, 7).

## Reproduce

```bash
npm i --no-save three@0.161.0 playwright-core
node tools/verify-bloom-ribs.mjs                    # R0-R8 on the clean module
node tools/verify-bloom-ribs.mjs --negative-control # thirteen mutants
node tools/verify-bloom-ribs.mjs --browser          # + Node vs Chromium
node --max-old-space-size=12000 tools/bloom-texture-ribs-measure.mjs --resume
node --max-old-space-size=12000 tools/bloom-texture-ribs-browser.mjs --resume
node tools/shot-bloom-texture-ribs.mjs docs/img/bloom-texture-ribs.png
node --max-old-space-size=12000 tools/bloom-texture-ribs-measure.mjs --section centre --resume
node --max-old-space-size=12000 tools/shot-bloom-texture-ribs-centre.mjs docs/img/bloom-texture-ribs-centre.png
node --max-old-space-size=12000 tools/shot-bloom-texture-ribs-starburst.mjs docs/img/bloom-texture-ribs-starburst.png
```
