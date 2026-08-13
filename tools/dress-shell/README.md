# Dress Shell — Milestone 1 (in progress)

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
| `panels.py` / `panels.yaml` | panel size-class library: outline, thickness, active area, fixed connector; loud validation |
| `layout.py` / `layout.yaml` | committed SOURCE OF TRUTH; lossless canonical IO; one-sided authoring with derived twins |
| `test_layout.py` | lossless round-trip, loud-failure, and mirroring/connector-derivation tests |
| `shell_report.py` | console report: dimensions + round-trip accuracy |
| `preview.py` | scratch SVG preview of the silhouette (writes to `out/`, gitignored) |

Awaiting review before UI: the twin-derivation semantics below. Then: grid +
curvature/max-class analysis, glTF export, the local editor (dev-only, local
save server), and the read-only /dress route.

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
