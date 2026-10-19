# The petal outline under scoping, and the FAN pairs as mirror images — F6-scope

*Session of Oct 18. Eva's rulings for this session, verbatim in substance: scoping is global → layer
→ petal; per-layer applies on RADIAL and SPIRAL, per-petal on FAN only; selection loads values and
never applies them; sheet thickness is never scoped; **the outline mode (LAW / CURVE), the
Symmetric / Asymmetric toggle and the curve(s) are all scopable**; **a FAN mirror pair's two petals
are MIRROR IMAGES** — the partner's outline is the selected petal's with its left and right halves
swapped; pairs stay linked (editing either edits both, re-link takes the selected petal), so a
symmetric outline on a pair is unchanged; Petal width keeps scaling the curve (#418), as an offset at
each scope. Petals only — sepals and leaves get outline and spine curves in the next session.
Read `docs/bloom-scoping-selection.md`, `docs/bloom-role-retirement-outcome.md` and the three outline
outcome docs (`docs/bloom-outline-curve-outcome.md`, `-2-outcome.md`, `-asym-outcome.md`) first.*

## 1. The model: a scope OWNS outline values; it does not offset them

Every other scopable control is a DELTA on the global (Q3.2): a scope entry's `offsets` are added to
the whole bloom's value and clamped once. An outline mode is a CHOICE and a curve is a point list —
neither has a meaningful sum — so a scope entry gains a second field beside `offsets`:

```
overrides.layers [{ layer, offsets, values }]      overrides.petals [{ layer, slot, offsets, values }]
values: { petalOutlineMode?: 'LAW' | 'CURVE', petalOutlineCurve?: <curve> }
```

`SCOPE_VALUE_IDS` (`bloom-geometry.js`) is the ONE list of ids a scope may own as a value — exactly the
two outline controls; `checkScopeValues` refuses anything else by name (sheet thickness among them,
Q3.6). The Symmetric / Asymmetric toggle is not a third id: it is the curve value's own `mode`
(`symmetric` / `two-sided`, `bloom-curve.js`'s shape, unchanged), so owning a curve owns its
sidedness.

**THREE PLACEMENTS MADE WITHOUT A RULING (Eva's brief said "my call"; reported as placements):**

1. **A scope with its own curve REPLACES the inherited curve outright** — no blend, no per-point
   offset. The same for the mode.
2. **A scope without its own value inherits its parent's LIVE** — the global's, or under a petal entry
   the layer's (layer values, then petal values, in `scopeOffsetsFor`). Nothing is copied at pick
   time, so an edit to the whole bloom's curve reaches every scope that does not own one. Panel route
   (ah) asserts this, and its mutant `an inherited curve is frozen at copy time` is the witness.
3. **"Outline: reset to inherited"** sits in the scope bar, shown iff the picked scope owns an outline
   value; it deletes the entry's `values`, prunes an entry left empty, and rebinds the panel so the
   editor shows the inherited outline at once.

Two consequences follow, both placements and both stated in the page's notes:

- **An edit that lands on the inherited value is not an ownership.** `commitScopeValue` prunes a value
  equal to what the scope would inherit (`inheritedOutlineValue`), so picking a layer and setting the
  mode to what it already draws stores nothing — the scope stays inherited and live.
- **Dragging an inherited curve makes it OWNED at the picked scope** (the brief's requirement): the
  first edit writes `own.values.petalOutlineCurve` and the note flips from `INHERITED from the whole
  bloom, live` to `its OWN outline curve`.

The effective petal state is now **global → scope offsets → scope values → variance → one clamp**:
`petalSurface` resolves `ps` as before and then applies `resolvePetalOutline(ps, values, mirrored)`,
the ONE place a petal's (mode, symmetry, halves) is decided. `widthProfile` reads `ps` and stays the
one outline owner; NU's row count (`outlineIsCurve(ps)`), the lobes' and fringe's eligibility (both
read inside `widthProfile`, on `ps`), the tube's curve arm and the infill's plan all read `ps`, so a
LAW layer cuts its lobes beside a CURVE layer that stands them down (matrix row `SCOPED OUTLINE: a
LAW layer with lobes beside a CURVE layer`).

**Empty values are the identity BY BRANCH**: `scopeTerm.values` exists only when some live entry owns
one, and a slot with no values and no mirror takes the old call (`outlineRes` null, `ps` the object it
was). The byte partition (§5) measures that.

## 2. The FAN mirror

`fanSlotMirrored(slotIndex, slotCount, state)` is the ONE owner: on FAN, the member that is not its
pair's canonical slot (`scopeSlotKey`, the slot nearest the mirror plane's own numbering) draws the
pair's outline with `points` and `right` swapped (`mirrorOutlineCurve`). A symmetric curve and the LAW
are unchanged by construction, so a FAN of symmetric petals is byte-identical (§5). RADIAL and SPIRAL
keep the pinwheel (every petal the same hand — F6-asym §1, unchanged); a mirror-line petal is its own
pair and is never mirrored; on a fan THROUGH THE GAP every pair is mirrored.

`buildBloomInto` sets `slot.fanMirrored` from the helper, and so do the two instruments that re-emit a
whorl (`tools/bloom-plan-coverage.mjs`, `tools/bloom-solid-angle-coverage.mjs`) — **they did not at
first, and the export gate's coverage R1 caught it** on `SCOPED OUTLINE: FAN orchid x 2 layers x
infill`: the re-emitted fan planned its infill on un-mirrored partners and counted 95,466 petal
triangles against the bloom's 94,836. Giving the decision one owner, read by all three, is the fix.

**Pairs stay linked**: a petal entry names its pair by the canonical slot exactly (Scoping-b's
`scopeEntryNamesPair`), so an owned value reaches both members and the mirror is applied downstream.
The editor under a pair pick shows the CANONICAL member's outline unmirrored (a placement: the
editor's upper curve is LEFT of the canonical petal), and the note says the partner draws it mirrored.

## 3. Every caller of the global curve, and where it reads now

| caller | before | now |
|---|---|---|
| `petalSurface` / `widthProfile` / NU / lobes / fringe / tube arm / infill | `ps` (offsets only) | `ps` with `resolvePetalOutline` applied |
| the petal record (`outlineMode`, `outlineCurve`, `outlineFrom`, `outlineMirrored`) | — | new, read by the page and OC5 |
| the sepal scan's congruence key | (state, ring) | + the petal's owned values and mirror flag |
| `scopesBuilt` (the read-out's census) | offsets | + `petalsOutlineOwned`, `petalsOutlineMirrored` |
| bloom.js `curveValidatorCtx` / `onWidthEdit` (the editor's validator and the width refusal) | every built petal against the global curve | only the petals the edit REACHES (`outlineEditReaches`: under a pick its scope; with none, the petals no scope owns a curve for), grouped by their own curve |
| bloom.js read-out `OUTLINE` lines | global | per curve group, plus `OUTLINE BY SCOPE: … owns its …; … FAN partners draw … MIRRORED` |
| bloom.js scope view (`scopeEffective`, `bindScope`, `onScopedEdit`, notes) | offsets | owned / inherited values, the reset |
| bloom-file.js `composeDoc` / `readScopeEntry` | offsets | + `values` through `FIELD_KINDS` |
| harness FR2 (asked terminal), C1 (curve drawn length), A2 (`outlineCurveOn`), OC0-OC4 / AN (`ctlRaw`, the curve mode), the lobe/fringe OC0 gate | the global controls | `outlineRestated` per ring / per representative petal — RESTATED from the controls and the row's own `@scopes`, never the geometry's resolver |
| the plan raster and the solid-angle census (re-emitted whorls) | — | `fanSlotMirrored` |
| `verify-bloom-surface-bytes.mjs` | — | `--movers-predicate scope-outline` |
| `bloom-census-attribute.mjs` | built scoped rows WITHOUT their scopes | skips `@scopes` and hands the build `rowScopesForBuild(row)` (one of the "not yet patched" tools CLAUDE.md names) |

Untouched and deliberately so: the registry's panel predicates (`fringeEngaged` / `lobesEligible` /
the tapers' visibility) read the GLOBAL mode, because the panel shows the global's controls; under a
pick the outline controls show the scope's effective values. Sepals and leaves stay pinned LAW
(`sepalBladeState`, `leafBladeState`) — Q6.7 is the next session.

## 4. The gates

- **OC0-OC4 and AN run per ring against the ring's OWN outline**, restated in the harness from the
  controls and the row's scopes (`outlineRestated`, `ringOutlineRestated`, `repOutlineRestated`) —
  an owner the geometry's resolver does not write.
- **OC5 is new and per PETAL** (`petalAllOutline`): (a) every petal's mode against the restated one;
  (b) its sidedness and points per side, and the mirrored flag; (c) on a FAN, the partner's emitted
  half-widths equal the canonical member's with the halves swapped, EXACTLY, on identical stations. It
  refuses an empty census.
- **Apex mutant table: five witnessed mutants** — `a-scoped-outline-is-ignored` (fires AN1, AN2, C1,
  OC0, OC5), `a-scoped-outline-leaks-to-sibling-layers` and `-to-sibling-pairs` (OC0, OC5),
  `the-fan-partner-is-not-mirrored` (OC5), `the-radial-partner-is-mirrored` (OC5); each witness reads
  the MUTATED module's own built petals. Run as `--only=<the five> --rows='^a scoped outline'`: all
  five ok, the clean tree silent on the four rows. **The table found a crash in my own OC arm first**:
  under the layer-leak mutant a ring's cap is two-sided while its restated outline is symmetric, and the
  per-half restatement dereferenced a half that does not exist. The ring now reports OC0 and stops.
  **The refactor to `fanSlotMirrored` and `let ps` disarmed three anchors** (the two FAN mutants and the
  pre-existing `form-field-never-reaches-the-blade`); the anchor pre-check said so before any mutant ran,
  and all three are re-anchored.
- **Panel route (ah)**, RADIAL x 2 with per-layer values ON: a pick writes nothing and says INHERITED;
  the mode set on layer 2 is its own while layer 1 stays LAW; deselected, the whole bloom's curve edit
  reaches layer 2 live; picked, a curve edit is owned; the reset returns it. Three bloom.js mutants —
  `a pick applies the scope outline`, `the reset leaves the owned curve`, `an inherited curve is frozen
  at copy time` — each a flag the negative control requires (TWENTY-FIVE routes).
- **Design file F13**: per-scope values round trip; a #420-shaped file (no `values`) loads clean; bad
  values are told; a tier's values are told `not applied`. Two mutants (`scope-values-are-not-written`
  / `-read`); `the-curve-kind-is-not-written` now also breaks F13.

The brief's seven mutants map: scoped curve ignored → apex; leaking to a sibling layer / petal →
apex (two); partner not mirrored / mirrored on RADIAL → apex (two); reset leaving the owned curve,
selection applying values, inherited curve frozen at copy time → panel route (ah).

## 5. Matrix, census and bytes

- **Block 68, fifteen rows** (1359 → 1374): the mixed flower (RADIAL x 3: LAW / owned spoon / owned
  lopsided two-sided) bare, x infill and x cup 0.6; RADIAL inner drawn / outer LAW; SPIRAL with two
  turns on two curves; a layer owning only its mode (inheriting the stored spoon); a layer owning a
  curve and a width offset; a LAW layer with lobes beside a CURVE layer; three FAN pair rows; the FAN
  orchid x 2 layers x infill; FAN through the gap; two GATED rows. Block 67's FAN row is relabelled
  (`… a mirror pair is a mirror image …`) because its geometry now means that. **Smoke block 68**, six
  rows, `--conn`. `frozen/phase74` is the 1,359 rows at `f63235e`, registered in both maps and
  `--verify-frozen` PASS.
- **The export gate over block 68 and the FAN/asym rows: PASS** (every row watertight, OC0-OC5
  silent). **One new within-shell contact, and it is not the scoping's**: `SCOPED OUTLINE: the mixed
  flower x the Voronoi infill` reads **1 pair, span 0.0000 mm**, a root-blend tangency (u 0.107) on a
  layer-3 petal at the infill's basal seam. The same flower UNSCOPED reads **736 pairs / 0.4240 mm**
  with every layer on the LAW and **321 / 0.2400** with every layer on the lopsided curve (all spoon:
  0), measured in Node, EXPORT — **infill on three RADIAL whorls folds whatever outline they carry, and
  no matrix row held that product** (`INFILL: x 40 petals x 3 whorls` is the nearest declared row).
  Declared in `SELF_INTERSECTION_XFAIL` at 1 / 0.0000 with both controls in its note, confirmed in the
  browser (X1 "still failing at that magnitude"). A span-0 count is a knife edge. **No other block-68
  row reads a within-shell pair.**
- **The byte partition: PASS** — `node tools/verify-bloom-surface-bytes.mjs --base <worktree of
  f63235e> --movers-predicate scope-outline`, the whole 1,374-row matrix in both modes in twelve
  `--range` chunks closed by `--merge`: **14 of 14 predeclared movers moved and 0 floats moved on the
  1,360 holders**, positionally under `Object.is`, over **1,651,410,648 export floats / 183,490,072
  triangles and 80,351,456 captured-grid values**; `--control` fires on a 1e-9 perturbation. The
  predicate decides a mover from the harness's RESTATED outline against the whole bloom's (the base
  tree has no owned values and no mirror, so it cannot itself say which rows engage them); the 14 are
  the thirteen block-68 rows that build an owned or mirrored outline and block 67's FAN row, and both
  GATED rows hold. **Every global-only row moves 0 floats**, the shipping default included.

## 6. Cost

Zero triangles at the default (24,688, `main`'s count) and on every global-only row: the outline
arms are boundary changes on a fixed lattice. A FAN partner of an asymmetric curve costs exactly its
canonical member's triangles (the mirror swaps halves, never rows). Infilled rows move with the outline
each petal carries, as every infilled row has since F6-sym.

## 7. Measured

- Byte partition: 14 moved / 1,360 held, 0 floats on the holders (§5).
- Export gate over block 68 and the FAN / asym rows: every row watertight; one declared span-0
  tangency (§5); OC0-OC5 silent.
- Apex table subset (five new mutants on the four scoped-outline rows): 5 of 5 fire their named
  family, the clean tree silent.
- Panel gate PASS with route (ah); scopes gate PASS (13 clauses, SO8 over 1,374 rows); design file
  `--no-browser` PASS with F13; `bloom-smoke --check` OK (268 rows over 64 blocks, 187 families);
  `--verify-frozen --phase74` PASS.
- Triangles: the default 24,688 (unchanged); the sheet's cells 21,626 (the FAN orchid, both trees
  alike — the mirror moves no row), 49,184 (RADIAL and SPIRAL, two layers), 184,816 (the mixed
  flower x infill), 95,028 (the FAN orchid x 2 layers x infill).

## 8. Not done, and named

- Sepals and leaves: outline and spine curves (the next session, by the brief).
- Tiers (sepal tier scopes) carry no outline values — a tier's `values` are told `not applied`.
- The panel's lobe / fringe / taper VISIBILITY follows the global mode, not the picked scope's.
- The RADIAL 3-whorl infill fold (736 pairs at the shipping LAW) has no matrix row of its own.
