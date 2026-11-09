#!/usr/bin/env node
/* ===================================================================
   A LAYER'S OWN PETAL COUNT — THE MUST-FAIL (Nov 8, Eva's rulings on §18:
   option A; read §19 of docs/bloom-photo-to-bloom-discovery.md).

   WHY THIS EXISTS. The PC family (`petalCountClauses` in the harness) rides in
   both STL gates through zygoAssertions — and the apex mutant table never
   runs the Z family, so nothing there could ever show PC fire. A family nobody
   has seen fire is not evidence. This tool is ST9's remedy (and the root
   taper's): PC is a PURE function of a metrics record, the controls and the
   row, so the artefact is built on a MUTATED copy of bloom-geometry.js while
   the clause is imported from the UNMUTATED harness — the reference (the row's
   own `@scopes`, restated) and the quantity (the mutated build) then have
   DIFFERENT OWNERS. SV1 (the emitted azimuths against the restated phase law)
   is pure too and runs beside it, because a phase law can be wrong in the
   azimuths while its record is right.

   THE CLEAN ARM builds every state below and requires every clause silent.
   `--control` runs each mutant: its anchor must match exactly once (checked
   for ALL before any runs), its WITNESS (a direct reading of the mutated
   module's own build, never the clause) must say the behaviour moved, and the
   clauses it names must fire — and no clause it does not name.

   RUN:  node tools/verify-bloom-layer-count.mjs [--control]
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as H from './bloom-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.argv.includes('--control');
const SCOPES = H.SCOPES_SET_ID;

/* the states: block 86's own rows, by label — one owner of the fixtures */
const LABELS = [
  'LAYER PETALS: RADIAL x 3 — layer 2 owns 12 (layer phase INACTIVE between layers 1-2 and 2-3, told)',
  'LAYER PETALS: a run below an inactive pair — layers 2 and 3 own 5 under the global 8 (inactive 1-2, the phase steps again 2-3)',
  "LAYER PETALS: one whorl — layer 1 owns 5 under the global 8 (the area rule's single-whorl arm)",
  "LAYER PETALS: the outer whorl owns 4, 8 sepals asked (built 4 — the sepals read the OUTER whorl's count, told)",
  'LAYER PETALS: SNAPPED — layer 2 asks 4.6 (built 5, told)',
  'LAYER PETALS: SPIRAL x 3 turns of 13 / 8 / 5 (turn 3 below the legibility flag — flagged)',
  'LAYER PETALS: SPIRAL x 3 turns of 13 / 8 / 8 (every turn at or above the legibility flag — not flagged)',
  "LAYER PETALS: the photo WATER LILY (v7) at 4 / 10 with its four sepals (on the outer whorl's pitch; the inner whorl's first petal half its own pitch over)",
  'LAYER PETALS: the default — RADIAL x 3 layers, per-layer ON, no layer owns its count (every whorl the global 8)',
];
const MATRIX = H.buildMatrix();
const ROWS = LABELS.map((l) => { const r = MATRIX.find((x) => x.label === l); if (!r) throw new Error(`verify-bloom-layer-count: no matrix row "${l}"`); return r; });
const kindOf = new Map(H.CONTROLS.map((c) => [c.id, c]));
const stateOf = (row) => {
  const s = { ...H.DEFAULTS };
  for (const w of row.set || []) {
    if (w.id === SCOPES) continue;
    const c = kindOf.get(w.id); if (!c) throw new Error(`${row.label}: no control ${w.id}`);
    s[w.id] = c.kind === 'slider' ? Number(w.value) : c.kind === 'curve' && typeof w.value === 'string' ? JSON.parse(w.value) : w.value;
  }
  return s;
};
/* the controls as the page's __bloomUIState reports them: strings */
const uiOf = (st) => Object.fromEntries(Object.entries(st).map(([k, v]) => [k, typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)]));

/* a Node build's metrics, the fields petalCountClauses and SV1 read, off the
   build the way bloom.js's __bloomMetrics() reads them off the page's */
function metricsOf(G, st, row) {
  const acc = new G.MeshBuilder({ exportMode: false });
  const b = G.buildBloomInto(acc, st, { below: null, scopes: H.rowScopesForBuild(row) });
  const fr = b.foot;
  return {
    continuousMode: fr.continuousMode, headAbsent: false, sphereMode: !!fr.sphereMode, fan: fr.fan || null, slotCount: fr.slotCount,
    rings: fr.rings.map((r) => ({ ownCount: r.ownCount ? { ...r.ownCount } : null, authoredWidth: r.authoredWidth, thickness: r.thickness, footCount: r.footCount, phase: r.phase })),
    derivedRadius: fr.rings[0].derivedRadius, countsOwned: fr.countsOwned === true, whorlCounts: fr.whorlCounts, phaseInactive: fr.phaseInactive || [],
    slotAzimuths: b.slotAzimuths.map((a) => [...a]), spacingVariance: b.spacingVariance ?? null, varianceSpacingAbsent: b.varianceSpacingAbsent ?? true,
    sepal: fr.sepals ? { ceiling: fr.sepals.ceiling, pitchRad: fr.sepals.pitchRad, count: fr.sepals.count } : null,
    spiralShortTurns: fr.spiralShortTurns ?? null,
  };
}
function clausesOn(G, row) {
  const st = stateOf(row), ui = uiOf(st), m = metricsOf(G, st, row);
  const msgs = [...H.petalCountClauses(m, ui, row), ...H.spacingVarianceAssertions(m, ui, row).filter((x) => /^SV1:/.test(x))];
  return { m, msgs };
}
const famsOf = (msgs) => new Set(msgs.map((x) => (/^([A-Z]+\d+):/.exec(x) || [])[1]).filter(Boolean));

async function loadGeometry(mut) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'layer-count-'));
  for (const f of ['bloom-geometry.js', 'bloom-registry.js', 'bloom-file.js', 'bloom-curve.js']) fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
  fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}');
  if (mut) {
    const src = fs.readFileSync(path.join(dir, 'bloom-geometry.js'), 'utf8');
    fs.writeFileSync(path.join(dir, 'bloom-geometry.js'), src.replace(mut.find, mut.into));
  }
  return import(pathToFileURL(path.join(dir, 'bloom-geometry.js')).href);
}

const LILY4 = ROWS[3], RUN = ROWS[1], ONE = ROWS[2], SNAP = ROWS[4], TWELVE = ROWS[0], SPIRAL5 = ROWS[5], LILY = ROWS[7];
const MUTANTS = [
  { id: 'the-area-rule-sums-the-global', names: ['PC3'], why: 'the whorl carries its own count but the area rule still sums the global — R0, and every ring a fraction of it, stands on feet that are not there',
    find: '    const footCount = whorlCount;', into: '    const footCount = slotCount;',
    witness: (M, C) => { const a = metricsOf(M, stateOf(TWELVE), TWELVE).derivedRadius, b = metricsOf(C, stateOf(TWELVE), TWELVE).derivedRadius; return a !== b ? null : `R0's derived radius ${a} did not move`; } },
  { id: 'the-whorl-keeps-the-global-count', names: ['PC1', 'SV1'], why: 'the record names the owned count and the whorl primitive lays the global number of petals — the control reads 12 over a whorl of 8, watertight and one piece',
    find: '      count: ring.ownCount ? ring.ownCount.built : fr.slotCount,', into: '      count: fr.slotCount,',
    witness: (M) => { const a = metricsOf(M, stateOf(TWELVE), TWELVE).slotAzimuths[1].filter((x) => x !== undefined).length; return a === 8 ? null : `whorl 2 still emits ${a}`; } },
  { id: 'the-phase-stays-active-across-counts', names: ['SV1', 'PC5'], why: 'the record still names the inactive pairs, but every whorl takes the old global-pitch phase — 0.5 of an 8-petal pitch on a 12-petal whorl, the pairing Eva ruled has no meaning',
    find: '      phase: (continuousMode || fanMode) ? 0 : countPhases ? countPhases[L] : (p.lambda * state.layerPhase * TAU) / state.petalCount,',
    into: '      phase: (continuousMode || fanMode) ? 0 : (p.lambda * state.layerPhase * TAU) / state.petalCount,',
    witness: (M, C) => { const a = metricsOf(M, stateOf(RUN), RUN).rings[1].phase, b = metricsOf(C, stateOf(RUN), RUN).rings[1].phase; return a !== b ? null : `whorl 2's phase ${a} did not move`; } },
  { id: 'the-inactive-pairs-are-never-named', names: ['PC2'], why: 'the phase law runs but the record names no inactive pair — the read-out the ruling asks for says nothing',
    find: '      if (L > 0 && raw[L].whorlCount !== raw[L - 1].whorlCount) { start = L; out.push(out[L - 1] + Math.PI / raw[L].whorlCount); phaseInactive.push(L); continue; }',
    into: '      if (L > 0 && raw[L].whorlCount !== raw[L - 1].whorlCount) { start = L; out.push(out[L - 1] + Math.PI / raw[L].whorlCount); continue; }',
    witness: (M) => { const a = metricsOf(M, stateOf(TWELVE), TWELVE).phaseInactive; return a.length === 0 ? null : `the record still names ${a}`; } },
  /* §19.5 item 4 (ruled Nov 8): the phase the FIRST build shipped — the inner
     whorl on the outer's angle, no half pitch */
  { id: 'the-inactive-phase-is-aligned', names: ['PC5', 'SV1'], why: "across a pair whose counts differ the inner whorl's first petal lands ON the outer's angle — the first build, which Eva's ruling replaced with half the inner whorl's own pitch",
    find: 'out.push(out[L - 1] + Math.PI / raw[L].whorlCount);', into: 'out.push(out[L - 1]);',
    witness: (M) => { const a = metricsOf(M, stateOf(LILY), LILY).slotAzimuths; return Math.abs(a[1][0] - a[0][0]) < 1e-12 ? null : `the water lily's inner first petal stands ${a[1][0] - a[0][0]} rad past the outer's`; } },
  /* §19.5 item 3 (ruled Nov 8): the flag the FIRST build shipped — the global */
  { id: 'the-spiral-flag-reads-the-global', names: ['PC6'], why: 'a 5-petal turn in 13 / 8 / 5 under a global 8 is not flagged — the short turn reads as phyllotaxis it cannot be',
    find: '      ? raw.map((q, L) => ({ turn: L, count: q.ownCount ? q.ownCount.built : n })).filter((t) => t.count < SPIRAL_LEGIBLE_COUNT)',
    into: '      ? raw.map((q, L) => ({ turn: L, count: n })).filter((t) => t.count < SPIRAL_LEGIBLE_COUNT)',
    witness: (M) => { const t = metricsOf(M, stateOf(SPIRAL5), SPIRAL5).spiralShortTurns; return t && t.length === 0 ? null : `the short turns read ${JSON.stringify(t)}`; } },
  { id: 'the-snap-is-never-recorded', names: ['PC0'], why: 'a file asking 4.6 builds 5 and the record says nothing snapped — the asked-vs-built read-out goes silent',
    find: '  return { asked, built, snapped: built !== asked };', into: '  return { asked, built, snapped: false };',
    witness: (M) => { const r = metricsOf(M, stateOf(SNAP), SNAP).rings[1].ownCount; return r && r.snapped === false && r.built === 5 ? null : `the record reads ${JSON.stringify(r)}`; } },
  { id: 'the-sepals-read-the-global', names: ['PC4'], why: 'the sepals keep the global count and pitch over an outer whorl that owns 4 — 8 sepals over 4 petals, the defect the ruling names',
    find: "    const nOuter = !fanMode && !continuousMode && rings[0].ownCount ? rings[0].ownCount.built : n;", into: '    const nOuter = n;',
    witness: (M) => { const s = metricsOf(M, stateOf(LILY4), LILY4).sepal; return s && s.ceiling === 8 ? null : `the sepal ceiling reads ${s && s.ceiling}`; } },
  { id: 'the-single-whorl-arm-keeps-the-global', names: ['PC3'], why: "one whorl owning its count: the area rule's guarded single-whorl arm multiplies by the global count — a second route to the wrong R0",
    find: '    ? raw[0].rFoot * Math.sqrt(raw[0].footCount)', into: '    ? raw[0].rFoot * Math.sqrt(slotCount)',
    witness: (M, C) => { const a = metricsOf(M, stateOf(ONE), ONE).derivedRadius, b = metricsOf(C, stateOf(ONE), ONE).derivedRadius; return a !== b ? null : `the single whorl's R0 ${a} did not move`; } },
];

const SRC = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
const stale = MUTANTS.filter((mu) => SRC.split(mu.find).length !== 2);
if (stale.length) { console.log(`verify-bloom-layer-count: FAILED — anchor(s) not matching exactly once: ${stale.map((m) => m.id).join(', ')}`); process.exit(1); }

const C = await loadGeometry(null);
let failed = 0;
for (const row of ROWS) {
  const { msgs } = clausesOn(C, row);
  if (msgs.length) { failed++; console.log(`FAIL  clean: ${row.label}\n      ${msgs.slice(0, 3).join('\n      ')}`); }
  else console.log(`ok    clean: ${row.label.slice(0, 110)}`);
}
if (CONTROL) {
  for (const mu of MUTANTS) {
    const M = await loadGeometry(mu);
    const w = mu.witness(M, C);
    if (w) { failed++; console.log(`FAIL  ${mu.id}: the witness says the behaviour did not move (${w})`); continue; }
    const fired = new Set();
    /* A ROW WHOSE BUILD THROWS under the mutant is a LOUD failure (the page
       would not build at all), never the silent defect this table exists for:
       it is named and set aside, and the mutant must still fire its clause on
       the rows that do build */
    const threw = [];
    for (const row of ROWS) {
      let r = null;
      try { r = clausesOn(M, row); } catch (e) { threw.push(row.label.slice(14, 60)); continue; }
      for (const f of famsOf(r.msgs)) fired.add(f);
    }
    if (threw.length) console.log(`      (${mu.id}: the build THREW on ${threw.length} row(s), set aside as loud — ${threw.join('; ')})`);
    const missed = mu.names.filter((n) => !fired.has(n)), extra = [...fired].filter((f) => !mu.names.includes(f));
    if (missed.length || extra.length) { failed++; console.log(`FAIL  ${mu.id}: names ${mu.names.join(', ')} · fired ${[...fired].join(', ') || 'nothing'}${missed.length ? ` · MISSED ${missed.join(', ')}` : ''}${extra.length ? ` · UNCLAIMED ${extra.join(', ')}` : ''}`); }
    else console.log(`ok    ${mu.id}: names ${mu.names.join(', ')} · fired ${[...fired].join(', ')}`);
  }
}
console.log(failed ? `\nverify-bloom-layer-count: FAILED — ${failed} finding(s)` : `\nverify-bloom-layer-count: PASS — ${ROWS.length} states clean${CONTROL ? `; ${MUTANTS.length} of ${MUTANTS.length} mutants fired the clause they name, each witnessed on its mutated module` : ''}`);
process.exit(failed ? 1 : 0);
