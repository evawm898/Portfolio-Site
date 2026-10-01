"""
Synthetic knit-fabric generator with EXACT known gauge, for testing the
measurement pipeline against ground truth it can never see.

Lives in tests/ deliberately: this project's standing rule is that ground
truth only ever evaluates the algorithm, never feeds into it — nothing in
analysis/ may import from here.

Why stitch primitives instead of the sinusoid textures older test files
use (make_synthetic_knit and friends): a sinusoid has exactly one period
per axis, so it structurally CANNOT reproduce the failure mode that has
mattered most in this project — the leg-to-leg half-period harmonic,
where a real knit V contributes two ridges per wale and periodicity-based
detection locks onto the leg spacing instead of the loop spacing. Here a
jersey stitch is rendered as an actual two-legged V, so the half-period
harmonic genuinely exists in the image, and surviving it is part of what
a passing test demonstrates.

Structures:
  - "jersey":  aligned columns of V loops (stockinette face). Both axes
               have a single unambiguous ground-truth pitch.
  - "rib1x1":  alternating knit / purl columns; purl columns are rendered
               darker and recessed, as they photograph. The dominant
               VISIBLE wale period is the knit-to-knit repeat (2 wale
               pitches) — whether "wales/inch" should count hidden purl
               wales is a labeling decision, not a detection bug, so
               expected_periods() reports both and callers score against
               either (recording which one matched).
  - "garter":  alternating ridge / plain rows. Same ambiguity on the
               course axis (row pitch vs. ridge-pair pitch), reported the
               same dual way.

Degradations are independent and composable, applied in physical order —
fabric (yarn fuzz) -> scene geometry (in-plane rotation) -> scene
contents (ruler / pins / fabric edge) -> camera geometry (perspective)
-> illumination (lighting gradient) -> optics (blur) -> compression
(JPEG round-trip). Every degradation defaults OFF, and the ones added
after the original four (rotation, fuzz, the three overlays) draw no
numbers from the fabric's random stream, so a spec that leaves them off
renders byte-identical to the renderer before they existed. One honesty note on perspective:
under a homography the true pitch varies across the image, so ground
truth is only exact at the ROI centre; keep warp_amount small (<= 0.03)
and score a centred ROI, or widen tolerance for warped cases, rather than
pretending the label is still exact everywhere.

In-plane rotation honesty note: a lattice rotated by theta is still a
lattice of the same pitch, but the detector projects onto the IMAGE axes,
and a scan along x crosses wale columns tilted by theta at pitch /
cos(theta) (likewise courses along y). expected_periods() reports that
projected value, which is what the detector is asked to measure; the
difference from the true pitch is 0.1% at 3 deg, 0.8% at 7 deg and 2.2%
at 12 deg, so it is reported rather than hidden.

Contamination overlays are things a real gauge photo has IN the frame,
placed (by default) inside the centred scoring ROI on purpose: a ruler
band with a known tick period (and a major tick every RULER_MAJOR_EVERY),
sewing pins (a round head plus a shaft), and the fabric's own edge with
flat tabletop beyond it. They are drawn with their own random stream.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, replace
from typing import Dict, Optional, Tuple

import cv2
import numpy as np

BACKGROUND_LEVEL = 60.0   # shadow between loops
FIBER_NOISE_STD = 7.0     # always-on sensor/fiber noise, so even "clean" isn't laboratory-perfect

# Yarn fuzz: a soft halo around every stitch, sigma as a fraction of the
# smaller pitch, scaled by FUZZ_GAIN and taken as a MAX with the yarn so it fills the shadow BETWEEN
# legs (which is what mohair/brushed yarn does) rather than just blurring.
FUZZ_SIGMA_FRACTION = 0.18
FUZZ_GAIN = 1.0

# Contamination overlays.
RULER_BODY_LEVEL = 228
RULER_TICK_LEVEL = 25
RULER_MAJOR_EVERY = 5          # one major tick per this many ticks (metric-ruler-like: 0.2 major fraction)
RULER_MINOR_REACH = 0.30       # tick length as a fraction of band height
RULER_MAJOR_REACH = 0.80       # 2.67x the minor reach: above RULER_MAJOR_TICK_LENGTH_RATIO's 2.0
PIN_HEAD_RADIUS_PX = 7
PIN_SHAFT_LENGTH_PX = 60
PIN_LEVEL = 236
TABLE_LEVEL = 32.0             # flat surface beyond the fabric edge
OVERLAY_STREAM = 0x0C0E        # key for the overlays' own random stream


@dataclass(frozen=True)
class FabricSpec:
    """One synthetic fabric photo: structure + exact gauge + degradations."""

    structure: str                      # "jersey" | "rib1x1" | "garter"
    wales_per_inch: float
    courses_per_inch: float
    px_per_inch: float = 180.0
    width_px: int = 640
    height_px: int = 480
    seed: int = 7

    # Degradations (defaults = clean).
    warp_amount: float = 0.0            # corner displacement, fraction of min(h, w)
    lighting_strength: float = 0.0      # multiplicative ramp, factor spans [1-s, 1+s]
    blur_sigma: float = 0.0             # Gaussian blur sigma, px
    jpeg_quality: Optional[int] = None  # JPEG round-trip quality (None = lossless)

    # Optional harmonic trap: a fine diagonal "ply twist" texture at this
    # period (px). 0 disables. Exists to reproduce, on demand, the exact
    # sub-loop periodicity that has fooled the detector on real photos.
    ply_period_px: float = 0.0

    # In-plane rotation of the whole fabric, degrees (counter-clockwise).
    rotation_deg: float = 0.0
    # Yarn fuzz strength: 0 = crisp yarn, 1 = a full halo per stitch.
    fuzz: float = 0.0

    # Contamination overlays (all off by default):
    ruler_tick_px: float = 0.0          # >0: draw a horizontal ruler band with this tick period
    ruler_center_y_frac: float = 0.5    # ruler band centre, fraction of image height
    ruler_height_frac: float = 0.12     # ruler band height, fraction of image height
    pin_count: int = 0                  # sewing pins placed inside the centred 0.8 ROI
    fabric_edge_x_frac: float = 0.0     # >0: tabletop replaces the rightmost fraction of the frame

    @property
    def wale_pitch_px(self) -> float:
        return self.px_per_inch / self.wales_per_inch

    @property
    def course_pitch_px(self) -> float:
        return self.px_per_inch / self.courses_per_inch

    @property
    def px_per_mm(self) -> float:
        return self.px_per_inch / 25.4


def expected_periods(spec: FabricSpec) -> Dict[str, Tuple[float, Optional[float]]]:
    """
    Ground-truth pixel period per axis: {axis: (primary, alternate)}.
    `alternate` is a structurally legitimate second reading (see module
    docstring) — None where the axis is unambiguous. Callers accept a
    match against either but must record which one matched.
    """
    # Under in-plane rotation the axis-projected period is pitch/cos(theta)
    # (see the module docstring). At 0 deg this multiplies by exactly 1.0.
    k = 1.0 / math.cos(math.radians(spec.rotation_deg)) if spec.rotation_deg else 1.0
    wp, cp = spec.wale_pitch_px * k, spec.course_pitch_px * k
    if spec.structure == "rib1x1":
        return {"wale": (wp, 2 * wp), "course": (cp, None)}
    if spec.structure == "garter":
        return {"wale": (wp, None), "course": (cp, 2 * cp)}
    return {"wale": (wp, None), "course": (cp, None)}


# --- Stitch-primitive renderers (clean, pre-degradation) ---------------


def _stitch_grid(spec: FabricSpec):
    """Row/column centre coordinates covering the canvas with one extra
    ring outside each edge, so boundary stitches aren't clipped short."""
    wp, cp = spec.wale_pitch_px, spec.course_pitch_px
    cols = np.arange(-1, int(np.ceil(spec.width_px / wp)) + 2) * wp
    rows = np.arange(-1, int(np.ceil(spec.height_px / cp)) + 2) * cp
    return cols, rows


def _render_jersey(spec: FabricSpec, rng: np.random.Generator) -> np.ndarray:
    canvas = np.full((spec.height_px, spec.width_px), BACKGROUND_LEVEL, dtype=np.uint8)
    wp, cp = spec.wale_pitch_px, spec.course_pitch_px
    cols, rows = _stitch_grid(spec)
    # A stockinette V: two legs converging at the loop's bottom centre,
    # spreading up-outward. Slight vertical overlap (0.52 * pitch each
    # way) interlocks adjacent rows the way real loops do.
    leg_dx = 0.36 * wp
    leg_hh = 0.52 * cp
    thickness = max(1, int(round(0.30 * min(wp, cp))))
    for y_c in rows:
        for x_c in cols:
            shade = int(np.clip(190 + rng.normal(0, 16), 120, 250))
            bottom = (int(round(x_c)), int(round(y_c + leg_hh)))
            for sx in (-1.0, 1.0):
                top = (int(round(x_c + sx * leg_dx)), int(round(y_c - leg_hh)))
                cv2.line(canvas, top, bottom, shade, thickness, lineType=cv2.LINE_AA)
    return canvas.astype(np.float32)


def _render_rib1x1(spec: FabricSpec, rng: np.random.Generator) -> np.ndarray:
    canvas = np.full((spec.height_px, spec.width_px), BACKGROUND_LEVEL, dtype=np.uint8)
    wp, cp = spec.wale_pitch_px, spec.course_pitch_px
    cols, rows = _stitch_grid(spec)
    leg_dx = 0.36 * wp
    leg_hh = 0.52 * cp
    thickness = max(1, int(round(0.30 * min(wp, cp))))
    for ci, x_c in enumerate(cols):
        knit = ci % 2 == 0
        for y_c in rows:
            if knit:
                shade = int(np.clip(195 + rng.normal(0, 16), 120, 250))
                bottom = (int(round(x_c)), int(round(y_c + leg_hh)))
                for sx in (-1.0, 1.0):
                    top = (int(round(x_c + sx * leg_dx)), int(round(y_c - leg_hh)))
                    cv2.line(canvas, top, bottom, shade, thickness, lineType=cv2.LINE_AA)
            else:
                # Purl bump: a horizontal arc, dimmer than the knit face.
                shade = int(np.clip(140 + rng.normal(0, 12), 90, 200))
                cv2.ellipse(
                    canvas,
                    (int(round(x_c)), int(round(y_c))),
                    (max(1, int(round(0.33 * wp))), max(1, int(round(0.22 * cp)))),
                    0, 0, 360, shade, -1, lineType=cv2.LINE_AA,
                )
    out = canvas.astype(np.float32)
    # Recess the purl columns: real relaxed rib photographs with the purl
    # wales sunk into shadow between the raised knit columns.
    xs = np.arange(spec.width_px, dtype=np.float32)
    recess = 1.0 - 0.28 * (0.5 - 0.5 * np.cos(2 * np.pi * (xs / (2 * wp) + 0.5)))
    return out * recess[np.newaxis, :]


def _render_garter(spec: FabricSpec, rng: np.random.Generator) -> np.ndarray:
    canvas = np.full((spec.height_px, spec.width_px), BACKGROUND_LEVEL, dtype=np.uint8)
    wp, cp = spec.wale_pitch_px, spec.course_pitch_px
    cols, rows = _stitch_grid(spec)
    for ri, y_c in enumerate(rows):
        ridge = ri % 2 == 0
        base, ax_w, ax_h = (200, 0.42, 0.30) if ridge else (120, 0.34, 0.20)
        for x_c in cols:
            shade = int(np.clip(base + rng.normal(0, 14), 70, 250))
            cv2.ellipse(
                canvas,
                (int(round(x_c)), int(round(y_c))),
                (max(1, int(round(ax_w * wp))), max(1, int(round(ax_h * cp)))),
                0, 0, 360, shade, -1, lineType=cv2.LINE_AA,
            )
    return canvas.astype(np.float32)


_RENDERERS = {"jersey": _render_jersey, "rib1x1": _render_rib1x1, "garter": _render_garter}


# --- Degradations ------------------------------------------------------


def _apply_ply_trap(img: np.ndarray, spec: FabricSpec) -> np.ndarray:
    """Fine diagonal sinusoid texture at ply_period_px — the sub-loop
    periodicity trap. Diagonal (like real ply twist along a leg), so it
    projects onto BOTH axes."""
    if spec.ply_period_px <= 0:
        return img
    h, w = img.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    theta = np.deg2rad(65.0)
    phase = (xx * np.cos(theta) + yy * np.sin(theta)) / spec.ply_period_px
    return img * (1.0 + 0.18 * np.sin(2 * np.pi * phase))


def _apply_fuzz(img: np.ndarray, spec: FabricSpec) -> np.ndarray:
    """Soft halo per stitch: the stitch layer (above the inter-loop
    shadow) blurred at FUZZ_SIGMA_FRACTION of the pitch and brightened,
    taken as a MAX with the crisp yarn so cores keep their brightness and
    only the gaps fill in. Deterministic -- no random draws."""
    if spec.fuzz <= 0:
        return img
    sigma = FUZZ_SIGMA_FRACTION * min(spec.wale_pitch_px, spec.course_pitch_px)
    stitches = np.clip(img - BACKGROUND_LEVEL, 0, None)
    halo = cv2.GaussianBlur(stitches, (0, 0), sigma)
    return BACKGROUND_LEVEL + np.maximum(stitches, spec.fuzz * FUZZ_GAIN * halo)


def _render_rotated(spec: FabricSpec, rng: np.random.Generator) -> np.ndarray:
    """Render on a square canvas big enough to cover the frame at any
    angle, rotate about its centre, crop the centre -- so no border
    padding (reflected or constant) ever enters the frame."""
    if not spec.rotation_deg:
        return _apply_fuzz(_RENDERERS[spec.structure](spec, rng), spec)
    side = int(math.ceil(math.hypot(spec.width_px, spec.height_px))) + 4
    big = replace(spec, width_px=side, height_px=side, rotation_deg=0.0)
    canvas = _apply_fuzz(_RENDERERS[spec.structure](big, rng), big)
    M = cv2.getRotationMatrix2D((side / 2.0, side / 2.0), spec.rotation_deg, 1.0)
    rotated = cv2.warpAffine(canvas, M, (side, side), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT,
                             borderValue=BACKGROUND_LEVEL)
    x0 = (side - spec.width_px) // 2
    y0 = (side - spec.height_px) // 2
    return rotated[y0:y0 + spec.height_px, x0:x0 + spec.width_px].copy()


def ruler_band_rows(spec: FabricSpec) -> Tuple[int, int]:
    """(top, bottom) image rows of the ruler band, as drawn."""
    band_h = max(8, int(round(spec.ruler_height_frac * spec.height_px)))
    top = int(round(spec.ruler_center_y_frac * spec.height_px - band_h / 2.0))
    top = max(0, min(spec.height_px - band_h, top))
    return top, top + band_h


def _apply_overlays(img: np.ndarray, spec: FabricSpec) -> np.ndarray:
    """Ruler band, pins and fabric edge, drawn into the scene (so they
    go through perspective, lighting, noise, blur and JPEG like the
    fabric does). Uses its own random stream."""
    if spec.ruler_tick_px <= 0 and spec.pin_count <= 0 and spec.fabric_edge_x_frac <= 0:
        return img
    out = img.copy()
    h, w = out.shape
    orng = np.random.default_rng([spec.seed, OVERLAY_STREAM])
    if spec.fabric_edge_x_frac > 0:
        x_edge = int(round((1.0 - spec.fabric_edge_x_frac) * w))
        out[:, x_edge:] = TABLE_LEVEL
    if spec.pin_count > 0:
        rx, ry, rw, rh = centered_roi(spec)
        for _ in range(spec.pin_count):
            cx = float(orng.uniform(rx, rx + rw))
            cy = float(orng.uniform(ry, ry + rh))
            ang = float(orng.uniform(0, 2 * np.pi))
            tip = (int(round(cx + PIN_SHAFT_LENGTH_PX * np.cos(ang))), int(round(cy + PIN_SHAFT_LENGTH_PX * np.sin(ang))))
            cv2.line(out, (int(round(cx)), int(round(cy))), tip, PIN_LEVEL - 20, 2, lineType=cv2.LINE_AA)
            cv2.circle(out, (int(round(cx)), int(round(cy))), PIN_HEAD_RADIUS_PX, PIN_LEVEL, -1, lineType=cv2.LINE_AA)
    if spec.ruler_tick_px > 0:
        top, bottom = ruler_band_rows(spec)
        band_h = bottom - top
        out[top:bottom, :] = RULER_BODY_LEVEL
        n = int(np.ceil(w / spec.ruler_tick_px)) + 1
        for i in range(n):
            x = i * spec.ruler_tick_px
            reach = RULER_MAJOR_REACH if i % RULER_MAJOR_EVERY == 0 else RULER_MINOR_REACH
            y1 = top + int(round(reach * band_h))
            cv2.line(out, (int(round(x)), top), (int(round(x)), y1), RULER_TICK_LEVEL, 2, lineType=cv2.LINE_AA)
    return out


def _apply_perspective(img: np.ndarray, spec: FabricSpec, rng: np.random.Generator) -> np.ndarray:
    if spec.warp_amount <= 0:
        return img
    h, w = img.shape
    jit = spec.warp_amount * min(h, w)
    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    dst = src + rng.uniform(-jit, jit, size=(4, 2)).astype(np.float32)
    M = cv2.getPerspectiveTransform(src, dst)
    return cv2.warpPerspective(img, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


def _apply_lighting(img: np.ndarray, spec: FabricSpec, rng: np.random.Generator) -> np.ndarray:
    if spec.lighting_strength <= 0:
        return img
    h, w = img.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    theta = rng.uniform(0, 2 * np.pi)
    ramp = (xx * np.cos(theta) + yy * np.sin(theta))
    ramp = (ramp - ramp.min()) / max(ramp.max() - ramp.min(), 1e-6)  # 0..1 across the frame
    return img * (1.0 - spec.lighting_strength + 2 * spec.lighting_strength * ramp)


def render_overlays_only(spec: FabricSpec, ground_level: float = 150.0) -> np.ndarray:
    """The spec's overlays (and its noise / blur / JPEG) on a FLAT ground
    with no fabric -- the control for the ruler-detection checks: if the
    detector cannot read the synthetic ruler here, a miss on fabric says
    nothing about the fabric."""
    rng = np.random.default_rng(spec.seed)
    img = np.full((spec.height_px, spec.width_px), ground_level, dtype=np.float32)
    img = _apply_overlays(img, spec)
    img = img + rng.normal(0, FIBER_NOISE_STD, size=img.shape)
    if spec.blur_sigma > 0:
        img = cv2.GaussianBlur(img, (0, 0), spec.blur_sigma)
    img_u8 = np.clip(img, 0, 255).astype(np.uint8)
    if spec.jpeg_quality is not None:
        img_u8 = _apply_jpeg(img_u8, spec.jpeg_quality)
    return cv2.cvtColor(img_u8, cv2.COLOR_GRAY2BGR)


def _apply_jpeg(img_u8: np.ndarray, quality: int) -> np.ndarray:
    ok, buf = cv2.imencode(".jpg", img_u8, [cv2.IMWRITE_JPEG_QUALITY, int(quality)])
    if not ok:
        raise RuntimeError("JPEG encode failed")
    out = cv2.imdecode(buf, cv2.IMREAD_GRAYSCALE)
    return out


def render_fabric(spec: FabricSpec) -> np.ndarray:
    """Render the spec to a BGR uint8 image (what analyze_gauge expects)."""
    if spec.structure not in _RENDERERS:
        raise ValueError(f"Unknown structure {spec.structure!r}")
    rng = np.random.default_rng(spec.seed)
    img = _render_rotated(spec, rng)
    img = _apply_ply_trap(img, spec)
    img = _apply_overlays(img, spec)
    img = _apply_perspective(img, spec, rng)
    img = _apply_lighting(img, spec, rng)
    img = img + rng.normal(0, FIBER_NOISE_STD, size=img.shape)
    if spec.blur_sigma > 0:
        img = cv2.GaussianBlur(img, (0, 0), spec.blur_sigma)
    img_u8 = np.clip(img, 0, 255).astype(np.uint8)
    if spec.jpeg_quality is not None:
        img_u8 = _apply_jpeg(img_u8, spec.jpeg_quality)
    return cv2.cvtColor(img_u8, cv2.COLOR_GRAY2BGR)


# --- Scoring helpers ----------------------------------------------------


def centered_roi(spec_or_shape, frac: float = 0.8) -> Tuple[int, int, int, int]:
    """A centred ROI covering `frac` of each dimension."""
    if isinstance(spec_or_shape, FabricSpec):
        w, h = spec_or_shape.width_px, spec_or_shape.height_px
    else:
        h, w = spec_or_shape[:2]
    rw, rh = int(w * frac), int(h * frac)
    return ((w - rw) // 2, (h - rh) // 2, rw, rh)


def match_against_truth(measured_px: Optional[float], primary: float, alternate: Optional[float], tol: float):
    """
    Compare a measured period to ground truth. Returns (status, matched),
    where status is one of:
      "primary" / "alternate"  — within tol of that truth value
      "half_harmonic"          — near 0.5x primary (the classic leg trap)
      "double_harmonic"        — near 2x primary
      "lost"                   — no detection at all
      "off"                    — detected, but matches nothing above
    """
    if measured_px is None:
        return "lost", None
    def near(target):
        return target > 0 and abs(measured_px / target - 1.0) <= tol
    if near(primary):
        return "primary", primary
    if alternate is not None and near(alternate):
        return "alternate", alternate
    if near(0.5 * primary):
        return "half_harmonic", None
    if near(2.0 * primary):
        return "double_harmonic", None
    return "off", None


def clean(structure: str, wpi: float, cpi: float, **overrides) -> FabricSpec:
    return FabricSpec(structure=structure, wales_per_inch=wpi, courses_per_inch=cpi, **overrides)


def mildly_degraded(structure: str, wpi: float, cpi: float, **overrides) -> FabricSpec:
    """The 'ordinary decent phone photo' condition used by the fast grid."""
    params = dict(warp_amount=0.01, lighting_strength=0.25, blur_sigma=1.2, jpeg_quality=75)
    params.update(overrides)
    return FabricSpec(structure=structure, wales_per_inch=wpi, courses_per_inch=cpi, **params)
