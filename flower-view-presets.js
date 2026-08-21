/* ===================================================================
   flower-view-presets.js — canonical camera viewpoints, one shared source
   for both the live VIEW dropdown (flower.js, in-browser) and every headless
   audit/gate script that needs to reproduce a specific framing (tools/*.mjs,
   Node-side, via a plain dynamic import — see tools/verify-geometry-quality.mjs
   for the same pattern against flower-presets.js).

   Why this file exists: a fine-detail visual-diff audit needs the SAME camera
   angles run-to-run to be comparable at all. That convention previously lived
   only inside an ephemeral, un-committed audit script's local variables — it
   was lost the moment that session ended, making a later re-run's numbers
   incomparable to the earlier ones even though the earlier ones were quoted
   as ground truth. Checking the vectors in here means that can't happen again.

   `dir` is the target->camera OFFSET direction (normalized by the caller);
   `up` sets the on-screen vertical; `fit` pads the framing distance. TOP looks
   straight down, so it uses a horizontal up (matches the bilateral top-down
   convention elsewhere in the app).
   =================================================================== */
export const VIEW_PRESETS = {
  default: { dir: [0.45, 0.30, 0.85], up: [0, 1, 0], fit: 1.6 },
  front:   { dir: [0.00, 0.15, 1.00], up: [0, 1, 0], fit: 1.5 },
  side:    { dir: [1.00, 0.15, 0.00], up: [0, 1, 0], fit: 1.5 },
  top:     { dir: [0.00, 1.00, 0.001], up: [1, 0, 0], fit: 1.45 },
  iso:     { dir: [1.00, 0.85, 1.00], up: [0, 1, 0], fit: 1.6 },
};

// The fixed 3-viewpoint set used by fine-detail visual-diff audits (e.g.
// tools/audit-hires.mjs): a 3/4 angle ("default" — kept under its historical
// dropdown name so the live UI label doesn't change), straight down, and
// straight from the side. Any script measuring "does control X visibly
// change the bloom" should use exactly this list, in exactly this order, so
// separate audit runs stay comparable.
export const AUDIT_VIEWPOINTS = ['default', 'top', 'side'];
