"""
App-path scorecard, pinned: what users see, graded on every PR.

The measurement itself lives in tests/app_path_scorecard.py (read its
docstring first): every fixture goes through the SHIPPED API -- /detect-
ruler, /propose-rois, /analyze-multi -- via the FastAPI test client, every
proposed area accepted, orientation and structure left at the frontend's
defaults. This file pins what that path produces, so the next PR is graded
against it.

The contract, the pinned-crop scorecard's (test_ground_truth_scorecard.py)
applied to the app path:

  * A row (calibration mode, fixture, axis) whose baseline error is within
    ACCURACY_BAR_PCT is a hard test: it fails if its |error| worsens by
    more than REGRESSION_PP. Improvement is free; re-pin in the same change.
  * A row beyond the bar -- or with no result at all -- is a STRICT xfail
    asserting the bar. The moment a change fixes it, it XPASSes, the strict
    mark fails CI, and the mark has to come off on purpose.
  * The same strict-xfail treatment for: a fixture that gets no proposed
    areas, a wrong ruler pre-fill, and a result that is unstable under
    +-0.5/1/2% scale jitter.
  * CONFIDENT-AND-WRONG (status "confident", |error| > 10%) is pinned as an
    EXACT list per calibration mode -- the headline number. It moving in
    either direction fails, so a fix re-pins it and a regression is loud.
  * The README's "App path (what users see)" block must be byte-identical
    to what this run generates (`python tests/app_path_scorecard.py
    --write-readme` regenerates it).

Baseline pinned 2026-10-22 against main 8403b47 (+ docs-only 5a97349). On
calibration (a) it reproduced the read-only audit's app-path numbers:
jersey W +90.0, teal W +70.5, knit_09 W +103.7, knit_01 W +3.4,
knit_08 W -0.1; knit_02 / knit_05 get no proposed areas.

RE-PINNED 2026-10-22 for the consensus loop-count gate (README: "Consensus
loop-count override: the count may corroborate, never override by a
harmonic"). On (a) every former confident-and-wrong wale row lands within
10%: jersey -5.5, teal -6.6, knit_09 -0.9, synth_jersey +0.2, synth_garter
+0.0, and knit_06 -4.3. That change is a CANDIDATE pinned pending Eva's
ruling -- it misses two of the PR's own criteria (jersey W is outside 10%
at three of the seven jitter scales, and calibration (b) gains four
confident-and-wrong rows, each explained in KNOWN_BEYOND_BAR) -- so these
pins describe the measured state of the candidate, not an accepted
baseline.
"""
from __future__ import annotations

import os

import pytest

import app_path_scorecard as ap

ACCURACY_BAR_PCT = 20.0
REGRESSION_PP = 2.0

# Signed % error per (mode, fixture, axis), rounded to 0.1. None = no
# number at all (no proposals, or a consensus with no measurement).
BASELINE = {
    # (a) correct scale from ground truth
    ("truth", "jersey", "wale"): -5.5,
    ("truth", "jersey", "course"): -6.4,
    ("truth", "teal", "wale"): -6.6,
    ("truth", "teal", "course"): 0.5,
    ("truth", "knit_01", "wale"): 3.4,
    ("truth", "knit_01", "course"): 4.3,
    ("truth", "knit_02", "wale"): None,
    ("truth", "knit_05", "wale"): None,
    ("truth", "knit_05", "course"): None,
    ("truth", "knit_06", "wale"): -4.3,
    ("truth", "knit_06", "course"): 0.4,
    ("truth", "knit_08", "wale"): -0.1,
    ("truth", "knit_08", "course"): 2.3,
    ("truth", "knit_09", "wale"): -0.9,
    ("truth", "knit_09", "course"): -0.0,
    ("truth", "synth_jersey", "wale"): 0.2,
    ("truth", "synth_jersey", "course"): 0.1,
    ("truth", "synth_garter", "wale"): 0.0,
    ("truth", "synth_garter", "course"): 0.1,
    ("truth", "synth_rib", "wale"): 0.0,
    ("truth", "synth_rib", "course"): 0.1,
    # (b) the ruler detector's pre-fill accepted as-is
    ("ruler", "jersey", "wale"): -16.5,
    ("ruler", "jersey", "course"): -6.7,
    ("ruler", "teal", "wale"): 69.6,
    ("ruler", "teal", "course"): 99.1,
    ("ruler", "knit_01", "wale"): 6.3,
    ("ruler", "knit_01", "course"): 2.0,
    ("ruler", "knit_02", "wale"): None,
    ("ruler", "knit_05", "wale"): -15.5,
    ("ruler", "knit_05", "course"): -1.2,
    ("ruler", "knit_06", "wale"): 84.5,
    ("ruler", "knit_06", "course"): 93.1,
    ("ruler", "knit_08", "wale"): None,
    ("ruler", "knit_08", "course"): None,
    ("ruler", "knit_09", "wale"): 19.3,
    ("ruler", "knit_09", "course"): 17.1,
    ("ruler", "synth_jersey", "wale"): 154.0,
    ("ruler", "synth_jersey", "course"): 153.9,
    ("ruler", "synth_garter", "wale"): 154.0,
    ("ruler", "synth_garter", "course"): 155.0,
    ("ruler", "synth_rib", "wale"): 103.2,
    ("ruler", "synth_rib", "course"): 306.5,
}

_LEG_GATE = (
    "the per-area periodicity reads the truth and the loop-lattice count reads the stitch-leg "
    "half-period; the count is now rejected when it disagrees with the area's own reading across a "
    "harmonic (README: 'Consensus loop-count override: the count may corroborate, never override by "
    "a harmonic')"
)
_NO_PROPOSALS = "/propose-rois returns no areas ('Could not evaluate any candidate measurement areas.')"


def _ruler_reason(fixture: str, detail: str) -> str:
    return f"ruler pre-fill {detail}, so every number the user sees on {fixture} is off by that scale"


# Why every beyond-bar row is beyond it.
KNOWN_BEYOND_BAR = {
    ("truth", "knit_02", "wale"): _NO_PROPOSALS,
    ("truth", "knit_05", "wale"): _NO_PROPOSALS,
    ("truth", "knit_05", "course"): _NO_PROPOSALS,
    ("ruler", "teal", "wale"): _ruler_reason("teal", "is +94.6% (labelled 1 cm)") + " (+258.7% before the leg gate; " + _LEG_GATE + ")",
    ("ruler", "teal", "course"): _ruler_reason("teal", "is +94.6% (labelled 1 cm)"),
    ("ruler", "knit_02", "wale"): _NO_PROPOSALS + " at the pre-filled (-88.3%) scale too",
    ("ruler", "knit_06", "wale"): _ruler_reason("knit_06", "is +75.2% (labelled 1 cm)"),
    ("ruler", "knit_06", "course"): _ruler_reason("knit_06", "is +75.2% (labelled 1 cm)"),
    ("ruler", "knit_08", "wale"): _NO_PROPOSALS + " at the pre-filled (+486.5%) scale",
    ("ruler", "knit_08", "course"): _NO_PROPOSALS + " at the pre-filled (+486.5%) scale",
    ("ruler", "synth_jersey", "wale"): (
        _ruler_reason("synth_jersey", "is spurious (+154.0%)") + "; the wale consensus is the areas' own "
        "36 px reading (right in pixels) at a 2.54x wrong scale -- before the leg gate every area's "
        "leg-lattice count was excluded as implausibly dense at that scale and the axis returned no number"
    ),
    ("ruler", "synth_jersey", "course"): _ruler_reason("synth_jersey", "is spurious (+154.0%)"),
    ("ruler", "synth_garter", "wale"): (
        _ruler_reason("synth_garter", "is spurious (+154.0%)") + "; the wale consensus is the areas' own "
        "36 px reading (right in pixels) at a 2.54x wrong scale -- before the leg gate every area's "
        "leg-lattice count was excluded as implausibly dense at that scale and the axis returned no number"
    ),
    ("ruler", "synth_garter", "course"): _ruler_reason("synth_garter", "is spurious (+154.0%)"),
    ("ruler", "synth_rib", "wale"): _ruler_reason("synth_rib", "is spurious (+306.4%)"),
    ("ruler", "synth_rib", "course"): _ruler_reason("synth_rib", "is spurious (+306.4%)"),
}

# Fixtures that get no proposed areas on calibration (a).
NO_PROPOSALS = {"knit_02": _NO_PROPOSALS, "knit_05": _NO_PROPOSALS}

# Ruler pre-fills further than RULER_SCALE_TOL_PCT from the true scale.
# On a ruler-less (synthetic) image the right answer is "no ruler".
WRONG_RULER = {
    "teal": "WRONG: '1 cm' pre-filled across points spanning ~1.95 cm (+94.6% scale)",
    "knit_02": "WRONG: '1 in' pre-filled across points spanning ~0.12 in (-88.3% scale)",
    "knit_05": "WRONG: '1 in' pre-filled across points spanning ~0.43 in (-56.6% scale)",
    "knit_06": "WRONG: '1 cm' pre-filled across points spanning ~1.75 cm (+75.2% vs the cm ruler)",
    "knit_08": "WRONG: '1 cm' pre-filled across points spanning ~5.9 cm (+486.5% scale)",
    "knit_09": "OFF: the '1 cm' label is right but the points span ~1.15 cm (+15.5% scale)",
    "synth_jersey": "SPURIOUS: a '1 cm' ruler pre-filled on an image drawn with no ruler",
    "synth_garter": "SPURIOUS: a '1 cm' ruler pre-filled on an image drawn with no ruler",
    "synth_rib": "SPURIOUS: a '1 cm' ruler pre-filled on an image drawn with no ruler",
}

# (fixture, axis) whose app-path result jumps > 25% or flips status under
# +-0.5/1/2% scale jitter around the correct scale.
JITTER_UNSTABLE = {
    ("jersey", "wale"): (
        "4.72/in at the exact scale; -2% reads 3.85 and flips to uncertain (no jump beyond 25%, but "
        "-0.5% / +0.5% / +2% read 4.19 / 4.34 / 3.85 against a true 5.00 -- an accepted count of 4-6 "
        "columns on a 250 px window outweighing the area's own periodicity reading)"
    ),
    ("knit_01", "course"): "-2%, -1% and +0.5% read ~3.9-4.0/in against 5.95; -1% and +0.5% flip to uncertain",
    ("knit_08", "course"): "stable value, but three of six jitters flip uncertain -> confident",
    ("knit_08", "wale"): "stable value (4.24-5.40/in against 4.49), but four of six jitters flip confident -> uncertain",
    ("teal", "wale"): "stable value (3.19-4.14/in against 3.74), but -2% and -0.5% flip confident -> uncertain",
}

# The headline: confident-and-wrong rows per calibration mode.
CONFIDENT_AND_WRONG = {
    "truth": [],
    "ruler": [("jersey", "wale"), ("knit_05", "wale"), ("knit_06", "course"), ("knit_06", "wale"),
              ("knit_09", "course"), ("knit_09", "wale"), ("synth_garter", "course"), ("synth_garter", "wale"),
              ("synth_jersey", "course"), ("synth_jersey", "wale"), ("synth_rib", "course"),
              ("synth_rib", "wale"), ("teal", "course"), ("teal", "wale")],
}

@pytest.fixture(scope="module")
def card():
    return ap.build_scorecard()


def _strict(reason):
    return [pytest.mark.xfail(strict=True, reason=reason)]


def _row_params():
    out = []
    for key, base in BASELINE.items():
        marks = []
        if base is None or abs(base) > ACCURACY_BAR_PCT:
            assert key in KNOWN_BEYOND_BAR, f"{key} is beyond the bar but has no diagnosis"
            marks = _strict(KNOWN_BEYOND_BAR[key])
        out.append(pytest.param(key, id="-".join(key), marks=marks))
    return out


@pytest.mark.parametrize("key", _row_params())
def test_app_path_row(card, key):
    row = card["rows"][key]
    base = BASELINE[key]
    err = row["error"]
    assert err is not None, f"{key}: no result on the app path (status {row['status']}); baseline {base}"
    if base is None or abs(base) > ACCURACY_BAR_PCT:
        assert abs(err) <= ACCURACY_BAR_PCT, f"{key}: {err:+.1f}% (status {row['status']}) -- still beyond the bar"
        return
    assert abs(err) <= abs(base) + REGRESSION_PP, (
        f"{key}: {err:+.1f}% (status {row['status']}) vs pinned {base:+.1f}% -- |error| worsened by more "
        f"than {REGRESSION_PP:g} points"
    )


def test_baseline_covers_every_scored_row(card):
    assert set(card["rows"]) == set(BASELINE), (
        f"unpinned rows: {sorted(set(card['rows']) - set(BASELINE))}; "
        f"stale baselines: {sorted(set(BASELINE) - set(card['rows']))}"
    )


@pytest.mark.parametrize("name", [
    pytest.param(f.name, marks=_strict(NO_PROPOSALS[f.name]) if f.name in NO_PROPOSALS else [])
    for f in ap.FIXTURES
])
def test_app_path_proposes_areas(card, name):
    run = card["runs"][("truth", name)]
    assert run["areas"] >= 1, f"{name}: no proposed areas -- {run['propose_message']}"
    assert run["analyzed"], f"{name}: /analyze-multi did not succeed -- {run.get('message')}"


@pytest.mark.parametrize("name", [
    pytest.param(f.name, marks=_strict(WRONG_RULER[f.name]) if f.name in WRONG_RULER else [])
    for f in ap.FIXTURES
])
def test_ruler_prefill_is_right(card, name):
    fx = ap.FIXTURES_BY_NAME[name]
    r = card["rulers"][name]
    if not fx.has_ruler:
        assert not r["success"], (
            f"{name}: no ruler in the image, but /detect-ruler pre-filled {r['suggested_distance']} "
            f"{r['suggested_unit']} ({r['scale_error_pct']:+.1f}% scale)"
        )
        return
    assert r["success"], f"{name}: the photo has a ruler and none was detected -- {r['message']}"
    assert abs(r["scale_error_pct"]) <= ap.RULER_SCALE_TOL_PCT, (
        f"{name}: pre-filled {r['suggested_distance']} {r['suggested_unit']} implies "
        f"{r['implied_ppi']:.2f} px/in against {r['true_ppi']:.2f} ({r['scale_error_pct']:+.1f}%)"
    )


@pytest.mark.parametrize("key", [
    pytest.param((f.name, a), id=f"{f.name}-{a}",
                 marks=_strict(JITTER_UNSTABLE[(f.name, a)]) if (f.name, a) in JITTER_UNSTABLE else [])
    for f in ap.FIXTURES for a in ap.AXES
])
def test_app_path_is_stable_under_scale_jitter(card, key):
    e = card["jitter"][key]
    assert not e["unstable"], f"{key}: base {e['base_per_inch']} ({e['base_status']}); unstable at {e['unstable']}"


@pytest.mark.parametrize("mode", ["truth", "ruler"])
def test_confident_and_wrong_count(card, mode):
    """The headline number, pinned exactly: it moving either way fails, so a
    fix re-pins it here and in the README on purpose."""
    got = [tuple(x) for x in card["cw"][mode]]
    assert got == sorted(CONFIDENT_AND_WRONG[mode]), (
        f"{mode}: confident-and-wrong is now {len(got)} {got}; pinned {len(CONFIDENT_AND_WRONG[mode])}"
    )


def test_readme_carries_the_generated_table(card):
    path = os.path.join(os.path.dirname(__file__), "..", "README.md")
    with open(path, encoding="utf-8") as fh:
        text = fh.read()
    assert ap.README_BEGIN in text and ap.README_END in text, "README is missing the app-path block markers"
    block = text[text.index(ap.README_BEGIN): text.index(ap.README_END) + len(ap.README_END)]
    assert block == ap.readme_block(card), (
        "README's app-path table is stale -- run `python tests/app_path_scorecard.py --write-readme`"
    )
