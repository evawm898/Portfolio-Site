#!/usr/bin/env node
/* =========================================================================
   THE SPOON'S RIM TURN — the measurement behind
   docs/bloom-spoon-rim-turn-outcome.md (F6-spoon, Oct 18). Reproduces every
   figure there, in about a minute, with no browser.

   QUESTION: `OUTLINE CURVE: the spoon x cup 0.6` reads a 71.99 deg E2 turn
   (edge-profile gate, EXPORT) against the 45 deg allowance. Is that the cup
   law misbehaving on a WAISTED outline (a defect of the curve), or the
   geometry of cupping that blade?

   WHAT IT MEASURES, each through an owner that is not this tool:
     1. E2 itself, through `verify-bloom-edge-profile.mjs --rows-file` (the
        gate's own clause on a written-down row set) — the turn and its site,
        over cup 0..0.8, width 8..30 and length 20/35/60, on the SPOON, a
        non-waisted CURVE (the NEAR-RECTANGLE), the default curve, and the
        nearest LAW shapes (spatulate: base taper 3, tip taper 0.6, tip shape
        1.7 / 2.5 / 3.0) and the LAW default.
     2. WHERE the turn is: the site mapped to the nearest treated profile's
        (row, u, half-width), off the builder's own `rim.apex` / `profileU`.
     3. The LAST LADDER GAP before the nib on each blade (rows n-8..n-1 with
        u, the emitted half-width and the mid-surface margin distance).
     4. The printed consequence: the within-shell census and per-shell
        orientation (tools/bloom-self-intersection.mjs), and the rim's
        |top - bot| at the hot profile (the emitted vertices).

   RUN: node tools/bloom-spoon-rim-turn.mjs [--quick]
   ========================================================================= */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUICK = process.argv.includes('--quick');
const G = await import(pathToFileURL(path.join(HERE, 'bloom-geometry.js')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(HERE, 'bloom-registry.js')).href);
const SI = await import(pathToFileURL(path.join(HERE, 'tools', 'bloom-self-intersection.mjs')).href);

/* the matrix's own curves (tools/bloom-harness.mjs, block 65) */
const O = {
  default: { mode: 'symmetric', points: [[0, 0.05], [0.15, 0.16], [0.36, 0.2286], [0.7, 0.178], [0.9, 0.1], [1, 0]] },
  spoon: { mode: 'symmetric', points: [[0, 0.03], [0.35, 0.05], [0.65, 0.2], [0.85, 0.22], [0.96, 0.12], [1, 0]] },
  rect: { mode: 'symmetric', points: [[0, 0.15], [0.1, 0.16], [0.9, 0.16], [0.97, 0.12], [1, 0]] },
};
const CV = (c) => ({ petalOutlineMode: 'CURVE', petalOutlineCurve: JSON.stringify(O[c]) });
const SHAPES = {
  'spoon (CURVE, waisted)': CV('spoon'),
  'near-rectangle (CURVE)': CV('rect'),
  'default curve (CURVE)': CV('default'),
  'LAW spatulate, tip 1.7': { petalBaseTaper: 3, petalTipTaper: 0.6, petalTipShape: 1.7 },
  'LAW spatulate, tip 2.5': { petalBaseTaper: 3, petalTipTaper: 0.6, petalTipShape: 2.5 },
  'LAW spatulate, tip 3.0': { petalBaseTaper: 3, petalTipTaper: 0.6, petalTipShape: 3 },
  'LAW default': {},
};
const SWEEPS = [
  ['cup', 'petalCup', QUICK ? [0, 0.6] : [0, 0.2, 0.4, 0.6, 0.8]],
  ['width', 'petalWidth', QUICK ? [16, 30] : [8, 16, 20, 24, 30]],
  ['length x cup 0.6', 'petalLength', QUICK ? [35] : [20, 35, 60]],
];
const rows = [];
for (const [sweep, id, vals] of SWEEPS) for (const [shape, s] of Object.entries(SHAPES)) {
  if (sweep.startsWith('length') && !/spoon|rectangle|tip 1.7/.test(shape)) continue;
  for (const v of vals) {
    const set = { ...s, [id]: v, ...(sweep.startsWith('length') ? { petalCup: 0.6 } : {}) };
    rows.push({ label: `${sweep} | ${shape} | ${v}`, sweep, shape, v, state: set, set: Object.entries(set).map(([k, x]) => ({ id: k, value: String(x) })) });
  }
}

/* 1. E2 through the gate's own clause */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'spoon-rim-'));
const rf = path.join(tmp, 'rows.json'), df = path.join(tmp, 'e2.json');
fs.writeFileSync(rf, JSON.stringify(rows.map(({ label, set }) => ({ label, set }))));
try { execFileSync(process.execPath, [path.join(HERE, 'tools', 'verify-bloom-edge-profile.mjs'), '--rows-file', rf, '--dump-e2', df], { cwd: HERE, env: { ...process.env, E2_AT: '1' }, stdio: ['ignore', 'ignore', 'ignore'] }); }
catch (e) { /* E2 fails on the over-allowance states by design: the dump is the result */ }
const E2 = JSON.parse(fs.readFileSync(df, 'utf8'));
if (Object.keys(E2).length !== rows.length) { console.error(`HARNESS INVALID: the gate measured ${Object.keys(E2).length} of ${rows.length} rows`); process.exit(2); }

/* 2-4. the site, the last ladder gap and the consequence, on the builder's own records */
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
function siteOf(state, at) {
  const acc = new G.MeshBuilder({ exportMode: true, captureRim: true });
  const b = G.buildBloomInto(acc, { ...DEFAULTS, ...state }, { below: null });
  let best = null, bd = Infinity, bp = null;
  for (const p of b.petalsAll || []) if (p && p.rim) for (const r of p.rim.apex) { const d = dist(r.apex, at); if (d < bd) { bd = d; best = r; bp = p; } }
  return { acc, b, rec: best, p: bp };
}
console.log('THE SPOON RIM TURN — E2 (EXPORT) read through the edge-profile gate\'s own clause; the site off the builder\'s own rim record.\n');
let last = '';
for (const r of rows) {
  const d = E2[r.label];
  if (r.sweep !== last) { console.log(`\n== ${r.sweep} ==`); last = r.sweep; }
  const { rec, p } = siteOf(r.state, d.at);
  const n = p.profileU.length - 1;
  const where = rec.row >= n - 6 ? 'NIB ARC' : rec.row === n - 7 ? 'last gap before the nib' : `u ${p.profileU[rec.row].toFixed(3)}`;
  console.log(`  ${r.shape.padEnd(24)} ${String(r.v).padEnd(4)} E2 ${d.deg.toFixed(2).padStart(6)} deg  row ${rec.row}/${n} u ${p.profileU[rec.row].toFixed(4)} h ${p.profile[rec.row].toFixed(3)} mm  ${rec.clamped ? 'clamped' : '       '}  ${where}`);
}

console.log('\n== the last ladder gap before the nib, cup 0.6, EXPORT (rows n-8 .. n-6) ==');
for (const shape of ['spoon (CURVE, waisted)', 'near-rectangle (CURVE)', 'LAW spatulate, tip 1.7', 'default curve (CURVE)', 'LAW default']) {
  const { p } = siteOf({ ...SHAPES[shape], petalCup: 0.6 }, [0, 0, 0]);
  const n = p.profileU.length - 1, L = DEFAULTS.petalLength;
  const cells = [n - 8, n - 7, n - 6].map((i) => `row ${i} u ${p.profileU[i].toFixed(4)} h ${p.profile[i].toFixed(3)}`).join('  |  ');
  const gap = (p.profileU[n - 6] - p.profileU[n - 7]) * L, fall = p.profile[n - 7] - p.profile[n - 6];
  console.log(`  ${shape.padEnd(24)} ${cells}   last gap ${gap.toFixed(3)} mm along, ${fall.toFixed(3)} mm of half-width`);
}

console.log('\n== the printed consequence (EXPORT): census, orientation, the rim at the first nib-arc row ==');
for (const shape of ['spoon (CURVE, waisted)', 'near-rectangle (CURVE)', 'LAW spatulate, tip 1.7']) for (const extra of [{ petalCup: 0 }, { petalCup: 0.6 }, ...(shape.startsWith('spoon') ? [{ petalWidth: 30 }] : [])]) {
  const { acc, p } = siteOf({ ...SHAPES[shape], ...extra }, [0, 0, 0]);
  const c = SI.census(acc.positions), o = SI.orientation(acc.positions);
  const n = p.profileU.length - 1;
  const r0 = p.rim.apex.find((r) => r.row === n - 6);
  console.log(`  ${shape.padEnd(24)} ${JSON.stringify(extra).padEnd(16)} tris ${acc.triangleCount}  within-shell pairs ${c.within}  shells ${o.shells} inward ${o.inward}  rim |top-bot| at row ${n - 6}: ${r0 ? dist(r0.top, r0.bot).toFixed(3) : '-'} mm (clamped ${r0 && r0.clamped})`);
}
fs.rmSync(tmp, { recursive: true, force: true });
