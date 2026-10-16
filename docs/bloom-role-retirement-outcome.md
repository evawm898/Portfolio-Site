# The role retirement — the role table retired into scoping

Feature map §11 Q3.4 and Q3.5, and Eva's Oct 14 ruling on the RADIAL labellum and hood. The base is
`main` at `f95b244`. Read `docs/bloom-scoping-model.md` (the model) and
`docs/bloom-scoping-selection.md` (the toggles) first. This doc says what changed, what it costs
and what is still Eva's.

## 1. The rulings, as built

- **The slot roles, the per-petal groups and the ALL / INNER deltas are retired.** That is
  `labellum*`, `hood*`, `petalN*`, `allCurl` / `allCup` and `innerCurl` / `innerCup`: 47 ids, all in
  `RETIRED_IDS` with `migrateBy: 'migrateRoles'` and `retiredAt: 70`.
  - The ids are never reused, and `verifySections()` refuses a collision at module load.
- **The machinery is gone.** That means the role table (`ROLE_OVERRIDES`), its resolver, the
  descriptor split by role, the eligibility predicates (`slotRolesEligible`, `perPetalEligible`,
  `allPetalsEligible`) and the role stamps on every petal record.
  - A petal's state is now `global → scope offsets → variance → the ONE clamp`, in
    `resolvePetalTerms`.
  - The panel loses 47 controls (218 → 171) and 12 sections (42 → 30): Petal roles and its eleven
    drop-downs.
- **The FAN labellum, hood and per-petal groups become per-petal scope offsets.**
  - Group k lands on canonical pair k − 1 of every layer, with Per-petal values ON.
  - The mirror pair stays one scope, as it already is in the model.
- **ALL becomes the global; INNER becomes per-layer offsets.**
  - ALL folds into the whole bloom's own value, put on the slider's grid.
  - INNER becomes an offset on every layer ≥ 2 with Per-layer values ON (RADIAL), or on every
    pair of every layer ≥ 2 with Per-petal values ON (FAN).
- **The RADIAL labellum and hood are DROPPED, not migrated.** No scope is written and each id is
  told: *"DROPPED BY RULING (Oct 14): … a radial orchid is no longer reachable; per-petal values are
  FAN only"*.
- **Q3.5 is wired.** Under Per-layer values, a layer entry naming `petalLength`, `petalWidth` or
  `petalTilt` OWNS that base for its layer. Its blade is built from global + offset, and the
  ramp's term (layerSize's scale, layerTilt's tiltExtra) is left out for it. `layerSize` and
  `layerTilt` hide while Per-layer values is live (`{not: {ref: 'scopeLayersLive'}}`).

## 2. The migration — `migrateRoles`, one owner

- **It is computed, not copied.** `migrateTo` is data and copies a value; a delta onto an offset
  cannot be a copy, because where it lands depends on the arrangement (the placement, the whorl
  count, the fan's pairing) and on the global it is added to.
  - So `migrateControls` / `migrateSet` call `migrateRoles` (bloom-registry.js) for the role ids.
  - The design file's reader calls it too (`migrateRetiredRoles`), and so does the harness, for
    every stored matrix row (`storedRow`, and `migrateForServedTree` in `applyConfig`).
- **An offset is an exact landing, not a subtraction.** `landOffset(from, target)` finds the `d`
  with `from + d === target` exactly, searching a few ulps when `target − from` does not land.
  - For a size multiplier in 0.5..2, `fl(g × mul) − g` is exact (Sterbenz), so a migrated size
    group lands on the old double at the global it was migrated at.
  - That is the OFFSETS default's one recorded semantic loss (scoping model §4): the offset stays
    put if the global later moves, where the multiplier would have scaled with it.
- **Every retired id is told, never silent.** Each one off its identity gets a note:
  - `migrated` — carried, and where to;
  - `dropped` — RADIAL labellum and hood, or no scope can carry it;
  - `inert` — it built nothing on this arrangement, so there is nothing to carry.
  The design file maps these onto its own kinds (`migrated` / `retired`), and `#designStatus`
  prints them.
- **A design missing a value the migration reads is told, and none of its roles is applied.** That
  is rule 3 of the design file.
- **The two scope toggles are read, not required.** A design saved between 57f64f7 and Scoping-b
  carries role values and no toggle, because neither toggle existed yet. In that tree the role table
  was live, which is what OFF means. So an absent toggle is read as the design's own fact, never
  defaulted. The file then reports the toggle the migration SET as migrated, not missing.
- **The live matrix's role rows are STORED designs, migrated at the end of `buildMatrix`**
  (`storedRow`). Their labels and stored sets are verbatim. The page receives the migrated set,
  with the scopes as one reserved `@scopes` entry (`SCOPES_SET_ID`) handed through `__bloomScopes`.

## 3. The partition — predeclared from the BASE tree, measured in both modes

`node tools/verify-bloom-role-retirement.mjs --base <worktree of f95b244> --shard k/4` (then
`--merge … --list`).

- **The population** is every distinct (set, capability) in the live matrix and all 69 frozen
  matrices, first occurrence, live first: **1,651 sets**.
- **225 are excluded, all base-side.** They are frozen rows naming ids the BASE tree had already
  retired (`petalTipBreadth`, `centerStyle`, `labellumTipBreadth`, `innerTipBreadth`,
  `allTipBreadth`, `stigmaSharpness`, `antherSharpness`, `lobeTipShape`). The base cannot build
  them, so there is nothing to compare. 0 head-side exclusions.
- **1,426 sets are built on both trees in both modes.** That is 2,111,195,016 export floats over
  234,577,224 triangles, plus 133,056,127 captured-grid values (live), compared positionally under
  `Object.is`.
- **The mover set is predeclared from the BASE tree's own footRing records**, never from labels. A
  row moves iff:
  - (a) a RADIAL descriptor carries a slot role whose composed value or whose ring radius differs
    from the plain build — the drop; or
  - (b) one of three other mechanisms, below.
- **Result: PASS.** 1,390 holders, 0 floats moved on any. 36 predicted movers, all 36 moved.

| class | rows | what |
|---|---|---|
| (a) the RADIAL labellum / hood drop | **33** | every RADIAL slot-role row at 2+ whorls in step (the `SLOT:` block, the `ORCHID:` rows, `DOME: rise 1 x ORCHID`, `CURL: ORCHID x labellum curl x bias max`, `ALL PETALS: GATED — max x 3 layers x phase 0 x ORCHID`, `ORCHID x the IRIS`) |
| (b) SPIRAL INNER | **1** | `ZYGO: the iris x SPIRAL (roles exist, azimuth differs)` |
| (b) the area rule regrouped per whorl | **2** | `FAN x PER-PETAL: petal 1 x 3 layers x inner*`, `FAN x PER-PETAL: ALL PER-PETAL MAX x 3 layers` |
| (b) ALL off the slider grid | 0 | predicted none, measured none |

**(b) explained, each one:**

1. **SPIRAL INNER is dropped, because no scope can carry it.**
   - The old table applied INNER to a SPIRAL's inner whorls. Per-layer values are RADIAL only and
     per-petal values FAN only (Scoping-b's rulings), so no entry can reach a spiral's inner whorl.
   - The migration tells it as *"DROPPED: no scope carries a SPIRAL bloom's inner whorls"*.
   - The inner whorls lose curl +180 and cup +0.4: max |d| **30.26 mm**, both modes, triangle
     count unchanged (49,184).
   - **This is the one (b) item that is a real geometry change, and Eva has not ruled on it.** See
     §7, question 1.
2. **The FAN area-rule rows move by one ULP.** The hub radius is
   `sqrt(Σ footCount · rFoot² / …)`.
   - On the base tree the sum ran one term per DESCRIPTOR, and a FAN split by per-petal groups had
     several descriptors per whorl.
   - It runs one term per whorl now, so the same numbers are added in a different order.
     `R0 6.189043600978178 → 6.189043600978177`.
   - Max |d| **7.1e-15 mm**, both modes, triangle counts unchanged (64,494).
   - Arithmetic, not geometry. The census and every gate read these rows at their recorded
     magnitudes (`FAN x PER-PETAL: ALL PER-PETAL MAX x 3 layers` 23,023 / 1.0987, unmoved).

**Where the rows are:**
- **63 rows left the live matrix (1,354 → 1,291).** They are:
  - **33 movers:** 32 of the 33 (a) rows (not the one kept, below) and the SPIRAL iris;
  - **30 holders:** 24 GATED rows, whose only claim was a role being "hidden and inert" (that
    claim went with the table), and 6 rows whose role values were already inert or clamped onto
    the base (`6 layers x allCurl/allCup min/max`, `SLOT: size x2.00 saturating`, `SLOT: curl
    clamp binds downward`). Each of the 6 migrates to a bloom another row already covers.
- **`ORCHID x the IRIS` is KEPT** as the witness that a drop beside a migration keeps the
  migration: its INNER half becomes a per-layer offset while its labellum and hood are dropped.
- **`frozen/phase70` is the 1,354 rows at `f95b244`**, registered in both maps and proved
  deep-equal (`--verify-frozen --phase70`). It is the record of every removed row.

**Frozen bytes that stop reproducing.** Every definition still deep-compares; these are bytes
only, the session-24 rule:

| phases | rows |
|---|---|
| phase7–phase9 | 1 each (b) |
| phase10 | 3 (b) |
| phase11–phase13 | 19 (16 a, 3 b) |
| phase14–phase21 | 20 (17 a, 3 b) |
| phase22–phase69 | 36 (33 a, 3 b) |

phase2–phase6 hold entirely.

## 4. What else moved

- **Census.** `SELF_INTERSECTION_XFAIL` loses ten entries, and the block at its head names them:
  - the nine RADIAL slot rows that left the matrix;
  - `ORCHID x the IRIS`, which reads **0 pairs** now (11 / 0.2567 on the base) — the fold was the
    face's.
  - Nothing else re-records.
  - The edge-profile gate's named E2 witness was the removed orchid row; it is the FAN per-petal
    extreme now, same class.
- **The grid glTF** drops four metadata keys per petal (`role`, `slotRole`, `petalRole`,
  `allRole`), which the petal record no longer carries. The geometry in the file is unchanged.
- **Triangle counts.** The shipping default is 24,688 live and export, as on `main`. No row's count
  moves: the drop is a resize and a re-angle on a fixed lattice.

## 5. The gates

- **The harness (both STL gates)**, Z family:
  - re-derived onto the scope law: Z0, Z1, Z2, Z4b, Z4c;
  - the role-eligibility families retired with the table;
  - SP6 asks for a scope term on a sepal now, not a role override.
- **The scopes gate** (`node tools/verify-bloom-scopes.mjs`): SO0 (the 47 ids retired, no table
  exported), SO4, SO6 (Q3.5 as wired), SO7 (the migration lands on the old law, restated in the
  gate), SO11 (the retired ids are inert in the builder, unmigrated). It has fifteen mutants,
  including the brief's four, each witnessed on the MUTATED module (two are registry copies):
  - `a-retired-id-is-still-read-by-the-builder` → SO11;
  - `a-fan-group-lands-on-the-wrong-pair` → SO7;
  - `a-radial-labellum-is-silently-kept` → SO7;
  - `a-migration-drops-a-value-it-should-carry` → SO7.
  The four role-eligibility mutants retired with what they mutated.
- **The panel gate:**
  - routes (f), (g) and (h) are retired with their flags — three edits each;
  - route (n)'s retired-identifier scan covers the 47 ids;
  - the live matrix and the old sheets carry them as quoted DATA keys, not identifiers;
  - the scope-selection route covers a pre-retirement file's migration.
- **The other gates now take the scoped form of each row:**
  - the combination gate's inner-curl triple uses a stored-design axis built through
    `migrateRoles`, and every declared magnitude reproduces;
  - the apex table's headroom witness reads the scope composition;
  - the tube's eligibility rows test the per-layer exclusion;
  - the grid gate has a scoped row;
  - the design-file gate saves and rebuilds a row's scopes;
  - three Node walkers pass a row's own scopes.
- **Retired sheets.** `shot-bloom-orchid`, `-zygomorphy` and `-per-petal` refuse with a stated
  reason and a worktree command. The retirement's own sheet is
  `node tools/shot-bloom-role-retirement.mjs <dir> --base <worktree of f95b244>` →
  `docs/img/role-retirement.png`.

## 6. The sheet

`docs/img/role-retirement.png` holds the (a) rows (the orchid at two whorls in step, three layers,
40 petals, on a hemisphere, ALL MAX, the curl bias), the iris on a spiral, and a FAN control.

- Each pair is one matrix row on two trees, face-on, print preview ON (`shownMode` asserted), the
  AFTER cell on the BEFORE cell's own camera.
- BEFORE is a real render of `f95b244` served from its own worktree. The sheet reads the role
  controls back off the base page and refuses if they were not written as asked; its first run drew
  the AFTER bloom in the BEFORE cell, because the harness had migrated against this tree's kinds.
- No pixel delta is quoted.

## 7. Open — Eva's to rule

1. **SPIRAL INNER (the one real (b) change).** INNER on a SPIRAL cannot be carried, because
   Scoping-b put per-layer values on RADIAL only. It is dropped and told, and the spiral iris loses
   its inner curl. The alternatives are to let per-layer values live on SPIRAL too (a change to
   Scoping-b's ruling) or to accept the drop.
2. **Q3.5 reaches the blade, not the ring.** An owned layer's blade drops the ramp, but footRing
   still places the ring and the foot with `layerSize`'s scale. A per-layer width therefore does not
   reach the foot. Under Per-layer values, `layerSize` / `layerTilt` are HIDDEN and still LIVE for:
   - every layer that owns nothing;
   - the ring placement of every layer.
   The alternatives are wiring footRing too (it moves rows a migration does not touch only if a
   design owns a size) or showing the two controls when no layer owns a base.
3. **An owned zero offset is kept, not pruned.** Writing 0 on a layer's size or tilt means "this
   layer is the global, not the ramp", which is not the same as no entry. The page keeps it; every
   other base prunes at 0.
4. **The orchid at one whorl and the RADIAL face are gone by ruling.** The sheet shows what that
   means on the shipped rows.

## 8. Not in CI, said so

- `verify-bloom-role-retirement.mjs` (needs a worktree) and the sheet run by hand.
- `verify-bloom-scope-panel-identity.mjs` (not in CI already) asserts panel identity with the
  toggles OFF against a base tree. Against `f95b244` that claim no longer holds by design, because
  the panel lost the role sections. Its role rows are quoted data now, and it was NOT run this
  session.
