"""Tests for the consolidated-spec gate machinery: neckline v3, the
armhole solve, and the waist fillet construction.

Run:  cd tools/dress-shell && python3 -m unittest test_consolidated -v
"""

import math
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


class TestLayoutOnConsolidatedDress(unittest.TestCase):
    """Free rotation, the armhole seam band, and the DERIVED waist
    keep-out — the layout-side consequences of the consolidated spec."""

    @classmethod
    def setUpClass(cls):
        from coords import ShellCoords
        from layout import SurfaceChart
        from panels import load_panel_classes
        from pathlib import Path
        cls.coords = ShellCoords(MODEL)
        cls.chart = SurfaceChart(MODEL, cls.coords)
        cls.classes = load_panel_classes(
            Path(__file__).resolve().parent / "panels.yaml")

    def test_split_and_derived_band_on_chart(self):
        ch = self.chart
        self.assertAlmostEqual(ch.split_theta, MODEL.split_theta, places=12)
        self.assertGreater(ch.split_theta, 90.0)
        self.assertTrue(ch.band_derived)
        z_lo, z_hi = MODEL.params.depth_curve.fillet_zone
        self.assertAlmostEqual(ch.band_s_hi, float(self.coords.s_of_z(z_lo)),
                               places=9)
        self.assertAlmostEqual(ch.band_s_lo, float(self.coords.s_of_z(z_hi)),
                               places=9)
        self.assertLess(ch.band_s_lo, 0.0)
        self.assertGreater(ch.band_s_hi, 0.0)

    def test_free_rotation_places_and_twins(self):
        from layout import AuthoredPanel, resolve_layout
        placed, errors = resolve_layout(self.chart, self.classes, [
            AuthoredPanel("r37", "p213", 40.0, 200.0, 37.0, 0, True)])
        self.assertEqual(errors, [])
        self.assertEqual(len(placed), 2)
        self.assertTrue(all(p.valid for p in placed), [p.problems for p in placed])
        twin = placed[1]
        self.assertIn(twin.rotation, (37.0, 217.0))   # src or src + 180
        self.assertEqual(twin.content_rotation, twin.rotation)

    def test_rotation_changes_footprint_legality(self):
        # p370 is 53 x 93: near the hem edge, upright it fits, rotated 90
        # its long side runs laterally and the meridian extent shrinks —
        # and vice versa near the seam. Just assert rotation genuinely
        # changes the standoff (the footprint really rotates).
        from curvature import seat_standoff
        cls = self.classes["p370"]
        s0 = seat_standoff(self.coords, self.chart, cls.outline_w,
                           cls.outline_h, 40.0, 200.0, rotation=0.0)
        s90 = seat_standoff(self.coords, self.chart, cls.outline_w,
                            cls.outline_h, 40.0, 200.0, rotation=90.0)
        s180 = seat_standoff(self.coords, self.chart, cls.outline_w,
                             cls.outline_h, 40.0, 200.0, rotation=180.0)
        self.assertAlmostEqual(s0, s180, places=9)    # symmetric footprint
        self.assertNotAlmostEqual(s0, s90, places=3)

    def test_armhole_seam_band_keepout(self):
        from layout import outline_problems
        cls = self.classes["p213"]
        split = self.chart.split_theta
        r = self.chart.r_theta(split, 200.0)
        w_deg = math.degrees((cls.outline_w / 2.0) / r)
        # centered so the outline edge sits ~2 mm short of the seam:
        # inside the 8 mm band -> flagged, but NOT crossing the seam
        theta = split - w_deg - math.degrees(2.0 / r)
        probs = outline_problems(self.chart, cls, theta, 200.0, 0.0)
        self.assertTrue(any("armhole seam band" in p for p in probs), probs)
        self.assertFalse(any("crosses the FRONT piece seam" in p for p in probs))
        # backed off past the band it goes clean
        clear = split - w_deg - math.degrees(12.0 / r)
        self.assertEqual(outline_problems(self.chart, cls, clear, 200.0, 0.0), [])

    def test_waist_band_blocks_straddling_footprints(self):
        from layout import outline_problems
        cls = self.classes["p213"]
        probs = outline_problems(self.chart, cls, 30.0, 0.0, 0.0)
        self.assertTrue(any("waist seam band" in p for p in probs), probs)


if __name__ == "__main__":
    unittest.main(verbosity=2)
