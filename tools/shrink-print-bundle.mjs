// Shrink a /print test bundle: weld one mesh by position, index it, and
// optionally decimate it with meshoptimizer.
//
//   node tools/shrink-print-bundle.mjs <in.glb> <out.glb> [--mesh bloom] [--ratio 0.25]
//
// WHY THIS EXISTS. `bloom-stem-leaf-bundle.glb` arrived as a 21.7 MB export:
// 301,152 triangles of real bloom, NON-INDEXED, with a per-face NORMAL beside
// every position. Committed as-is it is permanent — CLAUDE.md forbids history
// rewriting — and the same triangle count is what puts the tonal fill's worst
// case at 1.3 s a frame. It is a test FIXTURE and does not need that resolution
// for either job, so it is reduced here, once, deliberately, and reported.
//
// TWO SEPARATE STEPS, and only the second one loses anything:
//
//   1. WELD + INDEX is EXACTLY LOSSLESS and does most of the work. The mesh is
//      an STL split, so every triangle carries its own three vertices; welding
//      by exact position is the same operation print-lines.js's Topology does
//      at load, and it yields IDENTICAL topology (measured: 301,152 triangles,
//      151,060 welded vertices, 451,728 edges, 0 boundary, 0 non-manifold —
//      before and after). It takes the bloom's buffer from 21.7 MB to 5.4 MB.
//      Welding is only possible because NORMAL is dropped first: with a
//      per-face normal on every vertex, two vertices at the same position
//      differ and nothing merges. Normals are regenerated afterwards, per
//      vertex, so the mesh still renders in any viewer — /print itself never
//      reads the bloom's normals (only print-stem.js reads a normal attribute,
//      and only from the stem), but the STYLIZE toggle restores the glTF's own
//      lit material and a mesh with no normals goes black there.
//
//   2. DECIMATION is meshoptimizer's simplifier with LockBorder, and it does
//      lose something. What it loses, measured on this mesh:
//
//        ratio  triangles  error     boundary  non-manifold  buffer
//        1.00     301,152  —                0             0  5.43 MB
//        0.50     150,576  1.29e-4          0            25  2.72 MB
//        0.25      75,288  3.96e-4          0             5  1.36 MB
//        0.12      36,138  9.13e-4          0            18  0.66 MB
//        0.06      18,068  2.07e-3          0            50  0.33 MB
//
//      `error` is relative to the mesh extent, so 3.96e-4 on a ~95 mm bloom is
//      about 0.04 mm. The border stays closed at every ratio; what goes is the
//      exported bloom's "0 non-manifold edges" property, which was documented
//      as a fixture virtue and is not asserted by any gate.
//
// This tool is committed for the same reason the preset-thumbnail generator is:
// so what was done to someone's export is a readable, re-runnable statement and
// not a remembered one. Running it AGAIN on its own output decimates twice —
// point it at the original.

import { NodeIO, VertexLayout } from '@gltf-transform/core';
import { MeshoptSimplifier } from 'meshoptimizer';
import { statSync } from 'node:fs';

const args = process.argv.slice(2);
const [SRC, DST] = args.filter(a => !a.startsWith('--'));
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : dflt; };
if (!SRC || !DST) {
  console.error('usage: node tools/shrink-print-bundle.mjs <in.glb> <out.glb> [--mesh bloom] [--ratio 0.25]');
  process.exit(2);
}
const MESH = opt('mesh', 'bloom');
const RATIO = parseFloat(opt('ratio', '0.25'));

// The same weld-by-position topology report print-lines.js recovers at load —
// stated here so "lossless" is a measurement and not a claim.
function topo(pos, idx) {
  const key = new Map(), canon = new Int32Array(pos.length / 3), Q = 1e5;
  for (let i = 0; i < pos.length / 3; i++) {
    const k = `${Math.round(pos[i * 3] * Q)},${Math.round(pos[i * 3 + 1] * Q)},${Math.round(pos[i * 3 + 2] * Q)}`;
    let c = key.get(k);
    if (c === undefined) { c = key.size; key.set(k, c); }
    canon[i] = c;
  }
  const tri = idx ? idx.length / 3 : pos.length / 9;
  const edges = new Map();
  for (let f = 0; f < tri; f++) {
    const a = canon[idx ? idx[f * 3] : f * 3];
    const b = canon[idx ? idx[f * 3 + 1] : f * 3 + 1];
    const c = canon[idx ? idx[f * 3 + 2] : f * 3 + 2];
    for (const [u, v] of [[a, b], [b, c], [c, a]]) {
      const k = u < v ? `${u}_${v}` : `${v}_${u}`;
      edges.set(k, (edges.get(k) || 0) + 1);
    }
  }
  let boundary = 0, nm = 0;
  for (const v of edges.values()) { if (v === 1) boundary++; else if (v > 2) nm++; }
  return { tri, verts: key.size, edges: edges.size, boundary, nm };
}

await MeshoptSimplifier.ready;
// SEPARATE, NOT INTERLEAVED, and this is not a preference. gltf-transform
// interleaves vertex attributes by default (one bufferView, byteStride 24,
// NORMAL at offset 12), and the whole /print pipeline reads
// `geometry.getAttribute('position').array` as a tightly packed Float32Array —
// print-lines.js's Topology, print-infill.js's _projectPart, and the gate's
// projectedTriangles() hook all index it directly, which is exactly why the
// extraction is affordable. Against an interleaved buffer that array is the
// WHOLE vertex block, so a 84-triangle leaf reads as 168 triangles of nonsense:
// measured, the leaf came back with 2 silhouette edges and filled to nothing.
// Writing SEPARATE keeps the bundle byte-shaped the way the exporter's own
// output was. THE FRAGILITY IS REAL AND IS NOT FIXED HERE — any interleaved
// .glb dropped on the page today would misbehave the same way, and making the
// extractor interleave-safe is its own change to a hot path.
const io = new NodeIO().setVertexLayout(VertexLayout.SEPARATE);
const doc = await io.read(SRC);
const mesh = doc.getRoot().listMeshes().find(m => m.getName() === MESH);
if (!mesh) { console.error(`no mesh named "${MESH}"`); process.exit(2); }
const prim = mesh.listPrimitives()[0];
const P0 = prim.getAttribute('POSITION').getArray();

console.log(`${SRC}  ${(statSync(SRC).size / 1e6).toFixed(2)} MB`);
console.log(`  ${MESH} as exported   ${JSON.stringify(topo(P0, null))}`);

// --- weld by EXACT position, and index -------------------------------------
const map = new Map(), verts = [], idx0 = new Uint32Array(P0.length / 3);
for (let i = 0; i < P0.length / 3; i++) {
  const k = `${P0[i * 3]},${P0[i * 3 + 1]},${P0[i * 3 + 2]}`;
  let v = map.get(k);
  if (v === undefined) { v = verts.length / 3; map.set(k, v); verts.push(P0[i * 3], P0[i * 3 + 1], P0[i * 3 + 2]); }
  idx0[i] = v;
}
let pos = new Float32Array(verts), idx = idx0;
console.log(`  welded + indexed  ${JSON.stringify(topo(pos, idx))}`);

// --- decimate ---------------------------------------------------------------
if (RATIO < 1) {
  const target = Math.floor(idx.length * RATIO / 3) * 3;
  const [out, error] = MeshoptSimplifier.simplify(idx, pos, 3, target, 0.02, ['LockBorder']);
  const used = new Map(), np = [], ni = new Uint32Array(out.length);
  for (let i = 0; i < out.length; i++) {
    let v = used.get(out[i]);
    if (v === undefined) {
      v = np.length / 3; used.set(out[i], v);
      np.push(pos[out[i] * 3], pos[out[i] * 3 + 1], pos[out[i] * 3 + 2]);
    }
    ni[i] = v;
  }
  pos = new Float32Array(np); idx = ni;
  console.log(`  decimated x${RATIO}   ${JSON.stringify(topo(pos, idx))}  relative error ${error.toExponential(2)}`);
}

// --- normals, per vertex ----------------------------------------------------
// Area-weighted, so the mesh renders under the glTF's own lit material when the
// line-art toggle is off. Smooth rather than the export's per-face flat, which
// welding is what forbids; nothing in /print reads them.
const nrm = new Float32Array(pos.length);
for (let f = 0; f < idx.length; f += 3) {
  const a = idx[f] * 3, b = idx[f + 1] * 3, c = idx[f + 2] * 3;
  const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
  const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  for (const o of [a, b, c]) { nrm[o] += nx; nrm[o + 1] += ny; nrm[o + 2] += nz; }
}
for (let i = 0; i < nrm.length; i += 3) {
  const l = Math.hypot(nrm[i], nrm[i + 1], nrm[i + 2]) || 1;
  nrm[i] /= l; nrm[i + 1] /= l; nrm[i + 2] /= l;
}

const buffer = doc.getRoot().listBuffers()[0];
for (const name of ['POSITION', 'NORMAL']) {
  const a = prim.getAttribute(name);
  if (a) { prim.setAttribute(name, null); a.dispose(); }
}
prim.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buffer));
prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(nrm).setBuffer(buffer));
prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(idx).setBuffer(buffer));

await io.write(DST, doc);
console.log(`${DST}  ${(statSync(DST).size / 1e6).toFixed(2)} MB`
  + `  (was ${(statSync(SRC).size / 1e6).toFixed(2)} MB)`);
