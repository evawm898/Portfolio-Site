/* ===================================================================
   verify-bloom-tip-bytes.mjs — DID THE ANTHER MOVE? (session 26)

   THE CLAIM THIS EXISTS TO PROVE. Session 24's ruling Q2 is RODRIGUES, AND
   NO GUARD: the tip's ring frame is the rod's own frame rotated onto the
   tip's axis by the minimal rotation, with no special case at zero. The
   ruling was made on the strength of two measurements — the anther migrates
   BYTE-IDENTICALLY under it, and the trifid does not — and a ruling that
   rests on a measurement needs the measurement re-runnable, on the tree that
   actually shipped, not remembered from a discovery pass on a tree that no
   longer exists.

   HOW IT IS MEASURED, and why this shape and not another:

     - IT IS NOT A RE-TYPED BUILDER. The base side is imported from a GIT
       WORKTREE of the base commit — the whole shipped module, not a copy of
       one function pasted into a harness. A copy is a second producer of the
       thing under test, and this project's entire registration rule says the
       copy is what drifts. Point --base at the worktree; the live tree is
       never touched.

     - IT IS FLOAT-EXACT AND -0 AWARE. The comparison is `Object.is` over
       `acc.positions`, the accumulator's own array of doubles, so +0 and -0
       are DIFFERENT — which they are in the exported STL, where they are
       different float32 bit patterns. `===` reads them equal and would have
       reported a clean sheet over a real byte move. The run prints how many
       of the compared floats are a signed zero at all, and how many pairs
       differ ONLY in that sign, so "-0 aware" is a number rather than an
       adjective.

     - IT IS TWO-SIDED, AND THAT IS THE VACUITY GUARD. The anther rows must
       come back 0 moved; the TRIFID rows must come back nonzero. A migration
       that never reached the lobes would satisfy the first claim perfectly
       and mean nothing — the same failure the retirement mode's V1 exists
       for. A run where a style row holds is a FAILURE here, not a bonus.

   WHAT IT DOES NOT COVER, in its own header rather than in a doc:
     - It compares POSITIONS, not the STL file. The exporter's float32
       narrowing can only merge two doubles, never split one, so 0 moved
       doubles implies 0 moved bytes; nonzero moved doubles does NOT imply
       moved bytes. The style's byte movement is closed by
       tools/diff-bloom-bytes.mjs on the live matrix, not here.
     - It says nothing about whether the geometry is RIGHT. The two STL
       gates own that.
     - The states below are hand-picked corners, not the matrix.
   =================================================================== */

import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argAt = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const IS_MAIN = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);


/* THE ROWS. `holds` is the PREDECLARATION: true means this row must come
   back 0 moved, false means it must come back nonzero. Both are asserted. */
const ROWS = [
  { label: 'BARE: no androecium, no gynoecium (the shipping default)', holds: true, set: {} },
  { label: 'ANTHER: 6 stamens on a RING', holds: true, set: { stamenCount: 6 } },
  { label: 'ANTHER: 1 stamen (the singleton)', holds: true, set: { stamenCount: 1 } },
  { label: 'ANTHER: 120 on the DISC x head rise 0.5 (roots on a cap)', holds: true, set: { stamenCount: 120, stamenLayout: 'DISC', headRise: 0.5 } },
  { label: 'ANTHER: 6 x filament curl max (180)', holds: true, set: { stamenCount: 6, stamenCurl: 180 } },
  { label: 'ANTHER: 6 x curl -180 (the other sign)', holds: true, set: { stamenCount: 6, stamenCurl: -180 } },
  { label: 'ANTHER: 45 on the DISC x spread max', holds: true, set: { stamenCount: 45, stamenLayout: 'DISC', stamenSpread: 6 } },
  { label: 'TRIFID: a style on the bare apex', holds: false, set: { gynoecium: 'STYLE' } },
  { label: 'TRIFID: a style x curl max (180)', holds: false, set: { gynoecium: 'STYLE', styleCurl: 180 } },
  { label: 'TRIFID: a style x head rise 1 (the hemisphere apex)', holds: false, set: { gynoecium: 'STYLE', headRise: 1 } },
  { label: 'BOTH: a style x 6 stamens on a RING', holds: false, set: { gynoecium: 'STYLE', stamenCount: 6 } },
];

export const compare = (a, b) => {
  let moved = 0, negZeros = 0, signOnly = 0, first = [];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i], y = b[i];
    /* -0 IS THE HAZARD THIS COMPARATOR EXISTS FOR. `x + 0` is `+0` when x is
       `-0`, so a frame arithmetic that adds a zero term flips the sign of a
       zero silently; the two are different float32 bit patterns in the STL,
       and `===` reads them equal. Counting the negative zeros PRESENT says
       the comparator had something to see. */
    if (Object.is(x, -0) || Object.is(y, -0)) negZeros++;
    if (Object.is(x, y)) continue;
    moved++;
    if (x === 0 && y === 0) signOnly++;
    if (first.length < 3) first.push(`  float ${i}: ${Object.is(x, -0) ? '-0' : x} -> ${Object.is(y, -0) ? '-0' : y}`);
  }
  return { moved, negZeros, signOnly, first, n };
};

/* HOW FAR THE SURFACE ACTUALLY MOVED — the number Eva rules on, measured
   rather than quoted. Two DIFFERENT quantities, and conflating them would be
   this codebase's most repeated defect:

     VERTEX DISPLACEMENT — how far each emitted point moved. Large, and it is
     not what an eye sees: rotating a 10-gon on its own axis moves every
     vertex around a circle while leaving the solid almost where it was.

     SURFACE DEVIATION — for each point of the NEW solid, the distance to the
     nearest point of the OLD one. This is what "invisible" would have to
     mean. Its closed form for a rotated regular polygon is the sagitta
     r(1 - cos(pi/sides)) at the widest ring; it is MEASURED here against the
     emitted triangles instead, so the closed form is a prediction the run
     can contradict. */
export const pointTriDist = (p, a, b, c) => {
  const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  const clampSeg = (u, v) => { const uv = sub(v, u), t = Math.max(0, Math.min(1, dot(sub(p, u), uv) / dot(uv, uv) || 0)); return [u[0] + uv[0] * t, u[1] + uv[1] * t, u[2] + uv[2] * t]; };
  const d00 = dot(ab, ab), d01 = dot(ab, ac), d11 = dot(ac, ac);
  const den = d00 * d11 - d01 * d01;
  let inside = false, q = a;
  if (den !== 0) {
    const u = (d11 * d1 - d01 * d2) / den, v = (d00 * d2 - d01 * d1) / den;
    if (u >= 0 && v >= 0 && u + v <= 1) { inside = true; q = [a[0] + ab[0] * u + ac[0] * v, a[1] + ab[1] * u + ac[1] * v, a[2] + ab[2] * u + ac[2] * v]; }
  }
  if (inside) { const d = sub(p, q); return Math.hypot(d[0], d[1], d[2]); }
  let best = Infinity;
  for (const [u, v] of [[a, b], [b, c], [c, a]]) { const w = clampSeg(u, v), d = sub(p, w); best = Math.min(best, Math.hypot(d[0], d[1], d[2])); }
  return best;
};

export const deviation = (before, after) => {
  /* THE CHANGED REGION ONLY. Both trees emit the same triangles in the same
     order, so a triangle whose nine floats all match is untouched and belongs
     to neither surface under test; the differing ones ARE the moved solid. */
  const tris = [];
  for (let t = 0; t * 9 < before.length; t++) {
    let same = true;
    for (let k = 0; k < 9; k++) if (!Object.is(before[t * 9 + k], after[t * 9 + k])) { same = false; break; }
    if (!same) tris.push(t);
  }
  if (!tris.length) return null;
  let vertexMax = 0, surfaceMax = 0;
  const oldTris = tris.map((t) => [0, 1, 2].map((v) => [before[t * 9 + v * 3], before[t * 9 + v * 3 + 1], before[t * 9 + v * 3 + 2]]));
  for (const t of tris) {
    for (let v = 0; v < 3; v++) {
      const i = t * 9 + v * 3;
      const p = [after[i], after[i + 1], after[i + 2]], o = [before[i], before[i + 1], before[i + 2]];
      vertexMax = Math.max(vertexMax, Math.hypot(p[0] - o[0], p[1] - o[1], p[2] - o[2]));
      let best = Infinity;
      for (const T of oldTris) { best = Math.min(best, pointTriDist(p, T[0], T[1], T[2])); if (best === 0) break; }
      surfaceMax = Math.max(surfaceMax, best);
    }
  }
  return { tris: tris.length, vertexMax, surfaceMax };
};

export const build = (M, state, exportMode) => {
  const acc = new M.MeshBuilder({ exportMode });
  M.buildBloomInto(acc, state);
  return acc.positions;
};

if (!IS_MAIN) { /* imported for its measurements — tools/shot-bloom-tip.mjs uses deviation() so the sheet's captions and this run quote ONE computation */ } else {
const BASE = argAt('--base');
if (!BASE) { console.error('usage: node tools/verify-bloom-tip-bytes.mjs --base <git worktree of the base commit>'); process.exit(2); }
const load = async (root) => import(pathToFileURL(path.join(root, 'bloom-geometry.js')).href);
const NEW = await load(ROOT);
const OLD = await load(path.resolve(BASE));
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
/* V0 — THE TWO TREES ARE DIFFERENT TREES. Comparing a tree with itself is
   the most comfortable possible result and the least informative one. */
const srcNew = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
const srcOld = fs.readFileSync(path.join(path.resolve(BASE), 'bloom-geometry.js'), 'utf8');
const bad = [];
if (srcNew === srcOld) bad.push('V0: the base worktree carries the same bloom-geometry.js as this tree — the comparison would be vacuous');

/* WHERE THE -0 ACTUALLY LIVES. The Rodrigues expression adds two zero terms
   to the rod frame at the identity, and `-0 + 0` is `+0` — so the anther's
   RING VECTOR does flip sign-of-zero at azimuth 0, where the old frame was
   `[-sin 0, cos 0, 0]` and the new one comes back `[+0, 1, 0]`. No
   arrangement of `x + 0` preserves a negative zero, so this is not fixable
   by reordering and is not fixed. The claim being made is the narrower,
   measurable one: IT REACHES NO EMITTED POSITION. Both halves are measured
   here — the flip, on the frame, and its absence from the compared floats,
   in every row's `-0 among the compared floats` count. */
{
  const st = { ...DEFAULTS, stamenCount: 6 };
  const acc = new NEW.MeshBuilder({});
  const b = NEW.buildBloomInto(acc, st);
  const s0 = b.stamens.find((x) => x.azimuth === 0);
  const oldT = s0 ? [-Math.sin(s0.azimuth), Math.cos(s0.azimuth), 0] : null;
  const newE = s0 && s0.lumps[0].e1;
  if (!s0) bad.push('V1: no stamen at azimuth 0 in the RING layout — the -0 corner is not being exercised');
  else {
    const flipped = oldT.some((v, k) => !Object.is(v, newE[k]) && v === 0 && newE[k] === 0);
    console.log(`the -0 corner: the anther at azimuth 0 had ring vector ${JSON.stringify(oldT.map((v) => (Object.is(v, -0) ? '-0' : v)))} and now has ${JSON.stringify(newE.map((v) => (Object.is(v, -0) ? '-0' : v)))} — sign-of-zero ${flipped ? 'FLIPPED (and must reach no position below)' : 'unchanged'}\n`);
  }
}

console.log(`base:  ${path.resolve(BASE)}`);
console.log(`rows:  ${ROWS.length}, each in LIVE and EXPORT mode; comparison is Object.is over MeshBuilder.positions\n`);

let totalFloats = 0, totalMoved = 0;
for (const row of ROWS) {
  const state = { ...DEFAULTS, ...row.set };
  const parts = [];
  let rowMoved = 0, rowZeros = 0, rowSign = 0, rowFloats = 0;
  let dev = null;
  for (const mode of ['live', 'export']) {
    const em = mode === 'export';
    const b = build(OLD, state, em), a = build(NEW, state, em);
    const r = compare(b, a);
    rowMoved += r.moved; rowZeros += r.negZeros; rowSign += r.signOnly; rowFloats += r.n;
    parts.push(`${mode} ${r.moved}/${r.n}`);
    if (em && r.moved) dev = deviation(b, a);
  }
  totalFloats += rowFloats; totalMoved += rowMoved;
  const verdict = row.holds ? (rowMoved === 0 ? 'HELD' : 'MOVED — PREDECLARED TO HOLD') : (rowMoved > 0 ? 'MOVED (predeclared)' : 'HELD — PREDECLARED TO MOVE');
  const ok = row.holds ? rowMoved === 0 : rowMoved > 0;
  if (!ok) bad.push(`${row.label}: ${verdict}`);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${row.label}\n     ${parts.join('  ')}  · -0 among the compared floats ${rowZeros}, pairs differing in that sign alone ${rowSign}  · ${verdict}`);
  if (dev) console.log(`     the moved solid, in EXPORT mode: ${dev.tris} triangles · max VERTEX displacement ${dev.vertexMax.toFixed(4)} mm · max SURFACE deviation ${dev.surfaceMax.toFixed(4)} mm (each new point to the nearest point of the old solid)`);
}

console.log(`\n${totalMoved} of ${totalFloats} floats moved across ${ROWS.length} rows x 2 modes.`);
if (bad.length) { console.error('\nFAIL\n' + bad.map((b) => '  ' + b).join('\n')); process.exit(1); }
console.log('PASS — every anther row byte-identical, every trifid row moved (the comparison is not vacuous).');

}
