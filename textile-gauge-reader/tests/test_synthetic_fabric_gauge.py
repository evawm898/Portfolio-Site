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
  * garter, 8x10: wale axis reads the 2x double-period on the bump
    lattice; course axis is fine at both gauges.

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
    _case(clean, "garter", 8, 10, "wale",
          xfail_reason="fine-gauge garter wale reads the 2x double period on the bump lattice (44.0px vs 22.5 true)"),
    _case(clean, "garter", 8, 10, "course", ok=("primary", "alternate")),
    _case(mildly_degraded, "garter", 5, 7, "wale"),
    _case(mildly_degraded, "garter", 5, 7, "course", ok=("primary", "alternate")),
    _case(mildly_degraded, "garter", 8, 10, "wale",
          xfail_reason="same 2x double period as the clean fine-gauge garter wale case"),
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
