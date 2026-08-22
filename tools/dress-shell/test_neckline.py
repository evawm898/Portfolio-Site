"""Tests for the neckline curve shape contract.

The two heights used here are SYNTHETIC FIXTURES for exercising the
machinery — the real design heights are authored inputs and are not
defaulted anywhere.

Run:  cd tools/dress-shell && python3 -m unittest test_neckline -v
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np

from neckline import NecklineCurve, NecklineError, NecklineParams

FIX = NecklineParams(cf_height=200.0, side_height=160.0)


class TestShapeContract(unittest.TestCase):
    def test_hits_the_authored_heights(self):
        n = NecklineCurve(FIX)
        self.assertAlmostEqual(float(n.height(0.0)), 200.0, places=12)
        self.assertAlmostEqual(float(n.height(90.0)), 160.0, places=12)

    def test_zero_tangent_at_cf_and_side(self):
        # central FD across the knots carries O(step * curvature) noise
        # (~1e-6 deg^-1); 1e-5 is physically zero at garment scale
        n = NecklineCurve(FIX)
        self.assertLess(abs(float(n.slope(0.0))), 1e-5)
        self.assertLess(abs(float(n.slope(90.0))), 1e-5)

    def test_monotone_cf_to_side(self):
        for flat in (0.0, 0.5, 1.0):
            n = NecklineCurve(NecklineParams(200.0, 160.0, plateau_flatness=flat))
            h = n.height(np.linspace(0.0, 90.0, 3601))
            self.assertLessEqual(float(np.max(np.diff(h))), 1e-9, f"flat={flat}")
            self.assertLessEqual(float(h.max()), 200.0 + 1e-9)
            self.assertGreaterEqual(float(h.min()), 160.0 - 1e-9)

    def test_plateau_flattens_the_shoulder(self):
        loose = NecklineCurve(NecklineParams(200.0, 160.0, plateau_flatness=0.0))
        flat = NecklineCurve(NecklineParams(200.0, 160.0, plateau_flatness=1.0))
        th = FIX.shoulder_theta
        self.assertLess(float(loose.slope(th)), -0.1)   # clearly descending
        self.assertLess(abs(float(flat.slope(th))), 1e-5)
        # the plateau never RISES anywhere around the shoulder
        h = flat.height(np.linspace(th - 10.0, th + 10.0, 400))
        self.assertLessEqual(float(np.max(np.diff(h))), 1e-9)

    def test_constant_around_the_back(self):
        n = NecklineCurve(FIX)
        h = n.height(np.linspace(90.0, 180.0, 200))
        self.assertTrue(bool(np.all(np.abs(h - 160.0) < 1e-12)))

    def test_mirror_symmetry(self):
        n = NecklineCurve(FIX)
        th = np.linspace(0.0, 180.0, 500)
        self.assertTrue(bool(np.all(n.height(th) == n.height(-th))))

    def test_keepout_floor(self):
        n = NecklineCurve(NecklineParams(200.0, 160.0, keepout_mm=6.0))
        self.assertAlmostEqual(float(n.keepout_floor(0.0)), 194.0, places=12)
        self.assertAlmostEqual(float(n.keepout_floor(135.0)), 154.0, places=12)

    def test_invalid_params_fail_loudly(self):
        with self.assertRaises(NecklineError):
            NecklineCurve(NecklineParams(160.0, 200.0))   # side above CF
        with self.assertRaises(NecklineError):
            NecklineCurve(NecklineParams(200.0, 160.0, shoulder_theta=90.0))
        with self.assertRaises(NecklineError):
            NecklineCurve(NecklineParams(200.0, 160.0, plateau_flatness=1.2))
        with self.assertRaises(NecklineError):
            NecklineCurve(NecklineParams(200.0, 160.0, keepout_mm=-1.0))


if __name__ == "__main__":
    unittest.main(verbosity=2)
