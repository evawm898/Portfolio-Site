"""ANALYTIC FLAT BUST FACET — prototype, NOT wired into dress_params().

REBUILT TWICE now, each time from a real correction:
  v1: anchored the plane's vertical slope to the base curve's LOCAL
      tangent at apex_v -- a ruled (developable) surface, not a plane.
  v2: fixed the vertical profile (linear waist->bust point, compound.py's
      front_bow mechanic) and the footprint (inverted triangle instead of
      a symmetric capsule) -- but still tested flatness/blend WEIGHT
      using theta_ref, an approximate reference-frame azimuth. Deviation
      from a true plane scaled as roughly the 5th power of the facet's
      angular half-width across a 20-45deg sweep -- the signature of a
      truncated small-angle series, not a real geometric limit. Confirmed
      by inspection: theta_ref only approximates the true equal-arc
      azimuth of ellipse parameter T (see bust_apex.py's ~2deg residual
      at the old off-axis apex, same mechanism, worse the further off-
      axis you sample).
  v3 (this file): the region test now uses X = a_trial*sin(T) DIRECTLY --
      the exact lateral coordinate at whatever half-width is being
      tested during the perimeter-matching bisection (see bust_apex.py's
      _BumpedDepth._solve()/._field(), which now recomputes Y every
      iteration from that iteration's true X, not once from an
      a-independent approximation before the loop). The front face is a
      literal chord: Y = depth_mm-profile(v) for EVERY point with
      |X| <= w(v), no angular approximation anywhere in that test.

NOTE ON PROVENANCE: this file does not have direct record of "the
inverted-triangle spec" -- reconstructed from the concrete formulas
given in review across two correction rounds. Flagged, not assumed.

WIDTH IS NOW SPECIFIED IN MM, NOT DEGREES: bust_half_width_mm is the
authoritative parameter (a physical measurement -- half the breast-tip
separation), matching how it was specified. bust_plateau_theta_deg
remains available purely for reporting/comparison (the angle that would
have produced the same mm width at v=apex_v under the OLD, now-replaced,
reference-frame approximation) -- it plays NO role in the construction.
"""

import math

import numpy as np

from bust_apex import _BumpedDepth, _falloff, ApexError, assert_cf_is_max
from shell import ShellModel, dress_params

TAU = math.tau


def _seg(v, v0, d0, v1, d1, front_bow):
    """compound.py's FrontProfile._seg() verbatim: a quadratic-Bezier
    'nearly straight' segment from (v0,d0) to (v1,d1). front_bow=0 is an
    EXACT straight line."""
    v = np.asarray(v, dtype=float)
    s = (v - v0) / (v1 - v0)
    delta = front_bow * abs(d1 - d0)
    return d0 + (d1 - d0) * s + 2.0 * s * (1.0 - s) * delta


def _seg_slope(v, v0, d0, v1, d1, front_bow):
    v = np.asarray(v, dtype=float)
    s = (v - v0) / (v1 - v0)
    delta = front_bow * abs(d1 - d0)
    return ((d1 - d0) + 2.0 * delta * (1.0 - 2.0 * s)) / (v1 - v0)


class FacetBustDepth(_BumpedDepth):
    """A genuine flat plane across the bust: b_front(v) is LINEAR (or
    front_bow-bowed) from the waist to the bust point, capsule-blended
    into the base curved surface via an INVERTED-TRIANGLE footprint
    (full width at the bust-point line, a point at the waist) -- tested
    against the EXACT lateral coordinate X, not an angular approximation.

    THE PLANE (unchanged from v2):
      v <= apex_v:  Y_plane(v) = _seg(v, 0, Y_waist, apex_v, depth_mm,
                                      front_bow)   -- Y_waist = base.b(0)
      v >  apex_v:  continues linearly at the segment's own v=apex_v end
                    slope (compound.py's FrontProfile._upper() convention).

    THE FOOTPRINT (inverted triangle, now in TRUE mm):
      v <= apex_v:  half_width(v) = half_width_mm * raised-cosine ease
                    of (v/apex_v) -- 0 at the waist, half_width_mm at the
                    bust-point line, ZERO SLOPE at both ends (the eased
                    ramp -- a literal linear ramp meets the constant band
                    above apex_v with a slope discontinuity there, a real
                    bug found and fixed in v2: 4.8mm meridional radius at
                    the join instead of the reported number).
      v >  apex_v:  half_width(v) = half_width_mm (constant).
      lateral_excess = max(0, |X| - half_width(v))    -- X, not degrees
      dv_excess      = max(0, v - apex_v)
      d = hypot(lateral_excess, dv_excess);  w = falloff(d, radius_mm)

    THE FRONT FACE IS NOW A LITERAL CHORD: for any (T, V) whose trial
    X = a_trial(V)*sin(T) satisfies |X| <= half_width(V) AND V <= apex_v,
    lateral_excess = dv_excess = 0, so w = 1 and Y = Y_plane(V) EXACTLY --
    independent of T. Since this holds at EVERY trial half-width tested
    during the perimeter bisection (see bust_apex.py's _field() X
    threading), the flatness is exact by construction, not approximated
    from a small-angle reference azimuth -- confirmed numerically in the
    gate report (deviation should be at the numerical floor, not scaling
    with facet width, at all three swept widths).

    MONOTONICITY: at every FIXED v, lateral_excess is non-decreasing in
    |X|, and |X| = a(v)*|sin(T)| is non-decreasing in T for T in
    [0, pi/2] (CF to the side) -- same non-decreasing-in-angle-from-CF
    structure as before, just measured in X instead of degrees. Checked
    numerically via assert_cf_is_max() regardless.
    """

    def __init__(self, base_params=None, apex_v=181.0, bust_half_width_mm=87.5,
                depth_mm=123.0, front_bow=0.0, radius_mm=70.0,
                n_v=1201, n_t=481, check_cf_is_max=True):
        self.base_params = (base_params if base_params is not None
                           else dress_params(bust="plain"))
        if isinstance(self.base_params.depth_curve, _BumpedDepth):
            raise ApexError("base_params already carries a bump-field depth "
                            "(double-wrap) — pass a single-ellipse base")
        if not hasattr(self.base_params.depth_curve, "b"):
            raise ApexError("base_params.depth_curve must expose .b(v)")
        if radius_mm <= 0.0:
            raise ApexError(f"radius_mm must be > 0, got {radius_mm}")
        if bust_half_width_mm <= 0.0:
            raise ApexError(f"bust_half_width_mm must be > 0, got "
                            f"{bust_half_width_mm}")
        if depth_mm <= 0.0:
            raise ApexError(f"depth_mm must be > 0, got {depth_mm}")
        if front_bow < 0.0:
            raise ApexError("front_bow must be >= 0")

        self.apex_v = float(apex_v)
        self.half_width_mm = float(bust_half_width_mm)
        self.depth_mm = float(depth_mm)
        self.radius_mm = float(radius_mm)
        self.front_bow = float(front_bow)

        ref_model = ShellModel(self.base_params)
        self.r_ref = float(np.asarray(ref_model.mean_radius(self.apex_v)))
        # informational only -- plays no role in the construction, see
        # module docstring
        self.bust_plateau_theta_deg = math.degrees(self.half_width_mm / self.r_ref)
        if self.half_width_mm >= self.r_ref * math.radians(90.0):
            raise ApexError(
                f"bust_half_width_mm={self.half_width_mm:g} implies an "
                f"equivalent angle >= 90deg (the side seam) at v=apex_v — "
                f"not a front-only feature")

        self.Y_waist = float(np.asarray(self.base_params.depth_curve.b(0.0)))
        self._end_slope = float(_seg_slope(self.apex_v, 0.0, self.Y_waist,
                                           self.apex_v, self.depth_mm,
                                           self.front_bow))

        self._finish_init(n_v=n_v, n_t=n_t)

        if check_cf_is_max:
            self.cf_max_violation_mm = assert_cf_is_max(self)
        else:
            self.cf_max_violation_mm = None

    def plane_Y(self, v):
        v = np.asarray(v, dtype=float)
        below = _seg(np.clip(v, 0.0, self.apex_v), 0.0, self.Y_waist,
                    self.apex_v, self.depth_mm, self.front_bow)
        above = self.depth_mm + self._end_slope * (v - self.apex_v)
        return np.where(v <= self.apex_v, below, above)

    def half_width(self, v):
        """Inverted-triangle taper in TRUE mm, raised-cosine eased so it
        meets the constant band above apex_v with ZERO slope at both
        ends (C1 at v=0 and v=apex_v — a literal linear ramp does not
        have this property and produces a real crease, found in v2)."""
        v = np.asarray(v, dtype=float)
        u = np.clip(v / self.apex_v, 0.0, 1.0)
        tri = self.half_width_mm * 0.5 * (1.0 - np.cos(math.pi * u))
        return np.where(v <= self.apex_v, tri, self.half_width_mm)

    def _weight(self, X, v):
        """Blend weight from the EXACT lateral coordinate X (mm) — see
        the module docstring for why this replaced an angular test."""
        X = np.asarray(X, dtype=float)
        v = np.asarray(v, dtype=float)
        lateral = np.maximum(0.0, np.abs(X) - self.half_width(v))
        dv_excess = np.maximum(0.0, v - self.apex_v)
        d = np.hypot(lateral, dv_excess)
        return _falloff(d, self.radius_mm)

    def _field(self, T, theta_ref, V, X):
        """Override: the region test uses X (exact), never theta_ref —
        BUT gated to the front hemisphere (T <= pi/2) first. A REAL BUG
        was found and fixed here: X = a*sin(T) is NOT monotonic over the
        full T range [0, pi] — it rises from 0 to a as T goes 0 -> pi/2,
        then FALLS back toward 0 as T continues to pi (the back). Testing
        |X| <= half_width(v) with no further gate re-triggers the flat
        condition a second time near T=pi, wherever X happens to dip
        back below half_width(v) — a self-intersecting fold in the
        surface (visible immediately in the gate report's render: closed
        loops crossing themselves at low v). theta_ref, used purely as a
        front/back gate here (never as the region test itself — that
        would reintroduce the original approximation bug this file
        exists to fix), is monotonic across the FULL range by definition
        of equal-arc, so it's the correct tool for this one job."""
        T = np.asarray(T, dtype=float)
        V = np.asarray(V, dtype=float)
        front = np.asarray(theta_ref, dtype=float) <= 90.0
        w = np.where(front, self._weight(X, V), 0.0)
        Y_base = np.asarray(self.base.b(V)) * np.cos(T)
        return (1.0 - w) * Y_base + w * self.plane_Y(V)


def theta_for_half_width_mm(base_params, half_width_mm, apex_v=181.0):
    """The angle that would produce half_width_mm of lateral distance at
    v=apex_v under the r_ref = P(apex_v)/2pi conversion — reported for
    comparison with the old (superseded) angular parametrization only;
    the construction itself never uses this."""
    m = ShellModel(base_params)
    r_ref = float(np.asarray(m.mean_radius(apex_v)))
    return math.degrees(half_width_mm / r_ref), r_ref


def verify_plane_flatness(depth, n_theta=25, n_v=25, v_hi=None):
    """Full 2D plane-fit: sample (X, Y, v) across the facet's triangular
    core (v from a hair above 0 to apex_v by default, X from -width to
    +width at each v, EXACT — sampled directly in X, not converted
    through an angle), fit the BEST 3D PLANE Y = A*X + B*v + C by least
    squares, and report the max deviation from THAT plane."""
    v_hi = depth.apex_v if v_hi is None else v_hi
    vv = np.linspace(1.0, v_hi, n_v)   # avoid the exact waist point (0 width)
    rows = []
    for v in vv:
        hw = float(depth.half_width(np.array(v)))
        if hw <= 0.0:
            continue
        Xq = np.linspace(-hw, hw, n_theta)
        a_v = float(np.asarray(depth.a(v)))
        t = np.arcsin(np.clip(Xq / a_v, -1.0, 1.0))
        Y = np.asarray(depth.y_of(t, np.full_like(t, v)))
        for x, y in zip(Xq, Y):
            rows.append((x, y, v))
    X, Y, V = (np.array(c) for c in zip(*rows))
    A = np.stack([X, V, np.ones_like(X)], axis=1)
    coef, *_ = np.linalg.lstsq(A, Y, rcond=None)
    fit = A @ coef
    resid = Y - fit
    return {"max_dev_mm": float(np.max(np.abs(resid))),
           "rms_dev_mm": float(np.sqrt(np.mean(resid ** 2))),
           "n_points": len(rows), "plane_coef_A_B_C": tuple(coef.tolist())}


def facet_params(apex_v=181.0, bust_half_width_mm=87.5, depth_mm=123.0,
                 front_bow=0.0, radius_mm=70.0, base_params=None):
    """ShellParams for the flat-facet design: a single-ellipse committed
    dress (dress_params(bust="plain") by default) with its depth object
    replaced by the plane-blended field. Build with
    ApexShellModel(facet_params(...)) -- ApexShellModel works for any
    _BumpedDepth subclass."""
    from dataclasses import replace
    base = base_params if base_params is not None else dress_params(bust="plain")
    d = FacetBustDepth(base_params=base, apex_v=apex_v,
                       bust_half_width_mm=bust_half_width_mm,
                       depth_mm=depth_mm, front_bow=front_bow,
                       radius_mm=radius_mm)
    return replace(base, depth_curve=d)
