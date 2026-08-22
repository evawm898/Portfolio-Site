"""APEX-BASED BUST CURVATURE.

  ApexBustDepth   -- APPROVED, WIRED IN (dress_params()'s default, bust=
                      "apex"). Two off-axis apex points, bumps summed.
                      UNCHANGED by the refactor below (byte-identical
                      geometry) -- see its own docstring further down.

  PlateauBustDepth -- NEW, PROTOTYPE, NOT WIRED IN. Fixes a defect the
                      user found by inspecting the rendered shell: ApexBustDepth's
                      two summed off-axis bumps leave a LOCAL MINIMUM at
                      center front (the two lobes have a dip between
                      them) -- wrong, not recoverable by tuning amplitude/
                      radius, so the theta distribution is rebuilt from
                      scratch here under a hard constraint: center front
                      must be the max of the front projection, everywhere,
                      never a local minimum. See PlateauBustDepth's own
                      docstring for the fix (a single crest/plateau
                      anchored at CF, replacing the two-point sum). Build
                      explicitly (ApexShellModel(plateau_params(...)) or
                      PlateauBustDepth(...) directly) -- gated behind
                      plateau_gate.py's sweep/report until approved.

Both share the numeric machinery in _BumpedDepth: freeze the committed
P(v) schedule, re-solve a(v) numerically against whatever additive bump
field .bump(theta_deg, v) the subclass defines, and tabulate the
equal-arc inverse theta -> ellipse-parameter t. Only .bump() differs.
"""

import math

import numpy as np
from scipy.interpolate import PchipInterpolator, RegularGridInterpolator

from shell import ShellModel, ShellParams, dress_params

TAU = math.tau


class ApexError(ValueError):
    """Raised when a bump-field bust construction is inconsistent, or
    (assert_cf_is_max) when the hard center-front-is-max constraint is
    numerically violated."""


def _wrap180(deg):
    return (np.asarray(deg, dtype=float) + 180.0) % 360.0 - 180.0


def _falloff(d_mm, radius_mm):
    d = np.asarray(d_mm, dtype=float)
    u = d / radius_mm
    return np.where(u <= 1.0, 0.5 * (1.0 + np.cos(math.pi * np.clip(u, 0.0, 1.0))), 0.0)


class _BumpedDepth:
    """Shared machinery for an additive depth bump field over the base
    single-ellipse profile: numeric perimeter-freezing solve for a(v) +
    tabulated equal-arc inverse theta -> t. A subclass sets
    self.base_params / self.apex_v / self.radius_mm / self.amplitude_mm
    (whatever its own .bump() needs) and self.r_ref BEFORE calling
    self._finish_init(n_v, n_t); it must implement .bump(theta_deg, v).

    Public interface expected by *ShellModel / ShellParams: .a(v), .b(v),
    .t_of(theta_deg, v), .y_of(t, v), .depth_at(theta_deg, v),
    .perimeter(v), .fillet_zone, .waist_ring_z, .waist_ring_circumference.
    """

    def _finish_init(self, n_v, n_t):
        self.ref_model = ShellModel(self.base_params)
        base = self.base_params.depth_curve
        self.base = base
        self.v_lo, self.v_hi = base.v_lo, base.v_hi
        self.params = base.params
        self._solve(n_v=n_v, n_t=n_t)

    # -- the bump field (subclass-defined) ------------------------------
    def bump(self, theta_deg, v):
        raise NotImplementedError

    def _field(self, T, theta_ref, V, X):
        """Y(T, V) using the TRUE ellipse parameter T for the base term
        (exact) and theta_ref only for whatever distance/weight .bump()
        needs (approximate, reference-frame — see the X argument below
        for the alternative). Default: the additive-bump convention
        (ApexBustDepth, PlateauBustDepth) — Y = base*cos(T) +
        bump(theta_ref, V). A subclass that BLENDS TOWARD a value that
        itself depends on theta_ref (e.g. FacetBustDepth blending toward
        a fixed plane) MUST override this: using .bump()'s theta_ref-
        based reference term as an approximation of base*cos(T), rather
        than base*cos(T) itself, doesn't cancel exactly away from the
        T==theta_ref fixed point (CF) and produces small local hard-
        constraint violations near the flat core's edge that the
        additive convention never has (found by assert_cf_is_max —
        that's why this hook exists).

        X is the TRUE lateral coordinate at THIS TRIAL half-width
        (X = a_trial*sin(T), recomputed every bisection iteration in
        _solve() — see its docstring) — an EXACT quantity, unlike
        theta_ref, which is only ever an approximation of the true
        equal-arc azimuth (see bust_apex.py's module docstring on the
        reference-frame convention, and the ~2deg residual it produces
        at the old off-axis apex). A subclass that needs to define a
        region by literal Cartesian distance (a flat chord over
        |x| <= w(v), not an angular window) MUST use X, not theta_ref,
        for that region test — using theta_ref there reintroduces the
        same reference-frame error the X argument exists to avoid (found
        empirically: deviation-from-plane scaled roughly as the 5th
        power of the facet's angular half-width, the signature of a
        truncated small-angle series, not a real geometric limit — see
        FacetBustDepth's docstring)."""
        b_base_v = np.asarray(self.base.b(V))
        return b_base_v * np.cos(T) + self.bump(theta_ref, V)

    def _theta_ref(self, t, v):
        """Reference equal-arc azimuth (degrees, [0, 180]) of ellipse
        parameter t >= 0 at height v, from the PLAIN pre-bump model."""
        arc, _ = self.ref_model._arc_and_speed(np.abs(t), v)
        P = np.asarray(self.ref_model.section_perimeter(v))
        return np.degrees(TAU * arc / P)

    # -- solve a(v) + tabulate the equal-arc inverse --------------------
    def _solve(self, n_v, n_t):
        v_grid = np.linspace(self.v_lo, self.v_hi, n_v)
        t_grid = np.linspace(0.0, math.pi, n_t)
        V, T = np.meshgrid(v_grid, t_grid, indexing="ij")   # (n_v, n_t)

        theta_ref = self._theta_ref(T, V)
        # Y is the SIGNED front-to-back coordinate (matches the plain
        # model's b*cos(t) convention): positive toward CF (t=0),
        # negative toward CB (t=pi). The bump only ever raises Y toward
        # CF, so no positivity check applies here — the real correctness
        # guard is arc-length monotonicity, checked below.
        #
        # Y is recomputed EVERY bisection iteration, from THAT iteration's
        # trial X = mid*sin(T) — not once, before the loop, from an
        # a-independent approximation. A subclass whose _field() only
        # uses (T, theta_ref, V) (the additive-bump classes) is unaffected
        # either way, since its Y doesn't depend on X; a subclass whose
        # _field() uses X (FacetBustDepth) gets an EXACT lateral
        # coordinate at the actual half-width being tested, not a
        # reference-frame stand-in for it — see _field()'s docstring for
        # why this distinction matters.
        target_P = np.asarray(self.ref_model.section_perimeter(v_grid))  # frozen
        lo = np.full(n_v, 1.0)
        hi = np.full(n_v, 2000.0)
        for _ in range(70):
            mid = 0.5 * (lo + hi)
            X = mid[:, None] * np.sin(T)
            Y = self._field(T, theta_ref, V, X)
            dX = np.gradient(X, t_grid, axis=1)
            dY = np.gradient(Y, t_grid, axis=1)
            ds = np.hypot(dX, dY)
            perim = 2.0 * np.trapezoid(ds, t_grid, axis=1)
            too_big = perim > target_P
            hi = np.where(too_big, mid, hi)
            lo = np.where(too_big, lo, mid)
        a_grid = 0.5 * (lo + hi)
        self.perimeter_residual_mm = float(np.max(np.abs(perim - target_P)))

        # final arc-length table at the CONVERGED a(v) — recompute Y one
        # more time at this exact half-width, for consistency with the
        # perimeter that was actually solved for
        X = a_grid[:, None] * np.sin(t_grid)[None, :]
        Y = self._field(T, theta_ref, V, X)
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
        # The achieved (true equal-arc) azimuth of any authored reference
        # feature is computed on demand by the module-level verify_*()
        # helpers below — they need a finer, height-specific solve than
        # this construction-time grid.

    # -- public interface expected by *ShellModel / ShellParams --------
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
        unless it's truly 0-d, so scalar-in must mean scalar(0-d)-out.

        theta_deg is WRAPPED to (-180, 180] first: build_meshes() passes
        the BACK piece's grid as CONTINUOUS unwrapped theta (up to
        2pi - split, i.e. past 180 deg) to avoid a seam artifact, and the
        inverse table only covers [0, 180] — feeding it un-wrapped values
        silently extrapolated past the table edge (verified: a vertex at
        the nominal 245 deg landed 2.96mm above its own neckline cap
        because it was placed as if at ~262 deg instead of the true
        -114.76 deg). sin/cos are periodic, so the wrapped angle gives
        the identical (x, y) — this loses nothing."""
        theta_deg = _wrap180(np.asarray(theta_deg, dtype=float))
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
        """Depth Y(t, v) — see ._field()'s docstring for the default
        (additive-bump) vs overridden (blend-toward-a-value) formulas."""
        t = np.asarray(t, dtype=float)
        v = np.asarray(v, dtype=float)
        theta_ref = self._theta_ref(t, v)
        x = np.asarray(self.a(v)) * np.sin(t)
        return self._field(t, theta_ref, v, x)

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


class ApexBustDepth(_BumpedDepth):
    """APPROVED, WIRED IN — dress_params()'s default (bust="apex").

    Two apexes at (+-apex_theta_deg, apex_v), each adding a RADIAL bump
    in the depth (front-to-back) direction only:
        bump(theta, v) = amplitude_mm * falloff(d / radius_mm)
        d = sqrt(dv^2 + dtheta_mm^2)   -- an approximate local-tangent-
            plane Euclidean distance: dv is meridian height difference,
            dtheta_mm is the lateral arc-length difference converted
            through a FIXED reference radius r_ref = P(apex_v) / 2pi.
        falloff(u) = 0.5*(1 + cos(pi*u))  for u <= 1, else EXACTLY 0.
    The two apex fields are SUMMED, so CF (between them) gets a lesser,
    combined-but-attenuated contribution rather than either peak.

    KNOWN DEFECT (found by inspection of the rendered shell, not by this
    module's own numeric checks — summing two separate off-axis bumps
    that both decay toward CF can leave CF as a LOCAL MINIMUM, "two lobes
    with a dip between them," if the apexes are far enough apart /
    narrow enough relative to their separation — which is exactly what
    the committed defaults (35 deg apart, 70mm radius) produce: CF reads
    101.6mm at v=181 while each apex reads 121.0mm, a real dip. Left
    unchanged here — see PlateauBustDepth for the fix; this class is kept
    byte-identical because it is still the committed default until the
    fix is reviewed and wired in.
    """

    def __init__(self, base_params=None, apex_v=181.0, apex_theta_deg=35.0,
                amplitude_mm=None, radius_mm=70.0, n_v=1201, n_t=481):
        self.base_params = (base_params if base_params is not None
                           else dress_params(bust="plain"))
        if isinstance(self.base_params.depth_curve, _BumpedDepth):
            raise ApexError("base_params already carries a bump-field depth "
                            "(double-wrap) — pass a single-ellipse base")
        if not hasattr(self.base_params.depth_curve, "b"):
            raise ApexError("base_params.depth_curve must expose .b(v)")
        if radius_mm <= 0.0:
            raise ApexError(f"radius_mm must be > 0, got {radius_mm}")
        if not (0.0 < apex_theta_deg < 90.0):
            raise ApexError("apex_theta_deg must lie strictly between 0 "
                            "(CF — a single central bump, not two apexes) "
                            f"and 90 (the side), got {apex_theta_deg}")

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
        ref_model = ShellModel(self.base_params)
        self.r_ref = float(np.asarray(ref_model.mean_radius(self.apex_v)))

        self._finish_init(n_v=n_v, n_t=n_t)

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


class PlateauBustDepth(_BumpedDepth):
    """NEW, PROTOTYPE — NOT wired into dress_params(). Fixes ApexBustDepth's
    center-front dip by rebuilding the theta distribution under a hard
    constraint: depth_at(0, v) >= depth_at(theta, v) for every theta, at
    every v — center front is the max of the front projection, or tied
    for it, never a local minimum. Verified numerically after every
    construction (assert_cf_is_max below); the underlying field is also
    provably monotone by construction (see the distance metric).

    ONE bump, anchored at center front (theta=0), not two off-axis
    points summed:
        bump(theta, v) = amplitude_mm * falloff(d / radius_mm)
        dtheta_mm = radians(wrap180(theta)) * r_ref        (signed, CF=0)
        dv        = v - apex_v
        lateral   = max(0, |dtheta_mm| - plateau_mm)   -- 0 INSIDE the
                    flat core, distance PAST its edge outside it
        d         = hypot(lateral, dv)
        plateau_mm = radians(bust_plateau_theta) * r_ref

    d is the Euclidean distance to a flat horizontal CORE SEGMENT
    spanning [-plateau_mm, +plateau_mm] at v = apex_v (a "capsule" /
    stadium shape), not to a single point — a direct, minimal
    generalization of ApexBustDepth's own point-distance formula.
    bust_plateau_theta = 0 collapses the segment to a point exactly at
    (CF, apex_v): "a single crest at CF, monotone decreasing outward."
    bust_plateau_theta > 0 gives "a flat forward face" of that many
    degrees each side of CF, THEN the same raised-cosine falloff over
    the next radius_mm of lateral distance.

    WHY THIS IS PROVABLY MONOTONE FROM CF, AT EVERY v (not tuned to be —
    a structural guarantee): at any fixed v, `lateral` is non-decreasing
    in |dtheta_mm| (it's exactly 0 up to the plateau edge, then rises
    1:1), so d = hypot(lateral, dv) is non-decreasing in |dtheta_mm| too
    (hypot is non-decreasing in either argument), and falloff(d/radius)
    is non-increasing in d. The composition is therefore non-increasing
    as |theta| grows from 0, at every v — CF (or the flat core) is
    always the max. No amount of retuning the old two-point-sum design
    could have this property (each apex's own bump necessarily rises
    again on the far side of its own center, and CF sits between two
    such rises); this is the "not recoverable by tuning" the user named.

    C1 CONTINUITY, INCLUDING AT THE PLATEAU EDGE: max(0, x)^2 is C1 at
    x=0 (both value and slope match: 0 and 0), so d^2 = lateral^2 + dv^2
    is C1 in (theta, v) everywhere; falloff as a function of d^2 is a
    smooth (even, in d) function near d=0 (raised-cosine's Taylor series
    in d^2 has no odd terms), so the composition falloff(d(theta,v)) is
    C1 everywhere, including exactly at the plateau's flat-top corners —
    no new sharp edge is introduced by flattening the top.
    """

    def __init__(self, base_params=None, apex_v=181.0, bust_plateau_theta=0.0,
                amplitude_mm=35.4, radius_mm=70.0, n_v=1201, n_t=481,
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
            raise ApexError("bust_plateau_theta must lie in [0, 90) — 0 is "
                            "a single crest at CF, >=90 would reach the "
                            f"side seam, got {bust_plateau_theta}")
        if amplitude_mm < 0.0:
            raise ApexError("amplitude_mm must be >= 0")

        self.apex_v = float(apex_v)
        self.bust_plateau_theta = float(bust_plateau_theta)
        self.radius_mm = float(radius_mm)
        self.amplitude_mm = float(amplitude_mm)
        ref_model = ShellModel(self.base_params)
        self.r_ref = float(np.asarray(ref_model.mean_radius(self.apex_v)))
        self.plateau_mm = math.radians(self.bust_plateau_theta) * self.r_ref

        self._finish_init(n_v=n_v, n_t=n_t)

        if check_cf_is_max:
            self.cf_max_violation_mm = assert_cf_is_max(self)
        else:
            self.cf_max_violation_mm = None

    # -- the bump field ------------------------------------------------
    def bump(self, theta_deg, v):
        theta_deg = np.asarray(theta_deg, dtype=float)
        v = np.asarray(v, dtype=float)
        dtheta_mm = np.radians(_wrap180(theta_deg)) * self.r_ref
        dv = v - self.apex_v
        lateral = np.maximum(0.0, np.abs(dtheta_mm) - self.plateau_mm)
        d = np.hypot(lateral, dv)
        return self.amplitude_mm * _falloff(d, self.radius_mm)


def assert_cf_is_max(depth, n_theta=721, n_v=41, tol_mm=2e-3):
    """HARD CONSTRAINT, checked numerically after every PlateauBustDepth
    build: depth_at(0, v) >= depth_at(theta, v) for every theta, over the
    full vertical reach the bump could plausibly affect. Raises
    ApexError loudly (naming the exact worst offender) if violated.
    Should never fire — the field is provably monotone by construction
    (see PlateauBustDepth's docstring) — this guards against the ONE
    remaining source of error: the tabulated equal-arc inverse (PCHIP
    resample + RegularGridInterpolator) introducing numerical wiggle the
    continuous math doesn't have. Returns the worst (signed) margin found
    (<= 0 means CF-is-max held everywhere sampled; the more negative, the
    more comfortably)."""
    v_lo = max(depth.v_lo, depth.apex_v - depth.radius_mm - 5.0)
    v_hi = min(depth.v_hi, depth.apex_v + depth.radius_mm + 5.0)
    vv = np.linspace(v_lo, v_hi, n_v)
    th = np.linspace(-180.0, 180.0, n_theta)
    worst = -np.inf
    worst_at = None
    for v in vv:
        cf = float(np.asarray(depth.depth_at(0.0, v)))
        d = np.asarray(depth.depth_at(th, np.full_like(th, v)))
        i = int(np.argmax(d))
        viol = float(d[i] - cf)
        if viol > worst:
            worst = viol
            worst_at = (float(v), float(th[i]))
    if worst > tol_mm:
        raise ApexError(
            f"HARD CONSTRAINT VIOLATED: depth_at(theta, v) exceeds "
            f"depth_at(0, v) [center front] by {worst:.4f} mm at "
            f"v={worst_at[0]:.2f}, theta={worst_at[1]:.2f} deg — CF must "
            f"be the max of the front projection, never a local minimum")
    return worst


def verify_apex_placement(depth):
    """ApexBustDepth only: solve for the true equal-arc azimuth of each
    apex (t such that theta_ref(t, apex_v) == apex_theta_deg is the
    AUTHORING target; the FINAL equal-arc theta at that same t, on the
    bumped curve, is what a panel author would actually see) and report
    the discrepancy."""
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


def verify_plateau_placement(depth):
    """PlateauBustDepth only: crest depth at CF, and — if
    bust_plateau_theta > 0 — where the plateau's authored edge (in the
    reference frame) actually lands in TRUE equal-arc terms. CF itself
    needs no placement check: theta=0 is the EXACT fixed point of the
    mirror symmetry in both the reference and the true equal-arc maps
    (dtheta_mm = 0 identically, by construction, not by solve) — unlike
    the old off-axis apex, there is no reference-frame approximation to
    report for the crest itself."""
    v = depth.apex_v
    crest_depth = float(np.asarray(depth.depth_at(0.0, v)))
    out = {"apex_v": v, "bust_plateau_theta": depth.bust_plateau_theta,
          "crest_depth_mm": crest_depth}
    if depth.bust_plateau_theta <= 0.0:
        out["plateau_true_equal_arc_deg"] = 0.0
        out["plateau_residual_deg"] = 0.0
        return out
    t_grid = np.linspace(0.0, math.pi, 4001)
    theta_ref = depth._theta_ref(t_grid, np.full_like(t_grid, v))
    t_edge = float(np.interp(depth.bust_plateau_theta, theta_ref, t_grid))
    a_v = float(depth.a(v))
    X = a_v * np.sin(t_grid)
    Y = depth.y_of(t_grid, np.full_like(t_grid, v))
    ds = np.hypot(np.gradient(X, t_grid), np.gradient(Y, t_grid))
    arc = np.concatenate([[0.0], np.cumsum(0.5 * (ds[:-1] + ds[1:])
                                           * np.diff(t_grid))])
    P = arc[-1] * 2.0
    theta_true = np.degrees(TAU * np.interp(t_edge, t_grid, arc) / P)
    out["plateau_true_equal_arc_deg"] = theta_true
    out["plateau_residual_deg"] = theta_true - depth.bust_plateau_theta
    return out


class ApexShellModel(ShellModel):
    """ShellModel with a bump-field bust curvature (ApexBustDepth OR the
    new PlateauBustDepth — both share the same .a/.b/.t_of/.y_of
    interface via _BumpedDepth, so one ShellModel subclass serves both).
    Section geometry only — equal-arc theta convention, the fillet, the
    neckline and the split are inherited from the base (bust="plain")
    params, unaffected."""

    def __init__(self, params: ShellParams):
        if not isinstance(params.depth_curve, _BumpedDepth):
            raise ApexError("ApexShellModel needs a bump-field depth "
                            "(ApexBustDepth or PlateauBustDepth)")
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
    """ShellParams for the (committed) two-apex design: a single-ellipse
    committed dress (dress_params(bust="plain") by default) with its
    depth object replaced by the two-apex bumped field."""
    from dataclasses import replace
    base = base_params if base_params is not None else dress_params(bust="plain")
    d = ApexBustDepth(base_params=base, apex_v=apex_v,
                      apex_theta_deg=apex_theta_deg,
                      amplitude_mm=amplitude_mm, radius_mm=radius_mm)
    return replace(base, depth_curve=d)


def plateau_params(apex_v=181.0, bust_plateau_theta=0.0, amplitude_mm=35.4,
                   radius_mm=70.0, base_params=None):
    """ShellParams for the NEW plateau design (prototype, not wired in):
    a single-ellipse committed dress (dress_params(bust="plain") by
    default) with its depth object replaced by the CF-anchored bumped
    field. Build a model with ApexShellModel(plateau_params(...)) —
    ApexShellModel works for either bump-field depth."""
    from dataclasses import replace
    base = base_params if base_params is not None else dress_params(bust="plain")
    d = PlateauBustDepth(base_params=base, apex_v=apex_v,
                         bust_plateau_theta=bust_plateau_theta,
                         amplitude_mm=amplitude_mm, radius_mm=radius_mm)
    return replace(base, depth_curve=d)
