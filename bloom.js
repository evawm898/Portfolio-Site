/* ===================================================================
   bloom.js — Parametric Bloom app. Charter: docs/bloom-charter.md.

   The registry (bloom-registry.js) is the single source of truth: this file
   GENERATES the panel DOM from it and derives inputs, readUI, DEFAULTS,
   reset, labels, listeners and visibility from the same rows. There is no
   second list of controls anywhere, and applyVisibility() is the only thing
   that hides a control wrapper.
   =================================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { CONTROLS, SECTIONS, DEFAULTS, UMBEL_DEPTH2_DEFAULTS, evalPredicate, coerceValue, sectionLabel, fanGroupSaid } from './bloom-registry.js';
import { MeshBuilder, buildBloomInto, footRing, thicknessProfile, MIN_FEATURE_MM, TIP_HALF_MM, APEX_HALF_MM, FOOT_MIN_WIDTH_MM, SPIRAL_LEGIBLE_COUNT, stemIsAbsent, stemNodesAbsent, stemAxisAt, STEM_NODE_JOINT_DIAMETERS, STEM_MIN_WALL_MM, NOZZLE_MM, stemCutAbsent, leafIsAbsent, leafNodeRunLive, leafNodeSpacingLive, leafSizeTaperLive, sepalsAbsent, inflorescenceIsAbsent, umbelHeadIsAbsent, varianceIsAbsent, varianceFormIsAbsent, infillIsAbsent, textureIsAbsent, TEXTURE_LATTICE_BAR, varianceSpacingIsAbsent, EXPORT_TRI_BUDGET, INFILL_DENSITY_RANGE, RIM_BEAD_RADIUS_MM, RIM_TAPER_MM, RIM_TIP_ROWS, nodeVarianceIsAbsent, umbelDepthRefusal, umbelIsCompound, UMBEL_DEPTH_VALUES, outlineWidthScale, spineBendRefusal, stamenBraidBuilt, strandOffsetsFor, strandValue, SCOPE_STRAND_IDS } from './bloom-geometry.js';
const INFILL_DENSITY_RANGE_MAX = INFILL_DENSITY_RANGE[1];
import { VIEW_PRESETS } from './bloom-view-presets.js';
import { buildGridGltf } from './bloom-grid-gltf.js';
import { composeDoc, readDoc, toText, isDesignFile, scopesForBuild, scopesAreEmpty, SCOPEABLE_IDS, SCOPEABLE_TIER_IDS, scopeExclusionReason, scopeOffsetRefusal, composeControls, readControls, fieldFor } from './bloom-file.js';
import { cloneCurve, curveSamples, pointsOf, proposeEdit, quantise, nearestOnCurve, sampleCurve, curveShapeRefusal, curveSpecProblems, curveEquals, switchMode } from './bloom-curve.js';
import { leafBladeState, leafletBladeState, leafOutlineWidthScale, leafletOutlineWidthScale, compoundLeafLayout as compoundLeafLayoutForSeed } from './bloom-geometry.js';
import { scopeOffsetsFor, scopeSlotKey, resolvePetalTerms, resolvePetalValues, SCOPE_VALUE_IDS, SCOPE_VALUE_GROUPS, SEPAL_SCOPE_VALUE_IDS, SEPAL_SCOPE_VALUE_GROUPS, seedSpineCurve, seedOutlineCurve, sepalBladeState, sepalOutlineWidthScale, scopeValueGroup, SCOPE_LAYER_OWNED, scopeLayersLive, scopePetalsLive, petalGroupCount, sepalTierState, sepalTiersEligible, sepalTierCount } from './bloom-geometry.js';

/* Cap the OUTPUT, never an input proxy (flower lesson: the parameter space
   has genuine cliffs no input-space guard can see). Measured against the
   export triangle count; export refuses above this. Phase-1 geometry peaks
   near 60k export tris at petalCount 40, so the cap is slack by design —
   it exists so the refusal path is real before it is ever needed.
   IMPORTED FROM THE GEOMETRY, ONE OWNER — the apex row ramp's own
   budget cap (see `buildBloomInto` in bloom-geometry.js) is the first thing
   IN THE GEOMETRY that needs this number, so it moved there rather than
   being restated in two places. */

/* ---------------- panel: generated from the registry ---------------- */
const panelRoot = document.getElementById('panelControls');
const inputs = {};   // id -> input element
const valSpans = {}; // id -> read-out span
const wrappers = {}; // id -> control wrapper div
const sectionEls = {}; // section id -> <details>
const summaryEls = {}; // section id -> its <summary>, for the derived labels refreshLabels() rewrites
/* hiddenReason captions: ONE element per distinct reason object per parent —
   the registry declares the reason once and references it from every section
   that hides for it, so identity is what makes the caption single. */
const whyEls = new Map(); // reason object -> { el, parent, sections: [ids] }
/* THE SEEDED CURVE'S SENTENCE (curves-sepals — see onSeedSwitch): curve id ->
   the read-out's seed note, until that curve is next edited */
const seedNotes = {};

/* THE CURVE VALIDATORS' CONTEXT, from the build on screen: every drawn
   petal's asked length (the spine's), and every outline-curved petal's own
   record — its length, the width scale it was built at and whether its first
   point is pinned to a throat (F6-sym-2) — so the refusal asks about the
   petals that exist. `widthDelta` is a candidate Petal width's change: the
   width drag asks the outline's validator with every petal's scale moved by
   it (one predicate for the slider and the point drag). */
/* F6-SCOPE — WHICH PETALS AN EDIT TO THE OUTLINE ON SCREEN REACHES. With a
   layer or pair picked: that scope's petals (an edit makes the curve theirs).
   With none: every petal whose curve no scope owns — a petal drawing its
   layer's or its pair's own curve is not asked about the whole bloom's. */
function petalInScope(p, v) {
  return Math.round(p.whorl) === v.layer && (v.kind === 'layer' || scopeSlotKey(p.slotIndex, lastFoot.slotCount, readUI()) === v.slot);
}
function outlineEditReaches(p) {
  if (scopeView && scopeView.kind !== 'tier') return petalInScope(p, scopeView);
  return !(p.outlineFrom && p.outlineFrom.petalOutlineCurve);
}
/* F3-SCOPE — THE SAME QUESTION FOR THE SPINE CURVE: with a layer or pair
   picked, that scope's petals (an edit makes the curve theirs); with none,
   every petal whose spine curve no scope owns. The refusal then asks about
   the lengths of exactly the petals the drag would bend — an inner layer that
   owns its own (tighter) curve does not refuse the whole bloom's edit, and a
   picked inner layer's drag is refused at ITS length. */
function spineEditReaches(p) {
  if (scopeView && scopeView.kind !== 'tier') return petalInScope(p, scopeView);
  return !(p.spineFrom && p.spineFrom.petalSpineCurve);
}
/* a key for "the same table": its length, its row count and its two reach
   columns summed — the petals of one whorl share one, a field or a scope
   makes another */
const bendKeys = new WeakMap();
function bendTableKey(askedLengthMm, T) {
  if (!bendKeys.has(T)) { let a = 0, b = 0; for (let i = 0; i < T.N; i++) { a += T.reachPos[i]; b += T.reachNeg[i]; } bendKeys.set(T, `${T.length}|${T.N}|${T.floorRadius}|${a}|${b}`); }
  return `${askedLengthMm}|${bendKeys.get(T)}`;
}
function curveValidatorCtx({ widthDelta = 0, widthTo = null, reaches = outlineEditReaches, spineReaches = spineEditReaches } = {}) {
  const outlined = lastPetalsAll.filter((p) => p && p.tipCap && p.tipCap.outline && reaches(p)).map((p) => p.tipCap.outline);
  const seen = new Set(), outlinePetals = [];
  for (const o of outlined) {
    const e = { lengthMm: o.lengthMm, scale: outlineWidthScale({ petalWidth: widthTo !== null ? widthTo : o.widthMm + widthDelta }), pinnedFirst: !!o.throat };
    const k = `${e.lengthMm}|${e.scale}|${e.pinnedFirst}`;
    if (!seen.has(k)) { seen.add(k); outlinePetals.push(e); }
  }
  /* THE FOLD LIMIT'S TABLES (spine-cup-fold) of the petals the edit reaches,
     off the build on screen: a candidate curve meets the SAME section (the
     section does not depend on the spine), so the build's own table is the one
     to ask. One entry per distinct table. */
  const bends = [], seenT = new Set();
  for (const p of lastPetalsAll) {
    if (!p || !p.spine || !p.spine.bendTable || !spineReaches(p)) continue;
    const k = bendTableKey(p.spine.askedLengthMm, p.spine.bendTable);
    if (!seenT.has(k)) { seenT.add(k); bends.push({ askedLengthMm: p.spine.askedLengthMm, table: p.spine.bendTable }); }
  }
  return {
    bends: bends.length ? bends : null,
    askedLengthsMm: [...new Set(lastPetalsAll.filter((p) => p && p.spine && spineReaches(p)).map((p) => p.spine.askedLengthMm))],
    outlinePetals: outlinePetals.length ? outlinePetals : null,
    sepal: sepalValidatorCtx(),
    ...leafValidatorCtx(),
  };
}
/* curves-leaves — THE SAME CONTEXT FOR A LEAF CURVE, off the leaves the build
   on screen drew: every blade's asked length and fold-limit table (the simple
   or lobed blade's own, or the compound RACHIS's length, which carries no
   section), and every blade's drawn-outline record (its length and its own
   scale — each leaflet's). Null halves fall back to the controls' own. */
function leafValidatorCtx() {
  const built = lastLeavesBuilt || [];
  if (!built.length) return { leaf: null, leaflet: null };
  const sp = built.filter((r) => r.spine);
  const lens = [...new Set(sp.map((r) => r.spine.askedLengthMm))];
  const bends = [], seenT = new Set();
  for (const r of sp) {
    if (!r.spine.bendTable) continue;
    const k = bendTableKey(r.spine.askedLengthMm, r.spine.bendTable);
    if (!seenT.has(k)) { seenT.add(k); bends.push({ askedLengthMm: r.spine.askedLengthMm, table: r.spine.bendTable }); }
  }
  const blades = (kind) => {
    const out = [], seen = new Set();
    for (const r of built) for (const b of (r.compound ? r.leaflets : [r])) {
      if (!b.outline || (kind === 'leaflet') !== !!r.compound) continue;
      const e = { lengthMm: b.outline.lengthMm, scale: b.outline.scale, pinnedFirst: false };
      const k = `${e.lengthMm}|${e.scale}`;
      if (!seen.has(k)) { seen.add(k); out.push(e); }
    }
    return out.length ? out : null;
  };
  const leafB = blades('leaf'), leafletB = blades('leaflet');
  return {
    leaf: sp.length || leafB ? { askedLengthsMm: lens.length ? lens : null, bends: bends.length ? bends : null, outlineBlades: leafB } : null,
    leaflet: leafletB ? { askedLengthsMm: null, bends: null, outlineBlades: leafletB } : null,
  };
}
/* curves-sepals — THE SAME CONTEXT FOR A SEPAL CURVE: the sepals the edit
   reaches, off the build on screen — with a tier picked, that tier's; with
   none, every built tier that owns no curve of its own for the group (a tier's
   own value is not the whole bloom's to refuse). Each sepal's own asked length,
   fold-limit table and outline record (its scale is the sepal's own, as built). */
function sepalBlades() {
  const out = [];
  for (const T of (lastSepalsBuilt && lastSepalsBuilt.tiers) || []) if (T.present) for (const p of T.built) out.push({ p, T });
  return out;
}
function sepalEditReaches({ T }, id) {
  if (scopeView && scopeView.kind === 'tier') return T.tier === scopeView.layer;
  return !(T.term && T.term.values && id in T.term.values);
}
function sepalValidatorCtx() {
  const blades = sepalBlades();
  if (!blades.length) return null;
  const sp = blades.filter((b) => b.p.spine && sepalEditReaches(b, 'sepalSpineCurve'));
  const bends = [], seenT = new Set();
  for (const { p } of sp) {
    if (!p.spine.bendTable) continue;
    const k = bendTableKey(p.spine.askedLengthMm, p.spine.bendTable);
    if (!seenT.has(k)) { seenT.add(k); bends.push({ askedLengthMm: p.spine.askedLengthMm, table: p.spine.bendTable }); }
  }
  const outlinePetals = [], seen = new Set();
  for (const b of blades) {
    const o = b.p.tipCap && b.p.tipCap.outline;
    if (!o || !sepalEditReaches(b, 'sepalOutlineCurve')) continue;
    const e = { lengthMm: o.lengthMm, scale: o.scale, pinnedFirst: false };
    const k = `${e.lengthMm}|${e.scale}`;
    if (!seen.has(k)) { seen.add(k); outlinePetals.push(e); }
  }
  /* a sepal not yet on a curve (a switch in flight) is asked at its asked length */
  const lengths = [...new Set(sp.map((b) => b.p.spine.askedLengthMm))];
  return { bends: bends.length ? bends : null, askedLengthsMm: lengths, outlinePetals: outlinePetals.length ? outlinePetals : null };
}
function makeInput(c) {
  if (c.kind === 'slider') {
    const input = document.createElement('input');
    input.type = 'range';
    input.min = c.min; input.max = c.max; input.step = c.step;
    return input;
  }
  if (c.kind === 'choice') {
    const sel = document.createElement('select');
    for (const o of c.options) {
      const opt = document.createElement('option');
      opt.value = o.value; opt.textContent = o.label;
      /* a RETIRED value (BONE replaced PEBBLE and CELLULAR, Oct 28) is kept
         so a saved design that names it still loads, and is not offered */
      if (o.hidden) opt.hidden = true;
      sel.append(opt);
    }
    return sel;
  }
  if (c.kind === 'curve') {
    return makeCurveInput(c, {
      /* THE VALIDATOR'S CONTEXT (F3-global): the asked lengths of every petal
         the build on screen drew, from the builder's own record — the same
         shape at a shorter inner whorl is tighter, and the refusal has to ask
         about the petals that exist rather than re-derive them from the
         sliders (a second producer of the whorl's size law). */
      validate: (cand) => (typeof c.validate === 'function' ? c.validate(cand, readUI(), curveValidatorCtx()) : null),
      ownerLength: () => Number(inputs[c.curve.owner].value),
      ownerLabel: (CONTROLS.find((o) => o.id === c.curve.owner) || {}).label || c.curve.owner,
    });
  }
  throw new Error(`unhandled control kind "${c.kind}" for ${c.id}`);
}

/* ===================================================================
   THE CURVE EDITOR — the panel widget for a `kind: 'curve'` control (the
   curve-editor session, Oct 14; read docs/bloom-curve-editor.md). NO LIVE
   CONTROL USES IT YET: F3 (the spine) and F6 (the outline) wire into it in
   their own sessions, and until then it is reached through the capability
   hook `__bloomCurveTest` below and nothing else.

   THE ELEMENT BEHAVES LIKE AN INPUT, so every path in this file that treats a
   control as one — the generator, readUI(), Reset, a design-file load, a
   scope's load — needs no curve arm: `.value` reads a COPY of the curve and
   writes one (a write, like an input's, fires nothing), and a hand's edit
   fires `input` (during a drag) and `change` (when it ends). The editor holds
   NOTHING but the value, a drag in progress and a focused point — a curve is
   a value the design file and a scope can hold, never page state (Eva).

   EVERY EDIT GOES THROUGH bloom-curve.js's `proposeEdit` — a drag step, an
   add, a remove, a nudge, a mode switch — and a refused edit LEAVES THE VALUE
   AS IT WAS: the point stays where it last was, the status line says why, and
   nothing is clamped, projected or bisected toward the boundary (Eva's Q4.4:
   "a drag past printable curvature is REFUSED — the point does not move
   there"). The refusal is the CONSUMER's (`validate`) or the value's own
   shape rule's; the widget adds none of its own and decides none itself.

   THE GESTURES. Drag a point. Double-click ON THE CURVE to add a point there
   (within 8 px of the drawn curve); double-click a point, or right-click it,
   to remove it. With the editor focused: [ and ] (or Home / End) pick the
   previous / next point, the arrow keys nudge it by 0.005 of the owning
   length (Shift: 0.05), + (or Insert) adds a point on the curve after it,
   Delete / Backspace removes it. In 'symmetric' the mirror is drawn dashed
   and is not a handle; 'two-sided' draws both sides as handles, the left
   above the axis and the right below it; the mode select switches, and
   two-sided -> symmetric keeps the LEFT side (bloom-curve.js `switchMode`).

   EVERY STORED NUMBER IS A FRACTION OF THE OWNING LENGTH. The pointer is read
   in the SVG's own viewBox, which IS the fraction box (one viewBox unit = the
   owning length), quantised to bloom-curve.js's grid, and stored — never
   multiplied by the owner. The owner's millimetres appear only in the caption
   under the editor, which is the one place a reader of the panel sees mm.
   =================================================================== */
const SVG_NS = 'http://www.w3.org/2000/svg';
/* every mounted editor's render — refreshLabels() re-renders each after a
   rebuild, so the millimetre caption follows the owning length live */
const liveCurveEditors = new Set();
const CURVE_NUDGE = 0.005;
const CURVE_HANDLE_PX = 5;
const CURVE_PICK_PX = 8;
function makeCurveInput(c, { validate, ownerLength, ownerLabel }) {
  const spec = c.curve;
  let cur = cloneCurve(c.default);
  let drag = null;            // { side, i, pointerId, moved }
  let focus = { side: 'left', i: 0 };
  let refusal = null;         // { reason, side, i } — the last refused edit, until an edit is accepted
  let pressMoved = [false, false]; // did each of the last two presses on a handle drag it? (a dblclick after a drag is not a remove)
  let lastOp = null;          // the last edit proposed (accepted or refused) — the gate reads the pointer's conversion off it
  const counts = { input: 0, change: 0, refused: 0 };
  const mirrored = () => cur.mode !== 'single';

  const host = document.createElement('div');
  host.className = 'bl-curve';
  host.dataset.curve = c.id;
  const bar = document.createElement('div');
  bar.className = 'bl-curve-bar';
  let modeSel = null;
  if (spec.modes.length > 1) {
    modeSel = document.createElement('select');
    modeSel.className = 'bl-curve-mode';
    modeSel.setAttribute('aria-label', `${c.label}: mode`);
    for (const m of spec.modes) { const o = document.createElement('option'); o.value = m; o.textContent = (spec.modeLabels && spec.modeLabels[m]) || m; modeSel.append(o); }
    bar.append(modeSel);
  }
  const dims = document.createElement('span');
  dims.className = 'bl-curve-dims';
  bar.append(dims);
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'bl-curve-svg');
  svg.setAttribute('tabindex', '0');
  svg.setAttribute('role', 'application');
  svg.setAttribute('aria-label', `${c.label}: drag a point; double-click the curve to add one, a point to remove it; arrows nudge, [ ] pick, + adds, Delete removes`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const status = document.createElement('p');
  status.className = 'bl-curve-status';
  status.hidden = true;
  host.append(bar, svg, status);

  /* THE FRACTION BOX AS A VIEWBOX: x along, y across; a mirrored mode puts the
     left side above the axis (svg y = -y) and the right below (svg y = +y). */
  const pad = 0.04 * (spec.x[1] - spec.x[0]);
  const box = () => {
    const x0 = spec.x[0] - pad, w = spec.x[1] - spec.x[0] + 2 * pad;
    if (mirrored()) { const top = Math.max(Math.abs(spec.y[0]), Math.abs(spec.y[1])); return { x0, y0: -top - pad, w, h: 2 * top + 2 * pad }; }
    return { x0, y0: -spec.y[1] - pad, w, h: spec.y[1] - spec.y[0] + 2 * pad };
  };
  const svgY = (side, y) => (mirrored() && side === 'right' ? y : -y);
  const fracY = (side, vy) => (mirrored() && side === 'right' ? vy : -vy);
  const toVb = (clientX, clientY) => { const p = svg.createSVGPoint(); p.x = clientX; p.y = clientY; const m = svg.getScreenCTM(); return m ? p.matrixTransform(m.inverse()) : null; };
  const toClient = (side, xy) => { const p = svg.createSVGPoint(); p.x = xy[0]; p.y = svgY(side, xy[1]); const m = svg.getScreenCTM(); const q = p.matrixTransform(m); return { x: q.x, y: q.y }; };
  const unitsPerPx = () => { const b = box(); const wpx = svg.getBoundingClientRect().width || 218; return b.w / wpx; };
  const path = (pts, side) => pts.map((p, k) => `${k ? 'L' : 'M'}${p[0].toFixed(5)} ${svgY(side, p[1]).toFixed(5)}`).join(' ');
  const el = (tag, attrs) => { const e = document.createElementNS(SVG_NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };

  /* TWO GROUPS: the drawing (frame, axis, curves) is REBUILT on every render;
     the handles are RECONCILED in place — a circle is created or removed only
     when the point count changes, and otherwise keeps its identity across a
     render. That is not tidiness: Chromium delivers NO click, and so no
     dblclick, when the node a press landed on leaves the document before the
     release (measured, on a press and on a release alike), and a render that
     rebuilt every circle on pointerdown and pointerup is why the first cut
     never saw a double click on a handle — and then judged one itself by a
     wall-clock window, which is the defect recorded above the press handler. */
  const layers = el('g', { class: 'bl-curve-layers' });
  const marks = el('g', { class: 'bl-curve-marks' });
  svg.append(layers, marks);
  function render() {
    const b = box();
    svg.setAttribute('viewBox', `${b.x0} ${b.y0} ${b.w} ${b.h}`);
    svg.style.aspectRatio = `${b.w} / ${b.h}`;
    const upp = unitsPerPx();
    layers.replaceChildren();
    layers.append(el('rect', { class: 'bl-curve-frame', x: spec.x[0], y: mirrored() ? -Math.max(Math.abs(spec.y[0]), Math.abs(spec.y[1])) : -spec.y[1], width: spec.x[1] - spec.x[0], height: mirrored() ? 2 * Math.max(Math.abs(spec.y[0]), Math.abs(spec.y[1])) : spec.y[1] - spec.y[0] }));
    if (mirrored() || (spec.y[0] < 0 && spec.y[1] > 0)) layers.append(el('line', { class: 'bl-curve-axis', x1: spec.x[0], y1: 0, x2: spec.x[1], y2: 0 }));
    const s = curveSamples(cur, spec);
    if (cur.mode === 'symmetric') layers.append(el('path', { class: 'bl-curve-ghost', d: path(s.right, 'right') }));
    if (cur.mode === 'two-sided') layers.append(el('path', { class: 'bl-curve-line', 'data-side': 'right', d: path(s.right, 'right') }));
    layers.append(el('path', { class: 'bl-curve-line', 'data-side': 'left', d: path(s.left, 'left') }));
    const want = [];
    for (const side of cur.mode === 'two-sided' ? ['left', 'right'] : ['left']) {
      pointsOf(cur, side).forEach((p, i) => {
        const cls = ['bl-curve-pt'];
        if (focus.side === side && focus.i === i) cls.push('is-focus');
        if (refusal && drag && refusal.side === side && refusal.i === i) cls.push('is-refused');
        want.push({ class: cls.join(' '), 'data-side': side, 'data-i': i, cx: p[0], cy: svgY(side, p[1]), r: CURVE_HANDLE_PX * upp });
      });
    }
    const have = [...marks.children];
    want.forEach((attrs, k) => {
      const c = have[k] || marks.appendChild(document.createElementNS(SVG_NS, 'circle'));
      for (const [key, v] of Object.entries(attrs)) if (c.getAttribute(key) !== String(v)) c.setAttribute(key, v);
    });
    for (let k = want.length; k < have.length; k++) have[k].remove();
    if (modeSel) modeSel.value = cur.mode;
    const L = ownerLength();
    const mm = (f) => (f * L).toFixed(1);
    dims.textContent = (Number.isFinite(L) ? `box ${mm(spec.x[1] - spec.x[0])} × ${mm(spec.y[1] - spec.y[0])} mm of ${ownerLabel} ${mm(1)} mm` : '')
      /* the spec's own statement of which side is which (F6-asym: the outline's
         LEFT half is the one above the axis) */
      + (cur.mode === 'two-sided' && spec.sideCaption ? ` · ${spec.sideCaption}` : '');
    status.hidden = !refusal;
    status.textContent = refusal ? `refused — ${refusal.reason}` : '';
  }
  const fire = (type) => { counts[type]++; host.dispatchEvent(new Event(type, { bubbles: true })); };
  /* THE ONE PATH AN EDIT TAKES. Returns whether it was accepted. */
  function edit(op, { during = false } = {}) {
    lastOp = { ...op, xy: op.xy ? [op.xy[0], op.xy[1]] : undefined };
    const r = proposeEdit(cur, spec, validate, op);
    if (!r.accepted) {
      refusal = { reason: r.reason, side: op.side, i: op.i };
      counts.refused++;
      render();
      return false;
    }
    if (r.unchanged) return true;
    cur = r.value;
    refusal = null;
    render();
    fire('input');
    if (!during) fire('change');
    return true;
  }
  const quantised = (xy) => [quantise(xy[0]), quantise(xy[1])];
  /* WHICH HANDLE IS UNDER THE POINTER — by distance on screen, never by the
     event's target: the svg captures the pointer, so a release and the click
     that follows it are retargeted to the svg whatever circle was pressed. */
  const handleAt = (clientX, clientY) => {
    let best = null;
    for (const side of cur.mode === 'two-sided' ? ['left', 'right'] : ['left']) {
      pointsOf(cur, side).forEach((p, i) => {
        const q = toClient(side, p), d = Math.hypot(q.x - clientX, q.y - clientY);
        if (d <= CURVE_HANDLE_PX + 3 && (!best || d < best.d)) best = { side, i, d };
      });
    }
    return best;
  };

  /* A PRESS ON A HANDLE STARTS A DRAG, AND ITS DEFAULT IS LEFT ALONE — ON
     PURPOSE. A pointerdown whose default is prevented is followed by NO
     mousedown, click or dblclick in Chromium, so the first cut judged a double
     press ITSELF, by a 450 ms wall-clock window between two pointerdowns on one
     handle. That window stayed ARMED by any press released without a move (a
     refused drag ends exactly so), and a re-grab of the same handle index inside
     it was read as the second half of a double press: the point was removed on
     the FIRST press of a real double-click, the second press then found no
     handle, returned unprevented, and the browser's own dblclick re-inserted a
     point on the curve — four points where there were three. Green on a slow
     box, red on a fast CI runner (the stretch between two gate gestures ran
     under 450 ms there and over it here): a discrete decision on the wall
     clock, this project's own named class. The browser already owns the click
     count, so the double click is its `dblclick` (the listener below) and the
     only default prevented is `mousedown`'s — selection and focus-on-click —
     which leaves click and dblclick intact (measured). */
  svg.addEventListener('mousedown', (ev) => { if (ev.button === 0 && handleAt(ev.clientX, ev.clientY)) ev.preventDefault(); });
  svg.addEventListener('pointerdown', (ev) => {
    const h = ev.button === 0 ? handleAt(ev.clientX, ev.clientY) : null;
    if (!h) return;
    const { side, i } = h;
    focus = { side, i };
    drag = { side, i, pointerId: ev.pointerId, moved: false };
    svg.setPointerCapture(ev.pointerId);
    svg.dataset.pointer = '1';   // a pointer's focus draws no ring (bloom.css); a key press clears it
    svg.focus({ preventScroll: true });
    render();
  });
  svg.addEventListener('pointermove', (ev) => {
    if (!drag || ev.pointerId !== drag.pointerId) return;
    const vb = toVb(ev.clientX, ev.clientY);
    if (!vb) return;
    const xy = quantised([vb.x, fracY(drag.side, vb.y)]);
    if (edit({ op: 'move', side: drag.side, i: drag.i, xy }, { during: true })) drag.moved = true;
  });
  const endDrag = (ev) => {
    if (!drag || (ev && ev.pointerId !== drag.pointerId)) return;
    const moved = drag.moved;
    drag = null;
    pressMoved = [pressMoved[1], moved];
    render();
    if (moved) fire('change');
  };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);
  /* A DOUBLE CLICK ON A HANDLE REMOVES IT; ON THE CURVE IT ADDS A POINT. The
     handle is found by distance, never by the event's target (the editor
     re-renders on every press, so the second click lands on a NEW circle and
     the dblclick's target is the svg). A double click whose presses dragged the
     handle is a nudge the browser happened to count, not a remove. */
  svg.addEventListener('dblclick', (ev) => {
    ev.preventDefault();
    const h = handleAt(ev.clientX, ev.clientY);
    if (h) { if (!pressMoved[0] && !pressMoved[1]) edit({ op: 'remove', side: h.side, i: h.i }); return; }
    const vb = toVb(ev.clientX, ev.clientY);
    if (!vb) return;
    const upp = unitsPerPx();
    let best = null;
    for (const side of cur.mode === 'two-sided' ? ['left', 'right'] : ['left']) {
      const n = nearestOnCurve(cur, spec, side, [vb.x, fracY(side, vb.y)], [1 / upp, 1 / upp]);
      if (n && (!best || n.d < best.d)) best = { ...n, side };
    }
    if (!best || best.d > CURVE_PICK_PX) return;
    if (edit({ op: 'insert', side: best.side, after: best.span, xy: quantised(best.at) })) focus = { side: best.side, i: best.span + 1 };
    render();
  });
  svg.addEventListener('contextmenu', (ev) => {
    const h = handleAt(ev.clientX, ev.clientY);
    if (!h) return;
    ev.preventDefault();
    edit({ op: 'remove', side: h.side, i: h.i });
  });
  svg.addEventListener('keydown', (ev) => {
    delete svg.dataset.pointer;
    const pts = pointsOf(cur, focus.side);
    const step = ev.shiftKey ? 10 * CURVE_NUDGE : CURVE_NUDGE;
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[ev.key];
    if (dir) {
      ev.preventDefault();
      const p = pts[focus.i];
      const dy = mirrored() && focus.side === 'right' ? -dir[1] : dir[1];   // up on screen is outward on the right side's own y
      edit({ op: 'move', side: focus.side, i: focus.i, xy: quantised([p[0] + dir[0] * step, p[1] + dy * step]) });
      return;
    }
    const sides = cur.mode === 'two-sided' ? ['left', 'right'] : ['left'];
    if (ev.key === '[' || ev.key === ']' || ev.key === 'Home' || ev.key === 'End') {
      ev.preventDefault();
      const all = sides.flatMap((s) => pointsOf(cur, s).map((_, i) => ({ side: s, i })));
      const at = all.findIndex((f) => f.side === focus.side && f.i === focus.i);
      const k = ev.key === 'Home' ? 0 : ev.key === 'End' ? all.length - 1 : (at + (ev.key === ']' ? 1 : -1) + all.length) % all.length;
      focus = all[k];
      render();
      return;
    }
    if (ev.key === 'Delete' || ev.key === 'Backspace') {
      ev.preventDefault();
      if (edit({ op: 'remove', side: focus.side, i: focus.i })) focus = { side: focus.side, i: Math.max(0, Math.min(focus.i, pointsOf(cur, focus.side).length - 1)) };
      render();
      return;
    }
    if (ev.key === '+' || ev.key === '=' || ev.key === 'Insert') {
      ev.preventDefault();
      const after = Math.min(focus.i, pts.length - 2);
      const { pts: sm, span } = sampleCurve(pts, spec);
      const onSpan = sm.filter((_, k) => span[k] === after && k > 0);
      const mid = onSpan[Math.floor((onSpan.length - 1) / 2)];
      if (mid && edit({ op: 'insert', side: focus.side, after, xy: quantised(mid) })) focus = { side: focus.side, i: after + 1 };
      render();
    }
  });
  if (modeSel) modeSel.addEventListener('change', () => {
    if (!edit({ op: 'mode', mode: modeSel.value })) modeSel.value = cur.mode;
    if (cur.mode !== 'two-sided' && focus.side === 'right') focus = { side: 'left', i: 0 };
    render();
  });
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => render()).observe(svg);

  Object.defineProperty(host, 'value', {
    get: () => cloneCurve(cur),
    /* A WRITE IS A LOAD: the value is taken whole, as an input takes `.value`,
       and fires nothing (the caller dispatches, as Reset and a design-file load
       already do). A value the control cannot hold is refused here too —
       the file reader has already refused it on the way in, so reaching this
       means a caller bypassed the reader, and the page keeps its curve. */
    set: (raw) => {
      /* a matrix row, a gate or a file hands the curve as JSON text; the page's
         own callers hand the object — one setter, two spellings */
      const v = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return raw; } })() : raw;
      const why = curveShapeRefusal(v, spec);
      if (why) { console.warn(`${c.id}: not a curve this control can hold — ${why}`); return; }
      cur = cloneCurve(v);
      refusal = null;
      if (focus.side === 'right' && cur.mode !== 'two-sided') focus = { side: 'left', i: 0 };
      if (focus.i >= pointsOf(cur, focus.side).length) focus = { side: focus.side, i: 0 };
      render();
    },
  });
  /* the gate's handles onto THIS editor (read by __bloomCurveTest) */
  host.curveEditor = {
    spec,
    counts: () => ({ ...counts }),
    refusal: () => (refusal ? { ...refusal } : null),
    lastOp: () => (lastOp ? { ...lastOp } : null),
    focus: () => ({ ...focus }),
    pointClient: (side, i) => { const p = pointsOf(cur, side)[i]; return p ? toClient(side, p) : null; },
    fracClient: (side, xy) => toClient(side, xy),
    unitsPerPx,
    render,
    /* A REFUSAL FROM OUTSIDE THE EDITOR (F6-sym-2): a control the curve's
       validator also answers for (the Petal width, which scales the drawn
       outline) shows its refusal on THIS status line, so the hand reads why
       in the one place a curve refusal is ever said. `null` clears it. */
    showRefusal: (reason) => { refusal = reason ? { reason, side: null, i: null } : null; render(); },
  };
  liveCurveEditors.add(render);
  host.curveEditor.dispose = () => liveCurveEditors.delete(render);
  render();
  return host;
}

/* SECTIONS FIRST, in the registry's order, then each control into the section
   IT declares. Two loops rather than one, because the section order and the
   within-section order are different questions with different owners: the
   SECTIONS array answers the first, the CONTROLS array's own order answers the
   second. A control is appended to a section that must already exist —
   verifySections() has thrown at module load if any control names one that
   does not, so there is no silent-drop path to guard against here.

   <details>/<summary> IS THE MECHANISM, and it is chosen for a property
   rather than for being native: a control inside a CLOSED <details> keeps its
   value, its listeners and its read-out span, answers getElementById, and
   accepts a programmatic `.value` plus real input/change events — so collapse
   cannot reach readUI, the gates' read-back, or the harness, which set values
   exactly that way and never by clicking. Measured before it was built on,
   and asserted every run by tools/verify-bloom-panel.mjs; the browser also
   gives keyboard operation and open/close state for free, with no JS to hold
   it and nothing to desync. */
for (const s of SECTIONS) {
  const det = document.createElement('details');
  det.className = s.parent ? 'bl-sec bl-sec--sub' : 'bl-sec';
  det.id = `sec-${s.id}`;
  det.dataset.section = s.id;
  if (s.parent) det.dataset.parent = s.parent;
  /* The FIRST-LOAD state, from the registry's literal. Never written again by
     this file: once the page is up, open/close belongs to the visitor. */
  det.open = s.open;
  const sum = document.createElement('summary');
  /* Through the registry's one owner of the summary text, at the DEFAULTS the
     page loads with — a derived label is right from the first paint rather
     than after the first rebuild corrects it. */
  sum.textContent = sectionLabel(s, DEFAULTS);
  det.append(sum);
  summaryEls[s.id] = sum;
  /* A NESTED SECTION GOES INSIDE ITS PARENT'S ELEMENT, which the registry
     guarantees already exists: verifySections() has thrown at module load if
     a parent is missing, is the section itself, or is declared AFTER it. So
     there is no ordering to get wrong here and no silent-drop path to guard
     against — and that sentence is true for the first time as of session 3a.
     It used to cite "SECTIONS is authored parents-first", which was a
     convention nothing checked: a child declared before its parent passed
     verifySections() and threw HERE, on `sectionEls[s.parent]` being
     undefined. The precedence clause is now in the registry, where the
     literals are, so this line states a checked fact rather than a habit.

     ANY DEPTH. The two-level bound was lifted with that check (Eva's Q7);
     this loop never knew about depth — it appends into whatever the parent's
     element is. `bl-sec--sub` below is still "nested at all", not "nested at
     depth k": session 29 declared the first third level (Tip, inside
     Androecium) and paid the rule session 27 said was owed, as a DESCENDANT
     selector in bloom.css, so this line stays one class and a fourth level
     would cost nothing here either. */
  /* THE CAPTION GOES WHERE THE FIRST DROP-DOWN THAT HIDES FOR THIS REASON
     WOULD BE — appended before that section's own element, once. It is text,
     never a control: applyVisibility() is still the only thing that decides
     whether it shows, and refreshLabels() the only thing that writes it. */
  if (s.hiddenReason) {
    let w = whyEls.get(s.hiddenReason);
    if (!w) {
      const el = document.createElement('p');
      el.className = 'bl-why';
      el.hidden = true;
      sectionEls[s.parent].append(el);
      w = { el, parent: s.parent, sections: [] };
      whyEls.set(s.hiddenReason, w);
    }
    w.sections.push(s.id);
    w.el.dataset.why = w.sections.join(' ');
  }
  (s.parent ? sectionEls[s.parent] : panelRoot).append(det);
  sectionEls[s.id] = det;
}

/* THE ACCORDION — opening a section closes the others (Eva's ruling, Sep 1,
   with the tradeoff stated and accepted: tweaking across two sections costs a
   reopen click, and the layers-are-sections structure makes single-focus the
   normal case).

   ONE LISTENER, ONE OWNER. `toggle` does NOT bubble, so this is registered in
   the CAPTURE phase on the panel root — capture descends from the document
   through every ancestor regardless of bubbling, so one listener here sees
   every section's toggle. The alternative, a listener per <details>, is N
   copies of one rule and the thing that drifts; measured before it was built
   on rather than assumed from the spec.

   `toggle` IS QUEUED, NOT SYNCHRONOUS — measured, and it is the reason this
   is written as a correction rather than a veto. Two programmatic opens in one
   tick BOTH land, and this handler then runs twice and settles on the last
   one. So exclusivity is eventually-consistent within a tick, which is
   invisible to a visitor (one click is one toggle) and is exactly what a test
   asserting exclusivity synchronously would fail on. tools/verify-bloom-panel
   awaits a frame before every accordion assertion for that reason.

   It cannot recurse: closing the others fires their toggles, and a toggle
   whose target is now CLOSED returns immediately. Closing the open section is
   left alone — zero sections open is a state the visitor can reach and the
   registry may declare. This never touches `hidden`; applyVisibility() owns
   that, and open/closed and shown/hidden are different questions. */
panelRoot.addEventListener('toggle', (e) => {
  const det = e.target;
  if (!(det instanceof HTMLDetailsElement) || !panelRoot.contains(det)) return;
  if (!det.open) return;
  /* OPENING A DROP-DOWN CLOSES ITS SIBLINGS — the same rule this listener has
     always applied, stated one level more generally so nesting falls out of it
     (Eva, Sep 3). At the top level a section's siblings ARE the other
     sections, so the shipped behaviour is unchanged; inside "Petal roles",
     opening Petal 2 closes Petal 1 and leaves the parent open, because the
     parent is not a sibling. A second listener for the nested set would have
     been N copies of one rule, which is the thing that drifts — and it is why
     the guard is "inside the panel" rather than "a direct child of it". */
  for (const other of det.parentElement.children) {
    if (other !== det && other instanceof HTMLDetailsElement) other.open = false;
  }
}, true);

for (const c of CONTROLS) {
  const wrap = document.createElement('div');
  wrap.className = 'bl-ctrl';
  const label = document.createElement('label');
  label.htmlFor = c.id;
  label.append(c.label);
  const val = document.createElement('span');
  val.className = 'bl-val';
  label.append(val);
  const input = makeInput(c);
  input.id = c.id;
  input.value = c.default;
  wrap.append(label, input);
  sectionEls[c.section].append(wrap);
  inputs[c.id] = input; valSpans[c.id] = val; wrappers[c.id] = wrap;
}

/* CLICK-TO-TYPE (F5) — ONE delegated handler for every slider read-out, so a
   slider added later gets it with no edit here. UI only: it touches nothing
   but the slider's own `.value` and the two events a drag fires, and it never
   calls the rebuild path — the listeners registered below do, exactly as for a
   drag. Nothing is styled at rest: no hover, cursor, underline or border.

   Rulings: out-of-range clamps SILENTLY and a between-step value snaps — both
   by the range input's own value sanitisation, i.e. the very same rule a drag
   is subject to, not a second implementation. A number is the first one found
   in the typed text ("12 mm", "35°", "60%"); text with none cancels silently.
   Enter commits, Escape cancels, and CLICKING AWAY CANCELS (default, Eva to
   rule). Only the asked value is set; a built-count read-out is whatever
   refreshLabels() prints after the rebuild, as today. Choices and toggles are
   skipped: only a control whose input is a range gets here. */
panelRoot.addEventListener('click', (e) => {
  const span = e.target.closest && e.target.closest('.bl-val');
  if (!span || !panelRoot.contains(span)) return;
  const input = span.closest('.bl-ctrl')?.querySelector('input[type="range"]');
  if (!input) return;
  /* The span sits inside the control's <label>: stop the click being forwarded
     to the slider, and stop a second click (placing the caret) re-entering. */
  e.preventDefault();
  if (span.dataset.editing) return;
  const before = span.textContent;
  span.dataset.editing = '1';
  try { span.contentEditable = 'plaintext-only'; } catch (_) { /* fall through */ }
  if (span.contentEditable !== 'plaintext-only') span.contentEditable = 'true';
  span.focus();
  const range = document.createRange();
  range.selectNodeContents(span);
  const sel = window.getSelection();
  sel.removeAllRanges(); sel.addRange(range);
  const finish = (commit) => {
    if (!span.dataset.editing) return;
    const typed = span.textContent;
    delete span.dataset.editing;
    span.removeEventListener('keydown', onKey);
    span.removeEventListener('blur', onBlur);
    span.removeAttribute('contenteditable');
    span.textContent = before;
    if (!commit) return;
    const m = /[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/i.exec(typed);
    if (!m) return;
    const was = input.value;
    input.value = m[0];
    if (input.value === was) return;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const onKey = (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); finish(true); }
    else if (ev.key === 'Escape') { ev.preventDefault(); finish(false); }
  };
  const onBlur = () => finish(false);
  span.addEventListener('keydown', onKey);
  span.addEventListener('blur', onBlur);
});

/* Coercion is the REGISTRY's rule, imported — not re-decided here. A slider
   is a number and a choice is a string; a local `Number(...)` would turn
   `placement` into NaN, which reads back as a legitimate-looking value and is
   how a gate ends up measuring a design other than the one it names. */
/* WHILE A SCOPE IS PICKED (Scoping-b) the scopeable sliders DISPLAY the
   scope's effective value, and the GLOBAL value lives in `scopeGlobals` — so
   readUI() keeps returning the whole-bloom state to every reader it has (the
   build, the export, the save, the drag guard and every gate's read-back),
   and nothing downstream of it can learn that a scope is on screen. */
function readUI() {
  const out = {};
  for (const c of CONTROLS) out[c.id] = coerceValue(c, scopeGlobals.has(c.id) ? scopeGlobals.get(c.id) : inputs[c.id].value);
  return out;
}
/* Harness hook: gates read the app's own state snapshot rather than keeping a
   second copy of readUI's coercion rules. */
window.__bloomUIState = () => readUI();

/* Harness hooks for the contact sheet, same doctrine as body.bl-preview: the
   tool ASKS THE APP rather than recomputing. __bloomMetrics reports the live
   build's own numbers so a caption can never disagree with the model in the
   frame; __bloomFrame drives the app's own fitCamera so the centre zoom is
   the real camera at a different radius, not a crop guessing at projection.
   Assigned after the scene exists — see below. */

/* fmt receives the control's own value AND the whole state snapshot: Tip
   taper prints the DERIVED widest point a/(a+b), which needs the other
   taper. Every other fmt ignores the second argument. A control for the
   widest point would be a second owner of a derived quantity. */
/* `shown` (session 23) is the THIRD argument fmt may read: the build on
   screen, as footRing()'s own descriptors plus the mode — `{ mode,
   androecium, gynoecium }` — so a read-out can print an OWNER'S number (the
   stamen spread's cap) rather than re-derive it. It is the record regenerate()
   just built, never the export handler's, so a span can never carry an
   export number under a live label. null at module load, before any build. */
function refreshLabels(ui, shown = null, scopedUi = null) {
  /* A read-out being typed into is the visitor's, not ours, until it ends.
     WHILE A SCOPE IS PICKED (Scoping-b) only the SCOPEABLE controls read the
     scope's effective values (`scopedUi`); every whole-bloom control keeps the
     whole bloom's, because its geometry is built from the global — the first
     cut handed the scoped state to every control, so Foot delicacy and Sepal
     size quoted the picked layer's petal width and length beside a note saying
     they are the whole bloom's (the review's finding). Sections and captions
     describe the whole bloom too. */
  for (const c of CONTROLS) {
    if (valSpans[c.id].dataset.editing) continue;
    const u = scopedUi && SCOPE_IDS.has(c.id) ? scopedUi : ui;
    valSpans[c.id].textContent = c.fmt(u[c.id], u, shown) + (seedNotes[c.id] ? ` · ${seedNotes[c.id]}` : '')
      + (c.enabledWhen !== undefined && !evalPredicate(c.enabledWhen, ui) ? ` · ${c.disabledReason(ui)}` : '');
  }
  /* A SECTION'S SUMMARY CAN BE DERIVED TOO (Eva's ruling A, Sep 3; its first
     user, the rosette's hood group, was retired with the roles). Same snapshot, same pass, same owner
     (sectionLabel) as the generator used — a static label is rewritten with
     itself, which is cheaper than a second list of which sections vary. */
  for (const s of SECTIONS) summaryEls[s.id].textContent = sectionLabel(s, ui);
  for (const [reason, w] of whyEls) w.el.textContent = reason.text(ui);
  for (const r of liveCurveEditors) r();
}

/* THE CAP MARK (Eva, Sep 6, session 23) — where a slider's travel goes DEAD
   on THIS bloom, drawn on the control itself. The registry row declares
   `cap(shown)`, which names the owner's number (the stamen spread reads
   footRing()'s `saturation`); this is the ONLY writer of the mark, and it
   writes three things on the wrapper from that one number: the class that
   turns the CSS overlay on, `data-cap` (the number, for the read-out's
   twin and the gate), and `--bl-cap` (the number as a fraction of the
   slider's own range, for the overlay's position). No mark when the row
   declares no cap, when the owner has no number (the part is absent), or
   when the cap is at or past the range's top — no dead travel there, and a
   mark at the far end would say there was. The range itself is never
   touched: not narrowed, not adaptive. */
function applyCaps(shown) {
  for (const c of CONTROLS) {
    if (typeof c.cap !== 'function') continue;
    const wrap = wrappers[c.id];
    const at = c.cap(shown);
    if (at === null || at === undefined || !(at < c.max)) {
      wrap.classList.remove('bl-ctrl--capped');
      delete wrap.dataset.cap;
      wrap.style.removeProperty('--bl-cap');
      continue;
    }
    const frac = Math.min(1, Math.max(0, (at - c.min) / (c.max - c.min)));
    wrap.classList.add('bl-ctrl--capped');
    wrap.dataset.cap = at.toFixed(2);
    wrap.style.setProperty('--bl-cap', frac.toFixed(4));
  }
}

/* The ONLY setter of a control wrapper's hidden — evaluates the registry's
   predicate against one state snapshot, so every control is decided against
   the same state.

   A SECTION'S visibility is DERIVED here from the controls it holds, never
   declared: a section is hidden when, and only when, every control in it is
   hidden. That adds no second gating mechanism — the decision is made from
   the same `ui` snapshot that decided those controls, so it cannot disagree
   with one — and it means a section can never render as a header opening onto
   nothing. The per-petal drop-downs reach that state under every placement
   but FAN, which is the rule working rather than a claim about today's
   registry. Hiding a section is NOT collapsing it — `hidden` removes it; the
   `open` attribute is the visitor's, and this function never touches it. */
function applyVisibility() {
  const ui = readUI();
  /* A SCOPEABLE CONTROL IS DECIDED ON THE PICKED SCOPE'S OWN STATE (Scoping-b):
     its sub-controls' guards (fringe depth on the count, the lobe shape on the
     depth, the buckle's frequency on its amplitude, curl bias on the curl) are
     read by the geometry on that petal's resolved state, so a layer whose own
     buckle is on shows its frequency while the whole bloom's buckle is 0. Every
     other control is the whole bloom's and is decided on the whole bloom. */
  const vui = scopeView ? viewUi(ui) : ui;
  for (const c of CONTROLS) wrappers[c.id].hidden = !evalPredicate(c.visibleWhen, scopeView && idsFor(scopeView).has(c.id) ? vui : ui);
  /* GREYED, NOT HIDDEN (T3, Q9): a control whose `enabledWhen` is false stays
     on screen, disabled — its value is still read by readUI() and still saved,
     and nothing switches it. This is the ONLY setter of a control's disabled
     state, as the loop above is of hidden. */
  for (const c of CONTROLS) {
    if (c.enabledWhen === undefined) continue;
    const on = evalPredicate(c.enabledWhen, ui);
    wrappers[c.id].classList.toggle('bl-ctrl--disabled', !on);
    inputs[c.id].disabled = !on;
  }
  /* CHILDREN BEFORE PARENTS — ONE PASS, AT ANY DEPTH. A section's answer
     READS its children's, so every child must have settled before its parent
     is reached. verifySections() refuses a section declared before its parent,
     so SECTIONS is a topological order of the tree and walking it BACKWARDS
     settles every descendant before every ancestor — one level or five, with
     no recursion and no second pass. That precedence check is what carries
     this claim (session 3a); before it existed the ordering was a convention
     and this walk was correct by luck.

     A parent holding only child sections has no controls of its own, and
     `every` over an empty set is true, so without the second term it would
     hide itself while its children were on screen. */
  const childrenOf = new Map();
  for (const s of SECTIONS) {
    if (!s.parent) continue;
    if (!childrenOf.has(s.parent)) childrenOf.set(s.parent, []);
    childrenOf.get(s.parent).push(s.id);
  }
  for (let i = SECTIONS.length - 1; i >= 0; i--) {
    const s = SECTIONS[i];
    const noControls = CONTROLS.every((c) => c.section !== s.id || wrappers[c.id].hidden);
    const kids = childrenOf.get(s.id) || [];
    const noKids = kids.every((id) => sectionEls[id].hidden);
    /* A CAPTION SHOWS EXACTLY WHEN ITS REASON HOLDS AND EVERY SECTION THAT
       NAMES IT IS HIDDEN — decided here, once, on the way up: this parent's
       children have already settled (they come later in SECTIONS, so earlier
       in this walk — the precedence check, at any depth), so the caption can
       read them, and a visible caption is content that keeps its parent on
       screen. */
    let noWhy = true;
    for (const [reason, w] of whyEls) {
      if (w.parent !== s.id) continue;
      w.el.hidden = !(evalPredicate(reason.when, ui) && w.sections.every((id) => sectionEls[id].hidden));
      if (!w.el.hidden) noWhy = false;
    }
    sectionEls[s.id].hidden = noControls && noKids && noWhy;
  }
}

document.getElementById('resetBtn').addEventListener('click', () => {
  /* RESET IS A FRESH PAGE (Scoping-b, a decision made without a ruling): the
     pick ends first — it writes nothing — and the scopes record goes with the
     controls, so turning a toggle back on after a reset cannot bring back
     offsets the visitor no longer sees anywhere. Before Scoping-b the record
     was reachable only through a file or a hook and Reset never touched it. */
  selectScope(null);
  scopes = null;
  for (const c of CONTROLS) {
    inputs[c.id].value = DEFAULTS[c.id];
    inputs[c.id].dispatchEvent(new Event('input', { bubbles: true }));
    inputs[c.id].dispatchEvent(new Event('change', { bubbles: true }));
  }
});

/* ===================================================================
   THE SCOPE VIEW (Scoping-b, Eva's rulings — read docs/bloom-scoping-selection.md
   before touching any of it). "Select-and-edit: pick a layer (RADIAL) or a
   petal (FAN); the normal panel now edits just that scope. No instanced rows."
   A layered SPIRAL picks layers too since Eva's ruling of Oct 16 — named as
   TURNS on the picker, the descriptor's own depth.

   THE MODEL IS /plot's, ONE LEVEL DOWN ("A WARP BELONGS TO ITS PETAL"): the
   panel is a VIEW onto the picked scope's entry, and PICKING LOADS AND NEVER
   APPLIES — selecting writes nothing to `scopes`, rebuilds nothing, and the
   picked scope's sliders simply show its effective values; DESELECTING WRITES
   NOTHING either — the offsets stay on their scope. Only a hand moving a
   control (a drag, a typed value, an arrow key — every one arrives as the
   control's own `input` / `change`) writes an offset, and only onto the picked
   scope's own entry. The selection itself is VIEW STATE: not a registry
   control, not in the design file, gone on reload. The two toggles that make
   a picker appear ARE registry controls and are saved, because they decide
   what builds (see the geometry's SCOPE_TOGGLE_VALUES block).

   WHAT A PICKED SCOPE'S SLIDER SHOWS is `clamp(global + offset)`, computed by
   the GEOMETRY'S OWN OWNERS — `scopeOffsetsFor` (which entries reach this
   scope, the pairing law and the toggle gate included) and `resolvePetalTerms`
   (the composition and the one clamp) — never re-derived here, so the panel
   and the builder cannot disagree about a scope's value. The variance field is
   told in the status line, not folded into a number it is not part of.

   A PICKED LAYER OWNS ITS SIZE AND TILT (Q3.5, the role-retirement session):
   once its entry carries an offset on petalLength / petalWidth / petalTilt,
   the blade takes that value and the layer ramps (layerSize / layerTilt) no
   longer apply to it (`SCOPE_LAYER_OWNED`, the geometry's `owns`). Until it
   does, the layer's slider shows the RAMPED value the blade is built with, so
   the number on screen is the number built either way; and an owned offset is
   KEPT at 0 rather than pruned, because pruning it would hand the layer back
   to the ramp under a slider that still reads the whole-bloom value.

   A MIRROR PAIR IS ONE SCOPE (Q3.7): a FAN petal scope is keyed on the pair's
   canonical slot (`scopeSlotKey`), the picker lists pairs, and picking either
   member binds the pair.
   =================================================================== */
/* F6-SCOPE: the outline's mode and curve are bound to a picked layer or pair
   too — as OWNED VALUES (`SCOPE_VALUE_IDS`, the geometry's list), which an
   edit REPLACES rather than offsets (commitScopeValue below). */
const SCOPE_IDS = new Set([...SCOPEABLE_IDS, ...SCOPE_VALUE_IDS]);
/* curves-sepals: a tier's owned values (the sepal twins of the outline's and
   the spine's mode and curve) are values too — written whole, never offset */
const SCOPE_VALUE_SET = new Set([...SCOPE_VALUE_IDS, ...SEPAL_SCOPE_VALUE_IDS]);
/* A SEPAL TIER IS A SCOPE TOO (F1.1a, Q3.8): picking one binds the SEPAL
   controls — the tier-scopeable set the file reader owns — and the Sepals
   section edits that tier. `{ kind: 'tier', layer: k, slot: 0 }`, k 0-based. */
const TIER_IDS = new Set([...SCOPEABLE_TIER_IDS, ...SEPAL_SCOPE_VALUE_IDS]);
/* A BRAID'S STRAND IS A SCOPE TOO (F1.3b — Eva's ruling 3: "pick a strand or
   the bundle and edit what is picked", this picker reused): picking one binds
   the three controls a strand owns (`SCOPE_STRAND_IDS`, the geometry's list) and
   the Androecium section edits that strand; "the bundle" is the whole-bloom
   option, where every androecium control edits the bundle.
   `{ kind: 'strand', layer: i, slot: 0 }`, i the stamen's 0-based index. */
const STRAND_IDS = new Set(SCOPE_STRAND_IDS);
const idsFor = (v) => (v && v.kind === 'tier' ? TIER_IDS : v && v.kind === 'strand' ? STRAND_IDS : SCOPE_IDS);
let scopeView = null;              // { kind: 'layer' | 'petal' | 'tier' | 'strand', layer, slot } — the picked scope; null = the whole bloom
const scopeGlobals = new Map();    // id -> the GLOBAL value's string, while a scope is picked
let lastShown = null;
let lastOrganMesh = null;           // T5: the organs' own emitted triangles, for TX11 (window.__bloomOrganMesh)              // the `shown` record regenerate() last built — a pick relabels from it without a rebuild
const scopeBar = document.getElementById('scopeBar');
const scopePick = document.getElementById('scopePick');
const scopeStatus = document.getElementById('scopeStatus');
const scopeOutlineReset = document.getElementById('scopeOutlineReset');
const scopeSpineReset = document.getElementById('scopeSpineReset');

/* WHICH TOGGLE IS LIVE ON THE WHOLE-BLOOM STATE — the geometry's own predicates. */
function scopeMode(ui) { return scopeLayersLive(ui) ? 'layer' : scopePetalsLive(ui) ? 'petal' : null; }
/* THE TIERS NEED NO TOGGLE: a tier count above one IS the ask (F1.1a). */
function tiersMode(ui) { return sepalTiersEligible(ui) && sepalTierCount(ui) > 1; }
/* THE STRANDS NEED NO TOGGLE EITHER: a built braid IS the ask (F1.3b). */
function strandsMode(ui) { return stamenBraidBuilt(ui); }
const scopeValue = (v) => (v ? `${v.kind}:${v.layer}:${v.slot}` : '');
/* THE SCOPES THIS ARRANGEMENT HAS, from footRing()'s own answers on the build
   on screen (`lastFoot`): its layer count, its slot count and its plane — so
   the picker never counts orbits for itself. */
function scopeOptions(ui) {
  const mode = scopeMode(ui);
  const out = [];
  const sc = lastScopes;
  if (mode) {
    const layers = Math.max(1, Math.round(Number(lastFoot.layerCount) || 1));
    if (mode === 'layer') {
      for (let k = 0; k < layers; k++) {
        const own = sc && sc.scopedLayers && sc.scopedLayers.includes(k);
        /* UNDER A LAYERED SPIRAL A LAYER IS ONE TURN (Eva's ruling, Oct 16): one
           whorl of petals on its own golden-angle sequence, the descriptor's
           own depth — the picker names it so. */
        const spiral = String(ui.placement) === 'SPIRAL';
        const where = layers === 1 ? ' — the whole whorl' : k === 0 ? ` — the outer ${spiral ? 'turn' : 'whorl'}` : k === layers - 1 ? ` — the innermost ${spiral ? 'turn' : 'whorl'}` : '';
        out.push({ kind: 'layer', layer: k, slot: 0, label: `${spiral ? 'Turn' : 'Layer'} ${k + 1}${where}${own ? ' · own values' : ''}` });
      }
    } else {
      const n = lastFoot.slotCount;
      const groups = petalGroupCount(n, lastFoot.mirror);
      for (let k = 0; k < layers; k++) {
        for (let o = 0; o < groups; o++) {
          const own = sc && sc.scopedPetals && sc.scopedPetals.some((p) => p.layer === k && p.slot === o);
          out.push({ kind: 'petal', layer: k, slot: o, label: `${layers > 1 ? `Layer ${k + 1} · ` : ''}Petal ${o + 1} — ${fanGroupSaid(o + 1, ui)}${own ? ' · own values' : ''}` });
        }
      }
    }
  }
  /* THE SEPAL TIERS (F1.1a) — the BUILT tiers, from the builder's own record
     on the build on screen; a tier that was not built (no room, inert) is not
     a scope one can pick, and the Sepal tiers read-out says why. */
  if (tiersMode(ui) && lastSepalsBuilt && lastSepalsBuilt.tiers) {
    const asked = lastSepalsBuilt.tiersAsked;
    for (const T of lastSepalsBuilt.tiers) {
      if (!T.present) continue;
      const own = sc && sc.scopedTiers && sc.scopedTiers.includes(T.tier);
      const where = T.tier === 0 ? ' — the top tier, the whorl above' : T.tier === asked - 1 ? ' — the lowest tier' : '';
      out.push({ kind: 'tier', layer: T.tier, slot: 0, label: `Sepal tier ${T.tier + 1}${where}${own ? ' · own values' : ''}` });
    }
  }
  /* THE STRANDS (F1.3b) — one per BUILT stamen of the braid on screen, from
     the owner's own record; numbered from 1 as the read-out counts them. */
  if (strandsMode(ui) && lastFoot.androecium) {
    for (let i = 0; i < lastFoot.androecium.count; i++) {
      const own = sc && sc.scopedStrands && sc.scopedStrands.includes(i);
      out.push({ kind: 'strand', layer: i, slot: 0, label: `Strand ${i + 1} of ${lastFoot.androecium.count}${own ? ' · own values' : ''}` });
    }
  }
  return out;
}
/* A PICK, CANONICALISED: a petal pick names either member of a pair and binds
   the pair's canonical slot — the key every entry for the pair is summed on. */
function canonicalScope(sel, ui) {
  if (!sel) return null;
  if (sel.kind === 'tier') return tiersMode(ui) ? { kind: 'tier', layer: Math.round(Number(sel.layer) || 0), slot: 0 } : null;
  if (sel.kind === 'strand') return strandsMode(ui) ? { kind: 'strand', layer: Math.round(Number(sel.layer) || 0), slot: 0 } : null;
  const mode = scopeMode(ui);
  if (!mode) return null;
  const layer = Math.round(Number(sel.layer) || 0);
  if (mode === 'layer') return { kind: 'layer', layer, slot: 0 };
  return { kind: 'petal', layer, slot: scopeSlotKey(Math.round(Number(sel.slot) || 0), lastFoot.slotCount, ui) };
}
function scopeIsValid(v, ui) {
  return !!v && scopeOptions(ui).some((o) => o.kind === v.kind && o.layer === v.layer && o.slot === v.slot);
}
/* THE ENTRIES THAT REACH THE PICKED SCOPE, summed, and the scope's effective
   values — through the geometry's owners (see the block header). */
function scopeTermFor(v, ui) {
  const sb = scopesForBuild(scopes);
  if (!sb) return null;
  if (v.kind === 'tier') return sepalTierState(ui, sb, v.layer).term;
  if (v.kind === 'strand') return strandOffsetsFor(sb, v.layer);
  return scopeOffsetsFor(sb, { layer: v.layer, slot: v.slot, n: lastFoot.slotCount, state: ui });
}
function scopeEffective(v, ui) {
  const eff = {};
  if (v.kind === 'strand') {
    /* through the geometry's own owners: the summed entries reaching the
       strand and its clamp into the registry's bound */
    const term = strandOffsetsFor(scopesForBuild(scopes), v.layer);
    for (const id of SCOPE_STRAND_IDS) eff[id] = strandValue(ui, term, id);
    return { eff, term };
  }
  if (v.kind === 'tier') {
    /* through the geometry's own owner of a tier's state (`sepalTierState`):
       the global sepal value plus the tier's offset, clamped into the
       registry's bound the file reader hands down */
    const sb = scopesForBuild(scopes);
    const r = sepalTierState(ui, sb, v.layer);
    for (const id of SCOPEABLE_TIER_IDS) eff[id] = r.state[id];
    /* and the tier's curves — its own where it owns one, else the whole
       bloom's sepal value, live (the resolver's chain, one level) */
    for (const id of SEPAL_SCOPE_VALUE_IDS) eff[id] = r.state[id];
    return { eff, term: r.term };
  }
  const term = scopeTermFor(v, ui);
  const out = term ? resolvePetalTerms(ui, null, null, null, term) : null;
  for (const id of SCOPEABLE_IDS) eff[id] = out && id in out ? out[id] : ui[id];
  /* THE OUTLINE, by its one resolver (F6-scope): the scope's own value, else
     the one it inherits — LIVE, read through the chain at this moment. Shown
     UNMIRRORED: the panel shows the pair's canonical petal (the lower slot),
     whose partner draws it with its halves swapped. */
  const res = resolvePetalValues(ui, term && term.values ? term.values : null, false);
  for (const id of SCOPE_VALUE_IDS) eff[id] = res && id in res.state ? res.state[id] : ui[id];
  /* A LAYER'S UN-OWNED SIZE AND TILT READ AS BUILT — the global through the
     layer ramp (footRing()'s own `scale` / `tiltExtra` on the build on
     screen), so the slider never shows a number the blade is not built with. */
  if (v.kind === 'layer') {
    const r = (lastRings || []).find((x) => Math.round(x.lambda) === v.layer);
    const owns = (term && term.owns) || {};
    if (r) {
      if (!owns.petalLength) eff.petalLength = Number(ui.petalLength) * r.scale;
      if (!owns.petalWidth) eff.petalWidth = Number(ui.petalWidth) * r.scale;
      if (!owns.petalTilt) eff.petalTilt = Number(ui.petalTilt) + r.tiltExtra;
    }
  }
  return { eff, term };
}
function viewUi(ui) { return scopeView ? { ...ui, ...scopeEffective(scopeView, ui).eff } : ui; }
/* THE PICKED SCOPE'S OWN PETAL RECORD for the read-outs that print a built
   number (the buckle's clamp, the lobes' caps, the fringe's ceiling, the
   infill's achieved count): the first emitted petal of that layer / pair, so a
   scope's controls quote that scope's petal rather than ring 0's. */
/* A LIGHT (drag) BUILD CARRIES NO INFILL PLAN, so while a slider is held the
   scope's own last FULL plan is quoted — never `shown.infill`, which is the
   whole bloom's representative (ring 0, slot 0) and so another layer's or
   pair's numbers under a pick (the review's finding: the Cells read-out and
   the cap mark jumped to layer 1's figures for the length of every drag). */
let scopeLastInfill = null;   // { key, infill } — the picked scope's own plan off its last full build
function scopeShown(shown) {
  if (!scopeView || !shown) return shown;
  if (scopeView.kind === 'strand') return shown;
  if (scopeView.kind === 'tier') {
    /* THE PICKED TIER'S OWN RECORD under `sepals`, so every sepal read-out
       (the count's ceiling, the angle's limit, the foot, the size) quotes the
       tier the panel is editing rather than tier 1's. */
    const T = lastSepalsBuilt && lastSepalsBuilt.tiers ? lastSepalsBuilt.tiers.find((x) => x.present && x.tier === scopeView.layer) : null;
    const D = lastFoot.sepalTiers ? lastFoot.sepalTiers[scopeView.layer] : null;
    if (!T || !D || !shown.sepals) return shown;
    return { ...shown, sepals: { ...shown.sepals, ...D, limit: T.limit, attachment: T.attachment, drawnLengthMm: T.built[0] ? T.built[0].length : null, buckle: (T.built[0] && T.built[0].form && T.built[0].form.buckle) || null, unavailable: false, pickedTier: T.tier } };
  }
  const ui = readUI();
  const n = lastFoot.slotCount;
  const p = lastPetalsAll.find((q) => q && Math.round(q.whorl) === scopeView.layer
    && (scopeView.kind === 'layer' || scopeSlotKey(q.slotIndex, n, ui) === scopeView.slot));
  if (!p) return shown;
  const key = scopeValue(scopeView);
  if (!lightOnScreen) scopeLastInfill = { key, infill: p.infill || null };
  const infill = lightOnScreen ? (scopeLastInfill && scopeLastInfill.key === key ? scopeLastInfill.infill : null) : (p.infill || null);
  return { ...shown, buckle: (p.form && p.form.buckle) || null, lobes: p.lobes || null, fringe: p.fringe || null, infill };
}

/* BIND / UNBIND — state and the inputs' DISPLAYED values only; no event, no
   rebuild, no write to `scopes`. Unbinding puts the global values back into
   the inputs exactly as they were taken out. */
function bindScope(next) {
  if (scopeView) { for (const [id, v] of scopeGlobals) inputs[id].value = v; scopeGlobals.clear(); }
  scopeView = next;
  if (!next) return;
  const ids = idsFor(next);
  for (const id of ids) scopeGlobals.set(id, inputs[id].value);
  const { eff } = scopeEffective(next, readUI());
  /* a curve is an object, written whole (the editor's `.value` takes one) */
  for (const id of ids) inputs[id].value = SCOPE_VALUE_SET.has(id) && typeof eff[id] === 'object' ? eff[id] : String(eff[id]);
}
/* SELECT — LOADS, NEVER APPLIES. The read-out spans' SECOND writer (the first
   is regenerate(), which the panel gate's path route reads "a changed span" as
   proof of): a pick moves no geometry, so it must not rebuild, and a span that
   kept the whole bloom's text under a picked scope would be a panel that lies.
   Route (b) never picks, so its witness is untouched. */
function selectScope(sel) {
  const ui = readUI();
  const next = canonicalScope(sel, ui);
  bindScope(next && scopeIsValid(next, ui) ? next : null);
  relabelView();
}
function relabelView() {
  const ui = readUI();
  syncScopeBar(ui);
  applyVisibility();
  refreshLabels(ui, scopeShown(lastShown), scopeView ? viewUi(ui) : null);
  applyCaps(scopeShown(lastShown));
  refreshScopeNotes(ui);
}

/* AN EDIT LANDS ON THE PICKED SCOPE ONLY. A capture listener on the panel runs
   before the control's own `input` / `change` listeners (which then rebuild as
   they always have), so a drag, a typed value (F5 dispatches the same two
   events) and an arrow key all arrive here. The offset written is the one that
   makes the scope's effective value the slider's: `desired - global - (every
   OTHER entry already reaching this scope)`, onto the scope's own canonical
   entry, float noise cut at twelve significant digits (`0.35 - 0.3` is
   0.04999999999999993); an offset that returns to 0 is REMOVED, an entry left
   empty is removed, and a record left with nothing in it is null — so editing
   a value back to the whole bloom's restores the shipped path exactly. */
function commitScopeOffset(id, desired) {
  const ui = readUI();
  const v = scopeView;
  if (!scopes) scopes = { layers: [], petals: [], tiers: [], strands: [] };
  const list = scopeListOf(v);
  /* THE ENTRIES THAT REACH THIS SCOPE, by the geometry's own rule
     (`scopeOffsetsFor`, `tierOffsetsFor`): a layer by its index, a tier by its
     index, a pair by its CANONICAL slot, matched exactly — never re-keyed at
     today's count (see the geometry's `scopeEntryNamesPair`). */
  const reaches = (e) => (v.kind === 'tier' ? e.tier === v.layer : v.kind === 'strand' ? e.strand === v.layer : e.layer === v.layer && (v.kind === 'layer' || e.slot === v.slot));
  let own = list.find(reaches) || null;
  let others = 0;
  for (const e of list) if (e !== own && reaches(e)) others += Number((e.offsets || {})[id]) || 0;
  let d = desired - Number(ui[id]) - others;
  d = Math.abs(d) < 1e-12 ? 0 : +d.toPrecision(12);
  /* AN OWNED LAYER QUANTITY IS KEPT AT 0, never pruned (Q3.5 — see the block
     header): the entry's key IS the ownership. */
  const keepZero = v.kind === 'layer' && SCOPE_LAYER_OWNED.includes(id);
  /* THE TWELVE-DIGIT CUT KEEPS THE FILE TIDY (`0.35 - 0.3` is
     0.04999999999999993) and does not always land the build on the slider's
     own double — global + 0.3 is 0.8999999999999999 against a slider's 0.9 (the
     review measured a third of on-grid edits off by an ulp, one of them a
     knife-edge branch: the infill law's `gamma === 1`). So the cut offset is
     tried in the resolver's own expression (`global + offset`, the scope stage
     of resolveRoleOverrides) first and the raw difference second, and whichever
     makes the scope's effective value the slider's double is written; where
     neither does (duplicate entries for one scope), the tidy one. Route (ae)
     reads the built exponent back off the builder's record. */
  if (d !== 0 && others === 0) {
    const g = Number(ui[id]);
    if (g + d !== desired && g + (desired - g) === desired) d = desired - g;
  }
  if (d === 0 && !keepZero) {
    if (own && own.offsets && id in own.offsets) {
      delete own.offsets[id];
      /* an entry that still OWNS a value (F6-scope) is kept */
      if (!Object.keys(own.offsets).length && !(own.values && Object.keys(own.values).length)) list.splice(list.indexOf(own), 1);
    }
  } else {
    if (!own) { own = newScopeEntry(v); list.push(own); }
    own.offsets[id] = d;
  }
  if (scopesAreEmpty(scopes)) scopes = null;
}
/* AN OWNED VALUE LANDS ON THE PICKED SCOPE'S OWN ENTRY (F6-scope) — the
   outline's mode or curve, REPLACING what the scope inherits ("dragging an
   inherited curve makes it owned at the selected scope, not the parent"). A
   value equal to what the scope would inherit is removed instead, exactly as
   an offset back to 0 is — the scope then inherits again, live. */
function outlineValuesSame(id, a, b) {
  if (isCurveId(id)) {
    const pa = typeof a === 'string' ? JSON.parse(a) : a, pb = typeof b === 'string' ? JSON.parse(b) : b;
    return curveEquals(pa, pb);
  }
  return String(a) === String(b);
}
/* a curve value (the outline's or the spine's) — by the registry row's kind,
   never by a list of names */
function isCurveId(id) { const c = CONTROLS.find((x) => x.id === id); return !!c && c.kind === 'curve'; }
function inheritedOutlineValue(v, id, ui, own) {
  /* a TIER inherits the whole bloom's sepal value — the chain is one level */
  if (v.kind === 'tier') return ui[id];
  const listKey = v.kind === 'layer' ? 'layers' : 'petals';
  const without = scopes ? { ...scopes, [listKey]: (scopes[listKey] || []).map((e) => (e === own ? { ...e, values: undefined } : e)) } : null;
  const sb = without ? scopesForBuild(without) : null;
  const term = sb ? scopeOffsetsFor(sb, { layer: v.layer, slot: v.slot, n: lastFoot.slotCount, state: ui }) : null;
  const res = resolvePetalValues(ui, term && term.values ? term.values : null, false);
  return res && id in res.state ? res.state[id] : ui[id];
}
const scopeListOf = (v) => (v.kind === 'layer' ? scopes.layers : v.kind === 'tier' ? (scopes.tiers || (scopes.tiers = [])) : v.kind === 'strand' ? (scopes.strands || (scopes.strands = [])) : scopes.petals);
function newScopeEntry(v) { return v.kind === 'layer' ? { layer: v.layer, offsets: {} } : v.kind === 'tier' ? { tier: v.layer, offsets: {} } : v.kind === 'strand' ? { strand: v.layer, offsets: {} } : { layer: v.layer, slot: v.slot, offsets: {} }; }
function scopeOwnEntry(v, create) {
  if (!scopes) { if (!create) return null; scopes = { layers: [], petals: [], tiers: [], strands: [] }; }
  const list = scopeListOf(v);
  let own = list.find((e) => (v.kind === 'tier' ? e.tier === v.layer : v.kind === 'strand' ? e.strand === v.layer : e.layer === v.layer && (v.kind === 'layer' || e.slot === v.slot))) || null;
  if (!own && create) { own = newScopeEntry(v); list.push(own); }
  return own;
}
function pruneScopeEntry(own, v) {
  if (own.values && !Object.keys(own.values).length) delete own.values;
  if (!Object.keys(own.offsets || {}).length && !own.values) {
    const list = scopeListOf(v);
    list.splice(list.indexOf(own), 1);
  }
  if (scopesAreEmpty(scopes)) scopes = null;
}
function commitScopeValue(id, value) {
  const ui = readUI();
  const v = scopeView;
  let own = scopeOwnEntry(v, false);
  const inherited = inheritedOutlineValue(v, id, ui, own);
  if (outlineValuesSame(id, value, inherited)) {
    if (own && own.values && id in own.values) { delete own.values[id]; pruneScopeEntry(own, v); }
    return;
  }
  own = scopeOwnEntry(v, true);
  (own.values || (own.values = {}))[id] = isCurveId(id) ? cloneCurve(typeof value === 'string' ? JSON.parse(value) : value) : String(value);
}
/* RESET TO INHERITED (F6-scope): the picked scope's owned outline values are
   removed — its offsets stay — and the scope inherits its parent's outline
   live again. The panel re-binds so the controls show what is inherited.
   PER GROUP (F3-scope): "Outline: reset to inherited" removes the outline's
   two values and "Spine: reset to inherited" the spine's, so a scope owning
   both keeps the one it was not asked to give up (`SCOPE_VALUE_GROUPS`, the
   geometry's own split). */
function resetScopeValues(group) {
  const v = scopeView;
  if (!v) return false;
  const own = scopeOwnEntry(v, false);
  if (!own || !own.values) return false;
  /* a tier's groups are the sepal twins of the same two (curves-sepals) */
  const ids = (v.kind === 'tier' ? SEPAL_SCOPE_VALUE_GROUPS : SCOPE_VALUE_GROUPS)[group].filter((id) => id in own.values);
  if (!ids.length) return false;
  for (const id of ids) delete own.values[id];
  pruneScopeEntry(own, v);
  bindScope(null); bindScope(v);
  relabelView();
  regenerate();
  return true;
}
const resetScopeOutline = () => resetScopeValues('outline');
const resetScopeSpine = () => resetScopeValues('spine');
function onScopedEdit(e) {
  if (!scopeView) return;
  const t = e.target;
  const id = t && t.id;
  if (!id || inputs[id] !== t || !idsFor(scopeView).has(id)) return;
  if (SCOPE_VALUE_SET.has(id)) { commitScopeValue(id, t.value); return; }
  if (!(t instanceof HTMLInputElement)) return;
  commitScopeOffset(id, Number(t.value));
}
panelRoot.addEventListener('input', onScopedEdit, true);
panelRoot.addEventListener('change', onScopedEdit, true);

/* THE SCOPE BAR — page chrome OUTSIDE #panelControls (the panel gate's census
   root holds registry controls and nothing else). Shown iff a toggle is live;
   its option list is rebuilt from the build on screen; a pick that no longer
   names a scope of this arrangement (the layer count fell, the fan lost a
   pair, the toggle went off) ends — writing nothing — and says so by being
   gone. Returns whether the binding changed. */
function syncScopeBar(ui) {
  const mode = scopeMode(ui);
  const tiers = tiersMode(ui);
  const strands = strandsMode(ui);
  scopeBar.hidden = !mode && !tiers && !strands;
  let changed = false;
  if (scopeView && !scopeIsValid(scopeView, ui)) { bindScope(null); changed = true; }
  const opts = scopeOptions(ui);
  const also = (tiers && mode ? ' and tier' : '') + (strands && (mode || tiers) ? ', and the whole bundle' : '');
  const want = [{ value: '', label: mode === 'petal' ? `Whole bloom (every petal${also})` : mode === 'layer' ? `Whole bloom (every layer${also})` : tiers ? `Whole bloom (every sepal tier${strands ? ', and the whole bundle' : ''})` : 'The bundle (every strand)' },
    ...opts.map((o) => ({ value: scopeValue(o), label: o.label }))];
  const have = Array.from(scopePick.options).map((o) => `${o.value}|${o.textContent}`).join('\n');
  if (have !== want.map((o) => `${o.value}|${o.label}`).join('\n')) {
    scopePick.replaceChildren(...want.map((o) => { const el = document.createElement('option'); el.value = o.value; el.textContent = o.label; return el; }));
  }
  scopePick.value = scopeValue(scopeView);
  scopeStatus.textContent = scopeStatusText(ui, mode || (tiers ? 'tier' : strands ? 'strand' : null));
  /* each reset shows iff the picked layer or pair owns a value of ITS group
     (the outline's, the spine's) */
  {
    const own = scopeView ? scopeOwnEntry(scopeView, false) : null;
    const groups = scopeView && scopeView.kind === 'tier' ? SEPAL_SCOPE_VALUE_GROUPS : SCOPE_VALUE_GROUPS;
    const owns = (g) => !!(own && own.values && groups[g].some((id) => id in own.values));
    if (scopeOutlineReset) scopeOutlineReset.hidden = !owns('outline');
    if (scopeSpineReset) scopeSpineReset.hidden = !owns('spine');
  }
  return changed;
}
/* A control's name as the panel prints it — the registry's own label, so the
   status line cannot name a control the panel calls something else (the first
   cut said "Layer size", which the panel labels "Shrink"). */
function controlLabel(id) { const c = CONTROLS.find((x) => x.id === id); return c ? `"${c.label}"` : id; }
function scopeStatusText(ui, mode) {
  if (!mode) return '';
  const tiersToo = (mode !== 'tier' && mode !== 'strand' && tiersMode(ui) ? ' Pick a sepal tier and the Sepals section edits just that tier.' : '')
    + (mode !== 'strand' && strandsMode(ui) ? ' Pick a strand of the braid and the Androecium section edits just that strand.' : '');
  if (!scopeView && mode === 'strand') return 'Pick a strand of the braid and the Androecium section edits just that strand: its length, its radius in the bundle and its own turns, kept as offsets on the bundle\'s values. The bundle (the first option) is every strand: every androecium control edits it.';
  if (scopeView && scopeView.kind === 'strand') {
    const opt = scopeOptions(ui).find((o) => o.kind === 'strand' && o.layer === scopeView.layer);
    const name = opt ? opt.label.replace(/ · own values$/, '') : '';
    return [`Editing ${name}.`, 'Its length, its radius in the bundle and its own turns set its own values; every other androecium control still edits the whole bundle.',
      'A strand wound at another radius or rate crosses the others — that is how a braid is varied.', 'The bundle ends the pick; nothing is lost.'].join(' ');
  }
  if (!scopeView) {
    return (mode === 'layer'
      ? (String(ui.placement) === 'SPIRAL'
        ? 'Pick a turn and the panel edits just that turn of the spiral (one whorl on its own golden-angle sequence): its petal controls then set the turn\'s own values, kept as offsets on the whole-bloom value.'
        : 'Pick a layer and the panel edits just that layer: its petal controls then set the layer\'s own values, kept as offsets on the whole-bloom value.')
      : mode === 'petal' ? 'Pick a petal and the panel edits just that petal and its mirror partner: its petal controls then set the pair\'s own values, kept as offsets on the whole-bloom value.'
      : 'Pick a sepal tier and the Sepals section edits just that tier: its sepal controls then set the tier\'s own values, kept as offsets on the whole-bloom value; sepals within a tier always match.') + tiersToo;
  }
  const opt = scopeOptions(ui).find((o) => o.kind === scopeView.kind && o.layer === scopeView.layer && o.slot === scopeView.slot);
  const name = opt ? opt.label.replace(/ · own values$/, '') : '';
  if (scopeView.kind === 'tier') {
    const T = lastSepalsBuilt && lastSepalsBuilt.tiers ? lastSepalsBuilt.tiers.find((x) => x.present && x.tier === scopeView.layer) : null;
    return [`Editing ${name}.`, 'The marked sepal controls set its own values; every other control still edits the whole bloom.',
      T && T.order && T.order.orderClamped ? `Its height is ORDER-CLAMPED one sheet under tier ${T.order.aboveTier + 1}.` : '',
      T && T.limit && T.limit.clamped ? `Its angle is CLAMPED at ${T.limit.angleBuiltDeg}° against ${T.limit.against}.` : '',
      'Whole bloom ends the pick; nothing is lost.'].filter(Boolean).join(' ');
  }
  const n = lastFoot.slotCount;
  const members = scopeView.kind === 'petal' ? Array.from({ length: n }, (_, i) => i).filter((i) => scopeSlotKey(i, n, ui) === scopeView.slot) : [];
  const parts = [`Editing ${name}.`,
    scopeView.kind === 'petal' && members.length === 2 ? 'Both petals of the pair move together.' : '',
    'The marked controls set its own values; unmarked ones still edit the whole bloom.',
    scopeView.kind === 'layer' && scopeView.layer >= 1 ? `Its length, width and tilt read as built through the layer ramps until you set them; once set they are this ${String(ui.placement) === 'SPIRAL' ? 'turn' : 'layer'}'s own — the blade, and for the width its foot and ring too — and ${controlLabel('layerSize')} and ${controlLabel('layerTilt')} no longer apply to it.` : '',
    Math.abs(Number(ui.varianceForm) || 0) >= 0.005 ? 'The form field still moves each petal\'s curl, cup and twist around these values.' : '',
    'Whole bloom ends the pick; nothing is lost.'];
  return parts.filter(Boolean).join(' ');
}
if (scopeOutlineReset) scopeOutlineReset.addEventListener('click', () => { resetScopeOutline(); });
if (scopeSpineReset) scopeSpineReset.addEventListener('click', () => { resetScopeSpine(); });
scopePick.addEventListener('change', () => {
  const val = scopePick.value;
  if (!val) { selectScope(null); return; }
  const [kind, layer, slot] = val.split(':');
  selectScope({ kind, layer: Number(layer), slot: Number(slot) });
});

/* THE NOTE UNDER A CONTROL WHILE A SCOPE IS PICKED — the global value and the
   offset told beside the scope's effective one (which the slider and its
   read-out show), and a whole-bloom petal control saying it is one and why
   (bloom-file.js's `scopeExclusionReason`, the reader's own words). Not a
   <label>, not a .bl-val: the panel gate counts exactly one of each per
   control. Created on first use; hidden whenever there is nothing to say. */
const scopeNotes = {};
const stepDecimals = (c) => { const s = String(c.step); return s.includes('.') ? s.split('.')[1].length : 0; };
function refreshScopeNotes(ui) {
  const term = scopeView ? scopeTermFor(scopeView, ui) : null;
  const eff = scopeView ? scopeEffective(scopeView, ui).eff : null;
  const name = scopeView ? (scopeView.kind === 'layer' ? `${String(ui.placement) === 'SPIRAL' ? 'Turn' : 'Layer'} ${scopeView.layer + 1}` : scopeView.kind === 'tier' ? `Sepal tier ${scopeView.layer + 1}` : scopeView.kind === 'strand' ? `Strand ${scopeView.layer + 1}` : `Petal ${scopeView.slot + 1}`) : '';
  const ids = idsFor(scopeView);
  for (const c of CONTROLS) {
    const wrap = wrappers[c.id];
    let text = '';
    let cls = null;
    if (scopeView && ids.has(c.id) && SCOPE_VALUE_SET.has(c.id)) {
      /* F6-SCOPE: WHOSE OUTLINE THIS IS — the picked scope's own, or inherited
         (live) from the layer or the whole bloom; a FAN pair's partner draws it
         mirrored. */
      cls = 'scoped';
      const from = term && term.valueFrom ? term.valueFrom[c.id] : null;
      const group = scopeValueGroup(c.id);
      const what = { petalOutlineCurve: 'outline curve', petalOutlineMode: 'outline mode', petalSpineCurve: 'spine curve', petalCurlMode: 'curl mode', sepalOutlineCurve: 'sepal outline curve', sepalOutlineMode: 'sepal outline mode', sepalSpineCurve: 'sepal spine curve', sepalCurlMode: 'sepal curl mode' }[c.id] || c.id;
      const reset = group === 'spine' ? 'Spine: reset to inherited' : 'Outline: reset to inherited';
      const mine = from === scopeView.kind;
      const n = lastFoot.slotCount;
      const pair = scopeView.kind === 'petal' && String(ui.placement) === 'FAN' && Array.from({ length: n }, (_, i) => i).filter((i) => scopeSlotKey(i, n, ui) === scopeView.slot).length === 2;
      text = mine
        ? `${name}: its OWN ${what} — it replaces what it would inherit ("${reset}" in the bar returns it)`
        : `${name}: INHERITED from ${from === 'layer' ? 'its layer' : 'the whole bloom'}, live — it follows that ${what}'s edits; editing it here makes it ${name}'s own`;
      if (pair && c.id === 'petalOutlineCurve') text += ' · the pair\'s other petal draws it MIRRORED (its left and right halves swapped)';
      /* the spine is planar in the midrib plane, so a mirror pair's partner
         draws it unchanged — said, because the outline beside it is mirrored */
      if (pair && c.id === 'petalSpineCurve') text += ' · the pair\'s other petal draws the SAME spine (it lies in the midrib plane, so its mirror image is itself)';
    } else if (scopeView && ids.has(c.id)) {
      cls = 'scoped';
      const off = term && term.offsets && c.id in term.offsets ? term.offsets[c.id] : 0;
      if (off !== 0) {
        const dp = stepDecimals(c);
        const g = Number(ui[c.id]);
        const asked = g + off;
        text = `${name}: ${scopeView.kind === 'strand' ? 'the bundle' : 'whole bloom'} ${g.toFixed(dp)} ${off >= 0 ? '+' : '−'} ${Math.abs(off).toFixed(dp)} offset = ${Number(eff[c.id]).toFixed(dp)}${eff[c.id] !== asked ? ` (clamped from ${asked.toFixed(dp)})` : ''}`;
      }
    } else if (scopeView && scopeView.kind === 'strand') {
      /* under a picked strand every other ANDROECIUM control is the bundle's,
         said with the file reader's own reason */
      const why = wrap && c.section === 'androecium' ? scopeOffsetRefusal(c.id, 'strands') : null;
      if (why) { cls = 'global'; text = `the bundle — ${why}`; }
    } else if (scopeView && scopeView.kind === 'tier') {
      /* under a picked tier the whole-bloom SEPAL values (the count, the tier
         count) say so with the file reader's own reason */
      const why = c.role === 'sepal' ? scopeOffsetRefusal(c.id, 'tiers') : null;
      if (why) { cls = 'global'; text = `whole bloom — ${why}`; }
    } else if (scopeView) {
      const why = scopeExclusionReason(c.id);
      if (why) { cls = 'global'; text = `whole bloom — ${why}`; }
    } else if (c.id === 'petalOutlineCurve' && String(ui.petalOutlineMode) === 'CURVE') {
      /* F6-SCOPE, NOTHING PICKED: say which scopes draw their OWN curve (and so
         do not follow this one), and on a FAN that each pair's other petal
         draws this curve mirrored */
      const owned = [];
      if (scopes && scopeLayersLive(ui)) for (const e of scopes.layers || []) if (e.values && e.values.petalOutlineCurve) owned.push(`${String(ui.placement) === 'SPIRAL' ? 'Turn' : 'Layer'} ${e.layer + 1}`);
      if (scopes && scopePetalsLive(ui)) for (const e of scopes.petals || []) if (e.values && e.values.petalOutlineCurve) owned.push(`${lastFoot.layerCount > 1 ? `Layer ${e.layer + 1} · ` : ''}Petal ${e.slot + 1}`);
      const v = ui.petalOutlineCurve;
      const parts = [];
      if (owned.length) parts.push(`the whole bloom's curve — ${owned.join(', ')} draw${owned.length === 1 ? 's' : ''} ${owned.length === 1 ? 'its' : 'their'} own`);
      if (String(ui.placement) === 'FAN' && v && v.mode === 'two-sided') parts.push('on the fan each mirror pair\'s other petal draws it MIRRORED (left and right halves swapped)');
      if (parts.length) { cls = null; text = parts.join(' · '); }
    } else if (c.id === 'petalSpineCurve' && String(ui.petalCurlMode) === 'CURVE') {
      /* F3-SCOPE, NOTHING PICKED: which scopes bend their OWN spine curve */
      const owned = [];
      if (scopes && scopeLayersLive(ui)) for (const e of scopes.layers || []) if (e.values && e.values.petalSpineCurve) owned.push(`${String(ui.placement) === 'SPIRAL' ? 'Turn' : 'Layer'} ${e.layer + 1}`);
      if (scopes && scopePetalsLive(ui)) for (const e of scopes.petals || []) if (e.values && e.values.petalSpineCurve) owned.push(`${lastFoot.layerCount > 1 ? `Layer ${e.layer + 1} · ` : ''}Petal ${e.slot + 1}`);
      if (owned.length) { cls = null; text = `the whole bloom's spine — ${owned.join(', ')} bend${owned.length === 1 ? 's' : ''} ${owned.length === 1 ? 'its' : 'their'} own`; }
    }
    wrap.classList.toggle('bl-ctrl--scoped', cls === 'scoped');
    wrap.classList.toggle('bl-ctrl--global', cls === 'global');
    let el = scopeNotes[c.id];
    if (!el && text) { el = document.createElement('p'); el.className = 'bl-scope-note'; wrap.append(el); scopeNotes[c.id] = el; }
    if (el) { el.textContent = text; el.hidden = !text; }
  }
}

/* THE HOOK the gates and the sheet read and drive — the same two functions the
   picker calls, never a second path. `select` takes a layer and a slot (either
   member of a pair) or a picker value; `effective` is what the picked scope's
   sliders show, by the geometry's owners. */
window.__bloomScopeView = {
  options: () => scopeOptions(readUI()).map((o) => ({ ...o, value: scopeValue(o) })),
  select: (sel) => { if (typeof sel === 'string') { const [kind, layer, slot] = sel.split(':'); sel = { kind, layer: Number(layer), slot: Number(slot) }; } selectScope(sel); return scopeView ? { ...scopeView } : null; },
  deselect: () => { selectScope(null); return null; },
  bound: () => (scopeView ? { ...scopeView } : null),
  globals: () => Object.fromEntries(scopeGlobals),
  effective: () => (scopeView ? scopeEffective(scopeView, readUI()).eff : null),
  bar: () => ({ hidden: scopeBar.hidden, value: scopePick.value, options: Array.from(scopePick.options).map((o) => ({ value: o.value, label: o.textContent })), status: scopeStatus.textContent }),
};

/* ---------------- scene ---------------- */
const canvas = document.getElementById('bloom-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0f0e);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);
/* THE ORBIT AXIS BUG (Eva, Sep 2 — "feels really difficult... like it's
   fighting against me"), root-caused rather than guessed at. OrbitControls
   captures its orbit-math pole from `object.up` ONCE, inside an IIFE at
   construction time (three.js's own OrbitControls.js: `this.update =
   (function () { const quat = Quaternion().setFromUnitVectors(object.up,
   Vector3(0,1,0)); ...; return function update() {...}; })()`) — it is NOT
   re-read on later frames even though `camera.up` itself can still be
   reassigned afterward for rendering. `camera.up` defaults to three.js's
   own (0,1,0) until fitCamera() first runs and sets it to (0,0,1) — but
   fitCamera only runs inside regenerate(), AFTER `new OrbitControls(...)`
   below had already captured the WRONG pole (Y) as this app's model is
   Z-up throughout (buildPetalInto's own R/T/Z frame). Measured directly
   (a probe exposing camera/controls to a headless page): a purely
   horizontal drag moved Y not at all and rotated X/Z instead of X/Y, and a
   vertical drag drove the camera toward alignment with the Y axis rather
   than tilting over the bloom — orbiting a pole that has nothing to do
   with what is on screen, which is exactly what reads as fighting/hitting
   a wall. The fix is ORDER: set camera.up to this app's real vertical
   BEFORE OrbitControls captures it, not after. */
camera.up.set(0, 0, 1);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.autoRotate = document.getElementById('autoRotate').checked;
controls.autoRotateSpeed = 1.2;
document.getElementById('autoRotate').addEventListener('change', (e) => {
  controls.autoRotate = e.target.checked;
});
let userMoved = false;
/* True only between a FAN placement-snap and whatever ends it — a manual
   orbit, a manual VIEW-dropdown pick, or leaving FAN. While true, every
   rebuild re-centres the (already top-down) camera on the model's fresh
   bounding-sphere centre — see recenterFanView(). It is a NARROWER flag
   than `userMoved`: `userMoved` means "the automatic default fit is the
   user's to drive now" and is permanent once set (existing behaviour,
   unchanged); this one means "still actively holding the FAN's own snap",
   and either a drag or a fresh preset pick ends it without touching
   `userMoved`. */
let fanViewLocked = false;
controls.addEventListener('start', () => {
  userMoved = true;
  fanViewLocked = false;
  if (viewTween) { controls.autoRotate = document.getElementById('autoRotate').checked; viewTween = null; }
});

scene.add(new THREE.HemisphereLight(0xdfefe6, 0x1a221e, 1.1));
const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(60, 40, 90);
scene.add(key);

const material = new THREE.MeshStandardMaterial({ color: 0xc9dfd2, roughness: 0.62, metalness: 0.05 });
let mesh = null;

const DEG = Math.PI / 180;   // VIEW_PRESETS' distances are fov-aware (radius/tan(fov/2)), not a bare radius*k

/* THE ONE OWNER of "frame a sphere of this radius". The automatic fit and the
   contact sheet's centre zoom are the same operation at two radii, so they are
   the same function; a screenshot tool re-deriving the projection would be a
   second copy of the camera rule, which is this project's most repeated
   defect wearing a lens. `lift` raises the orbit target off the origin — the
   whole-bloom view looks slightly up into the whorl, a centre crop looks
   straight at the hub plane. */
/* `up` IS EXPLICIT NOW, AND DEFAULTED SO NOTHING MOVES (session B, Sep 2).
   Every existing caller omits it and gets [0,0,1] — the value this function
   has always hardcoded — so every sheet taken before today frames identically.

   WHY IT WAS WORTH ADDING. Looking straight down the axis passes
   dir = [0,0,1] with up = [0,0,1], which are PARALLEL: the camera's roll is
   then whatever three.js's degenerate fallback picks, so "face-on" has never
   had a defined orientation in this codebase. That did not matter while every
   bloom was radially symmetric — one roll is as good as another. It matters
   the moment the flower has a FACE: a zygomorphic bloom read face-on has an
   up and a down, and the sheet that shows the labellum below and the hood
   above must be able to say so rather than hope. */
function fitCamera(radius, lift = 0.15, at = null, dir = null, up = null) {
  /* The axis-framing path is byte-for-byte the original: a single-petal crop
     is a NEW capability, and widening a signature must never move the shot
     every existing sheet was taken with. The 40 mm distance floor belongs to
     that path only — it keeps a tiny bloom from being framed absurdly close,
     and it would otherwise stop a petal crop ever getting close enough to
     read an outline. */
  if (!at) {
    const d = Math.max(40, radius * 2.6);
    camera.position.set(d * 0.75, -d * 0.75, d * 0.6);
    camera.up.set(0, 0, 1);
    controls.target.set(0, 0, radius * lift);
    return;
  }
  /* Targeted framing, optionally along a given view direction. A SILHOUETTE
     is an outline, and an outline seen at three-quarters is foreshortened —
     so the silhouette sheet asks to look down the petal's own normal, which
     the builder reports. The direction is normalised here so `radius` means
     the same distance whichever way the camera is pointing. */
  const d = radius * 2.6;
  const v = dir || [0.75, -0.75, 0.6];
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  camera.position.set(at[0] + (v[0] / n) * d, at[1] + (v[1] / n) * d, at[2] + (v[2] / n) * d);
  camera.up.set(...(up || [0, 0, 1]));
  controls.target.set(at[0], at[1], at[2]);
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/* ---------------- build ---------------- */
const readout = document.getElementById('readout');
let shownSummary = '';   // the read-out for whatever geometry is on screen, in that geometry's mode

/* ===================================================================
   THE PRINT-PREVIEW TOGGLE (Eva, Sep 3 — unparked from the charter, where it
   sat since the thickness layer), and `shownMode()` is THE ONE OWNER of
   "which geometry is on screen".

   A VIEW CONTROL, NEVER A GEOMETRY CONTROL. It is a raw DOM reference in the
   VIEW box exactly like `autoRotate` and `viewPreset`: not in `inputs`, not a
   CONTROLS row, invisible to readUI(), DEFAULTS, reset, fullStateDrift and
   every gate that reads UI state. Checked, regenerate() builds the viewport
   from an EXPORT-mode accumulator — the sheet, tip and foot floored at
   MIN_FEATURE_MM and the ring re-derived by the area rule from the floored
   feet — which is the object the printer will make. At three-figure petal
   counts that is the difference between a render with visible gaps and a
   print with none (Eva's mum run: 120 feet at 1.60 mm on a 3.63 mm ring live
   against 4.69 mm printed).

   THE EXPORT BYTES CANNOT MOVE WITH IT, and the argument is structural rather
   than a measurement that happened to come out clean: the Get STL handler
   builds `buildGeometry({ exportMode: true })` from readUI(), and this box is
   not in readUI(). There is no branch in the export path that can observe
   it. What the toggle DOES change is the telemetry cache — see
   buildGeometry's `record` — so an export click can never overwrite what is
   on screen and the export build can never be mistaken for the live one.
   Both STL gates assert the shown mode is LIVE on every row (every "(live)"
   label they print depends on it), and the panel gate flips the real box and
   requires the exports on either side of it byte-identical.

   EVERY CONSUMER READS THIS FUNCTION: regenerate(), the read-out's first
   line, the print-truth pair's on-screen marker, and __bloomMetrics()'s
   `shownMode`. A second reading of the checkbox anywhere would be a second
   owner of the one boundary this control is about. */
/* ALWAYS ON SINCE F7 (Eva's ruling; docs/bloom-print-preview-always-on.md).
   The box is CHECKED and HIDDEN in bloom.html — not deleted — so this
   function and every reader above are unchanged, the box can be unhidden
   later, and the gate harness unchecks it at page load so the gates that
   measure LIVE geometry keep measuring it. No saved design carries it: it was
   never a registry row and the bloom persists no design. */
const printPreviewInput = document.getElementById('printPreview');
function shownMode() { return printPreviewInput && printPreviewInput.checked ? 'export' : 'live'; }
let lastShownMode = 'live';

/* THE DRAG PREVIEW (F7, Eva's ruling: candidate A). While a slider is HELD,
   the viewport builds the same geometry WITHOUT THE INFILL CELLS — the one
   cost a drag can shed, measured at 12.3 s -> 1.0 s on the infill cost
   corner and nothing worth having anywhere else — and on release it builds
   the full geometry again. Exports never see any of this: both export
   handlers build from readUI() alone.

   THREE RULES, and each is load-bearing:
   - A DRAG IS A POINTERDOWN ON A RANGE INPUT, UNTIL POINTERUP / POINTERCANCEL
     / A 'change' ON A RANGE / THE WINDOW LOSING FOCUS. A typed value (F5) and
     a keyboard nudge fire input+change with no pointerdown on the slider, so
     they can never enter the drag state: they build full, directly.
   - THE KIND OF A BUILD IS DECIDED WHEN IT RUNS, NOT WHEN IT WAS QUEUED.
     regenerate() reads `dragActive` itself, so a queued build that a drag
     overtakes builds light, and a queued light build that a release
     overtakes builds full. A build cannot be interrupted once running (one
     thread), so "supersede the queued build and read the controls at run
     time" is the guarantee, ruled acceptable in place of cancellation.
   - A LIGHT BUILD IS NEVER LEFT ON SCREEN. Release schedules a rebuild
     whenever a light build is on screen or one is queued; the queued one
     reads `dragActive === false` and builds full.
   A design with no infill has nothing to shed, so its drag build IS the full
   build: `dragLight()` is false there and nothing about it changes. */
let dragActive = false;
let lightOnScreen = false;
let lightBuildCount = 0;   // how many light builds this page has made — the drag-preview gate's witness
/* (T3) A HELD SLIDER DROPS THE TEXTURE TOO (Eva's ruling 4: a light preview
   while dragging, the full relief on release and in the export) — the same
   override, one more guard. */
const DRAG_LIGHT_OVERRIDE = Object.freeze({ petalInfill: 'NONE', petalTexture: 'NONE' });
/* (the page profile, Oct 27 — docs/bloom-page-profile-outcome.md) A HELD
   SLIDER ALSO DEFERS THE INFLORESCENCE'S REPORTS: the umbel's pitch floor and
   the placement pass's flags are report-only (nothing built reads them; the
   geometry's `deferReports`), measured 64% of the spider lily's build and
   ~29% of the mophead's. So a design with an inflorescence has something to
   shed too, its drag build carries those reports as null, and the release
   rebuilds them — the same bargain as the infill, and the bytes on screen are
   the full build's (D10). */
function dragLight() { const ui = readUI(); return dragActive && (!infillIsAbsent(ui) || !textureIsAbsent(ui) || !inflorescenceIsAbsent(ui)); }

let lastRing = { radius: 0, derivedRadius: 0 };   // ring 0 — what every pre-layer consumer read
let lastRings = [];                               // every ring, in build order
let lastScopes = null;                            // the scopes the build on screen was handed (Scoping-a), the builder's own summary
let lastHub = { radius: 0, thickness: 0 };
let lastFoot = { guardResidual: null, layerCount: 1, continuousMode: false, sequenceLength: 0, quantizerResiduals: null, fan: null, mirror: null, slotCount: 0, petalGroupCount: null, sphereMode: false };
let lastHubBuilt = { dome: null, tris: 0 };            // what buildHubInto actually built — J3 reads it against the feet
/* THE STEM (session 43) — the plan its ONE owner made and what the builder
   emitted from it. ST0-ST6 read these; the read-out prints the two lengths. */
let lastStem = null, lastStemTris = 0, lastFootDigest = 0, lastStemBuilt = null, lastStemAbsent = true, lastStemNodesAbsent = true, lastStemCutAbsent = true;
let lastLeaf = null, lastLeavesBuilt = null, lastLeafAbsent = true, lastLeafTris = 0;
/* (Bloom P1) the geometry's half of the node controls' two statements — NS0 */
let lastNodeLive = { run: false, spacing: false, taper: false };
/* THE SEPALS (part 1) — footRing()'s descriptor (the ring, the count and its
   ceiling, the phase, the foot), the builder's own emitted whorl and the angle
   limit it drew. SP0-SP9 read these; the read-out prints them. */
let lastSepals = null, lastSepalsBuilt = null, lastSepalsAbsent = true, lastSepalTris = 0, lastSepalsAskedUnderSphere = 0, lastSepalTiersEligible = false;
/* THE INFLORESCENCE (this session) — the PLAN and what the BUILDER emitted,
   the leaf's own pairing. `inflorescence` is NULL and not absent where there
   is none: ID1 distinguishes "the builder says there are none" from "the
   builder says nothing", and a missing key is the second. The builder's
   record carries `unitPositions` (the floret unit's own triangle stream) and
   the hook deliberately does NOT — see the projection below, where the reason
   is written down: the claim it would serve is already a MEASURED zero the
   builder reports as `placementResidual`, by a second expression beside the
   method under test. */
let lastInflo = null, lastInfloBuilt = null, lastInfloAbsent = true, lastInfloTris = 0, lastUmbelHeadAbsent = false, lastUmbelCompound = false, lastHeadLattices = null;
let lastNodeVarianceAbsent = true;
/* THE SPHERE'S STEM CHANNEL (the sphere-stem session) — which slots were NOT
   built, and how near the stem every one of them came. Null wherever the
   question does not arise (no stem, or not a sphere), never a passing 0. */
let lastStemOmission = null;
let lastFootBySlot = [];
/* THE FOOT FRAMES' DIGEST — ST6's measured side. A stemmed and a stemless build
   of the SAME state must agree here exactly, which is the whole of "the
   hub-to-stem join does not change the petal-to-hub junction". One function
   makes both numbers, which is right: the digest is a MEASUREMENT METHOD and
   the two sides are two different BUILDS, so the owners that differ are the
   ones that matter. */
function footFramesDigest(built) {
  let h = 0;
  /* A DESCRIPTOR WHOSE PETAL WAS NOT BUILT HAS NO FOOT FRAME, and `petals`
     carries a null there so the array stays index-matched to `fr.rings`. ST6
     compares this against a STEMLESS build, where nothing is omitted, so a
     stemmed sphere and its stemless twin legitimately have different
     POPULATIONS — which is why the per-slot list below exists and why ST6 and
     ST8 read that instead of this scalar wherever any slot was omitted. */
  for (const p of (built.petals || [])) for (const f of ((p && p.footFrames) || [])) {
    for (const v of [...f.C, ...f.N, ...f.T, f.h, f.t]) { h = (h * 31 + (Number.isFinite(v) ? v : 0)) % 1e15; }
  }
  return h;
}
/* THE SAME DIGEST, ONE PER SLOT — null where no petal was built. This is what
   makes "the omission does not renumber" checkable: slot 4's foot frame must be
   the SAME NUMBER with the stem and without it, whatever happened to slot 3.
   One function for both builds again, for footFramesDigest's own reason: the
   digest is a measurement METHOD and the two sides are two different BUILDS. */
function footFramesBySlot(built) {
  return (built.petals || []).map((p) => {
    if (!p || !p.footFrames) return null;
    let h = 0;
    for (const f of p.footFrames) for (const v of [...f.C, ...f.N, ...f.T, f.h, f.t]) {
      h = (h * 31 + (Number.isFinite(v) ? v : 0)) % 1e15;
    }
    return h;
  });
}
let lastPetal = null;                             // layer 0's petal — likewise
let lastPetals = [];
/* THE BUILDER'S OWN TALLY of buildPetalInto calls — Z1's independent
   quantity, so the role partition is checked against what was BUILT rather
   than against another number the same owner produced. */
let lastPetalsBuilt = 0;
/* EVERY SLOT'S AZIMUTH, one row per whorl — the input to J7 and Z4b, and new
   in the fan session because nothing here had ever recorded a position around
   the axis. See buildBloomInto's own note: before this existed, both STL
   gates, every J-assertion and every Z-assertion were azimuth-blind, so a fan
   that silently built a full ring would have passed all of them at an
   identical triangle count and STL byte length. */
let lastSlotAzimuths = [];
/* THE ANDROECIUM (session 21): footRing()'s descriptor, the builder's own
   per-stamen emission records, its free-end tally and the two distance
   flags — the inputs of JS1-JS4 and of the read-out's STAMENS line. */
let lastAndroecium = null, lastStamens = [], lastFreeEnds = 0, lastStamenNearest = null;
/* THE GYNOECIUM (session 22): footRing()'s third descriptor and the
   builder's own style record (root axis, root rings, tip, the three lobes)
   — the inputs of JG1-JG4 and of the read-out's STYLE line. */
let lastGynoecium = null, lastStyles = [];
/* THE FILAMENT-AGAINST-STYLE RECORD (session 23) — buildBloomInto's own
   nearest approach of a filament station to the style's centreline, null
   unless both parts are built; the STAMENS line's flag reads it. */
let lastFilamentStyle = null;
/* THE PLACEMENT THE BUILD WAS MADE FROM — the registry control's value, kept
   beside footRing()'s own `fan` record so J7 can cross-check the two. They
   are genuinely two owners of one boundary (the registry owns the option
   list; footRing() branches on it), which is the same relation Z5 already
   checks for slot-role eligibility, and the same remedy: assert they agree on
   every row rather than comment that they do. */
let lastPlacement = 'RADIAL';
let lastTris = 0, lastMaxDim = 0, lastFitRadius = 0;
let lastTipRowBudget = null;
let lastFitCenter = [0, 0, 0];
/* ORGANIC VARIANCE (build 1, size): the builder's own field record (null at
   amount 0, the guard) and the TOLD FLAG — the neighbour figures every
   recorded build carries (ruling 1: reported, never clamped). */
let lastTube = null;
let lastVariance = null, lastNeighbour = null, lastVarianceAbsent = true, lastPetalsAll = [];
let lastFormVariance = null, lastFormAbsent = true;
let lastSpacingVariance = null, lastSpacingAbsent = true;
let lastInfill = null, lastInfillAbsent = true;
/* THE SURFACE TEXTURE (T3): the builder's whole-bloom record and the guard's own answer */
let lastTexture = null, lastTextureAbsent = true;

/* THE NON-SHIPPING PETAL-MODEL OVERRIDE. null in every reachable state:
   there is no registry row, no DOM input, and no listener that writes it —
   window.__bloomCapability (below) is the only writer, and only the gates
   and the contact sheet call it. It exists so "architected for claw and
   cleft" is a thing the gates BUILD and MEASURE rather than a sentence in a
   header. Because it is not a control, the gates' whole-state read-back is
   unaffected: their fullStateDrift still compares every registry control
   against DEFAULTS + set, and this is invisible to it — which is why the
   capability rows carry their OWN read-back assertion. */
let capability = null;
/* THE SCOPES (Scoping-a) — the design file's `overrides` record as loaded, or
   as the `__bloomScopes` hook set it; null on every shipped state. NO CONTROL
   WRITES IT. It reaches the builder as `scopes` (bloom-file.js's scopesForBuild
   adds the registry's bounds) and the next save writes it back verbatim. */
let scopes = null;

/* `record` — whether this build is THE ONE ON SCREEN, and therefore the one
   the telemetry cache, the read-out and __bloomMetrics() describe. Until the
   print-preview toggle this was `!exportMode`, which was the same thing while
   only regenerate() built live and only the export handler built floored.
   It is not the same thing any more: a previewed build is export-mode AND on
   screen, and an export click during a preview is export-mode and NOT. Keying
   the cache off the mode would let the Get STL build overwrite what the
   viewport shows — the mislabelled-telemetry mutant (T2) the crowding
   instrument's R2 catches on every floor-binding row — so the caller says
   which build it is making, and only regenerate() says `record: true`. */
/* `captureGrid` (session 28) is OFF for every existing caller and is read by
   nothing that decides geometry — see MeshBuilder's own note. It is threaded
   through here rather than given its own build function so that the grid
   export and the STL export are the same build, made the same way, from the
   same readUI() snapshot; a second builder would be a second owner of "what
   the app is showing". */
/* `captureNormals` — Eva's ruling on the bead's shading, and it is ON for the
   VIEWPORT'S OWN BUILD and off for both export paths. The STL writes its own
   per-facet normal and the grid export writes line strips, so neither reads
   this; what it would cost them is an array the size of the positions on a
   build that can reach millions of triangles. It moves no position — asserted
   by E7 of tools/verify-bloom-edge-profile.mjs, not argued here. */
/* SMOOTH SHADING IN THE NORMAL VIEW ONLY (Eva's ruling): the LIVE viewport
   now shades from a creased-normal reconstruction rather than a flat
   per-triangle one; PRINT PREVIEW is not creased, because print preview
   exists to show what prints, and smoothing hides a real 0.7-0.9 mm facet as
   convincingly as fixing it would — it shades the rim bead from the builder's
   own closed-form normals and every other facet flat (see buildGeometry). `toCreasedNormals`
   is still imported as `three/addons/utils/BufferGeometryUtils.js` — the
   normal `three/addons/` specifier every other addon here uses — but that
   ONE exact specifier is pinned in `bloom.html`'s importmap to
   `bloom-vendor/BufferGeometryUtils.js`, a local, byte-for-byte copy of
   `three@0.161.0`'s own file (the exact version this project already
   ships), rather than fetched from the CDN at runtime. It is NOT the copy
   in `dress/vendor/` — that belongs to a different project in this repo and
   is a newer, materially different three.js version; the bloom page must
   not depend on it. See `bloom-vendor/BufferGeometryUtils.js`'s own header.

   THE CREASE ANGLE IS DERIVED FROM THIS MODEL'S OWN MEASURED GEOMETRY, not
   the library's own default (which happens to agree, but that is not why it
   was picked). A dihedral-angle census over a single isolated petal
   (`petalCount: 1`, tip shape 3.00, the worst case) splits cleanly into three
   populations: the tip's own facet — the thing this is FOR — never exceeds
   44.8 degrees anywhere in the region; the rim bead's four 45-degree segments
   sit at a 40-45 degree cluster; and the foot-to-blade SEAM — a real
   architectural fold, not a faceting artefact — sits at 80-95 degrees with
   nothing between 55 and 80. So ANY angle in (45, 80) smooths every facet
   this feature exists to fix and every rim-bead segment transition (which
   the closed-form normal already smoothed by a different, exact route — this
   reproduces that by approximation rather than displacing it) while leaving
   the seam's real fold untouched. 60 degrees sits in the middle of that
   15-70 degree margin on both sides. */
const SMOOTH_SHADING_CREASE_DEG = 60;
/* `override` (F7) — fields laid over readUI() for THIS build only; the drag
   preview's DRAG_LIGHT_OVERRIDE is its one caller. The export handlers never
   pass it. */
/* `deferReports` (the page profile) — the held-slider build's report deferral,
   passed by regenerate() on a light build and by nothing else. */
function buildGeometry({ exportMode, record = false, captureGrid = false, captureNormals = false, override = null, deferReports = false }) {
  const acc = new MeshBuilder({ exportMode, captureGrid, captureNormals });
  const uiForBuild = override ? { ...readUI(), ...override } : readUI();
  const built = buildBloomInto(acc, uiForBuild, { below: null, capability, scopes: scopesForBuild(scopes), ...(deferReports ? { deferReports: true } : {}) });   // 'stem' | 'branch' | null — null is phase 1's only state
  if (record) {
    lastShownMode = exportMode ? 'export' : 'live';
    lastPlacement = uiForBuild.placement;
    lastRing = built.ring; lastRings = built.rings; lastHub = built.hub; lastFoot = built.foot;
    lastScopes = built.scopes ?? null;
    lastPetal = built.petal; lastPetals = built.petals; lastHubBuilt = built.hubBuilt;
    lastPetalsBuilt = built.petalsBuilt; lastSlotAzimuths = built.slotAzimuths;
    lastTube = built.tube || null;
    lastVariance = built.variance || null; lastNeighbour = built.neighbour || null;
    /* THE GEOMETRY'S OWN ANSWER TO "IS THE SIZE FIELD ABSENT HERE", on the
       state this build was made from — VS0's half, through the page (ST0's
       and ID0's route). And every EMITTED petal, for VS2's per-slot record. */
    lastVarianceAbsent = varianceIsAbsent(uiForBuild);
    /* BUILD 2: the FORM field's record and the geometry's own guard answer (FV0). */
    lastFormVariance = built.formVariance || null;
    lastFormAbsent = varianceFormIsAbsent(uiForBuild);
    /* BUILD 3: the SPACING field's record and the geometry's own guard answer (SV0). */
    lastSpacingVariance = built.spacingVariance || null;
    lastSpacingAbsent = varianceSpacingIsAbsent(uiForBuild);
    /* THE INFILL, from the FIRST BUILT PETAL's own plan record — the one the
       read-out's INFILL line speaks and route (z) holds it to. Taken off a
       petal rather than off `built` because the plan is a property of a BLADE
       (a sepal is the petal builder on a second ring and is pinned off, and a
       lobed blade refuses where a plain one does not), and `petalsAll` can be
       EMPTY where every slot is omitted — the slot-omission class this project
       already names, so the `?.` is load-bearing and not a tidiness. */
    lastInfill = (built.petalsAll && built.petalsAll[0] && built.petalsAll[0].infill) || null;
    lastInfillAbsent = infillIsAbsent(uiForBuild);
    lastTexture = built.texture || null;
    lastTextureAbsent = textureIsAbsent(uiForBuild);
    /* THE ORGANS' EMITTED TRIANGLES (T5) — the hub's, the stem's and each tube
       ring's, as this build emitted them, so TX11 can read what the PAGE moved
       rather than what a Node rebuild moves. Null on every untextured build. */
    lastOrganMesh = null;
    if (built.texture && built.texture.organs) for (const [k, r] of Object.entries(built.texture.organs)) {
      if (!r.organ) continue;
      lastOrganMesh = lastOrganMesh || {};
      lastOrganMesh[k] = r.organ.triRanges.map(([a, b]) => ({ from: a, to: b, positions: acc.positions.slice(a * 9, b * 9) }));
    }
    lastPetalsAll = built.petalsAll || [];
    builtPetalWidth = Number(uiForBuild.petalWidth);   // what a refused width drag goes back to (F6-sym-2)
    builtCup = { petalCup: Number(uiForBuild.petalCup), petalCupGradient: Number(uiForBuild.petalCupGradient) };   // what a refused cup goes back to (spine-cup-fold)
    lastAndroecium = built.androecium; lastStamens = built.stamens; lastFreeEnds = built.freeEnds; lastStamenNearest = built.stamenNearest;
    lastGynoecium = built.gynoecium; lastStyles = built.styles;
    lastFilamentStyle = built.filamentStyle;
    lastStem = built.stem && built.stem.present ? built.stem : null;
    lastStemTris = built.stemBuilt ? built.stemBuilt.tris : 0;
    lastStemBuilt = built.stemBuilt || null;
    lastStemOmission = built.stemOmission || null;
    /* THE GEOMETRY'S OWN ANSWER TO "IS A STEM ABSENT HERE", on the state this
       build was made from. ST0 needs the answer the RUNNING module gave; see
       __bloomMetrics. */
    lastStemAbsent = stemIsAbsent(uiForBuild);
    lastStemNodesAbsent = stemNodesAbsent(uiForBuild);
    lastStemCutAbsent = stemCutAbsent(uiForBuild);
    /* LEAVES — LF0-LF7's measured side. `leaf` is NULL and not absent where
       there are none: LF1 distinguishes "the builder says there are none" from
       "the builder says nothing", and a missing key is the second. The
       per-leaf records come from the BUILDER, never from the plan beside it —
       LF2 and LF3 ask what came OUT, and a mutation that offsets what it emits
       leaves the plan saying the right thing (session 43's ST2). */
    lastLeaf = built.leaf && built.leaf.present ? built.leaf : null;
    lastLeavesBuilt = built.leavesBuilt || null;
    lastLeafTris = (built.leavesBuilt || []).reduce((n, r) => n + r.tris, 0);
    lastLeafAbsent = leafIsAbsent(uiForBuild);
    lastNodeLive = { run: leafNodeRunLive(uiForBuild), spacing: leafNodeSpacingLive(uiForBuild), taper: leafSizeTaperLive(uiForBuild) };
    lastSepals = built.foot.sepals || null;
    lastSepalsBuilt = built.sepals || null;
    lastSepalTris = built.sepals ? built.sepals.tris : 0;
    lastSepalsAbsent = sepalsAbsent(uiForBuild);
    lastSepalTiersEligible = sepalTiersEligible(uiForBuild);
    lastSepalsAskedUnderSphere = built.foot.sphereMode ? Math.round(Number(uiForBuild.sepalCount) || 0) : 0;
    lastInflo = built.inflorescence && built.inflorescence.present ? built.inflorescence : null;
    lastInfloBuilt = built.inflorescenceBuilt || null;
    lastInfloTris = built.inflorescenceBuilt ? built.inflorescenceBuilt.tris : 0;
    lastInfloAbsent = inflorescenceIsAbsent(uiForBuild);
    lastUmbelHeadAbsent = umbelHeadIsAbsent(uiForBuild);
    lastUmbelCompound = umbelIsCompound(uiForBuild);
    /* every HEAD petal's lattice record (the mophead's UM6, its non-floret half) */
    lastHeadLattices = (built.petalsAll || []).filter(Boolean).map((p) => (p.lattice ? { ...p.lattice } : null));
    lastNodeVarianceAbsent = nodeVarianceIsAbsent(uiForBuild);
    lastFootDigest = footFramesDigest(built);
    lastFootBySlot = footFramesBySlot(built);
    lastTris = acc.triangleCount; lastMaxDim = acc.maxDimensionMm;
    /* THE APEX ROW RAMP'S OWN BUDGET DECISION, from the builder — null on a
       nested (per-floret) build and on any build where nothing was
       ramp-eligible at all, which the read-out treats as "nothing to say". */
    lastTipRowBudget = built.tipRowBudget || null;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(acc.positions, 3));
  /* THE BUILDER'S NORMALS WHERE IT HAS THEM, AND computeVertexNormals() WHERE
     IT DOES NOT. The buffer is NON-INDEXED, so computeVertexNormals() is a
     FLAT normal per triangle — which is right for every hard edge this solid
     has and wrong for the rim bead, whose facets then read as discrete
     shading bands at about a fifth of a millimetre. The builder emits the
     bead's own normal in closed form (see MeshBuilder's captureNormals note);
     every other triangle carries the same flat normal this line computed
     before, so nothing else on the model changes appearance. */
  if (exportMode) {
    /* PRINT PREVIEW IS NOT FLAT, AND THIS COMMENT USED TO SAY IT WAS.
       Measured in the real page: print preview hands three.js the BUILDER'S
       closed-form bead normals (`captureNormals`) — 79,584 of 113,424
       triangles on the infilled default carry a vertex normal off their own
       face, 8,160 of 24,688 on the shipping default. What print preview does
       NOT do is `toCreasedNormals`: every triangle the builder gave no normal
       (skins, walls, anything but a rim bead) keeps the flat per-facet normal
       `computeVertexNormals()` gives a non-indexed buffer, so a real facet on
       a skin still reads as one — which is Eva's ruling on why print preview
       is not creased. The STL carries no normal channel a slicer reads.
       KNOWN, NOT FIXED: on the shipping default 1,872 rim triangles (20.1 mm²)
       carry a vertex normal more than 60 degrees off their face, worst 89.6 —
       every one at the petal's two ENDS (the tip's pivot fans and strips, and
       the foot-to-blade ramp), where the bead's size changes from one profile
       to the next and `rimProfile`'s closed form, by its own declaration,
       leaves out the along-sweep term. A shading artefact; no position. */
    if (acc.normals && acc.normals.length === acc.positions.length) {
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(acc.normals, 3));
    } else {
      geo.computeVertexNormals();
    }
  } else {
    /* THE NORMAL (LIVE) VIEW IS SMOOTH-SHADED — render-only, and it moves no
       position: `toCreasedNormals` reads only the `position` attribute
       already set above and writes a NEW `normal` attribute; `acc.positions`
       and therefore the STL export are untouched regardless of this branch. */
    toCreasedNormals(geo, SMOOTH_SHADING_CREASE_DEG * Math.PI / 180);
  }
  /* `built` is returned as well as cached, so the export path can summarise
     the geometry IT built rather than reading the live cache — the two are
     different geometry whenever a floor binds, and a summary that mixes them
     is the unlabelled-mode defect this file's every other number avoids.

     `ui` for the same reason one step further out: the grid export records
     the state its geometry came from, and re-reading readUI() to get it
     would be a second snapshot that a slider moved between the two calls
     could make disagree with the geometry in the file. */
  return { geo, acc, built, ui: uiForBuild };
}

/* The readout's one-line summary. Every number carries its MODE, because live
   and export are different geometry and not convertible.

   MAX DIM is reported, never enforced. Reachable states cross process caps —
   dyed PA12 tops out near 180 mm on the shortest axis, standard white goes
   much larger, and SLS nests in any orientation so the only question is
   whether the box fits. Which cap applies is the user's call at order time,
   so this is a number at the slider, not a clamp and not a refusal. (The one
   thing this generator DOES refuse is triangle count, because that is a
   property of the file rather than of somebody's process.) */
/* THE PRINT-TRUTH LINE — what the object will actually be made of, and where
   that differs from what is on screen.

   Until the thickness layer live and export geometry were the same thing:
   SHEET_THICKNESS_MM (1.2) sat above MIN_FEATURE_MM (1.0), so the export
   floor never bound and the preview was the print. The thickness controls end
   that. Below 1.00 mm the exported sheet is floored, and because footRing()'s
   AREA RULE reads the thickness the solids are actually built at, the floor
   moves the RING RADIUS too — at a 0.60 mm sheet the ring is 6.25 mm live and
   8.07 mm printed, a 29% difference in the whole arrangement, not a wall.

   EVA'S RULING (Aug 31): no geometry change in either mode — the one-owner
   rule is working exactly as footRing()'s header says it should, and live
   mode stays authoring-true — but the divergence must be TOLD. A preview that
   silently shows an arrangement the print will not produce is the same lie as
   an unlabelled triangle count; a labelled one is honest. So both numbers
   appear, labelled, whenever they differ, and the second line is absent when
   they do not. A "print preview" toggle that renders the floored geometry
   live is PARKED in the charter and deliberately not built here.

   footRing() is asked the same question twice rather than anything
   re-deriving a radius: two throwaway accumulators differing only in mode,
   emitting no triangles. The one owner answers both.

   THE TOGGLE IS BUILT NOW (Sep 3) AND THIS PAIR STAYS: the two lines are the
   two geometries and the toggle only decides which one the viewport renders.
   So the marker moves rather than the lines duplicating — `← on screen`
   lands on whichever line `shownMode()` names, and the other keeps its own
   label. One owner for the choice, two labelled numbers as before. */
function materialLines(ui, mode) {
  /* Ring 0 — the outermost, which is the ring this line has always reported
     and the one the hub is built on (hub.radius IS rings[0].radius in every
     placement, unless the hub grew for an owned ring — told on its own line). The inner rings' radii are on the arrangement line, where the
     depth that produced them is also visible. */
  /* With the build's own scopes (the role retirement, Oct 16): a layer that owns
     its width builds its own foot and ring, and through the area rule that moves
     ring 0 too, so a read-out built without them would quote another bloom. */
  const sc = scopesForBuild(scopes);
  const live = footRing(ui, new MeshBuilder({ exportMode: false }), { scopes: sc }).rings[0];
  const printed = footRing(ui, new MeshBuilder({ exportMode: true }), { scopes: sc }).rings[0];
  const say = (r) => {
    const tip = thicknessProfile(r, ui).at(1);
    const tipShown = r === printed ? Math.max(tip, MIN_FEATURE_MM) : tip;
    return `sheet ${r.thickness.toFixed(2)} mm · tip ${tipShown.toFixed(2)} mm`
         + ` · foot ${r.width.toFixed(2)} × ${r.thickness.toFixed(2)} mm${r.widthClamped ? ' (CLAMPED)' : ''}`
         + ` · ring ${r.radius.toFixed(2)} mm`;
  };
  const a = say(live), b = say(printed);
  return a === b ? a
    : `${a}   ← live${mode === 'live' ? ', on screen' : ''}\nPRINTED (export floor ${MIN_FEATURE_MM.toFixed(2)} mm): ${b}${mode === 'export' ? '   ← on screen' : ''}`;
}

/* THE FIRST LINE OF THE READ-OUT names the geometry on screen, always — in
   live mode too, because a state that is only ever implied is a state the
   reader has to infer, and the toggle's whole reason to exist is that live
   and printed are different objects now. Reads shownMode(); owns nothing. */
const DRAG_LINE = 'on screen while dragging: the infill cells are dropped — full print geometry rebuilds on release\n';
/* what a light build sheds, named — the infill line verbatim where it is the
   infill (the drag gate's D1 reads it), and the deferred reports where it is
   an inflorescence: the bytes are the full build's, the reports are not yet */
function dragLine(ui) {
  if (!infillIsAbsent(ui) || !textureIsAbsent(ui)) return DRAG_LINE;
  return "on screen while dragging: the full print geometry, with the inflorescence's reports (the umbel's pitch floor, the placement flags) deferred — they are measured on release\n";
}
let lastFullShownInfill = null, lastFullShownTexture = null;
function showingLine(mode) {
  return mode === 'export'
    ? `on screen: PRINT PREVIEW — export floor ${MIN_FEATURE_MM.toFixed(2)} mm applied to sheet, tip and foot, ring re-derived from the floored feet\n`
    : 'on screen: LIVE geometry, as authored (the print-truth line below says where the print differs)\n';
}

/* THE LOW-COUNT SPIRAL FLAG — the whole of how phyllotaxis below eight petals
   is handled, and it is a LABEL rather than a gate on purpose.

   The charter used to say "gate or flag golden-angle placement at low counts".
   Measured Sep 1 (see GOLDEN_ANGLE in bloom-geometry.js): the obvious
   statistic, the ratio of largest to smallest angular gap, oscillates between
   1.62 and 2.62 at EVERY count and has no discontinuity at 8 or anywhere
   else. There is no geometric threshold to gate on. The rule is a real
   AESTHETIC claim — below roughly eight petals the golden angle reads as an
   irregular whorl rather than as a spiral — and the honest handling of an
   aesthetic claim is to say so where the user is looking.

   Gating was considered and rejected on two further grounds, recorded so it
   is not re-proposed: hiding the option would leave the model IN the spiral
   state with the control unreachable ("shipped means reachable", violated for
   the state the model is in), and auto-resetting to RADIAL would move
   geometry as a side effect of a hidden rule. Same discipline as the roll
   clamp's "(clamped)" and the print-truth line: an unlabelled state is the
   lie, a labelled one is honest.

   ASSERTED IN BOTH DIRECTIONS by the panel gate — it must appear when the
   condition holds and must be absent when it does not. A flag nothing checks
   for absence is a flag that can be stuck on. */
/* WHAT IT COUNTS IS THE SEQUENCE, and `petalCount` stopped being that number
   when CONTINUOUS arrived. The aesthetic claim is about how many elements the
   golden angle has to work with before parastichies read: under SPIRAL each
   whorl runs its own sequence, so that is `petalCount`; under CONTINUOUS the
   whole bloom is one sequence of `petalCount * layerCount`. footRing() owns
   the number and this reads it, so SPIRAL's behaviour is unchanged to the
   character (sequenceLength IS petalCount there) while the claim stays true
   in the new mode. */
function spiralLowCount(ui, fr) {
  return (ui.placement === 'SPIRAL' || ui.placement === 'CONTINUOUS')
    && fr.sequenceLength < SPIRAL_LEGIBLE_COUNT;
}

/* THE FOOT-FLOOR RANGE, and why it is a RANGE now. Under the ringed arm
   `widthClamped` was a per-layer flag and there were at most three of them.
   A continuous bloom has up to 120 feet and the floor binds from some
   crossing index onward — so "which slots" became a real question, and a bare
   "(CLAMPED)" would answer it with a word where the honest answer is two
   numbers. Same discipline as the roll clamp and the print-truth line: a
   slider that has gone quiet must say where. Returns '' when nothing is
   floored, so the line simply is not there rather than saying "none". */
/* WHICH RINGS A FOOT CLAMP TOOK OVER ON — one owner for the phrasing, because
   the floor and the ceiling ask the same question at opposite ends of one
   clamp and two copies of it would drift in wording alone. */
function clampedRingsPhrase(rings, hit) {
  /* COUNTED IN WHORLS, NOT DESCRIPTORS (session B). A split whorl is three
     descriptors of ONE ring, and they share a foot by construction (Z6), so
     counting descriptors would report "rings 0-2 (3 of 3)" for a single-whorl
     bloom whose foot clamped once — three answers to one question, and a
     number naming a thing that is not the thing. `lambda` is the whorl. */
  const whorls = [...new Set(rings.map((r) => r.lambda))].sort((a, b) => a - b);
  const idx = whorls.filter((L) => rings.some((r) => r.lambda === L && hit(r)));
  if (!idx.length) return null;
  const first = idx[0], last = idx[idx.length - 1];
  const which = whorls.length === 1 ? 'the foot' : (first === last ? `ring ${first}` : `rings ${first}–${last}`);
  return `${which} (${idx.length} of ${whorls.length})`;
}

/* BOTH CLAMPS, BOTH REPORTED. The floor has said so since the thickness
   layer; the CEILING never did, and it binds from petalWidth 25 upward — six
   of that slider's 23 reachable values — where the blade keeps widening and
   the area-ruled ring does not move at all (measured: 10.8324 mm at 24,
   11.0558 mm at 25 and still 11.0558 mm at 30). A slider that has stopped
   moving must say so: the same (CLAMPED) discipline the roll floor, the tip
   floor and the foot floor already carry, arriving where it was always
   missing (Eva, Sep 1 — found by discovery, not by a visitor wondering why
   the ring stopped growing). No geometry moves; this is telemetry. */
/* [Oct 21, root support — Eva's ruling 2: the ceiling is no longer a fixed
   10 mm but each ring's OWN ROOM, the arc each foot owns at its ring
   (footRing's `footArcMm`). The cap line names the ring, what was asked and
   what the arc allowed, and says when even the floor overruns the arc.] */
function footFloorLine(rings) {
  const lo = clampedRingsPhrase(rings, (r) => r.widthClamped);
  const hi = clampedRingsPhrase(rings, (r) => r.widthClampedHigh);
  const capped = (rings || []).filter((r) => r.widthClampedHigh);
  const worst = capped.length ? capped.reduce((a, r) => (r.width / r.widthAskedMm < a.width / a.widthAskedMm ? r : a), capped[0]) : null;
  const under = clampedRingsPhrase(rings, (r) => r.footArcUnderFloor && r.widthAskedMm > (r.footCapMm ?? r.footArcMm));
  return (lo ? `FOOT WIDTH FLOORED at ${FOOT_MIN_WIDTH_MM.toFixed(2)} mm on ${lo} — the blade keeps shrinking, the root does not\n` : '')
       + (hi ? `FOOT WIDTH CAPPED by the ring's own room on ${hi} — ${worst.widthAskedMm.toFixed(2)} mm asked, ${worst.width.toFixed(2)} mm built: the arc each foot owns at its ring (${(worst.footCapRadiusMm ?? worst.radius).toFixed(2)} mm x ${((worst.footSpanRad * 180) / Math.PI).toFixed(1)}°), a hair inside it (2^-19 rad, so neighbouring feet never share a vertex); a crowded ring caps lower, a sparse one higher\n` : '')
       + (under ? `FOOT ROOM UNDER THE FLOOR on ${under} — the arc each foot owns is under the ${FOOT_MIN_WIDTH_MM.toFixed(2)} mm floor, the floor wins and the feet on that ring still overlap their neighbours\n` : '');
}

/* THE INNER-RING LINE (Eva, Sep 3) — the read-out that stands where a derived
   depth clamp was proposed and rejected. The depth slider reaches six now and
   nothing caps it against the foot floor, because the "collision" a clamp
   would have enforced is not a buildability limit (every depth to eight
   exports watertight and as one piece) and because it is already reachable
   at depth 1..3 on shipped rows — so a clamp could not be byte-identical and
   would gate a state ruled reachable on purpose. What a visitor needs instead
   is to be TOLD, in the FOOT WIDTH FLOORED discipline: WHICH rings are
   narrower than one foot (the feet on them overlap each other), and which
   are inside their own overhang (the feet cross the axis). Both flags are
   footRing()'s own telemetry; this only names them. Absent when no ring is
   under the floor, so the line simply is not there rather than saying
   "none". The panel gate asserts it in both directions. */
function innerRingLine(rings, fr) {
  const under = clampedRingsPhrase(rings, (r) => r.underFootFloor);
  if (!under) return '';
  const cross = clampedRingsPhrase(rings, (r) => r.crossesAxis);
  /* On the dome the foot runs along the ARC and the thing it crosses is the
     apex — footRing() decides that (the flag is arc-based there); this only
     names it. */
  return `RINGS NARROWER THAN A FOOT on ${under} — under ${FOOT_MIN_WIDTH_MM.toFixed(2)} mm, so the feet on them overlap each other`
       + (cross ? `; on ${cross} they cross the ${fr && fr.dome ? (fr.dome.closed ? 'face pole' : 'apex') : 'axis'}` : '') + `\n`;
}

/* THE DOME LINE (Sep 4) — the head rise, told in the numbers a visitor cannot
   set: the cap's radius and apex height in the shown mode, the surface-to-plan
   ratio over the feet, and THE LOCAL RELIEF at the rim and at the innermost
   ring. That last pair carries the finding this session would otherwise lose
   by session 16: the dome's extra area sits at the RIM where the slope is
   steep, while a tight bloom's feet stack at the INNER rings where the cap is
   nearly flat — so the relief is greatest where the crowding is least (the
   mum's peak is at r 2.1–2.8 mm on a 4.69 mm hub, local relief 1.1–1.2x under a
   whole-annulus 2.0x; a hemisphere takes it from D_max 11 to 9, not to 5).
   Both numbers are footRing()'s own per-ring `relief`; this only prints them.
   "(CLAMPED)" is the apex floor binding, the roll floor's own discipline:
   the rise asked and the rise built are both printed, from the owner. Absent
   when flat, so the line simply is not there. */
/* THE SPHERE LINE (session 18) — the same line's other arm, for the closed
   head: the sphere's radius, the sequence pole to pole, THE RESERVED POLE's
   clearance (the arc from the far pole to the nearest foot, and the
   equal-area step it sits inside — a future stem attaches there, and S3
   asserts it in both directions), how near the feet come to the FACE pole
   (negative: they cross it), and the apex floor's clamp on the same
   "(CLAMPED)" discipline. Absent unless the head is a sphere; the panel gate
   asserts the line and its clauses against the owner's own flags. */
function sphereLine(rings, fr, mode) {
  const d = fr.dome;
  if (!d || !d.closed) return '';
  const near = rings[d.reserved.ring];
  return `HEAD: FULL SPHERE · radius ${d.Rd.toFixed(2)} mm (${mode}) · ${d.K} petals pole to pole, equal-area step ${(Math.acos(1 - d.stepCos) * 180 / Math.PI).toFixed(2)}° at the equator`
       + ` · RESERVED POLE clear: nearest foot ${d.reserved.mm.toFixed(2)} mm (${d.reserved.deg.toFixed(2)}°) from it, ring ${d.reserved.ring} at ${(near.slope * 180 / Math.PI).toFixed(2)}° — blades converge over it, feet run the other way`
       + ` · face pole: nearest foot end ${d.faceReach.mm.toFixed(2)} mm along the meridian${d.faceReach.crossing ? ` (${d.faceReach.crossing} of ${rings.length} feet cross it)` : ''}`
       + (d.clamped ? ` · (CLAMPED: the area rule's ${fr.derivedRadius.toFixed(2)} mm ring is under one sheet, the sphere is held at ${d.floorRadius.toFixed(2)} mm — the shell's inner face would invert)` : '') + `\n`;
}

/* THE HUB GREW FOR AN OWNED RING (Eva's ruling, Oct 16, replacing the rim
   hold): a layer under Per-layer values that owns a width past Petal width asks
   for a ring past layer 1's, and the hub's rim moves out to it rather than the
   ring being held. footRing()'s own record, `hub.growth`, never re-derived:
   which layer, by how much, from what. Empty where the hub is the area rule's. */
function hubGrowthLine(fr, mode) {
  const g = fr.hub && fr.hub.growth;
  if (!g) return '';
  return `HUB GROWN (${mode}) ${g.fromMm.toFixed(2)} -> ${g.toMm.toFixed(2)} mm (+${g.byMm.toFixed(2)} mm, ${g.factor.toFixed(3)}x) to fit layer ${g.layer + 1}'s ring — it owns a width past Petal width, so its ring sits ON the grown rim and every other layer keeps its own place\n`;
}

function domeLine(rings, fr, mode) {
  const d = fr.dome;
  if (!d || d.closed) return '';
  const rim = rings[0], inner = rings.reduce((a, r) => (r.radius < a.radius ? r : a), rings[0]);
  const rel = (x) => (isFinite(x) ? `${x.toFixed(2)}x` : 'vertical');
  return `HEAD RISE ${d.rise.toFixed(2)}x · dome radius ${d.Rd.toFixed(2)} mm, apex ${d.H.toFixed(2)} mm above the rim (${mode})`
       + ` · surface ${d.surfaceToPlan.toFixed(2)}x plan over the feet · local relief ${rel(rim.relief)} at the rim, ${rel(inner.relief)} at the innermost ring — the dome relieves radial stacking most where the slope is steepest, least near the apex`
       + (d.clamped ? ` · (CLAMPED: rise ${d.rise.toFixed(2)} asked, ${d.riseBuilt.toFixed(2)} built — the shell's inner face would invert under a ${d.floorRadius.toFixed(2)} mm dome radius)` : '') + `\n`;
}

/* THE SPINE LINE (session 16, the curl family) — what the spine curvature
   floor did and how near the blade came to itself, in numbers a visitor
   cannot set. Two facts, one line, from slot 0's own spine record:
     (CLAMPED)      the tightest spine radius the law asked for fell under one
                    sheet thickness (the roll floor's own constant), the
                    curvature was held there, and the turn that BUILT is
                    printed beside the turn ASKED — Eva's ruling (Sep 4):
                    full ranges, clamped, told; never an input trimmed to
                    hide a cliff.
     SELF-CONTACT   the blade comes within one sheet thickness of itself
                    (blade rows three thicknesses apart along the spine, or
                    the blade against its own foot). A FLAG, never a gate:
                    it fires on the shipped, photographed hoop.
   Absent when spine curl is 0, so the line simply is not there. The panel
   gate asserts both clauses in both directions against the builder's own
   flags (route l). */
/* THE SEAM CLEARANCE (session 38) — TOLD, never silent. The floor moves the
   blade's first row outward when the foot-to-blade kink would otherwise fold
   the offset surface, and a geometry change nobody is told about is exactly
   what this project's "full ranges, clamped, told" convention exists against.
   It is NOT a control and never becomes one: the clearance is derived from
   the turn and the sheet, and a slider for it would be a second owner of a
   printability condition. Absent when it binds on no ring — the shipping
   default among them — so the line simply is not there.

   The number that matters is per RING, because the clearance is a function of
   the ring's own effective tilt: on six whorls at the defaults the turns run
   25 to 85 degrees and the steps 1 to 5. Both STL gates assert all of it per
   ring (A7), which is a stronger read-back than the panel could give. */
function seamLine(petals) {
  const ls = (petals || []).map((p) => p && p.bladeLadder).filter((l) => l && l.seamStep > 1);
  if (!ls.length) return '';
  const all = (petals || []).map((p) => p && p.bladeLadder).filter(Boolean);
  const worst = ls.reduce((a, l) => (l.seamStep > a.seamStep ? l : a), ls[0]);
  return `SEAM CLEARANCE binds on ${ls.length} of ${all.length} ring${all.length === 1 ? '' : 's'}`
       + ` · worst ${worst.seamClearMm.toFixed(3)} mm at a ${worst.seamTurnDeg.toFixed(1)}° foot-to-blade kink`
       + ` · that ring's first blade row starts ${worst.seamStep} row${worst.seamStep === 1 ? '' : 's'} out`
       + (ls.some((l) => l.seamClamped)
          ? ` · CLAMPED on ${ls.filter((l) => l.seamClamped).length} ring${ls.filter((l) => l.seamClamped).length === 1 ? '' : 's'} — the blade there is SHORTER than the fold it has to clear (${Math.max(...ls.filter((l) => l.seamClamped).map((l) => l.seamClearU)).toFixed(3)}x its own length asked), so the block starts as far out as it can and the sheet still passes through itself`
          : '')
       + ` — nearer and the sheet's own top skin would fold back into the foot\n`;
}

/* THE FOLD CLAMP, TOLD (Eva's ruling, the apex-nib session: "Do not scale the
   cup down silently"). The cup's section leaves the midrib with radius
   `hb/(2c)`, and a sheet is that surface offset by +/- t/2, so a radius under
   the half-thickness has no offset surface at all. The clamp pins the radius
   at `FOLD_CLAMP_MARGIN * t/2` where it would have gone under; this names the
   WORST station it bound on, in the (CLAMPED) discipline the roll floor, the
   spine curl and the apex floor already use. Absent where it never bound — a
   line that cannot fire reads as absent, never as a passing zero. Reads EVERY
   built petal AND every built sepal, because a sepal is the petal builder on
   a second ring and meets the floor sooner for being scaled down. */
/* THE ROOT TAPER (big petals, Oct 21) — told wherever a petal is longer than
   the reference and thickens at its root, with the hub the root sits on.
   Absent at or under the reference (a line that cannot fire reads as
   absent). Reads every ring's representative petal's own record and the
   hub's; computes nothing. Sepals and leaves take the law too (root support) and have their own lines below,
   so this line is the petals' alone. */
/* [Oct 21, root support: SEPALS and LEAVES take the law at their own length
   (Eva's ruling 1). Each organ that tapers gets its own line, read off its own
   built record: a sepal's root and the hub that carries it, a leaf's root and
   the petiole that carries it (clamped and told where the stem cannot hold the
   asked radius), and a compound leaf's worst leaflet with its stalk.] */
function organRootTaperLines(sepalsBuilt, leavesBuilt, leafPlan, hub, mode) {
  let out = '';
  const ss = (sepalsBuilt || []).map((p) => p && p.thickness && p.thickness.rootTaper).filter(Boolean);
  if (ss.length) {
    const w = ss.reduce((a, t) => (t.rootFactor > a.rootFactor ? t : a), ss[0]);
    out += `ROOT TAPER (sepal): a ${w.askedLengthMm.toFixed(1)} mm sepal is ${w.rootMm.toFixed(2)} mm thick at its root (×${w.rootFactor.toFixed(3)} the sheet), the same law as a petal at its own length (UNVALIDATED — no coupon has been printed)`
         + (hub ? ` · the hub is ${hub.thickness.toFixed(2)} mm thick to carry it (${mode})` : '') + `\n`;
  }
  const L = (leavesBuilt || [])[0];
  if (L && L.compound) {
    const lf = L.leaflets.filter((q) => q.rootTaper);
    if (lf.length) {
      const w = lf.reduce((a, q) => (q.rootTaper.rootFactor > a.rootTaper.rootFactor ? q : a), lf[0]);
      out += `ROOT TAPER (leaflet): a ${w.lengthMm.toFixed(1)} mm leaflet is ${w.rootTaper.rootMm.toFixed(2)} mm thick at its root (×${w.rootTaper.rootFactor.toFixed(3)}) on a ${(2 * w.stalkRMm).toFixed(2)} mm stalk — the stalks stay the wire (the compound ruling), so a tapered leaflet's root is thicker than the rod that holds it · ${lf.length} of ${L.leaflets.length} leaflets taper (UNVALIDATED — no coupon has been printed)\n`;
    }
  } else if (L && L.rootTaper) {
    const pp = leafPlan ? (leafPlan.simplePetiole || leafPlan.lobedPetiole) : null;
    out += `ROOT TAPER (leaf): a ${L.rootTaper.askedLengthMm.toFixed(1)} mm leaf blade is ${L.rootTaper.rootMm.toFixed(2)} mm thick at its root (×${L.rootTaper.rootFactor.toFixed(3)})`
         + (leafPlan ? ` on a ${(2 * leafPlan.petioleR).toFixed(2)} mm petiole` : '')
         + (pp && pp.clamped ? ` — the petiole is CLAMPED at the stem (${(2 * pp.radiusMm).toFixed(2)} of ${(2 * (pp.rootFloorMm ?? pp.askedMm)).toFixed(2)} mm asked: the rooted end must still fit the stem)` : '')
         + ` (UNVALIDATED — no coupon has been printed)\n`;
  }
  return out;
}
function rootTaperLine(petals, fr, mode) {
  const ts = (petals || []).map((p) => p && p.thickness && p.thickness.rootTaper).filter(Boolean);
  if (!ts.length) return '';
  const worst = ts.reduce((a, t) => (t.rootFactor > a.rootFactor ? t : a), ts[0]);
  const hub = fr && fr.hub ? fr.hub : null;
  return `ROOT TAPER: a ${worst.askedLengthMm.toFixed(1)} mm petal is ${worst.rootMm.toFixed(2)} mm thick at its root (×${worst.rootFactor.toFixed(3)} the sheet), tapering to the sheet ${worst.refMm} mm from its tip`
       + ` — the cantilever law against the shipping ${worst.refMm} mm petal's root stress (UNVALIDATED — no coupon has been printed)`
       + (ts.length > 1 ? ` · ${ts.length} rings taper` : '')
       + (hub ? ` · the hub is ${hub.thickness.toFixed(2)} mm thick to carry it (${mode})` : '') + `\n`;
}
function cupClampLine(petals, sepals) {
  const parts = [...(petals || []), ...(sepals || [])].filter(Boolean);
  const cs = parts.map((p) => p && p.form && p.form.cupClamp).filter(Boolean);
  if (!cs.length) return '';
  const worst = cs.reduce((a, c) => (c.askedRadiusMm < a.askedRadiusMm ? c : a), cs[0]);
  const rows = cs.reduce((a, c) => a + c.rows, 0);
  return `CUP CLAMPED at u ${worst.u.toFixed(4)}, asked radius ${worst.askedRadiusMm.toFixed(3)} mm, drawn ${worst.drawnRadiusMm.toFixed(3)} mm`
       + ` — the section's radius may not fall under ${worst.drawnRadiusMm.toFixed(3)} mm (the sheet has no offset surface below it);`
       + ` ${rows} row${rows === 1 ? '' : 's'} on ${cs.length} of ${parts.length} part${parts.length === 1 ? '' : 's'}\n`;
}

/* F3-SCOPE — A MIXED FLOWER (some rings on the drawn spine, some on the curl
   sliders) is told per kind: the curve rings on the SPINE CURVE line, the
   slider rings on the SPINE CURL line, then which scopes bend their own
   (every built petal's `spineFrom`). A partner of a FAN pair draws the same
   spine as its pair (planar in the midrib plane) — nothing to tell. */
function spineLine(petals, all = null, layerWord = 'layer') {
  const sps = (petals || []).map((p) => p && p.spine).filter((sp) => sp && (sp.curlRad !== 0 || sp.curveMode));
  const curve = sps.filter((sp) => sp.curveMode), slider = sps.filter((sp) => !sp.curveMode);
  return (curve.length ? spineCurveLine(curve) : '') + (slider.length ? spineCurlLine(slider) : '') + spineScopeLine(all || petals, layerWord);
}
function spineScopeLine(all, layerWord = 'layer') {
  const ps = (all || []).filter((p) => p && p.spineFrom);
  if (!ps.length) return '';
  const groups = new Map();
  for (const p of ps) {
    const from = Object.values(p.spineFrom).includes('petal') ? 'petal' : 'layer';
    const k = from === 'petal' ? `${layerWord} ${Math.round(p.whorl) + 1} pair ${p.scopeTerm && p.scopeTerm.key ? p.scopeTerm.key.slot + 1 : '?'}` : `${layerWord} ${Math.round(p.whorl) + 1}`;
    if (!groups.has(k)) groups.set(k, { n: 0, mode: p.spine && p.spine.curveMode ? 'CURVE' : 'SLIDER', keys: Object.keys(p.spineFrom) });
    groups.get(k).n++;
  }
  const said = [...groups.entries()].map(([k, g]) => `${k} owns its ${g.keys.map((x) => (x === 'petalSpineCurve' ? 'spine curve' : 'curl mode')).join(' and ')} (${g.mode === 'CURVE' ? 'the drawn spine' : 'the curl sliders'}, ${g.n} petal${g.n === 1 ? '' : 's'})`);
  return `SPINE BY SCOPE: ${said.join(' · ')}; every other petal inherits the whole bloom's, live\n`;
}
function spineCurveLine(sps) {
  /* THE SPINE CURVE (F3-global): the law's own record on the whole-bloom petal
     and the worst ring's radius; a curve that a file loaded past the floor is
     CLAMPED and told exactly as the slider's modifiers are. */
  {
    const sp0 = sps[0], cl = sp0.curveLaw;
    const tight = sps.reduce((a, s) => (s.peakRadiusMm < a.peakRadiusMm ? s : a), sp0);
    const clamped = sps.filter((s) => s.floorClamped), contact = sps.filter((s) => s.clearance.selfContact);
    const near = sps.reduce((a, s) => Math.min(a, s.clearance.minMm, s.clearance.minToFootMm), Infinity);
    const of = (arr) => `${arr.length} of ${sps.length} ring${sps.length === 1 ? '' : 's'}`;
    return `SPINE CURVE: ${sp0.curve.points.length} points, drawn arc ${cl.arcFrac.toFixed(3)} of the length scaled to ${sp0.askedLengthMm.toFixed(1)} mm · start ${cl.startDeg >= 0 ? '+' : ''}${cl.startDeg.toFixed(1)}° laid along the blade · ${sp0.turnBuiltDeg.toFixed(1)}° built · the slider family (spine curl, bias, start, the curl deltas, the variance curl term) is INERT`
         + ` · tightest spine radius ${tight.peakRadiusMm.toFixed(2)} mm`
         + (clamped.length ? ` (CLAMPED at one sheet thickness, ${tight.floorRadius.toFixed(2)} mm, on ${of(clamped)} — a loaded curve asks under the floor; the editor refuses such a drag)` : ` against a ${tight.floorRadius.toFixed(2)} mm floor`)
         + foldLimitWords(sps, of, 'a loaded curve, or a later slider, asks the sheet to fold through itself; the editor refuses such a drag and the cup that would cause one')
         + ` · nearest self-approach ${isFinite(near) ? near.toFixed(2) + ' mm' : 'n/a'} against a ${sp0.clearance.sheetT.toFixed(2)} mm sheet`
         + (contact.length ? ` · SELF-CONTACT on ${of(contact)} (the blade touches itself — a flag, never a gate)` : '') + `\n`;
  }
}
/* THE FOLD LIMIT (spine-cup-fold): where the spine was held at the radius its
   own cross-section needs — the worst station, the section's reach toward the
   bend's centre, the radius asked and the radius built — the nearest spine
   that does not fold, told rather than silent. */
function foldLimitWords(sps, of, why) {
  const fc = sps.filter((s) => s.bendClamped && s.bend);
  if (!fc.length) return '';
  const w = fc.reduce((a, s) => (s.bend.ratio > a.bend.ratio ? s : a), fc[0]).bend;
  return ` · FOLD LIMIT on ${of(fc)}: at u ${w.u.toFixed(2)} the petal's cross-section (its cup, roll or twist) reaches ${w.reachMm.toFixed(2)} mm toward the bend's centre, so the spine is built at ${w.limitRadiusMm.toFixed(2)} mm where ${w.askedRadiusMm.toFixed(2)} mm was asked (${why}; built as the nearest spine that does not)`;
}
function spineCurlLine(sps) {
  /* EVERY RING'S PETAL, because the floor binds and the flags fire on the
     SHRUNK inner whorls first: the line names the worst ring, not slot 0's. */
  const sp0 = sps[0];
  const tight = sps.reduce((a, s) => (s.peakRadiusMm < a.peakRadiusMm ? s : a), sp0);
  const clamped = sps.filter((s) => s.floorClamped), under = sps.filter((s) => s.underFloor), contact = sps.filter((s) => s.clearance.selfContact);
  const near = sps.reduce((a, s) => Math.min(a, s.clearance.minMm, s.clearance.minToFootMm), Infinity);
  const of = (arr) => `${arr.length} of ${sps.length} ring${sps.length === 1 ? '' : 's'}`;
  return `SPINE CURL ${sp0.turnAskedDeg}° · bias ${Number(sp0.bias).toFixed(2)} · start ${Number(sp0.start).toFixed(2)}${sp0.startFloored !== sp0.start ? ` (floored to the first blade row, ${sp0.startFloored.toFixed(3)})` : ''}`
       + ` · tightest spine radius ${tight.peakRadiusMm.toFixed(2)} mm`
       + (clamped.length ? ` (CLAMPED at one sheet thickness, ${tight.floorRadius.toFixed(2)} mm, on ${of(clamped)}: ${tight.turnAskedDeg}° asked, ${clamped.reduce((a, s) => Math.min(a, Math.abs(s.turnBuiltDeg)), Infinity).toFixed(1)}° built at the tightest — the sheet's inner face would invert under a tighter spine)` : '')
       + (under.length ? ` · UNDER ONE SHEET THICKNESS (${tight.floorRadius.toFixed(2)} mm) on ${of(under)} — the shipped uniform arc on a shrunk whorl, told, not clamped` : '')
       + foldLimitWords(sps, of, 'the curl asks the sheet to fold through itself')
       + ` · nearest self-approach ${isFinite(near) ? near.toFixed(2) + ' mm' : 'n/a'} against a ${sp0.clearance.sheetT.toFixed(2)} mm sheet`
       + (contact.length ? ` · SELF-CONTACT on ${of(contact)} (the blade touches itself — a flag, never a gate)` : '') + `\n`;
}

/* THE APEX LINE (Eva's option (c), approved the apex-nib session and shipped
   in the same PR as the line it describes).

   WHY IT EXISTS. Until this session every petal finished on a flat face two
   print floors across — 1.6000 mm in EXPORT, 0.3000 mm live — whatever
   exponent `petalTipShape` was asked for, because the tip law reaches zero at
   u = 1 and `halfWidthAt` is a `max` against the floor. The nib truncates the
   law at its own crossing of that floor, carries the flank on along its OWN
   tangent, and closes with an arc tangent to both flanks. Three things follow
   that a reader cannot see on screen and must be told:

     (1) THE PETAL IS NOT DRAWN AT THE LENGTH THE SLIDER SAYS. `petalLength`
         keeps meaning the ASKED length (Eva's ruling); the blade is drawn to
         wherever the cap closes. At the shipping default that is 0.124 mm
         PAST the slider, at `petalTipShape` 0.60 it is 4.95 mm SHORT of it.
         Both are printed, with the sign, because a length that is silently
         not the control's is the thing this generator has a rule about.
     (2) THE FACE IS AN AUTHORED EXCEPTION. 0.40 mm across is UNDER
         `MIN_FEATURE_MM`, ruled deliberately, on a project where nothing has
         ever been printed. It says so in the verbatim words the slenderness
         and cantilever lines already use.
     (3) THE NIB CAN BE INERT, and then the petal still ends on a flat face —
         which is the state this feature exists to remove, so it names the
         guard that refused rather than going quiet.

   It reads the BUILDER's own record and re-derives none of it; AN0-AN3 are
   what say the record is right. Every ring, because an inner whorl's blade
   can be too narrow to clear the floor at all and then only that ring is
   inert. */
/* THE OUTLINE CURVE (F6-sym): the plan's own record on every ring — the
   widest point, the narrowest drawn point against the floor, any point the
   build LIFTED (a loaded curve; the editor refuses such a drag), and how the
   nib closed it at exactly the asked length (the regime `leafNibPlan` took
   and the corner it turned). Reads the builder's record and re-derives none
   of it; OC0-OC2 are what say the record is right. */
/* F6-SCOPE — A MIXED FLOWER (some petals LAW, some CURVE, some asymmetric) is
   told per kind: the one-sided rings on one line, the two-sided on the
   other's, then which scopes own their outline (every built petal's record,
   `outlineFrom`) and how many FAN partners draw their pair's curve mirrored. */
function outlineLine(petals, all = null, layerWord = 'layer') {
  const ps = (petals || []).filter((p) => p && p.tipCap && p.tipCap.outline);
  const one = ps.filter((p) => !p.tipCap.twoSided), two = ps.filter((p) => p.tipCap.twoSided);
  return (one.length ? outlineLineOne(one) : '') + (two.length ? outlineLineTwoSided(two) : '') + outlineScopeLine(all || petals, layerWord);
}
function outlineScopeLine(all, layerWord = 'layer') {
  const ps = (all || []).filter(Boolean);
  const owned = ps.filter((p) => p.outlineFrom);
  const mirrored = ps.filter((p) => p.outlineMirrored);
  if (!owned.length && !mirrored.length) return '';
  const groups = new Map();
  for (const p of owned) {
    const from = Object.values(p.outlineFrom).includes('petal') ? 'petal' : 'layer';
    const k = from === 'petal' ? `${layerWord} ${Math.round(p.whorl) + 1} pair ${p.scopeTerm && p.scopeTerm.key ? p.scopeTerm.key.slot + 1 : '?'}` : `${layerWord} ${Math.round(p.whorl) + 1}`;
    if (!groups.has(k)) groups.set(k, { n: 0, mode: p.outlineMode, curve: p.outlineCurve, keys: Object.keys(p.outlineFrom) });
    groups.get(k).n++;
  }
  const said = [...groups.entries()].map(([k, g]) => `${k} owns its ${g.keys.map((x) => (x === 'petalOutlineCurve' ? 'curve' : 'mode')).join(' and ')} (${g.mode}${g.curve ? (g.curve.mode === 'two-sided' ? ', asymmetric' : ', symmetric') : ''}, ${g.n} petal${g.n === 1 ? '' : 's'})`);
  return `OUTLINE BY SCOPE:${said.length ? ` ${said.join(' · ')}; every other petal inherits the whole bloom's, live` : ''}`
       + (mirrored.length ? `${said.length ? ' ·' : ''} ${mirrored.length} FAN partner${mirrored.length === 1 ? '' : 's'} draw${mirrored.length === 1 ? 's' : ''} its pair's asymmetric curve MIRRORED (left and right halves swapped — a pair is a mirror image)` : '')
       + `\n`;
}
function outlineLineOne(ps) {
  const o0 = ps[0].tipCap.outline, ap0 = ps[0].tipCap.apex;
  const lifted = ps.filter((p) => p.tipCap.outline.lifted.length);
  const of = (arr) => `${arr.length} of ${ps.length} ring${ps.length === 1 ? '' : 's'}`;
  /* the narrowest point the HAND set — a point pinned to a throat is the
     tube law's, never the hand's (F6-sym-2) */
  const narrow = Math.min(...ps.map((p) => Math.min(...p.tipCap.outline.built.slice(p.tipCap.outline.pinned ? 1 : 0, -1).map((q) => q[1] * p.tipCap.outline.lengthMm))));
  const kink = Math.max(...ps.map((p) => p.tipCap.apex.kinkDeg || 0));
  const lobed = ps.filter((p) => p.tipCap.outline.throat);
  return `OUTLINE CURVE: ${o0.points.length} points, widest ${(2 * o0.peakHalfMm).toFixed(2)} mm at u ${o0.uPk.toFixed(3)}`
       + (o0.scale !== 1 ? ` · widths scaled ${o0.scale.toFixed(3)}x by the ${o0.widthMm} mm Petal width` : '')
       + ` · narrowest drawn point ${(2 * narrow).toFixed(2)} mm across against the ${(2 * TIP_HALF_MM).toFixed(2)} mm print floor`
       + (lifted.length ? ` (LIFTED to the floor on ${of(lifted)} — a loaded curve asks under it; the editor refuses such a drag)` : '')
       + (lobed.length ? ` · on ${of(lobed)} the curve shapes the FREE LOBE above the tube's throat (u ${lobed[0].tipCap.outline.throat.u.toFixed(2)}), its first point pinned to the tube law's ${(2 * lobed[0].tipCap.outline.pinned.builtMm).toFixed(2)} mm there — below it the tapers and tip shape draw the tube; the squared end, lobes and fringe are INERT`
         : ` · the tapers, tip shape, squared end, lobes and fringe are INERT`)
       + (ap0 && ap0.active ? ` · the nib closes it at exactly ${ap0.drawnLengthMm.toFixed(3)} mm (${ap0.regime} regime, leaving the curve ${(2 * ap0.startHalfMm).toFixed(2)} mm across${kink > 0 ? `, a ${kink.toFixed(2)}° corner at the join` : ', tangent'})` : ` · NIB INERT (${ap0 ? ap0.why : 'no record'})`)
       + `\n`;
}

/* F6-asym — AN ASYMMETRIC OUTLINE, told half by half from each half's own
   record (`tipCap.sides`), with the handedness stated where it is read. */
function outlineLineTwoSided(ps) {
  const t0 = ps[0].tipCap, o0 = t0.outline;
  const half = (side) => {
    const o = o0.sides[side], ap = t0.sides[side].apex;
    const narrow = Math.min(...ps.map((p) => { const q = p.tipCap.outline.sides[side]; return Math.min(...q.built.slice(q.pinned ? 1 : 0, -1).map((b) => b[1] * q.lengthMm)); }));
    return `${side.toUpperCase()} half ${o.points.length} points, ${o.peakHalfMm.toFixed(2)} mm out at u ${o.uPk.toFixed(3)}, narrowest ${narrow.toFixed(2)} mm out against the ${TIP_HALF_MM.toFixed(2)} mm half-floor`
      + (ap && ap.active ? `, nib ${ap.regime}${ap.kinkDeg > 0 ? ` (${ap.kinkDeg.toFixed(2)}° corner)` : ''}` : `, NIB INERT (${ap ? ap.why : 'no record'})`);
  };
  const lifted = ps.filter((p) => p.tipCap.outline.lifted.length);
  return `OUTLINE CURVE: ASYMMETRIC — two half-curves about the midrib (left = the upper curve: the petal seen from its upper face, base down; every radial or spiral petal the same hand, so a whorl is a pinwheel; on a fan each pair's partner is its mirror image)`
       + (o0.scale !== 1 ? ` · widths scaled ${o0.scale.toFixed(3)}x by the ${o0.widthMm} mm Petal width` : '')
       + `\n     ${half('left')}\n     ${half('right')}`
       + (lifted.length ? `\n     LIFTED to the floor on ${lifted.length} of ${ps.length} ring(s) — a loaded curve asks under it; the editor refuses such a drag` : '')
       + (o0.throat ? `\n     on a fused whorl both halves shape the FREE LOBE above the throat (u ${o0.throat.u.toFixed(2)}), each first point pinned to the tube law's width there` : '')
       + `\n     both halves close on their own nib at exactly ${t0.apex.drawnLengthMm.toFixed(3)} mm, on a ${(2 * t0.apex.endHalfMm).toFixed(2)} mm face · the tapers, tip shape, squared end, lobes and fringe are INERT\n`;
}

function apexLine(petals) {
  /* F6-asym: a two-sided petal's nib is two plans, one per half — each is a
     ring's worth of record here, carrying its petal's stations */
  const ps = (petals || []).filter((p) => p && p.tipCap && p.tipCap.apex)
    .flatMap((p) => (p.tipCap.twoSided ? [{ ...p, tipCap: p.tipCap.sides.left }, { ...p, tipCap: p.tipCap.sides.right }] : [p]));
  if (!ps.length) return '';
  const aps = ps.map((p) => p.tipCap.apex);
  const live = aps.filter((a) => a.active);
  const of = (k) => `${k} of ${aps.length} ring${aps.length === 1 ? '' : 's'}`;
  if (!live.length) {
    const why = [...new Set(aps.map((a) => a.why))].join('; ');
    return `APEX NIB INERT on every ring — ${why} — so the blade still ends on a flat face `
         + `${(2 * ps[0].tipCap.terminalHalf).toFixed(2)} mm across\n`;
  }
  /* THE RING THE LINE NAMES IS THE ONE THAT MOVED ITS LENGTH FURTHEST, in
     either direction: the reader wants the worst disagreement between the
     slider and the object, not ring 0's. */
  const w = live.reduce((a, b) => (Math.abs(b.drawnLengthMm - b.askedLengthMm) > Math.abs(a.drawnLengthMm - a.askedLengthMm) ? b : a), live[0]);
  const d = w.drawnLengthMm - w.askedLengthMm;
  /* HOW MANY ROWS THE LADDER ACTUALLY PUT ON THE NIB — measured off that
     ring's own emitted stations, never the demand it was asked for. */
  const wi = aps.indexOf(w), pu = ps[wi] && ps[wi].profileU;
  const onNib = Array.isArray(pu) ? pu.filter((u) => u * w.drawnLengthMm > w.xLawMm + 1e-12).length : null;
  return `APEX NIB — the law runs to the ${(2 * TIP_HALF_MM).toFixed(2)} mm print floor at u ${w.uLaw.toFixed(4)}, `
       + `then the flank carries on at its own tangent (${w.slope.toFixed(3)} mm/mm) to a ${(2 * APEX_HALF_MM).toFixed(2)} mm face `
       + `and closes on a ${w.radiusMm.toFixed(3)} mm arc, so the petal ends ${(2 * w.endHalfMm).toFixed(2)} mm across `
       + `over ${w.capMm.toFixed(3)} mm of cap`
       + (onNib !== null ? ` on ${onNib} row${onNib === 1 ? '' : 's'}` : '')
       + ` · drawn ${w.drawnLengthMm.toFixed(3)} mm against the ${w.askedLengthMm.toFixed(3)} asked (${d >= 0 ? '+' : ''}${d.toFixed(3)} mm)`
       + (live.length < aps.length ? ` · INERT on ${of(aps.length - live.length)} (${[...new Set(aps.filter((a) => !a.active).map((a) => a.why))].join('; ')})` : '')
       + ` · the ${(2 * APEX_HALF_MM).toFixed(2)} mm face is UNDER the ${MIN_FEATURE_MM.toFixed(2)} mm minimum feature — an authored exception; UNMEASURED — no coupon has been printed\n`;
}

/* THE APEX ROW RAMP'S OWN BUDGET LINE (Eva's ruling) — read from the
   builder's `tipRowBudget` record, never re-derived: it names the same
   `baselineTris`/`predictedTris`/`budget` the decision itself was made
   from. Absent (empty string) where nothing was ramp-eligible at all, the
   same "nothing to say" convention every other conditional line here uses. */
function tipRowBudgetLine(b) {
  if (!b || (b.baselineTris === null && !b.held)) return '';
  if (b.held) {
    return `TIP ROWS HELD at 56: bloom over the triangle budget `
         + `(predicted ${b.predictedTris.toLocaleString('en-US')} tris against the ${b.budget.toLocaleString('en-US')} export budget, `
         + `baseline ${b.baselineTris.toLocaleString('en-US')})\n`;
  }
  return `TIP ROWS: the ramp is within budget (predicted ${b.predictedTris.toLocaleString('en-US')} of the ${b.budget.toLocaleString('en-US')} export budget)\n`;
}

/* THE FRINGE LINE (Eva's ruling, Sep 13) — the squared end and the teeth,
   read from ring 0's petal record and never re-derived from the sliders.
   Asked beside built for the count, the clamp and WHY it bound, the tooth and
   gap at the two stations where each is narrowest, the split asked beside the
   station it landed on, and — when a fringe is live — the fact that the lobe
   family is standing down. Absent when neither control is off its default. */
function fringeLine(petals) {
  const F = petals && petals[0] && petals[0].fringe;
  if (!F) return '';
  /* THE CONVERGING ARM DEFERS TO THE APEX LINE (Eva's option (c), the
     apex-nib session). It used to read "CONVERGING END — the apex law runs
     to its own point", which was true of a law that reaches zero at u = 1
     and FALSE of the petal, because the print floor then ran that law out
     flat to a face two floors across. The nib makes the sentence true, and
     `apexLine` above states it with the numbers — where the law was cut, at
     what tangent the flank carries on, what the face and the arc are, and
     what the blade's length came out at. So this arm names the end in three
     words and does not restate any of it, and it is DROPPED entirely where
     it would stand alone: a line whose whole content is one line above it is
     a line nobody reads twice. */
  const end = F.tipEnd === 0
    ? 'CONVERGING END (see APEX NIB above)'
    : F.deadTravel
      ? `SQUARED END ${(F.tipEnd * 100).toFixed(0)}% — DEAD: ${F.endWidthMm.toFixed(2)} mm is under the ${F.floorMm.toFixed(2)} mm print floor, so the petal still ends on the floor's own ${(2 * F.tipHalfMm).toFixed(2)} mm (dead below ${(100 * F.deadBelow).toFixed(0)}% on this petal — told, never trimmed)`
      : `SQUARED END ${F.endWidthMm.toFixed(2)} mm across, ${(100 * F.endWidthMm / (2 * F.peakHalfMm)).toFixed(0)}% of the petal's width · it carries ${F.ceiling} ${F.ceiling === 1 ? 'tooth' : 'teeth'} at the ${F.floorMm.toFixed(2)} mm floor`;
  if (F.noRoom) return `FRINGE NO ROOM — ${F.asked} teeth asked and ${F.noRoomWhy}, so none are cut: the petal converges to `
    + `${(2 * F.tipHalfMm).toFixed(2)} mm, which carries one tooth at the ${F.floorMm.toFixed(2)} mm floor, and one tooth is the petal. `
    + `Told, never refused — raise the squared end above ${(100 * F.deadBelow).toFixed(0)}% and the teeth appear.\n`;
  if (!F.built) return F.tipEnd === 0 ? '' : `${end}\n`;
  /* CLAMPED AND TOLD. The ceiling is the END's width and nothing else, so the
     reason names the width that bound and what the end would have to be. */
  const count = F.clamped
    ? `${F.asked} asked → ${F.count} built (CLAMPED: the end is ${F.wMinMm.toFixed(2)} mm at its narrowest and ${F.asked} teeth need ${((2 * F.asked - 1) * F.floorMm).toFixed(1)} mm`
      + (F.tipEnd === 0 ? ' — there is no squared end to carry them)' : `, so the squared end would have to be ${(100 * ((2 * F.asked - 1) * F.floorMm) / (2 * F.peakHalfMm)).toFixed(0)}% of the width)`)
    : `${F.count} teeth`;
  const split = F.peakClamped
    ? `split CLAMPED to the widest point (u ${F.uPk.toFixed(4)}) — a tooth may not reach below it into the base taper`
    : `${F.depthMm.toFixed(2)} mm deep, asked at u ${F.uAsked.toFixed(4)} and landed on the row at u ${F.uSplitRow.toFixed(4)} (${F.residualMm.toFixed(3)} mm off, inside the ${F.rowGapMm.toFixed(3)} mm row)`;
  /* THE MUTUAL EXCLUSION IS SAID OUT LOUD. A family that went quiet without
     saying so is a control that stopped working as far as anyone can tell. */
  const lobes = ' · LOBES stand down — both treat the apex, and a rim cut narrows every tooth including the middle ones (measured)';
  return `FRINGE ${count} · ${end} · ${F.count === 1 ? 'the tooth is' : 'teeth'} ${F.toothBaseMm.toFixed(2)} mm at the split tapering to ${F.toothTipMm.toFixed(2)} mm`
       + (F.count > 1 ? `, gaps ${F.gapSplitMm.toFixed(2)} → ${F.gapTipMm.toFixed(2)} mm` : '')
       + ` · ${split}${lobes}\n`;
}

/* THE LOBES LINE (session 38, PR 2) — read from ring 0's petal record, never
   re-derived from the sliders: asked beside built for the count and the depth,
   each cap and whether it bound, the pitch against its floor, and the rows the
   ladder gave each lobe (a ROW COUNT, measured on the emitted stations, said
   as such). Absent on a plain petal. */
/* THE EDGE PROFILE (the edge-profile session, Eva's ruling) — read from ring
   0's petal record, never re-derived from the constants. Two things have to be
   said on every build and one only sometimes.

   WHAT IS ALWAYS SAID: the rim the petal actually drew. The floor and the
   radius are constants and a reader can find them; what a reader cannot find
   is the radius this petal REACHED, the segment count that bought, and the
   bead's semi-axis along the LENGTH at the tip — which is the ladder's own
   last gaps rather than the ruled radius, and moves with the petal's length
   and its tip law. A number nobody prints is a number nobody watches.

   WHAT IS SAID WHEN IT HAPPENS: Eva asked for every location where the
   narrow-span clamp takes the rim BELOW the 1.0 mm floor to be reported with
   its measured thickness. The builder collects them (`rim.clamps`), the gate
   holds the declaration to a biconditional, and this prints the count, the
   thinnest, and the room that caused it. A fringe tooth at the ceiling is
   1.0000 mm wide — exactly twice the ruled radius — so this is a reachable
   state and not a corner. */
function edgeProfileLine(petals) {
  const R = petals && petals[0] && petals[0].rim;
  if (!R || !R.segments) return '';
  const tip = R.tipAxisMm === null ? '' : ` · at the tip the bead is ${R.tipAxisMm.toFixed(3)} mm along the length against ${R.drawnMaxMm.toFixed(2)} across — the ladder's own last ${2} rows, not the ruled radius`;
  let clamp = '';
  if (R.clamps.length) {
    let thin = Infinity, room = 0, body = 0;
    for (const c of R.clamps) if (c.thicknessMm < thin) { thin = c.thicknessMm; room = c.roomMm; body = c.bodyMm; }
    clamp = `\n  RIM CLAMPED at ${R.clamps.length} ${R.clamps.length === 1 ? 'location' : 'locations'} — the narrowest span leaves ${room.toFixed(2)} mm of room, so the bead shrinks to fit and the rim is ${thin.toFixed(3)} mm there against the ${1.0} mm floor (the body is ${body.toFixed(2)} mm). Told, never refused.`;
  }
  return `EDGE PROFILE the rim eases to ${(2 * R.drawnMaxMm).toFixed(2)} mm over 3.0 mm of surface and closes on a ${R.drawnMaxMm.toFixed(2)} mm half-round in ${R.segments} segments${tip}${clamp}\n`;
}

function lobeLine(petals) {
  const L = petals && petals[0] && petals[0].lobes;
  if (!L) return '';
  if (L.noRoom) return `LOBES NO ROOM — ${L.noRoomWhy === 'region' ? 'the margin has no arc at all' : L.noRoomWhy === 'rows' ? `the ladder can place ${L.rowsCapacity} rows in this window and one period needs ${L.samplesPerLobe}` : L.noRoomWhy === 'relief' ? `every period's sinus sits where the outline has already converged to the print floor (the asked relief was ${L.reliefAskedMm.toFixed(2)} mm) — there is nothing to remove anywhere in the arc` : `${(2 * L.treatedHalfMm).toFixed(1)} mm of treated rim is under the ${L.pitchFloorMm.toFixed(2)} mm pitch floor`}; nothing cut, told\n`;
  const count = L.countClamped
    ? `${L.countAsked} asked → ${L.countBuilt} built (CLAMPED by ${L.clampedBy === 'pitch' ? 'the pitch floor' : `the rows the ladder has — ${L.rowsCapacity} free in this window at ${L.samplesPerLobe} a period`})`
    : `${L.countBuilt} teeth`;
  /* THE APEX IS A POINT ON THE RIM NOW, so the first thing this line says is
     what is AT it — the parity fact, which is a printability statement and
     not a look: an even count's apex sinus lands on the terminal mini-face,
     which is already at the print floor in both modes, so it is flattened
     rather than cut. Derived from the law, never asserted (session 42). */
  const apex = L.apexIsCrest
    ? 'a CREST at twelve'
    : `a NOTCH at twelve — on the terminal face, already at the print floor, so it cuts ${L.apexReliefMm.toFixed(2)} mm and reads as ONE wide tooth`;
  /* THE RELIEF, AND THE RESIDUAL FADE. Every period that has room gets the
     asked relief exactly; the ones that do not are named with what they got,
     which is the honest statement of what is left of session 40's fade. */
  const margin = L.reliefMm.filter((r, i) => L.apexIsCrest || i !== (L.periods - 1) / 2);
  const relief = L.reliefLimited === 0
    ? `relief ${L.reliefAskedMm.toFixed(2)} mm on every tooth on the margin (depth ${L.depthBuilt.toFixed(2)}x the widest half-width ${L.peakHalfMm.toFixed(2)} mm; the first saturates at ${L.depthCap.toFixed(2)}x)`
    : `relief ${L.reliefAskedMm.toFixed(2)} mm asked, ${Math.min(...margin).toFixed(2)}–${Math.max(...margin).toFixed(2)} mm built — ${L.reliefLimited} of the margin's teeth are limited by the material at their own sinus (every period saturates above ${L.depthCap.toFixed(2)}x)`;
  return `LOBES ${count} · ${apex} · ${relief} · pitch ${L.pitchMm.toFixed(2)} mm (floor ${L.pitchFloorMm.toFixed(2)} mm) · coverage ${(L.coverage * 100).toFixed(0)}% = ${(L.coverage * 12).toFixed(1)} hours of the clock (${(2 * L.treatedHalfMm).toFixed(1)} of ${(2 * L.halfRimMm).toFixed(1)} mm of rim, from u ${L.windowU[0].toFixed(3)} over the apex and back) · crest ${L.crestShape.toFixed(2)} / notch ${L.notchShape.toFixed(2)}${L.crestAngleDeg === null ? '' : ` (crest ${L.crestAngleDeg.toFixed(1)}\u00b0`}${L.notchAngleDeg === null ? (L.crestAngleDeg === null ? '' : ')') : `${L.crestAngleDeg === null ? ' (' : ', '}notch ${L.notchAngleDeg.toFixed(1)}\u00b0 included on a ${L.angleChordMm.toFixed(2)} mm chord)`} · ${L.samplesPerLobe} stations a period demanded by this shape · ${L.rowsPerPeriod.join('/')} placed base to apex · deepest sinus ${(2 * L.sinusMinHalfMm).toFixed(2)} mm across\n`;
}

/* THE INFILL'S LINE (S3 of the Voronoi port). RULING 3 REQUIRES THE ACHIEVED
   COUNT ON SCREEN WHENEVER IT DIFFERS FROM THE ASKED ONE: density is a
   REQUEST — the blade decides how many cells can hold a printable hole — so a
   line that printed only the asked number would be naming a thing that is not
   the thing. It reads the BUILDER's own record; nothing here re-derives a
   count. Every reason the pattern is absent is a WORD, never a silence. */
/* THE TEXTURE LINE (T3): the pattern, the height, the lattice, every organ's
   count against its floor, and every refusal — a refusal is a word, never a
   silence. Null at the guard. */
function textureLine(T) {
  if (!T) return '';
  if (T.type === 'BONE') return boneLine(T);
  const word = T.type === 'PEBBLE' ? 'PEBBLE (retired)' : 'CELLULAR (retired)';
  if (T.refused === 'infill') return `TEXTURE NOT BUILT — ${word} asked while the petals are INFILLED: texture and infill are exclusive (Q9); told, not picked. Set one of them to None.\n`;
  const organs = Object.entries(T.organs || {});
  if (!organs.length) return `TEXTURE ${word} ${T.heightMm.toFixed(2)} mm — no sheet carries it on this build\n`;
  const parts = organs.map(([k, q]) => {
    /* THE ORGANS (T5): the hub, the stem and the tube ring, each refined on its
       own shipped lattice; VISIBLE faces only (Q7), the rest named */
    if (q.organ) {
      const O = q.organ;
      return `${k}${q.blades > 1 ? ` (${q.blades} rings)` : ''}: ${Number(O.shippedTris).toLocaleString('en-US')} shipped -> ${Number(O.refinedTris).toLocaleString('en-US')} lattice tris, ${O.visible} of ${O.relievable} vertices visible (${O.buried} buried, smooth; the relief fades in over ${O.fadeMm.toFixed(2)} mm from them)${O.cavityTris ? `, ${O.cavityTris} cavity tris left as shipped` : ''}${O.normalFallback ? `, ${O.normalFallback} vertices with no normal from the ${k}'s own law left smooth` : ''}, relief 0..${q.reliefMaxMm.toFixed(3)} mm`;
    }
    const ref = Object.entries(q.refused || {}).map(([w, n]) => `${n} ${k}${n === 1 ? '' : 's'} refused (${w})`).join(', ');
    const ratio = q.floorTris ? (q.skinTris / q.floorTris).toFixed(2) : '—';
    return `${k}: ${q.panels} panel${q.panels === 1 ? '' : 's'}, ${q.subRows} sub-rows, columns x${q.cfMax}, skin ${q.skinTris} tris = ${ratio}x its floor (the builder's own estimate — TX4 reads the untextured twin, ~0.1 lower)${q.floorTris && q.skinTris / q.floorTris > TEXTURE_LATTICE_BAR ? ` (PAST THE ${TEXTURE_LATTICE_BAR}x BAR BY THIS ESTIMATE)` : ''}, relief 0..${q.reliefMaxMm.toFixed(3)} mm${ref ? `; ${ref}` : ''}`;
  });
  const clamp = (T.heightClamped ? ' · height CLAMPED to its range' : '') + (T.sizeClamped ? ' · feature size CLAMPED to its range' : '');
  /* THE EDGE CAP (Eva, Oct 23): the edge actually used is printed whenever it
     differs from the ruled 0.4 mm, with the counts the decision was made on;
     past 0.5 the build stands at 0.5 and the export will be refused — said. */
  const C = T.edgeCap;
  const fmtTris = (n) => Number(n).toLocaleString('en-US');
  const edgeWords = C && C.pinned ? `on a ${T.edgeMm.toFixed(2)} mm lattice (PINNED by a capability hook — the budget cap is off)`
    : C && C.usedMm !== C.askedMm
      ? `on a ${C.usedMm.toFixed(2)} mm lattice — COARSENED from the ruled ${C.askedMm.toFixed(2)} mm to fit the ${fmtTris(C.budget)} export budget (${C.trials.map((t) => `${t.edgeMm.toFixed(2)} mm: ${fmtTris(t.tris)}`).join(', ')}; the finest edge that fits, never past ${C.capMm.toFixed(2)})${C.fits ? '' : ` — EVEN ${C.capMm.toFixed(2)} mm DOES NOT FIT (${fmtTris(C.trials[C.trials.length - 1].tris)} tris): the export will be REFUSED`}`
      : `on a ${T.edgeMm.toFixed(1)} mm lattice`;
  return `TEXTURE ${word}: ${T.heightMm.toFixed(2)} mm peak to valley, ${T.sizeMm.toFixed(1)} mm features, outward only over the bead, ${edgeWords}${clamp} — ${parts.join(' · ')}. Buried faces stay smooth (Q7); the rods (filaments, the style, anthers, pedicels, petioles) stay smooth under this retired pattern — BONE textures them where the curvature allows (Q12).\n`;
}
/* THE BONE LINE (Oct 28): every organ's count of raised vertices, why the
   rest are smooth (buried or covered by a foot, a ridge, outside a patch, a
   pore's floor), the rods the curvature mask leaves smooth, the pore floor
   and the lattice. A refusal is a word, never a silence. */
function boneLine(T) {
  if (T.refused === 'infill') return 'TEXTURE NOT BUILT — BONE asked while the petals are INFILLED: texture and infill are exclusive (Q9); told, not picked. Set one of them to None.\n';
  const B = T.bone || {};
  const fmtTris = (n) => Number(n).toLocaleString('en-US');
  const organs = Object.entries(T.organs || {}).filter(([, q]) => q.bone);
  const parts = organs.map(([k, q]) => {
    const b = q.bone;
    const lat = q.organ ? `${fmtTris(q.organ.shippedTris)} -> ${fmtTris(q.organ.refinedTris)} tris, ` : q.rod ? `rod, ${fmtTris(q.rod.shippedTris)} -> ${fmtTris(q.rod.refinedTris)} tris, ` : '';
    const hidden = b.sheet ? '' : `, ${b.buried} buried${b.covered ? `, ${b.covered} covered by a foot` : ''}`;
    return `${k}: ${lat}${b.displaced} of ${b.vertices} vertices raised (${b.ridgeOff} on a ridge, ${b.patchOff} outside a patch, ${b.poreFloor} on a pore floor${hidden}), up to ${q.reliefMaxMm.toFixed(3)} mm`;
  });
  const sm = B.smoothRods || [];
  const smWords = sm.length ? ` · ${sm.length} rod${sm.length === 1 ? '' : 's'} SMOOTH by the curvature mask (${[...new Set(sm.map((r) => r.organ))].join(', ')}; tightest radius ${(1 / Math.max(...sm.map((r) => r.kappaMin))).toFixed(2)} mm against the ${(1 / B.curvature).toFixed(2)} mm the mask allows)` : '';
  const C = T.edgeCap;
  const edgeWords = C && C.pinned ? `on a ${T.edgeMm.toFixed(2)} mm lattice (PINNED by a capability hook — the budget cap is off)`
    : C && C.usedMm !== C.askedMm
      ? `on a ${C.usedMm.toFixed(2)} mm lattice — COARSENED from the ruled ${C.askedMm.toFixed(2)} mm to fit the ${fmtTris(C.budget)} export budget (${C.trials.map((t) => `${t.edgeMm.toFixed(2)} mm: ${fmtTris(t.tris)}`).join(', ')}; the finest edge that fits, never past ${C.capMm.toFixed(2)})${C.fits ? '' : ` — EVEN ${C.capMm.toFixed(2)} mm DOES NOT FIT (${fmtTris(C.trials[C.trials.length - 1].tris)} tris): the export will be REFUSED`}`
      : `on a ${T.edgeMm.toFixed(2)} mm lattice`;
  const clamp = (T.heightClamped ? ' · height CLAMPED to its range' : '') + (B.clamped && B.clamped.length ? ` · ${B.clamped.join(', ')} CLAMPED to range` : '');
  return `TEXTURE BONE: ${T.heightMm.toFixed(2)} mm peak to valley, pores ${Number(B.poreMm).toFixed(2)} and ${Number(B.largePoreMm).toFixed(2)} mm (the floor ${Number(B.floorMm).toFixed(2)} mm, unvalidated; a pore reads round from ${Number(B.readsAtEdgeMm).toFixed(2)} mm on this lattice${Number(B.poreMm) < Number(B.readsAtEdgeMm) - 1e-9 ? ' — the fine pores are UNDER it here and draw faceted' : ''}), ${edgeWords}${clamp}, outward only, pore floors on the sheet — ${parts.join(' · ') || 'no organ carries it'}${smWords}. Smooth where the surface curves tighter than ${(1 / B.curvature).toFixed(2)} mm and outside the patches; the relief fades in over ${Number(B.fadeMm).toFixed(2)} mm.\n`;
}
function infillLine(petals) {
  const F = petals && petals[0] && petals[0].infill;
  if (!F) return '';
  if (F.refused === 'panels') return 'INFILL NOT CUT — this blade is several panels (a cleft or a fringe already owns the region the cells would take); told, not refused\n';
  if (F.refused === 'room') return `INFILL NOT CUT — the blade has no room above the solid base: the cell region starts at u ${F.floorU.toFixed(4)}, where the outline hands over from the root blend or first clears two ${F.wall.toFixed(2)} mm walls\n`;
  if (F.refused === 'bar') return `INFILL NOT CUT — no cell on this blade holds a ${F.bar.toFixed(2)} mm hole inside a ${F.wall.toFixed(2)} mm wall\n`;
  if (F.refused === 'outline') return 'INFILL NOT CUT — this blade is LOBED, and a lobe\u2019s notches make the cells non-convex, which emits more handles than holes (tunnels nobody asked for); making the two compose wants a cell construction that does not assume a convex region\n';
  /* AND A REFUSAL WORD THIS FUNCTION DOES NOT KNOW IS STILL A LINE. Falling
     through to the count would print `0 built, 0 holding a hole · holes none`
     — numbers describing a pattern that does not exist, which is the silence
     this line was written to prevent wearing a number's clothes. A new word in
     `petalInfillPlan` therefore SAYS ITSELF here until somebody writes its
     sentence, and route (z)'s own NOT CUT clause holds it. */
  if (F.refused) return `INFILL NOT CUT \u2014 the plan refused with "${F.refused}", which this read-out has no sentence for yet\n`;
  const asked = F.density;
  const count = F.achieved === asked
    ? `${F.achieved} holes, as asked`
    : `${asked} cells asked \u2192 ${F.cells} built, ${F.achieved} holding a hole`;
  const w = F.widthsMm.filter((x) => x >= F.bar).sort((a, b) => a - b);
  const span = w.length ? `${w[0].toFixed(2)}\u2013${w[w.length - 1].toFixed(2)} mm across, median ${w[w.length >> 1].toFixed(2)}` : 'none';
  /* THE PASS COUNT IS TOLD BECAUSE THE CAP IS: a state that reaches it has
     been truncated rather than converged, and that is a fact about the state
     and not about the constant. */
  const passes = F.passesUsed >= F.passCap
    ? ` \u00b7 the drop reached its cap of ${F.passCap} passes and stopped there`
    : F.passesUsed ? ` \u00b7 ${F.passesUsed} drop pass${F.passesUsed === 1 ? '' : 'es'}` : '';
  const plan = F.metricPlan ? 'surface' : 'flat (the map is affine here, so a plan millimetre IS a millimetre of material)';
  /* S4'S SECOND LINE — WHERE THE HOLES ARE ALONG THE BLADE, from the builder's
     own `holeU`. Eva's complaint was that the tip and base stay solid and the
     holes bunch in the middle; that is a claim about this distribution, so
     the read-out prints it in fifths of the drawn length rather than leaving
     it to the eye. Then the four levers as the plan read them, and the basal
     boundary's travel — DEAD where the derived floor already sits at the
     root blend's station, and said so. */
  const hu = F.holeU || [];
  const fifths = [0, 0, 0, 0, 0]; for (const u of hu) fifths[Math.min(4, Math.floor(u * 5))]++;
  const where = hu.length ? `holes along the blade u ${Math.min(...hu).toFixed(2)}\u2013${Math.max(...hu).toFixed(2)}, by fifths base\u2192tip ${fifths.join(' / ')}` : 'holes along the blade: none';
  const trav = F.baseTravel > 0
    ? `solid base ${(F.baseFrac * 100).toFixed(0)}% of the travel u ${F.baseFloorU.toFixed(3)}\u2192${(F.baseFloorU + F.baseTravel).toFixed(3)}, cells start at u ${F.floorU.toFixed(3)}`
    : `solid base: DEAD on this blade (the derived floor u ${(F.baseFloorU ?? F.floorU).toFixed(3)} is already at the root blend\u2019s station), cells start at u ${F.floorU.toFixed(3)}`;
  const levers = `relaxation ${F.passes} pass${F.passes === 1 ? '' : 'es'}, density law ${Number(F.gamma).toFixed(2)}, stretch ${Number(F.aniso).toFixed(2)}x`;
  const cap = F.densityCap !== null && F.densityCap !== undefined
    ? (F.densityCap >= INFILL_DENSITY_RANGE_MAX ? ` \u00b7 still gaining holes at the top of the density range` : ` \u00b7 most holes (${F.densityBest}) by ${F.densityCap} cells asked, the travel above adds none (swept every 4th density)`)
    : '';
  /* S5'S THIRD LINE — THE HOLE RIMS, from the builder's own `bead` record.
     The narrow-span clamp is TOLD, as Eva asked: the bead's radius is the
     wall's 0.45 share wherever the room arm binds, and that is every hole of a
     1.00 mm wall, so the line says so and says what is left down the wall's
     centre. A hole whose grown ring could not be triangulated keeps a flat
     wall and is counted here rather than drawn quietly. */
  const B = F.bead;
  const rims = B
    ? `INFILL hole rims: a ${B.radiusMm.toFixed(2)} mm half-round bead on ${B.beadedHoles} of ${F.achieved} holes`
      + (B.clamps.length ? ` \u00b7 CLAMPED from ${RIM_BEAD_RADIUS_MM.toFixed(2)} mm by the ${F.wall.toFixed(2)} mm wall on ${B.clamps.length} hole${B.clamps.length === 1 ? '' : 's'}, ${(F.wall - 2 * B.radiusMm).toFixed(2)} mm of flat left down each wall` : '')
      + (B.flatHoles ? ` \u00b7 ${B.flatHoles} hole${B.flatHoles === 1 ? '' : 's'} kept a FLAT WALL (the grown ring could not be triangulated)` : '')
      + ` \u00b7 the aperture is the ruled hole at the mid-plane and ${(2 * B.radiusMm).toFixed(2)} mm wider at the faces\n`
    : '';
  return `INFILL ${count} \u00b7 ${F.solid} cell${F.solid === 1 ? '' : 's'} left solid \u00b7 holes ${span} \u00b7 wall ${F.wall.toFixed(2)} mm, bar ${F.bar.toFixed(2)} mm, measured on the ${plan}${passes}\n`
    + `INFILL ${where} \u00b7 ${levers} \u00b7 ${trav}${cap}\n` + rims;
}

/* THE ROOT-BLEND LINE IS RETIRED (created by session 36's ruling, retired by
   Eva's on Sep 20). It printed at three or more layers that the inner whorls'
   short petals fold through themselves at the root. THE DEFECT IT DESCRIBED
   DOES NOT EXIST: the foot-to-blade seam clearance (#210, a24ed69) fixed it,
   and the census reads 0 within-shell pairs at every depth 1..6 at the
   defaults — docs/bloom-root-blend-superseded.md has the measurements.
   NO REPLACEMENT WARNING. Re-pointing the line at the EFFECTIVE TILT PAST 90
   fold that IS still there was offered and DECLINED: no line rather than one
   to maintain. Do not re-add either. The panel gate's route (v), which
   asserted this line in both directions, went with it. */

/* THE SLOT-ROLE AND ALL-PETALS LINES ARE RETIRED with the role machinery
   (the role-retirement session, Q3.4): a scope's values are told on the
   control it edits (the scope notes), not on the read-out. */

/* ===================================================================
   THE FAN LINE — the arrangement's derived shape, and the arc limit's
   "(CAPPED)".

   THREE THINGS A VISITOR CANNOT OTHERWISE SEE. The TOTAL petal count, because
   `petalCount` is hidden under FAN and this is the number it used to show.
   The ARC and the NOTCH, because both are derived from two controls and
   neither is at a slider. And whether the arc limit BIT — the step saturates
   before the spacing slider ends, and a slider that has stopped moving must
   say so rather than read as broken. That is the same "(CLAMPED)" discipline
   the roll floor, the tip floor and both foot clamps carry, arriving on the
   fourth placement.

   The asked-for and built steps both come from footRing()'s own `fan` record
   rather than being recomputed here — a read-out that re-derived the cap
   would be a second copy of the clamp law, and the second copy is the one
   that drifts. Returns '' under every other placement, so the line is simply
   absent rather than saying "not a fan". */
/* THE SIZE VARIANCE LINE (organic variance, build 1) — the field's law told
   in the builder's own numbers: the amount as the range of sizes it reaches,
   the wave or the ramp, the slot count the wave is sampled on, and the
   ALIASED clause (ruling 4: told, never capped) from the record's own
   threshold. Absent at amount 0, where the record is null. */
/* THE TUBE LINE (corolla fusion): per fused whorl, the asked and BUILT panel
   count (the snap's own answer), the ring's top row and station, the flare's
   rows and the notch — each read off the builder's own record, never re-derived
   here. Absent while every whorl is FREE. */
function tubeLine(t) {
  if (!t || !t.active || !t.rings.length) return '';
  return t.rings.map((r) => {
    const lay = t.layers[r.layer];
    const kWord = r.k === 0 ? 'one closed ring' : `${r.k} panel${r.k === 1 ? '' : 's'}`;
    const snap = lay.snapped ? ` (asked ${lay.asked}, SNAPPED to the nearest valid count)` : '';
    const cut = r.notch.sinuses.filter((x) => x.r > 0).length;
    const open = r.notch.sinuses.filter((x) => x.W > 0).length;
    const notch = cut ? `${cut} sinus${cut === 1 ? '' : 'es'} notched` : open ? `${open} open sinus${open === 1 ? '' : 'es'} too narrow for the bead to show a notch — none cut` : 'every sinus closed — no notch';
    return `TUBE${t.layers.length > 1 ? ` whorl ${r.layer + 1}` : ''}: ${kWord}${snap}, fused to u ${r.uTop.toFixed(3)} (${r.rows} rows, asked ${t.h.toFixed(2)}), flare ${r.flare.rows} of ${r.flare.need} rows, ${notch}; ring ${r.ringTris.toLocaleString()} tris\n`;
  }).join('');
}
function varianceLine(v) {
  if (!v) return '';
  const cyc = `${v.frequency} cycle${v.frequency === 1 ? '' : 's'}`;
  const law = v.frequency === 0
    ? (v.fan ? 'a ramp outward from the mirror line' : `a ramp round the flower with its seam at ${v.phaseDeg.toFixed(0)}°`)
    : (v.fan ? `${cyc} per turn, even about the mirror line (phase inert)` : `${cyc} round the flower, phase ${v.phaseDeg.toFixed(0)}°`);
  const nyq = Number.isInteger(v.nyquist) ? `${v.nyquist}` : v.nyquist.toFixed(1);
  return `SIZE VARIANCE ±${(v.amount * 100).toFixed(0)}%: petals from ${v.lo.toFixed(2)}x to ${v.hi.toFixed(2)}x of nominal — ${law}, on ${v.n} slots${v.fan ? ` over a ${(2 * v.halfSpanDeg).toFixed(0)}° fan` : ''}`
       + (v.aliased ? ` — ALIASED: above ${nyq} cycles the wave cannot be drawn on ${v.n} slots and reads as SCATTER (told, not capped)` : '')
       + `\n`;
}
/* THE FORM VARIANCE LINE (organic variance, build 2) — the amount as the
   per-petal reach of each varied control, the RANGE each control actually
   spans over the petals BUILT (read off each petal's own `applied`, never
   recomputed here), how many petals the headroom held in (and how many the one clamp still bit — only a role row can put a base out of range now), and the ALIASED clause
   from the record's own threshold. Absent at amount 0. */
function formVarianceLine(v, petalsAll) {
  if (!v) return '';
  const ps = (petalsAll || []).filter(Boolean);
  const span = (k, d) => {
    if (!ps.length) return 'no petal built';
    const xs = ps.map((p) => p.applied[k]);
    return `${Math.min(...xs).toFixed(d)} to ${Math.max(...xs).toFixed(d)}`;
  };
  const clamped = ps.filter((p) => p.formClamped && p.formClamped.length).length;
  const scaled = ps.filter((p) => p.formScaled && p.formScaled.length).length;
  const cyc = `${v.frequency} cycle${v.frequency === 1 ? '' : 's'}`;
  const law = v.frequency === 0
    ? (v.fan ? 'a ramp outward from the mirror line' : `a ramp round the flower with its seam at ${v.phaseDeg.toFixed(0)}°`)
    : (v.fan ? `${cyc} per turn, even about the mirror line (phase inert)` : `${cyc} round the flower, phase ${v.phaseDeg.toFixed(0)}°`);
  const nyq = Number.isInteger(v.nyquist) ? `${v.nyquist}` : v.nyquist.toFixed(1);
  const curveMode = ps.length && ps[0].spine && ps[0].spine.curveMode;
  return `FORM VARIANCE ${(v.amount * 100).toFixed(0)}%: over the ${ps.length} petal${ps.length === 1 ? '' : 's'} built, curl ${curveMode ? 'INERT (the spine is the drawn curve)' : span('petalSpineCurl', 0) + '°'}, cup ${span('petalCup', 2)}, twist ${span('petalTwist', 0)}° — ${law}, cup / curl / twist offset 0° / 120° / 240° along it, on ${v.n} slots`
       + (scaled ? ` — ${scaled} petal${scaled === 1 ? '' : 's'} held inside a control's range by the headroom on that side` : '')
       + (clamped ? ` — ${clamped} petal${clamped === 1 ? '' : 's'} CLAMPED to a control's own range` : '')
       + (v.aliased ? ` — ALIASED: above ${nyq} cycles the wave cannot be drawn on ${v.n} slots and reads as SCATTER (told, not capped)` : '')
       + `\n`;
}
/* THE SPACING VARIANCE LINE (organic variance, build 3) — the pitch law told
   in the builder's own numbers: the range the pitch density reaches, the floor
   it guarantees (1 - A on a ring, (1 - A) / (1 + A) on a fan whose span is
   held), the tightest pitch the whorl primitive actually EMITTED (the told
   flag's own reading), and the ALIASED clause. No clamp exists to report:
   the pitch stays positive for every amount the control reaches, so the
   azimuth map is strictly monotonic and no petal passes its neighbour.
   Absent at amount 0. */
function spacingVarianceLine(v, nb) {
  if (!v) return '';
  const cyc = `${v.frequency} cycle${v.frequency === 1 ? '' : 's'}`;
  const law = v.frequency === 0
    ? (v.fan ? 'a ramp outward from the mirror line' : `a ramp round the flower with its seam at ${v.phaseDeg.toFixed(0)}°`)
    : (v.fan ? `${cyc} per turn, even about the mirror line (phase inert)` : `${cyc} round the flower, phase ${v.phaseDeg.toFixed(0)}°`);
  const nyq = Number.isInteger(v.nyquist) ? `${v.nyquist}` : v.nyquist.toFixed(1);
  const tight = nb && nb.pitch ? `, the tightest emitted pitch ${nb.pitch.ratio.toFixed(3)}x` : '';
  return `SPACING VARIANCE ${(v.amount * 100).toFixed(0)}%: pitch density from ${(1 - v.amount).toFixed(2)}x to ${(1 + v.amount).toFixed(2)}x of nominal — ${law}, on ${v.n} slots${v.fan ? ` over a ${(2 * v.halfSpanDeg).toFixed(0)}° fan whose span is held (renormalised)` : ''}; every pair of petals at least ${v.floor.toFixed(3)}x the angle it stood apart at amount 0, by construction${tight}`
       + (v.aliased ? ` — ALIASED: above ${nyq} cycles the wave cannot be drawn on ${v.n} slots and reads as SCATTER (told, not capped)` : '')
       + `\n`;
}
/* THE NEIGHBOURS LINE — THE TOLD FLAG (Eva's ruling 1, the condition of the
   variance family: the generator REPORTS the tightest pitch, the nearest feet
   and the nearest petal approach, and clamps nothing). Every number is the
   builder's own `neighbour` record, on every build whatever the amount, and
   every one names its sampling: the pitch is read off the emitted azimuths,
   the feet are centre to centre in foot widths (the crowding instrument's own
   `nearestFeet`), and the approach is the mid-surface distance over ALL pairs
   on the builder's lattice above u = ROOT_BLEND_END, less one sheet — a
   negative number is the skins passing through each other, which the shipping
   default does (an ACCEPTED LOOK, ruling 1). The crowding raster's D_max is
   the gates' instrument and is not printed here. */
function neighbourLine(nb, mode) {
  const parts = [];
  if (nb.pitch) parts.push(`tightest pitch ${nb.pitch.tightDeg.toFixed(2)}° = ${nb.pitch.ratio.toFixed(3)}x the nominal ${nb.pitch.nominalDeg.toFixed(2)}°`);
  if (Number.isFinite(nb.feet.q)) parts.push(`nearest feet ${nb.feet.d.toFixed(2)} mm centre to centre = ${nb.feet.q.toFixed(3)} foot widths (${nb.feet.a} ~ ${nb.feet.b})`);
  if (nb.blade) {
    const b = nb.blade;
    const verdict = b.crossing ? `SKINS PASS THROUGH EACH OTHER by ${(-b.skinGapMm).toFixed(3)} mm` : b.underFeature ? `UNDER THE ${MIN_FEATURE_MM.toFixed(2)} mm PRINTABLE GAP` : 'clear of the printable gap';
    parts.push(`nearest petal approach ${b.skinGapMm.toFixed(3)} mm skin to skin — ${verdict} (laminae ${b.laminaMm.toFixed(3)} mm apart less the ${b.sheetMm.toFixed(2)} mm sheet, petals ${b.pair[0]} and ${b.pair[1]} at r ${b.at.r.toFixed(1)} z ${b.at.z.toFixed(1)}; all ${b.pairs} pairs of ${b.petals} on the builder's lattice above u ${b.uMin.toFixed(2)})`);
  }
  if (!parts.length) return '';
  return `NEIGHBOURS (${mode}, told, never clamped): ${parts.join(' · ')}\n`;
}
function fanLine(fr) {
  const f = fr.fan;
  if (!f) return '';
  return `fan ${f.spanDeg.toFixed(1)}° arc · ${f.gapDeg.toFixed(1)}° gap at the back`
       + ` · step ${f.stepDeg.toFixed(2)}°`
       + (f.capped ? ` (CAPPED from ${f.askedDeg.toFixed(0)}° — the ${f.limitDeg}° arc limit keeps the two sides apart)` : '')
       + `\n`;
}

/* THE STAMENS LINE (session 21) — the androecium told in the numbers a
   visitor cannot set, all of them footRing()'s own or the builder's own,
   never re-derived here: the layout, the disc radius beside the reference it
   multiplies (and "(CLAMPED at the hub radius)" when the range ran out —
   the roll floor's discipline), the filament and the pill, the petal-root
   annulus FLAG with the clear disc beside it, the two distance flags, and the
   spine floor told (never clamped). Then the SLENDERNESS line (Q7), verbatim
   tagged: telemetry, never a gate, until a coupon is printed. Absent when the
   androecium is absent, so the lines simply are not there. */
/* THE INNER-LIMIT CLAUSE (session 24) rides on the same line and is DISC-ONLY,
   because the limit is only a thing the disc's law does — the ring puts every
   stamen at R and cannot start inside the style, so a clause there would be a
   claim nothing can make. Two arms, both footRing()'s own numbers: where the
   annulus starts and what the limit is made of, or NO ROOM when the disc is
   inside the limit and every stamen stands on the rim (told, never refused —
   the crosses-axis precedent). JS5 asserts both arms against the owner, in
   both directions. */
/* THE FILAMENT-AGAINST-STYLE CLAUSE (session 23) rides on the same line, on
   the ROOTS FUSE pattern: present exactly when both parts are built, the
   builder's own nearest approach and the height it happens at, and the flag
   when that distance is under one filament radius plus one style radius —
   the two tubes intersect there. A FLAG, never a gate (Eva, Sep 6): the
   crossing exports watertight and one piece, which is the invariant working. */
function stamenLine(fr, stamens, near, mode, fs = null) {
  const A = fr.androecium;
  if (!A) return '';
  const under = stamens.filter((s) => s.law.underFloor).length;
  return `STAMENS ${A.count} on ${A.layout === 'DISC' ? 'a Vogel disc' : 'one ring'} · radius ${A.radius.toFixed(2)} mm (${mode}) = ${A.spread.toFixed(2)}x the reference ${A.derivedRadius.toFixed(2)} mm (the filaments' own area rule)`
       + (A.onAxis ? ` (ON THE AXIS: the hub, ${A.hubRadius.toFixed(2)} mm, is narrower than a filament radius — ${A.asked.toFixed(2)} mm asked)` : A.clamped ? ` (CLAMPED at the hub radius ${A.hubRadius.toFixed(2)} mm less a filament radius — ${A.asked.toFixed(2)} mm asked; ${A.saturation.toFixed(2)}x is as far as this hub goes, the slider above it is dead here)` : '')
       + (A.layout === 'DISC'
         ? (A.noRoom
           ? ` · NO ROOM FOR THE INNER LIMIT: the disc, ${A.radius.toFixed(2)} mm, is inside the ${A.innerLimit.toFixed(2)} mm limit, so every stamen stands on the rim (told, never refused)`
           : ` · the disc runs from ${A.innerUsed.toFixed(2)} mm out — a filament radius plus a style radius, where a filament's tube clears a style's — in equal-area annuli`)
         : '')
       + ` · filament ${A.diameter.toFixed(2)} × ${A.length} mm${A.lengthVariance > 0 ? ` ±${Math.round(A.lengthVariance * 100)}% random per stamen (seeded from its index) → ${A.lengthMinMm.toFixed(1)}–${A.lengthMaxMm.toFixed(1)} mm built${A.lengthsClamped ? `, ${A.lengthsClamped} of ${A.count} CLAMPED to the ${A.lengthRange[0]}–${A.lengthRange[1]} mm range (told, never silent)` : ''}` : ''}${A.curlDeg !== 0 ? `, curl ${A.curlDeg}°` : ', straight'}${A.coil && A.coil.mode === 'BRAIDED' ? ` · BRAIDED — ONE bundle: every strand gathers from its own root onto the bundle's axis (the centre, the style's) in at most ${A.coil.gatherMaxMm.toFixed(1)} mm, then winds round it at r ${A.coil.radiusMm} mm × ${A.coil.turnsAsked} turns asked (${A.coil.revolutionsMin.toFixed(2)}–${A.coil.revolutionsMax.toFixed(2)} laid), ${A.coil.rows} stations a strand${A.coil.strandsScoped ? `, ${A.coil.strandsScoped} strand${A.coil.strandsScoped === 1 ? '' : 's'} with values of ${A.coil.strandsScoped === 1 ? 'its' : 'their'} own` : ''}${A.coil.gathersClampedCount ? `, ${A.coil.gathersClampedCount} of ${A.count} too short to gather all the way (they lean toward the bundle and do not wind, told)` : ''}${A.coil.foldClampedCount ? `, ${A.coil.foldClampedCount} of ${A.count} laid closer than asked by the FOLD LIMIT (the curled bundle's radius less one sheet thickness, told)` : ''}${A.coil.turnsClampedCount ? `, ${A.coil.turnsClampedCount} of ${A.count} with the turns CLAMPED to ${A.coil.turnsMin.toFixed(2)}–${A.coil.turnsMax.toFixed(2)} by the curvature floor (one sheet thickness of radius)` : ''} — tightest radius of curvature ${A.coil.peakRadiusMm.toFixed(3)} mm${A.coil.underFloorCount ? `, ${A.coil.underFloorCount} UNDER ONE SHEET THICKNESS with the filament curl (told, never clamped)` : ''}; the strands touch and cross one another by design (separate closed solids, overlapping — the export contract's own case)` : ''}${A.coil && A.coil.mode !== 'BRAIDED' ? ` · COILED (independent) r ${A.coil.radiusMm} mm × ${A.coil.turnsAsked} turns asked, each at its own phase (seeded from its index), ${A.coil.rows} stations a rod${A.coil.turnsClampedCount ? `, ${A.coil.turnsClampedCount} of ${A.count} CLAMPED to ${A.coil.turnsMin.toFixed(2)}–${A.coil.turnsMax.toFixed(2)} turns by the curvature floor (one sheet thickness of radius)` : ''}${A.coil.radiusClampedCount ? `, ${A.coil.radiusClampedCount} with the radius CLAMPED to ${A.coil.radiusMinMm.toFixed(2)} mm (too short to ramp it in)` : ''} — tightest radius of curvature ${A.coil.peakRadiusMm.toFixed(3)} mm${A.coil.underFloorCount ? `, ${A.coil.underFloorCount} UNDER ONE SHEET THICKNESS with the filament curl (told, never clamped)` : ''}` : ''} · anther ${A.anther.lumps === 1 ? 'PILL' : `${A.anther.lumps} LOBES`} ${A.anther.diameter.toFixed(2)} × ${A.anther.length.toFixed(2)} mm`
       + (A.inPetalRootAnnulus ? ` · ${A.inPetalRootAnnulus} of ${A.count} STAND INSIDE THE PETAL-ROOT ANNULUS (clear disc ${A.clearRadius.toFixed(2)} mm — a flag, never a refusal)` : ` · all inside the clear disc (${A.clearRadius.toFixed(2)} mm)`)
       + (near ? ` · nearest roots ${near.root.mm.toFixed(2)} mm${near.root.mm < A.diameter ? ' (ROOTS FUSE)' : ''}, nearest anthers ${near.apex.mm.toFixed(2)} mm${near.apex.mm < A.anther.diameter ? ' (ANTHERS TOUCH)' : ''}${A.anther.lumps > 1 ? ', on each anther\'s first lobe' : ''}` : '')
       + (under ? ` · bend radius UNDER ONE FILAMENT DIAMETER on ${under} of ${A.count} (told, not clamped)` : '')
       + (fs ? ` · nearest filament to the style ${fs.mm.toFixed(2)} mm at ${fs.z.toFixed(1)} mm up${fs.crossing ? ` (FILAMENT AGAINST STYLE: under ${fs.threshold.toFixed(2)} mm, the two tubes cross — a flag, never a refusal)` : ` (clear of it by more than ${fs.threshold.toFixed(2)} mm)`}` : '')
       + `\n`;
}

/* THE TIP LINE (session 29's ANTHER line, ONE function for both tips since
   session 30) — the seven told in the owner's own numbers, none re-derived
   here: the two proportions with the millimetres they resolve to, the
   OUTLINE (and, at a roundedness of exactly 1, that the two controls below
   it are inert rather than merely hidden), the LATTICE the point count
   derived, the WAIST against the print floor with `UNMEASURED — no coupon
   has been printed` verbatim, and the two flags — the band floored at a
   sphere, coincident lobes at a spread of 0. `name` is ANTHER or STIGMA and
   `rod` the filament or the style; the ANTHER line's text is character for
   character what session 29 shipped (the panel gate's route (t) reads it).
   Absent when the part is absent. Every number is footRing()'s own record. */
function tipLine(name, rod, a) {
  if (!a) return '';
  const sh = a.shape, circle = sh.roundedness === 1;
  return `${name} ${a.sizeFactor.toFixed(2)}x ${rod} = ${a.diameter.toFixed(2)} mm across (${a.mode}) · ${a.elongation.toFixed(2)}x its own diameter = ${a.length.toFixed(2)} mm long${a.bandFloored ? ' (A SPHERE — the band FLOORED so no triangle has zero area)' : ''}`
       + ` · outline ${circle ? 'a CIRCLE (roundedness 1 — the points and the pinch are INERT here, exactly, not merely hidden)' : `roundedness ${sh.roundedness.toFixed(2)}, ${sh.lobes}-fold, pinch ${sh.pinch.toFixed(2)}`}`
       + ` · revolved through ${a.sides} sides`
       + ` · waist ${a.waistMm.toFixed(2)} mm against the ${a.minRadiusMm.toFixed(2)} mm floor`
       + (a.underFloor ? ' — THE WHOLE TIP IS UNDER IT (told, never refused)'
         : a.pinchFloored ? ` — PINCH CLAMPED to ${sh.pinch.toFixed(2)} from ${a.pinchAsked.toFixed(2)}` : '')
       + ' (UNMEASURED — no coupon has been printed)'
       + ` · ${a.lumps === 1 ? 'one lobe' : `${a.lumps} lobes`} at ${a.spreadDeg}° off ${rod}${a.lumpsCoincident ? ' — COINCIDENT: duplicate geometry, told, never refused' : ''}`
       + `\n`;
}
function antherLine(fr, mode) { return fr && fr.androecium ? tipLine('ANTHER', 'the filament', { ...fr.androecium.anther, mode }) : ''; }
function stigmaLine(fr, mode) { return fr && fr.gynoecium ? tipLine('STIGMA', 'the style', { ...fr.gynoecium.lobe, mode }) : ''; }

/* THE STYLE LINE (session 22) — the gynoecium told in the owner's and the
   builder's own numbers: the rod, the stigma's count and aim (its seven have
   their own STIGMA line below, session 30), where the
   stigma's top stands (and, with an androecium, how far ABOVE or BELOW the
   highest anther — the pair on the sheet, said in millimetres), the
   wider-than-the-hub corner and the petal-root annulus as FLAGS, the spine
   floor told. Absent when the gynoecium is absent. */
/* THE STEM LINE (session 43). TOTAL AND VISIBLE ARE TWO NUMBERS, and the read-out
   says both (Eva, Sep 13): on a domed head the attachment face is high inside the
   bowl, so the head swallows part of the stem, and a user asking for 30 mm and
   being shown only "30" while 22 is visible would think it was broken. The hidden
   part is DERIVED per build by the plan's one owner — never tabulated — and is 0
   on a flat head by the same construction.
   THE JOIN IS TOLD, NOT TUNED: it has no control, so the only way anyone can see
   what it did is for this line to say it. CLAMPED AND TOLD is the project's own
   form, and the bore's closing at Eva's floor is exactly that. */
/* THE LEAVES LINE. Everything this feature clamps, it TELLS — the top inset
   raised off the flower's stem-fraction to what the leaf itself needs, the node
   count giving way at the pitch floor where the span cannot hold it, the head
   that cannot be cleared at all on a leaf longer than its stem, and the
   OVERHANG, which ruling 7 made a printability question and which the ruled
   default sits on the wrong side of. SLENDERNESS joins the stamens' and the
   style's line verbatim: nothing here has ever been printed. */
/* THE INFLORESCENCE LINE. Everything this feature clamps, it TELLS from the
   OWNER's own record: the node count giving at the pitch floor, the pedicel's
   DERIVED diameter and whether the print floor took it off the area rule, how
   much of the stem's wall it crosses (which is what makes the raceme ONE
   piece rather than N+1), the top inset raised to clear the head and whether
   it managed to, and the floret's size clamped into the petal slider's own
   range. And the one thing that is not a clamp but is an absence: the GRID
   export writes the head at the origin only, so a raceme's florets are not in
   it — said here rather than discovered by a reader of a nearly-empty .glb. */
/* THE OVERTOP LINE — which node, if any, stands above the floor the top node
   was inset under. Node 0 is the law's own subject and is never named here
   (ID9 (d) asserts it); a lower node is a LONGER pedicel's (the gradient),
   told with the intrusion in millimetres, read off the builder's per-node
   maxima and the plan's own floor and gap — the same two numbers the law used. */
function overtopLine(plan, builtInflo) {
  const by = builtInflo && builtInflo.floretsMaxZByNode;
  if (!plan.insetSatisfied || !Array.isArray(by) || !Number.isFinite(plan.headFloorZ)) return '';
  const bar = plan.headFloorZ - plan.insetGapMm;
  let worst = -1, worstZ = -Infinity;
  for (let i = 1; i < by.length; i++) if (Number.isFinite(by[i]) && by[i] > bar && by[i] > worstZ) { worst = i; worstZ = by[i]; }
  if (worst < 0) return '';
  const intr = worstZ - bar;
  const over = by.filter((z, i) => i > 0 && Number.isFinite(z) && z > bar).length;
  return ` — A LOWER FLORET OVERTOPS THE HEAD: node ${worst + 1}'s (${plan.pedicelLensMm[worst].toFixed(1)} mm pedicel, ${(plan.pedicelLensMm[worst] / Math.max(1e-9, plan.pedicelLensMm[0])).toFixed(2)}x the top's) stands ${intr.toFixed(2)} mm into the gap under the head${over > 1 ? ` (${over} of ${by.length - 1} lower nodes do)` : ''} — the inset is the TOP floret's reach and a longer lower pedicel outreaches it (told, never clamped)`;
}

function infloLine(plan, builtInflo) {
  /* THE COMPOUND UMBEL (the mophead): rays, sub-umbels, the floret floor, the
     reduced lattice and the budget clamp — asked against built, always. */
  if (plan.compound) {
    const sb = builtInflo && builtInflo.sub, cl = plan.budgetClamp, F = sb && sb.plan, bf = F && F.bodyFloor;
    const lat = sb && sb.floretUnit && sb.floretUnit.lattice && sb.floretUnit.lattice[0];
    return `\n     INFLORESCENCE a COMPOUND UMBEL (depth 2) · ${plan.umbelCount} rays of ${plan.pedicelLenMm.toFixed(0)} mm at ${plan.angleDeg} deg, ${(2 * plan.pedicelR).toFixed(2)} mm across, from a boss ${(2 * plan.knot.radiusMm).toFixed(2)} mm across`
      + `\n     FLORETS ${cl ? `${cl.builtFlorets} built of ${cl.askedFlorets} asked (${cl.floretsPerRay} a ray of ${cl.floretsPerRayAsked})` : `${plan.umbelCount * plan.floretsPerRay}`}`
      + (cl && cl.clamped ? ` — BUDGET CLAMPED: one floret is ${cl.floretTris.toLocaleString('en-US')} tris (measured), so the asked ${cl.askedFlorets} would be ${cl.askedTotal.toLocaleString('en-US')}; ${cl.predictedTotal.toLocaleString('en-US')} built against the ${cl.budget.toLocaleString('en-US')} budget (the export never refuses for this)` : cl ? ` · ${cl.predictedTotal.toLocaleString('en-US')} tris predicted against the ${cl.budget.toLocaleString('en-US')} budget` : '')
      + (F ? `\n     FLORET ${F.floretPetals} petals at ${F.petalLength.toFixed(2)} x ${F.petalWidth.toFixed(2)} mm (${F.scaleBuilt.toFixed(3)}x the head's own)` : '')
      + (bf ? ` · FLORET FLOOR ${bf.lengthMm.toFixed(2)} x ${bf.widthMm.toFixed(2)} mm (${bf.scale.toFixed(3)}x — the least scale at which a petal still keeps its full sheet body ${bf.taperMm.toFixed(1)} mm in from both margins and the drawn tip, past the root blend)${F.sizeClamped ? ' — FLOORED' : ''}` : '')
      + (lat && lat.lattice ? ` · the REDUCED lattice: ${lat.lattice.columns} columns, a ${lat.lattice.beadCap}-segment bead (a declared exception to the edge profile's four, florets of a depth-2 umbel only)` : '')
      + (sb ? ` · ${sb.floretUnit.tris.toLocaleString('en-US')} tris a floret, ${builtInflo.unitTris.toLocaleString('en-US')} a sub-umbel, ${builtInflo.tris.toLocaleString('en-US')} in all` : '')
      + (F ? `\n     SUB-UMBEL ${sb.count} florets on ${F.pedicelLenMm.toFixed(0)} mm pedicels at ${F.angleDeg} deg off each ray, ${(2 * F.pedicelR).toFixed(2)} mm across, rooted in a boss ${(2 * sb.knot.radiusMm).toFixed(2)} mm across at the ray's end` : '');
  }
  const per = plan.perNode;
  const n = builtInflo ? builtInflo.count : plan.built;
  return `\n     INFLORESCENCE ${plan.type} · ${n} floret${n === 1 ? '' : 's'} on ${plan.nodes} node${plan.nodes === 1 ? '' : 's'} · ${plan.phyllotaxy} (${per} a node)`
    + (plan.nodesClamped ? ` — NODE COUNT CLAMPED ${plan.nodesAsked} -> ${plan.nodesBuilt}: the span left cannot hold them ${plan.pitchFloorIsFlorets ? 'a floret' : 'a pedicel'} apart` : '')
    + `\n     FLORET ${plan.floretPetals} petals at ${plan.petalLength.toFixed(1)} x ${plan.petalWidth.toFixed(1)} mm (${plan.scale.toFixed(2)}x the head's own)`
    + (plan.sizeClamped ? ` — CLAMPED from ${plan.lengthAsked.toFixed(1)} x ${plan.widthAsked.toFixed(1)} mm at the petal sliders' own floors` : '')
    + (builtInflo ? ` · ${builtInflo.unitTris.toLocaleString('en-US')} tris at the top node, ${builtInflo.tris.toLocaleString('en-US')} in all` : '')
    + `\n     PEDICEL ${plan.pedicelLenMm === 0 ? 'SESSILE' : `${plan.pedicelLenMm.toFixed(0)} mm`} at the top, ${plan.angleDeg} deg · ${(2 * plan.pedicelR).toFixed(2)} mm across`
    + (plan.corymb || plan.graded
        ? ` · ${plan.corymb ? 'LEVEL TOPS (a corymb, solved)' : `GRADED ${Number(plan.gradient).toFixed(2)}x`}: ${plan.pedicelLensMm.map((L) => L.toFixed(1)).join(' / ')} mm top to bottom`
          /* THE GRADIENT'S CAP (build 3, ruling 2): the lowest floret may not
             rise past the floor the top one was inset under, so the ramp is
             capped where it would — told with the asked value beside it. */
          + (plan.gradientClamped ? ` — GRADIENT CLAMPED at ${Number(plan.gradientMax).toFixed(2)}x (asked ${Number(plan.gradientAsked).toFixed(2)}x): past it the lowest floret would overtop the head` : '')
          + (builtInflo && builtInflo.units ? ` · ${builtInflo.units.length} distinct floret build${builtInflo.units.length === 1 ? '' : 's'}` : '')
          + (plan.lengthsClamped ? ` — CLAMPED at ${plan.lenCeilMm} mm, the pedicel's own ceiling as a stem` : '')
        : '')
    + (plan.corymbInert ? ` · LEVEL TOPS INERT: at ${plan.angleDeg} deg a pedicel cannot raise its head by lengthening` : '')
    + (plan.corymb && builtInflo && builtInflo.headSpreadMm !== null ? ` · the heads span ${builtInflo.headSpreadMm.toFixed(3)} mm in height, MEASURED off the placements` : '')
    + (plan.sessileNodes.some((x) => x) ? ` · ${plan.sessileNodes.filter((x) => x).length} node${plan.sessileNodes.filter((x) => x).length === 1 ? '' : 's'} SESSILE: the floret's own hub rooted to the bore, one wall deep (ruling 7)` : '')
    + (plan.pedicelRClamped
        ? ` — FLOORED: the area rule asks ${(2 * plan.areaRuleR).toFixed(2)} mm for ${plan.built} off a ${(2 * plan.outerR).toFixed(2)} mm stem and nothing here prints thinner than ${(2 * plan.pedicelRFloor).toFixed(2)} mm`
        : ` — the area rule's own (r_stem / sqrt(${plan.built}))`)
    + (plan.crossesSolidMm === null ? ''
      : `\n     ROOTED at r = ${plan.rootR.toFixed(2)} mm, the stem WALL's mid-thickness · crosses ${plan.crossesSolidMm.toFixed(2)} mm of solid`
        + (plan.crossesSolidMm > 0 ? '' : ' — CROSSES NOTHING: this pedicel is a detached shell that still exports watertight (told, never refused)'))
    + `\n     NODES top ${plan.nodeDepthsMm[0].toFixed(1)} mm below the hub`
    /* THE INTERNODE FLOOR IS THE FLORETS' OWN (build 3, ruling 1): derived
       from the floret unit's emitted triangles — the shift at which a floret
       provably clears the one above it by the printable gap, over every
       azimuth pair the phyllotaxy produces — never a number typed here. The
       rods' own floor (two pedicel radii) stands beside it and binds only
       where the florets are smaller than their stalks are thick. */
    + (plan.nodeDepthsMm.length > 1
        ? ` · INTERNODE ${(plan.nodeDepthsMm[1] - plan.nodeDepthsMm[0]).toFixed(1)} mm, floor ${plan.pitchFloorMm.toFixed(2)} mm ${plan.pitchFloorIsFlorets && plan.pitchFloorAt ? `(the FLORETS' own: the floret at ${plan.pitchFloorAt.aDeg.toFixed(0)} deg against the one ${plan.pitchFloorAt.nodesApart} node${plan.pitchFloorAt.nodesApart === 1 ? '' : 's'} below it at ${plan.pitchFloorAt.bDeg.toFixed(0)} deg clears the ${plan.insetGapMm.toFixed(2)} mm gap from ${plan.pitchFloorAt.boundMm.toFixed(1)} mm of shift; the rods' own is ${plan.pitchFloorRodMm.toFixed(2)})` : `(the RODS' own, two pedicel radii; the florets ask ${plan.pitchFloretMm.toFixed(2)})`}`
        : plan.pitchDeferred ? ' · floor (deferred while the slider is held — measured on release)'
        : ` · floor ${plan.pitchFloorMm.toFixed(2)} mm ${plan.pitchFloorIsFlorets ? "(the FLORETS' own)" : "(the RODS' own)"}`)
    + (plan.sameNodeMayTouch ? ` — FLORETS OF ONE NODE MAY STAND WITHIN THE GAP OF EACH OTHER (the phyllotaxy's, not the internode's — no pitch moves two florets of one node apart; told)` : '')
    /* THE INSET IS THE FLORET'S OWN PETAL REACH (build 3, #355): the topmost
       floret's highest emitted vertex, in both modes, one printable gap under
       the head's lowest material — never the pedicel's rise, which cleared the
       rod and put the shipped raceme's top floret through the head. */
    + (plan.insetClamped
        ? ` — RAISED from the stem's own ${plan.insetAskedMm.toFixed(1)} mm to the ${plan.insetNeededMm.toFixed(1)} mm the top FLORET needs: its petals reach ${plan.reachMm.toFixed(1)} mm above its node (live ${plan.floretReachMm.live.toFixed(1)} / export ${plan.floretReachMm.export.toFixed(1)}, the larger decides)${plan.rootZ - plan.headFloorZ > 1e-9 ? ` + ${(plan.rootZ - plan.headFloorZ).toFixed(1)} mm to the head's rim` : ''} + the ${plan.insetGapMm.toFixed(2)} mm printable gap`
        : ` (the stem's own inset; the top floret's petals reach ${plan.reachMm.toFixed(1)} mm above its node and need ${plan.insetNeededMm.toFixed(1)} mm, which it has)`)
    + (plan.insetSatisfied ? '' : ` — AND IT STILL DOES NOT CLEAR: the floret reaches further than this stem's node span is long, so the top one stands among the petals (told, not refused)`)
    /* A LOWER NODE ON A LONGER PEDICEL (the gradient) can overtop the head
       the top node was inset to clear — the inset is the TOP unit's reach and
       nothing else's. Told, never clamped: read off the builder's own per-node
       highest emitted vertex against the same floor the law used. */
    + overtopLine(plan, builtInflo)
    /* THE FLORET AGAINST THE RACHIS — a FLAG with a number, never a refusal.
       Two parts of one solid fusing is OVER-connection (the crowding
       ruling's own grounds, Eva Sep 3): no boundary edge, no split in the
       flood fill, and in a raceme the florets belong to the rachis anyway.
       Told because it is reachable at the SHIPPED angle on a SPHERE head
       (0.82 mm) and goes to contact past +-60 deg, while the same state on a
       CAP head reads 8.25 mm — a sphere floret's petals radiate back toward
       the rachis and a cap's do not. */
    + (builtInflo && builtInflo.rachisApproachMm !== null
        ? `\n     FLORET AGAINST THE RACHIS ${builtInflo.rachisApproachMm.toFixed(2)} mm at the nearest (the floret's own body, never its pedicel)`
          + (builtInflo.rachisApproachMm < MIN_FEATURE_MM
              ? ` — UNDER the ${MIN_FEATURE_MM.toFixed(2)} mm printable gap: the florets will fuse to the rachis in a print (told, never refused — they are one solid either way)`
              : '')
        : '')
    + `\n     GRID EXPORT writes the head at the origin ONLY — a raceme's florets are not in the .glb\n`;
}
/* A BUILT LEAF'S BLADES — a simple leaf is its own one blade; a compound
   leaf's are its leaflets, in the layout's build order (leaf/stem build S3).
   The one place the metrics hook flattens leaves into blades. */
function leafBlades(r) { return r.compound ? r.leaflets : [r]; }
/* THE LOBED LEAF (leaf/stem build S4): the chevron off the BUILDER's own record
   — the lobes, the tilt asked against built (the tilt cap, told), the teeth's
   relief asked against built (the fold cap, told, and NONE FIT where it is
   under the 1 mm floor) and the sinus gaps against the print gap (told, never
   clamped). Every leaf of a build shares one law, so the first is every one. */
function lobedLine(leaf, b0) {
  const Lb = b0 && b0.lobed;
  if (!Lb) return '';
  const g = Lb.sinusGaps, S = b0.serration;
  const tilt = Lb.tiltBuiltRad * 180 / Math.PI;
  const teeth = !S ? 'none asked'
    : S.noRoomWhy === 'fold cap' ? `NONE FIT — the fold cap is ${S.foldCapMm.toFixed(2)} mm, under the ${MIN_FEATURE_MM.toFixed(2)} mm floor (told, never refused)`
    : S.noRoom ? `none (${S.noRoomWhy})`
    : `${S.tipNeck ? S.tipNeck.teethDrawn : S.countBuilt} at ${S.reliefBuiltMm.toFixed(2)} mm${S.foldClamped ? ` — FOLD CLAMPED: asked ${S.reliefFlooredMm.toFixed(2)} mm, built at the cap (steeper teeth fold the lattice across its midrib)` : ` (the fold cap is ${S.foldCapMm === null ? '—' : S.foldCapMm.toFixed(2)} mm)`}`;
  return `
     LOBED ${Lb.lobes} lobe${Lb.lobes === 1 ? '' : 's'} a side over ${(100 * Lb.from).toFixed(0)}–${(100 * Lb.to).toFixed(0)}% of the blade, sinus ${Lb.sinus.toFixed(2)}, shape ${Lb.shape.toFixed(2)} · ONE chevron panel of ${Lb.rows} rows, each a V leaning ${tilt.toFixed(1)}° toward the tip`
    + (Lb.tiltClamped ? ` — TILT CLAMPED from the asked ${Lb.angleAskedDeg}°: steeper, these lobes fold the lattice (told, never refused)` : '')
    + `, square to the midrib from ${(100 * Lb.ease).toFixed(0)}% · lobe teeth ${teeth}`
    + (g && g.minGapMm !== null
      ? ` · SINUS OPENING narrowest ${g.minGapMm.toFixed(2)} mm above a seated ${MIN_FEATURE_MM.toFixed(2)} mm disc's equator (the emitted rows, before the teeth)${g.under ? ` — UNDER the ${MIN_FEATURE_MM.toFixed(2)} mm print gap at ${g.under} of ${g.sinuses.length} sinuses` : ''}`
      : '')
    + roundLine(Lb.roundBottoms, leaf)
    + lobedPetioleLine(leaf, b0);
}
/* THE ROUND SINUS BOTTOMS (S4b, Eva's ruling of Oct 8) — TOLD WHEN THEY BIND:
   where a round bottom widened a sinus beyond what the depth and shape asked,
   and NO FIT where neighbouring lobes are too close for one at the asked
   depth (the asked V then stands, told, never refused). Off the builder's own
   record; the depth is never moved. */
function roundLine(R, leaf) {
  if (!R) return '';
  const S = R.sinuses;
  const at = (r) => `${(100 * r.u).toFixed(0)}%`;
  /* S5: a BROAD sinus (its asked V already opens past the print minimum) is
     FILLETED at its V point — a circle tangent to both arms, adding material
     — and a broad sinus with no room for even the floor's fillet keeps its V,
     told. Said on its own line, beside the narrow sinuses' round bottoms. */
  const fil = S.filter((r) => r.fillet), filNo = S.filter((r) => r.filletNoRoom);
  const filletLine = fil.length || filNo.length
    ? `\n     BROAD SINUSES FILLETED ${fil.length} of ${S.filter((r) => r.openingAskedMm !== null && !r.need).length} at the V point (a circle tangent to both arms)`
      + (fil.length ? ` (${fil.map((r) => `${at(r)}: a ${r.radiusMm.toFixed(2)} mm fillet, adding up to ${r.addedMm.toFixed(2)} mm${r.shrunk ? `, SHRUNK from ${r.radiusAskedMm.toFixed(2)} to the largest that meets both arms tangentially` : r.floored ? `, FLOORED up to the ${r.radiusMinMm.toFixed(2)} mm print minimum` : ''}`).join('; ')})` : '')
      + (filNo.length ? ` · NO FILLET FITS at ${filNo.map(at).join(', ')} — not even the ${MIN_FEATURE_MM / 2} mm floor meets both arms inside the half-period, so the V stands (told, never refused)` : '')
    : '';
  if (!R.needed) return filletLine;
  const built = S.filter((r) => r.built), nofit = S.filter((r) => r.noFit);
  return filletLine + `\n     ROUND SINUS BOTTOMS ${built.length} of ${S.length} sinuses WIDENED beyond what the depth and shape asked`
    + (built.length ? ` (${built.map((r) => `${at(r)}: the asked V opened ${r.openingAskedMm.toFixed(2)} mm, the round bottom holds ${r.openingBuiltMm.toFixed(2)} on a ${(2 * r.radiusMm).toFixed(2)} mm disc, taking up to ${r.takenMm.toFixed(2)} mm of flank${r.steepenedBack || r.steepenedFwd ? `, a wall steepened to meet its flank before the crest` : ''}`).join('; ')})` : '')
    + ` — the depth untouched, the walls no steeper than the asked flanks`
    + (nofit.length ? ` · NO ROUND BOTTOM FITS at ${nofit.map((r) => `${at(r)} (${r.noFitWhy}; the asked V opens ${r.openingAskedMm.toFixed(2)} mm)`).join(', ')} — the lobes are too close for one at the asked depth, so the V stands (told, never refused)` : '');
}
/* THE LOBED PETIOLE (S4b, Eva's ruling of Oct 8) — the area rule from the
   blade, capped by the stem, asked against built, off the plan's own record. */
function lobedPetioleLine(leaf, b0) {
  const pe = leaf.lobedPetiole;
  if (!pe) return '';
  return `\n     PETIOLE ${(2 * pe.radiusMm).toFixed(2)} mm across — the area rule from the blade: ${pe.areaMm2.toFixed(0)} mm^2 of lobed blade against the ${pe.refAreaMm2.toFixed(0)} mm^2 SIMPLE default blade at this length asks ${(2 * pe.askedMm).toFixed(2)} mm (the ${(2 * pe.wireR).toFixed(2)} mm wire x sqrt ${pe.ratio.toFixed(3)})`
    + (pe.floored ? ', under the wire, so it is the wire'
      : !pe.thickens ? `; this stem holds only ${(2 * pe.capMm).toFixed(2)} mm with the rooted end inside it at ${leaf.angleDeg}°, UNDER the wire, so the petiole stays the wire (asked ${(2 * pe.askedMm).toFixed(2)} -> built ${(2 * pe.radiusMm).toFixed(2)}, told, never refused)`
      : pe.clamped ? `; CLAMPED to ${(2 * pe.capMm).toFixed(2)} mm, the most this stem holds with the rooted end inside it at ${leaf.angleDeg}° (asked ${(2 * pe.askedMm).toFixed(2)} -> built ${(2 * pe.radiusMm).toFixed(2)}, told, never refused)`
      : `, under the ${(2 * pe.capMm).toFixed(2)} mm this stem holds with the rooted end inside it at ${leaf.angleDeg}°`)
    + (pe.radiusMm > pe.capMm && b0 && Number.isFinite(b0.petioleRootReachMm) && b0.petioleRootReachMm > leaf.outerR
      ? ` — and its rooted end stands ${(b0.petioleRootReachMm - leaf.outerR).toFixed(2)} mm PROUD of the stem, as a simple leaf's own petiole does at this sheet and angle (told)`
      : '');
}
/* THE NODE RUN AND THE SIZE TAPER (Bloom P1), off the leaf plan's own record
   and the builder's per-leaf records: the run as asked against the depths it
   built, the spacing in the words Eva asked for ("nodes crowd toward the base:
   the lowest internode X mm, the highest Y mm"), every clamp told, and under a
   taper each node's leaf with the yields its own floors made. Empty on a
   raceme's shared node (the pedicels own the nodes there). */
function nodeRunLine(leaf, leavesBuilt) {
  if (leaf.shared || !leaf.nodeRun) return '';
  const R = leaf.nodeRun, d = leaf.nodeDepthsMm;
  const gaps = d.slice(1).map((q, i) => q - d[i]);
  const crowd = R.spacingBuilt === 0 ? (d.length > 1 ? `evenly, every internode ${gaps[0].toFixed(1)} mm` : 'one node')
    : `nodes crowd toward the ${R.spacingBuilt > 0 ? 'base' : 'top'}: the lowest internode ${gaps[gaps.length - 1].toFixed(1)} mm, the highest ${gaps[0].toFixed(1)} mm`;
  let out = `\n     NODE RUN ${R.start.toFixed(2)} .. ${R.end.toFixed(2)} of the stem from the head · nodes at ${d.map((q) => q.toFixed(1)).join(', ')} mm · ${crowd}`
    + (R.inverted ? ` · START PAST END: the span is empty, one node at the end (told; the sliders keep ${R.start.toFixed(2)} / ${R.end.toFixed(2)})` : '')
    + (R.spacingAsked !== 0 && d.length < 3 ? ` · spacing ${R.spacingAsked.toFixed(2)} INERT here (${d.length} node${d.length === 1 ? '' : 's'})` : '')
    + (R.spacingClamped ? ` · SPACING CLAMPED ${R.spacingAsked.toFixed(2)} -> ${R.spacingBuilt.toFixed(3)}: a closer crowd would merge two node swellings (under ${R.mergeGapMm.toFixed(2)} mm, sqrt(2) half-widths of the joint)` : '');
  if (leaf.sizeTaper !== 0) {
    const S = leaf.nodeSizes;
    if (!S) out += `\n     SIZE ALONG THE STEM taper ${leaf.sizeTaper.toFixed(2)} INERT on this build — one node, so its leaf is the asked leaf`;
    else {
      const byNode = S.map((q, i) => {
        const r = (leavesBuilt || []).find((b) => b.nodeIndex === i);
        const sr = r && r.serration;
        const yieldW = sr && !sr.noRoom && sr.countBuilt < sr.countAsked ? `, teeth ${sr.countBuilt} of ${sr.countAsked}` : sr && sr.noRoom && sr.countAsked ? ', NO teeth' : '';
        const lob = r && r.lobed && r.lobed.lobes !== undefined && r.lobed.lobesAsked !== undefined && r.lobed.lobes < r.lobed.lobesAsked ? `, lobes ${r.lobed.lobes} of ${r.lobed.lobesAsked}` : '';
        return `${(100 * q.scale).toFixed(0)}% ${q.lengthMm.toFixed(1)} x ${q.widthMm.toFixed(1)} mm${q.floored ? ' FLOORED' : ''}${yieldW}${lob}`;
      });
      out += `\n     SIZE ALONG THE STEM taper ${leaf.sizeTaper.toFixed(2)}, ${leaf.sizeTaper > 0 ? 'smaller' : 'larger'} toward the top — by node, top to bottom: ${byNode.join(' / ')}`
        + (leaf.topScale !== 1 ? ` · the inset clears the head for the TOP leaf, at ${(100 * leaf.topScale).toFixed(0)}%` : '')
        + ` · the counts are never re-asked; a node's own floors act on its leaf (told above per node)`;
    }
  }
  return out;
}
function leafLine(leaf, leavesBuilt) {
  const per = leaf.phyllotaxy === 'opposite' ? 2 : leaf.phyllotaxy === 'whorled' ? 3 : 1;
  const over = 90 - Math.abs(leaf.angleDeg);
  /* THE TIP, CLAMPED AND TOLD — the BUILDER's own clamp record (every leaf on
     a build shares one profile, so the first built leaf's is every leaf's). */
  const cl = leavesBuilt && leavesBuilt[0] && leavesBuilt[0].tipClamp;
  /* S5: the blade closes on the petal's own NIB construction — a straight
     flank, then an arc to a 0.10 mm face — started where the leaf keeps its
     own length (`leafNibPlan`), so the line says what the tip IS and how it
     leaves the outline. Where the nib is inert the stub line is kept. */
  const nibMm = cl && cl.nib && cl.fraction > 0 ? ((1 - cl.startU) * cl.mm) / cl.fraction : 0;
  const nibHow = !(cl && cl.nib) ? ''
    : cl.regime === 'tangent' ? `leaves the outline on its own tangent where the blade is ${(2 * cl.startHalfMm).toFixed(2)} mm across, past the ${(2 * TIP_HALF_MM).toFixed(2)} mm print floor`
    : cl.regime === 'floor' ? `leaves where the outline meets the ${(2 * TIP_HALF_MM).toFixed(2)} mm print floor on a flank ${cl.kinkDeg.toFixed(1)}° SHALLOWER than the outline (a corner: the outline's own tangent would close short of the leaf's length)`
    : `leaves the outline where it is ${(2 * cl.startHalfMm).toFixed(2)} mm across on a flank ${cl.kinkDeg.toFixed(1)}° STEEPER than it (a corner: the outline's own tangent would close past the leaf's length)`;
  const tipLine = cl && cl.nib
    ? `\n     TIP shape ${Number(leaf.tipShape).toFixed(2)} · closes on the NIB: the last ${nibMm.toFixed(2)} mm ${nibHow}, rounded on a ${cl.radiusMm.toFixed(3)} mm arc to a ${cl.terminalMm.toFixed(2)} mm face (the petal's nib, both modes; the leaf keeps its length)`
    : cl
      ? `\n     TIP shape ${Number(leaf.tipShape).toFixed(2)} · ends ${cl.terminalMm.toFixed(2)} mm across (the print terminal, both modes) — the last ${cl.mm.toFixed(2)} mm (${(100 * cl.fraction).toFixed(1)}% of the length) is that stub, ${(100 * cl.ofWidth).toFixed(1)}% of the width`
        + (cl.fraction > 0.05 ? ` — CLAMPED: a pointier shape LENGTHENS the stub and a wider leaf shortens it; the share is set by the width, never the length` : '')
      : '';
  /* THE SHARED NODE (ruling 5): on a raceme the leaves are the PEDICELS'
     — one under each, at its azimuth, seated a derived offset below — so the
     node and arrangement the leaf's own two controls would set are told as
     the pedicels', and a pedicel whose leaf would run off the stem's end is
     told by count. */
  const sn = leaf.shared && leaf.sharedNode;
  const sharedLine = sn
    ? `\n     SHARED NODE one leaf under each pedicel, at the pedicel's own azimuth, seated ${Number.isFinite(sn.offsetMm) ? `${sn.offsetMm.toFixed(2)} mm` : 'INFINITELY'} below it`
      + ` (the pedicel clears the ${sn.bindsOn === 'blade' ? `leaf BLADE's own top skin — ${sn.bladeReachMm.toFixed(2)} mm of rise over the leaf's axis — which binds over the rods' ${sn.offsetRodMm.toFixed(2)}` : 'two rod radii, which bind over the blade'} by the ${MIN_FEATURE_MM.toFixed(2)} mm gap, over the steeper rod's cosine) — the leaf's own Nodes and Arrangement are the pedicels'`
      + (sn.noRoom ? ` — ${sn.noRoom} of ${sn.pedicelNodes} pedicel node${sn.pedicelNodes === 1 ? '' : 's'} carry NO leaf: seated that far below, the leaf would run off the stem's end (told, never refused)` : '')
    : '';
  /* THE LEAF LENGTH AT A FLOWERING NODE (Eva's change 2): the slider keeps
     the ASKED length and this says what each node BUILT — TUBE's snap shape,
     read off the plan's own per-node record, never re-derived here. */
  const lc = leaf.lengthCap;
  const capLine = lc && lc.capped
    ? (() => {
      const built = lc.lengthsMm.filter((x) => x > 0);
      const uniq = [...new Set(built.map((x) => x.toFixed(2)))];
      const what = uniq.length === 1 ? `${uniq[0]} mm` : `${Math.min(...built).toFixed(2)}-${Math.max(...built).toFixed(2)} mm`;
      return `\n     LEAF LENGTH asked ${leaf.lengthMm} mm, BUILT ${built.length ? what : 'none'} at ${lc.capped - lc.noBlade} of ${lc.lengthsMm.length} flowering node${lc.lengthsMm.length === 1 ? '' : 's'} — the length that clears each node's own floret by ${MIN_FEATURE_MM.toFixed(2)} mm (the slider keeps ${leaf.lengthMm})`
        + (lc.noBlade ? ` — ${lc.noBlade} node${lc.noBlade === 1 ? '' : 's'} build NO leaf: no blade ${MIN_FEATURE_MM.toFixed(2)} mm long clears the floret there (told, never refused)` : '')
        + (lc.behind ? ` — ${lc.behind} floret vert${lc.behind === 1 ? 'ex stands' : 'ices stand'} within the gap of the petiole itself, which no length moves` : '');
    })()
    : '';
  /* THE POSE (leaf/stem build S2): the arch and the cup, each the LEAF's own
     control on the petal's own law, told from the BUILDER's records — the
     arch's radius from the spine law, the cup's clamp from the form's own
     `cupClamp` (the fold clamp binds where the blade narrows to its stub). */
  const b0 = leavesBuilt && leavesBuilt[0];
  const arch = Number(leaf.archDeg) || 0;
  const archLine = `\n     POSE arch ${arch}°`
    + (arch === 0 ? ' — flat along its length, as shipped'
      : ` — the tip ${arch > 0 ? 'falls away (arching DOWN)' : 'curls UP'}, a uniform arc of ${b0 && b0.arch && Number.isFinite(b0.arch.radiusMm) ? `${b0.arch.radiusMm.toFixed(1)} mm` : '—'} radius (the petal's own spine law)`
        + (b0 && b0.arch && b0.arch.underFloor ? ' — UNDER ONE SHEET THICKNESS of radius (told, never clamped)' : ''))
    + ` · cup ${Number(leaf.cup).toFixed(2)}${Number(leaf.cup) === 0 ? ' — a flat section' : Number(leaf.cup) < 0 ? ' — the margins turned DOWN' : ' — the margins lifted'}`
    + (b0 && b0.cup && b0.cup.clamp && b0.cup.clamp.u !== null
        ? ` — CUP CLAMPED at u ${b0.cup.clamp.u.toFixed(3)} (asked radius ${b0.cup.clamp.askedRadiusMm.toFixed(3)} mm, drawn ${b0.cup.clamp.drawnRadiusMm.toFixed(3)} — the section may not fold through its own skins, told, never refused)`
        : '');
  /* THE EDGE (leaf/stem build S2): the blade goes through the petal's own
     emitter, so its margin closes on the petal's bead — read off the builder's
     rim record, never restated. */
  const R0 = b0 && b0.rim;
  let rimClampLine = '';
  if (R0 && R0.clamps.length) {
    let thin = Infinity, room = 0;
    for (const c of R0.clamps) if (c.thicknessMm < thin) { thin = c.thicknessMm; room = c.roomMm; }
    rimClampLine = ` — RIM CLAMPED at ${R0.clamps.length} location${R0.clamps.length === 1 ? '' : 's'}, ${thin.toFixed(3)} mm on a ${room.toFixed(2)} mm span (told, never refused)`;
  }
  const cpd = leaf.compound;
  const edgeLine = R0 && R0.segments
    ? `\n     EDGE the margin closes on a ${R0.drawnMaxMm.toFixed(2)} mm half-round in ${R0.segments} segments (the petal's own bead), `
      + (cpd ? `and every leaflet's BASE is FREE — its stalk runs into it, so it closes on the bead like its tip (${R0.baseAxisMm === null || R0.baseAxisMm === undefined ? '—' : R0.baseAxisMm.toFixed(2)} mm along the length, the first ${RIM_TIP_ROWS} rows)` : `buried where the petiole holds it and easing in over ${RIM_TAPER_MM.toFixed(1)} mm of margin`)
      + (R0.tipAxisMm === null ? '' : ` · the ${(2 * TIP_HALF_MM).toFixed(2)} mm stub ends on the bead's nose, ${R0.tipAxisMm.toFixed(2)} mm along the length (the last ${RIM_TIP_ROWS} rows)`)
      + rimClampLine
    : '';
  /* THE TEETH (leaf/stem build S2, Eva's ruling: the relief is ALWAYS floored
     at the minimum feature, design view included). ASKED against BUILT, the
     fringe's and the stamen spread's pattern, from the builder's own record.
     (This replaces a TEETH CLAMPED clause that read `teethAsked` off the PLAN,
     which never carried it, so it had never once printed.) */
  const Sr = b0 && b0.serration;
  let teethLine = '';
  if (Sr && Sr.noRoom) {
    teethLine = `\n     TEETH NONE BUILT of ${Sr.countAsked} asked — `
      + (Sr.noRoomWhy === 'relief floor'
        ? `no margin sinus has ${Sr.reliefFloorMm.toFixed(2)} mm of material for a notch (the widest half-width ${Sr.peakHalfMm.toFixed(2)} mm less the ${TIP_HALF_MM.toFixed(2)} mm print floor) — the relief floor, told, never refused`
        : `NO ROOM (${Sr.noRoomWhy}), told`);
  } else if (Sr) {
    /* (S5b: a pair the converging tip gave up is cut at relief 0 and is not
       a tooth; the relief and the rows are quoted over the notches CUT) */
    const TN = Sr.tipNeck, drawnOf = (q) => (q.tipNeck ? q.tipNeck.teethDrawn : q.countBuilt);
    const keptSinus = (i) => !(TN && TN.sinusU.includes(Sr.sinusU[i]));
    const margin = Sr.reliefMm.filter((r, i) => (Sr.apexIsCrest || i !== (Sr.periods - 1) / 2) && r > 0);
    const rowRel = (Sr.rowReliefMm || []).filter((r, i) => keptSinus(i));
    const perLeaflet = cpd && b0 && b0.leaflets ? b0.leaflets.map((q) => (q.serration && !q.serration.noRoom ? drawnOf(q.serration) : 0)) : null;
    const neckWords = TN && TN.pairsGiven > 0
      ? ` — the converging TIP gave ${TN.pairsGiven} pair${TN.pairsGiven > 1 ? 's' : ''} up (${TN.teethGiven} teeth of the ${Sr.countBuilt} laid out): its notch at u ${TN.tested[0].sinusU.toFixed(3)} would cut ${(100 * TN.tested[0].fraction).toFixed(0)}% of the way to the midrib, and past halfway a notch parts the blade — a neck; the pair below takes ${TN.tested[TN.tested.length - 1].neck ? 'too much as well' : `${(100 * TN.tested[TN.tested.length - 1].fraction).toFixed(0)}%`}, and the slider keeps its value`
      : '';
    teethLine = `\n     TEETH ${drawnOf(Sr)} built${perLeaflet ? ` on the first leaflet (each leaflet its own blade: ${perLeaflet.join(' / ')} of ${Sr.countAsked} asked — the relief floor gives on the small ones, the ruled behaviour)` : ''}${Sr.countBuilt < Sr.countAsked ? ` of ${Sr.countAsked} asked — CLAMPED by ${Sr.clampedBy === 'relief floor' ? `the relief floor: a ${Sr.reliefFloorMm.toFixed(2)} mm notch fits at no more margin sinuses than ${Sr.countBuilt} teeth give${Sr.tipYield ? ` — the converging TIP gave the first up (its notch at u ${Sr.tipYield.atU.toFixed(3)} has no ${Sr.reliefFloorMm.toFixed(2)} mm of material where the blade closes on its nib; a tooth there would fold)` : ''}` : Sr.clampedBy === 'pitch' ? 'the pitch floor' : 'the rows the blade has'}` : (drawnOf(Sr) < Sr.countAsked ? ` of ${Sr.countAsked} asked` : '')}${neckWords}`
      + (margin.length ? ` · relief ${Math.min(...margin).toFixed(2)}${Math.max(...margin) > Math.min(...margin) ? `–${Math.max(...margin).toFixed(2)}` : ''} mm at the sinuses` : '')
      + (Sr.reliefFloored ? ` (asked ${Sr.reliefAskedMm.toFixed(2)} mm, FLOORED at the ${Sr.reliefFloorMm.toFixed(2)} mm minimum feature — design view included; the slider keeps its value)` : ` (the floor is ${Sr.reliefFloorMm.toFixed(2)} mm)`)
      + (rowRel.length ? ` · the rows draw ${Math.min(...rowRel).toFixed(2)}–${Math.max(...rowRel).toFixed(2)} mm of it (they sample the cut between stations)` : '')
      + (Sr.apexIsCrest === false ? ' · an even count puts its apex notch on the terminal face, where it cuts nothing' : '');
  }
  if (sn && !leaf.nodeDepthsMm.length) return `\n     LEAVES none built${sharedLine}\n`;
  /* THE COMPOUND LEAF (leaf/stem build S3): the tree off the PLAN's own
     layout and the BUILDER's own rods — the leaflet count, where the pairs
     stand, each leaflet's built size (and which scaled leaflets the leaf's own
     minimum clamped), and the RODS (Eva's ruling on #380): the PETIOLE
     thickened by the area rule read upward over its leaflets and CAPPED by the
     stem it roots in — asked against built, told — and the rachis and stalks
     at the wire floor. */
  const compoundLine = cpd
    ? (() => {
      const lat = cpd.lateral;
      const sz = (q) => `${q.lengthMm.toFixed(1)} x ${q.widthMm.toFixed(1)}`;
      const pe = cpd.petiole;
      const embeds = b0 && b0.leaflets ? b0.leaflets.map((q) => q.embedMm) : [];
      return `\n     COMPOUND ${cpd.count} leaflets — ${cpd.pairs} pair${cpd.pairs === 1 ? '' : 's'} and a terminal — on a ${cpd.rachisMm.toFixed(1)} mm rachis`
        + ` · pairs at ${lat.map((q) => `${(100 * q.frac).toFixed(0)}%`).join(', ')} (${lat.map((q) => q.stationMm.toFixed(1)).join(', ')} mm), ${cpd.angleDeg}° off the rachis in its own plane, flat and cupped (the arch is the RACHIS's)`
        + `\n     LEAFLETS lateral ${lat.map(sz).join(' -> ')} mm${cpd.pairs > 1 ? ` (basal ratio ${cpd.basal.toFixed(2)})` : ''}, terminal ${sz(cpd.terminal)} mm`
        + ` · stalks ${cpd.stalkMm.toFixed(1)} mm lateral, ${cpd.terminalStalkMm.toFixed(1)} mm terminal, each reaching ${embeds.length ? `${Math.min(...embeds).toFixed(2)}–${Math.max(...embeds).toFixed(2)}` : '—'} mm on into its leaflet's beaded base`
        + (cpd.clamped ? ` — CLAMPED: ${cpd.clamped} pair${cpd.clamped === 1 ? '' : 's'} scaled under the leaf's own minimum size, built at it (told, never refused)` : '')
        + `\n     PETIOLE ${(2 * pe.radiusMm).toFixed(2)} mm across — the area rule read UP over ${cpd.count} leaflets asks ${(2 * pe.askedMm).toFixed(2)} mm (the ${(2 * cpd.wireR).toFixed(2)} mm wire x sqrt ${cpd.count})`
        + (!pe.thickens
          ? `; this stem holds only ${(2 * pe.capMm).toFixed(2)} mm with the rooted end inside it at ${leaf.angleDeg}°, UNDER the wire, so the petiole stays the wire (asked ${(2 * pe.askedMm).toFixed(2)} -> built ${(2 * pe.radiusMm).toFixed(2)}, told, never refused)`
          : pe.clamped
          ? `; CLAMPED to ${(2 * pe.capMm).toFixed(2)} mm, the most this stem holds with the rooted end inside it at ${leaf.angleDeg}° (asked ${(2 * pe.askedMm).toFixed(2)} -> built ${(2 * pe.radiusMm).toFixed(2)}, told, never refused)`
          : `, under the ${(2 * pe.capMm).toFixed(2)} mm this stem holds with the rooted end inside it at ${leaf.angleDeg}°`)
        + (pe.thickens ? ' · it runs straight to the rachis, which tapers on from it (below)' : '')
        + (pe.radiusMm > pe.capMm && b0 && Number.isFinite(b0.petioleRootReachMm) && b0.petioleRootReachMm > leaf.outerR
          ? ` — and its rooted end stands ${(b0.petioleRootReachMm - leaf.outerR).toFixed(2)} mm PROUD of the stem, as a simple leaf's own petiole does at this sheet and angle (told)`
          : '')
        + (() => {
          /* THE LOAD TAPER (S3c), every figure off the plan's own taper — the
             one owner `compoundRachisRadiusMm` is also what built the rings */
          const TP = cpd.rachis.taper, K = TP.knots;
          const at = K.slice(1).map((k) => `${(2 * k.rMm).toFixed(2)} at ${k.sMm.toFixed(1)} mm (${k.carried} carried)`).join(' -> ');
          const clampedAny = K.slice(1).some((k) => k.carried > 1 && Math.sqrt(k.carried) * cpd.wireR > pe.radiusMm + 1e-12);
          return `\n     RACHIS TAPERS BY LOAD from the ${(2 * K[0].rMm).toFixed(2)} mm petiole: ${at} — the area rule over the leaflets still carried beyond each point, linear in arc length between the pair stations, never under the rule`
            + (clampedAny ? ` · it starts from the BUILT ${(2 * pe.radiusMm).toFixed(2)} mm, not the asked ${(2 * pe.askedMm).toFixed(2)}, and never rises above it` : '')
            + (TP.tipStep && K[K.length - 1].rMm !== cpd.stalkR ? ` · the last pair sits ON the tip, so the rod steps to the wire there, where three leaflets leave one point` : '');
        })()
        + `\n     RODS stalks ${(2 * cpd.stalkR).toFixed(2)} mm — the wire floor (the leaf's own petiole rule), ruled; each roots on the rachis's axis, buried by the station's own radius`;
    })()
    : '';
  return `\n     LEAVES ${leaf.built} on ${leaf.nodesBuilt} node${leaf.nodesBuilt === 1 ? '' : 's'} · ${leaf.phyllotaxy} (${per} a node${leaf.divergenceDeg !== null && leaf.divergenceDeg !== undefined ? `, ${leaf.divergenceDeg.toFixed(1)}° between nodes${leaf.divergenceDeg === 180 ? ' — distichous' : ''}` : ''})`
    + (cpd ? ` · COMPOUND, a ${leaf.lengthMm} mm rachis at ${leaf.angleDeg} deg` : ` · ${leaf.lengthMm} x ${leaf.widthMm} mm at ${leaf.angleDeg} deg`)
    + (leaf.typePinned ? ` · ${String(leaf.typeAsked || 'COMPOUND')} asked, PINNED SIMPLE: a raceme's shared node carries a simple leaf (told)` : '')
    + ` · ${over} deg OVERHANG from vertical${over > 45 ? ' — PAST the classic 45, supports likely (a declared guess: nothing here has been printed)' : ''}`
    + `\n     PETIOLE rooted at r = ${leaf.rootR.toFixed(2)} mm, the WALL's mid-thickness — embedded at every angle, and more so as the angle steepens`
    + ` · ${(2 * leaf.petioleR).toFixed(2)} mm across x ${leaf.petioleLenMm.toFixed(2)} mm`
    + `\n     NODES top ${leaf.nodeDepthsMm[0].toFixed(1)} mm below the hub`
    + (leaf.insetClamped
        ? ` — RAISED from the stem's own ${leaf.insetAskedMm.toFixed(1)} mm to the ${leaf.insetNeededMm.toFixed(1)} mm this leaf needs to clear the head`
        : ` (the stem's own inset; the leaf needs ${leaf.insetNeededMm.toFixed(1)} mm and has it)`)
    + (leaf.insetSatisfied ? '' : ` — AND IT STILL DOES NOT CLEAR: a ${leaf.lengthMm} mm leaf rises further than this stem's node span is long, so the top leaf stands inside the head (told, not refused)`)
    + (leaf.nodesClamped ? `\n     NODE COUNT CLAMPED ${leaf.nodesAsked} -> ${leaf.nodesBuilt} — the span left cannot hold them a petiole apart` : '')
    + nodeRunLine(leaf, leavesBuilt)
    + archLine + edgeLine + teethLine
    + tipLine + sharedLine + capLine
    + compoundLine
    + lobedLine(leaf, b0)
    + (cpd
      ? `\n     SLENDERNESS L/d petiole ${(leaf.petioleLenMm / (2 * leaf.petioleR)).toFixed(1)} (${leaf.petioleLenMm.toFixed(1)} mm at ${(2 * leaf.petioleR).toFixed(2)} mm) · rachis by stretch ${cpd.slenderness.stretches.map((q) => `${q.ld.toFixed(1)} (${q.fromMm.toFixed(1)}–${q.toMm.toFixed(1)} mm at ${q.dMinMm.toFixed(2)} mm)`).join(', ')} — the most slender stretch is ${cpd.slenderness.worst.fromMm.toFixed(1)}–${cpd.slenderness.worst.toMm.toFixed(1)} mm, L/d ${cpd.slenderness.worst.ld.toFixed(1)} (each read at its thinnest end; the last runs on through the terminal stalk to the terminal's base) — UNMEASURED — no coupon has been printed\n`
      : `\n     SLENDERNESS leaf ${leaf.slenderness.toFixed(1)} (length over petiole diameter) — UNMEASURED — no coupon has been printed\n`);
}

/* THE SEPALS LINE (part 1). Everything the whorl clamps, it TELLS from the
   OWNER's own record: the count against the petal count (and what "the petal
   count" means in this placement), the phase in degrees and in fractions of
   the pitch, the foot against its floor, and the ANGLE against the drawn
   limit with the reason (which sepal met which petal, how, at what angle),
   the mode it was measured in and what the scan cost. Under SPHERE with
   sepals asked the line says UNAVAILABLE rather than nothing. */
function sepalLine(ui, built, mode) {
  const asked = Math.round(Number(ui.sepalCount) || 0);
  if (built.foot.sphereMode && asked >= 1) return `     SEPALS ${asked} asked — UNAVAILABLE under SPHERE: a closed head has no underside ring to place them on (told, none built)\n`;
  const S = built.foot.sepals, B = built.sepals;
  if (!S || !B) return '';
  return sepalTierLine(S, B.tiers ? B.tiers[0] : B, B.built[0], mode) + sepalTiersLines(ui, built, mode);
}
/* THE TIERS' LINES (F1.1a): one SEPAL TIERS line naming every tier asked —
   built at its station (the height law, the ordering clamp) or not built and
   why — then each lower tier's own SEPALS line through the same function tier
   1's goes through, on that tier's own descriptor and record. */
function sepalTiersLines(ui, built, mode) {
  const B = built.sepals;
  if (!B || !B.tiers || sepalTierCount(ui) <= 1) return '';
  const tiers = built.foot.sepalTiers;
  const said = B.tiers.map((T) => T.present
    ? `tier ${T.tier + 1} at ${T.attachment.frac.toFixed(3)} of the join (law ${T.order.fracLaw.toFixed(3)}${T.order.orderClamped ? `, ORDER-CLAMPED one sheet (${T.order.gapMm.toFixed(2)} mm) under tier ${T.order.aboveTier + 1}` : ''}; ${T.count} sepals, ${T.term ? 'own values' : 'the whole-bloom values'})`
    : `tier ${T.tier + 1} NOT BUILT — ${T.why}`).join(' · ');
  let out = `     SEPAL TIERS ${B.tiersBuilt} of ${B.tiersAsked} built${B.tiersEligible ? '' : ' — tiers past the first need a stem (hidden and inert, told)'}: ${said}\n`;
  for (let k = 1; k < B.tiers.length; k++) if (B.tiers[k].present) out += sepalTierLine(tiers[k], B.tiers[k], B.tiers[k].built[0], mode, `TIER ${k + 1} `);
  return out;
}
function sepalTierLine(S, B, first, mode, tag = '') {
  const L = B.limit;
  const against = L.against || 'the petals';
  const angleWord = L.unclamped ? `${L.angleBuiltDeg}° — UNCLAMPED by the capability hook past the drawn limit of ${L.limitDeg}° (at ${L.contactDeg}° sepal ${L.sepal} ${L.kind === 'crossing' ? 'crosses' : L.kind === 'coincident' ? 'lies in' : 'stands on top of'} ${against}; no control reaches this)`
    : L.everywhere ? `CLAMPED to ${L.angleBuiltDeg}° — the sepals clip the petals at every angle in the range (${L.kind} on ${against})`
    : L.clamped ? `${L.askedDeg}° asked, CLAMPED to ${L.angleBuiltDeg}°: at ${L.contactDeg}° sepal ${L.sepal} ${L.kind === 'crossing' ? 'crosses' : L.kind === 'coincident' ? 'lies in' : 'stands on top of'} ${against}`
    : `${L.angleBuiltDeg}° (clear up to ${L.limitDeg}°${L.contactDeg === null ? ', no contact in the range' : `; at ${L.contactDeg}° sepal ${L.sepal} ${L.kind === 'crossing' ? 'crosses' : L.kind === 'coincident' ? 'lies in' : 'stands on top of'} ${against}`})`;
  /* WHERE THE FOOT IS, from the descriptor's own attachment record: on the
     hub's flare at the height asked, or at the rim with the reason. THE FOOT
     LINE LEADS WITH THE CHORD AND KEEPS THE TANGENT BESIDE IT, LABELLED
     (Eva's ruling, second round): a tangent that reads 0.00° on GOBLET and
     CURVED while the underside falls 49° and 81° over the first millimetre is
     a number that is always right and never useful — the chord one printable
     feature along the blade's way is the honest measurement, so it goes
     first. */
  const A = S.attachment;
  const onHub = A && A.mode === 'HUB';
  const where = onHub
    ? `on the hub's flare — ${A.frac.toFixed(2)} of the way up from the stem end (r ${A.rAttach.toFixed(2)} mm, ${A.belowHeadMm.toFixed(2)} mm below the head's underside; the hub hangs ${A.extentMm.toFixed(2)} mm; AXIAL reading built, the surface-arc reading lands ${A.arc.deltaMm.toFixed(2)} mm away)`
    : `at the hub's rim (height ${A ? A.frac.toFixed(2) : '?'} asked, INERT: ${A ? A.why : 'no attachment record'})`;
  const footSurface = onHub
    ? `foot on the flare, bottom skin through the attachment point (mid-surface ${(S.height).toFixed(2)} mm) · the underside RISES ${A.undersideChordDeg.toFixed(2)}° over the first ${A.undersideChordMm.toFixed(2)} mm outward from the foot (the chord a print meets; tangent there ${A.undersideTangentDeg.toFixed(2)}°${A.onCone ? " — ANGLED's straight face, the chord IS the tangent and the shoulder is not under the foot" : ''})` + (A.footBuriedMm < 0 ? ` · the foot's inner rows POKE OUT ${(-A.footBuriedMm).toFixed(2)} mm below the flare (told)` : ` · inner rows buried ${A.footBuriedMm.toFixed(2)} mm`)
    : `buried in the rim on the same footing as the petal foot · the underside FALLS ${B.undersideChordDeg.toFixed(2)}° over the first ${B.undersideChordMm.toFixed(2)} mm in from the rim (the chord a print meets; tangent at the rim ${B.footTangentDeg.toFixed(2)}°)`;
  return `     SEPALS ${tag}${B.count} ${where}` + (S.countClamped ? ` — CLAMPED from ${S.asked} at the petal count` : '') + ` (ceiling ${S.ceiling}: ${S.ceilingOf})`
    + ` · offset ${S.phaseFrac.toFixed(2)} of ${S.phaseAgainst} = ${S.phaseDeg.toFixed(2)}° of ${S.pitchDeg.toFixed(2)}°` + (S.mirrorSymmetric === false ? ' — NOT mirror-symmetric on this fan (told)' : '')
    + (S.own && S.own.scaleInert ? ` · size: the sepal's OWN ${S.own.lengthMm} x ${S.own.widthMm} mm (the multiplier is inert and hidden)`
      : S.own && S.own.lengthMm !== null ? ` · size: own length ${S.own.lengthMm} mm, width ${S.scale.toFixed(2)}x the petal's`
      : S.own && S.own.widthMm !== null ? ` · size: own width ${S.own.widthMm} mm, length ${S.scale.toFixed(2)}x the petal's`
      : ` · size ${S.scale.toFixed(2)}x`)
    + (S.own && (S.own.lengthFloored || S.own.widthFloored) ? ' — FLOORED at the ruled minimum (told)' : '')
    + (first ? (Math.abs(first.length - first.askedLength) > 0.05 ? ` (${first.askedLength.toFixed(1)} mm asked, DRAWN ${first.length.toFixed(1)} mm — ${first.length < first.askedLength ? 'the tip floor shortens a narrow blade' : 'the apex nib runs past the asked length'})` : ` (${first.length.toFixed(1)} mm)`) : '')
    + `\n     SEPAL FOOT ${tag}${S.footMm.toFixed(2)} mm across` + (S.footClamped ? ` — CLAMPED from ${S.footAskedMm.toFixed(2)} (floor ${S.footFloorMm.toFixed(2)}, ceiling ${S.footCeilingMm.toFixed(2)} mm — the arc each sepal owns at its ring)` : ` (asked ${S.footAskedMm.toFixed(2)})`)
    + ` · ${footSurface}`
    + `\n     SEPAL ANGLE ${angleWord} — drawn on the built rows in both modes (bound by ${L.boundBy}: live ${L.perMode.live.limitDeg === null ? 'floor' : L.perMode.live.limitDeg}° / export ${L.perMode.export.limitDeg === null ? 'floor' : L.perMode.export.limitDeg}°), ${L.scanned} angles over ${L.configs} distinct neighbourhood(s), ${L.costMs.toFixed(0)} ms (${mode})\n`;
}

function stemLine(stem, joinActive, joinT, joinBlend, hubR, mode, omission) {
  if (!stem) return '';
  const hollow = stem.boreR > 0;
  /* THE JOIN NAMES ITS OWN REASON FOR DOING NOTHING. "A 12 mm stem asks for no
     more than the hub's own 1.20 mm" is FALSE of a 12 mm stem and would be the
     read-out repeating an arithmetic nobody performed: on a closed SPHERE the
     plan declares the join inert because a plate's section modulus does not
     describe a shell, which is a different sentence and is the one that is
     true there. `joinReason` is the plan's own word. */
  const inertBecause = stem.joinReason === 'shell'
    ? `INERT — the head is a closed SPHERE, whose wall is ${stem.hubT.toFixed(2)} mm all the way round; the join is DERIVED for a PLATE and a shell carries a root hole differently, so it is not applied here (told, not silent)`
    : `INERT — a ${(stem.outerR * 2).toFixed(1)} mm stem asks for no more than the hub's own ${stem.hubT.toFixed(2)} mm, so the hub is untouched`;
  return `STEM ${stem.lengthMm} mm total`
    + (stem.hiddenMm > 1e-9 ? ` · ${stem.visibleMm.toFixed(1)} mm VISIBLE (${stem.hiddenMm.toFixed(1)} mm of it is inside the head's own bowl)` : ' · all of it visible (a flat head hides none)')
    + ` · ${(stem.outerR * 2).toFixed(1)} mm across, `
    + (hollow ? `${(stem.boreR * 2).toFixed(1)} mm bore, a ${stem.wallMm.toFixed(2)} mm wall` : `SOLID — the bore CLOSES at this diameter (told, not refused)`)
    /* THE BORE'S TWO CLOSURES ARE TOLD, because without them the clause above
       claims a bore that runs the length of the stem when it does not. Same
       "clamped and told" form as the bore closing at Eva's own floor, and each
       is ABSENT wherever it does not apply — a passing "0 mm solid" would be a
       number nobody measured.

       AND WHERE THEY MEET, ONE SENTENCE REPLACES BOTH. Both closures are
       derived from lengths, so across a short enough stem they overlap and no
       bore survives; printing "solid for the first 1.20" and "solid for the
       last 1.50" of a 2.20 mm stem would be two true clauses adding up to a
       false picture. The crossover is the plan's own `solidThrough`, so this
       line cannot disagree with the geometry about which case it is in. */
    + (stem.solidThrough
        ? ` · SOLID THROUGHOUT — a ${stem.solidBandMm.toFixed(2)} mm root band and a ${stem.tipPlugMm.toFixed(2)} mm tip plug MEET across a ${(stem.topZ - stem.tipZ).toFixed(2)} mm stem, so no bore is left between them (told, not refused)`
        : (stem.solidBandMm > 0
            ? ` · SOLID for the first ${stem.solidBandMm.toFixed(2)} mm — the head is ${(stem.headOuterMm * 2).toFixed(1)} mm across against a ${(stem.boreR * 2).toFixed(1)} mm bore, so it would otherwise stand INSIDE the pipe with nothing bridging the two (told, not refused)`
            : '')
          + (stem.tipPlugMm > 0
              ? ` · SOLID for the last ${stem.tipPlugMm.toFixed(2)} mm — the bore is CLOSED at the TIP, as thick as the ${stem.wallMm.toFixed(2)} mm wall it closes, so the bottom reads as a stem end and not a cut pipe; ${stem.voidMm.toFixed(2)} mm of SEALED bore between the two`
              : ''))
    + stemCutLine(stem)
    + `\n     HUB ${stem.hubStyle}`
    + (stem.swellActive
        ? ` · ${stem.hubAmount.toFixed(2)}x pronounced · reaches ${stem.axisDepth.toFixed(2)} mm below the head`
          + (stem.hubLengthAuto ? ' (auto — the derived join depth)' : ' (Hub length)')
        : stem.joinReason === 'shell' ? ' · INERT on a sphere — the shell wall IS the join, so style, amount and length do nothing here (told)'
          : Number(stem.hubAmount) === 0 ? ' · STRAIGHT — amount 0, no flare'
          : ' · STRAIGHT — the head is not wider than the stem, so there is no room for a flare (the stem\'s solid root band joins them)')
    + ` · TOTAL ${stem.belowHeadMm.toFixed(1)} mm below the head\'s top face (hub ${stem.axisDepth.toFixed(2)} + stem ${stem.lengthMm} — Hub length ADDS to the height, stem length unchanged)`
    + stemNodesLine(stem)
    + `\n     HUB-TO-STEM JOIN ${joinActive ? `${joinT.toFixed(2)} mm thick at the axis, blending back to the hub's own ${stem.hubT.toFixed(2)} mm by r = ${joinBlend.toFixed(2)} of ${hubR.toFixed(2)} mm — thickness DERIVED from the stem's own section, no control` : inertBecause}\n`
    + stemChannelLine(omission);
}

/* THE STEM'S END (Eva's ruling 7, stem session 3) — the cut, told in the
   numbers the plan derived: where the short point is, how deep the land is
   and from what, where the bore closes under it, and the one case where the
   cut cannot be made. Absent on a FLAT end, which is what every pedicel has. */
function stemCutLine(stem) {
  const c = stem.cut;
  if (!c || !c.on) return '';
  if (c.inertShort) return `\n     END: CUT NOT MADE — a ${stem.lengthMm} mm stem is shorter than its own ${c.spanMm.toFixed(2)} mm cut at ${c.deg}°, so the end stays flat (told, not refused)`;
  return `\n     END: a ${c.deg}° florist's cut · the LONG point at the full ${stem.lengthMm} mm, the short point ${c.spanMm.toFixed(2)} mm above it`
    + ` · a ${c.landMm.toFixed(2)} mm LAND at the long point — the floor is ${c.landMinMm.toFixed(2)} mm (max of the ${MIN_FEATURE_MM.toFixed(2)} mm print floor and two ${NOZZLE_MM.toFixed(1)} mm nozzle widths), drawn on the tube's own lattice as the chord at column ${c.landIdx}`
    + (stem.boreR > 0 ? ` · the bore CLOSES ${stem.tipPlugMm.toFixed(2)} mm from the long point (the full cut's ${(2 * c.rTip).toFixed(2)} mm plus ${(stem.tipPlugMm - 2 * c.rTip).toFixed(2)} — Eva's ${STEM_MIN_WALL_MM} mm wall measured square to the face), so the cut face is SOLID`
                        : ' · the stem is SOLID here, so the cut costs no plug')
    + (c.tipTiltDeg > 1e-9 ? ` · the tip's axis leans ${c.tipTiltDeg.toFixed(2)}° (nodes), so against the LOCAL axis the face is ${(c.deg - c.tipTiltDeg).toFixed(1)}–${(c.deg + c.tipTiltDeg).toFixed(1)}° — the cut is ${c.deg}° to the vertical, as every ring is horizontal (ruling 5)` : '')
    + ' · the object does not stand on this end (ruled)';
}

/* THE STEM'S NODES (#299's port) — what the build made of the one control,
   told in the units a reader can hold: how many nodes, the swelling, the turn,
   where each bend peaks against the spindle (the phasing Eva likes, as a
   number), how far the tip ends up off straight, and the wall measured square
   to the leaning axis — a reported consequence of the horizontal wall (Eva's
   ruling 5), not an open question. Absent where
   the control is at 0 or has nothing to act on. */
/* THE NODE RUN AS BUILT (Bloom P1) — one record the four node controls'
   read-outs read: the leaf plan's when leaves stand on the nodes (it carries
   the inset, the counts and each node's own leaf), the stem node law's on a
   bare noded stem, null where nothing stands at a node. */
function nodeRunShown(built) {
  const P = built.leaf && built.leaf.present ? built.leaf : null;
  if (P && P.nodeRun && !P.shared) {
    return { stemLengthMm: P.stemLengthMm, depthsMm: P.nodeDepthsMm.slice(), run: P.nodeRun, insetMm: P.insetMm, insetNeededMm: P.insetNeededMm,
      insetClamped: P.insetClamped, nodesAsked: P.nodesAsked, nodesBuilt: P.nodesBuilt, topScale: P.topScale,
      scales: P.nodeSizes ? P.nodeSizes.map((q) => ({ scale: q.scale, asked: q.scaleAsked, floored: q.floored, lengthMm: q.lengthMm, widthMm: q.widthMm, petioleR: q.petioleR })) : null };
  }
  const N = built.stem && built.stem.nodeLaw;
  if (N && N.run) {
    return { stemLengthMm: N.lengthMm, depthsMm: N.nodes.map((q) => q.s), run: N.run, insetMm: N.insetMm, insetNeededMm: N.insetNeededMm,
      insetClamped: N.insetClamped, nodesAsked: N.nodesAsked, nodesBuilt: N.nodes.length, topScale: 1, scales: null };
  }
  return null;
}
function stemNodesLine(stem) {
  const L = stem.nodeLaw;
  if (!L) return '';
  /* MERGED SWELLINGS ARE TOLD, NEVER CLAMPED (Eva's ruling on the spacing
     floor): the plan's own `mergedPairs`, against `sqrt(2)` spindles. */
  const merged = L.mergedPairs && L.mergedPairs.length
    ? ` · SWELLINGS MERGED: ${L.mergedPairs.length} adjacent pair${L.mergedPairs.length > 1 ? 's' : ''} closer than ${L.mergeGapMm.toFixed(2)} mm (sqrt(2) half-widths of the joint), the nearest ${Math.min(...L.mergedPairs.map((q) => q.gapMm)).toFixed(2)} mm apart — they read as one bump, not separate joints (reported, not clamped)`
    : '';
  /* TWO HALVES, EACH TOLD — or told as absent (Eva's ruling, Oct 6: the
     swelling and the kink are two controls). A half at 0 is an exact zero in
     the law, so "none" is a statement about the geometry, not a rounding. */
  const swellPart = L.swell > 0
    ? ` · swelling ${L.swelling.toFixed(2)}: +${(L.swell * 100).toFixed(1)}% of radius over a ${L.jointMm.toFixed(2)} mm joint (${STEM_NODE_JOINT_DIAMETERS.toFixed(2)} stem diameters, a carnation's node band; Gaussian half-width ${L.swellMm.toFixed(2)} mm)`
    : ' · no swelling (the stem keeps its radius at the nodes)';
  const kinkPart = L.slope > 0
    ? ` · kink ${L.kink.toFixed(2)}: turn ${L.turnDeg.toFixed(2)}° a node, ${L.bare ? 'at the golden angle (no leaf to turn from)' : 'away from its first leaf'}, peaking ${L.bendPeakBelowMm.toFixed(2)} mm below it (${L.bendPeakInSpreads.toFixed(3)} of the flower's spindle${L.swell > 0 ? (L.bendPeakBelowMm <= L.jointMm / 2 ? ' — inside the joint' : ` — BELOW the ${L.jointMm.toFixed(2)} mm joint, whose band ends ${(L.jointMm / 2).toFixed(2)} mm below the node`) : ''})`
    : ' · no kink (the stem runs straight through its nodes)';
  return `\n     NODES ${L.nodes.length} ${L.bare ? 'on a bare stem' : 'at the leaves'}`
    + swellPart + kinkPart
    + merged
    + ` · tip ${stem.nodeTipOffsetMm.toFixed(2)} mm off straight · worst lean ${stem.nodeTiltMaxDeg.toFixed(2)}°`
    + (stem.nodeWallPerpMm !== null && stem.nodeWallPerpMm !== undefined
        ? ` · wall ${stem.nodeWallPerpMm.toFixed(4)} mm measured square to the leaning axis (${STEM_MIN_WALL_MM} mm horizontally, as ruled — the perpendicular figure is a reported consequence)`
        : ' · solid stem, no bore — the wall question does not arise')
    + ` · ${stem.stations.length} stations`;
}

/* THE STEM CHANNEL (the sphere-stem session) — CLAMPED AND TOLD. A user asking
   for 40 petals and being shown 33 must be told which seven are missing and
   why, in the form every other clamp in this panel takes. Absent wherever the
   question does not arise, never a passing "0 omitted". */
function stemChannelLine(omission) {
  if (!omission) return '';
  const o = omission;
  if (!o.omitted.length) {
    return `     STEM CHANNEL every one of the ${o.asked} petals clears the stem`
      + ` — nearest ${Math.min(o.nearestKeptMm.live, o.nearestKeptMm.export).toFixed(2)} mm against the ${o.clearanceMm.toFixed(2)} mm printable gap\n`;
  }
  const runs = [];
  for (const k of o.omitted) {
    const last = runs[runs.length - 1];
    if (last && last[1] === k - 1) last[1] = k; else runs.push([k, k]);
  }
  const said = runs.map(([a, b]) => (a === b ? `${a}` : `${a}–${b}`)).join(', ');
  const kept = Math.min(o.nearestKeptMm.live, o.nearestKeptMm.export);
  return `     STEM CHANNEL ${o.built} of ${o.asked} petals BUILT — ${o.omitted.length} NOT BUILT (slot${o.omitted.length === 1 ? '' : 's'} ${said}),`
    + ` because the stem passes within the ${o.clearanceMm.toFixed(2)} mm printable gap of them.`
    + ` The sequence, the equal-area law and the golden angle are untouched: this is a mask over the slots, so no surviving petal moved.`
    + (o.built === 0
        ? ` NOTHING IS LEFT — this stem is wider than the head has room for, told rather than refused.\n`
        : ` Nearest petal that was kept: ${Number.isFinite(kept) ? kept.toFixed(2) : '—'} mm.\n`)
    + meridianPackingLine(o.meridian);
}

/* THE MERIDIAN PACKING MARGIN — TOLD, never clamped, and told on EVERY sphere
   that has a stem rather than only where it is tight, because a number that
   appears only at its own limit reads as an error rather than as a measurement.
   It is EXACTLY EXHAUSTED (1.00) at one reachable corner — 8 petals at the
   widest stem — which is why it may not pass silently. The clause names its
   own units: a clear meridian arc, in that foot's OWN lengths along the same
   meridian. */
function meridianPackingLine(m) {
  if (!m) return '';
  if (m.margin === null) return `     MERIDIAN PACKING n/a — ${m.why}\n`;
  /* THREE DECIMALS, not two, and the reason is this tree's own corner: the
     margin reads 1.003 at 8 petals on the widest stem, which two decimals
     round to "1.00" — indistinguishable from exhausted on the one row where
     the distinction is the whole point. No band and no second threshold: the
     only word here is EXHAUSTED, at the only place the quantity has a
     meaning of its own. */
  return `     MERIDIAN PACKING ${m.margin.toFixed(3)}x — the stem's own footprint leaves ${m.clearMm.toFixed(2)} mm of clear meridian arc above it,`
    + ` against the ${m.overhangMm.toFixed(2)} mm the pole-most petal it kept (slot ${m.slot}) occupies along that same meridian`
    + (m.exhausted
        ? `. EXHAUSTED — the arc the stem leaves is SHORTER than the one foot standing next to it; no petal could be put back there whatever the placement did. Told, never refused.\n`
        : `.\n`);
}

function styleLine(fr, styles, stamens, mode) {
  const G = fr.gynoecium;
  if (!G || !styles.length) return '';
  const s = styles[0];
  const stigmaTop = Math.max(...s.lobes.map((l) => l.apex[2]));
  /* EVERY LOBE, not the first (session 29): with the anther's lobe count a
     control, `the highest anther` has to mean the highest tip actually
     emitted or the line names a computation nobody performed. */
  const antherTop = stamens.length ? Math.max(...stamens.map((a) => Math.max(...a.lumps.map((l) => l.apex[2])))) : null;
  return `STYLE on the axis · ${G.diameter.toFixed(2)} × ${G.length} mm${G.curlDeg !== 0 ? `, curl ${G.curlDeg}°` : ', straight'} · stigma ${G.lobe.lumps === 3 && G.lobe.spreadDeg === 40 ? 'TRIFID' : G.lobe.lumps === 1 ? 'ONE LOBE' : `${G.lobe.lumps} LOBES`}: ${G.lobe.lumps} lobe${G.lobe.lumps === 1 ? '' : 's'} ${G.lobe.diameter.toFixed(2)} × ${G.lobe.length.toFixed(2)} mm at ${G.lobe.spreadDeg}° (its own line below)`
       + ` · stigma top ${stigmaTop.toFixed(2)} mm (${mode})`
       + (antherTop !== null ? `, ${Math.abs(stigmaTop - antherTop).toFixed(2)} mm ${stigmaTop >= antherTop ? 'ABOVE' : 'BELOW'} the highest anther` : '')
       + (G.widerThanHub ? ` · WIDER THAN THE HUB (${G.hubRadius.toFixed(2)} mm — a flag, never a refusal)` : G.inPetalRootAnnulus ? ` · the root STANDS INSIDE THE PETAL-ROOT ANNULUS (clear disc ${G.clearRadius.toFixed(2)} mm — a flag, never a refusal)` : ` · inside the clear disc (${G.clearRadius.toFixed(2)} mm)`)
       + (s.law.underFloor ? ' · bend radius UNDER ONE STYLE DIAMETER (told, not clamped)' : '')
       + `\n`;
}

/* THE SLENDERNESS LINE (Q7) — ONE line for every rod the centre carries,
   the filament's L/d and the style's, each over its FLOORED diameter,
   verbatim tagged: telemetry, never a gate, until a coupon is printed.
   Absent when neither part is. */
function slendernessLine(fr, mode) {
  const parts = [];
  if (fr.androecium) parts.push(fr.androecium.coil
    ? `filament ${fr.androecium.slenderness.toFixed(1)} (arc length over diameter — the longest coiled wire, ${fr.androecium.coil.arcMaxMm.toFixed(1)} mm)`
    : `filament ${fr.androecium.slenderness.toFixed(1)}${fr.androecium.lengthVariance > 0 ? ` (the longest, ${fr.androecium.lengthMaxMm.toFixed(1)} mm)` : ''}`);
  if (fr.gynoecium) parts.push(`style ${fr.gynoecium.slenderness.toFixed(1)}`);
  return parts.length ? `SLENDERNESS L/d ${parts.join(' · ')} (${mode}) — UNMEASURED — no coupon has been printed\n` : '';
}

function summarise(ui, acc, mode, rings, fr, petals, built = null) {
  const tris = acc.triangleCount.toLocaleString('en-US');
  const dim = acc.maxDimensionMm.toFixed(1);
  const layers = Number(ui.layerCount);
  /* The capability appears in the readout for the same reason every other
     value does: the contact sheet and the gates assert the app REACTED
     through the real UI route, and a state they cannot see in the readout is
     a state they cannot confirm was built. Layers and placement are here for
     that same reason, and the layer RADII are printed because they are
     derived — a number the user cannot set is a number the user should be
     able to read. */
  /* THE DEPTH AXIS IN ITS OWN UNITS, matching the panel's read-outs rather
     than restating the slider: a continuous bloom winds `layerCount` TURNS
     and carries `petalCount * layerCount` petals, so printing "petals 40" and
     "layers 3" beside a 120-petal object would be two true numbers adding up
     to a false picture. */
  const cont = fr.continuousMode;
  const depth = `${layers} ${cont ? 'turn' : 'layer'}${layers === 1 ? '' : 's'}`;
  /* UNDER FAN THE COUNT IS DERIVED AND `petalCount` IS HIDDEN, so printing
     the slider would be printing a number nothing read. `fr.slotCount` is
     footRing()'s own answer, which is what the builder actually placed. */
  /* AND WHEN THE STEM TAKES SOME OF THEM, THIS LINE SAYS SO TOO — the headline
     count is the first place a reader looks, and a bloom reporting "petals 240"
     while 218 are on it would be the panel's own number lying. The reason lives
     on the STEM CHANNEL line below; this one carries the two counts. */
  const omitted = built && built.stemOmission ? built.stemOmission.omitted.length : 0;
  const short = omitted ? ` — ${fr.sequenceLength - omitted} BUILT, ${omitted} not (the stem, see below)` : '';
  const petalsSaid = cont ? `petals ${fr.sequenceLength} (${ui.petalCount}/turn)${short}`
    : fr.fan ? `petals ${fr.slotCount} (${fr.fan.perSide}/side${fr.fan.centre ? ' + one on the line' : ''})`
    : `petals ${ui.petalCount}`;
  /* EVERY RING'S RADIUS is what this line has always printed, and at up to
     120 of them that stops being readable — so the continuous arm prints the
     SPAN and the step instead. Both are derived quantities the user cannot
     set, which is the reason the line exists at all. */
  const ringLine = cont
    ? `rings (${mode}) ${rings.length} from ${rings[0].radius.toFixed(2)} to ${rings[rings.length - 1].radius.toFixed(2)} mm`
      + `, step ${(rings[0].radius - rings[1].radius).toFixed(3)}–${(rings[rings.length - 2].radius - rings[rings.length - 1].radius).toFixed(3)} mm\n`
    /* ONE RADIUS PER WHORL, not per descriptor — same reason as
       clampedRingsPhrase above: a split whorl's descriptors share a radius,
       so listing them would print the same number three times. */
    : (layers > 1 ? `layer rings (${mode}) ${[...new Map(rings.map((r) => [r.lambda, r])).values()].map((r) => r.radius.toFixed(2)).join(' / ')} mm\n` : '');
  /* NO CENTRE WORD ON THIS LINE (session 20): the summary printed
     `center disc` on the shipping default while the A/B rig existed; the
     rig is retired and the apex is bare until the androecium lands, and a
     line naming a centre that does not exist is the label-lie this project
     retires ids over. The panel gate's retirement route asserts the word is
     ABSENT here. */
  return `${petalsSaid} · ${ui.placement.toLowerCase()} · ${depth} · spread ${Number(ui.spread).toFixed(2)}x`
       + (capability ? ` · capability ${capability.label}` : '') + `\n`
       + (rings.length > 1 ? ringLine : '')
       + fanLine(fr)
       + (built ? tubeLine(built.tube) : '')
       + (built ? varianceLine(built.variance) : '')
       + (built ? formVarianceLine(built.formVariance, built.petalsAll) : '')
       + (built ? spacingVarianceLine(built.spacingVariance, built.neighbour) : '')
       + footFloorLine(rings)
       + innerRingLine(rings, fr)
       + hubGrowthLine(fr, mode)
       + domeLine(rings, fr, mode)
       + sphereLine(rings, fr, mode)
       + seamLine(petals)
       + rootTaperLine(petals, built && built.hub ? { hub: built.hub } : fr, mode)
       + (built ? organRootTaperLines(built.sepals ? built.sepals.tiers.flatMap((T) => T.built || []) : null, built.leavesBuilt, built.leaf, built.hub, mode) : '')
       + spineLine(petals, built ? built.petalsAll : null, String(ui.placement) === 'SPIRAL' ? 'turn' : 'layer')
       + cupClampLine(petals, built && built.sepals ? built.sepals.built : null)
       + lobeLine(petals)
       + outlineLine(petals, built ? built.petalsAll : null, String(ui.placement) === 'SPIRAL' ? 'turn' : 'layer')
       + apexLine(petals)
       + tipRowBudgetLine(lastTipRowBudget)
       + infillLine(petals)
       + textureLine(built ? built.texture : null)
       + edgeProfileLine(petals)
       + fringeLine(petals)
       + (built ? stamenLine(fr, built.stamens, built.stamenNearest, mode, built.filamentStyle) + antherLine(fr, mode) + styleLine(fr, built.styles, built.stamens, mode) + stigmaLine(fr, mode) + slendernessLine(fr, mode) : '')
       + (built && built.stem && built.stem.present ? stemLine(built.stem, built.hubBuilt.joinActive, built.hubBuilt.joinThickness, built.hubBuilt.joinBlendRadius, built.hub.radius, mode, built.stemOmission || null) : '')
       + (built && built.leaf && built.leaf.present ? leafLine(built.leaf, built.leavesBuilt) : '')
       + (built && built.inflorescence && built.inflorescence.present ? infloLine(built.inflorescence, built.inflorescenceBuilt) : '')
       + (built ? sepalLine(ui, built, mode) : '')
       + (spiralLowCount(ui, fr) ? `SPIRAL BELOW ${SPIRAL_LEGIBLE_COUNT} IN THE SEQUENCE: the golden angle reads as an irregular whorl, not as phyllotaxis\n` : '')
       + (built && built.neighbour ? neighbourLine(built.neighbour, mode) : '')
       + `tris (${mode}) ${tris} · max dim (${mode}) ${dim} mm`;
}

/* HOW MANY TIMES THE MODEL HAS BEEN BUILT — the REAL SIGNAL a harness waits
   on, and it exists because a fixed sleep races the async rebuild (the flower
   project's rule, and it fired here).

   THE DEFECT IT CLOSES, found by this session and PRESENT SINCE THE FIRST
   GATE. `regenerate()` is rAF-coalesced through scheduleRegen(), so when
   applyConfig() returns — having set every value and fired every real event —
   the model has NOT necessarily been rebuilt yet. Every assertion that then
   reads __bloomMetrics() can be reading the PREVIOUS build: on a fresh page
   that is the default bloom, so a row setting all four curves can report
   `petalForm: null` and fail its own form assertion under a label naming a
   design it never measured. It is rare because a Playwright evaluate
   round-trip usually outlasts a frame — 0 of 40 unloaded on both trees, and
   it fired once in a 205-row gate run competing for four CPUs.

   Rare and silent is the worst combination this project knows: it is the
   "73 of 185 configs measuring the wrong design" defect with a timer instead
   of a read-back. settleBuild() in the harness waits on this counter. */
let buildCount = 0;
/* `pending` IS CLEARED AFTER THE BUILD, IN A `finally`, and both halves of
   that matter. After it, so `pending === false` unambiguously means no build
   is outstanding — cleared first, a waiter could observe false in the instant
   before regenerate() ran. In a `finally`, so a throwing build cannot leave
   the flag stuck true and silently stop the app rebuilding for the rest of
   the session, which is what clearing it first was defending against. */
window.__bloomBuildState = () => ({ count: buildCount, pending: regenQueued });

function regenerate() {
  buildCount++;
  const ui = readUI();
  const wasPlacement = lastPlacement;   // captured before buildGeometry() below overwrites it
  /* THE MODE ON SCREEN, decided once per build by the one owner. `record`
     marks this as the build the telemetry describes; the export handler's
     build never carries it. */
  const mode = shownMode();
  /* THE DRAG PREVIEW'S KIND, decided HERE, at run time (see dragLight). */
  const light = dragLight();
  /* NORMALS ONCE (the page profile): the builder's own normals are what PRINT
     PREVIEW shades with; the LIVE view replaces them with toCreasedNormals'
     own, so a live build asks for none (they were computed and thrown away —
     every append on the mophead paid for both). Moves no position: the
     channel is shading only (MeshBuilder's captureNormals note). */
  const { geo, acc, built } = buildGeometry({ exportMode: mode === 'export', record: true, captureNormals: mode === 'export', override: light ? DRAG_LIGHT_OVERRIDE : null, deferReports: light });
  lightOnScreen = light;
  if (light) lightBuildCount++;
  /* THE READ-OUT SPANS AND THE CAP MARK, AFTER THE BUILD (session 23) — they
     used to be refreshed before it, which was the same thing while no span
     read a built number. One of them does now (the stamen spread's cap, an
     owner's number), so both read the record THIS build produced; the span
     is still written only from here, which is what the panel gate's path
     route relies on (a changed span is proof a rebuild happened). */
  /* MARGIN BUCKLING's clamp joins the record for the same reason the
     androecium's saturation did: `buckleAmp`'s read-out and its slider MARK
     must print the OWNER's cap rather than re-derive it from the sliders.
     The petal's own form telemetry is where it lives; null on a flat build. */
  /* THE INFLORESCENCE (the umbel session): the plan and the placements, for the
     Type / pedicel read-outs that quote them. Missing before, so the Type
     read-out said "no stem to carry it" on every raceme — found on main. */
  const shown = { mode, androecium: built.androecium, gynoecium: built.gynoecium, tube: built.tube || null,
                  inflorescence: built.inflorescence || null, inflorescenceBuilt: built.inflorescenceBuilt || null,
                  /* THE LEAVES' records (leaf/stem build S3), for the leaf controls'
                     own read-outs. `leafArch`, `leafCup` and `leafTipShape` have
                     read `shown.leaf` since S2 and the tip-shape session — and
                     NOTHING EVER SET IT, so their clamp clauses (the arch under one
                     sheet thickness, the cup's fold clamp, the tip's stub) had never
                     once printed on the control; the read-out panel carried them.
                     Found by the compound leaf's own basal-ratio clamp, which reads
                     the same key. The leaf's arch (a compound leaf's is its
                     rachis's), the first blade's cup and tip, and the plan's tree. */
                  leaf: built.leaf && built.leaf.present && built.leavesBuilt && built.leavesBuilt.length
                    ? { archBuilt: built.leavesBuilt.map((r) => r.arch), cupBuilt: built.leavesBuilt.map((r) => r.cup), tipClamp: built.leavesBuilt.map((r) => r.tipClamp), compound: built.leaf.compound || null,
                      /* the LOBED leaf's two caps and its sinus gaps (S4) */
                      lobed: built.leavesBuilt.map((r) => (r.lobed ? { tiltClamped: r.lobed.tiltClamped, tiltBuiltDeg: r.lobed.tiltBuiltRad * 180 / Math.PI, sinusGaps: r.lobed.sinusGaps, teeth: r.serration,
                        /* the roundness, the lobe yield and the teeth per lobe (S4c) */
                        roundBottoms: r.lobed.roundBottoms, lobes: r.lobed.lobes, lobesAsked: r.lobed.lobesAsked, lobeYield: r.lobed.lobeYield,
                        toothRimAsked: r.lobed.toothRimAsked, teethPerLobe: r.lobed.teethPerLobe } : null)) }
                    : null,
                  buckle: (built.petal && built.petal.form && built.petal.form.buckle) || null,
                  /* THE LOBES' two caps join the record for the same reason (session
                     38): the count's and the depth's marks print the OWNER's numbers. */
                  lobes: (built.petal && built.petal.lobes) || null,
                  /* THE FRINGE's record joins for the same reason: the squared end's
                     dead travel and the tooth count's ceiling are the OWNER's numbers,
                     and both print on the track as well as in the read-out. */
                  fringe: (built.petal && built.petal.fringe) || null,
                  /* THE SPHERE'S STEM CHANNEL joins the record for the same reason
                     again: a user asking for 40 petals and being handed 33 must
                     read it ON THE CONTROL they set, not only three lines down in
                     the read-out. It is the OWNER's number — how many of this
                     slider's own petals the stem took — and nothing here derives
                     it. Null wherever the question does not arise. */
                  stemChannel: built.stemOmission || null,
                  /* THE SIZE FIELD's record joins for the same reason: the frequency
                     control's ALIASED clause prints the builder's own threshold, and the
                     phase control says it is inert on a fan from the builder's own word. */
                  variance: built.variance || null,
                  formVariance: built.formVariance || null,
                  spacingVariance: built.spacingVariance || null,
                  /* THE INFILL's record joins for the same reason once more, and
                     ruling 3 is why it MUST: density is a REQUEST, so a user who
                     asks for 40 cells and is handed 16 holes has to read that on
                     THE CONTROL THEY SET, not only in the read-out — the stem
                     channel's own case, and `stamenSpread`'s before it. Taken off
                     the first BUILT petal because the plan is a property of a
                     blade; null where no blade carries one. */
                  infill: light ? lastFullShownInfill : ((built.petalsAll && built.petalsAll[0] && built.petalsAll[0].infill) || null),
                  /* THE TEXTURE's record (T3), for the Texture controls' own read-outs — the
                     last FULL build's while a light build is on screen */
                  texture: light ? lastFullShownTexture : (built.texture || null),
                  /* THE SEPALS' record: the count ceiling and the angle limit are
                     the OWNER's numbers (footRing's and the builder's own scan),
                     printed on the two controls and hatched on their tracks; the
                     sepal's own buckle record is what the sepal twins' read-outs
                     see where the petal's fmt reads `shown.buckle`. Under SPHERE
                     with sepals asked the record says UNAVAILABLE rather than
                     going silent. */
                  sepals: built.sepals ? { ...built.foot.sepals, limit: built.sepals.limit, drawnLengthMm: built.sepals.built[0] ? built.sepals.built[0].length : null, buckle: (built.sepals.built[0] && built.sepals.built[0].form && built.sepals.built[0].form.buckle) || null, unavailable: false,
                    /* THE TIERS (F1.1a): every tier asked — built, with its station and clamps, or not and why */
                    tiers: built.sepals.tiers || null, tiersAsked: built.sepals.tiersAsked, tiersBuilt: built.sepals.tiersBuilt, tiersEligible: built.sepals.tiersEligible }
                    : (built.foot.sphereMode && Math.round(Number(ui.sepalCount) || 0) >= 1 ? { unavailable: true, asked: Math.round(Number(ui.sepalCount)) } : null),
                  /* THE SCOPES the builder was handed (Scoping-b): its own summary —
                     which layers and pairs carry an offset, and whether each
                     container's toggle was live — for the two toggles' read-outs. */
                  scopes: built.scopes || null,
                  /* THE STEM'S PLAN — `stemCut`'s read-out has read `shown.stem.cut`
                     since stem session 3 and NOTHING SET IT, so the cut's numbers
                     never printed on the control (found by Bloom P1 wiring the node
                     run beside it, the S3 leaf finding one control over). */
                  stem: built.stem || null,
                  /* THE NODE RUN AS BUILT (Bloom P1), for the start / end / spacing
                     and size-taper read-outs: the leaf plan's when leaves stand on
                     the nodes, the stem node law's on a bare noded stem, else null. */
                  nodes: nodeRunShown(built) };
  /* A LIGHT BUILD CARRIES NO INFILL PLAN, so the infill controls keep the
     last FULL build's numbers through a drag rather than flickering to none. */
  if (!light) { lastFullShownInfill = shown.infill; lastFullShownTexture = shown.texture; }
  /* THE SCOPE VIEW (Scoping-b): the bar is re-synced against the build just
     made (a pick that no longer names a scope of this arrangement ends,
     writing nothing), and while a scope is picked the spans, the caps and the
     notes describe THAT scope — its effective values and its own petal's
     record — rather than the whole bloom. Unpicked, this is the call it was. */
  lastShown = shown;
  if (syncScopeBar(ui)) applyVisibility();
  refreshLabels(ui, scopeShown(shown), scopeView ? viewUi(ui) : null);
  applyCaps(scopeShown(shown));
  refreshScopeNotes(ui);
  if (mesh) { mesh.geometry.dispose(); mesh.geometry = geo; }
  else { mesh = new THREE.Mesh(geo, material); scene.add(mesh); }
  /* The bounding SPHERE is the framing quantity (the accumulator's bounding
     BOX is the print-size quantity — two different jobs, kept apart). It is
     computed on every rebuild, not only when the camera is free, so a shot
     tool can ASK the app for the radius its own automatic fit would use
     instead of inventing a proxy from the bounding box. */
  geo.computeBoundingSphere();
  lastFitRadius = geo.boundingSphere.radius;
  /* THE SPHERE'S CENTRE, not just its radius — and the fan is what made it
     matter. Every arrangement before this one was radially symmetric, so the
     bounding sphere sat on the axis and framing at the origin with a radius
     was enough. A FAN puts all its mass on one side: at 3 per side x 15 deg
     its centre is metres from the origin in model terms, and a shot framed at
     the origin crops it. `fitCamera` already accepts a target; it had nothing
     truthful to point at until now. Telemetry only — no geometry reads it. */
  lastFitCenter = [geo.boundingSphere.center.x, geo.boundingSphere.center.y, geo.boundingSphere.center.z];
  /* THE FAN SNAP, keyed off a PLACEMENT TRANSITION rather than "is FAN" on
     every rebuild — it fires once on entry and never re-fights a manual
     orbit or a fresh dropdown pick taken since (both clear fanViewLocked).
     Leaving FAN does nothing here on purpose (Eva's ruling: stay in place,
     no snap back) — `userMoved` is already true from the entry snap, so the
     plain `!userMoved` branch below stays silent too. */
  if (ui.placement === 'FAN' && wasPlacement !== 'FAN') {
    snapToFan();
  } else if (ui.placement === 'FAN' && fanViewLocked) {
    recenterFanView();
  } else if (!userMoved) {
    fitCamera(lastFitRadius);
  }
  shownSummary = (light ? dragLine(ui) : '') + showingLine(mode) + summarise(ui, acc, mode, built.rings, built.foot, built.petals, built) + `\n${materialLines(ui, mode)}`;
  readout.textContent = shownSummary;
}

/* rAF-coalesced rebuild: many input events per frame, one build. */
let regenQueued = false;
function scheduleRegen() {
  if (regenQueued) return;
  regenQueued = true;
  requestAnimationFrame(() => { try { regenerate(); } finally { regenQueued = false; } });
}

/* THE WIDTH DRAG IS REFUSED THROUGH THE OUTLINE'S VALIDATOR (F6-sym-2, Eva's
   ruling: in CURVE mode the width scales the drawn curve, and a width that
   would put a scaled point under the print floor is refused — Q4.4's
   refuse-not-clamp rule, the point drags' own). A CAPTURE listener on the
   window, so it runs before every other listener (the scope view's capture
   on the panel included) and a refused width writes nothing anywhere: the
   slider goes back to the width the build on screen drew, the event stops,
   and the outline editor's status line says which point. In LAW mode, or
   with no petal built from the curve yet, it never refuses. */
let builtPetalWidth = null;
/* F6-SCOPE: EVERY CURVE THE WIDTH SCALES IS ASKED, EACH OF ITS OWN PETALS.
   A width edit with nothing picked moves every petal's width by the same
   delta (an offset rides on the global), so each outlined petal is asked
   about its OWN curve at its own width plus the delta; with a layer or pair
   picked, the edit sets that scope's width outright, so its petals are asked
   at the slider's value. The petals are grouped by the curve they draw (the
   builder's own record, `outlineCurve`), and each group asks the outline's
   one validator — so a per-scope curve is refused on its own petals. */
function onWidthEdit(e) {
  const w = inputs.petalWidth;
  if (e.target !== w || !w || builtPetalWidth === null) return;
  const oc = inputs.petalOutlineCurve, ctl = CONTROLS.find((c) => c.id === 'petalOutlineCurve');
  if (!oc || !ctl) return;
  const picked = scopeView && scopeView.kind !== 'tier' ? scopeView : null;
  const base = picked ? Number(scopeEffective(picked, readUI()).eff.petalWidth) : Number(builtPetalWidth);
  /* the drag's own `change` (or a step back to the built width) asks nothing
     new — and must not clear the refusal it is the tail of */
  if (Number(w.value) === base) return;
  const groups = new Map();
  for (const p of lastPetalsAll) {
    if (!p || !p.outlineCurve || !p.tipCap || !p.tipCap.outline || (picked && !petalInScope(p, picked))) continue;
    const k = JSON.stringify(p.outlineCurve);
    if (!groups.has(k)) groups.set(k, { curve: p.outlineCurve, petals: new Set() });
    groups.get(k).petals.add(p);
  }
  if (!groups.size) return;
  let reason = null;
  for (const g of groups.values()) {
    const ctx = picked
      ? curveValidatorCtx({ widthTo: Number(w.value), reaches: (p) => g.petals.has(p) })
      : curveValidatorCtx({ widthDelta: Number(w.value) - base, reaches: (p) => g.petals.has(p) });
    if (!ctx.outlinePetals) continue;
    reason = ctl.validate(g.curve, readUI(), ctx);
    if (reason) break;
  }
  if (oc.curveEditor) oc.curveEditor.showRefusal(reason ? `Petal width ${w.value} mm: ${reason}` : null);
  if (!reason) return;
  w.value = base;
  e.stopImmediatePropagation();
}
window.addEventListener('input', onWidthEdit, true);
window.addEventListener('change', onWidthEdit, true);
/* THE CUP IS REFUSED THROUGH THE SPINE'S FOLD LIMIT (spine-cup-fold): a cup —
   or a cup gradient — that would make a DRAWN spine fold the sheet through
   itself is refused the way a drag past the limit is (Q4.4: refuse, never
   clamp), by the same function on the same kind of table: each curve petal
   the edit reaches re-reads its own section at the candidate cup
   (`spine.bendProbe`, petalSurface on the petal's own ring and slot) and asks
   `spineBendRefusal`. The slider goes back to the cup the build on screen
   drew and the spine editor's status names the station. A spine on the curl
   SLIDERS is not refused — the slider family is clamped and told, and the
   build's fold limit does that. With nothing picked a cup edit moves every
   petal (an offset rides on the global); with a layer or pair picked, that
   scope's petals, at the cup the slider now shows. */
let builtCup = null;
function onCupEdit(e) {
  const id = e.target === inputs.petalCup ? 'petalCup' : e.target === inputs.petalCupGradient ? 'petalCupGradient' : null;
  /* A HAND EDIT ONLY. A value written by code — a design file, a scope load,
     a matrix row a gate applies — is a LOADED state, and a loaded state is
     clamped and told by the build (the spine-curve rulings' own split: refuse
     the drag, clamp the load). The browser marks a hand gesture `isTrusted`;
     an event dispatched by script is not. */
  if (!id || builtCup === null || !e.isTrusted) return;
  const picked = scopeView && scopeView.kind !== 'tier' ? scopeView : null;
  const ui = readUI();
  const base = picked ? Number(scopeEffective(picked, ui).eff[id]) : Number(builtCup[id]);
  const v = Number(e.target.value);
  if (v === base) return;
  const sc = inputs.petalSpineCurve;
  let reason = null;
  const asked = new Map();
  for (const p of lastPetalsAll) {
    /* a petal drawn on a curve, or one the controls now ask to draw on one
       (a mode switch and a cup in one write, before the build has caught up);
       the probe itself decides from the candidate's own surface */
    if (!p || !p.spine || !p.spine.bendProbe || !(p.spine.curveMode || ui.petalCurlMode === 'CURVE') || (picked && !petalInScope(p, picked))) continue;
    /* the candidate's GLOBAL: under a pick the slider shows the scope's
       effective value and the scope's offset rides on the global, so the
       global moves by the edit's delta; with none the global IS the slider */
    const st = { ...ui, [id]: (picked ? Number(ui[id]) : Number(builtCup[id])) + (v - base) };
    const k = `${p.whorl}|${p.slotIndex}|${JSON.stringify(p.spine.curve)}`;
    if (asked.has(k)) continue;
    const probe = p.spine.bendProbe(st);
    const r = probe ? spineBendRefusal(probe.curve, [{ askedLengthMm: p.spine.askedLengthMm, table: probe.table }]) : null;
    asked.set(k, r);
    if (r) { reason = r; break; }
  }
  if (sc && sc.curveEditor) sc.curveEditor.showRefusal(reason ? `${id === 'petalCup' ? 'Petal cup' : 'Cup gradient'} ${v}: ${reason}` : null);
  if (!reason) return;
  e.target.value = base;
  e.stopImmediatePropagation();
}
window.addEventListener('input', onCupEdit, true);
window.addEventListener('change', onCupEdit, true);

/* ===================================================================
   THE SEEDED CURVE (curves-sepals, Oct 20 — Eva's ruling: "switching to CURVE
   seeds the curve from the slider's CURRENT shape, so the petal does not
   jump"). A HAND switch of a curl mode to CURVE fits the spine curve to the
   slider spine the build on screen draws (`seedSpineCurve`), and a HAND switch
   of an outline mode to CURVE fits the outline curve to the LAW outline
   (`seedOutlineCurve`) — for the petals, for the sepals, and for whichever
   layer, pair or tier is picked (the effective state of THAT scope). The seed
   is WRITTEN ONCE, here: the sliders it was fitted to are hidden in CURVE mode
   and nothing re-fits it when one moves. Switching back to SLIDER / LAW
   touches no slider, so the slider shape returns exactly as it was. A design
   file's saved curve, a scope load and a matrix row a gate applies are LOADED
   states (no `isTrusted` event) and load the curve they carry — the cup
   refusal's own split between a hand and a load.
   The fit's error is told on the curve's own read-out until the curve is next
   edited ("the first time"); it is a fit and never claimed byte-identical.
   =================================================================== */
const SEED_MODES = {
  petalCurlMode: { curve: 'petalSpineCurve', kind: 'spine', sepal: false },
  petalOutlineMode: { curve: 'petalOutlineCurve', kind: 'outline', sepal: false },
  sepalCurlMode: { curve: 'sepalSpineCurve', kind: 'spine', sepal: true },
  sepalOutlineMode: { curve: 'sepalOutlineCurve', kind: 'outline', sepal: true },
  /* curves-leaves: the leaf's spine (the arch it replaces, on the blade or the
     compound RACHIS), the simple blade's outline and the leaflets' one */
  leafCurlMode: { curve: 'leafSpineCurve', kind: 'spine', leaf: 'leaf' },
  leafOutlineMode: { curve: 'leafOutlineCurve', kind: 'outline', leaf: 'leaf' },
  leafletOutlineMode: { curve: 'leafletOutlineCurve', kind: 'outline', leaf: 'leaflet' },
};
/* THE LEAF'S SEED (curves-leaves). THE SPINE fits the spine the ARCH draws on
   the blade the switch reaches — through `leafBladeState`, so the slider is
   handed `-leafArch` there and the fitted curve goes back UNNEGATED: a switch
   from any arch value lands on the same bend. On a compound leaf the blade is
   the RACHIS (the arch's own uniform arc over the rachis length). THE OUTLINE
   fits the LAW outline the build draws: the simple blade's lanceolate at its
   own length and width scale; the leaflets' ovate on the NARROWEST leaflet —
   every leaflet's law, divided by its own scale, is ONE curve (their shared
   tapers and tip over each leaflet's aspect), so the fit is the same on any of
   them and the narrowest is the one the floor binds. The fold limit's tables
   are the blades' own (a seed the fold limit would clamp is no fit). */
function leafSeedFor(M) {
  const ui = readUI();
  const built = lastLeavesBuilt || [];
  if (M.kind === 'spine') {
    const compound = built.some((r) => r.compound);
    const lens = compound ? [Number(ui.leafLength)] : (lastLeaf && lastLeaf.nodeLengthsMm ? lastLeaf.nodeLengthsMm.filter((x) => x > 0) : [Number(ui.leafLength)]);
    const L = Math.max(...lens, 0) || Number(ui.leafLength);
    const sub = leafBladeState({ ...ui, leafLength: L });
    const bends = built.filter((r) => r.spine && r.spine.bendTable && r.spine.bendTable.binds).map((r) => ({ askedLengthMm: r.spine.askedLengthMm, table: r.spine.bendTable }));
    return seedSpineCurve(sub, L, { lengthsMm: lens, bends });
  }
  if (M.leaf === 'leaflet') {
    const lay = compoundLeafLayoutForSeed(ui);
    const sizes = [...lay.lateral.map((q) => [q.lengthMm, q.widthMm]), [lay.terminal.lengthMm, lay.terminal.widthMm]];
    const [L, W] = sizes.reduce((a, b) => (b[1] < a[1] ? b : a), sizes[0]);
    return seedOutlineCurve(leafletBladeState(ui, L, W), L, W, { scale: leafletOutlineWidthScale(L, W), lengthsMm: [L], footHalfMm: 0 });
  }
  const lens = lastLeaf && lastLeaf.nodeLengthsMm ? lastLeaf.nodeLengthsMm.filter((x) => x > 0) : [Number(ui.leafLength)];
  const L = Math.max(...lens, 0) || Number(ui.leafLength);
  return seedOutlineCurve(leafBladeState({ ...ui, leafLength: L }), L, Number(ui.leafWidth), { scale: leafOutlineWidthScale(ui), lengthsMm: lens, footHalfMm: 0 });
}
function seedFor(modeId) {
  const M = SEED_MODES[modeId];
  if (M.leaf) return leafSeedFor(M);
  const ui = readUI();
  const picked = scopeView && idsFor(scopeView).has(modeId) ? scopeView : null;
  const eff = picked ? viewUi(ui) : ui;
  if (M.sepal) {
    /* the sepals the switch reaches — a picked tier's, else every built tier
       that owns no curve of its own for the group */
    const blades = sepalBlades().filter((b) => sepalEditReaches(b, M.curve));
    const tierState = picked ? eff : ui;
    const sub = sepalBladeState(tierState, 0);
    const lens = blades.map((b) => b.p.askedLength).filter((x) => x > 0);
    const L = lens.length ? Math.max(...lens) : (sub.bladeLengthMm > 0 ? sub.bladeLengthMm : Number(sub.petalLength) * Number(tierState.sepalScale));
    if (M.kind === 'spine') return seedSpineCurve(sub, L, { lengthsMm: lens });
    const W = sub.bladeWidthMm > 0 ? sub.bladeWidthMm : Number(sub.petalWidth) * Number(tierState.sepalScale);
    const T = blades.length ? blades[0].T : null;
    return seedOutlineCurve(sub, L, W, { scale: sepalOutlineWidthScale(tierState), lengthsMm: lens, footHalfMm: T && T.ring ? T.ring.width / 2 : 0 });
  }
  /* the petals the switch reaches — a picked layer's or pair's, else every
     petal whose curve no scope owns — and the longest of them (the outer
     whorl) is the one the shape is fitted on; the rest only bound the floor */
  const reach = M.kind === 'spine' ? spineEditReaches : outlineEditReaches;
  const petals = lastPetalsAll.filter((p) => p && p.spine && reach(p));
  const lens = petals.map((p) => p.spine.askedLengthMm).filter((x) => x > 0);
  const rep = petals.reduce((a, p) => (!a || p.spine.askedLengthMm > a.spine.askedLengthMm ? p : a), null);
  const L = rep ? rep.spine.askedLengthMm : Number(eff.petalLength);
  if (M.kind === 'spine') return seedSpineCurve(eff, L, { lengthsMm: lens });
  const ring = rep ? (lastRings || []).find((r) => Math.round(r.lambda) === Math.round(rep.whorl)) || lastRings[0] : lastRings[0];
  const W = Number(eff.petalWidth) * (L / Number(eff.petalLength));
  return seedOutlineCurve(eff, L, W, { lengthsMm: lens, footHalfMm: ring ? ring.width / 2 : 0 });
}
function onSeedSwitch(e) {
  const t = e.target;
  const id = t && t.id;
  if (!id || !SEED_MODES[id] || inputs[id] !== t || !e.isTrusted || t.value !== 'CURVE') return;
  const M = SEED_MODES[id];
  let seed;
  try { seed = seedFor(id); } catch (err) { seedNotes[M.curve] = `not seeded — ${err.message}`; return; }
  if (!seed || !seed.curve) return;
  inputs[M.curve].value = seed.curve;
  if (scopeView && idsFor(scopeView).has(M.curve)) commitScopeValue(M.curve, seed.curve);
  const split = seed.split ? ` (position ${seed.split.posMm.toFixed(3)} mm, direction ${seed.split.dirDeg.toFixed(1)}° — the direction weighed at one millimetre of blade per radian)` : '';
  seedNotes[M.curve] = `SEEDED from ${M.leaf && M.kind === 'spine' ? 'the Arch slider\'s spine' : M.leaf ? 'the leaf\'s law outline' : seed.from} on the switch — ${seed.points} points, ${seed.met ? 'within' : 'NOT within'} the ${seed.tolMm.toFixed(2)} mm tolerance: it departs from it by ${seed.errorMm.toFixed(3)} mm${split}${!seed.met && seed.constraint ? ` — stopped by ${seed.constraint}` : ''}${seed.rotationDeg ? ` (drawn turned ${seed.rotationDeg.toFixed(0)}° so it stays in front of its root; the law lays it back along the blade)` : ''}${seed.clipped ? ' (wider than the box allows — clipped at half the length)' : ''}; a fit, not the slider build to the bit`;
}
window.addEventListener('change', onSeedSwitch, true);
/* ===================================================================
   DEPTH 2'S DEFAULTS ON THE SWITCH (Eva's ruling, Oct 25 — the floor-floret
   mophead is depth 2's default; read §12 of docs/bloom-mophead-outcome.md).
   The overlay is the registry's (`UMBEL_DEPTH2_DEFAULTS`, one owner); this is
   where a HAND switch of `umbelDepth` writes it. Placements made without a
   ruling, told on the depth's read-out:
     - to depth 2, a control still at its REGISTRY default takes the overlay;
       one the visitor set is KEPT (a default is all "untouched" can mean on a
       page that records no history);
     - back to depth 1, a control still reading the OVERLAY returns to its
       registry default, one changed since is kept — so a switch there and
       back with no edit between is the page it was, to the slider value;
     - a picked scope ends first (it writes nothing), because two of the
       overlay's controls are scopeable and the panel would otherwise be
       writing the picked scope's view.
   Only an `isTrusted` change does any of it: a design file, Reset, a matrix
   row and `applyConfig` are LOADED states that carry their own values (the
   seed precedent's split), and a load clears the note. */
const sameSlider = (a, b) => Math.abs(Number(a) - Number(b)) < 1e-9;
const labelOf = (id) => (CONTROLS.find((c) => c.id === id) || { label: id }).label;
function onDepthSwitch(e) {
  const t = e.target;
  if (!t || t !== inputs.umbelDepth) return;
  if (!e.isTrusted) { delete seedNotes.umbelDepth; return; }
  const toTwo = t.value === '2';
  if (scopeView) selectScope(null);
  const wrote = [], kept = [];
  for (const [id, v] of Object.entries(UMBEL_DEPTH2_DEFAULTS)) {
    const from = toTwo ? DEFAULTS[id] : v, to = toTwo ? v : DEFAULTS[id];
    if (sameSlider(inputs[id].value, from)) { inputs[id].value = String(to); wrote.push(`${labelOf(id)} ${to}`); }
    else if (!sameSlider(inputs[id].value, to)) kept.push(`${labelOf(id)} ${inputs[id].value}`);
  }
  seedNotes.umbelDepth = (toTwo
    ? `DEPTH 2'S DEFAULTS written on the switch (the floor-floret mophead, Eva's ruling of Oct 25)${wrote.length ? `: ${wrote.join(', ')}` : ': nothing to write'}`
    : `back to depth 1: ${wrote.length ? `the registry defaults restored where depth 2's still stood — ${wrote.join(', ')}` : 'nothing still read depth 2\'s defaults'}`)
    + (kept.length ? ` · KEPT as you set them: ${kept.join(', ')}` : '');
  applyVisibility();
  scheduleRegen();
}
window.addEventListener('change', onDepthSwitch, true);
/* the seed's sentence is told until the curve is next edited */
for (const M of Object.values(SEED_MODES)) inputs[M.curve].addEventListener('input', () => { delete seedNotes[M.curve]; });
for (const c of CONTROLS) {
  inputs[c.id].addEventListener('input', () => { applyVisibility(); scheduleRegen(); });
  inputs[c.id].addEventListener('change', () => { applyVisibility(); scheduleRegen(); });
}
/* The print-preview box rebuilds through the same rAF coalescer every
   registry control uses — no visibility pass, because it is not a control
   and no predicate reads it. */
if (printPreviewInput) printPreviewInput.addEventListener('change', scheduleRegen);

/* THE DRAG / RELEASE SPLIT (F7) — see dragLight() for the three rules. All
   capture-phase on the document or window, so they run BEFORE the control's
   own listeners: a 'change' ends the drag before that same event queues its
   rebuild. */
const isSlider = (t) => t instanceof HTMLInputElement && t.type === 'range';
function endDrag() {
  if (!dragActive) return;
  dragActive = false;
  if (lightOnScreen || regenQueued) scheduleRegen();
}
document.addEventListener('pointerdown', (e) => { if (isSlider(e.target)) dragActive = true; }, true);
/* THE CURVE EDITOR'S DRAG RIDES F7's PATH (F3-global): a press on a handle of
   a live curve control is a drag until the editor's own `change` (fired at the
   release that moved a point) or a release that moved nothing, so a hand
   drawing the spine sees the drag-light build (infill cells dropped) and the
   full build on release — the slider's own bargain. A press that moves nothing
   fires no change, so pointerup ends it too. The three slider lines above and
   below stay verbatim: the drag gate's mutants are anchored on them. */
const isCurveHandle = (t) => !!(t && t.closest && t.closest('#panelControls .bl-curve svg'));
document.addEventListener('pointerdown', (e) => { if (isCurveHandle(e.target)) dragActive = true; }, true);
document.addEventListener('pointerup', (e) => { if (isCurveHandle(e.target)) setTimeout(endDrag, 0); }, true);
document.addEventListener('pointercancel', (e) => { if (isCurveHandle(e.target)) setTimeout(endDrag, 0); }, true);
window.addEventListener('pointerup', endDrag, true);
window.addEventListener('pointercancel', endDrag, true);
window.addEventListener('blur', endDrag);
document.addEventListener('change', (e) => { if (isSlider(e.target)) endDrag(); }, true);
/* For the drag-preview gate: whether a slider is held, and whether the build
   on screen is the light one. */
window.__bloomOrganMesh = () => lastOrganMesh;
window.__bloomDragState = () => ({ dragging: dragActive, lightOnScreen, lightBuilds: lightBuildCount });
/* What is ON SCREEN, as a digest of the viewport mesh's own positions — the
   drag-preview gate compares it with the exported STL's. Negative zeros are
   folded to +0 first: the STL exporter's identity transform turns -0 into +0
   and that is not a geometric difference. FNV-1a over the float32 bytes. */
window.__bloomShownDigest = () => {
  if (!mesh) return null;
  const src = mesh.geometry.getAttribute('position').array;
  const f = new Float32Array(src.length);
  for (let i = 0; i < src.length; i++) f[i] = src[i] === 0 ? 0 : src[i];
  const b = new Uint8Array(f.buffer);
  let h = 0x811c9dc5;
  for (let i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193) >>> 0; }
  return { tris: src.length / 9, fnv: h };
};

/* ---------------------------------------------------
   VIEW PRESETS — the VIEW box's dropdown. Pure camera chrome: reads
   lastFitRadius/lastFitCenter (the #129 bounding-sphere machinery — one
   owner, read here rather than recomputed) and drives the same
   camera/controls fitCamera() does, but never touches geometry, the
   registry, or readUI(). `viewPresetSelect` is a raw DOM reference exactly
   like the `autoRotate` checkbox above: not in `inputs`, not a CONTROLS
   row, invisible to readUI(), DEFAULTS, reset, export and every gate that
   reads UI state.

   A DROPDOWN PICK ANIMATES (a 650 ms ease, ported from the flower's own
   applyViewPreset/stepViewTween); THE FAN SNAP DOES NOT — Eva's ruling was
   specifically "immediate snap without rotation", so snapToFan() below sets
   the camera directly and shares no code path with the tween. */
const viewPresetSelect = document.getElementById('viewPreset');
let viewTween = null;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// One formula, every preset and the fan re-centre alike — the frustum-aware
// distance the flower's own applyViewPreset uses, so `fit` means the same
// thing here it does in bloom-view-presets.js's own header.
function presetDistance(radius, fit) {
  return (radius / Math.tan((camera.fov * DEG) / 2)) * fit;
}

function applyViewPreset(name) {
  const p = VIEW_PRESETS[name] || VIEW_PRESETS.default;
  if (!(lastFitRadius > 0)) return;   // nothing built yet
  const c = new THREE.Vector3(lastFitCenter[0], lastFitCenter[1], lastFitCenter[2]);
  const dist = presetDistance(lastFitRadius, p.fit);
  const dn = Math.hypot(p.dir[0], p.dir[1], p.dir[2]) || 1;
  const endPos = c.clone().add(new THREE.Vector3(p.dir[0] / dn, p.dir[1] / dn, p.dir[2] / dn).multiplyScalar(dist));
  const endUp = new THREE.Vector3(p.up[0], p.up[1], p.up[2]).normalize();
  camera.far = Math.max(camera.far, dist * 20);   // widen up front so nothing clips mid-flight; tightened on arrival
  camera.updateProjectionMatrix();
  viewTween = {
    startPos: camera.position.clone(), endPos,
    startTarget: controls.target.clone(), endTarget: c,
    startUp: camera.up.clone(), endUp,
    endNear: Math.max(0.05, dist * 0.02), endFar: dist * 20,
    t0: performance.now(), dur: 650,
  };
  controls.autoRotate = false;   // paused during the flight; resumed per the checkbox on arrival
  /* A chosen preset is a deliberate camera placement, same standing as a
     manual drag: without this, the next slider tweak's `!userMoved` branch
     (or, mid-FAN, the re-centre branch) would silently undo it. */
  userMoved = true;
  fanViewLocked = false;
}

function stepViewTween() {
  const e = easeInOutCubic(Math.min(1, (performance.now() - viewTween.t0) / viewTween.dur));
  camera.position.lerpVectors(viewTween.startPos, viewTween.endPos, e);
  controls.target.lerpVectors(viewTween.startTarget, viewTween.endTarget, e);
  camera.up.copy(viewTween.startUp).lerp(viewTween.endUp, e).normalize();
  camera.lookAt(controls.target);
  if (e >= 1) {
    camera.up.copy(viewTween.endUp);
    camera.near = viewTween.endNear; camera.far = viewTween.endFar;
    camera.updateProjectionMatrix();
    controls.update();
    controls.autoRotate = document.getElementById('autoRotate').checked;
    viewTween = null;
  }
}
if (viewPresetSelect) viewPresetSelect.addEventListener('change', () => applyViewPreset(viewPresetSelect.value));

/* THE FAN SNAP (Eva's ruling). Selecting FAN placement moves the camera to
   TOP-DOWN, centred on the model's own bounding-sphere centre, immediately
   and without an animation — no button, unlike the flower's manual
   "Auto-center (top-down)". Shares VIEW_PRESETS.top with the dropdown's own
   TOP-DOWN entry (one owner for that framing, however it's reached) but
   sets the camera directly rather than through the tween. */
function snapToFan() {
  const p = VIEW_PRESETS.top;
  const c = new THREE.Vector3(lastFitCenter[0], lastFitCenter[1], lastFitCenter[2]);
  const dist = presetDistance(lastFitRadius, p.fit);
  const dn = Math.hypot(p.dir[0], p.dir[1], p.dir[2]) || 1;
  camera.up.set(p.up[0], p.up[1], p.up[2]);
  controls.target.copy(c);
  camera.position.set(c.x + (p.dir[0] / dn) * dist, c.y + (p.dir[1] / dn) * dist, c.z + (p.dir[2] / dn) * dist);
  camera.near = Math.max(0.05, dist * 0.02);
  camera.far = dist * 20;
  camera.updateProjectionMatrix();
  controls.update();
  controls.autoRotate = false;
  document.getElementById('autoRotate').checked = false;   // OFF, and nothing resumes it silently — Eva's ruling
  userMoved = true;
  fanViewLocked = true;
  if (viewPresetSelect) viewPresetSelect.value = 'top';   // keep the dropdown honest about the framing it now shows
}

/* Re-centre only, same direction/distance ratio — a fan control tweaked
   after the snap (spacing, per-side count, the mirror toggle) can shift the
   bounding-sphere centre without the user having touched the camera since.
   Same correction principle as the flower's refitCamera when a stem grows
   the plant past its initial framing: keep the view direction, recentre and
   redistance to the fresh bounds. Runs only while fanViewLocked — a manual
   orbit or a fresh dropdown pick already cleared it, and holds the camera
   wherever the user left it instead. */
function recenterFanView() {
  const c = new THREE.Vector3(lastFitCenter[0], lastFitCenter[1], lastFitCenter[2]);
  let dx = camera.position.x - controls.target.x, dy = camera.position.y - controls.target.y, dz = camera.position.z - controls.target.z;
  const dl = Math.hypot(dx, dy, dz) || 1; dx /= dl; dy /= dl; dz /= dl;
  const dist = presetDistance(lastFitRadius, VIEW_PRESETS.top.fit);
  controls.target.copy(c);
  camera.position.set(c.x + dx * dist, c.y + dy * dist, c.z + dz * dist);
  camera.near = Math.max(0.05, dist * 0.02);
  camera.far = dist * 20;
  camera.updateProjectionMatrix();
  controls.update();
}

/* ---------------- STL export ---------------- */
document.getElementById('exportStl').addEventListener('click', () => {
  const ui = readUI();
  /* ALWAYS EXPORT MODE, NEVER RECORDED, AND shownMode() IS NOT READ HERE —
     the three clauses the print-preview toggle's byte argument rests on
     (see shownMode's note). The panel gate flips the box and requires the
     STL on either side of it byte-identical. */
  const { geo, acc, built } = buildGeometry({ exportMode: true });
  const exportTris = acc.triangleCount;   // the accumulator owns the count, in both modes
  if (exportTris > EXPORT_TRI_BUDGET) {
    geo.dispose();
    readout.innerHTML = `<span class="bl-err">export refused: ${exportTris.toLocaleString('en-US')} tris (export) exceeds the ${EXPORT_TRI_BUDGET.toLocaleString('en-US')} budget</span>`;
    return;
  }
  const stl = new STLExporter().parse(new THREE.Mesh(geo, material), { binary: true });
  geo.dispose();
  const blob = new Blob([stl], { type: 'model/stl' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bloom.stl';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  /* Both counts, both LABELLED — live and export modes are not convertible
     (the export floor changes geometry), so one word never covers both.

     THE LAST LINE, not line [1]. summarise() emits a variable number of lines
     now (the layer radii and the low-count spiral flag are conditional), and
     an index into a variable-length list is a bug waiting for the first
     multi-layer export — it would have printed the ring radii under the word
     "exported". The tris/max-dim line is always last, so ask for that. */
  const exportLines = summarise(ui, acc, 'export', built.rings, built.foot, built.petals, built).split('\n');
  readout.textContent = `${shownSummary}\n`
    + `exported bloom.stl · ${exportLines[exportLines.length - 1]} · min sheet ${acc.minThickness.toFixed(2)} mm`;
});

/* THE GRID EXPORT (session 28) — the per-petal mid-surface, not the object.

   IT FOLLOWS shownMode(), AND THE STL DELIBERATELY DOES NOT. That is not an
   inconsistency: the STL is the thing being made, so it is always the export
   geometry and the toggle must not be able to change a printed part. The
   grid is a DESCRIPTION of what is on screen, so the honest thing is to
   describe what is on screen and label which it was — the mode label rides
   in `asset.extras.mode`, in the filename and in the read-out, so the two
   can never be confused for each other.

   NO TRIANGLE BUDGET CHECK, because there are no triangles: the budget
   refuses an STL nobody could slice, and a line-strip file's size is bounded
   by petals x rows x columns, which is bounded by MAX_LAYERS and the petal
   count. The largest reachable file is on the order of a megabyte. The
   POINT count is reported instead, in the read-out and in the file. */
document.getElementById('exportGrid').addEventListener('click', () => {
  const mode = shownMode();
  const { geo, built, ui: builtUi } = buildGeometry({ exportMode: mode === 'export', captureGrid: true });
  geo.dispose();   // the grid export never renders; the BufferGeometry is buildGeometry's, not ours
  let glb;
  try {
    glb = buildGridGltf(built, { mode, state: builtUi, generator: 'Parametric Bloom — bloom-grid-gltf' });
  } catch (err) {
    readout.innerHTML = `<span class="bl-err">grid export failed: ${err.message}</span>`;
    return;
  }
  const blob = new Blob([glb], { type: 'model/gltf-binary' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `bloom-grid-${mode}.glb`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);

  /* WHAT WENT INTO THE FILE IS SAID AT THE BUTTON, not only inside the
     extras. It used to have a standing gap to report — a RADIAL bloom of
     eight petals exported ONE — and does not any more; the line stays,
     because a petal whose own grid was not capturable would still be absent
     and a reader who does not open the extras would have no way to know. */
  const emitted = (built.petalsAll || built.petals).filter((p) => p && p.grid).length;
  const gap = emitted < built.petalsBuilt
    ? ` · ${emitted} of ${built.petalsBuilt} petals (the rest carry no capturable grid)`
    : ` · all ${emitted} petals`;
  readout.textContent = `${shownSummary}\n`
    + `exported bloom-grid-${mode}.glb · ${mode} geometry${gap} · ${(glb.byteLength / 1024).toFixed(0)} KB`;
});

/* Contact-sheet hooks (see the note beside __bloomUIState). __bloomFrame sets
   userMoved so the next rebuild's automatic refit does not silently undo the
   framing the tool just asked for — a screenshot of a camera that moved back
   is exactly the class of instrument error that padded the flower's pixel
   diffs for months. */
window.__bloomMetrics = () => ({
  ringRadius: lastRing.radius,
  derivedRadius: lastRing.derivedRadius,
  /* NO centerStyle / centerTris / centerSeat (session 20): the designed
     centre is retired, and a metric that reported 'NONE' / 0 / null for a
     thing that no longer exists would be a number under a label naming a
     computation nobody performs. Tools that read them died with the rig. */
  /* WHICH GEOMETRY EVERY NUMBER BELOW DESCRIBES (Sep 3, the print-preview
     toggle). `shownTris` is the count of the build on screen in whatever
     mode it was built. `liveTris` keeps its name and its meaning — the LIVE
     build's count — and is therefore NULL while the preview is on, never the
     export count wearing a live label: a caption that prints it then prints
     "null" loudly rather than a number that is not the number. Both STL
     gates assert `shownMode === 'live'` on every row; a sheet that toggles
     captions from `shownTris` and `shownMode`. */
  shownMode: lastShownMode,
  /* F7: whether the build on screen is the drag preview (infill cells
     dropped). False at rest, always — the drag-preview gate holds that. */
  shownLight: lightOnScreen,
  shownTris: lastTris,
  liveTris: lastShownMode === 'live' ? lastTris : null,
  maxDimMm: lastMaxDim,
  fitRadius: lastFitRadius,
  fitCenter: [...lastFitCenter],
  capability: capability ? capability.label : null,
  /* THE SCOPES the build on screen was handed (Scoping-a), the builder's own
     summary — null on every shipped state. */
  scopes: lastScopes,
  /* THE PETAL'S OWN MEASUREMENTS, from the builder that made it. The
     capability assertions and the single-petal framing read these rather
     than re-deriving a profile or a projection — a consumer inventing its
     own copy of a boundary is this project's most repeated defect.

     SCOPE, stated here and repeated in the gates' own output: `profile` and
     `tipSpans` are the APP'S evaluation of the width profile and the trim
     domain, not a measurement of the exported STL. Watertightness and
     connectedness are measured on the export; the structural claims are
     measured here. */
  petalProfile: lastPetal ? lastPetal.profile : null,
  /* F6-asym: the last petal's two halves, null on a one-sided petal */
  petalProfileSides: lastPetal && lastPetal.profileL ? { left: lastPetal.profileL, right: lastPetal.profileR, baseLeft: lastPetal.profileBaseL, baseRight: lastPetal.profileBaseR } : null,
  /* EACH ROW'S OWN STATION, beside its half-width. A5 and A6 both need to know
     WHERE a row is, and both were wrong reconstructing it from the array index
     — `profile` leads with the foot rows, so the offset is however many of
     those there are. The builder already knows; this passes it through. */
  petalProfileU: lastPetal ? lastPetal.profileU : null,
  /* AND THE BASE HALF-WIDTH AT EACH ROW — the outline before the lobe cut.
     A6 fits PETAL TIP SHAPE's own curve, and under MODEL B the cut reaches
     the apex, so the emitted half-width is no longer that curve. */
  petalProfileBase: lastPetal ? lastPetal.profileBase : null,
  petalFootRows: lastPetal ? lastPetal.footRows : null,
  petalPanels: lastPetal ? lastPetal.panels : null,
  petalTipSpans: lastPetal ? lastPetal.tipSpans : null,
  petalMid: lastPetal ? lastPetal.mid : null,
  petalTip: lastPetal ? lastPetal.tip : null,
  /* The converging tip cap's own numbers (Eva's ruling, Sep 1). Named
     `petalTipCap` and never `petalTip`, which is the tip's POSITION. */
  petalTipCap: lastPetal ? lastPetal.tipCap : null,
  /* F6-scope: which petal the representative records describe (its layer and
     slot), so a gate can restate ITS outline from the controls and the row's
     scopes rather than read the whole bloom's */
  petalSlot: lastPetal ? { whorl: lastPetal.whorl, slotIndex: lastPetal.slotIndex } : null,
  /* F6-scope — EVERY BUILT PETAL'S OUTLINE (OC5): its layer and slot, the mode
     it was built in, the plan's own points per half, and its emitted base
     half-widths per half on its own stations. Null on a bloom whose every
     petal is LAW and carries no scope — the census the clause needs is then
     empty by construction. */
  petalAllOutline: lastPetalsAll.some((p) => p && (p.outlineMode === 'CURVE' || p.scopeTerm)) ? lastPetalsAll.map((p) => (p ? {
    whorl: p.whorl, slotIndex: p.slotIndex, mode: p.outlineMode, mirrored: !!p.outlineMirrored,
    twoSided: !!(p.tipCap && p.tipCap.twoSided),
    pointsL: p.tipCap && p.tipCap.outline ? (p.tipCap.twoSided ? p.tipCap.outline.sides.left.points : p.tipCap.outline.points) : null,
    pointsR: p.tipCap && p.tipCap.outline && p.tipCap.twoSided ? p.tipCap.outline.sides.right.points : null,
    u: p.profileU, hL: p.profileBaseL || p.profileBase, hR: p.profileBaseR || p.profileBase,
  } : null)) : null,
  /* F3-scope — EVERY BUILT PETAL'S SPINE (C4): its layer, slot and azimuth, the
     mode it was built in (the spine record's own `curveMode`), the curve the
     law consumed, the law's record, the built turn and the EMITTED spine rows,
     so a gate can restate each petal's spine from the controls and the row's
     scopes and read a FAN pair's two spines off the drawn rows. Null on a bloom
     with no petal in CURVE mode and no scope — nothing to assert. */
  petalAllSpine: lastPetalsAll.some((p) => p && ((p.spine && p.spine.curveMode) || p.scopeTerm)) ? lastPetalsAll.map((p) => (p && p.spine ? {
    whorl: p.whorl, slotIndex: p.slotIndex, azimuth: p.azimuth, curveMode: !!p.spine.curveMode, curve: p.spine.curve,
    curveLaw: p.spine.curveLaw, turnBuiltDeg: p.spine.turnBuiltDeg, clamped: p.spine.clamped, askedLengthMm: p.spine.askedLengthMm,
    from: p.spineFrom || null, rows: p.spine.rows,
  } : null)) : null,
  /* spine-cup-fold — EVERY BUILT PETAL'S FOLD LIMIT, so the panel gate's route
     (ak) reads what the BUILDER held (clamped or not, the worst station's
     record) beside what the read-out says. Null where no petal bends at all. */
  spineFold: lastPetalsAll.some((p) => p && p.spine) ? lastPetalsAll.map((p) => (p && p.spine ? { bendClamped: !!p.spine.bendClamped, bend: p.spine.bend || null } : null)) : null,
  petalBladeLadder: lastPetal ? lastPetal.bladeLadder : null,
  petalNormal: lastPetal ? lastPetal.normal : null,
  /* The blade's WIDTH direction at the midpoint — a profile view looks down
     this. It is reported rather than recomputed because under twist it is
     no longer the ring tangent, so a shot tool deriving it from azimuth
     would not merely be a second owner, it would be wrong. */
  petalTangent: lastPetal ? lastPetal.tangent : null,
  petalAxis: lastPetal ? lastPetal.axis : null,
  /* FORM TELEMETRY, and the scope is the point. Both shipped gates are
     structurally BLIND to this session's failure modes: the export gate
     counts boundary edges on a fixed-topology grid, which pure displacement
     cannot change, and connectedness cannot fire because the foot is never
     written and the hub spans it. So the properties that CAN break — the
     foot staying put, the roll staying isometric, the curvature floor
     holding, and the all-zero guard not hiding a wrong form path — are
     measured here, from the builder that made the geometry, and asserted by
     both gates on every row. */
  petalForm: lastPetal ? lastPetal.form : null,
  /* LOBE TELEMETRY (session 38, PR 2) — the builder's own record of the cut:
     what was asked, what was built, both caps and which one bound, the pitch
     against its floor, the window in u and in mm, the sinus stations, and
     the rows the ladder gave each lobe. Null on a plain petal. Both STL gates
     are structurally blind to a wrong cut (a petal cut in the wrong place is
     watertight and one piece), so the L family reads this. */
  petalLobes: lastPetal ? (lastPetal.lobes ?? null) : null,
  petalFringe: lastPetal ? (lastPetal.fringe ?? null) : null,
  petalFootFrames: lastPetal ? lastPetal.footFrames : null,
  petalGuardResidual: lastPetal ? lastPetal.guardResidual : null,
  /* THE FOOT RING'S OWN CROSS-SECTION, exposed so the reworked foot
     assertion can compare the EMITTED foot against footRing()'s answer
     rather than against a fixed expectation. Before the thickness layer the
     expectation could be fixed, because the foot was; with foot controls it
     derives from state, and a gate keeping its own copy of that derivation
     would be this project's most repeated defect arriving in the instrument
     built to catch it. `derivedRadius`, `authoredWidth` and the clamp flags
     stay telemetry — nothing geometric reads them. */
  ringWidth: lastRing.width,
  ringThickness: lastRing.thickness,
  ringOverhang: lastRing.overhang,
  ringAuthoredWidth: lastRing.authoredWidth,
  ringWidthClamped: lastRing.widthClamped,
  ringThicknessFloorBinds: lastRing.thicknessFloorBinds,
  /* THE ARRANGEMENT, PER LAYER — what junctionAssertions() reads. Every one
     of these is footRing()'s OWN answer, exposed rather than re-derived, for
     the same reason ringWidth/ringThickness were: a gate keeping its own copy
     of a boundary is this project's most repeated defect, and it would arrive
     here inside the instrument built to catch it.

     WHY THIS EXISTS AT ALL — and it is a derivation, not a hedge. The voxel
     gate CANNOT police the junction under layers, measured Sep 1: building
     the hub at the WRONG layer's radius (min instead of max) leaves the outer
     whorl's feet ending 7.94 mm out against a hub that stops at 6.86 mm —
     detached from the hub by construction — and the gate reports ONE region,
     0% detached. Consecutive foot annuli overlap each other, so the outer
     whorl is held on by a CHAIN through the inner layers. Connectedness at
     multi-layer is over-determined and the gate cannot tell a correct hub
     from an incorrect one. J3 below is the assertion that can. */
  hubRadius: lastHub.radius,
  /* THE HUB'S GROWTH FOR AN OWNED RING (Oct 16) — footRing()'s record, or null. */
  hubGrowth: lastHub.growth ? { ...lastHub.growth } : null,
  hubThickness: lastHub.thickness,
  /* THE HUB'S OWN ROOT FACTOR (big petals): the law read on the longest blade
     the hub must carry, or null — and the sheet it multiplies. */
  hubRootTaper: lastHub.rootTaper ? { askedLengthMm: lastHub.rootTaper.lengthMm, rootFactor: lastHub.rootTaper.rootFactor } : null,
  hubSheetThickness: lastHub.sheetThickness ?? null,
  /* THE STEM AND THE HUB-TO-STEM JOIN (session 43) — ST0-ST6's measured side.
     `stem` is NULL and not absent when there is no stem: ST1 distinguishes "the
     builder says there is none" from "the builder says nothing", and a missing
     key is the second. The root and tip are built here from the plan's own two
     heights rather than stored twice. */
  stem: lastStem ? {
    lengthMm: lastStem.lengthMm, outerR: lastStem.outerR, boreR: lastStem.boreR, wallMm: lastStem.wallMm,
    /* The tip stands on the DECLARED axis — the world axis without nodes, the
       node law's offset at the stem's length with them (`stemAxisAt`, the one
       front door). ST2 restates that offset rather than reading it here. */
    root: [0, 0, lastStem.rootZ], tip: [...stemAxisAt(lastStem, lastStem.lengthMm), lastStem.tipZ],
    /* the two heights ID9 reads the head's FLOOR from (build 3): the root plane
       and the plan's own lowest head material (a dome's rim) */
    rootZ: lastStem.rootZ, lowestHubZ: lastStem.lowestHubZ,
    voidStations: lastStem.voidStations ? lastStem.voidStations.slice() : null,
    /* MEASURED FROM WHAT THE BUILDER EMITTED, not from the plan's own two
       heights: ST4 asks whether the root really runs THROUGH the slab, and a
       builder that started at the underside would leave the plan saying it
       did. See buildStemInto's own note. */
    rootSpanMm: (lastStemBuilt && lastStemBuilt.emittedTopZ !== undefined ? lastStemBuilt.emittedTopZ : lastStem.topZ) - lastStem.rootZ,
    stations: lastStem.stations.slice(), sides: lastStem.sides,
    hiddenMm: lastStem.hiddenMm, visibleMm: lastStem.visibleMm,
    /* THE HUB SHAPE (the hub-shape session) — style, pronouncedness and reach,
       plus the reach-below-the-head and the total-below-the-head the read-out
       and the gates read. `swellActive` is the plan's own inert flag (a styled
       swell is built iff true); `hubLengthAuto` says the reach is the derived
       joinT rather than an asked length. */
    hubStyle: lastStem.hubStyle, hubAmount: lastStem.hubAmount, hubR: lastStem.hubR, hubT: lastStem.hubT,
    hubLengthAsked: lastStem.hubLengthAsked, hubLengthAuto: lastStem.hubLengthAuto, hubReachClamped: lastStem.hubReachClamped,
    axisDepth: lastStem.axisDepth, swellActive: lastStem.swellActive,
    belowHeadMm: lastStem.belowHeadMm, joinReason: lastStem.joinReason,
    /* THE SOLID ROOT BAND (Eva's ruling). The PLAN's own answer, which is what
       ST1 predicts the triangle count from — the builder owns the count and the
       plan owns the shape it was asked for, and those two owners are the whole
       point of that clause. `headOuterMm` rides with it because the READ-OUT
       wants the length the condition was decided on and not just the verdict.
       (An earlier draft of this comment also named an `ST10`. There is no ST10:
       the band's EXTENT is asserted by nothing, which is stated as a declared
       blindness in §8 of the outcome doc rather than left to be discovered — a
       comment naming a clause that does not exist is this project's own
       recorded defect, and it is not going to ship from here.) */
    headOuterMm: lastStem.headOuterMm, headInsideBore: lastStem.headInsideBore,
    solidBandMm: lastStem.solidBandMm,
    /* THE BORE AS AN INTERVAL (the tip-plug session). The root band shuts it
       where the head would otherwise stand inside it and the TIP PLUG shuts it
       where a viewer would otherwise look up it, so what the plan declares is
       the bore that SURVIVES the two — and where they meet, none does. ST1
       predicts the triangle count from these and ST10 checks the plug against
       Eva's own wall thickness, which is why both the ASKED-FOR shape and the
       EMITTED rings are here: the plan owns the first and the builder the
       second, and a clause holding both would be checking a record against
       itself. `solidBandZ` is gone with them — it was `voidTopZ` under an older
       name, and two names for one number is a second producer. */
    tipPlugMm: lastStem.tipPlugMm, voidMm: lastStem.voidMm,
    voidTopZ: lastStem.voidTopZ, voidBottomZ: lastStem.voidBottomZ,
    solidThrough: lastStem.solidThrough,
    /* THE FLORIST'S CUT (ruling 7) — the PLAN's own record (what was asked:
       on/made/inert, the land, the span, the plug) beside the cut ring the
       BUILDER emitted (`emittedCut`: the vertices, the face's projected area,
       the land count). SC1 restates the cut from the CONTROLS and reads the
       emitted ring; ST10's end-face clause reads the emitted face. */
    cut: lastStem.cut ? JSON.parse(JSON.stringify(lastStem.cut)) : null,
    tubeStations: lastStem.tubeStations ? lastStem.tubeStations.slice() : null,
    emittedCut: lastStemBuilt && lastStemBuilt.emittedCut ? JSON.parse(JSON.stringify(lastStemBuilt.emittedCut)) : null,
    emittedTopZ: lastStemBuilt ? lastStemBuilt.emittedTopZ : undefined,
    emittedVoid: lastStemBuilt ? lastStemBuilt.emittedVoid : undefined,
    emittedVoidTopZ: lastStemBuilt ? lastStemBuilt.emittedVoidTopZ : undefined,
    emittedVoidBottomZ: lastStemBuilt ? lastStemBuilt.emittedVoidBottomZ : undefined,
    directedMismatch: lastStemBuilt ? lastStemBuilt.directedMismatch : undefined,
    emittedBottomAreaMm2: lastStemBuilt ? lastStemBuilt.emittedBottomAreaMm2 : undefined,
    /* THE EMITTED RINGS THEMSELVES — ST2's axis and length and ST3's radii read
       these, never the plan beside them. Same reason as rootSpanMm above: the
       plan is what was ASKED FOR and these are what came out. */
    emittedMaxR: lastStemBuilt ? lastStemBuilt.emittedMaxR : undefined,
    emittedMinR: lastStemBuilt ? lastStemBuilt.emittedMinR : undefined,
    emittedAxisOffset: lastStemBuilt ? lastStemBuilt.emittedAxisOffset : undefined,
    emittedTipZ: lastStemBuilt ? lastStemBuilt.emittedTipZ : undefined,
    /* THE NODES (ST12). The PLAN's declared law beside the rings the BUILDER
       emitted; ST12 restates the law from the controls and the leaves' own
       node depths and reads it off `emittedRings`, never off `nodeLaw`. */
    nodeLaw: lastStem.nodeLaw ? JSON.parse(JSON.stringify(lastStem.nodeLaw)) : null,
    nodeTiltMaxDeg: lastStem.nodeTiltMaxDeg, nodeTipOffsetMm: lastStem.nodeTipOffsetMm,
    nodeMaxOuterR: lastStem.nodeMaxOuterR, nodeWallPerpMm: lastStem.nodeWallPerpMm, nodeWallPerpAtMm: lastStem.nodeWallPerpAtMm,
    emittedRings: lastStemBuilt && lastStemBuilt.emittedRings ? lastStemBuilt.emittedRings.map((r) => ({ ...r })) : null,
  } : null,
  stemTris: lastStemTris,
  /* THE LEAVES (LF0-LF7). The PLAN's own declarations beside the BUILDER's own
     emitted records, which is the split every clause here rests on: LF1
     predicts the count from the plan's azimuth list and compares it against the
     tally, LF2 reads the emitted root radii, LF3 the emitted solid crossing.
     Two owners, and the arithmetic between them is stated in the clause. */
  leaf: lastLeaf ? {
    lengthMm: lastLeaf.lengthMm, widthMm: lastLeaf.widthMm, angleDeg: lastLeaf.angleDeg,
    nodes: lastLeaf.nodes, phyllotaxy: lastLeaf.phyllotaxy, divergenceDeg: lastLeaf.divergenceDeg,
    nodeDepthsMm: lastLeaf.nodeDepthsMm.slice(),
    azimuths: lastLeaf.azimuths.map((a) => a.slice()),
    rootR: lastLeaf.rootR, petioleR: lastLeaf.petioleR, petioleLenMm: lastLeaf.petioleLenMm,
    insetAskedMm: lastLeaf.insetAskedMm, insetNeededMm: lastLeaf.insetNeededMm,
    insetMm: lastLeaf.insetMm, insetClamped: lastLeaf.insetClamped,
    insetSatisfied: lastLeaf.insetSatisfied,
    nodesAsked: lastLeaf.nodesAsked, nodesBuilt: lastLeaf.nodesBuilt, nodesClamped: lastLeaf.nodesClamped,
    slenderness: lastLeaf.slenderness,
    /* WHERE THE NODES GO AND LEAF SIZE ALONG THE STEM (Bloom P1) — the NS
       family's record side: the run as asked and built, the taper, the scale
       the inset was read at, each node's own leaf (null with no taper), and
       which node each built leaf stands on. */
    nodeRun: lastLeaf.nodeRun ? { ...lastLeaf.nodeRun } : null, sizeTaper: lastLeaf.sizeTaper, topScale: lastLeaf.topScale,
    nodeSizes: lastLeaf.nodeSizes ? lastLeaf.nodeSizes.map((q) => ({ scale: q.scale, scaleAsked: q.scaleAsked, floored: q.floored, runT: q.runT,
      lengthMm: q.lengthMm, widthMm: q.widthMm, petioleR: q.petioleR, petioleLenMm: q.petioleLenMm,
      lobed: q.lobed ? JSON.parse(JSON.stringify(q.lobed)) : null, lobedPetiole: q.lobedPetiole ? { ...q.lobedPetiole } : null,
      simplePetiole: q.simplePetiole ? { ...q.simplePetiole } : null, compound: q.compound ? JSON.parse(JSON.stringify(q.compound)) : null })) : null,
    leafNode: (lastLeavesBuilt || []).map((r) => r.nodeIndex),
    /* THE SHARED NODE (SN0-SN3): the plan's own flag and record. */
    shared: lastLeaf.shared === true,
    sharedNode: lastLeaf.sharedNode ? (({ bladeP, ...rest }) => ({ ...rest, pedicelDepthsMm: rest.pedicelDepthsMm.slice() }))(lastLeaf.sharedNode) : null,
    /* THE LEAF LENGTH AT A FLOWERING NODE (SN4): each node's built length and
       petiole, and the cap's record — null off a raceme. */
    nodeLengthsMm: lastLeaf.nodeLengthsMm ? lastLeaf.nodeLengthsMm.slice() : null,
    nodePetioleLenMm: lastLeaf.nodePetioleLenMm ? lastLeaf.nodePetioleLenMm.slice() : null,
    lengthCap: lastLeaf.lengthCap ? { ...lastLeaf.lengthCap, capsMm: lastLeaf.lengthCap.capsMm.map((x) => (Number.isFinite(x) ? x : null)), lengthsMm: lastLeaf.lengthCap.lengthsMm.slice() } : null,
    /* THE TIP (LF9): the exponent the PLAN declares, the half-widths the BLADE
       was built from, and the terminal-clamp record the read-out prints. */
    tipShape: lastLeaf.tipShape,
    /* THE LEAF'S TYPE (leaf/stem build S3): the PLAN's statement, whether a
       raceme's shared node pinned a compound ask, and the compound tree the
       plan laid out (null for a simple leaf). LF14 holds the plan against the
       registry's `leafCompound` and the builder's emitted blades. */
    type: lastLeaf.type, typePinned: lastLeaf.typePinned === true, typeAsked: lastLeaf.typeAsked,
    /* the LOBED leaf's law AS ASKED (S4) — null on every other leaf */
    lobed: lastLeaf.lobed ? JSON.parse(JSON.stringify(lastLeaf.lobed)) : null,
    /* the LOBED petiole's area law (S4b) — LF26's subject; null otherwise */
    lobedPetiole: lastLeaf.lobedPetiole ? { ...lastLeaf.lobedPetiole } : null,
    /* (root support) the SIMPLE leaf's root-carrying petiole — LF18 / T6's
       record of whether the stem clamped it; null where no root floor binds */
    simplePetiole: lastLeaf.simplePetiole ? { ...lastLeaf.simplePetiole } : null,
    compound: lastLeaf.compound ? JSON.parse(JSON.stringify(lastLeaf.compound)) : null,
    /* PER BLADE, NOT PER LEAF (S3): every array below that describes a BLADE
       has one entry per emitted blade — a simple leaf's one, a compound
       leaf's every leaflet in the layout's own build order — so LF9-LF13 hold
       every leaflet to the blade law exactly as they hold a simple blade.
       `bladeOf` names each entry's leaf and role. A simple leaf is one blade,
       so on every simple row these are the per-leaf arrays they always were. */
    bladeOf: (lastLeavesBuilt || []).flatMap((r, i) => leafBlades(r).map((b) => (r.compound
      ? { leaf: i, role: b.role, k: b.k, side: b.side, lengthMm: b.lengthMm, widthMm: b.widthMm }
      : { leaf: i, role: 'blade', k: 0, side: 0, lengthMm: null, widthMm: null }))),
    rowHalfBaseMm: (lastLeavesBuilt || []).flatMap((r) => leafBlades(r).map((b) => b.rowHalfBaseMm)),
    /* the station each of those rows was built at, per blade (S5: a nib takes
       rows for its arc, so `i / nu` is no longer the answer) */
    rowU: (lastLeavesBuilt || []).flatMap((r) => leafBlades(r).map((b) => b.rowU)),
    tipClamp: (lastLeavesBuilt || []).flatMap((r) => leafBlades(r).map((b) => b.tipClamp)),
    /* (curves-leaves) an ASYMMETRIC drawn outline's RIGHT half, per blade — the
       two lists above carry its LEFT half (null on a symmetric blade) — and
       each blade's drawn-outline record and each leaf's drawn-spine record
       (the simple or lobed blade's, or a compound leaf's RACHIS's), the fold
       table summarised. LF37's measured side. */
    rowHalfBaseRightMm: (lastLeavesBuilt || []).flatMap((r) => leafBlades(r).map((b) => b.rowHalfBaseRightMm || null)),
    rowHalfRightMm: (lastLeavesBuilt || []).flatMap((r) => leafBlades(r).map((b) => b.rowHalfRightMm || null)),
    outlineBuilt: (lastLeavesBuilt || []).flatMap((r) => leafBlades(r).map((b) => (b.outline ? JSON.parse(JSON.stringify(b.outline)) : null))),
    spineBuilt: (lastLeavesBuilt || []).map((r) => (r.spine ? { ...r.spine, bendTable: r.spine.bendTable ? { binds: r.spine.bendTable.binds, N: r.spine.bendTable.N } : null, peakRadiusMm: Number.isFinite(r.spine.peakRadiusMm) ? r.spine.peakRadiusMm : null } : null)),
    built: (lastLeavesBuilt || []).length,
    emittedRootR: (lastLeavesBuilt || []).map((r) => r.emittedRootR),
    crossesSolidMm: (lastLeavesBuilt || []).map((r) => r.crossesSolidMm),
    emittedReachMm: (lastLeavesBuilt || []).map((r) => r.emittedReachMm),
    /* ST9's measured side — the axis of the rod each leaf's builder actually
       emitted. A petiole is rooted THROUGH the stem's wall, so it stands
       inside the free stem's own cylinder by design; ST9 reads these to tell
       that third part from the petal it exists to doubt. */
    petioleAxes: (lastLeavesBuilt || []).map((r) => r.petioleAxis),
    /* EVERY ROD A LEAF EMITTED (S3) — the petiole of a simple leaf, and a
       compound leaf's petiole, rachis segments and stalks — the exemption ST9
       and the combination gate NAME, never a widened region. */
    rodAxes: (lastLeavesBuilt || []).flatMap((r) => r.rodAxes),
    /* A COMPOUND LEAF'S RODS AND LEAFLET PLACEMENTS AS EMITTED — the compound
       clauses' measured side (null per simple leaf). */
    compoundBuilt: (lastLeavesBuilt || []).map((r) => (r.compound ? {
      axisRod: r.axisRod, stalkRods: r.stalkRods, rachis: r.rachis,
      /* the thicker petiole's measured side (Eva's ruling on #380): how far
         its EMITTED rooted end reaches from the stem's axis, and this leaf's
         own rods as the exemption names them */
      petioleRootReachMm: r.petioleRootReachMm, rodAxes: r.rodAxes,
      leaflets: r.leaflets.map((q) => ({ role: q.role, k: q.k, side: q.side, lengthMm: q.lengthMm, widthMm: q.widthMm, embedMm: q.embedMm,
        root: q.root, base: q.base, D: q.D, T: q.T, N: q.N, holder: q.holder, tris: q.tris, baseAxisMm: q.rim.baseAxisMm ?? null,
        /* the leaflet's own nib record: where its arc rows start (LF16 restates its stations from it, S5) */
        tipClamp: q.tipClamp ? { nib: q.tipClamp.nib, arcU: q.tipClamp.arcU } : null })),
    } : null)),
    /* LF8's measured side — the builder's own DIRECTED-edge census, which both
       STL gates are blind to because theirs keys on a sorted pair. */
    directedMismatch: (lastLeavesBuilt || []).map((r) => r.directedMismatch),
    /* THE BLADE CARRIES NO FOOT — read off the EMITTED outline by the builder
       rather than from the flag that set it, so a leaf quietly keeping the
       petal's foot-continuity floor is visible as geometry (LF6). */
    rootBlendDown: (lastLeavesBuilt || []).every((r) => r.rootBlendDown),
    /* THE SERRATION IS THE LEAF'S OWN (LF7) — the values the BLADE was built
       from, so a leaf reading the petal's `lobe*` controls shows as these
       disagreeing with the leaf's own read-back state. */
    serration: {
      depth: lastLeaf.toothDepth, count: (lastLeavesBuilt || []).reduce((n, r) => Math.max(n, r.serrationBuilt), 0),
      crest: lastLeaf.crestShape, notch: lastLeaf.notchShape,
    },
    /* THE TOOTH COUNT IS THE CUT LAW'S TO CLAMP, and on a short or narrow
       blade it does: an asked 12 comes back as 10 at the shipped leaf size.
       Told on the read-out; LF7 asserts only that a positive depth cuts
       SOMETHING, because the ceiling is the lobe machinery's own and this
       family does not restate it. */
    teethAsked: lastLeaf.toothCount,
    teethBuilt: (lastLeavesBuilt || []).reduce((n, r) => Math.max(n, r.serrationBuilt), 0),
    /* THE POSE AND THE FLOOR (leaf/stem build S2) — LF11-LF13's measured side.
       The plan's arch and cup beside, per emitted leaf, the centre and frame
       normal each row was built on (LF11 restates the arc from the controls),
       each margin's cup lift and the drawn and base half-widths (LF12 reads the
       cup coefficient back), the builder's serration record with the relief
       the OUTLINE carries at every margin sinus (LF13), and the form's own
       cup-clamp record and the arch's radius for the read-out. */
    archDeg: lastLeaf.archDeg, cup: lastLeaf.cup,
    rowCentre: (lastLeavesBuilt || []).flatMap((r) => leafBlades(r).map((b) => b.rowCentre)),
    rowNormal: (lastLeavesBuilt || []).flatMap((r) => leafBlades(r).map((b) => b.rowNormal)),
    rowHalfMm: (lastLeavesBuilt || []).flatMap((r) => leafBlades(r).map((b) => b.rowHalfMm)),
    rowMarginLiftMm: (lastLeavesBuilt || []).flatMap((r) => leafBlades(r).map((b) => b.rowMarginLiftMm)),
    archBuilt: (lastLeavesBuilt || []).flatMap((r) => leafBlades(r).map((b) => ({ ...b.arch, radiusMm: Number.isFinite(b.arch.radiusMm) ? b.arch.radiusMm : null }))),
    /* the LEAF's own arch (a compound leaf's is its RACHIS's), per leaf */
    leafArchBuilt: (lastLeavesBuilt || []).map((r) => ({ ...r.arch, radiusMm: Number.isFinite(r.arch.radiusMm) ? r.arch.radiusMm : null })),
    cupBuilt: (lastLeavesBuilt || []).flatMap((r) => leafBlades(r).map((b) => ({ coefficient: b.cup.coefficient, clamp: b.cup.clamp ? { ...b.cup.clamp, askedRadiusMm: Number.isFinite(b.cup.clamp.askedRadiusMm) ? b.cup.clamp.askedRadiusMm : null, drawnRadiusMm: Number.isFinite(b.cup.clamp.drawnRadiusMm) ? b.cup.clamp.drawnRadiusMm : null } : null }))),
    serrationBuilt: (lastLeavesBuilt || []).flatMap((r) => leafBlades(r).map((b) => b.serration)),
    /* THE LOBED CHEVRON AS BUILT (leaf/stem build S4) — LF19-LF23's measured
       side, per leaf (null on every other leaf): the law as asked, the tilt
       and its cap, the per-row tilt and the lobed and envelope half-widths,
       the EMITTED skin lattice the fold clauses read the planform Jacobian
       off, the rod's run into the blade, and the sinus gaps. */
    lobedBuilt: (lastLeavesBuilt || []).map((r) => (r.lobed ? { ...r.lobed, petioleAxis: r.petioleAxis } : null)),
    rimClamps: (lastLeavesBuilt || []).flatMap((r) => leafBlades(r).map((b) => b.rim.clamps.length)),
  } : null,
  leafTris: lastLeafTris,
  leafAbsent: lastLeafAbsent,
  nodeLive: { ...lastNodeLive },
  /* THE INFLORESCENCE (ID0-ID6). THE PLAN'S own declarations beside the
     BUILDER's own record, the leaf's pairing exactly: ID1 predicts the floret
     count from the plan's azimuth list and compares it against the tally, ID2
     reads the crossing the plan solved against the RACHIS the stem plan
     declares, ID5 reads the residual the builder measured.

     `inflorescence` IS NULL AND NOT ABSENT WHERE THERE IS NONE: ID1
     distinguishes "the builder says there are none" from "the builder says
     nothing", and a missing key is the second. */
  inflorescence: lastInflo ? {
    present: lastInflo.present, type: lastInflo.type, phyllotaxy: lastInflo.phyllotaxy, perNode: lastInflo.perNode,
    nodes: lastInflo.nodes, nodesAsked: lastInflo.nodesAsked, nodesBuilt: lastInflo.nodesBuilt,
    nodesClamped: lastInflo.nodesClamped, built: lastInflo.built,
    nodeDepthsMm: lastInflo.nodeDepthsMm.slice(),
    azimuths: lastInflo.azimuths.map((a) => a.slice()),
    angleDeg: lastInflo.angleDeg, pedicelLenMm: lastInflo.pedicelLenMm,
    pedicelR: lastInflo.pedicelR, areaRuleR: lastInflo.areaRuleR,
    pedicelRFloor: lastInflo.pedicelRFloor, pedicelRClamped: lastInflo.pedicelRClamped,
    rootR: lastInflo.rootR, embedMm: lastInflo.embedMm, crossesSolidMm: lastInflo.crossesSolidMm,
    boreR: lastInflo.boreR, outerR: lastInflo.outerR, rootZ: lastInflo.rootZ,
    rachisLengthMm: lastInflo.rachisLengthMm,
    insetAskedMm: lastInflo.insetAskedMm, insetNeededMm: lastInflo.insetNeededMm,
    insetMm: lastInflo.insetMm, insetClamped: lastInflo.insetClamped,
    insetSatisfied: lastInflo.insetSatisfied,
    /* the reach law's own inputs (build 3) — never the memo, which is a closure */
    floretReachMm: lastInflo.floretReachMm ? { ...lastInflo.floretReachMm } : null,
    reachMm: lastInflo.reachMm, reachRawMm: lastInflo.reachRawMm, reachGridMm: lastInflo.reachGridMm, reachAzimuths: lastInflo.reachAzimuths ? lastInflo.reachAzimuths.slice() : null, headFloorZ: lastInflo.headFloorZ, insetGapMm: lastInflo.insetGapMm,
    floretPetals: lastInflo.floretPetals, scale: lastInflo.scale,
    petalLength: lastInflo.petalLength, petalWidth: lastInflo.petalWidth,
    lengthAsked: lastInflo.lengthAsked, widthAsked: lastInflo.widthAsked,
    sizeClamped: lastInflo.sizeClamped, sizeDeadBelow: lastInflo.sizeDeadBelow,
    /* THE NODE LAWS (the node-laws session): the per-node lengths the plan
       solved, the two laws' own flags, and which nodes are sessile. */
    crossings: lastInflo.crossings.slice(),
    gradient: lastInflo.gradient, gradientAsked: lastInflo.gradientAsked, gradientMax: lastInflo.gradientMax, gradientClamped: lastInflo.gradientClamped,
    corymbAsked: lastInflo.corymbAsked, corymb: lastInflo.corymb,
    corymbInert: lastInflo.corymbInert, graded: lastInflo.graded,
    /* THE INTERNODE FLOOR (build 3, ruling 1): the florets' own, the rods'
       own, which binds, and the pair it binds on. `pairClasses` is the (a,
       b, d) list the floor was taken over — small, and ID10 reads it. */
    pitchFloorMm: lastInflo.pitchFloorMm, pitchFloorRodMm: lastInflo.pitchFloorRodMm, pitchFloretMm: lastInflo.pitchFloretMm,
    pitchFloretRawMm: lastInflo.pitchFloretRawMm, pitchFloorIsFlorets: lastInflo.pitchFloorIsFlorets,
    pitchFloorAt: lastInflo.pitchFloorAt ? JSON.parse(JSON.stringify(lastInflo.pitchFloorAt)) : null,
    sameNodeMayTouch: lastInflo.sameNodeMayTouch, unitExtentMm: lastInflo.unitExtentMm,
    pairClasses: Array.isArray(lastInflo.pairClasses) ? lastInflo.pairClasses.map((c) => ({ ...c })) : null,
    pedicelLensMm: lastInflo.pedicelLensMm.slice(), pedicelLensAskedMm: lastInflo.pedicelLensAskedMm.slice(),
    lengthsClamped: lastInflo.lengthsClamped, lenCeilMm: lastInflo.lenCeilMm,
    sessileNodes: lastInflo.sessileNodes.slice(), stemTipZ: lastInflo.stemTipZ,
    /* THE UMBEL (the umbel session): the type, the head toggle as the plan
       read it, the count and the DECLARED knot — UM1 restates the knot from
       the controls and holds the EMITTED one (below) to it. */
    type: lastInflo.type, umbel: !!lastInflo.umbel, headOff: !!lastInflo.headOff, umbelCount: lastInflo.umbelCount ?? null,
    /* THE COMPOUND UMBEL (the mophead): the level, the floret count a ray as
       asked and as built, and the budget clamp's whole record */
    depth: lastInflo.depth ?? null, level: lastInflo.level ?? null, compound: !!lastInflo.compound,
    floretsPerRay: lastInflo.floretsPerRay ?? null, floretsPerRayAsked: lastInflo.floretsPerRayAsked ?? null,
    budgetClamp: lastInflo.budgetClamp ? { ...lastInflo.budgetClamp } : null,
    knot: lastInflo.knot ? { ...lastInflo.knot, centre: lastInflo.knot.centre.slice() } : null,
  } : null,
  /* WHAT THE BUILDER EMITTED. `unitPositions` is deliberately NOT here — the
     floret unit's whole triangle stream is up to 270k floats and the claim it
     would serve (every placed head IS that stream under its matrix) is
     already a MEASURED zero the builder reports as `placementResidual`, by a
     second expression beside the method under test. A gate that shipped the
     stream across the bridge to redo the multiply itself would be a third
     copy of a three-line map, and it would cost a megabyte a row. */
  inflorescenceBuilt: lastInfloBuilt ? {
    count: lastInfloBuilt.count, unitTris: lastInfloBuilt.unitTris, tris: lastInfloBuilt.tris,
    tipZLocal: lastInfloBuilt.tipZLocal,
    placementResidual: lastInfloBuilt.placementResidual,
    placementCompared: lastInfloBuilt.placementCompared,
    rachisApproachMm: lastInfloBuilt.rachisApproachMm,
    /* THE KNOT AS EMITTED — its centre and radius read back off its own
       vertices by the builder, and its triangle range in the stream (ST9's
       excusal names it by that range). */
    knot: lastInfloBuilt.knot ? { ...lastInfloBuilt.knot, centre: lastInfloBuilt.knot.centre.slice(), triRange: lastInfloBuilt.knot.triRange.slice() } : null,
    floretState: { ...lastInfloBuilt.floretState },
    /* THE COMPOUND UMBEL'S SUB-UMBEL, in its own frame (the mophead) — its
       boss as emitted, its pedicels' emitted ends, its plan's numbers and its
       ONE floret unit's stream with the lattice probe (~80k floats: UM6 reads
       the columns and the bead off it, which no other record can say). */
    sub: lastInfloBuilt.sub ? JSON.parse(JSON.stringify({ ...lastInfloBuilt.sub, floretUnit: lastInfloBuilt.sub.floretUnit ? { ...lastInfloBuilt.sub.floretUnit, positions: Array.from(lastInfloBuilt.sub.floretUnit.positions) } : null })) : null,
    budgetClamp: lastInfloBuilt.budgetClamp ? { ...lastInfloBuilt.budgetClamp } : null,
    unit: {
      petalsBuilt: lastInfloBuilt.unit.petalsBuilt,
      hubRadius: lastInfloBuilt.unit.hub.radius, hubThickness: lastInfloBuilt.unit.hub.thickness,
      stemPresent: !!(lastInfloBuilt.unit.stem && lastInfloBuilt.unit.stem.present),
      stemOuterR: lastInfloBuilt.unit.stem ? lastInfloBuilt.unit.stem.outerR : null,
      stemBoreR: lastInfloBuilt.unit.stem ? lastInfloBuilt.unit.stem.boreR : null,
      stemLengthMm: lastInfloBuilt.unit.stem ? lastInfloBuilt.unit.stem.lengthMm : null,
      stemRootZ: lastInfloBuilt.unit.stem ? lastInfloBuilt.unit.stem.rootZ : null,
      stemTipZ: lastInfloBuilt.unit.stem ? lastInfloBuilt.unit.stem.tipZ : null,
      /* THE PEDICEL'S NODES, AS BUILT (Eva's ruling 6, stem session 2): ID4
         asserts a pedicel carries none. Read off the floret's OWN stem record
         — the artefact — so the pin in `PEDICEL_PINS` is not asked whether it
         pinned. */
      stemNodeCount: lastInfloBuilt.unit.stem && lastInfloBuilt.unit.stem.nodeLaw ? lastInfloBuilt.unit.stem.nodeLaw.nodes.length : 0,
      /* THE PEDICEL'S CUT, AS BUILT (ruling 7): a pedicel's free end is the
         one rooted through the rachis wall, so it is never cut. Read off the
         floret's OWN stem record and its own emitted cut — the artefact. */
      stemCutOn: !!(lastInfloBuilt.unit.stem && lastInfloBuilt.unit.stem.cut && lastInfloBuilt.unit.stem.cut.on),
      stemCutMade: !!(lastInfloBuilt.unit.stem && lastInfloBuilt.unit.stem.cut && lastInfloBuilt.unit.stem.cut.made),
      stemCutEmitted: !!(lastInfloBuilt.unit.stemBuilt && lastInfloBuilt.unit.stemBuilt.emittedCut),
      stemStationCount: lastInfloBuilt.unit.stem && lastInfloBuilt.unit.stem.stations ? lastInfloBuilt.unit.stem.stations.length : null,
      /* THE PEDICEL'S OWN VOID, for O1's declared inward count. A floret is a
         bloom and its pedicel is a stem, so its bore becomes a sealed CAVITY
         under exactly the condition the rachis's does — and O1's baseline is
         a COUNT over the whole file, so five florets each with an inner face
         are five more inward shells the gate must expect. Measured red first
         on `x a SPHERE head`: 6 of 47 against a declared 1. */
      stemVoidMm: lastInfloBuilt.unit.stem ? lastInfloBuilt.unit.stem.voidMm : null,
      stemSolidBandMm: lastInfloBuilt.unit.stem ? lastInfloBuilt.unit.stem.solidBandMm : null,
      stemTipPlugMm: lastInfloBuilt.unit.stem ? lastInfloBuilt.unit.stem.tipPlugMm : null,
      stemSides: lastInfloBuilt.unit.stem ? lastInfloBuilt.unit.stem.sides : null,
      sphereMode: lastInfloBuilt.unit.sphereMode === true,
      maxDimensionMm: lastInfloBuilt.unit.maxDimensionMm,
      minThickness: lastInfloBuilt.unit.minThickness,
      omissionAsked: lastInfloBuilt.unit.omissionAsked,
      omissionBuilt: lastInfloBuilt.unit.omissionBuilt,
      omitted: lastInfloBuilt.unit.omitted ? lastInfloBuilt.unit.omitted.slice() : null,
    },
    /* EVERY DISTINCT FLORET BUILD (the node-laws session) — one per distinct
       pedicel length, in node order, unit 0 the topmost node's and the one
       `unit` above describes. Positions stay out, for `unitPositions`' reason. */
    headSpreadMm: lastInfloBuilt.headSpreadMm,
    floretsMaxZ: lastInfloBuilt.floretsMaxZ,
    floretsMaxZByNode: lastInfloBuilt.floretsMaxZByNode ? lastInfloBuilt.floretsMaxZByNode.slice() : null,
    units: lastInfloBuilt.units.map((U) => ({
      lengthMm: U.lengthMm, az: U.az, nodeOverrides: U.nodeOverrides ? { ...U.nodeOverrides } : null,
      tris: U.tris, tipZLocal: U.tipZLocal, stalked: U.stalked,
      petalsBuilt: U.petalsBuilt, hubRadius: U.hubRadius, hubThickness: U.hubThickness,
      stemPresent: !!(U.stem && U.stem.present),
      stemOuterR: U.stem && U.stem.present ? U.stem.outerR : null,
      stemVoidMm: U.stem && U.stem.present ? U.stem.voidMm : null,
      stemSolidBandMm: U.stem && U.stem.present ? U.stem.solidBandMm : null,
      stemTipPlugMm: U.stem && U.stem.present ? U.stem.tipPlugMm : null,
      sphereMode: U.sphereMode, maxDimensionMm: U.maxDimensionMm, minThickness: U.minThickness,
      omissionAsked: U.omissionAsked, omissionBuilt: U.omissionBuilt,
      omitted: U.omitted ? U.omitted.slice() : null,
      floretState: { ...U.floretState },
    })),
    placed: lastInfloBuilt.placed.map((q) => ({
      unit: q.unit, lengthMm: q.lengthMm, sessile: q.sessile, wallReachR: q.wallReachR,
      nodeIndex: q.nodeIndex, az: q.az, M: q.M.slice(), D: q.D.slice(), root: q.root.slice(),
      /* `at` IS THE BLOCK'S OFFSET IN THE EXPORTED STREAM and ST9 needs it:
         the STL is written from these very positions in order, so `at` and
         `tris` name this floret's own floats in the FILE. */
      at: q.at, tris: q.tris, headAt: q.headAt.slice(),
      /* ST9's excusal reads this, the PETIOLE's own shape — the builder's
         emitted rod ends through this placement's own matrix. */
      pedicelAxis: q.pedicelAxis
        ? { inner: q.pedicelAxis.inner.slice(), outer: q.pedicelAxis.outer.slice(), radiusMm: q.pedicelAxis.radiusMm }
        : null,
    })),
  } : null,
  inflorescenceTris: lastInfloTris,
  /* THE GEOMETRY'S OWN ANSWER TO "IS AN INFLORESCENCE ABSENT HERE", read from
     the module that is actually running — ST0's own reason: a gate calling the
     geometry's predicate in Node compares one unmutated module against another
     and can never disagree (session 41's L7). ID0 compares it against the
     REGISTRY's declaration. */
  inflorescenceAbsent: lastInfloAbsent,
  /* THE GEOMETRY'S OWN HEAD STATEMENT, from the running module (UM0's half). */
  umbelHeadAbsent: lastUmbelHeadAbsent,
  /* THE COMPOUND UMBEL'S TWO STATEMENTS AND THE DEPTH REFUSAL, from the
     running module (UM5): the geometry's values and its answer to a depth of
     three, which the registry's two options must match */
  umbelCompound: lastUmbelCompound,
  umbelDepthValues: UMBEL_DEPTH_VALUES.slice(),
  umbelDepth3Refusal: umbelDepthRefusal({ umbelDepth: '3' }),
  umbelDepth2AtLevel2Refusal: umbelDepthRefusal({ umbelDepth: '2', umbelLevel: 2 }),
  headPetalLattices: lastHeadLattices,
  nodeVarianceAbsent: lastNodeVarianceAbsent,
  /* ORGANIC VARIANCE (build 1, size): the builder's own field record — null
     at amount 0, which VS0 reads as the guard's own answer — with one factor
     row per whorl parallel to `slotAzimuths`, so VS1 can restate the law from
     the controls and the emitted azimuths and compare it against what the
     whorl primitive actually multiplied in. And the TOLD FLAG's record, the
     neighbour figures the NEIGHBOURS line prints, so a gate can hold the line
     to the number rather than to the sentence. */
  /* THE TUBE (corolla fusion) — the builder's own plan and per-ring report:
     the asked and BUILT k per whorl, the ring's rows, the flare, the notch and
     the ring's triangle range. The TU family reads it. */
  tube: lastTube ? JSON.parse(JSON.stringify(lastTube)) : null,
  variance: lastVariance ? { ...lastVariance, factors: lastVariance.factors.map((row) => [...row]) } : null,
  varianceAbsent: lastVarianceAbsent,
  /* EVERY PETAL THE BUILDER EMITTED, in slot order: the slot's scale and the
     factor the primitive handed it, the descriptor's own scale, the blade's
     built length and the nominal it was scaled from. VS2 reads the two
     products off this, exactly, and VS1 matches each factor to its whorl's
     row of `variance.factors`. */
  petalSlotSizes: lastPetalsAll.map((p) => ({ index: p.slotIndex, whorl: lastFoot.continuousMode ? 0 : Math.round(p.whorl), azimuth: p.azimuth,
    scale: p.slot.scale, sizeFactor: p.slot.sizeFactor ?? null, ringScale: p.ringScale, length: p.length, askedLength: p.askedLength, nominalLength: p.nominalLength })),
  neighbour: lastNeighbour ? structuredClone(lastNeighbour) : null,
  /* BUILD 2 — THE FORM FIELD: its record, the geometry's own guard answer
     through the page (FV0's half), and every EMITTED petal's slot term, the
     composed values it was built with and which of them the clamp bit — FV1
     restates the term from the controls and the emitted azimuth, FV2 the
     composition. */
  formVariance: lastFormVariance ? { ...lastFormVariance, halves: { ...lastFormVariance.halves } } : null,
  varianceFormAbsent: lastFormAbsent,
  /* BUILD 3 — THE SPACING FIELD: its record and the geometry's own guard
     answer through the page (SV0's half). The emitted azimuths are already
     `slotAzimuths`; SV1 restates the law from the controls against them. */
  spacingVariance: lastSpacingVariance ? { ...lastSpacingVariance } : null,
  varianceSpacingAbsent: lastSpacingAbsent,
  petalSlotForms: lastPetalsAll.map((p) => ({ index: p.slotIndex, whorl: lastFoot.continuousMode ? 0 : Math.round(p.whorl), azimuth: p.azimuth,
    formTerm: p.formTerm ? { ...p.formTerm } : null, applied: { ...p.applied },
    tipShape: p.tipCap ? p.tipCap.shapeN : null,   // the exponent the apex law was handed (the builder's own record — the scope view's exactness clause reads it)
    formClamped: p.formClamped ? p.formClamped.map((c) => ({ ...c })) : null,
    formScaled: p.formScaled ? p.formScaled.map((c) => ({ ...c })) : null,
    /* the SCOPE TERM this petal was built with (Scoping-b) — the builder's own
       record of which offsets reached it, keyed on its scope; the panel gate
       reads an edit's landing off THIS, never off the record the page wrote */
    scope: p.scopeTerm ? { key: { ...p.scopeTerm.key }, offsets: { ...p.scopeTerm.offsets } } : null })),
  /* THE VORONOI INFILL (I0-I7, and route (z)'s own subject): the BUILDER's own
     plan record — the density asked, the count ACHIEVED, the refusal word if
     there is one — so a gate holds the read-out's two tellings to the number
     rather than to each other. Null where no blade carries a plan, which is
     every state with the guard off; `infillAbsent` is the GEOMETRY's own
     predicate through the page, ID0's and ST0's route again, because a gate
     calling it in Node compares one unmutated module against another. */
  infill: lastInfill ? { density: lastInfill.density, wall: lastInfill.wall, bar: lastInfill.bar, cells: lastInfill.cells,
    achieved: lastInfill.achieved, solid: lastInfill.solid, passesUsed: lastInfill.passesUsed,
    passCap: lastInfill.passCap, refused: lastInfill.refused || null, built: !!lastInfill.built,
    planFlat: !!lastInfill.planFlat, floorU: lastInfill.floorU, mSplit: lastInfill.mSplit,
    /* S4: the four levers as the plan read them, the basal travel, where the
       holes sit along the blade, and the density's measured dead travel. */
    passes: lastInfill.passes, gamma: lastInfill.gamma, aniso: lastInfill.aniso, baseFrac: lastInfill.baseFrac,
    /* The roundness as the plan read it, and the achieved shape its control tells. */
    round: lastInfill.round, roundShape: lastInfill.roundShape ? { ...lastInfill.roundShape } : null,
    baseFloorU: lastInfill.baseFloorU, baseTravel: lastInfill.baseTravel,
    cellU: [...(lastInfill.cellU || [])], holeU: [...(lastInfill.holeU || [])],
    densitySweep: lastInfill.densitySweep ? lastInfill.densitySweep.map((x) => ({ ...x })) : null,
    densityCap: lastInfill.densityCap ?? null, densityBest: lastInfill.densityBest ?? null,
    /* THE CELL POLYGONS ARE DELIBERATELY NOT HERE. I1-I7 read them off the
       BUILDER in Node, where they are the artefact; projecting them through
       the page would copy a few thousand points on every metrics call for a
       question no panel route asks. What a route needs is the NUMBERS the
       read-out speaks — and `widthsMm`, which is one scalar a cell. */
    widthsMm: [...lastInfill.widthsMm] } : null,
  infillAbsent: lastInfillAbsent,
  /* THE SURFACE TEXTURE (T3): the builder's own record (every organ's lattice
     count against its floor, the relief's extremes, the refusals) and the
     GEOMETRY's own guard answer through the page — TX0's two statements. */
  texture: lastTexture ? JSON.parse(JSON.stringify(lastTexture)) : null,
  textureAbsent: lastTextureAbsent,
  /* THE GEOMETRY'S OWN ANSWER TO "MAY THIS STATE HAVE A STEM", read from the
     module that is actually running. ST0 compares it against the REGISTRY's
     declaration, and it has to arrive through the page: a gate calling the
     geometry's predicate in Node compares one unmutated module against another
     and can never disagree — session 41's L7, measured again here, where
     `stem-eligible-disagrees-with-the-registry` fired nothing until this key
     existed. */
  stemAbsent: lastStemAbsent,
  /* THE NODES' TWO STATEMENTS (ST12) — the geometry's answer from the running
     module, never a Node import, for ST0's own reason. */
  stemNodesAbsent: lastStemNodesAbsent,
  /* THE GEOMETRY'S OWN ANSWER TO "IS THE CUT ABSENT HERE" — SC0's half, as
     the RUNNING module gave it (the ST0 / stemNodesAbsent shape). */
  stemCutAbsent: lastStemCutAbsent,
  /* THE SEPALS (SP0-SP9). The RING's own declarations (footRing's descriptor)
     beside the BUILDER's own emitted records: the count it built, each sepal's
     azimuth as the whorl primitive placed it, its foot frames and length as
     emitted, the effective state each blade was BUILT FROM, and the angle
     limit as the scan drew it. Null when absent; `sepalsAbsent` is the
     geometry's own predicate through the page, SP0's other statement. */
  sepal: lastSepals ? {
    asked: lastSepals.asked, count: lastSepals.count, ceiling: lastSepals.ceiling, ceilingOf: lastSepals.ceilingOf, countClamped: lastSepals.countClamped,
    scale: lastSepals.scale, breadth: lastSepals.breadth, phaseFrac: lastSepals.phaseFrac, pitchRad: lastSepals.pitchRad, phaseRad: lastSepals.phaseRad, phaseDeg: lastSepals.phaseDeg, pitchDeg: lastSepals.pitchDeg,
    startAzimuth: lastSepals.startAzimuth, azimuths: lastSepals.azimuths.slice(), placement: lastSepals.placement, mirrorSymmetric: lastSepals.mirrorSymmetric,
    footAskedMm: lastSepals.footAskedMm, footMm: lastSepals.footMm, footClamped: lastSepals.footClamped, footFloorMm: lastSepals.footFloorMm, footCeilingMm: lastSepals.footCeilingMm,
    footScale: lastSepals.footScale, own: lastSepals.own ? { ...lastSepals.own } : null,   // the own-size session: the width's owner at the foot, and the sepal's own mm (SP0b, SP3, SP5)
    ring: { radius: lastSepals.ring.radius, width: lastSepals.ring.width, thickness: lastSepals.ring.thickness, overhang: lastSepals.ring.overhang, z: lastSepals.ring.z, slope: lastSepals.ring.slope, domeLean: lastSepals.ring.domeLean, onDome: lastSepals.ring.dome !== null },
    /* THE ATTACHMENT (SP3): the whorl's height and the descriptor's own solve —
       mode, the extent's two ends, the point the foot landed on, the arc
       reading beside it, and the surface figures where the foot meets. */
    height: lastSepals.height,
    attachment: JSON.parse(JSON.stringify(lastSepals.attachment)),
    built: lastSepalsBuilt ? lastSepalsBuilt.built.length : 0,
    builtAzimuths: lastSepalsBuilt ? lastSepalsBuilt.azimuths.slice() : [],
    tris: lastSepalTris,
    /* THE TIERS (F1.1a, SP10–SP13): the builder's own per-tier records — the
       station each tier was placed at (the height law, the ceiling the tier
       above sets, the ordering clamp, NO ROOM), the angle limit drawn against
       the petals and the tiers above, the state each blade was built from
       (`effective`, the tier's own sepal values), and the blades as emitted. */
    tiersAsked: lastSepalsBuilt ? lastSepalsBuilt.tiersAsked : 1,
    tiersBuilt: lastSepalsBuilt ? lastSepalsBuilt.tiersBuilt : 0,
    tiersEligible: lastSepalsBuilt ? lastSepalsBuilt.tiersEligible : false,
    tiers: lastSepalsBuilt && lastSepalsBuilt.tiers ? lastSepalsBuilt.tiers.map((T) => ({
      tier: T.tier, present: T.present, why: T.why || null, order: T.order ? JSON.parse(JSON.stringify(T.order)) : null,
      term: T.term ? { offsets: { ...T.term.offsets }, effective: { ...T.term.effective }, clamped: T.term.clamped.slice() } : null,
      effective: T.effective ? { ...T.effective } : null,
      count: T.count, tris: T.tris, azimuths: T.azimuths.slice(),
      attachment: T.attachment ? JSON.parse(JSON.stringify(T.attachment)) : null,
      height: T.present && lastFoot.sepalTiers ? lastFoot.sepalTiers[T.tier].height : null,
      ring: T.ring ? { radius: T.ring.radius, width: T.ring.width, thickness: T.ring.thickness, overhang: T.ring.overhang, z: T.ring.z, domeLean: T.ring.domeLean, onDome: T.ring.dome !== null } : null,
      descriptor: T.present && lastFoot.sepalTiers ? (({ asked, count, ceiling, countClamped, scale, breadth, phaseFrac, phaseRad, pitchRad, startAzimuth, azimuths, footMm, footAskedMm, footClamped, footScale, own }) => ({ asked, count, ceiling, countClamped, scale, breadth, phaseFrac, phaseRad, pitchRad, startAzimuth, azimuths: azimuths.slice(), footMm, footAskedMm, footClamped, footScale, own: own ? { ...own } : null }))(lastFoot.sepalTiers[T.tier]) : null,
      limit: T.limit ? JSON.parse(JSON.stringify(T.limit)) : null,
      /* curves-sepals: each blade's own SPINE record (the curl mode and curve
         it was built from, its emitted rows, its fold limit) and its OUTLINE
         (the base half-widths at the emitted stations) — SP14's measured side,
         from the running module */
      petals: T.built.map((p) => ({ length: p.length, askedLength: p.askedLength, azimuth: p.azimuth, slotIndex: p.slotIndex, tris: p.tris, footFrames: p.footFrames, rootRow: p.rootRow, tipCap: p.tipCap, form: p.form, builtFrom: p.builtFrom, spine: p.spine, profileBase: p.profileBase, profileBaseL: p.profileBaseL, profileBaseR: p.profileBaseR, profileU: p.profileU })),
    })) : [],
    limit: lastSepalsBuilt ? JSON.parse(JSON.stringify(lastSepalsBuilt.limit)) : null,
    footTangentDeg: lastSepalsBuilt ? lastSepalsBuilt.footTangentDeg : undefined,
    undersideSlopeDeg: lastSepalsBuilt ? lastSepalsBuilt.undersideSlopeDeg : undefined,
    shoulderDeg: lastSepalsBuilt ? lastSepalsBuilt.shoulderDeg : undefined,
    undersideChordDeg: lastSepalsBuilt ? lastSepalsBuilt.undersideChordDeg : undefined,
    blendReachesRim: lastSepalsBuilt ? lastSepalsBuilt.blendReachesRim : undefined,
    footBuriedMm: lastSepalsBuilt ? lastSepalsBuilt.footBuriedMm : undefined,
    petals: lastSepalsBuilt ? lastSepalsBuilt.built.map((p) => ({
      length: p.length, askedLength: p.askedLength, azimuth: p.azimuth, slotIndex: p.slotIndex, tris: p.tris,
      footFrames: p.footFrames, rootRow: p.rootRow, tip: p.tip, applied: p.applied,
      profile: p.profile, profileU: p.profileU, tipCap: p.tipCap, form: p.form, seamStep: p.seamStep,
      /* THE STATE THE BLADE WAS BUILT FROM, keyed by the PETAL name the law
         reads (SP6 compares it against the page's own sepal* read-back, an
         owner the builder does not write) */
      builtFrom: p.builtFrom,
      /* curves-sepals: the blade's own spine and outline records (SP14) */
      spine: p.spine, profileBase: p.profileBase, profileBaseL: p.profileBaseL, profileBaseR: p.profileBaseR,
      /* a layer or petal SCOPE never reaches a sepal (SP6) — its tier is its own */
      scopeTerm: p.scopeTerm ?? null,
    })) : [],
  } : null,
  sepalTris: lastSepalTris,
  sepalsAbsent: lastSepalsAbsent,
  /* THE TIERS' TWO STATEMENTS (SP10): the geometry's own `sepalTiersEligible`
     through the page, against the registry's `sepalTiersLive`. */
  sepalTiersEligible: lastSepalTiersEligible,
  sepalsAskedUnderSphere: lastSepalsAskedUnderSphere,
  /* THE SPHERE'S STEM CHANNEL — ST7's and ST8's measured side, and the
     read-out's. The per-mode approach arrays ride too, because "the two modes
     omit the same set" is a claim about both of them and a gate sees one build
     at a time; the builder computes both to form the union, so reporting them
     costs nothing and makes the union checkable rather than believed. */
  stemOmission: lastStemOmission ? {
    clearanceMm: lastStemOmission.clearanceMm,
    asked: lastStemOmission.asked, built: lastStemOmission.built,
    omitted: lastStemOmission.omitted.slice(),
    byMode: { live: lastStemOmission.byMode.live.slice(), export: lastStemOmission.byMode.export.slice() },
    approach: { live: lastStemOmission.approach.live.slice(), export: lastStemOmission.approach.export.slice() },
    nearestKeptMm: { ...lastStemOmission.nearestKeptMm },
    /* THE MERIDIAN PACKING MARGIN — the base's own number, beside the blades'.
       ST7 reads it here and rebuilds the expectation from `footRing()`'s and
       `stemPlan`'s own fields rather than from this record. */
    meridian: lastStemOmission.meridian ? { ...lastStemOmission.meridian } : null,
  } : null,
  hubJoinActive: !!lastHubBuilt.joinActive,
  hubJoinThickness: lastHubBuilt.joinThickness,
  hubJoinBlendRadius: lastHubBuilt.joinBlendRadius,
  hubJoinUndersideMagnitude: lastHubBuilt.undersideMagnitude,
  hubUnderside: (lastHubBuilt.underside || []).map((p) => p.slice()),
  hubTopFaceZ: lastHubBuilt.topFaceZ,
  footFramesDigest: lastFootDigest,
  /* ONE FOOT-FRAME DIGEST PER SLOT, null where no petal was built — ST8's
     measured side. The scalar above cannot answer "did slot 4 move" on a build
     where slot 3 is missing, which is exactly the question the stem channel
     makes askable. */
  footFramesBySlot: lastFootBySlot.slice(),
  /* THE DOME (Sep 4) — footRing()'s own cap, null under the guard: the rise
     asked and built, the cap's radius and centre, the apex floor's clamp, and
     the surface-to-plan ratio over the feet's annulus. J1 places every foot
     against this sphere; the read-out names it. */
  hubDome: lastHub.dome ? { ...lastHub.dome } : null,
  /* WHAT THE HUB BUILDER ACTUALLY BUILT — reported by buildHubInto from the
     sphere it used, never copied from footRing(). J3 compares the feet
     against THIS: a hub that ignored the owner and stayed flat under lifted
     feet (the wrong-hub mutation under a dome, measured Sep 4: watertight,
     one voxel piece on every row tried, J1 indiscriminate) is caught only by
     the feet not lying on the sphere the hub says it built. */
  hubBuilt: { dome: lastHubBuilt.dome ? { ...lastHubBuilt.dome } : null, tris: lastHubBuilt.tris },
  /* THE DOME GUARD'S RESIDUAL — exactly 0 on every flat build, null on a
     domed one; both gates assert it. */
  petalDomeGuardResidual: lastPetal ? lastPetal.domeGuardResidual : null,
  /* THE SPINE per descriptor's representative petal (session 16) — every
     blade row's centre AS EMITTED, plus the law's inputs and what the floor
     did. The gate's C1 rebuilds the law from OTHER owners and compares
     against `rows`; a spine that kept the arc while the controls were wired
     is bit-identical to the un-biased bloom and this is its only witness. */
  petalSpine: lastPetal ? lastPetal.spine : null,
  petalRingSpine: lastPetals.map((p) => (p ? p.spine : null)),
  /* THE ROOT ROW per descriptor's representative petal — the first BLADE row
     as emitted, J8's input against the rigid tilt of the foot's own frame. */
  petalRingRootRows: lastPetals.map((p) => (p ? { C: p.rootRow.C, N: p.rootRow.N, flat: p.rootRow.flat, tiltRad: p.rootRow.tiltRad, u: p.rootRow.u, curlRad: p.rootRow.curlRad, ringC: p.rootRow.ringC, azimuth: p.azimuth,
    /* THE EFFECTIVE petalTilt this petal was actually built from (Sep 4,
       J9's own input) — read from `p.applied`, never the base UI control:
       petalTilt can carry a scope offset (per layer or per petal), so a check
       reconstructing "expected tilt" from the raw slider would false-fire on
       any scoped row. */
    petalTiltApplied: p.applied.petalTilt } : null)),
  /* RENAMED FROM `ringLayers` WITH THE CONTINUOUS ARM, because under it a
     descriptor is not a layer — it is a ring carrying exactly one petal, and
     there are up to 120 of them. A key naming a thing that is not the thing
     is what a later reader checks and believes. Nothing persists this (it is
     a diagnostic hook, not a design), so the rename is free and no
     retirement is owed; the gates and shot tools moved with it in the same
     commit. */
  rings: lastRings.map((r) => ({
    index: r.index, radius: r.radius, derivedRadius: r.derivedRadius,
    width: r.width, thickness: r.thickness,
    overhang: r.overhang, scale: r.scale, phase: r.phase, tiltExtra: r.tiltExtra,
    /* DOME LEAN (Sep 4) — footRing()'s own per-ring cap correction, a
       SEPARATE addend from tiltExtra above, never folded into it (see
       footRing()'s own note on this field: folding it in broke tiltExtra's
       own monotonicity and quantizer-identity claims under CONTINUOUS).
       buildPetalInto sums petalTilt + tiltExtra + domeLean at the one place
       the angle is used; this is that third term, reported on the same
       doctrine as every other telemetry field here (widthClamped,
       underFootFloor, …): the owner's own answer, never a second
       derivation. */
    domeLean: r.domeLean,
    authoredWidth: r.authoredWidth, widthClamped: r.widthClamped,
    /* A LAYER'S OWN WIDTH (Oct 16) — the value its foot and ring were built
       from where it owns one (null where the ramp placed them) and the ring's
       factor on R0 (past 1 the hub grows to it — `hubGrowth` below):
       footRing()'s own record, read by panel route (ag). */
    ownWidth: r.ownWidth ?? null, ringFactor: r.ringFactor ?? null,
    /* THE CEILING TWIN of widthClamped (Eva, Sep 1). The foot's UPPER clamp
       has always been able to bind - from petalWidth 25, a quarter of that
       slider - with the blade widening and the area-ruled ring standing
       still, and nothing reported it. [Oct 21: the ceiling is the ring's own
       room now — the foot cap's record rides beside it.] */
    widthClampedHigh: r.widthClampedHigh,
    widthAskedMm: r.widthAskedMm, footArcMm: r.footArcMm, footCapMm: r.footCapMm, footCapRadiusMm: r.footCapRadiusMm, footSpanRad: r.footSpanRad, footCapped: r.footCapped, footArcUnderFloor: r.footArcUnderFloor,
    /* THE DEPTH TELEMETRY (Sep 3) — footRing()'s own two flags behind the
       read-out's RINGS NARROWER THAN A FOOT line, exposed so the panel gate
       asserts that line against the owner in both directions. */
    underFootFloor: r.underFootFloor,
    crossesAxis: r.crossesAxis,
    /* WHERE ON THE DOME THIS RING LANDS (Sep 4) — height, slope, arc from the
       apex and the local relief factor, footRing()'s own. 0 / 0 / radius / 1
       when flat. */
    z: r.z, slope: r.slope, arc: r.arc, relief: r.relief,
    /* THE LAYER and HOW MANY FEET THIS DESCRIPTOR CARRIES — footRing()'s own
       answers. A descriptor is one whorl (ringed) or one petal (continuous);
       the role split is retired with the role machinery (Q3.4), so `footCount`
       is the whole of the area rule's grouping and Z1 reads it. */
    lambda: r.lambda, footCount: r.footCount,
  })),
  /* Every ring's foot rows as EMITTED — J1's input. The pre-layer hook
     exposed slot 0 of the one whorl; reporting only that would have silently
     meant "layer 0" and left every inner whorl's feet unasserted. Under
     CONTINUOUS a ring IS one petal, so this becomes every foot in the bloom
     — 3 x petalCount x layerCount frames instead of 3 x layerCount — and J1
     gets that coverage from the same expression. */
  petalRingFootFrames: lastPetals.map((p) => (p ? p.footFrames : null)),
  /* THE LADDER PER RING, because the seam clearance is a function of the
     ring's OWN effective tilt: on a layered bloom the outer whorl usually
     does not bind while the inner ones do, so A7 reading layer 0 alone
     would never see the case the floor exists for. */
  petalRingBladeLadder: lastPetals.map((p) => (p ? p.bladeLadder : null)),
  /* THE TIP CAP PER RING, for the same reason the ladder is per ring: the
     apex nib truncates the blade, so on a layered bloom every inner whorl has
     its own drawn length, and C1's law rebuild is per ring. `petalTipCap`
     below is the LAST petal's and stays — A2, A4, A5 and A6 read it — but a
     clause that is about a RING may not read it. */
  petalRingTipCap: lastPetals.map((p) => (p ? p.tipCap : null)),
  /* THE ROOT TAPER PER RING (big petals, Oct 21) — the builder's declaration
     (null at or under the reference), which T0 restates from the controls and
     pins both ways; the thickness itself is read off the exported file. */
  petalRingRootTaper: lastPetals.map((p) => (p && p.thickness ? p.thickness.rootTaper : null)),
  petalRingProfileU: lastPetals.map((p) => (p ? p.profileU : null)),
  /* EVERY RING'S BASE OUTLINE (F6-sym): OC1 restates the outline curve on
     every ring's own emitted rows, not the last petal's alone. */
  petalRingProfileBase: lastPetals.map((p) => (p ? p.profileBase : null)),
  /* F6-asym: each ring's TWO halves' emitted half-widths (and base), null on a
     one-sided ring — the asymmetric clauses restate each half against these */
  petalRingProfileSides: lastPetals.map((p) => (p && p.profileL ? { left: p.profileL, right: p.profileR, baseLeft: p.profileBaseL, baseRight: p.profileBaseR } : null)),
  /* F6-asym: the emitted margins per row of each ring's representative petal (OC4) */
  petalRingMarginSides: lastPetals.map((p) => (p && p.marginSides ? p.marginSides : null)),
  /* THE PLACEMENT'S OWN SHAPE, from footRing() rather than from the control:
     `continuousMode` is what every assertion branches on, `sequenceLength` is
     what the legibility flag counts, and each descriptor's own `footCount`
     sums to the bloom's petal count in both modes. A gate deriving any of these from
     `placement` would be a second copy of the branch. */
  continuousMode: lastFoot.continuousMode,
  sequenceLength: lastFoot.sequenceLength,
  /* ===================================================================
     THE ARRANGEMENT'S POSITION AROUND THE AXIS — J7's and Z4b's only input,
     and the reason this session had to ship an instrument at all.

     MEASURED, NOT ASSUMED: before these four keys existed, `azimuth` appeared
     in this repository only inside buildWhorlInto (where it is computed) and
     buildPetalInto (where it is consumed). Nothing recorded one, so nothing
     could assert one. Both STL gates are azimuth-blind BY CONSTRUCTION — an
     edge census over a topology no control moves, and a flood fill over a hub
     disc that spans every ring at every azimuth — and so is everything built
     on them: J1 reads foot FRAMES, J2/J3 read RADII, J4 reads the overlap
     box's three dimensions, J5/J6 read the depth sequence, and Z1-Z6 read
     role membership and the effective state. A FAN that silently fell through
     to the RADIAL arm would therefore export watertight, export as ONE piece,
     carry the identical triangle count and the identical STL byte length, and
     pass every assertion this project owns. J7 exists because of that grep.

     `slotAzimuths` IS THE BUILDER'S OWN RECORD, one row per whorl indexed by
     slot, taken from the slot payload the whorl primitive emitted — never
     re-derived from `placement` and the controls, because an instrument that
     recomputed the law would agree with a mutated law by mutating alongside
     it. `fan` is footRing()'s derived law (null elsewhere, so a claim nothing
     can make reads as absent rather than as a passing zero); `mirror` is
     which involution this arrangement has. */
  slotAzimuths: lastSlotAzimuths.map((row) => [...row]),
  placement: lastPlacement,
  fan: lastFoot.fan ? { ...lastFoot.fan } : null,
  mirror: lastFoot.mirror,
  slotCount: lastFoot.slotCount,
  /* THE FULL SPHERE (session 18) — footRing()'s own answer, cross-checked
     against the registry's `sphereMode` predicate by both gates on every
     row, exactly as the two eligibility flags beside it are. */
  sphereMode: lastFoot.sphereMode === true,
  /* the scope toggles' own answers on the build on screen (Scoping-b; Z5) */
  scopeLayersLive: lastFoot.scopeLayersLive,
  scopePetalsLive: lastFoot.scopePetalsLive,
  petalGroupCount: lastFoot.petalGroupCount,
  /* THE QUANTIZER IDENTITY'S RESIDUALS — the continuous arm's answer to
     `ringGuardResidual`, and an EQUALITY rather than a bound (footRing's
     header says why). null under the ringed arm: there is no second law
     there to agree with, and a claim nothing can make is reported absent. */
  quantizerResiduals: lastFoot.quantizerResiduals,
  /* The guard's cross-validation residual (footRing's header): the layered
     area-rule law measured against the pre-layer expression on every
     single-layer build. null above one layer, where there is no guard law to
     compare against — a claim nothing can make is reported absent, never as a
     passing 0. */
  ringGuardResidual: lastFoot.guardResidual,
  petalsBuilt: lastPetalsBuilt,
  /* THE UMBEL'S HEAD TOGGLE: true exactly when the builder reported the
     ABSENT hub record (`HUB_ABSENT`) — no head was built at all. */
  headAbsent: !!(lastHubBuilt && lastHubBuilt.absent),
  /* WHAT EACH RING'S PETAL WAS ACTUALLY BUILT WITH, read from the builder's
     own effective state and never from the resolver, with the scope term it
     was handed. This is the only thing in the codebase that can see a scope
     offset that never reached the blade - a failure invisible to both STL
     gates, to the triangle count and to J1-J6 alike. Z2. */
  petalRingApplied: lastPetals.map((p) => (p ? { slotIndex: p.slotIndex, whorl: p.whorl, applied: p.applied, formTerm: p.formTerm ?? null, scope: p.scopeTerm ? { key: { ...p.scopeTerm.key }, offsets: { ...p.scopeTerm.offsets }, owns: p.scopeTerm.owns ? { ...p.scopeTerm.owns } : null } : null } : null)),
  layerCount: lastFoot.layerCount,
  /* THICKNESS TELEMETRY and its guard residual — the properties both STL
     gates are structurally blind to, for the same reason they are blind to
     the form layer: thickness is pure vertex offset on a fixed-topology
     grid, so no edge census moves, and a thinner sheet is still spanned by
     the hub, so no flood fill splits. */
  petalThickness: lastPetal ? lastPetal.thickness : null,
  petalThicknessGuardResidual: lastPetal ? lastPetal.thicknessGuardResidual : null,
  /* THE ANDROECIUM (session 21) — footRing()'s descriptor (null when absent
     or under SPHERE), every stamen the builder EMITTED (root axis, surface
     point, the two root rings, the apex — JS1-JS4's inputs, read from the
     emission and never from the descriptor alone), the builder's free-end
     tally and the two distance flags. The descriptor's `dome` is the same
     object as `hubDome` and is dropped here to keep the hook one owner. */
  androecium: lastAndroecium ? { ...lastAndroecium, dome: undefined, stamens: lastAndroecium.stamens.map((s) => ({ ...s })) } : null,
  stamens: lastStamens.map((s) => ({ ...s })),
  freeEnds: lastFreeEnds,
  stamenNearest: lastStamenNearest,
  /* THE GYNOECIUM (session 22) — the third descriptor (null when absent or
     under SPHERE) and the style the builder EMITTED (root axis, root rings,
     tip, the three lobes' axes and apexes — JG1-JG4's inputs). `dome`
     dropped for the same reason as the androecium's. */
  gynoecium: lastGynoecium ? { ...lastGynoecium, dome: undefined } : null,
  styles: lastStyles.map((s) => ({ ...s, lobes: s.lobes.map((l) => ({ ...l })) })),
  /* THE FILAMENT-AGAINST-STYLE RECORD (session 23) — the builder's own
     nearest approach, threshold and flag; null unless both parts are built.
     The panel gate reads the STAMENS line's clause against it. */
  filamentStyle: lastFilamentStyle ? { ...lastFilamentStyle } : null,
});
window.__bloomFrame = (radius, lift = 0.15, at = null, dir = null, up = null) => { userMoved = true; fitCamera(radius, lift, at, dir, up); };

/* THE ONLY WRITER of `capability`. Rebuilds synchronously rather than
   through the rAF coalescer so a caller can read __bloomMetrics back on the
   next line and get the design it just asked for. Pass null to clear. */
window.__bloomCapability = (spec) => { capability = spec || null; regenerate(); return capability; };
/* THE ONLY OTHER WRITER of `scopes` besides a loaded design file (Scoping-a).
   Hands the page an `overrides`-shaped record — the file's own shape, run
   through the file's own reader so a hand-built record is validated exactly
   as a loaded one is — and rebuilds. No control reaches this. */
window.__bloomScopes = (overrides) => {
  selectScope(null);   // Scoping-b: a replaced record ends the pick first (it writes nothing)
  if (!overrides) { scopes = null; regenerate(); return null; }
  const r = readDoc({ ...composeDoc(readUI()), overrides });
  if (!r.ok) throw new Error(r.error);
  scopes = scopesAreEmpty(r.doc.overrides) ? null : r.doc.overrides;
  lastScopesNotes = r.notes.filter((n) => /^overrides\./.test(n.text));
  regenerate();
  return scopes;
};
let lastScopesNotes = [];

/* THE CURVE EDITOR'S TEST MOUNT (the curve-editor session). No live registry
   control is a curve yet, so this is the ONLY way the widget reaches a page:
   it mounts ONE editor, built by the same `makeCurveInput` a registry row
   would get, on a value and a validator the caller supplies (a validator is a
   real function — page.evaluate defines it IN the page), in its own block
   OUTSIDE #panelControls so the panel gate's census of registry controls is
   untouched. Not a control, never saved by the page's own Save, invisible to
   readUI() and every whole-state read-back. `saveText` / `loadText` walk the
   design file's SHIPPED writer and reader (bloom-file.js `composeControls` /
   `readControls`) over a one-row field table for this descriptor, so the
   curve's field-kind row is exercised exactly as a registry curve's would be.
   Called by the gates alone. */
let curveTest = null;
window.__bloomCurveTest = {
  mount({ id = 'curveTest', label = 'Test curve', spec, value, validate = null } = {}) {
    if (curveTest) { curveTest.input.curveEditor.dispose(); curveTest.wrap.remove(); }
    const problems = curveSpecProblems(spec, value);
    if (problems.length) throw new Error(`__bloomCurveTest.mount: ${problems.join('; ')}`);
    if (!inputs[spec.owner]) throw new Error(`__bloomCurveTest.mount: owner ${spec.owner} is not a control on this page`);
    const desc = { id, label, kind: 'curve', curve: spec, default: value };
    const wrap = document.createElement('section');
    wrap.className = 'bl-ctrl bl-curve-test';
    wrap.dataset.curveTest = id;
    const lab = document.createElement('label');
    lab.htmlFor = id;
    lab.append(label);
    const val = document.createElement('span');
    val.className = 'bl-val';
    lab.append(val);
    const input = makeCurveInput(desc, {
      validate: typeof validate === 'function' ? (cand) => validate(cand, readUI()) : null,
      ownerLength: () => Number(inputs[spec.owner].value),
      ownerLabel: (CONTROLS.find((o) => o.id === spec.owner) || {}).label || spec.owner,
    });
    input.id = id;
    wrap.append(lab, input);
    panelRoot.parentElement.insertBefore(wrap, panelRoot);
    const said = () => { const v = input.value; val.textContent = `${v.mode} · ${v.points.length}${v.mode === 'two-sided' ? ` + ${v.right.length}` : ''} points`; };
    input.addEventListener('input', said);
    input.addEventListener('change', said);
    said();
    curveTest = { desc, field: fieldFor(desc), wrap, input };
    return { id };
  },
  unmount() { if (curveTest) { curveTest.input.curveEditor.dispose(); curveTest.wrap.remove(); curveTest = null; } },
  value: () => (curveTest ? curveTest.input.value : null),
  /* a programmatic write, then the two events — Reset's and a load's own shape */
  set(v) { curveTest.input.value = v; curveTest.input.dispatchEvent(new Event('input', { bubbles: true })); curveTest.input.dispatchEvent(new Event('change', { bubbles: true })); return curveTest.input.value; },
  pointClient: (side, i) => curveTest.input.curveEditor.pointClient(side, i),
  fracClient: (side, xy) => curveTest.input.curveEditor.fracClient(side, xy),
  unitsPerPx: () => curveTest.input.curveEditor.unitsPerPx(),
  refusal: () => curveTest.input.curveEditor.refusal(),
  lastOp: () => curveTest.input.curveEditor.lastOp(),
  counts: () => curveTest.input.curveEditor.counts(),
  focus: () => curveTest.input.curveEditor.focus(),
  said: () => curveTest.wrap.querySelector('.bl-val').textContent,
  dims: () => curveTest.wrap.querySelector('.bl-curve-dims').textContent,
  status: () => { const s = curveTest.wrap.querySelector('.bl-curve-status'); return s.hidden ? '' : s.textContent; },
  render: () => curveTest.input.curveEditor.render(),
  saveText: () => JSON.stringify({ controls: composeControls({ [curveTest.desc.id]: curveTest.input.value }, [curveTest.field]) }),
  loadText(text) {
    const obj = JSON.parse(text);
    const notes = [];
    const out = readControls(obj.controls, notes, [curveTest.field]);
    const applied = Object.prototype.hasOwnProperty.call(out, curveTest.desc.id);
    if (applied) this.set(out[curveTest.desc.id]);
    return { notes, applied };
  },
  /* the law, for a validator written in the page */
  law: { curveSamples, curveEquals, curveShapeRefusal, switchMode, sampleCurve },
};
/* ST6'S REFERENCE — A STEMLESS BUILD OF THE SAME STATE, made here on the same
   page and thrown away (session 43). It is the only owner in this file that the
   stem code does not write at all, which is exactly what Eva's fourth durable
   rule asks of a clause's expected value: if the hub-to-stem join moved a foot
   frame, resized the hub or grew UPWARD into the face the feet sit on, this is
   the only thing that could see it. Not a control, invisible to every gate's
   whole-state read-back, and called by the gates alone. */
window.__bloomStemlessHub = () => {
  const ui = { ...readUI(), stemLength: 0 };
  const acc = new MeshBuilder({ exportMode: shownMode() === 'export' });
  const built = buildBloomInto(acc, ui, { below: null, capability, scopes: scopesForBuild(scopes) });
  return {
    hubRadius: built.hub.radius,
    hubThickness: built.hub.thickness,
    topFaceZ: built.hubBuilt.topFaceZ,
    footFrames: footFramesDigest(built),
    /* ST8's REFERENCE — the same state with no stem, so nothing is omitted and
       every slot carries a petal. The stem code writes none of this, which is
       what makes it an owner the omission cannot move: if a surviving petal's
       foot moved, or the sequence renumbered, or the hub resized, this is the
       only thing on the page that can say so. */
    footFramesBySlot: footFramesBySlot(built),
    petalsBuilt: built.petalsBuilt,
    slotAzimuths: built.slotAzimuths.map((row) => [...row]),
    ringCount: built.rings.length,
  };
};

/* ---------------- the design file (save / load) ----------------
   bloom-file.js owns the FORMAT (the field table, the reader, the forward
   shape); this block owns only the page: a save is readUI() through
   composeDoc, a load is readDoc's `doc.controls` written into the inputs
   with the SAME real events the reset button fires, so every reader of the
   panel (labels, visibility, caps, the rebuild) sees a load exactly as it
   sees a hand on a slider. NOTHING IS APPLIED THAT THE READER DID NOT HAND
   BACK — a missing field is absent from `doc.controls` and the input keeps
   its value (rule 3); a refusal applies nothing at all. Every note the
   reader produced is printed, and a clean load SAYS it reported nothing,
   because "nothing to report" is itself a claim the status should make.
   `lastDesign` is the record the gate reads (`__bloomDesign.last()`). */
const designStatus = document.getElementById('designStatus');
let lastDesign = null;
function writeDesignStatus() {
  const d = lastDesign;
  if (!d) { designStatus.textContent = ''; designStatus.hidden = true; return; }
  designStatus.hidden = false;
  if (d.action === 'saved') { designStatus.textContent = `saved ${d.name} — ${d.count} controls, version ${d.version}`; return; }
  if (d.action === 'refused') { designStatus.innerHTML = `<span class="bl-err">could not load ${esc(d.name)}: ${esc(d.error)}</span>`; return; }
  const sc = d.scopes ? ` and ${d.scopes.layers} layer / ${d.scopes.petals} petal offset entr${d.scopes.layers + d.scopes.petals === 1 ? 'y' : 'ies'}${d.scopes.tiers ? ` and ${d.scopes.tiers} sepal tier entr${d.scopes.tiers === 1 ? 'y' : 'ies'}` : ''}${d.scopes.strands ? ` and ${d.scopes.strands} strand entr${d.scopes.strands === 1 ? 'y' : 'ies'}` : ''}` : '';
  const head = `loaded ${d.name} — ${d.applied} of ${d.fields} controls set${sc}`;
  if (!d.notes.length) { designStatus.textContent = `${head}; every field read clean, nothing to report`; return; }
  designStatus.innerHTML = `${esc(head)}; ${d.notes.length} note${d.notes.length === 1 ? '' : 's'}:\n`
    + d.notes.map((n) => `<span class="${n.kind === 'invalid' || n.kind === 'retired' || n.kind === 'dropped' ? 'bl-err' : ''}">[${esc(n.kind)}] ${esc(n.text)}</span>`).join('\n');
}
function esc(s) { return String(s).replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch])); }
function saveDesignText() { return toText(composeDoc(readUI(), { scopes })); }
function saveDesign() {
  const text = saveDesignText();
  const name = 'bloom-design.json';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  lastDesign = { action: 'saved', name, count: Object.keys(JSON.parse(text).controls).length, version: JSON.parse(text).version };
  writeDesignStatus();
  return text;
}
function applyDesign(text, name = '(inline)') {
  let obj;
  try { obj = JSON.parse(text); } catch (e) {
    lastDesign = { action: 'refused', name, error: `it is not JSON — ${(e && e.message) || e}`, notes: [] };
    writeDesignStatus(); return lastDesign;
  }
  const r = readDoc(obj);
  if (!r.ok) { lastDesign = { action: 'refused', name, error: r.error, notes: [] }; writeDesignStatus(); return lastDesign; }
  /* A LOAD ENDS THE PICK FIRST (Scoping-b): the controls below are written
     through their own events, which under a picked scope would land as that
     scope's offsets. Ending a pick writes nothing. */
  selectScope(null);
  let applied = 0;
  for (const c of CONTROLS) {
    if (!Object.prototype.hasOwnProperty.call(r.doc.controls, c.id)) continue;
    inputs[c.id].value = r.doc.controls[c.id];
    inputs[c.id].dispatchEvent(new Event('input', { bubbles: true }));
    inputs[c.id].dispatchEvent(new Event('change', { bubbles: true }));
    applied++;
  }
  /* THE SCOPES THE FILE CARRIES replace the page's (an empty set of containers
     is "no scopes", so a plain file clears a hook-set record), then ONE
     rebuild carries both the controls and the offsets. */
  /* A LIST THE FILE DOES NOT CARRY IS THE PAGE'S (rule 3: a missing field is
     reported and the page keeps what it has) — the reader names them in
     `overrides.missing`; a list the file carries, empty or not, replaces the
     page's. */
  const had = scopes;
  const missing = r.doc.overrides.missing || [];
  const next = {};
  for (const k of ['layers', 'petals', 'tiers', 'strands']) next[k] = missing.includes(k) ? ((had && had[k]) || []).map((e) => ({ ...e, offsets: { ...e.offsets } })) : r.doc.overrides[k];
  scopes = scopesAreEmpty(next) ? null : next;
  if (had !== null || scopes !== null) regenerate();   // a plain file onto a plain page rebuilt through the input events already
  const notes = r.notes.slice();
  /* A FILE SAVED BEFORE THE ROLE RETIREMENT (Q3.4) is migrated by the reader
     (bloom-file.js's `migrateRetiredRoles`): every retired role value is
     either carried into a scope offset or a global, or DROPPED, and each one
     arrives here as a `migrated` / `retired` note — printed below like every
     other note, never silent. */
  lastDesign = { action: 'loaded', name, applied, fields: CONTROLS.length, version: r.doc.version, notes, scopes: scopes ? { layers: scopes.layers.length, petals: scopes.petals.length, tiers: scopes.tiers.length, strands: (scopes.strands || []).length } : null };
  writeDesignStatus();
  return lastDesign;
}
async function loadDesignFile(file) {
  try { applyDesign(await file.text(), file.name); } catch (e) {
    lastDesign = { action: 'refused', name: file.name, error: `could not read the file — ${(e && e.message) || e}`, notes: [] };
    writeDesignStatus();
  }
}
document.getElementById('saveDesign').addEventListener('click', () => { saveDesign(); });
document.getElementById('designFile').addEventListener('change', (ev) => {
  const f = ev.target.files && ev.target.files[0];
  if (f) loadDesignFile(f);
  ev.target.value = '';   // so the SAME file chosen twice still fires `change`
});
/* Drag-drop anywhere on the page: a .json is a design; anything else is left
   to the browser, which would otherwise navigate away from the bloom. */
window.addEventListener('dragover', (ev) => { ev.preventDefault(); });
window.addEventListener('drop', (ev) => {
  ev.preventDefault();
  const f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
  if (f && isDesignFile(f)) loadDesignFile(f);
});
/* Harness hooks — the page's own functions, never a second path. */
window.__bloomDesign = {
  save: () => saveDesignText(),
  load: (text, name = '(inline)') => applyDesign(text, name),
  last: () => lastDesign,
  /* THE SCOPES RECORD the page holds (Scoping-a) and the notes its last
     hook-set record produced — read by the scopes gate. */
  scopes: () => scopes,
  scopesNotes: () => lastScopesNotes,
};

/* ---------------- go ---------------- */
applyVisibility();
regenerate();
renderer.setAnimationLoop(() => {
  if (viewTween) stepViewTween(); else controls.update();
  renderer.render(scene, camera);
});
