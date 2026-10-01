/* marble.js — the /marble page. The sheet's state is REPLAY of an op list and
   nothing else: the page keeps the committed op groups, mirrors them into the
   URL hash (one decimal per number, rounded BEFORE the op is applied, so the
   link replays the very doubles the page used), and draws marble-math.js's
   state on a canvas. A pointer gesture builds an op, PREVIEWS it against the
   committed state every frame (plain mapping, no refinement — cheap), and
   commits it on release through the one path everything else uses. Undo pops a
   whole group (a pattern is one group); recent states are kept as snapshots
   because the engine never mutates a state, so a snapshot is a reference. */

import * as M from './marble-math.js';

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
const MAX_Z = 1500, MAX_SWEEP = 3 * 2 * Math.PI, STIR_MIN_R = 10;
const SNAPSHOTS = 8;

/* ---------------- state ---------------- */
let sheet = DEFAULT_SHEET;
let groups = [];          // committed op groups, in order
let redoStack = [];       // groups undone, newest last
let state = M.emptyState(sheet);
let snaps = [];           // [{ count, state }] for the last SNAPSHOTS group counts
let tool = 'drop';
const settings = Object.fromEntries(SETTINGS.map((s) => [s.id, s.default]));
let color = SITE_COLORS[0][1];
let customColors = [];
let autoAdvance = true;
let preview = null;       // { op, state } while a gesture is live
let gesture = null;
const stats = { lastOpMs: 0, frameMs: 0, previewMs: 0, replayMs: 0 };

try { customColors = JSON.parse(localStorage.getItem('marble.customColors') || '[]').map(M.normHex); } catch { customColors = []; }

/* ---------------- canvas ---------------- */
const canvas = document.getElementById('sheet');
const ctx = canvas.getContext('2d');
let view = { css: 0, scale: 1, dpr: 1 };
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
  view = { css: cw, scale: cw / M.SHEET.w, dpr };
  render();
}
function render() {
  const t = performance.now();
  const st = preview ? preview.state : state;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  M.drawState(ctx, st, view.scale * view.dpr);
  if (preview) drawGuide(preview.op);
  stats.frameMs = performance.now() - t;
}
/* the gesture's own guide: the tine lines a comb will rake along, the stir ring */
function drawGuide(op) {
  const k = view.scale * view.dpr;
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
  const rounded = ops.map(M.roundOp);
  for (const op of rounded) state = M.applyOp(state, op);
  stats.lastOpMs = performance.now() - t;
  groups.push(rounded);
  redoStack = [];
  snapshot();
  afterChange();
  return rounded;
}
function snapshot() {
  snaps.push({ count: groups.length, state });
  if (snaps.length > SNAPSHOTS) snaps.shift();
}
function stateAt(count) {
  const s = snaps.find((q) => q.count === count);
  if (s) return s.state;
  const t = performance.now();
  const st = M.replay(groups.slice(0, count).flat(), sheet);
  stats.replayMs = performance.now() - t;
  return st;
}
function undo() {
  if (!groups.length || gesture) return;
  redoStack.push(groups.pop());
  snaps = snaps.filter((q) => q.count <= groups.length);
  state = stateAt(groups.length);
  afterChange();
}
function redo() {
  if (!redoStack.length || gesture) return;
  const g = redoStack.pop();
  for (const op of g) state = M.applyOp(state, op);
  groups.push(g);
  snapshot();
  afterChange();
}
function clearSheet() {
  if (gesture) return;
  if (groups.length) redoStack.push(...groups.reverse());
  groups = []; snaps = []; state = M.emptyState(sheet);
  afterChange();
}
function setSheet(hex) {
  sheet = M.normHex(hex);
  // the sheet colour is not an op: every state is re-coloured, no geometry moves
  state = { ...state, sheet };
  snaps = snaps.map((q) => ({ count: q.count, state: { ...q.state, sheet } }));
  afterChange();
}
function afterChange() {
  preview = null;
  writeHash(); render(); writeReadout(); drawSwatches();
  document.getElementById('undoBtn').disabled = !groups.length;
  document.getElementById('redoBtn').disabled = !redoStack.length;
}
function currentHash() { return M.encodeHash(groups, sheet); }
let lastWritten = '';
function writeHash() {
  const h = currentHash();
  lastWritten = h;
  history.replaceState(null, '', '#' + h);
}
function loadHash(h) {
  const { sheet: sh, groups: gs } = M.decodeHash(h);
  const t = performance.now();
  sheet = sh; groups = gs; redoStack = []; snaps = [];
  state = M.replay(groups.flat(), sheet);
  stats.replayMs = performance.now() - t;
  snapshot();
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
let raf = 0;
function schedulePreview() { if (!raf) raf = requestAnimationFrame(tickPreview); }
function tickPreview() {
  raf = 0;
  if (!gesture) return;
  let op;
  if (gesture.kind === 'drop') {
    const r0 = settings.dropRadius, cap = Math.min(300, r0 * 3);
    const r = Math.min(cap, r0 + settings.growRate * (performance.now() - gesture.t0) / 1000);
    op = { k: 'd', x: gesture.x0, y: gesture.y0, r, color };
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
    if (g.kind === 'drop') { applyGroup([{ k: 'd', x: g.x0, y: g.y0, r: g.r ?? settings.dropRadius, color }]); if (autoAdvance) advanceColour(); return; }
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
}
function writeOutputs() { for (const s of SETTINGS) { document.getElementById(`${s.id}-out`).textContent = fmtVal(s, settings[s.id]); document.getElementById(s.id).value = settings[s.id]; } }

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
});

/* ---------------- export ---------------- */
function say(msg, bad = false) { const el = document.getElementById('exportMsg'); el.textContent = msg; el.classList.toggle('is-bad', bad); }
function download(name, data, type) {
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
function pngBlob(scale = 2) {
  const c = document.createElement('canvas');
  c.width = M.SHEET.w * scale; c.height = M.SHEET.h * scale;
  M.drawState(c.getContext('2d'), state, scale);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}
document.getElementById('exportSvg').addEventListener('click', () => { const s = M.exportSvg(state); download(`marble-${stamp()}.svg`, s, 'image/svg+xml'); say(`SVG: ${state.regions.length} regions, ${(s.length / 1024).toFixed(0)} KB`); });
document.getElementById('exportPng').addEventListener('click', async () => { const b = await pngBlob(2); download(`marble-${stamp()}.png`, b); say(`PNG: ${M.SHEET.w * 2} × ${M.SHEET.h * 2}, ${(b.size / 1024).toFixed(0)} KB`); });
document.getElementById('copyLink').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); say(`link copied — ${location.hash.length} characters`); }
  catch { say('could not reach the clipboard; copy the address bar', true); }
});

/* ---------------- readout ---------------- */
function writeReadout() {
  const n = M.pointCount(state), ops = groups.flat().length;
  const coarse = state.segScale > 1 ? `\n<span class="warn">past the point budget — edges simplified ×${state.segScale.toFixed(2)}</span>` : '';
  document.getElementById('readout').innerHTML =
    `<b>${ops}</b> ops in <b>${groups.length}</b> steps · <b>${state.regions.length}</b> regions · <b>${n.toLocaleString()}</b> points\n`
    + `last step <b>${stats.lastOpMs.toFixed(1)} ms</b> · preview <b>${stats.previewMs.toFixed(1)} ms</b> · frame <b>${stats.frameMs.toFixed(1)} ms</b>\n`
    + `link <b>${currentHash().length}</b> characters · sheet ${M.SHEET.w} × ${M.SHEET.h}`
    + coarse;
}

/* ---------------- test chrome (read by tools/verify-marble.mjs) ---------------- */
window.__marble = {
  SETTINGS,
  ops: () => groups.map((g) => g.map((o) => ({ ...o }))),
  hash: () => currentHash(),
  load: (h) => loadHash(h),
  digest: () => M.digest(state),
  summary: () => ({ regions: state.regions.length, points: M.pointCount(state), groups: groups.length, ops: groups.flat().length, redo: redoStack.length, segScale: state.segScale, sheet, color, tool }),
  commit: (ops) => applyGroup(ops),
  undo, redo, clear: clearSheet,
  setTool,
  setSettings: (o) => { Object.assign(settings, o); writeOutputs(); },
  setColor: (h) => { color = M.normHex(h); drawSwatches(); },
  setSheet,
  setAutoAdvance: (v) => { autoAdvance = !!v; document.getElementById('autoAdvance').checked = autoAdvance; },
  svg: () => M.exportSvg(state),
  pngSize: async (scale = 2) => (await pngBlob(scale)).size,
  stats: () => ({ ...stats }),
  previewing: () => !!preview,
  gesture: () => (gesture ? { ...gesture, op: gesture.op } : null),
  toClient: (x, y) => { const r = canvas.getBoundingClientRect(); return { x: r.left + x / M.SHEET.w * r.width, y: r.top + y / M.SHEET.h * r.height }; },
  sheetRect: () => { const r = canvas.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; },
  readout: () => document.getElementById('readout').textContent,
  controls: () => Object.fromEntries(SETTINGS.map((s) => [s.id, !ctrlEl[s.id].hidden])),
  pixel: (x, y) => { const px = Math.round(x * view.scale * view.dpr), py = Math.round(y * view.scale * view.dpr); return Array.from(ctx.getImageData(px, py, 1, 1).data); },
};

/* ---------------- boot ---------------- */
writeOutputs();
setTool('drop');
drawSwatches();
window.addEventListener('resize', fitSheet);
fitSheet();
const h0 = location.hash.replace(/^#/, '');
if (h0) { try { loadHash(h0); } catch (e) { say(`could not read that link: ${e.message}`, true); afterChange(); } }
else afterChange();
