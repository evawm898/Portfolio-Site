"""Per-cell curvature analysis and max-seatable-panel-class map.

For every grid cell (evaluated at the cell center):
  - principal curvatures k1 >= k2, Gaussian curvature K = k1*k2
    (signed; with the outward normal a convex direction is negative)
  - local minimum radius of curvature 1 / max(|k1|, |k2|)
  - MAX SEATABLE PANEL CLASS: for each class, a flat panel of that
    outline is seated tangent at the cell center and the true maximum
    standoff between the flat footprint and the curved shell is sampled
    across the whole footprint; the largest class whose standoff stays
    under the tolerance is the cell's class.

Curvature uses the exact fundamental forms of the swept surface
P(theta, z) = (a(z) sin t, b(z) cos t, z); the only numerical step is a
central difference for a'', b'' (PCHIP is C1). The standoff is a direct
geometric sampling, not a curvature estimate — it is the same quantity
the editor checks live per placed panel.

Uses only the stable public API of shell.py / coords.py.
"""

import math
from dataclasses import dataclass

import numpy as np

_H = 0.5  # mm central-difference step for the profile second derivative


def fundamental_forms(model, theta_rad, z):
    """E, F, G, L, M, N (arrays ok) at (theta, z), outward normal."""
    a, b = model.a(z), model.b(z)
    da, db = model.da(z), model.db(z)
    dda = (model.da(z + _H) - model.da(z - _H)) / (2.0 * _H)
    ddb = (model.db(z + _H) - model.db(z - _H)) / (2.0 * _H)
    sin, cos = np.sin(theta_rad), np.cos(theta_rad)

    p_t = np.stack(np.broadcast_arrays(a * cos, -b * sin, np.zeros_like(sin)), axis=-1)
    p_z = np.stack(np.broadcast_arrays(da * sin, db * cos, np.ones_like(sin)), axis=-1)
    p_tt = np.stack(np.broadcast_arrays(-a * sin, -b * cos, np.zeros_like(sin)), axis=-1)
    p_tz = np.stack(np.broadcast_arrays(da * cos, -db * sin, np.zeros_like(sin)), axis=-1)
    p_zz = np.stack(np.broadcast_arrays(dda * sin, ddb * cos, np.zeros_like(sin)), axis=-1)

    n = np.cross(p_z, p_t)
    n = n / np.linalg.norm(n, axis=-1, keepdims=True)

    dot = lambda u, v: np.sum(u * v, axis=-1)
    return (dot(p_t, p_t), dot(p_t, p_z), dot(p_z, p_z),
            dot(p_tt, n), dot(p_tz, n), dot(p_zz, n))


def principal_curvatures(model, theta_rad, z):
    """k1 >= k2 (signed, outward normal) and Gaussian K."""
    E, F, G, L, M, N = fundamental_forms(model, theta_rad, z)
    denom = E * G - F * F
    K = (L * N - M * M) / denom
    H = (E * N - 2.0 * F * M + G * L) / (2.0 * denom)
    disc = np.sqrt(np.maximum(H * H - K, 0.0))
    return H + disc, H - disc, K


@dataclass(frozen=True)
class CellAnalysis:
    cell_index: int
    k1: float
    k2: float
    gaussian: float
    r_min: float                 # local minimum radius of curvature, mm
    standoff_by_class: dict      # class_id -> max standoff mm (inf = does not fit)
    max_class: str               # largest seatable class id, or None


def seat_standoff(coords, chart, outline_w, outline_h, theta, s, samples=9):
    """True max standoff of a flat outline_w x outline_h panel seated
    tangent at (theta, s): sample the shell across the footprint and
    measure distance from the tangent plane along its normal.

    Returns inf when the footprint runs off the shell (top/hem) or would
    cross a piece seam — the panel simply does not fit there.
    """
    f = coords.forward(theta, s)
    p0, n = f["position"], f["normal"]

    u = np.linspace(-0.5 * outline_w, 0.5 * outline_w, samples)
    v = np.linspace(-0.5 * outline_h, 0.5 * outline_h, samples)
    U, V = np.meshgrid(u, v)

    s_pts = s + V
    if np.any(s_pts < chart.s_min - 1e-9) or np.any(s_pts > chart.s_max + 1e-9):
        return float("inf")
    r = chart.r_theta(theta, s)
    t_pts = theta + np.degrees(U / r)
    # piece containment: footprint may not cross the side seams
    lam0 = (theta + 180.0) % 360.0 - 180.0
    center = 0.0 if abs(lam0) < 90.0 else 180.0
    lam = (t_pts - center + 180.0) % 360.0 - 180.0
    if np.any(np.abs(lam) >= 90.0):
        return float("inf")

    fp = coords.forward(t_pts.ravel(), s_pts.ravel())
    d = (fp["position"] - p0) @ n
    return float(np.max(np.abs(d)))


def analyze_cells(coords, chart, grid, classes, tolerance_mm=2.0, samples=9):
    """CellAnalysis for every grid cell (vectorized curvature, per-cell
    standoff sampling). `classes` is the panels.yaml dict; class order for
    "largest" is by outline area."""
    cells = grid.cells
    tc = np.array([c.theta_c for c in cells])
    sc = np.array([c.s_c for c in cells])
    z = chart.coords.z_of_s(sc)
    k1, k2, K = principal_curvatures(chart.model, np.radians(tc), z)
    kmax = np.maximum(np.abs(k1), np.abs(k2))
    r_min = np.where(kmax > 1e-12, 1.0 / kmax, np.inf)

    by_size = sorted(classes.values(), key=lambda c: c.outline_area)
    out = []
    for i, cell in enumerate(cells):
        standoffs = {}
        best = None
        for cls in by_size:
            so = seat_standoff(coords, chart, cls.outline_w, cls.outline_h,
                               float(tc[i]), float(sc[i]), samples)
            standoffs[cls.class_id] = so
            if so <= tolerance_mm:
                best = cls.class_id   # classes ascend by area; keep largest
        out.append(CellAnalysis(
            cell_index=cell.index,
            k1=float(k1[i]), k2=float(k2[i]), gaussian=float(K[i]),
            r_min=float(r_min[i]),
            standoff_by_class=standoffs,
            max_class=best,
        ))
    return out


def class_distribution(analyses):
    """{class_id_or_None: cell count} across the shell."""
    dist = {}
    for a in analyses:
        dist[a.max_class] = dist.get(a.max_class, 0) + 1
    return dist
