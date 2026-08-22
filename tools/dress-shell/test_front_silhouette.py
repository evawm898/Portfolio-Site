"""Tests for the front-silhouette input path (front_silhouette.py) —
plumbing only, using synthetic points (never real trace data checked
into this file — the real trace is supplied separately).

Run:  cd tools/dress-shell && python3 -m unittest test_front_silhouette -v
"""

import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np

from front_silhouette import DEFAULT_TAPE_ANCHORS, MeasuredSections, front_silhouette_fit
from silhouette import FittedDepth, SilhouetteError

HERE = Path(__file__).resolve().parent


def _synthetic_points_file(tmp_path):
    vv = np.arange(-381.0, 255.0, 15.0)
    a = (115.0 + 178.0 * np.exp(-((vv - 0.0) / 220.0) ** 2)
        + 45.0 * np.exp(-((vv - 181.0) / 60.0) ** 2))
    path = tmp_path / "synthetic.txt"
    with open(path, "w") as fh:
        fh.write("# synthetic self-test data\n")
        for v, aa in zip(vv, a):
            fh.write(f"{v:.2f} {aa:.3f}\n")
    return path


class TestFrontSilhouetteFit(unittest.TestCase):
    def setUp(self):
        import tempfile
        self._tmp = tempfile.TemporaryDirectory()
        self.points_path = _synthetic_points_file(Path(self._tmp.name))

    def tearDown(self):
        self._tmp.cleanup()

    def test_points_file_loads_and_fits(self):
        fit, report = front_silhouette_fit(self.points_path)
        self.assertIsInstance(fit, FittedDepth)
        self.assertIsNone(report)   # no image-extraction landmarks for a points file
        self.assertLess(fit.v_lo, -300.0)
        self.assertGreater(fit.v_hi, 200.0)

    def test_missing_file_raises(self):
        with self.assertRaises(FileNotFoundError):
            front_silhouette_fit(self._tmp.name + "/does_not_exist.txt")


class TestMeasuredSections(unittest.TestCase):
    def setUp(self):
        import tempfile
        self._tmp = tempfile.TemporaryDirectory()
        self.points_path = _synthetic_points_file(Path(self._tmp.name))
        self.fit, _ = front_silhouette_fit(self.points_path)
        from shell import dress_depth
        self.side = dress_depth()
        self.ms = MeasuredSections(self.fit, self.side)

    def tearDown(self):
        self._tmp.cleanup()

    def test_domain_is_the_overlap(self):
        self.assertEqual(self.ms.v_lo, max(self.fit.v_lo, self.side.v_lo))
        self.assertEqual(self.ms.v_hi, min(self.fit.v_hi, self.side.v_hi))

    def test_a_matches_front_fit_exactly(self):
        vv = np.linspace(self.ms.v_lo, self.ms.v_hi, 21)
        np.testing.assert_allclose(np.asarray(self.ms.a(vv)),
                                   np.asarray(self.fit.b(vv)))

    def test_b_matches_side_depth_exactly(self):
        vv = np.linspace(self.ms.v_lo, self.ms.v_hi, 21)
        np.testing.assert_allclose(np.asarray(self.ms.b(vv)),
                                   np.asarray(self.side.b(vv)))

    def test_perimeter_is_pure_ramanujan_no_adjustment(self):
        from bodice import _perimeter_np
        v = 100.0
        expected = float(_perimeter_np(np.asarray(self.ms.a(v)),
                                       np.asarray(self.ms.b(v))))
        self.assertAlmostEqual(float(np.asarray(self.ms.perimeter(v))),
                               expected, places=6)

    def test_circumference_report_never_adjusts_inputs(self):
        # calling the report must not mutate a()/b() — pure read-out
        a_before = float(np.asarray(self.ms.a(0.0)))
        self.ms.circumference_report()
        a_after = float(np.asarray(self.ms.a(0.0)))
        self.assertEqual(a_before, a_after)

    def test_circumference_report_flags_out_of_range_anchors(self):
        rows = self.ms.circumference_report()
        by_label = {r["label"]: r for r in rows}
        self.assertTrue(by_label["waist"]["in_trace_range"])
        # above-bust (v=254) sits past the committed depth's own top (240)
        self.assertFalse(by_label["above-bust"]["in_trace_range"])

    def test_monotonicity_report_shape(self):
        rep = self.ms.monotonicity_report()
        self.assertIn("non_increasing_waist_to_neckline", rep)
        self.assertIsInstance(rep["non_increasing_waist_to_neckline"], bool)

    def test_disjoint_domains_rejected(self):
        class _Fake:
            v_lo, v_hi = 500.0, 600.0
            def b(self, v):
                return np.full_like(np.asarray(v, dtype=float), 100.0)
        with self.assertRaises(SilhouetteError):
            MeasuredSections(_Fake(), self.side)


if __name__ == "__main__":
    unittest.main(verbosity=2)
