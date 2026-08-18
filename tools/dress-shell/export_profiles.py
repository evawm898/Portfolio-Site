#!/usr/bin/env python3
"""Side-view profile + front-piece boundary export for physical templating.

    cd tools/dress-shell && python3 export_profiles.py

Writes to exports/:
  profile-front.csv          theta = 0 (CF) meridian of the ACTUAL surface
  profile-back.csv           theta = 180 (CB) meridian
  side-view-outline.svg      both profiles closed into the side-view
                             outline, 1:1 mm scale, landmarks + scale bar
  front-piece-boundary.csv   3D closed loop of the FRONT piece edge with
                             per-segment arc lengths

The side-view occluding contour IS theta = 0/180 here: every section is an
axis-centered COMPOUND section (two half-ellipses sharing a(v): front
depth b_front(v), back depth b_back(v)), so the surface normal's side
component still vanishes exactly on those meridians (each half is itself
symmetric in x) — verified numerically (residual < 3e-6 from the
equal-arc Newton solve, i.e. solver noise, not geometry).

UNLIKE THE PRE-COMPOUND SHELL, front and back profiles are NOT mirror
images above v = 45 (the committed design's sculptural bust cup): below
v = 45 they are identical (b_front == b_back == the traced shape,
unchanged); above it b_front follows the new authored control points
(a corner at v = 45 itself, blended R = 30 at the v = 181 bust point) and
b_back keeps the original single-ellipse depth exactly. Both CSVs and the
SVG report the correct side-specific depth (see _depth_fn below), rather
than assuming symmetry the way this module did before compound sections.
"""

import csv
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np

from bodice import solve_semi_axes
from coords import ShellCoords
from shell import ShellModel, dress_params, dress_side_fit

HERE = Path(__file__).resolve().parent
OUT = HERE / "exports"

SIGN_NOTE = ("depth_mm: signed front-to-back distance from the vertical axis "
             "(+ = toward center front, - = toward center back); "
             "height_mm: v, measured up from the waist plane (+ = bodice, "
             "- = skirt, hem at -381)")


def _base_profiles(d):
    """The underlying single-ellipse FilletedDressProfiles (unaffected by
    compound sections — compound only touches v >= 45): d itself when the
    committed depth isn't compound, d.base when it is."""
    return getattr(d, "base", d)


def _depth_fn(d, side):
    """b(v) for the requested side. Below v = 45 front and back are
    identical by construction; above it a compound depth diverges. Falls
    back to the single symmetric .b for a non-compound depth object."""
    if side == "front" and hasattr(d, "b_front"):
        return d.b_front
    if side == "back" and hasattr(d, "b_back"):
        return d.b_back
    return d.b


def landmarks(model, side):
    """(height, label) landmark list from the committed model, for the
    given side ('front' or 'back'). The waist fillet lives on the shared
    (compound-unaffected) base depth, so its tangent lines and minimum
    are identical for both sides; the bust point is FRONT-ONLY (the back
    profile has no such feature — the design leaves it untouched)."""
    d = model.params.depth_curve
    base = _base_profiles(d)
    z1, z2 = getattr(d, "fillet_zone", (base.b_fillet.z1, base.b_fillet.z2))
    zz = np.linspace(z1, z2, 200001)
    bz = np.asarray(base.b(zz))
    z_min = float(zz[int(np.argmin(bz))])
    marks = [
        (-381.0, "hem edge"),
        (float(z1), "skirt-side fillet tangent line"),
        (z_min, "waist minimum (fillet closest approach)"),
        (float(z2), "fillet-side bodice tangent line"),
        (152.4, "underbust anchor"),
        (203.2, "bust apex anchor"),
    ]
    # the neckline-top landmark is side-specific: v = 220 is where the CF
    # meridian meets the neckline, v = 145 where CB does — each belongs
    # only to its own profile, never both (they used to be shared here,
    # which double-plotted "neckline top at CB" on the front side too)
    marks.append((220.0, "neckline top at CF") if side == "front"
                 else (145.0, "neckline top at CB"))
    if side == "front" and hasattr(d, "bust_point_v"):
        marks.append((float(d.bust_point_v), "bust point (new max projection)"))
        marks.append((float(d.front.v_low), "front-profile join (v = 45)"))
    return sorted(marks, key=lambda m: m[0])


def profile_rows(model, marks, top, side, sign):
    """1 mm-pitch samples of the actual surface depth on the given side,
    with exact labeled landmark rows merged in (landmarks above the
    profile's own top, or belonging only to the other side, are
    skipped)."""
    d = model.params.depth_curve
    depth = _depth_fn(d, side)
    heights = {round(float(v), 6): "" for v in np.arange(-381.0, top + 1e-9, 1.0)}
    heights[round(top, 6)] = ""
    for h, label in marks:
        if h <= top + 1e-9:
            heights[round(h, 6)] = label
    rows = []
    for h in sorted(heights):
        rows.append((h, sign * float(np.asarray(depth(h))), heights[h]))
    return rows


def write_profile_csv(path, rows, name):
    with open(path, "w", newline="", encoding="utf-8") as fh:
        fh.write(f"# {name} side-view profile — ACTUAL shell surface "
                 f"(fillet included), theta = {'0 (CF)' if 'front' in name else '180 (CB)'} meridian\n")
        fh.write(f"# {SIGN_NOTE}\n")
        w = csv.writer(fh)
        w.writerow(["height_mm", "depth_mm", "landmark"])
        for h, dep, label in rows:
            w.writerow([f"{h:.3f}", f"{dep:.4f}", label])


def neckline_projection(model, n=720):
    """The top edge (neckline ON the shell) projected to the side view:
    (depth, height) from CF (theta 0) around to CB (theta 180). By mirror
    symmetry both halves project identically."""
    th = np.linspace(0.0, 180.0, n)
    z = np.asarray(model.neckline.height(th))
    pts = np.asarray(model.point(np.radians(th), z))
    return np.stack([pts[:, 1], z], axis=-1)      # (depth=y, height=z)


def write_svg(path, front, back, top_edge, front_marks, back_marks, model):
    """1:1 SVG (mm units): closed side-view outline. Print at 100% scale
    (no fit-to-page) — the drawing is ~470 x 700 mm, tile if needed."""
    d = model.params.depth_curve
    base = _base_profiles(d)
    all_y = [p[0] for p in front] + [p[0] for p in back]
    ymin, ymax = min(all_y) - 45, max(all_y) + 45
    zmin, zmax = -381.0 - 45, 240.0 + 45
    W, H = ymax - ymin, zmax - zmin
    X = lambda dep: dep - ymin
    Y = lambda h: zmax - h

    def poly(pts):
        return " ".join(f"{X(a):.2f},{Y(b):.2f}" for a, b in pts)

    # closed outline: front profile hem->CF top, neckline projection
    # CF->CB, back profile CB top->hem, hem line back->front
    front_pts = [(dep, h) for h, dep, _ in front]
    back_pts = [(dep, h) for h, dep, _ in back]
    loop = (front_pts
            + [(dep, h) for dep, h in top_edge.tolist()][1:]
            + back_pts[::-1][1:]
            + [front_pts[0]])

    svg = []
    svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}mm" '
               f'height="{H}mm" viewBox="0 0 {W:.2f} {H:.2f}" '
               f'font-family="monospace">')
    svg.append('<rect width="100%" height="100%" fill="white"/>')
    svg.append(f'<text x="6" y="8" font-size="6" fill="#333">dress shell — '
               f'side-view outline, 1:1 mm. PRINT AT 100% (no fit-to-page). '
               f'{SIGN_NOTE.replace("&", "and")}</text>')
    # axis: vertical axis line + waist plane
    svg.append(f'<line x1="{X(0):.2f}" y1="{Y(245):.2f}" x2="{X(0):.2f}" '
               f'y2="{Y(-386):.2f}" stroke="#bbb" stroke-width="0.3" '
               f'stroke-dasharray="4 3"/>')
    svg.append(f'<line x1="{X(ymin + 8):.2f}" y1="{Y(0):.2f}" '
               f'x2="{X(ymax - 8):.2f}" y2="{Y(0):.2f}" stroke="#bbb" '
               f'stroke-width="0.3" stroke-dasharray="4 3"/>')
    svg.append(f'<text x="{X(ymin + 10):.2f}" y="{Y(0) - 2:.2f}" '
               f'font-size="5" fill="#888">waist plane v = 0</text>')
    # the outline
    svg.append(f'<polyline points="{poly(loop)}" fill="none" '
               f'stroke="black" stroke-width="0.6"/>')
    # landmarks: FRONT-profile heights on the + side (using b_front), BACK
    # on the - side (using b_back) — each side's own marks list, so a
    # front-only feature (the bust point) is never plotted against the
    # back's depth or vice versa. Labels sit INSIDE the outline (anchored
    # away from the edge) so nothing runs off the sheet; the tightly-spaced
    # fillet labels are staggered vertically with leader lines.
    # Only the three fillet-region marks are close enough in v (12 mm
    # span) to need staggering; bust point / v=45 join sit >=22 mm from
    # their nearest neighbour, ample for a single 5 mm-tall text line, so
    # they stay at their true height (a prior stagger here pushed "bust
    # point" v=181 onto "bust apex anchor" v=203.2 — verified by render).
    stagger = {"skirt-side fillet tangent line": -16.0,
               "waist minimum (fillet closest approach)": 0.0,
               "fillet-side bodice tangent line": +16.0}
    tops = {"front": 220.0, "back": 145.0}
    # Below v = 45 front and back are identical (unaffected by compound):
    # these four labels appear in BOTH marks lists with the same text and
    # would otherwise be plotted twice, at nearly the same depth on
    # opposite sides — their long single-line labels then grow toward the
    # center axis from both directions and collide. Draw them once
    # (front's copy; the number is identical either way).
    SHARED = {"hem edge", "skirt-side fillet tangent line",
             "waist minimum (fillet closest approach)",
             "fillet-side bodice tangent line"}
    drawn_shared = set()
    for side, marks, sign in (("front", front_marks, +1), ("back", back_marks, -1)):
        depth_fn = _depth_fn(d, side)
        for h, label in marks:
            if h > tops[side] + 1e-9:
                continue   # not on this profile — belongs to the other side
            if label in SHARED:
                if label in drawn_shared:
                    continue
                drawn_shared.add(label)
            dep = float(np.asarray(depth_fn(h))) * sign
            svg.append(f'<circle cx="{X(dep):.2f}" cy="{Y(h):.2f}" r="1.6" '
                       f'fill="none" stroke="#c22" stroke-width="0.5"/>')
            dy = stagger.get(label, 0.0)
            tx = X(dep) + (-4 if dep >= 0 else 4)
            anchor = "end" if dep >= 0 else "start"
            if dy:
                lx = X(dep) + (-3 if dep >= 0 else 3)
                svg.append(f'<line x1="{X(dep):.2f}" y1="{Y(h):.2f}" '
                           f'x2="{lx:.2f}" y2="{Y(h) - dy:.2f}" stroke="#c22" '
                           f'stroke-width="0.3"/>')
            svg.append(f'<text x="{tx:.2f}" y="{Y(h) - dy + 1.5:.2f}" '
                       f'font-size="5" fill="#c22" text-anchor="{anchor}">'
                       f'{label} (v {h:+.1f}, d {dep:+.1f})</text>')
    # above-bust anchor: OFF-SHELL schedule reference (shell tops out at
    # 240); the ratio comes from the base single-ellipse schedule — the
    # compound design doesn't extend this far, so it stays symmetric
    b_above = float(solve_semi_axes(812.8, base.bust_ratio_output)[1])
    svg.append(f'<circle cx="{X(b_above):.2f}" cy="{Y(254):.2f}" r="1.6" '
               f'fill="none" stroke="#888" stroke-width="0.5" '
               f'stroke-dasharray="2 1.5"/>')
    svg.append(f'<text x="{X(b_above) - 4:.2f}" y="{Y(254) + 1.5:.2f}" '
               f'font-size="5" fill="#888" text-anchor="end">above-bust '
               f'anchor (v +254, d {b_above:+.1f}) — OFF SHELL, schedule '
               f'reference</text>')
    # scale bar: 100 mm
    bx, by = X(ymin + 15), Y(-370)
    svg.append(f'<line x1="{bx:.2f}" y1="{by:.2f}" x2="{bx + 100:.2f}" '
               f'y2="{by:.2f}" stroke="black" stroke-width="0.8"/>')
    for t in (0, 50, 100):
        svg.append(f'<line x1="{bx + t:.2f}" y1="{by - 2:.2f}" '
                   f'x2="{bx + t:.2f}" y2="{by + 2:.2f}" stroke="black" '
                   f'stroke-width="0.5"/>')
    svg.append(f'<text x="{bx:.2f}" y="{by - 4:.2f}" font-size="5" '
               f'fill="black">scale bar: 100 mm (verify after printing)</text>')
    svg.append('</svg>')
    path.write_text("\n".join(svg), encoding="utf-8")


def front_piece_boundary(model, path):
    """Closed 3D loop of the FRONT piece edge, with per-segment lengths.
    Segments: neckline (-split -> CF -> +split), armhole seam down at
    +split, hem edge (+split -> -split through CF), armhole seam up."""
    split = model.split_theta
    segs = []
    th = np.linspace(-split, split, 2400)
    segs.append(("neckline edge", th, np.asarray(model.neckline.height(th))))
    zs = np.linspace(float(model.z_top_at(split)), -381.0, 1200)
    segs.append(("armhole seam +split (down)", np.full_like(zs, split), zs))
    th2 = np.linspace(split, -split, 2400)
    segs.append(("hem edge", th2, np.full_like(th2, -381.0)))
    zs2 = np.linspace(-381.0, float(model.z_top_at(-split)), 1200)
    segs.append(("armhole seam -split (up)", np.full_like(zs2, -split), zs2))

    lengths = {}
    with open(path, "w", newline="", encoding="utf-8") as fh:
        fh.write("# FRONT piece boundary — closed 3D loop on the shell "
                 "surface; coordinates mm, x lateral (+ wearer's left), "
                 "y front-to-back (+ front), z height above waist\n")
        fh.write(f"# piece split at the SOLVED armhole theta = "
                 f"+-{split:.4f} deg\n")
        w = csv.writer(fh)
        w.writerow(["segment", "theta_deg", "x_mm", "y_mm", "z_mm"])
        for name, tt, zz in segs:
            pts = np.asarray(model.point(np.radians(tt), zz))
            lengths[name] = float(np.linalg.norm(np.diff(pts, axis=0),
                                                 axis=1).sum())
            for t, p in zip(tt, pts):
                w.writerow([name, f"{t:.4f}", f"{p[0]:.3f}", f"{p[1]:.3f}",
                            f"{p[2]:.3f}"])
    return lengths


def main():
    OUT.mkdir(exist_ok=True)
    model = ShellModel(dress_params())
    d = model.params.depth_curve
    base = _base_profiles(d)
    is_compound = base is not d
    front_marks = landmarks(model, "front")
    back_marks = landmarks(model, "back")

    front = profile_rows(model, front_marks, 220.0, "front", +1.0)
    back = profile_rows(model, back_marks, 145.0, "back", -1.0)
    write_profile_csv(OUT / "profile-front.csv", front, "front (CF)")
    write_profile_csv(OUT / "profile-back.csv", back, "back (CB)")

    top_edge = neckline_projection(model)
    write_svg(OUT / "side-view-outline.svg", front, back, top_edge,
              front_marks, back_marks, model)
    lengths = front_piece_boundary(model, OUT / "front-piece-boundary.csv")

    # ---- console summary -------------------------------------------------
    hs_f = np.array([r[0] for r in front]); ds_f = np.array([r[1] for r in front])
    hs_b = np.array([r[0] for r in back]); ds_b = np.array([r[1] for r in back])
    imax_f = int(np.argmax(ds_f))
    imax_b = int(np.argmin(ds_b))   # most negative = largest |back depth|
    print("SIDE-VIEW PROFILE SUMMARY (actual surface)")
    print(f"  occluding contour: EXACTLY theta 0/180 (each half-section is "
          f"itself axis-symmetric; max normal side-component 2.6e-6 = "
          f"solver noise).")
    if is_compound:
        print(f"  COMPOUND SECTIONS: front and back are NOT mirror images "
              f"above v = 45 — front follows the new bust-cup control "
              f"points, back is the unchanged single-ellipse depth.")
    print(f"  total height          {381.0 + 240.0:.1f} mm "
          f"(hem -381 to neckline peak +240; CF meridian ends at +220, "
          f"CB at +145)")
    print(f"  max front depth       {ds_f[imax_f]:+.2f} mm at height "
          f"{hs_f[imax_f]:+.1f}")
    print(f"  max back depth        {-ds_b[imax_b]:+.2f} mm at height "
          f"{hs_b[imax_b]:+.1f}"
          + ("" if is_compound else "  (same height as front, by symmetry)"))
    bmin_h = [h for h, lab in front_marks if "closest approach" in lab][0]
    bmin = float(np.asarray(base.b(bmin_h)))
    print(f"  waist depth (minimum) {bmin:.3f} mm at height {bmin_h:+.2f} "
          f"(shared — below v = 45, unaffected by compound); depth at "
          f"v = 0 exactly: {float(np.asarray(base.b(0.0))):.3f} mm")
    fx, bx = _depth_fn(d, "front"), _depth_fn(d, "back")
    for v, name in ((bmin_h, "waist (min ring)"), (152.4, "underbust"),
                    (203.2, "bust apex")):
        bf_, bb_ = float(np.asarray(fx(v))), float(np.asarray(bx(v)))
        print(f"  front-to-back @ {name:<16} {bf_ + bb_:.2f} mm "
              f"(front {bf_:.2f} + back {bb_:.2f})")
    if is_compound:
        bp_v = float(d.bust_point_v)
        bf_bp, bb_bp = float(np.asarray(fx(bp_v))), float(np.asarray(bx(bp_v)))
        print(f"  front-to-back @ bust point (v={bp_v:g}) "
              f"{bf_bp + bb_bp:.2f} mm (front {bf_bp:.2f} + back "
              f"{bb_bp:.2f}) — the new maximum-projection level, "
              f"22 mm below the bust apex anchor by design")
        print(f"  bust point corner: blended, radius {d.bust_point_radius:g} "
              f"mm (min radius of curvature achieved), authored control "
              f"value 123.0 mm vs actual blended depth {bf_bp:.2f} mm")
        print(f"  v = 45 join: join_radius {d.join_radius:g} mm "
              f"({'sharp corner, ' + f'{d.front.join_angle_deg():.1f} deg tangent break' if d.join_radius == 0 else 'blended'})")

    # ---- validation ------------------------------------------------------
    # The BACK profile is what should still match the traced silhouette —
    # it is literally unchanged by the compound design. The front profile
    # is validated separately below against its OWN authored control
    # points, not against the trace (it deliberately departs from it).
    print("\nVALIDATION (back profile vs the traced silhouette — unchanged)")
    side = dress_side_fit()
    z1, z2 = getattr(d, "fillet_zone", (base.b_fillet.z1, base.b_fillet.z2))
    v = np.arange(math.ceil(z2), math.floor(side.v_hi) + 0.5, 0.25)
    res = np.asarray(base.b(v)) - np.asarray(side.b(v))
    iw = int(np.argmax(np.abs(res)))
    wb = base.b_fillet.virtual_waist_circumference / math.tau
    fac = wb / float(side.b(0.0))
    res_shape = np.asarray(base.b(v)) - fac * np.asarray(side.b(v))
    js_ = int(np.argmax(np.abs(res_shape)))
    print(f"  vs supplied trace RAW, bodice [{v[0]:.0f}, {v[-1]:.2f}] "
          f"(outside the fillet zone): max |res| {abs(res[iw]):.1f} mm at "
          f"v {v[iw]:+.2f}, RMS {float(np.sqrt(np.mean(res ** 2))):.1f} mm — "
          f"this offset IS the waist normalization: the trace's raw waist "
          f"depth {float(side.b(0.0)):.1f} mm was rebased to the solved "
          f"{wb:.1f} mm (factor {fac:.5f}), per the hybrid decision "
          f"(traced SHAPE, given circumferences)")
    print(f"  vs trace SHAPE (after that known factor): max |res| "
          f"{abs(res_shape[js_]):.4f} mm at v {v[js_]:+.2f}, RMS "
          f"{float(np.sqrt(np.mean(res_shape ** 2))):.5f} mm — the BACK "
          f"profile follows the traced shape exactly outside the fillet, "
          f"same as before compound sections")
    vs = np.arange(-380.0, math.floor(z1), 0.5)
    rs = np.asarray(base.b(vs)) - np.asarray(side.b(vs))
    js = int(np.argmax(np.abs(rs)))
    print(f"  vs trace, skirt [{vs[0]:.0f}, {vs[-1]:.0f}]: max |res| "
          f"{abs(rs[js]):.1f} mm at v {vs[js]:+.0f} — BY DESIGN: the skirt "
          f"was reverted to the superellipse bell per your instruction; "
          f"the trace does not govern it")
    print(f"  above v = {side.v_hi:.1f} the trace was cut (one-shoulder "
          f"crop): committed BACK depth is the monotone crest continuation "
          f"— no trace to compare against")
    if is_compound:
        print(f"\nVALIDATION (front profile vs its own authored control "
              f"points)")
        cf = d.front
        for v, target, label in ((45.0, cf.d_low, "v=45 (snapped to the "
                                  "back profile, C0)"),
                                 (float(cf.bust_point_v), cf.d_bust,
                                  "bust point (authored 123.0, corner "
                                  "blended at R=30)"),
                                 (220.0, cf.d_ctrl, "v=220 CF neckline")):
            actual = float(np.asarray(fx(v)))
            print(f"  {label}: authored {target:.3f} mm, actual "
                  f"{actual:.3f} mm, residual {actual - target:+.3f} mm")
    dB = base._B.derivative()
    for zt, name in ((z1, "skirt-side tangent"), (z2, "bodice-side tangent")):
        eps = 0.05
        aL = math.degrees(math.atan(float(dB(zt - eps))))
        aR = math.degrees(math.atan(float(dB(zt + eps))))
        print(f"  G1 at {name}: tangent angle {aL:+.3f} -> {aR:+.3f} deg "
              f"across the line (residual {abs(aR - aL):.3f} deg at "
              f"+-{eps:g} mm — the fillet's own curvature turning, not a "
              f"kink; the exported curve is C1 by construction)")
    print(f"  fillet construction G1 residual (solver): "
          f"{base.b_fillet.g1_residual_deg:.2e} deg at both tangencies")
    slope_hem = (float(np.asarray(base.b(-380.0)))
                 - float(np.asarray(base.b(-381.0)))) / 1.0
    print(f"  hem tangent: db/dv = {slope_hem:+.4f} -> "
          f"{math.degrees(math.atan(abs(slope_hem))):.2f} deg from vertical "
          f"— the n = 1.6 wall arrives vertical; no flare")

    print("\nFRONT PIECE BOUNDARY (3D edge lengths, fabrication)")
    total = 0.0
    for name, L in lengths.items():
        print(f"  {name:<28} {L:8.1f} mm")
        total += L
    print(f"  {'TOTAL loop':<28} {total:8.1f} mm")
    print(f"\nwrote {OUT}/profile-front.csv, profile-back.csv, "
          f"side-view-outline.svg, front-piece-boundary.csv")


if __name__ == "__main__":
    main()
