"""underbust_transition_height — NEW, PROTOTYPE, NOT wired in.

Not a parameter that existed anywhere in the codebase before this file
(confirmed by search — bodice.py, fillet.py, shell.py). The underbust
(152.4mm, 711.2mm) -> bust (203.2mm, 863.6mm) circumference jump was
just two PCHIP anchor points, 50.8mm apart, with no independent knob for
how sharply the perimeter schedule climbs between them. Per the flare
diagnosis, THIS is where a(v)'s steepest rise (worst da/dv, at v~175)
actually lives — the above-bust anchor investigated earlier has zero
reach there.

DOES NOT TOUCH DEPTH. Confirmed separately: b(v) [the depth/front-back
profile] in this zone comes directly from the TRACED SILHOUETTE's own
shape (FilletedDressProfiles' `n_mid` segment, `wb_base * shape(z)`),
not from anchor interpolation — so this parameter affects ONLY the
perimeter schedule P(v), never b(v).

THE TRANSITION: a renormalized logistic, pinned EXACTLY to the two given
measurements (711.2mm at 152.4mm, 863.6mm at 203.2mm — never moved,
per "never substitute plausible values for measurements") — only the
STEEPNESS of the climb between them is tunable:

    u = (v - v_mid) / half_span            in [-1, 1] across the anchor gap
    k = (v_hi - v_lo) / transition_height  dimensionless steepness
    raw(u) = 1 / (1 + exp(-k*u))
    frac = (raw(u) - raw(-1)) / (raw(1) - raw(-1))   renormalized to hit
                                                       0 and 1 exactly
    P(v) = y_lo + frac * (y_hi - y_lo)

Small transition_height (e.g. 15mm) concentrates the whole 152.2mm rise
into a narrow band at the anchor-gap's center, flat-ish near each
anchor. Large transition_height (e.g. 60mm, WIDER than the 50.8mm anchor
gap itself) means the logistic can't saturate within the gap, so the
climb reads nearly linear end to end — gentler than the current PCHIP,
not sharper. Outside [152.4, 203.2] the schedule is untouched (delegates
to the wrapped base depth exactly).
"""

import numpy as np

from shell import ShellParams


def sigmoid_transition(v, v_lo, v_hi, y_lo, y_hi, width):
    v = np.asarray(v, dtype=float)
    v_mid = 0.5 * (v_lo + v_hi)
    half_span = 0.5 * (v_hi - v_lo)
    u = (v - v_mid) / half_span
    k = (v_hi - v_lo) / max(width, 1e-6)
    raw = 1.0 / (1.0 + np.exp(-k * u))
    raw_lo = 1.0 / (1.0 + np.exp(k))
    raw_hi = 1.0 / (1.0 + np.exp(-k))
    frac = (raw - raw_lo) / (raw_hi - raw_lo)
    return y_lo + frac * (y_hi - y_lo)


class TransitionDepth:
    """Wraps ANY depth object (plain, or a bump-field depth like
    FacetBustDepth already layered on top of one), replacing ONLY its
    perimeter schedule across [UNDERBUST_V, BUST_V] with the sigmoid
    transition above, pinned to that SAME base object's own P(v) values
    at the two anchors (so composing this underneath a facet/bump still
    freezes correctly — the facet's numeric a(v) solve reads whatever
    .perimeter() this wrapper reports). .b(v) is untouched (delegated) —
    see the module docstring for why depth doesn't use this parameter."""

    UNDERBUST_V = 152.4
    BUST_V = 203.2

    def __init__(self, base_depth, transition_height):
        self.base = base_depth
        self.transition_height = float(transition_height)
        self.v_lo, self.v_hi = base_depth.v_lo, base_depth.v_hi
        self.params = base_depth.params
        self.y_lo = float(np.asarray(base_depth.perimeter(self.UNDERBUST_V)))
        self.y_hi = float(np.asarray(base_depth.perimeter(self.BUST_V)))

    def b(self, v):
        return self.base.b(v)

    def perimeter(self, v):
        v_arr = np.asarray(v, dtype=float)
        base_P = np.asarray(self.base.perimeter(v_arr), dtype=float)
        in_zone = (v_arr >= self.UNDERBUST_V) & (v_arr <= self.BUST_V)
        if not np.any(in_zone):
            return base_P
        trans = sigmoid_transition(v_arr, self.UNDERBUST_V, self.BUST_V,
                                   self.y_lo, self.y_hi, self.transition_height)
        out = np.where(in_zone, trans, base_P)
        return out if v_arr.shape else float(out)

    @property
    def fillet_zone(self):
        return getattr(self.base, "fillet_zone", (None, None))

    @property
    def waist_ring_z(self):
        return getattr(self.base, "waist_ring_z", 0.0)

    @property
    def waist_ring_circumference(self):
        return getattr(self.base, "waist_ring_circumference",
                      self.params.waist_circumference)


def transition_params(transition_height, base_params=None):
    """ShellParams with the plain (no bust bump) depth's perimeter
    schedule replaced by the transition. base_params must already carry
    a depth_curve exposing .b()/.perimeter()."""
    from dataclasses import replace
    from shell import dress_params
    base = base_params if base_params is not None else dress_params(bust="plain")
    d = TransitionDepth(base.depth_curve, transition_height)
    return replace(base, depth_curve=d)
