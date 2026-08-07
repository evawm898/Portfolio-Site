"""
Tests for the ground-truth correction system: saving a labeled record
against a prediction, deriving actual-per-inch from a stitch count,
percent-error math, the image-save opt-in, and CSV/JSON export.
"""
import json

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from storage import corrections_store as store


@pytest.fixture(autouse=True)
def isolated_storage(tmp_path, monkeypatch):
    """Redirect the SQLite DB and image dir to a throwaway tmp path per test."""
    data_dir = tmp_path / "data"
    monkeypatch.setattr(store, "DATA_DIR", data_dir)
    monkeypatch.setattr(store, "DB_PATH", data_dir / "corrections.db")
    monkeypatch.setattr(store, "IMAGES_DIR", data_dir / "images")
    store.init_db()
    yield


@pytest.fixture
def client():
    return TestClient(app)


def _base_correction_fields(**overrides):
    fields = {
        "roi_x": 0,
        "roi_y": 0,
        "roi_width_px": 300,
        "roi_height_px": 200,
        "roi_width_mm": 60.0,
        "roi_height_mm": 40.0,
        "pixels_per_mm": 5.0,
        "orientation": "vertical",
        "predicted_wale_spacing_px": 12.0,
        "predicted_course_spacing_px": 16.0,
        "predicted_wale_spacing_mm": 2.4,
        "predicted_course_spacing_mm": 3.2,
        "predicted_wales_per_inch": 8.0,
        "predicted_courses_per_inch": 6.0,
        "predicted_wale_confidence": 0.9,
        "predicted_course_confidence": 0.85,
        "detected_wale_positions": "[]",
        "detected_course_positions": "[]",
        "calibration_correct": True,
        "orientation_correct": True,
        "algorithm_version": "test-v0",
        "save_image": False,
    }
    fields.update(overrides)
    return fields


def test_save_correction_with_direct_actual_values(client):
    res = client.post(
        "/corrections",
        data=_base_correction_fields(actual_wales_per_inch=10.0, actual_courses_per_inch=7.0),
    )
    assert res.status_code == 201
    body = res.json()
    assert body["actual_wales_per_inch"] == 10.0
    assert body["actual_courses_per_inch"] == 7.0
    # (predicted - actual) / actual * 100
    assert body["wale_percent_error"] == pytest.approx((8.0 - 10.0) / 10.0 * 100, abs=0.01)
    assert body["course_percent_error"] == pytest.approx((6.0 - 7.0) / 7.0 * 100, abs=0.01)
    assert body["image_saved"] is False
    assert body["id"]
    assert body["created_at"]


def test_actual_per_inch_derived_from_roi_stitch_count(client):
    # orientation=vertical -> wale extent is ROI width (60mm), course extent is ROI height (40mm)
    res = client.post(
        "/corrections",
        data=_base_correction_fields(actual_wale_count=12, actual_course_count=10),
    )
    assert res.status_code == 201
    body = res.json()
    expected_wpi = 12 / (60.0 / 25.4)
    expected_cpi = 10 / (40.0 / 25.4)
    assert body["actual_wales_per_inch"] == pytest.approx(expected_wpi, abs=1e-6)
    assert body["actual_courses_per_inch"] == pytest.approx(expected_cpi, abs=1e-6)


def test_horizontal_orientation_swaps_which_roi_extent_applies(client):
    res = client.post(
        "/corrections",
        data=_base_correction_fields(
            orientation="horizontal", actual_wale_count=12, actual_course_count=10
        ),
    )
    body = res.json()
    # Now wale extent is ROI height (40mm), course extent is ROI width (60mm).
    expected_wpi = 12 / (40.0 / 25.4)
    expected_cpi = 10 / (60.0 / 25.4)
    assert body["actual_wales_per_inch"] == pytest.approx(expected_wpi, abs=1e-6)
    assert body["actual_courses_per_inch"] == pytest.approx(expected_cpi, abs=1e-6)


def test_direct_value_takes_priority_over_roi_count(client):
    res = client.post(
        "/corrections",
        data=_base_correction_fields(
            actual_wales_per_inch=9.5, actual_wale_count=999,  # count would give a wildly different number
        ),
    )
    assert res.json()["actual_wales_per_inch"] == 9.5


def test_missing_actual_values_yields_null_percent_error_not_fabricated(client):
    res = client.post("/corrections", data=_base_correction_fields())
    body = res.json()
    assert body["actual_wales_per_inch"] is None
    assert body["actual_courses_per_inch"] is None
    assert body["wale_percent_error"] is None
    assert body["course_percent_error"] is None


def test_image_not_saved_by_default_even_with_file_attached(client):
    img = np.full((50, 50, 3), 180, dtype=np.uint8)
    ok, buf = cv2.imencode(".jpg", img)
    res = client.post(
        "/corrections",
        files={"file": ("sample.jpg", buf.tobytes(), "image/jpeg")},
        data=_base_correction_fields(save_image=False),
    )
    assert res.json()["image_saved"] is False
    assert not store.IMAGES_DIR.exists() or not list(store.IMAGES_DIR.glob("*"))


def test_image_saved_when_opted_in(client):
    img = np.full((50, 50, 3), 180, dtype=np.uint8)
    ok, buf = cv2.imencode(".jpg", img)
    res = client.post(
        "/corrections",
        files={"file": ("sample.jpg", buf.tobytes(), "image/jpeg")},
        data=_base_correction_fields(save_image=True),
    )
    body = res.json()
    assert body["image_saved"] is True

    records = client.get("/corrections").json()
    saved = [r for r in records if r["id"] == body["id"]][0]
    assert saved["image_path"]
    assert (store.DATA_DIR / saved["image_path"]).exists()


def test_list_and_export_reflect_saved_records(client):
    client.post("/corrections", data=_base_correction_fields(actual_wales_per_inch=8.2, actual_courses_per_inch=6.1))
    client.post("/corrections", data=_base_correction_fields(actual_wales_per_inch=7.9, actual_courses_per_inch=5.9))

    records = client.get("/corrections").json()
    assert len(records) == 2
    assert isinstance(records[0]["detected_wale_positions"], list)

    csv_res = client.get("/corrections/export.csv")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "attachment" in csv_res.headers["content-disposition"]
    lines = csv_res.text.strip().splitlines()
    assert len(lines) == 3  # header + 2 rows

    json_res = client.get("/corrections/export.json")
    assert json_res.status_code == 200
    assert "attachment" in json_res.headers["content-disposition"]
    assert len(json.loads(json_res.text)) == 2


def test_malformed_positions_payload_does_not_crash(client):
    res = client.post(
        "/corrections",
        data=_base_correction_fields(detected_wale_positions="not json", detected_course_positions="{}"),
    )
    assert res.status_code == 201
    records = client.get("/corrections").json()
    assert records[0]["detected_wale_positions"] == []
