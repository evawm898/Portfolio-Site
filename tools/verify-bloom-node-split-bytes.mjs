#!/usr/bin/env node
/* ===================================================================
   verify-bloom-node-split-bytes.mjs — THE INVARIANT OF LEAF/STEM BUILD S1:
   every stored control set renders byte-identical across the node split and
   the alternate divergence (Eva's rulings, Oct 6).

     node tools/verify-bloom-node-split-bytes.mjs --base <worktree> [--shard k/n] [--out <file>]
          [--only-retired] [--control] [--wrong-migration] [--resume] [--limit n]
     node tools/verify-bloom-node-split-bytes.mjs --merge <file> <file> ...

   WHAT "EVERY STORED CONTROL SET" IS, ON THIS GENERATOR. The bloom persists no
   design (no save, no share link, no hash — RETIRED_IDS' own header says so,
   `schema: null`) and ships no registry presets (`bloom-view-presets.js` is
   camera chrome). The control sets that ARE stored are the matrices: the BASE
   tree's live `buildMatrix()` and every frozen matrix it registers — 52 phases
   and 34,635 rows at f4b5baa, 1,404 distinct (set, capability) pairs once the
   live matrix is folded in. That is the population, taken from the BASE
   tree's own harness, so the head cannot choose which designs it is held to.

   THE CLAIM, BOTH SIDES BUILT FROM THEIR OWN REGISTRY. A stored set is built
   on the BASE tree exactly as stored (base DEFAULTS + the set) and on the
   HEAD tree through the head registry's one migration owner (head DEFAULTS +
   `migrateSet(set)`), in EXPORT and LIVE, and the two must agree positionally
   under `Object.is` on every export float AND every captured-grid mid/normal
   value. Not "the movers are predeclared": there are NO movers. Both rulings
   default to the old behaviour — the divergence to 180, whose turn is
   `Math.PI` to the bit, and the retired prominence p to swelling p plus kink
   p, which form the law's two doubles term for term — so every row holds.

   A SET THE BASE TREE CANNOT BUILD IS EXCLUDED AND COUNTED, never compared:
   a frozen row naming `centerStyle` (retired session 20) refuses on the base
   as it would on the head, carries no information about this change, and is
   listed by the retired id that excludes it. A set the base CAN build and the
   head cannot (an unknown control after migration, a migrate conflict, a
   throw) is a FAIL — that is a stored design this change broke.

   THE TWO MUST-FAILS, and the run refuses to call itself a pass without the
   population that makes each one meaningful:
     --wrong-migration   the head migrates prominence p into swelling p and
                         KINK 0 (the plausible slip: "the kink is new, it
                         defaults to 0"). The run must FAIL, and the movers
                         must be EXACTLY the sets on which the BASE tree's own
                         builder declared a node law (`stem.nodeLaw` non-null)
                         — predeclared from the base record, checked both
                         ways. `--only-retired` restricts the population to
                         the sets that name a migrating retired id (the only
                         sets a migration can touch) plus the named holder.
     --control           perturbs one float of the named holder's head stream
                         by 1e-9 and requires the comparison to report it;
                         without it "0 moved" is a log line.

   WHAT IT DOES NOT COVER: triangle ORDER beyond positional equality (so a
   reordering is a move, deliberately); the infill mask channel (its own
   tool's); the page (Node-side builds, the same `buildBloomInto` the page
   calls); and any control set that exists nowhere in the base tree's
   matrices — there is no other store to read.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i < 0 ? null : argv[i + 1]; };

if (argv[0] === '--merge') {
  const parts = argv.slice(1).map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  const all = parts.flatMap((p) => p.rows);
  const fails = parts.flatMap((p) => p.fails);
  parts.forEach((p, i) => { if (!p.complete) fails.push(`part ${argv[1 + i]} (shard ${p.shard}) is not complete — resume it before merging`); });
  const excluded = parts.flatMap((p) => p.excluded);
  const mode = parts[0].mode;
  if (parts.some((p) => p.mode !== mode)) fails.push(`the parts were run in different modes (${[...new Set(parts.map((p) => p.mode))].join(', ')})`);
  const want = parts[0].population;
  const seen = new Set(all.map((r) => r.key));
  if (parts.some((p) => p.population !== want)) fails.push('the parts disagree on the population size — not one run');
  const covered = seen.size + new Set(excluded.map((e) => e.key)).size + new Set(parts.flatMap((p) => p.failedKeys || [])).size;
  if (covered !== want) fails.push(`coverage: ${covered} of ${want} distinct stored sets reached a part — a shard is missing`);
  const sum = (k) => all.reduce((s, r) => s + r[k], 0);
  /* The named holder carries the --control perturbation and moves BY DESIGN;
     it is reported on the control line, never counted as a mover here. */
  const HOLDER = 'DEFAULT (the shipping configuration)';
  const perturbed = parts.some((p) => p.control) ? HOLDER : null;
  const movers = all.filter((r) => r.mover), moved = all.filter((r) => r.moved && r.label !== perturbed);
  console.log(`MODE ${mode} · ${want} distinct stored control sets · ${all.length} compared · ${new Set(excluded.map((e) => e.key)).size} not buildable on the base tree (excluded, counted)`);
  console.log(`  rows those sets stand for: ${sum('rowCount').toLocaleString('en-US')} matrix rows (live + frozen) · compared ${sum('floats').toLocaleString('en-US')} export floats and ${sum('gridValues').toLocaleString('en-US')} captured-grid values, both modes, Object.is`);
  console.log(`  predeclared movers: ${movers.length} · moved: ${moved.length} · movers that moved: ${movers.filter((r) => r.moved).length} · holders that moved: ${moved.filter((r) => !r.mover).length}`);
  const byWhy = {};
  for (const e of excluded) byWhy[e.why] = (byWhy[e.why] || 0) + 1;
  for (const [w, n] of Object.entries(byWhy).sort((a, b) => b[1] - a[1])) console.log(`  excluded ${String(n).padStart(4)}: ${w}`);
  if (parts.some((p) => p.control)) console.log(`  control: ${parts.filter((p) => p.control).map((p) => p.control).join('; ')}`);
  for (const f of fails) console.log(`  FAIL ${f}`);
  if (mode === 'wrong-migration') {
    const ok = fails.length > 0 && fails.every((f) => / a predeclared MOVER moved under the wrong migration — as it must| moved$/.test(f) || /^EXPECTED:/.test(f));
    console.log(fails.length ? `${fails.length} finding(s) — the must-fail ${ok ? 'FAILED AS REQUIRED' : 'failed, but not only on the predeclared movers (see above)'}` : 'the wrong migration was NOT caught — the gate is blind');
    process.exit(fails.length && ok ? 0 : 1);
  }
  console.log(fails.length ? `FAIL — ${fails.length} finding(s)` : `PASS — every one of the ${all.length} distinct stored control sets the base tree can build renders byte-identical on the head through the migration, in both modes.`);
  process.exit(fails.length ? 1 : 0);
}

const BASE = arg('--base');
if (!BASE) { console.error('usage: --base <worktree of the base commit> [--shard k/n] [--out file] [--only-retired] [--control] [--wrong-migration]'); process.exit(2); }
const [K, N] = (arg('--shard') || '0/1').split('/').map(Number);
const CONTROL = argv.includes('--control');
const WRONG = argv.includes('--wrong-migration');
const ONLY_RETIRED = argv.includes('--only-retired');
const LIMIT = arg('--limit') ? Number(arg('--limit')) : Infinity;
const OUT = arg('--out');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = (dir, f) => import(pathToFileURL(path.join(dir, f)).href);
const [G, R, BG, BR, BH] = await Promise.all([
  load(ROOT, 'bloom-geometry.js'), load(ROOT, 'bloom-registry.js'),
  load(path.resolve(BASE), 'bloom-geometry.js'), load(path.resolve(BASE), 'bloom-registry.js'), load(path.resolve(BASE), 'tools/bloom-harness.mjs'),
]);
if (typeof R.migrateSet !== 'function') { console.error('REFUSED: the head registry exports no migrateSet — there is no migration owner to test'); process.exit(2); }

/* THE MIGRATION UNDER TEST — the head's own, or the deliberate slip. The slip
   copies the value into the swelling and writes 0 into the kink, so it differs
   from the shipped owner (`migrateTo: [swelling, kink]`) in exactly one value. */
const migrating = R.RETIRED_IDS.filter((r) => Array.isArray(r.migrateTo)).map((r) => r.id);
const wrongMigrateSet = (set) => set.flatMap((w) => (w.id === 'stemNodeProminence'
  ? [{ id: 'stemNodeSwelling', value: w.value }, { id: 'stemNodeKink', value: '0' }] : [w]));
const migrate = WRONG ? wrongMigrateSet : R.migrateSet;

function stateOf(Rm, D, set, label) {
  const kindOf = new Map(Rm.CONTROLS.map((c) => [c.id, c]));
  const s = { ...D };
  for (const w of set || []) {
    const c = kindOf.get(w.id); if (!c) { const e = new Error(`no control ${w.id}`); e.unknownId = w.id; throw e; }
    s[w.id] = c.kind === 'slider' ? Number(w.value) : c.kind === 'check' ? (w.value === true || w.value === 'true') : w.value;
  }
  return s;
}
function build(Gm, state, capability, exportMode) {
  const acc = new Gm.MeshBuilder({ exportMode, captureGrid: true });
  const built = Gm.buildBloomInto(acc, state, { below: null, capability: capability || null });
  const grid = [];
  for (const p of built.petalsAll || []) {
    grid.push(p ? 1 : 0);
    if (!p || !p.grid) continue;
    /* The walk `verify-bloom-surface-bytes.mjs` owns: the panel shape and
       every station's (v, mid, normal). An unbuilt slot is a VALUE. */
    for (const pan of p.grid) {
      grid.push(pan.rowFrom, pan.rowTo, pan.rows.length);
      for (const r of pan.rows) {
        grid.push(r.row, r.u, r.halfWidth, r.thickness, r.v.length);
        for (let j = 0; j < r.v.length; j++) grid.push(r.v[j], r.mid[j][0], r.mid[j][1], r.mid[j][2], r.normal[j][0], r.normal[j][1], r.normal[j][2]);
      }
    }
  }
  return { pos: Float64Array.from(acc.positions), grid, built };
}
const firstDiff = (a, b) => { if (a.length !== b.length) return `length ${a.length} against ${b.length}`; for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return `index ${i}: ${a[i]} against ${b[i]}`; return null; };

/* THE POPULATION — the base tree's own stores, folded to distinct sets in a
   fixed order (live matrix first, then the phases in the base's own key
   order), so a shard is a stable slice and the merge can check coverage. */
const stores = [['live', BH.buildMatrix()], ...Object.keys(BH.FROZEN_MATRICES).map((k) => [k, BH.FROZEN_MATRICES[k]()])];
const distinct = new Map();
for (const [store, rows] of stores) for (const row of rows) {
  const key = JSON.stringify([row.set || [], row.capability || null]);
  let d = distinct.get(key);
  if (!d) { d = { key, set: row.set || [], capability: row.capability || null, label: row.label, store, rowCount: 0 }; distinct.set(key, d); }
  d.rowCount++;
}
const CONTROL_HOLDER = 'DEFAULT (the shipping configuration)';
let pop = [...distinct.values()];
if (ONLY_RETIRED) pop = pop.filter((d) => d.label === CONTROL_HOLDER || d.set.some((w) => migrating.includes(w.id)));
const population = pop.length;
const fails = [], rows = [], excluded = [];
let control = null, done = 0;
const t0 = Date.now();
/* RESUMABLE (`--resume`): the out file is rewritten after every set with
   `complete: false`, so a chunk interrupted by a time limit costs the set it
   was on and nothing else; `--merge` refuses a part that is not complete. A
   resumed run must be the same mode and population, or it refuses. */
const RESUME = argv.includes('--resume') && OUT && fs.existsSync(OUT);
const doneKeys = new Set();
let priorSeconds = 0;
if (RESUME) {
  const prev = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  if (prev.mode !== (WRONG ? 'wrong-migration' : 'shipped-migration') || prev.population !== pop.length || prev.shard !== `${K}/${N}`) { console.error(`REFUSED: --resume on ${OUT}, which is a different run (${prev.mode}, ${prev.population}, ${prev.shard})`); process.exit(2); }
  for (const r of prev.rows) { rows.push(r); doneKeys.add(r.key); }
  for (const e of prev.excluded) { excluded.push(e); doneKeys.add(e.key); }
  for (const f of prev.fails) fails.push(f);
  for (const k of prev.failedKeys || []) doneKeys.add(k);
  control = prev.control; priorSeconds = prev.seconds || 0;
}
const failedKeys = [];
const checkpoint = (complete) => { if (OUT) fs.writeFileSync(OUT, JSON.stringify({ mode: WRONG ? 'wrong-migration' : 'shipped-migration', population: pop.length, shard: `${K}/${N}`, rows, fails, excluded, control, failedKeys, complete, seconds: priorSeconds + (Date.now() - t0) / 1000 })); };
for (let i = 0; i < pop.length; i++) {
  if (i % N !== K) continue;
  if (done >= LIMIT) break;
  const d = pop[i];
  if (doneKeys.has(d.key)) continue;
  done++;
  let bs, hs;
  try { bs = stateOf(BR, BR.DEFAULTS, d.set, d.label); }
  catch (e) { excluded.push({ key: d.key, label: d.label, why: e.unknownId ? `names "${e.unknownId}", a control the base tree does not have (a frozen row from before its retirement)` : `the base tree cannot build its state: ${e.message}` }); continue; }
  try { hs = stateOf(R, R.DEFAULTS, migrate(d.set), d.label); }
  catch (e) { fails.push(`"${d.label}" (${d.store}): the base tree builds it and the head cannot even form its state — ${e.message}`); failedKeys.push(d.key); checkpoint(false); continue; }
  let mover = false, moved = false, floats = 0, gridValues = 0, where = null;
  try {
    for (const exportMode of [true, false]) {
      const b = build(BG, bs, d.capability, exportMode), h = build(G, hs, d.capability, exportMode);
      /* THE WRONG MIGRATION'S MOVERS, from the BASE tree's own builder record:
         the base declared a node law, so the stored prominence drew a kink. */
      if (exportMode) mover = WRONG && !!(b.built.stem && b.built.stem.nodeLaw);
      if (CONTROL && exportMode && d.label === CONTROL_HOLDER) { h.pos[0] += 1e-9; control = `perturbed "${d.label}" by 1e-9`; }
      floats += b.pos.length; gridValues += b.grid.length;
      const dp = firstDiff(b.pos, h.pos), dg = firstDiff(b.grid, h.grid);
      if (dp || dg) { moved = true; where = where || `${exportMode ? 'EXPORT' : 'LIVE'} ${dp ? `positions ${dp}` : `grid ${dg}`}`; }
    }
  } catch (e) {
    fails.push(`"${d.label}" (${d.store}): a build threw — ${e.message}`);
    failedKeys.push(d.key); checkpoint(false);
    continue;
  }
  rows.push({ key: d.key, label: d.label, store: d.store, rowCount: d.rowCount, mover, moved, floats, gridValues });
  if (WRONG) {
    if (mover && moved) fails.push(`"${d.label}": a predeclared MOVER moved under the wrong migration — as it must (${where})`);
    if (mover && !moved) fails.push(`"${d.label}": a predeclared MOVER held under the wrong migration — the gate cannot see a dropped kink here`);
    if (!mover && moved && d.label !== CONTROL_HOLDER) fails.push(`"${d.label}": a set with no base node law moved under the wrong migration (${where}) — unexplained`);
  } else if (moved && !(CONTROL && d.label === CONTROL_HOLDER)) fails.push(`"${d.label}" (${d.store}, stands for ${d.rowCount} row(s)): MOVED — ${where}`);
  if (CONTROL && d.label === CONTROL_HOLDER) {
    if (moved) control += ' — the comparison reported it';
    else fails.push(`control: ${control || 'the named holder was never perturbed'} and the comparison did NOT report it`);
  }
  checkpoint(false);
  if (done % 25 === 0) console.error(`  ${done} sets · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
if (CONTROL && !control) {
  const at = pop.findIndex((d) => d.label === CONTROL_HOLDER);
  if (at % N === K) fails.push(`control: the named holder "${CONTROL_HOLDER}" was never perturbed`);
}
const mode = WRONG ? 'wrong-migration' : 'shipped-migration';
checkpoint(LIMIT === Infinity);
console.log(`shard ${K}/${N} (${mode}${ONLY_RETIRED ? ', only sets naming a migrating retired id' : ''}): ${rows.length} compared, ${excluded.length} excluded, ${fails.length} finding(s), ${(priorSeconds + (Date.now() - t0) / 1000).toFixed(0)} s — ${LIMIT === Infinity ? 'COMPLETE' : 'partial (--limit)'}`);
for (const f of fails.slice(0, 20)) console.log(`  ${f}`);
process.exit(0);
