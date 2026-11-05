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

RE-PINNED 2026-11-05 for analysis at one working resolution (README: "Analysis at one working
resolution"): every area is analysed on a 180 px/in copy, so 1x and 2x read identically on every photo
finer than that; knit_08's two "proposer placement at 2x" pins passed and came off; knit_01 C (a) came
inside the bar (+7.5% uncertain, a regular test); knit_02 W is +12.5% confident on four-stitch windows
and is pinned as KNOWN CONFIDENT-AND-WRONG by Eva's ruling (counts 2 / 2).

RE-PINNED 2026-11-05 for the consensus status roll-up (README: "Consensus status respects each area's own
doubt"): the consensus is "confident" only when more than half of the areas whose readings it combines are
individually confident (one area: its own status). STATUS ONLY -- every spacing, per-inch value, confidence,
area and overlay is unchanged (compared field by field over 101 /analyze-multi responses). Confident-and-wrong
goes 2 / 2 -> 0 / 0 on (a) / (b) (teal W and knit_02 W now say uncertain, values still -13.4% and +12.5%), 5 -> 0
across the resolution rows. THE COST, recorded rather than hidden: wale statuses on the app path read uncertain
almost everywhere (the per-area wale detector flags uncertain on 9 of 11 fixtures even when right), so
confident-and-within-10% on (a) goes 18 -> 12 of 19, and on the wale axis 9 -> 3 of 9; and the consensus now
inherits per-area status flicker under scale jitter: status flips 5 -> 8 (synth_garter W and synth_rib W join
knit_01 C as jitter-unstable). That increase broke the "flips must not increase" criterion and was ACCEPTED BY
EVA'S RULING (Nov 5): status-only flickers on exact readings, failing safe; the two new entries stay pinned in
JITTER_UNSTABLE below.

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
    ('truth', 'jersey', 'course'): -6.4,
    ('truth', 'jersey', 'wale'): -5.5,
    ('truth', 'knit_01', 'course'): 7.5,
    ('truth', 'knit_01', 'wale'): 0.7,
    ('truth', 'knit_02', 'wale'): 12.5,
    ('truth', 'knit_05', 'course'): -8.3,
    ('truth', 'knit_05', 'wale'): 2.1,
    ('truth', 'knit_06', 'course'): -1.5,
    ('truth', 'knit_06', 'wale'): -4.2,
    ('truth', 'knit_08', 'course'): -2.2,
    ('truth', 'knit_08', 'wale'): 4.8,
    ('truth', 'knit_09', 'course'): -1.0,
    ('truth', 'knit_09', 'wale'): -1.9,
    ('truth', 'synth_garter', 'course'): 0.1,
    ('truth', 'synth_garter', 'wale'): 0.0,
    ('truth', 'synth_jersey', 'course'): 0.1,
    ('truth', 'synth_jersey', 'wale'): 0.2,
    ('truth', 'synth_rib', 'course'): 0.1,
    ('truth', 'synth_rib', 'wale'): 0.0,
    ('truth', 'teal', 'course'): -0.7,
    ('truth', 'teal', 'wale'): -13.4,
    # (b) the pre-fill accepted if offered, else a correct manual calibration
    ('ruler', 'jersey', 'course'): -6.7,
    ('ruler', 'jersey', 'wale'): -6.2,
    ('ruler', 'knit_01', 'course'): 2.2,
    ('ruler', 'knit_01', 'wale'): 7.6,
    ('ruler', 'knit_02', 'wale'): 12.5,
    ('ruler', 'knit_05', 'course'): -8.3,
    ('ruler', 'knit_05', 'wale'): 2.1,
    ('ruler', 'knit_06', 'course'): -1.5,
    ('ruler', 'knit_06', 'wale'): -4.2,
    ('ruler', 'knit_08', 'course'): -2.2,
    ('ruler', 'knit_08', 'wale'): 4.8,
    ('ruler', 'knit_09', 'course'): -1.0,
    ('ruler', 'knit_09', 'wale'): -1.9,
    ('ruler', 'synth_garter', 'course'): 0.1,
    ('ruler', 'synth_garter', 'wale'): 0.0,
    ('ruler', 'synth_jersey', 'course'): 0.1,
    ('ruler', 'synth_jersey', 'wale'): 0.2,
    ('ruler', 'synth_rib', 'course'): 0.1,
    ('ruler', 'synth_rib', 'wale'): 0.0,
    ('ruler', 'teal', 'course'): -0.7,
    ('ruler', 'teal', 'wale'): -13.4,
}

_LEG_GATE = (
    "the per-area periodicity reads the truth and the loop-lattice count reads the stitch-leg "
    "half-period; the count is now rejected when it disagrees with the area's own reading across a "
    "harmonic (README: 'Consensus loop-count override: the count may corroborate, never override by "
    "a harmonic')"
)
# Why every beyond-bar row is beyond it.
# Why every beyond-bar row is beyond it: none at present. knit_01 C (a) came inside the bar
# (+7.5% uncertain) once each area is analysed at the working resolution (README: "Analysis at one
# working resolution"); its jitter entry stands.
KNOWN_BEYOND_BAR: dict = {}

# Rows accepted as KNOWN CONFIDENT-AND-WRONG by ruling (status "confident", |error| >
# CONFIDENT_WRONG_PCT): none. There were four until the consensus status rolled up the areas' own doubt;
# they are FORMER_CONFIDENT_AND_WRONG below. An entry here would be a strict xfail on a row-fixed test with
# its diagnosis, and would have to be listed in CONFIDENT_AND_WRONG as well.
KNOWN_CONFIDENT_AND_WRONG: dict = {}

# The four rows that WERE pinned above, as strict xfails, until the consensus status rolled up the areas'
# own doubt (README: "Consensus status respects each area's own doubt"): teal W -13.4% and knit_02 W +12.5%,
# on (a) and on (b) (no ruler pre-fill is offered on either photo, so (b) reads (a)'s run). Every area of
# each reads individually uncertain; the consensus used to call that "confident". They are REGULAR tests now:
# the reading is unchanged (still beyond 10% -- this change moves no measured value) and the status says so.
FORMER_CONFIDENT_AND_WRONG = [
    ("truth", "teal", "wale"),
    ("ruler", "teal", "wale"),
    ("truth", "knit_02", "wale"),
    ("ruler", "knit_02", "wale"),
]

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

JITTER_UNSTABLE[("synth_garter", "wale")] = (
    "status flips under jitter since the consensus status rolls up the areas' own doubt: all three areas read "
    "uncertain from -2% to +1% (consensus uncertain, as at the exact scale) and at +2% the proposer places two "
    "areas that are both confident (consensus confident). The reading is 0.0 +-3% throughout; only the verdict "
    "follows the per-area flicker. One of the three flips accepted by Eva's ruling (Nov 5)."
)
JITTER_UNSTABLE[("synth_rib", "wale")] = (
    "status flips under jitter since the consensus status rolls up the areas' own doubt: at the exact scale two "
    "of three areas are confident (consensus confident); at -2% and -1% only one is (uncertain). The reading is "
    "0.0 +-2% throughout; only the verdict follows the per-area flicker. Two of the three flips accepted by "
    "Eva's ruling (Nov 5)."
)

# The headline: confident-and-wrong rows per calibration mode.
CONFIDENT_AND_WRONG: dict = {"truth": [], "ruler": []}

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


def test_no_row_is_a_known_confident_and_wrong_exception(card):
    """KNOWN_CONFIDENT_AND_WRONG is empty: a confident-and-wrong row is never an accepted exception any more.
    A future ruling that accepts one adds it to the dict (and the headline list below) with its diagnosis, and
    restores a strict xfail for it; until then every row in the card must pass this."""
    assert not KNOWN_CONFIDENT_AND_WRONG
    bad = sorted(k for k, r in card["rows"].items() if ap.confident_and_wrong(r))
    assert not bad, f"confident-and-wrong rows: {bad}"


def test_known_confident_and_wrong_rows_are_in_the_headline_list():
    for (mode, name, axis) in KNOWN_CONFIDENT_AND_WRONG:
        assert (name, axis) in CONFIDENT_AND_WRONG[mode], f"{(mode, name, axis)} is pinned as known but missing from CONFIDENT_AND_WRONG"


@pytest.mark.parametrize("key", FORMER_CONFIDENT_AND_WRONG, ids=lambda k: "-".join(k))
def test_former_confident_and_wrong_rows_now_say_uncertain(card, key):
    """teal W and knit_02 W: every area uncertain, so the consensus is uncertain. The READING is the same
    reading (this change moves no measured value): still beyond 10%, now honestly labelled."""
    row = card["rows"][key]
    assert row["status"] == "uncertain", f"{key}: status {row['status']} (areas {row['area_status']})"
    assert row["error"] is not None and abs(row["error"]) > ap.CONFIDENT_WRONG_PCT, (
        f"{key}: {row['error']} -- the reading moved; the roll-up must change the status only"
    )
    assert not ap.confident_and_wrong(row)


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
RESOLUTION_DISAGREE: dict = {}  # knit_02 W's entry came off: its 4.03 / 4.50 / 4.50 readings are now flagged uncertain

# Confident-and-wrong at some resolution, pinned exactly (fixture, scale, axis).
RESOLUTION_CONFIDENT_AND_WRONG: list = []  # was five (knit_02 W at 1x/2x, teal W at 0.5x/1x/2x) until the status roll-up


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
