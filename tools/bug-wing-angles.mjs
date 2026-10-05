#!/usr/bin/env node
/* bug-wing-angles.mjs <measure|sweep|review> [--out <dir>] [--jobs N] — the
   WING-ANGLE AUDIT (bug-project-design-doc.md §14). Dev-time, not page code.

   measure  every library shape's forewing and hindwing ANGLE (G.wingAngleOf:
            hinge -> the blade's centroid, in true planform, + backward),
            and an ANGLE-INDEPENDENT comparison of every pair of shapes: each
            wing's drawn outline rotated rigidly so its own axis is at 0, then
            the symmetric Hausdorff distance between two such outlines, outside
            the root zone (r < ROOT_ZONE lengths — the root is the body's), at
            the residual rotation that minimises it (+-12 deg), in units of the
            wing's OWN length. Writes <out>/angles.json.
   sweep    every shape with its forewing and then its hindwing turned by each
            offset in DELTAS (G.rotateWingBlade), applied to the default bug,
            built through every row clause of the gate (verify-bug.mjs --rows),
            N jobs at once. Writes <out>/sweep.json.
   review   <out>/review.html from the two: the groups overlaid, every shape's
            measured angles drawn from the hinge (on the source crop when the
            gitignored sheets are present), and the angle ladder.

   Grouping bar: the library's own dedupe bar, 3% of the default bug's 72 mm
   wingspan = 2.16 mm, as a fraction of the default 41 mm forewing: SAME_BAR.
   NEAR is 1.6x it. A GROUP is a connected set of shapes whose forewings AND
   hindwings are both within SAME_BAR of each other once angles are aligned. */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as G from '../bug-geometry.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const OUT = path.resolve(opt('--out', path.join(ROOT, 'tools/bug-wing-sources/out-angles')));
const CMD = args[0] || 'measure';
fs.mkdirSync(OUT, { recursive: true });

export const ROOT_ZONE = 0.15;
export const SAME_BAR = 0.03 * 72 / 41;     // 0.0527 of the wing's length
export const NEAR_BAR = 1.6 * SAME_BAR;
export const DELTAS = [-20, -15, -10, -5, 5, 10, 15, 20];   // plus each wing's own span ends
const D2R = Math.PI / 180;

/* the drawn outline (tail composed for the hind) in true planform, rotated
   rigidly by -angle so its axis lies along +u, resampled by arc length */
export function canonicalDense(points, stretch, angle, tail, n = 220) {
  const comp = tail ? G.composeOutline(points, { ...tail, on: true }).points : points;
  const d = G.sampleOutline(comp).map(([u, w]) => [u, w * stretch]);
  const a = -angle * D2R, c = Math.cos(a), s = Math.sin(a);
  const rot = d.map(([u, b]) => [u * c + b * s, -u * s + b * c]);
  const L = [0]; for (let k = 1; k < rot.length; k++) L.push(L[k - 1] + Math.hypot(rot[k][0] - rot[k - 1][0], rot[k][1] - rot[k - 1][1]));
  const out = []; let j = 0;
  for (let i = 0; i < n; i++) { const t = (L[L.length - 1] * i) / (n - 1); while (j + 1 < L.length - 1 && L[j + 1] < t) j++; const f = (t - L[j]) / Math.max(1e-12, L[j + 1] - L[j]); out.push([rot[j][0] + f * (rot[j + 1][0] - rot[j][0]), rot[j][1] + f * (rot[j + 1][1] - rot[j][1])]); }
  return out.filter(([u, b]) => Math.hypot(u, b) >= ROOT_ZONE);
}
const rotSet = (P, deg) => { const a = deg * D2R, c = Math.cos(a), s = Math.sin(a); return P.map(([u, b]) => [u * c + b * s, -u * s + b * c]); };
function hausdorff(A, B) {
  const one = (X, Y) => { let m = 0; for (const p of X) { let d = Infinity; for (const q of Y) { const e = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (e < d) d = e; } if (d > m) m = d; } return m; };
  return Math.sqrt(Math.max(one(A, B), one(B, A)));
}
/* B rotated by phi against A: min over phi in [-12, 12] (1 deg, then 0.1) */
function aligned(A, B) {
  let best = { d: Infinity, phi: 0 };
  for (let phi = -12; phi <= 12; phi += 1) { const d = hausdorff(A, rotSet(B, phi)); if (d < best.d) best = { d, phi }; }
  for (let phi = best.phi - 0.9; phi <= best.phi + 0.9; phi += 0.1) { const d = hausdorff(A, rotSet(B, phi)); if (d < best.d) best = { d, phi: +phi.toFixed(1) }; }
  return best;
}

/* a library shape with both wings posed at their own angles (as applying writes them) */
export function posedShape(s) {
  const f = G.posedWing(s.fore), h = G.posedWing(s.hind);
  return { ...s, fore: { ...s.fore, points: f.points, stretch: f.stretch, sweep: 0 }, hind: { ...s.hind, points: h.points, stretch: h.stretch, sweep: 0 } };
}

function measure() {
  const lib = G.WING_LIBRARY, rec = [];
  for (const s0 of lib) {
    const s = posedShape(s0);   // every measure is on the wings AS APPLIED (posed at their own angles)
    const fa = G.wingAngleOf(s.fore.points, s.fore.stretch), ha = G.wingAngleOf(s.hind.points, s.hind.stretch);
    rec.push({ id: s.id, source: s.source, fore: +fa.toFixed(2), hind: +ha.toFixed(2), lengthRatio: s.hind.lengthRatio,
      cf: canonicalDense(s.fore.points, s.fore.stretch, fa), ch: canonicalDense(s.hind.points, s.hind.stretch, ha, s.tail),
      rf: canonicalDense(s.fore.points, s.fore.stretch, 0), rh: canonicalDense(s.hind.points, s.hind.stretch, 0, s.tail) });
  }
  const pairs = [];
  for (let i = 0; i < rec.length; i++) for (let j = i + 1; j < rec.length; j++) {
    const A = rec[i], B = rec[j];
    const f = aligned(A.cf, B.cf), h = aligned(A.ch, B.ch);
    // the same comparison WITHOUT the angles: posed outlines, no rotation
    const f0 = hausdorff(A.rf, B.rf), h0 = hausdorff(A.rh, B.rh);
    // B's wing turned by phi lands on A's: B's angle + delta = A's angle
    pairs.push({ a: A.id, b: B.id, fore: +f.d.toFixed(4), hind: +h.d.toFixed(4), foreRaw: +f0.toFixed(4), hindRaw: +h0.toFixed(4),
      dFore: +(A.fore - B.fore + f.phi).toFixed(1), dHind: +(A.hind - B.hind + h.phi).toFixed(1), ratio: +(B.lengthRatio / A.lengthRatio).toFixed(3) });
  }
  // groups: connected components over pairs with BOTH wings under SAME_BAR
  const par = new Map(rec.map((r) => [r.id, r.id])), find = (x) => (par.get(x) === x ? x : find(par.get(x)));
  for (const p of pairs) if (p.fore < SAME_BAR && p.hind < SAME_BAR) par.set(find(p.a), find(p.b));
  const comp = new Map(); for (const r of rec) { const k = find(r.id); if (!comp.has(k)) comp.set(k, []); comp.get(k).push(r.id); }
  const groups = [...comp.values()].filter((g) => g.length > 1);
  const near = pairs.filter((p) => !(p.fore < SAME_BAR && p.hind < SAME_BAR) && Math.max(p.fore, p.hind) < NEAR_BAR || (p.fore < SAME_BAR) !== (p.hind < SAME_BAR) && Math.min(p.fore, p.hind) < SAME_BAR);
  const out = { convention: 'hinge -> the arc-length centroid of the drawn outline beyond the root bridge (r > WING_ANGLE_RAMP[1] lengths), true planform (w x stretch), degrees from the span direction, + backward', sameBar: SAME_BAR, nearBar: NEAR_BAR, rootZone: ROOT_ZONE,
    shapes: rec.map(({ cf, ch, rf, rh, ...r }) => r), groups, pairs: pairs.filter((p) => Math.min(p.fore, p.hind) < NEAR_BAR), near };
  fs.writeFileSync(path.join(OUT, 'angles.json'), JSON.stringify(out, null, 1));
  console.log(`angles: ${rec.length} shapes · ${groups.length} group(s): ${groups.map((g) => g.join('/')).join('  ') || 'none'} · ${near.length} near pair(s)`);
  for (const r of rec) console.log(`#${String(r.id).padEnd(3)} fore ${r.fore.toFixed(1).padStart(6)}  hind ${r.hind.toFixed(1).padStart(6)}`);
  for (const p of pairs.filter((q) => Math.min(q.fore, q.hind) < NEAR_BAR).sort((x, y) => Math.max(x.fore, x.hind) - Math.max(y.fore, y.hind)))
    console.log(`#${p.a}~#${p.b}: aligned fore ${(p.fore * 41).toFixed(2)} mm hind ${(p.hind * 41).toFixed(2)} mm (raw ${(p.foreRaw * 41).toFixed(2)} / ${(p.hindRaw * 41).toFixed(2)}) · angle diff fore ${p.dFore}° hind ${p.dHind}° · hind length x${p.ratio}`);
}

/* a shape with one pair turned by delta, on the default bug, or the reason */
export function turned(s, which, delta, base = G.defaultParams()) {
  const p = G.applyWingShape(base, s), W = p.wings[which === 'fore' ? 'first' : 'last'];
  const r = G.rotateWingBlade(W.points, W.stretch, delta, which === 'hind' && s.tail ? p.wings.tail : null);
  if (!r.ok) return { ok: false, reason: r.reason };
  W.points = r.points; W.stretch = r.stretch; if (which === 'hind' && r.tail) p.wings.tail = r.tail;
  return { ok: true, params: p };
}

/* the outline rule's span for one wing: the widest run of whole degrees about
   0, within +-20, that rotateWingBlade accepts, with the reason at each end */
export function feasibleSpan(s, which) {
  const w = G.posedWing(s[which]), tail = which === 'hind' && s.tail ? { ...s.tail, on: true } : null;
  const out = { lo: 0, hi: 0, whyLo: 'the +-20 deg range', whyHi: 'the +-20 deg range' };
  for (let d = 1; d <= 20; d++) { const r = G.rotateWingBlade(w.points, w.stretch, d, tail); if (!r.ok) { out.whyHi = r.reason; break; } out.hi = d; }
  for (let d = 1; d <= 20; d++) { const r = G.rotateWingBlade(w.points, w.stretch, -d, tail); if (!r.ok) { out.whyLo = r.reason; break; } out.lo = -d; }
  return out;
}

async function sweep() {
  const ids = opt('--only', null) ? opt('--only').split(',').map(Number) : null;
  const deltas = opt('--deltas', null) ? opt('--deltas').split(',').map(Number) : DELTAS;
  const lib = G.WING_LIBRARY.filter((s) => !ids || ids.includes(s.id));
  const rows = [], refused = [], spans = [];
  for (const s of lib) for (const which of ['fore', 'hind']) {
    // the outline rule's own span within +-20 (1 deg steps), then every 5 deg
    // step inside it and its two ends
    const span = feasibleSpan(s, which); spans.push({ id: s.id, which, ...span });
    const ds = [...new Set([...deltas.filter((d) => d >= span.lo && d <= span.hi), span.lo, span.hi])].filter((d) => d !== 0).sort((a, b) => a - b);
    for (const d of ds) {
    const t = turned(s, which, d);
    if (t.ok) rows.push([`#${s.id} ${which} ${d > 0 ? '+' : ''}${d}`, t.params]); else refused.push({ id: s.id, which, d, reason: t.reason });
  } }
  const jobs = +opt('--jobs', os.cpus().length), chunks = Array.from({ length: jobs }, () => []);
  rows.forEach((r, k) => chunks[k % jobs].push(r));
  const res = await Promise.all(chunks.map((c, k) => new Promise((ok) => {
    const f = path.join(OUT, `rows-${k}.json`); fs.writeFileSync(f, JSON.stringify(c));
    const ch = spawn(process.execPath, [path.join(ROOT, 'tools/verify-bug.mjs'), '--rows', f], { stdio: ['ignore', 'pipe', 'ignore'] });
    let s = ''; ch.stdout.on('data', (b) => { s += b; }); ch.on('close', () => { fs.unlinkSync(f); ok(s); });
  })));
  const result = [];
  for (const txt of res) { let cur = null; for (const line of txt.split('\n')) { const m = line.match(/^(ok  |FAIL) #(\d+) (fore|hind) ([+-]\d+)$/); if (m) { cur = { id: +m[2], which: m[3], d: +m[4], ok: m[1] === 'ok  ', why: [] }; result.push(cur); } else if (cur && /^     /.test(line)) cur.why.push(line.trim()); } }
  const prev = fs.existsSync(path.join(OUT, 'sweep.json')) && ids ? JSON.parse(fs.readFileSync(path.join(OUT, 'sweep.json'))) : { result: [], refused: [] };
  const keep = (x) => !ids || !ids.includes(x.id);
  const all = { deltas, ramp: G.WING_ANGLE_RAMP, spans: [...(prev.spans || []).filter(keep), ...spans], result: [...prev.result.filter(keep), ...result], refused: [...prev.refused.filter(keep), ...refused] };
  fs.writeFileSync(path.join(OUT, 'sweep.json'), JSON.stringify(all, null, 1));
  const bad = all.result.filter((r) => !r.ok);
  console.log(`sweep: ${all.result.length} built rows, ${bad.length} failing; ${all.refused.length} refused before building`);
  for (const r of bad) console.log(`  FAIL #${r.id} ${r.which} ${r.d}: ${r.why.join(' | ').slice(0, 200)}`);
  for (const r of all.refused) console.log(`  REFUSED #${r.id} ${r.which} ${r.d}: ${r.reason}`);
}

if (CMD === 'measure') measure();
else if (CMD === 'sweep') await sweep();
else if (CMD === 'review') (await import('./bug-wing-angles-review.mjs')).review(OUT, { canonicalDense, posedShape });

/* store: rewrite bug-wing-library.js from the SNAPSHOT of #361's library
   (tools/bug-wing-library-snapshot.json): each pair's points turned to angle 0
   (canonical, 9 decimals so posing it at its own angle rounds back to the 5-decimal points it came from, bit for bit) and its measured angle as `sweep`; the tail as it was (its
   anchor is on the posed outline). Header and ids untouched. */
if (CMD === 'store') {
  // Eva's ruling on the wing-angle audit (Oct 5): #22 into #4 and #19 into #10
  // (§14.5), applied with the two builder fixes and stable draws (§15): the
  // merged id -> the shape it was merged into. Ids never change; a merged id is
  // a gap.
  const MERGED = { 22: 4, 19: 10 };
  const snap = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/bug-wing-library-snapshot.json'), 'utf8')).filter((s) => !(s.id in MERGED));
  const file = path.join(ROOT, 'bug-wing-library.js'), src = fs.readFileSync(file, 'utf8');
  const head = src.slice(0, src.indexOf('export const WING_LIBRARY'));
  const r5 = (x) => +x.toFixed(9), pts = (P) => JSON.stringify(P.map(([u, w]) => [r5(u), r5(w)]));
  // the RANGE each wing's angle control allows, as offsets from its found
  // angle: the sweep's (<out>/sweep.json) widest run about 0 over which every
  // built row passes, ends included; without a sweep, none is written
  const SW = fs.existsSync(path.join(OUT, 'sweep.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'sweep.json'), 'utf8')) : null;
  const SW_SHAPE = (id) => snap.find((x) => x.id === id);   // #361's posed outlines (the snapshot), never this tool's own previous output
  const rangeOf = (id, which) => {
    if (!SW) return null;
    const sp = SW.spans.find((x) => x.id === id && x.which === which); if (!sp) return null;
    const R = SW.result.filter((x) => x.id === id && x.which === which), bad = (d) => R.some((x) => x.d === d && !x.ok) || SW.refused.some((x) => x.id === id && x.which === which && x.d === d);
    const tested = [...new Set(R.map((x) => x.d))].sort((a, b) => a - b);
    let hi = 0; for (const d of tested.filter((d) => d > 0)) { if (bad(d)) break; hi = d; }
    let lo = 0; for (const d of tested.filter((d) => d < 0).reverse()) { if (bad(d)) break; lo = d; }
    // the sweep turned by RAW degrees (rotateWingBlade); the control asks for
    // MEASURED degrees (setWingAngle), and the two differ where the stretch is
    // raised (a raw +16 reads +15.81 on #16's hindwing). The range is stored in
    // measured degrees: what the last verified raw turn reads, toward 0 to 0.1
    const sw = which === 'fore' ? SW_SHAPE(id).fore : SW_SHAPE(id).hind, posed = { points: sw.points, stretch: sw.stretch }, a0 = G.wingAngleOf(posed.points, posed.stretch);
    const tail = which === 'hind' && SW_SHAPE(id).tail ? { ...SW_SHAPE(id).tail, on: true } : null;
    const meas = (d) => { if (!d) return 0; const r = G.rotateWingBlade(posed.points, posed.stretch, d, tail); const m = G.wingAngleOf(r.points, r.stretch) - a0; return Math.sign(m) * Math.floor(Math.abs(m) * 10) / 10; };
    return [Math.max(-20, meas(lo)), Math.min(20, meas(hi))];
  };
  const wing = (id, which, w, extra) => { const a = +G.wingAngleOf(w.points, w.stretch).toFixed(3), r = rangeOf(id, which); return `{ stretch: ${w.stretch}, ${extra}sweep: ${a},${r ? ` range: [${r[0]}, ${r[1]}],` : ''} points: ${pts(G.turnWingRaw(w.points, w.stretch, -a))} }`; };
  const body = snap.map((s) => `  { id: ${s.id}, name: ${JSON.stringify(s.name)}, source: ${JSON.stringify(s.source)},\n    fore: ${wing(s.id, 'fore', s.fore, '')},\n    hind: ${wing(s.id, 'hind', s.hind, `lengthRatio: ${s.hind.lengthRatio}, `)},\n    tail: ${JSON.stringify(s.tail)} },`).join('\n');
  fs.writeFileSync(file, `${head}export const WING_LIBRARY = [\n${body}\n];\n`);
  console.log(`store: ${snap.length} shapes written canonical + sweep`);
}
