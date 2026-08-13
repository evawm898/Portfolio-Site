"""Parametric rigid shell — CONFIRMED SKIRT PROFILE (superellipse dome).

The garment is rigid, formed in 3D from the start, never flattened. Two
separate pieces, FRONT and BACK, split at the side seams (theta = +-90);
no hinge, side closure out of scope.

SKIRT (confirmed): a surface of revolution. With u measured UPWARD from
the hem (u in [0, drop]):

    r(u) = a * (1 - (u/b)^n)^(1/n)

    a = hem_circumference / 2pi          (hem radius)
    n = dome_fullness                    (1.6 confirmed)
    b : solved so r(drop) = waist radius; closed form
        b = drop / (1 - (r_waist/a)^n)^(1/n)

Body frame: waist plane at z = 0, +z up, +y center front, +x wearer's
left; the skirt occupies z in [-drop, 0]. hem_circumference and
dome_fullness are live parameters, not constants.

Profile behavior worth knowing:
  - at the hem (u = 0) the tangent is vertical and, for n < 2, the
    meridional curvature is GENUINELY SINGULAR (r'' ~ u^(n-2)). That is a
    property of the superellipse, not an error; curvature displays clamp
    it and seating decisions rely on footprint sampling.
  - at the waist the skirt arrives at dr/du != 0: the junction with the
    bodice is a CREASE, not a smooth join. The sharp nip is the design;
    `fillet_radius` exists for a later softened variant and must be 0 for
    now. The waist seam band (keep-out ring, cable bus) lives in
    `waist_band_halfwidth`.

BODICE: deliberately NOT SPECIFIED. `ShellParams.bodice` is None and the
model refuses invented measurements; the skirt is complete and correct on
its own. Every downstream consumer treats z_top = 0 (the waist) as the
current top edge.
"""

import math
from dataclasses import dataclass

import numpy as np


class ShellError(ValueError):
    """Raised when the measurements do not describe a valid shell."""


@dataclass(frozen=True)
class Ring:
    """A labeled cross-section (for reports)."""
    name: str
    z: float
    circumference: float


@dataclass(frozen=True)
class ShellParams:
    """Confirmed skirt measurements (mm). Bodice intentionally absent."""
    waist_circumference: float = 609.6   # 24 in
    hem_circumference: float = 1549.4    # 61 in
    drop: float = 381.0                  # waist-to-hem vertical, 15 in
    dome_n: float = 1.6                  # dome fullness
    fillet_radius: float = 0.0           # 0 = sharp waist crease (the design)
    waist_band_halfwidth: float = 8.0    # seam band / cable bus, mm each side
    bodice: object = None                # NOT SPECIFIED — supplied later


class ShellModel:
    """Superellipse dome skirt as a surface of revolution. Exposes the same
    geometry interface as before (a(z), b(z), derivatives, point, meshes)
    so coordinates, grid, curvature, layout, and the viewers are unchanged
    consumers; sections are circular, so a(z) == b(z) == r(z)."""

    def __init__(self, params: ShellParams = ShellParams()):
        p = params
        for name, v in (("waist_circumference", p.waist_circumference),
                        ("hem_circumference", p.hem_circumference),
                        ("drop", p.drop), ("dome_n", p.dome_n)):
            if not (isinstance(v, (int, float)) and math.isfinite(v) and v > 0):
                raise ShellError(f"{name} must be a positive number, got {v!r}")
        if p.waist_circumference >= p.hem_circumference:
            raise ShellError(
                f"waist circumference ({p.waist_circumference}) must be smaller "
                f"than hem circumference ({p.hem_circumference})")
        if not 1.0 < p.dome_n <= 8.0:
            raise ShellError(f"dome_n must be in (1, 8], got {p.dome_n} "
                             f"(n <= 1 gives an unusable profile)")
        if p.fillet_radius != 0.0:
            raise ShellError(
                "fillet_radius > 0 is reserved for the softened-waist variant "
                "and is not implemented; the sharp crease is the current design")
        if p.waist_band_halfwidth < 0:
            raise ShellError(f"waist_band_halfwidth must be >= 0, "
                             f"got {p.waist_band_halfwidth}")
        if p.bodice is not None:
            raise ShellError(
                "bodice profile is not specified yet — refusing invented "
                "measurements. Supply it via a future bodice segment.")

        self.params = p
        self.hem_radius = p.hem_circumference / math.tau        # a
        self.waist_radius = p.waist_circumference / math.tau
        ratio = self.waist_radius / self.hem_radius
        # closed-form solve of r(drop) = waist radius (the superellipse b)
        self.b_param = p.drop / (1.0 - ratio ** p.dome_n) ** (1.0 / p.dome_n)
        self.n = p.dome_n
        self.z_bottom = -p.drop
        self.z_top = 0.0        # the waist IS the top edge until a bodice exists

    # -- profile -------------------------------------------------------------

    def _u(self, z):
        """Height above the hem, clipped to the skirt."""
        return np.clip(np.asarray(z, dtype=float) - self.z_bottom,
                       0.0, self.params.drop)

    def radius(self, z):
        u = self._u(z)
        return self.hem_radius * (1.0 - (u / self.b_param) ** self.n) ** (1.0 / self.n)

    def dradius(self, z):
        """dr/dz (= dr/du). Exactly 0 at the hem for n > 1; finite and
        negative everywhere else, steepest at the waist."""
        u = self._u(z)
        t = (u / self.b_param) ** self.n
        return (-(self.hem_radius / self.b_param) * (u / self.b_param) ** (self.n - 1.0)
                * (1.0 - t) ** (1.0 / self.n - 1.0))

    # geometry interface used by every downstream consumer
    def a(self, z):
        return self.radius(z)

    def b(self, z):
        """Second semi-axis (sections are circular): b(z) == a(z) == r(z).
        The solved superellipse parameter lives in `b_param`."""
        return self.radius(z)

    def da(self, z):
        return self.dradius(z)

    def db(self, z):
        return self.dradius(z)

    def mean_radius(self, z):
        return self.radius(z)

    def mean_slope(self, z):
        return self.dradius(z)

    def point(self, theta_rad, z):
        r = self.radius(z)
        return np.stack([
            r * np.sin(theta_rad),
            r * np.cos(theta_rad),
            np.broadcast_to(z, np.broadcast(theta_rad, z).shape).astype(float),
        ], axis=-1)

    # -- waist junction ------------------------------------------------------

    def waist_tangent_deg(self):
        """Angle of the skirt's meridian tangent at the waist, measured from
        vertical, degrees. (dr/du = -0.88 -> ~41 deg for the confirmed
        parameters.)"""
        return math.degrees(math.atan(abs(float(self.dradius(0.0)))))

    def crease_angle_deg(self):
        """Angle between skirt and bodice tangents at the waist. None until
        the bodice profile is specified — the crease exists but its angle
        cannot be computed from one side."""
        return None

    @property
    def rings(self):
        return [Ring("hem", self.z_bottom, self.params.hem_circumference),
                Ring("waist", 0.0, self.params.waist_circumference)]

    def surface_area_mm2(self, n_samples=20001):
        """Skirt area of revolution: 2pi * integral r * sqrt(1 + r'^2) du."""
        z = np.linspace(self.z_bottom, self.z_top, n_samples)
        integrand = self.radius(z) * np.sqrt(1.0 + self.dradius(z) ** 2)
        return float(math.tau * np.trapezoid(integrand, z))


def build_meshes(model: ShellModel, n_theta: int = 192, max_row_mm: float = 6.0):
    """Triangulate the shell as two separate pieces split at the side
    seams. Returns {"FRONT": (V, F), "BACK": (V, F)}; faces wound outward.
    Rows are spaced evenly along the meridian arc, so the near-vertical
    hem wall and the steep waist get the same physical resolution."""
    if n_theta % 4 != 0:
        raise ShellError(f"n_theta must be a multiple of 4 (seams at +-90 deg), got {n_theta}")

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
        F = np.concatenate([
            np.stack([q00, q11, q01], axis=1),
            np.stack([q00, q10, q11], axis=1),
        ])
        meshes[name] = (V, F.astype(np.int32))
    return meshes
