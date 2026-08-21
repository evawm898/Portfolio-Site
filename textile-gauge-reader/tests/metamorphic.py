"""
Metamorphic invariant runner: checks the gauge detector against ANY
photo — no ground truth required — by asserting how its output must
CO-VARY with known image transforms. Where the synthetic tests
(tests/test_synthetic_fabric_gauge.py) know the true answer, these know
only relationships, which is exactly what makes them applicable to real
photos whose true gauge nobody has counted.

Invariants (tolerances are commitments calibrated before adoption, not
knobs — see the table in tests/test_metamorphic_fixtures.py and README):

  resize    1.5x upscale: pixel spacing must scale by exactly 1.5x.
            Tol 4% — sub-pixel peak refinement jitters ~1-2% on 18-36px
            periods, cubic resampling ~1%; far below any harmonic error.
  rotate90  90 deg clockwise, orientation param UNCHANGED: what the
            detector calls "wale" now physically measures the course
            axis, so wale/course must swap. Tol 2% — the rotation is
            lossless, so anything larger exposes axis-asymmetric
            processing.
  mirror    horizontal flip: identical spacings. Tol 1% — lossless and
            the pipeline is deterministic, so near-exactness is the
            correct expectation.
  half_roi  both ROI dimensions halved (centred): density held. Tol 10%
            (fewer repeats = legitimately noisier); SKIPPED per axis
            when the halved window would span < 5 periods, because below
            that the estimate is genuinely unstable and either pass or
            fail would be a lie.
  jpeg60    quality-60 JPEG round-trip: spacing moves < 5%.

Every outcome is CLASSIFIED, not just pass/failed: a 6% drift and a 2x
flip are different bugs, so "harmonic_flip" (ratio near 0.5x or 2x) is
its own status regardless of tolerance, and "lost" (detection vanished
under the transform) is another.

Usage as a CLI, on any photo, no test-writing required:

    python tests/metamorphic.py path/to/photo.jpg \
        [--roi X,Y,W,H] [--orientation vertical|horizontal]

Default ROI is a centred 70% box. Exit code 0 iff every non-skipped
outcome is "ok".
"""
from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple

import cv2
import numpy as np

if __name__ == "__main__":  # CLI use: make `analysis` importable from repo root
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from analysis.gauge_analysis import analyze_gauge

TOLERANCES = {
    "resize": 0.04,
    "rotate90": 0.02,
    "mirror": 0.01,
    "half_roi": 0.10,
    "jpeg60": 0.05,
}
MIN_PERIODS_FOR_HALF_ROI = 5.0


@dataclass
class InvariantOutcome:
    invariant: str
    axis: str                      # "wale" | "course"
    status: str                    # "ok" | "drift" | "harmonic_flip" | "lost" | "skipped"
    expected_px: Optional[float]   # what this axis SHOULD measure after the transform
    measured_px: Optional[float]
    ratio: Optional[float]         # measured / expected
    baseline_confidence: float
    transformed_confidence: Optional[float]
    note: str = ""


def _classify(measured: Optional[float], expected: float, tol: float) -> Tuple[str, Optional[float]]:
    if measured is None:
        return "lost", None
    ratio = measured / expected
    if abs(ratio - 1.0) <= tol:
        return "ok", ratio
    # Harmonic flips are their own failure class no matter the tolerance:
    # a 0.5x/2x confusion is a different bug from a drift, and reporting
    # it as generic "drift" would bury the single most important signal.
    if abs(ratio - 0.5) <= 0.06 or abs(ratio - 2.0) <= 0.2:
        return "harmonic_flip", ratio
    return "drift", ratio


def _axes(result):
    return {"wale": result.wale, "course": result.course}


def run_metamorphic(image_bgr: np.ndarray, roi: Tuple[int, int, int, int], orientation: str = "vertical") -> List[InvariantOutcome]:
    """Run every invariant against `image_bgr`/`roi`. The baseline must
    detect both axes; if it doesn't, a single 'lost' outcome per axis is
    returned for the pseudo-invariant "baseline" and nothing else runs —
    invariants on an undetectable baseline would be noise."""
    x, y, w, h = roi
    base = analyze_gauge(image_bgr, roi, orientation)
    outcomes: List[InvariantOutcome] = []

    baseline = {}
    for axis, ax in _axes(base).items():
        baseline[axis] = ax
        if ax.spacing_px is None:
            outcomes.append(InvariantOutcome("baseline", axis, "lost", None, None, None, 0.0, None,
                                             note="baseline detection failed; invariants not run"))
    if any(o.invariant == "baseline" for o in outcomes):
        return outcomes

    img_h, img_w = image_bgr.shape[:2]

    def record(invariant, result, expected_by_axis, note_by_axis=None):
        tol = TOLERANCES[invariant]
        for axis, ax in _axes(result).items():
            expected = expected_by_axis[axis]
            note = (note_by_axis or {}).get(axis, "")
            if expected is None:  # explicit per-axis skip
                outcomes.append(InvariantOutcome(invariant, axis, "skipped", None,
                                                 ax.spacing_px, None,
                                                 baseline[axis].confidence, ax.confidence, note))
                continue
            status, ratio = _classify(ax.spacing_px, expected, tol)
            outcomes.append(InvariantOutcome(invariant, axis, status, expected,
                                             ax.spacing_px, ratio,
                                             baseline[axis].confidence, ax.confidence, note))

    # --- resize 1.5x ----------------------------------------------------
    scaled = cv2.resize(image_bgr, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
    roi_s = (int(round(x * 1.5)), int(round(y * 1.5)), int(round(w * 1.5)), int(round(h * 1.5)))
    record("resize", analyze_gauge(scaled, roi_s, orientation),
           {a: baseline[a].spacing_px * 1.5 for a in baseline})

    # --- rotate 90 deg clockwise, orientation param unchanged -----------
    rotated = cv2.rotate(image_bgr, cv2.ROTATE_90_CLOCKWISE)
    roi_r = (img_h - y - h, x, h, w)
    record("rotate90", analyze_gauge(rotated, roi_r, orientation),
           {"wale": baseline["course"].spacing_px, "course": baseline["wale"].spacing_px},
           {"wale": "vs baseline course", "course": "vs baseline wale"})

    # --- horizontal mirror ----------------------------------------------
    mirrored = cv2.flip(image_bgr, 1)
    roi_m = (img_w - x - w, y, w, h)
    record("mirror", analyze_gauge(mirrored, roi_m, orientation),
           {a: baseline[a].spacing_px for a in baseline})

    # --- half ROI --------------------------------------------------------
    roi_half = (x + w // 4, y + h // 4, w // 2, h // 2)
    half_expected = {}
    half_notes = {}
    for axis in baseline:
        # The wale axis measures across the ROI's width; course across its
        # height (with orientation="vertical"; swapped otherwise).
        window = (w if axis == "wale" else h) if orientation == "vertical" else (h if axis == "wale" else w)
        periods_in_half = (window / 2) / baseline[axis].spacing_px
        if periods_in_half < MIN_PERIODS_FOR_HALF_ROI:
            half_expected[axis] = None
            half_notes[axis] = f"half window spans only {periods_in_half:.1f} periods (<{MIN_PERIODS_FOR_HALF_ROI:g})"
        else:
            half_expected[axis] = baseline[axis].spacing_px
    record("half_roi", analyze_gauge(image_bgr, roi_half, orientation), half_expected, half_notes)

    # --- JPEG quality-60 round trip --------------------------------------
    ok, buf = cv2.imencode(".jpg", image_bgr, [cv2.IMWRITE_JPEG_QUALITY, 60])
    if not ok:
        raise RuntimeError("JPEG encode failed")
    reencoded = cv2.imdecode(buf, cv2.IMREAD_COLOR)
    record("jpeg60", analyze_gauge(reencoded, roi, orientation),
           {a: baseline[a].spacing_px for a in baseline})

    return outcomes


def format_report(outcomes: List[InvariantOutcome]) -> str:
    lines = [f"{'invariant':10s} {'axis':7s} {'status':13s} {'expected':>9s} {'measured':>9s} {'ratio':>7s}  note"]
    for o in outcomes:
        exp = f"{o.expected_px:.1f}" if o.expected_px else "-"
        meas = f"{o.measured_px:.1f}" if o.measured_px else "-"
        ratio = f"{o.ratio:.3f}" if o.ratio else "-"
        lines.append(f"{o.invariant:10s} {o.axis:7s} {o.status:13s} {exp:>9s} {meas:>9s} {ratio:>7s}  {o.note}")
    return "\n".join(lines)


def main(argv=None) -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Run metamorphic gauge-detection invariants on any photo.")
    parser.add_argument("photo", help="path to the image")
    parser.add_argument("--roi", help="X,Y,W,H in image pixels (default: centred 70%% box)")
    parser.add_argument("--orientation", choices=("vertical", "horizontal"), default="vertical")
    args = parser.parse_args(argv)

    img = cv2.imread(args.photo)
    if img is None:
        print(f"Could not read image: {args.photo}", file=sys.stderr)
        return 2
    if args.roi:
        x, y, w, h = (int(v) for v in args.roi.split(","))
    else:
        img_h, img_w = img.shape[:2]
        w, h = int(img_w * 0.7), int(img_h * 0.7)
        x, y = (img_w - w) // 2, (img_h - h) // 2
    outcomes = run_metamorphic(img, (x, y, w, h), args.orientation)
    print(f"photo: {args.photo}  roi: {(x, y, w, h)}  orientation: {args.orientation}")
    print(format_report(outcomes))
    failed = [o for o in outcomes if o.status not in ("ok", "skipped")]
    print(f"\n{len(outcomes) - len(failed)}/{len(outcomes)} outcomes ok/skipped")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
