"""COMPOUND SECTIONS — increased bust projection at fixed circumference.

Each level is no longer one axis-centered ellipse but TWO half-ellipses
sharing the half-width a(v):

    front half (y > 0):  x = a sin t,  y = b_front cos t
    back  half (y < 0):  x = a sin t,  y = b_back  cos t

    section perimeter = [P_ram(a, b_front) + P_ram(a, b_back)] / 2

The circumference schedule P(v) is FROZEN — the committed anchors and the
waist fillet are untouched — so a(v) is the only free variable and is
solved from the compound perimeter. The front-to-back distribution
changes; the total does not.

FRONT PROFILE (b_front)
  Control points (v, depth): (45, 81.0) - (bust_point_v, 123.0) -
  (220, 101.5). Nearly-straight segments: each is a quadratic Bezier
  whose control point sits above the chord midpoint, which reduces to
      depth(v) = chord(v) + 2 s (1 - s) * delta,   s = (v - v0)/(v1 - v0)
  with delta = front_bow * |depth change of the segment|. The maximum
  departure from the straight chord (the sagitta) is therefore
  front_bow * |delta_depth| / 2 — at the default 0.1 that is 2.1 mm on
  the lower segment and 1.1 mm on the upper. front_bow = 0 gives exactly
  straight segments.

  Below v = 45 the front profile IS the back profile (nothing changes in
  the skirt, the fillet, or the low bodice). Above v = 220 the upper
  segment continues with its own end slope to the top of the shell
  (v = 240); that region is above the CF neckline, so it is
  parameterization only, never visible surface at CF.

THE BUST POINT IS A CORNER
  bust_point_radius = 0 leaves a true corner at bust_point_v: the
  meridional radius of curvature is zero there. A positive radius
  replaces the corner with a C1 blend whose MINIMUM radius of curvature
  equals the requested value (solved by bisection on the blend
  half-width), so the knob means what it says in mm.

THE v = 45 JOIN IS ALSO A CORNER
  Snapping the control point to the unchanged back profile (above) fixes
  the VALUE discontinuity but not the TANGENT: the profile arrives at
  v = 45 climbing at the back's own slope and leaves at the lower
  segment's slope — an 11 deg break by default. join_radius = 0 leaves
  that corner sharp; a positive radius blends it the same way as the
  bust point, against the (finite-differenced) back-profile tangent on
  one side and the lower segment's tangent on the other.

The sections stay symmetric in x, so the side-view occluding contour is
still exactly theta = 0 / 180. The half-ellipses meet at (+-a, 0) with
matching tangent (both vertical in the section plane) but DIFFERENT
curvature — a/b_front^2 vs a/b_back^2. That jump is real and is reported.

Nothing here is wired into dress_params(): building a CompoundShellModel
is explicit, so the committed shell is unaffected until the design is
accepted.
"""

import math

import numpy as np
from scipy.interpolate import PchipInterpolator

from bodice import _perimeter_np
from shell import ShellModel, ShellParams, dress_depth, dress_params

TAU = math.tau

# authored control points of the new front profile
V_LOW, D_LOW = 45.0, 81.0
D_BUST = 123.0
V_TOP_CTRL, D_TOP_CTRL = 220.0, 101.5


class CompoundError(ValueError):
    """Raised when the compound construction is inconsistent."""


def _ram(a, b):
    """Ramanujan II perimeter of the full ellipse (a, b)."""
    return _perimeter_np(np.asarray(a, dtype=float), np.asarray(b, dtype=float))


def compound_perimeter(a, b_front, b_back):
    return 0.5 * (_ram(a, b_front) + _ram(a, b_back))


def solve_a(perimeter, b_front, b_back, lo=1.0, hi=2000.0, tol=1e-11):
    """Half-width a solving the COMPOUND perimeter equation. Monotone in
    a, so bisection is unconditionally safe (vectorized)."""
    P = np.asarray(perimeter, dtype=float)
    bf = np.broadcast_to(np.asarray(b_front, dtype=float), P.shape).astype(float)
    bb = np.broadcast_to(np.asarray(b_back, dtype=float), P.shape).astype(float)
    lo = np.full(P.shape, lo)
    hi = np.full(P.shape, hi)
    for _ in range(200):
        mid = 0.5 * (lo + hi)
        too_big = compound_perimeter(mid, bf, bb) > P
        hi = np.where(too_big, mid, hi)
        lo = np.where(too_big, lo, mid)
        if np.all(hi - lo < tol):
            break
    return 0.5 * (lo + hi)


# ---------------------------------------------------------------------------
# the authored front profile


def _fd_slope(f, v, h=0.05):
    """Central finite-difference slope of a scalar callable at v."""
    return (float(np.asarray(f(v + h))) - float(np.asarray(f(v - h)))) / (2.0 * h)


class FrontProfile:
    """b_front(v): two nearly-straight segments meeting at a corner (or a
    radius-controlled blend) at the bust point, joining the unchanged
    back profile at v = 45 (itself a corner, independently blendable)."""

    def __init__(self, back_b, bust_point_v=181.0, bust_point_radius=0.0,
                 join_radius=0.0, front_bow=0.1, v_top=240.0,
                 d_bust=D_BUST, v_low=V_LOW, d_low=D_LOW,
                 v_ctrl=V_TOP_CTRL, d_ctrl=D_TOP_CTRL, snap_low=True):
        if not (v_low < bust_point_v < v_ctrl):
            raise CompoundError(
                f"bust_point_v must lie strictly between {v_low:g} and "
                f"{v_ctrl:g}, got {bust_point_v}")
        if bust_point_radius < 0.0:
            raise CompoundError("bust_point_radius must be >= 0")
        if join_radius < 0.0:
            raise CompoundError("join_radius must be >= 0")
        if front_bow < 0.0:
            raise CompoundError("front_bow must be >= 0")
        self.back_b = back_b
        self.v_low, self.d_low = float(v_low), float(d_low)
        self.bust_point_v, self.d_bust = float(bust_point_v), float(d_bust)
        self.v_ctrl, self.d_ctrl = float(v_ctrl), float(d_ctrl)
        self.front_bow = float(front_bow)
        self.bust_point_radius = float(bust_point_radius)
        self.join_radius = float(join_radius)
        self.v_top = float(v_top)
        # The join at v_low. The authored 81.0 is 0.39 mm below the actual
        # unchanged profile there; honoring it literally would leave a
        # 0.39 mm ledge running right around the front of the shell, so by
        # default the control point SNAPS to the real value (C0 closed)
        # and the difference is reported instead of built.
        self.authored_d_low = float(d_low)
        self.back_d_low = float(np.asarray(back_b(v_low)))
        self.join_step_mm = self.authored_d_low - self.back_d_low
        if snap_low:
            self.d_low = self.back_d_low

        # bust-point corner blend (right neighbour is v_ctrl-bounded)
        self.blend_halfwidth = 0.0
        if self.bust_point_radius > 0.0:
            self.blend_halfwidth = self._solve_corner_halfwidth(
                self.bust_point_radius,
                corner_v=self.bust_point_v,
                extent=min(self.bust_point_v - self.v_low,
                          self.v_ctrl - self.bust_point_v) * 0.98,
                left_val=self._lower, left_slope=self._lower_slope,
                right_val=self._upper, right_slope=self._upper_slope,
                label="bust_point_radius")

        # v = 45 join corner blend (left neighbour is the back profile,
        # right neighbour is bounded by the bust-point blend region)
        self.low_blend_halfwidth = 0.0
        if self.join_radius > 0.0:
            self.low_blend_halfwidth = self._solve_corner_halfwidth(
                self.join_radius,
                corner_v=self.v_low,
                extent=min(self.v_low,
                          self.bust_point_v - self.blend_halfwidth
                          - self.v_low) * 0.98,
                left_val=lambda v: np.asarray(self.back_b(v)),
                left_slope=lambda v: _fd_slope(self.back_b, v),
                right_val=self._lower, right_slope=self._lower_slope,
                label="join_radius")

    # -- the two nearly-straight segments ---------------------------------
    def _seg(self, v, v0, d0, v1, d1):
        s = (np.asarray(v, dtype=float) - v0) / (v1 - v0)
        delta = self.front_bow * abs(d1 - d0)
        return d0 + (d1 - d0) * s + 2.0 * s * (1.0 - s) * delta

    def _seg_slope(self, v, v0, d0, v1, d1):
        s = (np.asarray(v, dtype=float) - v0) / (v1 - v0)
        delta = self.front_bow * abs(d1 - d0)
        return ((d1 - d0) + 2.0 * delta * (1.0 - 2.0 * s)) / (v1 - v0)

    def _lower(self, v):
        return self._seg(v, self.v_low, self.d_low,
                         self.bust_point_v, self.d_bust)

    def _lower_slope(self, v):
        return self._seg_slope(v, self.v_low, self.d_low,
                               self.bust_point_v, self.d_bust)

    def _upper(self, v):
        """Upper segment, continued linearly above the v_ctrl control
        point with its own end slope."""
        v = np.asarray(v, dtype=float)
        base = self._seg(v, self.bust_point_v, self.d_bust,
                         self.v_ctrl, self.d_ctrl)
        end = self._seg(self.v_ctrl, self.bust_point_v, self.d_bust,
                        self.v_ctrl, self.d_ctrl)
        slope = self._seg_slope(self.v_ctrl, self.bust_point_v, self.d_bust,
                                self.v_ctrl, self.d_ctrl)
        return np.where(v <= self.v_ctrl, base, end + slope * (v - self.v_ctrl))

    def _upper_slope(self, v):
        v = np.asarray(v, dtype=float)
        slope_end = self._seg_slope(self.v_ctrl, self.bust_point_v,
                                    self.d_bust, self.v_ctrl, self.d_ctrl)
        return np.where(v <= self.v_ctrl,
                        self._seg_slope(v, self.bust_point_v, self.d_bust,
                                        self.v_ctrl, self.d_ctrl),
                        slope_end)

    # -- generic corner blend (used at both the bust point and v = 45) -----
    @staticmethod
    def _hermite(v, v0, y0, m0, v1, y1, m1):
        """Cubic Hermite on [v0, v1] matching value AND slope at both
        ends (C1 by construction)."""
        t = (np.asarray(v, dtype=float) - v0) / (v1 - v0)
        h = v1 - v0
        return (y0 * (1 + 2 * t) * (1 - t) ** 2 + m0 * h * t * (1 - t) ** 2
                + y1 * t * t * (3 - 2 * t) + m1 * h * t * t * (t - 1))

    def _corner_blended(self, v, corner_v, w, left_val, left_slope,
                        right_val, right_slope):
        v0, v1 = corner_v - w, corner_v + w
        y0, y1 = float(left_val(v0)), float(right_val(v1))
        m0, m1 = float(left_slope(v0)), float(right_slope(v1))
        return self._hermite(v, v0, y0, m0, v1, y1, m1)

    def _corner_min_radius(self, corner_v, w, left_val, left_slope,
                           right_val, right_slope, n=2001):
        """Minimum radius of curvature of the blend curve (v, depth)."""
        vv = np.linspace(corner_v - w, corner_v + w, n)
        dd = self._corner_blended(vv, corner_v, w, left_val, left_slope,
                                  right_val, right_slope)
        d1 = np.gradient(dd, vv)
        d2 = np.gradient(d1, vv)
        kappa = np.abs(d2) / (1.0 + d1 ** 2) ** 1.5
        return float(1.0 / np.max(kappa)) if np.max(kappa) > 0 else np.inf

    def _solve_corner_halfwidth(self, radius, corner_v, extent, left_val,
                                left_slope, right_val, right_slope,
                                label, lo=1e-4):
        """Blend half-width whose minimum radius of curvature equals the
        requested radius (monotone: wider blend = gentler)."""
        hi = extent
        r_at_hi = self._corner_min_radius(corner_v, hi, left_val, left_slope,
                                          right_val, right_slope)
        if r_at_hi < radius:
            raise CompoundError(
                f"{label} {radius:g} mm cannot be reached without running "
                f"past the neighbouring control points (max ~{r_at_hi:.0f} mm)")
        for _ in range(80):
            mid = 0.5 * (lo + hi)
            r_mid = self._corner_min_radius(corner_v, mid, left_val,
                                            left_slope, right_val, right_slope)
            if r_mid < radius:
                lo = mid
            else:
                hi = mid
        return 0.5 * (lo + hi)

    # -- public ------------------------------------------------------------
    def __call__(self, v):
        v = np.asarray(v, dtype=float)
        out = np.empty(np.shape(v), dtype=float)
        flat_v, flat_o = np.atleast_1d(v), np.atleast_1d(out)
        wb, wl = self.blend_halfwidth, self.low_blend_halfwidth
        vb, vl = self.bust_point_v, self.v_low

        low_blend = (flat_v > vl - wl) & (flat_v < vl + wl) if wl > 0 else \
            np.zeros(flat_v.shape, dtype=bool)
        bust_blend = (flat_v > vb - wb) & (flat_v < vb + wb) if wb > 0 else \
            np.zeros(flat_v.shape, dtype=bool)
        low = (flat_v <= vl - wl) if wl > 0 else (flat_v <= vl)
        lower = (~low) & (~low_blend) & (~bust_blend) & (flat_v <= vb)
        upper = (~low) & (~low_blend) & (~bust_blend) & (flat_v > vb)

        if np.any(low):
            flat_o[low] = np.asarray(self.back_b(flat_v[low]))
        if np.any(lower):
            flat_o[lower] = self._lower(flat_v[lower])
        if np.any(upper):
            flat_o[upper] = self._upper(flat_v[upper])
        if np.any(low_blend):
            flat_o[low_blend] = self._corner_blended(
                flat_v[low_blend], vl, wl,
                lambda x: np.asarray(self.back_b(x)),
                lambda x: _fd_slope(self.back_b, x),
                self._lower, self._lower_slope)
        if np.any(bust_blend):
            flat_o[bust_blend] = self._corner_blended(
                flat_v[bust_blend], vb, wb,
                self._lower, self._lower_slope, self._upper, self._upper_slope)
        return flat_o.reshape(np.shape(v)) if np.shape(v) else float(flat_o[0])

    def corner_angle_deg(self):
        """Tangent-angle break at the bust point (0 when blended)."""
        if self.blend_halfwidth > 0.0:
            return 0.0
        a_in = math.degrees(math.atan(float(self._lower_slope(self.bust_point_v))))
        a_out = math.degrees(math.atan(float(self._upper_slope(self.bust_point_v))))
        return abs(a_out - a_in)

    def join_angle_deg(self):
        """Tangent-angle break at v = 45 where the authored front profile
        leaves the unchanged back profile (0 when blended)."""
        if self.low_blend_halfwidth > 0.0:
            return 0.0
        below = _fd_slope(self.back_b, self.v_low)
        above = float(self._lower_slope(self.v_low))
        return abs(math.degrees(math.atan(above)) - math.degrees(math.atan(below)))


# ---------------------------------------------------------------------------
# the compound depth object (drop-in for ShellParams.depth_curve)


class CompoundDepth:
    """b_front / b_back / FROZEN perimeter, with a(v) solved. Exposes the
    authored-depth interface (.b, .perimeter, .v_lo, .v_hi) plus the
    compound extras (.b_front, .b_back, .a)."""

    def __init__(self, base=None, bust_point_v=181.0, bust_point_radius=0.0,
                 join_radius=0.0, front_bow=0.1, n_grid=4001):
        self.base = base if base is not None else dress_depth()
        self.v_lo, self.v_hi = self.base.v_lo, self.base.v_hi
        self.params = self.base.params
        self._back = self.base.b
        self._dback = self.base._B.derivative()
        self.front = FrontProfile(self._back, bust_point_v=bust_point_v,
                                  bust_point_radius=bust_point_radius,
                                  join_radius=join_radius,
                                  front_bow=front_bow, v_top=self.v_hi)
        self.bust_point_v = self.front.bust_point_v
        self.bust_point_radius = self.front.bust_point_radius
        self.join_radius = self.front.join_radius
        self.front_bow = self.front.front_bow

        # dense grid, extra density at the bust corner and the v=45 join
        vb, w = self.front.bust_point_v, max(self.front.blend_halfwidth, 0.0)
        vl, wl = self.front.v_low, max(self.front.low_blend_halfwidth, 0.0)
        z = np.concatenate([
            np.linspace(self.v_lo, self.v_hi, n_grid),
            np.linspace(-60.0, 60.0, 2401),
            np.linspace(vl - max(wl, 6.0), vl + max(wl, 6.0), 1201),
            np.linspace(vb - max(w, 8.0), vb + max(w, 8.0), 3201),
            np.array([vl, vb, vl - wl, vl + wl, vb - w, vb + w, self.v_hi]),
        ])
        z = np.unique(np.clip(z, self.v_lo, self.v_hi))
        P = np.asarray(self.base.perimeter(z), dtype=float)
        bf = np.asarray(self.front(z), dtype=float)
        bb = np.asarray(self._back(z), dtype=float)
        a = solve_a(P, bf, bb)
        if np.any(a <= 0) or not np.all(np.isfinite(a)):
            raise CompoundError("compound half-width solve produced "
                                "non-positive or non-finite a(v)")
        self._A = PchipInterpolator(z, a)
        self._dA = self._A.derivative()
        self._PF = PchipInterpolator(z, _ram(a, bf))
        self._dPF = self._PF.derivative()
        self._PB = PchipInterpolator(z, _ram(a, bb))
        self._dPB = self._PB.derivative()
        self._grid = z
        # residual of the frozen schedule (the whole point of the solve)
        self.perimeter_residual_mm = float(np.max(np.abs(
            compound_perimeter(a, bf, bb) - P)))

    # frozen schedule + interface expected by ShellModel -------------------
    def perimeter(self, z):
        return self.base.perimeter(z)

    def b(self, z):
        """Front half-depth — what `semi_axes` reports as b (documented)."""
        return self.b_front(z)

    def _clip(self, z):
        return np.clip(np.asarray(z, dtype=float), self.v_lo, self.v_hi)

    def b_front(self, z):
        return np.asarray(self.front(self._clip(z)), dtype=float)

    def b_back(self, z):
        return np.asarray(self._back(self._clip(z)), dtype=float)

    def db_front(self, z, h=0.05):
        z = self._clip(z)
        return (np.asarray(self.front(np.clip(z + h, self.v_lo, self.v_hi)))
                - np.asarray(self.front(np.clip(z - h, self.v_lo, self.v_hi)))) \
            / (np.clip(z + h, self.v_lo, self.v_hi)
               - np.clip(z - h, self.v_lo, self.v_hi))

    def db_back(self, z):
        return np.asarray(self._dback(self._clip(z)), dtype=float)

    def a(self, z):
        return np.asarray(self._A(self._clip(z)), dtype=float)

    def da(self, z):
        return np.asarray(self._dA(self._clip(z)), dtype=float)

    def P_front(self, z):
        return np.asarray(self._PF(self._clip(z)), dtype=float)

    def P_back(self, z):
        return np.asarray(self._PB(self._clip(z)), dtype=float)

    def dP_front(self, z):
        return np.asarray(self._dPF(self._clip(z)), dtype=float)

    def dP_back(self, z):
        return np.asarray(self._dPB(self._clip(z)), dtype=float)

    @property
    def fillet_zone(self):
        return self.base.fillet_zone

    @property
    def waist_ring_z(self):
        return self.base.waist_ring_z

    @property
    def waist_ring_circumference(self):
        return self.base.waist_ring_circumference

    def theta_junction_deg(self, z):
        """Equal-arc azimuth where the two half-ellipses meet. 90 exactly
        when b_front == b_back; larger once the front is deeper."""
        pf, pb = self.P_front(z), self.P_back(z)
        return 180.0 * pf / (pf + pb)


# ---------------------------------------------------------------------------
# the model


class CompoundShellModel(ShellModel):
    """ShellModel with compound sections. Everything that depends only on
    the FROZEN perimeter schedule (mean_radius, mean_slope, the neckline,
    the fillet, the equal-arc angle definition) is inherited unchanged;
    the section geometry is overridden."""

    def __init__(self, params: ShellParams):
        if not isinstance(params.depth_curve, CompoundDepth):
            raise CompoundError("CompoundShellModel needs a CompoundDepth")
        super().__init__(params)
        self.cd = params.depth_curve

    # -- section shape -----------------------------------------------------
    def semi_axes(self, z):
        """(a, b_front). The back half-depth is b_back(z) — use axes3()."""
        z = np.asarray(z, dtype=float)
        return self.cd.a(z), self.cd.b_front(z)

    def axes3(self, z):
        z = np.asarray(z, dtype=float)
        return self.cd.a(z), self.cd.b_front(z), self.cd.b_back(z)

    def _b_sel(self, t, z):
        """Half-depth in force at parameter t (front when cos t >= 0)."""
        bf, bb = self.cd.b_front(z), self.cd.b_back(z)
        return np.where(np.cos(t) >= 0.0, bf, bb)

    def _db_sel(self, t, z):
        return np.where(np.cos(t) >= 0.0, self.cd.db_front(z),
                        self.cd.db_back(z))

    # -- equal-arc parameterization ---------------------------------------
    @staticmethod
    def _arc_ellipse(t, a, b):
        """Arc from t = 0 along x = a sin t, y = b cos t (odd in t)."""
        from shell import _GL24
        nodes, weights = _GL24
        t = np.asarray(t, dtype=float)
        half = 0.5 * t
        tau = half[..., None] * (nodes + 1.0)
        sp = np.sqrt((a[..., None] * np.cos(tau)) ** 2
                     + (b[..., None] * np.sin(tau)) ** 2)
        return (half[..., None] * weights * sp).sum(axis=-1)

    def _arc_and_speed(self, t, z):
        """Arc from CF to t across BOTH halves, plus |dX/dt| at t. The
        speed is discontinuous at the junction (a parameterization
        artifact — the curve itself is tangent-continuous)."""
        a, bf, bb = self.axes3(z)
        t = np.asarray(t, dtype=float)
        at = np.abs(t)
        front = at <= 0.5 * math.pi
        arc_f = self._arc_ellipse(np.minimum(at, 0.5 * math.pi), a, bf)
        arc_b = self._arc_ellipse(at, a, bb)
        quarter_f = self._arc_ellipse(np.full_like(at, 0.5 * math.pi), a, bf)
        quarter_b = self._arc_ellipse(np.full_like(at, 0.5 * math.pi), a, bb)
        arc = np.where(front, arc_f, quarter_f + arc_b - quarter_b)
        b_sel = self._b_sel(t, z)
        speed = np.sqrt((a * np.cos(t)) ** 2 + (b_sel * np.sin(t)) ** 2)
        return np.sign(t) * arc, speed

    def param_from_arc_angle(self, theta_rad, z):
        """Parameter t for equal-arc theta. theta is wrapped to [-pi, pi]
        (the section is closed); the sign is carried so CF symmetry is
        exact. Newton runs on whichever half owns the target arc, so the
        junction's speed jump is never crossed mid-solve."""
        theta = np.asarray(theta_rad, dtype=float)
        z = np.broadcast_to(np.asarray(z, dtype=float), theta.shape).astype(float) \
            if theta.shape else np.asarray(z, dtype=float)
        theta = (theta + math.pi) % TAU - math.pi
        a, bf, bb = self.axes3(z)
        P = self.section_perimeter(z)
        target = P * np.abs(theta) / TAU
        quarter_f = self._arc_ellipse(np.full(np.shape(target), 0.5 * math.pi),
                                      a, bf)
        quarter_b = self._arc_ellipse(np.full(np.shape(target), 0.5 * math.pi),
                                      a, bb)
        front = target <= quarter_f
        # front half: solve on (a, b_front); back half: on (a, b_back) with
        # the target rebased through the junction
        tgt = np.where(front, target, target - quarter_f + quarter_b)
        b_use = np.where(front, bf, bb)
        t = np.clip(np.abs(theta), 0.0, math.pi)
        for _ in range(9):
            arc = self._arc_ellipse(t, a, b_use)
            speed = np.sqrt((a * np.cos(t)) ** 2 + (b_use * np.sin(t)) ** 2)
            t = np.clip(t - (arc - tgt) / speed, 0.0, math.pi)
        return np.sign(theta) * t

    def point(self, theta_rad, z):
        theta = np.asarray(theta_rad, dtype=float)
        zb = np.broadcast_to(np.asarray(z, dtype=float),
                             np.broadcast(theta, np.asarray(z)).shape).astype(float)
        thb = np.broadcast_to(theta, zb.shape).astype(float)
        t = self.param_from_arc_angle(thb, zb)
        a = self.cd.a(zb)
        b_sel = self._b_sel(t, zb)
        return np.stack([a * np.sin(t), b_sel * np.cos(t), zb], axis=-1)

    def _arc_z_partial(self, t, z):
        """d(arc)/dz at fixed t, across both halves."""
        from shell import _GL24
        a, bf, bb = self.axes3(z)
        da = self.cd.da(z)
        nodes, weights = _GL24
        t = np.asarray(t, dtype=float)
        at = np.abs(t)

        def integral(upper, b, db):
            half = 0.5 * upper
            tau = half[..., None] * (nodes + 1.0)
            c2, s2 = np.cos(tau) ** 2, np.sin(tau) ** 2
            sp = np.sqrt((a[..., None] ** 2) * c2 + (b[..., None] ** 2) * s2)
            integrand = ((a * da)[..., None] * c2 + (b * db)[..., None] * s2) / sp
            return (half[..., None] * weights * integrand).sum(axis=-1)

        front = at <= 0.5 * math.pi
        i_front = integral(np.minimum(at, 0.5 * math.pi), bf, self.cd.db_front(z))
        i_back = integral(at, bb, self.cd.db_back(z))
        # junction offset: d/dz of (P_front/4 - P_back/4)
        offset = 0.25 * (self.cd.dP_front(z) - self.cd.dP_back(z))
        val = np.where(front, i_front, offset + i_back)
        return np.sign(t) * val

    def frame(self, theta_rad, z):
        theta = np.asarray(theta_rad, dtype=float)
        zb = np.broadcast_to(np.asarray(z, dtype=float),
                             np.broadcast(theta, np.asarray(z)).shape).astype(float)
        thb = np.broadcast_to(theta, zb.shape).astype(float)
        thw = (thb + math.pi) % TAU - math.pi      # wrapped, matches the arc
        t = self.param_from_arc_angle(thw, zb)
        a = self.cd.a(zb)
        da = self.cd.da(zb)
        b_sel, db_sel = self._b_sel(t, zb), self._db_sel(t, zb)
        sin_t, cos_t = np.sin(t), np.cos(t)
        pos = np.stack([a * sin_t, b_sel * cos_t, zb], axis=-1)
        speed = np.sqrt((a * cos_t) ** 2 + (b_sel * sin_t) ** 2)
        dP = TAU * np.asarray(self.mean_slope(zb))
        t_z = (thw / TAU * dP - self._arc_z_partial(t, zb)) / speed
        p_t = np.stack([a * cos_t, -b_sel * sin_t, np.zeros_like(t)], axis=-1)
        p_z = np.stack([da * sin_t + a * cos_t * t_z,
                        db_sel * cos_t - b_sel * sin_t * t_z,
                        np.ones_like(t)], axis=-1)
        n = np.cross(p_z, p_t)
        n = n / np.linalg.norm(n, axis=-1, keepdims=True)
        e_theta = p_t / np.linalg.norm(p_t, axis=-1, keepdims=True)
        e_s = -p_z / np.linalg.norm(p_z, axis=-1, keepdims=True)
        return {"position": pos, "normal": n, "e_theta": e_theta, "e_s": e_s}

    def arc_angle_from_point(self, x, y, z):
        a, bf, bb = self.axes3(z)
        b_sel = np.where(np.asarray(y, dtype=float) >= 0.0, bf, bb)
        t = np.arctan2(np.asarray(x, dtype=float) / a,
                       np.asarray(y, dtype=float) / b_sel)
        arc, _ = self._arc_and_speed(t, z)
        return TAU * arc / self.section_perimeter(z)

    # -- reporting helpers -------------------------------------------------
    def hoop_radius_cf(self, z):
        """Radius of curvature of the SECTION at CF: a^2 / b_front."""
        a, bf, _ = self.axes3(z)
        return a ** 2 / bf

    def junction_curvature_jump(self, z):
        """(kappa_front, kappa_back, |jump|) of the section at (+-a, 0)."""
        a, bf, bb = self.axes3(z)
        return a / bf ** 2, a / bb ** 2, abs(a / bf ** 2 - a / bb ** 2)


def compound_params(bust_point_v=181.0, bust_point_radius=0.0, join_radius=0.0,
                    front_bow=0.1, base_params=None):
    """ShellParams for the compound design: the committed dress with its
    depth object replaced by the compound one. Circumference anchors,
    fillet, neckline and split are inherited untouched."""
    base = base_params if base_params is not None else dress_params()
    cd = CompoundDepth(base=base.depth_curve, bust_point_v=bust_point_v,
                       bust_point_radius=bust_point_radius,
                       join_radius=join_radius, front_bow=front_bow)
    from dataclasses import replace
    return replace(base, depth_curve=cd)
