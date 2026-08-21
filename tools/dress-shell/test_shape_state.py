"""Tests for shape.yaml persistence (shape_state.py) — lossless round-trip
and the compound section_curves composition it feeds.

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

# same density as shape_editor_server.py's _SEED_V_INTERIOR — a sparser
# set reproduces the committed curve at the SEED POINTS exactly (PCHIP
# interpolates) but drifts BETWEEN them wherever the true curve moves
# sharply (the waist fillet crease, the bust-bump ramp); see that
# module's comment for the measured numbers.
_SEED_V = (-340, -300, -260, -220, -180, -140, -100, -60, -30, -15,
          -5, 5, 15, 30, 60, 90, 120, 145, 155, 165, 175, 181, 190,
          200, 210, 220, 230)


def tmpfile():
    fd = tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False,
                                     encoding="utf-8")
    fd.close()
    return Path(fd.name)


_SAMPLE_CALIBRATION = {
    "front": {
        "calibrated": True, "image": "assets/shape-editor/silhouette-front.png",
        "image_natural_size": (478, 640), "waist_px": (239.0, 343.76),
        "hem_px": (239.0, 492.03), "mm_per_px_v": 2.5696, "mm_per_px_h": 2.4,
        "x_origin_px": 239.5, "h_ref_method": "independent",
        "h_ref": {"left_px": (203.0, 260.0), "right_px": (275.0, 260.0), "mm": 175.0},
        "implied_height_mm": 730.31,
    },
    "trace": {
        "calibrated": True, "image": "assets/shape-editor/silhouette-trace.png",
        "image_natural_size": (478, 640), "waist_px": (200.0, 344.96),
        "hem_px": (200.0, 512.78), "mm_per_px_v": 2.2703, "mm_per_px_h": 2.2703,
        "x_origin_px": 239.0, "h_ref_method": "aspect", "h_ref": None,
        "implied_height_mm": 688.94,
    },
}


def _seeded_shape(back_offset=0.0, calibration=None):
    """A real shape, sampled from the committed model. back_offset != 0
    diverges b_back from b_front above the waist (v > 100), simulating a
    CB neckline shallower than the CF bust projection."""
    z_bottom, z_top = COMMITTED.z_bottom, COMMITTED.z_top
    vs = sorted({z_bottom, z_top, *[v for v in _SEED_V if z_bottom < v < z_top]})
    a = np.asarray(COMMITTED.a(np.array(vs))).tolist()
    b = np.asarray(COMMITTED.b(np.array(vs))).tolist()
    bf = list(zip(vs, b))
    bb = list(zip(vs, [y - (back_offset if v > 100 else 0.0) for v, y in zip(vs, b)]))
    return ShapeState(a_points=list(zip(vs, a)), b_front_points=bf, b_back_points=bb,
                      neckline={"cf_height": 220.0, "cf_corner": False},
                      generator={"hem_circumference": 1549.4, "dome_n": 1.6},
                      backdrop_calibration=calibration or {})


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
        shape = _seeded_shape(back_offset=20.0)
        path = tmpfile()
        try:
            save_shape(path, shape)
            loaded = load_shape(path)
            self.assertEqual(len(loaded.a_points), len(shape.a_points))
            for (v0, y0), (v1, y1) in zip(shape.b_back_points, loaded.b_back_points):
                self.assertAlmostEqual(v0, v1, places=5)
                self.assertAlmostEqual(y0, y1, places=5)
            self.assertEqual(loaded.neckline["cf_height"], 220.0)
            self.assertEqual(loaded.neckline["cf_corner"], False)
            self.assertEqual(loaded.generator["hem_circumference"], 1549.4)
        finally:
            path.unlink()

    def test_calibration_round_trips(self):
        shape = _seeded_shape(calibration=_SAMPLE_CALIBRATION)
        path = tmpfile()
        try:
            text1 = save_shape(path, shape)
            loaded = load_shape(path)
            text2 = dump_shape(loaded)
            self.assertEqual(text1, text2)
            front = loaded.backdrop_calibration["front"]
            self.assertTrue(front["calibrated"])
            self.assertEqual(front["image_natural_size"], (478, 640))
            self.assertAlmostEqual(front["waist_px"][1], 343.76, places=2)
            self.assertAlmostEqual(front["mm_per_px_v"], 2.5696, places=4)
            self.assertEqual(front["h_ref_method"], "independent")
            self.assertAlmostEqual(front["h_ref"]["mm"], 175.0, places=6)
            trace = loaded.backdrop_calibration["trace"]
            self.assertEqual(trace["h_ref_method"], "aspect")
            self.assertNotIn("h_ref", trace)   # h_ref was None -> dropped, not stored as null
        finally:
            path.unlink()

    def test_missing_calibration_defaults_empty(self):
        shape = _seeded_shape()   # no calibration passed
        path = tmpfile()
        try:
            save_shape(path, shape)
            loaded = load_shape(path)
            self.assertEqual(loaded.backdrop_calibration, {})
        finally:
            path.unlink()


class TestLoadValidation(unittest.TestCase):
    def test_missing_file_raises(self):
        with self.assertRaises(ShapeError):
            load_shape(HERE / "does_not_exist_shape.yaml")

    def test_bad_version_raises(self):
        path = tmpfile()
        try:
            path.write_text("version: 2\na_points: [[0,1],[1,2]]\n"
                            "b_front_points: [[0,1],[1,2]]\nb_back_points: [[0,1],[1,2]]\n")
            with self.assertRaises(ShapeError):
                load_shape(path)
        finally:
            path.unlink()

    def test_malformed_point_raises(self):
        path = tmpfile()
        try:
            path.write_text("version: 1\na_points: [[0,1,2]]\n"
                            "b_front_points: [[0,1],[1,2]]\nb_back_points: [[0,1],[1,2]]\n")
            with self.assertRaises(ShapeError):
                load_shape(path)
        finally:
            path.unlink()

    def test_empty_points_rejected(self):
        path = tmpfile()
        try:
            path.write_text("version: 1\na_points: []\n"
                            "b_front_points: [[0,1],[1,2]]\nb_back_points: [[0,1],[1,2]]\n")
            with self.assertRaises(ShapeError):
                load_shape(path)
        finally:
            path.unlink()

    def test_missing_b_back_rejected(self):
        path = tmpfile()
        try:
            path.write_text("version: 1\na_points: [[0,1],[1,2]]\n"
                            "b_front_points: [[0,1],[1,2]]\n")
            with self.assertRaises(ShapeError):
                load_shape(path)
        finally:
            path.unlink()

    def test_malformed_calibration_px_rejected(self):
        path = tmpfile()
        try:
            path.write_text(
                "version: 1\na_points: [[0,1],[1,2]]\n"
                "b_front_points: [[0,1],[1,2]]\nb_back_points: [[0,1],[1,2]]\n"
                "backdrop_calibration:\n  front:\n    waist_px: [1, 2, 3]\n")
            with self.assertRaises(ShapeError):
                load_shape(path)
        finally:
            path.unlink()


class TestBuildParamsFromShape(unittest.TestCase):
    def test_seeded_shape_reproduces_committed_closely(self):
        shape = _seeded_shape()   # back_offset=0 -> b_front == b_back
        z_bottom, z_top = COMMITTED.z_bottom, COMMITTED.z_top
        params = build_params_from_shape(COMMITTED.params, shape, z_bottom, z_top)
        model = ShellModel(params)
        zz = np.linspace(z_bottom, z_top, 501)
        da = np.asarray(model.a(zz)) - np.asarray(COMMITTED.a(zz))
        db = np.asarray(model.b(zz)) - np.asarray(COMMITTED.b(zz))
        # STANDING RULE: validate the residual BETWEEN control points, not
        # just at them (PCHIP is interpolating, so at-point residual is
        # always ~0 regardless of density — that's exactly what hid the
        # -72,000 mm^2 seatable-area problem the first time around)
        self.assertLess(float(np.max(np.abs(da))), 1.0)
        self.assertLess(float(np.max(np.abs(db))), 1.0)

    def test_symmetric_seed_gives_90deg_junction(self):
        shape = _seeded_shape(back_offset=0.0)
        z_bottom, z_top = COMMITTED.z_bottom, COMMITTED.z_top
        params = build_params_from_shape(COMMITTED.params, shape, z_bottom, z_top)
        self.assertAlmostEqual(float(params.depth_curve.theta_junction_deg(0.0)), 90.0, places=6)

    def test_diverged_back_shifts_junction_and_circumference(self):
        shape = _seeded_shape(back_offset=20.0)
        z_bottom, z_top = COMMITTED.z_bottom, COMMITTED.z_top
        params = build_params_from_shape(COMMITTED.params, shape, z_bottom, z_top)
        junction = float(params.depth_curve.theta_junction_deg(150.0))
        self.assertNotAlmostEqual(junction, 90.0, places=1)
        model = ShellModel(params)
        # derived circumference must differ from the symmetric case once
        # b_back diverges — perimeter is DERIVED (mean Ramanujan), never frozen
        sym_shape = _seeded_shape(back_offset=0.0)
        sym_params = build_params_from_shape(COMMITTED.params, sym_shape, z_bottom, z_top)
        sym_model = ShellModel(sym_params)
        self.assertNotAlmostEqual(float(np.asarray(model.mean_radius(150.0))),
                                  float(np.asarray(sym_model.mean_radius(150.0))), places=3)

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

    def test_generator_provenance_is_not_reapplied(self):
        # generator values are storage-only; changing them must not
        # change the built model at all (the curves are the source of
        # truth once generated/dragged)
        shape = _seeded_shape()
        shape.generator = {"hem_circumference": 99999.0, "dome_n": 7.9}
        params = build_params_from_shape(COMMITTED.params, shape,
                                         COMMITTED.z_bottom, COMMITTED.z_top)
        self.assertEqual(params.hem_circumference, COMMITTED.params.hem_circumference)
        self.assertEqual(params.dome_n, COMMITTED.params.dome_n)

    def test_calibration_provenance_is_not_reapplied(self):
        # backdrop calibration is storage-only, same as generator — it
        # must not affect the built model at all, regardless of content
        shape = _seeded_shape(calibration=_SAMPLE_CALIBRATION)
        plain = _seeded_shape()
        z_bottom, z_top = COMMITTED.z_bottom, COMMITTED.z_top
        params = build_params_from_shape(COMMITTED.params, shape, z_bottom, z_top)
        plain_params = build_params_from_shape(COMMITTED.params, plain, z_bottom, z_top)
        model, plain_model = ShellModel(params), ShellModel(plain_params)
        zz = np.linspace(z_bottom, z_top, 101)
        np.testing.assert_array_equal(np.asarray(model.a(zz)), np.asarray(plain_model.a(zz)))


if __name__ == "__main__":
    unittest.main(verbosity=2)
