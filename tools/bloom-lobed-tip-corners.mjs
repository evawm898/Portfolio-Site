#!/usr/bin/env node
/* bloom-lobed-tip-corners.mjs — THE LOBED LEAF'S EXTREME CORNERS, CENSUSED AT
   THE TIP (leaf/stem build S5).

   WHY IT EXISTS. S4 (#385) reported "139 of 972 extreme corners still fold at
   the tip" from a script that was never committed, so the figure could not be
   re-run and S5's ruling ("where a tooth would fold in the converging tip, the
   tip gives that tooth up") had no instrument to be measured against. This is
   that instrument, RECONSTRUCTED rather than recovered: S4's corner list is not
   in the repository, so the grid below is a stated one, and its numbers are its
   own, never S4's.

   THE GRID — 972 corners, 3^5 x 2^2, every axis the S4 doc names as where the
   tip folds (tip shape, `lobedTo`, the envelope width, the chevron angle, the
   cup) at its two ends and its ruled default, and the two binary axes that move
   the tip's tilt and its tooth layout (`lobedEase`, `lobedLobes`) at their
   ends. Everything else is the shipped default (4 teeth a lobe, depth 0.22,
   roundness 0.12, a 46 mm blade).

   MODE AND SAMPLING (CLAUDE.md's first durable rule): EXPORT, one leaf on a
   bare 90 mm stem, the census of `tools/bloom-self-intersection.mjs` over THAT
   LEAF'S OWN TRIANGLES only (so a fold elsewhere on the bloom cannot count), on
   the doubles the builder emitted. A pair is AT THE TIP when its site lies past
   the lobe window (`u >= lobedTo` along the blade's own axis) — the converging
   stretch the S4 doc names.

   RUN:
     node tools/bloom-lobed-tip-corners.mjs [--root <tree>] [--part k/n] [--set id=v,...] [--k i,j,...] [--out f.json]
     node tools/bloom-lobed-tip-corners.mjs --merge a.json b.json ...
   `--root` builds another tree's geometry with THIS tree's census, so a base
   worktree and the head are measured by one instrument. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const HERE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };

/* `--grid simple` / `--grid compound` sweep the other two leaf types' tips the
   same way (S5's nib is one tip law on all three): tip shape, width, length,
   cup and tooth depth, at their ends and the shipped default; for a compound
   leaf the LEAFLETS' own tip shape and tooth depth. A pair is AT THE TIP when
   its site lies in the last 10 % of the blade it sits on (simple) or within
   2 mm of any blade's own end (compound, whose leaflets point every way). */
const GRID = opt('--grid') || 'lobed';
export const GRIDS = {
  simple: [['leafTipShape', [0.6, 1.3, 3]], ['leafWidth', [3, 17, 40]], ['leafLength', [6, 46, 120]], ['leafCup', [-0.8, 0.35, 1.2]], ['leafToothDepth', [0, 0.26, 1]]],
  compound: [['leafletTipShape', [0.6, 1.6, 3]], ['leafletWidth', [3, 17, 40]], ['leafletLength', [6, 26, 60]], ['leafCup', [-0.8, 0.35, 1.2]], ['leafletToothDepth', [0, 0.3, 1]]],
};
export const AXES = GRIDS[GRID] || [
  ['leafTipShape', [0.6, 1.3, 3]],
  ['lobedTo', [0.5, 0.8, 0.95]],
  ['lobedWidth', [3, 34, 40]],
  ['lobedAngle', [0, 22, 60]],
  ['leafCup', [0, 0.35, 1.2]],
  ['lobedEase', [0.5, 0.95]],
  ['lobedLobes', [1, 6]],
];
const TYPE = GRID === 'simple' ? 'SIMPLE' : GRID === 'compound' ? 'COMPOUND' : 'LOBED';
export function corners() {
  let out = [{}];
  for (const [id, vals] of AXES) out = out.flatMap((c) => vals.map((v) => ({ ...c, [id]: v })));
  return out;
}

function report(rows) {
  const n = rows.length, folded = rows.filter((r) => r.within > 0), tip = rows.filter((r) => r.tipPairs > 0);
  const thr = rows.filter((r) => r.threw);
  console.log(`${TYPE} TIP CORNERS: ${n} corners (${thr.length} threw)`);
  console.log(`  any within-shell pair: ${folded.length}; AT THE TIP (${TYPE === 'LOBED' ? 'u >= lobedTo' : TYPE === 'SIMPLE' ? 'the last 10% of the blade' : 'within 2 mm of a leaflet end'}): ${tip.length}; elsewhere only: ${folded.length - tip.length}`);
  const by = {};
  for (const r of tip) for (const [id] of AXES) { const k = `${id}=${r.set[id]}`; by[k] = (by[k] || 0) + 1; }
  console.log(`  tip folds by axis value: ${JSON.stringify(by)}`);
  const yielded = rows.filter((r) => r.tipYield > 0);
  console.log(`  corners where the tip gave up a tooth: ${yielded.length}`);
  for (const r of tip.slice(0, 12)) console.log(`    ${JSON.stringify(r.set)}: ${r.tipPairs} tip pairs, worst ${r.worst.toFixed(4)} mm, teeth ${r.built}/${r.asked}`);
}

if (argv.includes('--merge')) {
  const files = argv.slice(argv.indexOf('--merge') + 1);
  const rows = files.flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')).rows);
  const ks = new Set(rows.map((r) => r.k));
  const N = corners().length;
  if (ks.size !== rows.length || rows.length !== N) { console.log(`MERGE REFUSED: ${rows.length} rows, ${ks.size} distinct, ${N} expected`); process.exit(1); }
  report(rows.sort((a, b) => a.k - b.k));
  process.exit(0);
}

const TREE = path.resolve(opt('--root') || HERE);
const G = await import(pathToFileURL(path.join(TREE, 'bloom-geometry.js')).href);
const R = await import(pathToFileURL(path.join(TREE, 'bloom-registry.js')).href);
const { census } = await import(pathToFileURL(path.join(HERE, 'tools', 'bloom-self-intersection.mjs')).href);

/* `--set id=v[,id=v]` lays fixed values over every corner (the teeth-off
   control: `--set lobedToothDepth=0` says which tip folds are a tooth's) */
const OVER = Object.fromEntries((opt('--set') || '').split(',').filter(Boolean).map((kv) => kv.split('=')).map(([k, v]) => [k, Number.isFinite(Number(v)) ? Number(v) : v]));
const ONLYK = opt('--k') ? new Set(opt('--k').split(',').map(Number)) : null;
const [pk, pn] = (opt('--part') || '0/1').split('/').map(Number);
const all = corners(), rows = [];
for (let k = pk; k < all.length; k += pn) {
  if (ONLYK && !ONLYK.has(k)) continue;
  const set = all[k];
  const st = { ...R.DEFAULTS, stemLength: 90, stemDiameter: 6, leafLength: 46, leafNodes: 1, leafType: TYPE, ...set, ...OVER };
  try {
    const acc = new G.MeshBuilder({ exportMode: true });
    const b = G.buildBloomInto(acc, st, { below: null });
    const L = b.leavesBuilt[0], a0 = b.leafTriRange[0];
    const pos = acc.positions.slice(a0 * 9, (a0 + L.tris) * 9);
    const c = census(pos, { collect: true });
    /* the blade's own axis, from the leaf's root ring along its angle */
    const th = (b.leaf.angleDeg * Math.PI) / 180, az = b.leaf.azimuths.flat()[0];
    const D = [Math.cos(az) * Math.cos(th), Math.sin(az) * Math.cos(th), Math.sin(th)];
    const base = L.petioleAxis.inner;
    const al = (p) => (p[0] - base[0]) * D[0] + (p[1] - base[1]) * D[1] + (p[2] - base[2]) * D[2];
    let reach = -Infinity;
    for (let i = 0; i < pos.length; i += 3) reach = Math.max(reach, al([pos[i], pos[i + 1], pos[i + 2]]));
    const bladeLen = Number(st.leafLength), uOf = (p) => 1 - (reach - al(p)) / bladeLen;
    const tipPairs = TYPE === 'LOBED' ? c.sites.filter((s) => uOf(s.at) >= Number(set.lobedTo)).length
      : TYPE === 'SIMPLE' ? c.sites.filter((s) => uOf(s.at) >= 0.9).length
      : c.sites.filter((s) => (L.leaflets || []).map((q) => q.rowCentre[q.rowCentre.length - 1]).some((q) => Math.hypot(s.at[0] - q[0], s.at[1] - q[1], s.at[2] - q[2]) < 2)).length;
    const s = L.serration || {};
    rows.push({ k, set, within: c.within, worst: c.worstSpanMm, tipPairs, asked: s.countAsked ?? null, built: s.countBuilt ?? null,
      tipYield: s.tipYield ? s.tipYield.given : 0, tris: L.tris });
  } catch (e) { rows.push({ k, set, threw: e.message, within: 0, tipPairs: 0, worst: 0 }); }
}
const out = opt('--out');
if (out) { fs.writeFileSync(out, JSON.stringify({ tree: TREE, part: `${pk}/${pn}`, rows })); console.log(`wrote ${rows.length} corners to ${out}`); }
else report(rows);
