/* lantern.js — the /lantern page. Everything geometric lives in
   lantern-geometry.js (the solver, the flat pattern, the mesh, the SVG, the
   design file); lantern-view.js draws the folded model with three. This file
   builds the panel from its control table, routes the hand (sliders, the
   point-outline editor, presets, undo / redo) and draws the Flat view.
   Read lantern-design-doc.md before changing any of it. */

import * as G from './lantern-geometry.js';
import * as PAT from './lantern-pattern.js';
import * as MAT from './lantern-material.js';
import * as EXP from './lantern-export.js';
import * as BLD from './lantern-build.js';
import { curveFunction, proposeEdit, nearestOnCurve, quantise, curveEquals, cloneCurve } from './bloom-curve.js';
import { createFoldedView } from './lantern-view.js';

const STORE = 'lantern-v1';
const NS = 'http://www.w3.org/2000/svg';
const $ = (id) => document.getElementById(id);
const inch = (mm) => (mm / G.MM_PER_IN).toFixed(1) + '″';

/* ---------------- state and history ---------------- */
let state = { ...G.DEFAULTS, ...PAT.PATTERN_STATE_DEFAULTS, ...MAT.EXPORT_STATE_DEFAULTS, ...BLD.BACKING_STATE_DEFAULTS, edge: cloneCurve(G.DEFAULTS.edge) };
let rules = MAT.rulesFor(MAT.stockOf(state), MAT.machineOf(state));   // the material model's derived rules, re-read on every rebuild
let plan = null;        // the export plan: pieces, sheets, notes (see rebuildNow)
let pattern = null;      // the pattern laid onto the model's facets, judged (see rebuildNow)
let flatFocus = null;    // a cut finding the Flat view is zoomed on: { x, y, r } in flat mm
let model = null;
let view = 'folded';
const history = { past: [], future: [], max: 80 };
const stats = { solves: 0, solveMs: 0, flatDraws: 0, edits: 0, patterns: 0, patternMs: 0, textures: 0 };
const snap = (s) => JSON.stringify(s);
function pushHistory(prev) { if (history.past.length && history.past[history.past.length - 1] === snap(prev)) return; history.past.push(snap(prev)); if (history.past.length > history.max) history.past.shift(); history.future.length = 0; syncHistory(); }
function syncHistory() { $('undo').disabled = !history.past.length; $('redo').disabled = !history.future.length; }
function undo() { if (!history.past.length) return; history.future.push(snap(state)); state = JSON.parse(history.past.pop()); syncHistory(); rebuild({ commit: false }); }
function redo() { if (!history.future.length) return; history.past.push(snap(state)); state = JSON.parse(history.future.pop()); syncHistory(); rebuild({ commit: false }); }
function persist() { try { localStorage.setItem(STORE, snap(state)); } catch { /* storage is a convenience */ } }

/* ---------------- the control table ---------------- */
/* Every control the panel renders, with where it lives, its bounds and the
   consequence its tooltip explains. A `when` predicate hides it (and the
   geometry ignores the hidden value by construction). */
const CONTROLS = [
  { id: 'points', sec: 'shapeCtrls', kind: 'range', label: 'Points', min: 3, max: 16, step: 1, fmt: (v) => `${v}`, tip: 'How many points. Many points need a fuller inner radius to close (see Checks).' },
  { id: 'width', sec: 'shapeCtrls', kind: 'range', label: 'Finished width', min: 150, max: 900, step: 1, fmt: (v) => `${v} mm · ${inch(v)}`, tip: 'Tip to tip, finished. Real stars run 16–24″; anything over a laser bed splits into modules (phase 3).' },
  { id: 'depthFrac', sec: 'shapeCtrls', kind: 'range', label: 'Finished depth', min: 0.1, max: 0.9, step: 0.01, fmt: (v, m) => `${(v * state.width).toFixed(0)} mm · ${inch(v * state.width)}${m && m.clampedDepth ? ` → built ${m.depth.toFixed(0)} mm` : ''}`, tip: 'Front to back, finished. A straight-ridge point only closes at depths its slenderness allows; the solver clamps to the nearest and tells you.' },
  { id: 'slender', sec: 'shapeCtrls', kind: 'range', label: 'Point slenderness', min: 0.15, max: 0.95, step: 0.01, fmt: (v) => `${v.toFixed(2)} inner / outer`, tip: 'Inner vertex radius over tip radius, finished. Near 1 is a puffy polygon; a regular pentagram is 0.38. Slender AND shallow cannot close.' },
  { id: 'alternate', sec: 'shapeCtrls', kind: 'check', label: 'Alternate long / short points', when: (s) => s.points % 2 === 0, tip: 'Every other point shorter (8 reads as 4 long + 4 short). Even point counts only.' },
  { id: 'altRatio', sec: 'shapeCtrls', kind: 'range', label: 'Short point length', min: 0.4, max: 0.95, step: 0.01, fmt: (v) => `${(v * 100).toFixed(0)}% of the long`, when: (s) => s.alternate && s.points % 2 === 0, tip: 'The short tip\'s radius as a share of the long tip\'s.' },
  { id: 'scallops', sec: 'scallopCtrls', kind: 'range', label: 'Scallops per edge', min: 2, max: 9, step: 1, fmt: (v) => `${v}`, when: (s) => s.edgeMode === 'scalloped', tip: 'Crests along each edge from tip to inner vertex.' },
  { id: 'scallopDepth', sec: 'scallopCtrls', kind: 'range', label: 'Scallop depth', min: 0.005, max: 0.05, step: 0.0025, fmt: (v) => `${(v * 100).toFixed(1)}% of the edge`, when: (s) => s.edgeMode === 'scalloped', tip: 'Deeper scallops run nearer to radial, which a folded rim cannot hold — Checks will say when.' },
  { id: 'tip', sec: 'tipCtrls', kind: 'select', label: 'Tip', options: [['sharp', 'sharp'], ['blunt', 'slightly blunted']], tip: 'A small radius at the tip survives folding; a sharp paper tip tears on the ridge fold.' },
  { id: 'tipRadius', sec: 'tipCtrls', kind: 'range', label: 'Tip radius', min: 1, max: 8, step: 0.5, fmt: (v) => `${v.toFixed(1)} mm`, when: (s) => s.tip === 'blunt', tip: 'The fillet at each tip.' },
  { id: 'opening', sec: 'mountCtrls', kind: 'range', label: 'Back opening', min: 20, max: 80, step: 1, fmt: (v) => `⌀ ${v} mm`, tip: 'The hole in the back half\'s centre for the cord kit\'s socket. 40 mm fits a standard E26 pendant kit; measure yours.' },
  { id: 'ringWidth', sec: 'mountCtrls', kind: 'range', label: 'Reinforcing ring width', min: 10, max: 40, step: 1, fmt: (v) => `${v} mm`, tip: 'A separate ring glued around the opening on the inside, so the cord kit\'s grip has stock to hold.' },
  { id: 'hangHole', sec: 'mountCtrls', kind: 'check', label: 'Hang hole at one tip', tip: 'A 6 mm hole on one point\'s ridge, 15 mm from the tip, for hanging by a point instead of the cord.' },
  { id: 'patMode', sec: 'patternCtrls', kind: 'select', label: 'Generator', options: [['paisley', 'paisley & scroll'], ['lace', 'lace'], ['botanical', 'botanical'], ['geometric', 'geometric'], ['celestial', 'celestial'], ['none', 'none — solid paper']], tip: 'The family the pattern is drawn from. Every point carries it, mirrored about its ridge.' },
  { id: 'patDensity', sec: 'patternCtrls', kind: 'range', label: 'Density', min: 0.2, max: 1, step: 0.05, fmt: (v) => `${(v * 100).toFixed(0)}%`, when: (s) => s.patMode !== 'none', tip: 'How much of each facet is cut. More light, less paper — the checks say when the paper gets too thin.' },
  { id: 'patIntricacy', sec: 'patternCtrls', kind: 'range', label: 'Intricacy', min: 0.2, max: 1, step: 0.05, fmt: (v) => `${(v * 100).toFixed(0)}%`, when: (s) => s.patMode !== 'none', tip: 'Fewer, larger motifs at the left; finer detail at the right, down to the smallest cut the stock allows.' },
  { id: 'patRim', sec: 'patternCtrls', kind: 'select', label: 'Rim band', options: [['none', 'none'], ['beads', 'beads'], ['picot', 'picot'], ['scallop', 'scallop arcs'], ['dashes', 'dashes']], when: (s) => s.patMode !== 'none', tip: 'A row of small cuts inside the rim margin, along each edge.' },
  { id: 'patSolidAlt', sec: 'patternCtrls', kind: 'check', label: 'Alternate points solid', when: (s) => s.patMode !== 'none', tip: 'Every other point left uncut — the lantern reads as pattern / plain / pattern.' },
  { id: 'patAutoBridge', sec: 'patternCtrls', kind: 'check', label: 'Auto-bridge islands', when: (s) => s.patMode !== 'none', tip: 'A piece of paper enclosed by a cut would fall out; on, the generator splits the cut to leave a bridge. Off, the island is reported instead.' },
  { id: 'material', sec: 'materialCtrls', kind: 'select', label: 'Stock', options: MAT.MATERIALS.map((m) => [m.id, m.name]), tip: 'The paper. Every cutting rule below is derived from its caliper; a custom stock takes your own gsm and thickness.' },
  { id: 'gsm', sec: 'materialCtrls', kind: 'range', label: 'Weight', min: MAT.GSM_RANGE[0], max: MAT.GSM_RANGE[1], step: 5, fmt: (v) => `${v} gsm`, when: (s) => s.material === 'custom', tip: 'Grams per square metre — on the ream\'s label.' },
  { id: 'caliper', sec: 'materialCtrls', kind: 'range', label: 'Thickness', min: MAT.CALIPER_RANGE[0], max: MAT.CALIPER_RANGE[1], step: 0.01, fmt: (v) => `${v.toFixed(2)} mm`, when: (s) => s.material === 'custom', tip: 'The caliper, measured with a micrometer or taken from the mill\'s sheet. It drives every rule.' },
  { id: 'machine', sec: 'materialCtrls', kind: 'select', label: 'Machine', options: MAT.MACHINES.map((m) => [m.id, m.name]), tip: 'A laser scores the mountains and perforates the valleys; a blade cutter scores both and leaves the PERF layer empty.' },
  { id: 'bed', sec: 'materialCtrls', kind: 'select', label: 'Bed', options: MAT.BEDS.map((b) => [b.id, b.name]), tip: 'The cutting area. A half that does not fit is split into one module per point, joined on the valley folds.' },
  { id: 'backing', sec: 'backingCtrls', kind: 'check', label: 'Tissue backing', tip: 'Translucent tissue glued behind each point\'s cuts, so the light comes through colour.' },
  { id: 'backingColours', sec: 'backingCtrls', kind: 'range', label: 'Colours', min: 1, max: 3, step: 1, fmt: (v) => `${v}`, when: (s) => s.backing, tip: 'One colour, two alternating around the star, or a triad.' },
  { id: 'palette', sec: 'backingCtrls', kind: 'select', label: 'Palette', options: BLD.PALETTES.map((p) => [p.id, p.name]), when: (s) => s.backing, tip: 'Curated tissue colours; the pieces are labelled by point.' },
  { id: 'profile', sec: 'profileCtrls', kind: 'select', label: 'Side profile', options: [['straight', 'straight — classic triangle'], ['faceted', 'faceted curve (phase 6, not yet)']], disabledOptions: ['faceted'], tip: 'Straight: the ridge runs straight from centre to tip. Faceted: extra creases round the body (not built yet).' },
];
const SECS = {};
function makeControl(c) {
  const host = $(c.sec);
  const wrap = document.createElement('div');
  wrap.className = 'ln-ctrl' + (c.kind === 'check' ? ' ln-check' : '');
  wrap.dataset.ctrl = c.id;
  if (c.kind === 'range') {
    wrap.innerHTML = `<label for="${c.id}" title="${c.tip || ''}"><span>${c.label}</span><output id="${c.id}-out"></output></label><input type="range" id="${c.id}" min="${c.min}" max="${c.max}" step="${c.step}">`;
    const el = wrap.querySelector('input');
    el.addEventListener('input', () => { setValue(c.id, +el.value, { commit: false }); });
    el.addEventListener('change', () => { setValue(c.id, +el.value, { commit: true }); });
  } else if (c.kind === 'check') {
    wrap.innerHTML = `<label for="${c.id}" title="${c.tip || ''}"><input type="checkbox" id="${c.id}"><span>${c.label}</span></label>`;
    wrap.querySelector('input').addEventListener('change', (e) => setValue(c.id, e.target.checked, { commit: true }));
  } else if (c.kind === 'select') {
    wrap.innerHTML = `<label for="${c.id}" title="${c.tip || ''}"><span>${c.label}</span></label><select id="${c.id}">${c.options.map(([v, l]) => `<option value="${v}"${(c.disabledOptions || []).includes(v) ? ' disabled' : ''}>${l}</option>`).join('')}</select>`;
    wrap.querySelector('select').addEventListener('change', (e) => setValue(c.id, e.target.value, { commit: true }));
  }
  host.append(wrap);
  SECS[c.id] = wrap;
}
function syncControls() {
  for (const c of CONTROLS) {
    const wrap = SECS[c.id], el = $(c.id);
    const show = !c.when || c.when(state);
    wrap.hidden = !show;
    if (c.kind === 'range') { if (document.activeElement !== el) el.value = state[c.id]; $(`${c.id}-out`).textContent = c.fmt(+state[c.id], model); wrap.classList.toggle('is-warned', c.id === 'depthFrac' && !!(model && model.clampedDepth)); }
    else if (c.kind === 'check') el.checked = !!state[c.id];
    else el.value = state[c.id];
  }
  for (const b of $('edgeModes').children) b.classList.toggle('is-on', b.dataset.mode === state.edgeMode);
  for (const b of $('shapePresets').children) b.classList.toggle('is-on', presetMatches(b.dataset.preset));
  for (const b of $('patternPresets').children) b.classList.toggle('is-on', patternPresetMatches(b.dataset.preset));
}

/* THE ONE WRITE PATH for a control value. `commit` pushes history and persists. */
let gestureStart = null;   // the state before a slider gesture began (its `input` events mutate state before `change` commits)
function setValue(id, value, { commit = true } = {}) {
  const prev = gestureStart ? JSON.parse(gestureStart) : { ...state, edge: cloneCurve(state.edge) };
  if (!commit && !gestureStart) gestureStart = snap(state);
  if (id === 'edge') state.edge = cloneCurve(value); else state[id] = value;
  if (id === 'points' && state.points % 2 && state.alternate) state.alternate = false;
  if (id === 'material' && value !== 'custom') { const m = MAT.MATERIALS.find((x) => x.id === value); state.gsm = m.gsm; state.caliper = m.t; }   // a preset stock pins its numbers; custom starts from the last ones
  if (['scallops', 'scallopDepth'].includes(id) && state.edgeMode === 'scalloped') state.edge = G.edgeCurveFor('scalloped', state);
  if (commit) { pushHistory(prev); gestureStart = null; }
  rebuild({ commit });
}
function setEdgeMode(mode) {
  const prev = { ...state, edge: cloneCurve(state.edge) };
  state.edgeMode = mode;
  const cv = G.edgeCurveFor(mode, state);
  if (cv) state.edge = cv;
  pushHistory(prev);
  rebuild({ commit: true });
}
function presetMatches(id) {
  const p = G.SHAPE_PRESETS.find((q) => q.id === id); if (!p) return false;
  const st = G.presetState(p);
  return G.STATE_FIELDS.every((k) => (k === 'edge' ? curveEquals(st.edge, state.edge) : st[k] === state[k]));
}
function applyPreset(p) {
  const prev = { ...state, edge: cloneCurve(state.edge) };
  const st = G.presetState(p);
  state = { ...state, ...st, width: state.width };     // a preset is a shape; the size is hers
  pushHistory(prev);
  $('presetNote').textContent = p.name;
  rebuild({ commit: true });
}

/* ---------------- pattern presets and the randomizer ---------------- */
function patternPresetMatches(id) { const p = PAT.PATTERN_PRESETS.find((q) => q.id === id); return !!p && PAT.PATTERN_FIELDS.every((k) => (k in p.state ? p.state[k] === state[k] : true)); }
function applyPatternPreset(p) {
  const prev = { ...state, edge: cloneCurve(state.edge) };
  state = { ...state, ...p.state };
  pushHistory(prev); $('patternNote').textContent = p.name; rebuild({ commit: true });
}
/* a random pattern is kept only if the judge passes it with no island and no thin paper: up to eight draws, the best of them otherwise, told */
let lastRandom = null;                 // every draw's own counts and which one was kept — read by the gate, written by nothing else
function randomPattern() {
  const prev = { ...state, edge: cloneCurve(state.edge) };
  let best = null;
  const draws = [];
  for (let k = 0; k < 8; k++) {
    const cand = PAT.randomPattern((Math.random() * 2 ** 31) >>> 0);
    const pat = PAT.patternForModel(model, { ...state, ...cand }, rules, { validate: true });
    const score = pat.counts.island * 100 + pat.counts.thin + pat.counts.narrow + pat.counts.keepout;
    draws.push({ counts: { island: pat.counts.island, thin: pat.counts.thin, narrow: pat.counts.narrow, keepout: pat.counts.keepout } });
    if (!best || score < best.score) best = { cand, score, k };
    if (score === 0) break;
  }
  lastRandom = { draws, picked: best.k };
  state = { ...state, ...best.cand };
  pushHistory(prev);
  $('patternNote').textContent = best.score === 0 ? `random — passes every check` : `random — the best of eight draws, see Checks`;
  rebuild({ commit: true });
}
function reseedPattern() { const prev = { ...state, edge: cloneCurve(state.edge) }; state = { ...state, patSeed: (Math.random() * 2 ** 31) >>> 0 }; pushHistory(prev); $('patternNote').textContent = `seed #${state.patSeed.toString(36)}`; rebuild({ commit: true }); }

/* ---------------- the rebuild ---------------- */
let pending = 0;
function rebuild({ commit = true } = {}) {
  if (pending) return; pending = requestAnimationFrame(() => { pending = 0; rebuildNow({ commit }); });
}
function rebuildNow({ commit = true } = {}) {
  const t0 = performance.now();
  if (!G.SHAPE_PRESETS.some((p) => presetMatches(p.id))) $('presetNote').textContent = $('presetNote').textContent.startsWith('random') ? $('presetNote').textContent : '';
  rules = MAT.rulesFor(MAT.stockOf(state), MAT.machineOf(state));
  model = G.solveLantern({ ...state, tabWidth: rules.tabWidth });
  stats.solves++; stats.solveMs = performance.now() - t0;
  const t1 = performance.now();
  pattern = PAT.patternForModel(model, state, rules, { validate: commit || !pattern });   // mid-gesture the raster judge is skipped; the commit runs it, and so does the first paint
  stats.patternMs = performance.now() - t1; stats.patterns++;
  plan = EXP.exportPlan(model, pattern, state, rules);
  plan.backing = state.backing && state.patMode !== 'none' ? [...BLD.backingPieces(model, state, rules, 'front'), ...BLD.backingPieces(model, state, rules, 'back')] : [];
  plan.backingSheets = plan.backing.length ? EXP.nest(plan.backing, plan.bed) : [];
  plan.weightG = MAT.weightEstimate(paperAreaMm2(), cutFraction(), rules.gsm);
  plan.steps = BLD.buildSteps(model, plan, state, rules, { backing: plan.backing.length });
  drawRules(); drawPlan(); drawSwatch();
  if (view === 'build') drawBuild();
  syncControls();
  drawDims();
  drawFlags();
  drawEditor();
  if (view === 'flat') drawFlat(); else pushMesh();
  if (commit) persist();
}
const textureCache = new Map();   // per facet type record: the canvas the alpha map was painted on
function textureFor(rec, solid) {
  const key = solid ? 'solid' : rec;
  let cv = textureCache.get(key);
  if (cv) return cv;
  if (textureCache.size > 8) textureCache.clear();
  cv = document.createElement('canvas');
  const px = Math.min(2048 / rec.box.Ro, 2048 / (2 * rec.box.yMax), 6);   // ≤ 2048 on a side, at most 6 px per mm
  cv.width = Math.max(4, Math.round(rec.box.Ro * px)); cv.height = Math.max(4, Math.round(2 * rec.box.yMax * px));
  PAT.paintFacetTexture(cv.getContext('2d'), rec, cv.width, cv.height, { solid });
  stats.textures++;
  textureCache.set(key, cv);
  return cv;
}
function pushMesh() {
  const solidAlt = !!state.patSolidAlt && state.patMode !== 'none';
  const backing = !!state.backing && state.patMode !== 'none';
  const front = G.foldedMesh(model, 1, { solidAlternate: solidAlt, perPoint: backing }), back = G.foldedMesh(model, -1, { opening: true, solidAlternate: solidAlt, perPoint: backing });
  const texOf = (part) => (state.patMode === 'none' ? null : textureFor(pattern.types[model.alternate ? (part.type === 'short' ? 1 : 0) : 0], part.solid));
  const colourOf = backing ? (part) => (part.solid ? null : BLD.colourOfPoint(state, part.j)) : null;
  fold.setModel([front, back], { fit: !meshFitted || Math.abs(lastFitRadius - model.flatSpan) > 1e-6, bounds: model.rt, textureOf: texOf, colourOf });
  meshFitted = true; lastFitRadius = model.flatSpan;
}
let meshFitted = false, lastFitRadius = 0;

/* ---------------- read-outs ---------------- */
function drawRules() {
  const r = rules, m = MAT.machineOf(state);
  $('rulesOut').innerHTML = `<b>stock</b>  ${r.gsm} gsm · ${r.t.toFixed(2)} mm\n<b>rules</b>  bridge ${r.bridge} · hole ≥ ${r.minHole} · stroke ≥ ${r.minCut} · fold keep-out ${r.foldKeepout} · rim margin ${r.rimMargin} · spine ${r.spine} · tab ${r.tabWidth} mm\n<b>machine</b>  ${m.note} · kerf ${r.kerf} mm, not compensated`;
}
function drawPlan() {
  const p = plan;
  const sheets = p.sheets.length, util = p.sheets.reduce((s, sh) => s + sh.utilisation, 0) / Math.max(1, sheets);
  const area = paperAreaMm2(), cutFrac = cutFraction();
  const w = MAT.weightEstimate(area, cutFrac, rules.gsm);
  const bk = p.backing.length ? ` · ${p.backing.length} tissue pieces on ${p.backingSheets.length} more sheet${p.backingSheets.length > 1 ? 's' : ''}` : '';
  $('planOut').innerHTML = `<b>${p.bed.name}</b>  ${p.split ? `${model.N} point modules a half, seams on the valley folds` : 'each half whole'} · ${p.pieces.length} pieces on <b>${sheets} sheet${sheets > 1 ? 's' : ''}</b> · ${(util * 100).toFixed(0)}% of the bed used${bk}\n<b>paper</b>  ${(area / 1e4).toFixed(1)} dm² before cutting, ${(cutFrac * 100).toFixed(0)}% cut away · about <b>${w.toFixed(0)} g</b> of paper${p.fitsBed ? '' : '\n<b>does not fit</b> — see Checks'}`;
}
function drawSwatch() { const host = $('paletteSwatch'); host.replaceChildren(); if (!state.backing) return; const cols = BLD.paletteOf(state).colours.slice(0, state.backingColours); for (const c of cols) { const sw = document.createElement('span'); sw.className = 'ln-swatch'; sw.style.background = c; sw.title = c; host.append(sw); } const n = document.createElement('span'); n.className = 'ln-note'; n.textContent = `point 1 ${cols[0]}${cols.length > 1 ? `, point 2 ${cols[1]}` : ''}${cols.length > 2 ? `, point 3 ${cols[2]}` : ''}, and round`; host.append(n); }
/* the Build view: the steps, the counts, the machine settings — one list, drawn here and into the PDF */
function drawBuild() {
  const steps = plan.steps, settings = BLD.settingsTable(plan.machine, rules);
  $('buildView').innerHTML = `<h2>Build — ${model.N}-point star, ${model.width.toFixed(0)} mm</h2><p class="ln-build-sub">${plan.pieces.length} pieces on ${plan.sheets.length} sheet${plan.sheets.length > 1 ? 's' : ''}${plan.backing.length ? `, ${plan.backing.length} tissue pieces` : ''} · ${plan.machine.name} · ${state.material} · about ${Math.round(plan.weightG)} g</p>` +
    `<ol>${steps.map((st) => `<li><b>${st.title}</b>${st.text}</li>`).join('')}</ol>` +
    `<table><tr><th>layer</th><th>starting setting</th><th>what it does</th></tr>${settings.map((r) => `<tr><td>${r.layer}</td><td>${r.setting}</td><td>${r.note}</td></tr>`).join('')}</table>` +
    `<p class="ln-note">settings are starting values for a power test on this stock — every machine is its own. <span class="ln-warn">LED light only.</span></p>`;
}
/* both halves' paper (the facets, the tabs) and the share the pattern cuts away */
function paperAreaMm2() { const h = G.halfOutline(model, 'front'); return 2 * polyAreaAbs(h.outline) + h.tabs.filter(Boolean).reduce((s, t) => s + polyAreaAbs(t.poly), 0); }
function cutFraction() { if (!pattern || state.patMode === 'none') return 0; const h = G.halfOutline(model, 'front'); const cut = PAT.placeCuts(model, pattern, state).reduce((s, c) => s + polyAreaAbs(c.poly), 0); return Math.min(0.95, cut / polyAreaAbs(h.outline)); }
const polyAreaAbs = (p) => { let a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j][0] + p[i][0]) * (p[j][1] - p[i][1]); return Math.abs(a / 2); };
function drawDims() {
  const d = G.dimensions(model);
  const alt = model.alternate ? `\nshort tip radius <b>${(model.facets[1].rtip).toFixed(1)} mm</b> · facet angles <b>${(model.facets[0].a * 180 / Math.PI).toFixed(2)}° / ${(model.facets[1].a * 180 / Math.PI).toFixed(2)}°</b>` : '';
  $('dims').innerHTML = `<b>finished</b>  ${d.finishedWidth.toFixed(0)} mm wide (${inch(d.finishedWidth)}) · ${d.finishedDepth.toFixed(0)} mm deep (${inch(d.finishedDepth)}) · inner vertex r ${d.finishedInner.toFixed(0)} mm\n` +
    `<b>flat</b>  span ${d.flatSpan.toFixed(0)} mm (${inch(d.flatSpan)}) · tip radius ${d.flatOuter.toFixed(1)} mm · inner radius ${d.flatInner.toFixed(1)} mm · facet angle ${d.facetAngleDeg.toFixed(2)}°${alt}\n` +
    `<b>edge</b>  chord ${d.chordMm.toFixed(1)} mm · drawn ${d.edgeLengthMm.toFixed(1)} mm · derived bow ${d.bowMm.toFixed(1)} mm · closure ratio ${d.ratio.toFixed(4)}\n` +
    `<b>tabs</b>  ${d.tabWidth} mm (phase 3 derives this from the stock) · solve ${stats.solveMs.toFixed(0)} ms`;
}
function drawFlags() {
  const ul = $('flags'); ul.replaceChildren();
  let bad = 0, warn = 0;
  for (const n of model.notes) {
    const li = document.createElement('li'); li.className = n.kind === 'clamp' ? 'warn' : n.kind; li.dataset.flag = n.id; li.textContent = n.text; ul.append(li);
    if (n.kind === 'bad') bad++; else if (n.kind === 'warn' || n.kind === 'clamp') warn++;
  }
  const pc = pattern ? pattern.counts : { island: 0, thin: 0, narrow: 0, keepout: 0 };
  const cutFindings = [];
  if (pc.island) cutFindings.push({ kind: 'bad', id: 'islands', text: `${pc.island} island${pc.island > 1 ? 's' : ''} per facet — paper enclosed by a cut falls out when weeded${state.patAutoBridge ? ' (the auto-bridge could not reach it)' : ' (auto-bridge is off)'}`, issue: 'island' });
  if (pc.thin) cutFindings.push({ kind: 'warn', id: 'thin', text: `${pc.thin} spot${pc.thin > 1 ? 's' : ''} per facet of paper thinner than the ${rules.bridge} mm bridge — it will cut, and may tear in weeding`, issue: 'thin' });
  if (pc.narrow) cutFindings.push({ kind: 'warn', id: 'narrow', text: `${pc.narrow} cut${pc.narrow > 1 ? 's' : ''} per facet narrower than the stock's minimum (${rules.minCut} mm stroke, ${rules.minHole} mm hole)`, issue: 'narrow' });
  if (pc.keepout) cutFindings.push({ kind: 'warn', id: 'keepout', text: `${pc.keepout} cut${pc.keepout > 1 ? 's' : ''} per facet inside a keep-out (spine, fold or rim margin)`, issue: 'keepout' });
  for (const n of plan ? plan.notes : []) cutFindings.push(n);
  if (model.Ro > MAT.sagLimitMm(rules.t)) cutFindings.push({ kind: 'warn', id: 'sag', text: `a ${model.Ro.toFixed(0)} mm point on ${rules.gsm} gsm will sag — the stock holds about ${MAT.sagLimitMm(rules.t).toFixed(0)} mm (a starting rule of thumb, scaled by the cube root of the caliper); heavier stock or a smaller star` });
  if (pattern && pattern.bridged) cutFindings.push({ kind: 'info', id: 'bridged', text: `${pattern.bridged} island${pattern.bridged > 1 ? 's' : ''} per facet bridged automatically` });
  for (const n of cutFindings) {
    const li = document.createElement('li'); li.className = n.kind + (n.issue ? ' cut' : ''); li.dataset.flag = n.id; li.textContent = n.text;
    if (n.issue) { li.title = 'show in the Flat view'; li.addEventListener('click', () => focusIssue(n.issue)); }
    ul.append(li);
    if (n.kind === 'bad') bad++; else if (n.kind === 'warn') warn++;
  }
  $('flagHint').hidden = !cutFindings.some((n) => n.issue);
  if (!model.notes.length && !cutFindings.length) { const li = document.createElement('li'); li.className = 'ok'; li.textContent = 'closes with no bow at this depth; the rim lies flat and both halves match.'; ul.append(li); }
  else if (!bad && !warn && !cutFindings.length) { const li = document.createElement('li'); li.className = 'ok'; li.textContent = 'the fold closes; both halves\' rims match.'; ul.append(li); }
  const c = $('flagCount'); c.textContent = bad ? `${bad} problem${bad > 1 ? 's' : ''}` : warn ? `${warn} note${warn > 1 ? 's' : ''}` : 'ok';
  c.className = 'ln-count' + (bad ? ' is-bad' : warn ? ' is-warn' : '');
}

/* ---------------- the Flat view ---------------- */
const flatSvg = $('flatSvg');
let focusIndex = 0;
/* zoom the Flat view onto the next finding of a kind (clicking the same finding again walks through them) */
function focusIssue(kind) {
  const list = PAT.placeIssues(model, pattern, state).filter((i) => i.kind === kind);
  if (!list.length) return;
  const i = list[focusIndex++ % list.length];
  flatFocus = { x: i.flat[0], y: i.flat[1], r: Math.max(12, i.r * 6), kind, at: i.at, j: i.j };
  if (view !== 'flat') setView('flat'); else drawFlat();
}
function drawFlat() {
  stats.flatDraws++;
  const h = G.halfOutline(model, 'front'), hb = G.halfOutline(model, 'back');
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const grow = (p) => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); };
  h.outline.forEach(grow); for (const t of h.tabs) if (t) t.poly.forEach(grow);
  const bb = flatSvg.getBoundingClientRect(); const W = bb.width || 800, Hh = bb.height || 600;
  const ringW = hb.ring ? 2 * hb.ring.outer + 24 : 0;
  const w = x1 - x0 + ringW, hgt = y1 - y0;
  let s = Math.min((W - 60) / w, (Hh - 70) / hgt);
  let ox = W / 2 - s * (x0 + x1 + ringW) / 2, oy = Hh / 2 - 8 + s * (y0 + y1) / 2;
  if (flatFocus) { s = Math.min(W, Hh) / (2 * flatFocus.r); ox = W / 2 - s * flatFocus.x; oy = Hh / 2 + s * flatFocus.y; }
  const P = (p) => `${(ox + s * p[0]).toFixed(1)},${(oy - s * p[1]).toFixed(1)}`;
  const path = (pts, closed) => `M${pts.map(P).join('L')}${closed ? 'Z' : ''}`;
  const el = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (text != null) e.textContent = text; return e; };
  flatSvg.setAttribute('viewBox', `0 0 ${W} ${Hh}`);
  flatSvg.replaceChildren();
  flatSvg.append(el('path', { class: 'outline', d: path(h.outline, true) }));
  for (const t of h.tabs) if (t) flatSvg.append(el('path', { class: 'tab', d: path(t.poly, true) }));
  for (const c of h.creases) flatSvg.append(el('line', { class: c.kind, x1: ox + s * c.from[0], y1: oy - s * c.from[1], x2: ox + s * c.to[0], y2: oy - s * c.to[1] }));
  if (pattern && state.patMode !== 'none') for (const c of PAT.placeCuts(model, pattern, state)) flatSvg.append(el('path', { class: 'cutpat', d: path(c.poly, true) }));
  if (pattern && state.patMode !== 'none') for (const i of PAT.placeIssues(model, pattern, state)) flatSvg.append(el('circle', { class: `issue ${i.kind}${flatFocus && flatFocus.at === i.at && flatFocus.j === i.j ? ' is-focus' : ''}`, cx: ox + s * i.flat[0], cy: oy - s * i.flat[1], r: Math.max(6, s * i.r) }));
  for (const o of hb.holes) flatSvg.append(el('circle', { class: 'hole', cx: ox + s * o.cx, cy: oy - s * o.cy, r: s * o.r }));
  if (hb.ring) {
    const cx = ox + s * (x1 + 12 + hb.ring.outer), cy = oy - s * 0;
    flatSvg.append(el('circle', { class: 'ring', cx, cy, r: s * hb.ring.outer }), el('circle', { class: 'ring', cx, cy, r: s * hb.ring.inner }));
    flatSvg.append(el('text', { class: 'dim', x: cx, y: cy + s * hb.ring.outer + 14, 'text-anchor': 'middle' }, 'ring (back)'));
  }
  if (flatFocus) { flatSvg.append(el('text', { class: 'dim', x: 12, y: 22 }, `zoomed on ${flatFocus.kind === 'island' ? 'an island' : 'a ' + flatFocus.kind} finding on point ${flatFocus.j + 1} — click the drawing to see the whole sheet`)); return; }
  // the flat span dimension line
  const yd = oy - s * y0 + 22;
  flatSvg.append(el('line', { class: 'dimline', x1: ox + s * x0, y1: yd, x2: ox + s * x1, y2: yd }));
  flatSvg.append(el('text', { class: 'dim', x: ox + s * (x0 + x1) / 2, y: yd - 5, 'text-anchor': 'middle' }, `flat sheet ${(x1 - x0).toFixed(0)} × ${(y1 - y0).toFixed(0)} mm (${inch(x1 - x0)} × ${inch(y1 - y0)}) → finished ${model.width.toFixed(0)} mm wide, ${model.depth.toFixed(0)} mm deep`));
  flatSvg.append(el('text', { class: 'key', x: 12, y: Hh - 12 }, 'red: cut (outline, tabs, holes) · blue: score = mountain folds · green dashed: perforate = valley folds · front half shown; the back is the same outline with the opening'));
}

/* ---------------- the point-outline editor ---------------- */
const editor = (() => {
  const host = $('edgeEditor');
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('tabindex', '0'); svg.setAttribute('role', 'application');
  svg.setAttribute('aria-label', 'Point outline: drag a point; double-click the curve to add one, a point to remove it');
  const status = document.createElement('p'); status.className = 'ln-curve-status'; status.hidden = true;
  host.append(svg, status);
  const spec = G.EDGE_SPEC;
  const pad = 0.05, Y = spec.y[1];
  const VB = { x0: -pad, y0: -Y - pad, w: 1 + 2 * pad, h: 2 * Y + 2 * pad };
  svg.setAttribute('viewBox', `${VB.x0} ${VB.y0} ${VB.w} ${VB.h}`);
  const HANDLE = 0.018;
  let drag = null, focus = 0, refusal = null;
  const counts = { input: 0, change: 0, refused: 0 };
  const toVb = (cx, cy) => { const p = svg.createSVGPoint(); p.x = cx; p.y = cy; const m = svg.getScreenCTM(); return m ? p.matrixTransform(m.inverse()) : null; };
  const toClient = (xy) => { const p = svg.createSVGPoint(); p.x = xy[0]; p.y = -xy[1]; return p.matrixTransform(svg.getScreenCTM()); };
  const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
  const layers = el('g', {}), marks = el('g', {});
  svg.append(layers, marks);
  function render() {
    layers.replaceChildren();
    layers.append(el('rect', { class: 'frame', x: 0, y: -Y, width: 1, height: 2 * Y }));
    layers.append(el('line', { class: 'chord', x1: 0, y1: 0, x2: 1, y2: 0 }));
    const f = curveFunction(state.edge.points, spec);
    const n = 96, d = [], b = [];
    const bow = model ? model.bow : 0;
    for (let k = 0; k <= n; k++) { const u = k / n, y = f(u) ?? 0; d.push(`${k ? 'L' : 'M'}${u.toFixed(4)} ${(-y).toFixed(4)}`); b.push(`${k ? 'L' : 'M'}${u.toFixed(4)} ${(-(y + bow * Math.sin(Math.PI * u))).toFixed(4)}`); }
    if (bow > 0.002) layers.append(el('path', { class: 'bow', d: b.join(' ') }));
    layers.append(el('path', { class: 'curve', d: d.join(' ') }));
    const label = (attrs, text) => { const t = el('text', { class: 'lbl', 'font-size': 0.03, ...attrs }); t.textContent = text; layers.append(t); };
    label({ x: 0.01, y: Y - 0.015 }, 'tip');
    label({ x: 0.99, y: Y - 0.015, 'text-anchor': 'end' }, 'inner vertex');
    label({ x: 0.5, y: -Y + 0.035, 'text-anchor': 'middle' }, 'outward ↑');
    const pts = state.edge.points, have = [...marks.children];
    pts.forEach((p, i) => {
      const c = have[i] || marks.appendChild(document.createElementNS(NS, 'circle'));
      const lock = i === 0 || i === pts.length - 1;
      const attrs = { class: 'pt' + (lock ? ' is-lock' : '') + (i === focus ? ' is-focus' : ''), 'data-i': i, cx: p[0], cy: -p[1], r: HANDLE };
      for (const [k, v] of Object.entries(attrs)) if (c.getAttribute(k) !== String(v)) c.setAttribute(k, v);
    });
    for (let k = pts.length; k < have.length; k++) have[k].remove();
    status.hidden = !refusal; status.textContent = refusal ? `refused — ${refusal}` : '';
  }
  const handleAt = (cx, cy) => { let best = null; state.edge.points.forEach((p, i) => { const q = toClient(p), dd = Math.hypot(q.x - cx, q.y - cy); if (dd <= 11 && (!best || dd < best.d)) best = { i, d: dd }; }); return best; };
  function edit(op, { during = false } = {}) {
    const r = proposeEdit(state.edge, spec, null, op);
    if (!r.accepted) { refusal = r.reason; counts.refused++; render(); return false; }
    if (r.unchanged) return true;
    refusal = null; stats.edits++;
    const prev = { ...state, edge: cloneCurve(state.edge) };
    state.edge = r.value;
    // an edit on a quick mode's curve makes it custom, unless the quick mode still reproduces it
    const quick = G.edgeCurveFor(state.edgeMode, state);
    if (!quick || !curveEquals(quick, state.edge)) state.edgeMode = 'custom';
    counts.input++;
    if (!during) { counts.change++; pushHistory(prev); }
    rebuild({ commit: !during });
    return true;
  }
  const q = (xy) => [quantise(Math.min(1, Math.max(0, xy[0]))), quantise(Math.min(Y, Math.max(-Y, xy[1])))];
  svg.addEventListener('mousedown', (ev) => { if (ev.button === 0 && handleAt(ev.clientX, ev.clientY)) ev.preventDefault(); });
  svg.addEventListener('pointerdown', (ev) => {
    const h = ev.button === 0 ? handleAt(ev.clientX, ev.clientY) : null; if (!h) return;
    focus = h.i; drag = { i: h.i, id: ev.pointerId, moved: false }; svg.setPointerCapture(ev.pointerId); render();
  });
  svg.addEventListener('pointermove', (ev) => {
    if (!drag || ev.pointerId !== drag.id) return;
    const v = toVb(ev.clientX, ev.clientY); if (!v) return;
    drag.moved = true;
    edit({ op: 'move', side: 'left', i: drag.i, xy: q([v.x, -v.y]) }, { during: true });
  });
  const endDrag = (ev) => { if (!drag || ev.pointerId !== drag.id) return; const moved = drag.moved; drag = null; if (moved) { counts.change++; pushHistory(JSON.parse(history.lastDragStart || snap(state))); rebuild({ commit: true }); } };
  svg.addEventListener('pointerdown', () => { history.lastDragStart = snap(state); }, { capture: true });
  svg.addEventListener('pointerup', endDrag); svg.addEventListener('pointercancel', endDrag);
  svg.addEventListener('dblclick', (ev) => {
    const h = handleAt(ev.clientX, ev.clientY);
    if (h) { if (h.i === 0 || h.i === state.edge.points.length - 1) return; edit({ op: 'remove', side: 'left', i: h.i }); return; }
    const v = toVb(ev.clientX, ev.clientY); if (!v) return;
    const near = nearestOnCurve(state.edge, spec, 'left', [v.x, -v.y], [1, 1]);
    if (near && near.d < 0.06) edit({ op: 'insert', side: 'left', after: near.span, xy: q([near.at[0], near.at[1]]) });
  });
  return { render, counts, svg, pointScreen: (i) => { const p = state.edge.points[i]; const c = toClient(p); return [c.x, c.y]; }, curveScreen: (u) => { const f = curveFunction(state.edge.points, spec); const c = toClient([u, f(u) ?? 0]); return [c.x, c.y]; } };
})();
function drawEditor() { editor.render(); }

/* ---------------- presets, modes, views ---------------- */
function thumb(st) {
  const m = G.solveLantern(st), h = G.halfOutline(m, 'front');
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of h.outline) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const s = 50 / Math.max(x1 - x0, y1 - y0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const step = Math.max(1, Math.floor(h.outline.length / 240));
  const pts = h.outline.filter((_, i) => i % step === 0);
  return `<svg viewBox="0 0 56 56"><path d="M${pts.map(([x, y]) => `${(28 + s * (x - cx)).toFixed(1)},${(28 - s * (y - cy)).toFixed(1)}`).join('L')}Z"/></svg>`;
}
function buildPresets() {
  const host = $('shapePresets');
  for (const p of G.SHAPE_PRESETS) {
    const b = document.createElement('button'); b.className = 'ln-preset'; b.dataset.preset = p.id; b.title = p.name; b.innerHTML = `<svg viewBox="0 0 56 56"></svg>${p.name}`;
    b.addEventListener('click', () => applyPreset(p));
    host.append(b);
  }
  // thumbnails after first paint (ten solves)
  setTimeout(() => { for (const b of host.children) { const p = G.SHAPE_PRESETS.find((q) => q.id === b.dataset.preset); b.querySelector('svg').outerHTML = thumb(G.presetState(p)); } thumbsReady = true; }, 60);
}
let thumbsReady = false;
function patternThumb(p) {
  const m = G.solveLantern({ ...G.DEFAULTS, ...PAT.PATTERN_STATE_DEFAULTS, ...p.state, points: 6, slender: 0.5, depthFrac: 0.4 });
  const t = m.facets[0]; const st = { ...PAT.PATTERN_STATE_DEFAULTS, ...p.state };
  const lay = st.patMode === 'none' ? { placed: [] } : PAT.layoutFacet(t, PAT.patternOf(st), rules);
  const cuts = PAT.taggedCuts(lay.placed);
  // a square crop of the facet's middle, both halves, scaled to fill the box — a whole facet at 56 px is a sliver nobody can read
  const F = PAT.facetField(t, rules), x0 = F.xMin + (F.xMax - F.xMin) * 0.3, half = Math.max(F.yHi(x0), 6);
  const s = 56 / (2 * half), x1 = x0 + 2 * half;
  const PT = (q, side) => `${(s * (q[0] - x0)).toFixed(1)},${(28 - s * side * q[1]).toFixed(1)}`;
  return `<svg viewBox="0 0 56 56"><rect width="56" height="56" style="fill:rgba(237,237,232,.14)"/>${[1, -1].map((side) => cuts.filter((c) => c.poly.some((q) => q[0] > x0 - 5 && q[0] < x1 + 5)).map((c) => `<path d="M${c.poly.map((q) => PT(q, side)).join('L')}Z" style="fill:var(--ink);stroke:none"/>`).join('')).join('')}</svg>`;
}
function buildPatternPresets() {
  const host = $('patternPresets');
  for (const p of PAT.PATTERN_PRESETS) {
    const b = document.createElement('button'); b.className = 'ln-preset ln-thumb--pat'; b.dataset.preset = p.id; b.title = p.name; b.innerHTML = `<svg viewBox="0 0 56 56"></svg>${p.name}`;
    b.addEventListener('click', () => applyPatternPreset(p));
    host.append(b);
  }
  setTimeout(() => { for (const b of host.children) { const p = PAT.PATTERN_PRESETS.find((q) => q.id === b.dataset.preset); b.querySelector('svg').outerHTML = patternThumb(p); } patThumbsReady = true; }, 120);
}
let patThumbsReady = false;
function buildEdgeModes() {
  const host = $('edgeModes');
  for (const m of G.EDGE_MODES) { const b = document.createElement('button'); b.className = 'ln-btn ln-btn--sm'; b.dataset.mode = m; b.textContent = m; if (m === 'custom') b.title = 'what a dragged point makes'; b.addEventListener('click', () => { if (m !== 'custom') setEdgeMode(m); }); host.append(b); }
}
const fold = createFoldedView($('foldCanvas'));
function setView(name) {
  view = name;
  for (const b of $('views').children) b.classList.toggle('is-on', b.dataset.view === name);
  $('flatSvg').toggleAttribute('hidden', name !== 'flat');
  $('foldCanvas').toggleAttribute('hidden', name !== 'folded');
  $('buildView').toggleAttribute('hidden', name !== 'build');
  $('previewLabel').textContent = name === 'flat' ? 'Flat — the cut file' : name === 'build' ? 'Build — the instructions' : 'Folded';
  $('previewHint').textContent = name === 'flat' ? 'one half, as it is cut: creases as the file carries them' : name === 'build' ? 'the same steps go into the PDF, with the counts of this star' : 'drag to turn · scroll to zoom · it turns on its own when left alone';
  if (name === 'folded') { fold.start(); pushMesh(); } else if (name === 'flat') { fold.stop(); drawFlat(); } else { fold.stop(); drawBuild(); }
}
for (const b of $('views').children) b.addEventListener('click', () => setView(b.dataset.view));
flatSvg.addEventListener('click', () => { if (flatFocus) { flatFocus = null; drawFlat(); } });

/* ---------------- exports ---------------- */
function download(name, text, type = 'image/svg+xml') {
  const blob = new Blob([text], { type }), url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const stamp = () => `lantern-${state.points}pt-${state.width}mm`;
const exportSvg = (which) => G.flatSvg(model, which, { cuts: state.patMode === 'none' ? [] : PAT.placeCuts(model, pattern, state).map((c) => c.poly) });
const exportNote = (text) => { const pc = pattern ? pattern.counts : null; const open = pc ? pc.island + pc.thin + pc.narrow + pc.keepout : 0; return open ? `${text} WARNING: ${open} open cut finding${open > 1 ? 's' : ''} per facet (see Checks) — the file is written as is.` : text; };
$('svgFront').addEventListener('click', () => { download(`${stamp()}-front.svg`, exportSvg('front')); $('exportMsg').textContent = exportNote('front half written: one sheet, layers CUT / SCORE / PERF. Phase 3 nests modules to a bed.'); });
$('svgBack').addEventListener('click', () => { download(`${stamp()}-back.svg`, exportSvg('back')); $('exportMsg').textContent = exportNote('back half written: the opening, the ring beside it.'); });
$('saveDesign').addEventListener('click', () => { download(`${stamp()}.json`, G.serializeDesign(state), 'application/json'); $('designMsg').textContent = 'design saved.'; });
$('openDesign').addEventListener('change', async (ev) => {
  const f = ev.target.files && ev.target.files[0]; if (!f) return;
  const r = G.readDesign(await f.text(), state);
  if (!r.ok) { $('designMsg').textContent = r.notes.join('; '); $('designMsg').classList.add('is-bad'); return; }
  $('designMsg').classList.remove('is-bad');
  const prev = { ...state, edge: cloneCurve(state.edge) };
  state = r.state; pushHistory(prev); rebuild({ commit: true });
  $('designMsg').textContent = r.notes.length ? `opened with notes: ${r.notes.join('; ')}` : 'opened — a clean read, nothing reported.';
  ev.target.value = '';
});
/* the cut files: every sheet as an SVG, the README and the design JSON, zipped; JSZip is loaded on the first click (cards.html's pin) */
let jszipLoading = null;
function loadJsZip() { if (window.JSZip) return Promise.resolve(window.JSZip); if (!jszipLoading) jszipLoading = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; sc.onload = () => res(window.JSZip); sc.onerror = () => { jszipLoading = null; rej(new Error('JSZip did not load')); }; document.head.append(sc); }); return jszipLoading; }
function sheetSvgs() { return plan.sheets.map((sh, k) => { sh.machine = plan.machine; return { name: `${stamp()}-sheet-${k + 1}-of-${plan.sheets.length}.svg`, text: EXP.sheetSvg(sh, k, plan.sheets.length, { stamp: stamp() }) }; }); }
async function exportZip() {
  const btn = $('exportZip'); btn.disabled = true;
  try {
    const JSZip = await loadJsZip();
    const zip = new JSZip();
    for (const f of sheetSvgs()) zip.file(f.name, f.text);
    plan.backingSheets.forEach((sh, k) => { sh.machine = plan.machine; zip.file(`${stamp()}-backing-${k + 1}-of-${plan.backingSheets.length}.svg`, EXP.sheetSvg(sh, k, plan.backingSheets.length, { stamp: `${stamp()} tissue backing (cut from the tissue, colour per label: ${BLD.paletteOf(state).colours.slice(0, state.backingColours).join(' / ')})` })); });
    zip.file(`${stamp()}-test-grid.svg`, BLD.testGridSvg(rules, { stamp: stamp() }));
    zip.file(`${stamp()}-coupon.svg`, couponSvg());
    zip.file('INSTRUCTIONS.txt', BLD.instructionsText(plan.steps, model));
    zip.file('README.txt', EXP.readme(model, plan, state, rules));
    zip.file(`${stamp()}.json`, G.serializeDesign(state));
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${stamp()}-cut-files.zip`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    $('exportMsg').textContent = exportNote(`${plan.sheets.length} sheet${plan.sheets.length > 1 ? 's' : ''} for the ${plan.bed.name.split(' — ')[0]} bed, a README and the design, zipped.${plan.fitsBed ? '' : ' A piece does not fit the bed — see Checks.'}`);
  } catch (e) { $('exportMsg').textContent = `the zip could not be written: ${e.message}`; }
  btn.disabled = false;
}
function exportPng() {
  if (view !== 'folded') setView('folded');
  fold.renderOnce();
  $('foldCanvas').toBlob((blob) => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${stamp()}.png`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); $('exportMsg').textContent = 'the folded view written as a PNG, at the canvas\'s own size.'; });
}
/* the coupon: one front point module, alone on the bed */
function couponSvg() {
  const mods = EXP.modulePieces(model, pattern, state, 'front', rules);
  const sh = EXP.nest(BLD.couponPieces(mods), plan.bed)[0]; sh.machine = plan.machine;
  return EXP.sheetSvg(sh, 0, 1, { stamp: `${stamp()} coupon — one point` });
}
let jspdfLoading = null;
function loadJsPdf() { if (window.jspdf) return Promise.resolve(window.jspdf); if (!jspdfLoading) jspdfLoading = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'; sc.onload = () => res(window.jspdf); sc.onerror = () => { jspdfLoading = null; rej(new Error('jsPDF did not load')); }; document.head.append(sc); }); return jspdfLoading; }
async function exportPdf() {
  try {
    const { jsPDF } = await loadJsPdf();
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, M = 18; let y = 22;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text(`${model.N}-point paper star lantern — assembly`, M, y); y += 8;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(90);
    doc.text(`${model.width.toFixed(0)} mm wide, ${model.depth.toFixed(0)} mm deep · ${state.material} · ${plan.machine.name} · ${plan.pieces.length} pieces on ${plan.sheets.length} sheet${plan.sheets.length > 1 ? 's' : ''}${plan.backing.length ? ` · ${plan.backing.length} tissue pieces` : ''}`, M, y); y += 10;
    doc.setTextColor(20);
    plan.steps.forEach((st, i) => {
      const lines = doc.splitTextToSize(st.text, W - 2 * M - 10);
      if (y + 6 + lines.length * 5 > 282) { doc.addPage(); y = 22; }
      doc.setFont('helvetica', 'bold'); doc.text(`${i + 1}. ${st.title}`, M, y); y += 5.5;
      doc.setFont('helvetica', 'normal'); doc.text(lines, M + 6, y); y += lines.length * 5 + 3;
    });
    if (y + 40 > 282) { doc.addPage(); y = 22; }
    doc.setFont('helvetica', 'bold'); doc.text('Machine settings — starting values for a power test', M, y); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
    for (const r of BLD.settingsTable(plan.machine, rules)) { doc.text(`${r.layer}: ${r.setting} — ${r.note}`, M, y); y += 5; }
    y += 4; doc.setFont('helvetica', 'bold'); doc.setTextColor(170, 60, 40); doc.text('LED light only. Never an incandescent or halogen bulb in a paper lantern.', M, y);
    doc.save(`${stamp()}-instructions.pdf`);
    $('exportMsg').textContent = `instructions written: ${plan.steps.length} steps and the settings, A4.`;
  } catch (e) { $('exportMsg').textContent = `the PDF could not be written: ${e.message}`; }
}
$('testGrid').addEventListener('click', () => { download(`${stamp()}-test-grid.svg`, BLD.testGridSvg(rules, { stamp: stamp() })); $('exportMsg').textContent = 'the test grid written — cut it on your stock first, weed it, and keep the narrowest that survived.'; });
$('coupon').addEventListener('click', () => { download(`${stamp()}-coupon.svg`, couponSvg()); $('exportMsg').textContent = 'the coupon written: one point of this star, as it will cut.'; });
$('instructionsPdf').addEventListener('click', exportPdf);
$('exportZip').addEventListener('click', exportZip);
$('exportPng').addEventListener('click', exportPng);
$('randomPattern').addEventListener('click', randomPattern);
$('patReseed').addEventListener('click', reseedPattern);
$('undo').addEventListener('click', undo); $('redo').addEventListener('click', redo);
$('resetAll').addEventListener('click', () => { const prev = { ...state, edge: cloneCurve(state.edge) }; state = { ...G.DEFAULTS, ...PAT.PATTERN_STATE_DEFAULTS, ...MAT.EXPORT_STATE_DEFAULTS, ...BLD.BACKING_STATE_DEFAULTS, edge: cloneCurve(G.DEFAULTS.edge) }; pushHistory(prev); rebuild({ commit: true }); });
$('randomShape').addEventListener('click', () => { const prev = { ...state, edge: cloneCurve(state.edge) }; const seed = (Math.random() * 2 ** 31) >>> 0; const st = G.randomShape(seed); state = { ...state, ...st, width: state.width }; pushHistory(prev); $('presetNote').textContent = `random #${seed.toString(36)}`; rebuild({ commit: true }); });
document.addEventListener('keydown', (ev) => {
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') { ev.preventDefault(); if (ev.shiftKey) redo(); else undo(); }
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'y') { ev.preventDefault(); redo(); }
});

/* ---------------- boot ---------------- */
for (const c of CONTROLS) makeControl(c);
buildPresets(); buildEdgeModes(); buildPatternPresets();
try { const saved = localStorage.getItem(STORE); if (saved) { const r = G.readDesign({ format: G.DESIGN_FORMAT, version: G.DESIGN_VERSION, state: JSON.parse(saved) }, state); if (r.ok) state = r.state; } } catch { /* a bad save is ignored */ }
new ResizeObserver(() => { fold.resize(); if (view === 'flat' && model) drawFlat(); }).observe($('foldCanvas').parentElement);
rebuildNow({ commit: false });
setView('folded');

/* the page's test chrome */
window.__lantern = {
  state: () => JSON.parse(snap(state)), model: () => model, stats,
  setState: (partial) => { const prev = { ...state, edge: cloneCurve(state.edge) }; state = { ...state, ...partial }; if (partial.edge) state.edge = cloneCurve(partial.edge); pushHistory(prev); rebuildNow({ commit: true }); },
  set: (id, v) => { const el = $(id); if (!el) throw new Error(`no control ${id}`); if (el.type === 'checkbox') { el.checked = !!v; el.dispatchEvent(new Event('change', { bubbles: true })); } else { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } rebuildNow({ commit: true }); },
  flush: () => { if (pending) { cancelAnimationFrame(pending); pending = 0; rebuildNow({ commit: true }); } return true; },
  view: (n) => { if (n) setView(n); return view; },
  edgeMode: (m) => setEdgeMode(m),
  preset: (id) => applyPreset(G.SHAPE_PRESETS.find((p) => p.id === id)),
  presetIds: () => G.SHAPE_PRESETS.map((p) => p.id), thumbsReady: () => thumbsReady,
  editor: { pointScreen: editor.pointScreen, curveScreen: editor.curveScreen, counts: editor.counts },
  history: () => ({ past: history.past.length, future: history.future.length }), undo, redo,
  flatCounts: () => ({ outline: flatSvg.querySelectorAll('.outline').length, tabs: flatSvg.querySelectorAll('.tab').length, mountain: flatSvg.querySelectorAll('.mountain').length, valley: flatSvg.querySelectorAll('.valley').length, holes: flatSvg.querySelectorAll('.hole').length, ring: flatSvg.querySelectorAll('.ring').length }),
  svgText: (which) => exportSvg(which), design: () => G.serializeDesign(state),
  fold: { frames: () => fold.frames, triangles: () => fold.triangles, camera: fold.camera, lookAt: fold.lookAt, pixel: fold.pixel, running: fold.isRunning, renderOnce: fold.renderOnce, materials: fold.materials },
  flags: () => [...document.querySelectorAll('#flags li')].map((li) => ({ kind: li.className, id: li.dataset.flag || 'ok', text: li.textContent })),
  dimsText: () => $('dims').textContent,
  random: () => lastRandom && { draws: lastRandom.draws.map((d) => ({ counts: { ...d.counts } })), picked: lastRandom.picked },
  pattern: () => pattern && { counts: { ...pattern.counts }, bridged: pattern.bridged, validated: pattern.validated, cuts: pattern.types.map((t) => t.cuts.length), issues: pattern.issues.length },
  placedCuts: () => PAT.placeCuts(model, pattern, state).length,
  focusIssue, flatFocus: () => flatFocus,
  patternPreset: (id) => applyPatternPreset(PAT.PATTERN_PRESETS.find((p) => p.id === id)), patternPresetIds: () => PAT.PATTERN_PRESETS.map((p) => p.id), patThumbsReady: () => patThumbsReady,
  randomPattern, reseedPattern,
  textures: () => [...textureCache.values()].map((c) => ({ w: c.width, h: c.height })),
  rules: () => ({ ...rules }), plan: () => plan && { split: plan.split, sheets: plan.sheets.length, pieces: plan.pieces.length, fitsBed: plan.fitsBed, bed: plan.bed.id, notes: plan.notes.map((n) => n.id) },
  sheetSvgs: () => sheetSvgs().map((f) => ({ name: f.name, paths: (f.text.match(/<path/g) || []).length })), readme: () => EXP.readme(model, plan, state, rules),
  rulesText: () => $('rulesOut').textContent, planText: () => $('planOut').textContent,
  steps: () => plan.steps.map((st) => st.title), backingPieces: () => plan.backing.length, backingSheets: () => plan.backingSheets.length, buildText: () => $('buildView').textContent,
  testGridSvg: () => BLD.testGridSvg(rules, { stamp: stamp() }), couponSvg,
};
