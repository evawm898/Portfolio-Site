"""Waist fillet construction — the bodice meets the skirt through a
smooth fillet, NOT a crease (consolidated spec, 2026-08-15).

THE OVER-DETERMINACY, RESOLVED. With fillet_radius authored, the waist
circumference pinned, and both meridian profiles fixed, a doubly-tangent
arc does not exist: an arc whose minimum equals the crease's own radius
cannot also touch both walls of a kinked valley (four tangency equations,
three unknowns). The spec's construction supplies the missing freedom:
the profiles are EXTRAPOLATED PAST THEIR CURRENT ENDPOINTS by way of a
SOLVED VIRTUAL WAIST w < 609.6 mm —

  - the skirt becomes the superellipse re-solved with waist w (its own
    natural family; the hem stays exactly given),
  - the bodice circumference schedule re-anchors its waist knot to w
    (the underbust / bust / above-bust anchors stay exactly given),

so the two profiles now cross at the VIRTUAL APEX (0, w/2pi) below the
real waist, and the authored-radius fillet nestles in that deeper valley
with its closest approach to the axis exactly the REAL waist radius
(609.6/2pi = 97.02 mm on the r_eq meridian). Unknowns (w, z_c, z1, z2)
against four tangency conditions: exactly determined; solved by Newton.

Everything here operates on the r_eq (perimeter-equivalent) meridian —
the canonical profile that defines the coordinate system. The per-theta
surface fillet reuses the same virtual-waist solution with each theta's
own profile pair (build stage).

The CONIC variant (default fillet_type) reuses the circular solve's
tangency frame and replaces the arc with a rational-quadratic Bezier
whose weight is solved so the conic's minimum is the real waist radius;
its curvature at the joins sits far closer to the profiles' own
curvature than the circle's constant 1/R, and both jumps are reported.
Full G2 (zero jump) needs a spline blend — noted, not built.
"""

import math
from dataclasses import dataclass

import numpy as np
from scipy.interpolate import PchipInterpolator

TAU = 2.0 * math.pi


class FilletError(ValueError):
    """Raised when the fillet construction cannot be solved."""


@dataclass(frozen=True)
class FilletParams:
    fillet_radius: float = 25.0      # mm, authored
    fillet_type: str = "conic"       # 'circular' (G1) | 'conic' (default)
    waist_circumference: float = 609.6
    hem_circumference: float = 1549.4
    drop: float = 381.0
    dome_n: float = 1.6


class _SkirtFamily:
    """r_eq(z; w): superellipse profile re-solved at virtual waist
    circumference w. Hem exactly given; valid continued for z > 0."""

    def __init__(self, p: FilletParams):
        self.hem_r = p.hem_circumference / TAU
        self.n = p.dome_n
        self.drop = p.drop

    def _b_param(self, w):
        rr = (w / TAU) / self.hem_r
        return self.drop / (1.0 - rr ** self.n) ** (1.0 / self.n)

    def r(self, z, w):
        u = np.asarray(z, dtype=float) + self.drop
        t = (u / self._b_param(w)) ** self.n
        return self.hem_r * (1.0 - t) ** (1.0 / self.n)

    def dr(self, z, w, h=1e-4):
        return (self.r(np.asarray(z) + h, w) - self.r(np.asarray(z) - h, w)) / (2 * h)


class _BodiceFamily:
    """r_eq(z; w): the bodice circumference schedule with its waist knot
    re-anchored at w; underbust / bust / above-bust anchors exactly
    given. PCHIP extrapolates naturally below z = 0."""

    ANCHORS = ((152.4, 711.2), (203.2, 863.6), (254.0, 812.8))

    def _interp(self, w):
        v = np.array([0.0] + [a[0] for a in self.ANCHORS])
        c = np.array([w] + [a[1] for a in self.ANCHORS])
        return PchipInterpolator(v, c, extrapolate=True)

    def r(self, z, w):
        return self._interp(w)(np.asarray(z, dtype=float)) / TAU

    def dr(self, z, w, h=1e-4):
        return (self.r(np.asarray(z) + h, w) - self.r(np.asarray(z) - h, w)) / (2 * h)


class WaistFillet:
    """Solve the construction; expose evaluation + the report numbers.

    By default operates on the r_eq meridian (perimeter/2pi) with the
    skirt superellipse + bodice-schedule families. Passing `families`
    ((skirt_fam, bodice_fam), target_min_radius, radius_mm) runs the
    identical construction on any other profile pair — the depth b(z)
    profile uses it with its own scaled radius."""

    def __init__(self, params: FilletParams = FilletParams(), families=None,
                 target_min_radius=None, radius_mm=None):
        p = params
        if p.fillet_radius <= 0:
            raise FilletError(f"fillet_radius must be > 0, got {p.fillet_radius}")
        if p.fillet_type not in ("circular", "conic"):
            raise FilletError(f"fillet_type must be circular|conic, got {p.fillet_type}")
        self.params = p
        if families is None:
            self.skirt = _SkirtFamily(p)
            self.bodice = _BodiceFamily()
        else:
            self.skirt, self.bodice = families
        self.waist_r = (p.waist_circumference / TAU if target_min_radius is None
                        else float(target_min_radius))
        self._w_scale = (p.waist_circumference if target_min_radius is None
                         else self.waist_r * TAU)
        R = float(radius_mm) if radius_mm is not None else p.fillet_radius
        self.radius_mm = R
        r_c = self.waist_r + R          # arc bottom exactly at the waist

        def residuals(x):
            w, z_c, z1, z2 = x
            rs, drs = float(self.skirt.r(z1, w)), float(self.skirt.dr(z1, w))
            rb, drb = float(self.bodice.r(z2, w)), float(self.bodice.dr(z2, w))
            return np.array([
                (z1 - z_c) ** 2 + (rs - r_c) ** 2 - R * R,
                (z1 - z_c) + (rs - r_c) * drs,
                (z2 - z_c) ** 2 + (rb - r_c) ** 2 - R * R,
                (z2 - z_c) + (rb - r_c) * drb,
            ])

        x = np.array([self._w_scale * 0.98, 0.0, -0.6 * R, 0.6 * R])
        ok = False
        for _ in range(120):
            f = residuals(x)
            # residuals are mm^2 / mm-scale: 1e-8 is sub-micron geometry
            # (trace-spline FD derivatives floor out above 1e-10)
            if np.max(np.abs(f)) < 1e-8:
                ok = True
                break
            J = np.empty((4, 4))
            for j in range(4):
                dx = np.zeros(4)
                dx[j] = 1e-6 * max(1.0, abs(x[j]))
                J[:, j] = (residuals(x + dx) - residuals(x - dx)) / (2 * dx[j])
            step = np.linalg.solve(J, f)
            # damped update keeps the virtual waist physical
            x = x - np.clip(step, -20.0, 20.0)
            x[0] = min(x[0], self._w_scale - 1e-6)
        if not ok:
            raise FilletError(
                f"fillet Newton did not converge for R={R} (residual "
                f"{np.max(np.abs(residuals(x))):.2e})")
        self.virtual_waist_circumference, self.z_center, self.z1, self.z2 = \
            (float(v) for v in x)
        self.r_center = r_c
        if not (self.z1 < self.z_center < self.z2):
            raise FilletError(
                f"tangency ordering broken: z1={self.z1:.2f}, "
                f"zc={self.z_center:.2f}, z2={self.z2:.2f}")

        w = self.virtual_waist_circumference
        self.virtual_apex_radius = float(self.skirt.r(0.0, w))
        self.tangency_skirt = (self.z1, float(self.skirt.r(self.z1, w)))
        self.tangency_bodice = (self.z2, float(self.bodice.r(self.z2, w)))
        # how far each surface extends past its OLD endpoint (z = 0, real
        # waist) toward the virtual apex before the arc takes over
        self.skirt_extension_mm = self._arc_len(self.skirt, max(self.z1, 0.0),
                                                None) if self.z1 > 0 else 0.0
        self.bodice_extension_mm = self._arc_len(self.bodice, None,
                                                 min(self.z2, 0.0)) if self.z2 < 0 else 0.0
        # profile arc consumed by the fillet on each side (old curve
        # between the tangency point and the old crease at z = 0)
        self.skirt_consumed_mm = self._consumed(self.skirt, self.z1, 0.0)
        self.bodice_consumed_mm = self._consumed(self.bodice, 0.0, self.z2)

        # G1 residual at the joins (tangent angle mismatch, degrees)
        self.g1_residual_deg = max(
            self._g1(self.skirt, self.z1), self._g1(self.bodice, self.z2))

        # curvature jumps at the joins: |kappa_fillet - kappa_profile|
        self.circular_kappa_jump = (
            abs(1.0 / R - self._profile_kappa(self.skirt, self.z1)),
            abs(1.0 / R - self._profile_kappa(self.bodice, self.z2)))
        self._solve_conic()

        # the waist after filleting
        self.waist_after_mm = TAU * self.min_radius()
        if abs(self.waist_after_mm - self._w_scale) > 1e-6:
            raise FilletError(
                f"waist drifted: {self.waist_after_mm:.6f} vs "
                f"{self._w_scale} mm")

    # -- helpers -------------------------------------------------------------

    def _arc_len(self, fam, z_from, z_to, n=200):
        a = 0.0 if z_from is None else z_from
        b = 0.0 if z_to is None else z_to
        lo, hi = min(a, b), max(a, b)
        if hi - lo < 1e-12:
            return 0.0
        zz = np.linspace(lo, hi, n)
        rr = fam.r(zz, self.virtual_waist_circumference)
        return float(np.sum(np.hypot(np.diff(zz), np.diff(rr))))

    def _consumed(self, fam, lo, hi, n=200):
        if hi - lo < 1e-12:
            return 0.0
        zz = np.linspace(lo, hi, n)
        rr = fam.r(zz, self._w_scale)  # the OLD (real-waist) curve
        return float(np.sum(np.hypot(np.diff(zz), np.diff(rr))))

    def _g1(self, fam, zt):
        w = self.virtual_waist_circumference
        prof = math.atan(float(fam.dr(zt, w)))
        dz, dr = zt - self.z_center, float(fam.r(zt, w)) - self.r_center
        circ = math.atan2(-dz, dr)   # tangent of the circle at that point
        d = abs(math.degrees(prof - circ)) % 180.0
        return min(d, 180.0 - d)

    def _profile_kappa(self, fam, zt, h=0.5):
        w = self.virtual_waist_circumference
        d1 = float(fam.dr(zt, w))
        d2 = (float(fam.dr(zt + h, w)) - float(fam.dr(zt - h, w))) / (2 * h)
        return abs(d2) / (1.0 + d1 * d1) ** 1.5

    # -- conic variant -------------------------------------------------------

    def _solve_conic(self):
        """Rational quadratic on the circular tangency frame; weight
        solved so the conic's minimum radius is the real waist."""
        (z1, r1), (z2, r2) = self.tangency_skirt, self.tangency_bodice
        w = self.virtual_waist_circumference
        m1 = float(self.skirt.dr(z1, w))
        m2 = float(self.bodice.dr(z2, w))
        # apex control point: intersection of the tangent lines
        zc = ((r2 - m2 * z2) - (r1 - m1 * z1)) / (m1 - m2)
        rc = r1 + m1 * (zc - z1)
        self.conic_apex_control = (float(zc), float(rc))

        def conic_min(rho):
            t = np.linspace(0.0, 1.0, 4001)
            b0 = (1 - t) ** 2
            b1 = 2 * t * (1 - t) * rho
            b2 = t ** 2
            den = b0 + b1 + b2
            rr = (b0 * r1 + b1 * rc + b2 * r2) / den
            return float(rr.min())

        lo, hi = 0.05, 20.0
        target = self.waist_r
        f_lo, f_hi = conic_min(lo) - target, conic_min(hi) - target
        if f_lo * f_hi > 0:
            raise FilletError("conic weight cannot reach the waist radius "
                              f"(min range {conic_min(lo):.3f}..{conic_min(hi):.3f} "
                              f"vs target {target:.3f})")
        for _ in range(80):
            mid = 0.5 * (lo + hi)
            fm = conic_min(mid) - target
            if f_lo * fm <= 0:
                hi = mid
            else:
                lo, f_lo = mid, fm
        self.conic_rho = 0.5 * (lo + hi)
        # conic curvature at an endpoint of a rational quadratic:
        # kappa = w1... use numeric evaluation near t=0 / t=1
        self.conic_kappa_jump = (
            abs(self._conic_kappa(0.0) - self._profile_kappa(self.skirt, z1)),
            abs(self._conic_kappa(1.0) - self._profile_kappa(self.bodice, z2)))

    def _conic_eval(self, t):
        (z1, r1), (z2, r2) = self.tangency_skirt, self.tangency_bodice
        zc, rc = self.conic_apex_control
        rho = self.conic_rho
        t = np.asarray(t, dtype=float)
        b0, b1, b2 = (1 - t) ** 2, 2 * t * (1 - t) * rho, t ** 2
        den = b0 + b1 + b2
        return ((b0 * z1 + b1 * zc + b2 * z2) / den,
                (b0 * r1 + b1 * rc + b2 * r2) / den)

    def _conic_kappa(self, t0, h=1e-4):
        t = np.array([max(t0, h) - h, max(t0, h), max(t0, h) + h]) \
            if t0 < 0.5 else np.array([min(t0, 1 - h) - h, min(t0, 1 - h),
                                       min(t0, 1 - h) + h])
        z, r = self._conic_eval(t)
        dz, dr = np.gradient(z, t), np.gradient(r, t)
        ddz, ddr = np.gradient(dz, t), np.gradient(dr, t)
        i = 1
        num = abs(dz[i] * ddr[i] - dr[i] * ddz[i])
        den = (dz[i] ** 2 + dr[i] ** 2) ** 1.5
        return num / den

    # -- evaluation ----------------------------------------------------------

    def min_radius(self, n=4001):
        if self.params.fillet_type == "circular":
            return self.r_center - self.radius_mm
        t = np.linspace(0.0, 1.0, n)
        _, rr = self._conic_eval(t)
        return float(np.min(rr))

    def arc_points(self, n=200):
        """(z, r) polyline of the fillet for plotting/meshing."""
        if self.params.fillet_type == "circular":
            a1 = math.atan2(self.tangency_skirt[1] - self.r_center,
                            self.tangency_skirt[0] - self.z_center)
            a2 = math.atan2(self.tangency_bodice[1] - self.r_center,
                            self.tangency_bodice[0] - self.z_center)
            # sweep through the bottom of the circle
            if a1 < a2:
                a1 += TAU
            aa = np.linspace(a1, a2, n)
            return (self.z_center + self.radius_mm * np.cos(aa),
                    self.r_center + self.radius_mm * np.sin(aa))
        t = np.linspace(0.0, 1.0, n)
        return self._conic_eval(t)


class _ScaledFamily:
    """A profile family measured on a scaled axis: r(z, w) =
    f * base.r(z, w / f) — lets the b(z) depth profiles reuse the r_eq
    family machinery with w expressed in depth-circumference units."""

    def __init__(self, base, factor):
        self.base = base
        self.f = float(factor)

    def r(self, z, w):
        return self.f * self.base.r(z, w / self.f)

    def dr(self, z, w, h=1e-4):
        return self.f * self.base.dr(z, w / self.f, h)


class _TraceDepthFamily:
    """Bodice depth family: b(z; w) = (w / 2pi) * shape(z), where shape
    is the side-trace normalization (smooth through z = 0, so the
    extension below the waist is the trace's own continuation)."""

    def __init__(self, side_fit):
        self.fit = side_fit
        self.b0 = float(side_fit.b(0.0))

    def r(self, z, w):
        return (w / TAU) * np.asarray(self.fit.b(np.asarray(z))) / self.b0

    def dr(self, z, w, h=1e-4):
        return (self.r(np.asarray(z) + h, w) - self.r(np.asarray(z) - h, w)) / (2 * h)


class FilletedDressProfiles:
    """The COMPLETE filleted dress profile pair (P(z), b(z)) — plugs into
    the shell's authored-depth mode via .b / .perimeter / .v_lo / .v_hi.

    - the r_eq/P profile carries the authored-radius fillet (virtual
      waist solved; hem + upper anchors exactly given)
    - the depth profile carries the same construction at the axis-scaled
      radius R_b = R * b_waist / r_eq_waist (construction choice,
      reported), preserving the waist depth 76.85 exactly
    - beyond its fillet zone the bodice depth follows the virtual-rebased
      trace shape and the monotone bust-crest continuation recomputed on
      the virtual base (sub-0.1% rebase)
    - the two fillet bottoms land at slightly different z; the min-P
      ring's section-shape drift vs the old waist ellipse is reported as
      plan_closure_residual_mm (the spec asks for this residual)."""

    BUST_V = 203.2
    ABOVE_CIRC = 812.8
    ABOVE_V = 254.0

    def __init__(self, side_fit, params: FilletParams = FilletParams(),
                 v_top=240.0, n_grid=3001):
        from bodice import solve_a_given_b, solve_semi_axes, _perimeter_np
        self.params = params
        self.v_lo, self.v_hi = -params.drop, float(v_top)
        b_waist = 76.846279          # solved skirt waist depth at k = 1.5
        r_eq_waist = params.waist_circumference / TAU

        # r_eq fillet (authored radius)
        self.p_fillet = WaistFillet(params)
        # depth fillet at the axis-scaled radius
        sb = b_waist / r_eq_waist
        self.depth_radius_mm = params.fillet_radius * sb
        skirt_b = _ScaledFamily(_SkirtFamily(params), sb)
        bod_b = _TraceDepthFamily(side_fit)
        self.b_fillet = WaistFillet(
            params, families=(skirt_b, bod_b),
            target_min_radius=b_waist, radius_mm=self.depth_radius_mm)

        w_p = self.p_fillet.virtual_waist_circumference
        w_b = self.b_fillet.virtual_waist_circumference
        cut = float(side_fit.v_hi)
        self.depth_extrapolated_above_v = cut

        # bodice depth beyond the fillet zone: virtual-rebased trace, then
        # the monotone crest continuation recomputed on the virtual base
        wb_base = w_b / TAU                    # virtual waist depth
        shape = lambda z: np.asarray(side_fit.b(np.asarray(z))) / float(side_fit.b(0.0))
        b_cut = wb_base * float(shape(cut))
        s_cut = wb_base * float(side_fit.db(cut)) / float(side_fit.b(0.0)) \
            * float(side_fit.b(0.0))           # = wb_base * shape'(cut)
        s_cut = wb_base * (float(side_fit.db(cut)) / float(side_fit.b(0.0)))
        h_seg = self.BUST_V - cut
        self.b_bust = b_cut + 0.5 * s_cut * h_seg
        a_bust = float(solve_a_given_b(863.6, self.b_bust))
        self.bust_ratio_output = a_bust / self.b_bust
        _, b_above, _ = solve_semi_axes(self.ABOVE_CIRC, self.bust_ratio_output)

        def hermite(x, x0, x1, y0, y1, m0, m1):
            t = (x - x0) / (x1 - x0)
            hh = x1 - x0
            return (y0 * (1 + 2 * t) * (1 - t) ** 2 + m0 * hh * t * (1 - t) ** 2
                    + y1 * t * t * (3 - 2 * t) + m1 * hh * t * t * (t - 1))

        # tabulate both profiles on a dense grid
        z = np.unique(np.concatenate([
            np.linspace(self.v_lo, self.v_hi, n_grid),
            np.linspace(-60.0, 60.0, 1201)]))     # extra density in the zone
        P = np.empty_like(z)
        pf = self.p_fillet
        m_lo = z <= pf.z1
        m_hi = z >= pf.z2
        m_arc = ~(m_lo | m_hi)
        P[m_lo] = TAU * np.asarray(pf.skirt.r(z[m_lo], w_p))
        P[m_hi] = TAU * np.asarray(pf.bodice.r(z[m_hi], w_p))
        if np.any(m_arc):
            az, ar = pf.arc_points(600)
            order = np.argsort(az)
            P[m_arc] = TAU * np.interp(z[m_arc], az[order], ar[order])

        B = np.empty_like(z)
        bf = self.b_fillet
        n_lo = z <= bf.z1
        n_arc = (z > bf.z1) & (z < bf.z2)
        B[n_lo] = np.asarray(bf.skirt.r(z[n_lo], w_b))
        if np.any(n_arc):
            az, ar = bf.arc_points(600)
            order = np.argsort(az)
            B[n_arc] = np.interp(z[n_arc], az[order], ar[order])
        n_mid = (z >= bf.z2) & (z <= cut)
        B[n_mid] = wb_base * shape(z[n_mid])
        n_rise = (z > cut) & (z <= self.BUST_V)
        B[n_rise] = hermite(z[n_rise], cut, self.BUST_V, b_cut, self.b_bust,
                            s_cut, 0.0)
        n_top = z > self.BUST_V
        B[n_top] = hermite(z[n_top], self.BUST_V, self.ABOVE_V, self.b_bust,
                           float(b_above), 0.0,
                           2.0 * (float(b_above) - self.b_bust)
                           / (self.ABOVE_V - self.BUST_V))
        if np.any(B <= 0) or np.any(P <= 0):
            raise FilletError("filleted profiles dipped non-positive")

        self._P = PchipInterpolator(z, P)
        self._B = PchipInterpolator(z, B)

        # the min-P (waist) ring + plan closure residual vs the old ellipse
        zz = np.linspace(-40.0, 40.0, 4001)
        Pz = self._P(zz)
        i = int(np.argmin(Pz))
        self.waist_ring_z = float(zz[i])
        self.waist_ring_circumference = float(Pz[i])
        a_w = float(solve_a_given_b(self.waist_ring_circumference,
                                    float(self._B(zz[i]))))
        b_w = float(self._B(zz[i]))
        tt = np.linspace(0.0, TAU, 1441)
        r_new = np.hypot(a_w * np.sin(tt), b_w * np.cos(tt))
        r_old = np.hypot(115.269419 * np.sin(tt), 76.846279 * np.cos(tt))
        self.plan_closure_residual_mm = float(np.max(np.abs(r_new - r_old)))
        self.waist_section = (a_w, b_w)

    @property
    def fillet_zone(self):
        """(z_lo, z_hi) of the blended region — the union of the P and b
        fillet arcs. Outside this the profiles follow their families
        exactly; inside is the waist fillet (seam band / cable bus), so
        the layout keep-out is DERIVED from this extent."""
        return (min(self.p_fillet.z1, self.b_fillet.z1),
                max(self.p_fillet.z2, self.b_fillet.z2))

    def b(self, z):
        return self._B(np.clip(np.asarray(z, dtype=float), self.v_lo, self.v_hi))

    def perimeter(self, z):
        return self._P(np.clip(np.asarray(z, dtype=float), self.v_lo, self.v_hi))
