#!/usr/bin/env node
/* THE PREFORM LADDER — BONE v2 full-detail STLs of ONE design at a ladder of
   triangle caps, for Eva to load into PreForm (Formlabs Fuse) and find the
   real ceiling the provisional 2.0 M EXPORT_TRI_CAP stands in for.

     node tools/bloom-preform-ladder.mjs <outdir> [--design default|umbel]
          [--caps 1500000,2000000,...] [--manifest <file.json>]

   ONLY THE CAP VARIES. Each rung builds the same design (the registry's
   DEFAULTS with petalTexture BONE, plus the design's own controls) in EXPORT
   mode with full detail, the allocator handed the rung through the
   `boneFullCapTris` capability lever — the same lever the TXB mutant table
   uses, read by `bone2FullWrite` and by nothing else — and writes the binary
   STL the page's own exporter would (80-byte header, count, 50 bytes a
   triangle; normals left zero, as three's STLExporter computes them per
   face and PreForm recomputes them anyway). The file is named with its
   triangle count and size in MB, so a rung that loads, slices or fails in
   PreForm names its own number.

   A RUNG ABOVE A DESIGN'S ALL-FULL COUNT CANNOT BE REACHED BY THE CAP: the
   allocator then puts full detail on every porous cell and stops, so the
   file is the design's ceiling, not the rung. That is reported (`ceiling`)
   rather than padded. The default bloom's ceiling is ~2.30 M, so the brief's
   3.0 / 4.5 / 6.0 M rungs come from the umbel (head ON on a 60 mm stem,
   all-full ~6.2 M) — a second design, flagged, never a different cap rule.

   Each rung also prints its census on the written float32s: shells (vertex-
   welded), open (unmatched directed) edges, doubled edges and degenerate
   triangles, so a rung that PreForm refuses can be told apart from one this
   tool built badly. The STLs are committed NOWHERE (the brief: too large for
   the repository). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const G = await import(path.join(ROOT, 'bloom-geometry.js'));
const { DEFAULTS } = await import(path.join(ROOT, 'bloom-registry.js'));

const argv = process.argv.slice(2);
const argOf = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const OUT = argv[0] && !argv[0].startsWith('--') ? argv[0] : null;
if (!OUT && !argOf('--census')) { console.error('usage: node tools/bloom-preform-ladder.mjs <outdir> [--design default|umbel] [--caps a,b,...] [--manifest f]'); process.exit(2); }
const DESIGNS = {
  default: { name: 'default', set: {} },
  umbel: { name: 'umbel', set: { inflorescence: 'UMBEL', umbelHead: 'ON', stemLength: 60 } },
};
const design = DESIGNS[argOf('--design', 'default')];
if (!design) { console.error(`--design: one of ${Object.keys(DESIGNS).join(', ')}`); process.exit(2); }
const caps = (argOf('--caps', '1500000,2000000,3000000,4500000,6000000')).split(',').map(Number);
if (OUT) fs.mkdirSync(OUT, { recursive: true });

/* The directed-edge census on SORTED TYPED ARRAYS, never a Map: a Map holds at
   most ~16.7 M entries and the 6.0 M rung has 17.8 M directed edges (it threw
   there). A key is u * 2^26 + v, exact in a double for under 67 M vertices. */
function census(P) {
  const nT = P.length / 9, f = Math.fround;
  const vid = new Map(); const T = new Int32Array(nT * 3);
  for (let i = 0; i < nT * 3; i++) { const k = `${f(P[i * 3])},${f(P[i * 3 + 1])},${f(P[i * 3 + 2])}`; let v = vid.get(k); if (v === undefined) { v = vid.size; vid.set(k, v); } T[i] = v; }
  const nV = vid.size; vid.clear();
  const K = 67108864;
  const E = new Float64Array(nT * 3); let degen = 0;
  for (let t = 0; t < nT; t++) {
    const a = T[t * 3], b = T[t * 3 + 1], c = T[t * 3 + 2];
    if (a === b || b === c || a === c) degen++;
    E[t * 3] = a * K + b; E[t * 3 + 1] = b * K + c; E[t * 3 + 2] = c * K + a;
  }
  E.sort();
  const countOf = (k) => { let lo = 0, hi = E.length; while (lo < hi) { const m = (lo + hi) >> 1; if (E[m] < k) lo = m + 1; else hi = m; } let n = 0; while (lo + n < E.length && E[lo + n] === k) n++; return n; };
  let open = 0, doubled = 0;
  for (let i = 0; i < E.length;) {
    let j = i; while (j < E.length && E[j] === E[i]) j++;
    const n = j - i, k = E[i], u = Math.floor(k / K), v = k - u * K;
    if (n > 1) doubled++; if (countOf(v * K + u) !== n) open++;
    i = j;
  }
  const par = new Int32Array(nV).map((_, i) => i); const fd = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let t = 0; t < nT; t++) { const a = fd(T[t * 3]), b = fd(T[t * 3 + 1]); par[b] = a; par[fd(T[t * 3 + 2])] = a; }
  const roots = new Set(); for (let t = 0; t < nT; t++) roots.add(fd(T[t * 3]));
  return { shells: roots.size, open, doubled, degen };
}

/* --census <file.stl>: the census of a binary STL already written, no build */
if (argOf('--census')) {
  const buf = fs.readFileSync(argOf('--census')); const nT = buf.readUInt32LE(80); const P = new Float64Array(nT * 9);
  for (let t = 0; t < nT; t++) { const o = 84 + t * 50; for (let j = 0; j < 9; j++) P[t * 9 + j] = buf.readFloatLE(o + 12 + j * 4); }
  console.log(JSON.stringify({ file: path.basename(argOf('--census')), tris: nT, mb: +(buf.length / 1e6).toFixed(2), ...census(P) }));
  process.exit(0);
}

const manifest = [];
let ceiling = null;
for (const cap of caps) {
  const st = { ...DEFAULTS, petalTexture: 'BONE', ...design.set };
  const acc = new G.MeshBuilder({ exportMode: true, boneDetail: 'full' });
  const t0 = performance.now();
  const rec = G.buildBloomInto(acc, st, { below: null, capability: { boneFullCapTris: cap }, scopes: null });
  const ms = Math.round(performance.now() - t0);
  const F = rec.texture && rec.texture.bone && rec.texture.bone.full;
  const P = acc.positions, nT = P.length / 9;
  if (ceiling !== null && F && F.fullShare >= 1 && nT === ceiling) { console.log(`${design.name} cap ${cap}: the design's ceiling (${ceiling}) is already written — skipped`); manifest.push({ design: design.name, cap, tris: nT, skipped: 'ceiling' }); continue; }
  const buf = Buffer.alloc(84 + nT * 50);
  buf.write(`bloom BONE v2 full detail, ${design.name}, cap ${cap}`.slice(0, 79), 0, 'ascii');
  buf.writeUInt32LE(nT, 80);
  for (let t = 0; t < nT; t++) { const o = 84 + t * 50; for (let j = 0; j < 9; j++) buf.writeFloatLE(P[t * 9 + j], o + 12 + j * 4); }
  const mb = buf.length / 1e6;
  const file = `bloom-bone-v2-${design.name}-${nT}tris-${mb.toFixed(1)}MB.stl`;
  fs.writeFileSync(path.join(OUT, file), buf);
  const C = census(P);
  /* the cap binds iff some porous cell was left coarse */
  const reached = F ? F.fullShare < 1 : null;
  if (F && !reached) ceiling = nT;
  const row = { design: design.name, cap, file, tris: nT, mb: +mb.toFixed(2), share: F ? +F.fullShare.toFixed(4) : null, allFull: F ? F.allFullTris : null,
    capBinds: reached, ms, ...C };
  manifest.push(row);
  console.log(JSON.stringify(row));
}
if (argOf('--manifest')) fs.writeFileSync(argOf('--manifest'), JSON.stringify(manifest, null, 2));
