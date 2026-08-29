"""
Tests for _apply_aspect_ratio_sanity_check -- the physical-plausibility
floor added after a real variegated-yarn photo reported 29.54 wales/in
against 10.14 courses/in (a stitch ~3x wider than tall, which no real
knitting produces). Per-axis confidence and the density cross-check can
both be fooled together when a detector confidently locks onto a real,
regular, but non-stitch periodic pattern (see the investigation notes in
README/commit history for the variegated-yarn root cause) -- this check
is a separate, physically-grounded backstop that doesn't depend on any
one axis's own confidence being right.

Deliberately unit-level: constructs AxisResult pairs directly rather than
going through a real image, since the point is to test the ratio logic
in isolation from whatever produced the numbers.
"""
from analysis.gauge_analysis import (
    PLAUSIBLE_WALE_COURSE_RATIO_MAX,
    PLAUSIBLE_WALE_COURSE_RATIO_MIN,
    AxisResult,
    _apply_aspect_ratio_sanity_check,
)


def _axis(spacing_px, status="confident", uncertain_reason=None, confidence=0.7):
    return AxisResult(spacing_px=spacing_px, confidence=confidence, status=status, uncertain_reason=uncertain_reason)


def test_the_reported_real_photo_case_is_flagged():
    # 0.86mm wale spacing vs 2.51mm course spacing, from the actual
    # regression report -- ratio 2.51/0.86 = 2.92, corresponding to
    # 29.2 wales/in vs 10.0 courses/in-scale numbers (~2.9:1), nowhere
    # close to plausible.
    wale = _axis(0.86)
    course = _axis(2.51)
    wale2, course2 = _apply_aspect_ratio_sanity_check(wale, course)
    assert wale2.status == "uncertain"
    assert course2.status == "uncertain"
    assert "2.92" in wale2.uncertain_reason
    assert "physically plausible" in wale2.uncertain_reason
    assert wale2.uncertain_reason == course2.uncertain_reason
    # Never rewrites the numbers themselves -- only the status/reason.
    assert wale2.spacing_px == 0.86
    assert course2.spacing_px == 2.51


def test_typical_jersey_ratio_is_not_flagged():
    # ~5 WPI / ~7.2 CPI (the real_jersey_sample.jpg fixture's own known
    # gauge) -> course_px/wale_px = wale_per_inch/course_per_inch ~= 0.69.
    wale = _axis(spacing_px=33.25)   # 166.25 px/in / 5 WPI
    course = _axis(spacing_px=23.09)  # 166.25 px/in / 7.2 CPI
    wale2, course2 = _apply_aspect_ratio_sanity_check(wale, course)
    assert wale2.status == "confident"
    assert course2.status == "confident"
    assert wale2 == wale
    assert course2 == course


def test_boundary_values_are_inclusive():
    wale = _axis(spacing_px=1.0)
    course_min = _axis(spacing_px=PLAUSIBLE_WALE_COURSE_RATIO_MIN)
    w, c = _apply_aspect_ratio_sanity_check(wale, course_min)
    assert w.status == "confident" and c.status == "confident"

    course_max = _axis(spacing_px=PLAUSIBLE_WALE_COURSE_RATIO_MAX)
    w, c = _apply_aspect_ratio_sanity_check(wale, course_max)
    assert w.status == "confident" and c.status == "confident"

    # Just outside either edge -> flagged.
    just_below = _axis(spacing_px=PLAUSIBLE_WALE_COURSE_RATIO_MIN - 0.01)
    w, c = _apply_aspect_ratio_sanity_check(wale, just_below)
    assert w.status == "uncertain" and c.status == "uncertain"

    just_above = _axis(spacing_px=PLAUSIBLE_WALE_COURSE_RATIO_MAX + 0.01)
    w, c = _apply_aspect_ratio_sanity_check(wale, just_above)
    assert w.status == "uncertain" and c.status == "uncertain"


def test_missing_spacing_is_a_no_op():
    wale = _axis(spacing_px=None)
    course = _axis(spacing_px=2.51)
    w, c = _apply_aspect_ratio_sanity_check(wale, course)
    assert w == wale
    assert c == course


def test_zero_or_negative_spacing_is_a_no_op():
    # Defensive: shouldn't happen in practice, but a division by an
    # impossible spacing must never raise.
    wale = _axis(spacing_px=0.0)
    course = _axis(spacing_px=2.51)
    w, c = _apply_aspect_ratio_sanity_check(wale, course)
    assert w == wale
    assert c == course


def test_does_not_clobber_an_existing_uncertain_reason():
    # An axis already flagged uncertain for a DIFFERENT, more specific
    # reason (e.g. a close harmonic-candidate margin) keeps that reason --
    # the aspect check adds new doubt only where none was already recorded.
    wale = _axis(spacing_px=0.86, status="uncertain", uncertain_reason="Competing 0.5x harmonic candidate scored nearly as well")
    course = _axis(spacing_px=2.51)
    w, c = _apply_aspect_ratio_sanity_check(wale, course)
    assert w.uncertain_reason == "Competing 0.5x harmonic candidate scored nearly as well"
    # The other axis, which had no prior reason, still gets flagged.
    assert c.status == "uncertain"
    assert "physically plausible" in c.uncertain_reason
