"""
Ground-truth scorecard: signed % error per fixture per axis, at native
scale, against every recorded true gauge in this repo -- pinned as a
regression baseline.

What this measures. For each fixture with a recorded true wales/courses
per inch, `analyze_gauge` is run ONCE on the fixture's pinned ROI at
native resolution, the predicted per-inch figure is derived from the
fixture's own ruler calibration (px/inch, never from the detector), and
the signed error is (predicted - true) / true * 100. Positive means the
detector reads too fine (too many per inch -- the classic half-period
lock-on lands near +100%); negative means too coarse (a doubled period
lands near -50%).

Which truths, and what they are worth (provenance is not uniform):

  * real_jersey_sample.jpg -- 5.0 WPI / 7.2 CPI, hand-counted by a person
    from the physical object (test_phase_consistency.py's docstring; the
    README quotes 7.2 in three places and 7.35 once, in the harness
    write-up -- 7.2 is the figure the existing tests use, so it is the
    figure here).
  * sarahmaker-knitting-gauge.jpg (teal) -- 4.0 WPI / 5.0 CPI, hand-counted
    directly (README, "A real second photo": "4 wales/inch, 5 courses/inch";
    test_wale_scoring_weights.py's TRUE_WALES_PER_INCH = 4.0). The README's
    harness section quotes "teal 3.8 WPI" once, in a summary sentence
    with no derivation, and nothing else in the repo carries 3.8 -- the
    direct hand count and the constant every existing test is calibrated
    against say 4.0, so 4.0 is what is trusted here.
  * knit_sample_01/02/05/06/08/09 -- knit_sample_ground_truth.py: AI-
    estimated against each photo's own ruler and human-verified, NOT
    hand-counted; several axes are transposed-calibration. A step below
    the two hand counts, and that file says so at length. 03/04/07 are
    excluded there and therefore here.

Which ROIs. The knit samples use the ROI_XX constants pinned in
knit_sample_ground_truth.py (central square, 50% of the shorter side,
chosen by one mechanical rule and never nudged -- that file explains why
any accuracy claim MUST use exactly those). The jersey and teal fixtures
have no pinned ROI of their own, so the SAME rule (`pinned_roi`) is
applied to them; the jersey's crop touches the top of its ruler, which
the rule permits on purpose. No ROI here was chosen by looking at a
result.

The regression contract, two-sided:

  * A row whose baseline error is within 20% is a hard test: it fails if
    its ABSOLUTE error worsens by more than REGRESSION_PP (2 percentage
    points) from the pinned baseline. Improvement is free; the baseline
    is then stale and should be re-pinned in the same change so the
    ratchet keeps its teeth.
  * A row whose baseline error is beyond 20% is a STRICT xfail asserting
    the 20% bar. The moment a detector change brings it inside 20% it
    XPASSes, the strict mark fails the suite, and the mark comes off in
    that same change -- a fix shows up as a green flip, not a silent
    number moving in a log nobody reads.

Baseline pinned 2026-09-03 against main 7974ad9 (detector unchanged since
PR #109). Run this file directly to print the current table:

    python tests/test_ground_truth_scorecard.py
"""
from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from typing import Dict, Optional, Tuple

import cv2
import pytest

sys.path.insert(0, os.path.dirname(__file__))
if __name__ == "__main__":  # CLI use: make `analysis` importable from repo root
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import knit_sample_ground_truth as gt  # noqa: E402

from analysis.gauge_analysis import analyze_gauge  # noqa: E402

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")

REGRESSION_PP = 2.0      # allowed worsening of |error| vs the pinned baseline
ACCURACY_BAR_PCT = 20.0  # rows beyond this are strict xfails until fixed

MM_PER_INCH = 25.4


@dataclass(frozen=True)
class Case:
    name: str
    filename: str
    roi: Optional[Tuple[int, int, int, int]]  # None -> pinned_roi(image dims)
    px_per_inch_wale: float
    px_per_inch_course: float
    true_wpi: Optional[float]
    true_cpi: Optional[float]
    provenance: str


CASES = [
    Case("jersey", "real_jersey_sample.jpg", None, 166.25, 166.25, 5.0, 7.2, "hand-counted"),
    Case("teal", "sarahmaker-knitting-gauge.jpg", None, 272.8, 272.8, 4.0, 5.0, "hand-counted"),
    Case("knit_01", "knit_sample_01.jpg", gt.ROI_01, gt.PX_PER_INCH_01, gt.PX_PER_INCH_01,
         gt.TRUE_WALES_PER_INCH_01, gt.TRUE_COURSES_PER_INCH_01, "AI-estimated, human-verified"),
    Case("knit_02", "knit_sample_02.jpg", gt.ROI_02, gt.PX_PER_INCH_02, gt.PX_PER_INCH_02,
         gt.TRUE_WALES_PER_INCH_02, gt.TRUE_COURSES_PER_INCH_02, "AI-estimated, human-verified"),
    Case("knit_05", "knit_sample_05.jpg", gt.ROI_05, gt.PX_PER_INCH_05, gt.PX_PER_INCH_05,
         gt.TRUE_WALES_PER_INCH_05, gt.TRUE_COURSES_PER_INCH_05, "AI-estimated, human-verified"),
    # 06's two rulers are in different units: wale in cm, course in inches.
    Case("knit_06", "knit_sample_06.jpg", gt.ROI_06, gt.PX_PER_CM_06_WALE * MM_PER_INCH / 10.0,
         gt.PX_PER_INCH_06_COURSE, gt.TRUE_WALES_PER_INCH_06, gt.TRUE_COURSES_PER_INCH_06,
         "AI-estimated, human-verified"),
    Case("knit_08", "knit_sample_08.jpg", gt.ROI_08, gt.PX_PER_INCH_08, gt.PX_PER_INCH_08,
         gt.TRUE_WALES_PER_INCH_08, gt.TRUE_COURSES_PER_INCH_08,
         "AI-estimated, human-verified; course transposed calibration"),
    Case("knit_09", "knit_sample_09.jpg", gt.ROI_09, gt.PX_PER_INCH_09, gt.PX_PER_INCH_09,
         gt.TRUE_WALES_PER_INCH_09, gt.TRUE_COURSES_PER_INCH_09,
         "AI-estimated, human-verified; wale transposed calibration"),
]

# Pinned signed % error per (fixture, axis), rounded to 0.1. Exactly what
# the detector produced on 2026-09-03 -- recorded reality, not a target.
# A row missing here has no recorded truth for that axis.
BASELINE: Dict[Tuple[str, str], float] = {
    ("jersey", "wale"): -5.5,
    ("jersey", "course"): -4.7,
    ("teal", "wale"): -12.4,
    ("teal", "course"): 2.7,
    ("knit_01", "wale"): 4.5,
    ("knit_01", "course"): -1.8,
    ("knit_02", "wale"): 120.4,
    ("knit_05", "wale"): 103.4,
    ("knit_05", "course"): -51.7,
    ("knit_06", "wale"): -3.3,
    ("knit_06", "course"): 0.4,
    ("knit_08", "wale"): 2.0,
    ("knit_08", "course"): -47.8,
    ("knit_09", "wale"): -2.9,
    ("knit_09", "course"): 7.6,
}

# Diagnosis for every row beyond the accuracy bar, so the xfail reason
# says what the number means rather than just that it is big.
KNOWN_BEYOND_BAR: Dict[Tuple[str, str], str] = {
    ("knit_02", "wale"): (
        "+120%: the pinned ROI lands on the horizontal ruler crossing this photo's midsection "
        "(knit_sample_ground_truth.py says so and keeps it on purpose), and the wale reading is a "
        "134.7px sub-feature, not the ~297px stitch pitch; the fabric is also soft-focus at pixel level"
    ),
    ("knit_05", "wale"): (
        "+103%: half-period leg-lattice lock-on (33.5px vs the ~68px stitch pitch) -- the mechanism "
        "documented under 'Seed lands directly on the leg lattice'; unrotated, the wale candidate "
        "family is supposed to climb back up and here it does not at this ROI"
    ),
    ("knit_05", "course"): (
        "-52%: doubled course period (98.9px vs the ~47.8px row pitch) -- the 2x family, the course "
        "path's seed-as-is design gap documented under 'v3 halves rotated course structure'"
    ),
    ("knit_08", "course"): (
        "-48%: doubled course period (96.0px vs the ~50.1px row pitch, transposed calibration) -- "
        "same 2x family as knit_05's course; knit_08's WALE axis, by contrast, reads +2.0% at this "
        "ROI (the confidently-reported ~2x wale harmonic recorded in the README came from a "
        "different, hand-picked crop)"
    ),
}


def _roi_for(case: Case, img) -> Tuple[int, int, int, int]:
    if case.roi is not None:
        return case.roi
    h, w = img.shape[:2]
    return gt.pinned_roi(w, h)


def _signed_error(px_per_inch: float, spacing_px: Optional[float], truth: Optional[float]) -> Optional[float]:
    if spacing_px is None or truth is None:
        return None
    return (px_per_inch / spacing_px - truth) / truth * 100.0


def score_all() -> Dict[Tuple[str, str], Dict[str, Optional[float]]]:
    """Run every case once; return {(fixture, axis): {spacing_px, predicted, true, error}}."""
    out: Dict[Tuple[str, str], Dict[str, Optional[float]]] = {}
    for case in CASES:
        img = cv2.imread(os.path.join(FIXTURES_DIR, case.filename))
        assert img is not None, f"{case.filename} fixture missing"
        roi = _roi_for(case, img)
        result = analyze_gauge(img, roi, "vertical")
        for axis, ppi, truth, sp in (
            ("wale", case.px_per_inch_wale, case.true_wpi, result.wale.spacing_px),
            ("course", case.px_per_inch_course, case.true_cpi, result.course.spacing_px),
        ):
            if truth is None:
                continue
            out[(case.name, axis)] = {
                "roi": roi,
                "spacing_px": sp,
                "predicted": (ppi / sp) if sp else None,
                "true": truth,
                "error": _signed_error(ppi, sp, truth),
            }
    return out


@pytest.fixture(scope="module")
def scorecard():
    return score_all()


def _params():
    params = []
    for key, baseline in BASELINE.items():
        marks = []
        if abs(baseline) > ACCURACY_BAR_PCT:
            assert key in KNOWN_BEYOND_BAR, f"{key} is beyond the bar but has no diagnosis"
            marks.append(pytest.mark.xfail(strict=True, reason=KNOWN_BEYOND_BAR[key]))
        params.append(pytest.param(key, id=f"{key[0]}-{key[1]}", marks=marks))
    return params


@pytest.mark.parametrize("key", _params())
def test_fixture_axis_against_ground_truth(scorecard, key):
    row = scorecard[key]
    err = row["error"]
    baseline = BASELINE[key]
    assert err is not None, f"{key}: detection lost (spacing None); baseline was {baseline:+.1f}%"
    if abs(baseline) > ACCURACY_BAR_PCT:
        # Strict xfail row: the assertion is the accuracy bar itself.
        assert abs(err) <= ACCURACY_BAR_PCT, (
            f"{key}: {err:+.1f}% vs true {row['true']} (predicted {row['predicted']:.2f}/in, "
            f"{row['spacing_px']}px) -- still beyond {ACCURACY_BAR_PCT:g}%"
        )
        return
    assert abs(err) <= abs(baseline) + REGRESSION_PP, (
        f"{key}: {err:+.1f}% vs pinned baseline {baseline:+.1f}% -- |error| worsened by more than "
        f"{REGRESSION_PP:g} points (predicted {row['predicted']:.2f}/in vs true {row['true']}, "
        f"{row['spacing_px']}px at roi {row['roi']})"
    )


def test_baseline_covers_every_recorded_truth(scorecard):
    """Every (fixture, axis) with a recorded truth has a pinned baseline and
    vice versa -- adding a truth to knit_sample_ground_truth.py without
    scoring it here is the silent gap this catches."""
    assert set(scorecard) == set(BASELINE), (
        f"unscored truths: {set(scorecard) - set(BASELINE)}; stale baselines: {set(BASELINE) - set(scorecard)}"
    )


def test_knit_rois_are_the_pinned_rule():
    """The ROI_XX constants must still be the literal output of pinned_roi
    on the fixture's dimensions (guards a hand-nudged ROI)."""
    for case in CASES:
        if case.roi is None:
            continue
        img = cv2.imread(os.path.join(FIXTURES_DIR, case.filename))
        h, w = img.shape[:2]
        assert case.roi == gt.pinned_roi(w, h), f"{case.name}: {case.roi} != pinned_roi -> {gt.pinned_roi(w, h)}"


def format_table(rows: Dict[Tuple[str, str], Dict[str, Optional[float]]]) -> str:
    lines = [
        "| fixture | axis | ROI (x,y,w,h) | true /in | predicted /in | spacing px | signed error | baseline | status |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for case in CASES:
        for axis in ("wale", "course"):
            key = (case.name, axis)
            if key not in rows:
                continue
            r = rows[key]
            err = r["error"]
            base = BASELINE.get(key)
            status = "n/a" if err is None else ("xfail (>20%)" if abs(base or err) > ACCURACY_BAR_PCT else "ok")
            lines.append(
                f"| {case.name} | {axis} | {r['roi']} | {r['true']:.1f} | "
                f"{r['predicted']:.2f} | {r['spacing_px']} | {err:+.1f}% | "
                f"{base:+.1f}% | {status} |"
            )
    return "\n".join(lines)


if __name__ == "__main__":
    print(format_table(score_all()))
