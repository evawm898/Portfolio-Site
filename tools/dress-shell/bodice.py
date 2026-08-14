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
# Circumferences are GIVEN (waist 24 in, underbust 28 in, bust 34 in);
# every ratio is still an estimate awaiting confirmation. The underbust
# ratio is interpolated linearly in height between the waist and bust
# ratio estimates (1.5 + 0.5 * 152.4/203.2 = 1.875).
DEFAULT_ANCHORS = (
    BodiceAnchor("waist", 0.0, 609.6, 1.5, estimated=True),        # ratio est.
    BodiceAnchor("underbust", 152.4, 711.2, 1.875, estimated=True),  # ratio est.
    BodiceAnchor("bust apex", 203.2, 863.6, 2.0, estimated=True),  # ratio est.
)


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
