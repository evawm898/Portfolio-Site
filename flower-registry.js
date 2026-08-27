/* ===================================================================
   flower-registry.js — SINGLE SOURCE OF TRUTH for the control panel.

   One row per control: id / section / kind / range / default / options / label /
   gating / fmt (label read-out format). The JS lists that used to be hand-kept in
   parallel — inputs, readUI, DEFAULTS, reset, refreshLabels, the slider-listener
   set — are all DERIVED from this array (see flower.js). Adding or removing a
   control is a single edit here; tools/verify-registry-sync.mjs fails the build if
   this array and flower.html ever disagree.

   Chrome not modelled here (handled directly in flower.js): viewPreset, autoRotate,
   saveNameInput, spaceSeed. Presentation not modelled here in P1 (stays in
   flower.html, redesigned in P2): hint text, headings, notes, CSS modifier classes.
   =================================================================== */

/* ===================================================================
   VISIBILITY PREDICATES — the condition itself, not a name for it.

   Until this change the registry stored `gating: {"data-recept": true}` — the NAME of a
   condition. The condition ("stem or sepals present, or the migration override") lived
   only in flower.js. 122 of 166 controls were declared that way, which means the single
   source of truth named a condition for three quarters of the panel without stating one,
   and nothing could evaluate it: that is why the tier gate skipped every gated control,
   and why four separate mechanisms could hide a control with the registry none the wiser.
   Same failure as the `(overlaps)` label the flower-project skill records — a word
   standing in for a computation that did not exist — at the scale of the whole panel.

   A control's `visibleWhen` is now the condition. flower.js EVALUATES it (applyVisibility);
   the gates evaluate the same declaration to form their expectation. One owner, one
   definition, no second copy that "happens to agree."

   GRAMMAR — three leaf shapes, deliberately structured rather than opaque functions, so
   the panel can introspect them (a disclosure layer can say "inert because Cleft depth is
   0" from {id,min}; it can say nothing from a closure):

     { id, oneOf: [...] }        control `id`'s value is one of these
     { id, min: n }              control `id`'s numeric value is >= n
     { id, awayFrom: n, by: d }  control `id`'s numeric value differs from n by >= d
                                 (for a control whose neutral point is mid-range, not zero)

   ...composed with:

     { all: [...] }   every term true   (an empty `all` is TRUE — nothing to fail)
     { any: [...] }   some term true    (an empty `any` is FALSE — nothing to satisfy;
                                         this is how a control that is never shown says so,
                                         alongside a `hiddenReason` that says WHY. A flag
                                         like the old `permanentHidden` could only assert
                                         "never"; it could not carry the reason, and it was
                                         wrong on one of its four users for exactly as long
                                         as nobody could check it.)
     { not: p }       negation
     { ref: 'name' }  a named predicate from PREDICATES below

   IF A FOURTH LEAF SHAPE IS EVER NEEDED, STOP AND RAISE IT rather than adding one. That
   is the signal these should become general predicates instead of structured data, and it
   is a decision worth making deliberately — the introspection above is what would be lost.

   `standardVisibleWhen` overrides `visibleWhen` while Standard tier is active. Exactly one
   control uses it (edgeNoise), and it exists because Standard's Edge picker collapses three
   sliders into one contextual "Amount" slot. Tier is applied on top of whichever predicate
   applies: a control is visible iff (Advanced, or the control is tier:"standard") AND its
   predicate holds.
   =================================================================== */

/* THE SHAPE FAMILY — an effect-precondition, gated on the enabling PARAMETER, never on the
   petal-shape picker.

   `clawWidth` and `shoulder` do nothing at all while `clawLength` is 0: flower-geometry.js
   guards the whole claw block with `if (clawLen > 0)`, and both measure a delta of exactly
   0.000e+0 across their full ranges with the claw off. Same for `cleftLobes` / `cleftWidth`
   while `cleftDepth` is 0 — `cleftConfig()` returns null at depth <= 1e-4, so neither is
   read. They are hidden exactly when the geometry proves them inert.

   WHY NOT GATE ON `petalShape`, which is the obvious reading of "you have to pick CLAWED
   first": two reasons, and the second is the one that matters. (1) `petalShape` is `uiOnly`,
   so it is absent from readUI() and a predicate cannot even read it. (2) Fixing that creates
   a control that disappears while you use it: `petalShape` is a MACRO over SHAPE_PARAMS, and
   detectShape() drops the picker to CUSTOM on the first `input` of any of them. Drag the very
   slider the shape revealed and the picker leaves that shape, the predicate goes false, and
   the slider vanishes under the cursor. A visibility condition that holds only until you use
   the thing it reveals is not a condition. Gating on the parameter gives the same visitor
   experience — the picker WRITES cleftDepth 0.55 for LOBED, so choosing LOBED still reveals
   the lobe sliders — without the trap, and it keeps a clawed POINTED petal reachable in
   Advanced instead of making the picker a mode.

   `min: 0.01` is the SLIDER STEP, deliberately not the geometry's own epsilon (1e-4 for the
   cleft, > 0 for the claw). Duplicating 1e-4 into this file would re-introduce exactly the
   two-copies-of-one-boundary drift this registry exists to remove.

   The divergence that trade was expected to buy turns out not to exist, which is worth
   recording because the reasoning is not obvious: a design carrying a SUB-STEP value was
   supposed to be able to reach "geometry active, dependents hidden". It cannot. These are
   `<input type="range" step="0.01">`, so a loaded value snaps to the nearest step before
   anything reads it — measured through the real ?d= load route, cleftDepth 0.005 arrives as
   0.01 and clawLength 0.004 arrives as 0. Geometry reads the same snapped input (readUI ->
   parseFloat(el.value)), so the predicate and the geometry cannot disagree about a value
   neither of them can see. The 1e-4 boundary is unreachable from the UI in either direction.

   (Aside, pre-existing and not this change's to fix: that snap silently rewrites a sub-step
   saved value on load, for every slider, not just these.)
*/

// Named predicates: a condition used by more than one control is defined ONCE here and
// referenced, never restated. This indirection exists because `hasReceptacle` once had four
// hand-written copies across flower.js — that predicate is gone now (see below), but the
// mechanism it motivated stays, for the next condition two controls need to share.
//
// RETIRED — `hasReceptacle` (#84). It asked "does this design need a junction below the
// bloom", and eighteen controls were gated on it. The junction is now built for EVERY
// design, so the predicate was true for every design that can exist: a condition that
// cannot be false is not a condition, and leaving it in place would have hidden the
// junction's own shaping controls from exactly the designs that had just gained a junction.
// It was deleted rather than left evaluating to true, because a vacuous gate reads like a
// real one to whoever checks next. The eighteen controls now carry either no gate or the
// remaining half of what used to be an `all[...]` beside it.
export const PREDICATES = {};

/* Evaluate a predicate against a state object keyed by control id (the same shape readUI()
   produces, so geometry code and panel code evaluate against the same values). An absent
   predicate means "no condition" -> true. Unknown shapes THROW rather than defaulting to
   visible: a typo that silently shows every control is the failure mode this whole change
   exists to remove. */
export function evalPredicate(pred, state) {
  if (pred == null) return true;
  if (pred.ref) {
    const named = PREDICATES[pred.ref];
    if (!named) throw new Error(`evalPredicate: unknown named predicate "${pred.ref}"`);
    return evalPredicate(named, state);
  }
  if (Array.isArray(pred.all)) return pred.all.every((p) => evalPredicate(p, state));
  if (Array.isArray(pred.any)) return pred.any.some((p) => evalPredicate(p, state));
  if (pred.not) return !evalPredicate(pred.not, state);
  if (pred.id !== undefined) {
    const v = state[pred.id];
    if (Array.isArray(pred.oneOf)) return pred.oneOf.includes(String(v));
    if (pred.min !== undefined) return Number(v) >= pred.min;
    if (pred.awayFrom !== undefined) return Math.abs(Number(v) - pred.awayFrom) >= (pred.by ?? 0);
    throw new Error(`evalPredicate: control predicate on "${pred.id}" has no oneOf/min/awayFrom`);
  }
  throw new Error(`evalPredicate: unrecognised predicate ${JSON.stringify(pred)}`);
}

/* Every control id a predicate reads — the drivers whose changes must re-run the sweep.
   Derived, so adding a predicate never means remembering to add a listener. */
export function predicateDrivers(pred, out = new Set()) {
  if (pred == null || typeof pred !== "object") return out;
  if (pred.ref) return predicateDrivers(PREDICATES[pred.ref], out);
  if (pred.id !== undefined) out.add(pred.id);
  for (const k of ["all", "any"]) if (Array.isArray(pred[k])) for (const p of pred[k]) predicateDrivers(p, out);
  if (pred.not) predicateDrivers(pred.not, out);
  return out;
}

export const SECTIONS = [
  { id: "acc-form", label: "Form" },   // petals, arrangement, cup, petal shape, layers
  { id: "acc-lace", label: "Lace" },   // infill pattern
  { id: "acc-edge", label: "Edge" },   // margin / tip treatment
  { id: "acc-base", label: "Base" },   // centre, sepals, stem, leaves
  { id: "acc-make", label: "Make" },   // size, process, printability, save/share/get
];

export const CONTROLS = [
  {"id":"bloomType","section":"acc-form","kind":"select","options":[{"value":"coiled","text":"SPIRAL"},{"value":"radial","text":"ROSETTE"},{"value":"bilateral","text":"FAN"}],"default":"coiled","label":"Arrangement","tier":"standard"},
  {"id":"petalCount","section":"acc-form","kind":"slider","min":1,"max":40,"step":1,"default":4,"label":"Number of petals","fmt":"int","visibleWhen":{"id":"bloomType","oneOf":["coiled","radial"]},"tier":"standard"},
  {"id":"divergenceMode","section":"acc-form","kind":"select","options":[{"value":"golden","text":"GOLDEN"},{"value":"even","text":"EVEN"},{"value":"custom","text":"CUSTOM"}],"default":"golden","label":"Divergence angle","visibleWhen":{"id":"bloomType","oneOf":["coiled"]}},
  {"id":"divergenceAngle","section":"acc-form","kind":"slider","min":0,"max":180,"step":0.1,"default":137.5,"label":"Custom angle","fmt":"f1deg","divId":"divergenceAngleCtrl","visibleWhen":{"all":[{"id":"bloomType","oneOf":["coiled"]},{"id":"divergenceMode","oneOf":["custom"]}]}},
  {"id":"bilPerSide","section":"acc-form","kind":"slider","min":1,"max":3,"step":1,"default":3,"label":"Petals per side","fmt":"int","visibleWhen":{"id":"bloomType","oneOf":["bilateral"]}},
  {"id":"bilSpacing","section":"acc-form","kind":"slider","min":15,"max":60,"step":1,"default":45,"label":"Petal spacing","fmt":"deg","visibleWhen":{"id":"bloomType","oneOf":["bilateral"]}},
  {"id":"bilCenterPetal","section":"acc-form","kind":"checkbox","default":false,"label":"Petal on mirror line","visibleWhen":{"id":"bloomType","oneOf":["bilateral"]}},
  {"id":"bilEdge1","section":"acc-form","kind":"select","options":[{"value":"default","text":"DEFAULT (GLOBAL TIP)"},{"value":"clean","text":"CLEAN"},{"value":"jagged","text":"SERRATED"},{"value":"ruffled","text":"RUFFLED"}],"default":"default","label":"Edge","visibleWhen":{"all":[{"id":"bloomType","oneOf":["bilateral"]},{"id":"bilPerSide","min":1}]}},
  {"id":"bilScale1","section":"acc-form","kind":"slider","min":0.3,"max":2,"step":0.05,"default":1,"label":"Scale","fmt":"f2x","visibleWhen":{"all":[{"id":"bloomType","oneOf":["bilateral"]},{"id":"bilPerSide","min":1}]}},
  {"id":"bilWidth1","section":"acc-form","kind":"slider","min":0.45,"max":1.5,"step":0.01,"default":0.9,"label":"Width","fmt":"f2","visibleWhen":{"all":[{"id":"bloomType","oneOf":["bilateral"]},{"id":"bilPerSide","min":1}]}},
  {"id":"bilCurlAmount1","section":"acc-form","kind":"slider","min":-1,"max":1,"step":0.01,"default":0.4,"label":"Spine curl","fmt":"signed2","visibleWhen":{"all":[{"id":"bloomType","oneOf":["bilateral"]},{"id":"bilPerSide","min":1}]}},
  {"id":"bilEdgeCurve1","section":"acc-form","kind":"slider","min":-1,"max":1,"step":0.01,"default":0,"label":"Edge curve — top-down","fmt":"signed2","visibleWhen":{"all":[{"id":"bloomType","oneOf":["bilateral"]},{"id":"bilPerSide","min":1}]}},
  {"id":"bilEdgeProfile1","section":"acc-form","kind":"slider","min":-1,"max":1,"step":0.01,"default":0,"label":"Edge curve — profile","fmt":"signed2","visibleWhen":{"all":[{"id":"bloomType","oneOf":["bilateral"]},{"id":"bilPerSide","min":1}]}},
  {"id":"bilEdge2","section":"acc-form","kind":"select","options":[{"value":"default","text":"DEFAULT (GLOBAL TIP)"},{"value":"clean","text":"CLEAN"},{"value":"jagged","text":"SERRATED"},{"value":"ruffled","text":"RUFFLED"}],"default":"default","label":"Edge","visibleWhen":{"all":[{"id":"bloomType","oneOf":["bilateral"]},{"id":"bilPerSide","min":2}]}},
  {"id":"bilScale2","section":"acc-form","kind":"slider","min":0.3,"max":2,"step":0.05,"default":1,"label":"Scale","fmt":"f2x","visibleWhen":{"all":[{"id":"bloomType","oneOf":["bilateral"]},{"id":"bilPerSide","min":2}]}},
  {"id":"bilWidth2","section":"acc-form","kind":"slider","min":0.45,"max":1.5,"step":0.01,"default":0.9,"label":"Width","fmt":"f2","visibleWhen":{"all":[{"id":"bloomType","oneOf":["bilateral"]},{"id":"bilPerSide","min":2}]}},
  {"id":"bilCurlAmount2","section":"acc-form","kind":"slider","min":-1,"max":1,"step":0.01,"default":0.4,"label":"Spine curl","fmt":"signed2","visibleWhen":{"all":[{"id":"bloomType","oneOf":["bilateral"]},{"id":"bilPerSide","min":2}]}},
  {"id":"bilEdgeCurve2","section":"acc-form","kind":"slider","min":-1,"max":1,"step":0.01,"default":0,"label":"Edge curve — top-down","fmt":"signed2","visibleWhen":{"all":[{"id":"bloomType","oneOf":["bilateral"]},{"id":"bilPerSide","min":2}]}},
  {"id":"bilEdgeProfile2","section":"acc-form","kind":"slider","min":-1,"max":1,"step":0.01,"default":0,"label":"Edge curve — profile","fmt":"signed2","visibleWhen":{"all":[{"id":"bloomType","oneOf":["bilateral"]},{"id":"bilPerSide","min":2}]}},
  {"id":"bilEdge3","section":"acc-form","kind":"select","options":[{"value":"default","text":"DEFAULT (GLOBAL TIP)"},{"value":"clean","text":"CLEAN"},{"value":"jagged","text":"SERRATED"},{"value":"ruffled","text":"RUFFLED"}],"default":"default","label":"Edge","visibleWhen":{"all":[{"id":"bloomType","oneOf":["bilateral"]},{"id":"bilPerSide","min":3}]}},
  {"id":"bilScale3","section":"acc-form","kind":"slider","min":0.3,"max":2,"step":0.05,"default":1,"label":"Scale","fmt":"f2x","visibleWhen":{"all":[{"id":"bloomType","oneOf":["bilateral"]},{"id":"bilPerSide","min":3}]}},
  {"id":"bilWidth3","section":"acc-form","kind":"slider","min":0.45,"max":1.5,"step":0.01,"default":0.9,"label":"Width","fmt":"f2","visibleWhen":{"all":[{"id":"bloomType","oneOf":["bilateral"]},{"id":"bilPerSide","min":3}]}},
  {"id":"bilCurlAmount3","section":"acc-form","kind":"slider","min":-1,"max":1,"step":0.01,"default":0.4,"label":"Spine curl","fmt":"signed2","visibleWhen":{"all":[{"id":"bloomType","oneOf":["bilateral"]},{"id":"bilPerSide","min":3}]}},
  {"id":"bilEdgeCurve3","section":"acc-form","kind":"slider","min":-1,"max":1,"step":0.01,"default":0,"label":"Edge curve — top-down","fmt":"signed2","visibleWhen":{"all":[{"id":"bloomType","oneOf":["bilateral"]},{"id":"bilPerSide","min":3}]}},
  {"id":"bilEdgeProfile3","section":"acc-form","kind":"slider","min":-1,"max":1,"step":0.01,"default":0,"label":"Edge curve — profile","fmt":"signed2","visibleWhen":{"all":[{"id":"bloomType","oneOf":["bilateral"]},{"id":"bilPerSide","min":3}]}},
  {"id":"bloom","section":"acc-form","kind":"slider","min":0,"max":90,"step":1,"default":55,"label":"Bloom angle","fmt":"deg","tier":"standard"},
  {"id":"tightness","section":"acc-form","kind":"slider","min":0,"max":1,"step":0.01,"default":0.5,"label":"Petal spacing","fmt":"f2","visibleWhen":{"id":"bloomType","oneOf":["coiled"]},"tier":"standard"},
  {"id":"elevation","section":"acc-form","kind":"slider","min":-1,"max":1,"step":0.01,"default":0,"label":"Center elevation","fmt":"signed2","tier":"standard"},
  {"id":"variance","section":"acc-form","kind":"slider","min":0,"max":1,"step":0.01,"default":0,"label":"Organic variance","fmt":"f2","tier":"standard"},
  {"id":"curlGradient","section":"acc-form","kind":"slider","min":-1,"max":1,"step":0.01,"default":0,"label":"Curl gradient (edge → centre)","fmt":"signed2"},
  {"id":"sizeGradient","section":"acc-form","kind":"slider","min":-1,"max":1,"step":0.01,"default":0,"label":"Size gradient (centre → edge, single whorl only)","fmt":"signed2"},
  {"id":"petalShape","section":"acc-form","kind":"select","options":[{"value":"rounded","text":"ROUNDED"},{"value":"pointed","text":"POINTED"},{"value":"strap","text":"STRAP"},{"value":"clawed","text":"CLAWED"},{"value":"lobed","text":"LOBED"},{"value":"__custom","text":"CUSTOM","hidden":true,"disabled":true}],"default":"rounded","label":"Petal shape","tier":"standard","uiOnly":true},
  {"id":"width","section":"acc-form","kind":"slider","min":0.1,"max":1.5,"step":0.01,"default":0.9,"label":"Petal width","fmt":"f2","visibleWhen":{"not":{"id":"bloomType","oneOf":["bilateral"]}}},
  {"id":"taper","section":"acc-form","kind":"slider","min":0,"max":1,"step":0.01,"default":0.35,"label":"Taper","fmt":"f2"},
  {"id":"clawLength","section":"acc-form","kind":"slider","min":0,"max":0.5,"step":0.01,"default":0,"label":"Claw length","fmt":"f2"},
  {"id":"clawWidth","section":"acc-form","kind":"slider","min":0.05,"max":0.6,"step":0.01,"default":0.3,"label":"Claw width","fmt":"f2","visibleWhen":{"id":"clawLength","min":0.01}},
  {"id":"shoulder","section":"acc-form","kind":"slider","min":0,"max":1,"step":0.01,"default":0.5,"label":"Shoulder","fmt":"f2","visibleWhen":{"id":"clawLength","min":0.01}},
  {"id":"cleftDepth","section":"acc-form","kind":"slider","min":0,"max":0.6,"step":0.01,"default":0,"label":"Cleft depth","fmt":"f2"},
  {"id":"cleftLobes","section":"acc-form","kind":"slider","min":2,"max":7,"step":1,"default":2,"label":"Lobe count","fmt":"int","visibleWhen":{"id":"cleftDepth","min":0.01}},
  {"id":"cleftWidth","section":"acc-form","kind":"slider","min":0.05,"max":1,"step":0.01,"default":0.3,"label":"Cleft width","fmt":"f2","visibleWhen":{"id":"cleftDepth","min":0.01}},
  {"id":"curlAmount","section":"acc-form","kind":"slider","min":-1,"max":1,"step":0.01,"default":0.4,"label":"Spine curl","fmt":"signed2","visibleWhen":{"not":{"id":"bloomType","oneOf":["bilateral"]}}},
  {"id":"curlBias","section":"acc-form","kind":"slider","min":0,"max":1,"step":0.01,"default":0,"label":"Curl bias","fmt":"f2"},
  {"id":"curlStart","section":"acc-form","kind":"slider","min":0,"max":0.95,"step":0.01,"default":0,"label":"Curl start","fmt":"f2"},
  {"id":"edgeCurve","section":"acc-form","kind":"slider","min":-1,"max":1,"step":0.01,"default":0,"label":"Edge curve — top-down","fmt":"signed2","visibleWhen":{"not":{"id":"bloomType","oneOf":["bilateral"]}}},
  {"id":"edgeProfile","section":"acc-form","kind":"slider","min":-1,"max":1,"step":0.01,"default":0,"label":"Edge curve — profile","fmt":"signed2","visibleWhen":{"not":{"id":"bloomType","oneOf":["bilateral"]}}},
  {"id":"petalCup","section":"acc-form","kind":"slider","min":-1,"max":1,"step":0.01,"default":0,"label":"Petal cup","fmt":"signed2"},
  {"id":"crossSection","section":"acc-form","kind":"slider","min":-1,"max":1,"step":0.01,"default":0,"label":"Cross-section roll","fmt":"signed2"},
  {"id":"crossSectionTaper","section":"acc-form","kind":"slider","min":-1,"max":1,"step":0.01,"default":0,"label":"Cross-section taper","fmt":"signed2"},
  {"id":"reliefAmp","section":"acc-form","kind":"slider","min":0,"max":1,"step":0.01,"default":0,"label":"Surface relief","fmt":"f2"},
  {"id":"reliefFreq","section":"acc-form","kind":"slider","min":0,"max":1,"step":0.01,"default":0.5,"label":"Relief frequency","fmt":"f2"},
  {"id":"reliefMode","section":"acc-form","kind":"select","options":[{"value":"radial","text":"Radial (ribs from base)"},{"value":"transverse","text":"Transverse"},{"value":"irregular","text":"Irregular (bullate)"}],"default":"radial","label":"Relief pattern"},
  {"id":"petalTwist","section":"acc-form","kind":"slider","min":-1,"max":1,"step":0.01,"default":0,"label":"Twist","fmt":"signed2"},
  {"id":"petalSkew","section":"acc-form","kind":"slider","min":-1,"max":1,"step":0.01,"default":0,"label":"Skew","fmt":"signed2"},
  {"id":"thickTaper","section":"acc-form","kind":"slider","min":0,"max":1,"step":0.01,"default":0,"label":"Thickness taper","fmt":"f2"},
  {"id":"thickEdge","section":"acc-form","kind":"slider","min":0,"max":1,"step":0.01,"default":0,"label":"Edge knife","fmt":"f2"},
  {"id":"thickScale","section":"acc-form","kind":"slider","min":0.5,"max":2,"step":0.01,"default":1,"label":"Thickness","fmt":"f2"},
  {"id":"layerCount","section":"acc-form","kind":"slider","min":1,"max":6,"step":1,"default":1,"label":"Layer count","fmt":"int"},
  {"id":"petalsPerLayer","section":"acc-form","kind":"text","default":"","label":"Petals per layer","visibleWhen":{"id":"layerCount","min":2}},
  {"id":"layerSizeFalloff","section":"acc-form","kind":"slider","min":0.3,"max":1,"step":0.01,"default":0.75,"label":"Layer size falloff","fmt":"f2x","visibleWhen":{"id":"layerCount","min":2}},
  {"id":"layerHeightOffset","section":"acc-form","kind":"slider","min":-0.3,"max":0.3,"step":0.01,"default":0.05,"label":"Layer height offset","fmt":"signed2","visibleWhen":{"id":"layerCount","min":2}},
  {"id":"layerRotationOffset","section":"acc-form","kind":"slider","min":0,"max":90,"step":1,"default":24,"label":"Layer rotation offset","fmt":"deg","visibleWhen":{"id":"layerCount","min":2}},
  {"id":"layerBloomAngleDelta","section":"acc-form","kind":"slider","min":0,"max":40,"step":1,"default":12,"label":"Layer bloom angle delta","fmt":"deg","visibleWhen":{"id":"layerCount","min":2}},
  {"id":"infillType","section":"acc-lace","kind":"select","options":[{"value":"veins","text":"VEINS"},{"value":"voronoi","text":"CELLS"},{"value":"strands","text":"STRANDS"},{"value":"bone","text":"LATTICE"},{"value":"spacecol","text":"GROWTH"}],"default":"veins","label":"Pattern","tier":"standard"},
  {"id":"spaceMode","section":"acc-lace","kind":"select","options":[{"value":"open","text":"OPEN"},{"value":"closed","text":"CLOSED"}],"default":"closed","label":"Network","visibleWhen":{"id":"infillType","oneOf":["spacecol"]}},
  {"id":"spacePattern","section":"acc-lace","kind":"select","options":[{"value":"phyllotactic","text":"PHYLLOTACTIC"},{"value":"lattice","text":"JITTERED LATTICE"},{"value":"random","text":"RANDOM"}],"default":"phyllotactic","label":"Seed pattern","visibleWhen":{"id":"infillType","oneOf":["spacecol"]}},
  {"id":"spaceDensity","section":"acc-lace","kind":"slider","min":0,"max":1,"step":0.01,"default":0.5,"label":"Source density","fmt":"f2","visibleWhen":{"id":"infillType","oneOf":["spacecol"]}},
  {"id":"spaceBirth","section":"acc-lace","kind":"slider","min":0.03,"max":0.2,"step":0.005,"default":0.06,"label":"Birth distance","fmt":"f3","visibleWhen":{"id":"infillType","oneOf":["spacecol"]}},
  {"id":"spaceKill","section":"acc-lace","kind":"slider","min":0.02,"max":0.15,"step":0.005,"default":0.045,"label":"Kill distance","fmt":"f3","visibleWhen":{"id":"infillType","oneOf":["spacecol"]}},
  {"id":"spaceStep","section":"acc-lace","kind":"slider","min":0.02,"max":0.12,"step":0.005,"default":0.04,"label":"Growth step","fmt":"f3","visibleWhen":{"id":"infillType","oneOf":["spacecol"]}},
  {"id":"spaceVariants","section":"acc-lace","kind":"slider","min":1,"max":6,"step":1,"default":3,"label":"Network variants","fmt":"int","visibleWhen":{"id":"infillType","oneOf":["spacecol"]}},
  {"id":"density","section":"acc-lace","kind":"slider","min":3,"max":12,"step":1,"default":7,"label":"Density","fmt":"int","visibleWhen":{"id":"infillType","oneOf":["veins","voronoi"]},"tier":"standard"},
  {"id":"softness","section":"acc-lace","kind":"slider","min":0,"max":1,"step":0.01,"default":0.75,"label":"Vein detail","fmt":"f2","visibleWhen":{"id":"infillType","oneOf":["veins","voronoi"]},"tier":"standard"},
  {"id":"veinBranchStart","section":"acc-lace","kind":"slider","min":0,"max":0.6,"step":0.01,"default":0.05,"label":"First branch","fmt":"f2","visibleWhen":{"id":"infillType","oneOf":["veins"]}},
  {"id":"edgeTermination","section":"acc-lace","kind":"select","options":[{"value":"fade","text":"FADE"},{"value":"meet","text":"MEET"},{"value":"loop","text":"LOOP"}],"default":"loop","label":"Edge termination","visibleWhen":{"id":"infillType","oneOf":["veins","bone","spacecol"]}},
  {"id":"captureDist","section":"acc-lace","kind":"slider","min":0.02,"max":0.4,"step":0.01,"default":0.12,"label":"Capture distance","fmt":"f2","divId":"captureDistCtrl","visibleWhen":{"all":[{"id":"infillType","oneOf":["veins","bone","spacecol"]},{"not":{"id":"edgeTermination","oneOf":["fade"]}}]}},
  {"id":"voronoiLloyd","section":"acc-lace","kind":"slider","min":0,"max":20,"step":1,"default":8,"label":"Cell relaxation","fmt":"int","visibleWhen":{"id":"infillType","oneOf":["voronoi"]}},
  {"id":"voronoiDensityLaw","section":"acc-lace","kind":"slider","min":0,"max":1,"step":0.01,"default":0,"label":"Cell density law","fmt":"f2","visibleWhen":{"id":"infillType","oneOf":["voronoi"]}},
  {"id":"voronoiAniso","section":"acc-lace","kind":"slider","min":1,"max":4,"step":0.05,"default":1,"label":"Anisotropy","fmt":"f1x","visibleWhen":{"id":"infillType","oneOf":["voronoi"]}},
  {"id":"voronoiWeight","section":"acc-lace","kind":"slider","min":0,"max":1,"step":0.01,"default":0,"label":"Weight hierarchy","fmt":"f2","visibleWhen":{"id":"infillType","oneOf":["voronoi"]}},
  {"id":"voronoiWeightFalloff","section":"acc-lace","kind":"slider","min":0,"max":4,"step":0.1,"default":1.5,"label":"Weight falloff","fmt":"f1","visibleWhen":{"id":"infillType","oneOf":["voronoi"]}},
  {"id":"voronoiSlabTaper","section":"acc-lace","kind":"slider","min":0,"max":1,"step":0.01,"default":0,"label":"Slab taper","fmt":"f2","visibleWhen":{"id":"infillType","oneOf":["voronoi"]}},
  {"id":"strandCount","section":"acc-lace","kind":"slider","min":4,"max":44,"step":1,"default":20,"label":"Strand count","fmt":"int","visibleWhen":{"id":"infillType","oneOf":["strands"]}},
  {"id":"strandWidth","section":"acc-lace","kind":"slider","min":0,"max":1,"step":0.01,"default":0.5,"label":"Strand width","fmt":"f2","visibleWhen":{"id":"infillType","oneOf":["strands"]}},
  {"id":"strandTaper","section":"acc-lace","kind":"slider","min":0,"max":1,"step":0.01,"default":0.5,"label":"Strand taper","fmt":"f2","visibleWhen":{"id":"infillType","oneOf":["strands"]}},
  {"id":"strandCurvature","section":"acc-lace","kind":"slider","min":0,"max":1,"step":0.01,"default":0.4,"label":"Strand curvature","fmt":"f2","visibleWhen":{"id":"infillType","oneOf":["strands"]}},
  {"id":"strandIrregularity","section":"acc-lace","kind":"slider","min":0,"max":1,"step":0.01,"default":0.35,"label":"Irregularity","fmt":"f2","visibleWhen":{"id":"infillType","oneOf":["strands"]}},
  {"id":"boneCount","section":"acc-lace","kind":"slider","min":4,"max":40,"step":1,"default":18,"label":"Bone count","fmt":"int","visibleWhen":{"id":"infillType","oneOf":["bone"]}},
  {"id":"boneWidth","section":"acc-lace","kind":"slider","min":0,"max":3,"step":0.01,"default":0.5,"label":"Bone width","fmt":"f2","visibleWhen":{"id":"infillType","oneOf":["bone"]}},
  {"id":"boneCurve","section":"acc-lace","kind":"slider","min":-1,"max":1,"step":0.01,"default":0.55,"label":"Bone curve","fmt":"signed2","visibleWhen":{"id":"infillType","oneOf":["bone"]}},
  {"id":"boneSpread","section":"acc-lace","kind":"slider","min":0,"max":1,"step":0.01,"default":0.85,"label":"Bone spread","fmt":"f2","visibleWhen":{"id":"infillType","oneOf":["bone"]}},
  {"id":"boneOutline","section":"acc-lace","kind":"checkbox","default":true,"label":"Petal outline","visibleWhen":{"id":"infillType","oneOf":["bone"]}},
  // SCALLOPED is UNLISTED BUT LIVE: hidden + disabled, so it cannot be picked, while the
  // value stays reserved and still builds. Each scallop arc bulges off a treatment-blind
  // material boundary with nothing filling it — an empty lens ~6.7 mm deep at the default
  // height, ~11.0 mm at height 1.0 (measured). It was NOT hard to reach: `advancedOnly`
  // appears nowhere in this file, so ADV_OPTIONS is {} and this control is tier "standard"
  // — it was two clicks from the default landing state. Delisted rather than deleted so a
  // saved design keeps rendering byte-identically (no migration, no geometry movement);
  // it returns by removing these two flags. See docs/flower-rim-treatment-registration.md.
  {"id":"tipStyle","section":"acc-edge","kind":"select","options":[{"value":"clean","text":"CLEAN"},{"value":"jagged","text":"TOOTHED"},{"value":"scallop","text":"SCALLOPED","hidden":true,"disabled":true},{"value":"ruffled","text":"RUFFLED"}],"default":"clean","label":"Edge","tier":"standard"},
  {"id":"tip","section":"acc-edge","kind":"slider","min":0,"max":1,"step":0.01,"default":0.5,"label":"Tip shape","fmt":"f2","tier":"standard"},
  {"id":"tipFineness","section":"acc-edge","kind":"slider","min":0,"max":1,"step":0.01,"default":0,"label":"Tip fineness","fmt":"f2","tier":"standard"},
  {"id":"tipFrequency","section":"acc-edge","kind":"slider","min":1,"max":40,"step":1,"default":14,"label":"Tip frequency","fmt":"int","visibleWhen":{"id":"tipStyle","oneOf":["jagged","ruffled"]}},
  {"id":"tipRegion","section":"acc-edge","kind":"slider","min":0,"max":1,"step":0.01,"default":0.25,"label":"Tip region","fmt":"f2","visibleWhen":{"id":"tipStyle","oneOf":["jagged"]}},
  {"id":"tipLength","section":"acc-edge","kind":"slider","min":0,"max":1,"step":0.01,"default":0.3,"label":"Tip length","fmt":"f2","visibleWhen":{"id":"tipStyle","oneOf":["jagged","ruffled"]}},
  {"id":"tipIrregularity","section":"acc-edge","kind":"slider","min":0,"max":1,"step":0.01,"default":0,"label":"Tip irregularity","fmt":"f2","visibleWhen":{"id":"tipStyle","oneOf":["jagged"]}},
  {"id":"scallopCount","section":"acc-edge","kind":"slider","min":2,"max":30,"step":1,"default":9,"label":"Scallop count","fmt":"int","visibleWhen":{"id":"tipStyle","oneOf":["scallop"]}},
  {"id":"scallopHeight","section":"acc-edge","kind":"slider","min":0,"max":1,"step":0.01,"default":0.4,"label":"Scallop height","fmt":"f2","visibleWhen":{"id":"tipStyle","oneOf":["scallop"]}},
  {"id":"edgeNoise","section":"acc-edge","kind":"slider","min":0,"max":1,"step":0.01,"default":0,"label":"Edge noise","fmt":"f2","tier":"standard","standardVisibleWhen":{"id":"tipStyle","oneOf":["ruffled"]}},
  {"id":"edgeNoiseScale","section":"acc-edge","kind":"slider","min":0,"max":1,"step":0.01,"default":0,"label":"Edge noise scale","fmt":"f2"},
  {"id":"centerArch","section":"acc-base","kind":"select","options":[{"value":"classic","text":"CLASSIC"},{"value":"dense","text":"DENSE CLUSTER"},{"value":"disc","text":"DISC"},{"value":"petaloid","text":"PETALOID FILL"}],"default":"classic","label":"Center type","tier":"standard"},
  {"id":"centerType","section":"acc-base","kind":"select","options":[{"value":"stamens","text":"STAMENS"},{"value":"pistil","text":"PISTIL"},{"value":"none","text":"NONE"}],"default":"stamens","label":"Classic style","visibleWhen":{"id":"centerArch","oneOf":["classic"]}},
  {"id":"centerCount","section":"acc-base","kind":"slider","min":1,"max":60,"step":1,"default":14,"label":"Amount","fmt":"int","visibleWhen":{"all":[{"id":"centerArch","oneOf":["classic"]},{"id":"centerType","oneOf":["stamens","pistil"]}]}},
  {"id":"centerLength","section":"acc-base","kind":"slider","min":0,"max":3,"step":0.01,"default":0.5,"label":"Length","fmt":"f2","visibleWhen":{"all":[{"id":"centerArch","oneOf":["classic"]},{"id":"centerType","oneOf":["stamens","pistil"]}]}},
  {"id":"centerFilThick","section":"acc-base","kind":"slider","min":0,"max":1,"step":0.01,"default":0.5,"label":"Filament thickness","fmt":"f2","visibleWhen":{"all":[{"id":"centerArch","oneOf":["classic"]},{"id":"centerType","oneOf":["stamens","pistil"]}]}},
  {"id":"centerTipSize","section":"acc-base","kind":"slider","min":0,"max":1,"step":0.01,"default":0.35,"label":"Tip size","fmt":"f2","visibleWhen":{"all":[{"id":"centerArch","oneOf":["classic"]},{"id":"centerType","oneOf":["stamens","pistil"]}]}},
  {"id":"centerTipShape","section":"acc-base","kind":"slider","min":0,"max":1,"step":0.01,"default":0,"label":"Tip shape","fmt":"f2","visibleWhen":{"all":[{"id":"centerArch","oneOf":["classic"]},{"id":"centerType","oneOf":["stamens","pistil"]}]}},
  {"id":"denseStamenCount","section":"acc-base","kind":"slider","min":10,"max":200,"step":1,"default":80,"label":"Stamen count","fmt":"int","visibleWhen":{"id":"centerArch","oneOf":["dense"]}},
  {"id":"denseStamenLength","section":"acc-base","kind":"slider","min":0,"max":1,"step":0.01,"default":0.4,"label":"Stamen length","fmt":"f2","visibleWhen":{"id":"centerArch","oneOf":["dense"]}},
  {"id":"carpelCount","section":"acc-base","kind":"slider","min":1,"max":10,"step":1,"default":5,"label":"Carpel count","fmt":"int","visibleWhen":{"id":"centerArch","oneOf":["dense"]}},
  {"id":"carpelSize","section":"acc-base","kind":"slider","min":0,"max":1,"step":0.01,"default":0.5,"label":"Carpel size","fmt":"f2","visibleWhen":{"id":"centerArch","oneOf":["dense"]}},
  {"id":"discSize","section":"acc-base","kind":"slider","min":0,"max":1,"step":0.01,"default":0.5,"label":"Disc size","fmt":"f2","visibleWhen":{"id":"centerArch","oneOf":["disc"]}},
  {"id":"discHeight","section":"acc-base","kind":"slider","min":0,"max":1,"step":0.01,"default":0.5,"label":"Disc height","fmt":"f2","visibleWhen":{"id":"centerArch","oneOf":["disc"]}},
  {"id":"ringStamenCount","section":"acc-base","kind":"slider","min":0,"max":150,"step":1,"default":40,"label":"Ring stamen count","fmt":"int","visibleWhen":{"id":"centerArch","oneOf":["disc"]}},
  {"id":"ringStamenLength","section":"acc-base","kind":"slider","min":0,"max":1,"step":0.01,"default":0.35,"label":"Ring stamen length","fmt":"f2","visibleWhen":{"id":"centerArch","oneOf":["disc"]}},
  {"id":"fillPetalCount","section":"acc-base","kind":"slider","min":12,"max":200,"step":1,"default":60,"label":"Fill petal count","fmt":"int","visibleWhen":{"id":"centerArch","oneOf":["petaloid"]}},
  {"id":"fillOuterSize","section":"acc-base","kind":"slider","min":0.05,"max":0.5,"step":0.01,"default":0.22,"label":"Outer fill size","fmt":"f2","visibleWhen":{"id":"centerArch","oneOf":["petaloid"]}},
  {"id":"fillInnerSize","section":"acc-base","kind":"slider","min":0.03,"max":0.5,"step":0.01,"default":0.1,"label":"Inner fill size","fmt":"f2","visibleWhen":{"id":"centerArch","oneOf":["petaloid"]}},
  {"id":"fillDensity","section":"acc-base","kind":"slider","min":0,"max":1,"step":0.01,"default":0.6,"label":"Fill density","fmt":"f2","visibleWhen":{"id":"centerArch","oneOf":["petaloid"]}},
  {"id":"fillBloomAngle","section":"acc-base","kind":"slider","min":0,"max":90,"step":1,"default":30,"label":"Fill bloom angle","fmt":"rounddeg","visibleWhen":{"id":"centerArch","oneOf":["petaloid"]}},
  {"id":"continuousMargin","section":"acc-base","kind":"select","options":[{"value":"off","text":"OFF"},{"value":"on","text":"ON"}],"default":"on","label":"Continuous margin"},
  // ---- JUNCTION vs ORNAMENT ------------------------------------------------------
  // The controls below (through bulbHeight) all sit under one flat "Receptacle"
  // block, but they are two different things wearing one name:
  //   role:"junction"  — shapes the minimal connective geometry that makes the
  //     model one watertight solid. Its PRESENCE is not a control and no longer a
  //     condition either: since #84 every design builds one, so these tags only
  //     shape how that always-present connective mass blends and tapers. Its SIZE
  //     is derived too — the descent range depends on whether a stem or a side
  //     bud's branch is underneath to receive it (DEPTH_* in flower.js).
  //   role:"ornament"  — decorative choices about what the base LOOKS like
  //     (profile silhouette, wall construction, collar, rib styling). Optional in
  //     spirit even though today's gating ties their visibility to the derived
  //     junction being present; per the flower-project skill, this is the same
  //     "decorative structure below the bloom" family as sepals.
  // No ids, defaults, gating, or behaviour change here — annotation only, so the
  // future base-ornament work extends this block instead of untangling it first.
  {"id":"bundleTightness","section":"acc-base","kind":"slider","min":0,"max":1,"step":0.01,"default":0.5,"label":"Bundle tightness","fmt":"f2","visibleWhen":{"id":"continuousMargin","oneOf":["on"]},"role":"junction"},
  {"id":"flareRate","section":"acc-base","kind":"slider","min":0,"max":1,"step":0.01,"default":0.5,"label":"Flare rate","fmt":"f2","visibleWhen":{"id":"continuousMargin","oneOf":["on"]},"role":"junction"},
  {"id":"absorption","section":"acc-base","kind":"slider","min":0,"max":1,"step":0.01,"default":0.6,"label":"Absorption","fmt":"f2","visibleWhen":{"id":"continuousMargin","oneOf":["on"]},"role":"junction"},
  {"id":"buttonSize","section":"acc-base","kind":"slider","min":0,"max":1,"step":0.01,"default":0.05,"label":"Neck swell","fmt":"f2","visibleWhen":{"id":"continuousMargin","oneOf":["on"]},"role":"junction"},
  {"id":"gatherHeight","section":"acc-base","kind":"slider","min":0.05,"max":0.6,"step":0.01,"default":0.15,"label":"Gather height","fmt":"f2","visibleWhen":{"id":"continuousMargin","oneOf":["on"]},"role":"junction"},
  {"id":"receptacleType","section":"acc-base","kind":"select","options":[{"value":"none","text":"NONE"},{"value":"on","text":"ON"}],"default":"none","label":"Receptacle","divId":"receptacleTypeCtrl","role":"junction","visibleWhen":{"any":[]},"hiddenReason":"INERT since #84. It used to force the junction on for designs saved before the junction became derived; the junction is now built for every design, so this control changes nothing whatever its value. The id stays because it is persisted in saved designs and in every preset — removing it is a migration, and that belongs with the base-ornament work that will replace this block. Do not unhide it: it would be a control that does nothing."},
  {"id":"receptProfile","section":"acc-base","kind":"select","options":[{"value":"flare","text":"FLARE"},{"value":"dome","text":"DOME"},{"value":"cone","text":"CONE"},{"value":"urn","text":"URN"},{"value":"gentle","text":"GENTLE"}],"default":"flare","label":"Profile","role":"ornament"},
  {"id":"receptConstruction","section":"acc-base","kind":"select","options":[{"value":"solid","text":"SOLID"},{"value":"ribbed","text":"RIBBED"},{"value":"cored","text":"CORED"}],"default":"solid","label":"Construction","visibleWhen":{"id":"continuousMargin","oneOf":["off"]},"role":"ornament"},
  {"id":"receptCollar","section":"acc-base","kind":"select","options":[{"value":"none","text":"NONE"},{"value":"band","text":"BAND"},{"value":"ferrule","text":"FERRULE"}],"default":"none","label":"Collar","visibleWhen":{"id":"continuousMargin","oneOf":["off"]},"role":"ornament"},
  {"id":"receptReach","section":"acc-base","kind":"slider","min":0,"max":1,"step":0.01,"default":0,"label":"Reach","fmt":"f2","visibleWhen":{"id":"continuousMargin","oneOf":["off"]},"role":"ornament"},
  {"id":"blendSmoothness","section":"acc-base","kind":"slider","min":0,"max":1,"step":0.01,"default":0.5,"label":"Blend smoothness","fmt":"f2","role":"junction","visibleWhen":{"id":"continuousMargin","oneOf":["off"]}},
  {"id":"receptacleDepth","section":"acc-base","kind":"slider","min":0,"max":1,"step":0.01,"default":0.5,"label":"Receptacle depth","fmt":"f2","role":"junction"},
  {"id":"convergenceTightness","section":"acc-base","kind":"slider","min":0,"max":1,"step":0.01,"default":0.5,"label":"Convergence tightness","fmt":"f2","role":"junction","visibleWhen":{"id":"continuousMargin","oneOf":["off"]}},
  {"id":"receptSolidity","section":"acc-base","kind":"slider","min":0,"max":1,"step":0.01,"default":1,"label":"Solidity","fmt":"f2","visibleWhen":{"all":[{"id":"receptConstruction","oneOf":["ribbed","cored"]},{"id":"continuousMargin","oneOf":["off"]}]},"role":"ornament"},
  {"id":"ribMultiplier","section":"acc-base","kind":"slider","min":0.5,"max":3,"step":0.05,"default":1,"label":"Rib multiplier","fmt":"f2","visibleWhen":{"all":[{"id":"receptConstruction","oneOf":["ribbed","cored"]},{"id":"continuousMargin","oneOf":["off"]}]},"role":"ornament"},
  {"id":"spiralTightness","section":"acc-base","kind":"slider","min":0,"max":1,"step":0.01,"default":0.12,"label":"Rib tightness","fmt":"f2","visibleWhen":{"all":[{"id":"receptConstruction","oneOf":["ribbed","cored"]},{"id":"continuousMargin","oneOf":["off"]}]},"role":"ornament"},
  {"id":"spiralThickness","section":"acc-base","kind":"slider","min":0,"max":1,"step":0.01,"default":0.5,"label":"Rib thickness","fmt":"f2","visibleWhen":{"all":[{"id":"receptConstruction","oneOf":["ribbed","cored"]},{"id":"continuousMargin","oneOf":["off"]}]},"role":"ornament"},
  {"id":"bulbSize","section":"acc-base","kind":"slider","min":0,"max":1,"step":0.01,"default":0.5,"label":"Bulb size","fmt":"f2","visibleWhen":{"all":[{"id":"receptProfile","oneOf":["dome"]},{"id":"continuousMargin","oneOf":["off"]}]},"role":"ornament"},
  {"id":"bulbHeight","section":"acc-base","kind":"slider","min":0,"max":1,"step":0.01,"default":0.5,"label":"Bulb height","fmt":"f2","visibleWhen":{"all":[{"id":"receptProfile","oneOf":["dome"]},{"id":"continuousMargin","oneOf":["off"]}]},"role":"ornament"},
  {"id":"sepalsType","section":"acc-base","kind":"select","options":[{"value":"none","text":"NONE"},{"value":"sepals","text":"SEPALS"}],"default":"none","label":"Sepals","tier":"standard"},
  {"id":"sepalSize","section":"acc-base","kind":"slider","min":0.1,"max":1.5,"step":0.05,"default":0.6,"label":"Sepal size","fmt":"f2","visibleWhen":{"not":{"id":"sepalsType","oneOf":["none"]}}},
  {"id":"sepalCount","section":"acc-base","kind":"slider","min":3,"max":24,"step":1,"default":5,"label":"Sepal count","fmt":"int","visibleWhen":{"not":{"id":"sepalsType","oneOf":["none"]}}},
  {"id":"sepalStyle","section":"acc-base","kind":"select","options":[{"value":"strap","text":"MODIFIED LEAF"},{"value":"solid","text":"SOLID"}],"default":"strap","label":"Sepal style","visibleWhen":{"not":{"id":"sepalsType","oneOf":["none"]}}},
  {"id":"sepalCenterCurve","section":"acc-base","kind":"slider","min":-1,"max":1,"step":0.01,"default":0.85,"label":"Sepal center curve","fmt":"signed2","visibleWhen":{"not":{"id":"sepalsType","oneOf":["none"]}}},
  {"id":"sepalEdgeCurve","section":"acc-base","kind":"slider","min":-1,"max":1,"step":0.01,"default":-0.25,"label":"Sepal edge curve — top-down","fmt":"signed2","visibleWhen":{"not":{"id":"sepalsType","oneOf":["none"]}}},
  {"id":"sepalEdgeProfile","section":"acc-base","kind":"slider","min":-1,"max":1,"step":0.01,"default":0,"label":"Sepal edge curve — profile","fmt":"signed2","visibleWhen":{"not":{"id":"sepalsType","oneOf":["none"]}}},
  {"id":"sepalTipStyle","section":"acc-base","kind":"select","options":[{"value":"clean","text":"CLEAN"},{"value":"jagged","text":"SERRATED"}],"default":"clean","label":"Sepal tip style","visibleWhen":{"not":{"id":"sepalsType","oneOf":["none"]}}},
  {"id":"sepalTipShape","section":"acc-base","kind":"slider","min":0,"max":1,"step":0.01,"default":0.9,"label":"Sepal tip shape","fmt":"f2","visibleWhen":{"all":[{"not":{"id":"sepalsType","oneOf":["none"]}},{"id":"sepalTipStyle","oneOf":["jagged"]}]}},
  {"id":"sepalTipFreq","section":"acc-base","kind":"slider","min":1,"max":40,"step":1,"default":12,"label":"Sepal tip frequency","fmt":"int","visibleWhen":{"all":[{"not":{"id":"sepalsType","oneOf":["none"]}},{"id":"sepalTipStyle","oneOf":["jagged"]}]}},
  {"id":"sepalTipRegion","section":"acc-base","kind":"slider","min":0,"max":1,"step":0.01,"default":0.3,"label":"Sepal tip region","fmt":"f2","visibleWhen":{"all":[{"not":{"id":"sepalsType","oneOf":["none"]}},{"id":"sepalTipStyle","oneOf":["jagged"]}]}},
  {"id":"sepalTipLength","section":"acc-base","kind":"slider","min":0,"max":1,"step":0.01,"default":0.4,"label":"Sepal tip length","fmt":"f2","visibleWhen":{"all":[{"not":{"id":"sepalsType","oneOf":["none"]}},{"id":"sepalTipStyle","oneOf":["jagged"]}]}},
  {"id":"stemType","section":"acc-base","kind":"select","options":[{"value":"none","text":"NONE"},{"value":"stem","text":"STEM"}],"default":"none","label":"Stem","tier":"standard"},
  {"id":"stemLength","section":"acc-base","kind":"slider","min":0,"max":10,"step":0.05,"default":4,"label":"Stem length","fmt":"f2","visibleWhen":{"not":{"id":"stemType","oneOf":["none"]}}},
  {"id":"stemCurve","section":"acc-base","kind":"slider","min":-1,"max":1,"step":0.01,"default":0,"label":"Stem curve","fmt":"signed2","visibleWhen":{"any":[]},"hiddenReason":"Never reachable since it shipped, so its geometry path has never been exported at a non-zero value. PR 3 unhides it into Advanced and adds export-gate configs at -1/0/+1."},
  {"id":"stemThickness","section":"acc-base","kind":"slider","min":0.5,"max":3,"step":0.05,"default":1,"label":"Stem thickness","fmt":"f2","visibleWhen":{"not":{"id":"stemType","oneOf":["none"]}}},
  {"id":"stemNodeCount","section":"acc-base","kind":"slider","min":0,"max":8,"step":1,"default":3,"label":"Leaf nodes","fmt":"int","visibleWhen":{"not":{"id":"stemType","oneOf":["none"]}}},
  {"id":"stemNodeProminence","section":"acc-base","kind":"slider","min":0,"max":1,"step":0.01,"default":0.4,"label":"Node prominence","fmt":"f2","visibleWhen":{"not":{"id":"stemType","oneOf":["none"]}}},
  {"id":"stemBudMode","section":"acc-base","kind":"select","options":[{"value":"none","text":"NONE"},{"value":"tight","text":"TIGHT BUD"},{"value":"early","text":"EARLY BLOOM"}],"default":"none","label":"Side bud","visibleWhen":{"not":{"id":"stemType","oneOf":["none"]}}},
  {"id":"leafType","section":"acc-base","kind":"select","options":[{"value":"none","text":"NONE"},{"value":"compound","text":"COMPOUND (ROSE)"},{"value":"lobed","text":"LOBED (POPPY)"},{"value":"oval","text":"OVAL ON PETIOLE"},{"value":"narrow","text":"NARROW"}],"default":"none","label":"Leaves","visibleWhen":{"not":{"id":"stemType","oneOf":["none"]}},"tier":"standard"},
  {"id":"leafPhyllotaxy","section":"acc-base","kind":"select","options":[{"value":"alternate","text":"ALTERNATE"},{"value":"opposite","text":"OPPOSITE"},{"value":"whorled","text":"WHORLED"}],"default":"alternate","label":"Leaf arrangement","visibleWhen":{"all":[{"not":{"id":"stemType","oneOf":["none"]}},{"not":{"id":"leafType","oneOf":["none"]}}]}},
  {"id":"leafSize","section":"acc-base","kind":"slider","min":0.2,"max":3,"step":0.05,"default":1,"label":"Leaf size","fmt":"f2","visibleWhen":{"all":[{"not":{"id":"stemType","oneOf":["none"]}},{"not":{"id":"leafType","oneOf":["none"]}}]}},
  {"id":"heightMM","section":"acc-make","kind":"slider","min":40,"max":300,"step":5,"default":120,"label":"Size","fmt":"mm","tier":"standard"},
  {"id":"process","section":"acc-make","kind":"select","options":[{"value":"sls","text":"SLS NYLON"},{"value":"sla","text":"RESIN SLA"},{"value":"fdm","text":"FDM 0.4MM"}],"default":"sls","label":"Process","tier":"standard"},
  {"id":"tube","section":"acc-make","kind":"slider","min":0,"max":1,"step":0.01,"default":0.4,"label":"Tube thickness","fmt":"f2","visibleWhen":{"any":[]},"hiddenReason":"NOT a petal-thickness control: it is the master length scale for every tube/bead primitive — petal veins, stamens, stem, receptacle ribs, and the junction neck and feet. It needs a home and a name that says \"global scale\" in the panel restructure, not an unhide here. thickScale already provides petal thickness and is reachable."},
];
