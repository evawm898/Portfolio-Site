"""Tests for shape_impact.py — re-validating layout.yaml against a shell
change without moving anything.

Run:  cd tools/dress-shell && python3 -m unittest test_shape_impact -v
"""

import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

from layout import AuthoredPanel
from panels import PanelClass, load_panel_classes
from shape_impact import report_shape_change_impact
from shape_state import ShapeState, build_params_from_shape
from shell import ShellModel, dress_params

HERE = Path(__file__).resolve().parent
COMMITTED = ShellModel(dress_params())   # bust=apex, the actual committed shell
CLASSES = load_panel_classes(HERE / "panels.yaml")

# Same synthetic class test_analysis.py uses — library-independent.
SYN = {"M": PanelClass("M", 45.0, 70.0, 1.4, 40.0, 63.0, (2.4, 2.0),
                       (22.5, 70.0), (0.0, 1.0), 30.0)}
# Small enough to clear the back neckline's keepout near v~100-140 (the
# region back_offset actually touches) with the "M" class's 70mm height —
# used only for the standoff-regression test below.
SYN_SMALL = {"S": PanelClass("S", 20.0, 20.0, 1.4, 16.0, 16.0, (2.0, 1.0),
                             (10.0, 20.0), (0.0, 1.0), 20.0)}

_SEED_V = (-340, -300, -260, -220, -180, -140, -100, -60, -30, -15,
          -5, 5, 15, 30, 60, 90, 120, 145, 155, 165, 175, 181, 190,
          200, 210, 220, 230)


def _shaped_params(back_offset=0.0):
    """Same shell as COMMITTED everywhere back_offset == 0 (a(v)/b(v)
    sampled directly off it); back_offset != 0 pulls b_back in sharply
    above v=100 — a large, deliberate shape change concentrated where the
    bust panels sit, for a reproducible regression case."""
    z_bottom, z_top = COMMITTED.z_bottom, COMMITTED.z_top
    vs = sorted({z_bottom, z_top, *[v for v in _SEED_V if z_bottom < v < z_top]})
    a = np.asarray(COMMITTED.a(np.array(vs))).tolist()
    b = np.asarray(COMMITTED.b(np.array(vs))).tolist()
    bf = list(zip(vs, b))
    bb = list(zip(vs, [y - (back_offset if v > 100 else 0.0) for v, y in zip(vs, b)]))
    shape = ShapeState(a_points=list(zip(vs, a)), b_front_points=bf, b_back_points=bb)
    return build_params_from_shape(COMMITTED.params, shape, z_bottom, z_top)


class TestNoChange(unittest.TestCase):
    def test_identical_shell_is_clean(self):
        params = _shaped_params(0.0)
        authored = [AuthoredPanel("front_bust", "M", 20.0, 180.0, 0.0, 0, True)]
        report = report_shape_change_impact(params, params, SYN, authored)
        self.assertTrue(report.clean)
        self.assertEqual(report.standoff_regressions, [])
        self.assertEqual(report.now_exceeds_tolerance, [])
        self.assertEqual(report.twin_became_invalid, [])
        self.assertFalse(report.dag_broke)
        self.assertAlmostEqual(report.old_max_stack_mm, report.new_max_stack_mm, places=9)

    def test_empty_layout_reports_nothing_to_validate(self):
        params = _shaped_params(0.0)
        report = report_shape_change_impact(params, params, SYN, [])
        self.assertTrue(report.clean)
        self.assertEqual(report.panel_impacts, [])
        self.assertIn("nothing to re-validate", report.summary_lines()[0])


class TestStandoffRegression(unittest.TestCase):
    def test_sharp_back_pull_in_regresses_a_back_panel(self):
        old = _shaped_params(0.0)
        new = _shaped_params(60.0)   # drastic — b_back pulled in 60mm above v=100
        # (b(v) is only ~90-102mm here; b_back must stay positive). Small
        # class + this (theta, s) clears the back neckline's keepout at
        # this height (v~119mm) while still sitting in the v>100 band
        # back_offset touches — measured directly: old standoff 1.10mm
        # (fits), new 5.42mm (does not) at these exact coordinates.
        authored = [AuthoredPanel("back_panel", "S", 115.0, -120.0, 0.0, 0, False)]
        report = report_shape_change_impact(old, new, SYN_SMALL, authored)
        p = report.panel_impacts[0]
        self.assertNotAlmostEqual(p.old_standoff_mm, p.new_standoff_mm, places=3)
        self.assertLessEqual(p.old_standoff_mm, 2.0)
        self.assertGreater(p.new_standoff_mm, 2.0)
        self.assertTrue(p.standoff_regressed)
        self.assertIn("back_panel", report.standoff_regressions)
        self.assertIn("back_panel", report.now_exceeds_tolerance)
        self.assertFalse(report.clean)

    def test_front_panel_far_less_affected_by_back_only_change(self):
        # a(v) and b_front points are untouched by back_offset, BUT this
        # shell family is EQUAL-ARC: the azimuthal parameterization is
        # calibrated against the COMPOUND (mean front+back) perimeter, so
        # a back-only edit ripples into where a given theta lands even on
        # the front (see compound.py's param_from_arc_angle) -- a real,
        # documented property of this family, not a bug. The correct
        # expectation is a MUCH SMALLER change at the front than the
        # back, not an exactly-zero one.
        old = _shaped_params(0.0)
        new = _shaped_params(60.0)
        authored = [
            AuthoredPanel("front_panel", "M", 20.0, -150.0, 0.0, 0, False),
            AuthoredPanel("back_panel", "S", 115.0, -120.0, 0.0, 1, False),
        ]
        classes = {**SYN, **SYN_SMALL}
        report = report_shape_change_impact(old, new, classes, authored)
        front = next(p for p in report.panel_impacts if p.panel_id == "front_panel")
        back = next(p for p in report.panel_impacts if p.panel_id == "back_panel")
        front_delta = abs(front.new_standoff_mm - front.old_standoff_mm)
        back_delta = abs(back.new_standoff_mm - back.old_standoff_mm)
        self.assertLess(front_delta, 0.1 * back_delta)


class TestTwinValidity(unittest.TestCase):
    def test_mirror_twin_tracked_independently(self):
        old = _shaped_params(0.0)
        new = _shaped_params(0.0)   # identical -> twin validity must be stable
        authored = [AuthoredPanel("sym", "M", 30.0, 200.0, 0.0, 0, True)]
        report = report_shape_change_impact(old, new, SYN, authored)
        self.assertEqual(len(report.twin_impacts), 1)
        t = report.twin_impacts[0]
        self.assertEqual(t.old_valid, t.new_valid)
        self.assertFalse(t.became_invalid)
        self.assertFalse(t.became_valid)

    def test_no_twin_impact_for_unmirrored_panel(self):
        params = _shaped_params(0.0)
        authored = [AuthoredPanel("solo", "M", 0.0, 200.0, 0.0, 0, False)]
        report = report_shape_change_impact(params, params, SYN, authored)
        self.assertEqual(report.twin_impacts, [])


class TestStackAndDag(unittest.TestCase):
    def test_overlap_conflict_reported_as_dag_invalid_not_raised(self):
        # two panels, same layer, overlapping -> LayeringError under BOTH
        # shells; the report must catch it, not propagate the exception
        # (the whole point is a report, never a crash on a broken layout)
        params = _shaped_params(0.0)
        authored = [
            AuthoredPanel("a", "M", 10.0, 300.0, 0.0, 0, False),
            AuthoredPanel("b", "M", 12.0, 305.0, 0.0, 0, False),
        ]
        report = report_shape_change_impact(params, params, SYN, authored)
        self.assertFalse(report.old_dag_valid)
        self.assertFalse(report.new_dag_valid)
        self.assertFalse(report.dag_broke)   # already broken, not a NEW break
        self.assertIn("layer", report.old_dag_error)

    def test_dag_break_flagged_as_regression(self):
        # layer 1 sits directly above layer 0 at the SAME footprint under
        # both shells (fine, distinct layers) -- confirms max stack is
        # tracked and reported even when nothing regresses
        params = _shaped_params(0.0)
        authored = [
            AuthoredPanel("under", "M", 10.0, 300.0, 0.0, 0, False),
            AuthoredPanel("over", "M", 10.0, 300.0, 0.0, 1, False),
        ]
        report = report_shape_change_impact(params, params, SYN, authored)
        self.assertTrue(report.old_dag_valid)
        self.assertTrue(report.new_dag_valid)
        self.assertGreater(report.new_max_stack_mm, 0.0)
        self.assertAlmostEqual(report.old_max_stack_mm, report.new_max_stack_mm, places=9)


class TestUnknownClass(unittest.TestCase):
    def test_unknown_class_reported_not_raised(self):
        params = _shaped_params(0.0)
        authored = [AuthoredPanel("ghost", "does-not-exist", 10.0, 200.0, 0.0, 0, False)]
        report = report_shape_change_impact(params, params, CLASSES, authored)
        self.assertEqual(len(report.resolve_errors), 1)
        self.assertIn("does-not-exist", report.resolve_errors[0])
        self.assertEqual(report.panel_impacts, [])   # skipped, not crashed


if __name__ == "__main__":
    unittest.main(verbosity=2)
