"""Parametric rigid dress shell — MILESTONE 1.

The dress is a rigid 3D shell formed in 3D from the start; it is never
flattened and there is no flat pattern anywhere in this pipeline. Two
separate pieces, FRONT and BACK, split at the side seams (theta = +-90
degrees), no hinge; side closure is out of scope but the pieces stay
separable in the model.

Construction: a profile (radius as a function of height) swept with
elliptical cross-sections whose axis ratio varies with height. Inputs
are circumferences (bust, underbust, waist, hip, hem) with the height
of each, plus total length. Given a circumference C and an axis ratio
q = width/depth at a height, the ellipse semi-axes are recovered by
inverting Ramanujan's perimeter approximation (linear in scale, so the
solve is exact for that formula). Semi-axes a(z), b(z) and ratio are
then interpolated with monotone cubics (PCHIP) so the sharp waist nip
does not overshoot.

Body frame: origin on the vertical axis at WAIST height, +z up,
+y toward center front, +x toward the wearer's left. Units mm.

`ShellModel` exposes a(z), b(z) and derivatives as the single geometry
interface; a later variant fitted to an imported dress-form mesh can
replace the interpolants without touching anything downstream.
Parametric generation is the default and only path for now.
"""

import math
from dataclasses import dataclass, field

import numpy as np
from scipy.interpolate import PchipInterpolator


class ShellError(ValueError):
    """Raised when the measurements do not describe a valid shell."""


@dataclass(frozen=True)
class Ring:
    """One control cross-section: circumference + axis ratio at a height."""
    name: str
    z: float                # height relative to the waist, mm (+up)
    circumference: float    # mm
    axis_ratio: float       # width / depth (a / b)


@dataclass(frozen=True)
class ShellParams:
    """Measurements. Heights are relative to the waist (+up), mm.

    total_length is top edge to hem, measured vertically; it fixes the
    bodice top edge at  z_top = hem_z + total_length.  The optional top
    ring lets the corset edge taper; by default it is 98% of the bust
    circumference at the bust's axis ratio.
    """
    bust: float = 900.0
    underbust: float = 750.0
    waist: float = 660.0
    hip: float = 950.0
    hem: float = 1400.0
    bust_z: float = 170.0
    underbust_z: float = 110.0
    waist_z: float = 0.0
    hip_z: float = -190.0
    hem_z: float = -450.0
    total_length: float = 650.0
    bust_ratio: float = 1.35
    underbust_ratio: float = 1.30
    waist_ratio: float = 1.25
    hip_ratio: float = 1.30
    hem_ratio: float = 1.05
    top_circumference: float = None  # default: 0.98 * bust
    top_ratio: float = None          # default: bust_ratio


def ellipse_perimeter(a: float, b: float) -> float:
    """Ramanujan's second approximation (relative error < 1e-9 for the
    axis ratios that occur on a body)."""
    h = ((a - b) / (a + b)) ** 2
    return math.pi * (a + b) * (1.0 + 3.0 * h / (10.0 + math.sqrt(4.0 - 3.0 * h)))


def semi_axes_from(circumference: float, ratio: float):
    """Invert the perimeter formula: the perimeter is linear in uniform
    scale, so for a = ratio * b the solve is a single division."""
    unit = ellipse_perimeter(ratio, 1.0)
    b = circumference / unit
    return ratio * b, b


class ShellModel:
    """The swept shell: elliptical cross-section semi-axes as smooth
    functions of height."""

    def __init__(self, params: ShellParams = ShellParams()):
        p = params
        top_c = p.top_circumference if p.top_circumference is not None else 0.98 * p.bust
        top_ratio = p.top_ratio if p.top_ratio is not None else p.bust_ratio
        z_top = p.hem_z + p.total_length

        rings = [
            Ring("hem", p.hem_z, p.hem, p.hem_ratio),
            Ring("hip", p.hip_z, p.hip, p.hip_ratio),
            Ring("waist", p.waist_z, p.waist, p.waist_ratio),
            Ring("underbust", p.underbust_z, p.underbust, p.underbust_ratio),
            Ring("bust", p.bust_z, p.bust, p.bust_ratio),
            Ring("top", z_top, top_c, top_ratio),
        ]

        zs = [r.z for r in rings]
        if any(z2 - z1 < 10.0 for z1, z2 in zip(zs, zs[1:])):
            raise ShellError(
                "ring heights must increase hem < hip < waist < underbust "
                f"< bust < top with at least 10mm between them, got {zs}"
            )
        for r in rings:
            if r.circumference <= 0:
                raise ShellError(f"{r.name}: circumference must be > 0, got {r.circumference}")
            if not 0.3 <= r.axis_ratio <= 3.0:
                raise ShellError(f"{r.name}: axis ratio {r.axis_ratio} outside sane range 0.3-3")
        if z_top <= p.bust_z:
            raise ShellError(
                f"total_length {p.total_length}mm puts the top edge at z={z_top}mm, "
                f"at or below the bust ({p.bust_z}mm)"
            )

        self.params = p
        self.rings = rings
        self.z_bottom = p.hem_z
        self.z_top = z_top

        axes = [semi_axes_from(r.circumference, r.axis_ratio) for r in rings]
        z_arr = np.array(zs)
        # Monotone cubic through the control semi-axes: no overshoot at the
        # waist nip, C1 everywhere.
        self._a = PchipInterpolator(z_arr, np.array([ax[0] for ax in axes]))
        self._b = PchipInterpolator(z_arr, np.array([ax[1] for ax in axes]))
        self._da = self._a.derivative()
        self._db = self._b.derivative()

    # -- the geometry interface everything downstream uses ------------------

    def a(self, z):
        """Semi-axis toward the wearer's left (half width), mm."""
        return self._a(z)

    def b(self, z):
        """Semi-axis toward center front (half depth), mm."""
        return self._b(z)

    def da(self, z):
        return self._da(z)

    def db(self, z):
        return self._db(z)

    def mean_radius(self, z):
        return 0.5 * (self._a(z) + self._b(z))

    def mean_slope(self, z):
        return 0.5 * (self._da(z) + self._db(z))

    def point(self, theta_rad, z):
        """Shell surface point(s). theta 0 = center front, + = wearer's left."""
        return np.stack([
            self._a(z) * np.sin(theta_rad),
            self._b(z) * np.cos(theta_rad),
            np.broadcast_to(z, np.broadcast(theta_rad, z).shape).astype(float),
        ], axis=-1)

    def max_flare_z(self):
        """Height of maximum skirt flare: steepest mean-profile slope
        between hem and waist."""
        zs = np.linspace(self.z_bottom, 0.0, 2001)
        return float(zs[np.argmax(np.abs(self.mean_slope(zs)))])


def build_meshes(model: ShellModel, n_theta: int = 192, max_row_mm: float = 6.0):
    """Triangulate the shell as two separate pieces split at the side
    seams. Returns {"FRONT": (V, F), "BACK": (V, F)} with V (n,3) float
    arrays (mm) and F (m,3) int arrays, faces wound outward.

    Each piece has its own vertices (no sharing across the seam), so the
    pieces are fully separable. Boundary edges (top, hem, seams) are left
    open in milestone 1 — wall thickness / closing is a later decision.
    """
    if n_theta % 4 != 0:
        raise ShellError(f"n_theta must be a multiple of 4 (seams at +-90 deg), got {n_theta}")

    # Rows spaced ~evenly along the meridian, not in z, so the flare and
    # the nip get the same physical resolution.
    z_fine = np.linspace(model.z_bottom, model.z_top, 4001)
    g = np.sqrt(1.0 + model.mean_slope(z_fine) ** 2)
    arc = np.concatenate([[0.0], np.cumsum(0.5 * (g[1:] + g[:-1]) * np.diff(z_fine))])
    n_rows = max(int(math.ceil(arc[-1] / max_row_mm)) + 1, 2)
    z_rows = np.interp(np.linspace(0.0, arc[-1], n_rows), arc, z_fine)

    half = n_theta // 2
    meshes = {}
    for name, t0 in (("FRONT", -0.5 * math.pi), ("BACK", 0.5 * math.pi)):
        thetas = t0 + np.linspace(0.0, math.pi, half + 1)
        T, Z = np.meshgrid(thetas, z_rows)
        V = model.point(T, Z).reshape(-1, 3)
        cols = half + 1
        idx = np.arange(n_rows * cols).reshape(n_rows, cols)
        q00, q01 = idx[:-1, :-1].ravel(), idx[:-1, 1:].ravel()
        q10, q11 = idx[1:, :-1].ravel(), idx[1:, 1:].ravel()
        # Rows go bottom-to-top, theta increases along columns; outward is
        # cross(P_z, P_theta), so wind row-first (checked against the
        # analytic normal in tests).
        F = np.concatenate([
            np.stack([q00, q11, q01], axis=1),
            np.stack([q00, q10, q11], axis=1),
        ])
        meshes[name] = (V, F.astype(np.int32))
    return meshes
