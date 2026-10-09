/* ===================================================================
   shot-bloom-sepal-rulings.mjs — THE FIVE OLD SEPAL ITEMS, AS A RULINGS
   SHEET (Oct 9). AN INSTRUMENT, NOT WIRED TO ANY GATE. Read §6 of
   docs/bloom-sepal-discovery.md beside it; that section is what the sheet is
   evidence for.

     node tools/shot-bloom-sepal-rulings.mjs <out.png> [--json <out.json>] [--impact]

   The same machinery as tools/shot-bloom-sepal-discovery.mjs (#386): every
   cell is built in NODE through the shipped `buildBloomInto`, in EXPORT mode,
   and drawn with the deterministic soft renderer, so the same tree gives the
   same bytes. NO PIXEL DELTA IS QUOTED. Sepals are tinted GREEN; a tube's
   ring is tinted BLUE. Which triangles are sepals is MEASURED (the run from
   the first triangle that differs from the same state at `sepalCount` 0,
   `built.sepals.tris` long); the ring is what follows the sepal block (the
   tube emits its rings LAST).

   FIVE ITEMS, ONE SECTION EACH, OPTIONS SIDE BY SIDE:
     1  the sepal size default (`sepalScale`)
     2  which measure "hub height" uses (`sepalHeight`'s extent)
     3  the descending fold, and the cupped + curled sepal clamped at -37
     4  how sepals would follow the petals' variance fields
     5  the tube ignoring sepals

   THE PROTOTYPE CELLS ARE NOT THE SHIPPED GEOMETRY, AND THEY SAY SO IN RED.
   Items 2 and 4 have options nothing shipped can build. They build from ONE
   patched copy of bloom-geometry.js written to a temp directory; every patch
   is behind a switch read from the STATE (`protoHubReading`,
   `protoSepalFollow`), so with the switches absent the copy IS main — and
   the tool CHECKS that before it renders anything (the witness: the patched
   module's stream equals the shipped one, float for float, on a stemmed
   sepal state). Each anchor must match exactly once or the tool refuses.
     protoHubReading 'whole'  the extent runs to the head's TOP face (the
                              rejected reading of §12a of the sepals outcome
                              doc); a point that lands inside the head's own
                              thickness goes to the RIM (z 0 — 0.03 mm from
                              the side-face point §12a quotes, said here).
     protoHubReading 'arc'    the same fraction of the underside's ARC LENGTH
                              (the reading §12b reports and does not build).
     protoSepalFollow true    the sepal whorl is handed the petals' own size,
                              form and spacing fields (`buildWhorlInto` already
                              takes all three). THE DRAWN ANGLE LIMIT IS NOT
                              RE-DRAWN for the moved sepals — it still scans
                              the nominal azimuths — which is a statement about
                              this prototype, not a design.

   --impact walks `buildMatrix()` (it imports the harness, which needs
   playwright-core; the sheet itself does not) and counts, from the BUILDER'S
   OWN RECORD on this tree, the live rows each option would move. A count
   from the record is a PREDICTION, not a byte diff; it is printed as one.
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as G from '../bloom-geometry.js';
import { DEFAULTS } from '../bloom-registry.js';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';
import { census } from './bloom-self-intersection.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const JI = argv.indexOf('--json');
const JSON_OUT = JI >= 0 ? argv[JI + 1] : null;
const OUT = argv.find((a, i) => !a.startsWith('--') && !(JI >= 0 && i === JI + 1)) || 'sepal-rulings.png';
const IMPACT = argv.includes('--impact');

/* ---------------- the prototype module ---------------- */
const PATCHES = [
  ['const extentMm = head.z - zStemEnd;',
   "const extentMm = (state.protoHubReading === 'whole' ? head.z + t : head.z) - zStemEnd;"],
  ['const zAttach = zStemEnd + frac * extentMm;',
   "const zAttach = zStemEnd + frac * extentMm;\n  if (state.protoHubReading === 'whole' && zAttach >= head.z) return rim('PROTO whole-body reading: the point lands inside the head\\'s own thickness, so the whorl sits at the rim', { extentMm });"],
  ['const A = solveZ(zAttach);',
   "const A = state.protoHubReading === 'arc' ? (() => { let L = 0; const c = [0]; let pv = stemEnd; for (let i = 1; i <= N; i++) { const p = at(i / N); L += Math.hypot(p.r - pv.r, p.z - pv.z); c.push(L); pv = p; } const w = frac * L; let i = 1; while (i < N && c[i] < w) i++; const f = c[i] === c[i - 1] ? 0 : (w - c[i - 1]) / (c[i] - c[i - 1]); const s = (i - 1 + f) / N; return { s, ...at(s) }; })() : solveZ(zAttach);"],
  ["placement: sepals.placement, fan: null, azimuths: sepals.placement === 'LIST' ? sepals.azimuths : null,",
   "placement: sepals.placement, fan: null, azimuths: sepals.placement === 'LIST' ? sepals.azimuths : null,\n    ...(state.protoSepalFollow ? { sizeField: sizeVarianceField(state, fr), formField: formVarianceField(state, fr), spacingField: sepals.placement === 'LIST' ? null : spacingVarianceField(state, fr) } : {}),"],
];
async function protoModule() {
  let src = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
  for (const [from, to] of PATCHES) {
    const hits = src.split(from).length - 1;
    if (hits !== 1) throw new Error(`prototype: anchor matched ${hits} times (want exactly 1) — refusing to render a prototype that may be the shipped geometry:\n  ${from}`);
    src = src.replace(from, to);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sepal-rulings-'));
  const f = path.join(dir, 'bloom-geometry.mjs');
  fs.writeFileSync(f, src);
  return import(pathToFileURL(f).href);
}

/* ---------------- building and measuring one cell ---------------- */
const S = (o) => ({ ...DEFAULTS, ...o });
function build(M, state, cap = null) {
  const acc = new M.MeshBuilder({ exportMode: true });
  const built = M.buildBloomInto(acc, state, cap ? { capability: cap } : {});
  return { acc, built, pos: acc.positions };
}
function sepalRange(M, state, b, cap) {
  if (!b.built.sepals) return null;
  const z = build(M, { ...state, sepalCount: 0 }, cap);
  const A = b.pos, B = z.pos, n = Math.min(A.length, B.length);
  let first = 0;
  while (first < n && A[first] === B[first]) first++;
  const t0 = Math.floor(first / 9);
  return [t0, t0 + b.built.sepals.tris];
}

const VIEWS = {
  below: { dir: [0.62, -0.48, -0.62], up: [0, 0, 1], light1: [0.4, -0.5, -0.75], light2: [-0.6, 0.3, 0.3] },
  side: { dir: [1, -0.12, 0.04], up: [0, 0, 1] },
  low: { dir: [1, -0.35, -0.22], up: [0, 0, 1], light1: [0.5, -0.4, -0.5], light2: [-0.6, 0.3, 0.4] },
};
const HEAD_FRAME_Z = -6;
function camFor(pos, view, zoom = 1, headOnly = false) {
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) { if (headOnly && pos[i + 2] < HEAD_FRAME_Z) continue; for (let k = 0; k < 3; k++) { const v = pos[i + k]; if (v < lo[k]) lo[k] = v; if (v > hi[k]) hi[k] = v; } }
  const c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  const r = Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 2;
  return { ...VIEWS[view], center: c, halfHeight: (r * 1.02) / zoom };
}
/* a camera framed on the HUB, for the hub-height cells: centred on the axis
   at the attachment, a fixed half-height in mm so the options compare */
function camHub(view, z, halfMm) { return { ...VIEWS[view], center: [0, 0, z], halfHeight: halfMm }; }

const CREAM = [214, 206, 190], GREEN = [118, 176, 104], BLUE = [96, 140, 200];
const CELL = 300, CAP = 48, COLS = 4;

/* ---------------- the cells ---------------- */
const STEM = { stemLength: 60 };
const DEEP = { stemLength: 60, hubStyle: 'GOBLET', hubShapeAmount: 0.5, hubLength: 10 };
const CUPCURL = { sepalCount: 5, sepalCup: 1.2, sepalSpineCurl: 120 };
const CELLS = [
  /* 1 — size */
  { sec: 1, label: 'A  0.40', view: 'below', state: { sepalCount: 5, sepalScale: 0.4 } },
  { sec: 1, label: 'B  0.60 (SHIPPED)', view: 'below', state: { sepalCount: 5 } },
  { sec: 1, label: 'C  0.80', view: 'below', state: { sepalCount: 5, sepalScale: 0.8 } },
  { sec: 1, label: 'D  1.00', view: 'below', state: { sepalCount: 5, sepalScale: 1 } },
  { sec: 1, label: 'A  0.40 SIDE', view: 'side', state: { sepalCount: 5, sepalScale: 0.4 } },
  { sec: 1, label: 'B  0.60 SIDE', view: 'side', state: { sepalCount: 5 } },
  { sec: 1, label: 'C  0.80 SIDE', view: 'side', state: { sepalCount: 5, sepalScale: 0.8 } },
  { sec: 1, label: 'D  1.00 SIDE', view: 'side', state: { sepalCount: 5, sepalScale: 1 } },
  /* 2 — hub height */
  { sec: 2, label: 'A  JOIN (BUILT)', view: 'low', hub: 9, state: { sepalCount: 5, ...STEM } },
  { sec: 2, label: 'B  WHOLE BODY', proto: true, view: 'low', hub: 9, state: { sepalCount: 5, ...STEM, protoHubReading: 'whole' } },
  { sec: 2, label: 'C  ARC LENGTH', proto: true, view: 'low', hub: 9, state: { sepalCount: 5, ...STEM, protoHubReading: 'arc' } },
  { sec: 2, label: 'NO SEPALS, SAME HUB', view: 'low', hub: 9, state: { ...STEM } },
  { sec: 2, label: 'A  DEEP HUB, JOIN', view: 'low', hub: 14, state: { sepalCount: 5, ...DEEP } },
  { sec: 2, label: 'B  DEEP, WHOLE BODY', proto: true, view: 'low', hub: 14, state: { sepalCount: 5, ...DEEP, protoHubReading: 'whole' } },
  { sec: 2, label: 'C  DEEP, ARC LENGTH', proto: true, view: 'low', hub: 14, state: { sepalCount: 5, ...DEEP, protoHubReading: 'arc' } },
  { sec: 2, label: 'NO SEPALS, DEEP HUB', view: 'low', hub: 14, state: { ...DEEP } },
  /* 3 — the fold and the wrap */
  { sec: 3, label: '-60 CLEAN', view: 'side', census: true, state: { sepalCount: 5, sepalAngle: -60 } },
  { sec: 3, label: '-66 LAST CLEAN', view: 'side', census: true, state: { sepalCount: 5, sepalAngle: -66 } },
  { sec: 3, label: '-67 FIRST FOLD', view: 'side', census: true, state: { sepalCount: 5, sepalAngle: -67 } },
  { sec: 3, label: '-90 THE FLOOR', view: 'side', census: true, state: { sepalCount: 5, sepalAngle: -90 } },
  { sec: 3, label: 'CUP+CURL, 90 ASKED', view: 'side', census: true, state: { ...CUPCURL, sepalAngle: 90 } },
  { sec: 3, label: 'SAME, UNCLAMPED 0', view: 'side', census: true, cap: { sepalAngleUnclamped: true }, state: { ...CUPCURL, sepalAngle: 0 } },
  { sec: 3, label: 'SAME, UNCLAMPED 30', view: 'side', census: true, cap: { sepalAngleUnclamped: true }, state: { ...CUPCURL, sepalAngle: 30 } },
  { sec: 3, label: 'SAME, UNCLAMPED 90', view: 'side', census: true, cap: { sepalAngleUnclamped: true }, state: { ...CUPCURL, sepalAngle: 90 } },
  /* 4 — variance */
  { sec: 4, label: 'SIZE 0.5: NOMINAL', view: 'below', state: { sepalCount: 8, varianceSize: 0.5 } },
  { sec: 4, label: 'SIZE 0.5: FOLLOW', proto: true, view: 'below', state: { sepalCount: 8, varianceSize: 0.5, protoSepalFollow: true } },
  { sec: 4, label: 'FORM 1.0: NOMINAL', view: 'below', state: { sepalCount: 8, varianceForm: 1 } },
  { sec: 4, label: 'FORM 1.0: FOLLOW', proto: true, view: 'below', state: { sepalCount: 8, varianceForm: 1, protoSepalFollow: true } },
  { sec: 4, label: 'SPACING 0.9: NOMINAL', view: 'below', state: { sepalCount: 8, varianceSpacing: 0.9 } },
  { sec: 4, label: 'SPACING 0.9: FOLLOW', proto: true, view: 'below', state: { sepalCount: 8, varianceSpacing: 0.9, protoSepalFollow: true } },
  /* 5 — the tube */
  { sec: 5, label: 'NO TUBE, 90 ASKED', view: 'below', state: { sepalCount: 5, sepalAngle: 90 } },
  { sec: 5, label: 'TUBE, 90 ASKED', view: 'below', state: { sepalCount: 5, sepalAngle: 90, tubeLayer1: 0 } },
  { sec: 5, label: 'TUBE, SIDE', view: 'side', state: { sepalCount: 5, sepalAngle: 90, tubeLayer1: 0 } },
  { sec: 5, label: 'TUBE, SEPALS AT 0', view: 'side', state: { sepalCount: 5, tubeLayer1: 0 } },
];

const M0 = G;
const MP = await protoModule();
/* THE WITNESS: with no prototype switch the patched copy IS main. */
{
  const st = S({ sepalCount: 5, ...STEM, varianceSize: 0.5 });
  const a = build(M0, st).pos, b = build(MP, st).pos;
  let diff = a.length === b.length ? 0 : -1;
  if (diff === 0) for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) diff++;
  if (diff !== 0) throw new Error(`prototype witness: with no switch set the patched module differs from main on ${diff} floats — refusing`);
  console.log(`prototype witness: switches off, the patched module equals main on all ${a.length.toLocaleString('en-US')} floats`);
}

const META = [];
const cells = [];
for (const cell of CELLS) {
  const M = cell.proto ? MP : M0;
  const state = S(cell.state);
  const b = build(M, state, cell.cap);
  const range = sepalRange(M, state, b, cell.cap);
  const nt = b.pos.length / 9;
  const ringFrom = range && b.built.tube && b.built.tube.rings && b.built.tube.rings.length ? range[1] : null;
  const colorOf = (t) => (range && t >= range[0] && t < range[1] ? GREEN : ringFrom !== null && t >= ringFrom ? BLUE : CREAM);
  const s = b.built.sepals;
  const A = s ? s.attachment : null;
  const cam = cell.hub ? camHub(cell.view, A && A.mode === 'HUB' ? A.zAttach : -1, cell.hub) : camFor(b.pos, cell.view, cell.view === 'side' ? 1.8 : 1, !!state.stemLength);
  const V = VIEWS[cell.view];
  const rgb = render(b.pos, CELL, CELL, cam, { color: CREAM, ...(V.light1 ? { light1: V.light1, light2: V.light2 } : {}), colorOf });
  const cen = cell.census ? census(b.pos) : null;
  const m = {
    section: cell.sec, label: cell.label, prototype: !!cell.proto, set: cell.state, capability: cell.cap || null,
    exportTris: b.acc.triangleCount,
    sepals: s ? {
      built: s.count, tris: s.tris, angleAsked: s.limit.askedDeg, angleBuilt: s.limit.angleBuiltDeg, limit: s.limit.limitDeg,
      contactDeg: s.limit.contactDeg, contactKind: s.limit.kind,
      attachment: A.mode, why: A.why || null,
      zAttach: A.zAttach !== null && A.zAttach !== undefined ? Number(A.zAttach.toFixed(3)) : null,
      rAttach: A.rAttach !== null && A.rAttach !== undefined ? Number(A.rAttach.toFixed(3)) : null,
      belowHeadMm: Number((A.belowHeadMm || 0).toFixed(3)), extentMm: Number((A.extentMm || 0).toFixed(3)),
      arcDeltaMm: A.arc ? Number(A.arc.deltaMm.toFixed(3)) : null,
    } : null,
    census: cen ? { within: cen.within, worstSpanMm: Number(cen.worstSpanMm.toFixed(4)) } : null,
    ringTris: ringFrom !== null ? nt - ringFrom : null,
  };
  META.push(m);
  cells.push({ rgb, cell, m });
  const sp = m.sepals;
  console.log(`${String(cell.sec)} ${cell.label.padEnd(24)} tris ${String(m.exportTris).padStart(7)}  ${sp ? `angle ${sp.angleAsked}->${sp.angleBuilt} (limit ${sp.limit}) ${sp.attachment}${sp.zAttach !== null ? ` z ${sp.zAttach} r ${sp.rAttach}` : ''}${sp.arcDeltaMm !== null ? ` arcDelta ${sp.arcDeltaMm}` : ''}` : 'no sepals'}${cen ? `  census within ${cen.within} worst ${cen.worstSpanMm.toFixed(4)}` : ''}${m.ringTris ? `  ring ${m.ringTris}` : ''}`);
}

/* ---------------- the composite ---------------- */
const SEC_H = 26;
const sections = [1, 2, 3, 4, 5];
const rowsOf = (sec) => Math.ceil(cells.filter((c) => c.cell.sec === sec).length / COLS);
const W = COLS * CELL, H = sections.reduce((h, s) => h + SEC_H + rowsOf(s) * (CELL + CAP), 0);
const sheet = Buffer.alloc(W * H * 3, 18);
const TITLES = {
  1: '1  SEPAL SIZE (SEPALSCALE) - 5 SEPALS, NO STEM',
  2: '2  WHICH MEASURE HUB HEIGHT USES - 0.75, STEM 60X6 / DEEP GOBLET',
  3: '3  THE DESCENDING FOLD AND THE -37 CLAMP',
  4: '4  SEPALS AND THE PETALS VARIANCE FIELDS (8 ON 8)',
  5: '5  THE TUBE AND THE SEPALS (RING BLUE)',
};
let y = 0;
for (const sec of sections) {
  text(sheet, W, H, 8, y + 6, TITLES[sec], [240, 220, 160], 2);
  y += SEC_H;
  const mine = cells.filter((c) => c.cell.sec === sec);
  mine.forEach((c, i) => {
    const x = (i % COLS) * CELL, yy = y + Math.floor(i / COLS) * (CELL + CAP);
    blit(sheet, W, H, c.rgb, CELL, CELL, x, yy);
    text(sheet, W, H, x + 6, yy + CELL + 4, c.cell.label, c.cell.proto ? [255, 150, 120] : [250, 250, 248], 2);
    const s = c.m.sepals;
    let sub = s ? `${s.built} SEP ${s.angleBuilt}DEG ${s.attachment} ${c.m.exportTris} TRIS` : `${c.m.exportTris} TRIS`;
    if (c.cell.sec === 2 && s) sub = s.attachment === 'HUB' ? `Z ${s.zAttach} R ${s.rAttach} ${s.belowHeadMm}MM UNDER HEAD` : 'AT THE RIM';
    if (c.m.census) sub += ` CENSUS ${c.m.census.within}`;
    text(sheet, W, H, x + 6, yy + CELL + 22, sub, [180, 180, 175], 1);
    if (c.cell.proto) text(sheet, W, H, x + 6, yy + CELL + 34, 'PROTOTYPE - NOT SHIPPED', [255, 150, 120], 1);
  });
  y += rowsOf(sec) * (CELL + CAP);
}
writePng(OUT, W, H, sheet);
console.log(`wrote ${OUT} (${W}x${H})`);

/* ---------------- --impact: rows each option would move ---------------- */
let impact = null;
if (IMPACT) {
  const { buildMatrix } = await import('./bloom-harness.mjs');
  const rows = buildMatrix();
  const coerce = (v) => (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)) ? Number(v) : v);
  const tally = { liveRows: rows.length, sepalRows: 0, scaleUnpinned: 0, hubMode: 0, hubArcMoves: 0, belowFoldOnset: 0, varianceWithSepals: 0, tubeWithSepals: 0 };
  for (const r of rows) {
    const set = Object.fromEntries(r.set.map((s) => [s.id, coerce(s.value)]));
    if (!(Number(set.sepalCount) >= 1)) continue;
    const state = S(set);
    if (G.sepalsAbsent(state)) continue;
    /* ALL MAX and the other declared refusals build millions of triangles;
       the attachment and the tube plan are what the counts need, and both are
       read off a LIVE-mode build, which is what the record serves */
    const acc = new G.MeshBuilder({ exportMode: false });
    let m;
    try { m = G.buildBloomInto(acc, state); } catch (e) { console.log(`  impact: "${r.label}" did not build (${e.message}) — not counted`); continue; }
    if (!m.sepals) continue;
    tally.sepalRows++;
    if (!('sepalScale' in set)) tally.scaleUnpinned++;
    if (m.sepals.attachment.mode === 'HUB') { tally.hubMode++; if (m.sepals.attachment.arc && m.sepals.attachment.arc.deltaMm > 0) tally.hubArcMoves++; }
    if (m.sepals.limit.angleBuiltDeg <= -67) tally.belowFoldOnset++;
    if (Number(set.varianceSize) > 0 || Number(set.varianceForm) > 0 || Number(set.varianceSpacing) > 0) tally.varianceWithSepals++;
    if (m.tube && m.tube.active) tally.tubeWithSepals++;
  }
  impact = tally;
  console.log('impact (live matrix, predicted from the builder record, not a byte diff):', JSON.stringify(tally));
}
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ tool: 'shot-bloom-sepal-rulings.mjs', mode: 'EXPORT', cells: META, impact }, null, 2) + '\n');
