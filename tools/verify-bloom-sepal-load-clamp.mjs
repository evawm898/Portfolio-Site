#!/usr/bin/env node
/* ===================================================================
   tools/verify-bloom-sepal-load-clamp.mjs — a stored sepal value past its
   bound LOADS AS THE NEAREST BOUND, SILENTLY (Eva's ruling on Q-S6, Oct 9;
   docs/bloom-sepal-discovery.md §10.5).

   The §9 narrowing bounded the sepal roll at -180..180 on the CONTROL, and
   every frozen phase from phase35 to phase61 still stores it at -330 and 330
   (81 rows, 3 a phase). The ruling: such a value clamps on load — a saved
   330 builds as 180, -330 as -180 — with no read-out, no warning and no
   migration (the id and its registry row stay). The page's range input
   already clamped; what this adds is the GEOMETRY doing the same
   (`sepalTwinValue`, read by `sepalBladeState`), so every Node consumer
   builds what the page builds, and the harness read-back expecting the
   bound rather than refusing the row.

   THE EXPECTED VALUES ARE RESTATED FROM THE RULING, never read from the
   geometry's `SEPAL_TWIN_BOUNDS` (the quantity under test): RULED below.

     SL0  the one function: inside the bound every sepal twin comes back as
          `Number(v)` itself (a branch, bit-identical); past it, the NEAREST
          bound — 330 -> 180, -330 -> -180, 185 -> 180, -185 -> -180
     SL1  the build: a stored 330 (and -330) emits EXACTLY the build at the
          bound, every float under Object.is, in LIVE and EXPORT
     SL2  vacuity: the same stored value through the geometry's capability
          hook `{ sepalTwinsUnclamped: true }` emits a DIFFERENT stream — so
          SL1's equality is the clamp's and not a roll that moves nothing
     SL3  in range is untouched: a stored 170 builds differently from 180

     --control            three mutants in COPIES of bloom-geometry.js, every
                          anchor checked before any runs, each required to
                          redden the clauses it names: the clamp removed (a
                          saved 330 loads as 330), the bounds swapped (a saved
                          -330 loads as 180, the FAR bound), and the blade
                          state bypassing the clamp
     --frozen [--base <worktree>]
                          every frozen row whose stored sepal value is past its
                          bound: built on this tree at the stored value must be
                          the build at the bound (SL1 on the real rows); with
                          --base, each is compared against the base tree's own
                          build of the stored value and the movers are NAMED
     --browser            the real page: a stored 330 applied through the
                          harness's applyConfig reads back as 180 with no
                          refusal, the app's own state says 180, and the
                          read-out is character for character the read-out of
                          a page that was handed 180 — nothing said
                          (timings masked: the scan prints its own cost in ms)
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const argOf = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : null);

/* Eva's ruling, restated: the sepal roll's bound (§9.1) and what a stored
   value past it loads as (Q-S6). Not imported. */
const RULED = { sepalRoll: [-180, 180] };
const nearest = (id, v) => { const [lo, hi] = RULED[id]; return v < lo ? lo : v > hi ? hi : v; };

const loadGeom = async (file) => import(pathToFileURL(file).href + `?t=${Date.now()}${Math.random()}`);
const { DEFAULTS, CONTROLS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const WHORL = { sepalCount: 5 };

function build(G, set, exportMode, cap = null) {
  const acc = new G.MeshBuilder({ exportMode });
  G.buildBloomInto(acc, { ...DEFAULTS, ...WHORL, ...set }, cap ? { capability: cap } : {});
  return acc.positions;
}
function sameStream(a, b) {
  if (a.length !== b.length) return { same: false, why: `${a.length} floats against ${b.length}` };
  for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return { same: false, why: `float ${i}: ${a[i]} against ${b[i]}` };
  return { same: true, why: `${a.length} floats identical` };
}

function clauses(G) {
  const out = [];
  const push = (id, ok, msg) => out.push({ id, ok, msg });
  /* SL0 */
  const twinIds = G.SEPAL_TWINS.map(([, s]) => s);
  const byId = Object.fromEntries(CONTROLS.map((c) => [c.id, c]));
  let inRange = 0, inRangeBad = [];
  for (const id of twinIds) {
    const c = byId[id];
    for (const v of [c.min, c.max, c.default, (c.min + c.max) / 2]) {
      inRange++;
      const got = G.sepalTwinValue(id, String(v));
      if (!Object.is(got, Number(v))) inRangeBad.push(`${id} ${v} -> ${got}`);
    }
  }
  push('SL0', inRangeBad.length === 0, `inside the bound every twin is itself (${inRange} values over ${twinIds.length} twins)${inRangeBad.length ? ': ' + inRangeBad.slice(0, 4).join(', ') : ''}`);
  const past = [];
  for (const v of [330, -330, 185, -185, 190, -190]) {
    const got = G.sepalTwinValue('sepalRoll', String(v)), want = nearest('sepalRoll', v);
    if (!Object.is(got, want)) past.push(`${v} -> ${got} (the ruling says ${want})`);
  }
  push('SL0', past.length === 0, `past the bound a stored roll loads as the NEAREST bound (330/-330/185/-185/190/-190)${past.length ? ': ' + past.join(', ') : ''}`);
  /* SL1, SL2, SL3 */
  for (const exportMode of [true, false]) {
    const mode = exportMode ? 'EXPORT' : 'LIVE';
    for (const v of [330, -330]) {
      const at = build(G, { sepalRoll: String(nearest('sepalRoll', v)) }, exportMode);
      const stored = build(G, { sepalRoll: String(v) }, exportMode);
      const r = sameStream(stored, at);
      push('SL1', r.same, `${mode}: a stored ${v} emits the build at ${nearest('sepalRoll', v)} — ${r.why}`);
      const raw = build(G, { sepalRoll: String(v) }, exportMode, { sepalTwinsUnclamped: true });
      const r2 = sameStream(raw, at);
      push('SL2', !r2.same, `${mode}: ${v} built AS STORED (the capability hook) differs from the bound — ${r2.same ? 'it does NOT, so SL1 proves nothing' : r2.why}`);
    }
    const r3 = sameStream(build(G, { sepalRoll: '170' }, exportMode), build(G, { sepalRoll: '180' }, exportMode));
    push('SL3', !r3.same, `${mode}: an in-range 170 builds as itself, not as the bound — ${r3.same ? 'it builds as 180' : r3.why}`);
  }
  return out;
}

const report = (rows) => { for (const r of rows) console.log(`  ${r.ok ? 'ok  ' : 'FAIL'} ${r.id}: ${r.msg}`); return rows.every((r) => r.ok); };

const MUTANTS = [
  { id: 'the-clamp-is-removed', names: ['SL0', 'SL1'],
    from: 'return x < b.min ? b.min : x > b.max ? b.max : x;', to: 'return x;' },
  { id: 'the-far-bound-is-taken', names: ['SL0', 'SL1'],
    from: 'return x < b.min ? b.min : x > b.max ? b.max : x;', to: 'return x < b.min ? b.max : x > b.max ? b.min : x;' },
  { id: 'the-blade-state-bypasses-the-clamp', names: ['SL1'],
    from: 's[petalId] = unclamped ? Number(state[sepalId]) : sepalTwinValue(sepalId, state[sepalId]);', to: 's[petalId] = Number(state[sepalId]);' },
];

async function control() {
  const src = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
  for (const m of MUTANTS) {
    const n = src.split(m.from).length - 1;
    if (n !== 1) { console.log(`REFUSED: mutant ${m.id}'s anchor matches ${n} times, not once`); process.exit(1); }
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sepal-load-clamp-'));
  let good = true;
  for (const m of MUTANTS) {
    const f = path.join(dir, `${m.id}.mjs`);
    fs.writeFileSync(f, src.replace(m.from, m.to));
    const rows = clauses(await loadGeom(f));
    const fired = new Set(rows.filter((r) => !r.ok).map((r) => r.id));
    const missed = m.names.filter((x) => !fired.has(x));
    const ok = missed.length === 0;
    if (!ok) good = false;
    console.log(`  ${ok ? 'ok  ' : 'MISS'} ${m.id}: fired ${[...fired].join(', ') || 'nothing'}${missed.length ? ` — MISSED ${missed.join(', ')}` : ''}`);
  }
  fs.rmSync(dir, { recursive: true, force: true });
  return good;
}

async function frozen(base) {
  const H = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-harness.mjs')).href);
  const G = await loadGeom(path.join(ROOT, 'bloom-geometry.js'));
  const GB = base ? await loadGeom(path.join(path.resolve(base), 'bloom-geometry.js')) : null;
  const RB = base ? await import(pathToFileURL(path.join(path.resolve(base), 'bloom-registry.js')).href) : null;
  const memo = new Map();
  const at = (key, f) => { if (!memo.has(key)) memo.set(key, f()); return memo.get(key); };
  const buildSet = (Gm, D, sets, exportMode) => {
    const acc = new Gm.MeshBuilder({ exportMode });
    Gm.buildBloomInto(acc, { ...D, ...Object.fromEntries(sets.map((s) => [s.id, s.value])) });
    return acc.positions;
  };
  let rows = 0, bad = 0, moved = [], held = [];
  for (const [phase, fn] of Object.entries(H.FROZEN_MATRICES)) {
    for (const r of fn()) {
      const sets = r.set || [];
      if (!sets.some((s) => RULED[s.id] && nearest(s.id, Number(s.value)) !== Number(s.value))) continue;
      rows++;
      const key = JSON.stringify(sets);
      const clamped = sets.map((s) => (RULED[s.id] ? { ...s, value: String(nearest(s.id, Number(s.value))) } : s));
      let rowMoved = false;
      for (const exportMode of [true, false]) {
        const here = at(`h|${exportMode}|${key}`, () => buildSet(G, DEFAULTS, sets, exportMode));
        const bound = at(`b|${exportMode}|${JSON.stringify(clamped)}`, () => buildSet(G, DEFAULTS, clamped, exportMode));
        const r1 = sameStream(here, bound);
        if (!r1.same) { bad++; console.log(`  FAIL ${phase} "${r.label}" ${exportMode ? 'EXPORT' : 'LIVE'}: the stored row is not the build at the bound — ${r1.why}`); }
        if (GB) {
          const was = at(`base|${exportMode}|${key}`, () => buildSet(GB, RB.DEFAULTS, sets, exportMode));
          if (!sameStream(here, was).same) rowMoved = true;
        }
      }
      if (GB) (rowMoved ? moved : held).push(`${phase} "${r.label}"`);
    }
  }
  console.log(`  ${bad ? 'FAIL' : 'ok  '} SL1 on the frozen rows: ${rows} rows store a sepal value past its bound; ${rows - bad} build exactly as the bound in both modes`);
  if (GB) {
    console.log(`  movers against ${base}: ${moved.length} of ${rows} rows change bytes, ${held.length} hold`);
    const byLabel = (list) => { const m = new Map(); for (const x of list) { const l = x.replace(/^\S+ /, ''); m.set(l, (m.get(l) || 0) + 1); } return [...m].map(([l, n]) => `${n} x ${l}`).join('\n      '); };
    if (moved.length) console.log(`    MOVED:\n      ${byLabel(moved)}`);
    if (held.length) console.log(`    HELD:\n      ${byLabel(held)}`);
  }
  return bad === 0;
}

async function browser() {
  const H = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-harness.mjs')).href);
  const { server, port } = await H.serveRepo(ROOT);
  const out = [];
  const load = async (value) => {
    const { browser: b, page } = await H.launchPage();
    try {
      await H.openBloom(page, port);
      const refused = await H.applyConfig(page, [{ id: 'sepalCount', value: '5' }, { id: 'sepalRoll', value }]);
      const drift = await H.fullStateDrift(page, [{ id: 'sepalCount', value: '5' }, { id: 'sepalRoll', value }]);
      const state = await page.evaluate(() => window.__bloomUIState());
      const input = await page.evaluate(() => document.getElementById('sepalRoll').value);
      /* a TIMING is the machine's, not the design's: the sepal scan prints its
         own cost in ms, which differs between any two page loads, so every
         "<n> ms" is masked before the two read-outs are compared */
      const readout = (await page.evaluate(() => document.getElementById('readout').textContent)).replace(/\d+(\.\d+)? ms\b/g, 'N ms');
      return { refused, drift, roll: state.sepalRoll, input, readout };
    } finally { await b.close(); }
  };
  try {
    for (const v of ['330', '-330']) {
      const want = String(nearest('sepalRoll', Number(v)));
      const s = await load(v), t = await load(want);
      out.push({ id: 'SL4', ok: s.refused.length === 0, msg: `a stored ${v} is applied with no read-back refusal${s.refused.length ? ': ' + s.refused.join('; ') : ''}` });
      out.push({ id: 'SL4', ok: s.drift.length === 0, msg: `the full state after a stored ${v} is DEFAULTS + the set as it loads${s.drift.length ? ': ' + s.drift.join('; ') : ''}` });
      out.push({ id: 'SL4', ok: Number(s.roll) === Number(want) && Number(s.input) === Number(want), msg: `a stored ${v} loads as ${want} (app state ${s.roll}, input ${s.input})` });
      out.push({ id: 'SL5', ok: s.readout === t.readout, msg: `nothing is said: the read-out after a stored ${v} is the read-out of a page handed ${want} (${s.readout.length} characters${s.readout === t.readout ? '' : ', they DIFFER'})` });
      out.push({ id: 'SL5', ok: !s.readout.includes(v.replace('-', '')), msg: `the read-out never names the stored ${v}` });
    }
  } finally { server.close(); }
  return out;
}

let pass = true;
if (has('--control')) {
  console.log('sepal load clamp --control: every mutant must redden the clauses it names');
  pass = await control();
  console.log(`\nsepal load clamp --control: ${pass ? 'PASS' : 'FAIL'} — ${MUTANTS.length} mutants`);
} else if (has('--frozen')) {
  console.log('sepal load clamp --frozen');
  pass = await frozen(argOf('--base'));
  console.log(`\nsepal load clamp --frozen: ${pass ? 'PASS' : 'FAIL'}`);
} else {
  console.log('sepal load clamp (Eva, Q-S6): a stored sepal roll past -180..180 loads as the nearest bound, silently');
  const G = await loadGeom(path.join(ROOT, 'bloom-geometry.js'));
  pass = report(clauses(G));
  if (has('--browser')) pass = report(await browser()) && pass;
  console.log(`\nsepal load clamp: ${pass ? 'PASS' : 'FAIL'}`);
}
process.exit(pass ? 0 : 1);
