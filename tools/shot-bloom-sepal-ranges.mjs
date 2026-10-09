/* ===================================================================
   shot-bloom-sepal-ranges.mjs — THE SEPAL RANGES SHEET (Eva's §9 rulings,
   Oct 9). AN INSTRUMENT, NOT WIRED TO ANY GATE. Read
   docs/bloom-sepal-discovery.md §10 beside it.

     node tools/shot-bloom-sepal-ranges.mjs <out.png> [--json <out.json>]

   The #386 sheet's machinery: every cell built in NODE through the shipped
   `buildBloomInto` in EXPORT mode and drawn by the deterministic software
   rasteriser (`bloom-soft-render.mjs`) — the same tree gives the same bytes,
   so NO PIXEL DELTA IS QUOTED and none is owed. Sepals are tinted GREEN (the
   block located by building the same state with `sepalCount` 0). Every number
   on a caption is MEASURED on that cell: the gap is `sepal-self` (the wall
   instrument's `measureWall(grid).self`, through `tools/bloom-sepal-ranges.mjs`)
   and the census is the self-intersection census's within-shell pairs.

   THE GEOMETRY DOES NOT CLAMP, so a cell can build a sepal roll past the new
   bound (the OLD-MAX cells, and option (c) of the load question) through the
   shipped builder with no patch: the bound lives on the control.

   SECTIONS
     1  the narrowed control at its old end against its new end, both sides,
        and one step past the new max
     2  the all-max state (KEPT DECLARED, Eva's ruling): as it stood, as it
        stands, and the three costed cuts NOT TAKEN
     3  the open question — a saved sepal roll of 330 loading under each of
        (a) clamp silently, (b) clamp and tell, (c) build as saved; (a) and
        (b) are the SAME geometry and differ only by the read-out line
   =================================================================== */
import fs from 'node:fs';
import * as G from '../bloom-geometry.js';
import { DEFAULTS, CONTROLS } from '../bloom-registry.js';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';
import { sepalSelf } from './bloom-sepal-ranges.mjs';

const argv = process.argv.slice(2);
const OUT = argv.find((a) => !a.startsWith('--')) || 'sepal-ranges.png';
const JSON_OUT = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null;
const ROLL = CONTROLS.find((c) => c.id === 'sepalRoll');
const PETAL_ROLL = CONTROLS.find((c) => c.id === 'petalRoll');
const BAR = G.MIN_FEATURE_MM;

const S = (o) => ({ ...DEFAULTS, sepalCount: 5, ...o });
function build(state) {
  const acc = new G.MeshBuilder({ exportMode: true });
  const built = G.buildBloomInto(acc, state);
  return { acc, built, pos: acc.positions };
}
function sepalRange(state, b) {
  const z = build({ ...state, sepalCount: 0 });
  const A = b.pos, B = z.pos, n = Math.min(A.length, B.length);
  let first = 0;
  while (first < n && A[first] === B[first]) first++;
  const t0 = Math.floor(first / 9);
  return [t0, t0 + b.built.sepals.tris];
}
const VIEWS = {
  below: { dir: [0.62, -0.48, -0.62], up: [0, 0, 1], light1: [0.4, -0.5, -0.75], light2: [-0.6, 0.3, 0.3] },
  edge: { dir: [0.15, -0.95, -0.28], up: [0, 0, 1], light1: [0.4, -0.5, -0.75], light2: [-0.6, 0.3, 0.3] },
};
function camFor(pos, view, zoom = 1) {
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { const v = pos[i + k]; if (v < lo[k]) lo[k] = v; if (v > hi[k]) hi[k] = v; }
  const c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  const r = Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 2;
  return { ...VIEWS[view], center: c, halfHeight: (r * 1.02) / zoom };
}
const CREAM = [214, 206, 190], GREEN = [118, 176, 104];
const CELL = 300, CAP = 58;

const all = (roll) => ({ sepalCup: 1.2, sepalCupGradient: 1.2, sepalRoll: roll, sepalSpineCurl: 360, sepalTwist: 180 });
const CELLS = [
  { sec: 1, id: 'roll-old-max', label: `ROLL ${PETAL_ROLL.max}: OLD MAX`, state: { sepalRoll: PETAL_ROLL.max }, old: true },
  { sec: 1, id: 'roll-new-max', label: `ROLL ${ROLL.max}: NEW MAX`, state: { sepalRoll: ROLL.max } },
  { sec: 1, id: 'roll-past', label: `ROLL ${ROLL.max + ROLL.step}: ONE STEP PAST`, state: { sepalRoll: ROLL.max + ROLL.step }, old: true },
  { sec: 1, id: 'roll-old-min', label: `ROLL ${PETAL_ROLL.min}: OLD MIN`, state: { sepalRoll: PETAL_ROLL.min }, old: true },
  { sec: 1, id: 'roll-new-min', label: `ROLL ${ROLL.min}: NEW MIN`, state: { sepalRoll: ROLL.min } },
  { sec: 1, id: 'roll-zero', label: 'ROLL 0: THE DEFAULT', state: {} },
  { sec: 4, id: 'm-old-max', macro: true, label: `ROLL ${PETAL_ROLL.max} (OLD MAX)`, state: { sepalRoll: PETAL_ROLL.max }, old: true },
  { sec: 4, id: 'm-new-max', macro: true, label: `ROLL ${ROLL.max} (NEW MAX)`, state: { sepalRoll: ROLL.max } },
  { sec: 4, id: 'm-mid', macro: true, label: 'ROLL 90', state: { sepalRoll: 90 } },
  { sec: 4, id: 'm-old-min', macro: true, label: `ROLL ${PETAL_ROLL.min} (OLD MIN)`, state: { sepalRoll: PETAL_ROLL.min }, old: true },
  { sec: 4, id: 'm-new-min', macro: true, label: `ROLL ${ROLL.min} (NEW MIN)`, state: { sepalRoll: ROLL.min } },
  { sec: 4, id: 'm-zero', macro: true, label: 'ROLL 0', state: {} },
  { sec: 2, id: 'allmax-old', label: `ALL MAX, ROLL ${PETAL_ROLL.max} (WAS)`, state: all(PETAL_ROLL.max), old: true },
  { sec: 2, id: 'allmax-now', label: `ALL MAX, ROLL ${ROLL.max} (NOW)`, state: all(ROLL.max) },
  { sec: 2, id: 'opt-B', label: 'B: 3 CUT (NOT TAKEN)', state: { sepalCup: 1.2, sepalCupGradient: 1.2, sepalRoll: 25, sepalSpineCurl: 55, sepalTwist: 25 }, sub: 'ROLL 25 CURL 55 TWIST 25' },
  { sec: 2, id: 'opt-C', label: 'C: 4 CUT (NOT TAKEN)', state: { sepalCup: 0.28, sepalCupGradient: 1.2, sepalRoll: 40, sepalSpineCurl: 85, sepalTwist: 40 }, sub: 'CUP .28 ROLL 40 CURL 85 TW 40' },
  { sec: 2, id: 'opt-D', label: 'D: 5 CUT (NOT TAKEN)', state: { sepalCup: 0.32, sepalCupGradient: 0.32, sepalRoll: 45, sepalSpineCurl: 95, sepalTwist: 45 }, sub: 'CUP/GRAD .32 ROLL 45 CURL 95 TW 45' },
  { sec: 3, id: 'load-a', label: '(A) CLAMP SILENTLY', state: { sepalRoll: ROLL.max }, sub: `SAVED 330, BUILT ${ROLL.max}, NOTHING SAID` },
  { sec: 3, id: 'load-b', label: '(B) CLAMP AND TELL', state: { sepalRoll: ROLL.max }, sub: `SAVED 330, BUILT ${ROLL.max}`, told: `SEPAL ROLL CLAMPED: ASKED 330, BUILT ${ROLL.max}` },
  { sec: 3, id: 'load-c', label: '(C) BUILD AS SAVED', state: { sepalRoll: 330 }, old: true, sub: 'SAVED 330, BUILT 330 (PAST THE CONTROL)' },
];

const META = [], cells = [];
for (const cell of CELLS) {
  const state = S(cell.state);
  const b = build(state);
  const range = sepalRange(state, b);
  let rgb;
  if (cell.macro) {
    /* ONE SEPAL ALONE (the first of the whorl's equal blocks), seen END-ON from
       its tip a little from below, so the cross-section the roll makes is the
       picture. Only that sepal's triangles are drawn. */
    const per = (range[1] - range[0]) / b.built.sepals.count;
    const sub = b.pos.slice(range[0] * 9, (range[0] + per) * 9);
    let cx = 0, cy = 0; for (let i = 0; i < sub.length; i += 3) { cx += sub[i]; cy += sub[i + 1]; }
    const n = sub.length / 3, ax = cx / n, ay = cy / n, L = Math.hypot(ax, ay);
    const dir = [ax / L, ay / L, -0.08];
    const cam = { dir, up: [0, 0, 1], light1: [ax / L * 0.7, ay / L * 0.7, 0.5], light2: [-0.6, 0.3, 0.3], ...(() => { const c = camFor(sub, 'below', 1); return { center: c.center, halfHeight: c.halfHeight * 0.32 }; })() };
    rgb = render(sub, CELL, CELL, cam, { color: GREEN, light1: cam.light1, light2: cam.light2 });
  } else {
    const cam = camFor(b.pos, 'below', 1.25);
    rgb = render(b.pos, CELL, CELL, cam, { color: CREAM, light1: VIEWS.below.light1, light2: VIEWS.below.light2, colorOf: (t) => (t >= range[0] && t < range[1] ? GREEN : CREAM) });
  }
  const m = sepalSelf(cell.state, { withCensus: true });
  const meta = { id: cell.id, label: cell.label, set: cell.state, gapMm: Number(m.self.toFixed(4)), censusPairs: m.within, censusSpanMm: Number(m.worstSpanMm.toFixed(4)), exportTris: b.acc.triangleCount, angleBuilt: b.built.sepals.limit.angleBuiltDeg, told: cell.told || null };
  META.push(meta); cells.push({ rgb, cell, meta });
  console.log(`${cell.id.padEnd(14)} gap ${meta.gapMm.toFixed(4)} mm${m.self < BAR ? ' UNDER' : '      '}  census ${String(m.within).padStart(5)} / ${meta.censusSpanMm.toFixed(4)} mm  ${meta.exportTris} tris`);
}

const COLS = 6, SEC_H = 24;
const rowsOf = (sec) => Math.ceil(cells.filter((c) => c.cell.sec === sec).length / COLS);
const SECS = [1, 4, 2, 3];
const W = COLS * CELL, H = SECS.reduce((h, s) => h + SEC_H + rowsOf(s) * (CELL + CAP), 0);
const sheet = Buffer.alloc(W * H * 3, 18);
const TITLES = {
  1: `1  SEPAL ROLL ${PETAL_ROLL.min}..${PETAL_ROLL.max} BECOMES ${ROLL.min}..${ROLL.max}: LOOK LOST: THE CLOSED QUILL`,
  4: '1B ONE SEPAL END-ON FROM ITS TIP: AT 330 THE MARGINS CLOSE INTO A RING (AND FOLD), AT 180 THEY STOP OPEN',
  2: '2  ALL FORM AT MAX: KEPT DECLARED. B C D ARE THE CUTS THAT WOULD CLEAR IT, NOT TAKEN',
  3: '3  OPEN: A SAVED SEPAL ROLL OF 330 LOADS AS (A) (B) OR (C)',
};
let y = 0;
for (const sec of SECS) {
  text(sheet, W, H, 8, y + 6, TITLES[sec], [240, 220, 160], 2);
  y += SEC_H;
  cells.filter((c) => c.cell.sec === sec).forEach((c, i) => {
    const x = (i % COLS) * CELL, yy = y + Math.floor(i / COLS) * (CELL + CAP);
    blit(sheet, W, H, c.rgb, CELL, CELL, x, yy);
    if (c.cell.told) text(sheet, W, H, x + 6, yy + 6, c.cell.told, [255, 200, 90], 1);
    text(sheet, W, H, x + 6, yy + CELL + 4, c.cell.label, c.cell.old ? [255, 150, 120] : [250, 250, 248], 2);
    const g = c.meta.gapMm, under = g < BAR;
    text(sheet, W, H, x + 6, yy + CELL + 22, `GAP ${g.toFixed(3)} MM ${under ? 'UNDER 1.00' : 'CLEARS'}`, under ? [255, 130, 110] : [150, 220, 140], 1);
    text(sheet, W, H, x + 6, yy + CELL + 32, `CENSUS ${c.meta.censusPairs} PAIRS${c.meta.censusPairs ? ` / ${c.meta.censusSpanMm.toFixed(3)} MM` : ''}`, c.meta.censusPairs ? [255, 130, 110] : [150, 220, 140], 1);
    if (c.cell.sub) text(sheet, W, H, x + 6, yy + CELL + 42, c.cell.sub, [180, 180, 175], 1);
  });
  y += rowsOf(sec) * (CELL + CAP);
}
writePng(OUT, W, H, sheet);
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ tool: 'shot-bloom-sepal-ranges.mjs', mode: 'EXPORT', bound: [ROLL.min, ROLL.max], cells: META }, null, 2) + '\n');
console.log(`wrote ${OUT} (${W}x${H})${JSON_OUT ? ` and ${JSON_OUT}` : ''}`);
