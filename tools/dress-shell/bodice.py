"""Bodice cross-section solver — GATE STAGE ONLY, no shell geometry.

The bodice is a sculptural corset read from the SIDE profile: nearly a
straight taper in silhouette, with the shaping carried by the ELLIPSE
RATIO of each cross-section (a side-to-side, b front-to-back, both
functions of height v above the waist).

This module SOLVES the anchor sections from (circumference, ratio) via
Ramanujan's second perimeter approximation (linear in uniform scale, so
the inversion is a single division and the residual is machine-level),
interpolates a(v), b(v) with monotone PCHIP (no overshoot, no uninvited
inflections), and provides the plan-view curvature analysis. It does NOT
build any surface: shell integration is gated on the solved sections
being approved and on the blocked inputs (underbust circumference,
neckline curve, top height, waist plan-shape decision).

Anchors marked estimated=True carry values the user gave as estimates
("TO BE SOLVED not assumed" — they parameterize the preview and are
listed as provisional until confirmed).
"""

import math
from dataclasses import dataclass

import numpy as np
from scipy.interpolate import PchipInterpolator


def ellipse_perimeter(a: float, b: float) -> float:
    """Ramanujan's second approximation (relative error < 1e-9 at these
    aspect ratios up to ~3)."""
    h = ((a - b) / (a + b)) ** 2
    return math.pi * (a + b) * (1.0 + 3.0 * h / (10.0 + math.sqrt(4.0 - 3.0 * h)))


def solve_semi_axes(circumference: float, ratio: float):
    """(a, b, residual): semi-axes with a/b == ratio hitting the target
    perimeter under Ramanujan's formula. The formula is linear in uniform
    scale, so the solve is exact for the formula; residual reports the
    round-trip anyway."""
    unit = ellipse_perimeter(ratio, 1.0)
    b = circumference / unit
    a = ratio * b
    return a, b, ellipse_perimeter(a, b) - circumference


@dataclass(frozen=True)
class BodiceAnchor:
    name: str
    v: float                # height above the waist plane, mm
    circumference: float    # mm
    ratio: float            # a / b
    estimated: bool = False

    def solved(self):
        a, b, res = solve_semi_axes(self.circumference, self.ratio)
        return {"name": self.name, "v": self.v, "a": a, "b": b,
                "ratio": self.ratio, "circumference": self.circumference,
                "residual_mm": res, "estimated": self.estimated}


# Confirmed body measurements + estimated ratios (ratios flagged).
# Circumferences: waist 24 in, underbust 28 in, bust 34 in are GIVEN;
# above_bust 32 in is UNVERIFIED — a garment-convention estimate the
# user supplied for the neckline band, not a measurement. Every ratio is
# an estimate awaiting confirmation: underbust is interpolated linearly
# in height between the waist and bust ratio estimates
# (1.5 + 0.5 * 152.4/203.2 = 1.875); above_bust HOLDS the bust ratio
# (2.0) rather than inventing a trend beyond the data.
DEFAULT_ANCHORS = (
    BodiceAnchor("waist", 0.0, 609.6, 1.5, estimated=True),        # ratio est.
    BodiceAnchor("underbust", 152.4, 711.2, 1.875, estimated=True),  # ratio est.
    BodiceAnchor("bust apex", 203.2, 863.6, 2.0, estimated=True),  # ratio est.
    BodiceAnchor("above bust", 254.0, 812.8, 2.0, estimated=True),  # UNVERIFIED
)

# The 3-anchor set: sections HELD CONSTANT above the bust apex (the
# alternative above-bust rule, kept for the taper-vs-constant comparison).
ANCHORS_TO_BUST = DEFAULT_ANCHORS[:3]


class BodiceSections:
    """Monotone a(v), b(v) through the solved anchors. With only the two
    known anchors PCHIP degenerates to a straight taper — consistent with
    the side-profile description — and picks up the underbust anchor the
    moment its circumference exists."""

    def __init__(self, anchors=DEFAULT_ANCHORS):
        rows = sorted((an.solved() for an in anchors), key=lambda r: r["v"])
        if len(rows) < 2:
            raise ValueError("need at least waist and bust anchors")
        self.rows = rows
        v = np.array([r["v"] for r in rows])
        self.v_top = float(v[-1])
        self._a = PchipInterpolator(v, np.array([r["a"] for r in rows]))
        self._b = PchipInterpolator(v, np.array([r["b"] for r in rows]))
        self._da = self._a.derivative()
        self._db = self._b.derivative()

    def a(self, v):
        return self._a(np.clip(v, 0.0, self.v_top))

    def b(self, v):
        return self._b(np.clip(v, 0.0, self.v_top))

    def ratio(self, v):
        return self.a(v) / self.b(v)

    def circumference(self, v):
        return ellipse_perimeter(float(self.a(v)), float(self.b(v)))

    # -- waist junction ------------------------------------------------------

    def waist_tangent_deg(self, theta_deg):
        """Bodice meridian tangent at v = 0, from vertical, at azimuth
        theta (0 = center front). Varies with theta because the ratio
        changes with height: d/dv of the local radius r(theta, v)."""
        t = math.radians(theta_deg)
        a0, b0 = float(self.a(0.0)), float(self.b(0.0))
        da0, db0 = float(self._da(0.0)), float(self._db(0.0))
        r = math.hypot(a0 * math.sin(t), b0 * math.cos(t))
        dr = (a0 * da0 * math.sin(t) ** 2 + b0 * db0 * math.cos(t) ** 2) / r
        return math.degrees(math.atan(abs(dr))), dr

    def crease_angle_deg(self, theta_deg, skirt_tangent_deg):
        """Total crease angle at the waist against the skirt. The skirt
        tilts INWARD going up (its radius shrinks approaching the waist
        from below); the bodice tilts OUTWARD going up (radius grows), so
        the tangent-direction angles add."""
        bod, dr = self.waist_tangent_deg(theta_deg)
        return skirt_tangent_deg + (bod if dr >= 0 else -bod)


# -- plan-view ellipse curvature ---------------------------------------------

def plan_curvature_radius(a, b, theta_deg):
    """Radius of curvature of the cross-section ellipse at azimuth theta
    (0 = center front, on the minor axis for a > b): R(0) = a^2/b (the
    FLATTEST point), R(90) = b^2/a (the side seam, tightest)."""
    t = np.radians(np.asarray(theta_deg, dtype=float))
    num = (a**2 * np.cos(t) ** 2 + b**2 * np.sin(t) ** 2) ** 1.5
    return num / (a * b)


def circumference_schedule(anchors=DEFAULT_ANCHORS):
    """P(v): section circumference over the bodice, PCHIP through the
    anchor circumferences (monotone per segment — rises to the bust,
    tapers above). This is the KNOWN quantity the inverted solve pairs
    with an authored depth b(v)."""
    rows = sorted(anchors, key=lambda a: a.v)
    v = np.array([r.v for r in rows])
    c = np.array([r.circumference for r in rows])
    interp = PchipInterpolator(v, c)
    v_top = float(v[-1])
    return lambda vv: interp(np.clip(vv, 0.0, v_top))


def _perimeter_np(a, b):
    """Ramanujan II, vectorized (numpy twin of ellipse_perimeter)."""
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    h = ((a - b) / (a + b)) ** 2
    return np.pi * (a + b) * (1.0 + 3.0 * h / (10.0 + np.sqrt(4.0 - 3.0 * h)))


def solve_a_given_b(perimeter, b):
    """THE INVERTED SOLVE: semi-width a from a KNOWN circumference and an
    AUTHORED half-depth b (the silhouette measurement). Newton on
    Ramanujan (monotone in a); the a/b ratio becomes a reported OUTPUT.
    Raises when the circumference cannot close over that depth (the
    degenerate flat-ellipse perimeter ~4.14*b is the floor)."""
    P = np.asarray(perimeter, dtype=float)
    b = np.asarray(b, dtype=float)
    floor = _perimeter_np(1e-9, b)
    if np.any(P <= floor * (1.0 + 1e-9)):
        bad = np.argmax(P <= floor)
        raise ValueError(
            f"circumference {float(np.atleast_1d(P)[bad]):.1f} mm cannot close "
            f"over half-depth {float(np.atleast_1d(b)[bad]):.1f} mm "
            f"(degenerate floor {float(np.atleast_1d(floor)[bad]):.1f} mm)")
    a = np.maximum(P / math.pi - b, 0.05 * b)     # exact for a circle
    for _ in range(40):
        f = _perimeter_np(a, b) - P
        h = 1e-6 * np.maximum(a, 1.0)
        df = (_perimeter_np(a + h, b) - _perimeter_np(a - h, b)) / (2.0 * h)
        a = np.maximum(a - f / df, 1e-9)
    resid = np.max(np.abs(_perimeter_np(a, b) - P))
    if resid > 1e-6:
        raise ValueError(f"a-solve did not converge (residual {resid:.2e} mm)")
    return a


# -- analysis-grade swept surface (above-bust band comparison) ---------------

_GL24 = np.polynomial.legendre.leggauss(24)


class BodiceSurface:
    """Equal-arc swept-ellipse surface over interpolated sections —
    ANALYSIS GRADE, used for the taper-vs-constant above-bust seating
    comparison. The full coords/shell integration is a separate step;
    this class exists so the decision report runs on the same equal-arc
    conventions the shell will use (theta = 0 CF, ring parameter = arc
    of the perimeter-equivalent meridian)."""

    def __init__(self, sections: BodiceSections, v_max: float):
        self.sec = sections
        self.v_max = float(v_max)
        v = np.linspace(0.0, self.v_max, 2049)
        a, b = sections.a(v), sections.b(v)
        from shell import ellipse_perimeter as _pe   # vectorized Ramanujan
        r_eq = _pe(a, b) / (2.0 * np.pi)
        g = np.sqrt(1.0 + np.gradient(r_eq, v) ** 2)
        s = np.concatenate([[0.0], np.cumsum(0.5 * (g[1:] + g[:-1]) * np.diff(v))])
        self._v_grid, self._s_grid, self._req = v, s, r_eq
        self.s_max = float(s[-1])

    def s_of_v(self, v):
        return np.interp(np.asarray(v, dtype=float), self._v_grid, self._s_grid)

    def v_of_s(self, s):
        return np.interp(np.asarray(s, dtype=float), self._s_grid, self._v_grid)

    def r_theta(self, v):
        """Chart metric: mm of section arc per radian (equal-arc)."""
        return np.interp(np.asarray(v, dtype=float), self._v_grid, self._req)

    def _param(self, theta_rad, a, b, r_eq):
        t = np.array(theta_rad, dtype=float, copy=True)
        nodes, weights = _GL24
        for _ in range(7):
            half = 0.5 * t
            tau = half[..., None] * (nodes + 1.0)
            sp = np.sqrt((a[..., None] * np.cos(tau)) ** 2
                         + (b[..., None] * np.sin(tau)) ** 2)
            arc = (half[..., None] * weights * sp).sum(axis=-1)
            speed = np.sqrt((a * np.cos(t)) ** 2 + (b * np.sin(t)) ** 2)
            t = t - (arc - np.asarray(theta_rad) * r_eq) / speed
        return t

    def point(self, theta_rad, v):
        theta = np.asarray(theta_rad, dtype=float)
        vb = np.broadcast_to(np.asarray(v, dtype=float),
                             np.broadcast(theta, np.asarray(v)).shape).astype(float)
        thb = np.broadcast_to(theta, vb.shape).astype(float)
        a, b = self.sec.a(vb), self.sec.b(vb)
        t = self._param(thb, a, b, self.r_theta(vb))
        return np.stack([a * np.sin(t), b * np.cos(t), vb], axis=-1)

    def normal(self, theta_rad, v, h_t=1e-3, h_s=0.5):
        """Outward unit normal by FD tangents (level rings, meridian)."""
        s = self.s_of_v(v)
        p_t = (self.point(theta_rad + h_t, v) - self.point(theta_rad - h_t, v))
        s_lo = np.clip(s - h_s, 0.0, self.s_max)
        s_hi = np.clip(s + h_s, 0.0, self.s_max)
        p_s = (self.point(theta_rad, self.v_of_s(s_hi))
               - self.point(theta_rad, self.v_of_s(s_lo)))
        n = np.cross(p_s, p_t)
        n = n / np.linalg.norm(n, axis=-1, keepdims=True)
        # orient outward (positive plan-radial component)
        p = self.point(theta_rad, v)
        flip = (n[..., 0] * p[..., 0] + n[..., 1] * p[..., 1]) < 0
        return np.where(flip[..., None], -n, n)


def band_seat_standoff(surf, neckline, W, H, theta_deg, v_c,
                       waist_band_mm=8.0, n=7):
    """Footprint-sampled seat standoff (mm) for a W x H panel whose
    active center sits at (theta, v_c) on the bodice, honoring:
      - the neckline keep-out floor (no sample above edge - keepout_mm)
      - the waist seam band (no sample below v = waist_band_mm)
      - the +-90 piece seams.
    Returns inf when the footprint is illegal there."""
    th0 = math.radians(theta_deg)
    center = surf.point(np.array(th0), np.array(float(v_c)))
    nrm = surf.normal(np.array(th0), np.array(float(v_c)))
    s_c = float(surf.s_of_v(v_c))
    piece_center = 0.0 if abs((theta_deg + 180.0) % 360.0 - 180.0) < 90.0 else 180.0
    worst = 0.0
    for du in np.linspace(-W / 2.0, W / 2.0, n):
        for dw in np.linspace(-H / 2.0, H / 2.0, n):
            s_p = s_c + dw
            if s_p < 0.0 or s_p > surf.s_max:
                return float("inf")
            v_p = float(surf.v_of_s(s_p))
            if v_p < waist_band_mm:
                return float("inf")
            th_p = theta_deg + math.degrees(du / float(surf.r_theta(v_p)))
            lam = (th_p - piece_center + 180.0) % 360.0 - 180.0
            if abs(lam) >= 90.0:
                return float("inf")
            if v_p > float(neckline.keepout_floor(th_p)):
                return float("inf")     # crosses the neckline keep-out
            q = surf.point(np.array(math.radians(th_p)), np.array(v_p))
            d = float((q - center) @ nrm)
            worst = max(worst, abs(d))
    return worst


def above_bust_band_comparison(neckline, classes, tolerance_mm,
                               v_lo=203.2, dtheta=5.0, dv=5.0):
    """Max-seatable-class distribution INSIDE the band between the bust
    apex and the neckline edge, for both above-bust rules. Returns
    {mode: {"area_cm2": .., "by_class": {name: area_cm2}, ...}}.
    Samples are area-weighted (r_eq * dtheta * ds); classes are tried
    largest first; requires_facet classes are excluded (facet only)."""
    order = [c for c in sorted(classes.values(),
                               key=lambda c: -c.outline_w * c.outline_h)
             if not c.requires_facet]
    out = {}
    for mode, anchors in (("taper (4 anchors)", DEFAULT_ANCHORS),
                          ("constant above apex", ANCHORS_TO_BUST)):
        sec = BodiceSections(anchors)
        surf = BodiceSurface(sec, v_max=neckline.params.cf_height)
        area = 0.0
        by_class = {c.class_id: 0.0 for c in order}
        by_class["none"] = 0.0
        thetas = np.arange(-180.0 + dtheta / 2.0, 180.0, dtheta)
        for th in thetas:
            edge = float(neckline.height(th))
            v_centers = np.arange(v_lo + dv / 2.0, edge, dv)
            for v_c in v_centers:
                ds = (float(surf.s_of_v(min(v_c + dv / 2.0, edge)))
                      - float(surf.s_of_v(v_c - dv / 2.0)))
                w = float(surf.r_theta(v_c)) * math.radians(dtheta) * ds
                area += w
                seated = "none"
                for cls in order:
                    so = band_seat_standoff(surf, neckline, cls.outline_w,
                                            cls.outline_h, float(th), float(v_c))
                    if so <= tolerance_mm:
                        seated = cls.class_id
                        break
                by_class[seated] += w
        out[mode] = {"area_cm2": area / 100.0,
                     "by_class": {k: v / 100.0 for k, v in by_class.items()}}
    return out


def usable_band_deg(a, b, min_radius):
    """|theta| beyond which the plan curvature radius drops below
    min_radius (None if it never does): where the usable band ends."""
    if plan_curvature_radius(a, b, 90.0) >= min_radius:
        return None
    if plan_curvature_radius(a, b, 0.0) < min_radius:
        return 0.0
    lo, hi = 0.0, 90.0
    for _ in range(80):
        mid = 0.5 * (lo + hi)
        if plan_curvature_radius(a, b, mid) >= min_radius:
            lo = mid
        else:
            hi = mid
    return 0.5 * (lo + hi)
