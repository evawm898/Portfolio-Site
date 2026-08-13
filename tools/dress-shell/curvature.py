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

_H = 0.5  # mm finite-difference step for the profile second derivative

# The single named standoff tolerance. UNVALIDATED ASSUMPTION: 2 mm has not
# been physically tested — it is surfaced in the analysis JSON and the
# sweep below exists to show how the design shifts if the real number
# differs. Do not change the default silently.
STANDOFF_TOLERANCE_MM = 2.0
TOLERANCE_SWEEP_MM = (1.5, 2.0, 2.5, 3.0)

# Display floor for the reported min curvature radius. For dome_n < 2 the
# meridional curvature is GENUINELY SINGULAR at the hem (r'' ~ u^(n-2)) —
# a property of the superellipse, not an error. Radii below the floor are
# clamped for display and flagged; seating decisions never use them (they
# come from footprint sampling).
R_MIN_DISPLAY_FLOOR_MM = 5.0
HEM_SINGULAR_BAND_MM = 5.0   # meridian distance from the hem treated as the singular zone


def _second_derivative(f, z, z_lo, z_hi, h=_H):
    """f''(z) with one-sided stencils of CORRECT spacing near the domain
    ends — a clamped centered difference silently halves the step there and
    reports spurious values. Interior: centered; within h of an end: the
    second-order one-sided stencil anchored at z itself."""
    z_in = np.asarray(z, dtype=float)
    z = np.atleast_1d(z_in)
    out = np.empty_like(z)
    lo = z < z_lo + h
    hi = z > z_hi - h
    mid = ~(lo | hi)
    if np.any(mid):
        zm = z[mid]
        out[mid] = (f(zm + h) - 2.0 * f(zm) + f(zm - h)) / h**2
    if np.any(lo):
        zl = z[lo]
        out[lo] = (2.0 * f(zl) - 5.0 * f(zl + h) + 4.0 * f(zl + 2 * h)
                   - f(zl + 3 * h)) / h**2
    if np.any(hi):
        zh = z[hi]
        out[hi] = (2.0 * f(zh) - 5.0 * f(zh - h) + 4.0 * f(zh - 2 * h)
                   - f(zh - 3 * h)) / h**2
    return out.reshape(z_in.shape)


def fundamental_forms_numeric(model, theta_rad, z, dt=1e-3, dz=_H):
    """Numeric first/second fundamental forms of the GENERAL parametric
    surface X(theta, z) — required now that the skirt sections are
    elliptical with equal-arc theta (the surface is no longer a surface
    of revolution and the analytic revolution formulas do not apply).
    theta derivatives are periodic (centered); z derivatives use the same
    end-guarded one-sided stencils as everywhere else."""
    orig_shape = np.broadcast(np.asarray(theta_rad), np.asarray(z)).shape
    th = np.atleast_1d(np.asarray(theta_rad, dtype=float))
    zz = np.atleast_1d(np.asarray(z, dtype=float))
    th, zz = np.broadcast_arrays(th, zz)
    P = lambda t, x: model.point(t, x)

    z_lo, z_hi = model.z_bottom + dz, model.z_top - dz
    z_c = np.clip(zz, z_lo, z_hi)      # centered stencil anchor, guarded:
    # anchoring the z-stencil at a clipped interior point keeps correct
    # spacing; the offset from the true z is <= dz and the forms are
    # evaluated AT z via the theta row through the true z.
    X = P(th, zz)
    Xt = (P(th + dt, zz) - P(th - dt, zz)) / (2 * dt)
    Xtt = (P(th + dt, zz) - 2 * X + P(th - dt, zz)) / dt**2
    Xzc = (P(th, z_c + dz) - P(th, z_c - dz)) / (2 * dz)
    Xzz = (P(th, z_c + dz) - 2 * P(th, z_c) + P(th, z_c - dz)) / dz**2
    Xtz = ((P(th + dt, z_c + dz) - P(th - dt, z_c + dz)
            - P(th + dt, z_c - dz) + P(th - dt, z_c - dz)) / (4 * dt * dz))

    n = np.cross(Xzc, Xt)
    n = n / np.linalg.norm(n, axis=-1, keepdims=True)
    dot = lambda u, v: np.sum(u * v, axis=-1)
    rs = lambda arr: arr.reshape(orig_shape)   # 0-d in -> 0-d out
    return (rs(dot(Xt, Xt)), rs(dot(Xt, Xzc)), rs(dot(Xzc, Xzc)),
            rs(dot(Xtt, n)), rs(dot(Xtz, n)), rs(dot(Xzz, n)))


def fundamental_forms(model, theta_rad, z):
    """E, F, G, L, M, N (arrays ok) at (theta, z), outward normal.
    Swept-ellipse models route through the numeric general-surface path;
    plain profile models keep the analytic revolution-style forms.
    Second profile derivatives use end-guarded stencils (see
    _second_derivative) — never a clamped centered difference."""
    if getattr(model, "is_swept_ellipse", False):
        return fundamental_forms_numeric(model, theta_rad, z)
    a, b = model.a(z), model.b(z)
    da, db = model.da(z), model.db(z)
    dda = _second_derivative(model.a, z, model.z_bottom, model.z_top)
    ddb = _second_derivative(model.b, z, model.z_bottom, model.z_top)
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
    r_min: float                 # local minimum radius of curvature, mm (display-clamped)
    standoff_by_class: dict      # class_id -> max standoff mm (inf = does not fit)
    max_class: str               # largest seatable class id, or None
    r_min_clamped: bool = False  # True where the hem singularity hit the display floor


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


def analyze_cells(coords, chart, grid, classes, tolerance_mm=STANDOFF_TOLERANCE_MM,
                  samples=9):
    """CellAnalysis for every grid cell (vectorized curvature, per-cell
    standoff sampling). `classes` is the panels.yaml dict; class order for
    "largest" is by outline area. Classes marked requires_facet are
    EXCLUDED from seating — they never conform, they get facets."""
    cells = grid.cells
    tc = np.array([c.theta_c for c in cells])
    sc = np.array([c.s_c for c in cells])
    z = chart.coords.z_of_s(sc)
    k1, k2, K = principal_curvatures(chart.model, np.radians(tc), z)
    kmax = np.maximum(np.abs(k1), np.abs(k2))
    r_min_raw = np.where(kmax > 1e-12, 1.0 / kmax, np.inf)
    clamped = r_min_raw < R_MIN_DISPLAY_FLOOR_MM
    r_min = np.where(clamped, R_MIN_DISPLAY_FLOOR_MM, r_min_raw)

    by_size = sorted((c for c in classes.values() if not c.requires_facet),
                     key=lambda c: c.outline_area)
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
            r_min_clamped=bool(clamped[i]),
        ))
    return out


def class_distribution(analyses, tolerance_mm=None, classes=None):
    """{class_id_or_None: cell count}. With `tolerance_mm` and `classes`
    given, re-thresholds the cached standoffs at that tolerance instead of
    using the baked max_class — the basis of the sweep mode."""
    if tolerance_mm is None:
        dist = {}
        for a in analyses:
            dist[a.max_class] = dist.get(a.max_class, 0) + 1
        return dist
    order = [c.class_id for c in
             sorted((c for c in classes.values() if not c.requires_facet),
                    key=lambda c: c.outline_area)]
    dist = {}
    for a in analyses:
        best = None
        for cid in order:
            if a.standoff_by_class.get(cid, float("inf")) <= tolerance_mm:
                best = cid
        dist[best] = dist.get(best, 0) + 1
    return dist


def tolerance_sweep(analyses, classes, tolerances=TOLERANCE_SWEEP_MM):
    """{tolerance: distribution} over the sweep — how the max-class map
    shifts if the unvalidated 2 mm assumption is wrong."""
    return {tol: class_distribution(analyses, tol, classes) for tol in tolerances}


def required_radius(cls, tolerance_mm=STANDOFF_TOLERANCE_MM):
    """Chord-model minimum local radius of curvature to seat this class:
    w^2/(8*tol) per footprint axis. The binding axis is whichever crosses
    the more curved direction; both are reported."""
    return {"across_width": cls.outline_w**2 / (8.0 * tolerance_mm),
            "across_height": cls.outline_h**2 / (8.0 * tolerance_mm)}


def meridional_radius_profile(model, coords, n_samples=2000,
                              singular_band_mm=HEM_SINGULAR_BAND_MM):
    """Min meridional curvature radius along the profile and where it
    occurs, with the hem singularity separated from genuine problem
    regions. Returns a dict:
      hem_singular: True when dome_n < 2 (r'' diverges at u -> 0)
      min_radius_mm / at_s_mm: minimum OUTSIDE the singular band
      band_min_radius_mm: raw minimum inside the band (display only)
    """
    s_hi = coords.s_max
    ss = np.linspace(0.0, s_hi, n_samples + 1)
    z = coords.z_of_s(ss)
    k1, k2, _ = principal_curvatures(model, np.zeros_like(z), z)
    # meridional reference along the CF meridian: the plane curve
    # (b(z), z), curvature b''/(1+b'^2)^1.5 with end-guarded stencils —
    # valid for elliptical sections (at CF the meridian lies in x = 0)
    db = model.db(z)
    ddb = _second_derivative(model.b, z, model.z_bottom, model.z_top)
    k_ref = ddb / (1.0 + db ** 2) ** 1.5
    d1 = np.abs(k1 - k_ref)
    d2 = np.abs(k2 - k_ref)
    k_mer = np.where(d1 <= d2, k1, k2)
    with np.errstate(divide="ignore"):
        r_mer = 1.0 / np.maximum(np.abs(k_mer), 1e-15)
    dist_to_hem = s_hi - ss
    outside = dist_to_hem > singular_band_mm
    idx = int(np.argmin(np.where(outside, r_mer, np.inf)))
    inside_vals = r_mer[~outside]
    return {
        "hem_singular": bool(getattr(model, "n", 2.0) < 2.0),
        "min_radius_mm": float(r_mer[idx]),
        "at_s_mm": float(ss[idx]),
        "band_min_radius_mm": float(inside_vals.min()) if inside_vals.size else None,
        "singular_band_mm": singular_band_mm,
    }
