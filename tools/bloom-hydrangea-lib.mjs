/* ===================================================================
   tools/bloom-hydrangea-lib.mjs — the instruments behind
   docs/bloom-hydrangea-discovery.md (the mophead hydrangea discovery, Oct 24).
   MEASUREMENT ONLY: nothing here is imported by the generator, and nothing
   here changes a byte it emits.

   `loadVariant({ nu, nv, k })` imports a PATCHED COPY of the shipped
   `bloom-geometry.js` written into a scratch directory under the OS temp dir
   (NEVER the repo — the rim-roundness lab's precedent,
   tools/bloom-rim-roundness-lib.mjs), with three knobs:
     nu — `NU_BASE`, the blade row count (56 shipped). In the copy it reaches
          every reader of NU_BASE (petals, sepals, leaves, rods), which is what
          a FLORET-ONLY row count would be once a floret is built on its own:
          the prototype builds a floret unit from the copy and the receptacle
          from the shipped module, so nothing but the floret sees the knob.
     nv — `NV`, the columns across one span (10 shipped; kept EVEN so no
          column lies on the midrib — the same reasoning as the shipped 10).
     k  — `RIM_BEAD_SEGMENTS`, the bead's segment cap (4 shipped).
     sectors — `HUB_SECTORS` (48 shipped), the round count of the hub, every
          stem and pedicel, and the umbel boss.
     depth2 — lifts `floretState`'s inflorescence pin ONE level (below).
   Each variant is its own module instance (a distinct file), so two variants
   never share a constant. The patch REFUSES if an anchor does not match
   exactly once — a disarmed patch would measure the shipped tree and label it
   the variant. With every knob at its shipped value the copy is the shipped
   text byte for byte (asserted).

   Also here, so the measure script and the sheet share ONE owner of each:
     * `sphereLattice(n)` — the SPHERE head's equal-area polar law (cos phi
       linear in the slot index, 2/K a step, the golden angle in azimuth),
       restated for n slots over a whole ball;
     * `placeUnit()` — a rigid frame taking a floret built at the origin with
       +z its axis onto a point and an outward normal, through the shipped
       `MeshBuilder.appendTransformed`;
     * `edgeCensus()` — boundary / non-manifold / directed-mismatch edges on a
       triangle soup welded by exact position;
     * `icosphere()` — a closed sphere for the prototypes' hidden receptacle.
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
let SCRATCH = null;
function scratch() {
  if (SCRATCH) return SCRATCH;
  SCRATCH = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-hydrangea-'));
  /* bloom-geometry.js imports ./bloom-curve.js, so a copy written beside it needs the sampler too */
  fs.copyFileSync(path.join(ROOT, 'bloom-curve.js'), path.join(SCRATCH, 'bloom-curve.js'));
  return SCRATCH;
}
function replaceOnce(src, from, to) {
  const n = src.split(from).length - 1;
  if (n !== 1) throw new Error(`patch anchor matched ${n} times, want 1: ${from}`);
  return src.replace(from, to);
}
const cache = new Map();
export async function loadVariant({ nu = 56, nv = 10, k = 4, depth2 = false, sectors = 48 } = {}) {
  const key = `${nu}-${nv}-${k}-${depth2}-${sectors}`;
  if (cache.has(key)) return cache.get(key);
  if (nv % 2) throw new Error(`nv must be even (no column on the midrib), got ${nv}`);
  let s = SRC;
  s = replaceOnce(s, 'const NU_BASE = 56;', `const NU_BASE = ${nu};`);
  s = replaceOnce(s, 'const NV = 10;', `const NV = ${nv};`);
  s = replaceOnce(s, 'export const RIM_BEAD_SEGMENTS = 4;', `export const RIM_BEAD_SEGMENTS = ${k};`);
  /* `sectors` — HUB_SECTORS, the round count of the hub, the stem and the umbel
     boss (48 shipped): the knob for a LIGHTER PEDICEL. The leaf's petiole is a
     12-gon already. */
  s = replaceOnce(s, 'export const HUB_SECTORS = 48;', `export const HUB_SECTORS = ${sectors};`);
  /* DEPTH 2 — THE COMPOUND UMBEL, through the shipped inflorescence path
     itself. `floretState` pins `inflorescence: 'NONE'` (PEDICEL_PINS: "a
     floret is one flower, never a raceme of its own"); the copy lifts that pin
     ONE LEVEL, so each floret of the primary umbel is built as a headless
     UMBEL of its own — its own stem IS the primary ray, its own boss and
     pedicels and florets are the shipped umbel's. The secondary level's three
     numbers (count, pedicel length, angle) are read at build time from
     `globalThis.__hydrangeaDepth2`; the inner state is marked so it does not
     recurse again (the flower's bud capped its recursion at one the same way). */
  if (depth2) s = replaceOnce(s, '    ...PEDICEL_PINS,\n    petalCount: plan.floretPetals,',
    "    ...PEDICEL_PINS,\n    ...((globalThis.__hydrangeaDepth2 && !state.__hydrangeaInner) ? { inflorescence: 'UMBEL', umbelHead: 'OFF', __hydrangeaInner: true, ...globalThis.__hydrangeaDepth2 } : {}),\n    petalCount: plan.floretPetals,");
  if (nu === 56 && nv === 10 && k === 4 && sectors === 48 && !depth2 && s !== SRC) throw new Error('the identity variant is not the shipped text');
  const f = path.join(scratch(), `geo-nu${nu}-nv${nv}-k${k}-s${sectors}${depth2 ? '-d2' : ''}.mjs`);
  fs.writeFileSync(f, s);
  const mod = import(pathToFileURL(f).href);
  cache.set(key, mod);
  return mod;
}
export const shipped = () => import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
export const registry = () => import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);

export function coerce(st) {
  for (const k of Object.keys(st)) if (typeof st[k] === 'string' && st[k] !== '' && !isNaN(Number(st[k]))) st[k] = Number(st[k]);
  return st;
}
/* One whole build through the module handed in. */
export function build(G, DEFAULTS, set, { exportMode = true, captureGrid = false } = {}) {
  const st = coerce({ ...DEFAULTS, ...set });
  const acc = new G.MeshBuilder({ exportMode, captureGrid });
  const b = G.buildBloomInto(acc, st, { below: null });
  return { st, acc, b, tris: acc.triangleCount };
}

/* THE FLORET the whole discovery is about: four petals at the petal range's
   floor (20 x 8 mm — `OVERRIDE_BOUNDS`, so the shipped `floretScale` cannot
   reach smaller), the flat hub, no stem (`stemLength` 0). Everything else is
   DEFAULTS, which carry no stamen, style, sepal, leaf or texture. */
export const FLORET = Object.freeze({ petalCount: 4, petalLength: 20, petalWidth: 8 });

/* THE SPHERE HEAD'S EQUAL-AREA LAW over a whole ball: slot i of n has
   cos(phi) = 1 - (2i + 1)/n (equal-area bands of 2/n each, pole to pole) and
   azimuth i * GOLDEN_ANGLE. The shipped head reserves one step at its stem
   pole; `reserve` drops the slots within that many steps of the -z pole, which
   is where the stem channel would be. */
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
export function sphereLattice(n, { reserveBottom = 0 } = {}) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const c = 1 - (2 * i + 1) / n;
    const s = Math.sqrt(Math.max(0, 1 - c * c));
    const a = i * GOLDEN_ANGLE;
    const p = [s * Math.cos(a), s * Math.sin(a), c];
    if (i >= n - reserveBottom) continue;
    out.push({ index: i, n: p, azimuth: a });
  }
  return out;
}
/* A rigid 3x4 row-major matrix taking local +z onto `d` (unit), local +x onto
   a vector perpendicular to it (chosen from `roll`), and the origin onto `o`. */
export function frameMatrix(o, d, roll = 0) {
  const ref = Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  let x = cross(ref, d); x = nrm(x);
  let y = cross(d, x);
  const c = Math.cos(roll), s = Math.sin(roll);
  const X = [x[0] * c + y[0] * s, x[1] * c + y[1] * s, x[2] * c + y[2] * s];
  const Y = cross(d, X);
  return [X[0], Y[0], d[0], o[0], X[1], Y[1], d[1], o[1], X[2], Y[2], d[2], o[2]];
}
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const nrm = (a) => { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; };

/* A closed icosphere, outward-wound, radius r about c, `sub` subdivisions. */
export function icosphere(r, c = [0, 0, 0], sub = 3) {
  const t = (1 + Math.sqrt(5)) / 2;
  let V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(nrm);
  let F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  for (let s = 0; s < sub; s++) {
    const mid = new Map(); const NF = [];
    const m = (a, b) => { const k = a < b ? `${a},${b}` : `${b},${a}`; if (!mid.has(k)) { V.push(nrm([(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2, (V[a][2] + V[b][2]) / 2])); mid.set(k, V.length - 1); } return mid.get(k); };
    for (const [a, b, cc] of F) { const ab = m(a, b), bc = m(b, cc), ca = m(cc, a); NF.push([a, ab, ca], [b, bc, ab], [cc, ca, bc], [ab, bc, ca]); }
    F = NF;
  }
  const pos = new Float64Array(F.length * 9);
  F.forEach((f, i) => f.forEach((v, j) => { for (let k = 0; k < 3; k++) pos[i * 9 + j * 3 + k] = c[k] + r * V[v][k]; }));
  return pos;
}

/* EDGES, welded by exact position: an undirected edge with one face is a
   boundary edge, with three or more non-manifold; a directed edge whose
   reverse is missing is a winding mismatch (analyzeStl's census is undirected
   by construction, so this is the stronger of the two). */
export function edgeCensus(positions) {
  const id = new Map(); const vk = (o) => `${positions[o]},${positions[o + 1]},${positions[o + 2]}`;
  const vix = (o) => { const k = vk(o); let i = id.get(k); if (i === undefined) { i = id.size; id.set(k, i); } return i; };
  const und = new Map(), dir = new Map();
  const nTri = positions.length / 9; let degenerate = 0;
  for (let t = 0; t < nTri; t++) {
    const v = [vix(t * 9), vix(t * 9 + 3), vix(t * 9 + 6)];
    if (v[0] === v[1] || v[1] === v[2] || v[0] === v[2]) { degenerate++; continue; }
    for (let e = 0; e < 3; e++) {
      const a = v[e], b = v[(e + 1) % 3];
      const u = a < b ? `${a},${b}` : `${b},${a}`;
      und.set(u, (und.get(u) || 0) + 1);
      const d = `${a},${b}`; dir.set(d, (dir.get(d) || 0) + 1);
    }
  }
  let boundary = 0, nonManifold = 0, directedMismatch = 0;
  for (const c of und.values()) { if (c === 1) boundary++; else if (c > 2) nonManifold++; }
  for (const [d, c] of dir) { const [a, b] = d.split(','); if ((dir.get(`${b},${a}`) || 0) !== c) directedMismatch++; }
  return { boundary, nonManifold, directedMismatch, degenerate, vertices: id.size };
}

/* SHELLS by vertex weld (union-find over exact positions) — counted, never
   used as the connectedness test (CLAUDE.md: the voxel flood fill is the
   authority); reported beside the voxel count below. */
export function shellCount(positions) {
  const id = new Map(); const par = [];
  const f = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  const vix = (o) => { const k = `${positions[o]},${positions[o + 1]},${positions[o + 2]}`; let i = id.get(k); if (i === undefined) { i = par.length; id.set(k, i); par.push(i); } return i; };
  const nTri = positions.length / 9;
  for (let t = 0; t < nTri; t++) { const a = f(vix(t * 9)), b = f(vix(t * 9 + 3)), c = f(vix(t * 9 + 6)); par[a] = b; par[f(c)] = b; }
  const roots = new Set(); for (let i = 0; i < par.length; i++) roots.add(f(i));
  return roots.size;
}

/* VOXEL CONNECTEDNESS — the surface-occupancy flood fill the shipped gates
   use, in miniature: every triangle is sampled densely enough that no gap
   between samples exceeds the cell, occupied cells are flood-filled with
   26-connectivity, and the number of regions is the answer. A sampled surface
   test, not a solid one: two closed shells that interpenetrate share cells
   where they cross, which is exactly the "overlapping closed shells are fine"
   contract. `cell` in mm. */
export function voxelRegions(positions, cell = 0.6) {
  const nTri = positions.length / 9;
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], positions[i + k]); hi[k] = Math.max(hi[k], positions[i + k]); }
  const dim = [0, 1, 2].map((k) => Math.max(1, Math.ceil((hi[k] - lo[k]) / cell) + 2));
  const occ = new Set();
  const put = (x, y, z) => occ.add((Math.floor((x - lo[0]) / cell) + 1) + dim[0] * ((Math.floor((y - lo[1]) / cell) + 1) + dim[1] * (Math.floor((z - lo[2]) / cell) + 1)));
  for (let t = 0; t < nTri; t++) {
    const o = t * 9; const A = [positions[o], positions[o + 1], positions[o + 2]], B = [positions[o + 3], positions[o + 4], positions[o + 5]], C = [positions[o + 6], positions[o + 7], positions[o + 8]];
    const L = Math.max(Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]), Math.hypot(C[0] - A[0], C[1] - A[1], C[2] - A[2]), Math.hypot(C[0] - B[0], C[1] - B[1], C[2] - B[2]));
    const m = Math.max(1, Math.ceil((L / cell) * 2));
    for (let i = 0; i <= m; i++) for (let j = 0; j <= m - i; j++) {
      const u = i / m, v = j / m, w = 1 - u - v;
      put(A[0] * w + B[0] * u + C[0] * v, A[1] * w + B[1] * u + C[1] * v, A[2] * w + B[2] * u + C[2] * v);
    }
  }
  const seen = new Set(); let regions = 0; const sizes = [];
  for (const start of occ) {
    if (seen.has(start)) continue; regions++; let size = 0;
    const stack = [start]; seen.add(start);
    while (stack.length) {
      const c = stack.pop(); size++;
      const x = c % dim[0], y = Math.floor(c / dim[0]) % dim[1], z = Math.floor(c / (dim[0] * dim[1]));
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dy && !dz) continue;
        const n = (x + dx) + dim[0] * ((y + dy) + dim[1] * (z + dz));
        if (occ.has(n) && !seen.has(n)) { seen.add(n); stack.push(n); }
      }
    }
    sizes.push(size);
  }
  sizes.sort((a, b) => b - a);
  return { regions, cells: occ.size, largestShare: sizes[0] / occ.size, sizes: sizes.slice(0, 5) };
}
