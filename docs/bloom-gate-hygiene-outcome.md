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

## 1c. Eva's rulings on §1b and on `curl-x-twist` (Oct 6), and what checking them found

**Ruling 1 was premised on "the triple's grid does not sample block 44's state", and the
premise is FALSE.** Measured against the grid as shipped, `layers-x-curl-x-innercurl`'s
axes are:
- `layerCount` [1, 3, 6];
- `petalSpineCurl` [0, 180, 270, 360];
- `innerCurl` [0, 360].

Curl 180 is on the curl axis **on purpose**. The axis comment says the grid carries "the
composed state's own values (3 whorls, curl 180) — the one candidate with a measured fold
behind it, so it is measured rather than bracketed".

So the cell `layers-x-curl-x-innercurl @ layerCount=3 x petalSpineCurl=180 x innerCurl=360`
**is** block 44's control set, `{ layerCount: 3, petalSpineCurl: 180, innerCurl: 360 }`,
exactly. It reads **0.199 mm**, is declared, and CG2/CG3 hold it both ways. It is also
the triple's named `CONTROL_WITNESSES` failing cell.

Keeping block 44 therefore rests on §1b's argument and not on coverage, and that is
how it was ruled (below):
- X1 holds the **pair count and fold depth of the exported file** (1,968 / 0.4218 mm, in
  the browser).
- The gate holds the **two-skin model's approach** (0.199 mm, in Node).

These are two quantities with two owners. Ruling 1 was handed back for re-ruling on that
basis.

**Re-ruled (Eva, Oct 6): KEEP block 44, as an application of the different-owner rule — not
belt-and-braces.**
- The gate reads **nearest approach** (0.199 mm) on the two-skin model, in **Node**.
- Block 44 reads the **exported file's self-intersection census** (1,968 pairs /
  0.4218 mm), in the **browser**.

Different quantity, different engine, different owner: a green approach number does not
entail an unfolded STL. And `measureWall` was blind to exactly this class until this PR, so
retiring the row that caught what it missed would mean trusting an instrument just shown
fallible in that very area. The same reason is written beside the row in
`tools/bloom-harness.mjs`.

**Ruling 2, ACCEPTED: `curl-x-twist` is `single-reaches`.** Nothing got worse: the
measure stopped being blind. Two follow-ups, report only:

**(a) Does the matrix catch the single control on its own row?**
- **The FOLD: yes.** Matrix row `petalSpineCurl max (360)` is declared in
  `SELF_INTERSECTION_XFAIL` at **920 pairs / 0.5158 mm**. X1/X2 hold it in the export gate
  on every run.
- **The SELF-APPROACH (0.676 mm): no, and that is a gap.** The one-control `self` gate is the
  wall instrument's V5. Its rows carry no curl-360-alone state:
  - `form-max` has curl 360 composed with every other form control, and is declared at
    0.008 mm.
  - `twist-max` is twist alone.

  So no single-control row held the 0.676 mm figure anywhere.

  **CLOSED, Oct 6 (Eva's ruling).** The wall instrument has a `curl-max` row now
  (`SHIPPED curl 360`, `{ petalSpineCurl: 360 }`), declared in its `SELF_XFAIL` at
  **0.676 mm** and held by V5 within ±5e-4 mm in both directions.
  - It is an **instrument** row (`STATES` in `tools/bloom-wall-thickness.mjs`), not a
    `buildMatrix()` row, so no frozen phase is owed. Nothing else imports `STATES`.
  - Its must-fail is a new record-control leg, `foot dropped (curl-max)`. The leg plants
    the old instrument (`footTargets: false`) through the shipped `verify()`. It requires
    exactly one clause to fire, on its own row:
    `V5 xfail: "SHIPPED curl 360" now clears the bar at 1.230 mm and PASSES`. No other
    clause fires: the other rows do not depend on the foot.
  - Measured: `--negative-control` reads "all mutants behaved", with the new leg `ok`.
    The plain run exits 0.

  This was named by both follow-ups, and it is closed by the row.

**(b) Where does the declared magnitude live?** On the **pairs**, only. The single-curl-360
state is declared ten times, once per pair or triple that has a curl axis, each at the
cell where every other axis sits at its default:
- `cup-x-curl`, `curl-x-buckle`, `density-x-curl`, `gradient-x-curl`, `curl-x-twist`,
  `lobedepth-x-curl`;
- the four triples `curl-x-cup-x-twist`, `cup-x-roll-x-curl`, `curl-x-twist-x-roll`,
  `layers-x-curl-x-innercurl`.

Each is at **0.6764 mm**. No single-control entry declared it: the wall instrument's
`SELF_XFAIL` had no curl-360 row until `curl-max` (above).

**The ten are KEPT and ANNOTATED, not removed.** They are still where the number appears,
and removing them would redden CG2. Each note now ends with:
- **TRUE CAUSE:** `petalSpineCurl` 360 alone reaches this.
- **The guard:** `SELF_XFAIL['curl-max']` is the single-control guard.

A later trim of the shortlist can then drop a pair without dropping the only declaration
of a single-control fact. So the hazard is filed under ten pair causes, each now
known to be untrue, and not under the one control that owns it. Counting the curl-360
cells off the defaults too, it is 14 declarations of one measurement (§1b's figure).

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
