#!/usr/bin/env node
/* frame-flow-trace.mjs <out.png> [--refs <dir>] [--overlay <out.png>] —
   the traced flow of reference R2 (docs/frame-flow-grammar.md §0): the main
   spine lines of the bronze oval's ornament, traced BY EYE in the photograph's
   own pixel coordinates (600 × 800) on its left half and mirrored, each with
   its growth direction (the arrow at its end) and a role.

   Writes the LINE DIAGRAM (the molding as measured, the spines, their arrows,
   the sources, the meeting, the outer envelope) — no photograph in it, so it
   can be committed. With --refs <dir> (a directory holding the reference as
   2.webp) it also lays the same trace over the photograph into --overlay
   (default: <out>-overlay.png beside it), which is NOT committed (a stock
   photograph). Prints each traced element's spine length in band widths M
   (the grammar's §3 table) and the envelope offsets (§4). */

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const OUT = path.resolve(process.argv[2] || 'frame-flow-trace.png');
const refsAt = process.argv.indexOf('--refs'), REFS = refsAt > 0 ? path.resolve(process.argv[refsAt + 1]) : null;
const ovAt = process.argv.indexOf('--overlay'), OVER = ovAt > 0 ? path.resolve(process.argv[ovAt + 1]) : OUT.replace(/\.png$/, '-overlay.png');

// the molding, measured off the photograph's dark runs (grammar §0)
const C = [300, 413], A_OUT = 215, B_OUT = 287, A_IN = 178, B_IN = 250, M = 38;

// the traced spines, LEFT half as seen, in growth order (arrow at the end)
// role: 'crest' / 'bottom' flow, kind: scroll | leaf | stem
export const TRACE = [
  { id: 'crest C', flow: 'crest', kind: 'scroll', pts: [[300, 80], [284, 96], [266, 110], [248, 113], [234, 104], [233, 91], [243, 85], [251, 91], [246, 98]] },
  { id: 'shoulder arch', flow: 'crest', kind: 'scroll', pts: [[244, 140], [246, 130], [238, 121], [222, 119], [202, 125], [182, 136], [166, 150], [158, 165], [164, 177], [177, 179], [182, 170]] },
  { id: 'shoulder fan', flow: 'crest', kind: 'leaf', pts: [[156, 176], [138, 186], [122, 196], [110, 200]] },
  { id: 'bottom C', flow: 'bottom', kind: 'scroll', pts: [[256, 694], [246, 690], [237, 699], [240, 712], [226, 724], [203, 731], [181, 735], [164, 744], [160, 757], [172, 761], [178, 751]] },
  { id: 'foot fan', flow: 'bottom', kind: 'leaf', pts: [[176, 700], [158, 683], [140, 668]] },
  { id: 'lower stem', flow: 'bottom', kind: 'stem', pts: [[132, 655], [116, 622], [98, 590], [80, 562], [60, 540], [46, 536], [42, 547], [50, 554], [57, 547]] },
  { id: 'lower flame', flow: 'bottom', kind: 'leaf', pts: [[64, 522], [57, 475], [50, 428], [43, 380], [36, 340], [30, 318], [35, 306]] },
  { id: 'upper flame', flow: 'bottom', kind: 'leaf', pts: [[112, 336], [100, 304], [82, 280], [62, 265], [46, 259], [41, 270], [49, 276]] },
  { id: 'flank cap', flow: 'bottom', kind: 'scroll', pts: [[92, 262], [104, 240], [118, 220], [131, 213], [134, 223], [126, 226]] },
];
const SOURCES = [{ id: 'crest shell', at: [300, 55], r: 44 }, { id: 'bottom shell', at: [300, 735], r: 30 }];
const MEETING = [116, 204];

const len = (pts) => pts.reduce((a, q, i) => a + (i ? Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) : 0), 0);
// the envelope offset beyond the molding at a point, along the outline's normal (in M)
const offsetOf = ([x, y]) => {
  // nearest point on the outer ellipse, by a fine scan
  let best = Infinity;
  for (let k = 0; k < 2000; k++) { const t = 2 * Math.PI * k / 2000, ex = C[0] + A_OUT * Math.cos(t), ey = C[1] + B_OUT * Math.sin(t); best = Math.min(best, Math.hypot(x - ex, y - ey)); }
  const inside = ((x - C[0]) / A_OUT) ** 2 + ((y - C[1]) / B_OUT) ** 2 < 1;
  return (inside ? -best : best) / M;
};

const rows = TRACE.map((t) => ({ id: t.id, flow: t.flow, kind: t.kind, lenM: len(t.pts) / M, reachM: Math.max(...t.pts.map(offsetOf)) }));
console.log('element                 flow    kind     length (M)   reach beyond the molding (M)');
for (const r of rows) console.log(`${r.id.padEnd(22)}  ${r.flow.padEnd(6)}  ${r.kind.padEnd(6)}  ${r.lenM.toFixed(2).padStart(6)}       ${r.reachM.toFixed(2)}`);
const sorted = rows.map((r) => r.lenM).sort((a, b) => a - b);
let closest = Infinity; for (let i = 1; i < sorted.length; i++) closest = Math.min(closest, sorted[i] / sorted[i - 1] - 1);
console.log(`closest pair of lengths: ${(100 * closest).toFixed(1)} % apart`);
console.log(`crest shell top: ${offsetOf([300, 32]).toFixed(2)} M beyond the molding; feet: ${offsetOf([170, 761]).toFixed(2)} M`);

// ---- the SVG ----
const mirror = (pts) => pts.map(([x, y]) => [600 - x, y]);
const smoothPath = (pts) => {
  // a centripetal-ish Catmull-Rom through the traced points, as cubic segments
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d;
};
const arrowAt = (pts, color) => {
  // the arrow at 60 % along the spine, pointing with the growth
  const L = len(pts), want = 0.55 * L; let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc + l >= want) { const t = (want - acc) / l, x = pts[i - 1][0] + t * (pts[i][0] - pts[i - 1][0]), y = pts[i - 1][1] + t * (pts[i][1] - pts[i - 1][1]), a = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]); const s = 9; return `<path d="M${x + s * Math.cos(a)},${y + s * Math.sin(a)} L${x + s * Math.cos(a + 2.5)},${y + s * Math.sin(a + 2.5)} L${x + s * Math.cos(a - 2.5)},${y + s * Math.sin(a - 2.5)} Z" fill="${color}"/>`; }
    acc += l;
  }
  return '';
};
const COL = { crest: '#B5452B', bottom: '#2E6E8E' };
function svg(withPhoto) {
  const parts = [];
  if (withPhoto) parts.push(`<image href="data:image/webp;base64,${fs.readFileSync(path.join(REFS, '2.webp')).toString('base64')}" x="0" y="0" width="600" height="800" opacity="0.55"/>`);
  else parts.push('<rect width="600" height="800" fill="#EDEDE8"/>');
  // the molding as measured
  parts.push(`<ellipse cx="${C[0]}" cy="${C[1]}" rx="${A_OUT}" ry="${B_OUT}" fill="none" stroke="#0A0A0C" stroke-width="1.5" stroke-dasharray="${withPhoto ? '4 4' : 'none'}"/>`);
  parts.push(`<ellipse cx="${C[0]}" cy="${C[1]}" rx="${A_IN}" ry="${B_IN}" fill="none" stroke="#0A0A0C" stroke-width="1" stroke-dasharray="${withPhoto ? '4 4' : 'none'}"/>`);
  // the envelope (§4): through the outermost traced points, both halves
  const env = [[300, 32], [250, 70], [236, 84], [222, 116], [182, 128], [150, 160], [110, 198], [44, 256], [30, 316], [36, 380], [44, 470], [42, 545], [76, 590], [112, 640], [138, 668], [160, 760], [210, 735], [300, 760]];
  parts.push(`<path d="${smoothPath(env)} ${smoothPath(mirror(env).reverse()).replace(/^M/, 'L')}" fill="none" stroke="#7A7A72" stroke-width="1" stroke-dasharray="2 5"/>`);
  for (const t of TRACE) for (const pts of [t.pts, mirror(t.pts)]) {
    const col = COL[t.flow], w = t.kind === 'leaf' ? 2.2 : t.kind === 'stem' ? 2.6 : 3.2;
    parts.push(`<path d="${smoothPath(pts)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" ${t.kind === 'leaf' ? 'stroke-dasharray="7 3"' : ''}/>`);
    parts.push(arrowAt(pts, col));
  }
  for (const s of SOURCES) parts.push(`<circle cx="${s.at[0]}" cy="${s.at[1]}" r="${s.r}" fill="none" stroke="#0A0A0C" stroke-width="1.2"/><text x="${s.at[0]}" y="${s.at[1] + 4}" font-size="12" text-anchor="middle" font-family="monospace">${s.id}</text>`);
  for (const m of [MEETING, [600 - MEETING[0], MEETING[1]]]) parts.push(`<circle cx="${m[0]}" cy="${m[1]}" r="11" fill="none" stroke="#0A0A0C" stroke-width="2" stroke-dasharray="3 2"/>`);
  parts.push(`<text x="${MEETING[0] - 6}" y="${MEETING[1] - 18}" font-size="12" font-family="monospace" text-anchor="end">meeting</text>`);
  // labels on the left half
  for (const t of TRACE) { const q = t.pts[Math.floor(t.pts.length / 2)]; parts.push(`<text x="${q[0] + 6}" y="${q[1] - 6}" font-size="10" font-family="monospace" fill="${COL[t.flow]}">${t.id}</text>`); }
  parts.push(`<g font-family="monospace" font-size="12"><text x="14" y="22" fill="${COL.crest}">— crest flow (down and out)</text><text x="14" y="40" fill="${COL.bottom}">— bottom flow (up the flank)</text><text x="14" y="58" fill="#0A0A0C">solid: scroll/stem · dashed: leaf · dotted grey: the outer envelope</text><text x="14" y="784" fill="#0A0A0C">R2, traced by eye (600 × 800 px); M = ${M} px band</text></g>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">${parts.join('')}</svg>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 600, height: 800 }, deviceScaleFactor: 1.5 });
for (const [file, photo] of [[OUT, false], ...(REFS ? [[OVER, true]] : [])]) {
  await page.setContent(`<html><body style="margin:0">${svg(photo)}</body></html>`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 600, height: 800 } });
  console.log('wrote', file);
}
await browser.close();
