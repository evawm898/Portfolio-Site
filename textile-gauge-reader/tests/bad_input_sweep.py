"""
Bad-input sweep: what a user sees when the photo, the box or the settings are NOT ideal,
measured end to end through the shipped HTTP API (the app-path scorecard's route and the
same fixtures), with every input generated procedurally.

Why this exists. The October read-only audit ran a bad-input sweep (a ruler in the box,
pins in the box, blur, rotation, stretch, low light...) and its tables were never written
down anywhere that could be re-run: nothing in the repository could reproduce them. This
module is that sweep, kept: `app_path_scorecard.py` answers "what does the app say on the
good photos", this answers "what does it say when the input is bad, and does it say so".

Everything goes through `fastapi.testclient.TestClient(app)` on the real routes, exactly as
`app_path_scorecard.py` does (read its docstring for what a "user" does). Two paths:

  * the AUTO path: /propose-rois, every proposed area accepted, /analyze-multi;
  * the HAND-DRAWN-BOX path: one box the user drew, straight to /analyze-multi (what the
    frontend offers when the proposer finds nothing, and what a user who distrusts the
    proposals does).

Two calibration modes, named as in the app-path scorecard:

  * "truth"  -- a perfect manual calibration of the variant photo (two points exactly
                px_per_inch apart, 1 inch). Measures the analyzer, not the calibration.
  * "ruler"  -- the CURRENT calibration flow: POST /detect-ruler on the photo the user sees;
                its pre-fill if the gate offers one (analysis.gauge_analysis.
                justify_ruler_calibration), otherwise the same perfect manual calibration.

INPUTS. Every input is built from the existing fixtures with no new binary file: `INPUTS`
below lists them, `make_input` builds them. The unmodified photo is uploaded as the
fixture's own bytes (a re-encode is itself a perturbation and moved real cells), a modified
one is re-encoded the way it arrived (JPEG q95 for a photo, PNG for a synthetic). Noise is a
pure-integer hash, never numpy's random stream, so an input is the same on every machine.

  * Hand-drawn boxes are 1.5 in square at the photo's own scale, centred on the fabric
    (`CENTRE`), except `box_small` (0.4 in), `box_ruler`, `box_edge`, `box_pins`.
  * knit_01's box does NOT sit on the photo's red marker yarn: its centre is moved up the
    swatch (`CENTRE["knit_01"]`) and `test_bad_input_sweep.py` asserts no marker pixel is in
    the box. (The first audit's centre box lay on the marker: knit_01 C -48%.)
  * `rot15` rotates the photo 15 degrees and CROPS to the largest axis-aligned rectangle
    inside it. (The audit filled the corners by reflection, which invents stitches.)
  * knit_02's 1.5 in box cannot avoid the tape measure whatever its position (the tape
    spans 40% of the photo's height and the box 68%), so its `box_good` is a ruler-in-box
    row too. Recorded, not hidden.

SCORING (per axis, signed %, truth as in the app-path scorecard; an axis with no truth is
not scored). Every scored axis lands in exactly one class:

  silent         status "confident" and |error| > CONFIDENT_WRONG_PCT (10%)   <- the worst
  loud-wrong     status "uncertain" and |error| > 10%                        (said so, was wrong)
  ok             status "confident" and |error| <= 10%
  uncertain-right  status "uncertain" and |error| <= 10%    (said so, did not need to)
  no-result      no areas proposed, no region measurable, or no number

The CARD is what the page shows (frontend overallConfidence): Confident only when BOTH axes
carry a number and both say confident. CARD-SILENT = the card says Confident and any scored
axis is more than 10% off. A silent axis under an Uncertain card is a cell the card hides
only because the OTHER axis said uncertain.

NON-KNIT images (nothing here is a knit, so any number is wrong): nine procedural images
(printed lines, wood grain, bricks, blinds, gingham, corduroy, noise, flat, checkerboard) and
four photos already in the repository, referenced in place. A non-knit axis that says
"confident" is silent; a card that says Confident is card-silent.

Run directly to print the README tables:

    python tests/bad_input_sweep.py                  # print the sweep and the verify tables
    python tests/bad_input_sweep.py --write-readme   # regenerate the README blocks
    python tests/bad_input_sweep.py --subset         # the CI subset only
"""
from __future__ import annotations

import hashlib
import json
import math
import os
import random
import sys
import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, ".."))

import app_path_scorecard as ap  # noqa: E402

MM_PER_INCH = ap.MM_PER_INCH
UNIT_TO_MM = ap.UNIT_TO_MM
WRONG_PCT = ap.CONFIDENT_WRONG_PCT
MODES = ("truth", "ruler")
REPO_ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))

# --- Per-fixture geometry (fractions of the photo's width / height) -----------------

# Where a hand-drawn box is centred on the fabric. knit_01's centre is the red marker yarn.
CENTRE: Dict[str, Tuple[float, float]] = {"knit_01": (0.5, 0.32)}
DEFAULT_CENTRE = (0.5, 0.5)
# Centre of a ruler / tape in the photo (None: the photo has no ruler).
RULER_AT: Dict[str, Tuple[float, float]] = {
    "jersey": (0.30, 0.84), "teal": (0.55, 0.195), "knit_01": (0.14, 0.5), "knit_02": (0.5, 0.5),
    "knit_05": (0.45, 0.93), "knit_06": (0.5, 0.05), "knit_08": (0.5, 0.84), "knit_09": (0.74, 0.5),
}
# Where the swatch meets something that is not swatch (real photos); the synthetics get one drawn.
EDGE_AT: Dict[str, Tuple[float, float]] = {"knit_01": (0.5, 0.15), "knit_05": (0.07, 0.55), "knit_09": (0.10, 0.5)}
SYNTH_EDGE_AT = (0.55, 0.5)


# --- Deterministic noise ------------------------------------------------------------


def _hash_uniform(shape: Tuple[int, int], seed: int) -> np.ndarray:
    """Uniform [0, 1) per pixel from a 64-bit integer hash: no random stream, same on every machine."""
    h, w = shape
    y = np.arange(h, dtype=np.uint64)[:, None]
    x = np.arange(w, dtype=np.uint64)[None, :]
    with np.errstate(over="ignore"):
        z = y * np.uint64(0x9E3779B97F4A7C15) + x * np.uint64(0xC2B2AE3D27D4EB4F) + np.uint64(seed * 0x165667B1 + 1)
        z ^= z >> np.uint64(33)
        z *= np.uint64(0xFF51AFD7ED558CCD)
        z ^= z >> np.uint64(33)
        z *= np.uint64(0xC4CEB9FE1A85EC53)
        z ^= z >> np.uint64(33)
    return (z >> np.uint64(11)).astype(np.float64) / float(1 << 53)


def _hash_normal(shape: Tuple[int, int], seed: int, sigma: float) -> np.ndarray:
    """Approximately N(0, sigma^2): four hashed uniforms summed (Irwin-Hall, std 0.5774)."""
    s = sum(_hash_uniform(shape, seed * 4 + k) for k in range(4)) - 2.0
    return s * (sigma / 0.5773502691896257)


# --- Input transforms ----------------------------------------------------------------


def add_pins(img: np.ndarray, ppi: float, cx: float, cy: float) -> np.ndarray:
    """Six map pins (red / yellow heads, steel shafts, 0.7 in long) scattered inside a 1.5 in box at (cx, cy)."""
    out = img.copy()
    rnd = random.Random(11)
    r = 1.5 * ppi / 2
    for i in range(6):
        px = int(cx + rnd.uniform(-r * 0.8, r * 0.8))
        py = int(cy + rnd.uniform(-r * 0.8, r * 0.8))
        ang = rnd.uniform(0, 2 * math.pi)
        length = 0.7 * ppi
        x2, y2 = int(px + length * math.cos(ang)), int(py + length * math.sin(ang))
        cv2.line(out, (px, py), (x2, y2), (205, 205, 210), max(2, int(0.02 * ppi)), cv2.LINE_AA)
        cv2.circle(out, (px, py), max(3, int(0.07 * ppi)), (60, 60, 235) if i % 2 else (60, 200, 250), -1, cv2.LINE_AA)
        cv2.circle(out, (px, py), max(1, int(0.02 * ppi)), (250, 250, 250), -1, cv2.LINE_AA)
    return out


def draw_edge(img: np.ndarray) -> np.ndarray:
    """A synthetic fabric has no edge: the right 45% becomes a bluish-grey board (the swatch ends at 55%)."""
    out = img.copy()
    h, w = out.shape[:2]
    bw = int(w * 0.45)
    board = np.empty((h, bw, 3), np.float64)
    for c, base in enumerate((140, 160, 190)):
        board[:, :, c] = base + _hash_normal((h, bw), 3 + c, 3.0)
    out[:, w - bw:] = np.clip(board, 0, 255).astype(np.uint8)
    return out


def inscribed_rect(w: int, h: int, deg: float) -> Tuple[int, int]:
    """Width and height of the largest axis-aligned rectangle inside a w x h rectangle rotated by `deg`."""
    a = math.radians(deg)
    sin_a, cos_a = abs(math.sin(a)), abs(math.cos(a))
    width_is_longer = w >= h
    side_long, side_short = (w, h) if width_is_longer else (h, w)
    if side_short <= 2.0 * sin_a * cos_a * side_long or abs(sin_a - cos_a) < 1e-10:
        x = 0.5 * side_short
        wr, hr = (x / sin_a, x / cos_a) if width_is_longer else (x / cos_a, x / sin_a)
    else:
        cos_2a = cos_a * cos_a - sin_a * sin_a
        wr, hr = (w * cos_a - h * sin_a) / cos_2a, (h * cos_a - w * sin_a) / cos_2a
    return int(wr), int(hr)


def rotate_crop(img: np.ndarray, deg: float) -> np.ndarray:
    """Rotate by `deg` about the centre and CROP to the largest rectangle that holds only photo (no filled corner)."""
    h, w = img.shape[:2]
    m = cv2.getRotationMatrix2D((w / 2.0, h / 2.0), deg, 1.0)
    rot = cv2.warpAffine(img, m, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0))
    cw, ch = inscribed_rect(w, h, deg)
    cw, ch = max(cw - 2, 8), max(ch - 2, 8)  # two pixels in from the exact edge: no interpolated border pixel
    x0, y0 = (w - cw) // 2, (h - ch) // 2
    return rot[y0:y0 + ch, x0:x0 + cw].copy()


def low_light(img: np.ndarray, gain: float) -> np.ndarray:
    """Exposure scaled by `gain` with sensor noise (sigma 3 grey levels) added after the scaling."""
    noise = _hash_normal(img.shape[:2], 5, 3.0)[:, :, None]
    return np.clip(img.astype(np.float64) * gain + noise, 0, 255).astype(np.uint8)


def _square_roi(img: np.ndarray, cx: float, cy: float, side: float) -> dict:
    h, w = img.shape[:2]
    side = int(round(min(side, w, h)))
    x = int(round(min(max(cx - side / 2, 0), w - side)))
    y = int(round(min(max(cy - side / 2, 0), h - side)))
    return {"label": "Manual", "x": x, "y": y, "width": side, "height": side, "source": "manual"}


def _encode(img: np.ndarray, png: bool) -> Tuple[bytes, str, str]:
    if png:
        ok, buf = cv2.imencode(".png", img)
        ctype, fn = "image/png", "x.png"
    else:
        ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 95])
        ctype, fn = "image/jpeg", "x.jpg"
    assert ok, "could not encode a sweep input"
    return buf.tobytes(), ctype, fn


# --- The inputs ------------------------------------------------------------------------


@dataclass(frozen=True)
class Input:
    name: str
    label: str
    needs_ruler: bool = False   # only photos with a ruler (the synthetics are drawn without one)
    needs_edge: bool = False    # only photos with a swatch edge in reach (3 real + the synthetics, drawn)


INPUTS: List[Input] = [
    Input("base", "Baseline: the photo as uploaded, auto path"),
    Input("box_good", "Hand-drawn 1.5 in box on the fabric (the control)"),
    Input("box_ruler", "Hand-drawn box over the ruler", needs_ruler=True),
    Input("box_pins", "Hand-drawn box with six pins in it"),
    Input("box_edge", "Hand-drawn box across the swatch edge", needs_edge=True),
    Input("box_small", "Very small hand-drawn box (0.4 in)"),
    Input("blur2", "Gaussian blur, sigma 2 px"),
    Input("blur4", "Gaussian blur, sigma 4 px"),
    Input("blur4+box", "Blur sigma 4 px, hand-drawn box"),
    Input("rot90_correct", "Rotated 90 degrees, orientation set correctly"),
    Input("rot90_default", "Rotated 90 degrees, orientation left at the default"),
    Input("rot15", "Rotated 15 degrees, cropped (no filled corners)"),
    Input("rot15+box", "Rotated 15 degrees, cropped, hand-drawn box"),
    Input("big4000", "Resampled to a 4000 px long edge"),
    Input("big4000+box", "4000 px long edge, hand-drawn box"),
    Input("lowlight", "Low light: exposure x0.18 plus sensor noise"),
    Input("lowlight+box", "Low light x0.18, hand-drawn box"),
    Input("low30", "Low light: exposure x0.30"),
    Input("low30+box", "Low light x0.30, hand-drawn box"),
    Input("low50", "Low light: exposure x0.50"),
    Input("low50+box", "Low light x0.50, hand-drawn box"),
    Input("stretch13", "Stretched 1.3x horizontally (calibrated along x)"),
]
INPUTS_BY_NAME = {i.name: i for i in INPUTS}

# Boxes whose contents are NOT clean fabric by construction (for the cause labels).
CONTAMINATED_BOXES = ("box_ruler", "box_pins", "box_edge")


@dataclass
class Made:
    data: bytes
    ctype: str
    fn: str
    img: np.ndarray                 # what the user sees (decoded)
    scale: Dict[str, float]         # the TRUE px per inch of each axis in this photo
    typed: Dict[str, float]         # the scale a perfect user's calibration carries for each axis
    roi: Optional[dict]             # the hand-drawn box, or None for the auto path
    orientation: str


def _source(fx: ap.Fixture) -> Tuple[bytes, np.ndarray, bool]:
    fn, data, ctype = ap.upload_for(fx.name)
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    return data, img, ctype == "image/png"


def centre_of(name: str, img: np.ndarray) -> Tuple[float, float]:
    fx_, fy_ = CENTRE.get(name, DEFAULT_CENTRE)
    return fx_ * img.shape[1], fy_ * img.shape[0]


def applies(inp: Input, name: str) -> bool:
    if inp.needs_ruler and name not in RULER_AT:
        return False
    if inp.needs_edge and name not in EDGE_AT and not ap.FIXTURES_BY_NAME[name].source.startswith("synthetic:"):
        return False
    return True


def make_input(name: str, variant: str) -> Optional[Made]:
    inp = INPUTS_BY_NAME[variant.split("@")[0]]
    if not applies(inp, name):
        return None
    fx = ap.FIXTURES_BY_NAME[name]
    raw, img, png = _source(fx)
    synthetic = fx.source.startswith("synthetic:")
    h, w = img.shape[:2]
    pw, pc = fx.px_per_inch_wale, fx.px_per_inch_course
    scale = {"wale": pw, "course": pc}
    typed = {"wale": pw, "course": pc}
    orientation, roi = "vertical", None
    keep_bytes = False  # upload the fixture's own bytes
    v = variant

    if v.endswith("+box"):
        base = make_input(name, v[:-4])
        base.roi = _square_roi(base.img, base.img.shape[1] / 2, base.img.shape[0] / 2, 1.5 * base.scale["wale"])
        return base

    if v == "base":
        keep_bytes = True
    elif v in ("box_good", "box_small"):
        cx, cy = centre_of(name, img)
        roi = _square_roi(img, cx, cy, (1.5 if v == "box_good" else 0.4) * pw)
        keep_bytes = True
    elif v == "box_ruler":
        fxr, fyr = RULER_AT[name]
        roi = _square_roi(img, fxr * w, fyr * h, 1.5 * pw)
        keep_bytes = True
    elif v == "box_edge":
        if synthetic:
            img = draw_edge(img)
            roi = _square_roi(img, SYNTH_EDGE_AT[0] * w, SYNTH_EDGE_AT[1] * h, 1.5 * pw)
        else:
            fxe, fye = EDGE_AT[name]
            roi = _square_roi(img, fxe * w, fye * h, 1.5 * pw)
            keep_bytes = True
    elif v == "box_pins":
        cx, cy = centre_of(name, img)
        img = add_pins(img, pw, cx, cy)
        roi = _square_roi(img, cx, cy, 1.5 * pw)
    elif v in ("blur2", "blur4"):
        img = cv2.GaussianBlur(img, (0, 0), 2.0 if v == "blur2" else 4.0)
    elif v == "blur4+box":
        raise AssertionError("handled above")
    elif v in ("rot90_correct", "rot90_default"):
        img = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
        orientation = "horizontal" if v == "rot90_correct" else "vertical"
    elif v == "rot15":
        img = rotate_crop(img, 15.0)
    elif v == "big4000":
        f = 4000.0 / max(h, w)
        img = cv2.resize(img, None, fx=f, fy=f, interpolation=cv2.INTER_CUBIC if f > 1 else cv2.INTER_AREA)
        scale = {"wale": pw * f, "course": pc * f}
        typed = dict(scale)
        png = False  # a 4000 px photo is a JPEG (a PNG of it is past the 15 MB upload limit)
    elif v in ("lowlight", "low30", "low50"):
        img = low_light(img, {"lowlight": 0.18, "low30": 0.30, "low50": 0.50}[v])
    elif v == "stretch13":
        img = cv2.resize(img, None, fx=1.3, fy=1.0, interpolation=cv2.INTER_CUBIC)
        scale = {"wale": pw * 1.3, "course": pc}
        typed = {"wale": pw * 1.3, "course": pw * 1.3}  # one calibration, laid along the horizontal ruler
    else:
        raise ValueError(variant)

    if keep_bytes:
        data, ctype, fn = raw, ("image/png" if png else "image/jpeg"), ("x.png" if png else "x.jpg")
    else:
        data, ctype, fn = _encode(img, png)
    return Made(data, ctype, fn, img, scale, typed, roi, orientation)


# --- Non-knit images --------------------------------------------------------------------

NK_W, NK_H = 960, 720
NK_PPI = 180.0   # a user with no ruler marks two points they believe are 1 inch apart


def _nk_text() -> np.ndarray:
    im = np.full((NK_H, NK_W, 3), 245, np.uint8)
    for i in range(22):
        cv2.putText(im, f"the quick brown fox jumps over the lazy dog {i}", (20, 30 + i * 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (20, 20, 20), 1, cv2.LINE_AA)
    return im


def _nk_wood() -> np.ndarray:
    y = np.arange(NK_H)[:, None]
    x = np.arange(NK_W)[None, :]
    g = 0.5 + 0.25 * np.sin(y / 5.0 + 3 * np.sin(x / 90.0)) + _hash_normal((NK_H, NK_W), 21, 0.1)
    g = cv2.GaussianBlur(g.astype(np.float32), (0, 0), 1.2)
    return cv2.merge([np.clip(g * c, 0, 255).astype(np.uint8) for c in (120, 170, 220)])


def _nk_brick() -> np.ndarray:
    im = np.full((NK_H, NK_W, 3), (200, 200, 205), np.uint8)
    bh, bw = 36, 90
    rnd = random.Random(1)
    for r in range(NK_H // bh + 1):
        off = (bw // 2) * (r % 2)
        for c in range(-1, NK_W // bw + 2):
            x0, y0 = c * bw + off, r * bh
            cv2.rectangle(im, (x0 + 3, y0 + 3), (x0 + bw - 3, y0 + bh - 3), (60 + rnd.randint(0, 39), 70, 160 + rnd.randint(0, 39)), -1)
    return im


def _nk_blinds() -> np.ndarray:
    im = np.zeros((NK_H, NK_W, 3), np.uint8)
    for r in range(0, NK_H, 24):
        im[r:r + 12] = (230, 230, 230)
        im[r + 12:r + 24] = (120, 120, 120)
    return im


def _nk_gingham() -> np.ndarray:
    y = np.arange(NK_H)[:, None]
    x = np.arange(NK_W)[None, :]
    v = (255 - 90 * ((x // 36) % 2) - 90 * ((y // 36) % 2)).astype(np.uint8)
    return cv2.merge([v, v // 2 + 90, v])


def _nk_corduroy() -> np.ndarray:
    x = np.arange(NK_W)[None, :].repeat(NK_H, 0)
    v = (140 + 60 * np.sin(x / 36.0 * 2 * np.pi) + _hash_normal((NK_H, NK_W), 22, 6.0)).clip(0, 255).astype(np.uint8)
    return cv2.merge([v, (v * 0.8).astype(np.uint8), (v * 0.6).astype(np.uint8)])


def _nk_noise() -> np.ndarray:
    return cv2.merge([(_hash_uniform((NK_H, NK_W), 30 + c) * 255).astype(np.uint8) for c in range(3)])


def _nk_flat() -> np.ndarray:
    return np.full((NK_H, NK_W, 3), 128, np.uint8)


def _nk_checker() -> np.ndarray:
    y = np.arange(NK_H)[:, None]
    x = np.arange(NK_W)[None, :]
    v = ((((x // 30) + (y // 30)) % 2) * 200 + 30).astype(np.uint8)
    return cv2.merge([v, v, v])


NONKNIT_PROCEDURAL = {
    "text_lines": _nk_text, "wood_grain": _nk_wood, "brick_wall": _nk_brick, "window_blinds": _nk_blinds,
    "gingham_woven": _nk_gingham, "corduroy": _nk_corduroy, "random_noise": _nk_noise, "flat_grey": _nk_flat,
    "checkerboard": _nk_checker,
}
# Photos already in the repository (not knits), referenced in place, uploaded as their own bytes.
NONKNIT_REPO = {
    "repo_toile": "assets/thermochromic/toile-896.jpg",
    "repo_pigment_swatches": "assets/thermochromic/pigment-swatches-1472.jpg",
    "repo_daisy_photo": "docs/photo-to-bloom/photos/daisy-inat-26598961.jpg",
    "repo_final_look": "assets/thermochromic/final-look-896.jpg",
}
# Periodic by construction: the images a periodicity detector cannot be expected to refuse.
NONKNIT_PERIODIC = ("text_lines", "wood_grain", "brick_wall", "window_blinds", "gingham_woven", "corduroy",
                    "checkerboard", "repo_pigment_swatches")


def nonknit_names() -> List[str]:
    names = list(NONKNIT_PROCEDURAL)
    names += [n for n, rel in NONKNIT_REPO.items() if os.path.exists(os.path.join(REPO_ROOT, rel))]
    return names


@lru_cache(maxsize=None)
def nonknit_upload(name: str) -> Tuple[bytes, str, str, int, int]:
    if name in NONKNIT_REPO:
        with open(os.path.join(REPO_ROOT, NONKNIT_REPO[name]), "rb") as fh:
            data = fh.read()
        img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
        return data, "image/jpeg", "x.jpg", img.shape[1], img.shape[0]
    img = NONKNIT_PROCEDURAL[name]()
    data, ctype, fn = _encode(img, png=False)
    return data, ctype, fn, img.shape[1], img.shape[0]


# --- The app path -------------------------------------------------------------------------


@lru_cache(maxsize=4096)
def _digest(data: bytes) -> str:
    return hashlib.sha1(data).hexdigest()


class Runner:
    """The shipped routes through one TestClient, with /detect-ruler memoised on the photo's bytes."""

    def __init__(self, client=None):
        if client is None:
            from fastapi.testclient import TestClient
            from backend.main import app
            client = TestClient(app)
        self.client = client
        self._detect: Dict[str, dict] = {}

    def post(self, path: str, data: dict, m_data: bytes, ctype: str, fn: str):
        res = self.client.post(path, files={"file": (fn, m_data, ctype)}, data=data)
        assert res.status_code == 200, f"{path}: HTTP {res.status_code}: {res.text[:200]}"
        return res.json()

    def detect_ruler(self, data: bytes, ctype: str, fn: str) -> dict:
        key = _digest(data)
        if key not in self._detect:
            self._detect[key] = self.post("/detect-ruler", {}, data, ctype, fn)
        return self._detect[key]

    def analyse(self, data: bytes, ctype: str, fn: str, cal: dict, roi: Optional[dict], orientation: str) -> dict:
        """propose-rois (every area accepted) unless a box was drawn, then analyze-multi."""
        out = {"areas": 0, "analyzed": False, "message": "", "propose_message": ""}
        if roi is not None:
            rois = [roi]
        else:
            pb = self.post("/propose-rois", cal, data, ctype, fn)
            out["propose_message"] = pb.get("message", "")
            rois = [{"label": r["label"], "x": r["x"], "y": r["y"], "width": r["width"], "height": r["height"],
                     "source": "auto"} for r in (pb.get("rois") or [])]
        out["areas"] = len(rois)
        if not rois:
            return out
        body = self.post("/analyze-multi", dict(cal, rois_json=json.dumps(rois), orientation=orientation,
                                                structure=ap.STRUCTURE), data, ctype, fn)
        out["analyzed"] = bool(body.get("success"))
        out["message"] = body.get("message", "")
        if out["analyzed"]:
            for axis in ap.AXES:
                a = body[axis]
                out[axis] = {"spacing_px": a.get("spacing_px"), "per_inch": a.get("per_inch"), "status": a.get("status")}
        return out

    def calibration(self, mode: str, m_data: bytes, ctype: str, fn: str, typed_ppi: float) -> Tuple[dict, str, Optional[float]]:
        """(calibration form fields, 'manual' | 'prefill', the pre-fill's scale error is not needed here)."""
        manual = ap.calibration_for_scale(typed_ppi)
        if mode == "truth":
            return manual, "manual", None
        r = self.detect_ruler(m_data, ctype, fn)
        if not r.get("success"):
            return manual, "manual", None
        (x1, y1), (x2, y2) = r["point1_px"], r["point2_px"]
        return ({"cal_x1": x1, "cal_y1": y1, "cal_x2": x2, "cal_y2": y2,
                 "known_distance": r["suggested_distance"], "unit": r["suggested_unit"]}, "prefill", None)


# --- Scoring ------------------------------------------------------------------------------

CLASSES = ("silent", "loud-wrong", "ok", "uncertain-right", "no-result")


def _err(pred: Optional[float], true: Optional[float]) -> Optional[float]:
    return ap._err(pred, true)


def score_cell(fx: ap.Fixture, axis: str, run: dict, made: Made, source: str) -> Optional[dict]:
    """One axis of one run: signed error and class, or None when the fixture has no truth on this axis."""
    true = fx.true_wpi if axis == "wale" else fx.true_cpi
    alt = fx.alt_wpi if axis == "wale" else fx.alt_cpi
    if true is None:
        return None
    cell = {"true": true, "predicted": None, "error": None, "status": None, "cls": "no-result"}
    if not run.get("analyzed"):
        return cell
    a = run[axis]
    cell["status"] = a["status"]
    pred = a["per_inch"]
    if source == "manual" and a["spacing_px"]:
        pred = made.typed[axis] / a["spacing_px"]
    cell["predicted"] = pred
    e = _err(pred, true)
    ea = _err(pred, alt)
    if e is not None and ea is not None and abs(ea) < abs(e):
        e = ea
    cell["error"] = e
    if e is None:
        return cell
    confident = a["status"] == "confident"
    wrong = abs(e) > WRONG_PCT
    cell["cls"] = ("silent" if wrong else "ok") if confident else ("loud-wrong" if wrong else "uncertain-right")
    return cell


def card_is_confident(run: dict) -> bool:
    """The page's overallConfidence: Confident only when both axes carry a number and both say confident."""
    if not run.get("analyzed"):
        return False
    return all(run[a]["spacing_px"] is not None and run[a]["status"] == "confident" for a in ap.AXES)


# --- The sweep ------------------------------------------------------------------------------

# The CI subset: the inputs and fixtures whose cells carry the pinned failure modes and the controls,
# chosen so that every cause label below still has a witness (the subset test asserts it).
SUBSET_INPUTS = ("base", "box_good", "box_small", "box_ruler", "box_pins", "blur4", "blur4+box", "rot90_default",
                 "rot15", "stretch13", "lowlight", "lowlight+box")
SUBSET_FIXTURES = ("jersey", "teal", "knit_01", "knit_06", "knit_08", "knit_09", "synth_jersey", "synth_rib")
SUBSET_NONKNIT = ("text_lines", "wood_grain", "brick_wall", "gingham_woven", "corduroy", "random_noise", "flat_grey",
                  "repo_daisy_photo")


def build_sweep(runner: Optional[Runner] = None, subset: bool = False, only_inputs: Optional[Tuple[str, ...]] = None,
                with_nonknit: bool = True) -> dict:
    """Every input x fixture x calibration mode through the app path.

    Returns {
      "runs":   {(mode, fixture, input): run dict + {"source": "manual"|"prefill", "card_confident": bool,
                  "seconds": float}},
      "cells":  {(mode, fixture, input, axis): {"true", "predicted", "error", "status", "cls"}},
      "nonknit": {(mode, image, path): {"areas", "analyzed", "wale", "course", "source"}},
      "seconds": float, "subset": bool,
    }"""
    t_all = time.time()
    runner = runner or Runner()
    inputs = [i for i in INPUTS if (not subset or i.name in SUBSET_INPUTS) and (only_inputs is None or i.name in only_inputs)]
    fixtures = [f for f in ap.FIXTURES if (not subset or f.name in SUBSET_FIXTURES)]
    runs, cells = {}, {}
    for fx in fixtures:
        for inp in inputs:
            made = make_input(fx.name, inp.name)
            if made is None:
                continue
            truth_run = None
            for mode in MODES:
                t0 = time.time()
                cal, source, _ = runner.calibration(mode, made.data, made.ctype, made.fn, made.typed["wale"])
                if mode == "ruler" and source == "manual":
                    run = dict(truth_run)  # the same request as "truth": the identical, deterministic run
                else:
                    run = runner.analyse(made.data, made.ctype, made.fn, cal, made.roi, made.orientation)
                run["source"] = source
                run["card_confident"] = card_is_confident(run)
                run["seconds"] = time.time() - t0
                if mode == "truth":
                    truth_run = run
                runs[(mode, fx.name, inp.name)] = run
                for axis in ap.AXES:
                    c = score_cell(fx, axis, run, made, source)
                    if c is not None:
                        cells[(mode, fx.name, inp.name, axis)] = c
    nonknit = build_nonknit(runner, subset) if with_nonknit else {}
    return {"runs": runs, "cells": cells, "nonknit": nonknit, "seconds": time.time() - t_all, "subset": subset}


def build_nonknit(runner: Runner, subset: bool = False) -> dict:
    out = {}
    for name in nonknit_names():
        if subset and name not in SUBSET_NONKNIT:
            continue
        data, ctype, fn, w, h = nonknit_upload(name)
        for mode in MODES:
            cal, source, _ = runner.calibration(mode, data, ctype, fn, NK_PPI)
            for path in ("auto", "box"):
                roi = _square_roi(np.zeros((h, w, 1), np.uint8), w / 2, h / 2, 1.5 * NK_PPI) if path == "box" else None
                run = runner.analyse(data, ctype, fn, cal, roi, "vertical")
                run["source"] = source
                run["card_confident"] = card_is_confident(run)
                out[(mode, name, path)] = run
    return out


# --- Metrics ----------------------------------------------------------------------------------


def silent_cells(sweep: dict, mode: str) -> List[tuple]:
    return sorted(k for k, c in sweep["cells"].items() if k[0] == mode and c["cls"] == "silent")


def card_silent_runs(sweep: dict, mode: str) -> List[tuple]:
    """Runs whose card says Confident while some scored axis is more than 10% off."""
    out = []
    for (m, name, inp), run in sweep["runs"].items():
        if m != mode or not run["card_confident"]:
            continue
        errs = [sweep["cells"][(m, name, inp, a)]["error"] for a in ap.AXES if (m, name, inp, a) in sweep["cells"]]
        if any(e is not None and abs(e) > WRONG_PCT for e in errs):
            out.append((m, name, inp))
    return sorted(out)


def nonknit_confident_axes(sweep: dict, mode: str) -> List[tuple]:
    out = []
    for (m, name, path), run in sweep["nonknit"].items():
        if m != mode or not run.get("analyzed"):
            continue
        for axis in ap.AXES:
            if run[axis]["spacing_px"] is not None and run[axis]["status"] == "confident":
                out.append((m, name, path, axis))
    return sorted(out)


def nonknit_card_confident(sweep: dict, mode: str) -> List[tuple]:
    return sorted((m, n, p) for (m, n, p), r in sweep["nonknit"].items() if m == mode and r["card_confident"])


def metrics_by_input(sweep: dict, mode: str) -> Dict[str, dict]:
    """{input: {"n": scored axes, class counts..., "card_silent": runs, "cards_confident": runs, "runs": n}}"""
    out = {}
    names = [i.name for i in INPUTS if any(k[0] == mode and k[2] == i.name for k in sweep["runs"])]
    csilent = set(card_silent_runs(sweep, mode))
    for inp in names:
        row = {c: 0 for c in CLASSES}
        row.update({"n": 0, "card_silent": 0, "cards_confident": 0, "runs": 0})
        for (m, name, i), run in sweep["runs"].items():
            if m != mode or i != inp:
                continue
            row["runs"] += 1
            row["cards_confident"] += int(run["card_confident"])
            row["card_silent"] += int((m, name, i) in csilent)
            for axis in ap.AXES:
                c = sweep["cells"].get((m, name, i, axis))
                if c is not None:
                    row["n"] += 1
                    row[c["cls"]] += 1
        out[inp] = row
    return out


def totals(by_input: Dict[str, dict]) -> dict:
    t = {c: 0 for c in CLASSES}
    t.update({"n": 0, "card_silent": 0, "cards_confident": 0, "runs": 0})
    for row in by_input.values():
        for k in t:
            t[k] += row[k]
    return t


def nonknit_metrics(sweep: dict, mode: str) -> dict:
    runs = [(k, r) for k, r in sweep["nonknit"].items() if k[0] == mode]
    axes = nonknit_confident_axes(sweep, mode)
    return {
        "runs": len(runs),
        "no_result": sum(1 for _, r in runs if not r.get("analyzed")),
        "confident_axes": len(axes),
        "card_confident": len(nonknit_card_confident(sweep, mode)),
        "uncertain_numbers": sum(1 for _, r in runs if r.get("analyzed") and not r["card_confident"]),
        "periodic_confident_axes": sum(1 for a in axes if a[1] in NONKNIT_PERIODIC),
    }


# --- Cause labels (the pins are labelled by these; the next PR targets the COURSE ones) -----------

# A cause label is "<AXIS> | <reason>". Every COURSE cell says so in its label: the course axis is where
# the confident-and-wrong readings are (39 of 42 in the first audit re-run), and it is the next PR's target.
REASON_SMALL_BOX = "small hand-drawn box"
REASON_CONTAMINATED_BOX = "contaminated hand-drawn box (ruler / pins / swatch edge)"
REASON_DEGRADED_BOX = "hand-drawn box on a degraded photo (low light / 4000 px)"
REASON_ORIENTATION = "orientation left at the default on a rotated photo"
REASON_STRETCH = "stretched photo (one calibration cannot serve both axes)"
REASON_ROT15 = "rotated 15 degrees"
REASON_BLUR = "blur flicker (status flips to confident under blur)"
REASON_PERIODIC = "periodic non-knit image"
REASON_APERIODIC = "aperiodic non-knit image read as a gauge"
REASONS = (REASON_SMALL_BOX, REASON_CONTAMINATED_BOX, REASON_DEGRADED_BOX, REASON_ORIENTATION, REASON_STRETCH,
           REASON_ROT15, REASON_BLUR, REASON_PERIODIC, REASON_APERIODIC)


def _reason_for(inp: str) -> str:
    if inp == "rot90_default":
        return REASON_ORIENTATION
    if inp == "stretch13":
        return REASON_STRETCH
    if inp.startswith("rot15"):
        return REASON_ROT15
    if inp.startswith("blur"):
        return REASON_BLUR
    if inp == "box_small":
        return REASON_SMALL_BOX
    if inp in CONTAMINATED_BOXES:
        return REASON_CONTAMINATED_BOX
    if inp.endswith("+box") or inp == "box_good":
        return REASON_DEGRADED_BOX
    raise KeyError(f"no cause label for input {inp}")


def cause_for(inp: str, axis: str) -> str:
    """The cause label of a silent cell of the sweep: '<AXIS> | <reason>'. Every cell must map to one."""
    return f"{axis.upper()} | {_reason_for(inp)}"


def nonknit_cause(name: str, axis: str) -> str:
    """Cause label of a confident non-knit axis: a periodic image (regular by construction) or an aperiodic one."""
    return f"{axis.upper()} | {REASON_PERIODIC if name in NONKNIT_PERIODIC else REASON_APERIODIC}"


# --- Tables ----------------------------------------------------------------------------------


def _label(inp: str) -> str:
    return INPUTS_BY_NAME[inp].label


def format_sweep_table(sweep: dict, mode: str) -> str:
    by = metrics_by_input(sweep, mode)
    lines = ["| input | axes | **silent** (confident, >10% off) | **card-silent** | no result | uncertain but right | loud-wrong | ok |",
             "|---|---|---|---|---|---|---|---|"]
    for inp, r in by.items():
        lines.append(f"| `{inp}` {_label(inp)} | {r['n']} | {r['silent']} | {r['card_silent']} | {r['no-result']} | "
                     f"{r['uncertain-right']} | {r['loud-wrong']} | {r['ok']} |")
    t = totals(by)
    lines.append(f"| **total** | {t['n']} | **{t['silent']}** | **{t['card_silent']}** | **{t['no-result']}** | "
                 f"**{t['uncertain-right']}** | {t['loud-wrong']} | {t['ok']} |")
    return "\n".join(lines)


def format_nonknit_table(sweep: dict) -> str:
    lines = ["| calibration | runs | no result | numbers, card Uncertain | **confident axes** | **card Confident** | of which on a periodic image |",
             "|---|---|---|---|---|---|---|"]
    for mode in MODES:
        m = nonknit_metrics(sweep, mode)
        lines.append(f"| {mode} | {m['runs']} | {m['no_result']} | {m['uncertain_numbers']} | **{m['confident_axes']}** | "
                     f"**{m['card_confident']}** | {m['periodic_confident_axes']} |")
    return "\n".join(lines)


def format_headline(sweep: dict) -> str:
    out = []
    for mode in MODES:
        t = totals(metrics_by_input(sweep, mode))
        out.append(f"- **{mode}** calibration: **{t['silent']}** confident-and-wrong axes and **{t['card_silent']}** "
                   f"card-silent runs of {t['n']} scored axes in {t['runs']} runs; {t['no-result']} no-result axes; "
                   f"{t['uncertain-right']} uncertain-but-right axes")
    return "\n".join(out)


def format_all(sweep: dict, verify: Optional[dict] = None) -> str:
    import verify_simulation as vs
    parts = [
        "**Headline** (per-axis `silent` = status `confident` and |error| > 10%; `card-silent` = the card says "
        "Confident and some scored axis is more than 10% off; `uncertain but right` = said uncertain, was within 10%)\n\n"
        + format_headline(sweep),
        "**(a) Current calibration flow** (`ruler`: the pre-fill if the gate offers one, else a perfect manual calibration)\n\n"
        + format_sweep_table(sweep, "ruler"),
        "**(b) Perfect manual calibration** (`truth`: isolates the analyzer from the calibration)\n\n"
        + format_sweep_table(sweep, "truth"),
        "**(c) Non-knit images** (any number is wrong; a confident axis is silent, a Confident card is card-silent)\n\n"
        + format_nonknit_table(sweep),
    ]
    if verify is not None:
        parts.append("**(d) Verify by counting a repeat**, driven through `/count-repeats` the way the page drives it "
                     "(whole photo as the search area, one dragged box, three anchor positions)\n\n"
                     + vs.format_verify_table(verify))
    return "\n\n".join(parts)


SWEEP_BEGIN = "<!-- bad-input-sweep:begin (generated by `python tests/bad_input_sweep.py --write-readme`; do not edit by hand) -->"
SWEEP_END = "<!-- bad-input-sweep:end -->"


def readme_block(sweep: dict, verify: dict) -> str:
    return f"{SWEEP_BEGIN}\n{format_all(sweep, verify)}\n{SWEEP_END}"


def write_readme(sweep: dict, verify: dict, path: Optional[str] = None) -> bool:
    path = path or os.path.join(HERE, "..", "README.md")
    with open(path, encoding="utf-8") as fh:
        text = fh.read()
    i, k = text.index(SWEEP_BEGIN), text.index(SWEEP_END) + len(SWEEP_END)
    new = text[:i] + readme_block(sweep, verify) + text[k:]
    if new != text:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(new)
    return new != text


def _strkeys(o):
    if isinstance(o, dict):
        return {str(k): _strkeys(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_strkeys(v) for v in o]
    return o


if __name__ == "__main__":
    import verify_simulation as vs
    subset = "--subset" in sys.argv
    sw = build_sweep(subset=subset)
    ve = vs.run_verify(subset=subset)
    if "--json" in sys.argv:
        print(json.dumps(_strkeys({"sweep": sw, "verify": ve}), indent=1, sort_keys=True, default=str))
    elif "--write-readme" in sys.argv:
        if subset:
            sys.exit("--write-readme needs the full sweep (drop --subset)")
        print("README updated" if write_readme(sw, ve) else "README already current")
    else:
        print(format_all(sw, ve))
        print(f"\n(sweep {sw['seconds']:.0f} s, verify {ve['seconds']:.0f} s)")
