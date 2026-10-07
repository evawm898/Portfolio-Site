#!/usr/bin/env node
/* ===================================================================
   shot-bloom-node-split.mjs — THE SHEET FOR LEAF/STEM BUILD S1 (Eva's rulings,
   Oct 6: the stem node is two controls, swelling and kink; ALTERNATE takes a
   divergence angle).

     node tools/shot-bloom-node-split.mjs <out.png> --base <worktree of the base commit>

   ROW 1, the references by name: the CARNATION (opposite, decussate, swelling
   1, no kink), the ROSE side-on (alternate at the golden 137.5, kink 0.8 — a
   ~6 degree zig-zag — no swelling) and from BELOW (the leaves round the
   spiral; from above the head's petals cover them), and the 180-degree ALTERNATE pair: TODAY (the base tree building
   the stored set `stemNodeProminence 0.48`) beside the HEAD (the same stored
   set through the registry's `migrateSet` — swelling 0.48, kink 0.48,
   divergence at its default 180). The pair's caption is a MEASUREMENT taken
   here, not a claim: every float of the two exports compared under
   `Object.is`.
   ROW 2: a SWELLING sweep 0 / 0.25 / 0.5 / 0.75 / 1 with no kink, on one stem.
   ROW 3: a KINK sweep 0 / 0.25 / 0.5 / 0.75 / 1 with no swelling, on the same.

   RENDERED BY `bloom-soft-render.mjs`, which is DETERMINISTIC — the same
   triangles give the same bytes — so no pixel delta is quoted and none is
   owed. EXPORT mode: the object a print gets. Every caption number is read off
   the build's own plan (`stem.nodeLaw`, the tip offset, the worst lean, the
   leaf record's azimuths), never restated. Side-on cells look along +y, so an
   alternate stem's leaves and kinks lie in the picture plane; mm per pixel is
   printed on every cell.
   =================================================================== */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const out = argv[0];
const BASE = argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : null;
if (!out || !BASE) { console.error('usage: node tools/shot-bloom-node-split.mjs <out.png> --base <worktree of the base commit>'); process.exit(2); }
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const R = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const BG = await import(pathToFileURL(path.join(path.resolve(BASE), 'bloom-geometry.js')).href);
const BR = await import(pathToFileURL(path.join(path.resolve(BASE), 'bloom-registry.js')).href);

const CW = 300, CH = 640, CAP = 70;
const STEM = { stemLength: 100, stemDiameter: 6, leafLength: 40 };
function build(Gm, D, over) {
  const st = { ...D, ...over };
  const acc = new Gm.MeshBuilder({ exportMode: true });
  const b = Gm.buildBloomInto(acc, st, { below: null });
  return { acc, st, S: b.stem, leaf: b.leaf, b };
}
const head = (over) => build(G, R.DEFAULTS, over);
function cell(bl, cam, lines, ropts = {}) {
  const img = render(bl.acc.positions, CW, CH - CAP, cam, { color: [214, 206, 190], ...ropts });
  const rgb = Buffer.alloc(CW * CH * 3, 18);
  blit(rgb, CW, CH, img, CW, CH - CAP, 0, CAP);
  lines.forEach((l, i) => text(rgb, CW, CH, 6, 6 + i * 13, l, [240, 236, 226], 1));
  return rgb;
}
const side = (S) => ({ dir: [0, -1, 0], up: [0, 0, 1], center: [0, 0, S.rootZ - 45], halfHeight: 74 });
const mmpx = (cam) => ((2 * cam.halfHeight) / (CH - CAP)).toFixed(3);
const deg = (r) => (((r * 180) / Math.PI) % 360 + 360) % 360;
const nodeLine = (S) => {
  const L = S.nodeLaw;
  if (!L) return ['NO NODES - A STRAIGHT TUBE (THE IDENTITY)', ''];
  return [
    `SWELL +${(L.swell * 100).toFixed(1)}% OF R  KINK ${L.turnDeg.toFixed(2)} DEG A NODE`,
    `TIP ${S.nodeTipOffsetMm.toFixed(2)} MM OFF STRAIGHT, LEAN ${S.nodeTiltMaxDeg.toFixed(2)} DEG`,
  ];
};
const rows = [];

/* ---- ROW 1: the references, and today's 180 against the head's ---- */
{
  const r1 = [];
  const carn = head({ ...STEM, leafNodes: 4, leafPhyllotaxy: 'opposite', stemNodeSwelling: 1, stemNodeKink: 0 });
  const c1 = side(carn.S);
  r1.push(cell(carn, c1, ['CARNATION - OPPOSITE, DECUSSATE', 'SWELLING 1.00, KINK 0', ...nodeLine(carn.S), `LEAVES AT ${carn.leaf.azimuths.map((a) => a.map((x) => deg(x).toFixed(0)).join('/')).join('  ')}`, `${mmpx(c1)} MM/PX`]));
  const rose = head({ ...STEM, leafNodes: 4, leafDivergence: 137.5, stemNodeSwelling: 0, stemNodeKink: 0.8 });
  const c2 = side(rose.S);
  r1.push(cell(rose, c2, ['ROSE - ALTERNATE AT 137.5 DEG', 'KINK 0.80, SWELLING 0', ...nodeLine(rose.S), `LEAVES AT ${rose.leaf.azimuths.map((a) => deg(a[0]).toFixed(1)).join('  ')}`, `${mmpx(c2)} MM/PX`]));
  /* the same rose from BELOW: the leaves round the golden spiral (from above
     the head's own petals cover them; from below the leaves are nearest) */
  const c3 = { dir: [0, 0, -1], up: [0, 1, 0], center: [0, 0, rose.S.rootZ - 40], halfHeight: 62 };
  r1.push(cell(rose, c3, ['ROSE FROM BELOW', 'EACH LEAF 137.5 DEG ROUND FROM THE LAST', 'THE KINK TURNS AWAY FROM EACH LEAF', `DIVERGENCE ${rose.leaf.divergenceDeg} DEG (THE LEAF RECORD)`, 'LIT FROM BELOW FOR THIS VIEW', `${mmpx(c3)} MM/PX`], { light1: [0.4, -0.5, -0.75], light2: [-0.6, 0.3, -0.2] }));
  /* TODAY against the HEAD on one stored set, measured */
  const stored = [{ id: 'stemLength', value: '100' }, { id: 'stemDiameter', value: '6' }, { id: 'leafLength', value: '40' }, { id: 'leafNodes', value: '3' }, { id: 'stemNodeProminence', value: '0.48' }];
  const toState = (Rm, set) => Object.fromEntries(set.map((w) => [w.id, Number(w.value)]));
  const today = build(BG, BR.DEFAULTS, toState(BR, stored));
  const now = build(G, R.DEFAULTS, toState(R, R.migrateSet(stored)));
  const a = today.acc.positions, bq = now.acc.positions;
  let differ = a.length === bq.length ? 0 : Infinity;
  if (differ === 0) for (let i = 0; i < a.length; i++) if (!Object.is(a[i], bq[i])) differ++;
  const c4 = side(today.S);
  r1.push(cell(today, c4, ['TODAY (THE BASE TREE)', 'STORED: PROMINENCE 0.48, ALTERNATE', ...nodeLine(today.S), 'ALTERNATE WAS ALWAYS 180 DEG', `${mmpx(c4)} MM/PX`]));
  r1.push(cell(now, c4, ['HEAD - THE SAME STORED SET, MIGRATED', `SWELL ${now.st.stemNodeSwelling} KINK ${now.st.stemNodeKink} DIVERGENCE ${now.st.leafDivergence}`, ...nodeLine(now.S), differ === 0 ? `IDENTICAL: 0 OF ${a.length} FLOATS DIFFER` : `DIFFERS: ${differ} FLOATS`, `${mmpx(c4)} MM/PX`]));
  if (differ !== 0) { console.error(`the 180-degree pair differs (${differ}) — the sheet would be claiming a match it does not have`); process.exit(1); }
  rows.push(r1);
}
/* ---- ROWS 2 and 3: each half swept alone, on one stem ---- */
for (const half of ['stemNodeSwelling', 'stemNodeKink']) {
  const r = [];
  for (const v of [0, 0.25, 0.5, 0.75, 1]) {
    const bl = head({ ...STEM, leafNodes: 3, stemNodeSwelling: half === 'stemNodeSwelling' ? v : 0, stemNodeKink: half === 'stemNodeKink' ? v : 0 });
    const cam = side(bl.S);
    r.push(cell(bl, cam, [`${half === 'stemNodeSwelling' ? 'SWELLING' : 'KINK'} ${v.toFixed(2)} - THE OTHER HALF 0`, '3 ALTERNATE LEAVES, 180 DEG', ...nodeLine(bl.S), `STEM ${bl.b.stemBuilt ? bl.b.stemBuilt.tris : '-'} TRIS, ${bl.S.stations.length} STATIONS`, `${mmpx(cam)} MM/PX`]));
  }
  rows.push(r);
}
const COLS = 5, W = CW * COLS + 4 * (COLS - 1), H = CH * rows.length + 4 * (rows.length - 1);
const sheet = Buffer.alloc(W * H * 3, 40);
rows.forEach((r, ri) => r.forEach((c, ci) => blit(sheet, W, H, c, CW, CH, ci * (CW + 4), ri * (CH + 4))));
writePng(out, W, H, sheet);
console.log(`wrote ${out} (${W} x ${H})`);
