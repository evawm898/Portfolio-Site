"""Front-silhouette input path — a(v) MEASURED from a traced front view,
mirroring silhouette.py's side-view b(v) path exactly: same FittedDepth
fitter (it's already a generic smoothed half-extent fitter, not depth-
specific — silhouette.py's own ComposedSections already reuses it for a
front trace's half-WIDTH), same shape contract, same residual reporting.
Nothing new needed at the fitting layer; this module is the composition
on top of it, per review:

INVERT THE PIPELINE
  - a(v) INPUT, traced from the front-view silhouette (this module)
  - b(v) INPUT, already traced from the side view (dress_depth() — the
    COMMITTED depth pipeline: trace + waist fillet + bust-anchor Hermite
    continuation, not the raw unfilleted trace, since "already traced"
    refers to what's actually built and committed today)
  - circumference becomes a DERIVED OUTPUT (Ramanujan(a(v), b(v))),
    reported against the tape anchors, NEVER silently resolved

NOTE ON EXISTING (UNUSED) INFRASTRUCTURE: silhouette.py already has
ComposedSections, built for an earlier "silhouette-first" exploration
(shell.py's dress_curves(), exercised only by
test_dress.py::test_silhouette_first_mode_still_works — NOT part of the
committed dress_params() path). It doesn't fit this brief as-is: it
forces a single hem-pinning SCALE FACTOR onto both axes to hit the hem
circumference exactly, and silently RAISES b(v) above a body-clearance
floor over the estimated-depth span — both are a form of resolving a
conflict rather than reporting it. MeasuredSections below does neither:
it exposes the two measured axes and the derived perimeter completely
unmodified, and the only "report" methods are read-only.

WHAT THIS DOES NOT YET ANSWER: how the committed bust curvature
(PlateauBustDepth, its CF-is-max guarantee, the depth pin) integrates
with a(v) becoming a measured quantity instead of a solved one — the
current bust-bump machinery (_BumpedDepth) numerically re-solves a(v)
against a FROZEN target perimeter, which doesn't apply here. Deliberately
NOT resolved in this file — flagged as an open question, this round is
about the baseline (no bust bump) circumference architecture only.
"""

import math
from pathlib import Path

import numpy as np

from bodice import _perimeter_np
from silhouette import FittedDepth, SilhouetteError, extract_from_image, load_points

IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"}

DEFAULT_TAPE_ANCHORS = (
    ("waist", 0.0, 609.6),
    ("underbust", 152.4, 711.2),
    ("bust", 203.2, 825.5),
    ("above-bust", 254.0, 812.8),
)


def front_silhouette_fit(source, knot_mm=40.0, max_extrema=2, **image_kwargs):
    """Build a FittedDepth (a generic smoothed half-extent fitter,
    despite the name) from a front-view trace. `source` is either:
      - an image path: white- or dark-filled silhouette, same convention
        as silhouette.extract_from_image (pass fill="dark"/"white" via
        image_kwargs to match how the trace was drawn)
      - a points file: whitespace/CSV rows of "v_mm half_width_mm"
        (silhouette.load_points's format), for a hand-digitized trace

    Returns (fit, report): report is the image-extraction landmarks
    (None for a points file — there's no scale/landmark detection to
    report on a pre-scaled points list)."""
    p = Path(source)
    if p.suffix.lower() in IMAGE_SUFFIXES:
        points, report = extract_from_image(p, **image_kwargs)
    else:
        points, report = load_points(p), None
    fit = FittedDepth(points, knot_mm=knot_mm, max_extrema=max_extrema)
    return fit, report


class MeasuredSections:
    """Both semi-axes MEASURED — a(v) from the front trace, b(v) from the
    committed depth pipeline (dress_depth(), itself built from the side
    trace). Perimeter is a DERIVED OUTPUT (Ramanujan(a, b)); this class
    never scales, floors, or otherwise adjusts either axis to make the
    derived circumference agree with anything — conflicts are reported,
    not resolved. domain is the OVERLAP of the two fits' own domains
    (neither is extrapolated past what it actually measured)."""

    def __init__(self, front_fit, side_depth):
        self.front_fit = front_fit
        self.side_depth = side_depth
        self.v_lo = max(front_fit.v_lo, float(side_depth.v_lo))
        self.v_hi = min(front_fit.v_hi, float(side_depth.v_hi))
        if self.v_lo >= self.v_hi:
            raise SilhouetteError(
                f"front trace [{front_fit.v_lo:.1f}, {front_fit.v_hi:.1f}] and "
                f"side depth [{side_depth.v_lo:.1f}, {side_depth.v_hi:.1f}] "
                f"do not overlap")

    def _clip(self, v):
        return np.clip(np.asarray(v, dtype=float), self.v_lo, self.v_hi)

    def a(self, v):
        """Half-width, from the front trace. NOT extrapolated past the
        trace's own domain — clipped to [v_lo, v_hi], same convention as
        every other authored curve in this codebase."""
        return self.front_fit.b(self._clip(v))

    def b(self, v):
        return np.asarray(self.side_depth.b(self._clip(v)))

    def perimeter(self, v):
        v = self._clip(v)
        return _perimeter_np(np.asarray(self.a(v)), self.b(v))

    def monotonicity_report(self, n=2001):
        """a(v) is expected to be non-increasing from the bust down to
        the waist (the flare investigation's whole question) — NOT
        asserted, only reported, since a real trace may legitimately not
        be monotone (e.g. underbust narrower than both waist and bust)."""
        vv = np.linspace(self.v_lo, self.v_hi, n)
        a = np.asarray(self.a(vv))
        da = np.diff(a)
        worst_i = int(np.argmax(da)) if len(da) else None
        return {
            "v_range": (self.v_lo, self.v_hi),
            "non_increasing_waist_to_neckline": bool(np.all(da <= 1e-9)),
            "worst_positive_slope_mm_per_mm": float(da[worst_i]) if worst_i is not None else 0.0,
            "worst_at_v": float(vv[worst_i]) if worst_i is not None else None,
            "extrema_v_from_fit": self.front_fit.report.extrema_v,
        }

    def half_width_at(self, heights):
        """{label: (v, a(v))} convenience for the standard landmark set."""
        return {label: (v, float(np.asarray(self.a(v))))
               for label, v in heights}

    def circumference_report(self, anchors=DEFAULT_TAPE_ANCHORS):
        """[(label, v, derived_mm, tape_mm, delta_mm, delta_pct), ...] —
        pure read-out, nothing adjusted. v outside [v_lo, v_hi] is
        reported with extrapolated=True (the clipped-flat value at the
        nearest fit boundary, NOT a real measurement there)."""
        rows = []
        for label, v, tape_mm in anchors:
            in_range = self.v_lo <= v <= self.v_hi
            derived = float(np.asarray(self.perimeter(v)))
            rows.append({
                "label": label, "v": v, "derived_mm": derived,
                "tape_mm": tape_mm, "delta_mm": derived - tape_mm,
                "delta_pct": 100.0 * (derived - tape_mm) / tape_mm,
                "in_trace_range": in_range,
            })
        return rows
