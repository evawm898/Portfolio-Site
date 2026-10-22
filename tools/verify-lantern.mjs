#!/usr/bin/env node
/* verify-lantern.mjs — the paper star lantern's geometry gate (pure Node, no
   browser; lantern-design-doc.md §13). Reads lantern-geometry.js through the
   same front door the page does and asks, on the defaults, every preset, the
   corners and a parameter sweep:

     L0  the defaults solve: no clamp, no steep rim, a small convex bow.
     L1  CLOSURE — every facet's development reaches exactly the symmetry's
         azimuth (|θ(1) − π/N| < 1e-9) wherever the solver reports ok.
     L2  THE RIM MATCHES — both halves' meshes have their rims at z = 0 and the
         two rim vertex sets are identical, and the front's centre is at +H,
         the back's at −H.
     L3  ISOMETRY — the 3D facet is the flat one developed: every generator's
         length is the flat ρ, the rim's 3D arc length is the flat edge length
         (to the quadrature's own 1e-4), and the development angle RE-DERIVED
         from the mesh by the angle between consecutive generators (never from
         develop()) equals the flat facet angle to 1e-6.
     L4  an infeasible target clamps and tells: the known-bad states carry
         `clampedDepth` and a 'depth' note, and the built depth closes.
     L5  the closure-ratio table in the design doc reproduces, and every
         preset's ratio is at least 1 (so no preset needs a clamp).
     L6  the SVG is well-formed: balanced tags, the three named layers with
         their colours, N scores and N perfs, the back's opening and ring.
     L7  the design JSON round-trips exactly; a newer version is refused; a
         missing field is reported and kept; an out-of-range value is told.
     L8  tabs: one per front edge, none reaching the tip or the inner vertex,
         and the two tabs meeting at a valley do not cross.
     L9  alternating points: the two flat facet angles sum to 2π/N, the flat
         tip angles close to 2π, both facets close.
     L10 the randomizer yields a closing, unclamped design for 20 seeds.
     L11 the mesh is finite, has 2N × (samples − 1) triangles a half (×2 with
         the opening strip), and its bounding radius is the finished tip radius.

   --negative-control re-imports a COPY of lantern-geometry.js with one
   deliberate defect at a time and requires each to redden exactly the clauses
   it names (every anchor checked before any runs). --quick skips the sweep. */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const NEG = args.includes('--negative-control');
const QUICK = args.includes('--quick');

async function run(G) {
  const { CORNERS, MUST_CLAMP, MUST_REFUSE, PRESETS } = await import(`./lantern-fixtures.mjs?${Date.now()}${Math.random()}`).catch(() => import('./lantern-fixtures.mjs'));
  // the fixtures import the REAL module for their edge curves; under a mutant we only need their states, built against G
  const res = [];
  const ok = (c, m) => res.push([!!c, m]);
  const all = [...CORNERS, ...PRESETS];
  const a0 = (m) => Math.PI / m.N;

  // L0
  {
    const m = G.solveLantern(G.DEFAULTS);
    const steep = all.filter((f) => G.solveLantern(f.state).infeasible > 0).map((f) => f.name);
    ok(m.ok && !m.clampedDepth && m.infeasible === 0 && m.bow >= 0 && m.bow < 0.05 && !steep.length, `L0: the defaults close — ok=${m.ok} clamped=${m.clampedDepth} steep=${m.infeasible} bow=${m.bow.toFixed(4)} of the chord (${(m.bow * m.facets[0].edge.chord).toFixed(1)} mm); fixtures with a steep rim: ${steep.length ? steep.join(', ') : 'none'}`);
  }
  // L1 closure on every fixture
  {
    let worst = 0, n = 0, bad = [];
    for (const f of all) { const m = G.solveLantern(f.state); if (!m.ok) { bad.push(f.name); continue; } for (const c of m.closure) { worst = Math.max(worst, Math.abs(c)); n++; } }
    ok(!bad.length && worst < 1e-9, `L1: closure — ${n} facet types over ${all.length} fixtures, worst |θ(1) − π/N| = ${worst.toExponential(2)}${bad.length ? `, NOT ok: ${bad.join(', ')}` : ''}`);
  }
  // L2 rim match
  {
    let worstZ = 0, mismatch = 0, centre = true, count = 0;
    for (const f of all) {
      const m = G.solveLantern(f.state);
      const F = G.foldedMesh(m, 1), B = G.foldedMesh(m, -1, { opening: true });
      const rimOf = (p) => { const s = new Set(); let maxAbs = 0; for (let i = 0; i < p.length; i += 3) { if (Math.abs(p[i + 2]) < 1e-9) s.add(`${p[i].toFixed(6)},${p[i + 1].toFixed(6)}`); } return s; };
      const rf = rimOf(F.positions), rb = rimOf(B.positions);
      for (const k of rf) if (!rb.has(k)) mismatch++;
      for (const k of rb) if (!rf.has(k)) mismatch++;
      const rim = G.rimCurve(m); for (const q of rim) worstZ = Math.max(worstZ, Math.abs(q[2]));
      // and the mesh's z = 0 vertex set IS the rim curve's (a rim vertex lifted off the plane leaves the set)
      const rc = new Set(rim.map((q) => `${q[0].toFixed(6)},${q[1].toFixed(6)}`));
      const rcF = new Set([...rf].filter((k) => { const [x, y] = k.split(',').map(Number); return rc.has(`${(Math.fround(x)).toFixed(6)},${(Math.fround(y)).toFixed(6)}`) || true; }));
      let onRim = 0; for (const q of rim) { const k = `${Math.fround(q[0]).toFixed(6)},${Math.fround(q[1]).toFixed(6)}`; if (rf.has(k)) onRim++; }
      if (onRim < rim.length - 1) mismatch += rim.length - onRim;
      const Fo = G.foldedMesh(m, 1, { opening: true });
      let zmaxF = -Infinity, zminB = Infinity, zmaxFo = -Infinity; for (let i = 2; i < F.positions.length; i += 3) zmaxF = Math.max(zmaxF, F.positions[i]); for (let i = 2; i < B.positions.length; i += 3) zminB = Math.min(zminB, B.positions[i]); for (let i = 2; i < Fo.positions.length; i += 3) zmaxFo = Math.max(zmaxFo, Fo.positions[i]);
      if (Math.abs(zmaxF - m.H) > 1e-4 || Math.abs(zminB + zmaxFo) > 1e-4 || !(zminB < 0)) centre = false;
      count += rf.size;
    }
    ok(worstZ === 0 && mismatch === 0 && centre, `L2: the rim matches — ${count} rim vertices over ${all.length} fixtures, worst |z| ${worstZ}, ${mismatch} unmatched between the halves, centres at ±H: ${centre}`);
  }
  // L3 isometry
  {
    let worstGen = 0, worstLen = 0, worstAng = 0;
    for (const f of all) {
      const m = G.solveLantern(f.state);
      for (const t of m.facets) {
        const { dev, edge } = t; const H = m.H;
        let len3 = 0, ang = 0, prev = null;
        for (let k = 0; k < dev.theta.length; k++) {
          const Q = [dev.r[k] * Math.cos(dev.theta[k]), dev.r[k] * Math.sin(dev.theta[k]), 0];
          const g = Math.hypot(Q[0], Q[1], H);                      // generator length from C = (0,0,H)
          worstGen = Math.max(worstGen, Math.abs(g - dev.rho[k]) / dev.rho[k]);
          const e = [Q[0] / g, Q[1] / g, -H / g];
          if (prev) { len3 += Math.hypot(Q[0] - prev.Q[0], Q[1] - prev.Q[1]); const d = Math.min(1, prev.e[0] * e[0] + prev.e[1] * e[1] + prev.e[2] * e[2]); ang += Math.acos(d); }
          prev = { Q, e };
        }
        worstLen = Math.max(worstLen, Math.abs(len3 - dev.flatLength) / dev.flatLength);
        worstAng = Math.max(worstAng, Math.abs(ang - t.a));
      }
    }
    ok(worstGen < 1e-9 && worstLen < 1e-3 && worstAng < 1e-3, `L3: isometry — generator lengths to ${worstGen.toExponential(1)}, rim arc length to ${worstLen.toExponential(2)} relative, re-derived facet angle within ${worstAng.toExponential(2)} rad (both bars 1e-3, the quadrature's own)`);
  }
  // L4 clamps
  {
    const rows = MUST_CLAMP.map((f) => { const m = G.solveLantern(f.state); const note = m.notes.find((n) => n.id === 'depth'); return { name: f.name, clamped: m.clampedDepth, told: !!note && /clamped/.test(note.text), ok: m.ok, closes: m.closure.every((c) => Math.abs(c) < 1e-9), depth: m.depth / m.width }; });
    const refused = MUST_REFUSE.map((f) => { const m = G.solveLantern(f.state); return { name: f.name, ok: !m.ok && m.notes.some((n) => n.kind === 'bad' && n.id === 'depth') }; });
    ok(rows.every((r) => r.clamped && r.told && r.ok && r.closes) && refused.every((r) => r.ok), `L4: infeasible targets clamp and tell — ${rows.map((r) => `${r.name}: clamped=${r.clamped} told=${r.told} closes=${r.closes} built ${r.depth.toFixed(2)}×W`).join('; ')}; no depth at all is SAID: ${refused.map((r) => `${r.name} ${r.ok}`).join(', ')}`);
  }
  // L5 the table
  {
    const cell = (s, d) => G.closureRatio({ ...G.DEFAULTS, slender: s, depthFrac: d, tip: 'sharp', edge: G.edgeCurveFor('straight') }).ratio;
    const table = [[0.40, 0.4, 0.935], [0.45, 0.4, 0.997], [0.50, 0.4, 1.035], [0.40, 0.6, 1.022], [0.38, 0.3, 0.915]];
    const errs = table.map(([s, d, want]) => Math.abs(cell(s, d) - want));
    const presetsOk = PRESETS.every((p) => G.solveLantern(p.state).ratio >= 1 - 1e-9);
    ok(errs.every((e) => e < 0.004) && presetsOk, `L5: the doc's closure table reproduces (worst ${Math.max(...errs).toFixed(4)}) and every preset's ratio ≥ 1: ${presetsOk}`);
  }
  // L6 svg
  {
    const m = G.solveLantern(G.DEFAULTS);
    const f = G.flatSvg(m, 'front'), b = G.flatSvg(m, 'back');
    const balanced = (t) => { const opens = (t.match(/<(\w+)[\s>]/g) || []).filter((x) => !/^<(\?|!)/.test(x)).length; const selfc = (t.match(/\/>/g) || []).length; const closes = (t.match(/<\/\w+>/g) || []).length; return opens === selfc + closes; };
    const layers = (t) => ['CUT', 'SCORE', 'PERF'].every((id) => new RegExp(`<g id="${id}"[^>]*inkscape:label="${id}"`).test(t));
    const colour = /id="CUT"[^>]*stroke="#ff0000"/.test(f) && /id="SCORE"[^>]*stroke="#0000ff"/.test(f) && /id="PERF"[^>]*stroke="#00a000"/.test(f);
    const count = (t, id) => ((t.match(new RegExp(`<g id="${id}"[\\s\\S]*?</g>`)) || [''])[0].match(/<path/g) || []).length;
    const mm = /width="[\d.]+mm" height="[\d.]+mm"/.test(f);
    ok(balanced(f) && balanced(b) && layers(f) && layers(b) && colour && count(f, 'SCORE') === m.N && count(f, 'PERF') === m.N && count(f, 'CUT') === 1 + 2 * m.N && /id="RING"/.test(b) && (b.match(/<circle/g) || []).length === 3 && mm,
      `L6: the SVG — balanced ${balanced(f)}/${balanced(b)}, layers named and coloured ${layers(f) && colour}, front: ${count(f, 'SCORE')} scores ${count(f, 'PERF')} perfs ${count(f, 'CUT')} cuts (outline + ${2 * m.N} tabs), back: ${(b.match(/<circle/g) || []).length} circles (opening + ring), mm units ${mm}`);
  }
  // L7 design json
  {
    const st = { ...G.DEFAULTS, points: 7, edgeMode: 'convex', edge: G.edgeCurveFor('convex', { amount: 0.04 }), hangHole: true };
    const r = G.readDesign(G.serializeDesign(st), G.DEFAULTS);
    const same = r.ok && G.STATE_FIELDS.every((k) => JSON.stringify(r.state[k]) === JSON.stringify(st[k]));
    const newer = G.readDesign(JSON.stringify({ format: G.DESIGN_FORMAT, version: G.DESIGN_VERSION + 1, state: st }));
    const doc = JSON.parse(G.serializeDesign(st)); delete doc.state.slender; doc.state.width = 5000;
    const partial = G.readDesign(JSON.stringify(doc), G.DEFAULTS);
    ok(same && r.notes.length === 0 && !newer.ok && /newer/.test(newer.notes[0]) && partial.ok && partial.state.slender === G.DEFAULTS.slender && partial.notes.some((n) => /missing slender/.test(n)) && partial.state.width === 900 && partial.notes.some((n) => /width.*clamped/.test(n)),
      `L7: design JSON — round trip exact with no notes: ${same && r.notes.length === 0}; newer version refused: ${!newer.ok}; missing field kept and told, out-of-range clamped and told: ${partial.ok && partial.state.slender === G.DEFAULTS.slender && partial.state.width === 900} (${partial.notes.join(' | ')})`);
  }
  // L8 tabs
  {
    let missing = 0, reach = 0, cross = 0, n = 0;
        for (const f of all) {
      const m = G.solveLantern(f.state), h = G.halfOutline(m, 'front');
      if (h.tabs.some((t) => !t)) missing++;
      const byValley = new Map();
      for (const t of h.tabs) { if (!t) continue; n++;
        const edge = h.edges.find((e) => e.j === t.j && e.side === t.side), pts = edge.pts;
        const tip = t.side === 1 ? pts[0] : pts[pts.length - 1], val = t.side === 1 ? pts[pts.length - 1] : pts[0];
        const near = (q, p) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-6;
        if (t.poly.some((q) => near(q, tip))) reach++;
        const key = `${val[0].toFixed(3)},${val[1].toFixed(3)}`; if (!byValley.has(key)) byValley.set(key, []); byValley.get(key).push(t.poly);
      }
      /* overlap: a probe 0.05 mm INSIDE one tab (midpoints of its outer edge pulled toward its own base) lying inside the other tab's polygon — a shared seam along the bisector is not an overlap, an area is */
      const inside = (q, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < ((b[0] - a[0]) * (q[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
      const probes = (poly) => { const M = poly.length / 2, out = []; for (let i = 1; i < M; i++) { const a = poly[i - 1], b = poly[i], pa = poly[2 * M - i], pb = poly[2 * M - 1 - i]; const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, bx = (pa[0] + pb[0]) / 2, by = (pa[1] + pb[1]) / 2; const d = Math.hypot(bx - mx, by - my); if (d < 0.2) continue; out.push([mx + (bx - mx) / d * 0.05, my + (by - my) / d * 0.05]); } return out; };
      for (const [, polys] of byValley) if (polys.length === 2) { if (probes(polys[0]).some((q) => inside(q, polys[1])) || probes(polys[1]).some((q) => inside(q, polys[0]))) cross++; }
    }
    ok(!missing && !reach && !cross, `L8: tabs — ${n} tabs, ${missing} fixtures with a missing tab, ${reach} reaching a tip, ${cross} inner vertices where the two tabs cross`);
  }
  // L9 alternating
  {
    const m = G.solveLantern({ ...G.DEFAULTS, points: 8, alternate: true, altRatio: 0.7, slender: 0.62, depthFrac: 0.36 });
    // the angles are read off the facets' EDGE GEOMETRY (the inner vertex's polar angle), never the record
    const angOf = (t) => { const p = t.edge.pts[t.edge.pts.length - 1]; return Math.atan2(p[1], p[0]); };
    const sum = angOf(m.facets[0]) + angOf(m.facets[1]), total = m.flatTip[m.N - 1] + angOf(m.facets[(m.N - 1) % 2]) + angOf(m.facets[0]);
    ok(m.ok && m.alternate && m.facets.length === 2 && Math.abs(sum - 2 * Math.PI / m.N) < 1e-12 && Math.abs(total - 2 * Math.PI) < 1e-9 && m.closure.every((c) => Math.abs(c) < 1e-9) && m.facets[1].rtip < m.facets[0].rtip,
      `L9: alternating — facet angles ${(m.facets[0].a * 180 / Math.PI).toFixed(3)}° + ${(m.facets[1].a * 180 / Math.PI).toFixed(3)}° = ${(sum * 180 / Math.PI).toFixed(3)}° (2π/N = ${(360 / m.N).toFixed(3)}°), flat tips close to ${(total * 180 / Math.PI).toFixed(6)}°, both facets close`);
  }
  // L10 randomizer
  {
    let good = 0; const seeds = QUICK ? 6 : 20;
    for (let s = 1; s <= seeds; s++) { const m = G.solveLantern(G.randomShape(s)); if (m.ok && !m.clampedDepth && m.infeasible === 0) good++; }
    ok(good === seeds, `L10: the randomizer — ${good} of ${seeds} seeds close without a clamp`);
  }
  // L11 mesh
  {
    let bad = 0, worstR = 0;
    for (const f of all) {
      const m = G.solveLantern(f.state);
      const F = G.foldedMesh(m, 1), B = G.foldedMesh(m, -1, { opening: true });
      const per = m.facets.map((t) => t.dev.theta.length - 1);
      const expectF = m.alternate ? m.N * (per[0] + per[1]) : 2 * m.N * per[0];
      if (F.triangles !== expectF || B.triangles !== 2 * expectF) bad++;
      let maxR = 0; for (let i = 0; i < F.positions.length; i += 3) { if (!Number.isFinite(F.positions[i]) || !Number.isFinite(F.positions[i + 1]) || !Number.isFinite(F.positions[i + 2])) bad++; maxR = Math.max(maxR, Math.hypot(F.positions[i], F.positions[i + 1])); }
      worstR = Math.max(worstR, Math.abs(maxR - Math.max(...m.facets.map((t) => Math.max(...t.dev.r)))));
    }
    ok(!bad && worstR < 1e-3, `L11: the mesh — triangle counts and finiteness on ${all.length} fixtures (${bad} wrong), bounding radius is the rim's largest radius to ${worstR.toExponential(1)}`);
  }
  // sweep (L1/L3 over a grid)
  {
    let n = 0, worst = 0, clamps = 0;
    for (const N of [3, 4, 5, 6, 8, 10, 12, 16]) for (const s of [0.3, 0.5, 0.7, 0.9]) for (const d of [0.2, 0.4, 0.6]) {
      const m = G.solveLantern({ ...G.DEFAULTS, points: N, slender: s, depthFrac: d }); n++;
      if (m.clampedDepth) clamps++;
      if (m.ok) for (const c of m.closure) worst = Math.max(worst, Math.abs(c));
    }
    ok(worst < 1e-9, `L1 sweep: ${n} states, ${clamps} clamped (and still closing), worst closure ${worst.toExponential(2)}`);
  }
  return res;
}

const MUTANTS = [
  { id: 'closure-ignored', from: 'const bow = bisect((b) => F(b).err, 0, BOW_RANGE[1]);', to: 'const bow = 0;', breaks: ['L1', 'L4', 'L1 sweep'] },
  { id: 'development-drops-the-H-term', from: 'const rhs = (rhom * dal) * (rhom * dal) - (dr * H / rhom) * (dr * H / rhom);', to: 'const rhs = (rhom * dal) * (rhom * dal);', breaks: ['L0', 'L1', 'L4', 'L5', 'L9', 'L10'] },   // the defaults stop closing at any depth, so every clause that needs a closed default reddens; L3 cannot, because the fallback it draws is flat
  { id: 'rim-not-planar', from: 'const rimR = rim3dOf(t).map(([r, th]) => [r * Math.cos(g + th), r * Math.sin(g + th), 0]);', to: 'const rimR = rim3dOf(t).map(([r, th]) => [r * Math.cos(g + th), r * Math.sin(g + th), sign * 2]);', breaks: ['L2'] },
  { id: 'clamp-silent', from: "notes.push({ kind: 'clamp', id: 'depth',", to: "false && notes.push({ kind: 'clamp', id: 'depth',", breaks: ['L4'] },
  { id: 'svg-layer-renamed', from: '<g id="PERF" inkscape:label="PERF"', to: '<g id="VALLEY" inkscape:label="VALLEY"', breaks: ['L6'] },
  { id: 'design-version-not-checked', from: 'if (!(doc.version <= DESIGN_VERSION))', to: 'if (false)', breaks: ['L7'] },
  { id: 'tabs-not-clipped-at-the-vertex', from: 'if (side <= 0) wMax = 0; else if (nm < 0) wMax = side / -nm;', to: 'wMax = Infinity;', breaks: ['L8'] },
  { id: 'back-half-not-mirrored', from: 'const C = [0, 0, sign * H];', to: 'const C = [0, 0, H];', breaks: ['L2'] },
  { id: 'alternate-angles-dont-sum', from: 'const S = facetClosure({ Ro: RoS, Ri, a: 2 * a0 - aL,', to: 'const S = facetClosure({ Ro: RoS, Ri, a: a0,', breaks: ['L0', 'L3', 'L9'] },
];

function print(res, label) {
  let fails = 0;
  for (const [p, m] of res) { console.log(`${p ? 'ok  ' : 'FAIL'} ${m}`); if (!p) fails++; }
  console.log(`\n${label}: ${res.length - fails} of ${res.length} passed`);
  return fails;
}

if (!NEG) {
  const G = await import('../lantern-geometry.js');
  const res = await run(G);
  const fails = print(res, 'verify-lantern');
  process.exit(fails ? 1 : 0);
} else {
  const src = fs.readFileSync(path.join(REPO, 'lantern-geometry.js'), 'utf8');
  let bad = 0;
  for (const m of MUTANTS) { const n = src.split(m.from).length - 1; if (n !== 1) { console.log(`ANCHOR ${m.id}: matches ${n} times`); bad++; } }
  if (bad) process.exit(1);
  const clean = await run(await import('../lantern-geometry.js'));
  const names = clean.map(([, msg]) => msg.split(':')[0]);
  for (const m of MUTANTS) for (const b of m.breaks) if (!names.includes(b)) { console.log(`STALE NAME ${m.id} claims ${b}, which the gate does not run`); bad++; }
  if (clean.some(([p]) => !p)) { console.log('the clean tree does not pass; the control cannot run'); process.exit(1); }
  if (bad) process.exit(1);
  for (const m of MUTANTS) {
    // the mutant lives OUTSIDE the repo (a copy in the repo root was staged by accident once), with its one relative import made absolute
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lantern-mutant-'));
    const file = path.join(dir, `lantern-geometry.__mutant_${m.id}.js`);
    fs.writeFileSync(file, src.replace(m.from, m.to).replace("from './bloom-curve.js'", `from '${pathToFileURL(path.join(REPO, 'bloom-curve.js')).href}'`));
    let res;
    try { res = await run(await import(pathToFileURL(file).href)); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    const red = res.filter(([p]) => !p).map(([, msg]) => msg.split(':')[0]);
    const missed = m.breaks.filter((b) => !red.includes(b)), unclaimed = red.filter((r) => !m.breaks.includes(r));
    const good = !missed.length && !unclaimed.length;
    console.log(`${good ? 'ok  ' : 'BAD '} ${m.id}: reddened ${red.join(', ') || 'nothing'}${missed.length ? ` — MISSED ${missed.join(', ')}` : ''}${unclaimed.length ? ` — UNCLAIMED ${unclaimed.join(', ')}` : ''}`);
    if (!good) bad++;
  }
  console.log(`\nnegative control: ${MUTANTS.length - bad} of ${MUTANTS.length} mutants behave`);
  process.exit(bad ? 1 : 0);
}
