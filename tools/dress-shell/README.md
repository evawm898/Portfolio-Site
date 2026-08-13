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

Foundation layer (awaiting review before anything is built on it):

| file | concern |
| --- | --- |
| `shell.py` | parametric shell: profile + elliptical sections whose axis ratio varies with height; FRONT/BACK meshes |
| `coords.py` | body-centered (theta, s) coordinates: exact forward/inverse maps, tangent frames |
| `test_coords.py` | round-trip + convention tests (waist, bust apex, hem edge, max flare, dense sweeps) |
| `shell_report.py` | console report: dimensions + round-trip accuracy |
| `preview.py` | scratch SVG preview of the silhouette (writes to `out/`, gitignored) |

Still to come in milestone 1 (deliberately not built yet): the (theta, s)
snap grid, per-cell curvature + max-seatable-panel-class analysis,
`panels.yaml`, glTF export, and the local three.js dev viewer. **No placement
editor in this milestone.**

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
