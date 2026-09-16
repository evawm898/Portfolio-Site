/* ===================================================================
   verify-bloom-leaf-bytes.mjs — THE LEAF FEATURE'S BYTE PARTITION.

     node tools/verify-bloom-leaf-bytes.mjs --base <worktree> [--control]
          [--control-only] [--matrix live|phaseNN] [--expect M/H]

   THE PARTITION IS PREDECLARED FROM THE BUILDER'S OWN RECORD, never from the
   control set: a row MOVES iff `leafPlan(...)` comes back present — a leaf is
   actually built — and HOLDS otherwise. Session 38's lesson is why: a row that
   sweeps every control is a mover of any control a feature adds, and a
   predeclaration read off the control names missed `ALL MAX` and closed over
   634 "holders" one of which had moved three and a half million floats. Here
   `ALL MAX` is measured to carry NO leaf control (the whole family is hidden at
   DEFAULTS, so the blanket sweep never reaches it) and the tool proves that
   rather than assuming it.

   TWO CLAUSES, AND THE SECOND IS THE ONE THIS FEATURE IS ABOUT.
     1. Every predeclared MOVER moves and every predeclared HOLDER holds,
        float for float under `Object.is`, in BOTH modes.
     2. ON EVERY MOVER THE FEATURE IS PURELY ADDITIVE: the base tree's entire
        float stream is a PREFIX of the branch's, and everything after it is
        the leaves' own triangles and nothing else. A leaf that perturbed the
        hub, a petal or the stem would pass clause 1 (the row is a declared
        mover, so it is ALLOWED to differ) and fail only here.

   `--change tipShape` (the leaf tip-shape session) PREDECLARES A DIFFERENT
   PARTITION FROM THE SAME RECORD: a row moves iff a leaf is built AND the plan
   reports a tip exponent other than the default `LEAF_TIP_SHAPE`. Clause 2
   changes with it, because a tip change is NOT additive — the leaf's own floats
   move in place — so it becomes: with the leaves removed (the same row rebuilt
   at `leafLength` 0 on each tree) the two trees are identical AND each
   leafless stream is a prefix of its own full stream, so every differing float
   lies in the leaf tail and nothing else moved. The tool prints how many plans
   carry a tip exponent at all, so a run where none does (the panel-only commit,
   which must read 0 movers) is visibly a run about nothing but holders.

   BOTH CLAUSES ARE SHOWN ABLE TO FAIL, and they need two different controls —
   this file's own recorded lesson, one tool later. `--control` perturbs a
   HOLDER and fires clause 1; `--control-only` perturbs the FIRST SURVIVING
   float of a MOVER's shared prefix and fires clause 2 while clause 1 stays
   clean. A control that fires only the first leaves the second a log line.
   =================================================================== */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argOf = (n) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : null; };
const has = (n) => process.argv.includes(`--${n}`);
const BASE = argOf('base');
if (!BASE) { console.error('verify-bloom-leaf-bytes: --base <worktree> is required'); process.exit(2); }
const MATRIX = argOf('matrix') || 'live';
const EXPECT = argOf('expect');
const CONTROL = has('control'), CONTROL_ONLY = has('control-only');
const CHANGE = argOf('change') || 'leaves';
if (!['leaves', 'tipShape'].includes(CHANGE)) { console.error(`verify-bloom-leaf-bytes: --change must be leaves or tipShape, not ${CHANGE}`); process.exit(2); }

const A = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const B = await import(pathToFileURL(path.join(BASE, 'bloom-geometry.js')).href);
const RA = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const RB = await import(pathToFileURL(path.join(BASE, 'bloom-registry.js')).href);
const HA = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-harness.mjs')).href);

const rows = MATRIX === 'live' ? HA.buildMatrix() : HA.FROZEN_MATRICES[MATRIX]();
/* THE ROW'S VALUES ARE STRINGS and the geometry's guards are truthiness tests
   on numbers — `!state.leafLength` with '0' is FALSE, because a non-empty
   string is truthy. The page never hits it (readUI hands back numbers); a Node
   tool that skips the coercion builds a leaf on a row whose length is zero,
   which is exactly what this tool's own one-sided guard caught on its first
   real run. The same coercion `verify-bloom-seam-bytes.mjs` uses. */
const stateOf = (row, D) => {
  const st = { ...D };
  for (const { id, value } of (row.set || [])) {
    if (!(id in D)) { st[id] = value; continue; }
    const d = D[id];
    st[id] = typeof d === 'number' ? Number(value)
           : typeof d === 'boolean' ? (value === true || value === 'true') : value;
  }
  return st;
};

/* THE PREDECLARATION — the BUILDER's own record, asked before any comparison. */
let plansWithTip = 0;
function movesByRecord(row) {
  for (const mode of [false, true]) {
    const st = stateOf(row, RA.DEFAULTS);
    const acc = new A.MeshBuilder({ exportMode: mode });
    const fr = A.footRing(st, acc);
    const plan = A.stemPlan(st, fr.hub, acc);
    const lp = A.leafPlan(st, plan, acc);
    if (CHANGE === 'leaves') { if (lp.present) return true; continue; }
    /* tipShape: the BUILDER's own record of the exponent the blade was built
       from, against the geometry's own default. A plan with no such field is a
       tree without the control, which can move nothing — counted, so a run
       over such a tree says so rather than reading as a partition. */
    if (lp.present && lp.tipShape !== undefined) { if (mode) plansWithTip++; if (lp.tipShape !== A.LEAF_TIP_SHAPE) return true; }
  }
  return false;
}
function build(mod, D, row, mode, leafless = false) {
  const st = stateOf(row, D);
  if (leafless) st.leafLength = 0;
  const acc = new mod.MeshBuilder({ exportMode: mode });
  mod.buildBloomInto(acc, st);
  return acc.positions;
}
const isPrefix = (pre, full) => { if (pre.length > full.length) return false; for (let i = 0; i < pre.length; i++) if (!Object.is(pre[i], full[i])) return false; return true; };

let movers = 0, holders = 0, failedMove = 0, movedHold = 0, c2 = 0, floats = 0, skipped = 0, oneSided = 0;
const notes = [];
for (const row of rows) {
  const shouldMove = movesByRecord(row);
  if (shouldMove) movers++; else holders++;
  for (const mode of [false, true]) {
    /* A ROW THE NODE BUILD PATH CANNOT CONSTRUCT CARRIES NO INFORMATION ABOUT
       THE PARTITION — but only once it is established to throw on BOTH trees.
       54 rows do, identically, on main as on this branch: this tool drives
       `buildBloomInto` directly and does not apply a row's `capability` hook,
       which is the page's to apply, so a cleft row (and the states that reach
       the same trim path) has no panel covering u = 0. Pre-existing, excluded
       and COUNTED — never silently skipped, and a row that throws on the
       BRANCH ALONE is a real failure and is reported as one. */
    let pa, pb, threwA = null, threwB = null;
    try { pa = build(A, RA.DEFAULTS, row, mode); } catch (e) { threwA = e.message; }
    try { pb = build(B, RB.DEFAULTS, row, mode); } catch (e) { threwB = e.message; }
    if (threwA || threwB) {
      if (threwA && threwB) { skipped++; continue; }
      notes.push(`${row.label} [${mode ? 'export' : 'live'}]: built on ${threwA ? 'the BASE but THREW on the BRANCH' : 'the BRANCH but THREW on the BASE'} — ${threwA || threwB}`);
      oneSided++; continue;
    }
    floats += pb.length;
    /* THE CONTROLS. Each perturbs ONE float and each must fire ONE clause. */
    if (CONTROL && !shouldMove && pa.length) pa = Object.assign([...pa], { 0: pa[0] + 1e-9 });
    if (CONTROL_ONLY && shouldMove && pb.length) pa = Object.assign([...pa], { 0: pa[0] + 1e-9 });
    /* CLAUSE 1 — the partition. */
    let differs = pa.length !== pb.length;
    if (!differs) for (let i = 0; i < pa.length; i++) if (!Object.is(pa[i], pb[i])) { differs = true; break; }
    if (shouldMove && !differs) { failedMove++; notes.push(`${row.label} [${mode ? 'export' : 'live'}]: predeclared a MOVER and did not move`); }
    if (!shouldMove && differs) { movedHold++; notes.push(`${row.label} [${mode ? 'export' : 'live'}]: predeclared a HOLDER and MOVED`); }
    /* CLAUSE 2 — purely additive, on movers only. */
    if (shouldMove && CHANGE === 'leaves') {
      let bad = pa.length < pb.length;
      if (!bad) for (let i = 0; i < pb.length; i++) if (!Object.is(pa[i], pb[i])) { bad = true; break; }
      if (bad) { c2++; notes.push(`${row.label} [${mode ? 'export' : 'live'}]: the base's stream is NOT a prefix of the branch's — something other than the leaves moved`); }
    }
    if (shouldMove && CHANGE === 'tipShape') {
      /* Everything that is not a leaf is identical across the trees, and on
         each tree the leaves are the tail: so every float that differs is a
         leaf's. `--control-only` has already perturbed pa[0], which is inside
         the leafless prefix, and this is what reports it. */
      const la = build(A, RA.DEFAULTS, row, mode, true), lb = build(B, RB.DEFAULTS, row, mode, true);
      let same = la.length === lb.length;
      if (same) for (let i = 0; i < la.length; i++) if (!Object.is(la[i], lb[i])) { same = false; break; }
      const bad = !same || !isPrefix(la, pa) || !isPrefix(lb, pb);
      if (bad) { c2++; notes.push(`${row.label} [${mode ? 'export' : 'live'}]: with the leaves removed the two trees ${same ? 'agree' : 'DIFFER'}, and the leafless stream is ${isPrefix(la, pa) && isPrefix(lb, pb) ? '' : 'NOT '}a prefix of the full one — something other than the leaves' own floats moved`); }
    }
  }
}
const ok = !failedMove && !movedHold && !c2 && !oneSided;
console.log(`\nleaf bytes — matrix ${MATRIX}, ${rows.length} rows x 2 modes, ${floats.toLocaleString('en-US')} base floats, Object.is`);
console.log(`  change: ${CHANGE} · predeclared from the BUILDER's record: ${movers} MOVERS / ${holders} HOLDERS${CHANGE === 'tipShape' ? ` (${plansWithTip} plans carry a tip exponent at all)` : ''}`);
console.log(`  clause 1  movers that failed to move: ${failedMove} · holders that moved: ${movedHold}`);
console.log(`  clause 2  movers where anything but the leaves ${CHANGE === 'tipShape' ? "' own floats" : ''} moved: ${c2}`);
console.log(`  excluded  ${skipped} row-mode build(s) threw IDENTICALLY on both trees — pre-existing, this tool applies no capability hook`);
if (oneSided) console.log(`  ONE-SIDED ${oneSided} row-mode build(s) threw on one tree and not the other — a real regression`);
for (const n of notes.slice(0, 12)) console.log(`    - ${n}`);
if (notes.length > 12) console.log(`    … and ${notes.length - 12} more`);
if (EXPECT) {
  const [m, h] = EXPECT.split('/').map(Number);
  if (m !== movers || h !== holders) { console.log(`\nFAIL — expected ${m}/${h}, measured ${movers}/${holders}`); process.exit(1); }
  console.log(`  the predeclared ${m}/${h} is what was measured`);
}
if (CONTROL || CONTROL_ONLY) {
  const fired = CONTROL ? movedHold : c2;
  const clause = CONTROL ? 1 : 2;
  console.log(fired ? `\nCONTROL OK — clause ${clause} reported ${fired} finding(s); it can fail.` : `\nCONTROL FAILED — clause ${clause} stayed silent under a perturbation.`);
  process.exit(fired ? 0 : 1);
}
console.log(ok ? '\nPASS' : '\nFAIL');
process.exit(ok ? 0 : 1);
