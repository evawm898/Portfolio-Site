"""ANALYTIC FLAT BUST FACET — prototype, NOT wired into dress_params().

PlateauBustDepth (bust_apex.py) does not make the front genuinely straight
in plan: adding a CONSTANT amplitude to a curved base section translates
the arc — same curvature, just pushed outward — it does not flatten it
(confirmed numerically: max deviation from a best-fit straight line
across the plateau core is ~3.5mm at bust_plateau_theta=25). This module
fixes that by REPLACING the surface within a capsule-shaped core with a
genuine PLANE (constant lateral slope, so any constant-v cross-section
through the core is a true straight line/chord), pinned so its value at
(CF, apex_v) is an EXPLICIT target depth (not a free/solved amplitude),
then blending back to the base curved surface outside the core using the
SAME raised-cosine falloff and capsule (distance-to-segment) metric as
PlateauBustDepth — reused verbatim per instruction, since its
monotonicity proof still applies here (see FacetBustDepth's docstring).

STATUS: prototype. Build explicitly via ApexShellModel(facet_params(...))
or FacetBustDepth(...) directly — gated behind facet_gate.py's sweep/
report until approved, exactly like plateau_gate.py before it.
"""

import math

import numpy as np

from bust_apex import (_BumpedDepth, _falloff, _wrap180, ApexError,
                       assert_cf_is_max)
from shell import ShellModel, dress_params

TAU = math.tau


class FacetBustDepth(_BumpedDepth):
    """A genuine flat plane across the bust, capsule-blended into the
    base curved surface.

    THE PLANE: passes through (theta=0, v=apex_v) at Y=depth_mm exactly
    (pinned, not solved), with slope inherited from the base surface's
    own local tangent at that point:
      - LATERAL slope is 0 by construction: at theta=0, dY/dX = 0
        exactly for any symmetric section (dY/dt and dX/dt both vanish
        the right way at t=0 -- CF is a stationary point of Y in X by
        the sin/cos parameterization), so "flat, tangent to the surface
        there" already means zero lateral tilt -- no separate solve
        needed, this is a symmetry fact, not a choice.
      - VERTICAL slope is the base curve's own db/dv at apex_v (a plain
        finite difference), so the plane meets the surrounding surface's
        general climb/descent rather than being level in v too.
      Y_plane(v) = depth_mm + v_slope * (v - apex_v)

    THE BLEND: identical capsule distance metric to PlateauBustDepth --
    lateral = max(0, |dtheta_mm| - plateau_mm), d = hypot(lateral, dv) --
    and the identical raised-cosine falloff w = falloff(d, radius_mm),
    now used as a BLEND WEIGHT toward the plane rather than an additive
    bump amplitude:
      bump(theta, v) = w * (Y_plane(v) - Y_base_ref(theta, v))
    so that base.b(v)*cos(t) + bump == (1-w)*Y_base + w*Y_plane: w=1
    (inside the core) gives the pure plane; w=0 (beyond radius_mm)
    gives the untouched base surface; the raised-cosine w in between is
    C1 at both ends, same as before.

    MONOTONICITY IS NOT AUTOMATIC HERE (unlike PlateauBustDepth's
    additive bump, which was provably monotone by construction) --
    blending toward a FIXED target instead of adding a distance-based
    amount does not carry the same proof over directly. Checked
    numerically after every build via assert_cf_is_max(), same as
    PlateauBustDepth, and reported.

    THE FLAT CORE IS A RIDGE AT v=apex_v, NOT A RECTANGLE: w=1 only
    exactly at v=apex_v (dv=0); moving away in v, even at theta=0,
    starts blending immediately (same radius governs both directions
    jointly, exactly as PlateauBustDepth's capsule did). If a panel
    needs a genuine flat RECTANGLE (independent theta half-width and v
    half-height, like facets.py's per-panel footprint) rather than a
    ridge that blends immediately in v, that is a straightforward
    extension not built here -- flagged, not guessed at.
    """

    def __init__(self, base_params=None, apex_v=181.0, bust_plateau_theta=25.0,
                depth_mm=123.0, radius_mm=70.0, n_v=1201, n_t=481,
                check_cf_is_max=True):
        self.base_params = (base_params if base_params is not None
                           else dress_params(bust="plain"))
        if isinstance(self.base_params.depth_curve, _BumpedDepth):
            raise ApexError("base_params already carries a bump-field depth "
                            "(double-wrap) — pass a single-ellipse base")
        if not hasattr(self.base_params.depth_curve, "b"):
            raise ApexError("base_params.depth_curve must expose .b(v)")
        if radius_mm <= 0.0:
            raise ApexError(f"radius_mm must be > 0, got {radius_mm}")
        if not (0.0 <= bust_plateau_theta < 90.0):
            raise ApexError("bust_plateau_theta must lie in [0, 90), got "
                            f"{bust_plateau_theta}")
        if depth_mm <= 0.0:
            raise ApexError(f"depth_mm must be > 0, got {depth_mm}")

        self.apex_v = float(apex_v)
        self.bust_plateau_theta = float(bust_plateau_theta)
        self.depth_mm = float(depth_mm)
        self.radius_mm = float(radius_mm)

        ref_model = ShellModel(self.base_params)
        self.r_ref = float(np.asarray(ref_model.mean_radius(self.apex_v)))
        self.plateau_mm = math.radians(self.bust_plateau_theta) * self.r_ref

        base = self.base_params.depth_curve
        h = 0.5
        self.v_slope = (float(np.asarray(base.b(self.apex_v + h)))
                        - float(np.asarray(base.b(self.apex_v - h)))) / (2.0 * h)

        self._finish_init(n_v=n_v, n_t=n_t)

        if check_cf_is_max:
            self.cf_max_violation_mm = assert_cf_is_max(self)
        else:
            self.cf_max_violation_mm = None

    def plane_Y(self, v):
        v = np.asarray(v, dtype=float)
        return self.depth_mm + self.v_slope * (v - self.apex_v)

    def _weight(self, theta_deg, v):
        """Blend weight toward the plane: 1 inside the capsule core, 0
        beyond radius_mm, raised-cosine in between. theta_deg here is the
        REFERENCE azimuth (approximate) -- fine for a WEIGHT (it only
        needs to be monotone in true distance, which it is up to the
        same small reference-frame jitter every bump in this file
        accepts), unlike the VALUE being blended (see ._field())."""
        theta_deg = np.asarray(theta_deg, dtype=float)
        v = np.asarray(v, dtype=float)
        dtheta_mm = np.radians(_wrap180(theta_deg)) * self.r_ref
        dv = v - self.apex_v
        lateral = np.maximum(0.0, np.abs(dtheta_mm) - self.plateau_mm)
        d = np.hypot(lateral, dv)
        return _falloff(d, self.radius_mm)

    def bump(self, theta_deg, v):
        """Kept for interface completeness (some callers may still probe
        .bump() directly), but NOT used by ._field()/the solve/tabulate
        path — see ._field()'s override below and its docstring on
        _BumpedDepth for why the additive-bump formula Y = base*cos(T) +
        bump(theta_ref, V) is the wrong shape for a blend-toward-a-value
        construction (theta_ref != T away from CF, and the mismatch does
        not cancel)."""
        v = np.asarray(v, dtype=float)
        w = self._weight(theta_deg, v)
        base_v = np.asarray(self.base_params.depth_curve.b(v))
        Y_base_ref = base_v * np.cos(np.radians(np.asarray(theta_deg, dtype=float)))
        return w * (self.plane_Y(v) - Y_base_ref)

    def _field(self, T, theta_ref, V):
        """Override: blend using the TRUE ellipse parameter T for the
        base term (exact — this is what makes the plane pin exact at CF
        for every v, not just v=apex_v, and removes the small hard-
        constraint violations the naive bump()-based formula had near
        the core edge, ~2.75mm at v=183/theta=-24 with
        bust_plateau_theta=25 — found by assert_cf_is_max, fixed by this
        override, not by tuning)."""
        T = np.asarray(T, dtype=float)
        V = np.asarray(V, dtype=float)
        w = self._weight(theta_ref, V)
        Y_base = np.asarray(self.base.b(V)) * np.cos(T)
        return (1.0 - w) * Y_base + w * self.plane_Y(V)


def verify_facet_flatness(depth, half_span_deg=None, n=41):
    """Numeric proof (not assumed): sample the plan-view (X, Y) curve at
    v=apex_v across the flat core and report the max perpendicular
    deviation from a best-fit straight line -- this is what to compare
    against PlateauBustDepth's ~3.5mm curved result."""
    span = (depth.bust_plateau_theta if half_span_deg is None
           else half_span_deg)
    if span <= 0.0:
        return {"max_dev_from_line_mm": 0.0, "note": "plateau=0, a single "
               "point has no line to deviate from"}
    th = np.linspace(-span, span, n)
    v = depth.apex_v
    t = depth.t_of(th, np.full_like(th, v))
    X = np.asarray(depth.a(v)) * np.sin(t)
    Y = np.asarray(depth.y_of(t, np.full_like(t, v)))
    A = np.stack([X, np.ones_like(X)], axis=1)
    m, c = np.linalg.lstsq(A, Y, rcond=None)[0]
    resid = Y - (m * X + c)
    return {"max_dev_from_line_mm": float(np.max(np.abs(resid))),
           "Y_range_mm": float(Y.max() - Y.min()),
           "fitted_slope": float(m)}


def facet_params(apex_v=181.0, bust_plateau_theta=25.0, depth_mm=123.0,
                 radius_mm=70.0, base_params=None):
    """ShellParams for the flat-facet design: a single-ellipse committed
    dress (dress_params(bust="plain") by default) with its depth object
    replaced by the plane-blended field. Build with
    ApexShellModel(facet_params(...)) -- ApexShellModel works for any
    _BumpedDepth subclass."""
    from dataclasses import replace
    base = base_params if base_params is not None else dress_params(bust="plain")
    d = FacetBustDepth(base_params=base, apex_v=apex_v,
                       bust_plateau_theta=bust_plateau_theta,
                       depth_mm=depth_mm, radius_mm=radius_mm)
    return replace(base, depth_curve=d)
