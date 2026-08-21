"""Tests for shape.yaml persistence (shape_state.py) — lossless round-trip
and the section_curves composition it feeds.

Run:  cd tools/dress-shell && python3 -m unittest test_shape_state -v
"""

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np

from shape_state import (ShapeError, ShapeState, build_params_from_shape,
                         dump_shape, load_shape, save_shape)
from shell import ShellModel, dress_params

HERE = Path(__file__).resolve().parent
COMMITTED = ShellModel(dress_params())


def tmpfile():
    fd = tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False,
                                     encoding="utf-8")
    fd.close()
    return Path(fd.name)


def _seeded_shape():
    """A real shape, sampled from the committed model, dense enough that
    section_curves reproduces it closely — same seed schedule
    shape_editor_server.py uses."""
    z_bottom, z_top = COMMITTED.z_bottom, COMMITTED.z_top
    # same density as shape_editor_server.py's _SEED_V_INTERIOR — a
    # sparser set reproduces the committed curve at the SEED POINTS
    # exactly (PCHIP interpolates) but drifts between them wherever the
    # true curve moves sharply (the waist fillet crease, the bust-bump
    # ramp); see that module's comment for the measured numbers.
    vs = sorted({z_bottom, z_top, *[v for v in
                (-340, -300, -260, -220, -180, -140, -100, -60, -30, -15,
                 -5, 5, 15, 30, 60, 90, 120, 145, 155, 165, 175, 181, 190,
                 200, 210, 220, 230) if z_bottom < v < z_top]})
    a = np.asarray(COMMITTED.a(np.array(vs))).tolist()
    b = np.asarray(COMMITTED.b(np.array(vs))).tolist()
    return ShapeState(a_points=list(zip(vs, a)), b_points=list(zip(vs, b)),
                      neckline={"cf_height": 220.0, "cf_corner": False},
                      skirt_fillet={"hem_circumference": 1549.4, "dome_n": 1.6})


class TestLosslessRoundTrip(unittest.TestCase):
    def test_save_load_save_is_identity(self):
        shape = _seeded_shape()
        path = tmpfile()
        try:
            text1 = save_shape(path, shape)
            loaded = load_shape(path)
            text2 = dump_shape(loaded)
            self.assertEqual(text1, text2)
        finally:
            path.unlink()

    def test_loaded_values_match(self):
        shape = _seeded_shape()
        path = tmpfile()
        try:
            save_shape(path, shape)
            loaded = load_shape(path)
            self.assertEqual(len(loaded.a_points), len(shape.a_points))
            for (v0, y0), (v1, y1) in zip(shape.a_points, loaded.a_points):
                self.assertAlmostEqual(v0, v1, places=5)
                self.assertAlmostEqual(y0, y1, places=5)
            self.assertEqual(loaded.neckline["cf_height"], 220.0)
            self.assertEqual(loaded.neckline["cf_corner"], False)
            self.assertEqual(loaded.skirt_fillet["hem_circumference"], 1549.4)
        finally:
            path.unlink()


class TestLoadValidation(unittest.TestCase):
    def test_missing_file_raises(self):
        with self.assertRaises(ShapeError):
            load_shape(HERE / "does_not_exist_shape.yaml")

    def test_bad_version_raises(self):
        path = tmpfile()
        try:
            path.write_text("version: 2\na_points: [[0,1],[1,2]]\nb_points: [[0,1],[1,2]]\n")
            with self.assertRaises(ShapeError):
                load_shape(path)
        finally:
            path.unlink()

    def test_malformed_point_raises(self):
        path = tmpfile()
        try:
            path.write_text("version: 1\na_points: [[0,1,2]]\nb_points: [[0,1],[1,2]]\n")
            with self.assertRaises(ShapeError):
                load_shape(path)
        finally:
            path.unlink()

    def test_empty_points_rejected(self):
        path = tmpfile()
        try:
            path.write_text("version: 1\na_points: []\nb_points: [[0,1],[1,2]]\n")
            with self.assertRaises(ShapeError):
                load_shape(path)
        finally:
            path.unlink()


class TestBuildParamsFromShape(unittest.TestCase):
    def test_seeded_shape_reproduces_committed_closely(self):
        shape = _seeded_shape()
        z_bottom, z_top = COMMITTED.z_bottom, COMMITTED.z_top
        params = build_params_from_shape(COMMITTED.params, shape, z_bottom, z_top)
        model = ShellModel(params)
        zz = np.linspace(z_bottom, z_top, 501)
        da = np.asarray(model.a(zz)) - np.asarray(COMMITTED.a(zz))
        db = np.asarray(model.b(zz)) - np.asarray(COMMITTED.b(zz))
        # a dense-enough seed reproduces the committed curve to ~1mm, not
        # bit-for-bit (PCHIP through a finite point set vs. the committed
        # model's own solve) — see shape_editor_server.py's seed-density
        # comment for why this matters
        self.assertLess(float(np.max(np.abs(da))), 1.0)
        self.assertLess(float(np.max(np.abs(db))), 1.0)

    def test_domain_mismatch_raises(self):
        shape = _seeded_shape()
        shape.a_points = shape.a_points[1:]   # drop the z_bottom anchor
        with self.assertRaises(ShapeError):
            build_params_from_shape(COMMITTED.params, shape,
                                    COMMITTED.z_bottom, COMMITTED.z_top)

    def test_neckline_override_applied(self):
        shape = _seeded_shape()
        shape.neckline = {"cf_height": 180.0}
        params = build_params_from_shape(COMMITTED.params, shape,
                                         COMMITTED.z_bottom, COMMITTED.z_top)
        self.assertEqual(params.bodice.cf_height, 180.0)

    def test_skirt_fillet_is_not_applied(self):
        # explicitly inert (see module docstring) — changing it must not
        # change the built model at all
        shape = _seeded_shape()
        shape.skirt_fillet = {"hem_circumference": 99999.0, "dome_n": 7.9}
        params = build_params_from_shape(COMMITTED.params, shape,
                                         COMMITTED.z_bottom, COMMITTED.z_top)
        # hem_circumference/dome_n stay whatever the base params carried —
        # never overwritten from skirt_fillet
        self.assertEqual(params.hem_circumference, COMMITTED.params.hem_circumference)
        self.assertEqual(params.dome_n, COMMITTED.params.dome_n)


if __name__ == "__main__":
    unittest.main(verbosity=2)
