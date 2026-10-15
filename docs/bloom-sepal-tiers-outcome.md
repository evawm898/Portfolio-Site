# Stacked sepal tiers — F1.1a (Oct 15)

Eva's rulings Q1.1–Q1.5 (`docs/reference-flower-feature-map.md` §11) built as one
session. Read this before touching `footRing`'s sepal tier loop, `sepalDescriptorFor`,
`sepalTierHeightLaw`, `sepalTierState` / `tierOffsetsFor`, `buildSepalTierInto`,
`sepalAngleLimit`'s tier sites, the page's tier scope arms, SP10–SP13 or block 63.

## 1. What ships

- **`sepalTiers`** (Sepals, 1–4, default 1 — the guard) asks for N whorls down the
  hub-to-stem join. Tier 1 is today's whorl: `sepalDescriptorFor` is the old IIFE with
  `state` for `st`, called at `k = 0` with no `frac`, so a one-tier bloom is built from the
  expressions it was (measured: every one-tier row holds, §5). The control is out of the
  blanket sweep through `SEPAL_SUBS` (its predicate's driver is `sepalCount`).
- **The height law.** Tier 1 sits at `sepalHeight` (h) of the join's axial extent as before;
  tier k (0-based) at `h · (N − k) / N` (`sepalTierHeightLaw`, one owner). So three tiers at
  the default 0.75 sit at 0.75 / 0.50 / 0.25 of the join — the lantern's steps.
- **One owner per tier's attachment:** `sepalAttachment(state, hub, acc, { frac })` solves
  the same profile at the tier's own fraction; a tier descriptor carries its own
  `attachment`, `ring`, `height`, `state`, `term` and `order`.
- **Ordering (Q1.3).** Tier k is floored one GAP under the tier above it:
  `fracCeiling = above.frac − gapMm / extentMm`, `gapMm = 2 · seamHalfThicknessMm(sheet)`
  (two sheet half-thicknesses, a length derived from a length). Where the law asks higher
  the tier is ORDER-CLAMPED and told (`order.orderClamped`); where the ceiling is under the
  stem end the tier is NO ROOM, told, not built.
- **Tiers need a stem (Q1.2).** `sepalTiersEligible(state)` (geometry) and
  `sepalTiersLive` (registry) are the two statements; with no stem, on a RIM fallback (a
  dome whose bowl holds the stem end above the join, an inert join) tiers past the first are
  told and not built. The control hides there.
- **Contact (Q1.4).** Each lower tier's angle limit is drawn by `sepalAngleLimit` against
  the petals AND every tier above it (the upper tiers' emitted laminae, with the root
  exclusion in millimetres), so a tier asked up stops under the one above; the record says
  what it met (`limit.against`: `petal i` or `tier k sepal j`). `buildSepalsInto` captures
  laminae while more than one tier is present (byte-inert).
- **Each tier owns the full sepal set (Q1.1) as a TIER SCOPE.** `scopes.tiers[{tier, offsets}]`
  (the design file's third container, now applied) carries per-tier OFFSETS on the global
  sepal values; `sepalTierState` composes global + offset, clamped once into the registry
  bounds. The whorl-level ids (`sepalCount`, `sepalTiers`) are refused. The page's picker
  lists built tiers; picking one makes the Sepals section edit that tier's entry
  (`desired − global − others`), the same view the layer and petal scopes have. Sepals
  within a tier match (SP12 holds every blade of a tier to one `builtFrom`).
- **Count ceiling per tier (Q1.5, DEFAULT): the petal count per placement, as for one whorl.**
  Measured on the corner (§2) it is the TIER count that bounds the budget, not the per-tier
  count, so the per-tier ceiling stays the first session's and the tier ceiling is 4.

## 2. The corner, measured first

40 sepals × 4 tiers × the WING (120 × 30 mm asked, tip shape 3.00) × 40 petals × a 120 mm
stem: **1,080,714 export triangles, 72.0 % of the 1,500,000 budget**; a tier of 40 wings is
238,960 triangles, so five tiers would read about 88 % and six would refuse. The matrix
row (`SEPAL TIERS: the WING on four tiers …`) carries tip 0.60 and reads lower. Hence
`SEPAL_TIER_RANGE = [1, 4]` — a budget ceiling, recorded in the geometry's header.

The join itself is the other bound: **1.32 mm at the default 6 mm stem** (one tier fits,
tier 2 is NO ROOM — a matrix row), **77.6 mm on a 40 mm GOBLET**. Tiers are a feature of a
bloom with a real hub.

## 3. The sheet (`docs/img/sepal-tiers.png`, `node tools/shot-bloom-sepal-tiers.mjs`)

- The winged lantern: three tiers on a 40 mm GOBLET, 5 a tier, tier 1 the WING through a
  tier scope (+90 mm, −3 mm, angle −30, curl +120, tip 0.60), tier 3 a step smaller
  (−12 / −2 mm): attached at 0.750 / 0.500 / 0.250 of the join (z −20.0 / −39.4 / −58.8),
  limits 36 / 31 / 90, 72,820 triangles shown; the same three tiers with no scopes beside it.
- Two tiers down a 20 mm hub at 0.750 / 0.375, the law alone.
- The clamped case: three tiers asked UP at 60 on a 10 mm hub — tier 1 CLAMPED at 29°
  against the petals, tier 2 at 37° against tier 1, tier 3 at 45° against tier 2.
- Measured, not on the sheet: on a 4 mm hub four tiers are order-clamped one sheet apart;
  at the 2.40 mm sheet on a 6 mm hub tiers 2 and 3 are order-clamped 2.40 mm apart and
  tier 4 is NO ROOM; on a dome (rise 0.5) the join inverts, tier 1 falls to the rim and the
  tiers past it are told.

## 4. Gates

- **SP10** the two statements, the tier count, inertness at one tier; **SP11** the height law,
  the gap as a length, the ceiling, `orderClamped` and NO ROOM as biconditionals, the foot
  rows on the attachment; **SP12** each tier's effective state = clamp(global + offset) with
  the offsets RESTATED FROM THE ROW's own scopes, every blade of a tier from one state, the
  size and phase laws per tier; **SP13** the clamp per tier — the arithmetic, and the
  harness's own contact test at the PAGE's built angle against the petals and the tiers above.
- **Two of those clauses read their reference from the quantity under test on the first
  cut, and only the mutant table said so** (the fourth durable rule, twice, inside the
  session's own family): SP12 summed the builder's `term.offsets`, which a leaking
  `tierOffsetsFor` writes, so `tier-offsets-leak` was silent; SP13's contact check tested the
  Node rebuild's OWN clamp angle, so `tier-contact-unclamped` was silent. SP12 reads the row's
  scopes now and SP13 is handed the page's angles.
- **Five mutants**, each witnessed on the mutated module's own tier records
  (`tierFacts`): `every-tier-at-the-same-height`, `tiers-cross` (witnessed with tier 1 lowered
  by a scope, because the law alone cannot lift tier 2 past 0.75), `tier-contact-unclamped`,
  `tier-offsets-leak` (on a row that carries scopes — the table's rows may now carry
  `scopes`, applied through `__bloomScopes`), `tiers-built-with-no-stem`. 5 of 5 fire on the
  mutation that names them and are silent on the clean tree; the refactor moved
  `sepal-count-unclamped`'s anchor (`state` → `st`) and it is re-anchored.
- Block 63 (11 rows, 1343 → 1354); smoke block 63 (6 rows, `--conn`): 237 rows over 59
  blocks, 185 families all claimed. Panel gate PASS; scopes gate (SO0–SO12) and design-file
  gate (F0–F7) updated for applied tier entries, both PASS in Node.
- `frozen/phase69` is the 1343 rows at `19ecb99`, registered in both maps and proved
  deep-equal (`--verify-frozen --phase69`).

### 4a. The mutant sweep hit its cap, and the tier rows are scoped now (found by CI)

The first push's `bloom-apex-mutants` run cancelled five of six shards at the 150-minute
job timeout (run 38727602126; shard 4 finished at 112 min). Main's last green run
(38683961988) had shards at 90 / 134 / 136 / 136 / 136 / 139 min, so the sweep was
already within a few minutes of its cap, and this PR's four rows on 76 (+5 %) and five
mutants on 173 (+3 %) are what tipped it. The workflow is out of this session's reach, so
the cost came out of the table instead: a row may carry `for: /mutant ids/` and a mutant
`rows: /row labels/` (`rowsFor()`), the four `SEPAL TIERS:` rows run under the five tier
mutants alone and the five tier mutants run over those four rows alone. The clean control
still runs every row, so a family firing on the clean tree is reported whatever scoped it;
what a scoped mutant gives up is collateral it never had to report. Cost to the sweep
against main: four extra rows in each shard's clean control and five four-row mutants —
about a minute a shard where the first push cost about ten. Re-run on this tree: anchors
178 of 178, the five tier mutants fire what they name, and the neuter control on
`tiers-cross` reports. The 134–139 min of main's own shards is the sweep owner's and is
left as found.

## 5. The byte partition

Predeclared from the BASE tree's own record (`verify-bloom-surface-bytes --movers-predicate
sepal-tiers`): a row moves iff it asks more than one tier AND the base builds a sepal whorl
attached on the HUB join with more than one gap of extent under tier 1 — **8 movers** (the
lantern, the contact row, the 4 mm and thick-sheet order rows, the FAN and CONTINUOUS rows,
the ANGLED and WING corners); the DEFAULT-join (NO ROOM), DOME (rim fallback) and GATED
rows are holders by branch. Result: see §7.

## 6. Not done, named

- The tier controls are OFFSETS through the scope picker, not 21 generated rows per tier
  (the feature map's `TIP_DESCRIPTORS × TIP_INSTANCES` shape) — Q1.1 was answered through
  the scoping model (Q3.8), which is what "each tier owns the full set" means on this tree.
- `verify-bloom-sepal-bytes.mjs`'s prefix clause still assumes one sepal block at the end;
  every tier is emitted last, so it holds, but it was not re-run here.
- Sepals within a tier cannot vary (ruled).

## 7. Measured close

- **The byte partition closes: 8 of 8 predeclared movers MOVED, 0 floats moved on the
  1,346 holders**, positionally under `Object.is`, over the whole 1,354-row live matrix in
  both modes — 1,629,497,592 export floats over 181,055,288 triangles and 84,863,144
  captured-grid values — run as four `--range` chunks and closed by `--merge`. Every one-tier
  row of `main`'s 1343 holds to the bit, including every `SEPAL` and `SEPAL SIZE` row, `ALL
  MAX` (its declared refusal unmoved at 2,716,406) and `ALL MIN`.
- **The export gate over the smoke subset (237 rows, every block) PASSES** — 236 of 237
  reaching the results and exporting watertight, the 237th the declared refusal, SP10–SP13
  silent on every row, the coverage instruments (R1/R3) reading the tiers through
  `footList`. (The smoke's connectedness half timed out on `settleBuild` once on a box
  running four byte shards beside it; re-run alone on block 63 below.)
- Scopes gate `--browser` PASS, `--negative-control` PASS (thirteen mutants); design-file
  gate PASS in the browser (16 clauses); panel gate PASS.
- Mutants: 5 of 5 tier mutants fire on the three tier rows plus the scoped row (the
  subset run), silent on the clean tree; 178 anchors matching exactly once.
- **Connectedness on block 63, run alone: 11 of 11 ONE connected piece**, boundary 0 on
  every row (the two 40 × 40 × 4-tier corners at 614,794 export triangles each — the
  lattice does not vary with the sepal's size, so the WING and the cone corner cost the
  same; the lantern 72,820).
