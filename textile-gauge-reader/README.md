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

The pipeline (originally shipped as `ALGORITHM_VERSION`
`cv-clahe-sobel-autocorr-loopcenter-density-foldpair-v0.4`; see
[cv-v0.3](#cv-v0.3-a-structural-redesign-of-the-scoring-not-another-bolt-on-check)
below for the current version string and the redesign that replaced this
naming scheme) addresses this with a second, independent signal: an approximate 2D
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

## cv-v0.3: a structural redesign of the scoring, not another bolt-on check

The v0.2–v0.4 checks above (density cross-check, fold-consistency) were
each a targeted patch for one specific way the *previous* version got
fooled — and on the next real photo, the wale count was still roughly
double the true value (~9.55 vs. ~5 wales/in), because the underlying
architecture was still fundamentally "trust one autocorrelation estimate
per axis, then try to catch it after the fact." `cv-v0.3` (the algorithm
version string resets to `cv-v0.3` here — it's a new architecture, not a
"v0.5") rebuilds candidate selection around one unified, weighted scoring
system instead of a chain of independent patches:

- **2D periodicity as additional evidence.** Alongside the existing 1D
  autocorrelation (per axis), a single whole-ROI 2D autocorrelation
  (FFT-based Wiener–Khinchin) is computed once and sampled per candidate
  by bilinear interpolation — a genuine full-loop repeat should show up
  as periodicity in *both* the 1D projection and the full 2D structure;
  a sub-loop feature (a yarn leg/edge) is far more likely to show up
  strongly in one but not the other.
- **Multi-patch regional consensus.** Each axis's signal is sliced into
  several overlapping bands, each independently autocorrelated, and the
  per-candidate score rewards agreement with the robust (median-based)
  consensus across those bands — a real repeat should hold up across
  sub-regions of the same fabric; a fluke shouldn't. Wide disagreement
  between bands also feeds an axis-level *instability* penalty (distinct
  from any single candidate's score) that lowers confidence, since it's
  the same signature as spacing drifting across the ROI (mild perspective
  distortion, an uneven surface).
- **Rotation normalization.** Before periodicity analysis, the ROI is
  internally rotated (small bounded-angle search, maximizing combined
  periodicity strength) so wales/courses are closer to vertical/
  horizontal — a few degrees of photo tilt no longer measurably degrades
  the period estimate. This is deliberately used *only* to seed a
  cleaner scalar period — all position/coordinate data (peaks, loop
  centers, the 2D autocorrelation itself) stays in the original,
  unrotated image coordinates, so the overlay never needs (and doesn't
  get) any inverse-rotation mapping.
- **One centralized, weighted scoring config** (`ScoringWeights` in
  `analysis/gauge_analysis.py`) combines all of the above — 1D
  autocorrelation, 2D support, structural (fold-consistency + loop-center
  pitch agreement) evidence, patch consensus, spacing regularity, and
  visible-repeat count — into one `evidence_score` per 0.5x/1x/2x
  candidate, weighted differently depending on the optional **Structure**
  selector (Jersey gives structural/V-shape evidence more weight; the
  default Unknown leans more on periodicity/consensus). No magic numbers
  scattered through the code — every weight and threshold lives in that
  one block.
- **Harmonic-ambiguity penalty, and why it must not decide the winner.**
  A separate penalty term flags when a candidate's raw autocorrelation is
  suspiciously close to a 0.5x/2x relative's — exactly the "P and 2P look
  alike" signature of a half-repeat lock-on — and is subtracted to
  produce a `final_score` used for **confidence**, not for picking the
  winner. This distinction matters: the penalty is symmetric (it reduces
  *both* members of a genuinely ambiguous pair by the same amount, so it
  can never change their relative order), but for a genuinely periodic
  signal, a true period P and its trivial double 2P are *always* going to
  autocorrelate similarly — that's guaranteed by periodicity, not
  ambiguity — so a candidate can rack up a large penalty purely from its
  double, while a completely unrelated, evidence-weak third candidate
  (not part of any ambiguous pair) pays no penalty at all. Selecting by
  post-penalty score let that unrelated weak candidate win by default;
  `cv-v0.3` selects by pre-penalty `evidence_score` instead (the penalty
  still lowers the winner's absolute, confidence-facing `final_score`).
  Both scores are exposed per candidate in **Detection Details**.
- **Explicit "uncertain" results.** When the top two scored candidates
  are within a small margin of each other, the result is flagged
  `status: "uncertain"` with a human-readable reason (e.g. "Competing 0.5x
  harmonic candidate scored nearly as well") — the UI still shows the
  best estimate (visually distinguished, not hidden), rather than always
  presenting a single confident number regardless of how close the call
  actually was.
- **Optional Structure control** (Jersey / Single Knit vs. Unknown,
  default Unknown) reweights structural (loop-center/V-shape) evidence
  higher for Jersey without building a full automatic knit-structure
  classifier — Rib/Interlock/Mesh are deliberately left for a future
  version.

None of this removes the v0.2–v0.4 checks described above — fold-
consistency and the density cross-check are still computed and still
feed into the unified score (as `structural_score`) — it replaces the
"chain of independent patches" architecture around them with one scoring
system that's easier to reason about and extend.

### A real-photo regression, and phase consistency as its fix

The first real photo run through `cv-v0.3` (a hand-knit jersey swatch,
ruler-calibrated, ~5 true wales/in and ~7.2 true courses/in — kept as
`tests/fixtures/real_jersey_sample.jpg`) surfaced two more problems:

1. **Course regressed.** The pre-`cv-v0.3` pipeline got course right on
   this photo (~6.87 c/in); the new evidence scorer picked a doubled
   period (~3.5 c/in) instead, and `_cross_check_density` (which could
   substitute *either* axis's own candidate to resolve a whole-ROI
   density mismatch) made it worse by "fixing" the correct course value
   to compensate for wale's separate, still-unresolved error. Fixed by
   restoring the older, proven per-axis pipeline
   (`_analyze_direction`) as course's actual SELECTION mechanism — the
   v0.3 scorer still runs alongside it purely to supply the rich
   per-candidate diagnostics shown in Detection Details — and by making
   `_cross_check_density` wale-only, so it can never again overwrite a
   correct course pick.
2. **Wale's half-period ambiguity was a scoring problem, not a
   candidate-generation problem.** Diagnostics confirmed the correct
   ~4.75–5 WPI candidate was already being generated every time — it
   just didn't reliably *win* against the ~9.5 WPI half-period harmonic,
   and which one won flipped depending on exact ROI placement/size.
   Every periodicity-strength evidence term (autocorrelation, 2D
   support, patch consensus) is mathematically incapable of telling them
   apart: a periodic half-feature (e.g. one leg of a V-shaped loop) is
   *just as periodic* as the true full-loop repeat.

**Phase consistency** (`_phase_consistency_evidence`) closes that gap:
for a candidate's own generated marker positions, it extracts a narrow
local image patch at each one, standardizes it (so overall
brightness/contrast differences between markers don't matter — only the
texture PATTERN does), and compares them pairwise. A genuine full
repeat's markers should look like each other every time
(`phase_consistency`, the mean adjacent-marker similarity); a
half-period harmonic instead alternates between two visually distinct
phases (e.g. a V's left leg vs. right leg) — caught by comparing
same-parity markers (1↔3, 2↔4, …) against adjacent ones (1↔2, 2↔3, …):
if same-parity markers agree much more than adjacent ones do, that's the
"A B A B" signature of a half-period harmonic
(`alternating_phase_score`).

Unlike the harmonic-ambiguity penalty (which is deliberately excluded
from deciding a winner — see `_harmonic_penalty`'s docstring for why a
symmetric pairwise comparison can't be trusted to), phase consistency
and its alternating-phase penalty ARE part of `evidence_score` and do
get to decide which candidate is selected: each is a genuine,
self-contained, per-candidate structural measurement, not a comparison
between two candidates that's mathematically a wash. `ScoringWeights`
gives phase consistency the largest single weight of any positive
evidence term for this reason (and correspondingly reduced
`patch_consensus`'s weight — real-photo diagnostics showed sub-region
patch agreement isn't as independent as it looks, since each patch runs
its own autocorrelation on the same texture and can inherit the same
half-period bias in every patch at once).

Result on the real photo, tested across 6 differently-placed/sized ~1in²
ROIs: the correct wale candidate now wins in all 6 (up from 3/6 before
phase consistency), and course remains correct in 5/6 (the one failure
is an excessively large whole-fabric-strip ROI — a known, deliberately
out-of-scope-for-now limitation; see Known V0 limitations). Confidence
is not artificially inflated: these results are still often reported as
`uncertain` when the harmonic-ambiguity penalty (a genuine, expected
mathematical property of periodic signals, not a bug) keeps the
absolute margin modest — the UI surfaces that honestly (see the LOW
CONFIDENCE treatment below) rather than presenting a resolved-looking
number.

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
- No automatic perspective correction: `cv-v0.3` detects spacing that
  varies significantly across the ROI (via multi-patch consensus) and
  lowers confidence accordingly, but it does not attempt to actually
  correct for perspective/lens distortion — a future version could warp
  the ROI to a fronto-parallel view before periodicity analysis.
- Course selection (restored to the pre-`cv-v0.3` per-axis pipeline —
  see "A real-photo regression, and phase consistency as its fix" above)
  is tuned for reasonably-sized measurement ROIs, not arbitrarily large
  ones: on the real jersey photo used for regression testing, an
  excessively large whole-fabric-strip ROI still picked a doubled course
  period. Prefer a smaller, representative crop (roughly what the
  ~1in²-ish examples throughout this doc use) over analyzing the entire
  visible fabric at once.
- Wale detection remains genuinely uncertain on some ROI placements even
  with phase-consistency evidence (see above): it's expected, and by
  design, for a result to come back flagged `uncertain`/LOW CONFIDENCE
  rather than a falsely-confident number when the true full repeat and
  its half-period harmonic are still close to a coin flip on a
  particular crop.
- Ground-truth corrections are collected but never applied automatically
  — tuning the algorithm from that data is a deliberate, separate step.
- Correction storage is a single SQLite file with no auth in front of
  the save/export endpoints — fine for a personal experiment on an
  unlisted page, not intended as a public-facing data collection system.
