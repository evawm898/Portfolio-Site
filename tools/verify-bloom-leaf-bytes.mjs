/* ===================================================================
   verify-bloom-leaf-bytes.mjs — THE LEAF FEATURE'S BYTE PARTITION.

     node tools/verify-bloom-leaf-bytes.mjs --base <worktree> [--control]
          [--control-only] [--matrix live|phaseNN] [--expect M/H]
          [--change leaves|tipShape|emitter] [--only <label regex>]
          [--shard k/n]

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

   `--change emitter` (leaf/stem build S2 — the leaf blade through
   `emitPanel`, the arch and cup controls, the tooth floor) IS A DECLARED
   PARTITION EVENT, and its movers are predeclared from the BASE TREE's own
   builder record (Eva's ruling, Oct 6): a row moves iff the BASE build emits a
   leaf in either mode (`leavesBuilt.length > 0`), and holds otherwise. Every
   shipped leaf's bytes change — the bead replaces the flat wall and the
   columns go 11 -> NV — so clause 1 is the partition and clause 2 becomes:
   EVERYTHING OUTSIDE THE LEAF BLOCK IS IDENTICAL, float for float (the base's
   leaf block starts where the branch's own `leafTriRange` says and spans the
   base's own leaf triangle tally; the prefix before it and the suffix after
   it must agree exactly). Two more clauses, both about what the ruling said
   the change is:
     3. THE MID-SURFACE LAW DID NOT MOVE where the tooth floor does not bind
        (evaluated on the BASE's own plan, so the law and the seating are two
        questions; 3b is the seating — every placing field of the plan is the
        base's exactly, except on a row the base's own record calls a SHARED
        NODE, whose offset reads the emitted blade's reach and so moves with
        the bead, declared and reported with its worst depth change):
        every skin vertex the BASE emitted at its own 11-column lattice is
        reproduced EXACTLY by the branch's `leafSurface` at the same (u, v)
        offset +/- t/2 along its normal — "at defaults only the edge changes",
        as an identity. A row is EXEMPT iff the BASE's own profile record
        says the floor binds there (a margin sinus whose relief is under
        `MIN_FEATURE_MM`) — read off `widthProfile` called exactly as the
        base builder calls it, so the exemption is the base's, not this
        tree's. Exempt rows are counted and named.
     4. THE /plot GRID EXPORT DID NOT MOVE (the mechanical guard the brief
        names): `buildGridGltf` over each tree's own captured build, with the
        SAME recorded state handed to both (the branch's registry has two new
        controls, which is panel state and not geometry), byte for byte.
   With `--matrix live` the rows the BASE matrix does not hold are ADDED (the
   new block), counted and skipped — they have no base to partition against;
   the base's rows must be the live matrix's leading rows, deep-equal, or the
   run refuses.

   EVERY CLAUSE IS SHOWN ABLE TO FAIL. `--control-surface` (emitter) moves one
   queried surface vertex by 1e-9 mm and clause 3 must report it;
   `--control-grid` flips one bit of the branch's grid file and clause 4 must.
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
const CONTROL_SURF = has('control-surface'), CONTROL_GRID = has('control-grid');
const CHANGE = argOf('change') || 'leaves';
if (!['leaves', 'tipShape', 'emitter'].includes(CHANGE)) { console.error(`verify-bloom-leaf-bytes: --change must be leaves, tipShape or emitter, not ${CHANGE}`); process.exit(2); }
const SHARD = argOf('shard') ? argOf('shard').split('/').map(Number) : null;

const A = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const B = await import(pathToFileURL(path.join(BASE, 'bloom-geometry.js')).href);
const RA = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const RB = await import(pathToFileURL(path.join(BASE, 'bloom-registry.js')).href);
const HA = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-harness.mjs')).href);

const ONLY = argOf('only') ? new RegExp(argOf('only')) : null;
/* `--only <regex>` filters rows by LABEL, for the CONTROLS and for debugging a
   tool on two rows — never for a partition claim, which is over the matrix. */
let rows = (MATRIX === 'live' ? HA.buildMatrix() : HA.FROZEN_MATRICES[MATRIX]()).filter((r) => !ONLY || ONLY.test(r.label));
/* THE ADDED ROWS (emitter, live): the base matrix's rows must lead the live
   matrix exactly; whatever follows is new and has no base to compare with. */
let added = 0;
if (CHANGE === 'emitter' && MATRIX === 'live') {
  const HB = await import(pathToFileURL(path.join(BASE, 'tools/bloom-harness.mjs')).href);
  const baseRows = HB.buildMatrix(), live = HA.buildMatrix();
  for (let i = 0; i < baseRows.length; i++) {
    if (JSON.stringify(baseRows[i]) !== JSON.stringify(live[i])) { console.error(`verify-bloom-leaf-bytes: base row ${i} (${baseRows[i].label}) is not the live matrix's row ${i} — the base's rows must lead the live matrix`); process.exit(2); }
  }
  const baseSet = new Set(baseRows.map((r) => JSON.stringify(r)));
  const before = rows.length;
  rows = rows.filter((r) => baseSet.has(JSON.stringify(r)));
  added = before - rows.length;
}
if (SHARD) { const [k, n] = SHARD; rows = rows.filter((_, i) => i % n === k); }
const GA = CHANGE === 'emitter' ? await import(pathToFileURL(path.join(ROOT, 'bloom-grid-gltf.js')).href) : null;
const GB = CHANGE === 'emitter' ? await import(pathToFileURL(path.join(BASE, 'bloom-grid-gltf.js')).href) : null;
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
/* The emitter change's builds keep the builder's record beside the stream. */
function buildRec(mod, D, row, mode) {
  const st = stateOf(row, D);
  const acc = new mod.MeshBuilder({ exportMode: mode });
  const built = mod.buildBloomInto(acc, st);
  return { st, acc, P: acc.positions, built };
}
/* THE BASE'S OWN WORD ON WHETHER THE TOOTH FLOOR BINDS on a row: its profile
   called exactly as the base builder calls it, per built leaf length, and the
   floor binds iff a MARGIN sinus's relief is under the minimum feature (the
   even-count face notch, which sits on the terminal face at zero relief by
   construction, is not a margin sinus — the floor exempts it too). */
function baseFloorBinds(rec) {
  const L = rec.built.leaf;
  if (!L || !L.present) return false;
  const lengths = L.nodeLengthsMm ? L.nodeLengthsMm.filter((x) => x > 0) : [L.lengthMm];
  for (const Lmm of new Set(lengths)) {
    const st = L.nodeLengthsMm ? { ...rec.st, leafLength: Lmm } : rec.st;
    const prof = B.widthProfile(B.leafBladeState(st), { width: 0, thickness: rec.st.sheetThickness }, L.widthMm / 2, { petiole: true, rowCapacity: B.LEAF_BLADE_ROWS }, new B.MeshBuilder({ exportMode: rec.acc.exportMode }), Lmm);
    const lb = prof.lobes;
    if (!lb || lb.noRoom) continue;
    const face = lb.apexIsCrest ? -1 : (lb.periods - 1) / 2;
    if (lb.reliefMm.some((r, k) => k !== face && r < A.MIN_FEATURE_MM)) return true;
  }
  return false;
}
/* CLAUSE 3's measurement: how many of the base's own leaf-block vertices the
   branch's surface reproduces at the base's 11-column lattice. */
/* THE SURFACE LAW IS EVALUATED ON THE BASE'S OWN PLAN — its seating, its
   node depths, its lengths — so clause 3 asks about the LAW and nothing else.
   Where the seating itself moved (a raceme's shared node, whose offset reads
   the emitted blade's own reach, which the bead changes) clause 3b says so
   separately. */
function surfaceMatches(recA, recB, leafStart) {
  const PB = recB.P, n = 9 * recB.built.leavesBuilt.reduce((m, l) => m + l.tris, 0);
  const have = new Set();
  for (let i = leafStart * 9; i < leafStart * 9 + n; i += 3) have.add(`${PB[i]},${PB[i + 1]},${PB[i + 2]}`);
  const L = recB.built.leaf;
  let found = 0, total = 0;
  for (let i = 0; i < L.azimuths.length; i++) {
    if (L.nodeLengthsMm && !(L.nodeLengthsMm[i] > 0)) continue;
    for (const az of L.azimuths[i]) {
      const S = A.leafSurface(new A.MeshBuilder({ exportMode: recA.acc.exportMode }), L, recA.st, i, az);
      for (let r = 0; r <= S.nu; r++) {
        const row = S.rowAt(r / S.nu);
        for (let j = 0; j <= 10; j++) {
          const q = row.sect(-1 + (2 * j) / 10);
          for (const sv of [S.t / 2, -S.t / 2]) {
            total++;
            /* --control-surface moves ONE queried vertex by 1e-9 mm and clause 3 must say so. */
            const nudge = CONTROL_SURF && total === 1 ? 1e-9 : 0;
            if (have.has(`${q.P[0] + q.n[0] * sv + nudge},${q.P[1] + q.n[1] * sv},${q.P[2] + q.n[2] * sv}`)) found++;
          }
        }
      }
    }
  }
  return { found, total };
}
const gridBytes = (G, rec, mode, stateForFile) => {
  const acc = new rec.mod.MeshBuilder({ exportMode: mode, captureGrid: true });
  const built = rec.mod.buildBloomInto(acc, rec.st);
  return G.buildGridGltf(built, { mode: mode ? 'export' : 'live', state: stateForFile });
};
function runEmitter(row) {
  /* THE PREDECLARATION FIRST — the BASE build's own record, both modes. */
  const recB = [], recA = [];
  let threwB = null, threwA = null;
  for (const mode of [false, true]) {
    try { recB.push(buildRec(B, RB.DEFAULTS, row, mode)); } catch (e) { threwB = e.message; }
  }
  const shouldMove = !threwB && recB.some((r) => r.built.leavesBuilt.length > 0);
  for (const mode of [false, true]) {
    try { recA.push(buildRec(A, RA.DEFAULTS, row, mode)); } catch (e) { threwA = e.message; }
  }
  if (threwA || threwB) {
    if (threwA && threwB) { skipped += 2; return; }
    notes.push(`${row.label}: built on ${threwA ? 'the BASE but THREW on the BRANCH' : 'the BRANCH but THREW on the BASE'} — ${threwA || threwB}`);
    oneSided += 2; return;
  }
  if (shouldMove) movers++; else holders++;
  const floorExempt = shouldMove && recB.some((r) => baseFloorBinds(r));
  if (floorExempt) { c3exempt++; exemptLabels.push(row.label); }
  for (const mi of [0, 1]) {
    const mode = mi === 1, b = recB[mi], a = recA[mi], tag = `${row.label} [${mode ? 'export' : 'live'}]`;
    let pa = a.P; const pb = b.P;
    floats += pb.length;
    if (CONTROL && !shouldMove && pa.length) pa = Object.assign([...pa], { 0: pa[0] + 1e-9 });
    if (CONTROL_ONLY && shouldMove && pa.length) pa = Object.assign([...pa], { 0: pa[0] + 1e-9 });
    let differs = pa.length !== pb.length;
    if (!differs) for (let i = 0; i < pa.length; i++) if (!Object.is(pa[i], pb[i])) { differs = true; break; }
    if (shouldMove && !differs) { failedMove++; notes.push(`${tag}: predeclared a MOVER and did not move`); }
    if (!shouldMove && differs) { movedHold++; notes.push(`${tag}: predeclared a HOLDER and MOVED`); }
    if (!shouldMove) continue;
    /* CLAUSE 2 — everything outside the leaf block identical. */
    const [a0, a1] = a.built.leafTriRange;
    const nB = b.built.leavesBuilt.reduce((m, l) => m + l.tris, 0);
    let bad = false;
    for (let i = 0; i < a0 * 9 && !bad; i++) if (!Object.is(pa[i], pb[i])) bad = true;
    const sufA = a1 * 9, sufB = (a0 + nB) * 9;
    if (!bad && pa.length - sufA !== pb.length - sufB) bad = true;
    for (let i = 0; !bad && sufA + i < pa.length; i++) if (!Object.is(pa[sufA + i], pb[sufB + i])) bad = true;
    if (bad) { c2++; notes.push(`${tag}: something OUTSIDE the leaf block moved (prefix [0, ${a0}) or the suffix after the leaves)`); }
    /* CLAUSE 3 — the mid-surface, where the base says the floor does not bind. */
    /* CLAUSE 3b — THE SEATING: every plan field that places a leaf is the
       base's, exactly, except on a row the BASE's own record calls a shared
       node (whose offset reads the emitted blade's reach). */
    {
      const LA = a.built.leaf, LB = b.built.leaf;
      const keys = ['nodeDepthsMm', 'nodeLengthsMm', 'nodePetioleLenMm', 'azimuths', 'nodeOffsets', 'rootR', 'rootZ', 'angleDeg', 'petioleLenMm', 'lengthMm', 'widthMm'];
      const moved = keys.filter((k) => JSON.stringify(LA[k] ?? null) !== JSON.stringify(LB[k] ?? null));
      if (moved.length) {
        if (LB.shared) {
          seatShared.add(row.label);
          const dA = LA.nodeDepthsMm || [], dB = LB.nodeDepthsMm || [];
          for (let i = 0; i < Math.min(dA.length, dB.length); i++) seatWorst = Math.max(seatWorst, Math.abs(dA[i] - dB[i]));
          if (dA.length !== dB.length) seatCountMoved.add(row.label);
        } else { c3b++; notes.push(`${tag}: the leaf seating moved (${moved.join(', ')}) on a row the base does not call a shared node`); }
      }
    }
    const m = surfaceMatches(a, b, a0);
    if (!floorExempt) {
      c3found += m.found; c3total += m.total;
      if (m.found !== m.total) { c3++; notes.push(`${tag}: the branch's surface reproduces ${m.found} of ${m.total} of the base's own skin vertices — the mid-surface moved`); }
    } else if (m.found !== m.total) exemptMoved.add(row.label);
    /* CLAUSE 4 — the /plot grid export, byte for byte. */
    const fileState = b.st;
    const ga = gridBytes(GA, { mod: A, st: a.st }, mode, fileState), gb = gridBytes(GB, { mod: B, st: b.st }, mode, fileState);
    gridRows++;
    /* --control-grid flips one bit of the branch's file and clause 4 must say so. */
    if (CONTROL_GRID) ga[ga.length - 1] ^= 1;
    let gd = ga.length !== gb.length;
    if (!gd) for (let i = 0; i < ga.length; i++) if (ga[i] !== gb[i]) { gd = true; break; }
    if (gd) { c4++; notes.push(`${tag}: the /plot grid export differs (${ga.length} bytes against ${gb.length})`); }
  }
}
const isPrefix = (pre, full) => { if (pre.length > full.length) return false; for (let i = 0; i < pre.length; i++) if (!Object.is(pre[i], full[i])) return false; return true; };

let movers = 0, holders = 0, failedMove = 0, movedHold = 0, c2 = 0, floats = 0, skipped = 0, oneSided = 0;
let c3 = 0, c3found = 0, c3total = 0, c3exempt = 0, c4 = 0, gridRows = 0, c3b = 0, seatWorst = 0;
const seatShared = new Set(), seatCountMoved = new Set();
const notes = [], exemptLabels = [], exemptMoved = new Set();
for (const row of rows) {
  if (CHANGE === 'emitter') { runEmitter(row); continue; }
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
const ok = !failedMove && !movedHold && !c2 && !oneSided && !c3 && !c3b && !c4;
console.log(`\nleaf bytes — matrix ${MATRIX}, ${rows.length} rows x 2 modes, ${floats.toLocaleString('en-US')} base floats, Object.is`);
console.log(`  change: ${CHANGE} · predeclared from the BUILDER's record: ${movers} MOVERS / ${holders} HOLDERS${CHANGE === 'tipShape' ? ` (${plansWithTip} plans carry a tip exponent at all)` : ''}`);
console.log(`  clause 1  movers that failed to move: ${failedMove} · holders that moved: ${movedHold}`);
console.log(`  clause 2  movers where anything but the leaves ${CHANGE === 'tipShape' ? "' own floats" : ''} moved: ${c2}`);
if (CHANGE === 'emitter') {
  console.log(`  clause 3  movers whose mid-surface moved: ${c3} · ${c3found.toLocaleString('en-US')} of ${c3total.toLocaleString('en-US')} base skin vertices reproduced exactly · ${c3exempt} row(s) EXEMPT, the base's own record saying the tooth floor binds there`);
  for (const l of exemptLabels.slice(0, 40)) console.log(`              exempt: ${l}${exemptMoved.has(l) ? ' — its surface DID move (the floor reshaped its teeth)' : ' — its surface did NOT move'}`);
  console.log(`  clause 3b undeclared seating moves: ${c3b} · ${seatShared.size} shared-node row(s) whose seating moved with the blade's reach, worst ${seatWorst.toFixed(6)} mm of node depth${seatCountMoved.size ? `, ${seatCountMoved.size} of them changing how many nodes keep a leaf` : ''}`);
  for (const l of [...seatShared].slice(0, 40)) console.log(`              seating: ${l}${seatCountMoved.has(l) ? ' — the KEPT COUNT moved' : ''}`);
  console.log(`  clause 4  /plot grid exports that moved: ${c4} of ${gridRows} mover row-modes`);
  if (added) console.log(`  added     ${added} live row(s) the base matrix does not hold — no base to partition against, skipped`);
  if (SHARD) console.log(`  shard     ${SHARD[0]}/${SHARD[1]} — a SUBSET; the partition is the union of every shard`);
}
console.log(`  excluded  ${skipped} row-mode build(s) threw IDENTICALLY on both trees — pre-existing, this tool applies no capability hook`);
if (oneSided) console.log(`  ONE-SIDED ${oneSided} row-mode build(s) threw on one tree and not the other — a real regression`);
for (const n of notes.slice(0, 12)) console.log(`    - ${n}`);
if (notes.length > 12) console.log(`    … and ${notes.length - 12} more`);
if (EXPECT) {
  const [m, h] = EXPECT.split('/').map(Number);
  if (m !== movers || h !== holders) { console.log(`\nFAIL — expected ${m}/${h}, measured ${movers}/${holders}`); process.exit(1); }
  console.log(`  the predeclared ${m}/${h} is what was measured`);
}
if (CONTROL || CONTROL_ONLY || CONTROL_SURF || CONTROL_GRID) {
  const fired = CONTROL ? movedHold : CONTROL_ONLY ? c2 : CONTROL_SURF ? c3 : c4;
  const clause = CONTROL ? 1 : CONTROL_ONLY ? 2 : CONTROL_SURF ? 3 : 4;
  console.log(fired ? `\nCONTROL OK — clause ${clause} reported ${fired} finding(s); it can fail.` : `\nCONTROL FAILED — clause ${clause} stayed silent under a perturbation.`);
  process.exit(fired ? 0 : 1);
}
console.log(ok ? '\nPASS' : '\nFAIL');
process.exit(ok ? 0 : 1);
