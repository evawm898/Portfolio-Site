#!/usr/bin/env node
/* verify-frame-stl.mjs — the /frame STL INTEGRITY gate (docs/frame-charter.md
   §19): the file the page's Get STL saves is the file the gates measure, no
   two shells meet face to face at a join, and the print-readiness report.

     FM0 no geometry module calls a transcendental Math function (sin, cos,
         tan, atan, atan2, exp, log, pow, …) or uses `**` (which IS Math.pow):
         every one goes through frame-math.js. A textual scan of the modules
         below with comments and strings blanked; a module missing from the
         list is not read, and the list IS the coverage.
     FM1 frame-math.js returns the RUNNING Node's own Math.* doubles, under
         Object.is, over 200,000 inputs a function in each of seven ranges
         (small, mid, tiny, large — the long reduction path — huge, unit,
         every exponent) plus the special values. That is what keeps the Node
         build byte-identical to the tree before frame-math existed; in CI it
         is also the witness that Node 20's V8 carries the same fdlibm.
     SP  THE PAGE'S STL IS NODE'S: in Chromium, for every row, the SHA-256 of
         the very bytes Get STL saves (window.__frame.stlDigest) equals the
         SHA-256 of exportStl over Node's build of the same params, and the
         triangle counts agree. Skipped (and said so) with --no-browser.
     CP1 NO JOIN FACE COINCIDES: over every row, no pair of triangles of
         DIFFERENT shells in which either is a JOIN face (an embedded end's
         stub strip, the sill's lip, a band's end cap, the backed plate's
         wall — frame-relief.js ROLE) is coincident or near-coincident: planes
         within CP_ANGLE_DEG, every vertex of each within CP_DIST_MM (and
         within tan(CP_ANGLE_DEG) × its triangle's own size) of the other's
         plane, overlapping in projection by more than CP_AREA_MM2. The back
         plane is NOT excluded: a stub's bottom in the back plane under its
         neighbour's is such a pair. Read off the float32 positions the STL
         writes.
     CP2 the coincident pairs no join face is part of, REPORTED (never a
         fail): WIRE END — an ornament wire's or a pattern leaf's end cap
         against another ornament face (a tendril's root under the acanthus
         that sheathes it: the ornament places its own ends and declares no
         junction), BACK — both faces on z = 0 facing −z (every overlapping pair
         of shells shares the back plane, the overlapping-shell export
         contract standing on one bed plane), and BODY — two bands' own
         surfaces where they overlap at an equal height (the flat and stepped
         profiles' plateaus, where a sub-arch is half-buried in a jamb, the
         head or a mullion) and the ornament's shallow crossings. A union of
         the shells is what removes these; it is Eva's call (the charter).
     PR  the print-readiness report (frame-print.js's measurePrint) for the
         three default frames at their 180 mm: printed, and held where a
         number is a property rather than a measurement — the back's least z
         is 0, the whole footprint rests on it, no ray meets material above
         an empty space, and every ray's crossings pair (a closed union).

   --no-browser        skip SP.
   --negative-control  the mutants below, each served from a copy of the
                       frame's modules in a temporary directory and required
                       to redden exactly the clauses it names; every anchor
                       is checked before any mutant runs.

   NOT COVERED: a coincidence between two faces neither of which is a join
   face is CP2's and is not a fail; a near-coincidence wider than the bars;
   the union's own surface (the slicer computes it); anything printed. */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const NEG = args.includes('--negative-control'), NOBROWSER = args.includes('--no-browser');

/* the bars (charter §19): 3° is twice the arc ladder's 1.5° step — the old
   full-section stubs sat on a chord against the neighbour's tangent, 0.45°
   to 1.92° from it, measured; the fixed stub leaves its row at atan(1/10) =
   5.7°. 0.05 mm is half the finest layer an SLS/MJF process lays down — two
   faces closer than that are one surface to a printer and to a depth buffer.
   The area floor drops slivers that touch along a line. */
export const CP_ANGLE_DEG = 3, CP_DIST_MM = 0.05, CP_AREA_MM2 = 1e-6;

const GEOMETRY_MODULES = ['frame-geometry.js', 'frame-relief.js', 'frame-filigree.js', 'frame-pattern.js', 'frame-elements.js', 'frame-vine.js', 'frame-rinceau.js', 'frame-flow.js', 'frame-compose.js', 'frame-mass.js', 'frame-forms.js', 'frame-drawn.js', 'frame-svg-import.js', 'frame-drawn-placeholders.js', 'frame-registry.js', 'frame-print.js'];
const COPY = ['frame.html', 'frame.css', 'frame.js', 'frame-math.js', 'frame-view3d.js', 'frame-profile-editor.js', ...GEOMETRY_MODULES];

/* ---------------- rows ---------------- */
const PRE = ['flat', 'bead', 'cove', 'ogee', 'reeded', 'fluted', 'stepped'];
const ON = { filigree: 'scrolls' }, DENSE = { filigree: 'scrolls', ornDensity: 5, ornCrest: 'on', ornCorners: 'on', ornSides: 'on', ornBottom: 'on' };
const CLOSED = [['rect mitre', { skeleton: 'rect' }], ['rect rounded', { skeleton: 'rect', cornerTreatment: 'rounded' }], ['rect notched', { skeleton: 'rect', cornerTreatment: 'notched' }], ['rect eared', { skeleton: 'rect', cornerTreatment: 'eared' }], ['circle', { skeleton: 'oval', aspect: 1 }], ['oval', { skeleton: 'oval' }]];
const CP_ROWS = [
  ['arch default', {}],
  ...PRE.map((k) => [`arch ${k}`, { profilePreset: k }]),
  ...PRE.map((k) => [`arch ${k}, stepped sill`, { profilePreset: k, sill: 'stepped' }]),
  ['arch 0 mullions', { mullions: 0 }], ['arch 4 mullions', { mullions: 4 }], ['arch flat 4 mullions', { profilePreset: 'flat', mullions: 4 }],
  ['arch sill none', { sill: 'none' }], ['arch lancet', { pointedness: 1 }], ['arch semicircle', { pointedness: 0 }],
  ['arch backed', { lights: 'backed' }], ['arch backed 4 mullions', { lights: 'backed', mullions: 4 }], ['arch recessed', { lights: 'recessed' }],
  ['arch backed, stepped sill', { lights: 'backed', sill: 'stepped' }], ['arch backed, no sill', { lights: 'backed', sill: 'none' }], ['arch flat backed, no sill', { profilePreset: 'flat', lights: 'backed', sill: 'none' }],
  ['arch small print', { printHeight: 40, mullions: 4, mullionWidth: 0.3 }], ['arch large print', { printHeight: 600 }],
  ...CLOSED.flatMap(([n, q]) => PRE.map((k) => [`${n} ${k}`, { ...q, profilePreset: k }])),
  ['rect backed', { skeleton: 'rect', lights: 'backed' }], ['oval recessed', { skeleton: 'oval', lights: 'recessed' }],
  ['arch rinceau', ON], ['rect rinceau', { skeleton: 'rect', ...ON }], ['oval rinceau', { skeleton: 'oval', ...ON }],
  ['arch dense rinceau', DENSE], ['rect dense groups', { skeleton: 'rect', ...DENSE, ornLayout: 'groups' }],
  ['arch beading', { bandPattern: 'beading' }], ['rect leaves', { skeleton: 'rect', bandPattern: 'leaves' }],
];
const SP_ROWS = [
  ['arch default', {}], ['rect default', { skeleton: 'rect' }], ['oval default', { skeleton: 'oval' }],
  ['arch rinceau', ON], ['rect rinceau', { skeleton: 'rect', ...ON }], ['oval rinceau', { skeleton: 'oval', ...ON }],
  ['arch dense', DENSE], ['rect dense', { skeleton: 'rect', ...DENSE }], ['oval dense', { skeleton: 'oval', ...DENSE }],
  ['arch groups', { ...ON, ornLayout: 'groups' }], ['rect groups', { skeleton: 'rect', ...ON, ornLayout: 'groups' }], ['oval groups', { skeleton: 'oval', ...ON, ornLayout: 'groups' }],
  ['arch backed, stepped sill, cove', { lights: 'backed', sill: 'stepped', profilePreset: 'cove' }], ['arch 4 mullions, no sill', { mullions: 4, sill: 'none' }],
  ['circle beading', { skeleton: 'oval', aspect: 1, bandPattern: 'beading' }],
];
const CP2_ROWS = [['arch default', {}], ['rect default', { skeleton: 'rect' }], ['oval default', { skeleton: 'oval' }], ['arch flat', { profilePreset: 'flat' }], ['arch stepped', { profilePreset: 'stepped' }], ['arch backed', { lights: 'backed' }], ['arch rinceau', ON]];
const PR_ROWS = [['arch', {}], ['rectangle', { skeleton: 'rect' }], ['oval', { skeleton: 'oval' }]];

/* ---------------- the modules ---------------- */
async function load(dir) {
  const imp = (f) => import(pathToFileURL(path.join(dir, f)).href);
  return { dir, G: await imp('frame-geometry.js'), RL: await imp('frame-relief.js'), FL: await imp('frame-filigree.js'), PT: await imp('frame-pattern.js'), FM: await imp('frame-math.js'), PR: await imp('frame-print.js') };
}
const build = (M, q) => M.RL.buildRelief(M.PT.withPattern(M.FL.withOrnament(M.G.buildFrame(q))));
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b.buffer, b.byteOffset, b.byteLength)).digest('hex');

/* ---------------- FM0: the scan ---------------- */
function blank(src) {
  // comments and string / template / regex literals blanked (newlines kept);
  // a regex literal is told from a division by the token before it
  let out = '', i = 0, prev = '';
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') { out += ' '; i++; } continue; }
    if (c === '/' && d === '*') { while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { out += src[i] === '\n' ? '\n' : ' '; i++; } out += '  '; i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') { const q = c; out += ' '; i++; while (i < n && src[i] !== q) { if (src[i] === '\\') { out += '  '; i += 2; continue; } if (q === '`' && src[i] === '$' && src[i + 1] === '{') { let depth = 0; do { if (src[i] === '{') depth++; if (src[i] === '}') depth--; out += src[i]; i++; } while (i < n && depth > 0); continue; } out += src[i] === '\n' ? '\n' : ' '; i++; } out += ' '; i++; prev = 'x'; continue; }
    if (c === '/' && /[(,=:[!&|?{};]$|^$|return$/.test(prev)) { out += ' '; i++; while (i < n && src[i] !== '/') { if (src[i] === '\\') { out += '  '; i += 2; continue; } if (src[i] === '[') { while (i < n && src[i] !== ']') { out += ' '; i++; } } out += ' '; i++; } out += ' '; i++; while (/[a-z]/.test(src[i] || '')) { out += ' '; i++; } prev = 'x'; continue; }
    out += c; if (!/\s/.test(c)) prev = (/[\w$]/.test(c) ? (/[\w$]/.test(prev.slice(-1)) ? prev + c : c) : c); i++;
  }
  return out;
}
const TRANSCENDENTAL = /\bMath\.(sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|asinh|acosh|atanh|exp|expm1|log|log1p|log2|log10|pow|cbrt)\s*\(/g;
function scan(dir) {
  const hits = [];
  for (const f of GEOMETRY_MODULES) {
    const src = blank(fs.readFileSync(path.join(dir, f), 'utf8'));
    src.split('\n').forEach((line, k) => { for (const m of line.matchAll(TRANSCENDENTAL)) hits.push(`${f}:${k + 1} Math.${m[1]}`); if (/\*\*/.test(line)) hits.push(`${f}:${k + 1} **`); });
  }
  return hits;
}

/* ---------------- FM1: frame-math against Node's Math ---------------- */
function mathAgreement(FM, N = 200000) {
  let s = 987654321; const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  const gens = [(r) => (r * 2 - 1) * 10, (r) => (r * 2 - 1) * 1000, (r) => (r * 2 - 1) * 1e-6, (r) => (r * 2 - 1) * 1e7, (r) => (r * 2 - 1) * 1e300, (r) => r, (r) => (r * 2 - 1) * Math.pow(2, Math.floor(rnd() * 200 - 100))];
  const fns = [['sin', (a) => FM.sin(a), (a) => Math.sin(a)], ['cos', (a) => FM.cos(a), (a) => Math.cos(a)], ['atan', (a) => FM.atan(a), (a) => Math.atan(a)], ['exp', (a) => FM.exp(a), (a) => Math.exp(a)], ['log', (a) => FM.log(Math.abs(a)), (a) => Math.log(Math.abs(a))], ['atan2', (a, b) => FM.atan2(a, b), (a, b) => Math.atan2(a, b)], ['pow', (a, b) => FM.pow(Math.abs(a), b / 10), (a, b) => Math.pow(Math.abs(a), b / 10)], ['pow−', (a, b) => FM.pow(a, Math.round(b)), (a, b) => Math.pow(a, Math.round(b))]];
  const bad = [], per = [];
  for (const [name, f, g] of fns) {
    let n = 0, b = 0;
    for (const gen of gens) for (let i = 0; i < N; i++) { const a = gen(rnd()), c = gen(rnd()); n++; if (!Object.is(f(a, c), g(a, c))) { b++; if (bad.length < 4) bad.push(`${name}(${a}, ${c}): ${f(a, c)} vs ${g(a, c)}`); } }
    per.push(`${name} ${b}/${n}`);
  }
  const sp = [0, -0, 1, -1, 0.5, 2, Infinity, -Infinity, NaN, Math.PI, Math.PI / 2, Math.PI / 4, 1e-320, 5e-324, 709.78, -745.2, 1e10, 3, -3, 0.1];
  let spBad = 0;
  for (const a of sp) { for (const b of sp) for (const [n, f, g] of [['atan2', FM.atan2, Math.atan2], ['pow', FM.pow, Math.pow]]) if (!Object.is(f(a, b), g(a, b))) { spBad++; if (bad.length < 6) bad.push(`${n}(${a}, ${b})`); } for (const [n, f, g] of [['sin', FM.sin, Math.sin], ['cos', FM.cos, Math.cos], ['atan', FM.atan, Math.atan], ['exp', FM.exp, Math.exp], ['log', FM.log, Math.log]]) if (!Object.is(f(a), g(a))) { spBad++; if (bad.length < 6) bad.push(`${n}(${a})`); } }
  return { ok: bad.length === 0, detail: `${per.join(', ')}; specials ${spBad} off${bad.length ? ' — ' + bad.join('; ') : ''}` };
}

/* ---------------- CP: coincident and near-coincident pairs ---------------- */
const JOIN = new Set([4, 5, 6]);   // ROLE.cap, ROLE.stub, ROLE.plateWall (frame-relief.js)
function triData(rel) {
  const X = Float32Array.from(rel.positions), I = rel.indices, nt = I.length / 3;
  const owner = new Int32Array(nt).fill(-1); rel.parts.forEach((p, k) => { for (let t = p.t0; t < p.t1; t++) owner[t] = k; });
  const T = new Array(nt);
  for (let t = 0; t < nt; t++) {
    const a = 3 * I[3 * t], b = 3 * I[3 * t + 1], c = 3 * I[3 * t + 2];
    const A = [X[a], X[a + 1], X[a + 2]], B = [X[b], X[b + 1], X[b + 2]], C = [X[c], X[c + 1], X[c + 2]];
    const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], v = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const l = Math.hypot(n[0], n[1], n[2]); if (!(l > 1e-14)) continue;
    n = [n[0] / l, n[1] / l, n[2] / l];
    const size = Math.max(Math.hypot(...u), Math.hypot(...v), Math.hypot(B[0] - C[0], B[1] - C[1], B[2] - C[2]));
    T[t] = { A, B, C, n, d: n[0] * A[0] + n[1] * A[1] + n[2] * A[2], size, lo: [0, 1, 2].map((k) => Math.min(A[k], B[k], C[k])), hi: [0, 1, 2].map((k) => Math.max(A[k], B[k], C[k])) };
  }
  return { T, owner, nt };
}
function overlapArea(t1, t2) {
  const a2 = (P) => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  if (a2(t1) < 0) t1 = [t1[0], t1[2], t1[1]]; if (a2(t2) < 0) t2 = [t2[0], t2[2], t2[1]];
  let P = t1;
  for (let i = 0; i < 3 && P.length; i++) {
    const a = t2[i], b = t2[(i + 1) % 3], out = [], side = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    for (let k = 0; k < P.length; k++) { const p = P[k], q = P[(k + 1) % P.length], sp = side(p), sq = side(q); if (sp >= 0) out.push(p); if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); } }
    P = out;
  }
  return P.length >= 3 ? Math.abs(a2(P)) : 0;
}
const COS = Math.cos(CP_ANGLE_DEG * Math.PI / 180), TAN = Math.tan(CP_ANGLE_DEG * Math.PI / 180);
function nearPair(P, Q) {
  const dot = P.n[0] * Q.n[0] + P.n[1] * Q.n[1] + P.n[2] * Q.n[2];
  if (Math.abs(dot) < COS) return 0;
  const off = (p, R) => Math.abs(R.n[0] * p[0] + R.n[1] * p[1] + R.n[2] * p[2] - R.d);
  const tolP = Math.min(CP_DIST_MM, TAN * P.size), tolQ = Math.min(CP_DIST_MM, TAN * Q.size);
  if (off(Q.A, P) > tolP || off(Q.B, P) > tolP || off(Q.C, P) > tolP) return 0;
  if (off(P.A, Q) > tolQ || off(P.B, Q) > tolQ || off(P.C, Q) > tolQ) return 0;
  const n = P.n, k = Math.abs(n[0]) > Math.abs(n[1]) ? (Math.abs(n[0]) > Math.abs(n[2]) ? 0 : 2) : (Math.abs(n[1]) > Math.abs(n[2]) ? 1 : 2);
  const pr = (p) => (k === 0 ? [p[1], p[2]] : k === 1 ? [p[0], p[2]] : [p[0], p[1]]);
  return overlapArea([pr(P.A), pr(P.B), pr(P.C)], [pr(Q.A), pr(Q.B), pr(Q.C)]) / Math.abs(n[k]);
}
/* every near-coincident cross-shell pair, by a 3-D grid of triangle boxes;
   `only` limits the queries to the triangles it accepts (CP1: join faces) */
function pairs(rel, only = null) {
  const { T, owner, nt } = triData(rel), roles = rel.roles;
  const G = 2, grid = new Map(), key = (i, j, k) => `${i},${j},${k}`;
  for (let t = 0; t < nt; t++) { const P = T[t]; if (!P) continue; for (let i = Math.floor((P.lo[0] - CP_DIST_MM) / G); i <= Math.floor((P.hi[0] + CP_DIST_MM) / G); i++) for (let j = Math.floor((P.lo[1] - CP_DIST_MM) / G); j <= Math.floor((P.hi[1] + CP_DIST_MM) / G); j++) for (let k = Math.floor((P.lo[2] - CP_DIST_MM) / G); k <= Math.floor((P.hi[2] + CP_DIST_MM) / G); k++) { const s = key(i, j, k); let L = grid.get(s); if (!L) grid.set(s, (L = [])); L.push(t); } }
  const out = [], seen = new Set();
  for (let t = 0; t < nt; t++) {
    const P = T[t]; if (!P || (only && !only(t))) continue;
    for (let i = Math.floor(P.lo[0] / G); i <= Math.floor(P.hi[0] / G); i++) for (let j = Math.floor(P.lo[1] / G); j <= Math.floor(P.hi[1] / G); j++) for (let k = Math.floor(P.lo[2] / G); k <= Math.floor(P.hi[2] / G); k++) for (const u of grid.get(key(i, j, k)) || []) {
      if (u === t || owner[u] === owner[t]) continue;
      const pk = t < u ? t * nt + u : u * nt + t; if (seen.has(pk)) continue;
      const Q = T[u]; if (!Q || Q.lo[0] > P.hi[0] + CP_DIST_MM || Q.hi[0] < P.lo[0] - CP_DIST_MM || Q.lo[1] > P.hi[1] + CP_DIST_MM || Q.hi[1] < P.lo[1] - CP_DIST_MM || Q.lo[2] > P.hi[2] + CP_DIST_MM || Q.hi[2] < P.lo[2] - CP_DIST_MM) continue;
      seen.add(pk);
      const area = nearPair(P, Q);
      if (area > CP_AREA_MM2) out.push({ t, u, a: rel.parts[owner[t]].id, b: rel.parts[owner[u]].id, ra: roles ? roles[t] : -1, rb: roles ? roles[u] : -1, area, back: Math.abs(Math.abs(P.n[2]) - 1) < 1e-9 && Math.abs(P.d) < 1e-6 && Math.abs(Math.abs(Q.n[2]) - 1) < 1e-9 && Math.abs(Q.d) < 1e-6, at: P.A });
    }
  }
  return out;
}
const joinPairs = (rel) => pairs(rel, (t) => JOIN.has(rel.roles[t])).filter((p) => JOIN.has(p.ra) || JOIN.has(p.rb));
const strip = (id) => id.replace(/\d+/g, '#');

/* ---------------- the clauses ---------------- */
async function runNode(M, label, which) {
  const res = [];
  const rec = (name, ok, detail) => { res.push({ name, ok: !!ok, detail }); if (label === 'shipped') console.log(`${ok ? ' ok ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };
  if (which.FM0) { const hits = scan(M.dir); rec('FM0 no frame geometry module calls a transcendental Math function or uses ** — every one goes through frame-math.js', hits.length === 0, `${GEOMETRY_MODULES.length} modules scanned${hits.length ? ' — ' + hits.slice(0, 6).join(', ') : ''}`); }
  if (which.FM1) { const a = mathAgreement(M.FM, label === 'shipped' ? 200000 : 20000); rec(`FM1 frame-math.js is the running Node's Math, to the bit (Node ${process.versions.node}, V8 ${process.versions.v8})`, a.ok, a.detail); }
  if (which.CP1) {
    const bad = []; let rows = 0, joins = 0;
    for (const [name, q] of which.rows || CP_ROWS) {
      const rel = build(M, q); rows++;
      for (let t = 0; t < rel.roles.length; t++) if (JOIN.has(rel.roles[t])) joins++;
      const P = joinPairs(rel);
      if (P.length) { const cls = {}; for (const p of P) { const k = [strip(p.a), strip(p.b)].sort().join('×'); cls[k] = (cls[k] || 0) + 1; } bad.push(`${name}: ${P.length} (${Object.entries(cls).map(([k, v]) => `${k} ${v}`).join(', ')}; first at ${P[0].at.map((v) => v.toFixed(2)).join(',')})`); }
    }
    rec(`CP1 no join face (stub, lip, end cap, plate wall) is coincident or near-coincident with another shell's face — planes within ${CP_ANGLE_DEG}°, every vertex within ${CP_DIST_MM} mm, the back plane included`, bad.length === 0 && joins > 0, `${rows} rows, ${joins.toLocaleString('en-US')} join faces${bad.length ? ' — ' + bad.slice(0, 4).join(' · ') : ', 0 pairs'}`);
  }
  if (which.CP2 && label === 'shipped') {
    console.log('     CP2 (reported, never a fail) — coincident pairs no join face is part of:');
    for (const [name, q] of CP2_ROWS) {
      const rel = build(M, q), P = pairs(rel), back = P.filter((p) => p.back), wire = P.filter((p) => !p.back && (p.ra === 7 || p.rb === 7)), body = P.filter((p) => !p.back && p.ra !== 7 && p.rb !== 7);
      const cls = {}; for (const p of body) { const k = [strip(p.a), strip(p.b)].sort().join('×'); cls[k] = (cls[k] || 0) + 1; }
      console.log(`       ${name.padEnd(16)} BACK ${String(back.length).padStart(7)} pairs, ${back.reduce((s, p) => s + p.area, 0).toFixed(0).padStart(6)} mm² · BODY ${String(body.length).padStart(6)} pairs, ${body.reduce((s, p) => s + p.area, 0).toFixed(1)} mm²${body.length ? ' (' + Object.entries(cls).map(([k, v]) => `${k} ${v}`).join(', ') + ')' : ''} · WIRE END ${wire.length} pairs, ${wire.reduce((s, p) => s + p.area, 0).toFixed(2)} mm²`);
    }
  }
  if (which.PR) {
    const bad = [];
    if (label === 'shipped') console.log('     PR print readiness (frame-print.js, vertical rays at 0.1 mm; the three default frames at 180 mm):');
    for (const [name, q] of PR_ROWS) {
      const rel = build(M, q), r = M.PR.measurePrint(rel, { cell: 0.1 });
      if (label === 'shipped') console.log(`       ${name.padEnd(10)} box ${r.box.x.toFixed(2)} × ${r.box.y.toFixed(2)} × ${r.box.z.toFixed(2)} mm · relief ${r.abovePlateMm.toFixed(2)} mm above a ${r.plateT.toFixed(2)} mm plate · volume ${(r.volumeMm3 / 1000).toFixed(2)} cm³ · ${r.triangles.toLocaleString('en-US')} triangles, ${(r.bytes / 1048576).toFixed(2)} MiB · narrowest feature ${r.feature.mm.toFixed(2)} mm · narrowest gap ${Number.isFinite(r.gap.mm) ? r.gap.mm.toFixed(2) + ' mm' : 'none enclosed'} · thinnest ${r.thinMm.toFixed(2)} mm above the back · back z ${r.backZ}, ${(100 * r.rest).toFixed(2)} % of the footprint on it, ${r.overhangRays} overhanging rays`);
      if (r.backZ !== 0) bad.push(`${name}: the back's least z is ${r.backZ}`);
      if (r.rest !== 1) bad.push(`${name}: ${(100 * (1 - r.rest)).toFixed(3)} % of the footprint does not rest on z = 0`);
      if (r.overhangRays) bad.push(`${name}: ${r.overhangRays} rays meet material above an empty space`);
      if (r.oddRays) bad.push(`${name}: ${r.oddRays} rays cross a shell an odd number of times`);
    }
    rec('PR the three default frames lie flat on z = 0 (least z 0, the whole footprint resting on it, nothing overhanging, every ray\'s crossings paired)', bad.length === 0, bad.join('; '));
  }
  return res;
}

async function runBrowser(M, label, rows = SP_ROWS) {
  let chromium;
  try { ({ chromium } = await import('playwright-core')); } catch { return [{ name: 'SP', skipped: 'playwright-core is not installed (npm i --no-save playwright-core)' }]; }
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
  const server = http.createServer((req, res) => {
    const p = path.join(M.dir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(M.dir) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => server.listen(0, r));
  const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => fs.existsSync(p));
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.route('**fonts.googleapis.com/**', (r) => r.abort()); await page.route('**fonts.gstatic.com/**', (r) => r.abort()); await page.route('**cdn.jsdelivr.net/**', (r) => r.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}/frame.html`);
  await page.waitForFunction(() => !!window.__frame);
  const bad = [];
  for (const [name, q] of rows) {
    await page.evaluate((v) => window.__frame.setParams(v), q);
    const pg = await page.evaluate(() => window.__frame.stlDigest());
    const nb = M.RL.exportStl(build(M, q)), nh = sha(nb);
    if (pg.sha256 !== nh || pg.bytes !== nb.length) bad.push(`${name}: page ${pg.triangles} triangles ${pg.sha256.slice(0, 12)}, Node ${(nb.length - 84) / 50} ${nh.slice(0, 12)}`);
  }
  const ua = await page.evaluate(() => navigator.userAgent.match(/Chrome\/[\d.]+/)?.[0] || navigator.userAgent);
  await browser.close(); server.close();
  const r = { name: `SP the page's STL is Node's, byte for byte (SHA-256 of the bytes Get STL saves, ${ua} against Node ${process.versions.node})`, ok: bad.length === 0 && errors.length === 0, detail: `${rows.length} rows${bad.length ? ' — ' + bad.slice(0, 4).join(' · ') : ', every hash equal'}${errors.length ? ' — page errors: ' + errors.slice(0, 2).join('; ') : ''}` };
  if (label === 'shipped') console.log(`${r.ok ? ' ok ' : 'FAIL'} ${r.name} — ${r.detail}`);
  return [r];
}

/* ---------------- the mutants ---------------- */
const MUTANTS = [
  { id: 'the-page-reads-the-engines-own-atan2', breaks: ['FM0', 'SP'], edits: [['frame-geometry.js', 'const tApex = FM.atan2(rise, cx);', 'const tApex = Math.atan2(rise, cx);']], rows: { sp: [['arch default', {}]] } },
  { id: 'frame-math-sin-is-a-bit-off', breaks: ['FM1'], edits: [['frame-math.js', 'S1 = -1.66666666666666324348e-01', 'S1 = -1.66666666666666434e-01']] },
  { id: 'the-stub-is-full-section', breaks: ['CP1'], edits: [['frame-relief.js', 'if (stubRows.length) {', 'if (false) {']], rows: { cp: [['arch default', {}]] } },
  { id: 'the-springing-is-two-bands', breaks: ['CP1'], edits: [['frame-relief.js', '    if (!s.continues) continue;\n    const r = { start: null, end: null, unmet: [] };', '    continue;\n    const r = { start: null, end: null, unmet: [] };']], rows: { cp: [['arch default', {}]] } },
  { id: 'the-plate-stands-on-the-silhouette', breaks: ['CP1'], edits: [['frame-relief.js', 'plate = plateOutline(model, hw, open ? 0 : hw);', 'plate = plateOutline(model, 0, 0);'], ['frame-relief.js', 'const top = open ? plateOutline(model, hw, 0.1 * panelT / scale) : plate;', 'const top = plate;']], rows: { cp: [['arch backed', { lights: 'backed' }], ['rect backed', { skeleton: 'rect', lights: 'backed' }]] } },
  { id: 'the-lip-is-not-inset', breaks: ['CP1'], edits: [['frame-relief.js', '  if (lip) {\n    const cz = stubInset(', '  if (false) {\n    const cz = stubInset(']], rows: { cp: [['arch default, stepped sill', { sill: 'stepped' }]] } },
  { id: 'a-stub-bottom-sinks-below-the-back', breaks: ['PR'], edits: [['frame-relief.js', 'P[b3] = q[0] * scale; P[b3 + 1] = q[1] * scale; P[b3 + 2] = cz;', 'P[b3] = q[0] * scale; P[b3 + 1] = q[1] * scale; P[b3 + 2] = -cz;']] },
];
function mutantDir(m) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `frame-stl-${m.id}-`));
  for (const f of COPY) fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
  for (const [f, from, to] of m.edits) { const p = path.join(dir, f), s = fs.readFileSync(p, 'utf8'); if (s.split(from).length !== 2) throw new Error(`${m.id}: the anchor in ${f} matches ${s.split(from).length - 1} times`); fs.writeFileSync(p, s.replace(from, to)); }
  return dir;
}
async function negativeControl() {
  // every anchor first, over all mutants
  for (const m of MUTANTS) for (const [f, from] of m.edits) { const n = fs.readFileSync(path.join(ROOT, f), 'utf8').split(from).length - 1; if (n !== 1) { console.log(`FAIL anchor ${m.id} (${f}) matches ${n} times`); process.exit(1); } }
  console.log(`all ${MUTANTS.length} anchors match exactly once`);
  let bad = 0;
  for (const m of MUTANTS) {
    const dir = mutantDir(m), M = await load(dir), fams = new Set(['FM0', 'FM1', 'CP1', 'PR', 'SP']);
    const which = { FM0: true, FM1: true, CP1: true, PR: true, rows: m.rows?.cp || [['arch default', {}], ['arch backed', { lights: 'backed' }], ['arch default, stepped sill', { sill: 'stepped' }]] };
    let res = await runNode(M, m.id, which);
    if (!NOBROWSER && m.breaks.includes('SP')) res = res.concat(await runBrowser(M, m.id, m.rows?.sp || [['arch default', {}]]));
    else fams.delete('SP');
    const red = new Set(res.filter((r) => r.ok === false).map((r) => r.name.split(' ')[0]));
    const missed = m.breaks.filter((b) => fams.has(b) && !red.has(b)), extra = [...red].filter((b) => !m.breaks.includes(b));
    const ok = !missed.length && !extra.length;
    if (!ok) bad++;
    console.log(`${ok ? ' ok ' : 'FAIL'} ${m.id}: reddens ${[...red].join(', ') || 'nothing'}${missed.length ? ` — MISSED ${missed.join(', ')}` : ''}${extra.length ? ` — UNCLAIMED ${extra.join(', ')}` : ''}`);
    fs.rmSync(dir, { recursive: true, force: true });
  }
  console.log(bad ? `NEGATIVE CONTROL FAILED: ${bad} of ${MUTANTS.length}` : `NEGATIVE CONTROL PASSED: all ${MUTANTS.length} mutants redden exactly what they name`);
  process.exit(bad ? 1 : 0);
}

if (NEG) await negativeControl();
else {
  const M = await load(ROOT);
  let res = await runNode(M, 'shipped', { FM0: true, FM1: true, CP1: true, CP2: true, PR: true });
  if (NOBROWSER) console.log('     SP (the page\'s STL against Node\'s): SKIPPED — --no-browser');
  else { const b = await runBrowser(M, 'shipped'); if (b[0].skipped) { console.log(`FAIL SP — ${b[0].skipped}`); res.push({ ok: false }); } else res = res.concat(b); }
  const failed = res.filter((r) => r.ok === false).length;
  console.log(failed ? `${failed} of ${res.length} checks FAILED` : `${res.length} of ${res.length} checks passed`);
  process.exit(failed ? 1 : 0);
}
