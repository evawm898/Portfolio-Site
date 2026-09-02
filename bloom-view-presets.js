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

   TOP-DOWN reuses the up vector shot-bloom-fan.mjs and shot-bloom-orchid.mjs
   already ship as `FACE_UP = [-1, 0, 0]` — not a fresh choice here. Both
   tools independently derived it as the orientation that reads "labellum
   below, hood above" for a zygomorphic bloom, which is exactly the reading
   Eva's FAN top-down snap needs. Using any other up vector here would be a
   second, disagreeing owner of the same convention. (It is currently
   inlined in both tools rather than exported from one shared module —
   worth consolidating later; out of scope for the view system itself.)
   Because dir = [0,0,1] and up = [-1,0,0] are already perpendicular, this
   is the one preset that needs no epsilon nudge to dodge a degenerate
   cross product (the flower's own `top` needed one for exactly that
   reason, looking straight down its OWN vertical axis, Y).
   =================================================================== */
export const VIEW_PRESETS = {
  default: { dir: [0.75, -0.75, 0.60], up: [0, 0, 1], fit: 1.6 },
  front:   { dir: [0.00, 1.00, 0.15], up: [0, 0, 1], fit: 1.5 },
  side:    { dir: [1.00, 0.00, 0.15], up: [0, 0, 1], fit: 1.5 },
  top:     { dir: [0.00, 0.00, 1.00], up: [-1, 0, 0], fit: 1.45 },
  iso:     { dir: [1.00, 1.00, 0.85], up: [0, 0, 1], fit: 1.6 },
};
