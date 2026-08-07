# AI Textile Gauge Reader — V0

An experimental computer-vision tool for measuring knitted-textile gauge
(wales per inch / courses per inch) from a single photograph.

**V0 uses classical computer vision only** — grayscale conversion, local
contrast normalization (CLAHE), Sobel edge/texture enhancement, 1D signal
projection, autocorrelation, and peak detection. There is no AI/ML model
in this version.

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
   positions drawn back over the image.

## Architecture

```
textile-gauge-reader/
├── analysis/                # Pure computer-vision code — no web/HTTP deps
│   ├── __init__.py
│   └── gauge_analysis.py    # CLAHE → Sobel → projection → autocorrelation → peaks
├── backend/                 # FastAPI app — HTTP/validation only, no CV logic
│   ├── __init__.py
│   ├── main.py              # Serves the frontend + POST /analyze
│   ├── image_io.py          # Upload validation & in-memory decoding
│   └── schemas.py           # Pydantic request/response models
├── frontend/                 # Vanilla HTML/CSS/JS, no build step
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── tests/
│   └── test_gauge_analysis.py
├── requirements.txt
└── README.md
```

Key architectural rules this project follows:

- **Analysis is decoupled from the web layer.** `analysis/gauge_analysis.py`
  only imports `cv2`/`numpy`/`scipy` and operates on plain arrays — it has
  no knowledge of FastAPI, uploads, or HTTP.
- **No images are persisted to disk.** Uploads are decoded directly from
  the in-memory request bytes (`cv2.imdecode`) and never written to the
  filesystem.
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
  never a guessed number.

## Running locally

Requires Python 3.10+.

```bash
cd textile-gauge-reader
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

uvicorn backend.main:app --reload --port 8000
```

Then open **http://localhost:8000** in a browser. The same FastAPI app
serves both the static frontend and the `/analyze` API — no separate
frontend server or build step is required.

### API

`POST /analyze` — multipart form:

| field | type | description |
|---|---|---|
| `file` | file | JPG/PNG/WEBP image |
| `roi_x`, `roi_y`, `roi_width`, `roi_height` | float | ROI in original-image pixel coordinates |
| `cal_x1`, `cal_y1`, `cal_x2`, `cal_y2` | float | Two calibration points, original-image pixel coordinates |
| `known_distance` | float | Known physical distance between the two calibration points |
| `unit` | `mm` \| `cm` \| `in` | Unit of `known_distance` |
| `orientation` | `vertical` \| `horizontal` | Direction wales run in the photo |

Returns JSON with `pixels_per_mm`, `wale`/`course` objects (each with
`spacing_px`, `spacing_mm`, `per_inch`, `positions_px`, `confidence`,
`message`), `analyzed_area_px`, `analyzed_area_mm`, and `roi`.

`GET /api/health` — simple liveness check.

### Tests

```bash
pip install pytest
pytest tests/
```

## Known V0 limitations

- Orientation is user-specified, not auto-detected.
- The CV pipeline assumes reasonably flat, evenly lit, in-focus fabric —
  heavy wrinkling, motion blur, or extreme glare will lower confidence or
  fail to detect a pattern (by design, it reports that rather than
  guessing).
- No AI/ML model is used in V0; this is a placeholder for a future,
  more robust detector.
