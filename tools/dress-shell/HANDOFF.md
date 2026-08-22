# Handoff — browser shape editor (Upload / Shape / Shells / Panels)

Written at the close of the session that built `/shape-editor.html` end to
end: four stages, an in-browser shell library, layout ownership, a real
(scoped) port of `shape_impact.py`'s standoff-impact check, and a full-page
saved-shell viewer. Read this before picking the work back up — the user
plans to start a new session per feature from here, so nothing below should
be assumed still fresh in anyone's head.

## What's built

**The page is `/shape-editor.html`** (+ `shape-editor-app.js`,
`shape-editor-geom.js`, `shape-editor-yaml.js`, `shape-editor-chart.js`,
`shape-editor-db.js`). Fully client-side, no server, no build step — the
whole app is these five files plus a baked JSON snapshot
(`assets/shape-editor-data.json`).

- **Stage 1 · Upload** — pure input. Load front/side/top-down photos (back
  optional), calibrate each by clicking two landmarks. No curves, no 3D.
- **Stage 2 · Shape** — tracing and editing are the same action: drag points
  against the calibrated backdrop, watch the 3D shell update live. Feature-
  line marking, adaptive point density with a named-feature floor
  (waist crease / bust ramp), smoothing, live circumference/monotonicity
  readouts.
- **Stage 3 · Shells** — a real library (IndexedDB, `shape-editor-db.js`),
  not a single slot. Save prompts for a name, stores a thumbnail, and
  either creates a new entry or updates the open one. Saving over a shell
  that owns layouts re-runs the standoff impact report first. Library
  export/import as one JSON file for backup; a live storage-usage estimate.
- **Stage 4 · Panels** — layouts are named, owned-by-a-shell library rows
  (not a single read-only `layout.yaml` dump), each showing live per-panel
  standoff against its shell. The committed `layout.yaml` is an explicit
  *reference* you duplicate onto a shell as a new layout — gated by the
  same impact report. Duplicating a layout onto a **different** shell is
  gated the same way. A "View full page →" action shows the current saved
  shell large and orbitable, reading fresh from the library every time —
  it does not touch `/dress` or its storage.
- **`shape-editor-chart.js`** is a scoped, faithful port of
  `shape_impact.py`'s `seat_standoff`/`coords.py` machinery to JS —
  cross-validated against a real `python3 shape_impact.py` run on this
  repo's own files (`tools/verify-shape-editor-impact.mjs`, a permanent
  regression gate; re-run it if this file changes). It computes real,
  worst-first per-panel standoff deltas — not a placeholder.
- `/dress` is untouched throughout. It still reads a committed `.glb`,
  published only by the deliberate `python3 export_gltf.py` step. **The
  one-line request when you want the portfolio page updated:** "Commit
  this as `tools/dress-shell/shape.yaml` and republish `/dress`" — paste
  the clipboard YAML from Shells' quiet "copy shape.yaml to clipboard"
  action along with that line.

## What's deliberately unfinished

- **Panel placement is not ported to the client.** Dragging/rotating a
  panel, connector-escape/outline legality, mirror-twin derivation, and the
  layering DAG all still live in `editor_server.py` — a local dev server,
  unreachable from this remote/browser-only setup. Panels (Stage 4) is
  read-only by design this round: it shows standoff, it doesn't let you
  place anything. Porting the actual placement interaction (and the
  legality/DAG checks it depends on) is the next big chunk of work, not
  started.
- **Top-down view loads and calibrates but doesn't feed section shape.**
  Upload (Stage 1) accepts a top-down photo and lets you calibrate it, but
  nothing downstream reads it — the shell is still two half-ellipses per
  section (`a(v)`, `b_front(v)`, `b_back(v)`), the same family as before.
  Making the top-down trace actually inform the section shape between the
  front/side extremes needs a new section-family model; this was flagged
  as a known gap from the first Upload/Shape/Shells/Panels build and never
  picked back up.
- **The 2mm standoff tolerance has never been physically validated.**
  `STANDOFF_TOLERANCE_MM = 2.0` (in `curvature.py`, mirrored in
  `shape-editor-chart.js`) drives every "fits" / "exceeds tolerance"
  verdict in this whole pipeline — the max-seatable-class map, panel
  count, the impact reports' REGRESSED flags, all of it. It's a number
  that was picked, not measured. Per the project's own standing
  instruction: tape a real panel to a curved form at the relevant radius
  and see what it actually tolerates before trusting this number for
  anything that gets built.
- **The current saved shell has `b_front` below its feature floor, override
  checked.** Whichever shell is sitting in the library right now (Shells
  tab) was saved with the waist-crease and bust-ramp named features lost
  at the current `b_front` point density, and the export-guard override
  was used to save it anyway. That's visible on the shell's own library
  row ("⚠ saved with a named feature below its floor"), but it means the
  bust shape that took real effort to get right is **not** faithfully
  represented in that saved shell right now. Before doing anything that
  depends on this shell's `b_front` being correct, raise the density (see
  Shape's density slider and its reported floor) and re-save.

## Where to look

- `shape-editor.html` / `shape-editor-app.js` — the page and all its logic.
- `shape-editor-geom.js` — pure math (PCHIP, curvature, adaptive density),
  cross-validated against the Python originals, unchanged this round.
- `shape-editor-yaml.js` — the hand-rolled `shape.yaml` reader (this
  project's own canonical format only, not general YAML).
- `shape-editor-chart.js` — the `(theta, s)` chart + `seatStandoff` port;
  `tools/verify-shape-editor-impact.mjs` is its regression gate.
- `shape-editor-db.js` — the IndexedDB library (shells + layouts stores).
- `editor_server.py` / `editor/` — the Python placement editor Stage 4 has
  not replaced yet; still the reference for what porting it would mean.
- `shape_impact.py` — the Python validation Stage 3/4's impact reports are
  a scoped port of; still the authority for connector/outline/twin/DAG
  checks this port doesn't cover.
