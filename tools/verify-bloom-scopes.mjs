#!/usr/bin/env node
/* THE SCOPES GATE — the parameter-scoping STATE MODEL (Scoping-a; feature map
   §3 and §11, Eva's rulings Q3.1–Q3.9). ZERO controls reach the model; it is
   reached by the design file's `overrides` containers and by the page's
   `__bloomScopes` hook, and this gate is the only witness that the resolution
   does what the model says — a petal's effective state is

     global -> the role table -> + layer offsets -> + petal offsets (one scope
     per mirror pair) -> + the variance slot term -> the ONE clamp

   resolved in `resolveRoleOverrides` and nowhere else (bloom-geometry.js,
   PARAMETER SCOPING). Both STL gates are structurally blind to all of it: a
   scoped build is a perfectly good watertight bloom whatever the offsets did.

   THE CLAUSES
     SO0  THE MODEL'S CENSUS, from independent owners: `SCOPE_UNSCOPED` is
          exactly sheet thickness; `SCOPEABLE_IDS` is exactly the registry's
          petal-role sliders less the unscoped, the role-delta and the
          whorl-level sets, restated HERE from the registry and the role table;
          `scopeBounds()` is the registry's own min/max.
     SO1  EMPTY SCOPES ARE THE IDENTITY BY BRANCH: a build with no scopes and a
          build with empty containers emit the same floats positionally under
          `Object.is`, both modes, on eleven named rows (`--smoke`: the smoke
          subset; `--full`: every row), and every petal records `scopeTerm:
          null`. The whole-matrix claim against the BASE tree is
          verify-bloom-surface-bytes', run at the close.
     SO2  A LAYER OFFSET MOVES ONLY THAT LAYER (per-layer values live —
          RADIAL + `scopeLayers` ON, Scoping-b): on a three-layer bloom an
          offset on layer 1 moves every layer-1 petal's `applied` by exactly
          the offset and leaves every other layer's petal BIT-IDENTICAL (its
          captured lamina) to the unscoped build's.
     SO3  A PETAL OFFSET MOVES ONLY THAT PETAL AND ITS MIRROR PARTNER
          (per-petal values live — FAN + `scopePetals` ON): through a slot and
          through the gap, the offset reaches slot i and its partner (restated
          from the fan's own involution) and no other slot; an entry naming
          the partner builds the identical bloom; the mirror-line petal is a
          pair of one.
     SO4  OFFSETS COMPOSE WITH THE EXISTING CLAMP, BEFORE IT, AND UNDER A LIVE
          TOGGLE A ROLE DELTA DOES NOT STACK: an offset past the base's range
          lands ON the range end; a RADIAL labellum delta under per-layer and a
          FAN group delta under per-petal are inert (base + offset, exactly two
          petals carry a pair's term); under the variance field every composed
          value stays inside the base's range.
     SO5  SHEET THICKNESS IGNORES ANY OFFSET: the file's reader REFUSES the key
          with a note and keeps the rest of the entry; the geometry THROWS on a
          scopes object carrying it, live or kept; a build offsetting every
          scopeable control leaves every ring's thickness what it was.
     SO6  Q3.5 AS IT STANDS TODAY (reported, for the wiring session): a layer
          offset on tilt is ADDED to the layer's `tiltExtra` ramp — the ramp is
          unchanged on every slot. The wiring session moves this clause.
     SO7  TODAY'S ROLES RE-EXPRESSED UNDER THE TOGGLES (the migration table,
          measured): ALL (RADIAL and FAN), INNER (RADIAL and FAN) and a FAN
          per-petal group, each built through its role controls and again
          through the equivalent entries with the matching toggle ON —
          `applied` EXACT and the laminae bit-identical on every petal; the
          size `mul` row as a delta; and the RADIAL labellum and hood measured
          UNREPRESENTABLE (a RADIAL petal entry is inert with per-petal ON).
     SO8  THE FILE: compose(state, scopes) reads back the same record with no
          note on every live matrix row; the reader's refusals on written-down
          fixtures (a bad index, a non-object offsets, a choice, a retired id,
          an unknown id, a role delta, a whorl-level id, a tier entry told).
     SO9  THE PAGE (--browser): `__bloomScopes` sets a record and the build on
          screen carries it; the page's own save writes it under `overrides`;
          a load of that save hands back the same record and the same build;
          switching per-layer OFF keeps the record and builds the unscoped STL,
          ON again the scoped one; a plain save clears it.
     SO10 THE TOGGLE GATE: a record whose toggle is OFF, or ON under the wrong
          placement (per-layer under FAN, per-petal under RADIAL, either under
          SPIRAL / CONTINUOUS), is KEPT and INERT — bit-identical to no record,
          both modes, every term null.
     SO11 ONE OWNER: a toggle alone moves nothing; under a live toggle the role
          table is inert (ALL, INNER, labellum + hood under per-layer; ALL,
          INNER, the per-petal groups under per-petal), each shown live with
          the toggle OFF first, and no emitted petal carries an ALL, slot-role
          or group STAMP (the eligibility arm's only witness — the resolver's
          blanket skip makes it invisible in the geometry); per-layer makes
          the tube unavailable.
     SO12 EVERY SCOPEABLE CONTROL REACHES A PETAL: a layer-1 offset on each,
          with its own guard live, moves every layer-1 petal and no layer-0
          one — a scopeable id that moves nothing is a control the panel would
          rebind to no effect.

   --negative-control serves THIRTEEN broken copies of bloom-geometry.js (with a
   bloom-file.js copy importing each), every anchor checked before any runs,
   and requires each to redden exactly the clauses it names AND to move its own
   witness — a direct call on the MUTATED module proving the behaviour changed,
   asked before the clauses are consulted (CLAUDE.md's witness rule).

   IN CI it rides in bloom-panel.yml THROUGH tools/verify-bloom-design-file.mjs,
   which spawns it (the file's containers are this model's file shape) — no
   workflow file was edited, because editing one costs every frozen tag
   dispatched afterwards from an older base, and the stamen-variance session
   is in flight on one (CLAUDE.md, "WHEN A FROZEN TAG PUBLISHES").

   Run: node tools/verify-bloom-scopes.mjs [--smoke|--full] [--browser] [--negative-control] [--mutant=a,b] */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const NEGATIVE = argv.includes('--negative-control');
const FULL = argv.includes('--full');
const BROWSER = argv.includes('--browser');
const SMOKE_ROWS = argv.includes('--smoke');
const ONLY = (argv.find((a) => a.startsWith('--mutant=')) || '').slice(9).split(',').filter(Boolean);
/* SO1's default rows — one per family that composes a petal state (roles, the
   variance field, placements, layers, sepals, the tube, infill), named so a
   renamed row is a loud re-point and not a silent shrink. `--smoke` takes the
   smoke subset, `--full` the whole matrix; the full-matrix byte claim is
   verify-bloom-surface-bytes' against a worktree, not this clause's. */
const IDENTITY_ROWS = [
  'DEFAULT (the shipping configuration)',
  'LAYERS: 3 (the layered bloom at its defaults)',
  'SPIRAL x defaults',
  'CONTINUOUS x 3 turns',
  'FAN: toggle OFF (the line runs through the gap) — pinned',
  'ORCHID: the labellum and the hood (the flower has a face) x 2 whorls in step',
  'ZYGO: 3 layers x ALL INNER MAX (one role over two whorls)',
  'FAN x PER-PETAL: a MIDDLE group only (petal 2 — an orbit that was LATERAL and had no controls)',
  'SEPALS: the shipped whorl (5 of 8, interleaved, size 0.60, angle 0)',
  'TUBE: 8 petals x k 2 (2 panels)',
  'SPACING VARIANCE: x size 0.5 x form 1 (three amounts, one wave)',
  'INFILL: the ruled defaults (20 cells, 5 Lloyd passes, law 0.30, stretch 1.65, a 1.00 mm wall, a 1.50 mm hole bar)',
];

const load = (f) => import(pathToFileURL(path.join(ROOT, f)).href + `?t=${Date.now()}_${Math.random()}`);
const REG = await load('bloom-registry.js');
const H = await load('tools/bloom-harness.mjs');
const SMOKE = await load('tools/bloom-smoke.mjs');
const MATRIX = H.buildMatrix();
const byLabel = new Map(MATRIX.map((r) => [r.label, r]));
const kindOf = new Map(REG.CONTROLS.map((c) => [c.id, c]));
function stateOf(row) {
  const s = { ...REG.DEFAULTS };
  for (const w of row.set || []) {
    const c = kindOf.get(w.id); if (!c) throw new Error(`${row.label}: no control ${w.id}`);
    s[w.id] = c.kind === 'slider' ? Number(w.value) : w.value;
  }
  return s;
}
const S = (set) => ({ ...REG.DEFAULTS, ...set });

/* every number of a record, in a fixed walk order — the lamina comparison */
function numbersOf(x, out = []) {
  if (typeof x === 'number') out.push(x);
  else if (Array.isArray(x)) for (const v of x) numbersOf(v, out);
  else if (x && typeof x === 'object') for (const k of Object.keys(x).sort()) numbersOf(x[k], out);
  return out;
}
const sameNumbers = (a, b) => a.length === b.length && a.every((v, i) => Object.is(v, b[i]));

function build(G, F, state, overrides, { exportMode = false, lamina = true } = {}) {
  const acc = new G.MeshBuilder({ exportMode, captureLamina: lamina });
  const scopes = overrides === undefined ? null : (overrides === 'empty' ? { layers: [], petals: [], tiers: [], bounds: F.scopeBounds() } : F.scopesForBuild(overrides));
  const built = G.buildBloomInto(acc, state, { below: null, capability: null, scopes });
  return { acc, built, petals: built.petalsAll.filter((p) => p) };
}
const bounds = (F) => F.scopeBounds();
const withBounds = (F, o) => ({ layers: [], petals: [], tiers: [], ...o, bounds: bounds(F) });

/* ---------------- the Node clauses ---------------- */
async function nodeClauses(G, F, rec) {
  /* SO0 — the census, restated from the registry and the role table */
  {
    const p = [];
    if (JSON.stringify([...G.SCOPE_UNSCOPED]) !== JSON.stringify(['sheetThickness'])) p.push(`SCOPE_UNSCOPED is ${JSON.stringify(G.SCOPE_UNSCOPED)}`);
    const deltas = new Set(G.ROLE_OVERRIDES.map((o) => o.control));
    const whorl = ['petalCount', 'footDelicacy', 'tubeLayer1', 'tubeLayer2', 'tubeLayer3', 'tubeLayer4', 'tubeLayer5', 'tubeLayer6', 'tubeHeight', 'tubeBlend'];
    const want = REG.CONTROLS.filter((c) => c.kind === 'slider' && c.role === 'petal' && c.id !== 'sheetThickness' && !deltas.has(c.id) && !whorl.includes(c.id)).map((c) => c.id);
    if (JSON.stringify([...F.SCOPEABLE_IDS]) !== JSON.stringify(want)) p.push(`SCOPEABLE_IDS (${F.SCOPEABLE_IDS.length}) differ from the restated census (${want.length}): ${want.filter((x) => !F.SCOPEABLE_IDS.includes(x)).concat(F.SCOPEABLE_IDS.filter((x) => !want.includes(x))).join(', ')}`);
    if (F.SCOPEABLE_IDS.includes('sheetThickness')) p.push('sheetThickness is scopeable');
    /* the two whorl-level sepal values (F1.1a): the count, and the tier count */
    const wantTier = REG.CONTROLS.filter((c) => c.kind === 'slider' && c.role === 'sepal' && c.id !== 'sepalCount' && c.id !== 'sepalTiers').map((c) => c.id);
    if (JSON.stringify([...F.SCOPEABLE_TIER_IDS]) !== JSON.stringify(wantTier)) p.push(`SCOPEABLE_TIER_IDS differ from the restated census (sepal-role sliders less sepalCount and sepalTiers)`);
    const b = F.scopeBounds();
    for (const id of [...F.SCOPEABLE_IDS, ...F.SCOPEABLE_TIER_IDS]) { const c = kindOf.get(id); if (!b[id] || b[id].min !== c.min || b[id].max !== c.max) p.push(`scopeBounds.${id} is ${JSON.stringify(b[id])}, the registry says ${c.min}..${c.max}`); }
    if (Object.keys(b).length !== F.SCOPEABLE_IDS.length + F.SCOPEABLE_TIER_IDS.length) p.push(`scopeBounds has ${Object.keys(b).length} entries for ${F.SCOPEABLE_IDS.length} + ${F.SCOPEABLE_TIER_IDS.length} scopeable ids`);
    rec('SO0', p, `sheet thickness is the one unscoped control; ${F.SCOPEABLE_IDS.length} petal sliders are scopeable (layers / petals) and ${F.SCOPEABLE_TIER_IDS.length} sepal sliders (tiers), with the registry's own bounds`);
  }
  /* SO1 — the identity by branch */
  {
    const p = [];
    const rows = FULL ? MATRIX : SMOKE_ROWS ? MATRIX.filter((r) => SMOKE.SMOKE_LABELS.includes(r.label)) : IDENTITY_ROWS.map((l) => { const r = byLabel.get(l); if (!r) throw new Error(`SO1: the named row "${l}" is not in the live matrix — re-point it`); return r; });
    let floats = 0, n = 0;
    for (const row of rows) {
      if (row.capability) continue;   // the capability hook is a different argument; the byte tool covers those rows
      const st = stateOf(row);
      for (const exportMode of [false, true]) {
        let a, b;
        try { a = build(G, F, st, undefined, { exportMode, lamina: false }); b = build(G, F, st, 'empty', { exportMode, lamina: false }); } catch (e) { p.push(`${row.label} [${exportMode ? 'export' : 'live'}]: threw ${e.message}`); continue; }
        n++;
        const pa = a.acc.positions, pb = b.acc.positions;
        if (pa.length !== pb.length) { p.push(`${row.label} [${exportMode ? 'export' : 'live'}]: ${pa.length} against ${pb.length} floats`); continue; }
        let moved = 0; for (let i = 0; i < pa.length; i++) if (!Object.is(pa[i], pb[i])) moved++;
        floats += pa.length;
        if (moved) p.push(`${row.label} [${exportMode ? 'export' : 'live'}]: ${moved} floats moved under EMPTY scopes`);
        if (b.petals.some((q) => q.scopeTerm !== null)) p.push(`${row.label}: a petal carries a scopeTerm under empty scopes`);
        if (b.built.scopes === null) p.push(`${row.label}: the builder's scopes summary is null under an empty record`);
        if (a.built.scopes !== null) p.push(`${row.label}: the builder's scopes summary is not null with no scopes`);
      }
    }
    rec('SO1', p, `${n} row-modes over ${rows.length} rows: ${floats.toLocaleString()} floats identical under Object.is with empty scopes, every scopeTerm null`);
  }
  /* SO2 — a layer offset moves only its layer (per-layer values live: RADIAL + scopeLayers ON).
     WHICH PETALS ARE ON THE LAYER is read off each petal's OWN WHORL (`whorl`,
     its ring's lambda — an owner the scope path does not write), never off the
     term the builder attached: the first version called "the petals carrying a
     term" layer 1 and checked the term's key, so a builder handing the call the
     wrong layer number passed it — the expected and the measured side were one
     owner (the fourth durable rule; the review's finding). And the layer is the
     INNERMOST of three, not the middle one, which is the fixed point of a layer
     order reversed. */
  {
    const p = [];
    const LAYER = 2;
    const st = S({ layerCount: 3, scopeLayers: 'ON' });
    const base = build(G, F, st, undefined);
    const sc = build(G, F, st, withBounds(F, { layers: [{ layer: LAYER, offsets: { petalCup: 0.4 } }] }));
    if (base.petals.length !== sc.petals.length) p.push(`petal counts differ ${base.petals.length} / ${sc.petals.length}`);
    let moved = 0, held = 0;
    sc.petals.forEach((q, i) => {
      const o = base.petals[i];
      const whorl = Math.round(o.whorl);
      const same = sameNumbers(numbersOf(o.lamina), numbersOf(q.lamina));
      if (whorl === LAYER) {
        if (!q.scopeTerm || q.scopeTerm.key.layer !== LAYER) p.push(`whorl-${LAYER} petal ${i} carries ${q.scopeTerm ? `a term keyed on layer ${q.scopeTerm.key.layer}` : 'no term'}`);
        if (q.applied.petalCup !== st.petalCup + 0.4) p.push(`whorl-${LAYER} petal ${i}: applied cup ${q.applied.petalCup}, expected ${st.petalCup + 0.4}`);
        if (same) p.push(`whorl-${LAYER} petal ${i}: the lamina did not move`);
        moved++;
      } else {
        if (q.scopeTerm) p.push(`a whorl-${whorl} petal (${i}) carries a term`);
        if (!same) p.push(`a whorl-${whorl} petal (${i}) MOVED`);
        if (q.applied.petalCup !== o.applied.petalCup) p.push(`a whorl-${whorl} petal (${i}) changed its applied cup`);
        held++;
      }
    });
    if (moved !== 8 || held !== 16) p.push(`expected 8 moved / 16 held, read ${moved} / ${held}`);
    rec('SO2', p, `RADIAL 3 layers x 8, per-layer values ON: a cup offset of +0.4 on Layer ${LAYER + 1} (the innermost) moves exactly its whorl's 8 petals by 0.4 — read off each petal's own whorl — and holds the other 16 bit-identical`);
  }
  /* SO3 — a petal offset moves only that petal and its mirror partner (per-petal values live: FAN + scopePetals ON) */
  {
    const p = [];
    const cases = [
      { label: 'FAN centre ON (through a slot)', set: { placement: 'FAN', fanCenterPetal: 'ON', scopePetals: 'ON' }, slot: 1 },
      { label: 'FAN centre OFF (through the gap)', set: { placement: 'FAN', fanCenterPetal: 'OFF', scopePetals: 'ON' }, slot: 1 },
      { label: 'FAN centre ON, the mirror-line petal alone', set: { placement: 'FAN', fanCenterPetal: 'ON', scopePetals: 'ON' }, slot: 0 },
    ];
    const summary = [];
    for (const c of cases) {
      const st = S(c.set);
      const base = build(G, F, st, undefined);
      const n = base.built.foot.slotCount ?? base.petals.length;
      /* the partner RESTATED from the involution's own law — never read off the module under test */
      const expect = c.set.fanCenterPetal === 'ON' ? (n - c.slot) % n : n - 1 - c.slot;
      const want = new Set([c.slot, expect]);
      const sc = build(G, F, st, withBounds(F, { petals: [{ layer: 0, slot: c.slot, offsets: { petalCup: 0.4 } }] }));
      const movedSlots = [];
      sc.petals.forEach((q, i) => {
        const o = base.petals[i];
        const same = sameNumbers(numbersOf(o.lamina), numbersOf(q.lamina));
        if (!same) movedSlots.push(q.slot.index);
        if (want.has(q.slot.index)) {
          if (same) p.push(`${c.label}: slot ${q.slot.index} should move and did not`);
          if (q.applied.petalCup !== st.petalCup + 0.4) p.push(`${c.label}: slot ${q.slot.index} applied ${q.applied.petalCup}`);
        } else if (!same) p.push(`${c.label}: slot ${q.slot.index} moved and is not slot ${c.slot} or its partner ${expect}`);
      });
      /* AN ENTRY NAMING THE PARTNER — a MEMBER index, not the pair's canonical
         one — is KEPT and INERT, bit-identical to no entry (Scoping-b, the
         review's fold): a member index names a different pair the moment the
         count changes, so re-keying it at today's count is what let an outer
         pair's values land on an inner one. Was "naming the partner builds the
         identical bloom" in Scoping-a, which is precisely the fold. */
      if (expect !== c.slot) {
        const sc2 = build(G, F, st, withBounds(F, { petals: [{ layer: 0, slot: expect, offsets: { petalCup: 0.4 } }] }));
        if (!sameNumbers([...base.acc.positions], [...sc2.acc.positions])) p.push(`${c.label}: an entry naming the member slot ${expect} (not the pair's canonical ${c.slot}) moved the bloom — it should be kept and inert`);
        if (sc2.petals.some((q) => q.scopeTerm)) p.push(`${c.label}: an entry naming the member slot ${expect} gave a petal a term`);
      }
      summary.push(`${c.label}: slot ${c.slot}${expect !== c.slot ? ` + partner ${expect}; naming member ${expect} is inert` : ' alone'} (${movedSlots.length} of ${n} moved)`);
    }
    /* THE COUNT CHANGES UNDER A STORED PAIR (the review's fold, both mirrors):
       an entry for the pair four out at four petals a side is KEPT and INERT at
       two a side — bit-identical to no entry, no term on any petal, told as
       kept by the build's summary — and returns on its own pair at four. */
    for (const centre of ['ON', 'OFF']) {
      const outer = 3 + (centre === 'ON' ? 1 : 0);   // the canonical slot of the outermost pair at 4 a side
      const rec4 = withBounds(F, { petals: [{ layer: 0, slot: outer, offsets: { petalCup: 0.6 } }] });
      const st2 = S({ placement: 'FAN', fanCenterPetal: centre, fanPerSide: 2, scopePetals: 'ON' });
      const plain2 = build(G, F, st2, undefined, { lamina: false });
      const kept2 = build(G, F, st2, rec4, { lamina: false });
      if (!sameNumbers([...plain2.acc.positions], [...kept2.acc.positions])) p.push(`centre ${centre}: the pair-${outer} entry moved the bloom at 2 a side, where that pair is not built (it folded onto another pair)`);
      if (kept2.petals.some((q) => q.scopeTerm)) p.push(`centre ${centre}: at 2 a side a petal carries the pair-${outer} entry's term`);
      const sum2 = kept2.built.scopes;
      if (!sum2 || sum2.scopedPetals.length !== 0 || JSON.stringify(sum2.keptPetals) !== JSON.stringify([{ layer: 0, slot: outer }])) p.push(`centre ${centre}: at 2 a side the summary reads scoped ${JSON.stringify(sum2 && sum2.scopedPetals)} / kept ${JSON.stringify(sum2 && sum2.keptPetals)}`);
      const st4 = S({ placement: 'FAN', fanCenterPetal: centre, fanPerSide: 4, scopePetals: 'ON' });
      const back4 = build(G, F, st4, rec4, { lamina: false });
      const n4 = back4.built.foot.slotCount;
      const want4 = new Set([outer, centre === 'ON' ? (n4 - outer) % n4 : n4 - 1 - outer]);
      const got4 = new Set(back4.petals.filter((q) => q.scopeTerm).map((q) => q.slot.index));
      if (got4.size !== 2 || [...want4].some((x) => !got4.has(x))) p.push(`centre ${centre}: back at 4 a side the term is on slots ${[...got4].join(',')}, not the outer pair ${[...want4].join(',')}`);
    }
    summary.push('a stored outer pair is kept and inert at 2 a side and returns at 4, both mirrors');
    rec('SO3', p, summary.join('; '));
  }
  /* SO4 — the clamp, after composition; under a live toggle a role delta does not stack */
  {
    const p = [];
    const b = G.composedBoundsOf('petalCup');
    const st = S({ layerCount: 3, scopeLayers: 'ON' });
    const sc = build(G, F, st, withBounds(F, { layers: [{ layer: 1, offsets: { petalCup: 5 } }] }), { lamina: false });
    const l1 = sc.petals.filter((q) => q.scopeTerm);
    if (!l1.length) p.push('no layer-1 petal built');
    for (const q of l1) if (q.applied.petalCup !== b.max) p.push(`cup ${st.petalCup} + 5 landed on ${q.applied.petalCup}, not the range end ${b.max}`);
    /* ONE OWNER: under per-layer values the labellum's role delta is INERT, so a
       layer offset reads base + offset (never base + role + offset); under
       per-petal values a group's delta is inert the same way. Was "a petal
       offset stacks on a role delta" in Scoping-a — unreachable under the
       toggles, and replaced by the claim that is. */
    const st2 = S({ layerCount: 2, layerPhase: 0, labellumCup: 0.5, scopeLayers: 'ON' });
    const sc2 = build(G, F, st2, withBounds(F, { layers: [{ layer: 0, offsets: { petalCup: 0.3 } }] }), { lamina: false });
    for (const q of sc2.petals.filter((x) => x.scopeTerm)) if (q.applied.petalCup !== st2.petalCup + 0.3) p.push(`RADIAL in step, labellumCup 0.5, per-layer ON: slot ${q.slot.index} reads ${q.applied.petalCup}, expected base ${st2.petalCup} + offset 0.3 — the role delta is not inert`);
    const st3 = S({ placement: 'FAN', petal2Cup: 0.5, scopePetals: 'ON' });
    const sc3 = build(G, F, st3, withBounds(F, { petals: [{ layer: 0, slot: 1, offsets: { petalCup: 0.3 } }] }), { lamina: false });
    const pair = sc3.petals.filter((x) => x.scopeTerm);
    if (pair.length !== 2) p.push(`FAN per-petal ON: ${pair.length} petals carry the pair's term, expected 2`);
    for (const q of pair) if (q.applied.petalCup !== st3.petalCup + 0.3) p.push(`FAN, petal2Cup 0.5, per-petal ON: slot ${q.slot.index} reads ${q.applied.petalCup}, expected base + offset 0.3 — the group delta is not inert`);
    /* under the variance field every composed value stays in range */
    const st4 = S({ varianceForm: 1, petalCup: 1.0, scopeLayers: 'ON' });
    const sc4 = build(G, F, st4, withBounds(F, { layers: [{ layer: 0, offsets: { petalCup: 0.5, petalSpineCurl: 200 } }] }), { lamina: false });
    if (!sc4.petals.some((q) => q.scopeTerm)) p.push('variance x offsets: no petal carries the term');
    for (const q of sc4.petals) for (const base of ['petalCup', 'petalSpineCurl']) {
      const bb = G.composedBoundsOf(base);
      if (!(q.applied[base] >= bb.min && q.applied[base] <= bb.max)) p.push(`variance x offsets: slot ${q.slot.index} ${base} = ${q.applied[base]} outside ${bb.min}..${bb.max}`);
    }
    rec('SO4', p, `cup ${st.petalCup} + 5 lands on ${b.max}; under a live toggle a role delta is inert (base + offset, RADIAL labellum and FAN group alike); under the variance field every composed value is in range`);
  }
  /* SO5 — sheet thickness ignores any offset */
  {
    const p = [];
    const doc = F.composeDoc(REG.DEFAULTS, { scopes: { layers: [{ layer: 0, offsets: { sheetThickness: 0.5, petalCup: 0.1 } }], petals: [], tiers: [] } });
    const r = F.readDoc(JSON.parse(JSON.stringify(doc)));
    if (!r.ok) p.push(`the reader refused the whole file: ${r.error}`);
    else {
      if (!r.notes.some((n) => n.kind === 'invalid' && /sheetThickness: never scoped/.test(n.text))) p.push(`the reader did not refuse the thickness offset: ${r.notes.map((n) => n.text).join(' | ') || '(no notes)'}`);
      const e = r.doc.overrides.layers[0];
      if (!e || 'sheetThickness' in e.offsets) p.push('the thickness offset survived the read');
      if (!e || e.offsets.petalCup !== 0.1) p.push('the rest of the entry did not survive the refusal of one key');
    }
    let threw = false;
    try { build(G, F, REG.DEFAULTS, { layers: [{ layer: 0, offsets: { sheetThickness: 0.5 } }], petals: [], tiers: [] }, { lamina: false }); } catch (e) { threw = /never scoped/.test(e.message); }
    if (!threw) p.push('the geometry built a bloom from a scopes object carrying sheetThickness');
    /* AND WHATEVER THE TOGGLE AND WHICHEVER LAYERS ARE BUILT: an entry for a
       layer this bloom does not build is validated too, toggle ON as OFF (the
       first cut skipped it while the toggle was live — the review's finding) */
    for (const tog of ['OFF', 'ON']) {
      let t2 = false;
      try { build(G, F, S({ layerCount: 2, scopeLayers: tog }), { layers: [{ layer: 3, offsets: { sheetThickness: 0.5 } }], petals: [], tiers: [] }, { lamina: false }); } catch (e) { t2 = /never scoped/.test(e.message); }
      if (!t2) p.push(`per-layer ${tog}: a thickness offset on a layer the bloom does not build did not throw`);
      let t3 = false;
      try { build(G, F, S({ placement: 'FAN', scopePetals: tog }), { layers: [], petals: [{ layer: 0, slot: 9, offsets: { sheetThickness: 0.5 } }], tiers: [] }, { lamina: false }); } catch (e) { t3 = /never scoped/.test(e.message); }
      if (!t3) p.push(`per-petal ${tog}: a thickness offset on a pair the bloom does not build did not throw`);
    }
    /* every scopeable control offset at once leaves every ring's thickness alone */
    const offsets = Object.fromEntries(F.SCOPEABLE_IDS.map((id) => { const c = kindOf.get(id); return [id, c.step || 0.01]; }));
    const st = S({ layerCount: 2, scopeLayers: 'ON' });
    const base = build(G, F, st, undefined, { lamina: false });
    const sc = build(G, F, st, withBounds(F, { layers: [{ layer: 0, offsets }, { layer: 1, offsets }] }), { lamina: false });
    base.built.foot.rings.forEach((rg, i) => { if (!Object.is(rg.thickness, sc.built.foot.rings[i].thickness)) p.push(`ring ${i} thickness moved ${rg.thickness} -> ${sc.built.foot.rings[i].thickness}`); });
    if (!sc.petals.every((q) => q.scopeTerm && !('sheetThickness' in q.scopeTerm.offsets))) p.push('a petal term carries sheetThickness');
    rec('SO5', p, `the reader refuses a thickness offset by name and keeps the entry; the geometry throws on one — on an entry it builds and on one it does not, toggles ON and OFF; offsetting all ${F.SCOPEABLE_IDS.length} scopeable controls leaves every ring's thickness what it was`);
  }
  /* SO6 — Q3.5 as it stands today */
  {
    const p = [];
    const st = S({ layerCount: 3, layerTilt: 12, scopeLayers: 'ON' });
    const base = build(G, F, st, undefined, { lamina: false });
    const sc = build(G, F, st, withBounds(F, { layers: [{ layer: 1, offsets: { petalTilt: 10 } }] }), { lamina: false });
    sc.petals.forEach((q, i) => {
      if (!Object.is(q.slot.tiltExtra, base.petals[i].slot.tiltExtra)) p.push(`slot ${q.slot.index}: the layer ramp's tiltExtra moved ${base.petals[i].slot.tiltExtra} -> ${q.slot.tiltExtra}`);
      if (q.scopeTerm && q.applied.petalTilt !== st.petalTilt + 10) p.push(`layer-1 slot ${q.slot.index}: applied tilt ${q.applied.petalTilt}`);
    });
    rec('SO6', p, 'TODAY a layer tilt offset is ADDED on top of the layerTilt ramp (tiltExtra unchanged on every slot) — Q3.5\'s "per-layer wins" is EXPRESSED by the model and NOT yet wired; the wiring session moves this clause');
  }
  /* SO7 — today's roles, re-expressed as scopes UNDER THE TOGGLES (the
     migration table, measured). Scoping-a measured every role as REPRESENTABLE
     with no toggle in the model; Scoping-b's rulings put per-layer on RADIAL
     only and per-petal on FAN only, so each row is now built through its role
     controls (toggles OFF) and again through the equivalent entries with the
     role controls at identity and the toggle that makes them live ON. And the
     labellum and hood (RADIAL) became UNREPRESENTABLE — measured below, not
     argued — which is the retirement session's to rule on (Q3.4). */
  {
    const p = [];
    const rows = [
      { label: 'ALL (RADIAL, one whorl) -> one layer entry', set: { allCurl: 45, allCup: 0.2 }, role: G.ROLE_ALL, offsets: { petalSpineCurl: 45, petalCup: 0.2 }, scope: 'layer', toggle: { scopeLayers: 'ON' } },
      { label: 'ALL (FAN, one whorl) -> an entry on every pair', set: { placement: 'FAN', allCurl: 45, allCup: 0.2 }, role: G.ROLE_ALL, offsets: { petalSpineCurl: 45, petalCup: 0.2 }, scope: 'petal', toggle: { scopePetals: 'ON' } },
      { label: 'INNER (RADIAL, 3 layers) -> layers 1 and 2', set: { layerCount: 3, innerCurl: 90, innerCup: 0.3 }, role: G.ROLE_INNER, offsets: { petalSpineCurl: 90, petalCup: 0.3 }, scope: 'layer', toggle: { scopeLayers: 'ON' } },
      { label: 'INNER (FAN, 2 layers) -> every pair of layer 1', set: { placement: 'FAN', layerCount: 2, innerCurl: 90, innerCup: 0.3 }, role: G.ROLE_INNER, offsets: { petalSpineCurl: 90, petalCup: 0.3 }, scope: 'petal', toggle: { scopePetals: 'ON' } },
      { label: 'PER-PETAL group 2 (FAN) -> its pair', set: { placement: 'FAN', petal2Tilt: 45, petal2Cup: 0.5, petal2Curl: 60 }, role: G.PETAL_ROLE_ORDER[1], offsets: { petalTilt: 45, petalCup: 0.5, petalSpineCurl: 60 }, scope: 'petal', toggle: { scopePetals: 'ON' } },
    ];
    /* THE PAIRING RESTATED HERE, never read off the module under test: under
       the toggles a petal scope exists on a FAN only, and its canonical slot is
       the pair's lower index by the fan's own involution (through a slot:
       (n - i) mod n; through the gap: n - 1 - i). The first version called the
       geometry's own `scopeSlotKey`, and the mirror-split mutant then handed
       this clause one entry per member and passed it (Scoping-a). */
    const keyOf = (st, n) => (slot) => {
      if (st.placement !== 'FAN') throw new Error('SO7: a petal-scope row that is not a FAN');
      const partner = st.fanCenterPetal === 'OFF' ? n - 1 - slot : (n - slot) % n;
      return Math.min(slot, partner);
    };
    const summary = [];
    for (const r of rows) {
      const st = S(r.set);
      const viaRoles = build(G, F, st, undefined);
      const identity = { ...st, ...r.toggle };
      for (const id of Object.keys(r.set)) if (G.ROLE_OVERRIDES.some((o) => o.control === id)) identity[id] = REG.DEFAULTS[id];
      const fr = viaRoles.built.foot;
      const descriptors = fr.slotRings ? fr.slotRings.flatMap((x) => x) : fr.rings;
      const carries = (d) => d.role === r.role || d.allRole === r.role || d.slotRole === r.role || d.petalRole === r.role;
      const n = fr.slotCount;
      const layers = [], petals = [];
      if (r.scope === 'layer') {
        for (const L of new Set(descriptors.filter(carries).map((d) => d.lambda))) layers.push({ layer: L, offsets: { ...r.offsets } });
      } else {
        const key = keyOf(st, n), seen = new Set();
        for (const d of descriptors.filter(carries)) for (const slot of (d.slots || Array.from({ length: n }, (_, i) => i))) {
          const k = `${d.lambda}:${key(slot)}`;
          if (seen.has(k)) continue; seen.add(k);
          petals.push({ layer: d.lambda, slot: key(slot), offsets: { ...r.offsets } });
        }
      }
      if (!layers.length && !petals.length) { p.push(`${r.label}: no descriptor carries the role`); continue; }
      const viaScopes = build(G, F, identity, withBounds(F, { layers, petals }));
      if (viaRoles.petals.length !== viaScopes.petals.length) { p.push(`${r.label}: petal counts differ`); continue; }
      let exact = 0;
      viaRoles.petals.forEach((a, i) => {
        const b = viaScopes.petals[i];
        for (const base of Object.keys(a.applied || {})) if (!Object.is(a.applied[base], (b.applied || {})[base])) p.push(`${r.label}: slot ${a.slot.index} ${base} ${a.applied[base]} via roles, ${(b.applied || {})[base]} via scopes`);
        if (!sameNumbers(numbersOf(a.lamina), numbersOf(b.lamina))) p.push(`${r.label}: slot ${a.slot.index} lamina differs between the role build and the scope build`);
        else exact++;
      });
      if (!sameNumbers([...viaRoles.acc.positions], [...viaScopes.acc.positions])) p.push(`${r.label}: the two export streams differ`);
      summary.push(`${r.label}: ${layers.length + petals.length} entr${layers.length + petals.length === 1 ? 'y' : 'ies'}, ${exact} petals bit-identical`);
    }
    /* the one semantic loss: a mul row (size) as a delta at the migrated global */
    {
      const st = S({ placement: 'FAN', petal2Size: 1.3 });
      const viaRoles = build(G, F, st, undefined, { lamina: false });
      const descriptors = viaRoles.built.foot.slotRings ? viaRoles.built.foot.slotRings.flatMap((x) => x) : viaRoles.built.foot.rings;
      const grp = descriptors.find((d) => d.petalRole === G.PETAL_ROLE_ORDER[1]);
      if (!grp) p.push('size row: no descriptor carries group 2');
      else {
        const nn = viaRoles.built.foot.slotCount;
        const slot = keyOf(st, nn)(grp.slots[0]);
        const viaScopes = build(G, F, { ...st, petal2Size: 1, scopePetals: 'ON' }, withBounds(F, { petals: [{ layer: 0, slot, offsets: { petalLength: st.petalLength * 0.3, petalWidth: st.petalWidth * 0.3 } }] }), { lamina: false });
        const a = viaRoles.petals.find((q) => q.slot.index === grp.slots[0] && q.overridden), b = viaScopes.petals.find((q) => q.scopeTerm && q.slot.index === grp.slots[0]);
        if (!a || !b) p.push(`size row: the role petal ${a ? 'was' : 'was NOT'} found, the scoped petal ${b ? 'was' : 'was NOT'}`);
        else {
          const dL = Math.abs(a.applied.petalLength - b.applied.petalLength), dW = Math.abs(a.applied.petalWidth - b.applied.petalWidth);
          if (dL > 1e-9 || dW > 1e-9) p.push(`petal2Size 1.3 as a delta: length off by ${dL}, width by ${dW}`);
          summary.push(`petal2Size x1.3 as delta global*(0.3): length within ${dL.toExponential(1)}, width within ${dW.toExponential(1)} (${dL === 0 && dW === 0 ? 'exact on this state; ' : ''}a mul is a delta only at the global it was migrated at — the OFFSETS default's one semantic loss)`);
        }
      }
    }
    /* THE LABELLUM AND HOOD (RADIAL) ARE UNREPRESENTABLE under the rulings:
       per-petal is FAN only, so a RADIAL petal entry is INERT even with the
       per-petal toggle ON (measured: bit-identical to no scopes, every term
       null), and a layer entry reaches every petal of its layer (SO2). The role
       controls stay (not retired) and are hidden while per-layer is on. */
    {
      const st = S({ layerCount: 2, layerPhase: 0, scopePetals: 'ON' });
      const plain = build(G, F, st, undefined, { lamina: false });
      const scoped = build(G, F, st, withBounds(F, { petals: [{ layer: 0, slot: 0, offsets: { petalCup: 0.5, petalTilt: -25 } }] }), { lamina: false });
      if (!sameNumbers([...plain.acc.positions], [...scoped.acc.positions])) p.push('LABELLUM (RADIAL): a petal entry with scopePetals ON moved the bloom — a RADIAL petal scope is live');
      if (scoped.petals.some((q) => q.scopeTerm !== null)) p.push('LABELLUM (RADIAL): a petal carries a scope term');
      summary.push('LABELLUM / HOOD (RADIAL): UNREPRESENTABLE — a RADIAL petal entry builds bit-identically to none even with per-petal ON, a layer entry reaches all of its layer (SO2); the roles stay, hidden while per-layer is on');
    }
    rec('SO7', p, summary.join('; '));
  }
  /* SO8 — the file */
  {
    const p = [];
    const fixture = {
      layers: [{ layer: 1, offsets: { petalCup: 0.25, petalSpineCurl: -30 } }],
      petals: [{ layer: 0, slot: 2, offsets: { petalTipShape: 0.4, petalLength: -5 } }, { layer: 0, slot: 0, offsets: { petalTwist: 0 } }],
      tiers: [{ tier: 0, offsets: { sepalCup: 0.1 } }],
    };
    let rows = 0;
    for (const row of MATRIX) {
      const st = stateOf(row);
      const r = F.readDoc(JSON.parse(JSON.stringify(F.composeDoc(st, { scopes: fixture }))));
      if (!r.ok) { p.push(`${row.label}: refused — ${r.error}`); continue; }
      /* a tier entry reads CLEAN since F1.1a (sepal tiers): it is applied, so
         there is nothing to tell */
      const own = r.notes.filter((n) => /^overrides\./.test(n.text));
      if (own.length) p.push(`${row.label}: ${own.map((n) => n.text).join(' | ')}`);
      if (JSON.stringify(r.doc.overrides) !== JSON.stringify(fixture)) p.push(`${row.label}: the record did not round-trip`);
      rows++;
    }
    /* the reader's refusals on written-down fixtures */
    const base = () => F.composeDoc(REG.DEFAULTS);
    const texts = (r) => r.notes.map((n) => `${n.kind}:${n.text}`).join(' | ');
    const expect = (name, o, wants) => {
      const r = F.readDoc(o);
      if (!r.ok) { p.push(`${name}: refused whole — ${r.error}`); return r; }
      for (const [kind, re] of wants) if (!r.notes.some((n) => n.kind === kind && re.test(n.text))) p.push(`${name}: no ${kind} note matching ${re} — ${texts(r) || '(no notes)'}`);
      return r;
    };
    { const o = base(); o.overrides.layers = [{ layer: 'a', offsets: {} }, { layer: 1 }, 5]; const r = expect('bad entries', o, [['invalid', /layers\[0\]\.layer is "a"/], ['invalid', /layers\[1\]\.offsets is not an object/], ['invalid', /layers\[2\] is not an entry/]]); if (r.ok && r.doc.overrides.layers.length) p.push('a refused entry survived'); }
    { const o = base(); o.overrides.petals = [{ layer: 0, offsets: { petalCup: 1 } }]; expect('petal without slot', o, [['invalid', /petals\[0\]\.slot is null/]]); }
    { const o = base(); o.overrides.layers = [{ layer: 0, offsets: { placement: 1, petalInfill: 2, petalCount: 1, allCup: 0.1, 'petalTipBreadth': 0.2, nonsense: 3, petalCup: 'x', petalCupGradient: 0.3 }, extra: 1 }];
      const r = expect('bad keys', o, [['invalid', /placement: a choice has no offset/], ['invalid', /petalCount: a whorl-level value/], ['invalid', /allCup: a role delta/], ['retired', /petalTipBreadth names a retired control/], ['unknown', /offsets\.nonsense is not a control/], ['invalid', /petalCup is "x", not a number/], ['unknown', /layers\[0\]\.extra is not a field/]]);
      if (r.ok && JSON.stringify(r.doc.overrides.layers[0]) !== JSON.stringify({ layer: 0, offsets: { petalCupGradient: 0.3 } })) p.push(`bad keys: the kept entry is ${JSON.stringify(r.doc.overrides.layers[0])}`); }
    { const o = base(); o.overrides.tiers = [{ tier: 0, offsets: { sepalCup: 0.1 } }]; const r = expect('a tier entry', o, []); if (r.ok && (r.doc.overrides.tiers.length !== 1 || r.notes.length)) p.push(`a tier entry: ${r.notes.length ? texts(r) : 'the entry was dropped'}`); }
    /* the two whorl-level sepal values are refused in a tier entry by name (F1.1a) */
    { const o = base(); o.overrides.tiers = [{ tier: 1, offsets: { sepalCount: 2, sepalTiers: 1, sepalHeight: -0.1 } }]; const r = expect('tier whorl-level keys', o, [['invalid', /sepalCount: a whorl-level value/], ['invalid', /sepalTiers: a whorl-level value/]]);
      if (r.ok && JSON.stringify(r.doc.overrides.tiers[0]) !== JSON.stringify({ tier: 1, offsets: { sepalHeight: -0.1 } })) p.push(`tier whorl-level keys: the kept entry is ${JSON.stringify(r.doc.overrides.tiers[0])}`); }
    { const r = F.readDoc(base()); if (r.notes.length) p.push(`a plain compose(DEFAULTS) reports ${texts(r)}`); if (!F.scopesAreEmpty(r.doc.overrides) || F.scopesForBuild(r.doc.overrides) !== null) p.push('empty containers do not read as no scopes'); }
    { const sc = F.scopesForBuild(fixture); if (!sc || sc.layers.length !== 1 || sc.petals.length !== 2 || sc.tiers.length !== 1 || !sc.bounds.petalCup || !sc.bounds.sepalCup) p.push('scopesForBuild did not carry the three lists and the bounds (the tier ids included)'); }
    { const sc = F.scopesForBuild({ layers: [], petals: [], tiers: [{ tier: 0, offsets: { sepalCup: 0.1 } }] }); if (!sc || sc.tiers.length !== 1) p.push('a tiers-only record builds nothing — scopesForBuild returned null (F1.1a: a tier entry builds a tier)'); }
    rec('SO8', p, `${rows} live rows round-trip a two-layer / two-petal / one-tier record with no note; every written-down refusal fires by name; a tiers-only record reaches the build`);
  }
  /* SO10 — THE TOGGLE GATE: an entry reaches a petal only while its toggle is
     LIVE (Scoping-b, "each is a toggle; off = today's panel exactly"). Every
     case below hands the builder a record whose entries cannot be live, and
     each must build the unscoped bloom to the float with every term null —
     the record KEPT (the summary still counts it) and INERT. */
  {
    const p = [];
    const layer = { layers: [{ layer: 0, offsets: { petalCup: 0.4, petalSpineCurl: 60 } }, { layer: 1, offsets: { petalTilt: 20 } }] };
    const petal = { petals: [{ layer: 0, slot: 1, offsets: { petalCup: 0.4, petalSpineCurl: 60 } }] };
    const cases = [
      { label: 'RADIAL, per-layer OFF, a layer record', set: { layerCount: 2 }, rec: layer },
      { label: 'RADIAL, per-petal ON (FAN only), a petal record', set: { layerCount: 2, scopePetals: 'ON' }, rec: petal },
      { label: 'FAN, per-petal OFF, a petal record', set: { placement: 'FAN' }, rec: petal },
      { label: 'FAN, per-layer ON (RADIAL only), a layer record', set: { placement: 'FAN', layerCount: 2, scopeLayers: 'ON' }, rec: layer },
      { label: 'SPIRAL, both ON, both records', set: { placement: 'SPIRAL', layerCount: 2, scopeLayers: 'ON', scopePetals: 'ON' }, rec: { ...layer, ...petal } },
      { label: 'CONTINUOUS, both ON, both records', set: { placement: 'CONTINUOUS', scopeLayers: 'ON', scopePetals: 'ON' }, rec: { ...layer, ...petal } },
    ];
    let n = 0;
    for (const c of cases) {
      const st = S(c.set);
      for (const exportMode of [false, true]) {
        const a = build(G, F, st, undefined, { exportMode, lamina: false });
        const b = build(G, F, st, withBounds(F, c.rec), { exportMode, lamina: false });
        const pa = a.acc.positions, pb = b.acc.positions;
        let moved = pa.length !== pb.length ? Infinity : 0;
        if (moved === 0) for (let i = 0; i < pa.length; i++) if (!Object.is(pa[i], pb[i])) moved++;
        if (moved) p.push(`${c.label} [${exportMode ? 'export' : 'live'}]: ${moved} floats moved — an entry reached a petal with its toggle not live`);
        if (b.petals.some((q) => q.scopeTerm !== null)) p.push(`${c.label}: a petal carries a scope term`);
        if (!b.built.scopes || b.built.scopes.layersLive || b.built.scopes.petalsLive) p.push(`${c.label}: the summary reads ${JSON.stringify(b.built.scopes)}`);
        n++;
      }
    }
    rec('SO10', p, `${cases.length} cases x 2 modes (${n} builds): a record whose toggle is off, or on under the wrong placement, is kept and inert — bit-identical to no record, every term null`);
  }
  /* SO11 — ONE OWNER ON SCREEN, AND IN THE GEOMETRY: a toggle ALONE moves
     nothing; while it is live the role table it hides is INERT (ALL, INNER,
     the labellum and hood under per-layer; ALL, INNER and the per-petal groups
     under per-petal), each shown live with the toggle OFF so no clause is
     vacuous; and per-layer and the tube are exclusive. */
  {
    const p = [];
    const same = (a, b) => sameNumbers([...a.acc.positions], [...b.acc.positions]);
    const B = (set) => build(G, F, S(set), undefined, { lamina: false });
    /* the toggle alone */
    for (const set of [{}, { layerCount: 3 }, { placement: 'FAN' }, { placement: 'FAN', layerCount: 2 }]) {
      const t = set.placement === 'FAN' ? { scopePetals: 'ON' } : { scopeLayers: 'ON' };
      if (!same(B(set), B({ ...set, ...t }))) p.push(`${JSON.stringify(set)}: switching ${Object.keys(t)[0]} ON with no record moved the bloom`);
    }
    /* each role: live with the toggle OFF, inert with it ON */
    const roles = [
      { label: 'ALL (RADIAL)', on: { scopeLayers: 'ON' }, base: {}, role: { allCurl: 60, allCup: 0.3 } },
      { label: 'INNER (RADIAL, 3 layers)', on: { scopeLayers: 'ON' }, base: { layerCount: 3 }, role: { innerCurl: 90, innerCup: 0.3 } },
      { label: 'LABELLUM + HOOD (RADIAL, 2 in step)', on: { scopeLayers: 'ON' }, base: { layerCount: 2, layerPhase: 0 }, role: { labellumCup: 0.5, hoodTilt: 20 } },
      { label: 'ALL (FAN)', on: { scopePetals: 'ON' }, base: { placement: 'FAN' }, role: { allCurl: 60, allCup: 0.3 } },
      { label: 'INNER (FAN, 2 layers)', on: { scopePetals: 'ON' }, base: { placement: 'FAN', layerCount: 2 }, role: { innerCurl: 90 } },
      { label: 'PER-PETAL group 2 (FAN)', on: { scopePetals: 'ON' }, base: { placement: 'FAN' }, role: { petal2Cup: 0.5, petal2Tilt: 30 } },
    ];
    /* AND NO STAMP: ALL, the slot roles and the per-petal groups go inert
       through their eligibility functions (no stamp, no census, no split) AND
       through the resolver's blanket skip — so the geometry cannot tell the
       eligibility arm is gone (measured: `all-petals-forget-the-toggles` moved
       no float). What can is the STAMP each emitted petal carries: under a
       live toggle no petal is stamped ALL, a slot role or a per-petal group,
       and with the toggle OFF the same state stamps them (anti-vacuity).
       INNER is the exception by design — it is stamped on every layer >= 1
       whatever the toggle (Z1 counts it) and goes inert in the resolver. */
    /* the stamps AND footRing's own eligibility flags: a per-petal group at a
       collapsed split stamps nothing either way (the collapse guard probes the
       resolver, which the blanket skip makes inert), so the flag the builder
       reports is the per-petal arm's only witness here — measured, the
       `the-groups-forget-per-petal` mutant moved neither a float nor a stamp */
    const stamps = (set) => { const b = B(set); const f = b.built.foot; return { all: b.petals.filter((q) => q.allRole).length, slot: b.petals.filter((q) => q.slotRole).length, group: b.petals.filter((q) => q.petalRole).length,
      flags: ['allPetalsEligible', 'slotRolesEligible', 'perPetalEligible'].filter((k) => f[k]) }; };
    for (const r of roles) {
      if (same(B(r.base), B({ ...r.base, ...r.role }))) p.push(`${r.label}: the role does not move the bloom with the toggle OFF — the inertness claim below would be vacuous`);
      if (!same(B({ ...r.base, ...r.on }), B({ ...r.base, ...r.on, ...r.role }))) p.push(`${r.label}: the role MOVED the bloom with ${Object.keys(r.on)[0]} ON — two owners on one petal`);
      const offS = stamps({ ...r.base, ...r.role }), onS = stamps({ ...r.base, ...r.on, ...r.role });
      if (onS.all || onS.slot || onS.group) p.push(`${r.label}: with ${Object.keys(r.on)[0]} ON ${onS.all} petal(s) are stamped ALL, ${onS.slot} a slot role, ${onS.group} a per-petal group — the eligibility does not know the toggle`);
      if (onS.flags.length) p.push(`${r.label}: with ${Object.keys(r.on)[0]} ON footRing reports ${onS.flags.join(', ')} — the eligibility does not know the toggle`);
      if (!/INNER/.test(r.label) && !(offS.all || offS.slot || offS.group)) p.push(`${r.label}: with the toggle OFF no petal carries the role's stamp — the stamp clause would be vacuous`);
      if (!/INNER/.test(r.label) && !offS.flags.length) p.push(`${r.label}: with the toggle OFF footRing reports no role eligible — the flag clause would be vacuous`);
    }
    /* the tube */
    const tubeRow = byLabel.get('TUBE: 8 petals x k 2 (2 panels)');
    if (!tubeRow) p.push('the TUBE row is not in the live matrix — re-point it');
    else {
      const tube = stateOf(tubeRow);
      if (!G.tubeEligible(tube)) p.push('the TUBE row is not tube-eligible with the toggle OFF — the exclusion below would be vacuous');
      if (G.tubeEligible({ ...tube, scopeLayers: 'ON' })) p.push('the tube is still eligible with per-layer values ON');
      const noTube = { ...tube }; for (const id of Object.keys(noTube)) if (/^tube/.test(id)) noTube[id] = REG.DEFAULTS[id];
      if (!same(build(G, F, { ...tube, scopeLayers: 'ON' }, undefined, { lamina: false }), build(G, F, { ...noTube, scopeLayers: 'ON' }, undefined, { lamina: false }))) p.push('with per-layer ON the tube controls still move the bloom');
    }
    rec('SO11', p, `a toggle alone moves nothing on 4 states; ${roles.length} role sets each move the bloom with the toggle OFF and NOTHING with it ON, and no petal carries an ALL / slot-role / group stamp (nor footRing an eligibility flag) under the toggle; per-layer ON makes the tube unavailable (its controls inert)`);
  }
  /* SO12 — EVERY SCOPEABLE CONTROL REACHES A PETAL THROUGH A LAYER SCOPE, with
     its own guard live: an offset on layer 1 moves every layer-1 petal's
     lamina and leaves every layer-0 petal bit-identical. A scopeable id no
     offset can move is a control the panel would rebind to no effect — which
     is how `footDelicacy` was found (its only reader is footRing's, which
     reads the global: whorl-level, Q3.3) and moved to SCOPE_WHORL_LEVEL. */
  {
    const p = [];
    const GUARDS = { fringeDepth: { fringeCount: 4, petalTipEnd: 1 }, fringeCount: { petalTipEnd: 1 }, lobeCount: { lobeDepth: 0.3 }, lobeCoverage: { lobeDepth: 0.3 }, lobeCrestShape: { lobeDepth: 0.3 }, lobeNotchShape: { lobeDepth: 0.3 },
      infillDensity: { petalInfill: 'VORONOI' }, infillRelax: { petalInfill: 'VORONOI' }, infillLaw: { petalInfill: 'VORONOI' }, infillAniso: { petalInfill: 'VORONOI' }, infillRound: { petalInfill: 'VORONOI' }, infillBase: { petalInfill: 'VORONOI' },
      buckleFreq: { buckleAmp: 0.3 }, buckleEnv: { buckleAmp: 0.3 }, curlBias: { petalSpineCurl: 90 }, curlStart: { petalSpineCurl: 90 }, petalRollTaper: { petalRoll: 120 }, petalApexSweep: { petalCup: 0.6 } };
    const dead = [], leaked = [];
    for (const id of F.SCOPEABLE_IDS) {
      const c = kindOf.get(id);
      const st = S({ layerCount: 2, scopeLayers: 'ON', ...(GUARDS[id] || {}) });
      const g = Number(st[id]), span = c.max - c.min;
      let d = (g + span / 2 <= c.max) ? span / 2 : -span / 2;
      if (c.step >= 1) d = Math.round(d / c.step) * c.step;
      const a = build(G, F, st, undefined), b = build(G, F, st, withBounds(F, { layers: [{ layer: 1, offsets: { [id]: d } }] }));
      if (a.petals.length !== b.petals.length) { p.push(`${id}: petal counts ${a.petals.length} / ${b.petals.length}`); continue; }
      /* a petal's own fingerprint: its captured lamina, its triangle count and
         the hole loops its infill emitted (the infill is drawn over the
         lattice and the lamina does not carry it — the first version read the
         lamina alone and called all six infill controls dead) */
      const print = (q) => numbersOf({ lamina: q.lamina, tris: q.tris, holes: q.infill ? q.infill.emittedLoops : null });
      /* WHICH PETALS ARE ON LAYER 1 is each petal's OWN WHORL, not whether it
         carries a term: a defect that sends the offset to another whorl gives
         that whorl's petals a term too, which took them out of the checked set
         (the fifth durable rule — the review's finding). */
      let moved = 0, termed = 0;
      b.petals.forEach((q, i) => {
        const s = sameNumbers(print(a.petals[i]), print(q));
        if (Math.round(a.petals[i].whorl) === 1) { termed++; if (!s) moved++; } else if (!s || q.scopeTerm) leaked.push(`${id} (whorl ${Math.round(a.petals[i].whorl)}, slot ${q.slot.index})`);
      });
      if (!termed) p.push(`${id}: no petal is on whorl 1`);
      else if (!moved) dead.push(id);
      else if (moved !== termed) p.push(`${id}: ${moved} of ${termed} layer-1 petals moved — a layer offset reaches every petal of its layer alike`);
    }
    if (dead.length) p.push(`a layer-1 offset moved NO layer-1 petal for ${dead.length} scopeable id(s): ${dead.join(', ')}`);
    if (leaked.length) p.push(`a layer-1 offset moved a layer-0 petal: ${leaked.slice(0, 6).join(', ')}${leaked.length > 6 ? ` (+${leaked.length - 6})` : ''}`);
    rec('SO12', p, `all ${F.SCOPEABLE_IDS.length} scopeable controls move every whorl-1 petal through a layer-1 offset with their guard live, and none moves (or gives a term to) a petal on another whorl — read off each petal's own whorl`);
  }
}

/* ---------------- the browser clause ---------------- */
async function browserClauses(port, rec) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-scopes-'));
  const { browser, page } = await H.launchPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  try {
    await H.openBloom(page, port);
    const p = [];
    const rec0 = { layers: [{ layer: 0, offsets: { petalCup: 0.3 } }], petals: [{ layer: 0, slot: 1, offsets: { petalTipShape: 0.5 } }], tiers: [] };
    const before = await page.evaluate(() => window.__bloomMetrics().scopes);
    if (before !== null) p.push(`the page opened with scopes ${JSON.stringify(before)}`);
    /* per-layer values ON first (Scoping-b): a layer entry reaches a petal only
       while its toggle is live; the petal entry stays KEPT and INERT on this
       RADIAL page (per-petal is FAN only), which `petalsScoped` 8 says */
    const badT = await H.applyConfig(page, [{ id: 'scopeLayers', value: 'ON' }]);
    if (badT && badT.length) p.push(`the toggle did not apply: ${JSON.stringify(badT)}`);
    const got = await page.evaluate((r) => window.__bloomScopes(r), rec0);
    if (JSON.stringify(got) !== JSON.stringify(rec0)) p.push(`the hook handed back ${JSON.stringify(got)}`);
    const m1 = await page.evaluate(() => window.__bloomMetrics().scopes);
    if (!m1 || m1.layers !== 1 || m1.petals !== 1 || m1.petalsScoped !== 8) p.push(`the build on screen reports ${JSON.stringify(m1)} — expected 1 layer, 1 petal, 8 petals scoped`);
    const stl1 = await H.exportStl(page, tmp);
    const saved = JSON.parse(await page.evaluate(() => window.__bloomDesign.save()));
    if (JSON.stringify(saved.overrides) !== JSON.stringify(rec0)) p.push(`the save's overrides are ${JSON.stringify(saved.overrides)}`);
    await page.evaluate(() => window.__bloomScopes(null));
    if ((await page.evaluate(() => window.__bloomMetrics().scopes)) !== null) p.push('clearing the hook left scopes on the build');
    const stl0 = await H.exportStl(page, tmp);
    if (Buffer.compare(stl0, stl1) === 0) p.push('the scoped and unscoped exports are byte-identical — the offsets did not reach the build');
    const last = await page.evaluate((t) => window.__bloomDesign.load(t, 'scoped.json'), JSON.stringify(saved));
    if (last.action !== 'loaded' || last.notes.length) p.push(`the load of the page's own scoped save reports ${last.action}, notes ${JSON.stringify(last.notes)}`);
    if (!last.scopes || last.scopes.layers !== 1 || last.scopes.petals !== 1) p.push(`the load record says ${JSON.stringify(last.scopes)}`);
    const back = await page.evaluate(() => window.__bloomDesign.scopes());
    if (JSON.stringify(back) !== JSON.stringify(rec0)) p.push(`after the load the page holds ${JSON.stringify(back)}`);
    const stl2 = await H.exportStl(page, tmp);
    if (Buffer.compare(stl1, stl2) !== 0) p.push(`the STL after save -> clear -> load differs from the scoped export (${stl1.length} / ${stl2.length} bytes)`);
    /* the toggle OFF keeps the record and builds the unscoped bloom; ON again
       builds the scoped one — "off = today's panel exactly", in the file */
    await H.applyConfig(page, [{ id: 'scopeLayers', value: 'OFF' }]);
    const kept = await page.evaluate(() => window.__bloomDesign.scopes());
    if (JSON.stringify(kept) !== JSON.stringify(rec0)) p.push(`switching per-layer OFF changed the record to ${JSON.stringify(kept)}`);
    const mOff = await page.evaluate(() => window.__bloomMetrics().scopes);
    if (!mOff || mOff.layersLive !== false || mOff.petalsScoped !== 0) p.push(`with per-layer OFF the build reports ${JSON.stringify(mOff)} — expected the record kept, no petal scoped`);
    const stlOff = await H.exportStl(page, tmp);
    if (Buffer.compare(stl0, stlOff) !== 0) p.push('with per-layer OFF the export is not the unscoped one — a kept record reached the build');
    await H.applyConfig(page, [{ id: 'scopeLayers', value: 'ON' }]);
    const stlOn = await H.exportStl(page, tmp);
    if (Buffer.compare(stl1, stlOn) !== 0) p.push('per-layer ON again does not build the scoped export');
    const status = await page.evaluate(() => document.getElementById('designStatus').textContent);
    if (!/1 layer \/ 1 petal offset entries/.test(status)) p.push(`the status line reads "${status}"`);
    /* a plain save (no overrides) clears the record */
    const plain = JSON.parse(await page.evaluate(() => window.__bloomDesign.save())); plain.overrides = { layers: [], petals: [], tiers: [] };
    await page.evaluate((t) => window.__bloomDesign.load(t, 'plain.json'), JSON.stringify(plain));
    if ((await page.evaluate(() => window.__bloomDesign.scopes())) !== null) p.push('a plain file did not clear the scopes');
    const stl3 = await H.exportStl(page, tmp);
    if (Buffer.compare(stl0, stl3) !== 0) p.push('after a plain load the export is not the unscoped one');
    if (errors.length) p.push(`page errors: ${errors.slice(0, 3).join(' | ')}`);
    rec('SO9', p, `__bloomScopes sets a record the build carries (8 of 8 petals scoped), the save writes it, a load of that save restores it and the same STL (${stl1.length} bytes against ${stl0.length} unscoped), per-layer OFF keeps the record and exports the unscoped STL and ON again the scoped one, a plain file clears it`);
  } finally {
    await browser.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/* ---------------- the mutants (bloom-geometry.js copies) ---------------- */
const FAN_PETALS_ON = () => ({ ...REG.DEFAULTS, placement: 'FAN', scopePetals: 'ON' });
const TUBE_STATE = () => { const r = byLabel.get('TUBE: 8 petals x k 2 (2 panels)'); if (!r) throw new Error('the TUBE row is not in the live matrix — re-point the tube mutant'); return stateOf(r); };
const MUTANTS = [
  /* SO5 stays GREEN here and that is correct: ignoring every offset leaves the
     thickness exactly what it was, which is what SO5 asserts. */
  { id: 'offsets-are-ignored', breaks: ['SO2', 'SO3', 'SO4', 'SO6', 'SO7', 'SO12'],
    from: '  if (scopeTerm !== null) {\n    for (const base of Object.keys(scopeTerm.offsets)) {',
    to: '  if (scopeTerm !== null && false) {\n    for (const base of Object.keys(scopeTerm.offsets)) {',
    /* a direct call: the resolver handed a layer term must move the base */
    witness: (G) => G.resolveRoleOverrides({ ...REG.DEFAULTS }, [], null, null, null, { offsets: { petalCup: 0.4 }, bounds: {} }) === null },
  /* Scoping-b: "an edit lands on every scope" in the model's own terms — a
     petal entry reaches every petal of its layer. The witness is a FAN under
     per-petal values (the only place a petal entry is live now). */
  { id: 'a-petal-offset-leaks-to-every-petal', breaks: ['SO3', 'SO4', 'SO7'],
    from: '      if (e.layer !== layer || e.slot !== key) continue;',
    to: '      if (e.layer !== layer) continue;',
    witness: (G) => G.scopeOffsetsFor({ petals: [{ layer: 0, slot: 1, offsets: { petalCup: 0.4 } }] }, { layer: 0, slot: 3, n: 7, state: FAN_PETALS_ON() }) !== null },
  /* The review's fold, restored: a petal entry re-keyed through the pairing law
     at today's count, so a member index — or a canonical one the fan no longer
     builds — lands on whichever pair that number names now. */
  { id: 'a-member-index-is-re-keyed', breaks: ['SO3'],
    from: '      if (e.layer !== layer || e.slot !== key) continue;',
    to: '      if (e.layer !== layer || scopeSlotKey(e.slot, n, state) !== key) continue;',
    witness: (G) => G.scopeOffsetsFor({ petals: [{ layer: 0, slot: 4, offsets: { petalCup: 0.4 } }] }, { layer: 0, slot: 1, n: 5, state: { ...FAN_PETALS_ON(), fanPerSide: 2 } }) !== null },
  /* Validation back on the kept entries only — the first cut's shape. */
  { id: 'unreached-entries-are-not-validated', breaks: ['SO5'],
    from: '  for (const e of scopes.layers || []) checkScopeOffsets(e.offsets || {}, `layers[${e.layer}]`);\n  for (const e of scopes.petals || []) checkScopeOffsets(e.offsets || {}, `petals[${e.layer},${e.slot}]`);',
    to: '  for (const e of scopes.layers || []) if (!layersLive) checkScopeOffsets(e.offsets || {}, `layers[${e.layer}]`);\n  for (const e of scopes.petals || []) if (!petalsLive) checkScopeOffsets(e.offsets || {}, `petals[${e.layer},${e.slot}]`);',
    witness: (G) => { try { G.scopeOffsetsFor({ layers: [{ layer: 3, offsets: { sheetThickness: 0.5 } }] }, { layer: 0, slot: 0, n: 8, state: { ...REG.DEFAULTS, scopeLayers: 'ON' } }); return true; } catch (e) { return false; } } },
  { id: 'a-mirror-pair-is-split', breaks: ['SO3', 'SO4', 'SO7'],
    from: '  if (!SCOPE_PAIRED_PLACEMENTS.includes(state.placement)) return slot;\n  return Math.min(slot, mirrorPartner(slot, n, mirrorFor(state)));',
    to: '  return slot;',
    witness: (G) => G.scopeSlotKey(6, 7, FAN_PETALS_ON()) === 6 },
  { id: 'offsets-are-applied-after-the-clamp', breaks: ['SO4'],
    from: '    out[base] = clamp(composed, b.min, b.max);\n    /* WHICH BASES THE CLAMP ACTUALLY BIT',
    to: '    { const so = scopeTerm !== null && base in scopeTerm.offsets ? scopeTerm.offsets[base] : 0; out[base] = clamp(composed - so, b.min, b.max) + so; }\n    /* WHICH BASES THE CLAMP ACTUALLY BIT',
    witness: (G) => G.resolveRoleOverrides({ ...REG.DEFAULTS }, [], null, null, null, { offsets: { petalCup: 5 }, bounds: {} }).petalCup > 1.2 },
  { id: 'thickness-is-scoped', breaks: ['SO0', 'SO5'],
    from: "export const SCOPE_UNSCOPED = Object.freeze(['sheetThickness']);",
    to: 'export const SCOPE_UNSCOPED = Object.freeze([]);',
    witness: (G) => G.SCOPE_UNSCOPED.length === 0 },
  /* ---- Scoping-b: the toggles ---- */
  { id: 'the-toggle-gate-is-removed', breaks: ['SO7', 'SO10'],
    from: '  const layersLive = scopeLayersLive(state);\n  const petalsLive = scopePetalsLive(state);',
    to: '  const layersLive = true;\n  const petalsLive = true;',
    witness: (G) => G.scopeOffsetsFor({ layers: [{ layer: 0, offsets: { petalCup: 0.4 } }] }, { layer: 0, slot: 0, n: 8, state: { ...REG.DEFAULTS } }) !== null },
  { id: 'the-role-table-stays-live-under-a-toggle', breaks: ['SO11'],
    from: '    if (roleTableInert) continue;',
    to: '    if (false) continue;',
    witness: (G) => G.resolveRoleOverrides({ ...REG.DEFAULTS, scopeLayers: 'ON', innerCurl: 90 }, [G.ROLE_INNER]) !== null },
  { id: 'all-petals-forget-the-toggles', breaks: ['SO11'],
    from: '  return Math.round(state.layerCount) === 1 && !scopesOwnRoles(state);',
    to: '  return Math.round(state.layerCount) === 1;',
    witness: (G) => G.allPetalsEligible({ ...REG.DEFAULTS, scopeLayers: 'ON' }) === true },
  /* The eligibility mutants change NO geometry (the resolver's blanket skip
     keeps every role inert) — SO11's stamp clause is what sees them. */
  { id: 'the-groups-forget-per-petal', breaks: ['SO11'],
    from: "  return state.placement === 'FAN' && !scopePetalsLive(state);",
    to: "  return state.placement === 'FAN';",
    witness: (G) => G.perPetalEligible(FAN_PETALS_ON()) === true },
  { id: 'the-slot-roles-forget-per-layer', breaks: ['SO11'],
    from: "  if (scopeLayersLive(state)) return false;\n  if (state.placement !== 'RADIAL') return false;",
    to: "  if (state.placement !== 'RADIAL') return false;",
    witness: (G) => G.slotRolesEligible({ ...REG.DEFAULTS, layerCount: 2, layerPhase: 0, scopeLayers: 'ON' }) === true },
  { id: 'the-tube-ignores-per-layer', breaks: ['SO11'],
    from: '  if (scopeLayersLive(state)) return false;\n  if (sphereMode(state)) return false;',
    to: '  if (sphereMode(state)) return false;',
    witness: (G) => G.tubeEligible({ ...TUBE_STATE(), scopeLayers: 'ON' }) === true },
];
function mutate(src, m) {
  const n = src.split(m.from).length - 1;
  if (n !== 1) throw new Error(`mutant ${m.id}: anchor matches ${n} times, not once`);
  return src.replace(m.from, m.to);
}

/* ---------------- run ---------------- */
async function runAll(G, F, port, rec) {
  const results = [];
  const r = (clause, problems, detail) => results.push({ clause, ok: !problems.length, detail: problems.length ? problems.slice(0, 6).join('; ') : detail });
  await nodeClauses(G, F, r);
  if (BROWSER && port) await browserClauses(port, r);
  return results;
}
const print = (results) => { for (const r of results) console.log(`  ${r.ok ? 'ok  ' : 'FAIL'} ${r.clause}: ${r.detail}`); };

let server = null, port = null;
if (BROWSER && !NEGATIVE) ({ server, port } = await H.serveRepo());
let exit = 0;
try {
  if (!NEGATIVE) {
    const G = await load('bloom-geometry.js');
    const F = await load('bloom-file.js');
    const results = await runAll(G, F, port);
    print(results);
    const failed = results.filter((r) => !r.ok);
    console.log(failed.length ? `\nSCOPES GATE: FAIL — ${failed.length} clause(s)` : `\nSCOPES GATE: PASS — ${results.length} clauses${BROWSER ? '' : ' (Node only; --browser adds SO9)'}${FULL ? ', the full matrix in SO1' : ''}`);
    exit = failed.length ? 1 : 0;
  } else {
    const geoSrc = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
    const fileSrc = fs.readFileSync(path.join(ROOT, 'bloom-file.js'), 'utf8');
    for (const m of MUTANTS) mutate(geoSrc, m);   // every anchor, before any mutant runs
    console.log(`anchors: all ${MUTANTS.length} mutants match exactly once`);
    const cleanG = await load('bloom-geometry.js');
    for (const m of MUTANTS) if (m.witness(cleanG)) throw new Error(`mutant ${m.id}: its witness already fires on the CLEAN tree — it witnesses nothing`);
    const run = ONLY.length ? MUTANTS.filter((m) => ONLY.includes(m.id)) : MUTANTS;
    let failed = false;
    for (const m of run) {
      const tag = m.id.replace(/[^a-z0-9]/gi, '_');
      const gName = `bloom-geometry.__mutant_${tag}.js`, fName = `bloom-file.__mutant_${tag}.js`;
      fs.writeFileSync(path.join(ROOT, gName), mutate(geoSrc, m));
      fs.writeFileSync(path.join(ROOT, fName), fileSrc.replace("from './bloom-geometry.js'", `from './${gName}'`));
      let results, witnessed;
      try {
        const G = await load(gName), F = await load(fName);
        witnessed = m.witness(G);
        results = await runAll(G, F, null);
      } finally { fs.unlinkSync(path.join(ROOT, gName)); fs.unlinkSync(path.join(ROOT, fName)); }
      const red = results.filter((r) => !r.ok).map((r) => r.clause);
      const missed = m.breaks.filter((b) => !red.includes(b));
      const unclaimed = red.filter((b) => !m.breaks.includes(b));
      const okM = witnessed && !missed.length && !unclaimed.length;
      if (!okM) failed = true;
      console.log(`${okM ? 'ok  ' : 'FAIL'} ${m.id}: witness ${witnessed ? 'MOVED' : 'DID NOT MOVE'}; reddened [${red.join(', ')}]${missed.length ? `; MISSED [${missed.join(', ')}]` : ''}${unclaimed.length ? `; UNCLAIMED [${unclaimed.join(', ')}]` : ''}`);
    }
    console.log(failed ? '\nNEGATIVE CONTROL: FAILED' : `\nNEGATIVE CONTROL: PASS — ${run.length}${ONLY.length ? ` of ${MUTANTS.length} (a SUBSET)` : ''} mutants each moved their witness and reddened exactly the clauses they name`);
    exit = failed ? 1 : 0;
  }
} finally {
  if (server) server.close();
}
process.exit(exit);
