"""Tests for the layout.yaml source-of-truth path and mirroring logic.

Run:  cd tools/dress-shell && python3 -m unittest test_layout -v
"""

import math
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from coords import ShellCoords
from layout import (AuthoredPanel, LayoutError, SurfaceChart, connector_geometry,
                    derive_twin, dump_layout, load_layout, resolve_layout,
                    save_layout, wrap180)
from panels import PanelClass, PanelSpecError, load_panel_classes
from shell import ShellModel, ShellParams

HERE = Path(__file__).resolve().parent
MODEL = ShellModel(ShellParams())
COORDS = ShellCoords(MODEL)
CHART = SurfaceChart(MODEL, COORDS)
CLASSES = load_panel_classes(HERE / "panels.yaml")


def tmpfile(text=None):
    fd = tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False,
                                     encoding="utf-8")
    if text is not None:
        fd.write(text)
    fd.close()
    return Path(fd.name)


class TestLosslessRoundTrip(unittest.TestCase):
    def test_load_save_load_is_identity(self):
        authored = load_layout(HERE / "layout.yaml")
        path = tmpfile()
        save_layout(path, authored)
        again = load_layout(path)
        self.assertEqual(authored, again)

    def test_save_is_a_fixed_point(self):
        authored = load_layout(HERE / "layout.yaml")
        first = dump_layout(authored)
        second = dump_layout(load_layout(tmpfile(first)))
        self.assertEqual(first, second)  # byte-identical

    def test_committed_file_is_canonical(self):
        # The committed layout.yaml must itself round-trip byte-identically,
        # so editor saves never produce spurious git diffs.
        text = (HERE / "layout.yaml").read_text(encoding="utf-8")
        self.assertEqual(text, dump_layout(load_layout(HERE / "layout.yaml")))

    def test_awkward_floats_survive(self):
        authored = [AuthoredPanel("p1", "XS", 33.333333333333336, -0.1, 180, 3, True)]
        again = load_layout(tmpfile(dump_layout(authored)))
        self.assertEqual(authored, again)  # exact binary64 equality

    def test_empty_layout(self):
        again = load_layout(tmpfile(dump_layout([])))
        self.assertEqual(again, [])


class TestLoadValidation(unittest.TestCase):
    def _expect(self, text, *fragments):
        with self.assertRaises(LayoutError) as ctx:
            load_layout(tmpfile(text))
        for frag in fragments:
            self.assertIn(frag, str(ctx.exception))

    def test_all_problems_reported_together(self):
        self._expect(
            "version: 1\n"
            "panels:\n"
            "  - {id: a, class: L, theta: -5.0, s: 100.0, rotation: 0, layer: 0, mirrored: true}\n"
            "  - {id: a, class: L, theta: 10.0, s: 100.0, rotation: 0, layer: 0, mirrored: false}\n"
            "  - {id: b, class: L, theta: 10.0, s: 100.0, rotation: 90, layer: -1, mirrored: false}\n"
            "  - {id: c, class: L, theta: 0.0, s: 100.0, rotation: 0, layer: 0, mirrored: true}\n"
            "  - {id: d, class: L, theta: 180.0, s: 100.0, rotation: 0, layer: 0, mirrored: true}\n",
            "must be in [0, 180]", "duplicate id 'a'", "must be 0 or 180",
            "layer: must be >= 0", "theta == 0 panels are single",
            "theta == 180 mirrors onto itself",
        )

    def test_unknown_and_missing_keys(self):
        self._expect(
            "version: 1\n"
            "panels:\n"
            "  - {id: a, class: L, theta: 5.0, s: 1.0, rotation: 0, layer: 0,\n"
            "     mirrored: false, colour: red}\n"
            "  - {id: b, class: L, theta: 5.0, s: 1.0, rotation: 0}\n",
            "unknown key(s): colour", "missing key(s): layer, mirrored",
        )

    def test_reserved_twin_marker_rejected(self):
        self._expect(
            "version: 1\npanels:\n"
            "  - {id: 'a~twin', class: L, theta: 5.0, s: 1.0, rotation: 0, layer: 0, mirrored: false}\n",
            "reserved for derived twins",
        )

    def test_bad_top_level(self):
        self._expect("panels: []\n", "exactly the keys")
        self._expect("version: 1\npanels: {}\n", "'panels' must be a list")

    def test_unknown_class_is_a_resolve_error(self):
        authored = [AuthoredPanel("p1", "NOPE", 10.0, 100.0, 0, 0, False)]
        placed, errors = resolve_layout(CHART, CLASSES, authored)
        self.assertEqual(placed, [])
        self.assertIn("unknown panel class 'NOPE'", errors[0])


class TestMirroring(unittest.TestCase):
    def test_twin_mirrors_active_center_exactly(self):
        src = AuthoredPanel("sk", "L", 36.0, 250.0, 0, 0, True)
        twin = derive_twin(CHART, CLASSES["L"], src)
        self.assertEqual(twin.theta, -36.0)
        self.assertEqual(twin.s, 250.0)
        self.assertEqual((twin.layer, twin.is_twin, twin.source_id), (0, True, "sk"))
        self.assertTrue(twin.valid)

    def test_twin_of_top_exit_panel_keeps_identity(self):
        # L exits out the top edge, well clear of every boundary: the
        # source's own rotation must be chosen (identity preferred).
        twin = derive_twin(CHART, CLASSES["L"], AuthoredPanel("sk", "L", 36.0, 250.0, 0, 0, True))
        self.assertEqual(twin.rotation, 0)
        twin180 = derive_twin(CHART, CLASSES["L"], AuthoredPanel("sk", "L", 36.0, 250.0, 180, 0, True))
        self.assertEqual(twin180.rotation, 180)

    def test_side_exit_twin_flips_to_180_near_seam(self):
        # S exits sideways (-x). At theta=+80 the exit points toward center
        # front: legal. The naive twin at -80 would fire the connector into
        # the -90 seam; the derivation must flip to 180 instead.
        src = AuthoredPanel("bo", "S", 80.0, -60.0, 0, 0, True)
        _, (e_theta, _) = connector_geometry(CHART, CLASSES["S"], -80.0, -60.0, 0)
        self.assertLess(e_theta, -90.0)  # the case is real, identity is illegal
        twin = derive_twin(CHART, CLASSES["S"], src)
        self.assertTrue(twin.valid)
        self.assertEqual(twin.rotation, 180)
        # and with 180 the connector genuinely clears the seam
        _, (e_theta2, _) = connector_geometry(CHART, CLASSES["S"], -80.0, -60.0, 180)
        self.assertGreater(e_theta2, -90.0)

    def test_connector_never_mirrored(self):
        # Under BOTH rotations the connector's chart offset from the active
        # center is the class offset or its point-reflection — never the
        # lateral mirror (dtheta -> -dtheta with ds fixed) that a mirrored
        # part would produce. L's connector is off-axis in both components,
        # so the three shapes are distinguishable.
        cls = CLASSES["L"]  # connector (30, 0), active center (30.2, 47.5)
        (c0t, c0s), _ = connector_geometry(CHART, cls, 40.0, 200.0, 0)
        (c1t, c1s), _ = connector_geometry(CHART, cls, 40.0, 200.0, 180)
        ds0, ds1 = c0s - 200.0, c1s - 200.0
        # physical lateral offsets: degrees back to mm at each connector's
        # own height (the chart conversion is height-dependent by design)
        dx0 = math.radians(c0t - 40.0) * CHART.r_theta(40.0, c0s)
        dx1 = math.radians(c1t - 40.0) * CHART.r_theta(40.0, c1s)
        self.assertAlmostEqual(ds0, -47.5, places=9)
        self.assertAlmostEqual(ds0, -ds1, places=9)   # point reflection...
        self.assertAlmostEqual(dx0, -0.2, places=6)   # ...in both components
        self.assertAlmostEqual(dx1, 0.2, places=6)
        self.assertNotAlmostEqual(ds0, ds1, places=3)  # mirror shape impossible

    def test_invalid_twin_flagged_with_reasons(self):
        # A pathological class whose escape run is longer than the piece is
        # wide: no rotation can keep the exit path on the piece.
        cls = PanelClass("HOSE", 30.0, 45.0, 1.0, 25.6, 39.0, (2.2, 3.0),
                         (0.0, 22.5), (-1.0, 0.0), 400.0)
        twin = derive_twin(CHART, cls, AuthoredPanel("x", "HOSE", 40.0, 200.0, 0, 0, True))
        self.assertFalse(twin.valid)
        self.assertIn("INVALID twin: no legal transform", twin.problems[0])
        self.assertTrue(any("rotation 0" in p for p in twin.problems))
        self.assertTrue(any("rotation 180" in p for p in twin.problems))

    def test_editing_source_moves_twin(self):
        # Twins are derived, never stored: re-resolving after an edit is the
        # update mechanism.
        src = AuthoredPanel("sk", "L", 36.0, 250.0, 0, 0, True)
        moved = AuthoredPanel("sk", "L", 41.0, 262.5, 0, 2, True)
        t1 = derive_twin(CHART, CLASSES["L"], src)
        t2 = derive_twin(CHART, CLASSES["L"], moved)
        self.assertEqual((t2.theta, t2.s, t2.layer), (-41.0, 262.5, 2))
        self.assertNotEqual((t1.theta, t1.s), (t2.theta, t2.s))

    def test_center_front_panel_is_single(self):
        placed, errors = resolve_layout(
            CHART, CLASSES, [AuthoredPanel("cf", "M", 0.0, 220.0, 0, 0, False)])
        self.assertEqual(errors, [])
        self.assertEqual(len(placed), 1)
        self.assertFalse(placed[0].is_twin)

    def test_starter_layout_resolves(self):
        authored = load_layout(HERE / "layout.yaml")
        placed, errors = resolve_layout(CHART, CLASSES, authored)
        self.assertEqual(errors, [])
        # 4 authored, 3 mirrored -> 7 placed
        self.assertEqual(len(placed), 7)
        self.assertTrue(all(p.valid for p in placed),
                        [p.problems for p in placed if not p.valid])
        twins = {p.source_id: p for p in placed if p.is_twin}
        self.assertEqual(set(twins), {"skirt-a", "skirt-b", "bodice-a"})
        self.assertEqual(twins["bodice-a"].rotation, 180)  # the seam case
        self.assertEqual(twins["skirt-a"].rotation, 0)

    def test_back_piece_mirroring(self):
        # theta 150 lives on the BACK piece; its twin at -150 does too, and
        # the seam checks must use the BACK piece's bounds (no wrap bugs).
        src = AuthoredPanel("bk", "XS", 150.0, 250.0, 0, 0, True)
        twin = derive_twin(CHART, CLASSES["XS"], src)
        self.assertTrue(twin.valid)
        self.assertEqual(twin.theta, -150.0)
        self.assertEqual(wrap180(twin.theta - 180.0), 30.0)


class TestPanelLibrary(unittest.TestCase):
    def test_classes_load(self):
        self.assertEqual(set(CLASSES), {"XS", "S", "M", "L"})
        self.assertEqual(CLASSES["S"].connector_exit, (-1.0, 0.0))

    def test_bad_library_fails_loudly(self):
        bad = (
            "units: mm\n"
            "classes:\n"
            "  A:  # structural problems\n"
            "    outline: {width: 30.0, height: 45.0, depth: 2}\n"
            "    thickness: -1.0\n"
            "    active_area: {width: 25.0, height: 39.0, offset: [2.0, 3.0]}\n"
            "    connector: {origin: [15.0, 0.0], exit_vector: [0.0, -1.0], escape_mm: 10.0}\n"
            "  B:  # cross-field problems (all fields parse)\n"
            "    outline: {width: 30.0, height: 45.0}\n"
            "    thickness: 1.0\n"
            "    active_area: {width: 40.0, height: 39.0, offset: [2.0, 3.0]}\n"
            "    connector: {origin: [15.0, 20.0], exit_vector: [0.0, 0.0], escape_mm: 10.0}\n"
        )
        with self.assertRaises(PanelSpecError) as ctx:
            load_panel_classes(tmpfile(bad))
        msg = str(ctx.exception)
        for frag in ("unknown key(s): depth", "thickness: must be > 0",
                     "does not fit inside the outline", "must lie on the outline perimeter",
                     "exit_vector: must be non-zero"):
            self.assertIn(frag, msg)


if __name__ == "__main__":
    unittest.main(verbosity=2)
