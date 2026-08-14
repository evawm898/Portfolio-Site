"""Tests for the silhouette input path + the inverted a-solve.

The traces here are SYNTHETIC FIXTURES (generated from known curves with
noise) — the real silhouette is an authored input file, never defaulted.

Run:  cd tools/dress-shell && python3 -m unittest test_silhouette -v
"""

import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np

from bodice import _perimeter_np, solve_a_given_b, solve_semi_axes
from silhouette import FittedDepth, SilhouetteError, extract_from_image

RNG = np.random.default_rng(9)


def synthetic_trace(n=220, noise=0.6):
    """A garment-like half-depth: flares to the hem below the waist,
    swells to a bust crest above, tapers past it."""
    v = np.linspace(-381.0, 250.0, n)
    b = np.where(
        v <= 0.0,
        77.0 + (195.0 - 77.0) * (np.abs(v) / 381.0) ** 1.35,
        77.0 + 13.0 * np.clip(v / 203.0, 0.0, None) ** 2.2
        - 8.0 * np.clip((v - 203.0) / 47.0, 0.0, None) ** 2,
    )
    return list(zip(v, b + RNG.normal(0.0, noise, n)))


class TestFit(unittest.TestCase):
    def test_smooths_noise_and_reports_residuals(self):
        fit = FittedDepth(synthetic_trace())
        r = fit.report
        self.assertLess(r.rms_mm, 1.2)          # noise-level, not zero
        self.assertGreater(r.rms_mm, 0.1)       # it is smoothing, not interp
        self.assertEqual(set(r.by_region),
                         {"lower (hem end)", "middle", "upper (top end)"})
        # the two expected extrema: waist minimum + bust maximum
        self.assertLessEqual(len(r.extrema_v), 2)

    def test_wiggly_fit_fails_loudly(self):
        pts = [(float(v), 100.0 + 20.0 * math.sin(v / 25.0))
               for v in np.linspace(-300, 200, 200)]
        with self.assertRaises(SilhouetteError):
            FittedDepth(pts)

    def test_nonpositive_depth_rejected(self):
        pts = synthetic_trace()
        pts[10] = (pts[10][0], -1.0)
        with self.assertRaises(SilhouetteError):
            FittedDepth(pts)

    def test_hem_slope_is_measured_not_forced(self):
        fit = FittedDepth(synthetic_trace())
        # the synthetic profile genuinely flares at the hem: the fit must
        # SAY so (nonzero wall angle), not flatten it
        self.assertGreater(fit.report.hem_wall_angle_deg, 5.0)


class TestInvertedSolve(unittest.TestCase):
    def test_round_trips_the_forward_solve(self):
        for c, k in [(609.6, 1.5), (711.2, 1.875), (863.6, 2.0), (812.8, 1.1)]:
            a0, b0, _ = solve_semi_axes(c, k)
            a = float(solve_a_given_b(c, b0))
            self.assertAlmostEqual(a, a0, places=9)

    def test_vectorized(self):
        b = np.array([76.85, 76.95, 89.14])
        P = np.array([609.6, 711.2, 863.6])
        a = solve_a_given_b(P, b)
        self.assertLess(float(np.max(np.abs(_perimeter_np(a, b) - P))), 1e-8)

    def test_impossible_circumference_fails_loudly(self):
        # a 100 mm circumference cannot close over an 80 mm half-depth
        with self.assertRaises(ValueError):
            solve_a_given_b(100.0, 80.0)


class TestImageExtraction(unittest.TestCase):
    def test_extracts_scaled_points_from_a_rendered_trace(self):
        from PIL import Image
        # render a known silhouette: white fill, hem exactly 381 px below
        # the waist (-> 1 mm/px), waist ~32% down from the top so it sits
        # inside the extractor's interior search band
        H, W = 760, 400
        img = np.zeros((H, W, 3), dtype=np.uint8) + 40
        waist_row, hem_row = 260, 641
        v_rows = np.arange(80, hem_row + 1)
        for y in v_rows:
            v = waist_row - y
            b = 77.0 + (118.0 * (abs(v) / 381.0) ** 1.4 if v <= 0
                        else 13.0 * (v / 180.0) ** 2)
            half = int(round(b / 2))             # NB: drawing half of 2b
            img[y, W // 2 - half:W // 2 + half] = 255
        p = Path("/tmp/claude-0/-home-user-Portfolio-Site/"
                 "138f4fef-3712-5036-8a70-948497b510e0/scratchpad/synth-trace.png")
        p.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(img).save(p)

        points, rep = extract_from_image(p)
        self.assertAlmostEqual(rep["mm_per_px"], 1.0, delta=0.01)
        self.assertAlmostEqual(rep["implied_total_height_mm"],
                               float(len(v_rows) - 1), delta=3.0)
        vs = np.array([q[0] for q in points])
        self.assertLess(abs(vs.min() - (-381.0)), 3.0)   # hem lands at -381


class _SyntheticDepth:
    """Full-coverage authored depth for exercising the model mode."""
    v_lo, v_hi = -381.0, 254.0

    def b(self, z):
        z = np.asarray(z, dtype=float)
        return np.where(
            z <= 0.0,
            101.0 + (183.6 - 101.0) * (np.abs(z) / 381.0) ** 1.3,
            101.0 + 22.0 * np.clip(z / 203.2, 0.0, None) ** 1.5
            - 6.0 * np.clip((z - 203.2) / 50.8, 0.0, None) ** 2)


class TestAuthoredDepthMode(unittest.TestCase):
    def _model(self):
        from neckline import DESIGN_NECKLINE
        from shell import ShellModel, ShellParams
        return ShellModel(ShellParams(bodice=DESIGN_NECKLINE,
                                      depth_curve=_SyntheticDepth()))

    def test_b_is_honored_and_perimeter_is_kept(self):
        from bodice import _perimeter_np
        m = self._model()
        z = np.linspace(-380.0, 249.0, 300)
        a, b = m.semi_axes(z)
        self.assertLess(float(np.max(np.abs(b - _SyntheticDepth().b(z)))), 1e-9)
        P = m._perimeter_schedule(z)
        self.assertLess(float(np.max(np.abs(_perimeter_np(a, b) - P))), 5e-4)
        self.assertLess(m.depth_solve_residual_mm, 1e-6)

    def test_ratio_is_an_output(self):
        m = self._model()
        r0 = float(m.ratio(np.array(0.0)))
        self.assertAlmostEqual(r0, float(m.a(0.0) / m.b(0.0)), places=12)
        # the synthetic waist depth (101 mm) over 609.6 mm circumference
        # comes out DEEPER than wide — the honored-silhouette regime
        self.assertLess(r0, 1.0)

    def test_coords_round_trip_in_authored_mode(self):
        from coords import ShellCoords
        m = self._model()
        c = ShellCoords(m)
        rng = np.random.default_rng(3)
        th = rng.uniform(-179.0, 179.0, 150)
        ss = rng.uniform(c.s_min, c.s_max, 150)
        zz = c.z_of_s(ss)
        keep = zz <= m.z_top_at(th) - 1e-6
        f = c.forward(th[keep], ss[keep])
        th2, s2 = c.inverse(f["position"], check_mm=0.01)
        p2 = c.forward(th2, s2)["position"]
        self.assertLess(float(np.max(np.linalg.norm(p2 - f["position"], axis=-1))),
                        1e-6)

    def test_partial_trace_is_refused_for_the_full_dress(self):
        # the committed silhouette covers -381..~113 (one-shoulder cut):
        # building the full dress from it must FAIL, not extrapolate
        from neckline import DESIGN_NECKLINE
        from shell import ShellError, ShellModel, ShellParams
        pts, _ = extract_from_image(Path(__file__).parent / "silhouette-trace.png")
        fit = FittedDepth(pts)
        with self.assertRaises(ShellError):
            ShellModel(ShellParams(bodice=DESIGN_NECKLINE, depth_curve=fit))


if __name__ == "__main__":
    unittest.main(verbosity=2)
