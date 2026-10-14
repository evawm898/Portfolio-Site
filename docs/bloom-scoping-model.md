# Bloom — parameter scoping, session a: the state model

**Scope of this session (the brief, held to):** the MODEL only. Zero new controls, zero matrix
rows, zero bytes moved on any row of the live matrix. Everything below is reachable through the
design file's `overrides` containers and through one page hook no control reaches, and is
measured by one gate. The feature map's §3 and §11 (Eva's Oct 12 rulings Q3.1–Q3.9) govern; this
doc records what the rulings became in code, what was measured, and what the next sessions
(panel chrome, F4 on RADIAL, F2 on FAN, the retirement) inherit.

Files: `bloom-geometry.js` (the PARAMETER SCOPING block beside `OVERRIDE_BOUNDS`, the resolver,
`petalSurface`, `buildBloomBody`), `bloom-file.js` (the containers' real shape, `scopesForBuild`),
`bloom.js` (the `scopes` record, `__bloomScopes`, the metrics), `tools/verify-bloom-scopes.mjs`
(SO0–SO9), `tools/verify-bloom-design-file.mjs` (F4's fixture, and F6 spawning the scopes gate).

---

## 1. The shape — one owner, the design file's own containers

```
scopes = {
  layers: [ { layer: k,          offsets: { <controlId>: <delta>, ... } } ],
  petals: [ { layer: k, slot: i, offsets: { ... } } ],     // CONTINUOUS: k is the TURN, i the slot within it
  tiers:  [ { tier: t,           offsets: { ... } } ],     // stored, validated, NOT applied — no tier is built yet
  bounds: { <controlId>: { min, max } },                   // the registry's ranges, handed down (geometry side only)
}
```

- The three lists ARE the design file's `overrides.layers / petals / tiers` (the containers the
  design-file session wrote empty for exactly this). The file holds no `bounds`; `scopesForBuild()`
  in bloom-file.js adds them from the registry at build time, because `bloom-geometry.js` cannot
  import the registry and must clamp a base the role table does not reach.
- An offset is a DELTA on the global value (Q3.2, a DEFAULT ruled as a default — recorded as such).
  Nothing is a multiplier. The one semantic consequence is in §4.
- **Which controls may carry an offset** (`SCOPEABLE_IDS`, 34 at this session; **33 since Scoping-b**,
  which measured `footDelicacy` moving 0 floats under a scope and moved it to `SCOPE_WHORL_LEVEL` —
  `docs/bloom-scoping-selection.md` §4): the registry's PETAL-role sliders
  less three named sets, each with its reason — `sheetThickness` (never scoped, Q3.6, the
  geometry's own `SCOPE_UNSCOPED`); the ROLE_OVERRIDES delta controls (`allCurl`, `innerCup`,
  `labellumSize`, `petal3Tilt` … — they ARE the scoping this model replaces, Q3.4 retires them, and
  an offset on a delta is a scope on a scope); and `SCOPE_WHORL_LEVEL` (`petalCount`, the seven
  `tube*` rows — whorl values the registry files under the petal role). A tier's keys are the
  SEPAL-role sliders less `sepalCount` (`SCOPEABLE_TIER_IDS`, 20; Q1.1 — each tier owns the full
  sepal set). SO0 restates both derivations from the registry and the role table.

## 2. The law and where it is resolved

A petal's effective state is

```
global  ->  the role table (today's ALL / INNER / slot / per-petal rows)
        ->  + its layer's offsets                        (scope: layer k)
        ->  + its own petal's offsets                    (scope: petal (k, i) — one scope per MIRROR PAIR)
        ->  + the variance field's slot term, headroom-scaled
        ->  the ONE clamp into the base control's own range
```

resolved in `resolveRoleOverrides` — the scope term is a FOURTH STAGE of the composition that
function already owns, not a second resolver. `scopeOffsetsFor(scopes, {layer, slot, n, state})`
is the one owner of "which entries reach this petal" (the pairing law included) and returns the
SUMMED `{ base: delta }` term, or null; `buildBloomBody` writes it onto the slot payload as
`slot.scopeTerm` exactly as the whorl primitive writes `formTerm`; `petalSurface` branches on it
and calls `petalStateForSlot(…, scopeTerm)`.

- **A mirror pair is one scope (Q3.7).** Under RADIAL and FAN (the placements with a plane,
  `mirrorFor`) an entry naming slot i reaches i and `mirrorPartner(i)`; both are keyed on the
  pair's canonical slot `min(i, partner)` — `petalRoleForSlot`'s own key. SPIRAL and CONTINUOUS
  have no plane, so a slot is its own scope. Two entries for one pair SUM.
  > **Scoping-b changed both halves of this.** (1) An entry reaches a petal only under its toggle:
  > a layer entry under RADIAL with `scopeLayers` ON, a petal entry under FAN with `scopePetals` ON;
  > every other entry is kept and inert. (2) A petal entry is matched on the pair's CANONICAL slot
  > EXACTLY and is never re-keyed through `mirrorPartner` at the current count: a member index, or a
  > pair the fan no longer builds, is inert. Re-keying is what folded an outer pair's values onto an
  > inner one when Petals per side fell (`docs/bloom-scoping-selection.md` §7). So "naming slot 7
  > builds the identical bloom" below is no longer true: naming a member index is inert.
- **Offsets go in BEFORE the clamp** and the clamp is the existing one: `composedBoundsOf(base)`
  for the role bases, `scopes.bounds[base]` for every other scopeable base, a THROW if neither.
- **Sheet thickness is never scoped (Q3.6)**: the reader refuses the key by name with a note and
  keeps the rest of the entry; the geometry THROWS on a scopes object carrying it.
- **Empty scopes are the identity by branch**: `scopesForBuild` returns null for empty lists;
  `scopeOffsetsFor` returns null when nothing reaches a slot; with `scopeTerm === null`
  `petalSurface` takes the call it has always taken (`petalStateFor`, which returns the caller's
  own state object). The shipped path forms no sum and no clamp.

## 3. Measured (`node tools/verify-bloom-scopes.mjs`, SO0–SO9)

| clause | what it measured |
|---|---|
| SO1 | 12 named rows × 2 modes (`--smoke` / `--full` widen it): **10,087,416 floats identical under `Object.is`** between a build with no scopes and one with empty containers; every petal `scopeTerm: null`. |
| SO2 | 3 layers × 8: a layer-1 cup offset of +0.4 moves exactly the 8 layer-1 petals by exactly 0.4 (`applied`) and holds the other 16 bit-identical (captured lamina). |
| SO3 | RADIAL 8: slot 1 and slot 7 move, nothing else; naming slot 7 builds the identical bloom. FAN through-slot and through-gap: slot 1 and its own partner. SPIRAL, CONTINUOUS: slot 1 alone. **[Scoping-b: SO3 now runs on FAN only, where a petal entry is live. Naming the member index is inert, and a stored outer pair is inert at a smaller count and returns at its own.]** |
| SO4 | cup 0 + 5 lands ON 1.2 (the range end), never past it; a labellum reads base + role 0.5 + offset 0.3 then one clamp; under `varianceForm` 1 every composed value is inside its base's range (headroom reads the offset base). |
| SO5 | the reader refuses a thickness offset by name and keeps the entry; the geometry throws; offsetting all 34 scopeable controls at one step leaves every ring's thickness what it was. **[Scoping-b: 33 scopeable, since `footDelicacy` is whole-whorl. The geometry throws on every entry whether or not it reaches a petal, toggles ON and OFF.]** |
| SO6 | Q3.5 as it stands: a layer tilt offset is ADDED on top of the `layerTilt` ramp — `tiltExtra` unchanged on every slot (see §5). |
| SO7 | today's roles, rebuilt as scopes: see §4. |
| SO8 | 1,302 live rows round-trip a two-layer / two-petal / one-tier record with no note but the tier's; every written-down refusal fires by name. |
| SO9 | (browser) `__bloomScopes` sets a record the build carries (8 of 8 petals scoped), the page's save writes it, a load of that save restores the same record and the SAME STL bytes, a plain file clears it. |

Negative control: five mutants of `bloom-geometry.js`, each with a WITNESS (a direct call on the
mutated module, asked before the clauses) — `offsets-are-ignored`, `a-petal-offset-leaks-to-every-petal`,
`a-mirror-pair-is-split`, `offsets-are-applied-after-the-clamp`, `thickness-is-scoped` — all five
move their witness and redden exactly the clauses they name. Two claim corrections came out of the
first sweep and neither loosened a check: ignoring offsets leaves SO5 green (correct — the
thickness is unchanged), and SO7's first version read the pairing off the module under test, so the
mirror-split mutant handed it one entry per pair member and passed; the pairing is RESTATED in the
gate now (the L7 lesson, one family later).

## 4. The migration table — today's roles as scopes (measured, SO7)

> **Scoping-b changed what this table can reach.** Eva's rulings put per-layer values on RADIAL only
> and per-petal values on FAN only, each behind a toggle, so a petal entry is live on a FAN alone.
> **Scoping-b: the table below is the Scoping-a measurement, and three of its rows changed under
> the toggles.** SO7 now builds each row through the toggle that makes its entries live, and measures:
> - **ALL and INNER on RADIAL** map to layer entries as written, exact.
> - **ALL and INNER on a FAN** do NOT map to layer entries: a layer entry is inert on a FAN. ALL
>   becomes a petal entry on EVERY pair of its layer (4 entries, 7 of 7 petals exact). INNER becomes
>   every pair of each layer ≥ 1 (4 entries on 2 layers, 14 of 14 exact).
> - **The RADIAL labellum and hood are UNREPRESENTABLE**: a RADIAL petal entry is inert even with
>   per-petal ON (measured, bit-identical to none), and a layer entry reaches its whole layer.
> - **The `mul` row** is measured on `petal2Size` on a FAN, since the labellum is unrepresentable.
>
> That choice is the retirement session's (Q3.4) — `docs/bloom-scoping-selection.md` §6.

Every row below was built through its role controls and again through the equivalent scope entries
with the role controls at identity; `applied` is EXACT and every petal's lamina BIT-IDENTICAL.

| today | placement / depth | becomes | entries on the measured state |
|---|---|---|---|
| ALL (`allCurl`, `allCup`) | one whorl | `layers: [{ layer: 0, offsets: { petalSpineCurl, petalCup } }]` | 1 layer entry, 8 of 8 petals bit-identical |
| INNER (`innerCurl`, `innerCup`) | layers ≥ 1 | one layer entry per layer k ≥ 1, same offsets | 2 layer entries (3 layers), 24 of 24 |
| labellum (`labellumTilt/Cup/Curl`) | RADIAL, ≥ 2 whorls in step | `petals` entries on the slots `roleForSlot` assigns LABELLUM, one per canonical slot, per layer | 2 petal entries, 16 of 16 |
| hood (`hoodTilt/Cup`) | RADIAL, ≥ 2 whorls in step | the same, on the HOOD slots (the odd-n hood is a PAIR — one entry) | 2 petal entries, 16 of 16 |
| `petalN{Tilt,Cup,Curl}` | FAN | `petals` entries on orbit N−1's canonical slot, per layer | 1 petal entry (group 2), 7 of 7 |
| `labellumSize`, `hoodSize`, `petalNSize` (`mul`) | as above | `petalLength: global × (mul − 1)`, `petalWidth: global × (mul − 1)` | labellumSize ×1.3: length and width within **0.0e+0** |

**The one semantic loss, recorded:** a `mul` row scales with the global, a delta does not. A
migrated size offset is the same petal at the global it was migrated at and a different one if the
global later moves. On the measured state the two agree to the bit (`g + g·0.3` and `g·1.3` land on
the same double there); that is this state's luck, not a law — SO7 bounds it at 1e-9 and reports the
difference. Offsets are the ruled DEFAULT (Q3.2); if the retirement session wants a size offset that
keeps scaling, that is a `law` field on an entry and Eva's ruling, not a silent change here.

What the retirement session also inherits: the `ROLE_OVERRIDES` control IDS go to `RETIRED_IDS`
(Q3.4) with a migration that is STATE-DEPENDENT (it reads the global, the placement and the whorl
count to place the entries), which is a different shape from every `migrateTo` the file reader knows
— the reader's exact-copy migration cannot express it, so that session owes the reader a second
migration kind. The variance FORM field is not a scope (it is a field over the slots) and stays.

## 5. Q3.5 — per-layer size and tilt WIN — expressed, not wired

The model expresses "per-layer on" for a quantity as a layer entry carrying an offset on
`petalLength` / `petalWidth` / `petalTilt`. The ruling is that where a layer owns the quantity,
`layerSize` / `layerTilt` hide and their ramp does not apply to that layer. TODAY the ramp still
applies and the offset is added on top of it (`tiltExtra` and `scale` unchanged — SO6 measures
that). The wiring session changes `footRing()` to read that layer's ramp term as the identity where
the layer owns the quantity, hides the two controls (the registry predicate), and MOVES SO6 to assert
the new law. No extra field is stored for it, so nothing in a file today describes behaviour nobody
built.

## 6. Declared gaps (what a scoped build does NOT yet do)

- **The stem omission probe is unscoped.** `stemOmission` builds the probe petals from the state
  without a scope term, so on a SPHERE with a stem a scoped petal's clearance is measured on its
  unscoped twin. A wiring item; told here. **Unreachable since Scoping-b:** the omission runs only
  on a SPHERE, which is CONTINUOUS, and neither toggle can be live there, so no scope reaches a
  sphere's petals.
- **The sepal angle scan** keys congruence on the scope term (so two scoped neighbourhoods are not
  collapsed into one trial) but the scan's trial sepals read the scoped SITES' slots as built, which
  is right; sepal tiers themselves are not applied.
- **Tiers are stored, validated and told, never applied** — there is no second tier and the first
  is the whole sepal control set already.
- **Telemetry:** `applied` still reports only `APPLIED_BASES` (the role bases plus twist); a scoped
  base outside them is on the petal's `scopeTerm` record and nowhere else on the read-out. The
  read-out line for scopes is the design status line's count; the panel chrome session owns more.
- **Q3.3 stands:** a `petalWidth` offset does not reach the foot (the foot reads `state`), exactly
  as a size override does not today; Z6 asserts it.
- **The infill's `densityCap` sweep** runs on the representative petal (the first built); a scoped
  petal's own cap is not swept.
- **The blanket sweep and `ALL MAX`** know nothing of scopes, by construction (no control).

- **One apex mutant was DISARMED by this change and re-anchored, and CI is what said so.**
  `form-field-never-reaches-the-blade` anchors on `petalSurface`'s `ps` line, which this
  session rewrote to carry the scope term; the export preflight's anchor pre-check read
  `157 of 158 matching exactly once` on `4857577`. Re-anchored to the shipped line, run alone:
  it fires FV2 (collateral ID9/ID10 as before), silent on the clean tree, 158 of 158 anchors.
  A refactor disarms a mutant by moving its `from` — this file's own class, one more instance.

## 7. Where the gate rides, and why no workflow was edited

`tools/verify-bloom-scopes.mjs` is spawned by `tools/verify-bloom-design-file.mjs` (clause F6, both
in the plain run and under `--negative-control`), which `bloom-panel.yml` already runs. Editing a
workflow file costs every frozen tag dispatched afterwards from a base that predates the edit
(CLAUDE.md, "WHEN A FROZEN TAG PUBLISHES"), and the stamen-variance session is in flight on a base
that predates this PR; the file's `overrides` containers are this model's file shape, so the
design-file gate is the honest host rather than a convenience.

## 8. Byte identity — the close

`node tools/verify-bloom-surface-bytes.mjs --base <worktree of 57f64f7> --from K --rows N`, the
whole 1,302-row live matrix in BOTH modes, run as eleven chunks on this box (the union of the chunks
is the matrix; every chunk `PASS — 0 floats moved, positionally, under Object.is`):

| | this tree against `57f64f7` |
|---|---|
| rows × modes | 1,302 × 2 |
| export stream | **1,590,625,152 floats over 176,736,128 triangles, 0 moved** |
| captured grid (live) | **84,101,184 values over 9,685 panels, 0 moved** |
| triangle counts | unchanged on every row (a count move is a length move, which the tool reports first) |

No matrix row was added or removed, so NO frozen phase is owed and no tag's bytes stop reproducing.
The design-file round trip on every live row is SO8 (1,302 rows, no note but the tier's) and the
design-file gate's own F2 (every row, zero notes), both green on this tree.

## 9. Not done, by the brief

No control, no panel chrome, no matrix row, no frozen phase (no row moved — the stamen-variance
session in flight owns the next phase number), no retirement. The hook is the only writer besides a
loaded file.
