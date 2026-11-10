#!/usr/bin/env node
/* ===================================================================
   bloom-texture-ribs-shipped-measure.mjs — THE SHIPPED RIBS, MEASURED
   (docs/bloom-surface-texture-ribs-shipped.md, every figure there).

     node --max-old-space-size=12000 tools/bloom-texture-ribs-shipped-measure.mjs [--sections budget,print,hub,browser] [--resume]
          [--data docs/data/bloom-texture-ribs-shipped.json]

   budget   EXPORT triangles and % of the 2.0 M cap, Node build ms — the
            default, the umbel (head ON) and THE MOPHEAD, laws A and B
   print    the default bloom, laws A and B, at 0.3 mm and the 2.5 mm maximum:
            the within-shell census (tools/bloom-self-intersection.mjs), the
            vertex-weld shells, open / doubled / degenerate directed edges, and
            printable gaps newly closed (every third triangle's raised vertices
            against every OTHER part within 1 + H, on the same mesh built with
            nothing raised — `boneNoRelief`, vertex for vertex: the prototype's
            own method)
   hub      the hub centre: degenerate triangles (float32 area at or under the
            harness's DEGENERATE_AREA_MM2), the smallest interior angle, and
            folded triangles (raised against unraised normals) within 3 mm of
            the axis, both laws, 0.3 and 2.5 mm
   browser  the same states built in Chromium (the page's module), release
            build ms and the float32 hash against Node's
   Writes after every row (--resume skips what is there): a container restart
   costs one row.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const H = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-harness.mjs')).href);
const { DEFAULTS, UMBEL_DEPTH2_DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const SECTIONS = arg('--sections', 'budget,print,hub,browser').split(',');
const DATA = arg('--data', path.join(ROOT, 'docs/data/bloom-texture-ribs-shipped.json'));
const data = fs.existsSync(DATA) ? JSON.parse(fs.readFileSync(DATA, 'utf8')) : {};
const save = () => { fs.mkdirSync(path.dirname(DATA), { recursive: true }); fs.writeFileSync(DATA, JSON.stringify(data, null, 1)); };
const CAP = G.EXPORT_TRI_CAP;
const pct = (n) => +(100 * n / CAP).toFixed(1);
const r3 = (x) => (Number.isFinite(x) ? +x.toFixed(3) : x);
const STATES = {
  default: {},
  umbel: { inflorescence: 'UMBEL', umbelHead: 'ON', stemLength: 60 },
  mophead: { stemLength: 120, inflorescence: 'UMBEL', umbelDepth: '2', ...UMBEL_DEPTH2_DEFAULTS },
};
const build = (extra, { exportMode = true, capability = null } = {}) => {
  const acc = new G.MeshBuilder({ exportMode, boneDetail: 'coarse' });
  const t0 = performance.now();
  const rec = G.buildBloomInto(acc, { ...DEFAULTS, petalTexture: 'RIBS', ...extra }, { below: null, scopes: null, capability });
  return { acc, rec, ms: performance.now() - t0 };
};
function closure(positions) {
  const key = (i) => `${Math.fround(positions[i])}|${Math.fround(positions[i + 1])}|${Math.fround(positions[i + 2])}`;
  const id = new Map(); const vid = (i) => { const k = key(i); let v = id.get(k); if (v === undefined) { v = id.size; id.set(k, v); } return v; };
  const nT = positions.length / 9, T = new Int32Array(nT * 3); let degen = 0;
  for (let t = 0; t < nT; t++) { for (let c = 0; c < 3; c++) T[t * 3 + c] = vid(t * 9 + c * 3); if (T[t * 3] === T[t * 3 + 1] || T[t * 3 + 1] === T[t * 3 + 2] || T[t * 3] === T[t * 3 + 2]) degen++; }
  const dir = new Map(); for (let t = 0; t < nT; t++) for (let c = 0; c < 3; c++) { const k = `${T[t * 3 + c]}>${T[t * 3 + (c + 1) % 3]}`; dir.set(k, (dir.get(k) || 0) + 1); }
  let open = 0, doubled = 0; for (const [k, n] of dir) { if (n > 1) doubled += n - 1; const [a, b] = k.split('>'); if ((dir.get(`${b}>${a}`) || 0) !== n) open++; }
  const par = new Int32Array(id.size); for (let i = 0; i < par.length; i++) par[i] = i;
  const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let t = 0; t < nT; t++) { const a = find(T[t * 3]); par[find(T[t * 3 + 1])] = a; par[find(T[t * 3 + 2])] = a; }
  const roots = new Set(); for (let i = 0; i < par.length; i++) roots.add(find(i));
  return { shells: roots.size, open, doubled, degenerate: degen };
}

if (SECTIONS.includes('budget')) {
  const rows = data.budget || [];
  for (const key of Object.keys(STATES)) for (const law of ['A', 'B']) {
    if (args.includes('--resume') && rows.find((x) => x.key === key && x.law === law)) continue;
    const b = build({ ...STATES[key], ribLaw: law });
    const row = { key, law, tris: b.acc.triangleCount, pct: pct(b.acc.triangleCount), nodeMs: Math.round(b.ms), ...closure(b.acc.positions) };
    const at = rows.findIndex((x) => x.key === key && x.law === law); if (at >= 0) rows[at] = row; else rows.push(row);
    console.log(`budget ${key} ${law}: ${JSON.stringify(row)}`);
    data.budget = rows; save();
  }
}

if (SECTIONS.includes('print')) {
  const { census } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-self-intersection.mjs')).href);
  const { triGrid, nearest } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-inflo-approach.mjs')).href);
  const rows = data.print || [];
  for (const law of ['A', 'B']) for (const Hm of [0.3, 2.5]) {
    if (args.includes('--resume') && rows.find((x) => x.law === law && x.H === Hm)) continue;
    const r = build({ ribLaw: law, ribHeight: Hm });
    const u = build({ ribLaw: law, ribHeight: Hm }, { capability: { boneNoRelief: true } });
    const c = census(new Float64Array(r.acc.positions));
    const row = { law, H: Hm, tris: r.acc.triangleCount, withinPairs: c.within, worstSpanMm: r3(c.worstSpanMm), crossPairs: c.cross, ...closure(r.acc.positions) };
    /* the parts: every relieved blade and organ range on its own, the rest one part */
    const ranges = [];
    for (const [k, o] of Object.entries(r.rec.texture.organs)) for (const tr of (o.bone && o.bone.triRanges) || []) ranges.push({ lo: tr[0], hi: tr[1], owner: k });
    ranges.sort((a, b) => a.lo - b.lo);
    const owners = []; let cur = 0;
    ranges.forEach((q, k) => { if (q.lo > cur) owners.push({ lo: cur * 9, hi: q.lo * 9, owner: 'rest' + k }); owners.push({ lo: q.lo * 9, hi: q.hi * 9, owner: q.owner + '#' + k }); cur = q.hi; });
    if (cur < r.acc.triangleCount) owners.push({ lo: cur * 9, hi: r.acc.triangleCount * 9, owner: 'tail' });
    const same = u.acc.triangleCount === r.acc.triangleCount;
    const gU = triGrid(u.acc.positions, owners), gT = triGrid(r.acc.positions, owners);
    let n = 0, closed = 0, minT = Infinity, minU = Infinity;
    if (same) owners.forEach((q) => {
      for (let t = q.lo / 9; t < q.hi / 9; t += 3) for (let cc = 0; cc < 3; cc++) {
        const o = t * 9 + cc * 3, P0 = u.acc.positions, P1 = r.acc.positions;
        const pu = [P0[o], P0[o + 1], P0[o + 2]], pt = [P1[o], P1[o + 1], P1[o + 2]];
        if (pu[0] === pt[0] && pu[1] === pt[1] && pu[2] === pt[2]) continue;
        const RR = 1 + Hm + 0.01, dU = nearest(gU, pu, q.owner, RR);
        if (!(dU < RR)) continue;
        const dT = nearest(gT, pt, q.owner, RR);
        n++; if (dT < minT) minT = dT; if (dU < minU) minU = dU;
        if (dU >= 1.0 && dT < 1.0) closed++;
      }
    });
    row.gaps = { sameMesh: same, parts: owners.length, sampled: n, newlyClosedPrintableGaps: closed, nearestUnraisedMm: r3(minU), nearestRaisedMm: r3(minT) };
    const at = rows.findIndex((x) => x.law === law && x.H === Hm); if (at >= 0) rows[at] = row; else rows.push(row);
    console.log(`print ${law} H ${Hm}: ${JSON.stringify(row)}`);
    data.print = rows; save();
  }
}

if (SECTIONS.includes('hub')) {
  const rows = data.hub || [];
  const BAR = H.DEGENERATE_AREA_MM2;
  for (const law of ['A', 'B']) for (const Hm of [0.3, 2.5]) {
    if (args.includes('--resume') && rows.find((x) => x.law === law && x.H === Hm)) continue;
    const r = build({ ribLaw: law, ribHeight: Hm }), u = build({ ribLaw: law, ribHeight: Hm }, { capability: { boneNoRelief: true } });
    const [h0, h1] = [r.rec.petalTriEnd, r.rec.hubTriEnd];
    let tris = 0, degenerate = 0, folds = 0, minAngle = 180, near = 0;
    const f = (P, o) => [Math.fround(P[o]), Math.fround(P[o + 1]), Math.fround(P[o + 2])];
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    for (let t = h0; t < h1; t++) {
      const A = f(r.acc.positions, t * 9), B = f(r.acc.positions, t * 9 + 3), C = f(r.acc.positions, t * 9 + 6);
      tris++;
      const n = crs(sub(B, A), sub(C, A)), area = Math.hypot(...n) / 2;
      if (area <= BAR) degenerate++;
      const cx = (A[0] + B[0] + C[0]) / 3, cy = (A[1] + B[1] + C[1]) / 3;
      if (Math.hypot(cx, cy) < 3 && A[2] > 0) {
        near++;
        const ang = (p, q, s) => { const a = sub(q, p), b = sub(s, p); return Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (Math.hypot(...a) * Math.hypot(...b) || 1)))) * 180 / Math.PI; };
        minAngle = Math.min(minAngle, ang(A, B, C), ang(B, C, A), ang(C, A, B));
        const Au = f(u.acc.positions, t * 9), Bu = f(u.acc.positions, t * 9 + 3), Cu = f(u.acc.positions, t * 9 + 6);
        if (dot(n, crs(sub(Bu, Au), sub(Cu, Au))) <= 0) folds++;
      }
    }
    const row = { law, H: Hm, hubTris: tris, degenerate, nearAxisTris: near, nearAxisMinAngleDeg: r3(minAngle), nearAxisFolds: folds, degenerateBarMm2: BAR };
    const at = rows.findIndex((x) => x.law === law && x.H === Hm); if (at >= 0) rows[at] = row; else rows.push(row);
    console.log(`hub ${law} H ${Hm}: ${JSON.stringify(row)}`);
    data.hub = rows; save();
  }
}

if (SECTIONS.includes('browser')) {
  const { chromium } = await import('playwright-core');
  const { server, port } = await H.serveRepo();
  const rows = data.browser || [];
  const fnv = (P) => { let h = 0x811c9dc5; const u = new Uint8Array(new Float32Array(P).buffer); for (let i = 0; i < u.length; i++) { h ^= u[i]; h = Math.imul(h, 0x01000193); } return h >>> 0; };
  try {
    for (const key of Object.keys(STATES)) for (const law of ['A', 'B']) {
      if (args.includes('--resume') && rows.find((x) => x.key === key && x.law === law)) continue;
      const browser = await chromium.launch({ executablePath: (await import('./chromium-harness.mjs')).findChromium(), args: ['--no-sandbox'] });
      const page = await browser.newPage();
      await page.goto(`http://127.0.0.1:${port}/bloom.html`);
      const st = { ...DEFAULTS, petalTexture: 'RIBS', ribLaw: law, ...STATES[key] };
      const b = await page.evaluate(async (st) => { const G = await import('/bloom-geometry.js'); const a = new G.MeshBuilder({ exportMode: true, boneDetail: 'coarse' }); const t0 = performance.now(); G.buildBloomInto(a, st, { below: null, scopes: null }); const ms = performance.now() - t0; let h = 0x811c9dc5; const u = new Uint8Array(new Float32Array(a.positions).buffer); for (let i = 0; i < u.length; i++) { h ^= u[i]; h = Math.imul(h, 0x01000193); } return { n: a.triangleCount, h: h >>> 0, ms, heapGB: performance.memory ? performance.memory.usedJSHeapSize / 1e9 : null }; }, st);
      await browser.close();
      const nd = build({ ...STATES[key], ribLaw: law });
      const row = { key, law, chromiumMs: Math.round(b.ms), nodeMs: Math.round(nd.ms), tris: b.n, agree: b.n === nd.acc.triangleCount && b.h === fnv(nd.acc.positions), heapGB: b.heapGB && +b.heapGB.toFixed(2) };
      const at = rows.findIndex((x) => x.key === key && x.law === law); if (at >= 0) rows[at] = row; else rows.push(row);
      console.log(`browser ${key} ${law}: ${JSON.stringify(row)}`);
      data.browser = rows; save();
    }
  } finally { server.close(); }
}
