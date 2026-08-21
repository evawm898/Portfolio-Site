#!/usr/bin/env python3
"""Local dev server for the SHAPE editor — milestone 3, separate from the
placement editor (editor_server.py). NOT part of the deployed site, does
NOT touch layout.yaml or the /dress export. Run it by hand:

    python3 tools/dress-shell/shape_editor_server.py [--port 8766]

MINIMAL VERTICAL SLICE (per explicit instruction: prove the loop with one
curve before building the rest): only a(v) is editable here. b_front(v)/
b_back(v)/neckline/skirt/scalars stay exactly as dress_params() ships them
— this endpoint composes a(v) with the COMMITTED b(z) unchanged, so the
only thing that can move is lateral half-width.

ARCHITECTURE — this is the "invert the pipeline" a(v) path, not the
frozen-perimeter bust-bump solve: dragging authors a(v) directly (control
points -> a monotone-shape-preserving PCHIP fit, exactly the interpolant
front_silhouette.py's FittedDepth / this project's convention already
uses everywhere else), b(z) is READ from the current committed model
unmodified, and circumference is DERIVED (Ramanujan(a, b)) via
ShellModel's existing section_curves path — nothing new at the solve
layer, this composes machinery that already exists:
  - PchipInterpolator                       (scipy, used throughout)
  - ShellParams.section_curves               (shell.py, silhouette-first
                                              mode: "both axes authored,
                                              perimeter is an output" —
                                              exactly this brief)
  - build_meshes(model)                      (shell.py, unchanged)

TWO-SPEED CONTRACT:
  - COARSE: the client (shape-editor/geom.js) recomputes locally on every
    drag frame — its own small PCHIP + equal-arc port, same math class as
    the placement editor's surface.js port. No network round trip.
  - FULL: POST /api/curve on pointerup only. Runs the real scipy PCHIP +
    ShellModel + build_meshes — authoritative, matches what would ship.
Both are labeled in the UI; never conflate a coarse number with a real
one (see the dress-shell skill's live-readout requirement).
"""

import argparse
import json
import sys
import traceback
from dataclasses import replace
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from bodice import _perimeter_np
from shell import ShellError, ShellModel, build_meshes, dress_params

VENDOR_DIR = HERE.parents[1] / "dress" / "vendor"
STATIC_DIR = HERE / "shape-editor"

# seed control-point heights (mm, waist = 0): endpoints pinned to the
# shell's actual z_bottom/z_top so section_curves' domain check always
# passes; interior points chosen to bracket the waist, underbust, bust
# apex (v = 181, the committed apex_v) and the neckline taper — dense
# enough near the bust that the initial curve doesn't look coarse there.
_SEED_V_INTERIOR = [-300.0, -220.0, -140.0, -70.0, 0.0, 60.0, 120.0,
                    160.0, 181.0, 210.0]


class ShapeCurves:
    """The section_curves interface ShellModel expects: .v_lo/.v_hi,
    .a(z)/.b(z)/.perimeter(z). a is the edited PCHIP fit (shape-preserving
    — no scipy monotonicity FORCED, since a real trace need not be
    monotone; see front_silhouette.MeasuredSections for the same choice).
    b is a frozen callable — always the committed model's b(z), never
    touched by this endpoint. perimeter is pure Ramanujan, a derived
    output, never adjusted."""

    def __init__(self, a_fit, b_of_z, v_lo, v_hi):
        self._a = a_fit
        self._b = b_of_z
        self.v_lo = float(v_lo)
        self.v_hi = float(v_hi)

    def _clip(self, z):
        return np.clip(np.asarray(z, dtype=float), self.v_lo, self.v_hi)

    def a(self, z):
        return self._a(self._clip(z))

    def b(self, z):
        return np.asarray(self._b(self._clip(z)))

    def perimeter(self, z):
        z = self._clip(z)
        return _perimeter_np(np.asarray(self.a(z)), self.b(z))


def _monotonicity_report(a_fn, v_lo, v_hi, n=2001):
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


def _mesh_payload(model):
    meshes = build_meshes(model)
    out = {}
    for name, (V, F) in meshes.items():
        out[name] = {"positions": np.round(V, 2).ravel().tolist(),
                      "indices": F.ravel().tolist()}
    return out


class State:
    """The one fixed reference everything in this slice composes against:
    the actual committed shell (dress_params(), untouched)."""

    def __init__(self):
        print("shape editor: building committed reference shell ...")
        self.model = ShellModel(dress_params())
        self.z_bottom = float(self.model.z_bottom)
        self.z_top = float(self.model.z_top)
        seed_v = sorted({self.z_bottom, self.z_top,
                         *[v for v in _SEED_V_INTERIOR
                           if self.z_bottom < v < self.z_top]})
        seed_a = np.asarray(self.model.a(np.array(seed_v)), dtype=float).tolist()
        self.seed_points = list(zip(seed_v, seed_a))
        # dense frozen b(z) table + reference a(z) (for the backdrop —
        # "committed" dashed curve) — both read once, never recomputed
        z = np.linspace(self.z_bottom, self.z_top, 801)
        self.b_table = {"z": np.round(z, 3).tolist(),
                        "b": np.round(np.asarray(self.model.b(z)), 4).tolist()}
        self.default_a_table = {"z": np.round(z, 3).tolist(),
                                "a": np.round(np.asarray(self.model.a(z)), 4).tolist()}
        self.mesh = _mesh_payload(self.model)
        self.readout = _monotonicity_report(self.model.a, self.z_bottom, self.z_top)
        print("shape editor: ready")

    def build_curve_response(self, points):
        """points: [[v, a_mm], ...] — must include v == z_bottom and
        v == z_top (the UI pins those two handles; enforced here too so a
        malformed request fails loudly instead of silently extrapolating)."""
        pts = sorted((float(v), float(a)) for v, a in points)
        vs = [v for v, _ in pts]
        if len(set(vs)) != len(vs):
            raise ValueError("duplicate v in control points")
        if abs(vs[0] - self.z_bottom) > 1e-6 or abs(vs[-1] - self.z_top) > 1e-6:
            raise ValueError(
                f"control points must span [{self.z_bottom:.1f}, "
                f"{self.z_top:.1f}] exactly; got [{vs[0]:.1f}, {vs[-1]:.1f}]")
        from scipy.interpolate import PchipInterpolator
        a_fit = PchipInterpolator([v for v, _ in pts], [a for _, a in pts])
        curves = ShapeCurves(a_fit, self.model.b, self.z_bottom, self.z_top)
        new_params = replace(self.model.params, depth_curve=None, section_curves=curves)
        new_model = ShellModel(new_params)   # ShellError -> 422 (caller catches)
        readout = _monotonicity_report(new_model.a, self.z_bottom, self.z_top)
        z_seed = np.array(vs)
        deviation = (np.asarray(new_model.a(z_seed)) -
                    np.asarray(self.model.a(z_seed)))
        return {
            "mesh": _mesh_payload(new_model),
            "readout": readout,
            "deviation_from_committed_mm": {
                "max": float(np.max(np.abs(deviation))),
                "rms": float(np.sqrt(np.mean(deviation ** 2))),
            },
        }


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
        elif p.startswith("/vendor/"):
            rel = Path(p).relative_to("/vendor")
            target = (VENDOR_DIR / rel).resolve()
            if VENDOR_DIR.resolve() not in target.parents and target != VENDOR_DIR.resolve():
                self._send(403, {"error": "outside vendor dir"})
            else:
                self._file(target, "text/javascript")
        elif p == "/api/state":
            self._send(200, {
                "domain": {"v_lo": STATE.z_bottom, "v_hi": STATE.z_top},
                "seed_points": STATE.seed_points,
                "b_table": STATE.b_table,
                "default_a_table": STATE.default_a_table,
                "mesh": STATE.mesh,
                "readout": STATE.readout,
                "bounds": {"split_theta": float(STATE.model.split_theta)},
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
                resp = STATE.build_curve_response(body.get("points", []))
                self._send(200, resp)
            else:
                self._send(404, {"error": "unknown route"})
        except (ShellError, KeyError, TypeError, ValueError) as exc:
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
