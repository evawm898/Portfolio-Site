/* weave.js — the Weave Draft page. Wires the panel to the model
   (weave-draft.js), draws through the renderer (weave-render.js), keeps the
   whole state in the URL hash, and owns the pointer interaction on the three
   editable grids. Nothing here computes a drawdown, a weight or a cover
   factor, and nothing here writes a file format except the PDF, which is a
   rendering of the model's own construction sheet: the model and the
   renderer are the owners, and this file only calls them.

   THE PANEL'S THREE EDITORS (yarns, systems, physical) write INTO the state
   on every input and re-render; they are REBUILT only when a row is added or
   removed, never on a keystroke, so a field keeps its focus while it is typed
   in. A yarn's count field shows the unit the user chose and stores denier.

   jsPDF is loaded ONLY when the construction PDF is asked for — the page
   itself loads no library — from the cdnjs pin the cards page already uses,
   so the gate can serve it from node_modules at the same URL.

   TEST CHROME: window.__weave exposes the state, the hash, a digest of the
   drawdown, the physical figures and the page-space centre of any cell, for
   tools/verify-weave.mjs. No control reaches anything through it that the
   panel cannot. */

import * as D from './weave-draft.js';
import { layout, hitTest, cellCentre, canvasPainter, renderSvg, paint } from './weave-render.js';

const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

const $ = (id) => document.getElementById(id);
const canvas = $('draft');
const ctx = canvas.getContext('2d');

const fromHash = D.decodeHash(location.hash);
let state = fromHash || D.defaultState();
let L = layout(state);
let sum = null;
let ph = null;
let lastHash = '';
let raf = 0;
let note = '';           // one line the readout carries until the next change
let presetId = fromHash ? '' : 'twill22';
const countUnit = new Map();   // yarn id -> the unit its count field shows (not state)
const openYarns = new Set();   // which yarn cards are expanded (not state)

const f1 = (v) => (Math.round(v * 10) / 10).toString();
const f2 = (v) => (Math.round(v * 100) / 100).toString();
const f3 = (v) => (Math.round(v * 1000) / 1000).toString();
const pct = (v) => `${f1(v * 100)}%`;
const presetLabel = () => presetId ? ((D.PRESETS.find(p => p.id === presetId) || {}).label || '') : '';

/* ------------------------------------------------------------- drawing */

function render() { if (!raf) raf = requestAnimationFrame(draw); }

function draw() {
  raf = 0;
  sum = D.summary(state);
  ph = D.physical(state);
  L = layout(state, ph);
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
  writePhysical();
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
  lines.push(`construction: ${ph.totalEnds} ends · ${f2(ph.gPerM)} g/m · ${f1(ph.gsm)} g/m² · cover ${pct(ph.coverTotal)}`);
  if (ph.tooDense) lines.push(`<span class="warn">${D.denseWarning(ph)}</span>`);
  const scale = v.trueScale ? `, true scale at ${v.dpi} dpi (${f2(L.cellW)} × ${f2(L.cellH)} px a thread)` : ` · cell ${v.cell} px`;
  lines.push(`view: ${v.mode === 'draft' ? 'full draft' : 'drawdown only'}${v.fabric ? ', fabric' : ''}${scale} · link ${lastHash.length || D.encodeHash(s).length} chars`);
  if (note) lines.push(note);
  $('readout').innerHTML = lines.join('\n');
  $('structureVal').textContent = presetId ? presetLabel() : 'custom';
  $('yarnsVal').textContent = `${state.yarns.length} in the library`;
}

function writePhysical() {
  const p = ph;
  const byId = new Map(state.yarns.map(y => [y.id, y]));
  const lines = [];
  lines.push(`<b>${p.totalEnds} ends</b> across ${f1(p.widthMm)} mm (${f2(p.widthIn)} in) · ${f2(p.epcm)} ends/cm (${f1(p.epi)}/in) × ${f2(p.ppcm)} picks/cm (${f1(p.ppi)}/in)`);
  const sysLine = (dir, r, unit) => {
    const yarns = r.yarns.map(q => `${q.n}× ${(byId.get(q.id) || { name: '?' }).name}`).join(', ');
    const n = unit === 'ends' ? `${Math.round(r.threads)} ends` : `${f1(r.threads)} picks/m`;
    return `${dir} <b>${r.name}</b>: ${n} (${pct(r.share)}) — ${yarns} · ${f2(r.gPerM)} g/m`;
  };
  for (const r of p.warp.systems) lines.push(sysLine('warp', r, 'ends'));
  for (const r of p.weft.systems) lines.push(sysLine('weft', r, 'picks'));
  lines.push(`<b>weight ${f2(p.gPerM)} g/m · ${f1(p.gsm)} g/m²</b> (warp ${f2(p.warp.gPerM)} + weft ${f2(p.weft.gPerM)}; crimp ${p.crimpWarp}% / ${p.crimpWeft}%)`);
  lines.push(`yarn diameter ≈ warp ${f3(p.warp.meanDiameterMm)} mm · weft ${f3(p.weft.meanDiameterMm)} mm (estimated from count and fibre)`);
  lines.push(`cover: warp ${pct(p.warp.cover)} · weft ${pct(p.weft.cover)} · <b>total ${pct(p.coverTotal)}</b> (Peirce K ${f1(p.warp.K)} / ${f1(p.weft.K)} / ${f1(p.Ktotal)} of ${D.PEIRCE_MAX_K})`);
  if (p.tooDense) lines.push(`<span class="wv-dense">${D.denseWarning(p)}</span>`);
  if (p.relaxed) {
    const R = p.relaxed;
    lines.push(`elastic: warp relaxes to ${pct(R.warpRelax)}, weft to ${pct(R.weftRelax)} — relaxed ≈ ${f1(R.widthMm)} mm wide, ${f2(R.epcm)} × ${f2(R.ppcm)} per cm, ${f2(R.gPerM)} g/m (${f1(R.gsm)} g/m²), cover ${pct(R.coverTotal)}`);
  }
  $('physOut').innerHTML = lines.join('\n');
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
/* an in-place edit of a yarn, a system or a physical field: the structure
   preset still holds */
function edited() { note = ''; render(); }

function syncControls() {
  const s = state, v = s.view, P = s.physical;
  for (const k of ['shafts', 'treadles', 'ends', 'picks']) { $(k).value = s[k]; $(k + 'Out').textContent = s[k]; }
  $('preset').value = presetId;
  $('viewMode').value = v.mode;
  $('grid').checked = v.grid;
  $('cell').value = v.cell; $('cellOut').textContent = `${v.cell} px`;
  $('fabric').checked = v.fabric;
  $('yarn').value = Math.round(v.yarn * 100); $('yarnOut').textContent = `${Math.round(v.yarn * 100)}%`;
  $('maxFloat').value = v.maxFloat;
  $('warn').checked = v.warn;
  $('trueScale').checked = v.trueScale;
  $('dpi').value = v.dpi;
  $('width').value = P.width; $('widthUnit').value = P.widthUnit;
  $('densityUnit').value = P.densityUnit; syncDensityMax();
  $('epi').value = P.epi; $('ppi').value = P.ppi;
  $('crimpWarp').value = P.crimpWarp; $('crimpWeft').value = P.crimpWeft;
  buildYarns(); buildSystems('warp'); buildSystems('weft');
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
$('trueScale').addEventListener('change', () => { state.view.trueScale = $('trueScale').checked; render(); });
$('dpi').addEventListener('input', () => {
  const v = Math.round(+$('dpi').value);
  if (Number.isFinite(v) && v >= D.LIMITS.dpi[0] && v <= D.LIMITS.dpi[1]) { state.view.dpi = v; render(); }
});

/* physical */
const clampNum = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v));
const numberField = (id, lim, apply) => {
  $(id).addEventListener('input', () => {
    const v = +$(id).value;
    if (Number.isFinite(v) && v >= lim[0] && v <= lim[1]) { apply(v); edited(); }
  });
};
numberField('width', [0.5, 10000], (v) => {
  const P = state.physical;
  P.width = clampNum(v, P.widthUnit === 'in' ? D.LIMITS.widthIn : D.LIMITS.widthMm);
});
const densityField = (id, key) => {
  $(id).addEventListener('input', () => {
    const v = +$(id).value, lim = D.densityLimit(state.physical.densityUnit);
    if (Number.isFinite(v) && v >= lim[0] && v <= lim[1]) { state.physical[key] = v; edited(); }
  });
};
densityField('epi', 'epi');
densityField('ppi', 'ppi');
/* the sett inputs' own max follows the unit (300 per cm is 762 per inch) */
function syncDensityMax() {
  const lim = D.densityLimit(state.physical.densityUnit);
  $('epi').max = lim[1]; $('ppi').max = lim[1];
  $('ppiUnit').textContent = state.physical.densityUnit === 'in' ? 'inch' : 'cm';
}
numberField('crimpWarp', D.LIMITS.crimp, (v) => { state.physical.crimpWarp = v; });
numberField('crimpWeft', D.LIMITS.crimp, (v) => { state.physical.crimpWeft = v; });
/* a unit change keeps the physical quantity and re-states the number */
$('widthUnit').addEventListener('change', () => {
  const P = state.physical, to = $('widthUnit').value;
  if (to === P.widthUnit) return;
  const mm = P.widthUnit === 'in' ? P.width * 25.4 : P.width;
  P.widthUnit = to;
  P.width = +f2(clampNum(to === 'in' ? mm / 25.4 : mm, to === 'in' ? D.LIMITS.widthIn : D.LIMITS.widthMm));
  $('width').value = P.width;
  edited();
});
$('densityUnit').addEventListener('change', () => {
  const P = state.physical, to = $('densityUnit').value;
  if (to === P.densityUnit) return;
  const k = to === 'in' ? 2.54 : 1 / 2.54;
  P.densityUnit = to;
  P.epi = +f2(clampNum(P.epi * k, D.densityLimit(to)));
  P.ppi = +f2(clampNum(P.ppi * k, D.densityLimit(to)));
  syncDensityMax();
  $('epi').value = P.epi; $('ppi').value = P.ppi;
  edited();
});

/* --------------------------------------------------------------- yarns */

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function field(label, input, wide) {
  const f = el('div', 'wv-field' + (wide ? ' wv-field--wide' : ''));
  f.appendChild(el('span', '', label));
  f.appendChild(input);
  return f;
}
function numInput(value, min, max, step, aria) {
  const i = document.createElement('input');
  i.type = 'number'; i.min = min; i.max = max; i.step = step; i.value = value;
  i.setAttribute('aria-label', aria);
  return i;
}
function selectInput(options, value, aria) {
  const sel = document.createElement('select');
  for (const [v, label] of options) { const o = document.createElement('option'); o.value = v; o.textContent = label; sel.appendChild(o); }
  sel.value = value;
  sel.setAttribute('aria-label', aria);
  return sel;
}
const yarnCountText = (y) => `${f1(y.den)} den`;

/* every yarn select on the page lists the library; keep their labels current */
function refreshYarnOptions() {
  for (const sel of document.querySelectorAll('select.wv-yarnsel')) {
    for (const o of sel.options) { const y = state.yarns.find(x => x.id === o.value); if (y) o.textContent = y.name; }
  }
  for (const sw of document.querySelectorAll('.wv-seq .wv-swatch')) {
    const y = state.yarns.find(x => x.id === sw.dataset.yarn);
    if (y) sw.style.background = y.color;
  }
}

function buildYarns() {
  const host = $('yarnList');
  host.innerHTML = '';
  state.yarns.forEach((y) => {
    const det = el('details', 'wv-yarn');
    det.dataset.yarn = y.id;
    det.open = openYarns.has(y.id);
    det.addEventListener('toggle', () => { if (det.open) openYarns.add(y.id); else openYarns.delete(y.id); });
    const sm = el('summary');
    const swatch = el('span', 'wv-swatch'); swatch.style.background = y.color;
    const nm = el('span', 'wv-yarn-name', y.name);
    const ct = el('span', 'wv-yarn-count', yarnCountText(y));
    sm.append(swatch, nm, ct);
    det.appendChild(sm);
    const F = el('div', 'wv-fields');

    const name = document.createElement('input'); name.type = 'text'; name.maxLength = 60; name.value = y.name;
    name.setAttribute('aria-label', `${y.name} name`);
    name.addEventListener('input', () => { y.name = name.value.slice(0, 60) || 'yarn'; nm.textContent = y.name; refreshYarnOptions(); edited(); });
    F.appendChild(field('name', name, true));

    const fiber = selectInput(D.FIBERS.map(f => [f.id, f.label]), y.fiber, `${y.name} fibre`);
    fiber.addEventListener('change', () => { y.fiber = fiber.value; edited(); });
    F.appendChild(field('fibre', fiber));

    const unit = countUnit.get(y.id) || 'den';
    const countWrap = el('span', 'wv-pair-in');
    const count = numInput(f3(D.fromDenier(y.den, unit)), 0.01, 1000000, 'any', `${y.name} count`);
    const unitSel = selectInput(D.COUNT_UNITS.map(u => [u, u]), unit, `${y.name} count unit`);
    count.addEventListener('input', () => {
      const den = D.toDenier(count.value, unitSel.value);
      if (Number.isFinite(den)) { y.den = clampNum(+f3(den), D.YARN_LIMITS.den); ct.textContent = yarnCountText(y); edited(); }
    });
    unitSel.addEventListener('change', () => { countUnit.set(y.id, unitSel.value); count.value = f3(D.fromDenier(y.den, unitSel.value)); });
    countWrap.append(count, unitSel);
    F.appendChild(field('count', countWrap));

    const fil = numInput(y.filaments, 0, 5000, 1, `${y.name} filament count`);
    fil.addEventListener('input', () => { const v = Math.round(+fil.value); if (v >= 0 && v <= 5000) { y.filaments = v; edited(); } });
    F.appendChild(field('filaments (0 = spun)', fil));

    const ply = numInput(y.ply, 1, 24, 1, `${y.name} ply`);
    ply.addEventListener('input', () => { const v = Math.round(+ply.value); if (v >= 1 && v <= 24) { y.ply = v; edited(); } });
    F.appendChild(field('ply', ply));

    const tpm = numInput(y.tpm, 0, 5000, 1, `${y.name} twist tpm`);
    tpm.addEventListener('input', () => { const v = Math.round(+tpm.value); if (v >= 0 && v <= 5000) { y.tpm = v; edited(); } });
    F.appendChild(field('twist (tpm)', tpm));

    const twist = selectInput([['Z', 'Z'], ['S', 'S']], y.twist, `${y.name} twist direction`);
    twist.addEventListener('change', () => { y.twist = twist.value; edited(); });
    F.appendChild(field('twist direction', twist));

    const elastic = document.createElement('input'); elastic.type = 'checkbox'; elastic.checked = y.elastic;
    elastic.setAttribute('aria-label', `${y.name} elastic`);
    const relax = numInput(y.relax, 0.1, 1, 0.05, `${y.name} relaxation ratio`);
    relax.disabled = !y.elastic;
    elastic.addEventListener('change', () => { y.elastic = elastic.checked; relax.disabled = !y.elastic; edited(); });
    relax.addEventListener('input', () => { const v = +relax.value; if (v >= 0.1 && v <= 1) { y.relax = v; edited(); } });
    F.appendChild(field('elastic', elastic));
    F.appendChild(field('relaxed length ÷ loom length', relax));

    const color = document.createElement('input'); color.type = 'color'; color.value = y.color.toLowerCase();
    color.setAttribute('aria-label', `${y.name} colour`);
    color.addEventListener('input', () => { y.color = color.value.toUpperCase(); swatch.style.background = y.color; refreshYarnOptions(); edited(); });
    F.appendChild(field('colour', color, true));

    const row = el('div', 'wv-row');
    const rm = el('button', 'wv-btn wv-btn--small', '– remove'); rm.type = 'button';
    const used = D.yarnInUse(state, y.id);
    rm.disabled = used || state.yarns.length === 1;
    rm.title = used ? 'in use by a system' : state.yarns.length === 1 ? 'the library keeps one yarn' : 'remove this yarn';
    rm.addEventListener('click', () => {
      if (D.yarnInUse(state, y.id) || state.yarns.length === 1) return;
      state.yarns = state.yarns.filter(x => x !== y);
      openYarns.delete(y.id);
      buildYarns(); buildSystems('warp'); buildSystems('weft');
      edited();
    });
    row.appendChild(rm);
    F.appendChild(row);
    det.appendChild(F);
    host.appendChild(det);
  });
}
$('yarnAdd').addEventListener('click', () => {
  const id = D.nextYarnId(state.yarns);
  const tint = ['#C9B79C', '#8A8A85', '#A86B8A', '#5FA0A0', '#EDEDE8', '#D8CFB0'][state.yarns.length % 6];
  state.yarns.push(D.newYarn({ id, name: `yarn ${id.slice(1)}`, fiber: 'cotton', den: 150, color: tint }));
  openYarns.add(id);
  buildYarns(); buildSystems('warp'); buildSystems('weft');
  edited();
});

/* ------------------------------------------------------------- systems */

function buildSystems(dir) {
  const key = dir + 'Systems';
  const host = $(key);
  host.innerHTML = '';
  const list = state[key];
  list.forEach((sys, i) => {
    const box = el('div', 'wv-sys');
    const head = el('div', 'wv-sys-head');
    const name = document.createElement('input'); name.type = 'text'; name.maxLength = 40; name.value = sys.name;
    name.setAttribute('aria-label', `${dir} system ${i + 1} name`);
    name.addEventListener('input', () => { sys.name = name.value.slice(0, 40) || 'system'; edited(); });
    const ratioWrap = el('span', 'wv-ratio');
    const ratio = numInput(sys.ratio, 1, 99, 1, `${dir} system ${i + 1} threads in turn`);
    ratio.addEventListener('input', () => { const v = Math.round(+ratio.value); if (v >= 1 && v <= 99) { sys.ratio = v; edited(); } });
    ratioWrap.append(ratio, el('span', '', 'in turn'));
    const rm = el('button', 'wv-btn wv-btn--small', '–'); rm.type = 'button'; rm.title = 'remove this system';
    rm.disabled = list.length === 1;
    rm.addEventListener('click', () => { if (list.length > 1) { list.splice(i, 1); buildSystems(dir); edited(); } });
    head.append(name, ratioWrap, rm);
    box.appendChild(head);
    sys.seq.forEach((q, j) => {
      const row = el('div', 'wv-seq');
      const y0 = state.yarns.find(x => x.id === q.yarn);
      const sw = el('span', 'wv-swatch'); sw.dataset.yarn = q.yarn; sw.style.background = y0 ? y0.color : 'transparent';
      const sel = selectInput(state.yarns.map(y => [y.id, y.name]), q.yarn, `${dir} system ${i + 1} row ${j + 1} yarn`);
      sel.className = 'wv-yarnsel';
      sel.addEventListener('change', () => {
        q.yarn = sel.value; sw.dataset.yarn = q.yarn;
        const y = state.yarns.find(x => x.id === q.yarn); sw.style.background = y ? y.color : 'transparent';
        buildYarns();   // a yarn's remove button follows its use
        edited();
      });
      const cw = el('span', 'wv-count');
      const count = numInput(q.count, 1, 999, 1, `${dir} system ${i + 1} row ${j + 1} count`);
      count.addEventListener('input', () => { const v = Math.round(+count.value); if (v >= 1 && v <= 999) { q.count = v; edited(); } });
      cw.append(el('span', '', '×'), count);
      const rmq = el('button', 'wv-btn wv-btn--small', '–'); rmq.type = 'button'; rmq.title = 'remove this row';
      rmq.disabled = sys.seq.length === 1;
      rmq.addEventListener('click', () => { if (sys.seq.length > 1) { sys.seq.splice(j, 1); buildSystems(dir); buildYarns(); edited(); } });
      row.append(sw, sel, cw, rmq);
      box.appendChild(row);
    });
    const addRow = el('div', 'wv-row');
    const add = el('button', 'wv-btn wv-btn--small', '+ yarn row'); add.type = 'button';
    add.addEventListener('click', () => {
      const last = sys.seq[sys.seq.length - 1];
      const other = state.yarns.find(y => y.id !== last.yarn) || state.yarns[0];
      sys.seq.push({ yarn: other.id, count: 1 });
      buildSystems(dir); buildYarns(); edited();
    });
    addRow.appendChild(add);
    box.appendChild(addRow);
    host.appendChild(box);
  });
}
for (const dir of ['warp', 'weft']) {
  $(dir + 'SysAdd').addEventListener('click', () => {
    const list = state[dir + 'Systems'];
    const y = state.yarns[list.length % state.yarns.length];
    list.push(D.newSystem({ name: `system ${list.length + 1}`, ratio: 1, seq: [{ yarn: y.id, count: 1 }] }));
    buildSystems(dir); buildYarns(); edited();
  });
}

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

/* the view at `scale`, through the same paint() as the screen */
function renderToCanvas(scale) {
  const off = document.createElement('canvas');
  off.width = Math.round(L.width * scale); off.height = Math.round(L.height * scale);
  const c2 = off.getContext('2d');
  c2.setTransform(scale, 0, 0, scale, 0, 0);
  paint(canvasPainter(c2), state, L, sum);
  return off;
}

$('exportSvg').addEventListener('click', () => {
  download(new Blob([renderSvg(state, sum)], { type: 'image/svg+xml' }), `${stem()}.svg`);
});
$('exportWif').addEventListener('click', () => {
  download(new Blob([D.toWif(state, presetLabel())], { type: 'text/plain' }), `${stem()}.wif`);
});
$('exportPng').addEventListener('click', () => {
  const off = renderToCanvas(Math.min(2, 8192 / Math.max(L.width, L.height)));
  off.toBlob((blob) => { if (blob) download(blob, `${stem()}.png`); }, 'image/png');
});
$('exportCsv').addEventListener('click', () => {
  download(new Blob([D.constructionCsv(state, presetLabel())], { type: 'text/csv' }), `${stem()}-construction.csv`);
});

let jsPdfLoading = null;
function loadJsPdf() {
  if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (!jsPdfLoading) {
    jsPdfLoading = new Promise((resolve, reject) => {
      const sc = document.createElement('script');
      sc.src = JSPDF_URL;
      sc.onload = () => (window.jspdf && window.jspdf.jsPDF) ? resolve(window.jspdf.jsPDF) : reject(new Error('jsPDF did not load'));
      sc.onerror = () => reject(new Error('could not fetch jsPDF'));
      document.head.appendChild(sc);
    }).catch(err => { jsPdfLoading = null; throw err; });
  }
  return jsPdfLoading;
}

/* THE CONSTRUCTION PDF: the model's own sheet, section by section, in a
   monospace table, then the draft as drawn, through the same paint(). A4
   portrait, millimetres. */
async function exportPdf() {
  let jsPDF;
  try { jsPDF = await loadJsPdf(); }
  catch (err) { note = `<span class="warn">${err.message} — the CSV carries the same sheet</span>`; writeReadout(); return; }
  const sheet = D.constructionSheet(state, presetLabel());
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const X0 = 14, XV = 72, WV = 124, LH = 4.4, BOTTOM = 282;
  let y = 18;
  const page = (need) => { if (y + need > BOTTOM) { doc.addPage(); y = 18; } };
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
  doc.text('Construction sheet', X0, y); y += 7;
  doc.setFont('courier', 'normal'); doc.setFontSize(9);
  doc.text(`${presetLabel() || 'custom structure'} · ${state.shafts} shafts · single layer · ${new Date().toISOString().slice(0, 10)}`, X0, y); y += 8;
  for (const sec of sheet.sections) {
    page(LH * 3);
    doc.setFont('courier', 'bold'); doc.text(sec.title.toUpperCase(), X0, y); y += LH + 1;
    doc.setFont('courier', 'normal');
    for (const [k, v] of sec.rows) {
      /* both columns wrap to their own width, so a long yarn name cannot
         run into the value beside it */
      const keys = doc.splitTextToSize(String(k), XV - X0 - 3);
      const lines = doc.splitTextToSize(String(v), WV);
      const n = Math.max(keys.length, lines.length);
      page(LH * n);
      doc.text(keys, X0, y);
      doc.text(lines, XV, y);
      y += LH * n;
    }
    y += 3;
  }
  /* the draft as drawn, fitted to the page width — as a JPEG, because jsPDF
     stores a PNG as raw samples (a 32 x 32 draft came out at 3.8 MB) */
  const off = renderToCanvas(Math.min(2, 8192 / Math.max(L.width, L.height)));
  const maxW = 182, maxH = 250;
  let w = maxW, h = maxW * off.height / off.width;
  if (h > maxH) { h = maxH; w = maxH * off.width / off.height; }
  if (y + h > BOTTOM) { doc.addPage(); y = 18; }
  doc.setFont('courier', 'bold'); doc.text('DRAFT', X0, y); y += LH + 1;
  doc.addImage(off.toDataURL('image/jpeg', 0.92), 'JPEG', X0, y, w, h);
  doc.save(`${stem()}-construction.pdf`);
}
$('exportPdf').addEventListener('click', () => { exportPdf(); });

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
    mode: state.view.mode, fabric: state.view.fabric, cell: state.view.cell, trueScale: state.view.trueScale,
    yarns: state.yarns.length, warpSystems: state.warpSystems.length, weftSystems: state.weftSystems.length }),
  physical: () => D.physical(state),
  csv: () => D.constructionCsv(state, presetLabel()),
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
