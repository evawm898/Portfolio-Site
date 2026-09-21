/* ===================================================================
   verify-bloom-winding-bytes.mjs — WHAT THE ORIENTATION FIX MOVED, AND WHAT
   IT DID NOT (session 36, Eva's ruling: "do not assert the easy answer").

     node tools/verify-bloom-winding-bytes.mjs --base <worktree> [--rows N] [--control]

   Reversing a winding moves no vertex, but it changes the ORDER of the
   vertices within each facet and flips the facet normal the STL exporter
   derives from that order — so the emitted float stream is NOT identical and
   "0 floats moved" would be false. This tool measures the claim that is
   actually true, per row of the full live matrix, in both modes, this tree
   against a worktree of the base commit:

     INVARIANT  the triangle COUNT; the SET of triangles as unordered vertex
                triples (a multiset, matched by exact coordinate string, so a
                float that moved by one ULP would break the match); every
                coordinate value, compared with Object.is inside the matched
                pair; every triangle's divergence term (exactly negated on a
                reversed shell — the shell TOTAL only to summation order, see
                clause 4); and every shell that is
                NOT a petal (the hub, every stamen rod and anther, the style
                and its lobes), which is IDENTICAL IN ORDER, float for float.
     CHANGED    every petal shell: each of its triangles is the base tree's
                triangle with its winding REVERSED — (a, b, c) became (a, c, b)
                up to rotation — and sits within ONE emission slot of where the
                base emitted it (the two triangles of a quad swap slots under
                (a, d, c, b)). Nothing else. Signed volume flips sign, and the
                magnitude is equal to the bit.

   THE POSITIVE CONTROL is `--control`: one coordinate of the new build is
   perturbed by 1e-9 and the multiset match must FAIL; and the run REFUSES a
   vacuous pass — if no shell was reversed on any row the tool is comparing
   two identical trees and proves nothing about this change.

   Frozen matrices pin ROW DEFINITIONS (labels and control sets), never bytes,
   so no frozen phase is owed by this; what IS owed is the note that every
   STL byte hash of every frozen baseline changes on every row with a petal,
   recorded in docs/bloom-session-36-outcome.md.
   =================================================================== */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { existsSync } from 'node:fs';

const argv = process.argv.slice(2);
const argOf = (n) => { const i = argv.indexOf(n); return i < 0 ? null : argv[i + 1]; };
const BASE = argOf('--base');
const LIMIT = +(argOf('--rows') || 0) || Infinity;
const CONTROL = argv.includes('--control');
if (!BASE || !existsSync(path.join(BASE, 'bloom-geometry.js'))) {
  console.error('usage: node tools/verify-bloom-winding-bytes.mjs --base <worktree of the base commit> [--rows N] [--control]');
  process.exit(2);
}
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const load = (dir, f) => import(pathToFileURL(path.join(dir, f)).href);
const [mine, base, harness, tool] = await Promise.all([
  load(ROOT, 'bloom-geometry.js'), load(BASE, 'bloom-geometry.js'),
  load(ROOT, 'tools/bloom-harness.mjs'), load(ROOT, 'tools/bloom-self-intersection.mjs'),
]);
const kindOf = new Map(harness.CONTROLS.map((c) => [c.id, c]));
function stateOf(row) {
  const s = { ...harness.DEFAULTS };
  for (const w of row.set || []) {
    const c = kindOf.get(w.id); if (!c) throw new Error(`${row.label}: no control ${w.id}`);
    s[w.id] = c.kind === 'slider' ? Number(w.value) : c.kind === 'check' ? (w.value === true || w.value === 'true') : w.value;
  }
  return s;
}
const vkey = (p, o) => `${p[o]},${p[o + 1]},${p[o + 2]}`;
const triKey = (p, t) => [vkey(p, t * 9), vkey(p, t * 9 + 3), vkey(p, t * 9 + 6)].sort().join('|');
/* rotation-invariant winding key: the three corners in emitted cyclic order,
   rotated so the lexicographically smallest corner leads */
function cyc(p, t) {
  const c = [vkey(p, t * 9), vkey(p, t * 9 + 3), vkey(p, t * 9 + 6)];
  let m = 0; for (let i = 1; i < 3; i++) if (c[i] < c[m]) m = i;
  return [c[m], c[(m + 1) % 3], c[(m + 2) % 3]];
}
/* the shell each triangle belongs to (vertex-welded components), from the
   census tool's own grouping so "petal shell" here is what O1 sees */
function shellsOf(p) {
  const nTri = p.length / 9;
  const key = new Map(), vidx = new Int32Array(nTri * 3);
  for (let t = 0; t < nTri; t++) for (let c = 0; c < 3; c++) {
    const k = vkey(p, t * 9 + c * 3); let id = key.get(k); if (id === undefined) { id = key.size; key.set(k, id); } vidx[t * 3 + c] = id;
  }
  const par = new Int32Array(nTri).map((_, i) => i);
  const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  const bv = new Map();
  for (let t = 0; t < nTri; t++) for (let c = 0; c < 3; c++) { const v = vidx[t * 3 + c]; if (bv.has(v)) { const a = find(bv.get(v)), b = find(t); if (a !== b) par[b] = a; } else bv.set(v, t); }
  const out = new Int32Array(nTri); for (let t = 0; t < nTri; t++) out[t] = find(t);
  return out;
}

const rows = harness.buildMatrix().slice(0, LIMIT);
console.log(`${rows.length} rows x 2 modes — this tree against ${BASE}`);
const fails = [];
let rowsDone = 0, triTotal = 0, reversedTris = 0, identicalTris = 0, reversedShells = 0, identicalShells = 0, petalShells = 0, floats = 0;
let slotMax = 0, volRelMax = 0;
for (const row of rows) {
  const st = stateOf(row);
  for (const exportMode of [false, true]) {
    const tag = `${row.label} (${exportMode ? 'export' : 'live'})`;
    const A = new mine.MeshBuilder({ exportMode }), B = new base.MeshBuilder({ exportMode });
    const bA = mine.buildBloomInto(A, { ...st }); base.buildBloomInto(B, { ...st });
    const pa = A.positions, pb = B.positions;
    if (CONTROL && rowsDone === 0 && !exportMode) pa[0] += 1e-9;
    if (pa.length !== pb.length) { fails.push(`${tag}: ${pa.length} floats against ${pb.length} — the triangle COUNT moved`); continue; }
    const n = pa.length / 9; triTotal += n;
    /* 1. the multiset of unordered triangles is identical */
    const idx = new Map();   // triKey -> list of base indices
    for (let t = 0; t < n; t++) { const k = triKey(pb, t); let L = idx.get(k); if (!L) { L = []; idx.set(k, L); } L.push(t); }
    const partner = new Int32Array(n).fill(-1);
    let unmatched = 0;
    for (let t = 0; t < n; t++) {
      const L = idx.get(triKey(pa, t));
      if (!L || !L.length) { unmatched++; continue; }
      /* prefer the nearest emission slot among equal triangles (a degenerate
         cap can emit coincident triangles) */
      let bi = 0; for (let i = 1; i < L.length; i++) if (Math.abs(L[i] - t) < Math.abs(L[bi] - t)) bi = i;
      partner[t] = L[bi]; L.splice(bi, 1);
    }
    if (unmatched) { fails.push(`${tag}: ${unmatched} of ${n} triangles have NO base triangle with the same vertex set — a vertex MOVED`); continue; }
    /* 2. per triangle: identical winding or exactly reversed; coordinates Object.is-equal */
    const shellA = shellsOf(pa);
    const shellState = new Map();   // shell root -> 'same' | 'rev' | 'mixed'
    for (let t = 0; t < n; t++) {
      const u = partner[t];
      const ca = cyc(pa, t), cb = cyc(pb, u);
      const same = ca[0] === cb[0] && ca[1] === cb[1] && ca[2] === cb[2];
      const rev = ca[0] === cb[0] && ca[1] === cb[2] && ca[2] === cb[1];
      if (!same && !rev) { fails.push(`${tag}: triangle ${t} matches base ${u} as a set but is neither the same winding nor its reversal`); break; }
      /* coordinate identity inside the pair, value for value */
      const oa = t * 9, ob = u * 9;
      const cornersA = [0, 3, 6].map((k) => [pa[oa + k], pa[oa + k + 1], pa[oa + k + 2]]);
      const cornersB = [0, 3, 6].map((k) => [pb[ob + k], pb[ob + k + 1], pb[ob + k + 2]]);
      for (const c of cornersA) { const m = cornersB.find((d) => Object.is(d[0], c[0]) && Object.is(d[1], c[1]) && Object.is(d[2], c[2])); floats += 3; if (!m) { fails.push(`${tag}: triangle ${t}: a corner is string-equal but not Object.is-equal to its partner`); break; } }
      if (same) identicalTris++; else { reversedTris++; slotMax = Math.max(slotMax, Math.abs(t - u)); if (Math.abs(t - u) > 1) fails.push(`${tag}: reversed triangle ${t} was emitted at slot ${u} on the base tree — more than one slot away`); }
      const s = shellA[t], prev = shellState.get(s), now = same ? 'same' : 'rev';
      if (prev === undefined) shellState.set(s, now); else if (prev !== now) shellState.set(s, 'mixed');
    }
    if (fails.length && fails[fails.length - 1].startsWith(tag)) continue;
    /* 3. shells: every shell is wholly identical or wholly reversed, and the
       reversed ones are exactly the petals */
    let rev = 0, same = 0;
    for (const v of shellState.values()) { if (v === 'mixed') fails.push(`${tag}: a shell mixes identical and reversed triangles`); else if (v === 'rev') rev++; else same++; }
    reversedShells += rev; identicalShells += same; petalShells += bA.petalsBuilt;
    if (rev !== bA.petalsBuilt) fails.push(`${tag}: ${rev} shells reversed but the builder emitted ${bA.petalsBuilt} petals — the reversed set is not exactly the petal shells`);
    /* 4. VOLUME. Per triangle the divergence term a.(b x c) under (a, c, b)
       is the EXACT negation of the term under (a, b, c) — every component of
       the cross product and every product in the dot negate exactly in
       IEEE-754 — and that is asserted to the bit. The SHELL total is a sum
       whose ORDER changed (the two triangles of a quad swapped slots), so it
       agrees only to summation rounding: measured 4e-16 relative on the
       shipping default, held here at 1e-9. Asserting the total to the bit
       was tried first and is FALSE — recorded so nobody re-asserts it. */
    const term = (p, t) => { const o = t * 9; const a = [p[o], p[o+1], p[o+2]], b = [p[o+3], p[o+4], p[o+5]], c = [p[o+6], p[o+7], p[o+8]];
      return a[0]*(b[1]*c[2]-b[2]*c[1]) + a[1]*(b[2]*c[0]-b[0]*c[2]) + a[2]*(b[0]*c[1]-b[1]*c[0]); };
    for (let t = 0; t < n; t++) {
      const u = partner[t], ta = term(pa, t), tb = term(pb, u);
      const want = shellState.get(shellA[t]) === 'rev' ? -tb : tb;
      if (!Object.is(ta, want) && !(ta === 0 && want === 0)) { fails.push(`${tag}: triangle ${t}'s volume term ${ta} is not the exact ${shellState.get(shellA[t]) === 'rev' ? 'negation' : 'value'} of the base's ${tb}`); break; }
    }
    const oA = tool.orientation(pa), oB = tool.orientation(pb);
    const magA = oA.perShell.map((s) => Math.abs(s.volumeMm3)).sort((x, y) => x - y), magB = oB.perShell.map((s) => Math.abs(s.volumeMm3)).sort((x, y) => x - y);
    for (let i = 0; i < magA.length; i++) { const rel = Math.abs(magA[i] - magB[i]) / Math.max(Math.abs(magB[i]), 1e-300); volRelMax = Math.max(volRelMax, rel); if (rel > 1e-9) { fails.push(`${tag}: a shell's volume MAGNITUDE moved beyond summation rounding (${magA[i]} against ${magB[i]}, ${rel.toExponential(2)} relative)`); break; } }
    /* THE SPHERE HEAD'S INNER SPHERE is a separate closed shell wound INWARD
       on both trees, BY DESIGN: the hollow's inner face, which a union
       subtracts from the outer sphere to leave the shell of thickness t. It
       is the one inward shell the orientation baseline admits (O1). */
    const hollow = mine.sphereMode(st) ? 1 : 0;
    if (oA.inward !== hollow) fails.push(`${tag}: ${oA.inward} shells inward on this tree, expected ${hollow}`);
    if (oB.inward !== bA.petalsBuilt + hollow) fails.push(`${tag}: the base tree has ${oB.inward} inward shells, not its ${bA.petalsBuilt} petals${hollow ? ' plus the sphere\'s inner face' : ''} — the premise "every petal was inside-out" does not hold on this row`);
  }
  rowsDone++;
  if (rowsDone % 50 === 0) console.log(`  ${rowsDone}/${rows.length} rows · ${triTotal.toLocaleString('en-US')} triangles · ${fails.length} failures`);
}
console.log(`\n${rowsDone} rows x 2 modes · ${triTotal.toLocaleString('en-US')} triangles matched as unordered vertex sets · ${floats.toLocaleString('en-US')} coordinates Object.is-equal inside the pairs`);
console.log(`${reversedTris.toLocaleString('en-US')} triangles REVERSED (all within ${slotMax} emission slot of the base) · ${identicalTris.toLocaleString('en-US')} IDENTICAL in order`);
console.log(`per-shell |volume| agrees to ${volRelMax.toExponential(2)} relative (summation order only; the per-triangle terms negate EXACTLY)`);
console.log(`${reversedShells} shells reversed = ${petalShells} petal shells · ${identicalShells} shells identical (hub, rods, pills, lobes)`);
if (CONTROL) {
  const ok = fails.length > 0;
  console.log(ok ? `\nPOSITIVE CONTROL PASS — a 1e-9 perturbation is detected: ${fails[0]}` : '\nPOSITIVE CONTROL FAIL — the comparison cannot see a 1e-9 perturbation');
  process.exit(ok ? 0 : 1);
}
if (reversedShells === 0) { console.log('\nFAIL — no shell was reversed on any row: the two trees are identical here and this run is VACUOUS'); process.exit(1); }
for (const f of fails.slice(0, 20)) console.log(`  FAIL ${f}`);
if (fails.length > 20) console.log(`  … ${fails.length - 20} more`);
console.log(fails.length ? `\nFAIL — ${fails.length} failure(s)` : '\nPASS — the surface is unchanged; exactly the petal shells reversed');
process.exit(fails.length ? 1 : 0);
