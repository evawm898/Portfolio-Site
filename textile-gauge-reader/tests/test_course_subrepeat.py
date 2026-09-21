"""
The course axis's sub-repeat test, pinned on the real signals it was
built from (see _subrepeat_walk_score and _prefer_fundamental_seed's
DESCENT in analysis/gauge_analysis.py).

The failure this closes: at native scale, on the pinned ROIs, the
course seed on knit_sample_05 and knit_sample_08 landed on the DOUBLED
row pitch (98.9px / 96.0px against ~47.8px / ~50.1px true), reading
-51.7% / -47.8% on the ground-truth scorecard. Both course signals DO
carry the true pitch as an autocorrelation peak -- 50px at 0.449 next
to 100px at 0.486 on 05, 48px at 0.437 next to 105px at 0.532 on 08 --
but the descent that would have taken it was gated on a >= 0.95 near-
tie (ratios here: 0.92 and 0.82), and the template walk that decides
the descent, run with its default one-wale-wide band, FAILED at the
true pitch on 05 (0.0) while walking the double (0.71).

What is pinned here, each on the real fixture rather than a synthetic:

  * the seed descends on 05 and 08 (from ~2T to within 12% of the true
    pitch), and the wide-band walk at the true pitch clears the
    acceptance -- the fix itself;
  * the seed does NOT move on the fixtures whose course seed was already
    the true pitch (teal, knit 06/09) or is rescued elsewhere (knit_01,
    whose half-lag is anti-correlated and never reaches the walk) -- the
    ratio floor doing its pre-filter job;
  * the leg lattices a rotated course axis sees (the wale signals of
    jersey, knit 01/05/08/09) still FAIL the wide-band walk outright and
    a fundamental seed on them never descends -- the property that
    kept the rotate90 invariant green when the near-tie gate was first
    added, re-asserted at the new band width. Exact ROIs of the real
    metamorphic run are in tests/metamorphic.py; this is the same
    discriminator on the pinned ROIs.

The scorecard (tests/test_ground_truth_scorecard.py) pins the end-to-end
numbers; this file pins the mechanism.
"""
from __future__ import annotations

import math
import os
import sys

import cv2
import numpy as np
import pytest
from scipy.signal import correlate, find_peaks

sys.path.insert(0, os.path.dirname(__file__))
import knit_sample_ground_truth as gt  # noqa: E402

from analysis.gauge_analysis import (  # noqa: E402
    MIN_PLAUSIBLE_SPACING_PX,
    SEED_ASCEND_TEMPLATE_FAIL_MAX,
    SEED_HALF_MIN_STRENGTH_RATIO,
    SEED_HALF_TEMPLATE_MIN,
    _COLLAPSE_AXIS,
    _autocorrelation_spacing,
    _enhance_texture,
    _prefer_fundamental_seed,
    _project,
    _subrepeat_walk_score,
)

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")

# (fixture file, pinned ROI or None for pinned_roi(), true course pitch px, true wale pitch px)
COURSE_TRUTH_PX = {
    "knit_sample_05.jpg": (gt.ROI_05, gt.PX_PER_INCH_05 / gt.TRUE_COURSES_PER_INCH_05, gt.PX_PER_INCH_05 / gt.TRUE_WALES_PER_INCH_05),
    "knit_sample_08.jpg": (gt.ROI_08, gt.PX_PER_INCH_08 / gt.TRUE_COURSES_PER_INCH_08, gt.PX_PER_INCH_08 / gt.TRUE_WALES_PER_INCH_08),
    "knit_sample_01.jpg": (gt.ROI_01, gt.PX_PER_INCH_01 / gt.TRUE_COURSES_PER_INCH_01, gt.PX_PER_INCH_01 / gt.TRUE_WALES_PER_INCH_01),
    "knit_sample_06.jpg": (gt.ROI_06, gt.PX_PER_INCH_06_COURSE / gt.TRUE_COURSES_PER_INCH_06, gt.PX_PER_CM_06_WALE * 2.54 / gt.TRUE_WALES_PER_INCH_06),
    "knit_sample_09.jpg": (gt.ROI_09, gt.PX_PER_INCH_09 / gt.TRUE_COURSES_PER_INCH_09, gt.PX_PER_INCH_09 / gt.TRUE_WALES_PER_INCH_09),
    "real_jersey_sample.jpg": (None, 166.25 / 7.2, 166.25 / 5.0),
    "sarahmaker-knitting-gauge.jpg": (None, 272.8 / 5.0, 272.8 / 4.0),
}


def _signals(filename):
    """Exactly analyze_gauge's unrotated course/wale projection signals
    and normalized 2D image for the pinned ROI (orientation vertical)."""
    img = cv2.imread(os.path.join(FIXTURES_DIR, filename))
    assert img is not None, f"{filename} fixture missing"
    roi, _, _ = COURSE_TRUTH_PX[filename]
    if roi is None:
        h, w = img.shape[:2]
        roi = gt.pinned_roi(w, h)
    x, y, w, h = roi
    gray = cv2.cvtColor(img[y : y + h, x : x + w], cv2.COLOR_BGR2GRAY)
    normalized, gx, gy = _enhance_texture(gray)
    course_signal = _project(gy, axis=_COLLAPSE_AXIS["vertical"])
    wale_signal = _project(gx, axis=_COLLAPSE_AXIS["horizontal"])
    return normalized, course_signal, wale_signal


def _acf_peak_near(signal, target):
    """(lag, strength) of the autocorrelation peak nearest `target`, using
    _prefer_fundamental_seed's own peak-finding and tolerance; None if
    there is no peak there."""
    n = len(signal)
    ac = correlate(signal, signal, mode="full")[n - 1 :]
    ac = ac / ac[0]
    lo = int(MIN_PLAUSIBLE_SPACING_PX)
    region = ac[lo : max(lo + 1, n // 2)]
    peaks, _ = find_peaks(region, prominence=0.01)
    tol = max(2.0, 0.12 * target)
    hits = [(float(p + lo), float(region[p])) for p in peaks if abs(p + lo - target) <= tol]
    return max(hits, key=lambda t: t[1]) if hits else None


def _within(a, b, frac):
    return abs(math.log(a / b)) <= math.log(1.0 + frac)


@pytest.mark.parametrize("filename", ["knit_sample_05.jpg", "knit_sample_08.jpg"])
def test_doubled_course_seed_descends_to_the_true_pitch(filename):
    normalized, course_signal, _ = _signals(filename)
    _, true_t, _ = COURSE_TRUTH_PX[filename]
    p0, _ = _autocorrelation_spacing(course_signal)
    assert p0 is not None and _within(p0, 2 * true_t, 0.12), f"{filename}: raw seed {p0} is not the doubled pitch any more"
    half = _acf_peak_near(course_signal, p0 / 2.0)
    seed_peak = _acf_peak_near(course_signal, p0)
    assert half is not None and seed_peak is not None
    ratio = half[1] / seed_peak[1]
    # The true pitch is a real peak below the old 0.95 near-tie gate and
    # above the new floor -- the exact gap this test exists for.
    assert SEED_HALF_MIN_STRENGTH_RATIO <= ratio < 0.95, f"{filename}: half/seed strength ratio {ratio:.3f}"
    assert _subrepeat_walk_score(normalized, course_signal, half[0], False) >= SEED_HALF_TEMPLATE_MIN
    seed = _prefer_fundamental_seed(course_signal, normalized, p0, False)
    assert _within(seed, true_t, 0.12), f"{filename}: seed {seed} did not descend to ~{true_t:.1f}px"


def test_knit_05_true_pitch_needed_the_wider_band():
    """The measured reason SUBREPEAT_TEMPLATE_HEIGHT_FRACTION exists: at
    the default 1.6-pitch band the walk at knit_sample_05's true row
    pitch fails outright. If this starts passing, the wide band may no
    longer be load-bearing -- re-measure before narrowing it."""
    from analysis.gauge_analysis import _template_match_consistency_score

    normalized, course_signal, _ = _signals("knit_sample_05.jpg")
    half = _acf_peak_near(course_signal, 50.0)
    assert half is not None
    narrow = _template_match_consistency_score(normalized, course_signal, half[0], False)
    wide = _subrepeat_walk_score(normalized, course_signal, half[0], False)
    assert narrow < SEED_HALF_TEMPLATE_MIN <= wide, f"narrow {narrow:.3f}, wide {wide:.3f}"


@pytest.mark.parametrize(
    "filename",
    ["knit_sample_01.jpg", "knit_sample_06.jpg", "knit_sample_09.jpg", "sarahmaker-knitting-gauge.jpg"],
)
def test_course_seeds_that_were_right_or_rescued_do_not_move(filename):
    """01's seed IS doubled (119 vs ~58) but its half-lag is anti-correlated
    (no peak) and loop centers rescue it downstream; the others' seeds
    are already the true pitch, whose half is anti-correlated too. None
    may reach the walk, let alone descend."""
    normalized, course_signal, _ = _signals(filename)
    p0, _ = _autocorrelation_spacing(course_signal)
    assert p0 is not None
    half = _acf_peak_near(course_signal, p0 / 2.0)
    seed_peak = _acf_peak_near(course_signal, p0)
    assert half is None or seed_peak is None or half[1] < SEED_HALF_MIN_STRENGTH_RATIO * seed_peak[1]
    assert _prefer_fundamental_seed(course_signal, normalized, p0, False) == p0


@pytest.mark.parametrize(
    "filename",
    ["real_jersey_sample.jpg", "knit_sample_01.jpg", "knit_sample_05.jpg", "knit_sample_08.jpg", "knit_sample_09.jpg"],
)
def test_leg_lattice_is_not_a_sub_repeat(filename):
    """What the course path sees after a 90-degree rotation is the wale
    structure, whose leg lattice sits at half the stitch pitch with an
    autocorrelation peak that near-ties or beats the fundamental. The
    wide-band walk must still fail it outright, so a fundamental seed
    never descends onto the legs. (knit 02/03/04/06/07's chunky or soft
    legs walk anyway -- the documented limitation, not pinned.)"""
    normalized, _, wale_signal = _signals(filename)
    _, _, true_w = COURSE_TRUTH_PX[filename]
    fundamental = _acf_peak_near(wale_signal, true_w)
    legs = _acf_peak_near(wale_signal, true_w / 2.0)
    assert fundamental is not None and legs is not None, f"{filename}: expected peaks at both the stitch pitch and its legs"
    assert legs[1] >= SEED_HALF_MIN_STRENGTH_RATIO * fundamental[1], (
        f"{filename}: legs {legs[1]:.3f} vs fundamental {fundamental[1]:.3f} would not even reach the walk"
    )
    assert _subrepeat_walk_score(normalized, wale_signal, legs[0], True) <= SEED_ASCEND_TEMPLATE_FAIL_MAX
    assert _prefer_fundamental_seed(wale_signal, normalized, fundamental[0], True) == fundamental[0]
