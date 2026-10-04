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
          label, and its wing outlines are that label's blend. */

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
  // the step-1 sheet, #18-#57 but #34 and #50 from the wing-shape audit (§13.7)
  const KEPT = [...Array.from({ length: 57 }, (_, i) => i + 1).filter((id) => id !== 34 && id !== 50)];
  const ids = lib.map((s) => s.id);
  ok(ids.length === KEPT.length && KEPT.every((id, i) => ids[i] === id), `LB1: the library holds Eva's ${KEPT.length} kept shapes, ids in order (${lib.length}${ids.join(',') === KEPT.join(',') ? '' : ': ' + ids.join(',')})`);
  // LB1
  const bad1 = [];
  for (const s of lib) {
    const q = G.applyWingShape(d, s), m = G.buildBug(q), pr = wingProblems(G, q, m);
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
    const before = JSON.parse(JSON.stringify(b)), q = G.applyWingShape(b, s);
    if (!same(b, before)) bad2.push(`${name} #${s.id}: the BASE params were mutated`);
    if (strip(q) !== strip(b)) bad2.push(`${name} #${s.id}: a non-wing setting changed`);
    const W = q.wings, wantLen = +Math.max(5, Math.min(60, b.wings.first.length * s.hind.lengthRatio)).toFixed(3);
    if (!same(W.first.points, s.fore.points) || W.first.stretch !== s.fore.stretch || W.first.sweep !== 0 || W.first.scallop !== 0) bad2.push(`${name} #${s.id}: the forewing is not the shape`);
    if (!same(W.last.points, s.hind.points) || W.last.stretch !== s.hind.stretch || W.last.sweep !== 0 || W.last.scallop !== 0 || W.last.length !== wantLen) bad2.push(`${name} #${s.id}: the hindwing is not the shape (length ${W.last.length} vs ${wantLen})`);
    if (W.first.length !== b.wings.first.length) bad2.push(`${name} #${s.id}: the forewing's length moved`);
    if (s.tail ? !(W.tail.on && same(W.tail.points, s.tail.points) && W.tail.anchorU === s.tail.anchorU) : W.tail.on || (b.wings.tail && !same(W.tail.points, b.wings.tail.points))) bad2.push(`${name} #${s.id}: the tail is not the shape's (or the bug's own tail group was not kept off)`);
  }
  ok(!bad2.length, `LB2: applying leaves every non-wing setting byte-identical and writes the shape (${bases.length} bases x ${lib.length} shapes)${bad2.length ? ' — ' + bad2.slice(0, 4).join(' | ') : ''}`);
  // LB3
  const bad3 = [];
  for (const n of [3, 4]) {
    const p = G.defaultParams(); p.wingPairs = n; p.wings.unlinked[1] = { ...p.wings.first, points: p.wings.first.points.map((x) => x.slice()) };
    for (const s of [lib[1], lib[15]]) {
      const q = G.applyWingShape(p, s), R = G.resolveWingPairs(G.normalizeParams(q));
      if (Object.keys(q.wings.unlinked).length) bad3.push(`${n} pairs #${s.id}: an unlinked middle survived`);
      if (!same(R[0].points, s.fore.points) || !same(R[n - 1].points, s.hind.points)) bad3.push(`${n} pairs #${s.id}: the shape is not on the first and last pairs`);
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
    const r = G.randomWingBlend(b, seed); n4++;
    if (!r.blend) { bad4.push(`${name} seed ${seed}: no result (${r.label})`); continue; }
    if (r.blend.tries > 1) rerolled++;
    const pr = wingProblems(G, r.params); if (pr.length) bad4.push(`${name} seed ${seed} (${r.label}): ${pr.join('; ')}`);
    const mm = /^blend of #(\d+) and #(\d+) at (\d\.\d\d)$/.exec(r.label);
    if (!mm) { bad5.push(`${name} seed ${seed}: label "${r.label}"`); continue; }
    const a = +mm[1], bb = +mm[2], t = +mm[3], A = lib.find((x) => x.id === a), B = lib.find((x) => x.id === bb);
    if (a === bb || !A || !B || t < 0.1 || t > 0.9) { bad5.push(`${name} seed ${seed}: "${r.label}" is not two shapes at t in [0.1, 0.9]`); continue; }
    if (strip(r.params) !== strip(b)) bad5.push(`${name} seed ${seed}: the blend changed a non-wing setting`);
    if (!same(G.applyWingShape(b, G.blendWingShapes(A, B, t)), r.params)) bad5.push(`${name} seed ${seed}: "${r.label}" is not the blend that was applied`);
  }
  ok(!bad4.length && rerolled > 0, `LB4: RANDOMIZE WINGS never produced an invalid wing over ${n4} rolls (${rb.length} bases); ${rerolled} roll(s) re-rolled a refused blend${rerolled ? '' : ' — the re-roll was NEVER exercised (vacuous)'}${bad4.length ? ' — ' + bad4.slice(0, 3).join(' | ') : ''}`);
  ok(!bad5.length, `LB5: every label names the blend that was applied (re-derived byte for byte)${bad5.length ? ' — ' + bad5.slice(0, 3).join(' | ') : ''}`);
  // LB6
  const bad6 = []; let n6 = 0;
  for (let s = 1; s <= 24; s++) {
    const r = G.randomParamsWithBlend(s); if (!(r.params.wingPairs > 0)) continue; n6++;
    const mm = /^blend of #(\d+) and #(\d+) at (\d\.\d\d)$/.exec(r.label);
    if (!mm) { bad6.push(`random:${s}: label "${r.label}"`); continue; }
    const A = lib.find((x) => x.id === +mm[1]), B = lib.find((x) => x.id === +mm[2]), sh = G.blendWingShapes(A, B, +mm[3]);
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
