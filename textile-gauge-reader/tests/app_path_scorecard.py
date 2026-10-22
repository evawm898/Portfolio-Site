"""
App-path scorecard: what a user actually sees, measured end to end through
the shipped HTTP API -- not through any internal function.

Why this exists. The pinned-crop scorecard (test_ground_truth_scorecard.py)
calls `analyze_gauge` ONCE, on ONE mechanically chosen crop. The app never
does that. The real path, in the order the frontend drives it
(frontend/textile-gauge-reader.js), is:

  1. POST /detect-ruler        -> pre-fills the Calibrate step's two points,
                                  known distance and unit
  2. POST /propose-rois        -> proposes several measurement areas, all of
                                  which the Review step shows pre-approved
  3. POST /analyze-multi       -> analyzes each area independently, then
                                  combines them into a cross-region consensus

A read-only audit on main @ 8403b47 found that this path and the pinned crop
disagree badly (jersey wale +90% "confident" here against -5.5% on the
pinned crop -- the consensus's loop-count override beats each area's own
reading). This module makes that path the thing that gets measured, so a
future change is graded against what users see.

Everything here goes through `fastapi.testclient.TestClient(app)` on the
real routes with real multipart uploads, so the scorecard cannot drift from
the shipped code: if a route, a form field or a response field changes, this
breaks rather than quietly measuring something else.

What a "user" does, stated so it is reproducible:
  * uploads the photo as-is (the fixture file's own bytes);
  * accepts EVERY proposed area unchanged (the Review step's default);
  * leaves orientation "vertical" and structure "unknown" (the defaults);
  * calibrates one of three ways (the CALIBRATION modes below).

Calibration modes:
  * "truth"  -- the correct scale from ground truth: two points exactly
                px_per_inch apart and a known distance of 1 inch. The ideal
                user who calibrated perfectly.
  * "ruler"  -- /detect-ruler's pre-fill, if one is offered: its points AND its
                distance and unit, accepted as-is (what a user who just clicks
                Confirm gets). The endpoint only offers a pre-fill it can justify
                from the ruler's own tick pattern (analysis.gauge_analysis.
                justify_ruler_calibration). When NONE is offered the user has
                nothing to accept and calibrates by hand, here as a perfect manual
                calibration -- the "truth" run, scored as the "truth" mode is. So
                this mode measures what calibration ADDS to the app path: a row
                that is confident-and-wrong here but not under "truth" was put
                there by the pre-fill. (Until the calibration guardrail the mode
                was "accept the pre-fill as-is, always": 13 confident-and-wrong
                axes against 1 on "truth".)
  * jitter   -- the "truth" scale multiplied by (1 + j) for each j in
                JITTERS, to find results that sit on a knife edge of scale.

One fixture needs a note: knit_sample_06 has two rulers at two different
scales (wale ruler in cm, course ruler in inches -- see
knit_sample_ground_truth.py). The API takes ONE calibration, so the request
is calibrated with the wale ruler's scale, and in "truth" mode each axis's
error is computed from the returned spacing_px against THAT axis's own
ruler scale (the pinned-crop scorecard's convention). In "ruler" mode the
user's own number is scored as returned.

Errors are signed %, (predicted - true) / true * 100, as in the pinned
scorecard. For the synthetic rib (wale) and garter (course) the truth has a
structurally legitimate alternate reading (see synthetic_fabric.py); a row
is scored against whichever of primary / alternate is nearer and records
which.

CONFIDENT-AND-WRONG is the headline number: a consensus axis reported with
status "confident" whose |error| > CONFIDENT_WRONG_PCT. Counted per
calibration mode.

Run directly to print the README tables:

    python tests/app_path_scorecard.py
"""
from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass
from functools import lru_cache
from typing import Dict, List, Optional, Tuple

import cv2

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, ".."))

import knit_sample_ground_truth as gt  # noqa: E402
from synthetic_fabric import clean, expected_periods, render_fabric  # noqa: E402

FIXTURES_DIR = os.path.join(HERE, "fixtures")

MM_PER_INCH = 25.4
UNIT_TO_MM = {"mm": 1.0, "cm": 10.0, "in": 25.4}

CONFIDENT_WRONG_PCT = 10.0   # |error| beyond this while "confident" = confident-and-wrong
JITTERS = (-0.02, -0.01, -0.005, 0.005, 0.01, 0.02)
JITTER_JUMP_PCT = 25.0       # a per-inch result moving more than this under jitter is unstable
RULER_SCALE_TOL_PCT = 5.0    # a pre-filled ruler calibration further off than this is wrong
RULER_LABEL_PCT = 20.0       # ...and further off than this is a wrong LABEL / unit, not imprecise points

ORIENTATION = "vertical"     # the frontend's default
STRUCTURE = "unknown"        # the frontend's default
AXES = ("wale", "course")


@dataclass(frozen=True)
class Fixture:
    name: str
    source: str                       # filename in tests/fixtures, or "synthetic:<structure>"
    px_per_inch_wale: float
    px_per_inch_course: float
    true_wpi: Optional[float]
    true_cpi: Optional[float]
    alt_wpi: Optional[float] = None   # structurally legitimate alternate reading (synthetic only)
    alt_cpi: Optional[float] = None
    provenance: str = ""
    has_ruler: bool = True            # the synthetic fabrics are drawn without one

    @property
    def request_ppi(self) -> float:
        """The single scale the API is calibrated with in "truth" mode."""
        return self.px_per_inch_wale


# Synthetic fabrics: clean, 5 WPI x 7 CPI at 180 px/in, large enough that
# /propose-rois can place several areas. No ruler is drawn in them.
SYNTH_W, SYNTH_H = 960, 720
SYNTH_WPI, SYNTH_CPI = 5.0, 7.0


def _synth_spec(structure: str):
    return clean(structure, SYNTH_WPI, SYNTH_CPI, width_px=SYNTH_W, height_px=SYNTH_H)


def _synth_fixture(name: str, structure: str) -> Fixture:
    spec = _synth_spec(structure)
    per = expected_periods(spec)
    (w_p, w_alt), (c_p, c_alt) = per["wale"], per["course"]
    ppi = spec.px_per_inch
    return Fixture(
        name, f"synthetic:{structure}", ppi, ppi, ppi / w_p, ppi / c_p,
        alt_wpi=(ppi / w_alt) if w_alt else None, alt_cpi=(ppi / c_alt) if c_alt else None,
        provenance="synthetic, exact", has_ruler=False,
    )


FIXTURES: List[Fixture] = [
    Fixture("jersey", "real_jersey_sample.jpg", 166.25, 166.25, 5.0, 7.2, provenance="hand-counted"),
    Fixture("teal", "sarahmaker-knitting-gauge.jpg", 272.8, 272.8, 4.0, 5.0, provenance="hand-counted"),
    Fixture("knit_01", "knit_sample_01.jpg", gt.PX_PER_INCH_01, gt.PX_PER_INCH_01,
            gt.TRUE_WALES_PER_INCH_01, gt.TRUE_COURSES_PER_INCH_01, provenance="AI-estimated, human-verified"),
    Fixture("knit_02", "knit_sample_02.jpg", gt.PX_PER_INCH_02, gt.PX_PER_INCH_02,
            gt.TRUE_WALES_PER_INCH_02, gt.TRUE_COURSES_PER_INCH_02, provenance="AI-estimated, human-verified"),
    Fixture("knit_05", "knit_sample_05.jpg", gt.PX_PER_INCH_05, gt.PX_PER_INCH_05,
            gt.TRUE_WALES_PER_INCH_05, gt.TRUE_COURSES_PER_INCH_05, provenance="AI-estimated, human-verified"),
    Fixture("knit_06", "knit_sample_06.jpg", gt.PX_PER_CM_06_WALE * MM_PER_INCH / 10.0, gt.PX_PER_INCH_06_COURSE,
            gt.TRUE_WALES_PER_INCH_06, gt.TRUE_COURSES_PER_INCH_06,
            provenance="AI-estimated, human-verified; two rulers at two scales"),
    Fixture("knit_08", "knit_sample_08.jpg", gt.PX_PER_INCH_08, gt.PX_PER_INCH_08,
            gt.TRUE_WALES_PER_INCH_08, gt.TRUE_COURSES_PER_INCH_08,
            provenance="AI-estimated, human-verified; course transposed calibration"),
    Fixture("knit_09", "knit_sample_09.jpg", gt.PX_PER_INCH_09, gt.PX_PER_INCH_09,
            gt.TRUE_WALES_PER_INCH_09, gt.TRUE_COURSES_PER_INCH_09,
            provenance="AI-estimated, human-verified; wale transposed calibration"),
    _synth_fixture("synth_jersey", "jersey"),
    _synth_fixture("synth_garter", "garter"),
    _synth_fixture("synth_rib", "rib1x1"),
]
FIXTURES_BY_NAME = {f.name: f for f in FIXTURES}


# --- Upload bytes -------------------------------------------------------


@lru_cache(maxsize=None)
def upload_for(name: str) -> Tuple[str, bytes, str]:
    """(filename, bytes, content_type) exactly as the browser would send it."""
    fx = FIXTURES_BY_NAME[name]
    if fx.source.startswith("synthetic:"):
        structure = fx.source.split(":", 1)[1]
        ok, buf = cv2.imencode(".png", render_fabric(_synth_spec(structure)))
        assert ok, f"could not encode synthetic {structure}"
        return (f"{name}.png", buf.tobytes(), "image/png")
    path = os.path.join(FIXTURES_DIR, fx.source)
    with open(path, "rb") as fh:
        return (fx.source, fh.read(), "image/jpeg")


def _files(name: str) -> dict:
    return {"file": upload_for(name)}


# --- One app-path run ---------------------------------------------------


def calibration_for_scale(px_per_inch: float) -> dict:
    """Two points exactly px_per_inch apart, 1 inch: a perfect manual calibration."""
    return {"cal_x1": 0.0, "cal_y1": 0.0, "cal_x2": float(px_per_inch), "cal_y2": 0.0,
            "known_distance": 1.0, "unit": "in"}


def detect_ruler(client, name: str) -> dict:
    """POST /detect-ruler; returns the response plus the implied scale and its error."""
    res = client.post("/detect-ruler", files=_files(name))
    assert res.status_code == 200, f"{name}: /detect-ruler HTTP {res.status_code}"
    body = res.json()
    out = {"success": bool(body.get("success")), "message": body.get("message", ""),
           "declined_reason": body.get("declined_reason", ""), "assumption": body.get("assumption", "")}
    if not out["success"]:
        return out
    (x1, y1), (x2, y2) = body["point1_px"], body["point2_px"]
    dist_px = ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5
    mm = body["suggested_distance"] * UNIT_TO_MM[body["suggested_unit"]]
    implied_ppi = dist_px / mm * MM_PER_INCH
    fx = FIXTURES_BY_NAME[name]
    # A photo with two rulers at two scales (knit_06) is scored against
    # whichever of its rulers the pre-fill is nearest -- the generous reading.
    truths = sorted({fx.px_per_inch_wale, fx.px_per_inch_course}, key=lambda t: abs(implied_ppi / t - 1))
    out.update({
        "point1_px": [x1, y1], "point2_px": [x2, y2],
        "suggested_distance": body["suggested_distance"], "suggested_unit": body["suggested_unit"],
        "confidence": body.get("confidence"),
        "calibration": {"cal_x1": x1, "cal_y1": y1, "cal_x2": x2, "cal_y2": y2,
                        "known_distance": body["suggested_distance"], "unit": body["suggested_unit"]},
        "implied_ppi": implied_ppi,
        "true_ppi": truths[0],
        "scale_error_pct": (implied_ppi / truths[0] - 1.0) * 100.0,
    })
    return out


def run_app_path(client, name: str, calibration: dict) -> dict:
    """propose-rois -> accept every proposal -> analyze-multi, through the API."""
    pr = client.post("/propose-rois", files=_files(name), data=calibration)
    assert pr.status_code == 200, f"{name}: /propose-rois HTTP {pr.status_code}: {pr.text[:200]}"
    pbody = pr.json()
    rois = [
        {"label": r["label"], "x": r["x"], "y": r["y"], "width": r["width"], "height": r["height"], "source": "auto"}
        for r in (pbody.get("rois") or [])
    ]
    out = {"areas": len(rois), "propose_message": pbody.get("message", ""), "analyzed": False}
    if not rois:
        return out
    data = dict(calibration, rois_json=json.dumps(rois), orientation=ORIENTATION, structure=STRUCTURE)
    am = client.post("/analyze-multi", files=_files(name), data=data)
    assert am.status_code == 200, f"{name}: /analyze-multi HTTP {am.status_code}: {am.text[:200]}"
    body = am.json()
    out["analyzed"] = bool(body.get("success"))
    out["message"] = body.get("message", "")
    if not out["analyzed"]:
        return out
    per_roi = (body.get("multi_roi") or {}).get("per_roi") or []
    for axis in AXES:
        a = body[axis]
        out[axis] = {
            "spacing_px": a.get("spacing_px"),
            "per_inch": a.get("per_inch"),
            "status": a.get("status"),
            "area_status": [m[axis].get("status") for m in per_roi],
        }
    out["wale_sources"] = [m.get("wale_source") for m in per_roi]
    return out


# --- Scoring ------------------------------------------------------------


def _err(pred: Optional[float], true: Optional[float]) -> Optional[float]:
    if pred is None or true is None or true == 0:
        return None
    return (pred - true) / true * 100.0


def score_axis(fx: Fixture, axis: str, run: dict, mode: str) -> Optional[dict]:
    """Signed error for one axis of one run, or None when the fixture has no truth there."""
    true = fx.true_wpi if axis == "wale" else fx.true_cpi
    alt = fx.alt_wpi if axis == "wale" else fx.alt_cpi
    if true is None:
        return None
    row = {"true": true, "status": None, "area_status": [], "predicted": None, "error": None, "matched": None}
    if not run.get("analyzed"):
        return row
    a = run[axis]
    row["status"] = a["status"]
    row["area_status"] = a["area_status"]
    row["spacing_px"] = a["spacing_px"]
    pred = a["per_inch"]
    if (mode == "truth" or run.get("source") == "manual") and a["spacing_px"]:
        # A perfect manual calibration. Score each axis against ITS OWN ruler scale
        # (matters only for knit_06).
        axis_ppi = fx.px_per_inch_wale if axis == "wale" else fx.px_per_inch_course
        pred = axis_ppi / a["spacing_px"]
    row["predicted"] = pred
    e_primary = _err(pred, true)
    e_alt = _err(pred, alt)
    if e_alt is not None and e_primary is not None and abs(e_alt) < abs(e_primary):
        row["error"], row["matched"] = e_alt, "alternate"
    else:
        row["error"], row["matched"] = e_primary, ("primary" if e_primary is not None else None)
    return row


def ruler_verdict(fx: Fixture, r: dict) -> str:
    """What the pre-fill offered for this photo turned out to be.

    Offered: "ok" (within 5%), "OFF" (5-20%, the points misplaced), "WRONG"
    (beyond 20%: a wrong distance label or unit), or "SPURIOUS" (a ruler offered
    on a photo that has none). Not offered: "withheld" when the photo does have a
    ruler (the user calibrates by hand: safe, but a miss), "none (correct)" when
    it does not."""
    if not r["success"]:
        return "withheld" if fx.has_ruler else "none (correct)"
    if not fx.has_ruler:
        return "SPURIOUS"
    e = abs(r["scale_error_pct"])
    if e <= RULER_SCALE_TOL_PCT:
        return "ok"
    return "OFF" if e <= RULER_LABEL_PCT else "WRONG"


def confident_and_wrong(row: Optional[dict]) -> bool:
    return bool(row and row["status"] == "confident" and row["error"] is not None
                and abs(row["error"]) > CONFIDENT_WRONG_PCT)


def _round(v, nd=1):
    return None if v is None else round(v, nd)


def build_scorecard(client=None) -> dict:
    """Run every fixture through the app path under every calibration mode.

    Returns {
      "rulers":  {fixture: detect-ruler summary},
      "runs":    {(mode, fixture): raw run},
      "rows":    {(mode, fixture, axis): scored row},
      "jitter":  {(fixture, axis): {"base": ..., "points": [...], "unstable": [...]}},
      "cw":      {mode: [(fixture, axis), ...]},
    }
    """
    if client is None:
        from fastapi.testclient import TestClient
        from backend.main import app
        client = TestClient(app)

    rulers, runs, rows = {}, {}, {}
    for fx in FIXTURES:
        runs[("truth", fx.name)] = run_app_path(client, fx.name, calibration_for_scale(fx.request_ppi))
        rulers[fx.name] = detect_ruler(client, fx.name)
        if rulers[fx.name]["success"]:
            runs[("ruler", fx.name)] = dict(
                run_app_path(client, fx.name, rulers[fx.name]["calibration"]), source="prefill")
        else:
            # Nothing offered: the user calibrates by hand, correctly.
            runs[("ruler", fx.name)] = dict(runs[("truth", fx.name)], source="manual")
        for j in JITTERS:
            runs[(f"jitter{j:+.3f}", fx.name)] = run_app_path(
                client, fx.name, calibration_for_scale(fx.request_ppi * (1.0 + j)))

    for (mode, name), run in runs.items():
        if mode.startswith("jitter"):
            continue
        fx = FIXTURES_BY_NAME[name]
        for axis in AXES:
            row = score_axis(fx, axis, run, mode)
            if row is not None:
                rows[(mode, name, axis)] = row

    jitter = {}
    for fx in FIXTURES:
        base = runs[("truth", fx.name)]
        for axis in AXES:
            entry = {"base_per_inch": None, "base_status": None, "points": [], "unstable": []}
            if base.get("analyzed"):
                entry["base_per_inch"] = base[axis]["per_inch"]
                entry["base_status"] = base[axis]["status"]
            for j in JITTERS:
                r = runs[(f"jitter{j:+.3f}", fx.name)]
                pt = {"jitter": j, "areas": r["areas"], "per_inch": None, "status": None, "change_pct": None}
                if r.get("analyzed"):
                    pt["per_inch"] = r[axis]["per_inch"]
                    pt["status"] = r[axis]["status"]
                why = []
                if base.get("analyzed") != r.get("analyzed"):
                    why.append("result appears/disappears")
                elif base.get("analyzed"):
                    if entry["base_per_inch"] and pt["per_inch"]:
                        pt["change_pct"] = (pt["per_inch"] / entry["base_per_inch"] - 1.0) * 100.0
                        if abs(pt["change_pct"]) > JITTER_JUMP_PCT:
                            why.append(f"jumps {pt['change_pct']:+.1f}%")
                    elif bool(entry["base_per_inch"]) != bool(pt["per_inch"]):
                        why.append("measurement appears/disappears")
                    if pt["status"] != entry["base_status"]:
                        why.append(f"status {entry['base_status']} -> {pt['status']}")
                if why:
                    entry["unstable"].append((j, "; ".join(why)))
                entry["points"].append(pt)
            jitter[(fx.name, axis)] = entry

    cw = {mode: sorted([(n, a) for (m, n, a), r in rows.items() if m == mode and confident_and_wrong(r)])
          for mode in ("truth", "ruler")}
    return {"rulers": rulers, "runs": runs, "rows": rows, "jitter": jitter, "cw": cw}


# --- Tables -------------------------------------------------------------


def _fmt_err(v):
    return "—" if v is None else f"{v:+.1f}%"


def _fmt_status_list(xs):
    if not xs:
        return "—"
    return " ".join("C" if s == "confident" else ("u" if s == "uncertain" else "?") for s in xs)


def format_mode_table(card: dict, mode: str) -> str:
    lines = [
        "| fixture | areas | WPI true | WPI app | W err | W status | W per-area | "
        "CPI true | CPI app | C err | C status | C per-area |",
        "|---|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    for fx in FIXTURES:
        run = card["runs"][(mode, fx.name)]
        areas = str(run["areas"]) if run["areas"] else "0 (no proposals)"
        if run.get("source") == "manual":
            areas += " (manual)"
        cells = [fx.name, areas]
        for axis in AXES:
            true = fx.true_wpi if axis == "wale" else fx.true_cpi
            row = card["rows"].get((mode, fx.name, axis))
            if true is None:
                cells += ["—", "—", "no truth", "—", "—"]
                continue
            pred = row["predicted"] if row else None
            err = _fmt_err(row["error"] if row else None)
            if row and run.get("analyzed") and pred is None:
                err = "no measurement"
            if row and row.get("matched") == "alternate":
                err += " (alt)"
            if confident_and_wrong(row):
                err = f"**{err}**"
            cells += [f"{true:.2f}", "—" if pred is None else f"{pred:.2f}", err,
                      (row["status"] or "—") if row else "—", _fmt_status_list(row["area_status"] if row else [])]
        lines.append("| " + " | ".join(cells) + " |")
    return "\n".join(lines)


def format_ruler_table(card: dict) -> str:
    lines = ["| fixture | pre-fill offered | implied px/in | true px/in | scale error | verdict |",
             "|---|---|---|---|---|---|"]
    for fx in FIXTURES:
        r = card["rulers"][fx.name]
        if not r["success"]:
            lines.append(f"| {fx.name} | none | — | — | — | {ruler_verdict(fx, r)} |")
            continue
        lines.append(
            f"| {fx.name} | {r['suggested_distance']:g} {r['suggested_unit']} | {r['implied_ppi']:.2f} | "
            f"{r['true_ppi']:.2f} | {r['scale_error_pct']:+.1f}% | {ruler_verdict(fx, r)} |")
    return "\n".join(lines)


def format_jitter_table(card: dict) -> str:
    head = "| fixture | axis | base /in | base status | " + " | ".join(f"{j * 100:+.1f}%" for j in JITTERS) + " | verdict |"
    lines = [head, "|" + "---|" * (5 + len(JITTERS))]
    for fx in FIXTURES:
        for axis in AXES:
            e = card["jitter"][(fx.name, axis)]
            cells = []
            for pt in e["points"]:
                if pt["per_inch"] is None:
                    cells.append("no result" if not pt["areas"] else "—")
                else:
                    flip = "" if pt["status"] == e["base_status"] else f" **{pt['status']}**"
                    ch = pt["change_pct"]
                    c = "" if ch is None else (f" ({ch:+.0f}%)" if abs(ch) <= JITTER_JUMP_PCT else f" (**{ch:+.0f}%**)")
                    cells.append(f"{pt['per_inch']:.2f}{c}{flip}")
            base = "no result" if e["base_per_inch"] is None else f"{e['base_per_inch']:.2f}"
            verdict = "UNSTABLE" if e["unstable"] else "stable"
            lines.append(f"| {fx.name} | {axis} | {base} | {e['base_status'] or '—'} | " + " | ".join(cells) + f" | {verdict} |")
    return "\n".join(lines)


def format_headline(card: dict) -> str:
    out = []
    for mode in ("truth", "ruler"):
        hits = card["cw"][mode]
        n = sum(1 for (m, _, _) in card["rows"] if m == mode)
        names = ", ".join(f"{f} {a[0].upper()}" for f, a in hits) or "none"
        out.append(f"- **{mode}** calibration: **{len(hits)}** confident-and-wrong of {n} scored axes ({names})")
    return "\n".join(out)


def format_all(card: dict) -> str:
    return "\n\n".join([
        "**Confident-and-wrong** (status `confident`, |error| > 10%):\n\n" + format_headline(card),
        "**(a) Correct scale from ground truth**\n\n" + format_mode_table(card, "truth"),
        "**(b) The ruler pre-fill accepted if one is offered; otherwise the user calibrates by hand, "
        "correctly** (the pre-fill is ok within 5%; OFF 5-20%, the points misplaced; WRONG beyond 20%, "
        "a wrong distance label or unit; SPURIOUS, offered in a photo drawn without a ruler; withheld, a "
        "photo that has a ruler and was offered none; none (correct), no ruler and none offered)\n\n"
        + format_ruler_table(card)
        + "\n\n" + format_mode_table(card, "ruler"),
        "**Scale jitter around the correct scale** (per-inch result as the user sees it; "
        f"change vs the unjittered run; flagged beyond ±{JITTER_JUMP_PCT:g}% or on a status flip)\n\n"
        + format_jitter_table(card),
    ])


README_BEGIN = "<!-- app-path-scorecard:begin (generated by `python tests/app_path_scorecard.py`; do not edit by hand) -->"
README_END = "<!-- app-path-scorecard:end -->"


def readme_block(card: dict) -> str:
    return f"{README_BEGIN}\n{format_all(card)}\n{README_END}"


def write_readme(card: dict, path: Optional[str] = None) -> bool:
    """Replace the generated block in README.md; returns True if it changed."""
    path = path or os.path.join(HERE, "..", "README.md")
    with open(path, encoding="utf-8") as fh:
        text = fh.read()
    i, k = text.index(README_BEGIN), text.index(README_END) + len(README_END)
    new = text[:i] + readme_block(card) + text[k:]
    if new != text:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(new)
    return new != text


if __name__ == "__main__":
    card = build_scorecard()
    if "--json" in sys.argv:
        print(json.dumps({part: {str(k): v for k, v in card[part].items()} for part in card},
                         indent=1, sort_keys=True, default=str))
    elif "--write-readme" in sys.argv:
        print("README updated" if write_readme(card) else "README already current")
    else:
        print(format_all(card))
