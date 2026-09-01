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
(every registry control renders exactly once in its declared section, a control
inside a collapsed section still reads, writes and rebuilds, and every
predicate-gated control is asserted to APPEAR as well as to hide), with
`--negative-control` required to fail. Its companion sheet is
`node tools/shot-bloom-panel.mjs <dir>` — the panel, not the canvas.
Arrangement changes have their own sheet too:
`node tools/shot-bloom-arrangement.mjs <dir>` — layers, placement and the
parked extremes. Zygomorphy has one as well:
`node tools/shot-bloom-zygomorphy.mjs <dir>` — the iris, face-on and in
profile, always beside the same bloom undifferentiated as the control.

**A green connectedness run does NOT endorse the junction under layers** —
measured, not cautious: building the hub at the wrong layer's radius leaves a
whorl joined to nothing and that gate still reports ONE piece, because
consecutive foot annuli overlap each other. `junctionAssertions()` (J1–J6) in
both gates is what carries that claim; do not weaken it on the strength of a
green flood fill.

**Neither STL gate can see zygomorphy at all** — measured on three worktrees,
not derived: an override that lands on the wrong whorl, an override record
that never reaches the blade, and the area rule regrouped per foot ALL export
watertight, as one piece, with no degenerate triangles and identical live and
export triangle counts and byte lengths. `zygoAssertions()` (Z1–Z3) in both
gates is what carries those claims. Z3 is an EQUALITY and not a bound on
purpose: the regrouping mutation measures 0.9 ULP, which any real tolerance
would pass. The area rule is grouped by ROLE and must stay that way —
regrouping it per foot moves every 40-petal export by 6 ULP.

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

## Artist Tracker (`artist-tracker.html`)

Private, single-file, client-side artist/tattoo-artist tracker for
eva-maskalenko.com — who to follow, tattoo artists and where they work,
tour/release dates worth watching. No backend, no build step: a SHA-256
password gate (`crypto.subtle` + a hardcoded hash, unlock flag in
`sessionStorage`) guards a `localStorage`-backed CRUD tracker.

**Status: not yet merged.** Items 1–10 below live on branch
`claude/artist-tracker-testing-afc2ul` / PR #121 (draft, targeting
`main`); items 11–12 build on top of it on branch
`claude/tracker-panel-paste-images-h46mti`. Review each through its own
Netlify Deploy Preview — not the production domain. This matters because
the app's only "database" is the browser's own `localStorage`, which is
scoped per-origin: data added on the deploy preview does **not** carry
over automatically once this merges to production. Use the app's own export/import JSON to move data across
origins if needed.

**Built so far, in order:**
1. Core tracker (pre-existing before this branch): password gate,
   add/edit/delete, search, category filter (following/tattoo/touring —
   the only three real categories), sort, JSON export/import.
2. Fixed two bugs found while testing the original page: a fixed "back to
   top" button that could overlap the add/edit panel on mobile (now
   hidden while the panel is open), and a JSON-import edge case where a
   falsy `id` on an imported record could survive instead of regenerating.
3. Auto-fill entry photos from the Instagram handle via unavatar.io (a
   free public avatar-lookup proxy), falling back to the initials
   placeholder on failure. **Unverified in production — see Open Items.**
4. Merge-aware bulk paste: a pipe-delimited
   (`name | handle | category | location | pronouns | status | link | photo url`)
   or bare-handle line whose handle matches an existing entry
   (case-insensitive, leading `@`/trailing `/` stripped) fills in that
   entry's currently-blank fields and creates no duplicate, instead of
   always adding a new entry. Non-blank fields are never overwritten.
   Reports "X updated, Y added, Z unchanged."
5. The Instagram handle renders as a real link to `instagram.com/<handle>`,
   teal, underline on hover only (was plain dim text).
6. Gender filter, bucketed from the free-text `pronouns` field into
   she/her, he/him, they/them, other, unspecified (tokenized matching,
   not substring — "she" can't false-match inside "he").
7. Location filter: dropdown of distinct location strings already in
   storage.
8. Style tags: new `tags` field (comma-separated on the form, stored
   lowercased), shown as pills per entry, filterable via OR'd
   multi-select chips generated from every distinct tag in use.
9. Map view, toggled alongside List on the same page: Leaflet +
   OpenStreetMap tiles via CDN, pins color-matched to the category colors
   via a `divIcon` (no default marker image assets needed). Locations are
   geocoded lazily via Nominatim (rate-limited to 1/sec, cached on the
   entry, deduped across entries sharing the same location string,
   cleared and re-queried if the location text is edited). A location
   that fails to geocode is skipped silently and logged to console.
10. Bulk-paste category preservation: a category value that isn't
    following/tattoo/touring (e.g. "Influencer", "Art", "Friend" — as used
    in the user's real Instagram-export data) is now kept as a tag instead
    of being silently discarded when it collapses into "following."
11. Slide-in detail drawer. Clicking anywhere on an entry row (the row is
    the button — `role="button"`, tab-focusable, Enter/Space) slides a
    ~400px panel in from the right; full width under 560px. No route
    change, no scroll loss, the list stays where it was. Closes on the ×,
    a backdrop click, or Escape, and focus returns to the row that opened
    it. `prefers-reduced-motion` snaps instead of sliding.
    - The row no longer contains a link. The handle used to be an `<a>`
      straight to Instagram; that link is now the "Open on Instagram →"
      button at the foot of the drawer (teal, `target="_blank"`), so
      there is one predictable click target rather than a link inside a
      button. The handle still renders teal, as text.
    - Edit and Remove live **only** in the drawer — the per-row
      edit/remove/open column is gone. With the whole row clickable,
      keeping them would have meant three competing targets on one row.
    - The drawer has two modes. View mode is a read-only spread of the
      entry; edit mode is the *same* quick-add form, physically relocated
      into the drawer (the fields, ids and save handler are unchanged).
      There is no on-page add/edit panel any more — "+ add an entry"
      opens the drawer in edit mode with a blank form. The on-page panel
      still exists but is bulk-paste only, behind its own "bulk paste"
      button, so the quick/bulk tab strip is gone.
12. Paste-to-add photos. With the drawer in edit mode, Ctrl/⌘+V pastes a
    copied image (screenshot, right-click → copy image) straight into the
    entry's photo. Drag-and-drop onto the photo box works too.
    - The `paste` listener is on the drawer element and is attached only
      while edit mode is active — never on the document, and removed when
      the drawer closes or returns to view mode.
    - `preventDefault()` fires **only** when an image is actually taken.
      A paste into a text field whose clipboard carries text is passed
      through untouched, even if an image rides along with it (that is
      how copying from a web page usually arrives). Copy-image and
      screenshots put no text on the clipboard, so pasting still works
      with a field focused.
    - Stored photos are downscaled before they are saved: longest side
      500px, re-encoded JPEG at 0.8 (`MAX_PHOTO_DIM` /
      `PHOTO_JPEG_QUALITY`). A ~2MB screenshot lands at roughly 30–60KB.
      The canvas is filled with the panel ink colour first, because JPEG
      has no alpha and a transparent PNG would otherwise come out black.
    - The pasted image is held in `pendingPhoto` and committed on save,
      so Cancel discards it like every other field. The "photo url" text
      field stays as the fallback path; the two are mutually exclusive
      (typing a url drops the pasted image, and pasting clears the url).
      A data-URL photo is never dumped into that text box — it shows as
      "stored image · NN KB" with a "remove image" action.
    - `persist()` now returns a boolean and handles a quota failure
      loudly: it rolls `entries` back to `lastPersisted` (the last
      snapshot that actually reached storage, so the screen can never
      show unsaved data) and tells the user storage is full. Pasted
      images make quota exhaustion a reachable failure rather than a
      theoretical one.
    - **Exports get much bigger.** Photos are data URLs inside each
      entry, so they flow through JSON export/import with no special
      handling — and a backup of 200 entries with images is megabytes
      rather than tens of KB. Expected, not a bug.

**Testing approach:** no CI workflow covers this file (every GitHub
Actions gate in this repo is path-filtered to `flower*`/`bloom*` files
only — only Netlify's own informational checks run on this PR). The
drawer and paste-to-add work (items 11–12) shipped with a behaviour gate,
`node tools/verify-tracker-drawer.mjs` (94 checks; `--shots <dir>` also
writes a contact sheet). It serves the repo on a free port, seeds
`sessionStorage` to skip the password gate, stubs unavatar.io and unpkg,
and drives a real Chromium: open/close/Escape/backdrop, focus return,
the edit round trip, the downscale (a 1200×800 paste must come out
500×333 JPEG), every paste-scoping rule above, a stubbed
`QuotaExceededError`, and a regression pass over bulk-paste merge, the
filters and the map toggle. It is not wired into CI (no workflow here
covers this file) — run it before calling a tracker change done.
Verified falsifiable: widening `MAX_PHOTO_DIM` or dropping the
text-field paste guard each turn it red.
Verification has been manual: serve locally via `python3 -m http.server`
(`crypto.subtle` needs a secure context — never test via `file://`), drive
with Playwright (`NODE_PATH=/opt/node22/lib/node_modules` — Playwright is
a global npm install in this environment, not a project devDependency;
browsers live at `/opt/pw-browsers`). This session's sandbox blocked
arbitrary outbound hosts (`fonts.googleapis.com`, `unavatar.io`,
`unpkg.com`, and even the Netlify deploy-preview domain itself all
403/reset) but *not* the npm registry — `npm install leaflet` got a real
local copy of Leaflet to serve via Playwright route interception for map
testing, rather than testing against a stub.

**Open items:**
- **The unavatar.io photo mystery.** Feature 3 above tested clean in the
  sandbox (mocked responses), but on the real Deploy Preview *every*
  entry showed initials instead of a photo — and the browser console
  showed zero requests or errors mentioning "unavatar" at all, even after
  a hard refresh, which points away from "the service is down" and
  toward "the code path isn't even being reached for these entries" (most
  likely: those entries already have a non-empty `photo` field from
  before, which short-circuits the auto-lookup). Never resolved — the
  user was asked to check one existing entry's "photo url" field in the
  edit form and never followed up before the conversation moved to other
  feature requests. Worth revisiting before trusting this feature.
- **`bulkimport_1.txt`** (770 real entries, the user's actual Instagram
  follow-list, cleaned into this app's pipe-delimited bulk-paste format)
  was validated and dry-run tested against the real merge-import code —
  confirmed to parse cleanly and merge correctly — but has **not**
  actually been pasted into the user's real tracker yet, since that step
  can only happen in their own browser.
- PR #121 has an hourly self-scheduled check-in (via `send_later`)
  watching for CI/mergeability/review-comment changes, set up mid-session
  — check `list_triggers` for it if picking this back up, rather than
  assuming none exists or creating a duplicate.

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
