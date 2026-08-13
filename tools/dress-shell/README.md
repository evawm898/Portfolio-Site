# Dress Shell — Milestones 1 + 2

Design tool for placing rigid e-ink panels on a 3D dress shell. Python for
geometry, three.js for the viewer. The shell is rigid and formed in 3D from
the start — it is NEVER flattened; there is no flat pattern anywhere in this
pipeline. Two separate pieces, FRONT and BACK, split at the side seams, no
hinge (side closure out of scope; the pieces stay separable in the model).

This directory is **outside the site build path**: everything runs manually,
and only committed static files are ever served. The site never invokes
Python at request or build time.

## Status

| file | concern |
| --- | --- |
| `shell.py` | parametric shell: profile + elliptical sections whose axis ratio varies with height; FRONT/BACK meshes — **stable API** |
| `coords.py` | body-centered (theta, s) coordinates: exact forward/inverse maps, tangent frames — **stable API** |
| `test_coords.py` | round-trip + convention tests (waist, bust apex, hem edge, max flare, dense sweeps) |
| `panels.py` / `panels.yaml` | REAL HARDWARE library (Adafruit 6373/6394/6415 from ZJY datasheets): outline, thickness, active area, fixed connector, chipset, palette, refresh, price, per-field provenance with explicit `unverified` markers; loud validation |
| `facets.py` | FLAT FACET mechanism: shell locally flattened to a plane for `requires_facet` classes (the 7.5"), blend band, max/RMS deviation reporting |
| `layout.py` / `layout.yaml` | committed SOURCE OF TRUTH; lossless canonical IO; one-sided authoring with derived twins |
| `test_layout.py` | lossless round-trip, loud-failure, and mirroring/connector-derivation tests |
| `grid.py` | snap grid in (theta, s): rings + radials, snap targets, cell physical-size stats |
| `curvature.py` | per-cell k1/k2/Gaussian/min radius + MAX SEATABLE CLASS via true standoff sampling |
| `layering.py` | overlap DAG (same-layer overlap = hard error), mount heights, occlusion, connector burial, uncovered area |
| `test_analysis.py` | grid / curvature / layering tests |
| `export_gltf.py` | PUBLISH step: writes the committed `dress/dress-shell.glb` + `dress-analysis.json` the /dress route loads |
| `editor_server.py` + `editor/` | local three.js placement editor (dev only, never deployed): orbit, heat maps, snap place/drag, rotate/layer/delete, undo/redo, save layout.yaml, publish |
| `analysis_report.py` | full console report (shell, round-trip, grid, class distribution, layout, layering, coverage) |
| `shell_report.py` | milestone-1 console report: dimensions + round-trip accuracy |
| `preview.py` | scratch SVG preview of the silhouette (writes to `out/`, gitignored) |

## Running

```
python3 -m unittest test_coords test_layout test_analysis   # all suites
python3 analysis_report.py                                  # console report
python3 editor_server.py --port 8765                        # placement editor
python3 export_gltf.py                                      # publish /dress assets
```

(Editor and reports run from this directory.) The editor SAVES layout.yaml
(lossless, canonical) and PUBLISHES the /dress glTF as two separate actions,
so the layout can be iterated without churning the exported binary in git.
Vendored three.js lives in `dress/vendor/` (committed; shared by the editor
and the /dress route).

## Real-hardware notes

- The 7.5" (p750) is NOT a placeable panel: it needs ~773 mm local radius at
  the 2 mm tolerance and the flattest cell offers ~258 mm. It is seated only
  on an authored FLAT FACET (facets.py) — a deliberate design move, flagged
  in both viewers, with the shell deviation (max/RMS mm) reported.
- STANDOFF_TOLERANCE_MM (curvature.py) is a single named constant and an
  UNVALIDATED assumption; the analysis JSON carries it and a 1.5/2/2.5/3 mm
  sweep of the max-class distribution.
- The 2.13" quad's mechanicals come from the MONO variant's datasheet
  (same glass family, marked cross-variant/unverified); its refresh time is
  null until a real JD79661 figure exists. All remaining gaps are listed by
  `panels.unverified_fields` and printed by the console report.

## Mirroring semantics (layout.py)

- layout.yaml stores the authored side only (theta >= 0); `mirrored: true`
  derives a twin at -theta on load. Twins are never stored and never
  independently edited — re-derivation after any edit is the update path.
- A twin is never a reflection (orientation-reversing; physically
  impossible). MIRRORABLE in software: rendered content, via the per-panel
  `content_rotation` framebuffer counter-rotation (== physical rotation,
  tracked explicitly and included in the export). NOT mirrorable: outline,
  bezel offsets, connector origin/exit, driver footprint — identity or
  180 only.
- The twin's ACTIVE AREA CENTER is pinned to (-theta, s). Rotation is then
  chosen by priority: (1) connector escape legality; (2) if both legal,
  minimize OUTLINE ASYMMETRY — distance from where a true reflection would
  sit: 2|ex| keeping the source rotation, 2|ey| flipping, with (ex, ey)
  the active center's offset from the outline center; ties keep the source
  rotation. Neither legal -> INVALID twin with reasons. Per-twin asymmetry
  is recorded; `asymmetry_summary` reports worst case + mean.
- Geometric connector legality: the connector origin and its straight
  escape run (`escape_mm`) must stay on the panel's own piece — not cross
  the side seams at theta = +-90 and not run off the top or hem edge.
  Occlusion/burial checks are separate (layering).
- `assert_face_normals` runs on every resolve: each panel's display face
  normal must align with the shell's outward normal (twins included).
  Rotations are proper transforms so this holds identically; it is an
  assertion whose failure means a reflection crept in.
- Chart math: lateral mm convert to degrees via the local circumferential
  radius at the point's own height.

## Run

```
pip install -r tools/dress-shell/requirements.txt      # numpy + scipy
python3 tools/dress-shell/shell_report.py              # dimensions + round-trip report
cd tools/dress-shell && python3 -m unittest test_coords -v
```

## Conventions

- Units mm. Body frame: origin on the axis at waist height, +z up,
  +y center front, +x wearer's left.
- `theta`: azimuth in degrees, 0 at center front, positive to the wearer's
  left, range -180..+180.
- `s`: arc length in mm along the mean profile curve, 0 at the waist,
  negative up into the bodice, positive down into the skirt. Constant-s
  rings are horizontal.
- Inputs are circumferences (ellipse perimeter, inverted via Ramanujan's
  approximation) + heights + total length; semi-axes interpolated with
  monotone cubics so the waist nip cannot overshoot.
- `ShellModel` (a(z), b(z) and derivatives) is the single geometry
  interface, so a bodice fitted to an imported dress-form mesh can slot in
  later without touching anything downstream. Parametric generation is the
  default and only path now.
