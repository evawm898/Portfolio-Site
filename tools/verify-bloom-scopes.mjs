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
     SO2  A LAYER OFFSET MOVES ONLY THAT LAYER: on a three-layer bloom an offset
          on layer 1 moves every layer-1 petal's `applied` by exactly the offset
          and leaves every other layer's petal BIT-IDENTICAL (its captured
          lamina) to the unscoped build's.
     SO3  A PETAL OFFSET MOVES ONLY THAT PETAL AND ITS MIRROR PARTNER: under
          RADIAL, FAN (both plane positions) the offset reaches slot i and
          `mirrorPartner(i)` and no other slot, an entry naming the partner
          builds the identical bloom, and under SPIRAL / CONTINUOUS it reaches
          slot i alone.
     SO4  OFFSETS COMPOSE WITH THE EXISTING CLAMP, BEFORE IT: an offset past the
          base's range lands ON the range end (never past it); a petal offset
          stacks on a role delta (base + role + offset, then clamped); under the
          variance field every composed value stays inside the base's range.
     SO5  SHEET THICKNESS IGNORES ANY OFFSET: the file's reader REFUSES the key
          with a note and keeps the rest of the entry; the geometry THROWS on a
          scopes object carrying it; a build offsetting every scopeable control
          leaves every ring's thickness what it was.
     SO6  Q3.5 AS IT STANDS TODAY (reported, for the wiring session): a layer
          offset on tilt is ADDED to the layer's `tiltExtra` ramp — the ramp is
          unchanged on every slot. The wiring session moves this clause.
     SO7  TODAY'S ROLES ARE REPRESENTABLE (the migration table, measured): ALL,
          INNER, the labellum and hood, and a FAN per-petal group, each built
          through its role controls and again through the equivalent scope
          entries with the role controls at identity — `applied` EXACT and the
          laminae bit-identical on every petal for every DELTA row.
     SO8  THE FILE: compose(state, scopes) reads back the same record with no
          note on every live matrix row; the reader's refusals on written-down
          fixtures (a bad index, a non-object offsets, a choice, a retired id,
          an unknown id, a role delta, a whorl-level id, a tier entry told).
     SO9  THE PAGE (--browser): `__bloomScopes` sets a record and the build on
          screen carries it; the page's own save writes it under `overrides`;
          a load of that save hands back the same record and the same build;
          a plain save clears it.

   --negative-control serves FIVE broken copies of bloom-geometry.js (with a
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
    const whorl = ['petalCount', 'tubeLayer1', 'tubeLayer2', 'tubeLayer3', 'tubeLayer4', 'tubeLayer5', 'tubeLayer6', 'tubeHeight', 'tubeBlend'];
    const want = REG.CONTROLS.filter((c) => c.kind === 'slider' && c.role === 'petal' && c.id !== 'sheetThickness' && !deltas.has(c.id) && !whorl.includes(c.id)).map((c) => c.id);
    if (JSON.stringify([...F.SCOPEABLE_IDS]) !== JSON.stringify(want)) p.push(`SCOPEABLE_IDS (${F.SCOPEABLE_IDS.length}) differ from the restated census (${want.length}): ${want.filter((x) => !F.SCOPEABLE_IDS.includes(x)).concat(F.SCOPEABLE_IDS.filter((x) => !want.includes(x))).join(', ')}`);
    if (F.SCOPEABLE_IDS.includes('sheetThickness')) p.push('sheetThickness is scopeable');
    const wantTier = REG.CONTROLS.filter((c) => c.kind === 'slider' && c.role === 'sepal' && c.id !== 'sepalCount').map((c) => c.id);
    if (JSON.stringify([...F.SCOPEABLE_TIER_IDS]) !== JSON.stringify(wantTier)) p.push(`SCOPEABLE_TIER_IDS differ from the restated census (sepal-role sliders less sepalCount)`);
    const b = F.scopeBounds();
    for (const id of F.SCOPEABLE_IDS) { const c = kindOf.get(id); if (!b[id] || b[id].min !== c.min || b[id].max !== c.max) p.push(`scopeBounds.${id} is ${JSON.stringify(b[id])}, the registry says ${c.min}..${c.max}`); }
    if (Object.keys(b).length !== F.SCOPEABLE_IDS.length) p.push(`scopeBounds has ${Object.keys(b).length} entries for ${F.SCOPEABLE_IDS.length} scopeable ids`);
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
  /* SO2 — a layer offset moves only its layer */
  {
    const p = [];
    const st = S({ layerCount: 3 });
    const base = build(G, F, st, undefined);
    const sc = build(G, F, st, withBounds(F, { layers: [{ layer: 1, offsets: { petalCup: 0.4 } }] }));
    if (base.petals.length !== sc.petals.length) p.push(`petal counts differ ${base.petals.length} / ${sc.petals.length}`);
    let moved = 0, held = 0;
    sc.petals.forEach((q, i) => {
      const o = base.petals[i];
      const L = sc.built.foot.rings[0] && q.scopeTerm ? q.scopeTerm.key.layer : null;
      const onLayer1 = q.scopeTerm !== null;
      const same = sameNumbers(numbersOf(o.lamina), numbersOf(q.lamina));
      if (onLayer1) {
        if (L !== 1) p.push(`petal ${i} carries a term keyed on layer ${L}`);
        if (q.applied.petalCup !== st.petalCup + 0.4) p.push(`layer-1 petal ${i}: applied cup ${q.applied.petalCup}, expected ${st.petalCup + 0.4}`);
        if (same) p.push(`layer-1 petal ${i}: the lamina did not move`);
        moved++;
      } else {
        if (!same) p.push(`a petal off layer 1 (${i}) MOVED`);
        if (q.applied.petalCup !== o.applied.petalCup) p.push(`a petal off layer 1 (${i}) changed its applied cup`);
        held++;
      }
    });
    if (moved !== 8 || held !== 16) p.push(`expected 8 moved / 16 held, read ${moved} / ${held}`);
    rec('SO2', p, `3 layers x 8: a layer-1 cup offset of +0.4 moves 8 petals by exactly 0.4 and holds the other 16 bit-identical`);
  }
  /* SO3 — a petal offset moves only that petal and its mirror partner */
  {
    const p = [];
    const cases = [
      { label: 'RADIAL 8', set: {}, slot: 1, partner: 7 },
      { label: 'FAN toggle ON (through a slot)', set: { placement: 'FAN', fanCenterPetal: 'ON' }, slot: 1, partner: null },
      { label: 'FAN toggle OFF (through the gap)', set: { placement: 'FAN', fanCenterPetal: 'OFF' }, slot: 1, partner: null },
      { label: 'SPIRAL (no plane)', set: { placement: 'SPIRAL' }, slot: 1, partner: 1 },
      { label: 'CONTINUOUS (no plane)', set: { placement: 'CONTINUOUS' }, slot: 1, partner: 1 },
    ];
    const summary = [];
    for (const c of cases) {
      const st = S(c.set);
      const base = build(G, F, st, undefined);
      const n = base.built.foot.slotCount ?? base.petals.length;
      const mirror = G.mirrorFor(st);
      const expect = c.partner === null ? G.mirrorPartner(c.slot, n, mirror) : c.partner;
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
      /* an entry naming the PARTNER builds the identical bloom under a plane */
      if (expect !== c.slot) {
        const sc2 = build(G, F, st, withBounds(F, { petals: [{ layer: 0, slot: expect, offsets: { petalCup: 0.4 } }] }));
        if (!sameNumbers([...sc.acc.positions], [...sc2.acc.positions])) p.push(`${c.label}: naming slot ${expect} builds a different bloom from naming slot ${c.slot}`);
      }
      summary.push(`${c.label}: slot ${c.slot}${expect !== c.slot ? ` + partner ${expect}` : ' alone'} (${movedSlots.length} of ${n} moved)`);
    }
    rec('SO3', p, summary.join('; '));
  }
  /* SO4 — the clamp, after composition */
  {
    const p = [];
    const b = G.composedBoundsOf('petalCup');
    const st = S({ layerCount: 3 });
    const sc = build(G, F, st, withBounds(F, { layers: [{ layer: 1, offsets: { petalCup: 5 } }] }), { lamina: false });
    const l1 = sc.petals.filter((q) => q.scopeTerm);
    if (!l1.length) p.push('no layer-1 petal built');
    for (const q of l1) if (q.applied.petalCup !== b.max) p.push(`cup ${st.petalCup} + 5 landed on ${q.applied.petalCup}, not the range end ${b.max}`);
    /* stacking on a role delta, clamped once */
    const st2 = S({ layerCount: 2, layerPhase: 0, labellumCup: 0.5 });
    const roles = build(G, F, st2, undefined, { lamina: false });
    const lab = roles.built.foot.slotRings.flatMap((r) => r).find((d) => d.slotRole === G.SLOT_LABELLUM);
    if (!lab) p.push('no labellum descriptor on the orchid state');
    else {
      const slot = lab.slots[0];
      const sc2 = build(G, F, st2, withBounds(F, { petals: [{ layer: lab.lambda, slot, offsets: { petalCup: 0.3 } }] }), { lamina: false });
      const q = sc2.petals.find((x) => x.scopeTerm && x.slot.index === slot && x.scopeTerm.key.layer === lab.lambda);
      const want = Math.min(b.max, st2.petalCup + 0.5 + 0.3);
      if (!q) p.push('the labellum petal carries no scope term');
      else if (q.applied.petalCup !== want) p.push(`labellum: base ${st2.petalCup} + role 0.5 + offset 0.3 -> ${q.applied.petalCup}, expected ${want}`);
      const sc3 = build(G, F, st2, withBounds(F, { petals: [{ layer: lab.lambda, slot, offsets: { petalCup: 5 } }] }), { lamina: false });
      const q3 = sc3.petals.find((x) => x.scopeTerm && x.slot.index === slot && x.scopeTerm.key.layer === lab.lambda);
      if (q3 && q3.applied.petalCup !== b.max) p.push(`labellum + 5: ${q3.applied.petalCup} is not the range end ${b.max} — the offset was applied AFTER the clamp`);
    }
    /* under the variance field every composed value stays in range */
    const st3 = S({ varianceForm: 1, petalCup: 1.0 });
    const sc4 = build(G, F, st3, withBounds(F, { layers: [{ layer: 0, offsets: { petalCup: 0.5, petalSpineCurl: 200 } }] }), { lamina: false });
    for (const q of sc4.petals) for (const base of ['petalCup', 'petalSpineCurl']) {
      const bb = G.composedBoundsOf(base);
      if (!(q.applied[base] >= bb.min && q.applied[base] <= bb.max)) p.push(`variance x offsets: slot ${q.slot.index} ${base} = ${q.applied[base]} outside ${bb.min}..${bb.max}`);
    }
    rec('SO4', p, `cup ${st.petalCup} + 5 lands on ${b.max}; a labellum reads base + role + offset then one clamp; under the variance field every composed value is in range`);
  }
  /* SO5 — sheet thickness ignores any offset */
  {
    const p = [];
    const doc = F.composeDoc(REG.DEFAULTS, { scopes: { layers: [{ layer: 0, offsets: { sheetThickness: 0.5, petalCup: 0.1 } }], petals: [], tiers: [] } });
    const r = F.readDoc(JSON.parse(JSON.stringify(doc)));
    if (!r.ok) p.push(`the reader refused the whole file: ${r.error}`);
    else {
      if (!r.notes.some((n) => n.kind === 'invalid' && /sheetThickness is never scoped/.test(n.text))) p.push(`the reader did not refuse the thickness offset: ${r.notes.map((n) => n.text).join(' | ') || '(no notes)'}`);
      const e = r.doc.overrides.layers[0];
      if (!e || 'sheetThickness' in e.offsets) p.push('the thickness offset survived the read');
      if (!e || e.offsets.petalCup !== 0.1) p.push('the rest of the entry did not survive the refusal of one key');
    }
    let threw = false;
    try { build(G, F, REG.DEFAULTS, { layers: [{ layer: 0, offsets: { sheetThickness: 0.5 } }], petals: [], tiers: [] }, { lamina: false }); } catch (e) { threw = /never scoped/.test(e.message); }
    if (!threw) p.push('the geometry built a bloom from a scopes object carrying sheetThickness');
    /* every scopeable control offset at once leaves every ring's thickness alone */
    const offsets = Object.fromEntries(F.SCOPEABLE_IDS.map((id) => { const c = kindOf.get(id); return [id, c.step || 0.01]; }));
    const st = S({ layerCount: 2 });
    const base = build(G, F, st, undefined, { lamina: false });
    const sc = build(G, F, st, withBounds(F, { layers: [{ layer: 0, offsets }, { layer: 1, offsets }] }), { lamina: false });
    base.built.foot.rings.forEach((rg, i) => { if (!Object.is(rg.thickness, sc.built.foot.rings[i].thickness)) p.push(`ring ${i} thickness moved ${rg.thickness} -> ${sc.built.foot.rings[i].thickness}`); });
    if (!sc.petals.every((q) => q.scopeTerm && !('sheetThickness' in q.scopeTerm.offsets))) p.push('a petal term carries sheetThickness');
    rec('SO5', p, `the reader refuses a thickness offset by name and keeps the entry; the geometry throws on one; offsetting all ${F.SCOPEABLE_IDS.length} scopeable controls leaves every ring's thickness what it was`);
  }
  /* SO6 — Q3.5 as it stands today */
  {
    const p = [];
    const st = S({ layerCount: 3, layerTilt: 12 });
    const base = build(G, F, st, undefined, { lamina: false });
    const sc = build(G, F, st, withBounds(F, { layers: [{ layer: 1, offsets: { petalTilt: 10 } }] }), { lamina: false });
    sc.petals.forEach((q, i) => {
      if (!Object.is(q.slot.tiltExtra, base.petals[i].slot.tiltExtra)) p.push(`slot ${q.slot.index}: the layer ramp's tiltExtra moved ${base.petals[i].slot.tiltExtra} -> ${q.slot.tiltExtra}`);
      if (q.scopeTerm && q.applied.petalTilt !== st.petalTilt + 10) p.push(`layer-1 slot ${q.slot.index}: applied tilt ${q.applied.petalTilt}`);
    });
    rec('SO6', p, 'TODAY a layer tilt offset is ADDED on top of the layerTilt ramp (tiltExtra unchanged on every slot) — Q3.5\'s "per-layer wins" is EXPRESSED by the model and NOT yet wired; the wiring session moves this clause');
  }
  /* SO7 — today's roles are representable as scopes (the migration table, measured) */
  {
    const p = [];
    const rows = [
      { label: 'ALL (one whorl)', set: { allCurl: 45, allCup: 0.2 }, role: G.ROLE_ALL, offsets: { petalSpineCurl: 45, petalCup: 0.2 }, scope: 'layer' },
      { label: 'INNER (3 layers)', set: { layerCount: 3, innerCurl: 90, innerCup: 0.3 }, role: G.ROLE_INNER, offsets: { petalSpineCurl: 90, petalCup: 0.3 }, scope: 'layer' },
      { label: 'LABELLUM (RADIAL, 2 whorls in step)', set: { layerCount: 2, layerPhase: 0, labellumTilt: -25, labellumCup: 0.5, labellumCurl: -60 }, role: G.SLOT_LABELLUM, offsets: { petalTilt: -25, petalCup: 0.5, petalSpineCurl: -60 }, scope: 'petal' },
      { label: 'HOOD (RADIAL, 2 whorls in step, the pair)', set: { layerCount: 2, layerPhase: 0, hoodTilt: 20, hoodCup: 0.3 }, role: G.SLOT_HOOD, offsets: { petalTilt: 20, petalCup: 0.3 }, scope: 'petal' },
      { label: 'PER-PETAL group 2 (FAN)', set: { placement: 'FAN', petal2Tilt: 45, petal2Cup: 0.5, petal2Curl: 60 }, role: G.PETAL_ROLE_ORDER[1], offsets: { petalTilt: 45, petalCup: 0.5, petalSpineCurl: 60 }, scope: 'petal' },
    ];
    const summary = [];
    for (const r of rows) {
      const st = S(r.set);
      const viaRoles = build(G, F, st, undefined);
      const identity = { ...st };
      for (const id of Object.keys(r.set)) if (G.ROLE_OVERRIDES.some((o) => o.control === id)) identity[id] = REG.DEFAULTS[id];
      const fr = viaRoles.built.foot;
      const descriptors = fr.slotRings ? fr.slotRings.flatMap((x) => x) : fr.rings;
      const carries = (d) => d.role === r.role || d.allRole === r.role || d.slotRole === r.role || d.petalRole === r.role;
      const n = fr.slotCount;
      /* THE PAIRING RESTATED HERE, never read off the module under test: a
         scope's canonical slot is the pair's lower index where the placement
         has a plane (RADIAL, FAN), the slot itself elsewhere. The first version
         called the geometry's own `scopeSlotKey`, and the mirror-split mutant
         then handed this clause one entry per member and passed it. */
      const keyOf = (slot) => (st.placement === 'RADIAL' || st.placement === 'FAN') ? Math.min(slot, G.mirrorPartner(slot, n, G.mirrorFor(st))) : slot;
      const layers = [], petals = [];
      if (r.scope === 'layer') {
        for (const L of new Set(descriptors.filter(carries).map((d) => d.lambda))) layers.push({ layer: L, offsets: { ...r.offsets } });
      } else {
        const seen = new Set();
        for (const d of descriptors.filter(carries)) for (const slot of d.slots) {
          const key = `${d.lambda}:${keyOf(slot)}`;
          if (seen.has(key)) continue; seen.add(key);
          petals.push({ layer: d.lambda, slot: keyOf(slot), offsets: { ...r.offsets } });
        }
      }
      if (!layers.length && !petals.length) { p.push(`${r.label}: no descriptor carries the role`); continue; }
      const viaScopes = build(G, F, identity, withBounds(F, { layers, petals }));
      if (viaRoles.petals.length !== viaScopes.petals.length) { p.push(`${r.label}: petal counts differ`); continue; }
      let exact = 0;
      viaRoles.petals.forEach((a, i) => {
        const b = viaScopes.petals[i];
        for (const base of Object.keys(a.applied)) if (!Object.is(a.applied[base], b.applied[base])) p.push(`${r.label}: slot ${a.slot.index} ${base} ${a.applied[base]} via roles, ${b.applied[base]} via scopes`);
        if (!sameNumbers(numbersOf(a.lamina), numbersOf(b.lamina))) p.push(`${r.label}: slot ${a.slot.index} lamina differs between the role build and the scope build`);
        else exact++;
      });
      if (!sameNumbers([...viaRoles.acc.positions], [...viaScopes.acc.positions])) p.push(`${r.label}: the two export streams differ`);
      summary.push(`${r.label}: ${layers.length} layer / ${petals.length} petal entr${layers.length + petals.length === 1 ? 'y' : 'ies'}, ${exact} petals bit-identical`);
    }
    /* the one semantic loss: a mul row (size) as a delta at the migrated global */
    {
      const st = S({ layerCount: 2, layerPhase: 0, labellumSize: 1.3 });
      const viaRoles = build(G, F, st, undefined, { lamina: false });
      const lab = viaRoles.built.foot.slotRings.flatMap((x) => x).find((d) => d.slotRole === G.SLOT_LABELLUM);
      const nn = viaRoles.built.foot.slotCount;
      const slot = Math.min(lab.slots[0], G.mirrorPartner(lab.slots[0], nn, G.mirrorFor(st)));
      const viaScopes = build(G, F, { ...st, labellumSize: 1 }, withBounds(F, { petals: [{ layer: lab.lambda, slot, offsets: { petalLength: st.petalLength * 0.3, petalWidth: st.petalWidth * 0.3 } }] }), { lamina: false });
      const a = viaRoles.petals.find((q) => q.slot.index === lab.slots[0] && q.overridden), b = viaScopes.petals.find((q) => q.scopeTerm && q.slot.index === lab.slots[0]);
      const dL = Math.abs(a.applied.petalLength - b.applied.petalLength), dW = Math.abs(a.applied.petalWidth - b.applied.petalWidth);
      if (dL > 1e-9 || dW > 1e-9) p.push(`labellumSize 1.3 as a delta: length off by ${dL}, width by ${dW}`);
      summary.push(`labellumSize x1.3 as delta global*(0.3): length within ${dL.toExponential(1)}, width within ${dW.toExponential(1)} (a mul is not a delta to the bit; the OFFSETS default's one semantic loss)`);
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
      const notes = r.notes.filter((n) => !(n.kind === 'not-applied' && /overrides\.tiers/.test(n.text)));
      const own = r.notes.filter((n) => /^overrides\./.test(n.text) && !/overrides\.tiers holds/.test(n.text));
      if (own.length) p.push(`${row.label}: ${own.map((n) => n.text).join(' | ')}`);
      if (JSON.stringify(r.doc.overrides) !== JSON.stringify(fixture)) p.push(`${row.label}: the record did not round-trip`);
      if (!r.notes.some((n) => n.kind === 'not-applied' && /overrides\.tiers holds 1 entry/.test(n.text))) p.push(`${row.label}: the tier entry was not told`);
      void notes; rows++;
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
    { const o = base(); o.overrides.layers = [{ layer: 0, offsets: { placement: 1, petalInfill: 2, petalCount: 1, allCup: 0.1, petalTipBreadth: 0.2, nonsense: 3, petalCup: 'x', petalCupGradient: 0.3 }, extra: 1 }];
      const r = expect('bad keys', o, [['invalid', /placement: a choice has no offset/], ['invalid', /petalCount: a whorl-level value/], ['invalid', /allCup: a role delta/], ['retired', /petalTipBreadth names a retired control/], ['unknown', /offsets\.nonsense is not a control/], ['invalid', /petalCup is "x", not a number/], ['unknown', /layers\[0\]\.extra is not a field/]]);
      if (r.ok && JSON.stringify(r.doc.overrides.layers[0]) !== JSON.stringify({ layer: 0, offsets: { petalCupGradient: 0.3 } })) p.push(`bad keys: the kept entry is ${JSON.stringify(r.doc.overrides.layers[0])}`); }
    { const o = base(); o.overrides.tiers = [{ tier: 0, offsets: { sepalCup: 0.1 } }]; const r = expect('a tier entry', o, [['not-applied', /tiers holds 1 entry — kept/]]); if (r.ok && r.doc.overrides.tiers.length !== 1) p.push('the tier entry was dropped'); }
    { const r = F.readDoc(base()); if (r.notes.length) p.push(`a plain compose(DEFAULTS) reports ${texts(r)}`); if (!F.scopesAreEmpty(r.doc.overrides) || F.scopesForBuild(r.doc.overrides) !== null) p.push('empty containers do not read as no scopes'); }
    { const sc = F.scopesForBuild(fixture); if (!sc || sc.layers.length !== 1 || sc.petals.length !== 2 || !sc.bounds.petalCup) p.push('scopesForBuild did not carry the lists and the bounds'); }
    rec('SO8', p, `${rows} live rows round-trip a two-layer / two-petal / one-tier record with no note but the tier's; every written-down refusal fires by name`);
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
    const status = await page.evaluate(() => document.getElementById('designStatus').textContent);
    if (!/1 layer \/ 1 petal offset entries/.test(status)) p.push(`the status line reads "${status}"`);
    /* a plain save (no overrides) clears the record */
    const plain = JSON.parse(await page.evaluate(() => window.__bloomDesign.save())); plain.overrides = { layers: [], petals: [], tiers: [] };
    await page.evaluate((t) => window.__bloomDesign.load(t, 'plain.json'), JSON.stringify(plain));
    if ((await page.evaluate(() => window.__bloomDesign.scopes())) !== null) p.push('a plain file did not clear the scopes');
    const stl3 = await H.exportStl(page, tmp);
    if (Buffer.compare(stl0, stl3) !== 0) p.push('after a plain load the export is not the unscoped one');
    if (errors.length) p.push(`page errors: ${errors.slice(0, 3).join(' | ')}`);
    rec('SO9', p, `__bloomScopes sets a record the build carries (8 of 8 petals scoped), the save writes it, a load of that save restores it and the same STL (${stl1.length} bytes against ${stl0.length} unscoped), a plain file clears it`);
  } finally {
    await browser.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/* ---------------- the mutants (bloom-geometry.js copies) ---------------- */
const MUTANTS = [
  /* SO5 stays GREEN here and that is correct: ignoring every offset leaves the
     thickness exactly what it was, which is what SO5 asserts. */
  { id: 'offsets-are-ignored', breaks: ['SO2', 'SO3', 'SO4', 'SO6', 'SO7'],
    from: '  if (scopeTerm !== null) {\n    for (const base of Object.keys(scopeTerm.offsets)) {',
    to: '  if (scopeTerm !== null && false) {\n    for (const base of Object.keys(scopeTerm.offsets)) {',
    /* a direct call: the resolver handed a layer term must move the base */
    witness: (G) => G.resolveRoleOverrides({ ...REG.DEFAULTS }, [], null, null, null, { offsets: { petalCup: 0.4 }, bounds: {} }) === null },
  { id: 'a-petal-offset-leaks-to-every-petal', breaks: ['SO3', 'SO7'],
    from: '    if (e.layer !== layer || scopeSlotKey(e.slot, n, state) !== key) continue;',
    to: '    if (e.layer !== layer) continue;',
    witness: (G) => G.scopeOffsetsFor({ petals: [{ layer: 0, slot: 1, offsets: { petalCup: 0.4 } }] }, { layer: 0, slot: 3, n: 8, state: REG.DEFAULTS }) !== null },
  { id: 'a-mirror-pair-is-split', breaks: ['SO3', 'SO7'],
    from: '  if (!SCOPE_PAIRED_PLACEMENTS.includes(state.placement)) return slot;\n  return Math.min(slot, mirrorPartner(slot, n, mirrorFor(state)));',
    to: '  return slot;',
    witness: (G) => G.scopeSlotKey(7, 8, REG.DEFAULTS) === 7 },
  { id: 'offsets-are-applied-after-the-clamp', breaks: ['SO4'],
    from: '    out[base] = clamp(composed, b.min, b.max);\n    /* WHICH BASES THE CLAMP ACTUALLY BIT',
    to: '    { const so = scopeTerm !== null && base in scopeTerm.offsets ? scopeTerm.offsets[base] : 0; out[base] = clamp(composed - so, b.min, b.max) + so; }\n    /* WHICH BASES THE CLAMP ACTUALLY BIT',
    witness: (G) => G.resolveRoleOverrides({ ...REG.DEFAULTS }, [], null, null, null, { offsets: { petalCup: 5 }, bounds: {} }).petalCup > 1.2 },
  { id: 'thickness-is-scoped', breaks: ['SO0', 'SO5'],
    from: "export const SCOPE_UNSCOPED = Object.freeze(['sheetThickness']);",
    to: 'export const SCOPE_UNSCOPED = Object.freeze([]);',
    witness: (G) => G.SCOPE_UNSCOPED.length === 0 },
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
