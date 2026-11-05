"""
"Verify by counting a repeat", pinned: what the second-opinion tool gives a person who uses it.

tests/verify_simulation.py drives the shipped /count-repeats route the way the page does (read its docstring):
one dragged box, the whole photo as the search area, a perfect calibration. This file pins the outcome so the
PR that improves the tool has to re-pin it on purpose.

What it pins, measured on main c0e0073 (2026-11-05), 11 fixtures, three anchor positions each:

  * exact box (one repeat): 25 of 63 axis-cases within 10% -- 20 of 33 wale (median error 8%), 5 of 30 course
    (median 21%). The tool is a second opinion that is, for a person who does everything right, wrong about
    as often as the number it is checking. README: "Investigated and rejected: user-anchored template matching"
    measured the same on two photos.
  * sloppy +-20%: the same (24 and 24 of 63): the tool tolerates a hand that is a little off.
  * one-stitch miscount (the box covers two repeats): 3 of 63 within 10%; the others read about half the true
    gauge (median 48% wale, 46% course) at the SAME confidence as an exact box, so nothing on the card says so.
  * half-stitch (leg to leg of a V): 0 of 63; 39 return "no match".

A case count moving either way fails, so an improvement re-pins here and in the README; the PR that makes the
miscount detectable (counted / automatic reading near 0.5 or 2) is expected to leave these counts alone and add
its own flag.
"""
from __future__ import annotations

import pytest

import app_path_scorecard as ap
import verify_simulation as vs

# case -> (axis-cases, within 10%, no match)
PINNED = {
    "exact": (63, 25, 5),
    "sloppy -20%": (63, 24, 5),
    "sloppy +20%": (63, 24, 5),
    "miscount +1 (2x box)": (63, 3, 12),
    "half-stitch (0.5x box)": (63, 0, 39),
}
# Median |error| of the counted reading over the cases that returned one, to the nearest point.
PINNED_MEDIAN_ABS_ERROR = {
    ("exact", "wale"): 8, ("exact", "course"): 21,
    ("miscount +1 (2x box)", "wale"): 48, ("miscount +1 (2x box)", "course"): 46,
}


@pytest.fixture(scope="module")
def verify():
    return vs.cached_verify()


def test_box_anchors_are_the_pages():
    """frontend repeatBoxAnchorPoints, orientation vertical: wales are read horizontally, courses vertically."""
    a = vs.box_anchors(100.0, 200.0, 30.0, 20.0)
    assert a["wale"] == (100.0, 210.0, 130.0, 210.0)     # left and right edge midpoints
    assert a["course"] == (115.0, 200.0, 115.0, 220.0)   # top and bottom edge midpoints


def test_the_box_is_a_multiple_of_the_true_pitch():
    fx = ap.FIXTURES_BY_NAME["jersey"]
    g = vs._axis_geometry(fx)
    assert g["wale"] == pytest.approx(fx.px_per_inch_wale / fx.true_wpi)
    assert g["course"] == pytest.approx(fx.px_per_inch_course / fx.true_cpi)
    # an axis without truth (knit_02 has no course truth) borrows the other's pitch for the box
    k2 = vs._axis_geometry(ap.FIXTURES_BY_NAME["knit_02"])
    assert k2["course"] == k2["wale"]


def test_every_case_covers_every_scored_axis_at_three_anchors(verify):
    scored = sum(1 for f in ap.FIXTURES for t in (f.true_wpi, f.true_cpi) if t is not None)
    for case in vs.CASES:
        rows = [r for r in verify["rows"] if r["case"] == case]
        assert len(rows) == scored * len(vs.ANCHORS) == PINNED[case][0]


@pytest.mark.parametrize("case", list(PINNED))
def test_verify_counts_are_pinned_exactly(verify, case):
    m = vs.case_metrics(verify, case)
    assert (m["n"], m["within"], m["no_match"]) == PINNED[case], (
        f"{case}: (n, within 10%, no match) = {(m['n'], m['within'], m['no_match'])}, pinned {PINNED[case]}"
    )


@pytest.mark.parametrize("key", list(PINNED_MEDIAN_ABS_ERROR), ids=lambda k: "-".join(k))
def test_verify_median_error_is_pinned(verify, key):
    case, axis = key
    got = vs.case_metrics(verify, case, axis)["median_abs_error"]
    assert round(got) == PINNED_MEDIAN_ABS_ERROR[key], f"{key}: median |error| {got:.1f}%"


# The failures, strict: each is the tool doing something a person cannot be expected to catch.
@pytest.mark.xfail(strict=True, reason="a person who marks exactly one repeat gets a reading within 10% on fewer than "
                   "half of the axis-cases (25 of 63; course 5 of 30)")
def test_an_exact_box_is_usually_within_ten_percent(verify):
    m = vs.case_metrics(verify, "exact")
    assert m["rate"] >= 0.5


@pytest.mark.xfail(strict=True, reason="a one-stitch miscount (the box covers two repeats) reads about half the "
                   "true gauge with the same confidence as an exact box: nothing tells the user")
def test_a_one_stitch_miscount_is_distinguishable_from_an_exact_box(verify):
    def med_conf(case):
        c = sorted(r["confidence"] for r in verify["rows"] if r["case"] == case and r["ok"])
        return c[len(c) // 2]
    assert abs(med_conf("miscount +1 (2x box)") - med_conf("exact")) > 0.1


def test_the_one_stitch_miscount_reads_about_half(verify):
    """The consequence the pins above rest on: every counted reading of a 2x box is near half the truth."""
    errs = [r["error"] for r in verify["rows"] if r["case"] == "miscount +1 (2x box)" and r["error"] is not None
            and not r["fixture"].startswith("synth")]
    assert errs and sum(1 for e in errs if -60 <= e <= -40) / len(errs) > 0.75


def test_the_readme_verify_table_matches(verify):
    """The verify table is part of the sweep block in the README; this one is the cheap half of its staleness check
    (the full block is compared in test_bad_input_sweep.py)."""
    import os
    path = os.path.join(os.path.dirname(__file__), "..", "README.md")
    with open(path, encoding="utf-8") as fh:
        assert vs.format_verify_table(verify) in fh.read(), (
            "README's verify table is stale -- run `python tests/bad_input_sweep.py --write-readme`"
        )
