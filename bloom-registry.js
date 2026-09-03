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

   THE IMPORTS, and why a file that once had exactly one now has two, on the
   same rule both times. `placement`'s read-out prints the golden angle in
   degrees, and 137.51 is a number with an owner (GOLDEN_ANGLE in
   bloom-geometry.js, written as pi*(3 - sqrt(5)) so the constant IS its
   definition). `fanSpacing`'s max is the SAME number as the arc-limit
   ceiling the geometry already clamps the step to (FAN_ARC_LIMIT_DEG, 170) —
   restating either as a literal here would be a second owner of a number,
   which is this project's most repeated defect; importing them cannot
   drift. bloom-geometry.js imports nothing at all, so no cycle is possible
   in either direction.
   =================================================================== */
import { GOLDEN_ANGLE, FAN_ARC_LIMIT_DEG, MAX_FAN_GROUPS, MIRROR_THROUGH_SLOT, petalGroupCount } from './bloom-geometry.js';

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
/* SLOT ROLES ARE RADIAL-ONLY AND NEED ONE SHARED MIRROR PLANE — declared once
   here, under a name, because eight controls share it and eight copies of one
   condition is what drifts. See bloom-geometry.js's SESSION B block for both
   measurements behind it: the corrected SPIRAL ground, and the layerPhase
   table (30.000 deg off at 2 layers x phase 0.25 x n=3, 0.000 at phase 0).

   THE SECOND STATEMENT OF THIS BOUNDARY is `slotRolesEligible()` in
   bloom-geometry.js, which makes the controls INERT where this one makes them
   HIDDEN — neither file can read the other's answer and both must act on it.
   That is the SHEET_THICKNESS_MM situation exactly, so it gets the same
   remedy: both gates assert the two agree on EVERY matrix row, rather than a
   comment claiming they do. */
export const PREDICATES = {
  /* THE FAN ARM IS GONE (Eva's ruling 4, Sep 3) — per-petal roles SUPERSEDE
     slot roles there, so this is RADIAL-only again and `perPetalEligible`
     below is the fan's own gate. Session 10 admitted the fan here on a real
     consequence (a fan has no whorl-to-whorl offset to be out of, so the
     shared plane held unconditionally); that consequence is still TRUE and is
     now simply not what decides it.

     WHAT THIS HIDES, so it reads as a ruling rather than as a regression: on a
     FAN the eight `labellum*` / `hood*` controls disappear and the fan loses
     labellum TIP BREADTH outright, because the per-petal set ships without a
     tip-breadth row. Nothing is RETIRED — slot roles stay fully live under
     RADIAL, same ids, same laws, same rows — so this is a visibility plus
     applicability change and RETIRED_IDS does not apply. Restoring COMPOSITION
     is this one arm plus the matching arm in bloom-geometry.js's
     `slotRolesEligible()`, and nothing was written to depend on their absence.

     THE PANEL GATE COVERS THE TRANSITION IN BOTH DIRECTIONS, because a
     control that stops appearing is exactly as much a claim as one that
     starts: `predicateDrivers` reports `placement` here, so the
     visibility-transition route drives RADIAL -> FAN -> RADIAL and re-checks
     every control's `hidden` against its own predicate at each state. */
  slotRolesEligible: { all: [
    { id: 'placement', oneOf: ['RADIAL'] },
    /* layerCount 1 (nothing above the outermost whorl to fall out of step),
       OR every whorl in phase so all of them share the one plane. `not min 2`
       is "below 2"; `not awayFrom 0` is "is 0" — the registry's first use of
       the awayFrom leaf, which has been in the vocabulary unused since day
       one. The tolerance is half of layerPhase's own 0.01 step, so it admits
       exactly the reachable value 0 and nothing else. */
    { any: [
      { not: { id: 'layerCount', min: 2 } },
      { not: { id: 'layerPhase', awayFrom: 0, by: 0.005 } },
    ] },
  ] },

  /* ===================================================================
     WHERE PER-PETAL ROLES APPLY — the fan, and only the fan (Eva's ruling 4,
     Sep 3). The counterpart of `slotRolesEligible` above, and MUTUALLY
     EXCLUSIVE with it: per-petal SUPERSEDES slot roles on the fan, so a fan
     has exactly one per-position axis and a rosette has the other.

     bloom-geometry.js states the same boundary in `perPetalEligible()`,
     because neither file can read the other's answer and both must act on it
     — the registry HIDES the controls, the geometry makes them INERT. Two
     statements of one boundary is a registration risk, so both gates assert
     the two agree on every matrix row (Z5), exactly as they already do for
     the slot-role twin. */
  perPetalEligible: { id: 'placement', oneOf: ['FAN'] },

  /* ===================================================================
     WHEN THE HOOD HAS NO MEMBERS — the fan's two-petal state, and the reason
     it is a predicate rather than a special case (Eva, Sep 2).

     One petal per side with NO mirror-line petal is a two-petal fan, where
     the mirror runs through the gap and the involution `i <-> n-1-i` pairs
     the two slots with each other. The pair CLOSEST to the plane and the pair
     FARTHEST from it are then the SAME pair, and a slot cannot carry two slot
     roles. The tie breaks toward the LABELLUM (see roleForSlot's second arm),
     which leaves the HOOD empty — and three hood sliders naming a group with
     no members is exactly what session B's own non-empty check exists to
     catch. Session B's remedy, pushing the empty group onto LATERAL, is
     unavailable here because the collision is between two CONTROL-BEARING
     roles. So the other half of the argument is discharged instead: the hood
     controls hide.

     AND THE TWO STATEMENTS WERE TIED TOGETHER RATHER THAN LEFT TO AGREE.
     Z1's clause was "every control-bearing role is non-empty at every
     reachable count"; it is now "a role's controls are VISIBLE if and only if
     that role is NON-EMPTY", asserted in both directions against
     footRing()'s own `slotRoleCensus`. Membership and visibility became ONE
     statement with one owner — this predicate is checked against the
     geometry's census rather than against a second copy of the derivation,
     which is stronger than what it replaces and cannot drift from it. */
  hoodEmpty: { all: [
    { id: 'placement', oneOf: ['FAN'] },
    { id: 'fanCenterPetal', oneOf: ['OFF'] },
    { not: { id: 'fanPerSide', min: 2 } },
  ] },
};

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
  /* PETAL ROLES — which petals differ from the others, and how (Eva's name,
     Sep 2). It holds two independent axes: session A's LAYER roles (whorl vs
     whorl) and session B's SLOT roles (where a petal sits within its whorl).

     WHY NOT "Whorl differences", which is what session A predicted this
     section would be called: slot roles differentiate WITHIN a whorl, so that
     name would be wrong for seven of the ten controls in it — a label naming
     a thing that is not the thing, which is what this project retires ids
     over. "Zygomorphy" is exact and is the charter's own word, and was passed
     over as jargon on a visitor-facing panel.

     AND WHY NOT Arrangement, where session A's three landed: Arrangement is
     already nine controls, and session A recorded that the pair wanted a home
     of its own once slot roles arrived. Moving `inner*` here is presentation
     only — `section` is never persisted and no geometry reads it. */
  { id: 'roles', label: 'Petal roles', open: false },

  /* ===================================================================
     THE ROSETTE'S TWO GROUPS, NUMBERED THE FAN'S WAY (Eva's ruling A, Sep 3,
     from the deploy preview): "the names like petal 1 -2 -3 etc should apply
     to the radial option as well." The labellum's five sliders and the hood's
     three keep their ids, their laws and their predicates and move into two
     drop-downs inside "Petal roles", exactly as the fan's groups did — the
     SAME element, the same accordion rule, the same indent.

     THE NUMBERS ARE THE ORBITS', NOT A SECOND NUMBERING. Under RADIAL the
     plane is the through-slot involution (`mirrorFor`), whose orbits are the
     per-petal groups ordered by distance from it: slot 0 is orbit 0, so the
     labellum is PETAL 1 at every count; the hood is the orbit FARTHEST from
     the plane, which is the LAST group — `petalGroupCount(n, THROUGH_SLOT)`,
     2 at three petals, 5 at eight, 21 at forty. Measured through
     `petalRoleForSlot` at nine counts before this was written (charter,
     session 11), not read off the derivation: the same `HOOD = P_last`
     relation the fan already carried, so the rosette gets no rule of its own.

     WHAT WAS DECLINED, so the gaps read as the ruling rather than a defect
     (option B, offered and refused): extending the fan's full per-orbit set to
     the rosette would have retired the labellum and hood NAMES, retired the
     labellum's tip breadth with them, and put nineteen empty-by-default groups
     under a forty-petal rosette. A's cost is stated instead: the panel reads
     "Petal 1, Petal 5" with nothing between, because the laterals carry no
     controls — which the read-outs say in words, and which is the truth.

     ONE LABEL IS A LITERAL AND THE OTHER IS DERIVED, and that asymmetry is the
     relation itself. "Petal 1" is a constant because orbit 0 exists at every
     reachable count and is always the labellum — a `labelFrom` there would
     tell a reader it might vary. The hood's number moves with `petalCount`,
     so its summary is the FIRST derived section label in this panel:
     `labelFrom(ui)` is refreshed by the app on every rebuild through the same
     `refreshLabels()` path the read-outs use, and `sectionLabel()` below is
     the one owner of "what does this summary say" for the app, the panel gate
     and the panel sheet alike. verifySections() requires exactly one of
     `label` / `labelFrom`: a literal beside a derivation would be a stored
     label-lie waiting for a reader to believe it.

     NOTHING IS RETIRED. The control ids are unchanged (`labellumSize`,
     `hoodCup`, ...), `section` is never persisted, and the two new section ids
     name the ROLE each group holds because that is what the code's vocabulary
     is for; the visitor's vocabulary — the number — is the label. Under FAN
     both groups are hidden with their controls, by the same predicate the
     controls carry (Eva's ruling 4): the fan's `petal1` section and this
     "Petal 1" share a name and never share a screen, which the panel gate
     asserts on every visibility state it drives.

     `open: false` ON BOTH — ARRANGEMENT holds the one first-load `open`. */
  { id: 'labellumGroup', label: 'Petal 1', open: false, parent: 'roles' },
  { id: 'hoodGroup', open: false, parent: 'roles',
    labelFrom: (ui) => `Petal ${petalGroupCount(Math.round(Number(ui.petalCount)), MIRROR_THROUGH_SLOT)}` },

  /* ===================================================================
     ONE SECTION PER PER-PETAL GROUP (Eva's ruling 1, Sep 3) — the accordion
     doing exactly what it was built for, and the ruling was made from
     measured heights rather than from a preference.

     The alternative on the table was the flower's own form, which Eva likes
     and which this session's brief pointed at: ONE "Per-petal" section with
     `PETAL 1 — INNER` sub-headings inside it. Measured with real control rows
     cloned into the real page:

                                   4 groups (the shipping fan)   9 groups
       one section, sub-headings   section 904 px, panel 1,314   2,001 / 2,411
       one section per group       section 216 px, panel   719     216 /   874
       (today, for scale: tallest section 417 px, panel 788 px)

     The sub-heading form is already past the 1,241 px FLAT panel the accordion
     was built to replace, at the shipping default. One section per group is
     BELOW today's worst case at the default and 86 px above it at the extreme,
     and it needs no cap, no new collapse mechanism and no new hiding rule: a
     section is hidden when and only when every control in it is hidden, which
     applyVisibility() already derives, so groups beyond `fanPerSide` and every
     group under a non-FAN placement disappear for free.

     THE LABELS ARE STATIC AND THE READ-OUTS ARE NOT, which is the split
     `placement` and `layerCount` have carried since they shipped: a label
     naming one toggle position lies in the other. Group 1 is the mirror-line
     petal with the toggle ON and the inner PAIR with it OFF, so the section
     says "Petal 1" and each control's read-out says which it currently is.

     GENERATED, LIKE THE CONTROLS THEY HOLD, from the one ceiling
     (MAX_FAN_GROUPS, derived in bloom-geometry.js from MAX_FAN_PER_SIDE and
     imported rather than restated). Nine hand-written rows would be nine
     places for the count to drift from the geometry's own.

     `open: false` ON EVERY ONE. verifySections() enforces at most one
     `open: true` across the whole array, and ARRANGEMENT already holds it. */
  ...Array.from({ length: MAX_FAN_GROUPS }, (_, k) => ({
    id: `petal${k + 1}`, label: `Petal ${k + 1}`, open: false,
    /* NESTED INSIDE "Petal roles" (Eva, Sep 3, from the deploy preview): "have
       the roles be its own drop down which then enables all the other petals
       and their roles to be drop downs."

       WHY IT IS A `parent` FIELD AND NOT A SECOND LIST. Membership sits on the
       CHILD, exactly as a control's `section` sits on the control — a parent
       naming its children would be two lists to keep in step in the file that
       exists to state the registration rule, and the panel would silently drop
       whichever an edit missed. `verifySections()` checks the relation at
       module load, so the app, both gates and every shot tool get it for free.

       AND THE ACCORDION NEEDED NO SECOND MECHANISM. Its one capture listener
       used to close every OTHER top-level section; it now closes a
       drop-down's SIBLINGS, which is the same rule stated one level more
       generally — at the top level the siblings ARE the sections, so the
       shipped behaviour is unchanged, and nesting falls out of it. One owner,
       one listener, one rule; a nested accordion with its own handler would
       have been the N-copies-of-one-rule defect this panel was built to
       avoid. */
    parent: 'roles',
  })),
];

/* WHAT A SECTION'S SUMMARY SAYS, at a given state — THE ONE OWNER, used by
   the app's generator and its refreshLabels(), by the panel gate's census and
   by the panel sheet. A section declares either a literal `label` or a
   `labelFrom(ui)`; verifySections() below refuses both and neither. The
   derived form exists for exactly one section today (the rosette's hood
   group, whose petal number moves with petalCount) and is written once here
   rather than as `s.labelFrom ? ... : ...` in four files. */
export function sectionLabel(section, state) {
  return section.labelFrom ? section.labelFrom(state) : section.label;
}

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
  /* The defaults of the CONTROLS PASSED IN, not the module's — this runs at
     module load before DEFAULTS exists, and a caller handing in its own
     control set should have its labels evaluated against that set. */
  const defaultsOf = (cs) => Object.fromEntries(cs.map((c) => [c.id, c.default]));
  const ids = new Set();
  for (const s of sections) {
    if (ids.has(s.id)) bad.push(`duplicate section id "${s.id}"`);
    ids.add(s.id);
    if (typeof s.open !== 'boolean') bad.push(`section "${s.id}" must declare a literal boolean \`open\``);
    /* EXACTLY ONE OF `label` / `labelFrom`. A section with both would show the
       derived text while the literal sat there reading as a declaration —
       the stored label-lie this project retires ids over — and one with
       neither renders an empty summary. sectionLabel() is the one reader. */
    const hasLabel = typeof s.label === 'string' && s.label.length > 0;
    const hasFrom = typeof s.labelFrom === 'function';
    if (hasLabel === hasFrom) bad.push(`section "${s.id}" must declare exactly one of a literal \`label\` or a \`labelFrom(ui)\` — it declares ${hasLabel && hasFrom ? 'both' : 'neither'}`);
    else if (hasFrom && typeof s.labelFrom(defaultsOf(controls)) !== 'string') bad.push(`section "${s.id}"'s labelFrom(DEFAULTS) did not return a string`);
  }
  /* THE ACCORDION'S OWN INVARIANT, checked where the literals live. The panel
     opens at most one section at a time, so two `open: true` rows would
     declare a first-load state the UI cannot hold — the generator would build
     it and the first toggle would silently correct it, which is a panel whose
     shipped appearance disagrees with its own registry until someone clicks.
     Zero is legal: every section shut is reachable by closing the open one. */
  /* AT MOST ONE OPEN PER SIBLING GROUP, which is the accordion's rule stated
     where the literals live. It used to be "at most one in the whole array";
     nesting makes that too strong — a child drop-down may be open inside its
     open parent, and the two are siblings of nothing. Grouping by `parent`
     (top-level sections share the group `null`) says the same thing about the
     top level and the right thing about each nested set. */
  const byParent = new Map();
  for (const s of sections) {
    const k = s.parent ?? null;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k).push(s);
  }
  for (const [k, group] of byParent) {
    const opens = group.filter((s) => s.open === true).map((s) => s.id);
    if (opens.length > 1) {
      bad.push(`the panel is an accordion, so at most ONE section may declare open: true among siblings${k === null ? ' at the top level' : ` of "${k}"`} — found ${opens.length} (${opens.join(', ')})`);
    }
  }
  /* A PARENT MUST EXIST, AND NESTING IS ONE LEVEL DEEP. The second clause is a
     real bound rather than caution: `applyVisibility()` derives a section's
     hidden state from its controls AND its child sections, and the panel gate
     walks the tree to assert it — both are written for one level, so a
     grandchild would be a structure the instruments do not describe. */
  for (const s of sections) {
    if (s.parent === undefined || s.parent === null) continue;
    const par = sections.find((x) => x.id === s.parent);
    if (!par) bad.push(`section "${s.id}" names parent "${s.parent}", which is not in SECTIONS`);
    else if (par.parent) bad.push(`section "${s.id}" nests under "${par.id}", which is itself nested — the panel is one level deep`);
  }
  const used = new Set();
  for (const c of controls) {
    if (!c.section) bad.push(`control "${c.id}" declares no section`);
    else if (!ids.has(c.section)) bad.push(`control "${c.id}" names section "${c.section}", which is not in SECTIONS`);
    else used.add(c.section);
  }
  /* An EMPTY section is a failure, not a tidy placeholder for later work: it
     renders as a header that opens onto nothing, and the reason it is empty is
     almost always that the controls meant for it name something else. A parent
     satisfies this with CHILD SECTIONS instead of controls — "Petal roles"
     holds the per-petal drop-downs and no sliders of its own — so the check is
     "holds something", not "holds controls". */
  const hasChildren = new Set(sections.filter((s) => s.parent).map((s) => s.parent));
  for (const s of sections) {
    if (!used.has(s.id) && !hasChildren.has(s.id)) bad.push(`section "${s.id}" has neither controls nor child sections`);
  }
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

/* THE UNIT WORD FOR THE DEPTH AXIS — one owner, read by the three read-outs
   that name it. A layered bloom stacks LAYERS; a continuous one winds TURNS,
   and they are the same axis measured in the same units, which is exactly why
   `layerCount`, `layerSize` and `layerTilt` mean the same thing in both modes
   and need no reinterpretation. Three copies of this ternary would be three
   places for the two modes to drift apart in wording alone. */
const perDepth = (ui) => (String(ui.placement) === 'CONTINUOUS' ? 'turn' : 'layer');

/* WHAT THE ROSETTE'S TWO SLOT-ROLE GROUPS CURRENTLY ARE — one owner per group,
   read by every read-out in the group, the fan's `said(ui)` precedent (Eva's
   ruling A, Sep 3: the labels say "Petal 1" / "Petal N", so the read-out is
   where the word "labellum" now lives). Written for the states in which the
   controls are VISIBLE: slot roles are RADIAL-only, so the plane is the
   through-slot involution, the labellum is slot 0 — its fixed point, one
   petal at every count — and the hood is `roleForSlot`'s far end: one petal
   opposite the line at an even count, the far pair at an odd one. */
const saidLabellum = () => 'the labellum, on the line';
const saidHood = (ui) => (Math.round(Number(ui.petalCount)) % 2 === 0 ? 'the hood, opposite the line' : 'the hood pair, opposite the line');

export const CONTROLS = [
  { id: 'petalCount', section: 'arrangement', kind: 'slider', min: 3, max: 40, step: 1, default: 8,
    label: 'Petals', fmt: (v) => `${v}`, tier: 'standard', role: 'petal',
    /* HIDDEN UNDER FAN, and it is the layerPhase treatment rather than a
       reinterpretation (Eva's ruling, Sep 2). A fan's petal count is DERIVED —
       2 * perSide + a mirror-line petal — so this slider has no job there.
       Reusing it as "petals per side" was costed and rejected: a stored 8
       would render as 8 petals under RADIAL and 17 under FAN, which is a label
       lie on a PERSISTED key, and switching RADIAL -> FAN at 40 would ask for
       81 petals, past every measured extreme. Making it the TOTAL instead was
       also rejected — the toggle fixes the count's PARITY, so the two controls
       would fight. What the visitor loses is a number, and the read-out prints
       the derived total so it is still on screen. Named gate rows assert this
       is hidden AND inert: FAN at petalCount 40 must be bit-identical to FAN
       at petalCount 8. */
    visibleWhen: { not: { id: 'placement', oneOf: ['FAN'] } } },
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

     SPIRAL MOVES AZIMUTH ONLY; every foot stays on its layer's ring.
     CONTINUOUS moves radius, size and tilt as well — one sequence winding
     inward with every petal on a ring of its own, which is the sunflower /
     succulent construction rather than rings wearing spiral azimuths. It is
     the SAME LAW as the layered arm under a different quantizer of the layer
     index (floor(k/petalCount) against k/petalCount); footRing()'s CONTINUOUS
     section is the one place that is stated. A Vogel radius ramp (r ~
     sqrt(k) at CONSTANT petal size — the equal-area seed-head law) remains a
     different feature and is still not built: this model's petals shrink with
     `layerSize`, so Vogel would orphan that control.

     WHY THREE VALUES AND NOT A REPLACEMENT (Eva, Sep 1). SPIRAL is not a
     subset of CONTINUOUS at any layerCount — at one layer SPIRAL is n petals
     on ONE ring with uneven angular gaps, which is the state the legibility
     flag below exists for, while CONTINUOUS winds 0.875 of a turn inward. So
     replacing SPIRAL would delete a reachable, flagged, gate-covered state
     rather than upgrade it. Keeping both landed as ONE byte event (nothing
     selects the new value, so every pre-existing export is bit-identical);
     replacing it would have moved 11 of 158 live rows. Retiring the SPIRAL
     option later is free while nothing persists a design and becomes a schema
     bump plus a migration the moment something does — so the cheap ruling is
     the one that stays available.

     LOW COUNTS ARE ALLOWED AND FLAGGED, NEVER GATED, and the reason is a
     measurement rather than a preference. The charter used to say "gate or
     flag golden-angle placement below n ~ 8"; the gap-ratio statistic
     oscillates 1.62 / 2.62 at EVERY count with no discontinuity anywhere, so
     there is no threshold to gate on (see GOLDEN_ANGLE in bloom-geometry.js).
     Two further grounds, recorded so gating is not re-proposed: hiding the
     option would strand the model IN the spiral state with the control
     unreachable, and auto-resetting to RADIAL would move geometry as a side
     effect of a hidden rule. The read-out labels it; the panel gate asserts
     the label in both directions.

     WHAT THE FLAG COUNTS IS THE SEQUENCE, NOT THE PETAL SLIDER, and the two
     stopped being the same number when CONTINUOUS arrived: under SPIRAL each
     whorl runs its own golden-angle sequence, so the length is `petalCount`;
     under CONTINUOUS there is ONE sequence of `petalCount * layerCount`.
     footRing() owns that number (`sequenceLength`) and the read-out reads it,
     so SPIRAL's behaviour is unchanged to the character while the claim the
     flag makes stays true in the new mode. */
  { id: 'placement', section: 'arrangement', kind: 'choice', default: 'RADIAL',
    options: [
      { value: 'RADIAL', label: 'Radial (even)' },
      /* "layered" earns its place in the label now that a second spiral
         exists: the contrast is the whole ruling a visitor is making at this
         select, and a bare "Spiral" beside "Continuous spiral" reads as a
         shorthand for it rather than as its opposite. (Eva, Sep 1.) */
      { value: 'SPIRAL', label: 'Spiral, layered (golden angle)' },
      { value: 'CONTINUOUS', label: 'Continuous spiral (winds inward)' },
      /* THE FOURTH VALUE (Eva, Sep 2) — a symmetric arc across one axis
         instead of a full circle, in the flower's own vocabulary. Like
         CONTINUOUS before it this lands as ONE byte event: nothing
         pre-existing selects it, so every earlier export is bit-identical. */
      { value: 'FAN', label: 'Fan (symmetric arc)' },
    ],
    label: 'Placement',
    /* The read-out carries the derived consequence, not the value the select
       already shows: the angular STEP each mode produces. It is what makes
       the golden angle a number at the control rather than a word — and at
       low counts it is where a visitor sees the step no longer divide the
       circle. The legibility flag itself lives in the model read-out, where
       the count it depends on also lives. */
    fmt: (v, ui) => {
      if (v === 'RADIAL') return `${(360 / Number(ui.petalCount)).toFixed(1)}° even step`;
      /* THE FAN'S STEP IS THE ASKED-FOR ONE UNLESS THE ARC LIMIT BIT, and
         this read-out cannot see the clamp — `fmt` has only the UI state, not
         footRing()'s answer. So it prints the number the visitor set and the
         MODEL read-out prints what was actually built, exactly as
         `labellumSize` does with its own saturation. Restating the cap here
         would be a second copy of the clamp law. */
      if (v === 'FAN') {
        const per = Math.round(Number(ui.fanPerSide));
        const centre = String(ui.fanCenterPetal) === 'ON';
        return `${Number(ui.fanSpacing).toFixed(0)}° apart · ${2 * per + (centre ? 1 : 0)} petals`;
      }
      const golden = `${((GOLDEN_ANGLE * 180) / Math.PI).toFixed(2)}° golden step`;
      /* CONTINUOUS shares the azimuth step exactly, so the step alone would
         not tell the two apart at the control. What differs is the LENGTH of
         the sequence it steps through, which is also the number the
         legibility flag is about — so that is what the read-out adds. */
      return v === 'CONTINUOUS'
        ? `${golden}, ${Math.round(Number(ui.petalCount)) * Math.round(Number(ui.layerCount))} in one sequence`
        : golden;
    },
    tier: 'standard', role: 'arrangement',
    visibleWhen: { all: [] } },

  /* ===================================================================
     THE FAN'S THREE CONTROLS (session 10, Eva's ruling Sep 2) — petals per
     side, petal spacing, and the petal-on-mirror-line toggle. All three are
     Standard, `role: 'arrangement'`, in ARRANGEMENT, and all three are HIDDEN
     unless the placement is FAN.

     THE VOCABULARY IS THE FLOWER'S OWN, READ AS THE REFERENCE. `bilPerSide`
     ("Petals per side", "petals on each side of the mirror line"),
     `bilSpacing` ("Petal spacing", "angle between neighbouring petals") and
     `bilCenterPetal` ("Petal on mirror line") are the controls Eva screenshotted
     and liked, and the labels and hints below are theirs. What did NOT come
     over is the flower's implementation: its per-petal control GROUPS, its
     `over(k)` override table and its three-per-side ceiling all belong to a
     different feature (per-petal sliders), which is on the standing board and
     is deliberately not this session.

     THE IDS ARE THE BLOOM'S, not the flower's. `bil*` is short for bilateral,
     which is the flower's own name for this arrangement; the bloom's value is
     called FAN, so `fan*` is what the ids say. Nothing persists a design yet,
     so no retirement is owed either way — this is the cheap moment to name
     them, exactly as `layerCount` was.

     WHY petalCount IS NOT ONE OF THEM: see its own note above. The count here
     is DERIVED from these two, and the read-out prints it.

     THEY ARE EXCLUDED FROM THE MATRIX'S BLANKET SLIDER SWEEP by derivation,
     not by a list — `predicateDrivers` puts every control whose predicate
     reads `placement` and which is hidden at the shipping defaults into the
     same excluded set the layer sub-controls are in. A `fanSpacing` row at
     RADIAL would build the shipping default and report a pass under a label
     naming a control that did nothing, which is the latent trap #124 closed
     arriving from a third direction. They get their own explicit FAN rows
     instead. */
  { id: 'fanPerSide', section: 'arrangement', kind: 'slider', min: 1, max: 8, step: 1, default: 3,
    label: 'Petals per side',
    /* THE DERIVED TOTAL IS THE READ-OUT, because the total is the number
       `petalCount` used to show and this is where the visitor lost it. */
    fmt: (v, ui) => {
      const per = Math.round(Number(v));
      const centre = String(ui.fanCenterPetal) === 'ON';
      return `${per} each side — ${2 * per + (centre ? 1 : 0)} petals${centre ? ' incl. the mirror-line petal' : ''}`;
    },
    tier: 'standard', role: 'arrangement',
    visibleWhen: { id: 'placement', oneOf: ['FAN'] } },

  /* THE ANGLE BETWEEN NEIGHBOURS — the flower's range and default, ported.
     THE ARC LIMIT CAPS IT AND THE MODEL READ-OUT SAYS SO. This slider is not
     clamped: the whole (perSide x spacing) rectangle stays reachable and the
     STEP saturates instead, which is the project's standing "cap the output,
     never the input" rule. See FAN_ARC_LIMIT_DEG in bloom-geometry.js for the
     coincidence measurement the cap exists for, and note that the cap binds
     across most of this slider at 8 per side — the read-out prints "(CAPPED)"
     there for the same reason the roll floor prints "(clamped)": a slider
     that has stopped moving must not read as broken.

     MAX RAISED 60 -> FAN_ARC_LIMIT_DEG (Eva, Sep 2 amendment): 60 was an
     arbitrary ceiling with no relationship to the geometry's own bound, and
     she wanted more than 60 reachable. The natural ceiling ALREADY HAD A
     NAME — asking for more than FAN_ARC_LIMIT_DEG degrees between neighbours
     is asking for more than the arc limit permits at ANY perSide (the
     tightest bind, perSide 1 with a mirror-line petal, has its own threshold
     at exactly FAN_ARC_LIMIT_DEG/1 = 170), so a max beyond it would move the
     slider without moving the model — an input-space dead zone, which this
     project's "cap the output" rule exists to avoid on the OUTPUT side and
     is just as wrong on the INPUT side. Importing the same constant instead
     of a second "170" literal is what makes this bound un-driftable from the
     one it mirrors.

     WHAT WIDENS, MEASURED RATHER THAN ASSUMED: at perSide 1 (toggle ON) the
     new max is now exactly the arc-limit threshold (170/1), so the slider's
     full range is reachable UNCAPPED there for the first time — the fan can
     open to the same 340deg-arc/20deg-notch extreme previously reachable
     only at 8 per side, but with just 3 petals total. At perSide 1 (toggle
     OFF) the threshold is 170/0.5 = 340, so 170 is nowhere near it — a
     genuinely new, UNCAPPED half-open shape (170deg arc, 190deg notch) that
     the old 60deg ceiling never let this toggle state reach at all. Toggle-ON
     thresholds at LOW/MID perSide fall inside the new range for the first
     time too (perSide 2: 170/2 = 85; perSide 3: 170/3 = 56.67, already
     brushed by the OLD max) — so the cap now binds well below 8 per side,
     which used to be the only place it visibly did. FAN_ARC_LIMIT_DEG
     ITSELF STANDS UNCHANGED: it already protected every perSide against
     exact coincidence regardless of what this slider's ceiling was, and nothing
     about widening the INPUT range changes what that constant does or why
     170 was chosen (the flower's own value, ported — see its header). New
     gate rows cover the newly reachable region; see bloom-harness.mjs's FAN
     section. */
  { id: 'fanSpacing', section: 'arrangement', kind: 'slider', min: 15, max: FAN_ARC_LIMIT_DEG, step: 1, default: 45,
    label: 'Petal spacing', fmt: (v) => `${Number(v).toFixed(0)}° between neighbours`,
    tier: 'standard', role: 'arrangement',
    visibleWhen: { id: 'placement', oneOf: ['FAN'] } },

  /* THE TOGGLE, AND IT DECIDES WHICH MIRROR THE BLOOM HAS — which makes it the
     one control here that changes a DERIVATION rather than a number.

     ON: a petal is bisected by the mirror line, the pairing is `i <-> n-i`
     (session B's shipped involution, with slot 0 its fixed point), and slot 0
     IS the labellum — which is Eva's original fan principle, "the petal on the
     mirror line is petal number one, and it has its own sliders", arriving
     through the role mechanism the orchid built.
     OFF: the line runs through the gap between the two inner petals, the
     pairing is `i <-> n-1-i` and has NO fixed point, so every role is a pair:
     the labellum is the INNER PAIR (Eva's ruling) and the hood the outer one.

     A CHOICE RATHER THAN A CHECKBOX because the registry has two kinds and
     `coerceValue` is their one owner — adding a third kind for a two-value
     control would put a new branch in the app, in fullStateDrift and in both
     gates to save one word. The option LABELS carry the flower's own
     explanation of what each position does. */
  /* ===================================================================
     DEFAULT ON (Eva, Sep 2, ruled from the fan sheet) — AND IT DELIBERATELY
     DIVERGES FROM THE FLOWER'S OWN DEFAULT. Both halves are recorded so the
     divergence reads as chosen rather than accidental.

     THE FLOWER SHIPS `bilCenterPetal` FALSE, and this control's vocabulary,
     range and labels are otherwise the flower's exactly. Matching it here was
     the obvious call and it was passed over.

     WHAT OUTRANKED IT: Eva's own founding fan principle — *the petal on the
     mirror line is petal number one, and it has its own sliders* — which the
     charter records as the thing the labellum satisfied a session before this
     arrangement existed. With the toggle ON, slot 0 IS that petal and IS the
     labellum, because slot 0 is the through-slot involution's fixed point. A
     fresh fan should therefore open showing the principle it was built on,
     not the state where the principle has no single petal to point at.
     Consistency with the older page lost to the idea the newer one is for.

     IT IS A RULED DEFAULT CHANGE, so it lands as its own event with a
     partition asserted in three directions rather than folded into the
     feature commit — the `spread` 1.00 -> 2.00 and `centerStyle` NONE -> DISC
     precedent. The third direction is the one worth naming: every non-FAN row
     is bit-identical because this control is INERT outside FAN, which is a
     claim about the geometry rather than about the rows, and it is measured
     rather than argued. */
  { id: 'fanCenterPetal', section: 'arrangement', kind: 'choice', default: 'ON',
    options: [
      { value: 'OFF', label: 'Off — the line runs through the gap' },
      { value: 'ON', label: 'On — a petal sits on the line' },
    ],
    label: 'Petal on mirror line',
    fmt: (v, ui) => (String(v) === 'ON'
      ? 'a centre petal is bisected by the line — it is the labellum'
      : `the line runs between the two inner petals — they are the labellum pair${Math.round(Number(ui.fanPerSide)) < 2 ? ', and there is no hood' : ''}`),
    tier: 'standard', role: 'arrangement',
    visibleWhen: { id: 'placement', oneOf: ['FAN'] } },

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
  /* "DEPTH", NOT "LAYERS" (Eva, Sep 1). The control is the same axis in both
     placements — how far the arrangement goes inward — and it is measured in
     layers under one and in turns under the other, so a label naming ONE of
     the two units is a label that lies in the other mode. The LABEL names the
     axis and the READ-OUT names the unit, which is the same split `placement`
     has carried since it shipped (the select shows the value, the read-out
     shows the derived step). The id does not move: `layerCount` is what the
     quantity IS in both readings, nothing persists a design yet, and an id is
     the expensive half of a rename — see RETIRED_IDS. */
  { id: 'layerCount', section: 'arrangement', kind: 'slider', min: 1, max: 3, step: 1, default: 1,
    label: 'Depth', fmt: (v, ui) => `${v} ${perDepth(ui)}${Number(v) === 1 ? '' : 's'}`,
    tier: 'standard', role: 'arrangement',
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
  /* LABELLED "SHRINK" for the reason `layerCount` is labelled "Depth": under
     CONTINUOUS there are no layers for a "layer size" to be the size of, and
     the quantity is the same either way — the ratio applied per unit of
     depth. The read-out carries the unit. */
  { id: 'layerSize', section: 'arrangement', kind: 'slider', min: 0.35, max: 0.9, step: 0.01, default: 0.72,
    label: 'Shrink', fmt: (v, ui) => `${Number(v).toFixed(2)}x per ${perDepth(ui)}`, tier: 'standard', role: 'arrangement',
    visibleWhen: { id: 'layerCount', min: 2 } },

  /* THE ALTERNATION, in slots. Default 0.50 — half a slot, which is the
     botanically universal alternation of successive whorls. Eva's ruling
     (Sep 1): EXPOSED, because asking for phase variations on the sheet is a
     request to play with it; the derive-it argument survives as the DEFAULT
     VALUE rather than as the absence of a control. */
  /* THE ONE CONTROL CONTINUOUS PLACEMENT LEAVES WITHOUT A JOB, and it HIDES
     rather than being reinterpreted. This offsets successive WHORLS by a
     fraction of a slot; a continuous bloom has one whorl, so there is nothing
     to offset and `rings[k].phase` is exactly 0 at every slot. Giving it a
     second meaning there — a global start azimuth, say — would be invisible
     (a rigid rotation) under a label that named something else, which is the
     stored-label-lie this project keeps finding. Its LABEL therefore keeps
     the word "layer" while `layerCount`, `layerSize` and `layerTilt` gave
     theirs up: this control only exists in the mode where layers do.
     PARKED, and deliberately not built on this id: a DIVERGENCE ANGLE control
     (golden angle against 1/3, 2/5, or free) is the genuinely interesting
     phyllotaxis parameter continuous mode opens up — and this is the worst
     available id to put it on, since a saved `layerPhase` would then feed a
     slot fraction into an angle. It gets its own id and its own ruling. */
  { id: 'layerPhase', section: 'arrangement', kind: 'slider', min: 0, max: 1, step: 0.01, default: 0.5,
    label: 'Layer offset', fmt: (v) => `${Number(v).toFixed(2)} slot`, tier: 'standard', role: 'arrangement',
    /* HIDDEN UNDER FAN AS WELL AS CONTINUOUS, for a reason of its own rather
       than by analogy. Under CONTINUOUS there is one whorl and nothing to
       offset. Under FAN there are whorls, and offsetting one would be a rigid
       rotation of the inner fan OFF the mirror line — it would destroy the one
       plane the whole arrangement is about, silently, under a label that says
       "layer offset". That is why the fan is eligible for slot roles at every
       depth: `phase` is 0 on every descriptor by construction, not by a value
       the visitor happens to have left alone.
       RECORDED, NOT BUILT: a fan-specific alternation — the inner whorl offset
       by HALF a spacing so its petals sit in the outer whorl's gaps — is
       still mirror-symmetric and is the bilabiate form a real corolla has. It
       flips the toggle's parity per whorl, so each whorl would carry its own
       involution, and session B's "the plane is the BLOOM's" would need
       restating per whorl. It is a refinement with its own ruling and its own
       evidence; do not start it on the strength of this note. */
    visibleWhen: { all: [{ id: 'layerCount', min: 2 }, { not: { id: 'placement', oneOf: ['CONTINUOUS', 'FAN'] } }] } },

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
    label: 'Tilt step', fmt: (v, ui) => `+${v}° per ${perDepth(ui)}`, tier: 'standard', role: 'arrangement',
    visibleWhen: { id: 'layerCount', min: 2 } },

  /* ===================================================================
     ZYGOMORPHY — THE INNER WHORLS' OWN FORM. Session A of two: per-LAYER
     roles, which is the iris (falls at the outer whorl, standards above it).
     Session B derives roles from a mirror plane and gives ONE SLOT its own
     record — the orchid's labellum and hood. Charter: "Zygomorphy".

     WHY THEY LIVE IN ARRANGEMENT AND NOT IN PETAL FORM, and it is not a
     preference: the charter's own ROOM TO GROW note predicted this shape
     exactly — "a layer-count control in that section with per-layer
     sub-controls gated on it by visibleWhen, the centerStyle pattern one
     level up, not a section per layer". `layerSize`, `layerPhase` and
     `layerTilt` already sit here under that pattern and these are its next
     three. It also keeps the panel gate honest: ARRANGEMENT ships OPEN, so
     the path route does not need a WITNESS for a section whose every control
     is hidden at the shipping default — a witness that has to set up its own
     precondition before it can move anything is a witness that can quietly
     measure nothing. When session B's slot roles arrive, a "Whorl
     differences" SECTION is the right home for the pair, and it will need
     that precondition mechanism; recorded so it is designed rather than
     discovered.

     TWO PREFIXES, TWO LAWS, and the distinction is load-bearing. `layer*` is
     a lambda-RAMP: the quantity is `lambda * value`, defined at every real
     depth, which is exactly why size and tilt survive CONTINUOUS. `inner*` is
     a ROLE OVERRIDE: a delta applied to whichever whorls carry the INNER
     role, with no lambda in it at all. Conflating them would put a ramp's
     label on an override's law.

     SIZE AND TILT ARE ABSENT ON PURPOSE (Eva's ruling, Sep 1). `layerSize`
     and `layerTilt` already own per-layer size and tilt; a role override of
     either would be a second owner of one quantity, and it would strand
     CONTINUOUS, whose only depth controls those are. So the role overrides
     cover exactly what the ramps do not.

     THE SET IS TRIMMED, AND THE ASYMMETRY DECIDED IT (Eva, Sep 1): adding a
     control later is one registry row and one row in ROLE_OVERRIDES, forever;
     retiring one becomes a schema bump plus a migration the day anything
     persists a design. RECORDED, NOT BUILT: `innerRoll`, `innerTwist`,
     per-layer taper deltas and a per-layer `tipThinning` delta — mechanically
     identical, none needed by the iris. Grow on evidence from real use.

     ALL THREE ARE HIDDEN UNDER CONTINUOUS, and that is a ruling with a
     measurement behind it rather than caution. Continuous placement has no
     layers to differentiate — J5 asserts precisely that — so an INNER role
     there would be a label for a group that does not exist. Reinterpreting it
     as "the inner turns" would be `layerPhase`'s trap: a second meaning under
     a name that already means something else. Named gate rows assert the
     controls are hidden AND that the export is bit-identical to the same
     design without them; a gated state is coverage, not the absence of it.

     DEFAULT 0 ON ALL THREE, so the shipping bloom is unmoved by construction:
     resolveRoleOverrides() SKIPS a zero delta outright, which leaves the ring
     carrying no record and petalStateFor() handing the builder the caller's
     own state object. The identity is object identity, not `x + 0`.

     THE RANGES ARE THE BASE CONTROLS' OWN, MIRRORED — and both gates assert
     that against ROLE_OVERRIDES rather than trusting this comment, because
     bloom-geometry.js cannot import the registry and clamps composed values
     into bounds it has to restate. Each delta spans the base control's full
     range in the direction that reaches its form: curl runs the whole signed
     span so standards can rise while falls hang, cup likewise, and tip
     breadth runs upward only because the base already starts at 0. */
  { id: 'innerCurl', section: 'roles', kind: 'slider', min: -180, max: 360, step: 5, default: 0,
    label: 'Inner curl', fmt: (v) => (Number(v) === 0 ? 'same as outer' : `${v > 0 ? '+' : ''}${v}° spine curl`),
    tier: 'standard', role: 'petal',
    visibleWhen: { all: [{ id: 'layerCount', min: 2 }, { not: { id: 'placement', oneOf: ['CONTINUOUS'] } }] } },

  { id: 'innerCup', section: 'roles', kind: 'slider', min: -0.8, max: 1.2, step: 0.01, default: 0,
    label: 'Inner cup', fmt: (v) => (Number(v) === 0 ? 'same as outer' : `${v > 0 ? '+' : ''}${Number(v).toFixed(2)} cup`),
    tier: 'standard', role: 'petal',
    visibleWhen: { all: [{ id: 'layerCount', min: 2 }, { not: { id: 'placement', oneOf: ['CONTINUOUS'] } }] } },

  { id: 'innerTipBreadth', section: 'roles', kind: 'slider', min: 0, max: 0.6, step: 0.01, default: 0,
    label: 'Inner tip', fmt: (v) => (Number(v) === 0 ? 'same as outer' : `+${Number(v).toFixed(2)} breadth`),
    tier: 'standard', role: 'petal',
    visibleWhen: { all: [{ id: 'layerCount', min: 2 }, { not: { id: 'placement', oneOf: ['CONTINUOUS'] } }] } },

  /* ===================================================================
     SLOT ROLES — THE ORCHID (session B, Sep 2). Eight controls, all Standard,
     all `role: 'petal'`, all in PETAL ROLES, all at their law's IDENTITY by
     default so the shipping bloom is unmoved by construction.

     TWO LAWS, AND THE SUFFIX SAYS WHICH. `*Size` is a MULTIPLIER (identity
     1.00); everything else is a DELTA (identity 0). ROLE_OVERRIDES is the one
     table that states this, and both gates assert these ranges against it —
     bloom-geometry.js cannot import the registry, so it restates the base
     control's bounds and the check is what makes it one owner rather than two.

     THE SET IS EVA'S, RULED IN SESSION (Sep 2): labellum gets size, tip
     breadth, tilt, cup and CURL; hood gets size, tilt and cup. The curl delta
     was added to the originally-ruled four for a measured reason —
     `petalTilt`'s own range starts at 0, so a tilt delta reaches HORIZONTAL
     and can never droop, and spine curl is the only control that makes a lip
     hang and reflex. LATERAL deliberately has NO controls: it is the residue,
     it is what the labellum and hood are read against, and it is the group
     that may legitimately be empty (at petalCount 3 there are no laterals at
     all). RECORDED, NOT BUILT, on session A's asymmetry argument — adding a
     control later is one registry row plus one ROLE_OVERRIDES row forever,
     while retiring one becomes a schema bump plus a migration the day
     anything persists a design: a lateral role override, a labellum roll or
     twist delta, and a per-role thickness delta (which `sheetThickness` may
     never have — see session A's never-overridable table, J4a).

     ALL EIGHT SHARE ONE PREDICATE, by ref rather than by eight copies. It is
     TRUE at the shipping default (RADIAL, layerCount 1), so their two
     drop-downs RENDER at first load with these eight visible and session A's
     three hidden — which is also what lets the panel gate witness them with
     no precondition.

     THEY LIVE IN TWO DROP-DOWNS NAMED BY PETAL NUMBER (Eva's ruling A, Sep 3;
     see the two `labellumGroup` / `hoodGroup` rows in SECTIONS), and the
     LABELS ARE THE FAN'S — "Size", "Tip", "Tilt", "Cup", "Spine curl" — so a
     visitor who has learned one placement's groups has learned the other's.
     The word "labellum" left the label and moved into the READ-OUT, on the
     split every static label in this panel keeps: the label names the slot in
     the panel, the read-out names what is in it right now. `said*` below is
     the one owner of that phrase per group, the fan's `said(ui)` precedent,
     and it is written for the states these controls are VISIBLE in — RADIAL,
     hence the through-slot plane, hence a labellum that is always the single
     petal on the line and a hood that is one petal at an even count and a
     pair at an odd one. Under FAN they are hidden and inert (ruling 4), so no
     phrase is evaluated where it could be read wrong. */

  { id: 'labellumSize', section: 'labellumGroup', kind: 'slider', min: 0.5, max: 2, step: 0.05, default: 1,
    label: 'Size',
    /* SATURATION IS TOLD, on the "(clamped)" discipline the roll floor, the
       tip floor and both foot clamps already carry: a composed value is
       clamped into the base control's own range, so at a long petal the
       multiplier stops moving before its slider does. The read-out cannot see
       the clamp itself (fmt has only the UI state), so it prints the ASKED-FOR
       millimetres and the app's read-out prints what was actually built. */
    fmt: (v, ui) => (Number(v) === 1 ? `same as the rest — ${saidLabellum(ui)}`
      : `x${Number(v).toFixed(2)} — ${saidLabellum(ui)}, asks ${(Number(ui.petalLength) * Number(v)).toFixed(0)} x ${(Number(ui.petalWidth) * Number(v)).toFixed(0)} mm`),
    tier: 'standard', role: 'petal', visibleWhen: { ref: 'slotRolesEligible' } },

  { id: 'labellumTipBreadth', section: 'labellumGroup', kind: 'slider', min: 0, max: 0.6, step: 0.01, default: 0,
    label: 'Tip', fmt: (v, ui) => (Number(v) === 0 ? `same as the rest — ${saidLabellum(ui)}` : `+${Number(v).toFixed(2)} breadth — ${saidLabellum(ui)}`),
    tier: 'standard', role: 'petal', visibleWhen: { ref: 'slotRolesEligible' } },

  { id: 'labellumTilt', section: 'labellumGroup', kind: 'slider', min: -75, max: 75, step: 1, default: 0,
    label: 'Tilt', fmt: (v, ui) => (Number(v) === 0 ? `same as the rest — ${saidLabellum(ui)}` : `${v > 0 ? '+' : ''}${v}deg tilt — ${saidLabellum(ui)}`),
    tier: 'standard', role: 'petal', visibleWhen: { ref: 'slotRolesEligible' } },

  { id: 'labellumCup', section: 'labellumGroup', kind: 'slider', min: -0.8, max: 1.2, step: 0.01, default: 0,
    label: 'Cup', fmt: (v, ui) => (Number(v) === 0 ? `same as the rest — ${saidLabellum(ui)}` : `${v > 0 ? '+' : ''}${Number(v).toFixed(2)} cup — ${saidLabellum(ui)}`),
    tier: 'standard', role: 'petal', visibleWhen: { ref: 'slotRolesEligible' } },

  { id: 'labellumCurl', section: 'labellumGroup', kind: 'slider', min: -180, max: 360, step: 5, default: 0,
    label: 'Spine curl', fmt: (v, ui) => (Number(v) === 0 ? `same as the rest — ${saidLabellum(ui)}` : `${v > 0 ? '+' : ''}${v}deg spine curl — ${saidLabellum(ui)}`),
    tier: 'standard', role: 'petal', visibleWhen: { ref: 'slotRolesEligible' } },

  { id: 'hoodSize', section: 'hoodGroup', kind: 'slider', min: 0.5, max: 2, step: 0.05, default: 1,
    label: 'Size',
    fmt: (v, ui) => (Number(v) === 1 ? `same as the rest — ${saidHood(ui)}`
      : `x${Number(v).toFixed(2)} — ${saidHood(ui)}, asks ${(Number(ui.petalLength) * Number(v)).toFixed(0)} x ${(Number(ui.petalWidth) * Number(v)).toFixed(0)} mm`),
    tier: 'standard', role: 'petal', visibleWhen: { all: [{ ref: 'slotRolesEligible' }, { not: { ref: 'hoodEmpty' } }] } },

  { id: 'hoodTilt', section: 'hoodGroup', kind: 'slider', min: -75, max: 75, step: 1, default: 0,
    label: 'Tilt', fmt: (v, ui) => (Number(v) === 0 ? `same as the rest — ${saidHood(ui)}` : `${v > 0 ? '+' : ''}${v}deg tilt — ${saidHood(ui)}`),
    tier: 'standard', role: 'petal', visibleWhen: { all: [{ ref: 'slotRolesEligible' }, { not: { ref: 'hoodEmpty' } }] } },

  { id: 'hoodCup', section: 'hoodGroup', kind: 'slider', min: -0.8, max: 1.2, step: 0.01, default: 0,
    label: 'Cup', fmt: (v, ui) => (Number(v) === 0 ? `same as the rest — ${saidHood(ui)}` : `${v > 0 ? '+' : ''}${Number(v).toFixed(2)} cup — ${saidHood(ui)}`),
    tier: 'standard', role: 'petal', visibleWhen: { all: [{ ref: 'slotRolesEligible' }, { not: { ref: 'hoodEmpty' } }] } },

  /* ===================================================================
     PER-PETAL CONTROLS — session 11, four per group, GENERATED from one
     declaration in the same order and from the same ceiling as the matching
     rows in ROLE_OVERRIDES, so the two tables cannot drift into two lists.
     Every id is an ordinary id with an ordinary DOM input; only the typing is
     saved. A grep for `petal3Cup` lands here, which names the pattern.

     THE SET (Eva's ruling 2, Sep 3): size x, tilt delta, cup delta, curl
     delta — the labellum's five MINUS tip breadth, with spine curl taking its
     place because curl is what makes a petal hang and reflex and it is the
     one control that can. TIP BREADTH IS DELIBERATELY ABSENT and is one row
     here plus one in ROLE_OVERRIDES the day Eva wants it; see that table's
     header, and see bloom-geometry.js's `slotRolesEligible` for the cost the
     supersession ruling attaches to its absence.

     RANGES ARE THE LABELLUM'S, deliberately: the same base clamps, so
     OVERRIDE_BOUNDS gains no entry, and the harness's per-law dead-zone check
     passes unchanged (a delta's range must sit inside baseMin-baseMax ..
     baseMax-baseMin; a multiplier must be able to reach the clamp both ways).

     VISIBILITY IS THE GROUP'S OWN EXISTENCE, and it is the numbering's guard
     as well as its presentation. Group k exists iff the fan has at least k
     orbits: `perSide + 1` of them with a mirror-line petal, `perSide` without.
     Z1's biconditional asserts these predicates against footRing()'s OWN
     census in BOTH directions — a group with members whose sliders are hidden
     is "shipped means reachable" violated silently, and a group with no
     members whose sliders show is a control naming something that does not
     exist. That is what catches a numbering that fails to follow the toggle. */
  ...Array.from({ length: MAX_FAN_GROUPS }, (_, i) => {
    const k = i + 1;
    /* ONE OWNER FOR "WHAT IS THIS GROUP RIGHT NOW", shared by all four
       read-outs of the group so they cannot end up with four wordings — the
       `perDepth(ui)` precedent. It names MEMBERSHIP, which is the thing the
       static label cannot: with a mirror-line petal group 1 is that single
       petal and group k>1 is the pair k-1 steps out; without one, group k is
       the pair k out. */
    const said = (ui) => {
      const centre = String(ui.fanCenterPetal) === 'ON';
      if (centre && k === 1) return 'the mirror-line petal';
      const out = centre ? k - 1 : k;
      return out === 1 ? 'the inner pair' : `the pair ${out} out from the line`;
    };
    const seen = {
      all: [
        { ref: 'perPetalEligible' },
        { any: [
          { all: [{ id: 'fanCenterPetal', oneOf: ['ON'] },  { id: 'fanPerSide', min: k - 1 }] },
          { all: [{ id: 'fanCenterPetal', oneOf: ['OFF'] }, { id: 'fanPerSide', min: k }] },
        ] },
      ],
    };
    const row = (suffix, extra) => ({
      id: `petal${k}${suffix}`, section: `petal${k}`, kind: 'slider',
      tier: 'standard', role: 'petal', visibleWhen: seen, ...extra,
    });
    return [
      row('Size', {
        min: 0.5, max: 2, step: 0.05, default: 1, label: 'Size',
        /* The asked-for millimetres, on the labellum's own discipline: the
           composed value is clamped into the base control's range, so a
           multiplier saturates before its slider does. This prints what was
           ASKED; the app's read-out prints what was BUILT, from footRing()'s
           out-parameter rather than re-derived. */
        fmt: (v, ui) => (Number(v) === 1 ? `same as the rest — ${said(ui)}`
          : `x${Number(v).toFixed(2)} — ${said(ui)}, asks ${(Number(ui.petalLength) * Number(v)).toFixed(0)} x ${(Number(ui.petalWidth) * Number(v)).toFixed(0)} mm`),
      }),
      row('Tilt', {
        min: -75, max: 75, step: 1, default: 0, label: 'Tilt',
        fmt: (v, ui) => (Number(v) === 0 ? `same as the rest — ${said(ui)}` : `${v > 0 ? '+' : ''}${v}deg tilt — ${said(ui)}`),
      }),
      row('Cup', {
        min: -0.8, max: 1.2, step: 0.01, default: 0, label: 'Cup',
        fmt: (v, ui) => (Number(v) === 0 ? `same as the rest — ${said(ui)}` : `${v > 0 ? '+' : ''}${Number(v).toFixed(2)} cup — ${said(ui)}`),
      }),
      row('Curl', {
        min: -180, max: 360, step: 5, default: 0, label: 'Spine curl',
        fmt: (v, ui) => (Number(v) === 0 ? `same as the rest — ${said(ui)}` : `${v > 0 ? '+' : ''}${v}deg spine curl — ${said(ui)}`),
      }),
    ];
  }).flat(),

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

