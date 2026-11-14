// hanabi.js — the Hanabi deck designer page. Owns the DOM and the design
// state; the model is hanabi/deck.js, the art hanabi/layout.js and
// hanabi/firework.js, the files hanabi/export.js.

import {
  defaultDesign, normaliseDesign, serialiseDesign, activeSuits, cardCounts, deckCards,
  suitById, symbolClashes, imposition, copyCentreToAll, SIZE_PRESETS, INDEX_STYLES, COMPOSE, COUNT_MODES, NUMERAL_FILLS,
  RANKS, COPIES, VERSION, SCENES, cellHasOverride, cellOf, clearCell, applyArrangementToRank, ITEM_LIMITS, PLACE_LIMITS, restack,
  setFireworkStyle, clearFireworkStyle, applyStylesToRank, cardGeom, FRAMES, PIP_FITS,
  BORDER_LIMITS, SKY_PRESETS, BG_LIMITS, defaultBackground,
} from './hanabi/deck.js';
import { SYMBOLS, SYMBOL_IDS } from './hanabi/symbols.js';
import { renderFace, renderBack, placementFor, scalePlacement, literalItems, centring } from './hanabi/layout.js';
import { fireworkSpec, fireworkSpecAt, fireworkStyle, defaultSpec, renderFirework, motifParams, MOTIFS, MOTIF_IDS, STYLE_MOTIFS, TIERS, TIER_RANKS, TYPES, PARAMS, paramFor, stemDefault } from './hanabi/firework.js';
import { exportPdf, exportZip, downloadBlob } from './hanabi/export.js';
import { STYLES, PAPER_PARAMS, PAPER_KEYS, PAPER_PRESETS, SHAPES, DISC_TONES, resolvePaper, defaultPaper } from './hanabi/style2.js';

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
let view = { mode: 'suit', suit: 'red', grayscale: false, guides: false, round: true, zoom: 150, cell: { suit: 'red', rank: 1 }, scope: 'row', item: 0 };
try { Object.assign(view, JSON.parse(localStorage.getItem(VIEW_KEY) || '{}')); } catch { /* storage unavailable */ }

// The page's own layout, per browser: the deck panel open or collapsed to a
// rail, the card editor's width, and the editor card's zoom. Not part of the
// design (a file carries the deck, not how this screen was arranged).
const LAYOUT_KEY = 'hanabi.layout.v1';
const EDITOR_W = { min: 280, max: 960, dflt: 330 };
// (an array: an object with integer-like keys would list them before 'fit')
const CARD_ZOOMS = [['fit', 'Fit'], ['100', '100%'], ['150', '150%'], ['200', '200%']];
let layout = { panel: 'open', editorW: EDITOR_W.dflt, cardZoom: 'fit' };
try { Object.assign(layout, JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}')); } catch { /* storage unavailable */ }
layout.editorW = Math.min(EDITOR_W.max, Math.max(EDITOR_W.min, +layout.editorW || EDITOR_W.dflt));
layout.cardZoom = String(layout.cardZoom);
if (!CARD_ZOOMS.some(([k]) => k === layout.cardZoom)) layout.cardZoom = 'fit';
if (layout.panel !== 'rail') layout.panel = 'open';
function persistLayout() { try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); } catch { /* the page still works */ } }

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
        <label for="c-${suit.id}-compose">Rank shown by</label>
        <select id="c-${suit.id}-compose" data-c="compose">${Object.keys(COMPOSE).map((k) => `<option value="${k}" title="${COMPOSE[k]}">${COMPOSE_SHORT[k]}</option>`).join('')}</select>
        <label for="c-${suit.id}-motif">Firework</label>
        <select id="c-${suit.id}-motif" data-c="motif">${motifOptions()}</select>
        <label for="c-${suit.id}-tier" title="A second tier under a Scale burst, at ranks ${TIER_RANKS.join(' and ')}">Tier, ${TIER_RANKS.join('–')}</label>
        <select id="c-${suit.id}-tier" data-c="tier">${Object.entries(TIERS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>${suit.multicolor
          ? `<label for="c-${suit.id}-numeral">Index fill</label><select id="c-${suit.id}-numeral" data-n>${Object.entries(NUMERAL_FILLS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>` : ''}
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
  bindValue('border', () => design.border, (v) => { if (v !== '' && +v >= BORDER_LIMITS.min && +v <= BORDER_LIMITS.max) design.border = +v; }, 'change'),
  bindValue('bgOn', () => design.background.on, (v) => { design.background.on = v; }, 'change'),
  bindValue('skyOn', () => design.background.sky.on, (v) => { design.background.sky.on = v; }, 'change'),
  bindValue('skyTop', () => design.background.sky.top.toLowerCase(), (v) => { design.background.sky.top = v.toUpperCase(); }),
  bindValue('skyBottom', () => design.background.sky.bottom.toLowerCase(), (v) => { design.background.sky.bottom = v.toUpperCase(); }),
  bindValue('bgGrain', () => design.background.grain || 0, (v) => { design.background.grain = +v; }),
  bindValue('bgHorizon', () => design.background.horizon, (v) => { design.background.horizon = +v; }),
  bindValue('bgGlow', () => design.background.glow, (v) => { design.background.glow = +v; }),
  bindValue('smokeAmount', () => design.background.smoke.amount, (v) => { design.background.smoke.amount = +v; }),
  bindValue('smokeDrift', () => design.background.smoke.drift, (v) => { design.background.smoke.drift = +v; }),
  bindValue('smokeLit', () => design.background.smoke.lit, (v) => { design.background.smoke.lit = +v; }),
  bindValue('smokeColor', () => design.background.smoke.color.toLowerCase(), (v) => { design.background.smoke.color = v.toUpperCase(); }),
  bindValue('smokeRank', () => design.background.smoke.rank, (v) => { design.background.smoke.rank = v; }, 'change'),
  bindValue('corners', () => design.corners, (v) => { design.corners = v; }, 'change'),
  bindValue('pips', () => design.pips, (v) => { if (PIP_FITS[v]) design.pips = v; }, 'change'),
  bindValue('faceBg', () => design.face.bg.toLowerCase(), (v) => { design.face.bg = v.toUpperCase(); }),
  bindValue('faceFrame', () => design.face.frame || 'none', (v) => { if (FRAMES[v]) design.face.frame = v; }, 'change'),
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
  // every panel colour shows its swatch AND its hex (a face colour near the panel's
  // own ground reads as an empty box otherwise)
  for (const out of document.querySelectorAll('.hb-panel .hb-hex')) out.textContent = $(out.dataset.for).value.toUpperCase();
  const custom = design.size.preset === 'custom';
  $('sizeW').disabled = !custom; $('sizeH').disabled = !custom;
  for (const btn of $('indexSeg').children) btn.setAttribute('aria-checked', String(btn.dataset.index === design.index));
  for (const btn of $('viewSeg').children) btn.setAttribute('aria-checked', String(btn.dataset.view === view.mode));
  for (const btn of $('styleSeg').children) btn.setAttribute('aria-checked', String(btn.dataset.style === (design.style || 'line')));
  syncStyle2();
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
  syncBackground();
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
// ---------- the background (version 7) ----------
const skyPreset = (b) => Object.keys(SKY_PRESETS).find((k) => SKY_PRESETS[k].top === b.sky.top && SKY_PRESETS[k].bottom === b.sky.bottom);
function syncBackground() {
  const b = design.background, sm = b.smoke, pre = skyPreset(b);
  $('bgRows').hidden = !b.on;
  $('bgVal').textContent = b.on ? `on — ${b.sky.on ? (pre ? SKY_PRESETS[pre].label : 'custom sky') : 'flat face'}, smoke ${sm.amount.toFixed(2)}` : 'off — the flat card face';
  $('skyVal').textContent = b.sky.on ? (pre ? SKY_PRESETS[pre].label : 'custom') : 'flat';
  $('smokeVal').textContent = sm.amount > 0 ? `${sm.amount.toFixed(2)}${sm.rank ? ', builds with rank' : ''}` : 'none';
  $('skyTop').disabled = $('skyBottom').disabled = !b.sky.on;
  for (const c of $('skyPresets').children) { c.setAttribute('aria-pressed', String(c.dataset.sky === pre && b.sky.on)); c.disabled = !b.sky.on; }
  $('bgHorizonVal').textContent = b.horizon.toFixed(2);
  $('bgGrainVal').textContent = (b.grain || 0).toFixed(2);
  $('bgGlowVal').textContent = b.glow.toFixed(2);
  $('smokeAmountVal').textContent = sm.amount.toFixed(2);
  $('smokeDriftVal').textContent = `${sm.drift.toFixed(1)}×`;
  $('smokeLitVal').textContent = sm.lit.toFixed(2);
  $('smokeSeed').textContent = `seed ${sm.seed}`;
  const g = cardGeom(design);
  $('borderNote').textContent = design.border
    ? `A ${design.border} mm white border: the art is inset from the trim, with rounded corners; the bleed prints white, so a cut that drifts shows nothing. The safe zone (${design.safe} mm) is measured from the art's edge — ${(g.art.w).toFixed(1)} × ${(g.art.h).toFixed(1)} mm of art.`
    : 'No white border: the art runs to the bleed.';
}
function buildSkyChips() {
  $('skyPresets').innerHTML = Object.entries(SKY_PRESETS).map(([k, p]) =>
    `<button type="button" class="hb-chip" data-sky="${k}" title="${p.top} → ${p.bottom}"><span class="hb-chip__sw" style="background:linear-gradient(${p.top},${p.bottom})"></span>${p.label}</button>`).join('');
}
$('skyPresets').addEventListener('click', (e) => {
  const c = e.target.closest('[data-sky]'); if (!c) return;
  const p = SKY_PRESETS[c.dataset.sky]; design.background.sky.top = p.top; design.background.sky.bottom = p.bottom;
  design.background.grain = p.grain || 0;   // a preset is a ground: Charcoal paper brings its grain, the skies none
  changed();
});
$('smokeReroll').addEventListener('click', () => {
  let s; do { s = Math.floor(Math.random() * 2 ** 32); } while (s === design.background.smoke.seed);
  design.background.smoke.seed = s; changed();
});
$('bgReset').addEventListener('click', () => { design.background = defaultBackground(); changed(); });

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
    { guides: view.guides, round: view.round, idPrefix: `p${uid++}` }), `${suit.name} ${r} · ×${COPIES[r]}`)).join('');
  return `<div class="hb-group"><p class="hb-group__title">${title}</p><div class="hb-cards">${cards}</div></div>`;
}
function extrasRow() {
  const g = { guides: view.guides, round: view.round };
  return `<div class="hb-group"><p class="hb-group__title">Back <span class="hb-sep">—</span> tokens</p><div class="hb-cards">`
    + cardFigure(renderBack(design, g), 'Back')
    + cardFigure(renderFace(design, { kind: 'clue' }, g), 'Clue token · ×8')
    + cardFigure(renderFace(design, { kind: 'fuse' }, g), 'Fuse token · ×3')
    + '</div></div>';
}
function renderPreview() {
  const stage = $('stage');
  stage.classList.toggle('is-gray', view.grayscale);
  stage.classList.toggle('is-round', view.round && !view.guides);
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
      + cards.map((c) => cardFigure(renderFace(design, c, { guides: view.guides, round: view.round, idPrefix: `p${uid++}` }),
        c.kind === 'card' ? `${suitById(design, c.suitId).name} ${c.rank}` : `${c.kind} token`)).join('')
      + cardFigure(renderBack(design, { guides: view.guides, round: view.round }), 'Back') + '</div></div>';
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
function selectCell(suitId, rank) { view.cell = { suit: suitId, rank }; view.item = 0; persistView(); renderBoard(); }

// ---- arranging a card by hand ----
// Count and Count + scale: every firework is an item { x, y, s, rot, n } of the
// card's own arrangement, in STACKING order (the last is drawn on top). Scale: the
// one firework is the card's `place`. Column, Full bleed and the field motifs are
// laid out by their composition and are not arranged.
function arrangeMode(suit, rank) {
  if (COUNT_MODES.includes(suit.centre.compose)) return 'items';
  if (suit.centre.compose === 'scale' && scalePlacement(design, suit, rank)) return 'place';
  return null;
}
function arrangePlacement(suit, rank) {
  const m = arrangeMode(suit, rank);
  return m === 'items' ? placementFor(design, suit, rank) : m === 'place' ? scalePlacement(design, suit, rank) : null;
}
// The card's arrangement as drawn, written literally (the default pips with the
// radius they are drawn at), so an edit starting from it moves nothing else.
function curItems(suit, rank) {
  const own = cellOf(design, suit.id, rank);
  return own && own.items ? own.items.map((x) => ({ ...x })) : literalItems(placementFor(design, suit, rank));
}
function curPlace(suit, rank) {
  const own = cellOf(design, suit.id, rank);
  if (own && own.place) return { ...own.place };
  const sp = scalePlacement(design, suit, rank), F = sp.field;
  return { x: (sp.base.cx - F.x) / F.w, y: (sp.base.cy - F.y) / F.h, s: 1, rot: 0 };
}
function selItem(suit, rank) {
  const n = arrangeMode(suit, rank) === 'items' ? rank : 1;
  view.item = Math.max(0, Math.min(n - 1, view.item | 0));
  return view.item;
}

function motifThumb(suit, m) {
  let spec = defaultSpec(suit, 5, design.suits, m, 'none', 'scale');
  if (design.style === 'paper') spec = { ...spec, style: 'paper', paper: resolvePaper(design, suit) };   // the gallery in the deck's style
  return `<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" fill="${design.face.bg}"/>${renderFirework(spec, { cx: 20, cy: 20, r: 18.5 })}</svg>`;
}

function boardSkeleton() {
  const ranks = RANKS.map((r) => `<div class="hb-board__rank">${r}<span class="hb-dim"> ×${COPIES[r]}</span></div>`).join('');
  const rows = activeSuits(design).map((s) => `<div class="hb-board__suit" data-row="${s.id}"></div>`
    + RANKS.map((r) => `<button type="button" class="hb-cell" data-cell="${s.id}:${r}"></button>`).join('')).join('');
  return `<div class="hb-boardwrap">
    <div class="hb-boardcol">
      <div class="hb-board__bar"><p class="hb-group__title"><b>Firework board</b> <span class="hb-sep">—</span> every suit × rank</p>
        <button type="button" class="hb-btn hb-btn--ghost" id="centreRank1" title="Centre the drawn firework of every rank-1 card in its art field">Centre all rank 1s</button></div>
      <div class="hb-board" role="grid" aria-label="Firework board"><div></div>${ranks}${rows}</div>
      <p class="hb-note" id="boardStatus" role="status" aria-live="polite"></p>
      <p class="hb-note">A dot marks a card with settings of its own. Edits to a suit reach every card in its row that has not overridden that setting. The toolbar's Greyscale checks the board and the editor's card.</p>
    </div>
    <div class="hb-resize" id="edResize" role="separator" aria-orientation="vertical" aria-label="Card editor width" tabindex="0"
      aria-valuemin="${EDITOR_W.min}" aria-valuemax="${EDITOR_W.max}" aria-valuenow="${layout.editorW}" title="Drag to set the editor's width (arrow keys too)"></div>
    <div class="hb-editor" id="editor" aria-label="Card editor"></div>
  </div>`;
}

function paintBoard() {
  const { suit: sel, rank: selR } = selCell();
  for (const s of activeSuits(design)) {
    const head = $('stage').querySelector(`[data-row="${s.id}"]`);
    const can = RANKS.some((r) => centring(design, s, r));
    if (head) head.innerHTML = `<span class="hb-board__sym" style="color:${s.primary}">${symbolSvg(s.symbol)}</span>`
      + `<span><b>${escapeHtml(s.name)}</b><br><span class="hb-dim">${escapeHtml(MOTIFS[s.centre.motif].label)} · ${COMPOSE_SHORT[s.centre.compose]}</span>`
      + (can ? `<br><button type="button" class="hb-rowcentre" data-centre-row="${s.id}" title="Centre every ${escapeHtml(s.name)} card's fireworks in its art field">centre row</button>` : '') + '</span>';
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

// The count control is the type's own (paramFor: Stars, Spokes, Trails, Arms or
// Petals, with its range); every other parameter is the shared table's.
const paramNote = (P) => (P.note ? ` title="${escapeHtml(P.note)}"` : '');
function paramControl(k, motif) {
  const P = paramFor(k, motif);
  const clear = `<button type="button" class="hb-clear" data-clear="${k}" title="Back to the suit's value">↺</button>`;
  if (P.kind === 'bool') return `<label class="hb-param hb-check" data-param="${k}"><input type="checkbox" data-p="${k}"> ${P.label}${clear}</label>`;
  if (P.kind === 'color') return `<div class="hb-param" data-param="${k}"><label for="p-${k}">${P.label}</label><input type="color" id="p-${k}" data-p="${k}">${clear}</div>`;
  return `<div class="hb-param" data-param="${k}"${paramNote(P)}><label for="p-${k}">${P.label}</label>`
    + `<input type="range" id="p-${k}" data-p="${k}" min="${P.min}" max="${P.max}" step="${P.step}"><output data-o="${k}"></output>${clear}</div>`;
}

function buildEditor(suit, rank) {
  board.styleSig = null;
  const spec = fireworkSpec(design, suit, rank), card = view.scope === 'card';
  const groups = {};
  for (const id of MOTIF_IDS) (groups[MOTIFS[id].group] ||= []).push(id);
  const gallery = Object.entries(groups).map(([g, ids]) => `<p class="hb-ed__label">${g}</p><div class="hb-types">${ids.map((m) =>
    `<button type="button" class="hb-type" data-type="${m}" title="${escapeHtml(MOTIFS[m].label)}${MOTIFS[m].note ? ` — ${escapeHtml(MOTIFS[m].note)}` : ''}">${motifThumb(suit, m)}<span>${escapeHtml(MOTIFS[m].label)}</span></button>`).join('')}</div>`).join('');
  const mode = arrangeMode(suit, rank);
  $('editor').innerHTML = `
    <div class="hb-ed__head"><p class="hb-ed__title"><b>${escapeHtml(suit.name)} ${rank}</b></p>
      <button type="button" class="hb-btn hb-btn--ghost" id="edReset">Reset to suit</button></div>
    <p class="hb-ed__own" id="edOwn"></p>
    <div class="hb-ed__zoom"><span>Card</span><div class="hb-seg" id="edZoom" role="radiogroup" aria-label="Editor card size">${CARD_ZOOMS.map(([k, v]) =>
      `<button type="button" role="radio" data-zoom="${k}" title="${k === 'fit' ? 'Fit the editor' : k === '100' ? 'Print size (100%)' : `${v} of print size`}">${v}</button>`).join('')}</div></div>
    <div class="hb-ed__cardwrap" id="edCardWrap"><div class="hb-ed__card" id="edCard"></div></div>
    <p class="hb-note" id="edHint">${mode ? 'Click a firework to pick it; drag it to move it, its square to resize it, its round handle to turn it. A firework keeps the size you give it wherever you put it, even past the field (the index stays on top).' : `This composition lays its fireworks out itself: switch the row to Count or Scale to place them by hand.`}</p>
    ${mode ? `<div class="hb-ed__sec" id="edArrange"><p class="hb-ed__label">Arrange <span class="hb-dim">— this card</span></p>
      ${mode === 'items' ? `<div class="hb-row hb-stack"><span class="hb-dim">Back</span><div class="hb-seg" id="edItems" role="radiogroup" aria-label="Pick a firework, back to front"></div><span class="hb-dim">Front</span></div>` : ''}
      <div class="hb-params">
        ${arrangeControl('x', 'Across', 0, 1, 0.01)}${arrangeControl('y', 'Down', 0, 1, 0.01)}
        ${arrangeControl('s', 'Size', ...(mode === 'items' ? ITEM_LIMITS.s : PLACE_LIMITS.s), 0.01)}${arrangeControl('rot', 'Turn', -180, 180, 5)}</div>
      <div class="hb-actions"><button type="button" class="hb-btn hb-btn--ghost" id="edCentre" title="Centre what the ${mode === 'items' ? 'fireworks draw' : 'firework draws'} (stars, trails, petals) in the card's art field${mode === 'items' ? '; the group moves as one' : ''}">Centre</button></div>
      <p class="hb-note" id="edStatus" role="status" aria-live="polite"></p>
      ${mode === 'items' ? `<div class="hb-actions" id="edOrder" aria-label="Stacking order">
        <button type="button" class="hb-btn hb-btn--ghost" data-order="back" title="Draw it under every other firework">To back</button>
        <button type="button" class="hb-btn hb-btn--ghost" data-order="down" title="One step further back">Backward</button>
        <button type="button" class="hb-btn hb-btn--ghost" data-order="up" title="One step further forward">Forward</button>
        <button type="button" class="hb-btn hb-btn--ghost" data-order="front" title="Draw it over every other firework">To front</button></div>
      <div class="hb-actions">
        <button type="button" class="hb-btn hb-btn--ghost" id="edApplyRank">Use for every ${rank}</button>
        <button type="button" class="hb-btn hb-btn--ghost" id="edResetItems">Reset arrangement</button>
        <button type="button" class="hb-btn hb-btn--ghost" id="edResetRank">Rank ${rank} column to default</button></div>
      <div class="hb-ed__sub" id="edStyle"></div>`
      : `<div class="hb-actions"><button type="button" class="hb-btn hb-btn--ghost" id="edResetPlace">Reset placement</button></div>`}</div>` : ''}
    <div class="hb-ed__sec"><p class="hb-ed__label">Rank composition <span class="hb-dim">— ${escapeHtml(suit.name)} row</span></p>
      <div class="hb-row"><label for="edCompose">Rank shown by</label><select id="edCompose">${Object.keys(COMPOSE).map((k) => `<option value="${k}" title="${COMPOSE[k]}">${COMPOSE_SHORT[k]}</option>`).join('')}</select></div>
      <div class="hb-row"><label for="edTier">Second tier</label><select id="edTier">${Object.entries(TIERS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div></div>
    <div class="hb-ed__sec"><div class="hb-seg" id="edScope" role="radiogroup" aria-label="Edit scope">
        <button type="button" role="radio" data-scope="row">${escapeHtml(suit.name)} row</button><button type="button" role="radio" data-scope="card">This card only</button></div>
      <p class="hb-note">${card ? `Changes here belong to ${escapeHtml(suit.name)} ${rank} alone; ↺ hands a setting back to the suit.` : `Changes here reach every ${escapeHtml(suit.name)} card that has not set its own.`}</p>
      <p class="hb-ed__label">Firework type <span class="hb-dim" id="edTypeName"></span></p>${gallery}
      <p class="hb-ed__label">Parameters</p><div class="hb-params">${motifParams(spec.motif).map((k) => paramControl(k, spec.motif)).join('') || '<p class="hb-note">This firework has no parameters.</p>'}</div></div>`;
}

// ---- one firework's own style (Count): its type, colours, detail and the
// type's parameters, over the card's. Rebuilt only when the picked firework or
// its type changes, so a slider being dragged is never replaced.
function styleControl(k, motif) {
  const P = paramFor(k, motif);
  const clear = `<button type="button" class="hb-clear" data-sclear="${k}" title="Back to the card's value">↺</button>`;
  if (P.kind === 'bool') return `<label class="hb-param hb-check" data-sparam="${k}"><input type="checkbox" data-s="${k}"> ${P.label}${clear}</label>`;
  if (P.kind === 'color') return `<div class="hb-param" data-sparam="${k}"><label for="st-${k}">${P.label}</label><input type="color" id="st-${k}" data-s="${k}">${clear}</div>`;
  return `<div class="hb-param" data-sparam="${k}"${paramNote(P)}><label for="st-${k}">${P.label}</label>`
    + `<input type="range" id="st-${k}" data-s="${k}" min="${P.min}" max="${P.max}" step="${P.step}"><output data-so="${k}"></output>${clear}</div>`;
}
function styleOptions(cardMotif) {
  const groups = {};
  for (const id of STYLE_MOTIFS) (groups[MOTIFS[id].group] ||= []).push(id);
  return `<option value="">As the card — ${escapeHtml(MOTIFS[cardMotif].label)}</option>` + Object.entries(groups).map(([g, ids]) => `<optgroup label="${g}">${ids.map((id) =>
    `<option value="${id}">${escapeHtml(motifLabel(id))}</option>`).join('')}</optgroup>`).join('');
}
function buildStyle(suit, rank, n, spec) {
  $('edStyle').innerHTML = `<p class="hb-ed__label">Style <span class="hb-dim">— firework ${n + 1}, this card</span></p>
    <div class="hb-row"><label for="st-motif">Type</label><select id="st-motif" data-s="motif">${styleOptions(fireworkSpec(design, suit, rank).motif)}</select></div>
    <div class="hb-params">${motifParams(spec.motif).map((k) => styleControl(k, spec.motif)).join('') || '<p class="hb-note">This firework has no parameters.</p>'}</div>
    <div class="hb-actions"><button type="button" class="hb-btn hb-btn--ghost" id="stReset">Reset firework to suit</button>
      <button type="button" class="hb-btn hb-btn--ghost" id="stApplyRank" title="Give every other suit's ${rank} (drawn as a Count) this card's fireworks' styles">Style mix to every ${rank}</button></div>
    <p class="hb-note" id="stNote"></p>`;
}
function paintStyle(suit, rank, n) {
  if (!$('edStyle')) return;
  const spec = fireworkSpecAt(design, suit, rank, n), st = fireworkStyle(design, suit.id, rank, n) || {};
  const sig = [suit.id, rank, n, spec.motif].join('|');
  if (sig !== board.styleSig) { buildStyle(suit, rank, n, spec); board.styleSig = sig; }
  const box = $('edStyle');
  if (document.activeElement !== $('st-motif')) $('st-motif').value = st.motif || '';
  for (const el of box.querySelectorAll('[data-s]')) {
    const k = el.dataset.s; if (k === 'motif') continue;
    const P = PARAMS[k];
    let v = spec[k];
    if (P.kind === 'color') v = v || (k === 'coreColor' ? spec.colors[1] || spec.colors[0] : spec.colors[0]);
    else if (v === undefined) v = P.kind === 'bool' ? false : k === 'rotation' ? 0 : P.min;
    if (document.activeElement !== el || el.type === 'checkbox') { if (el.type === 'checkbox') el.checked = !!v; else el.value = P.kind === 'color' ? v.toLowerCase() : v; }
    const out = box.querySelector(`[data-so="${k}"]`); if (out) out.textContent = fmtParam(k, v);
    el.closest('[data-sparam]').classList.toggle('is-own', st[k] !== undefined);
  }
  $('stReset').disabled = !Object.keys(st).length;
  const own = Object.keys(st).length;
  $('stNote').textContent = (own ? `Firework ${n + 1} has a style of its own — as the card otherwise. ` : `Firework ${n + 1} is drawn as the card. `)
    + `${COPIES[rank] > 1 ? `All ${COPIES[rank]} copies of ${suit.name} ${rank} are this card, so a style reaches every duplicate.` : `${suit.name} ${rank} has one copy.`}`;
}

// ---- the editor's card: its zoom (fit the editor, or a share of print size)
function applyCardZoom() {
  const card = $('edCard'), wrap = $('edCardWrap'); if (!card || !wrap) return;
  const g = cardGeom(design), PX_PER_MM = 96 / 25.4;
  let w;
  if (layout.cardZoom === 'fit') w = Math.max(120, Math.min(wrap.clientWidth - 4, (window.innerHeight * 0.68) * (g.fullW / g.fullH)));
  else w = g.fullW * PX_PER_MM * (+layout.cardZoom / 100);
  card.style.width = `${Math.round(w)}px`;
  for (const b of $('edZoom').children) b.setAttribute('aria-checked', String(b.dataset.zoom === String(layout.cardZoom)));
}

function paintEditor(suit, rank) {
  const ed = $('editor'); if (!ed.firstElementChild) return;
  const spec = fireworkSpec(design, suit, rank), own = cellOf(design, suit.id, rank) || {}, card = view.scope === 'card';
  const mode = arrangeMode(suit, rank), sel = selItem(suit, rank);
  const keys = Object.keys(own);
  $('edOwn').textContent = keys.filter((k) => k !== 'legacy').length ? `Its own ${keys.filter((k) => k !== 'legacy').map((k) => (k === 'items' ? 'arrangement' : k === 'place' ? 'placement' : k === 'styles' ? 'firework styles' : PARAMS[k] ? paramFor(k, spec.motif).label.toLowerCase() : k)).join(', ')}` : `As the ${suit.name} row`;
  $('edReset').disabled = !keys.length;
  let svg = renderFace(design, { kind: 'card', suitId: suit.id, rank }, { idPrefix: 'ed', round: view.round });
  if (mode) svg = svg.replace(/<\/svg>$/, handlesSvg(arrangePlacement(suit, rank), sel) + '</svg>');
  $('edCard').innerHTML = svg;
  $('edCard').classList.toggle('is-gray', view.grayscale);
  applyCardZoom();
  $('edCompose').value = suit.centre.compose;
  $('edTier').value = suit.centre.tier; $('edTier').disabled = suit.centre.compose !== 'scale';
  for (const b of $('edScope').children) b.setAttribute('aria-checked', String(b.dataset.scope === view.scope));
  $('edTypeName').textContent = `— ${MOTIFS[spec.motif].label}${own.motif ? ' (this card)' : ''}`;
  for (const b of ed.querySelectorAll('[data-type]')) b.setAttribute('aria-pressed', String(b.dataset.type === spec.motif));
  const rowVal = (k) => { const v = suit.firework[k]; return v !== undefined && v !== '' ? v : k === 'stem' ? stemDefault(design) : defaultSpec(suit, 5, design.suits, spec.motif)[k]; };
  for (const el of ed.querySelectorAll('[data-p]')) {
    const k = el.dataset.p, P = PARAMS[k];
    let v = card ? (k === 'stem' ? spec.stem ?? stemDefault(design) : spec[k]) : rowVal(k);
    if (P.kind === 'color') v = v || (k === 'coreColor' ? spec.colors[1] || spec.colors[0] : spec.colors[0]);
    else if (v === undefined) v = P.kind === 'bool' ? false : k === 'rotation' ? 0 : P.min;   // a motif with no default of its own
    if (document.activeElement !== el || el.type === 'checkbox') { if (el.type === 'checkbox') el.checked = !!v; else el.value = P.kind === 'color' ? v.toLowerCase() : v; }
    const out = ed.querySelector(`[data-o="${k}"]`); if (out) out.textContent = fmtParam(k, v);
    const has = card ? own[k] !== undefined : suit.firework[k] !== undefined && suit.firework[k] !== '';
    el.closest('[data-param]').classList.toggle('is-own', has);
  }
  for (const [id, on] of [['edApplyRank', true], ['edResetItems', !!own.items], ['edResetRank', !!design.arrangements[rank]], ['edResetPlace', !!own.place], ['edCentre', !!centring(design, suit, rank)]]) if ($(id)) $(id).disabled = !on;
  if (!mode || !$('edArrange')) return;
  // the picked firework's own values
  const it = mode === 'items' ? curItems(suit, rank)[sel] : curPlace(suit, rank);
  for (const k of ['x', 'y', 's', 'rot']) {
    const el = $(`ar-${k}`);
    if (document.activeElement !== el) el.value = it[k];
    ed.querySelector(`[data-ao="${k}"]`).textContent = k === 'rot' ? `${Math.round(it[k])}°` : k === 's' ? `${mode === 'place' ? '×' : ''}${(+it[k]).toFixed(2)}` : `${Math.round(it[k] * 100)}%`;
  }
  if (mode === 'items') {
    const items = curItems(suit, rank);
    $('edItems').innerHTML = items.map((x, i) => { const st = !!fireworkStyle(design, suit.id, rank, x.n);
      return `<button type="button" role="radio" data-item="${i}" aria-checked="${i === sel}"${st ? ' class="is-own"' : ''} title="Firework ${x.n + 1}${st ? ' — a style of its own' : ''}">${x.n + 1}</button>`; }).join('');
    for (const b of $('edOrder').children) b.disabled = (b.dataset.order === 'back' || b.dataset.order === 'down') ? sel === 0 : sel === items.length - 1;
    paintStyle(suit, rank, items[sel].n);
  }
}
function arrangeControl(k, label, min, max, step) {
  return `<div class="hb-param" data-arrange="${k}"><label for="ar-${k}">${label}</label>`
    + `<input type="range" id="ar-${k}" data-a="${k}" min="${min}" max="${max}" step="${step}"><output data-ao="${k}"></output><span></span></div>`;
}
// Write the picked firework's key k: into the card's own arrangement (Count) or
// its placement (Scale). Arranging is always this card's own.
function arrangeWrite(k, v) {
  const { suit, rank } = selCell(), mode = arrangeMode(suit, rank);
  if (mode === 'items') {
    const items = curItems(suit, rank), i = selItem(suit, rank);
    items[i] = { ...items[i], [k]: v };
    cellOf(design, suit.id, rank, true).items = items;
  } else if (mode === 'place') cellOf(design, suit.id, rank, true).place = { ...curPlace(suit, rank), [k]: v };
  changed();
}

// The drag handles over the editor's card, in card mm.
// Every firework has a move target (in stacking order, so the front one takes a
// click where two overlap); only the PICKED one carries the resize square and the
// turn handle, drawn last so nothing covers them.
function handlesSvg(pl, sel) {
  const h = Math.max(0.9, Math.min(pl.field.w, pl.field.h) * 0.035), sw = h * 0.28;
  const it = pl.items[sel] || pl.items[0], i = pl.items.indexOf(it);
  const a = ((it.rot - 90) * Math.PI) / 180, rx = it.cx + Math.cos(a) * (it.r + h * 2.4), ry = it.cy + Math.sin(a) * (it.r + h * 2.4);
  return '<g class="hb-handles">' + `<rect x="${pl.field.x}" y="${pl.field.y}" width="${pl.field.w}" height="${pl.field.h}" fill="none" stroke="#2FA3A3" stroke-opacity="0.35" stroke-width="${sw}" stroke-dasharray="${sw * 3} ${sw * 3}" pointer-events="none"/>`
    + pl.items.map((x, k) => `<circle data-h="move" data-i="${k}" cx="${x.cx}" cy="${x.cy}" r="${x.r}" fill="#FFFFFF" fill-opacity="0.001" stroke="${k === i ? '#2FA3A3' : '#FFFFFF'}" stroke-opacity="${k === i ? 0.9 : 0.4}" stroke-width="${k === i ? sw * 1.6 : sw}"${k === i ? '' : ` stroke-dasharray="${sw * 2} ${sw * 2}"`}/>`).join('')
    + `<line x1="${it.cx}" y1="${it.cy}" x2="${rx}" y2="${ry}" stroke="#2FA3A3" stroke-width="${sw}" stroke-opacity="0.6" pointer-events="none"/>`
    + `<rect data-h="size" data-i="${i}" x="${it.cx + it.r - h}" y="${it.cy - h}" width="${2 * h}" height="${2 * h}" fill="#2FA3A3"/>`
    + `<circle data-h="rot" data-i="${i}" cx="${rx}" cy="${ry}" r="${h}" fill="#2FA3A3"/>` + '</g>';
}

function editorWrite(k, v) {
  const { suit, rank } = selCell();
  if (view.scope === 'card') cellOf(design, suit.id, rank, true)[k] = v;
  else suit.firework[k] = v;
  changed();
}
// The picked firework's n (its identity, which a style is keyed by).
function selN(suit, rank) { const items = curItems(suit, rank); return items[selItem(suit, rank)].n; }
function styleWrite(k, v) {
  const { suit, rank } = selCell(), n = selN(suit, rank);
  if (k === 'motif') {
    if (!v || v === fireworkSpec(design, suit, rank).motif) clearFireworkStyle(design, suit.id, rank, n, 'motif');
    else setFireworkStyle(design, suit.id, rank, n, 'motif', v);
  } else setFireworkStyle(design, suit.id, rank, n, k, v);
  changed();
}
// Centre a card (Count: its group; Scale: its one firework), written as the
// card's own arrangement or placement. null where the card lays itself out.
function centreCard(suit, rank) {
  const c = centring(design, suit, rank);
  if (!c) return null;
  if (c.kind === 'items') cellOf(design, suit.id, rank, true).items = c.items;
  else cellOf(design, suit.id, rank, true).place = c.place;
  return c;
}
const centreWord = (c) => {
  const mm = Math.hypot(c.dx, c.dy);
  if (mm < 0.05) return 'already centred';
  const dirs = [c.dy < -0.05 ? 'up' : c.dy > 0.05 ? 'down' : '', c.dx < -0.05 ? 'left' : c.dx > 0.05 ? 'right' : ''].filter(Boolean).join(' and ');
  return `moved ${mm.toFixed(1)} mm ${dirs}${c.clamped ? ' — held at the field\'s edge, as near centred as it goes' : ''}`;
};
// The batch centring (every rank 1, a row) leaves a card already centred within
// CENTRE_TOL_MM alone: writing it would only mark it as overridden.
const CENTRE_TOL_MM = 0.05;
function centreMany(cards, label) {
  const done = [], left = [], already = [];
  for (const [s, r] of cards) {
    const c = centring(design, s, r), name = `${s.name} ${r}`;
    if (!c) left.push(name);
    else if (Math.hypot(c.dx, c.dy) < CENTRE_TOL_MM) already.push(name);
    else { centreCard(s, r); done.push(name); }
  }
  changed();
  $('boardStatus').textContent = `${label}: centred ${done.length} card${done.length === 1 ? '' : 's'}`
    + (already.length ? `; ${already.join(', ')} ${already.length === 1 ? 'was' : 'were'} already centred and left as ${already.length === 1 ? 'it was' : 'they were'}` : '')
    + (left.length ? `; ${left.join(', ')} lay${left.length === 1 ? 's' : ''} itself out (Column, Full bleed, a field or a second tier) and ${left.length === 1 ? 'was' : 'were'} left alone` : '') + '.';
}

function onEditor(e) {
  const { suit, rank } = selCell();
  const t = e.target;
  if (t.dataset.a) { arrangeWrite(t.dataset.a, +t.value); return; }
  if (t.dataset.s) {
    const k = t.dataset.s, P = PARAMS[k];
    styleWrite(k, k === 'motif' ? t.value : P.kind === 'bool' ? t.checked : P.kind === 'color' ? t.value.toUpperCase() : +t.value);
    return;
  }
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
  if (b.dataset.zoom) { layout.cardZoom = b.dataset.zoom; persistLayout(); applyCardZoom(); return; }
  if (b.dataset.sclear) { clearFireworkStyle(design, suit.id, rank, selN(suit, rank), b.dataset.sclear); changed(); return; }
  if (b.id === 'stReset') { clearFireworkStyle(design, suit.id, rank, selN(suit, rank)); changed(); return; }
  if (b.id === 'stApplyRank') {
    const { reached, skipped } = applyStylesToRank(design, suit.id, rank); changed();
    const name = (id) => suitById(design, id).name;
    $('edStatus').textContent = `${reached.length ? `Every ${rank} of ${reached.map(name).join(', ')} now draws this mix` : 'No other suit draws a Count'}${skipped.length ? `; ${skipped.map(name).join(', ')} ${skipped.length === 1 ? 'is' : 'are'} not a Count and kept ${skipped.length === 1 ? 'its' : 'their'} own.` : '.'}`;
    return;
  }
  if (b.id === 'edCentre') { const c = centreCard(suit, rank); changed(); if (c && $('edStatus')) $('edStatus').textContent = `Centred: ${centreWord(c)}.`; return; }
  if (b.dataset.type) {
    if (view.scope === 'card') { if (b.dataset.type === suit.centre.motif) clearCell(design, suit.id, rank, 'motif'); else cellOf(design, suit.id, rank, true).motif = b.dataset.type; }
    else suit.centre.motif = b.dataset.type;
    changed(); return;
  }
  if (b.dataset.clear) {
    if (view.scope === 'card') clearCell(design, suit.id, rank, b.dataset.clear); else delete suit.firework[b.dataset.clear];
    changed(); return;
  }
  if (b.dataset.item !== undefined) { view.item = +b.dataset.item; paintEditor(suit, rank); return; }
  if (b.dataset.order) {
    const items = curItems(suit, rank), i = selItem(suit, rank);
    const j = { back: 0, down: i - 1, up: i + 1, front: items.length - 1 }[b.dataset.order];
    cellOf(design, suit.id, rank, true).items = restack(items, i, j);
    view.item = Math.max(0, Math.min(items.length - 1, j)); changed(); return;
  }
  if (b.id === 'edReset') { clearCell(design, suit.id, rank); changed(); }
  else if (b.id === 'edResetPlace') { clearCell(design, suit.id, rank, 'place'); changed(); }
  else if (b.id === 'edApplyRank') { applyArrangementToRank(design, rank, curItems(suit, rank)); changed(); }
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
  const { suit, rank } = selCell(), mode = arrangeMode(suit, rank); if (!mode) return;
  const pl = arrangePlacement(suit, rank), i = +h.dataset.i, p = svgPoint(e), it = pl.items[i];
  view.item = i;
  board.drag = { kind: h.dataset.h, i, pl, mode, items: mode === 'items' ? curItems(suit, rank) : [curPlace(suit, rank)], dx: p.x - it.cx, dy: p.y - it.cy };
  $('edCard').setPointerCapture(e.pointerId);
  e.preventDefault();
  // repainted on the first move or on release, never here: the pressed node must
  // stay in the document while the press is delivered
}
function onDragMove(e) {
  const d = board.drag; if (!d) return;
  d.moved = true;
  const p = svgPoint(e), it = d.items[d.i], c = d.pl.items[d.i], F = d.pl.field;
  const cl = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  if (d.kind === 'move') { it.x = +cl((p.x - d.dx - F.x) / F.w, 0, 1).toFixed(4); it.y = +cl((p.y - d.dy - F.y) / F.h, 0, 1).toFixed(4); }
  else if (d.kind === 'size') it.s = +cl(Math.hypot(p.x - c.cx, p.y - c.cy) / d.pl.unit, ...(d.mode === 'items' ? ITEM_LIMITS.s : PLACE_LIMITS.s)).toFixed(3);
  else { let a = (Math.atan2(p.y - c.cy, p.x - c.cx) * 180) / Math.PI + 90; if (a > 180) a -= 360; it.rot = Math.round(a / 5) * 5; }
  const { suit, rank } = selCell();
  if (d.mode === 'items') cellOf(design, suit.id, rank, true).items = d.items.map((x) => ({ ...x }));
  else cellOf(design, suit.id, rank, true).place = { ...d.items[0] };
  if (!board.raf) board.raf = requestAnimationFrame(() => { board.raf = 0; paintBoard(); paintEditor(suit, rank); });
}
// A press that never moved only picks the firework: it writes nothing.
function onDragEnd() {
  const d = board.drag; if (!d) return;
  board.drag = null;
  if (d.moved) changed();
  else { const { suit, rank } = selCell(); paintEditor(suit, rank); }
}

$('stage').addEventListener('click', (e) => {
  if (e.target.closest('#centreRank1')) { centreMany(activeSuits(design).map((s) => [s, 1]), 'Every rank 1'); return; }
  const row = e.target.closest('[data-centre-row]');
  if (row) { const s = suitById(design, row.dataset.centreRow); centreMany(RANKS.map((r) => [s, r]), s.name); return; }
  const c = e.target.closest('[data-cell]');
  if (c) { const [s, r] = c.dataset.cell.split(':'); selectCell(s, +r); return; }
  if (e.target.closest('#editor')) onEditorClick(e);
});
$('stage').addEventListener('input', (e) => { if (e.target.closest('#editor') && e.target.type !== 'checkbox' && e.target.tagName !== 'SELECT') onEditor(e); });
$('stage').addEventListener('change', (e) => {
  if (e.target.closest('#editor') && (e.target.type === 'checkbox' || e.target.tagName === 'SELECT')) onEditor(e);
});
$('stage').addEventListener('pointerdown', (e) => { if (e.target.closest('#edCard')) onDragStart(e); });
// A press on the card must not start a text selection: its autoscroll moves the
// editor under the pointer mid-drag.
$('stage').addEventListener('mousedown', (e) => { if (e.target.closest('#edCard [data-h]')) e.preventDefault(); });
$('stage').addEventListener('pointermove', onDragMove);
$('stage').addEventListener('pointerup', onDragEnd);
$('stage').addEventListener('pointercancel', onDragEnd);

// ---------- the page's layout: the panel rail and the editor's width ----------
function applyLayout() {
  const rail = layout.panel === 'rail';
  document.querySelector('.hb-body').classList.toggle('is-rail', rail);
  const t = $('panelToggle');
  t.setAttribute('aria-expanded', String(!rail));
  t.title = rail ? 'Show the deck controls' : 'Collapse the deck controls to a rail';
  t.querySelector('.hb-rail__icon').textContent = rail ? '›' : '‹';
  document.documentElement.style.setProperty('--hb-ed-w', `${layout.editorW}px`);
  const h = $('edResize'); if (h) h.setAttribute('aria-valuenow', String(layout.editorW));
  applyCardZoom();
}
$('panelToggle').addEventListener('click', () => { layout.panel = layout.panel === 'rail' ? 'open' : 'rail'; persistLayout(); applyLayout(); });
function setEditorW(w) {
  layout.editorW = Math.round(Math.min(EDITOR_W.max, Math.max(EDITOR_W.min, w)));
  applyLayout();
}
const resizer = { on: false };
$('stage').addEventListener('pointerdown', (e) => {
  const h = e.target.closest('#edResize'); if (!h) return;
  // the drag moves the editor's edge by exactly what the pointer moves
  resizer.on = true; resizer.x0 = e.clientX; resizer.w0 = $('editor').getBoundingClientRect().width;
  h.setPointerCapture(e.pointerId); h.classList.add('is-drag'); e.preventDefault();
});
$('stage').addEventListener('pointermove', (e) => {
  if (!resizer.on) return;
  setEditorW(resizer.w0 + resizer.x0 - e.clientX);
});
function endResize(e) {
  if (!resizer.on) return;
  resizer.on = false; persistLayout();
  const h = $('edResize'); if (h) { h.classList.remove('is-drag'); if (h.hasPointerCapture(e.pointerId)) h.releasePointerCapture(e.pointerId); }
}
$('stage').addEventListener('pointerup', endResize);
$('stage').addEventListener('pointercancel', endResize);
$('stage').addEventListener('keydown', (e) => {
  if (e.target.id !== 'edResize') return;
  const step = e.shiftKey ? 64 : 16;
  const to = { ArrowLeft: layout.editorW + step, ArrowRight: layout.editorW - step, Home: EDITOR_W.min, End: EDITOR_W.max }[e.key];
  if (to === undefined) return;
  e.preventDefault(); setEditorW(to); persistLayout();
});
window.addEventListener('resize', () => applyCardZoom());

// ---------- styles (version 8) ----------
// The switcher (top right) picks the renderer for the whole deck; section 05 holds
// Style 2's dials, for the deck or, picked in "Edit for", one suit's own subset.
let s2target = 'deck';
const s2table = () => (s2target === 'deck' ? (design.style2 ||= defaultPaper()) : null);
function s2suit() { return s2target === 'deck' ? null : suitById(design, s2target); }
const s2value = (k) => (s2target === 'deck' ? { ...defaultPaper(), ...design.style2 }[k] : resolvePaper(design, s2suit())[k]);
function s2write(k, v) {
  if (s2target === 'deck') design.style2[k] = v;
  else (s2suit().style2 ||= {})[k] = v;
  changed();
}
function buildStyle2() {
  const groups = {};
  for (const k of PAPER_KEYS) (groups[PAPER_PARAMS[k].group] ||= []).push(k);
  $('style2Rows').innerHTML = Object.entries(groups).map(([g, ks]) => `<p class="hb-s2group">${g}</p>` + ks.map((k) => {
    const P = PAPER_PARAMS[k], tip = P.note ? ` title="${escapeHtml(P.note)}"` : '', clr = `<button type="button" class="hb-clear" data-s2clear="${k}" title="Back to the deck's value">↺</button>`;
    if (P.kind === 'bool') return `<label class="hb-check hb-s2row" data-s2row="${k}"${tip}><input type="checkbox" data-s2="${k}"> ${P.label}${clr}</label>`;
    if (P.kind === 'tone') return `<div class="hb-row hb-s2row" data-s2row="${k}"${tip}><label for="s2-${k}">${P.label}</label><select id="s2-${k}" data-s2="${k}">${Object.entries(DISC_TONES).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>${clr}</div>`;
    if (P.kind === 'shapes') return `<div class="hb-s2row" data-s2row="${k}"${tip}><div class="hb-s2shapes">${Object.entries(SHAPES).map(([v, l]) => `<label class="hb-check"><input type="checkbox" data-s2shape="${v}"> ${l}</label>`).join('')}</div>${clr}</div>`;
    return `<div class="hb-row hb-row--slider hb-s2row" data-s2row="${k}"${tip}><label for="s2-${k}">${P.label}</label><input type="range" id="s2-${k}" data-s2="${k}" min="${P.min}" max="${P.max}" step="${P.step}"><output class="hb-val" data-s2o="${k}"></output>${clr}</div>`;
  }).join('')).join('');
  $('style2Presets').innerHTML = Object.entries(PAPER_PRESETS).map(([k, p]) => `<button type="button" class="hb-chip" data-s2preset="${k}" title="${escapeHtml(p.note)}">${p.label}</button>`).join('');
}
function syncStyle2() {
  const sel = $('style2Target'), opts = `<option value="deck">Every suit (the deck)</option>` + activeSuits(design).map((s) => `<option value="${s.id}">${escapeHtml(s.name)} only</option>`).join('');
  if (sel.dataset.sig !== opts) { sel.innerHTML = opts; sel.dataset.sig = opts; }
  if (s2target !== 'deck' && !activeSuits(design).some((s) => s.id === s2target)) s2target = 'deck';
  sel.value = s2target;
  const own = s2suit() ? s2suit().style2 || {} : {};
  for (const row of $('style2Rows').querySelectorAll('[data-s2row]')) {
    const k = row.dataset.s2row, v = s2value(k);
    row.classList.toggle('is-own', own[k] !== undefined);
    const clr = row.querySelector('[data-s2clear]'); clr.disabled = s2target === 'deck' || own[k] === undefined;
    if (k === 'shapes') { for (const c of row.querySelectorAll('[data-s2shape]')) c.checked = v.includes(c.dataset.s2shape); continue; }
    const el = row.querySelector('[data-s2]');
    if (el.type === 'checkbox') el.checked = !!v; else if (document.activeElement !== el) el.value = v;
    const out = row.querySelector('[data-s2o]'); if (out) out.textContent = (+v).toFixed(2);
  }
  const vals = PAPER_KEYS.map((k) => JSON.stringify(s2value(k)));
  const pre = Object.keys(PAPER_PRESETS).find((p) => PAPER_KEYS.every((k, i) => JSON.stringify(PAPER_PRESETS[p].values[k]) === vals[i]));
  for (const c of $('style2Presets').children) c.setAttribute('aria-pressed', String(c.dataset.s2preset === pre));
  const owners = activeSuits(design).filter((s) => s.style2 && Object.keys(s.style2).length).map((s) => s.name);
  $('style2Val').textContent = `${(design.style || 'line') === 'paper' ? 'in use' : 'not in use'}${pre ? ` — ${PAPER_PRESETS[pre].label}` : ''}`;
  $('style2Note').textContent = ((design.style || 'line') === 'paper' ? 'The deck is drawn in Paper & Thread: these dials shape every firework. ' : 'The deck is drawn in Line (switch at the top right); these dials are kept for Paper & Thread and change nothing until then. ')
    + (s2target === 'deck' ? (owners.length ? `${owners.join(', ')} ${owners.length === 1 ? 'has' : 'have'} settings of ${owners.length === 1 ? 'its' : 'their'} own (•).` : 'Pick a suit under "Edit for" to give it settings of its own.')
      : `${s2suit().name}'s own settings (•) override the deck's; ↺ hands one back.`);
  $('style2Reset').textContent = s2target === 'deck' ? 'Reset to the balanced blend' : `Reset ${s2suit().name} to the deck`;
}
$('styleSeg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-style]'); if (!b || !STYLES[b.dataset.style]) return;
  design.style = b.dataset.style; changed();
});
$('style2Target').addEventListener('change', (e) => { s2target = e.target.value; syncStyle2(); });
$('style2Rows').addEventListener('input', (e) => {
  const k = e.target.dataset.s2; if (!k) return;
  const P = PAPER_PARAMS[k];
  s2write(k, P.kind === 'bool' ? e.target.checked : P.kind === 'tone' ? e.target.value : +e.target.value);
});
$('style2Rows').addEventListener('change', (e) => {
  if (e.target.dataset.s2shape) {
    const on = [...$('style2Rows').querySelectorAll('[data-s2shape]')].filter((c) => c.checked).map((c) => c.dataset.s2shape);
    if (!on.length) { e.target.checked = true; return; }   // at least one shape
    s2write('shapes', on); return;
  }
  if (e.target.dataset.s2 && PAPER_PARAMS[e.target.dataset.s2].kind === 'tone') s2write(e.target.dataset.s2, e.target.value);
});
$('style2Rows').addEventListener('click', (e) => {
  const b = e.target.closest('[data-s2clear]'); if (!b || s2target === 'deck') return;
  const st = s2suit().style2; if (st) { delete st[b.dataset.s2clear]; if (!Object.keys(st).length) delete s2suit().style2; }
  changed();
});
$('style2Presets').addEventListener('click', (e) => {
  const c = e.target.closest('[data-s2preset]'); if (!c) return;
  const v = PAPER_PRESETS[c.dataset.s2preset].values;
  if (s2target === 'deck') design.style2 = { ...v, shapes: [...v.shapes] }; else s2suit().style2 = { ...v, shapes: [...v.shapes] };
  changed();
});
$('style2Reset').addEventListener('click', () => {
  if (s2target === 'deck') design.style2 = defaultPaper(); else delete s2suit().style2;
  changed();
});

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
$('roundCorners').addEventListener('change', (e) => { view.round = e.target.checked; persistView(); board.sig = null; renderPreview(); });
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
$('roundCorners').checked = view.round;
// every panel colour input gets its hex beside the swatch
for (const el of document.querySelectorAll('.hb-panel .hb-row input[type=color]')) {
  const box = document.createElement('span'); box.className = 'hb-colorbox';
  el.replaceWith(box); box.append(el);
  const out = document.createElement('output'); out.className = 'hb-hex'; out.dataset.for = el.id; out.setAttribute('for', el.id);
  box.append(out);
  el.addEventListener('input', () => { out.textContent = el.value.toUpperCase(); });
}
$('zoom').value = view.zoom;
applyLayout();
buildSkyChips();
buildStyle2();
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
  placeOf: (suit, rank) => { const p = scalePlacement(design, suitById(design, suit), rank); return p && p.items[0]; },
  layout: () => ({ ...layout, editorPx: $('editor') ? $('editor').getBoundingClientRect().width : null }),
  centring: (suit, rank) => centring(design, suitById(design, suit), rank),
  exportPdf: (o) => exportPdf(design, o),
  exportZip: (o) => exportZip(design, o),
};
