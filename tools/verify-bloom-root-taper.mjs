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

   THE MUTANTS — Eva's three, a fourth, and root support's four (Oct 21):
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
     the-sepal-pin-is-restored       the big-petals pin back on the sepal
                                     substate: a 120 mm sepal on the sheet (T4)
     the-leaf-reads-the-petals-length
                                     the simple leaf's law at the PETAL's
                                     length, not its own (T5)
     the-leaflet-reads-the-rachis-length
                                     every compound leaflet at the RACHIS's
                                     length (T5, on the default 26 / 30 mm
                                     leaflets of a 120 mm rachis)
     the-petiole-stays-the-wire      a 120 mm simple leaf's petiole left at
                                     the wire under its thickened root (T6)
     the-foot-cap-is-typed-back-to-10-mm
                                     the derived foot cap replaced by the
                                     retired constant (FC1 — the same pure
                                     clause junctionAssertions carries, run
                                     here on the mutated module's rings)
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
/* `--only=<id>[,...]` runs a subset of the mutants (every anchor is still
   checked); the run says it is a subset and never reports it as the sweep */
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);

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
    from: 'function rootTaperIntegrate(zeta) {\n  const n = Math.max(1, Math.ceil((zeta - 1) * ROOT_TAPER_STEPS_PER_UNIT));',
    to: 'function rootTaperIntegrate(zeta) {\n  return zeta;\n  const n = Math.max(1, Math.ceil((zeta - 1) * ROOT_TAPER_STEPS_PER_UNIT));',
    witness: (M, C) => { const a = M.rootTaperFactor(100 / 35), b = C.rootTaperFactor(100 / 35); return a !== b ? null : `tau(100 / 35) still reads ${a}`; } },
  /* ROOT SUPPORT (Oct 21) — Eva's four: the organs that now take the law, and
     the derived foot cap. */
  { id: 'the-sepal-pin-is-restored', names: ['T4'],
    from: "petalInfill: 'NONE' };\n  for (const [petalId, sepalId] of SEPAL_TWINS)",
    to: "petalInfill: 'NONE', rootTaper: 'OFF' };\n  for (const [petalId, sepalId] of SEPAL_TWINS)",
    witness: (M, C) => { const m = sepalRoot(M, SEPAL_120), c = sepalRoot(C, SEPAL_120); return m !== c ? null : `the sepal's root still reads ${m} mm`; } },
  { id: 'the-leaf-reads-the-petals-length', names: ['T5'],
    from: 'leafBladeLaw(acc, bs, plan.widthMm, Lmm, state.sheetThickness, Lmm);',
    to: 'leafBladeLaw(acc, bs, plan.widthMm, Lmm, state.sheetThickness, Number(state.petalLength));',
    witness: (M, C) => { const m = leafRoot(M, LEAF_120), c = leafRoot(C, LEAF_120); return m !== c ? null : `the leaf's root factor still reads ${m}`; } },
  { id: 'the-leaflet-reads-the-rachis-length', names: ['T5'],
    from: 'leafBladeLaw(acc, bs, sp.W, sp.L, state.sheetThickness, sp.L);',
    to: 'leafBladeLaw(acc, bs, sp.W, sp.L, state.sheetThickness, Number(state.leafLength));',
    witness: (M, C) => { const m = leafRoot(M, LEAFLETS_DEFAULT), c = leafRoot(C, LEAFLETS_DEFAULT); return m !== c ? null : `the first leaflet's root factor still reads ${m}`; } },
  { id: 'the-petiole-stays-the-wire', names: ['T6'],
    from: 'lobedPetiole ? lobedPetiole.radiusMm : simplePetiole ? simplePetiole.radiusMm : petioleR0;',
    to: 'lobedPetiole ? lobedPetiole.radiusMm : petioleR0;',
    witness: (M, C) => { const m = petioleR(M, LEAF_120), c = petioleR(C, LEAF_120); return m !== c ? null : `the petiole still reads ${m} mm`; } },
  { id: 'the-foot-cap-is-typed-back-to-10-mm', names: ['FC1'],
    from: '    const footArcMm = radius * footSpanRad;\n    const footCapped = p.width > footArcMm;',
    to: '    const footArcMm = 10;\n    const footCapped = p.width > footArcMm;',
    witness: (M, C) => { const m = ringWidths(M, WIDE_40), c = ringWidths(C, WIDE_40); return m.join() !== c.join() ? null : `every ring's foot still reads ${m.join(', ')} mm`; } },
];
const SEPAL_120 = 'ROOT SUPPORT: 8 sepals x 120 mm (the hub held to the sepal root)';
const LEAF_120 = 'ROOT SUPPORT: simple leaf 120 mm x stem 60 (the petiole carries the root)';
const LEAFLETS_DEFAULT = 'ROOT SUPPORT: COMPOUND 120 mm rachis x the default leaflets (the rachis is not the leaflet)';
const WIDE_40 = 'ROOT SUPPORT: width 46 x 40 petals';
/* THE PROBE ROWS — matrix rows by label (one owner of the states), each with
   the taper LIVE on it (asserted). */
export const PROBES = [
  'BIG PETALS: 100 mm (root x3.236, 3.88 mm — the 15 cm bloom at tilt 25)',
  'BIG PETALS: 60 mm x cup 1.2',
  'BIG PETALS: 100 mm x 3 layers (each whorl its own asked length)',
  'BIG PETALS: 100 mm x tip thinning 0.5 (the law\'s second factor)',
  'BIG PETALS: 100 mm on a hemisphere (rise 1 — the shell thickens)',
  'BIG PETALS: 100 mm x stem 60 x 6 (the join floor is the thickened hub)',
  'BIG PETALS: 100 mm x 8 sepals (each sepal its own 60 mm root — root support lifted the pin)',
  'ROOT SUPPORT: 8 sepals x 120 mm (the hub held to the sepal root)',
  'ROOT SUPPORT: 2 sepal tiers x 60 mm x stem 120 x 12 (each tier its own length)',
  'ROOT SUPPORT: simple leaf 120 mm x stem 60 (the petiole carries the root)',
  'ROOT SUPPORT: simple leaf 120 mm x stem 60 x 3 mm (the stem caps the petiole — told)',
  'ROOT SUPPORT: LOBED leaf 120 mm x stem 60',
  'ROOT SUPPORT: COMPOUND 120 mm rachis x 60 mm leaflets (each leaflet its own length)',
  'ROOT SUPPORT: COMPOUND 120 mm rachis x the default leaflets (the rachis is not the leaflet)',
  'ROOT SUPPORT: width 46 x 40 petals',
  'ROOT SUPPORT: width 46 on the FAN (the fan step is the foot\'s span)',
];
/* probes whose subject is the FOOT CAP (FC) and not the taper — no taper is
   asked of them, the cap is asked to BIND (asserted) */
const FC_PROBES = new Set(['ROOT SUPPORT: width 46 x 40 petals', 'ROOT SUPPORT: width 46 on the FAN (the fan step is the foot\'s span)']);
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
function sepalRoot(G, label) {
  const { rec } = buildOn(G, rowOf(label));
  const p = rec.sepals.tiers[0].built.find(Boolean);
  return p.thickness.base;
}
function leafRoot(G, label) {
  const { rec } = buildOn(G, rowOf(label));
  const B = rec.leavesBuilt.find(Boolean);
  const r = B.compound ? B.leaflets[0].rootTaper : B.rootTaper;
  return r ? r.rootFactor : 1;
}
function petioleR(G, label) {
  const { rec } = buildOn(G, rowOf(label));
  return rec.leavesBuilt.find(Boolean).petioleAxis.radiusEmittedMm;
}
function ringWidths(G, label) {
  const { rec } = buildOn(G, rowOf(label));
  return rec.rings.map((r) => r.width);
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
  const bad = H.rootTaperAssertions(positions, row, metricsOf(rec), ui);
  /* FC1 — the foot cap, the same pure clause junctionAssertions carries, on
     this module's ring records and emitted foot frames */
  rec.rings.forEach((r, L) => { for (const msg of H.footCapClauses(r, L, ui, rec.petals[L] ? rec.petals[L].footFrames : null)) bad.push(msg); });
  const tapered = (p) => !!(p && p.thickness && p.thickness.rootTaper);
  const live = FC_PROBES.has(label)
    ? rec.rings.some((r) => r.widthClampedHigh)
    : (rec.petals || []).some(tapered)
      || (rec.sepals && rec.sepals.tiers || []).some((T) => (T.built || []).some(tapered))
      || (rec.leavesBuilt || []).some((B) => B && (B.compound ? (Number(ui.leafLength) > H.ROOT_TAPER_REF_RULED_MM) : B.rootTaper));
  return { bad, live };
}
const fams = (bad) => new Set(bad.map((b) => (b.match(/^(T\d+|FC\d+):/) || [])[1]).filter(Boolean));

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
    if (!live) failures.push(`${label}: the probe builds ${FC_PROBES.has(label) ? 'no capped foot' : 'no tapered blade (petal, sepal or leaf)'} — it is not in the family's subject`);
    if (bad.length) failures.push(`${label}: the CLEAN tree fires ${bad.slice(0, 3).join(' | ')}`);
    console.log(`${bad.length || !live ? 'FAIL' : 'ok  '}  clean  ${label}`);
  }
} else {
  const WDIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-root-taper-'));
  for (const mu of MUTANTS) {
    if (ONLY.length && !ONLY.includes(mu.id)) continue;
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
console.log(`\nverify-bloom-root-taper: PASS — ${CONTROL && ONLY.length ? `a SUBSET: ${ONLY.length} of ${MUTANTS.length} mutants (${ONLY.join(', ')}) fired the clause they name` : CONTROL ? `${MUTANTS.length} of ${MUTANTS.length} mutants fired the clause they name, each witnessed on its mutated module` : `${PROBES.length} probe rows, every clause silent on the clean tree and the taper live on each`}`);
