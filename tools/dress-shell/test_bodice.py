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
        waist, under, bust, above = sec.rows
        self.assertAlmostEqual(waist["a"], 115.27, delta=0.02)
        self.assertAlmostEqual(waist["b"], 76.85, delta=0.02)
        self.assertAlmostEqual(under["v"], 152.4)
        self.assertAlmostEqual(under["circumference"], 711.2)   # 28 in, GIVEN
        self.assertAlmostEqual(under["a"], 144.28, delta=0.02)  # ratio 1.875 est.
        self.assertAlmostEqual(under["b"], 76.95, delta=0.02)
        self.assertAlmostEqual(bust["a"], 178.27, delta=0.02)
        self.assertAlmostEqual(bust["b"], 89.14, delta=0.02)
        # above-bust: UNVERIFIED garment-convention circumference (32 in),
        # ratio HELD at the bust value rather than extrapolated
        self.assertAlmostEqual(above["v"], 254.0)
        self.assertAlmostEqual(above["circumference"], 812.8)
        self.assertAlmostEqual(above["ratio"], 2.0)
        self.assertAlmostEqual(above["a"], 167.78, delta=0.02)
        self.assertAlmostEqual(above["b"], 83.89, delta=0.02)
        self.assertTrue(all(r["estimated"] for r in sec.rows))  # ratios are estimates

    def test_monotone_no_overshoot(self):
        # monotone RISE to the bust apex, monotone TAPER above it —
        # PCHIP is shape-preserving per segment, so the crest at the bust
        # is the global maximum with no overshoot anywhere
        sec = BodiceSections()
        bust = sec.rows[2]
        rise = np.linspace(0.0, bust["v"], 400)
        fall = np.linspace(bust["v"], sec.v_top, 200)
        for f in (sec.a, sec.b):
            self.assertTrue(bool(np.all(np.diff(f(rise)) >= -1e-12)))
            self.assertTrue(bool(np.all(np.diff(f(fall)) <= 1e-12)))
            v = np.linspace(0.0, sec.v_top, 600)
            self.assertTrue(bool(np.all(f(v) <= f(np.array(bust["v"])) + 1e-9)))

    def test_default_sections_hit_the_underbust(self):
        # the given 28 in underbust is an interpolation ANCHOR, not a wish
        sec = BodiceSections()
        self.assertAlmostEqual(sec.circumference(152.4), 711.2, places=6)


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
        # the underbust (ratio est. 1.875 on the smaller circumference) is
        # now the tightest ring: band 74.2 deg vs ~82 waist / ~78 bust —
        # still collapsing at the seam region, not mid-piece
        sec = BodiceSections()
        for v in (0.0, 152.4, 203.2):
            band = usable_band_deg(float(sec.a(v)), float(sec.b(v)), 53.0)
            self.assertGreater(band, 70.0)
            self.assertLess(band, 85.0)   # fails right where the seam already is


class TestWaistJunction(unittest.TestCase):
    def test_bodice_launches_vertically_at_the_waist(self):
        # With the underbust anchor the data is strongly convex (slow
        # growth to v=152.4, fast growth after), so monotone PCHIP clamps
        # the v=0 endpoint derivative to ZERO: the bodice leaves the waist
        # vertically at every theta. The secant alternative (straight
        # taper to the underbust) would give ~0.04 deg CF / ~10.8 deg side
        # — an interpolation CHOICE, flagged in the analysis report.
        sec = BodiceSections()
        for th in (0.0, 45.0, 90.0):
            tangent, dr = sec.waist_tangent_deg(th)
            self.assertAlmostEqual(tangent, 0.0, places=9)
            self.assertAlmostEqual(dr, 0.0, places=12)

    def test_crease_angle_against_the_skirt(self):
        # vertical bodice launch -> the crease is the skirt tangent alone
        sec = BodiceSections()
        st = ShellModel(ShellParams()).waist_tangent_deg()
        self.assertAlmostEqual(sec.crease_angle_deg(0.0, st), 41.29, delta=0.05)
        self.assertAlmostEqual(sec.crease_angle_deg(90.0, st), 41.29, delta=0.05)


class TestBodiceSurface(unittest.TestCase):
    def test_equal_arc_and_orientation(self):
        from bodice import BodiceSurface
        surf = BodiceSurface(BodiceSections(), v_max=250.0)
        p = surf.point(np.array(math.pi / 2), np.array(100.0))
        # Newton equal-arc residual bottoms out ~2e-6 mm on the k~2 sections
        self.assertLess(abs(float(p[..., 1])), 1e-5)   # theta=90 -> major axis
        self.assertGreater(float(p[..., 0]), 0.0)
        n = surf.normal(np.array(0.0), np.array(100.0))
        self.assertGreater(float(n[..., 1]), 0.9)      # CF normal points +y

    def test_band_standoff_honors_neckline_keepout(self):
        from bodice import BodiceSurface, band_seat_standoff
        from neckline import NecklineCurve, DESIGN_NECKLINE
        neck = NecklineCurve(DESIGN_NECKLINE)
        surf = BodiceSurface(BodiceSections(), v_max=250.0)
        # a 59.2mm-tall footprint centered at v=230 tops out above the
        # keep-out floor (244 at CF) -> illegal
        so = band_seat_standoff(surf, neck, 29.2, 59.2, 0.0, 230.0)
        self.assertFalse(np.isfinite(so))
        # low on the bodice the same footprint is legal and seats well
        so = band_seat_standoff(surf, neck, 29.2, 59.2, 0.0, 100.0)
        self.assertTrue(np.isfinite(so))
        self.assertLess(so, 1.0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
