"""Body-centered design coordinates (theta, s) on the shell — MILESTONE 1.

theta : azimuth around the vertical axis, degrees. 0 at center front,
        positive toward the wearer's LEFT, range -180..+180.
s     : arc length along the profile curve, mm, measured from the waist.
        Negative upward into the bodice, positive downward into the skirt.
        The profile curve used for s is the MEAN profile
        r(z) = (a(z) + b(z)) / 2, so s is a single shell-wide coordinate:
        a constant-s ring is horizontal (constant z) for every theta.

Forward map:  (theta, s) -> 3D position, outward unit normal, and the
tangent frame (e_theta along increasing theta, e_s along increasing s).
Inverse map:  3D position -> (theta, s).

The z <-> s conversion is exact to machine precision up to quadrature:
the arc-length integral is accumulated with fixed 5-point Gauss-Legendre
panels on a dense height grid (the integrand is smooth piecewise-cubic),
and the inverse is a Newton solve on that same integral, so forward and
inverse use one consistent definition and round-trip at ~1e-12 mm.
"""

import math

import numpy as np

from shell import ShellModel

# 5-point Gauss-Legendre nodes/weights on [-1, 1].
_GL_X = np.array([-0.906179845938664, -0.538469310105683, 0.0,
                  0.538469310105683, 0.906179845938664])
_GL_W = np.array([0.236926885056189, 0.478628670499366, 0.568888888888889,
                  0.478628670499366, 0.236926885056189])


class CoordError(ValueError):
    """Raised for out-of-range coordinates or off-shell points."""


class ShellCoords:
    def __init__(self, model: ShellModel, n_panels: int = 2000):
        self.model = model
        # Height grid with the waist (z = 0) exactly on a node. With no
        # bodice yet, the waist IS the top edge (z_top == 0) and the grid
        # covers the skirt alone.
        if model.z_top <= 1e-12:
            self._z_grid = np.linspace(model.z_bottom, 0.0, n_panels + 1)
            self._waist_idx = n_panels
        else:
            lo = np.linspace(model.z_bottom, 0.0,
                             max(2, int(n_panels * -model.z_bottom
                                        / (model.z_top - model.z_bottom))) + 1)
            hi = np.linspace(0.0, model.z_top, max(2, n_panels - len(lo) + 2) + 1)
            self._z_grid = np.concatenate([lo, hi[1:]])
            self._waist_idx = len(lo) - 1

        # Cumulative arc length from the bottom, one Gauss panel per interval.
        z0, z1 = self._z_grid[:-1], self._z_grid[1:]
        mid, half = 0.5 * (z0 + z1), 0.5 * (z1 - z0)
        panels = (half[:, None] * _GL_W) * self._g(mid[:, None] + half[:, None] * _GL_X)
        arc = np.concatenate([[0.0], np.cumsum(panels.sum(axis=1))])
        self._arc_grid = arc
        self._arc_waist = arc[self._waist_idx]

        self.s_min = float(self._arc_waist - arc[-1])   # top edge (negative)
        self.s_max = float(self._arc_waist)             # hem edge (positive)

    def _g(self, z):
        """Meridian arc-length integrand sqrt(1 + r'(z)^2), mean profile."""
        return np.sqrt(1.0 + self.model.mean_slope(z) ** 2)

    # -- z <-> s -------------------------------------------------------------

    def s_of_z(self, z):
        z = np.asarray(z, dtype=float)
        if np.any(z < self.model.z_bottom - 1e-9) or np.any(z > self.model.z_top + 1e-9):
            raise CoordError(f"height {z} outside shell [{self.model.z_bottom}, {self.model.z_top}]")
        zc = np.clip(z, self._z_grid[0], self._z_grid[-1])
        i = np.clip(np.searchsorted(self._z_grid, zc) - 1, 0, len(self._z_grid) - 2)
        z_i = self._z_grid[i]
        mid, half = 0.5 * (z_i + zc), 0.5 * (zc - z_i)
        tail = ((half[..., None] * _GL_W) * self._g(mid[..., None] + half[..., None] * _GL_X)).sum(axis=-1)
        arc = self._arc_grid[i] + tail
        return self._arc_waist - arc

    def z_of_s(self, s):
        s = np.asarray(s, dtype=float)
        if np.any(s < self.s_min - 1e-6) or np.any(s > self.s_max + 1e-6):
            raise CoordError(f"s {s} outside shell [{self.s_min:.3f}, {self.s_max:.3f}]")
        sc = np.clip(s, self.s_min, self.s_max)
        # Initial guess from the cumulative table, then Newton on the same
        # integral definition (ds/dz = -g(z), monotone).
        s_table = self._arc_waist - self._arc_grid
        z = np.interp(-sc, -s_table, self._z_grid)
        for _ in range(4):
            z = z + (self.s_of_z(z) - sc) / self._g(z)
            z = np.clip(z, self.model.z_bottom, self.model.z_top)
        return z

    # -- forward map ---------------------------------------------------------

    def forward(self, theta_deg, s):
        """(theta, s) -> dict with position, normal, e_theta, e_s (all (..,3)).

        theta is EQUAL-ARC (model convention); the ring parameter s is the
        arc length of the perimeter-equivalent mean meridian, so
        constant-s rings are LEVEL. The frame (with the equal-arc
        dt/dz reparameterization term) comes from the model.
        """
        theta = np.radians(np.asarray(theta_deg, dtype=float))
        z = self.z_of_s(s)
        theta_b, z_b = np.broadcast_arrays(theta, z)
        # astype(copy=True) preserves 0-d shapes (ascontiguousarray would
        # silently promote scalars to shape (1,))
        return self.model.frame(theta_b.astype(float, copy=True),
                                z_b.astype(float, copy=True))

    # -- inverse map ---------------------------------------------------------

    def inverse(self, position, check_mm: float = 0.5):
        """3D position -> (theta_deg, s). The point must lie on the shell;
        a residual larger than check_mm raises (pass check_mm=None to skip)."""
        p = np.asarray(position, dtype=float)
        x, y, z = p[..., 0], p[..., 1], p[..., 2]
        if np.any(z < self.model.z_bottom - 1e-6) or np.any(z > self.model.z_top + 1e-6):
            raise CoordError(f"height {z} outside shell [{self.model.z_bottom}, {self.model.z_top}]")
        zc = np.clip(z, self.model.z_bottom, self.model.z_top)
        theta = self.model.arc_angle_from_point(x, y, zc)   # equal-arc inverse
        s = self.s_of_z(zc)
        if check_mm is not None:
            on_shell = self.model.point(theta, zc)
            residual = np.linalg.norm(on_shell - p, axis=-1)
            if np.any(residual > check_mm):
                raise CoordError(
                    f"point {p} is {float(np.max(residual)):.3f}mm off the shell "
                    f"(tolerance {check_mm}mm)"
                )
        return np.degrees(theta), s
