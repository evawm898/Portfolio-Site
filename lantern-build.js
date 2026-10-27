/* lantern-build.js — the BACKING pieces, the TEST GRID, the single-point
   COUPON, the machine SETTINGS table and the assembly INSTRUCTIONS
   (lantern-design-doc.md §7, §8, §9). Pure: no DOM, no three, no jsPDF —
   the page renders the steps to HTML and to a PDF from the same list.

   BACKING: one translucent piece per point, per half, behind the cut field
   of that point — the field's own region (between the spine band and the
   two fold keep-outs, from where the field opens to the rim margin) grown by
   a glue margin that stops short of the folds, so the tissue never crosses a
   crease. Colours are assigned per POINT from a palette, cycling, so "two
   colours" alternates around the star and "three" runs a triad. */

import { facetField } from './lantern-pattern.js';
import { facetPlacer, registerDesignFields } from './lantern-geometry.js';
import { BED_MARGIN_MM } from './lantern-material.js';

export const BACKING_GLUE_MM = 3;
export const PALETTES = [
  { id: 'warm', name: 'warm — amber, rose, gold', colours: ['#e8a94f', '#d96b7a', '#f2d272'] },
  { id: 'ice', name: 'ice — pale blue, lilac, white', colours: ['#9fc8e8', '#b9a6e0', '#f2f2ee'] },
  { id: 'forest', name: 'forest — moss, fern, straw', colours: ['#7f9b5a', '#4f7f6a', '#e3cf8a'] },
  { id: 'dusk', name: 'dusk — plum, coral, apricot', colours: ['#7a4f7f', '#e07a5f', '#f4b07a'] },
  { id: 'paper', name: 'paper — cream, ivory, white', colours: ['#f1e7cf', '#f7f1e3', '#ffffff'] },
];
export const BACKING_FIELDS = ['backing', 'backingColours', 'palette'];
export const BACKING_STATE_DEFAULTS = Object.freeze({ backing: false, backingColours: 2, palette: 'warm' });
export function readBacking(raw) {
  return { backing: !!raw.backing, backingColours: [1, 2, 3].includes(+raw.backingColours) ? +raw.backingColours : 2, palette: PALETTES.some((p) => p.id === raw.palette) ? raw.palette : 'warm' };
}
registerDesignFields(BACKING_FIELDS, readBacking);
export const paletteOf = (state) => PALETTES.find((p) => p.id === state.palette) || PALETTES[0];
export const colourOfPoint = (state, j) => paletteOf(state).colours[j % state.backingColours];

/* the backing region of one facet TYPE, in the facet frame: the field grown by the glue margin, held off the folds and the rim */
export function backingRegion(t, rules) {
  const F = facetField(t, rules), g = BACKING_GLUE_MM;
  const yLo = Math.max(rules.spine / 2 - g, rules.spine / 2 * 0.5);     // grows toward the ridge, never onto the spine's inner half
  const x0 = Math.max(F.xMin - g, rules.foldKeepout), x1 = Math.min(F.xMax + g, F.xT - rules.rimMargin * 0.6);
  const top = [], n = 24;
  for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n; top.push([x, Math.max(yLo, Math.min(F.yHi(x) + g, F.rimY(x) - rules.rimMargin * 0.6, x * Math.tan(t.a) - rules.foldKeepout * 0.5 / Math.cos(t.a)))]); }
  return [[x0, yLo], ...top, [x1, yLo]];
}
/* every backing piece of one half: point j's region on both sides of its ridge joined into one piece across the spine */
export function backingPieces(model, state, rules, which) {
  const out = [];
  for (let j = 0; j < model.N; j++) {
    if (state.patSolidAlt && j % 2 === 1) continue;
    const t = model.facets[model.alternate ? j % 2 : 0];
    const reg = backingRegion(t, rules);
    const R = facetPlacer(model, j, 1), L = facetPlacer(model, j, -1);
    // one piece: the right region, then the left region mirrored, walked so the polygon closes across the ridge
    const right = reg.map(R), left = reg.map(L).reverse();
    const poly = [...right, ...left];
    out.push({ id: `${which}-backing-${j + 1}`, label: `${which === 'front' ? 'F' : 'B'}${j + 1} tissue`, kind: 'backing', j, which, colour: colourOfPoint(state, j), outline: poly, cuts: [], creases: [], tabs: [], holes: [], labels: [{ text: `${which === 'front' ? 'F' : 'B'}${j + 1}`, at: R([(reg[0][0] + reg[reg.length - 1][0]) / 2, 0]), angle: model.flatTip[j] }] });
  }
  return out;
}

/* ---- the test grid --------------------------------------------------------- */
/* a coupon of the rules themselves: bridges from 0.6 to 2.2 mm between pairs
   of 10 mm slots, holes from 0.8 to 3.0 mm, strokes from 0.6 to 2.0 mm, each
   labelled, with the stock's own derived value marked — cut this first, weed
   it, and move the rules to what survived. */
export function testGridSvg(rules, { stamp = 'lantern' } = {}) {
  const cut = [], engrave = [], score = [];
  const W = 150, H = 90, f = (v) => v.toFixed(3);
  const rect = (x, y, w, h) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"/>`;
  const txt = (x, y, s, size = 2.2) => `<text x="${f(x)}" y="${f(y)}" font-size="${size}" font-family="monospace">${s}</text>`;
  engrave.push(txt(6, 6, `${stamp} — test grid for ${rules.gsm} gsm / ${rules.t} mm: cut, weed by hand, and keep the narrowest that survived`, 2.4));
  // bridges: two 10 × 4 slots a bridge apart
  const bridges = [0.6, 0.8, 1.0, 1.2, 1.5, 1.8, 2.2];
  engrave.push(txt(6, 13, 'bridge between two cuts (mm)'));
  bridges.forEach((b, i) => { const x = 6 + i * 16, y = 15; cut.push(rect(x, y, 10, 4), rect(x, y + 4 + b, 10, 4)); engrave.push(txt(x, y + 13, `${b}${Math.abs(b - rules.bridge) < 1e-9 ? ' ◀' : ''}`)); });
  // holes
  const holes = [0.8, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0];
  engrave.push(txt(6, 35, 'smallest hole (mm)'));
  holes.forEach((d, i) => { const x = 11 + i * 16; cut.push(`<circle cx="${f(x)}" cy="${f(41)}" r="${f(d / 2)}"/>`); engrave.push(txt(x - 4, 48, `${d}${Math.abs(d - rules.minHole) < 1e-9 ? ' ◀' : ''}`)); });
  // strokes: a 14 mm slot of each width
  const strokes = [0.6, 0.8, 1.0, 1.2, 1.5, 1.8, 2.0];
  engrave.push(txt(6, 56, 'narrowest stroke (mm)'));
  strokes.forEach((w, i) => { const x = 6 + i * 16; cut.push(rect(x, 58, 14, w)); engrave.push(txt(x, 66, `${w}${Math.abs(w - rules.minCut) < 1e-9 ? ' ◀' : ''}`)); });
  // a fold next to a cut: the keep-out
  engrave.push(txt(6, 74, 'a score beside a cut: keep-out (mm)'));
  [2, 3, 4, 5, 6].forEach((k, i) => { const x = 6 + i * 22; score.push(`<path d="M${f(x)},${f(76)} L${f(x)},${f(86)}"/>`); cut.push(rect(x + k, 77, 8, 8)); engrave.push(txt(x + 1, 89, `${k}${Math.abs(k - rules.foldKeepout) < 1e-9 ? ' ◀' : ''}`)); });
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- ${stamp} — test grid, mm units. Cut it on the stock you will use; the ◀ marks the value the page derived for it. -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">
<g id="ENGRAVE" inkscape:label="ENGRAVE" fill="#000000" stroke="none">${engrave.join('')}</g>
<g id="SCORE" inkscape:label="SCORE" stroke="#0000ff" fill="none" stroke-width="0.2">${score.join('')}</g>
<g id="CUT" inkscape:label="CUT" stroke="#ff0000" fill="none" stroke-width="0.2">${cut.join('')}<rect x="1" y="1" width="${W - 2}" height="${H - 2}"/></g>
</svg>`;
}

/* ---- machine settings ---------------------------------------------------- */
/* STARTING VALUES — every machine is its own; these are where to begin a
   power test on card, named per layer so they land beside the file's layers. */
export function settingsTable(machine, rules) {
  if (machine.id === 'laser') {
    const k = rules.t / 0.25;   // thicker stock: a little more power, a little slower
    return [
      { layer: 'CUT', setting: `${Math.min(100, Math.round(55 * k))}% power · ${Math.round(18 / k)} mm/s · 1 pass`, note: 'through-cut; inner shapes before the outline' },
      { layer: 'SCORE', setting: `${Math.round(14 * k)}% · 40 mm/s`, note: 'a surface score for the mountain folds — must not cut through' },
      { layer: 'PERF', setting: `${Math.min(100, Math.round(55 * k))}% · ${Math.round(18 / k)} mm/s`, note: 'the valley dashes, cut through' },
      { layer: 'ENGRAVE', setting: `${Math.round(10 * k)}% · 120 mm/s`, note: 'the labels — light, on the inside face' },
    ];
  }
  return [
    { layer: 'CUT', setting: `fine-point blade · pressure ${rules.t >= 0.32 ? 'high' : 'medium'} · ${rules.t >= 0.32 ? 2 : 1} pass`, note: 'card setting' },
    { layer: 'SCORE', setting: 'scoring wheel · medium', note: 'both fold families (PERF is empty for a blade)' },
    { layer: 'ENGRAVE', setting: 'pen · fine', note: 'the labels, on the inside face' },
  ];
}

/* ---- the instructions ----------------------------------------------------- */
export function buildSteps(model, plan, state, rules, { backing = 0 } = {}) {
  const N = model.N, m = plan.machine, modules = plan.split;
  const parts = modules ? `${N} front modules (F1–F${N}), ${N} back modules (B1–B${N})` : 'the front half and the back half';
  return [
    { title: 'Cut', text: `Load the ${state.material} stock and cut every sheet (${plan.sheets.length}): CUT last, after SCORE${m.valley === 'perforated' ? ' and PERF' : ''}. Pieces: ${parts} and the ring${backing ? `, plus ${backing} tissue backing pieces` : ''}.` },
    { title: 'Weed', text: `Push every cut-away out from the back with a blunt point. The pattern has ${plan.pieces.filter((p) => p.kind !== 'ring').reduce((s, p) => s + p.cuts.length, 0)} cuts over the ${modules ? 2 * N : 2} pieces; work from the spine outward.` },
    { title: 'Fold', text: `Every RIDGE (centre to tip, the SCORE line) folds as a MOUNTAIN — the printed face outward. Every VALLEY (centre to inner vertex${modules ? ', the seam between modules' : `, the ${m.valley} line`}) folds as a VALLEY.` },
    ...(modules ? [{ title: 'Join the modules', text: `Lay F1 to F${N} in order. Seam S1 is between F1 and F2: glue F1's tab UNDER F2's edge, label to label, the valley crease on the join. Continue to S${N}, which closes F${N} to F1. Do the same for B1–B${N}.` }] : []),
    ...(backing ? [{ title: 'Back the cuts', text: `Glue each tissue piece inside its point (F1 tissue behind F1, and so on), ${state.backingColours} colour${state.backingColours > 1 ? 's' : ''} from the ${paletteOf(state).name.split(' — ')[0]} palette, over the field only — never across a crease.` }] : []),
    { title: 'The ring', text: `Glue the ring inside the back half around the ${model.opening} mm opening, centred; it is what the cord kit grips.` },
    { title: 'Raise the halves', text: `Press each half into its star: push the centre out while the valleys fold in, until every rim edge lies flat in one plane (the finished depth is ${model.depth.toFixed(0)} mm).` },
    { title: 'Join the halves', text: `Rim to rim: the front's ${2 * N} tabs go INSIDE the back's rim, one edge at a time from a tip to the next inner vertex. Glue, hold, move on; the last edge is the tightest.` },
    { title: 'Light', text: `Fit the cord kit's socket through the back opening and the ring. LED only — a lamp rated 5 W or less; never an incandescent or halogen bulb in a paper lantern.` },
    { title: 'Hang', text: model.hangHole ? 'Hang by the cord, or by the hole at the tip of point 1 with a loop of thread.' : 'Hang by the cord from the back opening.' },
    { title: 'Check', text: `Finished: ${model.width.toFixed(0)} mm (${(model.width / 25.4).toFixed(1)}″) across, ${model.depth.toFixed(0)} mm deep, ${N} points, about ${Math.round(plan.weightG || 0)} g of paper.` },
  ];
}
export function instructionsText(steps, model) {
  return `${model.N}-point paper star lantern — assembly\n\n${steps.map((s, i) => `${i + 1}. ${s.title.toUpperCase()}\n   ${s.text}`).join('\n\n')}\n`;
}

/* a single-point coupon: one front module at the chosen pattern, alone on a sheet — cut this before the whole star */
export function couponPieces(modules) { return modules.filter((p) => p.which === 'front' && p.j === 0).map((p) => ({ ...p, id: 'coupon', label: 'COUPON F1', labels: [{ text: 'coupon — one point, as it will cut', at: p.labels[0].at, angle: p.labels[0].angle }] })); }
export { BED_MARGIN_MM };
