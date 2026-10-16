# The role retirement — the role table retired into scoping

Feature map §11 Q3.4 and Q3.5, Eva's Oct 14 ruling on the RADIAL labellum and hood, and her two Oct 16
rulings on this PR (SPIRAL per-layer independence; the foot follows — §1b). The base is
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
  - INNER becomes an offset on every layer ≥ 2 with Per-layer values ON (RADIAL and, since Oct 16,
    SPIRAL), or on every pair of every layer ≥ 2 with Per-petal values ON (FAN).
- **The RADIAL labellum and hood are DROPPED, not migrated.** No scope is written and each id is
  told: *"DROPPED BY RULING (Oct 14): … a radial orchid is no longer reachable; per-petal values are
  FAN only"*.
- **Q3.5 is wired.** Under Per-layer values, a layer entry naming `petalLength`, `petalWidth` or
  `petalTilt` OWNS that base for its layer. Its blade is built from global + offset, and the
  ramp's term (layerSize's scale, layerTilt's tiltExtra) is left out for it. `layerSize` and
  `layerTilt` hide while Per-layer values is live (`{not: {ref: 'scopeLayersLive'}}`). Since Oct 16
  an owned width drives the foot and ring too (§1b).

## 1b. Eva's Oct 16 rulings, as built

**1. A SPIRAL's turns are layer scopes.**
- **What a turn is.** It is defined the way the spiral's own descriptor counts depth. SPIRAL takes
  footRing's RINGED arm, the same one as RADIAL. Slot `k` of the sequence sits on whorl
  `lambda = floor(k / petalCount)`, counted from the outside. So a turn is one whorl of
  `petalCount` petals on its own golden-angle run, and turn `k` is layer `k − 1`, the same index
  `scopeOffsetsFor` already reads (`d.lambda`).
- **No geometry branch was needed.** `SCOPE_LAYER_PLACEMENTS` (`['RADIAL', 'SPIRAL']`) is the one
  owner of where Per-layer values lives. The geometry's `scopeLayersLive`, the registry's predicate
  and the toggle's `visibleWhen` all read it. CONTINUOUS stays out (its "layer" is a turn of one
  continuous sequence, and the arm that builds it reads no ring index). SPIRAL has no mirror pairing,
  so Per-petal values stays FAN only.
- **The page.** The toggle shows on SPIRAL. The picker lists turns as `Turn k — the outer turn` /
  `… the innermost turn`. The read-out and status sentences say "turn" under SPIRAL.
- **INNER on a SPIRAL now migrates like RADIAL's**, onto every turn ≥ 2 with Per-layer values ON.
  The iris goes to `layers: [{layer: 1, offsets: {petalCup: 0.4, petalSpineCurl: 180}}]`.
- **Proved byte-identical.** Only one distinct SPIRAL set in the live matrix and all 70 frozen
  matrices carries an INNER value: `ZYGO: the iris x SPIRAL (roles exist, azimuth differs)`. It is
  the partition's MUST-HOLD class (h), and it holds in both modes against `f95b244` (§3). It is back
  in the live matrix as the standing witness. **Nothing is inexact.** SPIRAL INNER needs no list.

**2. Under per-layer independence, a layer's own size drives the WHOLE petal.**
- **The law** (footRing's ringed loop, `layerOwnedValues`). A layer whose entry owns `petalWidth`:
  - builds its foot as `ownWidth × 0.4 × footDelicacy`, clamped to `FOOT_MIN/MAX_WIDTH_MM`, in
    place of the ramp's `petalWidth × scale × 0.4 × footDelicacy`;
  - places its ring at `R0 × ownWidth / petalWidth` in place of `R0 × scale`. The ring is held at
    the rim (`min(1, …)`, so a ring never stands outside the hub) and that is told as
    `ringClamped`. Layer 0's ring is always `R0` (J2's identity).
  `ownWidth` is the clamped owned value, the same double the blade is built from.
- **Owned length and tilt move no foot and no ring, by construction.** The foot rows are flat and
  their length is the ring's overhang, which no length enters. The seam's turn already uses the
  owned tilt (Q3.5). So "size and tilt drive the whole petal" needs code only for the width.
- **What it moves beyond the owning layer: the area rule.** The hub radius `R0` is the area rule
  over every foot, so an owned width changes `R0`. Every other layer's ring moves with it, and its
  petals are carried out by a pure radial translation (measured, every blade point within 5e-15 mm
  of `dR × the radial unit`, normals identical). That is ruling 2 acting through the hub, not a
  leak, and SO12 asserts it in exactly those terms.
- **Only designs with per-layer independence on move.** The predeclaration from the BASE tree's
  rows: a row moves through (b) iff it carries Per-layer values ON with a layer entry owning
  `petalWidth`. **No base row does** (no stored row carried a layer scope before the retirement,
  and the migration writes only cup and curl offsets). So (b) is **0 stored rows**. The law's own
  rows are block 64, which is new.

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
- **The mover set is predeclared from the BASE tree's own footRing records and stored rows**,
  never from labels. Re-run after Eva's Oct 16 rulings, with the classes split as she asked:
  - (a) a RADIAL descriptor carries a slot role whose composed value or ring radius differs from the
    plain build — the drop;
  - (b) the foot-follows change — per-layer values ON under RADIAL or SPIRAL with a stored layer
    entry owning `petalWidth`;
  - (c) anything else: the FAN area-rule regrouping, ALL off the slider grid, and stored layer
    entries on a SPIRAL (inert on the base, live now);
  - (h) MUST HOLD — a SPIRAL descriptor whose INNER role moved a value: the iris.
- **Result: PASS** (`--merge … --expect a=33,b=0,c1=2,c2=0,c3=0,h=1`). 1,391 holders, 0 floats
  moved on any. 35 predicted movers, all 35 moved. The 1 must-hold set held to the bit.

| class | rows | what |
|---|---|---|
| (a) the RADIAL labellum / hood drop | **33** | every RADIAL slot-role row at 2+ whorls in step (the `SLOT:` block, the `ORCHID:` rows, `DOME: rise 1 x ORCHID`, `CURL: ORCHID x labellum curl x bias max`, `ALL PETALS: GATED — max x 3 layers x phase 0 x ORCHID`, `ORCHID x the IRIS`) |
| (b) the foot follows an owned width | **0** | no stored set — live or frozen — carries per-layer values with an owned width (the migration writes cup and curl only). The law's own rows are block 64, which is new and has no base to compare against |
| (c) the area rule regrouped per whorl | **2** | `FAN x PER-PETAL: petal 1 x 3 layers x inner*`, `FAN x PER-PETAL: ALL PER-PETAL MAX x 3 layers` |
| (c) ALL off the slider grid | 0 | predicted none, measured none |
| (c) stored layer entries on a SPIRAL | 0 | no base row stores one |
| **(h) MUST HOLD: SPIRAL INNER** | **1 held** | `ZYGO: the iris x SPIRAL (roles exist, azimuth differs)` — 0 of 885,312 export floats differ, live and export, `Object.is` |

**(c) explained:**

1. **The FAN area-rule rows move by one ULP.** The hub radius is
   `sqrt(Σ footCount · rFoot² / …)`.
   - On the base tree the sum ran one term per DESCRIPTOR, and a FAN split by per-petal groups had
     several descriptors per whorl.
   - It runs one term per whorl now, so the same numbers are added in a different order.
     `R0 6.189043600978178 → 6.189043600978177`.
   - Max |d| **7.1e-15 mm**, both modes, triangle counts unchanged (64,494).
   - Arithmetic, not geometry. The census and every gate read these rows at their recorded
     magnitudes (`FAN x PER-PETAL: ALL PER-PETAL MAX x 3 layers` 23,023 / 1.0987, unmoved).

**Superseded:** the first partition (before Oct 16) dropped SPIRAL INNER as a (b) mover with a
max |d| of 30.26 mm. Under ruling 1 it migrates and holds; the row is back in the live matrix.

**Where the rows are:**
- **62 rows left the live matrix (1,354 → 1,292), then block 64 added five (1,297).** They are:
  - **32 movers:** 32 of the 33 (a) rows (not the one kept, below). The SPIRAL iris left with
    them and came back on Oct 16, now a holder;
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
| phase10 | 2 (c) |
| phase11–phase13 | 18 (16 a, 2 c) |
| phase14–phase21 | 19 (17 a, 2 c) |
| phase22–phase69, and phase70 (the base's own live matrix) | 35 (33 a, 2 c) |

phase2–phase9 hold entirely. That is measured: the 35 moved sets are mapped back onto every base
matrix by their (set, capability, scopes) key. phase7–phase9 held only the SPIRAL iris, which holds
now.

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

**Added for the Oct 16 rulings:**
- **Z3** (both STL gates, every ringed row): each ring's foot width and radius restated from the
  controls and the row's `@scopes`, plus `ownWidth` and `ringClamped`.
- **SO13** in the scopes gate: foot and ring restated on RADIAL and SPIRAL at four layers.
  - SO2 runs on both placements.
  - SO7 has the iris and a three-turn SPIRAL.
  - SO12 is re-derived for `petalWidth`: the other layers' petals are carried by the hub's radial
    shift, exactly.
  - Four new mutants, all behaving: `per-layer-values-stay-radial-only` → SO2/SO7/SO13;
    `the-foot-keeps-the-ramp` → SO12/SO13; `the-ring-keeps-the-ramp` → SO13;
    `a-spiral-inner-is-dropped` → SO7.
- **Panel route (ag)**, three edits (header, block, the negative control's flags and banner,
  TWENTY-FOUR routes). It checks the toggle hidden under CONTINUOUS and shown on a SPIRAL, the picker
  naming Turn 1..3, a cup edit landing on its turn only, and a width edit's foot and ring restated. It
  has three mutants, all seen; the full negative control reads ALL TWENTY-FOUR ROUTES.
- **Matrix block 64** (five `PER-LAYER:` rows, smoke block 64). They export watertight, census-clean
  and one piece.
- **Their first export run DROPPED three of them, on instruments that did not know a layer can own
  its size:**
  - the crowding raster and both coverage instruments rebuilt `footRing` without the page's
    scopes;
  - VS2 restated length as nominal × ramp scale;
  - the material read-out quoted an unscoped ring.
  Each reads the scopes now (plan coverage's route), or restates ownership through
  `layerOwnsRestated`.

**From the first round:**

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

`docs/img/role-retirement.png` holds:
- the (a) rows: the orchid at two whorls in step, three layers, 40 petals, on a hemisphere, ALL MAX,
  the curl bias;
- **the iris on a SPIRAL as a MUST-HOLD pair.** The sheet compares its export floats across the two
  trees in Node and refuses if any moves: 0 of 885,312;
- three class-(b) pairs from block 64, each with its rings and feet printed before and after. The
  BEFORE cell is the base page given the same scope record, where the offset rides on the ramp and the
  foot and ring are the ramp's;
- a FAN control.

- Each pair is one matrix row on two trees, face-on, print preview ON (`shownMode` asserted), the
  AFTER cell on the BEFORE cell's own camera.
- BEFORE is a real render of `f95b244` served from its own worktree. The sheet reads the role
  controls back off the base page and refuses if they were not written as asked; its first run drew
  the AFTER bloom in the BEFORE cell, because the harness had migrated against this tree's kinds.
- No pixel delta is quoted.

## 7. Open — Eva's to rule

1. ~~**SPIRAL INNER.**~~ **RULED (Oct 16): Per-layer values reach SPIRAL and INNER migrates** (§1b).
   The spiral iris holds byte-identically.
2. ~~**Q3.5 reaches the blade, not the ring.**~~ **RULED (Oct 16): an owned width drives the foot and
   ring** (§1b). Under Per-layer values `layerSize` / `layerTilt` stay hidden. They still place every
   layer that owns nothing, which is what they did before the toggle, and the toggle's read-out says
   so.
3. **An owned zero offset is kept, not pruned.** Writing 0 on a layer's size or tilt means "this
   layer is the global, not the ramp", which is not the same as no entry. The page keeps it; every
   other base prunes at 0.
4. **The orchid at one whorl and the RADIAL face are gone by ruling.** The sheet shows what that
   means on the shipped rows.
5. **New, recorded rather than decided.** An owned width wider than the global would put that
   layer's ring OUTSIDE the hub's rim. The ring is held at the rim and told (`ringClamped`, Z3, and the block-64
   row `PER-LAYER: RADIAL x 4 layers — layer 4 asks a width past the outer whorl's`) rather than refused. The foot still takes the
   owned width.

## 8. Not in CI, said so

- `verify-bloom-role-retirement.mjs` (needs a worktree) and the sheet run by hand.
- `verify-bloom-scope-panel-identity.mjs` (not in CI already) asserts panel identity with the
  toggles OFF against a base tree. Against `f95b244` that claim no longer holds by design, because
  the panel lost the role sections. Its role rows are quoted data now, and it was NOT run this
  session.

## 9. What CI found on the first pushed head

The first push (`2a7c483`) ran two gates red. Both were in tools, not the geometry.

- **The off-station gate** called `petalStateFor`, which is retired. With no role table a petal's
  state is the state, so its seam clause builds the width profile from that directly.
- **The apex mutant table** had one anchor that no longer applied
  (`form-field-never-reaches-the-blade`, which still named the old resolver signature). It is
  re-pointed at the shipped line and drops only the FORM term. Run alone it fires FV2.
- **The edge-profile gate built every stored row without its `@scopes`.** Its `stateFor` accepts
  an unknown id rather than refusing it. So every migrated role row was measured as the plain
  bloom, and nothing said so. The declared E2 row `FAN x PER-PETAL: petal 1 extreme x toggle OFF`
  read 43.69° against its 48.20° record. That was the only visible symptom of a coverage hole over
  every migrated row it draws. It now skips the entry and builds with `H.rowScopesForBuild(row)`,
  and the row reads 48.20° again.
- **The same gap is OPEN in about twenty session-time Node tools that are not in CI.** The byte
  tools, `bloom-census-attribute` and `verify-bloom-build-order` are among them. They are not
  patched here. Each is correct on a row with no `@scopes` (every row the retirement did not
  migrate), and must be patched before it is trusted on one that has them.

## 10. What CI found on `51854f4`

The edge-profile gate draws its rows from the smoke subset, so block 64 reached it for the first
time in CI. **E2 fired on one row**: `PER-LAYER: RADIAL x 4 layers — layer 4 asks a width past the
outer whorl's`. The treatment adds **48.783426°** of turn within 2 mm of a rim, against the 45°
allowance.

- **It is the blade's, not the foot-follows change.** With the foot and ring put back on their
  pre-ruling law (a scratch copy), the row reads **48.783426° to six decimals**.
- **Where it is:** at u 0.973 on the INNERMOST ring. That ring's length is still ramped (0.373 x,
  about 13 mm) while its width is owned at 19 mm. Q3.5 drops the ramp only from the value a layer
  owns. The result is a short, wide blade closing on the apex nib, which is the nib class already
  declared (for example `APEX NIB: tip shape 3.00 x 20 mm`).
- **Controls**, measured in the same instrument:

  | state | worst added turn |
  |---|---|
  | the plain 4-layer bloom | 43.69° |
  | a global 19 mm width | 43.39° |
  | layer 3 owning the same +3 | 43.69° |
  | layer 4 owning +2 | 47.81° |
  | layer 4 owning +3 (the row) | 48.78° |

- **Declared, not widened.** The row is in `E2_TURN_XFAIL` at an excess of 3.783426°, with the
  mechanism in the note. Whether an owned width may outrun its layer's ramped length is the same
  question as §7.5, from the blade's side.
