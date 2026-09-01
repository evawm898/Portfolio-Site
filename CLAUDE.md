# CLAUDE.md

Guidance for Claude Code sessions working in this repository.

## Git + Netlify Workflow

- `main` is the stable production branch.
- Never develop directly on `main`.
- Before beginning new work, fetch the latest `main` and create/use a dedicated feature branch.
- Each project or experiment should remain isolated on its own feature branch.
- Open pull requests targeting `main` so Netlify can generate Deploy Previews.
- Do not merge any PR unless explicitly instructed to merge it.
- Do not push experimental work directly to `main`.
- Do not manually publish or trigger a production deployment unless explicitly requested.
- During iteration, changes are reviewed through the Netlify Deploy Preview associated with the PR.
- When a page has a dedicated route such as `/flower.html` or `/textile-gauge-reader.html`, provide the exact Deploy Preview page URL when possible.
- Production publishing may be locked in Netlify while work is being reviewed.
- If multiple finished feature branches are intended for one portfolio update, do not independently merge them to `main` — check first. A combined release branch / release PR may be wanted so the entire site updates in one production deployment.
- Never delete old branches without explicit approval.
- Before making branch-history changes, rebases, force pushes, or destructive Git operations, stop and ask first.

## Bloom generator — pointer only

The Parametric Bloom (`bloom.html`, `bloom.js`, `bloom-geometry.js`,
`bloom-registry.js`) is a separate generator from the flower. Its governing
document is **`docs/bloom-charter.md`** — read it before touching any bloom
file; rules are stated there (and in the flower-project skill it references),
deliberately not repeated here. Its invariant is one connected watertight
solid, gated by `node tools/verify-bloom-export.mjs` (boundary edges = 0) and
`node tools/verify-bloom-connectedness.mjs` (voxel flood-fill, one region) —
both run in CI and both must pass before any bloom geometry change is done.
Control-panel changes have their own gate: `node tools/verify-bloom-panel.mjs`
(every registry control renders exactly once in its declared section, and a
control inside a collapsed section still reads, writes and rebuilds), with
`--negative-control` required to fail. Its companion sheet is
`node tools/shot-bloom-panel.mjs <dir>` — the panel, not the canvas.

## Flower generator — print-safety is a hard invariant

The Flower Bloom generator (`flower.html`, `flower.js`, `flower-geometry.js`) is a
3D-printing tool, not only an on-screen visual. STL export and watertight /
manifold geometry are **permanent, non-negotiable requirements** — never treat
them as optional or experimental.

- Every geometry change — new parameters, new petal/spiral logic, sepals, stem,
  leaves, receptacle, anything that adds or alters mesh — MUST preserve valid,
  printable STL export.
- **Export contract:** every primitive is an individually closed solid, so the
  exported STL has **zero boundary edges**. Open shells are never acceptable.
  Overlapping closed shells are fine — the slicer unions them. Build new geometry
  the way the existing code does: closed tubes with end caps, watertight beads,
  sealed slabs/ribbons, and sealed solid blades (top face + bottom face + rim).
  Never add a bare single-sided surface or zero-thickness membrane to the export
  mesh.
- Respect `exportMode`: at export, tube/bead radii and slab/blade thickness are
  floored to the printable minimum (`MIN_FEATURE_MM = 0.8`). Any new solid
  primitive must honor the same floor.
- **Verify before calling a geometry change done:** run
  `node tools/verify-flower-export.mjs`. It renders the page headless, exports an
  STL across a range of configurations (add yours to it), and fails if any export
  has boundary edges > 0. A change is not finished until this passes.
- **Watertight is necessary, not sufficient — also run the geometry-quality gate:**
  `node tools/verify-geometry-quality.mjs`. The export gate only proves manifoldness; a
  petal can be watertight and the WRONG SHAPE (e.g. the un-clefted continuous-margin rim
  skipping a Lobed sinus). This gate measures correctness — margin fidelity (does the
  rendered rim trace the material boundary?), contour smoothness, and uncapped infill
  ends — across the shape × pattern matrix. Known, tracked defects are marked xfail so
  the gate is hard for everything that ships. Add new shape/pattern configs to it.
- **Watertight is not connected either — also run the connectedness gate:**
  `node tools/verify-connectedness.mjs` (issue #43). Two entirely separate closed solids
  also have zero boundary edges, so the export gate would pass a bloom that prints
  detached from its stem. This one voxelises the export below the minimum feature (0.6 mm)
  and flood-fills; more than one region is a FAIL. Read its header before quoting a pass:
  it is a surface-occupancy test over hand-picked configs, not the export matrix. It covers
  the junction corners, the Voronoi region seams, the BARE BLOOM (no stem, no sepals, no
  receptacle override — the shipped defaults, and what every preset is) and every preset by
  name. A row with a known, tracked defect carries `xfail: <issue>`: the gate stays green
  for it, FAILS on any unmarked row, and FAILS HARD when an xfail row starts passing —
  that is the fix landing and the marker must come off in the same commit. Its three
  validity assertions (fresh page per row + whole-state read-back, the tail probe, the
  pairwise sepal comparison) are never covered by an xfail and abort the run.
  `node tools/verify-connectedness.mjs --negative-control` mislabels one row on purpose and
  requires the run to fail — use it before quoting a pass from a changed harness.
- **Control visibility is declared in the registry, and only there.** Every reason a
  control can be hidden is a `visibleWhen` predicate in `flower-registry.js`;
  `applyVisibility()` in `flower.js` evaluates it and is the only thing that sets a
  control wrapper's `hidden`. There are no gating data-attributes on control wrappers, no
  `permanentHidden`/`imperativeGate` flags, and no hardcoded id lists —
  `verify-registry-sync.mjs` fails the build if any of them come back. To change when a
  control shows, edit its predicate; never add imperative code.
  `node tools/dump-visibility.mjs` records every control x the matrix x both tiers, so
  a change that claims not to move visibility is diffed rather than asserted;
  `node tools/shot-panel-matrix.mjs <dir>` is the contact-sheet companion.
- **A deleted control's id is retired forever, and the reservation is enforced.** When a
  control goes, its value stops mattering and its NAME starts: saved designs and shared
  links carry the old key indefinitely, so reclaiming the name later feeds a stale number
  into a control that means something else — silently. Retiring an id is therefore four
  things, not one: delete the registry row and the markup, add an entry to `RETIRED_IDS`
  in `flower-registry.js` (id + the schema version + why), bump `CURRENT_SCHEMA`, and add
  a migration that **deletes the key**. That last step is not optional —
  `migrateDesign()` sweeps keys with no control into `extras` and preserves them verbatim
  on re-save, so a retired id with no delete is carried forward forever by the mechanism
  meant to protect forward compatibility. `verify-registry-sync.mjs` fails the build if a
  retired id collides with a live control id, a live option value or a DEFAULTS key, or if
  no migration deletes it. Never remove an entry from `RETIRED_IDS`.
- **Presets are permanent, named fixtures in ALL THREE geometry gates.** Every shipped
  preset in `flower-presets.js` is loaded by name in `verify-flower-export.mjs` (must export
  watertight), `verify-geometry-quality.mjs` (its petal must trace, stay smooth, cap
  its ends) and `verify-connectedness.mjs` (must export as one piece) — so a preset
  regression reads "preset: thistle", not "config N". A preset is
  authored data (taste), so it is a readable DELTA over DEFAULTS and loads through the
  normal `applyDesign` path; it can never desync from the control set. When you add or
  change a preset, all three gates cover it automatically — just re-run them.
- **Preset thumbnails are a build-time artifact, never rendered at runtime.** Regenerate
  them (and the drift manifest) with `node tools/gen-preset-thumbs.mjs` and commit
  `assets/presets/`; the `preset-thumbs` CI job runs `--check` (a deterministic tris + bbox
  diff, GPU-independent) and fails if a preset's shape drifted without the thumbnails being
  regenerated. The shipped gallery is read-only for visitors; the `?dev` authoring row
  (save-as / export paste-ready source / import) is the tool for editing the set.
- **A correct-looking screen render is not proof.** Geometry can look right live
  and still export broken. Never rely on the visual alone.
- **If a feature cannot be built in a watertight way, STOP and flag it to the user
  before implementing** — explain the conflict and the options. Never ship a change
  that silently breaks export.

## Maintainability & performance (working agreement)

As the project grows, keep it maintainable and performant. Flag these proactively —
don't wait to be asked, and don't surface them only after the fact.

1. **Estimate cost before building.** If a requested feature would meaningfully
   increase triangle count, file size, or geometric complexity, say so with an
   estimate BEFORE implementing, so the user can decide with the number in hand.
2. **Report the numbers on every geometry change.** Any change that touches
   geometry must report the actual triangle count (live + export) and export STL
   file size in its summary, so creeping bloat stays visible over time.
   `node tools/verify-flower-export.mjs` prints per-config triangle counts.
3. **Keep features isolated.** Each part lives in its own builder — petals
   (`buildPetalInto`), whorls (`buildLayerInto`), sepals (`buildSepalsInto`),
   receptacle, stem, core, future leaves. Reuse shared primitives (`surfacePoint`,
   the `MeshAccumulator`) instead of duplicating, but never tangle one part's logic
   into another's. New parts get new builders.
4. **Flag print-safety risk up front.** For any geometry-touching feature, state
   the manifold/watertightness impact before shipping; if you are not confident it
   stays manifold, say so and stop (see the print-safety invariant above). Never let
   a watertightness problem be discovered after the fact.
5. **Call out session/scope drift.** If the conversation history or codebase has
   grown enough that a fresh session seeded with a clean state summary would serve
   the project better than continuing, say so rather than pushing forward regardless.

## Before finishing a task

- Confirm the current branch.
- Confirm the PR base is `main`.
- Report whether anything was merged.
- Report whether anything was pushed to `main`.
- Provide the Deploy Preview URL if one exists.
- For geometry changes, report the triangle count (live + export) and export STL
  file size (watch for bloat), and confirm `tools/verify-flower-export.mjs` passes.
- For control-panel changes, confirm `tools/verify-registry-sync.mjs` and
  `tools/verify-tier-visibility.mjs` pass, and diff `tools/dump-visibility.mjs` against
  the pre-change dump when the change is meant to be visibility-neutral.
