"""APEX-BASED BUST CURVATURE — prototype (NOT wired into dress_params()).

Replaces the compound model's "front half always deeper than back half"
scheme with what the brief actually asked for: two apex points (left and
right, at a real height AND azimuth off center front — not one bump
smeared across CF), and curvature that radiates outward from EACH apex
and decays with true 2D distance across the surface (meridian height AND
lateral arc, not a v-height band applied uniformly in theta).

WHY THE OLD compound.py MODEL WAS WRONG
  CompoundDepth authored b_front(v) — a function of height ONLY — and
  applied it identically across the ENTIRE front half-ellipse (roughly
  theta in [-103, 103] deg). Its only "decay away from center" was the
  ellipse's own cos(t) shape, which is gentle: cos(30deg) = 0.87,
  cos(55deg) = 0.57 — so a panel 30-55 degrees off CF still saw most of
  the bump. There was never a concept of an apex, let alone two.

THIS MODEL
  Base depth b_base(v): the single ORIGINAL traced/fillet profile
  (dress_params(compound=False)'s depth_curve), used identically all the
  way around the ring — front and back are the SAME surface by default.
  No more front/back split, no more v=45 join corner: those existed only
  to express "the front is generically deeper," which a real apex field
  makes unnecessary.

  Two apexes at (+-apex_theta_deg, apex_v), each adding a RADIAL bump
  in the depth (front-to-back) direction only:
      bump(theta, v) = amplitude_mm * falloff(d / radius_mm)
      d = sqrt(dv^2 + dtheta_mm^2)   -- an approximate local-tangent-
          plane Euclidean distance: dv is meridian height difference,
          dtheta_mm is the lateral arc-length difference converted
          through a FIXED reference radius r_ref = P(apex_v) / 2pi (the
          apex height's own r_eq) so iso-distance contours are honest
          circles in mm around each apex, not degree-bands.
      falloff(u) = 0.5*(1 + cos(pi*u))  for u <= 1, else EXACTLY 0
          (a raised-cosine bump: C1 continuous — zero value AND zero
          slope at the cutoff, so no new sharp corner is introduced —
          and, unlike a Gaussian, truly zero beyond the radius, which is
          what "falls to zero well before reaching the back panel"
          requires: an exact cutoff, not just a small tail.)
  The two apex fields are summed (so CF, sitting between them, gets the
  combined-but-attenuated contribution of both, not the full peak of
  either — anatomically two separate forms, not one central mound).

CIRCUMFERENCE SCHEDULE STAYS FROZEN
  a(v) (the shared half-width) is re-solved, per height, so the ring's
  TRUE perimeter (numerically integrated around the bumped, no-longer-
  elliptical curve) still matches the committed P(v) schedule exactly —
  same discipline as compound.py's compound_perimeter() solve, just
  generalized from a closed-form (two half-ellipses) to a numeric
  integral (arbitrary bump field).

REFERENCE AZIMUTH
  The bump is authored against a REFERENCE equal-arc azimuth computed
  from the plain (bump-free, pre-compound) model's own closed-form
  equal-arc map — not the final bumped curve's own equal-arc theta,
  which would be circular (the bump changes local arc length, which
  would change equal-arc theta, which is the bump's own input). The
  discrepancy this introduces is small (the bump is a minor perturbation
  relative to the whole ring) and is reported by verify_apex_placement()
  below: the ACTUAL equal-arc azimuth of each apex, after the true
  equal-arc solve, compared to the authored target.

PROTOTYPE STATUS
  Nothing here is wired into dress_params(). Building an ApexShellModel
  is explicit (via apex_params()), exactly like compound.py's earlier
  prototype stage — the committed shell is unaffected until accepted.
"""

import math

import numpy as np
from scipy.interpolate import PchipInterpolator, RegularGridInterpolator

from shell import ShellModel, ShellParams, dress_params

TAU = math.tau


class ApexError(ValueError):
    """Raised when the apex construction is inconsistent."""


def _wrap180(deg):
    return (np.asarray(deg, dtype=float) + 180.0) % 360.0 - 180.0


def _falloff(d_mm, radius_mm):
    d = np.asarray(d_mm, dtype=float)
    u = d / radius_mm
    return np.where(u <= 1.0, 0.5 * (1.0 + np.cos(math.pi * np.clip(u, 0.0, 1.0))), 0.0)


class ApexBustDepth:
    """The bumped depth field. Exposes the authored-depth interface
    (.b, .perimeter, .v_lo, .v_hi) plus the apex-specific extras."""

    def __init__(self, base_params=None, apex_v=181.0, apex_theta_deg=35.0,
                amplitude_mm=None, radius_mm=70.0, n_v=1201, n_t=481):
        self.base_params = (base_params if base_params is not None
                           else dress_params(compound=False))
        if isinstance(self.base_params.depth_curve, ApexBustDepth):
            raise ApexError("base_params already carries an ApexBustDepth "
                            "(double-wrap) — pass a single-ellipse base")
        if not hasattr(self.base_params.depth_curve, "b"):
            raise ApexError("base_params.depth_curve must expose .b(v)")
        if radius_mm <= 0.0:
            raise ApexError(f"radius_mm must be > 0, got {radius_mm}")
        if not (0.0 < apex_theta_deg < 90.0):
            raise ApexError("apex_theta_deg must lie strictly between 0 "
                            "(CF — a single central bump, not two apexes) "
                            f"and 90 (the side), got {apex_theta_deg}")

        self.ref_model = ShellModel(self.base_params)
        base = self.base_params.depth_curve
        self.base = base
        self.v_lo, self.v_hi = base.v_lo, base.v_hi
        self.params = base.params

        self.apex_v = float(apex_v)
        self.apex_theta_deg = float(apex_theta_deg)
        self.radius_mm = float(radius_mm)
        # default amplitude: SOLVED (bisection, off-line — not re-solved on
        # every construction, that would be circular) so that the actual
        # surface depth AT the apex point equals 121.08mm, the OLD compound
        # model's peak projection. That number is the right target to
        # preserve, not the old model's naive v-only DELTA (19.44mm): once
        # the apex sits off-axis, the base ellipse's own cos(t) falloff has
        # already reduced the surface depth there before any bump is added
        # (86.3mm at apex_theta_deg=35 vs 101.6mm at CF), so carrying the
        # old delta forward under-delivers by more than 15mm. 35.4mm is
        # what's actually needed to reach the same peak, correctly located.
        self.amplitude_mm = float(
            35.4 if amplitude_mm is None else amplitude_mm)
        if self.amplitude_mm < 0.0:
            raise ApexError("amplitude_mm must be >= 0")
        # fixed reference radius for converting degrees to mm around each
        # apex: the apex height's own perimeter-equivalent radius
        self.r_ref = float(np.asarray(self.ref_model.mean_radius(self.apex_v)))

        self._solve(n_v=n_v, n_t=n_t)

    # -- the bump field ------------------------------------------------
    def bump(self, theta_deg, v):
        theta_deg = np.asarray(theta_deg, dtype=float)
        v = np.asarray(v, dtype=float)
        total = np.zeros(np.broadcast(theta_deg, v).shape, dtype=float)
        for ta in (self.apex_theta_deg, -self.apex_theta_deg):
            dtheta_mm = np.radians(_wrap180(theta_deg - ta)) * self.r_ref
            dv = v - self.apex_v
            d = np.hypot(dtheta_mm, dv)
            total = total + self.amplitude_mm * _falloff(d, self.radius_mm)
        return total

    def _theta_ref(self, t, v):
        """Reference equal-arc azimuth (degrees, [0, 180]) of ellipse
        parameter t >= 0 at height v, from the PLAIN pre-compound model."""
        arc, _ = self.ref_model._arc_and_speed(np.abs(t), v)
        P = np.asarray(self.ref_model.section_perimeter(v))
        return np.degrees(TAU * arc / P)

    # -- solve a(v) + tabulate the equal-arc inverse --------------------
    def _solve(self, n_v, n_t):
        v_grid = np.linspace(self.v_lo, self.v_hi, n_v)
        t_grid = np.linspace(0.0, math.pi, n_t)
        V, T = np.meshgrid(v_grid, t_grid, indexing="ij")   # (n_v, n_t)

        theta_ref = self._theta_ref(T, V)
        b_base_v = np.asarray(self.base.b(v_grid))
        # Y is the SIGNED front-to-back coordinate (matches the plain
        # model's b*cos(t) convention): positive toward CF (t=0),
        # negative toward CB (t=pi). The bump only ever raises Y toward
        # CF, so no positivity check applies here — the real correctness
        # guard is arc-length monotonicity, checked below.
        Y = b_base_v[:, None] * np.cos(T) + self.bump(theta_ref, V)

        target_P = np.asarray(self.ref_model.section_perimeter(v_grid))  # frozen
        lo = np.full(n_v, 1.0)
        hi = np.full(n_v, 2000.0)
        for _ in range(70):
            mid = 0.5 * (lo + hi)
            X = mid[:, None] * np.sin(T)
            dX = np.gradient(X, t_grid, axis=1)
            dY = np.gradient(Y, t_grid, axis=1)
            ds = np.hypot(dX, dY)
            perim = 2.0 * np.trapezoid(ds, t_grid, axis=1)
            too_big = perim > target_P
            hi = np.where(too_big, mid, hi)
            lo = np.where(too_big, lo, mid)
        a_grid = 0.5 * (lo + hi)
        self.perimeter_residual_mm = float(np.max(np.abs(perim - target_P)))

        # final arc-length table at the solved a(v), for the equal-arc
        # inverse theta -> t (needed by point()/frame())
        X = a_grid[:, None] * np.sin(t_grid)[None, :]
        dX = np.gradient(X, t_grid, axis=1)
        dY = np.gradient(Y, t_grid, axis=1)
        ds = np.hypot(dX, dY)
        arc_cum = np.concatenate(
            [np.zeros((n_v, 1)), np.cumsum(0.5 * (ds[:, :-1] + ds[:, 1:])
                                           * np.diff(t_grid)[None, :], axis=1)],
            axis=1)
        if np.any(np.diff(arc_cum, axis=1) <= 0.0):
            raise ApexError("bumped curve arc length is not strictly "
                            "increasing in t — bump too large relative to "
                            "the base curve (curve folds back on itself)")
        theta_eq = np.degrees(TAU * arc_cum / (2.0 * arc_cum[:, -1:]))  # [0,180]

        # resample each v-row's monotone inverse at FIXED theta breakpoints
        # so the (v, theta) -> t map is a regular grid, invertible with a
        # single RegularGridInterpolator
        theta_fixed = np.linspace(0.0, 180.0, n_t)
        T_table = np.empty((n_v, n_t))
        for i in range(n_v):
            T_table[i] = PchipInterpolator(theta_eq[i], t_grid)(theta_fixed)

        self._A = PchipInterpolator(v_grid, a_grid)
        self._t_of = RegularGridInterpolator((v_grid, theta_fixed), T_table,
                                             bounds_error=False,
                                             fill_value=None)
        self._v_grid = v_grid
        # The achieved (true equal-arc) azimuth of each apex, vs the
        # authored reference target, is computed on demand by the
        # module-level verify_apex_placement() — it needs a finer,
        # apex-height-specific solve than this construction-time grid.

    # -- public interface expected by ApexShellModel / ShellParams -----
    def perimeter(self, v):
        return self.ref_model.section_perimeter(v)   # frozen, unchanged

    def a(self, v):
        return np.asarray(self._A(np.clip(np.asarray(v, dtype=float),
                                          self.v_lo, self.v_hi)))

    def t_of(self, theta_deg, v):
        """Ellipse parameter t for equal-arc azimuth theta_deg at height v
        (the TRUE equal-arc solve on the final bumped curve). Preserves
        the broadcast input shape — RegularGridInterpolator always
        returns a flat 1-D array, which numpy 2.x refuses to float()
        unless it's truly 0-d, so scalar-in must mean scalar(0-d)-out."""
        theta_deg = np.asarray(theta_deg, dtype=float)
        v = np.asarray(v, dtype=float)
        out_shape = np.broadcast(theta_deg, v).shape
        sign = np.sign(theta_deg)
        sign = np.where(sign == 0.0, 1.0, sign)
        pts = np.stack([np.broadcast_to(v, out_shape).ravel(),
                        np.broadcast_to(np.abs(theta_deg), out_shape).ravel()],
                       axis=-1)
        t_flat = self._t_of(pts)
        return (np.broadcast_to(sign, out_shape) * t_flat.reshape(out_shape))

    def y_of(self, t, v):
        """Depth Y(t, v) = b_base(v)*cos(t) + bump(theta_ref(t,v), v)."""
        t = np.asarray(t, dtype=float)
        v = np.asarray(v, dtype=float)
        theta_ref = self._theta_ref(t, v)
        return np.asarray(self.base.b(v)) * np.cos(t) + self.bump(theta_ref, v)

    def b(self, v):
        """Depth AT CF (theta=0) — kept for interface compatibility with
        code that expects a single representative depth; NOT the whole
        story now that depth varies with theta (use .y_of / .depth_at)."""
        v = np.asarray(v, dtype=float)
        return self.y_of(np.zeros_like(v), v)

    def depth_at(self, theta_deg, v):
        """The actual surface depth at the equal-arc (theta, v)."""
        t = self.t_of(theta_deg, v)
        return self.y_of(t, v)

    @property
    def fillet_zone(self):
        return getattr(self.base, "fillet_zone", (None, None))

    @property
    def waist_ring_z(self):
        return getattr(self.base, "waist_ring_z", 0.0)

    @property
    def waist_ring_circumference(self):
        return getattr(self.base, "waist_ring_circumference",
                      self.params.waist_circumference)


def verify_apex_placement(depth):
    """Solve for the true equal-arc azimuth of each apex (t such that
    theta_ref(t, apex_v) == apex_theta_deg is the AUTHORING target; the
    FINAL equal-arc theta at that same t, on the bumped curve, is what a
    panel author would actually see) and report the discrepancy."""
    v = depth.apex_v
    # find t where the reference azimuth equals the authored target
    t_grid = np.linspace(0.0, math.pi, 4001)
    theta_ref = depth._theta_ref(t_grid, np.full_like(t_grid, v))
    t_apex = float(np.interp(depth.apex_theta_deg, theta_ref, t_grid))
    # final equal-arc azimuth at that same ellipse parameter
    a_v = float(depth.a(v))
    X = a_v * np.sin(t_grid)
    Y = depth.y_of(t_grid, np.full_like(t_grid, v))
    ds = np.hypot(np.gradient(X, t_grid), np.gradient(Y, t_grid))
    arc = np.concatenate([[0.0], np.cumsum(0.5 * (ds[:-1] + ds[1:])
                                           * np.diff(t_grid))])
    P = arc[-1] * 2.0
    theta_true = np.degrees(TAU * np.interp(t_apex, t_grid, arc) / P)
    return {"authored_deg": depth.apex_theta_deg, "true_equal_arc_deg": theta_true,
           "residual_deg": theta_true - depth.apex_theta_deg}


class ApexShellModel(ShellModel):
    """ShellModel with the two-apex bump field. Section geometry only —
    equal-arc theta convention, the fillet, the neckline and the split
    are inherited from the base (compound=False) params, unaffected."""

    def __init__(self, params: ShellParams):
        if not isinstance(params.depth_curve, ApexBustDepth):
            raise ApexError("ApexShellModel needs an ApexBustDepth")
        super().__init__(params)
        self.apex_depth = params.depth_curve

    def semi_axes(self, z):
        z = np.asarray(z, dtype=float)
        d = self.apex_depth
        return d.a(z), np.asarray(d.b(z), dtype=float)   # b() = depth at CF

    def point(self, theta_rad, z):
        theta = np.asarray(theta_rad, dtype=float)
        zb = np.broadcast_to(np.asarray(z, dtype=float),
                             np.broadcast(theta, np.asarray(z)).shape).astype(float)
        thb = np.broadcast_to(theta, zb.shape).astype(float)
        d = self.apex_depth
        theta_deg = np.degrees(thb)
        t = d.t_of(theta_deg, zb)
        a = d.a(zb)
        y = d.y_of(t, zb)
        return np.stack([a * np.sin(t), y, zb], axis=-1)

    def frame(self, theta_rad, z, h_theta=1e-4, h_z=0.25):
        """Numeric (finite-difference) tangent frame — the bumped curve
        has no convenient closed form, and the whole surface is already
        analyzed via fundamental_forms_numeric (is_swept_ellipse=True),
        so a numeric frame here is consistent, not a downgrade."""
        theta = np.asarray(theta_rad, dtype=float)
        zb = np.broadcast_to(np.asarray(z, dtype=float),
                             np.broadcast(theta, np.asarray(z)).shape).astype(float)
        thb = np.broadcast_to(theta, zb.shape).astype(float)
        pos = self.point(thb, zb)
        p_t = (self.point(thb + h_theta, zb) - self.point(thb - h_theta, zb)) \
            / (2.0 * h_theta)
        zc = np.clip(zb, self.z_bottom + h_z, self.z_top - h_z)
        p_z = (self.point(thb, zc + h_z) - self.point(thb, zc - h_z)) \
            / (2.0 * h_z)
        n = np.cross(p_z, p_t)
        n = n / np.linalg.norm(n, axis=-1, keepdims=True)
        e_theta = p_t / np.linalg.norm(p_t, axis=-1, keepdims=True)
        e_s = -p_z / np.linalg.norm(p_z, axis=-1, keepdims=True)
        return {"position": pos, "normal": n, "e_theta": e_theta, "e_s": e_s}

    def arc_angle_from_point(self, x, y, z):
        """True numeric inverse: Gauss-Newton on theta (1 unknown, the
        (x,y) residual is 2 equations) starting from the cheap reference-
        frame estimate, refining against the ACTUAL point() (not the
        approximation) so coords.inverse()'s on-shell check passes."""
        z = np.asarray(z, dtype=float)
        x = np.asarray(x, dtype=float)
        y = np.asarray(y, dtype=float)
        theta0 = self.apex_depth._theta_ref(
            np.arctan2(x / self.apex_depth.a(z),
                      y / np.asarray(self.apex_depth.base.b(z))), z) \
            * np.sign(np.where(x == 0.0, 1.0, x))
        eps = 0.02   # degrees, FD step for the tangent estimate
        for _ in range(10):
            p = self.point(np.radians(theta0), z)
            p2 = self.point(np.radians(theta0 + eps), z)
            dpdt = (p2[..., :2] - p[..., :2]) / math.radians(eps)
            resid = np.stack([x, y], axis=-1) - p[..., :2]
            denom = (dpdt[..., 0] ** 2 + dpdt[..., 1] ** 2)
            denom = np.where(denom < 1e-9, 1e-9, denom)
            dtheta_rad = (resid[..., 0] * dpdt[..., 0]
                         + resid[..., 1] * dpdt[..., 1]) / denom
            theta0 = theta0 + np.degrees(dtheta_rad)
        return np.radians(theta0)


def apex_params(apex_v=181.0, apex_theta_deg=35.0, amplitude_mm=None,
                radius_mm=70.0, base_params=None):
    """ShellParams for the apex-based design: a single-ellipse committed
    dress (dress_params(compound=False) by default) with its depth object
    replaced by the two-apex bumped field."""
    from dataclasses import replace
    base = base_params if base_params is not None else dress_params(compound=False)
    d = ApexBustDepth(base_params=base, apex_v=apex_v,
                      apex_theta_deg=apex_theta_deg,
                      amplitude_mm=amplitude_mm, radius_mm=radius_mm)
    return replace(base, depth_curve=d)
