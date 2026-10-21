#!/usr/bin/env node
/* THE SCOPES GATE — the parameter-scoping STATE MODEL (Scoping-a; feature map
   §3 and §11, Eva's rulings Q3.1–Q3.9). ZERO controls reach the model; it is
   reached by the design file's `overrides` containers and by the page's
   `__bloomScopes` hook, and this gate is the only witness that the resolution
   does what the model says — a petal's effective state is

     global -> + layer offsets -> + petal offsets (one scope per mirror pair)
     -> + the variance slot term -> the ONE clamp

   resolved in `resolvePetalTerms` and nowhere else (bloom-geometry.js,
   PARAMETER SCOPING). Both STL gates are structurally blind to all of it: a
   scoped build is a perfectly good watertight bloom whatever the offsets did.

   THE CLAUSES
     SO0  THE MODEL'S CENSUS, from independent owners: `SCOPE_UNSCOPED` is
          exactly sheet thickness; `SCOPEABLE_IDS` is exactly the registry's
          petal-role sliders less the unscoped and the whorl-level sets,
          restated HERE from the registry; `scopeBounds()` is the registry's
          own min/max; and THE ROLE TABLE IS GONE (Q3.4): no retired role id is
          a live control, every one is in RETIRED_IDS with `migrateRoles` as its
          migration, and the geometry exports no role table.
     SO1  EMPTY SCOPES ARE THE IDENTITY BY BRANCH: a build with no scopes and a
          build with empty containers emit the same floats positionally under
          `Object.is`, both modes, on eleven named rows (`--smoke`: the smoke
          subset; `--full`: every row), and every petal records `scopeTerm:
          null`. The whole-matrix claim against the BASE tree is
          verify-bloom-surface-bytes', run at the close.
     SO2  A LAYER OFFSET MOVES ONLY THAT LAYER (per-layer values live —
          RADIAL or a layered SPIRAL + `scopeLayers` ON, Scoping-b and Eva's
          ruling of Oct 16, a spiral's turn its layer): on a three-layer bloom an
          offset on layer 1 moves every layer-1 petal's `applied` by exactly
          the offset and leaves every other layer's petal BIT-IDENTICAL (its
          captured lamina) to the unscoped build's.
     SO3  A PETAL OFFSET MOVES ONLY THAT PETAL AND ITS MIRROR PARTNER
          (per-petal values live — FAN + `scopePetals` ON): through a slot and
          through the gap, the offset reaches slot i and its partner (restated
          from the fan's own involution) and no other slot; an entry naming
          the partner builds the identical bloom; the mirror-line petal is a
          pair of one.
     SO4  OFFSETS COMPOSE WITH THE EXISTING CLAMP, BEFORE IT: an offset past
          the base's range lands ON the range end; a layer entry reads base +
          offset; under the variance field every composed value stays inside
          the base's range.
     SO5  SHEET THICKNESS IGNORES ANY OFFSET: the file's reader REFUSES the key
          with a note and keeps the rest of the entry; the geometry THROWS on a
          scopes object carrying it, live or kept; a build offsetting every
          scopeable control leaves every ring's thickness what it was.
     SO6  Q3.5, WIRED (the role retirement): under per-layer values a layer
          entry naming petalLength / petalWidth / petalTilt OWNS that base for
          its layer — the blade is built from global + offset with the ramp's
          term (layerSize's scale, layerTilt's tiltExtra) left OUT, restated
          here from the controls and read off the builder's reported asked
          length and root tilt; a layer that names none of them keeps the
          ramps (anti-vacuity: its blade moves with layerSize and layerTilt).
     SO7  THE MIGRATION LANDS ON THE OLD COMPOSITION (the migration table,
          measured): written-down states carrying the RETIRED role ids — ALL
          (RADIAL and FAN), INNER (RADIAL and FAN), a FAN per-petal group, a
          size multiplier, INNER and a group together — are migrated by
          `migrateRoles` and built; every petal's `applied` is the old law
          (base + deltas, x multipliers, clamped once to the registry's range)
          RESTATED here, on the petals the old law reached and on no other,
          the pair placed by the fan's own involution restated here. The
          RADIAL labellum and hood are DROPPED BY RULING and told; the design
          file reports what migrated and what was dropped, never silently.
          (Byte identity against the BASE tree is the partition tool's:
          tools/verify-bloom-role-retirement.mjs.)
     SO8  THE FILE: compose(state, scopes) reads back the same record with no
          note on every live matrix row; the reader's refusals on written-down
          fixtures (a bad index, a non-object offsets, a choice, a retired id,
          an unknown id, a retired role id, a whorl-level id, a tier entry told).
     SO9  THE PAGE (--browser): `__bloomScopes` sets a record and the build on
          screen carries it; the page's own save writes it under `overrides`;
          a load of that save hands back the same record and the same build;
          switching per-layer OFF keeps the record and builds the unscoped STL,
          ON again the scoped one; a plain save clears it.
     SO10 THE TOGGLE GATE: a record whose toggle is OFF, or ON under the wrong
          placement (per-layer under FAN, per-petal under RADIAL or SPIRAL,
          either under CONTINUOUS), is KEPT and INERT — bit-identical to no
          record, both modes, every term null.
     SO11 THE RETIRED IDS ARE INERT AND A TOGGLE ALONE MOVES NOTHING: a state
          carrying every retired role id at a non-identity value, handed
          straight to the geometry UNMIGRATED, builds bit-identically to the
          same state without them (RADIAL 2 in step, FAN, 3 layers, both
          modes); a toggle with no record moves nothing; per-layer makes the
          tube unavailable.
     SO12 EVERY SCOPEABLE CONTROL REACHES A PETAL: a layer-1 offset on each,
          with its own guard live, moves every layer-1 petal and no layer-0
          one — a scopeable id that moves nothing is a control the panel would
          rebind to no effect. The one exception is the WIDTH, and it is
          checked: an owned width moves its layer's foot, the area rule moves
          the hub, and every layer-0 petal is carried out radially by exactly
          the rim's shift with every normal the same double (Oct 16).
     SO13 THE FOOT AND THE RING FOLLOW AN OWNED WIDTH (Eva's ruling, Oct 16:
          "a layer's own size and tilt drive the WHOLE petal — foot and ring as
          well as blade"), RADIAL and SPIRAL: each ring's foot width, the hub
          radius (the area rule over every foot) and each ring's radius are
          RESTATED here from the controls and the row's entries — an owned
          width gives the foot `own x 0.4 x delicacy` and a ring past the first
          `R0 x own / petalWidth`; past 1 the HUB GROWS to the widest such ring
          (Eva's ruling, Oct 16, replacing the rim hold) and the record says
          which and by how much; ring 1 is the rim otherwise — and compared against footRing()'s rings and the feet
          the builder EMITTED (their half-width). An owned LENGTH or TILT moves
          no foot float and no ring (the foot reads neither), measured on the
          emitted foot rows; the un-owning layers keep the ramp.

   --negative-control serves broken copies of bloom-geometry.js OR
   bloom-registry.js (with a bloom-file.js copy importing each), every anchor
   checked before any runs,
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
  'ORCHID x the IRIS (both role axes, one bloom)',
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
    if (w.id === REG.SCOPES_SET_ID) continue;   // the row's own overrides record; this gate builds its own
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
async function nodeClauses(G, F, R, rec) {
  /* SO0 — the census, restated from the registry */
  {
    const p = [];
    if (JSON.stringify([...G.SCOPE_UNSCOPED]) !== JSON.stringify(['sheetThickness'])) p.push(`SCOPE_UNSCOPED is ${JSON.stringify(G.SCOPE_UNSCOPED)}`);
    const whorl = ['petalCount', 'footDelicacy', 'tubeLayer1', 'tubeLayer2', 'tubeLayer3', 'tubeLayer4', 'tubeLayer5', 'tubeLayer6', 'tubeHeight', 'tubeBlend'];
    const want = REG.CONTROLS.filter((c) => c.kind === 'slider' && c.role === 'petal' && c.id !== 'sheetThickness' && !whorl.includes(c.id)).map((c) => c.id);
    if (JSON.stringify([...F.SCOPEABLE_IDS]) !== JSON.stringify(want)) p.push(`SCOPEABLE_IDS (${F.SCOPEABLE_IDS.length}) differ from the restated census (${want.length}): ${want.filter((x) => !F.SCOPEABLE_IDS.includes(x)).concat(F.SCOPEABLE_IDS.filter((x) => !want.includes(x))).join(', ')}`);
    if (F.SCOPEABLE_IDS.includes('sheetThickness')) p.push('sheetThickness is scopeable');
    /* THE ROLE TABLE IS RETIRED (Q3.4): the 47 ids, written down here rather
       than read from the registry's list, so a list that lost a row is seen */
    const ROLE_IDS = ['allCurl', 'allCup', 'innerCurl', 'innerCup', 'labellumSize', 'labellumTilt', 'labellumCup', 'labellumCurl', 'hoodSize', 'hoodTilt', 'hoodCup',
      ...Array.from({ length: 9 }, (_, k) => ['Size', 'Tilt', 'Cup', 'Curl'].map((x) => `petal${k + 1}${x}`)).flat()];
    const live = ROLE_IDS.filter((id) => kindOf.has(id));
    if (live.length) p.push(`retired role id(s) are still live controls: ${live.join(', ')}`);
    const notRetired = ROLE_IDS.filter((id) => !R.RETIRED_IDS.some((r) => r.id === id && r.migrateBy === 'migrateRoles'));
    if (notRetired.length) p.push(`retired role id(s) not in RETIRED_IDS with migrateRoles as their migration: ${notRetired.join(', ')}`);
    if (JSON.stringify([...R.RETIRED_ROLE_IDS].sort()) !== JSON.stringify([...ROLE_IDS].sort())) p.push(`RETIRED_ROLE_IDS (${R.RETIRED_ROLE_IDS.length}) is not the 47 written down here`);
    for (const k of ['ROLE_OVERRIDES', 'resolveRoleOverrides', 'slotRolesEligible', 'perPetalEligible', 'allPetalsEligible']) if (G[k] !== undefined) p.push(`the geometry still exports ${k}`);
    /* the two whorl-level sepal values (F1.1a): the count, and the tier count */
    const wantTier = REG.CONTROLS.filter((c) => c.kind === 'slider' && c.role === 'sepal' && c.id !== 'sepalCount' && c.id !== 'sepalTiers').map((c) => c.id);
    if (JSON.stringify([...F.SCOPEABLE_TIER_IDS]) !== JSON.stringify(wantTier)) p.push(`SCOPEABLE_TIER_IDS differ from the restated census (sepal-role sliders less sepalCount and sepalTiers)`);
    const b = F.scopeBounds();
    for (const id of [...F.SCOPEABLE_IDS, ...F.SCOPEABLE_TIER_IDS]) { const c = kindOf.get(id); if (!b[id] || b[id].min !== c.min || b[id].max !== c.max) p.push(`scopeBounds.${id} is ${JSON.stringify(b[id])}, the registry says ${c.min}..${c.max}`); }
    /* the braid's three strand ids (restated here, never imported): one strand's
       length, coil radius and coil turns, with the registry's bounds */
    const STRAND_RESTATED = ['stamenLength', 'stamenCoilRadius', 'stamenCoilTurns'];
    for (const id of STRAND_RESTATED) { const c = kindOf.get(id); if (!b[id] || b[id].min !== c.min || b[id].max !== c.max) p.push(`scopeBounds.${id} is ${JSON.stringify(b[id])}, the registry says ${c.min}..${c.max}`); }
    if (Object.keys(b).length !== F.SCOPEABLE_IDS.length + F.SCOPEABLE_TIER_IDS.length + STRAND_RESTATED.length) p.push(`scopeBounds has ${Object.keys(b).length} entries for ${F.SCOPEABLE_IDS.length} + ${F.SCOPEABLE_TIER_IDS.length} + ${STRAND_RESTATED.length} scopeable ids`);
    rec('SO0', p, `sheet thickness is the one unscoped control; ${F.SCOPEABLE_IDS.length} petal sliders are scopeable (layers / petals) and ${F.SCOPEABLE_TIER_IDS.length} sepal sliders (tiers), with the registry's own bounds; the 47 role ids are retired, migrate through migrateRoles, and no role table is exported`);
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
    const said = [];
    /* RADIAL, and the LAYERED SPIRAL since Eva's ruling of Oct 16 — a turn is
       the spiral descriptor's own depth, so the same whorl index reaches it */
    for (const placement of ['RADIAL', 'SPIRAL']) {
    const st = S({ layerCount: 3, scopeLayers: 'ON', placement });
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
    if (moved !== 8 || held !== 16) p.push(`${placement}: expected 8 moved / 16 held, read ${moved} / ${held}`);
    said.push(`${placement} ${moved} moved / ${held} held`);
    }
    rec('SO2', p, `3 layers x 8, per-layer values ON, RADIAL and SPIRAL: a cup offset of +0.4 on Layer ${LAYER + 1} (the innermost; on a spiral, its innermost turn) moves exactly its whorl's 8 petals by 0.4 — read off each petal's own whorl — and holds the other 16 bit-identical (${said.join('; ')})`);
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
  /* SO4 — the clamp, after composition */
  {
    const p = [];
    const b = G.composedBoundsOf('petalCup');
    const st = S({ layerCount: 3, scopeLayers: 'ON' });
    const sc = build(G, F, st, withBounds(F, { layers: [{ layer: 1, offsets: { petalCup: 5 } }] }), { lamina: false });
    const l1 = sc.petals.filter((q) => q.scopeTerm);
    if (!l1.length) p.push('no layer-1 petal built');
    for (const q of l1) if (q.applied.petalCup !== b.max) p.push(`cup ${st.petalCup} + 5 landed on ${q.applied.petalCup}, not the range end ${b.max}`);
    /* a layer entry reads base + offset, and a pair entry the same on exactly
       its two petals — nothing composes between the global and the scope now
       that the role table is retired (Q3.4) */
    const st2 = S({ layerCount: 2, scopeLayers: 'ON' });
    const sc2 = build(G, F, st2, withBounds(F, { layers: [{ layer: 1, offsets: { petalCup: 0.3 } }] }), { lamina: false });
    const t2 = sc2.petals.filter((x) => x.scopeTerm);
    if (t2.length !== 8) p.push(`RADIAL 2 layers, per-layer ON: ${t2.length} petals carry the layer-1 term, expected 8`);
    for (const q of t2) if (q.applied.petalCup !== st2.petalCup + 0.3) p.push(`RADIAL, per-layer ON: slot ${q.slot.index} reads ${q.applied.petalCup}, expected base ${st2.petalCup} + offset 0.3`);
    const st3 = S({ placement: 'FAN', scopePetals: 'ON' });
    const sc3 = build(G, F, st3, withBounds(F, { petals: [{ layer: 0, slot: 1, offsets: { petalCup: 0.3 } }] }), { lamina: false });
    const pair = sc3.petals.filter((x) => x.scopeTerm);
    if (pair.length !== 2) p.push(`FAN per-petal ON: ${pair.length} petals carry the pair's term, expected 2`);
    for (const q of pair) if (q.applied.petalCup !== st3.petalCup + 0.3) p.push(`FAN, per-petal ON: slot ${q.slot.index} reads ${q.applied.petalCup}, expected base + offset 0.3`);
    /* under the variance field every composed value stays in range */
    const st4 = S({ varianceForm: 1, petalCup: 1.0, scopeLayers: 'ON' });
    const sc4 = build(G, F, st4, withBounds(F, { layers: [{ layer: 0, offsets: { petalCup: 0.5, petalSpineCurl: 200 } }] }), { lamina: false });
    if (!sc4.petals.some((q) => q.scopeTerm)) p.push('variance x offsets: no petal carries the term');
    for (const q of sc4.petals) for (const base of ['petalCup', 'petalSpineCurl']) {
      const bb = G.composedBoundsOf(base);
      if (!(q.applied[base] >= bb.min && q.applied[base] <= bb.max)) p.push(`variance x offsets: slot ${q.slot.index} ${base} = ${q.applied[base]} outside ${bb.min}..${bb.max}`);
    }
    rec('SO4', p, `cup ${st.petalCup} + 5 lands on ${b.max}; a layer entry reads base + offset on its 8 petals and a pair entry on its 2; under the variance field every composed value is in range`);
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
  /* SO6 — Q3.5, WIRED: a layer that owns its size or tilt drops the ramp.
     The expected values are RESTATED from the controls and the ring the
     builder placed (footRing's own scale and tiltExtra, an owner the
     ownership decision does not write); the measured ones are what the
     builder emitted the blade at — its asked length and its root tilt. */
  {
    const p = [];
    const st = S({ layerCount: 3, layerTilt: 12, layerSize: 0.7, scopeLayers: 'ON' });
    const sc = build(G, F, st, withBounds(F, { layers: [{ layer: 1, offsets: { petalTilt: 10, petalLength: 0 } }, { layer: 2, offsets: { petalCup: 0.2 } }] }), { lamina: false });
    const rings = sc.built.foot.rings;
    const ringOf = (w) => rings.find((r) => Math.round(r.lambda) === w);
    let owned = 0, ramped = 0;
    for (const q of sc.petals) {
      const w = Math.round(q.whorl), r = ringOf(w);
      if (!r) { p.push(`whorl ${w}: no ring`); continue; }
      if (w === 1) {
        owned++;
        const wantTilt = ((Number(st.petalTilt) + 10 + 0 + 0) * Math.PI) / 180;
        if (!Object.is(q.rootRow.tiltRad, wantTilt)) p.push(`layer 2 (owns tilt): slot ${q.slot.index} root tilt ${(q.rootRow.tiltRad * 180 / Math.PI).toFixed(6)} deg, expected ${Number(st.petalTilt) + 10} — the ramp's ${r.tiltExtra} deg was not left out`);
        if (!Object.is(q.askedLength, Number(st.petalLength) + 0)) p.push(`layer 2 (owns length): slot ${q.slot.index} asked length ${q.askedLength}, expected the global ${st.petalLength} — the ramp's scale ${r.scale} was not left out`);
        if (r.scale === 1 || r.tiltExtra === 0) p.push('layer 2: the ring carries no ramp, so ownership would be vacuous');
      } else if (w === 2) {
        ramped++;
        const wantTilt = ((Number(st.petalTilt) + r.tiltExtra + 0) * Math.PI) / 180;
        if (!Object.is(q.rootRow.tiltRad, wantTilt)) p.push(`layer 3 (owns nothing): slot ${q.slot.index} root tilt is not global + the ramp's ${r.tiltExtra}`);
        if (Math.abs(q.askedLength - Number(st.petalLength) * r.scale) > 1e-9) p.push(`layer 3 (owns nothing): slot ${q.slot.index} asked length ${q.askedLength}, expected ${st.petalLength} x ${r.scale}`);
      }
    }
    if (owned !== 8 || ramped !== 8) p.push(`expected 8 owned / 8 ramped petals, read ${owned} / ${ramped}`);
    /* a record with no layer entry at all keeps every ramp — per-layer ON on its own is not ownership */
    const plain = build(G, F, st, undefined, { lamina: false });
    for (const q of plain.petals) { const r = ringOf(Math.round(q.whorl)); if (r && !Object.is(q.rootRow.tiltRad, ((Number(st.petalTilt) + r.tiltExtra + 0) * Math.PI) / 180)) p.push(`per-layer ON with no record: slot ${q.slot.index} on whorl ${Math.round(q.whorl)} does not carry its ramp`); }
    rec('SO6', p, `Q3.5: under per-layer values a layer entry naming tilt and length builds its 8 blades at global + offset (${Number(st.petalTilt) + 10} deg, ${st.petalLength} mm) with the ramp's 12 deg and x0.70 left out; a layer naming neither keeps the ramp (24 deg, x0.49), as does per-layer with no record`);
  }
  /* SO13 — THE FOOT AND THE RING FOLLOW AN OWNED WIDTH (Eva's ruling, Oct 16).
     EXPECTED, restated here from the CONTROLS and the row's own entries: the
     foot width (the clamp the declarations name), the area rule over every
     foot, and the ring radius — never footRing()'s own answer, which is the
     quantity under test; the measured side is footRing()'s rings AND the feet
     the builder emitted (each foot row's half-width), which no declaration can
     lie about. Ring thickness is footRing()'s (not under test here). */
  {
    const p = [];
    const said = [];
    const clampW = (w) => Math.min(G.FOOT_MAX_WIDTH_MM, Math.max(G.FOOT_MIN_WIDTH_MM, w));
    for (const placement of ['RADIAL', 'SPIRAL']) {
      /* layer 1 owns a narrower width (its foot only — its ring IS the rim),
         layer 2 owns a width (foot AND ring), layer 3 owns length and tilt
         (no foot, no ring), layer 4 owns a width wider than the outer whorl's
         (the hub grows to its ring, told) */
      const st = S({ placement, layerCount: 4, layerSize: 0.7, scopeLayers: 'ON' });
      const rec0 = { layers: [
        { layer: 0, offsets: { petalWidth: -2 } },
        { layer: 1, offsets: { petalWidth: -4 } },
        { layer: 2, offsets: { petalLength: 5, petalTilt: 8 } },
        { layer: 3, offsets: { petalWidth: 3 } },
      ] };
      const sc = build(G, F, st, withBounds(F, rec0), { lamina: false });
      const rings = sc.built.foot.rings;
      const n = sc.built.foot.slotCount;
      const ownW = (L) => { const e = rec0.layers.find((x) => x.layer === L); return e && 'petalWidth' in e.offsets ? Number(st.petalWidth) + e.offsets.petalWidth : null; };
      const want = [];
      let sumSq = 0;
      for (let L = 0; L < 4; L++) {
        const scale = Math.pow(Number(st.layerSize), L);
        const w = ownW(L);
        const width = clampW(w === null ? Number(st.petalWidth) * scale * 0.4 * Number(st.footDelicacy) : w * 0.4 * Number(st.footDelicacy));
        const t = rings[L].thickness;
        const rFoot = Math.sqrt((width * t) / Math.PI);
        sumSq += n * rFoot * rFoot;
        want.push({ width, factor: w === null ? scale : L === 0 ? 1 : w / Number(st.petalWidth), owned: w !== null });
      }
      const R0 = Math.sqrt(sumSq) * Number(st.spread);
      for (let L = 0; L < 4; L++) {
        const r = rings[L], w = want[L];
        if (!Object.is(r.width, w.width)) p.push(`${placement} layer ${L + 1}: foot width ${r.width}, restated ${w.width}`);
        if (!Object.is(r.radius, R0 * w.factor)) p.push(`${placement} layer ${L + 1}: ring radius ${r.radius}, restated R0 ${R0} x ${w.factor} = ${R0 * w.factor}`);
        const feet = sc.petals.filter((q) => Math.round(q.whorl) === L);
        if (!feet.length) p.push(`${placement} layer ${L + 1}: no petal was built`);
        for (const q of feet) for (const f of q.footFrames) if (!Object.is(f.h, w.width / 2)) p.push(`${placement} layer ${L + 1} slot ${q.slot.index}: an emitted foot row is ${2 * f.h} mm across, restated ${w.width}`);
      }
      /* THE HUB GROWS TO THE WIDEST OWNED RING PAST THE RIM: restated, the layer
         and the radius, and it must have grown here or this arm is vacuous */
      let gf = 1, gl = -1;
      for (let L = 1; L < 4; L++) if (want[L].owned && want[L].factor > gf) { gf = want[L].factor; gl = L; }
      if (gl < 0) p.push(`${placement}: no owned ring asked past the rim — the growth arm would be vacuous`);
      const hubR = sc.built.hub.radius, gr = sc.built.hub.growth;
      if (!Object.is(hubR, gl >= 0 ? R0 * gf : R0)) p.push(`${placement}: the hub's radius is ${hubR}, restated ${gl >= 0 ? `R0 ${R0} x ${gf}` : R0}`);
      if (!gr || gr.layer !== gl) p.push(`${placement}: the hub reports growth ${JSON.stringify(gr)}, restated for layer ${gl + 1}`);
      if (gl >= 0 && !Object.is(rings[gl].radius, hubR)) p.push(`${placement}: the widest owned ring ${rings[gl].radius} is not ON the grown rim ${hubR}`);
      if (Object.is(rings[1].radius, R0 * Math.pow(Number(st.layerSize), 1))) p.push(`${placement}: layer 2's ring sits where the ramp would put it — ownership would be vacuous`);
      /* AN OWNED LENGTH OR TILT MOVES NO FOOT AND NO RING: the same state with
         layer 3's entry removed builds every ring and every emitted foot row of
         layer 3 to the bit — asked at TWO owned lengths since big petals (Oct
         21): over the root taper's 35 mm reference (35 + 5 = 40 mm, where the
         foot thickens by the restated root factor and nothing else moves) and
         under it (35 - 10 = 25 mm, where not one foot value moves). */
      for (const lenOff of [5, -10]) {
      const recL = { layers: rec0.layers.map((e) => (e.layer === 2 ? { layer: 2, offsets: { petalLength: lenOff, petalTilt: 8 } } : e)) };
      const sc = build(G, F, st, withBounds(F, recL), { lamina: false });
      const sc2 = build(G, F, st, withBounds(F, { layers: rec0.layers.filter((e) => e.layer !== 2) }), { lamina: false });
      for (const k of ['radius', 'width', 'overhang']) if (!Object.is(sc.built.foot.rings[2][k], sc2.built.foot.rings[2][k])) p.push(`${placement} layer 3 (owned length ${35 + lenOff} mm): an owned length/tilt moved the ring's ${k} ${sc2.built.foot.rings[2][k]} -> ${sc.built.foot.rings[2][k]}`);
      const fa = sc.petals.filter((q) => Math.round(q.whorl) === 2), fb = sc2.petals.filter((q) => Math.round(q.whorl) === 2);
      /* EXCEPT ITS THICKNESS, BY THE ROOT TAPER (big petals, Oct 21): a layer
         owning a length past the 35 mm reference stands its foot on a root
         `rootFactor` sheets thick — the law's own root, restated from the
         owned asked length through the harness's other integrator, never
         read from the build. At or under the reference: the same bits as
         before. Position, frame and half-width move nothing either way. */
      const flat = (qs) => qs.flatMap((q) => q.footFrames.flatMap((f) => [...f.C, ...f.N, ...f.T, f.h]));
      if (!sameNumbers(flat(fa), flat(fb))) p.push(`${placement} layer 3 (owned length ${35 + lenOff} mm): an owned length/tilt moved an emitted foot row (position, frame or half-width)`);
      for (const [qa, qb] of fa.map((q, i) => [q, fb[i]])) {
        const f = H.rootFactorRestated(qa.askedLength);
        for (const [i, fra] of qa.footFrames.entries()) {
          const t0 = qb.footFrames[i].t, want = f === null ? t0 : t0 * f;
          if (f === null ? !Object.is(fra.t, t0) : !(Math.abs(fra.t - want) <= 1e-9 * want)) p.push(`${placement} layer 3 slot ${qa.slot.index}: the foot row is ${fra.t} mm thick, restated ${want} (the ${qa.askedLength} mm owned length's root${f === null ? ' — the identity' : ` x ${f.toFixed(6)}`})`);
        }
      }
      if (sameNumbers(fa.map((q) => q.askedLength), fb.map((q) => q.askedLength))) p.push(`${placement} layer 3: the owned length did not reach the blade — the length/tilt half would be vacuous`);
      const taperSeen = fa.some((q) => H.rootFactorRestated(q.askedLength) !== null);
      if (taperSeen !== (lenOff > 0)) p.push(`${placement} layer 3: an owned length of ${35 + lenOff} mm ${taperSeen ? 'tapers' : 'does not taper'} — the two arms (over and under the reference) are not both exercised`);
      }
      said.push(`${placement}: rings ${rings.map((r) => r.radius.toFixed(3)).join(' / ')} mm on R0 ${R0.toFixed(3)}, feet ${rings.map((r) => r.width.toFixed(3)).join(' / ')} mm`);
    }
    rec('SO13', p, `an owned width drives the foot and the ring, restated from the controls, on footRing()'s rings and the emitted feet (${said.join('; ')}); layer 1's ring is the rim unless an over-wide layer grows the hub to its own ring (told); an owned length / tilt moves no foot row and no ring (but the root taper's thickness, restated)`);
  }
  /* SO7 — THE MIGRATION LANDS ON THE OLD COMPOSITION. A written-down state
     carrying retired role ids is migrated by the registry's `migrateRoles`
     (the module under test) and built; every petal's `applied` is compared
     against the OLD LAW restated here — never read off the migration, whose
     output this checks — and the fan's pairing is restated from its own
     involution, never `scopeSlotKey`. */
  {
    const p = [];
    const ctl = (id) => kindOf.get(id);
    const clampTo = (base, x) => Math.min(ctl(base).max, Math.max(ctl(base).min, x));
    const BASES = ['petalLength', 'petalWidth', 'petalTilt', 'petalCup', 'petalSpineCurl'];
    const BASE_OF = { Curl: ['petalSpineCurl'], Cup: ['petalCup'], Tilt: ['petalTilt'], Size: ['petalLength', 'petalWidth'] };
    /* THE OLD LAW: ALL at one whorl, INNER on whorl >= 1 (never a continuous
       spiral), a FAN group k on canonical pair k - 1; a delta added, a size
       multiplied, in the retired table's order (each case below lists its
       roles in that order), then the ONE clamp into the base's own range. */
    const oldApplied = (st, roles, w, pair, base) => {
      let x = Number(st[base]);
      for (const [id, v] of Object.entries(roles)) {
        const kind = id.match(/(Size|Curl|Cup|Tilt)$/)[1];
        if (!BASE_OF[kind].includes(base)) continue;
        const g = id.match(/^petal(\d)/);
        const reach = /^all/.test(id) ? Math.round(st.layerCount) === 1
          : /^inner/.test(id) ? w >= 1 && st.placement !== 'CONTINUOUS'
          : g ? pair !== null && Number(g[1]) === pair + 1 : false;
        if (!reach) continue;
        x = kind === 'Size' ? x * Number(v) : x + Number(v);
      }
      return clampTo(base, x);
    };
    const pairOf = (st, n, i) => {
      if (st.placement !== 'FAN') return null;
      const partner = st.fanCenterPetal === 'OFF' ? n - 1 - i : (n - i) % n;
      return Math.min(i, partner);
    };
    const cases = [
      { label: 'ALL (RADIAL, one whorl)', set: {}, roles: { 'allCurl': 45, 'allCup': 0.2 } },
      { label: 'ALL (FAN, one whorl)', set: { placement: 'FAN' }, roles: { 'allCurl': 45, 'allCup': 0.2 } },
      { label: 'INNER (RADIAL, 3 layers)', set: { layerCount: 3 }, roles: { 'innerCurl': 90, 'innerCup': 0.3 } },
      { label: 'INNER (FAN, 2 layers)', set: { placement: 'FAN', layerCount: 2 }, roles: { 'innerCurl': 90, 'innerCup': 0.3 } },
      /* THE IRIS ON A SPIRAL — Eva's ruling of Oct 16: a spiral's turns are
         layer scopes, so INNER lands on turn entries exactly as on RADIAL */
      { label: 'INNER (SPIRAL, 2 turns — the iris)', set: { placement: 'SPIRAL', layerCount: 2, petalSpineCurl: -90, layerTilt: 30, petalTilt: 40 }, roles: { 'innerCurl': 180, 'innerCup': 0.4 } },
      { label: 'INNER (SPIRAL, 3 turns)', set: { placement: 'SPIRAL', layerCount: 3 }, roles: { 'innerCurl': 90, 'innerCup': 0.3 } },
      { label: 'PER-PETAL group 2 (FAN)', set: { placement: 'FAN' }, roles: { 'petal2Tilt': 45, 'petal2Cup': 0.5, 'petal2Curl': 60 } },
      { label: 'PER-PETAL group 1 through the gap (FAN, centre OFF)', set: { placement: 'FAN', fanCenterPetal: 'OFF' }, roles: { 'petal1Cup': 0.4, 'petal1Curl': -60 } },
      { label: 'a size multiplier, group 3 (FAN)', set: { placement: 'FAN' }, roles: { 'petal3Size': 1.3 } },
      { label: 'INNER and groups 1 and 2 together (FAN, 2 layers)', set: { placement: 'FAN', layerCount: 2 }, roles: { 'innerCup': 0.3, 'petal1Size': 1.2, 'petal1Cup': 0.4, 'petal2Tilt': -40 } },
      { label: 'a group past the clamp (FAN, tilt 25 - 40)', set: { placement: 'FAN' }, roles: { 'petal2Tilt': -40 } },
    ];
    const summary = [];
    for (const c of cases) {
      const st = S(c.set);
      const mig = R.migrateRoles({ ...st, ...c.roles });
      const stray = Object.keys(c.roles).filter((id) => id in mig.state);
      if (stray.length) { p.push(`${c.label}: ${stray.join(', ')} survived the migration`); continue; }
      const got = build(G, F, mig.state, mig.scopes ? withBounds(F, mig.scopes) : undefined, { lamina: false });
      const n = got.built.foot.slotCount;
      let checked = 0, reached = 0;
      for (const q of got.petals) {
        const w = Math.round(q.whorl), pr = pairOf(st, n, q.slot.index);
        let moved = false;
        for (const base of BASES) {
          const want = oldApplied(st, c.roles, w, pr, base);
          const have = q.applied ? q.applied[base] : Number(mig.state[base]);
          if (!Object.is(have, want)) p.push(`${c.label}: whorl ${w} slot ${q.slot.index} ${base} built ${have}, the old law gives ${want}`);
          if (want !== Number(st[base])) moved = true;
        }
        checked++; if (moved) reached++;
      }
      if (!reached) p.push(`${c.label}: no petal is reached by the roles — the case is vacuous`);
      if (!mig.notes.some((x) => x.kind === 'migrated')) p.push(`${c.label}: the migration told nothing as migrated`);
      summary.push(`${c.label}: ${reached} of ${checked} petals reached, every one on the old law`);
    }
    /* THE RADIAL LABELLUM AND HOOD ARE DROPPED BY RULING: no scope, no folded
       value, every petal at the global, and each id TOLD as dropped */
    {
      const st = S({ layerCount: 2, layerPhase: 0 });
      const roles = { 'labellumCup': 0.5, 'labellumSize': 1.4, 'hoodTilt': 20 };
      const mig = R.migrateRoles({ ...st, ...roles });
      if (mig.scopes) p.push(`RADIAL labellum + hood: the migration carried ${JSON.stringify(mig.scopes)} — dropped by ruling, it must carry nothing`);
      for (const id of Object.keys(roles)) {
        if (id in mig.state) p.push(`RADIAL labellum + hood: ${id} survived`);
        if (!mig.notes.some((x) => x.id === id && x.kind === 'dropped' && /DROPPED BY RULING/.test(x.text))) p.push(`RADIAL labellum + hood: ${id} is not told as dropped by ruling`);
      }
      for (const base of BASES) if (!Object.is(Number(mig.state[base]), Number(st[base]))) p.push(`RADIAL labellum + hood: the global ${base} moved ${st[base]} -> ${mig.state[base]}`);
      const got = build(G, F, mig.state, mig.scopes ? withBounds(F, mig.scopes) : undefined, { lamina: false });
      const plain = build(G, F, st, undefined, { lamina: false });
      if (!sameNumbers([...plain.acc.positions], [...got.acc.positions])) p.push('RADIAL labellum + hood: the migrated bloom is not the bloom with no role at all');
      summary.push('RADIAL labellum + hood: DROPPED BY RULING, told per id, the bloom is the one with no role');
    }
    /* THE DESIGN FILE says what migrated and what was dropped — on a file that
       predates the scope toggles (57f64f7..Scoping-b), so it carries neither */
    {
      const doc = JSON.parse(JSON.stringify(F.composeDoc(S({ layerCount: 2, layerPhase: 0 }))));
      delete doc.controls.scopeLayers; delete doc.controls.scopePetals;
      doc.controls['innerCurl'] = 90; doc.controls['labellumCup'] = 0.5;
      const r = F.readDoc(doc);
      if (!r.ok) p.push(`the pre-retirement file was refused: ${r.error}`);
      else {
        const t = r.notes.map((x) => `[${x.kind}] ${x.text}`);
        if (!r.notes.some((x) => x.kind === 'migrated' && /controls\.innerCurl/.test(x.text))) p.push(`the file did not tell innerCurl as migrated: ${t.join(' | ')}`);
        if (!r.notes.some((x) => x.kind === 'retired' && /controls\.labellumCup/.test(x.text) && /DROPPED BY RULING/.test(x.text))) p.push(`the file did not tell labellumCup as dropped by ruling: ${t.join(' | ')}`);
        if (r.notes.some((x) => x.kind === 'missing' && /scopeLayers/.test(x.text))) p.push('the file still reports scopeLayers missing after the migration set it');
        if (r.doc.controls.scopeLayers !== 'ON') p.push(`the file's migrated controls read scopeLayers ${r.doc.controls.scopeLayers}`);
        const e = r.doc.overrides.layers.find((x) => x.layer === 1);
        if (!e || e.offsets.petalSpineCurl !== 90 || 'petalCup' in e.offsets) p.push(`the file's migrated layer-2 entry is ${JSON.stringify(e)} — expected curl 90 and nothing of the dropped labellum`);
      }
      summary.push('the design file tells innerCurl migrated and labellumCup dropped by ruling, on a file older than the toggles');
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
      /* the braid's strand container (the braid session): one strand's own
         length and radius, carried and read back like any other entry */
      strands: [{ strand: 1, offsets: { stamenLength: 4, stamenCoilRadius: -0.5 } }],
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
    { const o = base(); o.overrides.layers = [{ layer: 0, offsets: { placement: 1, petalInfill: 2, petalCount: 1, 'allCup': 0.1, 'petalTipBreadth': 0.2, nonsense: 3, petalCup: 'x', petalCupGradient: 0.3 }, extra: 1 }];
      const r = expect('bad keys', o, [['invalid', /placement: a choice has no offset/], ['invalid', /petalCount: a whorl-level value/], ['retired', /allCup names a retired control/], ['retired', /petalTipBreadth names a retired control/], ['unknown', /offsets\.nonsense is not a control/], ['invalid', /petalCup is "x", not a number/], ['unknown', /layers\[0\]\.extra is not a field/]]);
      if (r.ok && JSON.stringify(r.doc.overrides.layers[0]) !== JSON.stringify({ layer: 0, offsets: { petalCupGradient: 0.3 } })) p.push(`bad keys: the kept entry is ${JSON.stringify(r.doc.overrides.layers[0])}`); }
    { const o = base(); o.overrides.tiers = [{ tier: 0, offsets: { sepalCup: 0.1 } }]; const r = expect('a tier entry', o, []); if (r.ok && (r.doc.overrides.tiers.length !== 1 || r.notes.length)) p.push(`a tier entry: ${r.notes.length ? texts(r) : 'the entry was dropped'}`); }
    /* the two whorl-level sepal values are refused in a tier entry by name (F1.1a) */
    { const o = base(); o.overrides.tiers = [{ tier: 1, offsets: { sepalCount: 2, sepalTiers: 1, sepalHeight: -0.1 } }]; const r = expect('tier whorl-level keys', o, [['invalid', /sepalCount: a whorl-level value/], ['invalid', /sepalTiers: a whorl-level value/]]);
      if (r.ok && JSON.stringify(r.doc.overrides.tiers[0]) !== JSON.stringify({ tier: 1, offsets: { sepalHeight: -0.1 } })) p.push(`tier whorl-level keys: the kept entry is ${JSON.stringify(r.doc.overrides.tiers[0])}`); }
    { const r = F.readDoc(base()); if (r.notes.length) p.push(`a plain compose(DEFAULTS) reports ${texts(r)}`); if (!F.scopesAreEmpty(r.doc.overrides) || F.scopesForBuild(r.doc.overrides) !== null) p.push('empty containers do not read as no scopes'); }
    { const sc = F.scopesForBuild(fixture); if (!sc || sc.layers.length !== 1 || sc.petals.length !== 2 || sc.tiers.length !== 1 || !sc.bounds.petalCup || !sc.bounds.sepalCup) p.push('scopesForBuild did not carry the three lists and the bounds (the tier ids included)'); }
    { const sc = F.scopesForBuild({ layers: [], petals: [], tiers: [{ tier: 0, offsets: { sepalCup: 0.1 } }] }); if (!sc || sc.tiers.length !== 1) p.push('a tiers-only record builds nothing — scopesForBuild returned null (F1.1a: a tier entry builds a tier)'); }
    rec('SO8', p, `${rows} live rows round-trip a two-layer / two-petal / one-tier / one-strand record with no note; every written-down refusal fires by name; a tiers-only record reaches the build`);
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
      { label: 'FAN, per-layer ON (RADIAL and SPIRAL only), a layer record', set: { placement: 'FAN', layerCount: 2, scopeLayers: 'ON' }, rec: layer },
      /* a SPIRAL's LAYER entries are live since Oct 16 (SO2); its petal
         entries are not — per-petal is FAN only — and with per-layer OFF its
         layer entries are kept and inert like RADIAL's */
      { label: 'SPIRAL, per-petal ON (FAN only), a petal record', set: { placement: 'SPIRAL', layerCount: 2, scopePetals: 'ON' }, rec: petal },
      { label: 'SPIRAL, per-layer OFF, a layer record', set: { placement: 'SPIRAL', layerCount: 2 }, rec: layer },
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
  /* SO11 — THE RETIRED IDS ARE INERT IN THE GEOMETRY, AND A TOGGLE ALONE
     MOVES NOTHING. A state carrying every retired role id, handed straight
     to the builder UNMIGRATED, must build the same floats as without them:
     the geometry reads none of them (the panel gate's retired-identifier scan
     is the static half; this is the half a bracketed read escapes). Shown
     non-vacuous by the SAME values migrated, which move the bloom. */
  {
    const p = [];
    const same = (a, b) => sameNumbers([...a.acc.positions], [...b.acc.positions]);
    const B = (set, exportMode = false) => build(G, F, S(set), undefined, { lamina: false, exportMode });
    /* the toggle alone */
    for (const set of [{}, { layerCount: 3 }, { placement: 'SPIRAL', layerCount: 3 }, { placement: 'FAN' }, { placement: 'FAN', layerCount: 2 }]) {
      const t = set.placement === 'FAN' ? { scopePetals: 'ON' } : { scopeLayers: 'ON' };
      if (!same(B(set), B({ ...set, ...t }))) p.push(`${JSON.stringify(set)}: switching ${Object.keys(t)[0]} ON with no record moved the bloom`);
    }
    const RETIRED_VALUES = Object.fromEntries(R.RETIRED_ROLE_IDS.map((id) => [id, /Size$/.test(id) ? 1.4 : /Tilt$/.test(id) ? 20 : /Cup$/.test(id) ? 0.4 : 60]));
    let builds = 0, live = 0;
    for (const set of [{ layerCount: 2, layerPhase: 0 }, { placement: 'FAN' }, { layerCount: 3 }, {}]) {
      for (const exportMode of [false, true]) {
        builds++;
        if (!same(B(set, exportMode), B({ ...set, ...RETIRED_VALUES }, exportMode))) p.push(`${JSON.stringify(set)} [${exportMode ? 'export' : 'live'}]: the UNMIGRATED retired ids moved the bloom — the builder reads a retired id`);
      }
      const mig = R.migrateRoles({ ...S(set), ...RETIRED_VALUES });
      if (!same(B(set), build(G, F, mig.state, mig.scopes ? withBounds(F, mig.scopes) : undefined, { lamina: false }))) live++;
    }
    if (live < 3) p.push(`the retired values, migrated, moved only ${live} of 4 states — the inertness above would be vacuous`);
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
    rec('SO11', p, `all ${R.RETIRED_ROLE_IDS.length} retired role ids, handed unmigrated to the builder, move nothing over ${builds} builds (the same values migrated move ${live} of 4 states); a toggle alone moves nothing on 4 states; per-layer ON makes the tube unavailable (its controls inert)`);
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
    let hubSaid = '';
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
      /* AN OWNED WIDTH MOVES THE HUB (Eva's ruling, Oct 16): layer 1's foot
         follows its own width, the area rule sums every foot into R0, and ring
         0 IS the rim — so a layer-1 petalWidth offset moves every layer-0 petal
         by exactly the rim's radial shift and by nothing else. That is checked
         rather than excused: the hub must have moved, the petal must carry no
         term, every BLADE point must be the base point carried out along the
         petal's own azimuth by that shift (to 1e-9 mm; measured 5e-15), every
         normal the same double, and the foot rows' half-width unchanged. */
      const ring0 = (x) => x.built.foot.rings.find((r) => Math.round(r.lambda) === 0);
      const dR = ring0(b).radius - ring0(a).radius;
      const hubShifted = (o, q) => {
        if (q.scopeTerm || id !== 'petalWidth' || dR === 0) return false;
        const ca = Math.cos(q.slot.azimuth), sa = Math.sin(q.slot.azimuth);
        const pa = o.lamina, pb = q.lamina;
        if (!pa || !pb || pa.length !== pb.length) return false;
        for (let k = 0; k < pa.length; k++) {
          const ra = pa[k].rows, rb = pb[k].rows;
          if (ra.length !== rb.length) return false;
          for (let r = 0; r < ra.length; r++) {
            /* the FOOT rows (u 0) sit at the rim less the overhang, and the
               overhang is 0.4 of the rim, so they move by that too — they are
               footRing()'s descriptor and J1's subject; checked below on their
               half-width, which ring 0's own width sets */
            if (ra[r].u === 0) continue;
            for (let j = 0; j < ra[r].mid.length; j++) {
              const A = ra[r].mid[j], B = rb[r].mid[j];
              if (Math.abs(B[0] - A[0] - dR * ca) > 1e-9 || Math.abs(B[1] - A[1] - dR * sa) > 1e-9 || Math.abs(B[2] - A[2]) > 1e-9) return false;
              if (!sameNumbers(ra[r].normal[j], rb[r].normal[j])) return false;
            }
          }
        }
        return o.footFrames.length === q.footFrames.length && o.footFrames.every((f, k) => Object.is(f.h, q.footFrames[k].h));
      };
      let moved = 0, termed = 0, shifted = 0;
      b.petals.forEach((q, i) => {
        const s = sameNumbers(print(a.petals[i]), print(q));
        if (Math.round(a.petals[i].whorl) === 1) { termed++; if (!s) moved++; }
        else if (!s && hubShifted(a.petals[i], q)) shifted++;
        else if (!s || q.scopeTerm) leaked.push(`${id} (whorl ${Math.round(a.petals[i].whorl)}, slot ${q.slot.index})`);
      });
      if (id === 'petalWidth') { if (!shifted) p.push('petalWidth: the layer-1 width moved no layer-0 petal through the hub — the area rule over its own foot did not reach R0 (Oct 16)'); else hubSaid = `petalWidth carries the ${shifted} layer-0 petals out by the hub's ${dR.toFixed(4)} mm (its own foot, the area rule)`; }
      if (!termed) p.push(`${id}: no petal is on whorl 1`);
      else if (!moved) dead.push(id);
      else if (moved !== termed) p.push(`${id}: ${moved} of ${termed} layer-1 petals moved — a layer offset reaches every petal of its layer alike`);
    }
    if (dead.length) p.push(`a layer-1 offset moved NO layer-1 petal for ${dead.length} scopeable id(s): ${dead.join(', ')}`);
    if (leaked.length) p.push(`a layer-1 offset moved a layer-0 petal: ${leaked.slice(0, 6).join(', ')}${leaked.length > 6 ? ` (+${leaked.length - 6})` : ''}`);
    rec('SO12', p, `all ${F.SCOPEABLE_IDS.length} scopeable controls move every whorl-1 petal through a layer-1 offset with their guard live, and none moves (or gives a term to) a petal on another whorl — read off each petal's own whorl — but ${hubSaid}`);
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
    const rec0 = { layers: [{ layer: 0, offsets: { petalCup: 0.3 } }], petals: [{ layer: 0, slot: 1, offsets: { petalTipShape: 0.5 } }], tiers: [], strands: [] };
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
    const plain = JSON.parse(await page.evaluate(() => window.__bloomDesign.save())); plain.overrides = { layers: [], petals: [], tiers: [], strands: [] };
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
/* a layer-2 petal under a tilt + length entry on a ramped three-layer bloom,
   built on the MUTATED module: what the ownership mutants must move */
const Q35_PROBE = (G) => {
  const acc = new G.MeshBuilder({ exportMode: false });
  const st = { ...REG.DEFAULTS, layerCount: 3, layerTilt: 12, layerSize: 0.7, scopeLayers: 'ON' };
  const bounds = {}; for (const id of ['petalTilt', 'petalLength']) { const c = kindOf.get(id); bounds[id] = { min: c.min, max: c.max }; }
  const b = G.buildBloomInto(acc, st, { below: null, capability: null, scopes: { layers: [{ layer: 1, offsets: { petalTilt: 10, petalLength: 0 } }], petals: [], tiers: [], bounds } });
  const q = b.petalsAll.find((x) => x && Math.round(x.whorl) === 1);
  return { tiltDeg: Math.round(q.rootRow.tiltRad * 180 / Math.PI * 1e6) / 1e6, asked: q.askedLength };
};
/* layer 2 of three owns a width of 12 (of the global 16): its ring's foot
   width, radius factor and ramp scale off the MUTATED module's own footRing;
   `null` hands no record (the ramp's answer) */
const OWN_WIDTH_PROBE = (G, offset = -4) => {
  const st = { ...REG.DEFAULTS, layerCount: 3, layerSize: 0.7, scopeLayers: 'ON' };
  const c = kindOf.get('petalWidth');
  const scopes = offset === null ? null : { layers: [{ layer: 1, offsets: { petalWidth: offset } }], petals: [], tiers: [], bounds: { petalWidth: { min: c.min, max: c.max } } };
  const fr = G.footRing(st, new G.MeshBuilder({ exportMode: false }), { scopes });
  const r = fr.rings[1];
  return { width: r.width, factor: r.radius / fr.rings[0].radius, scale: r.scale };
};
const TUBE_STATE = () => { const r = byLabel.get('TUBE: 8 petals x k 2 (2 panels)'); if (!r) throw new Error('the TUBE row is not in the live matrix — re-point the tube mutant'); return stateOf(r); };
const MUTANTS = [
  /* SO5 stays GREEN here and that is correct: ignoring every offset leaves the
     thickness exactly what it was, which is what SO5 asserts. */
  /* and SO11's anti-vacuity half — the retired values MIGRATED must move the
     bloom, which they cannot when no offset lands */
  /* SO13 too: with no offset reaching the resolver no layer owns its width, so
     no foot follows and no hub grows — `layerOwnedValues` reads the global. */
  { id: 'offsets-are-ignored', breaks: ['SO2', 'SO3', 'SO4', 'SO6', 'SO7', 'SO11', 'SO12', 'SO13'],
    from: '  if (scopeTerm !== null) {\n    for (const base of Object.keys(scopeTerm.offsets)) {',
    to: '  if (scopeTerm !== null && false) {\n    for (const base of Object.keys(scopeTerm.offsets)) {',
    /* a direct call: the resolver handed a layer term must move the base */
    witness: (G) => G.resolvePetalTerms({ ...REG.DEFAULTS }, null, null, null, { offsets: { petalCup: 0.4 }, bounds: {} }) === null },
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
    from: '  for (const e of scopes.layers || []) { checkScopeOffsets(e.offsets || {}, `layers[${e.layer}]`); checkScopeValues(e.values, `layers[${e.layer}]`); }\n  for (const e of scopes.petals || []) { checkScopeOffsets(e.offsets || {}, `petals[${e.layer},${e.slot}]`); checkScopeValues(e.values, `petals[${e.layer},${e.slot}]`); }',
    to: '  for (const e of scopes.layers || []) if (!layersLive) { checkScopeOffsets(e.offsets || {}, `layers[${e.layer}]`); checkScopeValues(e.values, `layers[${e.layer}]`); }\n  for (const e of scopes.petals || []) if (!petalsLive) { checkScopeOffsets(e.offsets || {}, `petals[${e.layer},${e.slot}]`); checkScopeValues(e.values, `petals[${e.layer},${e.slot}]`); }',
    witness: (G) => { try { G.scopeOffsetsFor({ layers: [{ layer: 3, offsets: { sheetThickness: 0.5 } }] }, { layer: 0, slot: 0, n: 8, state: { ...REG.DEFAULTS, scopeLayers: 'ON' } }); return true; } catch (e) { return false; } } },
  { id: 'a-mirror-pair-is-split', breaks: ['SO3', 'SO4', 'SO7'],
    from: '  if (!SCOPE_PAIRED_PLACEMENTS.includes(state.placement)) return slot;\n  return Math.min(slot, mirrorPartner(slot, n, mirrorFor(state)));',
    to: '  return slot;',
    witness: (G) => G.scopeSlotKey(6, 7, FAN_PETALS_ON()) === 6 },
  /* SO7 too: its group-past-the-clamp case (tilt 25 - 40) must land on the
     range end, exactly as the retired table clamped it */
  { id: 'offsets-are-applied-after-the-clamp', breaks: ['SO4', 'SO7'],
    from: '    out[base] = clamp(composed, b.min, b.max);\n    /* WHICH BASES THE CLAMP ACTUALLY BIT',
    to: '    { const so = scopeTerm !== null && base in scopeTerm.offsets ? scopeTerm.offsets[base] : 0; out[base] = clamp(composed - so, b.min, b.max) + so; }\n    /* WHICH BASES THE CLAMP ACTUALLY BIT',
    witness: (G) => G.resolvePetalTerms({ ...REG.DEFAULTS }, null, null, null, { offsets: { petalCup: 5 }, bounds: {} }).petalCup > 1.2 },
  { id: 'thickness-is-scoped', breaks: ['SO0', 'SO5'],
    from: "export const SCOPE_UNSCOPED = Object.freeze(['sheetThickness']);",
    to: 'export const SCOPE_UNSCOPED = Object.freeze([]);',
    witness: (G) => G.SCOPE_UNSCOPED.length === 0 },
  /* ---- Scoping-b: the toggles ---- */
  /* (SO7 came off this claim with the retirement: it carried the RADIAL
     petal entry that must stay inert, and the migration clause that replaced
     it builds no record with its toggle off — SO10 is the gate's witness) */
  { id: 'the-toggle-gate-is-removed', breaks: ['SO10'],
    from: '  const layersLive = scopeLayersLive(state);\n  const petalsLive = scopePetalsLive(state);',
    to: '  const layersLive = true;\n  const petalsLive = true;',
    witness: (G) => G.scopeOffsetsFor({ layers: [{ layer: 0, offsets: { petalCup: 0.4 } }] }, { layer: 0, slot: 0, n: 8, state: { ...REG.DEFAULTS } }) !== null },
  /* (the-role-table-stays-live-under-a-toggle, all-petals-forget-the-toggles,
     the-groups-forget-per-petal and the-slot-roles-forget-per-layer went with
     the role table, Q3.4: what they mutated no longer exists.) */
  /* ---- the role retirement (Q3.4 / Q3.5) ---- */
  { id: 'a-retired-id-is-still-read-by-the-builder', breaks: ['SO11'],
    from: '  let ps = (slot.formTerm || scopeTerm) ? petalStateForSlot(state, slot.formTerm || null, formClamped, formScaled, scopeTerm) : state;',
    to: "  const ps0 = (slot.formTerm || scopeTerm) ? petalStateForSlot(state, slot.formTerm || null, formClamped, formScaled, scopeTerm) : state;\n  let ps = state['labellumCup'] ? { ...ps0, petalCup: Number(ps0.petalCup) + Number(state['labellumCup']) } : ps0;",
    witness: (G) => { const b = (st) => { const acc = new G.MeshBuilder({ exportMode: false }); G.buildBloomInto(acc, st, { below: null, capability: null, scopes: null }); return [...acc.positions]; };
      const a = b({ ...REG.DEFAULTS }), c = b({ ...REG.DEFAULTS, ['labellumCup']: 0.5 }); return !sameNumbers(a, c); } },
  { id: 'an-owned-tilt-keeps-the-ramp', breaks: ['SO6'],
    from: '  const tiltExtra = owns && owns.petalTilt ? 0 : slot.tiltExtra;',
    to: '  const tiltExtra = slot.tiltExtra;',
    witness: (G) => Q35_PROBE(G).tiltDeg !== 35 },
  { id: 'an-owned-length-keeps-the-ramp', breaks: ['SO6'],
    from: '  const lengthScale = owns && owns.petalLength ? (slot.sizeFactor ?? 1) : slot.scale;',
    to: '  const lengthScale = slot.scale;',
    witness: (G) => Q35_PROBE(G).asked !== 35 },
  /* registry copies: the migration itself */
  { id: 'a-fan-group-lands-on-the-wrong-pair', file: 'registry', breaks: ['SO7'],
    from: '      for (let c = 0; c < groups; c++) { const o = entryFor(k, c + 1); if (o) petals.push({ layer: k, slot: c, offsets: o }); }',
    to: '      for (let c = 0; c < groups; c++) { const o = entryFor(k, c + 1); if (o) petals.push({ layer: k, slot: (c + 1) % groups, offsets: o }); }',
    witness: (G, R) => { const m = R.migrateRoles({ ...REG.DEFAULTS, placement: 'FAN', ['petal2Cup']: 0.5 }); return !m.scopes || m.scopes.petals.length !== 1 || m.scopes.petals[0].slot !== 1; } },
  { id: 'a-radial-labellum-is-silently-kept', file: 'registry', breaks: ['SO7'],
    from: "      if (slotEligible) notes.push({ id, kind: 'dropped', text:",
    to: "      if (slotEligible) carried.add(id); else if (false) notes.push({ id, kind: 'dropped', text:",
    witness: (G, R) => R.migrateRoles({ ...REG.DEFAULTS, layerCount: 2, layerPhase: 0, ['labellumCup']: 0.5 }).scopes !== null },
  { id: 'a-migration-drops-a-value-it-should-carry', file: 'registry', breaks: ['SO7'],
    from: '      if (!beyondAll) continue;',
    to: "      if (!beyondAll || base === 'petalCup') continue;",
    witness: (G, R) => { const m = R.migrateRoles({ ...REG.DEFAULTS, layerCount: 3, ['innerCup']: 0.3 }); return !m.scopes || m.scopes.layers.some((e) => !('petalCup' in e.offsets)); } },
  /* ---- Eva's rulings of Oct 16: a spiral's turns are layer scopes; an owned
     width drives the foot and the ring ---- */
  { id: 'per-layer-values-stay-radial-only', breaks: ['SO2', 'SO7', 'SO13'],
    from: "export const SCOPE_LAYER_PLACEMENTS = Object.freeze(['RADIAL', 'SPIRAL']);",
    to: "export const SCOPE_LAYER_PLACEMENTS = Object.freeze(['RADIAL']);",
    witness: (G) => G.scopeLayersLive({ ...REG.DEFAULTS, placement: 'SPIRAL', scopeLayers: 'ON' }) === false },
  { id: 'the-foot-keeps-the-ramp', breaks: ['SO12', 'SO13'],
    from: '    const authoredWidth = ownWidth === null ? state.petalWidth * scale * 0.4 * state.footDelicacy : ownWidth * 0.4 * state.footDelicacy;',
    to: '    const authoredWidth = state.petalWidth * scale * 0.4 * state.footDelicacy;',
    witness: (G) => OWN_WIDTH_PROBE(G).width === OWN_WIDTH_PROBE(G, null).width },
  { id: 'the-ring-keeps-the-ramp', breaks: ['SO13'],
    from: '    const ringFactor = ownWidth === null ? scale : L === 0 ? 1 : ownWidth / state.petalWidth;',
    to: '    const ringFactor = scale;',
    witness: (G) => { const r = OWN_WIDTH_PROBE(G); return r.factor === r.scale; } },
  /* Eva's Oct 16 ruling on the rim hold: "grow the hub instead of holding the
     ring at the rim". The hold put back — the ring capped at R0, so nothing
     ever asks past the rim and the hub never grows. */
  { id: 'the-ring-is-held-at-the-rim-again', breaks: ['SO13'],
    from: '    const ringFactor = ownWidth === null ? scale : L === 0 ? 1 : ownWidth / state.petalWidth;',
    to: '    const ringFactor = ownWidth === null ? scale : L === 0 ? 1 : Math.min(1, ownWidth / state.petalWidth);',
    witness: (G) => { const r = OWN_WIDTH_PROBE(G, 3); return r.factor === 1; } },
  /* ... and the hub grown from something other than the widest owned ring —
     the rim moved to the FIRST owned ring past it instead of the widest. */
  { id: 'the-hub-grows-for-the-wrong-ring', breaks: ['SO13'],
    from: '  for (let k = 0; k < raw.length; k++) if (raw[k].ownWidth !== null && raw[k].ringFactor > growFactor) { growFactor = raw[k].ringFactor; growLayer = k; }',
    to: '  for (let k = 0; k < raw.length; k++) if (raw[k].ownWidth !== null && raw[k].ringFactor > 1) { growFactor = raw[k].ringFactor * 0.999; growLayer = k; }',
    witness: (G) => { const st = { ...REG.DEFAULTS, layerCount: 3, scopeLayers: 'ON' }; const c = kindOf.get('petalWidth'); const fr = G.footRing(st, new G.MeshBuilder({ exportMode: false }), { scopes: { layers: [{ layer: 2, offsets: { petalWidth: 3 } }], petals: [], tiers: [], bounds: { petalWidth: { min: c.min, max: c.max } } } }); return fr.hub.radius !== fr.rings[2].radius; } },
  { id: 'a-spiral-inner-is-dropped', file: 'registry', breaks: ['SO7'],
    from: '  if (radial || spiral) {\n    for (let k = 1; k < L; k++) { const o = entryFor(k, 0); if (o) layers.push({ layer: k, offsets: o }); }',
    to: '  if (radial) {\n    for (let k = 1; k < L; k++) { const o = entryFor(k, 0); if (o) layers.push({ layer: k, offsets: o }); }',
    witness: (G, R) => R.migrateRoles({ ...REG.DEFAULTS, placement: 'SPIRAL', layerCount: 2, ['innerCup']: 0.4 }).scopes === null },
  /* BIG PETALS (Oct 21, Eva's ruling 3): SO13's original condition planted on
     the new geometry — an owned LENGTH moving the foot in half-width and ring
     (here: the foot widened as if the owned length scaled it). The restated
     clause must still see it at an owned length both over the root taper's
     reference and under it. */
  { id: 'an-owned-length-moves-the-foot', breaks: ['SO13', 'SO12'],
    from: "    const ownWidth = own && 'petalWidth' in own ? own.petalWidth : null;",
    to: "    const ownWidth = own && 'petalWidth' in own ? own.petalWidth : own && 'petalLength' in own ? state.petalWidth * own.petalLength / state.petalLength : null;",
    witness: (G) => { const st = { ...REG.DEFAULTS, layerCount: 3, scopeLayers: 'ON' }; const ring = (rec) => G.footRing(st, new G.MeshBuilder({ exportMode: false }), { scopes: rec }).rings[2].width; return ring({ layers: [{ layer: 2, offsets: { petalLength: -10 } }], petals: [], tiers: [] }) !== ring({ layers: [], petals: [], tiers: [] }); } },
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
async function runAll(G, F, R, port) {
  const results = [];
  const r = (clause, problems, detail) => results.push({ clause, ok: !problems.length, detail: problems.length ? problems.slice(0, 6).join('; ') : detail });
  await nodeClauses(G, F, R, r);
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
    const results = await runAll(G, F, REG, port);
    print(results);
    const failed = results.filter((r) => !r.ok);
    console.log(failed.length ? `\nSCOPES GATE: FAIL — ${failed.length} clause(s)` : `\nSCOPES GATE: PASS — ${results.length} clauses${BROWSER ? '' : ' (Node only; --browser adds SO9)'}${FULL ? ', the full matrix in SO1' : ''}`);
    exit = failed.length ? 1 : 0;
  } else {
    const geoSrc = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
    const fileSrc = fs.readFileSync(path.join(ROOT, 'bloom-file.js'), 'utf8');
    const regSrc = fs.readFileSync(path.join(ROOT, 'bloom-registry.js'), 'utf8');
    const srcOf = (m) => (m.file === 'registry' ? regSrc : geoSrc);
    for (const m of MUTANTS) mutate(srcOf(m), m);   // every anchor, before any mutant runs
    console.log(`anchors: all ${MUTANTS.length} mutants match exactly once`);
    const cleanG = await load('bloom-geometry.js');
    for (const m of MUTANTS) if (m.witness(cleanG, REG)) throw new Error(`mutant ${m.id}: its witness already fires on the CLEAN tree — it witnesses nothing`);
    const run = ONLY.length ? MUTANTS.filter((m) => ONLY.includes(m.id)) : MUTANTS;
    let failed = false;
    for (const m of run) {
      const tag = m.id.replace(/[^a-z0-9]/gi, '_');
      /* a GEOMETRY mutant is a bloom-geometry.js copy with a bloom-file.js
         copy importing it; a REGISTRY mutant is a bloom-registry.js copy
         (which imports the clean geometry) with a bloom-file.js copy
         importing IT, so the file's reader migrates through the mutant too */
      const reg = m.file === 'registry';
      const mName = reg ? `bloom-registry.__mutant_${tag}.js` : `bloom-geometry.__mutant_${tag}.js`, fName = `bloom-file.__mutant_${tag}.js`;
      fs.writeFileSync(path.join(ROOT, mName), mutate(srcOf(m), m));
      fs.writeFileSync(path.join(ROOT, fName), reg ? fileSrc.replace("from './bloom-registry.js'", `from './${mName}'`) : fileSrc.replace("from './bloom-geometry.js'", `from './${mName}'`));
      let results, witnessed;
      try {
        const G = reg ? cleanG : await load(mName), R = reg ? await load(mName) : REG, F = await load(fName);
        witnessed = m.witness(G, R);
        results = await runAll(G, F, R, null);
      } finally { fs.unlinkSync(path.join(ROOT, mName)); fs.unlinkSync(path.join(ROOT, fName)); }
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
