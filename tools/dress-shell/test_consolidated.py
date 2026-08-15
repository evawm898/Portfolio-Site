"""Tests for the consolidated-spec gate machinery: neckline v3, the
armhole solve, and the waist fillet construction.

Run:  cd tools/dress-shell && python3 -m unittest test_consolidated -v
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np

from bodice import solve_theta_armhole
from fillet import FilletError, FilletParams, WaistFillet
from neckline import NecklineError, NecklineV3, NecklineV3Params
from shell import ShellModel, dress_params

MODEL = ShellModel(dress_params())


class TestNecklineV3(unittest.TestCase):
    def test_heights_exact_and_decay_fraction(self):
        n = NecklineV3(NecklineV3Params())
        self.assertAlmostEqual(float(n.height(0.0)), 220.0, places=9)
        self.assertAlmostEqual(float(n.height(82.0)), 240.0, places=9)
        self.assertAlmostEqual(float(n.height(90.0)), 190.0, places=9)
        self.assertAlmostEqual(float(n.height(180.0)), 145.0, places=9)
        self.assertAlmostEqual(n.drop_fraction(30.0), 2.0 / 3.0, places=9)

    def test_cf_corner_switch(self):
        smooth = NecklineV3(NecklineV3Params(cf_corner=False))
        corner = NecklineV3(NecklineV3Params(cf_corner=True))
        self.assertEqual(smooth.cf_tangent, 0.0)
        self.assertGreater(corner.cf_tangent, 0.1)
        # rise_bow=0 + corner -> perfectly straight rise
        straight = NecklineV3(NecklineV3Params(cf_corner=True, rise_bow=0.0))
        th = np.linspace(0, 82, 200)
        line = 220.0 + (240.0 - 220.0) * th / 82.0
        self.assertLess(float(np.max(np.abs(straight.height(th) - line))), 1e-9)

    def test_peak_is_a_corner_with_steepest_departure(self):
        n = NecklineV3(NecklineV3Params())
        self.assertLess(n.peak_departure_slope, -6.0)
        # not globally monotone: CF is a local max (dips nowhere before it)
        self.assertGreater(float(n.height(82.0)), float(n.height(0.0)))
        self.assertGreater(float(n.height(0.0)), float(n.height(180.0)))

    def test_ordering_asserted(self):
        with self.assertRaises(NecklineError):
            NecklineV3(NecklineV3Params(cf_height=250.0))   # cf > peak

    def test_cb_ease_and_mirror(self):
        n = NecklineV3(NecklineV3Params())
        self.assertLess(abs(float(n.slope(179.99))), 0.02)
        th = np.linspace(0, 180, 300)
        self.assertTrue(bool(np.all(n.height(th) == n.height(-th))))


class TestArmhole(unittest.TestCase):
    def test_solve_and_ordering(self):
        r = solve_theta_armhole(MODEL)
        self.assertGreater(r["theta_armhole"], 90.0)   # behind the side
        self.assertLess(r["theta_armhole"], 115.0)
        self.assertGreater(r["theta_armhole"], 82.0)   # behind the peak
        # equal-arc consistency: back extent * P / 360 == the tape
        back = r["back_extent_deg"] / 360.0 * r["section_perimeter"]
        self.assertAlmostEqual(back, 360.0, places=6)

    def test_chord_differs_materially(self):
        r = solve_theta_armhole(MODEL)
        self.assertGreater(abs(r["chord_vs_arc_mm"]), 5.0)


class TestWaistFillet(unittest.TestCase):
    def test_default_construction(self):
        f = WaistFillet(FilletParams())
        self.assertAlmostEqual(f.waist_after_mm, 609.6, places=6)
        self.assertLess(f.g1_residual_deg, 1e-6)
        self.assertLess(f.virtual_waist_circumference, 609.6)
        self.assertLess(f.z1, f.z_center)
        self.assertLess(f.z_center, f.z2)
        # conic halves the curvature jump vs circular
        self.assertLess(sum(f.conic_kappa_jump), sum(f.circular_kappa_jump))

    def test_radius_sweep_solves(self):
        for R in (15.0, 25.0, 40.0):
            f = WaistFillet(FilletParams(fillet_radius=R))
            self.assertAlmostEqual(f.waist_after_mm, 609.6, places=6)

    def test_bad_params_fail_loudly(self):
        with self.assertRaises(FilletError):
            WaistFillet(FilletParams(fillet_radius=-1.0))
        with self.assertRaises(FilletError):
            WaistFillet(FilletParams(fillet_type="bezier"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
