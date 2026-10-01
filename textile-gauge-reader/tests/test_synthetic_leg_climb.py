"""
Synthetic coverage of the wale LEG-LATTICE CLIMB (#325, in
_analyze_axis_v3): where does it fire on a fabric whose true pitch is
known, does it land on the true pitch, and does it ever fire on a render
whose evidence winner was ALREADY correct (a false climb)?

Harness only -- nothing here changes or tunes the detector. Measured on
main at f677bed (this file's first run), wale axis, centred 0.8 ROI,
5% tolerance:

  * Unrotated jersey, wpi 2.5..12 (true wale 72..15px, courses = 1.4x),
    seeds 7/8/9, clean AND mildly degraded: 90 renders. The leg harmonic
    is PRESENT -- a 0.5x candidate exists on 86/90 and its 2D template
    walk fails outright (0.00) on most of them -- but the leg lattice
    never WINS the evidence ranking (it scores ~0.05-0.48 against the
    fundamental's ~0.7-0.85), so the climb's precondition never holds:
    0 fires. The synthetic V does not reproduce knit_05's
    autocorrelation-dominant leg lattice; the climb is exercised by the
    real fixture (test_wale_leg_lattice_climb.py), not by these.
  * The same over 11 degradation conditions (blur 2/3, JPEG 40, fuzz,
    rotation, warp 0.02, ...): 330 renders, the leg lattice wins
    evidence on 0, the climb fires 2 times -- BOTH FALSE.
  * In-plane rotation, 0..15 deg x wpi 4/5/6/8/10 x seeds 7/8/9, clean
    and blur+JPEG: 300 renders, 0 correct climbs, 6 FALSE climbs (all at
    8 wpi, 11-13 deg) on the tree this file was written against.
    Mechanism, read off the candidates: rotation by >= ~9 deg zeroes
    the CORRECT winner's own template walk (0.00 on 60 of these renders
    -- the walk is axis-aligned and a tilted lattice does not repeat
    along it), and where the double still walks (>= SEED_HALF_TEMPLATE_
    MIN, 0.69-0.78 here) the climb takes it: the true 23.0px winner
    becomes ~41-46px. FIXED by the leg-slant orientation discriminator
    (_orientation_fundamental in _analyze_axis_v3, which runs after the
    climb and undoes it when the signed-orientation signal says the
    climbed-from period is the stitch pitch): the same 300 renders now
    read 0 fires / 0 false climbs. The precondition is still pinned
    below, because it is what makes the undo necessary.

`TGR_CLIMB_SWEEP=1 pytest tests/test_synthetic_leg_climb.py -s` prints
the rotation sweep's per-render table and its fire / accuracy counts.
"""
from __future__ import annotations

import functools
import os
import re
from typing import Optional

import pytest

from analysis.gauge_analysis import SEED_ASCEND_TEMPLATE_FAIL_MAX, SEED_HALF_TEMPLATE_MIN, analyze_gauge

from synthetic_fabric import FabricSpec, centered_roi, expected_periods, render_fabric

TOL = 0.05
_CLIMB_RE = re.compile(r"Climbed from the evidence winner ([0-9.]+)px")


@functools.lru_cache(maxsize=None)
def _wale(spec: FabricSpec):
    return analyze_gauge(render_fabric(spec), centered_roi(spec), "vertical").wale


def climbed_from(axis) -> Optional[float]:
    """The evidence winner the climb moved AWAY from, or None if it did
    not fire -- read off the reason _analyze_axis_v3 writes, which is
    the only place the event is recorded."""
    m = _CLIMB_RE.search(axis.selected_reason or "")
    return float(m.group(1)) if m else None


def _near(v: Optional[float], target: float) -> bool:
    return v is not None and abs(v / target - 1.0) <= TOL


def _evidence_winner(axis):
    return max(axis.candidate_details, key=lambda d: d.evidence_score if d.evidence_score is not None else -1.0)


def _jersey(wpi, seed=7, **kw) -> FabricSpec:
    return FabricSpec(structure="jersey", wales_per_inch=wpi, courses_per_inch=round(wpi * 1.4, 2), seed=seed, **kw)


# wpi 8 is left out on purpose: at that pitch the clean render's family is
# seeded at 1x/2x/4x and carries no 0.5x candidate at all (measured, all
# three seeds), so it cannot say anything about the leg harmonic.
LADDER = (2.5, 3, 3.5, 4, 5, 6, 7, 9, 10, 12)


@pytest.mark.parametrize("wpi", LADDER)
def test_leg_harmonic_present_and_climb_silent_on_unrotated_jersey(wpi):
    """The leg harmonic is in the image and its walk fails -- half the
    climb's precondition -- yet the leg never wins evidence, so the climb
    must stay silent and the reading stay on the true pitch. If the climb
    starts firing here, re-measure the coverage numbers above."""
    spec = _jersey(wpi)
    true = expected_periods(spec)["wale"][0]
    ax = _wale(spec)
    legs = [d for d in ax.candidate_details if _near(d.period_px, true / 2)]
    assert legs, f"no 0.5x candidate near {true / 2:.1f}px -- the leg harmonic is not exercised"
    assert legs[0].template_match_score is not None and legs[0].template_match_score <= SEED_ASCEND_TEMPLATE_FAIL_MAX
    assert not _near(_evidence_winner(ax).period_px, true / 2), "the leg lattice WON evidence -- the climb is now reachable here"
    assert climbed_from(ax) is None
    assert _near(ax.spacing_px, true), f"wale {ax.spacing_px} vs true {true:.1f}"


# The false climb: clean 8 wpi jersey rotated 12 deg, seed 7.
FALSE_CLIMB_SPEC = _jersey(8, seed=7, rotation_deg=12.0)


def test_false_climb_precondition_correct_winner_fails_its_walk_under_rotation():
    """Pins WHY the climb WOULD fire here, independently of the test
    below: the evidence winner IS the true (projected) pitch, rotation
    has zeroed its template walk, and its double walks. The orientation
    discriminator is what stops that becoming a false climb; if this
    stops holding, the undo is no longer being exercised by this spec."""
    ax = _wale(FALSE_CLIMB_SPEC)
    true = expected_periods(FALSE_CLIMB_SPEC)["wale"][0]
    winner = _evidence_winner(ax)
    assert _near(winner.period_px, true), f"evidence winner {winner.period_px} vs true {true:.1f}"
    assert winner.template_match_score is not None and winner.template_match_score <= SEED_ASCEND_TEMPLATE_FAIL_MAX
    double = next(d for d in ax.candidate_details if abs(d.period_px - 2 * winner.period_px) < 1e-6 * winner.period_px + 1e-9)
    assert double.template_match_score is not None and double.template_match_score >= SEED_HALF_TEMPLATE_MIN


def test_climb_never_fires_on_an_already_correct_winner():
    """Was a strict xfail ("FALSE CLIMB: at 12 deg the correct 23.0px
    winner's axis-aligned template walk fails (0.00) and its double walks
    (0.70), so the climb moves a correct reading to 2x (44.4px)") until the
    leg-slant orientation discriminator landed: the signed-orientation
    signal repeats at 23.0px and alternates at 11.5px, so the climb to
    46px is undone and the reason carries no "Climbed from"."""
    ax = _wale(FALSE_CLIMB_SPEC)
    true = expected_periods(FALSE_CLIMB_SPEC)["wale"][0]
    src = climbed_from(ax)
    assert not (src is not None and _near(src, true)), f"climbed from the correct {src}px to {ax.spacing_px:.1f}px"
    assert _near(ax.spacing_px, true), f"wale {ax.spacing_px} vs true {true:.1f}"


@pytest.mark.skipif(not os.environ.get("TGR_CLIMB_SWEEP"), reason="set TGR_CLIMB_SWEEP=1 for the climb coverage sweep")
def test_climb_coverage_sweep():
    """Diagnostic, not a gate (run with -s): the rotation sweep behind the
    docstring's numbers. Fails only on a crash."""
    fires = correct = false = 0
    n = 0
    print("\ncond ang wpi seed: true final climbed_from")
    for cname, kw in (("clean", {}), ("blurjpg", dict(blur_sigma=1.2, jpeg_quality=75))):
        for ang in (0, 3, 5, 7, 9, 10, 11, 12, 13, 15):
            for wpi in (4, 5, 6, 8, 10):
                for seed in (7, 8, 9):
                    spec = _jersey(wpi, seed=seed, rotation_deg=float(ang), **kw)
                    ax = _wale(spec)
                    true = expected_periods(spec)["wale"][0]
                    src = climbed_from(ax)
                    n += 1
                    if src is not None:
                        fires += 1
                        correct += _near(ax.spacing_px, true)
                        false += _near(src, true)
                        print(f"{cname:7s} {ang:2d} {wpi:3} {seed}: {true:.1f} {ax.spacing_px:.1f} {src}")
    print(f"{n} renders: climb fired {fires}, landed on the true pitch {correct}, false climbs {false}")
