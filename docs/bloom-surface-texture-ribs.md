# RIBS — radial spoke ribbing, the third texture choice. Prototype and look sheet

Nov 9. A prototype and a sheet for Eva's spacing ruling. **No shipped bloom file
changes**: `bloom-geometry.js`, `bloom-registry.js`, `bloom.js`, `bloom.html` are
untouched. The sheet is `docs/img/bloom-texture-ribs.png`; every number below is in
`docs/data/bloom-texture-ribs.json`. Read §1 for what was built, §2 for the meshing
answer, §7 for the questions.

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
| (ii) crest | every crest half-plane cut into each organ's lattice as constraint edges | A 189,836 · B 190,130 (+19.5 %) |
| (ii+) crest + flank | crest, half-flank and valley lines (4 a pitch) | A 282,608 · B 297,464 (+78–87 %) |
| (iii) split | (i) live, (ii) on export | — (a policy over (i) and (ii)) |

**Crest quality, the petal (law B; A reads the same within a few degrees):**

| H | option | crest built (asked) | zigzag median / max | height lost | tris/mm² |
|---|---|---|---|---|---|
| 0.4 | lattice | 141.2° (122.6°) | 0.083 / 0.169 mm | 0.052 mm (13 %) | 20.6 |
| 0.4 | crest | 123.7° (122.6°) | 0 / 0 | 0 | 24.7 |
| 0.4 | crest + flank | 123.7° (122.6°) | 0 / 0 | 0 | 38.9 |
| 2.5 | lattice | **82.0° (29.1°)** | 0.138 / 0.165 mm | **0.558 mm (22 %)** | 20.6 |
| 2.5 | crest | 30.5° (29.1°) | 0 / 0 | 0 | 24.7 |
| 2.5 | crest + flank | 30.5° (29.1°) | 0 / 0 | 0 | 38.9 |

**The hub top (B, H 2.5):** lattice 49.3° (asked 21.5°), zigzag 0.045 mm, 0.78 mm of
crest lost; crest lines 21.5° (21.5°), 0, 0. **The stem (B):** the shipped stem lattice's
48 sector columns already stand on B's 8 flutes, so all three options build the same
crest — 137.3° (asked 140.0°) at H 0.4 and **67.5° (asked 47.4°) at H 2.5**. That gap
is not meshing: on a 3 mm cylinder the relief radiates along the normals, so a flank
point at azimuth φ lands at lateral (3 + h) sin φ rather than 3 sin φ and the rib fans
open; the restated "asked" figure is taken on the tangent line and does not carry the
surface's curvature. A's stem has no samples: it is smooth (§1).

**Findings.** (i) is not a sharp crest: on the lattice the arris falls between lattice
vertices, so the drawn ridge zigzags laterally by up to 0.17 mm and loses up to 22 % of
its height — at H 2.5 the crest reads 82° where 29° is asked. (ii) puts every crest on a
mesh edge and reproduces the asked angle to ~1–2° with no zigzag, for **+19.5 %
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
| B | lattice | 0.4 | 158,912 | 0 | 9 | 0 / 0 / 0 | 0 | — |
| B | lattice | 2.5 | 158,912 | 0 | 9 | 0 / 0 / 0 | 0 | — |
| B | crest | 0.4 | 190,130 | 0 | 9 | 0 / 0 / 0 | 0 | 0 |
| B | crest | 2.5 | 190,130 | 0 | 9 | 0 / 0 / 0 | 0 | 0 |

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

BUDGET_TABLE

## 5. Release and full times in Chromium; engine agreement

BROWSER_TABLE

## 6. What the shipped curvature and visibility rules do under ribs (reported, not special-cased)

RODS_TEXT

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
**PASS on all four**; R5's browser half AGREES on both rows it builds.

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
   (recommended: +19.5 % on the default, 0.9–1.4 s; the lattice blunts a sharp crest to
   82° at H 2.5); (b) the BONE split — lattice live, crest lines on export; (c) crest +
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

## 9. Not done

No shipped file, no registry row, no control, no matrix row, no CI. Sepals and leaves
take the field through the shipped pass and were not measured separately (the default
bloom has neither). The cutter re-meshes every organ on every build; on the mophead it
is 14–17 s in Node (§4) — an allocator like BONE v2's is not built. The emergence
length, the floor spacing and A's reference radius are proposals (questions 4, 7).

## Reproduce

```bash
npm i --no-save three@0.161.0 playwright-core
node tools/verify-bloom-ribs.mjs                    # R0-R6 on the clean module
node tools/verify-bloom-ribs.mjs --negative-control # seven mutants
node tools/verify-bloom-ribs.mjs --browser          # + Node vs Chromium
node --max-old-space-size=12000 tools/bloom-texture-ribs-measure.mjs --resume
node --max-old-space-size=12000 tools/bloom-texture-ribs-browser.mjs --resume
node tools/shot-bloom-texture-ribs.mjs docs/img/bloom-texture-ribs.png
```
