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
- The mirror applies to the ACTIVE AREA CENTER. The twin's outline and
  connector are derived from the class (the physical part is never
  mirrored): the derivation tries the source's rotation first, then 180,
  and keeps the first whose connector is LEGAL; if neither, the twin is
  marked INVALID with reasons.
- Geometric connector legality: the connector origin and its straight
  escape run (`escape_mm`) must stay on the panel's own piece — not cross
  the side seams at theta = +-90 and not run off the top or hem edge.
  Occlusion-level escape checks are separate (layering).
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
