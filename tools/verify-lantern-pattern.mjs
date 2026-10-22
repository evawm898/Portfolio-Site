#!/usr/bin/env node
/* verify-lantern-pattern.mjs — the paper star lantern's PATTERN gate (pure
   Node; lantern-design-doc.md §4 and §13). Reads lantern-pattern.js and
   lantern-validate.js through the page's own front door and asks:

     PA0 every generator on the defaults lays out a pattern: cuts exist, the
         judge finds NO ISLAND and NO KEEP-OUT cut, and the thin/narrow notes
         stay under a small bound (the defaults must open clean enough to ship).
     PA1 THE JUDGE SEES AN ISLAND — a closed ring stroke with no gap is reported
         as exactly one island of the ring's own enclosed area (±5 %), and
         `autoBridgeElements` splits it into two arcs that the judge then
         passes; a ring that already has gaps is reported clean.
     PA2 THE JUDGE SEES THIN PAPER — two parallel strokes `bridge − 0.4` mm
         apart are flagged thin; `bridge + 0.4` apart are not.
     PA3 THE JUDGE SEES A NARROW CUT — a stroke at 0.6 × minCut is flagged
         narrow; one at 1.2 × minCut is not; a dot under minHole is flagged.
     PA4 THE JUDGE SEES A KEEP-OUT — a dot on the spine band, one against the
         valley line and one at the rim margin each read as a keep-out.
     PA5 EVERY CUT LIES IN THE FIELD: no generator places a cut polygon vertex
         inside the spine band, within the fold keep-out of the valley, or
         within the rim margin of the edge, on the defaults and the corners —
         to half a millimetre, the field's vertical-allowance approximation of
         a perpendicular margin where the edge steepens into the tip fillet.
     PA6 mirror and placement: `placeCuts` yields 2N × (cuts per type)
         polygons (N × … with alternate points solid), every placed polygon
         lies inside the half outline, and point j's left half is point j's
         right half mirrored about its ridge to 1e-9.
     PA7 the texture painter: the alpha map of the defaults is white at the
         spine and at the tip, black inside a cut's centre.
     PA8 the pattern fields round-trip through the design file, an off-range
         density is clamped and told, an unknown mode falls to the default.
     PA9 determinism: the same seed lays out byte-identical cuts twice; a
         different seed moves them.
     PA10 the randomizer draws every generator and only valid values.

   --negative-control re-imports COPIES of lantern-pattern.js / lantern-validate.js
   with one deliberate defect at a time and requires each to redden exactly the
   clauses it names (every anchor checked before any runs). */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const NEG = args.includes('--negative-control');

async function run(G, P, V) {
  const res = [];
  const ok = (c, m) => res.push([!!c, m]);
  const R = P.RULES_DEFAULT;
  const base = { ...G.DEFAULTS, ...P.PATTERN_STATE_DEFAULTS };
  const model = G.solveLantern(base);
  const t = model.facets[0];
  const pin = (x, y) => Math.hypot(x, y) > 1e-9;

  // PA0
  {
    const rows = [];
    for (const mode of P.PATTERN_MODES.filter((m) => m !== 'none')) {
      const pat = P.patternForModel(model, { ...base, patMode: mode }, R);
      rows.push({ mode, cuts: pat.types[0].cuts.length, c: pat.counts });
    }
    const bad = rows.filter((r) => r.cuts < 20 || r.c.island || r.c.keepout || r.c.thin + r.c.narrow > 24);
    ok(!bad.length, `PA0: every generator on the defaults — ${rows.map((r) => `${r.mode} ${r.cuts} cuts, islands ${r.c.island}, thin ${r.c.thin}, narrow ${r.c.narrow}, keep-out ${r.c.keepout}`).join('; ')}`);
  }
  // PA1 islands
  {
    const ring = P.circle(120, 40, 12, 48); ring.push(ring[0]);
    const el = [{ kind: 'stroke', line: ring, hw: 0.8 }];
    const v = V.validateFacet(t, P.taggedCuts(el), R);
    const isl = v.issues.filter((i) => i.kind === 'island');
    const want = Math.PI * (12 - 0.8) ** 2;
    const ab = V.autoBridgeElements(t, el, R, P.cutsOfElement);
    const v2 = V.validateFacet(t, P.taggedCuts(ab.placed), R);
    const gapped = P.loopStroke(P.circle(120, 40, 12, 48), 0.8, 2, R.bridge * 2).map((poly) => ({ poly, kind: 'stroke' }));
    const v3 = V.validateFacet(t, gapped, R);
    ok(isl.length === 1 && Math.abs(isl[0].areaMm2 - want) / want < 0.05 && ab.bridged === 1 && ab.placed.length === 2 && v2.counts.island === 0 && v3.counts.island === 0,
      `PA1: a closed ring is ${isl.length} island of ${isl.length ? isl[0].areaMm2.toFixed(1) : '—'} mm² (expected ${want.toFixed(1)}); auto-bridge split it into ${ab.placed.length} arcs (${ab.bridged} bridge) and the judge then reads ${v2.counts.island} islands; a gapped ring reads ${v3.counts.island}`);
  }
  // PA2 thin
  {
    const pair = (gap) => P.taggedCuts([{ kind: 'stroke', line: [[60, 20], [140, 20]], hw: 0.8 }, { kind: 'stroke', line: [[60, 20 + 1.6 + gap], [140, 20 + 1.6 + gap]], hw: 0.8 }]);
    const a = V.validateFacet(t, pair(R.bridge - 0.4), R).counts.thin, b = V.validateFacet(t, pair(R.bridge + 0.4), R).counts.thin;
    ok(a >= 1 && b === 0, `PA2: paper ${(R.bridge - 0.4).toFixed(1)} mm between two strokes → ${a} thin finding(s); ${(R.bridge + 0.4).toFixed(1)} mm → ${b}`);
  }
  // PA3 narrow
  {
    const line = (hw) => P.taggedCuts([{ kind: 'stroke', line: [[60, 30], [140, 30]], hw }]);
    const a = V.validateFacet(t, line(R.minCut * 0.3), R).counts.narrow, b = V.validateFacet(t, line(R.minCut * 0.6), R).counts.narrow;
    const dot = (r) => [{ poly: P.circle(100, 30, r, 24), kind: 'solid' }];
    const c = V.validateFacet(t, dot(R.minHole * 0.3), R).counts.narrow, d = V.validateFacet(t, dot(R.minHole * 0.8), R).counts.narrow;
    ok(a >= 1 && b === 0 && c >= 1 && d === 0, `PA3: a ${(R.minCut * 0.6).toFixed(2)} mm stroke → ${a} narrow, ${(R.minCut * 1.2).toFixed(2)} mm → ${b}; a ${(R.minHole * 0.6).toFixed(2)} mm hole → ${c}, ${(R.minHole * 1.6).toFixed(2)} mm → ${d}`);
  }
  // PA4 keep-outs
  {
    const F = P.facetField(t, R);
    const spine = [{ poly: P.circle(100, 2, 1.2, 16), kind: 'solid' }];
    const vy = F.yHi(100) + R.foldKeepout - 1;   // 1 mm inside the fold keep-out
    const valley = [{ poly: P.circle(100, vy, 1.2, 16), kind: 'solid' }];
    const rimY = t.edge.pts.reduce((m, p) => (Math.abs(p[0] - 180) < 1 ? p[1] : m), 0);
    const rim = [{ poly: P.circle(180, rimY - R.rimMargin + 1.5, 1.2, 16), kind: 'solid' }];
    const clean = [{ poly: P.circle(100, (F.yLo() + F.yHi(100)) / 2, 1.2, 16), kind: 'solid' }];
    const n = (c) => V.validateFacet(t, c, R).counts.keepout;
    ok(n(spine) >= 1 && n(valley) >= 1 && n(rim) >= 1 && n(clean) === 0, `PA4: a dot on the spine → ${n(spine)} keep-out, against the valley → ${n(valley)}, at the rim → ${n(rim)}, mid-field → ${n(clean)}`);
  }
  // PA5 every cut in the field
  {
    const { CORNERS } = await import('./lantern-fixtures.mjs');
    const states = [base, ...CORNERS.slice(0, 5).map((f) => ({ ...base, ...f.state }))];
    let worst = { d: Infinity, where: '' }, n = 0;
    for (const st of states) for (const mode of ['paisley', 'lace', 'botanical', 'geometric', 'celestial']) {
      const m = G.solveLantern(st); const pat = P.patternForModel(m, { ...st, patMode: mode }, R, { validate: false });
      for (const rec of pat.types) {
        const f = m.facets.find((x) => x.type === rec.type), tanA = Math.tan(f.a), E = f.edge.pts;
        const toEdge = (x, y) => { let best = Infinity; for (let i = 1; i < E.length; i++) { const a = E[i - 1], b = E[i], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1; const u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2)); best = Math.min(best, Math.hypot(x - a[0] - u * dx, y - a[1] - u * dy)); } return best; };
        for (const c of rec.cuts) for (const [x, y] of c.poly) {
          n++;
          const spine = y - R.spine / 2, valley = (x * tanA - y) * Math.cos(f.a) - R.foldKeepout, rim = toEdge(x, y) - R.rimMargin;
          const d = Math.min(spine, valley, rim);
          if (d < worst.d) worst = { d, where: `${mode} at (${x.toFixed(1)}, ${y.toFixed(1)}) on ${st.points} points` };
        }
      }
    }
    ok(worst.d > -0.5, `PA5: ${n} cut vertices over 6 states × 5 generators — the nearest to a keep-out is ${worst.d.toFixed(3)} mm inside the field (${worst.where})`);
  }
  // PA6 mirror and placement
  {
    const pat = P.patternForModel(model, base, R, { validate: false });
    const placed = P.placeCuts(model, pat, base);
    const alt = P.placeCuts(model, pat, { ...base, patSolidAlt: true });
    const per = pat.types[0].cuts.length;
    const h = G.halfOutline(model, 'front');
    const inside = (p) => { let c = false; const o = h.outline; for (let i = 0, j = o.length - 1; i < o.length; j = i++) if ((o[i][1] > p[1]) !== (o[j][1] > p[1]) && p[0] < o[i][0] + ((p[1] - o[i][1]) * (o[j][0] - o[i][0])) / (o[j][1] - o[i][1])) c = !c; return c; };
    let out = 0; for (const c of placed) for (const p of c.poly) if (!inside(p)) out++;
    // mirror: point 0's left polygons are its right polygons reflected across the ridge at angle flatTip[0]
    const g = model.flatTip[0], refl = ([x, y]) => { const c = Math.cos(2 * g), s = Math.sin(2 * g); return [c * x + s * y, s * x - c * y]; };
    const right = placed.filter((c) => c.j === 0 && c.side === 1), left = placed.filter((c) => c.j === 0 && c.side === -1);
    let worst = left.length === right.length && right.length ? 0 : Infinity; if (worst === 0) right.forEach((c, i) => c.poly.forEach((p, k) => { const q = refl(p), l = left[i].poly[k]; worst = Math.max(worst, Math.hypot(q[0] - l[0], q[1] - l[1])); }));
    ok(placed.length === 2 * model.N * per && alt.length === 2 * Math.ceil(model.N / 2) * per && out === 0 && worst < 1e-9, `PA6: ${placed.length} placed polygons (2 × ${model.N} × ${per}), ${alt.length} with alternate points solid, ${out} vertices outside the outline, mirror residual ${worst.toExponential(1)} mm`);
  }
  // PA7 texture
  {
    const pat = P.patternForModel(model, base, R, { validate: false });
    const rec = pat.types[0], w = 400, h = Math.round(400 * 2 * rec.box.yMax / rec.box.Ro);
    const px = new Uint8Array(w * h).fill(255); let fill = 255;
    const ctx = { fillStyle: '#fff', fillRect: () => { px.fill(fill); }, beginPath() { this.p = []; }, moveTo(x, y) { this.p.push([x, y]); }, lineTo(x, y) { this.p.push([x, y]); }, closePath() {}, fill() { const poly = this.p; let y0 = Infinity, y1 = -Infinity; for (const q of poly) { y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); } for (let r = Math.max(0, Math.floor(y0)); r <= Math.min(h - 1, Math.ceil(y1)); r++) { const y = r + 0.5, xs = []; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1])); } xs.sort((u, v) => u - v); for (let k = 0; k + 1 < xs.length; k += 2) for (let c = Math.max(0, Math.ceil(xs[k])); c <= Math.min(w - 1, Math.floor(xs[k + 1])); c++) px[r * w + c] = fill; } } };
    Object.defineProperty(ctx, 'fillStyle', { set(v) { fill = v === '#000' ? 0 : 255; }, get() { return fill; } });
    P.paintFacetTexture(ctx, rec, w, h);
    const at = (x, y) => px[Math.min(h - 1, Math.max(0, Math.round((rec.box.yMax - y) * h / (2 * rec.box.yMax)))) * w + Math.min(w - 1, Math.max(0, Math.round(x * w / rec.box.Ro)))];
    const dot = rec.cuts.find((c) => c.kind === 'solid' && c.poly.length >= 10);
    const cx = dot.poly.reduce((s, p) => s + p[0], 0) / dot.poly.length, cy = dot.poly.reduce((s, p) => s + p[1], 0) / dot.poly.length;
    const black = px.filter((v) => v === 0).length / px.length;
    ok(at(rec.box.Ro * 0.5, 0) === 255 && at(rec.box.Ro * 0.99, 0) === 255 && at(cx, cy) === 0 && at(cx, -cy) === 0 && black > 0.01 && black < 0.3, `PA7: the alpha map — white on the spine and at the tip, black at a dot's centre (${cx.toFixed(0)}, ±${cy.toFixed(0)}), ${(black * 100).toFixed(1)}% cut`);
  }
  // PA8 design file
  {
    const st = { ...base, patMode: 'lace', patSeed: 99, patDensity: 0.85, patRim: 'picot', patSolidAlt: true };
    const r = G.readDesign(G.serializeDesign(st), base);
    const same = P.PATTERN_FIELDS.every((k) => r.state[k] === st[k]);
    const r2 = G.readDesign(G.serializeDesign({ ...st, patDensity: 7, patMode: 'plaid' }), base);
    ok(r.ok && same && !r.notes.length && r2.ok && r2.state.patDensity === 1 && r2.state.patMode === 'paisley' && r2.notes.some((n) => /patDensity/.test(n)) && r2.notes.some((n) => /patMode/.test(n)), `PA8: the pattern fields round-trip (${r.notes.length} notes); density 7 → ${r2.state.patDensity}, mode "plaid" → ${r2.state.patMode}, told: ${r2.notes.join('; ')}`);
  }
  // PA9 determinism
  {
    const a = JSON.stringify(P.layoutFacet(t, { mode: 'paisley', seed: 5 }, R).cuts), b = JSON.stringify(P.layoutFacet(t, { mode: 'paisley', seed: 5 }, R).cuts), c = JSON.stringify(P.layoutFacet(t, { mode: 'paisley', seed: 6 }, R).cuts);
    ok(a === b && a !== c, `PA9: seed 5 twice is byte-identical (${a.length} chars); seed 6 differs`);
  }
  // PA10 randomizer
  {
    const modes = new Set(); let bad = 0;
    for (let s = 1; s <= 60; s++) { const r = P.randomPattern(s); modes.add(r.patMode); const c = P.readPattern(r); if (P.PATTERN_FIELDS.some((k) => k !== 'patAutoBridge' && c[k] !== r[k])) bad++; }
    ok(modes.size === 5 && bad === 0, `PA10: 60 random draws reach ${modes.size} generators, ${bad} outside their ranges`);
  }
  return res;
}

const MUTANTS = [
  { id: 'islands-not-detected', file: 'lantern-validate.js', from: "for (const comp of isl.comps) { const area = comp.n * RES * RES; if (area < MIN_FLAG_AREA) continue;", to: "for (const comp of []) { const area = comp.n * RES * RES; if (area < MIN_FLAG_AREA) continue;", breaks: ['PA1'] },
  { id: 'thin-paper-not-detected', file: 'lantern-validate.js', from: "thin[i] = paper[i] && !opened[i] ? 1 : 0;", to: "thin[i] = 0;", breaks: ['PA2'] },
  { id: 'narrow-cuts-not-detected', file: 'lantern-validate.js', from: "nar[i] = mask[i] && !op[i] ? 1 : 0;", to: "nar[i] = 0;", breaks: ['PA3'] },
  { id: 'keepouts-not-detected', file: 'lantern-validate.js', from: "if (spine || valley || rim) ko[i] = 1;", to: "if (false) ko[i] = 1;", breaks: ['PA4'] },
  { id: 'auto-bridge-does-nothing', file: 'lantern-validate.js', from: "if (!edits.size) return { placed, bridged: 0 };", to: "return { placed, bridged: 0 };", breaks: ['PA0', 'PA1'] },   // the defaults carry islands that only the bridge clears,
  { id: 'the-field-ignores-the-rim-margin', file: 'lantern-pattern.js', from: "if (y - r < F.yLo() + R.bridge * 0.4 || y + r > F.yHi(x) - R.bridge * 0.4 || y + r > F.yHi(x + r) - R.bridge * 0.4 || y + r > F.yHi(x - r) - R.bridge * 0.4) return false;", to: "if (y - r < F.yLo() + R.bridge * 0.4) return false;", breaks: ['PA0', 'PA5', 'PA6'] },   // cuts past the margin leave the outline too,
  { id: 'the-left-half-is-not-mirrored', file: 'lantern-pattern.js', from: "for (const side of [1, -1]) { const place = facetPlacer(model, j, side);", to: "for (const side of [1, 1]) { const place = facetPlacer(model, j, side);", breaks: ['PA6'] },
  { id: 'the-seed-is-ignored', file: 'lantern-pattern.js', from: "const rnd = mulberry32(P.seed + 1);", to: "const rnd = mulberry32(1);", breaks: ['PA9'] },
  { id: 'the-texture-paints-no-cut', file: 'lantern-pattern.js', from: "ctx.closePath(); ctx.fill();", to: "ctx.closePath();", breaks: ['PA7'] },
  { id: 'the-density-is-not-clamped', file: 'lantern-pattern.js', from: "o.patDensity = clampN(raw.patDensity, 0.2, 1, PATTERN_STATE_DEFAULTS.patDensity);", to: "o.patDensity = +raw.patDensity;", breaks: ['PA8'] },
];

function print(res, label) { let f = 0; for (const [p, m] of res) { console.log(`${p ? 'ok  ' : 'FAIL'} ${m}`); if (!p) f++; } console.log(`\n${label}: ${res.length - f} of ${res.length} passed`); return f; }

const G = await import('../lantern-geometry.js');
if (!NEG) {
  const P = await import('../lantern-pattern.js'), V = await import('../lantern-validate.js');
  process.exit(print(await run(G, P, V), 'verify-lantern-pattern') ? 1 : 0);
} else {
  const srcs = { 'lantern-pattern.js': fs.readFileSync(path.join(REPO, 'lantern-pattern.js'), 'utf8'), 'lantern-validate.js': fs.readFileSync(path.join(REPO, 'lantern-validate.js'), 'utf8') };
  let bad = 0;
  for (const m of MUTANTS) { const n = srcs[m.file].split(m.from).length - 1; if (n !== 1) { console.log(`ANCHOR ${m.id}: matches ${n} times`); bad++; } }
  if (bad) process.exit(1);
  const clean = await run(G, await import('../lantern-pattern.js'), await import('../lantern-validate.js'));
  const names = clean.map(([, msg]) => msg.split(':')[0]);
  for (const m of MUTANTS) for (const b of m.breaks) if (!names.includes(b)) { console.log(`STALE NAME ${m.id} claims ${b}, which the gate does not run`); bad++; }
  if (clean.some(([p]) => !p)) { console.log('the clean tree does not pass; the control cannot run'); process.exit(1); }
  if (bad) process.exit(1);
  for (const m of MUTANTS) {
    // both modules are copied OUTSIDE the repo so they share one copy of the other (pattern imports validate), with the geometry import made absolute
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lantern-pattern-mutant-'));
    const geo = pathToFileURL(path.join(REPO, 'lantern-geometry.js')).href;
    for (const f of Object.keys(srcs)) { let s = srcs[f]; if (f === m.file) s = s.replace(m.from, m.to); s = s.replace("from './lantern-geometry.js'", `from '${geo}'`); fs.writeFileSync(path.join(dir, f), s); }
    let res;
    try { res = await run(G, await import(pathToFileURL(path.join(dir, 'lantern-pattern.js')).href), await import(pathToFileURL(path.join(dir, 'lantern-validate.js')).href)); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    const red = res.filter(([p]) => !p).map(([, msg]) => msg.split(':')[0]);
    const missed = m.breaks.filter((b) => !red.includes(b)), unclaimed = red.filter((r) => !m.breaks.includes(r));
    const good = !missed.length && !unclaimed.length;
    console.log(`${good ? 'ok  ' : 'BAD '} ${m.id}: reddened ${red.join(', ') || 'nothing'}${missed.length ? ` — MISSED ${missed.join(', ')}` : ''}${unclaimed.length ? ` — UNCLAIMED ${unclaimed.join(', ')}` : ''}`);
    if (!good) bad++;
  }
  console.log(`\nnegative control: ${MUTANTS.length - bad} of ${MUTANTS.length} mutants behave`);
  process.exit(bad ? 1 : 0);
}
