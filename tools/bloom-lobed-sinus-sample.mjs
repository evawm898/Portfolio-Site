#!/usr/bin/env node
/* bloom-lobed-sinus-sample.mjs — THE LOBED SINUS-GAP SAMPLE (leaf/stem build
   S4b), committed so the figure has an instrument behind it: S4 quoted a
   uniform 2,000-state sample (59.7 % of lobed states with a sinus opening
   under 1 mm) from a script that was never committed.

   WHAT IT MEASURES, per state, EXPORT, one leaf, from the BUILDER's own
   record (`leavesBuilt[0].lobed`), never re-derived here:
     * S4's ARC measure (`sinusGaps.minArcGapMm`, or `minGapMm` on a tree that
       predates S4b, where it was the only measure) — the nearest point of the
       other flank to the point 1 mm of margin arc up from the bottom. It is
       CAPPED AT 1 mm BY CONSTRUCTION (a chord is never longer than its arc),
       so on any rounded bottom it reads under 1 whatever the opening is —
       which is why S4b re-derived the measure rather than building to it;
     * the S4b OPENING (`sinusGaps.minGapMm` on this tree) — the least
       distance between the two flanks above a seated MIN_FEATURE_MM disc's
       equator;
     * the asked V's opening (`roundBottoms.sinuses[].openingAskedMm`) and the
       round bottoms built / needed / NO FIT with their reasons.
   `--root <tree>` measures another tree with the SAME states (the sampler is
   a seeded LCG over the RANGES read from this tree's geometry, so both trees
   see the same numbers): a worktree of the base commit reproduces S4's own
   figure, which is what makes the comparison a comparison.
   `--part k/n` builds every n-th state from k (a 2,000-state run is ~8 min,
   longer than one foreground call); `--out f.json` writes the slice;
   `--merge a.json b.json ...` closes it and refuses a short or doubled set. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const N = Number(opt('--n') || 2000), SEED = Number(opt('--seed') || 20261008);

if (argv.includes('--merge')) {
  const files = argv.slice(argv.indexOf('--merge') + 1);
  const rows = files.flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')).rows);
  const seen = new Set(rows.map((r) => r.k));
  if (seen.size !== rows.length || rows.length !== N) { console.log(`MERGE REFUSED: ${rows.length} rows, ${seen.size} distinct, ${N} expected`); process.exit(1); }
  report(rows.sort((a, b) => a.k - b.k));
  process.exit(0);
}

const TREE = path.resolve(opt('--root') || ROOT);
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const GT = TREE === ROOT ? G : await import(pathToFileURL(path.join(TREE, 'bloom-geometry.js')).href);
const RT = await import(pathToFileURL(path.join(TREE, 'bloom-registry.js')).href);

/* the sampled space: all seven lobed controls, the envelope width, the length,
   the tooth depth and count, the shared tip shape — S4's own list */
const SPACE = [
  ['lobedLobes', G.LOBED_PER_SIDE_RANGE, 1], ['lobedFrom', G.LOBED_FROM_RANGE, 0.01], ['lobedTo', G.LOBED_TO_RANGE, 0.01],
  ['lobedSinus', G.LOBED_SINUS_RANGE, 0.01], ['lobedShape', G.LOBED_SHAPE_RANGE, 0.05], ['lobedAngle', G.LOBED_ANGLE_RANGE, 1],
  ['lobedEase', G.LOBED_EASE_RANGE, 0.01], ['lobedWidth', G.LEAF_WIDTH_RANGE, 0.5], ['leafLength', [5, 120], 1],
  ['lobedToothDepth', [0, 1], 0.01], ['leafToothCount', G.LEAF_TOOTH_RANGE, 1], ['leafTipShape', G.LEAF_TIP_SHAPE_RANGE, 0.05],
];
function stateOf(k) {
  let s = (SEED + 7919 * k) % 2147483648;
  const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let w = 0; w < 4; w++) rnd();
  const st = { stemLength: 200, stemDiameter: 6, leafNodes: 1, leafType: 'LOBED' };
  for (const [id, [lo, hi], step] of SPACE) st[id] = Math.min(hi, Math.max(lo, lo + Math.round(((hi - lo) * rnd()) / step) * step));
  /* `--set id=value[,id=value]` lays fixed values over every drawn state AFTER
     the draw, so the drawn numbers (and therefore the states) are S4b's own;
     S4c measures the same 2,000 states at roundness 0 and at its default */
  for (const kv of (opt('--set') || '').split(',').filter(Boolean)) { const [k, v] = kv.split('='); st[k] = v; }
  return st;
}

const [pk, pn] = (opt('--part') || '0/1').split('/').map(Number);
const rows = [];
for (let k = pk; k < N; k += pn) {
  const set = stateOf(k), st = { ...RT.DEFAULTS, ...set };
  let r = null;
  try {
    const b = GT.buildBloomInto(new GT.MeshBuilder({ exportMode: true }), st);
    const L = (b.leavesBuilt || [])[0];
    r = L && L.lobed ? L.lobed : null;
  } catch (e) { rows.push({ k, set, threw: e.message }); continue; }
  if (!r) { rows.push({ k, set, noLeaf: true }); continue; }
  const g = r.sinusGaps, rb = r.roundBottoms || null;
  rows.push({
    k, set, sinus: Number(set.lobedSinus) > 0 && !!g && g.minGapMm !== null,
    arc: g ? (g.minArcGapMm !== undefined ? g.minArcGapMm : g.minGapMm) : null,
    open: rb ? g.minGapMm : null,
    asked: rb ? Math.min(...rb.sinuses.map((x) => (x.openingAskedMm === null ? Infinity : x.openingAskedMm))) : null,
    needed: rb ? rb.needed : 0, built: rb ? rb.built : 0, noFit: rb ? rb.noFit : 0,
    why: rb ? rb.sinuses.filter((x) => x.noFit).map((x) => x.noFitWhy) : [],
    /* S4c: the radius shrink (stage 1) and the lobe-count yield (stage 2) */
    shrunk: rb && rb.shrunk !== undefined ? rb.shrunk : null,
    lobesAsked: r.lobesAsked !== undefined ? r.lobesAsked : r.lobes, lobesBuilt: r.lobes,
    residual: r.lobeYield ? r.lobeYield.residual : null,
    attempts: r.lobeYield ? r.lobeYield.attempts : null,
    roundFrac: rb ? rb.sinuses.filter((x) => x.built && x.roundBuilt !== null && x.roundBuilt !== undefined).map((x) => x.roundBuilt) : [],
  });
}
const out = opt('--out');
if (out) { fs.writeFileSync(out, JSON.stringify({ tree: TREE, part: `${pk}/${pn}`, rows })); console.log(`wrote ${rows.length} states to ${out}`); }
else report(rows);

function report(R) {
  const ws = R.filter((r) => r.sinus), pct = (a, b) => `${((100 * a) / b).toFixed(1)} %`;
  const q = (arr, p) => { const s = arr.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  const arcs = ws.map((r) => r.arc);
  console.log(`LOBED SINUS SAMPLE: ${R.length} states (${R.filter((r) => r.threw).length} threw, ${R.filter((r) => r.noLeaf).length} built no leaf), ${ws.length} with a sinus`);
  console.log(`  S4's ARC measure under 1 mm: ${pct(arcs.filter((x) => x < 1).length, ws.length)} (${arcs.filter((x) => x < 1).length} of ${ws.length}); median ${q(arcs, 0.5).toFixed(3)}, p10 ${q(arcs, 0.1).toFixed(3)}, min ${Math.min(...arcs).toFixed(3)}`);
  if (!ws.length || ws[0].open === null) return;
  const asked = ws.map((r) => r.asked), open = ws.map((r) => r.open);
  console.log(`  the S4b OPENING on the asked V, under 1 mm: ${pct(asked.filter((x) => x < 1).length, ws.length)} (${asked.filter((x) => x < 1).length})`);
  console.log(`  the S4b OPENING as built, under 1 mm: ${pct(open.filter((x) => x < 1 - 1e-9).length, ws.length)} (${open.filter((x) => x < 1 - 1e-9).length}); median ${q(open, 0.5).toFixed(3)}, min ${Math.min(...open).toFixed(3)}`);
  const need = ws.reduce((s, r) => s + r.needed, 0), built = ws.reduce((s, r) => s + r.built, 0), nf = ws.reduce((s, r) => s + r.noFit, 0);
  const nfS = ws.filter((r) => r.noFit > 0);
  console.log(`  sinuses needing a round bottom ${need}: built ${built}, NO FIT ${nf}; states with a NO FIT ${pct(nfS.length, ws.length)} (${nfS.length})`);
  const why = {}; for (const r of nfS) for (const w of r.why) why[w] = (why[w] || 0) + 1;
  console.log(`  NO FIT by reason: ${JSON.stringify(why)}`);
  const still = ws.filter((r) => r.open < 1 - 1e-9);
  console.log(`  states still under 1 mm as built: ${still.length}${still.length ? ` — ${still.filter((r) => r.noFit > 0).length} carry a told NO FIT` : ''}`);
  if (ws[0].shrunk !== null) {
    const sh = ws.filter((r) => r.shrunk > 0), yl = ws.filter((r) => r.lobesBuilt < r.lobesAsked), rs = ws.filter((r) => r.residual);
    console.log(`  S4c STAGE 1 — the radius shrank toward the print minimum: ${pct(sh.length, ws.length)} (${sh.length}) of states, ${ws.reduce((s, r) => s + r.shrunk, 0)} sinuses`);
    console.log(`  S4c STAGE 2 — the lobe count yielded: ${pct(yl.length, ws.length)} (${yl.length}); lobes given up ${JSON.stringify(yl.reduce((h, r) => { const d = r.lobesAsked - r.lobesBuilt; h[d] = (h[d] || 0) + 1; return h; }, {}))}`);
    console.log(`  S4c RESIDUAL — no count fits, the asked count with the told V: ${pct(rs.length, ws.length)} (${rs.length})`);
    for (const r of rs) console.log(`    k ${r.k}: opening ${r.open.toFixed(3)} mm, NO FIT ${r.noFit} (${r.why.join(', ')}), tries ${JSON.stringify(r.attempts)} — ${JSON.stringify(r.set)}`);
  }
  for (const r of still.slice(0, 40)) console.log(`    k ${r.k}: opening ${r.open.toFixed(3)} mm, NO FIT ${r.noFit} (${r.why.join(', ')}) — ${JSON.stringify(r.set)}`);
}
