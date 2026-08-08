"""
Tests for Stage 2 of the multi-region workflow: independent per-region
analysis (analyze_multi_roi) and the robust, confidence-weighted-median
cross-region consensus (_consensus_for_axis) it builds from those
independent results. See analysis/gauge_analysis.py's "Multi-ROI
independent analysis + cross-region consensus" section, and Stage 1's
propose_measurement_rois for how regions get proposed in the first
place.

_consensus_for_axis is tested directly with synthetic candidate dicts
(no image needed) -- it's pure robust-statistics logic, and hand-fed
values let these tests target the exact "one majority cluster, one
outlier, is it a clean 2x/0.5x harmonic" scenarios from the request this
implements without needing to coax a real detector into a specific
failure shape. analyze_multi_roi itself is tested end-to-end on a
synthetic image, confirming the independence guarantee (no ROI's result
is affected by any other ROI) and the API wiring.
"""
import json
import math

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

import analysis.gauge_analysis as gauge_analysis
from analysis.gauge_analysis import (
    CONSENSUS_SINGLE_REGION_FACTOR,
    AxisResult,
    GaugeAnalysisResult,
    _consensus_for_axis,
    _weighted_median,
    analyze_gauge,
    analyze_multi_roi,
)
from backend.main import app


def make_synthetic_knit(width=400, height=400, wale_period=12, course_period=16, noise=6, seed=42):
    """Same construction as test_gauge_analysis.py's helper (kept local to avoid a cross-file import)."""
    rng = np.random.default_rng(seed)
    img = np.full((height, width), 200, dtype=np.float32)
    yy, xx = np.mgrid[0:height, 0:width]
    img += 30 * np.sin(2 * np.pi * xx / wale_period)
    img += 30 * np.sin(2 * np.pi * yy / course_period)
    img += rng.normal(0, noise, size=img.shape)
    img = np.clip(img, 0, 255).astype(np.uint8)
    return np.repeat(img[:, :, None], 3, axis=2)


# --- _weighted_median ------------------------------------------------------


def test_weighted_median_matches_plain_median_with_equal_weights():
    values = [10.0, 12.0, 14.0]
    assert _weighted_median(values, [1.0, 1.0, 1.0]) == 12.0


def test_weighted_median_favors_higher_weight_without_averaging():
    # A strong, confident region shouldn't get its exact value blended
    # with a weak one -- weighted median picks a real observed value,
    # never an in-between number the way a mean would.
    values = [5.0, 5.2, 20.0]
    weights = [10.0, 10.0, 0.01]
    result = _weighted_median(values, weights)
    assert result in values
    assert result != pytest.approx((5.0 + 5.2 + 20.0) / 3)


# --- _consensus_for_axis: never a plain mean --------------------------------


def test_consensus_never_computes_a_plain_mean():
    # The exact scenario from the request this implements: A=4.9, B=5.1,
    # C=5.0 agree; D=9.7 is an outlier. mean() of all four would be
    # 6.175 -- the consensus must NOT land there.
    candidates = [
        {"label": "A", "spacing_px": 4.9, "confidence": 0.7, "quality_score": 0.8},
        {"label": "B", "spacing_px": 5.1, "confidence": 0.7, "quality_score": 0.8},
        {"label": "C", "spacing_px": 5.0, "confidence": 0.7, "quality_score": 0.8},
        {"label": "D", "spacing_px": 9.7, "confidence": 0.7, "quality_score": 0.8},
    ]
    plain_mean = sum(c["spacing_px"] for c in candidates) / len(candidates)
    result = _consensus_for_axis(candidates, "wale")

    assert result.spacing_px is not None
    assert abs(result.spacing_px - plain_mean) > 0.5
    assert 4.5 <= result.spacing_px <= 5.5


def test_outlier_is_excluded_not_averaged_in():
    candidates = [
        {"label": "A", "spacing_px": 4.9, "confidence": 0.7, "quality_score": 0.8},
        {"label": "B", "spacing_px": 5.1, "confidence": 0.7, "quality_score": 0.8},
        {"label": "C", "spacing_px": 5.0, "confidence": 0.7, "quality_score": 0.8},
        {"label": "D", "spacing_px": 9.7, "confidence": 0.7, "quality_score": 0.8},
    ]
    result = _consensus_for_axis(candidates, "wale")
    assert result.included_labels == ["A", "B", "C"]
    assert result.excluded_labels == ["D"]
    assert len(result.outliers) == 1
    # D's own raw value must be preserved exactly, not rewritten toward
    # the consensus.
    assert result.outliers[0].spacing_px == 9.7
    assert result.outliers[0].label == "D"


def test_outlier_near_2x_consensus_is_annotated_as_harmonic():
    candidates = [
        {"label": "A", "spacing_px": 10.0, "confidence": 0.7, "quality_score": 0.8},
        {"label": "B", "spacing_px": 10.2, "confidence": 0.7, "quality_score": 0.8},
        {"label": "C", "spacing_px": 9.8, "confidence": 0.7, "quality_score": 0.8},
        {"label": "D", "spacing_px": 19.8, "confidence": 0.7, "quality_score": 0.8},  # ~2x
    ]
    result = _consensus_for_axis(candidates, "wale")
    assert result.excluded_labels == ["D"]
    assert "2x" in result.outliers[0].reason
    assert "harmonic" in result.outliers[0].reason


def test_outlier_near_half_consensus_is_annotated_as_harmonic():
    candidates = [
        {"label": "A", "spacing_px": 20.0, "confidence": 0.7, "quality_score": 0.8},
        {"label": "B", "spacing_px": 20.4, "confidence": 0.7, "quality_score": 0.8},
        {"label": "C", "spacing_px": 19.6, "confidence": 0.7, "quality_score": 0.8},
        {"label": "D", "spacing_px": 10.0, "confidence": 0.7, "quality_score": 0.8},  # ~0.5x
    ]
    result = _consensus_for_axis(candidates, "wale")
    assert result.excluded_labels == ["D"]
    assert "0.5x" in result.outliers[0].reason
    assert "harmonic" in result.outliers[0].reason


def test_outlier_with_no_clean_harmonic_relationship_gets_generic_reason():
    candidates = [
        {"label": "A", "spacing_px": 10.0, "confidence": 0.7, "quality_score": 0.8},
        {"label": "B", "spacing_px": 10.2, "confidence": 0.7, "quality_score": 0.8},
        {"label": "C", "spacing_px": 9.8, "confidence": 0.7, "quality_score": 0.8},
        {"label": "D", "spacing_px": 14.0, "confidence": 0.7, "quality_score": 0.8},  # ~1.4x, not a clean harmonic
    ]
    result = _consensus_for_axis(candidates, "wale")
    assert result.excluded_labels == ["D"]
    # The harmonic-specific reasons always say "consistent with a ...
    # harmonic"; a non-harmonic deviation gets the generic reason instead
    # (which happens to also contain the word "harmonic" in passing --
    # check for the specific corroborating phrase, not the bare word).
    assert "consistent with a" not in result.outliers[0].reason


def test_single_region_confidence_is_reduced_not_dropped():
    candidates = [{"label": "A", "spacing_px": 10.0, "confidence": 0.8, "quality_score": 0.9}]
    result = _consensus_for_axis(candidates, "wale")
    assert result.spacing_px == 10.0
    assert result.included_labels == ["A"]
    assert result.confidence == pytest.approx(0.8 * CONSENSUS_SINGLE_REGION_FACTOR, abs=1e-6)
    assert result.confidence < 0.8


def test_tight_multi_region_agreement_yields_high_relative_confidence():
    tight = [
        {"label": "A", "spacing_px": 10.0, "confidence": 0.8, "quality_score": 0.9},
        {"label": "B", "spacing_px": 10.1, "confidence": 0.8, "quality_score": 0.9},
        {"label": "C", "spacing_px": 9.95, "confidence": 0.8, "quality_score": 0.9},
    ]
    loose = [
        {"label": "A", "spacing_px": 10.0, "confidence": 0.8, "quality_score": 0.9},
        {"label": "B", "spacing_px": 11.5, "confidence": 0.8, "quality_score": 0.9},
        {"label": "C", "spacing_px": 8.7, "confidence": 0.8, "quality_score": 0.9},
    ]
    tight_result = _consensus_for_axis(tight, "wale")
    loose_result = _consensus_for_axis(loose, "wale")
    assert tight_result.confidence >= loose_result.confidence


def test_no_dominant_cluster_marks_axis_uncertain():
    # Every region disagrees with every other -- no majority at all.
    candidates = [
        {"label": "A", "spacing_px": 10.0, "confidence": 0.6, "quality_score": 0.8},
        {"label": "B", "spacing_px": 16.0, "confidence": 0.6, "quality_score": 0.8},
        {"label": "C", "spacing_px": 24.0, "confidence": 0.6, "quality_score": 0.8},
    ]
    result = _consensus_for_axis(candidates, "wale")
    assert result.status == "uncertain"
    assert result.spacing_px is not None  # still reports a best estimate, never nothing


def test_empty_candidates_returns_no_measurement():
    result = _consensus_for_axis([], "wale")
    assert result.spacing_px is None
    assert result.confidence == 0.0


# --- analyze_multi_roi: independence + wiring --------------------------------


def test_regions_are_analyzed_independently_of_each_other():
    # Two well-separated patches of the SAME synthetic knit -- each
    # region's own analyze_gauge() result, called standalone, must be
    # bit-for-bit identical to what analyze_multi_roi reports for it.
    # Nothing about running them together may change either one's own
    # measurement.
    image = make_synthetic_knit(width=500, height=500, wale_period=12, course_period=16)
    roi_a = (20, 20, 180, 180)
    roi_b = (280, 280, 180, 180)

    standalone_a = analyze_gauge(image, roi=roi_a, orientation="vertical")
    standalone_b = analyze_gauge(image, roi=roi_b, orientation="vertical")

    rois = [
        {"label": "A", "x": roi_a[0], "y": roi_a[1], "width": roi_a[2], "height": roi_a[3], "source": "auto"},
        {"label": "B", "x": roi_b[0], "y": roi_b[1], "width": roi_b[2], "height": roi_b[3], "source": "auto"},
    ]
    result = analyze_multi_roi(image, rois, orientation="vertical")

    by_label = {m.label: m for m in result.per_roi}
    assert by_label["A"].wale.spacing_px == standalone_a.wale.spacing_px
    assert by_label["A"].course.spacing_px == standalone_a.course.spacing_px
    assert by_label["B"].wale.spacing_px == standalone_b.wale.spacing_px
    assert by_label["B"].course.spacing_px == standalone_b.course.spacing_px


def test_agreeing_regions_produce_a_confident_consensus_close_to_ground_truth():
    image = make_synthetic_knit(width=500, height=500, wale_period=12, course_period=16)
    rois = [
        {"label": "A", "x": 20, "y": 20, "width": 180, "height": 180, "source": "auto"},
        {"label": "B", "x": 280, "y": 20, "width": 180, "height": 180, "source": "auto"},
        {"label": "C", "x": 20, "y": 280, "width": 180, "height": 180, "source": "auto"},
    ]
    result = analyze_multi_roi(image, rois, orientation="vertical")

    assert result.success
    assert result.wale.spacing_px is not None
    assert abs(result.wale.spacing_px - 12) < 4
    assert abs(result.course.spacing_px - 16) < 4
    assert len(result.per_roi) == 3
    # A real (approved) primary region, not a fabricated placeholder.
    assert result.primary_label in {"A", "B", "C"}
    assert result.primary_roi_px is not None


def test_single_roi_degenerates_to_that_regions_own_result():
    image = make_synthetic_knit(width=300, height=300, wale_period=12, course_period=16)
    rois = [{"label": "A", "x": 20, "y": 20, "width": 200, "height": 200, "source": "auto"}]
    standalone = analyze_gauge(image, roi=(20, 20, 200, 200), orientation="vertical")

    result = analyze_multi_roi(image, rois, orientation="vertical")

    assert result.primary_label == "A"
    assert result.wale.spacing_px == standalone.wale.spacing_px
    # Cross-region validation isn't possible with one region -- confidence
    # must be reduced relative to that region's own standalone confidence.
    assert result.wale.confidence < standalone.wale.confidence


def test_primary_region_is_never_an_outlier_on_every_axis_it_has(monkeypatch):
    # Regression test for a real bug: when wale's and course's inlier sets
    # don't overlap at all (a real, observed case -- e.g. the regions that
    # agree on wale aren't the same regions that agree on course), the
    # primary/overlay region must still be chosen from whichever region
    # agrees on AT LEAST ONE axis, never unconditionally "the first
    # approved region" regardless of whether THAT region was excluded on
    # every axis it has.
    #
    # Fake analyze_gauge for an exact, deterministic scenario: A is an
    # extreme outlier on BOTH axes (approved first, so it's what the old
    # unconditional "first region" fallback would have picked). B/C/D
    # cluster together on wale only; E/F/G cluster together on course
    # only -- the two inlier sets share no region at all.
    fake_wale = {"A": 1.0, "B": 10.0, "C": 10.1, "D": 10.2, "E": 2.0, "F": 500.0, "G": 999.0}
    fake_course = {"A": 1.0, "B": 2.0, "C": 500.0, "D": 999.0, "E": 50.0, "F": 50.1, "G": 50.2}
    labels_by_x = {i * 60: label for i, label in enumerate("ABCDEFG")}

    def fake_analyze_gauge(image_bgr, roi, orientation, structure="unknown"):
        label = labels_by_x[roi[0]]
        axis = lambda px: AxisResult(spacing_px=px, positions_px=[], confidence=0.6)
        return GaugeAnalysisResult(
            success=True, message="", wale=axis(fake_wale[label]), course=axis(fake_course[label]),
            roi_width_px=roi[2], roi_height_px=roi[3],
        )

    monkeypatch.setattr(gauge_analysis, "analyze_gauge", fake_analyze_gauge)

    image = make_synthetic_knit(width=500, height=100)
    rois = [
        {"label": label, "x": i * 60, "y": 0, "width": 50, "height": 50, "source": "auto"}
        for i, label in enumerate("ABCDEFG")
    ]
    result = analyze_multi_roi(image, rois, orientation="vertical")

    assert result.wale_consensus.included_labels == ["B", "C", "D"]
    assert result.course_consensus.included_labels == ["E", "F", "G"]
    # A is excluded from BOTH axes -- it must never be picked as primary
    # even though it's first in approval order (the old bug's fallback).
    assert result.primary_label != "A"
    assert result.primary_label in {"B", "C", "D", "E", "F", "G"}


def test_no_rois_fails_cleanly():
    image = make_synthetic_knit()
    result = analyze_multi_roi(image, [], orientation="vertical")
    assert not result.success


def test_ground_truth_fields_never_enter_the_consensus_signature():
    # Defensive architecture check: analyze_multi_roi's signature has no
    # ground-truth/actual-measurement parameter at all -- there's no way
    # to feed one in even by accident.
    import inspect

    params = inspect.signature(analyze_multi_roi).parameters
    assert not any("actual" in p or "ground_truth" in p for p in params)


# --- API wiring ---------------------------------------------------------


def test_analyze_multi_endpoint_returns_consensus_and_diagnostics():
    image = make_synthetic_knit(width=500, height=500, wale_period=12, course_period=16)
    ok, buf = cv2.imencode(".jpg", image)
    assert ok

    rois = [
        {"label": "A", "x": 20, "y": 20, "width": 180, "height": 180, "source": "auto"},
        {"label": "B", "x": 280, "y": 20, "width": 180, "height": 180, "source": "auto"},
        {"label": "C", "x": 20, "y": 280, "width": 180, "height": 180, "source": "manual"},
    ]
    client = TestClient(app)
    resp = client.post(
        "/analyze-multi",
        files={"file": ("knit.jpg", buf.tobytes(), "image/jpeg")},
        data={
            "rois_json": json.dumps(rois),
            "cal_x1": 0, "cal_y1": 0, "cal_x2": 500, "cal_y2": 0,
            "known_distance": 20, "unit": "cm",
            "orientation": "vertical", "structure": "unknown",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["wale"]["per_inch"] is not None
    assert body["course"]["per_inch"] is not None
    assert body["roi"] is not None  # primary region's bounds, for the overlay

    mr = body["multi_roi"]
    assert mr is not None
    assert len(mr["per_roi"]) == 3
    assert {r["label"] for r in mr["per_roi"]} == {"A", "B", "C"}
    assert mr["per_roi"][2]["source"] == "manual"
    assert "included_labels" in mr["wale_consensus"]
    assert "included_labels" in mr["course_consensus"]


def test_analyze_multi_endpoint_rejects_out_of_bounds_roi():
    image = make_synthetic_knit(width=200, height=200)
    ok, buf = cv2.imencode(".jpg", image)
    assert ok
    rois = [{"label": "A", "x": 100, "y": 100, "width": 500, "height": 500, "source": "auto"}]
    client = TestClient(app)
    resp = client.post(
        "/analyze-multi",
        files={"file": ("knit.jpg", buf.tobytes(), "image/jpeg")},
        data={
            "rois_json": json.dumps(rois),
            "cal_x1": 0, "cal_y1": 0, "cal_x2": 200, "cal_y2": 0,
            "known_distance": 10, "unit": "cm",
            "orientation": "vertical", "structure": "unknown",
        },
    )
    assert resp.status_code == 400


def test_analyze_multi_endpoint_rejects_empty_roi_list():
    image = make_synthetic_knit(width=200, height=200)
    ok, buf = cv2.imencode(".jpg", image)
    assert ok
    client = TestClient(app)
    resp = client.post(
        "/analyze-multi",
        files={"file": ("knit.jpg", buf.tobytes(), "image/jpeg")},
        data={
            "rois_json": json.dumps([]),
            "cal_x1": 0, "cal_y1": 0, "cal_x2": 200, "cal_y2": 0,
            "known_distance": 10, "unit": "cm",
            "orientation": "vertical", "structure": "unknown",
        },
    )
    assert resp.status_code == 400
