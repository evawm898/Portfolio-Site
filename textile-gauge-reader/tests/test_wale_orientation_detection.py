"""
Wale-direction detection, pinned: the orientation step's pre-selection must be RIGHT on every app-path
fixture upright and rotated 90 degrees, or say "unsure" -- a confident wrong pre-selection is the failure
this file exists to catch. The signal is #338's leg-slant field (analysis.gauge_analysis.
detect_wale_orientation); the rule is a bare comparison per proposed area and unanimity across them,
with no numeric threshold anywhere -- so this file pins BEHAVIOUR (right / unsure / never wrong), never a
margin. Rotated 15 degrees is reported, not required (see README "Wale direction is detected"): it is a
tilt past the detector's reach, a separate mechanism, and two fixtures come out unanimous and wrong there.

Driven through the shipped route (/propose-rois through TestClient) exactly as the page drives it, so
a drifted field name breaks here rather than quietly pre-selecting nothing.
"""
from __future__ import annotations

import json
import os
import sys

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import app_path_scorecard as ap  # noqa: E402
import bad_input_sweep as bis  # noqa: E402
from analysis import gauge_analysis as G  # noqa: E402
from backend.main import app  # noqa: E402

FIXTURE_NAMES = [f.name for f in ap.FIXTURES]


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def _image(name: str) -> np.ndarray:
    fn, data, ctype = ap.upload_for(name)
    return cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)


def _propose(client, name: str, img: np.ndarray, png: bool) -> dict:
    fx = ap.FIXTURES_BY_NAME[name]
    ok, buf = cv2.imencode(".png", img) if png else cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 95])
    assert ok
    files = {"file": ("x.png" if png else "x.jpg", buf.tobytes(), "image/png" if png else "image/jpeg")}
    res = client.post("/propose-rois", files=files, data=ap.calibration_for_scale(fx.px_per_inch_wale))
    assert res.status_code == 200, res.text[:200]
    return res.json()


def _detect(client, name: str, transform: str) -> dict:
    img = _image(name)
    png = ap.FIXTURES_BY_NAME[name].source.startswith("synthetic:")
    if transform == "rot90":
        img = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
    elif transform == "rot15":
        img = bis.rotate_crop(img, 15.0)
    return _propose(client, name, img, png)


# --- Criterion 1: right or unsure on every fixture, upright and rotated 90 degrees; never confidently wrong ---


@pytest.mark.parametrize("name", FIXTURE_NAMES)
def test_upright_fixture_detects_vertical(client, name):
    body = _detect(client, name, "upright")
    assert body["orientation_detected"] == "vertical", (name, body["orientation_message"], body["orientation_votes"])
    assert "up and down" in body["orientation_message"]


@pytest.mark.parametrize("name", FIXTURE_NAMES)
def test_rotated_90_fixture_detects_horizontal(client, name):
    body = _detect(client, name, "rot90")
    assert body["orientation_detected"] == "horizontal", (name, body["orientation_message"], body["orientation_votes"])
    assert "across" in body["orientation_message"]


# Rotated 15 degrees: REPORTED, not required. Pinned as it measures so a change is seen, with the two
# confident-wrong fixtures as strict xfails (a fix lands by taking the marker off on purpose).
# Through the shipped route, i.e. on the JPEG-re-encoded bytes the sweep uploads. On the raw rotated pixels
# three of these read differently (knit_02 unsure, knit_05 horizontal, knit_06 vertical): at 15 degrees the
# per-area comparison sits at the noise floor, which is the finding, not a tuning target.
ROT15_EXPECTED = {
    "jersey": "vertical", "teal": None, "knit_01": "vertical", "knit_02": "horizontal", "knit_05": "vertical",
    "knit_06": None, "knit_08": "vertical", "knit_09": None, "synth_jersey": "vertical",
    "synth_garter": "horizontal", "synth_rib": "vertical",
}
ROT15_CONFIDENT_WRONG = {"knit_02", "synth_garter"}


@pytest.mark.parametrize("name", FIXTURE_NAMES)
def test_rotated_15_is_reported_as_measured(client, name):
    body = _detect(client, name, "rot15")
    assert body["orientation_detected"] == ROT15_EXPECTED[name], (name, body["orientation_message"])


@pytest.mark.parametrize("name", sorted(ROT15_CONFIDENT_WRONG))
@pytest.mark.xfail(strict=True, reason="15 degrees of tilt is past the detector's reach: unanimous and wrong (README)")
def test_rotated_15_is_right_or_unsure(client, name):
    assert _detect(client, name, "rot15")["orientation_detected"] in ("vertical", None)


# --- The rule is what it says: a vote per area, unanimity, nothing else ------------------------


def test_every_vote_is_the_bare_comparison_and_the_detection_is_unanimity(client):
    for name in FIXTURE_NAMES:
        for t in ("upright", "rot90"):
            body = _detect(client, name, t)
            votes = body["orientation_votes"]
            assert votes, name
            for v in votes:
                vx, vy = v["leg_slant_var_x"], v["leg_slant_var_y"]
                assert vx is not None and vy is not None and vx != vy
                assert v["vote"] == ("vertical" if vx > vy else "horizontal")
            assert body["orientation_detected"] == votes[0]["vote"] and len({v["vote"] for v in votes}) == 1


def test_a_split_vote_is_unsure_and_pre_selects_nothing():
    """Two areas that disagree -> None (the negative control for the unanimity rule). Built from a real
    photo: one area upright, one rotated 90 degrees, pasted side by side."""
    img = _image("jersey")
    h, w = img.shape[:2]
    side = min(h, w)
    left = img[:side, :side]
    right = cv2.rotate(left, cv2.ROTATE_90_CLOCKWISE)
    both = np.concatenate([left, right], axis=1)
    ppm = ap.FIXTURES_BY_NAME["jersey"].px_per_inch_wale / 25.4
    det = G.detect_wale_orientation(both, [(0, 0, side, side), (side, 0, side, side)], ppm, ["left", "right"])
    assert [v.vote for v in det.votes] == ["vertical", "horizontal"]
    assert det.orientation is None and "1 of 2" in det.message


def test_no_area_and_no_signal_are_unsure():
    img = _image("jersey")
    ppm = ap.FIXTURES_BY_NAME["jersey"].px_per_inch_wale / 25.4
    assert G.detect_wale_orientation(img, [], ppm).orientation is None
    flat = np.full((400, 400, 3), 128, np.uint8)
    det = G.detect_wale_orientation(flat, [(0, 0, 400, 400)], ppm)
    assert det.orientation is None and det.votes[0].vote is None


def test_the_detection_is_a_pre_selection_only(client):
    """/analyze-multi still takes the orientation it is sent: the detection moves no measurement."""
    name = "jersey"
    fx = ap.FIXTURES_BY_NAME[name]
    cal = ap.calibration_for_scale(fx.px_per_inch_wale)
    pr = client.post("/propose-rois", files=ap._files(name), data=cal).json()
    rois = [{"label": r["label"], "x": r["x"], "y": r["y"], "width": r["width"], "height": r["height"], "source": "auto"}
            for r in pr["rois"]]
    assert pr["orientation_detected"] == "vertical"
    out = {}
    for o in ("vertical", "horizontal"):
        am = client.post("/analyze-multi", files=ap._files(name),
                         data=dict(cal, rois_json=json.dumps(rois), orientation=o, structure="unknown")).json()
        out[o] = (am["wale"].get("spacing_px"), am["course"].get("spacing_px"))
    assert out["vertical"] != out["horizontal"]


# --- Non-knit images: reported. A directional texture gets a confident call (it has a direction);
# everything the proposer refuses is unsure. Pinned as measured so a change is seen.
NONKNIT_EXPECTED = {
    "text_lines": None, "wood_grain": "vertical", "brick_wall": None, "window_blinds": "horizontal",
    "gingham_woven": None, "corduroy": "horizontal", "random_noise": None, "flat_grey": None, "checkerboard": None,
    "repo_toile": None, "repo_pigment_swatches": None, "repo_daisy_photo": None, "repo_final_look": None,
}


@pytest.mark.parametrize("name", sorted(NONKNIT_EXPECTED))
def test_nonknit_detection_is_reported_as_measured(client, name):
    data, ctype, fn, w, h = bis.nonknit_upload(name)
    res = client.post("/propose-rois", files={"file": (fn, data, ctype)}, data=ap.calibration_for_scale(bis.NK_PPI))
    assert res.status_code == 200
    assert res.json()["orientation_detected"] == NONKNIT_EXPECTED[name], name
