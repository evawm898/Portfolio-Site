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
   to catch the #64 cleft regression — but it is NOT in the picker: the
   cleft renders correctly only when the rim is cleft-aware (continuous
   margin OFF), so with the Standard default (margin ON) the two un-clefted
   marginal strands skip the sinus and a one-click Lobed would ship a
   manifold-but-wrong petal (tools/verify-geometry-quality.mjs measures an
   ~8-19 mm unsealed gap across the whole cleftDepth range). Cleft params
   stay reachable in Advanced (a hand-dialled cleft shows as CUSTOM); Lobed
   joins PICKER_SHAPE_NAMES once #64 makes marginStrands cleft-aware.
   =================================================================== */

export const SHAPE_PARAMS = ['width', 'taper', 'clawLength', 'clawWidth', 'shoulder', 'cleftDepth', 'cleftLobes', 'cleftWidth', 'tip', 'centerCurve', 'edgeCurve', 'edgeProfile', 'petalCup'];

export const SHAPES = {
  rounded: { width: 0.9, taper: 0.35, clawLength: 0, clawWidth: 0.3, shoulder: 0.5, cleftDepth: 0, cleftLobes: 2, cleftWidth: 0.3, tip: 0.5, centerCurve: 0.4, edgeCurve: 0, edgeProfile: 0, petalCup: 0 },
  pointed: { width: 0.7, taper: 0.5, clawLength: 0, clawWidth: 0.3, shoulder: 0.4, cleftDepth: 0, cleftLobes: 2, cleftWidth: 0.3, tip: 0.15, centerCurve: 0.3, edgeCurve: -0.1, edgeProfile: 0, petalCup: 0 },
  strap: { width: 0.45, taper: 0.5, clawLength: 0, clawWidth: 0.3, shoulder: 0.3, cleftDepth: 0, cleftLobes: 2, cleftWidth: 0.3, tip: 0.3, centerCurve: 0.15, edgeCurve: 0, edgeProfile: 0, petalCup: 0.05 },
  clawed: { width: 1.0, taper: 0.3, clawLength: 0.35, clawWidth: 0.25, shoulder: 0.55, cleftDepth: 0, cleftLobes: 2, cleftWidth: 0.3, tip: 0.6, centerCurve: 0.35, edgeCurve: 0.05, edgeProfile: 0, petalCup: 0.15 },
  lobed: { width: 0.95, taper: 0.35, clawLength: 0, clawWidth: 0.3, shoulder: 0.55, cleftDepth: 0.45, cleftLobes: 2, cleftWidth: 0.3, tip: 0.5, centerCurve: 0.4, edgeCurve: 0.05, edgeProfile: 0, petalCup: 0.1 },
};

export const PICKER_SHAPE_NAMES = ['rounded', 'pointed', 'strap', 'clawed'];
