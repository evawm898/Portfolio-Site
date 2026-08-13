"""Round-trip and convention tests for the (theta, s) coordinate system
on the CONFIRMED superellipse skirt profile.

Run:  cd tools/dress-shell && python3 -m unittest test_coords -v
"""

import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np

from coords import CoordError, ShellCoords
from shell import ShellError, ShellModel, ShellParams, build_meshes

MODEL = ShellModel(ShellParams())
COORDS = ShellCoords(MODEL)

POS_TOL = 1e-6      # mm
ANG_TOL = 1e-9      # degrees
S_TOL = 1e-6        # mm


def named_points(coords):
    """The required test sites: waist edge, mid-skirt, hem edge, and the
    near-hem wall where the profile goes vertical."""
    return {
        "waist edge": (0.0, 0.0),
        "mid-skirt": (-63.0, 0.5 * coords.s_max),
        "hem edge": (117.0, coords.s_max),
        "near-hem wall": (31.0, coords.s_max - 2.0),
    }


class TestConventions(unittest.TestCase):
    def test_theta_zero_is_center_front(self):
        p = COORDS.forward(0.0, 100.0)["position"]
        self.assertAlmostEqual(p[0], 0.0, places=12)
        self.assertGreater(p[1], 0.0)  # +y = center front

    def test_theta_positive_is_wearers_left(self):
        p = COORDS.forward(90.0, 100.0)["position"]
        self.assertGreater(p[0], 0.0)  # +x = wearer's left
        self.assertAlmostEqual(p[1], 0.0, places=9)

    def test_s_sign_and_range(self):
        # no bodice yet: s = 0 exactly at the waist (top edge), growing
        # hemward; s_min == 0
        self.assertAlmostEqual(float(COORDS.s_of_z(0.0)), 0.0, places=12)
        self.assertAlmostEqual(COORDS.s_min, 0.0, places=12)
        self.assertGreater(float(COORDS.s_of_z(MODEL.z_bottom)), 0.0)
        self.assertAlmostEqual(float(COORDS.s_of_z(MODEL.z_bottom)), COORDS.s_max,
                               places=9)

    def test_s_is_true_arc_length(self):
        z = np.linspace(0.0, MODEL.z_bottom, 200001)
        r = MODEL.mean_radius(z)
        steps = np.hypot(np.diff(r), np.diff(z))
        self.assertAlmostEqual(float(steps.sum()), COORDS.s_max, delta=1e-4)

    def test_frame(self):
        for theta, s in [(0.0, 50.0), (45.0, 80.0), (-120.0, 200.0), (180.0, 350.0)]:
            f = COORDS.forward(theta, s)
            n, et, es, p = f["normal"], f["e_theta"], f["e_s"], f["position"]
            for v in (n, et, es):
                self.assertAlmostEqual(float(np.linalg.norm(v)), 1.0, places=12)
            self.assertAlmostEqual(float(n @ et), 0.0, places=12)
            self.assertAlmostEqual(float(n @ es), 0.0, places=12)
            self.assertGreater(float(n[:2] @ p[:2]), 0.0)
            self.assertLess(float(es[2]), 0.0)   # increasing s = downward
            d = COORDS.forward(theta + 1e-4, s)["position"] - p
            self.assertGreater(float(d @ et), 0.0)


class TestRoundTrip(unittest.TestCase):
    def _roundtrip(self, theta, s):
        f = COORDS.forward(theta, s)
        theta2, s2 = COORDS.inverse(f["position"], check_mm=0.01)
        p2 = COORDS.forward(float(theta2), float(s2))["position"]
        return (abs(float(theta2) - theta), abs(float(s2) - s),
                float(np.linalg.norm(p2 - f["position"])))

    def test_named_points(self):
        for name, (theta, s) in named_points(COORDS).items():
            dtheta, ds, dpos = self._roundtrip(theta, s)
            self.assertLess(dtheta, ANG_TOL, name)
            self.assertLess(ds, S_TOL, name)
            self.assertLess(dpos, POS_TOL, name)

    def test_dense_sweep(self):
        rng = np.random.default_rng(7)
        thetas = rng.uniform(-180.0, 180.0, 1500)
        ss = rng.uniform(COORDS.s_min, COORDS.s_max, 1500)
        f = COORDS.forward(thetas, ss)
        theta2, s2 = COORDS.inverse(f["position"], check_mm=0.01)
        p2 = COORDS.forward(theta2, s2)["position"]
        self.assertLess(float(np.max(np.abs(theta2 - thetas))), ANG_TOL)
        self.assertLess(float(np.max(np.abs(s2 - ss))), S_TOL)
        self.assertLess(float(np.max(np.linalg.norm(p2 - f["position"], axis=-1))), POS_TOL)

    def test_z_s_inverse_pair(self):
        z = np.linspace(MODEL.z_bottom, MODEL.z_top, 5000)
        self.assertLess(float(np.max(np.abs(COORDS.z_of_s(COORDS.s_of_z(z)) - z))), 1e-9)

    def test_off_shell_point_rejected(self):
        p = COORDS.forward(30.0, 100.0)["position"] * 1.05
        with self.assertRaises(CoordError):
            COORDS.inverse(p, check_mm=0.5)

    def test_out_of_range(self):
        with self.assertRaises(CoordError):
            COORDS.z_of_s(COORDS.s_max + 5.0)
        with self.assertRaises(CoordError):
            COORDS.s_of_z(MODEL.z_top + 5.0)   # bodice region: not specified


class TestShell(unittest.TestCase):
    def test_solved_b(self):
        # b = drop / (1 - (r_w/a)^n)^(1/n); the user expected ~447
        self.assertAlmostEqual(MODEL.b_param, 446.73, delta=0.05)

    def test_profile_hits_confirmed_measurements(self):
        self.assertAlmostEqual(float(MODEL.mean_radius(0.0)),
                               609.6 / math.tau, places=6)     # waist 97.02
        self.assertAlmostEqual(float(MODEL.mean_radius(MODEL.z_bottom)),
                               1549.4 / math.tau, places=6)    # hem 246.59

    def test_waist_tangent_angle(self):
        # dr/du ~ -0.878 at the waist -> ~41.3 deg from vertical
        self.assertAlmostEqual(MODEL.waist_tangent_deg(), 41.29, delta=0.05)
        self.assertIsNone(MODEL.crease_angle_deg())  # bodice unspecified

    def test_hem_tangent_is_vertical(self):
        self.assertEqual(float(MODEL.mean_slope(MODEL.z_bottom)), 0.0)

    def test_surface_area(self):
        # ~0.50 m^2 for the confirmed parameters
        self.assertAlmostEqual(MODEL.surface_area_mm2() / 1e6, 0.5005, delta=0.002)

    def test_live_parameters_change_the_solve(self):
        m2 = ShellModel(ShellParams(hem_circumference=1400.0, dome_n=2.0))
        self.assertNotAlmostEqual(m2.b_param, MODEL.b_param, places=1)
        self.assertAlmostEqual(float(m2.mean_radius(0.0)), 609.6 / math.tau, places=6)

    def test_meshes_split_and_outward(self):
        meshes = build_meshes(MODEL, n_theta=96, max_row_mm=12.0)
        self.assertEqual(set(meshes), {"FRONT", "BACK"})
        for name, (V, F) in meshes.items():
            if name == "FRONT":
                self.assertGreaterEqual(float(V[:, 1].min()), -1e-6)
            else:
                self.assertLessEqual(float(V[:, 1].max()), 1e-6)
            tri = V[F]
            fn = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
            centers = tri.mean(axis=1)
            theta_c, s_c = COORDS.inverse(centers, check_mm=None)
            analytic = COORDS.forward(theta_c, s_c)["normal"]
            dots = (fn * analytic).sum(axis=1)
            self.assertTrue(bool(np.all(dots > 0)), f"{name}: inward-facing triangles")

    def test_invalid_params_fail_loudly(self):
        with self.assertRaises(ShellError):
            ShellModel(ShellParams(waist_circumference=1600.0))  # waist >= hem
        with self.assertRaises(ShellError):
            ShellModel(ShellParams(dome_n=1.0))                  # unusable profile
        with self.assertRaises(ShellError):
            ShellModel(ShellParams(fillet_radius=5.0))           # not implemented
        with self.assertRaises(ShellError):
            ShellModel(ShellParams(bodice={"made": "up"}))       # no invented bodice


if __name__ == "__main__":
    unittest.main(verbosity=2)
