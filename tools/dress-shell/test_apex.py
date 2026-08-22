"""Tests for the apex-based bust curvature — wired in as the committed
design (two apexes at theta=+-35deg, v=181mm, raised-cosine falloff,
amplitude 35.4mm, radius 70mm — approved).

Run:  cd tools/dress-shell && python3 -m unittest test_apex -v
"""

import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np

from bust_apex import ApexBustDepth, ApexError, ApexShellModel, verify_apex_placement
from coords import ShellCoords
from curvature import STANDOFF_TOLERANCE_MM as TOL, seat_standoff
from layout import SurfaceChart, load_layout, resolve_layout
from panels import load_panel_classes
from shell import ShellModel, dress_params

HERE = Path(__file__).resolve().parent


class TestWiredInDispatch(unittest.TestCase):
    """dress_params() defaults to bust="apex"; ShellModel(...) must
    dispatch to ApexShellModel with no call-site changes anywhere else."""

    def test_dress_params_is_apex_by_default(self):
        m = ShellModel(dress_params())
        self.assertIsInstance(m, ApexShellModel)

    def test_plain_is_the_single_ellipse_model(self):
        m = ShellModel(dress_params(bust="plain"))
        self.assertIs(type(m), ShellModel)

    def test_plain_shellparams_never_dispatches(self):
        from shell import ShellParams
        m = ShellModel(ShellParams())
        self.assertIs(type(m), ShellModel)

    def test_subclass_construction_is_not_re_dispatched(self):
        m = ApexShellModel(dress_params())
        self.assertIs(type(m), ApexShellModel)

    def test_decided_values_are_the_default(self):
        m = ShellModel(dress_params())
        self.assertAlmostEqual(m.apex_depth.apex_v, 181.0)
        self.assertAlmostEqual(m.apex_depth.apex_theta_deg, 35.0)
        self.assertAlmostEqual(m.apex_depth.radius_mm, 70.0)
        self.assertAlmostEqual(m.apex_depth.amplitude_mm, 35.4)

    def test_bad_bust_value_rejected(self):
        from shell import ShellError
        with self.assertRaises(ShellError):
            dress_params(bust="nonsense")


class TestFrozenSchedule(unittest.TestCase):
    """Circumferences, armhole angle, and the waist fillet are UNCHANGED
    by the apex bumps — only the local depth field near each apex moves."""

    @classmethod
    def setUpClass(cls):
        cls.old = ShellModel(dress_params(bust="plain"))
        cls.new = ShellModel(dress_params())

    def test_perimeter_schedule_frozen(self):
        for v in (-381.0, 0.0, 100.0, 152.4, 181.0, 203.2, 220.0, 240.0):
            self.assertAlmostEqual(
                float(self.old.section_perimeter(v)),
                float(self.new.section_perimeter(v)), places=5, msg=f"v={v}")

    def test_armhole_split_unchanged(self):
        self.assertAlmostEqual(self.old.split_theta, self.new.split_theta,
                               places=9)

    def test_waist_ring_unchanged(self):
        d_old, d_new = self.old.params.depth_curve, self.new.params.depth_curve
        self.assertAlmostEqual(d_old.waist_ring_circumference,
                               d_new.waist_ring_circumference, places=6)
        self.assertAlmostEqual(d_old.waist_ring_z, d_new.waist_ring_z, places=9)

    def test_cf_and_cb_unaffected_far_from_the_apex(self):
        # CF (theta=0) sits 79mm from each apex, outside the 70mm radius
        d = self.new.params.depth_curve
        vv = np.linspace(-381.0, 45.0, 300)   # below both apexes' v-reach
        res = np.asarray(d.depth_at(0.0, vv)) - np.asarray(self.old.b(vv))
        self.assertLess(float(np.max(np.abs(res))), 1e-6)

    def test_bod_a30_a55_back_within_tolerance(self):
        # the exact case the apex model was built to fix: these panels'
        # standoff broke under the compound model's uniform front bump
        c_old = ShellCoords(self.old)
        c_new = ShellCoords(self.new)
        ch_old = SurfaceChart(self.old, c_old)
        ch_new = SurfaceChart(self.new, c_new)
        classes = load_panel_classes(HERE / "panels.yaml")
        p213 = classes["p213"]
        for theta, s in ((30.0, -50.1), (55.0, -50.1)):
            so_old = seat_standoff(c_old, ch_old, p213.outline_w,
                                   p213.outline_h, theta, s, samples=7)
            so_new = seat_standoff(c_new, ch_new, p213.outline_w,
                                   p213.outline_h, theta, s, samples=7)
            self.assertLessEqual(so_new, TOL, (theta, s, so_new))
            self.assertAlmostEqual(so_old, so_new, places=2, msg=(theta, s))


class TestOccludingContourAndOrientation(unittest.TestCase):
    """Even with two OFF-AXIS apexes, the whole surface stays mirror-
    symmetric under theta -> -theta (the bump field is the SUM of a
    symmetric pair), so the occluding contour argument still holds."""

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
        self.assertLess(worst, 1e-4)

    def test_frame_orthonormal(self):
        rng = np.random.default_rng(3)
        th = rng.uniform(-math.pi, math.pi, 150)
        zz = rng.uniform(-380.0, 235.0, 150)
        f = self.m.frame(th, zz)
        self.assertLess(float(np.max(np.abs(
            np.linalg.norm(f["normal"], axis=-1) - 1.0))), 1e-6)
        self.assertLess(float(np.max(np.abs(
            (f["normal"] * f["e_theta"]).sum(-1)))), 1e-4)
        self.assertLess(float(np.max(np.abs(
            (f["normal"] * f["e_s"]).sum(-1)))), 1e-4)

    def test_coords_round_trip(self):
        rng = np.random.default_rng(4)
        ss = rng.uniform(self.c.s_min * 0.7, self.c.s_max * 0.7, 150)
        th = rng.uniform(-100.0, 100.0, 150)
        fw = self.c.forward(th, ss)
        t2, s2 = self.c.inverse(fw["position"], check_mm=0.5)
        p2 = self.c.forward(t2, s2)["position"]
        self.assertLess(
            float(np.max(np.linalg.norm(p2 - fw["position"], axis=-1))), 1e-6)

    def test_equal_arc_uniform(self):
        th = np.linspace(-100.0, 100.0, 201)
        pts = self.m.point(np.radians(th), np.full_like(th, 181.0))
        seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
        arc = np.concatenate([[0.0], np.cumsum(seg)])
        lin = (th - th[0]) / (th[-1] - th[0]) * arc[-1]
        self.assertLess(float(np.max(np.abs(arc - lin))), 0.05)


class TestApexPlacementAndFalloff(unittest.TestCase):
    def setUp(self):
        self.d = dress_params().depth_curve

    def test_falloff_exactly_zero_beyond_radius(self):
        v = self.d.apex_v
        just_inside = self.d.bump(self.d.apex_theta_deg
                                  + math.degrees((self.d.radius_mm - 1.0)
                                                 / self.d.r_ref), v)
        just_outside = self.d.bump(self.d.apex_theta_deg
                                   + math.degrees((self.d.radius_mm + 1.0)
                                                  / self.d.r_ref), v)
        self.assertGreater(float(just_inside), 0.0)
        self.assertEqual(float(just_outside), 0.0)

    def test_apex_depth_matches_old_compound_peak(self):
        depth = float(self.d.depth_at(self.d.apex_theta_deg, self.d.apex_v))
        self.assertAlmostEqual(depth, 121.08, delta=0.1)

    def test_placement_verification_reports_small_residual(self):
        check = verify_apex_placement(self.d)
        self.assertLess(abs(check["residual_deg"]), 5.0)

    def test_two_apexes_symmetric(self):
        v = self.d.apex_v
        left = float(self.d.depth_at(self.d.apex_theta_deg, v))
        right = float(self.d.depth_at(-self.d.apex_theta_deg, v))
        self.assertAlmostEqual(left, right, places=6)

    def test_bad_params_rejected(self):
        base = dress_params(bust="plain")
        with self.assertRaises(ApexError):
            ApexBustDepth(base_params=base, radius_mm=0.0)
        with self.assertRaises(ApexError):
            ApexBustDepth(base_params=base, apex_theta_deg=0.0)
        with self.assertRaises(ApexError):
            ApexBustDepth(base_params=base, apex_theta_deg=90.0)
        with self.assertRaises(ApexError):
            ApexBustDepth(base_params=base, amplitude_mm=-1.0)

    def test_double_wrap_rejected(self):
        with self.assertRaises(ApexError):
            ApexBustDepth(base_params=dress_params())


class TestLayoutStillLoads(unittest.TestCase):
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
