# Flower generator — code-quality backlog

Deferred findings from a thermo-nuclear code-quality review of PR #38
(`flower-standard-mode`, the P1–P5 registry/Standard-Advanced refactor). The
structural regressions from that review were fixed directly (crash-guard
denominator, dead receptacle-tris readout, mis-gated margin controls,
`resolveHasReceptacle`/`SHAPES`/harness extraction, `flower-controls.js`
deletion, gates wired into CI — see that PR). Everything below is real but
lower-severity: worth fixing, not worth blocking or widening that PR for.

## Registry / control panel

- **`SHAPES.rounded` (`flower.js`) still hand-duplicates the registry's own
  defaults**, rather than deriving from `DEFAULTS`/the registry. Nothing
  gates this; if a default silhouette value is retuned in
  `flower-registry.js`, the "ROUNDED" named-shape picker silently stops
  matching the app's own default shape (`detectShape()` would read CUSTOM).
  Fix: derive `SHAPES.rounded` from the registry defaults instead of a
  separate literal.
- **`verify-registry-sync.mjs` and `extract-registry.mjs` independently
  re-implement the same `flower.html` parsing** (the `GATES` list, the
  `divInfo`/gating extraction, the control regexes). A sync-checker that
  hand-copies the extractor's own parsing logic is weaker than one that
  imports it. Fix: factor the shared parsing into one module both import.
- **`captureDist`'s `imperativeGate` escape hatch opts out of the
  registry-sync safety net** for a compound `infillType ∈ {...} AND
  edgeTermination ≠ fade` condition that three other controls
  (`centerCount`/etc., the sepal-tip cluster, `leafPhyllotaxy`/`leafSize`)
  already express declaratively via two `data-*` gate attributes. The
  "declarative gating can't express this" justification doesn't hold up
  against those precedents. Fix: rephrase as an inclusion set
  (`edgeTermination ∈ {meet, loop}`) and drop the imperative exception.

## Preset thumbnail pipeline

- **`tools/gen-preset-thumbs.mjs --check` never diffs the committed PNG
  pixels** — only triangle count + bbox in `manifest.json`. A material,
  lighting, or camera-framing change would produce a stale/wrong thumbnail
  that this check still passes. The workflow's job name ("preset
  thumbnails must match committed manifest") reads more protective than it
  is. Fix: also hash/diff the rendered PNG bytes against the committed
  ones, or rename the check to make the narrower scope explicit.
- **Fixed `waitForTimeout` races an async, double-`requestAnimationFrame`
  -deferred rebuild** with no readiness signal — `gen-preset-thumbs.mjs`
  (280ms) and `audit-hires.mjs` (300ms) both guess instead of waiting for
  a real "rebuild finished" signal. On a slow runner or the heaviest
  presets this could capture a partially-built mesh. Fix: expose a
  `window.__buildGeneration` counter (or similar) from `flower.js` that
  the hook can poll to confirm the specific rebuild it triggered has
  actually completed.
- **`--check` doesn't detect an orphaned manifest/PNG entry** when a preset
  is removed from `flower-presets.js` — it only iterates the *current*
  preset list. No live bug today (no orphans exist), but a deleted preset
  would leave dead binary weight with nothing flagging it.

## Geometry-quality gate

- **The xfail-expiry ledger's 30-day clock is self-attested** — renewing a
  quarantined defect is a one-line date bump in the same commit that would
  otherwise fail the build, with no external enforcement of the cadence.
  Now that the gate runs in CI on every relevant commit (this PR), the
  ledger is at least *checked* constantly, which narrows the gap; a
  renewal-counter or escalation-after-N-renewals would close it further.
- **`verify-geometry-quality.mjs`'s in-page hook re-dispatches by
  `infillType`** (mirroring `flower.js`'s `buildPetalInto` infill switch)
  instead of reusing the app's own per-petal build path. This is exactly
  the duplication class that caused the real "gate's own stale copy of the
  bug" incident fixed in PR #40 (the margin-registration fix) — the gate's
  copy of the dispatch logic drifted from the renderer's. Consider
  exposing a shared `buildInfillForPetal(P, seed)` helper (in
  `flower-geometry.js` or `flower.js`) that both the renderer and this
  gate call, so there is structurally one dispatch, not two kept in sync
  by hand.

## File size / decomposition

- `flower.js` is ~4,200 lines. P4 ("regroup the panel") was a natural
  moment to split panel-only concerns (Standard/Advanced tier filter,
  `ADV_OPTIONS`, the Shape/Edge pickers, the MAKE printability badge +
  share-link codec) into their own module, importing `readUI`/
  `resolveParams` across a clean boundary. Not a regression from any
  single PR — accumulated debt — but worth doing before the next round of
  panel work lands on top of it.

## Minor nits

- `PANEL = CONTROLS.filter((c) => !c.placeholder)` filters on a field no
  registry entry ever sets (dead generality); the name also collides with
  the unrelated `placeholderControls`/`syncPlaceholder` system elsewhere in
  `flower.js` — same word, two unrelated concepts.
- `permanentHidden: true` on `divergenceAngle` is misleading: that control
  *is* dynamically un-hidden by `updateFormOptions` for `divergenceMode ===
  'custom'`. The flag really means "hidden in the static base markup," not
  "never shown" — accurate for `stemCurve`/`receptacleType`/`tube`, wrong
  reading for this one.
- `inputs[c.id].addEventListener(...)` over `WIRED` sliders has no
  null-guard, unlike most other DOM lookups in the same file. Harmless
  while `verify-registry-sync.mjs` guarantees every registry id has a
  matching DOM element, but a bypassed/broken gate would turn into a hard
  crash of the whole control panel rather than a graceful degradation.
- `ADV_OPTIONS` (option-level Standard/Advanced tiering for `tipStyle`/
  `bloomType` values) is a second, registry-adjacent hardcoded map not
  modeled in `flower-registry.js` and not covered by
  `verify-registry-sync.mjs` — a legitimate escape hatch (the registry's
  `tier` is control-level, not option-level) but an undocumented second
  mechanism a reader has to know to go find.
- `flower.js` imports both `PRESETS`/`PRESET_SCHEMA` (design presets) and
  `VIEW_PRESETS` (camera-angle presets) — two unrelated concepts sharing
  the word "preset," which makes a `grep -i preset` noisier than it needs
  to be. Naming-only; not a correctness issue.
