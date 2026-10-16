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
  today's panel exactly. **[Oct 16, the role retirement: per-layer independence reaches SPIRAL too —
  a spiral's turn is its layer scope — and an owned width drives the foot and ring;
  `docs/bloom-role-retirement-outcome.md` §1b.]**
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
- `bloom-file.js`: `footDelicacy`, `scopeExclusionReason` and `scopeOffsetRefusal` (the one owner of
  why a control carries no offset, read by the reader and the page alike).
- `bloom.js`: the SCOPE VIEW block.
- `bloom.html` / `bloom.css`: the scope bar.
- Gates:
  - `tools/verify-bloom-scopes.mjs`: SO2–SO7 re-derived, SO10–SO12 new, eight new mutants
    (thirteen in all).
  - `tools/verify-bloom-panel.mjs`: route (ae) and eleven mutants; route (f) gains seven toggle
    rows.
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
    on top: the Shrink / Tilt step ramps (named by the registry's own labels) on any layer past the
    outer one, for a layer or a pair alike, and the form field.
- **Picking a scope** binds the panel to it. The scopeable controls then show the scope's
  EFFECTIVE values, and each carries a note: `Layer 2: whole bloom 0.00 + 0.60 offset = 0.60`.
  - The note says `(clamped from …)` where the clamp bit.
  - Every other petal control is marked "whole bloom" with the reason a scope cannot reach it.
    For sheet thickness that reason is "never scoped — it is the material (Q3.6)". The reasons are
    `scopeOffsetRefusal`'s, the same function the file reader words its refusals with (until the
    review they were two tables that already disagreed on four reasons).
  - Every OTHER control keeps the whole bloom's read-out: Foot delicacy and Sepal size are built from
    the global petal width and length, so they quote it under a pick (they once quoted the picked
    layer's).
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
    onto the scope's own canonical entry, cut at twelve significant digits. Where no other entry
    reaches the scope and a double exists that lands the build on the slider's own value, that
    double is written instead (the review's finding: the cut alone built 0.8999999999999999 for a
    slider at 0.90, §7).
  - An offset that returns to 0 is removed, an empty entry is removed, and an empty record becomes
    null. So editing a value back to the whole bloom's restores the shipped path exactly.
- **Deselect writes nothing.** The inputs get the global values back exactly as they were taken
  out.
- **A load and a Reset each end the pick before they write**, so a loaded design is read into the
  whole bloom and a Reset writes no offset (route (ae) checks both, each with a mutant).
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
8. **A petal entry names its pair by the canonical slot, matched exactly** (the review's major
   finding, §7). A member index, or a pair the fan no longer builds, is kept and inert.
   - *Rejected:* re-keying at the current count, which is what folded an outer pair onto an inner
     one when the count fell.
   - *Undo:* one comparison in `scopeOffsetsFor` and one in `commitScopeOffset`.
9. **A design saved before the toggles existed, loaded with a toggle live, is told** that its role
   values do not apply, with what to do. The toggle is not defaulted (rule 3).
   - *Undo:* the one note in `applyDesign`.

## 5. Measured

- **The matrix is unchanged.** `buildMatrix()` is 1,307 rows on both trees with the same sha256, so
  NO frozen phase is owed. The toggles are choices, so the blanket sweep does not add rows.
- **AND AFTER MERGING `main` (the sepal own-size session, #406, `037a4a8`)** the matrix is 1,316 on
  both trees (#406's block 61 appended nine rows) and this PR still adds none. #406 added two sepal
  sliders, so SO0 now reads **22** tier-scopeable sepal sliders (it derives the list; nothing is
  typed). What was re-measured on the merged tree, against a worktree of `037a4a8`:
  - **Bytes, toggles OFF, on the region the two changes share:** every row whose label names a sepal
    (block 35, block 61 and the sepal range and load rows) plus `DEFAULTS`, `ALL MAX` and `ALL MIN` —
    **92 rows in both modes, 0 floats moved** over 139,855,716 export floats and 1,338,324
    captured-grid values. This is a SUBSET, chosen as the rows #406 changes; the whole-matrix claim
    above is against `3e46d0b`. It was measured again on the FINAL tree (after the review's fixes,
    §7), where the merge's stricter check (§7) accepted it as a SUBSET, and read the same figures.
  - **Bytes, toggles OFF, on the rows the role resolver and the variance fields run on** (every
    ORCHID, ZYGO, FAN, PER-PETAL, SLOT, INNER, ALL PETALS, IRIS and VARIANCE row, and every row
    naming a labellum, hood, per-petal, ALL or INNER control), on the final tree against `037a4a8`:
    **287 rows in both modes, 0 floats moved** over 232,331,184 export floats and 9,593,870
    captured-grid values (1,100 panels). Also a SUBSET, and the merge says so.
  - **Why the whole matrix was not re-run after the review.** The review changed two things in
    `bloom-geometry.js`, and neither can reach an unscoped build:
    - `scopeOffsetsFor` is called only when a scopes object is handed in, and with empty lists it
      returns `null` exactly as before.
    - `tipCap.shapeN` is telemetry: no emitted float reads it (only A6, SP6 and the scope view do),
      and with no scope term `ps.petalTipShape` is `state.petalTipShape` (no role row reaches the
      tip shape, and a sepal ring's `state` IS its substate).
    That is an argument, so the two subsets above are the measurement of it on the regions those
    two things touch. They are a subset and are quoted as one.
  - **The panel identity tool:** PASS on all 13 states against `037a4a8`, run on the final tree.
  - The scopes gate (12 clauses), the design-file gate (14) and `bloom-smoke --check` (225 rows over
    57 blocks, 180 families) all pass, and so does the panel gate (below).
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
  - `--negative-control`: **13 of 13 mutants** each moved their witness on the mutated module and
    reddened exactly the clauses they name, in one run on the final tree (2,157 s), with all 13
    anchors matching exactly once.
  - The new mutants: `the-toggle-gate-is-removed` (SO7, SO10),
    `the-role-table-stays-live-under-a-toggle`, `all-petals-forget-the-toggles`,
    `the-groups-forget-per-petal`, `the-slot-roles-forget-per-layer` and
    `the-tube-ignores-per-layer` (SO11 each), and the review's two:
    `a-member-index-is-re-keyed` (SO3) and `unreached-entries-are-not-validated` (SO5).
    `a-petal-offset-leaks-to-every-petal` was re-anchored onto the canonical-slot match.
- **The panel gate** (`node tools/verify-bloom-panel.mjs`): **PASS, 431 checks (614 s) on the
  final tree**, with route (ae)'s per-layer, per-petal, around-the-pick and count-change walks and
  route (f)'s seven new toggle rows all agreeing.
  - Route (ae) carries **eleven mutants**. Its first four are a pick that stamps, an edit that lands
    on every scope, a deselect that drops the offsets and a split mirror pair. Seven are for the
    review's findings: a whole-bloom read-out quoting the scope, the twelve-digit cut, a load that
    keeps the pick, a Reset that writes an offset, a pre-toggle file not told, a missing
    `overrides` erasing the page's offsets, and a member index re-keyed at a lower count.
  - `--negative-control` on the final tree: **ALL TWENTY-FIVE ROUTES … OBSERVED THE FAILURE**,
    exit 0 (822 s), with all eleven of route (ae)'s flags required.
- **Also green before the merge:** the design-file gate (14 clauses), the drag-preview gate (10
  clauses), the export gate `--only` on 9 role rows (9 of 9), `bloom-smoke --check` (220 rows over
  56 blocks, 178 families) and the apex table's anchor pre-check (162 of 162). The design-file and
  drag-preview gates were run again on the final tree (14 and 10 clauses).

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
  `layerSize` / `layerTilt` ramps (SO6 measures it). The status line says so whenever the picked
  scope is on a layer past the outer one (the ramps leave the outer whorl alone).
- **Florets inherit the toggles but not the scopes.** Under a raceme, a floret built from the head's
  state with a toggle ON has its role table inert too, and takes no layer offsets. The head's
  scopes are the head's. Told here; the inflorescence owns the floret's state.
- **Scoping-a's stem-omission gap is unreachable now.** The omission probe builds unscoped petals,
  but it only runs on a SPHERE, which is CONTINUOUS. Neither toggle can be live there.
- **The infill's density-cap sweep runs on a ring's representative petal (slot 0) only.** A picked
  scope's Infill read-out quotes that scope's own petal record (achieved count, solid fraction),
  and it keeps doing so through a drag (it once jumped to layer 1's numbers while a slider was held).
  The cap tick and its dead-travel clause follow that record. Under a per-layer pick, each layer's
  slot-0 petal is a representative, so the tick is that layer's own. Under a per-petal pick, only
  the pair holding slot 0 has a tick; every other pair shows none. That is the sweep's scope, told
  here rather than faked with another petal's number. (The first version of this paragraph said "the
  cap tick is the representative petal's", which was false both ways.)
- **Click-to-pick on the canvas is not built.** That is the brief's later session.

## 7. The adversarial review, and what it changed

Before the merge, six reviewers read the diff, one dimension each: the scope view, the
geometry and registry, the gate clauses, the file format, panel visibility, and the docs' claims.
Three independent verifiers then tried to refute each finding, with a reproduction wherever one was
possible. There were 25 findings, three rated major.
- **The verification was stopped part-way, and that is said rather than rounded up.** This box ran
  two verifiers at a time and they were competing with the gates. 14 findings were verified: 11
  CONFIRMED (2 or 3 of 3 votes) and 3 REFUTED (0 of 3).
- The other 11 (the docs, panel-visibility and remaining gate-clause dimensions) were checked by
  reading the code and fixed or corrected on that reading. The ones that are behaviour carry a check
  of their own.
- Of the 3 refuted: the empty-entry finding is NOT changed (below). The load/Reset finding was right
  that no gate checked the guards, which is coverage rather than a defect, and the checks are added.
  The pre-toggle-file finding describes rule 3 working as ruled; an additive note telling its
  consequence is added and is a decision made without a ruling.

- **MAJOR — a stored pair folded onto another pair when the fan's count changed.** A petal entry was
  re-keyed through the pairing law at the CURRENT count. So "the pair four out" (slot 4 at nine
  petals) became the partner of slot 1 at five, and the inner pair built the outer pair's values.
  An edit to that inner pair then wrote a compensating offset that landed on it for good. A pick
  that survived the count change also kept stale thumbs, which is the scope-view half of the same
  defect.
  - **The rule now:** a petal entry names its pair by the CANONICAL slot, which is the pair's
    distance from the mirror plane and the same pair at every count. It is matched on that number
    EXACTLY: `scopeEntryNamesPair` in the geometry, read by the builder, the summary and the page.
  - **A DECISION MADE WITHOUT A RULING.** An entry naming a MEMBER index (the higher of a pair) is
    now kept and inert, where Scoping-a's SO3 said "naming the partner builds the identical bloom".
    That property IS the fold: index 4 is legitimately a member of the inner pair at five petals. So
    no rule can both accept member indices and survive a count change. The page only ever writes
    canonical slots.
  - Undo: one comparison in `scopeOffsetsFor` and one in `commitScopeOffset`.
  - Witnesses: SO3 (member inert; a stored outer pair inert at two a side and back at four, both
    mirrors), route (ae)'s count-change walk, and the mutant `a-member-index-is-re-keyed` in both
    gates.
- **MAJOR — whole-bloom read-outs quoted the picked scope.** Every control's read-out was handed the
  scope's effective state, so Foot delicacy and Sepal size printed the picked layer's width and
  length beside a note saying they are the whole bloom's. Now only the scopeable controls read the
  scope; route (ae) checks both read-outs, with a mutant.
- **The thickness refusal depended on a toggle.** An entry for a layer the bloom does not build
  skipped validation while per-layer was ON. Every entry is validated now (SO5 checks both toggles
  and both containers; mutant `unreached-entries-are-not-validated`).
- **The toggle read-out named a layer the bloom does not build** as "carrying its own values" and
  told the visitor to pick it. The summary now splits `scopedLayers` / `scopedPetals` (scopes this
  arrangement has) from `keptLayers` / `keptPetals`, and the read-out says the latter are kept.
- **Mid-drag, a picked scope's Infill read-out showed layer 1's plan.** It now keeps the scope's own
  last full plan through a drag.
- **The twelve-digit cut missed the slider's double in about a third of on-grid edits.** For
  example, global 1.70 and desired 0.90 built 0.8999999999999999, and the infill law has a
  `gamma === 1` branch. The written offset is now the one that lands the build on the slider's own
  double where one does; route (ae) checks it on that exact case, with a mutant.
- **The status line named a "Layer size" control** that the panel calls Shrink. It omitted the ramps
  for a pair picked on an inner layer, and claimed them for the outer layer. It now reads the
  registry's labels and says it for any layer past the outer one.
- **No gate checked that a load or a Reset ends the pick.** Without either guard, a load under a pick
  kept the old values and a Reset wrote an offset. Route (ae) checks both, each with a mutant.
- **A design saved before the toggles existed, loaded onto a page with one live,** applied its role
  values into hidden, inert controls with only two generic "missing" notes. That case is now told,
  with what to do (and not told when the toggle is off). The file is not defaulted: rule 3 stands.
- **A file with no `overrides` erased the page's offsets.** It now keeps them (rule 3), through the
  reader's `missing` list.
- **An entry left with no offset** (a Scoping-a `footDelicacy`-only entry) is kept, counted and
  re-saved. That is NOT changed. All three verifiers refuted it as pre-existing and deliberate: the
  reader keeps an all-refused entry as written, as it already does for a thickness-only one, and
  it draws nothing.
- **"The reader's own words" was false.** The page and the reader had two tables that disagreed on
  four reasons. They now share one function (`scopeOffsetRefusal`).
- **SO12's no-leak clause only looked at petals with no term,** so an offset leaking to every layer
  passed it (the fifth durable rule). SO2 checked the builder's own key (the fourth). And both SO2
  and route (ae) edited the MIDDLE of three layers, the fixed point of a reversed layer order. All
  three now read each petal's own whorl, and the edited layer is an end layer.
- **`--merge`'s all-hold path accepted chunks that compared nothing.** It now refuses a chunk that
  did fewer rows than its range or compared no floats. A chunk that selected rows (`--only`,
  `--rows`, `--from`) makes the merge a SUBSET, said so in the verdict. The full partition in §5
  re-merges clean under it.
- **`tipCap.shapeN` read the caller's state, not the petal's,** so under a scope A6 would have read
  the emitted apex against the whole bloom's exponent. It reads `ps` now (no byte; no role override
  touches the tip shape).
- **Docs:** CLAUDE.md's Scoping-a block and the model doc's §2, SO3, SO5 and migration-table
  sentences, which Scoping-b had made false, are annotated in place. So is this doc's own infill-cap
  paragraph (§6).

**The gates the fixes were checked against**, all on the final tree:
- the scopes gate, 12 clauses, with its negative control at **13 of 13**;
- the panel gate, 431 checks, with route (ae)'s eleven mutants, and its full negative control:
  all twenty-five routes observed the failure;
- the design-file gate (14) and the drag-preview gate (10);
- the panel identity tool against `037a4a8`, with its `--control` failing as it should;
- two byte subsets against `037a4a8` (92 sepal rows and 287 role and variance rows, 0 floats on
  each, §5);
- the smoke subset through the real export gate: **224 of 225 rows PASS, every one watertight,
  no validity block** (4,000 s). The 225th is `ALL MAX`, which overruns the harness's 30 s settle
  on this box. It does so on a worktree of `037a4a8` too (36 s against this tree's 38 s, the same
  `settleBuild` timeout), so it is the box and not the change, and CI is its gate.

The whole-matrix byte partition is the pre-review run against `3e46d0b`. §5 says why the review's
geometry changes cannot reach it and which rows measure that.

## 8. Where the gates ride, and why no workflow was edited

- **The scopes gate** is spawned by `tools/verify-bloom-design-file.mjs` (F6), which
  `bloom-panel.yml` runs.
- **The panel gate's route (ae)** is in `verify-bloom-panel.mjs`, which the same workflow runs.
- **Not in CI:** the panel-identity tool and the byte partition. Both take a worktree of the base
  commit; they are run at the close and quoted.
- **No file under `.github/workflows/` changed** (the brief). Editing one costs every frozen tag
  dispatched afterwards from an older base (CLAUDE.md, "WHEN A FROZEN TAG PUBLISHES").

## 9. Not done, by the brief

- Click-to-pick on the canvas.
- The retirement of the role table (Q3.4).
- The Q3.5 wiring.
- Tiers: still stored, validated and told, never applied.
- No matrix row and no frozen phase.
