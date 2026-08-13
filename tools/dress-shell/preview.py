#!/usr/bin/env python3
"""Quick visual preview of the parametric shell (milestone-1 review aid).

Writes out/shell-preview.svg: front + side elevations, control
cross-sections, and an isometric wireframe of the two pieces. A scratch
artifact for eyeballing the silhouette — not a site asset (out/ is
gitignored).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np

from shell import ShellModel, ShellParams

INK = "#141616"
FRONT_C = "#1c6b6b"
BACK_C = "#9aa4a4"
FAINT = "#b9c0c0"


def fmt(v):
    return f"{v:.2f}".rstrip("0").rstrip(".")


def path_of(points, close=False):
    d = "M " + " L ".join(f"{fmt(x)} {fmt(y)}" for x, y in points)
    return d + (" Z" if close else "")


def panel_curves(model):
    z = np.linspace(model.z_bottom, model.z_top, 400)
    return z, model.a(z), model.b(z)


def main():
    model = ShellModel(ShellParams())
    z, a, b = panel_curves(model)

    svg = []
    W, H = 1500, 940
    svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
               f'viewBox="0 0 {W} {H}" font-family="IBM Plex Mono, Menlo, monospace">')
    svg.append(f'<rect width="{W}" height="{H}" fill="#ffffff"/>')

    def elevation(x0, half_width, title):
        """One elevation panel: silhouette ±half_width(z), z up."""
        cx, top_pad = x0 + 260, 80
        scale = 0.9
        y_of = lambda zz: top_pad + (model.z_top - zz) * scale
        pts_r = [(cx + hw * scale, y_of(zz)) for zz, hw in zip(z, half_width)]
        pts_l = [(cx - hw * scale, y_of(zz)) for zz, hw in zip(z[::-1], half_width[::-1])]
        svg.append(f'<path d="{path_of(pts_r + pts_l, close=True)}" fill="#eef1f1" '
                   f'stroke="{INK}" stroke-width="1.4"/>')
        for ring in model.rings:
            y = y_of(ring.z)
            svg.append(f'<line x1="{cx - 235}" y1="{fmt(y)}" x2="{cx + 205}" y2="{fmt(y)}" '
                       f'stroke="{FAINT}" stroke-width="0.7" stroke-dasharray="5 4"/>')
            svg.append(f'<text x="{cx - 240}" y="{fmt(y + 3.5)}" font-size="11" fill="#5a6363" '
                       f'text-anchor="end">{ring.name} {fmt(ring.z)}</text>')
        svg.append(f'<text x="{cx}" y="40" font-size="14" fill="{INK}" '
                   f'text-anchor="middle" font-weight="500">{title}</text>')

    elevation(60, a, "FRONT VIEW (width, +-a)")
    elevation(560, b, "SIDE VIEW (depth, +-b)")

    # Cross-sections at the control rings.
    cx, cy, scale = 1130, 265, 0.72
    t = np.linspace(0, 2 * np.pi, 181)
    for ring in model.rings:
        av, bv = float(model.a(ring.z)), float(model.b(ring.z))
        pts = [(cx + av * scale * np.sin(tt), cy - bv * scale * np.cos(tt)) for tt in t]
        emph = ring.name in ("waist", "hem")
        svg.append(f'<path d="{path_of(pts, close=True)}" fill="none" '
                   f'stroke="{FRONT_C if emph else BACK_C}" stroke-width="{1.6 if emph else 1.0}"/>')
        svg.append(f'<text x="{fmt(cx + av * scale + 6)}" y="{fmt(cy + 4)}" font-size="10" '
                   f'fill="#5a6363" visibility="hidden">.</text>')
    svg.append(f'<text x="{cx}" y="40" font-size="14" fill="{INK}" text-anchor="middle" '
               f'font-weight="500">CROSS-SECTIONS (waist + hem in petrol)</text>')
    svg.append(f'<line x1="{cx}" y1="{cy - 200}" x2="{cx}" y2="{cy + 200}" '
               f'stroke="{FAINT}" stroke-width="0.7" stroke-dasharray="2 3"/>')
    svg.append(f'<text x="{cx + 4}" y="{fmt(cy - 188)}" font-size="10" fill="#5a6363">CF (theta=0)</text>')

    # Isometric wireframe, front piece petrol / back piece gray.
    def iso(p):
        u = (p[..., 0] - p[..., 1]) * 0.866
        v = (p[..., 0] + p[..., 1]) * 0.5 - p[..., 2]
        return u, v
    ox, oy, s2 = 1130, 720, 0.42
    z_rings = np.arange(model.z_bottom, model.z_top + 1, 25.0)
    th_front = np.radians(np.linspace(-90, 90, 61))
    th_back = np.radians(np.linspace(90, 270, 61))
    for zz in z_rings:
        for th, color in ((th_back, BACK_C), (th_front, FRONT_C)):
            p = model.point(th, np.full_like(th, zz))
            u, v = iso(p)
            pts = list(zip(ox + u * s2, oy + (v - 125) * s2))
            svg.append(f'<path d="{path_of(pts)}" fill="none" stroke="{color}" '
                       f'stroke-width="0.7" opacity="0.85"/>')
    z_line = np.linspace(model.z_bottom, model.z_top, 120)
    for deg in range(-180, 180, 15):
        th = np.radians(np.full_like(z_line, deg))
        p = model.point(th, z_line)
        u, v = iso(p)
        color = FRONT_C if -90 <= deg <= 90 else BACK_C
        pts = list(zip(ox + u * s2, oy + (v - 125) * s2))
        svg.append(f'<path d="{path_of(pts)}" fill="none" stroke="{color}" '
                   f'stroke-width="0.55" opacity="0.6"/>')
    svg.append(f'<text x="{ox}" y="520" font-size="14" fill="{INK}" text-anchor="middle" '
               f'font-weight="500">ISOMETRIC — FRONT piece petrol, BACK piece gray</text>')

    svg.append("</svg>")
    out = Path(__file__).parent / "out" / "shell-preview.svg"
    out.parent.mkdir(exist_ok=True)
    out.write_text("\n".join(svg), encoding="utf-8")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
