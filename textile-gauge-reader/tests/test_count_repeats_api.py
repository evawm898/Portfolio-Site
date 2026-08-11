"""
API-level tests for POST /count-repeats -- the HTTP wrapper around
analysis.gauge_analysis.count_repeats_by_template_match. See
tests/test_repeat_template_match.py for the detector logic itself
(including real-photo results); these tests only cover request
validation and response wiring (units conversion, error shapes),
matching the split already used for /propose-rois and /analyze-multi.
"""
import cv2
import numpy as np
from fastapi.testclient import TestClient

from backend.main import app


def make_synthetic_knit(width=400, height=400, wale_period=20, course_period=25, noise=6, seed=7):
    rng = np.random.default_rng(seed)
    img = np.full((height, width), 190, dtype=np.float32)
    yy, xx = np.mgrid[0:height, 0:width]
    img += 45 * np.sin(2 * np.pi * xx / wale_period)
    img += 45 * np.sin(2 * np.pi * yy / course_period)
    img += rng.normal(0, noise, size=img.shape)
    img = np.clip(img, 0, 255).astype(np.uint8)
    return np.repeat(img[:, :, None], 3, axis=2)


def _encode(image):
    ok, buf = cv2.imencode(".jpg", image)
    assert ok
    return buf.tobytes()


def test_count_repeats_success_and_unit_conversion():
    image = make_synthetic_knit()
    client = TestClient(app)
    resp = client.post(
        "/count-repeats",
        files={"file": ("knit.jpg", _encode(image), "image/jpeg")},
        data={
            "roi_x": 20, "roi_y": 20, "roi_width": 360, "roi_height": 360,
            "anchor_start_x": 100, "anchor_start_y": 200,
            "anchor_end_x": 120, "anchor_end_y": 200,
            "orientation": "vertical", "axis": "wale",
            "pixels_per_mm": 10.0,
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["match_count"] >= 3
    assert body["spacing_px"] is not None
    assert body["spacing_mm"] == round(body["spacing_px"] / 10.0, 4)
    assert body["per_inch"] is not None
    assert body["per_inch"] == round(25.4 / body["spacing_mm"], 3)


def test_count_repeats_invalid_axis_is_a_request_error():
    image = make_synthetic_knit()
    client = TestClient(app)
    resp = client.post(
        "/count-repeats",
        files={"file": ("knit.jpg", _encode(image), "image/jpeg")},
        data={
            "roi_x": 20, "roi_y": 20, "roi_width": 360, "roi_height": 360,
            "anchor_start_x": 100, "anchor_start_y": 200,
            "anchor_end_x": 120, "anchor_end_y": 200,
            "orientation": "vertical", "axis": "diagonal",
            "pixels_per_mm": 10.0,
        },
    )
    assert resp.status_code == 400
    assert resp.json()["success"] is False


def test_count_repeats_invalid_scale_is_a_request_error():
    image = make_synthetic_knit()
    client = TestClient(app)
    resp = client.post(
        "/count-repeats",
        files={"file": ("knit.jpg", _encode(image), "image/jpeg")},
        data={
            "roi_x": 20, "roi_y": 20, "roi_width": 360, "roi_height": 360,
            "anchor_start_x": 100, "anchor_start_y": 200,
            "anchor_end_x": 120, "anchor_end_y": 200,
            "orientation": "vertical", "axis": "wale",
            "pixels_per_mm": 0,
        },
    )
    assert resp.status_code == 400
    assert resp.json()["success"] is False


def test_count_repeats_no_matches_is_still_a_200():
    # A poorly-chosen anchor (too close together) is a valid request that
    # just didn't find anything useful -- same convention as
    # /propose-rois's "no suitable areas found" case: 200, success=False,
    # message explains why, so the frontend can invite a retry rather
    # than treating it as a broken request.
    image = make_synthetic_knit()
    client = TestClient(app)
    resp = client.post(
        "/count-repeats",
        files={"file": ("knit.jpg", _encode(image), "image/jpeg")},
        data={
            "roi_x": 20, "roi_y": 20, "roi_width": 360, "roi_height": 360,
            "anchor_start_x": 100, "anchor_start_y": 200,
            "anchor_end_x": 101, "anchor_end_y": 200,
            "orientation": "vertical", "axis": "wale",
            "pixels_per_mm": 10.0,
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is False
    assert body["message"]


def test_count_repeats_bad_image_is_a_request_error():
    client = TestClient(app)
    resp = client.post(
        "/count-repeats",
        files={"file": ("not-an-image.txt", b"hello", "text/plain")},
        data={
            "roi_x": 0, "roi_y": 0, "roi_width": 100, "roi_height": 100,
            "anchor_start_x": 10, "anchor_start_y": 10,
            "anchor_end_x": 30, "anchor_end_y": 10,
            "orientation": "vertical", "axis": "wale",
            "pixels_per_mm": 10.0,
        },
    )
    assert resp.status_code == 400
    assert resp.json()["success"] is False
