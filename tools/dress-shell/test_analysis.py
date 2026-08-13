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
from curvature import (STANDOFF_TOLERANCE_MM, analyze_cells, class_distribution,
                       principal_curvatures, required_radius, seat_standoff,
                       tolerance_sweep)
from facets import apply_facets
from grid import GridError, GridSpec, ShellGrid
from layering import (LayeringError, analyze_layering, outline_rect,
                      uncovered_shell_area)
from layout import AuthoredPanel, SurfaceChart, load_layout, resolve_layout
from panels import PanelClass, load_panel_classes
from shell import ShellModel, ShellParams, build_meshes

HERE = Path(__file__).resolve().parent
MODEL = ShellModel(ShellParams())
COORDS = ShellCoords(MODEL)
CHART = SurfaceChart(MODEL, COORDS)
CLASSES = load_panel_classes(HERE / "panels.yaml")
GRID = ShellGrid(CHART, GridSpec(10.0, 25.0))

# synthetic class for layering geometry tests (library-independent)
SYN = {"M": PanelClass("M", 45.0, 70.0, 1.4, 40.0, 63.0, (2.4, 2.0),
                       (22.5, 70.0), (0.0, 1.0), 30.0)}


def place(entries, classes=SYN):
    placed, errors = resolve_layout(CHART, classes, entries)
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
    def test_circumferential_curvature_matches_meusnier(self):
        # surface of revolution: circumferential normal curvature is
        # -cos(phi)/r with tan(phi) = |r'| (Meusnier). At the hem r' = 0,
        # so it is exactly -1/r_hem there; at the waist the 41 deg tilt
        # applies.
        import math as _m
        for z in (0.0, float(MODEL.z_bottom)):
            k1, k2, _ = principal_curvatures(MODEL, 0.0, z)
            r = float(MODEL.radius(z))
            slope = float(MODEL.dradius(z))
            expected = -1.0 / (r * _m.sqrt(1.0 + slope**2))
            self.assertTrue(
                abs(float(k1) - expected) < 5e-6 or abs(float(k2) - expected) < 5e-6,
                (z, float(k1), float(k2), expected))

    def test_dome_is_elliptic_not_saddle(self):
        # the superellipse dome is convex in both directions everywhere
        # away from the hem singularity: K > 0
        for z in (0.0, -100.0, -250.0, -370.0):
            _, _, K = principal_curvatures(MODEL, 0.0, z)
            self.assertGreater(float(K), 0.0, z)

    def test_hem_singularity_clamped_and_flagged(self):
        from curvature import R_MIN_DISPLAY_FLOOR_MM, meridional_radius_profile
        analyses = analyze_cells(COORDS, CHART, GRID, CLASSES, 2.0, samples=3)
        flagged = [a for a in analyses if a.r_min_clamped]
        for a in analyses:
            self.assertGreaterEqual(a.r_min, R_MIN_DISPLAY_FLOOR_MM)
        prof = meridional_radius_profile(MODEL, COORDS)
        self.assertTrue(prof["hem_singular"])   # n = 1.6 < 2
        self.assertGreater(prof["min_radius_mm"], 100.0)  # genuine region is fine
        self.assertLess(prof["band_min_radius_mm"], prof["min_radius_mm"])

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
        # any cell that seats p370 must also seat p213; facet classes are
        # excluded from seating entirely
        analyses = analyze_cells(COORDS, CHART, GRID, CLASSES, 2.0, samples=5)
        for a in analyses:
            self.assertNotIn("p750", a.standoff_by_class)  # requires_facet
            if a.max_class == "p370":
                self.assertLessEqual(a.standoff_by_class["p213"], 2.0)
        dist = class_distribution(analyses)
        self.assertEqual(sum(dist.values()), len(GRID.cells))
        self.assertNotIn("p750", dist)

    def test_tolerance_sweep_monotone(self):
        analyses = analyze_cells(COORDS, CHART, GRID, CLASSES, 2.0, samples=5)
        sweep = tolerance_sweep(analyses, CLASSES, (1.5, 2.0, 2.5, 3.0))
        nones = [sweep[t].get(None, 0) for t in (1.5, 2.0, 2.5, 3.0)]
        self.assertEqual(nones, sorted(nones, reverse=True))  # looser -> fewer empty
        p370 = [sweep[t].get("p370", 0) for t in (1.5, 2.0, 2.5, 3.0)]
        self.assertEqual(p370, sorted(p370))                  # looser -> more p370
        self.assertEqual(sweep[2.0], class_distribution(analyses))

    def test_required_radius_matches_chord_model(self):
        rr = required_radius(CLASSES["p750"], 2.0)
        self.assertAlmostEqual(rr["across_width"], 111.2**2 / 16.0, places=6)
        self.assertGreater(rr["across_width"], 770.0)  # nothing on the shell is that flat


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
        self.assertAlmostEqual(rep.mount_mm["over"], SYN["M"].thickness)
        self.assertAlmostEqual(rep.max_stack_mm, 2.0 * SYN["M"].thickness)

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
        self.assertGreater(unc, total - 2 * SYN["M"].outline_area * 1.2)


if __name__ == "__main__":
    unittest.main(verbosity=2)


class TestFacets(unittest.TestCase):
    def _mesh(self):
        V, _ = build_meshes(MODEL)["FRONT"]
        th, s = COORDS.inverse(V, check_mm=None)
        return V, np.stack([th, s], axis=-1)

    def test_facet_flattens_footprint_and_stays_local(self):
        placed = place([AuthoredPanel("f", "p750", 0.0, 330.0, 0, 0, False)],
                       classes=CLASSES)
        V, ts = self._mesh()
        V2, reports = apply_facets(CHART, COORDS, V, ts, placed, blend_mm=15.0)
        self.assertEqual(len(reports), 1)
        r = reports[0]
        self.assertGreater(r.max_deviation_mm, 1.0)
        self.assertGreater(r.max_deviation_mm, r.rms_deviation_mm)
        # inside the footprint the shell lies in the tangent plane
        f = COORDS.forward(0.0, 330.0)
        n = np.asarray(f["normal"]); n = n / np.linalg.norm(n)
        import math as _m
        mm_per_deg = _m.pi * CHART.r_theta(0.0, 330.0) / 180.0
        # the outline rect is shifted -3.15 mm laterally from the active
        # center (p750's AA is off-center); keep a margin larger than that
        inside = ((np.abs(ts[:, 0]) * mm_per_deg < 0.5 * 111.2 - 6.0)
                  & (np.abs(ts[:, 1] - 330.0) < 0.5 * 170.2 - 6.0))
        self.assertGreater(inside.sum(), 50)
        d = np.abs((V2[inside] - np.asarray(f["position"])) @ n)
        self.assertLess(float(d.max()), 1e-6)
        # far away nothing moved
        far = np.abs(ts[:, 1] - 330.0) > 120.0
        self.assertAlmostEqual(float(np.abs(V2[far] - V[far]).max()), 0.0, places=12)

    def test_mirrored_facet_reports_both_regions(self):
        placed = place([AuthoredPanel("f", "p750", 40.0, 330.0, 0, 0, True)],
                       classes=CLASSES)
        V, ts = self._mesh()
        _, reports = apply_facets(CHART, COORDS, V, ts, placed)
        ids = sorted(r.panel_id for r in reports)
        self.assertEqual(ids, ["f", "f~twin"])
        thetas = sorted(r.theta for r in reports)
        self.assertAlmostEqual(thetas[0], -40.0)
        self.assertAlmostEqual(thetas[1], 40.0)


class TestElectrical(unittest.TestCase):
    def test_rollup_on_starter_layout(self):
        from analysis_report import electrical_rollup
        placed, errors = resolve_layout(CHART, CLASSES, [
            AuthoredPanel("a", "p213", 30.0, 200.0, 0, 0, True),
            AuthoredPanel("b", "p370", 0.0, 250.0, 0, 0, False)])
        self.assertEqual(errors, [])
        el = electrical_rollup(placed)
        n = el["total_panels"]
        self.assertEqual(el["control_lines"], 2 + 4 * n)
        expect_cost = sum(p.cls.price_usd for p in placed
                          if p.valid and p.cls.price_usd is not None)
        self.assertAlmostEqual(el["cost_usd"], round(expect_cost, 2))
        # p213 refresh is unverified -> those panels excluded and listed
        self.assertEqual(sorted(el["refresh_unknown_panels"]), ["a", "a~twin"])
        self.assertAlmostEqual(el["sequential_refresh_s"],
                               sum(p.cls.refresh_s for p in placed
                                   if p.valid and p.cls.refresh_s is not None), places=6)
