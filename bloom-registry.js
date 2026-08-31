/* ===================================================================
   bloom-registry.js — SINGLE SOURCE OF TRUTH for the Parametric Bloom control
   panel, from the very first control.

   One row per control: id / kind / range / default / label / fmt / tier /
   visibleWhen. bloom.js GENERATES the panel DOM from this array and derives
   inputs, readUI, DEFAULTS, reset, labels and listeners from the same rows.
   There is deliberately NO hand-written control markup anywhere: the flower
   keeps its markup in flower.html and needs a sync gate (verify-registry-sync)
   to police drift between two representations; here the second representation
   does not exist, so the drift cannot. (What that leaves unproven — that the
   app actually RENDERS and REACTS to these rows — is a different property, and
   it is checked through the real UI by tools/shot-bloom.mjs and the gates'
   read-back assertions, never assumed from this file being correct.)

   Charter: docs/bloom-charter.md. Procedures: the flower-project skill.
   =================================================================== */

/* RETIRED_IDS — names that may never be used again.
   Empty today, structurally present from day one: when the first control is
   deleted, its entry goes here (id + why + the version it retired at), because
   saved designs and shared links will carry old keys indefinitely and a
   reclaimed name silently feeds a stale value into a control that means
   something else. The bloom has no save/load or schema machinery yet — the
   first feature that persists a design must add CURRENT_SCHEMA + migrations,
   and retirement grows the extra steps the flower's registry documents
   (schema bump + a migration that DELETES the key). Never remove an entry. */
export const RETIRED_IDS = [];

/* VISIBILITY PREDICATES — the condition itself, never a name for one.
   Same structured grammar as the flower registry (kept introspectable rather
   than opaque closures, so a disclosure layer can explain WHY something is
   hidden):

     { id, oneOf: [...] }        control `id`'s value is one of these
                                 (a choice control's option value, or a
                                  slider's number — compared as strings, so
                                  one leaf serves both kinds)
     { id, min: n }              control `id`'s numeric value is >= n
     { id, awayFrom: n, by: d }  |value - n| >= d (neutral point mid-range)

   composed with:

     { all: [...] }   every term true   (empty all == TRUE)
     { any: [...] }   some term true    (empty any == FALSE — a never-shown
                                         control, which must then carry a
                                         hiddenReason saying why)
     { not: p }       negation
     { ref: name }    a named predicate from PREDICATES

   applyVisibility() in bloom.js EVALUATES these and is the only thing that
   hides a control wrapper. No gating data-attributes, no imperative hiding.
   If a fourth leaf shape is ever needed, stop and raise it. */
export const PREDICATES = {};

export function evalPredicate(pred, state) {
  if (pred == null) return true;
  if (pred.ref) {
    const p = PREDICATES[pred.ref];
    if (!p) throw new Error(`unknown predicate ref: ${pred.ref}`);
    return evalPredicate(p, state);
  }
  if (pred.all) return pred.all.every((p) => evalPredicate(p, state));
  if (pred.any) return pred.any.some((p) => evalPredicate(p, state));
  if (pred.not) return !evalPredicate(pred.not, state);
  if (pred.id !== undefined) {
    const v = state[pred.id];
    if (pred.oneOf) return pred.oneOf.some((x) => String(x) === String(v));
    if (pred.min !== undefined) return Number(v) >= pred.min;
    if (pred.awayFrom !== undefined) return Math.abs(Number(v) - pred.awayFrom) >= (pred.by ?? 0);
    throw new Error(`predicate leaf for "${pred.id}" has no test`);
  }
  throw new Error(`unrecognised predicate shape: ${JSON.stringify(pred)}`);
}

/* ===================================================================
   KIND COERCION — the one owner of "what type does this control's raw string
   become". A slider is a number; a choice is a string. Both the app (readUI)
   and the gates (fullStateDrift) import these rather than each deciding for
   itself: a second copy of this rule is exactly how a <select> read back as
   NaN would have made every centre row measure a design other than the one
   its label names, silently, with the run still reporting a pass. That is the
   flower's 73-of-185 defect, and it is prevented here by there being one
   definition rather than by anyone remembering.
   =================================================================== */
export function coerceValue(c, raw) {
  if (c.kind === 'slider') return Number(raw);
  if (c.kind === 'choice') return String(raw);
  throw new Error(`coerceValue: unhandled control kind "${c.kind}" for ${c.id}`);
}

/* Equality in the control's own kind. Sliders compare numerically with a
   tolerance (the DOM round-trips them through decimal strings); choices
   compare as strings. */
export function valuesEqual(c, a, b) {
  if (c.kind === 'slider') return Math.abs(Number(a) - Number(b)) < 1e-9;
  if (c.kind === 'choice') return String(a) === String(b);
  throw new Error(`valuesEqual: unhandled control kind "${c.kind}" for ${c.id}`);
}

/* Every control id a predicate reads — the drivers whose input/change events
   must re-run applyVisibility(). Derived, never hand-listed. */
export function predicateDrivers(pred, out = new Set()) {
  if (pred == null) return out;
  if (pred.ref) return predicateDrivers(PREDICATES[pred.ref], out);
  if (pred.all) { pred.all.forEach((p) => predicateDrivers(p, out)); return out; }
  if (pred.any) { pred.any.forEach((p) => predicateDrivers(p, out)); return out; }
  if (pred.not) return predicateDrivers(pred.not, out);
  if (pred.id !== undefined) out.add(pred.id);
  return out;
}

/* THE CONTROLS.

   ROLE is a first-class field, not a comment. The flower project's junction
   controls carried `role: "junction"` while driving PETAL geometry, and the
   three-way split (junction / ornament / petal) was discovered late and
   expensively. Here the split is declared from the first centre control:

     petal        the blade itself
     arrangement  where the petals sit (the whorl, and now its radius)
     center       the DESIGNED mass at the heart — user-chosen, optional

   There is deliberately NO `role: "junction"` row and there never will be one.
   The junction (buildHubInto) is derived plumbing: unconditional, sized from
   what feeds it, exposed nowhere. Centre and junction are different things
   (charter: "Junction != center ornament"); conflating them cost the flower
   several cycles, so they cannot even share a vocabulary here.

   PHASE-1 exposure ruling (Eva, Aug 31): petalCount, petalLength, petalWidth,
   petalTilt — all Standard.

   PHASE-2 exposure rulings (Eva, Aug 31), both re-decided at the phase
   boundary exactly as the charter parked them:

   - `spread` EXPOSES the foot-ring radius. Phase 1 derived it by the area rule
     and hid it, on the stated grounds that a spread-out ring would have
     nothing in its middle but plumbing. The designed centre now occupies that
     middle, so the reasoning expired and the control ships. spread is a SCALE
     FACTOR over the derived radius, applied inside footRing() and nowhere
     else — the area rule still sizes the circle, spread only opens or closes
     it. Below 1.00 the ring is TIGHTER than the area rule's derived radius —
     feet crowd and overlap, and at the extreme they cross the axis. That is
     reachable on purpose (Eva's ruling: the area rule is a reference, not a
     cage) and it stays watertight and connected, because the feet are closed
     solids over a hub that still spans the ring.

     THE DEFAULT IS 2.00, AND IT WAS 1.00 FOR ONE COMMIT. Two different things
     happened, in order, and collapsing them would lose the evidence for both:
       1. The control LANDED at 1.00, where the multiply is exact in IEEE-754
          (x * 1.0 === x) and every pre-existing export was therefore
          bit-identical by construction — the convention that a new control
          defaults to current behaviour, measured at 0 of 47 configs moved.
       2. Eva then RULED the default to 2.00 (Aug 31). That is a deliberate
          change to the shipping design, not a new control, and it is expected
          to move every export that inherits it. It moved exactly the 57 of 76
          matrix rows that inherit the default and left all 19 that pin spread
          explicitly bit-identical — a two-sided set equality, not a "mostly
          as expected". Why: at 1.00 the foot ring is 4.42 mm against a 35 mm
          petal, and eight 6.4 mm feet tile straight over it, so the centre —
          any centre — is buried under the petal bases. The archetypes only
          become legible above roughly 2x. A default that hides the thing the
          panel just exposed is the wrong default.
     There is no migration to write and no schema to bump: the bloom persists
     no designs yet (see RETIRED_IDS above), so no saved value can be
     misread. The first feature that persists a design inherits that debt.

   - `centerStyle` is an A/B RIG, not a shipped aesthetic. NONE is the default
     and REMAINS the default — Eva's ruling, Aug 31, after seeing the contact
     sheet: the archetype decision is DEFERRED until after the petal-shape
     phase, because the placeholder ovate petals are stand-ins and a dome or a
     ring should be judged against the real silhouettes it will sit among, not
     against placeholders. Nothing is deleted and no style is promoted: the rig
     stays in the codebase as a built, gated capability and the question
     reopens when petals stop being placeholders.

   Everything else about the whorl (height, sizeRamp, angleRamp, phase) is
   still a derived value or a constant, per "derive, don't expose" — as are
   every centre dimension not listed below: the DISC's own thickness, the
   RING's tube diameter, the dish's residual floor, and all segment counts.

   `visibleWhen: { all: [] }` is the explicit always-true predicate, stated
   rather than omitted so every row declares its own visibility. The centre
   sub-controls are gated on the style that enables them — the Lace pattern
   (the flower calls the field `enabledWhen`; this registry has exactly one
   gating field and it is `visibleWhen`, so there is one name, not two). */
const CENTER_ON = { id: 'centerStyle', oneOf: ['DOME', 'DISC', 'RING'] };

export const CONTROLS = [
  { id: 'petalCount', kind: 'slider', min: 3, max: 40, step: 1, default: 8,
    label: 'Petals', fmt: (v) => `${v}`, tier: 'standard', role: 'petal',
    visibleWhen: { all: [] } },
  { id: 'petalLength', kind: 'slider', min: 20, max: 60, step: 1, default: 35,
    label: 'Petal length', fmt: (v) => `${v} mm`, tier: 'standard', role: 'petal',
    visibleWhen: { all: [] } },
  { id: 'petalWidth', kind: 'slider', min: 8, max: 30, step: 1, default: 16,
    label: 'Petal width', fmt: (v) => `${v} mm`, tier: 'standard', role: 'petal',
    visibleWhen: { all: [] } },
  { id: 'petalTilt', kind: 'slider', min: 0, max: 75, step: 1, default: 25,
    label: 'Petal tilt', fmt: (v) => `${v}°`, tier: 'standard', role: 'petal',
    visibleWhen: { all: [] } },

  /* ARRANGEMENT. 0.60 – 6.00 (Eva, Aug 31). The upper bound: at the defaults
     6.00 puts the ring at 26.5 mm against a 35 mm petal — 0.76 x petal length,
     where the bloom stops reading as a flower and starts reading as a wreath,
     and far past where any archetype still needs room to be judged. The lower
     bound goes under the derived radius on purpose (see above). Reported, not
     gated: at ALL-MAX x 6.00 the model spans 268 mm at tilt 0 — over the
     180 mm dyed-PA12 cap, under standard white. The readout prints the max
     bounding dimension so that is visible at the slider, never a clamp: which
     process cap applies is the user's call at order time. */
  { id: 'spread', kind: 'slider', min: 0.6, max: 6, step: 0.05, default: 2,
    label: 'Spread', fmt: (v) => `${Number(v).toFixed(2)}x`, tier: 'standard', role: 'arrangement',
    visibleWhen: { all: [] } },

  /* CENTER — the A/B rig. */
  { id: 'centerStyle', kind: 'choice', default: 'NONE',
    options: [
      { value: 'NONE', label: 'None' },
      { value: 'DOME', label: 'Dome' },
      { value: 'DISC', label: 'Disc' },
      { value: 'RING', label: 'Ring' },
    ],
    label: 'Center', tier: 'standard', role: 'center',
    fmt: (v) => ({ NONE: 'none', DOME: 'dome', DISC: 'disc', RING: 'ring' }[v] ?? String(v)),
    visibleWhen: { all: [] } },

  /* Outer radius as a FRACTION OF THE FOOT RING — never millimetres. Reading
     footRing() is what makes the centre track spread automatically, and the
     1.00 ceiling is load-bearing: it puts the whole centre footprint inside
     the hub disc, which is what makes centre-to-hub overlap a solid region of
     the centre's full footprint at every setting rather than a thin band that
     happens to be wider than a voxel. */
  { id: 'centerSize', kind: 'slider', min: 0.25, max: 1, step: 0.01, default: 0.75,
    label: 'Center size', fmt: (v) => `${(Number(v) * 100).toFixed(0)}% of ring`,
    tier: 'standard', role: 'center', visibleWhen: CENTER_ON },

  { id: 'centerRise', kind: 'slider', min: 0.15, max: 1.2, step: 0.01, default: 0.6,
    label: 'Dome rise', fmt: (v) => `${Number(v).toFixed(2)}x radius`,
    tier: 'standard', role: 'center', visibleWhen: { id: 'centerStyle', oneOf: ['DOME'] } },

  { id: 'centerDish', kind: 'slider', min: 0, max: 0.9, step: 0.01, default: 0.35,
    label: 'Disc dish', fmt: (v) => (Number(v) === 0 ? 'flat' : `${(Number(v) * 100).toFixed(0)}% dished`),
    tier: 'standard', role: 'center', visibleWhen: { id: 'centerStyle', oneOf: ['DISC'] } },

  { id: 'centerBore', kind: 'slider', min: 0.2, max: 0.75, step: 0.01, default: 0.45,
    label: 'Ring bore', fmt: (v) => `${(Number(v) * 100).toFixed(0)}% open`,
    tier: 'standard', role: 'center', visibleWhen: { id: 'centerStyle', oneOf: ['RING'] } },
];

export const DEFAULTS = Object.fromEntries(CONTROLS.map((c) => [c.id, c.default]));
