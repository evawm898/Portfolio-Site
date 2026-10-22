/* ===================================================================
   verify-bloom-surface-bytes.mjs — THE SURFACE EXTRACTION MOVED NOTHING.

     node tools/verify-bloom-surface-bytes.mjs --base <worktree> [--from K] [--rows N] [--only <label regex>] [--control] [--movers <label regex>]

   Session 37 lifted the petal's mid-surface law out of `buildPetalInto`'s row
   loop into `petalSurface()`. The claim is the strongest one available and
   the only one worth making about a refactor: EVERY EMITTED FLOAT IS THE SAME
   FLOAT, IN THE SAME POSITION, ON EVERY ROW OF THE FULL MATRIX IN BOTH MODES.
   Not "equivalent", not "within a tolerance" — `Object.is`, so a one-ULP move
   and a `-0` that became `+0` both fail.

   WHY IT IS ORDER-SENSITIVE AND ITS SIBLING IS NOT. Session 36's
   `verify-bloom-winding-bytes.mjs` matches triangles as unordered vertex sets
   because reversing a winding genuinely reorders the stream. Nothing here is
   allowed to reorder anything, so the comparison is positional: `pa[i]`
   against `pb[i]`. A tool that matched multisets would pass a refactor that
   emitted the same geometry in a different order, and that is a change to the
   export this session is not entitled to make.

   WHAT IT COMPARES, per row, per mode:
     1  THE EXPORT STREAM — `MeshBuilder.positions`, length then every element
        under `Object.is`. This is the artefact.
     2  THE CAPTURED GRID — the same rows built again with `captureGrid`, and
        every `u`, `halfWidth`, `thickness`, `v`, mid-surface point and normal
        compared the same way. The grid is the SECOND consumer of `sect(v)`
        and it carries quantities the STL never sees (the mid-surface itself,
        the per-column normal), so a change that cancelled in the two skins
        would still show here. Session 28's own numbers came from this path.
        IT ALSO CARRIES WHETHER EACH SLOT WAS BUILT AT ALL, because the sphere
        stem's omission mask can leave `built.petals[slot]` NULL — see
        `gridFloatsOf`'s own header for why that is a value and not a skip.

   CAPABILITY ROWS ARE PASSED, and that is deliberate rather than inherited:
   the matrix's CLAW and CLEFT rows are the only ones with a non-rectangular
   `trimPanels` domain and the only ones that build more than one panel, which
   is exactly where a row-loop refactor would bite. `verify-bloom-winding-bytes`
   drops `row.capability`; this does not.

   THE POSITIVE CONTROL is `--control`, and it perturbs BOTH clauses by 1e-9 —
   one coordinate of the export stream and one mid-surface coordinate of the
   captured grid — because a control that only fires clause 1 leaves clause 2
   exactly what this project calls a log line: a computation nobody has shown
   can produce a verdict. The run must report TWO findings, one per clause, and
   fails if it does not. It also REFUSES A VACUOUS PASS — zero rows, zero
   floats, or zero captured panels is a failure and not a silent success.

   WHAT IT DOES NOT PROVE, in its own header:
     - IT SAYS NOTHING ABOUT OFF-STATION BEHAVIOUR. It compares the points the
       MESH samples. That the evaluator is right BETWEEN them is a different
       claim with a different instrument — `verify-bloom-surface-offstation.mjs`.
     - IT IS A NODE-SIDE COMPARISON over the matrix's declared control sets,
       applied raw. It is not read-back-verified through the UI the way the
       STL gates are, so it inherits nothing about whether a row's values are
       REACHABLE; it proves only that both trees, given identical inputs,
       emit identical outputs. That is the whole claim a refactor owes.
     - THE MATRIX IS THE COVERAGE. A state no row visits is not compared.
   =================================================================== */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { tipNeckOf } from './bloom-leaf-tip-neck.mjs';

const argv = process.argv.slice(2);
const argOf = (n) => { const i = argv.indexOf(n); return i < 0 ? null : argv[i + 1]; };
const BASE = argOf('--base');
const LIMIT = +(argOf('--rows') || 0) || Infinity;
const CONTROL = argv.includes('--control');
/* THE PARTITION (session 38, PR 2). A feature that ADDS rows to the matrix
   cannot claim "0 floats moved" over the whole matrix: the base tree does not
   know the new controls, so every row that engages them builds the default on
   the base and the feature here, and differs BY DESIGN. `--movers <regex>`
   names those rows by label, predeclared: every matching row MUST move (at
   least one float, in at least one mode — a mover that holds is a feature that
   did nothing, refused as vacuous), every other row must hold to the bit, and
   the verdict prints both counts. Without it the tool is the session-37 shape:
   every row holds. A generated `<id> min/max` row for a new control whose
   guard is off (the count, coverage and tip shape at depth 0) is a HOLDER and
   must not be named. */
const MOVERS = argOf('--movers') ? new RegExp(argOf('--movers')) : null;
/* `--movers-predicate <name>` — THE PARTITION FROM A GUARD PREDICATE, never
   from a label (#299's port: the stem's nodes). A label regex is a claim ABOUT
   the rows; a predicate on the row's own state is the claim the change makes —
   "a row moves iff its state engages the feature" — and it is evaluated per
   row, on the coerced state, so a row whose label says one thing and whose set
   does another is classified by what it BUILDS. The predicates are declared
   in `PREDICATE_MOVERS` below, each with its reason; an unknown name refuses.
   `--range a:b` compares matrix rows a..b-1 only and `--json <file>` writes the
   run's counters and findings, so a full-matrix partition closes in
   foreground chunks that survive this container (CLAUDE.md: background work
   does not outlive a turn); `--merge f1,f2,...` closes the chunks into one
   verdict and REFUSES a set of chunks that does not tile the matrix. */
const MOVERS_PRED = argOf('--movers-predicate');
const RANGE = argOf('--range');
const JSON_OUT = argOf('--json');
const MERGE = argOf('--merge');
if (MERGE) {
  const fs = await import('node:fs');
  const parts = MERGE.split(',').map((f) => JSON.parse(fs.readFileSync(f, 'utf8'))).sort((a, b) => a.from - b.from);
  const bad = [];
  const total = parts[0].matrixRows;
  let at = 0;
  for (const p of parts) {
    if (p.matrixRows !== total) bad.push(`chunk ${p.from}:${p.to} was taken over a ${p.matrixRows}-row matrix, not ${total}`);
    if (p.from !== at) bad.push(`the chunks do not tile the matrix: expected a chunk from row ${at}, got ${p.from}`);
    at = p.to;
    if (p.predicate !== parts[0].predicate || p.base !== parts[0].base) bad.push(`chunk ${p.from}:${p.to} ran a different predicate or base`);
  }
  if (at !== total) bad.push(`the chunks end at row ${at} of ${total}`);
  /* EACH CHUNK MUST HAVE COMPARED WHAT IT CLAIMS (the review's finding: a chunk's
     JSON is written before its own vacuity checks, and the merge tiled the
     ranges without asking whether the rows inside them were compared — so a
     chunk taken with `--rows 1`, or with an `--only` left over from iteration,
     closed "all N rows" having compared one or none). A chunk that SELECTED
     rows (`--only` / `--rows`, recorded since this check exists) makes the
     merge a SUBSET, said so in the verdict; one that did not must have done
     every row of its range. A chunk written before the fields existed is
     held to the full-range rule. */
  const selected = (p) => [p.only, p.limit, p.skip].some((x) => x !== undefined && x !== null);
  const subset = parts.some(selected);
  if (subset && !parts.every((p) => selected(p) && p.only === parts[0].only && p.limit === parts[0].limit && p.skip === parts[0].skip)) bad.push('the chunks selected rows differently (--only / --rows / --from) — a merge mixes one selection or none');
  for (const p of parts) {
    if (!selected(p) && p.rowsDone !== p.to - p.from) bad.push(`chunk ${p.from}:${p.to} compared ${p.rowsDone} of its ${p.to - p.from} rows`);
    if (p.rowsDone && (!p.floats || !p.gridFloats || !p.panels)) bad.push(`chunk ${p.from}:${p.to} did ${p.rowsDone} rows and compared ${p.floats} floats / ${p.gridFloats} grid values over ${p.panels} panels — a vacuous chunk`);
  }
  const sum = (k) => parts.reduce((n, p) => n + p[k], 0);
  if (!sum('rowsDone') || !sum('floats') || !sum('gridFloats')) bad.push(`VACUOUS: the chunks compared ${sum('rowsDone')} rows, ${sum('floats')} floats, ${sum('gridFloats')} grid values`);
  const fails = [...bad, ...parts.flatMap((p) => p.fails)];
  console.log(`MERGED ${parts.length} chunks over ${total} rows x 2 modes, predicate ${parts[0].predicate}, base ${parts[0].base}${subset ? ` — a SUBSET: ${sum('rowsDone')} rows selected by ${parts[0].only ? `--only ${parts[0].only}` : ''}${parts[0].limit ? ` --rows ${parts[0].limit}` : ''}` : ''}`);
  console.log(`partition     : ${sum('moversMoved')} of ${sum('moversSeen')} predeclared movers MOVED (every one must), ${sum('holdersSeen')} holders compared to the bit`);
  console.log(`export stream : ${sum('floats').toLocaleString()} floats over ${sum('tris').toLocaleString()} triangles`);
  console.log(`captured grid : ${sum('gridFloats').toLocaleString()} values over ${sum('panels').toLocaleString()} panels (live)`);
  /* A MERGE WITH NO PARTITION DECLARED is the all-hold claim (Scoping-b: the
     toggles OFF must move nothing anywhere), and "no mover" is then the claim
     rather than a vacuity; with a partition declared it still refuses. */
  if (!sum('moversSeen') && parts[0].predicate) fails.push('VACUOUS: no mover in the matrix');
  if (fails.length) { console.log(`\nFAIL — ${fails.length} finding(s):`); for (const f of fails.slice(0, 60)) console.log('  ' + f); process.exit(1); }
  const scope = subset ? `the ${sum('rowsDone')} SELECTED rows (a subset, not the matrix)` : `all ${sum('holdersSeen')} rows`;
  console.log(parts[0].predicate ? `\nPASS — 0 floats moved on the ${sum('holdersSeen')} holders${subset ? ' of a SUBSET' : ''}, positionally, under Object.is; all ${sum('moversSeen')} predeclared movers moved.` : `\nPASS — 0 floats moved on ${scope} x 2 modes, positionally, under Object.is (no partition declared: every row holds).`);
  process.exit(0);
}
if (!BASE || !existsSync(path.join(BASE, 'bloom-geometry.js'))) {
  console.error('usage: node tools/verify-bloom-surface-bytes.mjs --base <worktree of the base commit> [--rows N] [--control] [--movers <label regex>]');
  process.exit(2);
}
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const load = (dir, f) => import(pathToFileURL(path.join(dir, f)).href);
const [mine, base, harness, baseReg] = await Promise.all([
  load(ROOT, 'bloom-geometry.js'), load(BASE, 'bloom-geometry.js'), load(ROOT, 'tools/bloom-harness.mjs'), load(BASE, 'bloom-registry.js'),
]);
/* THE BASE TREE IS HANDED THE CHOICE VALUES IT KNOWS (the braid session). A
   choice value the base registry does not list (BRAIDED, on a tree whose coil
   is NONE / INDEPENDENT) is one the base page cannot hold — its select has no
   such option and a design file naming it is refused and keeps the control's
   own default — so the base build of that row is the row with that control at
   the BASE's default. Every row whose choices the base already knows is
   handed the very same state, so a holder's two builds are the same call on
   the same input (the `baseScopes` rule below, for choices). */
const BASE_CHOICES = new Map((baseReg.CONTROLS || []).filter((c) => Array.isArray(c.options)).map((c) => [c.id, { values: new Set(c.options.map((o) => o.value)), def: c.default }]));
function baseState(st) {
  let out = st;
  for (const [id, c] of BASE_CHOICES) if (id in st && !c.values.has(st[id])) { if (out === st) out = { ...st }; out[id] = c.def; }
  return out;
}

/* The row -> state map, read from the harness's own CONTROLS so a row's value
   is coerced by the control's declared kind rather than by a guess here. */
const kindOf = new Map(harness.CONTROLS.map((c) => [c.id, c]));
function stateOf(row) {
  const s = { ...harness.DEFAULTS };
  for (const w of row.set || []) {
    /* THE RESERVED `@scopes` ENTRY (the role retirement) is not a control: the
       row's scopes ride to the build through `rowScopesForBuild` below, never
       into the state. (Patched F6-sym: CLAUDE.md names this tool among those
       that refused or dropped a scoped row.) */
    if (w.id === harness.SCOPES_SET_ID) continue;
    const c = kindOf.get(w.id); if (!c) throw new Error(`${row.label}: no control ${w.id}`);
    s[w.id] = c.kind === 'slider' ? Number(w.value) : c.kind === 'check' ? (w.value === true || w.value === 'true') : w.value;
  }
  return s;
}

const ONLY = argOf('--only') ? new RegExp(argOf('--only')) : null;
const MATRIX = harness.buildMatrix();
/* THE ROW-DEFINITION GUARD (big petals, Oct 21 — `verify-bloom-seam-bytes`'s
   ROW_DEF_MOVED_BY_CHANGE, ported). This tool builds BOTH trees from THIS
   tree's rows, so a row whose definition moved between the trees is compared
   on one state and the redefinition itself is invisible to the partition.
   For a predicate that declares redefinitions, the BASE tree's own matrix is
   loaded and compared row by row (label, set, capability): an undeclared
   difference REFUSES, a declared one that did not happen REFUSES, and rows
   past the base's length are the declared ADDED count. Keyed on THIS tree's
   label. */
const ROW_DEF_MOVED_BY_PRED = {
  'root-support': {
    added: 21,
    rows: {
      "BIG PETALS: 100 mm x 8 sepals (each sepal its own 60 mm root — root support lifted the pin)": "relabelled, the same set: the base row's label said the sepals were pinned off, which root support lifts",
    },
  },
  'root-taper': {
    added: 28,
    rows: {
      'petalLength max (100)': "block 1 sweeps every SWEEPABLE slider to its own max; the base calls it `petalLength max (60)`",
      'petalWidth max (46)': "the same row for the width range (Eva's ruling 2); the base calls it `petalWidth max (30)`",
      'ALL MAX': 'one label, two states — it carries every slider max, so both ranges move it',
    },
  },
};
if (MOVERS_PRED && ROW_DEF_MOVED_BY_PRED[MOVERS_PRED] && !MERGE) {
  const decl = ROW_DEF_MOVED_BY_PRED[MOVERS_PRED];
  const baseHarness = await load(BASE, 'tools/bloom-harness.mjs');
  const rowsB = baseHarness.buildMatrix();
  const sigOf = (r) => JSON.stringify([r.label, (r.set || []).map((w) => [w.id, String(w.value)]), r.capability || null]);
  const why = [], seen = new Set();
  if (MATRIX.length - rowsB.length !== decl.added) why.push(`the matrix grew by ${MATRIX.length - rowsB.length} rows, declared ${decl.added}`);
  for (let i = 0; i < Math.min(rowsB.length, MATRIX.length); i++) {
    if (sigOf(MATRIX[i]) === sigOf(rowsB[i])) continue;
    if (MATRIX[i].label in decl.rows) seen.add(MATRIX[i].label);
    else why.push(`UNDECLARED ROW REDEFINITION at row ${i}: "${rowsB[i].label}" on the base is "${MATRIX[i].label}" here (or carries a different set)`);
  }
  for (const l of Object.keys(decl.rows)) if (!seen.has(l)) why.push(`DECLARED REDEFINITION THAT DID NOT HAPPEN: "${l}" is identical on both trees or absent`);
  if (why.length) { console.error(`REFUSED (row definitions): ${why.join('; ')}`); process.exit(1); }
  console.log(`row defs      : ${seen.size} declared redefinitions confirmed against the base matrix (${[...seen].join(' · ')}); ${decl.added} rows added`);
}
const [RFROM, RTO] = RANGE ? RANGE.split(':').map(Number) : [0, MATRIX.length];
/* `--from K` starts at the K-th selected row (0-based), so a full-matrix run
   can be closed out in foreground chunks of `--from K --rows N` without a
   label regex that might miss a row. The union of the chunks is the matrix.
   `--range a:b` is the same idea by MATRIX index, and composes with it. */
const FROM = +(argOf('--from') || 0) || 0;
const rows = MATRIX.slice(RFROM, RTO).filter((r) => !ONLY || ONLY.test(r.label)).slice(FROM, FROM + LIMIT);
/* THE PREDICATES. Each reads the row's own coerced state and, where the
   change moves a record the BASE tree owns, the BASE tree's own builder — so
   the prediction's owner is never the quantity under test. */
/* the instrumented base copy the `spine-fold` predicate reads (see there) */
let foldBase = null;
async function foldBaseModule() {
  if (foldBase) return foldBase;
  const fs = await import('node:fs'), os = await import('node:os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fold-base-'));
  const src = fs.readFileSync(path.join(BASE, 'bloom-geometry.js'), 'utf8');
  const find = '  const surface = petalSurface(state, ring, slot, cap, acc);\n';
  if (src.split(find).length !== 2) throw new Error('spine-fold: the base buildPetalInto anchor does not match exactly once');
  fs.writeFileSync(path.join(dir, 'bloom-geometry.js'), src.replace(find, find + '  if (globalThis.__foldSurfaces) globalThis.__foldSurfaces.push(surface);\n'));
  for (const imp of [...src.matchAll(/from '\.\/([^']+)'/g)].map((m) => m[1])) fs.copyFileSync(path.join(BASE, imp), path.join(dir, imp));
  fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}');
  foldBase = await import(pathToFileURL(path.join(dir, 'bloom-geometry.js')).href);
  return foldBase;
}
const FOLD_NV = 10;   // the geometry's NV, restated: the reach is read over the same columns
function surfaceFolds(surf, B) {
  if (!surf.form || !surf.law) return false;
  const N = B.bladeRowsFor(surf.ps.petalTipShape) * B.SPINE_SUBSTEPS, L = surf.length, ds = L / N, half = surf.t / 2;
  for (let i = 0; i < N; i++) {
    const k = (surf.law.at((i + 1) * ds).phi - surf.law.at(i * ds).phi) / ds;
    if (k === 0) continue;
    const row = surf.rowAt((i + 0.5) / N), tau = surf.form.twistRad * row.u, ct = Math.cos(tau), sn = Math.sin(tau);
    const N0 = [row.T[0] * sn + row.N[0] * ct, row.T[1] * sn + row.N[1] * ct, row.T[2] * sn + row.N[2] * ct];
    let pos = 0, neg = 0;
    for (let c = 0; c < FOLD_NV; c++) {
      const P = row.sect(-1 + (2 * c) / (FOLD_NV - 1)).P;
      const d = (P[0] - row.C[0]) * N0[0] + (P[1] - row.C[1]) * N0[1] + (P[2] - row.C[2]) * N0[2];
      if (d > pos) pos = d;
      if (-d > neg) neg = -d;
    }
    const R = (k > 0 ? pos : neg) + half;
    if (R > surf.floorRadius && Math.abs(k) * R > 1) return true;
  }
  return false;
}
const foldB = MOVERS_PRED === 'spine-fold' ? await foldBaseModule() : null;
function foldMoverOnBase(st, row) {
  for (const exportMode of [true, false]) {
    globalThis.__foldSurfaces = [];
    foldB.buildBloomInto(new foldB.MeshBuilder({ exportMode }), { ...st }, { below: null, capability: row.capability ?? null, scopes: baseScopes(harness.rowScopesForBuild(row)) });
    const surfs = globalThis.__foldSurfaces; globalThis.__foldSurfaces = null;
    if (surfs.some((sf) => surfaceFolds(sf, foldB))) return true;
  }
  return false;
}
const PREDICATE_MOVERS = {
  /* RULING 6 — NODES DECOUPLED FROM LEAVES (stem session 2). A row moves iff
     it asks for nodes on a BARE stem: a stem, a prominence away from 0, no
     raceme, and no leaves. Written from the CONTROLS — the ruling's own
     sentence — never from either tree's `stemNodesAbsent`, so the prediction's
     owner is not the guard under test. Every LEAFED noded row must HOLD (the
     leafed kink law is unchanged by ruling), and every RACEME row must hold
     too: the head's nodes are inert there, and each floret's own stem is a bare
     stem the pedicel pin must keep straight — a raceme row that moved would be
     the pin failing. */
  /* (the node split, Oct 6: the one control these rows named is two now and
     the live rows set both halves to the old value, so "away from 0" is
     either half away from 0 — the same set of rows) */
  'nodes-bare': (st) => Number(st.stemLength) > 0 && (Number(st.stemNodeSwelling) !== 0 || Number(st.stemNodeKink) !== 0)
    && String(st.inflorescence ?? 'NONE') === 'NONE' && !(Number(st.leafLength) > 0),
  /* INFLORESCENCE BUILD 3, PHASE A — THE REACH INSET AND THE 250 mm CEILING
     (#355). A row moves iff the BASE tree's own raceme plan would be placed
     differently under the new law: its inset (the pedicel's RISE, `L sin th`,
     against the stem's own 0.16 L) is not what the floret's own emitted reach
     asks (the base tree's own `floretUnitMemo` + `pedicelPlacement`, in both
     modes, plus the gap and the head-floor term), or a pedicel asked past the
     base tree's 120 mm ceiling was clamped there. Read ENTIRELY off the base
     tree's builder and plan — the new law is restated here from pieces the
     base tree already owns, never imported from this tree — so the
     prediction's owner is not the quantity under test. Every row with no
     raceme is a holder by the first line, which is the claim that nothing
     outside the inflorescence moved. */
  'inflo-reach': (st) => {
    const acc = new base.MeshBuilder({ exportMode: true });
    const fr = base.footRing(st, acc);
    const sp = base.stemPlan(st, fr.hub, acc);
    const ip = base.inflorescencePlan(st, sp, acc);
    if (!ip.present) return false;
    if (ip.lengthsClamped) return true;
    const memo = base.floretUnitMemo(st, ip);
    const sessile = ip.pedicelLenMm === 0;
    let reach = -Infinity;
    /* over every azimuth the phyllotaxy produces on any asked node (the
       smoke subset's whorled finding — the minimal roll lands a different
       petal up at each azimuth) */
    const azs = [...new Set(Array.from({ length: Math.max(1, ip.nodesAsked) }, (_, i) => base.leafAzimuths(ip.phyllotaxy, i, Math.PI)).flat())];
    for (const exportMode of [false, true]) {
      const U = memo.get(ip.pedicelLenMm, exportMode);
      const src = U.sub.positions;
      for (const az of azs) {
        const M = base.pedicelPlacement({ ...ip, rootZ: 0, nodeDepthsMm: [0] }, 0, az, U.tipZLocal, sessile).M;
        for (let k = 0; k < src.length; k += 3) { const z = M[8] * src[k] + M[9] * src[k + 1] + M[10] * src[k + 2] + M[11]; if (z > reach) reach = z; }
      }
    }
    const floorZ = Math.min(sp.rootZ, Number.isFinite(sp.lowestHubZ) ? sp.lowestHubZ : sp.rootZ);
    const G = 2 ** -16;   // INFLO_REACH_GRID_MM, restated (the base tree has no such constant)
    const needed = Math.max(0, Math.ceil(reach / G) * G + (sp.rootZ - floorZ) + base.MIN_FEATURE_MM);
    /* THE DEPTHS, NOT THE INSET: the node law is a function of the inset and
       two rows the first cut mis-called were the proof — ONE node sits at the
       flower's solo 0.55 L whatever the inset, and a raceme whose florets
       cannot clear the head collapses to the same single node on both trees —
       so a changed inset with unchanged depths is a HOLDER. */
    const depths = base.leafNodeDepthsMm(ip.nodesAsked, sp.lengthMm, Math.max(ip.insetAskedMm, needed), 2 * ip.pedicelR);
    return depths.length !== ip.nodeDepthsMm.length || depths.some((d, i) => !Object.is(d, ip.nodeDepthsMm[i]));
  },
  /* INFLORESCENCE BUILD 3, RULINGS 1-2 AND PHASE B (the derived internode
     floor, the gradient cap, the per-node deltas). A row moves iff the raceme
     is PLACED differently or a floret is BUILT differently: the BASE tree's
     own plan and this tree's plan disagree on the node count, a node depth, a
     pedicel length or the built gradient, or any node's azimuth carries a
     non-null node term (`floretNodeOverrides` on this tree, which the base
     tree does not have — the amount at 0 returns null by BRANCH, so every
     row with `nodeVariance` 0 reads null and is a holder unless its placement
     moved). STATED PLAINLY: the floor is a column-map bound over the floret's
     own emitted triangles and cannot be restated from the base tree's pieces
     in a line, so the PLAN side of this predicate is read off BOTH trees'
     plans (the discrete decisions each declares) rather than rebuilt from the
     base alone; what the partition then holds is the MESH against those
     declarations — a row whose plan agrees on both trees and whose bytes
     moved is a finding, and a row whose plan disagrees and whose bytes did not
     is the vacuous mover the tool refuses. Every row with no raceme is a
     holder by the first line, which is the claim that nothing outside the
     inflorescence moved; the two GATED rows (`nodeVariance` with no raceme)
     are holders by it too. */
  'inflo-build3': (st) => {
    const planOf = (M) => { const acc = new M.MeshBuilder({ exportMode: true }); const fr = M.footRing(st, acc); const sp = M.stemPlan(st, fr.hub, acc); return M.inflorescencePlan(st, sp, acc); };
    const a = planOf(base), b = planOf(mine);
    if (!a.present && !b.present) return false;
    if (a.present !== b.present) return true;
    const same = (x, y) => x.length === y.length && x.every((v, i) => Object.is(v, y[i]));
    if (a.nodes !== b.nodes || !same(a.nodeDepthsMm, b.nodeDepthsMm) || !same(a.pedicelLensMm, b.pedicelLensMm) || !Object.is(a.gradient, b.gradient)) return true;
    return b.azimuths.flat().some((az) => mine.floretNodeOverrides(st, b, az) !== null);
  },
  /* ORGANIC VARIANCE, BUILD 2 (form). A row moves iff the FORM field exists on
     this tree — the geometry's own `varianceFormIsAbsent`, the guard. Every
     other row, the SIZE rows included, must hold to the bit: that is the claim
     that the form amount at 0 is inert AND that factoring the shared wave out
     of the size field moved no size float. The base tree does not know
     `varianceForm` at all, so a mover builds its default form there. */
  /* THE FLORIST'S CUT (ruling 7, stem session 3). A row moves iff THIS
     tree's plan reports a cut MADE — the guard predicate: the control ON, a
     stem present, and the stem longer than its own cut (a 2 mm stem on 3 mm
     asks for a cut it cannot carry and is a HOLDER, told). Written from the
     plan `stemPlan` reports rather than from the labels; the base tree has
     no cut and cannot say. Every FLAT row, every stemless row and every row
     under the length must hold to the bit — including the raceme with the
     control FLAT, where nothing anywhere is cut. A raceme with the control
     ON moves through its RACHIS alone: the pedicels are pinned flat, and a
     pedicel that moved would be the pin failing (ID4). */
  'stem-cut': (st) => {
    const acc = new mine.MeshBuilder({ exportMode: true });
    const fr = mine.footRing(st, acc);
    if (!fr.hub) return false;
    const sp = mine.stemPlan(st, fr.hub, acc);
    return !!(sp.present && sp.cut && sp.cut.made);
  },
  /* THE COMPOUND RETUNE (Eva's rulings on #380, Oct 7: the rose-toward
     leaflet defaults, the leaflets' own serration and tip, the thicker
     petiole capped by the stem). A row moves iff the BASE tree's own leaf
     plan builds a COMPOUND leaf — `leafPlan(...).compound` non-null with at
     least one leaf placed — evaluated through the base's own footRing /
     stemPlan / inflorescencePlan chain, so a raceme's shared-node pin (which
     makes a compound ask SIMPLE) is the base's decision and not this
     predicate's. Every SIMPLE and every leafless row must hold to the bit in
     both modes: that is the ruling's "SIMPLE petioles don't move" and "the
     simple leaf's serration defaults must NOT move", measured. Rows the base
     matrix does not hold (the retune's own block) are classified the same
     way — the base tree builds the state with its own defaults for controls
     it does not know — so a GATED row asking a leaflet control under SIMPLE
     is a HOLDER, which is the twins' inertness claim. */
  'compound-retune': (st) => {
    const acc = new base.MeshBuilder({ exportMode: true });
    const fr = base.footRing(st, acc);
    if (!fr.hub) return false;
    const sp = base.stemPlan(st, fr.hub, acc);
    const ip = base.inflorescencePlan(st, sp, acc);
    const lp = base.leafPlan(st, sp, acc, ip, ip && ip.present ? ip.unitMemo : null);
    return !!(lp.present && lp.compound && lp.built > 0);
  },
  /* THE LOAD-TAPERED RACHIS (S3c — docs/bloom-leaf-rachis-taper-outcome.md).
     A row moves iff the BASE tree builds a compound leaf whose petiole
     THICKENS (its own mode-free `thickens`): there #381 drew a cone ring to
     the wire and a wire rachis, and the taper removes the one and thickens
     the other. A compound leaf whose cap is UNDER the wire (sheet 2.4 at 85
     degrees) was the wire throughout on the base and is the wire throughout
     here — a holder, by the taper's own clamp ("never above the built
     value"). Read off the BASE tree's own plan chain, never this tree's. */
  /* THE SPINE CURVE (F3-global). A row moves iff THIS tree builds it in CURVE
     mode — the geometry's own `curlIsCurve` on the row's coerced state (the
     base tree has no `petalCurlMode` and builds every row as SLIDER, so the
     guard can only be read here). Every SLIDER row, the GATED row with a curve
     stored included, must hold to the bit in both modes: that is the
     "byte-identical by branch" claim, measured. */
  'curve': (st) => mine.curlIsCurve(st),
  /* THE BRAID (the braid session). A row moves iff the BASE tree builds an
     androecium on it (its own `footRing` record — a count, and not refused
     under SPHERE) AND the row asks for a BRAIDED coil of a radius above 0. The
     base tree has no BRAIDED value and builds such a row's stamens plain, so
     the braid half is read off the CONTROLS; every NONE and every INDEPENDENT
     row — a strand record on an INDEPENDENT coil among them — and the GATED
     rows (radius 0, the braid under SPHERE, count 0) must hold to the bit in
     both modes: that is "NONE and INDEPENDENT byte-identical", measured. */
  /* THE UMBEL (the umbel session). A row moves iff the BASE tree builds a
     STEM on it (its own `stemPlan` record — the rachis an umbel needs) AND the
     row asks for an UMBEL. The base tree has no UMBEL value: `baseState` hands
     it the choice's default (NONE), so the umbel half is read off the
     CONTROLS. Every other row — every NONE and every RACEME, the GATED rows
     carrying the umbel's two controls at their extremes under NONE and under
     a RACEME among them — must hold to the bit in both modes: that is
     "UMBEL is a new choice value, so every existing row holds BY BRANCH",
     measured. */
  'umbel': (st) => {
    if (String(st.inflorescence) !== 'UMBEL') return false;
    const acc = new base.MeshBuilder({ exportMode: true });
    const bs = baseState(st);
    const fr = base.footRing(bs, acc);
    return !!(fr.hub && base.stemPlan(bs, fr.hub, acc).present);
  },
  'stamen-braid': (st) => {
    if (String(st.stamenCoil) !== 'BRAIDED' || !(Number(st.stamenCoilRadius) > 0)) return false;
    const fr = base.footRing(baseState(st), new base.MeshBuilder({ exportMode: true }));
    return !!(fr.androecium && fr.androecium.count >= 1);
  },
  /* THE OUTLINE CURVE (F6-sym). A row moves iff THIS tree builds it in CURVE
     mode — the geometry's own `outlineIsCurve` on the row's coerced state (the
     base tree has no `petalOutlineMode` and builds every row on the law, so the
     guard can only be read here). Every LAW row, the GATED row with a curve
     stored included, must hold to the bit in both modes. */
  'outline': (st) => mine.outlineIsCurve(st),
  /* THE LEAF CURVES (curves-leaves). A row moves iff the BASE tree builds a
     leaf on it (its own `leafPlan` record: a stem and a length, the shared
     node's kept count on a raceme) AND the row asks for a curve the leaf
     reaches — the leaf curl mode CURVE (the simple, lobed or compound leaf),
     the simple blade's outline CURVE on a SIMPLE leaf, or the leaflets'
     outline CURVE on a COMPOUND one. The base tree has no leaf curve control
     and builds every row on the arch and the law, so the curve half is read
     off the CONTROLS; a LOBED leaf with only an outline curve stored, and the
     GATED rows (curves stored under SLIDER / LAW, or with no leaf), HOLD. */
  'leaf-curve': (st) => {
    const acc = new base.MeshBuilder({ exportMode: true });
    const fr = base.footRing(st, acc);
    const plan = base.leafPlan(st, base.stemPlan(st, fr.hub, acc), acc);
    if (!plan || !plan.present) return false;
    const type = String(st.leafType || 'SIMPLE');
    return String(st.leafCurlMode) === 'CURVE'
      || (type === 'SIMPLE' && String(st.leafOutlineMode) === 'CURVE')
      || (type === 'COMPOUND' && String(st.leafletOutlineMode) === 'CURVE');
  },
  /* THE ASYMMETRIC OUTLINE (F6-asym). A row moves iff THIS tree builds it in
     CURVE mode with a TWO-SIDED curve whose right half differs from its left
     (the base tree reads only `points` — the left half — and draws it
     mirrored). Every LAW row, every Symmetric row, an Asymmetric curve with
     EQUAL halves and the GATED row (a two-sided curve stored under LAW) must
     hold to the bit: the equal-halves identity, measured across trees. Read
     off the CONTROL's value, never the plan. */
  'asym': (st) => {
    if (!mine.outlineIsCurve(st)) return false;
    const v = typeof st.petalOutlineCurve === 'string' ? JSON.parse(st.petalOutlineCurve) : st.petalOutlineCurve;
    return !!v && v.mode === 'two-sided' && JSON.stringify(v.right) !== JSON.stringify(v.points);
  },
  /* THE OUTLINE UNDER SCOPING (F6-scope). A row moves iff SOME built petal's
     outline — RESTATED by the harness's `outlineRestated` from the controls,
     the row's own `@scopes` and the pairing law, never read off the resolver
     under test — differs from the whole bloom's mode and curve, which is all
     the base tree reads (it has no owned values and no FAN mirror). So a FAN
     partner of a two-sided curve whose halves differ moves, a petal under a
     scope owning a different mode or curve moves, and the GATED rows (a record
     whose toggle is off; a curve owned under LAW everywhere) hold. The petals
     enumerated are THIS tree's build's (which slots exist, never what they
     drew). */
  'scope-outline': (st, row) => {
    const acc = new mine.MeshBuilder({ exportMode: true });
    const b = mine.buildBloomInto(acc, st, { below: null, capability: row.capability ?? null, scopes: harness.rowScopesForBuild(row) });
    const m = { slotCount: b.foot.slotCount, mirror: mine.mirrorFor(st), continuousMode: !!b.foot.continuousMode };
    const ui = { ...st };
    const key = (o) => (o.mode === 'CURVE' ? JSON.stringify(o.curve) : 'LAW');
    const whole = String(st.petalOutlineMode) === 'CURVE' ? JSON.stringify(typeof st.petalOutlineCurve === 'string' ? JSON.parse(st.petalOutlineCurve) : st.petalOutlineCurve) : 'LAW';
    return b.petalsAll.some((p) => p && key(harness.outlineRestated(row, ui, m, m.continuousMode ? 0 : Math.round(p.whorl), m.continuousMode ? 0 : p.slotIndex)) !== whole);
  },
  /* THE SPINE UNDER SCOPING (F3-scope). A row moves iff some built petal's
     spine RESTATED from the controls and the row's own scopes (the harness's
     `spineRestated`, written apart from the geometry's resolver) differs from
     the whole bloom's: a different curl mode, or under CURVE a different curve.
     NO MIRROR ARM: the spine is planar in the midrib plane, so a FAN partner
     draws its pair's spine unchanged and a FAN of one spine is a holder. Every
     row whose scopes own no spine — every one of the base's 1380 — holds. */
  'scope-spine': (st, row) => {
    const acc = new mine.MeshBuilder({ exportMode: true });
    const b = mine.buildBloomInto(acc, st, { below: null, capability: row.capability ?? null, scopes: harness.rowScopesForBuild(row) });
    const m = { slotCount: b.foot.slotCount, mirror: mine.mirrorFor(st), continuousMode: !!b.foot.continuousMode };
    const ui = { ...st };
    const key = (o) => (o.mode === 'CURVE' ? JSON.stringify(o.curve) : 'SLIDER');
    const whole = String(st.petalCurlMode) === 'CURVE' ? JSON.stringify(typeof st.petalSpineCurve === 'string' ? JSON.parse(st.petalSpineCurve) : st.petalSpineCurve) : 'SLIDER';
    return b.petalsAll.some((p) => p && key(harness.spineRestated(row, ui, m, m.continuousMode ? 0 : Math.round(p.whorl), m.continuousMode ? 0 : p.slotIndex)) !== whole);
  },
  /* THE OUTLINE CURVE'S FOLLOW-UPS (F6-sym-2). A row moves iff THIS tree builds
     it in CURVE mode AND either its width scale is not 1 (Petal width off the
     16 mm default — the base tree drew the 16 mm curve whatever the width) or a
     whorl actually FUSES (the base tree refused the tube under CURVE and drew a
     free blade). Read on this tree's own guards because the base tree has
     neither; every LAW row, every CURVE row at 16 mm, and a CURVE row whose
     tube the infill refuses (a free blade on both trees) must hold to the bit. */
  'outline2': (st) => {
    if (!mine.outlineIsCurve(st)) return false;
    if (mine.outlineWidthScale(st) !== 1) return true;
    return mine.tubePlan(st, Math.round(Number(st.layerCount) || 1), Math.round(Number(st.petalCount))).active;
  },
  /* THE INFILL'S SEAM IS ONE DOUBLE (the infill-whorls session). A row moves
     iff the BASE tree builds a petal carrying an infill plan that cut cells
     (not refused, not absent) AND whose raw seam station is off the plan
     grid: `xB` is quantised onto the grid now, so such a plan's seam, snap,
     ramp and seed field read a value up to half a grid step from the raw
     station. PREDECLARED FROM THE BASE TREE'S OWN
     RECORD, never from the label; every row with the guard off, and every
     refused plan (a fringe, a lobed blade), must hold to the bit. */
  'infill-seam': (st, row) => {
    const acc = new base.MeshBuilder({ exportMode: true });
    const b = base.buildBloomInto(acc, st, { below: null, capability: row.capability ?? null, scopes: harness.rowScopesForBuild(row) });
    /* A row moves iff the BASE tree builds an infilled petal whose seam
       station is NOT already on the plan grid: the change is exactly
       `xB -> infillSnap(xB)`, so a petal whose raw `rows[mSplit].u * L` is a
       grid point (every petal of the five drawn-curve rows whose outline
       hands the split row a dyadic station — measured, 8 of 8 petals at a
       residue of exactly 0) builds bit-identically. Read off the base
       builder's own records — the petal's per-row `profileU` at the plan's
       `mSplit`, times its drawn `length`, which is the plan's `xB` (the blade
       rows the plan indexes ARE the rows `profileU` reports); the snap is
       RESTATED here because the geometry does not export it, with the tie
       slack at X0's own 8 ULP as `infillTieSlack` states it. */
    const G = base.INFILL_PLAN_GRID;
    const snap = (v, L) => { const slack = (8 * Math.abs(L) * Number.EPSILON) / G; const t = v / G, n = Math.floor(t); return (t - n >= 0.5 - slack ? n + 1 : n) * G; };
    return (b.petalsAll || []).some((p) => p && p.infill && !p.infill.refused && p.infill.cells > 0
      && p.infill.mSplit >= 0 && p.profileU && (() => { const x = p.profileU[p.infill.mSplit] * p.length; return Number.isFinite(x) && !Object.is(snap(x, p.length), x); })());
  },
  /* BIG PETALS (Oct 21, docs/bloom-big-petals-outcome.md) — THE ROOT TAPER.
     PREDECLARED FROM THE BASE TREE'S OWN RECORD: a row moves iff the BASE
     builds a petal whose ASKED length (its own `askedLength`, the length the
     law reads) passes the 35 mm reference, or a raceme whose floret asks for
     one (head length x floretScale), or the HUB's bound passes it — the
     longest petal the bloom can build, scopes and the size field included,
     which this tree's `hubRootTaperLengthMm` states (the hub law is new, so
     its bound has no base owner; it reads the coerced state, never the
     build). Every row whose petals are all at or under 35 mm holds to the
     bit — the law is the identity there BY BRANCH. */
  'root-taper': (st, row) => {
    const REF = 35;
    const acc = new base.MeshBuilder({ exportMode: true });
    const b = base.buildBloomInto(acc, st, { below: null, capability: row.capability ?? null, scopes: harness.rowScopesForBuild(row) });
    if ((b.petalsAll || []).some((p) => p && Number(p.askedLength) > REF)) return true;
    if (st.inflorescence && st.inflorescence !== 'NONE' && Number(st.petalLength) * Number(st.floretScale) > REF) return true;
    if (mine.hubRootTaperLengthMm(st, harness.rowScopesForBuild(row)) > REF) return true;
    /* AND THE WIDTH RANGE (Eva's ruling 2, the same PR): `petalWidth`'s max
       went 30 -> 46. The base geometry clamps a petal's COMPOSED width (the
       global plus its scope offset, `OVERRIDE_BOUNDS`) at the BASE's own
       bound, so a row moves on the width alone iff the base builds a petal
       whose composed ask passes that bound, or a raceme whose floret head asks
       past it. The bound is read off the BASE module, never restated. A
       top-level `petalWidth` past 30 with no offset is not clamped on the
       base (the clamp acts on a composition, and the global alone is the
       control's own value) — measured, `petalWidth max (46)` holds to the bit
       — so the clause reads a petal that carries a width OFFSET. */
    const WMAX = base.OVERRIDE_BOUNDS.get('petalWidth').max;
    const offW = (p) => Number((p.scopeTerm && p.scopeTerm.offsets && p.scopeTerm.offsets.petalWidth) || 0);
    if ((b.petalsAll || []).some((p) => p && offW(p) !== 0 && Number(st.petalWidth) + offW(p) > WMAX)) return true;
    return !!(st.inflorescence && st.inflorescence !== 'NONE' && Number(st.petalWidth) * Number(st.floretScale) > WMAX);
  },
  /* ROOT SUPPORT (Oct 21, docs/bloom-root-support-outcome.md) — sepals and
     leaves take the root law at their own length, and the foot clamp is the
     ring's own arc. PREDECLARED FROM THE BASE TREE'S OWN RECORD (a ring with
     no BUILT petal is skipped), the new laws'
     thresholds RESTATED from the controls (the harness's restatements, never
     this tree's builder). A row moves iff, on the base build:
       (a) a petal ring's asked foot, floored, passes the base's 10 mm cap (the
           ring placed by the area rule moves: it reads the uncapped asked
           foot now) or does not fit the arc it owns at its base radius
           (radius x the restated span) where that arc is above the 1.6 mm
           floor — the new cap binds (an arc under the floor builds the floor
           on both trees: the first cut of this clause called 17 such rows
           movers and every one held to the bit);
       (b) a built sepal tier asks a length past 35 mm, or the sepal's asked
           foot passes the base's 10 mm cap or its own arc (the sepal foot's
           cap is the arc too, at the SEPAL whorl's own step), or the sepals raise the hub's bound past both
           35 mm and the base's own bound (the plate held to a sepal root);
       (c) a built leaf blade — the simple or lobed leaf at its node's length,
           any compound leaflet at its own — is past 35 mm;
       (d) a raceme whose FLORET state satisfies (a)-(c) (the floret is the
           same builder on its own state). */
  'root-support': (st, row) => {
    const REF = 35, FOOT_MAX_BASE = 10;
    const scopes = harness.rowScopesForBuild(row);
    const core = (s, sc) => {
      const acc = new base.MeshBuilder({ exportMode: true });
      const b = base.buildBloomInto(acc, s, { below: null, capability: row.capability ?? null, scopes: sc });
      const span = harness.footSpanRestated(s);
      for (const [i, r] of (b.rings || []).entries()) {
        /* a ring none of whose petals is BUILT (the sphere stem's channel took
           them all) moves nothing: its feet exist only as a record */
        if (!(b.petals || [])[i]) continue;
        /* a whorl the TUBE closes completely (k 0) emits no foot rows — the
           tube draws its own base — so a capped foot there is a record only
           (measured: `OUTLINE CURVE 2: TUBE — a lobe curve x petalWidth 22`
           held to the bit with its foot 8.80 -> 8.15 mm); a slit tube's
           feet beside the slits ARE emitted, and move */
        const TL = b.tube && b.tube.active && b.tube.layers ? b.tube.layers[i] : null;
        if (TL && TL.k === 0) continue;
        const asked = Math.max(base.FOOT_MIN_WIDTH_MM, Number(r.authoredWidth));
        /* the built foot differs iff the base clamp bound (asked past 10 mm,
           which also moves the ring) or the new cap binds ABOVE the floor —
           an arc under the 1.6 mm floor builds the floor on both trees */
        if (asked > FOOT_MAX_BASE || asked > Math.max(base.FOOT_MIN_WIDTH_MM, r.radius * span)) return true;
      }
      const S = b.foot && b.foot.sepals;
      if (S && S.count > 0) {
        const tiers = harness.sepalTiersRestated(s);
        let Ls = 0;
        for (let k = 0; k < tiers; k++) Ls = Math.max(Ls, harness.sepalLengthRestated(s, sc, k));
        const built = (b.sepals && b.sepals.tiers ? b.sepals.tiers : []).some((T) => T && T.present && (T.built || []).some(Boolean));
        if (built && Ls > REF) return true;
        const footAsked = Math.max(base.FOOT_MIN_WIDTH_MM, Number(S.footAskedMm));
        /* the sepal foot owns ITS OWN whorl's step (2 pi / the sepal count, the
           fan's step on a FAN) — the petal span here called two sepal rows
           movers and both held to the bit */
        const sepalSpan = s.placement === 'FAN' ? span : (2 * Math.PI) / S.count;
        if (built && (footAsked > FOOT_MAX_BASE || footAsked > Math.max(base.FOOT_MIN_WIDTH_MM, S.ring.radius * sepalSpan))) return true;
        /* EVERY TIER's foot against ITS OWN ring's arc (F1.1a): a lower tier
           sits on a smaller ring, so the cap binds there first — the tier-1
           check alone called `SEPAL TIERS: four tiers on a 4 mm hub` a holder
           while tier 4's foot went 3.84 -> 3.81 mm */
        const tierRecs = (b.foot && b.foot.sepalTiers) || [];
        const tierBuilt = (b.sepals && b.sepals.tiers) || [];
        for (const [k, T] of tierRecs.entries()) {
          const TB = tierBuilt[k];
          if (!T || !T.ring || !(TB && TB.present && (TB.built || []).some(Boolean))) continue;
          const fa = Math.max(base.FOOT_MIN_WIDTH_MM, Number(T.footAskedMm));
          if (fa > FOOT_MAX_BASE || fa > Math.max(base.FOOT_MIN_WIDTH_MM, T.ring.radius * sepalSpan)) return true;
        }
        if (Ls > REF && Ls > base.hubRootTaperLengthMm(s, sc)) return true;
      }
      const lp = b.leaf;
      if (lp && lp.present && lp.built > 0) {
        for (const B of b.leavesBuilt || []) {
          if (!B) continue;
          if (B.compound) { if (B.leaflets.some((lf) => Number(lf.lengthMm) > REF)) return true; continue; }
          const L = lp.nodeLengthsMm ? Math.max(...lp.nodeLengthsMm) : Number(lp.lengthMm);
          if (L > REF) return true;
          /* the PETIOLE's root floor reads the ASKED length (a shared node's
             offset needs the rod before the floret cap exists, so the rod and
             the built petiole carry the asked blade's root — a conservative
             upper bound): a shared-node leaf capped under 35 mm still moves
             when its asked length is past it */
          if (Number(lp.lengthMm) > REF) return true;
        }
      }
      return b;
    };
    const b = core(st, scopes);
    if (b === true) return true;
    const ip = b.inflorescence;
    if (ip && ip.present) return core(base.floretState(st, ip), null) === true;
    return false;
  },
  /* THE FOOT CLEARANCE (Oct 22, docs/bloom-foot-clearance-outcome.md) — the
     foot cap stands FOOT_CAP_CLEARANCE_RAD inside the arc. PREDECLARED FROM THE
     BASE TREE'S OWN RECORD: each ring's asked foot (`widthAskedMm`), its cap
     ring (`footCapRadiusMm`), its span (`footSpanRad`) and the width it BUILT,
     with the clearance RESTATED (the harness's derivation, never this tree's
     builder). A ring moves iff the width the new law restates from those
     records differs from the base's built width — i.e. the cap binds above the
     floor (a foot inside its cap is the asked double by branch; a foot the
     1.6 mm floor wins holds on both trees). The same law for every BUILT sepal
     tier on its own ring and step, and for a raceme's floret state. Skipped,
     as `root-support` measured them: a ring with no BUILT petal (the sphere
     stem's channel took them all) and a whorl a closed tube (k 0) draws — its
     feet are a record and emit no row. */
  'foot-clearance': (st, row) => {
    const F = base.FOOT_MIN_WIDTH_MM, CL = harness.FOOT_CAP_CLEARANCE_RAD_RULED;
    const newW = (asked, capR, span) => { const cap = capR * (span - CL); return asked > cap ? Math.max(F, cap) : asked; };
    const core = (s, sc) => {
      const acc = new base.MeshBuilder({ exportMode: true });
      const b = base.buildBloomInto(acc, s, { below: null, capability: row.capability ?? null, scopes: sc });
      for (const [i, r] of (b.rings || []).entries()) {
        if (!(b.petals || [])[i]) continue;
        const TL = b.tube && b.tube.active && b.tube.layers ? b.tube.layers[i] : null;
        if (TL && TL.k === 0) continue;
        if (newW(r.widthAskedMm, r.footCapRadiusMm, r.footSpanRad) !== r.width) return true;
      }
      const tierRecs = (b.foot && b.foot.sepalTiers) || [];
      const tierBuilt = (b.sepals && b.sepals.tiers) || [];
      for (const [k, T] of tierRecs.entries()) {
        const TB = tierBuilt[k];
        if (!T || !T.ring || !(TB && TB.present && (TB.built || []).some(Boolean))) continue;
        if (newW(Math.max(F, T.footAskedMm), T.ring.radius, T.footSpanRad) !== T.footMm) return true;
      }
      return b;
    };
    const b = core(st, harness.rowScopesForBuild(row));
    if (b === true) return true;
    const ip = b.inflorescence;
    if (ip && ip.present) return core(base.floretState(st, ip), null) === true;
    return false;
  },
  'compound-taper': (st) => {
    const acc = new base.MeshBuilder({ exportMode: true });
    const fr = base.footRing(st, acc);
    if (!fr.hub) return false;
    const sp = base.stemPlan(st, fr.hub, acc);
    const ip = base.inflorescencePlan(st, sp, acc);
    const lp = base.leafPlan(st, sp, acc, ip, ip && ip.present ? ip.unitMemo : null);
    return !!(lp.present && lp.compound && lp.built > 0 && lp.compound.petiole && lp.compound.petiole.thickens);
  },
  /* F1.1a — STACKED SEPAL TIERS (docs/bloom-sepal-tiers-outcome.md).
     PREDECLARED FROM THE BASE TREE'S OWN RECORD: a row moves iff it asks for
     more than one tier (`sepalTiers`, a control the base does not know, so it
     is read off the coerced state) AND the base builds a sepal whorl on the
     HUB-to-stem join (tier 1 is today's whorl; a RIM fallback, a sphere, or
     count 0 has no join for a second tier to sit on) AND the join's extent
     holds at least one gap (two sheet half-thicknesses) below tier 1 — the
     NO-ROOM arm builds no second tier and is a holder by branch. Every
     one-tier row holds to the bit in both modes. */
  'sepal-tiers': (st) => {
    if (!(Number(st.sepalTiers) > 1)) return false;
    const acc = new base.MeshBuilder({ exportMode: true });
    const fr = base.footRing(st, acc);
    const S = fr.sepals;
    if (!S || !(S.count > 0) || !S.attachment || S.attachment.mode !== 'HUB') return false;
    const gap = base.seamHalfThicknessMm(Number(st.sheetThickness)) * 2;
    return S.attachment.frac * S.attachment.extentMm > gap;
  },
  /* LEAF/STEM BUILD S4 — THE LOBED (CHEVRON) LEAF. A row moves iff THIS tree
     builds a lobed blade on it (the plan's own type, after the raceme's pin,
     with a leaf actually built). The base tree has no LOBED and builds such a
     row as the simple blade, so the guard can only be read here; every SIMPLE
     and COMPOUND row, the lobed GATED arms (a SIMPLE or COMPOUND leaf with
     every lobed control at an extreme, a LOBED ask at length 0) and the LOBED
     ask the raceme pins to SIMPLE must hold to the bit. */
  'lobed': (st) => {
    const acc = new mine.MeshBuilder({ exportMode: true });
    const fr = mine.footRing(st, acc);
    if (!fr.hub) return false;
    const sp = mine.stemPlan(st, fr.hub, acc);
    const ip = mine.inflorescencePlan(st, sp, acc);
    const lp = mine.leafPlan(st, sp, acc, ip, ip && ip.present ? ip.unitMemo : null);
    return !!(lp.present && lp.type === 'LOBED' && lp.built > 0);
  },
  /* LEAF/STEM BUILD S4b — THE LOBED-LEAF RULINGS (round sinus bottoms, the
     mum defaults, the area-scaled petiole; docs/bloom-leaf-lobed-rulings-
     outcome.md). PREDECLARED FROM THE BASE TREE'S OWN RECORD: a row moves iff
     the BASE builds a lobed blade on it (its plan's own type after the
     raceme's pin, a leaf actually built) — the retune moves every lobed
     outline and the area law every lobed petiole. Every SIMPLE and COMPOUND
     row, every leafless row, the lobed GATED arms and the LOBED ask the
     raceme pins to SIMPLE must hold to the bit. */
  'lobed-rulings': (st) => {
    const acc = new base.MeshBuilder({ exportMode: true });
    const fr = base.footRing(st, acc);
    if (!fr.hub) return false;
    const sp = base.stemPlan(st, fr.hub, acc);
    const ip = base.inflorescencePlan(st, sp, acc);
    const lp = base.leafPlan(st, sp, acc, ip, ip && ip.present ? ip.unitMemo : null);
    return !!(lp.present && lp.type === 'LOBED' && lp.built > 0);
  },
  /* LEAF/STEM BUILD S5, JOB 1 — THE LEAF'S APEX NIB (Eva's Oct 10 ruling;
     docs/bloom-leaf-tip-broad-sinus-outcome.md). Every leaf blade — SIMPLE,
     a COMPOUND leaflet, LOBED — closes on the nib now where it ended on the
     beaded 1.60 mm stub, so a row moves iff the BASE tree builds at least one
     leaf on it (its own plan chain, after the raceme's pin and the flowering
     node's cap). Read off the BASE tree, never this one, so the prediction's
     owner is not the quantity under test. Every leafless row holds to the
     bit — the petals' own nib read `nibCrossing` through a refactor and must
     not move a float. */
  'leaf-tip': (st) => {
    const acc = new base.MeshBuilder({ exportMode: true });
    const fr = base.footRing(st, acc);
    if (!fr.hub) return false;
    const sp = base.stemPlan(st, fr.hub, acc);
    const ip = base.inflorescencePlan(st, sp, acc);
    const lp = base.leafPlan(st, sp, acc, ip, ip && ip.present ? ip.unitMemo : null);
    return !!(lp.present && lp.built > 0);
  },
  /* S5b, JOB 1 — THE TIP GIVES UP THE PAIR THAT NECKS IT (Eva's ruling of
     Oct 11; docs/bloom-leaf-tip-neck-outcome.md). PREDECLARED FROM THE BASE
     TREE: a row moves iff the restated rule (`tools/bloom-leaf-tip-neck.mjs`,
     run on the BASE tree's own profiles and lobe layout — a tree with no
     give-up at all) gives at least one pair up on some leaf blade of it.
     Every other row — leafless, entire, or toothed with no neck (the body
     parting the blade as deeply, the tip's notch under half) — must hold to
     the bit. The base tree has no `tipNeck`, so the prediction's owner is not
     the quantity under test. */
  'tip-neck': (st) => tipNeckOf(base, st).given > 0,
  /* S5b, JOB 3 — WHERE THE NIB'S ROWS COME FROM (Eva's ruling of Oct 11 on
     S5's E2 churn). PREDECLARED FROM THE BASE TREE'S OWN EMITTED STATIONS: a
     row moves iff some leaf blade the base builds stands on stations other
     than the new law gives it — the law RESTATED in the harness
     (`restatedLeafStations` / `restatedLobedStations`, its own expression)
     and fed the base blade's own nib record (`arcU`). Every leafless row and
     every blade with no nib holds to the bit. */
  'arc-donors': (st) => {
    let b;
    try { b = base.buildBloomInto(new base.MeshBuilder({ exportMode: true }), st); } catch (e) { return false; }
    for (const L of b.leavesBuilt || []) {
      const blades = L.leaflets ? L.leaflets.map((q) => [q, false]) : [[L, !!L.lobed]];
      for (const [B, lobed] of blades) {
        if (!Array.isArray(B.rowU) || !B.tipClamp || !B.tipClamp.nib) continue;
        const want = lobed ? harness.restatedLobedStations(st, B.tipClamp.arcU) : harness.restatedLeafStations(B.rowU.length - 1, B.tipClamp.arcU);
        if (want.length !== B.rowU.length || want.some((u, j) => !Object.is(u, B.rowU[j]))) return true;
      }
    }
    return false;
  },
  /* S5, JOB 2 — THE BROAD SINUS'S FILLET, measured against a JOB-1-ONLY tree
     (`--base` is the head with the fillet branch stripped, so the nib is on
     both sides). A row moves iff THIS tree's build fillets at least one broad
     sinus (`roundBottoms.filleted`, the fillet that touches a drawn row). The
     narrow sinuses' U bottoms and every other row must hold to the bit — the
     ruling's "narrow-sinus bytes must not move", measured. The base tree has
     no fillet branch, so the guard can only be read here. */
  'broad-fillet': (st) => {
    if (mine.leafIsAbsent(st)) return false;
    const b = mine.buildBloomInto(new mine.MeshBuilder({ exportMode: true }), st);
    return (b.leavesBuilt || []).some((r) => r && r.lobed && r.lobed.roundBottoms && r.lobed.roundBottoms.filleted > 0);
  },
  'variance-form': (st) => !mine.varianceFormIsAbsent(st),
  /* ORGANIC VARIANCE, BUILD 3 (spacing). A row moves iff the SPACING field
     exists on this tree — the geometry's own `varianceSpacingIsAbsent`, the
     guard, never a label. Every other row, the size and form rows and every
     row of the blanket sweep with the amount at 0 included, must hold to the
     bit: that is the amount-0 byte-inertness claim, measured. The base tree
     does not know `varianceSpacing`, so a mover builds there at nominal
     azimuths. */
  'variance-spacing': (st) => !mine.varianceSpacingIsAbsent(st),
  /* FORM VARIANCE HEADROOM (the build-2 follow-up — docs/bloom-organic-
     variance-form-outcome.md §19). The law changed only where a petal's
     slot term meets a side with LESS room than the half-span, so a row moves
     iff SOME petal the BASE tree built carries a non-zero term on a base whose
     room on that side — measured from the BASE tree's own role composition
     (`resolveRoleOverrides` without the slot term), clamped — is under the
     half-span AND above zero (see the two identities below). Read off the BASE tree's builder and resolver, never this
     tree's `formScaled`, so the prediction's owner is not the quantity under
     test. Every row with the amount at 0 is a holder by this predicate's
     first line, which is the byte-inertness claim re-measured. */
  'form-headroom': (st) => {
    if (base.varianceFormIsAbsent(st)) return false;
    const acc = new base.MeshBuilder({ exportMode: true });
    const b = base.buildBloomInto(acc, st);
    for (const p of b.petalsAll) {
      if (!p || !p.formTerm) continue;
      const roles = [p.role, p.allRole, p.slotRole, p.petalRole].filter((r) => r !== null && r !== undefined);
      const comp = base.resolveRoleOverrides(st, roles) || {};
      for (const q of base.FORM_VARIANCE_BASES) {
        const t = p.formTerm[q.base];
        if (!(t !== 0)) continue;
        const from = q.base in comp ? comp[q.base] : Number(st[q.base]);
        const at = Math.min(q.max, Math.max(q.min, from));
        const room = t >= 0 ? q.max - at : at - q.min;
        const half = (q.max - q.min) / 2;
        /* THE OLD LAW IS clamp(at + t) AND THE NEW ONE at + t * room / half,
           and they are the SAME number in two cases this predicate first
           missed: room 0 (both give `at` — a slider at its END, where headroom
           IS the clamp; the first run predeclared `ALL MAX`, every slider at an
           end, and it held to the bit, which is the tool doing its job) and
           |t| = half with the term past the room (both give the range end).
           A petal moves iff 0 < room < half and neither holds. */
        if (room > 0 && room < half && !(Math.abs(t) > room && Math.abs(t) === half)) return true;
      }
    }
    return false;
  },
  /* THE STEM'S NODES. A row moves iff (i) its state engages the node law on
     THIS tree (the geometry's own `stemNodesAbsent`, which is the guard), or
     (ii) the leaf node pitch floor, made mode-free by the same change, moves
     the LIVE leaf count — read off the BASE tree's own `leafPlan` in LIVE mode
     against this tree's, which is the only place that change can act. */
  'stem-nodes': (st) => {
    if (!mine.stemNodesAbsent(st)) return true;
    if (mine.leafIsAbsent(st)) return false;
    const liveCount = (G) => {
      const acc = new G.MeshBuilder({ exportMode: false });
      const fr = G.footRing(st, acc);
      const sp = G.stemPlan(st, fr.hub, acc);
      return G.leafPlan(st, sp, acc).nodes;
    };
    return liveCount(mine) !== liveCount(base);
  },
  /* THE INFLORESCENCE'S NODE LAWS (gradient, corymb, sessile, shared node).
     A row moves iff the BASE tree builds a raceme (its own plan, read off its
     own builder — the base does not know the gradient or the corymb, so this
     never asks this tree's plan) AND either (i) some node's pedicel length on
     this session's laws differs from the control — RESTATED here from the
     controls and the base plan's own node depths, never read from this
     tree's plan — or the top length is 0 (sessile: the base built a stemless
     floret at a different root), or (ii) the base built leaves beside it
     (the shared node re-seats every one of them). Everything else holds. */
  'node-laws': (st) => {
    const acc = new base.MeshBuilder({ exportMode: true });
    const fr = base.footRing(st, acc);
    const sp = base.stemPlan(st, fr.hub, acc);
    const ip = base.inflorescencePlan(st, sp, acc);
    if (!ip.present) return false;
    if (base.leafPlan(st, sp, acc).present) return true;
    const L0 = Number(st.pedicelLength), g = Number(st.pedicelGradient ?? 1);
    if (L0 === 0) return true;
    const corymbOn = String(st.pedicelCorymb ?? 'OFF') === 'ON';
    const sinTh = Math.sin(Number(st.pedicelAngle) * Math.PI / 180);
    if (ip.nodeDepthsMm.length < 2) return false;
    if (corymbOn) return sinTh > 0;
    return g !== 1;
  },
  /* THE NODE LAWS' SECOND ROUND (Eva's change 1 and change 2): the shared
     node's offset clears the leaf BLADE now, so every subtending leaf moves
     (deeper by 0.158 mm at the defaults), and a flowering node caps its
     leaf's length, so a capped leaf moves again or is not built at all. A row
     moves iff the BASE tree builds at least one shared-node leaf — read off
     the base tree's own leaf plan, never off the labels. */
  'node-laws-2': (st) => {
    const acc = new base.MeshBuilder({ exportMode: true });
    const fr = base.footRing(st, acc);
    const sp = base.stemPlan(st, fr.hub, acc);
    const ip = base.inflorescencePlan(st, sp, acc);
    if (!ip.present) return false;
    const lp = base.leafPlan(st, sp, acc, ip);
    return !!(lp.present && lp.shared && lp.built > 0);
  },
  /* THE STAMEN LENGTH VARIANCE (F1.2 — docs/bloom-stamen-length-variance-
     outcome.md). A row moves iff a stamen's BUILT length changes: the BASE
     tree's own footRing() builds an androecium on it (the base's record, so
     SPHERE and count-0 rows are holders by the base's own guard), the row
     asks a variance above 0, and the law — restated here from the controls
     and the index, NEVER imported from this tree's geometry — hands at least
     one stamen a length other than the control's. The 120 mm ceiling alone
     moves nothing: both trees build the state they are handed, and a row at
     length 120 is 120 on each. `ALL MAX` is a holder by construction (the
     variance is a STAMEN_SUB, out of the blanket sweep), measured here. */
  'stamen-length': (st) => {
    const acc = new base.MeshBuilder({ exportMode: true });
    const fr = base.footRing(st, acc);
    if (!fr.androecium) return false;
    const amount = Number(st.stamenLengthVariance) || 0;
    if (amount === 0) return false;
    const L = Number(st.stamenLength);
    const unit = (i) => { let h = Math.imul((i | 0) + 1, 0x9E3779B1) >>> 0; h = (h ^ (h >>> 15)) >>> 0; h = Math.imul(h, 0x85EBCA6B) >>> 0; h = (h ^ (h >>> 13)) >>> 0; h = Math.imul(h, 0xC2B2AE35) >>> 0; h = (h ^ (h >>> 16)) >>> 0; return (h / 0xFFFFFFFF) * 2 - 1; };
    for (let i = 0; i < fr.androecium.count; i++) { const b = Math.min(120, Math.max(5, L * (1 + amount * unit(i)))); if (b !== L) return true; }
    return false;
  },
  /* THE FOLD LIMIT (spine-cup-fold — docs/bloom-spine-cup-fold-outcome.md). A
     row moves iff SOME petal the BASE tree builds (a petal, a sepal, a floret's
     petal — every `buildPetalInto` call) has a spine substep whose curvature,
     as the BASE built it, exceeds the limit the change imposes: 1 / (the
     section's reach toward that bend's centre + half a sheet), wherever that
     radius is past the floor's. RESTATED HERE FROM THE BASE TREE'S OWN
     SURFACE, never from this tree's `spineBendTable` or its `bendClamped`
     flag: the curvature is the base law's own phi per substep, the reach is
     read off the base's own `rowAt(u).sect(v)` at the substep's midpoint,
     projected on the row's untwisted normal (T sin tau + N cos tau), over the
     same NV columns. The base surfaces are reached through an INSTRUMENTED
     COPY of the base module (one line appended after `buildPetalInto`'s
     `petalSurface` call, refused unless it matches exactly once; the copy
     carries the module's own imports). Both modes, OR'd. */
  'spine-fold': (st, row) => foldMoverOnBase(st, row),
  /* THE SEPAL CURVES (curves-sepals — docs/bloom-curves-sepals-outcome.md). A
     row moves iff some sepal tier the BASE tree builds (its own `sepals.tiers`
     record — present, not refused) resolves its curl mode or its outline mode
     to CURVE: the row's own tier entry's value where it owns one, the whole
     bloom's sepal control otherwise — restated from the CONTROLS and the row's
     own scopes, never from this tree's resolver. Every row whose sepals are on
     SLIDER and LAW holds, and so does every row whose PETALS alone are on a
     curve (the base pinned its sepals to SLIDER / LAW, and the twins' defaults
     are exactly those). */
  'sepal-curve': (st, row) => {
    const b = base.buildBloomInto(new base.MeshBuilder({ exportMode: true }), { ...st }, { below: null, capability: row.capability ?? null, scopes: baseScopes(harness.rowScopesForBuild(row)) });
    const S = b.sepals;
    if (!S) return false;
    const rs = harness.rowScopes(row);
    const tiers = (S.tiers || [{ tier: 0, present: S.count > 0 }]).filter((T) => T.present);
    return tiers.some((T) => {
      const e = ((rs && rs.tiers) || []).find((x) => x.tier === T.tier && x.values) || null;
      const val = (id) => (e && id in e.values ? e.values[id] : st[id]);
      return String(val('sepalCurlMode')) === 'CURVE' || String(val('sepalOutlineMode')) === 'CURVE';
    });
  },
  /* THE INDEPENDENT COIL (F1.3a — docs/bloom-stamen-coil-outcome.md): a row
     moves iff the BASE tree's own footRing() builds an androecium on it (so
     SPHERE and count 0 are holders by the base's own record) AND the row asks
     for an INDEPENDENT coil at a radius above 0 — the plain rod is the branch
     at NONE and at radius 0, so those rows HOLD. The base tree has no coil
     control at all, so the predicate's second half is the controls' and the
     first half is the base's: the prediction never reads this tree's geometry. */
  'stamen-coil': (st) => {
    const acc = new base.MeshBuilder({ exportMode: true });
    const fr = base.footRing(st, acc);
    if (!fr.androecium) return false;
    return st.stamenCoil === 'INDEPENDENT' && Number(st.stamenCoilRadius) > 0;
  },
};
const BASE_VALUE_IDS = new Set(base.SCOPE_VALUE_IDS || []);
/* A TIER's values are the SEPAL ids (#425), which the petal list does not hold:
   reading the petal list for a tier stripped every sepal tier's own curve from
   the BASE build and reported a holder as moved (curves-leaves, measured on
   block 72's two tier rows — in-process the two trees agree to the bit). */
const BASE_TIER_VALUE_IDS = new Set(base.SEPAL_SCOPE_VALUE_IDS || []);
/* `--list-movers <file>`: every live matrix row's prediction under the
   declared predicate, written as JSON and nothing else built — so a predicate
   corrected mid-partition can be compared against the one the finished chunks
   ran, and only the rows whose prediction flipped need re-measuring. */
if (argv.includes('--list-movers')) {
  if (!MOVERS_PRED || !PREDICATE_MOVERS[MOVERS_PRED]) { console.error('--list-movers needs --movers-predicate <name>'); process.exit(2); }
  const out = MATRIX.map((row) => { let v; try { v = !!PREDICATE_MOVERS[MOVERS_PRED](stateOf(row), row); } catch (e) { v = 'threw'; } return [row.label, v]; });
  (await import('node:fs')).writeFileSync(argOf('--list-movers'), JSON.stringify(out));
  console.log(`--list-movers: ${out.filter((x) => x[1] === true).length} movers of ${out.length} rows`);
  process.exit(0);
}
/* `--frozen-sweep` (spine-cup-fold): WHICH FROZEN BASELINES' BYTES STOP
   REPRODUCING under the declared predicate — every registered frozen matrix's
   rows run through the SAME predicate the byte partition proves exact on the
   live matrix, memoised on the state. A consequence of that partition, never
   a substitute for it (the seam tool's `--frozen-sweep`, for a base-side
   predicate). A frozen row may name an id this tree retired; it rides into
   the state raw and is read by nothing. */
if (argv.includes('--frozen-sweep')) {
  if (!MOVERS_PRED || !PREDICATE_MOVERS[MOVERS_PRED]) { console.error('--frozen-sweep needs --movers-predicate <name>'); process.exit(2); }
  const lenient = (row) => {
    const st = { ...harness.DEFAULTS };
    for (const w of row.set || []) {
      if (w.id === harness.SCOPES_SET_ID) continue;
      const c = kindOf.get(w.id);
      st[w.id] = !c ? w.value : c.kind === 'slider' ? Number(w.value) : c.kind === 'check' ? (w.value === true || w.value === 'true') : w.value;
    }
    return st;
  };
  const fo = argv.indexOf('--frozen-only');
  const names = Object.keys(harness.FROZEN_MATRICES).filter((n) => fo < 0 || new RegExp(argv[fo + 1]).test(n));
  const memo = new Map(), threwSeen = new Set();
  /* `--memo <file>`: the predicate's answer per distinct state, carried across
     runs so a sweep longer than one foreground call closes in batches
     (`--frozen-only` picks each batch). Rewritten after every baseline. */
  const memoFile = argOf('--memo');
  const fsM = memoFile ? await import('node:fs') : null;
  if (memoFile && fsM.existsSync(memoFile)) for (const [k, v] of JSON.parse(fsM.readFileSync(memoFile, 'utf8'))) memo.set(k, v);
  let tags = 0, total = 0, movers = 0, threwAll = 0, memoSavedAt = Date.now();
  for (const name of names) {
    const fr = harness.FROZEN_MATRICES[name]();
    let n = 0, threw = 0;
    for (const row of fr) {
      const st = lenient(row);
      const key = JSON.stringify([st, row.capability || null, harness.rowScopesForBuild(row) || null]);
      let v = memo.get(key);
      if (v === undefined) {
        try { v = PREDICATE_MOVERS[MOVERS_PRED](st, row); } catch (e) { v = 'threw'; if (threwSeen.size < 12 && !threwSeen.has(row.label)) { threwSeen.add(row.label); console.log(`    threw: ${name} ${row.label} — ${String(e && e.message || e).slice(0, 160)}`); } }
        memo.set(key, v);
        /* AND A CHECKPOINT INSIDE A BASELINE (the foot-clearance session): a
           baseline of ~950 rows outlasts one foreground call, and a memo
           written only after each baseline then never advances — measured,
           two of four workers closed 0 phases in 570 s. Keyed on the state, so
           a resumed run skips exactly what was answered. */
        if (memoFile && Date.now() - memoSavedAt > 30000) { fsM.writeFileSync(memoFile, JSON.stringify([...memo])); memoSavedAt = Date.now(); }
      }
      if (v === 'threw') threw++; else if (v) n++;
    }
    total += fr.length; movers += n; threwAll += threw; if (n) tags++;
    console.log(`  frozen/${name.padEnd(8)} ${String(n).padStart(4)} of ${String(fr.length).padStart(4)} rows move${threw ? `   (${threw} threw, counted as neither)` : ''}`);
    if (memoFile) fsM.writeFileSync(memoFile, JSON.stringify([...memo]));
  }
  console.log(`\n  ${tags} of ${names.length} baselines carry a row whose bytes stop reproducing; ${movers} of ${total} frozen rows (${memo.size} distinct states).`);
  process.exit(threwAll ? 1 : 0);
}
if (MOVERS_PRED && !PREDICATE_MOVERS[MOVERS_PRED]) { console.error(`--movers-predicate ${MOVERS_PRED}: no such predicate (${Object.keys(PREDICATE_MOVERS).join(', ')})`); process.exit(2); }
if (MOVERS_PRED && MOVERS) { console.error('--movers and --movers-predicate are two declarations of one partition; give one'); process.exit(2); }
console.log(`${rows.length} rows x 2 modes — this tree against ${BASE}`);
const allFails = [];
let floats = 0, gridFloats = 0, tris = 0, rowsDone = 0, panels = 0;
let controlFired = 0;

/* Walk a captured grid into a flat list of [label, value] so the comparison is
   one loop and a shape change (a panel that appeared or vanished) is a failure
   rather than a silently shorter walk.

   A SLOT THAT WAS NOT BUILT IS A VALUE IN THE STREAM, NEVER A SKIP. This loop
   read `petals[p].grid` unguarded, and `built.petals` carries a NULL wherever a
   slot was declared and not built — which the sphere stem's omission mask is the
   first thing in this project ever to produce. So the tool THREW on eleven rows
   of the live matrix (the ten `SPHERE STEM:` rows that actually build a stem,
   plus `LEAVES: x a SPHERE with a stem`) and could not complete a full-matrix
   run at all; CLAUDE.md names that class in as many words — an instrument that
   indexes by slot and never asks whether the slot was built.
   A BARE `continue` WOULD BE THE OTHER DEFECT: it defines the subject so as to
   exclude the thing this clause doubts, because a petal built on one tree and
   omitted on the other would then contribute nothing to either side and the
   comparison would be silent about the one difference that matters most. The
   built-ness goes into the stream instead, so an omission that MOVED is a
   string mismatch (and, since a built petal also contributes its panel walk, a
   length mismatch too — which this tool already reports as a shape change). */
function gridFloatsOf(petals) {
  const out = [];
  for (let p = 0; p < petals.length; p++) {
    out.push(`p${p}.built:${petals[p] ? 1 : 0}`);
    const g = petals[p] && petals[p].grid;
    if (!g) continue;
    for (let q = 0; q < g.length; q++) {
      const pan = g[q];
      out.push(`p${p}.${q}.label:${pan.label}`, pan.rowFrom, pan.rowTo, pan.rows.length);
      for (const r of pan.rows) {
        out.push(r.row, r.u, r.halfWidth, r.thickness, r.v.length);
        for (let j = 0; j < r.v.length; j++) {
          out.push(r.v[j], r.mid[j][0], r.mid[j][1], r.mid[j][2], r.normal[j][0], r.normal[j][1], r.normal[j][2]);
        }
      }
    }
  }
  return out;
}

/* THE BASE TREE IS HANDED THE SCOPE VALUES IT CAN OWN, AND NO OTHERS
   (F3-scope). A value id the base's own geometry does not list
   (`base.SCOPE_VALUE_IDS`) is one the base would REFUSE BY NAME — and its page,
   reading such a file, tells it "not applied" and builds without it. So the
   base build of a row carrying a newer value is that file on the base page:
   the record with the unknown values dropped. Every row whose values the base
   already knows is handed the very same record, so a holder's two builds are
   the same call on the same input. */
/* (`BASE_VALUE_IDS` is declared above `--frozen-sweep`, which reads it through
   `baseScopes` and ran before it on every scoped row: a temporal dead zone.) */
function baseScopes(sc) {
  if (!sc) return sc;
  const strip = (e, ids = BASE_VALUE_IDS) => {
    if (!e.values) return e;
    const v = Object.fromEntries(Object.entries(e.values).filter(([k]) => ids.has(k)));
    if (Object.keys(v).length === Object.keys(e.values).length) return e;
    const out = { ...e }; if (Object.keys(v).length) out.values = v; else delete out.values; return out;
  };
  const layers = (sc.layers || []).map((e) => strip(e)), petals = (sc.petals || []).map((e) => strip(e)), tiers = (sc.tiers || []).map((e) => strip(e, BASE_TIER_VALUE_IDS));
  if (layers.every((e, i) => e === sc.layers[i]) && petals.every((e, i) => e === sc.petals[i]) && tiers.every((e, i) => e === sc.tiers[i])) return sc;
  return { ...sc, layers, petals, tiers };
}
let moversSeen = 0, moversMoved = 0, holdersSeen = 0;
for (const row of rows) {
  const st = stateOf(row);
  const opts = { below: null, capability: row.capability ?? null, scopes: harness.rowScopesForBuild(row) };
  const optsBase = { ...opts, scopes: baseScopes(opts.scopes) };
  const mover = MOVERS ? MOVERS.test(row.label) : MOVERS_PRED ? PREDICATE_MOVERS[MOVERS_PRED](st, row) : false;
  if (mover) moversSeen++; else holdersSeen++;
  const rowFails = [];
  const fails = mover ? rowFails : allFails;
  for (const exportMode of [false, true]) {
    const tag = `${row.label} (${exportMode ? 'export' : 'live'})`;

    /* 1. THE EXPORT STREAM, positionally. */
    const A = new mine.MeshBuilder({ exportMode }), B = new base.MeshBuilder({ exportMode });
    mine.buildBloomInto(A, { ...st }, opts); base.buildBloomInto(B, { ...baseState(st) }, optsBase);
    const pa = A.positions, pb = B.positions;
    if (CONTROL && rowsDone === 0 && !exportMode) { pa[0] += 1e-9; controlFired++; }
    if (pa.length !== pb.length) {
      fails.push(`${tag}: ${pa.length} floats against ${pb.length} — the triangle COUNT moved`);
    } else {
      let bad = 0, first = -1;
      for (let i = 0; i < pa.length; i++) if (!Object.is(pa[i], pb[i])) { bad++; if (first < 0) first = i; }
      if (bad) fails.push(`${tag}: ${bad} of ${pa.length} floats moved, first at index ${first} (tri ${Math.floor(first / 9)}): ${pa[first]} against ${pb[first]}`);
      floats += pa.length; tris += pa.length / 9;
    }

    /* 2. THE CAPTURED GRID — the mid-surface itself, which the STL never sees. */
    const GA = new mine.MeshBuilder({ exportMode, captureGrid: true });
    const GB = new base.MeshBuilder({ exportMode, captureGrid: true });
    const ga = gridFloatsOf(mine.buildBloomInto(GA, { ...st }, opts).petals);
    /* CLAUSE 2's OWN CONTROL — the first numeric grid value, perturbed. It is
       a separate perturbation from clause 1's because the two clauses read
       two different builds through two different paths, and a control that
       fired only the first would leave this one unproven. */
    if (CONTROL && rowsDone === 0 && !exportMode) {
      const k = ga.findIndex((x) => typeof x === 'number');
      if (k >= 0) { ga[k] += 1e-9; controlFired++; }
    }
    const gb = gridFloatsOf(base.buildBloomInto(GB, { ...baseState(st) }, optsBase).petals);
    if (ga.length !== gb.length) {
      fails.push(`${tag}: grid shape moved — ${ga.length} captured values against ${gb.length}`);
    } else {
      let bad = 0, first = -1;
      for (let i = 0; i < ga.length; i++) if (!Object.is(ga[i], gb[i])) { bad++; if (first < 0) first = i; }
      if (bad) fails.push(`${tag}: grid — ${bad} of ${ga.length} values moved, first at ${first}: ${ga[first]} against ${gb[first]}`);
      gridFloats += ga.length;
    }
    if (!exportMode) panels += ga.filter((x) => typeof x === 'string' && x.includes('.label:')).length;
  }
  if (mover) {
    if (rowFails.length) moversMoved++;
    else allFails.push(`${row.label}: named a MOVER by --movers and held to the bit in both modes — the feature did nothing on a row declared to engage it`);
  }
  rowsDone++;
  if (rowsDone % 50 === 0) process.stderr.write(`  ${rowsDone}/${rows.length} rows\n`);
}
const fails = allFails;
if (JSON_OUT) {
  const fs = await import('node:fs');
  fs.writeFileSync(JSON_OUT, JSON.stringify({ from: RFROM, to: Math.min(RTO, MATRIX.length), matrixRows: MATRIX.length, predicate: MOVERS_PRED || (MOVERS ? String(MOVERS) : null), base: BASE,
    only: ONLY ? String(ONLY) : null, limit: Number.isFinite(LIMIT) ? LIMIT : null, skip: FROM || null,
    moversSeen, moversMoved, holdersSeen, floats, tris, gridFloats, panels, rowsDone, fails: allFails.slice() }));
}
if ((MOVERS || MOVERS_PRED) && !moversSeen && !JSON_OUT) fails.push(`VACUOUS: --movers ${MOVERS} matched no row of the matrix`);
if ((MOVERS || MOVERS_PRED) && !holdersSeen && !JSON_OUT) fails.push('VACUOUS: --movers matched EVERY row — nothing is being held');

/* VACUITY. A comparison that compared nothing passes trivially. */
if (!rows.length) fails.push('VACUOUS: the matrix returned no rows');
if (!floats) fails.push('VACUOUS: no export floats were compared');
if (!gridFloats) fails.push('VACUOUS: no grid values were compared — captureGrid produced nothing');
if (!panels) fails.push('VACUOUS: no captured panels — the grid path never ran');
if (CONTROL && controlFired !== 2) fails.push(`VACUOUS: --control perturbed ${controlFired} clause(s), expected 2 (export stream and captured grid)`);
if (CONTROL && fails.filter((f) => !f.startsWith('VACUOUS')).length !== 2) {
  fails.push(`CONTROL DID NOT FIRE BOTH CLAUSES: ${fails.filter((f) => !f.startsWith('VACUOUS')).length} finding(s), expected exactly 2 — a clause that cannot produce a verdict is not a check`);
}

if (MOVERS || MOVERS_PRED) console.log(`\npartition     : ${moversMoved} of ${moversSeen} rows named by --movers MOVED (every one must), ${holdersSeen} holders compared to the bit`);
console.log(`${MOVERS ? '' : '\n'}export stream : ${floats.toLocaleString()} floats over ${tris.toLocaleString()} triangles, ${rowsDone} rows x 2 modes${MOVERS ? ' (movers counted in the floats only where their lengths agree)' : ''}`);
console.log(`captured grid : ${gridFloats.toLocaleString()} values over ${panels.toLocaleString()} panels (live)`);
if (CONTROL) console.log('positive control: one coordinate perturbed by 1e-9 — the run MUST fail below');

if (fails.length) {
  console.log(`\nFAIL — ${fails.length} finding(s):`);
  for (const f of fails.slice(0, 40)) console.log('  ' + f);
  if (fails.length > 40) console.log(`  ... and ${fails.length - 40} more`);
  process.exit(1);
}
console.log((MOVERS || MOVERS_PRED) ? `\nPASS — 0 floats moved on the ${holdersSeen} holders, positionally, under Object.is; all ${moversSeen} predeclared movers moved.` : '\nPASS — 0 floats moved, positionally, under Object.is.');
