/* ===================================================================
   bloom-registry.js — SINGLE SOURCE OF TRUTH for the Parametric Bloom control
   panel, from the very first control.

   One row per control: id / section / kind / range / default / label / fmt /
   tier / visibleWhen. bloom.js GENERATES the panel DOM from this array and
   derives inputs, readUI, DEFAULTS, reset, labels and listeners from the same
   rows. The panel's GROUPING is registry data too — `section` on each control
   plus the SECTIONS array below (identity, order, first-load openness); see
   that block for why membership sits on the control and never in a list of
   ids here, and for why a section is not a role.
   There is deliberately NO hand-written control markup anywhere: the flower
   keeps its markup in flower.html and needs a sync gate (verify-registry-sync)
   to police drift between two representations; here the second representation
   does not exist, so the drift cannot. (What that leaves unproven — that the
   app actually RENDERS and REACTS to these rows — is a different property, and
   it is checked through the real UI by tools/shot-bloom.mjs and the gates'
   read-back assertions, never assumed from this file being correct.)

   Charter: docs/bloom-charter.md. Procedures: the flower-project skill.

   THE ONE IMPORT, and why a file that had none now has one. `placement`'s
   read-out prints the golden angle in degrees, and 137.51 is a number with an
   owner (GOLDEN_ANGLE in bloom-geometry.js, written as pi*(3 - sqrt(5)) so
   the constant IS its definition). Restating it here as a literal would be a
   second owner of a number, which is this project's most repeated defect;
   importing it cannot drift. bloom-geometry.js imports nothing at all, so no
   cycle is possible in either direction.
   =================================================================== */
import { GOLDEN_ANGLE } from './bloom-geometry.js';

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

/* ===================================================================
   SECTIONS — the panel's grouping, declared here and NOWHERE ELSE.

   WHY THIS EXISTS (Eva, Sep 1): "the panel is a lot to scroll through and
   it's only going to become more — group it into sections before the
   arrangement work adds its controls." Twenty controls in one flat column,
   with layer and spiral controls still to come.

   THE SPLIT OF OWNERSHIP, which is the whole design:
     - MEMBERSHIP is a field on the CONTROL (`section: 'form'`), so a control
       declares its own home exactly once, beside its id.
     - IDENTITY, ORDER and FIRST-LOAD OPENNESS are this array, so a section
       has exactly one definition of what it is called and where it sits.
     - ORDER WITHIN A SECTION is the CONTROLS array's own order, filtered.
       There is deliberately no per-control `order` field: the array is
       already an order, and a second one would drift from it.
   No list of ids lives here. A section that named its members would be the
   registration rule broken in the file that exists to state it — two lists
   to keep in sync, and the panel would silently drop whichever the edit
   missed. verifySections() below turns the relation into a hard failure
   instead of a hope.

   SECTION IS NOT ROLE, and conflating them was the first thing this design
   had to refuse. `role` says which part of the MODEL a control owns (petal /
   arrangement / center; there is no 'junction' and never will be) and it is
   load-bearing in the gates and the matrix builder — buildMatrix() skips
   `role: 'center'` rows because they need a style. `section` says where a
   control SITS IN THE PANEL. They answer different questions and they
   genuinely disagree: `sheetThickness` is `role: 'petal'` because the
   junction derives from the petal, and it sits in MATERIAL because it also
   governs the hub slab and the centre floors. Deriving sections from roles
   would have forced a re-role the registry's own header calls a
   stop-and-raise, and would have produced one 14-control "Petal" section,
   which is the problem rather than the fix.

   THE PANEL IS AN ACCORDION: OPENING A SECTION CLOSES THE OTHERS (Eva's
   ruling, Sep 1, with the tradeoff stated and accepted — tweaking across two
   sections costs a reopen click, and the layers-are-sections structure makes
   single-focus the normal case). So `open` here no longer means "which
   sections start open"; it means THE ONE SECTION OPEN AT FIRST LOAD, and
   verifySections() enforces at most one `true`. Zero is legal — every section
   shut is a state the visitor can reach by closing the open one, so it is a
   state the registry may declare too.

   THE SUPERSEDED RULING, BOTH HALVES, so the reversal is legible rather than
   mysterious. Earlier the same day Eva ruled Arrangement AND Petal shape open
   at first load, with the other three collapsed, and that was right for the
   panel it was ruling on — sections that opened and closed independently.
   The accordion makes any two-open state UNREACHABLE, so the earlier ruling
   is not overridden by preference; its subject stopped existing. First load
   is now ARRANGEMENT ALONE.

   `open` IS AN AUTHORED LITERAL, NOT A DERIVED RULE — and this is the second
   rationale on this field to die while its instruction stood, which is worth
   a reader's attention. The first proposal was "collapse a section iff every
   control in it is at an identity default", exactly true of Petal form's four
   curves (all 0, the flat short-circuit) and Part thickness's three (all
   reproducing the old constant). It was already false of the panel that
   shipped — CENTER's DISC / 0.75 / 0.35 are authored aesthetic defaults, not
   identities, and Petal tilt (default 25 degrees) moved into Petal form — and
   the accordion now makes it incoherent as well, since at most one section
   can be open whatever its contents are at. Do not reintroduce it. Do not
   make `open` a predicate either: that would put collapse under `visibleWhen`
   as a second hiding mechanism and make the panel rearrange itself under the
   user as they drag a slider.

   COLLAPSE IS NOT HIDING, and the distinction is load-bearing for "shipped
   means reachable" — never more so than under the accordion, where four of
   the five sections are shut at any moment. A collapsed section keeps every
   control in the DOM with its value, its listeners and its read-out span;
   applyVisibility() is still the only thing that hides a CONTROL. Measured rather than believed —
   tools/verify-bloom-panel.mjs drives an input inside a collapsed section
   through real events and asserts the readout and the geometry moved, and
   asserts the app's whole state snapshot is identical collapsed and expanded.

   ROOM TO GROW, stated so the next session does not reorganise this one:
     - ARRANGEMENT is the home for the arrangement work. It ships with two
       controls (`petalCount`, `spread`) precisely so it has room: of the
       whorl primitive `(count, radius, height, sizeRamp, angleRamp, phase,
       blade)` those two are count and radius, and height / sizeRamp /
       angleRamp / phase are still derived. All four land here, as do
       phyllotaxis and spiral placement. If multi-whorl arrives, the shape
       that fits is a layer-count control in this section with per-layer
       sub-controls gated on it by `visibleWhen` — the centerStyle pattern,
       one level up — not a new section per layer.
     - A STEM, LEAVES or A BASE ORNAMENT (`below` is `null` today, and the
       parameter is 'stem' | 'branch' | null so a stem is a value rather than
       a rewrite) would be a NEW section, because they are new parts, not a
       stretch of an existing one.
     - THE JUNCTION NEVER GETS A SECTION, for the same reason it never gets a
       role: it is derived plumbing, sized from what feeds it, exposed
       nowhere.

   A SECTION IS NEVER GATED BY ITS OWN PREDICATE. Sections carry no
   `visibleWhen`. A section is hidden when, and only when, every control in it
   is hidden — derived by applyVisibility() from the same one state snapshot
   that decided those controls, so it adds no declaration and cannot disagree
   with one. No section can reach that state today (Center always shows
   centerStyle). If one ever needs a condition of its own, that is a
   stop-and-raise, not a field to add quietly.
   =================================================================== */
export const SECTIONS = [
  { id: 'arrangement', label: 'Arrangement', open: true },
  { id: 'shape', label: 'Petal shape', open: false },
  { id: 'form', label: 'Petal form', open: false },
  { id: 'center', label: 'Center', open: false },
  /* PART THICKNESS — renamed from "Material" (Eva, Sep 1), and THE ID MOVED
     WITH THE LABEL on purpose. An id that contradicts its label is a stored
     label-lie: it reads as a declaration, a later reader checks it and
     believes it, and this project's most repeated defect is a name for a
     thing that is not the thing. There is no saved-design debt to weigh
     against that — `section` is panel presentation, never persisted, and it
     is not a control id, so RETIRED_IDS does not apply and no migration is
     owed. (Were a section id ever to reach a saved design, that calculus
     inverts and the rename becomes a retirement.)

     WHAT THE NAME IS SLIGHTLY WRONG ABOUT, stated rather than discovered:
     this section also holds `footDelicacy`, which scales a WIDTH, not a
     thickness. It sits here because the three controls are one layer — the
     part's own material dimensions, the things that decide how delicate the
     printed object is — and because delicacy's width is what the area rule
     reads to size the ring. If the name ever reads wrong at the panel, the
     LABEL moves on one ruling and the id moves with it, exactly as it did
     here. Do not fix it by re-homing the control. */
  { id: 'thickness', label: 'Part thickness', open: false },
];

/* THE SECTION/CONTROL RELATION, checked at module load rather than trusted.
   Throws, deliberately and loudly: a control naming a section that does not
   exist would otherwise be appended to nothing and vanish from the panel
   while every gate that sets values by id kept passing — a control that
   builds, exports and cannot be reached is the "shipped means reachable"
   defect exactly, and it would be introduced by a typo. Every importer gets
   this for free (the app, both gates, every shot tool), so the check cannot
   be the one thing a run forgot to do. The full render census — that each
   control appears in the DOM exactly once, in the right section, in order —
   needs a browser and lives in tools/verify-bloom-panel.mjs. */
export function verifySections(controls = CONTROLS, sections = SECTIONS) {
  const bad = [];
  const ids = new Set();
  for (const s of sections) {
    if (ids.has(s.id)) bad.push(`duplicate section id "${s.id}"`);
    ids.add(s.id);
    if (typeof s.open !== 'boolean') bad.push(`section "${s.id}" must declare a literal boolean \`open\``);
  }
  /* THE ACCORDION'S OWN INVARIANT, checked where the literals live. The panel
     opens at most one section at a time, so two `open: true` rows would
     declare a first-load state the UI cannot hold — the generator would build
     it and the first toggle would silently correct it, which is a panel whose
     shipped appearance disagrees with its own registry until someone clicks.
     Zero is legal: every section shut is reachable by closing the open one. */
  const opens = sections.filter((s) => s.open === true).map((s) => s.id);
  if (opens.length > 1) {
    bad.push(`the panel is an accordion, so at most ONE section may declare open: true — found ${opens.length} (${opens.join(', ')})`);
  }
  const used = new Set();
  for (const c of controls) {
    if (!c.section) bad.push(`control "${c.id}" declares no section`);
    else if (!ids.has(c.section)) bad.push(`control "${c.id}" names section "${c.section}", which is not in SECTIONS`);
    else used.add(c.section);
  }
  /* An EMPTY section is a failure, not a tidy placeholder for later work: it
     renders as a header that opens onto nothing, and the reason it is empty
     is almost always that the controls meant for it name something else. */
  for (const s of sections) if (!used.has(s.id)) bad.push(`section "${s.id}" has no controls`);
  for (const id of RETIRED_IDS) if (controls.some((c) => c.id === id)) bad.push(`retired id "${id}" is a live control`);
  if (bad.length) throw new Error(`bloom-registry: section declaration is broken:\n  - ${bad.join('\n  - ')}`);
  return true;
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

   - `centerStyle` WAS an A/B rig and is now a shipped aesthetic: **DISC is the
     default** (Eva, Aug 31, ruled after the form phase against petals with
     real cup, curl, roll and twist). The deferral it replaces was correct and
     is recorded in docs/bloom-charter.md with both halves — the session-2 note
     that the archetypes were "visually indistinguishable" was measuring them
     against FLAT PLACEHOLDER blades, and that subject no longer exists.
     The default moved as a SECOND EVENT under the spread precedent: the rig
     landed byte-identical, and the default changed later, on evidence, with a
     partition report. Sub-control defaults are unchanged. The superseded
     reasoning ran: the archetype decision is DEFERRED until after the
     petal-shape phase, because the placeholder ovate petals are stand-ins and
     a dome or a ring should be judged against the real silhouettes it will
     sit among, not
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
  { id: 'petalCount', section: 'arrangement', kind: 'slider', min: 3, max: 40, step: 1, default: 8,
    label: 'Petals', fmt: (v) => `${v}`, tier: 'standard', role: 'petal',
    visibleWhen: { all: [] } },
  { id: 'petalLength', section: 'shape', kind: 'slider', min: 20, max: 60, step: 1, default: 35,
    label: 'Petal length', fmt: (v) => `${v} mm`, tier: 'standard', role: 'petal',
    visibleWhen: { all: [] } },
  { id: 'petalWidth', section: 'shape', kind: 'slider', min: 8, max: 30, step: 1, default: 16,
    label: 'Petal width', fmt: (v) => `${v} mm`, tier: 'standard', role: 'petal',
    visibleWhen: { all: [] } },

  /* SILHOUETTE (Eva, Aug 31 — phase 3). All Standard: geometry and
     silhouette controls are a DESIGN tier, never calibration, and the flower
     project got that wrong repeatedly.

     THE TWO TAPERS ARE THE EXPONENTS of the width profile's CORE term,
     u^a (1-u)^b, and their defaults are EXACTLY the placeholder's constants
     — which is what makes the whole silhouette engine land byte-identical.
     They are exposed as themselves rather than re-parameterised as
     (shoulder, fullness) for one measurable reason: the widest point is
     a/(a+b), which at the placeholder's values is 0.357142857…, a number no
     clean slider default lands on. Exposing the shoulder AND the exponents
     would be two owners of one quantity, so the shoulder is DERIVED and
     printed in Tip taper's read-out instead. Derive, don't expose.

     WHAT THE EXPONENT FAMILY CANNOT DO, and why the third control exists:
     w(0) = w(1) = 0 for every a, b > 0, so every member of the family is
     pinched to a point at both ends. The placeholder's tip is not a shape at
     all — it is the TIP_HALF_MM constant, governing the last 4 of 28 blade
     rows. Rose, ranunculus and poppy petals are broad or truncate at the
     tip. `petalTipBreadth` is the only shipped term that reaches outside the
     family, and it is EXACTLY 0 by default so it cannot move a byte.

     DELIBERATELY NOT SHIPPED, with grounds rather than silence:
       - shoulder position — derived from the two tapers (above);
       - base breadth — the root blend already floors the base at the foot's
         own half-width (40% of max width at the defaults), so a broadening
         control would be dead over most of its range (DEAD != INVISIBLE:
         zero geometry delta means delete it, not ship it). The useful
         direction at the base is NARROWING, and that is the claw, which
         does not ship;
       - claw and cleft — architected, proven by non-shipping capability
         rows in both gates, exposed nowhere. Eva's ruling: rounded/ovate
         family only. */
  { id: 'petalBaseTaper', section: 'shape', kind: 'slider', min: 0.3, max: 3, step: 0.05, default: 1,
    label: 'Base taper', tier: 'standard', role: 'petal',
    fmt: (v) => `${Number(v).toFixed(2)}${Number(v) < 0.7 ? ' (broad base)' : Number(v) > 1.6 ? ' (narrow base)' : ''}`,
    visibleWhen: { all: [] } },

  { id: 'petalTipTaper', section: 'shape', kind: 'slider', min: 0.6, max: 4, step: 0.05, default: 1.8,
    label: 'Tip taper', tier: 'standard', role: 'petal',
    /* Prints the DERIVED widest point. One owner: the geometry computes
       a/(a+b) from the same two values, and this read-out is the only place
       it is shown. A control for it would be a second definition. */
    fmt: (v, ui) => {
      const b = Number(v);
      const a = ui ? Number(ui.petalBaseTaper) : 1;
      return `${b.toFixed(2)} · widest at ${(a / (a + b)).toFixed(2)}`;
    },
    visibleWhen: { all: [] } },

  { id: 'petalTipBreadth', section: 'shape', kind: 'slider', min: 0, max: 0.6, step: 0.01, default: 0,
    label: 'Tip breadth', tier: 'standard', role: 'petal',
    fmt: (v) => (Number(v) === 0 ? 'pointed' : `${(Number(v) * 100).toFixed(0)}% of width`),
    visibleWhen: { all: [] } },

  /* THE PETAL'S 3D FORM — four curves, four controls, and they are NOT
     interchangeable (bloom-geometry.js's petalForm header carries the full
     ordering argument and the vocabulary table). All Standard: these change
     what the bloom looks like from across a room, and geometry controls are
     a DESIGN tier — the flower project demoted silhouette controls to
     Advanced repeatedly and was wrong every time.

     ALL FOUR DEFAULT TO EXACTLY 0, which is exactly flat, which is why the
     whole layer lands byte-identical. That is a guard rather than an
     IEEE-754 argument — see petalForm's header for why roll and curl cannot
     have one.

     ALL FOUR ARE SIGNED, and the sign is a different form rather than a
     mirror in three of the four cases: cupped vs reflexed, incurved vs
     recurved, dextral vs sinistral. Roll's sign is the one that is closer
     to a mirror on its own (quilled vs revolute margin), and it earns its
     range in combination with cup, where same-sign and opposite-sign are
     genuinely different petals.

     WHY ROLL STOPS AT 330 AND NOT 360. At exactly one turn the two rim
     columns land coincident, and the export gate's edge census welds at
     1e-4 — so a full turn would emit duplicate geometry and put a number in
     the `nonManifold` column with no cause a reader could find. That column
     is unrated and the model would be watertight and connected either way;
     an unexplained number in a gate's output is how a false belief starts
     here. 330 leaves 30 degrees of arc between the rims.

     WHY CURL REACHES -180. Below-plane petals are wanted, not tolerated:
     tips passing behind the bloom is martagon / cyclamen territory and the
     flower's own gap analysis asked for reflex past 180. Nothing is below
     the bloom today (`below: null`), so the state is geometrically free.
     Reachable, never default. */
  { id: 'petalCup', section: 'form', kind: 'slider', min: -0.8, max: 1.2, step: 0.01, default: 0,
    label: 'Petal cup', tier: 'standard', role: 'petal',
    /* Prints the DERIVED edge lift in mm — the physical quantity — rather
       than the dimensionless amount alone. Cup is the only one of the four
       that stretches the material across the width: the metric factor at
       the rim is sqrt(1 + 4*cup^2), measured 1.093 at 0.22 and 2.600 at the
       maximum, and it is reported by the gates rather than by this label. */
    fmt: (v, ui) => {
      const c = Number(v);
      if (c === 0) return 'flat';
      const lift = Math.abs(c) * (ui ? Number(ui.petalWidth) : 16) / 2;
      return `${c > 0 ? '+' : ''}${c.toFixed(2)} ${c > 0 ? 'cupped' : 'reflexed'} · edge ${lift.toFixed(1)} mm`;
    },
    visibleWhen: { all: [] } },

  /* PETAL TILT SITS HERE, BESIDE SPINE CURL — Eva's ruling (Sep 1), and the
     reason is the one the charter already states: `phi(u) = petalTilt +
     curl*u`. They are the two terms of ONE affine angle function about the
     same axis, which is exactly why they get conflated, and the panel is the
     place that adjacency is visible. Tilt is the constant of integration (the
     whole blade rotating rigidly, no radius); curl is the rate (and prints a
     derived radius). This row MOVED in the array to achieve that adjacency —
     it did not change one character otherwise, and the array's order is the
     panel's order, so a second `order` field would be a second owner.

     THE ALTERNATIVE THAT WAS PUT AND NOT TAKEN: tilt as `role: 'arrangement'`
     in the Arrangement section, on the grounds that a per-slot rigid
     orientation is the whorl's business. Recorded because it is a reasonable
     reading and a later session should find the ruling rather than re-open it
     from the code. `role` is UNCHANGED at 'petal' either way — see the ROLE
     note above; a section is not a role. */
  { id: 'petalTilt', section: 'form', kind: 'slider', min: 0, max: 75, step: 1, default: 25,
    label: 'Petal tilt', fmt: (v) => `${v}°`, tier: 'standard', role: 'petal',
    visibleWhen: { all: [] } },

  { id: 'petalSpineCurl', section: 'form', kind: 'slider', min: -180, max: 360, step: 5, default: 0,
    label: 'Spine curl', tier: 'standard', role: 'petal',
    /* Prints the DERIVED spine radius, which is the quantity that tells a
       bend apart from a tilt — Petal tilt above prints an angle and has no
       radius, because a rigid rotation has none. Same precedent as Tip
       taper printing the derived widest point: one expression here, one in
       the geometry, and no control for it. */
    fmt: (v, ui) => {
      const d = Number(v);
      if (d === 0) return 'straight';
      const L = ui ? Number(ui.petalLength) : 35;
      return `${d > 0 ? '+' : ''}${d}° · spine radius ${(L / Math.abs(d * Math.PI / 180)).toFixed(1)} mm`;
    },
    visibleWhen: { all: [] } },

  { id: 'petalRoll', section: 'form', kind: 'slider', min: -330, max: 330, step: 5, default: 0,
    label: 'Cross-section roll', tier: 'standard', role: 'petal',
    /* Prints the achieved roll radius AND says when the curvature floor
       took over. Saturating silently would make a slider that stops doing
       anything look broken; saying "clamped" makes it a stated cap on the
       OUTPUT, which is the rule this project uses everywhere the parameter
       space has a cliff. The floor itself lives in petalForm — this label
       reads it back through the same arithmetic, it does not set it. */
    fmt: (v, ui) => {
      const d = Number(v);
      if (d === 0) return 'flat';
      const halfW = (ui ? Number(ui.petalWidth) : 16) / 2;
      const kReq = Math.abs(d * Math.PI / 180) / halfW;
      /* Reads the SHEET THICKNESS CONTROL, not a hardcoded 1.2. It was
         hardcoded until the thickness layer, correctly, because the sheet was
         a constant; the moment thickness became a control this label would
         have printed a radius the geometry does not build (too small a floor
         on a thick sheet, too large on a thin one). The floor itself lives in
         petalForm and is reported in its telemetry — this reads the same
         arithmetic back, it does not set it. */
      const kMax = 1 / (ui ? Number(ui.sheetThickness) : 1.2);
      const k = Math.min(kReq, kMax);
      return `${d > 0 ? '+' : ''}${d}° · roll radius ${(1 / k).toFixed(2)} mm${kReq > kMax ? ' (clamped)' : ''}`;
    },
    visibleWhen: { all: [] } },

  { id: 'petalTwist', section: 'form', kind: 'slider', min: -180, max: 180, step: 5, default: 0,
    label: 'Twist', tier: 'standard', role: 'petal',
    fmt: (v) => {
      const d = Number(v);
      return d === 0 ? 'none' : `${d > 0 ? '+' : ''}${d}° (${d > 0 ? 'dextral' : 'sinistral'})`;
    },
    visibleWhen: { all: [] } },

  /* MATERIAL — the thickness layer (Eva, Aug 31, ruled from the live page:
     the petal-to-centre connection is too thick, and the petal tip is too
     thick). Both were the same absence: thickness was ONE CONSTANT
     everywhere — foot, blade and tip alike — so neither complaint had a
     slider to answer it. All three are Standard and `role: 'petal'`.

     WHY `role: 'petal'` FOR THE FOOT CONTROL, on precedent rather than
     taste. `petalWidth` already feeds footRing() and already moves the ring
     radius through the area rule, and it is role 'petal'. 'arrangement' is
     where `spread` lives because spread moves WHERE PETALS SIT; delicacy
     changes the petal's own root cross-section and the ring follows because
     the area rule reads it. And there is deliberately no role 'junction' —
     the hub stays derived plumbing, reading ring.thickness and ring.radius
     exactly as before, so a thinner foot gives a thinner hub with no code
     that mentions either control.

     WHY `sheetThickness` CARRIES NO `petal` PREFIX. It governs the hub slab
     and the centre's floors too (both read ring.thickness), so a petal
     prefix would claim less than the control does. The role stays 'petal'
     because the junction derives from the petal — there is no 'material'
     role and inventing a fourth is a stop-and-raise, not a side effect of
     naming a slider. (This control sits in the PART THICKNESS *section*, which
     is a different axis and no contradiction: a section says where a control
     is in the panel, a role says which part of the model it owns. The absence
     of a 'material' ROLE is what this paragraph is about, and it still holds.)

     EVERY ONE OF THE THREE DEFAULTS REPRODUCES THE OLD CONSTANT EXACTLY:
     1.20 is the double SHEET_THICKNESS_MM holds (bloom-harness asserts the
     two are equal on every gate run), tip thinning 0 makes the profile law
     `base * (1 - 0*u)` which is `base * 1` which is `base`, and delicacy
     1.00 multiplies exactly (x * 1.0 === x, the spread precedent). The byte
     report confirms a construction rather than establishing a result.

     THE FLOORS ARE CLAMPS ON THE OUTPUT, NEVER LIMITS ON THE RANGE — the
     roll-clamp pattern. All three ranges reach past where a floor starts
     binding, on purpose, and every read-out says (CLAMPED) when it does, so
     a slider that has stopped moving the print does not read as broken. */
  { id: 'sheetThickness', section: 'thickness', kind: 'slider', min: 0.6, max: 2.4, step: 0.05, default: 1.2,
    label: 'Sheet thickness', tier: 'standard', role: 'petal',
    /* Prints the export floor's verdict, not only the authored value. Below
       1.00 mm the exported sheet is floored and the live view is showing
       material the print will not have — the same labelling discipline the
       triangle counts use, because live and export are different geometry. */
    fmt: (v) => {
      const t = Number(v);
      return `${t.toFixed(2)} mm${t < 1 ? ' · printed 1.00 mm (CLAMPED)' : ''}`;
    },
    visibleWhen: { all: [] } },

  { id: 'tipThinning', section: 'thickness', kind: 'slider', min: 0, max: 0.8, step: 0.01, default: 0,
    label: 'Tip thinning', tier: 'standard', role: 'petal',
    /* Prints the DERIVED tip thickness in mm, live and printed, which is the
       physical quantity — the fraction alone cannot say where the floor
       takes over, and at the shipping 1.2 mm sheet it takes over from 0.17
       upward. Same precedent as Tip taper printing the derived widest point
       and Spine curl printing the derived radius: one expression here, one
       in the geometry, and no control for the derived number. */
    fmt: (v, ui) => {
      const thin = Number(v);
      if (thin === 0) return 'even';
      const base = ui ? Number(ui.sheetThickness) : 1.2;
      const tip = base * (1 - thin);
      const printed = Math.max(tip, 1);
      return `${(thin * 100).toFixed(0)}% · tip ${tip.toFixed(2)} mm`
           + (printed > tip ? ` · printed ${printed.toFixed(2)} mm (CLAMPED)` : '');
    },
    visibleWhen: { all: [] } },

  { id: 'footDelicacy', section: 'thickness', kind: 'slider', min: 0.25, max: 1, step: 0.01, default: 1,
    label: 'Foot delicacy', tier: 'standard', role: 'petal',
    /* Prints the DERIVED foot cross-section in mm — the answer to "how thin
       can this connection get" is a pair of millimetres, not a multiplier.
       The 1.6 mm floor is an ASSUMPTION (2x the assumed minimum feature;
       nothing in this project family has ever been printed) and it says so
       where it binds. */
    fmt: (v, ui) => {
      const d = Number(v);
      const raw = (ui ? Number(ui.petalWidth) : 16) * 0.4 * d;
      const w = Math.min(10, Math.max(1.6, raw));
      const t = ui ? Number(ui.sheetThickness) : 1.2;
      return `${d.toFixed(2)}x · foot ${w.toFixed(2)} x ${t.toFixed(2)} mm`
           + (raw < 1.6 ? ' (CLAMPED — assumed floor)' : '');
    },
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
  { id: 'spread', section: 'arrangement', kind: 'slider', min: 0.6, max: 6, step: 0.05, default: 2,
    label: 'Spread', fmt: (v) => `${Number(v).toFixed(2)}x`, tier: 'standard', role: 'arrangement',
    visibleWhen: { all: [] } },

  /* ===================================================================
     PLACEMENT — where slot i sits around the axis. The whorl primitive's one
     genuinely computed quantity, exposed as a choice (Sep 1).

     SPIRAL MOVES AZIMUTH ONLY; every foot stays on its layer's ring, so the
     junction argument is untouched by this control. A Vogel radius ramp
     (petals crowding inward as r ~ sqrt(i)) is a different feature — a spiral
     DISC — recorded in buildWhorlInto and deliberately not built.

     LOW COUNTS ARE ALLOWED AND FLAGGED, NEVER GATED, and the reason is a
     measurement rather than a preference. The charter used to say "gate or
     flag golden-angle placement below n ~ 8"; the gap-ratio statistic
     oscillates 1.62 / 2.62 at EVERY count with no discontinuity anywhere, so
     there is no threshold to gate on (see GOLDEN_ANGLE in bloom-geometry.js).
     Two further grounds, recorded so gating is not re-proposed: hiding the
     option would strand the model IN the spiral state with the control
     unreachable, and auto-resetting to RADIAL would move geometry as a side
     effect of a hidden rule. The read-out labels it; the panel gate asserts
     the label in both directions. */
  { id: 'placement', section: 'arrangement', kind: 'choice', default: 'RADIAL',
    options: [
      { value: 'RADIAL', label: 'Radial (even)' },
      { value: 'SPIRAL', label: 'Spiral (golden angle)' },
    ],
    label: 'Placement',
    /* The read-out carries the derived consequence, not the value the select
       already shows: the angular STEP each mode produces. It is what makes
       the golden angle a number at the control rather than a word — and at
       low counts it is where a visitor sees the step no longer divide the
       circle. The legibility flag itself lives in the model read-out, where
       the count it depends on also lives. */
    fmt: (v, ui) => (v === 'SPIRAL'
      ? `${((GOLDEN_ANGLE * 180) / Math.PI).toFixed(2)}° golden step`
      : `${(360 / Number(ui.petalCount)).toFixed(1)}° even step`),
    tier: 'standard', role: 'arrangement',
    visibleWhen: { all: [] } },

  /* ===================================================================
     LAYERS — multiple whorls, the shape the registry predicted for this
     (see ROOM TO GROW above): a layer-count control in THIS section with
     per-layer sub-controls gated on it by `visibleWhen`, the centerStyle
     pattern one level up. Not a section per layer.

     Layers need NOTHING new in the arrangement primitive. Every per-layer
     quantity is one of buildWhorlInto's existing arguments — count, radius,
     height, sizeRamp, angleRamp, phase — which is what the full signature has
     been carried for since session 1.

     WHAT IS DERIVED, and why each answer is always the same:
       height      0, for every layer, always. The ruling, and the one that
                   owns the junction: see footRing()'s header. It is not a
                   control and there is no stub for one.
       count       shared. A per-layer count RATIO quantises (round(n*r^L)
                   makes the slider jump), it makes "half a slot" ambiguous
                   for layerPhase, and fewer-petals-inward reads almost
                   exactly like smaller-petals-inward, which layerSize already
                   gives. Recorded as an alternative, not built.
       radius      R0 * layerSize^L, owned by footRing().
     Max is MAX_LAYERS, asserted equal to it by the harness. The binding
     constraint is the PETAL, not triangles — 3 layers x 40 petals is 10% of
     the export budget; it is the blade shrinking that stops at three. */
  { id: 'layerCount', section: 'arrangement', kind: 'slider', min: 1, max: 3, step: 1, default: 1,
    label: 'Layers', fmt: (v) => `${v}`, tier: 'standard', role: 'arrangement',
    visibleWhen: { all: [] } },

  /* 0.35 – 0.90, and THE UPPER BOUND IS MEASURED, not tidy. At layerSize 1.00
     with layerPhase 0 two whorls are exactly coincident and the export
     carries 14,832 NON-MANIFOLD EDGES — duplicate geometry, this family's
     known cause, the same defect that made the centre's flush base worth
     dropping. At 0.95 and at 0.90 it is 0. Capping below 1.00 makes exact
     coincidence unreachable rather than merely unlikely.
     The lower bound is where the third layer stops being a petal: at 0.35 the
     deepest blade is 4.3 mm and its foot is already floored by
     FOOT_MIN_WIDTH_MM. Reachable, reported with (CLAMPED), not a defect. */
  { id: 'layerSize', section: 'arrangement', kind: 'slider', min: 0.35, max: 0.9, step: 0.01, default: 0.72,
    label: 'Layer size', fmt: (v) => `${Number(v).toFixed(2)}x per layer`, tier: 'standard', role: 'arrangement',
    visibleWhen: { id: 'layerCount', min: 2 } },

  /* THE ALTERNATION, in slots. Default 0.50 — half a slot, which is the
     botanically universal alternation of successive whorls. Eva's ruling
     (Sep 1): EXPOSED, because asking for phase variations on the sheet is a
     request to play with it; the derive-it argument survives as the DEFAULT
     VALUE rather than as the absence of a control. */
  { id: 'layerPhase', section: 'arrangement', kind: 'slider', min: 0, max: 1, step: 0.01, default: 0.5,
    label: 'Layer offset', fmt: (v) => `${Number(v).toFixed(2)} slot`, tier: 'standard', role: 'arrangement',
    visibleWhen: { id: 'layerCount', min: 2 } },

  /* THE PRIMITIVE'S angleRamp, per layer — and the control that does the work
     `height` was expected to do. Inner whorls stand more erect, which is what
     makes a layered bloom read as depth: at layerSize 0.90 x this default the
     inner whorl's tips sit 6.60 mm ABOVE the outer one's, with every foot
     still flat at z = 0. That is 5.5x the 1.20 mm lift a height control could
     reach before its feet left the hub slab.

     THE EXTREME SHIPS PHOTOGRAPHED, NOT CAPPED (Eva, Sep 1). At petalTilt 75
     x layerTilt 30 the third layer's effective tilt is 135 degrees and its
     blades lean back in over the centre. That is past petalTilt's own 75
     ceiling and is a state the tilt slider alone cannot reach. It is a shape
     decision rather than a hazard — the charter's standing finding is that a
     blade sweeping into the hub adds no boundary edges and can only read as
     MORE connected — and it is on the arrangement sheet's own cell so the
     ruling is made with eyes open. Capping is one range change with a picture
     as its evidence; do not cap it on the strength of reading this note. */
  { id: 'layerTilt', section: 'arrangement', kind: 'slider', min: 0, max: 30, step: 1, default: 12,
    label: 'Layer tilt step', fmt: (v) => `+${v}° per layer`, tier: 'standard', role: 'arrangement',
    visibleWhen: { id: 'layerCount', min: 2 } },

  /* CENTER — the A/B rig. */
  { id: 'centerStyle', section: 'center', kind: 'choice', default: 'DISC',
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
  { id: 'centerSize', section: 'center', kind: 'slider', min: 0.25, max: 1, step: 0.01, default: 0.75,
    label: 'Center size', fmt: (v) => `${(Number(v) * 100).toFixed(0)}% of ring`,
    tier: 'standard', role: 'center', visibleWhen: CENTER_ON },

  { id: 'centerRise', section: 'center', kind: 'slider', min: 0.15, max: 1.2, step: 0.01, default: 0.6,
    label: 'Dome rise', fmt: (v) => `${Number(v).toFixed(2)}x radius`,
    tier: 'standard', role: 'center', visibleWhen: { id: 'centerStyle', oneOf: ['DOME'] } },

  { id: 'centerDish', section: 'center', kind: 'slider', min: 0, max: 0.9, step: 0.01, default: 0.35,
    label: 'Disc dish', fmt: (v) => (Number(v) === 0 ? 'flat' : `${(Number(v) * 100).toFixed(0)}% dished`),
    tier: 'standard', role: 'center', visibleWhen: { id: 'centerStyle', oneOf: ['DISC'] } },

  { id: 'centerBore', section: 'center', kind: 'slider', min: 0.2, max: 0.75, step: 0.01, default: 0.45,
    label: 'Ring bore', fmt: (v) => `${(Number(v) * 100).toFixed(0)}% open`,
    tier: 'standard', role: 'center', visibleWhen: { id: 'centerStyle', oneOf: ['RING'] } },
];

export const DEFAULTS = Object.fromEntries(CONTROLS.map((c) => [c.id, c.default]));

/* Run the relation check at module load — see verifySections() above. */
verifySections();

