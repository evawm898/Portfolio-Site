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

PARTITION_AND_CENSUS_PLACEHOLDER

## 7. Open decisions for Eva — shipped as declared defaults

1. **The reference length** — 35 mm, the shipping petal. Any other reference is one constant
   (`ROOT_TAPER_REF_MM`, restated in the harness and refused at load if it disagrees with the
   default).
2. **The taper's extent** — `L - 35` mm from the root, derived (the fully stressed solution).
   A shorter taper would be a different law, not a tuning.
3. **Sepals pinned off, leaves untouched, florets tapered** (§3).
4. **`petalWidth` — reported, NOT changed.** The range is 8–30 mm (default 16). The shipping
   petal is 35 x 16, a length-to-width of 2.19. **At 100 mm the widest petal is 30 mm, 3.33 —
   the shipping proportion is unreachable**; it needs 45.7 mm. At the 20 mm minimum length the
   widest is 1.5x WIDER than long. **Recommendation: raise `petalWidth`'s maximum to 46 mm**
   (100 x 16 / 35), keep the minimum and the default. What it would move: the foot
   (`0.4 x width x footDelicacy`), the ring radius through the area rule, the outline curve's
   width scale (`petalWidth / 16`), and `ALL MAX` (a redefinition, like this session's).
   Not done — it is its own ruling.

## 8. What this does not do

- The spine's curvature floor stays one SHEET radius; what protects the thick root is the fold
  limit, which reads each substep's own thickness.
- The neighbour flag and the self-contact flag still read the sheet (telemetry).
- The hub bound is an upper bound under scopes and the size field — the longest petal the bloom
  CAN build, so a hub may be thicker than its thickest built root, never thinner.

Sheet: `node tools/shot-bloom-big-petals.mjs <dir> --png docs/img/big-petals.png`.
