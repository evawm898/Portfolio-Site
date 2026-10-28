/* ===================================================================
   shot-bloom-texture-bone.mjs — THE BONE SHEET (Oct 28; read
   docs/bloom-surface-texture-bone-outcome.md).

     node tools/shot-bloom-texture-bone.mjs <out.png> [--json <file>] [--quick]

   Every cell is a Node build of the SHIPPED geometry in EXPORT mode (the
   object), drawn by `bloom-soft-render.mjs` — deterministic, so no pixel
   figure is quoted and none is owed — at a raking light, with the numbers
   read off the build's own records in every caption:
     1  BONE on a petal at raking light, beside two PLACEHOLDER panels for the
        reference photographs (a bird skull, a small green ceramic figure),
        which are not in this repository — hold them beside the sheet
     2  the masks alone and blended: the curvature mask, the patch mask, the
        visibility weight x both, and the relief they give (`boneMaskOut`, a
        sheet-only capability no control reaches)
     3  the bead and the 0.40 mm nib, close
     4  the hub's top and its underside, coloured by its weight (covered or
        buried 0, open 1) — the petal and sepal feet's coverage
     5  two florets of one umbel, side by side: one world layer, two reliefs
     6  the rods at the default (smooth by the mask) and at the curvature
        maximum (relieved), and the braid
     7  the budget table: BONE against the retired PEBBLE, the edge in force
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const { render, writePng, text, blit } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-soft-render.mjs')).href);
const OUT = process.argv[2];
if (!OUT) { console.error('usage: shot-bloom-texture-bone.mjs <out.png> [--json <file>] [--quick]'); process.exit(2); }
const JSON_OUT = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null;
const QUICK = process.argv.includes('--quick');

const RAKE = { light1: [0.95, -0.15, 0.25], light2: [-0.3, 0.4, 0.3] };
const bone = (extra = {}) => ({ ...DEFAULTS, petalTexture: 'BONE', ...extra });
function build(state, cap = null) {
  const acc = new G.MeshBuilder({ exportMode: true, captureNormals: true });
  const t0 = Date.now();
  const rec = G.buildBloomInto(acc, state, { below: null, capability: cap, scopes: null });
  return { acc, rec, ms: Date.now() - t0, pos: acc.positions.slice(0, acc.triangleCount * 9), nrm: acc.normals ? acc.normals.slice(0, acc.triangleCount * 9) : null };
}
/* The budget rows need only the count and the record: no normals, no copy of the
   positions — a 1.4 M-triangle build copied twice is what ran the 2 GB heap out. */
function count(state) {
  const acc = new G.MeshBuilder({ exportMode: true });
  const rec = G.buildBloomInto(acc, state, { below: null, capability: null, scopes: null });
  return { acc: { triangleCount: acc.triangleCount }, rec: { texture: rec.texture && { edgeMm: rec.texture.edgeMm, edgeCap: rec.texture.edgeCap && { fits: rec.texture.edgeCap.fits } } } };
}
const W = 420, Hc = 420, CAP = 44;
function cell(B, cam, caption, opts = {}) {
  const img = render(B.pos, W, Hc, cam, { ...RAKE, supersample: 2, normals: opts.flat ? null : B.nrm, ...opts });
  return { img, caption };
}
function boundsOf(pos, from = 0, to = pos.length / 9) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = from * 9; i < to * 9; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], pos[i + k]); hi[k] = Math.max(hi[k], pos[i + k]); }
  return { lo, hi, c: lo.map((x, k) => (x + hi[k]) / 2), r: Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 2 };
}
const lerp = (a, b, t) => a.map((x, k) => Math.round(x + (b[k] - x) * t));
const ramp = (t) => (t <= 0 ? [40, 70, 150] : t >= 1 ? [230, 150, 70] : lerp([40, 70, 150], [230, 150, 70], t));
const numbers = {};
const cells = [];

/* 1 — BONE on a petal, raking light, beside the reference placeholders */
const D = build(bone());
const P = D.rec.texture.organs.petal.bone, Bd = D.rec.texture.bone;
numbers.default = { tris: D.acc.triangleCount, ms: D.ms, petalRaised: P.displaced, petalVertices: P.vertices, ridges: P.ridges, patchOff: P.patchOff, poreFloor: P.poreFloor, reliefMaxMm: D.rec.texture.organs.petal.reliefMaxMm, pore: Bd.poreMm, crater: Bd.largePoreMm, fadeMm: Bd.fadeMm };
const petalCam = { center: [21, 0, 7.5], dir: [0.05, -0.32, 0.95], up: [1, 0, 0], halfHeight: 11 };
cells.push(cell(D, petalCam, [`BONE on the default petal, raking light (EXPORT)`, `${P.displaced} of ${P.vertices} petal vertices raised, up to ${numbers.default.reliefMaxMm.toFixed(3)} mm;`, `pores ${Bd.poreMm.toFixed(2)} / ${Bd.largePoreMm.toFixed(2)} mm, ${D.acc.triangleCount.toLocaleString('en-US')} tris`]));
const placeholder = (what) => { const img = Buffer.alloc(W * Hc * 3, 46); text(img, W, Hc, 18, 170, 'REFERENCE PHOTOGRAPH', [210, 210, 200], 2); text(img, W, Hc, 18, 196, what, [210, 210, 200], 2); text(img, W, Hc, 18, 232, 'NOT IN THE REPOSITORY', [230, 150, 70], 2); text(img, W, Hc, 18, 256, 'hold the crop beside this cell', [170, 170, 160], 2); return { img, caption: ['Eva\'s reference (attached to the brief,', 'not committed): crop it here by hand'] }; };
cells.push(placeholder('a bird skull'));
cells.push(placeholder('a small green ceramic figure'));

/* 2 — the masks */
const MO = new Float32Array(D.acc.triangleCount * 3 * 4 + 8);
build(bone(), { boneMaskOut: MO });
const triAvg = (k) => (t) => (MO[(t * 3) * 4 + k] + MO[(t * 3 + 1) * 4 + k] + MO[(t * 3 + 2) * 4 + k]) / 3;
const maskCell = (k, cap) => cell(D, petalCam, cap, { colorOf: (t) => ramp(triAvg(k)(t)), normals: null, light1: [0, 0, 1], light2: [0, 0, 1] });
let ridgeFrac = 0, patchFrac = 0, nT = 0;
for (let t = 0; t < D.acc.triangleCount; t++) { if (MO[t * 12 + 2] > 0) { nT++; if (triAvg(0)(t) < 0.5) ridgeFrac++; if (triAvg(1)(t) < 0.5) patchFrac++; } }
numbers.masks = { trianglesWeighted: nT, underHalfCurvature: ridgeFrac, underHalfPatch: patchFrac };
cells.push(maskCell(0, ['THE CURVATURE MASK alone (blue 0 .. amber 1)', `smooth on ridges: ${P.ridges} petal ridge vertices`, `(beads and rims curve past ${Bd.curvature}/mm), faded over ${Bd.fadeMm.toFixed(2)} mm`]));
cells.push(maskCell(1, ['THE PATCH MASK alone', `${(Bd.coverage * 100).toFixed(0)}% of the surface in patches, scale ${Bd.patchScaleMm.toFixed(1)} mm`, `${P.patchOff} petal vertices outside every patch`]));
cells.push(cell(D, petalCam, ['BLENDED: visibility x curvature x patch', `x the network (amber = raised); ${P.poreFloor} vertices on a pore floor`, 'sit exactly on the sheet'], { colorOf: (t) => ramp(triAvg(3)(t)), normals: null, light1: [0, 0, 1], light2: [0, 0, 1] }));

/* 3 — the bead and the nib, close: the apex of petal 0 */
let apex = null, best = -Infinity;
const pr = D.rec.petalsAll && D.rec.petalsAll[0] && D.rec.petalsAll[0].triRange;
for (let i = (pr ? pr[0] : 0) * 9; i < (pr ? pr[1] : D.acc.triangleCount) * 9; i += 3) { const r = Math.hypot(D.pos[i], D.pos[i + 1]); if (r > best) { best = r; apex = [D.pos[i], D.pos[i + 1], D.pos[i + 2]]; } }
const OFF = build(bone(), { organReliefOff: true });
let nibMax = 0, nibN = 0, nibRaised = 0;
for (let i = 0; i < D.acc.triangleCount * 9; i += 3) {
  const d = Math.hypot(OFF.pos[i] - apex[0], OFF.pos[i + 1] - apex[1], OFF.pos[i + 2] - apex[2]);
  if (d > 1.2) continue;
  nibN++;
  const m = Math.hypot(D.pos[i] - OFF.pos[i], D.pos[i + 1] - OFF.pos[i + 1], D.pos[i + 2] - OFF.pos[i + 2]);
  if (m > 1e-9) nibRaised++;
  if (m > nibMax) nibMax = m;
}
numbers.nib = { cornersWithin1_2mm: nibN, raised: nibRaised, maxMm: nibMax };
cells.push(cell(D, { center: apex, dir: [0.1, -0.35, 0.93], up: [1, 0, 0], halfHeight: 2.2 }, ['THE BEAD AND THE 0.40 mm NIB, close', `${nibRaised} of ${nibN} corners within 1.2 mm of the apex raised,`, `the most by ${nibMax.toFixed(4)} mm (the mask decides; no bead mask)`]));

/* 4 — the hub, top and underside, by weight */
const S = build(bone({ stemLength: 60, sepalCount: 8, sepalHeight: 1 }));
const MS = new Float32Array(S.acc.triangleCount * 12 + 8);
build(bone({ stemLength: 60, sepalCount: 8, sepalHeight: 1 }), { boneMaskOut: MS });
const hub = S.rec.texture.organs.hub;
const hr = hub.organ.triRanges[0];
const hubOnly = (t) => t >= hr[0] && t < hr[1];
const wOf = (t) => (MS[t * 12 + 2] + MS[t * 12 + 6] + MS[t * 12 + 10]) / 3;
const hubPos = S.pos.slice(hr[0] * 9, hr[1] * 9);
const hb = boundsOf(S.pos, hr[0], hr[1]);
numbers.hub = { vertices: hub.bone.vertices, covered: hub.bone.covered, coveredUnder: hub.bone.coveredUnder, buried: hub.bone.buried, raised: hub.bone.displaced };
const hubCell = (dir, cap) => ({ img: render(hubPos, W, Hc, { center: hb.c, dir, up: [1, 0, 0], halfHeight: hb.r * 1.15 }, { supersample: 2, light1: [0, 0, 1], light2: [0, 0, -1], colorOf: (t) => ramp(wOf(t + hr[0])) }), caption: cap });
cells.push(hubCell([0, 0, 1], ['THE HUB FROM ABOVE, by its weight', `(blue: covered by a petal or sepal foot, or buried)`, `${hub.bone.covered} covered, ${hub.bone.buried} buried, ${hub.bone.displaced} raised`]));
cells.push(hubCell([0, 0, -1], ['THE HUB FROM BELOW (8 sepals at the join\'s top)', `${hub.bone.coveredUnder} covered vertices face DOWN —`, 'the underside under a foot stays smooth']));

/* 5 — two florets of one umbel */
const U = build(bone({ inflorescence: 'UMBEL', umbelHead: 'ON', stemLength: 60 }));
const placed = U.rec.inflorescenceBuilt.placed;
const fl = [placed[0], placed[1]].map((q) => [q.M[3], q.M[7], q.M[11]]);
const fp = U.rec.texture.organs['floret petal'];
const sigs = fp.bone.sigs.filter((g) => g.relieved > 0);
numbers.florets = { placed: placed.length, copies: fp.bone.sigs.length, distinctDigests: new Set(sigs.map((g) => `${g.vertices}|${g.relieved}|${g.sum}`)).size, raisedPerCopy: sigs.map((g) => g.relieved) };
const mid = fl[0].map((x, k) => (x + fl[1][k]) / 2), span = Math.hypot(fl[0][0] - fl[1][0], fl[0][1] - fl[1][1], fl[0][2] - fl[1][2]);
cells.push(cell(U, { center: mid, dir: [0.2, -0.3, 0.93], up: [0, 1, 0], halfHeight: span * 0.95 }, ['TWO FLORETS OF ONE UMBEL (one unit, one world layer)', `${numbers.florets.distinctDigests} distinct reliefs over ${sigs.length} floret petals;`, `raised ${sigs.slice(0, 2).map((g) => g.relieved).join(' and ')} vertices on the first two`]));

/* 6 — the rods */
const Rd = build(bone({ stamenCount: 12, gynoecium: 'STYLE' }));
const Rm = build(bone({ stamenCount: 12, gynoecium: 'STYLE', boneCurvature: 4 }));
const Br = build(bone({ stamenCount: 6, stamenCoil: 'BRAIDED', gynoecium: 'STYLE', boneCurvature: 4 }));
const rodsCam = { center: [0, 0, 14], dir: [0.9, -0.3, 0.3], up: [0, 0, 1], halfHeight: 16 };
numbers.rods = {
  defaultSmooth: Rd.rec.texture.bone.smoothRods.length, defaultKappaMin: Math.min(...Rd.rec.texture.bone.smoothRods.map((r) => r.kappaMin)),
  maxRaised: Rm.rec.texture.organs.stamen ? Rm.rec.texture.organs.stamen.bone.displaced : 0, maxTris: Rm.acc.triangleCount, defaultTris: Rd.acc.triangleCount,
  braidRaised: Br.rec.texture.organs.stamen ? Br.rec.texture.organs.stamen.bone.displaced : 0, braidTris: Br.acc.triangleCount,
};
cells.push(cell(Rd, rodsCam, ['12 STAMENS AND THE STYLE at the default', `${numbers.rods.defaultSmooth} rods SMOOTH: every vertex curves past 1/mm`, `(tightest ${numbers.rods.defaultKappaMin.toFixed(2)}/mm — the 0.6 mm rod and 0.96 mm anther)`]));
cells.push(cell(Rm, rodsCam, ['the same at boneCurvature 4 (the maximum)', `the rods latticed and relieved: ${numbers.rods.maxRaised} stamen vertices raised`, `${Rd.acc.triangleCount.toLocaleString('en-US')} -> ${Rm.acc.triangleCount.toLocaleString('en-US')} tris`]));
cells.push(cell(Br, rodsCam, ['THE BRAID (6 strands) at boneCurvature 4', `${numbers.rods.braidRaised} strand vertices raised`, `${Br.acc.triangleCount.toLocaleString('en-US')} tris`]));

/* 7 — the budget table */
const BUDGET = [
  ['the default', {}], ['a 60 mm stem', { stemLength: 60 }], ['8 sepals x stem', { stemLength: 60, sepalCount: 8 }],
  ['12 stamens + style', { stamenCount: 12, gynoecium: 'STYLE' }], ['compound leaf x stem', { stemLength: 60, leafLength: 30, leafType: 'COMPOUND' }],
  ['umbel, head ON', { inflorescence: 'UMBEL', umbelHead: 'ON', stemLength: 60 }], ['raceme on 120 mm', { inflorescence: 'RACEME', stemLength: 120 }],
  ['40 x 3 whorls', { petalCount: 40, layerCount: 3 }],
  ...(QUICK ? [] : [['the mophead (depth 2)', { inflorescence: 'UMBEL', umbelDepth: '2', stemLength: 120, umbelFlorets: 12, floretPetals: 4, floretScale: 0.2, pedicelLength: 12, pedicelAngle: 20, petalTipShape: 2, petalCup: 0.2, petalTilt: 15 }]]),
];
numbers.budget = [];
for (const [name, st] of BUDGET) {
  const rows = {};
  for (const t of ['PEBBLE', 'BONE']) { const b = count({ ...DEFAULTS, ...st, petalTexture: t }); rows[t] = { tris: b.acc.triangleCount, edge: b.rec.texture && b.rec.texture.edgeMm, fits: b.rec.texture && b.rec.texture.edgeCap ? b.rec.texture.edgeCap.fits : true }; }
  numbers.budget.push({ name, ...rows });
  console.log(`budget: ${name}: PEBBLE ${rows.PEBBLE.tris} @ ${rows.PEBBLE.edge} · BONE ${rows.BONE.tris} @ ${rows.BONE.edge}${rows.BONE.fits ? '' : ' REFUSED'}`);
}
{
  const img = Buffer.alloc(W * 2 * Hc * 3, 30);
  text(img, W * 2, Hc, 14, 14, 'THE BUDGET (EXPORT tris; the edge the cap used)', [240, 240, 232], 2);
  text(img, W * 2, Hc, 14, 44, 'state                     PEBBLE(retired)      BONE', [200, 200, 190], 2);
  numbers.budget.forEach((b, i) => {
    const f = (r) => `${String(r.tris.toLocaleString('en-US')).padStart(9)} @${(r.edge || 0).toFixed(2)}${r.fits ? '' : ' REF'}`;
    text(img, W * 2, Hc, 14, 72 + i * 28, `${b.name.padEnd(25).slice(0, 25)} ${f(b.PEBBLE)}  ${f(b.BONE)}`, [228, 228, 220], 2);
  });
  text(img, W * 2, Hc, 14, Hc - 30, `budget ${G.EXPORT_TRI_BUDGET.toLocaleString('en-US')}; the cap coarsens 0.40 -> 0.50, told`, [170, 170, 160], 2);
  cells.push({ img, caption: ['THE BUDGET TABLE: the rods and pedicels BONE relieves', 'are the extra triangles'], wide: 2 });
}

/* compose: 4 columns */
const COLS = 4, cw = W, ch = Hc + CAP + 8;
let slots = 0; for (const c of cells) slots += c.wide || 1;
const rowsN = Math.ceil(slots / COLS);
const SW = cw * COLS, SH = ch * rowsN + 40;
const sheet = Buffer.alloc(SW * SH * 3, 18);
text(sheet, SW, SH, 12, 10, 'BONE — the shipped texture (Oct 28): every number read off the build in EXPORT mode; look defaults PROVISIONAL', [240, 240, 232], 2);
let at = 0;
for (const c of cells) {
  const w = (c.wide || 1);
  if ((at % COLS) + w > COLS) at += COLS - (at % COLS);
  const x = (at % COLS) * cw, y = 40 + Math.floor(at / COLS) * ch;
  blit(sheet, SW, SH, c.img, W * w, Hc, x, y);
  c.caption.forEach((l, i) => text(sheet, SW, SH, x + 6, y + Hc + 4 + i * 14, l, [225, 225, 215], 1));
  at += w;
}
writePng(OUT, SW, SH, sheet);
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(numbers, null, 1));
console.log(JSON.stringify(numbers));
