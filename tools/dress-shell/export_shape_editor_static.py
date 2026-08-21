#!/usr/bin/env python3
"""Bakes the static-site shape editor's starting data — NOT a live server.

The local dev server (shape_editor_server.py) needs a machine the user can
reach; they can't reach one. This script runs the same Python numerics
ONCE, offline, and writes the result as static JSON the deployed page
loads directly — no backend at request time. Curve editing / 3D
regeneration / circumference / monotonicity all run entirely in the
browser from there (shape-editor-geom.js, cross-validated against
shell.py's ShellModel.point() to ~1e-13mm — see the commit message for
the bug that check caught). The full curvature/seatability sweep is NOT
re-portable this way (grid.py/curvature.py's numeric fundamental-forms
machinery) — its numbers are baked in as a labeled SNAPSHOT, not a live
readout, exactly as flagged: stale the moment you drag, refreshed only by
re-running this script and republishing.

Run:  cd tools/dress-shell && python3 export_shape_editor_static.py
Writes: ../assets/shape-editor-data.json
        ../assets/shape-editor/silhouette-front.png (resized)
        ../assets/shape-editor/silhouette-trace.png (resized)
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np

from coords import ShellCoords
from curvature import HEM_SINGULAR_BAND_MM, STANDOFF_TOLERANCE_MM, analyze_cells, class_distribution
from front_silhouette import DEFAULT_TAPE_ANCHORS
from grid import GridSpec, ShellGrid
from layout import SurfaceChart
from panels import load_panel_classes
from shell import PLATEAU_CF_DEPTH_MM, PLATEAU_THETA_DEG, ShellModel, dress_params

HERE = Path(__file__).resolve().parent
SITE_ROOT = HERE.parents[1]
OUT_JSON = SITE_ROOT / "assets" / "shape-editor-data.json"
OUT_IMG_DIR = SITE_ROOT / "assets" / "shape-editor"

TOLERANCE_MM = STANDOFF_TOLERANCE_MM
GRID_SPEC = GridSpec(dtheta=10.0, ds=25.0)

_SEED_V_INTERIOR = [-370.0, -340.0, -300.0, -260.0, -220.0, -180.0, -140.0,
                    -100.0, -60.0, -30.0, -15.0, -5.0, 0.0, 5.0, 15.0, 30.0,
                    60.0, 90.0, 120.0, 145.0, 155.0, 165.0, 175.0, 181.0,
                    190.0, 200.0, 210.0, 220.0, 230.0]

DEFAULT_GENERATOR = {
    "hem_circumference": 1549.4, "dome_n": 1.6,
    "fillet_radius": 25.0, "fillet_type": "conic",
    "plateau_theta_deg": PLATEAU_THETA_DEG,
    "plateau_cf_depth_mm": PLATEAU_CF_DEPTH_MM, "plateau_radius_mm": 70.0,
}


def full_shell_analysis(model, classes):
    coords = ShellCoords(model)
    chart = SurfaceChart(model, coords)
    grid = ShellGrid(chart, GRID_SPEC)
    analyses = analyze_cells(coords, chart, grid, classes, TOLERANCE_MM, samples=7)
    cells = grid.cells
    tc = np.array([c.theta_c for c in cells])
    lam = (tc + 180.0) % 360.0 - 180.0
    front_mask = np.abs(lam) < chart.split_theta

    p213_area = usable_area = total_area = 0.0
    min_r, min_r_at = float("inf"), None
    band_min_r, band_min_r_at = float("inf"), None
    for a, c in zip(analyses, cells):
        r = chart.r_theta(c.theta_c, c.s_c)
        area = np.radians(c.theta1 - c.theta0) * r * (c.s1 - c.s0)
        total_area += area
        if a.off_shell:
            continue
        if a.max_class == "p213":
            p213_area += area
        if a.max_class is not None:
            usable_area += area
        if not np.isfinite(a.r_min):
            continue
        near_hem = (coords.s_max - c.s_c) <= HEM_SINGULAR_BAND_MM
        if near_hem:
            if a.r_min < band_min_r:
                band_min_r, band_min_r_at = a.r_min, (float(c.theta_c), float(c.s_c))
        elif a.r_min < min_r:
            min_r, min_r_at = a.r_min, (float(c.theta_c), float(c.s_c))

    front = [a for a, f in zip(analyses, front_mask) if f]
    back = [a for a, f in zip(analyses, front_mask) if not f]
    return {
        "p213_area_mm2": float(p213_area), "usable_area_mm2": float(usable_area),
        "total_shell_area_mm2": float(total_area),
        "min_radius_mm": None if not np.isfinite(min_r) else float(min_r),
        "min_radius_at": min_r_at, "hem_singular": bool(model.n < 2.0),
        "hem_band_mm": HEM_SINGULAR_BAND_MM,
        "hem_band_min_radius_mm": None if not np.isfinite(band_min_r) else float(band_min_r),
        "hem_band_min_radius_at": band_min_r_at,
        "class_distribution_front": {str(k): v for k, v in class_distribution(front).items()},
        "class_distribution_back": {str(k): v for k, v in class_distribution(back).items()},
    }


def circumference_report(model, v_lo, v_hi):
    from bodice import _perimeter_np
    rows = []
    for label, v, tape_mm in DEFAULT_TAPE_ANCHORS:
        in_range = v_lo <= v <= v_hi
        vv = min(max(v, v_lo), v_hi)
        a = float(np.asarray(model.a(np.array(vv))))
        b = float(np.asarray(model.b(np.array(vv))))
        derived = float(_perimeter_np(np.array(a), np.array(b)))
        rows.append({"label": label, "v": v, "derived_mm": derived, "tape_mm": tape_mm,
                    "delta_mm": derived - tape_mm, "in_range": in_range})
    return rows


def resize_backdrop(src, dst, max_dim=640):
    from PIL import Image
    im = Image.open(src)
    scale = max_dim / max(im.size)
    im2 = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))),
                    Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im2.save(dst, optimize=True)
    return dst.stat().st_size


def main():
    committed = ShellModel(dress_params())            # bust="apex" — unchanged default
    classes = load_panel_classes(HERE / "panels.yaml")

    from fillet import FilletParams
    gen = DEFAULT_GENERATOR
    fp = FilletParams(fillet_radius=gen["fillet_radius"], fillet_type=gen["fillet_type"],
                      hem_circumference=gen["hem_circumference"], dome_n=gen["dome_n"])
    seed_params = dress_params(fillet_params=fp, bust="plateau",
                               plateau_theta_deg=gen["plateau_theta_deg"],
                               plateau_cf_depth_mm=gen["plateau_cf_depth_mm"],
                               plateau_radius_mm=gen["plateau_radius_mm"])
    seed_model = ShellModel(seed_params)

    z_bottom, z_top = float(seed_model.z_bottom), float(seed_model.z_top)
    if abs(z_bottom - committed.z_bottom) > 1e-3 or abs(z_top - committed.z_top) > 1e-3:
        raise SystemExit("committed and plateau-seed domains disagree — investigate before baking")

    seed_v = sorted({z_bottom, z_top, *[v for v in _SEED_V_INTERIOR if z_bottom < v < z_top]})
    seed_a = np.asarray(seed_model.a(np.array(seed_v)), dtype=float).tolist()
    seed_b = np.asarray(seed_model.b(np.array(seed_v)), dtype=float).tolist()

    z = np.linspace(z_bottom, z_top, 801)
    n = committed.neckline.params

    print("running baseline (committed, apex) full analysis ...")
    baseline_analysis = full_shell_analysis(committed, classes)
    print("running initial (plateau-seeded) full analysis ...")
    initial_analysis = full_shell_analysis(seed_model, classes)

    payload = {
        "note": ("STATIC SNAPSHOT — baked by export_shape_editor_static.py. "
                "Curve/mesh/circumference/monotonicity are live in the browser; "
                "the *_shell_analysis blocks (curvature/seatability sweep) are "
                "NOT live — they reflect the shell as of this bake, go stale the "
                "moment you drag, and only refresh when this script is re-run "
                "and republished."),
        "domain": {"v_lo": z_bottom, "v_hi": z_top},
        "seed_a_points": list(zip(seed_v, seed_a)),
        "seed_bf_points": list(zip(seed_v, seed_b)),
        "seed_bb_points": list(zip(seed_v, seed_b)),
        "default_a_table": {"z": np.round(z, 3).tolist(),
                            "a": np.round(np.asarray(committed.a(z)), 4).tolist()},
        "default_b_table": {"z": np.round(z, 3).tolist(),
                            "b": np.round(np.asarray(committed.b(z)), 4).tolist()},
        "bounds": {"split_theta": float(committed.split_theta)},
        "neckline": {"cf_height": n.cf_height, "peak_height": n.peak_height,
                    "peak_theta": n.peak_theta, "side_height": n.side_height,
                    "cb_height": n.cb_height, "rise_bow": n.rise_bow,
                    "decay_rate": n.decay_rate, "cf_corner": n.cf_corner},
        "generator": gen,
        "circumference_initial": circumference_report(seed_model, z_bottom, z_top),
        "baseline_shell_analysis": baseline_analysis,
        "initial_shell_analysis": initial_analysis,
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, indent=1))
    print(f"wrote {OUT_JSON} ({OUT_JSON.stat().st_size} bytes)")

    for name in ("silhouette-front.png", "silhouette-trace.png"):
        size = resize_backdrop(HERE / name, OUT_IMG_DIR / name)
        print(f"wrote {OUT_IMG_DIR / name} ({size} bytes)")


if __name__ == "__main__":
    main()
