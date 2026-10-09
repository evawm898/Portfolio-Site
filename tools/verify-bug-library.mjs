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
     LB8  THREE-PAIR entries (design doc §18; every shipped N-pair entry plus
          the gate's own fixture, tools/bug-fixtures.mjs THREE_PAIR_SHAPE):
          applied to the default bug the pair count is N, every pair is the
          shape's own posed outline (first, every unlinked middle, last), no
          pair crosses itself, no floor violation and no repair note; each
          stored angle is its posed pair's measured angle (and the FIXTURE's
          read the angles restated in this file, since a zeroed stored angle
          poses a pair that reads zero); the control lands
          at both ends of each pair's stored range; and the same holds built on
          EVERY winged body preset (Butterfly, Moth, Bee, Dragonfly) — a bug
          with three roots along the thorax blends at the junction with no
          floor violation on any of them (the `library3:` rows run the J, S and
          C clauses on the same builds).
     LB9  applying an N-pair shape writes the pair count and the middles and
          NOTHING else: on six bases (2, 1 and 4 pairs among them) the params
          with the written fields removed are byte-identical, 4 pairs becomes
          3 (the shape has no fourth), the three pairs are three DISTINCT
          outlines (never a blended middle), the middle's per-pair fields below
          the outline are the linked interpolation, and shapePairs() reads a
          two-pair entry as [fore, hind] and refuses a reserved `from` record.
     LB10 the random draws never see an N-pair entry: RANDOMIZE WINGS on the
          library WITH the fixture appended gives byte-identical params and
          labels to the library without it (seeds on the default and on random
          bases), and no label names an N-pair id. The draw is a min-hash over
          ids, so that arm alone is a coin flip against a pool that admits
          them (measured: ~half of 17 rolls never draw the appended entry); a
          pool of ONE two-pair entry beside TWO N-pair ones must draw NO blend
          (the filtered pool is one shape and the fallback applies it), which
          a pool admitting them cannot satisfy.
     LB7  the draws are keyed on shape IDS, not on library position (§15.1): on
          every random gate row (random:1..40, the whole-bug Randomize) and on
          RANDOMIZE WINGS seeds 1..8 on the default, the library with one shape
          the row never drew (accepted or refused) REMOVED gives the same label,
          the same tries and byte-identical params, and so does the library in
          REVERSED order; and (non-vacuity) removing the shape a row DID draw
          changes that row. The reference is the full library's own draw.

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

import { THREE_PAIR_SHAPE } from './bug-fixtures.mjs';
// the three-pair fixture's angles, restated (LB8's reference for them — bug-fixtures.mjs is the quantity's owner)
const FIXTURE_SWEEPS = [-15, 15, 48];
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

export function libraryChecks(G, opts = {}) {
  const out = [], ok = (c, m) => out.push([!!c, m]);
  // the TWO-PAIR entries carry LB1-LB7 and WA1-WA4 as before; the N-pair
  // entries (design doc §18) are LB8-LB10's and are appended after them
  const libAll = G.WING_LIBRARY, lib = libAll.filter((s) => !(Array.isArray(s.pairs) && s.pairs.length > 2)), libN = libAll.filter((s) => Array.isArray(s.pairs) && s.pairs.length > 2), d = G.defaultParams();
  // Eva's keep lists, RESTATED here (never read from the library): #1-#17 from
  // the step-1 sheet, #18-#57 but #34 and #50 from the wing-shape audit (§13.7),
  // less #22 (merged into #4) and #19 (merged into #10) — her ruling on the
  // wing-angle audit (§14.5, applied §15.4)
  const KEPT = [...Array.from({ length: 57 }, (_, i) => i + 1).filter((id) => ![34, 50, 22, 19].includes(id))];
  const ids = lib.map((s) => s.id), idsN = libN.map((s) => s.id);
  const nOrder = idsN.every((id, i) => id > 57 && (i === 0 || id > idsN[i - 1])) && libAll.slice(lib.length).every((s) => Array.isArray(s.pairs));
  ok(ids.length === KEPT.length && KEPT.every((id, i) => ids[i] === id) && nOrder, `LB1: the library holds Eva's ${KEPT.length} kept two-pair shapes, ids in order (${lib.length}${ids.join(',') === KEPT.join(',') ? '' : ': ' + ids.join(',')})${libN.length ? `, then ${libN.length} three-pair entr${libN.length > 1 ? 'ies' : 'y'} (#${idsN.join(', #')})` : ''}${nOrder ? '' : ' — an N-pair entry is out of place or its id is not past the kept list'}`);
  // LB1
  const bad1 = [];
  for (const s of libAll) {
    let q; try { q = G.applyWingShape(d, s); } catch (e) { bad1.push(`#${s.id}: ${e.message}`); continue; }   // a shape that cannot be posed is refused, not a crash
    const m = G.buildBug(q), pr = wingProblems(G, q, m);
    const tailDrawn = !s.tail || m.wingPairs[q.wingPairs - 1].hasTail;
    if (pr.length || m.notes.length || !tailDrawn) bad1.push(`#${s.id}: ${[...pr, ...m.notes, tailDrawn ? '' : 'its tail is not drawn'].filter(Boolean).join('; ')}`);
  }
  ok(!bad1.length, `LB1: every library shape applied to the default bug builds valid (no crossing, tail drawn, no floor violation, no repair note)${bad1.length ? ' — ' + bad1.join(' | ') : ` (${libAll.length} of ${libAll.length})`}`);
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
  // LB8-LB10 — the three-pair entries (§18): the shipped N-pair entries plus
  // the gate's own fixture (opts.fixture: the negative control hands a damaged one)
  {
    const FX = opts.fixture || THREE_PAIR_SHAPE, multi = [...libN, FX];
    const bad8 = []; let n8 = 0;
    const presets = G.BODY_TYPE_IDS.filter((t) => G.BODY_PRESETS[t].wingPairs !== 0);
    for (const s of multi) {
      const tag = s.id ? `#${s.id}` : 'fixture';
      let q; try { q = G.applyWingShape(d, s); } catch (e) { bad8.push(`${tag}: ${e.message}`); continue; }
      const N = s.pairs.length;
      if (q.wingPairs !== N) bad8.push(`${tag}: ${q.wingPairs} pairs, not ${N}`);
      const specs = [q.wings.first, ...Array.from({ length: N - 2 }, (_, i) => q.wings.unlinked[i + 1]), q.wings.last];
      s.pairs.forEach((w, k) => {
        const sp = specs[k]; if (!sp) { bad8.push(`${tag} pair ${k + 1}: no unlinked spec`); return; }
        let P; try { P = G.posedWing(w); } catch (e) { bad8.push(`${tag} pair ${k + 1}: ${e.message}`); return; }
        if (!same(sp.points, P.points) || sp.stretch !== P.stretch || sp.sweep !== 0 || sp.scallop !== 0) bad8.push(`${tag} pair ${k + 1}: not the shape's posed outline`);
        if (selfCrossingCount(G.sampleOutline(sp.points))) bad8.push(`${tag} pair ${k + 1}: crosses itself`);
        const a = G.wingAngleOf(P.points, P.stretch); if (!(Math.abs(a - w.sweep) <= 0.05)) bad8.push(`${tag} pair ${k + 1}: stored angle ${w.sweep}, the posed pair reads ${a.toFixed(2)}`);
        // the FIXTURE's angles restated HERE, not read from the fixture: its
        // points are stored turned onto their own axis, so a zeroed stored
        // angle poses a pair that READS zero and the clause above holds (the
        // reference and the quantity had one owner) — the shipped entries have
        // no such restatement and are held only by the self-consistency above
        if (!s.id && !(Math.abs(a - FIXTURE_SWEEPS[k]) <= 0.05)) bad8.push(`${tag} pair ${k + 1}: posed at ${a.toFixed(2)}, the fixture declares ${FIXTURE_SWEEPS[k]}`);
        const R = w.range; if (!Array.isArray(R) || !(R[0] <= 0 && R[1] >= 0)) { bad8.push(`${tag} pair ${k + 1}: no stored range`); return; }
        const a0 = a, tail = k === N - 1 && s.tail ? { ...s.tail, on: true } : null;
        for (const off of [R[0], R[1]]) { if (!off) continue; const r = G.setWingAngle(P.points, P.stretch, a0 + off, tail); if (!r.ok) { bad8.push(`${tag} pair ${k + 1} ${off}: refused inside its range (${r.reason})`); continue; } const got = G.wingAngleOf(r.points, r.stretch); if (!(Math.abs(got - a0 - off) <= 0.01)) bad8.push(`${tag} pair ${k + 1} ${off}: lands at ${(got - a0).toFixed(3)}`); }
      });
      // built on the default and on every winged body preset: no floor violation, no repair note (the roots blend)
      for (const t of ['default', ...presets]) {
        let b; try { b = t === 'default' ? q : G.applyBodyType(q, t).params; } catch (e) { bad8.push(`${tag} on ${t}: ${e.message}`); continue; }
        if (b.wingPairs !== N) { bad8.push(`${tag} on ${t}: ${b.wingPairs} pairs`); continue; }
        const m = G.buildBug(b); n8++;
        if (m.floorViolations.length) bad8.push(`${tag} on ${t}: under the floor (pair ${m.floorViolations[0].pair + 1})`);
        if (m.notes.length) bad8.push(`${tag} on ${t}: ${m.notes.join('; ')}`);
      }
    }
    ok(!bad8.length && n8 >= 5, `LB8: every three-pair entry (${libN.length} shipped + the fixture) applies as N distinct posed pairs at its stored angles, the control lands at both ends of each pair's range, and it builds clean on the default and on ${presets.length} body presets (${n8} builds)${bad8.length ? ' — ' + bad8.slice(0, 4).join(' | ') : ''}`);
    // LB9
    const bad9 = [];
    const stripN = (p) => { const q = JSON.parse(JSON.stringify(p)); delete q.wingPairs; for (const k of WRITES.wings) delete q.wings[k]; for (const k of WRITES.first) delete q.wings.first[k]; for (const k of WRITES.last) delete q.wings.last[k]; delete q.wings.first.length; return JSON.stringify(q); };
    const bases9 = [['default', d], ['legacy default', G.legacyDefaultParams()]];
    { const p = G.defaultParams(); p.wingPairs = 4; p.wings.unlinked[1] = { ...p.wings.first, points: p.wings.first.points.map((x) => x.slice()), sweep: 30 }; bases9.push(['4 pairs, pair 2 unlinked', p]); }
    { const p = G.defaultParams(); p.wingPairs = 1; bases9.push(['1 pair', p]); }
    for (const sd of [2, 6]) { const p = G.randomParams(sd); if (!p.wingPairs) { p.bodyParts = '3'; p.wingPairs = 2; } bases9.push([`random:${sd}`, p]); }
    for (const [name, b] of bases9) for (const s of multi) {
      const tag = s.id ? `#${s.id}` : 'fixture', before = JSON.parse(JSON.stringify(b));
      let q; try { q = G.applyWingShape(b, s); } catch (e) { bad9.push(`${name} ${tag}: ${e.message}`); continue; }
      const N = s.pairs.length;
      if (!same(b, before)) bad9.push(`${name} ${tag}: the BASE params were mutated`);
      if (stripN(q) !== stripN(b)) bad9.push(`${name} ${tag}: a non-wing setting changed`);
      if (q.wingPairs !== N) bad9.push(`${name} ${tag}: ${q.wingPairs} pairs from a ${b.wingPairs}-pair base, not ${N}`);
      if (q.wings.first.length !== b.wings.first.length) bad9.push(`${name} ${tag}: the front pair's length moved`);
      const specs = [q.wings.first, ...Array.from({ length: N - 2 }, (_, i) => q.wings.unlinked[i + 1]), q.wings.last];
      if (specs.some((x) => !x)) { bad9.push(`${name} ${tag}: a middle pair is missing`); continue; }
      // three DISTINCT outlines: no two pairs' dense outlines (in true planform) within 0.01 of each other everywhere
      const dense = specs.map((x) => G.sampleOutline(x.points).map(([u, w]) => [u, w * x.stretch]));
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { let worst = 0; for (let k = 0; k < Math.min(dense[i].length, dense[j].length); k++) worst = Math.max(worst, Math.hypot(dense[i][k][0] - dense[j][k][0], dense[i][k][1] - dense[j][k][1])); if (worst < 0.01) bad9.push(`${name} ${tag}: pairs ${i + 1} and ${j + 1} are the same outline`); }
      // the middle's fields below the outline: the linked interpolation of the base's first and last
      for (let k = 1; k < N - 1; k++) for (const f of G.WING_FIELDS) {
        if (['points', 'stretch', 'sweep', 'scallop', 'length'].includes(f.id)) continue;
        const t = k / (N - 1), v = b.wings.first[f.id] + (b.wings.last[f.id] - b.wings.first[f.id]) * t, want = f.step >= 1 ? Math.round(v) : v;
        if (specs[k][f.id] !== want) bad9.push(`${name} ${tag} pair ${k + 1}: ${f.id} is ${specs[k][f.id]}, not the interpolated ${want}`);
      }
      const lf = G.WING_FIELDS.find((f) => f.id === 'length');
      for (let k = 1; k < N; k++) { const want = +Math.max(lf.min, Math.min(lf.max, b.wings.first.length * s.pairs[k].lengthRatio)).toFixed(3); if (specs[k].length !== want) bad9.push(`${name} ${tag} pair ${k + 1}: length ${specs[k].length}, not ${want}`); }
    }
    // shapePairs: the two forms, and the reserved one refused
    const two = lib[0], sp2 = G.shapePairs(two);
    if (!(sp2.length === 2 && sp2[0] === two.fore && sp2[1] === two.hind)) bad9.push('shapePairs() does not read a two-pair entry as [fore, hind]');
    if (G.shapePairs(FX).length !== FX.pairs.length) bad9.push('shapePairs() does not read an N-pair entry as its pairs');
    let refused = false; try { G.shapePairs({ pairs: [FX.pairs[0], { from: { id: 4, wing: 'hind' } }, FX.pairs[2]] }); } catch { refused = true; }
    if (!refused) bad9.push('a reserved { from } wing record was not refused');
    ok(!bad9.length, `LB9: applying a three-pair shape writes the pair count (${multi.map((s) => s.pairs.length).join('/')}) and the middle pairs and nothing else, on ${bases9.length} bases, as three distinct outlines${bad9.length ? ' — ' + bad9.slice(0, 4).join(' | ') : ''}`);
    // LB10
    const bad10 = []; let n10 = 0;
    const withFx = [...libAll, { ...FX, id: 999 }];
    const bases10 = [['default', d, 8]]; for (const sd of [1, 2, 3]) { const p = G.randomParams(sd); if (!p.wingPairs) { p.bodyParts = '3'; p.wingPairs = 2; } bases10.push([`random:${sd}`, p, 3]); }
    for (const [name, b, n] of bases10) for (let seed = 1; seed <= n; seed++) {
      let r0, r1; try { r0 = G.randomWingBlend(b, seed); r1 = G.randomWingBlend(b, seed, { library: withFx }); } catch (e) { bad10.push(`${name} seed ${seed}: ${e.message}`); continue; } n10++;
      if (r0.label !== r1.label || !same(r0.params, r1.params) || !same(r0.blend, r1.blend)) bad10.push(`${name} seed ${seed}: the draw moved with an N-pair entry in the library ("${r0.label}" -> "${r1.label}")`);
      if (/#999\b/.test(r1.label) || (r1.blend && (r1.blend.a === 999 || r1.blend.b === 999 || r1.blend.refused.some((x) => x.a === 999 || x.b === 999)))) bad10.push(`${name} seed ${seed}: an N-pair entry was drawn`);
    }
    // the draws above are a min-hash over ids, so an N-pair entry in the pool
    // is drawn with chance ~1/N per slot and 17 rolls MISS it about half the
    // time (measured: the pool-filter mutant fired nothing) — a coin flip, not
    // a witness. This arm is deterministic: a pool of ONE two-pair entry and
    // TWO N-pair ones leaves the filtered pool a single shape, so no blend can
    // be drawn at all and the fallback applies that one entry; with the filter
    // gone the pool is three and every draw is a blend naming an N-pair id
    const one = lib[0], FXb = { ...FX, id: 998 };
    for (const seed of [1, 2, 3]) {
      let r; try { r = G.randomWingBlend(d, seed, { library: [{ ...FX, id: 999 }, FXb, one] }); } catch (e) { bad10.push(`pool-of-one seed ${seed}: ${e.message}`); continue; } n10++;
      if (!r.blend || r.blend.a !== one.id || r.blend.b !== one.id || r.blend.t !== 0 || !/no blend passed/.test(r.label)) bad10.push(`pool-of-one seed ${seed}: with one two-pair entry and two N-pair ones the draw should be that one entry unblended, got "${r.label}"`);
    }
    ok(!bad10.length && n10 > 0, `LB10: the random draws never see a three-pair entry — ${n10} rolls byte-identical with the fixture appended to the library, no label names it, and a pool of one two-pair entry beside two N-pair ones draws no blend${bad10.length ? ' — ' + bad10.slice(0, 3).join(' | ') : ''}`);
  }
  // LB7 (opts.lb7 === false skips it: the negative control runs it only on the
  // clean module and on the mutant that names it — every other mutant names
  // another clause, and LB7's ~200 builds ten times over cost the CI job its
  // 30 minutes)
  if (opts.lb7 !== false) {
    const bad7 = []; let n7 = 0, moved = 0, tried = 0;
    const ids = (r) => new Set(r.blend ? [r.blend.a, r.blend.b, ...r.blend.refused.flatMap((x) => [x.a, x.b])] : []);
    const rev = [...lib].reverse();
    // the SAME verdict (wingShapeProblem) cached on the candidate params: a row
    // run against a smaller or reordered library draws the same candidates and
    // need not rebuild them; the draw itself is what LB7 tests
    const memo = new Map(), problem = (q) => { const k = JSON.stringify(q); if (!memo.has(k)) memo.set(k, G.wingShapeProblem(q)); return memo.get(k); };
    const cases = [];
    for (let s = 1; s <= 40; s++) cases.push([`random:${s}`, (o) => G.randomParamsWithBlend(s, o)]);
    for (let s = 1; s <= 8; s++) cases.push([`RANDOMIZE WINGS seed ${s}`, (o) => G.randomWingBlend(d, s, o)]);
    for (const [name, run] of cases) {
      let r; try { r = run({ problem }); } catch (e) { bad7.push(`${name}: ${e.message}`); continue; }
      if (!r.blend) continue;
      const used = ids(r), unrel = lib.find((x) => !used.has(x.id)), unrel2 = [...lib].reverse().find((x) => !used.has(x.id));
      n7++;
      for (const [what, L] of [[`without #${unrel.id}`, lib.filter((x) => x !== unrel)], [`without #${unrel2.id}`, lib.filter((x) => x !== unrel2)], ['reversed', rev]]) {
        let r2; try { r2 = run({ library: L, problem }); } catch (e) { bad7.push(`${name} ${what}: ${e.message}`); continue; }
        if (r2.label !== r.label || !r2.blend || r2.blend.tries !== r.blend.tries || !same(r2.params, r.params)) bad7.push(`${name} ${what}: "${r2.label}" where the full library drew "${r.label}"`);
      }
      if (tried < 3) {
        tried++;
        const A = lib.find((x) => x.id === r.blend.a), r3 = run({ library: lib.filter((x) => x !== A), problem });
        if (r3.label === r.label) bad7.push(`${name}: removing #${A.id}, which it drew, left "${r.label}" (vacuous)`); else moved++;
      }
    }
    ok(!bad7.length && n7 > 0 && tried === 3 && moved === 3, `LB7: the draws are keyed on shape ids — ${n7} random rows unchanged by removing either of two shapes they never drew and by reversing the library; ${moved}/3 rows move when the shape they drew is removed${bad7.length ? ' — ' + bad7.slice(0, 3).join(' | ') : ''}`);
  }
  return out;
}

/* built rows: every shape on the default bug, a few at 1 / 3 / 4 pairs, and
   random blends on the default and on random bases */
export function libraryRows(G) {
  const rows = [], lib = G.WING_LIBRARY.filter((s) => !(Array.isArray(s.pairs) && s.pairs.length > 2));
  for (const s of lib) rows.push([`library:#${s.id}`, G.applyWingShape(G.defaultParams(), s), {}]);
  for (const [n, id] of [[1, 5], [3, 16], [4, 9], [4, 2]]) { const p = G.defaultParams(); p.wingPairs = n; rows.push([`library:#${id} at ${n} pair(s)`, G.applyWingShape(p, lib.find((x) => x.id === id)), {}]); }
  // on main's pre-type thorax (5 mm): with the Butterfly default's 7.09 mm the
  // hindwing's cut-safe union splits — PRE-EXISTING on main's own geometry at
  // that body, and it flickers with the thorax (5.5 to 7.5 mm, both ways), so
  // it is a property of HOLES + the junction blend and not of the body types
  // (bug-project-design-doc.md §17.8). Pinned, not hidden: the finding is there.
  { const p = G.defaultParams(); p.venation = 'holes'; p.thoraxLength = 5; p.bodyType = 'custom'; p.bodyRatios = null; rows.push(['library:#13, holes', G.applyWingShape(p, lib.find((x) => x.id === 13)), {}]); }
  { const p = G.defaultParams(); p.wingRootPinch = 0.6; rows.push(['library:#16, root pinch 0.6', G.applyWingShape(p, lib.find((x) => x.id === 16)), {}]); }
  for (let seed = 1; seed <= 8; seed++) { const r = G.randomWingBlend(G.defaultParams(), seed); rows.push([`library blend seed ${seed}: ${r.label}`, r.params, {}]); }
  // the THREE-PAIR entries (§18): each shipped one and the fixture on the
  // default and on every winged body preset — three roots along the thorax
  // through the junction blend, the J, S, C and floor clauses on each
  const multi = [...lib.filter((s) => Array.isArray(s.pairs) && s.pairs.length > 2), THREE_PAIR_SHAPE];
  for (const s of multi) {
    const tag = s.id ? `#${s.id}` : 'fixture', q = G.applyWingShape(G.defaultParams(), s);
    rows.push([`library3: ${tag}`, q, {}]);
    for (const t of G.BODY_TYPE_IDS.filter((t) => G.BODY_PRESETS[t].wingPairs !== 0)) rows.push([`library3: ${tag} x ${t}`, G.applyBodyType(q, t).params, {}]);
  }
  return rows;
}

/* code mutants of bug-geometry.js: [name, from, to, clause] (one edit each) */
export const LIBRARY_MUTANTS = [
  ['applying writes a body field', 'W.unlinked = {};\n  W.tail = shape.tail', 'W.unlinked = {}; p.abdomenLength *= 1.1;\n  W.tail = shape.tail', 'LB2'],
  ['applying resets the venation', "W.last.scallop = 0;", "W.last.scallop = 0; W.last.veinCount = 2;", 'LB2'],
  ['the hindwing keeps its own length', '  W.last.length = +clamp(W.first.length * shape.hind.lengthRatio, lf.min, lf.max).toFixed(3);\n', '', 'LB2'],
  ['an unlinked middle survives the apply', '  W.unlinked = {};\n  W.tail', '  W.tail', 'LB3'],
  ['the re-roll is disabled', "const why = q.wingPairs > 0 ? (opts.problem || wingShapeProblem)(q) : null;", 'const why = null;', 'LB4'],
  ['the label names a t that was not used', 'const q = applyWingShape(params, blendWingShapes(lib[i], lib[j], t));', 'const q = applyWingShape(params, blendWingShapes(lib[i], lib[j], Math.min(0.9, t + 0.05)));', 'LB5'],
  ['the whole-bug Randomize keeps its own outlines', "  const b = randomWingBlend(q, Math.floor(r() * 4294967296), opts);\n  return { params: b.params,", "  const b = randomWingBlend(q, Math.floor(r() * 4294967296), opts);\n  return { params: q,", 'LB6'],
  ['the draw picks by library POSITION again', 'const A = drawShape(lib, seed, k, 1), B = drawShape(lib, seed, k, 2, A);', 'const ia = Math.floor(drawHash(seed, k, 1) * lib.length); let ib = Math.floor(drawHash(seed, k, 2) * (lib.length - 1)); if (ib >= ia) ib++; const A = lib[ia], B = lib[ib];', 'LB7'],
  // the three-pair form (§18)
  ['a three-pair shape blends its middle', '    for (let k = 1; k < N - 1; k++) W.unlinked[k] = wingAt(k);\n', '', 'LB8'],
  ['a three-pair shape keeps the pair count', '    p.wingPairs = N;\n    W.first = wingAt(0);', '    p.wingPairs = Math.max(2, Math.min(params.wingPairs, N));\n    W.first = wingAt(0);', 'LB9'],
  ['three-pair entries enter the blend pool', ".filter((s) => !isMultiShape(s)), maxTries", ", maxTries", 'LB10'],
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
  const lib = G.WING_LIBRARY.filter((s) => !(Array.isArray(s.pairs) && s.pairs.length > 2)), d = G.defaultParams();   // the two-pair entries (an N-pair entry's angles are LB8's)
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
