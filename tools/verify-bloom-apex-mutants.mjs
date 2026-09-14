/* ===================================================================
   verify-bloom-apex-mutants.mjs — the POSITIVE CONTROL for the apex family
   A2..A6 (session 32). NOT a matrix gate: it proves the assertions can FIRE.

   WHY IT IS A COMMITTED INSTRUMENT AND NOT A SCRATCH SCRIPT. The smoke gate's
   CLAUSE C checks that every assertion family is CLAIMED by a row's `path`,
   and its own header says what that is worth: "a citation is a claim about the
   PATH a row engages, never evidence the assertion can FIRE there; re-run the
   mutant table when a family is added". This is that table, so the next
   session that adds a clause has something to re-run rather than re-derive.

   WHAT IT ALREADY FOUND, on its first two passes, which is the argument for
   keeping it:
     - A1 was VACUOUS and has been deleted. It read "the cap never widens:
       entry >= terminal" off the descriptor, and no reachable state can make
       that false — the proof is in bloom-harness.mjs where A1 used to be.
       The mutation that removes the very floor it guards fires NOTHING.
     - A5's first scan started at `max(uCap, ROOT_BLEND_END)` and had a blind
       spot: a plateau term added to `terms` only reaches the profile BELOW
       uCap, so its waist sat outside the scanned region. The scan starts at
       the root blend now, which is strictly stronger and measured safe over
       147,744 shipped states.
     - Two of the four original expectations were wrong about which family a
       mutation breaks, not about the gate. They are corrected here rather
       than in the gate, which is the direction that keeps the gate honest.

   A MUTATION THAT FIRES MORE THAN IT NAMES IS FINE AND IS PRINTED; a mutation
   whose named family stays SILENT fails the run, and so does any family
   firing on the clean tree.

   RUN:  node tools/verify-bloom-apex-mutants.mjs
   =================================================================== */
/* POSITIVE CONTROL for the apex family A2-A6. Each mutation is a real edit to
   bloom-geometry.js, served in flight; the run FAILS if the family the mutant
   names stays silent. "A green run does not endorse the assertion" — the
   project's own rule, and hole 5 of the smoke gate says to re-run this table
   whenever a family is added. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { serveRepo, launchPage, openBloom, applyConfig, stillFrame, thicknessAssertions, lobeAssertions, stemAssertions } from './bloom-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');

/* THE WITNESS CLAUSE (Eva's ruling, session 35). A mutation that lands on the
   right line and changes nothing observable makes a green `names` line
   evidence of nothing — and the match COUNT above cannot see that, because
   the text really did change. So every mutant declares a direct call on the
   MUTATED module proving the behaviour moved, run in Node before the browser
   is asked anything. It returns null when the behaviour moved, or a STRING
   saying what it found when it did not.

   The witness is deliberately NOT the assertion the mutant names: asking the
   gate whether the gate fired is the circularity this whole table exists to
   avoid. It asks the GEOMETRY, from the other side. */
const WDIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-apex-wit-'));
async function mutatedModule(id, source) {
  const d = path.join(WDIR, id);
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'bloom-geometry.js'), source);
  return import(pathToFileURL(path.join(d, 'bloom-geometry.js')).href);
}
/* THE WITNESS ASKS THE BUILDER, NEVER A PROFILE ASSEMBLED HERE.

   The first version called `widthProfile()` directly with a stub ring
   (`{ width: 6.4 }`) and a hand-written state. It read stations 7.11e-2 away
   from the ones `buildPetalInto` actually emits — because `footRing()` owns
   the ring width, the root blend reads it, and the turning ladder is a
   function of the whole profile — and `stations-not-increasing`'s witness
   consequently reported the mutation inert when it is not. A second producer
   of the profile, inside the instrument written to catch second producers.

   So every witness below drives `buildBloomInto` on the mutated module and
   reads what the builder REPORTS: `tipCap` for the terminal, the captured
   grid's own `halfWidth` per row for the outline, `profileU` for the ladder.
   THE FOOT'S THREE ROWS CARRY u = 0 and are dropped by name: they are three
   equal stations by construction, and counting them reads as two
   non-increasing pairs on every tree. */
let REGISTRY_DEFAULTS = null;
function builtOn(M, set = {}, mode = 'export') {
  const acc = new M.MeshBuilder({ exportMode: mode === 'export', captureGrid: true });
  const m = M.buildBloomInto(acc, { ...REGISTRY_DEFAULTS, ...set });
  const footRows = m.petal.footRows;
  return {
    tipCap: m.petal.tipCap,
    halves: m.petal.grid[0].rows.filter((r) => r.row >= footRows).map((r) => r.halfWidth),
    stations: m.petal.profileU.slice(footRows),
    us: m.petal.grid[0].rows.filter((r) => r.row >= footRows).map((r) => r.u),
  };
}
const terminalOf = (M, mode) => builtOn(M, {}, mode).tipCap.lastRowHalf;
const outlineMoved = (M, C, set = {}, mode = 'export') => {
  const a = builtOn(M, set, mode).halves, b = builtOn(C, set, mode).halves;
  if (a.length !== b.length) return Infinity;
  let worst = 0;
  for (let i = 0; i < a.length; i++) worst = Math.max(worst, Math.abs(a[i] - b[i]));
  return worst;
};


/* THE LOBE WITNESS. Drives the module under test to a lobed rim and reads the
   LOCAL POWER of the removed material at a crest and at a sinus off the
   EMITTED half-width — the same quantity L7 measures, but reached here
   through the module directly rather than through the gate, so the witness
   and the assertion have different owners. Returns null when the row builds
   no measurable cut, which the witness clauses report rather than swallow. */
function lobePowers(M) {
  const state = { ...REGISTRY_DEFAULTS, lobeDepth: 0.3, lobeCount: 3, lobeCoverage: 1, lobeCrestShape: 1, lobeNotchShape: 2.5 };
  const acc = new M.MeshBuilder({ exportMode: true });
  let got;
  try {
    const fr = M.footRing(state, acc);
    const ring = fr.slotRings[0][0];
    let slot = null;
    M.buildWhorlInto({ count: fr.slotCount, radius: ring.radius, height: 0, sizeRamp: () => ring.scale,
      angleRamp: () => ring.tiltExtra, phase: ring.phase, placement: state.placement, fan: fr.fan,
      blade: (sl) => { if (!slot) slot = sl; } });
    got = M.petalSurface(state, ring, slot, null, acc).profile;
  } catch { return null; }
  const L = got.lobes;
  if (!L || L.noRoom || L.crestU.length < 2 || !Array.isArray(L.reliefMm)) return null;
  /* THE REMOVED MILLIMETRES, not the cut fraction — and that is the OPPOSITE
     of what session 41 wrote here, because MODEL B changed the law's FORM.
     Under MODEL A the cut was a fraction of the local half-width, so the
     RATIO was exactly `depth * g` with the half-width cancelled and the
     DIFFERENCE carried the outline's taper as a product. Under MODEL B the
     cut is a RELIEF IN MILLIMETRES, constant within a period, so the
     DIFFERENCE is exactly `R_k * g` and it is the RATIO that carries the
     taper — its `1/hb` term is LINEAR in the offset and swamps an e^3 notch.
     See the harness's L7, where the same inversion is recorded. */
  const removed = (u) => got.halfWidthBaseAt(u) - got.halfWidthAt(u);
  /* AND THE SPANS ARE THE FEATURES' OWN PERIODS IN `u`: MODEL B's periods are
     even in ARC and the arc runs through the converging tip, so a uniform
     slice of the window reaches several periods away at one end. */
  const live = (k) => Number(L.reliefMm[k]) > 0;
  const sCand = []; for (let j = 0; j < L.sinusU.length; j++) if (live(j)) sCand.push(j);
  const cCand = []; for (let i = 1; i < L.crestU.length; i++) if (live(i - 1) && live(i)) cCand.push(i);
  if (!sCand.length || !cCand.length) return null;
  const si = sCand[Math.floor(sCand.length / 2)], ci = cCand[Math.floor(cCand.length / 2)];
  const sinusAt = L.sinusU[si], crestAt = L.crestU[ci];
  const spanS = Math.max(1e-6, (L.crestU[si + 1] !== undefined ? L.crestU[si + 1] : L.windowU[1]) - (L.crestU[si] !== undefined ? L.crestU[si] : L.windowU[0]));
  const spanC = Math.max(1e-6, 2 * Math.min(crestAt - L.crestU[ci - 1], (L.crestU[ci + 1] !== undefined ? L.crestU[ci + 1] : L.windowU[1]) - crestAt));
  const ternary = (lo, hi, want) => {
    for (let k = 0; k < 220; k++) {
      const a1 = lo + (hi - lo) / 3, b1 = hi - (hi - lo) / 3;
      const fa = removed(a1), fb = removed(b1);
      if (want === 'min' ? fa <= fb : fa >= fb) hi = b1; else lo = a1;
    }
    return (lo + hi) / 2;
  };
  const powerAt = (uf, dir, span) => {
    const at0 = removed(uf), d1 = span * 1e-3, d2 = span * 1e-2;
    const r1 = Math.abs(removed(uf + dir * d1) - at0), r2 = Math.abs(removed(uf + dir * d2) - at0);
    if (!(r1 > 0 && r2 > r1)) return NaN;
    return Math.log(r2 / r1) / Math.log(10);
  };
  const us = ternary(sinusAt - spanS * 0.35, sinusAt + spanS * 0.35, 'max');
  const uc = ternary(crestAt - spanC * 0.35, crestAt + spanC * 0.35, 'min');
  const notch = powerAt(us, -1, spanS), crest = powerAt(uc, +1, spanC);
  return Number.isFinite(notch) && Number.isFinite(crest) ? { crest, notch } : null;
}

/* THE STEM WITNESS (session 43). Builds a stem on the module under test and
   reads what it EMITTED — the plan's own numbers plus the geometry the builder
   actually put in the accumulator — so the witness and the assertion have
   different owners. Asking the gate whether the gate fired is the circularity
   this table exists to avoid (session 35), and session 41 found the same defect
   twice in one clause by measuring the wrong tree: every witness here reads the
   MUTATED module `M`, never the clean one except to compare against.
   MODE: EXPORT. SAMPLING: every vertex the stem builder emitted. */
const STEM_STATE = () => ({ ...REGISTRY_DEFAULTS, stemLength: 60, stemDiameter: 6 });
function stemFacts(M, state = STEM_STATE()) {
  try {
    const acc = new M.MeshBuilder({ exportMode: true });
    const fr = M.footRing(state, acc);
    const plan = M.stemPlan(state, fr.hub, acc);
    const sacc = new M.MeshBuilder({ exportMode: true });
    const built = M.buildStemInto(sacc, plan);
    const P = sacc.positions;
    let maxOffAxis = 0, zlo = Infinity, zhi = -Infinity;
    for (let i = 0; i < P.length; i += 3) {
      const r = Math.hypot(P[i], P[i + 1]);
      const z = P[i + 2];
      if (z < zlo) zlo = z; if (z > zhi) zhi = z;
      /* how far the ring CENTRES are from the axis: the max and min radius of a
         ring on the axis are equal to its own radius, so an off-axis stem shows
         as a spread between them. */
      if (r > maxOffAxis) maxOffAxis = r;
    }
    const hacc = new M.MeshBuilder({ exportMode: true });
    const hub = M.buildHubInto(hacc, state, fr.hub);
    return { plan, tris: built.tris, maxR: maxOffAxis, zlo, zhi, hub,
             emittedSpan: plan.present && built.emittedTopZ !== undefined ? built.emittedTopZ - plan.rootZ : 0,
             free: plan.present ? plan.rootZ - plan.tipZ : 0,
             rootSpan: plan.present ? plan.topZ - plan.rootZ : 0 };
  } catch (e) { return { threw: e.message }; }
}
/* THE SPHERE'S STEM CHANNEL, as the builder reports it on a state that has
   one — the witnesses above read this rather than the assertion they name,
   which is the circularity the table exists to avoid. */
const SPHERE_STEM_STATE = () => ({ ...REGISTRY_DEFAULTS, placement: 'CONTINUOUS', hubShape: 'SPHERE', petalCount: 8, stemLength: 60, stemDiameter: 6 });
function channelFacts(M, state = SPHERE_STEM_STATE()) {
  try {
    const acc = new M.MeshBuilder({ exportMode: true });
    const built = M.buildBloomInto(acc, state);
    const az = built.slotAzimuths[0] || [];
    return { channel: built.stemOmission || null, built: built.petalsBuilt,
             /* `azCount` is the ARRAY's length and is PRE-SIZED to the descriptor
                count, so it cannot move when a whorl visits fewer slots — which is
                what made `the-omission-renumbers`' witness read 8 against 8 on a
                mutation that genuinely shortened the sequence. `azDefined` counts
                the slots the whorl actually VISITED, which is the quantity. */
             azCount: az.length, azDefined: az.filter((v) => v !== undefined).length,
             firstAz: az[0], joinT: built.stem.joinT, tris: acc.triangleCount };
  } catch (e) { return { threw: e.message }; }
}

/* The minimum distance any emitted stem vertex comes to the axis — 0 only for a
   solid cap's own rim fan, and the bore radius for a hollow one. Read from the
   emitted stream so a bore rule that changed in NAME only cannot pass. */
function stemInnerRadius(M, state = STEM_STATE()) {
  try {
    const acc = new M.MeshBuilder({ exportMode: true });
    const fr = M.footRing(state, acc);
    const plan = M.stemPlan(state, fr.hub, acc);
    const sacc = new M.MeshBuilder({ exportMode: true });
    M.buildStemInto(sacc, plan);
    const P = sacc.positions;
    let best = Infinity;
    for (let i = 0; i < P.length; i += 3) { const r = Math.hypot(P[i], P[i + 1]); if (r < best) best = r; }
    return best;
  } catch { return null; }
}

/* THE EMITTED RELIEF, PER MARGIN SINUS, on a given module — the witness for
   the two L5 mutants below. It reads the module's OWN outline (the base
   half-width less the cut one) rather than the lobe record's `reliefMm`,
   because a mutation inside the guard would move the record and the outline
   together and a witness that read the record would be agreeing with the
   defect (session 39's fourth durable rule). */
/* THE DEEPEST CUT ABOVE THE APEX ENTRY, off the MUTATED module's own
   emitted outline — `shapeAt` against `shapeBaseAt` over [uCap, 1], which is
   exactly the region session 40 proved MODEL A never touches. Built in LIVE
   for `lobeRelief`'s reason: the export floor would mask a cut that the law
   still made. Nothing here reads the lobe RECORD — a witness that asked the
   record whether the record moved would be agreeing with the defect. */
function lobeOutline(M, set) {
  const state = { ...REGISTRY_DEFAULTS, ...set };
  const acc = new M.MeshBuilder({ exportMode: false });
  let got;
  try {
    const fr = M.footRing(state, acc);
    const ring = fr.slotRings[0][0];
    let slot = null;
    M.buildWhorlInto({ count: fr.slotCount, radius: ring.radius, height: 0, sizeRamp: () => ring.scale,
      angleRamp: () => ring.tiltExtra, phase: ring.phase, placement: state.placement, fan: fr.fan,
      blade: (sl) => { if (!slot) slot = sl; } });
    got = M.petalSurface(state, ring, slot, null, acc).profile;
  } catch { return null; }
  if (!got.lobes || got.lobes.noRoom) return null;
  /* `halfWidthBaseAt` is the outline the treatment is SUBTRACTED FROM — the
     same pair `lobeRelief` reads, on the same profile, so the mutated module
     supplies both and neither is a record. */
  const uCap = got.uCap;
  let cutAbove = 0;
  for (let i = 0; i <= 2000; i++) {
    const u = uCap + (1 - uCap) * i / 2000;
    const d = got.halfWidthBaseAt(u) - got.halfWidthAt(u);
    if (d > cutAbove) cutAbove = d;
  }
  return { uCap, cutAbove };
}

function lobeRelief(M, set) {
  /* IN LIVE, AND THAT IS THE POINT. The EXPORT floor is TIP_HALF_MM — the very
     bound the guard exists to keep — so in export a broken guard is INVISIBLE
     on the emitted outline: the cut over-reaches, `max(..., tipFloor)` catches
     it, and the half-width reads exactly 0.8 whatever the law asked for.
     Measured: `guard-reads-the-widest-period` reported "the behaviour did not
     move" against an export build while removing the guard entirely. The LIVE
     mesh floor is 0.15 mm, so there the over-cut shows on the geometry itself.
     This is also why L5's own print-floor clause is stated on the MODE-FREE
     lamina against the record rather than on the emitted export half-width,
     where it would be vacuous. */
  const state = { ...REGISTRY_DEFAULTS, ...set };
  const acc = new M.MeshBuilder({ exportMode: false });
  let got;
  try {
    const fr = M.footRing(state, acc);
    const ring = fr.slotRings[0][0];
    let slot = null;
    M.buildWhorlInto({ count: fr.slotCount, radius: ring.radius, height: 0, sizeRamp: () => ring.scale,
      angleRamp: () => ring.tiltExtra, phase: ring.phase, placement: state.placement, fan: fr.fan,
      blade: (sl) => { if (!slot) slot = sl; } });
    got = M.petalSurface(state, ring, slot, null, acc).profile;
  } catch { return null; }
  const L = got.lobes;
  if (!L || L.noRoom || !L.sinusU.length) return null;
  /* The MODE-FREE lamina at each sinus, and what the outline actually keeps
     there — so "the cut went past the print floor" is readable without
     trusting any record. */
  return L.sinusU.map((u) => {
    const lam = Math.max(got.halfWidthBaseAt(u), M.TIP_HALF_MM);
    return { u, relief: got.halfWidthBaseAt(u) - got.halfWidthAt(u), keeps: lam - (got.halfWidthBaseAt(u) - got.halfWidthAt(u)) };
  });
}

const MUTANTS = [
  /* ===================================================================
     THE LOBE SHAPE (session 41). L7's own two mutations, and its witness is
     the LOCAL POWER the mutated module actually emits — deliberately NOT
     the assertion L7 makes, because asking the gate whether the gate fired
     is the circularity the table exists to avoid (session 35).

     WHY THESE TWO. The retired one-exponent family's error was ONE control
     over TWO quantities; the two failure modes of the replacement are
     exactly the ways that error could come back — the controls exchanged,
     or both features served from one of them. Both leave L0-L6 completely
     unchanged: the count, the two caps, the window, the pitch, the demand
     and the crests-at-the-ends identity are all blind to WHICH SHAPE the
     cut carries, so without L7 either mutation ships silently.
     =================================================================== */
  /* ===================================================================
     L5 — THE PER-PERIOD GUARD AND THE PRINT FLOOR (#221, filed by session 41
     and closed here). L5 is the clause that reddened CI on `380ebee` and the
     clause whose tolerance session 41 then edited, and NOTHING in this table
     named it: the print-floor claim rested on its own reading.

     WHAT #221 PROPOSED AND WHY ONE HALF OF IT IS VACUOUS UNDER MODEL B. Its
     second mutant — record the law's own product at the deepest sinus rather
     than the value AS BUILT, i.e. skip the `max` with the floors — cannot
     fire here: the per-period guard is derived so that
     `lamina(sinus) - relief >= TIP_HALF_MM`, and TIP_HALF_MM dominates the
     live mesh floor, so no floor can ever bind AT a sinus and the two
     expressions are equal on every reachable state. Stating that is better
     than shipping a mutant that reports MUTATION DID NOT APPLY for the rest
     of the project's life. What replaces it is a mutation on the OTHER owner
     L5's expected value is built from: the relief TARGET.
     =================================================================== */
  /* ===================================================================
     L8 — THE MODEL ITSELF, and the reason the clause it fires needed a
     second half. MODEL A terminated the treatment at the apex entry `uCap`,
     and session 40 established as an IDENTITY that the profile above it was
     `Object.is`-equal to a petal with no lobes at all. This mutation puts
     that back — the one change that makes this session's whole premise
     false — and every other L clause is blind to it: the count, the caps,
     the window's LOWER end, the pitch, the demand and the crests-at-the-ends
     identity are all unchanged by where the treatment STOPS.

     THE WITNESS READS THE MUTATED MODULE'S OWN OUTLINE, never the assertion
     it names: the cut above `uCap`, which must go to exactly nothing.

     AND IT IS WHY L8 GAINED A PAGE-SIDE CLAUSE. The table serves its
     mutation to the PAGE; L8's first model clause compares two NODE
     rebuilds, so this mutant would have left both halves of it unmutated
     and passed — the reason the second clause is there. */
  { id: 'the-treatment-terminates-at-the-apex-entry',
    why: 'MODEL A restored — the cut stops at `uCap` and the apex is bit-identical to a petal with no lobes, which is exactly the objection this session exists to answer',
    find: '    const cutMm = (u) => (dAt(u) > treatedHalfMm ? 0 : reliefMm[periodOf(u)] * lobeCutProfile(phaseAt(u), crestShape, notchShape));',
    into: '    const cutMm = (u) => (u >= uCap || dAt(u) > treatedHalfMm ? 0 : reliefMm[periodOf(u)] * lobeCutProfile(phaseAt(u), crestShape, notchShape));', names: ['L8'],
    witness: (M, C) => {
      const set = { lobeDepth: 0.3, lobeCount: 3, lobeCoverage: 0.9, lobeCrestShape: 1, lobeNotchShape: 1 };
      const m = lobeOutline(M, set), c = lobeOutline(C, set);
      if (!m || !c) return 'the lobed row built no cut';
      if (!(c.cutAbove > 1e-6)) return `the clean module cuts only ${c.cutAbove.toExponential(2)} mm above uCap on this row — the mutation is unobservable here`;
      return m.cutAbove < 1e-12
        ? null
        : `the mutant still cuts ${m.cutAbove.toFixed(4)} mm above uCap ${m.uCap.toFixed(4)} (the clean module cuts ${c.cutAbove.toFixed(4)}) — the treatment did not stop at the apex entry`;
    } },
  { id: 'guard-reads-the-widest-period',
    why: 'every period takes the relief the WIDEST point could give instead of its own sinus\'s, so a tooth near the tip cuts past the print floor',
    /* RE-ANCHORED (session 42): the relief's quantisation onto
       LOBE_RELIEF_GRID moved the line this edits, and the table reported
       MUTATION DID NOT APPLY rather than passing falsely — which is the one
       thing that makes a disarmed mutant survivable. Fourth instance here of
       a refactor disarming a mutant; the anchor check is what says so. */
    find: '    const reliefMm = sinusD.map((dd) => Math.floor(Math.min(reliefAskedMm, headroomOf(dd)) / LOBE_RELIEF_GRID) * LOBE_RELIEF_GRID);',
    into: '    const reliefMm = sinusD.map(() => Math.floor(Math.min(reliefAskedMm, headroomAt(uPk)) / LOBE_RELIEF_GRID) * LOBE_RELIEF_GRID);', names: ['L5'],
    witness: (M, C) => {
      const set = { lobeDepth: 0.3, lobeCount: 10, lobeCoverage: 1 };
      const m = lobeRelief(M, set), c = lobeRelief(C, set);
      if (!m || !c) return 'the guard row built no cut';
      const cl = c.filter((x) => x.keeps < c[0].keeps - 1e-9 || x.relief < c[0].relief - 1e-9);
      if (!cl.length) return 'the clean module limits no period on this row — the guard does not bind and the mutation is unobservable';
      const worst = Math.min(...m.map((x) => x.keeps)), was = Math.min(...c.map((x) => x.keeps));
      return worst < M.TIP_HALF_MM - 1e-9 && was >= M.TIP_HALF_MM - 1e-9
        ? null
        : `the mutant keeps ${worst.toFixed(4)} mm at its shallowest sinus where the clean module keeps ${was.toFixed(4)} — the guard did not stop reading each period's own headroom (the print floor is ${M.TIP_HALF_MM})`;
    } },
  { id: 'relief-target-is-not-the-widest-half-width',
    why: 'the relief target is a fraction of the FOOT\'s half-width rather than of the petal\'s widest, so every tooth is the wrong depth while the guard still holds',
    find: '    const peakHalfMm = laminaHalf(uPk);',
    into: '    const peakHalfMm = laminaHalf(ROOT_BLEND_END);', names: ['L5'],
    witness: (M, C) => {
      const set = { lobeDepth: 0.3, lobeCount: 3, lobeCoverage: 0.8 };
      const m = lobeRelief(M, set), c = lobeRelief(C, set);
      if (!m || !c) return 'the lobed row built no cut';
      const dm = Math.max(...m.map((x, i) => Math.abs(x.relief - c[i].relief)));
      return dm > 1e-3 ? null
        : `the emitted relief moved by at most ${dm.toExponential(2)} mm — the target did not change`;
    } },
  { id: 'shapes-swapped', why: 'the crest exponent is applied at the notch and the notch exponent at the crest — the two controls exchanged',
    find: '  const P = Math.pow(r, crest), Q = Math.pow(1 - r, notch);',
    into: '  const P = Math.pow(r, notch), Q = Math.pow(1 - r, crest);', names: ['L7'],
    witness: (M, C) => {
      const m = lobePowers(M), c = lobePowers(C);
      if (!m || !c) return 'the lobed row built no measurable cut';
      return (Math.abs(m.crest - c.notch) < 0.05 && Math.abs(m.notch - c.crest) < 0.05)
        ? null
        : `the emitted powers did not exchange: clean (crest ${c.crest.toFixed(3)}, notch ${c.notch.toFixed(3)}), mutant (crest ${m.crest.toFixed(3)}, notch ${m.notch.toFixed(3)})`;
    } },
  { id: 'shapes-coupled', why: 'both features read the CREST exponent, so one control moves two quantities — the retired family’s own error, returning',
    find: '  const P = Math.pow(r, crest), Q = Math.pow(1 - r, notch);',
    into: '  const P = Math.pow(r, crest), Q = Math.pow(1 - r, crest);', names: ['L7'],
    witness: (M, C) => {
      const m = lobePowers(M), c = lobePowers(C);
      if (!m || !c) return 'the lobed row built no measurable cut';
      return (Math.abs(m.notch - m.crest) < 0.05 && Math.abs(c.notch - c.crest) > 0.5)
        ? null
        : `the notch did not follow the crest: clean (crest ${c.crest.toFixed(3)}, notch ${c.notch.toFixed(3)}), mutant (crest ${m.crest.toFixed(3)}, notch ${m.notch.toFixed(3)})`;
    } },
  /* THE THREE LERP MUTATIONS ARE GONE WITH THE LERP (session 32, PR THREE).
     `inverted-lerp`, `short-cap` and `curved-cap` all bit on
     `return hEntry + (tipFloor - hEntry) * s;`, which the cap demotion
     deleted — the cap is a print-floor clamp now and there is no chord to
     invert, shorten or curve. They are not weakened, they are UNREACHABLE,
     and leaving them would have reported "mutation did not apply" for the
     rest of the project's life. What replaces their coverage: `floored-tip`
     and `wrong-terminal` still hold the terminal, and A6's own three
     mutations below hold the shape the lerp used to own.

     NOTE FOR WHOEVER READS THE OLD COMMENT IN GIT: `curved-cap` was
     described as "the mutation the superellipse ruling will eventually make
     on purpose". It did. That is why it is retired rather than repaired. */
  /* A2 — the terminal is no longer the last row's own value. */
  { id: 'floored-tip', why: 'the last row is not floored, so the emitted terminal is not the declared one',
    find: '      return Math.max(shape, rootBlend(u), tipFloor);',
    into: '      return Math.max(shape, rootBlend(u), u >= 1 ? 0 : tipFloor);', names: ['A2', 'A3'],
    witness: (M) => (terminalOf(M, 'export') === 0 ? null : `the terminal is still ${terminalOf(M, 'export')} mm, not 0`) },
  /* A3 — the mode floor removed, so live converges to a true apex vertex:
     NV columns onto one edge, the retired centre dome's own defect. */
  { id: 'true-apex', why: 'the terminal floor is removed, so the apex collapses to a vertex',
    find: '  const tipFloor = acc && acc.exportMode ? TIP_HALF_MM : TIP_CAP_HALF_MM;',
    into: '  const tipFloor = acc && acc.exportMode ? TIP_HALF_MM : 0;', names: ['A3', 'A4'],
    witness: (M) => (terminalOf(M, 'live') === 0 ? null : `the live terminal is still ${terminalOf(M, 'live')} mm, not 0`) },
  /* A4 — the terminal is a number of its own rather than the mode floor, so
     live and export stop differing where the floor says they should. */
  { id: 'wrong-terminal', why: 'the terminal ignores the mode and is a constant',
    find: '  const tipFloor = acc && acc.exportMode ? TIP_HALF_MM : TIP_CAP_HALF_MM;',
    into: '  const tipFloor = 0.4;', names: ['A4'],
    witness: (M) => (terminalOf(M, 'live') === 0.4 && terminalOf(M, 'export') === 0.4 ? null
      : `the terminal is ${terminalOf(M, 'live')} live / ${terminalOf(M, 'export')} export, not 0.4 in both`) },
  /* A5 — the retired TIP_PLATEAU put back: a RISING ramp max-ed against the
     FALLING core, which waists the blade and widens it back out to the tip.
     Both STL gates are blind to it — watertight, one piece, same triangle
     count — which is the whole reason A5 exists. */
  /* THE AMPLITUDE IS 0.6 — the retired control's OWN MAXIMUM — and it has to
     be, which is a finding rather than a tuning. With the cap unconditional
     and its terminal pinned to the mode floor, the plateau is MOSTLY MASKED:
     the cap owns everything from where the core falls to twice the print
     floor, and the ramp only exceeds the core below that. Measured over the
     four rows here: at 0.30 and 0.45 it produces NO waist anywhere; at 0.60 it
     produces one on the default taper only; on taper 0.6 and on the narrowest
     petal it produces none at any amplitude up to 0.9. So A5's coverage
     against "the retired term comes back" is narrower than it was before the
     cap became unconditional — its stronger witness is `inverted-lerp`, which
     fires it on every row. Do not weaken this to 0.3 to make it "cleaner":
     that is the version that fires nothing. */
  { id: 'plateau-returns', why: 'the retired TIP_PLATEAU is back at its own former maximum, max-ed with the core',
    /* THE FIND STRING MOVED when the tip law landed (session 32): the CORE
       term now reads `tipLaw(u)` rather than `core(u)`. Recorded because the
       control caught it as "MUTATION DID NOT APPLY" rather than as a false
       pass, which is the one failure mode that makes a disarmed mutant
       survivable — session 34's own lesson, arriving here. */
    find: "    { name: 'CORE', from: stalk ? stalk.until : 0, to: 1, at: (u) => halfW * tipLaw(u) },",
    into: "    { name: 'CORE', from: stalk ? stalk.until : 0, to: 1, at: (u) => halfW * tipLaw(u) },\n    { name: 'MUTANT_PLATEAU', from: 0, to: 1, at: (u) => 0.6 * halfW * clamp((u - uPk) / (1 - uPk), 0, 1) },",
    names: ['A5'],
    witness: (M, C) => {
      const w = outlineMoved(M, C);
      return w > 1e-9 ? null : `the emitted plan outline is identical to the clean tree (worst ${w.toExponential(2)} mm)`;
    } },
  /* A6 — THE LAW DRAWS A DIFFERENT EXPONENT FROM THE ONE ASKED. The blend is
     `(1 - s^n)^(1/n)`; squaring the inner exponent leaves a perfectly
     plausible tip — still convex, still monotone, still watertight, still the
     same triangle count — that simply is not the curve the control names.
     Both STL gates are blind to it by construction. */
  { id: 'wrong-exponent', why: 'the superellipse is built at n^2 rather than n',
    find: '    return Math.pow(Math.max(0, 1 - Math.pow(s, n)), 1 / n);',
    into: '    return Math.pow(Math.max(0, 1 - Math.pow(s, n * n)), 1 / (n * n));', names: ['A6'],
    witness: (M, C) => {
      const w = outlineMoved(M, C);
      return w > 1e-9 ? null : `the emitted plan outline is identical to the clean tree (worst ${w.toExponential(2)} mm)`;
    } },
  /* A6 — the law is fitted THROUGH the print floor rather than on the active
     branch. This is the session's own fourth-instance bug reproduced as a
     mutation: it does not change the geometry at all, it changes where the
     law stops being the active branch, so a gate that fits through the floor
     reads an exponent that is not the asked one. */
  { id: 'law-past-the-floor', why: 'the tip floor is raised so it owns a large share of the apex',
    find: '  const tipFloor = acc && acc.exportMode ? TIP_HALF_MM : TIP_CAP_HALF_MM;',
    into: '  const tipFloor = (acc && acc.exportMode ? TIP_HALF_MM : TIP_CAP_HALF_MM) * 3;', names: ['A4'],
    witness: (M, C) => (Math.abs(terminalOf(M, 'export') - 3 * terminalOf(C, 'export')) < 1e-12 ? null
      : `the terminal is ${terminalOf(M, 'export')} mm, not 3x the clean ${terminalOf(C, 'export')}`) },
  /* A7 — the ladder resamples the root blend. The held rows stop being the
     uniform ones, which moves a boundary footRing() owns. Watertight, one
     piece, identical triangle count; nothing else here can see it. */
  { id: 'ladder-eats-the-base', why: 'the ladder redistributes every row, including the ones the root blend owns',
    find: 'export const HELD_ROWS = Math.floor(ROOT_BLEND_END * NU);',
    /* A7 ONLY, and the claim was corrected by the control rather than the
       check by the claim: with the held count at 0 the ladder still respects
       its gap bound, so A8 is RIGHT not to fire here. */
    into: 'export const HELD_ROWS = 0;', names: ['A7'],
    witness: (M, C) => {
      const a = builtOn(M).stations, b = builtOn(C).stations;
      const held = Math.floor(0.30 * C.BLADE_ROWS);
      for (let i = 0; i < held; i++) if (!Object.is(a[i], b[i])) return null;
      return `every station the root blend holds is unmoved (first ${held} of ${a.length})`;
    } },
  /* A7 — two rows land on one station. The de-duplication pass is removed, so
     a ladder that saturates emits a zero-length panel.
     IT NEEDS THE BUCKLED ROW, and that is a finding rather than a detail:
     measured over 288 unbuckled states the pass never once fires, so on the
     taper rows alone this mutation is a no-op and reported SILENT.

     AND THE ROW HAS TO SATURATE IN *LIVE* MODE, which is the second half of
     the same finding. `__bloomMetrics()` reports the LIVE build, so a state
     that only saturates under the export floor is invisible to this harness:
     the first row tried here (amplitude 0.6, f 1, exponent 1.5) produced one
     non-increasing pair in export and NONE in live, and the mutation was
     reported silent while being perfectly real. Amplitude 0.30 at f 1 and
     exponent 1.00 saturates in live, which is what this row is. */
  { id: 'stations-not-increasing', why: 'the strictly-increasing pass is removed',
    find: '  for (let i = 1; i < NU; i++) if (out[i] <= out[i - 1]) out[i] = Math.min(1, out[i - 1] + 1e-5);',
    into: '  for (let i = 1; i < NU; i++) if (false) out[i] = Math.min(1, out[i - 1] + 1e-5);', names: ['A7'],
    /* THE ONLY WITNESS THAT NEEDS A SATURATING BUCKLED LADDER, for the reason
       the comment above already records: over 288 unbuckled states the pass
       never fires, so on a plain profile this edit is a no-op and a witness
       that did not buckle would report a defect that is not there. */
    /* THE WITNESS ASSERTS BOTH DIRECTIONS: the CLEAN ladder is strictly
       increasing (or the repair is not doing its job and nothing here can be
       read) and the UNREPAIRED one is not. That is the pass's own contract,
       and it is only assertable on a row where the pass actually engages.

       THE PASS IS RARELY ENGAGED: swept at NU 56 over 9,072 buckled states,
       2,232 move the ladder at all when the repair is removed — worst 5.2e-5
       in u — and only 159 produce a non-increasing pair. So this mutant is a
       no-op on the taper rows by construction and needs the one row above. */
    witness: (M, C) => {
      const st = { buckleAmp: 0.3, buckleFreq: 1 };
      const nonIncr = (arr) => { let n = 0; for (let i = 1; i < arr.length; i++) if (arr[i] <= arr[i - 1]) n++; return n; };
      const a = nonIncr(builtOn(M, st, 'live').stations), b = nonIncr(builtOn(C, st, 'live').stations);
      if (b !== 0) return `the CLEAN ladder already has ${b} non-increasing pairs — the repair is not doing its job and this mutant cannot be read`;
      return a > 0 ? null : 'the unrepaired ladder is still strictly increasing — the pass is inert on this state and the mutant proves nothing';
    } },
  /* ===================================================================
     A7 — THE SEAM CLEARANCE (session 38). Four mutations, one per clause the
     floor added, because a clause with no mutation that fires it is a
     computation nobody has shown can produce a verdict.

     EVERY ONE OF THEM NEEDS `THE SEAM FLOOR BINDING` IN `ROWS`, and that is
     this table's own durable rule (session 35: a row chosen against a branch
     must state which branch and assert that it still reaches it). The four
     taper rows all sit at the shipping tilt of 25 degrees, where the
     clearance is 0.2536 mm against a first station at 0.625 mm — the floor
     does not bind, the new branch is never entered, and all four of these
     would report SILENT on them. Each witness therefore drives the binding
     state itself and asserts the mutated module's own behaviour moved.
     =================================================================== */
  /* A7 — the clearance is gone, so the first blade row goes back to row 1
     and the foot-to-blade offset fold returns (measured on main: 376 pairs
     on a SINGLE layer at tilt 75, length 20, sheet 2.4). */
  { id: 'seam-floor-removed', why: 'the foot-to-blade clearance is zero, so the first blade row sits on the kink',
    find: '  return seamHalfThicknessMm(sheetMm) * Math.sin(Math.max(0, Math.min(turnRad, Math.PI / 2)));',
    into: '  return 0 * seamHalfThicknessMm(sheetMm) * Math.sin(Math.max(0, Math.min(turnRad, Math.PI / 2)));', names: ['A7'],
    witness: (M, C) => {
      const t = 75 * Math.PI / 180;
      const a = M.seamClearanceMm(t, 2.4), b = C.seamClearanceMm(t, 2.4);
      if (!(a === 0)) return `the mutated clearance is ${a} mm at a 75 degree kink, not 0`;
      if (!(b > 0)) return `the CLEAN clearance is ${b} mm — this mutant cannot be read`;
      return M.seamLatticeStep(a, 20) === 1 && C.seamLatticeStep(b, 20) > 1 ? null
        : `the lattice step is ${M.seamLatticeStep(a, 20)} on the mutant and ${C.seamLatticeStep(b, 20)} on the clean tree — the floor did not stop binding`;
    } },
  /* A7 — THE FIRST DRAFT, kept as a mutation because Eva ruled against it by
     name: floor each station instead of translating the lattice, and let the
     strictly-increasing repair separate the survivors. It PILES — every row
     the floor swallowed ends up 1e-5 apart against the floor — which trades
     this defect for another and measured WORSE than main. */
  { id: 'seam-piles-instead-of-redistributing', why: 'the held rows are floored individually rather than translated as a lattice',
    find: '    ? Array.from({ length: held }, (_, i) => (mUsed + i) / NU)',
    into: '    ? Array.from({ length: held }, (_, i) => Math.max((i + 1) / NU, mUsed / NU))', names: ['A7'],
    witness: (M, C) => {
      const set = { petalTilt: 75, petalLength: 20, sheetThickness: 2.4 };
      const gap = (T) => { const st = builtOn(T, set).stations; let g = Infinity;
        for (let i = 1; i < Math.floor(0.30 * T.BLADE_ROWS); i++) g = Math.min(g, st[i] - st[i - 1]); return g; };
      const a = gap(M), b = gap(C);
      if (!(b > 1e-3)) return `the CLEAN ladder's tightest held gap is already ${b} — this mutant cannot be read`;
      return a < 1e-3 ? null : `the mutated ladder's tightest held gap is ${a}, not a pile against the floor`;
    } },
  /* A7 — the clearance starts reading the sheet as authored rather than as
     the export floors it. Row positions are topology; a ladder that moves
     with the mode splits a cleft's panels at a different row (session 32's
     own defect, which is why `ladderHalfAt` reads the export floor in both
     modes). ONE OWNER makes this a one-line mutation AND makes it visible in
     the live gate at all. */
  { id: 'seam-reads-the-live-sheet', why: 'the clearance is built on the authored sheet rather than the export floor',
    find: 'export function seamHalfThicknessMm(sheetMm) { return Math.max(sheetMm, MIN_FEATURE_MM) / 2; }',
    into: 'export function seamHalfThicknessMm(sheetMm) { return sheetMm / 2; }', names: ['A7'],
    /* THE WITNESS NAMES THE ONLY SHEET THAT CAN SEE IT. On the default 1.20
       and on the 2.40 row above, `max(sheet, MIN_FEATURE_MM)` IS the sheet
       and this edit changes nothing at all — so the witness asks about 0.60,
       and the row list carries a 0.60 state for the assertion to bite on. */
    witness: (M, C) => {
      if (M.seamHalfThicknessMm(1.2) !== C.seamHalfThicknessMm(1.2)) return 'the mutation moved the DEFAULT sheet, which it must not — the export floor does not bind there';
      return M.seamHalfThicknessMm(0.6) === 0.3 && C.seamHalfThicknessMm(0.6) === 0.5 ? null
        : `the half-thickness on a 0.6 mm sheet is ${M.seamHalfThicknessMm(0.6)} on the mutant and ${C.seamHalfThicknessMm(0.6)} on the clean tree — the export floor is still being read`;
    } },
  /* A7 — the clearance is computed for an angle this build does not have.
     petalSurface() derives the seam turn as |tilt|; the builder re-reads it
     off the two EMITTED frames and reports the difference of the cosines,
     which is exactly 0 on every hub shape measured. Halving the owner's
     angle leaves a perfectly plausible ladder and a clearance sized for a
     kink that is not there. */
  { id: 'seam-turn-is-not-the-kink', why: 'the clearance is built on half the turn the frames actually make',
    find: '  const seamTurnRad = Math.abs(tilt);',
    into: '  const seamTurnRad = Math.abs(tilt) / 2;', names: ['A7'],
    witness: (M, C) => {
      const set = { petalTilt: 75, petalLength: 20, sheetThickness: 2.4 };
      const turn = (T) => { const acc = new T.MeshBuilder({ exportMode: true });
        return T.buildBloomInto(acc, { ...REGISTRY_DEFAULTS, ...set }).petal.bladeLadder.seamTurnDeg; };
      const a = turn(M), b = turn(C);
      return Math.abs(a - b / 2) < 1e-9 && Math.abs(b - 75) < 1e-9 ? null
        : `the seam turn is ${a} degrees on the mutant against ${b} on the clean tree — the owner's angle did not move`;
    } },
  /* A8 — the buckle's bar stops being read. The ladder takes rows the wave
     needs, which DOUBLES the buckle's along-margin chord error at the
     frequency ceiling (measured: 0.2808 -> 0.5626 mm) while every other gate
     here stays green. */
  { id: 'ladder-ignores-the-buckle', why: 'the gap bound stops deriving from the buckle frequency',
    find: '  if (!buckleFreq) return LADDER_MAX_GAP_FACTOR;',
    into: '  if (true) return LADDER_MAX_GAP_FACTOR;', names: ['A8'],
    witness: (M, C) => (M.ladderGapFactor(7) === M.LADDER_MAX_GAP_FACTOR && C.ladderGapFactor(7) < C.LADDER_MAX_GAP_FACTOR ? null
      : `ladderGapFactor(7) is ${M.ladderGapFactor(7)} on the mutant and ${C.ladderGapFactor(7)} on the clean tree — the bound still reads the frequency`) },
  /* A8 — THE LEADING GAP COMES BACK INTO THE LADDER'S OWN MEASURE, which is
     `main`'s own defect restored (session 39). That gap is the seam-to-first-
     row offset, placed by the clearance law and pinned by A7, and `mix()`
     cannot move it — so counting it makes the cap unsatisfiable on every
     seam-shifted row, the bisection lands on 0 and the turning-rate ladder is
     thrown away. The blade is then EXACTLY uniform: watertight, one piece,
     the right triangle count, inside every bound, and invisible to every
     assertion here until A8 gained its blend clause. The SEAM FLOOR BINDING
     row is what this bites on; at the shipping tilt the seam step is 1 and
     the mutation is a no-op. */
  { id: 'widest-counts-the-seam-offset', why: 'the ladder measures the structural seam offset as its own redistribution',
    find: '  const widest = (r) => { let m = 0; for (let i = 1; i < NU; i++) m = Math.max(m, r[i] - r[i - 1]); return m; };',
    into: '  const widest = (r) => { let m = r[0]; for (let i = 1; i < NU; i++) m = Math.max(m, r[i] - r[i - 1]); return m; };', names: ['A8'],
    /* THE WITNESS IS THE BLEND THE BUILDER DECLARES, never the assertion A8
       makes: the mutant must collapse it to 0 where the clean tree keeps a
       real ladder. Read off buildBloomInto's own report on the seam row. */
    witness: (M, C) => {
      const set = { petalTilt: 75, petalLength: 20, sheetThickness: 2.4 };
      const blend = (T) => { const acc = new T.MeshBuilder({ exportMode: true });
        return T.buildBloomInto(acc, { ...REGISTRY_DEFAULTS, ...set }).petal.bladeLadder.blend; };
      const a = blend(M), b = blend(C);
      return a === 0 && b > 0 ? null
        : `the blend is ${a} on the mutant against ${b} on the clean tree — the ladder was not discarded`;
    } },
  /* ===================================================================
     THE STEM FAMILY (session 43) — ST0-ST6. Added because this project's own
     rule says so: "re-run the mutant table when an assertion family is added",
     and a family seen red only in the degenerate state where its subject does
     not exist is a family nobody has watched fail on a DEFECT.

     WHY THESE SEVEN. Each is a way the stem could be built wrong while still
     exporting watertight and as ONE connected piece — which is the whole
     argument for the family existing. Every one of them leaves the boundary
     census, the flood fill and the triangle-count identity completely
     unchanged, so without ST0-ST6 each ships silently. */
  /* RE-ANCHORED, NOT DELETED (the sphere-stem session). Its old edit —
     `stemEligible` returning true — is what SHIPPED the moment Eva ruled that
     petals the stem would pass through are not built, so a mutant whose
     mutation is the shipped code tests nothing. The defect it names is still
     reachable and is now the OTHER direction: the geometry keeping the retired
     SPHERE arm while the registry has dropped it, so the controls SHOW under
     SPHERE and build nothing — hidden-and-not-inert with the two halves
     swapped, and still invisible to every other family here. */
  { id: 'stem-present-disagrees-with-the-registry', why: "the geometry still refuses a stem under SPHERE while the registry shows the controls there — the controls move nothing, which is the mirror of the hidden-and-NOT-inert defect PP7 and JS0 exist for",
    find: 'export function stemIsAbsent(state) { return !state.stemLength; }',
    /* ST7 IS NOT ON THIS LIST, AND THE CLAIM WAS WRONG RATHER THAN THE CLAUSE
       BLIND. `stemAssertions` compares the CONTROL's length against the
       builder's own `m.stem` and RETURNS on a disagreement, so a geometry that
       refuses the stem outright is caught by ST1 before ST7 is ever reached —
       and there is no channel left for ST7 to have an opinion about. ST0 (the
       two-statement guard) and ST1 are the witnesses; ST7 is about a channel
       that EXISTS. Measured: it fired ST0 and ST1 and stayed silent on ST7. */
    into: 'export function stemIsAbsent(state) { return !state.stemLength || sphereMode(state); }', names: ['ST0', 'ST1'],
    witness: (M, C) => { const sph = { ...REGISTRY_DEFAULTS, placement: 'CONTINUOUS', hubShape: 'SPHERE', stemLength: 60 };
      const m = M.stemIsAbsent(sph), c = C.stemIsAbsent(sph);
      return (m === true && c === false) ? null : `stemIsAbsent under SPHERE reads ${m} on the mutant and ${c} on the clean tree — the predicate did not move`; } },

  /* ===================================================================
     THE SPHERE'S STEM CHANNEL (the sphere-stem session) — ST7-ST9. Each is a
     way the omission could be wrong while the export stays watertight, one
     piece, and the right triangle count for whatever it built. */
  { id: 'the-stem-channel-never-fires', why: 'the channel is computed and then thrown away, so every petal is built and the stem passes straight through the pole-most ones — watertight, one connected piece, and the only thing wrong with it is the picture',
    find: '  if (!plan || !plan.present || !fr.sphereMode) return null;',
    into: '  if (!plan || !plan.present || !fr.sphereMode || fr.sphereMode) return null;', names: ['ST7', 'ST9'],
    witness: (M, C) => { const m = channelFacts(M), c = channelFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.channel === null && c.channel !== null && m.built > c.built) ? null
        : `the mutant reports ${m.channel ? 'a channel' : 'no channel'} and built ${m.built} petals against the clean tree's ${c.built} — the omission did not stop`; } },

  { id: 'the-omission-renumbers', why: 'the whorl is run at the SURVIVING count instead of the asked-for one, so every petal takes the descriptor and the azimuth of a slot that is not its own — Eva\'s "do not impact anything else" broken in the one way no STL check can see',
    find: '      count: fr.rings.length,\n      radius: (i) => fr.rings[i].radius,',
    into: '      count: fr.rings.length - (omission ? omission.omitted.length : 0),\n      radius: (i) => fr.rings[i].radius,', names: ['ST7', 'ST8', 'J1', 'Z1'],
    witness: (M, C) => { const m = channelFacts(M), c = channelFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      /* MEASURED on this tree at 8 petals x a 6 mm stem: the clean tree defines
         8 azimuths and builds 6 petals; the mutant defines 6 and builds 4, while
         the ARRAY stays 8 long on both. So the witness reads what the whorl
         VISITED and the builder EMITTED, never the pre-sized array. */
      return (m.azDefined < c.azDefined && m.built < c.built && m.azCount === c.azCount) ? null
        : `the mutant defined ${m.azDefined} azimuths and built ${m.built} petals against the clean tree's ${c.azDefined} and ${c.built} — the sequence was not shortened`; } },

  { id: 'the-channel-clearance-is-typed', why: 'the printable gap the channel clears is replaced by a twentieth of a millimetre, so petals are kept that the stem passes within a gap no process can make',
    find: 'export const STEM_PETAL_CLEARANCE_MM = MIN_FEATURE_MM;',
    into: 'export const STEM_PETAL_CLEARANCE_MM = 0.05;', names: ['ST7', 'ST9'],
    witness: (M, C) => { const m = channelFacts(M), c = channelFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.channel && c.channel && m.channel.clearanceMm < c.channel.clearanceMm) ? null
        : `the mutant declares a clearance of ${m.channel && m.channel.clearanceMm} against ${c.channel && c.channel.clearanceMm} — it did not move`; } },

  { id: 'the-channel-reads-one-mode', why: 'the channel measures the EXPORT build only, so the set stops being the union and a petal that collides in LIVE alone is kept — the mode-dependent topology this project has refused five times',
    find: "      for (const m of ['live', 'export']) {",
    into: "      for (const m of ['export']) {", names: ['ST7'],
    witness: (M, C) => { const m = channelFacts(M), c = channelFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const ml = m.channel && m.channel.approach.live.filter((x) => Number.isFinite(x)).length;
      const cl = c.channel && c.channel.approach.live.filter((x) => Number.isFinite(x)).length;
      return (ml === 0 && cl > 0) ? null : `the mutant measured ${ml} live approaches against the clean tree's ${cl} — both modes still ran`; } },

  /* THE MERIDIAN PACKING MARGIN'S OWN MUTANT. The stem has TWO radii and the
     channel is about the OUTSIDE of it, so reading the bore is the slip that
     is actually available here — and it produces a perfectly plausible larger
     margin on a row where nothing else moves at all: the same petals, the same
     triangles, the same omitted set, one telemetry number a reader would act
     on reading 2.71x where the geometry has 2.20x. Only ST7's rebuild from the
     HUB BUILDER's sphere and the STEM BUILDER's own widest EMITTED vertex can
     see it; every other clause in the family reads the channel's own report. */
  { id: 'the-meridian-margin-reads-the-bore', why: "the stem's footprint on the sphere is taken from the BORE radius instead of the outer one, so the margin the read-out prints is measured against a stem narrower than the one that is built",
    find: '  const capArcMm = Rd * (Math.PI - Math.asin(Math.min(1, plan.outerR / Rd)));',
    into: '  const capArcMm = Rd * (Math.PI - Math.asin(Math.min(1, plan.boreR / Rd)));', names: ['ST7'],
    witness: (M, C) => { const m = channelFacts(M), c = channelFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const mm = m.channel && m.channel.meridian, cm = c.channel && c.channel.meridian;
      if (!mm || !cm || mm.margin === null || cm.margin === null) return `the witness found no meridian margin to compare (mutant ${JSON.stringify(mm)}, clean ${JSON.stringify(cm)})`;
      return (mm.margin > cm.margin + 0.1) ? null : `the mutant reports a margin of ${mm.margin} against the clean tree's ${cm.margin} — the cap edge did not move`; } },

  { id: 'the-sphere-takes-the-plate-join', why: "the hub-to-stem join is derived for a PLATE and applied to a closed shell, so the plan declares a thickening the sphere arm of buildHubInto never builds — a plan describing geometry nobody emitted",
    find: '  const joinT = sphere ? hubT : stemJoinThickness(outerR, hubT);',
    into: '  const joinT = stemJoinThickness(outerR, hubT);', names: ['ST5'],
    witness: (M, C) => { const m = channelFacts(M), c = channelFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.joinT > c.joinT + 1e-9) ? null : `the plan declares a join of ${m.joinT} mm against ${c.joinT} on the clean tree — it did not move`; } },

  { id: 'stem-declared-and-not-built', why: 'the builder returns before emitting anything, while the plan still declares a stem',
    find: '  if (!plan.present) return { tris: 0 };',
    into: '  if (!plan.present || plan.present) return { tris: 0 };', names: ['ST1'],
    witness: (M) => { const f = stemFacts(M); return f.threw ? `the witness threw: ${f.threw}`
      : (f.tris === 0 && f.plan.present ? null : `the stem still emitted ${f.tris} triangles`); } },

  { id: 'stem-off-the-axis', why: 'every stem ring is offset from the axis by a millimetre — watertight, one piece, the same triangle count',
    find: '    const th = (k * TAU) / N; return [rad * Math.cos(th), rad * Math.sin(th), z];',
    into: '    const th = (k * TAU) / N; return [rad * Math.cos(th) + 1, rad * Math.sin(th), z];', names: ['ST2'],
    witness: (M, C) => { const m = stemFacts(M), c = stemFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (Math.abs(m.maxR - c.maxR) > 0.5) ? null : `the emitted stem's furthest vertex is ${m.maxR} against the clean tree's ${c.maxR} — it did not move off the axis`; } },

  { id: 'stem-runs-the-wrong-length', why: 'the free stem is built at 90% of the length the control asked for',
    find: '  const tipZ = rootZ - lengthMm;',
    into: '  const tipZ = rootZ - lengthMm * 0.9;', names: ['ST2'],
    witness: (M, C) => { const m = stemFacts(M), c = stemFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (Math.abs(m.free - c.free) > 1) ? null : `the emitted free length is ${m.free} against ${c.free} — it did not change`; } },

  { id: 'bore-is-not-evas-rule', why: "the bore is half the outer radius instead of `max(0, outerRadius - 1.5)` — a wall that is no longer Eva's stated 1.5 mm",
    find: 'export function stemBoreRadius(outerR) { return Math.max(0, outerR - STEM_MIN_WALL_MM); }',
    into: 'export function stemBoreRadius(outerR) { return outerR / 2; }', names: ['ST3'],
    /* PROBED ON THE SOLID ROW, NOT THE DEFAULT STEM STATE, and that is a
       measured correction rather than a preference: at `stemDiameter` 6 the
       outer radius is 3, and `max(0, 3 - 1.5)` and `3 / 2` are the SAME 1.5 —
       so on its first run this witness reported the behaviour had not moved
       when the edit was live and correct. A mutation is invisible wherever the
       law it replaces happens to agree with it, and the probe has to be chosen
       to separate them. At 3 mm the clean tree is SOLID (bore 0) and the mutant
       is HOLLOW (bore 0.75), which is also a row this table actually runs. */
    witness: (M, C) => { const st = { ...STEM_STATE(), stemDiameter: 3 };
      const m = stemInnerRadius(M, st), c = stemInnerRadius(C, st);
      if (m === null || c === null) return 'the witness could not build a stem';
      return (Math.abs(m - c) > 0.1) ? null : `the emitted inner radius is ${m} against ${c} — the bore did not move`; } },

  { id: 'hairline-root', why: 'the stem STARTS at the hub underside instead of running THROUGH the slab — the overlap becomes a touch, and no boundary census or flood fill can see the difference',
    find: '  const zs = [plan.topZ, ...plan.stations.map((mm) => plan.rootZ - mm)];',
    into: '  const zs = [plan.rootZ, ...plan.stations.map((mm) => plan.rootZ - mm)];', names: ['ST4'],
    witness: (M, C) => { const m = stemFacts(M), c = stemFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const ms = m.emittedSpan, cs = c.emittedSpan;
      return (ms < 1e-9 && cs > 0.5) ? null : `the emitted root spans ${ms} mm against the clean tree's ${cs} — it still runs through the slab`; } },

  { id: 'join-is-not-the-law', why: "the join's thickness is 1.4x what the stem's own section asks for — thicker than the law, and every shape check below it still passes",
    find: '  return Math.max(hubT, needed);',
    into: '  return Math.max(hubT, needed * 1.4);', names: ['ST5'],
    witness: (M, C) => { const m = stemFacts(M), c = stemFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (Math.abs(m.plan.joinT - c.plan.joinT) > 0.1) ? null : `the join thickness is ${m.plan.joinT} against ${c.plan.joinT} — it did not move`; } },

  { id: 'join-reaches-past-where-it-says-it-stops', why: 'the profile drops its floor at the hub\'s own thickness, so the thickening runs all the way to the rim instead of blending out at the radius the owner declares',
    find: '  return Math.max(hubT, joinT * Math.sqrt(Math.log(hubR / rr) / denom));',
    into: '  return hubT + joinT * Math.sqrt(Math.log(hubR / rr) / denom);', names: ['ST5'],
    witness: (M, C) => { const m = stemFacts(M), c = stemFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const mu = m.hub.underside, cu = c.hub.underside;
      if (!mu || !cu || mu.length !== cu.length) return 'the two undersides are not comparable';
      let worst = 0; for (let i = 0; i < mu.length; i++) worst = Math.max(worst, Math.abs(mu[i][1] - cu[i][1]));
      return worst > 0.01 ? null : `the emitted underside moved by at most ${worst} mm — the profile did not change`; } },

  { id: 'the-join-grows-upward-into-the-feet', why: "the thickening is split either side of the mid-surface, so the hub's TOP face — the one the feet sit on and J1/J4a read — moves with the stem's diameter",
    find: '  const zTop = t / 2, zBot = -t / 2;',
    into: '  const zTop = t / 2 + (joinActive ? (plan.joinT - t) / 2 : 0), zBot = -t / 2;', names: ['ST6'],
    witness: (M, C) => { const m = stemFacts(M), c = stemFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (Math.abs(m.hub.topFaceZ - c.hub.topFaceZ) > 0.05) ? null
        : `the hub's top face is at ${m.hub.topFaceZ} against the clean tree's ${c.hub.topFaceZ} — it did not move`; } },
];

/* Rows chosen so every mutation has something to bite on. */
const ROWS = [
  /* THE APEX HAS NO CONTROL, so these drive the cap through the things that
     DO reach it: the two taper exponents (which decide where the cap enters
     and how wide it starts) and the petal width (which decides how much of
     the tip the mode floor is). Both cap-entry rules are covered — the 0.80
     clamp at a broad falling limb, the crossing at a steep one. */
  { label: 'the shipping default', set: [] },
  /* A LOBED ROW, so L7 has an outline to measure. Both of its measurements
     must RUN on it, which needs an UNCLAMPED depth (a clamped one holds the
     sinus on the print floor, where the removed material is the floor's and
     not the law's) and an INTERIOR crest, which exists only from two lobes
     up. The two exponents are set APART so a swap is observable: a mutation
     that exchanged them on equal values would be undetectable by
     construction. */
  { label: 'a lobed rim, the two shape exponents apart (crest 1.00, notch 2.50, 3 lobes at 0.30x)',
    set: [{ id: 'lobeDepth', value: '0.3' }, { id: 'lobeCount', value: '3' },
          { id: 'lobeCoverage', value: '1' },
          { id: 'lobeCrestShape', value: '1' }, { id: 'lobeNotchShape', value: '2.5' }] },
  /* THE SEAM FLOOR BINDING, and it is a SINGLE LAYER on purpose: layer count
     was the proxy the brief mistook for the cause, and this row is the
     measured counter-example — tilt 75, length 20, sheet 2.4 folds 376 pairs
     on main with no layers involved at all. At the shipping tilt the
     clearance is 0.2536 mm against a first station at 0.625 mm, so without
     this row all four seam mutations are no-ops. */
  /* A LOBED ROW WHERE THE PER-PERIOD GUARD BINDS (session 42). At three
     teeth over the full clock every period has room, so `guard-reads-the-
     widest-period` is a no-op there; at ten the apex-most periods are
     relief-limited and the mutation cuts them past the print floor. */
  { label: 'a lobed rim where the PER-PERIOD guard binds (10 teeth at full coverage, 0.30x)',
    set: [{ id: 'lobeDepth', value: '0.3' }, { id: 'lobeCount', value: '10' }, { id: 'lobeCoverage', value: '1' }] },
  { label: 'the seam floor binding (tilt 75, length 20, sheet 2.4 — a SINGLE layer)',
    set: [{ id: 'petalTilt', value: '75' }, { id: 'petalLength', value: '20' }, { id: 'sheetThickness', value: '2.4' }] },
  /* THE EXPORT FLOOR BINDING TOO, and it is a second row rather than a wider
     one because the two floors bind in opposite directions. `MIN_FEATURE_MM`
     only raises a sheet UNDER 1.00 mm, so on the 1.20 mm default — and on the
     2.40 mm row above — `max(sheet, MIN_FEATURE_MM)` IS the sheet and
     `seam-reads-the-live-sheet` is a no-op. Measured: that mutant fired
     NOTHING until this row existed. 0.60 is the control's own minimum. */
  { label: 'the seam floor binding on a sheet UNDER the export floor (0.60, tilt 75, length 20)',
    set: [{ id: 'petalTilt', value: '75' }, { id: 'petalLength', value: '20' }, { id: 'sheetThickness', value: '0.6' }] },
  { label: 'taper 0.60 — the cap entry at the 0.80 clamp', set: [{ id: 'petalTipTaper', value: '0.6' }] },
  { label: 'taper 4 — the cap entry from the crossing', set: [{ id: 'petalTipTaper', value: '4' }] },
  { label: 'the narrowest petal (width 8, taper 4)', set: [{ id: 'petalWidth', value: '8' }, { id: 'petalTipTaper', value: '4' }] },
  /* THE TWO LADDER ROWS (session 32). The taper rows above drive the OUTLINE;
     neither of the ladder's two arms is reachable from them. `A0.6 f1 n1.5`
     is the one state measured to saturate the station measure, so it is what
     `stations-not-increasing` bites on; `A0.2 f7` is the frequency ceiling,
     the only place the buckle-derived gap bound is not simply the constant,
     so it is what `ladder-ignores-the-buckle` bites on. */
  /* THE EXPONENT CAME OFF THIS ROW AT NU 56 (session 35), and the one value is
     the whole finding. The row was pinned to `petalTipShape 1` when it was
     chosen at NU 28; at NU 56 that is precisely the value where the ladder
     stops saturating, so the de-duplication pass had nothing to do here and
     `stations-not-increasing` named A7 while firing nothing — red on `main`,
     and red because a row count changed underneath a state that was chosen
     against it. Swept at NU 56: 159 of 9,072 buckled states DO make the
     unrepaired ladder non-increasing, and the one nearest the shipped defaults
     is this row with the exponent simply left alone. */
  { label: 'the ladder saturated in LIVE mode (buckle 0.30 at f 1, the default exponent)', set: [{ id: 'buckleAmp', value: '0.3' }, { id: 'buckleFreq', value: '1' }] },
  { label: 'the buckle at its frequency ceiling (0.20 at f 7 — the bound is exactly uniform)', set: [{ id: 'buckleAmp', value: '0.2' }, { id: 'buckleFreq', value: '7' }] },
  /* THE STEM ROWS (session 43). Two, and the pair is the point: the hollow one
     has Eva's bore OPEN and the join well clear of the hub's own thickness; the
     solid one closes the bore at her 3 mm floor with the join barely active
     (1.299 mm over 1.200). A mutation biting on only one arm of either branch
     would pass on a single row. */
  { label: 'a stem, hollow (60 mm x 6 mm — the bore open, the join well clear of the hub)', set: [{ id: 'stemLength', value: '60' }, { id: 'stemDiameter', value: '6' }] },
  { label: "a stem, SOLID at Eva's floor (60 mm x 3 mm — the bore closes, the join barely active)", set: [{ id: 'stemLength', value: '60' }, { id: 'stemDiameter', value: '3' }] },
  /* AND A THIRD, WHICH IS THE ONLY STATE ST0 CAN SPEAK ON. ST0 compares the
     registry's predicate against the geometry's, and on any row where a stem is
     eligible the two agree whatever either one says — so a geometry that has
     stopped refusing SPHERE is invisible on both rows above, and
     `stem-eligible-disagrees-with-the-registry` fired NOTHING until this row
     existed — and it is now the row the whole STEM CHANNEL family needs, for
     the same reason one level on: on a cap or a flat hub there is no channel
     to get wrong. The row a two-statement clause needs is the one where the
     statement BITES; session 35's stale-harness-row lesson, arriving as a row
     that was never chosen rather than one that went stale. */
  { label: 'a stem on a SPHERE — the stem channel, where petals the stem would pass through are NOT built',
    set: [{ id: 'placement', value: 'CONTINUOUS' }, { id: 'hubShape', value: 'SPHERE' }, { id: 'petalCount', value: '24' }, { id: 'stemLength', value: '60' }, { id: 'stemDiameter', value: '6' }] },

];

const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 700, height: 700 } });
let SERVE = SRC;
await page.route('**/bloom-geometry.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: SERVE }));

async function famsOn(rows) {
  const seen = new Set();
  for (const row of rows) {
    await openBloom(page, port);
    await stillFrame(page);
    const bad = await applyConfig(page, row.set);
    if (bad.length) { console.log(`    (row "${row.label}" refused: ${bad[0]})`); continue; }
    await page.waitForTimeout(300);
    /* BOTH FAMILIES. The apex table was A-only; session 41 added L7, whose
       witness is the emitted outline's local powers, and "re-run the mutant
       table when a family is added" is this project's own rule. A lobe
       mutation that fired nothing would otherwise look exactly like a clean
       tree. */
    for (const msg of await thicknessAssertions(page, row)) {
      const mm = /^(A\d)/.exec(msg); if (mm) seen.add(mm[1]);
    }
    for (const msg of await lobeAssertions(page, row)) {
      const mm = /^(L\d)/.exec(msg); if (mm) seen.add(mm[1]);
    }
    /* THE STEM FAMILY (session 43) — same rule again: a family added is a
       family this table must be able to fire. */
    for (const msg of await stemAssertions(page, row)) {
      const mm = /^(ST\d)/.exec(msg); if (mm) seen.add(mm[1]);
    }
  }
  return seen;
}

/* EVERY MUTANT'S ANCHOR IS CHECKED BEFORE ANY MUTANT RUNS, and for ALL of
   them rather than only the selected ones — `/plot`'s own measured lesson. A
   refactor disarms a mutant in two ways: a `from` that has MOVED (reported as
   "did not apply", survivable only if somebody runs it) and a `from` that now
   matches TWICE, which mutates the first occurrence and says nothing. Both are
   invisible in a sweep nobody finishes, and a stale anchor inside a SKIPPED
   mutant is precisely the one no run reports. This costs a string scan. */
{
  const stale = MUTANTS.map((mu) => [mu.id, SRC.split(mu.find).length - 1]).filter(([, n]) => n !== 1);
  console.log(`ANCHORS: ${MUTANTS.length} mutants, ${MUTANTS.length - stale.length} matching their find-string exactly once`);
  for (const [id, n] of stale) console.log(`  *** ${id}: anchor matches ${n}x — disarmed`);
  if (stale.length) { await browser.close(); server.close(); console.log('\nAPEX MUTANT TABLE: FAILED (disarmed anchors)'); process.exit(1); }
}

/* `--only=<id>[,<id>...]` runs a subset. A full sweep is every mutant over
   every row and is not survivable in a container that restarts, so the subset
   is how a family is re-verified after a change; it NEVER reports as a sweep. */
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1];
const SELECTED = ONLY ? ONLY.split(',').map((x) => x.trim()).filter(Boolean) : null;
if (SELECTED) {
  const unknown = SELECTED.filter((id) => !MUTANTS.some((m) => m.id === id));
  if (unknown.length) { await browser.close(); server.close(); console.log(`--only names no such mutant: ${unknown.join(', ')}`); process.exit(1); }
}

console.log('CONTROL (unmutated tree): the family must be SILENT on every row');
const clean = await famsOn(ROWS);
console.log(`  fired: ${clean.size ? [...clean].sort().join(', ') : '(none)'}\n`);
let fail = clean.size > 0;

/* `--neuter=<id>` makes ONE edit APPLY while changing nothing: the source
   differs, so the match count is satisfied, and only the witness can see that
   the behaviour did not move. A positive control on the witness clause. */
const NEUTER = (process.argv.find((a) => a.startsWith('--neuter=')) || '').split('=')[1] || null;
REGISTRY_DEFAULTS = (await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href)).DEFAULTS;
const CLEAN = await mutatedModule('__clean', SRC);
for (const mu of MUTANTS) {
  if (SELECTED && !SELECTED.includes(mu.id)) continue;
  const n = SRC.split(mu.find).length - 1;
  if (n !== 1) { console.log(`  ${mu.id}: MUTATION DID NOT APPLY (matched ${n}x) — ${mu.why}`); fail = true; continue; }
  const into = NEUTER === mu.id ? mu.find + ' /* neutered */' : mu.into;
  SERVE = SRC.replace(mu.find, into);
  /* THE WITNESS, before the browser is asked anything. */
  let verdict = 'the mutant declares no witness';
  try { verdict = await mu.witness(await mutatedModule(mu.id, SERVE), CLEAN); }
  catch (e) { verdict = `the witness threw: ${e.message}`; }
  if (verdict !== null) {
    console.log(`  ${mu.id}: the edit applied but the BEHAVIOUR did not move — ${verdict}`);
    fail = true; SERVE = SRC; continue;
  }
  const got = await famsOn(ROWS);
  const want = mu.names;
  const missed = want.filter((f) => !got.has(f));
  console.log(`  ${mu.id}: ${mu.why}`);
  console.log(`      names ${want.join(', ')} · fired ${got.size ? [...got].sort().join(', ') : '(NOTHING)'}` + (missed.length ? `   *** SILENT: ${missed.join(', ')}` : '   ok'));
  if (missed.length) fail = true;
  SERVE = SRC;
}
await browser.close(); server.close();
if (NEUTER) {
  console.log(fail ? `\nguard check: the sweep REPORTED the neutered mutant "${NEUTER}" — the witness clause fires.`
                   : `\nguard check: FAIL — "${NEUTER}" was neutered and the sweep stayed green.`);
  process.exit(fail ? 0 : 1);
}
if (SELECTED) {
  console.log(fail ? `\nAPEX MUTANT TABLE (SUBSET of ${SELECTED.length}/${MUTANTS.length}): FAILED`
                   : `\nAPEX MUTANT TABLE (SUBSET of ${SELECTED.length}/${MUTANTS.length}): each selected family fires on a mutation that names it, and is silent on the clean tree. THIS IS NOT A SWEEP — ${MUTANTS.length - SELECTED.length} mutants were not run.`);
  process.exit(fail ? 1 : 0);
}
console.log(fail ? '\nAPEX MUTANT TABLE: FAILED' : '\nAPEX MUTANT TABLE: every family fires on a mutation that names it, and is silent on the clean tree');
process.exit(fail ? 1 : 0);
