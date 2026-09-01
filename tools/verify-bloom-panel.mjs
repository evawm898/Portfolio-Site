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
           perfect — and requires this run to FAIL on all four.
           A check nobody has seen fail is a hope.
   =================================================================== */
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, CONTROLS, SECTIONS,
         RETIRED_IDS, DEFAULTS, evalPredicate, predicateDrivers, verifySections,
         SPIRAL_LEGIBLE_COUNT } from './bloom-harness.mjs';

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
  if (rendered[0].summary !== s.label) note(`section "${s.id}" summary reads "${rendered[0].summary}", registry declares "${s.label}"`);
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

/* A section is hidden iff every control in it is hidden — the derived rule,
   checked against the DOM rather than trusted from the code that wrote it. */
for (const s of SECTIONS) {
  const members = CONTROLS.filter((c) => c.section === s.id);
  const allHidden = members.every((c) => byId[c.id].hidden === true);
  const rendered = census.sections.find((r) => r.id === s.id);
  if (rendered && rendered.hidden !== allHidden) {
    note(`section "${s.id}" hidden=${rendered.hidden}, but "every member hidden" is ${allHidden}`);
  }
}
ok.push('every section\'s hidden state equals "every control in it is hidden"');

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
  /* A3 — close the one that is open; nothing may spring open in its place. */
  const last = openNow();
  if (last.length === 1) {
    document.querySelector(`#sec-${last[0]} > summary`).click();
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
let exclusive = true;
for (const st of accordion.steps) {
  if (st.open.length !== 1 || st.open[0] !== st.opened) {
    exclusive = false;
    note(`accordion A2: opening "${st.opened}" left [${st.open.join(', ')}] open — the panel must hold exactly one`);
  }
}
if (exclusive) ok.push(`accordion A2: opening each of the ${accordion.steps.length} sections by a real summary click left exactly that one open, every time (walk order ${accordion.order.join(' > ')} — the initially-open section last, so every click is an opening)`);
if (accordion.afterClosingLast.length !== 0) {
  note(`accordion A3: closing the open section left [${accordion.afterClosingLast.join(', ')}] open — nothing may spring open by itself`);
} else {
  ok.push('accordion A3: closing the open section leaves zero open, and nothing springs open in its place');
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
  const res = await page.evaluate(async ({ id, value, section, breakIt }) => {
    const det = document.getElementById(`sec-${section}`);
    const el = document.getElementById(id);
    const span = el.closest('.bl-ctrl').querySelector('.bl-val');
    if (breakIt) {
      /* NEGATIVE CONTROL, route (b): the declarations stay perfect and the app
         stops reacting. cloneNode copies the element, its id and its value and
         drops every listener — which is the flower's `predicateDrivers`
         imported-and-never-called defect, reproduced exactly. */
      el.replaceWith(el.cloneNode(true));
    }
    const target = document.getElementById(id);
    const openBefore = det.open;
    const labelBefore = span.textContent;
    const stateBefore = window.__bloomUIState()[id];
    const witnessBefore = window.__bloomMetrics();
    target.value = value;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return {
      openBefore, openAfter: det.open,
      readback: target.value,
      labelBefore, labelAfter: span.textContent,
      stateBefore, stateAfter: window.__bloomUIState()[id],
      metricsBefore: witnessBefore, metricsAfter: window.__bloomMetrics(),
      readout: document.getElementById('readout').textContent,
    };
  }, { id: w.id, value: w.value, section: s.id, breakIt: NEGATIVE_CONTROL });

  const tag = `[${s.id}] ${w.id} -> ${w.value} while collapsed`;
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
      return { state: window.__bloomUIState(), seen };
    }, { id: driverId, value, breakIt: NEGATIVE_CONTROL });

    const tag = `[visibility] ${driverId} -> ${value}`;
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
    if (sawCensus && sawPath && sawAccordion && sawVisibility) { console.log('\nALL FOUR ROUTES OBSERVED THE FAILURE they exist to catch.'); process.exit(0); }
    console.error(`\nNEGATIVE CONTROL: INCOMPLETE — census route fired: ${sawCensus}, path route fired: ${sawPath}, accordion route fired: ${sawAccordion}, visibility route fired: ${sawVisibility}. All four must.`);
    process.exit(1);
  }
  console.error('\nNEGATIVE CONTROL: FAILED — the gate passed a panel with a deleted control, a listener-less input and an unreachable accordion handler. It is not measuring anything.');
  process.exit(1);
}

if (fail.length) {
  console.error(`\npanel gate: FAIL — ${fail.length} assertion(s):`);
  for (const f of fail) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\npanel gate: PASS — every control is declared once, rendered once, and reachable through the real UI from inside a collapsed section.');
