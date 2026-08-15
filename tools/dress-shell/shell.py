"""Parametric rigid shell — CONFIRMED SKIRT, ELLIPTICAL SECTIONS.

The garment is rigid, formed in 3D from the start, never flattened. Two
separate pieces, FRONT and BACK, split at the side seams (theta = +-90);
no hinge, side closure out of scope.

SKIRT: the superellipse profile now defines the PERIMETER schedule, not
a radius. With u measured UPWARD from the hem (u in [0, drop]):

    r_super(u) = a_hem * (1 - (u/b_solved)^n)^(1/n)
    P(u)       = 2*pi * r_super(u)                  (section perimeter)

Each level is an ELLIPSE with semi-axes a(u) (side-to-side) x b(u)
(front-to-back), solved from P(u) and a ratio schedule k(u) via
Ramanujan's second approximation — the same solve the bodice uses, so
the sections MATCH EXACTLY at the waist seam:

    k(drop) = waist_section_ratio   (the bodice waist ratio, est. 1.5)
    k(0)    = skirt_hem_ratio       (default 1.5 = the waist ratio, i.e. a
                                     CONSTANT-ratio shell: chosen because a
                                     more elliptical hem flattens center
                                     front and relieves the 7.5" flat facet
                                     — user-approved direction, exact value
                                     chosen from the facet-deviation sweep)
    k(u) blends monotonically; ratio_blend selects 'linear' or 'eased'
    (smoothstep) so the rounding-out rate is adjustable.

THE SKIRT IS NO LONGER A SURFACE OF REVOLUTION. Downstream consequences
handled here:

  - THETA IS EQUAL-ARC around each section (not the ellipse parameter
    angle): theta/360 deg of arc == that fraction of the section
    perimeter, so grid columns are physically uniform around each ring.
    theta = 0 stays center front; the mapping is odd in theta, so
    symmetry about CF holds exactly. theta = +-90 lands exactly at the
    ellipse major-axis ends (the true sides) by symmetry.
  - Grid rings stay LEVEL (constant u). The ring parameter `s` is the
    arc length of the PERIMETER-EQUIVALENT mean meridian (radius
    r_eq(z) = P(z)/2pi — identical to the old mean profile when k = 1).
    TRUE meridian arc length now depends on theta and is provided as the
    derived quantity `true_meridian_arc(theta, u)` — it is reported,
    never used as the ring parameter.
  - Principal curvatures come from numeric first/second fundamental
    forms of the general parametric surface (curvature.py); the old
    revolution formulas are invalid off k = 1 and survive only inside
    the k = 1.0 regression test.

BODICE (params.bodice = NecklineParams): the segment above the waist,
z in (0, cf_height]. Sections are the solved/interpolated bodice
ellipses (bodice.BodiceSections over the four anchors — waist,
underbust, bust apex, above-bust taper). Same equal-arc theta, same
P/2pi chart metric. The WAIST IS A CREASE: derivative stencils never
cross z = 0, so each side keeps its own tangent (skirt ~41 deg from
vertical, bodice launching vertically per the monotone interpolant).
THE NECKLINE IS THE PHYSICAL TOP EDGE: the parametric sections extend
to z = cf_height for math convenience, but every exported mesh is
clamped to z <= neckline_height(theta) (no shell above the curve), and
layout legality + cell analysis enforce the keep-out band below it.
bodice=None keeps the skirt-only shell (z_top = 0) — every previous
behavior unchanged.
"""

import math
from dataclasses import dataclass

import numpy as np

from bodice import BodiceSections, circumference_schedule, solve_a_given_b
from neckline import (NecklineCurve, NecklineParams, NecklineV3,
                      NecklineV3Params)

# 24-point Gauss-Legendre nodes/weights on [-1, 1] for ellipse-arc
# quadrature (smooth integrand -> ~machine precision on a quarter arc).
_GL24 = np.polynomial.legendre.leggauss(24)


class ShellError(ValueError):
    """Raised when the measurements do not describe a valid shell."""


@dataclass(frozen=True)
class Ring:
    """A labeled cross-section (for reports)."""
    name: str
    z: float
    circumference: float


def ellipse_perimeter(a, b):
    """Ramanujan's second approximation, vectorized."""
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    h = ((a - b) / (a + b)) ** 2
    return np.pi * (a + b) * (1.0 + 3.0 * h / (10.0 + np.sqrt(4.0 - 3.0 * h)))


def solve_semi_axes(perimeter, ratio):
    """Vectorized (a, b) with a/b == ratio hitting `perimeter` under
    Ramanujan (linear in uniform scale -> exact for the formula)."""
    unit = ellipse_perimeter(np.asarray(ratio, dtype=float), 1.0)
    b = np.asarray(perimeter, dtype=float) / unit
    return np.asarray(ratio, dtype=float) * b, b


@dataclass(frozen=True)
class ShellParams:
    """Confirmed skirt measurements (mm). Bodice intentionally absent."""
    waist_circumference: float = 609.6   # 24 in
    hem_circumference: float = 1549.4    # 61 in
    drop: float = 381.0                  # waist-to-hem vertical, 15 in
    dome_n: float = 1.6                  # dome fullness
    waist_section_ratio: float = 1.5     # = bodice waist ratio (user estimate)
    skirt_hem_ratio: float = 1.5         # constant-ratio shell relieves the
                                         # CF facet (dev 9.12 -> 8.09 mm)
    ratio_blend: str = "linear"          # 'linear' | 'eased' (smoothstep)
    fillet_radius: float = 0.0           # 0 = sharp waist crease (the design)
    waist_band_halfwidth: float = 8.0    # seam band / cable bus, mm each
                                         # side — FALLBACK only: when the
                                         # depth model carries a fillet
                                         # zone, the layout band is DERIVED
                                         # from that extent instead
    armhole_band_halfwidth: float = 8.0  # keep-out each side of the
                                         # FRONT/BACK piece seam, mm
    bodice: object = None                # None = skirt only; NecklineParams
                                         # activates the bodice segment
    depth_curve: object = None           # AUTHORED half-depth b(z) from the
                                         # traced silhouette (needs .b(z),
                                         # .v_lo, .v_hi); None = ratio mode.
                                         # In authored mode the a/b ratio is
                                         # an OUTPUT: a(z) is solved from the
                                         # perimeter schedule via Ramanujan.
    section_curves: object = None        # SILHOUETTE-FIRST: both semi-axes
                                         # authored (ComposedSections); the
                                         # perimeter is an OUTPUT and body
                                         # circumferences become clearance
                                         # checks. Mutually exclusive with
                                         # depth_curve.
    split_theta: float = 90.0            # FRONT/BACK piece split (deg); the
                                         # committed dress passes the SOLVED
                                         # armhole angle here


_DRESS_CURVES = None


def dress_curves():
    """The committed SILHOUETTE-FIRST sections: side + front traces,
    hem-pinned to the given 61 in. Cached per process (the two fits cost
    ~a second)."""
    global _DRESS_CURVES
    if _DRESS_CURVES is None:
        from pathlib import Path
        from silhouette import ComposedSections, FittedDepth, extract_from_image
        here = Path(__file__).resolve().parent
        side = FittedDepth(
            extract_from_image(here / "silhouette-trace.png")[0])
        front = FittedDepth(
            extract_from_image(here / "silhouette-front.png", fill="dark")[0],
            knot_mm=60.0)
        _DRESS_CURVES = ComposedSections(side, front, hem_perimeter_mm=1549.4)
    return _DRESS_CURVES


_DRESS_SIDE = None


def dress_side_fit():
    """The committed side-silhouette depth fit, cached per process (the
    extraction + fit cost ~a second)."""
    global _DRESS_SIDE
    if _DRESS_SIDE is None:
        from pathlib import Path
        from silhouette import FittedDepth, extract_from_image
        here = Path(__file__).resolve().parent
        _DRESS_SIDE = FittedDepth(
            extract_from_image(here / "silhouette-trace.png")[0])
    return _DRESS_SIDE


_DRESS_DEPTH = {}


def dress_depth(fillet_params=None, v_top=240.0):
    """The committed profiles (consolidated spec): the superellipse bell
    + traced bodice depth, joined through the WAIST FILLET (R = 25 conic
    by default, virtual-waist construction, waist circumference
    preserved). Cached per (radius, type, v_top) so the editor can sweep
    the fillet live."""
    from fillet import FilletedDressProfiles, FilletParams
    fp = fillet_params if fillet_params is not None else FilletParams()
    key = (fp.fillet_radius, fp.fillet_type, float(v_top))
    if key not in _DRESS_DEPTH:
        _DRESS_DEPTH[key] = FilletedDressProfiles(dress_side_fit(), fp,
                                                  v_top=float(v_top))
    return _DRESS_DEPTH[key]


def dress_params(fillet_params=None, bodice=None) -> ShellParams:
    """The committed DRESS design (consolidated spec, approved): filleted
    waist (R = 25 conic), traced bodice depth with monotone bust crest,
    width solved from the given circumferences (ratios = outputs),
    neckline v3 (CF 220 / peak 240 @ 82 / side 190 / CB 145), and the
    FRONT/BACK split at the SOLVED armhole angle. Export, editor, and
    reports build from this one constructor — single source of truth.
    The fillet/neckline overrides exist for the editor's live rebuild;
    the armhole split re-solves whenever the fillet moves P(190)."""
    bp = bodice if bodice is not None else NecklineV3Params()
    v_top = max(240.0, float(getattr(bp, "peak_height", 0.0) or 0.0),
                float(getattr(bp, "cf_height", 0.0) or 0.0))
    d = dress_depth(fillet_params, v_top=v_top)
    # armhole from the across-back tape on the filleted schedule:
    # theta = 180 - 180 * arc / P(190)
    P190 = float(np.asarray(d.perimeter(190.0)))
    split = 180.0 - 180.0 * 360.0 / P190
    return ShellParams(bodice=bp, depth_curve=d, split_theta=split)


class ShellModel:
    """Superellipse-perimeter skirt with elliptical sections and EQUAL-ARC
    theta. Geometry interface: a(z)/b(z) semi-axes, da/db, point(theta, z)
    with theta in equal-arc radians, section_perimeter(z), and the frame
    helpers coords.py builds on."""

    is_swept_ellipse = True   # curvature.py: use numeric fundamental forms

    def __init__(self, params: ShellParams = ShellParams()):
        p = params
        for name, v in (("waist_circumference", p.waist_circumference),
                        ("hem_circumference", p.hem_circumference),
                        ("drop", p.drop), ("dome_n", p.dome_n),
                        ("waist_section_ratio", p.waist_section_ratio),
                        ("skirt_hem_ratio", p.skirt_hem_ratio)):
            if not (isinstance(v, (int, float)) and math.isfinite(v) and v > 0):
                raise ShellError(f"{name} must be a positive number, got {v!r}")
        if p.waist_circumference >= p.hem_circumference:
            raise ShellError(
                f"waist circumference ({p.waist_circumference}) must be smaller "
                f"than hem circumference ({p.hem_circumference})")
        if not 1.0 < p.dome_n <= 8.0:
            raise ShellError(f"dome_n must be in (1, 8], got {p.dome_n}")
        if not 1.0 <= p.waist_section_ratio <= 3.0:
            raise ShellError(f"waist_section_ratio must be in [1, 3], "
                             f"got {p.waist_section_ratio}")
        if not 1.0 <= p.skirt_hem_ratio <= 3.0:
            raise ShellError(f"skirt_hem_ratio must be in [1, 3], "
                             f"got {p.skirt_hem_ratio}")
        if p.ratio_blend not in ("linear", "eased"):
            raise ShellError(f"ratio_blend must be 'linear' or 'eased', "
                             f"got {p.ratio_blend!r}")
        if p.fillet_radius != 0.0:
            raise ShellError(
                "fillet_radius > 0 is reserved for the softened-waist variant "
                "and is not implemented; the sharp crease is the current design")
        if p.waist_band_halfwidth < 0:
            raise ShellError(f"waist_band_halfwidth must be >= 0, "
                             f"got {p.waist_band_halfwidth}")
        if p.armhole_band_halfwidth < 0:
            raise ShellError(f"armhole_band_halfwidth must be >= 0, "
                             f"got {p.armhole_band_halfwidth}")
        if p.bodice is not None and not isinstance(
                p.bodice, (NecklineParams, NecklineV3Params)):
            raise ShellError(
                f"bodice must be None or Neckline(V3)Params, got {type(p.bodice)}")

        self.params = p
        self.hem_radius = p.hem_circumference / math.tau
        self.waist_radius = p.waist_circumference / math.tau
        rr = self.waist_radius / self.hem_radius
        self.b_param = p.drop / (1.0 - rr ** p.dome_n) ** (1.0 / p.dome_n)
        self.n = p.dome_n
        self.z_bottom = -p.drop

        if p.bodice is None:
            self.neckline = None
            self.sections = None
            self.z_top = 0.0
        else:
            self.neckline = (NecklineV3(p.bodice)
                             if isinstance(p.bodice, NecklineV3Params)
                             else NecklineCurve(p.bodice))
            self.sections = BodiceSections()          # the confirmed anchors
            if self.neckline.v_max > self.sections.v_top + 1e-9:
                raise ShellError(
                    f"neckline top ({self.neckline.v_max}) exceeds the "
                    f"highest section anchor ({self.sections.v_top}); supply "
                    f"a taller anchor rather than extrapolating")
            # bodice waist section must MATCH the skirt waist section. In
            # ratio mode both are solved from the same circumference, so
            # the ratios must agree; in authored-depth mode both sides use
            # the SAME b(0) and the same circumference — matched by
            # construction, nothing to check.
            if p.depth_curve is None:
                a_b, b_b = float(self.sections.a(0.0)), float(self.sections.b(0.0))
                skirt_ratio = p.waist_section_ratio
                if abs(a_b / b_b - skirt_ratio) > 1e-6:
                    raise ShellError(
                        f"waist ratio mismatch: bodice sections give "
                        f"{a_b / b_b:.6f}, skirt uses {skirt_ratio}")
            self.z_top = float(self.neckline.v_max)
        # piece split: FRONT is |theta| < split_theta (90 by assumption
        # historically; the solved armhole angle on the committed dress)
        self.split_theta = float(p.split_theta)

        # -- silhouette-first mode (both axes authored, P = output) ----------
        self.curves = p.section_curves
        if self.curves is not None:
            if p.depth_curve is not None:
                raise ShellError("choose ONE of depth_curve / section_curves")
            if (self.curves.v_lo > self.z_bottom + 1e-6
                    or self.curves.v_hi < self.z_top - 1e-6):
                raise ShellError(
                    f"section curves cover [{self.curves.v_lo:.1f}, "
                    f"{self.curves.v_hi:.1f}] mm but the shell needs "
                    f"[{self.z_bottom:.1f}, {self.z_top:.1f}]")

        # -- authored-depth mode (silhouette honored) ------------------------
        self.depth = p.depth_curve
        self._a_tab = None
        if self.depth is not None:
            lo, hi = float(self.depth.v_lo), float(self.depth.v_hi)
            if lo > self.z_bottom + 1e-6 or hi < self.z_top - 1e-6:
                raise ShellError(
                    f"authored depth covers [{lo:.1f}, {hi:.1f}] mm but the "
                    f"shell needs [{self.z_bottom:.1f}, {self.z_top:.1f}] — "
                    f"refusing to extrapolate a measurement")
            self._circ_bodice = (circumference_schedule() if self.sections
                                 else None)
            # a(z) precomputed per segment (Newton once on a dense grid,
            # then PCHIP) so semi_axes stays as fast as the ratio solve;
            # segments stay separate so the waist crease survives
            from scipy.interpolate import PchipInterpolator
            tabs = []
            worst = 0.0
            segs = [(self.z_bottom, 0.0, 1401)]
            if self.z_top > 1e-9:
                segs.append((0.0, self.z_top, 801))
            for z0, z1, n in segs:
                zg = np.linspace(z0, z1, n)
                bg = np.asarray(self.depth.b(zg), dtype=float)
                Pg = np.asarray(self._perimeter_schedule(zg), dtype=float)
                ag = solve_a_given_b(Pg, bg)
                tabs.append((z0, z1, PchipInterpolator(zg, ag)))
                worst = max(worst, float(np.max(np.abs(
                    ellipse_perimeter(ag, bg) - Pg))))
            self._a_tab = tabs
            self.depth_solve_residual_mm = worst

    def _perimeter_schedule(self, z):
        """P(z): the KNOWN circumference at every height — superellipse
        schedule on the skirt, anchor-interpolated on the bodice; a depth
        object carrying its own .perimeter (the FILLETED profiles)
        overrides both."""
        z = np.asarray(z, dtype=float)
        if self.depth is not None and hasattr(self.depth, "perimeter"):
            return np.asarray(self.depth.perimeter(z), dtype=float)
        P = math.tau * np.asarray(self.r_super(z), dtype=float)
        if self._circ_bodice is None:
            return P
        return np.where(z > 0.0, self._circ_bodice(z), P)

    # -- perimeter + ratio schedules -----------------------------------------

    def _u(self, z):
        return np.clip(np.asarray(z, dtype=float) - self.z_bottom,
                       0.0, self.params.drop)

    def r_super(self, z):
        """Perimeter-defining superellipse profile (mm)."""
        u = self._u(z)
        return self.hem_radius * (1.0 - (u / self.b_param) ** self.n) ** (1.0 / self.n)

    def dr_super(self, z):
        u = self._u(z)
        t = (u / self.b_param) ** self.n
        return (-(self.hem_radius / self.b_param) * (u / self.b_param) ** (self.n - 1.0)
                * (1.0 - t) ** (1.0 / self.n - 1.0))

    def section_perimeter(self, z):
        return math.tau * np.asarray(self.mean_radius(z))

    def ratio(self, z):
        """AUTHORED mode: the a/b ratio is an OUTPUT — measured depth,
        solved width. RATIO mode: the skirt schedule k(u), hem value at
        u = 0 blending monotonically to the bodice waist ratio at
        u = drop (bodice sections carry their own anchor ratios)."""
        if self.depth is not None or self.curves is not None:
            a, b = self.semi_axes(z)
            return np.asarray(a) / np.asarray(b)
        x = self._u(z) / self.params.drop
        if self.params.ratio_blend == "eased":
            x = x * x * (3.0 - 2.0 * x)      # smoothstep, still monotone
        return (self.params.skirt_hem_ratio
                + (self.params.waist_section_ratio - self.params.skirt_hem_ratio) * x)

    def _a_of_z(self, z):
        """Authored mode: the precomputed a(z) table, segment-aware."""
        z_in = np.asarray(z, dtype=float)
        z1 = np.atleast_1d(z_in)
        out = np.empty_like(z1)
        if len(self._a_tab) == 1:
            out[:] = self._a_tab[0][2](np.clip(z1, self.z_bottom, self.z_top))
        else:
            below = z1 <= 0.0
            out[below] = self._a_tab[0][2](np.clip(z1[below], self.z_bottom, 0.0))
            out[~below] = self._a_tab[1][2](np.clip(z1[~below], 0.0, self.z_top))
        return out.reshape(z_in.shape)

    def semi_axes(self, z):
        """(a, b) at height z.
        SILHOUETTE-FIRST mode: both axes authored from the traces.
        AUTHORED-DEPTH mode: b from the silhouette curve, a from the
        perimeter schedule (precomputed Newton table).
        RATIO mode: skirt solved from the schedule and k(z); bodice from
        the interpolated anchor sections."""
        z = np.asarray(z, dtype=float)
        if self.curves is not None:
            return (np.asarray(self.curves.a(z), dtype=float),
                    np.asarray(self.curves.b(z), dtype=float))
        if self.depth is not None:
            return self._a_of_z(z), np.asarray(self.depth.b(z), dtype=float)
        a_s, b_s = solve_semi_axes(
            math.tau * self.r_super(z), self.ratio(z))
        if self.sections is None:
            return a_s, b_s
        up = z > 0.0
        if not np.any(up):
            return a_s, b_s
        a = np.where(up, self.sections.a(z), a_s)
        b = np.where(up, self.sections.b(z), b_s)
        return a, b

    def a(self, z):
        return self.semi_axes(z)[0]

    def b(self, z):
        return self.semi_axes(z)[1]

    _DZ = 0.5

    def _d_guarded(self, f, z):
        """d/dz with one-sided second-order stencils of correct spacing at
        the profile ends (never a clamped centered difference) AND at the
        waist crease: stencils never cross z = 0 when a bodice exists, so
        each side of the crease keeps its own one-sided tangent."""
        z_in = np.asarray(z, dtype=float)
        z1 = np.atleast_1d(z_in)
        h = self._DZ
        if self.sections is None:
            seg_lo = np.full_like(z1, self.z_bottom)
            seg_hi = np.full_like(z1, self.z_top)
        else:
            below = z1 <= 0.0
            seg_lo = np.where(below, self.z_bottom, 0.0)
            seg_hi = np.where(below, 0.0, self.z_top)
        out = np.empty_like(z1)
        lo = z1 < seg_lo + h
        hi = z1 > seg_hi - h
        mid = ~(lo | hi)
        if np.any(mid):
            zm = z1[mid]
            out[mid] = (f(zm + h) - f(zm - h)) / (2.0 * h)
        if np.any(lo):
            zl = z1[lo]
            out[lo] = (-3.0 * f(zl) + 4.0 * f(zl + h) - f(zl + 2 * h)) / (2.0 * h)
        if np.any(hi):
            zh = z1[hi]
            out[hi] = (3.0 * f(zh) - 4.0 * f(zh - h) + f(zh - 2 * h)) / (2.0 * h)
        return out.reshape(z_in.shape)

    def da(self, z):
        return self._d_guarded(self.a, z)

    def db(self, z):
        return self._d_guarded(self.b, z)

    def mean_radius(self, z):
        """Perimeter-equivalent radius r_eq = P/2pi — the ring-parameter
        meridian. Skirt: the superellipse profile itself. Bodice: the
        anchor circumference schedule (authored mode) or the Ramanujan
        perimeter of the interpolated sections (ratio mode)."""
        z = np.asarray(z, dtype=float)
        if self.curves is not None:
            return np.asarray(self.curves.perimeter(z), dtype=float) / math.tau
        if self.depth is not None and hasattr(self.depth, "perimeter"):
            return np.asarray(self.depth.perimeter(z), dtype=float) / math.tau
        r = np.asarray(self.r_super(z), dtype=float)
        if self.sections is None:
            return r
        up = z > 0.0
        if not np.any(up):
            return r
        if self.depth is not None:
            r_up = self._circ_bodice(z) / math.tau
        else:
            r_up = ellipse_perimeter(self.sections.a(z),
                                     self.sections.b(z)) / math.tau
        return np.where(up, r_up, r)

    def mean_slope(self, z):
        """d(r_eq)/dz: closed-form on the skirt, guarded FD on the bodice
        (stencils never crossing the crease). Silhouette-first: guarded FD
        of the authored perimeter everywhere (the curves are smooth
        through the waist — the reference garment has no crease)."""
        z = np.asarray(z, dtype=float)
        if self.curves is not None:
            return self._d_guarded(self.mean_radius, z)
        if self.depth is not None and hasattr(self.depth, "perimeter"):
            # filleted profiles: the schedule is smooth through the waist;
            # guarded FD of the override everywhere
            return self._d_guarded(self.mean_radius, z)
        sl = np.asarray(self.dr_super(z), dtype=float)
        if self.sections is None:
            return sl
        up = z > 0.0
        if not np.any(up):
            return sl
        sl_up = self._d_guarded(self.mean_radius, np.where(up, z, 1.0))
        return np.where(up, sl_up, sl)

    # -- equal-arc theta machinery -------------------------------------------

    def _arc_and_speed(self, t, z):
        """Arc length along the section ellipse from CF (t = 0) to
        parameter t, plus the local speed |dX/dt| (24-pt Gauss; odd in t)."""
        a, b = self.semi_axes(z)
        t = np.asarray(t, dtype=float)
        nodes, weights = _GL24
        half = 0.5 * t
        tau_pts = half[..., None] * (nodes + 1.0)       # [0, t]
        sp = np.sqrt((a[..., None] * np.cos(tau_pts)) ** 2
                     + (b[..., None] * np.sin(tau_pts)) ** 2)
        arc = (half[..., None] * weights * sp).sum(axis=-1)
        speed = np.sqrt((a * np.cos(t)) ** 2 + (b * np.sin(t)) ** 2)
        return arc, speed

    def param_from_arc_angle(self, theta_rad, z):
        """Ellipse parameter t for the EQUAL-ARC angle theta (radians;
        2pi = full perimeter). Odd in theta -> exact CF symmetry."""
        theta = np.asarray(theta_rad, dtype=float)
        z = np.broadcast_to(np.asarray(z, dtype=float), theta.shape).astype(float) \
            if theta.shape else np.asarray(z, dtype=float)
        target = self.section_perimeter(z) * theta / math.tau
        t = np.array(theta, dtype=float, copy=True)      # good initial guess
        for _ in range(7):
            arc, speed = self._arc_and_speed(t, z)
            t = t - (arc - target) / speed
        return t

    def point(self, theta_rad, z):
        """3D point at EQUAL-ARC angle theta (radians) and height z."""
        theta = np.asarray(theta_rad, dtype=float)
        zb = np.broadcast_to(np.asarray(z, dtype=float),
                             np.broadcast(theta, np.asarray(z)).shape).astype(float)
        thb = np.broadcast_to(theta, zb.shape).astype(float)
        t = self.param_from_arc_angle(thb, zb)
        a, b = self.semi_axes(zb)
        return np.stack([a * np.sin(t), b * np.cos(t), zb], axis=-1)

    def _arc_z_partial(self, t, z):
        """d(arc)/dz at FIXED ellipse parameter t (24-pt Gauss):
        integral of (a a' cos^2 + b b' sin^2)/speed over [0, t]."""
        a, b = self.semi_axes(z)
        da, db = self.da(z), self.db(z)
        t = np.asarray(t, dtype=float)
        nodes, weights = _GL24
        half = 0.5 * t
        tau = half[..., None] * (nodes + 1.0)
        c2, s2 = np.cos(tau) ** 2, np.sin(tau) ** 2
        sp = np.sqrt((a[..., None] ** 2) * c2 + (b[..., None] ** 2) * s2)
        integrand = ((a * da)[..., None] * c2 + (b * db)[..., None] * s2) / sp
        return (half[..., None] * weights * integrand).sum(axis=-1)

    def frame(self, theta_rad, z):
        """Position + unit tangent frame at equal-arc (theta, z):
        e_theta along increasing theta, e_s along increasing s (downward),
        outward unit normal. Includes the dt/dz reparameterization term —
        the equal-arc map shifts with height, and ignoring that would tilt
        every meridian tangent off the true surface."""
        theta = np.asarray(theta_rad, dtype=float)
        zb = np.broadcast_to(np.asarray(z, dtype=float),
                             np.broadcast(theta, np.asarray(z)).shape).astype(float)
        thb = np.broadcast_to(theta, zb.shape).astype(float)
        t = self.param_from_arc_angle(thb, zb)
        a, b = self.semi_axes(zb)
        da, db = self.da(zb), self.db(zb)
        sin_t, cos_t = np.sin(t), np.cos(t)
        pos = np.stack([a * sin_t, b * cos_t, zb], axis=-1)

        # d(target arc)/dz at fixed theta minus d(arc)/dz at fixed t, over speed
        speed = np.sqrt((a * cos_t) ** 2 + (b * sin_t) ** 2)
        dP = math.tau * np.asarray(self.mean_slope(zb))   # dP/dz (crease-guarded)
        t_z = (thb / math.tau * dP - self._arc_z_partial(t, zb)) / speed

        p_t = np.stack([a * cos_t, -b * sin_t, np.zeros_like(t)], axis=-1)
        p_z = np.stack([da * sin_t + a * cos_t * t_z,
                        db * cos_t - b * sin_t * t_z,
                        np.ones_like(t)], axis=-1)
        n = np.cross(p_z, p_t)
        n = n / np.linalg.norm(n, axis=-1, keepdims=True)
        e_theta = p_t / np.linalg.norm(p_t, axis=-1, keepdims=True)
        e_s = -p_z / np.linalg.norm(p_z, axis=-1, keepdims=True)
        return {"position": pos, "normal": n, "e_theta": e_theta, "e_s": e_s}

    def arc_angle_from_point(self, x, y, z):
        """Inverse of the equal-arc map: (x, y) on the section at height z
        -> equal-arc angle theta (radians)."""
        a, b = self.semi_axes(z)
        t = np.arctan2(np.asarray(x, dtype=float) / a,
                       np.asarray(y, dtype=float) / b)
        arc, _ = self._arc_and_speed(t, z)
        return math.tau * arc / self.section_perimeter(z)

    def true_meridian_arc(self, theta_deg, u_hi, n_samples=801):
        """DERIVED quantity: true arc length along the constant-theta
        meridian from the waist (u = drop) down to height u_hi. Depends on
        theta — the CF meridian and side meridian differ. Reported only;
        the grid's ring parameter is the r_eq meridian arc."""
        z_hi = self.z_bottom + u_hi
        zs = np.linspace(self.z_top, z_hi, n_samples)
        th = math.radians(theta_deg)
        pts = self.point(np.full(zs.shape, th), zs)
        return float(np.linalg.norm(np.diff(pts, axis=0), axis=1).sum())

    # -- waist junction ------------------------------------------------------

    def waist_tangent_deg(self, theta_deg=None):
        """Meridian tangent at the waist, from vertical. With elliptical
        sections it varies with theta; None returns the r_eq (mean) value
        for the crease headline."""
        if theta_deg is None:
            return math.degrees(math.atan(abs(float(
                self.mean_slope(np.array(-1e-9))))))
        th = math.radians(float(theta_deg))
        h = 0.5
        p1 = self.point(np.array(th), np.array(self.z_top))
        p0 = self.point(np.array(th), np.array(self.z_top - h))
        d = (np.asarray(p1) - np.asarray(p0)) / h
        horiz = math.hypot(float(d[..., 0]), float(d[..., 1]))
        return math.degrees(math.atan2(horiz, 1.0))

    def waist_match_residual_mm(self, bodice_waist_a, bodice_waist_b):
        """Max plan-view gap between the skirt's waist section and the
        bodice waist ellipse — zero by construction when the ratios agree;
        reported so any drift is visible."""
        a, b = (float(v) for v in self.semi_axes(0.0))
        tt = np.linspace(0.0, math.tau, 1441)
        r_skirt = np.hypot(a * np.sin(tt), b * np.cos(tt))
        r_bod = np.hypot(bodice_waist_a * np.sin(tt), bodice_waist_b * np.cos(tt))
        return float(np.max(np.abs(r_skirt - r_bod)))

    def crease_angle_deg(self):
        """Waist junction angle: the angle between the meridian tangents
        just below and just above the waist. Silhouette-first: the traces
        are smooth through the waist, so this reports ~0 — the reference
        garment has no crease, and the seam band remains a construction
        joint, not a geometric kink. Ratio mode: skirt tangent + vertical
        bodice launch."""
        if self.sections is None:
            return None
        if self.curves is not None or (self.depth is not None
                                       and hasattr(self.depth, "perimeter")):
            # smooth-waist geometries (silhouette-first / FILLETED):
            # the junction angle is the tangent discontinuity, ~0
            s_lo = float(self.mean_slope(np.array(-1e-6)))
            s_hi = float(self.mean_slope(np.array(1e-6)))
            return abs(math.degrees(math.atan(s_lo) - math.atan(s_hi)))
        return self.waist_tangent_deg()   # + 0.0 bodice launch

    def z_top_at(self, theta_deg):
        """The PHYSICAL top edge at this azimuth: the neckline height when
        a bodice exists, else the waist plane."""
        if self.neckline is None:
            return np.zeros(np.shape(theta_deg)) if np.shape(theta_deg) else 0.0
        return self.neckline.height(theta_deg)

    @property
    def rings(self):
        out = [Ring("hem", self.z_bottom, self.params.hem_circumference),
               Ring("waist", 0.0, self.params.waist_circumference)]
        if self.sections is not None:
            for r in self.sections.rows[1:]:
                if r["v"] <= self.z_top + 1e-9:
                    out.append(Ring(r["name"], r["v"], r["circumference"]))
        return out

    def surface_area_mm2(self, n_theta=256, n_z=400):
        """General surface area by triangulated quadrature."""
        V, F = _area_mesh(self, n_theta, n_z)
        tri = V[F]
        return float(0.5 * np.linalg.norm(
            np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0]), axis=1).sum())


def _clamp_to_neckline(model, T_rad, Z):
    """Clamp a (theta, z) grid to the physical top edge. Rows above the
    neckline collapse ONTO the edge curve — the trimmed cells become
    degenerate and are filtered out by area."""
    if model.neckline is None:
        return Z
    caps = model.neckline.height(np.degrees(T_rad))
    return np.minimum(Z, caps)


def _drop_degenerate(V, F, min_area=1e-8):
    tri = V[F]
    areas = 0.5 * np.linalg.norm(
        np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0]), axis=1)
    return F[areas > min_area]


def _area_mesh(model, n_theta, n_z):
    thetas = np.linspace(-math.pi, math.pi, n_theta + 1)
    zs = np.linspace(model.z_bottom, model.z_top, n_z + 1)
    T, Z = np.meshgrid(thetas, zs)
    Z = _clamp_to_neckline(model, T, Z)
    V = model.point(T, Z).reshape(-1, 3)
    cols = n_theta + 1
    idx = np.arange((n_z + 1) * cols).reshape(n_z + 1, cols)
    q00, q01 = idx[:-1, :-1].ravel(), idx[:-1, 1:].ravel()
    q10, q11 = idx[1:, :-1].ravel(), idx[1:, 1:].ravel()
    F = np.concatenate([np.stack([q00, q11, q01], axis=1),
                        np.stack([q00, q10, q11], axis=1)])
    return V, _drop_degenerate(V, F)


def build_meshes(model: ShellModel, n_theta: int = 192, max_row_mm: float = 6.0):
    """Triangulate the shell as two separate pieces split at the side
    seams (theta = +-90 equal-arc — exactly the ellipse major-axis ends).
    Rows are LEVEL (constant z), spaced evenly along the r_eq meridian
    arc; columns are equal-arc in theta, so cells are physically uniform
    around each ring."""
    if n_theta % 4 != 0:
        raise ShellError(f"n_theta must be a multiple of 4, got {n_theta}")

    # fine height grid with the crease (z = 0) exactly on a node
    if model.z_top > 1e-9:
        n_lo = int(3000 * -model.z_bottom / (model.z_top - model.z_bottom)) + 1
        z_fine = np.concatenate([
            np.linspace(model.z_bottom, 0.0, n_lo),
            np.linspace(0.0, model.z_top, 3001 - n_lo + 1)[1:]])
    else:
        z_fine = np.linspace(model.z_bottom, model.z_top, 4001)
    g = np.sqrt(1.0 + model.mean_slope(z_fine) ** 2)
    arc = np.concatenate([[0.0], np.cumsum(0.5 * (g[1:] + g[:-1]) * np.diff(z_fine))])
    n_rows = max(int(math.ceil(arc[-1] / max_row_mm)) + 1, 2)
    z_rows = np.interp(np.linspace(0.0, arc[-1], n_rows), arc, z_fine)

    half = n_theta // 2
    meshes = {}
    split = math.radians(getattr(model, "split_theta", 90.0))
    for name, (t0, t1) in (("FRONT", (-split, split)),
                           ("BACK", (split, math.tau - split))):
        thetas = np.linspace(t0, t1, half + 1)
        T, Z = np.meshgrid(thetas, z_rows)
        Z = _clamp_to_neckline(model, T, Z)   # shell tops out AT the neckline
        V = model.point(T, Z).reshape(-1, 3)
        cols = half + 1
        idx = np.arange(n_rows * cols).reshape(n_rows, cols)
        q00, q01 = idx[:-1, :-1].ravel(), idx[:-1, 1:].ravel()
        q10, q11 = idx[1:, :-1].ravel(), idx[1:, 1:].ravel()
        F = np.concatenate([
            np.stack([q00, q11, q01], axis=1),
            np.stack([q00, q10, q11], axis=1),
        ])
        F = _drop_degenerate(V, F)
        meshes[name] = (V, F.astype(np.int32))
    return meshes
