/* ===================================================================
   verify-bloom-panel.mjs — BUILD GATE: every control the registry declares
   is REACHABLE in the panel, and collapsing a section does not take it away.

   SEVERAL ROUTES, AND NONE SUBSTITUTES FOR ANOTHER. This is the flower
   project's dump-versus-sheet lesson, moved to the thing it was learned on:
   a check that sets state and evaluates predicates proves the DECLARATIONS,
   and it cannot catch an app that never re-runs — `predicateDrivers` was
   imported and never called, and the panel silently stopped responding while
   every declaration stayed correct. Each route below names the failure it
   exists for, and --negative-control requires every one of them to fire.

     (a) THE DECLARATION ROUTE — the render census. Every non-retired registry
         control appears in the panel EXACTLY ONCE, in the section it declares,
         in the registry's order, with exactly one label and one read-out span;
         every section renders exactly once, in SECTIONS order, at the
         first-load `open` the registry declares; nothing appears in the panel
         that is not a registry control; and each wrapper's `hidden` agrees
         with its own predicate evaluated against the same state. Counting is
         the point: "exactly once" catches the duplicate-span defect as well as
         the missing-control one, and only one of those is visible by eye.

     (c) THE ACCORDION ROUTE — the panel holds at most one open section: the
         declared one at first load, exactly the clicked one after a real
         summary click, and none after the open one is closed. Every accordion
         assertion awaits a frame, because `toggle` is QUEUED rather than
         synchronous (measured) and a synchronous read would fail on correct
         code.

     (d) THE VISIBILITY-TRANSITION ROUTE — does a gated control ever APPEAR?
         Route (a) evaluates every predicate at DEFAULTS only, which is ONE
         DIRECTION: a control gated on `layerCount >= 2` is hidden there and
         would pass route (a) even if it never appeared at all, and so would
         `centerRise`, gated on DOME since the centre rig shipped and never
         asserted to appear by this gate. So each DRIVER named by any
         predicate (derived from the registry, never listed) is driven through
         the real UI to every value that can change the dependent set, and
         EVERY control's `hidden` is re-checked against its own predicate at
         the new state — appearance and disappearance in one pass. The flower
         paid for checking only one direction: Advanced silently stopped
         showing 25 controls while every gate passed.

     (f) ROLES ELIGIBILITY, COMBINED (Eva, Sep 2 amendment). Route (d) moves
         one driver at a time off DEFAULTS; `slotRolesEligible` reads THREE
         drivers at once (placement, layerCount, layerPhase), so a state that
         moves two of them together — SPIRAL at layerCount 3, FAN at a
         non-zero layerPhase — is never reached by route (d) at all. This
         route drives those combined states through the real UI and checks
         THREE-WAY agreement: the DOM wrapper's `hidden`, the registry
         predicate, and bloom-geometry.js's OWN `slotRolesEligible(state)`
         (exposed via `__bloomMetrics()`) — because a control that is visible
         but whose role the geometry never applies is "showing where it
         drives nothing" even when the DOM and the registry agree with each
         other.

     (e) THE LOW-COUNT SPIRAL FLAG, BOTH DIRECTIONS. The flag is the entire
         handling of golden-angle placement below eight petals (there is no
         geometric threshold to gate on — measured, see GOLDEN_ANGLE), so it
         must appear when the condition holds AND be absent when it does not:
         a flag only ever asserted present is a flag that can be stuck on. The
         threshold is imported, never retyped.

     (b) THE PATH ROUTE — reactivity through a CLOSED section. For every
         section collapsed at first load, a control inside it is driven with
         real input/change events and the app must REACT: its own read-out span
         must change (refreshLabels runs only from regenerate(), so a changed
         span is proof a rebuild happened), the app's state snapshot must carry
         the new value, and a GEOMETRY witness chosen per section must move.
         The section must still be closed afterwards.

   AND THE COLLAPSE INVARIANT ITSELF, asserted rather than believed: the app's
   whole state snapshot is IDENTICAL with every section collapsed and with
   every section expanded, and toggling every section open and shut moves no
   geometry (live triangle count and ring radius unchanged). Collapse is a
   presentation state; readUI, the gates' read-back and the export path cannot
   see it. That is the property the whole grouping rests on.

   WHY A GEOMETRY WITNESS IS PICKED PER SECTION rather than one for all. The
   obvious witness — triangle count — is the WRONG one here and would have
   made this gate a passing no-op for the form section: the four curves cost
   exactly zero triangles at every setting, by construction (fixed topology is
   what makes them free). So each closed section names a witness that its own
   control must move, and the gate fails if the witness does not move.

   WHAT THIS GATE DOES NOT COVER (read before quoting a PASS):
     - Anything about the geometry being right, watertight, or connected.
       Those are verify-bloom-export.mjs and verify-bloom-connectedness.mjs,
       and this gate's passing says nothing about either.
     - Bytes. A pure-UI change is asserted byte-identical by
       tools/diff-bloom-bytes.mjs, not here.
     - Looks. Whether the grouping READS well is a ruling made from
       tools/shot-bloom-panel.mjs's sheet; the metric screens, eyes decide.
     - Controls that are hidden by predicate at the state under test are
       censused for PRESENCE and agreement with their predicate, not driven.
       A hidden control's reactivity is the existing gates' business, which
       set every control through the same route on all 125 rows.

         RUN:  node tools/verify-bloom-panel.mjs
         node tools/verify-bloom-panel.mjs --negative-control
           Breaks all three routes on purpose — deletes one control's wrapper
           from the DOM, replaces another control's element with a
           listener-less clone (the app-does-not-react failure, exactly), and
           suppresses the accordion's toggle before the panel's own capture
           listener can see it, and freezes every wrapper's `hidden` so the
           panel stops re-evaluating visibility while its declarations stay
           perfect, and freezes a derived section label so the panel stops
           renaming a drop-down whose petal number moved, and freezes the
           hiddenReason caption so the panel stops saying why two drop-downs
           are missing — and replaces the print-preview box with a
           listener-less clone so the viewport never switches geometry, and
           freezes the read-out on the depth rows so the RINGS NARROWER THAN
           A FOOT line can never appear — and requires this run to FAIL on
           all eight. A check nobody has seen fail is a hope.

     (i) THE PRINT-PREVIEW TOGGLE (Sep 3). View chrome, not a registry
         control, so route (a)'s census would fail it as a stray input if it
         ever landed inside the panel — that is asserted. Then the box is
         flipped through its real 'change' event on a configuration where
         the export floor BINDS (ALL THIN), and the app must switch
         geometry: a rebuild counted, `shownMode` reading export, `liveTris`
         null (never the export count under a live label), the hub radius
         equal to footRing()'s own export-mode answer and different from
         its live one, the read-out's first line naming PRINT PREVIEW and
         the print-truth pair's marker on the PRINTED line — with the whole
         registry state unmoved. Then the load-bearing claim: the STL
         exported with the box ON is BYTE-IDENTICAL to the one exported
         with it OFF, on the same page. Then OFF restores live. Measured on
         two mutants before this existed: an export path that read view
         chrome was invisible to every shipped instrument in the gates' own
         state (8/8 rows byte-identical), which is why this route exists.

     (j) THE INNER-RING LINE, BOTH DIRECTIONS (Sep 3). Where a derived depth
         clamp was proposed and rejected, the read-out SAYS which rings are
         narrower than one foot. Present iff footRing()'s own
         `underFootFloor` is set on some ring — asserted on rows where it
         must appear (six layers at spread min; a shipped depth-3 row that
         was already under the floor) and rows where it must not (the
         defaults; six layers at spread max), from the app's metrics rather
         than from the row's own expectation alone, so a frozen flag in the
         owner and a stuck line in the read-out both fire.
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, CONTROLS, SECTIONS,
         RETIRED_IDS, DEFAULTS, evalPredicate, predicateDrivers, verifySections,
         SPIRAL_LEGIBLE_COUNT, MAX_FAN_GROUPS, exportStl, settleBuild, shownModeOf, MIN_FEATURE_MM, FOOT_MIN_WIDTH_MM } from './bloom-harness.mjs';
import { sectionLabel } from '../bloom-registry.js';
import { mirrorPartner } from '../bloom-geometry.js';

const NEGATIVE_CONTROL = process.argv.includes('--negative-control');

/* THE GEOMETRY WITNESS for each section that ships collapsed — the control to
   drive, the value to drive it to, and the number in the app's own metrics
   that MUST move as a result. Declared here beside the reason, never sniffed
   from the registry: which quantity a control moves is a fact about the
   geometry, and a gate guessing at it is a gate that passes when the control
   stops working. Every id and value is checked against the registry below, so
   a range change cannot leave this table quietly out of bounds. */
const WITNESS = {
  shape: { id: 'petalWidth', value: '30',
           /* The silhouette costs no triangles either (fixed-topology grid),
              so width is witnessed where it reaches PAST the blade: footRing()'s
              area rule reads the petal's width, so a wider petal is a wider foot
              and a larger ring. A witness that leaves the control's own part is
              the stronger one. */
           read: (m) => `${m.ringWidth}/${m.ringRadius}`, what: 'ringWidth/ringRadius' },
  form: { id: 'petalCup', value: '0.6',
          /* The four curves cost ZERO triangles by construction, so the count
             cannot be the witness. Cup is the one of the four that stretches
             the material across the width, and the metric ratio is what says
             so: 1.0000 flat, above 1 at any cup. */
          read: (m) => m.petalForm && m.petalForm.metricMax, what: 'petalForm.metricMax' },
  center: { id: 'centerStyle', value: 'RING',
            /* A style change rebuilds the centre; both the reported style and
               its own triangle count move off DISC's. */
            read: (m) => `${m.centerStyle}/${m.centerTris}`, what: 'centerStyle/centerTris' },
  /* PETAL ROLES — witnessed by the labellum's SIZE, and the witness needed NO
     PRECONDITION, which is worth recording because session A predicted it
     would. Session A reasoned that a "whorl differences" section would ship
     with every control hidden at the default (its three `inner*` deltas need
     layerCount >= 2), so the path route would have to set up its own
     precondition first — and warned that a witness which must arrange its own
     preconditions is a witness that can quietly measure nothing.

     The layerPhase gating ruling changed that before it was built. Slot roles
     apply at layerCount 1, so `slotRolesEligible` is TRUE at the shipping
     default: this section RENDERS at first load with its eight slot controls
     visible and session A's three hidden, and one of them moves geometry from
     a clean page. Evaluated, not assumed — the declaration route asserts that
     exact first-load state in both directions below.

     THE WITNESS REACHES PAST THE CONTROL'S OWN VALUE, like `shape` and
     `thickness` above: a labellum size multiplier splits the whorl into three
     descriptors and changes the effective petalLength the BUILDER reports
     using. Triangle count could not be the witness — a role override moves
     vertices on a fixed-topology grid and costs exactly zero triangles, which
     would have made this assertion a passing no-op. */
  /* "PETAL ROLES" ITSELF NOW HOLDS ONLY SESSION A'S THREE LAYER DELTAS as
     controls of its own (Eva's ruling A, Sep 3, moved the eight slot-role
     sliders into the two rosette drop-downs below), and all three need a
     second whorl — so this witness carries the precondition session A
     predicted for exactly this section, and the anti-vacuity clause below
     refuses to drive a control that is still hidden after it. The `before`
     is read AFTER layerCount is 2, so the delta belongs to innerCup. */
  /* SINCE EVA'S RULING OF SEP 3 "PETAL ROLES" HOLDS THE ALL-PETALS TRIO AT THE
     SHIPPING DEPTH, so the section is witnessed by one of them with NO
     precondition again (the innerCup-with-layerCount-2 witness this replaced
     is kept in the git record); the delta must reach the one whorl's blade. */
  roles: { id: 'allCurl', value: '180',
           read: (m) => {
             const a = m.petalRingApplied[0];
             return `${m.rings.length}/${m.allPetalsEligible}/${a ? a.applied.petalSpineCurl : 'no descriptor'}`;
           },
           what: 'descriptor count / all-petals eligibility / the spine curl the builder used on the one whorl' },
  /* THE ROSETTE'S TWO GROUPS — the labellum's witness is the one "roles"
     carried until ruling A (no precondition: slot roles are eligible at the
     shipping default), and the hood's is its twin read from the HOOD
     descriptor, which exists only once the override splits the whorl. */
  /* BOTH ROSETTE GROUPS NEED TWO WHORLS IN STEP NOW (Eva, Sep 3: the one-whorl
     orchid is retired), so both carry that precondition and the anti-vacuity
     clause refuses to drive a control still hidden after it. */
  labellumGroup: { id: 'labellumSize', value: '1.6',
           pre: [{ id: 'layerCount', value: '2' }, { id: 'layerPhase', value: '0' }],
           read: (m) => `${m.rings.length}/${m.slotRolesSplit}/${m.petalRingApplied[0] && m.petalRingApplied[0].applied.petalLength}`,
           what: 'descriptor count / split / the labellum petalLength the builder used' },
  hoodGroup: { id: 'hoodSize', value: '1.6',
           pre: [{ id: 'layerCount', value: '2' }, { id: 'layerPhase', value: '0' }],
           read: (m) => {
             const idx = m.rings.findIndex((r) => r.slotRole === 'HOOD');
             const applied = idx >= 0 && m.petalRingApplied[idx] ? m.petalRingApplied[idx].applied.petalLength : 'no descriptor';
             return `${m.rings.length}/${m.slotRolesSplit}/${idx}/${applied}`;
           },
           what: 'descriptor count / split / index and effective petalLength of the HOOD descriptor' },
  /* ===================================================================
     THE PER-PETAL SECTIONS — nine of them, and they are the case SESSION A
     PREDICTED THIS GATE WOULD ONE DAY HAVE TO HANDLE and session B escaped.

     Session A's note: "a witness that has to set up its own precondition
     before it can move anything is a witness that can quietly measure
     nothing", recorded when it expected a "Whorl differences" section to ship
     with every control hidden. The `layerPhase` ruling spared session B — slot
     roles apply at layerCount 1, so `roles` renders at first load. Per-petal
     roles are FAN-only and the shipping placement is RADIAL, so these nine
     sections ship BOTH collapsed and HIDDEN, and driving `petal3Cup` from a
     clean page would move exactly nothing while reporting a pass.

     SO THE PRECONDITION IS DECLARED AND THEN ASSERTED. `pre` is applied first,
     through the same real-events path (never by clicking), and the gate then
     requires the witness control to be VISIBLE before it is driven — which is
     what stops the mechanism from becoming the very thing session A warned
     about. The `before` metrics are read AFTER the precondition, so the delta
     is attributable to the witness control and not to the placement change
     that made it reachable.

     8 PER SIDE WITH A MIRROR-LINE PETAL, because that is the only arrangement
     in which ALL NINE groups have members — a witness for group 7 at the
     default three per side would be driving a control for a group that does
     not exist, which is the same vacuity one level down.

     THE WITNESS REACHES PAST THE CONTROL'S OWN VALUE, like every other entry
     here: triangle count is ZERO-delta for an override by construction, so
     what moves is the descriptor count, the split flag, and the effective
     petalCup THAT GROUP's petal was built with — read from the builder's own
     record, which is the only thing that can see a value that never arrives. */
  ...Object.fromEntries(Array.from({ length: MAX_FAN_GROUPS }, (_, i) => {
    const k = i + 1;
    return [`petal${k}`, {
      id: `petal${k}Cup`, value: '0.6',
      pre: [{ id: 'placement', value: 'FAN' }, { id: 'fanCenterPetal', value: 'ON' }, { id: 'fanPerSide', value: '8' }],
      read: (m) => {
        const idx = m.rings.findIndex((r) => r.petalRole === `PETAL_${k}`);
        const applied = idx >= 0 && m.petalRingApplied[idx] ? m.petalRingApplied[idx].applied.petalCup : 'no descriptor';
        return `${m.rings.length}/${m.slotRolesSplit}/${idx}/${applied}`;
      },
      what: `descriptor count / split / index and effective petalCup of group ${k}'s own petal`,
    }];
  })),

  thickness: { id: 'sheetThickness', value: '2.4',
              /* footRing()'s area rule reads the thickness the solids are
                 actually built at, so a thicker sheet moves the RING RADIUS —
                 the whole arrangement, not a wall. A witness that reaches
                 past the control's own part is the stronger one. */
              read: (m) => `${m.ringThickness}/${m.ringRadius}`, what: 'ringThickness/ringRadius' },
};

const fail = [];
const note = (m) => fail.push(m);
const ok = [];

/* verifySections() has already run at module load (the registry calls it), so
   reaching this line means the relation holds; calling it explicitly makes the
   gate's output say so rather than leaving it implicit in the absence of a
   crash. */
verifySections();
ok.push(`registry: ${SECTIONS.length} sections, ${CONTROLS.length} controls, ${RETIRED_IDS.length} retired ids — relation verified`);

const { server, port } = await serveRepo();
const { browser, page } = await launchPage();
await openBloom(page, port);

/* ---------------- (a) the render census ---------------- */
const census = await page.evaluate(({ controls, sections, retired, breakIt }) => {
  if (breakIt) {
    /* NEGATIVE CONTROL, route (a): a control that declares itself, builds,
       exports, and cannot be reached. Removing the WRAPPER (not the input)
       is the realistic shape — a generator loop that appended to the wrong
       parent leaves exactly this. */
    document.getElementById('petalTwist').closest('.bl-ctrl').remove();
  }
  const root = document.getElementById('panelControls');
  const out = { sections: [], controls: [], strayInputs: [], straySpans: [] };
  for (const el of root.querySelectorAll('details')) {
    out.sections.push({ id: el.dataset.section, open: el.open, hidden: el.hidden,
                        summary: el.querySelector('summary')?.textContent ?? null });
  }
  for (const c of controls) {
    const all = root.querySelectorAll(`#${CSS.escape(c.id)}`);
    const el = all[0] || null;
    const wrap = el ? el.closest('.bl-ctrl') : null;
    const sec = wrap ? wrap.closest('details') : null;
    out.controls.push({
      id: c.id,
      count: all.length,
      wrappers: wrap ? root.querySelectorAll(`.bl-ctrl > label[for="${c.id}"]`).length : 0,
      valSpans: wrap ? wrap.querySelectorAll('.bl-val').length : 0,
      labels: wrap ? wrap.querySelectorAll('label').length : 0,
      section: sec ? sec.dataset.section : null,
      hidden: wrap ? wrap.hidden : null,
      /* Position of this control's wrapper among the control wrappers of its
         own section — the within-section order, read from the DOM. */
      indexInSection: sec ? [...sec.querySelectorAll(':scope > .bl-ctrl')].indexOf(wrap) : -1,
    });
  }
  /* Nothing in the panel that the registry does not declare. */
  const known = new Set(controls.map((c) => c.id));
  for (const el of root.querySelectorAll('input, select')) if (!known.has(el.id)) out.strayInputs.push(el.id || '(no id)');
  for (const sp of root.querySelectorAll('.bl-val')) {
    const w = sp.closest('.bl-ctrl');
    const id = w ? w.querySelector('input, select')?.id : null;
    if (!id || !known.has(id)) out.straySpans.push(id || '(orphan)');
  }
  out.retiredPresent = retired.filter((id) => !!document.getElementById(id));
  out.sectionOrder = out.sections.map((s) => s.id).join('>');
  out.declaredOrder = sections.map((s) => s.id).join('>');
  return out;
}, { controls: CONTROLS.map((c) => ({ id: c.id })), sections: SECTIONS.map((s) => ({ id: s.id })),
     retired: RETIRED_IDS, breakIt: NEGATIVE_CONTROL });

/* Sections: one each, in order, at the declared first-load openness. */
if (census.sectionOrder !== census.declaredOrder) {
  note(`section order in the DOM is "${census.sectionOrder}", registry declares "${census.declaredOrder}"`);
} else ok.push(`sections render once each, in registry order: ${census.declaredOrder}`);
for (const s of SECTIONS) {
  const rendered = census.sections.filter((r) => r.id === s.id);
  if (rendered.length !== 1) { note(`section "${s.id}" renders ${rendered.length} times, expected exactly 1`); continue; }
  if (rendered[0].open !== s.open) note(`section "${s.id}" first-load open=${rendered[0].open}, registry declares open=${s.open}`);
  if (rendered[0].summary !== sectionLabel(s, DEFAULTS)) note(`section "${s.id}" summary reads "${rendered[0].summary}", registry declares "${sectionLabel(s, DEFAULTS)}" at DEFAULTS`);
}
ok.push('first-load open state matches the registry literal for every section: '
  + SECTIONS.map((s) => `${s.id}=${s.open ? 'open' : 'closed'}`).join(' '));

/* Controls: exactly once, right section, right order, predicate agreement. */
const byId = Object.fromEntries(census.controls.map((r) => [r.id, r]));
const expectedIndex = {};
for (const s of SECTIONS) {
  CONTROLS.filter((c) => c.section === s.id).forEach((c, i) => { expectedIndex[c.id] = i; });
}
let censused = 0;
for (const c of CONTROLS) {
  const r = byId[c.id];
  if (r.count !== 1) { note(`control "${c.id}" renders ${r.count} times in the panel, expected exactly 1`); continue; }
  if (r.labels !== 1) note(`control "${c.id}" carries ${r.labels} labels, expected exactly 1`);
  if (r.valSpans !== 1) note(`control "${c.id}" carries ${r.valSpans} read-out spans, expected exactly 1`);
  if (r.section !== c.section) note(`control "${c.id}" renders in section "${r.section}", declares "${c.section}"`);
  if (r.indexInSection !== expectedIndex[c.id]) {
    note(`control "${c.id}" is at position ${r.indexInSection} within "${r.section}", registry order puts it at ${expectedIndex[c.id]}`);
  }
  /* The DECLARATION tied to the DOM: the wrapper's hidden must be exactly
     what this control's own predicate says at the state under test. */
  const want = !evalPredicate(c.visibleWhen, DEFAULTS);
  if (r.hidden !== want) note(`control "${c.id}" wrapper hidden=${r.hidden}, its predicate at DEFAULTS says hidden=${want}`);
  censused++;
}
if (censused === CONTROLS.length) ok.push(`all ${CONTROLS.length} controls render exactly once, in the declared section, in registry order, agreeing with their own predicate`);
if (census.strayInputs.length) note(`panel contains input(s) no registry control declares: ${census.strayInputs.join(', ')}`);
if (census.straySpans.length) note(`panel contains orphan read-out span(s): ${census.straySpans.join(', ')}`);
if (census.retiredPresent.length) note(`retired id(s) present in the DOM: ${census.retiredPresent.join(', ')}`);

/* A section is hidden iff every control in it is hidden AND every child
   section is — the derived rule, checked against the DOM rather than trusted
   from the code that wrote it. The child clause is what a parent holding only
   drop-downs needs: "Petal roles" has three controls of its own, all hidden at
   one whorl, and is on screen because its two rosette groups are. */
/* THE CAPTIONS A PARENT HOLDS — one per distinct hiddenReason object among its
   children (the registry declares a reason once and references it from every
   section that hides for it). A caption is predicted visible exactly when its
   `when` holds AND every section naming it is hidden. */
const captionsOf = (parentId) => {
  const seen = new Map();
  for (const x of SECTIONS) {
    if (x.parent !== parentId || !x.hiddenReason) continue;
    if (!seen.has(x.hiddenReason)) seen.set(x.hiddenReason, []);
    seen.get(x.hiddenReason).push(x.id);
  }
  return [...seen].map(([reason, sections]) => ({ reason, sections }));
};
const captionWantHidden = (cap, state, sectionHidden) => !(evalPredicate(cap.reason.when, state) && cap.sections.every((id) => sectionHidden(id) === true));
const wantSectionHidden = (secId, controlHidden, sectionHidden, captionHidden = () => true) => {
  const members = CONTROLS.filter((c) => c.section === secId);
  const kids = SECTIONS.filter((x) => x.parent === secId);
  return members.every((c) => controlHidden(c.id) === true) && kids.every((k) => sectionHidden(k.id) === true)
    && captionsOf(secId).every((cap) => captionHidden(cap) === true);
};
for (const s of SECTIONS) {
  const rendered = census.sections.find((r) => r.id === s.id);
  const want = wantSectionHidden(s.id, (id) => byId[id].hidden, (id) => census.sections.find((r) => r.id === id)?.hidden,
    (cap) => captionWantHidden(cap, DEFAULTS, (id) => census.sections.find((r) => r.id === id)?.hidden));
  if (rendered && rendered.hidden !== want) {
    note(`section "${s.id}" hidden=${rendered.hidden}, but "every member control and child section hidden" is ${want}`);
  }
}
ok.push('every section\'s hidden state equals "every control in it, and every child section, is hidden"');

/* ---------------- the accordion, and the collapse invariant ----------------

   THE PANEL OPENS AT MOST ONE SECTION. Three things are asserted, and the
   third is the one a careless version would omit:
     A1  at first load EXACTLY the section the registry declares is open;
     A2  opening any section — through a REAL click on its summary, the
         visitor's own route — leaves exactly that one open;
     A3  closing the open one leaves ZERO open and nothing springs open by
         itself, because "every section shut" is a state a visitor reaches and
         the registry is allowed to declare.

   EVERY ACCORDION ASSERTION AWAITS A FRAME, and that is a measured
   requirement rather than caution. `toggle` is QUEUED, not synchronous: two
   programmatic opens in one tick both land and the handler settles afterwards.
   A gate reading exclusivity synchronously would fail on correct code, which
   is the shape of a check that gets "fixed" by weakening the app.

   THE COLLAPSE INVARIANT IS NOW MEASURED ACROSS THE TRAVERSAL, not against an
   all-expanded state — under the accordion there is no all-expanded state to
   measure, and asserting one would be asserting something about a panel that
   cannot exist. Instead: the app's whole state snapshot and its geometry must
   be identical with every section shut and at every step of opening all five
   in turn. Collapse and the accordion are presentation; readUI, the export
   path and the gates cannot see either. */
const accordion = await page.evaluate(async ({ ids, declared, breakIt }) => {
  if (breakIt) {
    /* NEGATIVE CONTROL, the accordion route: the exclusive-open handler is
       never REACHED. `toggle` does not bubble, so the handler is a capture
       listener on the panel root; a capture listener registered later on the
       DOCUMENT still runs earlier (capture descends), and stopPropagation
       there means the panel's own listener never sees a toggle. That is the
       same defect shape as declarations-right / app-doesn't-react, aimed at
       the accordion: the sections still open and close, and nothing closes
       the others. */
    document.addEventListener('toggle', (e) => e.stopPropagation(), true);
  }
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const openNow = () => ids.filter((id) => document.getElementById(`sec-${id}`).open);
  const out = { steps: [], states: [], geometry: [] };
  const snap = () => {
    const m = window.__bloomMetrics();
    out.states.push(JSON.stringify(window.__bloomUIState()));
    out.geometry.push(`${m.liveTris}/${m.ringRadius}`);
  };

  out.firstLoad = openNow();
  out.declared = declared;
  out.lastOpened = null;
  snap();

  /* A2 — every section, opened the way a visitor opens it.

     THE ORDER IS NOT THE REGISTRY'S, and the reason is a real trap: clicking
     a summary TOGGLES. The section that starts open would be CLOSED by its
     own click, so a naive walk down SECTIONS tests the wrong transition on
     exactly one row — and reports the panel broken when it is correct. The
     initially-open section is moved to the END, where the accordion has since
     closed it, so every click in this walk is an OPENING and all five are
     exercised as transitions. The `if (!det.open)` guard keeps that true even
     if the starting state ever changes. */
  const startOpen = openNow();
  const order = [...ids.filter((id) => !startOpen.includes(id)), ...ids.filter((id) => startOpen.includes(id))];
  out.order = order;
  for (const id of order) {
    const det = document.getElementById(`sec-${id}`);
    if (!det.open) {
      document.querySelector(`#sec-${id} > summary`).click();
      await frame();
    }
    out.steps.push({ opened: id, open: openNow(), clicked: true });
    snap();
  }
  /* A3 — close the section the walk ended on; nothing may spring open in its
     place. It is the LAST-OPENED one rather than "the only open one", because
     with nesting its ancestors are legitimately open beside it — and closing
     an ancestor instead would be a different transition from the one this
     clause is about. */
  out.lastOpened = order[order.length - 1];
  const lastDet = document.getElementById(`sec-${out.lastOpened}`);
  if (lastDet && lastDet.open) {
    document.querySelector(`#sec-${out.lastOpened} > summary`).click();
    await frame();
  }
  out.afterClosingLast = openNow();
  snap();
  return out;
}, { ids: SECTIONS.map((x) => x.id), declared: SECTIONS.filter((x) => x.open).map((x) => x.id), breakIt: NEGATIVE_CONTROL });

if (JSON.stringify(accordion.firstLoad) !== JSON.stringify(accordion.declared)) {
  note(`at first load the open sections are [${accordion.firstLoad.join(', ')}], the registry declares [${accordion.declared.join(', ')}]`);
} else {
  ok.push(`accordion A1: at first load exactly the declared section is open [${accordion.declared.join(', ') || 'none'}]`);
}
/* THE RULE IS EXCLUSIVITY AMONG SIBLINGS (Eva, Sep 3), which is the rule this
   panel has always had, stated one level more generally so nesting falls out
   of it. At the top level a section's siblings ARE the other top-level
   sections, so this is the old assertion verbatim there; inside "Petal roles",
   opening Petal 4 must close Petal 2 and must LEAVE THE PARENT OPEN — a child
   whose opening closed its own parent would be a panel that cannot be used.

   THE OLD FORM SAID "exactly one open in the whole panel" and CI failed 11
   rows on it the moment the sections nested. That was the gate's expectation
   going stale against a ruling, for the second time on this branch — the same
   shape as ROLES_COMBOS. What is asserted now is stronger, not looser: every
   sibling group is checked, so a nested set that failed to be exclusive would
   fire here even though the old clause had nothing to say about it. */
const parentOf = new Map(SECTIONS.map((sec) => [sec.id, sec.parent ?? null]));
const ancestorsOf = (id) => { const out = []; let p = parentOf.get(id); while (p) { out.push(p); p = parentOf.get(p); } return out; };
/* EFFECTIVELY OPEN — open, AND every ancestor open too. The distinction is not
   pedantry and the gate found it: closing "Petal roles" does not reset the
   petal drop-down open inside it (that is what `<details>` does, and it is
   what makes the panel remember where you were), so the raw open set can hold
   a section no visitor can see. Asserting over the raw set would demand the
   app forget that state — the assertion writing a behaviour rather than
   checking one. What a visitor experiences is the reachable set, so that is
   what is asserted. */
const effectivelyOpen = (open) => open.filter((id) => ancestorsOf(id).every((a) => open.includes(a)));
let exclusive = true;
for (const st of accordion.steps) {
  /* What should be REACHABLY open after opening `id`: the section itself plus
     every ancestor, and nothing else. */
  const want = new Set([st.opened, ...ancestorsOf(st.opened)]);
  const seen = effectivelyOpen(st.open);
  const extra = seen.filter((id) => !want.has(id));
  const missing = [...want].filter((id) => !seen.includes(id));
  if (extra.length || missing.length) {
    exclusive = false;
    note(`accordion A2: opening "${st.opened}" left [${st.open.join(', ')}] open`
      + (extra.length ? ` — ${extra.join(', ')} should have closed (a drop-down closes its SIBLINGS)` : '')
      + (missing.length ? ` — ${missing.join(', ')} should have stayed open (an open child inside a shut parent is unreachable)` : ''));
  }
}
if (exclusive) ok.push(`accordion A2: opening each of the ${accordion.steps.length} sections by a real summary click left exactly that one plus its ancestors open, every time (walk order ${accordion.order.join(' > ')} — the initially-open section last, so every click is an opening)`);
/* A3 — closing the last-opened section. What may remain is its ANCESTORS: the
   walk ends on a nested section, and closing a child does not close its
   parent. Nothing else may be open, and nothing may spring open. */
{
  const allowed = new Set(ancestorsOf(accordion.lastOpened));
  const sprang = effectivelyOpen(accordion.afterClosingLast).filter((id) => !allowed.has(id));
  if (sprang.length) {
    note(`accordion A3: closing the open section left [${sprang.join(', ')}] open — nothing may spring open by itself`);
  } else {
    ok.push(`accordion A3: closing the open section leaves only its ancestors [${[...allowed].join(', ') || 'none'}] open, and nothing springs open in its place`);
  }
}

const stateSet = new Set(accordion.states);
const geoSet = new Set(accordion.geometry);
if (stateSet.size !== 1) note(`the app's state snapshot CHANGED across the accordion traversal (${stateSet.size} distinct states) — collapse is reaching readUI`);
if (geoSet.size !== 1) note(`the geometry MOVED across the accordion traversal (${geoSet.size} distinct live tris / ring radius) — collapse is reaching the model`);
if (stateSet.size === 1 && geoSet.size === 1) {
  ok.push(`collapse invariant: whole-state snapshot and geometry identical across all ${accordion.states.length} accordion states (${[...geoSet][0].split('/')[0]} tris live, ring ${Number([...geoSet][0].split('/')[1]).toFixed(2)} mm)`);
}

/* ---------------- nothing in the gates depends on a section being open ----

   THE PROPERTY THE WHOLE GROUPING RESTS ON, asserted BEHAVIOURALLY rather
   than by scanning source for `.click(`. applyConfig() sets values through
   `page.evaluate` with real events and never clicks a control, so a shut
   section is invisible to it — but "the harness does not click" is a claim
   about code, and the claim that matters is about behaviour. So: shut EVERY
   section, then drive one control from EVERY section at once through the
   harness's own applyConfig, and require its read-back AND the full-registry
   fullStateDrift to come back clean. If the accordion could ever reach the
   gates, this is the row that goes red, and it uses the gates' own functions
   rather than a copy of them. */
await openBloom(page, port);
await page.evaluate(() => {
  document.querySelectorAll('#panelControls details').forEach((d) => { d.open = false; });
});
await page.waitForTimeout(120);
const acrossSections = SECTIONS.map((sec) => {
  const c = CONTROLS.find((x) => x.section === sec.id && x.kind === 'slider' && !x.visibleWhen.id);
  return c ? { id: c.id, value: String(c.max) } : null;
}).filter(Boolean);
const shutBad = await applyConfig(page, acrossSections);
const shutDrift = await fullStateDrift(page, acrossSections);
const stillShut = await page.evaluate(() => [...document.querySelectorAll('#panelControls details')].filter((d) => d.open).length);
if (shutBad.length) note(`with every section shut, applyConfig failed read-back: ${shutBad.join('; ')}`);
if (shutDrift.length) note(`with every section shut, the state is not DEFAULTS+set: ${shutDrift.join('; ')}`);
if (stillShut !== 0) note(`setting values through the harness OPENED ${stillShut} section(s) — the gates must not depend on, or disturb, the accordion`);
if (!shutBad.length && !shutDrift.length && stillShut === 0) {
  ok.push(`with ALL sections shut, the harness set ${acrossSections.length} controls — one from every section (${acrossSections.map((x) => x.id).join(', ')}) — and both the read-back and the full-registry drift check came back clean, with every section still shut`);
}

/* ---------------- (b) reactivity through a CLOSED section ---------------- */
/* ---------------- (a3) WHICH SECTIONS AND CONTROLS A VISITOR ACTUALLY SEES
     AT FIRST LOAD — asserted in BOTH directions, on the DOM rather than on
     the predicates (session B, Sep 2).

     WHY IT EXISTS AS ITS OWN ASSERTION. The declaration route already checks
     every wrapper's `hidden` against its own predicate, which is the general
     property. This is the SPECIFIC claim the session's panel story rests on,
     and a session B design report managed to state it BOTH WAYS in one
     document — the Petal roles section visible at first load in one paragraph
     and hidden in another. That was settled by evaluating the predicate, and
     a claim settled by evaluation should be settled by the gate from then on,
     or the next reader is back to reading two paragraphs. Shown AND hidden are
     different assertions (the flower's doesn't-leak-in / does-show-all rule),
     so both are listed and both are checked. */
{
  await openBloom(page, port);
  const seen = await page.evaluate(() => ({
    sections: [...document.querySelectorAll('#panelControls details')].map((d) => ({ id: d.id.replace(/^sec-/, ''), hidden: d.hidden, open: d.open })),
    shown: [...document.querySelectorAll('.bl-ctrl')].filter((w) => !w.hidden).map((w) => w.querySelector('input, select').id),
  }));
  const wantShown = CONTROLS.filter((c) => evalPredicate(c.visibleWhen, DEFAULTS)).map((c) => c.id);
  const wantHidden = CONTROLS.filter((c) => !evalPredicate(c.visibleWhen, DEFAULTS)).map((c) => c.id);
  const missing = wantShown.filter((id) => !seen.shown.includes(id));
  const leaked = wantHidden.filter((id) => seen.shown.includes(id));
  if (missing.length) note(`at first load these controls should be visible and are not: ${missing.join(', ')}`);
  if (leaked.length) note(`at first load these controls should be hidden and are visible: ${leaked.join(', ')}`);
  /* Predicted from the PREDICATES (not from the DOM's own answers), children
     first so a parent's prediction reads its children's predictions. */
  const predHidden = {};
  for (let i = SECTIONS.length - 1; i >= 0; i--) {
    const sec = SECTIONS[i];
    predHidden[sec.id] = wantSectionHidden(sec.id, (id) => !evalPredicate(CONTROLS.find((c) => c.id === id).visibleWhen, DEFAULTS), (id) => predHidden[id],
      (cap) => captionWantHidden(cap, DEFAULTS, (id) => predHidden[id]));
  }
  for (const sec of seen.sections) {
    if (sec.hidden !== predHidden[sec.id]) {
      note(`at first load section "${sec.id}" is ${sec.hidden ? 'hidden' : 'shown'}, but ${predHidden[sec.id] ? 'every one of its controls and child sections is hidden' : 'it has at least one visible control or child section'} — a section is hidden iff every control and child in it is`);
    }
  }
  if (!missing.length && !leaked.length) {
    const roles = seen.sections.find((x) => x.id === 'roles');
    const rolesShown = CONTROLS.filter((c) => c.section === 'roles' && seen.shown.includes(c.id)).map((c) => c.id);
    const rolesHidden = CONTROLS.filter((c) => c.section === 'roles' && !seen.shown.includes(c.id)).map((c) => c.id);
    const kidsShown = seen.sections.filter((x) => SECTIONS.find((k) => k.id === x.id)?.parent === 'roles' && !x.hidden).map((x) => x.id);
    ok.push(`first load: ${seen.shown.length} of ${CONTROLS.length} controls visible, ${wantHidden.length} hidden, every section hidden iff empty of visible controls and child sections`);
    ok.push(`first load: section "roles" is ${roles.hidden ? 'HIDDEN' : 'SHOWN'} and ${roles.open ? 'open' : 'collapsed'} — own controls visible: [${rolesShown.join(', ') || 'none'}]; hidden: [${rolesHidden.join(', ')}]; child drop-downs visible: [${kidsShown.join(', ') || 'none'}]`);
  }
}

const closed = SECTIONS.filter((s) => !s.open);
if (!closed.length) note('no section ships collapsed, so the path route has nothing to drive — the reactivity assertion would be vacuous');
for (const s of closed) {
  const w = WITNESS[s.id];
  if (!w) { note(`section "${s.id}" ships collapsed but names no geometry witness in WITNESS — the reactivity assertion for it would be vacuous`); continue; }
  const c = CONTROLS.find((x) => x.id === w.id);
  /* The witness table is checked against the registry rather than trusted:
     an id that moved section, or a value a later range change put out of
     bounds, would otherwise make this assertion quietly measure nothing. */
  if (!c) { note(`WITNESS for "${s.id}" names control "${w.id}", which is not in the registry`); continue; }
  if (c.section !== s.id) { note(`WITNESS for "${s.id}" names "${w.id}", which now declares section "${c.section}"`); continue; }
  if (c.kind === 'slider' && (Number(w.value) < c.min || Number(w.value) > c.max)) {
    note(`WITNESS for "${s.id}" drives ${w.id} to ${w.value}, outside its range ${c.min}..${c.max}`); continue;
  }
  if (c.kind === 'choice' && !c.options.some((o) => o.value === w.value)) {
    note(`WITNESS for "${s.id}" drives ${w.id} to "${w.value}", which is not one of its options`); continue;
  }

  /* Fresh page per section, so each assertion starts from the real first-load
     state — collapsed exactly as a visitor finds it. */
  await openBloom(page, port);
  const res = await page.evaluate(async ({ id, value, section, breakIt, pre }) => {
    const det = document.getElementById(`sec-${section}`);
    const el = document.getElementById(id);
    const span = el.closest('.bl-ctrl').querySelector('.bl-val');
    /* THE PRECONDITION, through real events — never by clicking, which is how
       every gate and the harness set a control. Applied BEFORE the `before`
       metrics are read, so the witness delta belongs to the witness. */
    const preState = [];
    for (const q of (pre || [])) {
      const pel = document.getElementById(q.id);
      if (!pel) { preState.push(`${q.id}: not in the DOM`); continue; }
      pel.value = q.value;
      pel.dispatchEvent(new Event('input', { bubbles: true }));
      pel.dispatchEvent(new Event('change', { bubbles: true }));
      if (String(pel.value) !== String(q.value)) preState.push(`${q.id}: set "${q.value}", reads back "${pel.value}"`);
    }
    if (pre && pre.length) await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    if (breakIt) {
      /* NEGATIVE CONTROL, route (b): the declarations stay perfect and the app
         stops reacting. cloneNode copies the element, its id and its value and
         drops every listener — which is the flower's `predicateDrivers`
         imported-and-never-called defect, reproduced exactly. */
      el.replaceWith(el.cloneNode(true));
    }
    const target = document.getElementById(id);
    const openBefore = det.open;
    /* THE PRECONDITION HAS TO HAVE WORKED, and this is where that is checked
       rather than hoped: a witness whose control is still HIDDEN would move
       nothing and report a pass, which is exactly the vacuity `pre` exists to
       avoid. Reported out and asserted below. */
    const witnessHidden = target.closest('.bl-ctrl').hidden;
    const sectionHidden = det.hidden;
    const labelBefore = span.textContent;
    const stateBefore = window.__bloomUIState()[id];
    const witnessBefore = window.__bloomMetrics();
    target.value = value;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return {
      preState, witnessHidden, sectionHidden,
      openBefore, openAfter: det.open,
      readback: target.value,
      labelBefore, labelAfter: span.textContent,
      stateBefore, stateAfter: window.__bloomUIState()[id],
      metricsBefore: witnessBefore, metricsAfter: window.__bloomMetrics(),
      readout: document.getElementById('readout').textContent,
    };
  }, { id: w.id, value: w.value, section: s.id, breakIt: NEGATIVE_CONTROL, pre: w.pre || null });

  const tag = `[${s.id}] ${w.id} -> ${w.value} while collapsed`;
  if (res.preState.length) note(`${tag}: the precondition did not take: ${res.preState.join('; ')}`);
  /* THE ANTI-VACUITY CLAUSE. A section reachable only behind a precondition is
     exactly where a witness can quietly measure nothing (session A's warning),
     so the gate refuses to accept one whose control is still hidden after the
     precondition ran. */
  if (res.witnessHidden) note(`${tag}: after the precondition the witness control is still HIDDEN — it would move nothing and this assertion would pass vacuously, which is precisely what a precondition mechanism must not be allowed to become`);
  if (res.sectionHidden) note(`${tag}: after the precondition the section is still HIDDEN`);
  if (res.openBefore !== false) note(`${tag}: the section was not collapsed at first load (open=${res.openBefore})`);
  if (res.openAfter !== false) note(`${tag}: driving the control OPENED the section — collapse state must belong to the visitor`);
  if (String(res.readback) !== String(w.value)) note(`${tag}: set "${w.value}", the element reads back "${res.readback}"`);
  if (String(res.stateAfter) !== String(w.value)) note(`${tag}: the app's state snapshot says "${res.stateAfter}" — readUI cannot see a control in a collapsed section`);
  if (res.labelAfter === res.labelBefore) note(`${tag}: the control's read-out span did not change ("${res.labelBefore}") — refreshLabels runs only from regenerate(), so the app did not rebuild`);
  const before = w.read(res.metricsBefore), after = w.read(res.metricsAfter);
  if (String(before) === String(after)) note(`${tag}: geometry witness ${w.what} did not move (${before}) — the value took but the model did not`);
  else ok.push(`${tag}: state "${res.stateBefore}"->"${res.stateAfter}", read-out "${res.labelBefore}"->"${res.labelAfter}", ${w.what} ${before}->${after}, section still closed`);
}

/* ---------------- (d) the VISIBILITY-TRANSITION route ---------------- */
/* THE GAP THIS CLOSES, and it predates the layer work. Route (a) evaluates
   every predicate at DEFAULTS and asserts each wrapper's `hidden` agrees. That
   is ONE DIRECTION. A control gated on `layerCount >= 2` is hidden at DEFAULTS
   and would pass route (a) even if it NEVER APPEARED — and so would
   centerRise, which has been gated on `centerStyle: DOME` since the centre rig
   shipped and has never had its appearance asserted by this gate. Doesn't-show
   -when-off and does-show-when-on are two properties, and the flower project
   paid for checking only one of them (Advanced silently stopped showing 25
   controls while every gate passed).

   This drives each gated control's DRIVER through the real UI and re-checks
   EVERY control's `hidden` against its own predicate at the new state — so it
   asserts appearance and disappearance in the same pass, and it does it for
   controls this session did not add. The driver set is derived from the
   registry's predicates, never listed: a new gated control is covered the day
   it lands, or this loop has nothing to say about it and says so. */
const gated = CONTROLS.filter((c) => predicateDrivers(c.visibleWhen).size > 0);
const drivers = new Map();
for (const c of gated) for (const d of predicateDrivers(c.visibleWhen)) {
  if (!drivers.has(d)) drivers.set(d, []);
  drivers.get(d).push(c.id);
}
if (!gated.length) note('no control declares a predicate with a driver, so the visibility-transition route has nothing to drive — it would be vacuous');
for (const [driverId, dependents] of drivers) {
  const dc = CONTROLS.find((c) => c.id === driverId);
  /* Drive the driver to every value that changes the dependent set, so both
     directions are exercised rather than one arbitrary end. For a slider that
     is its two ends; for a choice, every option. */
  const values = dc.kind === 'choice' ? dc.options.map((o) => o.value) : [String(dc.min), String(dc.max)];
  for (const value of values) {
    await openBloom(page, port);
    const res = await page.evaluate(async ({ id, value, breakIt }) => {
      const el = document.getElementById(id);
      if (breakIt) {
        /* NEGATIVE CONTROL, route (d): declarations stay perfect and
           applyVisibility stops running. Freezing every wrapper's `hidden`
           reproduces "the panel does not re-evaluate", which is the failure
           this route exists for and which route (a) cannot see. */
        for (const w of document.querySelectorAll('.bl-ctrl')) {
          Object.defineProperty(w, 'hidden', { get: () => false, set: () => {}, configurable: true });
        }
      }
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const seen = {};
      for (const w of document.querySelectorAll('.bl-ctrl')) {
        const input = w.querySelector('input,select');
        if (input) seen[input.id] = w.hidden;
      }
      /* The summaries a visitor can currently SEE — a section hidden by its
         own derivation, or inside a hidden parent, is not on screen. */
      const visibleLabels = [...document.querySelectorAll('#panelControls details')]
        .filter((d) => !d.hidden && !d.parentElement.closest('details')?.hidden)
        .map((d) => ({ id: d.dataset.section, label: d.querySelector(':scope > summary').textContent }));
      return { state: window.__bloomUIState(), seen, visibleLabels };
    }, { id: driverId, value, breakIt: NEGATIVE_CONTROL });


    const tag = `[visibility] ${driverId} -> ${value}`;
    /* NO TWO SECTIONS ON SCREEN AT ONCE MAY SHARE A NAME (Eva's ruling A, Sep
       3). The fan's `petal1` and the rosette's `labellumGroup` are BOTH called
       "Petal 1", and the rosette's hood group is "Petal N" for an N a fan
       group may also carry — by design, since the number is the orbit's and
       the two placements never share a screen. That last clause is the claim,
       and this is where it is measured rather than trusted: every state this
       route drives (placement to each of its four values among them) reads
       the visible summaries back and refuses a duplicate. */
    {
      const byLabel = new Map();
      for (const { id, label } of res.visibleLabels) {
        if (!byLabel.has(label)) byLabel.set(label, []);
        byLabel.get(label).push(id);
      }
      const dup = [...byLabel].filter(([, ids]) => ids.length > 1);
      if (dup.length) note(`${tag}: two visible sections share a name — ${dup.map(([l, ids]) => `"${l}" on ${ids.join(' and ')}`).join('; ')}`);
      else ok.push(`${tag}: ${res.visibleLabels.length} sections on screen, no two sharing a name`);
    }
    let wrong = 0;
    for (const c of CONTROLS) {
      const want = !evalPredicate(c.visibleWhen, res.state);
      if (res.seen[c.id] !== want) {
        note(`${tag}: control "${c.id}" wrapper hidden=${res.seen[c.id]}, its predicate at that state says hidden=${want} — the panel did not re-evaluate visibility`);
        wrong++;
      }
    }
    if (!wrong) {
      const shown = dependents.filter((id) => res.seen[id] === false);
      ok.push(`${tag}: all ${CONTROLS.length} wrappers agree with their predicates; dependents shown: ${shown.length ? shown.join(', ') : 'none'}`);
    }
  }
}

/* ---------------- (g) THE DERIVED SECTION LABEL — the rosette's hood group ----------------

   THE FIRST SECTION WHOSE NAME MOVES (Eva's ruling A, Sep 3): the labellum is
   "Petal 1" at every count, and the hood is "Petal N" where N is the LAST
   orbit's number — 2 at three petals, 5 at eight, 21 at forty. The registry
   derives that through `labelFrom(ui)`; the app rewrites the summary on every
   rebuild. Two things are asserted, and the second is the one that matters:

     1. THE DOM SAYS WHAT THE OWNER SAYS — the summary text equals
        sectionLabel(section, state) at the state the row drove. This is the
        reactivity half: a generator that wrote the label once and never
        refreshed it passes at the default and fails here.
     2. THE NUMBER IS THE ONE THE BUILDER USED — read from the EMITTED hood
        descriptor's slot indices, never from the same function that wrote
        the label. With `hoodSize` off identity the whorl splits and every
        petal the builder built for the hood carries its slot index; its
        orbit is `min(i, partner(i))`, its petal number is that plus one, and
        all hood slots must agree on it. sectionLabel() and this check share
        NOTHING but the state, so a label that hard-codes the wrong plane, or
        a count that is not the count the geometry built, is a red row rather
        than a matching pair of wrong answers. (The Z8 doctrine one level up:
        numbering is read from what was emitted.)

   THE ROWS are the control's minimum, the shipping default, an odd count
   (whose hood is a PAIR — the read-out says so, and both slots must still
   agree on one number) and the maximum. The default-count row reads the same
   label before and after by construction, so it cannot see a frozen summary
   and is there for statement 2 alone; the other three carry statement 1, and
   the negative control is seen to fire on exactly those three. */
{
  const hoodSec = SECTIONS.find((x) => x.id === 'hoodGroup');
  const pc = CONTROLS.find((c) => c.id === 'petalCount');
  if (!hoodSec || typeof hoodSec.labelFrom !== 'function') note('[label] section "hoodGroup" no longer declares a derived labelFrom — the derived-label route has nothing to measure');
  else for (const n of [pc.min, DEFAULTS.petalCount, 13, pc.max]) {
    await openBloom(page, port);
    const tag = `[label] hoodGroup at ${n} petals`;
    const res = await page.evaluate(async ({ n, breakIt }) => {
      const sum = document.querySelector('#sec-hoodGroup > summary');
      const before = sum.textContent;
      if (breakIt) {
        /* NEGATIVE CONTROL, route (g): the label is written once at build and
           never refreshed — which is exactly what a static-label generator
           does, and what this route exists to see. */
        Object.defineProperty(sum, 'textContent', { get: () => before, set: () => {}, configurable: true });
      }
      /* TWO WHORLS IN STEP FIRST (Eva, Sep 3) — the group is hidden at one
         whorl, and a label nobody can see is not the label under test. */
      for (const [id, value] of [['layerCount', '2'], ['layerPhase', '0'], ['petalCount', String(n)], ['hoodSize', '1.6']]) {
        const el = document.getElementById(id);
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const m = window.__bloomMetrics();
      return {
        before, after: sum.textContent, state: window.__bloomUIState(),
        hidden: document.getElementById('sec-hoodGroup').hidden,
        slotCount: m.slotCount, mirror: m.mirror,
        hoodSlots: (m.petalRingApplied || []).filter((p) => p && p.slotRole === 'HOOD').map((p) => p.slotIndex),
      };
    }, { n, breakIt: NEGATIVE_CONTROL });
    if (Number(res.state.petalCount) !== n) { note(`${tag}: petalCount reads ${res.state.petalCount} after being driven`); continue; }
    if (res.hidden) { note(`${tag}: the hood group is hidden at a rosette of ${n} — the row would be asserting the name of a section nobody can see`); continue; }
    if (!res.hoodSlots.length) { note(`${tag}: no HOOD petal in the builder's record with hoodSize at 1.6 — the whorl did not split, so there is no emitted numbering to read`); continue; }
    const want = sectionLabel(hoodSec, res.state);
    const numbers = [...new Set(res.hoodSlots.map((i) => Math.min(i, mirrorPartner(i, res.slotCount, res.mirror)) + 1))];
    const said = Number((/Petal (\d+)/.exec(res.after) || [])[1]);
    const bad = [];
    if (res.after !== want) bad.push(`summary reads "${res.after}", sectionLabel() says "${want}" (it read "${res.before}" before the count moved)`);
    if (numbers.length !== 1) bad.push(`the builder's hood slots [${res.hoodSlots.join(', ')}] fall in ${numbers.length} orbits (${numbers.join(', ')}) — a group must be one orbit`);
    else if (said !== numbers[0]) bad.push(`the label says petal ${said}, but the builder's hood slots [${res.hoodSlots.join(', ')}] of ${res.slotCount} (plane ${res.mirror}) are orbit ${numbers[0]}`);
    if (bad.length) note(`${tag}: ${bad.join('; ')}`);
    else ok.push(`${tag}: summary "${res.before}" -> "${res.after}", and the builder's hood slots [${res.hoodSlots.join(', ')}] of ${res.slotCount} are orbit ${numbers[0]} — the label's number is the emitted one`);
  }
}

/* ---------------- (h) THE DEPTH TRANSITIONS, BOTH DIRECTIONS, AND THE CAPTION ----------------

   EVA'S RULING OF SEP 3, PHOTOGRAPHED BY A GATE: "Petal roles" is the
   adjust-petals-as-a-group section at every depth — the ALL-PETALS trio at
   one whorl, the INNER trio above it — and Petal 1 / Petal N are hidden at
   one whorl, reachable at two or more whorls with Layer offset 0, and in
   between (two or more whorls, offset away from 0) the panel SAYS WHY THEY
   ARE MISSING through the registry's hiddenReason caption.

   ONE PAGE, REAL EVENTS, BOTH DIRECTIONS: one whorl -> two whorls (offset at
   its default, away from 0) -> offset 0 -> back to one whorl. At every step
   every wrapper is checked against its own predicate (the general property),
   AND the ruling's own statements are asserted by name (the specific one) —
   a route that only checked predicates would pass a registry that quietly
   moved the trio to the wrong depth, because the DOM would agree with it.
   The caption is asserted in both directions too: shown exactly at the
   "behind the offset" step, its text the registry's own text(ui), and absent
   at every other step — a caption stuck on is a lie in the panel. */
{
  const steps = [
    { name: 'one whorl (the shipping default)', set: [],
      want: { all: true, inner: false, slot: false, caption: false } },
    { name: 'two whorls, Layer offset at its default (away from 0)', set: [['layerCount', '2']],
      want: { all: false, inner: true, slot: false, caption: true } },
    { name: 'two whorls in step (Layer offset 0)', set: [['layerPhase', '0']],
      want: { all: false, inner: true, slot: true, caption: false } },
    { name: 'three whorls, still in step', set: [['layerCount', '3']],
      want: { all: false, inner: true, slot: true, caption: false } },
    { name: 'offset away from 0 again at three whorls', set: [['layerPhase', '0.25']],
      want: { all: false, inner: true, slot: false, caption: true } },
    { name: 'back to one whorl (offset still 0.25 — must not matter)', set: [['layerCount', '1']],
      want: { all: true, inner: false, slot: false, caption: false } },
  ];
  const groups = {
    all: ['allCurl', 'allCup', 'allTipBreadth'],
    inner: ['innerCurl', 'innerCup', 'innerTipBreadth'],
    slot: ['labellumSize', 'labellumTipBreadth', 'labellumTilt', 'labellumCup', 'labellumCurl', 'hoodSize', 'hoodTilt', 'hoodCup'],
  };
  const captions = captionsOf('roles');
  if (captions.length !== 1) note(`[depth] expected exactly one hiddenReason caption under "roles", the registry declares ${captions.length}`);
  await openBloom(page, port);
  const frozen = await page.evaluate((breakIt) => {
    const el = document.querySelector('#sec-roles > .bl-why');
    if (!el) return 'no caption element';
    if (breakIt) {
      /* NEGATIVE CONTROL, route (h): the caption's `hidden` stops moving —
         the panel keeps or loses its explanation regardless of state. */
      const v = el.hidden;
      Object.defineProperty(el, 'hidden', { get: () => v, set: () => {}, configurable: true });
    }
    return null;
  }, NEGATIVE_CONTROL);
  if (frozen) note(`[depth] ${frozen} — the hiddenReason caption is not rendered inside "Petal roles"`);
  for (const step of steps) {
    const res = await page.evaluate(async ({ set }) => {
      for (const [id, value] of set) {
        const el = document.getElementById(id);
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const seen = {};
      for (const w of document.querySelectorAll('.bl-ctrl')) {
        const input = w.querySelector('input,select');
        if (input) seen[input.id] = w.hidden;
      }
      const cap = document.querySelector('#sec-roles > .bl-why');
      const secs = {};
      for (const d of document.querySelectorAll('#panelControls details')) secs[d.dataset.section] = d.hidden;
      return { state: window.__bloomUIState(), seen, secs, caption: cap ? { hidden: cap.hidden, text: cap.textContent, why: cap.dataset.why } : null, m: (() => { const x = window.__bloomMetrics(); return { slot: x.slotRolesEligible, all: x.allPetalsEligible, layers: x.layerCount }; })() };
    }, { set: step.set });
    const tag = `[depth] ${step.name}`;
    const bad = [];
    for (const c of CONTROLS) {
      const want = !evalPredicate(c.visibleWhen, res.state);
      if (res.seen[c.id] !== want) bad.push(`"${c.id}" hidden=${res.seen[c.id]}, its predicate says ${want}`);
    }
    for (const [axis, ids] of Object.entries(groups)) {
      const shown = ids.filter((id) => res.seen[id] === false);
      const wantShown = step.want[axis];
      if (wantShown && shown.length !== ids.length) bad.push(`${axis} trio: ${shown.length} of ${ids.length} visible, the ruling says all`);
      if (!wantShown && shown.length) bad.push(`${axis}: ${shown.join(', ')} visible, the ruling says none`);
    }
    if (res.secs.labellumGroup !== !step.want.slot || res.secs.hoodGroup !== !step.want.slot) bad.push(`Petal 1 / Petal N drop-downs hidden=${res.secs.labellumGroup}/${res.secs.hoodGroup}, the ruling says ${step.want.slot ? 'shown' : 'hidden'}`);
    if (Boolean(res.m.slot) !== step.want.slot) bad.push(`the geometry says slot roles ${res.m.slot ? '' : 'not '}eligible, the ruling says ${step.want.slot}`);
    if (Boolean(res.m.all) !== step.want.all) bad.push(`the geometry says the all-petals group ${res.m.all ? '' : 'not '}eligible, the ruling says ${step.want.all}`);
    if (!res.caption) bad.push('no caption element under "Petal roles"');
    else {
      if (res.caption.hidden !== !step.want.caption) bad.push(`the hiddenReason caption is ${res.caption.hidden ? 'HIDDEN' : 'SHOWN'}, the ruling says ${step.want.caption ? 'shown' : 'hidden'}`);
      if (!res.caption.hidden) {
        const wantText = captions[0] ? captions[0].reason.text(res.state) : '';
        if (res.caption.text !== wantText) bad.push(`caption reads "${res.caption.text}", the registry's text(ui) says "${wantText}"`);
        if (!/Petal 1 and Petal \d+/.test(res.caption.text)) bad.push(`caption "${res.caption.text}" does not name the two drop-downs it stands for`);
      }
      const wantWhy = captions[0] ? captions[0].sections.join(' ') : '';
      if (res.caption.why !== wantWhy) bad.push(`caption stands for [${res.caption.why}], the registry says [${wantWhy}]`);
    }
    if (bad.length) note(`${tag}: ${bad.join('; ')}`);
    else ok.push(`${tag}: all-petals ${step.want.all ? 'shown' : 'hidden'}, Inner ${step.want.inner ? 'shown' : 'hidden'}, Petal 1 / Petal N ${step.want.slot ? 'shown' : 'hidden'}, caption ${step.want.caption ? `SHOWN — "${res.caption.text}"` : 'hidden'}; every wrapper agrees with its predicate`);
  }
}

/* ---------------- (f) ROLES ELIGIBILITY, COMBINED — Eva's Sep 2 amendment ---------------- */
/* THE GAP ROUTE (d) LEAVES, stated so it is not re-discovered as a mystery.
   Route (d) drives ONE driver away from DEFAULTS at a time — `placement` to
   RADIAL/SPIRAL/CONTINUOUS/FAN with `layerCount`/`layerPhase` left at their
   OWN defaults (1 / 0), and `layerCount`/`layerPhase` likewise with
   `placement` left at RADIAL. `slotRolesEligible` reads all three AT ONCE
   (RADIAL needs layerCount 1 OR layerPhase 0; FAN is unconditional; SPIRAL
   and CONTINUOUS are always false), so a state that moves TWO of them off
   DEFAULTS together — SPIRAL with layerCount 3, FAN with layerPhase away
   from 0 — is never reached by route (d) at all. That is exactly the shape
   of gap Eva's amendment asked to close: "verify which placements actually
   show the section today... if it shows where the zygomorphy sessions ruled
   it hidden, that's a defect to report."

   THREE-WAY AGREEMENT, not two. Each row checks the DOM wrapper's `hidden`
   against the REGISTRY predicate (the same thing route (d) checks) AND
   against bloom-geometry.js's OWN `slotRolesEligible(state)` — exposed as
   `__bloomMetrics().slotRolesEligible` — because a control that is VISIBLE
   but whose role the geometry never applies is "hide it exactly where it
   drives nothing" (Eva's words) even if the registry predicate and the DOM
   happen to agree with EACH OTHER. Both files keep their own copy of this
   condition (bloom-geometry.js imports nothing, so it cannot import the
   registry's), and the existing Z5 assertion already checks the two agree
   on every buildMatrix() row — this route checks it on COMBINED states that
   row set does not happen to cover. */
/* EACH COMBO NOW DECLARES BOTH POSITION AXES (session 11), because the thing
   that has to hold is a statement about the PAIR: per-petal SUPERSEDES slot
   roles on the fan (Eva's ruling 4, Sep 3), so exactly one axis is eligible at
   any state and neither is eligible where the placement has no plane. Checking
   only `slotRolesEligible` — which is what this route did — would have gone on
   asserting one half of a relation whose other half is the whole ruling.

   THE FAN ROWS FLIPPED, AND THAT IS THE RULING RATHER THAN A REGRESSION. They
   said `slot: true` because session 10 composed the labellum onto the fan;
   CI failed them on the first run of this branch with DOM, registry AND
   GEOMETRY all agreeing on `false` and only this table disagreeing — a stale
   expectation, which is the same shape as the nine matrix rows whose claim
   this ruling inverted. */
const ROLES_COMBOS = [
  // RADIAL: layerCount 1 shows regardless of layerPhase (the "nothing above
  // the outermost whorl to fall out of step" arm) — a stale/non-zero
  // layerPhase must not leak through. Per-petal is never eligible here.
  // RADIAL at ONE WHORL: the one-whorl orchid is retired (Eva, Sep 3) — slot
  // roles NOWHERE at depth 1, phase 0 included, and the ALL-PETALS group is
  // the group there.
  ['RADIAL', 1, 0, { slot: false, perPetal: false, all: true }], ['RADIAL', 1, 1, { slot: false, perPetal: false, all: true }],
  // RADIAL: layerCount >= 2 needs layerPhase exactly 0; the all-petals group
  // is never eligible above one whorl.
  ['RADIAL', 2, 0, { slot: true, perPetal: false, all: false }],
  ['RADIAL', 3, 0, { slot: true, perPetal: false, all: false }],
  ['RADIAL', 3, 0.5, { slot: false, perPetal: false, all: false }],
  ['RADIAL', 2, 1, { slot: false, perPetal: false, all: false }],
  // SPIRAL: NEITHER position axis, INCLUDING away from the layerCount/layerPhase
  // defaults — route (d) only ever tried SPIRAL at layerCount 1, layerPhase 0.
  ['SPIRAL', 1, 0, { slot: false, perPetal: false, all: true }], ['SPIRAL', 3, 0, { slot: false, perPetal: false, all: false }],
  // CONTINUOUS: same claim, same reason; one turn is one whorl.
  ['CONTINUOUS', 1, 1, { slot: false, perPetal: false, all: true }], ['CONTINUOUS', 3, 0, { slot: false, perPetal: false, all: false }],
  // FAN: PER-PETAL at every depth, unconditionally, and slot roles NOWHERE.
  // At one whorl the all-petals group COMPOSES with per-petal ("the group,
  // then the petal") — the one state where two axes are both eligible, by
  // design. `layerPhase` is hidden and irrelevant under FAN, but its stale
  // DOM value must not leak into any answer — which is why these rows carry
  // awkward depths and phases rather than the defaults.
  ['FAN', 1, 1, { slot: false, perPetal: true, all: true }], ['FAN', 3, 0.5, { slot: false, perPetal: true, all: false }],
  ['FAN', 1, 0, { slot: false, perPetal: true, all: true }],
];
for (const [placement, layerCount, layerPhase, want] of ROLES_COMBOS) {
  await openBloom(page, port);
  const set = [{ id: 'placement', value: placement }, { id: 'layerCount', value: String(layerCount) }, { id: 'layerPhase', value: String(layerPhase) }];
  const bad = await applyConfig(page, set);
  const tag = `[roles combined] ${placement} layerCount=${layerCount} layerPhase=${layerPhase}`;
  if (bad.length) { note(`${tag}: read-back failed: ${bad.join('; ')}`); continue; }
  const res = await page.evaluate(() => {
    const wrapOf = (id) => { const el = document.getElementById(id); return el ? el.closest('.bl-ctrl').hidden : null; };
    const m = window.__bloomMetrics();
    return {
      slotHidden: wrapOf('labellumSize'), perPetalHidden: wrapOf('petal1Size'), allHidden: wrapOf('allCurl'),
      geomSlot: m.slotRolesEligible, geomPerPetal: m.perPetalEligible, geomAll: m.allPetalsEligible,
      state: window.__bloomUIState(),
    };
  });
  if (res.slotHidden === null) { note(`${tag}: #labellumSize wrapper missing from the DOM`); continue; }
  if (res.perPetalHidden === null) { note(`${tag}: #petal1Size wrapper missing from the DOM`); continue; }
  if (res.allHidden === null) { note(`${tag}: #allCurl wrapper missing from the DOM`); continue; }
  const bad2 = [];
  /* THE THREE STATEMENTS OF ONE BOUNDARY, per axis: the DOM (what a visitor
     can reach), the registry predicate (what is declared), and the geometry's
     own eligibility (what can move a vertex). Three, because two agreeing
     tells you nothing about which is right. */
  for (const [axis, ref, domHidden, geom, expect] of [
    ['slot roles', 'slotRolesEligible', res.slotHidden, res.geomSlot, want.slot],
    ['per-petal', 'perPetalEligible', res.perPetalHidden, res.geomPerPetal, want.perPetal],
    ['all-petals', 'allPetalsEligible', res.allHidden, res.geomAll, want.all],
  ]) {
    const reg = evalPredicate({ ref }, res.state);
    if (domHidden !== !expect) bad2.push(`${axis}: DOM hidden=${domHidden}, expected ${!expect}`);
    if (reg !== expect) bad2.push(`${axis}: registry predicate says eligible=${reg}, expected ${expect}`);
    if (Boolean(geom) !== expect) bad2.push(`${axis}: the geometry's own eligibility says ${Boolean(geom)}, expected ${expect}`);
  }
  /* AND THE SUPERSESSION ITSELF, as a property of the pair rather than of
     either row: never both, which is what makes "one per-position axis" a
     measurement instead of a sentence in a charter. */
  if (res.geomSlot && res.geomPerPetal) {
    bad2.push('BOTH position axes report eligible — per-petal supersedes slot roles on the fan, so a bloom has at most one');
  }
  /* AND THE DEPTH RULE (Eva, Sep 3): slot roles need two or more whorls in
     step, the all-petals group is the one-whorl group — never both. */
  if (res.geomSlot && res.geomAll) {
    bad2.push('slot roles AND the all-petals group report eligible — slot roles need two or more whorls and the all-petals group is the one-whorl group');
  }
  if (Boolean(res.geomAll) !== (layerCount === 1)) {
    bad2.push(`the all-petals group reports ${res.geomAll ? '' : 'not '}eligible at ${layerCount} whorl(s) — it is the one-whorl group and no other depth's`);
  }
  if (bad2.length) note(`${tag}: ${bad2.join('; ')}`);
  else ok.push(`${tag}: DOM/registry/geometry agree on all three axes — slot=${want.slot}, per-petal=${want.perPetal}, all-petals=${want.all}`);
}

/* ---------------- (e) the LOW-COUNT SPIRAL FLAG, both directions ---------- */
/* The flag is the ENTIRE handling of golden-angle placement below eight
   petals — the charter's "gate or flag" was measured and there is no
   threshold to gate on, so a label is the whole mechanism and it has to be
   worth something. A flag asserted only when it should appear is a flag that
   can be stuck on, so both directions are checked, and the threshold comes
   from SPIRAL_LEGIBLE_COUNT rather than from a number retyped here.

   WHAT IT COUNTS MOVED WITH THE CONTINUOUS ARM, and the rows below are what
   says so. The flag is about how many elements the golden angle has to work
   with: under SPIRAL each whorl runs its own sequence, so that is petalCount
   and NOTHING about those rows changes; under CONTINUOUS there is one
   sequence of petalCount x layerCount, so the SAME three petals that trip the
   flag at one turn must NOT trip it at three (9 elements), and a two-petal
   sequence has no reachable state at all since petalCount starts at 3. The
   CONTINUOUS x 3 x 1 turn / CONTINUOUS x 3 x 3 turns pair is therefore the
   two-directional assertion for the new mode specifically: same slider, same
   threshold, opposite verdicts, decided by the geometry rather than by the
   control. RADIAL rows stay in as the never-flagged control. */
for (const [placement, count, depth] of [
  ['SPIRAL', SPIRAL_LEGIBLE_COUNT - 1, 1], ['SPIRAL', SPIRAL_LEGIBLE_COUNT, 1],
  ['RADIAL', SPIRAL_LEGIBLE_COUNT - 1, 1], ['SPIRAL', 3, 1],
  ['SPIRAL', 3, 3],
  ['CONTINUOUS', 3, 1], ['CONTINUOUS', 3, 3],
  ['CONTINUOUS', SPIRAL_LEGIBLE_COUNT, 1], ['RADIAL', 3, 3],
]) {
  await openBloom(page, port);
  const set = [{ id: 'placement', value: placement }, { id: 'petalCount', value: String(count) }, { id: 'layerCount', value: String(depth) }];
  const bad = await applyConfig(page, set);
  if (bad.length) { note(`[spiral flag] ${placement} x ${count} x ${depth}: read-back failed: ${bad.join('; ')}`); continue; }
  const txt = await page.evaluate(() => document.getElementById('readout').textContent);
  const shown = /SPIRAL BELOW \d+ IN THE SEQUENCE/.test(txt);
  /* THE EXPECTATION IS DERIVED FROM THE SAME RULE THE APP STATES, not from a
     second copy of it: the sequence is petalCount under SPIRAL (each whorl
     its own) and petalCount x layerCount under CONTINUOUS. The app reads
     footRing()'s `sequenceLength`; this reads the two controls the row set,
     so the two agreeing is a real check rather than a tautology. */
  const seq = placement === 'CONTINUOUS' ? count * depth : count;
  const want = (placement === 'SPIRAL' || placement === 'CONTINUOUS') && seq < SPIRAL_LEGIBLE_COUNT;
  if (shown !== want) {
    note(`[spiral flag] ${placement} x ${count} petals x ${depth}: flag ${shown ? 'SHOWN' : 'ABSENT'}, expected ${want ? 'SHOWN' : 'ABSENT'} (sequence ${seq}, threshold SPIRAL_LEGIBLE_COUNT = ${SPIRAL_LEGIBLE_COUNT})`);
  } else {
    ok.push(`[spiral flag] ${placement} x ${count} petals x ${depth} (sequence ${seq}): ${shown ? 'shown' : 'absent'}, as the threshold requires`);
  }
}

/* ---------------- (i) THE PRINT-PREVIEW TOGGLE ---------------- */
{
  const tag = '[preview]';
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-panel-preview-'));
  const THIN = [{ id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '0.25' }];
  await openBloom(page, port);
  const where = await page.evaluate(() => {
    const el = document.getElementById('printPreview');
    return { present: !!el, inPanel: !!(el && el.closest('#panelControls')), inView: !!(el && el.closest('.bl-viewpanel')), checked: el ? el.checked : null };
  });
  if (!where.present) note(`${tag}: no #printPreview box in the page`);
  else {
    if (where.inPanel || !where.inView) note(`${tag}: the box is ${where.inPanel ? 'inside #panelControls' : 'outside the VIEW box'} — it is view chrome and belongs beside Auto-rotate, not among the registry's controls`);
    if (where.checked !== false) note(`${tag}: the box is checked at first load — the page must open on LIVE geometry`);
    const bad = await applyConfig(page, THIN);
    if (bad.length) note(`${tag}: ALL THIN did not take: ${bad.join('; ')}`);
    const before = await page.evaluate(() => { const m = window.__bloomMetrics(); return { shownMode: m.shownMode, liveTris: m.liveTris, shownTris: m.shownTris, hub: m.hubRadius, builds: window.__bloomBuildState().count, first: document.getElementById('readout').textContent.split('\n')[0] }; });
    const offBuf = await exportStl(page, tmp);
    const owner = await page.evaluate(async () => {
      const mod = await import('/bloom-geometry.js');
      const ui = window.__bloomUIState();
      return { liveHub: mod.footRing(ui, new mod.MeshBuilder({ exportMode: false })).hub.radius, exportHub: mod.footRing(ui, new mod.MeshBuilder({ exportMode: true })).hub.radius };
    });
    await page.evaluate(({ breakIt }) => {
      let el = document.getElementById('printPreview');
      if (breakIt) {
        /* NEGATIVE CONTROL, route (i): the box is declared, renders, and
           nothing listens — the declarations-right / app-doesn't-react
           defect, pointed at view chrome. */
        const clone = el.cloneNode(true); el.replaceWith(clone); el = clone;
      }
      el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true }));
    }, { breakIt: NEGATIVE_CONTROL });
    await settleBuild(page);
    await page.waitForTimeout(80);
    const on = await page.evaluate(() => { const m = window.__bloomMetrics(); const txt = document.getElementById('readout').textContent; return { shownMode: m.shownMode, liveTris: m.liveTris, shownTris: m.shownTris, hub: m.hubRadius, builds: window.__bloomBuildState().count, first: txt.split('\n')[0], printedMarked: /PRINTED \(export floor [0-9.]+ mm\): .*← on screen/.test(txt), liveMarked: /← live, on screen/.test(txt) }; });
    const onBuf = await exportStl(page, tmp);
    const drift = await fullStateDrift(page, THIN);
    await page.evaluate(() => { const el = document.getElementById('printPreview'); el.checked = false; el.dispatchEvent(new Event('change', { bubbles: true })); });
    await settleBuild(page);
    await page.waitForTimeout(80);
    const off = await page.evaluate(() => { const m = window.__bloomMetrics(); return { shownMode: m.shownMode, liveTris: m.liveTris, hub: m.hubRadius, first: document.getElementById('readout').textContent.split('\n')[0] }; });
    const problems = [];
    if (!(on.builds > before.builds)) problems.push(`flipping the box did not rebuild (build count ${before.builds} -> ${on.builds})`);
    if (on.shownMode !== 'export') problems.push(`shownMode reads "${on.shownMode}" with the box ON, expected "export"`);
    if (on.liveTris !== null) problems.push(`liveTris reads ${on.liveTris} with the preview ON — an export-mode count under a live label; it must be null`);
    if (on.hub !== owner.exportHub) problems.push(`hub radius ${on.hub} with the preview ON is not footRing()'s export answer ${owner.exportHub}`);
    if (owner.exportHub === owner.liveHub) problems.push(`the floor does not bind on this row (live and export hub both ${owner.liveHub}) — the route is measuring nothing`);
    if (!/PRINT PREVIEW/.test(on.first)) problems.push(`the read-out's first line with the box ON reads "${on.first}" and does not name PRINT PREVIEW`);
    if (!on.printedMarked) problems.push('the PRINTED line does not carry the "← on screen" marker with the box ON');
    if (on.liveMarked) problems.push('the live line still says "on screen" with the box ON');
    if (drift.length) problems.push(`registry state moved with the box: ${drift.join('; ')}`);
    if (!offBuf || !onBuf) problems.push('an export did not download');
    else if (!offBuf.equals(onBuf)) problems.push(`the STL exported with the box ON differs from the one with it OFF (${onBuf.length} vs ${offBuf.length} bytes) — the toggle reached the export path`);
    if (off.shownMode !== 'live') problems.push(`shownMode reads "${off.shownMode}" after turning the box OFF, expected "live"`);
    if (off.hub !== owner.liveHub) problems.push(`hub radius ${off.hub} after OFF is not footRing()'s live answer ${owner.liveHub}`);
    if (typeof off.liveTris !== 'number') problems.push(`liveTris reads ${off.liveTris} after OFF`);
    if (!/LIVE/.test(off.first)) problems.push(`the read-out's first line after OFF reads "${off.first}" and does not name LIVE`);
    if (problems.length) note(`${tag}: ${problems.join('; ')}`);
    else ok.push(`${tag}: the box sits in the VIEW box, unchecked at load; ON on ALL THIN rebuilt (${before.builds} -> ${on.builds}), shownMode export, liveTris null, hub ${before.hub.toFixed(3)} -> ${on.hub.toFixed(3)} mm (= footRing's export answer), read-out "${on.first.slice(0, 40)}…", PRINTED line marked, 0 registry controls moved, STL ON == STL OFF byte for byte (${onBuf.length} bytes); OFF restored live (hub ${off.hub.toFixed(3)} mm)`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}

/* ---------------- (j) THE INNER-RING LINE, BOTH DIRECTIONS ---------------- */
for (const [label, sets, want] of [
  ['defaults (no ring under a foot)', [], false],
  ['6 layers x spread min (rings 4–5 under the floor, feet across the axis)', [{ id: 'layerCount', value: '6' }, { id: 'spread', value: '0.6' }], true],
  ['ALL THIN x spread min x 3 layers (a shipped row already under the floor before the raise)', [{ id: 'layerCount', value: '3' }, { id: 'spread', value: '0.6' }, { id: 'sheetThickness', value: '0.6' }, { id: 'tipThinning', value: '0.8' }, { id: 'footDelicacy', value: '0.25' }], true],
  ['6 layers x spread max (deep, and wide enough that no ring is under a foot)', [{ id: 'layerCount', value: '6' }, { id: 'spread', value: '6' }], false],
]) {
  const tag = `[inner rings] ${label}`;
  await openBloom(page, port);
  if (NEGATIVE_CONTROL) {
    /* NEGATIVE CONTROL, route (j): the read-out never changes again — the
       line cannot appear where it must, and where it must not appear the
       row still reads clean, which is why the rows are checked in BOTH
       directions and the control is seen to fire on the present ones. */
    await page.evaluate(() => { const el = document.getElementById('readout'); const t = el.textContent; Object.defineProperty(el, 'textContent', { get: () => t, set: () => {}, configurable: true }); });
  }
  const bad = await applyConfig(page, sets);
  if (bad.length) { note(`${tag}: config did not take: ${bad.join('; ')}`); continue; }
  const res = await page.evaluate(() => {
    const m = window.__bloomMetrics();
    return { anyUnder: m.rings.some((r) => r.underFootFloor === true), anyCross: m.rings.some((r) => r.crossesAxis === true),
             shown: /RINGS NARROWER THAN A FOOT/.test(document.getElementById('readout').textContent),
             crossSaid: /they cross the (axis|apex)/.test(document.getElementById('readout').textContent),
             inner: Math.min(...m.rings.map((r) => r.radius)) };
  });
  const problems = [];
  if (res.anyUnder !== want) problems.push(`footRing() reports ${res.anyUnder ? 'a ring' : 'no ring'} under the ${FOOT_MIN_WIDTH_MM} mm foot floor (innermost ${res.inner.toFixed(3)} mm), this row expects ${want ? 'one' : 'none'} — the owner's flag disagrees with the measured state`);
  if (res.shown !== res.anyUnder) problems.push(`the RINGS NARROWER THAN A FOOT line is ${res.shown ? 'SHOWN' : 'ABSENT'} while the owner reports ${res.anyUnder ? 'a ring under the floor' : 'none'}`);
  if (res.crossSaid !== res.anyCross) problems.push(`the axis-crossing clause is ${res.crossSaid ? 'shown' : 'absent'} while the owner reports ${res.anyCross ? 'a ring inside its overhang' : 'none'}`);
  if (problems.length) note(`${tag}: ${problems.join('; ')}`);
  else ok.push(`${tag}: line ${res.shown ? 'shown' : 'absent'}, owner agrees (innermost ring ${res.inner.toFixed(3)} mm${res.anyCross ? ', feet cross the axis' : ''})`);
}

/* ---------------- (k) THE DOME LINE, THE APEX CLAMP AND THE SEAT, BOTH DIRECTIONS ---------------- */
/* The head-rise control's read-out (Sep 4): the HEAD RISE line is shown iff
   footRing() declares a dome, which is iff the control is off zero; the
   "(CLAMPED" clause iff the owner's apex floor bound; the seat line iff the
   centre reports a seat. Each asserted in both directions against the OWNER'S
   flags, never against this tool's idea of the geometry — the sub-8 spiral
   precedent, and route (j)'s. The rows: flat; a mid rise; the one reachable
   corner where the floor binds (a 1.15 mm hub under a 2.40 mm sheet); a
   hemisphere on the defaults where it does not; and RING, which seats no
   flat-based button and must print no seat. */
for (const [label, sets, wantDome, wantClamp, wantSeat] of [
  ['defaults (flat)', [], false, false, false],
  ['head rise 0.50 on the defaults', [{ id: 'headRise', value: '0.5' }], true, false, true],
  ['ALL MIN x sheet 2.40 x spread min x rise 1 (the apex floor binds)', [{ id: 'petalCount', value: '3' }, { id: 'petalWidth', value: '8' }, { id: 'sheetThickness', value: '2.4' }, { id: 'footDelicacy', value: '0.25' }, { id: 'spread', value: '0.6' }, { id: 'headRise', value: '1' }], true, true, true],
  ['head rise 1 on the defaults (a hemisphere, no clamp)', [{ id: 'headRise', value: '1' }], true, false, true],
  ['head rise 0.50 x RING (no flat-based seat)', [{ id: 'headRise', value: '0.5' }, { id: 'centerStyle', value: 'RING' }], true, false, false],
]) {
  const tag = `[dome] ${label}`;
  await openBloom(page, port);
  if (NEGATIVE_CONTROL) {
    /* NEGATIVE CONTROL, route (k): the read-out never changes again — the
       HEAD RISE line cannot appear where the owner declares a dome. */
    await page.evaluate(() => { const el = document.getElementById('readout'); const t = el.textContent; Object.defineProperty(el, 'textContent', { get: () => t, set: () => {}, configurable: true }); });
  }
  const bad = await applyConfig(page, sets);
  if (bad.length) { note(`${tag}: config did not take: ${bad.join('; ')}`); continue; }
  const res = await page.evaluate(() => {
    const m = window.__bloomMetrics(); const txt = document.getElementById('readout').textContent; const ui = window.__bloomUIState();
    return { rise: Number(ui.headRise), hasDome: m.hubDome !== null, clamped: !!(m.hubDome && m.hubDome.clamped), riseBuilt: m.hubDome ? m.hubDome.riseBuilt : null,
             shown: /HEAD RISE/.test(txt), clampSaid: /\(CLAMPED: rise/.test(txt), seat: m.centerSeat !== null, seatSaid: /centre seated on the apex/.test(txt),
             reliefSaid: /local relief .* at the rim, .* at the innermost ring/.test(txt), hubBuiltDome: !!(m.hubBuilt && m.hubBuilt.dome), hubTris: m.hubBuilt ? m.hubBuilt.tris : null };
  });
  const problems = [];
  if (res.hasDome !== wantDome) problems.push(`footRing() ${res.hasDome ? 'declares a dome' : 'declares none'}, this row expects ${wantDome ? 'one' : 'none'}`);
  if (res.hasDome !== (res.rise !== 0)) problems.push(`the owner ${res.hasDome ? 'declares a dome' : 'declares none'} while the control reads ${res.rise} — the guard and the control disagree`);
  if (res.hubBuiltDome !== res.hasDome) problems.push(`the hub builder ${res.hubBuiltDome ? 'built a shell' : 'built the disc'} while the owner ${res.hasDome ? 'declares a dome' : 'declares none'}`);
  if (res.hubTris !== (res.hasDome ? 3456 : 192)) problems.push(`the hub built ${res.hubTris} triangles, expected ${res.hasDome ? 3456 : 192} — the count is a branch on the dome, not a ramp`);
  if (res.shown !== res.hasDome) problems.push(`the HEAD RISE line is ${res.shown ? 'SHOWN' : 'ABSENT'} while the owner ${res.hasDome ? 'declares a dome' : 'declares none'}`);
  if (res.hasDome && !res.reliefSaid) problems.push('the HEAD RISE line does not print the local relief at the rim and at the innermost ring');
  if (res.clamped !== wantClamp) problems.push(`the owner reports clamped ${res.clamped}, this row expects ${wantClamp}`);
  if (res.clampSaid !== res.clamped) problems.push(`the (CLAMPED clause is ${res.clampSaid ? 'shown' : 'absent'} while the owner reports clamped ${res.clamped}`);
  if (res.seat !== wantSeat) problems.push(`the centre reports ${res.seat ? 'a seat' : 'no seat'}, this row expects ${wantSeat ? 'one' : 'none'}`);
  if (res.seatSaid !== res.seat) problems.push(`the seat line is ${res.seatSaid ? 'shown' : 'absent'} while the centre reports ${res.seat ? 'a seat' : 'none'}`);
  if (problems.length) note(`${tag}: ${problems.join('; ')}`);
  else ok.push(`${tag}: HEAD RISE line ${res.shown ? 'shown' : 'absent'}, owner agrees (rise ${res.rise}${res.clamped ? ' CLAMPED to ' + res.riseBuilt.toFixed(2) : ''}, hub ${res.hubTris} tris${res.seat ? ', seat line shown' : ''})`);
}

await browser.close();
server.close();

/* ---------------- report ---------------- */
console.log('panel gate: every registry control must render exactly once and stay reachable when its section is collapsed.\n');
for (const line of ok) console.log(`  ok   ${line}`);

if (NEGATIVE_CONTROL) {
  if (fail.length) {
    console.log(`\nNEGATIVE CONTROL: PASS — the gate caught ${fail.length} deliberate break(s):`);
    for (const f of fail) console.log(`  - ${f}`);
    /* Both routes must have fired. A negative control that only proves the
       census works would leave the reactivity assertion unverified, which is
       the half that is easy to write as a no-op. */
    const sawCensus = fail.some((f) => /renders 0 times/.test(f));
    const sawPath = fail.some((f) => /did not change|did not move|state snapshot says/.test(f));
    const sawAccordion = fail.some((f) => /^accordion A[23]:/.test(f));
    const sawVisibility = fail.some((f) => /^\[visibility\]/.test(f));
    const sawLabel = fail.some((f) => /^\[label\] .* summary reads/.test(f));
    const sawDepth = fail.some((f) => /^\[depth\] .*hiddenReason caption is/.test(f));
    const sawPreview = fail.some((f) => /^\[preview\]: .*did not rebuild/.test(f));
    const sawInner = fail.some((f) => /^\[inner rings\] .*line is ABSENT while the owner reports a ring under the floor/.test(f));
    const sawDome = fail.some((f) => /^\[dome\] .*HEAD RISE line is ABSENT while the owner declares a dome/.test(f));
    if (sawCensus && sawPath && sawAccordion && sawVisibility && sawLabel && sawDepth && sawPreview && sawInner && sawDome) { console.log('\nALL NINE ROUTES OBSERVED THE FAILURE they exist to catch.'); process.exit(0); }
    console.error(`\nNEGATIVE CONTROL: INCOMPLETE — census route fired: ${sawCensus}, path route fired: ${sawPath}, accordion route fired: ${sawAccordion}, visibility route fired: ${sawVisibility}, derived-label route fired: ${sawLabel}, depth/caption route fired: ${sawDepth}, print-preview route fired: ${sawPreview}, inner-ring route fired: ${sawInner}, dome route fired: ${sawDome}. All nine must.`);
    process.exit(1);
  }
  console.error('\nNEGATIVE CONTROL: FAILED — the gate passed a panel with a deleted control, a listener-less input, an unreachable accordion handler, a frozen derived label, a frozen caption, a listener-less print-preview box, a frozen read-out and a frozen dome line. It is not measuring anything.');
  process.exit(1);
}

if (fail.length) {
  console.error(`\npanel gate: FAIL — ${fail.length} assertion(s):`);
  for (const f of fail) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\npanel gate: PASS — every control is declared once, rendered once, and reachable through the real UI from inside a collapsed section.');
