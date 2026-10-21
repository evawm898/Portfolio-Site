#!/usr/bin/env node
/* =========================================================================
   THE BLUNT-NIB LADDER TRIAL — the measurement behind
   docs/bloom-blunt-nib-ladder-outcome.md (Oct 21). Reproduces every figure
   there in a few minutes, with no browser, and changes nothing in this tree.

   THE RULED REMEDY UNDER TEST (Eva, Oct 20; F6-spoon §6): a nib resolution
   demand in the ladder, for LAW and CURVE alike — a blunt end's last ladder
   gap spans half-width ~2.4 -> 0.2 mm in one row step, so give the ladder a
   demand that no gap on the descent into the nib falls further than a
   length. The candidate is `docs/bloom-blunt-nib-ladder-trial.patch`: the
   demand through `ladderDemand`, merged with the arc's (and the lobes'),
   placed by the one ladder, held by branch where it does not bind. It
   carries two experiment knobs, read from the environment and never shipped:
     NIBX = law    the criterion on the ladder's own view of the LAW (the
                   print floor at TIP_HALF_MM, so the nib's flank is flat to it)
            drawn  the criterion on the DRAWN outline, the nib's flank included
     NIBD = <mm>   the largest half-width fall one gap may carry (default
                   TIP_HALF_MM, 0.8 — the half-width at which the nib takes over)

   WHAT IT DOES: copies this tree (no .git, node_modules linked) into a temp
   directory, applies the patch there, and runs THE EDGE-PROFILE GATE'S OWN E2
   (`--rows-file`, `--dump-e2`) over one written-down row set on this tree and
   on each variant, side by side. Then, on the shipped variant's candidate
   (drawn, 1.0 — the one that leaves every pointed default unbound): the
   ladder's own record of the demand in BOTH modes, and the census and
   orientation on both trees.

   RUN: node tools/bloom-blunt-nib-ladder.mjs [--variants law:0.8,drawn:0.8,drawn:1.0,drawn:1.6]
   ========================================================================= */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const vArg = argv.indexOf('--variants');
const VARIANTS = (vArg >= 0 ? argv[vArg + 1] : 'law:0.8,drawn:0.8,drawn:1.0,drawn:1.6').split(',').map((s) => { const [x, d] = s.split(':'); return { x, d }; });
const PATCH = path.join(HERE, 'docs', 'bloom-blunt-nib-ladder-trial.patch');

/* the matrix's own curves (tools/bloom-harness.mjs, block 65) and F6-spoon's
   LAW shapes (tools/bloom-spoon-rim-turn.mjs) */
const O = {
  default: { mode: 'symmetric', points: [[0, 0.05], [0.15, 0.16], [0.36, 0.2286], [0.7, 0.178], [0.9, 0.1], [1, 0]] },
  spoon: { mode: 'symmetric', points: [[0, 0.03], [0.35, 0.05], [0.65, 0.2], [0.85, 0.22], [0.96, 0.12], [1, 0]] },
  rect: { mode: 'symmetric', points: [[0, 0.15], [0.1, 0.16], [0.9, 0.16], [0.97, 0.12], [1, 0]] },
};
const CV = (c) => ({ petalOutlineMode: 'CURVE', petalOutlineCurve: JSON.stringify(O[c]) });
const SHAPES = {
  'spoon': CV('spoon'), 'near-rectangle': CV('rect'),
  'LAW spatulate 1.7': { petalBaseTaper: 3, petalTipTaper: 0.6, petalTipShape: 1.7 },
  'LAW spatulate 2.5': { petalBaseTaper: 3, petalTipTaper: 0.6, petalTipShape: 2.5 },
  'LAW spatulate 3.0': { petalBaseTaper: 3, petalTipTaper: 0.6, petalTipShape: 3 },
  'default curve': CV('default'), 'LAW default': {},
};
const ROWS = [];
for (const [k, s] of Object.entries(SHAPES)) for (const c of [0, 0.6]) ROWS.push({ label: `${k} x cup ${c}`, state: { ...s, petalCup: c } });
for (const k of ['spoon', 'LAW spatulate 3.0', 'LAW default']) ROWS.push({ label: `${k} x width 30`, state: { ...SHAPES[k], petalWidth: 30 } });
const rowsJson = JSON.stringify(ROWS.map(({ label, state }) => ({ label, set: Object.entries(state).map(([id, value]) => ({ id, value: String(value) })) })));

/* ---------- the patched copy ---------- */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'blunt-nib-'));
const tree = path.join(tmp, 'tree');
const SKIP = new Set(['.git', 'node_modules']);
fs.cpSync(HERE, tree, { recursive: true, filter: (src) => !SKIP.has(path.basename(src)) || path.dirname(src) !== HERE });
fs.symlinkSync(path.join(HERE, 'node_modules'), path.join(tree, 'node_modules'));
execFileSync('git', ['apply', PATCH], { cwd: tree, stdio: 'inherit' });
const rf = path.join(tmp, 'rows.json');
fs.writeFileSync(rf, rowsJson);

/* ---------- E2, through the gate's own clause, all trees in parallel ---------- */
function gate(root, env, out) {
  return new Promise((res) => {
    const p = spawn(process.execPath, [path.join(root, 'tools', 'verify-bloom-edge-profile.mjs'), '--rows-file', rf, '--dump-e2', out],
      { cwd: root, env: { ...process.env, ...env }, stdio: 'ignore' });
    p.on('exit', () => res(JSON.parse(fs.readFileSync(out, 'utf8'))));
  });
}
const runs = [{ name: 'main', root: HERE, env: {} }, ...VARIANTS.map((v) => ({ name: `${v.x} ${v.d}`, root: tree, env: { NIBX: v.x, NIBD: v.d } }))];
const results = await Promise.all(runs.map((r, i) => gate(r.root, r.env, path.join(tmp, `e2-${i}.json`))));
for (const [i, r] of results.entries()) if (Object.keys(r).length !== ROWS.length) { console.error(`HARNESS INVALID: ${runs[i].name} measured ${Object.keys(r).length} of ${ROWS.length} rows`); process.exit(2); }
console.log('E2 (EXPORT, degrees the treatment adds; allowance 45), main against the trial demand at each criterion:\n');
console.log('row'.padEnd(30) + runs.map((r) => r.name.padStart(11)).join(''));
const over = runs.map(() => 0), worse = runs.map(() => 0), better = runs.map(() => 0);
for (const { label } of ROWS) {
  const v = results.map((r) => r[label]);
  v.forEach((x, i) => { if (x >= 45) over[i]++; if (i && x > v[0] + 0.05) worse[i]++; if (i && x < v[0] - 0.05) better[i]++; });
  console.log(label.padEnd(30) + v.map((x) => x.toFixed(2).padStart(11)).join(''));
}
console.log('over 45'.padEnd(30) + over.map((n) => String(n).padStart(11)).join(''));
console.log('worse than main'.padEnd(30) + worse.map((n, i) => (i ? String(n) : '-').padStart(11)).join(''));
console.log('better than main'.padEnd(30) + better.map((n, i) => (i ? String(n) : '-').padStart(11)).join(''));

/* ---------- the trial's own record and the printed consequence ---------- */
const probeSrc = `
import path from 'node:path'; import { pathToFileURL } from 'node:url';
const R = process.env.ROOT;
const G = await import(pathToFileURL(path.join(R, 'bloom-geometry.js')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(R, 'bloom-registry.js')).href);
const SI = await import(pathToFileURL(path.join(R, 'tools/bloom-self-intersection.mjs')).href);
const { firstSlot } = await import(pathToFileURL(path.join(R, 'tools/bloom-first-slot.mjs')).href);
const ROWS = ${JSON.stringify(ROWS)};
const out = {};
for (const { label, state } of ROWS) {
  const s = { ...DEFAULTS, ...state };
  const rec = {};
  for (const exportMode of [true, false]) {
    const acc = new G.MeshBuilder({ exportMode });
    const { ring, slot } = firstSlot(s, acc, 0, G);
    const surf = G.petalSurface(s, ring, slot, null, acc);
    const rep = {};
    const st = G.bladeStations(surf.profile, surf.length, surf.form && surf.form.buckle, surf.seamClearMm, rep);
    rec[exportMode ? 'export' : 'live'] = { st, nib: rep.nibFall || null };
  }
  const acc = new G.MeshBuilder({ exportMode: true });
  G.buildBloomInto(acc, s, { below: null });
  const c = SI.census(acc.positions), o = SI.orientation(acc.positions);
  out[label] = { modeFree: rec.export.st.every((u, i) => Object.is(u, rec.live.st[i])), nib: rec.export.nib, nibLive: rec.live.nib, tris: acc.triangleCount, within: c.within, inward: o.inward };
}
console.log(JSON.stringify(out));
`;
const pf = path.join(tmp, 'probe.mjs');
fs.writeFileSync(pf, probeSrc);
const probe = (root, env) => JSON.parse(execFileSync(process.execPath, [pf], { env: { ...process.env, ROOT: root, ...env }, stdio: ['ignore', 'pipe', 'ignore'] }).toString());
const P0 = probe(HERE, {}), P1 = probe(tree, { NIBX: 'drawn', NIBD: '1.0' });
console.log('\nThe candidate (drawn, 1.0): the ladder\'s own record, and the census / orientation on both trees (EXPORT):\n');
for (const { label } of ROWS) {
  const a = P0[label], b = P1[label], n = b.nib;
  const rec = !n ? 'no nib' : n.binds ? `BINDS: worst fall ${n.worstBaseMm.toFixed(3)} -> ${n.worstMm.toFixed(3)} mm, ${n.stations} stations from u ${n.uA.toFixed(4)}${n.short ? ', SHORT' : ''}` : `holds: worst fall ${n.worstBaseMm.toFixed(3)} mm`;
  const same = n && b.nibLive && n.binds === b.nibLive.binds && n.worstMm === b.nibLive.worstMm;
  console.log(`  ${label.padEnd(30)} ${rec.padEnd(66)} live=export ${b.modeFree && same}  tris ${a.tris} / ${b.tris}  within-shell ${a.within} / ${b.within}  inward ${a.inward} / ${b.inward}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
