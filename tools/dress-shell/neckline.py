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
class NecklineV3Params:
    """CONSOLIDATED neckline (user spec 2026-08-15) — supersedes v2.

    Heights all mm above the waist; ordering peak > cf > side > cb is
    asserted at build. The curve is NOT globally monotone (CF is a local
    max, the peak the global max); monotonicity is asserted PER SEGMENT.

      cf_corner:      False (default) = smooth zero-tangent apex at CF;
                      True = the rise leaves CF at its natural slope and
                      the mirror makes a genuine V-corner at CF.
      rise_bow:       departure of the CF->peak rise from straight
                      (0 = perfectly straight; default 0.1).
      peak_sharpness: 1.0 (default) = genuine tangent discontinuity at
                      the peak. Values < 1 round it over a zone of
                      (1 - peak_sharpness) * 20 deg (construction choice,
                      flagged).
      decay_rate:     fraction of the peak->CB drop completed 30 deg past
                      the peak (default 2/3). NOTE: a PURE exponential
                      cannot satisfy the given heights AND two-thirds-
                      by-30 simultaneously (side at 90 = 8 deg past the
                      peak already takes 52.6% of the drop, which forces
                      94% by 30 under one exponential); the descent is
                      therefore a monotone decaying spline that honors
                      the heights EXACTLY and places the 30-deg point at
                      decay_rate * drop.
      cb_ease_deg:    the zero-tangent mirror ease at CB acts over this
                      final span only (default 15 deg)."""
    cf_height: float = 220.0
    peak_height: float = 240.0
    peak_theta: float = 82.0
    side_height: float = 190.0
    cb_height: float = 145.0
    cf_corner: bool = False
    rise_bow: float = 0.1
    peak_sharpness: float = 1.0
    decay_rate: float = 2.0 / 3.0
    cb_ease_deg: float = 15.0
    keepout_mm: float = 6.0


class NecklineV3:
    """neckline_height(theta) per the consolidated contract. Segments:
      RISE [0, peak_theta]: cubic Hermite; start slope 0 (smooth apex)
        or the chord slope reduced by rise_bow (corner); end slope the
        chord slope raised by rise_bow. rise_bow = 0 + cf_corner = True
        gives a perfectly straight rise.
      DESCENT (peak_theta, 180]: monotone cubic Hermite through
        (peak, peak_h) -> (90, side_h) -> (peak+30, peak_h - decay_rate *
        drop) -> (180 - cb_ease, bridge) -> (180, cb_h, slope 0), with
        Fritsch-Carlson interior slopes; the bridge knot value continues
        the decay exponentially toward CB so the final ease stays inside
        the last cb_ease_deg degrees. Steepest slope of the whole curve
        is immediately past the peak (asserted)."""

    def __init__(self, params: NecklineV3Params = NecklineV3Params()):
        from scipy.interpolate import CubicHermiteSpline, PchipInterpolator
        p = params
        if not (p.peak_height > p.cf_height > p.side_height > p.cb_height > 0):
            raise NecklineError(
                f"ordering peak > cf > side > cb violated: {p.peak_height} / "
                f"{p.cf_height} / {p.side_height} / {p.cb_height}")
        if not 0.0 < p.peak_theta < 90.0:
            raise NecklineError(f"peak_theta must be in (0, 90), got {p.peak_theta}")
        if not 0.0 <= p.rise_bow <= 1.0:
            raise NecklineError(f"rise_bow must be in [0, 1], got {p.rise_bow}")
        if p.peak_sharpness != 1.0:
            raise NecklineError(
                "peak_sharpness < 1 (rounded peak) is not implemented — the "
                "spec default is the genuine corner (1.0); say the word if a "
                "rounded variant is wanted and it gets a real construction")
        if not 0.3 <= p.decay_rate <= 0.98:
            raise NecklineError(f"decay_rate must be in [0.3, 0.98], got {p.decay_rate}")
        if not (p.peak_theta + 30.0 < 180.0 - p.cb_ease_deg):
            raise NecklineError("cb_ease_deg overlaps the 30-deg decay knot")
        if p.keepout_mm < 0.0:
            raise NecklineError(f"keepout_mm must be >= 0, got {p.keepout_mm}")
        self.params = p

        # -- rise ------------------------------------------------------------
        chord = (p.peak_height - p.cf_height) / p.peak_theta
        m0 = chord * (1.0 - p.rise_bow) if p.cf_corner else 0.0
        m1 = chord * (1.0 + p.rise_bow)
        self._rise = CubicHermiteSpline(
            np.array([0.0, p.peak_theta]),
            np.array([p.cf_height, p.peak_height]),
            np.array([m0, m1]))
        self.cf_tangent = float(m0)

        # -- descent ---------------------------------------------------------
        drop = p.peak_height - p.cb_height
        t30 = p.peak_theta + 30.0
        h30 = p.peak_height - p.decay_rate * drop
        if h30 >= p.side_height:
            raise NecklineError(
                f"decay_rate {p.decay_rate:g} puts the 30-deg point above the "
                f"side height — the descent would have to rise after 90")
        t_ease = 180.0 - p.cb_ease_deg
        # bridge knot: continue the decay exponentially toward CB so the
        # zero-tangent ease is confined to the last cb_ease_deg degrees
        tau_tail = (180.0 - t30) / 3.0
        h_ease = p.cb_height + (h30 - p.cb_height) * math.exp(-(t_ease - t30) / tau_tail)
        knots = np.array([p.peak_theta, 90.0, t30, t_ease, 180.0])
        vals = np.array([p.peak_height, p.side_height, h30, h_ease, p.cb_height])
        if np.any(np.diff(vals) >= 0):
            raise NecklineError(f"descent knots not strictly decreasing: {vals}")
        # Fritsch-Carlson interior slopes; forced 0 at CB (mirror), forced
        # steep at the peak (the segment's own secant — never eased)
        pch = PchipInterpolator(knots, vals)
        slopes = pch.derivative()(knots)
        slopes[0] = (vals[1] - vals[0]) / (knots[1] - knots[0])   # steepest
        slopes[-1] = 0.0
        self._descent = CubicHermiteSpline(knots, vals, slopes)
        self.peak_departure_slope = float(slopes[0])

        # -- segment monotonicity + steepest-point assertions ----------------
        tt = np.linspace(0.0, p.peak_theta, 800)
        if np.any(np.diff(self._rise(tt)) < -1e-9):
            raise NecklineError("rise segment is not monotone increasing")
        td = np.linspace(p.peak_theta, 180.0, 1600)
        dd = self._descent(td)
        if np.any(np.diff(dd) > 1e-9):
            raise NecklineError("descent segment is not monotone decreasing")
        dslope = np.gradient(dd, td)
        if np.argmin(dslope) > 80:   # steepest must sit right after the peak
            raise NecklineError("steepest descent is not immediately past the peak")

    def height(self, theta_deg):
        p = self.params
        t = np.abs(np.asarray(theta_deg, dtype=float))
        t = np.where(t > 180.0, 360.0 - t, t)
        tt = np.atleast_1d(t)
        res = np.where(tt <= p.peak_theta, self._rise(tt), self._descent(tt))
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
        p = self.params
        drop = p.peak_height - p.cb_height
        return float((p.peak_height
                      - self.height(p.peak_theta + float(deg_past_peak))) / drop)


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
