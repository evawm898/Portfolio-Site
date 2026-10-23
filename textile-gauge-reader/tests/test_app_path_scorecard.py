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

RE-PINNED 2026-10-22 for the consensus loop-count gate as RULED (README:
"Consensus loop-count override: the count may corroborate, never override
by a harmonic" -- variant B, a corroborating count supplies confidence
only and the area's own periodicity reading is always the value voted).
On (a): jersey W -5.5, knit_09 W -0.9, synth_jersey W +0.2, synth_garter W
+0.0, knit_06 W -4.3, and teal W -11.0 confident -- the one confident-and-
wrong row left, ACCEPTED BY EVA'S RULING for this PR (teal's own periodicity
is -12% on every area at every scale) and kept here as a strict xfail
labelled known confident-and-wrong, the target of the next PR (the count's
precision on small windows). Three calibration-(b) wale rows that used to
return no number or a coincidentally right one now carry the ruler's own
error, confident; each is explained in KNOWN_BEYOND_BAR.

RE-PINNED 2026-10-22 for the calibration guardrail (README: "Calibration guardrail"):
/detect-ruler now offers a pre-fill only when justify_ruler_calibration can show the
span is one unit of the ruler's own tick comb, and mode (b) is "accept the pre-fill if
one is offered, else calibrate by hand, correctly". (b)'s confident-and-wrong axes go
13 -> 1 (teal W, the same row as (a)); jersey and knit_01 keep their pre-fill; the three
'ruler-detector error' strict xfails from #441 are regular tests. The old as-is numbers
are in the PR report; mode (a), the jitter table and every census above are unchanged.

RE-PINNED 2026-10-23 for the two phone-resolution mechanisms (README: "Phone-resolution
photos: the ROI proposer at one working resolution, and the course loop-center pitch may
corroborate, never override by a harmonic"). The proposer works on a copy downsampled to
180 px/in and maps the areas back, so knit_02 and knit_05 get areas (were none); the
course axis's loop-center pitch may corroborate a candidate within the family's own ~1.4x
tolerance and never pull the pick to a harmonic it does not match (knit_05 C read +87.3%
confident on the proposer alone, -5.8% here). Confident-and-wrong stays 1 (teal W) on (a)
and (b). knit_01 C at the exact scale is -30.2% uncertain (the proposer's third area reads
a doubled course seed; see KNOWN_BEYOND_BAR). The resolution-invariance rows are pinned
below for the first time; knit_02 at 2x is the one deferred disagreement (RESOLUTION_DISAGREE).
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
    ("truth", "jersey", "course"): -6.4,
    ("truth", "jersey", "wale"): -5.5,
    ("truth", "knit_01", "course"): -30.2,
    ("truth", "knit_01", "wale"): -1.9,
    ("truth", "knit_02", "wale"): -2.4,
    ("truth", "knit_05", "course"): -5.8,
    ("truth", "knit_05", "wale"): 2.4,
    ("truth", "knit_06", "course"): 2.0,
    ("truth", "knit_06", "wale"): -4.3,
    ("truth", "knit_08", "course"): -2.3,
    ("truth", "knit_08", "wale"): 4.5,
    ("truth", "knit_09", "course"): -0.9,
    ("truth", "knit_09", "wale"): -2.5,
    ("truth", "synth_garter", "course"): 0.1,
    ("truth", "synth_garter", "wale"): 0.0,
    ("truth", "synth_jersey", "course"): 0.1,
    ("truth", "synth_jersey", "wale"): 0.2,
    ("truth", "synth_rib", "course"): 0.1,
    ("truth", "synth_rib", "wale"): 0.0,
    ("truth", "teal", "course"): -0.6,
    ("truth", "teal", "wale"): -13.0,
    # (b) the pre-fill accepted if offered, else a correct manual calibration
    ("ruler", "jersey", "course"): -6.7,
    ("ruler", "jersey", "wale"): -6.2,
    ("ruler", "knit_01", "course"): 4.7,
    ("ruler", "knit_01", "wale"): 2.8,
    ("ruler", "knit_02", "wale"): -2.4,
    ("ruler", "knit_05", "course"): -5.8,
    ("ruler", "knit_05", "wale"): 2.4,
    ("ruler", "knit_06", "course"): 2.0,
    ("ruler", "knit_06", "wale"): -4.3,
    ("ruler", "knit_08", "course"): -2.3,
    ("ruler", "knit_08", "wale"): 4.5,
    ("ruler", "knit_09", "course"): -0.9,
    ("ruler", "knit_09", "wale"): -2.5,
    ("ruler", "synth_garter", "course"): 0.1,
    ("ruler", "synth_garter", "wale"): 0.0,
    ("ruler", "synth_jersey", "course"): 0.1,
    ("ruler", "synth_jersey", "wale"): 0.2,
    ("ruler", "synth_rib", "course"): 0.1,
    ("ruler", "synth_rib", "wale"): 0.0,
    ("ruler", "teal", "course"): -0.6,
    ("ruler", "teal", "wale"): -13.0,
}

_LEG_GATE = (
    "the per-area periodicity reads the truth and the loop-lattice count reads the stitch-leg "
    "half-period; the count is now rejected when it disagrees with the area's own reading across a "
    "harmonic (README: 'Consensus loop-count override: the count may corroborate, never override by "
    "a harmonic')"
)
# Why every beyond-bar row is beyond it.
KNOWN_BEYOND_BAR = {
    ("truth", "knit_01", "course"): (
        "-30.2% UNCERTAIN: the working-resolution proposer places three 1.5-inch areas; area B's course "
        "seed is the two-row period (235 px against a 58.4 px truth; its half-lag is anti-correlated, so the "
        "sub-repeat test cannot descend it), its 39 px loop-center pitch matches no candidate and is set aside, "
        "and the consensus of 54.5 / 241 / 83.7 px is flagged uncertain. At -1% / -0.5% / +0.5% / +1% scale the "
        "windows move and the row reads 5.6-5.9/in confident (JITTER_UNSTABLE). On main (two areas) it read "
        "+4.3% confident; on the proposer commit alone the same -30.2% uncertain."
    ),
}

# Rows pinned as KNOWN CONFIDENT-AND-WRONG by ruling: still "confident"
# with |error| > CONFIDENT_WRONG_PCT (those inside the 20% bar are also
# guarded against regression by test_app_path_row like any other row;
# those beyond it are strict xfails there too, with their diagnosis in
# KNOWN_BEYOND_BAR). Each is a
# strict xfail on test_known_confident_and_wrong_row_is_fixed: the day a
# change takes the row inside 10% or flags it uncertain, it XPASSes and
# the entry has to come off on purpose, together with its line in
# CONFIDENT_AND_WRONG below.
KNOWN_CONFIDENT_AND_WRONG = {
    ("truth", "teal", "wale"): (
        "-11.0% CONFIDENT -- KNOWN CONFIDENT-AND-WRONG, ACCEPTED BY EVA'S RULING on the loop-count gate "
        "(variant B) and the target of the next PR: teal's own wale periodicity reads 75-80 px against a "
        "68.2 px truth on every proposed area at every scale (the pinned-crop scorecard reads -12.4%), and "
        "only a count's VALUE ever put it inside 10%; under the ruling a corroborating count supplies "
        "confidence, never the value. Within 15% at all seven scales (ruling condition 2)."
    ),
    ("ruler", "teal", "wale"): (
        "the same row as (a): no ruler pre-fill is offered on teal, so the user calibrates by hand and reads "
        "exactly (a)'s -11.0% confident. Calibration adds nothing to it (test_calibration_adds_no_confident_and_wrong_rows)."
    ),
}

# Rows that were pinned here as KNOWN CONFIDENT-AND-WRONG "ruler-detector errors, target of the calibration PR"
# and are now REGULAR tests (test_ruler_error_rows_are_no_longer_confident_and_wrong): the pre-fill that put
# them there is no longer offered.
RULER_DETECTOR_ERROR_ROWS = [
    ("ruler", "knit_05", "wale"),
    ("ruler", "synth_jersey", "wale"),
    ("ruler", "synth_garter", "wale"),
]

# Fixtures that get no proposed areas on calibration (a): none since the proposer works at
# one working resolution (knit_02 at 1187 px/in and knit_05 at 320 px/in were the two).
NO_PROPOSALS: dict = {}

# Photos WITH a ruler that are offered NO pre-fill (calibration guardrail,
# analysis.gauge_analysis.justify_ruler_calibration). Withholding is safe -- the user
# calibrates by hand -- but it is a miss, so each is a strict xfail on "a photo with a
# ruler gets a correct pre-fill": the day the detector reads one of these rulers
# correctly it XPASSes and the entry has to come off on purpose. Before the guardrail
# every one of these was pre-filled WRONG, and the three synthetics (no ruler drawn)
# were pre-filled with a ruler.
WITHHELD_RULER = {
    "teal": "was '1 cm' across ~1.95 cm (+94.6% scale): the detector read the needle-size gauge's numerals, not a ruler",
    "knit_02": "was '1 in' across ~0.12 in (-88.3% scale): real tape, but both points one tick apart",
    "knit_05": "was '1 in' across ~0.43 in (-56.6% scale): the detector read stitch peaks on the fabric's top edge",
    "knit_06": "was '1 cm' across ~1.75 cm (+75.2% scale): the detector read stitches, not either printed border ruler",
    "knit_08": "was '1 cm' across ~5.9 cm (+486.5% scale): an inch ruler, read at its half-inch ticks and labelled cm",
    "knit_09": "was '1 cm' across ~1.15 cm (+15.5% scale): the detector read the fabric's lower edge, not the vertical tape",
}
# Photos whose correct pre-fill the guardrail must KEEP.
KEPT_PREFILL = ("jersey", "knit_01")

# (fixture, axis) whose app-path result jumps > 25% or flips status under
# +-0.5/1/2% scale jitter around the correct scale.
JITTER_UNSTABLE = {
    ("knit_01", "course"): (
        "the exact scale reads 3.98/in uncertain (KNOWN_BEYOND_BAR); -1%, -0.5%, +0.5% and +1% move the "
        "proposer's windows and read 5.6-5.9/in confident (+31% to +42% on the unjittered value, and a status "
        "flip). The jittered readings are the right ones; the knife edge is the proposer's placement."
    ),
}

# The headline: confident-and-wrong rows per calibration mode.
CONFIDENT_AND_WRONG = {
    "truth": [("teal", "wale")],
    "ruler": [("teal", "wale")],
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


@pytest.mark.parametrize("key", [
    pytest.param(key, id="-".join(key), marks=_strict(reason)) for key, reason in KNOWN_CONFIDENT_AND_WRONG.items()
])
def test_known_confident_and_wrong_row_is_fixed(card, key):
    row = card["rows"][key]
    assert not ap.confident_and_wrong(row), (
        f"{key}: {row['error']:+.1f}% (status {row['status']}) -- still confident-and-wrong"
    )


def test_known_confident_and_wrong_rows_are_in_the_headline_list():
    for (mode, name, axis) in KNOWN_CONFIDENT_AND_WRONG:
        assert (name, axis) in CONFIDENT_AND_WRONG[mode], f"{(mode, name, axis)} is pinned as known but missing from CONFIDENT_AND_WRONG"


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
    pytest.param(f.name, marks=_strict(WITHHELD_RULER[f.name]) if f.name in WITHHELD_RULER else [])
    for f in ap.FIXTURES
])
def test_ruler_prefill_is_right(card, name):
    """A photo with a ruler is offered a pre-fill within 5% of the true scale; a photo
    without one is offered nothing. (Withheld rulers are strict xfails, see WITHHELD_RULER.)"""
    fx = ap.FIXTURES_BY_NAME[name]
    r = card["rulers"][name]
    if not fx.has_ruler:
        assert not r["success"], (
            f"{name}: no ruler in the image, but /detect-ruler pre-filled {r['suggested_distance']} "
            f"{r['suggested_unit']} ({r['scale_error_pct']:+.1f}% scale)"
        )
        return
    assert r["success"], f"{name}: the photo has a ruler and no pre-fill was offered -- {r.get('declined_reason') or r['message']}"
    assert abs(r["scale_error_pct"]) <= ap.RULER_SCALE_TOL_PCT, (
        f"{name}: pre-filled {r['suggested_distance']} {r['suggested_unit']} implies "
        f"{r['implied_ppi']:.2f} px/in against {r['true_ppi']:.2f} ({r['scale_error_pct']:+.1f}%)"
    )


@pytest.mark.parametrize("name", [f.name for f in ap.FIXTURES])
def test_no_wrong_prefill_is_ever_offered(card, name):
    """The guardrail's one promise: whatever is offered is right. A refusal is allowed
    (the user calibrates by hand); a pre-fill beyond the tolerance, or on a photo drawn
    without a ruler, is not."""
    fx = ap.FIXTURES_BY_NAME[name]
    r = card["rulers"][name]
    if not r["success"]:
        return
    assert fx.has_ruler, f"{name}: a ruler was pre-filled on a photo that has none"
    assert abs(r["scale_error_pct"]) <= ap.RULER_SCALE_TOL_PCT, (
        f"{name}: pre-fill {r['suggested_distance']} {r['suggested_unit']} is {r['scale_error_pct']:+.1f}% off"
    )


@pytest.mark.parametrize("name", KEPT_PREFILL)
def test_correct_prefill_is_kept(card, name):
    """The guardrail must not take a correct pre-fill away (jersey and knit_01 are the two
    the detector gets right), and must say in plain words what it assumed."""
    r = card["rulers"][name]
    assert r["success"], f"{name}: the guardrail removed a correct pre-fill -- {r.get('declined_reason') or r['message']}"
    assert abs(r["scale_error_pct"]) <= ap.RULER_SCALE_TOL_PCT
    assert r["assumption"].startswith(f"Read as 1 {'inch' if r['suggested_unit'] == 'in' else r['suggested_unit']} between")


@pytest.mark.parametrize("key", RULER_DETECTOR_ERROR_ROWS, ids=lambda k: "-".join(k))
def test_ruler_error_rows_are_no_longer_confident_and_wrong(card, key):
    """The three calibration-(b) rows #441 pinned as strict xfails ('ruler-detector error'):
    a spurious or wrong pre-fill put a confident wrong number on them. With the pre-fill
    withheld they are ordinary rows."""
    row = card["rows"][key]
    assert not ap.confident_and_wrong(row), f"{key}: {row['error']} (status {row['status']}) -- still confident-and-wrong"


def test_calibration_adds_no_confident_and_wrong_rows(card):
    """Every confident-and-wrong axis under (b) is also confident-and-wrong under (a): the
    pre-fill never puts one there."""
    added = sorted(set(card["cw"]["ruler"]) - set(card["cw"]["truth"]))
    assert not added, f"calibration added confident-and-wrong rows: {added}"


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


# --- Resolution invariance (0.5x / 1x / 2x of each photo's own resolution) ----------------

# (fixture, axis) whose readings at the three resolutions disagree by more than
# RESOLUTION_AGREE_PCT with every status confident, or that lose a measurement at one
# resolution. Strict xfails: the day one agrees, the entry has to come off on purpose.
RESOLUTION_DISAGREE = {
    ("knit_02", "wale"): (
        "high px/in, deferred: at 2x (2374 px/in) every area reads an 8 px period on both axes at autocorrelation "
        "strength 0.76-0.82 -- an image-wide 4 px sensor/ISP grid (present in fabric and non-fabric windows alike, "
        "not the re-encode: PNG, JPEG q95 and q75 and no re-encode all read it) that the fixed 3 px smoothing "
        "suppresses at 1x and the upscale moves to 8 px, where it is the crop's strongest periodicity; the wale "
        "consensus is then empty. Analysis-side resolution normalisation is its own decision (README)."
    ),
    ("knit_02", "course"): (
        "high px/in, deferred: no course truth, and at 2x the areas read the 8 px grid above (a 4985% spread "
        "against the ~200 px readings at 0.5x and 1x)."
    ),
    ("knit_08", "course"): (
        "11.8% spread, all confident (7.33 / 6.74 / 6.56 per inch at 0.5x / 1x / 2x against 6.90), inherited from "
        "the working-resolution proposer's placement (main read 4 / 4 / 1 areas and a 5.6% spread; the proposer "
        "commit alone reads this row identically). Every resolution is inside 10% of the truth."
    ),
}

# Confident-and-wrong at some resolution, pinned exactly (fixture, scale, axis).
RESOLUTION_CONFIDENT_AND_WRONG = [
    ("knit_08", 2.0, "wale"),   # +10.1% confident at 2x, inherited from the proposer's placement (the proposer commit alone reads it identically)
    ("teal", 0.5, "wale"),      # teal W's accepted -11..-14% (KNOWN_CONFIDENT_AND_WRONG), at every resolution
    ("teal", 1.0, "wale"),
    ("teal", 2.0, "wale"),
]


@pytest.mark.parametrize("name", [f.name for f in ap.FIXTURES])
def test_every_fixture_is_proposed_at_every_resolution(card, name):
    res = card["resolution"]
    for sc in ap.RESOLUTION_SCALES:
        assert res["areas"][(name, sc)] >= 1, f"{name} at {sc:g}x: no proposed areas"


@pytest.mark.parametrize("key", [
    pytest.param((f.name, a), id=f"{f.name}-{a}",
                 marks=_strict(RESOLUTION_DISAGREE[(f.name, a)]) if (f.name, a) in RESOLUTION_DISAGREE else [])
    for f in ap.FIXTURES for a in ap.AXES
])
def test_readings_agree_across_resolutions(card, key):
    """The same photo at 0.5x / 1x / 2x reads within RESOLUTION_AGREE_PCT, or says it does not
    (at least one resolution flagged uncertain). A confident reading that moves with the
    photo's pixel count is the failure this exists to catch."""
    a = card["resolution"]["agree"][key]
    assert a["spread_pct"] is not None, f"{key}: a measurement is missing at some resolution"
    assert a["ok"], f"{key}: readings spread {a['spread_pct']:.1f}% across resolutions, every status confident"


def test_resolution_confident_and_wrong_is_pinned_exactly(card):
    got = sorted(tuple(x) for x in card["resolution"]["cw"])
    assert got == sorted(RESOLUTION_CONFIDENT_AND_WRONG), (
        f"confident-and-wrong at some resolution is now {got}; pinned {sorted(RESOLUTION_CONFIDENT_AND_WRONG)}"
    )
