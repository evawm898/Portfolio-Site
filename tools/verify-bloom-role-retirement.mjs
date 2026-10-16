#!/usr/bin/env node
/* THE ROLE RETIREMENT'S BYTE PARTITION (Q3.4 — docs/bloom-role-retirement-outcome.md).

   WHAT IT MEASURES. Every DISTINCT stored control set — the BASE tree's live
   matrix plus every frozen phase it registers, deduplicated on (set,
   capability) — built twice in Node: on the BASE tree as stored, and on THIS
   tree after the registry's own `migrateSet` (the retired role ids carried
   into a folded global, a scope toggle and `@scopes` entries, or dropped).
   Both export streams are compared POSITIONALLY under `Object.is`, in LIVE and
   EXPORT, and the live captured grid of every emitted petal (`petalsAll`, in
   slot order) beside them.

   THE MOVER SET IS PREDECLARED FROM THE BASE TREE'S OWN RECORDS — its own
   `footRing()` descriptors, never this tree's migration — so the prediction's
   owner is not the quantity under test:
     (a)  a-radial-orchid  a RADIAL whorl SPLIT by slot role (some descriptor
                           carries `slotRole`): a labellum or hood resolved,
                           and the ruling (Oct 14) drops it.
     (b)  b-foot-follows   per-layer values LIVE on the base state (RADIAL, or
                           the toggle stored ON under a SPIRAL) with a stored
                           layer entry carrying `petalWidth` (Eva's ruling of
                           Oct 16: a layer's own width drives its foot and ring
                           as well as its blade). Read off the base row's own
                           `scopes` record.
     (b2) b-hub-grows      the subset of (b) whose stored layer entry (past
                           layer 1) owns a WIDER width than Petal width — Eva's
                           second Oct 16 ruling: the hub grows to that ring
                           instead of holding it at the rim. Its own class so
                           the prediction is said separately.
     (c1) c-area-rule      a FAN whorl split by per-petal role at 2+ layers
                           whose split area-rule sum is not the one-group sum
                           (restated here from the base descriptors' own widths
                           and thickness): R0 moves by the regrouping's ULPs.
     (c2) c-all-on-grid    an ALL role whose composed value is not the double a
                           slider holds after the fold (restated grid law) — the
                           one place the ALL fold cannot be exact.
     (c3) c-spiral-layers  the toggle stored ON under a SPIRAL with stored layer
                           entries: INERT on the base (per-layer values were
                           RADIAL only) and LIVE here (Oct 16).
   AND ONE CLASS THAT MUST HOLD, named so it cannot be vacuous:
     (h)  h-spiral-inner   a SPIRAL descriptor whose INNER role resolved a
                           record. Eva's ruling of Oct 16 makes a spiral's turns
                           layer scopes, so the INNER delta migrates onto turn
                           entries and the bloom must build to the bit — the
                           iris among them. Counted, and the merge fails if
                           none is in the population.
   Every other set is a HOLDER and must hold to the bit in both modes. A mover
   that holds is a finding (the class names a change that did not happen), and
   so is an unpredicted mover.

   NOT COVERED, said here: the browser path (the page's own `applyConfig` +
   `__bloomScopes`) — the STL gates and the design-file gate carry that; sets
   naming an id NEITHER tree can build (earlier retirements with no migration,
   `centerStyle` and the like) are EXCLUDED and counted by name.

   usage: node tools/verify-bloom-role-retirement.mjs --base <worktree of the base commit>
            [--shard k/n] [--json out.json]    one shard of the population
            [--checkpoint c.jsonl]           one line per set built, so a killed run
                                              resumes where it stopped
          node tools/verify-bloom-role-retirement.mjs --merge a.json b.json ...
            [--expect a=N,b2=N,b=N,c1=N,c2=N,c3=N,h=N]
          --control  perturbs one holder float and requires the run to FAIL on it */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const argv = process.argv.slice(2);
const argOf = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CLASSES = ['a-radial-orchid', 'b-hub-grows', 'b-foot-follows', 'c-area-rule', 'c-all-on-grid', 'c-spiral-layers'];
const HOLD_CLASSES = ['h-spiral-inner'];

if (argv.includes('--merge')) {
  const files = argv.slice(argv.indexOf('--merge') + 1).filter((f, i, a) => !f.startsWith('--') && a[i - 1] !== '--expect');   // a flag's own value is not a shard file
  const parts = files.map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  const bad = [];
  const n = parts[0].shards;
  const got = new Set(parts.map((p) => p.shard));
  if (parts.some((p) => p.shards !== n || p.population !== parts[0].population || p.base !== parts[0].base)) bad.push('the shards were taken over different populations, shard counts or bases');
  for (let k = 0; k < n; k++) if (!got.has(k)) bad.push(`shard ${k}/${n} is missing`);
  if (parts.some((p) => !p.complete)) bad.push('a shard is not complete');
  const sum = (f) => parts.reduce((a, p) => a + p[f], 0);
  const byClass = Object.fromEntries(CLASSES.map((c) => [c, parts.flatMap((p) => p.movers.filter((m) => m.cls === c))]));
  const excluded = parts.flatMap((p) => p.excluded);
  console.log(`MERGED ${parts.length} of ${n} shards over ${parts[0].population} distinct sets, base ${parts[0].base}`);
  console.log(`built       : ${sum('built')} sets x 2 modes (${excluded.length} excluded — ${[...new Set(excluded.map((e) => e.why))].join('; ') || 'none'})`);
  console.log(`export      : ${sum('floats').toLocaleString()} floats over ${sum('tris').toLocaleString()} triangles; grid ${sum('gridFloats').toLocaleString()} values (live)`);
  console.log(`holders     : ${sum('holders')} — 0 floats may move on any`);
  for (const c of CLASSES) console.log(`movers (${c}) : ${byClass[c].length} predicted, ${byClass[c].filter((m) => m.moved).length} moved`);
  const held = Object.fromEntries(HOLD_CLASSES.map((c) => [c, parts.flatMap((p) => (p.held || []).filter((m) => m.cls === c))]));
  for (const c of HOLD_CLASSES) console.log(`must hold (${c}) : ${held[c].length} predicted, ${held[c].filter((m) => !m.moved).length} held to the bit`);
  const fails = [...bad, ...parts.flatMap((p) => p.fails)];
  for (const c of HOLD_CLASSES) if (!held[c].length) fails.push(`${c}: the population holds no such set — the claim would be vacuous`);
  const exp = argOf('--expect');
  if (exp) {
    const want = Object.fromEntries(exp.split(',').map((kv) => kv.split('=')));
    const key = { a: 'a-radial-orchid', b2: 'b-hub-grows', b: 'b-foot-follows', c1: 'c-area-rule', c2: 'c-all-on-grid', c3: 'c-spiral-layers', h: 'h-spiral-inner' };
    for (const [k, v] of Object.entries(want)) { const got = (byClass[key[k]] || held[key[k]]).length; if (got !== Number(v)) fails.push(`--expect ${k}=${v}: the base records predict ${got}`); }
  }
  if (argv.includes('--list')) for (const c of [...CLASSES, ...HOLD_CLASSES]) { console.log(`\n${c}:`); for (const m of (byClass[c] || held[c])) console.log(`  ${m.moved ? 'MOVED' : 'HELD '} ${m.tag} :: ${m.label}${m.detail ? ` — ${m.detail}` : ''}`); }
  if (fails.length) { console.log(`\nFAIL — ${fails.length} finding(s):`); for (const f of fails.slice(0, 80)) console.log('  ' + f); process.exit(1); }
  console.log(`\nPASS — every holder held to the bit in both modes; every predicted mover moved.`);
  process.exit(0);
}

const BASE = argOf('--base');
if (!BASE || !fs.existsSync(path.join(BASE, 'bloom-geometry.js'))) { console.error('usage: --base <worktree of the base commit>'); process.exit(2); }
const load = (dir, f) => import(pathToFileURL(path.join(dir, f)).href);
const [G, R, F, BG, BH, BF] = await Promise.all([
  load(ROOT, 'bloom-geometry.js'), load(ROOT, 'bloom-registry.js'), load(ROOT, 'bloom-file.js'),
  load(BASE, 'bloom-geometry.js'), load(BASE, 'tools/bloom-harness.mjs'), load(BASE, 'bloom-file.js'),
]);
const [K, N] = (argOf('--shard') || '0/1').split('/').map(Number);
const CONTROL = argv.includes('--control');

/* THE POPULATION — first occurrence of each (set, capability), live first. */
const seen = new Map();
const add = (tag, r) => { const k = JSON.stringify([r.set, r.capability ?? null, r.scopes ?? null]); if (!seen.has(k)) seen.set(k, { tag, label: r.label, set: r.set, capability: r.capability ?? null, scopes: r.scopes ?? null }); };
for (const r of BH.buildMatrix()) add('live', r);
for (const [ph, f] of Object.entries(BH.FROZEN_MATRICES)) for (const r of (typeof f === 'function' ? f() : f)) add(ph, r);
const POP = [...seen.values()];
const mine = POP.filter((_, i) => i % N === K);

const coerce = (controls, defaults, set, label) => {
  const kind = new Map(controls.map((c) => [c.id, c.kind]));
  const s = { ...defaults };
  let scopes = null;
  for (const w of set) {
    if (w.id === R.SCOPES_SET_ID) { scopes = w.value; continue; }
    const k = kind.get(w.id);
    if (!k) return { why: `names "${w.id}", which this tree has no control for`, label };
    s[w.id] = k === 'slider' ? Number(w.value) : k === 'curve' && typeof w.value === 'string' ? JSON.parse(w.value) : w.value;
  }
  return { st: s, scopes };
};

/* the grid law, RESTATED (a range input's step from its min) — not imported
   from the registry's migration, whose output this predicts */
const onGrid = (c, v) => {
  const x = Math.min(c.max, Math.max(c.min, v));
  const dp = (String(c.step).split('.')[1] || '').length, p = 10 ** dp;
  return (Math.round(c.min * p) + Math.round((x - c.min) / c.step) * Math.round(c.step * p)) / p;
};
const baseCtl = new Map(BH.CONTROLS.map((c) => [c.id, c]));
const ALL_IDS = { 'allCurl': 'petalSpineCurl', 'allCup': 'petalCup' };

function predict(st, rowScopes) {
  const fr = BG.footRing(st, new BG.MeshBuilder({ exportMode: false }));
  const rs = fr.rings || [];
  /* WHAT THE HEAD DRAWS DIFFERENTLY, read off the BASE tree's own records:
     (1) a descriptor whose composed value is not the base state's own (the
         override reached the blade) — under a DROP that difference is lost;
     (2) the hub radius, which the head sums ONE GROUP PER WHORL
         (`slotCount * rFoot^2`) where the base summed one group per role
         descriptor — the same terms in another order, so equal or an ulp off. */
  const valueMoves = (r) => !!r.overrides && Object.entries(r.overrides).some(([b, v]) => !Object.is(v, Number(st[b])));
  const radiusMoves = () => {
    if (fr.continuousMode || !rs.some((r) => r.slotRole || r.petalRole)) return null;
    let sum = 0;
    for (let L = 0; L < Math.round(st.layerCount); L++) {
      const r = rs.find((x) => x.lambda === L);
      const rFoot = Math.sqrt((r.width * r.thickness) / Math.PI);
      sum += fr.slotCount * rFoot * rFoot;
    }
    const R0 = Math.round(st.layerCount) >= 2 ? Math.sqrt(sum) : fr.derivedRadius;
    return Object.is(R0, fr.derivedRadius) ? null : `R0 ${fr.derivedRadius} -> ${R0}`;
  };
  if (rs.some((r) => r.slotRole)) {
    const v = rs.some((r) => r.slotRole && valueMoves(r)), rad = radiusMoves();
    if (v || rad) return { cls: 'a-radial-orchid', detail: `split ${[...new Set(rs.map((r) => r.slotRole).filter(Boolean))].join('/')}${v ? '' : ` — every role value clamped onto the base, the radius alone moves (${rad})`}` };
    return null;
  }
  /* (b) and (c3), from the base state and the base row's OWN stored scopes */
  const stored = rowScopes && Array.isArray(rowScopes.layers) ? rowScopes.layers : [];
  if (String(st.scopeLayers) === 'ON' && (st.placement === 'RADIAL' || st.placement === 'SPIRAL') && stored.some((e) => e.layer > 0 && e.offsets && Number(e.offsets.petalWidth) > 0)) return { cls: 'b-hub-grows', detail: `a stored layer entry past layer 1 owns a width past Petal width (${st.placement}) — the hub grows to its ring` };
  if (String(st.scopeLayers) === 'ON' && (st.placement === 'RADIAL' || st.placement === 'SPIRAL') && stored.some((e) => e.offsets && 'petalWidth' in e.offsets)) return { cls: 'b-foot-follows', detail: `a stored layer entry owns petalWidth under per-layer values (${st.placement})` };
  if (String(st.scopeLayers) === 'ON' && st.placement === 'SPIRAL' && stored.length) return { cls: 'c-spiral-layers', detail: 'stored layer entries, inert on the base (RADIAL only), live under a spiral now' };
  if (st.placement === 'SPIRAL' && rs.some((r) => r.role === 'INNER' && valueMoves(r))) return { cls: 'h-spiral-inner', hold: true, detail: 'INNER record on a spiral — migrates onto turn entries (Oct 16) and must build to the bit' };
  if (rs.some((r) => r.petalRole)) { const rad = radiusMoves(); if (rad) return { cls: 'c-area-rule', detail: rad }; }
  if (rs.some((r) => r.allRole && r.overrides)) {
    for (const [id, base] of Object.entries(ALL_IDS)) {
      if (Number(st[id] ?? 0) === 0) continue;
      const composed = rs[0].overrides[base];
      const folded = onGrid(baseCtl.get(base), Number(st[base]) + Number(st[id]));
      if (!Object.is(composed, folded) && !rs.some((r) => r.petalRole)) return { cls: 'c-all-on-grid', detail: `${base} ${composed} -> ${folded}` };
    }
  }
  return null;
}

function build(Geo, st, opts, exportMode, grid) {
  const acc = new Geo.MeshBuilder({ exportMode, captureGrid: grid });
  const built = Geo.buildBloomInto(acc, { ...st }, opts);
  return { pos: acc.positions, petals: built.petalsAll || built.petals };
}
function gridOf(petals) {
  const out = [];
  for (let p = 0; p < petals.length; p++) {
    out.push(`p${p}:${petals[p] ? 1 : 0}`);
    const g = petals[p] && petals[p].grid;
    if (!g) continue;
    for (const pan of g) {
      out.push(pan.label, pan.rowFrom, pan.rowTo, pan.rows.length);
      for (const r of pan.rows) {
        out.push(r.row, r.u, r.halfWidth, r.thickness);
        for (let j = 0; j < r.v.length; j++) out.push(r.v[j], ...r.mid[j], ...r.normal[j]);
      }
    }
  }
  return out;
}
const firstDiff = (a, b) => { if (a.length !== b.length) return `length ${a.length} against ${b.length}`; let n = 0, f = -1; for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) { n++; if (f < 0) f = i; } return n ? `${n} of ${a.length} differ, first at ${f}: ${a[f]} against ${b[f]}` : null; };

const out = { shard: K, shards: N, population: POP.length, base: BASE, built: 0, holders: 0, floats: 0, tris: 0, gridFloats: 0, movers: [], held: [], excluded: [], fails: [], complete: false };
/* ONE PLACE A PREDICTION IS ACCOUNTED: a mover class is a mover, a hold class
   is a holder that is also counted by name, nothing is a plain holder. */
function account(e, pred, diffs) {
  if (pred && !pred.hold) { out.movers.push({ tag: e.tag, label: e.label, cls: pred.cls, detail: pred.detail, moved: diffs.length > 0, diffs: diffs.slice(0, 2) }); return; }
  out.holders++;
  if (pred) out.held.push({ tag: e.tag, label: e.label, cls: pred.cls, detail: pred.detail, moved: diffs.length > 0 });
  if (diffs.length) out.fails.push(`HOLDER MOVED${pred ? ` (${pred.cls})` : ''} ${e.tag} :: ${e.label} — ${diffs.join('; ')}`);
}
let controlled = false;
/* THE CHECKPOINT: one JSON line per set, keyed on its position in the
   population; a resumed run replays the lines it finds and builds the rest. */
const CK = argOf('--checkpoint');
const done = new Map();
if (CK && fs.existsSync(CK)) for (const line of fs.readFileSync(CK, 'utf8').split('\n')) { if (!line.trim()) continue; try { const j = JSON.parse(line); done.set(j.at, j); } catch { /* a torn last line is rebuilt */ } }
const record = (j) => { if (CK && !CONTROL) fs.appendFileSync(CK, JSON.stringify(j) + '\n'); };
for (const e of mine) {
  const at = POP.indexOf(e);
  const had = done.get(at);
  if (had) {
    if (had.excluded) { out.excluded.push(had.excluded); continue; }
    out.built++; out.floats += had.floats; out.tris += had.tris; out.gridFloats += had.gridFloats;
    /* the PREDICTION is re-taken on replay (a footRing, no build), so a
       refined predictor is judged against the bytes already measured */
    had.pred = predict(coerce(BH.CONTROLS, BH.DEFAULTS, BH.migrateSet(e.set), e.label).st, e.scopes);
    account(e, had.pred, had.diffs);
    continue;
  }
  const b = coerce(BH.CONTROLS, BH.DEFAULTS, BH.migrateSet(e.set), e.label);
  if (!b.st) { const x = { tag: e.tag, label: e.label, why: `base: ${b.why}` }; out.excluded.push(x); record({ at, excluded: x }); continue; }
  const m = coerce(R.CONTROLS, R.DEFAULTS, R.migrateSet(e.set), e.label);
  if (!m.st) { const x = { tag: e.tag, label: e.label, why: `head: ${m.why}` }; out.excluded.push(x); record({ at, excluded: x }); continue; }
  const pred = predict(b.st, e.scopes);
  /* a row's own `scopes` (the base matrix's tier rows) reaches both trees */
  const optsB = { below: null, capability: e.capability, ...(e.scopes ? { scopes: BF.scopesForBuild(e.scopes) } : {}) };
  const headScopes = m.scopes || e.scopes ? F.scopesForBuild(m.scopes || e.scopes) : null;
  const optsH = { below: null, capability: e.capability, scopes: headScopes };
  const diffs = [];
  let fl = 0, tr = 0, gf = 0;
  for (const exportMode of [false, true]) {
    const hb = build(G, m.st, optsH, exportMode, !exportMode);
    const bb = build(BG, b.st, optsB, exportMode, !exportMode);
    if (CONTROL && !controlled && !pred && exportMode) { hb.pos[0] += 1e-9; controlled = true; }
    const d = firstDiff(hb.pos, bb.pos);
    if (d) diffs.push(`${exportMode ? 'export' : 'live'}: ${d}`);
    fl += bb.pos.length; tr += bb.pos.length / 9;
    if (!exportMode) {
      const ga = gridOf(hb.petals), gb = gridOf(bb.petals);
      const dg = firstDiff(ga, gb);
      if (dg) diffs.push(`grid: ${dg}`);
      gf += gb.length;
    }
  }
  out.built++; out.floats += fl; out.tris += tr; out.gridFloats += gf;
  record({ at, pred, diffs, floats: fl, tris: tr, gridFloats: gf });
  account(e, pred, diffs);
  if (out.built % 50 === 0) process.stderr.write(`  shard ${K}/${N}: ${out.built}/${mine.length}\n`);
}
for (const mv of out.movers) if (!mv.moved) out.fails.push(`PREDICTED MOVER HELD (${mv.cls}) ${mv.tag} :: ${mv.label} — the class names a change that did not happen`);
if (CONTROL) {
  if (!controlled) out.fails.push('CONTROL: no holder to perturb in this shard');
  const fired = out.fails.some((f) => f.startsWith('HOLDER MOVED'));
  console.log(fired ? 'CONTROL: the perturbed holder was reported — the comparison can fail' : 'CONTROL FAILED: a perturbed holder passed');
  process.exit(fired ? 0 : 1);
}
out.complete = true;
const J = argOf('--json');
if (J) fs.writeFileSync(J, JSON.stringify(out));
console.log(`shard ${K}/${N}: ${out.built} built, ${out.holders} holders, ${out.movers.length} predicted movers (${out.movers.filter((m) => m.moved).length} moved), ${out.excluded.length} excluded, ${out.fails.length} finding(s)`);
for (const f of out.fails.slice(0, 40)) console.log('  ' + f);
process.exit(out.fails.length ? 1 : 0);
