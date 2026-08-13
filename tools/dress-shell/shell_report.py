#!/usr/bin/env python3
"""Milestone-1 foundation report: shell dimensions and (theta, s)
round-trip accuracy. Grid / curvature / viewer reporting attaches here
in later steps.

Run:  python3 tools/dress-shell/shell_report.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np

from coords import ShellCoords
from shell import ShellModel, ShellParams, build_meshes
from test_coords import named_points


def main():
    model = ShellModel(ShellParams())
    coords = ShellCoords(model)
    p = model.params

    print("DRESS SHELL — foundation report (confirmed superellipse skirt)")
    print()
    print("skirt profile r(u) = a(1-(u/b)^n)^(1/n), u up from the hem")
    print(f"  a (hem radius)   {model.hem_radius:.2f} mm  "
          f"(hem circumference {p.hem_circumference:g})")
    print(f"  waist radius     {model.waist_radius:.2f} mm  "
          f"(waist circumference {p.waist_circumference:g})")
    print(f"  drop             {p.drop:g} mm, n = {p.dome_n:g}")
    print(f"  solved b         {model.b_param:.2f} mm")
    print(f"  waist tangent    {model.waist_tangent_deg():.2f} deg from vertical "
          f"(dr/du = {float(model.dr_super(0.0)):.4f}) — CREASE at the waist; "
          f"bodice side unspecified")
    print(f"  seam band        +-{p.waist_band_halfwidth:g} mm about s = 0 "
          f"(keep-out + cable bus); fillet_radius = {p.fillet_radius:g}")
    print(f"  meridian s       0 (waist) .. {coords.s_max:.2f} (hem edge)")
    print(f"  surface area     {model.surface_area_mm2() / 1e6:.4f} m^2")

    meshes = build_meshes(model)
    for name, (V, F) in meshes.items():
        print(f"  {name:<5} piece   {len(V)} vertices, {len(F)} triangles "
              f"(separable, split at theta = +-90)")

    print()
    print("(theta, s) round-trip   forward -> inverse -> forward")
    print(f"  {'site':<16} {'theta':>8} {'s':>9} {'d_theta (deg)':>14} {'d_s (mm)':>10} "
          f"{'d_pos (mm)':>11}")
    worst = 0.0
    for name, (theta, s) in named_points(coords).items():
        f = coords.forward(theta, s)
        t2, s2 = coords.inverse(f["position"], check_mm=0.01)
        p2 = coords.forward(float(t2), float(s2))["position"]
        dt, ds = abs(float(t2) - theta), abs(float(s2) - s)
        dp = float(np.linalg.norm(p2 - f["position"]))
        worst = max(worst, dp)
        print(f"  {name:<16} {theta:>8.1f} {s:>9.2f} {dt:>14.2e} {ds:>10.2e} {dp:>11.2e}")

    rng = np.random.default_rng(7)
    thetas = rng.uniform(-180.0, 180.0, 2000)
    ss = rng.uniform(coords.s_min, coords.s_max, 2000)
    f = coords.forward(thetas, ss)
    t2, s2 = coords.inverse(f["position"], check_mm=0.01)
    p2 = coords.forward(t2, s2)["position"]
    print(f"  {'2000-pt sweep':<16} {'-':>8} {'-':>9} "
          f"{float(np.max(np.abs(t2 - thetas))):>14.2e} "
          f"{float(np.max(np.abs(s2 - ss))):>10.2e} "
          f"{float(np.max(np.linalg.norm(p2 - f['position'], axis=-1))):>11.2e}")
    print()
    print("run the full suite:  python3 -m unittest test_coords -v  (from tools/dress-shell)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
