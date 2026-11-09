#!/usr/bin/env node
/* ===================================================================
   verify-bloom-ribs-shipped.mjs — THE SHIPPED RIBS, IN NODE (Nov 9; read
   docs/bloom-surface-texture-ribs-shipped.md). The prototype's gate
   (tools/verify-bloom-ribs.mjs, R0-R8) ported onto the shipped texture:

     TXR0-TXR3, TXR6-TXR9  the harness's own clauses (`ribsRecordClauses`,
           `ribsBuildClauses`), run here on Node builds of every row in BOTH
           modes — the same functions both STL gates run on the page's record
     TXR3e ZERO OPEN EDGES (the prototype's R3): 0 unmatched, 0 doubled, 0
           degenerate directed edges on the build's float32s
     TXR4  NO CROSS-PART COINCIDENT VERTEX (R4): the ribbed build welds into
           no FEWER shells than the same build with nothing raised
           (`boneNoRelief`, vertex for vertex) — a relief that lands two parts
           on one float32 merges them, and the count says so (more is the
           shipped derived owner's clearance parting two closed organs' shared
           copies, the closed tube's hub and ring: by design)
     TXR5  ENGINE AGREEMENT (R5): the RIBS block of bloom-geometry.js names no
           Math.atan2 / atan / cos / sin / tan / exp / log / log2 / pow / hypot
           / cbrt and no `**` (the static half); `--browser` builds the rows
           in Chromium and compares the triangle count and an FNV-1a hash of
           every float32 against Node's
     TXR10 THE BYTES OUTSIDE RIBS: a BONE build, a PEBBLE build and the
           shipping default are bit-identical to a build of the same state
           with the RIBS arm's three branches unreachable (NONE's own path)
           — the cheap half of the byte partition (the whole-matrix half is
           verify-bloom-surface-bytes --movers-predicate ribs)

     node tools/verify-bloom-ribs-shipped.mjs                 # every clause, every row, both modes
     node tools/verify-bloom-ribs-shipped.mjs --negative-control   # ten mutants of bloom-geometry.js
     node tools/verify-bloom-ribs-shipped.mjs --browser       # + TXR5's engine half

   --negative-control: each mutant is a copy of bloom-geometry.js with one
   anchored edit (refused unless the anchor matches exactly once — every
   anchor is checked before any mutant runs), imported fresh; it must fire
   the clause it names, and its WITNESS — a direct call on the MUTATED module
   proving the intended behaviour moved — runs first (never the gate asked
   whether the gate fired).
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GEO_FILE = path.join(ROOT, 'bloom-geometry.js');
const H = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-harness.mjs')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const G0 = await import(pathToFileURL(GEO_FILE).href);
const argv = process.argv.slice(2);

/* the rows: the defaults, law B, the height's maximum, the exclusion, a compound leaf, sepals and leaves, the sphere, a tube */
export const ROWS = [
  ['the ruled defaults', {}],
  ['law B x height max', { ribLaw: 'B', ribHeight: 2.5 }],
  ['law A x spacing 5.75 x height max', { ribSpacing: 5.75, ribHeight: 2.5 }],
  ['x a 60 mm stem, 12 stamens and the style', { stemLength: 60, stamenCount: 12, gynoecium: 'STYLE' }],
  ['x a compound leaf on a 60 mm stem', { stemLength: 60, leafLength: 30, leafType: 'COMPOUND' }],
  ['x 5 sepals and simple leaves on a 60 mm stem', { stemLength: 60, sepalCount: 5, leafLength: 30 }],
  ['x the SPHERE head x a stem', { placement: 'CONTINUOUS', hubShape: 'SPHERE', stemLength: 60 }],
  ['x a closed tube', { petalCount: 6, tubeLayer1: 0 }],
];
const stateOf = (extra) => ({ ...DEFAULTS, petalTexture: 'RIBS', ...extra });
const OPTS = { below: null, scopes: null };

/* the directed-edge census and the vertex-weld shell count, on float32s */
function census(positions) {
  const key = (i) => `${Math.fround(positions[i])}|${Math.fround(positions[i + 1])}|${Math.fround(positions[i + 2])}`;
  const id = new Map(), V = [];
  const vid = (i) => { const k = key(i); let v = id.get(k); if (v === undefined) { v = id.size; id.set(k, v); } return v; };
  const nT = positions.length / 9, T = new Int32Array(nT * 3);
  let degen = 0;
  for (let t = 0; t < nT; t++) { for (let c = 0; c < 3; c++) T[t * 3 + c] = vid(t * 9 + c * 3); if (T[t * 3] === T[t * 3 + 1] || T[t * 3 + 1] === T[t * 3 + 2] || T[t * 3] === T[t * 3 + 2]) degen++; }
  const dir = new Map();
  for (let t = 0; t < nT; t++) for (let c = 0; c < 3; c++) { const a = T[t * 3 + c], b = T[t * 3 + (c + 1) % 3], k = `${a}>${b}`; dir.set(k, (dir.get(k) || 0) + 1); }
  let unmatched = 0, doubled = 0;
  for (const [k, n] of dir) { if (n > 1) doubled += n - 1; const [a, b] = k.split('>'); if ((dir.get(`${b}>${a}`) || 0) !== n) unmatched++; }
  const par = new Int32Array(id.size); for (let i = 0; i < par.length; i++) par[i] = i;
  const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let t = 0; t < nT; t++) { const a = find(T[t * 3]); par[find(T[t * 3 + 1])] = a; par[find(T[t * 3 + 2])] = a; }
  const roots = new Set(); for (let i = 0; i < par.length; i++) roots.add(find(i));
  return { tris: nT, degen, unmatched, doubled, shells: roots.size };
}

/* TXR5's static half: the RIBS block's decision code names no transcendental */
export const TXR5_BANNED = /Math\.(atan2|atan|cos|sin|tan|exp|log2|log|pow|hypot|cbrt)\b|\*\*/;
export function ribsBlockOf(src) {
  const a = src.indexOf('export const RIB_LAWS'), b = src.indexOf('function ribsTextureFor(');
  if (a < 0 || b < 0) throw new Error('TXR5: the RIBS block (RIB_LAWS .. ribsTextureFor) is not in bloom-geometry.js — the clause cannot run');
  return src.slice(a, b);
}
export function staticClauses(src) {
  const bad = [];
  const blk = ribsBlockOf(src);
  blk.split('\n').forEach((ln, i) => { const code = ln.replace(/\/\*.*?\*\/|\/\/.*$/g, '').replace(/(['`"]).*?\1/g, ''); if (TXR5_BANNED.test(code)) bad.push(`TXR5: the RIBS block names a transcendental the engines need not agree on (line ${i + 1}: ${ln.trim().slice(0, 100)})`); });
  return bad;
}

export function rowClauses(G, label, extra, exportMode) {
  const bad = [];
  const ui = stateOf(extra);
  const acc = new G.MeshBuilder({ exportMode, boneDetail: 'coarse' });
  const rec = G.buildBloomInto(acc, ui, OPTS);
  for (const m of H.ribsRecordClauses(ui, rec.texture, null)) bad.push(m);
  for (const m of H.ribsBuildClauses(ui, OPTS, exportMode, G)) bad.push(m);
  const C = census(acc.positions);
  if (C.unmatched || C.doubled || C.degen) bad.push(`TXR3: ${C.unmatched} unmatched, ${C.doubled} doubled, ${C.degen} degenerate directed edges on the float32s (zero open edges)`);
  const accN = new G.MeshBuilder({ exportMode, boneDetail: 'coarse' });
  G.buildBloomInto(accN, ui, { ...OPTS, capability: { boneNoRelief: true } });
  const CN = census(accN.positions);
  /* MORE shells is the shipped derived owner's clearance parting two closed
     organs' shared copies (the closed tube's hub and ring) — by design; FEWER
     is two parts landed on one float32 by the relief */
  if (C.shells < CN.shells) bad.push(`TXR4: the ribbed build welds into ${C.shells} shells where the same build with nothing raised welds into ${CN.shells} — the relief landed two parts on one float32`);
  return { bad: bad.map((m) => `${label} (${exportMode ? 'EXPORT' : 'LIVE'}): ${m}`), tris: acc.triangleCount, census: C };
}

/* TXR10: the bytes outside RIBS hold */
export function holdClauses(G) {
  const bad = [];
  for (const [label, st] of [['the shipping default', {}], ['BONE (coarse)', { petalTexture: 'BONE' }], ['PEBBLE', { petalTexture: 'PEBBLE' }], ['BONE x 12 stamens, style, stem', { petalTexture: 'BONE', stemLength: 60, stamenCount: 12, gynoecium: 'STYLE' }]]) {
    for (const em of [false, true]) {
      const a = new G.MeshBuilder({ exportMode: em, boneDetail: 'coarse' }); G.buildBloomInto(a, { ...DEFAULTS, ...st }, OPTS);
      const b = new G.MeshBuilder({ exportMode: em, boneDetail: 'coarse' }); G.buildBloomInto(b, { ...DEFAULTS, ...st, ribLaw: 'B', ribSpacing: 8, ribHeight: 2.5 }, OPTS);
      if (a.positions.length !== b.positions.length || a.positions.some((x, i) => !Object.is(x, b.positions[i]))) bad.push(`TXR10: ${label} (${em ? 'EXPORT' : 'LIVE'}) moves with the rib controls — they are hidden AND inert outside RIBS`);
    }
  }
  return bad;
}

async function runAll(G, src, { quiet = false } = {}) {
  const bad = [...staticClauses(src), ...holdClauses(G)];
  const report = [];
  for (const [label, extra] of ROWS) for (const em of [false, true]) {
    const r = rowClauses(G, label, extra, em);
    bad.push(...r.bad);
    report.push(`${label} ${em ? 'EXPORT' : 'LIVE'}: ${r.tris} tris, ${r.census.shells} shells, ${r.census.unmatched}/${r.census.doubled}/${r.census.degen} open/doubled/degenerate`);
  }
  if (!quiet) for (const l of report) console.log('  ' + l);
  return bad;
}

/* ------------------------------------------------- the mutants --- */
export const MUTANTS = [
  { id: 'relief-points-inward', names: 'TXR1', from: 'const p1 = di > 0 ? [q[0] + n[0] * di, q[1] + n[1] * di, q[2] + n[2] * di] : q;', to: 'const p1 = di > 0 ? [q[0] - n[0] * di, q[1] - n[1] * di, q[2] - n[2] * di] : q;',
    witness: (G) => { const a = new G.MeshBuilder({ exportMode: true }); const r = G.buildBloomInto(a, stateOf({}), OPTS); const q = r.texture.organs.petal.bone.samples.find((x) => x.s > 0); return !!q && ((q.p1[0] - q.p0[0]) * q.n[0] + (q.p1[1] - q.p0[1]) * q.n[1] + (q.p1[2] - q.p0[2]) * q.n[2]) < 0; } },
  { id: 'the-profile-is-sharp', names: 'TXR2', from: '  return (1 + ecos(Math.PI * u)) / 2;\n', to: '  return (1 - u) * (1 - u);\n',
    witness: (G) => G.ribField('A', 2).F([10 * Math.cos(Math.PI / 63 / 2), 10 * Math.sin(Math.PI / 63 / 2), 0]) < 0.3 },
  { id: 'law-A-counts-one-spoke-more', names: 'TXR8', from: 'const K = Math.max(RIB_MIN_SPOKES, Math.round((RIB_TAU * RIB_REF_RADIUS_MM) / s));', to: 'const K = Math.max(RIB_MIN_SPOKES, Math.round((RIB_TAU * RIB_REF_RADIUS_MM) / s) + 1);',
    witness: (G) => G.ribSchedule('A', 2).n0 === 64 },
  { id: 'law-B-is-ignored', names: 'TXR8', from: "  if (law === 'A') {\n    const K = Math.max(RIB_MIN_SPOKES,", to: "  if (true) {\n    const K = Math.max(RIB_MIN_SPOKES,",
    witness: (G) => G.ribSchedule('B', 2).levels.length === 1 },
  { id: 'the-centre-fades', names: 'TXR6', from: '    return f;\n  };\n  return { F, S };', to: '    return r < 6 ? f * (r / 6) : f;\n  };\n  return { F, S };',
    witness: (G) => G.ribField('A', 2).F([1, 0, 0]) < 0.5 },
  { id: 'the-stem-is-latticed', names: 'TXR7', from: '  if (T5 && !T5.ribs && (!pedicel || boneT) && stemPlanned.present) {', to: '  if (T5 && (!pedicel || boneT) && stemPlanned.present) {',
    witness: (G) => { const a = new G.MeshBuilder({ exportMode: true }); const r = G.buildBloomInto(a, stateOf({ stemLength: 60 }), OPTS); return r.t5.organs.includes('stem'); } },
  { id: 'the-rods-are-captured', names: 'TXR7', from: '  if (boneT && !boneT.ribs) acc.boneRods = { index: 0,', to: '  if (boneT) acc.boneRods = { index: 0,',
    witness: (G) => { const a = new G.MeshBuilder({ exportMode: true }); const r = G.buildBloomInto(a, stateOf({ stamenCount: 12, gynoecium: 'STYLE', stemLength: 60 }), OPTS); return r.t5.organs.some((o) => o === 'stamen' || o === 'style'); } },
  { id: 'the-hub-underside-is-ribbed', names: 'TXR7', from: "  if (O.organ === 'hub') return !(O.N[i * 3 + 2] > 0);", to: "  if (O.organ === 'hub') return false;",
    witness: (G) => G.ribExcluded({ organ: 'hub', N: [0, 0, -1] }, 0) === false },
  { id: 'math-atan2-restored', names: 'TXR5', from: '  if (ax === 0 && ay === 0) return 0;\n  let a = ay <= ax', to: '  if (ax === 0 && ay === 0) return 0;\n  if (x !== 0) { const m = Math.atan2(y, x); return m < 0 ? m + RIB_TAU : m; }\n  let a = ay <= ax',
    witness: (G) => G.eatan2(1, 1) === Math.atan2(1, 1) },
  { id: 'the-hub-centre-on-rings', names: 'TXR9', from: "t5Organs.push(organLatticeInto(acc, from, cap, { organ, edgeMm: T5.edgeMm, decide: d, fanRings: !T5.ribs }));", to: "t5Organs.push(organLatticeInto(acc, from, cap, { organ, edgeMm: T5.edgeMm, decide: d, fanRings: true }));",
    witness: (G) => { const a = new G.MeshBuilder({ exportMode: true }); const b = new G.MeshBuilder({ exportMode: true }); G.buildBloomInto(a, stateOf({}), OPTS); G.buildBloomInto(b, stateOf({ petalTexture: 'BONE' }), OPTS); return a.triangleCount === b.triangleCount; } },
];

async function loadMutant(src, M) {
  const n = src.split(M.from).length - 1;
  if (n !== 1) throw new Error(`mutant ${M.id}: its anchor matches ${n} times (must be exactly once)`);
  const out = src.replace(M.from, () => M.to).replace("from './bloom-curve.js'", `from '${pathToFileURL(path.join(ROOT, 'bloom-curve.js')).href}'`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ribs-mut-'));
  const file = path.join(dir, `bloom-geometry-${M.id}.mjs`);
  fs.writeFileSync(file, out);
  try { return { G: await import(pathToFileURL(file).href), src: out }; } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const src = fs.readFileSync(GEO_FILE, 'utf8');
  if (argv.includes('--negative-control')) {
    for (const M of MUTANTS) { const n = src.split(M.from).length - 1; if (n !== 1) { console.error(`REFUSED: mutant ${M.id}'s anchor matches ${n} times`); process.exit(2); } }
    let ok = 0;
    for (const M of MUTANTS) {
      const { G, src: msrc } = await loadMutant(src, M);
      const moved = M.witness(G);
      if (!moved) { console.log(`  MUTANT ${M.id}: the WITNESS did not move — the mutation is not the defect it names`); continue; }
      const bad = await runAll(G, msrc, { quiet: true });
      const fired = bad.some((m) => new RegExp(`\\b${M.names}:`).test(m));
      console.log(`  MUTANT ${M.id}: witness moved; ${fired ? 'FIRED' : 'MISSED'} ${M.names}${fired ? ` (${bad.filter((m) => new RegExp(`\\b${M.names}:`).test(m)).length} line(s): ${bad.find((m) => new RegExp(`\\b${M.names}:`).test(m)).slice(0, 220)})` : ` — ${bad.length} other line(s)${bad.length ? `: ${bad[0].slice(0, 200)}` : ''}`}`);
      if (fired) ok++;
    }
    console.log(`verify-bloom-ribs-shipped --negative-control: ${ok} of ${MUTANTS.length} mutants behave`);
    process.exit(ok === MUTANTS.length ? 0 : 1);
  }
  const bad = await runAll(G0, src);
  if (argv.includes('--browser')) {
    const { chromium } = await import('playwright-core');
    const { startServer, findChromium } = H;
    const { server, port } = await startServer();
    const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/bloom.html`);
    const fnv = (P) => { let h = 0x811c9dc5; const f = new Float32Array(P), u = new Uint8Array(f.buffer); for (let i = 0; i < u.length; i++) { h ^= u[i]; h = Math.imul(h, 0x01000193); } return h >>> 0; };
    for (const [label, extra] of ROWS) for (const em of [false, true]) {
      const a = new G0.MeshBuilder({ exportMode: em, boneDetail: 'coarse' }); G0.buildBloomInto(a, stateOf(extra), OPTS);
      const b = await page.evaluate(async ({ st, em }) => { const G = await import('/bloom-geometry.js'); const a = new G.MeshBuilder({ exportMode: em, boneDetail: 'coarse' }); G.buildBloomInto(a, st, { below: null, scopes: null }); let h = 0x811c9dc5; const f = new Float32Array(a.positions), u = new Uint8Array(f.buffer); for (let i = 0; i < u.length; i++) { h ^= u[i]; h = Math.imul(h, 0x01000193); } return { n: a.triangleCount, h: h >>> 0 }; }, { st: stateOf(extra), em });
      const same = b.n === a.triangleCount && b.h === fnv(a.positions);
      console.log(`  TXR5 engines, ${label} ${em ? 'EXPORT' : 'LIVE'}: Node ${a.triangleCount} / Chromium ${b.n} — ${same ? 'AGREE to the float32' : 'DISAGREE'}`);
      if (!same) bad.push(`TXR5: ${label} (${em ? 'EXPORT' : 'LIVE'}): Node and Chromium disagree (count ${a.triangleCount} / ${b.n}, hash ${fnv(a.positions)} / ${b.h})`);
    }
    await browser.close(); server.close();
  }
  for (const m of bad) console.log('  FAIL ' + m);
  console.log(`verify-bloom-ribs-shipped: ${bad.length ? `FAIL — ${bad.length} finding(s)` : `PASS — TXR0-TXR10 over ${ROWS.length} rows x both modes`}`);
  process.exit(bad.length ? 1 : 0);
}
