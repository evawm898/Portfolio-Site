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


if __name__ == "__main__":
    unittest.main(verbosity=2)
