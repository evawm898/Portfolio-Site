# Bloom P1b — a short, tight node swelling, and the dark lozenges

Eva's ruling of Oct 29, built: the node swelling is retuned from the flower's
long spindle to a short, tight joint, so a crowd of nodes has room. Before that,
Job 0: what the dark diamonds on P1's sheet are.

Sheet: `docs/img/node-swelling-tight.png`
(`node tools/shot-bloom-node-swelling-tight.mjs <png> --base <worktree of 9921fc6>`).

## 1. Job 0 — the dark lozenges are LEAVES, seen end-on. The print is fine.

On P1's sheet every swollen carnation stem shows a dark diamond inside it. **It
is not geometry and not a breach.** It is the carnation's own leaves.

* The carnation is OPPOSITE and decussate, so the leaves at nodes 2 and 4 stand
  at 90° and 270° — pointing straight at, and straight away from, the sheet's
  side camera (it looks along +y).
* The leaf pointing at the camera rises toward it at 35°. In projection it sits
  over the stem, and the camera sees its **underside**.
* `bloom-soft-render.mjs` lights from two directions, both ABOVE the bloom. A
  downward-facing leaf underside (normal (0, −0.58, −0.82)) gets ambient light
  only. In the stem's own colour, it reads as a dark hole.

How that was established, rather than argued:

* **Rays.** Rays cast along the camera axis through a lozenge hit a surface at
  y ≈ −16 to −30 mm, in front of the stem's outer wall (y ≈ −4.9). Its triangles
  are emitted after the stem (the leaf range), with normal (0, −0.58, −0.82).
* **Controls.** Same build, `leafLength` 0: no lozenge anywhere (1,784 dark
  pixels in the central column, none of them a diamond). Same build, swelling 0:
  the lozenges are still there (6,076). So they do not depend on the swelling at
  all; the rose (alternate 137.5°) and the mum (alternate 180°, leaves left and
  right) never point a leaf at the camera.
* **The wall.** Measured through the swelling on the emitted law, both modes:

  | stem | min horizontal wall | measured square to the axis |
  |---|---|---|
  | carnation 6 mm, swelling 1 | 1.5077 mm | 1.5077 mm |
  | carnation 4 mm, swelling 1 | 1.5000 | 1.5000 |
  | carnation 3 mm (solid) | solid | solid |
  | rose 6 mm, sw 0.25, kink 0.8 | 1.5019 | 1.5019 |

  The bore is set at the control radius (Eva's `max(0, r − 1.5)`), so a swelling
  only ever thickens the wall: 3.3 mm at the peak on a 6 mm stem. Nothing is
  under Eva's 1.5 mm, and the print floor is 1.0 mm. (Numbers on the base tree;
  the head's are in §4.)

**The fix is the render tool's.** The new sheet draws the leaves in their own
tone and moves the second light to the camera's side and below
(`PART_LIGHTING`), so a leaf pointing at the viewer shows a lit underside. Row 1
of the sheet is the diagnosis: P1's rendering, the fixed rendering of the same
build, and the same stem with no leaves. `tools/shot-bloom-node-span.mjs` (P1's
sheet tool) carries the same fix. P1's committed image stays as the record of
that session. The other node sheets (`shot-bloom-stem-nodes.mjs`,
`shot-bloom-node-split.mjs`) light the same way and would show the same thing
on a decussate row; they are not changed here.

## 2. The law — a joint of 1.25 stem diameters, from the botany

**The sources.** Two *Dianthus caryophyllus* plant patents, read off their own
pages:

| cultivar | patent | stem / branch diameter | node length | node diameter | internode |
|---|---|---|---|---|---|
| 'KLEDP16231' | US PP29,628 | 0.3–0.5 cm | 0.4–0.6 cm | 0.3–0.5 cm | 3.0–4.0 cm |
| 'KLEDP18090' | US PP30,795 | 2.0–4.0 mm | 0.3 cm | 0.3 cm | — |

So a carnation's node band is **1.0 to 1.25 stem diameters long** (the mid of the
first patent is 0.5 / 0.4 = 1.25; the second is 1.0 at its mid). The internodes
are 8–10 diameters.

The floras agree on the shape. Kew's POWO *Dianthus* entry (after the *Flora of
Tropical East Africa*) gives leaves "joined at the base into a sheath above the
nodes, which are often swollen"; Botany Brisbane's *D. caryophyllus* page gives
"swollen nodes" and a leaf base that sheathes the stem. Flora of North America
gives the sheath of *D. plumarius* as 1–2 stem diameters, of *D. carthusianorum*
3–8. (The FNA, eFloras, SEINet and Google Patents pages could not be fetched from
this session: those hosts are outside its network policy. The patents were read
from their scanned pages on patentimages.storage.googleapis.com.)

**What it was.** The swelling rode the flower's spindle: a Gaussian of
half-width w = 3.2738 stem radii. Its visible band (±2σ, below) is
2√2 w = 9.26 radii = **4.6 stem diameters**, 27.8 mm on a 6 mm stem, and the
merge gap √2 w was 13.89 mm. That is the "chain of sausages".

**What it is now.**

* **The joint is the Gaussian's own ±2σ band** (where the bulge has fallen to
  1/e², 13.5% of its peak — the edge of a visible swelling), set to
  `STEM_NODE_JOINT_DIAMETERS` = **1.25 stem diameters**. That reading of a
  patent's "node length" is mine, not the patent's.
* With σ = w/√2 the band is 2√2 w, so **w = 1.25 R / √2 = 0.884 stem radii** —
  a length from a length, never a fraction of the stem.
* On a 6 mm stem: the joint is **7.50 mm** (half-width 2.65 mm), the merge gap
  √2 w is **3.75 mm**.
* **The profile stays symmetric.** The sources state no asymmetry for the stem's
  own node tissue. What is sharper above the node is the connate LEAF SHEATH,
  which is leaf tissue and the leaf-shape discovery's (D1). The tighter joint is
  the seat for that sheath; nothing of the sheath is built here.
* **The amplitude is unchanged** (0.6 × the radius at swelling 1). The patents'
  node diameters sit at about the stem's own (pot carnations, little bulge),
  which the slider already reaches below 1. A tighter joint does not need a
  different amplitude.

**One owner.** `stemNodeSwellWidthMm(outerR)` in `bloom-geometry.js` is read by
the node law (`swellMm`, `jointMm`, `mergeGapMm`), the radius
(`stemNodeRadiusMm`), the station placer, and the layout's spacing clamp
(`leafNodeLayout`'s merge gap). The harness restates the 1.25 as the ruling's own
number (`RESTATED_JOINT_DIAMETERS`) and refuses to load if the geometry's
constant moves.

## 3. The kink is unaffected — and where its bend now peaks

The kink keeps the flower's spindle (`STEM_NODE_SPREAD_RADII`, `spreadMm`,
`rampMm`). The station placer's integration step is the spindle's wherever the
swelling is 0, so a kink-only stem places exactly the stations it did.

Measured, base against head, both modes: **0 differing floats** on three
kink-only stems (the rose at 0.8 with compound leaves, 840,978 floats; whorled
kink 1; a bare kink 0.5). On the rose with both halves the axis law agrees to the
bit (max |d| exactly 0 over 1,001 depths), and the turn is 5.9374° on both.

**Finding (reported, not changed): the bend no longer peaks inside the
swelling.** The bend peaks 0.375 of the ramp below the node: 2.68 stem radii,
8.04 mm on a 6 mm stem. The tight joint's band ends 1.25 radii (3.75 mm) below
the node. So on a stem with BOTH halves, the bend now peaks just below the joint
rather than inside it — the phasing the stem-nodes session called "the part Eva
likes". The read-out says so plainly (`… peaking 8.04 mm below it (0.818 of the
flower's spindle — BELOW the 7.50 mm joint, whose band ends 3.75 mm below the
node)`). Moving the kink's ramp to the joint would move every kinked row,
including the rose, and the ruling said the kink is unaffected. It is Eva's
question (§9).

**Finding (reported, not changed): the wall measured square to a leaning axis
falls on kinked stems.** The kink's lean peaks at 1.6875 × its final slope
(q = 0.75 of the smoothstep ramp), which on a 1.0 kink is 12.4°. The old long
spindle thickened the stem across that steep stretch; the tight joint no longer
reaches it, so the plain wall there reads 1.5 × cos(lean):

| stem | perpendicular wall, before → after |
|---|---|
| prominence 1.00 (swelling 1, kink 1) | 1.5077 → **1.4652** mm |
| 0.48 / 0.48, three leaves | 1.5037 → 1.4918 |
| carnation (swelling 1, no kink) | 1.5077 → 1.5000 |

The horizontal wall is 1.5 mm everywhere, as ruled. The perpendicular figure is
the stem-nodes session's §7 "reported consequence, Eva's to rule"; it was 12.5
microns under at most and is now 35 microns under (2.3%). The fix offered there
(`bore = max(0, r − 1.5 / cos(tilt))`) is still one line and still not taken.

## 4. The spacing clamp, before and after

Measured in EXPORT on the sheet's own stems (both 100 × 6 mm):

| stem | asked | built, before (P1) | built, after |
|---|---|---|---|
| carnation (swelling 1, 5 nodes, opposite) | 0.8 | 0.158 (clamped) | **0.800** |
| | −0.8 | −0.158 (clamped) | **−0.800** |
| rose (swelling 0.25, kink 0.8, 4 nodes) | 0.8 | 0.005 (clamped) | **0.800** |
| | −0.8 | −0.005 (clamped) | **−0.800** |

The merge gap went 13.89 → 3.75 mm. The carnation's crowd builds internodes of
25.2 / 18.9 / 12.6 / 6.3 mm; the rose's 22.3 / 13.9 / 5.6.

**P1's narrow even run separates.** The carnation at 0.20..0.45 (five nodes,
5.5 mm internodes) read 4 merged pairs before and **0** after: each joint is
7.5 mm long, they overlap, and they still read as five bumps (the sheet's row 3).
MERGED stays told and never clamped, by ruling; it is still reachable (eight
nodes on 24 mm, 2.4 mm internodes, reports 7 merged pairs).

The clamp still binds where a crowd would put two joints under 3.75 mm apart:
seven nodes at spacing 1.00 on the 100 mm stem build **0.857**.

## 5. Two rows redefined, and the frozen phase

Two live rows existed to exercise a state the tight joint no longer reaches, and
their labels would have been false:

* `NODE RUN: the spacing's MERGE CLAMP` — 4 nodes at spacing 1 no longer clamps
  (smallest internode 5.25 mm against the 3.75 mm gap). Now **7 nodes** (asked
  1.00, built 0.857). The apex table's merge-clamp row and its witness state
  (`NR_MERGE`) moved with it, so `node-run-merge-clamp-dropped` still has a state
  where the clamp binds.
* `BARE NODES: eight nodes on 60 mm (SWELLINGS MERGED)` — 6.0 mm internodes no
  longer merge. Now **24 mm** (2.4 mm internodes, 7 merged pairs). The stem-nodes
  must-fail's merged baseline moved to the same state.

Every other live label that speaks of merging, clamping or swelling was checked
against the head's build and still tells the truth (the 12 mm thin-sheet row
still merges, 7 pairs).

`frozen/phase91` is the **1,636 rows at `ec0f34b`** (main's head; #474 and #476
touched no bloom file, so its matrix is `9921fc6`'s row for row), registered in
both maps. `--verify-frozen --phase91` reads PASS, deep-equal. The live matrix
stays 1,636 rows.

## 6. Gates

**ST12, re-derived (`tools/bloom-harness.mjs`):**

* **(c)** every emitted ring's radius against the restated law, now on the
  joint's own half-width (1e-9, unchanged bar).
* **(d)** each half is isolated by its own tail. The swelling is isolated by two
  of the joint's half-widths. The BEND is isolated by a ramp plus a spindle on
  each side (31.2 mm on a 6 mm stem). It was two spindles, but a kink's curvature
  runs a whole ramp below its node and reverses sign past 0.75 of it. On the
  golden-angle `BARE NODES: x a SPHERE` row, node 0's ramp tail sat inside node 1's
  window and projected positive onto node 1's direction. The export gate found it
  once the tight joint's denser stations sampled the tail; sparse stations had
  hidden it on `main`. The swelling arm searches the node's own isolation (two
  half-widths) for the widest ring, so a displaced bulge is found where it is. One
  half-width let the station-gap tolerance absorb a 2.5 mm displacement, which
  showed when its plant went silent.
* **(f)** adds the plan's declared merge gap and joint length against the
  restated ones (1e-9).
* **(g) new — the joint's length off the emitted rings.** On a node with two
  joint lengths of stem clear either side, the band where the emitted bulge
  stands at least 1/e² of its peak must bracket the ruled 1.25 diameters,
  between the emitted stations at each end. A band that does not close inside
  two joint lengths is reported, never skipped. It is OPEN only where the walk
  stops at the window's edge with the next ring still over the cut. The first
  version also called it open when the next station merely lay outside the
  window, which a 0.01 swelling's sparse stations always do; the export gate
  dropped `STEM NODES: 0.01` on it. Non-vacuous: a lone swollen node
  with room either side must have its joint read.

**`node tools/verify-bloom-stem-nodes.mjs`:** 24 plants, each firing its own arm
by its own message, baseline silent. New: **(g)** a swelling drawn on the
flower's spindle with the restated radius moved with it (so (c) is blind and only
(g) can see it) — fires "does not close within two joint lengths" on all three
nodes; **(f)** the plan's merge gap read off the spindle. The two (d) swelling
plants shift by 0.95 / 0.8 of the joint's half-width: the old 0.8 of the spindle
left a 0.003 mm tail in the joint's window and no longer tested "widest away
from its node".

**Mutants (`tools/verify-bloom-apex-mutants.mjs`), each witnessed on the mutated
module:**

* `the-joint-rides-the-flower-spindle` (names ST12) — the swelling's half-width
  is the spindle again;
* `the-merge-gap-reads-the-spindle` (ST12) — the merge report reads the spindle;
* `node-run-spacing-clamp-reads-the-spindle` (NS1) — the spacing clamp reads the
  spindle. It was first written claiming NS3 and the subset read it SILENT there:
  the clean tree clamps that row too (to 0.857), so the clamped flag agrees on
  both sides, and what moves is the depths, NS1's subject;
* `the-spindle-is-a-fraction-of-the-length` — **its claim corrected from
  ST12 + ST3 to ST12 + ST2**: the spindle is the kink's alone now, so it moves the
  bend and the tip (ST2), not the widest vertex (ST3).

RESULT: see §8.

## 7. Bytes

Predeclared from the CONTROLS (`verify-bloom-surface-bytes --movers-predicate
node-joint`): a row moves iff its stem carries a swelling (a stem present, no
inflorescence, swelling above 0). **29 movers / 1,607 holders** over the
1,636-row matrix, both modes. The kink-only rows are holders.

RESULT: see §8.

Cost, EXPORT, every mover (stem stations rise wherever there is a swelling; the
placer holds the same chord error across a tighter curve):

* the carnation (NODE SPLIT, swelling 1, 4 nodes): 61,322 → 69,098 tris (+12.7%),
  stations 56 → 96;
* the flower's 0.48 three-leaf stem: 44,470 → 47,542 (+6.9%), 47 → 63;
* the rose (COMPOUND, sw 0.25): 104,674 → 107,746 (+2.9%), 61 → 77;
* the largest increase: the 7-node merge-clamp row, 52,134 → 67,398 (+29.3%);
* the largest mover after: `TEXTURE T5: PEBBLE x a noded stem`, 285,202 →
  271,670 (−4.7%), 18.1% of the budget. No budget corner moves.

The shipping default has no stem, so it is untouched at 24,688.

## 8. Verification (measured)

All local runs were on this box (headless Chromium, Node 22). CI on the PR is
the merge criterion.

- **Byte partition**: `node tools/verify-bloom-surface-bytes.mjs --base <worktree
  of 9921fc6> --movers-predicate node-joint`, in 55 resumable chunks of 30 rows,
  merged with `--merge`.
  - **PASS: 29 of 29 predeclared movers moved; 0 floats moved on the 1,607 holders**,
    positionally under `Object.is`, both modes.
  - That covers 2,363,129,532 export floats over 262,569,948 triangles and 83,073,014
    captured-grid values over 9,572 panels.
  - The movers were predeclared from the BASE tree's record: a stem node law with a
    swelling above 0.
- **Export gate on the moved rows** (`verify-bloom-export.mjs --only` over the 29
  movers plus the two redefined rows): **PASS, 31 of 31** reached the results, all
  watertight.
  - The first run dropped 2 rows to ST12. Both were clause defects (arm (g), the bend
    arm), fixed in `c635860` (§6, finding 6b).
- **Connectedness on the moved rows**: 31 of 31 are one piece.
- **E2 on the smoke subset** (edge-profile gate): **PASS, E0–E7 clean**. 64 of 64
  declared surface-turn rows reproduce.
- **Combination gate**: 856 cells; 299 under the bar, all 299 declared; CG0–CG7
  clean.
- **Defaults bar**: DB0–DB2 clean over the 11 ruled-default states.
- **Panel gate with `--negative-control`**: **all thirty-five routes, and session
  23's four clauses, observed the failure** they exist to catch.
- **Stem-nodes must-fail** (`verify-bloom-stem-nodes.mjs`): all 24 plants fire their
  own clause and the baseline is silent. ST12 is silent on all 70 live row-modes that
  carry a node law.
- **Mutants**:
  - Every node and spacing-clamp mutant in the apex table was run (25), and all
    behave.
  - Two needed their claims corrected, never a loosening:
    `node-run-spacing-clamp-reads-the-spindle` fires NS1, not NS3, and
    `the-spindle-is-a-fraction-of-the-length` now names ST12 and ST2 (§6).
  - The five that touch ST12 were re-run after `c635860`, and all five behave.
  - The three new mutants are each witnessed on the mutated module:
    `the-joint-rides-the-flower-spindle`, `the-merge-gap-reads-the-spindle` and
    `node-run-spacing-clamp-reads-the-spindle`.
  - The other 244 mutants in the table cover code this session did not change and
    were not run locally. The table runs in CI (`bloom-apex-mutants`).
- **Frozen matrices**: `frozen/phase91` (the 1,636 rows at `ec0f34b`) is registered
  in both maps; `--verify-frozen` passes.

## 9. Findings flagged mid-session

1. **The dark lozenges are end-on leaves under top-only lighting** (§1). The print
   is fine; the sheets are fixed.
2. **The bend now peaks below the joint, not inside it**, on stems with both
   halves (§3). Eva's question.
3. **The perpendicular wall on kinked stems falls to 1.4652 mm** at kink 1 (§3),
   the stem-nodes session's reported consequence, now larger.
4. **Two live rows' states no longer reached what they were named for** (§5) and
   were redefined; `frozen/phase91` registered.
5. **`the-spindle-is-a-fraction-of-the-length` claimed ST3**, which the spindle no
   longer reaches; corrected (§6). My own new clamp mutant claimed NS3 and fires NS1;
   corrected (§6).
6. **ST12(d)'s swelling arm searched one half-width**, which let the station-gap
   tolerance absorb a displaced bulge; it searches the node's isolation now (§6).
6b. **ST12(d)'s BEND arm isolated by two spindles while a kink's tail is a ramp** —
   latent on `main`, exposed by the denser stations, fixed by the arm's own stated
   rule (§6). **And arm (g)'s first version read a sparse band as open** (§6).
7. **`tools/leaf-lab-core.mjs` (the leaf lab, a prototype) keeps the old
   3.2738-radius swelling** in its own constants. It is not shipped and nothing
   reads it; recorded, not changed.
8. **Three flora hosts and the USPTO image host are outside this session's
   network policy**; the patents were read from Google's patent-image mirror.
