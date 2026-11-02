#!/usr/bin/env node
/* ===================================================================
   bloom-texture-bone-v2-measure.mjs — THE SHIPPED BONE v2's NUMBERS
   (docs/bloom-surface-texture-bone-v2-shipped.md). Not a gate: an instrument,
   every figure read off the SHIPPED geometry (`bloom-geometry.js`), never off
   the prototype modules — except the plate domain's wall walk, which is
   handed the SHIPPED field.

     node tools/bloom-texture-bone-v2-measure.mjs [--section budget,print,walls,round]
          [--states default,whole,...] [--out docs/data/bloom-texture-bone-v2-shipped.json]

   budget  per state (the default, the whole bloom, the umbel head ON, the
           mophead at depth 2's defaults, 40 x 3): COARSE (the release build)
           and FULL (the export): triangles, MB of binary STL, % of the 2.0 M
           cap, the full-detail share of the porous area, cells selected of
           cells, passes, build ms, and the full build's closure (shells, open
           and doubled directed edges, degenerate triangles on the float32s).
   print   the default at H 0.4 and 2.5, FULL: the within-shell census (pairs,
           worst span) and the printable gaps newly closed between PARTS (the
           same mesh built with nothing raised — the `boneNoRelief` lever —
           paired vertex for vertex; every relieved sheet vertex against every
           other part's triangles within 1 + H).
   walls   the thinnest / p10 / median wall between adjacent fully admitted
           pores on the SHIPPED field (the plate walk, at mid-height), at the
           ruled defaults and at the two pore-size ends, and how many of them
           are under 0.7 mm (the proposed minimum-wall rule — a question).
   round   the drawn mid-wall outline of every isolated pore the FULL build
           refined, on the full and on the COARSE build of the same state: the
           largest radial deviation from the true mid-wall circle, % of the
           pore's radius — the same contour instrument on both meshes, the
           field read at each emitted (unrelieved) vertex.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const RUN = !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
/* `round` is NOT in the default set: on the shipped default it measured 0 of 220
   pores (the merging field leaves no pore isolated at mid-height; see §8e of the
   doc). Roundness is measured on the plate instead (bloom-texture-bone2-plate's
   `shipped` method). */
const SECTIONS = RUN ? arg('--section', 'budget,print,walls').split(',') : [];
const OUT = arg('--out', path.join(ROOT, 'docs/data/bloom-texture-bone-v2-shipped.json'));
const data = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const save = () => { fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(data, null, 1)); };
const CAP = G.EXPORT_TRI_CAP;
const pct = (t) => +(100 * t / CAP).toFixed(1);
const r3 = (x) => (x === null || x === undefined || !Number.isFinite(x) ? x : +x.toFixed(3));
const stat = (v) => { v = v.slice().sort((a, b) => a - b); return v.length ? { n: v.length, min: r3(v[0]), median: r3(v[Math.floor(v.length / 2)]), p90: r3(v[Math.floor(v.length * 0.9)]), max: r3(v[v.length - 1]) } : { n: 0 }; };
const stlMB = (tris) => +((84 + 50 * tris) / 1e6).toFixed(1);

export const STATES = [
  ['default', 'the default', {}],
  ['whole', 'the whole bloom (60 mm stem, a 30 mm leaf, 5 sepals, 12 stamens, the style)', { stemLength: 60, leafLength: 30, sepalCount: 5, stamenCount: 12, gynoecium: 'STYLE' }],
  ['umbel', 'the umbel, head ON (60 mm stem)', { inflorescence: 'UMBEL', umbelHead: 'ON', stemLength: 60 }],
  ['mophead', "the mophead (depth 2's ruled defaults)", { inflorescence: 'UMBEL', umbelDepth: '2', stemLength: 120, umbelFlorets: 12, floretPetals: 4, floretScale: 0.2, pedicelLength: 12, pedicelAngle: 20, petalTipShape: 2, petalCup: 0.2, petalTilt: 15 }],
  ['40x3', '40 petals x 3 whorls', { petalCount: 40, layerCount: 3 }],
];
export function build(o, detail, capability = null) {
  const acc = new G.MeshBuilder({ exportMode: true, boneDetail: detail });
  const t0 = performance.now();
  const rec = G.buildBloomInto(acc, { ...DEFAULTS, petalTexture: 'BONE', ...o }, { below: null, capability, scopes: null });
  return { acc, rec, ms: Math.round(performance.now() - t0) };
}
export function closure(P) {
  const nT = P.length / 9, f = Math.fround;
  const vid = new Map(); const T = new Int32Array(nT * 3);
  for (let i = 0; i < nT * 3; i++) { const k = `${f(P[i * 3])},${f(P[i * 3 + 1])},${f(P[i * 3 + 2])}`; let v = vid.get(k); if (v === undefined) { v = vid.size; vid.set(k, v); } T[i] = v; }
  const de = new Map(); let degen = 0;
  for (let t = 0; t < nT; t++) { const a = T[t * 3], b = T[t * 3 + 1], c = T[t * 3 + 2]; if (a === b || b === c || a === c) degen++; for (const [u, v] of [[a, b], [b, c], [c, a]]) { const k = u * 4e7 + v; de.set(k, (de.get(k) || 0) + 1); } }
  let open = 0, doubled = 0; for (const [k, n] of de) { const u = Math.floor(k / 4e7), v = k % 4e7; if (n > 1) doubled++; if ((de.get(v * 4e7 + u) || 0) !== n) open++; }
  const par = new Int32Array(vid.size).map((_, i) => i); const fd = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let t = 0; t < nT; t++) { const a = fd(T[t * 3]), b = fd(T[t * 3 + 1]); par[b] = a; par[fd(T[t * 3 + 2])] = a; }
  const roots = new Set(); for (let t = 0; t < nT; t++) roots.add(fd(T[t * 3]));
  return { shells: roots.size, open, doubled, degen };
}
/* every [from, to] triangle range a record names (petals, sepals, organs,
   rods, floret copies), deepest-first deduplicated: the parts of the file */
function partRanges(rec, nT) {
  const out = [], seen = new Set();
  const walk = (o, depth, name) => {
    if (!o || typeof o !== 'object' || depth > 6 || seen.has(o)) return; seen.add(o);
    for (const k of ['triRange', 'emittedTriRange']) { const r = o[k]; if (Array.isArray(r) && r.length === 2 && Number.isInteger(r[0]) && r[1] > r[0] && r[1] <= nT) out.push({ from: r[0], to: r[1], name: `${name}.${k}` }); }
    for (const [k, v] of Object.entries(o)) if (v && typeof v === 'object' && !ArrayBuffer.isView(v)) walk(v, depth + 1, k);
  };
  walk(rec, 0, 'bloom');
  out.sort((a, b) => a.from - b.from || b.to - a.to);
  const flat = []; let cur = 0;
  for (const r of out) { if (r.from < cur) continue; flat.push(r); cur = r.to; }
  return flat;
}

/* ---------------------------------------------------------- BUDGET --- */
if (SECTIONS.includes('budget')) {
  const rows = data.budget || [];
  const only = arg('--states', null);
  for (const [key, name, o] of STATES) {
    if (only && !only.split(',').includes(key)) continue;
    const co = build(o, 'coarse');
    const fu = build(o, 'full');
    const F = fu.rec.texture && fu.rec.texture.bone && fu.rec.texture.bone.full;
    const cl = closure(fu.acc.positions);
    const row = { key, name, coarseTris: co.acc.triangleCount, coarseMB: stlMB(co.acc.triangleCount), coarsePct: pct(co.acc.triangleCount), coarseMs: co.ms,
      fullTris: fu.acc.triangleCount, fullMB: stlMB(fu.acc.triangleCount), fullPct: pct(fu.acc.triangleCount), fullMs: fu.ms,
      share: F ? r3(F.fullShare) : null, cells: F ? F.cells : null, selectedCells: F ? F.selectedCells : null, allFullTris: F ? F.allFullTris : null, passes: F ? F.passes : null,
      porousAreaMm2: F ? Math.round(F.porousAreaMm2) : null, fullAreaMm2: F ? Math.round(F.fullAreaMm2) : null, discs: F ? F.discs : null, free: F ? F.free : null, merged: F ? F.merged : null, junctions: F ? F.junctions : null,
      timing: F ? F.timing : null, ...cl };
    const at = rows.findIndex((q) => q.key === key); if (at >= 0) rows[at] = row; else rows.push(row);
    console.log(`budget ${key}: coarse ${row.coarseTris} (${row.coarsePct}%, ${row.coarseMs} ms) | FULL ${row.fullTris} (${row.fullMB} MB, ${row.fullPct}%, ${row.fullMs} ms) share ${row.share} (${row.selectedCells}/${row.cells} cells) all-full ${row.allFullTris} | shells ${cl.shells} open ${cl.open} doubled ${cl.doubled} degen ${cl.degen}`);
    data.budget = rows; save();
  }
}

/* ----------------------------------------------------------- PRINT --- */
if (SECTIONS.includes('print')) {
  const { census } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-self-intersection.mjs')).href);
  const { triGrid, nearest } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-inflo-approach.mjs')).href);
  const out = data.print || [];
  const STRIDE = Number(arg('--gap-stride', 3));
  for (const H of (arg('--heights', '0.4,2.5')).split(',').map(Number)) {
    const r = build({ textureHeight: H }, 'full');
    const c = census(new Float64Array(r.acc.positions));
    const cl = closure(r.acc.positions);
    const row = { H, tris: r.acc.triangleCount, withinPairs: c.within, worstSpanMm: r3(c.worstSpanMm), crossPairs: c.cross, ...cl };
    const u = build({ textureHeight: H }, 'full', { boneNoRelief: true });
    const same = u.acc.triangleCount === r.acc.triangleCount;
    const parts = partRanges(r.rec, r.acc.triangleCount);
    const owners = []; let cur = 0; parts.forEach((q, k) => { if (q.from > cur) owners.push({ lo: cur * 9, hi: q.from * 9, owner: 'rest' + k }); owners.push({ lo: q.from * 9, hi: q.to * 9, owner: q.name + '#' + k }); cur = q.to; });
    if (cur < r.acc.triangleCount) owners.push({ lo: cur * 9, hi: r.acc.triangleCount * 9, owner: 'tail' });
    const gU = triGrid(u.acc.positions, owners), gT = triGrid(r.acc.positions, owners);
    let n = 0, closed = 0, touch = 0, minT = Infinity, minU = Infinity;
    if (same) owners.forEach((q) => {
      for (let t = q.lo / 9; t < q.hi / 9; t += STRIDE) for (let cc = 0; cc < 3; cc++) {
        const o = t * 9 + cc * 3, P0 = u.acc.positions, P1 = r.acc.positions;
        const pu = [P0[o], P0[o + 1], P0[o + 2]], pt = [P1[o], P1[o + 1], P1[o + 2]];
        if (pu[0] === pt[0] && pu[1] === pt[1] && pu[2] === pt[2]) continue;
        const R = 1 + H + 0.01, dU = nearest(gU, pu, q.owner, R);
        if (!(dU < R)) continue;
        const dT = nearest(gT, pt, q.owner, R);
        n++; if (dT < minT) minT = dT; if (dU < minU) minU = dU;
        if (dU >= 1.0 && dT < 1.0) closed++;
        if (dU > 1e-6 && dT <= 1e-6) touch++;
      }
    });
    row.gaps = { sameMesh: same, parts: owners.length, everyNthTriangle: STRIDE, sampled: n, newlyClosedPrintableGaps: closed, newlyTouching: touch, nearestUnraisedMm: r3(minU), nearestRaisedMm: r3(minT) };
    const at = out.findIndex((q) => q.H === H); if (at >= 0) out[at] = row; else out.push(row);
    console.log(`print H ${H}: ${JSON.stringify(row)}`);
    data.print = out; save();
  }
}

/* ----------------------------------------------------------- WALLS --- */
if (SECTIONS.includes('walls')) {
  const PL = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-texture-bone2-plate.mjs')).href);
  const out = [];
  const UNDER = 0.7;
  for (const [label, st] of [['the ruled defaults (0.5 mm, spread 3, density 0.9)', {}], ['smallest pores 1.0 mm', { bonePoreSize: 1 }], ['spread 1.5', { boneBandRatio: 1.5 }], ['density 0.2', { bonePoreDensity: 0.2 }]]) {
    const params = G.bone2Params({ ...DEFAULTS, petalTexture: 'BONE', ...st }), field = G.bone2Field(params);
    const dom = PL.plateDomain(), win = { x0: 10, x1: 22, y0: -6, y1: 6 };
    /* the same walk as the plate's wallThickness, keeping every wall */
    const lo3 = [win.x0 - 2, win.y0 - 2, -2], hi3 = [win.x1 + 2, win.y1 + 2, 2];
    const all = field.poresIn(lo3, hi3).map((pore) => { const d = field.discOf(pore, [pore.centre[0], pore.centre[1], 0], [0, 0, 1]); if (!d) return null; return { R: d.rho, cx: d.centre[0], cy: d.centre[1], a: d.a }; })
      .filter((q) => q && q.a === 1 && q.cx > win.x0 && q.cx < win.x1 && q.cy > win.y0 && q.cy < win.y1);
    const walls = []; let pairs = 0, merged = 0;
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const A = all[i], Bq = all[j], d = Math.hypot(A.cx - Bq.cx, A.cy - Bq.cy);
      if (d > (A.R + Bq.R) * 1.6 || d < 1e-9) continue;
      pairs++;
      const steps = Math.ceil(d / 0.002); let run = 0, best = 0;
      for (let s = 0; s <= steps; s++) { const x = A.cx + ((Bq.cx - A.cx) * s) / steps, y = A.cy + ((Bq.cy - A.cy) * s) / steps; if (field.F([x, y, 0], [0, 0, 1]) >= 0.5) { run += d / steps; if (run > best) best = run; } else run = 0; }
      if (best === 0) merged++; else walls.push(best);
    }
    const S = stat(walls);
    const row = { label, D: params.D, spread: params.spread, density: params.density, pairs, merged, walls: S, underMm: UNDER, under: walls.filter((w) => w < UNDER).length, underShare: walls.length ? r3(walls.filter((w) => w < UNDER).length / walls.length) : null, check: PL.wallThickness(dom, field, params, win) };
    out.push(row);
    console.log(`walls ${label}: ${pairs} adjacent pairs, ${merged} merged at mid-height; walls ${JSON.stringify(S)}; under ${UNDER} mm: ${row.under} (${row.underShare})`);
  }
  data.walls = out; save();
}

/* ----------------------------------------------------------- ROUND --- */
/* the mid-wall contour of every isolated, fully admitted pore the FULL build
   refined, drawn by each mesh: the field at each emitted UNRELIEVED vertex
   (full: `boneNoRelief`; coarse: `organReliefOff`), linear along every edge,
   the level-crossings in the pore's own tangent plane against the true
   circle at bone2LevelU(level) x rho */
function roundness(acc, field, discs, all) {
  const P = acc.positions, nT = P.length / 9;
  const reach = 1 + G.BONE2_LIP_K / G.BONE2_LIP_SLOPE + 0.02;
  /* bucket the triangles by a 1 mm grid of their centroids */
  const B = new Map(), k = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
  for (let t = 0; t < nT; t++) { const o = t * 9; const key = k((P[o] + P[o + 3] + P[o + 6]) / 3, (P[o + 1] + P[o + 4] + P[o + 7]) / 3, (P[o + 2] + P[o + 5] + P[o + 8]) / 3); let a = B.get(key); if (!a) B.set(key, (a = [])); a.push(t); }
  const near = (c, r) => { const out = []; const R = Math.ceil(r); const [x, y, z] = c.map(Math.floor); for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) for (let l = -R; l <= R; l++) { const a = B.get(`${x + i},${y + j},${z + l}`); if (a) out.push(...a); } return out; };
  const res = [];
  for (const d of discs) {
    const shelf = d.nested ? G.BONE2_NEST_SHELF : 0, level = (1 + shelf) / 2, rStar = G.bone2LevelU(level, shelf) * d.rho;
    const n = d.n, t1 = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    let e1 = [t1[0] - n[0] * dot(t1, n), t1[1] - n[1] * dot(t1, n), t1[2] - n[2] * dot(t1, n)]; const L = Math.hypot(...e1); e1 = e1.map((v) => v / L);
    const e2 = [n[1] * e1[2] - n[2] * e1[1], n[2] * e1[0] - n[0] * e1[2], n[0] * e1[1] - n[1] * e1[0]];
    const loc = (p) => { const v = [p[0] - d.c[0], p[1] - d.c[1], p[2] - d.c[2]]; return [dot(v, e1), dot(v, e2), dot(v, n)]; };
    const fmemo = new Map(); const fOf = (o) => { let f = fmemo.get(o); if (f === undefined) { f = field.F([P[o], P[o + 1], P[o + 2]], n); fmemo.set(o, f); } return f; };
    let dev = 0, arc = 0, segs = 0;
    for (const t of near(d.c, d.rho * 1.4 + 1)) {
      const pts = [];
      for (let c = 0; c < 3; c++) {
        const oa = t * 9 + c * 3, ob = t * 9 + ((c + 1) % 3) * 3;
        const la = loc([P[oa], P[oa + 1], P[oa + 2]]), lb = loc([P[ob], P[ob + 1], P[ob + 2]]);
        if (Math.abs(la[2]) > 0.5 * d.rho || Math.abs(lb[2]) > 0.5 * d.rho) { pts.length = 0; break; }
        const fa = fOf(oa) - level, fb = fOf(ob) - level;
        if ((fa < 0) !== (fb < 0)) { const s = fa / (fa - fb); pts.push([la[0] + s * (lb[0] - la[0]), la[1] + s * (lb[1] - la[1])]); }
      }
      if (pts.length !== 2) continue;
      const [a, b] = pts, ra = Math.hypot(...a), rb = Math.hypot(...b);
      if (ra > d.rho * 1.25 || rb > d.rho * 1.25 || ra < d.rho * 0.6 || rb < d.rho * 0.6) continue;
      const owned = (q) => all.every((o) => o === d || Math.hypot(...[0, 1, 2].map((m) => d.c[m] + q[0] * e1[m] + q[1] * e2[m] - o.c[m])) > o.rho * reach + 0.01);
      if (!owned(a) || !owned(b)) continue;
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      segs++; arc += Math.abs(Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]));
      for (const r of [ra, rb, Math.hypot(...mid)]) dev = Math.max(dev, Math.abs(r - rStar));
    }
    if (arc < Math.PI) continue;
    res.push({ rho: d.rho, devPct: (100 * dev) / d.rho, edges: Math.round((segs * 2 * Math.PI) / arc) });
  }
  return res;
}
if (SECTIONS.includes('round')) {
  const o = {};
  const fu = build(o, 'full', { boneNoRelief: true, boneFullPoints: true });
  const co = build(o, 'coarse', { organReliefOff: true });
  const F = fu.rec.texture.bone.full;
  const params = G.bone2Params({ ...DEFAULTS, petalTexture: 'BONE' }), field = G.bone2Field(params);
  const all = (F.discList || []).map((d) => ({ ...d }));
  /* isolated (no other disc's outer ring overlapping) and refined (inside a SELECTED cell) */
  const selKeys = new Set(F.cellList.filter((c) => c.selected).map((c) => c.key));
  const cellOf = (c) => { const s = F.cellMm; return `${Math.floor(c[0] / s)},${Math.floor(c[1] / s)},${Math.floor(c[2] / s)}`; };
  void cellOf; void selKeys;
  const iso = all.filter((d) => all.every((o) => o === d || Math.hypot(o.c[0] - d.c[0], o.c[1] - d.c[1], o.c[2] - d.c[2]) > G.BONE2_HY_OUTER_U * (o.rho + d.rho)));
  /* the refined ones: some full-written point carries this disc */
  const refined = new Set();
  for (const K of F.kindsOut || []) for (let i = 0; i < K.disc.length; i++) if (K.disc[i] >= 0) refined.add(K.discs ? K.discs[K.disc[i]].key : K.disc[i]);
  /* each disc's own pore, for its nested pits (a pore with pits draws its
     mid-wall between its shelf and the top) */
  const nestedOf = (d) => { const q = field.poresIn(d.c.map((v) => v - 0.05), d.c.map((v) => v + 0.05)); for (const pore of q) { const dd = field.discOf(pore, d.c, d.n); if (dd && Math.hypot(dd.centre[0] - d.c[0], dd.centre[1] - d.c[1], dd.centre[2] - d.c[2]) < 2e-3) return pore.nested ? pore.nested.length : 0; } return null; };
  const target = iso.filter((d) => refined.has(d.key)).slice(0, Number(arg('--pores', 400))).map((d) => ({ ...d, nested: nestedOf(d) })).filter((d) => d.nested !== null);
  const rf = roundness(fu.acc, field, target, all), rc = roundness(co.acc, field, target, all);
  data.round = { state: 'the default', isolatedRefinedPores: target.length, full: { measured: rf.length, devPct: stat(rf.map((q) => q.devPct)), edges: stat(rf.map((q) => q.edges)) }, coarse: { measured: rc.length, devPct: stat(rc.map((q) => q.devPct)), edges: stat(rc.map((q) => q.edges)) } };
  console.log(`round: ${JSON.stringify(data.round)}`);
  save();
}
