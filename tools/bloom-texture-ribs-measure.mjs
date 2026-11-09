#!/usr/bin/env node
/* ===================================================================
   bloom-texture-ribs-measure.mjs — RIBS' NUMBERS (docs/bloom-surface-texture-ribs.md).
   Not a gate: an instrument. Every figure is read off a build of the RIBS
   prototype (`bloom-texture-ribs.js`, the patched copy of the shipped
   geometry), EXPORT mode, Node.

     node tools/bloom-texture-ribs-measure.mjs [--section crest,print,budget,rods]
          [--out docs/data/bloom-texture-ribs.json] [--resume]

   crest   CREST QUALITY AS BUILT, per meshing option (lattice / crest /
           crest+flank) x law (A / B), on a petal, the hub top and the stem.
           For each crest sample (a point on a crest line on the shipped
           lattice, taken where the relief reaches full weight), the EMITTED
           displaced triangles of that organ are cut by the plane through the
           sample square to the crest; the upper envelope of that section is
           the profile the file holds. From it: the PEAK's lateral offset
           from the true crest (the ZIGZAG amplitude), its height deficit,
           and the INCLUDED CREST ANGLE from secant slopes over pitch/8 and
           pitch/40 either side — beside the same angles of the field
           RESTATED (Math.atan2, a different owner from the engine-agreed
           field the build reads). Plus triangles / mm2 per organ.
   print   the default bloom at H 0.4 and 2.5, law A and B, 'crest' (and
           'lattice'): the within-shell census (tools/bloom-self-intersection),
           shells, open and doubled directed edges, degenerate triangles, flips
           the cutter counted, and the printable gaps newly CLOSED between parts
           (the same mesh built with nothing raised, paired vertex for vertex).
   budget  default, umbel (head ON), mophead (depth 2's ruled defaults), law A
           and B: lattice and crest triangle counts, % of EXPORT_TRI_CAP, Node ms.
   rods    what the shipped curvature rule (BONE's mask, 1 /mm) and visibility
           do to the stamens, the style, the braid and the petal bead / nib:
           relieved share per part, at curvature 1 (BONE's default) and 4
           (its maximum) — reported, never special-cased (the brief).
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = await import(pathToFileURL(path.join(ROOT, 'bloom-texture-ribs.js')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const RUN = !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const SECTIONS = RUN ? arg('--section', 'crest,print,budget,rods').split(',') : [];
const OUT = arg('--out', path.join(ROOT, 'docs/data/bloom-texture-ribs.json'));
const data = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const save = () => { fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(data, null, 1)); };
const r3 = (x) => (x === null || x === undefined || !Number.isFinite(x) ? x : +x.toFixed(3));
const stat = (v) => { v = v.filter(Number.isFinite).slice().sort((a, b) => a - b); return v.length ? { n: v.length, min: r3(v[0]), median: r3(v[Math.floor(v.length / 2)]), p90: r3(v[Math.floor(v.length * 0.9)]), max: r3(v[v.length - 1]) } : { n: 0 }; };
const GEO = await R.ribsGeometry();
const CAP = GEO.EXPORT_TRI_CAP;
const pct = (t) => +(100 * t / CAP).toFixed(1);

export const STATES = {
  default: {},
  stem: { stemLength: 60 },
  umbel: { inflorescence: 'UMBEL', umbelHead: 'ON', stemLength: 60 },
  mophead: { inflorescence: 'UMBEL', umbelDepth: '2', stemLength: 120, umbelFlorets: 12, floretPetals: 4, floretScale: 0.2, pedicelLength: 12, pedicelAngle: 20, petalTipShape: 2, petalCup: 0.2, petalTilt: 15 },
  rods: { stemLength: 60, stamenCount: 12, gynoecium: 'STYLE' },
  braid: { stemLength: 60, stamenCount: 6, stamenCoil: 'BRAIDED', gynoecium: 'STYLE' },
};
export const build = (state, extra, opts) => R.ribsBuild(DEFAULTS, { ...state, ...extra }, { GEO, ...opts });

/* ------------------------------------------------- the section probe --- */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (v) => { const L = Math.hypot(...v); return v.map((x) => x / L); };
/* the restated field (Math.atan2: a different owner from the engine-agreed one) */
export function restatedField(params) {
  const S = R.ribSchedule(params), w = params.crest;
  const lvl = (r) => { let L = 0; while (L + 1 < S.levels.length && S.levels[L + 1].rStart <= r) L++; return L; };
  const u = (n, th) => { const ph = (n * th) / (2 * Math.PI); return 2 * Math.abs(ph - Math.round(ph)); };
  const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (6 * x - 15) + 10));
  return (p) => {
    const r = Math.hypot(p[0], p[1]);
    if (!(r > S.rCut)) return 0;
    const th = Math.atan2(p[1], p[0]);
    const L = lvl(r);
    let f = R.ribProfile(u(S.levels[L].n, th), w);
    if (L > 0) { const a = sm((r - S.levels[L].rStart) / S.emerge); if (a < 1) f = (1 - a) * R.ribProfile(u(S.levels[L - 1].n, th), w) + a * f; }
    if (r < S.r0) f *= S.rule === 'fade' ? sm((r - S.r0 / 2) / (S.r0 / 2)) : sm((r - (S.r0 - params.edgeMm)) / params.edgeMm);
    return f;
  };
}
/* the section of the EMITTED triangles [from, to) through sample q, square to its crest */
export function crestSection(P, from, to, q, H, Fr) {
  const t = q.tc, n = q.n, e = nrm(crs(n, t)), p = q.p, half = q.pitch * 0.75, Rr = q.pitch + H + 1;
  const segs = [];
  for (let k = from; k < to; k++) {
    const o = k * 9, V = [[P[o], P[o + 1], P[o + 2]], [P[o + 3], P[o + 4], P[o + 5]], [P[o + 6], P[o + 7], P[o + 8]]];
    if (V.every((v) => Math.abs(v[0] - p[0]) > Rr || Math.abs(v[1] - p[1]) > Rr || Math.abs(v[2] - p[2]) > Rr)) continue;
    const d = V.map((v) => dot(sub(v, p), t));
    const pts = [];
    for (let i = 0; i < 3; i++) { const a = d[i], b = d[(i + 1) % 3]; if ((a <= 0 && b > 0) || (a > 0 && b <= 0)) { const s = a / (a - b), A = V[i], B = V[(i + 1) % 3]; const X = [A[0] + s * (B[0] - A[0]), A[1] + s * (B[1] - A[1]), A[2] + s * (B[2] - A[2])]; pts.push([dot(sub(X, p), e), dot(sub(X, p), n)]); } }
    if (pts.length !== 2) continue;
    if (Math.abs(pts[0][0]) > half && Math.abs(pts[1][0]) > half) continue;
    if (pts[0][1] < -0.3 || pts[1][1] < -0.3 || pts[0][1] > H + 0.5 || pts[1][1] > H + 0.5) continue;
    segs.push(pts);
  }
  const N = 600, dx = (2 * half) / N, env = new Float64Array(N + 1).fill(-Infinity);
  for (const [a, b] of segs) {
    const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]);
    const i0 = Math.max(0, Math.ceil((x0 + half) / dx)), i1 = Math.min(N, Math.floor((x1 + half) / dx));
    for (let i = i0; i <= i1; i++) { const x = -half + i * dx, s = x1 > x0 ? (x - a[0]) / (b[0] - a[0]) : 0, h = a[1] + s * (b[1] - a[1]); if (h > env[i]) env[i] = h; }
  }
  const at = (x) => { const i = Math.round((x + half) / dx); return i >= 0 && i <= N ? env[i] : -Infinity; };
  /* the peak within half a pitch of the true crest */
  let ip = -1;
  for (let i = 0; i <= N; i++) { const x = -half + i * dx; if (Math.abs(x) > q.pitch / 2) continue; if (ip < 0 || env[i] > env[ip]) ip = i; }
  if (ip < 0 || !Number.isFinite(env[ip])) return null;
  const xp = -half + ip * dx, hp = env[ip];
  const ang = (w) => { const hl = at(xp - w), hr = at(xp + w); if (!Number.isFinite(hl) || !Number.isFinite(hr)) return null; return 180 - (Math.atan((hp - hl) / w) + Math.atan((hp - hr) / w)) * 180 / Math.PI; };
  /* the restated field along the same line (on the undisplaced tangent line: the curvature of the surface is not in it) */
  const hi = (x) => H * Fr([p[0] + x * e[0], p[1] + x * e[1], p[2] + x * e[2]]);
  const angI = (w) => 180 - (Math.atan((hi(0) - hi(-w)) / w) + Math.atan((hi(0) - hi(w)) / w)) * 180 / Math.PI;
  const w8 = q.pitch / 8, w40 = q.pitch / 40;
  return { xPeak: xp, hPeak: hp, deficit: hi(0) - hp, ang8: ang(w8), ang40: ang(w40), ideal8: angI(w8), ideal40: angI(w40), segs: segs.length };
}
function crestRows(r, H, params) {
  const Fr = restatedField(params);
  const P = r.acc.positions, out = {};
  const rangesOf = (organ) => r.stats.ranges.filter((g) => g.organ === organ);
  for (const q of r.stats.samples) {
    const rs = rangesOf(q.organ);
    /* the range this sample's part sits in: the one holding the nearest emitted vertex */
    let best = null, bd = Infinity;
    for (const g of rs) for (let k = g.from; k < g.to; k += 7) { const o = k * 9, d = (P[o] - q.p[0]) ** 2 + (P[o + 1] - q.p[1]) ** 2 + (P[o + 2] - q.p[2]) ** 2; if (d < bd) { bd = d; best = g; } }
    if (!best) continue;
    const s = crestSection(P, best.from, best.to, q, H, Fr);
    if (!s) continue;
    (out[q.organ] = out[q.organ] || []).push({ ...s, r: q.r, pitch: q.pitch });
  }
  const summary = {};
  for (const [organ, L] of Object.entries(out)) {
    const st = r.stats.organs[organ];
    summary[organ] = { samples: L.length, zigzagMm: stat(L.map((x) => Math.abs(x.xPeak))), deficitMm: stat(L.map((x) => x.deficit)), angle8: stat(L.map((x) => x.ang8)), ideal8: stat(L.map((x) => x.ideal8)), angle40: stat(L.map((x) => x.ang40)), ideal40: stat(L.map((x) => x.ideal40)), pitchMm: stat(L.map((x) => x.pitch)),
      trisPerMm2: st ? r3(st.tris / st.areaMm2) : null, latticeTrisPerMm2: st ? r3(st.latticeTris / st.areaMm2) : null };
  }
  return summary;
}

/* ------------------------------------------------------- closure --- */
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

/* ------------------------------------------------------------ CREST --- */
if (SECTIONS.includes('crest')) {
  const rows = data.crest || [];
  for (const law of ['A', 'B']) for (const mode of R.RIB_MODES) for (const [key, st] of [['default', STATES.default], ['stem', STATES.stem]]) {
    for (const H of [0.4, 2.5]) {
      if (args.includes('--resume') && rows.find((x) => x.law === law && x.mode === mode && x.state === key && x.H === H)) continue;
      const r = await build(st, { ribLaw: law, textureHeight: H }, { mode, samples: key === 'stem' ? { stem: 40 } : { petal: 60, hub: 40 } });
      const sum = crestRows(r, H, r.stats.params);
      const row = { law, mode, state: key, H, tris: r.acc.triangleCount, ms: Math.round(r.ms), chords: r.stats.chordsTotal, flips: r.stats.flips, withdrawn: r.stats.withdrawn, centroids: r.stats.centroids, organs: sum };
      const at = rows.findIndex((x) => x.law === law && x.mode === mode && x.state === key && x.H === H); if (at >= 0) rows[at] = row; else rows.push(row);
      console.log(`crest ${law} ${mode.padEnd(11)} ${key} H ${H}: ${row.tris} tris, ${row.ms} ms; ` + Object.entries(sum).map(([o, s]) => `${o} n${s.samples} zig ${s.zigzagMm.median}/${s.zigzagMm.max} mm, angle ${s.angle8.median} (ideal ${s.ideal8.median}) / local ${s.angle40.median} (ideal ${s.ideal40.median}), deficit ${s.deficitMm.median}, ${s.trisPerMm2} tris/mm2`).join(' | '));
      data.crest = rows; save();
    }
  }
}

/* ------------------------------------------------------------ PRINT --- */
if (SECTIONS.includes('print')) {
  const { census } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-self-intersection.mjs')).href);
  const { triGrid, nearest } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-inflo-approach.mjs')).href);
  const out = data.print || [];
  const STRIDE = Number(arg('--gap-stride', 3));
  for (const law of ['A', 'B']) for (const mode of ['lattice', 'crest']) for (const H of [0.4, 2.5]) {
    if (args.includes('--resume') && out.find((x) => x.law === law && x.mode === mode && x.H === H)) continue;
    const r = await build({}, { ribLaw: law, textureHeight: H }, { mode });
    const c = census(new Float64Array(r.acc.positions));
    const cl = closure(r.acc.positions);
    const row = { law, mode, H, tris: r.acc.triangleCount, withinPairs: c.within, worstSpanMm: r3(c.worstSpanMm), crossPairs: c.cross, flips: r.stats.flips, ...cl };
    const u = await build({}, { ribLaw: law, textureHeight: H }, { mode, capability: { boneNoRelief: true } });
    const same = u.acc.triangleCount === r.acc.triangleCount;
    /* the parts: the hook's own output ranges (every organ the pass relieved), the rest one part */
    const owners = []; let cur = 0;
    r.stats.ranges.slice().sort((a, b) => a.from - b.from).forEach((q, k) => { if (q.from > cur) owners.push({ lo: cur * 9, hi: q.from * 9, owner: 'rest' + k }); owners.push({ lo: q.from * 9, hi: q.to * 9, owner: q.organ + '#' + k }); cur = q.to; });
    if (cur < r.acc.triangleCount) owners.push({ lo: cur * 9, hi: r.acc.triangleCount * 9, owner: 'tail' });
    const gU = triGrid(u.acc.positions, owners), gT = triGrid(r.acc.positions, owners);
    let n = 0, closed = 0, touch = 0, minT = Infinity, minU = Infinity;
    if (same) owners.forEach((q) => {
      for (let t = q.lo / 9; t < q.hi / 9; t += STRIDE) for (let cc = 0; cc < 3; cc++) {
        const o = t * 9 + cc * 3, P0 = u.acc.positions, P1 = r.acc.positions;
        const pu = [P0[o], P0[o + 1], P0[o + 2]], pt = [P1[o], P1[o + 1], P1[o + 2]];
        if (pu[0] === pt[0] && pu[1] === pt[1] && pu[2] === pt[2]) continue;
        const RR = 1 + H + 0.01, dU = nearest(gU, pu, q.owner, RR);
        if (!(dU < RR)) continue;
        const dT = nearest(gT, pt, q.owner, RR);
        n++; if (dT < minT) minT = dT; if (dU < minU) minU = dU;
        if (dU >= 1.0 && dT < 1.0) closed++;
        if (dU > 1e-6 && dT <= 1e-6) touch++;
      }
    });
    row.gaps = { sameMesh: same, parts: owners.length, everyNthTriangle: STRIDE, sampled: n, newlyClosedPrintableGaps: closed, newlyTouching: touch, nearestUnraisedMm: r3(minU), nearestRaisedMm: r3(minT) };
    const at = out.findIndex((x) => x.law === law && x.mode === mode && x.H === H); if (at >= 0) out[at] = row; else out.push(row);
    console.log(`print ${law} ${mode} H ${H}: ${JSON.stringify(row)}`);
    data.print = out; save();
  }
}

/* ----------------------------------------------------------- BUDGET --- */
if (SECTIONS.includes('budget')) {
  const rows = data.budget || [];
  const only = arg('--states', 'default,umbel,mophead').split(',');
  for (const key of only) for (const law of ['A', 'B']) {
    if (args.includes('--resume') && rows.find((x) => x.key === key && x.law === law)) continue;
    const L = await build(STATES[key], { ribLaw: law }, { mode: 'lattice' });
    const C = await build(STATES[key], { ribLaw: law }, { mode: 'crest' });
    const F = await build(STATES[key], { ribLaw: law }, { mode: 'crest+flank' });
    const row = { key, law, latticeTris: L.acc.triangleCount, latticePct: pct(L.acc.triangleCount), latticeMs: Math.round(L.ms), crestTris: C.acc.triangleCount, crestPct: pct(C.acc.triangleCount), crestMs: Math.round(C.ms), crestPassMs: Math.round(C.stats.passMs), flankTris: F.acc.triangleCount, flankPct: pct(F.acc.triangleCount), flankMs: Math.round(F.ms), ...closure(C.acc.positions) };
    const at = rows.findIndex((x) => x.key === key && x.law === law); if (at >= 0) rows[at] = row; else rows.push(row);
    console.log(`budget ${key} ${law}: ${JSON.stringify(row)}`);
    data.budget = rows; save();
  }
}

/* ------------------------------------------------------------- RODS --- */
if (SECTIONS.includes('rods')) {
  const out = [];
  for (const [key, curv] of [['rods', 1], ['rods', 4], ['braid', 1], ['default', 1], ['default', 4]]) {
    const r = await build(STATES[key], { ribLaw: 'B', boneCurvature: curv }, { mode: 'lattice' });
    const B = r.rec.texture.bone;
    const parts = {};
    for (const [organ, o] of Object.entries(r.rec.texture.organs || {})) {
      const b = o && o.bone; if (!b) continue;
      parts[organ] = { vertices: b.vertices, relievable: b.relievable, ridges: b.ridges, displaced: b.displaced, displacedShare: b.vertices ? r3(b.displaced / b.vertices) : 0, ridgeOff: b.ridgeOff, rod: !!b.rod, sheet: !!b.sheet };
    }
    /* the petal's bead and nib: the shipped pass's own samples, split by ridge */
    out.push({ state: key, curvature: curv, smoothRods: B.smoothRods || null, parts });
    console.log(`rods ${key} curvature ${curv}: smooth rods ${JSON.stringify(B.smoothRods)}; ` + Object.entries(parts).map(([o, p]) => `${o} ${p.displaced}/${p.vertices} (${p.displacedShare}) ridges ${p.ridges}`).join(' | '));
  }
  data.rods = out; save();
}
