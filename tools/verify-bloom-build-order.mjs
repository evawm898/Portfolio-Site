/* ===================================================================
   verify-bloom-build-order.mjs — IS A BUILD A PURE FUNCTION OF ITS DEFINITION?

     node tools/verify-bloom-build-order.mjs --pass <name> --out <file> [--seed N] [--resume] [--limit-s S] [--only <re>]
     node tools/verify-bloom-build-order.mjs --compare <f1,f2,...>
     node tools/verify-bloom-build-order.mjs --adversary [--only-victims <re>]
     node tools/verify-bloom-build-order.mjs --control <nu-sticky|flag-sticky>
     node tools/verify-bloom-build-order.mjs --coupling [--range a:b --out <file> --resume --limit-s S]

   THE PREMISE UNDER TEST. `bloom-geometry.js` carries four module-level
   `let`s since #289 — `NU`, `RAMP_FORCE_BASE`, `RAMP_PROBE_STEP` and
   `BUDGET_DECISION_ACTIVE` — and CLAUDE.md and both inflorescence docs had
   said the module held none. If any of them survives one build and is read
   by the next, the same design exports differently depending on what was
   built before it, and every frozen baseline is a snapshot of one ORDER.
   Reading the code says they cannot; this tool is the measurement, because
   inspection is not evidence here.

   WHAT A "BUILD" IS HERE: `buildBloomInto(new MeshBuilder({ exportMode }),
   state, { capability })` — exactly what both STL gates and every Node byte
   tool call. What is compared is the EXPORT STREAM, `MeshBuilder.positions`,
   as the SHA-256 of its IEEE-754 bit patterns (so `-0` against `+0` differs,
   which is `Object.is`'s own distinction), plus the triangle count, the
   accumulator's extent (`lo`, `hi`) and its `minThickness`. A digest is a
   positional comparison of every float with a false-agreement probability of
   2^-256; the one thing it reads differently from `Object.is` is two NaNs
   with different payloads, which would be reported as DIFFERENT — the
   conservative direction.

   EVERY BUILD RECEIVES A FROZEN STATE, so a builder that WRITES its input —
   which is order dependence by another route, whenever a caller reuses the
   object — throws a TypeError (modules are strict) and is recorded as a
   finding rather than crashing the pass.

   THE PASSES (`--pass`), each one process-continuous so module state carries
   from one build to the next exactly as it would in the page:
     forward      every row ascending, LIVE then EXPORT per row
     reverse      every row descending, EXPORT then LIVE per row
     shuffle      every (row, mode) pair in a seeded random order (`--seed`),
                  so modes interleave across rows arbitrarily
     live-only    every row ascending, live alone
     export-only  every row ascending, export alone
   Together these are the brief's clauses 1-3: forward against reverse is the
   order; shuffle is the order at two seeds; forward (live-then-export) and
   reverse (export-then-live) against live-only / export-only is the mode
   interleaving, each mode against its own single-mode build.

   CHUNKED AND RESUMABLE because background work does not survive the end of a
   turn in the container this runs in (CLAUDE.md, #270). The pass's order is
   fixed at its start and written to the out file with every completed build;
   `--resume` continues from the first incomplete position, and `--limit-s`
   stops cleanly after that many seconds so a `timeout`-bounded foreground
   chunk never loses a build. EVERY ENTRY RECORDS ITS PREDECESSOR IN THE SAME
   PROCESS (`prev`, null for the first build after a start or a resume): that
   first build is a FRESH-MODULE build, which is itself a valid reference, and
   the comparison prints how many builds had a predecessor so the coverage of
   ordered PAIRS is a number rather than an assumption.

   `--compare` REFUSES an incomplete pass, a pass over a different matrix (by
   count and a hash of every label and set), and any key present in one pass
   and absent in another — a comparison that pairs nothing passes trivially.

   `--adversary` is the brief's clause 4, the pair where a leak would show if
   it showed anywhere: every SETTER (a state whose own tip shape ramps `NU`
   above `NU_BASE`, which is also every state that sets `RAMP_FORCE_BASE` and
   `RAMP_PROBE_STEP`) followed immediately by every VICTIM (states whose
   builders read `NU` or whose ramp decision could be pinned by a stuck flag),
   each compared against the SAME victim built by a FRESH module instance with
   nothing before it. It also throws, on purpose, (a) after a setter's petals
   are built and (b) INSIDE a budget trial build while `RAMP_FORCE_BASE` is
   set, and then reads the flags back through `bladeRowsFor` — the one
   exported function that reads them — and rebuilds every victim.

   `--control` PLANTS A LEAK in a copy of `bloom-geometry.js` and runs the
   SAME comparison code (`comparePasses`, `adversary`) against it, which must
   go red. It REFUSES a vacuous plant: the anchor must match exactly once, and
   the planted module's victim-after-setter must differ from its fresh victim
   (a plant that moves nothing proves nothing about the comparison).

   WHAT IT DOES NOT COVER, in its own header:
     - THE MATRIX IS THE COVERAGE for the passes. A state no row visits is not
       built; the adversary adds a handful of synthetic setters and victims.
     - IT IS NODE-SIDE. Chromium's V8 is not run; that two ENGINES agree is a
       different claim (X0's).
     - IT COMPARES THE EXPORT STREAM and the accumulator's extent. The builder's
       returned record (telemetry) is not compared — it carries wall-clock
       timings (the sepal scan's) that differ run to run by construction.
     - A WITHIN-BUILD COUPLING IS INVISIBLE TO IT BY CONSTRUCTION: a reader that
       sees the `NU` a PREVIOUS PETAL IN THE SAME BUILD left is deterministic in
       the definition, so every order agrees. That class is measured separately
       (`--coupling`), because an order test answers "is it a function of the
       definition", never "is it the right function".
   =================================================================== */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const argv = process.argv.slice(2);
const argOf = (n) => { const i = argv.indexOf(n); return i < 0 ? null : argv[i + 1]; };
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const GEOMETRY = argOf('--geometry') || path.join(ROOT, 'bloom-geometry.js');
let freshCounter = 0;
const loadGeometry = (file = GEOMETRY, fresh = false) => import(pathToFileURL(file).href + (fresh ? `?fresh=${process.pid}-${++freshCounter}` : ''));
const harness = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-harness.mjs')).href);

/* The row -> state map, coerced by each control's declared kind (the
   surface-bytes tool's own `stateOf`): a matrix row's values are STRINGS and
   the geometry's guards are truthiness tests on numbers. */
const kindOf = new Map(harness.CONTROLS.map((c) => [c.id, c]));
export function stateOf(row) {
  const s = { ...harness.DEFAULTS };
  for (const w of row.set || []) {
    const c = kindOf.get(w.id); if (!c) throw new Error(`${row.label}: no control ${w.id}`);
    s[w.id] = c.kind === 'slider' ? Number(w.value) : c.kind === 'check' ? (w.value === true || w.value === 'true') : w.value;
  }
  return s;
}
const deepFreeze = (o) => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) deepFreeze(v); } return o; };

const MATRIX = harness.buildMatrix();
const MATRIX_HASH = crypto.createHash('sha256').update(JSON.stringify(MATRIX.map((r) => [r.label, r.set, r.capability ?? null]))).digest('hex').slice(0, 16);

/* ONE BUILD, DIGESTED. Returns { h, tris } or { err }. */
function digestOf(acc) {
  const P = acc.positions, hash = crypto.createHash('sha256');
  const CH = 1 << 20, buf = new Float64Array(CH);
  for (let i = 0; i < P.length; i += CH) {
    const n = Math.min(CH, P.length - i);
    for (let j = 0; j < n; j++) buf[j] = P[i + j];
    hash.update(new Uint8Array(buf.buffer, 0, n * 8));
  }
  const tail = new Float64Array([P.length, acc.minThickness, ...(acc.lo || []), ...(acc.hi || [])]);
  hash.update(new Uint8Array(tail.buffer));
  return { h: hash.digest('hex').slice(0, 32), tris: P.length / 9 };
}
export function buildOnce(G, state, capability, exportMode) {
  const acc = new G.MeshBuilder({ exportMode });
  try {
    G.buildBloomInto(acc, deepFreeze({ ...state }), { below: null, capability: capability ? deepFreeze(structuredCloneSafe(capability)) : null });
  } catch (e) {
    return { err: `${e && e.name}: ${e && e.message}`.slice(0, 300) };
  }
  return digestOf(acc);
}
function structuredCloneSafe(o) { try { return structuredClone(o); } catch { return o; } }

/* ------------------------------------------------------------ the passes */
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function orderFor(pass, n, seed) {
  const idx = [...Array(n).keys()];
  if (pass === 'forward') return idx.flatMap((i) => [`${i}:live`, `${i}:export`]);
  if (pass === 'reverse') return idx.reverse().flatMap((i) => [`${i}:export`, `${i}:live`]);
  if (pass === 'live-only') return idx.map((i) => `${i}:live`);
  if (pass === 'export-only') return idx.map((i) => `${i}:export`);
  if (pass === 'shuffle') {
    if (!Number.isInteger(seed)) throw new Error('--pass shuffle needs --seed <integer>');
    const all = idx.flatMap((i) => [`${i}:live`, `${i}:export`]);
    const r = mulberry32(seed);
    for (let k = all.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [all[k], all[j]] = [all[j], all[k]]; }
    return all;
  }
  throw new Error(`unknown pass ${pass}`);
}

async function runPass() {
  const pass = argOf('--pass'), out = argOf('--out');
  if (!out) { console.error('--pass needs --out <file>'); process.exit(2); }
  const seed = argOf('--seed') == null ? null : Number(argOf('--seed'));
  const limitS = Number(argOf('--limit-s') || 0) || Infinity;
  const onlyRe = argOf('--only') ? new RegExp(argOf('--only')) : null;
  let rec;
  if (argv.includes('--resume') && fs.existsSync(out)) {
    rec = JSON.parse(fs.readFileSync(out, 'utf8'));
    if (rec.pass !== pass || rec.seed !== seed) throw new Error(`--resume: ${out} holds pass ${rec.pass} seed ${rec.seed}, not ${pass} ${seed}`);
    if (rec.matrixHash !== MATRIX_HASH) throw new Error(`--resume: ${out} was taken over a different matrix (${rec.matrixHash} against ${MATRIX_HASH})`);
  } else {
    let order = orderFor(pass, MATRIX.length, seed);
    if (onlyRe) order = order.filter((k) => onlyRe.test(MATRIX[+k.split(':')[0]].label));
    rec = { pass, seed, geometry: path.relative(ROOT, GEOMETRY), matrixRows: MATRIX.length, matrixHash: MATRIX_HASH, only: onlyRe ? String(onlyRe) : null, order, entries: {}, complete: false, starts: 0 };
  }
  const G = await loadGeometry();
  rec.starts++;
  const t0 = Date.now();
  let prev = null, done = 0;
  const save = () => { const tmp = out + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(rec)); fs.renameSync(tmp, out); };
  for (const key of rec.order) {
    if (rec.entries[key]) continue;
    if ((Date.now() - t0) / 1000 > limitS) { save(); console.log(`stopped at the time limit: ${Object.keys(rec.entries).length}/${rec.order.length} built`); return; }
    const [i, mode] = key.split(':'); const row = MATRIX[+i];
    const b0 = Date.now();
    const d = buildOnce(G, stateOf(row), row.capability ?? null, mode === 'export');
    rec.entries[key] = { ...d, prev, ms: Date.now() - b0 };
    prev = key; done++;
    save();
    if (done % 25 === 0) process.stderr.write(`  ${Object.keys(rec.entries).length}/${rec.order.length} (${((Date.now() - t0) / 1000).toFixed(0)} s)\n`);
  }
  rec.complete = Object.keys(rec.entries).length === rec.order.length;
  save();
  console.log(`${pass}${seed != null ? ` seed ${seed}` : ''}: ${Object.keys(rec.entries).length}/${rec.order.length} built, complete=${rec.complete}`);
}

/* THE COMPARISON — one function, used by `--compare` and by `--control`, so
   the control exercises the shipped comparison rather than a copy of it. */
export function comparePasses(recs) {
  const fails = [], notes = [];
  if (recs.length < 2) fails.push('VACUOUS: fewer than two passes to compare');
  for (const r of recs) {
    if (!r.complete) fails.push(`INCOMPLETE: pass ${r.pass}${r.seed != null ? ` seed ${r.seed}` : ''} is ${Object.keys(r.entries).length}/${r.order.length}`);
    if (r.matrixHash !== recs[0].matrixHash) fails.push(`pass ${r.pass} was taken over a different matrix`);
  }
  /* The union of keys, and every key's value across every pass that ordered it. */
  const byKey = new Map();
  for (const r of recs) for (const k of r.order) { if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push([r, r.entries[k]]); }
  let compared = 0, pairs = 0, withPrev = 0, errs = 0;
  const bad = [];
  for (const [k, list] of byKey) {
    const present = list.filter(([, e]) => e);
    if (present.length < 2) { continue; }
    compared++; pairs += present.length - 1;
    for (const [, e] of present) { if (e.prev) withPrev++; if (e.err) errs++; }
    const ref = present[0];
    for (const [r, e] of present.slice(1)) {
      const same = (e.err || null) === (ref[1].err || null) && e.h === ref[1].h && e.tris === ref[1].tris;
      if (!same) bad.push(`${k} "${(recs[0].labels || [])[+k.split(':')[0]] ?? ''}": ${ref[0].pass}${ref[0].seed != null ? '/' + ref[0].seed : ''} ${ref[1].err ? 'THREW ' + ref[1].err : ref[1].h + ' (' + ref[1].tris + ' tris)'} after ${ref[1].prev ?? '(fresh)'}  vs  ${r.pass}${r.seed != null ? '/' + r.seed : ''} ${e.err ? 'THREW ' + e.err : e.h + ' (' + e.tris + ' tris)'} after ${e.prev ?? '(fresh)'}`);
    }
  }
  if (!compared) fails.push('VACUOUS: no key was built by two passes');
  fails.push(...bad);
  notes.push(`${compared} (row, mode) keys compared across ${recs.length} passes (${pairs} pairwise comparisons); ${withPrev} of the builds had a predecessor in the same process; ${errs} builds threw`);
  return { fails, notes, bad: bad.length, compared };
}

/* ------------------------------------------------------------ the adversary */
const HELD_BY_BASELINE = (D) => ({ ...D, petalCount: 40, layerCount: 6, petalTipShape: 3.0, fringeCount: 10, petalTipEnd: 1, stamenCount: 120, antherLumps: 6, sepalCount: 40, gynoecium: 'STYLE', stemLength: 120, leafLength: 60, leafNodes: 8, leafPhyllotaxy: 'whorled' });
const RAMPS = (s) => Number(s.petalTipShape) > 2.30 || (Number(s.sepalCount) > 0 && Number(s.sepalTipShape) > 2.30);
function adversaryCases() {
  const D = harness.DEFAULTS;
  const setters = [
    ['synthetic: petalTipShape 3.00', { ...D, petalTipShape: 3.0 }],
    ['synthetic: petalTipShape 2.50 (mid-ramp)', { ...D, petalTipShape: 2.5 }],
    ['synthetic: sepals x sepalTipShape 3.00', { ...D, sepalCount: 5, sepalTipShape: 3.0 }],
    /* HELD BY PREDICTION: baseline 1,188,512 under the budget, the probe
       predicting 2,120,352 over it — the path through the probe trial. */
    ['synthetic: ramp HELD by the prediction (40 x 6, tip 3.00, fringe)', { ...D, petalCount: 40, layerCount: 6, petalTipShape: 3.0, fringeCount: 10, petalTipEnd: 1 }],
    /* HELD BY THE BASELINE: 1,562,412 at NU_BASE, over the budget before any
       probe — the EARLY RETURN, the one exit that skips the probe. */
    ['synthetic: ramp HELD by the baseline (early return)', HELD_BY_BASELINE(D)],
  ];
  for (const r of MATRIX) { const s = stateOf(r); if (RAMPS(s) && !r.capability) setters.push([`row: ${r.label}`, s]); }
  const victims = [
    ['DEFAULTS', { ...D }],
    ['synthetic: petalTipShape 2.35 (one ramp step)', { ...D, petalTipShape: 2.35 }],
    ['synthetic: leaves serrated', { ...D, stemLength: 60, leafLength: 40, leafToothDepth: 0.4 }],
    ['synthetic: stamens + style curled', { ...D, stamenCount: 30, stamenCurl: 90, gynoecium: 'STYLE', styleCurl: 90 }],
    ['synthetic: sepals', { ...D, sepalCount: 5 }],
    ['synthetic: lobes', { ...D, lobeDepth: 0.3, lobeCount: 5 }],
    ['synthetic: inflorescence', { ...D, stemLength: 80, inflorescence: 'RACEME' }],
  ];
  const want = [/^LEAVES: /, /^STAMENS/, /^GYNOECIUM/, /^SEPALS: /, /^LOBES: /, /^INFLO: /, /^SPHERE STEM: THE BARE CORNER/];
  for (const re of want) { const r = MATRIX.find((x) => re.test(x.label) && !x.capability); if (r) victims.push([`row: ${r.label}`, stateOf(r)]); }
  /* Keep only states the registry accepts (every key a control, nothing unknown). */
  for (const [, s] of [...setters, ...victims]) for (const k of Object.keys(s)) if (!(k in D)) throw new Error(`adversary state names ${k}, which is not a control`);
  return { setters, victims };
}
export async function adversary(G, file, { log = console.log, only = null, onlySetters = null } = {}) {
  const fails = [];
  const { setters: allS, victims: allV } = adversaryCases();
  const setters = onlySetters ? allS.filter(([n]) => onlySetters.test(n)) : allS;
  const victims = only ? allV.filter(([n]) => only.test(n)) : allV;
  /* The FRESH reference: every victim, both modes, each in its own module
     instance with nothing built before it. */
  const fresh = new Map();
  for (const [name, s] of victims) for (const mode of [false, true]) {
    const F = await loadGeometry(file, true);
    fresh.set(`${name}|${mode}`, buildOnce(F, s, null, mode));
  }
  let pairs = 0;
  for (const [sn, ss] of setters) {
    for (const [vn, vs] of victims) for (const mode of [false, true]) {
      buildOnce(G, ss, null, mode);
      const got = buildOnce(G, vs, null, mode), want = fresh.get(`${vn}|${mode}`);
      pairs++;
      if (got.err || want.err || got.h !== want.h) fails.push(`${vn} (${mode ? 'export' : 'live'}) after ${sn}: ${got.err || got.h + ' ' + got.tris} against fresh ${want.err || want.h + ' ' + want.tris}`);
    }
  }
  log(`adversary: ${setters.length} setters x ${victims.length} victims x 2 modes = ${pairs} setter->victim pairs against fresh-module builds`);
  /* THE THROWS. A Proxy over a setter's state that throws on a key read late
     in the build — after the head petals (so `NU` is left ramped), and a
     second that throws INSIDE the budget's baseline trial (so the throw
     lands while RAMP_FORCE_BASE is true). Then the flags are read back
     through `bladeRowsFor`, and every victim is rebuilt. */
  /* A throw decided by WHERE THE BUILD IS, read through the module's own
     exports, never by counting property reads: `bladeRowsFor(3.0)` is 56
     only while RAMP_FORCE_BASE is set and 57 only while RAMP_PROBE_STEP is,
     and `HELD_ROWS()` is 33 only once a petal has set NU to 112. The flag
     state AT the throw is recorded, so a throw that landed somewhere else is
     a VACUOUS finding rather than a pass. */
  const at = () => `${G.bladeRowsFor(3.0)}/${G.HELD_ROWS()}`;
  const throwWhen = (base, cond) => { const box = { at: null }; return [new Proxy({ ...base }, { get(t, k, r) { if (box.at === null && cond()) { box.at = at(); throw new Error(`planted throw at ${box.at}`); } return Reflect.get(t, k, r); } }), box]; };
  const flagProbe = () => [G.bladeRowsFor(3.0), G.bladeRowsFor(2.5), G.bladeRowsFor(1.7)];
  const flagClean = flagProbe();
  const D = harness.DEFAULTS;
  const throwers = [
    ['after a ramped petal, in the final build', () => throwWhen({ ...D, petalTipShape: 3.0, sepalCount: 5 }, () => G.bladeRowsFor(3.0) === 112 && G.HELD_ROWS() === 33), '112/33'],
    ['inside the baseline trial (RAMP_FORCE_BASE set)', () => throwWhen({ ...D, petalTipShape: 3.0, sepalCount: 5 }, () => G.bladeRowsFor(3.0) === 56), '56/'],
    ['inside the probe trial (RAMP_PROBE_STEP set)', () => throwWhen({ ...D, petalTipShape: 3.0, sepalCount: 5 }, () => G.bladeRowsFor(3.0) === 57), '57/'],
  ];
  let threw = 0;
  for (const [tn, make, where] of throwers) {
    for (const mode of [false, true]) {
      buildOnce(G, D, null, false);   // NU back to NU_BASE, so the condition can only fire inside THIS build
      const [ts, box] = make();
      const acc = new G.MeshBuilder({ exportMode: mode });
      try { G.buildBloomInto(acc, ts, { below: null, capability: null }); fails.push(`VACUOUS: "${tn}" did not throw`); } catch (e) { if (!/planted throw/.test(e.message)) fails.push(`"${tn}" threw something else: ${e.message}`); else threw++; }
      if (box.at !== null && !box.at.startsWith(where)) fails.push(`VACUOUS: "${tn}" threw at ${box.at}, not at ${where}`);
      const f = flagProbe();
      if (f.join() !== flagClean.join()) fails.push(`after "${tn}" (${mode ? 'export' : 'live'}) bladeRowsFor(3.0, 2.5, 1.7) reads ${f.join(', ')} against ${flagClean.join(', ')} — a budget flag survived the throw`);
      for (const [vn, vs] of victims) for (const vm of [false, true]) {
        const got = buildOnce(G, vs, null, vm), want = fresh.get(`${vn}|${vm}`);
        if (got.err || got.h !== want.h) fails.push(`${vn} (${vm ? 'export' : 'live'}) after "${tn}": ${got.err || got.h} against fresh ${want.h}`);
      }
    }
  }
  log(`adversary: ${threw} planted throws landed (${throwers.length} kinds x 2 modes); flags read back ${flagClean.join(', ')} each time unless reported below`);
  if (!pairs) fails.push('VACUOUS: no setter->victim pair');
  if (!setters.some(([, s]) => RAMPS(s))) fails.push('VACUOUS: no setter ramps NU');
  return fails;
}

/* ------------------------------------------------------------ the control */
const PLANTS = {
  /* NU is set only when the petal's own tip shape ramps — so a below-band
     build inherits whatever the last ramped petal left. */
  'nu-sticky': { find: '  NU = bladeRowsFor(ps.petalTipShape);', into: '  if (Number(ps.petalTipShape) > APEX_NU_BAND[0]) NU = bladeRowsFor(ps.petalTipShape);' },
  /* RAMP_FORCE_BASE is cleared only on the path that goes on to a probe, and
     not in the `finally` — so a build the BUDGET HOLDS (the early return)
     leaves it set, and the next ramp-eligible build is pinned at NU_BASE.
     A return path that skips a reset: the realistic shape of this leak. */
  'flag-sticky': { find: '    RAMP_FORCE_BASE = false;\n    RAMP_PROBE_STEP = false;\n    BUDGET_DECISION_ACTIVE = false;', into: '    RAMP_PROBE_STEP = false;\n    BUDGET_DECISION_ACTIVE = false;',
    also: [{ find: '    RAMP_FORCE_BASE = false;\n    const baselineTris', into: '    const baselineTris' },
           { find: '    RAMP_PROBE_STEP = true;\n', into: '    RAMP_FORCE_BASE = false;\n    RAMP_PROBE_STEP = true;\n' }] },
};
async function control(which) {
  const P = PLANTS[which]; if (!P) { console.error(`--control: one of ${Object.keys(PLANTS).join(', ')}`); process.exit(2); }
  let src = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
  for (const m of [P, ...(P.also || [])]) {
    const n = src.split(m.find).length - 1;
    if (n !== 1) { console.log(`REFUSED: the plant's anchor matches ${n} times, not once — the plant is not where it says it is`); process.exit(1); }
    src = src.replace(m.find, m.into);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-order-control-'));
  const file = path.join(dir, 'bloom-geometry.js'); fs.writeFileSync(file, src);
  const G = await loadGeometry(file, true);
  /* VACUITY: the plant must move a victim built after a setter. */
  const D = harness.DEFAULTS;
  const setter = which === 'flag-sticky' ? HELD_BY_BASELINE(D) : { ...D, petalTipShape: 3.0 };
  const victim = which === 'flag-sticky' ? { ...D, petalTipShape: 2.5 } : { ...D };
  const Ffresh = await loadGeometry(file, true);
  const want = buildOnce(Ffresh, victim, null, true);
  buildOnce(G, setter, null, true);
  const got = buildOnce(G, victim, null, true);
  if (got.h === want.h) { console.log(`REFUSED: the ${which} plant does not move the victim after the setter (${got.h}) — a vacuous plant proves nothing`); process.exit(1); }
  console.log(`plant ${which}: witness — victim after setter ${got.h} (${got.tris} tris) against fresh ${want.h} (${want.tris} tris)`);
  /* THE ORDER COMPARISON on a mini matrix — setters then victims forward,
     the reverse, each in its own fresh planted module, through the SHIPPED
     `comparePasses`. */
  const mini = [setter, victim, { ...D, petalTipShape: 3.0 }, { ...D }, { ...D, petalTipShape: 2.5 }];
  const runMini = async (pass) => {
    const M = await loadGeometry(file, true);
    const order = orderFor(pass, mini.length, 1);
    const rec = { pass, seed: null, matrixHash: 'mini', order, entries: {}, complete: true };
    let prev = null;
    for (const k of order) { const [i, m] = k.split(':'); rec.entries[k] = { ...buildOnce(M, mini[+i], null, m === 'export'), prev }; prev = k; }
    return rec;
  };
  const cmp = comparePasses([await runMini('forward'), await runMini('reverse')]);
  console.log(`order comparison on the planted module: ${cmp.bad} key(s) DIFFER`);
  for (const f of cmp.fails.slice(0, 6)) console.log('  ' + f);
  const adv = await adversary(G, file, { log: (s) => console.log('  ' + s), only: /^(DEFAULTS|synthetic: petalTipShape 2\.35)/, onlySetters: which === 'flag-sticky' ? /^synthetic: ramp HELD by the baseline/ : /^synthetic: petalTipShape/ });
  console.log(`adversary on the planted module: ${adv.length} finding(s)`);
  for (const f of adv.slice(0, 6)) console.log('  ' + f);
  fs.rmSync(dir, { recursive: true, force: true });
  if (cmp.bad && adv.length) { console.log(`\nCONTROL OK — the planted ${which} leak turns BOTH the order comparison and the adversary red.`); process.exit(0); }
  console.log(`\nCONTROL FAILED — the planted ${which} leak was ${cmp.bad ? '' : 'NOT '}seen by the order comparison and ${adv.length ? '' : 'NOT '}by the adversary.`);
  process.exit(1);
}


/* ------------------------------------------------------------ the coupling
   THE ONE THING AN ORDER TEST CANNOT SEE: a reader of `NU` that runs INSIDE a
   build but OUTSIDE any petal's own `petalSurface` sees the value the LAST
   PETAL BUILT left, which is deterministic in the definition — every order
   agrees — and still couples that part to the petals' tip shape. `--coupling`
   measures it by DECOUPLING a copy of the module (each such reader pinned to
   its OWN value: `NU_BASE` for the leaf blade and the stamen/style rod, whose
   parts have no apex ramp; the sepal ring's own `bladeRowsFor(sepalTipShape)`
   for the sepal angle scan's seam step) and comparing every matrix row, both
   modes, positionally. A row that differs is a row whose shipped bytes carry
   the coupling. The decoupled copy is a MEASUREMENT, never a fix: it is written
   to a temp directory and deleted, and what the right owner of each reader is
   remains a ruling. The anchors refuse unless each matches exactly once. */
const DECOUPLE = [
  { what: 'leaf blade rows and lobe capacity (buildLeafInto)', find: 'export function buildLeafInto(acc, plan, state, nodeIndex, az) {\n', into: 'export function buildLeafInto(acc, plan, state, nodeIndex, az) {\n  NU = NU_BASE;\n' },
  { what: 'stamen and style spine integrator (rodInto -> spineLaw)', find: 'function rodInto(acc, { t, r, curlRad, length, floorRadius }, s, azimuth) {\n', into: 'function rodInto(acc, { t, r, curlRad, length, floorRadius }, s, azimuth) {\n  NU = NU_BASE;\n' },
  { what: 'sepal angle scan seam step (sepalAngleLimit -> seamLatticeStep)', find: '    const trials = new Map();   // seam-step bucket -> trial lamina at its representative angle\n', into: '    NU = bladeRowsFor(state.sepalTipShape);\n    const trials = new Map();   // seam-step bucket -> trial lamina at its representative angle\n' },
];
async function decoupledModule() {
  let src = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
  for (const d of DECOUPLE) { const n = src.split(d.find).length - 1; if (n !== 1) throw new Error(`--coupling: the anchor for "${d.what}" matches ${n} times, not once`); src = src.replace(d.find, d.into); }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-order-decoupled-'));
  const file = path.join(dir, 'bloom-geometry.js'); fs.writeFileSync(file, src);
  const M = await loadGeometry(file, true);
  fs.rmSync(dir, { recursive: true, force: true });
  return M;
}
function fullBuild(G, state, capability, exportMode) {
  const acc = new G.MeshBuilder({ exportMode });
  const built = G.buildBloomInto(acc, deepFreeze({ ...state }), { below: null, capability: capability ? deepFreeze(structuredCloneSafe(capability)) : null });
  return { P: acc.positions, built };
}
function diffStreams(a, b) {
  if (a.length !== b.length) return { moved: true, tris: [a.length / 9, b.length / 9] };
  let n = 0, w = 0;
  for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) { n++; const d = Math.abs(a[i] - b[i]); if (d > w) w = d; }
  return n ? { moved: true, floats: n, of: a.length, worstMm: w } : { moved: false };
}
async function coupling() {
  const out = argOf('--out'); const [a, b] = (argOf('--range') || `0:${MATRIX.length}`).split(':').map(Number);
  const G = await loadGeometry(), M = await decoupledModule();
  const rec = out && argv.includes('--resume') && fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : { matrixHash: MATRIX_HASH, from: a, to: b, rows: {} };
  const limitS = Number(argOf('--limit-s') || 0) || Infinity, t0 = Date.now();
  for (let i = a; i < Math.min(b, MATRIX.length); i++) {
    if (rec.rows[i]) continue;
    if ((Date.now() - t0) / 1000 > limitS) break;
    const row = MATRIX[i], st = stateOf(row), r = { label: row.label };
    for (const mode of [false, true]) {
      const x = fullBuild(G, st, row.capability ?? null, mode), y = fullBuild(M, st, row.capability ?? null, mode);
      r[mode ? 'export' : 'live'] = diffStreams(x.P, y.P);
    }
    rec.rows[i] = r;
    if (out) fs.writeFileSync(out, JSON.stringify(rec));
  }
  const done = Object.keys(rec.rows).length, moved = Object.entries(rec.rows).filter(([, r]) => r.live.moved || r.export.moved);
  console.log(`coupling: ${done} of rows ${a}..${b - 1} compared, shipped against decoupled, both modes; ${moved.length} carry the coupling`);
  for (const [i, r] of moved) console.log(`  ${i} ${r.label}: live ${JSON.stringify(r.live)} · export ${JSON.stringify(r.export)}`);
}

/* ------------------------------------------------------------ main */
if (argOf('--pass')) await runPass();
else if (argOf('--compare')) {
  const recs = argOf('--compare').split(',').map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  recs[0].labels = MATRIX.map((r) => r.label);
  if (recs.some((r) => r.matrixHash !== MATRIX_HASH)) console.log(`note: this tree's matrix is ${MATRIX_HASH}`);
  const { fails, notes } = comparePasses(recs);
  for (const n of notes) console.log(n);
  for (const r of recs) {
    const e = Object.values(r.entries); const tris = e.reduce((a, x) => a + (x.tris || 0), 0), ms = e.reduce((a, x) => a + (x.ms || 0), 0);
    console.log(`  ${r.pass}${r.seed != null ? ' seed ' + r.seed : ''}: ${e.length} builds, ${tris.toLocaleString()} triangles (${(tris * 9).toLocaleString()} floats), ${(ms / 60000).toFixed(1)} build-min, ${r.starts} process start(s)`);
  }
  if (fails.length) { console.log(`\nFAIL — ${fails.length} finding(s):`); for (const f of fails.slice(0, 60)) console.log('  ' + f); process.exit(1); }
  console.log('\nPASS — every (row, mode) digest identical across every pass, positionally, bit for bit.');
} else if (argv.includes('--adversary')) {
  const G = await loadGeometry();
  const only = argOf('--only-victims') ? new RegExp(argOf('--only-victims')) : null;
  const fails = await adversary(G, GEOMETRY, { only, onlySetters: argOf('--only-setters') ? new RegExp(argOf('--only-setters')) : null });
  if (fails.length) { console.log(`\nFAIL — ${fails.length} finding(s):`); for (const f of fails.slice(0, 60)) console.log('  ' + f); process.exit(1); }
  console.log('\nPASS — every victim built after every setter, and after every planted throw, is bit-identical to its fresh-module build; the budget flags read back clean.');
} else if (argOf('--control')) await control(argOf('--control'));
else if (argv.includes('--coupling')) await coupling();
else { console.error('usage: see the header'); process.exit(2); }
