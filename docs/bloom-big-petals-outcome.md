# Big petals — a 100 mm petal, a root thickened by its length, a hub that follows

Eva's rulings, Oct 21 (base `main` at `4d0758d`):

1. `petalLength` goes to **100 mm**, default unchanged (35). 15 cm across is a target.
2. A long petal **thickens at the ROOT and tapers to the normal sheet toward the tip**, sized
   by petal length; **the hub thickens to match**, so a root never stands on a thinner plate.

Everything below is measured on this branch unless it says otherwise. Every thickness quoted
on the sheet is read off the **exported file**, never off the builder's record.

## 1. The reference is unvalidated, and that comes first

Nothing in this project has ever been printed. The reference is the **shipping petal — 35 mm
on the 1.2 mm sheet** — and the law's only claim is that a longer petal's root is stressed **no
more than that one's**, under the same self-weight. Whether the shipping petal's root is itself
strong enough is not known. This law makes every longer petal exactly as strong as it, and no
stronger. The read-out says so on every tapered build (`UNVALIDATED — no coupon has been
printed`).

## 2. The law — derived from the cantilever, with its algebra in the geometry header

The full derivation is the header of `ROOT_TAPER_REF_MM` in `bloom-geometry.js`. In short:

- A strip of width `w` and thickness `t(z)`, `z` measured from the tip. `M'' = rho g w t`,
  `sigma = 6M / (w t^2)`. **The width cancels**, so the law is in length alone — which is what
  the ruling asked ("sized by petal length"). The uniform-width strip is the idealisation, stated.
- Reference: a uniform `t0` over `l = 35 mm`, root stress `sigma_ref = 3 rho g l^2 / t0`.
- **The outer stretch needs nothing**: within `l` of the tip a uniform sheet is under
  `sigma_ref`, reaching it exactly at `z = l`. So **the taper begins a distance `l` from the
  tip** (`u = 1 - l/L`) and runs over the inner `L - l` — a length the petal owns, derived from
  the relation, never typed.
- **The inner stretch is fully stressed**: `tau^2 = mu`, `mu'' = 2 tau` (`tau = t/t0`,
  `mu = M/M_ref`, `zeta = z/l`), matched at `zeta = 1` (`mu = 1`, `mu' = 2`). First integral
  `mu'^2 = (8/3) mu^(3/2) + 4/3`, so `d tau/d zeta = sqrt((8/3) tau^3 + 4/3) / (2 tau)`,
  `tau(1) = 1`. **The added material's own weight is in it** — the first-order `tau = zeta`
  would leave a 100 mm root 12% thin (3.43 mm against 3.88).
- Computed by fixed-step RK4 from the junction (`+ - * /` and `Math.sqrt` only, so every engine
  computes the same double). The harness restates it through the **other** form, the elliptic
  integral `zeta(tau) = 1 + sqrt(3) INT_1^tau x / sqrt(2x^3 + 1) dx` (Simpson + bisection):
  two integrators, two owners; worst relative disagreement **4.1e-11** over 35.5–120 mm, held
  at `1e-9`.
- **The law reads the ASKED length** (`bladeAskedLengthMm`, mode-free), so live and export agree.

| petal | root factor | root (1.2 mm sheet) | taper starts |
|---|---|---|---|
| 35 mm | 1.000 | 1.200 mm | — (identity) |
| 60 mm | 1.750 | 2.100 mm | 25 mm from the root |
| 80 mm | 2.442 | 2.931 mm | 45 mm from the root |
| 100 mm | 3.236 | **3.883 mm** | 65 mm from the root |

**ONE LAW WITH ONE OWNER, COMPOSED WITH TIP THINNING.** `thicknessProfile` is the one owner:
`t(u) = sheet x tau(u) x (1 - thin u)`. At `u = 0` the thinning is the identity and the factor
is the root's; past the junction `tau = 1` and the thinning is exactly as before. **At or under
35 mm `petalRootTaper` returns `null` and every consumer takes its pre-taper expression
verbatim — the identity BY BRANCH, never by `x * 1`.**

## 3. The followers

| follower | what it does now | witness |
|---|---|---|
| seam clearance | `seamClearanceMm(turn, sheet, rootFactor)` — the offset the kink folds is the root's; `seamHalfMm` likewise | A7, restated with the ring's own root factor, on every ring |
| fold limit (`spineBendTable`) | the margin is half the thickness AT EACH SUBSTEP (`tauAt`), not the sheet's | C5, restated per substep from the law |
| cup fold clamp | `|c| <= hb / (1.25 t(u))` reads the row's own thickness | the census on block 75 |
| roll floor | `kMax` against the thickest section (the root) | the roll-floor clause, x the restated root factor |
| rim bead | the bead's room is the body thickness the rim taper eases FROM; at `u = 0` (feet) the rim is untapered so the root skins are exactly `+/- t_root/2`; past 3 mm of rim the sheet is the law's | T1 reads the root skins off the file |
| infill wall inset | unchanged — the inset is in the plane of the sheet, a length the thickness does not enter | the infill gates (unchanged figures) |
| hub plate | `hub.thickness = sheet x tau(L_hub)`, `L_hub` the longest petal the bloom can build (scopes and the size field included, `hubRootTaperLengthMm`); the area rule and the rings keep the sheet | J4a restated (exact at or under the reference), T3 reads the hub off the file |
| hub-to-stem join floor | `max(join, hub thickness)` — the floor IS the thickened hub | block 75's stem row, ST4/ST5 |

**DECISIONS STATED (declared defaults, Eva's to rule — §7):** sepals are **pinned OFF**
(`sepalBladeState` sets `rootTaper: 'OFF'`) — a sepal's root stands on the join's flare, not on
the plate, and it is the petal builder on a second ring, so it would otherwise inherit a petal's
law it has no reason to; T4 asserts a sepal root is the sheet. **Leaves do not take it** — they
have their own surface law (`leafSurface`) and their own petiole rule. **Florets do** — a floret
is a bloom, and its petals are `floretScale x` the head's, so a raceme of 100 mm heads carries
tapered florets when the scale passes 0.35.

### 3b. Three followers, measured (Eva's ruling 4) — what each one's root actually is

Measured in EXPORT on this tree, `petalLength` 35 and 100, the default sheet (1.20 mm), each read
off the builder's own thickness record and confirmed on the file by the T family:

| part | 35 mm petal | 100 mm petal | takes the root law? |
|---|---|---|---|
| petal root | 1.200 mm | **3.883 mm** | yes |
| hub plate | 1.200 mm | **3.883 mm** | yes — `sheet x tau(L_hub)` |
| sepal root (`sepalLength` set to the petal's) | 1.200 mm | **1.200 mm** | **no — deliberately pinned** |
| leaf blade root (`leafLength` 100) | 1.200 mm | **1.200 mm** | **no — never wired** |
| leaf petiole radius | 0.600 mm | 0.600 mm | no (`t/2`, its own rule) |
| hub-to-stem join, 6 mm stem | 2.516 mm | **3.883 mm** (the floor binds: the join reads the thickened hub) | via the hub |
| hub-to-stem join, 12 mm stem | — | **4.296 mm** (the join's own bending law is past the hub) | via the hub |

- **Sepals: pinned OFF ON PURPOSE**, not by accident. A sepal is the petal builder on a second
  ring, so it WOULD inherit the law; `sepalBladeState` sets `rootTaper: 'OFF'` and
  `petalRootTaperFor` is the one reader of that pin. Its root stands on the join's flare rather
  than on the plate. **The consequence is real and is said rather than papered over**: a sepal
  can be 120 mm long (`sepalLength`'s own range), and a 120 mm sepal on a 1.2 mm root is
  stressed `(120/35)^2 = 11.8x` the reference. T4 asserts the pin; whether sepals should take
  the law is open (§7).
- **Leaves: untouched, and that is the honest word for it.** The leaf blade is built by
  `leafSurface` / `leafBladeLaw`, which reads the floored sheet directly and was never handed the
  root law. That was a scope choice in this session (the ruling named the petal and the hub),
  not a measurement that leaves are safe: a 120 mm leaf (`leafLength`'s maximum) on a 1.2 mm
  blade is the same 11.8x. Nothing asserts it either way. Open (§7).
- **The join floor reads the thickened hub**: `stemJoinThickness` is floored at
  `hub.thickness`, and on a 6 mm stem under a 100 mm petal the floor is what binds (3.883 mm
  against the join law's own 2.516). Asserted by ST4/ST5 on block 75's stem row.

## 4. Measured before building

On `4d0758d`, `petalLength` forced past the 60 mm slider in Node:

- **Outline sagitta** (the builder's own stations, 56 rows at tip shape 1.70, 84 at 2.50) —
  **LIVE and EXPORT identical**: 35 mm worst 0.1242 mm (base, u 0.058), mid 0.0048, apex
  0.0150; 60 mm 0.1434 / 0.0053 / 0.0175; **100 mm 0.1523 / 0.0055 / 0.0201**; 100 mm at tip
  2.50 (84 rows) 0.1218 at the apex, base 0.0708. The row count is lattice-fixed, so a 100 mm
  petal's chords are 2.9x longer and its chord error grows only 23% — the ladder spends its
  rows where the outline turns.
- **Triangles**: the lattice is fixed, so the default is **24,688** at 35, 60 and 100 mm in both
  modes. `ALL MAX` (the blanket row, now at 100 mm) **2,675,326** export triangles, still a
  declared refusal (178% of budget; 2,716,406 at 60 mm). The worst exported per-petal corner,
  `INFILL: x 40 petals x 3 whorls`, would read **1,390,432 (92.7%) at 100 mm** against 74.7% at
  35 — inside the budget.
- **Bloom across** (twice the max radius, defaults): 35 mm 87.9 / 81.4 / 53.1 mm at tilt
  0 / 25 / 60; 60 mm 138.1 / 126.9 / 78.1; **100 mm 218.3 / 199.6 / 118.2**. A 15 cm bloom is a
  75 mm petal at the default tilt.

## 5. Gates

- **The T family** (`rootTaperAssertions`, both STL gates): **T0** the record against the law
  restated from the controls; **T1** the ROOT read off the EXPORTED skins (the nearest file
  vertex either side along the build's normal at the centre line) against the restated law;
  **T2** every untapered blade row likewise; **T3** the hub read off the file (a flat hub at
  its rim, a dome on its apex axis) is at least the thickest root in the file; **T4** a sepal's
  root is the sheet. Both STL gates are blind to a thickness by construction.
- **J1, J4a, A7, C5 and the roll floor are RESTATED, never relaxed**: at or under the reference
  each is the old exact clause; above it each reads the ring's restated root factor.
- **The must-fail**: `node tools/verify-bloom-root-taper.mjs [--control]` — four mutants, each
  witnessed on the MUTATED module before its clause is consulted: the taper ignored (T1, T2), the
  hub not following (T3), the thickness read from a row count (T2), the law made first-order
  (T1). **4 of 4 fire.** It rides in CI by being SPAWNED by `verify-bloom-defaults-bar.mjs` (both
  arms), which also asserts DB3 — the shipped default builds no taper. No workflow was edited.
- **SO13 (the scopes gate) is RESTATED, and the original condition was planted on the new
  geometry to prove the restatement still bites** (Eva's ruling 3). SO13's law is that a layer
  that OWNS its length or tilt moves no foot and no ring; under the root taper an owned length
  past 35 mm legitimately moves the foot's THICKNESS, so the clause now restates the thickness
  from the law and holds position, frame and half-width EXACTLY — at an owned length under the
  reference (25 mm) and over it (40 mm). The plant: on a scratch tree, an owned LENGTH was made
  to scale the foot's width as an owned width does (the original defect, on this geometry). The
  restated clause, verbatim:
  ```
  SO13: RADIAL layer 3 (owned length 25 mm): an owned length/tilt moved an emitted foot row (position, frame or half-width)
  SO13: RADIAL layer 3 (owned length 25 mm): an owned length/tilt moved the ring's radius 7.8758630541514885 -> 11.864301199950255
  SO13: RADIAL layer 3 (owned length 25 mm): an owned length/tilt moved the ring's width 3.1359999999999997 -> 4.571428571428572
  SO13: RADIAL layer 3 (owned length 40 mm): an owned length/tilt moved an emitted foot row (position, frame or half-width)
  SO13: RADIAL layer 3 (owned length 40 mm): an owned length/tilt moved the ring's radius 7.8758630541514885 -> 20.103212417368027
  SO13: RADIAL layer 3 (owned length 40 mm): an owned length/tilt moved the ring's width 3.1359999999999997 -> 7.314285714285714
  ```
  (the SPIRAL turns read the same). No committed mutant did this, so one was added:
  `an-owned-length-moves-the-foot` in `verify-bloom-scopes.mjs`'s negative control, witnessed on
  the MUTATED module (layer 2's `footRing` width moves with an owned length) before its clauses
  are consulted — it reddens SO13 and SO12. Clean: SCOPES GATE PASS, 13 clauses.
- **Matrix block 75** (28 rows, 1,457 -> 1,485): 60/80/100 mm x cup, curl, layers, tilt, a
  hemisphere, CONTINUOUS, a SPHERE head, a stem, sepals, infill, tip thinning, sheet extremes,
  and a GATED 35 mm row. **Smoke block 75** (7 rows, `--conn`).
- **Combination gate**: `cup-x-length` gains 80 and 100 mm (the ruled reach — CLEARS, the long
  petals reading FURTHER from the bar: 1.231 mm at cup 1.2 x 100 mm); **`length-x-tilt`** is new
  (tier 2, CLEARS, worst 1.238 at the shipping petal).

## 6. Folds — declared by value, never clamped

Four block-75 rows fold, and **every one folds with the taper switched OFF on the same control
set**, so none is the taper's:

| row | law ON | law OFF | class |
|---|---|---|---|
| 100 mm x curl 360 | 608 / 0.3738 | 640 / 0.7199 | curl-360 tip into its own foot |
| 60 mm x curl 360 | 768 / 0.7060 | 752 / 0.6554 | the same |
| 100 mm x tilt 90 | 32 / 0.0000 | 32 / 0.0000 | span-0 tangency (`TILT: 90`'s kind) |
| 100 mm on a hemisphere | 520 / 0.4619 | 632 / 0.3547 | the head's hemisphere fold |

**THE ROOT RIM OF A 100 mm PETAL TURNS 53.5° — 8.5° PAST E2'S ALLOWANCE. RULED Oct 21: accepted.
A thick root closing on the 1 mm bead is a chamfer.** Declared, not clamped. The rim taper eases the body down to the 1 mm bead
over `RIM_TAPER_MM` (3 mm) of surface; at a 3.88 mm root that is a much steeper ease than at the
1.2 mm sheet it was ruled on, and the edge gate's E2 reads it at the root (radius ~11.6 mm) on
every 100 mm row: 53.53° plain, at tilt 0 and with a stem, 53.49° with tip thinning, 53.43° cupped
0.6, 53.28° rolled 200, 50.16° curled 180. **60 and 80 mm plain pass.** The same states with the
root taper OFF pass. Two remedies were built and measured, and neither ships:
- the bead's radius scaled by the row's root factor — the 100 mm root passes, and the 80 mm root
  then reads **61.9°** in the buried-end ramp, where a larger bead fades in over the same 3 mm;
- that ramp lengthened by the root factor as well — **77.5° / 88.7°**, because the edge gate
  excludes the ramp's own stretch and a longer ramp puts wall-like profiles inside its window.
Lengthening the across-the-rim taper would reach the centre line and thin the root the law
derives, so it was not tried. The three 100 mm smoke rows are declared in `E2_TURN_XFAIL` with
this note; the other readings are recorded here. **Two rows fail at the TIP and are not the
taper's** (the same state with the law off reads the identical turn at the identical site): cup
1.2 (58.14°) and 80 mm x cup 0.9 x curl 270 (50.79°) — the cupped-nib bead class.

**AND ONE E7 EDGE ON `ALL MAX`, DECLARED BY VALUE.** `ALL MAX` asks a **150 mm** petal (the 100 mm
maximum x its size field's 1.5) on a 6.56 mm root body under every form control; two side profiles
at the root-blend end stop 0.00971 mm off the drawn bead radius against the builder's own 0.00958 mm
bracket. That bracket is the half's ARC over 4096 while the bisection halves the section PARAMETER,
which this section does not stretch evenly — a bound that assumed an even stretch, met for the first
time. `E7_INSET_XFAIL` held it both ways while the width range was 8–30; the row is export-refused.
**AND THE WIDTH RANGE TOOK IT AWAY:** once `ALL MAX` asks a 46 mm width the same gate reads **0** off-bracket
profiles in both modes, so the entry was REMOVED (X1's own both-directions rule — a record that stops
reproducing is stale), with a comment in its place saying to re-declare it by value if it comes back.

## 6b. `petalWidth` to 46 mm (Eva's ruling 2, the same PR)

**RULED Oct 21: `petalWidth`'s maximum 30 -> 46 mm; the default (16) does not move.** 46 is the
shipping petal's proportion (35 x 16) carried to the new 100 mm length. `OVERRIDE_BOUNDS` and the
registry row both say 46 (one range, two statements, checked at harness load).

Every reader the range reaches, and what it does at 46:

| reader | at 46 mm | moved? |
|---|---|---|
| the blade's half-width | 23 mm | yes — the point of the ruling |
| the foot (`0.4 x width x footDelicacy`, clamped at `FOOT_MAX_WIDTH_MM` 10) | 10 mm — the clamp already binds from 25 up, so it now binds on **22 of the slider's 39 values** (56%); a 46 mm blade stands on the same foot and ring as a 25 mm one (blade +84%, ring +0%) | no — reported in the constant's own header, not changed (widening it moves every ring) |
| the ring / `R0` area rule | reads the clamped foot | no |
| the outline curve's width scale (`petalWidth / 16`) | 2.875x | yes, by its own law; a scaled-UP point cannot fall under the floor, so the drag refusal is unaffected |
| sepal twins | a sepal's derived width is `petalWidth x sepalScale` (to 46 at size 1.0); its OWN `sepalWidth` row stays 3–30 | the derived width follows; the own range is not this ruling's — reported |
| florets | `clamp(petalWidth x floretScale, 8, 46)` — the clamp reads the range and can never bind (scale <= 1) | no |
| infill density | the cells are planned on the drawn outline; a wider blade carries more | by its own law |
| crowding | reads the feet, which are clamped | no |
| fringe count | the geometry's ceiling grows with the terminal's width (about 23 teeth at 46), but `FRINGE_COUNT_RANGE` already binds at 10 from 16 mm up | no |
| scope offsets | a composed width (global + offset) is clamped at the range; FAN petal 1's +16 on the default now builds 32 where it clamped at 30 | yes — 9 census rows (below) |

**The blanket sweep's `petalWidth max` row is REDEFINED (30 -> 46)**, as `petalLength max` was
(60 -> 100) and `ALL MAX` (both). The byte tool now carries a row-definition guard for the
`root-taper` predicate — the tilt-range precedent's `ROW_DEF_MOVED_BY_CHANGE`, ported into
`verify-bloom-surface-bytes.mjs` — which loads the BASE tree's own matrix and refuses an
undeclared redefinition and a declared one that did not happen: **3 declared, 3 confirmed, 28
rows added (block 75)**. `petalWidth max (46)` itself is a byte HOLDER: the base geometry clamps
a COMPOSED width, never the global, so the base builds the same 46 mm blade from the same row.

**`ALL MAX` moved again and was re-measured**: the export refusal **2,692,174 -> 3,334,106**
triangles (2,716,406 at main's 60 x 30). **All of the +641,932 is the FRINGE, measured**: with
`fringeCount` 0 the same control set builds 928,586 at width 30 and at width 46, to the integer —
the fringe's tooth ceiling is a rule about the terminal's width. The census **68,518 / 26.2094 ->
78,222 / 34.0787** (main's 74,716 / 13.6547). Both in their entries with the two steps named.

**Nine census declarations re-recorded by the width alone** — every one a FAN row carrying petal
1's +16 width offset, which composes to 32: `FAN x PER-PETAL: 1/side x 170deg x petal 1 MAX`
57 / 0.5147 -> 57 / 0.5100, `… toggle OFF …` 114 / 0.3802 -> 118 / 0.3815, `ALL PER-PETAL MAX x
8/side x 60deg` 901 / 0.5557 -> 935 / 0.5498, `… x 1/side` 171 / 0.5147 -> 171 / 0.5100, `… x 3
layers` 1295 / 0.5530 -> 1337 / 0.5498, `… x ALL FORM MAX` 5047 / 2.5964 -> 5124 / 2.6812,
`CAPABILITY: cleft x FAN x toggle ON x ALL PER-PETAL MAX` 385 / 0.5147 -> 385 / 0.5100, `ALL
PETALS: max x FAN 3/side toggle ON x petal 1 max` 55 / 0.5147 -> 55 / 0.5100, `DOME: rise 1 x FAN
3/side x petal 1 max` 331 / 0.6555 -> 335 / 0.6470. Four worse in pairs, the rest the same count
with the span moving both ways — re-recorded by value, never a widened band.

**The combination gate reaches the new maximum and finds the cup on a 46 mm blade**: width 46
ALONE clears (1.236 mm), and the cup closes further across it. `cup-x-width` gains a 46 mm
column — **0.902 / 0.788 / 0.712 mm at cup 0.6 / 0.9 / 1.2**, all under the 1.00 mm bar, all
declared by value (the 23 mm cell reproduces at 0.981, unmoved). The triple
`cup-x-tipshape-x-width` gains 46 too — **0.759 / 0.194 / 0.712 / 0.189** at its four new
under-the-bar cells, the triple's own worst cell going 0.390 -> **0.189 mm** (cup 1.2 x tip 3.00 x
width 46). Seven new declarations; never clamped.

## 6c. The byte partition and the census

**The byte partition, one table** — `node tools/verify-bloom-surface-bytes.mjs --base <worktree of 4d0758d>
--movers-predicate root-taper`, in seven `--range` chunks and closed with `--merge`, both modes, positionally
under `Object.is`, every chunk run on the final predicate (the length clause and the width clause together),
the movers PREDECLARED from the BASE tree's own build record:

| class | rows | how it is decided |
|---|---|---|
| root-taper movers | **100** | the base builds a petal (or a raceme's floret head, or the hub's bound) asking more than 35 mm |
| width movers | **19** — every one ALSO a root-taper mover | the base builds a petal whose COMPOSED width (global + scope offset) passes the base's own 30 mm bound; all 19 are FAN rows whose per-petal size offset doubles the petal, so they ask 70 mm as well |
| width-only movers | **0** | measured, not assumed: a top-level `petalWidth` past 30 is not clamped on the base (the clamp acts on a composition), so `petalWidth max (46)` HOLDS to the bit |
| holders | **1,385**, 0 floats moved | every row whose petals are all at or under 35 mm and whose widths compose inside 30 |

**PASS — 100 of 100 predeclared movers moved and 0 floats moved on the 1,385 holders**, over
1,709,607,456 export floats (189,956,384 triangles) and 81,492,282 captured-grid values in 9,425 panels The row-definition guard confirms the three declared redefinitions against the base matrix
(`petalLength max (100)`, `petalWidth max (46)`, `ALL MAX`) and the 28 rows block 75 adds, and refuses an
undeclared one; `phase81` (the 1,457 rows at `4d0758d`) still deep-compares equal to the base's own
`buildMatrix()`.

**The census, every move named** (`SELF_INTERSECTION_XFAIL`, X1's both-directions rule):

- **Re-recorded by the root law** (11 entries, each note keeping the previous figure): the mum on a hemisphere
  (228 / 0.2435 -> 219 / 0.3176), `ALL MAX`, and the nine FAN per-petal rows whose size offset asks 70 mm.
- **Re-recorded again by the width** (the same nine FAN rows, §6b): petal 1's width offset now composes to 32,
  so each carries two dated notes, the root law's and the width's.
- **Removed** (2): `GYNOECIUM: style x the mum` and `STIGMA: a shaped stigma x the mum` read 0 — the mum's
  60 mm petals thicken the hub to 1.75 sheets, so the style's root no longer overlaps itself inside the plate.
- **Declared from birth** (5): the four block-75 folds (100 mm x curl 360 608 / 0.3738, 60 mm x curl 360
  768 / 0.7060, 100 mm x tilt 90 a span-0 tangency 32 / 0.0000, 100 mm on a hemisphere 520 / 0.4619 — each
  folding with the law OFF too) and **`FAN x PER-PETAL: ALL PER-PETAL MAX x ALL THIN x spread min`, 294 / 0.3223**.
  That last one reads 0 on `4d0758d`; every pair is in the ROOT BLEND (u < 0.30, worst u 0.018 beside the
  foot-to-blade seam) of a 70 mm petal on a 0.6 mm sheet tilted to 75 on a FAN — a thick root turned hard over a
  narrow foot. It reads 294 / 0.3187 with the root law alone and 294 / 0.3223 once the width reached 46. **It
  was found by the browser export gate (X2), not by the Node census sweep, which this row had escaped** — said
  plainly, because the sweep was the instrument this session leaned on.
- **`ALL MAX`**: census 74,716 / 13.6547 -> **78,222 / 34.0787**, refusal **3,334,106** triangles (§6b).

**Browser confirmation.** The eleven width-affected rows went through `node tools/verify-bloom-export.mjs
--only`: ten reached the results, watertight, every X1 line "still failing at that magnitude" on the
re-recorded figures — Chromium agrees with Node on all nine width re-records — and the eleventh was the ALL THIN
row above, dropped on X2 until it was declared.

## 7. Open decisions for Eva — shipped as declared defaults

1. **The reference length** — 35 mm, the shipping petal. Any other reference is one constant
   (`ROOT_TAPER_REF_MM`, restated in the harness and refused at load if it disagrees with the
   default).
2. **The taper's extent** — `L - 35` mm from the root, derived (the fully stressed solution).
   A shorter taper would be a different law, not a tuning.
3. **Sepals pinned off, leaves untouched, florets tapered** (§3).
4. **`petalWidth` — RULED Oct 21: maximum 46 mm, default unmoved, shipped in this PR (§6b).**
   Left open by it: the foot's 10 mm clamp (now binding over 56% of the slider), and the sepal's
   own `sepalWidth` range (3–30) against a derived sepal width that now reaches 46.
5. **The root rim at 100 mm** (§6) — 53.5° against E2's 45° allowance. **RULED Oct 21: accepted. A
   thick root closing on the 1 mm bead is a chamfer.** The three smoke-row declarations stand with
   their numbers; both failed fixes are kept in §6 with theirs.
6. **Sepals and leaves on the root law** (§3b): both stay on the uniform sheet — sepals pinned
   on purpose, leaves never wired. A 120 mm sepal or leaf is 11.8x the reference stress.

## 8. What this does not do

- The spine's curvature floor stays one SHEET radius; what protects the thick root is the fold
  limit, which reads each substep's own thickness.
- The neighbour flag and the self-contact flag still read the sheet (telemetry).
- The hub bound is an upper bound under scopes and the size field — the longest petal the bloom
  CAN build, so a hub may be thicker than its thickest built root, never thinner.

Sheet: `node tools/shot-bloom-big-petals.mjs <dir> --png docs/img/big-petals.png`.
