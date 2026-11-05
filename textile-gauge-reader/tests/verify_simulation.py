"""
"Verify by counting a repeat", simulated: a user drags ONE box and the page asks /count-repeats
for each axis. This drives the shipped route exactly as frontend/textile-gauge-reader.js does
(`performRepeatMatch`, `repeatBoxAnchorPoints`, `fetchRepeatCount`), so what is measured is what
a person who opens the panel gets:

  * the search area is the WHOLE photo (roi 0, 0, naturalWidth, naturalHeight);
  * orientation is the frontend's default, "vertical", so the WALE pair is the box's left and right
    edge midpoints and the COURSE pair is its top and bottom edge midpoints;
  * pixels_per_mm is the calibration's (a perfect one here -- this measures the counting, not the
    calibration), and the counted per-inch figure is the page's: scale / spacing_px.

The user is simulated by the size of the box they drag, as a multiple of the TRUE stitch pitch
(ground truth, px = px_per_inch / true gauge), centred at one of three places on the fabric:

  exact          1.0 x  a person who marks exactly one repeat
  sloppy -20%    0.8 x  a hand that stops a little short
  sloppy +20%    1.2 x  ... or runs a little long
  miscount +1    2.0 x  one stitch too many: "one repeat" taken as two (wide AND tall)
  half-stitch    0.5 x  the classic jersey mistake: leg to leg of a V instead of V to V

A box whose axis has no ground truth (knit_02 has no course truth) borrows the other axis's
pitch for its height, since a user marks what they see; that axis is not scored.

SCORING. Per axis, signed % error of the counted per-inch figure against truth (the nearer of
primary and alternate reading, as the scorecard does). `within-10%` counts an axis the tool read
within 10%; `no match` is a route answer of success=false (the page shows "No other matches found");
a no-match axis is not within 10%.

Run directly:  python tests/verify_simulation.py
"""
from __future__ import annotations

import os
import statistics
import sys
import time
from typing import Dict, List, Optional

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, ".."))

import app_path_scorecard as ap  # noqa: E402
import bad_input_sweep as bis  # noqa: E402

WITHIN_PCT = 10.0

# case -> (box width / true wale pitch, box height / true course pitch)
CASES: Dict[str, tuple] = {
    "exact": (1.0, 1.0),
    "sloppy -20%": (0.8, 0.8),
    "sloppy +20%": (1.2, 1.2),
    "miscount +1 (2x box)": (2.0, 2.0),
    "half-stitch (0.5x box)": (0.5, 0.5),
}
ANCHORS = {"centre": (0.5, 0.5), "upper-left": (0.35, 0.35), "lower-right": (0.65, 0.65)}
# The CI subset: the cases that carry the headline (exact and the one-stitch miscount) on the real photos.
SUBSET_CASES = ("exact", "miscount +1 (2x box)")


def _axis_geometry(fx: ap.Fixture) -> dict:
    """True pitch of one repeat, in pixels, along each axis; an axis without truth borrows the other's."""
    pw = fx.px_per_inch_wale / fx.true_wpi if fx.true_wpi else None
    pc = fx.px_per_inch_course / fx.true_cpi if fx.true_cpi else None
    return {"wale": pw or pc, "course": pc or pw}


def box_anchors(x0: float, y0: float, bw: float, bh: float) -> dict:
    """The two anchor pairs the page derives from one dragged box (frontend `repeatBoxAnchorPoints`, orientation
    "vertical": wales are vertical columns whose spacing is read horizontally): the WALE pair is the left and right
    edge midpoints, the COURSE pair the top and bottom edge midpoints. Each is (x1, y1, x2, y2)."""
    mid_x, mid_y = x0 + bw / 2, y0 + bh / 2
    return {"wale": (x0, mid_y, x0 + bw, mid_y), "course": (mid_x, y0, mid_x, y0 + bh)}


def run_verify(runner: Optional["bis.Runner"] = None, subset: bool = False) -> dict:
    """Returns {"rows": [{fixture, case, anchor, axis, ok, error, matches, confidence, message}], "seconds": float,
    "subset": bool}. One row per (fixture, case, anchor, scored axis)."""
    t0 = time.time()
    runner = runner or bis.Runner()
    rows: List[dict] = []
    fixtures = [f for f in ap.FIXTURES if (not subset or f.name in bis.SUBSET_FIXTURES)]
    cases = {k: v for k, v in CASES.items() if (not subset or k in SUBSET_CASES)}
    for fx in fixtures:
        fn, data, ctype = ap.upload_for(fx.name)
        w, h = _image_size(data)
        pitch = _axis_geometry(fx)
        ppm = fx.px_per_inch_wale / ap.MM_PER_INCH
        for case, (kw, kc) in cases.items():
            bw, bh = kw * pitch["wale"], kc * pitch["course"]
            for anchor, (ax_, ay_) in ANCHORS.items():
                pairs = box_anchors(ax_ * w - bw / 2, ay_ * h - bh / 2, bw, bh)
                for axis in ap.AXES:
                    true = fx.true_wpi if axis == "wale" else fx.true_cpi
                    alt = fx.alt_wpi if axis == "wale" else fx.alt_cpi
                    if true is None:
                        continue
                    a = pairs[axis]
                    form = dict(roi_x=0, roi_y=0, roi_width=w, roi_height=h,
                                anchor_start_x=a[0], anchor_start_y=a[1], anchor_end_x=a[2], anchor_end_y=a[3],
                                orientation=ap.ORIENTATION, axis=axis, pixels_per_mm=ppm)
                    r = runner.post("/count-repeats", form, data, ctype, fn)
                    row = {"fixture": fx.name, "case": case, "anchor": anchor, "axis": axis, "ok": bool(r.get("success")),
                           "error": None, "matches": r.get("match_count"), "confidence": r.get("confidence"),
                           "message": r.get("message", "")}
                    if row["ok"] and r.get("spacing_px"):
                        axis_ppi = fx.px_per_inch_wale if axis == "wale" else fx.px_per_inch_course
                        per_inch = axis_ppi / r["spacing_px"]
                        e, ea = ap._err(per_inch, true), ap._err(per_inch, alt)
                        if e is not None and ea is not None and abs(ea) < abs(e):
                            e = ea
                        row["error"] = e
                    rows.append(row)
    return {"rows": rows, "seconds": time.time() - t0, "subset": subset}


_CACHE: dict = {}


def cached_verify(subset: bool = False) -> dict:
    """One run per process: the pins, the README check and the sweep's README block all read the same one."""
    if subset not in _CACHE:
        _CACHE[subset] = run_verify(subset=subset)
    return _CACHE[subset]


def _image_size(data: bytes):
    import cv2
    import numpy as np
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    return img.shape[1], img.shape[0]


def within(row: dict) -> bool:
    return row["error"] is not None and abs(row["error"]) <= WITHIN_PCT


def case_metrics(verify: dict, case: str, axis: Optional[str] = None, real_only: bool = False) -> dict:
    rows = [r for r in verify["rows"] if r["case"] == case and (axis is None or r["axis"] == axis)
            and not (real_only and r["fixture"].startswith("synth"))]
    errs = [abs(r["error"]) for r in rows if r["error"] is not None]
    n = len(rows)
    ok = sum(1 for r in rows if within(r))
    return {"n": n, "within": ok, "no_match": sum(1 for r in rows if not r["ok"]),
            "rate": (ok / n) if n else None,
            "median_abs_error": statistics.median(errs) if errs else None}


def headline(verify: dict) -> dict:
    """Within-10% rate of the exact box over every axis-case, and of every case, as (within, n)."""
    out = {}
    for case in CASES:
        m = case_metrics(verify, case)
        if m["n"]:
            out[case] = (m["within"], m["n"])
    return out


def format_verify_table(verify: dict) -> str:
    lines = ["| the user drags... | axis-cases | **within 10%** | rate | no match | wale: within / n (median abs error) | "
             "course: within / n (median abs error) |",
             "|---|---|---|---|---|---|---|"]
    tot_n = tot_ok = 0
    for case in CASES:
        m = case_metrics(verify, case)
        if not m["n"]:
            continue
        cells = []
        for axis in ap.AXES:
            a = case_metrics(verify, case, axis)
            med = "—" if a["median_abs_error"] is None else f"{a['median_abs_error']:.0f}%"
            cells.append(f"{a['within']} / {a['n']} ({med})")
        lines.append(f"| `{case}` | {m['n']} | **{m['within']}** | {m['rate'] * 100:.0f}% | {m['no_match']} | {cells[0]} | {cells[1]} |")
        tot_n += m["n"]
        tot_ok += m["within"]
    lines.append(f"| **all cases** | {tot_n} | **{tot_ok}** | {tot_ok / tot_n * 100:.0f}% | | | |")
    return "\n".join(lines)


if __name__ == "__main__":
    v = run_verify(subset="--subset" in sys.argv)
    print(format_verify_table(v))
    print(f"\n({v['seconds']:.0f} s)")
