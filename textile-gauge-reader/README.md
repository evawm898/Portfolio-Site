# AI Textile Gauge Reader — V0

An experimental computer-vision tool for measuring knitted-textile gauge
(wales per inch / courses per inch) from a single photograph.

**V0 uses classical computer vision only** — grayscale conversion, local
contrast normalization (CLAHE), Sobel edge/texture enhancement, 1D signal
projection, autocorrelation, loop-center blob detection, and harmonic
disambiguation. There is no AI/ML model in this version.

## What "gauge" means here (and a real bug this fixed)

A **wale** is a vertical column of complete, intermeshed knit loops;
wales-per-inch is the horizontal center-to-center spacing between
adjacent columns. A **course** is a horizontal row of complete loops;
courses-per-inch is the vertical center-to-center spacing between
adjacent rows. Critically, that spacing has to be measured between
*complete loop repeats* — not between a loop's two legs, one yarn edge
and its own opposite edge, or any other sub-feature of a single loop.

Pure 1D edge/autocorrelation analysis has no notion of "loop" at all —
just "some periodic edge pattern" — so it's structurally vulnerable to
locking onto a harmonic of the true repeat: typically half of it (e.g.
one leg of a face-knit loop's V-shape, which produces its own regular
edge every half-loop) or, less commonly, double it (skipping every
other loop). Relabeling the output ("wales" ↔ "courses") or hard-coding
a multiplier doesn't fix this — it's a difference in what the algorithm
is actually locking onto, and would produce a different, uncorrectable
error on a different photo.

The pipeline (`ALGORITHM_VERSION` `cv-clahe-sobel-autocorr-loopcenter-density-foldpair-v0.4`)
addresses this with a second, independent signal: an approximate 2D
loop-center detector (a Difference-of-Gaussians blob response tuned to
loop scale, since a genuine loop center is a compact, roughly isotropic
highlight, unlike a loop's more elongated, edge-like legs). For each
axis, the coarse autocorrelation period is checked against its 0.5x/1x/2x
harmonics, and whichever one the loop-center evidence actually supports
is used — never an arbitrary multiplier, and only when the loop-center
evidence itself is internally consistent enough to trust (a noisy/
over-detected point cloud is recognized as such and ignored, falling
back to the autocorrelation estimate rather than "correcting" a
plausibly-already-right answer with garbage).

**v0.3 adds a third check**, after a real photo showed the first two
signals could still both be fooled together: the loop-center detector's
*scale* is itself seeded from the coarse autocorrelation period, so on
some real fabric that "independent" evidence isn't fully independent — it
can inherit the exact same too-fine harmonic lock the check was supposed
to catch, and confidently confirm a wrong answer (e.g. reporting twice
the true wale count, each half of a real wale counted as its own). v0.3
cross-checks whole-ROI loop **density**: N detected loop centers spread
across an ROI of area A should occupy roughly `N × (wale_pitch ×
course_pitch)` of that area, one repeat cell per loop — a constraint that
doesn't share the scale-seeding dependency. When the reconciled cell area
doesn't match that, it looks at whether either axis's own already-computed
0.5x/1x/2x candidates contains a value that resolves the mismatch (never a
value that axis's own harmonic analysis hadn't already flagged as
plausible, and never the other axis's candidate set). Every candidate
considered and why the final one was picked — including a density
correction, when one happens — is exposed via the **Detection Details**
panel on the Results screen (see below), along with an optional **Show
loop centers** overlay toggle so you can visually check the detector
against the actual knit structure — success means the overlay lines line
up with real complete loops, not just that the final numbers look
plausible.

**v0.4 adds a fourth check, scoped to the wale axis only**, after a real
jersey photo showed wale count still roughly doubled (~9.55 predicted vs.
~5 actual wales/in) even with v0.3's density check in place. On that
photo the loop-center *detector itself* was apparently finding one blob
per V-shaped loop's **leg**, not one per complete loop — so its scale,
its pitch, and the density it implies were all biased the same
(too-fine) direction together, and cross-checking three mutually-
correlated signals against each other doesn't catch a bias they all
share. v0.4's **fold-consistency** check is decoupled from that whole
loop-center pipeline: it stacks the wale-direction 1D signal into
consecutive chunks at each candidate period and measures how similar
those chunks are to each other. A genuine complete-loop repeat
reproduces nearly the same waveform shape every period (chunks
correlate strongly); a period that instead isolates one leg of a V
alternates between the two, structurally different, legs — so its
chunks correlate poorly, even though plain autocorrelation can show
just as strong a peak there (autocorrelation only measures energy at a
lag, not whether the repeated unit is the same shape each time). A
candidate fold-consistency flags as self-inconsistent is excluded from
ever being selected — including by the v0.3 density check, which could
otherwise "confirm" it right back using loop-center counts that
inherited the same bias. This is deliberately scoped to wale only
(course periodicity doesn't have a V-leg-symmetry failure mode, and this
keeps course detection completely unchanged) and is grounded directly in
loop anatomy — a face-knit V's two legs are the specific structural
feature it's checking for, not a generic signal-processing trick.
Fold-consistency scores per candidate are also exposed in **Detection
Details**, alongside the harmonic relationship and normalized
wales(courses)/in at the current calibration.

This is a heuristic V0.4 improvement, not full loop segmentation, and
it isn't assumed to be "solved" — see
[Ground Truth / Correction System](#ground-truth--correction-system)
for how to build an evaluation set against real photos and decide
whether/how to tune it further.

### Image viewer pan/zoom

The viewer supports panning (drag, or scroll) and zooming (Ctrl+scroll/
pinch, or the +/− buttons, centered on the cursor/viewport). Pan/zoom is
a pure view-layer CSS transform on the image+canvas wrapper — it never
touches the stored ROI, calibration points, or detected positions, which
stay in original-image pixel coordinates throughout, so overlays remain
exactly registered at any pan/zoom level. The pan range is recomputed on
every zoom change, image load, and viewer resize, and is deliberately
generous: exactly enough that any pixel in the image can be panned to
the viewer's center at the current zoom (half the image's current
on-screen size in each direction from its default centered position) —
not just the older, much tighter "nudge the edge past the boundary by a
fixed slack" bound.

## Two deployments of the same idea

This directory (`textile-gauge-reader/`) contains the **backend only**:
the FastAPI/OpenCV/NumPy/SciPy analysis API. It's meant to be deployed
standalone (see [Deploying to Render](#deploying-the-backend-to-render)
below) and has its own bundled frontend under `frontend/` purely for
local full-stack development (`uvicorn backend.main:app`), since
GitHub Pages / Netlify (static hosts) can't run Python.

The **production frontend** lives at the repo root, alongside the rest
of the portfolio site, as a standalone unlisted page:

- `../textile-gauge-reader.html`
- `../textile-gauge-reader.css`
- `../textile-gauge-reader.js`

It's plain HTML/CSS/JS with no build step, deploys with the rest of the
static site, and calls this backend cross-origin once it's deployed
somewhere (Render, etc). The backend URL is the single `CONFIG.API_BASE_URL`
constant at the top of `textile-gauge-reader.js` — see that file's header
comment. Until that's set, the page still loads and works through ROI/
orientation selection; only "Analyze" shows a clear "service not
configured" message instead of crashing or silently failing.

## Workflow

1. **Upload** a JPG/PNG/WEBP photo of a knit textile.
2. **Calibrate scale** — click two points a known distance apart (e.g. a
   ruler in the shot), enter that distance and its unit.
3. **Select measurement area** — drag a rectangle over a clean, flat,
   representative patch of fabric. Handles let you resize it afterward.
4. **Select orientation** — tell it whether wales run vertically or
   horizontally in the photo (V0 does not auto-detect this).
5. **Analyze** — the image, ROI, calibration, and orientation are sent to
   the backend, which runs the CV pipeline and returns spacing/gauge
   estimates with confidence scores.
6. **Results** — wales/inch and courses/inch are shown prominently, along
   with spacing in mm, analyzed area size, and detected wale/course
   positions drawn back over the image. A collapsible **Detection
   Details** panel shows every harmonic period candidate considered per
   axis and why the final one was picked; a **Show loop centers**
   checkbox overlays the detector's approximate 2D loop-center points so
   you can visually check them against the real knit structure.
7. **Verify Measurement** (optional) — enter the true gauge for this
   sample (directly, or via a stitch count over the ROI) to save a
   labeled ground-truth record for later evaluation. See
   [Ground Truth / Correction System](#ground-truth--correction-system).
8. **Reset** — clear everything and analyze another image.

## Architecture

```
textile-gauge-reader/                 (this directory — backend only)
├── analysis/                # Pure computer-vision code — no web/HTTP deps
│   ├── __init__.py
│   └── gauge_analysis.py    # CLAHE → Sobel → projection → autocorrelation → peaks
├── backend/                 # FastAPI app — HTTP/validation only, no CV logic
│   ├── __init__.py
│   ├── main.py              # POST /analyze, GET /health, CORS, upload-size guard
│   ├── corrections_api.py   # POST/GET /corrections, export.csv, export.json
│   ├── image_io.py          # Upload validation & in-memory decoding
│   └── schemas.py           # Pydantic request/response models
├── storage/                 # Ground-truth persistence — no web/HTTP deps
│   ├── __init__.py
│   └── corrections_store.py # SQLite: save/list/export correction records
├── frontend/                # Local-dev-only copy of the UI (same-origin, no CORS needed)
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── tests/
│   ├── test_gauge_analysis.py
│   └── test_corrections_api.py
├── data/                    # Gitignored: corrections.db + opted-in images, created at runtime
└── requirements.txt

../textile-gauge-reader.html   (production frontend — portfolio repo root)
../textile-gauge-reader.css
../textile-gauge-reader.js     (has the CONFIG.API_BASE_URL constant)
```

Key architectural rules this project follows:

- **Analysis is decoupled from the web layer.** `analysis/gauge_analysis.py`
  only imports `cv2`/`numpy`/`scipy` and operates on plain arrays — it has
  no knowledge of FastAPI, uploads, or HTTP.
- **No images are persisted to disk by default.** Uploads are decoded
  directly from the in-memory request bytes (`cv2.imdecode`) and never
  written to the filesystem during analysis. The one exception is opt-in:
  the "Save image for algorithm development" checkbox in Verify
  Measurement, off by default — see
  [Ground Truth / Correction System](#ground-truth--correction-system).
- **Coordinates are tracked in original-image pixel space.** The frontend
  stores calibration points, the ROI, and (after analysis) detected wale
  and course positions all in *natural image* pixel coordinates, and
  converts to on-screen coordinates only at render time. This keeps the
  canvas overlay correctly registered to the image even when the browser
  has scaled it down, and a `ResizeObserver` re-syncs the canvas and
  re-renders on any resize.
- **No fabricated results.** If the analysis pipeline can't find a
  reliable periodic pattern along an axis (too little texture, ROI too
  small, image decode failure, etc.), that axis is returned with
  `spacing_px: null` and `confidence: 0`, plus a human-readable message —
  never a guessed number. If the backend itself is unreachable, the
  frontend shows a clear "analysis service unavailable" message instead
  of failing silently or pretending it worked.

## Running the backend locally

Requires Python 3.10+.

```bash
cd textile-gauge-reader
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

uvicorn backend.main:app --reload --port 8000
```

This serves the local-dev frontend at **http://localhost:8000** (same
origin as the API, so no CORS/config needed) *and* the API itself. To
instead exercise the production frontend against a local backend, open
`../textile-gauge-reader.html` directly in a browser and temporarily set
`CONFIG.API_BASE_URL = "http://localhost:8000"` in `textile-gauge-reader.js`.

### API

`POST /analyze` — multipart form:

| field | type | description |
|---|---|---|
| `file` | file | JPG/PNG/WEBP image, ≤15 MB |
| `roi_x`, `roi_y`, `roi_width`, `roi_height` | float | ROI in original-image pixel coordinates |
| `cal_x1`, `cal_y1`, `cal_x2`, `cal_y2` | float | Two calibration points, original-image pixel coordinates |
| `known_distance` | float | Known physical distance between the two calibration points |
| `unit` | `mm` \| `cm` \| `in` | Unit of `known_distance` |
| `orientation` | `vertical` \| `horizontal` | Direction wales run in the photo |

Returns JSON with `pixels_per_mm`, `wale`/`course` objects (each with
`spacing_px`, `spacing_mm`, `per_inch`, `positions_px`, `confidence`,
`message`, plus the harmonic-disambiguation diagnostics `candidates_px`
and `selected_reason`), `analyzed_area_px`, `analyzed_area_mm`, `roi`,
`algorithm_version`, and `loop_centers_px` (approximate 2D loop-center
points for the debug overlay). Validation failures (bad file type,
oversized upload, degenerate calibration, out-of-bounds ROI) come back
as `success: false` with a clear `message` and an appropriate 4xx
status — never a fabricated result.

`GET /health` — liveness check (used as Render's health check path).
`GET /api/health` — same thing, kept for the local-dev frontend.

`POST /corrections`, `GET /corrections`, `GET /corrections/export.csv`,
`GET /corrections/export.json` — the ground-truth correction system, see
[below](#ground-truth--correction-system).

### Tests

```bash
pip install pytest
pytest tests/
```

## Deploying the backend to Render

The backend is a standard ASGI app with no persistent storage, so it fits
Render's free "Web Service" tier. Images are only ever held in memory for
the duration of a single request.

**Option A — Blueprint (recommended, one click):**

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. In the Render dashboard: **New +** → **Blueprint**.
3. Connect the `evawm898/Portfolio-Site` GitHub repo. Render will detect
   `render.yaml` at the repo root and propose a service named
   `textile-gauge-reader-api`, rooted at `textile-gauge-reader/`.
4. Review and click **Apply**. Render will build and deploy automatically.
5. Once live, copy the service's URL (e.g. `https://textile-gauge-reader-api.onrender.com`).

**Option B — Manual Web Service** (if you'd rather not use the blueprint):

1. Render dashboard → **New +** → **Web Service** → connect the
   `evawm898/Portfolio-Site` GitHub repo.
2. **Root Directory**: `textile-gauge-reader`
3. **Runtime**: Python 3
4. **Build Command**: `pip install -r requirements.txt`
5. **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
6. **Environment variables**:
   - `PYTHON_VERSION` = `3.11.9`
   - `ALLOWED_ORIGINS` = the portfolio site's real origin(s), comma-separated,
     no spaces, no trailing slash — e.g.
     `https://evamaskalenko.com,https://eva-maskalenko.netlify.app`.
     (Leaving this unset defaults to `*`, which works but is wide open —
     fine for an experimental/unlisted page, tighten it once you know the
     final domain.)
7. **Health Check Path**: `/health`
8. **Instance Type**: Free is fine to start.
9. Create the service and wait for the first deploy to finish.

**After it's deployed:**

- Test it directly: `https://<your-service>.onrender.com/health` should
  return `{"status": "ok"}`.
- Open `../textile-gauge-reader.js`, find the `CONFIG` object near the
  top, and set:
  ```js
  const CONFIG = {
    API_BASE_URL: "https://<your-service>.onrender.com",
  };
  ```
  (No trailing slash.) Commit and push that one-line change.
- Reload `textile-gauge-reader.html` on the live portfolio site — the
  service-status indicator near the top should switch to "online", and
  the full Analyze step will work end to end.

**Notes:**

- Render's free tier spins the service down after inactivity; the first
  request after a period of idleness can take 30-60 seconds ("cold
  start"). The frontend's health check and Analyze error handling both
  account for this with a generous timeout and a clear retry message
  rather than treating a slow cold start as a crash.
- Nothing from `/analyze` is written to disk on the server — uploaded
  images exist only as in-memory arrays for the duration of the request.
  The one place anything touches disk is the opt-in ground-truth
  correction system — see
  [Ground Truth / Correction System](#ground-truth--correction-system),
  including the important caveat about Render's ephemeral disk.

## Ground Truth / Correction System

After a prediction, the Results screen has a **Verify Measurement**
section where you can record the true gauge for that sample. This
builds a labeled dataset for evaluating (and later, deliberately —
never automatically) tuning the detection algorithm. It never changes
analysis behavior on its own.

**What you can enter:**
- Actual wales/inch and courses/inch, directly, **or**
- Actual wale/course counts within the ROI — the app converts these to
  per-inch values using the ROI's calibrated physical dimensions
  (auto-filling the fields above; you can still edit them by hand
  afterward).
- Two checkboxes: whether the scale calibration and the wale/course
  orientation were correct for this sample.
- An opt-in "Save image for algorithm development" checkbox, **off by
  default**.

Saving shows an immediate **Predicted → Actual** comparison with signed
percent error for both axes (`(predicted - actual) / actual × 100`).

**What gets stored** (one row per saved correction): a unique sample ID,
an image identifier (filename + size + a SHA-256 hash computed in the
browser — the image itself isn't uploaded unless you opt in), ROI
coordinates and physical dimensions, pixels-per-mm, orientation, every
predicted value (spacing, per-inch, confidence, detected positions for
both axes), your entered/derived actual values, both percent errors,
the calibration/orientation-correct flags, and the algorithm version
(`analysis.gauge_analysis.ALGORITHM_VERSION`) that produced the
prediction — so later analysis can tell which pipeline revision a given
row came from.

### Where it's stored

A SQLite database at `textile-gauge-reader/data/corrections.db`
(created automatically on first use). If you opted into saving an
image, it's written alongside at `textile-gauge-reader/data/images/`.
Both are gitignored — never committed.

**Important if the backend is deployed on Render's free tier: this disk
is ephemeral.** Render wipes local disk on every redeploy (and possibly
on other lifecycle events depending on plan). Anything in `data/` will
be lost the next time you push a change that redeploys the service.
Locally (`uvicorn backend.main:app`), the SQLite file persists normally
on your machine like any other local file.

**Practical mitigation for now:** export the dataset (see below)
periodically, and definitely right before pushing any change that will
trigger a Render redeploy. The real long-term fix, if this needs to
survive redeploys unattended, is a Render persistent disk (paid) or an
external database — out of scope for this pass, which is focused on
collecting the first batch of ground truth.

### Exporting

Two ways to get the data out:

1. **From the page itself** — scroll to the footer of
   `textile-gauge-reader.html`. Once a backend URL is configured, it
   shows "Export CSV" / "Export JSON" links that download everything
   saved so far.
2. **Directly from the API** (useful for scripting/automation):
   ```bash
   curl -O -J https://<your-backend>.onrender.com/corrections/export.csv
   curl -O -J https://<your-backend>.onrender.com/corrections/export.json
   ```
   `GET /corrections` (no `export.` prefix) returns the same data as
   plain JSON without download headers, if you just want to inspect it.

Locally, you can also just open the SQLite file directly:
```bash
sqlite3 textile-gauge-reader/data/corrections.db "select * from corrections;"
```

## Known V0 limitations

- Orientation is user-specified, not auto-detected.
- The CV pipeline assumes reasonably flat, evenly lit, in-focus fabric —
  heavy wrinkling, motion blur, or extreme glare will lower confidence or
  fail to detect a pattern (by design, it reports that rather than
  guessing).
- No AI/ML model is used in V0; this is a placeholder for a future,
  more robust detector.
- The loop-center detector is a heuristic blob response (compact,
  loop-scale brightness maxima), not trained loop segmentation. It can
  still miss loops in poor lighting/focus or on fabrics whose loop heads
  aren't the most locally prominent feature; when its evidence is too
  thin or internally inconsistent to trust, the axis falls back to the
  autocorrelation-only estimate with a message saying so — check
  Detection Details and Show Loop Centers on any result you're not sure
  about, rather than assuming a number without a "corrected" reason is
  automatically right.
- Ground-truth corrections are collected but never applied automatically
  — tuning the algorithm from that data is a deliberate, separate step.
- Correction storage is a single SQLite file with no auth in front of
  the save/export endpoints — fine for a personal experiment on an
  unlisted page, not intended as a public-facing data collection system.
