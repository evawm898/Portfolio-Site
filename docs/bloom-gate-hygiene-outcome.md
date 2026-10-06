# Gate hygiene — the foot in `measureWall`, named witnesses, the phase 35–52 prediction

Session of Oct 6, on `main` at `7af97f4`. **Gate-side only: no geometry, registry, page or
matrix file changed, no matrix row added, no frozen phase owed.**

## 0. Reconciliation

`main`'s log since `de6c08f` holds one commit, `7af97f4` (#374), docs-only: the charter
records `varianceSpacing`'s 0.90 maximum and three OPEN items. One of them is item 3 below
("phases 35–52 PREDICTED to move"). Nothing in this session's brief had already shipped.
One premise needed a correction: the brief says the sepal-normal fix is `f982aca`. That sha
is the PR branch's commit; it was squash-merged into `1899bfa` (#371) and is not reachable
from `main`. The patch was read from the GitHub API and reverted by hand for item 3.

## 1. `measureWall` sees the foot

**What it caught before, shown catching it:** on `main` the wall instrument's
`--negative-control` passed 4 mutants of 4 plus all 4 record legs. The combination gate's
`--control` passed every leg, with 145 cells under the bar, all declared.

**The change** (`tools/bloom-wall-thickness.mjs`):
- The foot rows join the grid as **SELF targets only**.
- A foot row is **never a query**. Its question is the hub's.
- A foot triangle inside the `near` window is **ignored**, never counted as WALL. That
  window is the foot-to-blade seam's own neighbourhood.
- So `wall`'s subject is unchanged **by construction**. Measured with the foot counted as a
  wall target instead, the seam kink reads as a thinning: the default goes
  1.2000 → 1.1976, tilt 120 goes 1.2000 → 0.8432.
- `footTargets: false` reproduces the old instrument. It exists only so the gate's control
  can plant "the foot is dropped again".

**After, the same conditions planted again:**
- The wall instrument's output is **byte-identical** to `main`'s, including all 12 STATES,
  V1–V5 and the three `SELF_XFAIL` magnitudes. Its `--negative-control` is also identical:
  4/4 mutants and 4/4 record legs.
- The combination gate's `--control` passes every leg on the named witnesses (§2).
- Two new legs plant the old instrument. **Both fire CG2 on their own witness** and
  reproduce the pre-change readings exactly:
  - `cup-x-curl`: 1.230 and 1.024 mm.
  - the composed triple: 13 cells at 1.230 / 1.222 / 1.213 mm.
- Each leg's one collateral is CG4. That is honest: the verdict flips back with the
  readings.

**The class it now sees, on the shipped geometry:**

| state | `self` / `self-every` before | after | site |
|---|---|---|---|
| block 44's composed state (3 whorls x curl 180 x innerCurl 360) | 1.2216 | **0.1990** | u 0.856, inner whorl |
| `petalSpineCurl` 360 alone | 1.2303 | **0.6764** | u 0.932 |
| tilt 105 / 120 (the blade lying back over its foot) | 1.2377 | 1.2377 | unmoved: the seam window holds |
| the default | 1.2377 | 1.2377 | unmoved |

## 1a. What moved in the combination gate — 43 of 513 cells, none upward

Of 513 cells, **470 are bit-identical** (`Object.is`). The other 43 moved, and every one
read **lower**:
- **7** declared cells were re-recorded. All got WORSE.
- **34** cells went under the bar and are now declared.
- **2** moved and still clear.

Declared cells went from **145 to 179**. Every re-recorded entry carries its old and new
value in its note. Measured on `main`'s geometry, Node 22, EXPORT, through the gate's own
`run()` with the instrument switched each way.

| cell | before (mm) | after (mm) | Δ | site u | class |
|---|---|---|---|---|---|
| `cup-x-roll-x-curl @ petalCup=-0.8 x petalRoll=0 x petalSpineCurl=360` | 1.2387 | 0.0399 | -1.1988 | 0.946 | NEW, declared |
| `layers-x-curl-x-innercurl @ layerCount=6 x petalSpineCurl=0 x innerCurl=360` | 1.2134 | 0.1038 | -1.1096 | 0.803 | NEW, declared |
| `layers-x-curl-x-innercurl @ layerCount=6 x petalSpineCurl=180 x innerCurl=360` | 1.2134 | 0.1038 | -1.1096 | 0.803 | NEW, declared |
| `layers-x-curl-x-innercurl @ layerCount=6 x petalSpineCurl=270 x innerCurl=360` | 1.2134 | 0.1038 | -1.1096 | 0.803 | NEW, declared |
| `layers-x-curl-x-innercurl @ layerCount=6 x petalSpineCurl=360 x innerCurl=0` | 1.2134 | 0.1038 | -1.1096 | 0.803 | NEW, declared |
| `layers-x-curl-x-innercurl @ layerCount=6 x petalSpineCurl=360 x innerCurl=360` | 1.2134 | 0.1038 | -1.1096 | 0.803 | NEW, declared |
| `cup-x-roll-x-curl @ petalCup=0 x petalRoll=-330 x petalSpineCurl=360` | 1.1759 | 0.1275 | -1.0484 | 0.898 | NEW, declared |
| `layers-x-curl-x-innercurl @ layerCount=3 x petalSpineCurl=0 x innerCurl=360` | 1.2216 | 0.1990 | -1.0226 | 0.856 | NEW, declared |
| `layers-x-curl-x-innercurl @ layerCount=3 x petalSpineCurl=180 x innerCurl=360` | 1.2216 | 0.1990 | -1.0226 | 0.856 | NEW, declared |
| `layers-x-curl-x-innercurl @ layerCount=3 x petalSpineCurl=270 x innerCurl=360` | 1.2216 | 0.1990 | -1.0226 | 0.856 | NEW, declared |
| `layers-x-curl-x-innercurl @ layerCount=3 x petalSpineCurl=360 x innerCurl=0` | 1.2216 | 0.1990 | -1.0226 | 0.856 | NEW, declared |
| `layers-x-curl-x-innercurl @ layerCount=3 x petalSpineCurl=360 x innerCurl=360` | 1.2216 | 0.1990 | -1.0226 | 0.856 | NEW, declared |
| `curl-x-twist @ petalSpineCurl=360 x petalTwist=60` | 0.9332 | 0.0399 | -0.8932 | 0.983 | re-recorded (was declared) |
| `cup-x-curl @ petalCup=0 x petalSpineCurl=360` | 1.2303 | 0.6764 | -0.5539 | 0.932 | NEW, declared |
| `curl-x-buckle @ petalSpineCurl=360 x buckleAmp=0` | 1.2303 | 0.6764 | -0.5539 | 0.932 | NEW, declared |
| `density-x-curl @ infillDensity=20 x petalSpineCurl=360` | 1.2303 | 0.6764 | -0.5539 | 0.932 | NEW, declared |
| `density-x-curl @ infillDensity=8 x petalSpineCurl=360` | 1.2303 | 0.6764 | -0.5539 | 0.932 | NEW, declared |
| `density-x-curl @ infillDensity=24 x petalSpineCurl=360` | 1.2303 | 0.6764 | -0.5539 | 0.932 | NEW, declared |
| `density-x-curl @ infillDensity=40 x petalSpineCurl=360` | 1.2303 | 0.6764 | -0.5539 | 0.932 | NEW, declared |
| `gradient-x-curl @ petalCupGradient=0 x petalSpineCurl=360` | 1.2303 | 0.6764 | -0.5539 | 0.932 | NEW, declared |
| `curl-x-twist @ petalSpineCurl=360 x petalTwist=0` | 1.2303 | 0.6764 | -0.5539 | 0.932 | NEW, declared |
| `lobedepth-x-curl @ lobeDepth=0 x petalSpineCurl=360` | 1.2303 | 0.6764 | -0.5539 | 0.932 | NEW, declared |
| `curl-x-cup-x-twist @ petalSpineCurl=360 x petalCup=0 x petalTwist=0` | 1.2303 | 0.6764 | -0.5539 | 0.932 | NEW, declared |
| `cup-x-roll-x-curl @ petalCup=0 x petalRoll=0 x petalSpineCurl=360` | 1.2303 | 0.6764 | -0.5539 | 0.932 | NEW, declared |
| `curl-x-twist-x-roll @ petalSpineCurl=360 x petalTwist=0 x petalRoll=0` | 1.2303 | 0.6764 | -0.5539 | 0.932 | NEW, declared |
| `layers-x-curl-x-innercurl @ layerCount=1 x petalSpineCurl=360 x innerCurl=0` | 1.2303 | 0.6764 | -0.5539 | 0.932 | NEW, declared |
| `layers-x-curl-x-innercurl @ layerCount=1 x petalSpineCurl=360 x innerCurl=360` | 1.2303 | 0.6764 | -0.5539 | 0.932 | NEW, declared |
| `lobedepth-x-curl @ lobeDepth=0.3 x petalSpineCurl=360` | 1.2215 | 0.6763 | -0.5451 | 0.932 | NEW, declared |
| `lobedepth-x-curl @ lobeDepth=0.6 x petalSpineCurl=360` | 1.2213 | 0.6769 | -0.5444 | 0.933 | NEW, declared |
| `lobedepth-x-curl @ lobeDepth=1 x petalSpineCurl=360` | 1.2199 | 0.6769 | -0.5430 | 0.933 | NEW, declared |
| `gradient-x-curl @ petalCupGradient=0.6 x petalSpineCurl=360` | 1.1234 | 0.6910 | -0.4325 | 0.932 | NEW, declared |
| `curl-x-buckle @ petalSpineCurl=360 x buckleAmp=0.2` | 1.0611 | 0.6436 | -0.4175 | 0.910 | NEW, declared |
| `gradient-x-curl @ petalCupGradient=0.9 x petalSpineCurl=360` | 1.0584 | 0.6950 | -0.3634 | 0.932 | NEW, declared |
| `layers-x-curl-x-innercurl @ layerCount=6 x petalSpineCurl=270 x innerCurl=0` | 1.2156 | 0.8645 | -0.3511 | 0.802 | NEW, declared |
| `curl-x-twist-x-roll @ petalSpineCurl=360 x petalTwist=180 x petalRoll=330` | 0.5274 | 0.1898 | -0.3376 | 0.983 | re-recorded (was declared) |
| `cup-x-curl @ petalCup=0.6 x petalSpineCurl=360` | 1.0242 | 0.6917 | -0.3325 | 0.932 | NEW, declared |
| `curl-x-buckle @ petalSpineCurl=360 x buckleAmp=0.4` | 0.8524 | 0.5499 | -0.3024 | 0.910 | re-recorded (was declared) |
| `curl-x-twist-x-roll @ petalSpineCurl=360 x petalTwist=-180 x petalRoll=330` | 0.4689 | 0.1898 | -0.2791 | 0.983 | re-recorded (was declared) |
| `layers-x-curl-x-innercurl @ layerCount=6 x petalSpineCurl=180 x innerCurl=0` | 1.2172 | 1.0644 | -0.1528 | 0.089 | moved, still clears |
| `layers-x-curl-x-innercurl @ layerCount=6 x petalSpineCurl=0 x innerCurl=0` | 1.2184 | 1.1544 | -0.0640 | 0.089 | moved, still clears |
| `curl-x-twist @ petalSpineCurl=360 x petalTwist=120` | 0.0527 | 0.0060 | -0.0467 | 0.983 | re-recorded (was declared) |
| `cup-x-roll-x-curl @ petalCup=-0.8 x petalRoll=-330 x petalSpineCurl=360` | 0.0802 | 0.0348 | -0.0454 | 0.946 | re-recorded (was declared) |
| `curl-x-twist-x-roll @ petalSpineCurl=360 x petalTwist=-180 x petalRoll=0` | 0.0099 | 0.0084 | -0.0015 | 0.898 | re-recorded (was declared) |

**Seven verdicts moved, because `petalSpineCurl` 360 ALONE now reaches the bar (0.676 mm):**
- product-only → **single-reaches**: `cup-x-curl`, `curl-x-buckle`, `gradient-x-curl`,
  `curl-x-twist`.
- clears → **single-reaches**: `density-x-curl`, `lobedepth-x-curl`.
- The triple `layers-x-curl-x-innercurl`: clears → **pair-reaches**.

CG4 is what reported each one. Each carries a `RE-DECLARED BY THE FOOT TARGETS` comment.

`curl-x-twist` was one of the four "declared pair hazards" awaiting a ruling (state of play
§5d). It is single-reaches now. Its product cells also got deeper:
- twist 60: 0.933 → 0.040 mm.
- twist 120: 0.053 → 0.006 mm.

**Not re-run, named:**
- `tools/bloom-form-variance-hazard.mjs` imports `measureWall`. It is a report, not a gate,
  and its figures were not re-taken.
- `tools/bloom-infill-base-panel.mjs --control` **FAILS on `main`**. Its C3 says #250's
  published truncation table no longer reproduces (all seven rows disagree). The output is
  identical line for line on this tree, so the failure is pre-existing and not this
  change's. No workflow runs that tool.
- `verify-bloom-defaults-bar.mjs` and its `--control` pass; the default's `self` did not
  move.

## 1b. Is block 44 still needed? (Not removed; Eva's to rule.)

**The gate can now see the class.** Two things guard it:
- The composed state's own cell (`layerCount=3 x petalSpineCurl=180 x innerCurl=360`) reads
  0.199 mm, is declared, and is held both ways by CG2/CG3.
- The curl-360 single is held the same way in every grid that carries a curl-360 column: 14 cells at 0.6764 mm.

**Block 44 is not redundant in KIND.**
- **X1** reads the **exported STL's own triangles in the browser**, and holds the **pair
  count** (1,968) and the **fold depth** (0.4218 mm).
- **`self`** is the **two-skin model's approach** on the captured mid-surface.

They are two owners of two different quantities. The approach can stay put while the fold
deepens, and the reverse.

**What block 44 no longer is:** the *only* thing that would notice the composed state's tip
reaching its foot. The recommendation, for the ruling: keep it as the export-side witness.
If it goes, the class survives only as a model-side approach.

## 2. Named witnesses — 17 sites, and what each resolved to

Every site below used to pick the row / cell / entry its control perturbs by **first
match**. Each one now names its witness and **refuses loudly** if the name goes missing or
loses the property its leg needs. "Stops firing" is still the leg's own clause. Where a
site's own refusal is new, it was shown red on a planted loss.

| file | site | was (first match) | named now | already drifting? |
|---|---|---|---|---|
| combination gate | failing cell | first declared cell under the bar | `cup-x-tipshape @ petalCup=0.6 x petalTipShape=3` | no |
| | clearing cell | first undeclared clearing cell | `cup-x-tipshape @ petalCup=0 x petalTipShape=1.7` | no |
| | product-only arm | first pair with the verdict | `cup-x-tipshape` | no |
| | single-reaches arm | ditto | `leafangle-x-stem` | **re-pointed by this session's own flips** — first match took `cup-x-curl` |
| | clears arm | ditto | `cup-x-buckle` | no |
| | inert key | `Object.keys(COMBINATION_INERT)[0]` | `density-x-cup @ infillDensity` | no |
| | tier-3 pair | first `tier === 3` | `leafangle-x-tooth` | no |
| | each triple's failing cell (5) | first declared cell under the bar | one per triple (`CONTROL_WITNESSES.triples`) | **`cup-x-roll-x-curl` re-pointed by this session's re-records**, from a roll −330 face to a curl-360 single |
| seam-bytes | `--control-redef` (a) | first undeclared row with a set | `petalCount 3` | no |
| | `--control-redef` (b) | first declared row whose label held | `ALL MAX` (tilt) | no |
| | `--control` held row | first row compared equal, **no guard** | per change: DEFAULT, or `petalTipEnd max (1)` for `nib` | **YES for `nib`**: `main`'s tool takes DEFAULT, a row the nib is declared to MOVE, whenever it happens to hold |
| grid-bytes | `--control` / `--control-only` petal | first petal with a grid | whorl 0 slot 0; one declared override | **YES, silently**: on `SPHERE STEM: the default sphere…` slots 0 and 1 are omitted by the stem channel, and the plant moved to slot 2 with nothing said |
| edge-profile | `CONTROL_ROWS` | regex + `.slice(0, 5)` | five labels, each REQUIRED, each checked to still exercise its arm | **YES**, known since Sep 30: the cleft and the carnation were dropped, and the lobe arm matched no row |
| xfail-magnitudes | the control row | first `SELF_INTERSECTION_XFAIL` key | `petalSpineCurl max (360)` | no |
| defaults-bytes | the holder | first holder in the shard, **and the LAST holder finding retired** | `DEFAULT (the shipping configuration)`; only its own finding retired | latent: `main`'s shard 1/300 used `petalCount 3` |
| stem-nodes | radius plant ring | first outer ring after ring 0 | ring 1 (checked OUTER) | no |
| lamina-floor | K1's negative break | first TIP_FLOOR handover above u 0.5 | `CORE -> TIP_FLOOR`, exactly once | no |

**The measured drift class, live.** The two combination-gate re-pointings above happened
**inside this session**: six verdict flips and 34 new declarations moved two first-match
witnesses, and **every leg stayed green**. That is the mechanism the naming removes, caught
in the act. The witnesses are pinned to what `main` ran with.

**Refusals shown red:**
- The combination gate plants four losses into a copy of its witness table on every
  `--control` run, and each one is refused by name.
- Edge-profile was checked with a renamed row and with a lost arm.
- Seam-bytes was checked with `nib` on `phase2`, which has no `petalTipEnd max (1)`.
- Xfail-magnitudes was checked with an `--only` that excludes the row.
- Defaults-bytes was checked with `--control` on a shard that does not hold DEFAULT.

**Each control still passes on its named witness:**
- Combination gate: every leg.
- Edge profile: 6/6 mutants. They read the same as `main` over five arms where `main` read
  two.
- Grid bytes: 274/274 builds, both controls.
- Xfail magnitudes: 6/6 legs.
- Stem nodes: 17 plants.
- Lamina floor: PASS.
- Defaults bytes: shard 0/300.
- Seam bytes: `--control` on phase2. Its tilt redefinition plant needs a pre-tilt base to
  run at all, which is equally true on `main`. Its named rows were checked to be the rows
  `main`'s first-match rule picks on a synthetic pre-tilt base.

**The seam-bytes vacuity guard read the `--control` FLAG as having discharged it.** It now
requires the control to have actually perturbed its row.

**Not counted and left alone:** seam-bytes `--control-mode` takes `[...classes.keys()][0]`.
That is positional (normally DEFAULT) and guarded by `modeFindings !== 1`.

## 3. The standing prediction — measured

**What was measured:**
- Every frozen phase from 33 to 53 had its `ALL MAX` row built twice on this tree: once as
  shipped, and once with ONLY the sepal side test reverted to the pre-fix facet-normal rule
  (the patch read off the API).
- Both builds were done in EXPORT and in LIVE.
- Each comparison covered the sepal limit record and every float under `Object.is`.
- Rows were grouped by identical control set.

**Results:**

| phases | what separates the set | sepal limit fixed / pre-fix | floats differing |
|---|---|---|---|
| 33, 34 | no sepals | — | 0 of 28,541,034 |
| 35 | 40 sepals, tilt 75 | −8° / −8° | **0** of 29,643,354 |
| 36, 37 | tilt 120 | −14° / −14° | **0** |
| 38–47 | + `varianceSize` 0.5 | −20° / −20° | **0** of 27,818,190 |
| 48–52 (and 53) | + `varianceForm` 1 | **−40° / −37°** | **1,059,120** of 27,818,190 |

The counts are identical in both modes, and so are the triangle counts.

**The prediction holds for phases 48–52 and FAILS for phases 35–47.**
- Phases 48–52's `ALL MAX` is phase53's own control set, and it moves exactly as phase53's
  does.
- **Phases 35–47 do not move at all.** Their sets build their sepals at −8°, −14° or −20°,
  where the scan never reaches the crease tie.
- The tie needs the form field: phase47 → phase48 adds `varianceForm` 1 and nothing else.

So **six tags carry the move (48–53) and thirteen do not (35–47)**. That replaces the
prediction recorded on the charter.

## 4. The byte proof — no geometry moved

I ran `node tools/verify-bloom-surface-bytes.mjs --base <worktree of 7af97f4> --control` over
the whole live matrix:
- **Coverage:** 1144 rows × 2 modes, which is **1,420,414,308 export floats over 157,823,812
  triangles**, plus **82,612,696 captured-grid values**. Every one was compared positionally
  under `Object.is`.
- **Findings:** exactly **two**. They are the run's own planted 1e-9 perturbations on DEFAULT
  (live), one per clause, which also proves each clause can fire.
- **Everything else:** **0 floats moved.** As expected of a control run, the tool exits 1.

`bloom-geometry.js`, `bloom-registry.js`, `bloom.js`, `bloom.html` and `bloom-grid-gltf.js`
are sha256-identical to `main`'s.
