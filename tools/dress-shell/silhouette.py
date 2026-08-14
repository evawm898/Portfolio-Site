"""Silhouette input path — b(v) AUTHORED from a traced side view.

The side-profile silhouette is a direct measurement of the front-to-back
half-depth b(v) (the traced width at height v is back-most to front-most
extent = 2 * b for our front/back-symmetric sections). This module turns
a trace into a smooth authored b(v):

  INPUT  (one of)
    - a points list / file of (v_mm, half_depth_mm) rows (already scaled)
    - a traced-silhouette image (white fill on any background): widths
      are measured per scan row and SCALED using waist-to-hem = 381 mm
      as the reference dimension (the waist row is the narrowest row in
      the interior; the hem row is the lowest filled row). The implied
      total garment height is reported for sanity-checking the scale.

  FIT
    The source is a perspective photo: distortion is worst at the
    extremes and least mid-height, so the fit SMOOTHS rather than honors
    every traced point (least-squares cubic spline, knots every
    ~knot_mm). Residuals between fit and raw trace are reported per
    region so the photo's lies are visible.

  SHAPE CONTRACT (reported AND asserted, like the neckline curve)
    - b(v) > 0 everywhere
    - at most the expected extrema over the garment: a single minimum
      near the waist and (if the trace spans the bodice) a single
      maximum near the bust — no extra fitted wiggles
    - the tangent at the bust crest is ~zero by construction of a smooth
      max; the tangent AT THE HEM is measured and reported, NOT forced:
      whether the traced hem meets the floor vertically decides whether
      the n = 1.6 superellipse hem is even compatible.

The a(v) companion solve lives in bodice.solve_a_given_b: with b(v)
authored, a(v) comes from the KNOWN circumference anchors via Ramanujan,
and the a/b ratio becomes a REPORTED OUTPUT, never an assumption.
"""

import math
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from scipy.interpolate import LSQUnivariateSpline

WAIST_TO_HEM_MM = 381.0     # the scaling reference dimension (given)


class SilhouetteError(ValueError):
    """Raised for unusable traces or a broken shape contract."""


def load_points(path):
    """(v_mm, half_depth_mm) rows from a simple CSV/whitespace file;
    lines starting with # are comments."""
    rows = []
    for line in Path(path).read_text().splitlines():
        line = line.split("#")[0].strip()
        if not line:
            continue
        parts = line.replace(",", " ").split()
        if len(parts) != 2:
            raise SilhouetteError(f"expected 'v half_depth', got {line!r}")
        rows.append((float(parts[0]), float(parts[1])))
    if len(rows) < 4:
        raise SilhouetteError(f"need at least 4 trace points, got {len(rows)}")
    return sorted(rows)


def extract_from_image(path, white_thresh=240, min_run_px=6,
                       waist_search=(0.25, 0.75), shoulder_slope_cut=0.7):
    """Measure the traced silhouette (white fill) from an image file.

    Robustness: photos carry stray near-white speckles (wall highlights,
    mannequin sheen), so the silhouette is taken as the LARGEST CONNECTED
    COMPONENT of white pixels, and widths are edge-to-edge within that
    component only.

    One-shoulder tops: above the back-neckline corner the trace narrows
    along the shoulder diagonal and the row width stops meaning 2*b. The
    back edge is scanned upward from the bust; the first row where its
    inward slope exceeds `shoulder_slope_cut` (px/px) marks the cut, and
    rows above it are EXCLUDED from the returned points (the cut height
    is reported so it can be sanity-checked against the side neckline).

    Returns (points, report): points are (v_mm, half_depth_mm) rows on
    the model's height convention (v = 0 at the WAIST, positive upward,
    hem at v = -381); report carries the pixel landmarks, mm-per-px, and
    the implied total height for scale sanity-checking.
    """
    from PIL import Image
    from scipy import ndimage
    img = np.asarray(Image.open(path).convert("RGB"), dtype=np.uint8)
    white = np.all(img >= white_thresh, axis=-1)
    labels, n = ndimage.label(white)
    if n == 0:
        raise SilhouetteError("no white silhouette found")
    sizes = ndimage.sum(white, labels, range(1, n + 1))
    blob = labels == (1 + int(np.argmax(sizes)))

    x_min = np.full(blob.shape[0], -1)
    x_max = np.full(blob.shape[0], -1)
    counts = blob.sum(axis=1)
    for y in np.flatnonzero(counts >= min_run_px):
        xs = np.flatnonzero(blob[y])
        x_min[y], x_max[y] = xs[0], xs[-1]
    widths = np.where(x_min >= 0, x_max - x_min + 1, 0).astype(float)
    rows = np.flatnonzero(widths >= min_run_px)
    if len(rows) < 20:
        raise SilhouetteError("silhouette component too small")
    top_px, bottom_px = int(rows[0]), int(rows[-1])

    # HEM: the traced hem edge is often drawn as a curve, so the lowest
    # row is a narrow tip, not the hem. The hem is the WIDEST row in the
    # lower third — where the side edges turn around. Rows below it are
    # the traced hem-curve, excluded.
    low_lo = int(top_px + (2.0 / 3.0) * (bottom_px - top_px))
    hem_px = low_lo + int(np.argmax(widths[low_lo:bottom_px + 1]))

    # waist: narrowest row in the interior band (avoids shoulder/hem)
    lo = int(top_px + waist_search[0] * (bottom_px - top_px))
    hi = int(top_px + waist_search[1] * (bottom_px - top_px))
    waist_px = lo + int(np.argmin(widths[lo:hi + 1]))
    if hem_px <= waist_px:
        raise SilhouetteError("hem row not below waist row — bad trace")
    mm_per_px = WAIST_TO_HEM_MM / float(hem_px - waist_px)

    # one-shoulder cut: going UP from the waist the width must not
    # COLLAPSE (the bodice swells to the bust; a genuine above-bust taper
    # is gentle). The first sustained fast drop marks the shoulder/back
    # neckline diagonal — full-depth rows end there.
    cut_px = top_px
    smooth = np.convolve(widths, np.ones(9) / 9.0, mode="same")
    window = 8
    for y in range(waist_px - 30, top_px + window, -1):
        drop_per_row = (smooth[y + window] - smooth[y]) / window
        if drop_per_row > 2.0 * shoulder_slope_cut:   # px/row, both edges
            cut_px = y + window
            break
    points = []
    for y in range(max(top_px, cut_px), hem_px + 1):
        if widths[y] < min_run_px:
            continue
        v_mm = (waist_px - y) * mm_per_px          # + up, 0 at the waist
        points.append((v_mm, 0.5 * widths[y] * mm_per_px))
    report = {
        "mm_per_px": mm_per_px,
        "waist_px": waist_px, "hem_px": hem_px, "top_px": top_px,
        "bottom_px": bottom_px, "cut_px": cut_px,
        "full_depth_valid_up_to_v_mm": (waist_px - cut_px) * mm_per_px,
        "implied_total_height_mm": (bottom_px - top_px) * mm_per_px,
        "waist_width_mm": float(widths[waist_px]) * mm_per_px,
        "hem_width_mm": float(widths[hem_px]) * mm_per_px,
        "rows_measured": len(points),
        "component_px": int(sizes.max()),
    }
    return sorted(points), report


@dataclass(frozen=True)
class FitReport:
    rms_mm: float
    max_mm: float
    max_at_v: float
    by_region: dict            # region name -> (rms, max)
    hem_slope: float           # db/dv measured AT the hem end of the fit
    hem_wall_angle_deg: float  # angle of the traced wall from vertical
    extrema_v: tuple           # interior extremum locations of the fit


class FittedDepth:
    """Smoothed authored b(v) over the traced span, with the shape
    contract asserted and the photo-vs-fit residual reported."""

    def __init__(self, points, knot_mm=40.0, max_extrema=2):
        pts = sorted(points)
        v = np.array([p[0] for p in pts], dtype=float)
        b = np.array([p[1] for p in pts], dtype=float)
        if len(v) < 8:
            raise SilhouetteError(f"need >= 8 points to fit, got {len(v)}")
        if np.any(np.diff(v) <= 0):
            v, idx = np.unique(v, return_index=True)
            b = b[idx]
        if np.any(b <= 0):
            raise SilhouetteError("half-depth must be positive everywhere")
        self.v_lo, self.v_hi = float(v[0]), float(v[-1])

        interior = np.arange(self.v_lo + knot_mm, self.v_hi - knot_mm * 0.5,
                             knot_mm)
        self._spl = LSQUnivariateSpline(v, b, interior, k=3)
        fit = self._spl(v)
        resid = b - fit

        # region residuals: extremes lie about perspective; show where
        span = self.v_hi - self.v_lo
        regions = {
            "lower (hem end)": v <= self.v_lo + 0.2 * span,
            "middle": (v > self.v_lo + 0.2 * span) & (v < self.v_hi - 0.2 * span),
            "upper (top end)": v >= self.v_hi - 0.2 * span,
        }
        by_region = {name: (float(np.sqrt(np.mean(resid[m] ** 2))),
                            float(np.max(np.abs(resid[m]))))
                     for name, m in regions.items() if np.any(m)}

        # shape contract: no extra wiggles
        vv = np.linspace(self.v_lo, self.v_hi, 2001)
        db = self._spl.derivative()(vv)
        sign = np.sign(db)
        flips = np.flatnonzero(np.diff(sign[sign != 0] if np.all(sign != 0)
                                       else sign))
        crossings = np.flatnonzero((db[:-1] * db[1:]) < 0)
        extrema_v = tuple(float(vv[i]) for i in crossings)
        if len(extrema_v) > max_extrema:
            raise SilhouetteError(
                f"fitted b(v) has {len(extrema_v)} interior extrema at "
                f"{[round(e, 1) for e in extrema_v]} — more than the expected "
                f"waist minimum + bust maximum. Coarsen knot_mm or clean the "
                f"trace; refusing an invented wiggle.")
        if np.any(self._spl(vv) <= 0):
            raise SilhouetteError("fitted b(v) dips non-positive")

        hem_slope = float(self._spl.derivative()(self.v_lo))
        self.report = FitReport(
            rms_mm=float(np.sqrt(np.mean(resid ** 2))),
            max_mm=float(np.max(np.abs(resid))),
            max_at_v=float(v[int(np.argmax(np.abs(resid)))]),
            by_region=by_region,
            hem_slope=hem_slope,
            hem_wall_angle_deg=math.degrees(math.atan(abs(hem_slope))),
            extrema_v=extrema_v,
        )
        self._raw_v, self._raw_b = v, b

    def b(self, v):
        vv = np.clip(np.asarray(v, dtype=float), self.v_lo, self.v_hi)
        return self._spl(vv)

    def raw(self):
        return self._raw_v, self._raw_b
