"""Neckline curve — the PHYSICAL top edge of the bodice shell.

neckline_height(theta) over theta in [0, 180], mirrored exactly to
negative theta. Shape contract (user-specified):

  1. theta = 0 (CF): the MAXIMUM, with ZERO tangent — an apex on the
     center line, never a corner (a nonzero slope would kink when
     mirrored).
  2. Descending from CF toward the side.
  3. theta = shoulder_theta (authored, default 50): a PLATEAU — the
     curve flattens (tangent scaled toward zero by plateau_flatness)
     but NEVER rises.
  4. Steepens after the plateau and drops into the underarm region.
  5. theta = 90 (side): reaches side_height with ZERO tangent, so it
     transitions smoothly into the back.
  6. theta in [90, 180]: CONSTANT at side_height — flat around the back.

Interpolation is piecewise cubic Hermite with EXPLICIT tangents at CF,
the shoulder, and the side. The interior tangent starts from the
monotone (Fritsch–Carlson) value and is scaled by (1 - plateau_flatness);
zero-or-shrunken tangents can only make a monotone Hermite segment more
monotone, so the no-overshoot guarantee holds by construction — and it
is ASSERTED numerically anyway: construction fails loudly if the sampled
curve rises anywhere between CF and the side or leaves
[side_height, cf_height].

The two heights are REQUIRED inputs (no defaults): they are the user's
design measurements, never invented here. The shoulder height itself is
derived — a cosine base blend evaluated at shoulder_theta — so the
authored knobs stay exactly the ones specified: shoulder_theta and
plateau_flatness.
"""

import math
from dataclasses import dataclass

import numpy as np


class NecklineError(ValueError):
    """Raised for unusable neckline parameters or a broken shape contract."""


@dataclass(frozen=True)
class NecklineParams:
    cf_height: float             # mm above the waist at theta = 0 (REQUIRED)
    side_height: float           # mm above the waist at theta = 90 (REQUIRED)
    shoulder_theta: float = 50.0     # deg — where the plateau sits
    plateau_flatness: float = 1.0    # 0 = no plateau .. 1 = fully flat
    keepout_mm: float = 6.0          # keep-out band below the edge


class NecklineCurve:
    def __init__(self, params: NecklineParams):
        p = params
        for name, v in (("cf_height", p.cf_height), ("side_height", p.side_height)):
            if not (isinstance(v, (int, float)) and math.isfinite(v) and v > 0):
                raise NecklineError(f"{name} must be a positive number, got {v!r}")
        if p.side_height >= p.cf_height:
            raise NecklineError(
                f"cf_height ({p.cf_height}) must exceed side_height "
                f"({p.side_height}): CF is the apex of the neckline")
        if not 0.0 < p.shoulder_theta < 90.0:
            raise NecklineError(f"shoulder_theta must be inside (0, 90), "
                                f"got {p.shoulder_theta}")
        if not 0.0 <= p.plateau_flatness <= 1.0:
            raise NecklineError(f"plateau_flatness must be in [0, 1], "
                                f"got {p.plateau_flatness}")
        if p.keepout_mm < 0.0:
            raise NecklineError(f"keepout_mm must be >= 0, got {p.keepout_mm}")
        self.params = p

        # -- control points -------------------------------------------------
        t_sh = p.shoulder_theta
        drop = p.cf_height - p.side_height
        # shoulder height from a smooth cosine base descent CF -> side
        h_sh = p.side_height + drop * 0.5 * (1.0 + math.cos(math.pi * t_sh / 90.0))
        self._knots = np.array([0.0, t_sh, 90.0])
        self._heights = np.array([p.cf_height, h_sh, p.side_height])

        # -- explicit tangents (deg^-1) -------------------------------------
        d1 = (h_sh - p.cf_height) / t_sh            # <= 0
        d2 = (p.side_height - h_sh) / (90.0 - t_sh)  # <= 0
        # Fritsch-Carlson harmonic-mean interior tangent, then flattened
        if d1 * d2 > 0.0:
            m_sh = 2.0 * d1 * d2 / (d1 + d2)
        else:
            m_sh = 0.0
        self._tangents = np.array([0.0,                              # CF apex
                                   (1.0 - p.plateau_flatness) * m_sh,  # plateau
                                   0.0])                             # side

        # -- shape-contract assertion ---------------------------------------
        t = np.linspace(0.0, 90.0, 1801)
        h = self.height(t)
        if np.any(np.diff(h) > 1e-9):
            raise NecklineError("shape contract broken: neckline rises "
                                "somewhere between CF and the side")
        if h.max() > p.cf_height + 1e-9 or h.min() < p.side_height - 1e-9:
            raise NecklineError("shape contract broken: overshoot outside "
                                "[side_height, cf_height]")

    # -- evaluation ----------------------------------------------------------

    def height(self, theta_deg):
        """neckline_height(theta), mirrored in theta, constant behind the
        side seams. Vectorized; theta in degrees."""
        theta = np.abs(np.asarray(theta_deg, dtype=float))
        theta = np.where(theta > 180.0, 360.0 - theta, theta)  # wrap mirrors
        out = np.full(theta.shape, self.params.side_height)
        front = theta < 90.0
        if np.any(front):
            tf = theta[front]
            i = np.where(tf < self._knots[1], 0, 1)
            t0, t1 = self._knots[i], self._knots[i + 1]
            h0, h1 = self._heights[i], self._heights[i + 1]
            m0, m1 = self._tangents[i], self._tangents[i + 1]
            dt = t1 - t0
            s = (tf - t0) / dt
            h00 = (1 + 2 * s) * (1 - s) ** 2
            h10 = s * (1 - s) ** 2
            h01 = s * s * (3 - 2 * s)
            h11 = s * s * (s - 1)
            out[front] = h00 * h0 + h10 * dt * m0 + h01 * h1 + h11 * dt * m1
        return out if out.shape else float(out)

    def slope(self, theta_deg, h=1e-4):
        """d(height)/d(theta) by central difference (deg^-1)."""
        t = np.asarray(theta_deg, dtype=float)
        return (self.height(t + h) - self.height(t - h)) / (2.0 * h)

    def keepout_floor(self, theta_deg):
        """Panels must stay BELOW this height: the edge minus the keep-out
        band reserved for the bound/beaded edge finish."""
        return self.height(theta_deg) - self.params.keepout_mm

    @property
    def v_max(self):
        return self.params.cf_height

    def control_points(self):
        """(theta, height, tangent) rows for reporting/plotting."""
        return [(float(t), float(h), float(m)) for t, h, m in
                zip(self._knots, self._heights, self._tangents)]
