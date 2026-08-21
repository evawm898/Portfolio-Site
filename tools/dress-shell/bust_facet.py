"""ANALYTIC FLAT BUST FACET — prototype, NOT wired into dress_params().

REBUILT after a real correction: the first version anchored the plane's
vertical slope to the base curve's LOCAL tangent at apex_v — that is a
RULED surface (developable, following the base curve's own gradient
pointwise), not a plane. A true plane needs b_front(v) LINEAR from the
waist to the bust point, not merely tangent to the curve at one height.

NOTE ON PROVENANCE: this file does not have direct record of "the
inverted-triangle spec" it's being corrected against — reconstructed here
from the concrete formulas given in review (b_front(v) linear waist->bust
point via compound.py's own front_bow mechanic; a facet described as an
INVERTED TRIANGLE: full lateral width at the bust-point height, tapering
to a POINT at the waist). Flagged, not silently assumed correct.

THE PLANE (vertical profile, b_front(v)): reuses compound.py's FrontProfile
_seg()/_seg_slope() formula verbatim — a quadratic-Bezier-shaped "nearly
straight" segment from (v=0, Y_waist=base.b(0)) to (apex_v, depth_mm),
sagitta = front_bow * |depth_mm - Y_waist| / 2. front_bow=0 collapses it
to an EXACT straight line (a genuine plane, not merely developable).
Above apex_v the segment continues linearly with its own end slope
(compound.py's _upper() convention), the way it did before.

THE FOOTPRINT (INVERTED TRIANGLE): below apex_v, the flat core's lateral
half-width tapers LINEARLY from plateau_mm (at v=apex_v, the bust-point
line) to 0 (at v=0, the waist) — full width at the bust points, a single
point at the waist, hence "inverted triangle." Above apex_v, the old
symmetric capsule falloff (constant plateau_mm width, raised-cosine
falloff over radius_mm in both directions jointly) is unchanged. The
raised-cosine blend still governs the lateral excess beyond whichever
half-width applies at that height, so the same C1/monotonicity argument
carries over (see FacetBustDepth's docstring for the proof, updated for
the v-dependent core width).
"""

import math

import numpy as np

from bust_apex import (_BumpedDepth, _falloff, _wrap180, ApexError,
                       assert_cf_is_max)
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
    (full width at the bust-point line, a point at the waist).

    THE PLANE:
      v <= apex_v:  Y_plane(v) = _seg(v, 0, Y_waist, apex_v, depth_mm,
                                      front_bow)   -- Y_waist = base.b(0)
      v >  apex_v:  continues linearly at the segment's own v=apex_v end
                    slope (matches compound.py's FrontProfile._upper()
                    convention for what happens above the bust point).
      LATERAL slope is 0 everywhere by construction (independent of X) —
      not merely at CF: within the triangle every ring's flat core is
      centered and symmetric about theta=0, so this is a genuine
      developable-free plane only when front_bow=0 (see [1] in the gate
      report for the measured deviation at front_bow=0 vs the default).

    THE FOOTPRINT (inverted triangle):
      v <= apex_v:  half_width(v) = plateau_mm * clip(v / apex_v, 0, 1)
                    -- 0 at the waist, plateau_mm at the bust-point line.
      v >  apex_v:  half_width(v) = plateau_mm (constant, unchanged).
      lateral_excess = max(0, |dtheta_mm| - half_width(v))
      dv_excess      = max(0, v - apex_v)   -- ONLY blends vertically
                       ABOVE the bust-point line; below it the triangle
                       itself already closes to a point at the waist, no
                       separate vertical falloff needed there.
      d = hypot(lateral_excess, dv_excess);  w = falloff(d, radius_mm)

    MONOTONICITY: at every FIXED v, lateral_excess is still
    max(0, |dtheta_mm| - a v-dependent but theta-independent constant) —
    the same non-decreasing-in-|theta| structure PlateauBustDepth's proof
    relies on, just with a v-varying width. CF is therefore still the
    max at every v-level by the identical construction argument. Checked
    numerically via assert_cf_is_max() regardless, same discipline as
    before.
    """

    def __init__(self, base_params=None, apex_v=181.0, bust_plateau_theta=25.0,
                depth_mm=123.0, front_bow=0.1, radius_mm=70.0,
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
        if not (0.0 <= bust_plateau_theta < 90.0):
            raise ApexError("bust_plateau_theta must lie in [0, 90), got "
                            f"{bust_plateau_theta}")
        if depth_mm <= 0.0:
            raise ApexError(f"depth_mm must be > 0, got {depth_mm}")
        if front_bow < 0.0:
            raise ApexError("front_bow must be >= 0")

        self.apex_v = float(apex_v)
        self.bust_plateau_theta = float(bust_plateau_theta)
        self.depth_mm = float(depth_mm)
        self.radius_mm = float(radius_mm)
        self.front_bow = float(front_bow)

        ref_model = ShellModel(self.base_params)
        self.r_ref = float(np.asarray(ref_model.mean_radius(self.apex_v)))
        self.plateau_mm = math.radians(self.bust_plateau_theta) * self.r_ref

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

    def _half_width(self, v):
        """Inverted-triangle taper, EASED (raised-cosine) rather than
        linear: a literal linear ramp (0 at the waist to plateau_mm at
        apex_v) meets the constant band above apex_v with a SLOPE
        discontinuity exactly at the bust-point line — a genuine crease
        in the footprint boundary that produced a 4.8mm meridional
        radius there (found and fixed here, not shipped: see the gate
        report). The raised-cosine ramp has zero slope at BOTH ends
        (v=0 and v=apex_v), matching the constant band's zero slope
        above apex_v exactly — C1 at the join, same discipline as every
        other blend in this file."""
        v = np.asarray(v, dtype=float)
        u = np.clip(v / self.apex_v, 0.0, 1.0)
        tri = self.plateau_mm * 0.5 * (1.0 - np.cos(math.pi * u))
        return np.where(v <= self.apex_v, tri, self.plateau_mm)

    def _weight(self, theta_deg, v):
        theta_deg = np.asarray(theta_deg, dtype=float)
        v = np.asarray(v, dtype=float)
        dtheta_mm = np.radians(_wrap180(theta_deg)) * self.r_ref
        half_width = self._half_width(v)
        lateral = np.maximum(0.0, np.abs(dtheta_mm) - half_width)
        dv_excess = np.maximum(0.0, v - self.apex_v)
        d = np.hypot(lateral, dv_excess)
        return _falloff(d, self.radius_mm)

    def bump(self, theta_deg, v):
        """Kept for interface completeness — not used by ._field()."""
        v = np.asarray(v, dtype=float)
        w = self._weight(theta_deg, v)
        base_v = np.asarray(self.base_params.depth_curve.b(v))
        Y_base_ref = base_v * np.cos(np.radians(np.asarray(theta_deg, dtype=float)))
        return w * (self.plane_Y(v) - Y_base_ref)

    def _field(self, T, theta_ref, V):
        """Override (see _BumpedDepth._field()'s docstring): use the TRUE
        ellipse parameter T for the base term, theta_ref only for the
        blend weight — required for the plane pin to be exact and for
        the hard constraint to hold (found and fixed in the first
        version of this file)."""
        T = np.asarray(T, dtype=float)
        V = np.asarray(V, dtype=float)
        w = self._weight(theta_ref, V)
        Y_base = np.asarray(self.base.b(V)) * np.cos(T)
        return (1.0 - w) * Y_base + w * self.plane_Y(V)


def verify_plane_flatness(depth, n_theta=25, n_v=25, v_hi=None):
    """Full 2D plane-fit: sample (X, Y, v) across the facet's triangular
    core (v from a hair above 0 to apex_v by default, theta from -width
    to +width at each v), fit the BEST 3D PLANE Y = A*X + B*v + C by
    least squares, and report the max deviation from THAT plane — the
    literal "maximum deviation from a true plane" metric, not just a
    single ring's line-fit."""
    v_hi = depth.apex_v if v_hi is None else v_hi
    vv = np.linspace(1.0, v_hi, n_v)   # avoid the exact waist point (0 width)
    rows = []
    for v in vv:
        hw_deg = math.degrees(depth._half_width(np.array(v)) / depth.r_ref)
        if hw_deg <= 0.0:
            continue
        th = np.linspace(-hw_deg, hw_deg, n_theta)
        t = depth.t_of(th, np.full_like(th, v))
        X = np.asarray(depth.a(v)) * np.sin(t)
        Y = np.asarray(depth.y_of(t, np.full_like(t, v)))
        for x, y in zip(X, Y):
            rows.append((x, y, v))
    X, Y, V = (np.array(c) for c in zip(*rows))
    A = np.stack([X, V, np.ones_like(X)], axis=1)
    coef, *_ = np.linalg.lstsq(A, Y, rcond=None)
    fit = A @ coef
    resid = Y - fit
    return {"max_dev_mm": float(np.max(np.abs(resid))),
           "rms_dev_mm": float(np.sqrt(np.mean(resid ** 2))),
           "n_points": len(rows), "plane_coef_A_B_C": tuple(coef.tolist())}


def facet_params(apex_v=181.0, bust_plateau_theta=25.0, depth_mm=123.0,
                 front_bow=0.1, radius_mm=70.0, base_params=None):
    """ShellParams for the flat-facet design: a single-ellipse committed
    dress (dress_params(bust="plain") by default) with its depth object
    replaced by the plane-blended field. Build with
    ApexShellModel(facet_params(...)) -- ApexShellModel works for any
    _BumpedDepth subclass."""
    from dataclasses import replace
    base = base_params if base_params is not None else dress_params(bust="plain")
    d = FacetBustDepth(base_params=base, apex_v=apex_v,
                       bust_plateau_theta=bust_plateau_theta,
                       depth_mm=depth_mm, front_bow=front_bow,
                       radius_mm=radius_mm)
    return replace(base, depth_curve=d)
