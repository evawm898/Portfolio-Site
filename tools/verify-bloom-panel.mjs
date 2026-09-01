/* ===================================================================
   verify-bloom-panel.mjs — BUILD GATE: every control the registry declares
   is REACHABLE in the panel, and collapsing a section does not take it away.

   TWO ROUTES, AND NEITHER SUBSTITUTES FOR THE OTHER. This is the flower
   project's dump-versus-sheet lesson, moved to the thing it was learned on:
   a check that sets state and evaluates predicates proves the DECLARATIONS,
   and it cannot catch an app that never re-runs — `predicateDrivers` was
   imported and never called, and the panel silently stopped responding while
   every declaration stayed correct.

     (a) THE DECLARATION ROUTE — the render census. Every non-retired registry
         control appears in the panel EXACTLY ONCE, in the section it declares,
         in the registry's order, with exactly one label and one read-out span;
         every section renders exactly once, in SECTIONS order, at the
         first-load `open` the registry declares; nothing appears in the panel
         that is not a registry control; and each wrapper's `hidden` agrees
         with its own predicate evaluated against the same state. Counting is
         the point: "exactly once" catches the duplicate-span defect as well as
         the missing-control one, and only one of those is visible by eye.

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
           Breaks both routes on purpose — deletes one control's wrapper from
           the DOM, and replaces another control's element with a listener-less
           clone (the app-does-not-react failure, exactly) — and requires this
           run to FAIL on both. A check nobody has seen fail is a hope.
   =================================================================== */
import { serveRepo, launchPage, openBloom, CONTROLS, SECTIONS, RETIRED_IDS, DEFAULTS,
         evalPredicate, verifySections } from './bloom-harness.mjs';

const NEGATIVE_CONTROL = process.argv.includes('--negative-control');

/* THE GEOMETRY WITNESS for each section that ships collapsed — the control to
   drive, the value to drive it to, and the number in the app's own metrics
   that MUST move as a result. Declared here beside the reason, never sniffed
   from the registry: which quantity a control moves is a fact about the
   geometry, and a gate guessing at it is a gate that passes when the control
   stops working. Every id and value is checked against the registry below, so
   a range change cannot leave this table quietly out of bounds. */
const WITNESS = {
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
  material: { id: 'sheetThickness', value: '2.4',
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

/* ---------------- the collapse invariant ---------------- */
const invariant = await page.evaluate(() => {
  const before = window.__bloomUIState();
  const m0 = window.__bloomMetrics();
  const openState = [...document.querySelectorAll('#panelControls details')].map((d) => d.open);
  document.querySelectorAll('#panelControls details').forEach((d) => { d.open = false; });
  const collapsed = window.__bloomUIState();
  document.querySelectorAll('#panelControls details').forEach((d) => { d.open = true; });
  const expanded = window.__bloomUIState();
  const m1 = window.__bloomMetrics();
  [...document.querySelectorAll('#panelControls details')].forEach((d, i) => { d.open = openState[i]; });
  return {
    equalCollapsed: JSON.stringify(before) === JSON.stringify(collapsed),
    equalExpanded: JSON.stringify(before) === JSON.stringify(expanded),
    geometryStill: m0.liveTris === m1.liveTris && m0.ringRadius === m1.ringRadius,
    tris: m0.liveTris, ring: m0.ringRadius,
  };
});
if (!invariant.equalCollapsed) note('the app\'s state snapshot CHANGED when every section was collapsed — collapse is reaching readUI');
if (!invariant.equalExpanded) note('the app\'s state snapshot CHANGED when every section was expanded — collapse is reaching readUI');
if (!invariant.geometryStill) note('collapsing and expanding every section MOVED the geometry (live triangle count or ring radius)');
if (invariant.equalCollapsed && invariant.equalExpanded && invariant.geometryStill) {
  ok.push(`collapse invariant: whole-state snapshot identical all-collapsed / all-expanded, geometry unmoved (${invariant.tris.toLocaleString('en-US')} tris live, ring ${invariant.ring.toFixed(2)} mm)`);
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
    if (sawCensus && sawPath) { console.log('\nBOTH ROUTES OBSERVED THE FAILURE they exist to catch.'); process.exit(0); }
    console.error(`\nNEGATIVE CONTROL: INCOMPLETE — census route fired: ${sawCensus}, path route fired: ${sawPath}. Both must.`);
    process.exit(1);
  }
  console.error('\nNEGATIVE CONTROL: FAILED — the gate passed a panel with a deleted control and a listener-less input. It is not measuring anything.');
  process.exit(1);
}

if (fail.length) {
  console.error(`\npanel gate: FAIL — ${fail.length} assertion(s):`);
  for (const f of fail) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\npanel gate: PASS — every control is declared once, rendered once, and reachable through the real UI from inside a collapsed section.');
