# The mophead — a compound umbel, depth 2

*Oct 24. Eva's rulings on `docs/bloom-hydrangea-discovery.md` (§7), built. Read that discovery first
(option B, §2c's reduced lattice, the connectedness finding and §7's questions), then this. The
sheet is `docs/img/mophead.png` (`node tools/shot-bloom-mophead.mjs <dir> --png docs/img/mophead.png`).*

## 0. What shipped, in one paragraph

An umbel can now be **depth 2**: `umbelDepth` (a choice, `1` / `2`, default `1`) beside the umbel's
own controls. At depth 2 the umbel's boss at the stem's top sends out **rays** (`umbelRays` 2–12,
default 12; `umbelRayLength` 5–120 mm, default 40; `umbelRayAngle` −60..90°, default 50), and each
ray ends in a **headless sub-umbel** — the shipped umbel, one level down, with its own boss — whose
florets are flowers. Every join is a shipped boss. The florets of a depth-2 umbel, and only they,
are built on the **reduced lattice** (6 columns, a 2-segment rim bead; rows stay at NU 56) and may
go down to a **derived floret floor** (13.13 × 6.00 mm on the shipping 35 × 16 petal). When the asked
florets would pass the 1,500,000-triangle export budget, **the florets a ray are clamped before
building, from one floret build's exact cost, and told**; the export never refuses for this. One
floret build serves every floret, one sub-umbel build is appended per ray. Every row that builds no
depth-2 umbel holds **by branch**.

## 1. Rulings and where each landed

| ruling | where |
|---|---|
| 1. STRUCTURE (B): a compound umbel, depth 2; lift the floret pin for exactly ONE level; depth 3 refused by name | `umbelDepth` is a **level control on the existing umbel**, not a fourth inflorescence type — see §2. `subUmbelState` is the one place the pin is lifted; `umbelDepthRefusal` refuses depth 3 (a head asking `3`, or a sub-umbel asking `2`) by name; UM5 holds both statements. |
| 1. reuse controls where the meaning carries | at depth 2 `umbelFlorets`, `pedicelLength`, `pedicelAngle`, `floretPetals`, `floretScale` keep their meaning, ON EACH SUB-UMBEL. New controls only for the new level: the rays. |
| 1. one floret build serves every floret; one sub-umbel build appended per ray | `floretUnitMemo` keyed per DISTINCT state: one sub-umbel unit for every ray (no per-ray term at that level), and inside it one floret unit for every floret. Build time does not scale with the floret count. |
| 2. a DOME, not a full ball | what (B) makes — rays at one elevation, sub-umbels at one elevation each. No ball is built. |
| 3. smaller florets, the reduced floret, by branch | §3 and §4. |
| 4. clamp and tell | §5. |

## 2. Why a level control and not a fourth type

The umbel's controls already mean "florets on pedicels from one boss". At depth 2 that sentence is
still true of every sub-umbel; what is new is only the level above it. A fourth type (`MOPHEAD`)
would have needed its own copies of the count, the pedicel and the angle — two controls over one
quantity — or would have had to repurpose the umbel's under a new name. As a level, the depth is
hidden and inert under a RACEME and under NONE (`umbelPresent`), the rays are hidden and inert at
depth 1 (`umbelCompound`), and the head toggle keeps its meaning (the head ON stands above the main
boss by the umbel's reach inset).

## 3. The floret floor — derived, and reported

**The criterion** (`floretBodyFloor`): the least scale of the head's petal at which a petal of the
reduced floret still keeps its full sheet body `RIM_TAPER_MM` (3.0 mm) in from both margins AND from
the drawn tip, at some row past the root blend. Below that scale every row of the blade is inside
the rim taper — a petal that is all rim and no body. It reads the nib, the rim bead and the root at
that scale off a real build of the probe floret (EXPORT, on the reduced lattice), never a typed
length. The head's own 20 mm petal floor does not move; the floor applies to depth-2 florets only
(`reducedFlorets` in the plan).

**Measured:** 0.375x on the shipping 35 × 16 petal — **13.13 × 6.00 mm**, inside the discovery's
12–14 mm, reached from the rim's own constants rather than from a photograph. On a narrow head petal
(35 × 8) the floor is 0.75x, 26 mm — ABOVE the head's 20 mm, because a narrow petal needs length to
keep any body at all; a matrix row holds that case.

UM9 restates the floor by a second evaluation over a Node probe's emitted rows (never
`floretBodyFloor`) and holds the built florets to `max(floretScale, floor)` × the head's petal.

## 4. The reduced lattice — a declared exception, with its numbers

Six columns (still EVEN, so no column lands on the midrib) and a **two-segment** rim bead; rows stay
at NU 56. A declared exception to the edge-profile ruling (four bead segments) and to the fixed
lattice, applied by branch through `withReducedFloretLattice` from ONE call site (the depth-2
floret's unit build), restored in a `finally`.

On the half-round the bead draws (r = 0.5 mm, the radius every reachable floret's bead takes):

| | K 4 (the ruling) | K 2 (a depth-2 floret) | PA12 resolvable detail |
|---|---|---|---|
| facet chord `2 r sin(π/2K)` | 0.383 mm | **0.707 mm** | ~0.35–0.4 mm |
| sagitta `r (1 − cos(π/2K))` | 0.038 mm | **0.146 mm** | |
| cup facet `c·hb/(NV−1)²` at cup 0.35, hb 3.0 | 0.013 mm (NV 10) | **0.042 mm** (NV 6) | |

**The cost, stated:** a 0.707 mm facet is LARGER than PA12's resolvable detail, so a printed
two-facet bead may read as a chamfer — two flats meeting at the apex — rather than a round. Its
departure from the true round (0.146 mm) is under the resolvable detail. A floret is ~1/100 of a
mophead and the eye reads the dome; the same floret on the full lattice costs 1.9x (12,440 against
6,664 sessile), the difference between ~120 and ~225 florets in the budget.

UM6 reads the lattice off the **emitted rim** of the sub-umbel's floret (the mid-blade row's side
profile: K + 1 vertices from skin edge to skin edge through the apex; the row's own plane:
2·NV + 2(K − 1) vertices) against Eva's numbers restated in the harness (the harness refuses to load
if the geometry's constants move), and holds every HEAD petal to the full 10 / 4 lattice.

## 5. The budget clamp

`umbelBudgetClamp` runs in `buildBloomBody` before the inflorescence is built: the floret's cost
`F` is the sub-umbel unit's own measured floret tally (the max over live and export), the sub-umbel's
fixed part is its unit's count less its florets, and the total for `k` florets a ray is
`rest + boss + rays × (fixed + k × F(k))` — exact, because the appends are rigid copies. `k` steps
down from the asked count until the total fits; where the area rule gives a different pedicel
radius at `k`, that `F(k)` is measured by its own floret build. The record (`budgetClamp`) carries
asked, built, the floret price and the predicted total; the read-out says CLAMPED with asked and
built. UM7 holds the bloom's own triangle count to the prediction exactly, under the budget, the
price to the EMITTED floret, and that no larger count a ray would have fit.

## 6. Measured before building (the brief's four numbers)

| | measured |
|---|---|
| triangles per reduced floret at the floor | **6,664** sessile (4 petals, 4 × 1,618 + 192 hub); **8,580** with its 3 mm pedicel and join |
| florets that fit 1.5 M | **225** sessile, **174** on pedicels (florets alone) |
| the dome at the defaults (depth 2, the registry's 12 rays × 6 florets, 40 mm rays at 50°) | **740,730** tris, **146–148 mm** across |
| the mophead row (12 × 12 round four-petal florets at the floor) | **1,241,994** tris, **126 mm** across |
| mass in PA12 (1.01 g/cm³), the shells' summed volume — an UPPER BOUND, overlaps counted twice | **~82 g** at the defaults, **~69 g** the mophead row |

The clamp corner (12 × 12 florets × 12 petals at 0.60x) asks 3,105,930 triangles and builds 5 a ray,
1,297,914 — the prediction exact.

**Re-measured on the built tree, by the sheet** (`tools/shot-bloom-mophead.mjs`, off the EXPORTED
file: the extent and the summed shell volume × 1.01e-3 g/mm³, the stem included, so the mass is
still an upper bound):

| | tris | across | mass, upper bound |
|---|---|---|---|
| the mophead row | 1,241,994 | **123.6 mm** | **≤ 77.7 g** |
| a 15 cm head (the same dome on 55 mm rays at 45°) | — | **149.7 mm** | **≤ 79.0 g** |
| the clamp corner: 144 florets asked, **60 built** (12 × 5) | 1,297,914 | — | — |
| a floret at the floor, 13.13 × 6.00 mm, with its pedicel | 8,580 | | |
| a 20 mm floret (20 × 8 mm) | 10,198 | | |
| a floret of the clamp corner, 21.00 × 9.60 mm, 12 petals | 21,524 | | |

The pre-build 126 mm / ~69 g for the mophead row were taken before the floor criterion was
settled and with the stem's volume left out; the sheet's 123.6 mm / ≤ 77.7 g are the built
figures and include the 120 mm stem. The triangle counts are unchanged to the integer.

## 7. The roots — and why the flood fill cannot witness them here

The discovery showed florets fused to each other read as ONE region with the receptacle deleted, so
the voxel flood fill cannot say a floret is rooted. **UM8** does, per floret, in the world frame:
every sub-umbel's emitted boss sits on its ray's emitted axis at the ray's inner end with its axis
along the ray, its size restated from the controls (UM1's own law on the sub-umbel's count, pedicel
and angle), and every floret's root disc lies half a gap inside its own sub-boss — rays × florets
discs.

## 8. The dome's florets touch — declared by value, never clamped

Inside one sub-umbel the florets stand on one node (the umbel's own declared overlap), and between
sub-umbels the dome's neighbours meet: from six rays up the florets of neighbouring sub-umbels pass
through each other. Measured and declared in the combination gate
(`mophead-subumbel-florets-x-angle`, `mophead-rays-x-florets`, 14 cells at 0.000 mm) and in
`INFLO_APPROACH_XFAIL` for the matrix rows ID10 (d) reads (16 rows, 0.0000 mm). The look is not
clamped: a mophead's florets interleave.

**One row carries a WELD in the self-intersection census, and it is declared, not a fold.** At
exactly 90° (`MOPHEAD: rays at 90 deg`) the rays stand parallel and ray 0's floret 2 shares one
exact vertex with ray 1's rod where the rod passes through it, so the census's vertex-weld shell
definition reads the two as one shell: **208 pairs, worst span 0.5896 mm**, identical in Node on the
builder's doubles and in the browser. Attributed by EMITTER (the ray blocks and, inside each, the
sub-umbel's floret / sub-boss / ray-stem ranges): every pair is two different parts, 0 within one
part. Declared in `SELF_INTERSECTION_XFAIL` by value; at every other angle in the matrix the
census reads 0.

## 9. Gates

- **UM5–UM9** (new; both STL gates): depth, lattice, clamp, roots, floor — §§3–7.
- **UM1** reads the rays' own count and angle at depth 2; the **ID family** reads the rays as the
  outer pedicels (ID4's floret identity at the second level's plan and floret; ID10's internode floor
  asserted absent on one node).
- **Five mutants** in the apex table, each witnessed on the mutated module:
  `a-sub-umbel-is-rooted-off-its-ray` (UM8), `depth-3-is-allowed` (UM5),
  `the-reduced-lattice-reaches-a-non-floret` (UM6), `the-clamp-counts-rows` (UM7),
  `the-floret-floor-is-typed` (UM9), on two mophead rows scoped to them.
- **Panel route (aq)** (THIRTY-FOUR routes) with two mutants: the rays shown at depth 1, the clamp
  never told.
- **Combination gate**: the new measure `subumbel-floret` and two pairs, declared by value.
- **Defaults bar**: the mophead at its shipped defaults, on `floret-stem` (§8 says why not
  `floret-floret`).
- **Matrix block 81** (20 rows, 1,568 → 1,588) and **smoke block 81** (5 rows, `--conn`).

## 10. Bytes and frozen tags

*Filled in at close — see the PR.*

## 11. For Eva to rule

The defaults shipped are the session's: depth `1` (the mophead is opt-in), and at depth 2 **12 rays
of 40 mm at 50°**, the umbel's own 6 florets a ray on 20 mm pedicels at 35°, florets at the umbel's
0.60x (so 21 × 9.6 mm, above the floor). The mophead row of the matrix (12 × 12 round four-petal
florets at the floor on 12 mm pedicels at 20°) is the session's proposal for what a "mophead"
preset would be, and is on the sheet.
