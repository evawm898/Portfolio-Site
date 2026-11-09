// hanabi.js — the Hanabi deck designer page. Owns the DOM and the design
// state; the model is hanabi/deck.js, the art hanabi/layout.js and
// hanabi/firework.js, the files hanabi/export.js.

import {
  defaultDesign, normaliseDesign, serialiseDesign, activeSuits, cardCounts, deckCards,
  suitById, symbolClashes, imposition, copyCentreToAll, SIZE_PRESETS, INDEX_STYLES, COMPOSE, COUNT_MODES, NUMERAL_FILLS,
  RANKS, COPIES, VERSION, SCENES, cellHasOverride, cellOf, clearCell, applyArrangementToRank, ITEM_LIMITS,
} from './hanabi/deck.js';
import { SYMBOLS, SYMBOL_IDS } from './hanabi/symbols.js';
import { renderFace, renderBack, placementFor, cellItems } from './hanabi/layout.js';
import { fireworkSpec, defaultSpec, renderFirework, motifParams, MOTIFS, MOTIF_IDS, TIERS, TIER_RANKS, TYPES, PARAMS } from './hanabi/firework.js';
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
let view = { mode: 'suit', suit: 'red', grayscale: false, guides: false, zoom: 150, cell: { suit: 'red', rank: 1 }, scope: 'row' };
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
const COMPOSE_SHORT = { count: 'Count', countscale: 'Count + scale', scale: 'Scale', column: 'Column (phase 1)', bleed: 'Full bleed' };
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
        <label for="c-${suit.id}-compose">Rank shown by</label><label for="c-${suit.id}-motif">Firework</label>
        <select id="c-${suit.id}-compose" data-c="compose">${Object.keys(COMPOSE).map((k) => `<option value="${k}" title="${COMPOSE[k]}">${COMPOSE_SHORT[k]}</option>`).join('')}</select>
        <select id="c-${suit.id}-motif" data-c="motif">${motifOptions()}</select>
        <label for="c-${suit.id}-tier">Second tier, ranks ${TIER_RANKS.join(' and ')}</label>${suit.multicolor
          ? `<label for="c-${suit.id}-numeral">Corner index</label>` : '<span></span>'}
        <select id="c-${suit.id}-tier" data-c="tier">${Object.entries(TIERS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>${suit.multicolor
          ? `<select id="c-${suit.id}-numeral" data-n>${Object.entries(NUMERAL_FILLS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>` : ''}
        <button type="button" class="hb-suit__all" data-all>same centre for every suit</button>
      </div>`;
    // Each handler looks its suit up when it fires: Reset and Load replace the
    // design, and a suit object captured here would be an orphan after either.
    const me = () => suitById(design, suit.id);
    row.addEventListener('input', (e) => {
      const fld = e.target.dataset.f;
      if (!fld) return;
      me()[fld] = fld === 'name' ? (e.target.value || suit.id) : e.target.value.toUpperCase();
      changed();
    });
    row.addEventListener('change', (e) => {
      if (e.target.matches('[data-n]')) { me().numeral = e.target.value; changed(); return; }
      const c = e.target.dataset.c;
      if (!c) return;
      me().centre[c] = e.target.value;
      changed();
    });
    row.addEventListener('click', (e) => {
      if (e.target.closest('[data-all]')) { copyCentreToAll(design, suit.id); changed(); return; }
      const b = e.target.closest('.hb-sym');
      if (!b) return;
      me().symbol = b.dataset.sym;
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
    tier.disabled = suit.centre.compose !== 'scale';
    tier.title = tier.disabled ? 'A second tier sits under a single burst (Scale); this centre has none.' : '';
    const num = row.querySelector('[data-n]');
    if (num) {
      num.value = suit.numeral;
      num.disabled = design.index === 'band';
      num.title = num.disabled ? 'With the band index the band itself is the rainbow; the numeral and symbol are drawn in ink on it.'
        : 'Solid: the suit colour. Rainbow gradient: the numeral and symbol run through the other suits\' colours, top to bottom.';
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
  bindValue('sceneOn', () => design.scene.on, (v) => { design.scene.on = v; }, 'change'),
  bindValue('sceneKind', () => design.scene.kind, (v) => { design.scene.kind = v; }, 'change'),
  bindValue('sceneColor', () => design.scene.color.toLowerCase(), (v) => { design.scene.color = v.toUpperCase(); }),
  bindValue('sceneHeight', () => Math.round(design.scene.height * 100), (v) => { design.scene.height = +v / 100; }),
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
  $('sceneRows').hidden = !design.scene.on;
  $('sceneVal').textContent = design.scene.on ? `${SCENES[design.scene.kind].toLowerCase()}, ${Math.round(design.scene.height * 100)}%` : 'off';
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
  vs.hidden = view.mode === 'deck' || view.mode === 'fireworks';
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
  if (view.mode === 'fireworks') { renderBoard(); return; }
  board.sig = null;
  const suit = suitById(design, view.suit) || activeSuits(design)[0];
  let html = '';
  const withCentre = (patch) => ({ ...design, suits: design.suits.map((s) => (s.id === suit.id ? { ...s, centre: { ...s.centre, ...patch } } : s)) });
  const sep = ' <span class="hb-sep">—</span> ';
  if (view.mode === 'suit') {
    html = suitRow(design, suit, `<b>${escapeHtml(suit.name)}</b>${sep}${COMPOSE[suit.centre.compose].toLowerCase()}${sep}${escapeHtml(motifLabel(suit.centre.motif))}`) + extrasRow();
  } else if (view.mode === 'layouts') {
    for (const L of Object.keys(COMPOSE)) {
      html += suitRow(withCentre({ compose: L }), suit, `<b>${COMPOSE[L]}</b>${sep}${escapeHtml(motifLabel(suit.centre.motif))}${L === suit.centre.compose ? `${sep}in use` : ''}`);
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

// ---------- the Firework board ----------
//
// Rows are the suits in play, columns ranks 1-5; every cell is a live
// thumbnail of that card's centre art. Clicking a cell opens the editor beside
// the board. Three levels, each a scope the editor writes to:
//   the suit's firework (type + parameters)   suit.centre.motif, suit.firework
//   the rank composition                      suit.centre.compose; the rank
//                                             column's arrangement under Count
//   this card                                 design.fireworks[suit][rank],
//                                             per key, and its own arrangement
// The editor's controls are rebuilt only when its STRUCTURE changes (another
// cell, type, composition or scope), so a slider being dragged is never
// replaced under the pointer; everything else repaints in place.
const board = { sig: null, drag: null, raf: 0 };
const fmtParam = (k, v) => (PARAMS[k].unit ? `${Math.round(v)}${PARAMS[k].unit}` : PARAMS[k].step >= 1 ? String(Math.round(v)) : (+v).toFixed(2));

function selCell() {
  const suits = activeSuits(design);
  let { suit, rank } = view.cell || {};
  if (!suits.some((s) => s.id === suit)) suit = suits[0].id;
  if (!RANKS.includes(rank)) rank = 1;
  view.cell = { suit, rank };
  return { suit: suitById(design, suit), rank };
}
function selectCell(suitId, rank) { view.cell = { suit: suitId, rank }; persistView(); renderBoard(); }

function motifThumb(suit, m) {
  const spec = defaultSpec(suit, 5, design.suits, m, 'none', 'scale');
  return `<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" fill="${design.face.bg}"/>${renderFirework(spec, { cx: 20, cy: 20, r: 18.5 })}</svg>`;
}

function boardSkeleton() {
  const ranks = RANKS.map((r) => `<div class="hb-board__rank">${r}<span class="hb-dim"> ×${COPIES[r]}</span></div>`).join('');
  const rows = activeSuits(design).map((s) => `<div class="hb-board__suit" data-row="${s.id}"></div>`
    + RANKS.map((r) => `<button type="button" class="hb-cell" data-cell="${s.id}:${r}"></button>`).join('')).join('');
  return `<div class="hb-boardwrap">
    <div class="hb-boardcol">
      <div class="hb-board__bar"><p class="hb-group__title"><b>Firework board</b> <span class="hb-sep">—</span> every suit × rank</p>
        <label class="hb-check"><input type="checkbox" id="boardGray"> Greyscale</label></div>
      <div class="hb-board" role="grid" aria-label="Firework board"><div></div>${ranks}${rows}</div>
      <p class="hb-note">A dot marks a card with settings of its own. Edits to a suit reach every card in its row that has not overridden that setting.</p>
    </div>
    <div class="hb-editor" id="editor" aria-label="Card editor"></div>
  </div>`;
}

function paintBoard() {
  const { suit: sel, rank: selR } = selCell();
  $('boardGray').checked = view.grayscale;
  for (const s of activeSuits(design)) {
    const head = $('stage').querySelector(`[data-row="${s.id}"]`);
    if (head) head.innerHTML = `<span class="hb-board__sym" style="color:${s.primary}">${symbolSvg(s.symbol)}</span>`
      + `<span><b>${escapeHtml(s.name)}</b><br><span class="hb-dim">${escapeHtml(MOTIFS[s.centre.motif].label)} · ${COMPOSE_SHORT[s.centre.compose]}</span></span>`;
    for (const r of RANKS) {
      const cell = $('stage').querySelector(`[data-cell="${s.id}:${r}"]`);
      const own = cellHasOverride(design, s.id, r);
      cell.innerHTML = renderFace(design, { kind: 'card', suitId: s.id, rank: r }, { centreOnly: true, idPrefix: `b${s.id}${r}` })
        + (own ? '<span class="hb-cell__mark" aria-hidden="true"></span>' : '');
      cell.setAttribute('aria-pressed', String(s.id === sel.id && r === selR));
      cell.setAttribute('aria-label', `${s.name} ${r}${own ? ', has its own settings' : ''}`);
      cell.classList.toggle('is-own', own);
    }
  }
}

function renderBoard() {
  const stage = $('stage');
  const suitsSig = activeSuits(design).map((s) => s.id).join();
  if (!stage.querySelector('.hb-boardwrap') || board.suitsSig !== suitsSig) {
    stage.innerHTML = boardSkeleton();
    board.suitsSig = suitsSig; board.sig = null;
  }
  paintBoard();
  const { suit, rank } = selCell();
  const over = fireworkSpec(design, suit, rank);
  const sig = [suit.id, rank, over.motif, suit.centre.compose, view.scope].join('|');
  if (sig !== board.sig) { buildEditor(suit, rank); board.sig = sig; }
  paintEditor(suit, rank);
}

function paramControl(k) {
  const P = PARAMS[k];
  const clear = `<button type="button" class="hb-clear" data-clear="${k}" title="Back to the suit's value">↺</button>`;
  if (P.kind === 'bool') return `<label class="hb-param hb-check" data-param="${k}"><input type="checkbox" data-p="${k}"> ${P.label}${clear}</label>`;
  if (P.kind === 'color') return `<div class="hb-param" data-param="${k}"><label for="p-${k}">${P.label}</label><input type="color" id="p-${k}" data-p="${k}">${clear}</div>`;
  return `<div class="hb-param" data-param="${k}"><label for="p-${k}">${P.label}</label>`
    + `<input type="range" id="p-${k}" data-p="${k}" min="${P.min}" max="${P.max}" step="${P.step}"><output data-o="${k}"></output>${clear}</div>`;
}

function buildEditor(suit, rank) {
  const spec = fireworkSpec(design, suit, rank), card = view.scope === 'card';
  const groups = {};
  for (const id of MOTIF_IDS) (groups[MOTIFS[id].group] ||= []).push(id);
  const gallery = Object.entries(groups).map(([g, ids]) => `<p class="hb-ed__label">${g}</p><div class="hb-types">${ids.map((m) =>
    `<button type="button" class="hb-type" data-type="${m}" title="${escapeHtml(MOTIFS[m].label)}${MOTIFS[m].note ? ` — ${escapeHtml(MOTIFS[m].note)}` : ''}">${motifThumb(suit, m)}<span>${escapeHtml(MOTIFS[m].label)}</span></button>`).join('')}</div>`).join('');
  const counting = COUNT_MODES.includes(suit.centre.compose);
  $('editor').innerHTML = `
    <div class="hb-ed__head"><p class="hb-ed__title"><b>${escapeHtml(suit.name)} ${rank}</b></p>
      <button type="button" class="hb-btn hb-btn--ghost" id="edReset">Reset to suit</button></div>
    <p class="hb-ed__own" id="edOwn"></p>
    <div class="hb-ed__card" id="edCard"></div>
    <p class="hb-note" id="edHint">${counting ? 'Drag a firework to move it; drag its square to resize it and its round handle to turn it.' : 'One firework: switch the row to Count to arrange several.'}</p>
    ${counting ? `<div class="hb-actions">
      <button type="button" class="hb-btn hb-btn--ghost" id="edApplyRank">Use for every ${rank}</button>
      <button type="button" class="hb-btn hb-btn--ghost" id="edResetItems">Reset arrangement</button>
      <button type="button" class="hb-btn hb-btn--ghost" id="edResetRank">Rank ${rank} column to default</button></div>` : ''}
    <div class="hb-ed__sec"><p class="hb-ed__label">Rank composition <span class="hb-dim">— ${escapeHtml(suit.name)} row</span></p>
      <div class="hb-row"><label for="edCompose">Rank shown by</label><select id="edCompose">${Object.keys(COMPOSE).map((k) => `<option value="${k}" title="${COMPOSE[k]}">${COMPOSE_SHORT[k]}</option>`).join('')}</select></div>
      <div class="hb-row"><label for="edTier">Second tier</label><select id="edTier">${Object.entries(TIERS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div></div>
    <div class="hb-ed__sec"><div class="hb-seg" id="edScope" role="radiogroup" aria-label="Edit scope">
        <button type="button" role="radio" data-scope="row">${escapeHtml(suit.name)} row</button><button type="button" role="radio" data-scope="card">This card only</button></div>
      <p class="hb-note">${card ? `Changes here belong to ${escapeHtml(suit.name)} ${rank} alone; ↺ hands a setting back to the suit.` : `Changes here reach every ${escapeHtml(suit.name)} card that has not set its own.`}</p>
      <p class="hb-ed__label">Firework type <span class="hb-dim" id="edTypeName"></span></p>${gallery}
      <p class="hb-ed__label">Parameters</p><div class="hb-params">${motifParams(spec.motif).map(paramControl).join('') || '<p class="hb-note">This firework has no parameters.</p>'}</div></div>`;
}

function paintEditor(suit, rank) {
  const ed = $('editor'); if (!ed.firstElementChild) return;
  const spec = fireworkSpec(design, suit, rank), own = cellOf(design, suit.id, rank) || {}, card = view.scope === 'card';
  const counting = COUNT_MODES.includes(suit.centre.compose);
  const keys = Object.keys(own);
  $('edOwn').textContent = keys.length ? `Its own ${keys.map((k) => (k === 'items' ? 'arrangement' : PARAMS[k] ? PARAMS[k].label.toLowerCase() : k)).join(', ')}` : `As the ${suit.name} row`;
  $('edReset').disabled = !keys.length;
  let svg = renderFace(design, { kind: 'card', suitId: suit.id, rank }, { idPrefix: 'ed' });
  if (counting) svg = svg.replace(/<\/svg>$/, handlesSvg(placementFor(design, suit, rank)) + '</svg>');
  $('edCard').innerHTML = svg;
  $('edCard').classList.toggle('is-gray', view.grayscale);
  $('edCompose').value = suit.centre.compose;
  $('edTier').value = suit.centre.tier; $('edTier').disabled = suit.centre.compose !== 'scale';
  for (const b of $('edScope').children) b.setAttribute('aria-checked', String(b.dataset.scope === view.scope));
  $('edTypeName').textContent = `— ${MOTIFS[spec.motif].label}${own.motif ? ' (this card)' : ''}`;
  for (const b of ed.querySelectorAll('[data-type]')) b.setAttribute('aria-pressed', String(b.dataset.type === spec.motif));
  const rowVal = (k) => { const v = suit.firework[k]; return v !== undefined && v !== '' ? v : defaultSpec(suit, 5, design.suits, spec.motif)[k]; };
  for (const el of ed.querySelectorAll('[data-p]')) {
    const k = el.dataset.p, P = PARAMS[k];
    let v = card ? spec[k] : rowVal(k);
    if (P.kind === 'color') v = v || (k === 'coreColor' ? spec.colors[1] || spec.colors[0] : spec.colors[0]);
    else if (v === undefined) v = P.kind === 'bool' ? false : k === 'rotation' ? 0 : P.min;   // a motif with no default of its own
    if (document.activeElement !== el || el.type === 'checkbox') { if (el.type === 'checkbox') el.checked = !!v; else el.value = P.kind === 'color' ? v.toLowerCase() : v; }
    const out = ed.querySelector(`[data-o="${k}"]`); if (out) out.textContent = fmtParam(k, v);
    const has = card ? own[k] !== undefined : suit.firework[k] !== undefined && suit.firework[k] !== '';
    el.closest('[data-param]').classList.toggle('is-own', has);
  }
  for (const [id, on] of [['edApplyRank', true], ['edResetItems', !!own.items], ['edResetRank', !!design.arrangements[rank]]]) if ($(id)) $(id).disabled = !on;
}

// The drag handles over the editor's card, in card mm.
function handlesSvg(pl) {
  const h = Math.max(0.9, pl.unit * 0.07), sw = h * 0.28;
  return '<g class="hb-handles">' + `<rect x="${pl.field.x}" y="${pl.field.y}" width="${pl.field.w}" height="${pl.field.h}" fill="none" stroke="#2FA3A3" stroke-opacity="0.35" stroke-width="${sw}" stroke-dasharray="${sw * 3} ${sw * 3}" pointer-events="none"/>`
    + pl.items.map((it, i) => {
      const a = ((it.rot - 90) * Math.PI) / 180, rx = it.cx + Math.cos(a) * (it.r + h * 2.4), ry = it.cy + Math.sin(a) * (it.r + h * 2.4);
      return `<circle data-h="move" data-i="${i}" cx="${it.cx}" cy="${it.cy}" r="${it.r}" fill="#FFFFFF" fill-opacity="0.001" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="${sw}" stroke-dasharray="${sw * 2} ${sw * 2}"/>`
        + `<line x1="${it.cx}" y1="${it.cy}" x2="${rx}" y2="${ry}" stroke="#2FA3A3" stroke-width="${sw}" stroke-opacity="0.6" pointer-events="none"/>`
        + `<rect data-h="size" data-i="${i}" x="${it.cx + it.r - h}" y="${it.cy - h}" width="${2 * h}" height="${2 * h}" fill="#2FA3A3"/>`
        + `<circle data-h="rot" data-i="${i}" cx="${rx}" cy="${ry}" r="${h}" fill="#2FA3A3"/>`;
    }).join('') + '</g>';
}

function editorWrite(k, v) {
  const { suit, rank } = selCell();
  if (view.scope === 'card') cellOf(design, suit.id, rank, true)[k] = v;
  else suit.firework[k] = v;
  changed();
}
function onEditor(e) {
  const { suit, rank } = selCell();
  const t = e.target;
  if (t.dataset.p) {
    const P = PARAMS[t.dataset.p];
    editorWrite(t.dataset.p, P.kind === 'bool' ? t.checked : P.kind === 'color' ? t.value.toUpperCase() : +t.value);
  } else if (t.id === 'edCompose') { suit.centre.compose = t.value; changed(); }
  else if (t.id === 'edTier') { suit.centre.tier = t.value; changed(); }
}
function onEditorClick(e) {
  const { suit, rank } = selCell();
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.scope) { view.scope = b.dataset.scope; persistView(); renderBoard(); return; }
  if (b.dataset.type) {
    if (view.scope === 'card') { if (b.dataset.type === suit.centre.motif) clearCell(design, suit.id, rank, 'motif'); else cellOf(design, suit.id, rank, true).motif = b.dataset.type; }
    else suit.centre.motif = b.dataset.type;
    changed(); return;
  }
  if (b.dataset.clear) {
    if (view.scope === 'card') clearCell(design, suit.id, rank, b.dataset.clear); else delete suit.firework[b.dataset.clear];
    changed(); return;
  }
  if (b.id === 'edReset') { clearCell(design, suit.id, rank); changed(); }
  else if (b.id === 'edApplyRank') { applyArrangementToRank(design, rank, cellItems(design, suit.id, rank)); changed(); }
  else if (b.id === 'edResetItems') { clearCell(design, suit.id, rank, 'items'); changed(); }
  else if (b.id === 'edResetRank') { delete design.arrangements[rank]; changed(); }
}

// Dragging a firework: the pointer is captured on the card's container (the
// svg inside it is redrawn on every move), and the cell's own arrangement is
// written as fractions of the field.
function svgPoint(e) {
  const svg = $('edCard').querySelector('svg');
  return new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
}
function onDragStart(e) {
  const h = e.target.closest('[data-h]'); if (!h) return;
  const { suit, rank } = selCell();
  const pl = placementFor(design, suit, rank), i = +h.dataset.i, p = svgPoint(e), it = pl.items[i];
  board.drag = { kind: h.dataset.h, i, pl, items: cellItems(design, suit.id, rank).map((x) => ({ ...x })), dx: p.x - it.cx, dy: p.y - it.cy };
  $('edCard').setPointerCapture(e.pointerId);
  e.preventDefault();
}
function onDragMove(e) {
  const d = board.drag; if (!d) return;
  const p = svgPoint(e), it = d.items[d.i], c = d.pl.items[d.i], F = d.pl.field;
  const cl = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  if (d.kind === 'move') { it.x = +cl((p.x - d.dx - F.x) / F.w, 0, 1).toFixed(4); it.y = +cl((p.y - d.dy - F.y) / F.h, 0, 1).toFixed(4); }
  else if (d.kind === 'size') it.s = +cl(Math.hypot(p.x - c.cx, p.y - c.cy) / d.pl.unit, ...ITEM_LIMITS.s).toFixed(3);
  else { let a = (Math.atan2(p.y - c.cy, p.x - c.cx) * 180) / Math.PI + 90; if (a > 180) a -= 360; it.rot = Math.round(a / 5) * 5; }
  const { suit, rank } = selCell();
  cellOf(design, suit.id, rank, true).items = d.items.map((x) => ({ ...x }));
  if (!board.raf) board.raf = requestAnimationFrame(() => { board.raf = 0; paintBoard(); paintEditor(suit, rank); });
}
function onDragEnd() { if (!board.drag) return; board.drag = null; changed(); }

$('stage').addEventListener('click', (e) => {
  const c = e.target.closest('[data-cell]');
  if (c) { const [s, r] = c.dataset.cell.split(':'); selectCell(s, +r); return; }
  if (e.target.closest('#editor')) onEditorClick(e);
});
$('stage').addEventListener('input', (e) => { if (e.target.closest('#editor') && e.target.type !== 'checkbox' && e.target.tagName !== 'SELECT') onEditor(e); });
$('stage').addEventListener('change', (e) => {
  if (e.target.id === 'boardGray') { setGray(e.target.checked); return; }
  if (e.target.closest('#editor') && (e.target.type === 'checkbox' || e.target.tagName === 'SELECT')) onEditor(e);
});
$('stage').addEventListener('pointerdown', (e) => { if (e.target.closest('#edCard')) onDragStart(e); });
// A press on the card must not start a text selection: its autoscroll moves the
// editor under the pointer mid-drag.
$('stage').addEventListener('mousedown', (e) => { if (e.target.closest('#edCard [data-h]')) e.preventDefault(); });
$('stage').addEventListener('pointermove', onDragMove);
$('stage').addEventListener('pointerup', onDragEnd);
$('stage').addEventListener('pointercancel', onDragEnd);

// ---------- wiring ----------
$('indexSeg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-index]'); if (!b) return;
  design.index = b.dataset.index; changed();
});
$('viewSeg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-view]'); if (!b) return;
  view.mode = b.dataset.view; persistView(); syncReadouts(); renderPreview();
});
$('viewSuit').addEventListener('change', (e) => { view.suit = e.target.value; persistView(); renderPreview(); });
function setGray(on) { view.grayscale = on; $('grayscale').checked = on; persistView(); renderPreview(); }
$('grayscale').addEventListener('change', (e) => setGray(e.target.checked));
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
  select: (suit, rank) => selectCell(suit, rank),
  placement: (suit, rank) => placementFor(design, suitById(design, suit), rank),
  exportPdf: (o) => exportPdf(design, o),
  exportZip: (o) => exportZip(design, o),
};
