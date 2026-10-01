"""
Ground-truth recovery tests against the synthetic stitch-primitive
fabrics (tests/synthetic_fabric.py) — the first tests in this project
where the exact wales/courses pitch is KNOWN by construction rather than
counted by hand off a photo.

Every expectation below was CALIBRATED against the real detector before
being committed (this project's standing discipline: measure first, then
commit — tolerances and xfail marks are recorded reality, not hopes).
The calibration run surfaced genuine findings, encoded here as
strict xfails so the suite AUTOMATICALLY flags when a future algorithm
change fixes one (strict xfail turns an unexpected pass into a failure,
forcing the mark — i.e. the documentation — to be updated):

  * jersey, mildly degraded, 5x7 gauge, seed 7, COURSE axis: flips to the
    leg/half-period harmonic with a confident score (~0.67). Isolated to
    a blur+perspective interaction with that seed's particular warp
    geometry — the identical degradation levels at seeds 8/9/10 stay
    correct, and no single degradation (nor blur+jpeg, lighting+warp,
    blur alone up to sigma 2.0) flips it. The structure="jersey" hint
    does NOT rescue it. This is the classic real-photo failure mode,
    still reproducible on demand for course.
    The WALE axis of this same case used to flip too and was xfailed
    alongside it -- FIXED (mark removed, XPASSED the moment it shipped)
    by DENSITY_OVERRIDE_MAX_EVIDENCE_MARGIN gating _cross_check_density:
    traced directly, this was the identical bug found on knit_sample_01.jpg
    (see knit_sample_ground_truth.py) -- wale's v0.3 evidence scorer had
    already picked the correct period decisively, and the density
    cross-check overrode it to the wrong 0.5x harmonic anyway.
  * jersey, mildly degraded, 8x10: course axis flips to half period
    (wale survives).
  * rib1x1: the wale axis consistently locks onto the knit-to-knit
    VISIBLE repeat (2x the true wale pitch) — accepted as "alternate"
    per the documented labeling ambiguity, not a failure. The course
    axis originally read ~18% high at the coarse gauge — DIAGNOSED AND
    FIXED by the spacing-refinement rework (the inflation was the old
    mean-of-all-gaps estimator, not detection; see
    _refine_spacing_from_positions); the fine-gauge half-period flip
    (a detection-level confusion, clean image) remains open.
  * garter, 8x10: wale axis USED TO read the 2x double-period on the bump
    lattice (clean and degraded) -- FIXED by the leg-slant orientation
    discriminator (_orientation_fundamental: a bump's two flanks lean
    opposite ways exactly as a V's two legs do, so the signed orientation
    repeats at the bump pitch and alternates at its half). Both marks
    came off the day it shipped, per the strict-xfail contract. Course
    axis is fine at both gauges.

Tolerance is 5% against the matched truth value: sub-pixel peak
refinement contributes ~1-2% jitter on 18-36px periods, rendering
quantization ~1%, leaving real headroom while staying far below the
50%/100% error of any harmonic confusion.
"""
from __future__ import annotations

import functools
import os

import pytest

from analysis.gauge_analysis import analyze_gauge

from synthetic_fabric import (
    FabricSpec,
    centered_roi,
    clean,
    expected_periods,
    match_against_truth,
    mildly_degraded,
    render_fabric,
)

TOL = 0.05


@functools.lru_cache(maxsize=None)
def _analyze(spec: FabricSpec):
    """One render+analyze per spec, shared by that spec's per-axis params
    (FabricSpec is frozen, hence hashable)."""
    img = render_fabric(spec)
    return analyze_gauge(img, centered_roi(spec), "vertical")


def _status(spec: FabricSpec, axis: str) -> str:
    result = _analyze(spec)
    ax = result.wale if axis == "wale" else result.course
    primary, alternate = expected_periods(spec)[axis]
    status, _ = match_against_truth(ax.spacing_px, primary, alternate, TOL)
    return status


def _case(mk, structure, wpi, cpi, axis, ok=("primary",), xfail_reason=None):
    spec = mk(structure, wpi, cpi)
    marks = []
    if xfail_reason:
        marks.append(pytest.mark.xfail(strict=True, reason=xfail_reason))
    return pytest.param(spec, axis, ok, id=f"{mk.__name__}-{structure}-{wpi}x{cpi}-{axis}", marks=marks)


GRID = [
    # --- jersey: unambiguous ground truth on both axes -----------------
    _case(clean, "jersey", 5, 7, "wale"),
    _case(clean, "jersey", 5, 7, "course"),
    _case(clean, "jersey", 8, 10, "wale"),
    _case(clean, "jersey", 8, 10, "course"),
    # Was a strict xfail ("blur+warp interaction (seed 7 geometry) flips to
    # the leg half-harmonic at conf ~0.67; seeds 8-10 identical degradation
    # are correct") until the DENSITY_OVERRIDE_MAX_EVIDENCE_MARGIN gate on
    # _cross_check_density landed -- XPASSED the moment that gate shipped,
    # confirming this was the same override-a-decisive-pick bug traced
    # directly on knit_sample_01.jpg, not a coincidentally-similar one.
    _case(mildly_degraded, "jersey", 5, 7, "wale"),
    _case(mildly_degraded, "jersey", 5, 7, "course",
          xfail_reason="same seed-7 blur+warp interaction flips the course axis to half period"),
    _case(mildly_degraded, "jersey", 8, 10, "wale"),
    _case(mildly_degraded, "jersey", 8, 10, "course",
          xfail_reason="mild degradation flips the fine-gauge course axis to half period (9.0px vs 18.0 true)"),
    # --- rib1x1: wale may legitimately read the knit-to-knit repeat ----
    _case(clean, "rib1x1", 5, 7, "wale", ok=("primary", "alternate")),
    # The two coarse-gauge rib course cases originally xfailed as
    # "reads high, cause not yet diagnosed" (30.4px clean / 27.9px
    # degraded vs 25.7 true). The spacing-refinement fix (per-step-
    # normalized gaps -- see _refine_spacing_from_positions) made both
    # XPASS: the inflation was the old mean-of-all-gaps estimator being
    # tilted by junk gaps, not a detection problem. Marks removed per
    # the strict-xfail contract.
    _case(clean, "rib1x1", 5, 7, "course"),
    _case(clean, "rib1x1", 8, 10, "wale", ok=("primary", "alternate")),
    _case(clean, "rib1x1", 8, 10, "course",
          xfail_reason="fine-gauge rib course flips to half period even clean (9.0px vs 18.0 true)"),
    _case(mildly_degraded, "rib1x1", 5, 7, "wale", ok=("primary", "alternate")),
    _case(mildly_degraded, "rib1x1", 5, 7, "course"),
    _case(mildly_degraded, "rib1x1", 8, 10, "wale", ok=("primary", "alternate")),
    _case(mildly_degraded, "rib1x1", 8, 10, "course"),
    # --- garter: course may legitimately read the ridge-pair repeat ----
    _case(clean, "garter", 5, 7, "wale"),
    _case(clean, "garter", 5, 7, "course", ok=("primary", "alternate")),
    # Was a strict xfail ("fine-gauge garter wale reads the 2x double
    # period on the bump lattice (44.0px vs 22.5 true)") until the
    # leg-slant orientation discriminator landed -- XPASSED the moment it
    # shipped; see the module docstring.
    _case(clean, "garter", 8, 10, "wale"),
    _case(clean, "garter", 8, 10, "course", ok=("primary", "alternate")),
    _case(mildly_degraded, "garter", 5, 7, "wale"),
    _case(mildly_degraded, "garter", 5, 7, "course", ok=("primary", "alternate")),
    # Was a strict xfail ("same 2x double period as the clean fine-gauge
    # garter wale case") -- fixed alongside it by the orientation
    # discriminator.
    _case(mildly_degraded, "garter", 8, 10, "wale"),
    _case(mildly_degraded, "garter", 8, 10, "course", ok=("primary", "alternate")),
]


@pytest.mark.parametrize("spec,axis,ok", GRID)
def test_recovers_known_gauge(spec, axis, ok):
    status = _status(spec, axis)
    assert status in ok, (
        f"{axis} axis on {spec.structure} {spec.wales_per_inch}x{spec.courses_per_inch} "
        f"({'clean' if spec.blur_sigma == 0 else 'degraded'}): got {status}, accepted {ok}"
    )


def test_ply_twist_trap_does_not_fool_clean_jersey():
    """A fine diagonal sub-loop texture (the yarn-ply harmonic trap that
    has fooled the detector on real photos) overlaid on clean jersey:
    both axes must still read the true loop pitch, not the ply period.
    Locks in the anti-harmonic machinery against the exact failure it
    was built for, with ground truth known for the first time."""
    spec = FabricSpec(structure="jersey", wales_per_inch=5, courses_per_inch=7,
                      ply_period_px=(180.0 / 5) / 3.7)
    for axis in ("wale", "course"):
        assert _status(spec, axis) == "primary"


def test_degradation_flip_is_seed_specific():
    """Regression-pins the diagnosis behind the seed-7 xfails above: the
    SAME degradation levels at seeds 8/9/10 recover the true pitch. If
    this starts failing, the leg-harmonic weakness has broadened beyond
    one warp geometry and the xfail notes above are out of date."""
    for seed in (8, 9, 10):
        spec = mildly_degraded("jersey", 5, 7, seed=seed)
        assert _status(spec, "wale") == "primary", f"seed {seed} wale"
        assert _status(spec, "course") == "primary", f"seed {seed} course"


@pytest.mark.skipif(not os.environ.get("TGR_FULL_SWEEP"), reason="set TGR_FULL_SWEEP=1 for the full degradation sweep")
def test_full_degradation_sweep():
    """Diagnostic sweep, not a gate: prints a per-cell status table over
    a degradation grid x several seeds (run pytest with -s). Fails only
    if a cell CRASHES -- drift/harmonic cells are the interesting output,
    not an assertion."""
    blurs = (0.0, 1.2, 2.0)
    warps = (0.0, 0.01, 0.02)
    print("\nstructure gauge blur warp seed -> wale/course status")
    for structure in ("jersey", "rib1x1", "garter"):
        for blur in blurs:
            for warp in warps:
                for seed in (7, 8, 9):
                    spec = FabricSpec(structure=structure, wales_per_inch=5, courses_per_inch=7,
                                      blur_sigma=blur, warp_amount=warp,
                                      jpeg_quality=75, lighting_strength=0.25, seed=seed)
                    w, c = _status(spec, "wale"), _status(spec, "course")
                    print(f"{structure:7s} 5x7 blur={blur:.1f} warp={warp:.2f} seed={seed}: {w} / {c}")


# =====================================================================
# Degradations beyond the original four: in-plane rotation, yarn fuzz,
# and in-ROI contamination (ruler band, pins, fabric edge). Same
# discipline as GRID above: every row was run against the detector
# BEFORE being committed; a row that fails today carries a strict xfail
# naming its measured reading -- never a widened tolerance. A strict
# xfail that starts passing fails the suite, so a detector fix shows up
# as a mark to remove.
#
# Rotation rows score against the AXIS-PROJECTED pitch (pitch / cos
# theta -- see synthetic_fabric's docstring): +0.1% / +0.8% / +2.2% at
# 3 / 7 / 12 deg, which is the honest expected value for a detector that
# projects onto the image axes.
# =====================================================================

MM_TICK_PX = 180.0 / 25.4      # a millimetre ruler at the renderer's 180 px/inch
SIXTEENTH_TICK_PX = 180.0 / 16  # a 1/16-inch ruler


def _tag(kw) -> str:
    parts = []
    for k, v in sorted(kw.items()):
        if k == "ruler_tick_px":
            parts.append({MM_TICK_PX: "rulerMM", SIXTEENTH_TICK_PX: "ruler16th"}.get(v, f"ruler{v:g}"))
            continue
        short = {"rotation_deg": "rot", "fuzz": "fuzz", "ruler_tick_px": "ruler", "ruler_center_y_frac": "y",
                 "pin_count": "pins", "fabric_edge_x_frac": "edge"}.get(k, k)
        parts.append(f"{short}{v:g}" if isinstance(v, (int, float)) else f"{short}{v}")
    return "_".join(parts)


def _dcase(mk, structure, wpi, cpi, axis, kw, ok=("primary",)):
    spec = mk(structure, wpi, cpi, **kw)
    pid = f"{mk.__name__}-{structure}-{wpi}x{cpi}-{_tag(kw)}-{axis}"
    marks = []
    if pid in DEGRADATION_XFAILS:
        marks.append(pytest.mark.xfail(strict=True, reason=DEGRADATION_XFAILS[pid]))
    return pytest.param(spec, axis, ok, id=pid, marks=marks)


def _ok_for(structure, axis):
    if structure == "rib1x1" and axis == "wale":
        return ("primary", "alternate")
    if structure == "garter" and axis == "course":
        return ("primary", "alternate")
    return ("primary",)


# Strict xfails, each with its measured reading. Several INHERIT a GRID
# row's known flip (the spec without the new degradation already fails):
# they say so, so a fix to the base row shows up as XPASSes here too.
#
# RETIRED by the leg-slant orientation discriminator (every one XPASSED
# the day it shipped and its mark came off in that same change; the
# readings are kept here as the record of what used to happen):
#   'mildly_degraded-jersey-8x10-rot3-wale'  -- 3 deg + mild degradation flipped
#       the fine-gauge wale to the 2x double period (44.2 vs 22.5)
#   'clean-jersey-8x10-edge0.2-wale'          -- fabric edge over the ROI's right
#       12.5% flipped the clean fine-gauge wale to the half period (11.2 vs 22.5)
#   'clean-jersey-8x10-edge0.3-wale'          -- ... right 31%, to the 2x double
#       period (45.0 vs 22.5)
#   'mildly_degraded-jersey-8x10-pins8-wale'  -- 8 pins + mild degradation,
#       2x double period (44.9 vs 22.5)
#   'mildly_degraded-jersey-8x10-edge0.2-wale' -- edge at 20% + mild degradation,
#       2x double period (44.0 vs 22.5)
#   'mildly_degraded-jersey-8x10-edge0.3-wale' -- edge at 30% + mild degradation,
#       2x double period (44.7 vs 22.5)
# All six were a T-vs-2T (or T-vs-T/2) decision the intensity-derived
# evidence could not make and the signed-orientation signal can.
DEGRADATION_XFAILS = {
    'clean-jersey-8x10-rot3-course':
        '3 deg rotation alone flips the clean fine-gauge course axis to the leg half period (9.0 vs 18.0 projected; unrotated reads 18.0)',
    'clean-jersey-8x10-rot7-course':
        '7 deg rotation flips the clean fine-gauge course axis to the leg half period (9.0 vs 18.1 projected; unrotated reads 18.0)',
    'clean-jersey-8x10-rot12-course':
        '12 deg rotation: clean fine-gauge course reads 16.4 vs 18.4 projected (-11%), beyond 5% (unrotated reads 18.0)',
    'mildly_degraded-jersey-5x7-rot0-course':
        "inherits the base row's seed-7 degraded course half-period flip (reads 12.7 vs 25.7 true); identical spec to the GRID row",
    'mildly_degraded-jersey-5x7-rot12-course':
        '12 deg + mild degradation: course reads 24.5 vs 26.3 projected (-7%); 3 and 7 deg pass here although the unrotated row flips',
    'mildly_degraded-jersey-8x10-rot0-course':
        "inherits the base row's fine-gauge degraded course half-period flip (reads 8.9 vs 18.0 true); identical spec to the GRID row",
    'mildly_degraded-jersey-8x10-rot3-course':
        "inherits the base row's fine-gauge degraded course half-period flip (reads 9.0 vs 18.0 true) at 3 deg",
    'mildly_degraded-jersey-8x10-rot7-course':
        "inherits the base row's fine-gauge degraded course half-period flip (reads 9.0 vs 18.1 true) at 7 deg",
    'mildly_degraded-jersey-8x10-rot12-course':
        '12 deg + mild degradation: fine-gauge course reads 86.0 vs 18.4 projected -- a different structure, not a harmonic',
    'clean-rib1x1-5x7-rot7-wale':
        '7 deg rotation: rib wale reads 143.5 (4x true, 2x the knit-to-knit alternate); 3 and 12 deg read the 72px alternate',
    'clean-garter-5x7-rot12-course':
        '12 deg rotation: garter course reads 7.2 vs 26.3 projected -- a sub-stitch feature (unrotated reads 25.8)',
    'clean-jersey-8x10-fuzz1-course':
        'full fuzz flips the clean fine-gauge course axis to the leg half period (8.9 vs 18.0); fuzz 0.5 passes -- non-monotone in fuzz',
    'mildly_degraded-jersey-5x7-fuzz0.5-course':
        "inherits the base row's seed-7 degraded course half-period flip (reads 12.9 vs 25.7 true); fuzz 1.0 on the same spec RECOVERS (25.8)",
    'mildly_degraded-jersey-8x10-fuzz0.5-course':
        "inherits the base row's fine-gauge degraded course half-period flip (reads 8.9 vs 18.0 true) under fuzz 0.5",
    'mildly_degraded-jersey-8x10-fuzz1-course':
        "inherits the base row's fine-gauge degraded course half-period flip (reads 8.9 vs 18.0 true) under fuzz 1.0",
    'clean-jersey-8x10-y0.2_rulerMM-course':
        'mm ruler band near the ROI top flips the clean fine-gauge course axis to the leg half period (8.9 vs 18.0); the centred band passes',
    'clean-jersey-8x10-edge0.2-course':
        "fabric edge over the ROI's right 12.5% flips the clean fine-gauge course to the half period (8.8 vs 18.0)",
    'mildly_degraded-jersey-5x7-pins3-course':
        "inherits the base row's seed-7 degraded course half-period flip (reads 12.7 vs 25.7 true) with 3 pins",
    'mildly_degraded-jersey-5x7-pins8-course':
        "inherits the base row's seed-7 degraded course half-period flip (reads 12.7 vs 25.7 true) with 8 pins",
    'mildly_degraded-jersey-5x7-edge0.2-course':
        "inherits the base row's seed-7 degraded course half-period flip (reads 13.0 vs 25.7 true) with the edge at 20%",
    'mildly_degraded-jersey-5x7-edge0.3-course':
        "inherits the base row's seed-7 degraded course half-period flip (reads 12.8 vs 25.7 true) with the edge at 30%",
    'mildly_degraded-jersey-8x10-pins3-course':
        "inherits the base row's fine-gauge degraded course half-period flip (reads 8.9 vs 18.0 true) with 3 pins",
    'mildly_degraded-jersey-8x10-pins8-course':
        "inherits the base row's fine-gauge degraded course half-period flip (reads 8.9 vs 18.0 true) with 8 pins",
    'mildly_degraded-jersey-8x10-edge0.2-course':
        "inherits the base row's fine-gauge degraded course half-period flip (reads 8.9 vs 18.0 true) with the edge at 20%",
    'mildly_degraded-jersey-8x10-edge0.3-course':
        "inherits the base row's fine-gauge degraded course half-period flip (reads 9.0 vs 18.0 true) with the edge at 30%",
    'clean-rib1x1-5x7-rulerMM-course':
        "a centred mm ruler band captures the rib course axis: reads 7.0 -- the ruler's own tick period (7.09), not the fabric's 25.7",
    'clean-garter-5x7-ruler16th-wale':
        'a centred 1/16-inch ruler band drags the garter wale to 34.0 vs 36.0 true (-5.6%), just outside 5%',
}


def _rotation_rows():
    rows = []
    for mk in (clean, mildly_degraded):
        for wpi, cpi in ((5, 7), (8, 10)):
            for ang in (0, 3, 7, 12):
                for axis in ("wale", "course"):
                    rows.append(_dcase(mk, "jersey", wpi, cpi, axis, {"rotation_deg": ang}))
    for structure in ("rib1x1", "garter"):
        for ang in (3, 7, 12):
            for axis in ("wale", "course"):
                rows.append(_dcase(clean, structure, 5, 7, axis, {"rotation_deg": ang}, _ok_for(structure, axis)))
    return rows


def _fuzz_rows():
    rows = []
    for mk in (clean, mildly_degraded):
        for wpi, cpi in ((5, 7), (8, 10)):
            for fz in (0.5, 1.0):
                for axis in ("wale", "course"):
                    rows.append(_dcase(mk, "jersey", wpi, cpi, axis, {"fuzz": fz}))
    for structure in ("rib1x1", "garter"):
        for axis in ("wale", "course"):
            rows.append(_dcase(clean, structure, 5, 7, axis, {"fuzz": 1.0}, _ok_for(structure, axis)))
    return rows


OVERLAYS = (
    {"ruler_tick_px": MM_TICK_PX},                              # ruler band across the ROI centre
    {"ruler_tick_px": MM_TICK_PX, "ruler_center_y_frac": 0.2},  # ruler band near the ROI's top edge
    {"pin_count": 3},
    {"pin_count": 8},
    {"fabric_edge_x_frac": 0.2},   # tabletop over the ROI's right 12.5%
    {"fabric_edge_x_frac": 0.3},   # ... and its right 31%
)


def _overlay_rows():
    rows = []
    for mk in (clean, mildly_degraded):
        for wpi, cpi in ((5, 7), (8, 10)):
            for kw in OVERLAYS:
                for axis in ("wale", "course"):
                    rows.append(_dcase(mk, "jersey", wpi, cpi, axis, dict(kw)))
    for structure, kw in (("rib1x1", {"ruler_tick_px": MM_TICK_PX}),
                          ("garter", {"ruler_tick_px": SIXTEENTH_TICK_PX})):
        for axis in ("wale", "course"):
            rows.append(_dcase(clean, structure, 5, 7, axis, kw, _ok_for(structure, axis)))
    return rows


@pytest.mark.parametrize("spec,axis,ok", _rotation_rows())
def test_rotation_recovers_projected_gauge(spec, axis, ok):
    status = _status(spec, axis)
    assert status in ok, f"{axis} on {spec}: got {status}, accepted {ok}"


@pytest.mark.parametrize("spec,axis,ok", _fuzz_rows())
def test_fuzz_recovers_known_gauge(spec, axis, ok):
    status = _status(spec, axis)
    assert status in ok, f"{axis} on {spec}: got {status}, accepted {ok}"


@pytest.mark.parametrize("spec,axis,ok", _overlay_rows())
def test_contamination_recovers_known_gauge(spec, axis, ok):
    status = _status(spec, axis)
    assert status in ok, f"{axis} on {spec}: got {status}, accepted {ok}"


def test_every_degradation_xfail_names_a_real_row():
    """A key in DEGRADATION_XFAILS that matches no row would be a silent
    no-op: the row it was written for (renamed, or retuned) would run
    unmarked, or the mark would sit on nothing. Fail loudly instead."""
    ids = {p.id for p in _rotation_rows() + _fuzz_rows() + _overlay_rows()}
    stale = sorted(set(DEGRADATION_XFAILS) - ids)
    assert not stale, f"DEGRADATION_XFAILS keys matching no row: {stale}"


# --- Does detect_ruler_calibration recover the synthetic ruler? --------
# The ruler band is drawn with a KNOWN tick period, so the calibration
# detector can be scored too. The CONTROL rows put the same ruler on a
# flat ground with no fabric: if the detector could not read it there, a
# miss on fabric would say nothing about the fabric. Tolerance 5% of the
# tick period -- detected tick positions are whole pixels, so a 7.09px mm
# tick reads 7.0 (-1.2%) and an 11.25px sixteenth reads 11.0 (-2.2%).
# Major/minor classification is NOT scored: measured, it is recovered on
# almost no row (0 majors on every clean control) -- recorded, not gated.

from analysis.gauge_analysis import detect_ruler_calibration  # noqa: E402

from synthetic_fabric import render_overlays_only  # noqa: E402

RULER_TOL = 0.05

RULER_XFAILS = {
    "control-mildly_degraded-rulerMM":
        "flat ground, blur 1.2 + JPEG 75: reads 35.0 -- the MAJOR-tick spacing (5 x 7.09), not the minor tick",
    "fabric-clean-jersey-5x7-rulerMM":
        "centred mm ruler on clean coarse jersey: the band scan prefers the fabric and reads its 36.0px wale",
    "fabric-clean-jersey-5x7-y0.2_rulerMM":
        "mm ruler near the ROI top on clean coarse jersey: still reads the fabric's 36.0px wale",
    "fabric-clean-jersey-8x10-y0.2_ruler16th":
        "1/16-inch ruler near the top on clean fine jersey: reads 45.0 (the fabric's 2x wale), not 11.25",
    "fabric-mildly_degraded-jersey-5x7-y0.2_rulerMM":
        "mm ruler near the top under mild degradation: reads the fabric's 36.0px wale; the same ruler clean on flat ground reads 7.0",
}


def _ruler_case(kind, mk, structure, wpi, cpi, kw):
    spec = mk(structure, wpi, cpi, **kw)
    pid = f"control-{mk.__name__}-{_tag(kw)}" if kind == "control" else f"fabric-{mk.__name__}-{structure}-{wpi}x{cpi}-{_tag(kw)}"
    marks = [pytest.mark.xfail(strict=True, reason=RULER_XFAILS[pid])] if pid in RULER_XFAILS else []
    return pytest.param(kind, spec, id=pid, marks=marks)


RULER_ROWS = [
    _ruler_case("control", clean, "jersey", 5, 7, {"ruler_tick_px": MM_TICK_PX}),
    _ruler_case("control", clean, "jersey", 5, 7, {"ruler_tick_px": SIXTEENTH_TICK_PX}),
    _ruler_case("control", mildly_degraded, "jersey", 5, 7, {"ruler_tick_px": MM_TICK_PX}),
    _ruler_case("control", mildly_degraded, "jersey", 5, 7, {"ruler_tick_px": SIXTEENTH_TICK_PX}),
    _ruler_case("fabric", clean, "jersey", 5, 7, {"ruler_tick_px": MM_TICK_PX}),
    _ruler_case("fabric", clean, "jersey", 5, 7, {"ruler_tick_px": MM_TICK_PX, "ruler_center_y_frac": 0.2}),
    _ruler_case("fabric", clean, "jersey", 8, 10, {"ruler_tick_px": MM_TICK_PX, "ruler_center_y_frac": 0.2}),
    _ruler_case("fabric", clean, "jersey", 8, 10, {"ruler_tick_px": SIXTEENTH_TICK_PX, "ruler_center_y_frac": 0.2}),
    _ruler_case("fabric", clean, "rib1x1", 5, 7, {"ruler_tick_px": MM_TICK_PX, "ruler_center_y_frac": 0.2}),
    _ruler_case("fabric", clean, "garter", 5, 7, {"ruler_tick_px": MM_TICK_PX, "ruler_center_y_frac": 0.2}),
    _ruler_case("fabric", mildly_degraded, "jersey", 5, 7, {"ruler_tick_px": MM_TICK_PX, "ruler_center_y_frac": 0.2}),
]


@pytest.mark.parametrize("kind,spec", RULER_ROWS)
def test_ruler_detector_recovers_known_tick_period(kind, spec):
    img = render_overlays_only(spec) if kind == "control" else render_fabric(spec)
    res = detect_ruler_calibration(img)
    assert res.success, res.message
    ratio = res.minor_tick_spacing_px / spec.ruler_tick_px
    assert abs(ratio - 1.0) <= RULER_TOL, (
        f"minor tick spacing {res.minor_tick_spacing_px} vs known {spec.ruler_tick_px:.3f} (ratio {ratio:.3f})"
    )


def test_every_ruler_xfail_names_a_real_row():
    stale = sorted(set(RULER_XFAILS) - {p.id for p in RULER_ROWS})
    assert not stale, f"RULER_XFAILS keys matching no row: {stale}"
