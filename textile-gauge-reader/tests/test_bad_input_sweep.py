"""
The bad-input sweep, pinned: what the app says when the input is bad, graded on every PR.

The measurement lives in tests/bad_input_sweep.py (read its docstring first); the verify-by-counting
simulation, which has its own file, is in tests/test_verify_simulation.py. This file pins what the sweep
produces, so the PR that fixes a failure has to take its pin off on purpose.

The contract:

  * Every confident-and-wrong cell (status "confident", |error| > 10%) is a STRICT xfail, labelled by cause
    ("<AXIS> | <reason>"), per calibration mode. The moment a change fixes one it XPASSes, the strict mark fails
    CI, and the entry comes off here on purpose. A confident-and-wrong cell that is NOT listed fails
    (test_no_unpinned_silent_cell): a regression is loud.
  * COURSE cells are labelled COURSE in the cause, and every course cell is the same kind of failure -- the course
    axis says "confident" on a reading that is wrong, while the card only avoids showing it because the WALE axis
    says uncertain. Restoring wale confidence without fixing these would make most of them card-silent. They are
    the next PR's target; the labels are how it finds them.
  * The CARD-silent runs (the card says Confident and some axis is more than 10% off) are strict xfails too.
  * Non-knit images: a confident axis is silent, a Confident card is card-silent; both pinned, strict.
  * The headline totals (axes, silent, card-silent, no result, uncertain-but-right) are pinned exactly per mode: a
    move either way fails, so a fix re-pins it here and in the README on purpose.
  * The README's generated sweep block must be byte-identical to what a full run generates
    (`python tests/bad_input_sweep.py --write-readme` regenerates it).

CI RUNTIME. The full sweep is about 2.5 minutes serial and added 3.6-4.5 minutes to the job on a GitHub runner, so
under CI (the `CI` environment variable) the representative subset runs by default (`TGR_BAD_INPUT_SUBSET=1` asks
for it anywhere, `TGR_BAD_INPUT_FULL=1` forces the full sweep): the pinned cells outside it are skipped and the
total / README-block tests are skipped, because they describe the full sweep. The subset keeps a witness of every
cause label (asserted below), and a cheap always-on test checks the README headline against the pinned totals.
"""
from __future__ import annotations

import importlib.util
import os

import cv2
import numpy as np
import pytest

import app_path_scorecard as ap
import bad_input_sweep as bis

SUBSET_MODE = bis.subset_requested()

# RE-PINNED 2026-11-05 for wale-direction detection (README: "Wale direction is detected"): the `rot90_default`
# row is `rot90_detected` now (the user takes the orientation the page pre-selects) and its eleven silent cells
# and knit_06's card-silent run come off; totals move by exactly those (silent 38 -> 27 / 37 -> 26, card-silent
# 4 -> 3, uncertain-but-right 99 -> 107 / 98 -> 107); no other pin moved (every other row byte-identical).
# Pinned 2026-11-05 against main c0e0073 (the consensus status roll-up, #500, is in). Per calibration mode,
# cause -> [(fixture, input, axis)]. Generated from a full run; re-pin with the README block.
KNOWN_SILENT = {
    'truth': {
        'COURSE | blur flicker (status flips to confident under blur)': [
            ('knit_01', 'blur4+box', 'course'),
        ],
        'COURSE | contaminated hand-drawn box (ruler / pins / swatch edge)': [
            ('knit_08', 'box_ruler', 'course'),
            ('knit_09', 'box_ruler', 'course'),
            ('teal', 'box_pins', 'course'),
            ('teal', 'box_ruler', 'course'),
        ],
        'COURSE | hand-drawn box on a degraded photo (low light / 4000 px)': [
            ('jersey', 'lowlight+box', 'course'),
            ('knit_01', 'big4000+box', 'course'),
            ('knit_05', 'lowlight+box', 'course'),
        ],
        'COURSE | rotated 15 degrees': [
            ('jersey', 'rot15+box', 'course'),
            ('knit_01', 'rot15+box', 'course'),
            ('knit_05', 'rot15', 'course'),
            ('knit_08', 'rot15', 'course'),
            ('knit_08', 'rot15+box', 'course'),
            ('synth_garter', 'rot15', 'course'),
            ('synth_garter', 'rot15+box', 'course'),
        ],
        'COURSE | small hand-drawn box': [
            ('knit_05', 'box_small', 'course'),
            ('teal', 'box_small', 'course'),
        ],
        'COURSE | stretched photo (one calibration cannot serve both axes)': [
            ('jersey', 'stretch13', 'course'),
            ('knit_01', 'stretch13', 'course'),
            ('knit_06', 'stretch13', 'course'),
            ('knit_08', 'stretch13', 'course'),
            ('knit_09', 'stretch13', 'course'),
            ('synth_garter', 'stretch13', 'course'),
            ('synth_jersey', 'stretch13', 'course'),
            ('teal', 'stretch13', 'course'),
        ],
        'WALE | blur flicker (status flips to confident under blur)': [
            ('teal', 'blur4', 'wale'),
            ('teal', 'blur4+box', 'wale'),
        ],
    },
    'ruler': {
        'COURSE | blur flicker (status flips to confident under blur)': [
            ('knit_01', 'blur4+box', 'course'),
        ],
        'COURSE | contaminated hand-drawn box (ruler / pins / swatch edge)': [
            ('knit_08', 'box_ruler', 'course'),
            ('knit_09', 'box_ruler', 'course'),
            ('teal', 'box_pins', 'course'),
            ('teal', 'box_ruler', 'course'),
        ],
        'COURSE | hand-drawn box on a degraded photo (low light / 4000 px)': [
            ('jersey', 'lowlight+box', 'course'),
            ('knit_01', 'big4000+box', 'course'),
            ('knit_05', 'lowlight+box', 'course'),
        ],
        'COURSE | rotated 15 degrees': [
            ('jersey', 'rot15+box', 'course'),
            ('knit_01', 'rot15+box', 'course'),
            ('knit_05', 'rot15', 'course'),
            ('knit_08', 'rot15', 'course'),
            ('knit_08', 'rot15+box', 'course'),
            ('synth_garter', 'rot15', 'course'),
            ('synth_garter', 'rot15+box', 'course'),
        ],
        'COURSE | small hand-drawn box': [
            ('knit_05', 'box_small', 'course'),
            ('teal', 'box_small', 'course'),
        ],
        'COURSE | stretched photo (one calibration cannot serve both axes)': [
            ('jersey', 'stretch13', 'course'),
            ('knit_06', 'stretch13', 'course'),
            ('knit_08', 'stretch13', 'course'),
            ('knit_09', 'stretch13', 'course'),
            ('synth_garter', 'stretch13', 'course'),
            ('synth_jersey', 'stretch13', 'course'),
            ('teal', 'stretch13', 'course'),
        ],
        'WALE | blur flicker (status flips to confident under blur)': [
            ('teal', 'blur4', 'wale'),
            ('teal', 'blur4+box', 'wale'),
        ],
    },
}

# Runs whose CARD says Confident while some scored axis is more than 10% off. Both calibration modes agree.
KNOWN_CARD_SILENT = {
    "truth": [("knit_09", "stretch13"), ("teal", "blur4"), ("teal", "blur4+box")],
    "ruler": [("knit_09", "stretch13"), ("teal", "blur4"), ("teal", "blur4+box")],
}
CARD_SILENT_WHY = {
    ("knit_09", "stretch13"): "stretched 1.3x: wale is right and confident, the course axis (+30%) is confident too",
    ("teal", "blur4"): "blur sigma 4: teal's wale (-13.7%, uncertain on the sharp photo) flips to confident",
    ("teal", "blur4+box"): "the same flip on a hand-drawn box",
}

# Non-knit images (nothing here is a knit, so any number is wrong): confident axes and Confident cards.
KNOWN_NONKNIT_CONFIDENT_AXES = [
    ("brick_wall", "box", "course"),
    ("checkerboard", "box", "course"),
    ("corduroy", "auto", "wale"),
    ("gingham_woven", "box", "course"),
    ("gingham_woven", "box", "wale"),
    ("random_noise", "box", "course"),
    ("repo_pigment_swatches", "box", "course"),
    ("text_lines", "box", "course"),
    ("window_blinds", "box", "course"),
    ("wood_grain", "auto", "course"),
]
KNOWN_NONKNIT_CARD_CONFIDENT = [("gingham_woven", "box")]

# The headline totals of the full sweep, per calibration mode.
PINNED_TOTALS = {
    "truth": {"n": 447, "runs": 234, "silent": 27, "card_silent": 3, "no-result": 96, "uncertain-right": 107},
    "ruler": {"n": 447, "runs": 234, "silent": 26, "card_silent": 3, "no-result": 94, "uncertain-right": 107},
}
PINNED_NONKNIT = {"runs": 26, "no_result": 17, "confident_axes": 10, "card_confident": 1}


def _strict(reason):
    return [pytest.mark.xfail(strict=True, reason=reason)]


@pytest.fixture(scope="module")
def sweep():
    return bis.build_sweep(subset=SUBSET_MODE)


def _in_scope(fixture, inp):
    return not SUBSET_MODE or (fixture in bis.SUBSET_FIXTURES and inp in bis.SUBSET_INPUTS)


def _pinned_cells():
    out = []
    for mode, by_cause in KNOWN_SILENT.items():
        for cause, cells in by_cause.items():
            for (fixture, inp, axis) in cells:
                out.append((mode, cause, fixture, inp, axis))
    return out


# --- The inputs are what they claim (no API) ---------------------------------------------------------------------


def _marker_pixels(img, roi):
    """Pixels of knit_01's red marker yarn (strong red, little green or blue) inside a box."""
    crop = img[roi["y"]:roi["y"] + roi["height"], roi["x"]:roi["x"] + roi["width"]].astype(int)
    b, g, r = crop[:, :, 0], crop[:, :, 1], crop[:, :, 2]
    return int(((r > 150) & (g < 90) & (b < 90)).sum())


@pytest.mark.parametrize("variant", ["box_good", "box_small", "box_pins"])
def test_knit_01_box_is_off_the_red_marker_yarn(variant):
    """The first audit's centre box lay on knit_01's red marker yarn (course -48%). Pins are drawn red, so the
    pinned box is judged on the clean photo."""
    made = bis.make_input("knit_01", variant)
    clean = cv2.imdecode(np.frombuffer(ap.upload_for("knit_01")[1], np.uint8), cv2.IMREAD_COLOR)
    assert _marker_pixels(clean, made.roi) == 0, f"{variant}: the box holds marker yarn"


def test_the_old_knit_01_centre_does_hold_the_marker():
    """The control: the check above can fail. A box centred on the photo (the old centre) is full of marker."""
    clean = cv2.imdecode(np.frombuffer(ap.upload_for("knit_01")[1], np.uint8), cv2.IMREAD_COLOR)
    h, w = clean.shape[:2]
    roi = bis._square_roi(clean, w / 2, h / 2, 1.5 * ap.FIXTURES_BY_NAME["knit_01"].px_per_inch_wale)
    assert _marker_pixels(clean, roi) > 500


@pytest.mark.parametrize("name", ["jersey", "teal", "knit_01", "knit_05", "synth_jersey"])
def test_rot15_is_a_crop_with_no_filled_corner(name):
    """Rotated, then cropped to the largest rectangle holding only photo: a constant-colour photo stays constant
    to the last pixel (a reflection fill or a black corner would not), and the crop is smaller than the photo."""
    fx = ap.FIXTURES_BY_NAME[name]
    made = bis.make_input(name, "rot15")
    h0, w0 = made.img.shape[0], made.img.shape[1]
    src = cv2.imdecode(np.frombuffer(ap.upload_for(name)[1], np.uint8), cv2.IMREAD_COLOR)
    flat = np.full_like(src, 200)
    crop = bis.rotate_crop(flat, 15.0)
    assert crop.min() >= 198, "the crop reaches a filled corner"
    assert crop.shape[0] < src.shape[0] and crop.shape[1] < src.shape[1]
    assert (w0, h0) == (crop.shape[1], crop.shape[0])
    # control: the uncropped rotation of the same flat image does contain fill
    m = cv2.getRotationMatrix2D((src.shape[1] / 2, src.shape[0] / 2), 15.0, 1.0)
    full = cv2.warpAffine(flat, m, (src.shape[1], src.shape[0]), borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0))
    assert full.min() == 0
    assert made.scale == {"wale": fx.px_per_inch_wale, "course": fx.px_per_inch_course}  # a crop does not rescale


def test_inputs_do_what_they_say():
    base = bis.make_input("jersey", "base")
    h, w = base.img.shape[:2]
    pw = ap.FIXTURES_BY_NAME["jersey"].px_per_inch_wale
    # boxes
    assert bis.make_input("jersey", "box_good").roi["width"] == round(1.5 * pw)
    assert bis.make_input("jersey", "box_small").roi["width"] == round(0.4 * pw)
    for v in ("box_good", "box_small", "box_ruler", "box_pins", "blur4+box"):
        r = bis.make_input("jersey", v).roi
        assert r["x"] >= 0 and r["y"] >= 0 and r["x"] + r["width"] <= w and r["y"] + r["height"] <= h and r["source"] == "manual"
    # blur removes high-frequency energy; 4 more than 2
    lap = lambda m: cv2.Laplacian(cv2.cvtColor(m.img, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var()
    assert lap(bis.make_input("jersey", "blur4")) < lap(bis.make_input("jersey", "blur2")) < lap(base)
    # rotation by 90 swaps the shape, and the orientation is the only difference between the two rows:
    # set by hand on one, "detected" (the page's own pre-selection) on the other
    r90, r90d = bis.make_input("jersey", "rot90_correct"), bis.make_input("jersey", "rot90_detected")
    assert r90.img.shape[:2] == (w, h) and r90.data == r90d.data
    assert (r90.orientation, r90d.orientation) == ("horizontal", "detected")
    # stretch: 1.3x wider, one calibration along x for both axes
    st = bis.make_input("jersey", "stretch13")
    assert st.img.shape[1] == round(w * 1.3) and st.img.shape[0] == h
    assert st.typed["wale"] == st.typed["course"] == pytest.approx(pw * 1.3) and st.scale["course"] == pw
    # 4000 px long edge, scale carried with it
    big = bis.make_input("jersey", "big4000")
    assert max(big.img.shape[:2]) == 4000 and big.scale["wale"] == pytest.approx(pw * 4000 / w, rel=1e-6)
    # low light: mean exposure scales with the gain
    m0 = base.img.mean()
    for v, g in (("lowlight", 0.18), ("low30", 0.30), ("low50", 0.50)):
        assert bis.make_input("jersey", v).img.mean() == pytest.approx(m0 * g, rel=0.06)
    # pins: six heads in the box, none outside it
    pins, clean = bis.make_input("jersey", "box_pins"), base
    diff = (pins.img.astype(int) != clean.img.astype(int)).any(axis=2)
    ys, xs = np.nonzero(diff)
    cx, cy = bis.centre_of("jersey", clean.img)
    reach = 0.75 * pw + 0.7 * pw
    assert diff.sum() > 400 and abs(xs.mean() - cx) < reach and abs(ys.mean() - cy) < reach
    # the swatch edge: on a synthetic the right 45% is replaced by board, the left 55% is untouched
    e = bis.make_input("synth_jersey", "box_edge")
    sj = bis.make_input("synth_jersey", "base")
    cut = int(sj.img.shape[1] * 0.55)
    assert (e.img[:, :cut] == sj.img[:, :cut]).all() and (e.img[:, cut + 1:] != sj.img[:, cut + 1:]).any()
    # inputs that need a ruler / an edge are skipped where there is none
    assert bis.make_input("synth_rib", "box_ruler") is None and bis.make_input("jersey", "box_edge") is None


def test_inputs_are_deterministic_and_the_noise_is_unbiased():
    """No random stream anywhere: the same bytes on every machine. And the hash noise is what it says it is."""
    for name, v in (("teal", "lowlight"), ("synth_jersey", "box_edge"), ("knit_05", "box_pins"), ("jersey", "rot15")):
        assert bis.make_input(name, v).data == bis.make_input(name, v).data
    for n in bis.nonknit_names():
        assert bis.nonknit_upload(n) is bis.nonknit_upload(n)
    z = bis._hash_normal((400, 400), 7, 3.0)
    assert abs(z.mean()) < 0.05 and z.std() == pytest.approx(3.0, rel=0.05)
    assert abs(np.corrcoef(z[:, :-1].ravel(), z[:, 1:].ravel())[0, 1]) < 0.01     # no horizontal structure
    assert abs(np.corrcoef(z[:-1].ravel(), z[1:].ravel())[0, 1]) < 0.01           # none vertical


def test_every_input_is_built_for_every_fixture_that_can_take_it():
    for inp in bis.INPUTS:
        for fx in ap.FIXTURES:
            made = bis.make_input(fx.name, inp.name)
            assert (made is None) == (not bis.applies(inp, fx.name))
            if made is not None:
                assert made.data and made.img.size


# --- The causes -------------------------------------------------------------------------------------------------


def test_every_pinned_cell_has_the_cause_the_harness_derives():
    for mode, cause, fixture, inp, axis in _pinned_cells():
        assert bis.cause_for(inp, axis) == cause, f"{(mode, fixture, inp, axis)} is pinned under {cause!r}"
        assert cause.split(" | ")[0] in ("COURSE", "WALE")
        assert cause.split(" | ")[1] in bis.REASONS
        assert (axis == "course") == cause.startswith("COURSE | ")  # every course cell is labelled COURSE


def test_the_subset_has_a_witness_of_every_cause():
    for mode in bis.MODES:
        seen = {cause for (m, cause, f, i, a) in _pinned_cells() if m == mode and f in bis.SUBSET_FIXTURES and i in bis.SUBSET_INPUTS}
        want = set(KNOWN_SILENT[mode])
        assert seen == want, f"{mode}: the CI subset has no witness of {sorted(want - seen)}"


def test_the_pins_are_internally_consistent():
    assert sum(len(v) for v in KNOWN_SILENT["truth"].values()) == PINNED_TOTALS["truth"]["silent"]
    assert sum(len(v) for v in KNOWN_SILENT["ruler"].values()) == PINNED_TOTALS["ruler"]["silent"]
    assert len(KNOWN_CARD_SILENT["truth"]) == PINNED_TOTALS["truth"]["card_silent"]
    assert len(KNOWN_CARD_SILENT["ruler"]) == PINNED_TOTALS["ruler"]["card_silent"]
    for mode, cells in KNOWN_CARD_SILENT.items():
        assert all(c in CARD_SILENT_WHY for c in cells)


# --- The app path: confident and wrong ------------------------------------------------------------------------------


@pytest.mark.parametrize("mode,cause,fixture,inp,axis", [
    pytest.param(mode, cause, fixture, inp, axis, id=f"{mode}-{fixture}-{inp}-{axis}", marks=_strict(cause))
    for (mode, cause, fixture, inp, axis) in _pinned_cells()
])
def test_pinned_cell_is_not_confident_and_wrong(sweep, mode, cause, fixture, inp, axis):
    """Every pin is a strict xfail on "this cell is not confident-and-wrong": the day a change fixes it, it XPASSes
    and the entry has to come off on purpose. The reason shown is the cause label."""
    cell = sweep["cells"].get((mode, fixture, inp, axis))
    if cell is None:
        pytest.skip("outside the CI subset")
    assert cell["cls"] != "silent", f"{cell['status']} at {cell['error']:+.1f}%"


@pytest.mark.parametrize("mode", bis.MODES)
def test_no_unpinned_silent_cell(sweep, mode):
    """A confident-and-wrong cell that is not pinned is a regression (or a new input: pin it, with its cause)."""
    pinned = {(fixture, inp, axis) for (m, c, fixture, inp, axis) in _pinned_cells() if m == mode}
    new = [k for k in bis.silent_cells(sweep, mode) if k[1:] not in pinned]
    assert not new, f"{mode}: confident-and-wrong cells that are not pinned: " + "; ".join(
        f"{k[1:]} {sweep['cells'][k]['error']:+.1f}% ({bis.cause_for(k[2], k[3])})" for k in new)


@pytest.mark.parametrize("mode,fixture,inp", [
    pytest.param(mode, f, i, id=f"{mode}-{f}-{i}", marks=_strict(CARD_SILENT_WHY[(f, i)]))
    for mode, cells in KNOWN_CARD_SILENT.items() for (f, i) in cells
])
def test_pinned_card_is_not_confident_and_wrong(sweep, mode, fixture, inp):
    """The card says Confident and some axis is more than 10% off: the failure the page cannot show."""
    run = sweep["runs"].get((mode, fixture, inp))
    if run is None:
        pytest.skip("outside the CI subset")
    assert (mode, fixture, inp) not in bis.card_silent_runs(sweep, mode)


@pytest.mark.parametrize("mode", bis.MODES)
def test_no_unpinned_card_silent_run(sweep, mode):
    pinned = {(mode, f, i) for (f, i) in KNOWN_CARD_SILENT[mode]}
    new = [k for k in bis.card_silent_runs(sweep, mode) if k not in pinned]
    assert not new, f"{mode}: card-silent runs that are not pinned: {new}"


# --- Non-knit images ------------------------------------------------------------------------------------------------


@pytest.mark.parametrize("name,path,axis", [
    pytest.param(n, p, a, id=f"{n}-{p}-{a}", marks=_strict(bis.nonknit_cause(n, a)))
    for (n, p, a) in KNOWN_NONKNIT_CONFIDENT_AXES
])
def test_pinned_nonknit_axis_is_not_confident(sweep, name, path, axis):
    """Nothing here is a knit, so any number is wrong: a confident axis is silent. Both calibration modes."""
    runs = [sweep["nonknit"].get((m, name, path)) for m in bis.MODES]
    if not all(runs):
        pytest.skip("outside the CI subset")
    for run in runs:
        assert not (run.get("analyzed") and run[axis]["spacing_px"] is not None and run[axis]["status"] == "confident")


@pytest.mark.parametrize("mode", bis.MODES)
def test_no_unpinned_nonknit_confident_axis(sweep, mode):
    pinned = set(KNOWN_NONKNIT_CONFIDENT_AXES)
    new = [k for k in bis.nonknit_confident_axes(sweep, mode) if k[1:] not in pinned]
    assert not new, f"{mode}: non-knit axes that say confident and are not pinned: {new}"
    cards = bis.nonknit_card_confident(sweep, mode)
    assert [k[1:] for k in cards if k[1:] not in set(KNOWN_NONKNIT_CARD_CONFIDENT)] == [], f"{mode}: unpinned Confident card on a non-knit image: {cards}"


@pytest.mark.parametrize("name,path", [
    pytest.param(n, p, id=f"{n}-{p}", marks=_strict(f"BOTH | {bis.REASON_PERIODIC}: the card says Confident"))
    for (n, p) in KNOWN_NONKNIT_CARD_CONFIDENT
])
def test_pinned_nonknit_card_is_not_confident(sweep, name, path):
    runs = [sweep["nonknit"].get((m, name, path)) for m in bis.MODES]
    if not all(runs):
        pytest.skip("outside the CI subset")
    assert not any(r["card_confident"] for r in runs)


def test_aperiodic_images_are_refused_or_uncertain_except_the_pinned_noise(sweep):
    """The images with no periodic structure to find (flat grey, the daisy, toile, the final-look render) never get a
    confident axis; random noise does on one path (pinned above), which is a finding rather than a harness artefact
    -- the noise is a clean integer hash with no lattice (asserted in test_inputs_are_deterministic...)."""
    for (mode, name, path), run in sweep["nonknit"].items():
        if name in ("flat_grey", "repo_daisy_photo", "repo_toile", "repo_final_look") and run.get("analyzed"):
            assert not any(run[a]["status"] == "confident" and run[a]["spacing_px"] is not None for a in ap.AXES), (mode, name, path)


# --- Headline totals ----------------------------------------------------------------------------------------------


@pytest.mark.skipif(SUBSET_MODE, reason="the totals describe the full sweep")
@pytest.mark.parametrize("mode", bis.MODES)
def test_headline_totals_are_pinned_exactly(sweep, mode):
    got = bis.totals(bis.metrics_by_input(sweep, mode))
    want = PINNED_TOTALS[mode]
    assert {k: got[k] for k in want} == want, f"{mode}: {got} against pinned {want}"


@pytest.mark.skipif(SUBSET_MODE, reason="the totals describe the full sweep")
def test_nonknit_totals_are_pinned_exactly(sweep):
    for mode in bis.MODES:
        m = bis.nonknit_metrics(sweep, mode)
        assert {k: m[k] for k in PINNED_NONKNIT} == PINNED_NONKNIT, f"{mode}: {m}"


def test_calibration_mode_never_adds_a_silent_cell(sweep):
    """The pre-fill is offered on two photos; any silent cell under "ruler" that is not silent under "truth"
    was put there by the pre-fill."""
    added = sorted(set(k[1:] for k in bis.silent_cells(sweep, "ruler")) - set(k[1:] for k in bis.silent_cells(sweep, "truth")))
    assert not added, f"the ruler pre-fill added silent cells: {added}"


@pytest.mark.skipif(SUBSET_MODE, reason="the README block describes the full sweep")
def test_readme_carries_the_generated_sweep_block(sweep):
    import verify_simulation as vs
    path = os.path.join(os.path.dirname(__file__), "..", "README.md")
    with open(path, encoding="utf-8") as fh:
        text = fh.read()
    assert bis.SWEEP_BEGIN in text and bis.SWEEP_END in text, "README is missing the bad-input sweep block markers"
    block = text[text.index(bis.SWEEP_BEGIN): text.index(bis.SWEEP_END) + len(bis.SWEEP_END)]
    assert block == bis.readme_block(sweep, vs.cached_verify()), (
        "README's bad-input sweep block is stale -- run `python tests/bad_input_sweep.py --write-readme`"
    )


@pytest.mark.parametrize("mode", bis.MODES)
def test_readme_headline_carries_the_pinned_totals(mode):
    """Always on (no sweep needed): a re-pin without regenerating the README block is caught even where CI runs only
    the subset and cannot compare the whole block."""
    t = PINNED_TOTALS[mode]
    line = (f"- **{mode}** calibration: **{t['silent']}** confident-and-wrong axes and **{t['card_silent']}** card-silent "
            f"runs of {t['n']} scored axes in {t['runs']} runs; {t['no-result']} no-result axes; "
            f"{t['uncertain-right']} uncertain-but-right axes")
    path = os.path.join(os.path.dirname(__file__), "..", "README.md")
    with open(path, encoding="utf-8") as fh:
        assert line in fh.read(), f"README's headline for {mode} does not match the pinned totals -- regenerate the block"


def test_the_wale_signals_diagnostic_still_imports():
    """tools/wale_signals.py is a diagnostic, not a test, and is not run here; it must not rot."""
    path = os.path.join(os.path.dirname(__file__), "..", "tools", "wale_signals.py")
    spec = importlib.util.spec_from_file_location("wale_signals", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    assert callable(mod.collect) and callable(mod.analyse)
