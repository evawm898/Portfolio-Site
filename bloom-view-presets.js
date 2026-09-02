/* ===================================================================
   bloom-view-presets.js — canonical camera viewpoints for the bloom's VIEW
   box. Same role as the flower's flower-view-presets.js (read as the
   reference, per Eva's instruction — ported deliberately, not copied
   byte-for-byte): one shared source for the live VIEW dropdown in bloom.js,
   so a later shot tool can reproduce the same named angles without
   inventing its own copy.

   THE AXIS CONVENTION DIFFERS FROM THE FLOWER'S, AND THE VECTORS ARE
   RE-DERIVED FOR IT RATHER THAN SWAPPED BY ROTE. The flower's world is
   Y-up (three.js's default). The bloom's is Z-up: buildPetalInto's own
   local frame is R = [cos az, sin az, 0], T = [-sin az, cos az, 0],
   Z = [0, 0, 1] (bloom-geometry.js), and every existing camera call here
   already agrees — fitCamera's default branch sets `camera.up.set(0,0,1)`.
   Porting the flower's literal [x, y, z] triples would put "up" into the
   bloom's horizontal (azimuth) plane instead of along its actual vertical
   axis.

   `dir` is the target->camera OFFSET direction (normalized by the caller);
   `up` sets the on-screen vertical; `fit` pads the framing distance —
   multiplied against radius/tan(fov/2), so every preset frames every
   model regardless of its size (the fan's own asymmetric extent included).

   DEFAULT reproduces fitCamera's own initial-framing direction ratio
   (0.75, -0.75, 0.6) — the same principle as the flower's default matching
   frameCameraOnce: picking DEFAULT from the dropdown must never look
   different from a fresh page load.

   TOP-DOWN's up is [1, 0, 0], and it is a DELIBERATE DIVERGENCE from the
   shot-bloom-fan.mjs / shot-bloom-orchid.mjs sheets' own `FACE_UP =
   [-1, 0, 0]` — not a fresh guess, and not an accidental disagreement.
   Eva ruled directly on THIS live view (Sep 2, an amendment after seeing
   the deploy preview): "the top-down framing of the fan must ALWAYS put
   the labellum at the top of the screen — the mirror axis vertical, the
   arc opening downward" — in BOTH toggle states (toggle OFF has no
   bisected labellum, but the labellum-nearest content still sits nearest
   azimuth 0, so the same orientation governs). Those PRINTED SHEETS put
   the mirror-line trace (+X) at the BOTTOM on purpose, reading "labellum
   below, hood above" like a real orchid's hanging lip — a ruling for a
   different audience (a static comparison sheet) that this interactive
   snap does not share. Flipping the up vector's sign is the whole fix:
   `dir` is unchanged, the camera still sits directly above looking
   straight down; only the in-plane roll changes, rotating the image 180°
   so +X reads at the top instead of the bottom. Do not "reconcile" this
   with the shot tools by changing THEM — their own ruling stands for what
   they are, and this file's job is the live view, not print sheets.
   Because dir = [0,0,1] and up = [1,0,0] are already perpendicular, this
   is the one preset that needs no epsilon nudge to dodge a degenerate
   cross product (the flower's own `top` needed one for exactly that
   reason, looking straight down its OWN vertical axis, Y).
   =================================================================== */
export const VIEW_PRESETS = {
  default: { dir: [0.75, -0.75, 0.60], up: [0, 0, 1], fit: 1.6 },
  front:   { dir: [0.00, 1.00, 0.15], up: [0, 0, 1], fit: 1.5 },
  side:    { dir: [1.00, 0.00, 0.15], up: [0, 0, 1], fit: 1.5 },
  top:     { dir: [0.00, 0.00, 1.00], up: [1, 0, 0], fit: 1.45 },
  iso:     { dir: [1.00, 1.00, 0.85], up: [0, 0, 1], fit: 1.6 },
};
