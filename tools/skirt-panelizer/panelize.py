#!/usr/bin/env python3
"""Skirt panelizer v1 — place one course of rigid e-ink panels on a
bell (truncated-cone) skirt, in its exact flat development.

Run manually from anywhere; outside the site's build path. Writes the
1:1 layout SVG and the placement report into the repo's `skirt/` static
directory (committed — the /skirt.html page displays them as-is).

Example:
    python3 tools/skirt-panelizer/panelize.py \
        --waist 660 --hem 1100 --slant 300 \
        --panel eink_42x90 --count 9 --course-offset 80
"""

import argparse
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from checks import check_course
from cone import ConeError, DevelopedCone
from panel_spec import PanelSpecError, load_panels
from placement import PlacementError, place_course
from svg_out import render_svg

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[1]


def parse_args(argv):
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    g = p.add_argument_group("skirt (truncated cone)")
    g.add_argument("--waist", type=float, default=660.0,
                   help="waist circumference, mm (default 660)")
    g.add_argument("--hem", type=float, default=1100.0,
                   help="hem circumference, mm (default 1100)")
    g.add_argument("--slant", type=float, default=300.0,
                   help="slant height waist->hem along the fabric, mm (default 300)")
    g = p.add_argument_group("panels")
    g.add_argument("--panels-file", type=Path, default=HERE / "panels.yaml",
                   help="panel library YAML (default: panels.yaml beside this script)")
    g.add_argument("--panel", default="eink_42x90",
                   help="panel id from the library (default eink_42x90)")
    g.add_argument("--count", type=int, default=9,
                   help="panels in the course; must be odd (default 9)")
    g.add_argument("--course-offset", type=float, default=80.0,
                   help="slant distance from the waist to the panels' top edge, mm (default 80)")
    g.add_argument("--chord-tolerance", type=float, default=2.0,
                   help="max acceptable chord-gap lift-off, mm (default 2)")
    g = p.add_argument_group("output")
    g.add_argument("--out-dir", type=Path, default=REPO_ROOT / "skirt",
                   help="directory for the SVG + report (default: <repo>/skirt)")
    g.add_argument("--svg-name", default="skirt-panel-layout.svg")
    g.add_argument("--report-name", default="placement-report.txt")
    return p.parse_args(argv)


def build_report(args, cone, spec, placed, gaps, warnings):
    deg = math.degrees
    rot = placed[0].rotation_deg
    coverage = 100.0 * args.count * spec.outline_area / cone.sector_area
    max_gap = max(g.gap for g in gaps)
    worst = min(g.local_radius for g in gaps)
    total_tail = sum(p.tail_run for p in placed)

    lines = [
        "SKIRT PANELIZER — placement report (v1: one course, one panel size)",
        "",
        f"skirt        waist {args.waist:g} mm | hem {args.hem:g} mm | slant {args.slant:g} mm",
        f"development  annulus inner R {cone.inner_radius:.2f} mm | outer R "
        f"{cone.outer_radius:.2f} mm | sweep {deg(cone.sweep_angle):.2f} deg",
        f"cone         half-angle {deg(cone.half_angle):.2f} deg | 3D radius at waist "
        f"{cone.radius_3d(cone.inner_radius):.1f} mm, at hem {cone.radius_3d(cone.outer_radius):.1f} mm",
        "",
        f"panel        '{spec.panel_id}'  outline {spec.outline_w:g} x {spec.outline_h:g} mm, "
        f"active {spec.active_w:g} x {spec.active_h:g} mm",
        f"course       {args.count} panels | top edge {args.course_offset:g} mm below waist "
        f"(developed R {placed[0].top_radius:.1f} mm) | transform {rot} deg on all panels",
        f"symmetry     active-area centers at uniform pitch "
        f"{deg(cone.sweep_angle) / args.count:.3f} deg, mirror-symmetric about CF",
        "",
        f"coverage     {coverage:.1f}% of the fabric ({args.count} x {spec.outline_area:g} mm^2 "
        f"of {cone.sector_area:.0f} mm^2)",
        f"chord gap    max {max_gap:.2f} mm at the waist-side edge "
        f"(local transverse R {worst:.1f} mm) | tolerance {args.chord_tolerance:g} mm",
        f"tail run     {placed[0].tail_run:.1f} mm per panel x {args.count} = {total_tail:.1f} mm total "
        f"(straight run, exit point to waist arc)",
    ]

    lines.append("")
    if warnings:
        lines.append("WARNINGS")
        lines.extend(f"  ! {w}" for w in warnings)
    else:
        lines.append("warnings     none")
    return "\n".join(lines) + "\n"


def main(argv=None):
    args = parse_args(argv)
    try:
        cone = DevelopedCone.from_measurements(args.waist, args.hem, args.slant)
        specs = load_panels(args.panels_file)
        if args.panel not in specs:
            raise PanelSpecError(
                f"panel '{args.panel}' not in library "
                f"({', '.join(sorted(specs))}) — see {args.panels_file}"
            )
        spec = specs[args.panel]
        placed, warnings = place_course(cone, spec, args.count, args.course_offset)
    except (ConeError, PanelSpecError, PlacementError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    gaps = check_course(cone, spec, placed, args.chord_tolerance)
    over = [g for g in gaps if g.over_tolerance]
    if over:
        warnings = warnings + [
            f"chord gap {over[0].gap:.2f} mm exceeds tolerance "
            f"{args.chord_tolerance:g} mm on {len(over)} of {len(gaps)} panels "
            f"(rigid {spec.outline_w:g} mm width on local transverse radius "
            f"{over[0].local_radius:.1f} mm)"
        ]

    report = build_report(args, cone, spec, placed, gaps, warnings)

    meta_lines = [
        f"waist {args.waist:g}  hem {args.hem:g}  slant {args.slant:g}  (mm)",
        f"annulus R {cone.inner_radius:.1f}-{cone.outer_radius:.1f}  "
        f"sweep {math.degrees(cone.sweep_angle):.2f} deg",
        f"panel {spec.panel_id}  x{args.count}  top edge {args.course_offset:g} mm below waist",
        f"max chord gap {max(g.gap for g in gaps):.2f} mm  "
        f"(tolerance {args.chord_tolerance:g} mm)",
        "outline solid - active area dashed - tail dot/arrow = cable exit",
    ]
    svg = render_svg(cone, spec, placed, meta_lines)

    args.out_dir.mkdir(parents=True, exist_ok=True)
    svg_path = args.out_dir / args.svg_name
    report_path = args.out_dir / args.report_name
    svg_path.write_text(svg, encoding="utf-8")
    report_path.write_text(report, encoding="utf-8")

    print(report)
    print(f"wrote {svg_path}")
    print(f"wrote {report_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
