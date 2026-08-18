"""Tests for the compound-section bust cup, wired in as the committed
design (bust_point_radius = 30 mm, join_radius = 0 mm — approved).

Run:  cd tools/dress-shell && python3 -m unittest test_compound -v
"""

import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np

from compound import CompoundDepth, CompoundError, CompoundShellModel, compound_params
from coords import ShellCoords
from layout import SurfaceChart, load_layout, resolve_layout
from panels import load_panel_classes
from shell import ShellModel, dress_params

HERE = Path(__file__).resolve().parent


class TestWiredInDispatch(unittest.TestCase):
    """dress_params() defaults to compound; ShellModel(...) must dispatch
    to CompoundShellModel with no call-site changes anywhere else."""

    def test_dress_params_is_compound_by_default(self):
        m = ShellModel(dress_params())
        self.assertIsInstance(m, CompoundShellModel)

    def test_compound_false_is_the_plain_single_ellipse_model(self):
        m = ShellModel(dress_params(compound=False))
        self.assertIs(type(m), ShellModel)   # exactly ShellModel, no dispatch

    def test_plain_shellparams_never_dispatches(self):
        from shell import ShellParams
        m = ShellModel(ShellParams())
        self.assertIs(type(m), ShellModel)

    def test_subclass_construction_is_not_re_dispatched(self):
        # CompoundShellModel(params) must not recurse back through the
        # dispatch check (cls is ShellModel is False for the subclass)
        m = CompoundShellModel(dress_params())
        self.assertIs(type(m), CompoundShellModel)

    def test_decided_values_are_the_default(self):
        m = ShellModel(dress_params())
        self.assertAlmostEqual(m.cd.bust_point_radius, 30.0)
        self.assertAlmostEqual(m.cd.join_radius, 0.0)
        self.assertAlmostEqual(m.cd.bust_point_v, 181.0)


class TestFrozenSchedule(unittest.TestCase):
    """The whole point of the compound construction: circumferences,
    armhole angle, and the waist fillet are UNCHANGED by wiring in the
    bust cup — only the front/back depth distribution moves."""

    @classmethod
    def setUpClass(cls):
        cls.old = ShellModel(dress_params(compound=False))
        cls.new = ShellModel(dress_params())

    def test_perimeter_schedule_frozen(self):
        for v in (-381.0, 0.0, 100.0, 152.4, 181.0, 203.2, 220.0, 240.0):
            self.assertAlmostEqual(
                float(self.old.section_perimeter(v)),
                float(self.new.section_perimeter(v)), places=6, msg=f"v={v}")

    def test_armhole_split_unchanged(self):
        self.assertAlmostEqual(self.old.split_theta, self.new.split_theta,
                               places=9)

    def test_waist_ring_unchanged(self):
        d_old, d_new = self.old.params.depth_curve, self.new.params.depth_curve
        self.assertAlmostEqual(d_old.waist_ring_circumference,
                               d_new.waist_ring_circumference, places=6)
        self.assertAlmostEqual(d_old.waist_ring_z, d_new.waist_ring_z, places=9)

    def test_back_profile_identical_to_old_single_ellipse(self):
        vv = np.linspace(-381.0, 240.0, 2001)
        res = (np.asarray(self.new.params.depth_curve.b_back(vv))
               - np.asarray(self.old.b(vv)))
        self.assertLess(float(np.max(np.abs(res))), 1e-9)

    def test_below_v45_front_equals_back(self):
        d = self.new.params.depth_curve
        vv = np.linspace(-381.0, 45.0, 500)
        res = np.asarray(d.b_front(vv)) - np.asarray(d.b_back(vv))
        self.assertLess(float(np.max(np.abs(res))), 1e-9)

    def test_front_narrower_a_above_v45(self):
        # a(v) is re-solved so the compound perimeter matches the frozen
        # schedule -> strictly narrower half-width wherever the front
        # deepens (everywhere in [45, 220])
        for v in (100.0, 152.4, 181.0, 203.2):
            self.assertLess(float(self.new.cd.a(v)), float(self.old.a(v)))


class TestOccludingContourAndOrientation(unittest.TestCase):
    def setUp(self):
        self.m = ShellModel(dress_params())
        self.c = ShellCoords(self.m)

    def test_contour_still_exactly_0_180(self):
        worst = 0.0
        for th in (0.0, 180.0):
            for v in np.linspace(-380.0, 235.0, 60):
                s = float(self.c.s_of_z(v))
                n = self.c.forward(th, s)["normal"]
                worst = max(worst, abs(float(n[0])))
        self.assertLess(worst, 1e-5)

    def test_frame_orthonormal(self):
        rng = np.random.default_rng(3)
        th = rng.uniform(-math.pi, math.pi, 200)
        zz = rng.uniform(-380.0, 235.0, 200)
        f = self.m.frame(th, zz)
        self.assertLess(float(np.max(np.abs(
            np.linalg.norm(f["normal"], axis=-1) - 1.0))), 1e-9)
        self.assertLess(float(np.max(np.abs(
            (f["normal"] * f["e_theta"]).sum(-1)))), 1e-6)
        self.assertLess(float(np.max(np.abs(
            (f["normal"] * f["e_s"]).sum(-1)))), 1e-6)

    def test_coords_round_trip(self):
        rng = np.random.default_rng(4)
        ss = rng.uniform(self.c.s_min, self.c.s_max, 300)
        th = rng.uniform(-179.0, 179.0, 300)
        keep = self.c.z_of_s(ss) <= self.m.z_top_at(th) - 1e-6
        th, ss = th[keep], ss[keep]
        fw = self.c.forward(th, ss)
        t2, s2 = self.c.inverse(fw["position"], check_mm=None)
        p2 = self.c.forward(t2, s2)["position"]
        self.assertLess(
            float(np.max(np.linalg.norm(p2 - fw["position"], axis=-1))), 1e-6)


class TestBustPointCorner(unittest.TestCase):
    def test_blended_corner_reaches_requested_radius(self):
        d = CompoundDepth(base=dress_params(compound=False).depth_curve,
                          bust_point_radius=30.0)
        fp = d.front
        mr = fp._corner_min_radius(fp.bust_point_v, fp.blend_halfwidth,
                                   fp._lower, fp._lower_slope,
                                   fp._upper, fp._upper_slope)
        self.assertAlmostEqual(mr, 30.0, places=3)
        self.assertEqual(fp.corner_angle_deg(), 0.0)   # blended away

    def test_sharp_at_zero_radius(self):
        d = CompoundDepth(base=dress_params(compound=False).depth_curve,
                          bust_point_radius=0.0)
        self.assertEqual(d.front.blend_halfwidth, 0.0)
        self.assertGreater(d.front.corner_angle_deg(), 30.0)

    def test_join_defaults_sharp(self):
        d = CompoundDepth(base=dress_params(compound=False).depth_curve)
        self.assertEqual(d.join_radius, 0.0)
        self.assertGreater(d.front.join_angle_deg(), 5.0)

    def test_bad_radius_rejected(self):
        base = dress_params(compound=False).depth_curve
        with self.assertRaises(CompoundError):
            CompoundDepth(base=base, bust_point_radius=-1.0)
        with self.assertRaises(CompoundError):
            CompoundDepth(base=base, join_radius=-1.0)


class TestCompoundParamsGuards(unittest.TestCase):
    def test_double_wrap_rejected(self):
        # dress_params()'s default already carries a CompoundDepth;
        # compound_params() must refuse to wrap it again
        with self.assertRaises(CompoundError):
            compound_params(base_params=dress_params())

    def test_explicit_single_ellipse_base_ok(self):
        p = compound_params(base_params=dress_params(compound=False))
        self.assertIsInstance(p.depth_curve, CompoundDepth)


class TestLayoutStillLoads(unittest.TestCase):
    """The committed layout.yaml must remain structurally legal on the
    wired-in compound shell (seating quality is a separate, informational
    concern reported by curvature.py — see the standoff regression on
    bod-a30/bod-a55 the editor now flags)."""

    def test_layout_resolves_with_no_errors(self):
        model = ShellModel(dress_params())
        coords = ShellCoords(model)
        chart = SurfaceChart(model, coords)
        classes = load_panel_classes(HERE / "panels.yaml")
        authored = load_layout(HERE / "layout.yaml")
        placed, errors = resolve_layout(chart, classes, authored)
        self.assertEqual(errors, [])
        self.assertEqual(len(placed), 29)
        self.assertTrue(all(p.valid for p in placed),
                        [p.panel_id for p in placed if not p.valid])


if __name__ == "__main__":
    unittest.main(verbosity=2)
