"""Tests for the bodice cross-section solver (gate stage — no shell
geometry exists yet).

Run:  cd tools/dress-shell && python3 -m unittest test_bodice -v
"""

import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np

from bodice import (BodiceAnchor, BodiceSections, ellipse_perimeter,
                    plan_curvature_radius, solve_semi_axes, usable_band_deg)
from shell import ShellModel, ShellParams


class TestSolver(unittest.TestCase):
    def test_anchor_solutions_hit_perimeter(self):
        for c, q in [(609.6, 1.5), (863.6, 2.0), (700.0, 1.7)]:
            a, b, res = solve_semi_axes(c, q)
            self.assertAlmostEqual(a / b, q, places=12)
            self.assertLess(abs(res), 1e-9)          # machine-level residual
            self.assertAlmostEqual(ellipse_perimeter(a, b), c, places=9)

    def test_solved_anchor_values(self):
        sec = BodiceSections()
        waist, bust = sec.rows[0], sec.rows[-1]
        self.assertAlmostEqual(waist["a"], 115.27, delta=0.02)
        self.assertAlmostEqual(waist["b"], 76.85, delta=0.02)
        self.assertAlmostEqual(bust["a"], 178.27, delta=0.02)
        self.assertAlmostEqual(bust["b"], 89.14, delta=0.02)
        self.assertTrue(all(r["estimated"] for r in sec.rows))  # ratios are estimates

    def test_monotone_no_overshoot(self):
        sec = BodiceSections()
        v = np.linspace(0.0, sec.v_top, 500)
        a, b = sec.a(v), sec.b(v)
        self.assertTrue(bool(np.all(np.diff(a) >= -1e-12)))
        self.assertTrue(bool(np.all(np.diff(b) >= -1e-12)))
        self.assertTrue(bool(np.all(a <= sec.rows[-1]["a"] + 1e-9)))
        self.assertTrue(bool(np.all(b <= sec.rows[-1]["b"] + 1e-9)))

    def test_underbust_anchor_slots_in_when_supplied(self):
        # the moment the blocked circumference exists, it becomes an anchor
        sec = BodiceSections((
            BodiceAnchor("waist", 0.0, 609.6, 1.5, True),
            BodiceAnchor("underbust", 152.4, 750.0, 1.85, True),
            BodiceAnchor("bust apex", 203.2, 863.6, 2.0, True),
        ))
        self.assertAlmostEqual(sec.circumference(152.4), 750.0, places=6)


class TestCurvature(unittest.TestCase):
    def test_user_quoted_bust_radii(self):
        a, b, _ = solve_semi_axes(863.6, 2.0)
        self.assertAlmostEqual(float(plan_curvature_radius(a, b, 0.0)),
                               a * a / b, places=9)
        self.assertAlmostEqual(a * a / b, 356.5, delta=0.5)   # user: ~356 at CF
        self.assertAlmostEqual(b * b / a, 44.6, delta=0.3)    # user: ~45 at side

    def test_cf_flattest_side_tightest(self):
        sec = BodiceSections()
        for v in (0.0, 152.4, 203.2):
            a, b = float(sec.a(v)), float(sec.b(v))
            r = plan_curvature_radius(a, b, np.linspace(0, 90, 91))
            self.assertTrue(bool(np.all(np.diff(r) <= 1e-9)))  # monotone down

    def test_usable_band_ends_near_the_piece_seam(self):
        sec = BodiceSections()
        for v in (0.0, 152.4, 203.2):
            band = usable_band_deg(float(sec.a(v)), float(sec.b(v)), 53.0)
            self.assertGreater(band, 75.0)
            self.assertLess(band, 85.0)   # fails right where the seam already is


class TestWaistJunction(unittest.TestCase):
    def test_bodice_tangent_varies_with_theta(self):
        sec = BodiceSections()
        cf, dr_cf = sec.waist_tangent_deg(0.0)
        side, dr_side = sec.waist_tangent_deg(90.0)
        self.assertAlmostEqual(cf, 3.46, delta=0.05)
        self.assertAlmostEqual(side, 17.23, delta=0.05)
        self.assertGreater(dr_cf, 0.0)    # bodice widens upward everywhere
        self.assertGreater(dr_side, 0.0)

    def test_crease_angle_against_the_skirt(self):
        sec = BodiceSections()
        st = ShellModel(ShellParams()).waist_tangent_deg()
        self.assertAlmostEqual(sec.crease_angle_deg(0.0, st), 44.75, delta=0.1)
        self.assertAlmostEqual(sec.crease_angle_deg(90.0, st), 58.51, delta=0.1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
