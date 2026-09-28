# The infilled petal's outer margin takes the bead

The margin-bead session. Before it, **91 of 95 margin sections of an infilled
default petal were a flat 1.200 mm wall meeting both skins at 90.00°**
(`docs/bloom-infill-roundness-and-bevel.md` §A1). After it, the infilled
margin closes the way the plain petal's does — `emitRimLoop`, #278's bead —
and every free boundary in the bloom (the plain margin, the hole rims, the
infilled margin) goes through that one function.

All geometry is EXPORT (what print preview shows) unless it says LIVE. The
shipping default (`petalInfill: NONE`) is not touched: its margin is #278's
and it builds 24,688 triangles on both trees.

## 1. The site, named before it was changed

`emitInfillPanel` (`bloom-geometry.js`) emitted every cell-region OUTLINE
edge through `emitRimFlat` → `emitRimLoop` with `rimProfile`'s `w = 0` STEP
profile. So the margin was **already one owner** — the wall went through
`emitRimLoop` — and what it lacked was a profile: the cells' skin ran all the
way to the outline, so there was no room for a bead to live in. S5 (§5 of
`docs/bloom-infill-s5-hole-rims.md`) declared exactly this as a standing
regression: *"the cells' refined skin has vertices within a bead's width of
the margin that nothing moves."*

So the change is two halves:

1. **Move the skin.** `insetPlan(q)` is one plan map read by every skin point
   the cells emit: a point within the margin's BAND is squeezed toward the
   inside so the skin stops `a` short of the outline, where `a` is the bead's
   inset. On the SIDES the squeeze is proportional across the band (so a
   triangle's orientation cannot flip); at the TIP it is an x-squeeze bounded
   by `aTip = min(aT, 0.5 * bandT)`. Chord and arc conversions (`planFor`,
   `arcFor`) put the inset in SURFACE millimetres on a curved plan.
2. **Close on the bead.** The outline's strips are drawn by `emitRimEdge`
   through `rimProfile` with a nonzero inset, whose apex is the outline point
   itself — **the silhouette does not move** (MB2: every captured margin mid
   is an emitted apex, as the same double, and 0 old skin points `mid ± n t/2`
   survive).

Moving the skin is not a vertex nudge. Moving the junction vertices first
rotated the cells' walls and cost 7 of 20 holes their rings; a wall slide
still left 6 self-crossings. What ships CLIPS each cell's outline chain: the
chain between its two wall crossings is replaced by the INSET boundary
(`skinOf`), the crossing is canonical by the wall's sorted endpoints so two
cells sharing a wall agree (`wallCross`), and the result is validated —
simple, same orientation, still holds its grown ring. **One decision per
petal** (`marginOn = refusedCells === 0`): if any cell fails, the whole petal
keeps the flat wall and the record says so. **0 cells refused on every state
measured.**

## 2. The radius, from the laws that already exist

`rEdge = min(RIM_BEAD_RADIUS_MM, max(t, MIN_FEATURE_MM) / 2, RIM_ROOM_FRACTION * wall)`
— #278's own three arms with the infill's own wall as the room. The wall is
1.00 mm, so the room arm binds: **r = 0.45 mm**, the hole rim's own radius.
`rHole = rEdge` — one expression, not two (a second copy made the hole-rim
gate's room-arm mutant match twice and mutate only one of them, which the
anchor check caught).

At the tip the WIDTH arm binds (0.45 × 2h), falling to the floor
`RIM_BEAD_RADIUS_MM / 512`.

### Every clamp location (the brief asked for all of them)

The narrow-span clamp is recorded per point and compressed into runs
(`margin.clampRuns` on the petal record, printed by the gate):

| state | wall arm (r = 0.450) | width arm |
|---|---|---|
| ruled defaults | u 0.089–0.983 × 100 points | u 0.999–1.000 × 22, r ≥ 0.045 |
| petalWidth 8 | u 0.089–0.972 × 104 | u 0.997–1.000 × 22, r ≥ 0.045 |
| petalWidth 30 | u 0.071–0.986 × 104 | u 0.999–1.000 × 22, r ≥ 0.045 |
| petalTipShape 3.00 | u 0.071–0.994 × 206 | u 1.000 × 22, r ≥ 0.045 |
| petalTipShape 0.60 | u 0.089–0.920 × 102 | u 0.945–1.000 × 26, r ≥ 0.045 |
| every other gate state | u 0.089–0.983 × 100 | u 0.999–1.000 × 22 |

So the wall arm binds on **every** treated margin point — the bead is the
room arm's everywhere the margin is not already narrower than a bead.

## 3. Bead only, no thickness taper — by measurement, against the goal's wording

The goal said "taper to the rim floor and a bead". Built with #278's taper,
the tip rim thinned to **0.09 mm** and H1 read **151°** on sheet 2.40 and
**92.8°** on petalWidth 30: #278's taper runs over `RIM_TAPER_MM` of surface
distance from the outline, and on an infilled petal that distance is the
1.00 mm wall between the margin and the first hole — the taper and the hole's
own bead fought over the same material. Under #278's own distance law a taper
shorter than the inset is inert anyway (S5 found the same for the holes).
**So the margin is bead-only, the same decision S5 made for the hole rims.**
This is recorded as a departure from the brief's wording, not a silent one.

The BURIED END is kept: the bead ramps up from the step profile over
`RIM_TAPER_MM` of margin arc from the seam (`gAt`, #278's `rimEase`), because
the seam row belongs to the basal panel and its wall is where the two meet.
That ramp is the one stretch MB1 excludes (19–27 segments a petal, all within
`RIM_TAPER_MM` of the seam — asserted, so the exclusion cannot grow).

## 4. What the margin reads now

`node tools/verify-bloom-infill-margin.mjs` — MB0 (the record and the radius
law restated), MB1 (no hard edge), MB2 (silhouette unmoved, skin really
stopped). 14 states × 2 modes, PASS; `--negative-control` 4 of 4.

| state (EXPORT) | worst body turn / its bar | tip worst |
|---|---|---|
| ruled defaults | 44.96° (the bead's own K=4 resolution) | 55.82° |
| petalWidth 8 | 44.96 / 45.50 | 57.28 |
| petalWidth 30 | 47.50 / 47.73 | 71.23 |
| tipThinning 0.80 | 45.01 / 46.10 (LIVE 50.91 / 54.96) | 48.36 (LIVE 60.95) |
| petalTipShape 3.00 | 44.96 / 45.09 | 68.22 |
| petalTipShape 0.60 | 67.05 / 45.64 bar + outline turn | 58.39 |
| sheet 2.40 (LIVE) | 71.75 / 71.24 + 0.14 xfail | 80.77 |

Before: every one of those was **90.00°** along 96% of the margin.

**Four states keep a turn past their bar, and they are the petal's own folds,
not the bead** — declared in `MB1_XFAIL` by value, both directions:
`cup 1.2 × curl 360` (+89.18°), `roll 330` (+43.38°), `ALL FORM MAX`
(+113.14°), `buckle 0.60 f 3` (+31.26°), plus `sheetThickness 2.40` (+0.14°,
where #278's blend is 38% bead at that sheet — its profile is a wall with a
nose by #278's law). On the first three the plain petal's own sheet folds
through itself (`SELF_INTERSECTION_XFAIL` declares them), so the margin's
neighbour triangles are the fold's.

Slivers (inradius under 0.01 of the longest edge) carry no meaningful normal
and are skipped and COUNTED in both dihedral gates (MB1, H1): 314–5,580 a
petal. The tip compression that made density 40 read 103.9° on a sliver is
what `aTip ≤ 0.5 · bandT` bounds.

## 5. Cost — projected before building, then built

Projection on the base tree (margin segments × 6 strips): worst row
`INFILL: x 40 petals x 3 whorls` **1,257,632 = 83.8%** of the 1,500,000
budget. Built: **1,226,912 = 81.8%** (1,228,274 before the X0 fix, §11). **No shipped row crosses 1.5M**, so
nothing had to be refused; `verify-bloom-infill-budget.mjs` (B0–B2) passes,
live = export, its must-fail fires.

| | before | after |
|---|---|---|
| infilled bloom at the ruled defaults | 113,424 | **118,480** (+4.5%) |
| shipping default (infill off) | 24,688 | 24,688 |
| `INFILL: x 40 petals x 3 whorls` | 1,162,112 (77.5%) | 1,226,912 (81.8%) |

**Slowest shard, projected, not measured:** only the 29 infilled rows of 953
change, by 4–6% of their triangles, so the export gate's slowest shard should
land within a minute of `main`'s 47.6 min. Read the real figure off the PR's
own run.

## 6. What it moved

### Byte partition — predeclared from the BASE tree's own record

A row moves iff the base tree's own build carries an infill record with cells
(`p.infill.cells > 0` on any petal, either mode). Computed over the whole
matrix on a worktree of `2457d12`: **29 movers, exactly the label set
`^INFILL: (?!REFUSED|GATED)`** — the two REFUSED rows build no cells and the
two GATED rows have the guard off. (`INFILL: x petalTipShape 0.60`, the row
this session adds, is counted with the movers — it is built on both trees
from this matrix's control set.)

`node tools/verify-bloom-surface-bytes.mjs --base <worktree of 2457d12>
--movers '^INFILL: (?!REFUSED|GATED)'`, run in foreground chunks because the
full matrix does not fit one 10-minute call: **every predeclared mover moved,
and 0 floats moved on every holder, positionally under `Object.is`, both
modes, captured grid included** — the 4 INFILL holders and every non-INFILL
row, `ALL MAX` alone in its own chunk. (Chunks with no mover report the
tool's own VACUOUS finding for `--movers`; that is the chunking, not a
result, and every one of them reports its holders compared and none moved.)

### Census (#213: re-recorded, never widened)

`X2` would fire on 0 rows: the new row reads 0 pairs, and no undeclared
INFILL row gains a pair. **16 declared `INFILL:` entries moved and are
re-recorded** with the previous figure in each note — 12 better (the buckle
3,118 / 0.6018 → 220 / 0.2123, ALL FORM MAX 17,984 / 1.6701 → 16,632 /
1.6108), and roll 330 fewer pairs at a deeper span (39,048 / 0.9912 →
32,992 / 1.1298), petalWidth 30 1,056 / 0.0000 → 1,024 / 0.1467, solid base
13 → 15, sheet 0.60 6 → 7. `bloom-xfail-magnitudes --only '^INFILL'`: 19 of
19 declared rows at their recorded magnitude. **The browser confirmation is
CI's** (X1 is exact on pairs).

### The I family

I0–I11 pass with all twelve witnessed mutants. **The I1 xfail on `ALL FORM
MAX` reads 1.4799 mm, unmoved** — the bar is the plan's hole aperture, which
the margin does not touch.

### Hole-rim gate

`H1_XFAIL` re-recorded: `cup 1.2 × curl 360` 165.71 → **179.56**, `roll 330`
128.89 → **129.14** (both the petal's own fold, by value). Two mutants
re-anchored onto the moved code. H1 gained the same sliver rule. PASS; 4 of 4.

### One owner

`verify-bloom-rim-owner.mjs` gains `the-infilled-margin-gets-a-second-emitter`
(O3). PASS; 4 of 4.

## 7. The 1,872 triangles more than 60° off their face in print preview

Reproduced exactly on the shipping default (20.06 mm², worst 89.6°). **All of
them are rim strips at the petal ENDS** — 720 in the tip's corner pivot fans,
1,024 in the tip strips at r ≈ 40 mm, 128 in the foot-to-blade ramp.
`rimProfile`'s closed-form bead normal is the profile's own 2D normal carried
into 3D, and it omits the along-sweep term: where the outline turns fast (the
tip) or the profile changes fast along the edge (the ramp), the true surface
normal tilts along the sweep and the declared one does not. **A separate
defect, pre-existing, on the plain petal, not this session's — recorded, not
fixed.** `bloom.js`'s comment that print preview "stays flat" was wrong and
now says what is measured.

## 8. Frozen phase

`frozen/phase43` is the **952 rows at `2457d12`** (the matrix before this
session's added row), registered in BOTH maps, `--verify-frozen phase43`
deep-equal. **It is declared in `TAG_PUSH_XFAIL` in advance**: this PR edits
`.github/workflows/bloom-export-watertight.yml` after `2457d12`, the case that
has kept phase5/22/23 off the remote.

## 9. The pictures

`node tools/shot-bloom-infill-margin.mjs <dir> --base <worktree>` →
**`docs/img/infill-margin-bead.png`**: the TRUE SECTION of the margin at u 0.55
before and after at 150 px/mm (row 2 of `infill-rim-bevel.png`'s scale — the
box becomes a profile) beside the plain petal's; the same margin shaded at
K=4 SMOOTH (the builder's own `captureNormals`, which print preview hands
three.js); and the whole infilled bloom at its ruled defaults, print preview
geometry, 113,424 → 118,576 triangles at render time (118,480 after the X0 fix in §11). Rendered by `bloom-soft-render.mjs`,
deterministic, so no pixel delta is quoted.

## 10. Not done, named

- K stays 4 (ruled). Roundness is not in this session (ruled).
- The margin's clip is plan-space; a curved plan is converted to surface
  millimetres by `planFor` / `arcFor`, and the band edge is an approximation
  there (it moves no topology).
- The 1,872-triangle normal defect (§7).
- No committed mutant in the apex table names an MB clause; the family's own
  four must-fails carry it, as S3's I family did.

## 11. X0 went red in CI, and the cause was a ninth discrete decision on a continuous quantity

The first CI run dropped `INFILL: x 40 petals x 3 whorls` on **X0**: the STL
Chromium wrote held **1,228,256** triangles, the Node rebuild of the page's own
state **1,228,274**, and this container's Chromium a third answer, **1,228,268**.
Invisible to every Node instrument by construction (the page and the rebuild share
one call chain there).

**Where:** a per-petal probe (Node against Chromium, same state) put it on three
petals of 120, only in the margin's `skipped` count (60 / 66 / 72), and every
divergent strip at **g = 0** — the ramp's fade into the seam, where the design puts
the skin ON the apex and `rimProfile` should take its structural step branch. It
takes that branch on `wx === wy === wz === 0`, and the skin point (`pt(q)`) and the
apex (the lattice's registered point, or `mapPlan` of the interpolated outline
point) reach the same place by different arithmetic. Of **1,440** profiles at g = 0
on that row, **1,200** agree in the plan to the bit and **240** do not — the apex is
interpolated along its outline segment, the skin point is the wall crossing's — so
the 3D residue is **~6e-15 mm** and whether it rounds to zero was the engine's call.
Plan equality alone did not fix it (measured: no change).

**The fix:** `edgeProf` hands `rimProfile` the apex as the skin point wherever
`gAt(ap.x) === 0` (a comparison of plan quantities, `!(x > plan.xB)`) or the plan
points are equal. The ramp is the owner of "the treatment has not started".

**Measured:** Node and Chromium now agree on triangle count AND a sampled
coordinate hash on **all 33** infill-bearing rows; the browser gate reads the
failing row PASS, X0-identical, at **1,226,912** (81.8% of budget). The infilled
default goes 118,576 → **118,480**. Eleven INFILL census entries re-recorded
(#213), every new pair a span-0 seam tangency of the class those entries already
declare (`petalWidth 8`: all 384 in the root blend, same worst site); **all 14
undeclared INFILL rows still read 0**. MB, H, I, O, B, the grid gate, the wall
instrument and the combination gate all pass again; holders cannot move (the change
is inside `emitInfillPanel`'s margin profile, reached only with the infill on).

The same CI run also caught the hole-rim negative control claiming H0/H2 under
`--quick`, where only H1/H3 fire; that mutant's claim is now stated per state set.
