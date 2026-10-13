import fs from 'node:fs';
import * as G from './tree/bloom-geometry.js';
import { DEFAULTS } from './tree/bloom-registry.js';
import { render, writePng, text, blit } from '/home/user/Portfolio-Site/tools/bloom-soft-render.mjs';
import { cell as measure } from './measure.mjs';
const WING = { sepalCount: 5, sepalScale: 1, sepalAngle: -10, sepalSpineCurl: 120, sepalCurlBias: 0.9, sepalCurlStart: 0.6, sepalBaseTaper: 3, sepalTipTaper: 4, sepalTipShape: 0.6 };
const OUT = process.argv[2] || 'sepal-own-size.png';
function build(state) { const acc = new G.MeshBuilder({ exportMode: true }); const built = G.buildBloomInto(acc, state); return { acc, built, pos: acc.positions }; }
function sepalRange(state, b) { const z = build({ ...state, sepalCount: 0 }); const A = b.pos, B = z.pos, n = Math.min(A.length, B.length); let f = 0; while (f < n && A[f] === B[f]) f++; const t0 = Math.floor(f / 9); return [t0, t0 + b.built.sepals.tris]; }
const VIEWS = {
  below: { dir: [0.62, -0.48, -0.62], up: [0, 0, 1], light1: [0.4, -0.5, -0.75], light2: [-0.6, 0.3, 0.3] },
  side: { dir: [0.0, -1, 0.0], up: [0, 0, 1], light1: [0.4, -0.5, -0.75], light2: [-0.6, 0.3, 0.3] },
};
function camFor(pos, view, zoom = 1) {
  let lo = [1e9,1e9,1e9], hi = [-1e9,-1e9,-1e9];
  for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { const v = pos[i+k]; if (v < lo[k]) lo[k] = v; if (v > hi[k]) hi[k] = v; }
  const c = [(lo[0]+hi[0])/2, (lo[1]+hi[1])/2, (lo[2]+hi[2])/2];
  const r = Math.hypot(hi[0]-lo[0], hi[1]-lo[1], hi[2]-lo[2]) / 2;
  return { ...VIEWS[view], center: c, halfHeight: (r * 1.02) / zoom };
}
const CREAM = [214, 206, 190], GREEN = [118, 176, 104];
const CELL = 300, CAP = 70;
const mm = (L, W) => ({ sepalLengthMm: L, sepalWidthMm: W, sepalFootBreadth: Math.min(1.5, Math.max(0.25, W / 16)) });
const CELLS = [
  { sec: 1, label: 'TODAY: DEFAULT SIZE 0.60 (21 x 9.6 MM)', state: { sepalScale: 0.6 }, old: true },
  { sec: 1, label: 'TODAY CEILING: SIZE 1.00 (35 x 16 MM)', state: { sepalScale: 1 }, old: true },
  { sec: 1, label: 'TODAY, PETALS FORCED TO 60 x 8 (A9)', state: { sepalScale: 1, petalLength: 60, petalWidth: 8 }, old: true },
  { sec: 1, label: 'OWN SIZE: 60 x 5 MM', state: mm(60, 5) },
  { sec: 1, label: 'OWN SIZE: 90 x 5 MM', state: mm(90, 5) },
  { sec: 1, label: 'OWN SIZE: 120 x 5 MM', state: mm(120, 5) },
  { sec: 2, label: '90 x 3 MM (NARROWEST)', state: mm(90, 3) },
  { sec: 2, label: '90 x 8 MM', state: mm(90, 8) },
  { sec: 2, label: '90 x 16 MM (THE PETAL WIDTH)', state: mm(90, 16) },
  { sec: 2, label: '90 x 5 MM AT ANGLE 0', state: { ...mm(90, 5), sepalAngle: 0 } },
  { sec: 2, label: '90 x 5 MM AT ANGLE -25', state: { ...mm(90, 5), sepalAngle: -25 } },
  { sec: 2, label: '90 x 5 MM, CURL 180 (TIP UP)', state: { ...mm(90, 5), sepalSpineCurl: 180 } },
  { sec: 3, label: '150 x 5 MM (PAST THE PROPOSED CEILING)', state: mm(150, 5), old: true },
  { sec: 3, label: '120 x 5 MM, 8 SEPALS (EVERY PETAL)', state: { ...mm(120, 5), sepalCount: 8 } },
  { sec: 3, label: '120 x 12 MM, ANGLE +15 (AT THE LIMIT)', state: { ...mm(120, 12), sepalAngle: 15 } },
  { sec: 3, label: '120 x 12 MM, ANGLE +40 ASKED (CLAMPED)', state: { ...mm(120, 12), sepalAngle: 40 } },
  { sec: 3, label: '60 x 5 MM ON A 60 MM STEM', state: { ...mm(60, 5), stemLength: 60 } },
  { sec: 3, label: '120 x 5 MM ON A 60 MM STEM', state: { ...mm(120, 5), stemLength: 60 } },
];
const META = [], cells = [];
for (const c of CELLS) {
  const state = { ...DEFAULTS, ...WING, ...c.state };
  const b = build(state); const range = sepalRange(state, b);
  const colorOf = (t) => (t >= range[0] && t < range[1] ? GREEN : CREAM);
  const side = render(b.pos, CELL, CELL, camFor(b.pos, 'side', 1.15), { color: CREAM, light1: VIEWS.side.light1, light2: VIEWS.side.light2, colorOf });
  const below = render(b.pos, CELL, CELL, camFor(b.pos, 'below', 1.15), { color: CREAM, light1: VIEWS.below.light1, light2: VIEWS.below.light2, colorOf });
  const m = measure(c.state, { tag: c.label });
  META.push(m); cells.push({ c, side, below, m });
  console.log(`${c.label.padEnd(44)} asked ${m.asked} built ${m.builtDeg} limit +${m.limit}  gap ${m.self.toFixed(3)}  census ${m.within}  box ${m.maxDim} mm  tris ${m.tris}`);
}
const COLS = 3, SEC_H = 26, CW = CELL * 2;
const SECS = [1, 2, 3];
const TITLES = { 1: '1  THE WING CASE: TODAY (RED CAPTIONS) AGAINST OWN LENGTH AND WIDTH IN MM. PRINT PREVIEW ON (EXPORT). SEPALS GREEN. SIDE | FROM BELOW', 2: '2  WIDTH, ANGLE AND CURL AT 90 MM', 3: '3  THE CEILINGS: PAST THE PROPOSED LENGTH, EVERY PETAL, THE LIMIT, A STEM' };
const rowsOf = (s) => Math.ceil(cells.filter((x) => x.c.sec === s).length / COLS);
const W = COLS * CW, H = SECS.reduce((h, s) => h + SEC_H + rowsOf(s) * (CELL + CAP), 0);
const sheet = Buffer.alloc(W * H * 3, 18);
let y = 0;
for (const sec of SECS) {
  text(sheet, W, H, 8, y + 6, TITLES[sec], [240, 220, 160], 2); y += SEC_H;
  cells.filter((x) => x.c.sec === sec).forEach((x, i) => {
    const px = (i % COLS) * CW, py = y + Math.floor(i / COLS) * (CELL + CAP);
    blit(sheet, W, H, x.side, CELL, CELL, px, py); blit(sheet, W, H, x.below, CELL, CELL, px + CELL, py);
    const m = x.m;
    text(sheet, W, H, px + 6, py + CELL + 4, x.c.label, x.c.old ? [255, 150, 120] : [250, 250, 248], 2);
    text(sheet, W, H, px + 6, py + CELL + 22, `ANGLE ASKED ${m.asked} BUILT ${m.builtDeg}${m.clamped ? ' (CLAMPED)' : ''}  LIMIT +${m.limit}`, m.clamped ? [255, 200, 90] : [180, 180, 175], 1);
    text(sheet, W, H, px + 6, py + CELL + 32, `GAP ${m.self.toFixed(3)} MM ${m.self < G.MIN_FEATURE_MM ? 'UNDER 1.00' : 'CLEARS'}   CENSUS ${m.within} PAIRS${m.within ? ` / ${m.span.toFixed(3)} MM` : ''}`, m.self < 1 || m.within ? [255, 130, 110] : [150, 220, 140], 1);
    text(sheet, W, H, px + 6, py + CELL + 42, `BOX ${m.maxDim} MM   DRAWN ${m.drawnMm} MM   ${m.tris} TRIS EXPORT`, [180, 180, 175], 1);
    text(sheet, W, H, px + 6, py + CELL + 52, `SET ${JSON.stringify(x.c.state).replace(/"/g, '').slice(0, 95)}`, [140, 140, 135], 1);
  });
  y += rowsOf(sec) * (CELL + CAP);
}
writePng(OUT, W, H, sheet);
fs.writeFileSync(OUT.replace(/\.png$/, '.json'), JSON.stringify({ mode: 'EXPORT', wing: WING, cells: META }, null, 2));
console.log('wrote', OUT, W, 'x', H);
