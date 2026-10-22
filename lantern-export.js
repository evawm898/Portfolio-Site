/* lantern-export.js — pieces, modules, nesting and the sheet files
   (lantern-design-doc.md §6 and §8). Pure: no DOM, no three. The geometry
   module owns the solve; this module turns a solved model, its pattern and
   the export state into PIECES (a whole half, or one MODULE per point when
   the half does not fit the bed, the ring), NESTS them onto sheets of the
   chosen bed, and writes each sheet as an SVG with the machine's layers.

   A piece is drawn in its own local frame (mm, y up):
     { id, label, outline, cuts, creases, tabs, holes, labels, box }
   and a placement puts it on a sheet: { piece, x, y, rot } (rot in radians,
   about the piece's own origin; the writer applies it).

   MODULES split on VALLEY folds only (§6): module j is the wedge of point j
   from the apex out — the left edge of point j, its tip, its right edge —
   and the seam with module j + 1 is the valley crease between them. A seam
   carries a glue tab on module j's RIGHT valley side and a label pair
   ("S1" … "SN") on both modules at matching radii, so the pieces reassemble
   into the half they were cut from. The apex region is the sector of the
   opening (back) or a plain point (front). The front half's rim tabs stay on
   the module whose edge they belong to. */

import { halfOutline, facetPlacer } from './lantern-geometry.js';
import { placeCuts } from './lantern-pattern.js';
import { BED_MARGIN_MM, PERF_CUT_MM, PERF_GAP_MM, bedOf, machineOf } from './lantern-material.js';

const rot = ([x, y], g) => [x * Math.cos(g) - y * Math.sin(g), x * Math.sin(g) + y * Math.cos(g)];

/* ---- pieces ---------------------------------------------------------------- */
function boxOf(pts) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 }; }
function pieceBox(p) { const pts = [...p.outline]; for (const t of p.tabs) pts.push(...t.poly); for (const l of p.labels || []) { pts.push([l.at[0] - 3, l.at[1] - 3], [l.at[0] + 3, l.at[1] + 3]); } return boxOf(pts); }

/* one half as a single piece */
export function halfPiece(model, pattern, state, which) {
  const h = halfOutline(model, which);
  const cuts = pattern && state.patMode !== 'none' ? placeCuts(model, pattern, state).map((c) => c.poly) : [];
  const p = { id: which, label: which === 'front' ? 'FRONT' : 'BACK', kind: 'half', outline: h.outline, cuts, creases: h.creases, tabs: h.tabs.filter(Boolean), holes: h.holes.filter((o) => o.kind !== 'opening'), labels: [{ text: which === 'front' ? 'FRONT half' : 'BACK half', at: [0, -model.Ri * 0.5], angle: 0 }] };
  if (which === 'back') p.openings = h.holes.filter((o) => o.kind === 'opening');
  p.box = pieceBox(p);
  return p;
}
export function ringPiece(model) {
  const rh = model.opening / 2;
  return { id: 'ring', label: 'RING', kind: 'ring', outline: circlePts(rh + model.ringWidth, 96), cuts: [circlePts(rh, 64)], creases: [], tabs: [], holes: [], labels: [{ text: 'ring — glue inside the back around the opening', at: [0, -(rh + model.ringWidth) - 6], angle: 0 }], box: null, ring: { inner: rh, outer: rh + model.ringWidth } };
}
function circlePts(r, n) { const o = []; for (let i = 0; i < n; i++) o.push([r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]); return o; }

/* the N point modules of one half */
export function modulePieces(model, pattern, state, which, rules) {
  const h = halfOutline(model, which);
  const N = model.N;
  const allCuts = pattern && state.patMode !== 'none' ? placeCuts(model, pattern, state) : [];
  const tabW = model.tab.width, taper = model.tab.taper;
  const rh = which === 'back' ? model.opening / 2 : 0;
  const out = [];
  for (let j = 0; j < N; j++) {
    const left = h.edges.find((e) => e.j === j && e.side === -1).pts;   // valley (j−1) → tip j
    const right = h.edges.find((e) => e.j === j && e.side === 1).pts;   // tip j → valley j
    const vL = left[0], vR = right[right.length - 1];                    // the two inner vertices
    // the apex: a point, or the sector of the opening between the two valley directions
    const gL = Math.atan2(vL[1], vL[0]); let gR = Math.atan2(vR[1], vR[0]); while (gR < gL) gR += 2 * Math.PI;
    const apex = [];
    if (rh > 0) { const n = 12; for (let k = 0; k <= n; k++) { const g = gR + ((gL - gR) * k) / n; apex.push([rh * Math.cos(g), rh * Math.sin(g)]); } } else apex.push([0, 0]);
    // the seam tab on the RIGHT valley: from just past the apex to just short of the vertex, offset across the valley (outward from this module), tapered both ends
    const uR = [vR[0] / Math.hypot(vR[0], vR[1]), vR[1] / Math.hypot(vR[0], vR[1])];
    const nR = [-uR[1], uR[0]];            // across the valley, away from module j (the valley's left side is module j, so the tab goes to +n… checked below)
    const inward = [right[Math.max(0, right.length - 3)][0] - vR[0], right[Math.max(0, right.length - 3)][1] - vR[1]];
    const sgn = inward[0] * nR[0] + inward[1] * nR[1] > 0 ? -1 : 1;    // the tab lies on the side the module is NOT on
    const n2 = [nR[0] * sgn, nR[1] * sgn];
    const rV = Math.hypot(vR[0], vR[1]);
    const r0 = rh + rules.spine * 0.5 + 2, r1 = rV - rules.rimMargin - tabW;   // clear of the opening/apex and of the rim tabs
    let seamTab = null;
    if (r1 - r0 > 3 * taper) {
      const at = (r, w) => [uR[0] * r + n2[0] * w, uR[1] * r + n2[1] * w];
      seamTab = { seam: j, poly: [at(r0, 0), at(r0 + taper, tabW), at(r1 - taper, tabW), at(r1, 0)] };
    }
    const outline = [...apex, ...left, ...right.slice(1)];
    const rimTabs = h.tabs.filter((t) => t && t.j === j);
    const cuts = allCuts.filter((c) => c.j === j).map((c) => c.poly);
    const holes = h.holes.filter((o) => o.kind === 'hang' && j === 0);
    // labels: this module's name on its ridge, and the seam pair names at both valleys
    const g = model.flatTip[j];
    const rMid = (rh + rV) / 2;
    const labels = [
      { text: `${which === 'front' ? 'F' : 'B'}${j + 1}`, at: rot([model.Ri * 0.55, 0], g), angle: g },
      { text: `S${((j + N - 1) % N) + 1}`, at: [vL[0] / rV * rMid, vL[1] / rV * rMid].map((v, i) => v + (i === 0 ? uR[1] * 0 : 0)), angle: gL, side: 'left' },
      { text: `S${j + 1}`, at: [uR[0] * rMid, uR[1] * rMid], angle: gR, side: 'right' },
    ];
    // the label sits a little inside the module from its valley: nudge each toward the ridge
    for (const l of labels) if (l.side) { const d = rot([0, l.side === 'left' ? -1 : 1], l.angle); const inw = rot([rules.foldKeepout + 3, 0], g); l.at = [l.at[0] + (l.side === 'left' ? -d[0] : -d[0]) * (rules.foldKeepout + 3) * 0, l.at[1]]; const toRidge = [rot([rMid, 0], g)[0] - l.at[0], rot([rMid, 0], g)[1] - l.at[1]]; const L = Math.hypot(toRidge[0], toRidge[1]) || 1; l.at = [l.at[0] + (toRidge[0] / L) * (rules.foldKeepout + 4), l.at[1] + (toRidge[1] / L) * (rules.foldKeepout + 4)]; }
    const creases = [{ kind: 'mountain', from: apex.length > 1 ? [rh * Math.cos(g), rh * Math.sin(g)] : [0, 0], to: rot([model.facets[model.alternate ? j % 2 : 0].edge.pts[0][0], 0], g) }];
    const p = { id: `${which}-${j + 1}`, label: `${which === 'front' ? 'F' : 'B'}${j + 1}`, kind: 'module', j, which, outline, cuts, creases, tabs: [...rimTabs, ...(seamTab ? [seamTab] : [])], seamTab, holes, labels };
    p.box = pieceBox(p);
    out.push(p);
  }
  return out;
}

/* ---- the plan: what pieces, and do they fit --------------------------------- */
export function fits(box, bed) { const W = bed.w - 2 * BED_MARGIN_MM, H = bed.h - 2 * BED_MARGIN_MM; return (box.w <= W && box.h <= H) || (box.h <= W && box.w <= H); }
export function exportPlan(model, pattern, state, rules) {
  const bed = bedOf(state), machine = machineOf(state);
  const front = halfPiece(model, pattern, state, 'front'), back = halfPiece(model, pattern, state, 'back');
  const notes = [];
  let pieces, split = false;
  if (fits(front.box, bed) && fits(back.box, bed)) pieces = [front, back];
  else {
    split = true;
    pieces = [...modulePieces(model, pattern, state, 'front', rules), ...modulePieces(model, pattern, state, 'back', rules)];
    notes.push({ kind: 'info', id: 'split', text: `the half (${front.box.w.toFixed(0)} × ${front.box.h.toFixed(0)} mm) is larger than the ${bed.name.split(' — ')[0]} bed, so each half is cut as ${model.N} point modules joined on the valley folds (seam tabs S1–S${model.N}, labelled)` });
  }
  pieces.push(ringPiece(model));
  for (const p of pieces) if (!p.box) p.box = pieceBox(p);
  const tooBig = pieces.filter((p) => !fits(p.box, bed));
  if (tooBig.length) notes.push({ kind: 'bad', id: 'bed', text: `${tooBig.length === pieces.length ? 'every piece' : tooBig.map((p) => p.label).join(', ')} does not fit the bed even as a module (${tooBig[0].box.w.toFixed(0)} × ${tooBig[0].box.h.toFixed(0)} mm against ${bed.w - 2 * BED_MARGIN_MM} × ${bed.h - 2 * BED_MARGIN_MM}) — choose a larger bed or a smaller star` });
  const sheets = nest(pieces, bed);
  return { pieces, sheets, split, bed, machine, notes, fitsBed: !tooBig.length };
}

/* ---- nesting: shelves of rotated bounding boxes ----------------------------- */
/* Each piece is tried at 0°, 90°, 180°, 270° and, for a module, at the turn
   that lays its ridge flat (±its tip azimuth); the orientation with the
   smallest box height goes on the lowest shelf it fits (first-fit decreasing
   by height). Simple, deterministic, and it reports its utilisation. */
export function nest(pieces, bed) {
  const W = bed.w - 2 * BED_MARGIN_MM, H = bed.h - 2 * BED_MARGIN_MM, gap = 4;
  const oriented = pieces.map((p) => {
    const cands = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    if (p.kind === 'module') { const g = Math.atan2(p.outline[Math.floor(p.outline.length / 2)][1], p.outline[Math.floor(p.outline.length / 2)][0]); cands.push(-g, Math.PI - g); }
    let best = null;
    for (const r of cands) { const pts = [...p.outline, ...p.tabs.flatMap((t) => t.poly)].map((q) => rot(q, r)); const b = boxOf(pts); if (b.w > W + 1e-6 || b.h > H + 1e-6) continue; if (!best || b.h < best.b.h - 1e-6 || (Math.abs(b.h - best.b.h) <= 1e-6 && b.w < best.b.w)) best = { r, b }; }
    if (!best) { const pts = [...p.outline, ...p.tabs.flatMap((t) => t.poly)]; best = { r: 0, b: boxOf(pts), unfit: true }; }
    return { piece: p, rot: best.r, b: best.b, unfit: !!best.unfit };
  });
  oriented.sort((a, b) => b.b.h - a.b.h || b.b.w - a.b.w);
  const sheets = [];
  for (const o of oriented) {
    let placed = false;
    for (const sh of sheets) {
      for (const shelf of sh.shelves) { if (shelf.x + o.b.w <= W + 1e-6 && o.b.h <= shelf.h + 1e-6) { sh.items.push({ piece: o.piece, rot: o.rot, x: BED_MARGIN_MM + shelf.x - o.b.x0, y: BED_MARGIN_MM + shelf.y - o.b.y0, box: o.b }); shelf.x += o.b.w + gap; placed = true; break; } }
      if (placed) break;
      const yTop = sh.shelves.length ? sh.shelves[sh.shelves.length - 1].y + sh.shelves[sh.shelves.length - 1].h + gap : 0;
      if (yTop + o.b.h <= H + 1e-6 && o.b.w <= W + 1e-6) { const shelf = { x: 0, y: yTop, h: o.b.h }; sh.shelves.push(shelf); sh.items.push({ piece: o.piece, rot: o.rot, x: BED_MARGIN_MM - o.b.x0, y: BED_MARGIN_MM + yTop - o.b.y0, box: o.b }); shelf.x = o.b.w + gap; placed = true; break; }
    }
    if (!placed) { const sh = { bed, items: [], shelves: [{ x: o.b.w + gap, y: 0, h: o.b.h }] }; sh.items.push({ piece: o.piece, rot: o.rot, x: BED_MARGIN_MM - o.b.x0, y: BED_MARGIN_MM - o.b.y0, box: o.b, unfit: o.unfit }); sheets.push(sh); }
  }
  for (const sh of sheets) { const used = sh.items.reduce((s, it) => s + it.box.w * it.box.h, 0); sh.utilisation = used / (bed.w * bed.h); }
  return sheets;
}

/* ---- the sheet SVG ------------------------------------------------------------ */
/* mm user units, y DOWN on the page (the pieces are y-up, so the writer flips),
   LightBurn-style layers: CUT red, SCORE blue, PERF green, ENGRAVE black (the
   labels). The machine decides the valleys: a laser perforates them 1 mm / 1 mm
   on PERF, a blade scores them on SCORE and leaves PERF empty. */
export function sheetSvg(sheet, k, total, { stamp = 'lantern' } = {}) {
  const { bed } = sheet, machine = sheet.machine || { valley: 'perforated' };
  const cut = [], score = [], perf = [], engrave = [];
  const f3 = (v) => (Math.round(v * 1000) / 1000).toFixed(3);
  for (const it of sheet.items) {
    const P = (q) => { const r = rot(q, it.rot); return `${f3(r[0] + it.x)},${f3(bed.h - (r[1] + it.y))}`; };
    const path = (pts, closed) => `M${pts.map(P).join(' L')}${closed ? ' Z' : ''}`;
    const p = it.piece;
    cut.push(`<path d="${path(p.outline, true)}"/>`);
    for (const t of p.tabs) cut.push(`<path d="${path(t.poly, true)}"/>`);
    for (const c of p.cuts) cut.push(`<path d="${path(c, true)}"/>`);
    for (const o of p.holes) { const c = rot([o.cx, o.cy], it.rot); cut.push(`<circle cx="${f3(c[0] + it.x)}" cy="${f3(bed.h - (c[1] + it.y))}" r="${f3(o.r)}"/>`); }
    for (const o of p.openings || []) { const c = rot([o.cx, o.cy], it.rot); cut.push(`<circle cx="${f3(c[0] + it.x)}" cy="${f3(bed.h - (c[1] + it.y))}" r="${f3(o.r)}"/>`); }
    for (const c of p.creases) {
      if (c.kind === 'mountain') score.push(`<path d="${path([c.from, c.to], false)}"/>`);
      else if (machine.valley === 'perforated') perf.push(`<path d="${perfDashes(c.from, c.to).map((seg) => path(seg, false)).join(' ')}"/>`);
      else score.push(`<path d="${path([c.from, c.to], false)}"/>`);
    }
    for (const l of p.labels) { const c = rot(l.at, it.rot); const deg = -((l.angle || 0) + it.rot) * 180 / Math.PI; engrave.push(`<text x="${f3(c[0] + it.x)}" y="${f3(bed.h - (c[1] + it.y))}" transform="rotate(${deg.toFixed(1)} ${f3(c[0] + it.x)} ${f3(bed.h - (c[1] + it.y))})" font-size="4" text-anchor="middle" font-family="monospace">${l.text}</text>`); }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- ${stamp} — sheet ${k + 1} of ${total}, bed ${bed.name}, mm units. Layers: CUT (red) SCORE (blue, mountain folds${machine.valley === 'scored' ? ' and valley folds' : ''}) PERF (green, valley folds, ${machine.valley === 'perforated' ? `${PERF_CUT_MM} mm cut / ${PERF_GAP_MM} mm gap` : 'empty on a blade cutter'}) ENGRAVE (black, the labels). Cut inner shapes before the outline. -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${bed.w}mm" height="${bed.h}mm" viewBox="0 0 ${bed.w} ${bed.h}">
<g id="ENGRAVE" inkscape:label="ENGRAVE" fill="#000000" stroke="none">${engrave.join('')}</g>
<g id="SCORE" inkscape:label="SCORE" stroke="#0000ff" fill="none" stroke-width="0.2">${score.join('')}</g>
<g id="PERF" inkscape:label="PERF" stroke="#00a000" fill="none" stroke-width="0.2">${perf.join('')}</g>
<g id="CUT" inkscape:label="CUT" stroke="#ff0000" fill="none" stroke-width="0.2">${cut.join('')}</g>
</svg>`;
}
/* a valley as dashes: PERF_CUT_MM of cut, PERF_GAP_MM of paper, centred on the line so both ends are paper */
export function perfDashes(from, to) {
  const dx = to[0] - from[0], dy = to[1] - from[1], L = Math.hypot(dx, dy); if (L < 1e-9) return [];
  const u = [dx / L, dy / L], pitch = PERF_CUT_MM + PERF_GAP_MM, n = Math.floor((L - PERF_GAP_MM) / pitch);
  const start = (L - (n * pitch - PERF_GAP_MM)) / 2, out = [];
  for (let i = 0; i < n; i++) { const s = start + i * pitch; out.push([[from[0] + u[0] * s, from[1] + u[1] * s], [from[0] + u[0] * (s + PERF_CUT_MM), from[1] + u[1] * (s + PERF_CUT_MM)]]); }
  return out;
}
/* the README that rides in the ZIP */
export function readme(model, plan, state, rules) {
  const m = plan.machine;
  return `${model.N}-point paper star lantern — ${model.width.toFixed(0)} mm wide, ${model.depth.toFixed(0)} mm deep (finished)
Stock: ${state.material} (${rules.gsm} gsm, ${rules.t} mm). Machine: ${m.name}. Bed: ${plan.bed.name}.
${plan.sheets.length} sheet(s), ${plan.pieces.length} pieces${plan.split ? ` — the halves are split into ${model.N} point modules each, joined on the valley folds: seam S1 is between F1 and F2, S2 between F2 and F3, and so on; glue the seam tab UNDER the neighbouring module, label to label` : ''}.
Layers: CUT red (cut last), SCORE blue (mountain folds — the ridges${m.valley === 'scored' ? ', and the valleys on a blade cutter' : ''}), PERF green (valley folds, ${PERF_CUT_MM} mm cut / ${PERF_GAP_MM} mm gap), ENGRAVE black (labels).
Rules used (starting values — confirm with test cuts): bridge ${rules.bridge} mm, smallest hole ${rules.minHole} mm, smallest stroke ${rules.minCut} mm, fold keep-out ${rules.foldKeepout} mm, rim margin ${rules.rimMargin} mm, spine ${rules.spine} mm, tab ${rules.tabWidth} mm, kerf ${rules.kerf} mm (not compensated).
Fold every ridge as a mountain and every valley as a valley; glue the front half's rim tabs inside the back half's rim; glue the ring inside the back around the opening. LED light only.
`;
}
