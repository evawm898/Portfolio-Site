# Bloom — parameter scoping, session b: the selection view

**The brief, held to:** Eva's rulings for the selection view, built on Scoping-a's model
(`docs/bloom-scoping-model.md`, `3e46d0b`). Two toggles; a scope picker, list first (click-to-pick
on the canvas is a later session); the normal panel rebinds to the picked scope through Scoping-a's
own owners. The rulings, not re-litigated:

- **Select-and-edit.** Pick a layer (RADIAL) or a petal (FAN); the normal panel then edits just that
  scope. No instanced rows.
- **Per-scope values are OFFSETS on the global value**, ruled as a default.
- **Sheet thickness is never scoped.** It stays global and the panel says so while a scope is picked.
- **Orchid mirror pairs stay linked.** Selecting one petal selects the pair.
- **Per-layer independence is RADIAL only and per-petal is FAN only.** Each is a toggle, and off is
  today's panel exactly.
- **Selection LOADS a scope's values and never applies them, and deselecting writes nothing.** This
  is the /plot petal-ownership lesson.
- **Selection is view state and is not saved.** Offsets are saved, in Scoping-a's containers.
- **The slot roles, per-petal groups and ALL / INNER are NOT retired yet.** Where they and the new
  scopes would both reach one petal, the new toggle hides the old controls, so there is one owner
  on screen.

**Files:**

- `bloom-geometry.js`: THE TWO TOGGLES block beside `SCOPE_PAIRED_PLACEMENTS`; the toggle gate in
  `scopeOffsetsFor`; the role-table skip in `resolveRoleOverrides`; the four eligibility functions;
  `tubeEligible`; the builder's scopes summary.
- `bloom-registry.js`: the two controls, three predicates and the roles caption.
- `bloom-file.js`: `footDelicacy` and `scopeExclusionReason`.
- `bloom.js`: the SCOPE VIEW block.
- `bloom.html` / `bloom.css`: the scope bar.
- Gates:
  - `tools/verify-bloom-scopes.mjs`: SO2–SO7 re-derived, SO10–SO12 new, six new mutants.
  - `tools/verify-bloom-panel.mjs`: route (ae) and four mutants; route (f) gains seven toggle rows.
  - `tools/bloom-harness.mjs`: the two-statement checks.
  - `tools/verify-bloom-scope-panel-identity.mjs`: new.
  - `tools/verify-bloom-surface-bytes.mjs`: an all-hold merge.
- Sheet: `tools/shot-bloom-scopes.mjs` → `docs/img/scope-selection.png`.

---

## 1. What a visitor gets

- **Two rows in Arrangement.**
  - **Per-layer values** (`scopeLayers`) is shown under RADIAL.
  - **Per-petal values** (`scopePetals`) is shown under FAN.
  - Each is Off / On, defaults to Off, and is saved in the design file.
  - Its read-out names the scopes that carry their own values. It says "kept" while the toggle is
    off, because a record is never lost by switching off.
- **The scope bar** sits above the controls and is shown only while a toggle is live.
  - It holds a list: *Whole bloom*, then each layer (RADIAL) or each mirror PAIR (FAN, labelled
    "Petal k — <who it is>" in the per-petal groups' own words). Scopes with their own values are
    marked.
  - Below the list is a status line saying what is being edited. It also says what still applies
    on top: the `layerSize` / `layerTilt` ramps, and the form field.
- **Picking a scope** binds the panel to it. The scopeable controls then show the scope's
  EFFECTIVE values, and each carries a note: `Layer 2: whole bloom 0.00 + 0.60 offset = 0.60`.
  - The note says `(clamped from …)` where the clamp bit.
  - Every other petal control is marked "whole bloom" with the reason a scope cannot reach it.
    For sheet thickness that reason is "never scoped — it is the material (Q3.6)". The reasons are
    `scopeExclusionReason`, the file reader's own words.
- **Petal roles hides while a toggle is live.** Its caption says why, and says that the role values
  are kept and come back when the toggle is off.

## 2. The toggles, in the geometry (one owner each)

The toggles are registry choices: `SCOPE_TOGGLE_VALUES` = `['OFF', 'ON']`.

- **Why a choice.** A slider would join the blanket sweep and `ALL MAX`, and a choice adds no
  matrix row. The values must be saved because they decide what builds.
- **The predicates.** `scopeLayersLive`, `scopePetalsLive` and `scopesOwnRoles` are stated in the
  geometry and again in the registry under the same names. The harness checks the two agree at
  module load, over placement × depth × phase × both toggles × the fan's centre petal. Z5 checks
  them per row from the builder's metrics.

A live toggle does exactly three things.

1. **It lets the matching entries reach a petal.** The gate lives in `scopeOffsetsFor`, the one
   owner of which entries reach a petal, so the panel's displayed value and the builder cannot
   disagree.
   - With the toggle OFF, or ON under the wrong placement, the record is KEPT and INERT: it is
     validated and contributes nothing.
   - Sheet thickness still throws, live or kept.
2. **It makes the whole role table hidden AND inert.** That covers ALL, INNER, the labellum and
   hood, and the per-petal groups.
   - A layer scope reaches every petal of its layer and a pair scope reaches every petal of its
     pair, so every role row overlaps one. The rule "hide the old controls where both reach one
     petal" hides them all.
   - Inertness has two routes:
     - **The eligibility functions.** These stamp no ALL / slot / group role, so there is no split
       and no census.
     - **A blanket skip in `resolveRoleOverrides`.** INNER is stamped on every layer ≥ 1 whatever
       the toggle, because Z1 counts that stamp, so INNER can only go inert here.
   - Measured: the blanket skip alone keeps the geometry inert. Removing an eligibility function's
     toggle arm moves no float (`all-petals-forget-the-toggles` reddened nothing until SO11 read the
     STAMPS). So SO11's stamp clause and route (f)'s three-way agreement are that arm's witnesses.
3. **The tube is unavailable under per-layer** (`tubeEligible`).
   - The tube refuses the buckle, the fringe and the infill on the GLOBAL values. A layer offset on
     any of them would build under a tube that never saw it, and a registry predicate cannot read
     the scopes.
   - The two are therefore exclusive. The caption under Tube says why.

**Off is the identity by branch.** Every predicate is false on a state that never set a toggle,
because `undefined !== 'ON'`. Measured: §5.

## 3. The view (bloom.js, the SCOPE VIEW block)

- **Shadow globals.** While a scope is picked, `readUI()` returns the GLOBAL values of the
  scopeable controls from `scopeGlobals` and not from the inputs, which display the scope's values.
  - This means the build, the light build, the STL export, the save, `__bloomUIState` and every
    gate's read-back see the whole bloom. A selection is invisible to them, which is "selection is
    view state" made structural.
- **A pick loads.** `selectScope` binds, writes the effective values into the inputs' DISPLAY,
  relabels and re-marks. It rebuilds nothing and writes nothing to `scopes`.
  - The effective values come from the geometry's own owners: `scopeOffsetsFor` and
    `resolveRoleOverrides` with no roles, because the role table is inert under a live toggle.
  - The read-outs that print a built number (the buckle clamp, the lobes, the fringe ceiling, the
    infill count) are fed the picked scope's own petal record (`scopeShown`).
- **An edit lands on the picked scope only.** A capture listener on the panel runs before the
  control's own listeners, which then rebuild as always. A drag, a typed value and an arrow key all
  arrive as the control's own `input` / `change`.
  - The offset written is `desired − global − (every other entry already reaching this scope)`,
    onto the scope's own canonical entry, cut at twelve significant digits.
  - An offset that returns to 0 is removed, an empty entry is removed, and an empty record becomes
    null. So editing a value back to the whole bloom's restores the shipped path exactly.
- **Deselect writes nothing.** The inputs get the global values back exactly as they were taken
  out.
- **A pair is one scope.** The picker lists canonical slots (`petalGroupCount` / `scopeSlotKey`,
  footRing's own answers). A pick naming either member binds the pair (`canonicalScope`).
- **A pick that stops naming a scope ends, writing nothing.** This happens when the layer count
  falls, the fan loses a pair, or the toggle goes off.
- **Visibility.** For the scopeable controls it is decided on the scope's EFFECTIVE state.
  - For example, the curl family appears on a curled layer even when the global curl is 0.
  - Every other control is still decided on the whole bloom.
- **The hook** is `window.__bloomScopeView` (`options`, `select`, `deselect`, `bound`, `globals`,
  `effective`, `bar`). It calls the same two functions the picker calls and is never a second path.

## 4. Decisions made without a ruling (each named, each one place to undo)

1. **The toggles are saved registry choices, and OFF keeps a record inert, not deleted.**
   - *Rejected:* view chrome. It could not gate the geometry, and "off = today's" would then be
     false in a saved file.
   - *Rejected:* deleting the record on OFF, because that destroys the visitor's work.
   - *Undo:* the two registry rows.
2. **The WHOLE role table goes inert under a live toggle.** The ruling's "where both would reach
   one petal" is always true here (see §2.2).
   - *Undo:* `scopesOwnRoles` in the four eligibility functions and the resolver.
3. **Per-layer and the tube are exclusive.** *Undo:* one line in `tubeEligible` and its registry
   twin.
4. **Reset clears the scopes** as well as the controls, because Reset means "the shipped bloom".
   *Undo:* one line in the reset handler.
5. **`footDelicacy` is whole-whorl, not scopeable.** Measured: a layer offset on it moved 0 floats,
   because its only reader is `footRing()`, which reads the global (Q3.3, the foot is the whorl's).
   A scopeable control the panel would rebind to no effect is a panel that lies.
   - `SCOPEABLE_IDS` is now 33. It was 34.
   - SO12 asserts that every remaining id moves a scoped petal.
6. **The per-layer toggle shows at one layer too.** One layer is a legitimate scope (the whole
   whorl), so the row is not hidden by depth.
7. **Visibility of the scopeable controls is decided on the scope's effective state** (§3).

## 5. Measured

- **The matrix is unchanged.** `buildMatrix()` is 1,307 rows on both trees with the same sha256, so
  NO frozen phase is owed. The toggles are choices, so the blanket sweep does not add rows.
- **Byte identity with the toggles OFF.** `node tools/verify-bloom-surface-bytes.mjs --base
  <worktree of 3e46d0b>` was run in 36 `--range` chunks and closed with `--merge`. It reads **PASS:
  0 floats moved on all 1,307 rows in both modes**, positionally under `Object.is`.
  - That covers **1,594,298,592 export floats over 177,144,288 triangles**, and **84,145,484
    captured-grid values over 9,690 panels**.
  - No partition is declared: every row holds. The tool's `--merge` now closes an all-hold run
    (before this, its VACUOUS guard refused a merge with no predicate).
- **The panel with the toggles OFF.** `node tools/verify-bloom-scope-panel-identity.mjs --base
  <worktree of 3e46d0b>` passes on 13 states (the role-shape states and the common families).
  - What is compared: the whole `.bl-panel` serialised, every attribute, label and read-out span,
    every live input value, and the read-out with timings masked.
  - Each state is driven through the real controls on two servers.
  - It is identical but for the two toggle rows, the hidden scope bar and the hidden roles caption.
    That caption is excluded ONLY while it is hidden.
  - `--control` removes one ordinary control and the run fails on it.
- **The scopes gate** (`node tools/verify-bloom-scopes.mjs`): **PASS, 12 clauses in Node**, and
  13 with `--browser` (SO9, run by the design-file gate's F6).
  - `--negative-control`: **11 of 11 mutants** each moved their witness on the mutated module and
    reddened exactly the clauses they name. They ran as two subsets against the final gate (3 and
    8), with all 11 anchors matching exactly once.
  - The new mutants: `the-toggle-gate-is-removed` (SO7, SO10),
    `the-role-table-stays-live-under-a-toggle`, `all-petals-forget-the-toggles`,
    `the-groups-forget-per-petal`, `the-slot-roles-forget-per-layer` and
    `the-tube-ignores-per-layer` (SO11 each).
- **The panel gate** (`node tools/verify-bloom-panel.mjs`): **PASS**, with route (ae)'s per-layer
  and per-petal walks and route (f)'s seven new toggle rows all agreeing.
  - `--negative-control`: **ALL TWENTY-FIVE ROUTES … OBSERVED THE FAILURE**, exit 0. Route (ae)'s
    four mutants are a pick that stamps, an edit that lands on every scope, a deselect that drops
    the offsets and a split mirror pair.
- **Also green:** the design-file gate (14 clauses), the drag-preview gate (10 clauses), the export
  gate `--only` on 9 role rows (9 of 9), `bloom-smoke --check` (220 rows over 56 blocks, 178
  families) and the apex table's anchor pre-check (162 of 162).

## 6. Findings, for Eva

- **The RADIAL labellum and hood are UNREPRESENTABLE as scopes under the rulings.** Per-petal is FAN
  only, so a RADIAL petal entry is inert even with the per-petal toggle ON. Measured: it builds
  bit-identically to no entry and every term is null. A layer entry reaches every petal of its
  layer.
  - Scoping-a's migration table (§4 of the model doc) mapped the labellum and hood onto petal
    entries, which is now unreachable.
  - The retirement session (Q3.4) inherits a choice: keep those two roles, lift "per-petal is FAN
    only" for orchid rosettes, or retire them without a migration.
  - The roles are NOT retired here. They hide while per-layer is on and work as before while it is
    off.
- **Q3.5 is still expressed, not wired.** A layer's length, width and tilt offsets add on top of the
  `layerSize` / `layerTilt` ramps (SO6 measures it). The status line says so whenever a layer is
  picked at two or more layers.
- **Florets inherit the toggles but not the scopes.** Under a raceme, a floret built from the head's
  state with a toggle ON has its role table inert too, and takes no layer offsets. The head's
  scopes are the head's. Told here; the inflorescence owns the floret's state.
- **Scoping-a's stem-omission gap is unreachable now.** The omission probe builds unscoped petals,
  but it only runs on a SPHERE, which is CONTINUOUS. Neither toggle can be live there.
- **The infill's density-cap sweep is still representative-only.** A picked scope's Infill read-out
  quotes that scope's own petal record (achieved count, solid fraction). The cap tick is the
  representative petal's.
- **Click-to-pick on the canvas is not built.** That is the brief's later session.

## 7. Where the gates ride, and why no workflow was edited

- **The scopes gate** is spawned by `tools/verify-bloom-design-file.mjs` (F6), which
  `bloom-panel.yml` runs.
- **The panel gate's route (ae)** is in `verify-bloom-panel.mjs`, which the same workflow runs.
- **Not in CI:** the panel-identity tool and the byte partition. Both take a worktree of the base
  commit; they are run at the close and quoted.
- **No file under `.github/workflows/` changed** (the brief). Editing one costs every frozen tag
  dispatched afterwards from an older base (CLAUDE.md, "WHEN A FROZEN TAG PUBLISHES").

## 8. Not done, by the brief

- Click-to-pick on the canvas.
- The retirement of the role table (Q3.4).
- The Q3.5 wiring.
- Tiers: still stored, validated and told, never applied.
- No matrix row and no frozen phase.
