"""FLAT FACET mechanism: locally flattening the shell to receive a panel
class marked `requires_facet: true` (the 7.5" cannot conform anywhere on
this garment — the facet is a deliberate design move, not a fallback).

A facet is authored as an ordinary placement at (theta, s) and obeys the
same symmetry rules: theta == 0 is single, off-center facets derive twin
facets. For each facet panel the shell surface is replaced, across the
panel's outline footprint, by the panel's tangent plane at its active
center; a blend band of configurable width around the footprint ramps
the displacement smoothly to zero.

`apply_facets` deforms an existing shell vertex array (with per-vertex
(theta, s)) and returns per-facet DEVIATION statistics — max and RMS
distance the shell moved, in mm — so the silhouette cost is visible.
"""

import math
from dataclasses import dataclass

import numpy as np

from layout import _frame_offset, wrap180

BLEND_MM_DEFAULT = 15.0


@dataclass(frozen=True)
class FacetReport:
    panel_id: str
    theta: float
    s: float
    max_deviation_mm: float
    rms_deviation_mm: float
    affected_vertices: int


def _smoothstep(t):
    t = np.clip(t, 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def facet_panels(placed):
    return [p for p in placed if p.valid and p.cls.requires_facet]


def apply_facets(chart, coords, vertices, theta_s, placed,
                 blend_mm=BLEND_MM_DEFAULT):
    """Deform `vertices` (n,3) with per-vertex (theta, s) in `theta_s`
    (n,2) so every facet panel's footprint lies in its tangent plane.

    Returns (deformed_vertices, [FacetReport]). Input arrays are not
    modified. Twin facets arrive as ordinary placed panels and each get
    their own report entry.
    """
    V = np.array(vertices, dtype=float)
    ts = np.asarray(theta_s, dtype=float)
    reports = []

    for p in facet_panels(placed):
        cls = p.cls
        f = coords.forward(p.theta, p.s)
        p0 = np.asarray(f["position"], dtype=float)
        n = np.asarray(f["normal"], dtype=float)
        n = n / np.linalg.norm(n)

        # footprint rectangle in chart space (same convention as layering)
        dxo, dyo = _frame_offset(cls, p.rotation, (cls.outline_w / 2.0,
                                                   cls.outline_h / 2.0))
        r = chart.r_theta(p.theta, p.s)
        mm_per_deg = math.pi * r / 180.0
        tc = p.theta + dxo / mm_per_deg
        sc = p.s + dyo
        half_w = 0.5 * cls.outline_w          # mm, lateral
        half_h = 0.5 * cls.outline_h          # mm, meridian

        # signed chart offsets in mm, rotated back into the panel frame so
        # the footprint test is a plain rectangle at any rotation
        d_theta_mm = wrap180(ts[:, 0] - tc) * mm_per_deg
        d_s_mm = ts[:, 1] - sc
        cr = math.cos(math.radians(p.rotation))
        sr = math.sin(math.radians(p.rotation))
        x_local = cr * d_theta_mm + sr * d_s_mm
        y_local = -sr * d_theta_mm + cr * d_s_mm
        # distance outside the rectangle (0 inside), in mm
        out = np.hypot(np.maximum(np.abs(x_local) - half_w, 0.0),
                       np.maximum(np.abs(y_local) - half_h, 0.0))
        factor = 1.0 - _smoothstep(out / blend_mm)
        mask = factor > 1e-6
        if not np.any(mask):
            reports.append(FacetReport(p.panel_id, p.theta, p.s, 0.0, 0.0, 0))
            continue

        # project affected vertices onto the tangent plane along its normal
        signed = (V[mask] - p0) @ n
        disp = factor[mask] * signed
        V[mask] -= disp[:, None] * n

        reports.append(FacetReport(
            panel_id=p.panel_id, theta=p.theta, s=p.s,
            max_deviation_mm=float(np.max(np.abs(disp))),
            rms_deviation_mm=float(np.sqrt(np.mean(disp**2))),
            affected_vertices=int(mask.sum()),
        ))
    return V, reports
