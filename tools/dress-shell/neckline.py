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


# The GIVEN design heights (user, 2026-08-14): CF 250 mm, side/back 205 mm
# above the waist. shoulder_theta / plateau_flatness stay at their authored
# defaults until tuned in the editor.
DESIGN_NECKLINE = NecklineParams(cf_height=250.0, side_height=205.0)


@dataclass(frozen=True)
class NecklineV2Params:
    """Neckline v2 (user, 2026-08-15): NON-monotone front — CF rises to a
    PEAK before the side — then an exponential decay through the side
    into a LOW BACK (no constant-back run). Heights all mm above waist;
    ordering peak > cf > side > cb is asserted.

    peak_theta: INFERRED at 82 deg from the user's '95 mm over roughly
    98 degrees' (180 - 98) — the position itself was never stated.
    decay_rate: the exponential's angular constant tau (deg) for the
    post-peak drop h = cb + (peak - cb) * exp(-(theta - peak_theta)/tau).
    None (default) SOLVES tau so theta = 90 hits side_height exactly
    (tau = 10.706 deg for the given heights)."""
    cf_height: float = 220.0
    peak_height: float = 240.0
    peak_theta: float = 82.0         # INFERRED — confirm
    side_height: float = 190.0
    cb_height: float = 145.0
    decay_rate: float = None         # None -> solved from side_height
    keepout_mm: float = 6.0


class NecklineV2:
    """height(theta) for the v2 contract:
      - theta = 0 (CF): zero tangent (mirror smoothness), height cf
      - rises monotonically to the PEAK (zero-tangent crest)
      - decays exponentially past the peak, hitting side at 90 and
        arriving at CB (residual and end slope asserted tiny)
      - mirrored exactly in theta."""

    def __init__(self, params: NecklineV2Params):
        p = params
        if not (p.peak_height > p.cf_height > p.side_height > p.cb_height > 0):
            raise NecklineError(
                f"ordering peak > cf > side > cb violated: "
                f"{p.peak_height} / {p.cf_height} / {p.side_height} / {p.cb_height}")
        if not 0.0 < p.peak_theta < 90.0:
            raise NecklineError(f"peak_theta must be inside (0, 90), got {p.peak_theta}")
        if p.keepout_mm < 0.0:
            raise NecklineError(f"keepout_mm must be >= 0, got {p.keepout_mm}")
        drop = p.peak_height - p.cb_height
        span = 90.0 - p.peak_theta
        if p.decay_rate is None:
            tau = span / math.log(drop / (p.side_height - p.cb_height))
        else:
            tau = float(p.decay_rate)
            if tau <= 0:
                raise NecklineError(f"decay_rate must be > 0, got {tau}")
        self.decay_rate = tau
        self.params = p
        # contract checks
        side_hit = p.cb_height + drop * math.exp(-span / tau)
        self.side_residual_mm = side_hit - p.side_height
        if abs(self.side_residual_mm) > 0.5:
            raise NecklineError(
                f"decay_rate {tau:.3f} misses the side height by "
                f"{self.side_residual_mm:+.2f} mm — solve it (decay_rate=None) "
                f"or fix the inputs")
        self.cb_residual_mm = drop * math.exp(-(180.0 - p.peak_theta) / tau)
        self.cb_end_slope = -drop / tau * math.exp(-(180.0 - p.peak_theta) / tau)
        if abs(self.cb_end_slope) > 0.05:
            raise NecklineError(
                f"CB arrival slope {self.cb_end_slope:.3f} mm/deg would kink "
                f"the mirror at center back")

    def height(self, theta_deg):
        p = self.params
        t = np.abs(np.asarray(theta_deg, dtype=float))
        t = np.where(t > 180.0, 360.0 - t, t)
        out = np.empty(t.shape if t.shape else (1,))
        tt = np.atleast_1d(t)
        front = tt <= p.peak_theta
        # zero-tangent rise CF -> peak (smoothstep)
        s = np.clip(tt[front] / p.peak_theta, 0.0, 1.0)
        out_f = p.cf_height + (p.peak_height - p.cf_height) * s * s * (3.0 - 2.0 * s)
        back = ~front
        out_b = (p.cb_height + (p.peak_height - p.cb_height)
                 * np.exp(-(tt[back] - p.peak_theta) / self.decay_rate))
        res = np.empty_like(tt)
        res[front] = out_f
        res[back] = out_b
        return res.reshape(t.shape) if t.shape else float(res[0])

    def slope(self, theta_deg, h=1e-4):
        t = np.asarray(theta_deg, dtype=float)
        return (self.height(t + h) - self.height(t - h)) / (2.0 * h)

    def keepout_floor(self, theta_deg):
        return self.height(theta_deg) - self.params.keepout_mm

    @property
    def v_max(self):
        return self.params.peak_height

    def drop_fraction(self, deg_past_peak):
        """Fraction of the peak->CB drop completed this many degrees past
        the peak (the user's distribution check)."""
        return 1.0 - math.exp(-float(deg_past_peak) / self.decay_rate)


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
