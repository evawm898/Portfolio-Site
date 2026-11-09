#!/usr/bin/env node
/* verify-hanabi.mjs — the /hanabi deck designer, checked against its own claims.

   NOT IN CI (no workflow names a hanabi file; Eva's brief: no new gate). Run by hand
   before calling a /hanabi change done.

   PART ONE — Node, the pure modules (hanabi/deck.js, symbols.js, firework.js, layout.js)
     H1  the deck is the standard distribution: per suit 3/2/2/2/1, 50 cards, 60 with
         the rainbow suit, plus 8 clue and 3 fuse tokens — restated here, not imported
     H2  every active suit has its own symbol by default, and every card face carries
         its suit's symbol path under every index style x centre layout x corner mode
         (colour is never the only cue — the hard requirement)
     H3  rank escalates: classic's spec is strictly fuller rank on rank, every other
         motif draws strictly more marks rank on rank, and duplicates of a suit+rank
         render byte-identically
     H4  a phase-2 override in design.fireworks reaches the card and nothing else
     H5  every index x centre x corner mode x size, and every motif under every centre
         layout, renders a well-formed SVG whose viewBox is the BLEED box of that size
     H6  imposition: every card sits inside the sheet with >= the crop-mark room, no two
         overlap, and each crop mark lies on a trim line (restated from the size)
     H7  the duplex back sheet is the face grid mirrored left to right
     H8  a mark that does not stand off the card (contrast < 3) gets a halo
     H9  the design file round-trips, a newer version is refused, and a version-1 file's
         layout A/B/C is read as the (index, centre) pair it was — restated here
     H10 the corner index is ONE style for the deck: with every suit on a different
         centre, the index markup differs between suits only by colour and symbol, and
         changing a suit's centre never moves its index
     H11 a suit's centre is its own: changing one suit's centre moves only its cards
     H12 a second tier appears exactly at ranks 4 and 5 under a single burst, inside
         its rect and clear of every corner-index box (restated from the card size)
     H13 every catalogue motif and firework type stays in its box — a burst within r, a
         field within the rect it was given — read off every point it draws
     H14 the rainbow index (numeral and symbol through the other suits' colours)
     H15 a version-1 or version-2 design renders BYTE-IDENTICALLY to the page as it shipped
         at BASE (read from git, never this tree's reading of the file): 9,000+ faces
     H16 the nine firework types are nine silhouettes: each drawn under 12 seeds as a
         binary mask (greyscale by construction), described by radial ink, top/bottom
         balance and pieces; every drawing sits nearer its own type's centroid than any
         other's by a margin of 1.25. The default suits each draw a different type.
     H17 Count: rank N is exactly N fireworks (Count, Count+scale, Column; one otherwise),
         every mark inside the centre field RESTATED from the size and the index, on every
         preset; a wrong-length arrangement is refused and said
     H18 inheritance: a suit parameter reaches every card of its row that has not set that
         key, and no other row; a cell override is per key; resets restore byte for byte; a
         rank column's arrangement reaches every suit and clears the cells' own
     H19 every firework is a pure function of its spec (no clock, no Math.random)
     H20 the scene band: off by default; behind the fireworks and under the index, inside
         the bleed box, at its height
   PART TWO — Chromium, the real page (cdnjs served from node_modules, fonts blocked)
     B1  the page loads with no page error, grayscale and guides toggles act on the stage
     B2  the Centres view renders the viewed suit under each of the five compositions
     B8  a version-2 design in localStorage opens migrated, exactly as Node reads the file
     B5  the Firework board: 25 cells (30 with the rainbow); a row edit repaints its row
         only, a card edit its card only with a marker; reset to suit; the type gallery
         sets one suit; the board's greyscale toggle
     B7  arranging by hand with REAL pointer drags on the editor's card: a move lands where
         the pointer went (in mm), a resize grows, a turn turns, only that card moves; "use
         for every N" carries it to the rank column
     B3  the print PDF: page count, and on page 1 rasterised by pdftoppm the crop marks are
         ink at the positions H6 computed and the card art starts exactly at the bleed box
     B4  the PNG zip: one file per face + back, each 300 dpi of the bleed box

   --negative-control re-runs against deliberately broken copies (of the modules, or of the
   page script for what only the board shows); each must fail the check that names it.
   --mutant=a,b runs only those (reported as a subset); every anchor is still checked first.  --no-browser runs part one alone.  --keep <dir> copies the exported PDFs there.
*/
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findChromium } from './chromium-harness.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARGS = process.argv.slice(2);
const NO_BROWSER = ARGS.includes('--no-browser');
const NEG = ARGS.includes('--negative-control');
const KEEP = ARGS.includes('--keep') ? ARGS[ARGS.indexOf('--keep') + 1] : null;   // copy the PDFs here
const ONLY = (ARGS.find((x) => x.startsWith('--mutant=')) || '').slice(9).split(',').filter(Boolean);   // a subset, said as one

const MODULES = ['deck.js', 'symbols.js', 'firework.js', 'layout.js', 'export.js'];

const MUTANTS = [
  { id: 'distribution-wrong', file: 'deck.js', from: "COPIES = { 1: 3, 2: 2, 3: 2, 4: 2, 5: 1 }", to: "COPIES = { 1: 3, 2: 2, 3: 2, 4: 2, 5: 2 }", breaks: ['H1'] },
  { id: 'corner-drops-symbol', file: 'layout.js', from: "+ symbol(suit.symbol, (w - sym) / 2, digitH * 1.08, sym, symFill, numHalo);", to: ";", breaks: ['H2', 'H14', 'H15'] },
  { id: 'rank-does-not-escalate', file: 'firework.js', from: "4: { burstType: 'chrysanthemum', starCount: 18, rings: 3, size: 0.86", to: "4: { burstType: 'chrysanthemum', starCount: 12, rings: 1, size: 0.58", breaks: ['H3', 'H15'] },
  { id: 'override-ignored', file: 'firework.js', from: "return over ? { ...spec, ...over } : spec;", to: "return spec;", breaks: ['H4', 'H15', 'H18'] },
  { id: 'crop-mark-off-trim', file: 'deck.js', from: "xs.add(+s.trimX.toFixed(6));", to: "xs.add(+(s.trimX - g.bleed).toFixed(6));", breaks: ['H6', 'B3'] },
  { id: 'duplex-not-mirrored', file: 'deck.js', from: "return r * imp.cols + c;", to: "return i;", breaks: ['H7'] },
  { id: 'shared-cut-keeps-inner-bleed', file: 'deck.js', from: "const l = c === 0 ? b : 0,", to: "const l = b,", breaks: ['H6'] },
  { id: 'no-halo', file: 'layout.js', from: "const halo = contrast(suit.primary, faceBg) < HALO_BELOW ? haloFor(suit.primary) : null;", to: "const halo = null;", breaks: ['H8'] },
  { id: 'centre-is-deck-wide', file: 'firework.js', from: "const c = suit.centre || {};", to: "const c = design.suits[0].centre || {};", breaks: ['H11', 'H15', 'H18'] },
  { id: 'index-follows-the-centre', file: 'layout.js', from: "g.h * (INDEX_DIGIT[design.index] || INDEX_DIGIT.large), plate, numeral)", to: "g.h * (plate ? INDEX_DIGIT.small : INDEX_DIGIT[design.index] || INDEX_DIGIT.large), plate, numeral)", breaks: ['H10', 'H15'] },
  { id: 'tier-at-every-rank', file: 'firework.js', from: "tier !== 'none' && TIER_RANKS.includes(rank) ?", to: "tier !== 'none' && rank >= 1 ?", breaks: ['H12', 'H15'] },
  { id: 'tier-over-the-index', file: 'layout.js', from: "const x0 = area.x + corner.w + gap, x1 = area.x + area.w - corner.w - gap;", to: "const x0 = area.x + gap, x1 = area.x + area.w - gap;", breaks: ['H12', 'H15'] },
  { id: 'motif-does-not-escalate', file: 'firework.js', from: "weeping: [16, 22, 30, 38, 48],", to: "weeping: [30, 30, 30, 30, 30],", breaks: ['H3', 'H15'] },
  // a tier is drawn by the same field painters, so H12 sees the escape too
  { id: 'field-escapes-its-rect', file: 'firework.js', from: "const x = rect.x + rho + rand() * (rect.w - 2 * rho),", to: "const x = rect.x + rand() * (rect.w + 2 * rho),", breaks: ['H13', 'H12', 'H15'] },
  { id: 'rainbow-symbol-ignored', file: 'layout.js', from: "numFill = numeral.fill; symFill = numeral.symFill;", to: "numFill = numeral.fill;", breaks: ['H14', 'H15'] },
  { id: 'rainbow-index-not-the-default', file: 'deck.js', from: "numeral: 'rainbow', centre: defaultCentre('glitter')", to: "numeral: 'solid', centre: defaultCentre('glitter')", breaks: ['H14'] },
  { id: 'rainbow-numeral-ignored', file: 'layout.js', from: "numFill = numeral.fill; symFill", to: "numFill = suit.primary; symFill", breaks: ['H14', 'H15'] },
  { id: 'rainbow-numeral-on-every-suit', file: 'layout.js', from: "if (suit.multicolor && suit.numeral === 'rainbow') {", to: "if (design.suits.some((x) => x.numeral === 'rainbow')) {", breaks: ['H14', 'H15'] },
  { id: 'rainbow-numeral-not-saved', file: 'deck.js', from: "if (NUMERAL_FILLS[r.numeral]) s.numeral = r.numeral;", to: "if (NUMERAL_FILLS[r.numeral]) s.numeral = 'solid';", breaks: ['H9', 'H14', 'H15'] },
  { id: 'v1-layout-misread', file: 'deck.js', from: "C: { index: 'band',  compose: 'bleed' },", to: "C: { index: 'band',  compose: 'scale' },", breaks: ['H9', 'H15'] },
  // ---- phase 2: the board, the types, the compositions, the migration
  { id: 'v2-single-read-as-count', file: 'deck.js', from: "V2_LAYOUTS = { single: 'scale',", to: "V2_LAYOUTS = { single: 'count',", breaks: ['H9', 'H15'] },
  { id: 'radial-not-renamed', file: 'deck.js', from: "const motifOf = (m) => (ver < 3 && LEGACY_RADIAL[m] ? LEGACY_RADIAL[m] : m);", to: "const motifOf = (m) => m;", breaks: ['H9', 'H15'] },
  // a RECOLOUR: every type draws one and the same peony, in its own colours
  { id: 'every-type-is-a-recolour', file: 'firework.js', from: "if (TYPES[m]) return `<g class=\"hb-firework\" data-motif=\"${m}\">${drawType(spec,", to: "if (TYPES[m]) return `<g class=\"hb-firework\" data-motif=\"${m}\">${drawType({ ...spec, ...TYPES.peony.defaults, motif: 'peony' },", breaks: ['H16', 'H18'] },
  // two types, one shape: blossom draws exactly what peony draws
  { id: 'blossom-draws-a-peony', file: 'firework.js', from: "  blossom(s, n, w, rand, o, c) {", to: "  blossom(s, n, w, rand, o, c) { return TYPE_DRAW.peony({ ...s, ...TYPES.peony.defaults }, escalatedCount('peony', TYPES.peony.defaults.count, s.rank), w, rand, o, c);", breaks: ['H16'] },
  { id: 'default-pairing-collapses', file: 'deck.js', from: "symbol: 'heart', centre: defaultCentre('peony')", to: "symbol: 'heart', centre: defaultCentre('ring')", breaks: ['H16'] },
  { id: 'count-draws-one-short', file: 'layout.js', from: "return pl.items.map((it, i) => renderFirework(", to: "return pl.items.slice(1).map((it, i) => renderFirework(", breaks: ['H17', 'H18'] },
  { id: 'firework-escapes-the-field', file: 'layout.js', from: "return { cx, cy, r: Math.min(it.s * unit, room), rot: it.rot || 0 };", to: "return { cx, cy, r: it.s * unit * 1.3, rot: it.rot || 0 };", breaks: ['H17'] },
  { id: 'arrangement-length-unchecked', file: 'deck.js', from: "if (!Array.isArray(items) || items.length !== rank) return null;", to: "if (!Array.isArray(items)) return null;", breaks: ['H17'] },
  { id: 'cell-arrangement-ignored', file: 'layout.js', from: "if (o && Array.isArray(o.items) && o.items.length === rank) return o.items;", to: ";", breaks: ['H17', 'B7'] },
  { id: 'suit-parameters-ignored', file: 'firework.js', from: "for (const k of takes) if (mine[k] !== undefined && mine[k] !== '') spec[k] = mine[k];", to: ";", breaks: ['H18', 'B5'] },
  { id: 'suit-parameters-unfiltered', file: 'firework.js', from: "for (const k of takes) if (mine[k]", to: "for (const k of Object.keys(mine)) if (mine[k]", breaks: ['H18'] },
  { id: 'rank-column-keeps-cell-arrangements', file: 'deck.js', from: "for (const s of design.suits) clearCell(design, s.id, rank, 'items');", to: ";", breaks: ['H18', 'B7'] },
  { id: 'renderer-reads-the-clock', file: 'firework.js', from: "  const rand = rng(spec.seed);\n  const colors = spec.colors && spec.colors.length ? spec.colors : ['#FFFFFF'];\n  if (TYPES[m])", to: "  const rand = rng(Date.now() + Math.random() * 4e9);\n  const colors = spec.colors && spec.colors.length ? spec.colors : ['#FFFFFF'];\n  if (TYPES[m])", breaks: ['H19', 'H3', 'H4', 'H11', 'H14', 'H15', 'H18'] },
  { id: 'scene-over-the-index', file: 'layout.js', from: "const art = bg + sceneArt(design, g) + centreArt(design, suit, card.rank, g, ix);", to: "const art = bg + centreArt(design, suit, card.rank, g, ix) + sceneArt(design, g);", breaks: ['H20'] },
  { id: 'scene-drawn-when-off', file: 'layout.js', from: "if (!sc || !sc.on) return '';", to: "if (!sc) return '';", breaks: ['H20', 'H15'] },
  // the page: what only the board can show
  { id: 'card-edit-writes-the-row', file: '../hanabi.js', from: "if (view.scope === 'card') cellOf(design, suit.id, rank, true)[k] = v;", to: "if (false) cellOf(design, suit.id, rank, true)[k] = v;", breaks: ['B5'] },
  { id: 'board-greyscale-not-wired', file: '../hanabi.js', from: "if (e.target.id === 'boardGray') { setGray(e.target.checked); return; }", to: "if (e.target.id === 'boardGray') return;", breaks: ['B5'] },
  { id: 'drag-writes-the-rank-column', file: '../hanabi.js', from: "cellOf(design, suit.id, rank, true).items = d.items.map((x) => ({ ...x }));", to: "design.arrangements[rank] = d.items.map((x) => ({ ...x }));", breaks: ['B7'] },
  { id: 'suit-rows-hold-stale-suits', file: '../hanabi.js', from: "const me = () => suitById(design, suit.id);", to: "const me = () => suit;", breaks: ['B6'] },
];

// The catalogue motifs: every motif that is neither a firework type nor phase 1's.
const CATALOGUE = (F) => F.MOTIF_IDS.filter((m) => m !== 'classic' && !m.startsWith('radial-') && !F.TYPE_IDS.includes(m));

// The page as it shipped before the board: H15's reference. Read from git, so the
// reference cannot be this tree's own reading of an old file.
const BASE = 'd5cd4ef';
let baseDir = null;
async function baseModules() {
  if (baseDir) return baseDir;
  baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hanabi-base-'));
  for (const f of MODULES) fs.writeFileSync(path.join(baseDir, f), execFileSync('git', ['-C', REPO, 'show', `${BASE}:hanabi/${f}`]));
  return baseDir;
}

// ---- a binary raster of every mark a firework puts down (H16): circles, lines
// and absolute M/L/C/Z paths, stroked or filled, in a G x G grid over the box.
function raster(svg, box, G = 72) {
  const x0 = box.cx - box.r, y0 = box.cy - box.r, cell = (2 * box.r) / G, grid = new Uint8Array(G * G);
  const mark = (x, y, pad) => {
    const rr = Math.max(pad, cell * 0.5);
    for (let gy = Math.floor((y - rr - y0) / cell); gy <= Math.floor((y + rr - y0) / cell); gy++)
      for (let gx = Math.floor((x - rr - x0) / cell); gx <= Math.floor((x + rr - x0) / cell); gx++) {
        if (gx < 0 || gy < 0 || gx >= G || gy >= G) continue;
        if (Math.hypot(x0 + (gx + 0.5) * cell - x, y0 + (gy + 0.5) * cell - y) <= rr + cell * 0.5) grid[gy * G + gx] = 1;
      }
  };
  const seg = (a, b, pad) => { const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (cell / 3))); for (let i = 0; i <= n; i++) mark(a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n, pad); };
  const fill = (poly) => {
    for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
      const px = x0 + (gx + 0.5) * cell, py = y0 + (gy + 0.5) * cell; let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside; }
      if (inside) grid[gy * G + gx] = 1;
    }
  };
  for (const m of svg.matchAll(/<circle cx="([-\d.]+)" cy="([-\d.]+)" r="([-\d.]+)"/g)) mark(+m[1], +m[2], +m[3]);
  for (const m of svg.matchAll(/<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"[^>]*stroke-width="([\d.]+)"/g)) seg([+m[1], +m[2]], [+m[3], +m[4]], +m[5] / 2);
  for (const m of svg.matchAll(/<path d="([^"]+)"([^>]*)>/g)) {
    const sw = /stroke-width="([\d.]+)"/.exec(m[2]), filled = !/fill="none"/.test(m[2]);
    const pts = []; let cur = null, start = null;
    for (const sg of m[1].match(/[MLCZ][^MLCZ]*/g)) {
      const c = sg[0], n = (sg.slice(1).match(/-?[\d.]+/g) || []).map(Number);
      if (c === 'M' || c === 'L') { cur = [n[0], n[1]]; if (c === 'M') start = cur; pts.push(cur); }
      else if (c === 'Z') cur = start;
      else { const ctrl = [cur]; for (let i = 0; i < n.length; i += 2) ctrl.push([n[i], n[i + 1]]); for (let k = 1; k <= 12; k++) { const t = k / 12; let q = ctrl.map((p) => p.slice()); while (q.length > 1) q = q.slice(1).map((p, i) => [q[i][0] + (p[0] - q[i][0]) * t, q[i][1] + (p[1] - q[i][1]) * t]); pts.push(q[0]); } cur = ctrl[ctrl.length - 1]; }
    }
    if (filled) fill(pts); else for (let i = 1; i < pts.length; i++) seg(pts[i - 1], pts[i], sw ? +sw[1] / 2 : 0.1);
  }
  return { grid, G };
}
// a rotation-tolerant description: ink in 8 radial bands, the balance of ink below
// the centre against above, the piece count (log), the largest piece's share
function describe({ grid, G }) {
  const bands = new Array(8).fill(0), tot = new Array(8).fill(0); let ink = 0, low = 0, up = 0;
  for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
    const dd = Math.hypot(x + 0.5 - G / 2, y + 0.5 - G / 2) / (G / 2); if (dd >= 1) continue;
    const b = Math.min(7, Math.floor(dd * 8)); tot[b]++;
    if (grid[y * G + x]) { bands[b]++; ink++; if (y >= G / 2) low++; else up++; }
  }
  const seen = new Uint8Array(G * G); let comps = 0, big = 0;
  for (let i = 0; i < G * G; i++) if (grid[i] && !seen[i]) {
    comps++; let sz = 0; const st = [i]; seen[i] = 1;
    while (st.length) { const j = st.pop(); sz++; const x = j % G, y = (j / G) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= G || ny >= G) continue; const k = ny * G + nx; if (grid[k] && !seen[k]) { seen[k] = 1; st.push(k); } } }
    big = Math.max(big, sz);
  }
  return [...bands.map((v, i) => v / tot[i]), (low - up) / Math.max(1, ink), Math.log1p(comps) / Math.log1p(300), big / Math.max(1, ink)];
}
// a band weighs as its area (an inner band is a few cells, an outer one hundreds)
const sdist = (a, b) => a.reduce((x, v, i) => x + Math.abs(v - b[i]) * (i < 8 ? (2 * i + 1) / 8 : 1), 0);

// ---------------------------------------------------------------- part one
async function partOne(dir) {
  const imp = (m) => import(pathToFileURL(path.join(dir, m)).href + `?t=${Date.now()}${Math.random()}`);
  const D = await imp('deck.js'); const S = await imp('symbols.js'); const F = await imp('firework.js'); const L = await imp('layout.js');
  const res = [];
  const check = (id, name, fn) => { try { const r = fn(); res.push({ id, name, ok: r === true, detail: r === true ? '' : String(r) }); } catch (e) { res.push({ id, name, ok: false, detail: 'threw ' + e.message }); } };
  const checkAsync = async (id, name, fn) => { try { const r = await fn(); res.push({ id, name, ok: r === true, detail: r === true ? '' : String(r) }); } catch (e) { res.push({ id, name, ok: false, detail: 'threw ' + e.message }); } };
  const COMPOSES = ['count', 'countscale', 'scale', 'column', 'bleed'];   // restated
  const symbolPath = (id) => S.SYMBOLS[id].d.slice(0, 40);

  check('H1', 'the standard distribution', () => {
    const d = D.defaultDesign();
    const per = (cards, id) => [1, 2, 3, 4, 5].map((r) => cards.filter((c) => c.suitId === id && c.rank === r).length).join('');
    let cards = D.deckCards(d);
    for (const s of D.activeSuits(d)) if (per(cards, s.id) !== '32221') return `${s.id}: ${per(cards, s.id)}`;
    if (cards.filter((c) => c.kind === 'card').length !== 50) return `${cards.length} cards without rainbow`;
    if (cards.filter((c) => c.kind === 'clue').length !== 8 || cards.filter((c) => c.kind === 'fuse').length !== 3) return 'tokens wrong';
    d.rainbow = true; cards = D.deckCards(d);
    if (cards.filter((c) => c.kind === 'card').length !== 60) return `${cards.length} with rainbow`;
    if (per(cards, 'rainbow') !== '32221') return 'rainbow distribution';
    return true;
  });

  check('H2', 'a symbol on every face', () => {
    const d = D.defaultDesign(); d.rainbow = true;
    if (D.symbolClashes(d).size) return 'default suits share a symbol';
    for (const index of ['large', 'small', 'band']) for (const centre of COMPOSES) for (const corners of ['inverted', 'upright', 'four']) {
      d.index = index; d.corners = corners; for (const s of d.suits) s.centre = { compose: centre, motif: 'spoke', tier: 'rosettes' };
      const layout = `${index}/${centre}`;
      for (const s of D.activeSuits(d)) for (const r of [1, 5]) {
        const svg = L.renderFace(d, { kind: 'card', suitId: s.id, rank: r });
        if (!svg.includes(symbolPath(s.symbol))) return `${layout}/${corners} ${s.id} ${r}: no symbol`;
        for (const o of D.activeSuits(d)) if (o.id !== s.id && svg.includes(symbolPath(o.symbol))) return `${s.id} carries ${o.id}'s symbol`;
      }
    }
    const clash = D.defaultDesign(); clash.suits[1].symbol = clash.suits[0].symbol;
    if (D.symbolClashes(clash).size !== 2) return 'a shared symbol is not reported';
    return true;
  });

  check('H3', 'rank escalates; duplicates identical', () => {
    const d = D.defaultDesign();
    for (const s of d.suits) s.centre = { compose: 'scale', motif: 'classic', tier: 'none' };
    for (const s of d.suits) {
      let prev = null;
      for (const r of [1, 2, 3, 4, 5]) {
        const sp = F.fireworkSpec(d, s, r);
        const fullness = sp.starCount * sp.rings;
        if (prev && !(fullness > prev.fullness && sp.size > prev.size)) return `${s.id} ${r} is not fuller than ${r - 1}`;
        prev = { fullness, size: sp.size };
      }
    }
    // every other motif: strictly more marks, rank on rank (the count of drawn
    // primitives — what the eye counts as "fuller")
    const red = D.suitById(d, 'red'), marks = (svg) => (svg.match(/<(line|circle|path)\b/g) || []).length;
    for (const m of CATALOGUE(F)) {
      const n = [1, 2, 3, 4, 5].map((r) => marks(F.renderFirework(F.defaultSpec(red, r, d.suits, m), { cx: 30, cy: 40, r: 26 })));
      for (let i = 1; i < 5; i++) if (!(n[i] > n[i - 1])) return `${m}: rank ${i + 1} draws ${n[i]} marks, rank ${i} ${n[i - 1]}`;
    }
    // a firework type under Scale: strictly larger rank on rank, never sparser
    for (const m of F.TYPE_IDS) {
      const sp = [1, 2, 3, 4, 5].map((r) => F.defaultSpec(red, r, d.suits, m, 'none', 'scale'));
      const n = sp.map((x) => marks(F.renderFirework(x, { cx: 30, cy: 40, r: 26 })));
      for (let i = 1; i < 5; i++) if (!(sp[i].size > sp[i - 1].size) || n[i] < n[i - 1]) return `${m}: rank ${i + 1} (size ${sp[i].size}, ${n[i]} marks) is not fuller than rank ${i} (${sp[i - 1].size}, ${n[i - 1]})`;
    }
    for (const s of d.suits) s.centre = { compose: 'scale', motif: 'starfield', tier: 'rosettes' };
    const cards = D.deckCards(d).filter((c) => c.kind === 'card' && c.suitId === 'red' && c.rank === 4);
    const svgs = new Set(cards.map((c) => L.renderFace(d, c, { idPrefix: 'x' })));
    return svgs.size === 1 || `${svgs.size} distinct pictures for red 4`;
  });

  check('H4', 'a phase-2 override reaches its card only', () => {
    const d = D.defaultDesign();
    const before = D.deckCards(d).map((c) => L.renderFace(d, c, { idPrefix: 'x' }));
    d.fireworks = { blue: { 3: { burstType: 'willow', colors: ['#00FF00'] } } };
    const after = D.deckCards(d).map((c) => L.renderFace(d, c, { idPrefix: 'x' }));
    const moved = D.deckCards(d).filter((c, i) => before[i] !== after[i]);
    if (!moved.length) return 'override moved nothing';
    if (!moved.every((c) => c.suitId === 'blue' && c.rank === 3)) return 'override moved another card';
    return F.fireworkSpec(d, D.suitById(d, 'blue'), 3).burstType === 'willow' || 'spec not merged';
  });

  check('H5', 'every layout x corners x size renders its bleed box', () => {
    const d = D.defaultDesign();
    const sizes = [['poker', 63.5, 88.9], ['bridge', 57.2, 88.9], ['mini', 44, 63], ['custom', 70, 120]];
    const well = (svg, w, h, tag) => {
      const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
      if (!vb || Math.abs(+vb[1] - (w + 2 * d.bleed)) > 1e-6 || Math.abs(+vb[2] - (h + 2 * d.bleed)) > 1e-6) return `${tag}: viewBox ${vb && vb.slice(1)}`;
      if ((svg.match(/<svg/g) || []).length !== 1 || !svg.endsWith('</svg>') || /NaN|undefined|Infinity/.test(svg)) return `${tag}: malformed`;
      return null;
    };
    for (const [preset, w, h] of sizes) for (const index of ['large', 'small', 'band']) for (const centre of COMPOSES) for (const corners of ['inverted', 'upright', 'four']) {
      d.size = { preset, w, h }; d.index = index; d.corners = corners;
      for (const s of d.suits) s.centre = { compose: centre, motif: 'classic', tier: 'none' };
      const bad = well(L.renderFace(d, { kind: 'card', suitId: 'green', rank: 4 }, { guides: true }), w, h, `${preset}/${index}/${centre}/${corners}`);
      if (bad) return bad;
    }
    for (const [preset, w, h] of [sizes[0], sizes[2]]) for (const motif of F.MOTIF_IDS) for (const centre of COMPOSES) for (const tier of ['none', 'rosettes']) {
      d.size = { preset, w, h }; d.index = 'large'; d.corners = 'four';
      for (const s of d.suits) s.centre = { compose: centre, motif, tier };
      for (const r of [1, 5]) { const bad = well(L.renderFace(d, { kind: 'card', suitId: 'yellow', rank: r }), w, h, `${preset}/${motif}/${centre}/${tier}/${r}`); if (bad) return bad; }
    }
    return true;
  });

  check('H6', 'imposition: in bounds, no overlap, marks on trim lines', () => {
    for (const size of [['poker', 63.5, 88.9], ['bridge', 57.2, 88.9], ['mini', 44, 63]]) for (const paper of ['letter', 'a4'])
    for (const bleed of [0, 2, 3]) for (const cut of ['separate', 'shared']) {
      const d = D.defaultDesign(); d.size = { preset: size[0], w: size[1], h: size[2] }; d.bleed = bleed; d.print.cut = cut;
      const im = D.imposition(d, paper), P = im.paper, tag = `${size[0]}/${paper}/${bleed}/${cut}`;
      if (im.perSheet < 4) return `${tag}: only ${im.perSheet}`;
      const trimX = new Set(), trimY = new Set();
      for (const s of im.slots) {
        const r = s.draw;
        if (r.x < 5.999 || r.y < 5.999 || r.x + r.w > P.w - 5.999 || r.y + r.h > P.h - 5.999) return `${tag}: art in the mark margin`;
        // the TRIM must be inside the drawn art, with this card's bleed on every outer edge
        if (r.x > s.trimX + 1e-9 || r.y > s.trimY + 1e-9 || r.x + r.w < s.trimX + size[1] - 1e-9 || r.y + r.h < s.trimY + size[2] - 1e-9) return `${tag}: trim not covered`;
        for (const o of im.slots) { const q = o.draw; if (o !== s && r.x < q.x + q.w - 1e-6 && q.x < r.x + r.w - 1e-6 && r.y < q.y + q.h - 1e-6 && q.y < r.y + r.h - 1e-6) return `${tag}: overlap`; }
        if (cut === 'separate' && (Math.abs(r.w - size[1] - 2 * bleed) > 1e-9 || Math.abs(r.h - size[2] - 2 * bleed) > 1e-9)) return `${tag}: a card lost its bleed`;
        trimX.add((s.trimX).toFixed(6)); trimX.add((s.trimX + size[1]).toFixed(6)); trimY.add((s.trimY).toFixed(6)); trimY.add((s.trimY + size[2]).toFixed(6));
      }
      // restated trim: in shared mode every cut is ONE line between two cards
      if (cut === 'shared' && (trimX.size !== im.cols + 1 || trimY.size !== im.rows + 1)) return `${tag}: ${trimX.size} vertical cuts for ${im.cols} columns`;
      const marks = D.cropMarks(im);
      if (marks.length !== 2 * (trimX.size + trimY.size)) return `${tag}: ${marks.length} marks for ${trimX.size}+${trimY.size} trim lines`;
      for (const [x1, y1, x2, y2] of marks) {
        const vertical = x1 === x2;
        if (vertical ? !trimX.has(x1.toFixed(6)) : !trimY.has(y1.toFixed(6))) return `${tag}: a mark off every trim line`;
        const crosses = vertical ? (Math.min(y1, y2) < im.y0 + im.gridH && Math.max(y1, y2) > im.y0) : (Math.min(x1, x2) < im.x0 + im.gridW && Math.max(x1, x2) > im.x0);
        if (crosses) return `${tag}: a mark crosses the art`;
      }
    }
    return true;
  });

  check('H7', 'duplex backs land behind their faces', () => {
    // restated: a long-edge flip mirrors across the long side's axis — left-right on a
    // portrait sheet, top-bottom on a landscape one; short-edge the other way
    for (const [size, paper] of [['mini', 'letter'], ['poker', 'letter']]) for (const flip of ['long', 'short']) {
      const d = D.defaultDesign(); d.size = { preset: size, ...D.SIZE_PRESETS[size] };
      const im = D.imposition(d, paper), P = im.paper;
      const mirrorX = (P.w < P.h) === (flip === 'long');
      for (let i = 0; i < im.slots.length; i++) {
        const f = im.slots[i], bk = im.slots[D.backSlotIndex(im, i, flip)];
        const wantX = mirrorX ? P.w - f.trimX - d.size.w : f.trimX, wantY = mirrorX ? f.trimY : P.h - f.trimY - d.size.h;
        if (Math.abs(bk.trimX - wantX) > 1e-6 || Math.abs(bk.trimY - wantY) > 1e-6) return `${size}/${P.orientation}/${flip}: slot ${i}`;
      }
      if (im.cols < 2 || im.rows < 2) return `${size}: a ${im.cols}x${im.rows} grid cannot show a mirror`;
    }
    return true;
  });

  check('H8', 'a low-contrast mark gets a halo', () => {
    const d = D.defaultDesign(); d.suits[2].primary = '#1A2A60'; d.face.bg = '#0B1018';
    if (L.contrast(d.suits[2].primary, d.face.bg) >= L.HALO_BELOW) return 'fixture is not low contrast';
    const svg = L.renderFace(d, { kind: 'card', suitId: 'blue', rank: 2 });
    return /stroke="#FFFFFF" stroke-width="18"/.test(svg) || 'no halo on the numeral';
  });

  check('H9', 'the design file round-trips; newer refused', () => {
    const d = D.defaultDesign(); d.rainbow = true; d.index = 'band'; d.suits[0].name = 'Moon';
    d.fireworks = { red: { 2: { rings: 2 } }, blue: { 3: { starSize: 1.8, items: [{ x: 0.2, y: 0.3, s: 0.5, rot: 15 }, { x: 0.6, y: 0.5, s: 0.7, rot: 0 }, { x: 0.4, y: 0.9, s: 0.4, rot: -30 }] } } };
    d.suits[1].centre = { compose: 'column', motif: 'weeping', tier: 'none' }; d.suits[2].centre = { compose: 'scale', motif: 'dome', tier: 'rosettes' };
    d.suits[3].firework = { count: 30, trail: 0.4, tips: false, coreColor: '#FF00AA', outerColor: '' };
    d.arrangements = { 2: [{ x: 0.5, y: 0.2, s: 0.6, rot: 0 }, { x: 0.5, y: 0.8, s: 0.9, rot: 45 }] };
    d.scene = { on: true, kind: 'rooftops', color: '#223344', height: 0.3 };
    const { design, notes } = D.normaliseDesign(JSON.parse(D.serialiseDesign(d)), S.SYMBOL_IDS);
    if (notes.length) return notes.join('; ');
    if (JSON.stringify(design) !== JSON.stringify({ ...d })) return 'did not come back identical';
    const newer = D.normaliseDesign({ ...d, version: D.VERSION + 1 }, S.SYMBOL_IDS);
    if (newer.design !== null) return 'newer version read';
    // version 1: one layout for the deck. RESTATED, not read from deck.js.
    const want = { A: ['large', 'scale'], B: ['small', 'column'], C: ['band', 'bleed'] };
    for (const [L1, [index, compose]] of Object.entries(want)) {
      const v1 = { format: 'hanabi-deck', version: 1, layout: L1, suits: D.defaultSuits().map(({ centre, firework, ...s }) => s) };
      const r = D.normaliseDesign(v1, S.SYMBOL_IDS);
      if (r.design.index !== index || r.design.suits.some((s) => s.centre.compose !== compose || s.centre.motif !== 'classic')) return `v1 layout ${L1} read as ${r.design.index}/${r.design.suits[0].centre.compose}`;
      if (!r.notes.some((n) => n.includes(`layout ${L1}`))) return `v1 layout ${L1} read without saying so`;
    }
    // version 2: single / count / bleed are scale / column / bleed, and the
    // phase-1 radial bursts keep drawing themselves under a new name, told
    for (const [layout, compose] of [['single', 'scale'], ['count', 'column'], ['bleed', 'bleed']]) {
      const v2 = { format: 'hanabi-deck', version: 2, suits: D.defaultSuits().map(({ centre, firework, ...s }) => ({ ...s, centre: { layout, motif: 'willow', tier: 'none' } })) };
      const r = D.normaliseDesign(v2, S.SYMBOL_IDS);
      if (r.design.suits.some((s) => s.centre.compose !== compose || s.centre.motif !== 'radial-willow')) return `v2 ${layout}/willow read as ${r.design.suits[0].centre.compose}/${r.design.suits[0].centre.motif}`;
      if (!r.notes.some((n) => n.includes('radial'))) return 'a renamed phase-1 firework loaded without a note';
    }
    // a file saved before Spark drift and Streamers were removed (Nov 9): the
    // suit keeps its own firework with no second tier, and SAYS so
    const old = JSON.parse(D.serialiseDesign(D.defaultDesign()));
    old.suits[0].centre = { compose: 'scale', motif: 'sparks', tier: 'streamers' };
    const o = D.normaliseDesign(old, S.SYMBOL_IDS), oc = o.design.suits[0].centre;
    if (oc.motif !== D.defaultDesign().suits[0].centre.motif || oc.tier !== 'none') return `a removed firework read as ${oc.motif}/${oc.tier}`;
    if (!o.notes.some((n) => n.includes('"sparks"')) || !o.notes.some((n) => n.includes('"streamers"'))) return `a removed firework or tier loaded without a note: ${o.notes.join('; ')}`;
    return true;
  });
  // ---- geometry read off the SVG: every point a mark puts down. Paths are
  // absolute M/L/Q/C/Z (the motifs' own contract), sampled along each curve.
  const pointsOf = (svg) => {
    const pts = [];
    for (const m of svg.matchAll(/<circle cx="([-\d.]+)" cy="([-\d.]+)" r="([-\d.]+)"/g)) pts.push({ x: +m[1], y: +m[2], pad: +m[3] });
    for (const m of svg.matchAll(/<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)" stroke="[^"]+" stroke-width="([\d.]+)"/g)) {
      pts.push({ x: +m[1], y: +m[2], pad: +m[5] / 2 }, { x: +m[3], y: +m[4], pad: +m[5] / 2 });
    }
    for (const m of svg.matchAll(/<path d="([^"]+)"([^>]*)>/g)) {
      const sw = /stroke-width="([\d.]+)"/.exec(m[2]), pad = sw ? +sw[1] / 2 : 0;
      let cur = null, start = null;
      for (const seg of m[1].match(/[MLQCZ][^MLQCZ]*/g)) {
        const c = seg[0], n = (seg.slice(1).match(/-?[\d.]+/g) || []).map(Number);
        if (/[AHVSTmlqcahvst]/.test(seg)) throw new Error('a motif path uses a command the gate cannot read: ' + seg.slice(0, 12));
        if (c === 'M') { cur = [n[0], n[1]]; start = cur; pts.push({ x: cur[0], y: cur[1], pad }); }
        else if (c === 'L') { cur = [n[0], n[1]]; pts.push({ x: cur[0], y: cur[1], pad }); }
        else if (c === 'Z') cur = start;
        else {
          const ctrl = [cur]; for (let i = 0; i < n.length; i += 2) ctrl.push([n[i], n[i + 1]]);
          for (let k = 1; k <= 16; k++) {
            const t = k / 16; let q = ctrl.map((p) => p.slice());
            while (q.length > 1) q = q.slice(1).map((p, i) => [q[i][0] + (p[0] - q[i][0]) * t, q[i][1] + (p[1] - q[i][1]) * t]);
            pts.push({ x: q[0][0], y: q[0][1], pad });
          }
          cur = ctrl[ctrl.length - 1];
        }
      }
    }
    return pts;
  };
  const group = (svg, cls) => { const i = svg.indexOf(`<g class="${cls}"`); return i < 0 ? '' : svg.slice(i); };

  check('H10', 'one corner index for the deck', () => {
    const d = D.defaultDesign(); d.rainbow = true;
    const centres = [['scale', 'teardrop', 'rosettes'], ['count', 'palm', 'none'], ['bleed', 'weeping', 'none'], ['countscale', 'starfield', 'rosettes'], ['column', 'dome', 'none'], ['bleed', 'rosettes', 'none']];
    for (const index of ['large', 'small', 'band']) for (const corners of ['inverted', 'upright', 'four']) {
      d.index = index; d.corners = corners;
      d.suits.forEach((s, i) => { s.centre = { compose: centres[i][0], motif: centres[i][1], tier: centres[i][2] }; });
      for (const r of [1, 4]) {
        // the index markup with the suit's own colour and symbol taken out
        const norm = (s) => {
          const svg = L.renderFace(d, { kind: 'card', suitId: s.id, rank: r }, { idPrefix: 'x' });
          const ix = svg.slice(svg.indexOf('<g class="hb-index">'));
          return ix.split(S.SYMBOLS[s.symbol].d).join('SYM').split(s.primary).join('COL').replace(/#[0-9A-F]{6}/gi, (h) => (h.toUpperCase() === d.face.bg ? h : 'INK'))
            .replace(/<rect x="[-\d.]+" y="[-\d.]+" width="[\d.]+" height="[\d.]+" rx="[\d.]+" fill="#[0-9A-F]{6}" fill-opacity="0.85"\/>/gi, '');
        };
        const plain = D.activeSuits(d).filter((s) => !s.multicolor);
        const ref = norm(plain[0]);
        for (const s of plain) if (norm(s) !== ref) return `${index}/${corners} rank ${r}: ${s.id}'s index differs from ${plain[0].id}'s`;
      }
      // one suit, every centre: its index never moves (a plate under a full-bleed centre aside)
      const s = D.suitById(d, 'green'), seen = new Set();
      for (const compose of COMPOSES) {
        s.centre = { compose, motif: 'starfield', tier: 'rosettes' };
        const svg = L.renderFace(d, { kind: 'card', suitId: 'green', rank: 5 }, { idPrefix: 'x' });
        seen.add(svg.slice(svg.indexOf('<g class="hb-index">')).replace(/<rect x="[-\d.]+" y="[-\d.]+" width="[\d.]+" height="[\d.]+" rx="[\d.]+" fill="#[0-9A-F]{6}" fill-opacity="0.85"\/>/gi, ''));
      }
      if (seen.size !== 1) return `${index}/${corners}: green's index moves with its centre (${seen.size} versions)`;
    }
    return true;
  });

  check('H11', "a suit's centre reaches its own cards only", () => {
    const d = D.defaultDesign();
    const all = () => D.deckCards(d).map((c) => L.renderFace(d, c, { idPrefix: 'x' }));
    const before = all();
    for (const [id, centre] of [['blue', { compose: 'scale', motif: 'weeping', tier: 'none' }], ['white', { compose: 'column', motif: 'dotring', tier: 'none' }], ['green', { compose: 'countscale', motif: 'crossette', tier: 'none' }]]) {
      const keep = JSON.stringify(D.suitById(d, id).centre);
      D.suitById(d, id).centre = centre;
      const after = all(), moved = D.deckCards(d).filter((c, i) => before[i] !== after[i]);
      if (!moved.length) return `${id}'s centre moved nothing`;
      if (!moved.every((c) => c.suitId === id)) return `${id}'s centre moved ${moved.find((c) => c.suitId !== id).suitId}`;
      D.suitById(d, id).centre = JSON.parse(keep);
    }
    return true;
  });

  check('H12', 'the second tier: ranks 4-5, single only, in its rect, clear of the index', () => {
    // restated: a corner index is 0.62 of its numeral wide and 1.7 of it tall
    // (numeral, gap, symbol), its numeral 0.13 / 0.095 of the card height
    const DIGIT = { large: 0.13, small: 0.095 };
    for (const [preset, w, h] of [['poker', 63.5, 88.9], ['mini', 44, 63], ['custom', 90, 70]]) for (const index of ['large', 'small', 'band']) for (const tier of ['rosettes']) {
      const d = D.defaultDesign(); d.size = { preset, w, h }; d.index = index; d.corners = 'four';
      const g = D.cardGeom(d), s = g.safeRect;
      const boxes = [];
      if (index !== 'band') {
        const dh = h * DIGIT[index], bw = dh * 0.62, bh = dh * 1.7;
        boxes.push({ x: s.x, y: s.y, w: bw, h: bh }, { x: s.x + s.w - bw, y: s.y, w: bw, h: bh }, { x: g.fullW - s.x - bw, y: g.fullH - s.y - bh, w: bw, h: bh }, { x: s.x, y: g.fullH - s.y - bh, w: bw, h: bh });
      } else {
        const bandH = g.bleed + g.safe + h * 0.13;
        boxes.push({ x: 0, y: 0, w: g.fullW, h: bandH }, { x: 0, y: g.fullH - bandH, w: g.fullW, h: bandH });
      }
      for (const layout of COMPOSES) for (const r of [1, 2, 3, 4, 5]) {
        for (const su of d.suits) su.centre = { compose: layout, motif: 'teardrop', tier };
        const svg = L.renderFace(d, { kind: 'card', suitId: 'red', rank: r }, { idPrefix: 'x' });
        const t = group(svg, 'hb-tier');
        const want = layout === 'scale' && (r === 4 || r === 5);
        if (!!t !== want) return `${preset}/${index}/${layout} rank ${r}: tier ${t ? 'drawn' : 'missing'}`;
        if (!t) continue;
        const tg = t.slice(0, t.indexOf('</g>'));
        for (const p of pointsOf(tg)) {
          if (p.x - p.pad < s.x - 1e-6 || p.x + p.pad > s.x + s.w + 1e-6 || p.y + p.pad > s.y + s.h + 1e-6) return `${preset}/${index}: tier mark outside the safe rect at ${p.x.toFixed(2)},${p.y.toFixed(2)}`;
          for (const b of boxes) if (p.x + p.pad > b.x && p.x - p.pad < b.x + b.w && p.y + p.pad > b.y && p.y - p.pad < b.y + b.h) return `${preset}/${index}/${tier}: tier mark on the corner index at ${p.x.toFixed(2)},${p.y.toFixed(2)}`;
        }
      }
    }
    return true;
  });

  check('H13', 'every catalogue motif and firework type stays in its box', () => {
    const d = D.defaultDesign(), suit = D.suitById(d, 'red');
    const fields = ['rosettes', 'starfield'];
    for (const m of [...CATALOGUE(F), ...F.TYPE_IDS]) for (const r of [1, 2, 3, 4, 5]) for (const R of [7, 26]) for (const rot of [0, 35]) {
      const spec = { ...F.defaultSpec(suit, r, d.suits, m), ...(F.TYPE_IDS.includes(m) ? { rotation: rot, starSize: rot ? 2.5 : 1 } : {}) };
      const box = { cx: 40, cy: 50, r: R };
      for (const p of pointsOf(F.renderFirework(spec, box))) {
        const out = Math.hypot(p.x - box.cx, p.y - box.cy) + p.pad - R;
        if (out > R * 0.02) return `${m} rank ${r}: a mark ${out.toFixed(2)} mm past r=${R}`;
      }
      if (fields.includes(m)) {
        const rect = { x: 10, y: 12, w: 30, h: 70 };
        for (const p of pointsOf(F.renderFirework(spec, { ...box, rect }))) {
          if (p.x - p.pad < rect.x - 1e-6 || p.x + p.pad > rect.x + rect.w + 1e-6 || p.y - p.pad < rect.y - 1e-6 || p.y + p.pad > rect.y + rect.h + 1e-6) return `${m} rank ${r}: a mark outside its rect at ${p.x.toFixed(2)},${p.y.toFixed(2)}`;
        }
      }
    }
    return true;
  });

  check('H14', "the rainbow index: numeral and symbol through the other suits' colours, by default, on the rainbow suit only, saved", () => {
    const d = D.defaultDesign(); d.rainbow = true;
    const rb = D.suitById(d, 'rainbow');
    if (rb.numeral !== 'rainbow') return `the default index fill is ${rb.numeral}, not rainbow`;
    rb.numeral = 'solid';
    const numeralStroke = (svg) => (svg.match(/<g class="hb-index">[\s\S]*?<path d="M[^"]*" fill="none"[^>]*stroke="([^"]+)" stroke-width="11"/) || [])[1];
    const solid = L.renderFace(d, { kind: 'card', suitId: 'rainbow', rank: 3 }, { idPrefix: 'x' });
    if (numeralStroke(solid) !== rb.primary || /id="x(num|sym)"/.test(solid)) return 'a solid rainbow numeral is not drawn in the suit primary';
    if (!solid.includes(`<path d="${S.SYMBOLS[rb.symbol].d}" fill="${rb.primary}"`)) return 'a solid rainbow symbol is not drawn in the suit primary';
    const redBefore = L.renderFace(d, { kind: 'card', suitId: 'red', rank: 3 }, { idPrefix: 'x' });
    rb.numeral = 'rainbow';
    for (const index of ['large', 'small']) {
      d.index = index;
      const svg = L.renderFace(d, { kind: 'card', suitId: 'rainbow', rank: 3 }, { idPrefix: 'x' });
      if (numeralStroke(svg) !== 'url(#xnum)') return `${index}: the numeral is stroked ${numeralStroke(svg)}, not the gradient`;
      const grad = (svg.match(/<linearGradient id="xnum"[\s\S]*?<\/linearGradient>/) || [])[0];
      if (!grad) return `${index}: no numeral gradient`;
      if (!/gradientUnits="userSpaceOnUse"/.test(grad)) return 'the gradient is in bounding-box units (a "1" has almost no width)';
      const stops = [...grad.matchAll(/stop-color="([^"]+)"/g)].map((m) => m[1]);
      // restated: the hued suits in hue order from red; white has no hue.
      const want = ['#E5484D', '#F2C230', '#3DBA6B', '#3E8EF0'];
      if (stops.join() !== want.join()) return `stops ${stops.join(' ')} — expected ${want.join(' ')}`;
      if ((svg.match(/stroke="url\(#xnum\)"/g) || []).length !== 2) return `${index}: the gradient numeral is not in both corners`;
      const sgrad = (svg.match(/<linearGradient id="xsym"[\s\S]*?<\/linearGradient>/) || [])[0];
      if (!sgrad || [...sgrad.matchAll(/stop-color="([^"]+)"/g)].map((m) => m[1]).join() !== want.join()) return `${index}: the symbol has no gradient through the same colours`;
      if ((svg.match(new RegExp(`<path d="${S.SYMBOLS[rb.symbol].d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" fill="url\\(#xsym\\)"`, 'g')) || []).length !== 2) return `${index}: the gradient symbol is not in both corners`;
    }
    d.index = 'large';
    if (L.renderFace(d, { kind: 'card', suitId: 'red', rank: 3 }, { idPrefix: 'x' }) !== redBefore) return 'the rainbow numeral reached the red suit';
    d.index = 'band';
    if (/url\(#x(num|sym)\)/.test(L.renderFace(d, { kind: 'card', suitId: 'rainbow', rank: 3 }, { idPrefix: 'x' }))) return 'a band index drew the gradient index on the rainbow band';
    d.index = 'large';
    D.suitById(d, 'blue').primary = '#8E5CF0';
    const moved = L.renderFace(d, { kind: 'card', suitId: 'rainbow', rank: 3 }, { idPrefix: 'x' });
    if (!/stop-color="#8E5CF0"/.test(moved) || /stop-color="#3E8EF0"/.test(moved)) return 'recolouring a suit did not move the gradient';
    D.suitById(d, 'blue').primary = '#3E8EF0';
    D.suitById(d, 'green').primary = '#10301C';   // a stop that does not stand off the dark card
    if (!/stroke="#FFFFFF" stroke-width="18"/.test(L.renderFace(d, { kind: 'card', suitId: 'rainbow', rank: 3 }, { idPrefix: 'x' }))) return 'a gradient with a dark stop got no halo';
    const back = D.normaliseDesign(JSON.parse(D.serialiseDesign(d)), S.SYMBOL_IDS);
    if (D.suitById(back.design, 'rainbow').numeral !== 'rainbow' || back.notes.length) return `the numeral fill did not round-trip: ${back.notes.join('; ')}`;
    const odd = JSON.parse(D.serialiseDesign(d)); odd.suits.find((x) => x.id === 'rainbow').numeral = 'plaid';
    const o = D.normaliseDesign(odd, S.SYMBOL_IDS);
    if (D.suitById(o.design, 'rainbow').numeral !== 'rainbow' || !o.notes.some((n) => n.includes('"plaid"'))) return 'an unknown index fill loaded without a note, or not as the default';
    const bare = JSON.parse(D.serialiseDesign(d)); bare.suits.forEach((x) => { delete x.numeral; });
    if (D.suitById(D.normaliseDesign(bare, S.SYMBOL_IDS).design, 'rainbow').numeral !== 'rainbow') return 'a file without the field did not get the rainbow default';
    return true;
  });

  // ---- H15: a saved design from before the board opens looking exactly as it did.
  // The reference is the page AS IT SHIPPED at BASE (git show), never this tree's
  // reading of it: every face of a v1 and a v2 file is rendered by the base modules
  // from the file as written, and by these modules from the file as migrated.
  await checkAsync('H15', `a v1 or v2 design renders byte-identically to ${BASE} after migration`, async () => {
    const B = await baseModules();
    const { MOTIF_IDS: baseMotifs } = await import(pathToFileURL(path.join(B, 'firework.js')).href);
    const bd = await import(pathToFileURL(path.join(B, 'deck.js')).href), bl = await import(pathToFileURL(path.join(B, 'layout.js')).href);
    let n = 0;
    const files = [];
    for (const layout of ['single', 'count', 'bleed']) for (const index of ['large', 'small', 'band']) for (const preset of ['poker', 'mini']) for (const m of baseMotifs) {
      const d = bd.defaultDesign(); d.rainbow = true; d.index = index; d.size = { preset, ...bd.SIZE_PRESETS[preset] };
      d.suits.forEach((s, i) => { s.centre = { layout, motif: m, tier: i % 2 ? 'rosettes' : 'none' }; });
      d.fireworks = { red: { 2: { rings: 2 } } };
      files.push([`v2 ${layout}/${index}/${preset}/${m}`, d, JSON.parse(bd.serialiseDesign(d))]);
    }
    for (const L1 of ['A', 'B', 'C']) {
      const d = bd.defaultDesign(); d.rainbow = true;
      const v1 = { format: 'hanabi-deck', version: 1, layout: L1, suits: d.suits.map(({ centre, ...s }) => s) };
      files.push([`v1 ${L1}`, bd.normaliseDesign(v1, S.SYMBOL_IDS).design, v1]);
    }
    for (const [tag, base, file] of files) {
      const { design } = D.normaliseDesign(file, S.SYMBOL_IDS);
      if (!design) return `${tag}: refused`;
      for (const c of bd.deckCards(base)) {
        if (c.copy) continue; n++;
        const a = bl.renderFace(base, c, { idPrefix: 'x' }), b = L.renderFace(design, c, { idPrefix: 'x' });
        if (a !== b) { let i = 0; while (a[i] === b[i]) i++; return `${tag} ${c.kind} ${c.suitId || ''} ${c.rank || ''}: differs at ${i}: …${a.slice(i - 20, i + 40)}… vs …${b.slice(i - 20, i + 40)}…`; }
      }
    }
    return n > 9000 || `only ${n} faces compared`;
  });

  // ---- H16: the nine firework types are nine SILHOUETTES, not recolours.
  // Each type is drawn under 12 seeds as a binary mask (colour plays no part:
  // greyscale by construction), described by its ink in 8 radial bands, its
  // top/bottom balance, its piece count and its largest piece. Every drawing must
  // sit nearer its own type's centroid than any other type's, by a margin; a
  // recolour, or two types drawing one shape, puts a drawing equally near both.
  check('H16', 'every firework type is a distinct silhouette, and the default suits each draw a different one', () => {
    if (F.TYPE_IDS.length < 9) return `${F.TYPE_IDS.length} types`;
    for (const t of ['peony', 'chrysanthemum', 'ring', 'willow', 'palm', 'crossette', 'dahlia', 'glitter', 'blossom']) if (!F.TYPE_IDS.includes(t)) return `no ${t}`;
    const box = { cx: 40, cy: 40, r: 26 }, N = 12, desc = {};
    for (const t of F.TYPE_IDS) desc[t] = [...Array(N)].map((_, k) => describe(raster(F.renderFirework(F.defaultSpec({ id: `q${k}`, primary: '#E5484D', secondary: '#9FB4C8' }, 1 + (k % 5), [], t, 'none', 'count'), box), box)));
    const cen = (arr, skip) => { const a = arr.filter((_, i) => i !== skip); return a[0].map((_, j) => a.reduce((x, v) => x + v[j], 0) / a.length); };
    const cens = Object.fromEntries(F.TYPE_IDS.map((t) => [t, cen(desc[t], -1)]));
    let worst = Infinity, at = '';
    for (const t of F.TYPE_IDS) desc[t].forEach((v, i) => {
      const own = sdist(v, cen(desc[t], i));
      for (const u of F.TYPE_IDS) if (u !== t) { const m = sdist(v, cens[u]) / Math.max(own, 1e-3); if (m < worst) { worst = m; at = `${t} seed ${i} vs ${u}`; } }
    });
    if (!(worst >= 1.25)) return `${at}: margin ${worst.toFixed(2)} (want >= 1.25)`;
    const d = D.defaultDesign(); d.rainbow = true;
    const types = D.activeSuits(d).map((s) => s.centre.motif);
    if (new Set(types).size !== types.length) return `default suits share a type: ${types.join(', ')}`;
    if (!types.every((t) => F.TYPE_IDS.includes(t))) return `a default suit draws a non-type: ${types.join(', ')}`;
    return true;
  });

  // ---- H17: Count draws exactly N fireworks for rank N, inside the centre field
  // (restated from the size and the index) on every preset; every other
  // composition draws its own number.
  check('H17', 'Count: rank N is N fireworks, held inside the field, clear of the index', () => {
    const DIGIT = { large: 0.13, small: 0.095 };
    const count = (svg) => (svg.match(/<g class="hb-firework"/g) || []).length;
    for (const [preset, w, h] of [['poker', 63.5, 88.9], ['bridge', 57.2, 88.9], ['mini', 44, 63]]) for (const index of ['large', 'small', 'band']) {
      const d = D.defaultDesign(); d.rainbow = true; d.size = { preset, w, h }; d.index = index; d.corners = 'four';
      const g = D.cardGeom(d), sr = g.safeRect;
      // the field: the area less the index columns, less a gap (restated)
      let area, cw;
      if (index === 'band') { const top = g.bleed + g.safe + h * 0.13 + h * 0.006; area = { x: sr.x, y: top, w: sr.w, h: g.fullH - 2 * top }; cw = 0; }
      else { area = sr; cw = h * DIGIT[index] * 0.62; }
      const gap = Math.max(0.8, area.h * 0.015), side = cw ? cw + gap : gap;
      const field = { x: area.x + side, y: area.y + gap, w: area.w - 2 * side, h: area.h - 2 * gap };
      for (const compose of COMPOSES) for (const s of D.activeSuits(d)) {
        s.centre = { ...s.centre, compose };
        for (const r of [1, 2, 3, 4, 5]) {
          const svg = L.renderFace(d, { kind: 'card', suitId: s.id, rank: r }, { idPrefix: 'x' });
          const want = compose === 'count' || compose === 'countscale' || compose === 'column' ? r : 1;
          if (count(svg) !== want) return `${preset}/${index}/${compose} ${s.id} ${r}: ${count(svg)} fireworks, want ${want}`;
          if (compose !== 'count' && compose !== 'countscale') continue;
          const art = svg.slice(0, svg.indexOf('<g class="hb-index">'));
          for (const p of pointsOf(art.slice(art.indexOf('<g class="hb-firework"')))) {
            if (p.x - p.pad < field.x - 0.05 || p.x + p.pad > field.x + field.w + 0.05 || p.y - p.pad < field.y - 0.05 || p.y + p.pad > field.y + field.h + 0.05) return `${preset}/${index}/${compose} ${s.id} ${r}: a mark at ${p.x.toFixed(2)},${p.y.toFixed(2)} outside the field`;
          }
        }
      }
    }
    // an arrangement of the wrong length is refused and said; the card still counts
    const d = D.defaultDesign();
    const file = JSON.parse(D.serialiseDesign(d));
    file.fireworks = { red: { 3: { items: [{ x: 0.5, y: 0.5, s: 0.5, rot: 0 }] } } }; file.arrangements = { 4: [{ x: 0.5, y: 0.5, s: 0.5 }] };
    const r = D.normaliseDesign(file, S.SYMBOL_IDS);
    if (r.design.fireworks.red || r.design.arrangements[4]) return 'a wrong-length arrangement was kept';
    if (r.notes.length < 2) return `a wrong-length arrangement was dropped without a note: ${r.notes.join('; ')}`;
    if (count(L.renderFace(r.design, { kind: 'card', suitId: 'red', rank: 3 })) !== 3) return 'red 3 is not three fireworks after a bad arrangement';
    // an arrangement moves its fireworks: the default and a cell's own differ
    const before = L.placementFor(d, D.suitById(d, 'red'), 2).items;
    D.cellOf(d, 'red', 2, true).items = [{ x: 0.1, y: 0.1, s: 0.3, rot: 0 }, { x: 0.9, y: 0.9, s: 0.3, rot: 0 }];
    const after = L.placementFor(d, D.suitById(d, 'red'), 2).items;
    if (Math.abs(after[0].cx - before[0].cx) < 1) return 'a cell arrangement did not move its fireworks';
    return true;
  });

  // ---- H18: the three levels. A suit parameter reaches every card of its row that
  // has not set that parameter, and nothing else; a cell's override is per key; a
  // reset puts the cell back byte for byte; a rank column's arrangement reaches every
  // suit, and applying it clears the cells' own.
  check('H18', 'inheritance: suit -> rank column -> cell, per key, and the resets', () => {
    const d = D.defaultDesign();
    const all = () => D.deckCards(d).filter((c) => c.kind === 'card' && !c.copy).map((c) => [c, L.renderFace(d, c, { idPrefix: 'x' })]);
    const diff = (A, B) => A.filter((x, i) => x[1] !== B[i][1]).map((x) => `${x[0].suitId}${x[0].rank}`);
    const start = all();
    D.cellOf(d, 'yellow', 3, true).starSize = 2.2;       // a cell override on another key
    D.cellOf(d, 'yellow', 4, true).count = 9;            // a cell override on THE key
    const mid = all();
    if (diff(start, mid).join() !== 'yellow3,yellow4') return `cell overrides moved ${diff(start, mid).join()}`;
    D.suitById(d, 'yellow').firework.count = 12;
    const row = diff(mid, all());
    if (row.join() !== 'yellow1,yellow2,yellow3,yellow5') return `a suit parameter moved ${row.join()} (want every yellow card but 4, which set its own)`;
    if (F.fireworkSpec(d, D.suitById(d, 'yellow'), 3).count !== 12 || F.fireworkSpec(d, D.suitById(d, 'yellow'), 3).starSize !== 2.2) return 'a cell override is not per key';
    if (F.fireworkSpec(d, D.suitById(d, 'yellow'), 4).count !== 9) return 'the cell lost its own count to the suit';
    // a parameter the type does not take never reaches the spec
    D.suitById(d, 'yellow').firework.density = 2;
    if (F.fireworkSpec(d, D.suitById(d, 'yellow'), 1).density !== undefined) return 'chrysanthemum took a density it has no use for';
    delete D.suitById(d, 'yellow').firework.density;
    D.suitById(d, 'yellow').firework = {};
    D.clearCell(d, 'yellow', 3); D.clearCell(d, 'yellow', 4);
    if (diff(start, all()).length) return `reset left ${diff(start, all()).join()} moved`;
    if (d.fireworks.yellow) return 'reset left an empty cell record';
    // the rank column: one arrangement for every suit's 2s
    const items = [{ x: 0.3, y: 0.3, s: 0.5, rot: 20 }, { x: 0.7, y: 0.7, s: 0.5, rot: -20 }];
    D.cellOf(d, 'red', 2, true).items = items.map((x) => ({ ...x, s: 0.9 }));
    D.applyArrangementToRank(d, 2, items);
    const col = diff(start, all());
    if (col.join() !== D.activeSuits(d).map((s) => `${s.id}2`).join()) return `the rank column moved ${col.join()}`;
    if (d.fireworks.red) return 'applying the column left red 2 with its own arrangement';
    return true;
  });

  // ---- H19: deterministic: the same spec draws the same picture, and nothing in
  // the renderers reads a clock or Math.random.
  check('H19', 'every firework is a pure function of its spec', () => {
    const src = fs.readFileSync(path.join(dir, 'firework.js'), 'utf8') + fs.readFileSync(path.join(dir, 'layout.js'), 'utf8');
    if (/Math\.random|Date\.now|performance\.now/.test(src)) return 'a renderer reads Math.random or a clock';
    const red = { id: 'red', primary: '#E5484D', secondary: '#F5A97A' };
    for (const m of F.MOTIF_IDS) for (const r of [1, 5]) {
      const sp = F.defaultSpec(red, r, [red], m, 'none', 'count'), box = { cx: 30, cy: 40, r: 20 };
      const a = F.renderFirework(sp, box), b = F.renderFirework(JSON.parse(JSON.stringify(sp)), box);
      if (a !== b) return `${m} ${r}: two drawings of one spec differ`;
      if (m !== 'dotring' && m !== 'blossom' && m !== 'dome' && m !== 'weeping' && F.renderFirework({ ...sp, seed: sp.seed + 1 }, box) === a) return `${m}: the seed moves nothing`;
    }
    return true;
  });

  // ---- H20: the scene band: off by default, and when on it sits along the bottom,
  // behind the fireworks and under the index, inside the bleed box.
  check('H20', 'the scene band: off by default; behind the fireworks, under the index, at its height', () => {
    const d = D.defaultDesign();
    if (d.scene.on) return 'the scene ships on';
    if (D.deckCards(d).some((c) => /hb-scene/.test(L.renderFace(d, c)))) return 'a scene drawn while off';
    for (const height of [0.08, 0.3, 0.45]) for (const kind of Object.keys(D.SCENES)) {
      d.scene = { on: true, kind, color: '#223344', height };
      const g = D.cardGeom(d), svg = L.renderFace(d, { kind: 'card', suitId: 'red', rank: 3 });
      const at = svg.indexOf('class="hb-scene"');
      if (at < 0) return `${kind}: no scene`;
      if (!(at < svg.indexOf('<g class="hb-firework"') && at < svg.indexOf('<g class="hb-index">'))) return `${kind}: the scene is drawn over the fireworks or the index`;
      const pts = [...svg.slice(at).match(/d="([^"]+)"/)[1].matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [+m[1], +m[2]]);
      const top = Math.min(...pts.map((p) => p[1]));
      if (pts.some(([x, y]) => x < -1e-6 || x > g.fullW + 1e-6 || y > g.fullH + 1e-6)) return `${kind}: the scene leaves the bleed box`;
      if (top < g.fullH * (1 - height) - 1e-6 || top > g.fullH * (1 - height * 0.4)) return `${kind} at ${height}: its top at ${top.toFixed(2)} of ${g.fullH.toFixed(2)}`;
    }
    return true;
  });
  return res;
}

// ---------------------------------------------------------------- part two
// findChromium() looks for chrome-linux/; newer installs ship chrome-linux64/.
function chromiumPath() {
  const p = findChromium(); if (p) return p;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for (const d of fs.readdirSync(base)) { const c = path.join(base, d, 'chrome-linux64', 'chrome'); if (d.startsWith('chromium-') && fs.existsSync(c)) return c; } } catch { /* none */ }
  return undefined;
}
function serve(root, overrides) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
    const rel = p.slice(1);
    const body = overrides[rel] ?? (fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel)) : null);
    if (body == null) { res.writeHead(404); return res.end(); }
    const ext = path.extname(rel);
    res.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[ext] || 'application/octet-stream' });
    res.end(body);
  });
  return new Promise((r) => server.listen(0, () => r(server)));
}

function readPpm(file) {
  const buf = fs.readFileSync(file);
  const head = buf.toString('latin1', 0, 64).split(/\s+/);
  const w = +head[1], h = +head[2];
  let off = 0, fields = 0;
  while (fields < 4) { while (/\s/.test(String.fromCharCode(buf[off]))) off++; while (!/\s/.test(String.fromCharCode(buf[off]))) off++; fields++; }
  off++;
  return { w, h, px: (x, y) => { const i = off + (y * w + x) * 3; return [buf[i], buf[i + 1], buf[i + 2]]; } };
}

async function partTwo(overrides = {}) {
  const { chromium } = await import(pathToFileURL(path.join(REPO, 'node_modules/playwright-core/index.mjs')).href);
  for (const m of ['jspdf/dist/jspdf.umd.min.js', 'jszip/dist/jszip.min.js'])
    if (!fs.existsSync(path.join(REPO, 'node_modules', m))) throw new Error(`missing node_modules/${m} — npm i --no-save jspdf@2.5.1 jszip@3.10.1 playwright-core`);
  const server = await serve(REPO, overrides);
  const base = `http://localhost:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: chromiumPath() });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.route('https://cdnjs.cloudflare.com/**', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(REPO, 'node_modules', r.request().url().includes('jspdf') ? 'jspdf/dist/jspdf.umd.min.js' : 'jszip/dist/jszip.min.js')) }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const res = [];
  const check = async (id, name, fn) => { try { const r = await fn(); res.push({ id, name, ok: r === true, detail: r === true ? '' : String(r) }); } catch (e) { res.push({ id, name, ok: false, detail: 'threw ' + e.message.split('\n')[0] }); } };
  try {
    await page.goto(`${base}/hanabi.html`);
    await page.evaluate(() => localStorage.clear());
    await page.reload(); await page.waitForFunction(() => window.__hanabi);

    await check('B1', 'loads; greyscale and guides act on the stage', async () => {
      if (errs.length) return errs.join(' | ');
      await page.check('#grayscale');
      const gray = await page.$eval('#stage .hb-cards', (el) => getComputedStyle(el).filter);
      await page.uncheck('#grayscale');
      await page.check('#guides');
      const guides = await page.$$eval('#stage .hb-guides', (g) => g.length);
      await page.uncheck('#guides');
      return (gray.includes('grayscale') && guides > 0) || `filter "${gray}", ${guides} guide groups`;
    });

    await check('B8', 'a version-2 design in localStorage opens migrated, exactly as Node reads it', async () => {
      const B = await baseModules();
      const bd = await import(pathToFileURL(path.join(B, 'deck.js')).href);
      const d = bd.defaultDesign(); d.rainbow = true;
      d.suits.forEach((x, i) => { x.centre = { layout: ['single', 'count', 'bleed'][i % 3], motif: ['peony', 'dome', 'classic'][i % 3], tier: 'none' }; });
      const file = bd.serialiseDesign(d);
      const D = await import(pathToFileURL(path.join(REPO, 'hanabi/deck.js')).href), S = await import(pathToFileURL(path.join(REPO, 'hanabi/symbols.js')).href);
      const want = JSON.stringify(D.normaliseDesign(JSON.parse(file), S.SYMBOL_IDS).design);
      await page.evaluate((f) => localStorage.setItem('hanabi.design.v1', f), file);
      await page.reload(); await page.waitForFunction(() => window.__hanabi);
      const got = JSON.stringify(await page.evaluate(() => window.__hanabi.design()));
      await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForFunction(() => window.__hanabi);
      return got === want || `the page read ${got.slice(0, 160)}…, Node ${want.slice(0, 160)}…`;
    });

    const snap = () => page.$$eval('#stage .hb-cell', (c) => Object.fromEntries(c.map((x) => [x.dataset.cell, x.innerHTML])));
    const moved = (a, b) => Object.keys(a).filter((k) => a[k] !== b[k]).sort().join();
    const setRange = (sel, v) => page.$eval(sel, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
    await check('B5', 'the Firework board: every suit x rank; a row edit reaches its row, a card edit its card; reset; greyscale', async () => {
      await page.click('[data-view=fireworks]');
      const n5 = (await snap()), keys = Object.keys(n5);
      if (keys.length !== 25 || !keys.every((k) => /^(white|red|blue|yellow|green):[1-5]$/.test(k))) return `${keys.length} cells: ${keys.join()}`;
      await page.check('#rainbow');
      const n6 = Object.keys(await snap()).length;
      await page.uncheck('#rainbow');
      if (n6 !== 30) return `${n6} cells with the rainbow suit, want 30`;
      await page.click('[data-cell="red:3"]');
      const title = await page.$eval('.hb-ed__title', (e) => e.textContent);
      if (!/Red 3/.test(title)) return `the editor shows "${title}"`;
      if (await page.$eval('[data-cell="red:3"]', (e) => e.getAttribute('aria-pressed')) !== 'true') return 'the picked cell is not marked';
      const a = await snap();
      await setRange('#p-count', 8);
      const b = await snap();
      const d1 = await page.evaluate(() => window.__hanabi.design());
      if (moved(a, b) !== 'red:1,red:2,red:3,red:4,red:5') return `a row edit repainted ${moved(a, b)}`;
      if (d1.suits.find((x) => x.id === 'red').firework.count !== 8 || Object.keys(d1.fireworks).length) return 'the row edit was not written to the suit';
      await page.click('[data-scope=card]');
      await setRange('#p-starSize', 2.2);
      const c = await snap();
      const d2 = await page.evaluate(() => window.__hanabi.design());
      if (moved(b, c) !== 'red:3') return `a card edit repainted ${moved(b, c)}`;
      if (!d2.fireworks.red || d2.fireworks.red[3].starSize !== 2.2) return `the card edit was written as ${JSON.stringify(d2.fireworks)}`;
      const marks = await page.$$eval('#stage .hb-cell.is-own', (e) => e.map((x) => x.dataset.cell).join());
      const dots = await page.$$eval('#stage .hb-cell .hb-cell__mark', (e) => e.length);
      if (marks !== 'red:3' || dots !== 1) return `override markers on ${marks} (${dots} dots)`;
      // a card scope edit leaves the row alone: the row value shown is still 8
      await page.click('[data-scope=row]');
      if (await page.$eval('#p-count', (e) => e.value) !== '8') return 'the row scope does not show the suit value';
      await page.click('[data-scope=card]');
      await page.click('#edReset');
      const d3 = await page.evaluate(() => window.__hanabi.design());
      if (Object.keys(d3.fireworks).length || await page.$$eval('#stage .hb-cell.is-own', (e) => e.length)) return 'reset to suit left an override';
      if (moved(b, await snap())) return `reset left ${moved(b, await snap())} moved`;
      await page.click('[data-scope=row]');
      await page.click('#editor [data-type=crossette]');
      const types = (await page.evaluate(() => window.__hanabi.design())).suits.map((x) => `${x.id}:${x.centre.motif}`).join();
      if (!types.includes('red:crossette') || types.split(',').filter((t) => t.endsWith(':crossette')).length !== 1) return `the type gallery set ${types}`;
      await page.check('#boardGray');
      const gray = await page.$eval('#stage .hb-cell svg', (e) => getComputedStyle(e).filter);
      const bar = await page.$eval('#grayscale', (e) => e.checked);
      await page.uncheck('#boardGray');
      const plain = await page.$eval('#stage .hb-cell svg', (e) => getComputedStyle(e).filter);
      if (!gray.includes('grayscale') || !bar || plain.includes('grayscale')) return `board greyscale: filter "${gray}" then "${plain}", toolbar ${bar}`;
      return true;
    });

    await check('B7', 'arranging a Count card by hand: drag, resize, turn, then use it for the whole rank', async () => {
      await page.evaluate(() => document.getElementById('resetDesign').click());
      await page.click('[data-cell="blue:2"]');
      const P = (s, r) => page.evaluate(([s, r]) => window.__hanabi.placement(s, r).items, [s, r]);
      const drag = async (sel, dx, dy) => {
        const bb = await page.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
        await page.mouse.move(bb.x, bb.y); await page.mouse.down();
        for (let k = 1; k <= 6; k++) await page.mouse.move(bb.x + (dx * k) / 6, bb.y + (dy * k) / 6);
        await page.mouse.up();
      };
      const red0 = await P('red', 2), blue0 = await P('blue', 2);
      const a = await snap();
      await drag('#edCard [data-h="move"][data-i="0"]', 24, 30);
      const blue1 = await P('blue', 2);
      const pxPerMm = await page.$eval('#edCard svg', (e) => e.getBoundingClientRect().width / e.viewBox.baseVal.width);
      const dmm = Math.hypot(blue1[0].cx - blue0[0].cx, blue1[0].cy - blue0[0].cy), want = Math.hypot(24, 30) / pxPerMm;
      if (Math.abs(dmm - want) > 1.2) return `the firework moved ${dmm.toFixed(2)} mm under a ${want.toFixed(2)} mm drag`;
      if (moved(a, await snap()) !== 'blue:2') return `a drag repainted ${moved(a, await snap())}`;
      await drag('#edCard [data-h="size"][data-i="1"]', 12, 0);
      const blue2 = await P('blue', 2);
      if (!(blue2[1].r > blue1[1].r + 0.5)) return `resize: r ${blue1[1].r.toFixed(2)} -> ${blue2[1].r.toFixed(2)}`;
      await drag('#edCard [data-h="rot"][data-i="0"]', 40, 25);
      const items = (await page.evaluate(() => window.__hanabi.design())).fireworks.blue[2].items;
      if (!items || items.length !== 2 || items[0].rot === 0) return `the card's arrangement: ${JSON.stringify(items)}`;
      if (JSON.stringify(await P('red', 2)) !== JSON.stringify(red0)) return 'another suit\'s 2 moved';
      await page.click('#edApplyRank');
      const d = await page.evaluate(() => window.__hanabi.design());
      if (d.fireworks.blue || JSON.stringify(d.arrangements[2]) !== JSON.stringify(items)) return `apply to the rank: arrangements ${JSON.stringify(d.arrangements)}, cells ${JSON.stringify(d.fireworks)}`;
      const red1 = await P('red', 2);
      if (Math.abs(red1[0].cx - red0[0].cx) < 1) return 'the rank column did not reach red';
      await page.evaluate(() => document.getElementById('resetDesign').click());
      await page.click('[data-view=suit]');
      return true;
    });

    await check('B2', 'the Centres view renders the five compositions, five cards each', async () => {
      await page.click('[data-view=layouts]');
      const rows = await page.$$eval('#stage .hb-group', (gs) => gs.map((g) => g.querySelectorAll('svg').length));
      await page.click('[data-view=suit]');
      return JSON.stringify(rows) === '[5,5,5,5,5]' || JSON.stringify(rows);
    });

    await check('B6', 'the rainbow suit\'s index control paints the preview (rainbow by default), and stands down under a band', async () => {
      await page.check('#rainbow');
      await page.selectOption('#viewSuit', 'rainbow');
      const others = await page.$$eval('select[data-n]', (s) => s.map((x) => x.id));
      if (others.join() !== 'c-rainbow-numeral') return `index controls: ${others.join() || 'none'}`;
      const dflt = await page.$eval('#c-rainbow-numeral', (s) => s.value);
      if (dflt !== 'rainbow') return `the control opens on ${dflt}, not rainbow`;
      const strokes = await page.$$eval('#stage .hb-index path[stroke^="url("]', (p) => p.length);
      const fills = await page.$$eval('#stage .hb-index path[fill$="sym)"]', (p) => p.length);
      await page.selectOption('#c-rainbow-numeral', 'solid');
      const solid = await page.$$eval('#stage .hb-index path[stroke^="url("], #stage .hb-index path[fill^="url("]', (p) => p.length);
      await page.selectOption('#c-rainbow-numeral', 'rainbow');
      const stops = await page.$$eval('#stage linearGradient[id$="num"]', (g) => g.length);
      await page.click('[data-index=band]');
      const disabled = await page.$eval('#c-rainbow-numeral', (s) => s.disabled);
      const bandStrokes = await page.$$eval('#stage .hb-index path[stroke$="num)"]', (p) => p.length);
      await page.click('[data-index=large]');
      await page.uncheck('#rainbow');
      return (strokes === 10 && fills === 10 && solid === 0 && stops === 5 && disabled && bandStrokes === 0) || `gradient numerals ${strokes} and symbols ${fills} (want 10 each), after solid ${solid}, gradients ${stops} (want 5), band: disabled ${disabled}, strokes ${bandStrokes}`;
    });

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hanabi-'));
    for (const cut of ['separate', 'shared']) await check('B3', `the PDF (${cut}): pages, orientation, crop marks on trim, art to the edge`, async () => {
      const duplex = cut === 'separate';
      const out = await page.evaluate(async ([cut, duplex]) => {
        const d = window.__hanabi.design(); d.print = { ...d.print, paper: 'letter', orientation: 'auto', cut, duplex, flip: 'long', cropMarks: true }; window.__hanabi.setDesign(d);
        const { doc, imp, pages } = await window.__hanabi.exportPdf({ returnDoc: true });
        return { b64: doc.output('datauristring').split(',')[1], cols: imp.cols, rows: imp.rows, perSheet: imp.perSheet, pages };
      }, [cut, duplex]);
      const dir = fs.mkdtempSync(path.join(tmp, cut));
      const pdf = path.join(dir, 'deck.pdf');
      fs.writeFileSync(pdf, Buffer.from(out.b64, 'base64'));
      if (KEEP) { fs.mkdirSync(KEEP, { recursive: true }); fs.copyFileSync(pdf, path.join(KEEP, `hanabi-${cut}.pdf`)); }
      // The reference is RESTATED here from the size and the paper, never read from
      // hanabi/deck.js — an imposition computed wrong there would otherwise agree with itself.
      const B = 3, CW = 63.5, CH = 88.9, ROOM = 6;
      const pX = cut === 'shared' ? CW : CW + 2 * B, pY = cut === 'shared' ? CH : CH + 2 * B, extra = cut === 'shared' ? 2 * B : 0;
      const fitIn = (P) => [Math.floor((P.w - 2 * ROOM - extra) / pX), Math.floor((P.h - 2 * ROOM - extra) / pY)];
      const por = { w: 215.9, h: 279.4 }, lan = { w: 279.4, h: 215.9 };
      const [pc, pr] = fitIn(por), [lc, lr] = fitIn(lan);
      const P = lc * lr > pc * pr ? lan : por, [cols, rows] = lc * lr > pc * pr ? [lc, lr] : [pc, pr];
      if (cols !== out.cols || rows !== out.rows) return `grid ${out.cols}x${out.rows}, want ${cols}x${rows}`;
      const info = execFileSync('pdfinfo', [pdf]).toString();
      const pages = +/Pages:\s+(\d+)/.exec(info)[1];
      const sheets = Math.ceil(61 / (cols * rows)), want = duplex ? 2 * sheets : sheets + 1;
      if (pages !== want || out.pages !== want) return `${pages} pages, want ${want}`;
      const size = /Page size:\s+([\d.]+) x ([\d.]+)/.exec(info);
      if (Math.abs(+size[1] - P.w / 25.4 * 72) > 1 || Math.abs(+size[2] - P.h / 25.4 * 72) > 1) return `page ${size[1]}x${size[2]} pt, want ${P.w}x${P.h} mm`;
      const DPI = 150;
      execFileSync('pdftoppm', ['-r', String(DPI), '-f', '1', '-l', '1', pdf, path.join(dir, 'p')]);
      const ppm = readPpm(fs.readdirSync(dir).filter((f) => f.endsWith('.ppm')).map((f) => path.join(dir, f))[0]);
      const mm = (v) => Math.round((v / 25.4) * DPI);
      const dark = ([r, g, b]) => r + g + b < 300, white = ([r, g, b]) => r + g + b > 740;
      const gridW = cols * pX + extra, gridH = rows * pY + extra;
      const x0 = (P.w - gridW) / 2, y0 = (P.h - gridH) / 2;
      const xs = new Set(), ys = new Set();
      for (let c = 0; c < cols; c++) { xs.add(+(x0 + B + c * pX).toFixed(4)); xs.add(+(x0 + B + c * pX + CW).toFixed(4)); }
      for (let r = 0; r < rows; r++) { ys.add(+(y0 + B + r * pY).toFixed(4)); ys.add(+(y0 + B + r * pY + CH).toFixed(4)); }
      let bad = 0, n = 0;
      for (const x of xs) for (const y of [y0 - 3, y0 + gridH + 3]) { n++; if (![-1, 0, 1].some((k) => dark(ppm.px(mm(x) + k, mm(y))))) bad++; }
      for (const y of ys) for (const x of [x0 - 3, x0 + gridW + 3]) { n++; if (![-1, 0, 1].some((k) => dark(ppm.px(mm(x), mm(y) + k)))) bad++; }
      if (bad) return `${bad} of ${n} crop marks not inked where computed`;
      // the grid's outer edge: art just inside, paper just outside; and between the
      // first two cards no paper shows (separate: bleed meets bleed; shared: one cut)
      const midY = y0 + B + CH / 2;
      if (white(ppm.px(mm(x0 + 0.4), mm(midY))) || !white(ppm.px(mm(x0 - 0.6), mm(midY)))) return 'outer bleed edge is not where restated';
      const between = x0 + pX + (cut === 'shared' ? B : 0);
      for (const dx of [-0.8, 0, 0.8]) if (white(ppm.px(mm(between + dx), mm(midY)))) return `paper showing between cards at ${dx} mm`;
      return true;
    });

    await check('B4', 'the PNG zip: every face + back at 300 dpi', async () => {
      const r = await page.evaluate(async () => {
        const blob = await window.__hanabi.exportZip({ returnBlob: true });
        const zip = await window.JSZip.loadAsync(blob);
        const names = Object.keys(zip.files).filter((n) => n.endsWith('.png'));
        const first = await zip.file(names[0]).async('uint8array');
        const dv = new DataView(first.buffer);
        return { n: names.length, w: dv.getUint32(16), h: dv.getUint32(20), names };
      });
      const d = (await import(pathToFileURL(path.join(REPO, 'hanabi/deck.js')).href)).defaultDesign();
      const wantW = Math.round(((d.size.w + 2 * d.bleed) / 25.4) * 300), wantH = Math.round(((d.size.h + 2 * d.bleed) / 25.4) * 300);
      if (r.n !== 62) return `${r.n} PNGs, want 61 faces + back`;
      return (r.w === wantW && r.h === wantH) || `${r.w}x${r.h}, want ${wantW}x${wantH}`;
    });
    if (errs.length) res.push({ id: 'B0', name: 'no page errors during the run', ok: false, detail: errs.join(' | ') });
  } finally { await browser.close(); server.close(); }
  return res;
}

// ---------------------------------------------------------------- run
function report(label, res) {
  for (const r of res) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.id} ${r.name}${r.ok ? '' : ' — ' + r.detail}`);
  const bad = res.filter((r) => !r.ok);
  console.log(`${label}: ${res.length - bad.length}/${res.length} passed`);
  return bad;
}

if (!NEG) {
  let bad = report('part one', await partOne(path.join(REPO, 'hanabi')));
  if (!NO_BROWSER) bad = bad.concat(report('part two', await partTwo()));
  process.exit(bad.length ? 1 : 0);
} else {
  // anchors first, for every mutant, before any runs
  for (const m of MUTANTS) {
    const src = fs.readFileSync(path.join(REPO, 'hanabi', m.file), 'utf8');   // '../hanabi.js' is the page
    const count = src.split(m.from).length - 1;
    if (count !== 1) { console.log(`ANCHOR ${m.id}: matches ${count} times`); process.exit(1); }
  }
  let failed = 0;
  const RUN = ONLY.length ? MUTANTS.filter((m) => ONLY.includes(m.id)) : MUTANTS;
  if (ONLY.length && RUN.length !== ONLY.length) { console.log(`unknown mutant in --mutant=${ONLY.join(',')}`); process.exit(1); }
  for (const m of RUN) {
    const dir = fs.mkdtempSync(path.join(REPO, '.hanabi-mut-'));
    try {
      for (const f of MODULES) fs.copyFileSync(path.join(REPO, 'hanabi', f), path.join(dir, f));
      const page = m.file === '../hanabi.js';
      const p = page ? path.join(dir, 'page.js') : path.join(dir, m.file);
      fs.writeFileSync(p, fs.readFileSync(path.join(REPO, 'hanabi', m.file), 'utf8').replace(m.from, m.to));
      let res = await partOne(dir);
      if (!NO_BROWSER && m.breaks.some((b) => b.startsWith('B'))) {
        const ov = { __dir: dir }; for (const f of MODULES) ov['hanabi/' + f] = fs.readFileSync(path.join(dir, f));
        if (page) ov['hanabi.js'] = fs.readFileSync(p);
        res = res.concat(await partTwo(ov));
      }
      const red = res.filter((r) => !r.ok).map((r) => r.id);
      const want = NO_BROWSER ? m.breaks.filter((b) => !b.startsWith('B')) : m.breaks;
      const missed = want.filter((b) => !red.includes(b)), extra = red.filter((r) => !m.breaks.includes(r));
      const ok = !missed.length && !extra.length;
      if (!ok) failed++;
      console.log(`${ok ? 'ok  ' : 'BAD '} ${m.id}: red ${red.join(',') || 'nothing'}${missed.length ? ` — MISSED ${missed}` : ''}${extra.length ? ` — UNCLAIMED ${extra}` : ''}`);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
  console.log(`negative control: ${RUN.length - failed}/${RUN.length} behave${ONLY.length ? ` (a SUBSET of ${MUTANTS.length})` : ''}`);
  process.exit(failed ? 1 : 0);
}
