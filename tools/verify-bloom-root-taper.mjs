/* ===================================================================
   verify-bloom-root-taper.mjs — THE ROOT TAPER'S MUST-FAIL (big petals,
   Oct 21; read docs/bloom-big-petals-outcome.md).

     node tools/verify-bloom-root-taper.mjs [--control]

   WHY IT IS OWED. T1-T4 (`rootTaperAssertions` in tools/bloom-harness.mjs)
   read the THICKNESS off the exported file, and both STL gates carry them —
   but the apex mutant table never exports a file, so a mutant naming T1 there
   would report MISSED, which is indistinguishable from a clause that is
   genuinely blind (ST9's own lesson, `verify-bloom-stem-channel.mjs`). This
   is ST9's remedy for this family: the clauses are PURE functions of
   (positions, row, m, ui), so the artefact is built in Node on a MUTATED
   geometry module (positions rounded to float32, which is what the file
   stores) and the clause is imported from the UNMUTATED harness, whose own
   rebuild supplies the LOCATORS — so the file and the reference have
   different owners, which is the whole point.

   THE MUTANTS — Eva's three, and a fourth:
     the-taper-is-ignored            the law's root factor dropped from the
                                     ONE thickness law (thicknessProfile)
     the-hub-does-not-follow         footRing's hub left at the sheet
     the-thickness-read-from-a-row-count
                                     each row's thickness read at its INDEX
                                     over NU rather than its own station u —
                                     true only on a uniform ladder, which the
                                     turning ladder is not
     the-law-is-first-order          tau = zeta: the added material's own
                                     weight left out (a 100 mm root 12% thin)
   Each declares the T clause it must fire and a WITNESS asked of the MUTATED
   module's own build — the behaviour moved — before the clause is consulted,
   and never the clause it names (asking the gate whether the gate fired is
   the circularity the witness exists to avoid). Every anchor is checked to
   match bloom-geometry.js EXACTLY ONCE before any mutant runs.

   WITHOUT --control it runs the CLEAN tree on the probe rows and requires
   every clause silent (and the probes LIVE: a taper restated on each). With
   --control it runs the mutants and requires each to fire what it names.

   It rides in CI SPAWNED BY `verify-bloom-defaults-bar.mjs` (both arms), in
   bloom-export-watertight.yml's preflight, so no workflow file was edited
   (an edit to an existing workflow costs frozen tags — CLAUDE.md).
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as H from './bloom-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
const CONTROL = process.argv.includes('--control');

export const MUTANTS = [
  { id: 'the-taper-is-ignored', names: ['T1', 'T2'],
    from: '    at(u) { return base * rootTaper.at(u) * (1 - thin * u); },',
    to: '    at(u) { return base * (1 - thin * u); },',
    witness: (M, C) => { const m = root(M, 'BIG PETALS: 100 mm (root x3.236, 3.88 mm — the 15 cm bloom at tilt 25)'), c = root(C, 'BIG PETALS: 100 mm (root x3.236, 3.88 mm — the 15 cm bloom at tilt 25)'); return m.rootMm !== c.rootMm ? null : `the root still reads ${m.rootMm} mm`; } },
  { id: 'the-hub-does-not-follow', names: ['T3'],
    from: '  const hubThickness = hubRootTaper === null ? thickness : thickness * hubRootTaper.rootFactor;',
    to: '  const hubThickness = thickness;',
    witness: (M, C) => { const m = root(M, 'BIG PETALS: 100 mm (root x3.236, 3.88 mm — the 15 cm bloom at tilt 25)'), c = root(C, 'BIG PETALS: 100 mm (root x3.236, 3.88 mm — the 15 cm bloom at tilt 25)'); return m.hubMm !== c.hubMm ? null : `the hub still reads ${m.hubMm} mm`; } },
  { id: 'the-thickness-read-from-a-row-count', names: ['T2'],
    from: '    const t = tAt(row.u);\n    row.tUsed = t; acc.noteSheet(t);',
    to: '    const t = tAt(row.u === 0 ? 0 : Math.max(0, (i - baseEnd) / NU));\n    row.tUsed = t; acc.noteSheet(t);',
    witness: (M, C) => { const m = root(M, 'BIG PETALS: 100 mm (root x3.236, 3.88 mm — the 15 cm bloom at tilt 25)'), c = root(C, 'BIG PETALS: 100 mm (root x3.236, 3.88 mm — the 15 cm bloom at tilt 25)'); const d = m.rowT.reduce((a, t, i) => Math.max(a, Math.abs(t - c.rowT[i])), 0); return d > 1e-6 ? null : `no row's thickness moved (worst ${d})`; } },
  { id: 'the-law-is-first-order', names: ['T1'],
    from: '  if (!(zeta > 1)) return 1;\n  const n = Math.max(1, Math.ceil((zeta - 1) * ROOT_TAPER_STEPS_PER_UNIT));',
    to: '  if (!(zeta > 1)) return 1;\n  return zeta;\n  const n = Math.max(1, Math.ceil((zeta - 1) * ROOT_TAPER_STEPS_PER_UNIT));',
    witness: (M, C) => { const a = M.rootTaperFactor(100 / 35), b = C.rootTaperFactor(100 / 35); return a !== b ? null : `tau(100 / 35) still reads ${a}`; } },
];
/* THE PROBE ROWS — matrix rows by label (one owner of the states), each with
   the taper LIVE on it (asserted). */
export const PROBES = [
  'BIG PETALS: 100 mm (root x3.236, 3.88 mm — the 15 cm bloom at tilt 25)',
  'BIG PETALS: 60 mm x cup 1.2',
  'BIG PETALS: 100 mm x 3 layers (each whorl its own asked length)',
  'BIG PETALS: 100 mm x tip thinning 0.5 (the law\'s second factor)',
  'BIG PETALS: 100 mm on a hemisphere (rise 1 — the shell thickens)',
  'BIG PETALS: 100 mm x stem 60 x 6 (the join floor is the thickened hub)',
  'BIG PETALS: 100 mm x 8 sepals (pinned off — a sepal\'s root is the sheet)',
];
const MATRIX = H.buildMatrix();
const KIND = new Map(H.CONTROLS.map((c) => [c.id, c]));
function rowOf(label) {
  const r = MATRIX.find((x) => x.label === label);
  if (!r) throw new Error(`verify-bloom-root-taper: no matrix row "${label}" — the probe state has moved; re-pick it`);
  return r;
}
function stateOf(row) {
  const s = { ...H.DEFAULTS };
  for (const w of row.set || []) {
    if (w.id === H.SCOPES_SET_ID) continue;
    const c = KIND.get(w.id); if (!c) throw new Error(`${row.label}: no control ${w.id}`);
    s[w.id] = c.kind === 'slider' ? Number(w.value) : w.value;
  }
  return s;
}
function buildOn(G, row) {
  const ui = stateOf(row);
  const acc = new G.MeshBuilder({ exportMode: true });
  const rec = G.buildBloomInto(acc, ui, { below: null, capability: row.capability || null, scopes: H.rowScopesForBuild(row) });
  return { ui, acc, rec };
}
function root(G, label) {
  const { rec } = buildOn(G, rowOf(label));
  return { rootMm: rec.petal.thickness.base, hubMm: rec.hub.thickness };
}
function rootGrid(G, label) {
  const row = rowOf(label), ui = stateOf(row);
  const acc = new G.MeshBuilder({ exportMode: true, captureGrid: true });
  const rec = G.buildBloomInto(acc, ui, { below: null, capability: row.capability || null, scopes: H.rowScopesForBuild(row) });
  return rec.petal.grid[0].rows.map((r) => r.thickness);
}
/* the page-side metrics T reads, from a build of the given module — the
   same fields bloom.js hands __bloomMetrics, built the same way */
function metricsOf(rec) {
  const ps = rec.petals, f = rec.foot;
  return {
    rings: rec.rings, continuousMode: f.continuousMode, fan: f.fan || null, mirror: f.mirror, slotCount: f.slotCount,
    hubDome: rec.hub.dome || null, petalsBuilt: rec.petalsBuilt, stemOmission: rec.stemOmission || null,
    petalRingRootRows: ps.map((p) => (p ? { C: p.rootRow.C, N: p.rootRow.N, azimuth: p.azimuth, petalTiltApplied: p.applied.petalTilt } : null)),
    petalRingApplied: ps.map((p) => (p ? { slotIndex: p.slotIndex, whorl: p.whorl, applied: p.applied, formTerm: p.formTerm ?? null, scope: null } : null)),
    petalRingTipCap: ps.map((p) => (p ? p.tipCap : null)),
    petalRingBladeLadder: ps.map((p) => (p ? p.bladeLadder : null)),
  };
}
function fire(G, label) {
  const row = rowOf(label);
  const { ui, acc, rec } = buildOn(G, row);
  const positions = new Float64Array(acc.positions.length);
  for (let i = 0; i < positions.length; i++) positions[i] = Math.fround(acc.positions[i]);
  return { bad: H.rootTaperAssertions(positions, row, metricsOf(rec), ui), live: (rec.petals || []).some((p) => p && p.thickness && p.thickness.rootTaper) };
}
const fams = (bad) => new Set(bad.map((b) => (b.match(/^(T\d+):/) || [])[1]).filter(Boolean));

const failures = [];
for (const mu of MUTANTS) {
  const n = SRC.split(mu.from).length - 1;
  if (n !== 1) failures.push(`${mu.id}: its anchor matches bloom-geometry.js ${n} times, not once — the mutant is disarmed (re-anchor it)`);
}
if (failures.length) { for (const f of failures) console.error(`FAIL ${f}`); process.exit(1); }

const CLEAN = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
if (!CONTROL) {
  for (const label of PROBES) {
    const { bad, live } = fire(CLEAN, label);
    if (!live) failures.push(`${label}: the probe builds no tapered petal — it is not in the family's subject`);
    if (bad.length) failures.push(`${label}: the CLEAN tree fires ${bad.slice(0, 3).join(' | ')}`);
    console.log(`${bad.length || !live ? 'FAIL' : 'ok  '}  clean  ${label}`);
  }
} else {
  const WDIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-root-taper-'));
  for (const mu of MUTANTS) {
    const d = path.join(WDIR, mu.id); fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'bloom-geometry.js'), SRC.replace(mu.from, mu.to));
    fs.copyFileSync(path.join(ROOT, 'bloom-curve.js'), path.join(d, 'bloom-curve.js'));
    const M = await import(pathToFileURL(path.join(d, 'bloom-geometry.js')).href);
    /* THE WITNESS FIRST — the behaviour moved on the mutated module itself */
    let w;
    try { w = mu.id === 'the-thickness-read-from-a-row-count'
      ? (() => { const a = rootGrid(M, PROBES[0]), b = rootGrid(CLEAN, PROBES[0]); const dd = a.reduce((x, t, i) => Math.max(x, Math.abs(t - b[i])), 0); return dd > 1e-6 ? null : `no row's thickness moved (worst ${dd})`; })()
      : mu.witness(M, CLEAN); } catch (e) { w = `the witness threw: ${e.message}`; }
    if (w !== null) { failures.push(`${mu.id}: the edit applied but the BEHAVIOUR did not move — ${w}`); console.log(`FAIL  ${mu.id}: inert (${w})`); continue; }
    const seen = new Set();
    for (const label of PROBES) for (const f of fams(fire(M, label).bad)) seen.add(f);
    const missed = mu.names.filter((f) => !seen.has(f));
    if (missed.length) failures.push(`${mu.id}: names ${mu.names.join(', ')} and ${missed.join(', ')} stayed SILENT over every probe (fired: ${[...seen].join(', ') || 'nothing'})`);
    console.log(`${missed.length ? 'FAIL' : 'ok  '}  ${mu.id}: names ${mu.names.join(', ')} · fired ${[...seen].sort().join(', ') || 'nothing'}`);
  }
}
if (failures.length) { console.error('\nverify-bloom-root-taper: FAILED'); for (const f of failures) console.error(`  - ${f}`); process.exit(1); }
console.log(`\nverify-bloom-root-taper: PASS — ${CONTROL ? `${MUTANTS.length} of ${MUTANTS.length} mutants fired the clause they name, each witnessed on its mutated module` : `${PROBES.length} probe rows, every clause silent on the clean tree and the taper live on each`}`);
