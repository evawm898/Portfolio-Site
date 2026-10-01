/* weave.js — the Weave Draft page. Wires the panel to the model
   (weave-draft.js), draws through the renderer (weave-render.js), keeps the
   whole state in the URL hash, and owns the pointer interaction on the three
   editable grids. Nothing here computes a drawdown or writes a file format:
   the model and the renderer are the owners, and this file only calls them.

   TEST CHROME: window.__weave exposes the state, the hash, a digest of the
   drawdown and the page-space centre of any cell, for tools/verify-weave.mjs.
   No control reaches anything through it that the panel cannot. */

import * as D from './weave-draft.js';
import { layout, hitTest, cellCentre, canvasPainter, renderSvg, paint } from './weave-render.js';

const $ = (id) => document.getElementById(id);
const canvas = $('draft');
const ctx = canvas.getContext('2d');

const fromHash = D.decodeHash(location.hash);
let state = fromHash || D.defaultState();
let L = layout(state);
let sum = null;
let lastHash = '';
let raf = 0;
let note = '';           // one line the readout carries until the next change
let presetId = fromHash ? '' : 'twill22';

/* ------------------------------------------------------------- drawing */

function render() { if (!raf) raf = requestAnimationFrame(draw); }

function draw() {
  raf = 0;
  sum = D.summary(state);
  L = layout(state);
  /* a 256 x 256 draft at a large cell is thousands of px a side; keep the
     backing store under the GL limit by lowering the DPR before the size */
  const dpr = Math.min(window.devicePixelRatio || 1, 8192 / Math.max(L.width, L.height));
  canvas.width = Math.round(L.width * dpr);
  canvas.height = Math.round(L.height * dpr);
  canvas.style.width = `${L.width}px`;
  canvas.style.height = `${L.height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  paint(canvasPainter(ctx), state, L, sum);
  writeReadout();
  const h = D.encodeHash(state);
  if (h !== lastHash) { lastHash = h; history.replaceState(null, '', '#' + h); }
  hooks.ready = true;
}

function writeReadout() {
  const s = state, v = s.view, r = sum.runs;
  const lines = [];
  lines.push(`<b>${s.shafts} shafts · ${s.treadles} treadles · ${s.ends} ends × ${s.picks} picks</b>`);
  const per = (p, n) => p ? `every ${p}` : `none in ${n}`;
  lines.push(`threading repeats ${per(sum.threadingPeriod, s.ends)} · treadling ${per(sum.treadlingPeriod, s.picks)}`);
  lines.push(`floats — warp ${r.warpFace} face / ${r.warpBack} back · weft ${r.weftFace} face / ${r.weftBack} back`);
  const nLong = sum.long.warp.length + sum.long.weft.length;
  lines.push(nLong
    ? `<span class="warn">long floats over ${v.maxFloat}: ${sum.long.warp.length} warp + ${sum.long.weft.length} weft${v.warn ? ' — highlighted' : ''}</span>`
    : `long floats over ${v.maxFloat}: none`);
  if (sum.unthreaded || sum.untrodden) {
    const parts = [];
    if (sum.unthreaded) parts.push(`${sum.unthreaded} end${sum.unthreaded > 1 ? 's' : ''} unthreaded`);
    if (sum.untrodden) parts.push(`${sum.untrodden} pick${sum.untrodden > 1 ? 's' : ''} lifting nothing`);
    lines.push(`<span class="warn">${parts.join(' · ')}</span>`);
  }
  lines.push(`view: ${v.mode === 'draft' ? 'full draft' : 'drawdown only'}${v.fabric ? ', fabric' : ''} · cell ${v.cell} px · link ${lastHash.length || D.encodeHash(s).length} chars`);
  if (note) lines.push(note);
  $('readout').innerHTML = lines.join('\n');
  $('structureVal').textContent = presetId ? (D.PRESETS.find(p => p.id === presetId) || {}).label || '' : 'custom';
}

/* ----------------------------------------------------------- controls */

function setState(next, { preset = '' } = {}) {
  state = next;
  presetId = preset;
  note = '';
  syncControls();
  render();
}
/* an in-place edit of the grids or a view field: no control sync needed */
function touched() { presetId = ''; note = ''; render(); }

function syncControls() {
  const s = state, v = s.view;
  for (const k of ['shafts', 'treadles', 'ends', 'picks']) { $(k).value = s[k]; $(k + 'Out').textContent = s[k]; }
  $('preset').value = presetId;
  $('viewMode').value = v.mode;
  $('grid').checked = v.grid;
  $('cell').value = v.cell; $('cellOut').textContent = `${v.cell} px`;
  $('fabric').checked = v.fabric;
  $('yarn').value = Math.round(v.yarn * 100); $('yarnOut').textContent = `${Math.round(v.yarn * 100)}%`;
  $('maxFloat').value = v.maxFloat;
  $('warn').checked = v.warn;
  buildStripes('warp'); buildStripes('weft');
}

/* presets */
for (const p of D.PRESETS) {
  const o = document.createElement('option');
  o.value = p.id; o.textContent = p.label;
  $('preset').appendChild(o);
}
$('preset').addEventListener('change', () => {
  const id = $('preset').value;
  if (id) setState(D.applyPreset(state, id), { preset: id });
});

/* counts */
for (const k of ['shafts', 'treadles', 'ends', 'picks']) {
  $(k).addEventListener('input', () => {
    $(k + 'Out').textContent = $(k).value;
    state = D.resized(state, { [k]: +$(k).value });
    if (k === 'shafts' || k === 'treadles') presetId = '';
    note = '';
    render();
  });
}

/* generators */
$('thStraight').addEventListener('click', () => setState(D.threadingFrom(state, 'straight')));
$('thPoint').addEventListener('click', () => setState(D.threadingFrom(state, 'point')));
$('thClear').addEventListener('click', () => setState(D.cleared(state, 'threading')));
$('thWalk').addEventListener('click', () => {
  /* the box shows the seed of the walk on screen; clicking again advances it */
  let seed = Math.max(1, Math.round(+$('walkSeed').value || 1));
  const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  if (same(state.threading, D.threadingFrom(state, 'walk', seed).threading)) seed++;
  $('walkSeed').value = seed;
  setState(D.threadingFrom(state, 'walk', seed));
});
$('trStraight').addEventListener('click', () => setState(D.treadlingFrom(state, 'straight')));
$('trPoint').addEventListener('click', () => setState(D.treadlingFrom(state, 'point')));
$('trAsDrawn').addEventListener('click', () => setState(D.treadlingFrom(state, 'asdrawn')));
$('trClear').addEventListener('click', () => setState(D.cleared(state, 'treadling')));
$('tuClear').addEventListener('click', () => setState(D.cleared(state, 'tieup')));

/* view */
$('viewMode').addEventListener('change', () => { state.view.mode = $('viewMode').value; render(); });
$('grid').addEventListener('change', () => { state.view.grid = $('grid').checked; render(); });
$('cell').addEventListener('input', () => { state.view.cell = +$('cell').value; $('cellOut').textContent = `${state.view.cell} px`; render(); });
$('fabric').addEventListener('change', () => { state.view.fabric = $('fabric').checked; render(); });
$('yarn').addEventListener('input', () => { state.view.yarn = +$('yarn').value / 100; $('yarnOut').textContent = `${$('yarn').value}%`; render(); });
$('maxFloat').addEventListener('input', () => {
  const v = Math.round(+$('maxFloat').value);
  if (Number.isFinite(v)) { state.view.maxFloat = Math.min(D.LIMITS.maxFloat[1], Math.max(D.LIMITS.maxFloat[0], v)); render(); }
});
$('warn').addEventListener('change', () => { state.view.warn = $('warn').checked; render(); });

/* stripes */
function buildStripes(which) {
  const host = $(which + 'Stripes');
  host.innerHTML = '';
  const list = state[which];
  list.forEach((st, i) => {
    const row = document.createElement('div'); row.className = 'wv-stripe';
    const col = document.createElement('input'); col.type = 'color'; col.value = st.color.toLowerCase();
    col.setAttribute('aria-label', `${which} stripe ${i + 1} colour`);
    const count = document.createElement('input'); count.type = 'number'; count.min = 1; count.max = 999; count.value = st.count;
    count.setAttribute('aria-label', `${which} stripe ${i + 1} count`);
    const wrap = document.createElement('span'); wrap.className = 'wv-count'; wrap.textContent = '×';
    wrap.prepend(count);
    const rm = document.createElement('button'); rm.type = 'button'; rm.className = 'wv-btn wv-btn--small'; rm.textContent = '–';
    rm.title = 'remove this stripe'; rm.disabled = list.length === 1;
    col.addEventListener('input', () => { st.color = col.value.toUpperCase(); note = ''; render(); });
    count.addEventListener('input', () => { const n = Math.round(+count.value); if (n >= 1) { st.count = Math.min(999, n); note = ''; render(); } });
    rm.addEventListener('click', () => { list.splice(i, 1); buildStripes(which); note = ''; render(); });
    row.append(col, wrap, rm);
    host.appendChild(row);
  });
}
$('warpAdd').addEventListener('click', () => { state.warp.push({ color: state.warp.length % 2 ? D.PALETTE.paper : D.PALETTE.teal, count: 1 }); buildStripes('warp'); render(); });
$('weftAdd').addEventListener('click', () => { state.weft.push({ color: state.weft.length % 2 ? D.PALETTE.teal : D.PALETTE.paper, count: 1 }); buildStripes('weft'); render(); });

/* -------------------------------------------------------------- pointer
   Threading: a click THREADS the end on that shaft (one shaft per end) and a
   click on the set cell unthreads it; a drag threads each end it passes on
   the shaft under the pointer, so a diagonal drag draws a straight draw.
   Tie-up and treadling: a click toggles, a drag paints the state the first
   cell took. `touch-action: pan-x pan-y` on the canvas keeps a touch DRAG as
   a scroll, so on a phone it is tap to toggle and drag to pan. */
let op = null;
let lastCell = '';

function hitAt(e) {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (L.width / r.width);
  const y = (e.clientY - r.top) * (L.height / r.height);
  return hitTest(L, x, y);
}
function applyHit(hit) {
  const key = `${hit.block}:${hit.col}:${hit.row}`;
  if (key === lastCell) return;
  lastCell = key;
  if (hit.block === 'threading') {
    if (op.mode === 'set') state.threading[hit.end] = 1 << hit.shaft;
    else state.threading[hit.end] &= ~(1 << hit.shaft);
  } else if (hit.block === 'tieup') {
    const b = 1 << hit.shaft;
    state.tieup[hit.treadle] = op.on ? (state.tieup[hit.treadle] | b) : (state.tieup[hit.treadle] & ~b);
  } else if (hit.block === 'treadling') {
    const b = 1 << hit.treadle;
    state.treadling[hit.pick] = op.on ? (state.treadling[hit.pick] | b) : (state.treadling[hit.pick] & ~b);
  }
  touched();
}
canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  const hit = hitAt(e);
  if (!hit || !['threading', 'tieup', 'treadling'].includes(hit.block)) return;
  e.preventDefault();
  try { canvas.setPointerCapture(e.pointerId); } catch { /* a cancelled touch */ }
  lastCell = '';
  if (hit.block === 'threading') {
    op = { block: 'threading', mode: state.threading[hit.end] === (1 << hit.shaft) ? 'clear' : 'set' };
  } else if (hit.block === 'tieup') {
    op = { block: 'tieup', on: !(state.tieup[hit.treadle] & (1 << hit.shaft)) };
  } else {
    op = { block: 'treadling', on: !(state.treadling[hit.pick] & (1 << hit.treadle)) };
  }
  canvas.classList.add('painting');
  applyHit(hit);
});
canvas.addEventListener('pointermove', (e) => {
  if (!op) return;
  if (e.pointerType === 'mouse' && !(e.buttons & 1)) { op = null; canvas.classList.remove('painting'); return; }
  const hit = hitAt(e);
  if (hit && hit.block === op.block) applyHit(hit);
});
const endOp = () => { op = null; lastCell = ''; canvas.classList.remove('painting'); };
canvas.addEventListener('pointerup', endOp);
canvas.addEventListener('pointercancel', endOp);
canvas.addEventListener('lostpointercapture', endOp);

/* --------------------------------------------------------------- export */

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const stem = () => `weave-${state.shafts}s-${state.treadles}t-${state.ends}x${state.picks}`;

$('exportSvg').addEventListener('click', () => {
  download(new Blob([renderSvg(state, sum)], { type: 'image/svg+xml' }), `${stem()}.svg`);
});
$('exportWif').addEventListener('click', () => {
  download(new Blob([D.toWif(state)], { type: 'text/plain' }), `${stem()}.wif`);
});
$('exportPng').addEventListener('click', () => {
  /* the view at 2x, through the same paint() as the screen */
  const scale = Math.min(2, 8192 / Math.max(L.width, L.height));
  const off = document.createElement('canvas');
  off.width = Math.round(L.width * scale); off.height = Math.round(L.height * scale);
  const c2 = off.getContext('2d');
  c2.setTransform(scale, 0, 0, scale, 0, 0);
  paint(canvasPainter(c2), state, L, sum);
  off.toBlob((blob) => { if (blob) download(blob, `${stem()}.png`); }, 'image/png');
});
$('copyLink').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); note = 'link copied'; }
  catch { note = 'copy the address bar — the link IS the draft'; }
  writeReadout();
});
$('resetBtn').addEventListener('click', () => setState(D.defaultState(), { preset: 'twill22' }));

/* import: the file input, and a drop anywhere on the page */
function importWifText(text, name) {
  try {
    const { state: s, notes } = D.fromWif(text, state.view);
    setState(s);
    note = `loaded ${name || 'WIF'}${notes.length ? ' — ' + notes.join('; ') : ''}`;
    writeReadout();
  } catch (err) {
    note = `<span class="warn">could not read ${name || 'that file'}: ${err.message}</span>`;
    writeReadout();
  }
}
function readFile(file) {
  if (!file) return;
  const fr = new FileReader();
  fr.onload = () => importWifText(String(fr.result), file.name);
  fr.readAsText(file);
}
$('importWif').addEventListener('change', () => { readFile($('importWif').files[0]); $('importWif').value = ''; });
let dragDepth = 0;
document.addEventListener('dragenter', (e) => { e.preventDefault(); dragDepth++; $('dropHint').hidden = false; });
document.addEventListener('dragover', (e) => { e.preventDefault(); });
document.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; $('dropHint').hidden = true; } });
document.addEventListener('drop', (e) => {
  e.preventDefault(); dragDepth = 0; $('dropHint').hidden = true;
  readFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
});

/* a link pasted into the address bar while the page is open */
window.addEventListener('hashchange', () => {
  if (location.hash === '#' + lastHash) return;
  const s = D.decodeHash(location.hash);
  if (s) setState(s);
});

/* ---------------------------------------------------------- test chrome */
const hooks = {
  ready: false,
  state: () => state,
  layout: () => L,
  hash: () => D.encodeHash(state),
  summary: () => ({ shafts: state.shafts, treadles: state.treadles, ends: state.ends, picks: state.picks,
    mode: state.view.mode, fabric: state.view.fabric, cell: state.view.cell }),
  drawdownDigest: () => {
    const dd = D.drawdown(state); let h = 2166136261;
    for (let i = 0; i < dd.length; i++) { h ^= dd[i]; h = Math.imul(h, 16777619); }
    return `${dd.length}:${(h >>> 0).toString(16)}`;
  },
  /* page-space centre of a cell, for a pointer */
  cellCentre: (block, idx) => {
    const c = cellCentre(L, block, idx);
    const r = canvas.getBoundingClientRect();
    return c && { x: r.left + c.x * (r.width / L.width), y: r.top + c.y * (r.height / L.height) };
  },
  /* scroll the stage so a cell is in view (a 256-end draft is wider than any
     screen), then return its page-space centre */
  reveal: (block, idx) => {
    const c = cellCentre(L, block, idx);
    if (!c) return null;
    const stage = $('stage');
    const r = canvas.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    stage.scrollLeft += (r.left + c.x) - (sr.left + sr.width / 2);
    stage.scrollTop += (r.top + c.y) - (sr.top + sr.height / 2);
    return hooks.cellCentre(block, idx);
  },
  set: ({ preset, clear }) => {
    if (preset) setState(D.applyPreset(state, preset), { preset });
    if (clear) setState(D.cleared(state, clear));
    draw();
  },
};
window.__weave = hooks;

syncControls();
draw();
