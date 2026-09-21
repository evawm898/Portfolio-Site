/* ===================================================================
   verify-bloom-sepal-bytes.mjs — THE SEPAL WHORL'S BYTE PARTITION (part 1).

     node tools/verify-bloom-sepal-bytes.mjs --base <worktree> [--control]
          [--control-only] [--matrix live|phaseNN] [--expect M/H]
          [--only <label regex>]

   THE PARTITION IS PREDECLARED FROM THE BUILDER'S OWN RECORD, never from the
   control set: a row MOVES iff `footRing(...)` comes back with a `sepals`
   descriptor — the whorl is actually placed (a count of at least one, on a
   head that is not a SPHERE) — and HOLDS otherwise. Session 38's lesson is
   why: a row that sweeps every control is a mover of any control a feature
   adds, and `sepalCount` is SWEEPABLE (its sub-controls are not — they are
   hidden at DEFAULTS, the CURL_SUBS shape), so `ALL MAX` carries 40 sepals at
   the shipped sub-control defaults and is a mover here. The tool measures
   that rather than assuming it.

   TWO CLAUSES, AND THE SECOND IS THE ONE THIS FEATURE IS ABOUT.
     1. Every predeclared MOVER moves and every predeclared HOLDER holds,
        float for float under `Object.is`, in BOTH modes. The holders are the
        proof that `sepalCount` 0 is inert everywhere — every frozen row, every
        live row without a whorl, bit-identical to the base tree — which is
        the "stemLength 0" construction the brief asked for.
     2. ON EVERY MOVER THE WHORL IS PURELY ADDITIVE: the base tree's entire
        float stream is a PREFIX of the branch's, and everything after it is
        the sepals' own triangles and nothing else. The sepals are emitted LAST
        (after the stem and the leaves), so a sepal that perturbed the hub, a
        petal, the stem or a leaf would pass clause 1 (the row is a declared
        mover, so it is ALLOWED to differ) and fail only here. The tail's
        length is checked against the builder's own tally (`sepals.tris`).

   BOTH CLAUSES ARE SHOWN ABLE TO FAIL, and they need two different controls —
   this repo's recorded lesson. `--control` perturbs a HOLDER and fires clause
   1; `--control-only` perturbs the FIRST float of a MOVER's shared prefix and
   fires clause 2 while clause 1 stays clean. A control that fires only the
   first leaves the second a log line.
   =================================================================== */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argOf = (n) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : null; };
const has = (n) => process.argv.includes(`--${n}`);
const BASE = argOf('base');
if (!BASE) { console.error('verify-bloom-sepal-bytes: --base <worktree> is required'); process.exit(2); }
const MATRIX = argOf('matrix') || 'live';
const EXPECT = argOf('expect');
const CONTROL = has('control'), CONTROL_ONLY = has('control-only');

const A = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const B = await import(pathToFileURL(path.join(BASE, 'bloom-geometry.js')).href);
const RA = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const RB = await import(pathToFileURL(path.join(BASE, 'bloom-registry.js')).href);
const HA = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-harness.mjs')).href);

const ONLY = argOf('only') ? new RegExp(argOf('only')) : null;
const rows = (MATRIX === 'live' ? HA.buildMatrix() : HA.FROZEN_MATRICES[MATRIX]()).filter((r) => !ONLY || ONLY.test(r.label));
/* THE ROW'S VALUES ARE STRINGS and the geometry's guards are truthiness tests
   on numbers — coerced against each tree's own DEFAULTS, the seam tool's rule. */
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

/* THE PREDECLARATION — footRing's own record, asked before any comparison,
   in both modes (the descriptor is mode-free by construction; asking both is
   what proves it rather than assumes it). */
function movesByRecord(row) {
  let live = null, exp = null;
  for (const mode of [false, true]) {
    const st = stateOf(row, RA.DEFAULTS);
    const acc = new A.MeshBuilder({ exportMode: mode });
    const fr = A.footRing(st, acc);
    if (mode) exp = !!fr.sepals; else live = !!fr.sepals;
  }
  if (live !== exp) throw new Error(`${row.label}: footRing places sepals in one mode and not the other — the whorl's EXISTENCE is topology and may not depend on the mode`);
  return live;
}
function build(mod, D, row, mode) {
  const st = stateOf(row, D);
  const acc = new mod.MeshBuilder({ exportMode: mode });
  const built = mod.buildBloomInto(acc, st);
  return { pos: acc.positions, sepalTris: built.sepals ? built.sepals.tris : 0 };
}

let movers = 0, holders = 0, failedMove = 0, movedHold = 0, c2 = 0, floats = 0, skipped = 0, oneSided = 0, tailFloats = 0;
const notes = [];
const moverLabels = [];
for (const row of rows) {
  const shouldMove = movesByRecord(row);
  if (shouldMove) { movers++; moverLabels.push(row.label); } else holders++;
  for (const mode of [false, true]) {
    /* A ROW THE NODE BUILD PATH CANNOT CONSTRUCT CARRIES NO INFORMATION — but
       only once it is established to throw on BOTH trees (this tool applies no
       capability hook, so the cleft rows throw identically on both, as they do
       for every byte tool here). A row that throws on ONE tree is a regression. */
    let ra, rb, threwA = null, threwB = null;
    try { ra = build(A, RA.DEFAULTS, row, mode); } catch (e) { threwA = e.message; }
    try { rb = build(B, RB.DEFAULTS, row, mode); } catch (e) { threwB = e.message; }
    if (threwA || threwB) {
      if (threwA && threwB) { skipped++; continue; }
      notes.push(`${row.label} [${mode ? 'export' : 'live'}]: built on ${threwA ? 'the BASE but THREW on the BRANCH' : 'the BRANCH but THREW on the BASE'} — ${threwA || threwB}`);
      oneSided++; continue;
    }
    let pa = ra.pos; const pb = rb.pos;
    floats += pb.length;
    if (CONTROL && !shouldMove && pa.length) pa = Object.assign([...pa], { 0: pa[0] + 1e-9 });
    if (CONTROL_ONLY && shouldMove && pb.length) pa = Object.assign([...pa], { 0: pa[0] + 1e-9 });
    /* CLAUSE 1 — the partition. */
    let differs = pa.length !== pb.length;
    if (!differs) for (let i = 0; i < pa.length; i++) if (!Object.is(pa[i], pb[i])) { differs = true; break; }
    if (shouldMove && !differs) { failedMove++; notes.push(`${row.label} [${mode ? 'export' : 'live'}]: predeclared a MOVER and did not move`); }
    if (!shouldMove && differs) { movedHold++; notes.push(`${row.label} [${mode ? 'export' : 'live'}]: predeclared a HOLDER and MOVED`); }
    /* CLAUSE 2 — purely additive, on movers only: the base is a prefix and
       the tail is exactly the builder's own sepal tally. */
    if (shouldMove) {
      let bad = pa.length < pb.length;
      if (!bad) for (let i = 0; i < pb.length; i++) if (!Object.is(pa[i], pb[i])) { bad = true; break; }
      const tail = pa.length - pb.length;
      tailFloats += Math.max(0, tail);
      if (bad) { c2++; notes.push(`${row.label} [${mode ? 'export' : 'live'}]: the base's stream is NOT a prefix of the branch's — something other than the sepals moved`); }
      else if (tail !== ra.sepalTris * 9) { c2++; notes.push(`${row.label} [${mode ? 'export' : 'live'}]: the tail is ${tail / 9} triangles where the builder tallies ${ra.sepalTris} sepal triangles — the tail is not the sepals alone`); }
    }
  }
}
const ok = !failedMove && !movedHold && !c2 && !oneSided;
console.log(`\nsepal bytes — matrix ${MATRIX}, ${rows.length} rows x 2 modes, ${floats.toLocaleString('en-US')} base floats, Object.is`);
console.log(`  predeclared from footRing's record (a sepals descriptor exists): ${movers} MOVERS / ${holders} HOLDERS`);
console.log(`  clause 1  movers that failed to move: ${failedMove} · holders that moved: ${movedHold}`);
console.log(`  clause 2  movers where anything but the sepals' own tail moved: ${c2} (${tailFloats.toLocaleString('en-US')} sepal floats appended over the movers)`);
console.log(`  excluded  ${skipped} row-mode build(s) threw IDENTICALLY on both trees — pre-existing, this tool applies no capability hook`);
if (oneSided) console.log(`  ONE-SIDED ${oneSided} row-mode build(s) threw on one tree and not the other — a real regression`);
const nonBlock = moverLabels.filter((l) => !l.startsWith('SEPALS: '));
if (movers) console.log(`  movers outside block 35: ${nonBlock.length ? nonBlock.map((l) => `"${l}"`).join(', ') : 'none'}`);
for (const n of notes.slice(0, 12)) console.log(`    - ${n}`);
if (notes.length > 12) console.log(`    … and ${notes.length - 12} more`);
if (EXPECT) {
  const [m, h] = EXPECT.split('/').map(Number);
  if (m !== movers || h !== holders) { console.log(`\nFAIL — expected ${m}/${h}, measured ${movers}/${holders}`); process.exit(1); }
  console.log(`  the predeclared ${m}/${h} is what was measured`);
}
if (CONTROL || CONTROL_ONLY) {
  if (CONTROL_ONLY && !movers) { console.log('\nCONTROL VACUOUS — no mover in this row set, so clause 2 had nothing to fire on'); process.exit(1); }
  const fired = CONTROL ? movedHold : c2;
  const clause = CONTROL ? 1 : 2;
  console.log(fired ? `\nCONTROL OK — clause ${clause} reported ${fired} finding(s); it can fail.` : `\nCONTROL FAILED — clause ${clause} stayed silent under a perturbation.`);
  process.exit(fired ? 0 : 1);
}
console.log(ok ? '\nPASS' : '\nFAIL');
process.exit(ok ? 0 : 1);
