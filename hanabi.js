// hanabi.js — the Hanabi deck designer page. Owns the DOM and the design
// state; the model is hanabi/deck.js, the art hanabi/layout.js and
// hanabi/firework.js, the files hanabi/export.js.

import {
  defaultDesign, normaliseDesign, serialiseDesign, activeSuits, cardCounts, deckCards,
  suitById, symbolClashes, imposition, copyCentreToAll, SIZE_PRESETS, INDEX_STYLES, CENTRE_LAYOUTS, NUMERAL_FILLS,
  RANKS, COPIES, VERSION,
} from './hanabi/deck.js';
import { SYMBOLS, SYMBOL_IDS } from './hanabi/symbols.js';
import { renderFace, renderBack } from './hanabi/layout.js';
import { fireworkSpec, MOTIFS, MOTIF_IDS, TIERS, TIER_RANKS } from './hanabi/firework.js';
import { exportPdf, exportZip, downloadBlob } from './hanabi/export.js';

const STORE_KEY = 'hanabi.design.v1';   // the key predates version 2; normaliseDesign migrates what it holds
const VIEW_KEY = 'hanabi.view.v1';
const $ = (id) => document.getElementById(id);

function loadStored() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultDesign();
    const { design } = normaliseDesign(JSON.parse(raw), SYMBOL_IDS);
    return design || defaultDesign();
  } catch { return defaultDesign(); }
}
let design = loadStored();
let view = { mode: 'suit', suit: 'red', grayscale: false, guides: false, zoom: 150 };
try { Object.assign(view, JSON.parse(localStorage.getItem(VIEW_KEY) || '{}')); } catch { /* storage unavailable */ }

let saveTimer = 0;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORE_KEY, serialiseDesign(design)); } catch { /* private window or full: the page still works */ }
  }, 150);
}
function persistView() { try { localStorage.setItem(VIEW_KEY, JSON.stringify(view)); } catch { /* ignore */ } }

function changed() { persist(); syncReadouts(); renderPreview(); }

// ---------- suits panel ----------
function symbolSvg(id) {
  const s = SYMBOLS[id];
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${s.d}" fill="currentColor"${s.evenodd ? ' fill-rule="evenodd"' : ''}/></svg>`;
}
function motifOptions() {
  const groups = {};
  for (const id of MOTIF_IDS) (groups[MOTIFS[id].group] ||= []).push(id);
  return Object.entries(groups).map(([g, ids]) => `<optgroup label="${g}">${ids.map((id) =>
    `<option value="${id}">${MOTIFS[id].item ? `${MOTIFS[id].item} · ` : ''}${MOTIFS[id].label}</option>`).join('')}</optgroup>`).join('');
}
const CENTRE_SHORT = { single: 'One burst', count: 'Count of bursts', bleed: 'Full bleed' };
const motifLabel = (id) => `${MOTIFS[id].item ? `${MOTIFS[id].item} · ` : ''}${MOTIFS[id].label}`;
function buildSuitRows() {
  const root = $('suitRows');
  root.innerHTML = '';
  for (const suit of design.suits) {
    const row = document.createElement('div');
    row.className = 'hb-suit';
    row.dataset.suit = suit.id;
    row.innerHTML = `<div class="hb-suit__head">
        <input type="text" maxlength="24" aria-label="${suit.id} suit name" data-f="name">
        <input type="color" aria-label="${suit.id} primary colour" data-f="primary">
        <input type="color" aria-label="${suit.id} secondary colour" data-f="secondary">
      </div>
      <div class="hb-suit__syms" role="group" aria-label="${suit.id} symbol">${SYMBOL_IDS.map((id) =>
        `<button type="button" class="hb-sym" data-sym="${id}" aria-label="${SYMBOLS[id].label}" title="${SYMBOLS[id].label}">${symbolSvg(id)}</button>`).join('')}</div>
      <div class="hb-suit__centre">
        <label for="c-${suit.id}-layout">Centre</label><label for="c-${suit.id}-motif">Firework</label>
        <select id="c-${suit.id}-layout" data-c="layout">${Object.keys(CENTRE_LAYOUTS).map((k) => `<option value="${k}" title="${CENTRE_LAYOUTS[k]}">${CENTRE_SHORT[k]}</option>`).join('')}</select>
        <select id="c-${suit.id}-motif" data-c="motif">${motifOptions()}</select>
        <label for="c-${suit.id}-tier">Second tier, ranks ${TIER_RANKS.join(' and ')}</label>${suit.multicolor
          ? `<label for="c-${suit.id}-numeral">Numeral</label>` : '<span></span>'}
        <select id="c-${suit.id}-tier" data-c="tier">${Object.entries(TIERS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>${suit.multicolor
          ? `<select id="c-${suit.id}-numeral" data-n>${Object.entries(NUMERAL_FILLS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>` : ''}
        <button type="button" class="hb-suit__all" data-all>same centre for every suit</button>
      </div>`;
    row.addEventListener('input', (e) => {
      const fld = e.target.dataset.f;
      if (!fld) return;
      suit[fld] = fld === 'name' ? (e.target.value || suit.id) : e.target.value.toUpperCase();
      changed();
    });
    row.addEventListener('change', (e) => {
      if (e.target.matches('[data-n]')) { suit.numeral = e.target.value; changed(); return; }
      const c = e.target.dataset.c;
      if (!c) return;
      suit.centre[c] = e.target.value;
      changed();
    });
    row.addEventListener('click', (e) => {
      if (e.target.closest('[data-all]')) { copyCentreToAll(design, suit.id); changed(); return; }
      const b = e.target.closest('.hb-sym');
      if (!b) return;
      suit.symbol = b.dataset.sym;
      changed();
    });
    root.appendChild(row);
  }
}
function syncSuitRows() {
  const taken = new Map(activeSuits(design).map((s) => [s.symbol, s.id]));
  for (const row of $('suitRows').children) {
    const suit = suitById(design, row.dataset.suit);
    row.hidden = !!suit.multicolor && !design.rainbow;
    for (const inp of row.querySelectorAll('[data-f]')) {
      if (document.activeElement !== inp) inp.value = inp.dataset.f === 'name' ? suit.name : suit[inp.dataset.f].toLowerCase();
    }
    for (const sel of row.querySelectorAll('[data-c]')) sel.value = suit.centre[sel.dataset.c];
    const tier = row.querySelector('[data-c=tier]');
    tier.disabled = suit.centre.layout !== 'single';
    tier.title = tier.disabled ? 'A second tier sits under a single burst; this centre has none.' : '';
    const num = row.querySelector('[data-n]');
    if (num) {
      num.value = suit.numeral;
      num.disabled = design.index === 'band';
      num.title = num.disabled ? 'With the band index the band itself is the rainbow; the numeral is drawn in ink on it.'
        : 'Solid: the suit colour. Rainbow gradient: the other suits\' colours, top to bottom.';
    }
    for (const b of row.querySelectorAll('.hb-sym')) {
      b.setAttribute('aria-pressed', String(b.dataset.sym === suit.symbol));
      b.classList.toggle('is-taken', taken.has(b.dataset.sym) && taken.get(b.dataset.sym) !== suit.id);
      b.style.color = suit.primary;
    }
  }
  const clash = symbolClashes(design);
  const note = $('clashNote');
  note.hidden = !clash.size;
  if (clash.size) {
    const names = [...clash].map((id) => suitById(design, id).name).join(', ');
    note.textContent = `! ${names} share a symbol — those suits differ by colour alone, which a colour-blind player cannot read. Give each its own symbol.`;
  }
}

// ---------- bindings for the plain controls ----------
function bindValue(id, get, set, evt = 'input') {
  const el = $(id);
  el.addEventListener(evt, () => { set(el.type === 'checkbox' ? el.checked : el.value); changed(); });
  return { el, get };
}
const bindings = [
  bindValue('rainbow', () => design.rainbow, (v) => { design.rainbow = v; }, 'change'),
  bindValue('sizePreset', () => design.size.preset, (v) => {
    design.size.preset = v;
    if (SIZE_PRESETS[v]) { design.size.w = SIZE_PRESETS[v].w; design.size.h = SIZE_PRESETS[v].h; }
  }, 'change'),
  bindValue('sizeW', () => design.size.w, (v) => { if (+v >= 30 && +v <= 140) design.size.w = +v; }, 'change'),
  bindValue('sizeH', () => design.size.h, (v) => { if (+v >= 30 && +v <= 140) design.size.h = +v; }, 'change'),
  bindValue('bleed', () => design.bleed, (v) => { if (+v >= 0 && +v <= 5) design.bleed = +v; }, 'change'),
  bindValue('safe', () => design.safe, (v) => { if (+v >= 0 && +v <= 8) design.safe = +v; }, 'change'),
  bindValue('corners', () => design.corners, (v) => { design.corners = v; }, 'change'),
  bindValue('faceBg', () => design.face.bg.toLowerCase(), (v) => { design.face.bg = v.toUpperCase(); }),
  bindValue('backBg', () => design.back.bg.toLowerCase(), (v) => { design.back.bg = v.toUpperCase(); }),
  bindValue('backFg', () => design.back.fg.toLowerCase(), (v) => { design.back.fg = v.toUpperCase(); }),
  bindValue('backPattern', () => design.back.pattern, (v) => { design.back.pattern = v; }, 'change'),
  bindValue('backMark', () => design.back.mark, (v) => { design.back.mark = v; }, 'change'),
  ...['clueBg', 'clueFg', 'fuseBg', 'fuseFg'].map((k) =>
    bindValue(k, () => design.tokens[k].toLowerCase(), (v) => { design.tokens[k] = v.toUpperCase(); })),
  bindValue('paper', () => design.print.paper, (v) => { design.print.paper = v; }, 'change'),
  bindValue('orientation', () => design.print.orientation, (v) => { design.print.orientation = v; }, 'change'),
  bindValue('cut', () => design.print.cut, (v) => { design.print.cut = v; }, 'change'),
  bindValue('flip', () => design.print.flip, (v) => { design.print.flip = v; }, 'change'),
  bindValue('cropMarks', () => design.print.cropMarks, (v) => { design.print.cropMarks = v; }, 'change'),
  bindValue('duplex', () => design.print.duplex, (v) => { design.print.duplex = v; }, 'change'),
];

function syncControls() {
  for (const b of bindings) {
    if (document.activeElement === b.el && b.el.type !== 'checkbox' && b.el.tagName !== 'SELECT') continue;
    if (b.el.type === 'checkbox') b.el.checked = !!b.get(); else b.el.value = b.get();
  }
  const custom = design.size.preset === 'custom';
  $('sizeW').disabled = !custom; $('sizeH').disabled = !custom;
  for (const btn of $('indexSeg').children) btn.setAttribute('aria-checked', String(btn.dataset.index === design.index));
  for (const btn of $('viewSeg').children) btn.setAttribute('aria-checked', String(btn.dataset.view === view.mode));
  syncSuitRows();
}

function syncReadouts() {
  const n = cardCounts(design);
  $('deckCount').textContent = `${n.suits} suits — ${n.cards} cards + ${n.clue + n.fuse} tokens`;
  $('sizeVal').textContent = `${design.size.w} × ${design.size.h} mm`;
  $('indexVal').textContent = design.index;
  $('indexNote').textContent = `${INDEX_STYLES[design.index]} — the same on every suit, so the numeral and symbol are always in one place.`;
  const imp = imposition(design, design.print.paper);
  const sheets = imp.perSheet ? Math.ceil(n.total / imp.perSheet) : 0;
  $('flipRow').hidden = !design.print.duplex;
  $('impositionNote').textContent = imp.perSheet
    ? `${imp.paper.label} ${imp.paper.orientation}: ${imp.cols} × ${imp.rows} = ${imp.perSheet} cards a sheet — ${n.total} faces on ${sheets} sheet${sheets === 1 ? '' : 's'}${design.print.duplex ? `, each followed by its back sheet (${2 * sheets} pages)` : ', + 1 sheet of backs'}.`
      + (design.print.cut === 'shared' ? ' Shared cuts: one cut between neighbours; bleed only round the outside.' : ` Each card keeps its ${design.bleed} mm bleed.`)
    : '✕ this card size does not fit on the chosen paper with room for crop marks.';
  // view-suit select
  const vs = $('viewSuit'), specSel = $('specSuit');
  const opts = activeSuits(design).map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
  for (const sel of [vs, specSel]) {
    const cur = sel === vs ? view.suit : sel.value;
    sel.innerHTML = opts;
    sel.value = activeSuits(design).some((s) => s.id === cur) ? cur : activeSuits(design)[0].id;
  }
  view.suit = vs.value;
  vs.hidden = view.mode === 'deck';
  syncSpec();
  syncControls();
}
function syncSpec() {
  const suit = suitById(design, $('specSuit').value) || activeSuits(design)[0];
  $('specOut').textContent = JSON.stringify(fireworkSpec(design, suit, +$('specRank').value), null, 1);
}
const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- preview ----------
let uid = 0;
function cardFigure(svg, caption) {
  return `<figure class="hb-card">${svg}<figcaption>${escapeHtml(caption)}</figcaption></figure>`;
}
function suitRow(d, suit, title) {
  const cards = RANKS.map((r) => cardFigure(renderFace(d, { kind: 'card', suitId: suit.id, rank: r },
    { guides: view.guides, idPrefix: `p${uid++}` }), `${suit.name} ${r} · ×${COPIES[r]}`)).join('');
  return `<div class="hb-group"><p class="hb-group__title">${title}</p><div class="hb-cards">${cards}</div></div>`;
}
function extrasRow() {
  const g = { guides: view.guides };
  return `<div class="hb-group"><p class="hb-group__title">Back <span class="hb-sep">—</span> tokens</p><div class="hb-cards">`
    + cardFigure(renderBack(design, g), 'Back')
    + cardFigure(renderFace(design, { kind: 'clue' }, g), 'Clue token · ×8')
    + cardFigure(renderFace(design, { kind: 'fuse' }, g), 'Fuse token · ×3')
    + '</div></div>';
}
function renderPreview() {
  const stage = $('stage');
  stage.classList.toggle('is-gray', view.grayscale);
  document.documentElement.style.setProperty('--hb-card-w', `${view.zoom}px`);
  $('guideLegend').hidden = !view.guides;
  const suit = suitById(design, view.suit) || activeSuits(design)[0];
  let html = '';
  const withCentre = (patch) => ({ ...design, suits: design.suits.map((s) => (s.id === suit.id ? { ...s, centre: { ...s.centre, ...patch } } : s)) });
  const sep = ' <span class="hb-sep">—</span> ';
  if (view.mode === 'suit') {
    html = suitRow(design, suit, `<b>${escapeHtml(suit.name)}</b>${sep}${CENTRE_LAYOUTS[suit.centre.layout].toLowerCase()}${sep}${escapeHtml(motifLabel(suit.centre.motif))}`) + extrasRow();
  } else if (view.mode === 'layouts') {
    for (const L of Object.keys(CENTRE_LAYOUTS)) {
      html += suitRow(withCentre({ layout: L }), suit, `<b>${CENTRE_LAYOUTS[L]}</b>${sep}${escapeHtml(motifLabel(suit.centre.motif))}${L === suit.centre.layout ? `${sep}in use` : ''}`);
    }
  } else if (view.mode === 'fireworks') {
    // every motif for this suit, as a single burst under the deck's corner index
    for (const m of MOTIF_IDS) {
      const M = MOTIFS[m], on = suit.centre.motif === m;
      const title = `<b>${escapeHtml(motifLabel(m))}</b>${M.ref ? `${sep}catalogue № ${M.ref}` : M.note ? `${sep}${M.note}` : ''}`
        + `<button type="button" class="hb-pick" data-pick="${m}" aria-pressed="${on}">${on ? `${escapeHtml(suit.name)} uses this` : `use for ${escapeHtml(suit.name)}`}</button>`;
      html += suitRow(withCentre({ layout: 'single', motif: m, tier: 'none' }), suit, title);
    }
  } else {
    const cards = deckCards(design);
    html = `<div class="hb-group"><p class="hb-group__title"><b>Full deck</b> <span class="hb-sep">—</span> ${cards.length} faces + back</p><div class="hb-cards">`
      + cards.map((c) => cardFigure(renderFace(design, c, { guides: view.guides, idPrefix: `p${uid++}` }),
        c.kind === 'card' ? `${suitById(design, c.suitId).name} ${c.rank}` : `${c.kind} token`)).join('')
      + cardFigure(renderBack(design, { guides: view.guides }), 'Back') + '</div></div>';
  }
  stage.innerHTML = html;
}

// ---------- wiring ----------
$('indexSeg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-index]'); if (!b) return;
  design.index = b.dataset.index; changed();
});
$('stage').addEventListener('click', (e) => {
  const b = e.target.closest('[data-pick]'); if (!b) return;
  const suit = suitById(design, view.suit); if (!suit) return;
  suit.centre.motif = b.dataset.pick; changed();
});
$('viewSeg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-view]'); if (!b) return;
  view.mode = b.dataset.view; persistView(); syncReadouts(); renderPreview();
});
$('viewSuit').addEventListener('change', (e) => { view.suit = e.target.value; persistView(); renderPreview(); });
$('grayscale').addEventListener('change', (e) => { view.grayscale = e.target.checked; persistView(); renderPreview(); });
$('guides').addEventListener('change', (e) => { view.guides = e.target.checked; persistView(); renderPreview(); });
$('zoom').addEventListener('input', (e) => {
  view.zoom = +e.target.value; persistView();
  document.documentElement.style.setProperty('--hb-card-w', `${view.zoom}px`);
});
$('specSuit').addEventListener('change', syncSpec);
$('specRank').addEventListener('change', syncSpec);

async function runExport(btn, fn, label) {
  const status = $('exportStatus');
  const btns = [$('exportPdf'), $('exportZip')];
  btns.forEach((b) => { b.disabled = true; });
  try {
    status.textContent = `${label}: drawing cards…`;
    const res = await fn({ onProgress: (d, t) => { status.textContent = `${label}: card ${d} of ${t}…`; } });
    status.textContent = `${label}: done${res && res.pages ? ` — ${res.pages} pages` : ''}.`;
  } catch (err) {
    status.textContent = `✕ ${label} failed — ${err.message}`;
  } finally { btns.forEach((b) => { b.disabled = false; }); }
}
$('exportPdf').addEventListener('click', () => runExport($('exportPdf'), (o) => exportPdf(design, o), 'PDF'));
$('exportZip').addEventListener('click', () => runExport($('exportZip'), (o) => exportZip(design, o), 'PNG zip'));

$('saveJson').addEventListener('click', () => {
  downloadBlob(new Blob([serialiseDesign(design)], { type: 'application/json' }), 'hanabi-deck.json');
  $('fileStatus').textContent = 'Saved hanabi-deck.json.';
});
$('loadJson').addEventListener('change', async (e) => {
  const file = e.target.files[0]; e.target.value = '';
  if (!file) return;
  try {
    const { design: d, notes } = normaliseDesign(JSON.parse(await file.text()), SYMBOL_IDS);
    if (!d) { $('fileStatus').textContent = `✕ ${notes.join('; ')}`; return; }
    design = d; changed();
    $('fileStatus').textContent = notes.length ? `Loaded ${file.name} — ${notes.join('; ')}` : `Loaded ${file.name} — clean read.`;
  } catch (err) { $('fileStatus').textContent = `✕ ${file.name} is not a design file — ${err.message}`; }
});
$('resetDesign').addEventListener('click', () => {
  design = defaultDesign(); changed(); $('fileStatus').textContent = 'Reset to the default deck.';
});

$('grayscale').checked = view.grayscale;
$('guides').checked = view.guides;
$('zoom').value = view.zoom;
buildSuitRows();
syncReadouts();
renderPreview();

// Test chrome for tools/verify-hanabi.mjs — read-only views of the page state.
window.__hanabi = {
  version: VERSION,
  design: () => JSON.parse(JSON.stringify(design)),
  setDesign: (d) => { const n = normaliseDesign(d, SYMBOL_IDS); if (n.design) { design = n.design; changed(); } return n.notes; },
  view: () => ({ ...view }),
  exportPdf: (o) => exportPdf(design, o),
  exportZip: (o) => exportZip(design, o),
};
