# Stem session 2 — ruling 6 built (nodes decoupled from leaves), Oct 4, 2026

*Built on `main` at `a82f025`, then merged with `main` at `af15342` (#353, the inflorescence node laws, landed while this PR was in CI — §1b). Sources: `docs/bloom-stem-session-1-outcome.md` and
`docs/bloom-stem-state-oct-2026.md`. Measurements are Node builds through the shipped geometry,
or the real browser gates where they say so. The stem's axis law is mode-free: every tip,
station and triangle figure below reads the same in LIVE and EXPORT, and each table names its
mode.*

## 0. Outcome

**A bare stem carries nodes.**
- The leaf term is gone from both statements: `stemNodesAbsent` in the geometry, and
  `stemNodesEligible` in the registry.
- **One count** (`leafNodes`) governs nodes and leaves, and now sits under **Stem**.
- **Leafed stems are unchanged.** Their kinks still turn away from each node's first leaf.
- **Bare nodes turn at the golden angle.**
- **Nodes are pinned off on every pedicel**, in one place.
- **Merged swellings are reported, never clamped.**

**The scope holds exactly as ruled:**
- **1 live row moves:** the old GATED no-leaves row, relabelled because its label was now false.
- **1 row moves in each of `phase46`–`phase49`.** This is the same row, predicted by predicate.
- **Block 47 adds 9 rows.** The 8 noded ones move against the base tree. The raceme row holds,
  because the pedicel pin keeps its pedicels straight.
- **A frozen phase is owed and registered:** `frozen/phase51`, the 1,080 rows at `af15342`.

## 1. Reconciliation

- **`main` has no commits after `a82f025`.** Nothing in the brief was already shipped.
- **"The arrangement moves up to Stem, always visible" was half-applied, on purpose.**
  - Both controls moved to Stem.
  - The COUNT is shown whenever a stem exists.
  - The ARRANGEMENT (`leafPhyllotaxy`) is shown only with leaves. On a bare stem it reaches
    nothing: node depths do not read it, and a bare node turns at the golden angle, not by its
    leaves. Showing it there would ship a dead control.
  - This is one predicate to change if Eva wants it visible anyway.
  - The ids stay `leafNodes` / `leafPhyllotaxy`. Renaming them would retire two ids and move
    every frozen row that names them.
- **Bare-stem placement was already correct and was not re-derived.** With no leaf the layout's
  rise is 0, so nodes sit at 0.16 L … 0.86 L. That is the flower's own `stemNodeParams`, and
  on 100 mm it gives 16 / 51 / 86.
- **The registry comment claiming "NODE COUNT IS ITS OWN CONTROL" had been false since #240**,
  because the count was gated on leaves. It is true now, and the comment says so.

## 1b. The merge with #353, and why the numbers are 51 and 47

#353 (the inflorescence node laws) merged to `main` at 05:40, after this PR was pushed, and
took both **`frozen/phase50`** and matrix **block 46**.

- **phase50 at `754e3aa` is this session's first baseline, row for row.** The two 1,047-row
  bodies merged with no conflict but a trailing comma, so the duplicate is dropped. This
  change's own baseline is now **`frozen/phase51`, the 1,080 rows at `af15342`** — `main`'s
  head before it, carrying #353's 33 NODE LAWS rows. It is registered in both maps and
  `--verify-frozen --phase51` reads deep-equal.
- **Bare-stem nodes are block 47**, appended after #353's block 46 (the byte tools pair rows
  by index).
- **One rule had to be composed, not chosen.** Ruling 6 shows the node count whenever there
  is a stem. #353 made that same count the PEDICELS' on a raceme, where it moves neither the
  nodes (inert under an inflorescence) nor the leaves (the shared node takes the pedicels'
  count). The count therefore uses `leafNodeCountLive` — a stem and no raceme — and the
  arrangement keeps #353's `leafNodesOwn`. The alternative is a visible control that does
  nothing, which this panel does not ship. It is one term to change.
- **`floretState`** takes #353's per-node length argument and still spreads `PEDICEL_PINS`.
- **Every verification in §5 was re-run on the merged tree against `af15342`.**

## 2. The kink direction — two laws that never mix

| stem | node directions (deg) | tip off straight, 100 × 6 mm, prominence 0.48 |
|---|---|---|
| 3 alternate leaves (unchanged) | 180 / 0 / 180 | 2.599 mm |
| bare, 3 nodes (new) | 0 / 137.5 / 275 | **3.364 mm** (3 mm stem: 3.288) |

**Why two laws are legal here:**
- `leafLength` is global and one count governs both nodes and leaves, so either every node on a
  stem carries leaves or none does.
- A golden bend therefore only ever exists where there is no leaf for it to disagree with.
- The flower's forbidden disagreement is golden bends under leaves flipping 180°. It cannot
  occur here.
- `stemNodeLaw`'s comment says this, so the next reader does not take it for the forbidden
  thing.
- `the-golden-kink-reaches-leafed-stems` is the standing mutant that witnesses it.

## 3. Merged swellings — reported, not clamped

Two Gaussian swellings of half-width w sum to ONE bump exactly when their separation is at
most √2·w, which is **4.63 stem radii**.

**Where it is reported:**
- The plan carries `mergeGapMm` and `mergedPairs`.
- The read-out prints "SWELLINGS MERGED … reported, not clamped".

**How it is checked:**
- ST12(f) holds the report against the gaps restated from the controls, in both directions.

**Where it already applies:**
- Two shipped leafed rows were already under the line:
  - whorled × 8: 12.00 mm against 13.89;
  - the thin sheet on a short stem: 1.15 mm.
- On the leafed rows nothing about the merge is clamped; they now carry the report.
- Block 46 carries two bare merged rows.

## 4. The gate's reference has a different owner now

`restatedStemNodes(ui)` reads the CONTROLS only:
- the flower's own node fractions (0.16 / 0.86 / 0.55);
- the leaf's rise, from its own two controls;
- the pitch floor, from the sheet and `MIN_FEATURE_MM`;
- the phyllotaxy's own turn;
- the golden angle, written as `π(3 − √5)`, not imported from the geometry.

It used to read the leaf record. That is built by `leafNodeLayout`, the same owner the stem's
node law reads, and a bare stem has no leaf record at all.

**What ST12 checks now:**
- **ST12(e)** keeps the relation "a leafed stem's nodes ARE its leaves' nodes", checked against
  the leaf record, which is the other party to the relation. It also asserts that a bare stem
  reports no leaf record.
- **ST12(f)** is the merge report (§3).
- **ID4** gains the pedicel pin as two clauses with two owners:
  - the state the floret was built from;
  - the floret's own stem record: no node law, two stations.

**A latent ST3 defect, found by the new rows and fixed by restating rather than loosening.**
- **The defect:** ST3's narrowest-vertex arm asserted that a SOLID noded stem's thinnest ring
  is exactly R. A Gaussian swelling is never exactly zero, so it never is.
- **Why leafed rows passed:** their first node sits 22.9 mm down on the 3 mm row, where the
  tail is about 3e-10 of the radius, under the 1e-9 bar by luck.
- **Why the bare row failed:** the bare layout puts the first node at 0.16 L. The browser gate
  dropped `BARE NODES: 0.48 on Eva's approved 3 mm stem` at **1.5000017624 against 1.5**.
- **The fix:** the arm now restates the law's own narrowest ring at the depths the builder rang,
  exactly as the widest-ring arm already did. The bar is still 1e-9.

## 5. Verification

**Byte partition.** `verify-bloom-surface-bytes --base <af15342> --movers-predicate
nodes-bare`, over the full 1,089-row matrix in both modes, in 36 foreground chunks merged with
`--merge`. **PASS.** (The first run, against `a82f025` before the merge, also passed: 9 movers
and 1,047 holders.)
- The predicate is written from the controls (the ruling's sentence), never from either tree's
  guard.
- **9 of 9 predeclared movers moved.**
- **0 floats moved on the 1,080 holders:** 1,459,186,560 export floats and 81,814,838 grid
  values, under `Object.is`.
  - Every LEAFED noded row is among the holders.
  - So is every RACEME row: all 33 of #353's NODE LAWS rows, and the block-47 raceme whose
    head asks for prominence 1.
- **Every clause was shown able to fire:**
  - `--control` fires the export-stream clause and the grid clause.
  - Run with `--base` set to this tree, the "named a MOVER and held to the bit" clause fires on
    both bare rows.

**Export gate and connectedness** (`--only` over blocks 41 and 47, the real browser, re-run on the merged tree):
- **export:** PASS, 22 of 22, watertight, `tris(live) === tris(export)`;
- **X2:** **0 within-shell pairs on all 22 rows**;
- **connectedness:** PASS, 22 of 22, one connected body each.

**Must-fails.** `node tools/verify-bloom-stem-nodes.mjs`: **17 ST12 plants plus 2 ID4 plants,
every one firing on its own message through the shipped clause function.**
- The baselines are refused as vacuous unless the bare stem has no leaf record and the merged
  stem merges.
- The ID4 clauses were factored into `pedicelPinClauses` so the plants go through the path a
  real failure takes.

**Standing mutants** (`verify-bloom-apex-mutants.mjs --only=…`):
- **`the-nodes-are-gated-on-leaves-again`:** fires ST12 and ST2.
- **`the-pedicel-pin-is-dropped`:** fires ID4.
- **`the-golden-kink-reaches-leafed-stems`:** fires ST12 and ST2.
- **The surrounding mutants are clean too.** That is the 6 pre-existing node mutants and the 4
  inflorescence mutants whose code this touched.
  - `prominence-zero-is-not-the-identity` now also reddens ID4. That is true of it: with the
    prominence term gone, a pedicel at prominence 0 builds a node law.
- **This is a subset, not a sweep.** 12 of 88 mutants were run.

**Build order.** `verify-bloom-build-order` forward, reverse and shuffled (seed 7), three
processes over the full matrix in both modes. **PASS on the merged tree:** 2,178 digests
identical across all three passes, bit for bit. (Before the merge: 2,112 identical, 0 throws.)
`--coupling` read 0 of the 9 new rows before the merge.

**Separation.** `bloom-petal-separation.mjs` reads 144 builds, **0 not one piece**. It builds no
stem, so for this feature the connectedness gate above is the witness that counts.

**Panel gate:** PASS locally. **Smoke:** census OK at 143 rows over 42 blocks, and its negative
control passes. **`--verify-frozen --phase51`:** deep-equal to `af15342`'s own `buildMatrix()`.

**#353's rows under this change** (the real browser, export gate `--only` over all 33 NODE
LAWS rows): **PASS**. 32 rows reached the results and are watertight, with 0 within-shell
pairs. The 33rd, `ALL MAX at 35 deg`, is its declared refusal. The panel gate passes with
`leafNodeCountLive`.

**Cost:**
- **The shipping default is untouched:** 24,688 triangles, since `stemLength` 0 builds no stem.
- A bare 100 × 6 mm stem goes from 26,796 to **35,820** at prominence 0.48 (1.75 MB STL).
- On 3 mm it goes from 26,604 to 32,268.

**No workflow file is edited**, so `phase51`'s base commit carries the same workflow files as
`main` at dispatch.

## 6. Reported, not fixed — the tip shortfall's real cause

- **The cause:** the 6 mm leafed stem reads 2.599 mm because its last node's 21.4 mm ramp runs
  past the end of a 100 mm stem. The spindle's scaling is not the cause.
- **The full-turn figure:** once every ramp has finished, the tip is `slope · Σ(L − s_k)`, which
  is **2.841 mm**. That is what the 3 mm stem reads, because its 10.7 mm ramp fits.
- **The handling costed:** clamp each node's ramp to the length left below it,
  `min(ramp, L − s_k)`, so every turn completes at the stem end. It is one `min` in the axis,
  tilt and placer-density functions.

**What it would move:**
- **16 of the 20 live noded rows** overrun and would move. The four that fit are the 3 mm
  leafed and bare rows, the 4 mm thinnest-bore row, and the bare one-node row.
- **60 of 72 frozen noded rows** would move, over 6 tags (`phase46`–`phase51`). `phase51`'s
  first 1,047 rows are `phase50`'s, so it adds the same 10 of 12.
- Triangle counts move too, because a shorter ramp is a sharper bend and the placer adds
  stations.
- **Tips:**
  - leafed 100 × 6: 2.599 → **2.841**;
  - leafed 12 mm bore: 2.186 → 2.841;
  - bare 100 × 6: 3.364 → 3.288;
  - the short stems move most, e.g. 12 × 6 thin sheet 0.110 → 0.319.

The flower's length scaling is NOT adopted: a 0.66 mm spindle on a 12 × 6 stem is a bead, not
a joint (#296's mistake).
