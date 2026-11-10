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
         other's by a margin of 1.25. The default suits each draw a different type (their
         DEFAULT types; per-firework styles are judged by the non-blocking report, H28).
     H17 Count: rank N is exactly N fireworks (Count, Count+scale, Column; one otherwise),
         every mark inside the centre field RESTATED from the size and the index, on every
         preset; a wrong-length arrangement is refused and said
     H18 inheritance: a suit parameter reaches every card of its row that has not set that
         key, and no other row; a cell override is per key; resets restore byte for byte; a
         rank column's arrangement reaches every suit and clears the cells' own
     H19 every firework is a pure function of its spec (no clock, no Math.random)
     H20 the scene band: off by default; behind the fireworks and under the index, inside
         the bleed box, at its height
     H21 Detail (density) on all nine types: each takes it, five settings draw five
         different bursts, every mark stays within r, and added detail never rescales the
         burst — each drawing's marks are a subset of the next one's along the type's
         ladder (peony, ring and glitter only rearrange a fixed count, so have none: H29)
     H22 a phase-2 design renders BYTE-IDENTICALLY to BASE2 (e95f121): the default deck at
         every size x index, every type x 12 seeds x rank x composition at its default
         detail, and hand parameter and arrangement edits that stay inside the field
     H23 arranging by hand: a hand arrangement keeps the size it says past the field edge
         while the default pips stay fitted; restacking keeps every firework's own drawing
         and only changes the paint order; n survives the file only as a permutation;
         the drawn arrangement written out literally draws the same card
     H24 Scale's one firework placed by hand: moved, scaled and turned as the placement
         says, saved and read back, clamped; a field motif is never placed
     H25 per-firework styles (schema 4): one firework restyled and no other, per key, another
         type from its own defaults (the suit's parameters as colours only), kept with its
         firework through a restack, saved and read back (bad entries dropped and told), ignored
         off Count, carried to the rank's Count suits, duplicates one card, reset byte for byte
     H26 a version-3 design (BASE3, 68ff42a, read from git) reads with no note and renders
         byte-identically — the refactor of the Count drawing is the risk
     H27 Centre: every burst (types, catalogue, phase 1; off-centre and turned) under Count and
         Scale lands its DRAWN extent — read here, a rotate() applied — on the field's centre
         (restated from the size and the index) within 0.12 mm; a group keeps its shape; what
         lays itself out is not offered; a willow's anchor is not its extent
     H28 the greyscale likeness report: silent on the default deck, names two suits styled alike
         (the report itself never fails: --design <file> runs it on a saved design)
     H29 the count (version 5): every type draws exactly its count — Stars, Spokes, Trails, Arms,
         Petals, counted off the SVG by each type's geometry, at its min / default / max (the
         table RESTATED here) and at every Detail, under Count and at rank 5 of Scale; the suit's
         count reaches its row, one firework's own count reaches it alone
     H30 a version-4 design (BASE4, d8286f1, read from git) with counts and Detail set by hand at
         the suit, on a card and in a firework's style, under Count and Scale, opens migrated (the
         count rewritten as what its Detail drew; an old glitter keeps its fit as `legacy`) and
         renders byte-identically; the migrated count is what the peony draws
   PART TWO — Chromium, the real page (cdnjs served from node_modules, fonts blocked)
     B1  the page loads with no page error, grayscale and guides toggles act on the stage
     B2  the Centres view renders the viewed suit under each of the five compositions
     B8  a version-2 design in localStorage opens migrated, exactly as Node reads the file
     B5  the Firework board: 25 cells (30 with the rainbow); a row edit repaints its row
         only, a card edit its card only with a marker; reset to suit; the type gallery
         sets one suit; ONE greyscale control, reaching the board and the editor's card
     B10 the layout, by real pointer: the panel collapses to a rail (the board takes the width)
         and back; the editor's handle sets its width (exactly the drag), clamped 280..960 with
         the board kept, arrow keys; the board never overflows; the card zoom (100% = print
         size); each kept across a reload
     B11 per-firework styles and Centre through the editor: one firework restyled, marked,
         its Detail, reset; Centre on a willow 1 (the slider shows it, Reset undoes it); Centre
         all rank 1s; centre row
     B12 the count control in the real editor for all nine types: its label, range, step 1 and
         integer readout; the row's slider at min and max drawn by every firework of the card;
         one firework's own count (the style section, marked) drawn by it alone
     B7  arranging by hand with REAL pointer drags on the editor's card: a move lands where
         the pointer went (in mm), a resize grows, a turn turns, only that card moves; "use
         for every N" carries it to the rank column
     B9  the Arrange panel: a click on a firework picks it and writes nothing; the size
         slider sizes the picked firework only; the order buttons restack it (and it stays
         picked); a Scale card's firework is dragged to where the pointer went; Column has
         no Arrange panel
     B3  the print PDF: page count, and on page 1 rasterised by pdftoppm the crop marks are
         ink at the positions H6 computed and the card art starts exactly at the bleed box
     B4  the PNG zip: one file per face + back, each 300 dpi of the bleed box

   --negative-control re-runs against deliberately broken copies (of the modules, or of the
   page script for what only the board shows); each must fail the check that names it.
   A mutant may name `mayAlso`: collateral it is allowed but not required to redden (the clock mutant
   seeds at random: some draws push a mark out of the box, and some move a type's silhouette, H16/H28).
   --mutant=a,b runs only those (reported as a subset); every anchor is still checked first.  --no-browser runs part one alone.  --keep <dir> copies the exported PDFs there.
   --design <file> prints the greyscale likeness report for a saved design and exits 0.
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
const DESIGN = ARGS.includes('--design') ? ARGS[ARGS.indexOf('--design') + 1] : null;   // the greyscale report on a saved design

const MODULES = ['deck.js', 'symbols.js', 'firework.js', 'layout.js', 'export.js'];

const MUTANTS = [
  { id: 'distribution-wrong', file: 'deck.js', from: "COPIES = { 1: 3, 2: 2, 3: 2, 4: 2, 5: 1 }", to: "COPIES = { 1: 3, 2: 2, 3: 2, 4: 2, 5: 2 }", breaks: ['H1'] },
  { id: 'corner-drops-symbol', file: 'layout.js', from: "+ symbol(suit.symbol, (w - sym) / 2, digitH * 1.08, sym, symFill, numHalo);", to: ";", breaks: ['H2', 'H14', 'H15', 'H22', 'H26', 'H30'] },
  { id: 'rank-does-not-escalate', file: 'firework.js', from: "4: { burstType: 'chrysanthemum', starCount: 18, rings: 3, size: 0.86", to: "4: { burstType: 'chrysanthemum', starCount: 12, rings: 1, size: 0.58", breaks: ['H3', 'H15', 'H26'] },
  { id: 'override-ignored', file: 'firework.js', from: "if (!other) return withStem(design, { ...spec, ...over });", to: "if (!other) return withStem(design, spec);", breaks: ['H4', 'H15', 'H18', 'H22', 'H26', 'H30'] },
  { id: 'crop-mark-off-trim', file: 'deck.js', from: "xs.add(+s.trimX.toFixed(6));", to: "xs.add(+(s.trimX - g.bleed).toFixed(6));", breaks: ['H6', 'B3'] },
  { id: 'duplex-not-mirrored', file: 'deck.js', from: "return r * imp.cols + c;", to: "return i;", breaks: ['H7'] },
  { id: 'shared-cut-keeps-inner-bleed', file: 'deck.js', from: "const l = c === 0 ? b : 0,", to: "const l = b,", breaks: ['H6'] },
  { id: 'no-halo', file: 'layout.js', from: "const halo = contrast(suit.primary, faceBg) < HALO_BELOW ? haloFor(suit.primary) : null;", to: "const halo = null;", breaks: ['H8'] },
  // H18 no longer reaches it: every type takes detail, so the one filtered key H18 tests (peony's trail) is
  // untaken by the deck-wide ring too. H11 and H15 are its witnesses.
  { id: 'centre-is-deck-wide', file: 'firework.js', from: "const c = suit.centre || {};", to: "const c = design.suits[0].centre || {};", breaks: ['H11', 'H15', 'H22', 'H24', 'H25', 'H26', 'H27', 'H28', 'H29', 'H30'] },
  { id: 'index-follows-the-centre', file: 'layout.js', from: "g.h * (INDEX_DIGIT[design.index] || INDEX_DIGIT.large), plate, numeral)", to: "g.h * (plate ? INDEX_DIGIT.small : INDEX_DIGIT[design.index] || INDEX_DIGIT.large), plate, numeral)", breaks: ['H10', 'H15'] },
  { id: 'tier-at-every-rank', file: 'firework.js', from: "tier !== 'none' && TIER_RANKS.includes(rank) ?", to: "tier !== 'none' && rank >= 1 ?", breaks: ['H12', 'H15'] },
  { id: 'tier-over-the-index', file: 'layout.js', from: "const x0 = area.x + corner.w + gap, x1 = area.x + area.w - corner.w - gap;", to: "const x0 = area.x + gap, x1 = area.x + area.w - gap;", breaks: ['H12', 'H15'] },
  { id: 'motif-does-not-escalate', file: 'firework.js', from: "weeping: [16, 22, 30, 38, 48],", to: "weeping: [30, 30, 30, 30, 30],", breaks: ['H3', 'H15'] },
  // a tier is drawn by the same field painters, so H12 sees the escape too
  { id: 'field-escapes-its-rect', file: 'firework.js', from: "const x = rect.x + rho + rand() * (rect.w - 2 * rho),", to: "const x = rect.x + rand() * (rect.w + 2 * rho),", breaks: ['H13', 'H12', 'H15'] },
  { id: 'rainbow-symbol-ignored', file: 'layout.js', from: "numFill = numeral.fill; symFill = numeral.symFill;", to: "numFill = numeral.fill;", breaks: ['H14', 'H15', 'H22', 'H26', 'H30'] },
  { id: 'rainbow-index-not-the-default', file: 'deck.js', from: "numeral: 'rainbow', centre: defaultCentre('glitter')", to: "numeral: 'solid', centre: defaultCentre('glitter')", breaks: ['H14', 'H22'] },
  { id: 'rainbow-numeral-ignored', file: 'layout.js', from: "numFill = numeral.fill; symFill", to: "numFill = suit.primary; symFill", breaks: ['H14', 'H15', 'H22', 'H26', 'H30'] },
  { id: 'rainbow-numeral-on-every-suit', file: 'layout.js', from: "if (suit.multicolor && suit.numeral === 'rainbow') {", to: "if (design.suits.some((x) => x.numeral === 'rainbow')) {", breaks: ['H14', 'H15', 'H22', 'H26', 'H30'] },
  { id: 'rainbow-numeral-not-saved', file: 'deck.js', from: "if (NUMERAL_FILLS[r.numeral]) s.numeral = r.numeral;", to: "if (NUMERAL_FILLS[r.numeral]) s.numeral = 'solid';", breaks: ['H9', 'H14', 'H15', 'H26', 'H22', 'H30'] },
  { id: 'v1-layout-misread', file: 'deck.js', from: "C: { index: 'band',  compose: 'bleed' },", to: "C: { index: 'band',  compose: 'scale' },", breaks: ['H9', 'H15'] },
  // ---- phase 2: the board, the types, the compositions, the migration
  { id: 'v2-single-read-as-count', file: 'deck.js', from: "V2_LAYOUTS = { single: 'scale',", to: "V2_LAYOUTS = { single: 'count',", breaks: ['H9', 'H15'] },
  { id: 'radial-not-renamed', file: 'deck.js', from: "const motifOf = (m) => (ver < 3 && LEGACY_RADIAL[m] ? LEGACY_RADIAL[m] : m);", to: "const motifOf = (m) => m;", breaks: ['H9', 'H15'] },
  // a RECOLOUR: every type draws one and the same peony, in its own colours
  { id: 'every-type-is-a-recolour', file: 'firework.js', from: "if (TYPES[m]) return `<g class=\"hb-firework\" data-motif=\"${m}\">${drawType(spec,", to: "if (TYPES[m]) return `<g class=\"hb-firework\" data-motif=\"${m}\">${drawType({ ...spec, ...TYPES.peony.defaults, motif: 'peony' },", breaks: ['H16', 'H18', 'H21', 'H22', 'H26', 'H28', 'H29', 'H30'] },
  // two types, one shape: blossom draws exactly what peony draws
  { id: 'blossom-draws-a-peony', file: 'firework.js', from: "  blossom(s, n, w, rand, o, c) {", to: "  blossom(s, n, w, rand, o, c) { return TYPE_DRAW.peony({ ...s, ...TYPES.peony.defaults }, escalatedCount('peony', TYPES.peony.defaults.count, s.rank), w, rand, o, c);", breaks: ['H16', 'H21', 'H22', 'H29'] },
  { id: 'default-pairing-collapses', file: 'deck.js', from: "symbol: 'heart', centre: defaultCentre('peony')", to: "symbol: 'heart', centre: defaultCentre('ring')", breaks: ['H16', 'H22', 'H25', 'H28'] },
  { id: 'count-draws-one-short', file: 'layout.js', from: "return pl.items.map((it) => {\n    const spec = fireworkSpecAt(", to: "return pl.items.slice(1).map((it) => {\n    const spec = fireworkSpecAt(", breaks: ['H17', 'H18', 'H22', 'H23', 'H25', 'H26', 'H27', 'H29', 'H30'] },
  { id: 'firework-escapes-the-field', file: 'layout.js', from: "r: fitted ? Math.min(it.s * unit, room) : it.s * unit,", to: "r: it.s * unit * 1.3,", breaks: ['H17', 'H22', 'H23', 'H26', 'H27', 'H30'] },
  { id: 'arrangement-length-unchecked', file: 'deck.js', from: "if (!Array.isArray(items) || items.length !== rank) return null;", to: "if (!Array.isArray(items)) return null;", breaks: ['H17'] },
  { id: 'cell-arrangement-ignored', file: 'layout.js', from: "if (o && Array.isArray(o.items) && o.items.length === rank) return { items: o.items, fitted: false };", to: ";", breaks: ['H17', 'B7', 'H22', 'H23', 'B9', 'H25', 'H26', 'H27', 'B11'] },
  { id: 'suit-parameters-ignored', file: 'firework.js', from: "for (const k of takes) if (mine[k] !== undefined && mine[k] !== '') spec[k] = mine[k];", to: ";", breaks: ['H18', 'B5', 'H22', 'H25', 'H26', 'H29', 'H30', 'B12'] },
  { id: 'suit-parameters-unfiltered', file: 'firework.js', from: "for (const k of takes) if (mine[k]", to: "for (const k of Object.keys(mine)) if (mine[k]", breaks: ['H18', 'H25'] },
  { id: 'rank-column-keeps-cell-arrangements', file: 'deck.js', from: "for (const s of design.suits) clearCell(design, s.id, rank, 'items');", to: ";", breaks: ['H18', 'B7'] },
  { id: 'renderer-reads-the-clock', file: 'firework.js', from: "  const rand = rng(spec.seed);\n  const colors = spec.colors && spec.colors.length ? spec.colors : ['#FFFFFF'];\n  if (TYPES[m])", to: "  const rand = rng(Date.now() + Math.random() * 4e9);\n  const colors = spec.colors && spec.colors.length ? spec.colors : ['#FFFFFF'];\n  if (TYPES[m])", breaks: ['H19', 'H3', 'H4', 'H11', 'H14', 'H15', 'H18', 'H21', 'H22', 'H23', 'H24', 'H25', 'H26', 'H27', 'H30'], mayAlso: ['H13', 'H16', 'H28'] },
  { id: 'scene-over-the-index', file: 'layout.js', from: "const art = bg + sceneArt(design, g) + centreArt(design, suit, card.rank, g, ix);", to: "const art = bg + centreArt(design, suit, card.rank, g, ix) + sceneArt(design, g);", breaks: ['H20'] },
  { id: 'scene-drawn-when-off', file: 'layout.js', from: "if (!sc || !sc.on) return '';", to: "if (!sc) return '';", breaks: ['H20', 'H15', 'H22', 'H26', 'H30'] },
  // the page: what only the board can show
  { id: 'card-edit-writes-the-row', file: '../hanabi.js', from: "if (view.scope === 'card') cellOf(design, suit.id, rank, true)[k] = v;", to: "if (false) cellOf(design, suit.id, rank, true)[k] = v;", breaks: ['B5'] },
  { id: 'greyscale-misses-the-editor-card', file: '../hanabi.js', from: "$('edCard').classList.toggle('is-gray', view.grayscale);", to: ";", breaks: ['B5'] },
  { id: 'drag-writes-the-rank-column', file: '../hanabi.js', from: "cellOf(design, suit.id, rank, true).items = d.items.map((x) => ({ ...x }));", to: "design.arrangements[rank] = d.items.map((x) => ({ ...x }));", breaks: ['B7'] },
  // ---- phase 2b: arranging by hand, and Detail on every type
  // Since the count (version 5) the only detail marks that reach past a burst's base marks are a migrated
  // glitter's (its `legacy` fit): the two fit mutants are seen there, by H30, and no longer by H21.
  { id: 'detail-rescales-the-burst', file: 'firework.js', from: "const each = (fn, prims = all.filter((p) => !p.det)) =>", to: "const each = (fn, prims = all.filter((p) => !p.ghost)) =>", breaks: ['H30'] },
  { id: 'glitter-fitted-on-what-it-draws', file: 'firework.js', from: "const each = (fn, prims = all.filter((p) => !p.det)) =>", to: "const each = (fn, prims = all.filter((p) => !p.det && !p.ghost)) =>", breaks: ['H30'] },
  { id: 'a-type-takes-no-detail', file: 'firework.js', from: "params: ['count', 'length', 'starSize', 'density', 'tips', 'core', 'rotation', ...COLOR_PARAMS], count: { label: 'Arms', min: 3, max: 60 },\n                   defaults: { count: 6,", to: "params: ['count', 'length', 'starSize', 'tips', 'core', 'rotation', ...COLOR_PARAMS], count: { label: 'Arms', min: 3, max: 60 },\n                   defaults: { count: 6,", breaks: ['H21'] },
  { id: 'chrysanthemum-detail-ignored', file: 'firework.js', from: "const dd = detailOf(s, 1), beads = Math.round(Math.max(0, dd - 1) * 3);", to: "const dd = 1, beads = 0;", breaks: ['H21'] },
  { id: 'pips-not-fitted', file: 'layout.js', from: "return { items: (design.pips === 'grid' ? GRID_PIPS : DEFAULT_PIPS)[rank], fitted: true };", to: "return { items: (design.pips === 'grid' ? GRID_PIPS : DEFAULT_PIPS)[rank], fitted: false };", breaks: ['H22', 'H23', 'H17', 'H26', 'H30'] },
  { id: 'hand-arrangement-fitted', file: 'layout.js', from: "r: fitted ? Math.min(it.s * unit, room) : it.s * unit,", to: "r: Math.min(it.s * unit, room),", breaks: ['H23', 'H26', 'H27'] },
  { id: 'restack-reseeds', file: 'layout.js', from: "seed: spec.seed + it.n * 7919,", to: "seed: spec.seed + pl.items.indexOf(it) * 7919,", breaks: ['H23', 'H26'] },
  { id: 'stacking-order-not-saved', file: 'deck.js', from: "if (it.n !== undefined) o.n = it.n;", to: ";", breaks: ['H23', 'H26'] },
  { id: 'repeated-n-kept', file: 'deck.js', from: "if (!perm) for (const o of out) delete o.n;", to: ";", breaks: ['H23'] },
  { id: 'place-ignored', file: 'layout.js', from: "const at = p ? { cx: p.cx, cy: p.cy, r: p.r } : sp.base;", to: "const at = sp.base;", breaks: ['H24', 'H26', 'H27'] },
  { id: 'placement-not-read', file: 'deck.js', from: "if (o.place !== undefined) {", to: "if (o.place !== undefined && false) {", breaks: ['H24'] },
  { id: 'a-pick-writes-the-card', file: '../hanabi.js', from: "  view.item = i;\n  board.drag =", to: "  view.item = i;\n  if (mode === 'items') cellOf(design, suit.id, rank, true).items = curItems(suit, rank);\n  board.drag =", breaks: ['B9'] },
  { id: 'the-size-slider-sizes-every-firework', file: '../hanabi.js', from: "items[i] = { ...items[i], [k]: v };", to: "for (let j = 0; j < items.length; j++) items[j] = { ...items[j], [k]: v };", breaks: ['B9'] },
  { id: 'to-back-goes-to-the-front', file: '../hanabi.js', from: "{ back: 0, down: i - 1, up: i + 1, front: items.length - 1 }", to: "{ back: items.length - 1, down: i - 1, up: i + 1, front: 0 }", breaks: ['B9'] },
  { id: 'scale-drag-not-written', file: '../hanabi.js', from: "else cellOf(design, suit.id, rank, true).place = { ...d.items[0] };", to: "else;", breaks: ['B9'] },
  // ---- this round: per-firework styles, optical centring, the v3 migration, the layout
  { id: 'firework-style-ignored', file: 'layout.js', from: "const spec = fireworkSpecAt(design, suit, rank, it.n), reach", to: "const spec = fireworkSpec(design, suit, rank), reach", breaks: ['H17', 'H25', 'B11', 'H29', 'H30', 'B12'] },
  { id: 'style-keyed-by-stacking-slot', file: 'layout.js', from: "const spec = fireworkSpecAt(design, suit, rank, it.n), reach", to: "const spec = fireworkSpecAt(design, suit, rank, pl.items.indexOf(it)), reach", breaks: ['H25'] },
  { id: 'style-reaches-every-firework', file: 'firework.js', from: "const st = o && o.styles && o.styles[n];", to: "const st = o && o.styles && Object.values(o.styles)[0];", breaks: ['H17', 'H25', 'B11', 'H29', 'H30', 'B12'] },
  { id: 'another-type-takes-the-suit-parameters', file: 'firework.js', from: ".filter((k) => !other || COLOR_PARAMS.includes(k));", to: ";", breaks: ['H25'] },
  { id: 'styles-leak-into-the-card-spec', file: 'firework.js', from: "const { items, place, styles, ...rest } = o;", to: "const { items, place, ...rest } = o;", breaks: ['H25'] },
  { id: 'styles-not-saved', file: 'deck.js', from: "if (st) o.styles = st; else delete o.styles;", to: "delete o.styles;", breaks: ['H25', 'H30'] },
  { id: 'style-mix-reaches-a-scale-suit', file: 'deck.js', from: "if (!COUNT_MODES.includes(s.centre.compose)) { skipped.push(s.id); continue; }", to: ";", breaks: ['H25'] },
  { id: 'count-reach-dropped-in-the-refactor', file: 'layout.js', from: "{ cx: it.cx, cy: it.cy, r: it.r / reach });", to: "{ cx: it.cx, cy: it.cy, r: it.r });", breaks: ['H26'] },
  { id: 'centre-on-the-anchors', file: 'layout.js', from: "const dx = fx - e.cx, dy = fy - e.cy;", to: "const dx = fx - pl.items.reduce((a, it) => a + it.cx, 0) / pl.items.length, dy = fy - pl.items.reduce((a, it) => a + it.cy, 0) / pl.items.length;", breaks: ['H27', 'B11'] },
  { id: 'centre-misses-the-curves', file: 'layout.js', from: "for (let k = 1; k <= CURVE_SAMPLES; k++) {", to: "for (let k = CURVE_SAMPLES; k <= CURVE_SAMPLES; k++) {", breaks: ['H27'] },
  { id: 'centre-ignores-a-rotated-burst', file: 'layout.js', from: "      if (a) { const dx = x - ox, dy = y - oy;", to: "      if (false) { const dx = x - ox, dy = y - oy;", breaks: ['H27'] },
  { id: 'centre-breaks-the-group', file: 'layout.js', from: "const raw = literalItems(pl).map((it) => ({ ...it, x: it.x + dx / field.w, y: it.y + dy / field.h }));", to: "const raw = literalItems(pl).map((it, i) => (i ? it : { ...it, x: it.x + dx / field.w, y: it.y + dy / field.h }));", breaks: ['H27'] },
  { id: 'centre-offered-under-a-tier', file: 'layout.js', from: "  if (spec.tier) return null;\n  const sp = scaleBurst(", to: "  const sp = scaleBurst(", breaks: ['H27'] },
  { id: 'a-style-writes-the-whole-card', file: '../hanabi.js', from: "  } else setFireworkStyle(design, suit.id, rank, n, k, v);", to: "  } else cellOf(design, suit.id, rank, true)[k] = v;", breaks: ['B11', 'B12'] },
  { id: 'centre-all-skips-a-suit', file: '../hanabi.js', from: "centreMany(activeSuits(design).map((s) => [s, 1]), 'Every rank 1')", to: "centreMany(activeSuits(design).slice(1).map((s) => [s, 1]), 'Every rank 1')", breaks: ['B11'] },
  { id: 'panel-rail-not-kept', file: '../hanabi.js', from: "layout.panel = layout.panel === 'rail' ? 'open' : 'rail'; persistLayout(); applyLayout();", to: "layout.panel = layout.panel === 'rail' ? 'open' : 'rail'; applyLayout();", breaks: ['B10'] },
  { id: 'editor-width-not-clamped', file: '../hanabi.js', from: "layout.editorW = Math.round(Math.min(EDITOR_W.max, Math.max(EDITOR_W.min, w)));", to: "layout.editorW = Math.round(w);", breaks: ['B10'] },
  { id: 'card-zoom-not-applied', file: '../hanabi.js', from: "card.style.width = `${Math.round(w)}px`;", to: ";", breaks: ['B10'] },
  { id: 'suit-rows-hold-stale-suits', file: '../hanabi.js', from: "const me = () => suitById(design, suit.id);", to: "const me = () => suit;", breaks: ['B6'] },
  // the count (version 5): what is drawn, and the migration that keeps a version-4 design's drawing
  { id: 'peony-detail-adds-stars', file: 'firework.js', from: "const rr = 1 - k / (rings + 0.6), nk = plan[k], ph", to: "const rr = 1 - k / (rings + 0.6), nk = Math.max(5, Math.round(n * rr)), ph", breaks: ['H22', 'H26', 'H29', 'H30'] },
  { id: 'ring-count-is-the-outer-ring', file: 'firework.js', from: "ph = rand() * Math.PI * 2, n0 = plan[0];", to: "ph = rand() * Math.PI * 2, n0 = n;", breaks: ['H22', 'H29', 'H30'] },
  { id: 'glitter-detail-is-the-count', file: 'firework.js', from: "const out = [], m = Math.max(6, n), roundShare", to: "const out = [], m = Math.max(6, Math.round(n * detailOf(s, 1))), roundShare", breaks: ['H29'] },
  { id: 'scale-escalates-nothing', file: 'firework.js', from: "const plan = ringCounts(type, escalatedCount(type, n, rank), rings);", to: "const plan = ringCounts(type, n, rings);", breaks: ['H22', 'H30'] },
  { id: 'the-count-control-is-shared', file: 'firework.js', from: "  if (k !== 'count') return PARAMS[k];", to: "  return PARAMS[k];", breaks: ['H29', 'B12', 'H31', 'B13'] },
  { id: 'the-editor-count-is-shared', file: '../hanabi.js', from: "function paramControl(k, motif) {\n  const P = paramFor(k, motif);", to: "function paramControl(k, motif) {\n  const P = PARAMS[k];", breaks: ['B12'] },
  { id: 'the-style-count-is-shared', file: '../hanabi.js', from: "function styleControl(k, motif) {\n  const P = paramFor(k, motif);", to: "function styleControl(k, motif) {\n  const P = PARAMS[k];", breaks: ['B12'] },
  { id: 'no-count-migration', file: 'deck.js', from: "  if (ver < 5) {", to: "  if (false) {", breaks: ['H22', 'H26', 'H30'] },
  { id: 'migration-drops-the-glitter-fit', file: 'deck.js', from: ": { count: legacyGlitterCount({ count, density }), density: 1, legacy: { count: +count, density: +density } };", to: ": { count: legacyGlitterCount({ count, density }), density: 1 };", breaks: ['H30'] },
  { id: 'the-legacy-fit-is-never-read', file: 'firework.js', from: "return +s.count === legacyGlitterCount(L) && +(s.density ?? 1) === 1 ? L : null;", to: "return null;", breaks: ['H30'] },
  { id: 'migration-reads-version-5-defaults', file: 'deck.js', from: "const V4_DEFAULTS = { peony: { count: 20,", to: "const V4_DEFAULTS = { peony: { count: 43,", breaks: ['H30'] },
  { id: 'a-stale-legacy-fit-is-inherited', file: 'deck.js', from: "else if (now.legacy) { node.legacy = false; w = true; }", to: ";", breaks: ['H30'] },
  { id: 'migration-skips-the-styles', file: 'deck.js', from: "        settle(st, v5Count(t, old.count, old.density), now);", to: "        ;", breaks: ['H30'] },

  // ---- the polish pass (version 6): the catalogue counts, the new defaults, the four corners, the grid, the frame, the rounded preview, the Centre skip
  { id: 'catalogue-count-ignored', file: 'firework.js', from: "  if (CATALOGUE_COUNT[m] && spec.rank) s.count = catalogueCountAt(m, spec.count, spec.rank);", to: "", breaks: ['H31'] },
  { id: 'catalogue-escalation-flat', file: 'firework.js', from: "return Math.max(CATALOGUE_COUNT[motif].min, Math.round((+v || 0) * c[r - 1] / c[4]));", to: "return Math.max(CATALOGUE_COUNT[motif].min, Math.round(+v || 0));", breaks: ['H31'] },
  { id: 'catalogue-count-not-a-parameter', file: 'firework.js', from: "  if (CATALOGUE_COUNT[motif]) return ['count', 'rotation', ...COLOR_PARAMS];", to: "", breaks: ['H31'] },
  { id: 'no-catalogue-migration', file: 'deck.js', from: "  if (ver < 6) {\n    const moved = migrateCatalogueCounts(d);", to: "  if (false) {\n    const moved = migrateCatalogueCounts(d);", breaks: ['H32'] },
  { id: 'migration-keeps-the-stale-suit-count', file: 'deck.js', from: "delete s.firework.count; moved++;", to: "moved++;", breaks: ['H32'] },
  { id: 'migration-forgets-the-type-cards', file: 'deck.js', from: "if (mc !== sm && takesCount(mc) && !hasN(o.count)) o.count = suitN;", to: ";", breaks: ['H32'] },
  { id: 'old-designs-take-four-corners', file: 'deck.js', from: "d.corners = pick(raw.corners, Object.keys(CORNER_MODES), old6 ? old6.corners : d.corners);", to: "d.corners = pick(raw.corners, Object.keys(CORNER_MODES), d.corners);", breaks: ['H32'] },
  { id: 'new-designs-keep-two-corners', file: 'deck.js', from: "    corners: 'four',", to: "    corners: 'inverted',", breaks: ['H32'] },
  { id: 'stems-on-in-new-designs', file: 'deck.js', from: "    stems: false,", to: "    stems: true,", breaks: ['H32', 'H35', 'B13'] },
  { id: 'stem-parameter-ignored', file: 'firework.js', from: "&& !(spec.stem ?? stemDefault(design))) spec.trail = false;", to: "&& !stemDefault(design)) spec.trail = false;", breaks: ['H35'] },
  { id: 'grid-ignores-the-index-boxes', file: 'layout.js', from: "  for (const b of grid.boxes) room = Math.min(room,", to: "  for (const b of []) room = Math.min(room,", breaks: ['H34'] },
  { id: 'grid-not-the-default', file: 'deck.js', from: "    pips: 'grid',", to: "    pips: 'field',", breaks: ['H32', 'H34'] },
  { id: 'grid-reserves-only-the-drawn-corners', file: 'layout.js', from: "[[a.x, a.y], [a.x + a.w - k.w, a.y], [a.x, a.y + a.h - k.h], [a.x + a.w - k.w, a.y + a.h - k.h]]", to: "[[a.x, a.y], [a.x + a.w - k.w, a.y + a.h - k.h]]", breaks: ['H34'] },
  { id: 'four-corners-not-turned', file: 'layout.js', from: "  if (mode === 'four') return tl + tr + inv(tl) + inv(tr);", to: "  if (mode === 'four') return tl + tr + `<g transform=\"translate(0 ${f(h - idx.h)})\">${tl + tr}</g>`;", breaks: ['H33'] },
  { id: 'frame-in-the-safe-zone', file: 'layout.js', from: "inset = Math.max(0.8, g.safe * 0.5), sw", to: "inset = g.safe, sw", breaks: ['H35'] },
  { id: 'frame-under-the-index', file: 'layout.js', from: "frame(g, art + ix.svg + frameArt(design, suit, g), {", to: "frame(g, art + frameArt(design, suit, g) + ix.svg, {", breaks: ['H35'] },
  { id: 'rounded-in-every-render', file: 'layout.js', from: "  if (round && !guides) {", to: "  if (!guides) {", breaks: ['H35'] },
  { id: 'centre-all-rewrites-centred-cards', file: '../hanabi.js', from: "    else if (Math.hypot(c.dx, c.dy) < CENTRE_TOL_MM) already.push(name);", to: "    else if (false) already.push(name);", breaks: ['B11', 'B13'] },
  { id: 'colour-hex-not-shown', file: '../hanabi.js', from: "for (const out of document.querySelectorAll('.hb-panel .hb-hex')) out.textContent = $(out.dataset.for).value.toUpperCase();", to: ";", breaks: ['B13'] },
  { id: 'rounded-preview-not-passed', file: '../hanabi.js', from: "{ guides: view.guides, round: view.round, idPrefix: `p${uid++}` }), `${suit.name}", to: "{ guides: view.guides, idPrefix: `p${uid++}` }), `${suit.name}", breaks: ['B13'] },
];

// The catalogue motifs: every motif that is neither a firework type nor phase 1's.
const CATALOGUE = (F) => F.MOTIF_IDS.filter((m) => m !== 'classic' && !m.startsWith('radial-') && !F.TYPE_IDS.includes(m));

// The page as it shipped before the board: H15's reference. Read from git, so the
// reference cannot be this tree's own reading of an old file.
const BASE = 'd5cd4ef';
// Phase 2 as it shipped (the Firework board, #542): H22's reference.
const BASE2 = 'e95f121';
// Phase 2b as it shipped (the Arrange panel and Detail, #548; schema version 3): H26's reference.
const BASE3 = '68ff42a';
// Per-firework styles as they shipped (#549; schema version 4, Detail still adding stars): H30's reference.
const BASE4 = 'd8286f1';
// The count as it shipped (#551; schema version 5): H31's and H32's reference.
const BASE5 = '5771675';
const baseDirs = {};
async function baseModules(commit = BASE) {
  if (baseDirs[commit]) return baseDirs[commit];
  const dir = baseDirs[commit] = fs.mkdtempSync(path.join(os.tmpdir(), 'hanabi-base-'));
  for (const f of MODULES) fs.writeFileSync(path.join(dir, f), execFileSync('git', ['-C', REPO, 'show', `${commit}:hanabi/${f}`]));
  return dir;
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

// ---- the greyscale likeness REPORT (non-blocking). Per-firework styles can make
// two suits' cards draw alike; the symbol still tells them apart (H2), so this
// warns rather than fails. A card is described as the mean of its fireworks'
// silhouettes (each drawn alone in one box, its own spec); two suits are named on
// a rank where their cards sit nearer than LIKENESS — twice the median, over the
// nine types, of how far one type's own drawings stray from their centroid
// (measured here, never typed), i.e. as alike as two draws of one type.
const LBOX = { cx: 40, cy: 40, r: 26 };
const likenessMemo = new WeakMap();
function likenessOf(F) {
  if (likenessMemo.has(F)) return likenessMemo.get(F);
  const spread = F.TYPE_IDS.map((t) => {
    const ds = [...Array(12)].map((_, k) => describe(raster(F.renderFirework(F.defaultSpec({ id: `q${k}`, primary: '#E5484D', secondary: '#9FB4C8' }, 1 + (k % 5), [], t, 'none', 'count'), LBOX), LBOX)));
    const c = ds[0].map((_, j) => ds.reduce((a, v) => a + v[j], 0) / ds.length);
    return Math.max(...ds.map((v) => sdist(v, c)));
  }).sort((a, b) => a - b);
  const v = 2 * spread[Math.floor(spread.length / 2)];
  likenessMemo.set(F, v);
  return v;
}
function cardLook(D, L, F, d, s, r) {
  const count = D.COUNT_MODES.includes(s.centre.compose);
  const items = count ? L.placementFor(d, s, r).items : [{ n: 0, rot: 0 }];
  const ds = items.map((it) => {
    const sp = count ? F.fireworkSpecAt(d, s, r, it.n) : F.fireworkSpec(d, s, r);
    return describe(raster(F.renderFirework({ ...sp, seed: sp.seed + it.n * 7919, rotation: (+sp.rotation || 0) + it.rot }, LBOX), LBOX));
  });
  return ds[0].map((_, j) => ds.reduce((a, v) => a + v[j], 0) / ds.length);
}
function greyscaleReport(D, L, F, d, likeness = likenessOf(F)) {
  const suits = D.activeSuits(d), out = [];
  for (const r of D.RANKS) {
    const looks = suits.map((s) => cardLook(D, L, F, d, s, r));
    for (let i = 0; i < suits.length; i++) for (let j = i + 1; j < suits.length; j++) {
      const x = sdist(looks[i], looks[j]);
      if (x < likeness) out.push(`${suits[i].name} and ${suits[j].name}, rank ${r}: their fireworks draw alike in greyscale (distance ${x.toFixed(3)} < ${likeness.toFixed(3)}); only the symbol tells them apart`);
    }
  }
  return out;
}

// ---------------------------------------------------------------- part one
// ---- the count (H29, H30, B12): the number DRAWN. The elements are counted off the SVG here,
// by a reading of each type's own geometry (never a tag the renderer writes), and the
// label and range are RESTATED (Eva, Nov 10), so the table is a claim and not an echo.
const COUNT_TABLE = {
  peony: ['Stars', 5, 43, 200], ring: ['Stars', 3, 22, 210], glitter: ['Stars', 6, 34, 120],
  chrysanthemum: ['Spokes', 3, 26, 60], dahlia: ['Spokes', 3, 12, 60], willow: ['Trails', 3, 18, 60],
  palm: ['Arms', 3, 6, 60], crossette: ['Arms', 3, 8, 60], blossom: ['Petals', 3, 5, 60],
};
// the catalogue counts (H31, B13): label, min, default, max RESTATED, and the catalogue's own
// escalation by rank (what an unset count draws at ranks 1..5)
const CAT_TABLE = { spoke: ['Spokes', 6, 80, 160], spokecore: ['Spokes', 6, 80, 160], rosettes: ['Count', 1, 15, 30], starfield: ['Count', 1, 26, 60] };
const CAT_ESC = { spoke: [24, 36, 50, 64, 80], spokecore: [24, 36, 50, 64, 80], rosettes: [3, 5, 8, 11, 15], starfield: [6, 10, 14, 19, 26] };
// counted off the SVG: a disc's spokes are its lines that start out from the centre past a
// fifth of its reach (the core ring's stems start near it); a rosette is eight petal lines,
// eight dots and a centre dot; a star of the field one dot and eight lines
const catElements = (m, svg, ctr) => {
  const circles = [...svg.matchAll(/<circle /g)].length;
  const lines = [...svg.matchAll(/<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"/g)];
  if (m === 'rosettes') return circles % 9 ? NaN : circles / 9;
  if (m === 'starfield') return lines.length === circles * 8 ? circles : NaN;
  const d = (x, y) => Math.hypot(x - ctr.cx, y - ctr.cy);
  const reach = Math.max(...lines.map((l) => d(+l[3], +l[4])));
  return lines.filter((l) => d(+l[1], +l[2]) > reach * 0.2 || (m === 'spoke' && d(+l[3], +l[4]) > reach * 0.5)).length;
};
// a rendered burst's centre, from its own circles' box (a Scale card's one firework)
const centreOf = (svg) => {
  const xs = [], ys = [];
  for (const m of svg.matchAll(/<(?:circle cx|line x1)="([-\d.]+)" (?:cy|y1)="([-\d.]+)"/g)) { xs.push(+m[1]); ys.push(+m[2]); }
  return { cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2 };
};
const elementsOf = (type, svg, box) => {
  const off = (x, y) => Math.abs(x - box.cx) > 1e-3 || Math.abs(y - box.cy) > 1e-3;
  const circles = [...svg.matchAll(/<circle cx="([-\d.]+)" cy="([-\d.]+)"/g)].filter((m) => off(+m[1], +m[2])).length;
  const lines = [...svg.matchAll(/<line x1="([-\d.]+)" y1="([-\d.]+)" x2="[-\d.]+" y2="[-\d.]+"[^>]*stroke-width="([\d.]+)"([^>]*)\/>/g)]
    .map((m) => ({ d: Math.hypot(+m[1] - box.cx, +m[2] - box.cy), w: +m[3], faint: /stroke-opacity/.test(m[4]) }));
  const paths = [...svg.matchAll(/<path d="([^"]+)"([^>]*)\/>/g)].map((m) => ({ d: m[1], filled: !/fill="none"/.test(m[2]), faint: /stroke-opacity/.test(m[2]) }));
  switch (type) {
    case 'peony': case 'ring': return circles;                                   // every star but the core
    case 'glitter': return lines.length % 2 ? NaN : circles + lines.length / 2;  // a spark is two crossed lines, a star a dot
    case 'chrysanthemum': return lines.filter((l) => !l.faint).length;          // the bright heads, not their faint trails
    case 'willow': return paths.filter((q) => !q.filled && !q.faint).length;     // the drooping trails, not their faint heads
    case 'palm': return paths.filter((q) => q.filled).length;                    // the fronds (leaflets are lines)
    case 'blossom': return paths.filter((q) => q.filled).length;                 // the petals (veins and stamens are lines)
    case 'crossette': return lines.filter((l) => l.d < box.r * 0.25).length;     // each arm leaves the centre; tines leave its end
    case 'dahlia': { const W = Math.max(...lines.map((l) => l.w)); return lines.filter((l) => l.w === W).length; }   // the fat petals
    default: return NaN;
  }
};
async function partOne(dir) {
  const imp = (m) => import(pathToFileURL(path.join(dir, m)).href + `?t=${Date.now()}${Math.random()}`);
  const D = await imp('deck.js'); const S = await imp('symbols.js'); const F = await imp('firework.js'); const L = await imp('layout.js');
  const res = [];
  const check = (id, name, fn) => { try { const r = fn(); res.push({ id, name, ok: r === true, detail: r === true ? '' : String(r) }); } catch (e) { res.push({ id, name, ok: false, detail: 'threw ' + e.message }); } };
  const checkAsync = async (id, name, fn) => { try { const r = await fn(); res.push({ id, name, ok: r === true, detail: r === true ? '' : String(r) }); } catch (e) { res.push({ id, name, ok: false, detail: 'threw ' + e.message }); } };
  const COMPOSES = ['count', 'countscale', 'scale', 'column', 'bleed'];   // restated
  const likeness = { get value() { return likenessOf(F); } };
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
      const corners = d.corners === 'four' ? 4 : 2;
      if ((svg.match(/stroke="url\(#xnum\)"/g) || []).length !== corners) return `${index}: the gradient numeral is not in all ${corners} corners`;
      const sgrad = (svg.match(/<linearGradient id="xsym"[\s\S]*?<\/linearGradient>/) || [])[0];
      if (!sgrad || [...sgrad.matchAll(/stop-color="([^"]+)"/g)].map((m) => m[1]).join() !== want.join()) return `${index}: the symbol has no gradient through the same colours`;
      if ((svg.match(new RegExp(`<path d="${S.SYMBOLS[rb.symbol].d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" fill="url\\(#xsym\\)"`, 'g')) || []).length !== (d.corners === 'four' ? 4 : 2)) return `${index}: the gradient symbol is not in every corner`;
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
      const d = D.defaultDesign(); d.rainbow = true; d.size = { preset, w, h }; d.index = index; d.corners = 'four'; d.pips = 'field';   // the corner grid: H34
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
    // mixed styles: still exactly N, each firework the type it was given
    for (const compose of ['count', 'countscale']) for (const rank of [2, 3, 4, 5]) {
      const m = D.defaultDesign(); D.suitById(m, 'yellow').centre.compose = compose;
      const types = ['crossette', 'willow', 'ring', 'blossom', 'dahlia'].slice(0, rank);
      types.forEach((t, n) => D.setFireworkStyle(m, 'yellow', rank, n, 'motif', t));
      const svg = L.renderFace(m, { kind: 'card', suitId: 'yellow', rank });
      if (count(svg) !== rank) return `a ${compose} ${rank} with mixed styles draws ${count(svg)} fireworks`;
      const got = [...svg.matchAll(/<g class="hb-firework" data-motif="([\w-]+)"/g)].map((x) => x[1]).sort().join();
      if (got !== [...types].sort().join()) return `a ${compose} ${rank} styled ${types.join()} draws ${got}`;
    }
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
    D.suitById(d, 'red').firework.trail = 0.2;
    if (F.fireworkSpec(d, D.suitById(d, 'red'), 1).trail !== undefined) return 'peony took a trail it has no use for';
    delete D.suitById(d, 'red').firework.trail;
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

  // ---- H21: Detail on all nine types.
  check('H21', 'Detail: every type takes it, five settings draw five bursts, in its box, never rescaled', () => {
    const els = (svg) => (svg.match(/<(circle|line|path)[^>]*\/>/g) || []);
    const sub = (a, b) => { const m = new Map(); for (const x of b) m.set(x, (m.get(x) || 0) + 1); for (const x of a) { const c = m.get(x); if (!c) return x; m.set(x, c - 1); } return null; };
    // the ladders along which detail only ADDS (restated). A crossette's tines are two
    // or three (their angles differ), so it is held along shorter ladders. Since the
    // count (version 5) a peony's and a ring's Detail spreads a FIXED number of stars
    // over more rings, and a glitter's turns round stars into sparks: nothing is added,
    // so they have no ladder, and H29 holds their count still across Detail instead.
    const ALL = [[0, 0.5, 1, 1.5, 2]];
    const LADDER = { peony: [], chrysanthemum: ALL, ring: [], willow: ALL, palm: ALL, crossette: [[0, 1], [0.5, 1.5, 2]], dahlia: ALL, glitter: [], blossom: ALL };
    for (const t of F.TYPE_IDS) {
      if (!F.motifParams(t).includes('density')) return `${t} takes no detail`;
      for (const k of [0, 3]) for (const rank of [2, 5]) for (const R of [9, 26]) {
        const box = { cx: 40, cy: 40, r: R };
        // a ring's 22 stars fill only four rings (each inner ring at least 5), so its
        // Detail 1.5 and 2 draw alike at the default; it is asked at 40, where five fit
        const cnt = t === 'ring' ? { count: 40 } : {};
        const at = (d) => F.renderFirework({ ...F.defaultSpec({ id: `q${k}`, primary: '#E5484D', secondary: '#F2C230' }, rank, [], t, 'none', 'count'), ...cnt, density: d }, box);
        const svgs = [0, 0.5, 1, 1.5, 2].map(at);
        if (new Set(svgs).size !== 5) return `${t} rank ${rank} r ${R}: only ${new Set(svgs).size} different drawings over detail 0..2`;
        for (const [i, svg] of svgs.entries()) for (const p of pointsOf(svg)) {
          const out = Math.hypot(p.x - box.cx, p.y - box.cy) + p.pad - R;
          if (out > R * 0.02) return `${t} detail ${i / 2}: a mark ${out.toFixed(2)} mm past r=${R}`;
        }
        for (const L of LADDER[t]) for (let i = 1; i < L.length; i++) { const miss = sub(els(at(L[i - 1])), els(at(L[i]))); if (miss) return `${t} rank ${rank}: detail ${L[i - 1]} -> ${L[i]} lost or moved ${miss.slice(0, 70)}`; }
      }
    }
    return true;
  });

  // ---- H22: phase-2 designs are drawn exactly as phase 2 drew them.
  await checkAsync('H22', `a phase-2 design renders byte-identically to ${BASE2}`, async () => {
    const B = await baseModules(BASE2);
    const bd = await import(pathToFileURL(path.join(B, 'deck.js')).href), bl = await import(pathToFileURL(path.join(B, 'layout.js')).href), bf = await import(pathToFileURL(path.join(B, 'firework.js')).href);
    let n = 0;
    const same = (tag, a, b) => { n++; if (a === b) return null; let i = 0; while (a[i] === b[i]) i++; return `${tag}: differs at ${i}: …${a.slice(i - 20, i + 40)}… vs …${b.slice(i - 20, i + 40)}…`; };
    for (const t of F.TYPE_IDS) for (let k = 0; k < 12; k++) for (const rank of [1, 2, 3, 4, 5]) for (const comp of ['count', 'countscale', 'scale']) {
      const su = { id: `q${k}`, primary: '#E5484D', secondary: '#9FB4C8' }, box = { cx: 40, cy: 40, r: 26 };
      const e = same(`${t} ${k} ${rank} ${comp}`, F.renderFirework(F.defaultSpec(su, rank, [], t, 'none', comp), box), bf.renderFirework(bf.defaultSpec(su, rank, [], t, 'none', comp), box));
      if (e) return e;
    }
    // edits a phase-2 designer could make that this change does not touch: parameters
    // (detail only on peony, the one type whose detail law is unchanged) and
    // arrangements that stay in the field
    const edit = (d) => {
      d.rainbow = true;
      Object.assign(d.suits.find((x) => x.id === 'red').firework, { count: 14, density: 1.6, starSize: 1.4, rotation: 25 });
      Object.assign(d.suits.find((x) => x.id === 'blue').firework, { length: 0.7, trail: 0.4, tips: false });
      d.suits.find((x) => x.id === 'green').centre.compose = 'countscale';
      d.suits.find((x) => x.id === 'yellow').centre.compose = 'scale';
      d.fireworks = { white: { 3: { count: 9, items: [{ x: 0.5, y: 0.22, s: 0.4, rot: 10 }, { x: 0.45, y: 0.5, s: 0.45, rot: 0 }, { x: 0.55, y: 0.78, s: 0.4, rot: -20 }] } }, rainbow: { 5: { starSize: 1.6 } } };
      d.arrangements = { 2: [{ x: 0.5, y: 0.3, s: 0.5, rot: 0 }, { x: 0.5, y: 0.7, s: 0.5, rot: 45 }] };
    };
    // the default deck is this tree's own defaults; an edited design reaches this tree as
    // it always does, through the file (version 5 migrates a hand-set count and Detail)
    // ('rainbow': the defaults with the rainbow suit in, so this tree's own rainbow defaults are seen too)
    for (const preset of ['poker', 'bridge', 'mini']) for (const index of ['large', 'small', 'band']) for (const edited of [false, 'rainbow', true]) {
      const db = bd.defaultDesign();
      db.size = { preset, ...bd.SIZE_PRESETS[preset] }; db.index = index; if (edited === true) edit(db); else if (edited) db.rainbow = true;
      let dn = Object.assign(D.defaultDesign(), D.V6_OLD_DEFAULTS); dn.size = { preset, ...D.SIZE_PRESETS[preset] }; dn.index = index; if (edited === 'rainbow') dn.rainbow = true;   // version 6's new defaults: H32
      if (edited === true) dn = D.normaliseDesign(JSON.parse(bd.serialiseDesign(db)), S.SYMBOL_IDS).design;
      for (const c of D.deckCards(dn)) { const e = same(`${preset}/${index}${edited ? `/${edited === true ? 'edited' : edited}` : ''} ${c.kind} ${c.suitId || ''}${c.rank || ''}`, L.renderFace(dn, c), bl.renderFace(db, c)); if (e) return e; }
    }
    return n > 2500 || `only ${n} compared`;
  });

  // ---- H23: arranging by hand.
  check('H23', 'arranging: hand sizes kept past the edge, pips fitted, restacking keeps each firework, n read as a permutation', () => {
    const d = Object.assign(D.defaultDesign(), { pips: 'field' }), red = D.suitById(d, 'red');   // the corner grid's fit: H34
    const fw = (svg) => svg.match(/<g class="hb-firework"[\s\S]*?<\/g>/g) || [];
    // the default pips stay fitted (a pip near an edge is drawn smaller) ...
    const pl0 = L.placementFor(d, red, 4);
    if (!pl0.fitted || !pl0.items.some((it, i) => it.r < L.DEFAULT_PIPS[4][i].s * pl0.unit - 1e-9)) return 'the default rank-4 pips are not fitted to the field';
    // ... a hand arrangement keeps the size it says, wherever it is
    D.cellOf(d, 'red', 2, true).items = [{ x: 0.02, y: 0.03, s: 1, rot: 0 }, { x: 0.98, y: 0.97, s: 1.2, rot: 0 }];
    const pl = L.placementFor(d, red, 2);
    if (pl.fitted || Math.abs(pl.items[0].r - pl.unit) > 1e-9 || Math.abs(pl.items[1].r - 1.2 * pl.unit) > 1e-9) return `a hand firework was resized at the edge: r ${pl.items.map((x) => (x.r / pl.unit).toFixed(3)).join(', ')} of the unit, asked 1, 1.2`;
    // the drawn arrangement written literally draws the same card
    D.clearCell(d, 'red', 2);
    for (const r of [1, 2, 3, 4, 5]) {
      const before = L.renderFace(d, { kind: 'card', suitId: 'red', rank: r });
      D.cellOf(d, 'red', r, true).items = L.literalItems(L.placementFor(d, red, r));
      if (L.renderFace(d, { kind: 'card', suitId: 'red', rank: r }) !== before) return `rank ${r}: the drawn arrangement, written out, moved the card`;
      D.clearCell(d, 'red', r);
    }
    // restacking keeps every firework's own drawing and changes only the order
    const items = L.literalItems(L.placementFor(d, red, 5));
    const before = fw(L.renderFace(d, { kind: 'card', suitId: 'red', rank: 5 }));
    D.cellOf(d, 'red', 5, true).items = D.restack(items, 0, 4);
    const after = fw(L.renderFace(d, { kind: 'card', suitId: 'red', rank: 5 }));
    if ([...before].sort().join() !== [...after].sort().join()) return 'restacking redrew a firework';
    if (after[4] !== before[0] || after[0] !== before[1]) return 'the restacked firework is not drawn last (on top)';
    // n survives the file only as a permutation
    const file = JSON.parse(D.serialiseDesign(d));
    const r1 = D.normaliseDesign(file, S.SYMBOL_IDS).design;
    if (JSON.stringify(r1.fireworks.red[5].items.map((x) => x.n)) !== JSON.stringify(D.cellOf(d, 'red', 5).items.map((x) => x.n))) return 'the stacking order did not round-trip';
    file.fireworks.red[5].items[1].n = file.fireworks.red[5].items[2].n;
    if (D.normaliseDesign(file, S.SYMBOL_IDS).design.fireworks.red[5].items.some((x) => x.n !== undefined)) return 'a repeated n was kept';
    return true;
  });

  // ---- H24: Scale's one firework placed by hand.
  check('H24', "a Scale card's firework placed by hand; a field motif never placed", () => {
    const d = D.defaultDesign(), red = D.suitById(d, 'red');
    red.centre.compose = 'scale';
    const base = L.scalePlacement(d, red, 3);
    const plain = L.renderFace(d, { kind: 'card', suitId: 'red', rank: 3 });
    const F0 = base.field;
    D.cellOf(d, 'red', 3, true).place = { x: 0.25, y: 0.7, s: 0.6, rot: 30 };
    const pl = L.scalePlacement(d, red, 3).items[0];
    if (Math.abs(pl.cx - (F0.x + 0.25 * F0.w)) > 1e-9 || Math.abs(pl.cy - (F0.y + 0.7 * F0.h)) > 1e-9 || Math.abs(pl.r - 0.6 * base.unit) > 1e-9 || pl.rot !== 30) return `placed at ${JSON.stringify(pl)}`;
    const placed = L.renderFace(d, { kind: 'card', suitId: 'red', rank: 3 });
    if (placed === plain) return 'the placement drew the card unchanged';
    const pts = pointsOf(placed.slice(placed.indexOf('<g class="hb-firework"'), placed.indexOf('<g class="hb-index">')));
    const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    if (cx > F0.x + 0.45 * F0.w) return `the placed burst's marks centre at x ${cx.toFixed(2)}, not on the left`;
    if (L.renderFace(d, { kind: 'card', suitId: 'red', rank: 2 }) !== L.renderFace(D.defaultDesign().suits && (() => { const e = D.defaultDesign(); D.suitById(e, 'red').centre.compose = 'scale'; return e; })(), { kind: 'card', suitId: 'red', rank: 2 })) return 'the placement reached another card';
    // saved, read back, clamped
    const file = JSON.parse(D.serialiseDesign(d));
    if (JSON.stringify(D.normaliseDesign(file, S.SYMBOL_IDS).design.fireworks.red[3].place) !== JSON.stringify(D.cellOf(d, 'red', 3).place)) return 'the placement did not round-trip';
    file.fireworks.red[3].place = { x: 3, y: -1, s: 9, rot: 999 };
    const back = D.normaliseDesign(file, S.SYMBOL_IDS).design.fireworks.red[3].place;
    if (back.x !== 1 || back.y !== 0 || back.s !== D.PLACE_LIMITS.s[1] || back.rot !== 180) return `out-of-range placement read as ${JSON.stringify(back)}`;
    file.fireworks.red[3].place = 'left';
    const bad = D.normaliseDesign(file, S.SYMBOL_IDS);
    if (bad.design.fireworks.red || !bad.notes.some((x) => /placement/.test(x))) return 'a placement not understood was kept or dropped silently';
    // a field motif fills its rect and is never placed
    red.centre.motif = 'starfield';
    if (L.scalePlacement(d, red, 3) !== null) return 'a field motif offered a placement';
    const withPlace = L.renderFace(d, { kind: 'card', suitId: 'red', rank: 3 });
    D.clearCell(d, 'red', 3);
    if (L.renderFace(d, { kind: 'card', suitId: 'red', rank: 3 }) !== withPlace) return 'a placement moved a field motif';
    return true;
  });

  // ---- H25: one firework of a Count card styled on its own (schema version 4).
  check('H25', 'per-firework styles: one firework restyled, kept through a restack, saved, inherited, reset, carried to the rank', () => {
    const d = D.defaultDesign(), red = D.suitById(d, 'red');
    const fw = (svg) => svg.match(/<g class="hb-firework"[\s\S]*?<\/g>/g) || [];
    const face = (s, r) => L.renderFace(d, { kind: 'card', suitId: s, rank: r });
    const plain = fw(face('red', 4)), plainFace = face('red', 4);
    // the style reaches its own firework (n 2) and no other, and no other card
    const others = D.deckCards(d).filter((c) => c.kind === 'card' && !(c.suitId === 'red' && c.rank === 4)).map((c) => L.renderFace(d, c));
    D.setFireworkStyle(d, 'red', 4, 2, 'motif', 'crossette');
    const mixed = fw(face('red', 4));
    if (mixed.length !== 4) return `a restyled 4 draws ${mixed.length} fireworks`;
    const motifs = mixed.map((g) => /data-motif="([\w-]+)"/.exec(g)[1]);
    if (motifs.join() !== 'peony,peony,crossette,peony') return `red 4 draws ${motifs.join()}, want the third (n 2) a crossette`;
    if ([0, 1, 3].some((i) => mixed[i] !== plain[i])) return 'restyling firework 3 redrew another firework of the card';
    if (D.deckCards(d).filter((c) => c.kind === 'card' && !(c.suitId === 'red' && c.rank === 4)).some((c, i) => L.renderFace(d, c) !== others[i])) return 'a firework style reached another card';
    if ('styles' in F.fireworkSpec(d, red, 4)) return 'the styles leaked into the card spec';
    // a style is per key: density alone keeps the card's type
    D.setFireworkStyle(d, 'red', 4, 0, 'density', 3 / 2);
    const sp0 = F.fireworkSpecAt(d, red, 4, 0);
    if (sp0.motif !== 'peony' || sp0.density !== 1.5) return `a detail-only style drew ${sp0.motif} at detail ${sp0.density}`;
    // another type starts from its own defaults: the suit's parameters were set for
    // its own type and reach it as colours only
    red.firework = { count: 14, outerColor: '#00FF88' };
    const sp2 = F.fireworkSpecAt(d, red, 4, 2);
    if (sp2.count !== F.TYPES.crossette.defaults.count || sp2.outerColor !== '#00FF88') return `the restyled crossette took count ${sp2.count} (want its own ${F.TYPES.crossette.defaults.count}) and outer colour ${sp2.outerColor} (want the suit's)`;
    if (F.fireworkSpecAt(d, red, 4, 1).count !== 14) return 'an unstyled firework lost the suit\'s count';
    red.firework = {};
    // a restack carries the style with its firework (keyed by n, not by slot)
    const items = L.literalItems(L.placementFor(d, red, 4));
    D.cellOf(d, 'red', 4, true).items = D.restack(items, 2, 3);
    const re = fw(face('red', 4)).map((g) => /data-motif="([\w-]+)"/.exec(g)[1]);
    if (re.join() !== 'peony,peony,peony,crossette') return `after moving firework 3 to the front: ${re.join()}`;
    delete D.cellOf(d, 'red', 4).items;
    // saved and read back; bad entries dropped and told
    const file = JSON.parse(D.serialiseDesign(d));
    const back = D.normaliseDesign(file, S.SYMBOL_IDS);
    if (back.notes.length || JSON.stringify(back.design.fireworks) !== JSON.stringify(d.fireworks)) return `styles did not round-trip: ${back.notes.join('; ')}`;
    file.fireworks.red[4].styles = { 1: { motif: 'starfield' }, 7: { motif: 'ring' }, 3: { density: 'lots', motif: 'ring' } };
    const bad = D.normaliseDesign(file, S.SYMBOL_IDS), bs = bad.design.fireworks.red[4].styles;
    if (JSON.stringify(bs) !== JSON.stringify({ 3: { motif: 'ring' } }) || bad.notes.length !== 3) return `bad styles read as ${JSON.stringify(bs)} with ${bad.notes.length} notes (${bad.notes.join('; ')})`;
    // a style on a card that is not a Count draws nothing different
    D.suitById(d, 'blue').centre.compose = 'scale';
    const sc = face('blue', 3); D.setFireworkStyle(d, 'blue', 3, 0, 'motif', 'peony');
    if (face('blue', 3) !== sc) return 'a style moved a Scale card';
    D.clearFireworkStyle(d, 'blue', 3, 0); D.suitById(d, 'blue').centre.compose = 'count';
    // the style mix to the rank: every Count suit's 4, a Scale suit left alone
    D.suitById(d, 'green').centre.compose = 'scale';
    const r = D.applyStylesToRank(d, 'red', 4);
    if (r.reached.join() !== 'white,blue,yellow' || r.skipped.join() !== 'green') return `the mix reached ${r.reached} and skipped ${r.skipped}`;
    if (/data-motif="crossette"/.exec(face('blue', 4)) === null) return 'the mix did not reach blue 4';
    D.suitById(d, 'green').centre.compose = 'count';
    for (const s of ['white', 'blue', 'yellow']) D.clearCell(d, s, 4);
    // duplicates of a card are one card
    const copies = D.deckCards(d).filter((c) => c.kind === 'card' && c.suitId === 'red' && c.rank === 4).map((c) => L.renderFace(d, c));
    if (copies.length !== 2 || copies[0] !== copies[1]) return 'the duplicates of red 4 differ';
    // reset firework to suit, one key and then the whole style, back byte for byte
    D.clearFireworkStyle(d, 'red', 4, 2, 'motif'); D.clearFireworkStyle(d, 'red', 4, 0);
    if (face('red', 4) !== plainFace) return 'resetting the styles did not restore the card';
    if (d.fireworks.red) return 'resetting the styles left an empty record';
    return true;
  });

  // ---- H26: a #548-era design (version 3, BASE3) opens and draws exactly as it did.
  await checkAsync('H26', `a version-3 design (${BASE3}) reads cleanly and renders byte-identically`, async () => {
    const B = await baseModules(BASE3);
    const bd = await import(pathToFileURL(path.join(B, 'deck.js')).href), bl = await import(pathToFileURL(path.join(B, 'layout.js')).href);
    let n = 0;
    for (const preset of ['poker', 'mini']) for (const index of ['large', 'band']) {
      const d = bd.defaultDesign(); d.rainbow = true; d.size = { preset, ...bd.SIZE_PRESETS[preset] }; d.index = index;
      Object.assign(d.suits.find((x) => x.id === 'red').firework, { count: 14, density: 1.6, rotation: 25 });
      d.suits.find((x) => x.id === 'white').centre = { compose: 'count', motif: 'classic', tier: 'none' };   // a phase-1 burst under Count (its reach)
      d.suits.find((x) => x.id === 'yellow').centre.compose = 'scale';
      d.suits.find((x) => x.id === 'green').centre = { compose: 'countscale', motif: 'radial-willow', tier: 'none' };
      d.fireworks = { blue: { 3: { starSize: 1.7, items: [{ x: 0.1, y: 0.2, s: 0.9, rot: 15, n: 2 }, { x: 0.6, y: 0.5, s: 0.5, rot: 0, n: 0 }, { x: 0.5, y: 0.95, s: 1.1, rot: -40, n: 1 }] } }, yellow: { 2: { place: { x: 0.3, y: 0.6, s: 1.3, rot: 20 } } } };
      d.arrangements = { 5: [{ x: 0.2, y: 0.2, s: 0.5, rot: 0 }, { x: 0.8, y: 0.2, s: 0.5, rot: 0 }, { x: 0.5, y: 0.5, s: 0.7, rot: 30 }, { x: 0.2, y: 0.8, s: 0.5, rot: 0 }, { x: 0.8, y: 0.8, s: 0.5, rot: 0 }] };
      const file = JSON.parse(bd.serialiseDesign(d));
      if (file.version !== 3) return `the base wrote version ${file.version}`;
      const { design, notes } = D.normaliseDesign(file, S.SYMBOL_IDS);
      // the one note a version-3 file may carry is version 5's count migration
      const other = notes.filter((x) => !/firework counts? rewritten as the stars/.test(x));
      if (other.length) return `a version-3 file read with notes: ${other.join('; ')}`;
      if (!notes.length) return 'the hand-set peony count and Detail were not migrated (no note)';
      // and it reads as the base read it, but for the count keys version 5 rewrites
      // (and version 6's new fields, which the old schema had none of: H32 holds their reading)
      const strip = (x) => JSON.stringify(x, (k, v) => (['count', 'density', 'legacy', 'version', 'stems', 'pips', 'frame'].includes(k) ? undefined : v));
      if (strip(design) !== strip(bd.normaliseDesign(file, S.SYMBOL_IDS).design)) return 'the version-3 file reads differently here';
      for (const c of D.deckCards(design)) {
        n++;
        const a = L.renderFace(design, c), b = bl.renderFace(d, c);
        if (a !== b) { let i = 0; while (a[i] === b[i]) i++; return `${preset}/${index} ${c.suitId || c.kind}${c.rank || ''}: differs at ${i}: …${a.slice(i - 20, i + 30)}…`; }
      }
    }
    return n > 200 || `only ${n} faces`;
  });

  // ---- H27: optical centring. The extent is RESTATED here (the gate's own reading
  // of every mark, a rotate() applied), and the field from the size and the index.
  const extentOf = (svg) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const grp of svg.split('<g class="hb-firework"').slice(1)) {
      const tm = /^[^>]*transform="rotate\(([-\d.]+) ([-\d.]+) ([-\d.]+)\)"/.exec(grp);
      const a = tm ? (+tm[1] * Math.PI) / 180 : 0;
      for (const p of pointsOf('<g' + grp.slice(0, grp.indexOf('</g>')))) {
        let { x, y } = p;
        if (a) { const dx = x - +tm[2], dy = y - +tm[3]; x = +tm[2] + dx * Math.cos(a) - dy * Math.sin(a); y = +tm[3] + dx * Math.sin(a) + dy * Math.cos(a); }
        x0 = Math.min(x0, x - p.pad); x1 = Math.max(x1, x + p.pad); y0 = Math.min(y0, y - p.pad); y1 = Math.max(y1, y + p.pad);
      }
    }
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  };
  const fieldOf = (d) => {
    const DIGIT = { large: 0.13, small: 0.095 }, g = D.cardGeom(d), sr = g.safeRect, h = d.size.h;
    let area, cw;
    if (d.index === 'band') { const top = g.bleed + g.safe + h * 0.13 + h * 0.006; area = { x: sr.x, y: top, w: sr.w, h: g.fullH - 2 * top }; cw = 0; }
    else { area = sr; cw = h * DIGIT[d.index] * 0.62; }
    const gap = Math.max(0.8, area.h * 0.015), side = cw ? cw + gap : gap;
    return { x: area.x + side, y: area.y + gap, w: area.w - 2 * side, h: area.h - 2 * gap };
  };
  check('H27', 'Centre: the drawn extent lands on the art field\'s centre, for every burst, a group kept together', () => {
    const TOL = 0.12;   // mm: the two readings sample curves differently (24 against 16 points)
    const write = (d, s, r, c) => { if (c.kind === 'items') D.cellOf(d, s.id, r, true).items = c.items; else D.cellOf(d, s.id, r, true).place = c.place; };
    const art = (svg) => svg.slice(0, svg.indexOf('<g class="hb-index">'));
    let willowLift = 0, n = 0;
    for (const [preset, w, h] of [['poker', 63.5, 88.9], ['mini', 44, 63]]) for (const index of ['large', 'band']) {
      const d = D.defaultDesign(); d.size = { preset, w, h }; d.index = index;
      const F0 = fieldOf(d), fx = F0.x + F0.w / 2, fy = F0.y + F0.h / 2, red = D.suitById(d, 'red');
      for (const m of F.STYLE_MOTIFS) for (const [compose, rank] of [['count', 1], ['scale', 3]]) {
        red.centre = { compose, motif: m, tier: 'none' }; D.clearCell(d, 'red', rank);
        if (compose === 'count') D.cellOf(d, 'red', rank, true).items = [{ x: 0.42, y: 0.58, s: 0.8, rot: 35 }];   // off-centre and turned
        const c = L.centring(d, red, rank);
        if (!c) return `${preset}/${index} ${m} ${compose}: no centring offered`;
        if (c.clamped) return `${preset}/${index} ${m} ${compose}: clamped`;
        if (m === 'willow' && compose === 'count') willowLift = Math.max(willowLift, -c.dy);
        write(d, red, rank, c);
        const e = extentOf(art(L.renderFace(d, { kind: 'card', suitId: 'red', rank })));
        n++;
        if (Math.hypot(e.cx - fx, e.cy - fy) > TOL) return `${preset}/${index} ${m} ${compose}: the drawn extent centres at ${e.cx.toFixed(2)},${e.cy.toFixed(2)}, the field at ${fx.toFixed(2)},${fy.toFixed(2)}`;
      }
      // a group: the extent of all four centred, and each firework keeps its place to the others
      red.centre = { compose: 'count', motif: 'willow', tier: 'none' }; D.clearCell(d, 'red', 4);
      const before = L.placementFor(d, red, 4).items;
      write(d, red, 4, L.centring(d, red, 4));
      const after = L.placementFor(d, red, 4).items, e = extentOf(art(L.renderFace(d, { kind: 'card', suitId: 'red', rank: 4 })));
      if (Math.hypot(e.cx - fx, e.cy - fy) > TOL) return `${preset}/${index} a willow 4: the group's extent centres ${Math.hypot(e.cx - fx, e.cy - fy).toFixed(2)} mm off`;
      for (let i = 1; i < 4; i++) if (Math.abs((after[i].cx - after[0].cx) - (before[i].cx - before[0].cx)) > 1e-6 || Math.abs((after[i].cy - after[0].cy) - (before[i].cy - before[0].cy)) > 1e-6 || Math.abs(after[i].r - before[i].r) > 1e-9) return `${preset}/${index}: centring moved firework ${i} relative to the others`;
      // what lays itself out is not centred
      for (const [compose, motif, tier] of [['column', 'peony', 'none'], ['bleed', 'peony', 'none'], ['scale', 'starfield', 'none'], ['scale', 'dome', 'rosettes']]) {
        red.centre = { compose, motif, tier }; if (L.centring(d, red, 5)) return `${compose}/${motif}/${tier}: offered a centring`;
      }
    }
    // the anchor is not the extent: a willow's trails hang below its centre
    if (!(willowLift > 1)) return `a willow was lifted only ${willowLift.toFixed(2)} mm (its trails hang; centring its anchor would leave it low)`;
    return n >= 4 * F.STYLE_MOTIFS.length * 2 || `only ${n} cards`;
  });

  // ---- H28: the greyscale likeness report finds two suits made alike by their styles.
  check('H28', 'the greyscale likeness report: silent on the default deck, names two suits styled alike', () => {
    const d = D.defaultDesign(); d.rainbow = true;
    const clean = greyscaleReport(D, L, F, d, likeness.value);
    if (clean.length) return `the default deck warns: ${clean.join('; ')}`;
    for (let n = 0; n < 3; n++) D.setFireworkStyle(d, 'blue', 3, n, 'motif', 'peony');
    const w = greyscaleReport(D, L, F, d, likeness.value);
    if (w.length !== 1 || !/Red and Blue, rank 3/.test(w[0])) return `styling blue 3 as red's peony reported ${JSON.stringify(w)}`;
    return true;
  });

  // ---- H29: the count is the number DRAWN (COUNT_TABLE and elementsOf above partOne).
  check('H29', 'the count: every type draws exactly its count — at its min, default and max, at every Detail, at both levels', () => {
    let n = 0;
    for (const t of F.TYPE_IDS) {
      const [label, lo, dflt, hi] = COUNT_TABLE[t] || [];
      if (!label) return `${t} is not in the restated table`;
      const P = F.paramFor('count', t);
      if (P.label !== label || P.min !== lo || P.max !== hi || F.TYPES[t].defaults.count !== dflt) return `${t}: the count control is ${P.label} ${P.min}..${P.max} (default ${F.TYPES[t].defaults.count}); the table says ${label} ${lo}..${hi} (${dflt})`;
      if (P.step !== 1) return `${t}: the count steps by ${P.step}`;
      const dd = F.TYPES[t].defaults.density;
      for (const v of [lo, dflt, hi, Math.round((lo + hi) / 2)]) for (const den of [0, dd, 0.5, 1.5, 2]) for (const [comp, rank] of [['count', 1], ['count', 4], ['scale', 5], ['countscale', 5]]) for (const k of [0, 5]) {
        const box = { cx: 40, cy: 40, r: 26 };
        const spec = { ...F.defaultSpec({ id: `c${k}`, primary: '#E5484D', secondary: '#F2C230' }, rank, [], t, 'none', comp), count: v, density: den };
        const got = elementsOf(t, F.renderFirework(spec, box), box); n++;
        if (got !== v) return `${t} count ${v}, detail ${den}, ${comp} rank ${rank}: drew ${got} ${label.toLowerCase()}`;
      }
    }
    // both levels, through the design: the suit's count reaches every firework of its row
    // that has not set its own, and one firework's own count reaches it alone
    for (const t of F.TYPE_IDS) {
      const d = D.defaultDesign(), red = d.suits.find((x) => x.id === 'red');
      red.centre.motif = t;
      const [, lo, , hi] = COUNT_TABLE[t], row = Math.round(lo + (hi - lo) * 0.3), own = Math.round(lo + (hi - lo) * 0.8);
      red.firework.count = row;
      D.setFireworkStyle(d, 'red', 3, 1, 'count', own);
      for (const rank of D.RANKS) {
        const svg = L.renderFace(d, { kind: 'card', suitId: 'red', rank });
        const groups = svg.split('<g class="hb-firework"').slice(1).map((g) => g.slice(0, g.indexOf('</g>')));
        if (groups.length !== rank) return `${t}: red ${rank} drew ${groups.length} fireworks`;
        const pl = L.placementFor(d, red, rank);
        for (const [i, it] of pl.items.entries()) {
          const want = rank === 3 && (Number.isInteger(it.n) ? it.n : i) === 1 ? own : row;
          const got = elementsOf(t, groups[i], { cx: it.cx, cy: it.cy, r: it.r }); n++;
          if (got !== want) return `${t}: red ${rank} firework ${i + 1} drew ${got} where ${rank === 3 && want === own ? 'its own style' : 'the row'} says ${want}`;
        }
      }
    }
    return n > 1500 || `only ${n} counted`;
  });

  // ---- H30: a #549-era design (version 4, BASE4, read from git) whose counts and Detail
  // were set by hand opens migrated (the count now the number its Detail drew) and draws
  // byte-identically — at the suit, on a card, in one firework's style, under Count and Scale.
  await checkAsync('H30', `a version-4 design (${BASE4}) with hand-set counts and Detail migrates and renders byte-identically`, async () => {
    const B = await baseModules(BASE4);
    const bd = await import(pathToFileURL(path.join(B, 'deck.js')).href), bl = await import(pathToFileURL(path.join(B, 'layout.js')).href);
    let n = 0, migrated = 0;
    const cases = [
      // [label, edit of the base design]
      ['peony detail at the suit', (d) => { Object.assign(d.suits.find((x) => x.id === 'red').firework, { count: 14, density: 1.6 }); }],
      ['peony count 3 under Scale', (d) => { const r = d.suits.find((x) => x.id === 'red'); r.centre.compose = 'scale'; Object.assign(r.firework, { count: 3, density: 2 }); }],
      ['ring detail at the suit, Scale', (d) => { const w = d.suits.find((x) => x.id === 'white'); w.centre.compose = 'scale'; Object.assign(w.firework, { count: 30, density: 1.5 }); }],
      ['ring detail on a card only', (d) => { d.fireworks = { white: { 4: { density: 2 }, 2: { count: 60 } } }; }],
      ['glitter detail below 1', (d) => { Object.assign(d.suits.find((x) => x.id === 'rainbow').firework, { density: 0.4 }); }],
      ['glitter detail above 1 under Scale', (d) => { const g = d.suits.find((x) => x.id === 'rainbow'); g.centre.compose = 'scale'; Object.assign(g.firework, { count: 41, density: 1.7 }); }],
      ['glitter: a card back at Detail 1 under a suit at 0.5', (d) => { Object.assign(d.suits.find((x) => x.id === 'rainbow').firework, { density: 0.5 }); d.fireworks = { rainbow: { 3: { count: 17, density: 1 }, 5: { density: 1.2 } } }; }],
      ['a card made a peony / ring', (d) => { Object.assign(d.suits.find((x) => x.id === 'blue').firework, { count: 25, density: 0.8 }); d.fireworks = { blue: { 2: { motif: 'peony' }, 4: { motif: 'ring', density: 1 } } }; }],
      ['styles: another type and the card\'s own', (d) => {
        Object.assign(d.suits.find((x) => x.id === 'red').firework, { density: 0 });
        d.fireworks = { red: { 4: { density: 2, styles: { 0: { motif: 'glitter', density: 1.9 }, 1: { count: 9 }, 3: { motif: 'ring', count: 40, density: 1 } } } },
                        yellow: { 3: { styles: { 2: { motif: 'peony', count: 12, density: 2 } } } } };
      }],
      ['nothing set by hand', () => {}],
    ];
    for (const [label, edit] of cases) for (const preset of ['poker', 'mini']) {
      const db = bd.defaultDesign(); db.rainbow = true; db.size = { preset, ...bd.SIZE_PRESETS[preset] }; edit(db);
      const file = JSON.parse(bd.serialiseDesign(db));
      if (file.version !== 4) return `the base wrote version ${file.version}`;
      const { design, notes } = D.normaliseDesign(file, S.SYMBOL_IDS);
      if (notes.some((x) => !/firework counts? rewritten as the stars/.test(x))) return `${label}: read with notes ${notes.join('; ')}`;
      if (notes.length) migrated++;
      if (label === 'nothing set by hand' && notes.length) return 'a version-4 file with nothing set by hand was rewritten';
      for (const c of D.deckCards(design)) {
        n++;
        const a = L.renderFace(design, c), b = bl.renderFace(db, c);
        if (a !== b) { let i = 0; while (a[i] === b[i]) i++; return `${label} ${preset} ${c.suitId || c.kind}${c.rank || ''}: differs at ${i}: …${a.slice(i - 30, i + 30)}… vs …${b.slice(i - 30, i + 30)}…`; }
      }
      // version 5 written and read back is the same design, with nothing to migrate again
      const again = D.normaliseDesign(JSON.parse(D.serialiseDesign(design)), S.SYMBOL_IDS);
      if (again.notes.length) return `${label}: the version-5 file read with notes ${again.notes.join('; ')}`;
      if (JSON.stringify(again.design) !== JSON.stringify(design)) return `${label}: the version-5 file does not round-trip`;
    }
    // the migrated count IS what is drawn: red's peony at count 14 / Detail 1.6 drew four rings (round(1 + 2 x 1.6)),
    // each 14 x (1 - k / 4.6), at least 5
    const db = bd.defaultDesign(); Object.assign(db.suits.find((x) => x.id === 'red').firework, { count: 14, density: 1.6 });
    const m = D.normaliseDesign(JSON.parse(bd.serialiseDesign(db)), S.SYMBOL_IDS).design;
    const red = m.suits.find((x) => x.id === 'red'), want = 14 + Math.round(14 * (1 - 1 / 4.6)) + Math.round(14 * (1 - 2 / 4.6)) + Math.max(5, Math.round(14 * (1 - 3 / 4.6)));
    if (red.firework.count !== want) return `red's migrated count is ${red.firework.count}; its Detail drew ${want} stars`;
    const svg = L.renderFace(m, { kind: 'card', suitId: 'red', rank: 1 }), pl = L.placementFor(m, red, 1), it = pl.items[0];
    const got = elementsOf('peony', svg.split('<g class="hb-firework"')[1], { cx: it.cx, cy: it.cy, r: it.r });
    if (got !== want) return `the migrated peony draws ${got} stars, its count says ${want}`;
    return (n > 600 && migrated >= 16) || `only ${n} faces, ${migrated} migrated files`;
  });

  // ---- H31: the catalogue counts (version 6). The spoke discs' spokes and the fields'
  // rosettes and stars, counted off the SVG by each motif's own geometry; the table and the
  // catalogue's escalation are RESTATED here. Unset, every motif draws exactly what it drew
  // at BASE5 (byte for byte, every composition and rank).
  await checkAsync('H31', 'the catalogue counts: spoke disc, spoke disc with a core, rosette field, starfield — exact at min, default and max, escalated under Scale, unset byte-identical', async () => {
    const B = await baseModules(BASE5), bf = await import(pathToFileURL(path.join(B, 'firework.js')).href);
    let n = 0;
    for (const [m, [label, lo, dflt, hi]] of Object.entries(CAT_TABLE)) {
      const P = F.paramFor('count', m);
      if (P.label !== label || P.min !== lo || P.max !== hi || P.step !== 1) return `${m}: the count control is ${P.label} ${P.min}..${P.max} step ${P.step}; the table says ${label} ${lo}..${hi}`;
      if (!F.motifParams(m).includes('count')) return `${m} takes no count`;
      if (F.catalogueCountDefault(m) !== dflt) return `${m}: default ${F.catalogueCountDefault(m)}, the table ${dflt}`;
      const su = { id: 'q1', primary: '#E5484D', secondary: '#9FB4C8' };
      // unset: byte-identical to BASE5 at every composition and rank
      for (const comp of COMPOSES) for (const rank of [1, 2, 3, 4, 5]) {
        const box = { cx: 40, cy: 40, r: 26, rect: { x: 20, y: 12, w: 40, h: 56 } };
        const a = F.renderFirework(F.defaultSpec(su, rank, [], m, 'none', comp), box), b = bf.renderFirework(bf.defaultSpec(su, rank, [], m, 'none', comp), box);
        n++;
        if (a !== b) return `${m} ${comp} ${rank}: unset, it no longer draws what ${BASE5} drew`;
        const want = CAT_ESC[m][(comp === 'count' ? 5 : rank) - 1];
        if (catElements(m, a, box) !== want) return `${m} ${comp} ${rank}: unset, draws ${catElements(m, a, box)}, the catalogue ${want}`;
      }
      // set: exactly the count at rank 5 (Count, and Scale's 5); under Scale fewer, by the catalogue's ratio
      for (const v of [lo, dflt, hi, Math.round((lo + hi) / 2)]) for (const [comp, rank] of [['count', 1], ['count', 3], ['scale', 5], ['scale', 1], ['scale', 3], ['countscale', 2], ['column', 4], ['bleed', 2]]) {
        const box = { cx: 40, cy: 40, r: 26, rect: { x: 20, y: 12, w: 40, h: 56 } };
        const spec = { ...F.defaultSpec(su, rank, [], m, 'none', comp), count: v };
        const er = comp === 'count' ? 5 : rank, want = Math.max(lo, Math.round(v * CAT_ESC[m][er - 1] / CAT_ESC[m][4]));
        const got = catElements(m, F.renderFirework(spec, box), box); n++;
        if (got !== want) return `${m} count ${v}, ${comp} rank ${rank}: drew ${got}, want ${want}`;
      }
      // the levels, through a design on every size: the suit's count reaches every card of its
      // row; a card's own reaches it alone; a firework's own style (the bursts) reaches it alone
      for (const preset of ['poker', 'mini']) for (const compose of ['count', 'scale']) {
        const d = D.defaultDesign(); d.size = { preset, ...D.SIZE_PRESETS[preset] };
        const red = D.suitById(d, 'red'); red.centre = { compose, motif: m, tier: 'none' };
        const row = Math.round(lo + (hi - lo) * 0.3), own = Math.round(lo + (hi - lo) * 0.9), sty = Math.round(lo + (hi - lo) * 0.6);
        red.firework.count = row;
        D.cellOf(d, 'red', 4, true).count = own;
        const field = F.FIELD_MOTIFS.includes(m);
        if (!field && compose === 'count') D.setFireworkStyle(d, 'red', 3, 2, 'count', sty);
        for (const rank of D.RANKS) {
          const svg = L.renderFace(d, { kind: 'card', suitId: 'red', rank });
          const groups = svg.split('<g class="hb-firework"').slice(1).map((g) => g.slice(0, g.indexOf('</g>')));
          const er = compose === 'count' ? 5 : rank;
          const items = compose === 'count' ? L.placementFor(d, red, rank).items : [null];
          if (groups.length !== items.length) return `${m} ${preset} ${compose} red ${rank}: ${groups.length} fireworks`;
          for (const [i, it] of items.entries()) {
            const base = rank === 4 ? own : rank === 3 && it && it.n === 2 && !field && compose === 'count' ? sty : row;
            const want = Math.max(lo, Math.round(base * CAT_ESC[m][er - 1] / CAT_ESC[m][4]));
            const ctr = it ? { cx: it.cx, cy: it.cy } : centreOf(groups[i]);
            const got = catElements(m, groups[i], ctr); n++;
            if (got !== want) return `${m} ${preset} ${compose} red ${rank} firework ${i + 1}: drew ${got}, its count says ${want}`;
          }
        }
      }
    }
    return n > 350 || `only ${n} counted`;
  });

  // ---- H32: version 6's new defaults, and every design saved before keeps what it had.
  // A version-5 file (BASE5, read from git) with catalogue counts set at every level opens
  // migrated and draws byte-identically; one with nothing set reads with no note at all.
  await checkAsync('H32', `version 6: new designs open with four corners, no rising trail, the corner grid, no frame; a version-5 design (${BASE5}) keeps its own and renders byte-identically`, async () => {
    const d0 = D.defaultDesign();
    if (d0.version !== 6 || d0.corners !== 'four' || d0.stems !== false || d0.pips !== 'grid' || d0.face.frame !== 'none') return `the defaults are version ${d0.version}, ${d0.corners}, stems ${d0.stems}, ${d0.pips}, frame ${d0.face.frame}`;
    const B = await baseModules(BASE5);
    const bd = await import(pathToFileURL(path.join(B, 'deck.js')).href), bl = await import(pathToFileURL(path.join(B, 'layout.js')).href);
    // a file that does not say: before version 6, the old meaning; from version 6, the new
    for (const [ver, want] of [[5, ['inverted', true, 'field']], [6, ['four', false, 'grid']]]) {
      const raw = JSON.parse(D.serialiseDesign(D.defaultDesign())); raw.version = ver;
      delete raw.corners; delete raw.stems; delete raw.pips; delete raw.face.frame;
      const r = D.normaliseDesign(raw, S.SYMBOL_IDS).design;
      if (r.corners !== want[0] || r.stems !== want[1] || r.pips !== want[2] || r.face.frame !== 'none') return `a version-${ver} file that does not say reads ${r.corners}, stems ${r.stems}, ${r.pips}, frame ${r.face.frame}`;
    }
    let n = 0, migrated = 0;
    const cases = [
      ['nothing set by hand', () => {}],
      ['a spoke disc with a core under a stale peony count', (d) => { const r = d.suits.find((x) => x.id === 'red'); r.centre.motif = 'spokecore'; Object.assign(r.firework, { count: 43, density: 1.4 }); }],
      ['the same, with a card made a peony that took the count', (d) => { const r = d.suits.find((x) => x.id === 'red'); r.centre.motif = 'spokecore'; Object.assign(r.firework, { count: 61 }); d.fireworks = { red: { 3: { motif: 'peony' }, 5: { motif: 'chrysanthemum', count: 20 } } }; }],
      ['a spoke disc under Scale with card counts', (d) => { const b = d.suits.find((x) => x.id === 'blue'); b.centre = { compose: 'scale', motif: 'spoke', tier: 'none' }; d.fireworks = { blue: { 1: { count: 30 }, 2: { count: 17, rotation: 20 }, 5: { count: 100 } } }; }],
      ['a peony row with a count, cards made fields and a disc', (d) => { const r = d.suits.find((x) => x.id === 'red'); r.centre.compose = 'scale'; Object.assign(r.firework, { count: 30 }); d.fireworks = { red: { 2: { motif: 'rosettes' }, 3: { motif: 'starfield', count: 9 }, 4: { motif: 'spoke' } } }; }],
      ['a field row under Scale with a card count', (d) => { const g = d.suits.find((x) => x.id === 'green'); g.centre = { compose: 'scale', motif: 'starfield', tier: 'none' }; d.fireworks = { green: { 4: { count: 7 } } }; }],
      ['spoke styles that drew nothing', (d) => { const y = d.suits.find((x) => x.id === 'yellow'); y.centre.motif = 'spokecore'; d.fireworks = { yellow: { 3: { styles: { 0: { motif: 'spoke', count: 12 }, 2: { count: 5 } } } } }; }],
      ['classic under Scale (the rising trail)', (d) => { d.suits.find((x) => x.id === 'white').centre = { compose: 'scale', motif: 'classic', tier: 'none' }; d.suits.find((x) => x.id === 'green').centre = { compose: 'bleed', motif: 'radial-willow', tier: 'none' }; }],
    ];
    for (const [label, edit] of cases) for (const preset of ['poker', 'mini']) for (const corners of ['inverted', 'four']) {
      const db = bd.defaultDesign(); db.rainbow = true; db.corners = corners; db.size = { preset, ...bd.SIZE_PRESETS[preset] }; edit(db);
      const file = JSON.parse(bd.serialiseDesign(db));
      if (file.version !== 5) return `the base wrote version ${file.version}`;
      const { design, notes } = D.normaliseDesign(file, S.SYMBOL_IDS);
      if (notes.some((x) => !/catalogue firework counts? rewritten/.test(x))) return `${label}: read with notes ${notes.join('; ')}`;
      if (notes.length) migrated++;
      if (label === 'nothing set by hand' && notes.length) return 'a version-5 file with nothing set by hand was rewritten';
      if (label !== 'nothing set by hand' && label !== 'classic under Scale (the rising trail)' && !notes.length) return `${label}: no migration note`;
      if (design.corners !== corners || design.stems !== true || design.pips !== 'field') return `${label}: read as ${design.corners}, stems ${design.stems}, ${design.pips}`;
      for (const c of D.deckCards(design)) {
        n++;
        const a = L.renderFace(design, c), b = bl.renderFace(db, c);
        if (a !== b) { let i = 0; while (a[i] === b[i]) i++; return `${label} ${preset} ${corners} ${c.suitId || c.kind}${c.rank || ''}: differs at ${i}: …${a.slice(i - 30, i + 30)}… vs …${b.slice(i - 30, i + 30)}…`; }
      }
      const again = D.normaliseDesign(JSON.parse(D.serialiseDesign(design)), S.SYMBOL_IDS);
      if (again.notes.length) return `${label}: the version-6 file read with notes ${again.notes.join('; ')}`;
      if (JSON.stringify(again.design) !== JSON.stringify(design)) return `${label}: the version-6 file does not round-trip`;
    }
    return (n > 1000 && migrated >= 20) || `only ${n} faces, ${migrated} migrated files`;
  });

  // ---- H33: the corner index in four corners. The bottom pair is a TRUE 180-degree turn
  // about the card's centre (restated from the size and the bleed) of the top pair, the four
  // boxes stay inside the safe zone and apart, and a numeral is tall enough at mini size.
  check('H33', 'four corners: the bottom pair is the top pair turned 180 degrees about the card centre; inside the safe zone, apart, legible at mini', () => {
    const DIGIT = { large: 0.13, small: 0.095 };   // restated, of the card height
    let n = 0;
    for (const [preset, w, h] of [['poker', 63.5, 88.9], ['bridge', 57.2, 88.9], ['mini', 44, 63]]) for (const index of ['large', 'small']) for (const corners of ['four', 'inverted']) {
      const d = D.defaultDesign(); d.rainbow = true; d.size = { preset, w, h }; d.index = index; d.corners = corners;
      const b = d.bleed, sf = d.safe, cx = (w + 2 * b) / 2, cy = (h + 2 * b) / 2;
      for (const s of D.activeSuits(d)) for (const rank of [1, 5]) {
        const svg = L.renderFace(d, { kind: 'card', suitId: s.id, rank }, { idPrefix: 'x' }); n++;
        const ix = svg.slice(svg.indexOf('<g class="hb-index">'));
        const tops = [...ix.matchAll(/<g transform="translate\(([-\d.]+) ([-\d.]+)\)">/g)].filter((m) => !ix.slice(Math.max(0, m.index - 40), m.index).includes('rotate(180'));
        const rots = [...ix.matchAll(/<g transform="rotate\(([-\d.]+) ([-\d.]+) ([-\d.]+)\)"><g transform="translate\(([-\d.]+) ([-\d.]+)\)">/g)];
        const wantTop = corners === 'four' ? 2 : 1;
        if (rots.length !== wantTop) return `${preset}/${index}/${corners} ${s.id} ${rank}: ${rots.length} turned indices, want ${wantTop}`;
        for (const r of rots) {
          if (+r[1] !== 180 || Math.abs(+r[2] - cx) > 1e-3 || Math.abs(+r[3] - cy) > 1e-3) return `${preset}/${index}/${corners}: the bottom index is turned ${r[1]} about ${r[2]},${r[3]}, not 180 about the centre ${cx},${cy}`;
          if (!tops.some((t) => t[1] === r[4] && t[2] === r[5])) return `${preset}/${index}/${corners}: a turned index is not the turn of an upright one`;
        }
        // the digit's height, and the index boxes inside the safe zone and apart
        const sc = +(/<g transform="translate\([-\d.]+ [-\d.]+\) scale\(([\d.]+)\)">/.exec(ix) || [])[1];
        const dh = sc * S.DIGIT_BOX.h, want = h * DIGIT[index];
        if (Math.abs(dh - want) > S.DIGIT_BOX.h * 0.0006) return `${preset}/${index}: the numeral is ${dh.toFixed(2)} mm tall, want ${want.toFixed(2)}`;
        if (preset === 'mini' && dh < 5.5) return `mini/${index}: a ${dh.toFixed(2)} mm numeral`;
        const bw = 0.62 * want, bh = 1.7 * want;   // restated: the symbol (0.62 of the numeral) is the box's width; numeral + gap + symbol its height
        const boxes = [];
        for (const t of tops) { const x = +t[1], y = +t[2]; boxes.push([x, y], [2 * cx - x - bw, 2 * cy - y - bh]); }
        for (const [x, y] of boxes) if (x < b + sf - 1e-3 || y < b + sf - 1e-3 || x + bw > b + w - sf + 1e-3 || y + bh > b + h - sf + 1e-3) return `${preset}/${index}/${corners}: an index box at ${x.toFixed(2)},${y.toFixed(2)} leaves the safe zone`;
        for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
          const [ax, ay] = boxes[i], [bx, by] = boxes[j];
          if (ax < bx + bw && bx < ax + bw && ay < by + bh && by < ay + bh) return `${preset}/${index}/${corners}: two index boxes overlap`;
        }
      }
    }
    return n > 100 || `only ${n} faces`;
  });

  // ---- H34: the corner grid (design.pips 'grid'). One grid for every face: the safe zone
  // less a gap, with all four corner-index boxes reserved (RESTATED) whatever the corner mode.
  // Every mark of a default Count card is on it; the art does not move with the corners; and
  // rank 1 uses the room between the indices (the balance it is for).
  check('H34', 'the corner grid: every default pip inside the safe zone and clear of the four index boxes, the same art under every corner mode, rank 1 using the room between the indices', () => {
    const DIGIT = { large: 0.13, small: 0.095 };
    const report = [];
    for (const [preset, w, h] of [['poker', 63.5, 88.9], ['bridge', 57.2, 88.9], ['mini', 44, 63]]) for (const index of ['large', 'small', 'band']) {
      const d = D.defaultDesign(); d.rainbow = true; d.size = { preset, w, h }; d.index = index;
      const g = D.cardGeom(d), sr = g.safeRect;
      let area = sr, bw = 0, bh = 0;
      if (index === 'band') { const top = g.bleed + g.safe + h * 0.13 + h * 0.006; area = { x: sr.x, y: top, w: sr.w, h: g.fullH - 2 * top }; }
      else { bw = 0.62 * h * DIGIT[index]; bh = 1.7 * h * DIGIT[index]; }
      const gap = Math.max(0.8, area.h * 0.015);
      const boxes = bw ? [[area.x, area.y], [area.x + area.w - bw, area.y], [area.x, area.y + area.h - bh], [area.x + area.w - bw, area.y + area.h - bh]] : [];
      for (const compose of ['count', 'countscale']) for (const s of D.activeSuits(d)) {
        s.centre = { ...s.centre, compose };
        for (const r of [1, 2, 3, 4, 5]) {
          const arts = ['four', 'inverted', 'upright'].map((c) => { d.corners = c; return L.renderFace(d, { kind: 'card', suitId: s.id, rank: r }, { centreOnly: true, idPrefix: 'x' }); });
          if (arts[1] !== arts[0] || arts[2] !== arts[0]) return `${preset}/${index}/${compose} ${s.id} ${r}: the art moves with the corner mode`;
          for (const p of pointsOf(arts[0].slice(arts[0].indexOf('<g class="hb-firework"')))) {
            if (p.x - p.pad < area.x + gap - 0.05 || p.x + p.pad > area.x + area.w - gap + 0.05 || p.y - p.pad < area.y + gap - 0.05 || p.y + p.pad > area.y + area.h - gap + 0.05)
              return `${preset}/${index}/${compose} ${s.id} ${r}: a mark at ${p.x.toFixed(2)},${p.y.toFixed(2)} off the grid's safe zone`;
            for (const [x, y] of boxes) {
              const dx = Math.max(x - p.x, 0, p.x - x - bw), dy = Math.max(y - p.y, 0, p.y - y - bh);
              if (Math.hypot(dx, dy) < p.pad + gap - 0.05) return `${preset}/${index}/${compose} ${s.id} ${r}: a mark at ${p.x.toFixed(2)},${p.y.toFixed(2)} within the gap of an index box`;
            }
          }
        }
      }
      if (index === 'large') {
        const one = D.defaultDesign(); one.size = { preset, w, h };
        const red = D.suitById(one, 'red'), rg = L.placementFor(one, red, 1).items[0].r;
        one.pips = 'field'; const rf = L.placementFor(one, red, 1).items[0].r;
        report.push(`${preset} ${rf.toFixed(1)} -> ${rg.toFixed(1)} mm`);
        if (preset !== 'mini' && rg < rf * 1.3) return `${preset}: rank 1 on the grid is ${rg.toFixed(2)} mm against the field's ${rf.toFixed(2)} — not the room between the indices`;
      }
    }
    return true;
  });

  // ---- H35: the card's frame (it prints), the rounded preview (it never does), and phase
  // 1's rising trail (a design's own default, and a parameter of the burst).
  check('H35', 'the frame prints where it says; the rounded preview clips only the preview; the rising trail follows the design and the suit', () => {
    for (const [preset, w, h] of [['poker', 63.5, 88.9], ['mini', 44, 63]]) for (const safe of [3, 1, 6]) {
      const d = D.defaultDesign(); d.size = { preset, w, h }; d.safe = safe;
      const card = { kind: 'card', suitId: 'red', rank: 3 };
      const none = L.renderFace(d, card), raw = (() => { const x = JSON.parse(JSON.stringify(d)); delete x.face.frame; return L.renderFace(x, card); })();
      if (none !== raw || none.includes('hb-frame')) return 'frame none draws something';
      for (const [fr, k] of [['line', 1], ['inner', 2]]) {
        d.face.frame = fr;
        const svg = L.renderFace(d, card), grp = (svg.match(/<g class="hb-frame">([\s\S]*?)<\/g>/) || [])[1] || '';
        const rects = [...grp.matchAll(/<rect x="([-\d.]+)" y="([-\d.]+)" width="([-\d.]+)" height="([-\d.]+)"[^>]*stroke="([^"]+)"[^>]*stroke-width="([\d.]+)"/g)];
        if (rects.length !== k) return `frame ${fr}: ${rects.length} lines`;
        const inset = Math.max(0.8, safe * 0.5);   // restated
        const r0 = rects[0];
        if (Math.abs(+r0[1] - (d.bleed + inset)) > 1e-3 || Math.abs(+r0[3] - (w - 2 * inset)) > 1e-3) return `frame ${fr} at ${preset}, safe ${safe}: the line is at ${(+r0[1] - d.bleed).toFixed(2)} mm, want ${inset}`;
        if (r0[5] !== D.suitById(d, 'red').primary) return `frame ${fr}: drawn in ${r0[5]}`;
        for (const r of rects) if (+r[1] < d.bleed || +r[1] + +r[3] > d.bleed + w) return `frame ${fr}: a line outside the trim`;
        if (safe >= 3 && rects.some((r) => +r[1] + +r[6] / 2 > d.bleed + safe - 0.1)) return `frame ${fr} at safe ${safe}: a line reaches the safe zone (the index)`;
        if (svg.indexOf('class="hb-frame"') < svg.indexOf('class="hb-index"')) return 'the frame is drawn under the index';
        if (L.renderFace(d, card, { centreOnly: true }).includes('hb-frame')) return 'the board\'s thumbnail draws the frame';
      }
      d.face.frame = 'none';
      // the rounded preview: a clip on the trim at 0.05 of the shorter side, only when asked and without guides
      const round = L.renderFace(d, card, { round: true, idPrefix: 'q' });
      const cp = (round.match(/<clipPath id="qclip"><rect x="([-\d.]+)" y="([-\d.]+)" width="([-\d.]+)" height="([-\d.]+)" rx="([-\d.]+)"/) || []);
      if (!cp.length || Math.abs(+cp[3] - w) > 1e-3 || Math.abs(+cp[5] - Math.min(w, h) * 0.05) > 1e-3 || !round.includes('clip-path="url(#qclip)"')) return `${preset}: the rounded preview is not the trim at ${(Math.min(w, h) * 0.05).toFixed(2)} mm corners`;
      if (L.renderFace(d, card, { round: true, guides: true }).includes('clipPath') || none.includes('clipPath')) return 'a clip without the rounded preview, or under the guides';
      for (const k of ['clue', 'fuse']) if (!L.renderFace(d, { kind: k }, { round: true }).includes('clipPath')) return `the ${k} token is not rounded in the preview`;
      if (!L.renderBack(d, { round: true }).includes('clipPath')) return 'the back is not rounded in the preview';
    }
    if (/round\s*:/.test(fs.readFileSync(path.join(REPO, 'hanabi', 'export.js'), 'utf8'))) return 'export.js asks for the rounded preview';
    // the rising trail: off in a new design, on in one that does not say (saved before), and the suit's own either way
    const trail = (dd) => /stroke-dasharray/.test(L.renderFace(dd, { kind: 'card', suitId: 'white', rank: 1 }).split('<g class="hb-index">')[0]);
    const d = D.defaultDesign(); D.suitById(d, 'white').centre = { compose: 'scale', motif: 'classic', tier: 'none' };
    if (!F.motifParams('classic').includes('stem') || !F.motifParams('radial-willow').includes('stem') || F.motifParams('peony').includes('stem')) return 'the rising trail is not a parameter of exactly the phase-1 bursts';
    if (trail(d)) return 'a new design draws the rising trail';
    const old = JSON.parse(JSON.stringify(d)); delete old.stems;
    if (!trail(old)) return 'a design that does not say lost its rising trail';
    D.suitById(d, 'white').firework.stem = true; if (!trail(d)) return 'the suit\'s rising trail on does not draw it';
    D.suitById(old, 'white').firework.stem = false; if (trail(old)) return 'the suit\'s rising trail off still draws it';
    D.cellOf(d, 'white', 1, true).stem = false; if (trail(d)) return 'a card\'s rising trail off still draws it';
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
      // ONE greyscale control: the toolbar's, which reaches the board and the editor's card
      const toggles = await page.$$eval('input[type=checkbox]', (els) => els.filter((e) => /grey/i.test(e.closest('label') ? e.closest('label').textContent : '')).length);
      if (toggles !== 1) return `${toggles} greyscale toggles on the board view, want one`;
      await page.check('#grayscale');
      const gray = await page.$eval('#stage .hb-cell svg', (e) => getComputedStyle(e).filter);
      const edGray = await page.$eval('#edCard svg', (e) => getComputedStyle(e).filter);
      await page.uncheck('#grayscale');
      const plain = await page.$eval('#stage .hb-cell svg', (e) => getComputedStyle(e).filter);
      const edPlain = await page.$eval('#edCard svg', (e) => getComputedStyle(e).filter);
      if (!gray.includes('grayscale') || !edGray.includes('grayscale') || plain.includes('grayscale') || edPlain.includes('grayscale')) return `greyscale: board "${gray}" then "${plain}", editor card "${edGray}" then "${edPlain}"`;
      return true;
    });

    await check('B7', 'arranging a Count card by hand: drag, resize, turn, then use it for the whole rank', async () => {
      await page.evaluate(() => document.getElementById('resetDesign').click());
      await page.click('[data-cell="blue:2"]');
      const P = (s, r) => page.evaluate(([s, r]) => window.__hanabi.placement(s, r).items, [s, r]);
      const drag = async (sel, dx, dy) => {
        await page.$eval('#edCard', (e) => e.scrollIntoView({ block: 'center' }));
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
      await page.click('#edItems [data-item="1"]');
      await drag('#edCard [data-h="size"][data-i="1"]', 12, 0);
      const blue2 = await P('blue', 2);
      if (!(blue2[1].r > blue1[1].r + 0.5)) return `resize: r ${blue1[1].r.toFixed(2)} -> ${blue2[1].r.toFixed(2)}`;
      await page.click('#edItems [data-item="0"]');
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

    await check('B9', 'the Arrange panel: pick, size, restack; a Scale card placed by drag; Column not arranged', async () => {
      await page.evaluate(() => document.getElementById('resetDesign').click());
      await page.click('[data-view=fireworks]');
      await page.click('[data-cell="red:3"]');
      const D = () => page.evaluate(() => window.__hanabi.design());
      const P = (s, r) => page.evaluate(([s, r]) => window.__hanabi.placement(s, r).items, [s, r]);
      const centre = (sel) => page.$eval(sel, (e) => { e.closest('#edCard').scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
      // a click on a firework picks it and writes nothing
      const c2 = await centre('#edCard [data-h="move"][data-i="2"]');
      await page.mouse.click(c2.x, c2.y);
      if (Object.keys((await D()).fireworks).length) return `a pick wrote ${JSON.stringify((await D()).fireworks)}`;
      if (await page.$eval('#edItems [data-item="2"]', (e) => e.getAttribute('aria-checked')) !== 'true') return 'the clicked firework is not the picked one';
      // the size slider sizes the picked firework only
      const before = await P('red', 3);
      await setRange('#ar-s', 1);
      const after = await P('red', 3), unit = await page.evaluate(() => window.__hanabi.placement('red', 3).unit);
      if (Math.abs(after[2].r - unit) > 1e-6) return `the picked firework's radius is ${(after[2].r / unit).toFixed(3)} of the unit, asked 1`;
      for (const i of [0, 1]) if (Math.abs(after[i].r - before[i].r) > 1e-9 || Math.abs(after[i].cx - before[i].cx) > 1e-9) return `firework ${i} moved under another's size slider`;
      // to the back: the picked firework is drawn first and stays picked
      await page.click('#edOrder [data-order="back"]');
      const items = (await D()).fireworks.red[3].items;
      if (items[0].n !== 2 || items.map((x) => x.n).sort().join() !== '0,1,2') return `restacked: ${JSON.stringify(items.map((x) => x.n))}`;
      if (await page.$eval('#edItems [data-item="0"]', (e) => e.getAttribute('aria-checked')) !== 'true') return 'the restacked firework is no longer the picked one';
      const svg = await page.$eval('[data-cell="red:3"]', (e) => e.innerHTML);
      if ((svg.match(/<g class="hb-firework"/g) || []).length !== 3) return 'the board card lost a firework';
      // Column lays itself out: no Arrange panel
      await page.selectOption('#edCompose', 'column');
      if (await page.$('#edArrange')) return 'Column offers an Arrange panel';
      // Scale: the one firework is dragged to where the pointer goes
      await page.selectOption('#edCompose', 'scale');
      if (!(await page.$('#edArrange')) || await page.$('#edItems')) return 'Scale: no Arrange panel, or a stacking order for one firework';
      const S0 = await page.evaluate(() => window.__hanabi.placeOf('red', 3));
      const m = await centre('#edCard [data-h="move"][data-i="0"]');
      await page.mouse.move(m.x, m.y); await page.mouse.down();
      for (let k = 1; k <= 6; k++) await page.mouse.move(m.x - (30 * k) / 6, m.y + (20 * k) / 6);
      await page.mouse.up();
      const S1 = await page.evaluate(() => window.__hanabi.placeOf('red', 3));
      const pxPerMm = await page.$eval('#edCard svg', (e) => e.getBoundingClientRect().width / e.viewBox.baseVal.width);
      const dmm = Math.hypot(S1.cx - S0.cx, S1.cy - S0.cy), want = Math.hypot(30, 20) / pxPerMm;
      if (!(await D()).fireworks.red[3].place || Math.abs(dmm - want) > 1.2) return `the Scale firework moved ${dmm.toFixed(2)} mm under a ${want.toFixed(2)} mm drag`;
      await page.evaluate(() => document.getElementById('resetDesign').click());
      await page.click('[data-view=suit]');
      return true;
    });

    await check('B10', 'the layout: the panel collapses to a rail and back, the editor resizes by its handle, the card zooms; all kept per browser', async () => {
      await page.evaluate(() => document.getElementById('resetDesign').click());
      await page.click('[data-view=fireworks]');
      await page.click('[data-cell="red:3"]');
      const W = (sel) => page.$eval(sel, (e) => e.getBoundingClientRect().width);
      const overflow = () => page.$eval('.hb-boardcol', (c) => c.scrollWidth - c.clientWidth);
      const board0 = await W('.hb-board');
      // the rail
      await page.click('#panelToggle');
      const rail = await W('#deckPanel'), board1 = await W('.hb-board');
      if (!(rail <= 40) || await page.$eval('#panelToggle', (e) => e.getAttribute('aria-expanded')) !== 'false') return `collapsed panel ${rail}px wide`;
      if (!(board1 > board0 + 100)) return `the board did not take the freed width: ${board0} -> ${board1}px`;
      await page.reload(); await page.waitForFunction(() => window.__hanabi);
      if (!(await W('#deckPanel') <= 40)) return 'the rail did not survive a reload';
      await page.click('#panelToggle');
      if (!(await W('#deckPanel') > 300)) return 'the panel did not open again';
      await page.reload(); await page.waitForFunction(() => window.__hanabi);
      if (!(await W('#deckPanel') > 300)) return 'the open panel did not survive a reload';
      // the editor's width, by a real drag on its handle
      await page.click('[data-view=fireworks]'); await page.click('[data-cell="red:3"]');
      const drag = async (dx) => {
        const h = await page.$eval('#edResize', (e) => { e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + Math.min(80, r.height / 2) }; });
        await page.mouse.move(h.x, h.y); await page.mouse.down();
        for (let k = 1; k <= 6; k++) await page.mouse.move(h.x + (dx * k) / 6, h.y);
        await page.mouse.up();
      };
      const e0 = await W('#editor');
      await drag(-160);
      const e1 = await W('#editor'), L1 = await page.evaluate(() => window.__hanabi.layout());
      if (Math.abs(e1 - (e0 + 160)) > 3 || Math.abs(L1.editorW - e1) > 1) return `a 160px drag took the editor ${e0} -> ${e1}px (stored ${L1.editorW})`;
      if (await overflow() > 0) return `the board overflows its column by ${await overflow()}px at a wide editor`;
      await page.reload(); await page.waitForFunction(() => window.__hanabi);
      await page.click('[data-view=fireworks]'); await page.click('[data-cell="red:3"]');
      if (Math.abs(await W('#editor') - e1) > 1) return `the editor width did not survive a reload: ${await W('#editor')} vs ${e1}`;
      await drag(900);
      const Lmin = await page.evaluate(() => window.__hanabi.layout());
      if (Lmin.editorW !== 280 || Math.abs(await W('#editor') - 280) > 1) return `dragged past its minimum the editor is ${Lmin.editorW} (${await W('#editor')}px), want 280`;
      if (await overflow() > 0) return `the board overflows its column by ${await overflow()}px at a narrow editor`;
      await drag(-2000);
      const Lmax = await page.evaluate(() => window.__hanabi.layout());
      const boardLeft = await W('.hb-boardcol');
      if (Lmax.editorW > 960 || boardLeft < 300) return `dragged past its maximum: stored ${Lmax.editorW}, the board left ${boardLeft}px`;
      await page.focus('#edResize'); await page.keyboard.press('Home');
      if ((await page.evaluate(() => window.__hanabi.layout())).editorW !== 280) return 'Home on the handle did not go to the minimum';
      await page.keyboard.press('ArrowLeft');
      if ((await page.evaluate(() => window.__hanabi.layout())).editorW !== 296) return 'ArrowLeft on the handle did not widen the editor by 16px';
      // the card zoom: 100% is print size; fit fits the editor; kept
      await page.click('#edZoom [data-zoom="100"]');
      const mm = await page.evaluate(() => { const v = document.querySelector('#edCard svg').viewBox.baseVal; return v.width; });
      const px = await W('#edCard svg');
      if (Math.abs(px - (mm * 96) / 25.4) > 1.5) return `100% draws the card ${px.toFixed(1)}px for ${mm} mm (want ${((mm * 96) / 25.4).toFixed(1)})`;
      await page.click('#edZoom [data-zoom="200"]');
      const px2 = await W('#edCard svg');
      if (Math.abs(px2 - 2 * px) > 2) return `200% is ${px2}px against 100%'s ${px}`;
      await page.reload(); await page.waitForFunction(() => window.__hanabi);
      await page.click('[data-view=fireworks]'); await page.click('[data-cell="red:3"]');
      if (Math.abs(await W('#edCard svg') - px2) > 2) return 'the card zoom did not survive a reload';
      await page.click('#edZoom [data-zoom="fit"]');
      const fit = await W('#edCard svg'), wrap = await page.$eval('#edCardWrap', (e) => e.clientWidth);
      if (fit > wrap || fit < Math.min(wrap - 10, 200)) return `fit draws the card ${fit}px in a ${wrap}px editor`;
      // back to the default layout for the checks after this one
      await page.evaluate(() => localStorage.removeItem('hanabi.layout.v1')); await page.reload(); await page.waitForFunction(() => window.__hanabi);
      await page.click('[data-view=suit]');
      return true;
    });

    await check('B11', 'per-firework styles and Centre through the editor: one firework restyled and reset; Centre, every rank 1, a row', async () => {
      await page.evaluate(() => document.getElementById('resetDesign').click());
      await page.click('[data-view=fireworks]');
      await page.click('[data-cell="red:4"]');
      const D = () => page.evaluate(() => window.__hanabi.design());
      const a = await snap();
      await page.click('#edItems [data-item="2"]');
      await page.selectOption('#st-motif', 'crossette');
      const d1 = await D();
      if (JSON.stringify(d1.fireworks) !== JSON.stringify({ red: { 4: { styles: { 2: { motif: 'crossette' } } } } })) return `restyling wrote ${JSON.stringify(d1.fireworks)}`;
      if (moved(a, await snap()) !== 'red:4') return `a firework style repainted ${moved(a, await snap())}`;
      const types = await page.$$eval('#edCard .hb-firework', (g) => g.map((x) => x.dataset.motif).join());
      if (types !== 'peony,peony,crossette,peony') return `the editor card draws ${types}`;
      if (!(await page.$eval('#edItems [data-item="2"]', (e) => e.classList.contains('is-own'))) || await page.$eval('#edItems [data-item="1"]', (e) => e.classList.contains('is-own'))) return 'the restyled firework is not the one marked';
      if (!(await page.$eval('[data-cell="red:4"]', (e) => e.classList.contains('is-own')))) return 'the board cell is not marked';
      await setRange('#st-density', 1);
      if ((await D()).fireworks.red[4].styles[2].density !== 1) return 'the detail slider did not write the firework\'s style';
      if ((await D()).fireworks.red[4].styles[1]) return 'a style reached another firework';
      await page.click('#stReset');
      if (Object.keys((await D()).fireworks).length || moved(a, await snap())) return 'Reset firework to suit left a style behind';
      // Centre: a willow 1 lands on the field's centre, written as the card's own arrangement
      await page.click('[data-cell="blue:1"]');
      const c0 = await page.evaluate(() => window.__hanabi.centring('blue', 1));
      await page.click('#edCentre');
      const c1 = await page.evaluate(() => window.__hanabi.centring('blue', 1)), items = (await D()).fireworks.blue[1].items;
      if (!(Math.abs(c0.dy) > 1) || Math.hypot(c1.dx, c1.dy) > 0.01 || !items) return `Centre: before ${c0.dx.toFixed(2)},${c0.dy.toFixed(2)} mm off, after ${c1.dx.toFixed(3)},${c1.dy.toFixed(3)}; items ${JSON.stringify(items)}`;
      if (Math.abs(+(await page.$eval('#ar-y', (e) => e.value)) - items[0].y) > 0.006) return 'the Down slider does not show the centred value';
      if (!/moved/.test(await page.$eval('#edStatus', (e) => e.textContent))) return 'Centre said nothing';
      await page.click('#edResetItems');
      if ((await D()).fireworks.blue) return 'Reset arrangement did not undo the centring';
      // Centre all rank 1s, then a row (a card already centred within 0.05 mm is left alone: B13)
      const SUITS5 = ['white', 'red', 'blue', 'yellow', 'green'], TOL = 0.05;
      const offBefore = [];
      for (const s of SUITS5) { const c = await page.evaluate((s) => window.__hanabi.centring(s, 1), s); if (Math.hypot(c.dx, c.dy) >= TOL) offBefore.push(s); }
      await page.click('#centreRank1');
      const d2 = await D();
      for (const s of SUITS5) {
        const c = await page.evaluate((s) => window.__hanabi.centring(s, 1), s);
        if (Math.hypot(c.dx, c.dy) > (offBefore.includes(s) ? 0.01 : TOL)) return `after Centre all rank 1s, ${s} 1 is ${Math.hypot(c.dx, c.dy).toFixed(3)} mm off`;
      }
      if (!offBefore.length || Object.keys(d2.fireworks).sort().join() !== offBefore.sort().join() || Object.values(d2.fireworks).some((x) => Object.keys(x).join() !== '1')) return `Centre all rank 1s wrote ${JSON.stringify(Object.fromEntries(Object.entries(d2.fireworks).map(([k, v]) => [k, Object.keys(v)])))}; off centre were ${offBefore.join(', ')}`;
      await page.click('[data-centre-row="green"]');
      for (const r of [1, 2, 3, 4, 5]) { const c = await page.evaluate((r) => window.__hanabi.centring('green', r), r); if (Math.hypot(c.dx, c.dy) > TOL) return `centre row left green ${r} ${Math.hypot(c.dx, c.dy).toFixed(3)} mm off`; }
      if (!Object.keys((await D()).fireworks.green || {}).length) return 'centre row did not reach a green card';
      await page.evaluate(() => document.getElementById('resetDesign').click());
      await page.click('[data-view=suit]');
      return true;
    });

    await check('B12', 'the count control: each type\'s own label, range and integer readout; the row reaches every firework, one firework\'s own reaches it alone', async () => {
      const Lm = await import(pathToFileURL(path.join(REPO, 'hanabi/layout.js')).href);
      await page.evaluate(() => document.getElementById('resetDesign').click());
      await page.click('[data-view=fireworks]');
      await page.click('[data-cell="red:3"]');
      await page.click('#edScope [data-scope="row"]');
      const D = () => page.evaluate(() => window.__hanabi.design());
      // the editor card's fireworks, in drawing order, as markup the gate's reader takes
      const counted = async (t) => {
        const d = await D(), red = d.suits.find((x) => x.id === 'red'), pl = Lm.placementFor(d, red, 3);
        const gs = await page.$$eval('#edCard .hb-firework', (g) => g.map((x) => x.outerHTML));
        return gs.map((g, i) => elementsOf(t, g.replace(/><\/(circle|line|path)>/g, '/>'), pl.items[i]));
      };
      for (const t of Object.keys(COUNT_TABLE)) {
        const [label, lo, dflt, hi] = COUNT_TABLE[t];
        await page.click(`#editor [data-type="${t}"]`);
        const ctl = await page.$eval('#p-count', (e) => ({ min: +e.min, max: +e.max, step: +e.step, value: +e.value, label: document.querySelector('label[for="p-count"]').textContent, out: document.querySelector('[data-o="count"]').textContent }));
        if (ctl.label !== label || ctl.min !== lo || ctl.max !== hi || ctl.step !== 1) return `${t}: the count control reads "${ctl.label}" ${ctl.min}..${ctl.max} step ${ctl.step}`;
        if (ctl.value !== dflt || ctl.out !== String(dflt)) return `${t}: the control shows ${ctl.value} ("${ctl.out}"), the default is ${dflt}`;
        if ((await counted(t)).some((c) => c !== dflt)) return `${t}: at the default the card draws ${(await counted(t)).join(', ')}`;
        for (const v of [lo, hi]) {
          await setRange('#p-count', v);
          if ((await D()).suits.find((x) => x.id === 'red').firework.count !== v || await page.$eval('[data-o="count"]', (e) => e.textContent) !== String(v)) return `${t}: setting ${v} wrote ${(await D()).suits.find((x) => x.id === 'red').firework.count}`;
          const c = await counted(t);
          if (c.some((x) => x !== v)) return `${t}: the row at ${v} draws ${c.join(', ')}`;
        }
        await page.click('#editor [data-clear="count"]');
      }
      // one firework's own count: firework 2 of Red 3, as a willow
      await page.click('#editor [data-type="willow"]');
      await setRange('#p-count', 10);
      await page.click('#edItems [data-item="1"]');
      if (await page.$eval('label[for="st-count"]', (e) => e.textContent) !== 'Trails') return 'the style section\'s count is not labelled Trails';
      await setRange('#st-count', 31);
      const d = await D();
      if (JSON.stringify(d.fireworks) !== JSON.stringify({ red: { 3: { styles: { 1: { count: 31 } } } } })) return `one firework's count wrote ${JSON.stringify(d.fireworks)}`;
      const c = await counted('willow');
      if (c.join() !== '10,31,10') return `with firework 2 at 31 and the row at 10 the card draws ${c.join(', ')} trails`;
      if (!(await page.$eval('[data-sparam="count"]', (e) => e.classList.contains('is-own')))) return 'the firework\'s own count is not marked';
      await page.evaluate(() => document.getElementById('resetDesign').click());
      await page.click('[data-view=suit]');
      return true;
    });

    await check('B13', 'the polish pass: no panel dropdown cut off, one-line labels, every colour shows its hex, the rounded preview, Centre all rank 1s skips a centred card, the catalogue counts and the rising trail in the editor', async () => {
      const Lm = await import(pathToFileURL(path.join(REPO, 'hanabi/layout.js')).href), Dm = await import(pathToFileURL(path.join(REPO, 'hanabi/deck.js')).href);
      await page.evaluate(() => { localStorage.removeItem('hanabi.layout.v1'); document.getElementById('resetDesign').click(); });
      await page.reload(); await page.waitForFunction(() => window.__hanabi);
      await page.click('[data-view=suit]');
      await page.evaluate(() => { const r = document.getElementById('rainbow'); if (!r.checked) r.click(); for (const s of document.querySelectorAll('.hb-panel details')) s.open = true; });
      // every option of every panel select fits the select it is in (the arrow's room kept)
      const cut = await page.evaluate(() => {
        const ctx = document.createElement('canvas').getContext('2d'), out = [];
        for (const sel of document.querySelectorAll('.hb-panel select')) {
          if (!sel.offsetParent) continue;
          const cs = getComputedStyle(sel); ctx.font = cs.font;
          const room = sel.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 22;
          for (const o of sel.options) { const w = ctx.measureText(o.textContent).width; if (w > room) out.push(`${sel.id || sel.dataset.c || 'select'} "${o.textContent}" ${w.toFixed(0)} > ${room.toFixed(0)} px`); }
        }
        return out;
      });
      if (cut.length) return `dropdown labels cut off at the default panel width: ${cut.slice(0, 4).join('; ')}`;
      const wrapped = await page.evaluate(() => [...document.querySelectorAll('.hb-suit__centre label, .hb-panel .hb-row > label')].filter((l) => l.offsetParent)
        .filter((l) => l.getBoundingClientRect().height > parseFloat(getComputedStyle(l).lineHeight) * 1.5 || l.scrollWidth > l.clientWidth + 1).map((l) => l.textContent.trim()));
      if (wrapped.length) return `labels wrap or overflow: ${wrapped.slice(0, 5).join(' | ')}`;
      // every panel colour: a swatch and its hex, the hex following the value
      const hexes = await page.evaluate(() => [...document.querySelectorAll('.hb-panel .hb-row input[type=color]')].map((i) => ({ id: i.id, v: i.value.toUpperCase(), hex: i.parentElement.matches('.hb-colorbox') ? i.parentElement.querySelector('.hb-hex').textContent : null })));
      if (hexes.length < 8 || hexes.some((h) => h.hex !== h.v)) return `a colour without its hex: ${JSON.stringify(hexes.filter((h) => h.hex !== h.v))}`;
      await page.$eval('#faceBg', (e) => { e.value = '#223344'; e.dispatchEvent(new Event('input', { bubbles: true })); });
      if (await page.$eval('#faceBg', (e) => e.parentElement.querySelector('.hb-hex').textContent) !== '#223344' || (await page.evaluate(() => window.__hanabi.design().face.bg)) !== '#223344') return 'the card face hex does not follow the colour';
      // the rounded preview: on by default, a clip on every stage card, none under the guides or when off
      const clips = () => page.$$eval('#stage .hb-card svg', (s) => s.filter((x) => x.querySelector('clipPath')).length + '/' + s.length);
      if (!(await page.isChecked('#roundCorners')) || !/^(\d+)\/\1$/.test(await clips())) return `the rounded preview is not on by default: ${await clips()} cards clipped`;
      await page.check('#guides'); const g = await clips(); await page.uncheck('#guides');
      await page.uncheck('#roundCorners'); const off = await clips(); await page.check('#roundCorners');
      if (!g.startsWith('0/') || !off.startsWith('0/')) return `clipped under the guides (${g}) or with the rounded preview off (${off})`;
      // Centre all rank 1s: a card already centred is left alone (no override, no dot); the rest are centred; twice changes nothing
      await page.evaluate(() => document.getElementById('resetDesign').click());
      await page.click('[data-view=fireworks]');
      const d0 = await page.evaluate(() => window.__hanabi.design());
      const already = Dm.activeSuits(d0).filter((s) => { const c = Lm.centring(d0, s, 1); return c && Math.hypot(c.dx, c.dy) < 0.05; }).map((s) => s.id);
      const off1 = Dm.activeSuits(d0).filter((s) => { const c = Lm.centring(d0, s, 1); return c && Math.hypot(c.dx, c.dy) >= 0.05; }).map((s) => s.id);
      if (!already.length || !off1.length) return `the default deck gives no case of each: already centred ${already}, not ${off1}`;
      await page.click('#centreRank1');
      const d1 = await page.evaluate(() => window.__hanabi.design());
      const marked = Object.keys(d1.fireworks).filter((id) => d1.fireworks[id][1]);
      if (marked.sort().join() !== [...off1].sort().join()) return `Centre all rank 1s wrote ${marked.join(', ') || 'nothing'}; ${off1.join(', ')} were off centre and ${already.join(', ')} already centred`;
      for (const id of already) if (await page.$(`[data-cell="${id}:1"] .hb-cell__mark`)) return `${id} 1 was already centred and is marked as overridden`;
      const status = await page.$eval('#boardStatus', (e) => e.textContent);
      if (!/already centred/.test(status)) return `the status does not say what was left: "${status}"`;
      await page.click('#centreRank1');
      if (JSON.stringify(await page.evaluate(() => window.__hanabi.design().fireworks)) !== JSON.stringify(d1.fireworks)) return 'a second Centre all rank 1s changed the deck';
      // the catalogue counts in the editor: the disc's spokes and a field's count, drawn exactly
      await page.evaluate(() => document.getElementById('resetDesign').click());
      await page.click('[data-view=fireworks]');
      await page.click('[data-cell="red:3"]');
      await page.click('#edScope [data-scope="row"]');
      for (const m of ['spoke', 'spokecore', 'rosettes', 'starfield']) {
        const [label, lo, dflt, hi] = CAT_TABLE[m];
        await page.click(`#editor [data-type="${m}"]`);
        const ctl = await page.$eval('#p-count', (e) => ({ min: +e.min, max: +e.max, step: +e.step, value: +e.value, label: document.querySelector('label[for="p-count"]').textContent, out: document.querySelector('[data-o="count"]').textContent }));
        if (ctl.label !== label || ctl.min !== lo || ctl.max !== hi || ctl.step !== 1 || ctl.value !== dflt || ctl.out !== String(dflt)) return `${m}: the count control reads "${ctl.label}" ${ctl.min}..${ctl.max} step ${ctl.step} at ${ctl.value} ("${ctl.out}")`;
        await setRange('#p-count', hi);
        const d = await page.evaluate(() => window.__hanabi.design()), red = d.suits.find((x) => x.id === 'red'), pl = Lm.placementFor(d, red, 3);
        const gs = await page.$$eval('#edCard .hb-firework', (g) => g.map((x) => x.outerHTML));
        const got = gs.map((x, i) => catElements(m, x.replace(/><\/(circle|line|path)>/g, '/>'), pl.items[i]));
        if (red.firework.count !== hi || got.length !== 3 || got.some((c) => c !== hi)) return `${m} at ${hi}: wrote ${red.firework.count}, the card draws ${got.join(', ')}`;
        await page.click('#editor [data-clear="count"]');
      }
      // the rising trail: a parameter of the phase-1 burst, off in a new design
      await page.click('#editor [data-type="classic"]');
      if (await page.$('[data-param="stem"] input') === null || await page.isChecked('[data-param="stem"] input')) return 'Classic has no rising-trail control, or it is on in a new design';
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
      // five cards, an index in each corner the deck's corner mode asks for (four, by default)
      const want = 5 * ((await page.evaluate(() => window.__hanabi.design().corners)) === 'four' ? 4 : 2);
      return (strokes === want && fills === want && solid === 0 && stops === 5 && disabled && bandStrokes === 0) || `gradient numerals ${strokes} and symbols ${fills} (want ${want} each), after solid ${solid}, gradients ${stops} (want 5), band: disabled ${disabled}, strokes ${bandStrokes}`;
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

if (DESIGN) {
  // the likeness report on a saved design: warnings only, never a failure
  const imp = (m) => import(pathToFileURL(path.join(REPO, 'hanabi', m)).href);
  const [D, L, F, S] = await Promise.all(['deck.js', 'layout.js', 'firework.js', 'symbols.js'].map(imp));
  const { design, notes } = D.normaliseDesign(JSON.parse(fs.readFileSync(DESIGN, 'utf8')), S.SYMBOL_IDS);
  if (!design) { console.log(`✕ ${notes.join('; ')}`); process.exit(1); }
  const w = greyscaleReport(D, L, F, design);
  for (const x of w) console.log(`WARN ${x}`);
  console.log(`greyscale likeness: ${w.length ? `${w.length} pair${w.length === 1 ? '' : 's'} to look at` : 'every suit reads apart on every rank'} (non-blocking)`);
  process.exit(0);
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
      const missed = want.filter((b) => !red.includes(b)), extra = red.filter((r) => !m.breaks.includes(r) && !(m.mayAlso || []).includes(r));
      const ok = !missed.length && !extra.length;
      if (!ok) failed++;
      console.log(`${ok ? 'ok  ' : 'BAD '} ${m.id}: red ${red.join(',') || 'nothing'}${missed.length ? ` — MISSED ${missed}` : ''}${extra.length ? ` — UNCLAIMED ${extra}` : ''}`);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
  console.log(`negative control: ${RUN.length - failed}/${RUN.length} behave${ONLY.length ? ` (a SUBSET of ${MUTANTS.length})` : ''}`);
  process.exit(failed ? 1 : 0);
}
