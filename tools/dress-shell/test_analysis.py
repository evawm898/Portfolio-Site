"""Tests for the grid, curvature analysis, and layering engine.

Run:  cd tools/dress-shell && python3 -m unittest test_analysis -v
"""

import math
import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

from coords import ShellCoords
from curvature import (analyze_cells, class_distribution, principal_curvatures,
                       seat_standoff)
from grid import GridError, GridSpec, ShellGrid
from layering import (LayeringError, analyze_layering, outline_rect,
                      uncovered_shell_area)
from layout import AuthoredPanel, SurfaceChart, resolve_layout
from panels import load_panel_classes
from shell import ShellModel, ShellParams

HERE = Path(__file__).resolve().parent
MODEL = ShellModel(ShellParams())
COORDS = ShellCoords(MODEL)
CHART = SurfaceChart(MODEL, COORDS)
CLASSES = load_panel_classes(HERE / "panels.yaml")
GRID = ShellGrid(CHART, GridSpec(10.0, 25.0))


def place(entries):
    placed, errors = resolve_layout(CHART, CLASSES, entries)
    assert not errors, errors
    return placed


class TestGrid(unittest.TestCase):
    def test_bad_spacing_rejected(self):
        with self.assertRaises(GridError):
            ShellGrid(CHART, GridSpec(dtheta=7.0))
        with self.assertRaises(GridError):
            ShellGrid(CHART, GridSpec(ds=-5.0))

    def test_cell_lookup_and_snap_targets(self):
        cell = GRID.cell_at(3.0, 210.0)
        self.assertTrue(cell.theta0 <= 3.0 <= cell.theta1)
        self.assertTrue(cell.s0 <= 210.0 <= cell.s1)
        targets = GRID.snap_targets(cell)
        kinds = [k for _, _, k in targets]
        self.assertEqual(kinds.count("corner"), 4)
        self.assertEqual(kinds.count("edge"), 4)
        self.assertEqual(kinds.count("center"), 1)

    def test_snap_picks_nearest_physically(self):
        cell = GRID.cell_at(5.0, 210.0)
        t, s, kind = GRID.snap(cell.theta_c + 0.1, cell.s_c + 0.5)
        self.assertEqual(kind, "center")
        t, s, kind = GRID.snap(cell.theta0 + 0.05, cell.s0 + 0.5)
        self.assertEqual(kind, "corner")
        self.assertAlmostEqual(t, cell.theta0)
        self.assertAlmostEqual(s, cell.s0)

    def test_wraparound_theta(self):
        cell = GRID.cell_at(184.0, 100.0)  # wraps to -176
        self.assertIsNotNone(cell)
        self.assertTrue(cell.theta0 <= -176.0 <= cell.theta1)

    def test_cell_stats_report_variation(self):
        st = GRID.cell_stats()
        self.assertEqual(st["count"], len(GRID.cells))
        # widths vary with radius: hem cells are widest, waist narrowest
        self.assertGreater(st["width_max"], st["width_min"])
        self.assertLessEqual(st["height_max"], GRID.spec.ds + 1e-9)


class TestCurvature(unittest.TestCase):
    def test_circumferential_curvature_matches_ellipse_formula(self):
        # at center front the ellipse x = a sin t, y = b cos t has curvature
        # b/a^2 at t = 0; the surface's k along theta must match (convex ->
        # negative with the outward normal)
        k1, k2, K = principal_curvatures(MODEL, 0.0, 0.0)
        a0, b0 = float(MODEL.a(0.0)), float(MODEL.b(0.0))
        self.assertAlmostEqual(float(k2), -b0 / a0**2, places=6)

    def test_waist_is_a_saddle(self):
        _, _, K = principal_curvatures(MODEL, 0.0, 0.0)
        self.assertLess(float(K), 0.0)

    def test_standoff_off_edge_and_across_seam_is_inf(self):
        near_top = CHART.s_min + 5.0
        self.assertEqual(seat_standoff(COORDS, CHART, 45.0, 70.0, 0.0, near_top),
                         float("inf"))
        self.assertEqual(seat_standoff(COORDS, CHART, 45.0, 70.0, 89.0, 300.0),
                         float("inf"))  # crosses the +90 seam

    def test_standoff_matches_chord_scale(self):
        # gently curved skirt spot: sampled standoff within 2x of the
        # w^2/8R + h^2/8R chord estimate (same order, never wildly off)
        z0 = float(COORDS.z_of_s(300.0))
        k1, k2, _ = principal_curvatures(MODEL, 0.0, z0)
        est = 45.0**2 / 8.0 * abs(float(k2)) + 70.0**2 / 8.0 * abs(float(k1))
        so = seat_standoff(COORDS, CHART, 45.0, 70.0, 0.0, 300.0)
        self.assertGreater(so, 0.3 * est)
        self.assertLess(so, 2.0 * est)

    def test_class_map_monotone_in_size(self):
        # any cell that seats L must also seat every smaller class
        analyses = analyze_cells(COORDS, CHART, GRID, CLASSES, 2.0, samples=5)
        order = [c.class_id for c in sorted(CLASSES.values(),
                                            key=lambda c: c.outline_area)]
        for a in analyses:
            if a.max_class == "L":
                for smaller in order[:order.index("L")]:
                    self.assertLessEqual(a.standoff_by_class[smaller], 2.0)
        dist = class_distribution(analyses)
        self.assertEqual(sum(dist.values()), len(GRID.cells))


class TestLayering(unittest.TestCase):
    def overlapping_pair(self, layer2=1):
        return place([
            AuthoredPanel("under", "M", 10.0, 300.0, 0, 0, False),
            AuthoredPanel("over", "M", 12.0, 310.0, 0, layer2, False),
        ])

    def test_same_layer_overlap_is_a_hard_error_naming_panels(self):
        with self.assertRaises(LayeringError) as ctx:
            analyze_layering(CHART, self.overlapping_pair(layer2=0))
        msg = str(ctx.exception)
        self.assertIn("'over'", msg)
        self.assertIn("'under'", msg)

    def test_mount_heights_walk_outward(self):
        rep = analyze_layering(CHART, self.overlapping_pair())
        self.assertEqual(rep.mount_mm["under"], 0.0)
        self.assertAlmostEqual(rep.mount_mm["over"], CLASSES["M"].thickness)
        self.assertAlmostEqual(rep.max_stack_mm, 2.0 * CLASSES["M"].thickness)

    def test_occlusion_visible_area(self):
        rep = analyze_layering(CHART, self.overlapping_pair())
        self.assertAlmostEqual(rep.visible_pct["over"], 100.0)
        self.assertLess(rep.visible_pct["under"], 100.0)
        self.assertGreater(rep.visible_pct["under"], 20.0)
        self.assertAlmostEqual(
            rep.total_visible,
            rep.visible_area["under"] + rep.visible_area["over"])

    def test_buried_connector_flagged(self):
        # 'under' (M) exits out its bottom edge; 'over' sits above-right and
        # covers part of that escape path from a higher layer
        rep = analyze_layering(CHART, self.overlapping_pair())
        self.assertIn("under", rep.buried_connectors)
        self.assertEqual(rep.buried_connectors["under"], ["over"])

    def test_non_overlapping_panels_have_no_interactions(self):
        rep = analyze_layering(CHART, place([
            AuthoredPanel("p1", "M", 10.0, 300.0, 0, 0, False),
            AuthoredPanel("p2", "M", 60.0, 300.0, 0, 1, False),
        ]))
        self.assertEqual(rep.overlaps, [])
        self.assertEqual(rep.buried_connectors, {})
        self.assertEqual(rep.mount_mm["p2"], 0.0)

    def test_uncovered_area(self):
        empty_unc, total = uncovered_shell_area(CHART, [])
        self.assertAlmostEqual(empty_unc, total)
        placed = self.overlapping_pair()
        unc, total2 = uncovered_shell_area(CHART, placed)
        self.assertAlmostEqual(total, total2)
        self.assertLess(unc, total)
        # covered area is at most the sum of the two outlines
        self.assertGreater(unc, total - 2 * CLASSES["M"].outline_area * 1.2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
