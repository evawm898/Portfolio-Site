"""
Regression test for a real live-site bug: "Mark one repeat" failed with
"Counting repeats failed (HTTP 405)" on both axes, on the deploy preview
-- and, per the report, had apparently never worked in production.

Root-caused directly: in this app, ANY request to a path with no
matching route falls through to the catch-all
`app.mount("/", StaticFiles(...))` registered at the bottom of
backend/main.py (local dev only, serves the frontend) -- and Starlette's
StaticFiles only accepts GET/HEAD, so it answers anything else with
exactly 405 Method Not Allowed for ANY unmatched path (confirmed
directly: `curl -X POST /any-nonexistent-path` on this exact app returns
405, not 404, while GET correctly 404s -- see
test_post_to_an_unmatched_path_returns_405_not_404_on_this_app below,
which pins that mechanism). That is the precise signature the live bug
report showed.

Reproducing the real /count-repeats request shape (same method, same
path, same multipart field names the frontend actually sends) against
THIS repo's current backend code returns 200 with real match counts --
see test_count_repeats_api.py's own success test, and this session's own
verification (an actual headless-browser fetch() from the served page,
plus a direct HTTP client run, both against a locally-running instance
of this exact code, both returned real matches, not just a 200). So the
route itself is correctly registered and functionally correct in the
code this repo ships -- the 405 on the live site points at the deployed
backend running different (older, or a broken build's) code than this
repository's current `main`, not a bug reachable by fixing anything
here. See README.md's "Why the health banner can lie" section, which
reached the same conclusion independently for a different pair of
symptoms (a frontend crash and a "43 of undefined" display, both traced
to fields missing from an apparently-stale live response).

What IS a code-level regression this repo's tests can catch, and what
this file adds: every (METHOD, path) pair the frontend actually calls
must dispatch to a REAL route, not fall through to the static-file
catch-all -- checked structurally (a minimal/empty request, checking the
status ISN'T 404/405) rather than via a full valid round trip (already
covered per-endpoint by each endpoint's own test file). This is the
generalized version of "would this specific 405 have been caught" -- it
covers every current frontend->backend call, and any new one added later
that forgets to update the list below.
"""
from fastapi.testclient import TestClient

from backend.main import app

# One entry per fetch() call (or browser-navigated href) in
# textile-gauge-reader.js (root production copy; textile-gauge-reader/
# frontend/textile-gauge-reader.js is a required byte-for-byte mirror
# apart from CONFIG.API_BASE_URL -- see that file's own header comment
# -- so it is not re-audited separately here). Method + path exactly as
# constructed by the frontend: `${CONFIG.API_BASE_URL}${path}`, method
# per that fetch() call's own `method:` option (a bare
# `fetch(url, {signal})` with no method is a GET). Keep this list in
# sync when adding a new frontend API call -- that's the maintenance
# cost this test is designed to make cheap and obvious to pay, not
# something to work around.
FRONTEND_API_CALLS = [
    ("GET", "/health"),  # pingHealthOnce
    ("POST", "/detect-ruler"),  # detectRulerCalibration
    ("POST", "/corrections"),  # both correction-save handlers (grid box + full verify panel)
    ("POST", "/propose-rois"),  # proposeMeasurementAreas
    ("POST", "/analyze-multi"),  # the main Analyze button
    ("POST", "/count-repeats"),  # fetchRepeatCount -- the exact route this bug is about
    ("GET", "/corrections/export.csv"),  # exportCsvLink.href, browser-navigated
    ("GET", "/corrections/export.json"),  # exportJsonLink.href, browser-navigated
]


def test_every_frontend_api_call_dispatches_to_a_real_route():
    """
    A minimal/empty request to each path+method: 404 means no route
    matches the path at all; 405 means a route matched the PATH but not
    this method -- on this app, that's specifically the static-files
    catch-all answering for an unmatched API path (see this file's
    header comment), exactly what the live /count-repeats bug looked
    like from the outside. Anything else (200, 400, 422, ...) means
    Starlette dispatched to the real, intended route -- validating the
    actual request/response behavior with a correct payload is each
    endpoint's own test file's job, not this one's.
    """
    client = TestClient(app)
    bad = []
    for method, path in FRONTEND_API_CALLS:
        resp = client.request(method, path)
        if resp.status_code in (404, 405):
            bad.append(f"{method} {path} -> HTTP {resp.status_code}")

    assert not bad, (
        "These frontend API calls don't dispatch to a real backend route -- "
        f"same failure shape as the live /count-repeats 405: {bad}"
    )


def test_the_check_above_actually_discriminates_a_real_route_from_a_wrong_one():
    """Negative control: proves the check above can actually fail, rather
    than passing regardless of what's in FRONTEND_API_CALLS."""
    client = TestClient(app)
    assert client.request("POST", "/health").status_code == 405  # wrong method, real path
    assert client.request("GET", "/this-route-does-not-exist").status_code == 404  # wrong path


def test_post_to_an_unmatched_path_returns_405_not_404_on_this_app():
    """
    Documents (and pins) the exact mechanism the live bug's 405 came
    from: this app always has a catch-all StaticFiles mount at "/" for
    local dev (see backend/main.py's own comment on it), and Starlette's
    StaticFiles answers a non-GET/HEAD request with 405 for ANY path it
    catches, matched-to-a-real-file or not -- so "405 Method Not
    Allowed" on a path that LOOKS like a real API route is exactly what
    "this route doesn't exist on whatever's actually deployed" looks
    like from the outside, not a hint pointing at CORS or a
    request-shape bug.
    """
    client = TestClient(app)
    get_resp = client.get("/this-route-does-not-exist-either")
    post_resp = client.post("/this-route-does-not-exist-either")
    assert get_resp.status_code == 404
    assert post_resp.status_code == 405
