"""
Regression test for a real live-site bug: the frontend crashed on the
Analyze step with "Cannot read properties of undefined (reading
'length')", and separately showed "Accepted wale columns: 43 of
undefined" in Developer diagnostics. Root-caused by reproducing against
a REAL backend (FastAPI TestClient + a real fixture image, not a
hand-built response) rather than reasoning from the schema alone: the
live Render deployment was suspected to be running older backend code
than this repo's `main` -- specifically, code from before
`no_measurement_labels` and `columns_considered` existed on
AxisConsensusOut / LoopLatticeDebugOut (both added together in the PR
whose description literally says "Loop-lattice column acceptance got
the same treatment (columns_considered alongside column_count)"). The
frontend reads both unconditionally in a couple of spots
(renderMeasurementConsistency's `consensus.outliers.length` /
`consensus.no_measurement_labels.length`, and
renderLoopLatticeComparison's `d.columns_considered` interpolation) --
against a backend response missing either key, that's exactly this
crash and exactly this "undefined" text. Both frontend copies were also
hardened directly (see their own comments) so a schema drift degrades
gracefully instead of crashing outright; this test is the other half:
it fails LOUD, at commit time, the moment the backend response the
frontend depends on drifts, rather than waiting for a live-site report.

This test does NOT parse the frontend JS. It's a curated, explicit list
of dotted paths the frontend is known (by direct code reading, see the
comment on each) to read WITHOUT a defensive null/undefined guard --
i.e. paths where the frontend's OWN code has no fallback, so their
absence is a real regression, not a false alarm. A newly-added frontend
read against a field must be added here too, in the same commit; that's
a cost paid once per real dependency, not a maintenance tax on every
schema change (this is deliberately not a "must match 100% of the
schema" test -- optional/defensively-read fields are not listed).

Uses the real /propose-rois -> /analyze-multi flow against a real
fixture image (knit_sample_08.jpg -- the exact fixture named in the
live bug report), through FastAPI's TestClient, so the response is
whatever the CURRENT backend code actually produces -- not a mock, not
a hand-built dict standing in for one.
"""
import os

import cv2
import pytest
from fastapi.testclient import TestClient

from backend.main import app

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")


@pytest.fixture
def client():
    return TestClient(app)


def _get(obj, dotted_path):
    """Walk a dotted path (with optional `[0]` list-index segments) through
    nested dicts/lists. Raises AssertionError with the exact failing
    segment named, rather than a bare KeyError/IndexError, so a failure
    here reads as "which field went missing" not a stack trace to decode."""
    cur = obj
    parts = dotted_path.replace("[", ".[").split(".")
    walked = []
    for part in parts:
        walked.append(part)
        if part.startswith("["):
            idx = int(part[1:-1])
            assert isinstance(cur, list), f"{dotted_path}: expected a list at {'.'.join(walked)}, got {type(cur).__name__}"
            assert len(cur) > idx, f"{dotted_path}: list at {'.'.join(walked[:-1])} has only {len(cur)} item(s), need index {idx}"
            cur = cur[idx]
        else:
            assert isinstance(cur, dict), f"{dotted_path}: expected an object at {'.'.join(walked)}, got {type(cur).__name__}"
            assert part in cur, f"{dotted_path}: key '{part}' is missing at {'.'.join(walked)}"
            cur = cur[part]
    return cur


# Every path below is read by the frontend WITHOUT a defensive guard --
# i.e. reading it against a response missing the key throws or silently
# renders "undefined", not a controlled fallback. The comment on each
# names the JS function that reads it, so a failure here points straight
# at what to go fix (either the backend regressed, or the frontend's own
# expectation needs updating).
ANALYZE_MULTI_CRITICAL_PATHS = [
    # renderResults() / axisDiagnosticsCard() -- the primary user-facing
    # per-axis result.
    "success", "message", "wale.spacing_px", "wale.status", "wale.per_inch",
    "wale.positions_px", "wale.candidates_px", "wale.selected_reason",
    "wale.candidate_details", "course.spacing_px", "course.status",
    "course.per_inch", "course.positions_px",
    # renderMeasurementConsistency() -- the cross-region agreement summary
    # shown in the normal Results view, not just Developer diagnostics.
    # This exact set (outliers / no_measurement_labels / included_labels)
    # is what the live bug report's "reading 'length' of undefined" crash
    # traced back to.
    "multi_roi.per_roi", "multi_roi.primary_label",
    "multi_roi.wale_consensus.outliers",
    "multi_roi.wale_consensus.no_measurement_labels",
    "multi_roi.wale_consensus.included_labels",
    "multi_roi.course_consensus.outliers",
    "multi_roi.course_consensus.no_measurement_labels",
    "multi_roi.course_consensus.included_labels",
    # renderRoiDiagContent() -- Developer diagnostics' per-region card.
    "multi_roi.per_roi[0].wale.confidence",  # AxisDebugOut-only field
    "multi_roi.per_roi[0].wale.per_inch",
    "multi_roi.per_roi[0].wale_source",
    "multi_roi.per_roi[0].quality_score",
    "multi_roi.per_roi[0].course.confidence",
    "multi_roi.per_roi[0].course.per_inch",
]

# Present only when the loop-lattice experiment actually ran for a region
# (see analyze_loop_lattice_experiment) -- checked separately, and only
# against a response where at least one region's loop_lattice_debug is
# non-null, since a null value there is itself a valid, frontend-guarded
# state (renderLoopLatticeComparison / renderRoiDiagContent both check
# `d`/`!d` before reading any of these). Once EACH FIELD is present, none
# of its own keys are optional -- `columns_considered` specifically is
# the field the "43 of undefined" bug report traced to.
LOOP_LATTICE_DEBUG_CRITICAL_KEYS = [
    "direct_center_count", "row_count", "column_count", "columns_considered",
    "column_support_counts", "lattice_consistency", "wale_spacing_px",
    "wale_per_inch",
]


def test_analyze_multi_response_has_every_field_the_frontend_reads_unguarded(client):
    image_path = os.path.join(FIXTURES_DIR, "knit_sample_08.jpg")
    if not os.path.exists(image_path):
        pytest.skip("knit_sample_08.jpg fixture not present")

    with open(image_path, "rb") as f:
        propose_resp = client.post(
            "/propose-rois",
            files={"file": ("knit_sample_08.jpg", f, "image/jpeg")},
            data={"cal_x1": "0", "cal_y1": "0", "cal_x2": "346", "cal_y2": "0",
                  "known_distance": "1", "unit": "in"},
        )
    assert propose_resp.status_code == 200
    proposal = propose_resp.json()
    rois = proposal["rois"]
    assert rois, "propose-rois found no regions on knit_sample_08.jpg -- can't exercise /analyze-multi without at least one"

    import json as _json
    rois_json = _json.dumps([
        {"label": r["label"], "x": r["x"], "y": r["y"], "width": r["width"], "height": r["height"], "source": "auto"}
        for r in rois
    ])
    with open(image_path, "rb") as f:
        analyze_resp = client.post(
            "/analyze-multi",
            files={"file": ("knit_sample_08.jpg", f, "image/jpeg")},
            data={
                "rois_json": rois_json,
                "cal_x1": "0", "cal_y1": "0", "cal_x2": "346", "cal_y2": "0",
                "known_distance": "1", "unit": "in",
                "orientation": "vertical", "structure": "unknown",
            },
        )
    assert analyze_resp.status_code == 200
    data = analyze_resp.json()
    assert data["success"], data.get("message")

    for path in ANALYZE_MULTI_CRITICAL_PATHS:
        _get(data, path)  # raises with the exact missing segment named

    # loop_lattice_debug: check the top-level one AND every per-region one
    # that isn't null (a null one is a legitimate, frontend-guarded state
    # -- see the constant's own comment above).
    checked_any_lattice = False
    candidates = [data.get("loop_lattice_debug")] + [
        r.get("loop_lattice_debug") for r in data["multi_roi"]["per_roi"]
    ]
    for lattice in candidates:
        if lattice is None:
            continue
        checked_any_lattice = True
        for key in LOOP_LATTICE_DEBUG_CRITICAL_KEYS:
            assert key in lattice, (
                f"loop_lattice_debug is missing '{key}' -- this is exactly the "
                f"shape of the live bug report ('Accepted wale columns: N of "
                f"undefined' traces to a missing 'columns_considered')"
            )
    assert checked_any_lattice, (
        "every loop_lattice_debug in this response was null -- this fixture/ROI "
        "combination is expected to trigger the loop-lattice experiment for at "
        "least one region; if that's no longer true, this test needs a fixture "
        "that does, not a removal of the lattice checks above"
    )
