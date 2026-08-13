"""Publish step: committed static glTF + analysis sidecar for /dress.

Writes (by default into the repo's dress/ static directory):
  - dress-shell.glb      binary glTF: shell FRONT/BACK (with per-vertex
                         (theta, s) as _THETA_S), the snap grid as LINES
                         overlay geometry, and every valid panel as a box
                         at its correct mount height, tagged in node
                         extras with id/class/layer/standoff/rotation/
                         content_rotation/is_twin
  - dress-analysis.json  per-cell curvature + max-class map, layering
                         report, panel tags, asymmetry summary — the
                         viewer colors geometry from this sidecar

Publish is explicitly separate from layout.yaml saves so the layout can
be iterated without churning the exported binary in git. Run manually:
    python3 tools/dress-shell/export_gltf.py
The site never invokes this; it only reads the committed files.
"""

import json
import math
import struct
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

from coords import ShellCoords
from curvature import (STANDOFF_TOLERANCE_MM, TOLERANCE_SWEEP_MM, analyze_cells,
                       class_distribution, required_radius, seat_standoff,
                       tolerance_sweep)
from facets import apply_facets
from grid import GridSpec, ShellGrid
from layering import analyze_layering, uncovered_shell_area
from layout import (SurfaceChart, _frame_offset, asymmetry_summary,
                    connector_geometry, load_layout, resolve_layout)
from panels import load_panel_classes, unverified_fields
from shell import ShellModel, ShellParams, build_meshes

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[1]
OUT_DIR = REPO_ROOT / "dress"

CLASS_COLORS = {"p213": [0.72, 0.55, 0.88], "p370": [0.24, 0.60, 0.62],
                "p750": [0.13, 0.30, 0.42]}


# ---------------------------------------------------------------------------
# minimal GLB writer

class GlbBuilder:
    def __init__(self):
        self.bin = bytearray()
        self.buffer_views = []
        self.accessors = []
        self.meshes = []
        self.nodes = []
        self.materials = []
        self.scene_children = []

    def _pad(self, align=4):
        while len(self.bin) % align:
            self.bin.append(0)

    def add_accessor(self, array, component_type, type_str, target=None):
        array = np.ascontiguousarray(array)
        self._pad()
        offset = len(self.bin)
        self.bin.extend(array.tobytes())
        view = {"buffer": 0, "byteOffset": offset, "byteLength": array.nbytes}
        if target:
            view["target"] = target
        self.buffer_views.append(view)
        acc = {"bufferView": len(self.buffer_views) - 1, "componentType": component_type,
               "count": int(array.shape[0]), "type": type_str}
        if type_str == "VEC3" and component_type == 5126:
            acc["min"] = [float(v) for v in array.min(axis=0)]
            acc["max"] = [float(v) for v in array.max(axis=0)]
        self.accessors.append(acc)
        return len(self.accessors) - 1

    def add_material(self, name, rgb, metallic=0.0, rough=0.85, double_sided=True):
        self.materials.append({
            "name": name, "doubleSided": double_sided,
            "pbrMetallicRoughness": {
                "baseColorFactor": [rgb[0], rgb[1], rgb[2], 1.0],
                "metallicFactor": metallic, "roughnessFactor": rough,
            }})
        return len(self.materials) - 1

    def add_mesh_node(self, name, primitives, extras=None):
        self.meshes.append({"name": name, "primitives": primitives})
        node = {"name": name, "mesh": len(self.meshes) - 1}
        if extras:
            node["extras"] = extras
        self.nodes.append(node)
        self.scene_children.append(len(self.nodes) - 1)

    def tri_primitive(self, positions, indices, material, normals=None, theta_s=None):
        prim = {"attributes": {"POSITION": self.add_accessor(
                    positions.astype(np.float32), 5126, "VEC3", 34962)},
                "indices": self.add_accessor(
                    indices.astype(np.uint32).ravel(), 5125, "SCALAR", 34963),
                "material": material, "mode": 4}
        if normals is not None:
            prim["attributes"]["NORMAL"] = self.add_accessor(
                normals.astype(np.float32), 5126, "VEC3", 34962)
        if theta_s is not None:
            prim["attributes"]["_THETA_S"] = self.add_accessor(
                theta_s.astype(np.float32), 5126, "VEC2", 34962)
        return prim

    def line_primitive(self, positions, indices, material):
        return {"attributes": {"POSITION": self.add_accessor(
                    positions.astype(np.float32), 5126, "VEC3", 34962)},
                "indices": self.add_accessor(
                    indices.astype(np.uint32).ravel(), 5125, "SCALAR", 34963),
                "material": material, "mode": 1}

    def to_glb(self):
        self._pad()
        gltf = {
            "asset": {"version": "2.0", "generator": "dress-shell export_gltf.py"},
            "scene": 0,
            "scenes": [{"name": "dress", "nodes": self.scene_children}],
            "nodes": self.nodes, "meshes": self.meshes,
            "materials": self.materials,
            "accessors": self.accessors, "bufferViews": self.buffer_views,
            "buffers": [{"byteLength": len(self.bin)}],
        }
        js = json.dumps(gltf, separators=(",", ":")).encode()
        js += b" " * ((4 - len(js) % 4) % 4)
        total = 12 + 8 + len(js) + 8 + len(self.bin)
        out = bytearray()
        out += struct.pack("<III", 0x46546C67, 2, total)
        out += struct.pack("<II", len(js), 0x4E4F534A) + js
        out += struct.pack("<II", len(self.bin), 0x004E4942) + bytes(self.bin)
        return bytes(out)


# ---------------------------------------------------------------------------
# assembly

def orthonormal_frame(f):
    u = f["e_theta"] / np.linalg.norm(f["e_theta"])
    v = f["e_s"] - (f["e_s"] @ u) * u
    v /= np.linalg.norm(v)
    n = np.cross(u, v)
    return u, v, n


def panel_box(chart, coords, p, mount):
    """Vertices/faces of a panel box seated at its pose, plus the active
    face quad and connector escape line, all in 3D."""
    cls = p.cls
    f = coords.forward(p.theta, p.s)
    u, v, n = orthonormal_frame(f)
    dxo, dyo = _frame_offset(cls, p.rotation, (cls.outline_w / 2.0, cls.outline_h / 2.0))
    center = f["position"] + dxo * u + dyo * v + (mount + 0.5 * cls.thickness) * n
    hw, hh, ht = 0.5 * cls.outline_w, 0.5 * cls.outline_h, 0.5 * cls.thickness
    corners = np.array([center + sx * hw * u + sy * hh * v + sz * ht * n
                        for sz in (-1, 1) for sy in (-1, 1) for sx in (-1, 1)])
    F = np.array([  # 12 triangles, outward wound (checked visually)
        [0, 2, 1], [1, 2, 3], [4, 5, 6], [5, 7, 6],
        [0, 1, 4], [1, 5, 4], [2, 6, 3], [3, 6, 7],
        [0, 4, 2], [2, 4, 6], [1, 3, 5], [3, 7, 5]])

    # active-area quad floated just above the outer face
    aw, ah = 0.5 * cls.active_w, 0.5 * cls.active_h
    lift = mount + cls.thickness + 0.15
    acenter = f["position"] + lift * n
    aq = np.array([acenter - aw * u - ah * v, acenter + aw * u - ah * v,
                   acenter + aw * u + ah * v, acenter - aw * u + ah * v])
    AF = np.array([[0, 1, 2], [0, 2, 3]])

    # connector escape line (on the outer face level)
    (ct, cs), (et, es) = connector_geometry(chart, cls, p.theta, p.s, p.rotation)
    c0 = coords.forward(ct, cs)
    c1 = coords.forward(et, es)
    line = np.array([c0["position"] + (lift + 0.1) * c0["normal"],
                     c1["position"] + (lift + 0.1) * c1["normal"]])
    return corners, F, aq, AF, line


def build_export(grid_spec=GridSpec(), tolerance_mm=STANDOFF_TOLERANCE_MM, samples=7):
    """Everything the GLB + sidecar need, computed once."""
    model = ShellModel(ShellParams())
    coords = ShellCoords(model)
    chart = SurfaceChart(model, coords)
    classes = load_panel_classes(HERE / "panels.yaml")
    authored = load_layout(HERE / "layout.yaml")
    placed, errors = resolve_layout(chart, classes, authored)
    if errors:
        raise SystemExit("layout errors:\n  " + "\n  ".join(errors))
    grid = ShellGrid(chart, grid_spec)
    analyses = analyze_cells(coords, chart, grid, classes, tolerance_mm, samples)
    layering = analyze_layering(chart, placed)
    uncovered, total_area = uncovered_shell_area(chart, placed)

    # facet deformation, applied per piece so the GLB carries the flattened
    # shell the garment would actually be built with
    pieces, facet_reports = {}, []
    for name in ("FRONT", "BACK"):
        V, F = build_meshes(model)[name]
        theta, s = coords.inverse(V, check_mm=None)
        ts = np.stack([theta, s], axis=-1)
        V2, reps = apply_facets(chart, coords, V, ts, placed)
        pieces[name] = (V2, F, ts)
        for r in reps:
            if r.affected_vertices:
                facet_reports.append(r)
    # merge per-piece reports for the same facet panel
    merged = {}
    for r in facet_reports:
        m = merged.get(r.panel_id)
        if m is None or r.affected_vertices > m.affected_vertices:
            merged[r.panel_id] = r
    return dict(model=model, coords=coords, chart=chart, classes=classes,
                placed=placed, grid=grid, analyses=analyses, layering=layering,
                uncovered=uncovered, total_area=total_area,
                tolerance=tolerance_mm, pieces=pieces,
                facet_reports=sorted(merged.values(), key=lambda r: r.panel_id))


def _mesh_normals(V, F):
    """Area-weighted per-vertex normals of a triangle mesh (used after facet
    deformation, where the analytic surface normal no longer applies)."""
    n = np.zeros_like(V)
    fv = V[F]
    fn = np.cross(fv[:, 1] - fv[:, 0], fv[:, 2] - fv[:, 0])
    for k in range(3):
        np.add.at(n, F[:, k], fn)
    lengths = np.linalg.norm(n, axis=1, keepdims=True)
    lengths[lengths == 0] = 1.0
    return n / lengths


def build_glb(ex):
    coords, chart, grid = ex["coords"], ex["chart"], ex["grid"]
    b = GlbBuilder()
    m_front = b.add_material("shell-front", [0.93, 0.93, 0.91])
    m_back = b.add_material("shell-back", [0.88, 0.89, 0.88])
    m_grid = b.add_material("grid", [0.25, 0.28, 0.28])
    m_active = b.add_material("active", [0.18, 0.64, 0.64])
    m_conn = b.add_material("connector", [0.85, 0.45, 0.10])
    m_invalid = b.add_material("invalid", [0.80, 0.16, 0.13])
    class_mats = {cid: b.add_material(f"class-{cid}", rgb)
                  for cid, rgb in CLASS_COLORS.items()}

    # shell pieces with per-vertex (theta, s); facets already baked into the
    # vertex positions, so normals come from the deformed mesh itself
    for name, mat in (("FRONT", m_front), ("BACK", m_back)):
        V, F, ts = ex["pieces"][name]
        b.add_mesh_node(f"shell/{name}",
                        [b.tri_primitive(V, F, mat, normals=_mesh_normals(V, F),
                                         theta_s=ts)],
                        extras={"piece": name})

    # grid overlay as LINES
    def polyline_prim(lines):
        pts, idx, base = [], [], 0
        for pl in lines:
            pts.append(pl)
            n = len(pl)
            seg = np.stack([np.arange(base, base + n - 1),
                            np.arange(base + 1, base + n)], axis=1)
            idx.append(seg)
            base += n
        return b.line_primitive(np.concatenate(pts), np.concatenate(idx), m_grid)

    b.add_mesh_node("grid/rings", [polyline_prim(grid.ring_polylines(coords))],
                    extras={"overlay": "rings"})
    b.add_mesh_node("grid/radials", [polyline_prim(grid.radial_polylines(coords))],
                    extras={"overlay": "radials"})

    # panels at mount height
    rep = ex["layering"]
    for p in ex["placed"]:
        mount = rep.mount_mm.get(p.panel_id, 0.0)
        corners, F, aq, AF, line = panel_box(chart, coords, p, mount)
        body_mat = m_invalid if not p.valid else class_mats.get(p.cls.class_id, m_front)
        standoff = (None if p.cls.requires_facet else
                    seat_standoff(coords, chart, p.cls.outline_w, p.cls.outline_h,
                                  p.theta, p.s))
        prims = [b.tri_primitive(corners, F, body_mat),
                 b.tri_primitive(aq, AF, m_active),
                 b.line_primitive(line, np.array([[0, 1]]), m_conn)]
        b.add_mesh_node(f"panels/{p.panel_id}", prims, extras={
            "panel": p.panel_id, "class": p.cls.class_id,
            "layer": p.layer, "rotation": p.rotation,
            "content_rotation": p.content_rotation,
            "is_twin": p.is_twin, "valid": p.valid,
            "facet": p.cls.requires_facet,
            "theta": round(p.theta, 6), "s": round(p.s, 6),
            "standoff_mm": (round(standoff, 3)
                            if standoff is not None and math.isfinite(standoff)
                            else None),
            "mount_mm": round(mount, 3),
        })
    return b.to_glb()


def _electrical(placed):
    from analysis_report import electrical_rollup
    return electrical_rollup(placed)


def build_sidecar(ex):
    grid, analyses, rep = ex["grid"], ex["analyses"], ex["layering"]
    chart = ex["chart"]
    pairs, worst, mean = asymmetry_summary(ex["placed"])
    st = grid.cell_stats()
    r = lambda v, n=5: round(float(v), n)
    return {
        "meta": {
            "generator": "dress-shell export_gltf.py",
            "tolerance_mm": ex["tolerance"],
            "grid": {"dtheta": grid.spec.dtheta, "ds": grid.spec.ds},
            "s_min": r(chart.s_min, 3), "s_max": r(chart.s_max, 3),
            "cell_count": st["count"],
            "cell_width_mm": [r(st["width_min"], 2), r(st["width_mean"], 2),
                              r(st["width_max"], 2)],
        },
        "rings": [r(v, 3) for v in grid.rings],
        "thetas": [r(v, 3) for v in grid.thetas],
        "classes": {c.class_id: {
            "outline": [c.outline_w, c.outline_h], "thickness": c.thickness,
            "active": [c.active_w, c.active_h], "color": CLASS_COLORS.get(c.class_id),
            "chipset": c.chipset, "palette": list(c.palette),
            "refresh_s": c.refresh_s, "price_usd": c.price_usd,
            "requires_facet": c.requires_facet,
            "required_radius_mm": {k: r(v, 1) for k, v in
                                   required_radius(c, ex["tolerance"]).items()},
        } for c in ex["classes"].values()},
        "cells": [{
            "i": a.cell_index, "k1": r(a.k1, 7), "k2": r(a.k2, 7),
            "K": r(a.gaussian, 10), "rmin": r(a.r_min, 1),
            "max_class": a.max_class,
        } for a in analyses],
        "class_distribution": {str(k): v for k, v in
                               class_distribution(analyses).items()},
        "panels": [{
            "id": p.panel_id, "class": p.cls.class_id, "theta": r(p.theta),
            "s": r(p.s), "rotation": p.rotation,
            "content_rotation": p.content_rotation, "layer": p.layer,
            "is_twin": p.is_twin, "valid": p.valid,
            "facet": p.cls.requires_facet,
            "problems": list(p.problems),
            "mount_mm": r(rep.mount_mm.get(p.panel_id, 0.0), 3),
            "visible_pct": r(rep.visible_pct.get(p.panel_id, 100.0), 1),
        } for p in ex["placed"]],
        "facets": [{
            "panel": fr.panel_id, "theta": r(fr.theta), "s": r(fr.s),
            "max_deviation_mm": r(fr.max_deviation_mm, 2),
            "rms_deviation_mm": r(fr.rms_deviation_mm, 2),
        } for fr in ex["facet_reports"]],
        "tolerance_sweep": {str(t): {str(k): v for k, v in d.items()}
                            for t, d in tolerance_sweep(ex["analyses"], ex["classes"],
                                                        TOLERANCE_SWEEP_MM).items()},
        "electrical": _electrical(ex["placed"]),
        "unverified": [{"class": c, "field": f, "note": " ".join(n.split())}
                       for c, f, n in unverified_fields(ex["classes"])],
        "layering": {
            "max_stack_mm": r(rep.max_stack_mm, 3),
            "total_active_mm2": r(rep.total_active, 1),
            "total_visible_mm2": r(rep.total_visible, 1),
            "buried_connectors": rep.buried_connectors,
            "overlaps": rep.overlaps,
        },
        "coverage": {
            "shell_area_mm2": r(ex["total_area"], 0),
            "uncovered_mm2": r(ex["uncovered"], 0),
            "uncovered_pct": r(100.0 * ex["uncovered"] / ex["total_area"], 2),
        },
        "asymmetry": {"worst_mm": r(worst, 4), "mean_mm": r(mean, 4),
                      "pairs": [[pid, rot, r(a, 4)] for pid, rot, a in pairs]},
    }


def main(out_dir=OUT_DIR):
    ex = build_export()
    out_dir.mkdir(parents=True, exist_ok=True)
    glb = build_glb(ex)
    (out_dir / "dress-shell.glb").write_bytes(glb)
    sidecar = build_sidecar(ex)
    (out_dir / "dress-analysis.json").write_text(
        json.dumps(sidecar, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {out_dir / 'dress-shell.glb'} ({len(glb) / 1024:.0f} KB)")
    print(f"wrote {out_dir / 'dress-analysis.json'} "
          f"({(out_dir / 'dress-analysis.json').stat().st_size / 1024:.0f} KB)")
    print(f"panels: {len(sidecar['panels'])}, cells: {sidecar['meta']['cell_count']}, "
          f"max stack {sidecar['layering']['max_stack_mm']} mm, "
          f"uncovered {sidecar['coverage']['uncovered_pct']}%")
    return sidecar


if __name__ == "__main__":
    main()
