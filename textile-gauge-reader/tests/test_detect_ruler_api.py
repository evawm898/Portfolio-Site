"""
API-level tests for POST /detect-ruler -- the HTTP wrapper around
analysis.gauge_analysis.detect_ruler_calibration. See
tests/test_ruler_calibration.py for the detector logic itself (including
real-photo results); these tests only cover request validation and
response wiring, matching the split already used for /propose-rois and
/count-repeats.

Unlike every other endpoint in this API, /detect-ruler needs nothing but
the raw uploaded file -- it runs BEFORE any calibration exists, since its
whole point is to suggest one.
"""
import cv2
import numpy as np
from fastapi.testclient import TestClient

from backend.main import app


def make_synthetic_ruler_image(width=400, total_height=220, ruler_top=40, ruler_body_bottom=100, seed=3):
    rng = np.random.default_rng(seed)
    img = np.full((total_height, width), 100, dtype=np.uint8)
    img[ruler_top:ruler_body_bottom, :] = 250
    x0, minor_spacing, major_every = 20, 20, 4
    for i in range(18):
        x = x0 + i * minor_spacing
        if x + 2 >= width:
            break
        tick_len = 52 if i % major_every == 0 else 18
        img[ruler_top : ruler_top + tick_len, x : x + 2] = 0
    fabric = img[ruler_body_bottom:, :].astype(np.float32)
    yy, xx = np.mgrid[0 : fabric.shape[0], 0 : fabric.shape[1]]
    fabric = 130 + 8 * np.sin(2 * np.pi * xx / 13) + 5 * np.sin(2 * np.pi * yy / 11)
    fabric += rng.normal(0, 20, size=fabric.shape)
    img[ruler_body_bottom:, :] = np.clip(fabric, 0, 255).astype(np.uint8)
    return cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)


def _encode(image):
    ok, buf = cv2.imencode(".jpg", image)
    assert ok
    return buf.tobytes()


def test_detect_ruler_success_needs_only_the_file():
    image = make_synthetic_ruler_image()
    client = TestClient(app)
    resp = client.post("/detect-ruler", files={"file": ("ruler.jpg", _encode(image), "image/jpeg")})
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["point1_px"] is not None
    assert body["point2_px"] is not None
    assert body["suggested_unit"] in ("mm", "cm", "in")
    assert body["major_tick_count"] >= 2
    assert 0.0 <= body["confidence"] <= 1.0


def test_detect_ruler_no_ruler_still_returns_200_with_message():
    rng = np.random.default_rng(1)
    plain = np.clip(140 + rng.normal(0, 10, size=(200, 300)), 0, 255).astype(np.uint8)
    image = cv2.cvtColor(plain, cv2.COLOR_GRAY2BGR)
    client = TestClient(app)
    resp = client.post("/detect-ruler", files={"file": ("plain.jpg", _encode(image), "image/jpeg")})
    assert resp.status_code == 200
    body = resp.json()
    # Real-world contract: never a request error just because nothing was
    # found -- same convention as /propose-rois and /count-repeats.
    if not body["success"]:
        assert body["message"]
        assert body["point1_px"] is None


def test_detect_ruler_rejects_bad_upload():
    client = TestClient(app)
    resp = client.post("/detect-ruler", files={"file": ("not_an_image.txt", b"hello world", "text/plain")})
    assert resp.status_code == 400
    body = resp.json()
    assert body["success"] is False
    assert body["message"]
