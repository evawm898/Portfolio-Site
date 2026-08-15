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
    """Solve the construction; expose evaluation + the report numbers."""

    def __init__(self, params: FilletParams = FilletParams()):
        p = params
        if p.fillet_radius <= 0:
            raise FilletError(f"fillet_radius must be > 0, got {p.fillet_radius}")
        if p.fillet_type not in ("circular", "conic"):
            raise FilletError(f"fillet_type must be circular|conic, got {p.fillet_type}")
        self.params = p
        self.skirt = _SkirtFamily(p)
        self.bodice = _BodiceFamily()
        self.waist_r = p.waist_circumference / TAU
        R = p.fillet_radius
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

        x = np.array([p.waist_circumference * 0.98, 0.0, -0.6 * R, 0.6 * R])
        ok = False
        for _ in range(80):
            f = residuals(x)
            if np.max(np.abs(f)) < 1e-10:
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
            x[0] = min(x[0], p.waist_circumference - 1e-6)
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
        if abs(self.waist_after_mm - p.waist_circumference) > 1e-6:
            raise FilletError(
                f"waist drifted: {self.waist_after_mm:.6f} vs "
                f"{p.waist_circumference} mm")

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
        rr = fam.r(zz, self.params.waist_circumference)  # the OLD curve
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
            return self.r_center - self.params.fillet_radius
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
            return (self.z_center + self.params.fillet_radius * np.cos(aa),
                    self.r_center + self.params.fillet_radius * np.sin(aa))
        t = np.linspace(0.0, 1.0, n)
        return self._conic_eval(t)
