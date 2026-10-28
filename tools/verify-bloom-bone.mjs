/* ===================================================================
   verify-bloom-bone.mjs — THE BONE TEXTURE'S MUST-FAIL (Oct 28; read
   docs/bloom-surface-texture-bone-outcome.md).

     node tools/verify-bloom-bone.mjs [--control] [--only=<id>[,...]]

   WHY IT IS OWED. TXB0-TXB7 and the T5 family read the builder's own
   records and the emitted mesh, and both STL gates carry them; but the apex
   mutant table never exports a file and a mutant run there costs a browser
   per row. TXB's clauses are PURE functions of (state, records, mesh), so —
   ST9's remedy, root-taper's shape — the build runs in Node on a MUTATED
   geometry module and the clauses come from the UNMUTATED harness, whose
   restatements (the field, the patch noise and its table, the fade, the
   floor, the coverage segment test) are a different owner from the module
   under test.

   THE MUTANTS — Eva's six (Oct 28):
     pores-sunk-below-the-sheet     the whole network offset down a quarter of
                                    H and written below the sheet (TXB1)
     a-typed-mask-list              the curvature mask zeroed by ORGAN NAME
                                    for the hub and the stem — a list, where
                                    the ruling derives the mask (TXB2)
     a-covered-underside-is-textured  coverage tested only where the normal
                                    faces up, so the hub's underside under a
                                    coplanar foot is relieved (TX12)
     a-sepal-foot-is-ignored        the hub's cover is the petal feet alone
                                    (TX12, which reads the SEPAL feet too)
     floret-petals-in-their-own-frame  a floret's sheets relieved inside the
                                    floret build, before its placement (TXB5)
     emitter-order-moves-texture    a shared position takes the FIRST copy's
                                    relief and the rest none — "texture once,
                                    on whichever part was emitted first", the
                                    rule the derived owner replaced (TXB6, on
                                    the hardest-case fixture)
   Each declares the clause it must fire and a WITNESS asked of the MUTATED
   module's own build — the behaviour moved — before any clause is consulted.
   Every anchor is checked to match bloom-geometry.js EXACTLY ONCE before any
   mutant runs.

   THE ORDER, TWICE (Eva: "prove it with a mutant that reorders two
   emitters"). (1) THE REORDER CONTROL: a copy of the module that emits the
   STYLE BEFORE THE STAMENS builds the same multiset of triangles as the
   shipped tree — the texture cannot be moved by moving an emitter, because
   no emitter writes relief under BONE (the one pass runs after them all).
   It is a MUST-HOLD, run in both arms. (2) THE OWNER RULE on the
   FIXTURE: no shipped row carries a RELIEVED position two organs share
   (every shared position measured is buried, covered or a ridge, so it
   takes 0 on every copy), so the rule is proved where it binds — two flat
   sheets written down with one shared edge, the pass run forward and
   reversed — and the first-wins mutant must break it there.

   WITHOUT --control: the clean tree on every probe row, every clause silent,
   the fixture identical both ways, the reorder control identical.
   It rides in CI SPAWNED BY `verify-bloom-defaults-bar.mjs` (both arms), so
   no workflow file was edited.
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const H = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-harness.mjs')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const CONTROL = process.argv.includes('--control');
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);

export const ROWS = {
  default: {},
  stem: { stemLength: 60 },
  /* sepalHeight 1: the feet at the join's top, where they cover hub vertices
     (at the shipped 0.75 on a 6 mm stem they cover none — measured) */
  sepals: { stemLength: 60, sepalCount: 8, sepalHeight: 1 },
  umbel: { stemLength: 60, inflorescence: 'UMBEL', umbelHead: 'ON', umbelFlorets: 3 },
};
export const MUTANTS = [
  { id: 'pores-sunk-below-the-sheet', row: 'default', names: /^TXB1:/,
    edits: [['      s[i] = w0[i] * (mc[i] * (mp * (H * f)));', '      s[i] = w0[i] * (mc[i] * (mp * (H * (f - 0.25))));'],
      ['      const p1 = si > 0 ? [q[0] + n[0] * si, q[1] + n[1] * si, q[2] + n[2] * si] : q;', '      const p1 = si !== 0 ? [q[0] + n[0] * si, q[1] + n[1] * si, q[2] + n[2] * si] : q;']],
    witness: (rec) => ((rec.texture.organs.petal.bone.floorSamples || []).some((q) => q.s < 0) ? null : 'the mutated module sinks no pore floor below the sheet') },
  { id: 'a-typed-mask-list', row: 'stem', names: /^TXB2:/,
    edits: [['for (let i = 0; i < nV; i++) { const d = ridgeDist ? ridgeDist[i] : Infinity; mc[i] = d >= Lam ? 1 : rimEase(d / Lam); }', "for (let i = 0; i < nV; i++) { const d = ridgeDist ? ridgeDist[i] : Infinity; mc[i] = (['hub', 'stem'].includes(O.organ) ? 0 : 1) * (d >= Lam ? 1 : rimEase(d / Lam)); }"]],
    witness: (rec) => (rec.texture.organs.stem.bone.displaced === 0 ? null : 'the mutated module still relieves the stem') },
  { id: 'a-covered-underside-is-textured', row: 'default', names: /^TX12:/,
    edits: [['if (vis[i] && !(capability && capability.textureCoverageOff) && O.cover && textureVertexCoveredAny(', 'if (vis[i] && n[2] >= 0 && !(capability && capability.textureCoverageOff) && O.cover && textureVertexCoveredAny(']],
    witness: (rec, clean) => (rec.texture.organs.hub.bone.coveredUnder === 0 && clean.texture.organs.hub.bone.coveredUnder > 0 ? null : 'the underside is still covered on the mutated module') },
  { id: 'a-sepal-foot-is-ignored', row: 'sepals', names: /^TX12:/,
    edits: [['if (hubO) hubO.cover = [[0, petalTriEnd], ...(acc.triangleCount > sepalTris0 ? [[sepalTris0, acc.triangleCount]] : [])];', 'if (hubO) hubO.cover = [[0, petalTriEnd]];']],
    witness: (rec, clean) => (rec.texture.organs.hub.bone.covered < clean.texture.organs.hub.bone.covered ? null : 'the hub is covered as much without the sepal feet') },
  { id: 'floret-petals-in-their-own-frame', row: 'umbel', names: /^TXB5:/,
    edits: [['  if (pedicel) {\n    built.t5Deferred = { T, organs, smoothRods };', '  if (pedicel) {\n    boneReliefPass(acc, T, C.sheets, capability); organs.splice(0, C.sheets.length);\n    built.t5Deferred = { T, organs, smoothRods };']],
    witness: (rec) => (!rec.texture.organs['floret petal'] ? null : 'the parent still relieves the floret petals') },
  { id: 'emitter-order-moves-texture', row: null, names: /^TXB6:/,
    edits: [['    for (let c = 0; c < l.length; c += 2) per[l[c]].s[l[c + 1]] = ok ? sMin : 0;', '    for (let c = 2; c < l.length; c += 2) per[l[c]].s[l[c + 1]] = 0;']],
    witness: null },
];
const REORDER = ['  const styles = [];\n  if (fr.gynoecium && !headOff) styles.push(boneRodGroup(acc, \'style\', () => buildStyleInto(acc, fr.gynoecium)));', ''];
const REORDER_INTO = "  if (fr.androecium && !headOff) {\n    const A = fr.androecium;";

const SRC = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
const failures = [];
for (const mu of MUTANTS) for (const [from] of mu.edits) { const n = SRC.split(from).length - 1; if (n !== 1) failures.push(`${mu.id}: its anchor matches ${n} times in bloom-geometry.js (must be exactly once)`); }
for (const a of [REORDER[0], REORDER_INTO]) { const n = SRC.split(a).length - 1; if (n !== 1) failures.push(`the reorder control's anchor matches ${n} times`); }
if (failures.length) { for (const f of failures) console.error(`FAIL ${f}`); process.exit(1); }

const WDIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-bone-'));
async function moduleWith(tag, edits) {
  const d = path.join(WDIR, tag); fs.mkdirSync(d);
  let src = SRC; for (const [from, to] of edits) src = src.replace(from, to);
  fs.writeFileSync(path.join(d, 'bloom-geometry.js'), src);
  fs.copyFileSync(path.join(ROOT, 'bloom-curve.js'), path.join(d, 'bloom-curve.js'));
  return import(pathToFileURL(path.join(d, 'bloom-geometry.js')).href);
}
const CLEAN = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const stateOf = (row) => ({ ...DEFAULTS, petalTexture: 'BONE', ...ROWS[row] });
function build(G, ui, cap = null) { const acc = new G.MeshBuilder({ exportMode: true }); const rec = G.buildBloomInto(acc, ui, { below: null, capability: cap, scopes: null }); return { acc, rec }; }
/* every clause the browser gates carry, on a Node build of module G */
function clauses(G, row) {
  const ui = stateOf(row), opts = { below: null, capability: null, scopes: null };
  const { acc, rec } = build(G, ui);
  const twin = new G.MeshBuilder({ exportMode: true });
  const recU = G.buildBloomInto(twin, { ...ui, petalTexture: 'NONE' }, opts);
  const bad = [...H.boneRecordClauses(ui, rec.texture, null, rec),
    ...H.textureOrganClauses(ui, opts, true, rec.texture.organs, rec, acc, recU, twin, H.textureControlsRestated(ui), rec.texture.edgeMm, null),
    ...H.boneOrderClause(ui, opts, acc, G)];
  return { bad, rec, acc };
}
/* THE FIXTURE: two flat 4 x 4 mm sheets of one lattice, sharing their middle
   edge's vertices, both facing +z, the pass forward and reversed */
function fixture(G) {
  const T = G.textureFor({ ...DEFAULTS, petalTexture: 'BONE', bonePatchCoverage: 1 }, null);
  const sheet = (x0) => {
    const acc = new G.MeshBuilder({ exportMode: true });
    const P = [], N = [], wt = [], rel = [], tri = [];
    const n = 11, e = 0.4, id = (i, j) => i * n + j;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { P.push(x0 + i * e, j * e, 0.37); N.push(0, 0, 1); wt.push(1); rel.push(1); }
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < n - 1; j++) tri.push(id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j), id(i + 1, j + 1), id(i, j + 1));
    return { P, N: Float64Array.from(N), wt: Float64Array.from(wt), relievable: Uint8Array.from(rel), tri: Int32Array.from(tri), acc };
  };
  const A = sheet(0), B = sheet(4);   // A's last column is B's first: 11 shared positions
  const run = (order) => {
    const acc = new G.MeshBuilder({ exportMode: true });
    const organs = [];
    for (const S of [A, B]) {
      const from = acc.triangleCount;
      for (let t = 0; t < S.tri.length; t += 3) { const p = (k) => [S.P[S.tri[t + k] * 3], S.P[S.tri[t + k] * 3 + 1], S.P[S.tri[t + k] * 3 + 2]]; acc.tri(p(0), p(1), p(2)); }
      organs.push({ organ: S === A ? 'sheetA' : 'sheetB', sheet: true, from, to: acc.triangleCount, shippedTris: acc.triangleCount - from, refinedTris: acc.triangleCount - from, cavityTris: 0, tri: S.tri, P: S.P, N: S.N, wt: S.wt, relievable: S.relievable, normalFallback: 0 });
    }
    G.boneReliefPassForGate(acc, T, organs, order === 'reversed' ? { boneOrganOrder: 'reversed' } : null);
    return acc;
  };
  const f = run('forward'), r = run('reversed');
  let d = 0; for (let i = 0; i < f.triangleCount * 9; i++) if (!Object.is(f.positions[i], r.positions[i])) d++;
  /* and the shared positions are ONE double on both sheets (no crack) */
  let crack = 0;
  const at = new Map();
  for (let t = 0; t < A.tri.length / 3; t++) for (let c = 0; c < 3; c++) { const v = A.tri[t * 3 + c]; if (Math.round(A.P[v * 3] / 0.4) === 10) at.set(v - 110, [f.positions[t * 9 + c * 3], f.positions[t * 9 + c * 3 + 1], f.positions[t * 9 + c * 3 + 2]]); }
  const offB = A.tri.length / 3;
  for (let t = 0; t < B.tri.length / 3; t++) for (let c = 0; c < 3; c++) { const v = B.tri[t * 3 + c]; if (v < 11) { const a = at.get(v), b = [f.positions[(offB + t) * 9 + c * 3], f.positions[(offB + t) * 9 + c * 3 + 1], f.positions[(offB + t) * 9 + c * 3 + 2]]; if (a && a.some((x, k) => !Object.is(x, b[k]))) crack++; } }
  let raised = 0; for (const [, a] of at) if (a[2] > 0.37) raised++;
  return { moved: d, crack, raised };
}
function fixtureClauses(G) {
  const F = fixture(G), bad = [];
  if (!(F.raised > 0)) bad.push('TXB6: the fixture raises none of its shared positions — it cannot test the owner rule (vacuous)');
  if (F.moved) bad.push(`TXB6: on the fixture, the pass reversed moves ${F.moved} floats — the order decides the relief of a shared position`);
  if (F.crack) bad.push(`TXB6: on the fixture, ${F.crack} shared corners land on two different doubles — the shared edge CRACKS`);
  return bad;
}
/* the reorder control: style before stamens */
async function reorderControl() {
  const src = SRC.replace(REORDER[0], '').replace(REORDER_INTO, REORDER[0] + '\n' + REORDER_INTO);
  const d = path.join(WDIR, 'reorder'); fs.mkdirSync(d);
  fs.writeFileSync(path.join(d, 'bloom-geometry.js'), src);
  fs.copyFileSync(path.join(ROOT, 'bloom-curve.js'), path.join(d, 'bloom-curve.js'));
  const R = await import(pathToFileURL(path.join(d, 'bloom-geometry.js')).href);
  const ui = { ...DEFAULTS, petalTexture: 'BONE', stemLength: 60, stamenCount: 12, gynoecium: 'STYLE', bonePatchCoverage: 1, boneCurvature: 4 };
  const a = build(CLEAN, ui).acc, b = build(R, ui).acc;
  const tris = (acc) => { const L = []; for (let t = 0; t < acc.triangleCount; t++) L.push(Array.from(acc.positions.subarray ? acc.positions.subarray(t * 9, t * 9 + 9) : acc.positions.slice(t * 9, t * 9 + 9)).join(',')); return L.sort(); };
  const A = tris(a), B = tris(b);
  if (A.length !== B.length) return [`the reorder control: ${A.length} triangles against ${B.length}`];
  let diff = 0; for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) diff++;
  /* the control must reach a relieved rod, or it says nothing about order */
  const r = build(R, ui).rec;
  const rodRaised = (r.texture.organs.stamen && r.texture.organs.stamen.bone.displaced) || 0;
  const out = [];
  if (!(rodRaised > 0)) out.push('the reorder control relieves no stamen — it cannot see an order (vacuous)');
  if (diff) out.push(`TXB6: emitting the style before the stamens moves ${diff} of ${A.length} triangles — an emitter's place in the stream decides the texture`);
  return out;
}

try {
  if (!CONTROL) {
    for (const row of Object.keys(ROWS)) {
      const t0 = Date.now();
      const { bad } = clauses(CLEAN, row);
      for (const b of bad) failures.push(`clean ${row}: ${b}`);
      console.log(`clean ${row}: ${bad.length ? `${bad.length} finding(s)` : 'silent'} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    }
    for (const b of fixtureClauses(CLEAN)) failures.push(`clean fixture: ${b}`);
    console.log(`clean fixture: ${fixtureClauses(CLEAN).length ? 'FINDINGS' : 'the owner rule holds forward and reversed'}`);
    const rc = await reorderControl();
    for (const b of rc) failures.push(`reorder control: ${b}`);
    console.log(`reorder control (the style emitted before the stamens): ${rc.length ? 'FINDINGS' : 'the same triangles, the texture unmoved'}`);
  } else {
    for (const mu of MUTANTS) {
      if (ONLY.length && !ONLY.includes(mu.id)) continue;
      const M = await moduleWith(mu.id, mu.edits);
      let bad;
      if (mu.row === null) bad = fixtureClauses(M);
      else {
        const res = clauses(M, mu.row);
        const w = mu.witness(res.rec, build(CLEAN, stateOf(mu.row)).rec);
        if (w) { failures.push(`${mu.id}: WITNESS — ${w} (the mutation is inert; its clause's silence would say nothing)`); continue; }
        bad = res.bad;
      }
      const hit = bad.filter((b) => mu.names.test(b.replace(/^\(Node rebuild\) /, '')));
      console.log(`${mu.id}: ${hit.length ? `FIRED ${hit[0].slice(0, 150)}` : 'MISSED'}`);
      if (!hit.length) failures.push(`${mu.id}: its clause (${mu.names}) stayed silent${bad.length ? ` — other findings: ${bad.slice(0, 2).join(' | ')}` : ''}`);
    }
  }
} finally { fs.rmSync(WDIR, { recursive: true, force: true }); }
if (failures.length) { console.error('\nverify-bloom-bone: FAILED'); for (const f of failures) console.error(`  - ${f}`); process.exit(1); }
console.log(`verify-bloom-bone: ${CONTROL ? 'every mutant fired the clause it names' : 'PASS — every clause silent on the clean tree, the fixture and the reorder control hold'}`);
