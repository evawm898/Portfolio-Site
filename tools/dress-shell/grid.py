"""Snap grid ruled onto the shell in (theta, s) — constant-s rings and
constant-theta radials with independently configurable spacing.

Because the grid lives in shell coordinates it stays correct on the
curved surface: a ring is a horizontal closed curve, a radial follows a
meridian. Cells are the quads between adjacent rings and radials. Cell
physical WIDTH varies with the local circumferential radius (that is the
nature of a converging surface); `cell_stats` quantifies the variation so
it stays visible.

Snap targets per cell: 4 corners, 4 edge midpoints, 1 center.
Uses only the stable public API of shell.py / coords.py.
"""

import math
from dataclasses import dataclass

import numpy as np


class GridError(ValueError):
    """Raised for unusable grid spacing."""


@dataclass(frozen=True)
class GridSpec:
    dtheta: float = 10.0   # degrees between radials; must divide 360
    ds: float = 25.0       # mm between rings


@dataclass(frozen=True)
class Cell:
    index: int
    i_theta: int
    i_s: int
    theta0: float
    theta1: float
    s0: float
    s1: float

    @property
    def theta_c(self):
        return 0.5 * (self.theta0 + self.theta1)

    @property
    def s_c(self):
        return 0.5 * (self.s0 + self.s1)


class ShellGrid:
    def __init__(self, chart, spec: GridSpec = GridSpec()):
        if spec.dtheta <= 0 or abs(360.0 / spec.dtheta - round(360.0 / spec.dtheta)) > 1e-9:
            raise GridError(f"dtheta must divide 360 evenly, got {spec.dtheta}")
        if spec.ds <= 0:
            raise GridError(f"ds must be > 0, got {spec.ds}")
        self.chart = chart
        self.spec = spec

        self.thetas = np.arange(-180.0, 180.0 + 1e-9, spec.dtheta)  # radials
        # Rings: multiples of ds through the waist (s = 0), clipped to the
        # shell, with the exact top and hem edges added as boundary rings.
        lo = math.ceil(chart.s_min / spec.ds)
        hi = math.floor(chart.s_max / spec.ds)
        interior = [k * spec.ds for k in range(lo, hi + 1)]
        rings = sorted({round(v, 9) for v in
                        [chart.s_min] + interior + [chart.s_max]})
        # Drop slivers thinner than 20% of ds against the boundary rings.
        cleaned = [rings[0]]
        for v in rings[1:-1]:
            if v - cleaned[-1] >= 0.2 * spec.ds and rings[-1] - v >= 0.2 * spec.ds:
                cleaned.append(v)
        cleaned.append(rings[-1])
        self.rings = np.array(cleaned)

        self.cells = []
        idx = 0
        for i_s in range(len(self.rings) - 1):
            for i_t in range(len(self.thetas) - 1):
                self.cells.append(Cell(
                    index=idx, i_theta=i_t, i_s=i_s,
                    theta0=float(self.thetas[i_t]), theta1=float(self.thetas[i_t + 1]),
                    s0=float(self.rings[i_s]), s1=float(self.rings[i_s + 1]),
                ))
                idx += 1

    # -- lookup / snapping ---------------------------------------------------

    def cell_at(self, theta, s):
        """The cell containing (theta, s), or None off the shell."""
        theta = (theta + 180.0) % 360.0 - 180.0
        if not (self.chart.s_min - 1e-9 <= s <= self.chart.s_max + 1e-9):
            return None
        i_t = min(int((theta + 180.0) // self.spec.dtheta), len(self.thetas) - 2)
        i_s = min(max(int(np.searchsorted(self.rings, s) - 1), 0), len(self.rings) - 2)
        return self.cells[i_s * (len(self.thetas) - 1) + i_t]

    def snap_targets(self, cell: Cell):
        """(theta, s, kind) for the cell's corners, edge midpoints, center."""
        t0, t1, s0, s1 = cell.theta0, cell.theta1, cell.s0, cell.s1
        tc, sc = cell.theta_c, cell.s_c
        return [
            (t0, s0, "corner"), (t1, s0, "corner"), (t1, s1, "corner"), (t0, s1, "corner"),
            (tc, s0, "edge"), (t1, sc, "edge"), (tc, s1, "edge"), (t0, sc, "edge"),
            (tc, sc, "center"),
        ]

    def snap(self, theta, s):
        """Nearest snap target to (theta, s), distance measured in physical
        mm at the local radius. Returns (theta, s, kind)."""
        cell = self.cell_at(theta, s)
        if cell is None:
            return None
        r = self.chart.r_theta(theta, s)
        best, best_d = None, float("inf")
        for tt, ts, kind in self.snap_targets(cell):
            d = math.hypot(math.radians(tt - theta) * r, ts - s)
            if d < best_d:
                best, best_d = (tt, ts, kind), d
        return best

    # -- physical size report ------------------------------------------------

    def cell_stats(self):
        """Physical size of every cell at its center: width (arc, mm) and
        height (mm). Returns dict with arrays + summary of the variation."""
        tc = np.array([c.theta_c for c in self.cells])
        sc = np.array([c.s_c for c in self.cells])
        dt = np.array([math.radians(c.theta1 - c.theta0) for c in self.cells])
        dsz = np.array([c.s1 - c.s0 for c in self.cells])
        r = np.array([self.chart.r_theta(t, s) for t, s in zip(tc, sc)])
        widths = r * dt
        return {
            "count": len(self.cells),
            "widths": widths,
            "heights": dsz,
            "width_min": float(widths.min()),
            "width_mean": float(widths.mean()),
            "width_max": float(widths.max()),
            "width_spread_pct": float(100.0 * (widths.max() - widths.min())
                                      / widths.mean()),
            "height_min": float(dsz.min()),
            "height_max": float(dsz.max()),
        }

    # -- polylines for rendering (3D, slightly off-surface) ------------------

    def ring_polylines(self, coords, lift_mm=0.8, step_deg=2.0):
        """[(n,3) arrays] one polyline per on-shell ring run, lifted along
        the normal so overlay lines do not z-fight the shell. Rings above
        the waist may be OPEN ARCS: they exist only where the ring sits
        below the neckline edge."""
        out = []
        thetas = np.arange(-180.0, 180.0 + 1e-9, step_deg)
        for s in self.rings:
            mask = np.array([self.chart.on_shell(float(t), float(s))
                             for t in thetas])
            if not np.any(mask):
                continue
            # contiguous on-shell runs -> separate polylines
            idx = np.flatnonzero(mask)
            splits = np.split(idx, np.flatnonzero(np.diff(idx) > 1) + 1)
            for run in splits:
                if len(run) < 2:
                    continue
                th = thetas[run]
                f = coords.forward(th, np.full_like(th, s))
                out.append(f["position"] + lift_mm * f["normal"])
        return out

    def radial_polylines(self, coords, lift_mm=0.8, step_mm=8.0):
        """One polyline per radial, from the physical top edge (the
        neckline at that azimuth, or the waist without a bodice) to the
        hem."""
        out = []
        for t in self.thetas[:-1]:
            if self.chart.neckline is None:
                s_top = self.chart.s_min
            else:
                z_edge = min(float(self.chart.neckline.height(float(t))),
                             self.chart.model.z_top)
                s_top = float(coords.s_of_z(z_edge))
            n = max(int((self.chart.s_max - s_top) / step_mm), 2)
            ss = np.linspace(s_top, self.chart.s_max, n)
            f = coords.forward(np.full_like(ss, t), ss)
            out.append(f["position"] + lift_mm * f["normal"])
        return out
