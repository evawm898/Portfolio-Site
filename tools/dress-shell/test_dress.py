"""Tests for the FULL DRESS model — skirt + bodice with the given
neckline (taper confirmed). Skirt-only behavior is covered by the other
test modules; everything here exercises the two-segment shell.

Run:  cd tools/dress-shell && python3 -m unittest test_dress -v
"""

import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np

from coords import CoordError, ShellCoords
from curvature import STANDOFF_TOLERANCE_MM, analyze_cells, seat_standoff
from grid import GridSpec, ShellGrid
from layout import SurfaceChart, outline_problems
from panels import load_panel_classes
from shell import ShellError, ShellModel, ShellParams, build_meshes, dress_params

HERE = Path(__file__).resolve().parent

MODEL = ShellModel(dress_params())
COORDS = ShellCoords(MODEL)
CHART = SurfaceChart(MODEL, COORDS)
CLASSES = load_panel_classes(HERE / "panels.yaml")


class TestDressModel(unittest.TestCase):
    def test_two_segments_with_given_neckline(self):
        self.assertEqual(MODEL.z_bottom, -381.0)
        self.assertEqual(MODEL.z_top, 250.0)
        self.assertAlmostEqual(float(MODEL.z_top_at(0.0)), 250.0)
        self.assertAlmostEqual(float(MODEL.z_top_at(90.0)), 205.0)
        self.assertAlmostEqual(float(MODEL.z_top_at(180.0)), 205.0)

    def test_waist_sections_match_at_the_crease(self):
        a_lo, b_lo = (float(v) for v in MODEL.semi_axes(0.0))
        a_hi, b_hi = (float(v) for v in MODEL.semi_axes(1e-9))
        self.assertAlmostEqual(a_lo, a_hi, places=6)
        self.assertAlmostEqual(b_lo, b_hi, places=6)

    def test_waist_is_smooth_under_silhouette_first(self):
        # the traces are smooth through the waist: the old crease is GONE
        # by design (the seam band remains a construction joint). The
        # one-sided slopes agree and the junction angle is ~0.
        below = float(MODEL.mean_slope(-1e-6))
        above = float(MODEL.mean_slope(1e-6))
        self.assertLess(abs(below - above), 0.05)
        self.assertLess(MODEL.crease_angle_deg(), 1.5)
        # the RATIO-mode dress (no curves) still has its 41.3 deg crease
        from shell import ShellModel, ShellParams
        from neckline import DESIGN_NECKLINE
        m_ratio = ShellModel(ShellParams(bodice=DESIGN_NECKLINE))
        self.assertAlmostEqual(m_ratio.crease_angle_deg(), 41.29, delta=0.05)

    def test_silhouette_first_provenance(self):
        from shell import dress_curves
        cv = dress_curves()
        self.assertAlmostEqual(cv.scale, 0.975, delta=0.002)   # hem pin
        self.assertLess(cv.hold_mm, 10.0)                      # top hold cap
        self.assertAlmostEqual(cv.depth_estimated_above_v, 112.7, delta=0.5)
        # every body anchor clears the shell (floor guarantees >= 2 mm
        # in the estimated span; the measured waist clears naturally)
        for v, P, c, standoff in cv.body_clearance():
            self.assertGreaterEqual(standoff, 1.9, (v, standoff))

    def test_round_trip_on_the_bodice(self):
        rng = np.random.default_rng(5)
        th = rng.uniform(-179.0, 179.0, 400)
        ss = rng.uniform(COORDS.s_min, COORDS.s_max, 400)
        zz = COORDS.z_of_s(ss)
        keep = zz <= MODEL.z_top_at(th) - 1e-6      # on-shell only
        th, ss = th[keep], ss[keep]
        self.assertGreater(np.sum(COORDS.z_of_s(ss) > 0), 20)  # bodice included
        f = COORDS.forward(th, ss)
        th2, s2 = COORDS.inverse(f["position"], check_mm=0.01)
        p2 = COORDS.forward(th2, s2)["position"]
        self.assertLess(float(np.max(np.linalg.norm(p2 - f["position"], axis=-1))),
                        1e-6)

    def test_inverse_rejects_points_above_the_neckline(self):
        # a parametric point above the side neckline is NOT on the shell
        p = MODEL.point(np.array(math.radians(120.0)), np.array(230.0))
        with self.assertRaises(CoordError):
            COORDS.inverse(np.asarray(p), check_mm=0.5)

    def test_meshes_top_out_at_the_neckline(self):
        meshes = build_meshes(MODEL)
        vf = meshes["FRONT"][0]
        vb = meshes["BACK"][0]
        self.assertAlmostEqual(float(vf[:, 2].max()), 250.0, delta=1e-6)
        self.assertAlmostEqual(float(vb[:, 2].max()), 205.0, delta=1e-6)
        # no vertex anywhere above its azimuth's neckline height
        for V, _ in meshes.values():
            th, _s = COORDS.inverse(V, check_mm=None)
            caps = MODEL.neckline.height(th)
            self.assertLessEqual(float(np.max(V[:, 2] - caps)), 1e-6)

    def test_invalid_bodice_params_fail_loudly(self):
        from neckline import NecklineParams
        with self.assertRaises(ShellError):
            ShellModel(ShellParams(bodice="corset"))     # wrong type
        with self.assertRaises(ShellError):
            # CF above the highest section anchor (254): no extrapolation
            ShellModel(ShellParams(bodice=NecklineParams(300.0, 205.0)))


class TestDressLegalityAndAnalysis(unittest.TestCase):
    def test_neckline_keepout_flags_panels(self):
        p213 = CLASSES["p213"]
        s_at = lambda v: float(COORDS.s_of_z(v))
        high = outline_problems(CHART, p213, 120.0, s_at(190.0), 0)
        self.assertTrue(any("neckline keep-out" in p for p in high), high)
        low = outline_problems(CHART, p213, 120.0, s_at(120.0), 0)
        self.assertEqual(low, [])

    def test_seat_standoff_infinite_when_crossing_neckline(self):
        p213 = CLASSES["p213"]
        so = seat_standoff(COORDS, CHART, p213.outline_w, p213.outline_h,
                           0.0, float(COORDS.s_of_z(230.0)))
        self.assertFalse(np.isfinite(so))

    def test_off_shell_cells_are_excluded(self):
        grid = ShellGrid(CHART, GridSpec(10.0, 25.0))
        an = analyze_cells(COORDS, CHART, grid, CLASSES,
                           STANDOFF_TOLERANCE_MM, samples=5)
        off = [a for a in an if a.off_shell]
        self.assertGreater(len(off), 0)
        from curvature import class_distribution
        dist = class_distribution(an)
        self.assertEqual(sum(dist.values()), len(an) - len(off))
        # p370 finally seats somewhere: the flat low bodice near CF
        self.assertGreater(dist.get("p370", 0), 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
