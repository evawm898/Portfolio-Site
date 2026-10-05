/* verify-bug-library.mjs — the LB family of the bug gate: the WING-SHAPE
   LIBRARY (design doc §13). Imported by tools/verify-bug.mjs, which runs these
   function checks beside the others and builds the rows below as ordinary
   rows (M W P C F S R O N E J ... all apply to them). Node only.

   `G` is the geometry module under test (the gate hands it a MUTATED copy for
   the negative control), so every check reads the module it is given. The
   REFERENCES are this file's own: which params fields applying may write is
   restated here (never read from G.WING_SHAPE_WRITES, which would move with a
   defect), validity is this file's own self-crossing count plus the BUILT
   model's floor report, and a blend's honesty is re-derived from the label.

     LB1  every library shape, applied to the default bug, builds valid: both
          drawn outlines (the hind composed with its tail) cross nowhere, the
          tail is drawn when the shape has one, no floor violation, no repair
          note — and it is also a built row (every clause of the gate).
     LB2  applying leaves every non-wing setting BYTE-IDENTICAL: on six bases
          (default, legacy default, 4 pairs with an unlinked middle, three
          random bugs) the params with the written fields removed are the same
          JSON before and after, and the written fields hold the shape's values
          (the hind's length is the forewing's x the shape's ratio).
     LB3  3–4 pairs: the shape lands on the FIRST and LAST pairs and every
          middle pair is linked (interpolated) — an unlinked middle is cleared.
     LB4  RANDOMIZE WINGS never produces an invalid wing: over 40 seeds on the
          default bug and 12 random bases, every result passes LB1's own tests;
          and the re-roll is EXERCISED (vacuity: some seed refused a blend).
     LB5  the label is the blend: "blend of #a and #b at t" with a != b and t
          in [0.1, 0.9], and re-blending a, b at that t and applying it gives
          the SAME params, byte for byte.
     LB6  the whole-bug Randomize uses it: every random bug with wings carries a
          label, and its wing outlines are that label's blend.

   The WING ANGLE (design doc §14). The library stores each wing turned to
   angle 0 with the angle it was found at; applying poses it.
     WA1  at its OWN angle every shape assembles as #361's library did: the
          reference is tools/bug-wing-library-snapshot.json (the library's data
          before the angles were stored — a different owner from the posing
          under test), applied by the old rule RESTATED here (points and stretch
          as written, sweep 0); both pairs' drawn outlines (the hind with its
          tail) in WORLD mm through editorFrame within WA_TOL_MM everywhere.
     WA2  every stored angle is the angle of the posed wing (wingAngleOf on
          what applying writes, within 0.05 deg), the canonical outline reads
          ~0, and the angles are not all ~0 (vacuity: a store of zeros fails).
     WA3  every wing carries its MEASURED range (offsets from its found angle,
          inside WA_RANGE: tools/bug-wing-angles.mjs sweep built every 5 deg
          step and both ends through every row clause), and the control
          (setWingAngle) lands on the asked angle within 0.01 deg at both ends
          and the midpoints; two turns add (within 1e-4).
     WA4  the REGENERATED ROOT: across every wing's stored range the two root
          anchors are the posed ones (to the 5-decimal storage) and every
          control point inside the bridge's inner radius is unmoved: the root
          chord stays on u = 0, square to the body. Built rows 'angle: ...'
          run every row clause (J, S, F/N floor, C connectedness, ...) at both
          ends of the stored range on three shapes, each pair alone and both. */

// this file's own crossing count (the gate's segment test, copied: importing
// verify-bug.mjs would run the whole gate)
function segCross(a, b, c, d) {
  const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  const o1 = o(a, b, c), o2 = o(a, b, d), o3 = o(c, d, a), o4 = o(c, d, b);
  if (o1 * o2 < 0 && o3 * o4 < 0) return true;
  const on = (p, q, r) => Math.min(p[0], q[0]) <= r[0] && r[0] <= Math.max(p[0], q[0]) && Math.min(p[1], q[1]) <= r[1] && r[1] <= Math.max(p[1], q[1]);
  return (o1 === 0 && on(a, b, c)) || (o2 === 0 && on(a, b, d)) || (o3 === 0 && on(c, d, a)) || (o4 === 0 && on(c, d, b));
}
function selfCrossingCount(poly) {
  let n = 0; const N = poly.length;
  for (let i = 0; i < N; i++) for (let j = i + 2; j < N; j++) { if (i === 0 && j === N - 1) continue; if (segCross(poly[i], poly[(i + 1) % N], poly[j], poly[(j + 1) % N])) n++; }
  return n;
}

// the fields applying may write — restated, not imported
const WRITES = { first: ['points', 'stretch', 'sweep', 'scallop'], last: ['points', 'stretch', 'sweep', 'scallop', 'length'], wings: ['unlinked', 'tail'] };
const strip = (p) => {
  const q = JSON.parse(JSON.stringify(p));
  for (const k of WRITES.wings) delete q.wings[k];
  for (const k of WRITES.first) delete q.wings.first[k];
  for (const k of WRITES.last) delete q.wings.last[k];
  return JSON.stringify(q);
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* LB1's tests, read off the params and the BUILT model — not wingShapeProblem */
export function wingProblems(G, params, model) {
  const out = [], W = params.wings;
  if (!(params.wingPairs > 0)) return out;
  const fore = G.sampleOutline(W.first.points);
  if (selfCrossingCount(fore)) out.push('the forewing outline crosses itself');
  if (params.wingPairs >= 2) {
    const comp = G.composeOutline(W.last.points, W.tail);
    if (selfCrossingCount(G.sampleOutline(comp.points))) out.push(W.tail && W.tail.on ? 'the hindwing outline with its tail crosses itself' : 'the hindwing outline crosses itself');
  }
  const m = model || G.buildBug(params);
  if (m.floorViolations.length) out.push(`a wing is under the floor (pair ${m.floorViolations[0].pair + 1})`);
  for (const n of m.notes) if (/TAIL does not fit|crossed itself|refused/.test(n)) out.push(n);
  return out;
}

export function libraryChecks(G) {
  const out = [], ok = (c, m) => out.push([!!c, m]);
  const lib = G.WING_LIBRARY, d = G.defaultParams();
  // Eva's keep lists, RESTATED here (never read from the library): #1-#17 from
  // the step-1 sheet, #18-#57 but #34 and #50 from the wing-shape audit (§13.7),
  // less #19 and #22, merged by the wing-angle audit (§14.5)
  const KEPT = [...Array.from({ length: 57 }, (_, i) => i + 1).filter((id) => ![34, 50, 19, 22].includes(id))];   // #19 and #22 merged into #10 and #4 (Eva, Oct 5, the wing-angle audit)
  const ids = lib.map((s) => s.id);
  ok(ids.length === KEPT.length && KEPT.every((id, i) => ids[i] === id), `LB1: the library holds Eva's ${KEPT.length} kept shapes, ids in order (${lib.length}${ids.join(',') === KEPT.join(',') ? '' : ': ' + ids.join(',')})`);
  // LB1
  const bad1 = [];
  for (const s of lib) {
    let q; try { q = G.applyWingShape(d, s); } catch (e) { bad1.push(`#${s.id}: ${e.message}`); continue; }   // a shape that cannot be posed is refused, not a crash
    const m = G.buildBug(q), pr = wingProblems(G, q, m);
    const tailDrawn = !s.tail || m.wingPairs[1].hasTail;
    if (pr.length || m.notes.length || !tailDrawn) bad1.push(`#${s.id}: ${[...pr, ...m.notes, tailDrawn ? '' : 'its tail is not drawn'].filter(Boolean).join('; ')}`);
  }
  ok(!bad1.length, `LB1: every library shape applied to the default bug builds valid (no crossing, tail drawn, no floor violation, no repair note)${bad1.length ? ' — ' + bad1.join(' | ') : ` (${lib.length} of ${lib.length})`}`);
  // LB2
  const bases = [['default', d], ['legacy default', G.legacyDefaultParams()]];
  { const p = G.defaultParams(); p.wingPairs = 4; p.wings.unlinked[1] = { ...p.wings.first, points: p.wings.first.points.map((x) => x.slice()), sweep: 30 }; bases.push(['4 pairs, pair 2 unlinked', p]); }
  for (const s of [2, 3, 6]) { const p = G.randomParams(s); if (!p.wingPairs) { p.bodyParts = '3'; p.wingPairs = 2; } bases.push([`random:${s}`, p]); }
  const bad2 = [];
  for (const [name, b] of bases) for (const s of lib) {
    const before = JSON.parse(JSON.stringify(b)); let q; try { q = G.applyWingShape(b, s); } catch (e) { bad2.push(`${name} #${s.id}: ${e.message}`); continue; }
    if (!same(b, before)) bad2.push(`${name} #${s.id}: the BASE params were mutated`);
    if (strip(q) !== strip(b)) bad2.push(`${name} #${s.id}: a non-wing setting changed`);
    const W = q.wings, wantLen = +Math.max(5, Math.min(60, b.wings.first.length * s.hind.lengthRatio)).toFixed(3);
    const PF = G.posedWing(s.fore), PH = G.posedWing(s.hind);   // a library wing is stored at angle 0 and applied posed at its own angle (§14; WA1 holds the pose to #361's outlines)
    if (!same(W.first.points, PF.points) || W.first.stretch !== PF.stretch || W.first.sweep !== 0 || W.first.scallop !== 0) bad2.push(`${name} #${s.id}: the forewing is not the shape`);
    if (!same(W.last.points, PH.points) || W.last.stretch !== PH.stretch || W.last.sweep !== 0 || W.last.scallop !== 0 || W.last.length !== wantLen) bad2.push(`${name} #${s.id}: the hindwing is not the shape (length ${W.last.length} vs ${wantLen})`);
    if (W.first.length !== b.wings.first.length) bad2.push(`${name} #${s.id}: the forewing's length moved`);
    if (s.tail ? !(W.tail.on && same(W.tail.points, s.tail.points) && W.tail.anchorU === s.tail.anchorU) : W.tail.on || (b.wings.tail && !same(W.tail.points, b.wings.tail.points))) bad2.push(`${name} #${s.id}: the tail is not the shape's (or the bug's own tail group was not kept off)`);
  }
  ok(!bad2.length, `LB2: applying leaves every non-wing setting byte-identical and writes the shape (${bases.length} bases x ${lib.length} shapes)${bad2.length ? ' — ' + bad2.slice(0, 4).join(' | ') : ''}`);
  // LB3
  const bad3 = [];
  for (const n of [3, 4]) {
    const p = G.defaultParams(); p.wingPairs = n; p.wings.unlinked[1] = { ...p.wings.first, points: p.wings.first.points.map((x) => x.slice()) };
    for (const s of [lib[1], lib[15]]) {
      let q; try { q = G.applyWingShape(p, s); } catch (e) { bad3.push(`${n} pairs #${s.id}: ${e.message}`); continue; }
      const R = G.resolveWingPairs(G.normalizeParams(q));
      if (Object.keys(q.wings.unlinked).length) bad3.push(`${n} pairs #${s.id}: an unlinked middle survived`);
      if (!same(R[0].points, G.posedWing(s.fore).points) || !same(R[n - 1].points, G.posedWing(s.hind).points)) bad3.push(`${n} pairs #${s.id}: the shape is not on the first and last pairs`);
      if (!R.slice(1, n - 1).every((r) => r.role === 'mid' && r.linked)) bad3.push(`${n} pairs #${s.id}: a middle pair does not blend`);
      const pr = wingProblems(G, q); if (pr.length) bad3.push(`${n} pairs #${s.id}: ${pr.join('; ')}`);
    }
  }
  ok(!bad3.length, `LB3: at 3 and 4 pairs the shape sets the first and last pairs and the middles blend${bad3.length ? ' — ' + bad3.join(' | ') : ''}`);
  // LB4 + LB5
  const rb = [['default', d]];
  for (let s = 1; s <= 12; s++) { const p = G.randomParams(s); if (!p.wingPairs) { p.bodyParts = '3'; p.wingPairs = 2; } rb.push([`random:${s}`, p]); }
  const bad4 = [], bad5 = []; let rerolled = 0, n4 = 0;
  for (const [name, b] of rb) for (let seed = 1; seed <= (name === 'default' ? 40 : 4); seed++) {
    let r; try { r = G.randomWingBlend(b, seed); } catch (e) { bad4.push(`${name} seed ${seed}: ${e.message}`); continue; } n4++;
    if (!r.blend) { bad4.push(`${name} seed ${seed}: no result (${r.label})`); continue; }
    if (r.blend.tries > 1) rerolled++;
    const pr = wingProblems(G, r.params); if (pr.length) bad4.push(`${name} seed ${seed} (${r.label}): ${pr.join('; ')}`);
    const mm = /^blend of #(\d+) and #(\d+) at (\d\.\d\d)$/.exec(r.label);
    if (!mm) { bad5.push(`${name} seed ${seed}: label "${r.label}"`); continue; }
    const a = +mm[1], bb = +mm[2], t = +mm[3], A = lib.find((x) => x.id === a), B = lib.find((x) => x.id === bb);
    if (a === bb || !A || !B || t < 0.1 || t > 0.9) { bad5.push(`${name} seed ${seed}: "${r.label}" is not two shapes at t in [0.1, 0.9]`); continue; }
    if (strip(r.params) !== strip(b)) bad5.push(`${name} seed ${seed}: the blend changed a non-wing setting`);
    let again = null; try { again = G.applyWingShape(b, G.blendWingShapes(A, B, t)); } catch (e) { bad5.push(`${name} seed ${seed}: re-deriving "${r.label}" threw (${e.message})`); continue; }
    if (!same(again, r.params)) bad5.push(`${name} seed ${seed}: "${r.label}" is not the blend that was applied`);
  }
  ok(!bad4.length && rerolled > 0, `LB4: RANDOMIZE WINGS never produced an invalid wing over ${n4} rolls (${rb.length} bases); ${rerolled} roll(s) re-rolled a refused blend${rerolled ? '' : ' — the re-roll was NEVER exercised (vacuous)'}${bad4.length ? ' — ' + bad4.slice(0, 3).join(' | ') : ''}`);
  ok(!bad5.length, `LB5: every label names the blend that was applied (re-derived byte for byte)${bad5.length ? ' — ' + bad5.slice(0, 3).join(' | ') : ''}`);
  // LB6
  const bad6 = []; let n6 = 0;
  for (let s = 1; s <= 24; s++) {
    let r; try { r = G.randomParamsWithBlend(s); } catch (e) { bad6.push(`random:${s}: ${e.message}`); continue; } if (!(r.params.wingPairs > 0)) continue; n6++;
    const mm = /^blend of #(\d+) and #(\d+) at (\d\.\d\d)$/.exec(r.label);
    if (!mm) { bad6.push(`random:${s}: label "${r.label}"`); continue; }
    const A = lib.find((x) => x.id === +mm[1]), B = lib.find((x) => x.id === +mm[2]); let sh; try { sh = G.blendWingShapes(A, B, +mm[3]); } catch (e) { bad6.push(`random:${s}: ${e.message}`); continue; }
    if (!same(r.params.wings.first.points, sh.fore.points) || !same(r.params.wings.last.points, sh.hind.points)) bad6.push(`random:${s}: the wings are not "${r.label}"`);
  }
  ok(!bad6.length && n6 > 0, `LB6: the whole-bug Randomize draws its wings from the library blend (${n6} winged bugs of 24)${bad6.length ? ' — ' + bad6.slice(0, 3).join(' | ') : ''}`);
  return out;
}

/* built rows: every shape on the default bug, a few at 1 / 3 / 4 pairs, and
   random blends on the default and on random bases */
export function libraryRows(G) {
  const rows = [], lib = G.WING_LIBRARY;
  for (const s of lib) rows.push([`library:#${s.id}`, G.applyWingShape(G.defaultParams(), s), {}]);
  for (const [n, id] of [[1, 5], [3, 16], [4, 9], [4, 2]]) { const p = G.defaultParams(); p.wingPairs = n; rows.push([`library:#${id} at ${n} pair(s)`, G.applyWingShape(p, lib.find((x) => x.id === id)), {}]); }
  { const p = G.defaultParams(); p.venation = 'holes'; rows.push(['library:#13, holes', G.applyWingShape(p, lib.find((x) => x.id === 13)), {}]); }
  { const p = G.defaultParams(); p.wingRootPinch = 0.6; rows.push(['library:#16, root pinch 0.6', G.applyWingShape(p, lib.find((x) => x.id === 16)), {}]); }
  for (let seed = 1; seed <= 8; seed++) { const r = G.randomWingBlend(G.defaultParams(), seed); rows.push([`library blend seed ${seed}: ${r.label}`, r.params, {}]); }
  return rows;
}

/* code mutants of bug-geometry.js: [name, from, to, clause] (one edit each) */
export const LIBRARY_MUTANTS = [
  ['applying writes a body field', 'W.unlinked = {};\n  W.tail = shape.tail', 'W.unlinked = {}; p.abdomenLength *= 1.1;\n  W.tail = shape.tail', 'LB2'],
  ['applying resets the venation', "W.last.scallop = 0;", "W.last.scallop = 0; W.last.veinCount = 2;", 'LB2'],
  ['the hindwing keeps its own length', '  W.last.length = +clamp(W.first.length * shape.hind.lengthRatio, lf.min, lf.max).toFixed(3);\n', '', 'LB2'],
  ['an unlinked middle survives the apply', '  W.unlinked = {};\n  W.tail', '  W.tail', 'LB3'],
  ['the re-roll is disabled', "const why = q.wingPairs > 0 ? wingShapeProblem(q) : null;", 'const why = null;', 'LB4'],
  ['the label names a t that was not used', 'const q = applyWingShape(params, blendWingShapes(lib[i], lib[j], t));', 'const q = applyWingShape(params, blendWingShapes(lib[i], lib[j], Math.min(0.9, t + 0.05)));', 'LB5'],
  ['the whole-bug Randomize keeps its own outlines', "  const b = randomWingBlend(q, Math.floor(r() * 4294967296));\n  return { params: b.params,", "  const b = randomWingBlend(q, Math.floor(r() * 4294967296));\n  return { params: q,", 'LB6'],
];

/* ---------- WA: the wing angle (§14) ---------- */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const SNAP = JSON.parse(fs.readFileSync(fileURLToPath(new URL('./bug-wing-library-snapshot.json', import.meta.url)), 'utf8'));
export const WA_TOL_MM = 0.05;
export const WA_RANGE = [-20, 20];               // restated: the control's offset range the doc names
export const WA_ROWS = [5, 13, 31];              // the ladder's shapes, built at both ends of the range
const worldOutline = (G, p, k) => {
  const W = p.wings, pts = k === 0 ? W.first.points : G.composeOutline(W.last.points, W.tail).points;
  const F = G.editorFrame(p, k);
  return G.sampleOutline(pts).map(([u, w]) => F.toWorld(u, w));
};
const segD = (q, a, b) => { const ab = [b[0] - a[0], b[1] - a[1]], L2 = ab[0] * ab[0] + ab[1] * ab[1] || 1e-18; const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * ab[0] + (q[1] - a[1]) * ab[1]) / L2)); return Math.hypot(q[0] - a[0] - t * ab[0], q[1] - a[1] - t * ab[1]); };
const polyD = (A, B) => { let m = 0; for (const q of A) { let d = Infinity; for (let i = 0; i + 1 < B.length; i++) d = Math.min(d, segD(q, B[i], B[i + 1])); m = Math.max(m, d); } return m; };
export function angleChecks(G) {
  const out = [], ok = (c, m) => out.push([!!c, m]);
  const lib = G.WING_LIBRARY, d = G.defaultParams();
  // WA1
  const bad1 = []; let worst = 0;
  for (const s of lib) {
    const ref = SNAP.find((x) => x.id === s.id);
    if (!ref) { bad1.push(`#${s.id}: no snapshot entry`); continue; }
    const R = JSON.parse(JSON.stringify(d)), W = R.wings;   // the old apply, restated
    Object.assign(W.first, { points: ref.fore.points, stretch: ref.fore.stretch, sweep: 0, scallop: 0 });
    Object.assign(W.last, { points: ref.hind.points, stretch: ref.hind.stretch, sweep: 0, scallop: 0, length: +Math.max(5, Math.min(60, W.first.length * ref.hind.lengthRatio)).toFixed(3) });
    W.unlinked = {}; W.tail = ref.tail ? { ...ref.tail, on: true } : { ...W.tail, on: false };
    let q; try { q = G.applyWingShape(d, s); } catch (e) { bad1.push(`#${s.id}: ${e.message}`); continue; }
    for (const k of [0, 1]) {
      const A = worldOutline(G, q, k), B = worldOutline(G, R, k), e = Math.max(polyD(A, B), polyD(B, A));
      worst = Math.max(worst, e);
      if (!(e <= WA_TOL_MM)) bad1.push(`#${s.id} ${k ? 'hind' : 'fore'}: ${e.toFixed(3)} mm`);
    }
  }
  ok(!bad1.length, `WA1: at its own angle every library shape assembles as #361's library did, within ${WA_TOL_MM} mm in world mm (${lib.length} shapes, both pairs; worst ${worst.toExponential(2)} mm)${bad1.length ? ' — ' + bad1.slice(0, 5).join(' | ') : ''}`);
  // WA2
  const bad2 = []; let turned = 0;
  for (const s of lib) for (const [nm, w] of [['fore', s.fore], ['hind', s.hind]]) {
    let p; try { p = G.posedWing(w); } catch (e) { bad2.push(`#${s.id} ${nm}: ${e.message}`); continue; }
    const a = G.wingAngleOf(p.points, p.stretch), c = G.wingAngleOf(w.points, w.stretch);
    if (!(Math.abs(a - w.sweep) <= 0.05)) bad2.push(`#${s.id} ${nm}: stored ${w.sweep}, posed reads ${a.toFixed(2)}`);
    if (!(Math.abs(c) <= 1.5)) bad2.push(`#${s.id} ${nm}: the canonical outline reads ${c.toFixed(2)} deg, not ~0`);   // the turn is exact on the control points; the spline through the bridge is not a turned spline, so the measure moves by up to ~1.2 deg there
    if (Math.abs(w.sweep) > 5) turned++;
  }
  ok(!bad2.length && turned > lib.length, `WA2: every stored angle is the posed wing's measured angle (within 0.05 deg) and the canonical outline reads ~0 (within 1.5 deg); ${turned} of ${2 * lib.length} wings sit more than 5 deg off the span${turned > lib.length ? '' : ' — the angles are (nearly) all zero: VACUOUS'}${bad2.length ? ' — ' + bad2.slice(0, 5).join(' | ') : ''}`);
  // WA3 — every wing, its whole stored range: the control lands where asked
  const bad3 = []; let n3 = 0, wide = 0;
  for (const s of lib) for (const [nm, w] of [['fore', s.fore], ['hind', s.hind]]) {
    const R = w.range;
    if (!Array.isArray(R) || !(R[0] <= 0 && R[1] >= 0 && R[0] >= WA_RANGE[0] && R[1] <= WA_RANGE[1])) { bad3.push(`#${s.id} ${nm}: no stored range inside ${WA_RANGE.join('..')} (${JSON.stringify(R)})`); continue; }
    if (R[1] - R[0] >= 10) wide++;
    let p; try { p = G.posedWing(w); } catch (e) { bad3.push(`#${s.id} ${nm}: ${e.message}`); continue; }
    const a0 = G.wingAngleOf(p.points, p.stretch), tail = nm === 'hind' && s.tail ? { ...s.tail, on: true } : null;
    for (const off of [R[0], R[0] / 2, R[1] / 2, R[1]]) {
      if (!off) continue; n3++;
      const r = G.setWingAngle(p.points, p.stretch, a0 + off, tail);
      if (!r.ok) { bad3.push(`#${s.id} ${nm} ${off}: refused (${r.reason})`); continue; }
      const got = G.wingAngleOf(r.points, r.stretch); if (!(Math.abs(got - a0 - off) <= 0.01)) bad3.push(`#${s.id} ${nm} ${off}: lands at ${(got - a0).toFixed(3)}`);
    }
  }
  for (const s of lib.slice(0, 6)) for (const w of [s.fore, s.hind]) {
    let p; try { p = G.posedWing(w); } catch { continue; }
    const A = G.turnWingRaw(G.turnWingRaw(p.points, p.stretch, 7), p.stretch, 6), B = G.turnWingRaw(p.points, p.stretch, 13);
    const e = Math.max(...A.map((q, k) => Math.hypot(q[0] - B[k][0], (q[1] - B[k][1]) * p.stretch)));
    if (!(e <= 1e-4)) bad3.push(`#${s.id}: two turns do not add (${e.toExponential(1)})`);
  }
  ok(!bad3.length && wide > lib.length, `WA3: every wing carries a measured range inside ${WA_RANGE.join('..')} and the control lands on the asked angle (within 0.01 deg) at both ends and the midpoints (${n3} turns); ${wide} of ${2 * lib.length} wings turn over 10 deg or more${wide > lib.length ? '' : ' — the ranges are (nearly) all closed: VACUOUS'}; two turns add${bad3.length ? ' — ' + bad3.slice(0, 4).join(' | ') : ''}`);
  // WA4
  const bad4 = []; let n4 = 0;
  for (const s of lib) for (const [nm, w] of [['fore', s.fore], ['hind', s.hind]]) {
    let p; try { p = G.posedWing(w); } catch (e) { bad4.push(`#${s.id} ${nm}: the wing cannot be posed (${e.message})`); continue; }
    const R = w.range || [0, 0];
    for (const off of [...new Set([R[0], ...[-15, -10, -5, 5, 10, 15].filter((d) => d > R[0] && d < R[1]), R[1]])]) {
      if (!off) continue;
      const r = G.rotateWingBlade(p.points, p.stretch, off); if (!r.ok) { bad4.push(`#${s.id} ${nm} ${off}: refused inside its range (${r.reason})`); continue; } n4++;
      const n = p.points.length, P = r.points;
      const yy = (Q, S, k) => Q[k][1] * S;   // compared in TRUE units: a raised stretch rescales w (stored to 5 decimals)
      if (P.length !== n || P[0][0] !== 0 || P[n - 1][0] !== 0 || Math.abs(yy(P, r.stretch, 0) - yy(p.points, p.stretch, 0)) > 3e-5 || Math.abs(yy(P, r.stretch, n - 1) - yy(p.points, p.stretch, n - 1)) > 3e-5) { bad4.push(`#${s.id} ${nm} ${off}: the root anchors moved`); continue; }
      for (let k = 1; k + 1 < n; k++) { const q = p.points[k]; if (Math.hypot(q[0], q[1] * p.stretch) < G.WING_ANGLE_RAMP[0] && (Math.abs(P[k][0] - q[0]) > 3e-5 || Math.abs(P[k][1] * r.stretch - q[1] * p.stretch) > 3e-5)) bad4.push(`#${s.id} ${nm} ${off}: a root point moved`); }
    }
  }
  ok(!bad4.length && n4 > 0, `WA4: the regenerated root keeps its anchors on u = 0, square to the body, across every wing's stored range (${n4} turns)${bad4.length ? ' — ' + bad4.slice(0, 4).join(' | ') : ''}`);
  return out;
}
export function angleRows(G) {
  const rows = [];
  const turn = (p, s, which, off) => {
    const W = p.wings[which], tail = which === 'last' && s.tail ? p.wings.tail : null;
    const r = G.setWingAngle(W.points, W.stretch, G.wingAngleOf(W.points, W.stretch) + off, tail);
    if (!r.ok) throw new Error(`angle row #${s.id} ${which} ${off}: refused (${r.reason}) — inside its stored range`);
    W.points = r.points; W.stretch = r.stretch; if (r.tail) p.wings.tail = r.tail;
  };
  for (const id of WA_ROWS) {
    const s = G.WING_LIBRARY.find((x) => x.id === id), RF = s.fore.range, RH = s.hind.range;
    for (const e of [0, 1]) {
      for (const [which, R] of [['first', RF], ['last', RH]]) if (R[e]) { const p = G.applyWingShape(G.defaultParams(), s); turn(p, s, which, R[e]); rows.push([`angle: #${id} ${which} ${R[e] > 0 ? '+' : ''}${R[e]}`, p, {}]); }
      if (RF[e] && RH[e]) { const p = G.applyWingShape(G.defaultParams(), s); turn(p, s, 'first', RF[e]); turn(p, s, 'last', RH[e]); rows.push([`angle: #${id} both, ${e ? 'top' : 'bottom'} of range (${RF[e]} / ${RH[e]})`, p, {}]); }
    }
  }
  return rows;
}
export const ANGLE_MUTANTS = [
  ['the stored angle is ignored on apply', "const r = rotateWingBlade(w.points, w.stretch, w.sweep || 0);", "const r = rotateWingBlade(w.points, w.stretch, 0);", 'WA1'],
  ['the root turns with the blade', 'return t * t * (3 - 2 * t); /* the root bridge */ };', 'return 1; };', 'WA4'],
  ['the root bridge starts at the hinge', 'export const WING_ANGLE_RAMP = [0.06, 0.3];', 'export const WING_ANGLE_RAMP = [0, 0.3];', 'WA4'],
];
