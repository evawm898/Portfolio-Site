#!/usr/bin/env python3
"""Local dev server for the SHAPE editor — milestone 3, separate from the
placement editor (editor_server.py). NOT part of the deployed site, does
NOT touch layout.yaml or the /dress export. Run it by hand:

    python3 tools/dress-shell/shape_editor_server.py [--port 8766]

CURVES: a(v) and b(v) are both editable (drag control points, fixed v).
Neckline heights, skirt hem circumference / dome_n, and the waist fillet
stay as number inputs (the placement editor's already-proven pattern —
rebuilding these as free-drag curves wouldn't add precision, since the
committed shell already treats them as scalar knobs, not traces).
theta_armhole is a SOLVED output (P(190) split), never a control —
shown read-only, matching the placement editor's existing convention.

ARCHITECTURAL CONFLICT, FLAGGED RATHER THAN SILENTLY RESOLVED: once
a(v) AND b(v) are BOTH freely authored curves, ShellModel's
section_curves mode takes over semi_axes() unconditionally across the
WHOLE domain (waist to hem, waist to neckline) — see shell.py's
semi_axes(): the `self.curves is not None` branch returns immediately,
before the ratio/fillet/bust-plateau machinery ever runs. That makes
hem_circumference, dome_n, fillet_radius, and the bust plateau
(PlateauBustDepth's span/depth) INERT the moment curves are active —
they used to shape a(z)/b(z), and a(z)/b(z) are now drawn directly. Bust
plateau specifically becomes redundant with direct dragging (the whole
point of that control was authoring bust shape without a curve editor;
now there is one) so it isn't offered here at all. hem_circumference /
dome_n / fillet_radius stay as inputs (echoed back from the model in
case you want to compare), each response names them "inert" explicitly
so the UI can warn rather than imply they did something. Neckline
height IS still independent — it only clips the mesh top per azimuth,
it isn't a semi-axis — so it composes cleanly and stays fully live.

TWO-SPEED CONTRACT, unchanged from the a(v) slice:
  - COARSE: shape-editor/geom.js, every pointermove, no network.
  - FULL: POST /api/curve on pointerup — the real scipy PCHIP +
    ShellModel + build_meshes + the full curvature/seatability analysis
    (grid.py/curvature.py/panels.yaml, the SAME machinery and grid spec
    editor_server.py uses, so the vs-committed comparison is apples to
    apples). This analysis pass costs real time (a placement-editor-
    scale grid sweep) — it only ever runs on release, never per frame.
"""

import argparse
import json
import sys
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from bodice import _perimeter_np
from coords import ShellCoords
from curvature import STANDOFF_TOLERANCE_MM, analyze_cells, class_distribution
from front_silhouette import DEFAULT_TAPE_ANCHORS
from grid import GridSpec, ShellGrid
from layout import SurfaceChart
from panels import load_panel_classes
from shape_state import (ShapeError, ShapeState, build_params_from_shape,
                         load_shape, save_shape)
from shell import ShellError, ShellModel, build_meshes, dress_params

VENDOR_DIR = HERE.parents[1] / "dress" / "vendor"
STATIC_DIR = HERE / "shape-editor"
SHAPE_PATH = HERE / "shape.yaml"
TOLERANCE_MM = STANDOFF_TOLERANCE_MM
GRID_SPEC = GridSpec(dtheta=10.0, ds=25.0)   # same spec editor_server.py uses

# seed control-point heights (mm, waist = 0): endpoints pinned to the
# shell's actual z_bottom/z_top so section_curves' domain check always
# passes. Density matters here, not just coverage: a first check with 12
# evenly-ish spaced points reproduced a(v)/b(v) EXACTLY at every seed
# point (PCHIP is interpolating, not approximating) but still cost
# -72,000 mm^2 of p213 area vs the committed baseline, because the true
# curve moves sharply BETWEEN sparse points — the waist fillet crease
# (a local min in a(v) across roughly v in [-10, 10]) and the bust-bump
# ramp (a(v) rises ~50 mm across v in [155, 205]) both got smoothed over.
# Denser sampling there brings the whole-domain fit residual against the
# committed a(v)/b(v) under 0.7 mm max (checked before adopting this
# list) — that's what makes the UNCHANGED control points reproduce the
# committed shell to floating-point precision AND the committed
# geometry, not just the seed values.
_SEED_V_INTERIOR = [-340.0, -300.0, -260.0, -220.0, -180.0, -140.0, -100.0,
                    -60.0, -30.0, -15.0, -5.0, 0.0, 5.0, 15.0, 30.0, 60.0, 90.0,
                    120.0, 145.0, 155.0, 165.0, 175.0, 181.0, 190.0, 200.0,
                    210.0, 220.0, 230.0]


def _monotonicity_report(a_fn, v_hi, n=2001):
    """Same methodology as front_silhouette.MeasuredSections
    .monotonicity_report: non-increasing from the waist (v=0) UP to the
    neckline is the expectation, reported not asserted."""
    vv = np.linspace(0.0, v_hi, n) if v_hi > 0 else np.array([0.0])
    a = np.asarray(a_fn(vv), dtype=float)
    da = np.diff(a)
    worst_i = int(np.argmax(da)) if len(da) else None
    return {
        "v_range": [0.0, float(v_hi)],
        "non_increasing_waist_to_neckline": bool(np.all(da <= 1e-9)) if len(da) else True,
        "worst_positive_slope_mm_per_mm": float(da[worst_i]) if worst_i is not None else 0.0,
        "worst_at_v": float(vv[worst_i]) if worst_i is not None else None,
    }


def _circumference_report(model, v_lo, v_hi):
    """Derived circumference at the standard tape anchors, vs tape mm —
    pure read-out, exactly front_silhouette.py's methodology
    (DEFAULT_TAPE_ANCHORS, Ramanujan perimeter, never adjusted)."""
    rows = []
    for label, v, tape_mm in DEFAULT_TAPE_ANCHORS:
        in_range = v_lo <= v <= v_hi
        vv = min(max(v, v_lo), v_hi)
        a = float(np.asarray(model.a(np.array(vv))))
        b = float(np.asarray(model.b(np.array(vv))))
        derived = float(_perimeter_np(np.array(a), np.array(b)))
        rows.append({"label": label, "v": v, "derived_mm": derived, "tape_mm": tape_mm,
                    "delta_mm": derived - tape_mm,
                    "delta_pct": 100.0 * (derived - tape_mm) / tape_mm,
                    "in_range": in_range})
    return rows


def _mesh_payload(model):
    meshes = build_meshes(model)
    out = {}
    for name, (V, F) in meshes.items():
        out[name] = {"positions": np.round(V, 2).ravel().tolist(),
                      "indices": F.ravel().tolist()}
    return out


def _full_shell_analysis(model, classes):
    """The SAME analysis pipeline editor_server.py runs for the placement
    editor (coords/chart/grid/analyze_cells at the same GRID_SPEC), so
    every number here is directly comparable to the committed baseline.
    Costs real time — full tier only."""
    coords = ShellCoords(model)
    chart = SurfaceChart(model, coords)
    grid = ShellGrid(chart, GRID_SPEC)
    analyses = analyze_cells(coords, chart, grid, classes, TOLERANCE_MM, samples=7)
    cells = grid.cells
    tc = np.array([c.theta_c for c in cells])
    lam = (tc + 180.0) % 360.0 - 180.0
    front_mask = np.abs(lam) < chart.split_theta

    on_shell = [(a, c) for a, c in zip(analyses, cells) if not a.off_shell]
    p213_area = 0.0
    usable_area = 0.0
    total_area = 0.0
    min_r, min_r_at = float("inf"), None
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
        if np.isfinite(a.r_min) and a.r_min < min_r:
            min_r, min_r_at = a.r_min, (float(c.theta_c), float(c.s_c))

    front = [a for a, f in zip(analyses, front_mask) if f]
    back = [a for a, f in zip(analyses, front_mask) if not f]
    return {
        "p213_area_mm2": float(p213_area),
        "usable_area_mm2": float(usable_area),
        "total_shell_area_mm2": float(total_area),
        "min_radius_mm": None if not np.isfinite(min_r) else float(min_r),
        "min_radius_at": min_r_at,
        "class_distribution_front": {str(k): v for k, v in class_distribution(front).items()},
        "class_distribution_back": {str(k): v for k, v in class_distribution(back).items()},
    }


def _is_v3(model):
    from neckline import NecklineV3
    return isinstance(model.neckline, NecklineV3)


class State:
    """The one fixed reference everything composes against: the actual
    committed shell (dress_params(), untouched). Baseline full analysis
    is computed ONCE here so every /api/curve response can diff against
    it without re-running the committed shell's own grid sweep."""

    def __init__(self):
        print("shape editor: building committed reference shell + baseline analysis ...")
        self.model = ShellModel(dress_params())
        self.z_bottom = float(self.model.z_bottom)
        self.z_top = float(self.model.z_top)
        self.classes = load_panel_classes(HERE / "panels.yaml")

        if SHAPE_PATH.exists():
            print(f"shape editor: loading saved shape from {SHAPE_PATH.name}")
            saved = load_shape(SHAPE_PATH)
            self.seed_a_points = saved.a_points
            self.seed_b_points = saved.b_points
        else:
            seed_v = sorted({self.z_bottom, self.z_top,
                             *[v for v in _SEED_V_INTERIOR
                               if self.z_bottom < v < self.z_top]})
            seed_a = np.asarray(self.model.a(np.array(seed_v)), dtype=float).tolist()
            seed_b = np.asarray(self.model.b(np.array(seed_v)), dtype=float).tolist()
            self.seed_a_points = list(zip(seed_v, seed_a))
            self.seed_b_points = list(zip(seed_v, seed_b))
        z = np.linspace(self.z_bottom, self.z_top, 801)
        self.default_a_table = {"z": np.round(z, 3).tolist(),
                                "a": np.round(np.asarray(self.model.a(z)), 4).tolist()}
        self.default_b_table = {"z": np.round(z, 3).tolist(),
                                "b": np.round(np.asarray(self.model.b(z)), 4).tolist()}
        self.mesh = _mesh_payload(self.model)
        self.baseline_analysis = _full_shell_analysis(self.model, self.classes)
        self.readout = {
            "monotonicity": _monotonicity_report(self.model.a, self.z_top),
            "circumference": _circumference_report(self.model, self.z_bottom, self.z_top),
            "shell": self.baseline_analysis,
        }
        print(f"shape editor: ready ({len(self.classes)} panel classes, "
              f"baseline p213 area {self.baseline_analysis['p213_area_mm2']:.0f} mm2)")

    def _to_shape(self, body):
        neckline = {k: v for k, v in (body.get("neckline") or {}).items()
                   if k in ("cf_height", "peak_height", "peak_theta", "side_height",
                           "cb_height", "rise_bow", "decay_rate", "cf_corner")}
        return ShapeState(a_points=body.get("a_points", []),
                          b_points=body.get("b_points", []),
                          neckline=neckline,
                          skirt_fillet=body.get("skirt_fillet") or {})

    def build_curve_response(self, body):
        shape = self._to_shape(body)
        new_params = build_params_from_shape(self.model.params, shape,
                                             self.z_bottom, self.z_top)
        new_model = ShellModel(new_params)   # ShellError -> 422 (caller catches)

        a_vs = [v for v, _ in shape.a_points]
        b_vs = [v for v, _ in shape.b_points]
        z_seed = np.array(sorted(set(a_vs) | set(b_vs)))
        dev_a = (np.asarray(new_model.a(z_seed)) - np.asarray(self.model.a(z_seed)))
        dev_b = (np.asarray(new_model.b(z_seed)) - np.asarray(self.model.b(z_seed)))

        inert = list(shape.skirt_fillet.keys())

        shell = _full_shell_analysis(new_model, self.classes)
        base = self.baseline_analysis
        return {
            "mesh": _mesh_payload(new_model),
            "split_theta": float(new_model.split_theta),
            "readout": {
                "monotonicity": _monotonicity_report(new_model.a, self.z_top),
                "circumference": _circumference_report(new_model, self.z_bottom, self.z_top),
                "shell": shell,
                "vs_committed": {
                    "p213_area_delta_mm2": shell["p213_area_mm2"] - base["p213_area_mm2"],
                    "usable_area_delta_mm2": shell["usable_area_mm2"] - base["usable_area_mm2"],
                },
            },
            "deviation_from_committed_mm": {
                "a_max": float(np.max(np.abs(dev_a))), "a_rms": float(np.sqrt(np.mean(dev_a ** 2))),
                "b_max": float(np.max(np.abs(dev_b))), "b_rms": float(np.sqrt(np.mean(dev_b ** 2))),
            },
            "inert_fields_ignored": inert,
        }

    def save_shape_response(self, body):
        shape = self._to_shape(body)
        # validate before writing anything to disk — same discipline as
        # build_curve_response: a bad shape never gets past ShellModel
        build_params_from_shape(self.model.params, shape, self.z_bottom, self.z_top)
        text = save_shape(SHAPE_PATH, shape)
        return {"saved": True, "path": str(SHAPE_PATH.name), "bytes": len(text)}


STATE = None


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="application/json"):
        data = body if isinstance(body, (bytes, bytearray)) else json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _file(self, path, ctype):
        try:
            self._send(200, path.read_bytes(), ctype)
        except FileNotFoundError:
            self._send(404, {"error": f"not found: {path.name}"})

    def do_GET(self):
        p = self.path.split("?")[0]
        if p in ("/", "/index.html"):
            self._file(STATIC_DIR / "index.html", "text/html; charset=utf-8")
        elif p in ("/editor.js", "/geom.js"):
            self._file(STATIC_DIR / p.lstrip("/"), "text/javascript")
        elif p in ("/silhouette-front.png", "/silhouette-trace.png"):
            self._file(HERE / p.lstrip("/"), "image/png")
        elif p.startswith("/vendor/"):
            rel = Path(p).relative_to("/vendor")
            target = (VENDOR_DIR / rel).resolve()
            if VENDOR_DIR.resolve() not in target.parents and target != VENDOR_DIR.resolve():
                self._send(403, {"error": "outside vendor dir"})
            else:
                self._file(target, "text/javascript")
        elif p == "/api/state":
            m = STATE.model
            neck = None
            if _is_v3(m):
                n = m.neckline.params
                neck = {"cf_height": n.cf_height, "peak_height": n.peak_height,
                       "peak_theta": n.peak_theta, "side_height": n.side_height,
                       "cb_height": n.cb_height, "rise_bow": n.rise_bow,
                       "decay_rate": n.decay_rate, "cf_corner": n.cf_corner}
            fillet = getattr(m.params.depth_curve, "params", None)
            self._send(200, {
                "domain": {"v_lo": STATE.z_bottom, "v_hi": STATE.z_top},
                "seed_a_points": STATE.seed_a_points,
                "seed_b_points": STATE.seed_b_points,
                "default_a_table": STATE.default_a_table,
                "default_b_table": STATE.default_b_table,
                "mesh": STATE.mesh,
                "readout": STATE.readout,
                "bounds": {"split_theta": float(m.split_theta)},
                "neckline": neck,
                "skirt_fillet": {
                    "hem_circumference": m.params.hem_circumference,
                    "dome_n": m.params.dome_n,
                    "fillet_radius": None if fillet is None else fillet.fillet_radius,
                    "fillet_type": None if fillet is None else fillet.fillet_type,
                },
            })
        else:
            self._send(404, {"error": "unknown route"})

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            return self._send(400, {"error": "invalid JSON body"})
        try:
            if self.path == "/api/curve":
                resp = STATE.build_curve_response(body)
                self._send(200, resp)
            elif self.path == "/api/shape":
                resp = STATE.save_shape_response(body)
                self._send(200, resp)
            else:
                self._send(404, {"error": "unknown route"})
        except (ShellError, ShapeError, KeyError, TypeError, ValueError) as exc:
            self._send(422, {"error": str(exc)})
        except Exception:
            self._send(500, {"error": traceback.format_exc()})

    def log_message(self, fmt, *args):
        pass  # quiet


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--port", type=int, default=8766)
    args = ap.parse_args()
    global STATE
    STATE = State()
    srv = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"shape editor: http://127.0.0.1:{args.port}/  (Ctrl-C to stop)")
    srv.serve_forever()


if __name__ == "__main__":
    main()
