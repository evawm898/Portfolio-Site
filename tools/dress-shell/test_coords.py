"""Round-trip and convention tests for the (theta, s) coordinate system.

Run:  python3 -m unittest tools/dress-shell/test_coords.py -v
(or)  cd tools/dress-shell && python3 -m unittest test_coords -v
"""

import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np

from coords import CoordError, ShellCoords
from shell import (ShellError, ShellModel, ShellParams, build_meshes,
                   ellipse_perimeter, semi_axes_from)

MODEL = ShellModel(ShellParams())
COORDS = ShellCoords(MODEL)

POS_TOL = 1e-6      # mm
ANG_TOL = 1e-9      # degrees
S_TOL = 1e-6        # mm


def named_points(coords):
    """The four required test sites (plus off-axis thetas at each)."""
    m = coords.model
    return {
        "waist": (0.0, float(coords.s_of_z(0.0))),                     # s = 0
        "bust apex": (0.0, float(coords.s_of_z(m.params.bust_z))),     # center front
        "hem edge": (117.0, coords.s_max),
        "max skirt flare": (-63.0, float(coords.s_of_z(m.max_flare_z()))),
    }


class TestConventions(unittest.TestCase):
    def test_theta_zero_is_center_front(self):
        p = COORDS.forward(0.0, 0.0)["position"]
        self.assertAlmostEqual(p[0], 0.0, places=12)
        self.assertGreater(p[1], 0.0)  # +y = center front

    def test_theta_positive_is_wearers_left(self):
        p = COORDS.forward(90.0, 0.0)["position"]
        self.assertGreater(p[0], 0.0)  # +x = wearer's left
        self.assertAlmostEqual(p[1], 0.0, places=9)

    def test_s_sign(self):
        self.assertAlmostEqual(float(COORDS.s_of_z(0.0)), 0.0, places=12)
        self.assertLess(float(COORDS.s_of_z(MODEL.params.bust_z)), 0.0)   # bodice: negative
        self.assertGreater(float(COORDS.s_of_z(MODEL.params.hem_z)), 0.0)  # skirt: positive
        self.assertAlmostEqual(float(COORDS.s_of_z(MODEL.z_bottom)), COORDS.s_max, places=9)
        self.assertAlmostEqual(float(COORDS.s_of_z(MODEL.z_top)), COORDS.s_min, places=9)

    def test_s_is_true_arc_length(self):
        # Walking the mean profile point-to-point must reproduce s.
        z = np.linspace(0.0, MODEL.z_bottom, 200001)
        r = MODEL.mean_radius(z)
        steps = np.hypot(np.diff(r), np.diff(z))
        self.assertAlmostEqual(float(steps.sum()), COORDS.s_max, delta=1e-4)

    def test_frame(self):
        for theta, s in [(0.0, 0.0), (45.0, -80.0), (-120.0, 200.0), (180.0, 350.0)]:
            f = COORDS.forward(theta, s)
            n, et, es, p = f["normal"], f["e_theta"], f["e_s"], f["position"]
            for v in (n, et, es):
                self.assertAlmostEqual(float(np.linalg.norm(v)), 1.0, places=12)
            # normal is orthogonal to both tangents and points outward
            self.assertAlmostEqual(float(n @ et), 0.0, places=12)
            self.assertAlmostEqual(float(n @ es), 0.0, places=12)
            self.assertGreater(float(n[:2] @ p[:2]), 0.0)
            # e_s points down (increasing s = toward hem), e_theta along +theta
            self.assertLess(float(es[2]), 0.0)
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
            COORDS.s_of_z(MODEL.z_top + 5.0)


class TestShell(unittest.TestCase):
    def test_perimeter_inversion(self):
        for c, q in [(660.0, 1.25), (1400.0, 1.05), (900.0, 1.35)]:
            a, b = semi_axes_from(c, q)
            self.assertAlmostEqual(ellipse_perimeter(a, b), c, places=9)
            self.assertAlmostEqual(a / b, q, places=12)

    def test_control_rings_hit_measurements(self):
        for ring in MODEL.rings:
            a, b = float(MODEL.a(ring.z)), float(MODEL.b(ring.z))
            self.assertAlmostEqual(ellipse_perimeter(a, b), ring.circumference, places=6,
                                   msg=ring.name)

    def test_waist_is_the_minimum(self):
        # PCHIP pins the minimum exactly at the waist node: nothing sampled
        # anywhere on the shell dips below it (no overshoot at the nip).
        z = np.linspace(MODEL.z_bottom, MODEL.z_top, 4001)
        r_waist = float(MODEL.mean_radius(0.0))
        self.assertGreaterEqual(float(np.min(MODEL.mean_radius(z))), r_waist - 1e-9)
        self.assertLess(float(np.min(MODEL.mean_radius(z))) - r_waist, 0.01)

    def test_meshes_split_and_outward(self):
        meshes = build_meshes(MODEL, n_theta=96, max_row_mm=12.0)
        self.assertEqual(set(meshes), {"FRONT", "BACK"})
        for name, (V, F) in meshes.items():
            # separable pieces: front strictly y >= 0 side of the seam plane
            if name == "FRONT":
                self.assertGreaterEqual(float(V[:, 1].min()), -1e-6)
            else:
                self.assertLessEqual(float(V[:, 1].max()), 1e-6)
            # winding: face normals agree with the analytic outward normal
            tri = V[F]
            fn = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
            centers = tri.mean(axis=1)
            theta_c, s_c = COORDS.inverse(centers, check_mm=None)
            analytic = COORDS.forward(theta_c, s_c)["normal"]
            dots = (fn * analytic).sum(axis=1)
            self.assertTrue(bool(np.all(dots > 0)), f"{name}: inward-facing triangles")

    def test_invalid_params_fail_loudly(self):
        with self.assertRaises(ShellError):
            ShellModel(ShellParams(hip_z=50.0))            # hip above waist
        with self.assertRaises(ShellError):
            ShellModel(ShellParams(total_length=400.0))    # top edge below bust
        with self.assertRaises(ShellError):
            ShellModel(ShellParams(waist_ratio=5.0))       # absurd ellipse


if __name__ == "__main__":
    unittest.main(verbosity=2)
