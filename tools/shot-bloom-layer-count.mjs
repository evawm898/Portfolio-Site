#!/usr/bin/env node
/* ===================================================================
   THE LAYER PETAL COUNT SHEET (Nov 8, option A shipped — §18.6 and §19 of
   docs/bloom-photo-to-bloom-discovery.md). The photo lotus (S6 v11), the
   daisy and the water lily (v7) built on the BASE tree and on THIS tree at
   the default — no layer owns its count — and the lotus at 6 / 5 / 3 / 3 and
   the water lily at 4 / 10 with every layer's count owned (§18.3's numbers;
   the lotus with v11's own widths, count only).

   THE DEFAULT COLUMN IS AN IDENTITY, NOT A LOOK: every float of the export
   mesh is compared base against head positionally under `Object.is` and the
   caption carries the count; a run where any float differs FAILS (exit 1)
   before the sheet is written. The soft renderer is deterministic, so the
   pictures of an identical mesh are identical too — no pixel delta is owed.
   EXPORT mesh (print preview), the photos' own two angles.

   RUN:  node tools/shot-bloom-layer-count.mjs <png> --base <worktree of the base commit>
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as R from './bloom-soft-render.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const OUT = argv[0];
const bi = argv.indexOf('--base');
const BASE = bi >= 0 ? path.resolve(argv[bi + 1]) : null;
if (!OUT || !BASE || !fs.existsSync(path.join(BASE, 'bloom-geometry.js'))) { console.error('usage: node tools/shot-bloom-layer-count.mjs <png> --base <worktree of the base commit>'); process.exit(2); }
const SET = path.join(ROOT, 'docs/photo-to-bloom/eva-set');
const read = (f, v) => JSON.parse(fs.readFileSync(path.join(SET, f, `${f}-${v}.subset.bloom-design.json`), 'utf8'));
async function tree(root) {
  const G = await import(pathToFileURL(path.join(root, 'bloom-geometry.js')).href);
  const F = await import(pathToFileURL(path.join(root, 'bloom-file.js')).href);
  return { G, F };
}
const head = await tree(ROOT), base = await tree(BASE);
function build(T, subset, counts = null) {
  const r = T.F.readNewDesign(subset);
  if (!r.ok) throw new Error(r.error);
  const scopes = T.F.scopesForBuild(r.doc.overrides);
  if (counts) for (const [L, x] of Object.entries(counts)) {
    let e = scopes.layers.find((q) => q.layer === Number(L));
    if (!e) { e = { layer: Number(L), offsets: {} }; scopes.layers.push(e); }
    e.values = { ...(e.values || {}), layerPetalCount: x };
  }
  const acc = new T.G.MeshBuilder({ exportMode: true });
  const b = T.G.buildBloomInto(acc, r.doc.controls, { below: null, scopes });
  return { P: acc.positions, b };
}
function body(B) {
  const P = B.P, all = (B.b.petalsAll || []).filter((p) => p && p.triRange);
  const nR = Math.max(...all.map((p) => p.whorl)) + 1;
  let zl = Infinity, zh = -Infinity, rr = 0;
  for (const p of all.filter((q) => q.whorl >= Math.ceil(nR / 2))) { const [a, c] = p.triRange; for (let t = a; t < c; t++) for (let j = 0; j < 9; j += 3) { const i = t * 9 + j; zl = Math.min(zl, P[i + 2]); zh = Math.max(zh, P[i + 2]); rr = Math.max(rr, Math.hypot(P[i], P[i + 1])); } }
  return (zh - zl) / (2 * rr);
}
const VIEWS = {
  daisy: { front: { dir: [0.001, -0.02, 1], up: [0, 1, 0] }, side: { dir: [0.0, -0.9, 0.42], up: [0, 0, 1] } },
  lotus: { front: { dir: [0.0, -0.62, 0.79], up: [0, 0, 1] }, side: { dir: [0.0, -1, 0.05], up: [0, 0, 1] } },
  waterlily: { front: { dir: [0.001, -0.02, 1], up: [0, 1, 0] }, side: { dir: [0.0, -1, 0.14], up: [0, 0, 1] } },
};
const FLOWERS = [['lotus', 'v11'], ['daisy', 'v7'], ['waterlily', 'v7']];
const OWNED = { lotus: { 0: 6, 1: 5, 2: 3, 3: 3 }, waterlily: { 0: 4, 1: 10 } };
const C = 240, PAD = 6, LAB = 20, COLS = 3;
const W = COLS * (C + PAD) + PAD, H = FLOWERS.length * (2 * (C + PAD) + LAB + 14) + 40;
const rgb = Buffer.alloc(W * H * 3, 18);
R.text(rgb, W, H, PAD, 8, "A LAYER'S OWN PETAL COUNT - EXPORT MESH (PRINT PREVIEW)", [235, 235, 230], 2);
let failed = false;
for (let fi = 0; fi < FLOWERS.length; fi++) {
  const [fl, v] = FLOWERS[fi];
  const sub = read(fl, v);
  const Bm = build(base, sub), Bh = build(head, sub);
  let diff = 0;
  if (Bm.P.length !== Bh.P.length) diff = Infinity; else for (let i = 0; i < Bm.P.length; i++) if (!Object.is(Bm.P[i], Bh.P[i])) diff++;
  if (diff) failed = true;
  console.log(`${fl} ${v}: base vs head at the default — ${diff === Infinity ? 'LENGTHS DIFFER' : `${diff} of ${Bh.P.length} floats differ`} · body h:w ${body(Bh).toFixed(3)}`);
  const cells = [['MAIN', Bm, `${fl.toUpperCase()} ${v.toUpperCase()}`], ['PR 1 DEFAULT', Bh, diff ? `${diff} FLOATS DIFFER` : `IDENTICAL: 0 OF ${Bh.P.length} FLOATS`]];
  if (OWNED[fl]) {
    const Bc = build(head, sub, OWNED[fl]);
    const counts = Bc.b.slotAzimuths.map((a) => a.length).join('/');
    const tris = Bc.P.length / 9;
    console.log(`${fl} ${v} + owned counts ${counts}: ${tris} tris (default ${Bh.P.length / 9}) · body h:w ${body(Bc).toFixed(3)} (default ${body(Bh).toFixed(3)})`);
    /* §19.5 item 4 (ruled Nov 8): the inner whorl's first petal half its own pitch over the outer's */
    const az = Bc.b.slotAzimuths, off = ((((az[1][0] - az[0][0]) * 180) / Math.PI) % 360 + 360) % 360;
    console.log(`${fl} ${v} + owned counts: whorl 2's first petal stands ${off.toFixed(4)} deg past whorl 1's (half its own pitch: ${(180 / az[1].length).toFixed(4)})`);
    cells.push([`PR 1 + COUNTS ${counts}`, Bc, fl === 'lotus' ? `BODY H:W ${body(Bc).toFixed(2)} (WAS ${body(Bh).toFixed(2)})` : `INNER PETAL 1 AT ${off.toFixed(1)} DEG = HALF PITCH`]);
  }
  /* one frame per flower, from the MAIN build */
  let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < Bm.P.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], Bm.P[i + k]); mx[k] = Math.max(mx[k], Bm.P[i + k]); }
  const center = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2], half = 0.6 * Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]);
  const y0 = 34 + fi * (2 * (C + PAD) + LAB + 14);
  cells.forEach(([title, B, cap], ci) => {
    const x0 = PAD + ci * (C + PAD);
    R.text(rgb, W, H, x0, y0, title, [200, 220, 215], 2);
    for (let vi = 0; vi < 2; vi++) {
      const view = ['front', 'side'][vi];
      const img = R.render(B.P, C, C, { ...VIEWS[fl][view], center, halfHeight: half });
      R.blit(rgb, W, H, img, C, C, x0, y0 + LAB + vi * (C + PAD));
    }
    R.text(rgb, W, H, x0 + 2, y0 + LAB + 2 * (C + PAD), cap, [235, 220, 120], 1);
  });
}
if (failed) { console.error('FAIL — the default does not build identically on the two trees; no sheet written'); process.exit(1); }
R.writePng(OUT, W, H, rgb);
console.log(`wrote ${OUT}`);
