"""
The calibration guardrail: /detect-ruler pre-fills only what it can justify.

See "Checking a ruler suggestion before it is offered" in
analysis/gauge_analysis.py for the five checks, and the README's "Calibration
guardrail" for the measurements behind them. The app-path scorecard
(tests/app_path_scorecard.py, pinned in test_app_path_scorecard.py) is the
authority on what users see; this file is the gate's own unit and control
tests:

  * every check fires ALONE: each refusal below is built to satisfy the other
    four, so a check that stops working turns exactly one test red;
  * a well-formed ruler is still offered, and in plain words;
  * images with no ruler -- printed text, noise, a gradient -- are offered
    nothing, through the shipped endpoint;
  * the check against REAL tick evidence: for every pair of ticks the detector
    found on the photos that have a real ruler, the gate never accepts a pair
    that is not one correct unit.
"""
from __future__ import annotations

import dataclasses
import os

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

import app_path_scorecard as ap
from analysis.gauge_analysis import (
    RulerCalibrationResult,
    RulerTickEvidence,
    detect_ruler_calibration,
    justify_ruler_calibration,
)
from backend.main import app
from test_ruler_calibration import make_synthetic_ruler_image

PITCH = 10.0  # px between minor ticks in the hand-built rulers below


def _comb(n_per_unit: int, units: int = 6, *, reach=None, start=0.0, pitch=PITCH):
    """Ticks of a hand-built comb: unit marks (reach 1.0), a half-unit tier (0.5) where the
    subdivision is even, the rest short (0.2). Returns [(position, reach)]."""
    reach = reach or {}
    ticks = []
    for i in range(n_per_unit * units + 1):
        if i % n_per_unit == 0:
            r = 1.0
        elif n_per_unit % 2 == 0 and i % (n_per_unit // 2) == 0:
            r = 0.5
        else:
            r = 0.2
        ticks.append((start + i * pitch, reach.get(i, r)))
    return ticks


def _at(ticks, position):
    """Index of the tick at `position` (the evidence list can have ticks removed from it)."""
    return min(range(len(ticks)), key=lambda i: abs(ticks[i][0] - position))


def _result(ticks, i1, i2, *, unit="cm", majors=None, major_count=None, pitch=PITCH, success=True):
    """A RulerCalibrationResult whose points sit on ticks i1 and i2 of a horizontal ruler."""
    if majors is None:
        majors = tuple(p for p, r in ticks if r >= 1.0)
    p1, p2 = ticks[i1][0], ticks[i2][0]
    return RulerCalibrationResult(
        success=success,
        point1_px=(p1, 50.0),
        point2_px=(p2, 50.0),
        suggested_unit=unit,
        minor_tick_spacing_px=pitch,
        major_tick_count=len(majors) if major_count is None else major_count,
        confidence=0.9,
        evidence=RulerTickEvidence(axis=0, ticks=tuple(ticks), major_positions=tuple(majors), minor_spacing_px=pitch),
    )


# --- A well-formed ruler is offered, in plain words ------------------------


@pytest.mark.parametrize("n, unit, word", [(10, "cm", "1 cm"), (8, "in", "1 inch"), (16, "in", "1 inch")])
def test_a_clean_comb_is_justified_and_the_assumption_is_in_plain_words(n, unit, word):
    ticks = _comb(n)
    j = justify_ruler_calibration(_result(ticks, n, 2 * n, unit=unit))
    assert j.ok, j.reason
    assert j.minors_per_unit == n
    assert j.assumption.startswith(f"Read as {word} between these two marks.")
    assert f"{n} small ticks" in j.assumption
    assert "cannot read the ruler's numbers" in j.assumption


# --- Each check fires alone -------------------------------------------------


def test_check_1_no_tick_hierarchy_is_refused():
    # The detector's fallback: a run of minor ticks labelled "1 unit". Everything else is clean.
    ticks = _comb(10)
    j = justify_ruler_calibration(_result(ticks, 10, 20, major_count=0))
    assert not j.ok and "hierarchy" in j.reason


def test_check_2_a_span_that_is_not_a_standard_subdivision_is_refused():
    ticks = _comb(10)
    # 7 minor ticks apart: the ends are unit marks only if we lie about the comb.
    ticks = [(p, 1.0 if i in (3, 10) else r) for i, (p, r) in enumerate(ticks)]
    j = justify_ruler_calibration(_result(ticks, 3, 10))
    assert not j.ok and "not a standard" in j.reason


def test_check_2_a_span_that_is_not_whole_minor_ticks_is_refused():
    # A 30 px pitch, so the pixel allowance (1 + 0.5 * 10 = 6 px) is well under half a pitch:
    # 10.4 pitches between two unit-class marks rounds to 10 but is 12 px off.
    ticks = _comb(10, pitch=30.0)
    ticks = [(p + 12.0 if i >= 20 else p, r) for i, (p, r) in enumerate(ticks)]
    j = justify_ruler_calibration(_result(ticks, 10, 20, pitch=30.0))
    assert not j.ok and "not 10 minor ticks" in j.reason


def test_check_2_pixel_quantisation_alone_does_not_refuse():
    # Two ends and a median pitch are whole pixels: 5 px of slack over 10 pitches is inside the 6 px allowed.
    ticks = _comb(10, pitch=30.0)
    ticks = [(p + 5.0 if i >= 20 else p, r) for i, (p, r) in enumerate(ticks)]
    assert justify_ruler_calibration(_result(ticks, 10, 20, pitch=30.0)).ok


def test_check_3_a_unit_that_disagrees_with_the_subdivision_is_refused():
    # Ten minor ticks is a centimetre; the detector said inch.
    ticks = _comb(10)
    j = justify_ruler_calibration(_result(ticks, 10, 20, unit="in"))
    assert not j.ok and "reads as cm" in j.reason


def test_check_4_ends_of_different_tick_classes_are_refused():
    # A half-unit mark and a unit mark, 8 minor ticks apart on a 16-per-unit ruler, are NOT a unit.
    ticks = _comb(16)
    j = justify_ruler_calibration(_result(ticks, 8, 16, unit="in", majors=(ticks[8][0], ticks[16][0])))
    assert not j.ok and "one tick class" in j.reason


def test_check_4_ends_no_longer_than_the_ticks_between_are_refused():
    # Both ends and a tick between them reach the same: nothing says the ends are the unit marks.
    ticks = _comb(10, reach={15: 1.0})
    j = justify_ruler_calibration(_result(ticks, 10, 20, majors=(ticks[10][0], ticks[20][0])))
    assert not j.ok and "one tick class" in j.reason


def test_check_5_an_equally_long_tick_half_way_is_refused():
    # Unit marks every 5 pitches; the detector's pair (tick 10 and tick 20) skips one, so its span is TWO
    # units. The in-span unit mark (tick 15) was missed by the detector, so it is not in the evidence and
    # check 4 (ticks BETWEEN the ends) cannot see it -- its outer twins at tick 5 and tick 25 are the
    # only witnesses, half a span either side.
    ticks = [(i * PITCH, 1.0 if i % 5 == 0 else 0.2) for i in range(40) if i != 15]
    r = _result(ticks, _at(ticks, 100.0), _at(ticks, 200.0), majors=tuple(p for p, rr in ticks if rr >= 1.0))
    j = justify_ruler_calibration(r)
    assert not j.ok and "half-way" in j.reason


def test_check_5_does_not_refuse_a_shorter_half_unit_tier():
    # The same comb with a 0.5-reach tier at the half (a real cm ruler's 5 mm tick) is fine.
    assert justify_ruler_calibration(_result(_comb(10), 20, 30)).ok


def test_without_evidence_or_a_ruler_nothing_is_justified():
    ticks = _comb(10)
    assert not justify_ruler_calibration(_result(ticks, 10, 20, success=False)).ok
    no_ev = dataclasses.replace(_result(ticks, 10, 20), evidence=None)
    assert not justify_ruler_calibration(no_ev).ok


def test_a_vertical_ruler_is_checked_along_its_own_axis():
    ticks = _comb(10)
    r = _result(ticks, 10, 20)
    vertical = dataclasses.replace(
        r,
        point1_px=(50.0, r.point1_px[0]),
        point2_px=(50.0, r.point2_px[0]),
        evidence=dataclasses.replace(r.evidence, axis=1),
    )
    assert justify_ruler_calibration(vertical).ok


# --- The endpoint: positives, and images with no ruler ----------------------


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def _post(client, image):
    ok, buf = cv2.imencode(".png", image)
    assert ok
    return client.post("/detect-ruler", files={"file": ("x.png", buf.tobytes(), "image/png")}).json()


def test_endpoint_offers_a_metric_synthetic_ruler_with_its_assumption(client):
    body = _post(client, make_synthetic_ruler_image(major_every=10, n_ticks=32, width=700))
    assert body["success"], body["message"]
    assert body["suggested_unit"] == "cm"
    assert body["assumption"].startswith("Read as 1 cm between these two marks.")
    assert body["declined_reason"] == ""


def test_endpoint_still_offers_the_existing_four_per_major_synthetic_ruler(client):
    body = _post(client, make_synthetic_ruler_image(major_every=4))
    assert body["success"], body["message"]
    assert body["suggested_unit"] == "in"


def _text_page(seed, font, scale):
    rng = np.random.default_rng(seed)
    img = np.full((1100, 800, 3), 245, np.uint8)
    words = ["gauge", "swatch", "needle", "stitch", "measure", "inch", "yarn", "pattern", "row", "wale",
             "course", "0123456789", "(10cm)", "4in"]
    for i in range(24):
        cv2.putText(img, " ".join(rng.choice(words, 6)), (30, 60 + i * 40), font, scale, (20, 20, 20),
                    1 + int(scale > 1), cv2.LINE_AA)
    return img


NO_RULER_IMAGES = {
    "text-simplex": lambda: _text_page(0, cv2.FONT_HERSHEY_SIMPLEX, 0.8),
    "text-complex": lambda: _text_page(1, cv2.FONT_HERSHEY_COMPLEX, 0.9),
    "text-duplex-large": lambda: _text_page(2, cv2.FONT_HERSHEY_DUPLEX, 1.1),
    "text-small": lambda: _text_page(3, cv2.FONT_HERSHEY_SIMPLEX, 0.5),
    "text-triplex": lambda: _text_page(4, cv2.FONT_HERSHEY_TRIPLEX, 0.7),
    "noise": lambda: cv2.cvtColor(
        np.clip(140 + np.random.default_rng(1).normal(0, 10, (200, 300)), 0, 255).astype(np.uint8), cv2.COLOR_GRAY2BGR),
    "stripes": lambda: cv2.cvtColor(
        np.tile((127 + 100 * np.sin(np.arange(900) / 4.0)).astype(np.uint8), (600, 1)), cv2.COLOR_GRAY2BGR),
}


@pytest.mark.parametrize("name", sorted(NO_RULER_IMAGES))
def test_endpoint_offers_nothing_on_an_image_with_no_ruler(client, name):
    body = _post(client, NO_RULER_IMAGES[name]())
    assert body["success"] is False
    assert body["point1_px"] is None and body["point2_px"] is None
    assert body["assumption"] == ""
    assert "click two marks on your ruler, then type the distance between them" in body["message"]


def test_the_three_drawn_fabrics_are_offered_nothing(client):
    for name in ("synth_jersey", "synth_garter", "synth_rib"):
        _filename, data, _ctype = ap.upload_for(name)
        body = client.post("/detect-ruler", files={"file": (name + ".png", data, "image/png")}).json()
        assert body["success"] is False, f"{name}: {body}"


def test_a_found_but_unjustified_pattern_says_why_for_logs_not_for_display(client):
    # teal: the detector reads the needle-gauge numerals, finds no tick hierarchy.
    _filename, data, ctype = ap.upload_for("teal")
    body = client.post("/detect-ruler", files={"file": ("teal.jpg", data, ctype)}).json()
    assert body["success"] is False
    assert "hierarchy" in body["declined_reason"]
    assert body["message"].startswith("A ruler-like pattern was found, but its scale could not be verified.")
    assert "hierarchy" not in body["message"]


# --- Real tick evidence: the gate never accepts a pair that is not one correct unit ---------

_UNIT_OF = {4: "in", 5: "cm", 8: "in", 10: "cm", 16: "in"}
_UNIT_IN_INCHES = {"in": 1.0, "cm": 1.0 / 2.54}
_FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")


@pytest.mark.parametrize("name", ["jersey", "knit_01", "knit_02"])
def test_no_pair_of_real_ticks_is_wrongly_accepted(name):
    """Every pair of ticks the detector found on a photo with a real ruler, offered with the
    subdivision-consistent unit (the strongest label a wrong pair could carry): the gate accepts
    a pair only if it really is one unit. Without checks 4 and 5 this accepted 39, 96 and 8 wrong
    pairs on jersey, knit_01 and knit_02."""
    fx = ap.FIXTURES_BY_NAME[name]
    img = cv2.imread(os.path.join(_FIXTURES_DIR, fx.source))
    base = detect_ruler_calibration(img)
    assert base.success and base.evidence is not None
    ev = base.evidence
    pos = [p for p, _ in ev.ticks]
    other = 1 - ev.axis
    accepted_right = accepted_wrong = 0
    for i in range(len(pos)):
        for j in range(i + 1, len(pos)):
            span = pos[j] - pos[i]
            n = int(round(span / ev.minor_spacing_px))
            if n not in _UNIT_OF:
                continue
            unit = _UNIT_OF[n]
            p1 = [0.0, 0.0]
            p2 = [0.0, 0.0]
            p1[ev.axis], p2[ev.axis] = pos[i], pos[j]
            p1[other] = p2[other] = base.point1_px[other]
            cand = dataclasses.replace(base, point1_px=tuple(p1), point2_px=tuple(p2), suggested_unit=unit)
            if not justify_ruler_calibration(cand).ok:
                continue
            err = abs(span / _UNIT_IN_INCHES[unit] / fx.px_per_inch_wale - 1.0) * 100.0
            if err <= ap.RULER_SCALE_TOL_PCT:
                accepted_right += 1
            else:
                accepted_wrong += 1
    assert accepted_wrong == 0, f"{name}: {accepted_wrong} wrong pairs accepted ({accepted_right} right)"
    if name in ap.FIXTURES_BY_NAME and name in ("jersey", "knit_01"):
        assert accepted_right >= 1, f"{name}: the gate accepts no right pair at all"


@pytest.mark.parametrize("name", ["jersey", "knit_01"])
def test_the_detectors_own_pair_on_a_real_ruler_is_justified(name):
    fx = ap.FIXTURES_BY_NAME[name]
    img = cv2.imread(os.path.join(_FIXTURES_DIR, fx.source))
    assert justify_ruler_calibration(detect_ruler_calibration(img)).ok


@pytest.mark.parametrize("name", ["teal", "knit_02", "knit_05", "knit_06", "knit_08", "knit_09"])
def test_the_detectors_own_pair_on_the_other_real_photos_is_refused(name):
    fx = ap.FIXTURES_BY_NAME[name]
    img = cv2.imread(os.path.join(_FIXTURES_DIR, fx.source))
    j = justify_ruler_calibration(detect_ruler_calibration(img))
    assert not j.ok and j.reason
