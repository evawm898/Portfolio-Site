"""1:1-scale SVG rendering of the developed annulus with placed panels.

One SVG user unit = 1 mm; the root element carries physical mm width and
height, so the file prints at true scale. Panel outlines are solid,
active areas dashed, tail exit points marked with a dot and a direction
arrow. Drawn light-on-white for print/plot use (the site page frames it
on its own background).
"""

import math

MARGIN = 20.0          # mm of blank border around the drawing
ARROW_LEN = 14.0       # mm, tail direction arrows
INK = "#141616"
FABRIC = "#f2f2ef"
ACTIVE = "#1c6b6b"
TAIL = "#a3520f"
FAINT = "#6b7474"


def _fmt(x):
    s = f"{x:.3f}".rstrip("0").rstrip(".")
    return "0" if s == "-0" else s


def _polar(r, phi):
    return (r * math.sin(phi), r * math.cos(phi))


def _poly_points(points):
    return " ".join(f"{_fmt(x)},{_fmt(y)}" for x, y in points)


def render_svg(cone, spec, placed, meta_lines):
    half = cone.sweep_angle / 2.0
    r_in, r_out = cone.inner_radius, cone.outer_radius

    # Bounding box over everything that gets drawn (apex included).
    pts = [(0.0, 0.0)]
    steps = max(int(math.degrees(cone.sweep_angle) / 2.0), 8)
    for i in range(steps + 1):
        phi = -half + cone.sweep_angle * i / steps
        pts.append(_polar(r_in, phi))
        pts.append(_polar(r_out, phi))
    for panel in placed:
        pts.extend(panel.outline_corners)
        tip = (panel.tail_point[0] + ARROW_LEN * panel.tail_direction[0],
               panel.tail_point[1] + ARROW_LEN * panel.tail_direction[1])
        pts.append(tip)
    pts.append(_polar(r_out + 14.0, 0.0))  # CF label

    min_x = min(p[0] for p in pts)
    max_x = max(p[0] for p in pts)
    min_y = min(p[1] for p in pts)
    max_y = max(p[1] for p in pts)
    width = (max_x - min_x) + 2 * MARGIN
    height = (max_y - min_y) + 2 * MARGIN
    tx, ty = -min_x + MARGIN, -min_y + MARGIN

    out = []
    out.append(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{_fmt(width)}mm" '
        f'height="{_fmt(height)}mm" viewBox="0 0 {_fmt(width)} {_fmt(height)}" '
        f'font-family="IBM Plex Mono, Menlo, Consolas, monospace">'
    )
    out.append(
        '<defs><marker id="tailArrow" markerUnits="userSpaceOnUse" '
        'markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">'
        f'<path d="M0,0 L6,3 L0,6 Z" fill="{TAIL}"/></marker></defs>'
    )
    out.append(f'<rect width="{_fmt(width)}" height="{_fmt(height)}" fill="#ffffff"/>')
    out.append(f'<g transform="translate({_fmt(tx)} {_fmt(ty)})">')

    # Annular sector. Inner arc runs -half -> +half (screen angle decreasing,
    # sweep-flag 0), outer arc runs back (sweep-flag 1).
    a_in, b_in = _polar(r_in, -half), _polar(r_in, half)
    a_out, b_out = _polar(r_out, -half), _polar(r_out, half)
    large = 1 if cone.sweep_angle > math.pi else 0
    out.append(
        f'<path d="M {_fmt(a_in[0])} {_fmt(a_in[1])} '
        f'A {_fmt(r_in)} {_fmt(r_in)} 0 {large} 0 {_fmt(b_in[0])} {_fmt(b_in[1])} '
        f'L {_fmt(b_out[0])} {_fmt(b_out[1])} '
        f'A {_fmt(r_out)} {_fmt(r_out)} 0 {large} 1 {_fmt(a_out[0])} {_fmt(a_out[1])} Z" '
        f'fill="{FABRIC}" stroke="{INK}" stroke-width="0.5"/>'
    )

    # Apex crosshair (the alignment origin for the whole pattern).
    out.append(
        f'<path d="M -6 0 L 6 0 M 0 -6 L 0 6" stroke="{FAINT}" stroke-width="0.4"/>'
    )
    out.append(
        f'<text x="9" y="1.8" font-size="4.2" fill="{FAINT}">apex / annulus center</text>'
    )

    # Center-front line and seam labels.
    cf_in, cf_out = _polar(r_in, 0.0), _polar(r_out, 0.0)
    out.append(
        f'<line x1="{_fmt(cf_in[0])}" y1="{_fmt(cf_in[1])}" '
        f'x2="{_fmt(cf_out[0])}" y2="{_fmt(cf_out[1])}" '
        f'stroke="{FAINT}" stroke-width="0.35" stroke-dasharray="8 3 1.5 3"/>'
    )
    cf_lbl = _polar(r_out + 9.0, 0.0)
    out.append(
        f'<text x="{_fmt(cf_lbl[0])}" y="{_fmt(cf_lbl[1])}" font-size="5" '
        f'fill="{INK}" text-anchor="middle">CF</text>'
    )
    for sign in (-1, 1):
        cb = _polar(r_out + 9.0, sign * half)
        out.append(
            f'<text x="{_fmt(cb[0])}" y="{_fmt(cb[1])}" font-size="5" '
            f'fill="{FAINT}" text-anchor="middle">CB</text>'
        )

    # Panels.
    for panel in placed:
        out.append(
            f'<polygon points="{_poly_points(panel.outline_corners)}" '
            f'fill="#e5eaea" stroke="{INK}" stroke-width="0.45"/>'
        )
        out.append(
            f'<polygon points="{_poly_points(panel.active_corners)}" '
            f'fill="none" stroke="{ACTIVE}" stroke-width="0.4" stroke-dasharray="3 2"/>'
        )
        acx, acy = panel.active_center
        out.append(
            f'<path d="M {_fmt(acx - 2)} {_fmt(acy)} L {_fmt(acx + 2)} {_fmt(acy)} '
            f'M {_fmt(acx)} {_fmt(acy - 2)} L {_fmt(acx)} {_fmt(acy + 2)}" '
            f'stroke="{ACTIVE}" stroke-width="0.4"/>'
        )
        tpx, tpy = panel.tail_point
        tipx = tpx + ARROW_LEN * panel.tail_direction[0]
        tipy = tpy + ARROW_LEN * panel.tail_direction[1]
        out.append(
            f'<line x1="{_fmt(tpx)}" y1="{_fmt(tpy)}" x2="{_fmt(tipx)}" y2="{_fmt(tipy)}" '
            f'stroke="{TAIL}" stroke-width="0.5" marker-end="url(#tailArrow)"/>'
        )
        out.append(f'<circle cx="{_fmt(tpx)}" cy="{_fmt(tpy)}" r="1.4" fill="{TAIL}"/>')
        cx = sum(p[0] for p in panel.outline_corners) / 4.0
        cy = sum(p[1] for p in panel.outline_corners) / 4.0
        out.append(
            f'<text x="{_fmt(cx)}" y="{_fmt(cy + 2)}" font-size="6" fill="{FAINT}" '
            f'text-anchor="middle">{panel.index}</text>'
        )

    out.append("</g>")

    # Meta block, top-left (the sector opens downward, so this corner is empty).
    y = MARGIN + 4
    out.append(
        f'<text x="{_fmt(MARGIN - 6)}" y="{_fmt(y)}" font-size="6.5" fill="{INK}" '
        f'font-weight="500">SKIRT PANELIZER — developed layout</text>'
    )
    y += 9
    for line in meta_lines:
        out.append(
            f'<text x="{_fmt(MARGIN - 6)}" y="{_fmt(y)}" font-size="4.6" '
            f'fill="#3a4040">{_escape(line)}</text>'
        )
        y += 6.4

    # 100 mm scale bar — the check that a print really is 1:1.
    y += 4
    x0 = MARGIN - 6
    out.append(
        f'<path d="M {_fmt(x0)} {_fmt(y - 2.5)} L {_fmt(x0)} {_fmt(y + 2.5)} '
        f'M {_fmt(x0)} {_fmt(y)} L {_fmt(x0 + 100)} {_fmt(y)} '
        f'M {_fmt(x0 + 100)} {_fmt(y - 2.5)} L {_fmt(x0 + 100)} {_fmt(y + 2.5)}" '
        f'stroke="{INK}" stroke-width="0.5"/>'
    )
    out.append(
        f'<text x="{_fmt(x0 + 104)}" y="{_fmt(y + 1.6)}" font-size="4.6" '
        f'fill="#3a4040">100 mm — SCALE 1:1, print at 100%</text>'
    )

    out.append("</svg>")
    return "\n".join(out) + "\n"


def _escape(text):
    return (text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
