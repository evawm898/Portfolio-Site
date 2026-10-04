/* marble.js — the /marble page. The sheet's state is REPLAY of an op list and
   nothing else: the page keeps the committed op groups, mirrors them into the
   URL hash (one decimal per number, rounded BEFORE the op is applied, so the
   link replays the very doubles the page used), and draws marble-math.js's
   state on a canvas. A pointer gesture builds an op, PREVIEWS it against the
   committed state every frame (plain mapping, no refinement — cheap), and
   commits it on release through the one path everything else uses. Undo pops a
   whole group (a pattern is one group); recent states are kept as snapshots
   because the engine never mutates a state, so a snapshot is a reference.

   LAYERS (the realism session): a document is up to MAX_LAYERS layers of op
   groups. The LAST is the live bath — the one every tool works in; the earlier
   ones are PRINTED pulls, frozen states that never change again. "Pull &
   re-marble" freezes the bath as a printed layer and opens a fresh one; undo on
   an empty bath un-pulls. Two VIEWS: the BATH (dark water, the live ink on it)
   while working, and the PAPER (every layer multiplied onto the paper preset
   with its texture, mottle, granulation and transfer flaws) behind "Lay paper".
   A gesture always returns the page to the bath. Per-ink properties are kept
   per colour and written into every drop, so the hash carries them. */

import * as M from './marble-math.js';
import * as T from './marble-material.js';
import * as R from './marble-render.js';

const SITE_COLORS = [['ink', '#0A0A0C'], ['teal', '#5FA0A0'], ['paper', '#EDEDE8'], ['amber', '#D6A15C'], ['dim', '#8A8A85'], ['rust', '#D98F6A'], ['red', '#E5484D']];
const SHEET_CHOICES = [['paper', '#EDEDE8'], ['ink', '#0A0A0C'], ['teal', '#5FA0A0'], ['dim', '#8A8A85']];
const DEFAULT_SHEET = '#EDEDE8';
const TOOLS = ['drop', 'tine', 'comb', 'wavy', 'stir'];
const HINTS = {
  drop: 'click to drop ink · hold to let it grow',
  tine: 'drag to draw one tine line — the shift is along the drag',
  comb: 'drag to rake a comb of parallel tines across the sheet',
  wavy: 'drag to rake a comb whose tines follow a sine',
  stir: 'press at the centre and move round it — the sweep sets the turn',
};
/* settings: one row each, with the tools that read it */
export const SETTINGS = [
  { id: 'dropRadius', label: 'Drop radius', min: 8, max: 120, step: 1, default: 36, unit: '', tools: ['drop'] },
  { id: 'growRate', label: 'Growth while held', min: 0, max: 150, step: 1, default: 45, unit: '/s', tools: ['drop'] },
  { id: 'strength', label: 'Strength', min: 0.1, max: 1.5, step: 0.05, default: 0.6, unit: '× drag', tools: ['tine', 'comb', 'wavy', 'stir'] },
  { id: 'falloff', label: 'Falloff (shift halves every)', min: 4, max: 120, step: 1, default: 24, unit: '', tools: ['tine', 'comb', 'wavy', 'stir'] },
  { id: 'combTines', label: 'Tines', min: 2, max: 40, step: 1, default: 8, unit: '', tools: ['comb', 'wavy'] },
  { id: 'combSpacing', label: 'Spacing', min: 8, max: 200, step: 1, default: 40, unit: '', tools: ['comb', 'wavy'] },
  { id: 'waveAmp', label: 'Wave amplitude', min: 0, max: 120, step: 1, default: 30, unit: '', tools: ['wavy'] },
  { id: 'waveLength', label: 'Wavelength', min: 40, max: 600, step: 1, default: 220, unit: '', tools: ['wavy'] },
];
/* the ink's own properties: per colour, written into every drop of that colour */
export const INK_SETTINGS = [
  { id: 'conc', label: 'Concentration', min: M.INK_RANGES.conc[0], max: M.INK_RANGES.conc[1], step: 0.05, default: M.INK_DEFAULTS.conc, hint: 'how strong the ink reads before it spreads; a spread-out region goes paler by its area' },
  { id: 'opa', label: 'Opacity', min: M.INK_RANGES.opa[0], max: M.INK_RANGES.opa[1], step: 0.05, default: M.INK_DEFAULTS.opa, hint: 'how much the paper shows through' },
  { id: 'gall', label: 'Spread (gall)', min: M.INK_RANGES.gall[0], max: M.INK_RANGES.gall[1], step: 0.05, default: M.INK_DEFAULTS.gall, hint: 'surfactant: a wider push and a paler film from the same ink' },
  { id: 'gran', label: 'Granulation', min: M.INK_RANGES.gran[0], max: M.INK_RANGES.gran[1], step: 0.05, default: M.INK_DEFAULTS.gran, hint: 'pigment that settles as specks on the paper' },
];
const MAX_Z = 1500, MAX_SWEEP = 3 * 2 * Math.PI, STIR_MIN_R = 10;
const SNAPSHOTS = 8;
const LAY_MS = 320;

/* ---------------- state ---------------- */
let sheet = DEFAULT_SHEET;
let material = M.roundMaterial();
let layers = [[]];        // op groups per layer; the LAST is the live bath
let printed = [];         // frozen states of the printed layers (layers.length - 1 of them)
let redoStack = [];       // undone actions, newest last: { t: 'g', ops } | { t: 'pull' } | { t: 'restore', layers, printed }
let state = M.emptyState(sheet);   // the live bath
let snaps = [];           // [{ count, state }] for the live bath's last SNAPSHOTS group counts
let tool = 'drop';
const settings = Object.fromEntries(SETTINGS.map((s) => [s.id, s.default]));
let color = SITE_COLORS[0][1];
let customColors = [];
let inkProps = {};        // colour hex → { conc, opa, gall, gran }
let autoAdvance = true;
let preview = null;       // { op, state } while a gesture is live
let gesture = null;
let view = 'bath';        // 'bath' | 'paper'
let lay = { t: 0, from: 0, to: 0, t0: 0 };   // the view blend: 0 bath, 1 paper
const stats = { lastOpMs: 0, frameMs: 0, previewMs: 0, replayMs: 0, paperMs: 0 };
const groups = () => layers[layers.length - 1];

try { customColors = JSON.parse(localStorage.getItem('marble.customColors') || '[]').map(M.normHex); } catch { customColors = []; }
try { const p = JSON.parse(localStorage.getItem('marble.inkProps') || '{}'); for (const [k, v] of Object.entries(p)) inkProps[M.normHex(k)] = { ...M.INK_DEFAULTS, ...v }; } catch { inkProps = {}; }
const inkFor = (hex) => inkProps[hex] || { ...M.INK_DEFAULTS };
const withInk = (ops) => ops.map((op) => (op.k === 'd' ? { ...inkFor(M.normHex(op.color)), ...op } : op));

/* ---------------- canvas ---------------- */
const canvas = document.getElementById('sheet');
const ctx = canvas.getContext('2d');
let view2 = { css: 0, scale: 1, dpr: 1 };
let bathCanvas = null, paperCanvas = null;
const paperCache = R.makeCache();
let paperDirty = true;
function fitSheet() {
  const stage = document.getElementById('stage');
  const cs = getComputedStyle(stage);
  const w = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const h = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const scale = Math.max(0.05, Math.min(w / M.SHEET.w, h / M.SHEET.h));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cw = Math.round(M.SHEET.w * scale), ch = Math.round(M.SHEET.h * scale);
  canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
  canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
  view2 = { css: cw, scale: cw / M.SHEET.w, dpr };
  bathCanvas = document.createElement('canvas'); bathCanvas.width = canvas.width; bathCanvas.height = canvas.height;
  paperCanvas = document.createElement('canvas'); paperCanvas.width = canvas.width; paperCanvas.height = canvas.height;
  paperDirty = true;
  render();
}
const docStates = () => [...printed, state];
function renderPaperCanvas() {
  const t = performance.now();
  const pc = paperCanvas.getContext('2d');
  pc.setTransform(1, 0, 0, 1, 0, 0); pc.clearRect(0, 0, paperCanvas.width, paperCanvas.height);
  R.renderPaper(pc, { sheet, material, states: docStates() }, view2.scale * view2.dpr, paperCache);
  stats.paperMs = performance.now() - t;
  paperDirty = false;
}
function render() {
  const t = performance.now();
  const st = preview ? preview.state : state;
  const bc = bathCanvas.getContext('2d');
  bc.setTransform(1, 0, 0, 1, 0, 0); bc.clearRect(0, 0, bathCanvas.width, bathCanvas.height);
  R.renderBath(bc, st, view2.scale * view2.dpr);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bathCanvas, 0, 0);
  if (lay.t > 0) {
    if (paperDirty) renderPaperCanvas();
    ctx.globalAlpha = lay.t; ctx.drawImage(paperCanvas, 0, 0); ctx.globalAlpha = 1;
  }
  if (preview) drawGuide(preview.op);
  stats.frameMs = performance.now() - t;
}
/* the gesture's own guide: the tine lines a comb will rake along, the stir ring */
function drawGuide(op) {
  const k = view2.scale * view2.dpr;
  ctx.save(); ctx.scale(k, k);
  ctx.strokeStyle = 'rgba(95,160,160,0.9)'; ctx.lineWidth = 1 / k; ctx.setLineDash([4 / k, 4 / k]);
  if (op.k === 't' || op.k === 'k' || op.k === 'w') {
    const [mx, my] = M.unitDir(op.x0, op.y0, op.x1, op.y1), nx = -my, ny = mx;
    const offs = op.k === 't' ? [0] : M.combOffsets(op.n, op.s);
    const span = M.SHEET.w + M.SHEET.h;
    for (const off of offs) {
      ctx.beginPath();
      if (op.k === 'w') {
        const phi = op.phi * Math.PI / 180;
        for (let i = 0; i <= 160; i++) {
          const a = -span + 2 * span * i / 160, n = off + op.A * Math.sin(2 * Math.PI * a / op.L + phi);
          const x = op.x0 + mx * a + nx * n, y = op.y0 + my * a + ny * n;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
      } else {
        ctx.moveTo(op.x0 + nx * off - mx * span, op.y0 + ny * off - my * span);
        ctx.lineTo(op.x0 + nx * off + mx * span, op.y0 + ny * off + my * span);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]); ctx.lineWidth = 2 / k;
    ctx.beginPath(); ctx.moveTo(op.x0, op.y0); ctx.lineTo(op.x1, op.y1); ctx.stroke();
  } else if (op.k === 's') {
    ctx.beginPath(); ctx.arc(op.x, op.y, op.r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

/* ---------------- views ---------------- */
let layRaf = 0;
function setView(v, instant = false) {
  if (view === v && !layRaf) return;
  view = v;
  const to = v === 'paper' ? 1 : 0;
  if (instant) { lay = { t: to, from: to, to, t0: 0 }; if (layRaf) { cancelAnimationFrame(layRaf); layRaf = 0; } render(); writeViewUi(); return; }
  lay = { t: lay.t, from: lay.t, to, t0: performance.now() };
  if (to === 1 && paperDirty) renderPaperCanvas();
  if (!layRaf) layRaf = requestAnimationFrame(tickLay);
  writeViewUi();
}
function tickLay() {
  layRaf = 0;
  const u = Math.min(1, (performance.now() - lay.t0) / LAY_MS);
  const e = u * u * (3 - 2 * u);
  lay.t = lay.from + (lay.to - lay.from) * e;
  render();
  if (u < 1) layRaf = requestAnimationFrame(tickLay); else { lay.t = lay.to; render(); }
}
function writeViewUi() {
  const b = document.getElementById('layBtn');
  b.textContent = view === 'paper' ? 'Back to the bath' : 'Lay paper';
  b.classList.toggle('is-on', view === 'paper');
  document.getElementById('viewTag').textContent = view === 'paper' ? 'paper' : 'bath';
  canvas.classList.toggle('is-paper', view === 'paper');
}

/* ---------------- commits, history, hash ---------------- */
function rotation() {
  const list = [...SITE_COLORS.map((c) => c[1]), ...customColors].filter((c) => c !== sheet);
  return list.length ? list : [SITE_COLORS[0][1]];
}
function rotationFromCurrent() {
  const r = rotation(); const i = Math.max(0, r.indexOf(color));
  return [...r.slice(i), ...r.slice(0, i)];
}
function advanceColour() {
  const r = rotation(); const i = r.indexOf(color);
  color = r[(i + 1) % r.length];
  drawSwatches();
}
function applyGroup(ops) {
  const t = performance.now();
  const rounded = withInk(ops).map(M.roundOp);
  for (const op of rounded) state = M.applyOp(state, op);
  stats.lastOpMs = performance.now() - t;
  groups().push(rounded);
  redoStack = [];
  snapshot();
  afterChange();
  return rounded;
}
function snapshot() {
  snaps.push({ count: groups().length, state });
  if (snaps.length > SNAPSHOTS) snaps.shift();
}
function stateAt(count) {
  const s = snaps.find((q) => q.count === count);
  if (s) return s.state;
  const t = performance.now();
  const st = M.replay(groups().slice(0, count).flat(), sheet);
  stats.replayMs = performance.now() - t;
  return st;
}
function undo() {
  if (gesture) return;
  if (groups().length) {
    redoStack.push({ t: 'g', ops: groups().pop() });
    snaps = snaps.filter((q) => q.count <= groups().length);
    state = stateAt(groups().length);
  } else if (layers.length > 1) {
    // an empty bath over a pull: un-pull — the last printed layer is the bath again
    layers.pop(); state = printed.pop(); snaps = [{ count: groups().length, state }];
    redoStack.push({ t: 'pull' });
  } else return;
  afterChange();
}
function redo() {
  if (!redoStack.length || gesture) return;
  const a = redoStack.pop();
  if (a.t === 'g') { for (const op of a.ops) state = M.applyOp(state, op); groups().push(a.ops); snapshot(); }
  else if (a.t === 'pull') { if (!pull(false)) { redoStack.push(a); return; } }
  else if (a.t === 'restore') { layers = a.layers; printed = a.printed; state = a.state; snaps = [{ count: groups().length, state }]; }
  afterChange();
}
function clearSheet() {
  if (gesture) return;
  if (layers.flat().length || layers.length > 1) redoStack.push({ t: 'restore', layers, printed, state });
  layers = [[]]; printed = []; snaps = []; state = M.emptyState(sheet);
  afterChange();
}
/* Pull & re-marble: the bath is printed as a layer and a fresh bath is opened */
function pull(say_ = true) {
  if (gesture) return false;
  if (!state.regions.length) { if (say_) say('nothing in the bath to pull — drop some ink first', true); return false; }
  if (layers.length >= M.MAX_LAYERS) { if (say_) say(`${M.MAX_LAYERS} layers is the most a sheet takes`, true); return false; }
  printed.push(state);
  layers.push([]);
  state = M.emptyState(sheet); snaps = [{ count: 0, state }];
  if (say_) { redoStack = []; say(`layer ${printed.length} printed — the bath is clear for the next pull`); }
  afterChange();
  return true;
}
function setSheet(hex) {
  sheet = M.normHex(hex);
  // the sheet colour is not an op: every state is re-coloured, no geometry moves
  state = { ...state, sheet };
  printed = printed.map((s) => ({ ...s, sheet }));
  snaps = snaps.map((q) => ({ count: q.count, state: { ...q.state, sheet } }));
  afterChange();
}
function setMaterial(m) {
  material = M.roundMaterial({ ...material, ...m });
  writeMaterialUi();
  afterChange();
}
function afterChange() {
  preview = null; paperDirty = true;
  writeHash(); render(); writeReadout(); drawSwatches();
  document.getElementById('undoBtn').disabled = !(groups().length || layers.length > 1);
  document.getElementById('redoBtn').disabled = !redoStack.length;
  document.getElementById('pullBtn').disabled = layers.length >= M.MAX_LAYERS || !state.regions.length;
  document.getElementById('layerTag').textContent = `layer ${layers.length} of ${M.MAX_LAYERS}${printed.length ? ` · ${printed.length} printed` : ''}`;
}
function currentHash() { return M.encodeDoc({ sheet, material, layers }); }
let lastWritten = '';
function writeHash() {
  const h = currentHash();
  lastWritten = h;
  history.replaceState(null, '', '#' + h);
}
function loadHash(h) {
  const d = M.decodeDoc(h);
  const t = performance.now();
  sheet = d.sheet; material = d.material; layers = d.layers; redoStack = []; snaps = [];
  printed = layers.slice(0, -1).map((gs) => M.replay(gs.flat(), sheet));
  state = M.replay(groups().flat(), sheet);
  stats.replayMs = performance.now() - t;
  snapshot();
  writeMaterialUi();
  afterChange();
}
window.addEventListener('hashchange', () => {
  const h = location.hash.replace(/^#/, '');
  if (h === lastWritten) return;
  try { loadHash(h); } catch (e) { say(`could not read that link: ${e.message}`, true); }
});

/* ---------------- gestures ---------------- */
function toSheet(e) {
  const r = canvas.getBoundingClientRect();
  return [(e.clientX - r.left) / r.width * M.SHEET.w, (e.clientY - r.top) / r.height * M.SHEET.h];
}
function previewOf(op, kind) {
  const t = performance.now();
  // a growing drop refines (the displacement next to it is large and its circle must read round);
  // a stroke previews as a plain map — every vertex moves, no vertex is added
  const st = kind === 'drop'
    ? M.applyOp(state, op, { maxSeg: M.MAX_SEG * 2, depthCap: 5, prune: false })
    : M.applyOp(state, op, { refine: false, prune: false });
  stats.previewMs = performance.now() - t;
  return st;
}
function strokeOp(g, x1, y1) {
  const len = Math.hypot(x1 - g.x0, y1 - g.y0);
  const z = Math.min(MAX_Z, settings.strength * len);
  const base = { x0: g.x0, y0: g.y0, x1, y1, z, c: settings.falloff };
  if (tool === 'tine') return { k: 't', ...base };
  if (tool === 'comb') return { k: 'k', ...base, n: settings.combTines, s: settings.combSpacing };
  return { k: 'w', ...base, n: settings.combTines, s: settings.combSpacing, A: settings.waveAmp, L: settings.waveLength, phi: 0 };
}
function stirOp(g) {
  const r = Math.max(STIR_MIN_R, g.rSum / Math.max(1, g.samples));
  let z;
  if (Math.abs(g.sweep) > 0.15) z = Math.max(-MAX_SWEEP, Math.min(MAX_SWEEP, g.sweep)) * r;
  else z = settings.strength * Math.hypot(g.lx - g.x0, g.ly - g.y0);   // a straight pull reads as a positive turn
  z = Math.max(-MAX_Z, Math.min(MAX_Z, z));
  return { k: 's', x: g.x0, y: g.y0, r, z, c: settings.falloff };
}
const dropOp = (x, y, r) => ({ k: 'd', x, y, r, color, ...inkFor(color) });
let raf = 0;
function schedulePreview() { if (!raf) raf = requestAnimationFrame(tickPreview); }
function tickPreview() {
  raf = 0;
  if (!gesture) return;
  let op;
  if (gesture.kind === 'drop') {
    const r0 = settings.dropRadius, cap = Math.min(300, r0 * 3);
    const r = Math.min(cap, r0 + settings.growRate * (performance.now() - gesture.t0) / 1000);
    op = dropOp(gesture.x0, gesture.y0, r);
    gesture.r = r;
    if (settings.growRate > 0 && r < cap) schedulePreview();
  } else if (gesture.kind === 'stir') op = stirOp(gesture);
  else op = strokeOp(gesture, gesture.lx, gesture.ly);
  gesture.op = op;
  preview = { op, state: previewOf(op, gesture.kind) };
  render();
}
canvas.addEventListener('pointerdown', (e) => {
  if (gesture || e.button !== 0) return;
  e.preventDefault();
  if (view === 'paper') setView('bath');      // work happens in the bath
  canvas.setPointerCapture(e.pointerId);
  const [x, y] = toSheet(e);
  gesture = { kind: tool, id: e.pointerId, x0: x, y0: y, lx: x, ly: y, t0: performance.now(), sweep: 0, rSum: 0, samples: 0, la: null, moved: 0 };
  schedulePreview();
});
canvas.addEventListener('pointermove', (e) => {
  if (!gesture || e.pointerId !== gesture.id) return;
  const [x, y] = toSheet(e);
  gesture.moved = Math.max(gesture.moved, Math.hypot(x - gesture.x0, y - gesture.y0));
  if (gesture.kind === 'stir') {
    const a = Math.atan2(y - gesture.y0, x - gesture.x0), rr = Math.hypot(x - gesture.x0, y - gesture.y0);
    if (gesture.la !== null && rr > 2) { let da = a - gesture.la; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; gesture.sweep += da; }
    if (rr > 2) { gesture.la = a; gesture.rSum += rr; gesture.samples++; }
  }
  gesture.lx = x; gesture.ly = y;
  if (gesture.kind !== 'drop') schedulePreview();
});
function endGesture(e, commit) {
  if (!gesture || (e && e.pointerId !== gesture.id)) return;
  const g = gesture; gesture = null;
  if (raf) { cancelAnimationFrame(raf); raf = 0; }
  if (commit) {
    if (g.kind === 'drop') { applyGroup([dropOp(g.x0, g.y0, g.r ?? settings.dropRadius)]); if (autoAdvance) advanceColour(); return; }
    if (g.kind === 'stir') { if (g.moved >= 3) { applyGroup([stirOp(g)]); return; } }
    else if (g.moved >= 3) { applyGroup([strokeOp(g, g.lx, g.ly)]); return; }
  }
  preview = null; render(); writeReadout();
}
canvas.addEventListener('pointerup', (e) => endGesture(e, true));
canvas.addEventListener('pointercancel', (e) => endGesture(e, false));
canvas.addEventListener('lostpointercapture', (e) => endGesture(e, false));
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

/* ---------------- panel ---------------- */
function setTool(t) {
  tool = t;
  for (const b of document.querySelectorAll('#tools button')) b.classList.toggle('is-on', b.dataset.tool === t);
  document.getElementById('toolHint').textContent = HINTS[t];
  canvas.classList.toggle('is-stroke', t !== 'drop');
  for (const s of SETTINGS) ctrlEl[s.id].hidden = !s.tools.includes(t);
}
document.getElementById('tools').addEventListener('click', (e) => { const b = e.target.closest('button[data-tool]'); if (b) setTool(b.dataset.tool); });
const ctrlEl = {};
const fmtVal = (s, v) => `${(+v).toFixed(s.step < 1 ? 2 : 0)}${s.unit ? ' ' + s.unit : ''}`;
{
  const host = document.getElementById('controls');
  for (const s of SETTINGS) {
    const w = document.createElement('div');
    w.className = 'mb-ctrl';
    w.innerHTML = `<label for="${s.id}"><span>${s.label}</span><output id="${s.id}-out"></output></label><input type="range" id="${s.id}" min="${s.min}" max="${s.max}" step="${s.step}" value="${s.default}">`;
    host.appendChild(w); ctrlEl[s.id] = w;
    const input = w.querySelector('input');
    input.addEventListener('input', () => { settings[s.id] = +input.value; writeOutputs(); if (gesture) schedulePreview(); });
  }
  const ih = document.getElementById('inkControls');
  for (const s of INK_SETTINGS) {
    const w = document.createElement('div');
    w.className = 'mb-ctrl';
    w.innerHTML = `<label for="ink-${s.id}" title="${s.hint}"><span>${s.label}</span><output id="ink-${s.id}-out"></output></label><input type="range" id="ink-${s.id}" min="${s.min}" max="${s.max}" step="${s.step}" value="${s.default}">`;
    ih.appendChild(w);
    const input = w.querySelector('input');
    input.addEventListener('input', () => { setInk({ [s.id]: +input.value }); if (gesture) schedulePreview(); });
  }
}
function writeOutputs() { for (const s of SETTINGS) { document.getElementById(`${s.id}-out`).textContent = fmtVal(s, settings[s.id]); document.getElementById(s.id).value = settings[s.id]; } }
function writeInkOutputs() {
  const p = inkFor(color);
  for (const s of INK_SETTINGS) { document.getElementById(`ink-${s.id}-out`).textContent = (+p[s.id]).toFixed(2) + (s.id === 'gall' ? '×' : ''); document.getElementById(`ink-${s.id}`).value = p[s.id]; }
  document.getElementById('inkSum').textContent = `${color} · ${p.conc.toFixed(2)} / ${p.opa.toFixed(2)} / ${p.gall.toFixed(2)}× / ${p.gran.toFixed(2)}`;
}
function setInk(o) {
  inkProps[color] = { ...inkFor(color), ...o };
  try { localStorage.setItem('marble.inkProps', JSON.stringify(inkProps)); } catch { /* private mode */ }
  writeInkOutputs();
}

function drawSwatches() {
  const ink = document.getElementById('inkSwatches');
  ink.innerHTML = '';
  for (const [name, hex] of [...SITE_COLORS, ...customColors.map((c) => ['custom', c])]) {
    const b = document.createElement('button');
    b.className = 'mb-swatch' + (hex === color ? ' is-on' : ''); b.title = `${name} ${hex}`; b.dataset.hex = hex;
    b.innerHTML = `<i style="background:${hex}"></i>`;
    b.addEventListener('click', () => { color = hex; drawSwatches(); });
    b.addEventListener('contextmenu', (e) => { e.preventDefault(); if (customColors.includes(hex)) { customColors = customColors.filter((c) => c !== hex); saveCustom(); if (color === hex) color = SITE_COLORS[0][1]; drawSwatches(); } });
    ink.appendChild(b);
  }
  const sh = document.getElementById('sheetSwatches');
  sh.innerHTML = '';
  for (const [name, hex] of SHEET_CHOICES) {
    const b = document.createElement('button');
    b.className = 'mb-swatch is-sheet' + (hex === sheet ? ' is-on' : ''); b.title = `sheet ${name} ${hex}`; b.dataset.hex = hex;
    b.innerHTML = `<i style="background:${hex}"></i>`;
    b.addEventListener('click', () => setSheet(hex));
    sh.appendChild(b);
  }
  document.getElementById('colourSum').textContent = `${color} on ${sheet}`;
  writeInkOutputs();
}
function saveCustom() { try { localStorage.setItem('marble.customColors', JSON.stringify(customColors)); } catch { /* private mode */ } }
function addCustom(hex) {
  let h; try { h = M.normHex(hex); } catch { say('a colour is six hex digits, like #5FA0A0', true); return; }
  if (!customColors.includes(h) && !SITE_COLORS.some((c) => c[1] === h)) { customColors.push(h); saveCustom(); }
  color = h; drawSwatches(); say(`${h} added — right-click a custom swatch to remove it`);
}
document.getElementById('customAdd').addEventListener('click', () => addCustom(document.getElementById('customHex').value || document.getElementById('customPick').value));
document.getElementById('customPick').addEventListener('input', (e) => { document.getElementById('customHex').value = e.target.value.toUpperCase(); });
document.getElementById('customHex').addEventListener('keydown', (e) => { if (e.key === 'Enter') addCustom(e.target.value); });
document.getElementById('autoAdvance').addEventListener('change', (e) => { autoAdvance = e.target.checked; });

/* material */
{
  const sel = document.getElementById('paperSel');
  T.PAPERS.forEach((p, i) => { const o = document.createElement('option'); o.value = i; o.textContent = p.label; sel.appendChild(o); });
  sel.addEventListener('change', () => { const i = +sel.value; setSheet(T.paperOf(i).hex); setMaterial({ paper: i }); });
  const fl = document.getElementById('flaws');
  fl.addEventListener('input', () => setMaterial({ flaws: +fl.value }));
  const ms = document.getElementById('matSeed');
  ms.addEventListener('change', () => setMaterial({ seed: Math.max(0, Math.floor(+ms.value) || 0) }));
  document.getElementById('matReroll').addEventListener('click', () => setMaterial({ seed: Math.floor(Math.random() * 1e6) }));
}
function writeMaterialUi() {
  document.getElementById('paperSel').value = material.paper;
  document.getElementById('flaws').value = material.flaws;
  document.getElementById('flaws-out').textContent = material.flaws.toFixed(2);
  document.getElementById('matSeed').value = material.seed;
  document.getElementById('materialSum').textContent = `${T.paperOf(material.paper).label.toLowerCase()} · flaws ${material.flaws.toFixed(2)}`;
}
document.getElementById('layBtn').addEventListener('click', () => { if (gesture) return; setView(view === 'paper' ? 'bath' : 'paper'); });
document.getElementById('pullBtn').addEventListener('click', () => pull(true));

{
  const host = document.getElementById('patterns');
  for (const [id, p] of Object.entries(M.PATTERNS)) {
    const b = document.createElement('button');
    b.className = 'mb-btn'; b.textContent = p.label; b.dataset.pattern = id;
    b.addEventListener('click', () => runPattern(id));
    host.appendChild(b);
  }
}
function seedValue() { const v = Math.floor(+document.getElementById('seed').value); return Number.isFinite(v) && v >= 0 ? v : 1; }
function runPattern(id) {
  if (gesture) return;
  const ops = M.PATTERNS[id].build(rotationFromCurrent(), { rand: M.mulberry32(seedValue()) });
  applyGroup(ops);
  say(`${M.PATTERNS[id].label}: ${ops.length} ops as one undo step`);
}
document.getElementById('randomBtn').addEventListener('click', () => {
  if (gesture) return;
  const ops = M.randomSequence(seedValue(), rotationFromCurrent());
  applyGroup(ops);
  say(`seed ${seedValue()}: ${ops.length} ops as one undo step`);
});
document.getElementById('rerollBtn').addEventListener('click', () => { document.getElementById('seed').value = Math.floor(Math.random() * 1e6); });
document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);
document.getElementById('clearBtn').addEventListener('click', clearSheet);
window.addEventListener('keydown', (e) => {
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
  else if (!mod && e.key >= '1' && e.key <= '5') setTool(TOOLS[+e.key - 1]);
  else if (!mod && e.key.toLowerCase() === 'p') { e.preventDefault(); if (!gesture) setView(view === 'paper' ? 'bath' : 'paper'); }
});

/* ---------------- export ---------------- */
function say(msg, bad = false) { const el = document.getElementById('exportMsg'); el.textContent = msg; el.classList.toggle('is-bad', bad); }
function download(name, data, type) {
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
/* the PNG is the PAPER view at `scale` px per unit: the full material look */
function pngBlob(scale = 2, { flat = false } = {}) {
  const c = document.createElement('canvas');
  c.width = M.SHEET.w * scale; c.height = M.SHEET.h * scale;
  const cx = c.getContext('2d');
  if (flat) { // the plain draw of every layer, no material — the gate's control for "the PNG carries the material"
    cx.fillStyle = sheet; cx.fillRect(0, 0, c.width, c.height);
    cx.save(); cx.scale(scale, scale); for (const st of docStates()) M.paintRegions(cx, st.regions, scale, { rim: false, hairline: false }); cx.restore();
  } else R.renderPaper(cx, { sheet, material, states: docStates() }, scale, R.makeCache());
  return new Promise((res) => c.toBlob(res, 'image/png'));
}
const svgText = () => M.exportSvg(docStates());
document.getElementById('exportSvg').addEventListener('click', () => { const s = svgText(); download(`marble-${stamp()}.svg`, s, 'image/svg+xml'); say(`SVG: ${docStates().reduce((n, s) => n + s.regions.length, 0)} regions in ${layers.length} layer group${layers.length > 1 ? 's' : ''}, ${(s.length / 1024).toFixed(0)} KB — vector only, no texture`); });
document.getElementById('exportPng').addEventListener('click', async () => { const b = await pngBlob(2); download(`marble-${stamp()}.png`, b); say(`PNG: ${M.SHEET.w * 2} × ${M.SHEET.h * 2}, ${(b.size / 1024).toFixed(0)} KB — the paper view with its material`); });
document.getElementById('copyLink').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); say(`link copied — ${location.hash.length} characters`); }
  catch { say('could not reach the clipboard; copy the address bar', true); }
});

/* ---------------- readout ---------------- */
function writeReadout() {
  const n = M.pointCount(state), ops = groups().flat().length;
  const all = layers.flat().length, totalN = docStates().reduce((a, s) => a + M.pointCount(s), 0);
  const coarse = state.segScale > 1 ? `\n<span class="warn">past the point budget — edges simplified ×${state.segScale.toFixed(2)}</span>` : '';
  const paperLine = `paper <b>${T.paperOf(material.paper).label.toLowerCase()}</b> · flaws <b>${material.flaws.toFixed(2)}</b> · texture seed <b>${material.seed}</b> · view <b>${view}</b>${stats.paperMs ? ` (paper render <b>${stats.paperMs.toFixed(0)} ms</b>)` : ''}`;
  document.getElementById('readout').innerHTML =
    `bath: <b>${ops}</b> ops in <b>${groups().length}</b> steps · <b>${state.regions.length}</b> regions · <b>${n.toLocaleString()}</b> points\n`
    + `layers <b>${layers.length}</b> of ${M.MAX_LAYERS} (${printed.length} printed) · all layers <b>${all}</b> ops · <b>${totalN.toLocaleString()}</b> points\n`
    + `last step <b>${stats.lastOpMs.toFixed(1)} ms</b> · preview <b>${stats.previewMs.toFixed(1)} ms</b> · frame <b>${stats.frameMs.toFixed(1)} ms</b>\n`
    + paperLine + `\n`
    + `link <b>${currentHash().length}</b> characters · sheet ${M.SHEET.w} × ${M.SHEET.h}`
    + coarse;
}

/* ---------------- test chrome (read by tools/verify-marble.mjs) ---------------- */
window.__marble = {
  SETTINGS, INK_SETTINGS,
  ops: () => groups().map((g) => g.map((o) => ({ ...o }))),
  layersOps: () => layers.map((l) => l.map((g) => g.map((o) => ({ ...o })))),
  hash: () => currentHash(),
  load: (h) => loadHash(h),
  digest: () => M.digest(state),
  digests: () => docStates().map(M.digest),
  summary: () => ({ regions: state.regions.length, points: M.pointCount(state), groups: groups().length, ops: groups().flat().length, redo: redoStack.length, segScale: state.segScale, sheet, color, tool, layers: layers.length, printed: printed.length, totalRegions: docStates().reduce((n, s) => n + s.regions.length, 0), view, material: { ...material } }),
  commit: (ops) => applyGroup(ops),
  undo, redo, clear: clearSheet,
  pull: () => pull(true),
  setView: (v) => setView(v, true),
  layBlend: () => lay.t,
  setTool,
  setSettings: (o) => { Object.assign(settings, o); writeOutputs(); },
  setColor: (h) => { color = M.normHex(h); drawSwatches(); },
  setInk: (o) => setInk(o),
  ink: () => ({ ...inkFor(color) }),
  setSheet,
  setMaterial: (m) => setMaterial(m),
  setAutoAdvance: (v) => { autoAdvance = !!v; document.getElementById('autoAdvance').checked = autoAdvance; },
  svg: () => svgText(),
  pngSize: async (scale = 2, opts = {}) => (await pngBlob(scale, opts)).size,
  paperMs: async () => { const t = performance.now(); renderPaperCanvas(); return performance.now() - t; },
  stats: () => ({ ...stats }),
  previewing: () => !!preview,
  gesture: () => (gesture ? { ...gesture, op: gesture.op } : null),
  toClient: (x, y) => { const r = canvas.getBoundingClientRect(); return { x: r.left + x / M.SHEET.w * r.width, y: r.top + y / M.SHEET.h * r.height }; },
  sheetRect: () => { const r = canvas.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; },
  readout: () => document.getElementById('readout').textContent,
  controls: () => Object.fromEntries(SETTINGS.map((s) => [s.id, !ctrlEl[s.id].hidden])),
  pixel: (x, y) => { const px = Math.round(x * view2.scale * view2.dpr), py = Math.round(y * view2.scale * view2.dpr); return Array.from(ctx.getImageData(px, py, 1, 1).data); },
};

/* ---------------- boot ---------------- */
writeOutputs();
setTool('drop');
drawSwatches();
writeMaterialUi();
writeViewUi();
window.addEventListener('resize', fitSheet);
fitSheet();
const h0 = location.hash.replace(/^#/, '');
if (h0) { try { loadHash(h0); } catch (e) { say(`could not read that link: ${e.message}`, true); afterChange(); } }
else afterChange();
