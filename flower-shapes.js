/* ===================================================================
   flower-shapes.js — the named petal-shape bundles.

   A named shape is a proxy over the raw silhouette params (SHAPE_PARAMS):
   picking one writes a full bundle to the Advanced petal controls. Single
   source of truth for both flower.js's Standard shape picker (applyShape /
   detectShape) and tools/verify-geometry-quality.mjs's shape-fixture matrix,
   so the two can never drift apart the way they used to (each keeping its
   own hand-copied literal).

   PICKER_SHAPE_NAMES is the subset flower.js's Standard picker offers.

   LOBED is Standard tier by decision, not by oversight. Silhouette-changing
   options are DESIGN tier — see the working agreements. It is topological (two
   spans of material at one height, which edge noise cannot produce at any
   amplitude) and it is the shape change most visible at distance. Do not demote
   it to Advanced on the grounds of novelty or triangle cost; if cost is the
   concern, the answer is the output budget, not the tier.

   Its bundle is deliberately committed rather than middling: deep (0.55 of
   0.6 max), few (2 lobes), pointed (tip 0.85) — an unambiguous bifid, the
   Silene/Dianthus read. A shallow-and-frequent cleft is the same control set
   dialled the other way, but as a DEFAULT it lands in the region where the
   sinuses read as damage rather than as intent. Depth stops short of the 0.6
   cap so the slider still has somewhere to go.

   The guard rails are in cleftConfig, not here: depth capped at 0.6 of blade
   length, lobe count clamped 2..7, and the slot flare (hence how pointed the
   lobe tips get) growing with both tip shape and depth.
   =================================================================== */

export const SHAPE_PARAMS = ['width', 'taper', 'clawLength', 'clawWidth', 'shoulder', 'cleftDepth', 'cleftLobes', 'cleftWidth', 'tip', 'curlAmount', 'edgeCurve', 'edgeProfile', 'petalCup'];

export const SHAPES = {
  rounded: { width: 0.9, taper: 0.35, clawLength: 0, clawWidth: 0.3, shoulder: 0.5, cleftDepth: 0, cleftLobes: 2, cleftWidth: 0.3, tip: 0.5, curlAmount: 0.4, edgeCurve: 0, edgeProfile: 0, petalCup: 0 },
  pointed: { width: 0.7, taper: 0.5, clawLength: 0, clawWidth: 0.3, shoulder: 0.4, cleftDepth: 0, cleftLobes: 2, cleftWidth: 0.3, tip: 0.15, curlAmount: 0.3, edgeCurve: -0.1, edgeProfile: 0, petalCup: 0 },
  strap: { width: 0.45, taper: 0.5, clawLength: 0, clawWidth: 0.3, shoulder: 0.3, cleftDepth: 0, cleftLobes: 2, cleftWidth: 0.3, tip: 0.3, curlAmount: 0.15, edgeCurve: 0, edgeProfile: 0, petalCup: 0.05 },
  clawed: { width: 1.0, taper: 0.3, clawLength: 0.35, clawWidth: 0.25, shoulder: 0.55, cleftDepth: 0, cleftLobes: 2, cleftWidth: 0.3, tip: 0.6, curlAmount: 0.35, edgeCurve: 0.05, edgeProfile: 0, petalCup: 0.15 },
  lobed: { width: 0.95, taper: 0.35, clawLength: 0, clawWidth: 0.3, shoulder: 0.55, cleftDepth: 0.55, cleftLobes: 2, cleftWidth: 0.3, tip: 0.85, curlAmount: 0.4, edgeCurve: 0.05, edgeProfile: 0, petalCup: 0.1 },
};

export const PICKER_SHAPE_NAMES = ['rounded', 'pointed', 'strap', 'clawed', 'lobed'];
