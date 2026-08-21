/* ===================================================================
   flower-shapes.js — SINGLE SOURCE OF TRUTH for the petal Shape picker's
   named bundles (ROUNDED / POINTED / STRAP / CLAWED). One copy shared by
   the live picker (flower.js's applyShape/detectShape) and its correctness
   gate (tools/verify-geometry-quality.mjs), which used to hand-carry an
   identical-looking copy of this same object with nothing checking the two
   stayed in sync — exactly the class of drift a "single source of truth"
   is supposed to make impossible.

   LOBED is deliberately NOT here: it renders correctly only with continuous
   margin OFF (see #64 — the un-clefted marginal strands skip the sinus), so
   it is not a pickable shape; flower.js never offers it. The gate keeps its
   own separate lobed bundle (tools/verify-geometry-quality.mjs) purely to
   regression-test that known defect — that one stays local on purpose,
   since sharing it would wire a quarantined shape into the picker's own
   detectShape() match set.
   =================================================================== */
export const SHAPE_PARAMS = ['width', 'taper', 'clawLength', 'clawWidth', 'shoulder', 'cleftDepth', 'cleftLobes', 'cleftWidth', 'tip', 'centerCurve', 'edgeCurve', 'edgeProfile', 'petalCup'];

export const SHAPES = {
  rounded: { width: 0.9, taper: 0.35, clawLength: 0, clawWidth: 0.3, shoulder: 0.5, cleftDepth: 0, cleftLobes: 2, cleftWidth: 0.3, tip: 0.5, centerCurve: 0.4, edgeCurve: 0, edgeProfile: 0, petalCup: 0 },
  pointed: { width: 0.7, taper: 0.5, clawLength: 0, clawWidth: 0.3, shoulder: 0.4, cleftDepth: 0, cleftLobes: 2, cleftWidth: 0.3, tip: 0.15, centerCurve: 0.3, edgeCurve: -0.1, edgeProfile: 0, petalCup: 0 },
  strap: { width: 0.45, taper: 0.5, clawLength: 0, clawWidth: 0.3, shoulder: 0.3, cleftDepth: 0, cleftLobes: 2, cleftWidth: 0.3, tip: 0.3, centerCurve: 0.15, edgeCurve: 0, edgeProfile: 0, petalCup: 0.05 },
  clawed: { width: 1.0, taper: 0.3, clawLength: 0.35, clawWidth: 0.25, shoulder: 0.55, cleftDepth: 0, cleftLobes: 2, cleftWidth: 0.3, tip: 0.6, centerCurve: 0.35, edgeCurve: 0.05, edgeProfile: 0, petalCup: 0.15 },
};
