#!/usr/bin/env python3
"""Local dev server for the placement editor. NOT part of the deployed
site — run it by hand:

    python3 tools/dress-shell/editor_server.py [--port 8765]

Serves the editor page, computes the full shell/analysis state, and owns
the two write paths:
  POST /api/layout   validate + save layout.yaml (canonical, lossless)
  POST /api/publish  run the explicit publish step (committed glTF for
                     /dress) — separate from save on purpose
  POST /api/resolve  authoritative re-resolve of an unsaved layout (the
                     editor's client-side math is a port; the server is
                     the source of truth)
"""

import argparse
import json
import sys
import tempfile
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from coords import ShellCoords
from curvature import analyze_cells, class_distribution
from grid import GridSpec, ShellGrid
from layering import LayeringError, analyze_layering, uncovered_shell_area
from layout import (AuthoredPanel, LayoutError, SurfaceChart, asymmetry_summary,
                    dump_layout, load_layout, resolve_layout, save_layout)
from panels import load_panel_classes
from shell import ShellModel, ShellParams, build_meshes

VENDOR_DIR = HERE.parents[1] / "dress" / "vendor"
LAYOUT_PATH = HERE / "layout.yaml"

TOLERANCE_MM = 2.0
GRID_SPEC = GridSpec(dtheta=10.0, ds=25.0)


class State:
    """Everything static about the shell, computed once at startup."""

    def __init__(self):
        print("building shell + analysis state ...")
        self.model = ShellModel(ShellParams())
        self.coords = ShellCoords(self.model)
        self.chart = SurfaceChart(self.model, self.coords)
        self.classes = load_panel_classes(HERE / "panels.yaml")
        self.grid = ShellGrid(self.chart, GRID_SPEC)
        self.analyses = analyze_cells(self.coords, self.chart, self.grid,
                                      self.classes, TOLERANCE_MM, samples=7)
        self.static_payload = self._build_static()
        print(f"ready: {len(self.grid.cells)} cells analyzed")

    def _mesh(self, name):
        V, F = build_meshes(self.model)[name]
        theta, s = self.coords.inverse(V, check_mm=None)
        fr = self.coords.forward(theta, s)
        r2 = lambda a: np.round(a, 2).tolist()
        return {"positions": r2(V.ravel()), "normals": np.round(fr["normal"], 4).ravel().tolist(),
                "theta_s": np.round(np.stack([theta, s], axis=-1), 4).ravel().tolist(),
                "indices": F.ravel().tolist()}

    def _build_static(self):
        m, c = self.model, self.coords
        z = np.linspace(m.z_bottom, m.z_top, 601)
        prof = {"z": np.round(z, 3).tolist(),
                "a": np.round(m.a(z), 4).tolist(), "b": np.round(m.b(z), 4).tolist(),
                "da": np.round(m.da(z), 6).tolist(), "db": np.round(m.db(z), 6).tolist(),
                "s": np.round(c.s_of_z(z), 4).tolist()}
        grid_lines = {
            "rings": [np.round(pl, 2).ravel().tolist()
                      for pl in self.grid.ring_polylines(c)],
            "radials": [np.round(pl, 2).ravel().tolist()
                        for pl in self.grid.radial_polylines(c)],
        }
        return {
            "tolerance_mm": TOLERANCE_MM,
            "bounds": {"s_min": c.s_min, "s_max": c.s_max,
                       "z_bottom": m.z_bottom, "z_top": m.z_top},
            "grid": {"dtheta": self.grid.spec.dtheta, "ds": self.grid.spec.ds,
                     "rings": self.grid.rings.tolist(),
                     "thetas": self.grid.thetas.tolist(),
                     "stats": {k: v for k, v in self.grid.cell_stats().items()
                               if not isinstance(v, np.ndarray)},
                     "lines": grid_lines},
            "profile": prof,
            "classes": {cl.class_id: {
                "outline": [cl.outline_w, cl.outline_h], "thickness": cl.thickness,
                "active": [cl.active_w, cl.active_h],
                "active_offset": list(cl.active_offset),
                "connector": {"origin": list(cl.connector_origin),
                              "exit": list(cl.connector_exit),
                              "escape_mm": cl.escape_mm},
            } for cl in self.classes.values()},
            "cells": [{"i": a.cell_index, "k1": a.k1, "k2": a.k2, "K": a.gaussian,
                       "rmin": None if not np.isfinite(a.r_min) else round(a.r_min, 1),
                       "max_class": a.max_class,
                       "standoff": {k: (None if not np.isfinite(v) else round(v, 3))
                                    for k, v in a.standoff_by_class.items()}}
                      for a in self.analyses],
            "class_distribution": {str(k): v for k, v in
                                   class_distribution(self.analyses).items()},
            "meshes": {"FRONT": self._mesh("FRONT"), "BACK": self._mesh("BACK")},
        }

    # -- layout handling -----------------------------------------------------

    def parse_entries(self, raw_entries):
        """Round the wire format through the real loader so validation is
        identical to hand-edited files: dump canonical text, load it."""
        entries = [AuthoredPanel(e["id"], e["class"], float(e["theta"]),
                                 float(e["s"]), int(e["rotation"]),
                                 int(e["layer"]), bool(e["mirrored"]))
                   for e in raw_entries]
        text = dump_layout(entries)
        with tempfile.NamedTemporaryFile("w", suffix=".yaml", delete=False) as fh:
            fh.write(text)
            tmp = fh.name
        return load_layout(tmp)  # raises LayoutError loudly

    def resolve_payload(self, authored):
        placed, errors = resolve_layout(self.chart, self.classes, authored)
        try:
            rep = analyze_layering(self.chart, placed)
            layer_error = None
        except LayeringError as exc:
            rep, layer_error = None, str(exc)
        uncovered, total = uncovered_shell_area(self.chart, placed,
                                                n_theta=360, n_s=70)
        pairs, worst, mean = asymmetry_summary(placed)
        return {
            "authored": [{"id": a.panel_id, "class": a.class_id, "theta": a.theta,
                          "s": a.s, "rotation": a.rotation, "layer": a.layer,
                          "mirrored": a.mirrored} for a in authored],
            "placed": [{
                "id": p.panel_id, "class": p.cls.class_id, "theta": p.theta,
                "s": p.s, "rotation": p.rotation,
                "content_rotation": p.content_rotation, "layer": p.layer,
                "is_twin": p.is_twin, "source_id": p.source_id,
                "valid": p.valid, "problems": list(p.problems),
                "mount_mm": (rep.mount_mm.get(p.panel_id, 0.0) if rep else 0.0),
                "visible_pct": (rep.visible_pct.get(p.panel_id, 100.0) if rep else None),
            } for p in placed],
            "errors": errors + ([layer_error] if layer_error else []),
            "layering": None if rep is None else {
                "max_stack_mm": rep.max_stack_mm,
                "total_active_mm2": rep.total_active,
                "total_visible_mm2": rep.total_visible,
                "buried_connectors": rep.buried_connectors,
                "overlaps": rep.overlaps,
            },
            "coverage": {"uncovered_pct": 100.0 * uncovered / total},
            "asymmetry": {"worst_mm": worst, "mean_mm": mean,
                          "pairs": [[a, b, c] for a, b, c in pairs]},
        }


STATE = None


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="application/json"):
        data = body if isinstance(body, (bytes, bytearray)) else \
            json.dumps(body).encode()
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
            self._file(HERE / "editor" / "index.html", "text/html; charset=utf-8")
        elif p == "/editor.js":
            self._file(HERE / "editor" / "editor.js", "text/javascript")
        elif p == "/surface.js":
            self._file(HERE / "editor" / "surface.js", "text/javascript")
        elif p.startswith("/vendor/"):
            rel = Path(p).relative_to("/vendor")
            target = (VENDOR_DIR / rel).resolve()
            if VENDOR_DIR.resolve() not in target.parents and target != VENDOR_DIR.resolve():
                self._send(403, {"error": "outside vendor dir"})
            else:
                self._file(target, "text/javascript")
        elif p == "/api/state":
            payload = dict(STATE.static_payload)
            payload["resolved"] = STATE.resolve_payload(load_layout(LAYOUT_PATH))
            self._send(200, payload)
        else:
            self._send(404, {"error": "unknown route"})

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            return self._send(400, {"error": "invalid JSON body"})
        try:
            if self.path == "/api/resolve":
                authored = STATE.parse_entries(body.get("panels", []))
                self._send(200, STATE.resolve_payload(authored))
            elif self.path == "/api/layout":
                authored = STATE.parse_entries(body.get("panels", []))
                save_layout(LAYOUT_PATH, authored)
                self._send(200, {"saved": True,
                                 "resolved": STATE.resolve_payload(authored)})
            elif self.path == "/api/publish":
                import export_gltf
                sidecar = export_gltf.main()
                self._send(200, {"published": True,
                                 "summary": {
                                     "panels": len(sidecar["panels"]),
                                     "uncovered_pct": sidecar["coverage"]["uncovered_pct"],
                                     "max_stack_mm": sidecar["layering"]["max_stack_mm"],
                                 }})
            else:
                self._send(404, {"error": "unknown route"})
        except (LayoutError, LayeringError, KeyError, TypeError, ValueError) as exc:
            self._send(422, {"error": str(exc)})
        except Exception:
            self._send(500, {"error": traceback.format_exc()})

    def log_message(self, fmt, *args):
        pass  # quiet


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--port", type=int, default=8765)
    args = ap.parse_args()
    global STATE
    STATE = State()
    srv = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"editor: http://127.0.0.1:{args.port}/  (Ctrl-C to stop)")
    srv.serve_forever()


if __name__ == "__main__":
    main()
