// Generates assets/print-test/flower-test-bundle.glb — a STAND-IN test bundle
// for the /print scaffold, shaped like the eventual real export: a bloom mesh,
// a stem mesh, and an empty `pivot` node whose `extras` carry the junction
// position, the stem tangent at that junction, and the hinge rotation limits.
//
// It exists so the scaffold is provably end-to-end (loader -> scene -> extras
// round-trip) before the real flower export lands. Drop the real
// flower-test-bundle.glb over it at the same path; print.js needs no change.
//
//   node tools/gen-print-test-bundle.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = 'assets/print-test/flower-test-bundle.glb';

// --- primitive builders (positions + normals + indices, all mm) -------------
function uvSphere(rx, ry, rz, cx, cy, cz, seg = 32, ring = 20) {
  const P = [], N = [], I = [];
  for (let i = 0; i <= ring; i++) {
    const v = (i / ring) * Math.PI, sv = Math.sin(v), cv = Math.cos(v);
    for (let j = 0; j <= seg; j++) {
      const u = (j / seg) * Math.PI * 2, su = Math.sin(u), cu = Math.cos(u);
      const nx = sv * cu, ny = cv, nz = sv * su;
      P.push(cx + rx * nx, cy + ry * ny, cz + rz * nz);
      const l = Math.hypot(nx / rx, ny / ry, nz / rz) || 1;
      N.push(nx / rx / l, ny / ry / l, nz / rz / l);
    }
  }
  const row = seg + 1;
  for (let i = 0; i < ring; i++) for (let j = 0; j < seg; j++) {
    const a = i * row + j, b = a + row;
    I.push(a, b, a + 1, a + 1, b, b + 1);
  }
  return { P, N, I };
}

function cylinder(r, y0, y1, seg = 24) {
  const P = [], N = [], I = [];
  for (let j = 0; j <= seg; j++) {
    const u = (j / seg) * Math.PI * 2, cu = Math.cos(u), su = Math.sin(u);
    P.push(r * cu, y0, r * su); N.push(cu, 0, su);
    P.push(r * cu, y1, r * su); N.push(cu, 0, su);
  }
  for (let j = 0; j < seg; j++) {
    const a = j * 2;
    I.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
  }
  // end caps, so the stand-in is a closed solid like the real export will be
  for (const [y, ny] of [[y0, -1], [y1, 1]]) {
    const c = P.length / 3;
    P.push(0, y, 0); N.push(0, ny, 0);
    const first = P.length / 3;
    for (let j = 0; j <= seg; j++) {
      const u = (j / seg) * Math.PI * 2;
      P.push(r * Math.cos(u), y, r * Math.sin(u)); N.push(0, ny, 0);
    }
    for (let j = 0; j < seg; j++) {
      const a = first + j, b = first + j + 1;
      if (ny > 0) I.push(c, a, b); else I.push(c, b, a);
    }
  }
  return { P, N, I };
}

// --- the model -------------------------------------------------------------
const JUNCTION = [0, 40, 0];              // where the stem meets the bloom
const TANGENT = [0, 1, 0];                // stem direction at the junction
const bloom = uvSphere(22, 15, 22, 0, 52, 0);
const stem = cylinder(2.6, 0, 40);

// --- pack into one GLB -----------------------------------------------------
const chunks = [], views = [], accessors = [], meshes = [];
let off = 0;
const pad4 = n => (4 - (n % 4)) % 4;
function push(buf, target) {
  const p = pad4(off);
  if (p) { chunks.push(Buffer.alloc(p)); off += p; }
  views.push({ buffer: 0, byteOffset: off, byteLength: buf.length, ...(target ? { target } : {}) });
  chunks.push(buf); off += buf.length;
  return views.length - 1;
}
function minmax(a, n) {
  const mn = Array(n).fill(Infinity), mx = Array(n).fill(-Infinity);
  for (let i = 0; i < a.length; i += n) for (let k = 0; k < n; k++) {
    mn[k] = Math.min(mn[k], a[i + k]); mx[k] = Math.max(mx[k], a[i + k]);
  }
  return { min: mn, max: mx };
}
function addMesh(name, { P, N, I }, material) {
  const fp = new Float32Array(P), fn = new Float32Array(N), ui = new Uint32Array(I);
  const vP = push(Buffer.from(fp.buffer, fp.byteOffset, fp.byteLength), 34962);
  const vN = push(Buffer.from(fn.buffer, fn.byteOffset, fn.byteLength), 34962);
  const vI = push(Buffer.from(ui.buffer, ui.byteOffset, ui.byteLength), 34963);
  const mm = minmax(P, 3);
  accessors.push({ bufferView: vP, componentType: 5126, count: P.length / 3, type: 'VEC3', min: mm.min, max: mm.max });
  accessors.push({ bufferView: vN, componentType: 5126, count: N.length / 3, type: 'VEC3' });
  accessors.push({ bufferView: vI, componentType: 5125, count: I.length, type: 'SCALAR' });
  const a = accessors.length - 3;
  meshes.push({ name, primitives: [{ attributes: { POSITION: a, NORMAL: a + 1 }, indices: a + 2, material }] });
  return meshes.length - 1;
}

const mBloom = addMesh('bloom', bloom, 0);
const mStem = addMesh('stem', stem, 1);
const bin = Buffer.concat(chunks);

const gltf = {
  asset: { version: '2.0', generator: 'gen-print-test-bundle.mjs (stand-in)' },
  scene: 0,
  scenes: [{ nodes: [0, 1, 2] }],
  nodes: [
    { name: 'bloom', mesh: mBloom },
    { name: 'stem', mesh: mStem },
    {
      name: 'pivot',
      translation: JUNCTION,
      extras: {
        junction: JUNCTION,
        tangent: TANGENT,
        rotation_limits_deg: { pitch: [-35, 35], yaw: [-180, 180], roll: [-20, 20] }
      }
    }
  ],
  materials: [
    { name: 'bloom', pbrMetallicRoughness: { baseColorFactor: [0.85, 0.62, 0.70, 1], metallicFactor: 0, roughnessFactor: 0.75 } },
    { name: 'stem', pbrMetallicRoughness: { baseColorFactor: [0.36, 0.55, 0.42, 1], metallicFactor: 0, roughnessFactor: 0.85 } }
  ],
  meshes, accessors, bufferViews: views,
  buffers: [{ byteLength: bin.length }]
};

const json = Buffer.from(JSON.stringify(gltf), 'utf8');
const jsonPad = Buffer.concat([json, Buffer.alloc(pad4(json.length), 0x20)]);
const binPad = Buffer.concat([bin, Buffer.alloc(pad4(bin.length), 0)]);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonPad.length + 8 + binPad.length, 8);
const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b; };
const glb = Buffer.concat([header, ch(jsonPad.length, 0x4e4f534a), jsonPad, ch(binPad.length, 0x004e4942), binPad]);

mkdirSync('assets/print-test', { recursive: true });
writeFileSync(OUT, glb);
console.log(`wrote ${OUT} — ${glb.length} bytes, ${meshes.length} meshes, pivot extras attached`);
