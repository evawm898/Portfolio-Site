/* ===================================================================
   shot-bloom-sepal-discovery.mjs — THE SEPAL DISCOVERY SHEET (Oct 9).
   AN INSTRUMENT, NOT WIRED TO ANY GATE. Read docs/bloom-sepal-discovery.md
   beside it; that doc is what the sheet is evidence for.

     node tools/shot-bloom-sepal-discovery.mjs <out.png> [--json <out.json>]

   Builds every cell in NODE through the shipped `buildBloomInto` (EXPORT
   mode — the object a print receives) and draws it with the deterministic
   software rasteriser (`bloom-soft-render.mjs`), so the same tree gives the
   same bytes: no same-tree pixel control is owed and NO PIXEL DELTA IS
   QUOTED anywhere. Every number in a caption or in the JSON is read off the
   builder's own record (`built.sepals`, the accumulator's triangle count),
   never restated.

   SEPALS ARE TINTED GREEN. Which triangles are the head's sepals is MEASURED,
   not assumed: the same state is built with `sepalCount` 0, and the sepal
   block is the run of triangles from the first position where the two
   streams differ, `built.sepals.tris` long (the builder emits the sepals as
   one contiguous block — "EMITTED LAST so the stream of a bloom without them
   is a prefix", bloom-geometry.js). A raceme's FLORET sepals are inside the
   floret units and are NOT tinted; the caption says so.

   THE ONE PROTOTYPE CELL ("B-TEETH") IS NOT THE SHIPPED GEOMETRY. It builds
   from a PATCHED COPY of bloom-geometry.js written to a temp directory, in
   which `sepalBladeState` stops zeroing `lobeDepth` and hands the sepal the
   leaf's tooth values — what §10 of docs/bloom-sepals-outcome.md costed as
   part 2 (the rim family on a sepal). The patch is anchored on the exact
   text it replaces and the tool REFUSES if the anchor does not match exactly
   once, so a moved line cannot silently render the shipped sepal under the
   prototype's label. Nothing in the repository is modified.
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as G from '../bloom-geometry.js';
import { DEFAULTS } from '../bloom-registry.js';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const OUT = argv.find((a) => !a.startsWith('--')) || 'sepal-discovery.png';
const JSON_OUT = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null;

/* ---------------- the prototype module (B-TEETH) ---------------- */
const ANCHOR = "const s = { ...state, petalTilt: angleDeg, petalTipEnd: 0, fringeCount: 0, lobeDepth: 0, petalInfill: 'NONE' };";
const PATCH = "const s = { ...state, petalTilt: angleDeg, petalTipEnd: 0, fringeCount: 0, petalInfill: 'NONE',"
  + " lobeDepth: Number(state.protoSepalToothDepth || 0), lobeCount: Math.round(Number(state.protoSepalToothCount || 2)),"
  + " lobeCoverage: 1, lobeCrestShape: 2, lobeNotchShape: 2 };";
async function protoModule() {
  const src = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
  const hits = src.split(ANCHOR).length - 1;
  if (hits !== 1) throw new Error(`B-TEETH prototype: the sepalBladeState anchor matched ${hits} times (want exactly 1) — refusing to render a prototype that may be the shipped geometry`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sepal-proto-'));
  const f = path.join(dir, 'bloom-geometry.mjs');
  fs.writeFileSync(f, src.replace(ANCHOR, PATCH));
  return import(pathToFileURL(f).href);
}

/* ---------------- building and measuring one cell ---------------- */
const S = (o) => ({ ...DEFAULTS, ...o });
function build(M, state) {
  const acc = new M.MeshBuilder({ exportMode: true });
  const built = M.buildBloomInto(acc, state);
  return { acc, built, pos: acc.positions };
}
/* the head's sepal block, located by the first differing triangle */
function sepalRange(M, state, b) {
  if (!b.built.sepals) return null;
  const z = build(M, { ...state, sepalCount: 0 });
  const A = b.pos, B = z.pos, n = Math.min(A.length, B.length);
  let first = 0;
  while (first < n && A[first] === B[first]) first++;
  const t0 = Math.floor(first / 9);
  return [t0, t0 + b.built.sepals.tris];
}

/* A view looking UP at the underside takes its key light from below, or the
   whole cell is the shadow side of the sheet — lighting, not geometry. */
const VIEWS = {
  below: { dir: [0.62, -0.48, -0.62], up: [0, 0, 1], light1: [0.4, -0.5, -0.75], light2: [-0.6, 0.3, 0.3] },
  side: { dir: [1, -0.12, 0.04], up: [0, 0, 1] },
  top: { dir: [0, 0, 1], up: [0, 1, 0] },
  above: { dir: [0.5, -0.55, 0.67], up: [0, 0, 1] },
};
/* `headOnly`: frame on the HEAD (every point above HEAD_FRAME_Z) so a 60 mm
   stem does not shrink the subject to a quarter of the cell. The stem is
   still drawn; it simply runs out of frame. */
const HEAD_FRAME_Z = -6;
function camFor(pos, view, zoom = 1, headOnly = false) {
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) { if (headOnly && pos[i + 2] < HEAD_FRAME_Z) continue; for (let k = 0; k < 3; k++) { const v = pos[i + k]; if (v < lo[k]) lo[k] = v; if (v > hi[k]) hi[k] = v; } }
  const centerOverride = null;
  const c = centerOverride || [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  const r = Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 2;
  return { ...VIEWS[view], center: c, halfHeight: (r * 1.02) / zoom, bboxMm: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]] };
}

const CREAM = [214, 206, 190], GREEN = [118, 176, 104];
const CELL = 300, CAP = 40;

/* ---------------- the cells ---------------- */
const STEM = { stemLength: 60 };
const CELLS = [
  { id: 'P1-default', sec: 1, label: 'SHIPPING DEFAULT', view: 'below', state: {}, note: 'sepalCount 0: no sepal whorl is built. From below the head is petals and hub only.' },
  { id: 'P1-five-rim', sec: 1, label: '5 SEPALS, NO STEM', view: 'below', state: { sepalCount: 5 }, note: 'sepalCount 5, every other sepal control at its default: interleaved, size 0.60, angle 0. No stem, so the whorl is AT THE RIM (attachment RIM).' },
  { id: 'P1-five-rim-side', sec: 1, label: 'SAME, SIDE', view: 'side', state: { sepalCount: 5 }, note: 'The same state in profile: the sepals leave the rim flat (angle 0) while the petals leave at the 25 degree tilt.' },
  { id: 'P1-five-stem', sec: 1, head: true, label: '5 SEPALS, STEM 60X6', view: 'below', state: { sepalCount: 5, ...STEM }, note: 'With the shipped 6 mm stem the whorl attaches partway DOWN the hub-to-stem join (sepalHeight 0.75), 0.33 mm under the head.' },
  { id: 'P1-aligned1', sec: 1, label: '8 ALIGNED SIZE 1', view: 'below', state: { sepalCount: 8, sepalScale: 1, sepalPhase: 0 }, note: '8 on 8, aligned, size 1.00: the sepal foot IS the petal foot (the census welds them, declared).' },
  { id: 'P1-reflex', sec: 1, label: 'ANGLE -90 REFLEXED', view: 'side', state: { sepalCount: 8, sepalAngle: -90 }, note: 'Reflexed straight down. Past about -55 the petal builder folds at its own seam (a declared xfail on this row).' },
  { id: 'P1-up', sec: 1, label: 'ANGLE 90 ASKED', view: 'side', state: { sepalCount: 8, sepalAngle: 90 }, note: 'Asked 90; built at the DRAWN contact limit (the last angle clear of the petals). The read-out tells it.' },
  { id: 'P1-cupped', sec: 1, label: 'CUPPED + CURLED UP', view: 'below', state: { sepalCount: 5, sepalCup: 1.2, sepalSpineCurl: 120, sepalAngle: 90 }, note: 'sepalCup 1.2, sepalSpineCurl 120, angle 90 asked (clamped at the drawn limit).' },
  { id: 'P1-40', sec: 1, label: '40 ON 40', view: 'below', state: { sepalCount: 40, petalCount: 40 }, note: 'The count ceiling is the outer whorl\'s petal count; 40 interleaved sepals on 40 petals.' },
  { id: 'P1-raceme', sec: 1, label: 'RACEME: FLORETS TOO', view: 'above', state: { sepalCount: 5, stemLength: 120, inflorescence: 'RACEME' }, note: 'A raceme: every floret is a whole bloom and builds the head\'s sepal whorl too (only the head\'s sepals are tinted).' },
  { id: 'P2-A', sec: 2, head: true, label: 'A: SHIPPED SEPAL', view: 'below', state: { sepalCount: 5, ...STEM }, note: 'Foundation A as it ships: the petal builder on a second ring, the sepal twins at their defaults (the petal\'s own defaults).' },
  { id: 'P2-A-leafy', sec: 2, head: true, label: 'A: LEAF OUTLINE', view: 'below', state: { sepalCount: 5, ...STEM, sepalBaseTaper: G.LEAF_BASE_TAPER, sepalTipTaper: G.LEAF_TIP_TAPER, sepalTipShape: G.LEAF_TIP_SHAPE, sepalCup: G.LEAF_CUP }, note: 'Still foundation A, through shipped sliders only: the sepal twins set to the LEAF\'s own outline constants (base 0.85, tip 1.15, tip shape 1.30, cup 0.35). The leaf outline is reachable today.' },
  { id: 'P2-B-teeth', sec: 2, head: true, proto: true, label: 'PROTO: TOOTHED SEPAL', view: 'below', state: { sepalCount: 5, ...STEM, sepalBaseTaper: G.LEAF_BASE_TAPER, sepalTipTaper: G.LEAF_TIP_TAPER, sepalTipShape: G.LEAF_TIP_SHAPE, sepalCup: G.LEAF_CUP, protoSepalToothDepth: 0.26, protoSepalToothCount: 6 }, note: 'PROTOTYPE, NOT SHIPPED: a patched copy in which sepalBladeState passes a tooth cut (depth 0.26, 6 teeth, coverage 1) instead of zeroing lobeDepth — the rim family part 2 costed in bloom-sepals-outcome.md section 10. The leaf\'s 1 mm tooth-relief FLOOR is NOT applied (it is a leaf cap, not a petal one).' },
  { id: 'P2-C-layers', sec: 2, label: 'C: A 2ND PETAL LAYER', view: 'below', state: { layerCount: 2 }, note: 'For comparison: a second PETAL WHORL (layerCount 2). Petal layers step INWARD and smaller; nothing in the layer system places a whorl outside or below the outer petals. A sepal ring is that whorl.' },
  { id: 'P2-tube', sec: 2, label: 'TUBE ON PETALS', view: 'below', state: { tubeLayer1: 0 }, note: 'The fused-collar mechanism that exists: tubeLayer1 0 fuses the PETAL whorl into a closed ring. It is per petal LAYER; the sepal ring is not a layer and is not wired to it.' },
  { id: 'P3-face-top', sec: 3, label: 'HUB FACE, FROM ABOVE', view: 'top', state: {}, note: 'The shipping default from directly above. The hub face is the bare disc inside the petal roots — the centre\'s region (androecium, gynoecium, the reserved CORONA).' },
  { id: 'P3-face-centre', sec: 3, label: 'FACE WITH A CENTRE', view: 'above', zoom: 2.2, state: { stamenCount: 30, gynoecium: 'STYLE' }, note: 'What already decorates the hub face when asked: 30 stamens and a style, zoomed to the centre.' },
  { id: 'P3-under', sec: 3, head: true, label: 'UNDER THE HEAD, STEM', view: 'below', zoom: 1.6, state: { sepalCount: 5, ...STEM }, note: 'Zoomed under the head: the 5 sepals at sepalHeight 0.75 on the hub-to-stem join. This is the botanical calyx position.' },
];

const META = [];
const M0 = G;
let MP = null;
const cells = [];
for (const cell of CELLS) {
  const M = cell.proto ? (MP ||= await protoModule()) : M0;
  const state = S(cell.state);
  const b = build(M, state);
  const range = sepalRange(M, state, b);
  const cam = camFor(b.pos, cell.view, cell.zoom || 1, !!cell.head);
  const colorOf = range ? (t) => (t >= range[0] && t < range[1] ? GREEN : CREAM) : null;
  const V = VIEWS[cell.view];
  const rgb = render(b.pos, CELL, CELL, cam, { color: CREAM, ...(V.light1 ? { light1: V.light1, light2: V.light2 } : {}), ...(colorOf ? { colorOf } : {}) });
  const s = b.built.sepals;
  const m = {
    id: cell.id, label: cell.label, prototype: !!cell.proto, note: cell.note, set: cell.state,
    exportTris: b.acc.triangleCount,
    sepals: s ? { built: s.count, tris: s.tris, angleAsked: s.limit.askedDeg, angleBuilt: s.limit.angleBuiltDeg, limit: s.limit.limitDeg, attachment: s.attachment.mode, chordDeg: Number(s.undersideChordDeg.toFixed(2)) } : null,
    inflorescence: b.built.inflorescenceBuilt ? { florets: b.built.inflorescenceBuilt.count, unitTris: b.built.inflorescenceBuilt.unitTris } : null,
    bboxMm: cam.bboxMm.map((v) => Number(v.toFixed(1))),
  };
  META.push(m);
  cells.push({ rgb, cell, m });
  console.log(`${cell.id.padEnd(16)} tris ${String(m.exportTris).padStart(7)}  ${s ? `sepals ${s.count} (${s.tris} tris) angle ${s.limit.askedDeg}->${s.limit.angleBuiltDeg} limit ${s.limit.limitDeg} ${s.attachment.mode}` : 'no sepals'}${m.inflorescence ? `  florets ${m.inflorescence.florets}` : ''}`);
}

/* ---------------- the composite ---------------- */
const COLS = 6;
const SEC_H = 22;
const sections = [1, 2, 3];
const rowsOf = (sec) => Math.ceil(cells.filter((c) => c.cell.sec === sec).length / COLS);
const W = COLS * CELL, H = sections.reduce((h, s) => h + SEC_H + rowsOf(s) * (CELL + CAP), 0);
const sheet = Buffer.alloc(W * H * 3, 18);
const TITLES = { 1: '1  WHAT EXISTS ON MAIN (EXPORT MODE, SEPALS GREEN)', 2: '2  FOUNDATIONS: A AS SHIPPED, A WITH THE LEAF OUTLINE, PROTOTYPE TEETH, C, THE TUBE', 3: '3  AROUND THE HUB: THE FACE VS UNDER THE HEAD' };
let y = 0;
for (const sec of sections) {
  text(sheet, W, H, 8, y + 5, TITLES[sec], [240, 220, 160], 2);
  y += SEC_H;
  const mine = cells.filter((c) => c.cell.sec === sec);
  mine.forEach((c, i) => {
    const x = (i % COLS) * CELL, yy = y + Math.floor(i / COLS) * (CELL + CAP);
    blit(sheet, W, H, c.rgb, CELL, CELL, x, yy);
    text(sheet, W, H, x + 6, yy + CELL + 4, c.cell.label, c.cell.proto ? [255, 150, 120] : [250, 250, 248], 2);
    const s = c.m.sepals;
    const sub = s ? `${s.built} SEP ${s.angleBuilt}DEG ${s.attachment} ${c.m.exportTris} TRIS` : `${c.m.exportTris} TRIS`;
    text(sheet, W, H, x + 6, yy + CELL + 22, sub, [180, 180, 175], 1);
  });
  y += rowsOf(sec) * (CELL + CAP);
}
writePng(OUT, W, H, sheet);
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ tool: 'shot-bloom-sepal-discovery.mjs', mode: 'EXPORT', cells: META }, null, 2) + '\n');
console.log(`wrote ${OUT} (${W}x${H})${JSON_OUT ? ` and ${JSON_OUT}` : ''}`);
