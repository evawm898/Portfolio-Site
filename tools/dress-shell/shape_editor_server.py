#!/usr/bin/env python3
"""Local dev server for the SHAPE editor — milestone 3, separate from the
placement editor (editor_server.py). NOT part of the deployed site, does
NOT touch layout.yaml or the /dress export. Run it by hand:

    python3 tools/dress-shell/shape_editor_server.py [--port 8766]

CURVES: a(v), b_front(v), b_back(v) are all editable (drag control
points, fixed v). Sections are the compound of two half-ellipses sharing
a(v) — front semi-axes (a, b_front), back semi-axes (a, b_back),
perimeter the mean of the two Ramanujan perimeters — see shape_state.py
for the CompoundShapeCurves plumbing and why this reuses
compound.CompoundShellModel's section geometry without its solved-a(v)
plumbing. Neckline heights stay live (independent of a/b — only clips
the mesh top). theta_armhole is a SOLVED output, never a control.

GENERATORS, NOT LIVE CONTROLS: hem_circumference, dome_n, fillet_radius/
type, and the bust apex span/depth used to shape a(z)/b(z) directly —
now that those are drawn, a control that no longer does anything is
worse than none. POST /api/generate builds the ordinary analytic
committed-family shell (dress_params()) from these parameters and
resamples the seed grid from it — a STARTING POINT to drag from, not a
persistent binding (see shape_state.py's module docstring). The
generator note commits ONE apex bust knob set matching the actual
committed bust construction (bust="apex", dress_params()'s default) —
NOT the never-wired PlateauBustDepth "bust plateau" class from earlier
project history; flagged explicitly rather than silently assumed.

STANDING RULE (from the 72,000 mm^2 finding): never validate a curve fit
only at its control points — PCHIP interpolates, so the at-point
residual is always ~0 regardless of seed density and hides exactly the
failure that mattered. Every fit here is checked BETWEEN its control
points (dense grid, midpoints included) against whatever ground truth
exists (the analytic generator source, right after generating), and
every full-tier response reports the seatable-area delta against the
committed baseline, not just geometric deviation.

TWO-SPEED CONTRACT, unchanged: COARSE is shape-editor/geom.js, every
pointermove, no network. FULL is POST /api/curve on pointerup — the
real scipy PCHIP + ShellModel + build_meshes + the full curvature/
seatability analysis (grid.py/curvature.py/panels.yaml, the SAME
machinery and grid spec editor_server.py uses). Costs real time (~10-15
s) — only ever runs on release, never per frame.
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

from compound import compound_perimeter
from coords import ShellCoords
from curvature import STANDOFF_TOLERANCE_MM, analyze_cells, class_distribution
from fillet import FilletParams
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
# shell's actual z_bottom/z_top so the domain check always passes.
# Density matters here, not just coverage: a first check with 12
# evenly-ish spaced points reproduced a(v)/b(v) EXACTLY at every seed
# point (PCHIP is interpolating, not approximating) but still cost
# -72,000 mm^2 of p213 area vs the committed baseline, because the true
# curve moves sharply BETWEEN sparse points — the waist fillet crease
# (a local min in a(v) across roughly v in [-10, 10]) and the bust-bump
# ramp (a(v) rises ~50 mm across v in [155, 205]) both got smoothed
# over. This list brings the whole-domain fit residual against the
# committed a(v)/b(v) under 0.7 mm max (checked in generate_seed_curves
# below, reported on every /api/generate call, not just once by hand).
_SEED_V_INTERIOR = [-370.0, -340.0, -300.0, -260.0, -220.0, -180.0, -140.0,
                    -100.0, -60.0, -30.0, -15.0, -5.0, 0.0, 5.0, 15.0, 30.0,
                    60.0, 90.0, 120.0, 145.0, 155.0, 165.0, 175.0, 181.0,
                    190.0, 200.0, 210.0, 220.0, 230.0]

# committed-family bust construction: bust="apex" (ApexBustDepth), the
# ACTUAL dress_params() default — NOT the never-wired PlateauBustDepth
# "bust plateau" class from earlier project history. Flagged here so the
# generator's naming stays honest about which construction it seeds from.
_DEFAULT_GENERATOR = {
    "hem_circumference": 1549.4, "dome_n": 1.6,
    "fillet_radius": 25.0, "fillet_type": "conic",
    "apex_theta_deg": 35.0, "apex_amplitude_mm": 35.4, "apex_radius_mm": 70.0,
}


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
    pure read-out. Compound-aware: uses b_front/b_back (via axes3 when
    the model is a CompoundShellModel, else the shared b for a plain
    model) and the mean-Ramanujan compound formula — never adjusted."""
    rows = []
    for label, v, tape_mm in DEFAULT_TAPE_ANCHORS:
        in_range = v_lo <= v <= v_hi
        vv = np.array(min(max(v, v_lo), v_hi))
        if hasattr(model, "axes3"):
            a, bf, bb = model.axes3(vv)
            derived = float(compound_perimeter(a, bf, bb))
        else:
            a, b = model.semi_axes(vv)
            derived = float(compound_perimeter(a, b, b))
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


def generate_seed_curves(gen, z_bottom, z_top):
    """The "seed curve from parameters" action. Builds the ordinary
    analytic committed-family shell from `gen` (hem_circumference,
    dome_n, fillet_radius, fillet_type, apex_theta_deg,
    apex_amplitude_mm, apex_radius_mm) and samples it at the dense seed
    grid. b_front and b_back start IDENTICAL — the analytic model has no
    front/back split (that's the whole reason #2 asked for one); this is
    a starting point to drag apart, not a claim that front and back are
    the same.

    Returns (a_points, b_front_points, b_back_points, residual_report).
    residual_report is the STANDING-RULE check: fit-vs-analytic residual
    sampled BETWEEN the seed points (a dense grid offset from them, not
    at them), never just at the control points."""
    fp = FilletParams(fillet_radius=float(gen["fillet_radius"]),
                      fillet_type=str(gen["fillet_type"]),
                      hem_circumference=float(gen["hem_circumference"]),
                      dome_n=float(gen["dome_n"]))
    params = dress_params(fillet_params=fp, bust="apex",
                          apex_theta_deg=float(gen["apex_theta_deg"]),
                          apex_amplitude_mm=float(gen["apex_amplitude_mm"]),
                          apex_radius_mm=float(gen["apex_radius_mm"]))
    model = ShellModel(params)
    if abs(model.z_bottom - z_bottom) > 1e-3 or abs(model.z_top - z_top) > 1e-3:
        raise ShapeError(
            f"generated shell domain [{model.z_bottom:.1f}, {model.z_top:.1f}] "
            f"doesn't match the current shell's [{z_bottom:.1f}, {z_top:.1f}] "
            f"— hem/hem-adjacent parameters don't change the domain, but a "
            f"neckline height change would; regenerate after applying neckline "
            f"changes, not before")
    seed_v = sorted({z_bottom, z_top,
                     *[v for v in _SEED_V_INTERIOR if z_bottom < v < z_top]})
    a = np.asarray(model.a(np.array(seed_v)), dtype=float).tolist()
    b = np.asarray(model.b(np.array(seed_v)), dtype=float).tolist()
    a_points = list(zip(seed_v, a))
    b_points = list(zip(seed_v, b))

    # STANDING RULE: residual BETWEEN control points, not at them —
    # midpoints of every seed interval, plus the interval quarter-points
    # (the bust ramp and waist crease are the ones that broke a coarser
    # check, and neither is at a clean midpoint)
    seed_arr = np.array(seed_v)
    mids = 0.5 * (seed_arr[:-1] + seed_arr[1:])
    quarters = np.concatenate([0.75 * seed_arr[:-1] + 0.25 * seed_arr[1:],
                               0.25 * seed_arr[:-1] + 0.75 * seed_arr[1:]])
    probe = np.unique(np.concatenate([mids, quarters]))
    from scipy.interpolate import PchipInterpolator
    a_fit = PchipInterpolator(seed_v, a)
    b_fit = PchipInterpolator(seed_v, b)
    da = np.asarray(a_fit(probe)) - np.asarray(model.a(probe))
    db = np.asarray(b_fit(probe)) - np.asarray(model.b(probe))
    residual = {
        "sampled_between_control_points": True,
        "n_probe_points": int(len(probe)),
        "a_max_mm": float(np.max(np.abs(da))), "a_rms_mm": float(np.sqrt(np.mean(da ** 2))),
        "b_max_mm": float(np.max(np.abs(db))), "b_rms_mm": float(np.sqrt(np.mean(db ** 2))),
    }
    return a_points, b_points, list(b_points), residual


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
        self.last_generator_residual = None

        if SHAPE_PATH.exists():
            print(f"shape editor: loading saved shape from {SHAPE_PATH.name}")
            saved = load_shape(SHAPE_PATH)
            self.seed_a_points = saved.a_points
            self.seed_bf_points = saved.b_front_points
            self.seed_bb_points = saved.b_back_points
            self.generator = {**_DEFAULT_GENERATOR, **saved.generator}
        else:
            a_pts, bf_pts, bb_pts, residual = generate_seed_curves(
                _DEFAULT_GENERATOR, self.z_bottom, self.z_top)
            self.seed_a_points, self.seed_bf_points, self.seed_bb_points = a_pts, bf_pts, bb_pts
            self.generator = dict(_DEFAULT_GENERATOR)
            self.last_generator_residual = residual
            print(f"shape editor: seeded from parameters, between-point "
                  f"residual a={residual['a_max_mm']:.2f} b={residual['b_max_mm']:.2f} mm max")
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
            "generator_residual": self.last_generator_residual,
        }
        print(f"shape editor: ready ({len(self.classes)} panel classes, "
              f"baseline p213 area {self.baseline_analysis['p213_area_mm2']:.0f} mm2)")

    def _to_shape(self, body):
        neckline = {k: v for k, v in (body.get("neckline") or {}).items()
                   if k in ("cf_height", "peak_height", "peak_theta", "side_height",
                           "cb_height", "rise_bow", "decay_rate", "cf_corner")}
        generator = {k: v for k, v in (body.get("generator") or {}).items()
                    if k in _DEFAULT_GENERATOR}
        return ShapeState(a_points=body.get("a_points", []),
                          b_front_points=body.get("b_front_points", []),
                          b_back_points=body.get("b_back_points", []),
                          neckline=neckline, generator=generator)

    def build_curve_response(self, body):
        shape = self._to_shape(body)
        new_params = build_params_from_shape(self.model.params, shape,
                                             self.z_bottom, self.z_top)
        new_model = ShellModel(new_params)   # ShellError -> 422 (caller catches)

        z_seed = np.array(sorted({v for v, _ in shape.a_points}
                                 | {v for v, _ in shape.b_front_points}
                                 | {v for v, _ in shape.b_back_points}))
        dev_a = (np.asarray(new_model.a(z_seed)) - np.asarray(self.model.a(z_seed)))
        af, bf_front, bf_back = new_model.axes3(z_seed)
        _, bc_front, bc_back = (self.model.axes3(z_seed) if hasattr(self.model, "axes3")
                                else (self.model.a(z_seed),) + (self.model.b(z_seed),) * 2)
        dev_bf = np.asarray(bf_front) - np.asarray(bc_front)
        dev_bb = np.asarray(bf_back) - np.asarray(bc_back)

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
                "b_front_max": float(np.max(np.abs(dev_bf))), "b_front_rms": float(np.sqrt(np.mean(dev_bf ** 2))),
                "b_back_max": float(np.max(np.abs(dev_bb))), "b_back_rms": float(np.sqrt(np.mean(dev_bb ** 2))),
            },
        }

    def generate_response(self, body):
        gen = {**self.generator, **{k: v for k, v in (body or {}).items()
                                    if k in _DEFAULT_GENERATOR}}
        a_pts, bf_pts, bb_pts, residual = generate_seed_curves(gen, self.z_bottom, self.z_top)
        return {"a_points": a_pts, "b_front_points": bf_pts, "b_back_points": bb_pts,
               "generator": gen, "residual_between_control_points": residual}

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
            self._send(200, {
                "domain": {"v_lo": STATE.z_bottom, "v_hi": STATE.z_top},
                "seed_a_points": STATE.seed_a_points,
                "seed_bf_points": STATE.seed_bf_points,
                "seed_bb_points": STATE.seed_bb_points,
                "default_a_table": STATE.default_a_table,
                "default_b_table": STATE.default_b_table,
                "mesh": STATE.mesh,
                "readout": STATE.readout,
                "bounds": {"split_theta": float(m.split_theta)},
                "neckline": neck,
                "generator": STATE.generator,
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
            elif self.path == "/api/generate":
                resp = STATE.generate_response(body)
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
