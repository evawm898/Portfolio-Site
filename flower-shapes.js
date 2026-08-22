/* ===================================================================
   flower-shapes.js — the named petal-shape bundles.

   A named shape is a proxy over the raw silhouette params (SHAPE_PARAMS):
   picking one writes a full bundle to the Advanced petal controls. Single
   source of truth for both flower.js's Standard shape picker (applyShape /
   detectShape) and tools/verify-geometry-quality.mjs's shape-fixture matrix,
   so the two can never drift apart the way they used to (each keeping its
   own hand-copied literal).

   PICKER_SHAPE_NAMES is the subset flower.js's Standard picker offers.
   LOBED is a real, testable shape — the geometry-quality gate exercises it
   across every infill pattern — but it is NOT in the picker. The reason it
   was held out is gone: the sinus used to be unsealed under the Standard
   default (continuous margin ON), an ~8-19 mm gap across the whole
   cleftDepth range, and PR #50 closed it to 0.089 mm by making ribPath the
   one producer of the boundary. Whether Lobed now joins the picker is a
   taste call about the shop window, not a correctness one. Cleft params are
   reachable in Advanced either way (a hand-dialled cleft shows as CUSTOM).
   =================================================================== */

export const SHAPE_PARAMS = ['width', 'taper', 'clawLength', 'clawWidth', 'shoulder', 'cleftDepth', 'cleftLobes', 'cleftWidth', 'tip', 'curlAmount', 'edgeCurve', 'edgeProfile', 'petalCup'];

export const SHAPES = {
  rounded: { width: 0.9, taper: 0.35, clawLength: 0, clawWidth: 0.3, shoulder: 0.5, cleftDepth: 0, cleftLobes: 2, cleftWidth: 0.3, tip: 0.5, curlAmount: 0.4, edgeCurve: 0, edgeProfile: 0, petalCup: 0 },
  pointed: { width: 0.7, taper: 0.5, clawLength: 0, clawWidth: 0.3, shoulder: 0.4, cleftDepth: 0, cleftLobes: 2, cleftWidth: 0.3, tip: 0.15, curlAmount: 0.3, edgeCurve: -0.1, edgeProfile: 0, petalCup: 0 },
  strap: { width: 0.45, taper: 0.5, clawLength: 0, clawWidth: 0.3, shoulder: 0.3, cleftDepth: 0, cleftLobes: 2, cleftWidth: 0.3, tip: 0.3, curlAmount: 0.15, edgeCurve: 0, edgeProfile: 0, petalCup: 0.05 },
  clawed: { width: 1.0, taper: 0.3, clawLength: 0.35, clawWidth: 0.25, shoulder: 0.55, cleftDepth: 0, cleftLobes: 2, cleftWidth: 0.3, tip: 0.6, curlAmount: 0.35, edgeCurve: 0.05, edgeProfile: 0, petalCup: 0.15 },
  lobed: { width: 0.95, taper: 0.35, clawLength: 0, clawWidth: 0.3, shoulder: 0.55, cleftDepth: 0.45, cleftLobes: 2, cleftWidth: 0.3, tip: 0.5, curlAmount: 0.4, edgeCurve: 0.05, edgeProfile: 0, petalCup: 0.1 },
};

export const PICKER_SHAPE_NAMES = ['rounded', 'pointed', 'strap', 'clawed'];
