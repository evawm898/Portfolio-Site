# Skirt Panelizer (v1)

Design tool for placing rigid e-ink panels on a bell-shaped (truncated-cone)
skirt. The cone is developable, so it unrolls exactly onto a flat annular
sector; panels are placed in that 2D developed space and the layout is
emitted as a 1:1 SVG plus a console/text report.

**This tool is outside the site's build path.** It runs manually, and its
final outputs (`skirt/skirt-panel-layout.svg`, `skirt/placement-report.txt`)
are committed static files that the `/skirt.html` page displays as-is. The
page never invokes Python at request or build time.

## Run

```
pip install -r tools/skirt-panelizer/requirements.txt   # PyYAML only
python3 tools/skirt-panelizer/panelize.py \
    --waist 660 --hem 1100 --slant 300 \
    --panel eink_42x90 --count 9 --course-offset 80
```

All flags have defaults (the values above). `--help` lists everything,
including `--chord-tolerance` (default 2 mm) and output paths.

## Modules

| file | concern |
| --- | --- |
| `cone.py` | waist/hem/slant → developed annulus (radii, sweep, curvature) |
| `panel_spec.py` | loads + hard-validates `panels.yaml` |
| `placement.py` | one concentric course: symmetry solve, per-panel pose |
| `checks.py` | chord-gap (flat-panel lift-off) check |
| `svg_out.py` | 1:1 SVG writer |
| `panelize.py` | CLI: orchestrates the above, prints/writes the report |

## Conventions

- Units: mm everywhere; angles in radians internally, degrees in reports.
- Panel-local frame: origin at the outline's top-left, +x right, +y down,
  viewed face-on; the top edge faces the waist when placed.
- Developed frame: annulus center (apex) at the origin, center front is the
  sector bisector, pattern viewed from the outside of the garment.
- Symmetry applies to ACTIVE-AREA centers about center front; outline and
  tail positions are derived per panel, never mirrored.
- Allowed per-panel transforms: identity and 180° rotation. Tails must
  point toward the waist; transforms violating that are rejected.
- Chord gap uses the cone's transverse normal-section radius
  (`s·tan(half-angle)`, Meusnier) — the curvature a rigid panel actually
  bridges — evaluated at the panel's waist-side edge (worst case).

Intermediate/scratch outputs belong in `tools/skirt-panelizer/out/`
(gitignored); the committed outputs in `skirt/` are the only published ones.
