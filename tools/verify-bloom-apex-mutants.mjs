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
import crypto from 'node:crypto';
import { shardOf } from './bloom-export-shards.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, stillFrame, thicknessAssertions, lobeAssertions, stemAssertions, curlAssertions, stamenAssertions, leafAssertions, sepalAssertions, inflorescenceAssertions, varianceAssertions, apexNibAssertions } from './bloom-harness.mjs';

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
  /* the geometry imports the curve sampler by relative path; the sampler is never
     mutated here, so the shipped copy sits beside every mutated geometry */
  fs.copyFileSync(path.join(ROOT, 'bloom-curve.js'), path.join(d, 'bloom-curve.js'));
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
function builtOn(M, set = {}, mode = 'export', ring = null) {
  const acc = new M.MeshBuilder({ exportMode: mode === 'export', captureGrid: true });
  const m = M.buildBloomInto(acc, { ...REGISTRY_DEFAULTS, ...set });
  /* `ring` reads a NAMED ring's representative rather than ring 0's — the
     terminal witnesses need an inner whorl (see `floorRingTerminal`). */
  const petal = ring === null ? m.petal : m.petals[ring];
  if (!petal) throw new Error(`no petal built on ring ${ring} (${m.petals.length} rings)`);
  const footRows = petal.footRows;
  return {
    tipCap: petal.tipCap,
    halves: petal.grid[0].rows.filter((r) => r.row >= footRows).map((r) => r.halfWidth),
    stations: petal.profileU.slice(footRows),
    us: petal.grid[0].rows.filter((r) => r.row >= footRows).map((r) => r.u),
  };
}
/* THE TERMINAL WITNESSES READ A RING THE NIB CANNOT REACH (the gate-coverage
   session, D14 — the first time the whole table ran in CI since the apex nib
   landed, and the first thing it found). `floored-tip`, `true-apex` and
   `wrong-terminal` each mutate the MODE FLOOR (`tipFloor`) and used to read
   the shipping default's own last row; the apex nib pins that row to
   `APEX_END_HALF_MM` on every petal whose blade clears the print floor —
   which ring 0 does at every reachable width — so all three reported "the
   edit applied but the BEHAVIOUR did not move", on `main` as much as here,
   and had since the nib merged. The floor still decides exactly one thing:
   the last row of a ring whose blade NEVER CLEARS it (the nib's own declared
   inert case, 18 ring-modes of the matrix). Six layers at `layerSize` 0.35
   put the shipping petal's rings 3-5 there (peak half-widths 0.343 / 0.15 /
   0.15 mm live against a 0.15 mm floor; 0.80 export), measured; ring 5 is
   read, and the CLEAN tree is asked first whether that ring is really in the
   floor's subject — a witness on a ring the nib had taken would be the same
   silence in a different place. */
const FLOOR_RING = { set: { layerCount: 6, layerSize: 0.35 }, ring: 5, why: 'the blade never clears the print floor' };
const floorRingTerminal = (M, mode) => builtOn(M, FLOOR_RING.set, mode, FLOOR_RING.ring).tipCap;
const floorRingIsInSubject = (C, mode) => {
  const tc = floorRingTerminal(C, mode);
  const floor = mode === 'export' ? C.TIP_HALF_MM : C.TIP_CAP_HALF_MM;
  if (!tc.apex || tc.apex.active || tc.apex.why !== FLOOR_RING.why)
    return `the probe ring's nib is ${tc.apex ? (tc.apex.active ? 'ACTIVE' : `inert for "${tc.apex.why}"`) : 'unreported'} on the CLEAN tree — the floor does not own its last row, so the witness would read nothing`;
  if (tc.lastRowHalf !== floor) return `the probe ring ends on ${tc.lastRowHalf} mm on the CLEAN tree where the ${mode} floor is ${floor} — not the floor's own row`;
  return null;
};
const terminalOf = (M, mode) => floorRingTerminal(M, mode).lastRowHalf;
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

/* THE INFLORESCENCE WITNESS (the raceme session). Every clause below reads
   the MUTATED module directly — `inflorescencePlan` and `buildInflorescenceInto`
   run on M and on C and the two answers are compared — and deliberately not
   the assertion the mutant names, which is the circularity the table exists
   to avoid. `builtOn` above cannot serve: it reads the PETAL's grid, and
   every quantity here is about where a SECOND HEAD stands. */
const INFLO_STATE = (over = {}) => ({ ...REGISTRY_DEFAULTS, stemLength: 120, inflorescence: 'RACEME', ...over });
function infloFacts(M, over = {}) {
  try {
    const st = INFLO_STATE(over);
    const acc = new M.MeshBuilder({ exportMode: true });
    const b = M.buildBloomInto(acc, st);
    const P = b.inflorescence, B = b.inflorescenceBuilt;
    if (!P || !P.present || !B) return { threw: 'the state built no inflorescence at all' };
    const q = B.placed[0];
    /* THE MATRIX'S OWN COLUMN NORMS AND DETERMINANT — a rigid placement has
       three unit columns and determinant +1, and a scale in the matrix moves
       both. Read here rather than asserted, so ID3 and this do not share a
       side. */
    const col = (i) => Math.hypot(q.M[i], q.M[4 + i], q.M[8 + i]);
    const det = q.M[0] * (q.M[5] * q.M[10] - q.M[6] * q.M[9])
              - q.M[1] * (q.M[4] * q.M[10] - q.M[6] * q.M[8])
              + q.M[2] * (q.M[4] * q.M[9] - q.M[5] * q.M[8]);
    return {
      count: B.count, unitTris: B.unitTris, tris: B.tris,
      declared: P.built, nodes: P.nodes, perNode: P.perNode,
      rootR: P.rootR, crosses: P.crossesSolidMm, pedicelR: P.pedicelR,
      floretPetals: P.floretPetals, unitPetals: B.unit.petalsBuilt,
      floretState: { ...B.floretState },
      headAt: q.headAt.slice(), rootAt: q.root.slice(), D: q.D.slice(),
      cols: [col(0), col(1), col(2)], det, tx: q.M[3],
      maxDim: acc.maxDimensionMm, total: acc.triangleCount,
      /* THE EXTENT PER AXIS, because `maxDimensionMm` is the LARGEST of the
         three and on a raceme that is the RACHIS — 120 mm of stem down z,
         which no placement defect can move. Measured: the append mutant read
         137.251 mm on both trees while every floret had been collapsed onto
         x = 0. A witness has to probe the axis the mutation acts on. */
      extent: [acc.hi[0] - acc.lo[0], acc.hi[1] - acc.lo[1], acc.hi[2] - acc.lo[2]],
      /* BUILD 3's RECORDS (Phase A's floor and cap, Phase B's units): read
         off the plan and the builder for the witnesses below, never asserted
         here */
      pitchFloorMm: P.pitchFloorMm, pitchFloretRawMm: P.pitchFloretRawMm, pitchFloorIsFlorets: P.pitchFloorIsFlorets,
      gradient: P.gradient, gradientAsked: P.gradientAsked, gradientMax: P.gradientMax, gradientClamped: P.gradientClamped,
      unitCount: B.units.length,
      units: B.units.map((u) => ({ az: u.az, overrides: u.nodeOverrides ? { ...u.nodeOverrides } : null, curl: u.floretState.petalSpineCurl, cup: u.floretState.petalCup, twist: u.floretState.petalTwist, phase: u.floretState.variancePhase, pins: Object.fromEntries(Object.keys(M.PEDICEL_PINS).map((k) => [k, u.floretState[k]])) })),
      floretsMaxZByNode: B.floretsMaxZByNode ? B.floretsMaxZByNode.slice() : null, headFloorZ: P.headFloorZ, insetGapMm: P.insetGapMm,
      /* AND THE FIRST PLACED BLOCK'S OWN CENTROID, read out of the emitted
         stream at the offset the builder declared. The WHOLE bloom's extent
         does not move either: the HEAD is 81.6 mm across and the florets on
         20 mm pedicels reach less than that, so a collapse onto the axis is
         invisible in the envelope — measured, 81.638 on both trees. Where a
         block IS is a different statement from ID5's "the block equals the
         unit under its own matrix", which is the clause this witness may not
         be. */
      blockCentroid: (() => {
        const lo = q.at, hi = q.at + q.tris * 9;
        let x = 0, y = 0, z = 0, n = 0;
        for (let i = lo; i < hi; i += 3) { x += acc.positions[i]; y += acc.positions[i + 1]; z += acc.positions[i + 2]; n++; }
        return n ? [x / n, y / n, z / n] : null;
      })(),
      residual: B.placementResidual, compared: B.placementCompared,
      /* THE REACH INSET (build 3): the plan's own inset fields and node depths,
         read so the three inset mutants can witness on the MUTATED plan. */
      insetNeededMm: P.insetNeededMm, insetMm: P.insetMm, insetAskedMm: P.insetAskedMm,
      reach: P.floretReachMm ? { ...P.floretReachMm } : null, nodeDepths: P.nodeDepthsMm.slice(),
      lenCeilMm: P.lenCeilMm, pedicelLens: P.pedicelLensMm.slice(), lengthsClamped: P.lengthsClamped,
    };
  } catch (e) { return { threw: String(e && e.message || e) }; }
}
/* THE SIZE FIELD'S FACTS (organic variance, build 1), read off a build of the
   MUTATED module — the slot payloads the whorl primitive emitted and the
   builder's own per-petal record, never the assertion that names them. */
const VAR_STATE = (over = {}) => ({ ...REGISTRY_DEFAULTS, varianceSize: 0.5, varianceFrequency: 1, variancePhase: 0, ...over });
function varFacts(M, over = {}) {
  try {
    const st = VAR_STATE(over);
    const acc = new M.MeshBuilder({ exportMode: true });
    const b = M.buildBloomInto(acc, st);
    const petals = b.petalsAll.map((p) => ({ index: p.slotIndex, azimuth: p.azimuth, scale: p.slot.scale, factor: p.slot.sizeFactor ?? null, ringScale: p.ringScale, length: p.length, nominal: p.nominalLength }));
    return { petals, variance: b.variance, neighbour: b.neighbour, absent: M.varianceIsAbsent(st), tris: acc.triangleCount, az: b.slotAzimuths };
  } catch (e) { return { threw: e.message }; }
}
const varPair = (M, C, over = {}) => [varFacts(M, over), varFacts(C, over)];
/* THE FORM FIELD'S FACTS (build 2): the builder's own per-petal slot term and
   the composed values it built with, off a build of the MUTATED module. */
function formFacts(M, over = {}, scopes = null) {
  try {
    const st = { ...REGISTRY_DEFAULTS, varianceForm: 1, varianceFrequency: 1, variancePhase: 0, ...over };
    const acc = new M.MeshBuilder({ exportMode: true });
    const b = scopes ? M.buildBloomInto(acc, st, { scopes }) : M.buildBloomInto(acc, st);
    const petals = b.petalsAll.map((p) => ({ index: p.slotIndex, term: p.formTerm ?? null, curl: p.applied.petalSpineCurl, cup: p.applied.petalCup, twist: p.applied.petalTwist }));
    return { petals, record: b.formVariance ?? null, absent: M.varianceFormIsAbsent(st), baseCurl: Number(st.petalSpineCurl) };
  } catch (e) { return { threw: e.message }; }
}
const formPair = (M, C, over = {}, scopes = null) => [formFacts(M, over, scopes), formFacts(C, over, scopes)];
/* THE SPACING FIELD'S FACTS (build 3): the azimuths the whorl primitive
   EMITTED on a build of the MUTATED module, the record, and the cyclic order —
   never the SV clause the mutant names. */
function spacingFacts(M, over = {}) {
  try {
    const st = { ...REGISTRY_DEFAULTS, varianceSpacing: 0.9, varianceFrequency: 1, variancePhase: 0, ...over };
    const acc = new M.MeshBuilder({ exportMode: true });
    const b = M.buildBloomInto(acc, st);
    const az = b.slotAzimuths[0].slice();
    const TAU = 2 * Math.PI, wrap = (x) => ((x % TAU) + TAU) % TAU;
    const order = [...az.keys()].sort((p, q) => wrap(az[p]) - wrap(az[q]));
    const k = order.indexOf(0);
    const ordered = order.every((_, t) => order[(k + t) % order.length] === t);
    return { az, record: b.spacingVariance ?? null, absent: M.varianceSpacingIsAbsent(st), ordered, n: az.length };
  } catch (e) { return { threw: e.message }; }
}
const spacingPair = (M, C, over = {}) => [spacingFacts(M, over), spacingFacts(C, over)];
const infloPair = (M, C, over = {}) => [infloFacts(M, over), infloFacts(C, over)];
const bothBuilt = (m, c) => (m.threw || c.threw) ? `the witness threw: ${m.threw || c.threw}` : null;

/* THE NODE WITNESS (#299's port) — the MUTATED module's own stem plan, builder
   and leaves on a noded state, compared against the clean module's. */
const NODE_STATE = () => ({ ...REGISTRY_DEFAULTS, stemLength: 100, stemDiameter: 6, leafLength: 40, leafNodes: 3, stemNodeSwelling: 0.48, stemNodeKink: 0.48 });
/* THE SPLIT's WITNESS STATES (Eva's ruling, Oct 6): the halves APART, where a
   law reading the wrong half differs from the right one (on every state with
   the halves equal the coupled mutant is a no-op), and the rose's divergence,
   where an ignored divergence differs from 180. */
const SPLIT_STATE = () => ({ ...REGISTRY_DEFAULTS, stemLength: 100, stemDiameter: 6, leafLength: 40, leafNodes: 3, stemNodeSwelling: 0.3, stemNodeKink: 1 });
const DIVERGENCE_STATE = (over = {}) => ({ ...REGISTRY_DEFAULTS, stemLength: 100, stemDiameter: 6, leafLength: 40, leafNodes: 5, leafDivergence: 137.5, ...over });
/* RULING 6's TWO WITNESS STATES (stem session 2): a BARE noded stem, and a
   raceme whose head asks for prominence 1 — the state where every floret's own
   stem is a bare stem the ungated law would node unless the pedicel pin holds. */
const BARE_NODE_STATE = () => ({ ...REGISTRY_DEFAULTS, stemLength: 100, stemDiameter: 6, stemNodeSwelling: 0.48, stemNodeKink: 0.48 });
const RACEME_NODE_STATE = () => ({ ...REGISTRY_DEFAULTS, stemLength: 120, stemDiameter: 6, inflorescence: 'RACEME', stemNodeSwelling: 1, stemNodeKink: 1 });
function pedicelNodes(M) {
  try {
    const b = M.buildBloomInto(new M.MeshBuilder({ exportMode: true }), RACEME_NODE_STATE());
    const st = b.inflorescenceBuilt && b.inflorescenceBuilt.unit && b.inflorescenceBuilt.unit.stem;
    if (!st) return { threw: 'no floret stem record' };
    return { nodes: st.nodeLaw ? st.nodeLaw.nodes.length : 0, stations: st.stations.length };
  } catch (e) { return { threw: e.message }; }
}
function firstKinkDeg(M, state) {
  try {
    const acc = new M.MeshBuilder({ exportMode: true });
    const plan = M.stemPlan(state, M.footRing(state, acc).hub, acc);
    return plan.nodeLaw ? { az: plan.nodeLaw.nodes.map((n) => ((n.az * 180 / Math.PI) % 360 + 360) % 360) } : { az: null };
  } catch (e) { return { threw: e.message }; }
}
function nodeFacts(M, state = NODE_STATE()) {
  try {
    const acc = new M.MeshBuilder({ exportMode: true });
    const fr = M.footRing(state, acc);
    const plan = M.stemPlan(state, fr.hub, acc);
    const sacc = new M.MeshBuilder({ exportMode: true });
    const built = M.buildStemInto(sacc, plan);
    let maxCentreOff = 0;
    for (const g of built.emittedRings || []) maxCentreOff = Math.max(maxCentreOff, Math.hypot(g.cx, g.cy));
    const law = plan.nodeLaw;
    const offAtFirstNode = law ? Math.hypot(...M.stemNodeAxisMm(law, law.nodes[0].s)) : 0;
    const lp = M.leafPlan(state, plan, acc);
    let lastPetioleX = null, lastPetioleY = null;
    if (lp.present) {
      const n = lp.nodes - 1;
      const lb = M.buildLeafInto(new M.MeshBuilder({ exportMode: true }), lp, state, n, lp.azimuths[n][0]);
      lastPetioleX = lb.petioleAxis.inner[0]; lastPetioleY = lb.petioleAxis.inner[1];
    }
    return { stations: plan.stations.length, hasLaw: !!law, spread: law ? law.spreadMm : 0, maxCentreOff, offAtFirstNode, lastPetioleX, lastPetioleY };
  } catch (e) { return { threw: e.message }; }
}
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
/* THE BORE'S TWO CLOSURES, as the MUTATED module emits them (the tip-plug
   session). The strongest quantity available is the BOTTOM FACE'S AREA, read
   off the emitted triangles at the stem's own lowest z: a closed bottom is a
   full N-gon and an open one is that less the bore's, so the two differ by 25%
   on the shipped stem and by 56% at the widest bore. It is the feature itself
   rather than a proxy for it, and it is measured on the mutant's own geometry —
   never on the clause the mutant names, which is the circularity this table
   exists to avoid. */
function plugFacts(M, state = STEM_STATE()) {
  try {
    const acc = new M.MeshBuilder({ exportMode: true });
    const fr = M.footRing(state, acc);
    const plan = M.stemPlan(state, fr.hub, acc);
    const sacc = new M.MeshBuilder({ exportMode: true });
    const built = M.buildStemInto(sacc, plan);
    const P = sacc.positions;
    let tipZ = Infinity;
    for (let i = 2; i < P.length; i += 3) if (P[i] < tipZ) tipZ = P[i];
    let bottomArea = 0;
    for (let i = 0; i < P.length; i += 9) {
      if (!(P[i + 2] === tipZ && P[i + 5] === tipZ && P[i + 8] === tipZ)) continue;
      const ux = P[i + 3] - P[i], uy = P[i + 4] - P[i + 1];
      const vx = P[i + 6] - P[i], vy = P[i + 7] - P[i + 1];
      bottomArea += Math.abs(ux * vy - uy * vx) / 2;
    }
    return { plan, tris: built.tris, bottomArea, tipZ,
             emittedVoid: !!built.emittedVoid,
             plugMm: built.emittedVoid ? built.emittedVoidBottomZ - built.emittedTipZ : null };
  } catch (e) { return { threw: e.message }; }
}

/* THE CUT FACE, as the MUTATED module emits it (stem session 3): how far the
   face rises above the long point, how many of its vertices sit on the land,
   and how far the void's floor stands below the cut plane at the bore's far
   edge (positive = the bore opens through the face). Read off the emitted
   cut ring and the emitted void floor — never off the plan's `cut` record,
   which a mutation inside the plan would move with it. */
function endFaceFacts(M, state = STEM_STATE()) {
  try {
    const acc = new M.MeshBuilder({ exportMode: true });
    const fr = M.footRing(state, acc);
    const plan = M.stemPlan(state, fr.hub, acc);
    const sacc = new M.MeshBuilder({ exportMode: true });
    const built = M.buildStemInto(sacc, plan);
    const E = built.emittedCut;
    if (!E) return { threw: 'the builder emitted no cut face' };
    let zmax = -Infinity, zmin = Infinity, landCount = 0;
    for (const v of E.ring) { if (v[2] > zmax) zmax = v[2]; if (v[2] < zmin) zmin = v[2]; }
    for (const v of E.ring) if (v[2] === zmin) landCount++;
    /* The plane through the ring's own far column and its land edge: height
       at the bore's far edge (x = -b) by linear interpolation of the emitted
       ring between the long side and the far column. */
    const far = E.ring[E.ring.length / 2], near = E.ring.find((v, i) => v[2] > zmin) || E.ring[0];
    const slope = (far[2] - near[2]) / (near[0] - far[0]);
    const planeAtFarBore = near[2] + slope * (near[0] - (-plan.boreR));
    const voidBelowPlaneMm = built.emittedVoid ? planeAtFarBore - built.emittedVoidBottomZ : -Infinity;
    return { tris: built.tris, faceRiseMm: zmax - zmin, landCount, voidBelowPlaneMm };
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


/* ===== THE STAMEN LENGTH VARIANCE (F1.2) ===== */
/* Every built length the mutated module's OWN descriptor stamps, on a given
   state — the witness reads the record the law writes, never JS8 (which is
   the assertion these mutants name; asking the gate whether the gate fired is
   the circularity the witness clause exists to avoid). */
function stamenLengths(M, state) {
  try {
    const acc = new M.MeshBuilder({ exportMode: true });
    const fr = M.footRing(state, acc);
    return fr.androecium ? fr.androecium.stamens.map((s) => s.lengthMm) : [];
  } catch (e) { return { threw: String(e && e.message || e) }; }
}
const VARIED_SIX = () => ({ ...REGISTRY_DEFAULTS, stamenCount: 6, stamenLengthVariance: 0.5 });
const VARIED_120 = () => ({ ...REGISTRY_DEFAULTS, stamenCount: 6, stamenLength: 120, stamenLengthVariance: 1 });
/* ===== THE INDEPENDENT COIL (F1.3a) ===== */
/* The mutated module's OWN builder records on a coiled state — the emitted
   stamens (station centres, end direction) and the owner's per-stamen coil
   records — never JS9, which is what these mutants name. */
function coiledStamens(M, state) {
  try {
    const acc = new M.MeshBuilder({ exportMode: true });
    const b = M.buildBloomInto(acc, state);
    return { stamens: b.stamens || [], A: b.androecium };
  } catch (e) { return { threw: String(e && e.message || e) }; }
}
const COILED_SIX = () => ({ ...REGISTRY_DEFAULTS, stamenCount: 6, stamenCoil: 'INDEPENDENT', stamenCoilRadius: 1.5, stamenCoilTurns: 3 });
const COILED_TIGHT = () => ({ ...REGISTRY_DEFAULTS, stamenCount: 6, stamenCoil: 'INDEPENDENT', stamenCoilRadius: 1.5, stamenCoilTurns: 12 });
/* ===== THE BRAID (the braid session) ===== */
/* The mutated module's OWN builder records on a braided state — the emitted
   stamens (station centres, end direction) and the owner's per-strand braid
   records — never JS9, which is what these mutants name. The scopes carry the
   registry's bounds for the three strand ids. */
const BRAID_BOUNDS = { stamenLength: { min: 5, max: 120 }, stamenCoilRadius: { min: 0, max: 10 }, stamenCoilTurns: { min: 0.5, max: 12 } };
function braidStamens(M, state, strands = null) {
  try {
    const acc = new M.MeshBuilder({ exportMode: true });
    const b = M.buildBloomInto(acc, state, strands ? { scopes: { layers: [], petals: [], tiers: [], strands, bounds: BRAID_BOUNDS } } : {});
    return { stamens: b.stamens || [], A: b.androecium };
  } catch (e) { return { threw: String(e && e.message || e) }; }
}
const BRAID_SIX = () => ({ ...REGISTRY_DEFAULTS, stamenCount: 6, stamenCoil: 'BRAIDED' });
const BRAID_TIGHT = () => ({ ...REGISTRY_DEFAULTS, stamenCount: 6, stamenCoil: 'BRAIDED', stamenCoilTurns: 12 });
const BRAID_FOLD = () => ({ ...REGISTRY_DEFAULTS, stamenCount: 6, stamenCoil: 'BRAIDED', stamenCoilRadius: 10, stamenCurl: 180 });
const BRAID_STRANDS = [{ strand: 1, offsets: { stamenLength: 10 } }, { strand: 3, offsets: { stamenCoilRadius: 1.5 } }];
/* the radius of each strand's LAST station about the bundle's axis (the
   z axis on an uncurled bundle) — every strand of a braid ends on the
   bundle at its lay radius */
const endRadii = (r) => r.stamens.map((s) => { const e = s.stations[s.stations.length - 1]; return Math.hypot(e[0], e[1]); });
const endAngles = (r) => r.stamens.map((s) => { const e = s.stations[s.stations.length - 1]; return Math.atan2(e[1], e[0]); });
/* ===== THE SPINE CURVE (F3-global) ===== */
/* The mutated module's OWN spine record on a curve-mode state — the mode it
   says it built, the curl it was handed, the turn it built, the clamp and the
   validator's answer. Never C1, which is what these mutants name. */
function curveSpine(M, state) {
  try {
    const acc = new M.MeshBuilder({ exportMode: true });
    const b = M.buildBloomInto(acc, state);
    const sp = b.petal.spine;
    return { curveMode: !!sp.curveMode, curlRad: sp.curlRad, turnBuiltDeg: sp.turnBuiltDeg, clamped: sp.clamped, curveRefusal: sp.curveRefusal === undefined ? null : sp.curveRefusal };
  } catch (e) { return { threw: String(e && e.message || e) }; }
}
const CURVE_HOOK = () => ({ ...REGISTRY_DEFAULTS, petalCurlMode: 'CURVE', petalSpineCurve: { mode: 'single', points: [[0, 0], [0.55, 0.1], [0.75, 0.45], [0.5, 0.6], [0.3, 0.45]] }, petalSpineCurl: 150, curlBias: 1, curlStart: 0.5 });
const CURVE_UNDER = () => ({ ...REGISTRY_DEFAULTS, petalCurlMode: 'CURVE', petalSpineCurve: { mode: 'single', points: [[0, 0], [0.55, 0.1], [0.66, 0.3], [0.56, 0.38], [0.5, 0.3]] } });
/* ===== THE FOLD LIMIT (spine-cup-fold) ===== */
/* The mutated module's OWN spine record on the drawn S at cup 0.6 — whether the
   fold limit bound, the worst station's limit and reach, the validator's answer.
   Never C1 or C5, which is what these mutants name. */
const S_SPINE = { mode: 'single', points: [[0, 0], [0.3, 0.12], [0.6, -0.1], [1, 0.15]] };
const FOLD_S = () => ({ ...REGISTRY_DEFAULTS, petalCurlMode: 'CURVE', petalSpineCurve: S_SPINE, petalCup: 0.6 });
function foldSpine(M, state) {
  try {
    const acc = new M.MeshBuilder({ exportMode: true });
    const b = M.buildBloomInto(acc, state);
    const sp = b.petal.spine;
    return { bendClamped: !!sp.bendClamped, bend: sp.bend || null, curveRefusal: sp.curveRefusal === undefined ? null : sp.curveRefusal, sheet: sp.clearance.sheetT };
  } catch (e) { return { threw: String(e && e.message || e) }; }
}
/* ===== THE OUTLINE CURVE (F6-sym) ===== */
/* The mutated module's OWN petal record on an outline-curve state — the
   half-widths it emitted, the length it drew against the length asked, the
   lobe record, and the validator's answer beside what the build lifted. Never
   OC/AN/C1, which is what these mutants name. */
function outlinePetal(M, state) {
  try {
    const acc = new M.MeshBuilder({ exportMode: true });
    const p = M.buildBloomInto(acc, state).petal;
    const o = p.tipCap && p.tipCap.outline;
    return { base: [...p.profileBase], u: [...p.profileU], length: p.length, asked: p.askedLength, lobes: p.lobes ?? null,
             refusal: o ? o.refusal : undefined, lifted: o ? o.lifted.length : undefined };
  } catch (e) { return { threw: String(e && e.message || e) }; }
}
const OUTLINE_SPOON = { mode: 'symmetric', points: [[0, 0.03], [0.35, 0.05], [0.65, 0.2], [0.85, 0.22], [0.96, 0.12], [1, 0]] };
const OUTLINE_UNDER_PTS = { mode: 'symmetric', points: [[0, 0.05], [0.2, 0.015], [0.4, 0.2], [0.8, 0.12], [1, 0]] };
const OUTLINE_LAWSET = () => ({ ...REGISTRY_DEFAULTS, petalOutlineMode: 'CURVE', petalOutlineCurve: OUTLINE_SPOON, petalTipShape: 3, petalBaseTaper: 3, petalTipTaper: 4, petalTipEnd: 1, lobeDepth: 0.3 });
const OUTLINE_UNDER = () => ({ ...REGISTRY_DEFAULTS, petalOutlineMode: 'CURVE', petalOutlineCurve: OUTLINE_UNDER_PTS });
const OUTLINE_MUTANTS = /^(the-outline-curve-is-ignored|teeth-still-cut-in-curve-mode|the-outline-curve-reaches-the-foot|the-outline-length-is-not-fitted|the-outline-validator-and-the-build-disagree-on-the-floor)$/;
/* F6-sym-2: the width scale and the throat. The witness states: the default
   curve at 24 mm and at 12 mm (a scale either side of 1), the long tail at
   10 mm (its narrow run under the floor ONLY at the scaled width — the clean
   validator refuses and the build lifts), and the default curve on a fused
   five-petal tube. */
const OUTLINE_DEF_PTS = { mode: 'symmetric', points: [[0, 0.05], [0.15, 0.16], [0.36, 0.2286], [0.7, 0.178], [0.9, 0.1], [1, 0]] };
const OUTLINE_TAIL_PTS = { mode: 'symmetric', points: [[0, 0.06], [0.15, 0.14], [0.3, 0.12], [0.5, 0.05], [0.85, 0.03], [1, 0]] };
const OUTLINE_W = (w, pts = OUTLINE_DEF_PTS) => () => ({ ...REGISTRY_DEFAULTS, petalOutlineMode: 'CURVE', petalOutlineCurve: pts, petalWidth: w });
const OUTLINE_TUBE = () => ({ ...REGISTRY_DEFAULTS, petalOutlineMode: 'CURVE', petalOutlineCurve: OUTLINE_DEF_PTS, petalCount: 5, tubeLayer1: 0, tubeHeight: 0.4 });
const blandDiff = (m, c) => Math.max(...m.base.map((h, i) => (Number.isFinite(h) && Number.isFinite(c.base[i]) ? Math.abs(h - c.base[i]) : 0)));
const OUTLINE2_MUTANTS = /^(the-outline-width-scale-is-ignored|the-width-scale-moves-the-positions|the-curve-starts-below-the-throat|the-throat-width-is-not-pinned|the-validator-and-the-build-disagree-on-the-scaled-floor)$/;
const OUTLINE2_ROWS = /^a scaled outline curve|^a tubular outline curve/;
const FOLD_ROWS = /S spine x cup 0\.6 \(the fold|on the sliders \(the fold/;
const OUTLINE_ROWS = /^an outline curve|^a loaded outline curve/;
/* ===== THE ASYMMETRIC OUTLINE (F6-asym) =====
   The mutated module's OWN two-sided petal record — each half's emitted
   half-widths and the emitted margins (OC4's own record). Never OC/AN, which
   is what these mutants name. The witness state is block 67's LOPSIDED blade:
   the default curve on the left, a narrower right half. */
const ASYM_LOPSIDED = { mode: 'two-sided', points: OUTLINE_DEF_PTS.points, right: [[0, 0.05], [0.2, 0.09], [0.5, 0.12], [0.8, 0.08], [1, 0]] };
const ASYM_SET = () => ({ ...REGISTRY_DEFAULTS, petalOutlineMode: 'CURVE', petalOutlineCurve: ASYM_LOPSIDED });
function asymPetal(M, state) {
  try {
    const acc = new M.MeshBuilder({ exportMode: true });
    const p = M.buildBloomInto(acc, state).petal;
    if (!p.profileL || !p.marginSides) return { threw: 'the build is not two-sided' };
    return { L: [...p.profileL], R: [...p.profileR], u: [...p.profileU], margins: p.marginSides, apexR: p.tipCap.sides.right.apex };
  } catch (e) { return { threw: String(e && e.message || e) }; }
}
const ASYM_MUTANTS = /^(the-right-half-is-the-left-mirrored|the-halves-are-swapped|the-right-nib-reads-the-left-width|a-flat-section-reads-one-half-width)$/;
const ASYM_ROWS = /^an asymmetric outline curve/;
/* ===== THE OUTLINE UNDER SCOPING (F6-scope) =====
   The mutated module's OWN per-petal records — each built petal's mode, its
   mirror flag and its emitted half-widths per half — on the states the four
   geometry mutants act on. Never OC5, which is what they name. */
const SO_SPOON = { mode: 'symmetric', points: [[0, 0.03], [0.35, 0.05], [0.65, 0.2], [0.85, 0.22], [0.96, 0.12], [1, 0]] };
const SO_SCOPES = (layers, petals = []) => ({ layers, petals, tiers: [], bounds: {} });
const SO_MIXED = () => ({ state: { ...REGISTRY_DEFAULTS, layerCount: 3, scopeLayers: 'ON' }, scopes: SO_SCOPES([{ layer: 1, offsets: {}, values: { petalOutlineMode: 'CURVE', petalOutlineCurve: SO_SPOON } }, { layer: 2, offsets: {}, values: { petalOutlineMode: 'CURVE', petalOutlineCurve: ASYM_LOPSIDED } }]) });
const SO_FAN_PAIR = () => ({ state: { ...REGISTRY_DEFAULTS, placement: 'FAN', scopePetals: 'ON' }, scopes: SO_SCOPES([], [{ layer: 0, slot: 2, offsets: {}, values: { petalOutlineMode: 'CURVE', petalOutlineCurve: ASYM_LOPSIDED } }]) });
const SO_FAN = () => ({ state: { ...ASYM_SET(), placement: 'FAN' }, scopes: null });
const SO_RADIAL = () => ({ state: ASYM_SET(), scopes: null });
function soPetals(M, { state, scopes }) {
  try {
    const acc = new M.MeshBuilder({ exportMode: true });
    return M.buildBloomInto(acc, state, scopes ? { scopes } : {}).petalsAll.map((p) => ({ whorl: Math.round(p.whorl), slot: p.slotIndex, mode: p.outlineMode, mirrored: !!p.outlineMirrored, L: p.profileL ? [...p.profileL] : null, R: p.profileR ? [...p.profileR] : null }));
  } catch (e) { return { threw: String(e && e.message || e) }; }
}
const soModes = (P) => P.map((p) => `${p.whorl}:${p.mode}`).join(' ');
const SO_MUTANTS = /^(a-scoped-outline-is-ignored|a-scoped-outline-leaks-to-sibling-layers|a-scoped-outline-leaks-to-sibling-pairs|the-fan-partner-is-not-mirrored|the-radial-partner-is-mirrored)$/;
const SO_ROWS = /^a scoped outline/;
/* F3-scope — the spine under scoping: a layer owning a drawn spine over a
   slider bloom, the same record with per-layer OFF (kept and inert), and a FAN
   pair owning one. Each witness reads the MUTATED module's own per-petal spine
   records (`spPetals`). */
const SP_INCURVE = { mode: 'single', points: [[0, 0], [0.45, 0.06], [0.8, 0.3], [0.92, 0.55]] };
const SP_LAYER = (on = 'ON') => ({ state: { ...REGISTRY_DEFAULTS, layerCount: 2, scopeLayers: on, petalSpineCurl: 45 }, scopes: SO_SCOPES([{ layer: 1, offsets: {}, values: { petalCurlMode: 'CURVE', petalSpineCurve: SP_INCURVE } }]) });
const SP_FAN_PAIR = () => ({ state: { ...REGISTRY_DEFAULTS, placement: 'FAN', scopePetals: 'ON', petalSpineCurl: 30 }, scopes: SO_SCOPES([], [{ layer: 0, slot: 2, offsets: {}, values: { petalCurlMode: 'CURVE', petalSpineCurve: SP_INCURVE } }]) });
function spPetals(M, { state, scopes }) {
  try {
    const acc = new M.MeshBuilder({ exportMode: true });
    return M.buildBloomInto(acc, state, scopes ? { scopes } : {}).petalsAll.filter(Boolean).map((p) => ({ whorl: Math.round(p.whorl), slot: p.slotIndex, curve: !!p.spine.curveMode, turn: p.spine.turnBuiltDeg }));
  } catch (e) { return { threw: String(e && e.message || e) }; }
}
const spModes = (P) => P.map((p) => `${p.whorl}.${p.slot}:${p.curve ? 'C' : 'S'}`).join(' ');
const SPS_MUTANTS = /^(a-scoped-spine-is-ignored|a-scoped-spine-leaks-to-sibling-layers|a-scoped-spine-leaks-to-sibling-pairs|the-spine-resolved-through-a-second-chain|the-fan-partner-spine-is-flipped)$/;
const SPS_ROWS = /^a scoped spine/;
const BRAID_ROWS = /braided/;
/* The tier rows run under the tier mutants alone (`rowsFor` below), and the
   tier mutants run over the rows that name them. */
const TIER_MUTANTS = /^(every-tier-at-the-same-height|tiers-cross|tier-contact-unclamped|tier-offsets-leak|tiers-built-with-no-stem)$/;
const TIER_ROWS = /^SEPAL TIERS:/;
/* THE SEPAL CURVES (curves-sepals): the four mutants and the rows they run over,
   scoped to each other for the shard cap's sake (the tier rows' own reason). */
const SEPC_MUTANTS = /^(a-sepal-curve-read-from-the-petals|a-tier-curve-leaks-to-every-tier|the-sepal-limit-drawn-on-the-slider-spine|the-fold-limit-skipped-for-sepals)$/;
const SEPC_ROWS = /^SEPAL CURVES:/;
/* THE LEAF CURVES (curves-leaves): the eight geometry mutants and the rows they
   run over, scoped to each other for the shard cap's sake (the seed's own
   mutants are the panel gate's, route (am)). */
const LEAFC_MUTANTS = /^(the-leaf-spine-sign-flipped|teeth-dropped-on-a-drawn-outline|a-tooth-cuts-the-nib-on-a-drawn-outline|leaflets-read-the-simple-leafs-curve|the-terminal-leaflet-not-at-its-own-scale|the-inset-reads-the-slider-arch|the-fold-limit-skipped-for-leaves|the-lobed-blade-takes-the-curve)$/;
const LEAFC_ROWS = /^LEAF CURVES:/;
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
       a refactor disarming a mutant; the anchor check is what says so.
       RE-ANCHORED AGAIN (leaf/stem build S2): the leaf's tooth floor puts the
       BUILT relief in that line where the asked one stood (the same double
       wherever no floor is set — every petal), and the pre-check reported the
       anchor at 0 matches before any mutant ran. */
    find: '    const reliefMm = sinusD.map((dd) => Math.floor(Math.min(reliefBuiltMm, headroomOf(dd)) / LOBE_RELIEF_GRID) * LOBE_RELIEF_GRID);',
    into: '    const reliefMm = sinusD.map(() => Math.floor(Math.min(reliefBuiltMm, headroomAt(uPk)) / LOBE_RELIEF_GRID) * LOBE_RELIEF_GRID);', names: ['L5'],
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
    /* (moved, leaf/stem build S4: a chevron reads its ENVELOPE's peak on a
       branch; the petal's arm is the expression this mutates) */
    find: '    const peakHalfMm = chev ? chev.peakHalfMm : laminaHalf(uPk);',
    into: '    const peakHalfMm = chev ? chev.peakHalfMm : laminaHalf(ROOT_BLEND_END);', names: ['L5'],
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
  /* THESE THREE NAME AN0 NOW, NOT A2-A4: A2-A4 read the REPRESENTATIVE petal,
     whose terminal the nib owns at every reachable state, so a mutated mode
     floor cannot reach them; AN0 runs PER RING and its inert arm restates the
     terminal law (`max(squared end, the mode floor)`) on the rings the nib
     declines — the D14 finding above. The witness reads ring 5 of the
     six-layer probe state, and refuses first if the CLEAN tree says that ring
     is not the floor's to decide. */
  { id: 'floored-tip', why: 'the last row is not floored, so the emitted terminal is not the declared one',
    find: '      return Math.max(shape, rootBlend(u), tipFloor);',
    into: '      return Math.max(shape, rootBlend(u), u >= 1 ? 0 : tipFloor);', names: ['AN0'],
    witness: (M, C) => floorRingIsInSubject(C, 'export') || (terminalOf(M, 'export') === 0 ? null : `the floor ring's terminal is still ${terminalOf(M, 'export')} mm, not 0`) },
  /* A3 — the mode floor removed, so live converges to a true apex vertex:
     NV columns onto one edge, the retired centre dome's own defect. */
  { id: 'true-apex', why: 'the terminal floor is removed, so the apex collapses to a vertex',
    find: '  const tipFloor = acc && acc.exportMode ? TIP_HALF_MM : TIP_CAP_HALF_MM;',
    into: '  const tipFloor = acc && acc.exportMode ? TIP_HALF_MM : 0;', names: ['AN0'],
    witness: (M, C) => floorRingIsInSubject(C, 'live') || (terminalOf(M, 'live') === 0 ? null : `the floor ring's live terminal is still ${terminalOf(M, 'live')} mm, not 0`) },
  /* A4 — the terminal is a number of its own rather than the mode floor, so
     live and export stop differing where the floor says they should. */
  { id: 'wrong-terminal', why: 'the terminal ignores the mode and is a constant',
    find: '  const tipFloor = acc && acc.exportMode ? TIP_HALF_MM : TIP_CAP_HALF_MM;',
    into: '  const tipFloor = 0.4;', names: ['AN0'],
    witness: (M, C) => floorRingIsInSubject(C, 'live') || floorRingIsInSubject(C, 'export')
      || (terminalOf(M, 'live') === 0.4 && terminalOf(M, 'export') === 0.4 ? null
      : `the floor ring's terminal is ${terminalOf(M, 'live')} live / ${terminalOf(M, 'export')} export, not 0.4 in both`) },
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
    /* AND THE NAME MOVED when the apex nib landed: `uPk` is declared AFTER
       the terms now (it is the DRAWN widest point, derived from `uPkRaw` once
       the nib has set the drawn length), so the inserted term read `uPk` in
       its temporal dead zone and the witness THREW — reported as "the
       behaviour did not move", on `main` as much as here, by the first full
       sweep in CI (D14). `uPkRaw` is the law's own widest point and is what
       the CORE term beside it already reads. */
    /* (moved again, leaf/stem build S4: the CORE term carries the chevron's
       lobe factor on a branch — the anchor ends at the plain arm; and again
       in S4b, where the chevron arm caps at the round sinus bottoms) */
    /* (and in S5, where the chevron arm takes the broad-sinus fillet's floor
       on a branch; and in F6-sym, where an outline curve takes the term on a
       branch ahead of the chevron) */
    find: "    { name: 'CORE', from: stalk ? stalk.until : 0, to: tubeLaw ? tubeLaw.u : 1, at: tubeLaw ? tubeLaw.at : outline ? outline.halfAtMm : chev ? (chev.fillAt ? (chev.roundAt ? (u) => Math.max(Math.min(halfW * tipLaw(u) * chev.lobeAt(u), chev.roundAt(u)), chev.fillAt(u)) : (u) => Math.max(halfW * tipLaw(u) * chev.lobeAt(u), chev.fillAt(u))) : chev.roundAt ? (u) => Math.min(halfW * tipLaw(u) * chev.lobeAt(u), chev.roundAt(u)) : (u) => halfW * tipLaw(u) * chev.lobeAt(u)) : (u) => halfW * tipLaw(u) },",
    into: "    { name: 'CORE', from: stalk ? stalk.until : 0, to: tubeLaw ? tubeLaw.u : 1, at: tubeLaw ? tubeLaw.at : outline ? outline.halfAtMm : chev ? (chev.fillAt ? (chev.roundAt ? (u) => Math.max(Math.min(halfW * tipLaw(u) * chev.lobeAt(u), chev.roundAt(u)), chev.fillAt(u)) : (u) => Math.max(halfW * tipLaw(u) * chev.lobeAt(u), chev.fillAt(u))) : chev.roundAt ? (u) => Math.min(halfW * tipLaw(u) * chev.lobeAt(u), chev.roundAt(u)) : (u) => halfW * tipLaw(u) * chev.lobeAt(u)) : (u) => halfW * tipLaw(u) },\n    { name: 'MUTANT_PLATEAU', from: 0, to: 1, at: (u) => 0.6 * halfW * clamp((u - uPkRaw) / (1 - uPkRaw), 0, 1) },",
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
    into: '  const tipFloor = (acc && acc.exportMode ? TIP_HALF_MM : TIP_CAP_HALF_MM) * 3;', names: ['AN0'],
    witness: (M, C) => floorRingIsInSubject(C, 'export') || (Math.abs(terminalOf(M, 'export') - 3 * terminalOf(C, 'export')) < 1e-12 ? null
      : `the floor ring's terminal is ${terminalOf(M, 'export')} mm, not 3x the clean ${terminalOf(C, 'export')}`) },
  /* A7 — the ladder resamples the root blend. The held rows stop being the
     uniform ones, which moves a boundary footRing() owns. Watertight, one
     piece, identical triangle count; nothing else here can see it. */
  { id: 'ladder-eats-the-base', why: 'the ladder redistributes every row, including the ones the root blend owns',
    find: 'export function HELD_ROWS(nu = NU) { return Math.floor(ROOT_BLEND_END * nu); }',
    /* A7 ONLY, and the claim was corrected by the control rather than the
       check by the claim: with the held count at 0 the ladder still respects
       its gap bound, so A8 is RIGHT not to fire here. */
    into: 'export function HELD_ROWS(nu = NU) { return 0; }', names: ['A7'],
    witness: (M, C) => {
      const a = builtOn(M).stations, b = builtOn(C).stations;
      /* REGISTRY_DEFAULTS' own petalTipShape (1.70) sits well below the apex
         row-ramp's band floor, so BLADE_ROWS (the static, module-load NU)
         still equals the row count this default build actually used. */
      const held = Math.floor(0.30 * C.BLADE_ROWS);
      for (let i = 0; i < held; i++) if (!Object.is(a[i], b[i])) return null;
      return `every station the root blend holds is unmoved (first ${held} of ${a.length})`;
    } },
  /* A7 — two rows land on one station: `stations-not-increasing` — RETIRED AS
     UNREACHABLE (the gate-coverage session, D14), and the measurement is the
     reason. The mutation removed `bladeStations`' de-duplication pass (`if
     (out[i] <= out[i - 1]) out[i] = out[i - 1] + 1e-5`); its witness needed a
     state where the UNREPAIRED ladder is non-increasing, and session 35 chose
     buckle 0.30 at f 1 (159 such states of 9,072 at NU 56). The first full
     sweep in CI reported it inert — on `main` as much as here — and a sweep
     of the unrepaired module on today's ladder finds NO such state at all:
     672 buckle states (amp 0.1-0.6 x f 1-7 x p 2/3/4/6 x tip shape 1-3) in
     both modes, 1,764 at session 35's finer grid (amp 0.05-0.60 x f 1-7 x
     p 2/3/6 x tip shape 0.6-3) in live, and 144 lobed / arc-ramped /
     spatulate / pointed compositions in both modes — 0 of ~2,600 builds with
     a non-increasing pair, the smallest POSITIVE gap 3.2e-6 in u. The ladder
     changed underneath it twice since NU 56 (the apex nib's arc demand and
     yield, session 42's accumulation slack on the search), and what the pass
     guarded against no longer arises from any reachable state. A7 still
     asserts strict increase on every row; what is retired is the claim that
     a mutant can SHOW that clause firing. Its former witness (both
     directions — the CLEAN ladder increasing, the unrepaired one not) is the
     one to restore if a future ladder change makes the pass reachable again:
     find a state with `tools`-side sweep first, never by widening the grid
     until one appears. */
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
     THE HUB'S SHAPE (the hub-shape session) — ST5 and ST11. Each is a way the
     styled join could be built wrong, or #236 could come back, while the export
     stays watertight and the triangle count is whatever it built. The first
     two fire on the STYLED and #236 rows; the byte-exact GOBLET-default arm IS
     the derived law, so a style-ignoring mutation is invisible on a default
     row by construction — which is why those rows are in ROWS. */
  { id: 'hub-ignores-the-style', why: 'the hub is built from the DERIVED constant-stress law instead of the styled profile, so ANGLED and CURVED and every non-default GOBLET draw the rounded flare at the derived depth — the shape controls do nothing',
    find: '  const joinAt = (r) => hubJoinThicknessAt(r, { hubR: ring.radius, hubT: t, outerR: plan.outerR, joinT: plan.joinT, style: plan.hubStyle, amount: plan.hubAmount, axisDepth: plan.axisDepth });',
    into: '  const joinAt = (r) => hubThicknessAt(r, { hubR: ring.radius, hubT: t, outerR: plan.outerR, joinT: plan.joinT });', names: ['ST11'],
    witness: (M, C) => {
      const st = { ...REGISTRY_DEFAULTS, stemLength: 60, stemDiameter: 6, hubStyle: 'ANGLED', hubShapeAmount: 2, hubLength: 20 };
      const mid = (T) => { const acc = new T.MeshBuilder({ exportMode: true }); const fr = T.footRing(st, acc); const ring = fr.rings[0]; const u = T.buildHubInto(acc, st, ring).underside; return u[Math.floor(u.length / 2)][1]; };
      const a = mid(M), b = mid(C);
      return Math.abs(a - b) > 1e-6 ? null : `the underside mid-thickness is ${a} on the mutant and ${b} on the clean tree — the style was not ignored`;
    } },
  { id: 'hub-236-fill-is-sphere-only', why: 'the solid root band that embeds a hub narrower than its stem is restored to SPHERE-only, so a CAP or flat head sits in the bore with nothing bridging it — half of #236, and the head detaches (the connectedness gate is the other witness)',
    find: '  const headInsideBore = headOuterMm < boreR;',
    into: '  const headInsideBore = sphere && headOuterMm < boreR;', names: ['ST11'],
    witness: (M, C) => {
      const st = { ...REGISTRY_DEFAULTS, petalCount: 3, spread: 0.6, petalWidth: 8, stemLength: 60, stemDiameter: 12 };
      const band = (T) => { const acc = new T.MeshBuilder({ exportMode: true }); const fr = T.footRing(st, acc); const ring = fr.rings[0]; return T.stemPlan(st, ring, acc).solidBandMm; };
      const a = band(M), b = band(C);
      return a === 0 && b > 0 ? null : `the solid root band is ${a} mm on the mutant and ${b} mm on the clean tree — the fill did not go sphere-only`;
    } },
  { id: 'hub-flat-shell-returns', why: 'the join is built even where the head is NOT wider than the stem, so the flat zero-volume join shell hubThicknessAt used to emit comes back — the other half of #236, watertight and detached, which ST5 catches as a join ACTIVE where the shape says INERT',
    find: '  const swellActive = !sphere && hubR > outerR && (axisDepth - hubT) > 0;',
    into: '  const swellActive = !sphere && (axisDepth - hubT) > 0;', names: ['ST5'],
    witness: (M, C) => {
      const st = { ...REGISTRY_DEFAULTS, petalCount: 3, spread: 0.6, petalWidth: 8, stemLength: 60, stemDiameter: 12 };
      const sa = (T) => { const acc = new T.MeshBuilder({ exportMode: true }); const fr = T.footRing(st, acc); const ring = fr.rings[0]; return T.stemPlan(st, ring, acc).swellActive; };
      return sa(M) === true && sa(C) === false ? null : `swellActive reads ${sa(M)} on the mutant and ${sa(C)} on the clean tree — the flat-shell guard did not drop`;
    } },


  /* ===================================================================
     THE INFLORESCENCE (the raceme session) — ID0-ID6. Seven mutations, one a
     family, and every one of them exports WATERTIGHT, as ONE CONNECTED
     PIECE, with the triangle count the row's own arithmetic predicts: a
     raceme whose florets are all piled at the origin, rooted on the axis of a
     hollow rachis, scaled through the matrix, built from the head's own petal
     count, or placed at the node instead of at the pedicel's tip is a
     perfectly good solid. That is the whole argument for the family, and it
     is measured here rather than asserted. */
  { id: 'the-inflorescence-guard-disagrees-with-the-registry',
    why: 'the geometry stops refusing an inflorescence on a bloom with no rachis, so the registry hides the sub-controls while the builder places florets off a stem that is not there — and nothing in either STL gate can see a disagreement between two predicates',
    find: "  return String(state.inflorescence ?? 'NONE') === 'NONE' || !Number(state.stemLength);",
    into: "  return String(state.inflorescence ?? 'NONE') === 'NONE';", names: ['ID0'],
    witness: (M, C) => {
      const st = { ...REGISTRY_DEFAULTS, stemLength: 0, inflorescence: 'RACEME' };
      const a = M.inflorescenceIsAbsent(st), b = C.inflorescenceIsAbsent(st);
      return (a === false && b === true) ? null
        : `inflorescenceIsAbsent reads ${a} on the mutant and ${b} on the clean tree with no rachis — the guard did not move`;
    } },

  { id: 'a-floret-is-declared-and-never-built',
    why: 'the first floret of every node is declared by the plan and never appended, so the plan and the builder disagree about how many heads exist — the export is watertight, one piece, and simply has fewer flowers on it than the read-out says',
    find: '    for (const az of plan.azimuths[i]) {',
    into: '    for (const az of plan.azimuths[i].slice(1)) {', names: ['ID1'],
    witness: (M, C) => {
      const [m, c] = infloPair(M, C, { floretPhyllotaxy: 'whorled' });
      const t = bothBuilt(m, c); if (t) return t;
      return (m.count < c.count && m.declared === c.declared) ? null
        : `the builder placed ${m.count} of a declared ${m.declared} on the mutant against ${c.count} of ${c.declared} clean — the drop did not happen`;
    } },

  /* ===================================================================
     ORGANIC VARIANCE, BUILD 1 — THE SIZE FIELD (VS0-VS5). Six mutations, each
     the shape of a defect both STL gates pass by construction (a size factor
     moves vertices on a fixed lattice), each witnessed on the MUTATED
     MODULE's own slot payloads and builder record at a state where the
     mutation MUST separate the two trees — never on the clause it names. */
  { id: 'size-field-never-reaches-the-blade',
    why: "the whorl primitive records the field's factor on the slot and hands the blade the descriptor's own scale — a control that draws its wave on the read-out and moves no petal; watertight, one piece, the identical triangle count, and every family but VS2 silent",
    /* the RING arm's line (the LIST arm's is on one line with its blade()
       call, so this anchor is unique) */
    find: '    const scale = sizeFactor === null ? sizeRamp(i, count) : sizeRamp(i, count) * sizeFactor;\n    blade({',
    into: '    const scale = sizeRamp(i, count);\n    blade({', names: ['VS2'],
    witness: (M, C) => {
      const [m, c] = varPair(M, C);
      const t = bothBuilt(m, c); if (t) return t;
      /* EVERY slot at its descriptor's scale while SOME slot's factor is not 1
         — not every slot's, because a 1-cycle wave at phase 0 hands the slot at
         90 degrees `1 + 0.5 * cos(pi/2)`, which rounds to EXACTLY 1 (6e-17 of
         amplitude is under an ulp of 1), and a witness demanding every factor
         off 1 reported "the behaviour did not move" on a mutant that had. */
      const stuck = m.petals.every((p) => p.scale === p.ringScale && p.factor !== null) && m.petals.some((p) => p.factor !== 1);
      const moved = c.petals.some((p) => p.scale !== p.ringScale);
      return (stuck && moved) ? null
        : `the mutant's slots read scale ${m.petals.map((p) => p.scale.toFixed(3)).join('/')} against factors ${m.petals.map((p) => p.factor && p.factor.toFixed(3)).join('/')}; the clean tree's ${c.petals.map((p) => p.scale.toFixed(3)).join('/')} — the factor still reached the blade`;
    } },

  { id: 'amount-0-is-not-the-identity',
    why: "the guard is bypassed: at amount 0 the field returns a record with a hair of amplitude instead of null, so the shipping default is no longer byte-identical by branch — every petal's scale moves by ~1e-9, invisible to the eye, the census, both STL gates and the triangle count, and the whole '0 moved' partition is false",
    find: '  if (varianceIsAbsent(state)) return null;\n  const amount = Number(state.varianceSize);',
    into: '  const amount = varianceIsAbsent(state) ? 1e-9 : Number(state.varianceSize);', names: ['VS1'],
    witness: (M, C) => {
      const [m, c] = varPair(M, C, { varianceSize: 0 });
      const t = bothBuilt(m, c); if (t) return t;
      const mutMoved = m.petals.some((p) => p.scale !== p.ringScale) && m.variance !== null;
      const cleanHeld = c.petals.every((p) => p.scale === p.ringScale) && c.variance === null;
      return (mutMoved && cleanHeld) ? null
        : `at amount 0 the mutant reports ${m.variance ? 'a record' : 'no record'} with slot scales ${m.petals.map((p) => p.scale).join('/')} against descriptor scales ${m.petals.map((p) => p.ringScale).join('/')}; the clean tree ${c.variance ? 'a record' : 'no record'} — the identity did not break`;
    } },

  { id: 'fan-field-is-not-even',
    why: "the fan takes the ring's own wave, `cos(f theta + phi)` on the SIGNED azimuth, so with any phase the two sides of the mirror plane carry different sizes and the fan stops being a fan — Z4a/Z4b/Z8 still pass (the roles and the azimuths are untouched), the export is watertight and one piece, and only VS3 (and VS1's restatement, which reads |theta| with the phase inert) can see it",
    find: '      : (az) => Math.cos(frequency * Math.abs(az)))',
    /* SINCE BUILD 2 the wave is SHARED, so the same edit breaks the form field
       on the form fan row too — FV1 (the restatement reads |theta|) and FV3 —
       and those are true statements about this mutant, named rather than left
       unclaimed. */
    into: '      : (az) => Math.cos(frequency * az + phi))', names: ['VS1', 'VS3', 'FV1', 'FV3'],
    witness: (M, C) => {
      /* phase 90: cos is even at phase 0, so a witness there would separate
         nothing (`bore-is-not-evas-rule`'s lesson — the probe is part of the
         claim). */
      const [m, c] = varPair(M, C, { placement: 'FAN', variancePhase: 90 });
      const t = bothBuilt(m, c); if (t) return t;
      const uneven = (f) => { const az = f.az[0]; let bad = 0, pairs = 0; for (let i = 0; i < az.length; i++) for (let j = i + 1; j < az.length; j++) if (az[i] === -az[j]) { pairs++; if (f.variance.factors[0][i] !== f.variance.factors[0][j]) bad++; } return { bad, pairs }; };
      const um = uneven(m), uc = uneven(c);
      return (um.pairs > 0 && um.bad > 0 && uc.bad === 0) ? null
        : `mirror pairs unequal on ${um.bad} of ${um.pairs} on the mutant and ${uc.bad} of ${uc.pairs} on the clean tree — the fan's field did not become uneven`;
    } },

  { id: 'aliasing-is-never-told',
    why: "ruling 4's flag is deleted: a wave above n/2 aliases into scatter and the record says nothing, so the read-out's ALIASED clause never prints and the frequency slider silently draws noise past the bar — no byte differs from the honest tree, and VS4 is the only witness",
    find: '  const aliased = frequency > 0 && frequency > nyquist;',
    into: '  const aliased = false;', names: ['VS4', 'FV4', 'SV4'],
    witness: (M, C) => {
      const [m, c] = varPair(M, C, { varianceFrequency: 20 });
      const t = bothBuilt(m, c); if (t) return t;
      return (m.variance.aliased === false && c.variance.aliased === true) ? null
        : `at 20 cycles on 8 slots the mutant says aliased=${m.variance.aliased} and the clean tree ${c.variance.aliased} — the flag did not go quiet`;
    } },

  { id: 'the-told-flag-forgets-the-sheet',
    why: "the neighbour approach reports the LAMINA distance as the skin gap — a mid-surface reading wearing the name of a wall-to-wall one, so the shipping default's -1.170 mm crossing prints as +0.030 mm of clearance and the told flag tells the opposite of the truth; nothing geometric moves",
    find: 'skinGapMm: lamina.mm - t, sheetMm: t,',
    into: 'skinGapMm: lamina.mm, sheetMm: t,', names: ['VS5'],
    witness: (M, C) => {
      const [m, c] = varPair(M, C, { varianceSize: 0 });
      const t = bothBuilt(m, c); if (t) return t;
      const dm = m.neighbour.blade, dc = c.neighbour.blade;
      return (dm.skinGapMm === dm.laminaMm && dc.skinGapMm === dc.laminaMm - dc.sheetMm && dm.laminaMm === dc.laminaMm) ? null
        : `the mutant's skin gap reads ${dm.skinGapMm} against a lamina of ${dm.laminaMm}; the clean tree's ${dc.skinGapMm} — the sheet was not forgotten`;
    } },

  { id: 'the-told-flag-skips-half-the-pairs',
    why: "the all-pairs approach visits index-adjacent pairs only — the azimuth-adjacent reading the discovery doc measured as WRONG on a continuous mum (4.42 mm adjacent where all pairs read 0.56, between TURNS) — so the flag reports a clearance the object does not have on exactly the arrangements that crowd; the shipping default's own pair (0, 7) is index-adjacent by luck and still reads right",
    find: '  for (let i = 0; i < lam.length; i++) for (let j = i + 1; j < lam.length; j++) pairs.push([boxGapOf(lam[i], lam[j]), i, j]);',
    into: '  for (let i = 0; i + 1 < lam.length; i++) pairs.push([boxGapOf(lam[i], lam[i + 1]), i, i + 1]);', names: ['VS5'],
    witness: (M, C) => {
      const [m, c] = varPair(M, C, { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, varianceSize: 0 });
      const t = bothBuilt(m, c); if (t) return t;
      const dm = m.neighbour.blade, dc = c.neighbour.blade;
      return (dm.pairs < dc.pairs && dm.skinGapMm > dc.skinGapMm) ? null
        : `the mutant read ${dm.pairs} pairs and a gap of ${dm.skinGapMm}; the clean tree ${dc.pairs} pairs and ${dc.skinGapMm} — the reading did not lose the cross-turn pair`;
    } },

  { id: 'the-guard-moves-off-zero',
    why: "the geometry's guard becomes `amount > 0.1` while the registry's `variancePresent` still says `> 0`: between 0.01 and 0.10 the two sub-controls are SHOWN and INERT — the defect PP7, JS0, ST0 and ID0 were each written for, arriving in a new family; the load-time twin check cannot see it because it runs on the unmutated Node import, so VS0 through the page is the only witness",
    find: '  return !(Number(state.varianceSize) > 0);\n}',
    into: '  return !(Number(state.varianceSize) > 0.1);\n}', names: ['VS0', 'VS1'],
    witness: (M, C) => {
      const [m, c] = varPair(M, C, { varianceSize: 0.05 });
      const t = bothBuilt(m, c); if (t) return t;
      return (m.absent === true && c.absent === false && m.variance === null && c.variance !== null) ? null
        : `at amount 0.05 the mutant's guard says absent=${m.absent} (${m.variance ? 'a record' : 'no record'}) and the clean tree's absent=${c.absent} — the guard did not move`;
    } },

  /* ORGANIC VARIANCE, BUILD 2 — THE FORM FIELD. Each witnessed on the MUTATED
     module's own per-petal record (`formTerm`, `applied`) at a state where the
     mutation must separate the two trees, never on the FV clause it names. */
  { id: 'form-field-never-reaches-the-blade',
    why: "the slot's form term rides on the payload and into the record while `petalSurface` builds from the descriptor's state: every petal is its whorl's, the record says otherwise, and nothing that reads the STL can tell — FV2 is the only witness",
    /* re-anchored with the role retirement (Q3.4): the resolver takes no ring
       and the no-term arm IS the state; the mutation drops the FORM term only,
       so a scoped row keeps its scope and the mutant names one thing */
    find: '  let ps = (slot.formTerm || scopeTerm) ? petalStateForSlot(state, slot.formTerm || null, formClamped, formScaled, scopeTerm) : state;',
    into: '  let ps = scopeTerm ? petalStateForSlot(state, null, formClamped, formScaled, scopeTerm) : state;', names: ['FV2'],
    witness: (M, C) => {
      const [m, c] = formPair(M, C, { varianceForm: 1 });
      const t = bothBuilt(m, c); if (t) return t;
      const flat = (f) => f.petals.filter((p) => p.term && Math.abs(p.term.petalSpineCurl) > 1 && p.curl === f.baseCurl).length;
      return (flat(m) > 0 && flat(c) === 0) ? null
        : `petals carrying a curl term but built at the whorl's curl: ${flat(m)} on the mutant, ${flat(c)} on the clean tree — the term did not stop reaching the blade`;
    } },
  { id: 'form-amount-0-is-not-the-identity',
    why: "THE STANDING MUTANT FOR THE FORM GUARD: at amount 0 the field returns a record with a hair of amplitude instead of null, so every petal is re-composed through the slot path at a term of ~1e-9 and the shipping default is no longer byte-identical BY BRANCH — invisible to the eye, the census, both STL gates and the triangle count, and the '0 moved' partition becomes false; FV1's amount-0 arm is the witness",
    find: '  if (varianceFormIsAbsent(state)) return null;\n  const amount = Number(state.varianceForm);',
    into: '  const amount = varianceFormIsAbsent(state) ? 1e-9 : Number(state.varianceForm);', names: ['FV1'],
    witness: (M, C) => {
      const [m, c] = formPair(M, C, { varianceForm: 0 });
      const t = bothBuilt(m, c); if (t) return t;
      const mutTerms = m.petals.filter((p) => p.term !== null).length, cleanTerms = c.petals.filter((p) => p.term !== null).length;
      return (mutTerms > 0 && m.record !== null && cleanTerms === 0 && c.record === null) ? null
        : `at amount 0 the mutant carries ${mutTerms} petal term(s) (${m.record ? 'a record' : 'no record'}), the clean tree ${cleanTerms} (${c.record ? 'a record' : 'no record'}) — the identity did not break`;
    } },
  /* `form-clamped-twice` IS RETIRED, NOT RE-ANCHORED: it clamped the group
     value before the slot term was added, which under HEADROOM SCALING is the
     law itself — the room is measured from the composition as the petal would
     be built at amount 0, which IS clamped (docs/bloom-organic-variance-form-
     outcome.md §19). Its two successors ask what can now go wrong. */
  { id: 'the-headroom-is-the-old-clamp',
    why: "THE HEADROOM LAW'S STANDING WITNESS (Eva's ruling on the pinning, docs/bloom-organic-variance-form-outcome.md §19): the slot term is added whole and the sum clamped, as it was before — 30 % of the petals pinned identically at curl -180 on the SHIPPING default, half of them at any slider end. It exports watertight, as one piece, at an identical triangle count, and every clause but FV2 reads the term or the record, never the composition, so a later session putting the pinning back would be noticed by FV2 alone",
    find: "      const b = composedBoundsOf(base);\n      const at = clamp(from, b.min, b.max);\n      if (clampedOut && at !== from) clampedOut.push({ base, asked: from, got: at });\n      const t = slotTerm[base];\n      const half = (b.max - b.min) / 2;\n      const room = t >= 0 ? b.max - at : at - b.min;\n      const scaled = room >= half ? t : t * (room / half);\n      if (scaledOut && scaled !== t) scaledOut.push({ base, asked: t, got: scaled });\n      (out || (out = {}))[base] = at + scaled;",
    into: "      (out || (out = {}))[base] = from + slotTerm[base];", names: ['FV2'],
    witness: (M, C) => {
      /* the shipping default at amount 1 over 20 petals: the old clamp pins
         petals at curl -180 (0 - 270 passes the floor); headroom pins none */
      const [m, c] = formPair(M, C, { petalCount: 20, varianceForm: 1 });
      const t = bothBuilt(m, c); if (t) return t;
      const pinned = (f) => f.petals.filter((p) => p.curl === -180).length;
      return (pinned(m) > 0 && pinned(c) === 0) ? null
        : `${pinned(m)} petal(s) sit at curl -180 on the mutant and ${pinned(c)} on the clean tree — the old clamp did not come back`;
    } },
  { id: 'the-headroom-reads-the-unclamped-composition',
    why: "the room is measured from the composition BEFORE it is clamped (the scope term since the role retirement, Q3.4): a curl-180 + per-layer-360 inner petal composes to 540, so its room ABOVE reads -180 and every petal whose wave points up is pushed DOWN — the field's sign flipped on exactly the whorls a role row has already pushed past the range. FV2 restates the room from the CLAMPED composition, which this mutation does not touch",
    find: "      const at = clamp(from, b.min, b.max);",
    into: "      const at = from;", names: ['FV2'],
    witness: (M, C) => {
      /* the composition the room is measured from is the SCOPE term now (the
         role table is retired, Q3.4): curl 180 + a per-layer +360 on the two
         inner whorls — the migrated INNER — composes to 540 */
      const over = { layerCount: 3, petalSpineCurl: 180, scopeLayers: 'ON', varianceForm: 1 };
      const scopes = { layers: [1, 2].map((layer) => ({ layer, offsets: { petalSpineCurl: 360 } })), petals: [], tiers: [], bounds: { petalSpineCurl: { min: -180, max: 360 } } };
      const [m, c] = formPair(M, C, over, scopes);
      const t = bothBuilt(m, c); if (t) return t;
      let diff = 0;
      for (let i = 0; i < m.petals.length; i++) if (m.petals[i].curl !== c.petals[i].curl) diff++;
      return diff > 0 ? null : `every petal's composed curl agrees on the mutant and the clean tree (${m.petals.length} petals) — the unclamped room moved nothing`;
    } },
  /* ORGANIC VARIANCE, BUILD 3 — THE SPACING FIELD. The two STANDING mutants
     Eva asked for, each witnessed on the MUTATED module's own emitted
     azimuths. The per-clause must-fail is tools/verify-bloom-spacing.mjs. */
  { id: 'spacing-amount-0-is-not-the-identity',
    why: "THE STANDING MUTANT FOR THE SPACING GUARD: at amount 0 the field returns a record with a hair of amplitude instead of null, so every slot's azimuth is mapped through the pitch law at A 1e-9 and moves by up to ~1e-9 rad — invisible to the eye, the census, both STL gates and the triangle count, and the '0 moved' partition becomes false; SV1's amount-0 arm is the witness",
    find: '  if (varianceSpacingIsAbsent(state)) return null;\n  const amount = Number(state.varianceSpacing);',
    into: '  const amount = varianceSpacingIsAbsent(state) ? 1e-9 : Number(state.varianceSpacing);', names: ['SV1'],
    witness: (M, C) => {
      const [m, c] = spacingPair(M, C, { varianceSpacing: 0 });
      const t = bothBuilt(m, c); if (t) return t;
      const moved = m.az.some((a, i) => a !== c.az[i]);
      return (moved && m.record !== null && c.record === null) ? null
        : `at amount 0 the mutant ${m.record ? 'reports a record' : 'reports no record'} and ${moved ? 'moved' : 'did not move'} an azimuth against the clean tree (${c.record ? 'a record' : 'no record'}) — the identity did not break`;
    } },
  { id: 'spacing-is-a-direct-azimuth-offset',
    why: "THE LAW'S OWN WITNESS AGAINST THE CIRCULAR VERSION Eva ruled out: each slot is moved by A g times its nominal pitch (a direct offset on the azimuth) instead of standing at the pitch law's integral. It exports watertight, one piece, at an identical triangle count; on the shipping whorl the petals simply stand elsewhere (SV2), and past n/2 neighbours swap order — the crossing the pitch law makes impossible (SV3)",
    find: '    map = (az) => az + (amount / f) * Math.sin(f * az + phi);',
    into: '    map = (az) => az + amount * Math.cos(f * az + phi) * (TAU / w.n);', names: ['SV2', 'SV3'],
    witness: (M, C) => {
      const [m, c] = spacingPair(M, C, { varianceFrequency: 5 });
      const t = bothBuilt(m, c); if (t) return t;
      return (!m.ordered && c.ordered && m.az.some((a, i) => a !== c.az[i])) ? null
        : `at 5 cycles on 8 slots the mutant's order is ${m.ordered ? 'KEPT' : 'broken'} and the clean tree's ${c.ordered ? 'kept' : 'BROKEN'} — the direct offset did not cross`;
    } },
  { id: 'form-guard-moves-off-zero',
    why: "the geometry's form guard becomes `amount > 0.1` while the registry's `varianceFormPresent` still says `> 0`: between 0.01 and 0.10 the shared frequency and phase are SHOWN and the form is INERT — PP7's, JS0's and VS0's defect in the form family; the load-time twin check runs on the unmutated Node import, so FV0 through the page is the only witness",
    find: '  return !(Number(state.varianceForm) > 0);\n}',
    into: '  return !(Number(state.varianceForm) > 0.1);\n}', names: ['FV0', 'FV1'],
    witness: (M, C) => {
      const [m, c] = formPair(M, C, { varianceForm: 0.05 });
      const t = bothBuilt(m, c); if (t) return t;
      return (m.absent === true && c.absent === false && m.record === null && c.record !== null) ? null
        : `at amount 0.05 the mutant's guard says absent=${m.absent} and the clean tree's absent=${c.absent} — the guard did not move`;
    } },
  { id: 'form-half-span-is-the-whole-range',
    why: "each varied base's reach is its WHOLE range instead of half of it — the field is twice as strong as the control says, the clamp absorbs most of it, and the read-out's own sentence ('up to ±270° curl') is false; FV1 restates the half-span from the REGISTRY's control range, which this mutation does not touch",
    find: '  const halves = FORM_VARIANCE_BASES.map((b) => [b.base, (b.max - b.min) / 2, (b.offsetDeg * Math.PI) / 180]);',
    into: '  const halves = FORM_VARIANCE_BASES.map((b) => [b.base, (b.max - b.min), (b.offsetDeg * Math.PI) / 180]);', names: ['FV1'],
    witness: (M, C) => {
      const [m, c] = formPair(M, C, { varianceForm: 0.4 });
      const t = bothBuilt(m, c); if (t) return t;
      const hm = m.record.halves.petalSpineCurl, hc = c.record.halves.petalSpineCurl;
      return (hm === 2 * hc) ? null : `the curl half-span reads ${hm} on the mutant and ${hc} on the clean tree — it did not double`;
    } },
  { id: 'the-form-offsets-collapse-to-zero',
    why: "THE OFFSET LAW'S OWN WITNESS (Eva's ruling on the three-way hazard, docs/bloom-organic-variance-form-outcome.md §12): cup, curl and twist read the shared wave with NO offset, so the crest petal takes all three maxima together — curl 270, cup 1 and twist 180 on one blade, the 0.076 mm self-approach and the 86-pair fold per petal the offsets were ruled to remove. A later session 'simplifying' the three constants away exports watertight, as one piece, at an identical triangle count; FV1 restates the offsets IN THE HARNESS (FORM_OFFSET_DEG_RESTATED), never imports them, so it is the clause that sees this",
    find: '  const halves = FORM_VARIANCE_BASES.map((b) => [b.base, (b.max - b.min) / 2, (b.offsetDeg * Math.PI) / 180]);',
    into: '  const halves = FORM_VARIANCE_BASES.map((b) => [b.base, (b.max - b.min) / 2, 0]);', names: ['FV1'],
    witness: (M, C) => {
      const [m, c] = formPair(M, C, { varianceForm: 1 });
      const t = bothBuilt(m, c); if (t) return t;
      /* the largest, over petals, of the SMALLEST of the three per-base waves:
         1 when some petal sits at all three crests at once, at most cos(60) =
         0.5 when the three are a third of a cycle apart */
      const crest = (f) => Math.max(...f.petals.filter((p) => p.term && p.term.gs).map((p) => Math.min(p.term.gs.petalSpineCurl, p.term.gs.petalCup, p.term.gs.petalTwist)));
      const cm = crest(m), cc = crest(c);
      return (cm > 0.999 && cc <= 0.5 + 1e-12) ? null
        : `the joint crest reads ${cm} on the mutant and ${cc} on the clean tree — the three bases did not come back into phase`;
    } },
  { id: 'the-pedicel-roots-on-the-axis',
    why: "the pedicel is rooted on the rachis's AXIS instead of its wall mid-thickness — the leaf's own LF2 trap one part later: on a HOLLOW rachis the root sits in the VOID, so the pedicel crosses no solid and is a detached shell, and both STL gates read it as one piece because the floret above it overlaps everything else",
    /* THE ANCHOR IS THE PEDICEL'S OWN CALL, NOT THE BARE EXPRESSION. Its
       first cut was `const rootR = (stem.boreR + stem.outerR) / 2;`, which
       MATCHED TWICE — the leaf's petiole owns the same sentence — so the
       mutation landed on the LEAF and said nothing about the pedicel it
       names. Caught by the anchor scan above before any mutant ran, which is
       exactly what that scan exists for, and fixed by giving the expression
       ONE OWNER (`rodWallRootMm`) rather than by narrowing the string. */
    find: '  const rootR = rodWallRootMm(stem);\n  const embedMm = rodWallEmbedMm(stem);',
    into: '  const rootR = 0;\n  const embedMm = rodWallEmbedMm(stem);', names: ['ID2'],
    witness: (M, C) => {
      const [m, c] = infloPair(M, C);
      const t = bothBuilt(m, c); if (t) return t;
      return (m.rootR === 0 && c.rootR > 0) ? null
        : `the pedicel roots at r = ${m.rootR} on the mutant and ${c.rootR} on the clean tree — the root did not move to the axis`;
    } },

  /* ---- THE REACH INSET (inflorescence build 3, Phase A — #355) ---- */
  { id: 'the-inset-reads-the-pedicel-again',
    why: "the top node's inset goes back to build 1's law — the PEDICEL's rise, `L sin th` — which clears the rod and not the flower on it: the shipped raceme's top floret stands with its petals through the terminal head's at 0.000 mm again, watertight, one piece, the same triangle count, `insetSatisfied` true. ID9 (c) restates the law from the floret builder's own emitted vertices and (d) reads the emitted florets against the head's floor",
    find: '  const insetNeededMm = Math.max(0, reachMm + (stem.rootZ - headFloorZ) + MIN_FEATURE_MM);',
    into: '  const insetNeededMm = Math.max(0, pedicelLenMm * Math.sin((angleDeg * Math.PI) / 180));', names: ['ID9'],
    witness: (M, C) => {
      const [m, c] = infloPair(M, C);
      const t = bothBuilt(m, c); if (t) return t;
      return (m.insetNeededMm < c.insetNeededMm - 10 && m.nodeDepths[0] < c.nodeDepths[0]) ? null
        : `the mutant needs ${m.insetNeededMm} mm of inset and the clean tree ${c.insetNeededMm} — the law did not go back to the rise`;
    } },
  { id: 'the-reach-reads-one-mode',
    why: "the reach is the LIVE unit's alone, so where the export unit reaches further (a 0.60 mm sheet floors to 1.00 at export and its floret reaches 0.62 mm higher) the export build's top node is shallower than its own reach asks — and the two modes' node depths DIFFER, which is a mode-dependent topology, refused seven times here. Invisible on the shipping sheet, where the two reaches are the same double; ID9 (a) and (f) on the 0.60 mm row",
    find: '  const reachRawMm = Math.max(reachLive.reachMm, reachExport.reachMm);',
    into: '  const reachRawMm = reachLive.reachMm;', names: ['ID9'],
    witness: (M, C) => {
      const [m, c] = infloPair(M, C, { sheetThickness: 0.6 });
      const t = bothBuilt(m, c); if (t) return t;
      if (!m.reach || !c.reach) return 'the plan reports no reach record';
      if (!(c.reach.export > c.reach.live)) return `the probe state's export reach (${c.reach.export}) does not exceed its live reach (${c.reach.live}) on the clean tree — the mutation is invisible here`;
      return (m.insetNeededMm < c.insetNeededMm) ? null
        : `the mutant needs ${m.insetNeededMm} mm and the clean tree ${c.insetNeededMm} — reading one mode did not shorten the inset`;
    } },
  { id: 'the-pedicel-ceiling-is-the-stems-again',
    why: "the per-node pedicel ceiling goes back to the head's `STEM_LENGTH_RANGE[1]` (120) while the slider runs to 250: a 250 mm pedicel asked for is built at 120 and told as clamped, and the corymb on the full rachis clamps its lowest pedicels again. ID7 restates the ceiling as the pedicel's own range; the row at 250 is where the two differ",
    find: '  const lenCeilMm = PEDICEL_LENGTH_RANGE[1];',
    into: '  const lenCeilMm = STEM_LENGTH_RANGE[1];', names: ['ID7'],
    witness: (M, C) => {
      const [m, c] = infloPair(M, C, { pedicelLength: 250 });
      const t = bothBuilt(m, c); if (t) return t;
      return (m.lenCeilMm === 120 && m.lengthsClamped && m.pedicelLens[0] === 120 && c.pedicelLens[0] === 250 && !c.lengthsClamped) ? null
        : `the mutant's ceiling reads ${m.lenCeilMm} (top pedicel ${m.pedicelLens[0]}) and the clean tree's ${c.lenCeilMm} (${c.pedicelLens[0]}) — the ceiling did not move back`;
    } },

  /* BUILD 3, PHASE A's TWO LAWS AND PHASE B's TWO (Eva's rulings, Oct 4). Each
     witness reads the MUTATED module's own plan or builder record against the
     clean one, on a state where the law binds; never the assertion it names. */
  { id: 'the-internode-floor-is-the-rods-again',
    why: "the node law's pitch floor goes back to two pedicel radii alone — the florets' own floor derived from their emitted triangles is computed and ignored — so the shipped raceme's florets stand 0.676 mm from each other again (Phase A's finding, the state ruling 1 was written for): five nodes, watertight, one piece. ID10 (b) holds the emitted spacing to the restated floor and (d) reads the file",
    find: '  const pitchFloorMm = Math.max(pitchFloorRodMm, pitchFloretMm);',
    into: '  const pitchFloorMm = pitchFloorRodMm;', names: ['ID10'],
    witness: (M, C) => {
      const [m, c] = infloPair(M, C);
      const t = bothBuilt(m, c); if (t) return t;
      return (m.pitchFloorMm === 2 * m.pedicelR && c.pitchFloorMm > 2 * c.pedicelR + 5 && m.nodes > c.nodes) ? null
        : `the mutant's floor is ${m.pitchFloorMm} (${m.nodes} nodes) and the clean tree's ${c.pitchFloorMm} (${c.nodes}) — the floor did not go back to the rods'`;
    } },
  { id: 'the-floor-reads-one-mode',
    why: "the florets' floor is the LIVE unit's alone, so where the export unit stands taller the export build's nodes sit under their own floor — and whether the two modes' node counts agree becomes a matter of luck, a mode-dependent topology refused eight times here. ID10 (a) restates the floor over BOTH modes' units",
    find: '  const pitchFloretRawMm = Math.max(pitchLive.floorMm, pitchExport.floorMm);',
    into: '  const pitchFloretRawMm = pitchLive.floorMm;', names: ['ID10'],
    witness: (M, C) => {
      const [m, c] = infloPair(M, C, { sheetThickness: 0.6 });
      const t = bothBuilt(m, c); if (t) return t;
      return (m.pitchFloretRawMm < c.pitchFloretRawMm) ? null
        : `the mutant's florets' floor is ${m.pitchFloretRawMm} and the clean tree's ${c.pitchFloretRawMm} on the 0.60 mm sheet — reading one mode did not lower it (the two modes' units may stand the same height here; choose a state where they do not)`;
    } },
  { id: 'the-gradient-cap-is-dropped',
    why: "the gradient's cap goes back to infinity, so a lower pedicel three times the top's rises through the terminal head again — build 2's anthela through the back door, the shape ruling 2 forbids — watertight, one piece, told by nothing. ID7 restates the cap from the inset's own law; ID9 (d) reads the florets against the head's floor on every node with INFLO_OVERTOP_XFAIL empty",
    find: '  const gradientClamped = !corymbAsked && gradientAsked > gradientMax;',
    into: '  const gradientClamped = false;', names: ['ID7', 'ID9'],
    witness: (M, C) => {
      const [m, c] = infloPair(M, C, { pedicelGradient: 3, floretNodes: 12, pedicelLength: 60 });
      const t = bothBuilt(m, c); if (t) return t;
      if (!c.gradientClamped) return `the clean tree does not clamp gradient 3 on the probe state (max ${c.gradientMax}) — the cap does not bind here`;
      const bar = m.headFloorZ - m.insetGapMm;
      const over = m.floretsMaxZByNode ? Math.max(...m.floretsMaxZByNode.slice(1)) - bar : NaN;
      return (!m.gradientClamped && m.gradient === 3 && over > 1) ? null
        : `the mutant ${m.gradientClamped ? 'still clamps' : 'does not clamp'} and its lowest florets stand ${over.toFixed(3)} mm over the bar — the ramp did not reach the head`;
    } },
  { id: 'the-node-term-is-never-formed',
    why: "`nodeVarianceTerm` returns null whatever the control reads, so `nodeVariance` is a dead slider: every floret is the head's own form, one build serves every node, and the raceme exports watertight and one piece at the pre-variation count. NV0's two statements still agree (the predicate is untouched) — NV1 reads each unit's bases against the term restated from the controls, and NV4 the one build",
    find: '  if (nodeVarianceIsAbsent(state)) return null;\n  const amount = Number(state.nodeVariance);\n  const term = {};',
    into: '  return null;\n  const amount = Number(state.nodeVariance);\n  const term = {};', names: ['NV1', 'NV4'],
    witness: (M, C) => {
      const [m, c] = infloPair(M, C, { nodeVariance: 1 });
      const t = bothBuilt(m, c); if (t) return t;
      /* the mutant's one unit is the HEAD's own cup (the control's value, no
         term), where the clean tree's units carry the term; the first cut
         compared the mutant's cup against the clean FIRST unit's, which
         carries the term by construction, and read "the term still forms" */
      const headCup = Number(INFLO_STATE({ nodeVariance: 1 }).petalCup);
      return (m.unitCount === 1 && c.unitCount >= 2 && m.units.every((u) => u.overrides === null && u.cup === headCup) && c.units.some((u) => u.cup !== headCup)) ? null
        : `the mutant built ${m.unitCount} unit(s) and the clean tree ${c.unitCount}; the clean units' cups read ${c.units.map((u) => u.cup).join('/')} against the mutant's ${m.units.map((u) => u.cup).join('/')} — the term still forms`;
    } },
  { id: 'the-node-term-outranks-the-pins',
    why: "the per-node overrides are spread AFTER the pedicel pins, so a term that happened to carry a pinned id would win over the pin — today none does, so this is caught by NV3's reading of the pins on every unit under a planted term that DOES: the witness plants `stemNodeKink` into the overrides and sees the pedicel node (it planted the retired `stemNodeProminence` before the node split)",
    /* THE FIRST CUT PLANTED THE PIN INTO THE OVERRIDES AND LEFT THEM SPREAD
       BEFORE `PEDICEL_PINS`, so the pins still won and the witness reported
       "the behaviour did not move" — the mutation has to move the SPREAD
       past the pins, which is the defect it names. */
    find: '    /* PER-NODE VARIATION (Phase B) — applied FIRST so the pins below win */\n    ...(nodeOverrides || {}),\n    /* A FLORET DOES NOT INHERIT THE TUBE (Eva\'s ruling): every whorl FREE */\n    ...Object.fromEntries(Array.from({ length: MAX_LAYERS }, (_, i) => [`tubeLayer${i + 1}`, TUBE_K_MAX])),\n    ...PEDICEL_PINS,',
    into: '    ...Object.fromEntries(Array.from({ length: MAX_LAYERS }, (_, i) => [`tubeLayer${i + 1}`, TUBE_K_MAX])),\n    ...PEDICEL_PINS,\n    ...(nodeOverrides ? { ...nodeOverrides, stemNodeKink: 1 } : {}),', names: ['NV3'],
    witness: (M, C) => {
      const [m, c] = infloPair(M, C, { nodeVariance: 1 });
      const t = bothBuilt(m, c); if (t) return t;
      return (m.units.some((u) => u.pins.stemNodeKink !== 0) && c.units.every((u) => u.pins.stemNodeKink === 0)) ? null
        : `the mutant's units carry stemNodeKink ${m.units.map((u) => u.pins.stemNodeKink).join('/')} and the clean tree's ${c.units.map((u) => u.pins.stemNodeKink).join('/')} — the pin still wins`;
    } },
  { id: 'the-floret-phase-is-the-heads',
    why: "`floretPhaseDeg` returns null for every floret, so each one keeps the HEAD's `variancePhase` — the world-fixed frame the Oct 3 ruling forbids: every floret's field crest sits on the same world side whatever node it hangs from. Watertight, one piece, the same counts. NV2 re-derives the outward phase from each placement's own matrix",
    find: '  if (varianceIsAbsent(state) && varianceFormIsAbsent(state) && varianceSpacingIsAbsent(state)) return null;\n  const a = Number(angleDeg);\n  if (a === 0) return null;',
    into: '  return null;\n  const a = Number(angleDeg);\n  if (a === 0) return null;', names: ['NV2'],
    witness: (M, C) => {
      const [m, c] = infloPair(M, C, { varianceForm: 0.5 });
      const t = bothBuilt(m, c); if (t) return t;
      return (m.units.every((u) => u.phase === 0) && c.units.some((u) => u.phase !== 0)) ? null
        : `the mutant's unit phases read ${m.units.map((u) => u.phase).join('/')} and the clean tree's ${c.units.map((u) => u.phase).join('/')} — the florets did not fall back to the head's phase`;
    } },
  { id: 'the-outward-phase-ignores-the-pedicels-sign',
    why: "a DESCENDING pedicel hangs its floret inverted, so the outward direction sits at the floret's azimuth plus a half turn; the derivation drops that term and puts the crest on the INWARD side of every hanging floret — the right rule for a rising pedicel, wrong by exactly 180 degrees on a falling one. NV2 reads the direction off the placement matrix, which knows which way the floret hangs",
    find: '  let psi = ((az + (a < 0 ? Math.PI : 0)) * 180) / Math.PI;',
    into: '  let psi = (az * 180) / Math.PI;', names: ['NV2'],
    witness: (M, C) => {
      const [m, c] = infloPair(M, C, { varianceForm: 0.5, pedicelAngle: -60 });
      const t = bothBuilt(m, c); if (t) return t;
      const d = Math.abs(((m.units[0].phase - c.units[0].phase) % 360 + 360) % 360);
      return (Math.abs(d - 180) < 1e-6) ? null : `the mutant's phase and the clean tree's differ by ${d} degrees on a descending pedicel — not the half turn the sign term carries`;
    } },
  { id: 'the-memo-keys-on-the-length-alone',
    why: "the floret memo keys on the pedicel length and nothing else, so under a node term the FIRST azimuth's unit is served to every node — each node's placement appends a floret built for another node's azimuth: the slider changes one floret and the others copy it. Watertight, one piece, the same counts. NV4 holds every placement to the unit its own azimuth asks for",
    find: "      return `${exportMode ? 'E' : 'L'}|${L}|${o ? JSON.stringify(o) : ''}`;",
    /* NV4 ALONE, AND THE CLAIM ON NV1 CAME OFF THE LIST BY MEASUREMENT: the
       one unit the broken memo serves is built for its OWN azimuth and
       carries the term that azimuth asks for, so NV1 — which reads each
       UNIT against the term restated from the azimuth it was built for —
       is correctly silent; what is wrong is which unit each PLACEMENT got,
       and that is NV4's. A mutation that stays green on a clause is
       sometimes the claim being wrong rather than the clause. */
    into: "      return `${exportMode ? 'E' : 'L'}|${L}`;", names: ['NV4'],
    witness: (M, C) => {
      const [m, c] = infloPair(M, C, { nodeVariance: 1 });
      const t = bothBuilt(m, c); if (t) return t;
      return (m.unitCount === 1 && c.unitCount === 2) ? null : `the mutant built ${m.unitCount} unit(s) and the clean tree ${c.unitCount} — the key still carries the term`;
    } },
  { id: 'the-placement-carries-a-scale',
    why: "ruling 3's own prohibition, made false: the rigid transform gains a 0.9 scale, so the floret's SIZE comes from the matrix rather than from parameters — which silently carries a sheet that was floored at export through a shrink, i.e. a printable wall that is no longer printable, at an identical triangle count and a watertight, one-piece export",
    find: '  const tx = root[0] - r[2] * tipZLocal, ty = root[1] - r[5] * tipZLocal, tz = root[2] - r[8] * tipZLocal;',
    into: '  for (let i = 0; i < 9; i++) r[i] *= 0.9;\n  const tx = root[0] - r[2] * tipZLocal, ty = root[1] - r[5] * tipZLocal, tz = root[2] - r[8] * tipZLocal;',
    names: ['ID3'],
    witness: (M, C) => {
      const [m, c] = infloPair(M, C);
      const t = bothBuilt(m, c); if (t) return t;
      const off = Math.max(...m.cols.map((v) => Math.abs(v - 1)));
      const clean = Math.max(...c.cols.map((v) => Math.abs(v - 1)));
      return (off > 0.05 && clean < 1e-9) ? null
        : `the placement's column norms are off unity by ${off.toExponential(3)} on the mutant and ${clean.toExponential(3)} clean — the scale did not land`;
    } },

  { id: 'the-floret-inherits-the-head-petal-count',
    why: "the floret is built from the HEAD's own petalCount rather than from `floretPetals`, so the control is dead and every floret is a copy of the head — watertight, one piece, and the only thing wrong with it is that a slider does nothing",
    find: '    petalCount: plan.floretPetals,',
    into: '    petalCount: state.petalCount,', names: ['ID4'],
    witness: (M, C) => {
      const [m, c] = infloPair(M, C, { floretPetals: 3 });
      const t = bothBuilt(m, c); if (t) return t;
      return (Number(m.floretState.petalCount) !== 3 && Number(c.floretState.petalCount) === 3) ? null
        : `the floret was built with petalCount ${m.floretState.petalCount} on the mutant and ${c.floretState.petalCount} clean — the override did not drop`;
    } },

  { id: 'the-append-drops-the-translation',
    why: "`appendTransformed` applies the rotation and drops the offset, so every floret is built at the ORIGIN however far down the rachis its node is — a raceme piled into one ball, which exports watertight with the identical triangle count and the identical STL byte length, and which the voxel flood fill reads as ONE connected piece",
    find: '      const X = M[0] * x + M[1] * y + M[2] * z + M[3];',
    into: '      const X = M[0] * x + M[1] * y + M[2] * z;', names: ['ID5'],
    witness: (M, C) => {
      const [m, c] = infloPair(M, C);
      const t = bothBuilt(m, c); if (t) return t;
      /* THE FIRST FLORET'S OWN BLOCK CENTROID, not any envelope: the whole
         bloom's x extent is the HEAD's 81.6 mm on both trees (the florets on
         20 mm pedicels reach less), and `maxDimensionMm` is the RACHIS's
         120 mm down z, which no placement defect can move. Two envelopes
         measured and both blind — a witness has to probe the thing the
         mutation acts on, and here that is where a block LANDS. */
      if (!m.blockCentroid || !c.blockCentroid) return 'the witness could not read a placed block';
      /* THE MUTANT'S BLOCK IS THE CLEAN ONE LESS EXACTLY M[3], because only
         the X OFFSET is dropped — the rotated unit's own centroid stays, so
         "it lands at zero" is the wrong bar and reads 2.9029 where the clean
         block reads 21.4942. The DECLARED translation is the number to
         subtract, and the placement record carries it. */
      const want = c.blockCentroid[0] - c.tx;
      return (Math.abs(m.blockCentroid[0] - want) < 1e-9 && Math.abs(c.tx) > 1 && m.total === c.total) ? null
        : `the first floret's block sits at x = ${m.blockCentroid[0].toFixed(4)} on the mutant; the clean block's ${c.blockCentroid[0].toFixed(4)} less its own declared ${c.tx.toFixed(4)} offset is ${want.toFixed(4)}, at ${m.total} / ${c.total} triangles — the append did not drop exactly the translation`;
    } },

  { id: 'the-head-stands-at-the-node-not-the-pedicel-tip',
    why: "the placement forgets the pedicel's own length, so every floret sits ON the rachis with its pedicel buried inside it instead of at the far end — watertight, one piece, the same triangle count, and the pedicels are simply invisible",
    find: '  const tx = root[0] - r[2] * tipZLocal, ty = root[1] - r[5] * tipZLocal, tz = root[2] - r[8] * tipZLocal;',
    into: '  const tx = root[0], ty = root[1], tz = root[2];', names: ['ID6'],
    witness: (M, C) => {
      const [m, c] = infloPair(M, C);
      const t = bothBuilt(m, c); if (t) return t;
      const d = Math.hypot(m.headAt[0] - c.headAt[0], m.headAt[1] - c.headAt[1], m.headAt[2] - c.headAt[2]);
      const stood = Math.hypot(m.headAt[0] - m.rootAt[0], m.headAt[1] - m.rootAt[1], m.headAt[2] - m.rootAt[2]);
      return (d > 1 && stood < 1e-9) ? null
        : `the head moved ${d.toFixed(3)} mm and stands ${stood.toFixed(3)} mm from its own root on the mutant — it did not collapse onto the node`;
    } },

  /* ===================================================================
     THE SPHERE'S STEM CHANNEL (the sphere-stem session) — ST7-ST9. Each is a
     way the omission could be wrong while the export stays watertight, one
     piece, and the right triangle count for whatever it built. */
  { id: 'the-stem-channel-never-fires', why: 'the channel is computed and then thrown away, so every petal is built and the stem passes straight through the pole-most ones — watertight, one connected piece, and the only thing wrong with it is the picture',
    find: '  if (!plan || !plan.present || !fr.sphereMode) return null;',
    /* ST9 IS NOT ON THIS LIST AND CANNOT BE: this table calls `stemAssertions`
       and never `stemChannelAssertions`, which takes the EXPORTED STL — so ST9
       has no way to fire here and naming it reported MISSED, which is
       indistinguishable from a clause that is genuinely blind (`/plot`'s own
       lesson). ST9's own entanglement — its guard and its bar both read from
       the channel record — was found by RE-READING the clause and is fixed;
       THE WITNESS THAT CAN RUN IT IS BUILT NOW and is
       `tools/verify-bloom-stem-channel.mjs`, which parses this table's own
       `find`/`into` by id (so the mutation text has one owner), builds on the
       mutated module in Node, and hands ST9 the float32-rounded positions with
       the clause imported from the UNMUTATED harness. Both mutants fire there.
       They still do not belong on this list: naming a family a table cannot
       run reports MISSED, which is indistinguishable from a clause that is
       genuinely blind.

       AND BRINGING IT IN IS NOT ONE IMPORT — measured against this file
       rather than guessed, because that was the bar for doing it now (Eva,
       the sphere-stem session). This table is PAGE-driven: `page.route`
       serves the mutated geometry and every family reads `__bloomMetrics()`.
       It exports no STL anywhere, and ST9 takes exported positions. So it is
       either a NEW export capability here — download plumbing, plus a full
       export per mutant row on a matrix that already carries rows the
       generator REFUSES — or a SECOND COPY of the standalone tool's
       build-in-Node construction, which is the duplicate-owner trap this
       project keeps recording. Filed rather than started. */
    into: '  if (!plan || !plan.present || !fr.sphereMode || fr.sphereMode) return null;', names: ['ST7'],
    witness: (M, C) => { const m = channelFacts(M), c = channelFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.channel === null && c.channel !== null && m.built > c.built) ? null
        : `the mutant reports ${m.channel ? 'a channel' : 'no channel'} and built ${m.built} petals against the clean tree's ${c.built} — the omission did not stop`; } },

  { id: 'the-omission-renumbers', why: 'the whorl is run at the SURVIVING count instead of the asked-for one, so every petal takes the descriptor and the azimuth of a slot that is not its own — Eva\'s "do not impact anything else" broken in the one way no STL check can see',
    find: '      count: fr.rings.length,\n      radius: (i) => fr.rings[i].radius,',
    into: '      count: fr.rings.length - (omission ? omission.omitted.length : 0),\n      radius: (i) => fr.rings[i].radius,', names: ['ST7', 'ST8'],
    /* J1 AND Z1 ARE NOT ON THIS LIST, and both were over-claimed rather than
       blind by accident. The mutation runs the whorl at the SURVIVING count, so
       slot i takes a 6-slot whorl's azimuth instead of an 8-slot one — but the
       RADIUS callback still indexes `fr.rings[i]`, so every foot that IS built
       still sits on the cap its own ring declares, which is all J1 asserts; and
       Z1 is about a role's controls being visible iff the role is non-empty,
       where a CONTINUOUS sphere carries no slot roles at all. ST8 is the clause
       written for exactly this — the mask against a STEMLESS build of the same
       state — and it fires. */
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
    into: 'export const STEM_PETAL_CLEARANCE_MM = 0.05;', names: ['ST7'],      // ST9: see the note above — this table cannot run it; verify-bloom-stem-channel.mjs does, and this mutation is INERT below ~1 mm of separation
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
    /* RE-ANCHORED (#299's port): the cap edge now reads the stem's radius at
       the root through `stemOuterRAt`, which is `outerR` exactly without
       nodes; the mutation still swaps the outer radius for the bore. */
    find: '  const capArcMm = Rd * (Math.PI - Math.asin(Math.min(1, stemOuterRAt(plan, 0) / Rd)));',
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
    /* RE-ANCHORED (stem session 3): the ring is one `thetas.map` now, the
       one producer of a ring's vertices cut or uncut. */
    find: '  const ringAt = (rad, z) => thetas.map((th) => [rad * Math.cos(th), rad * Math.sin(th), z]);',
    into: '  const ringAt = (rad, z) => thetas.map((th) => [rad * Math.cos(th) + 1, rad * Math.sin(th), z]);', names: ['ST2'],
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

  /* ===== THE BORE'S TIP PLUG (the tip-plug session) ===== */

  { id: 'the-tip-plug-is-never-built', why: 'the bore runs all the way to the tip again, so a hollow stem ends as a CUT PIPE — watertight, one connected piece, the same shell count, and the only thing wrong with it is the picture Eva asked for',
    /* RE-ANCHORED (stem session 3): the plug is the cut's derived length
       under a florist's cut and Eva's wall otherwise; this removes BOTH. */
    find: '  const tipPlugMm = boreR > 0 ? (cutMade ? cutPlugMm : STEM_MIN_WALL_MM) : 0;',
    /* NAMES ST10 AND NOT ST1, WHICH IS A CORRECTION THE TABLE MADE RATHER THAN
       A JUDGEMENT: ST1 predicts the triangle count FROM THE PLAN, and this
       mutation moves the plan — it declares an open bottom and the builder
       emits one, so the two agree and ST1 is correctly blind. Measured SILENT
       before the claim came off. The clause is right; the claim was wrong. */
    into: '  const tipPlugMm = 0;', names: ['ST10'],
    witness: (M, C) => { const st = { ...STEM_STATE(), stemCut: 'FLAT' }; const m = plugFacts(M, st), c = plugFacts(C, st);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      /* THE BOTTOM FACE'S OWN AREA, on the FLAT end (stem session 3: under a
         cut the triangles at the tip's one height are the LAND alone, and the
         cut face's own witness is `endFaceFacts` below). On the clean tree it
         is a full disc; with the plug gone it is the tube's section, a
         quarter smaller at this diameter. A triangle COUNT would also move
         here, but the area is what says WHICH way — a count cannot tell a
         closed bottom from an open one with a different ladder. */
      return (m.bottomArea < c.bottomArea * 0.95) ? null
        : `the emitted bottom face measures ${m.bottomArea} mm^2 against the clean tree's ${c.bottomArea} — it did not re-open`; } },

  { id: 'the-tip-plug-is-typed', why: "the plug is a typed 3 mm instead of the wall Eva's own bore rule already spends — the SAME triangle count, the same shells, the same faces, and a closure that is no longer derived from anything",
    /* RE-ANCHORED (stem session 3). The typed 3 mm is probed on a FLAT
       stem below, where the clean plug is Eva's 1.5 and the cut arm is not
       taken; under the default cut the plug is 6.62 on the shipped stem and
       a typed 3 would be the bore opening through the face, which is
       `the-bore-opens-through-the-cut-face`'s own witness. */
    find: '  const tipPlugMm = boreR > 0 ? (cutMade ? cutPlugMm : STEM_MIN_WALL_MM) : 0;',
    into: '  const tipPlugMm = boreR > 0 ? (cutMade ? cutPlugMm : 3) : 0;', names: ['ST10'],
    /* THE ONE THAT ISOLATES ST10'S EXTENT CLAUSE. The bottom stays closed and
       the void keeps its own two-ring ladder, so the count is unmoved and ST1
       is blind by construction; the census, the flood fill, the orientation
       gate and the byte tool's own bottom-face clause are all blind for the
       same reason. What moved is WHERE the bore stops, and one clause reads
       that. */
    witness: (M, C) => { const st = { ...STEM_STATE(), stemCut: 'FLAT' }; const m = plugFacts(M, st), c = plugFacts(C, st);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      if (m.tris !== c.tris) return `the triangle count moved ${c.tris} -> ${m.tris}; this mutant's whole point is that it does not`;
      return (m.plugMm !== null && c.plugMm !== null && Math.abs(m.plugMm - c.plugMm) > 1) ? null
        : `the emitted plug is ${m.plugMm} mm against the clean tree's ${c.plugMm} — it did not move`; } },

  { id: 'the-two-closures-are-allowed-to-cross', why: 'the crossover is an absolute value instead of a floor, so where the root band and the tip plug MEET the builder emits a void anyway — one that runs out through the bottom of the stem',
    find: '  const voidMm = boreR > 0 ? Math.max(0, (voidTopZ - tipZ) - tipPlugMm) : 0;',
    into: '  const voidMm = boreR > 0 ? Math.abs((voidTopZ - tipZ) - tipPlugMm) : 0;', names: ['ST10'],
    /* ST10 AND NOT ST1, FOR THE SAME REASON AS THE MUTANT ABOVE, and the table
       said so twice before the claim came off. ST1 predicts the triangle count
       FROM THE PLAN and compares it against the BUILDER — both of its sides
       read `voidMm`, so a mutation INSIDE the plan moves the prediction and the
       emission together and ST1 is green by construction. That is not a hole in
       ST1: it is a builder-against-plan consistency check and says so, and it
       catches a builder that ignores the plan. What checks the PLAN'S OWN LAW
       is ST10, whose bar is Eva's stated wall and whose measurement is where
       the emitted rings stand. */
    /* PROBED ON THE CROSSOVER STATE, because everywhere else the two
       expressions agree exactly: `Math.max(0, x)` and `Math.abs(x)` are the
       same number for every non-negative x, and the void is non-negative on
       every state but this one. A mutation is invisible wherever the law it
       replaces happens to agree with it (`bore-is-not-evas-rule`'s own lesson),
       so the witness has to be driven where they part. */
    witness: (M, C) => { const st = { ...REGISTRY_DEFAULTS, placement: 'CONTINUOUS', hubShape: 'SPHERE', petalCount: 3, spread: 0.6, layerSize: 0.35, stemLength: 1, stemDiameter: 12 };
      const m = plugFacts(M, st), c = plugFacts(C, st);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      if (c.emittedVoid) return 'the CLEAN tree already emits a void on the crossover state — the probe is not the crossover';
      return m.emittedVoid ? null : 'the mutant emitted no void on the crossover state either — the two closures still cannot cross'; } },

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
    /* NAMES ST11, NOT ST5 (corrected by the stem-nodes session): this claim was
       SILENT on `main` at 21ddbbd, measured on a worktree of it. ST5 asserts the
       join's THICKNESS and its active/inert state, which this mutation does not
       move. What moves is the blend radius, which since the hub-shape session
       (#242) is ST11's `the hub declares the join blending out at ...`, and ST11
       is exactly what fired. The claim was stale; the check was right. */
    into: '  return hubT + joinT * Math.sqrt(Math.log(hubR / rr) / denom);', names: ['ST11'],
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

  /* ===================================================================
     THE NU COUPLING (#303's finding, fixed) — LF10. The leaf is pinned to its
     own row count; un-pinning it lets the blade read whatever `NU` the last
     petal left, which doubles its rows under a ramped tip and moves nothing an
     STL gate can see. Witnessed on the MUTATED module: a bloom at petalTipShape
     3.00 is built first (so NU is left at 112, exactly as in one real build),
     then one leaf, and its emitted row count is compared with the clean tree's. */
  { id: 'the-leaf-reads-the-petals-nu', why: "the leaf blade's row count is the last petal's ramped NU rather than its own, so petalTipShape doubles a leaf's lattice while leafTipShape moves nothing",
    find: '  const nu = LEAF_BLADE_ROWS;\n  const cap = { petiole: true, rowCapacity: nu };',
    into: '  const nu = NU;\n  const cap = { petiole: true, rowCapacity: nu };', names: ['LF10'],
    witness: (M, C) => {
      const rowsAfterRamp = (MOD) => {
        try {
          const st = { ...REGISTRY_DEFAULTS, stemLength: 70, stemDiameter: 6, leafLength: 52, leafWidth: 17, leafNodes: 1, petalTipShape: 3 };
          const acc = new MOD.MeshBuilder({ exportMode: true });
          MOD.buildBloomInto(acc, st);
          const fr = MOD.footRing(st, acc);
          const plan = MOD.leafPlan(st, MOD.stemPlan(st, fr.hub, acc), acc);
          return MOD.buildLeafInto(new MOD.MeshBuilder({ exportMode: true }), plan, st, 0, 0).rowHalfBaseMm.length - 1;
        } catch (e) { return `threw: ${e.message}`; }
      };
      const m = rowsAfterRamp(M), c = rowsAfterRamp(C);
      return (c === 56 && m === 112) ? null : `after a ramped bloom the leaf is built on ${m} rows on the mutant and ${c} on the clean tree — the behaviour did not move`; } },

  /* ===================================================================
     THE LEAF TIP (the leaf tip-shape session) — LF9. The family was added, so
     the table runs it. Two mutations, each the plausible way the control could
     be wired wrong while every other family and both STL gates stay green: a
     blade that ignores the control and keeps the retired constant (the plan
     still reports the control, so only the READ-BACK clause can see it — the
     whole reason LF9 has a clause (b)), and a clamp record that lies about
     where the terminal begins (the read-out would print the lie, and nothing
     else reads that record). Both witnessed on the MUTATED module's own
     builder output in Node, never on the assertion they name. */
  { id: 'leaf-tip-ignores-the-control', why: 'the blade is built at the retired constant whatever the slider says, while the plan reports the slider — hidden-and-not-inert with a truthful-looking record beside it',
    find: '    petalTipShape: Number(state.leafTipShape),',
    into: '    petalTipShape: LEAF_TIP_SHAPE,', names: ['LF9'],
    witness: (M, C) => { const m = leafFacts(M, 0.6), c = leafFacts(C, 0.6);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      /* The rows the blade was built from at 0.60 differ between the trees
         (the mutant's are the 1.30 outline), while the plan's record agrees. */
      return (m.plan.tipShape === 0.6 && c.plan.tipShape === 0.6 && m.rowsDiffer(c) && m.clamp.fromU !== c.clamp.fromU) ? null
        : `the mutant's blade rows ${m.rowsDiffer(c) ? 'differ' : 'AGREE'} with the clean tree's at 0.60 (plan says ${m.plan.tipShape} / ${c.plan.tipShape}) — the behaviour did not move`; } },

  { id: 'leaf-clamp-record-lies', why: 'the clamp record places the terminal at the widest point, so the read-out prints a stub covering the whole tip on every leaf; the blade itself is untouched, so only the biconditional against its rows can see it',
    /* RE-ANCHORED (leaf/stem build S3): the clamp record moved into
       `emitLeafBladeInto`, which reads the blade's own `widthMm` (a leaflet's,
       or the simple leaf's `plan.widthMm`). */
    /* (re-anchored S5: the record gained the nib's own fields) */
    find: '    const fromU = hi, ap = tipProf.apex;',
    into: '    const fromU = tipProf.uPk, ap = tipProf.apex;', names: ['LF9'],
    witness: (M, C) => { const m = leafFacts(M, 1.3), c = leafFacts(C, 1.3);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.clamp.fromU < c.clamp.fromU - 0.1 && !m.rowsDiffer(c)) ? null
        : `the mutant's clamp station is ${m.clamp.fromU} against ${c.clamp.fromU} and its rows ${m.rowsDiffer(c) ? 'moved' : 'held'} — the record did not move on its own`; } },

  /* ===================================================================
     THE LEAF POSE AND THE TOOTH FLOOR (leaf/stem build S2) — LF11, LF12,
     LF13. Three families were added, so the table runs them, each on a
     mutation that is the plausible way its control could be wired wrong while
     both STL gates stay green (an arched, cupped or floored leaf is still one
     closed blade on its petiole). Every witness reads the MUTATED module's own
     builder output in Node on the table's S2 row, never the assertion it
     names. */
  { id: 'the-leaf-arch-is-ignored', why: 'the blade is built straight whatever the arch slider says, while the plan reports the slider — a dead control with a truthful-looking record beside it',
    find: '    petalSpineCurl: state.leafArch === undefined || Number(state.leafArch) === 0 ? 0 : -Number(state.leafArch),',
    into: '    petalSpineCurl: 0,', names: ['LF11'],
    witness: (M, C) => { const m = leafPoseFacts(M), c = leafPoseFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.rep.arch.turnRad === 0 && c.rep.arch.turnRad !== 0 && m.tipCentreDiffers(c)) ? null
        : `the mutant's arch turn is ${m.rep.arch.turnRad} against ${c.rep.arch.turnRad} and its tip centre ${m.tipCentreDiffers(c) ? 'moved' : 'held'} — the behaviour did not move`; } },
  { id: 'the-leaf-cup-is-the-constant', why: 'the blade is cupped by the retired constant LEAF_CUP whatever the cup slider says — the control reaches nothing',
    find: '    petalCup: state.leafCup === undefined ? LEAF_CUP : Number(state.leafCup),',
    into: '    petalCup: LEAF_CUP,', names: ['LF12'],
    witness: (M, C) => { const m = leafPoseFacts(M), c = leafPoseFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.liftDiffers(c) && m.rep.cup.coefficient !== c.rep.cup.coefficient) ? null
        : `the mutant's margin lifts ${m.liftDiffers(c) ? 'differ from' : 'AGREE with'} the clean tree's — the behaviour did not move`; } },
  { id: 'the-tooth-floor-is-removed', why: 'the leaf cuts its teeth at whatever relief the depth asks, under the minimum feature — the ruling undone, and every tooth still a closed blade',
    find: '  cap.toothReliefFloorMm = MIN_FEATURE_MM;',
    into: '  cap.toothReliefFloorMm = 0;', names: ['LF13'],
    witness: (M, C) => { const m = leafPoseFacts(M), c = leafPoseFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const ms = m.rep.serration, cs = c.rep.serration;
      return (ms && cs && Math.min(...ms.sinusReliefMm) < 1 && Math.min(...cs.sinusReliefMm) >= 1 - 1e-6) ? null
        : `the mutant's shallowest sinus relief is ${ms ? Math.min(...ms.sinusReliefMm) : 'n/a'} against the clean tree's ${cs ? Math.min(...cs.sinusReliefMm) : 'n/a'} — the behaviour did not move`; } },
  { id: 'the-floor-is-recorded-and-not-cut', why: 'the record says the relief was floored to the minimum feature and the outline is cut at the asked relief — the read-out tells a floor the print does not carry',
    find: '    const reliefMm = sinusD.map((dd) => Math.floor(Math.min(reliefBuiltMm, headroomOf(dd)) / LOBE_RELIEF_GRID) * LOBE_RELIEF_GRID);',
    into: '    const reliefMm = sinusD.map((dd) => Math.floor(Math.min(reliefAskedMm, headroomOf(dd)) / LOBE_RELIEF_GRID) * LOBE_RELIEF_GRID);', names: ['LF13'],
    witness: (M, C) => { const m = leafPoseFacts(M), c = leafPoseFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const ms = m.rep.serration, cs = c.rep.serration;
      return (ms && cs && ms.reliefBuiltMm === cs.reliefBuiltMm && ms.reliefFloored && Math.min(...ms.sinusReliefMm) < 1 - 1e-6) ? null
        : `the mutant's record reads relief ${ms ? ms.reliefBuiltMm : 'n/a'} (floored ${ms ? ms.reliefFloored : 'n/a'}) with a shallowest cut sinus of ${ms ? Math.min(...ms.sinusReliefMm) : 'n/a'} — the record and the cut did not part`; } },

  /* ===================================================================
     THE COMPOUND LEAF (leaf/stem build S3) — LF14, LF15, LF16, LF17. Four
     families were added, so the table runs them, each on a mutation that is
     the plausible way the compound tree could be wired wrong while both STL
     gates stay green (every leaflet and rod is a closed shell overlapping its
     neighbour, so a missing leaflet, a stalk that stops short, a terminal off
     the tip, a buried base and a rod of the wrong radius ALL export
     watertight). Every witness reads the MUTATED module's own build on the
     table's compound row — at sheet 2.4, where the petiole is 1.2 mm in
     radius and a typed 0.6 rod is not the derived one (at the shipped sheet
     they are the same double, so the witness state is part of the claim) —
     never the assertion it names. */
  { id: 'the-leaf-type-is-ignored', why: 'the plan never lays out a compound tree, so a COMPOUND ask builds a simple blade while the Leaflets drop-down shows — twelve controls reaching nothing',
    find: '  const compoundRec = leafIsCompound(state) ? compoundLeafPlan(state, lengthMm, petioleR0, stem, angleDeg) : null;',
    into: '  const compoundRec = null;', names: ['LF14'],
    witness: (M, C) => { const m = compoundFacts(M, CPD_WIT), c = compoundFacts(C, CPD_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.plan.compound === null && c.plan.compound && !m.rep.compound && c.rep.compound) ? null
        : `the mutant's plan ${m.plan.compound ? 'carries' : 'has no'} compound layout and its leaf ${m.rep.compound ? 'is' : 'is not'} compound — the behaviour did not move`; } },
  { id: 'the-leaflet-controls-leak-into-the-simple-leaf', why: 'a SIMPLE leaf turns compound when the hidden leaflet-pairs slider is at its maximum — hidden and NOT inert',
    find: "export function leafIsCompound(state) { return String(state.leafType) === 'COMPOUND'; }",
    into: "export function leafIsCompound(state) { return String(state.leafType) === 'COMPOUND' || Number(state.leafletPairs) >= 4; }", names: ['LF14'],
    witness: (M, C) => { const m = compoundFacts(M, SIMPLE_WIT), c = compoundFacts(C, SIMPLE_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.rep && m.rep.compound && c.rep && !c.rep.compound) ? null
        : `on SIMPLE with leafletPairs 4 the mutant's leaf ${m.rep && m.rep.compound ? 'is' : 'is not'} compound and the clean tree's ${c.rep && c.rep.compound ? 'is' : 'is not'} — the leak did not happen`; } },
  { id: 'a-lateral-leaflet-is-not-built', why: 'the first lateral leaflet is laid out and never emitted — a pair with one leaflet, watertight and one piece',
    find: '  const specs = cp.leaflets.map((sp) => ({ ...sp, ...leafletOf(sp) }));',
    into: '  const specs = cp.leaflets.slice(1).map((sp) => ({ ...sp, ...leafletOf(sp) }));', names: ['LF15'],
    witness: (M, C) => { const m = compoundFacts(M, CPD_WIT), c = compoundFacts(C, CPD_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.rep.leaflets.length === c.rep.leaflets.length - 1) ? null
        : `the mutant emits ${m.rep.leaflets.length} leaflets against the clean tree's ${c.rep.leaflets.length} — the behaviour did not move`; } },
  { id: 'the-stalk-stops-short-of-the-blade', why: "each stalk ends AT its leaflet's base row instead of reaching through the beaded base into the full sheet — the leaflet held at the tip of its own bead",
    find: '    const len = F.stalkMm + sp.embedMm;',
    into: '    const len = F.stalkMm;', names: ['LF16'],
    witness: (M, C) => { const m = compoundFacts(M, CPD_WIT), c = compoundFacts(C, CPD_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const len = (r) => Math.hypot(r.end[0] - r.root[0], r.end[1] - r.root[1], r.end[2] - r.root[2]);
      return (len(m.rep.stalkRods[0]) < len(c.rep.stalkRods[0]) - 0.1) ? null
        : `the mutant's first stalk is ${len(m.rep.stalkRods[0])} mm against the clean tree's ${len(c.rep.stalkRods[0])} — the behaviour did not move`; } },
  { id: 'the-terminal-leaves-the-rachis-tip', why: "the terminal leaflet is rooted 1.5 mm off the rachis's tip along the rachis's normal — a leaflet floating beside the axis rod",
    find: '    if (sp.role === \'terminal\') return { root: tipC, D: FE.D, T, N: FE.N, stalkMm: cp.terminalStalkMm };',
    into: '    if (sp.role === \'terminal\') return { root: [tipC[0] + 1.5 * FE.N[0], tipC[1] + 1.5 * FE.N[1], tipC[2] + 1.5 * FE.N[2]], D: FE.D, T, N: FE.N, stalkMm: cp.terminalStalkMm };', names: ['LF16'],
    witness: (M, C) => { const m = compoundFacts(M, CPD_WIT), c = compoundFacts(C, CPD_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const off = (r) => { const q = r.leaflets.at(-1).root, t = r.rachis.tipC; return Math.hypot(q[0] - t[0], q[1] - t[1], q[2] - t[2]); };
      return (off(m.rep) > 1 && off(c.rep) < 1e-9) ? null
        : `the mutant's terminal stands ${off(m.rep)} mm off the rachis tip against the clean tree's ${off(c.rep)} — the behaviour did not move`; } },
  { id: 'the-leaflet-base-is-buried', why: "every leaflet's base is emitted as the simple blade's buried end (a square step) instead of closing on the bead — a free base that is not free",
    find: '  const baseExposed = !!panel.baseExposed && !per;',
    into: '  const baseExposed = false;', names: ['LF16'],
    witness: (M, C) => { const m = compoundFacts(M, CPD_WIT), c = compoundFacts(C, CPD_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (!(m.rep.leaflets[0].rim.baseAxisMm > 0) && c.rep.leaflets[0].rim.baseAxisMm > 0) ? null
        : `the mutant's first leaflet reports a base semi-axis of ${m.rep.leaflets[0].rim.baseAxisMm} against the clean tree's ${c.rep.leaflets[0].rim.baseAxisMm} — the behaviour did not move`; } },
  /* THE RETUNE (Eva's rulings on #380, Oct 7): S3's `the-rod-floor-is-removed`
     is RETIRED with the law it mutated — the rachis and stalks are the wire
     now, not an area rule floored at it, so there is no floor left to remove.
     Its place is taken by the four ways the thicker petiole could be wrong,
     the rachis taking the petiole's thickening, the exemption widened, and
     the leaflets reading the SIMPLE leaf's depth or tip. */
  { id: 'the-rods-are-typed', why: "every stalk is a typed 0.6 mm radius whatever the sheet (S3c: the rachis tapers from the wire floor, so the stalks are what this reaches) — the lab's own constant, invisible at the shipped sheet where the wire is the same double",
    find: 'export function compoundRodRadiusMm(wireR) {\n  return wireR;\n}',
    into: 'export function compoundRodRadiusMm(wireR) {\n  return 0.6;\n}', names: ['LF17', 'LF18'],
    witness: (M, C) => { const m = compoundFacts(M, CPD_WIT), c = compoundFacts(C, CPD_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.plan.compound.stalkR === 0.6 && c.plan.compound.stalkR > 0.6 + 1e-6) ? null
        : `the mutant's stalk radius is ${m.plan.compound.stalkR} against the clean tree's ${c.plan.compound.stalkR} at sheet 2.4 — the behaviour did not move`; } },
  { id: 'the-petiole-is-the-wire', why: 'the area rule is never read upward — the compound petiole is the 1.2 mm wire carrying five leaflets, the S3 tree Eva ruled against',
    find: '  return wireR * Math.sqrt(count);',
    into: '  return wireR;', names: ['LF17', 'LF18'],
    witness: (M, C) => { const m = compoundFacts(M, CPD_WIT), c = compoundFacts(C, CPD_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.plan.petioleR < c.plan.petioleR - 0.1) ? null
        : `the mutant's petiole is ${m.plan.petioleR} mm in radius against the clean tree's ${c.plan.petioleR} — the behaviour did not move`; } },
  { id: 'the-petiole-clamp-is-removed', why: "the area rule's ask is built whatever the stem — on a 3 mm stem at 70 degrees a 3.60 mm petiole whose rooted end stands outside the stem it is meant to root through",
    find: '  const radiusMm = thickens ? Math.max(wireR, Math.min(askedMm, capMm)) : wireR;',
    into: '  const radiusMm = thickens ? Math.max(wireR, askedMm) : wireR;', names: ['LF17', 'LF18'],
    witness: (M, C) => { const m = compoundFacts(M, CLAMP_WIT), c = compoundFacts(C, CLAMP_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.plan.petioleR > c.plan.petioleR + 0.1 && m.rep.petioleRootReachMm > m.plan.outerR) ? null
        : `the mutant's petiole is ${m.plan.petioleR} mm (root reach ${m.rep.petioleRootReachMm}) against the clean tree's ${c.plan.petioleR} — the behaviour did not move`; } },
  { id: 'the-petiole-cap-is-the-outer-radius', why: "the cap is read as the stem's own radius rather than where the rooted END fits — a petiole as wide as the stem, its end standing proud at any angle but square",
    find: 'export function petioleRootCapMm(wall, thRad) {',
    into: 'export function petioleRootCapMm(wall, thRad) { if (wall) return wall.outerR;', names: ['LF17', 'LF18'],
    witness: (M, C) => { const m = compoundFacts(M, CLAMP_WIT), c = compoundFacts(C, CLAMP_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (Math.abs(m.plan.compound.petiole.capMm - m.plan.outerR) < 1e-12 && c.plan.compound.petiole.capMm < c.plan.outerR - 0.1) ? null
        : `the mutant caps at ${m.plan.compound.petiole.capMm} mm against the clean tree's ${c.plan.compound.petiole.capMm} (outer ${c.plan.outerR}) — the behaviour did not move`; } },
  /* ===================================================================
     THE LOBED (CHEVRON) LEAF (leaf/stem build S4) — LF19..LF24. Every
     mutation leaves a watertight, one-piece leaf at the identical triangle
     count (the chevron is one panel on a fixed lattice), so both STL gates
     are blind to all of it. Each witness reads the MUTATED module's own build
     of the matching table row, never the assertion it names. THE LAB'S C2
     FOLD (40 teeth at depth 0.5) IS NOT REACHABLE ON THIS TREE, for two
     independent reasons — the tooth slider tops out at 12, and the shipped
     tooth law's resolution floor builds at most 10 teeth on the 112-row blade
     whatever is asked — so the tooth clamp's removal is witnessed where it IS
     reachable: the declared fold margin crossed on the emitted lattice (6 lobes
     at depth 0.3). The TILT cap's removal reaches a true inverted cell. */
  { id: 'the-lobed-type-is-ignored', why: 'the plan never builds a chevron, so a LOBED ask builds the simple blade while the Lobes drop-down shows — eight controls reaching nothing',
    find: '  const lobed = leafIsLobed(state);\n  const widthMm = lobed ?',
    into: '  const lobed = false;\n  const widthMm = lobed ?', names: ['LF19'],
    witness: (M, C) => { const m = compoundFacts(M, LOB_WIT), c = compoundFacts(C, LOB_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.plan.type === 'SIMPLE' && c.plan.type === 'LOBED') ? null : `the mutant builds a ${m.plan.type} leaf against the clean tree's ${c.plan.type} — the behaviour did not move`; } },
  { id: 'the-lobed-controls-leak-into-the-simple-leaf', why: 'a SIMPLE leaf turns lobed when the hidden lobes slider is at its maximum — hidden and NOT inert',
    find: "export function leafIsLobed(state) { return String(state.leafType) === 'LOBED'; }",
    into: "export function leafIsLobed(state) { return String(state.leafType) === 'LOBED' || Number(state.lobedLobes) >= 6; }", names: ['LF19'],
    witness: (M, C) => { const m = compoundFacts(M, SIMPLE_LOB_WIT), c = compoundFacts(C, SIMPLE_LOB_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.plan.type === 'LOBED' && c.plan.type === 'SIMPLE') ? null : `on SIMPLE with 6 lobes the mutant builds ${m.plan.type} and the clean tree ${c.plan.type} — the leak did not happen`; } },
  { id: 'a-lobe-is-dropped', why: 'the chevron law cuts one lobe FEWER than the plan declares — the record says 3, the outline carries 2, watertight and one piece',
    find: '    const ph = ((u - from) / (to - from)) * lobes;',
    into: '    const ph = ((u - from) / (to - from)) * (lobes - 1);', names: ['LF20'],
    witness: (M, C) => { const m = compoundFacts(M, LOB_WIT), c = compoundFacts(C, LOB_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const mins = (r) => { const H = r.lobed.rowHalfLobeMm, U = r.lobed.rowU; let n = 0; for (let j = 1; j + 1 < H.length; j++) if (U[j] > 0.08 && U[j] < 0.8 && H[j] < H[j - 1] && H[j] <= H[j + 1]) n++; return n; };
      /* (S4c: the mutated law's sinuses no longer sit where its round bottoms
         look for them, so the count YIELDS — the record declares the BUILT
         count, and the defect is that the outline carries fewer than it) */
      return (mins(c.rep) === c.rep.lobed.lobes && mins(m.rep) < m.rep.lobed.lobes) ? null : `the mutant declares ${m.rep.lobed.lobes} lobes and draws ${mins(m.rep)} sinuses against the clean tree's ${c.rep.lobed.lobes} and ${mins(c.rep)} — the behaviour did not move`; } },
  { id: 'the-rows-do-not-lean', why: "the emitted rows lean at HALF the tilt the record declares — every lobe pointing forward at the wrong angle, the record unmoved",
    find: '    const tau = tauAt(u), sn = Math.sin(tau), cs = Math.cos(tau);',
    into: '    const tau = tauAt(u), sn = Math.sin(0.5 * tau), cs = Math.cos(0.5 * tau);', names: ['LF21'],
    witness: (M, C) => { const m = compoundFacts(M, LOB_WIT), c = compoundFacts(C, LOB_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const sk = (r) => r.lobed.skin[40], d = Math.hypot(...sk(m.rep).at(-1).map((x, k) => x - sk(c.rep).at(-1)[k]));
      return (m.rep.lobed.tiltBuiltRad === c.rep.lobed.tiltBuiltRad && d > 0.5) ? null : `the mutant's margin point moved ${d} mm with the declared tilt ${m.rep.lobed.tiltBuiltRad} against ${c.rep.lobed.tiltBuiltRad} — the behaviour did not move`; } },
  { id: 'the-tilt-cap-is-removed', why: 'the asked lobe angle is built whatever the outline does — at 60 degrees the outer cells where the tilt eases out fold inside-out, watertight and one piece',
    find: '  if (!(asked > 0) || ok(asked)) return { tauRad: asked, clamped: false };',
    into: '  return { tauRad: asked, clamped: false };', names: ['LF22'],
    witness: (M, C) => { const m = compoundFacts(M, TILT_WIT), c = compoundFacts(C, TILT_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const am = minSkinArea(m.rep, m.plan), ac = minSkinArea(c.rep, c.plan);
      return (m.rep.lobed.tiltBuiltRad > c.rep.lobed.tiltBuiltRad + 1e-3 && am < 0 && ac > 0) ? null : `the mutant builds ${m.rep.lobed.tiltBuiltRad} rad (smallest skin cell ${am} mm^2) against the clean ${c.rep.lobed.tiltBuiltRad} (${ac}) — no fold reached`; } },
  { id: 'the-tooth-fold-clamp-is-removed', why: "the teeth are cut at the floored ask past the fold cap — on 5 lobes x 2 teeth at depth 0.3 the innermost cells advance under the declared margin (the lab's C2 itself is unreachable here)",
    find: '      if (foldCapMm < reliefFlooredMm) { reliefBuiltMm = foldCapMm; foldClamped = true; }',
    into: '      if (false) { reliefBuiltMm = foldCapMm; foldClamped = true; }', names: ['LF22', 'LF23'],
    witness: (M, C) => { const m = compoundFacts(M, FOLD_WIT), c = compoundFacts(C, FOLD_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const ms = m.rep.serration, cs = c.rep.serration, am = innerAdvanceMin(m.rep);
      return (ms.reliefBuiltMm > ms.foldCapMm + 1 && cs.reliefBuiltMm === cs.foldCapMm && am < 0.5) ? null : `the mutant cuts ${ms.reliefBuiltMm} mm on a cap of ${ms.foldCapMm} (inner advance ${am}) against the clean ${cs.reliefBuiltMm} — the behaviour did not move`; } },
  { id: 'the-fold-clamp-is-not-told', why: 'the teeth are clamped at the fold cap and the record says they were not — the read-out prints the asked relief beside teeth built shallower',
    find: '      if (foldCapMm < reliefFlooredMm) { reliefBuiltMm = foldCapMm; foldClamped = true; }',
    into: '      if (foldCapMm < reliefFlooredMm) { reliefBuiltMm = foldCapMm; }', names: ['LF23'],
    witness: (M, C) => { const m = compoundFacts(M, FOLD_WIT), c = compoundFacts(C, FOLD_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.rep.serration.foldClamped === false && c.rep.serration.foldClamped === true && m.rep.serration.reliefBuiltMm === c.rep.serration.reliefBuiltMm) ? null : `the mutant reports foldClamped ${m.rep.serration.foldClamped} at ${m.rep.serration.reliefBuiltMm} mm against the clean ${c.rep.serration.foldClamped} — the behaviour did not move`; } },
  { id: 'no-tooth-fits-and-teeth-are-cut-anyway', why: 'where the fold cap is under the 1 mm floor the teeth are cut at the cap anyway — notches under the printable minimum, the NONE-FIT case never told',
    find: '      if (reliefFloorMm > 0 && foldCapMm < reliefFloorMm) {',
    into: '      if (false) {', names: ['LF23'],
    witness: (M, C) => { const m = compoundFacts(M, NONEFIT_WIT), c = compoundFacts(C, NONEFIT_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.rep.serration.countBuilt > 0 && m.rep.serration.reliefBuiltMm < 1 && c.rep.serration.countBuilt === 0) ? null : `the mutant cuts ${m.rep.serration.countBuilt} teeth at ${m.rep.serration.reliefBuiltMm} mm against the clean tree's ${c.rep.serration.countBuilt} — the behaviour did not move`; } },
  { id: 'the-petiole-stops-at-the-chevron-apex-row', why: "the petiole runs into the blade by one row only, not by the first row's V depth as well — the outer columns of the first row stand off the rod",
    find: '  const lobedEmbedMm = lobedRow0 ? lobedRow0.h * Math.sin(lobedRow0.tau) + lobedSt[1] * Lmm : 0;',
    into: '  const lobedEmbedMm = lobedRow0 ? lobedSt[1] * Lmm : 0;', names: ['LF24'],
    witness: (M, C) => { const m = compoundFacts(M, LOB_WIT), c = compoundFacts(C, LOB_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.rep.lobed.embedMm < c.rep.lobed.embedMm - 0.1) ? null : `the mutant runs the petiole ${m.rep.lobed.embedMm} mm into the blade against the clean ${c.rep.lobed.embedMm} — the behaviour did not move`; } },
  /* THE S4b MUTANTS (Eva's rulings of Oct 8: round the sinus bottom; scale
     the lobed petiole by blade area). Each is witnessed on the MUTATED
     module's own build of `LOB_WIT` — the shipped lobed leaf, whose first two
     sinuses ask a V narrower than 1 mm and are rounded — never on the clause
     it names. */
  { id: 'the-v-bottom-is-restored', why: 'the round bottoms are planned and recorded and never reach the outline — the sinuses are cut to their V again, under the 1 mm opening, while the record says widened',
    find: '      ...(round.roundAt ? { roundAt: round.roundAt } : {}),',
    into: '', names: ['LF25'],
    witness: (M, C) => { const m = compoundFacts(M, S4B_WIT), c = compoundFacts(C, S4B_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      /* the U keeps the depth and takes the FLANKS: the clean tree's rows sit
         under the mutant's V somewhere, and nowhere above it */
      const H = m.rep.lobed.rowHalfLobeMm, Hc = c.rep.lobed.rowHalfLobeMm;
      let taken = 0, over = 0;
      for (let j = 0; j < H.length; j++) { taken = Math.max(taken, H[j] - Hc[j]); over = Math.max(over, Hc[j] - H[j]); }
      return (m.rep.lobed.roundBottoms.built > 0 && taken > 0.05 && over === 0) ? null : `the clean round bottoms take at most ${taken} mm off the mutant's V rows (and add ${over}) with ${m.rep.lobed.roundBottoms.built} bottoms recorded — the behaviour did not move`; } },
  { id: 'the-round-bottom-is-a-constant-radius', why: 'the U is typed at a 0.35 mm radius and never grown to the opening it exists for — a round bottom that is round and still under 1 mm',
    find: '    let W = rec.need ? uAt(D / 2) : null, o = W && W.U ? openingWith(W.U, su) : null;\n    if (W && W.U && !(o >= D)) {',
    into: '    let W = rec.need ? uAt(0.35) : null, o = W && W.U ? openingWith(W.U, su) : null;\n    if (false) {', names: ['LF25'],
    witness: (M, C) => { const m = compoundFacts(M, S4B_WIT), c = compoundFacts(C, S4B_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const ms = m.rep.lobed.roundBottoms.sinuses.filter((r) => r.built), cs = c.rep.lobed.roundBottoms.sinuses.filter((r) => r.built);
      return (ms.length && ms.every((r) => r.radiusMm === 0.35) && ms.some((r) => r.openingBuiltMm < 1) && cs.every((r) => r.openingBuiltMm >= 1)) ? null : `the mutant builds radii ${ms.map((r) => r.radiusMm)} opening ${ms.map((r) => r.openingBuiltMm)} against the clean ${cs.map((r) => r.openingBuiltMm)} — the behaviour did not move`; } },
  { id: 'the-round-bottom-is-not-told', why: 'the sinus is widened and the record says it was not — the read-out prints no widening beside a bottom that was rounded',
    find: '    rec.built = true; rec.radiusMm = W.R; rec.openingBuiltMm = o;',
    into: '    rec.built = false; rec.radiusMm = W.R; rec.openingBuiltMm = o;', names: ['LF25'],
    witness: (M, C) => { const m = compoundFacts(M, S4B_WIT), c = compoundFacts(C, S4B_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const same = m.rep.lobed.rowHalfLobeMm.every((h, j) => h === c.rep.lobed.rowHalfLobeMm[j]);
      return (same && m.rep.lobed.roundBottoms.sinuses.every((r) => !r.built) && c.rep.lobed.roundBottoms.sinuses.some((r) => r.built)) ? null : `the mutant's outline is ${same ? 'the clean one' : 'MOVED'} with ${m.rep.lobed.roundBottoms.sinuses.filter((r) => r.built).length} bottoms told — the behaviour did not move`; } },
  { id: 'the-lobed-petiole-is-the-wire', why: 'the area law is computed and recorded and the rod is built at the wire anyway — the read-out says asked -> built on a petiole that was never thickened',
    find: '  const petioleR = compoundRec ? compoundRec.petiole.radiusMm : lobedPetiole ? lobedPetiole.radiusMm : simplePetiole ? simplePetiole.radiusMm : petioleR0;',
    into: '  const petioleR = compoundRec ? compoundRec.petiole.radiusMm : simplePetiole ? simplePetiole.radiusMm : petioleR0;', names: ['LF26'],
    witness: (M, C) => { const m = compoundFacts(M, LOB_WIT), c = compoundFacts(C, LOB_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.plan.petioleR === m.plan.lobedPetiole.wireR && c.plan.petioleR > c.plan.lobedPetiole.wireR) ? null : `the mutant builds the petiole at ${m.plan.petioleR} mm against the clean ${c.plan.petioleR} — the behaviour did not move`; } },
  { id: 'the-petiole-is-sized-from-the-envelope-box', why: "the petiole reads the envelope's bounding box (its width times its length) rather than the blade's own area — the sinuses' missing area thickens the rod",
    find: '  const areaMm2 = lobedBladeAreaMm2(lobedOutline(state, Lmm, true), Lmm);',
    into: '  const areaMm2 = Number(lobedBladeState(state).petalWidth) * Lmm;', names: ['LF26'],
    witness: (M, C) => { const m = compoundFacts(M, LOB_WIT), c = compoundFacts(C, LOB_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.plan.lobedPetiole.areaMm2 > 1.5 * c.plan.lobedPetiole.areaMm2) ? null : `the mutant sizes on ${m.plan.lobedPetiole.areaMm2} mm^2 against the clean ${c.plan.lobedPetiole.areaMm2} — the behaviour did not move`; } },
  /* THE S4c MUTANTS (Eva's rulings of Oct 9: the sinus roundness, the
     lobe-count yield, the lobed tooth count). Each is witnessed on the MUTATED
     module's own build, never on the clause it names. */
  { id: 'the-roundness-is-ignored', why: 'the roundness control is read and recorded and every sinus is built at the print minimum anyway — S4b exactly, a slider that moves nothing',
    find: '      const Rask = Math.floor((roundness * rec.pitchMm) / LOBE_RELIEF_GRID) * LOBE_RELIEF_GRID;',
    into: '      const Rask = 0 * Math.floor((roundness * rec.pitchMm) / LOBE_RELIEF_GRID) * LOBE_RELIEF_GRID;', names: ['LF27'],
    witness: (M, C) => { const m = compoundFacts(M, LOB_WIT), c = compoundFacts(C, LOB_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const rm = Math.max(...m.rep.lobed.roundBottoms.sinuses.map((r) => r.radiusMm || 0)), rc = Math.max(...c.rep.lobed.roundBottoms.sinuses.map((r) => r.radiusMm || 0));
      return (rm <= 0.5 + 1e-9 && rc > rm + 0.5) ? null : `the mutant's largest built radius is ${rm} mm against the clean ${rc} — the behaviour did not move`; } },
  { id: 'the-radius-is-typed', why: 'the asked radius is a fraction of a typed 10 mm instead of the lobe pitch — every sinus asks the same radius whatever the lobes are spaced at',
    find: '      const Rask = Math.floor((roundness * rec.pitchMm) / LOBE_RELIEF_GRID) * LOBE_RELIEF_GRID;',
    into: '      const Rask = Math.floor((roundness * 10) / LOBE_RELIEF_GRID) * LOBE_RELIEF_GRID;', names: ['LF27'],
    witness: (M, C) => { const m = compoundFacts(M, LOB_WIT), c = compoundFacts(C, LOB_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const am = m.rep.lobed.roundBottoms.sinuses.map((r) => r.radiusAskedMm), ac = c.rep.lobed.roundBottoms.sinuses.map((r) => r.radiusAskedMm);
      return (am.every((x) => x === am[0]) && new Set(ac).size > 1) ? null : `the mutant asks radii ${am} against the clean ${ac} — the behaviour did not move`; } },
  { id: 'the-count-yields-before-the-radius-shrinks', why: 'a count is given up wherever the ASKED radius does not fit, before the radius is let shrink toward the print minimum — lobes lost to a roundness the slider could have given up instead',
    find: '  while (tries[tries.length - 1].round.noFit > 0 && tries[tries.length - 1].n > 1) tries.push(attempt(tries[tries.length - 1].n - 1));\n  const fitIdx = tries.findIndex((t) => t.round.noFit === 0);',
    into: '  while ((tries[tries.length - 1].round.noFit > 0 || tries[tries.length - 1].round.shrunk > 0) && tries[tries.length - 1].n > 1) tries.push(attempt(tries[tries.length - 1].n - 1));\n  const fitIdx = tries.findIndex((t) => t.round.noFit === 0 && !(t.round.shrunk > 0));', names: ['LF28'],
    witness: (M, C) => { const m = compoundFacts(M, SHRINK_WIT), c = compoundFacts(C, SHRINK_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const ym = m.rep.lobed.lobeYield, yc = c.rep.lobed.lobeYield;
      return (yc.built === yc.asked && c.rep.lobed.roundBottoms.shrunk > 0 && (ym.built < ym.asked || ym.residual)) ? null : `the mutant builds ${ym.built} of ${ym.asked} (residual ${ym.residual}) against the clean ${yc.built} with ${c.rep.lobed.roundBottoms.shrunk} shrunk — the behaviour did not move`; } },
  { id: 'the-count-never-yields', why: 'where no round bottom fits even at the print minimum the asked count is built with its V kept — S4b\'s told slit, ruling 3 never applied',
    find: '  while (tries[tries.length - 1].round.noFit > 0 && tries[tries.length - 1].n > 1) tries.push(attempt(tries[tries.length - 1].n - 1));',
    into: '', names: ['LF28'],
    witness: (M, C) => { const m = compoundFacts(M, YIELD_WIT), c = compoundFacts(C, YIELD_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const ym = m.rep.lobed.lobeYield, yc = c.rep.lobed.lobeYield;
      return (ym.built === ym.asked && m.rep.lobed.roundBottoms.noFit > 0 && yc.built < yc.asked) ? null : `the mutant builds ${ym.built} of ${ym.asked} (${m.rep.lobed.roundBottoms.noFit} NO FIT) against the clean ${yc.built} — the behaviour did not move`; } },
  { id: 'the-lobed-tooth-count-reads-the-shared-one', why: "the lobed blade cuts the SIMPLE leaf's tooth count, hidden under LOBED — the per-lobe control reaches nothing and a hidden slider moves the lobed rim",
    find: '    lobeCount: lobedToothPerLobe(state) * (2 * n + 1),',
    into: '    lobeCount: Math.round(Number(state.leafToothCount)),', names: ['LF29'],
    witness: (M, C) => { const m = compoundFacts(M, LOB_WIT), c = compoundFacts(C, LOB_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const s = { ...REGISTRY_DEFAULTS };
      return (m.rep.serration.countAsked === Math.round(Number(s.leafToothCount)) && c.rep.serration.countAsked === Number(s.lobedToothCount) * 7) ? null : `the mutant asks ${m.rep.serration.countAsked} teeth against the clean ${c.rep.serration.countAsked} — the behaviour did not move`; } },
  { id: 'the-teeth-per-lobe-span-the-whole-rim', why: 'the per-lobe count is cut as a count for the WHOLE rim — three teeth on a seven-lobe margin, two thirds of the lobes entire, the slider reading "a lobe"',
    find: '    lobeCount: lobedToothPerLobe(state) * (2 * n + 1),',
    into: '    lobeCount: lobedToothPerLobe(state),', names: ['LF29'],
    witness: (M, C) => { const m = compoundFacts(M, LOB_WIT), c = compoundFacts(C, LOB_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const tm = m.rep.lobed.teethPerLobe, tc = c.rep.lobed.teethPerLobe;
      return (m.rep.serration.countAsked === Number(REGISTRY_DEFAULTS.lobedToothCount) && tm.some((x) => x === 0) && tc.every((x) => x > 0)) ? null : `the mutant cuts ${m.rep.serration.countAsked} teeth (per lobe ${tm}) against the clean ${c.rep.serration.countAsked} (${tc}) — the behaviour did not move`; } },
  /* THE S4c FOLLOW-UP MUTANT (Eva's ruling 4 of Oct 9: the round bottom's
     shoulders are tangent). The shoulders' records are still solved and
     reported; only the outline stops using them, so the wall meets each
     flank at the corner it met on the base tree. Witnessed on the MUTATED
     module's own export outline: the turn at each shoulder's corner station. */
  { id: 'the-shoulder-is-a-corner-again', why: 'the round bottom\'s walls meet their flanks at a corner again — the fillets are solved and reported and the outline does not draw them: the ledge Eva saw at 0.12',
    find: '        let w = u <= WB.uQ ? (SB.at && u >= SB.u0 && u <= SB.u1 ? SB.at(u) : WB.at(u))\n          : u >= WF.uQ ? (SF.at && u >= SF.u0 && u <= SF.u1 ? SF.at(u) : WF.at(u)) : ent(u);',
    into: '        let w = u <= WB.uQ ? WB.at(u) : u >= WF.uQ ? WF.at(u) : ent(u);', names: ['LF30'],
    witness: (M, C) => {
      const worst = (G) => {
        const st = { ...REGISTRY_DEFAULTS, ...LOB_WIT }, len = Number(st.leafLength), O = G.lobedOutline(st, len, true);
        const h = (u) => Math.max(O.prof.halfWidthBaseAt(u), G.TIP_HALF_MM), P = (u) => { const t = O.tauAt(u), x = h(u); return [u * len + x * Math.sin(t), x * Math.cos(t)]; };
        const dir = (a, b) => { const p = P(a), q = P(b); return Math.atan2(q[1] - p[1], q[0] - p[0]); };
        let w = 0;
        for (const s2 of O.round.sinuses) for (const x of (s2.built ? s2.shoulders : [])) if (x.cornerU !== null) {
          let t = dir(x.cornerU, x.cornerU + 1e-6) - dir(x.cornerU - 1e-6, x.cornerU); while (t > Math.PI) t -= 2 * Math.PI; while (t < -Math.PI) t += 2 * Math.PI;
          w = Math.max(w, Math.abs(t) * 180 / Math.PI);
        }
        return w;
      };
      let wm, wc; try { wm = worst(M); wc = worst(C); } catch (e) { return `the witness threw: ${e.message}`; }
      return (wm > 5 && wc < 1) ? null : `the mutant turns ${wm.toFixed(3)} deg at its worst shoulder corner against the clean ${wc.toFixed(3)} — the behaviour did not move`; } },
  /* S5 — THE LEAF NIB, THE TIP'S TOOTH AND THE BROAD SINUS'S FILLET. Each
     witnessed on the MUTATED module's own build, never on the clause it names. */
  { id: 'the-leaf-nib-bulges', why: "the leaf nib's arc is centred PAST its flank's end, so the tip swells into a bulb before it closes — the neck-and-bulb the ruling removed",
    find: '    const xFace = x0 + (h0 - a) / m, r = a * Math.sqrt(1 + m * m), c = xFace - a * m;',
    into: '    const xFace = x0 + (h0 - a) / m, r = a * Math.sqrt(1 + m * m), c = xFace + a * m;', names: ['LF32'],
    witness: (M, C) => {
      const rise = (G) => { const f = compoundFacts(G, { stemLength: 70, stemDiameter: 6, leafLength: 52, leafWidth: 17, leafNodes: 1 }); if (f.threw) throw new Error(f.threw);
        /* the rise over the rows past the law's own floor crossing (the
           record's `fromU`): a bulb can be the blade's WIDEST row, so a rise
           read past the widest row sees nothing (the first version of this
           witness did exactly that — the bulb measured 293 mm) */
        const hb = f.rep.rowHalfBaseMm, uR = f.rep.rowU, u0 = f.rep.tipClamp.fromU;
        let r = 0; for (let j = 1; j < hb.length; j++) if (uR[j - 1] >= u0) r = Math.max(r, hb[j] - hb[j - 1]); return r; };
      let rm, rc; try { rm = rise(M); rc = rise(C); } catch (e) { return `the witness threw: ${e.message}`; }
      return (rm > 1e-6 && rc === 0) ? null : `the mutant's tip rises ${rm} mm past its widest row against the clean ${rc} — the behaviour did not move`; } },
  { id: 'a-tooth-cuts-the-nib', why: 'inside the nib the drawn row is the TOOTHED outline again — a tooth whose period runs past the floor crossing digs the converging tip toward the face, where it folds',
    find: 'export function leafHalfAt(prof, u) { return prof.onNib(u) ? prof.halfWidthBaseAt(u) : Math.max(prof.halfWidthAt(u), TIP_HALF_MM); }',
    into: 'export function leafHalfAt(prof, u) { return prof.onNib(u) ? prof.halfWidthAt(u) : Math.max(prof.halfWidthAt(u), TIP_HALF_MM); }', names: ['LF33'],
    witness: (M, C) => {
      const dig = (G) => { const f = compoundFacts(G, NIB_TOOTH_WIT); if (f.threw) throw new Error(f.threw);
        let d = 0; for (const B of f.rep.leaflets || []) for (let j = 0; j < B.rowHalfMm.length; j++) if (B.rowHalfBaseMm[j] < G.TIP_HALF_MM) d = Math.max(d, B.rowHalfBaseMm[j] - B.rowHalfMm[j]); return d; };
      let dm, dc; try { dm = dig(M); dc = dig(C); } catch (e) { return `the witness threw: ${e.message}`; }
      return (dm > 0.01 && dc === 0) ? null : `the mutant cuts ${dm} mm into its leaflets' nibs against the clean ${dc} — the behaviour did not move`; } },
  { id: 'the-broad-fillet-is-a-chord', why: "a broad sinus's fillet is drawn as the CHORD between its two tangent points — corners at both arms, the V point flattened rather than rounded",
    find: "        const at = (u) => { const dx = u * Lmm - C[0]; return C[1] - Math.sqrt(Math.max(0, rho * rho - dx * dx)); };",
    into: "        const at = (u) => lam(uB) + ((lam(uF) - lam(uB)) * (u - uB)) / (uF - uB);", names: ['LF34'],
    witness: (M, C) => {
      const worst = (G) => {
        const st = { ...REGISTRY_DEFAULTS, ...FILLET_WIT }, len = Number(st.leafLength), O = G.lobedOutline(st, len, true);
        const h = (u) => Math.max(O.prof.halfWidthBaseAt(u), G.TIP_HALF_MM), P = (u) => { const t = O.tauAt(u), x = h(u); return [u * len + x * Math.sin(t), x * Math.cos(t)]; };
        const dir = (a, b) => { const p = P(a), q = P(b); return Math.atan2(q[1] - p[1], q[0] - p[0]); };
        let w = 0, n = 0;
        for (const s2 of O.round.sinuses) if (s2.fillet) for (const u of s2.filletU) { n++;
          let t = dir(u, u + 1e-6) - dir(u - 1e-6, u); while (t > Math.PI) t -= 2 * Math.PI; while (t < -Math.PI) t += 2 * Math.PI;
          w = Math.max(w, Math.abs(t) * 180 / Math.PI); }
        if (!n) throw new Error('no sinus is filleted on the witness state');
        return w;
      };
      let wm, wc; try { wm = worst(M); wc = worst(C); } catch (e) { return `the witness threw: ${e.message}`; }
      return (wm > 5 && wc < 1) ? null : `the mutant turns ${wm.toFixed(3)} deg at its worst fillet join against the clean ${wc.toFixed(3)} — the behaviour did not move`; } },
  { id: 'the-broad-fillet-is-told-and-not-drawn', why: "the fillet is solved and recorded and never reaches the outline — the read-out says rounded over a V point",
    find: '      fills.push({ ua, ub, F: Fb.at });',
    into: '      void Fb;', names: ['LF34'],
    witness: (M, C) => {
      const filled = (G) => { const st = { ...REGISTRY_DEFAULTS, ...FILLET_WIT }, O = G.lobedOutline(st, Number(st.leafLength), true);
        return { told: O.round.sinuses.filter((x) => x.fillet).length, drawn: O.round.filleted }; };
      let m, c; try { m = filled(M); c = filled(C); } catch (e) { return `the witness threw: ${e.message}`; }
      return (m.told > 0 && m.drawn === 0 && c.drawn === c.told && c.told > 0) ? null : `the mutant tells ${m.told} fillets and draws ${m.drawn}, the clean tree ${c.told} / ${c.drawn} — the behaviour did not move`; } },
  /* S5b — THE TIP GIVES UP THE PAIR THAT NECKS IT. Two mutants, because LF35
     has two halves and a mutant that keeps the record honest must not be the
     only one: the first moves the DECISION (the record then reads a pair past
     half that was kept), the second leaves the decision and the record right
     and the OUTLINE wrong (a pair told given up, still cut) — which only the
     measured half and LF29 can see. Witnessed on the MUTATED module's own
     shipped lobed defaults (LOB_WIT, a table row). */
  { id: 'the-tip-keeps-its-neck', why: "the neck bar is doubled, so no pair is ever past it — the converging tip keeps the notch that cuts 81 % of the way to the midrib (the stalk-and-knob the ruling removed)",
    find: "        const neck = frac > bar;",
    into: '        const neck = frac > 2 * bar;', names: ['LF35'],
    witness: (M, C) => {
      const given = (G) => { const f = compoundFacts(G, LOB_WIT); if (f.threw) throw new Error(f.threw); const t = f.rep.serration.tipNeck; return t ? t.pairsGiven : -1; };
      let gm, gc; try { gm = given(M); gc = given(C); } catch (e) { return `the witness threw: ${e.message}`; }
      return (gm === 0 && gc >= 1) ? null : `the mutant gives ${gm} pair(s) up against the clean tree's ${gc} on the lobed defaults — the behaviour did not move`; } },
  { id: 'the-given-pair-is-told-and-still-cut', why: "the pair is recorded as given up (relief 0 in the record) and the outline is still cut from the relief it had — the read-out says the neck is gone over a tip that still has it",
    find: '    const cutMm = (u) => (dAt(u) > treatedHalfMm ? 0 : reliefMm[periodOf(u)] * lobeCutProfile(phaseAt(u), crestShape, notchShape));',
    into: '    const cutMm = (u) => (dAt(u) > treatedHalfMm ? 0 : (reliefMm[periodOf(u)] || (tipNeck && tipNeck.pairsGiven && Math.abs(treatedHalfMm - (periodOf(u) + 0.5) * pitchMm) > faceMm / 2 ? reliefBuiltMm : 0)) * lobeCutProfile(phaseAt(u), crestShape, notchShape));', names: ['LF35'],
    witness: (M, C) => {
      const deepest = (G) => { const f = compoundFacts(G, LOB_WIT); if (f.threw) throw new Error(f.threw);
        const r = f.rep, S = r.serration, t = S.tipNeck, us = r.lobed.rowU, hL = r.lobed.rowHalfLobeMm, hs = r.rowHalfMm;
        if (!t || !t.sinusU.length) return { told: 0, cut: 0 };
        const k = S.sinusU.indexOf(t.sinusU[0]), a = S.crestU[k], b = S.crestU[k + 1] === undefined ? 1 : S.crestU[k + 1];
        let w = 0; for (let j = 0; j < us.length; j++) if (us[j] > a && us[j] < b) w = Math.max(w, hL[j] - hs[j]); return { told: t.pairsGiven, cut: w }; };
      let m, c; try { m = deepest(M); c = deepest(C); } catch (e) { return `the witness threw: ${e.message}`; }
      return (m.told >= 1 && m.cut > 1 && c.told >= 1 && c.cut === 0) ? null : `the mutant tells ${m.told} pair(s) given and cuts ${m.cut} mm in the given period, the clean tree ${c.told} / ${c.cut} — the behaviour did not move`; } },
  /* S5b — WHERE THE NIB'S ROWS COME FROM. Each reverts one blade type to
     S5's whole-blade re-spread, so every station of the lobe window (or of
     the simple blade above its beaded base) moves by a fraction of a gap —
     the E2 churn the ruling removed. Witnessed on the MUTATED module's own
     station law: how many stations below the donors keep the no-nib value. */
  { id: 'the-lobed-arc-rows-come-from-the-whole-window', why: "the lobed arc's three rows are taken from the whole blade again (S5's law): every lobe and sinus station moves, the mum's E2 back to 39.63 deg",
    find: '  const s0 = Math.min(idx, Math.max(1, idx + 1 - LOBED_ARC_DONOR_ROWS)), nMid = nu + 1 - K - s0, a0 = P[s0];',
    into: '  const s0 = Math.min(idx, 1), nMid = nu + 1 - K - s0, a0 = P[s0];', names: ['LF20'],
    witness: (M, C) => {
      const kept = (G) => { const st = { ...REGISTRY_DEFAULTS, ...LOB_WIT }, O = G.lobedOutline(st, Number(st.leafLength), true);
        const nib = G.lobedStations(O.law, G.LOBED_BLADE_ROWS, O.profE.apex), plain = G.lobedStations(O.law, G.LOBED_BLADE_ROWS, null);
        let k = 0; while (k < nib.length && Object.is(nib[k], plain[k])) k++; return k; };
      let km, kc; try { km = kept(M); kc = kept(C); } catch (e) { return `the witness threw: ${e.message}`; }
      return (km <= 2 && kc > 100) ? null : `the mutant keeps ${km} no-nib stations at the base against the clean tree's ${kc} — the behaviour did not move`; } },
  { id: 'the-leaf-arc-rows-come-from-the-whole-blade', why: "the simple leaf's and the leaflets' arc rows are taken from the whole blade above the beaded base again (S5's law): every station above it moves",
    find: '  const s0 = Math.min(idx, Math.max(RIM_TIP_ROWS, idx + 1 - LEAF_ARC_DONOR_ROWS)), nMid = nu + 1 - K - s0, a0 = s0 / nu;',
    into: '  const s0 = Math.min(idx, RIM_TIP_ROWS), nMid = nu + 1 - K - s0, a0 = s0 / nu;', names: ['LF11', 'LF16'],
    witness: (M, C) => {
      const kept = (G) => { const f = compoundFacts(G, { stemLength: 70, stemDiameter: 6, leafLength: 46, leafNodes: 1 }); if (f.threw) throw new Error(f.threw);
        const u = f.rep.rowU, nu = u.length - 1; let k = 0; while (k < u.length && u[k] === k / nu) k++; return k; };
      let km, kc; try { km = kept(M); kc = kept(C); } catch (e) { return `the witness threw: ${e.message}`; }
      return (km <= 6 && kc > 20) ? null : `the mutant keeps ${km} uniform stations at the base against the clean tree's ${kc} — the behaviour did not move`; } },
  /* S5b — ALREADY ROUND. The flag that turns the read-out into "already
     rounder than this slider can make it" set on a sinus a fillet DOES
     round (every broad sinus, the touch test removed): the page draws its
     fillets and tells them impossible. Witnessed on the MUTATED module's own
     broad-sinus leaf (FILLET_WIT), never on LF36. */
  { id: 'a-v-is-told-already-round', why: "the largest fitting fillet's touch test is dropped, so every broad sinus is told ALREADY ROUND — the read-out says no roundness can round a sinus the slider does round",
    find: '      rec.filletDead = RfitF !== null && !touches(RfitF >= RtopF && fitF ? fitF : filletAt(RfitF));',
    into: '      rec.filletDead = RfitF !== null;', names: ['LF36'],
    witness: (M, C) => {
      const dead = (G) => { const st = { ...REGISTRY_DEFAULTS, ...FILLET_WIT }, O = G.lobedOutline(st, Number(st.leafLength), true);
        return { dead: O.round.sinuses.filter((x) => x.filletDead).length, broad: O.round.sinuses.filter((x) => !x.need && x.openingAskedMm !== null).length }; };
      let m, c; try { m = dead(M); c = dead(C); } catch (e) { return `the witness threw: ${e.message}`; }
      return (m.dead > 0 && m.dead === m.broad && c.dead === 0) ? null : `the mutant tells ${m.dead} of ${m.broad} broad sinuses already round, the clean tree ${c.dead} — the behaviour did not move`; } },
  /* RETIRED BY S3c (Eva's ruling of Oct 8, the load-tapered rachis):
     `the-petiole-steps-down-flat` mutated the 45-degree cone, which is gone
     (the petiole runs straight to the rachis and the rachis tapers on from
     it), and `the-rachis-thickens-with-the-petiole` mutated the rachis INTO
     an area-rule taper, which is now the law. Their places are taken by the
     four ways the taper could be wrong, below. */
  { id: 'the-rod-exemption-is-widened', why: "every rod is reported to ST9 and the combination gate at twice its emitted radius — an exemption region wider than the rod it names",
    find: "    rodAxes.push({ inner: ringMid(axisRings[k]), outer: ringMid(axisRings[k + 1]), innerR: radii[k], outerR: radii[k + 1], radiusMm: Math.max(radii[k], radii[k + 1]), part: k < iBase ? 'petiole' : k < iTip ? 'rachis' : 'terminal stalk' });",
    into: "    rodAxes.push({ inner: ringMid(axisRings[k]), outer: ringMid(axisRings[k + 1]), innerR: 2 * radii[k], outerR: 2 * radii[k + 1], radiusMm: 2 * Math.max(radii[k], radii[k + 1]), part: k < iBase ? 'petiole' : k < iTip ? 'rachis' : 'terminal stalk' });", names: ['LF18'],
    witness: (M, C) => { const m = compoundFacts(M, CPD_WIT), c = compoundFacts(C, CPD_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (Math.abs(m.rep.rodAxes[0].innerR - 2 * c.rep.rodAxes[0].innerR) < 1e-12 && Math.abs(m.rep.rodAxes[0].radiusMm - 2 * c.rep.rodAxes[0].radiusMm) < 1e-12) ? null
        : `the mutant names its petiole at ${m.rep.rodAxes[0].innerR} mm against the clean tree's ${c.rep.rodAxes[0].innerR} — the behaviour did not move`; } },
  /* THE LOAD TAPER (S3c, Eva's ruling of Oct 8) — four ways it could be
     wrong, each witnessed on the MUTATED module's own emitted axis rod at the
     shipped sheet (`TAPER_WIT`, where the petiole is not clamped and the
     taper's three knots are 2.68 / 2.08 / 1.20 mm). */
  { id: 'the-taper-is-stepped', why: 'the rachis is the area rule as a STEP function — each stretch held at its own load\'s radius with a flat shoulder at every pair station, where Eva ruled a smooth taper',
    find: "    if (j === 0) push(rachisAt(iv.fromMm), frameAt(arc.phiAt(iv.fromMm)).N, rAt(iv.fromMm));\n    for (let q = 1; q <= m; q++) {\n      const s = q === m ? iv.toMm : iv.fromMm + ((iv.toMm - iv.fromMm) * q) / m;\n      push(rachisAt(s), frameAt(arc.phiAt(s)).N, rAt(s));",
    into: "    push(rachisAt(iv.fromMm), frameAt(arc.phiAt(iv.fromMm)).N, rAt(iv.toMm));\n    for (let q = 1; q <= m; q++) {\n      const s = q === m ? iv.toMm : iv.fromMm + ((iv.toMm - iv.fromMm) * q) / m;\n      push(rachisAt(s), frameAt(arc.phiAt(s)).N, rAt(iv.toMm));", names: ['LF17'],
    witness: (M, C) => { const m = compoundFacts(M, TAPER_WIT), c = compoundFacts(C, TAPER_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const steps = (r) => { const a = r.axisRod.centres; let n = 0; for (let k = 0; k + 1 < a.length; k++) if (Math.hypot(a[k][0] - a[k + 1][0], a[k][1] - a[k + 1][1], a[k][2] - a[k + 1][2]) < 1e-9) n++; return n; };
      return (steps(m.rep) >= 2 && steps(c.rep) === 0) ? null
        : `the mutant's axis rod carries ${steps(m.rep)} shoulders against the clean tree's ${steps(c.rep)} — the behaviour did not move`; } },
  { id: 'the-taper-stops-at-the-petiole', why: "#381's shape: the petiole thick and the whole rachis the 1.2 mm wire — the leaf hanging on the thinnest rod in the bloom",
    find: "  if (sMm <= K[0].sMm) return K[0].rMm;\n  for (let j = 1; j < K.length; j++) {",
    into: "  if (sMm <= K[0].sMm) return K[0].rMm;\n  if (taper) return taper.wireR;\n  for (let j = 1; j < K.length; j++) {", names: ['LF17'],
    witness: (M, C) => { const m = compoundFacts(M, TAPER_WIT), c = compoundFacts(C, TAPER_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const r2 = (r) => r.axisRod.radii[2];
      return (Math.abs(r2(m.rep) - m.plan.compound.wireR) < 1e-9 && r2(c.rep) > c.plan.compound.wireR + 0.5) ? null
        : `the mutant's rachis ring at the first pair is ${r2(m.rep)} mm against the clean tree's ${r2(c.rep)} — the behaviour did not move`; } },
  { id: 'the-taper-counts-every-leaflet', why: 'every station is sized from the leaf\'s WHOLE count rather than the leaflets still carried beyond it — the rachis as thick at its last pair as at its base',
    find: "    knots.push({ sMm: q.stationMm, rMm: Math.max(wireR, Math.min(builtR, compoundPetioleRadiusMm(wireR, carried))), carried });",
    into: "    knots.push({ sMm: q.stationMm, rMm: Math.max(wireR, Math.min(builtR, compoundPetioleRadiusMm(wireR, lay.count))), carried });", names: ['LF17', 'LF18'],
    witness: (M, C) => { const m = compoundFacts(M, TAPER_WIT), c = compoundFacts(C, TAPER_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const r3 = (r) => r.axisRod.radii[3];
      return (r3(m.rep) > r3(c.rep) + 0.1) ? null
        : `the mutant's rachis ring at the last pair is ${r3(m.rep)} mm against the clean tree's ${r3(c.rep)} — the behaviour did not move`; } },
  { id: 'the-stalk-roots-at-the-wire', why: "each stalk starts where a WIRE rachis's surface would be, one wire radius out along the stalk, instead of on the rachis's axis buried by the station's own radius — the #381-minded root that a thinner tapered section no longer holds",
    find: "    const rings = rodPolylineInto(acc, [F.root, [F.root[0] + F.D[0] * len, F.root[1] + F.D[1] * len, F.root[2] + F.D[2] * len]], [F.T, F.T]",
    into: "    const rings = rodPolylineInto(acc, [[F.root[0] + F.D[0] * cp.wireR, F.root[1] + F.D[1] * cp.wireR, F.root[2] + F.D[2] * cp.wireR], [F.root[0] + F.D[0] * len, F.root[1] + F.D[1] * len, F.root[2] + F.D[2] * len]], [F.T, F.T]", names: ['LF16', 'LF17'],
    witness: (M, C) => { const m = compoundFacts(M, TAPER_WIT), c = compoundFacts(C, TAPER_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const off = (r) => { const q = r.stalkRods[2].root, t = r.leaflets[2].root; return Math.hypot(q[0] - t[0], q[1] - t[1], q[2] - t[2]); };
      return (Math.abs(off(m.rep) - m.plan.compound.wireR) < 1e-9 && off(c.rep) < 1e-9) ? null
        : `the mutant's second-pair stalk roots ${off(m.rep)} mm off the rachis axis against the clean tree's ${off(c.rep)} — the behaviour did not move`; } },
  { id: 'the-leaflets-read-the-simple-tooth-depth', why: "the leaflets read the SIMPLE leaf's 0.26 tooth depth again — the holly leaflets Eva ruled off, with their own depth control reaching nothing",
    find: '    lobeDepth: state.leafletToothDepth === undefined ? LEAFLET_TOOTH_DEPTH_DEFAULT : Number(state.leafletToothDepth),',
    into: '    lobeDepth: Number(state.leafToothDepth),', names: ['LF7', 'LF13'],
    witness: (M, C) => { const m = compoundFacts(M, CPD_WIT), c = compoundFacts(C, CPD_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.rep.serrationBuilt > 0 && c.rep.serrationBuilt === 0) ? null
        : `the mutant's leaflets cut ${m.rep.serrationBuilt} teeth against the clean tree's ${c.rep.serrationBuilt} at the compound defaults — the behaviour did not move`; } },
  { id: 'the-leaflets-read-the-simple-tip', why: "the leaflets read the SIMPLE leaf's 1.30 pointed tip — their own tip control reaching nothing",
    find: '    petalTipShape: state.leafletTipShape === undefined ? LEAFLET_TIP_SHAPE_DEFAULT : Number(state.leafletTipShape),',
    into: '    petalTipShape: Number(state.leafTipShape),', names: ['LF9'],
    witness: (M, C) => { const m = compoundFacts(M, CPD_WIT), c = compoundFacts(C, CPD_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.plan.tipShape === 1.3 && c.plan.tipShape === 1.6) ? null
        : `the mutant's leaflets are built at tip ${m.plan.tipShape} against the clean tree's ${c.plan.tipShape} — the behaviour did not move`; } },

  /* ===================================================================
     THE SEPALS (sepals, part 1) — SP0-SP9. A family was added, so the table
     runs it. Eight mutations, each the plausible way the whorl could be
     wired wrong while both STL gates stay green (a sepal is a closed shell
     overlapping the hub, so every one of these exports watertight and as one
     piece): the angle clamp removed (the row the brief names, with 60 asked
     against a drawn limit of 21), the blade reading the PETAL's controls
     instead of its own twins (with sepalCup 0.6 APART from petalCup 0, the
     bore-is-not-evas-rule lesson), the ring off the rim, the count unclamped
     (40 asked on 8), the phase ignored, the size ignored, the foot floor
     removed (breadth 0.25 asks 0.96 mm against a 1.60 floor), and sepals
     built under SPHERE (the two-statement guard). Every witness reads the
     MUTATED module's own build, never the assertion it names.
     =================================================================== */
  { id: 'sepal-angle-clamp-removed', why: 'the whorl is built at the ASKED angle whatever the drawn limit says — the sepals clip the petals and both STL gates read a cross-shell overlap, which the export contract permits',
    find: '  const bs = sepalBladeState(state, limit.angleBuiltDeg, unclamped);',
    into: '  const bs = sepalBladeState(state, limit.askedDeg, unclamped);', names: ['SP8'],
    witness: (M, C) => { const m = sepalFacts(M), c = sepalFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.tilt === 60 && c.tilt < 60) ? null : `the mutant built its sepals at ${m.tilt} against the clean tree's ${c.tilt} (60 asked) — the clamp did not go`; } },
  { id: 'sepal-reads-the-petals-controls', why: "the sepal blade is built from the PETAL's shape, form and curl controls while the sepal's own twins are read by nothing — hidden-and-not-inert on twenty controls at once",
    find: '  for (const [petalId, sepalId] of SEPAL_TWINS) s[petalId] = unclamped && !sepalTwinIsValue(sepalId) ? Number(state[sepalId]) : sepalTwinValue(sepalId, state[sepalId]);',
    into: '  for (const [petalId, sepalId] of SEPAL_TWINS) s[petalId] = Number(state[petalId]);', names: ['SP6'],
    witness: (M, C) => { const m = sepalFacts(M), c = sepalFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.form === null && c.form !== null) ? null : `the mutant's sepal ${m.form ? 'carries' : 'has no'} form record and the clean tree's ${c.form ? 'carries one' : 'has none'} (sepalCup 0.6, petalCup 0) — the twins were not bypassed`; } },
  { id: 'sepal-ring-off-the-rim', why: 'the sepal ring sits inside the rim at 0.9 of the hub radius — a whorl of sepals rooted in the slab short of the edge, watertight and one piece',
    find: '    const radius = onHub ? attachment.rAttach : hub.radius;\n    const surf = surfaceAt(radius, null);',
    into: '    const radius = onHub ? attachment.rAttach : hub.radius * 0.9;\n    const surf = surfaceAt(radius, null);', names: ['SP3'],
    witness: (M, C) => { const m = sepalFacts(M), c = sepalFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.rimR < c.rimR - 0.5) ? null : `the mutant's sepal ring row sits at r ${m.rimR} against the clean tree's ${c.rimR} — the ring did not move`; } },
  /* THE ATTACHMENT HEIGHT (the second-round ruling) — two mutations, each
     witnessed on the mutated module's own solve, on the flare row. */
  { id: 'sepal-height-ignored', why: "the attachment lands where the hub meets the head whatever `sepalHeight` asks — the foot at the join's rim, a quarter of a millimetre under the plate, the control dead; watertight and one piece",
    /* RE-ANCHORED (the raceme session), AND IT WAS STALE ON `main`. Its
       find-string was `stemEnd.z + frac * extentMm` and the shipped
       expression reads `zStemEnd + frac * extentMm` — measured 0 matches on
       BOTH trees, so the mutant had been disarmed since it was written and no
       run of this table had said so, because the anchor pre-check reports it
       and a sweep nobody finishes never reaches the report. Found by that
       pre-check on its first run here, which is the argument for checking
       every anchor before any mutant runs. */
    find: '  const zAttach = zStemEnd + frac * extentMm;',
    into: '  const zAttach = zStemEnd + 1 * extentMm;', names: ['SP3'],
    witness: (M, C) => { const m = sepalFacts(M, { stemLength: 60, sepalHeight: 0.75 }), c = sepalFacts(C, { stemLength: 60, sepalHeight: 0.75 });
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.attachZ > c.attachZ + 0.1) ? null : `the mutant's attachment is at z ${m.attachZ} against the clean tree's ${c.attachZ} (0.75 asked on a 60 x 6 stem) — the height still applies`; } },
  { id: 'sepal-limit-drawn-at-the-rim', why: "the angle scan draws its trial sepal at the plate's mid-plane (the first construction's height) while the whorl is built at the attachment — a limit drawn against a foot that is not where the foot is; both STL gates read a cross-shell overlap or a clear whorl either way",
    find: '  const slot = { index: 0, azimuth: 0, radius: sepals.ring.radius, z: sepals.height, scale: sepals.scale, tiltExtra: 0 };',
    into: '  const slot = { index: 0, azimuth: 0, radius: sepals.ring.radius, z: 0, scale: sepals.scale, tiltExtra: 0 };', names: ['SP8'],
    witness: (M, C) => { const m = sepalFacts(M, { stemLength: 60, hubStyle: 'GOBLET', hubShapeAmount: 2, hubLength: 40, sepalAngle: 90 }), c = sepalFacts(C, { stemLength: 60, hubStyle: 'GOBLET', hubShapeAmount: 2, hubLength: 40, sepalAngle: 90 });
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.limit !== c.limit) ? null : `the mutant drew the limit at ${m.limit} and the clean tree at ${c.limit} (90 asked, the foot 19.4 mm down the flare) — the scan's height did not move`; } },
  { id: 'sepal-count-unclamped', why: 'the count builds what was asked, past the petal count — 40 sepals on 8 petals, five to a pitch, watertight and one piece',
    find: '    const count = Math.min(asked, ceiling);\n    const scale = Number(st.sepalScale)',
    into: '    const count = asked;\n    const scale = Number(st.sepalScale)', names: ['SP2'],
    witness: (M, C) => { const m = sepalFacts(M, { sepalCount: 40 }), c = sepalFacts(C, { sepalCount: 40 });
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.count === 40 && c.count === 8) ? null : `the mutant built ${m.count} sepals against the clean tree's ${c.count} (40 asked on 8) — the ceiling still binds`; } },
  { id: 'sepal-phase-ignored', why: 'the whorl starts at the petals whatever the offset asks — every sepal ALIGNED under a petal at the interleaved default',
    find: '    const phaseRad = phaseFrac * pitchRad;',
    into: '    const phaseRad = 0;', names: ['SP4'],
    witness: (M, C) => { const m = sepalFacts(M), c = sepalFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (Math.abs(m.az0) < 1e-9 && Math.abs(c.az0) > 0.1) ? null : `the mutant's first sepal is at ${m.az0} rad against the clean tree's ${c.az0} — the offset still applies`; } },
  { id: 'sepal-size-ignored', why: "the sepals are built at the petal's own size whatever sepalScale asks — a second corolla, watertight and one piece",
    find: '    sizeRamp: () => sepals.scale, angleRamp: () => 0, phase: sepals.startAzimuth,',
    into: '    sizeRamp: () => 1, angleRamp: () => 0, phase: sepals.startAzimuth,', names: ['SP5'],
    witness: (M, C) => { const m = sepalFacts(M), c = sepalFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.length > c.length + 5) ? null : `the mutant's sepal is ${m.length} mm long against the clean tree's ${c.length} — the size still applies`; } },
  { id: 'sepal-own-length-ignored', why: "the sepal's own length never reaches the blade — a 90 mm sepalLength builds the petal's 35 x size, the record still saying 90 where the substate is read; SP5 (the asked record) and SP5b (the emitted centre line under half the asked length) are the witnesses",
    find: '  s.bladeLengthMm = own.lengthMm; s.bladeWidthMm = own.widthMm;',
    into: '  s.bladeLengthMm = null; s.bladeWidthMm = own.widthMm;', names: ['SP5'],
    witness: (M, C) => { const m = sepalFacts(M, { sepalLength: 90, sepalAngle: 0 }), c = sepalFacts(C, { sepalLength: 90, sepalAngle: 0 });
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (c.length > 60 && m.length < 40) ? null : `the mutant's sepal is ${m.length} mm long against the clean tree's ${c.length} at sepalLength 90 — the own length still reaches the blade`; } },
  { id: 'sepal-root-exclusion-is-a-fraction-again', why: "the angle scan drops u < ROOT_BLEND_END of the SEPAL'S OWN length again (a fraction standing for a physical region): on a 120 x 5 mm sepal it throws away the 36 mm where the sepal meets the petals, reads the limit +24 against +21, and at 150 mm reads no contact at all while the sepals stand through the petals",
    find: '  return { lamina: laminaFromPanels(p.lamina, { rootExclusion: { origin: p.base, mm: sepalRootExclusionMm(state) } }), base: p.base, seamStep: p.seamStep, tilt: angleDeg };',
    into: '  return { lamina: laminaFromPanels(p.lamina), base: p.base, seamStep: p.seamStep, tilt: angleDeg };', names: ['SP8'],
    witness: (M, C) => { const W = { sepalLength: 120, sepalWidth: 5, sepalAngle: 40, sepalSpineCurl: 120, sepalCurlBias: 0.9, sepalCurlStart: 0.6, sepalBaseTaper: 3, sepalTipTaper: 4, sepalTipShape: 0.6, sepalCup: 0, sepalFootBreadth: 0.5 };
      const m = sepalFacts(M, W), c = sepalFacts(C, W);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.limit > c.limit) ? null : `the mutant's limit is ${m.limit} against the clean tree's ${c.limit} on the 120 x 5 wing at 40 asked — the exclusion is not reading as a fraction`; } },
  { id: 'sepal-foot-floor-removed', why: 'the sepal foot is whatever breadth asks with no print floor — 0.96 mm across at breadth 0.25, under the 1.60 mm foot floor every petal ring is held to',
    find: '    const footFlooredMm = Math.max(FOOT_MIN_WIDTH_MM, footAskedMm);',
    into: '    const footFlooredMm = footAskedMm;', names: ['SP3'],
    witness: (M, C) => { const m = sepalFacts(M, { sepalFootBreadth: 0.25 }), c = sepalFacts(C, { sepalFootBreadth: 0.25 });
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.footH < 0.6 && c.footH >= 0.79) ? null : `the mutant's foot half-width is ${m.footH} against the clean tree's ${c.footH} at breadth 0.25 — the floor still binds`; } },
  /* THE SEPAL TIERS (F1.1a) — five, each the defect the brief names, each
     witnessed on the mutated module's own tier records (never on SP10-SP13). */
  { id: 'every-tier-at-the-same-height', rows: TIER_ROWS, why: 'the height law hands every tier the first tier\'s own fraction — three whorls stacked on ONE attachment, each sepal through the one above, watertight and one connected piece',
    find: 'export function sepalTierHeightLaw(frac, k, N) { return k === 0 ? frac : frac * (N - k) / N; }',
    into: 'export function sepalTierHeightLaw(frac, k, N) { return frac; }', names: ['SP11'],
    witness: (M, C) => { const m = tierFacts(M), c = tierFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const mf = m.tiers.map((t) => t.order ? t.order.fracLaw : t.frac), cf = c.tiers.map((t) => t.order ? t.order.fracLaw : t.frac);
      return (mf[1] === mf[0] && cf[1] < cf[0]) ? null : `the mutant's tier fractions (law) read ${mf.join(' / ')} against the clean tree's ${cf.join(' / ')} — the law still steps down`; } },
  { id: 'tiers-cross', rows: TIER_ROWS, why: 'the ordering ceiling is dropped: a tier is attached where its own height law says whatever the tier above sits at, so a scoped height offset puts tier 2 ABOVE tier 1 — two whorls through each other, no clause of the first session can see it',
    find: '      const fracBuilt = Math.min(fracLaw, fracCeiling);',
    into: '      const fracBuilt = fracLaw;', names: ['SP11'],
    witness: (M, C) => { const sc = { tiers: [{ tier: 0, offsets: { sepalHeight: -0.5 } }] };
      const m = tierFacts(M, {}, sc), c = tierFacts(C, {}, sc);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const mt = m.tiers, ct = c.tiers;
      if (!(mt[1] && mt[1].present && ct[1] && ct[1].present)) return `tier 2 not built (mutant ${JSON.stringify(mt[1])}, clean ${JSON.stringify(ct[1])})`;
      return (mt[1].frac > mt[0].frac && ct[1].frac < ct[0].frac) ? null : `tier 2 sits at ${mt[1].frac} against tier 1 at ${mt[0].frac} on the mutant (clean ${ct[1].frac} / ${ct[0].frac}) — the ordering still holds`; } },
  { id: 'tier-contact-unclamped', rows: TIER_ROWS, why: 'a lower tier\'s angle scan is drawn against the petals ALONE — the tier above is not among its sites, so a tier asked up stands through the whorl above it at its petal-drawn limit; both STL gates read a cross-shell overlap',
    find: '    const T = buildSepalTierInto(acc, desc.state, fr, desc, sites.concat(upper), stemPlanned, cap, unclamped);',
    into: '    const T = buildSepalTierInto(acc, desc.state, fr, desc, sites, stemPlanned, cap, unclamped);', names: ['SP13'],
    witness: (M, C) => { const ex = { hubLength: 10, sepalAngle: 60 };
      const m = tierFacts(M, ex), c = tierFacts(C, ex);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const mt = m.tiers[1], ct = c.tiers[1];
      if (!(mt && mt.present && ct && ct.present)) return `tier 2 not built`;
      return (ct.limit < 60 && /tier 1/.test(ct.against || '') && !/tier 1/.test(mt.against || '') && mt.limit > ct.limit) ? null
        : `tier 2's limit reads ${mt.limit} against ${mt.against} on the mutant and ${ct.limit} against ${ct.against} clean — the tier above still clamps it`; } },
  { id: 'tier-offsets-leak', rows: TIER_ROWS, why: 'a tier scope\'s offsets reach EVERY tier — an entry for tier 2 alone lengthens tier 1 and tier 3 with it, the picker editing one tier and the build moving three',
    find: "    if (e.tier !== k) continue;\n    addScopeOffsets(sum, e.offsets || {}, `tiers[${e.tier}]`); any = true;\n    if (e.values)",
    into: "    addScopeOffsets(sum, e.offsets || {}, `tiers[${e.tier}]`); any = true;\n    if (e.tier !== k) continue;\n    if (e.values)", names: ['SP12'],
    witness: (M, C) => { const sc = { tiers: [{ tier: 1, offsets: { sepalLength: 30 } }] };
      const m = tierFacts(M, {}, sc), c = tierFacts(C, {}, sc);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const ml = m.tiers.map((t) => t.length), cl = c.tiers.map((t) => t.length);
      return (ml[0] > cl[0] + 1 && Math.abs(cl[1] - ml[1]) < 1e-9 && cl[0] < cl[1]) ? null : `tier lengths read ${ml.join(' / ')} on the mutant against ${cl.join(' / ')} clean — tier 2's offset stayed on tier 2`; } },
  { id: 'tiers-built-with-no-stem', rows: TIER_ROWS, why: "the geometry's eligibility says tiers past the first are live on a bloom with NO stem while the registry hides the control there — hidden and NOT inert on the one state the brief rules out (the second tier then has no join to attach on, and is refused for the wrong reason)",
    find: 'export function sepalTiersEligible(state) { return !sepalsAbsent(state) && !stemIsAbsent(state); }',
    into: 'export function sepalTiersEligible(state) { return !sepalsAbsent(state); }', names: ['SP10'],
    witness: (M, C) => { const ex = { stemLength: 0, hubStyle: 'FLAT', hubLength: 0, sepalTiers: 4 };
      const m = tierFacts(M, ex), c = tierFacts(C, ex);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.eligible === true && c.eligible === false && !/need a stem/.test(m.tiers[1] ? m.tiers[1].why || '' : '') && /need a stem/.test(c.tiers[1] ? c.tiers[1].why || '' : '')) ? null
        : `eligible reads ${m.eligible} on the mutant against ${c.eligible} clean (tier 2: "${m.tiers[1] && m.tiers[1].why}" / "${c.tiers[1] && c.tiers[1].why}") — the stem still gates it`; } },
  { id: 'sepals-built-under-sphere', why: 'the geometry builds a sepal whorl on a closed SPHERE while the registry hides every sepal control there — hidden and NOT inert, and the whorl sits on the equator of a head that has no underside',
    find: 'export function sepalsEligible(state) { return !sphereMode(state); }',
    into: 'export function sepalsEligible(state) { return true; }', names: ['SP0', 'SP9'],
    witness: (M, C) => { const m = sepalFacts(M, { placement: 'CONTINUOUS', hubShape: 'SPHERE', sepalCount: 8 }), c = sepalFacts(C, { placement: 'CONTINUOUS', hubShape: 'SPHERE', sepalCount: 8 });
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.count === 8 && c.count === 0) ? null : `the mutant built ${m.count} sepals on a sphere against the clean tree's ${c.count} — the refusal still holds`; } },

  /* THE SEPAL CURVES (curves-sepals). Each witnessed on the MUTATED module's own
     sepal records — never the clause it names. */
  { id: 'a-sepal-curve-read-from-the-petals', rows: SEPC_ROWS, why: "the four value twins are skipped in sepalBladeState, so a sepal reads the PETAL's curl mode and curves — a sepal drawn CURVE with the petals on the sliders is built straight",
    find: "  for (const [petalId, sepalId] of SEPAL_TWINS) s[petalId] = unclamped && !sepalTwinIsValue(sepalId) ? Number(state[sepalId]) : sepalTwinValue(sepalId, state[sepalId]);",
    into: "  for (const [petalId, sepalId] of SEPAL_TWINS) { if (sepalTwinIsValue(sepalId)) continue; s[petalId] = unclamped ? Number(state[sepalId]) : sepalTwinValue(sepalId, state[sepalId]); }", names: ['SP14'],
    witness: (M, C) => { const m = sepcFacts(M, SEPC_REFLEX), c = sepcFacts(C, SEPC_REFLEX);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.tiers[0].curveMode === false && c.tiers[0].curveMode === true) ? null : `the sepal's curve mode reads ${m.tiers[0].curveMode} on the mutant against ${c.tiers[0].curveMode} clean`; } },
  { id: 'a-tier-curve-leaks-to-every-tier', rows: SEPC_ROWS, why: "a tier's owned values are collected from every tier's entry, so tier 2's drawn reflex reaches tier 1 too — the picker editing one tier and the calyx bending two",
    find: "    if (e.tier !== k) continue;\n    addScopeOffsets(sum, e.offsets || {}, `tiers[${e.tier}]`); any = true;\n    if (e.values)",
    into: "    if (e.values) for (const id of Object.keys(e.values)) { (values || (values = {}))[id] = e.values[id]; (valueFrom || (valueFrom = {}))[id] = 'tier'; any = true; }\n    if (e.tier !== k) continue;\n    addScopeOffsets(sum, e.offsets || {}, `tiers[${e.tier}]`); any = true;\n    if (e.values)", names: ['SP14'],
    witness: (M, C) => { const m = sepcFacts(M, SEPC_TIERS.set, SEPC_TIERS.scopes), c = sepcFacts(C, SEPC_TIERS.set, SEPC_TIERS.scopes);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.tiers[0].curveMode === true && c.tiers[0].curveMode === false && c.tiers[1].curveMode === true) ? null : `tier 1's curve mode reads ${m.tiers[0].curveMode} on the mutant against ${c.tiers[0].curveMode} clean (tier 2 ${c.tiers[1] && c.tiers[1].curveMode})`; } },
  { id: 'the-sepal-limit-drawn-on-the-slider-spine', rows: SEPC_ROWS, why: "the angle limit's trial sepal is built with the curl mode forced to SLIDER, so an incurved drawn sepal is cleared against the petals as if it were straight — and stands through them",
    find: "  const p = buildPetalInto(acc, sepalBladeState(state, angleDeg, unclamped), sepals.ring, slot, null, false);\n  return { lamina: laminaFromPanels(",
    into: "  const p = buildPetalInto(acc, { ...sepalBladeState(state, angleDeg, unclamped), petalCurlMode: 'SLIDER' }, sepals.ring, slot, null, false);\n  return { lamina: laminaFromPanels(", names: ['SP8'],
    witness: (M, C) => { const m = sepcFacts(M, SEPC_LIMIT), c = sepcFacts(C, SEPC_LIMIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.tiers[0].limit > c.tiers[0].limit + 5) ? null : `the limit reads ${m.tiers[0].limit} on the mutant against ${c.tiers[0].limit} clean — the trial still drew the curve`; } },
  { id: 'the-fold-limit-skipped-for-sepals', rows: SEPC_ROWS, why: "the fold limit's table is not handed to a SEPAL's spine (the substate's own-size key marks it), so an S-spine sepal under a cup bends past its cross-section and folds while every petal is held",
    find: "curve: curveLaw, bend: bend && bend.binds ? bend : null }) : null;",
    into: "curve: curveLaw, bend: bend && bend.binds && !('bladeLengthMm' in ps) ? bend : null }) : null;", names: ['SP14'],
    witness: (M, C) => { const m = sepcFacts(M, SEPC_FOLD), c = sepcFacts(C, SEPC_FOLD);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.tiers[0].bendClamped === false && c.tiers[0].bendClamped === true) ? null : `the sepal's fold limit reads ${m.tiers[0].bendClamped} on the mutant against ${c.tiers[0].bendClamped} clean`; } },

  /* THE LEAF CURVES (curves-leaves). Each witnessed on the MUTATED module's own
     leaf records (`compoundFacts`, EXPORT) — never the clause it names. */
  { id: 'the-leaf-spine-sign-flipped', rows: LEAFC_ROWS, why: "the drawn leaf spine is read with its y negated — the curve that FALLS toward the tip builds a leaf that curls UP, the opposite of the arch it documents",
    find: '  const curveLaw = spineCurveLaw(form.spineCurve, Lmm);',
    into: '  const curveLaw = spineCurveLaw({ ...form.spineCurve, points: form.spineCurve.points.map(([x, y]) => [x, -y]) }, Lmm);', names: ['LF11', 'LF37'],
    witness: (M, C) => { const m = compoundFacts(M, LC_DROOP), c = compoundFacts(C, LC_DROOP);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.rep.spine.turnBuiltDeg > 0 && c.rep.spine.turnBuiltDeg < 0) ? null : `the leaf turns ${m.rep.spine.turnBuiltDeg}° on the mutant against ${c.rep.spine.turnBuiltDeg}° clean`; } },
  { id: 'teeth-dropped-on-a-drawn-outline', rows: LEAFC_ROWS, why: "the leaf's serration is not cut where the outline is drawn — Eva's ruling keeps teeth ON in CURVE mode, and a toothed oak drawn as a curve comes out entire",
    find: '    if (!(petiole && outline ? !fringeEngaged(state) : lobesEligible(state)) || !lobesEngaged(state)) return null;',
    into: '    if (!(petiole && outline ? false : lobesEligible(state)) || !lobesEngaged(state)) return null;', names: ['LF13'],
    witness: (M, C) => { const m = compoundFacts(M, LC_TEETH), c = compoundFacts(C, LC_TEETH);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (!m.rep.serration && c.rep.serration && c.rep.serration.countBuilt > 0) ? null : `the serration reads ${JSON.stringify(m.rep.serration && m.rep.serration.countBuilt)} on the mutant against ${JSON.stringify(c.rep.serration && c.rep.serration.countBuilt)} clean`; } },
  { id: 'a-tooth-cuts-the-nib-on-a-drawn-outline', rows: LEAFC_ROWS, why: "on a DRAWN outline the nib's rows read the TOOTHED outline — a tooth whose period runs past the floor crossing digs the drawn tip toward its face (the S5 protection lost where the outline is a curve)",
    find: 'export function leafHalfAt(prof, u) { return prof.onNib(u) ? prof.halfWidthBaseAt(u) : Math.max(prof.halfWidthAt(u), TIP_HALF_MM); }',
    into: 'export function leafHalfAt(prof, u) { return prof.onNib(u) && !prof.outline ? prof.halfWidthBaseAt(u) : prof.onNib(u) ? prof.halfWidthAt(u) : Math.max(prof.halfWidthAt(u), TIP_HALF_MM); }', names: ['LF33'],
    witness: (M, C) => {
      const dig = (G) => { const f = compoundFacts(G, LC_NIB); if (f.threw) throw new Error(f.threw);
        let d = 0; for (const B of f.rep.leaflets || []) for (let j = 0; j < B.rowHalfMm.length; j++) if (B.rowHalfBaseMm[j] < G.TIP_HALF_MM) d = Math.max(d, B.rowHalfBaseMm[j] - B.rowHalfMm[j]); return d; };
      let dm, dc; try { dm = dig(M); dc = dig(C); } catch (e) { return `the witness threw: ${e.message}`; }
      return (dm > 0.01 && dc === 0) ? null : `the mutant cuts ${dm} mm into its drawn leaflets' nibs against the clean ${dc} — the behaviour did not move`; } },
  { id: 'leaflets-read-the-simple-leafs-curve', rows: LEAFC_ROWS, why: "the leaflets are drawn from the SIMPLE leaf's outline curve instead of the leaflet curve — one control reaching another blade type",
    find: "petalOutlineCurve: leafTwinValue(state, 'leafletOutlineCurve'),",
    into: "petalOutlineCurve: leafTwinValue(state, 'leafOutlineCurve'),", names: ['LF37'],
    witness: (M, C) => { const m = compoundFacts(M, LC_CPD), c = compoundFacts(C, LC_CPD);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const pm = m.rep.leaflets[0].outline && m.rep.leaflets[0].outline.points, pc = c.rep.leaflets[0].outline && c.rep.leaflets[0].outline.points;
      return (lcSame(pm, LC_OUT.lance.points) && lcSame(pc, LC_OUT.leaflet.points)) ? null : `the first leaflet is drawn from ${JSON.stringify(pm)} on the mutant against ${JSON.stringify(pc)} clean`; } },
  { id: 'the-terminal-leaflet-not-at-its-own-scale', rows: LEAFC_ROWS, why: "every leaflet's outline is drawn at the REFERENCE leaflet's scale — the terminal (30 x 19) at the laterals' aspect instead of its own",
    find: '    ...(curve ? { outlineWidthScaleOwn: leafletOutlineWidthScale(lengthMm, widthMm) } : {}),',
    into: '    ...(curve ? { outlineWidthScaleOwn: leafletOutlineWidthScale(LEAFLET_LENGTH_DEFAULT, LEAFLET_WIDTH_DEFAULT) } : {}),', names: ['LF37'],
    witness: (M, C) => { const m = compoundFacts(M, LC_CPD), c = compoundFacts(C, LC_CPD);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const tm = m.rep.leaflets.find((b) => b.role === 'terminal'), tc = c.rep.leaflets.find((b) => b.role === 'terminal');
      return (tm.outline.scale === 1 && Math.abs(tc.outline.scale - 1) > 1e-3) ? null : `the terminal is drawn at scale ${tm.outline.scale} on the mutant against ${tc.outline.scale} clean`; } },
  { id: 'the-inset-reads-the-slider-arch', rows: LEAFC_ROWS, why: "the node inset reads the ARCH slider's rise where the leaf is on a drawn spine — an upward curl rising above its chord puts the top leaf into the head",
    find: '  const rise = leafIsCompound(state) ? compoundLeafRiseMm(state) : leafBladeRiseMm(state, lengthMm, angleDeg);',
    into: '  const rise = leafIsCompound(state) ? compoundLeafRiseMm(state) : leafArchRiseMm(lengthMm, angleDeg, Number(state.leafArch ?? 0));', names: ['LF4'],
    witness: (M, C) => { const m = compoundFacts(M, LC_UP), c = compoundFacts(C, LC_UP);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.plan.insetNeededMm < c.plan.insetNeededMm - 1) ? null : `the inset needs ${m.plan.insetNeededMm} mm on the mutant against ${c.plan.insetNeededMm} clean`; } },
  { id: 'the-fold-limit-skipped-for-leaves', rows: LEAFC_ROWS, why: "the fold limit's table is not handed to a LEAF's drawn spine, so a tight curl on a cupped leaf bends past its own cross-section and folds while every petal is held",
    find: '  const law = spineLaw({ curlRad: 0, bias: 0, start: 0, length: Lmm, tilt: th, floorRadius, rows: nu, curve: curveLaw, bend: bend && bend.binds ? bend : null });',
    into: '  const law = spineLaw({ curlRad: 0, bias: 0, start: 0, length: Lmm, tilt: th, floorRadius, rows: nu, curve: curveLaw, bend: null });', names: ['LF37'],
    witness: (M, C) => { const m = compoundFacts(M, LC_FOLD), c = compoundFacts(C, LC_FOLD);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.rep.spine.bendClamped === false && c.rep.spine.bendClamped === true) ? null : `the leaf's fold limit reads ${m.rep.spine.bendClamped} on the mutant against ${c.rep.spine.bendClamped} clean`; } },
  { id: 'the-lobed-blade-takes-the-curve', rows: LEAFC_ROWS, why: "the LOBED blade's pin to its own law is gone, so an outline curve stored on the leaf replaces the chevron envelope's outline — the ruling keeps LOBED on its own law",
    find: "       blade as the arch does. */\n    petalOutlineMode: 'LAW',\n",
    into: "       blade as the arch does. */\n", names: ['LF37'],
    witness: (M, C) => { const m = compoundFacts(M, LC_LOBED), c = compoundFacts(C, LC_LOBED);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.rep.outline && !c.rep.outline) ? null : `the lobed blade's outline record reads ${JSON.stringify(m.rep.outline && m.rep.outline.points)} on the mutant against ${JSON.stringify(c.rep.outline)} clean`; } },

  /* ===== THE APEX NIB (AN0-AN3, the apex-nib session) ===============
     Both STL gates are blind to every one of these: each leaves a
     single-valued, strictly falling outline on a fixed row-and-column
     lattice, so each exports watertight, as one connected piece, with no
     degenerate triangle and the SAME triangle count. The census cannot see
     them either — none of them folds a sheet — and A6 cannot, because Eva's
     ruling fits the law only where it is above the print floor and stops at
     the crossing, so everything the nib draws is below its subject.

     EVERY WITNESS READS THE PLAN THE MUTATED MODULE DERIVES, never the
     assertion the mutant names. */
  { id: 'the-nib-is-never-cut', why: 'the blade never clears the print floor, always — the guard refuses every nib and the outline runs out FLAT to the mode floor as it did before this session',
    /* RE-ANCHORED (S5): the guards moved into `nibCrossing`, the ONE owner
       the petal's and the leaf's nib both read, so this mutates both */
    find: "  if (!(lam(uPk) > TIP_HALF_MM + APEX_FLOOR_EPS)) return { why: 'the blade never clears the print floor' };",
    into: "  if (true) return { why: 'the blade never clears the print floor' };", names: ['AN0'],
    witness: (M, C) => { const m = nibPlan(M), c = nibPlan(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (!m.active && c.active && m.terminal > c.terminal) ? null
        : `the mutant's plan is ${m.active ? 'ACTIVE' : 'inert'} ending on ${m.terminal} mm against the clean tree's ${c.active ? 'ACTIVE' : 'inert'} ${c.terminal} — the nib still closes the blade`; } },
  { id: 'the-squared-terminal-no-longer-stands-the-nib-down', why: 'the nib is cut even where a squared terminal holds the outline above the print floor, so petalTipEnd stops deciding how wide the petal ends — the guard’s other arm, and #229’s fringe terminal with it',
    find: "  if (lam(1) > TIP_HALF_MM + APEX_FLOOR_EPS) return { why: 'a squared terminal holds the outline above the floor' };",
    into: '  /* the squared terminal no longer stands the nib down */', names: ['AN0'],
    /* THE WITNESS ASKS WHICH GUARD REFUSED, NOT WHETHER ONE DID — and the
       first version asking the latter reported "the behaviour did not move"
       on a live mutation, which is a finding about the GEOMETRY worth keeping.
       On a 0.30 squared terminal at the default width the terminal is 2.40 mm
       and the outline is CONSTANT over [uPk, 1], so with the squared-terminal
       guard removed the bisection finds no crossing, `uLaw` lands on 1, the
       one-sided tangent there is 0 and the NEXT guard refuses — for the wrong
       reason. So that guard is load-bearing for the REASON rather than for the
       outcome on this row, which is exactly what AN0 checks: a ring reporting
       "the law arrives with no slope to carry on" is a FINDING, because that
       guard fires on no row of the shipped matrix. The plan moving observably
       is the claim; `active` alone is a narrower question than the mutation. */
    witness: (M, C) => { const m = nibPlan(M, { petalTipEnd: 0.3 }), c = nibPlan(C, { petalTipEnd: 0.3 });
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const moved = m.active !== c.active || m.why !== c.why;
      return moved ? null
        : `on a 0.30 squared terminal the mutant's plan is ${m.active ? 'ACTIVE' : 'inert (' + m.why + ')'} and the clean tree's is ${c.active ? 'ACTIVE' : 'inert (' + c.why + ')'} — the terminal still stands the nib down, by the same guard`; } },
  { id: 'the-flank-is-not-the-laws-tangent', why: 'the flank is carried on at the ONE-STEP difference quotient instead of the two-step Richardson one, so the apex is drawn at a tangent the law does not have',
    /* RE-ANCHORED ONTO THE QUANTISED FORM (§6c added `gridFloor` after this
       mutant was written, and the anchor pre-check reported it disarmed at
       0 matches before any mutant ran — which is the whole reason that check
       runs for EVERY mutant rather than the selected ones). The grid is KEPT
       on both sides on purpose: what this mutation is about is the TANGENT
       LAW, and dropping the quantisation with it would make the mutant test
       two things and AN1 unable to say which. */
    find: '  const slope = gridFloor(Math.abs(2 * s2 - s1));',
    into: '  const slope = gridFloor(Math.abs(s1));', names: ['AN1'],
    witness: (M, C) => { const m = nibPlan(M), c = nibPlan(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const d = Math.abs(m.slope - c.slope);
      return d > 1e-6 ? null : `the mutant's flank slope is ${m.slope} against the clean tree's ${c.slope} (${d.toExponential(2)} apart, under AN1's own bound)`; } },
  { id: 'the-arc-is-not-tangent-to-the-flank', why: "the arc's radius drops the secant factor, so a circle on the axis meets the flank at a CORNER instead of tangentially — the FULL ROUND nib Eva ruled, drawn as a chamfer with a fillet",
    find: '  const radiusMm = APEX_HALF_MM * sec;',
    into: '  const radiusMm = APEX_HALF_MM;', names: ['AN1'],
    witness: (M, C) => { const m = nibPlan(M), c = nibPlan(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return Math.abs(m.radius - c.radius) > 1e-9 ? null
        : `the mutant's arc radius is ${m.radius} against the clean tree's ${c.radius}`; } },
  { id: 'the-law-is-cut-above-its-own-crossing', why: 'the law is truncated where it falls under TWICE the print floor rather than at the floor itself, so the nib eats a stretch of blade the law still owns',
    find: '  for (let i = 0; i < 90; i++) { const m = (lo + hi) / 2; if (lam(m) > TIP_HALF_MM + APEX_FLOOR_EPS) lo = m; else hi = m; }',
    into: '  for (let i = 0; i < 90; i++) { const m = (lo + hi) / 2; if (lam(m) > 2 * TIP_HALF_MM) lo = m; else hi = m; }', names: ['AN1', 'AN2'],
    witness: (M, C) => { const m = nibPlan(M), c = nibPlan(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return Math.abs(m.uLaw - c.uLaw) > 1e-9 ? null
        : `the mutant cuts the law at u ${m.uLaw} against the clean tree's ${c.uLaw}`; } },
  { id: 'the-nib-ends-on-the-print-floor', why: "the arc is floored at the print floor instead of its own mini-face, so the blade stops on a 1.60 mm face while the plan still declares a 0.10 mm one — the defect this feature exists to remove, wearing the feature's own record",
    find: '      return Math.max(APEX_END_HALF_MM, Math.sqrt(Math.max(0, radiusMm * radiusMm - (x - centreMm) * (x - centreMm))));',
    into: '      return Math.max(TIP_HALF_MM, Math.sqrt(Math.max(0, radiusMm * radiusMm - (x - centreMm) * (x - centreMm))));', names: ['AN3'],
    witness: (M, C) => { const m = nibPlan(M), c = nibPlan(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.last > c.last + 0.1) ? null
        : `the mutant's last emitted half-width is ${m.last} against the clean tree's ${c.last}`; } },

  /* ===== THE STEM'S NODES (#299's port) ===== */

  { id: 'the-node-field-never-reaches-the-stem', why: "the plan drops the node law whatever the control says, so the stem stays a straight cylinder under a prominence the panel reports — watertight, one piece, the pre-node triangle count; the defect Eva's 'one control' would ship as a dead slider",
    find: '  const nodeLaw = stemNodeLaw(state, lengthMm, outerR);',
    into: '  const nodeLaw = null;', names: ['ST12', 'ST2'],
    witness: (M, C) => { const m = nodeFacts(M), c = nodeFacts(C), s0 = nodeFacts(C, { ...NODE_STATE(), stemNodeSwelling: 0, stemNodeKink: 0 });
      if (m.threw || c.threw || s0.threw) return `the witness threw: ${m.threw || c.threw || s0.threw}`;
      /* The straight stem's station count is READ off the clean tree at prominence 0 (the
         identity row), never typed: this witness carried `=== 2` until the florist's cut
         appended the long point as a third station and the sweep went red naming a mutant
         whose edit had applied — a row count standing in for a shape (the stale-harness-row
         class, in a witness). */
      return (m.stations === s0.stations && c.stations > s0.stations) ? null : `the mutant's stem carries ${m.stations} stations against the clean tree's ${c.stations} (a straight stem on the clean tree carries ${s0.stations})`; } },
  /* RENAMED with the node split (Oct 6): it was `prominence-zero-is-not-the-identity`; the guard now reads BOTH halves. */
  { id: 'both-node-amounts-zero-is-not-the-identity', why: 'the guard drops its amount term, so a leafed stem with swelling and kink both 0 builds a node law — a zero swelling and a zero kink on the noded arm — which is the identity only by an argument about arithmetic, never by branch',
    find: '  return !(Number(state.stemNodeSwelling) || Number(state.stemNodeKink)) || stemIsAbsent(state)',
    into: '  return stemIsAbsent(state)', names: ['ST12'],
    witness: (M, C) => { const st = { ...NODE_STATE(), stemNodeSwelling: 0, stemNodeKink: 0 };
      const m = nodeFacts(M, st), c = nodeFacts(C, st);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.hasLaw && !c.hasLaw) ? null : `with both amounts 0 the mutant's plan ${m.hasLaw ? 'carries' : 'carries no'} node law and the clean tree's ${c.hasLaw ? 'carries' : 'carries no'} one`; } },
  { id: 'the-bend-peaks-above-its-node', why: 'each kink starts a whole ramp ABOVE its node, so the stem turns before the joint instead of inside the swelling below it — the phasing Eva likes, lost, on a watertight stem with the same station count',
    find: '    const past = s - n.s;\n    if (!(past > 0)) continue;\n    const q = past >= law.rampMm ? 1 : (past / law.rampMm);',
    into: '    const past = s - n.s + law.rampMm;\n    if (!(past > 0)) continue;\n    const q = past >= law.rampMm ? 1 : (past / law.rampMm);', names: ['ST12', 'ST2'],
    witness: (M, C) => { const m = nodeFacts(M), c = nodeFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.offAtFirstNode > 1e-3 && c.offAtFirstNode === 0) ? null : `the axis at the first node stands ${m.offAtFirstNode} mm off in the mutant against ${c.offAtFirstNode} clean`; } },
  { id: 'the-spindle-is-a-fraction-of-the-length', why: "the spindle is 0.055 of the STEM'S LENGTH, the flower's literal constant, rather than 3.27 of its RADIUS — #296's too-short node arriving by the other route, 1.83 radii on a 100 x 6 mm stem",
    find: '  const spreadMm = STEM_NODE_SPREAD_RADII * outerR;',
    into: '  const spreadMm = 0.055 * stemLengthMm;', names: ['ST12', 'ST3'],
    witness: (M, C) => { const m = nodeFacts(M), c = nodeFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return Math.abs(m.spread - c.spread) > 0.5 ? null : `the mutant's spindle is ${m.spread} mm against ${c.spread}`; } },
  { id: 'the-noded-rings-stay-on-the-world-axis', why: 'the builder draws every noded ring about the world axis while the plan declares the kink — the swelling ships and the kink does not, on a watertight stem at the predicted count',
    find: '      const c = stemNodeAxisMm(law, sDepth);\n      return thetas.map((th) => [c[0] + rad * Math.cos(th), c[1] + rad * Math.sin(th), z]);',
    into: '      const c = [0, 0];\n      return thetas.map((th) => [c[0] + rad * Math.cos(th), c[1] + rad * Math.sin(th), z]);', names: ['ST2', 'ST12'],
    witness: (M, C) => { const m = nodeFacts(M), c = nodeFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.maxCentreOff < 1e-9 && c.maxCentreOff > 1) ? null : `the mutant's rings stand up to ${m.maxCentreOff} mm off the world axis against ${c.maxCentreOff} clean`; } },
  /* ===== RULING 6 — NODES DECOUPLED FROM LEAVES (stem session 2) ===== */
  { id: 'the-nodes-are-gated-on-leaves-again', why: "the geometry's guard takes back its leaf term, so a BARE stem at prominence 0.48 builds a straight cylinder while the registry (ruling 6) shows the control live — a dead slider on every bare stem, watertight and one piece at the pre-node count",
    find: '  return !(Number(state.stemNodeSwelling) || Number(state.stemNodeKink)) || stemIsAbsent(state) || !inflorescenceIsAbsent(state);',
    into: '  return !(Number(state.stemNodeSwelling) || Number(state.stemNodeKink)) || stemIsAbsent(state) || leafIsAbsent(state) || !inflorescenceIsAbsent(state);', names: ['ST12', 'ST2'],
    witness: (M, C) => { const m = nodeFacts(M, BARE_NODE_STATE()), c = nodeFacts(C, BARE_NODE_STATE());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (!m.hasLaw && c.hasLaw) ? null : `on a bare stem the mutant's plan ${m.hasLaw ? 'carries' : 'carries no'} node law and the clean tree's ${c.hasLaw ? 'carries' : 'carries no'} one`; } },
  { id: 'the-pedicel-pin-is-dropped', why: "the floret state stops pinning both halves of the node, so under a raceme whose head asks for nodes every PEDICEL — a bare stem now that nodes need no leaves — kinks and swells at the golden angle: watertight, one piece, the floret count unchanged",
    find: '  stemNodeSwelling: 0,        // no nodes on a pedicel (ruling 6) — neither half of the node (the split, Oct 6)\n  stemNodeKink: 0,\n',
    into: '', names: ['ID4'],
    witness: (M, C) => { const m = pedicelNodes(M), c = pedicelNodes(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.nodes > 0 && c.nodes === 0 && c.stations === 2) ? null : `the mutant's pedicel carries ${m.nodes} node(s) against the clean tree's ${c.nodes} on ${c.stations} stations`; } },
  /* THE LAW'S OWN WITNESS AGAINST THE MISTAKE (Eva, stem session 2: "that
     last is the law's own witness against the mistake I just made"). The
     golden angle applied to a LEAFED stem reproduces the flower's forbidden
     leaves-flip-180 / bends-turn-golden disagreement — moving the leafed
     100 x 6 mm row's tip 5.52 mm (measured, stem session 1). */
  { id: 'the-golden-kink-reaches-leafed-stems', why: "every node turns at the golden angle whatever its leaves, so a leafed stem's bends stop turning away from its leaves — the flower's own leaves/bends disagreement, the thing ruled out twice; a watertight stem at the identical station count",
    find: '    const az = bare ? i * GOLDEN_ANGLE : leafAzimuths(phyllo, i, turn)[0] + Math.PI;',
    into: '    const az = i * GOLDEN_ANGLE;', names: ['ST12', 'ST2'],
    witness: (M, C) => { const m = firstKinkDeg(M, NODE_STATE()), c = firstKinkDeg(C, NODE_STATE());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      if (!m.az || !c.az) return 'the leafed witness state carries no node law';
      return (Math.abs(m.az[0] - c.az[0]) > 1 || Math.abs(m.az[1] - c.az[1]) > 1) ? null : `the mutant's leafed kinks turn [${m.az.join(', ')}] against the clean tree's [${c.az.join(', ')}]`; } },
  /* ===== THE NODE SPLIT AND THE DIVERGENCE (Eva's rulings, Oct 6 — leaf/stem
     build S1). Each witnessed on the MUTATED module's own plan or leaf record,
     never on the clause it names. ===== */
  { id: 'the-node-halves-are-coupled-again', why: "the kink reads the SWELLING's amount, so the two controls are one again — #299's coupling the Oct 6 ruling took apart. Invisible on every state with the halves equal (every row before the split), watertight and one piece at a plausible count; only the halves APART can see it",
    find: '    swell: STEM_NODE_SWELL * swelling, slope: STEM_NODE_SLOPE * kink,',
    into: '    swell: STEM_NODE_SWELL * swelling, slope: STEM_NODE_SLOPE * swelling,', names: ['ST12', 'ST2'],
    witness: (M, C) => { const law = (Mm) => { try { const st = SPLIT_STATE(), acc = new Mm.MeshBuilder({ exportMode: true }); return Mm.stemPlan(st, Mm.footRing(st, acc).hub, acc).nodeLaw; } catch (e) { return { threw: e.message }; } };
      const m = law(M), c = law(C);
      if (!m || !c || m.threw || c.threw) return `the witness threw or built no law: ${(m && m.threw) || (c && c.threw) || 'no law'}`;
      return (m.slope !== c.slope && m.swell === c.swell) ? null : `the mutant's slope ${m.slope} / swell ${m.swell} against the clean tree's ${c.slope} / ${c.swell} on the halves-apart state`; } },
  { id: 'the-divergence-never-reaches-the-leaves', why: "the leaves stand at 180 whatever the divergence slider says, while the stem's kinks follow the divergence — the rose's spiral never drawn, on a watertight stem at the identical leaf count, and the leaves and bends disagreeing exactly as the flower's forbidden law does",
    find: '    : nodeDepthsMm.map((_, i) => leafAzimuths(phyllo, i, leafDivergenceTurn(state)));',
    into: '    : nodeDepthsMm.map((_, i) => leafAzimuths(phyllo, i, Math.PI));', names: ['LF5'],
    witness: (M, C) => { const az = (Mm) => { try { const st = DIVERGENCE_STATE(), acc = new Mm.MeshBuilder({ exportMode: true }); const sp = Mm.stemPlan(st, Mm.footRing(st, acc).hub, acc); return Mm.leafPlan(st, sp, acc).azimuths.map((a) => a[0]); } catch (e) { return { threw: e.message }; } };
      const m = az(M), c = az(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (Math.abs(m[1] - Math.PI) < 1e-12 && Math.abs(c[1] - (137.5 / 180) * Math.PI) < 1e-12) ? null : `the mutant's second leaf stands at ${m[1]} rad and the clean tree's at ${c[1]}`; } },
  { id: 'the-divergence-leaks-onto-an-opposite-stem', why: "the opposite arrangement's node turn reads the divergence too, so a hidden slider moves an opposite stem's leaves — a control the panel hides doing something, the dead-slider defect inverted; watertight, one piece, two leaves a node at 180 apart",
    find: "  if (phyllo === 'opposite') { const b = i * Math.PI / 2; return [b, b + Math.PI]; }",
    into: "  if (phyllo === 'opposite') { const b = i * (Number.isFinite(alternateTurn) ? alternateTurn : Math.PI) / 2; return [b, b + Math.PI]; }", names: ['LF5'],
    witness: (M, C) => { const az = (Mm) => { try { const st = DIVERGENCE_STATE({ leafNodes: 4, leafPhyllotaxy: 'opposite', leafDivergence: 90 }), acc = new Mm.MeshBuilder({ exportMode: true }); const sp = Mm.stemPlan(st, Mm.footRing(st, acc).hub, acc); return Mm.leafPlan(st, sp, acc).azimuths.map((a) => a[0]); } catch (e) { return { threw: e.message }; } };
      const m = az(M), c = az(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (Math.abs(c[1] - Math.PI / 2) < 1e-12 && Math.abs(m[1] - Math.PI / 4) < 1e-12) ? null : `the mutant's second opposite node turns ${m[1]} rad and the clean tree's ${c[1]}`; } },
  { id: 'the-petiole-roots-on-the-world-axis', why: "each petiole is rooted about the WORLD axis while the stem has kinked away from it, so a leaf at a lower node roots in the bore or outside the wall — both export watertight",
    /* RE-ANCHORED (leaf/stem build S3) onto `leafRootBase`, the one owner the
       simple blade and the compound tree share. */
    find: '  return o ? [o[0] + plan.rootR * R[0], o[1] + plan.rootR * R[1], z] : [plan.rootR * R[0], plan.rootR * R[1], z];',
    into: '  return [plan.rootR * R[0], plan.rootR * R[1], z];', names: ['LF2'],
    witness: (M, C) => { const m = nodeFacts(M), c = nodeFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return Math.abs(m.lastPetioleX - c.lastPetioleX) > 0.5 || Math.abs(m.lastPetioleY - c.lastPetioleY) > 0.5 ? null
        : `the mutant's lowest petiole roots at (${m.lastPetioleX}, ${m.lastPetioleY}) against (${c.lastPetioleX}, ${c.lastPetioleY}) clean`; } },
  /* ===== RULING 7 — THE FLORIST'S CUT (stem session 3) ===== Three standing
     mutants, each witnessed on the MUTATED module's own cut face
     (`endFaceFacts`), never on the clause it names. */
  { id: 'the-cut-is-flattened', why: "the cut plane's slope is 0, so the stem ends on a flat face at its full length while the plan still says FLORIST — one piece at the same triangle count, with the cut band collapsed to zero height (every cut vertex at the long point's own z, so the band's quads are zero-area and the directed census reads them), which is why ST2 and ST12 fire on its ladder beside the three families named",
    find: 'export const STEM_CUT_SLOPE = 1;',
    into: 'export const STEM_CUT_SLOPE = 0;', names: ['SC2', 'SC3', 'ST10'],
    witness: (M, C) => { const m = endFaceFacts(M), c = endFaceFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (c.faceRiseMm > 1 && m.faceRiseMm < 1e-9) ? null : `the mutant's cut face rises ${m.faceRiseMm} mm above the long point against the clean tree's ${c.faceRiseMm} — it did not flatten`; } },
  { id: 'the-land-is-removed', why: 'the land floor is 0, so the cut runs to a KNIFE EDGE at the long point — the last millimetre of the point under the print floor, which a 0.4 mm nozzle cannot lay; watertight, one piece, the face at N - 2 triangles',
    find: 'export const STEM_CUT_LAND_MIN_MM = Math.max(MIN_FEATURE_MM, 2 * NOZZLE_MM);',
    into: 'export const STEM_CUT_LAND_MIN_MM = 0;', names: ['SC2', 'SC3'],
    witness: (M, C) => { const m = endFaceFacts(M), c = endFaceFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (c.landCount >= 3 && m.landCount === 1) ? null : `the mutant's land holds ${m.landCount} vertex/vertices against the clean tree's ${c.landCount} — the land did not go`; } },
  { id: 'the-bore-opens-through-the-cut-face', why: "the plug under a cut hollow stem is Eva's flat 1.5 mm again, so the void's floor sits BELOW the cut plane on the short-point side and the bore opens through the face — the shell self-intersects, but it is still watertight by the edge census, one piece, and at the same triangle count",
    find: '  const tipPlugMm = boreR > 0 ? (cutMade ? cutPlugMm : STEM_MIN_WALL_MM) : 0;',
    into: '  const tipPlugMm = boreR > 0 ? STEM_MIN_WALL_MM : 0;', names: ['ST10'],
    witness: (M, C) => { const m = endFaceFacts(M), c = endFaceFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      if (m.tris !== c.tris) return `the triangle count moved ${c.tris} -> ${m.tris}; this mutant's whole point is that it does not`;
      return (c.voidBelowPlaneMm < -1 && m.voidBelowPlaneMm > 1) ? null : `the mutant's void floor stands ${m.voidBelowPlaneMm} mm BELOW the cut plane at the bore's far edge against the clean tree's ${c.voidBelowPlaneMm} — the bore did not open through the face`; } },

  /* ===== THE STAMEN LENGTH VARIANCE (F1.2 — Eva's rulings of Oct 12) =====
     Four mutations of the ONE owner `stamenLengthFor()`, each witnessed on
     the mutated module's own stamp before JS8 is consulted. JS8 restates the
     law from the controls and the index and reads the EMITTED rod chords, so
     each of these moves a chord the restatement does not. */
  { id: 'the-length-variance-is-ignored', why: 'the identity branch is taken at EVERY amount — the slider is a dead control: every filament the length above, at a count the read-out still prints as varied',
    find: '  if (amount === 0) return { askedMm: L, builtMm: L, clamped: false, unit: stamenVarianceUnit(i) };',
    into: '  if (amount >= 0) return { askedMm: L, builtMm: L, clamped: false, unit: stamenVarianceUnit(i) };', names: ['JS8'],
    witness: (M, C) => { const m = stamenLengths(M, VARIED_SIX()), c = stamenLengths(C, VARIED_SIX());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const distinct = (a) => new Set(a).size;
      return (distinct(c) > 1 && distinct(m) === 1 && m[0] === 20) ? null : `the mutant builds ${distinct(m)} distinct lengths (${m.join(', ')}) against the clean tree's ${distinct(c)} — the variance still reaches the rods`; } },
  { id: 'the-variance-is-the-same-for-every-stamen', why: 'every stamen draws stamen 0\'s unit — one length again, merely a different one, and the sheet reads as a uniform androecium at 104% of the slider',
    find: '  const askedMm = L * (1 + amount * stamenVarianceUnit(i));',
    into: '  const askedMm = L * (1 + amount * stamenVarianceUnit(0));', names: ['JS8'],
    witness: (M, C) => { const m = stamenLengths(M, VARIED_SIX()), c = stamenLengths(C, VARIED_SIX());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const distinct = (a) => new Set(a).size;
      return (distinct(c) > 1 && distinct(m) === 1 && m[0] !== 20) ? null : `the mutant builds ${distinct(m)} distinct lengths (${m.join(', ')}) against the clean tree's ${distinct(c)}`; } },
  { id: 'the-seed-is-not-the-index', why: 'the unit is drawn from Math.random(): a design no longer reproduces — two builds of one control set differ, which the ruling (seeded, derived, never a control) forbids',
    find: '  const askedMm = L * (1 + amount * stamenVarianceUnit(i));',
    into: '  const askedMm = L * (1 + amount * (Math.random() * 2 - 1));', names: ['JS8'],
    witness: (M, C) => { const m1 = stamenLengths(M, VARIED_SIX()), m2 = stamenLengths(M, VARIED_SIX()), c1 = stamenLengths(C, VARIED_SIX()), c2 = stamenLengths(C, VARIED_SIX());
      if (m1.threw || c1.threw) return `the witness threw: ${m1.threw || c1.threw}`;
      const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
      return (same(c1, c2) && !same(m1, m2)) ? null : `two builds of the mutant ${same(m1, m2) ? 'AGREE' : 'differ'} and two of the clean tree ${same(c1, c2) ? 'agree' : 'DIFFER'} — the seed did not stop being the index`; } },
  { id: 'the-ceiling-is-unclamped', why: 'a long draw is built past Eva\'s fixed 120 mm ceiling — a 240 mm filament on a slider whose end says 120, told as unclamped',
    find: '  const builtMm = Math.min(STAMEN_LENGTH_RANGE[1], Math.max(STAMEN_LENGTH_RANGE[0], askedMm));',
    into: '  const builtMm = Math.max(STAMEN_LENGTH_RANGE[0], askedMm);', names: ['JS8'],
    /* PROBED AT length 120 x variance 1, where half the draws ask past the
       ceiling; on the varied-six row at 20 mm nothing reaches it and the
       mutation is inert there by construction (`bore-is-not-evas-rule`). */
    witness: (M, C) => { const m = stamenLengths(M, VARIED_120()), c = stamenLengths(C, VARIED_120());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (Math.max(...c) === 120 && Math.max(...m) > 120) ? null : `the mutant's longest filament is ${Math.max(...m)} mm against the clean tree's ${Math.max(...c)} — nothing passed the ceiling`; } },
  /* ===================================================================
     THE INDEPENDENT COIL (F1.3a) — JS9's own four, each witnessed on the
     MUTATED module's own builder records (station centres, end direction,
     the owner's per-stamen coil record) before JS9 is consulted. JS9 restates
     the helix from the controls and the index against the EMITTED rings, so
     each moves a station, a direction or a count the restatement does not. */
  { id: 'the-coil-is-ignored', why: 'the rod never takes its coiled arm: a plain filament on a panel that says COILED, every read-out line still describing a helix',
    find: '  if (coil === null) {\n    for (let k = 1; k <= STAMEN_ROWS; k++) {',
    into: '  if (true) {\n    for (let k = 1; k <= STAMEN_ROWS; k++) {', names: ['JS9'],
    witness: (M, C) => { const m = coiledStamens(M, COILED_SIX()), c = coiledStamens(C, COILED_SIX());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const nm = m.stamens[0].stations.length, nc = c.stamens[0].stations.length;
      return (nc === 2 + c.A.coil.rows && nm === 18) ? null : `the mutant's rod carries ${nm} ring centres against the clean tree's ${nc} — the coil still reaches the rod`; } },
  { id: 'every-stamen-coils-at-the-same-phase', why: 'every stamen draws stamen 0\'s phase: the androecium coils in lockstep, a machined spring set rather than a flower — the ruling derives a phase PER STAMEN',
    find: '  const phaseUnit = stamenCoilPhaseUnit(i);',
    into: '  const phaseUnit = stamenCoilPhaseUnit(0);', names: ['JS9'],
    witness: (M, C) => { const m = coiledStamens(M, COILED_SIX()), c = coiledStamens(C, COILED_SIX());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const ph = (r) => new Set(r.A.stamens.map((s) => s.coil.phaseRad)).size;
      return (ph(c) === 6 && ph(m) === 1) ? null : `the mutant draws ${ph(m)} distinct phases against the clean tree's ${ph(c)}`; } },
  { id: 'the-anther-stands-upright-on-the-coil', why: 'the anther is aimed along the PLAIN filament\'s end direction instead of the coil\'s end tangent (Q2.5): it sits askew on the wire, at the angle of the helix',
    find: '  const D = rod.coil ? rod.end.D : rod.at(lengthMm).D;\n  const rodT = rod.coil ? rod.end.T : rod.T;',
    into: '  const D = rod.at(lengthMm).D;\n  const rodT = rod.T;', names: ['JS9'],
    witness: (M, C) => { const m = coiledStamens(M, COILED_SIX()), c = coiledStamens(C, COILED_SIX());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      /* The angle between the rod's reported end direction and its last emitted segment. */
      const off = (r) => Math.max(...r.stamens.map((s) => { const a = s.stations[s.stations.length - 2], b = s.stations[s.stations.length - 1], v = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], n = Math.hypot(...v); return Math.acos(Math.min(1, (v[0] * s.dir[0] + v[1] * s.dir[1] + v[2] * s.dir[2]) / n)) * 180 / Math.PI; }));
      return (off(c) < 15 && off(m) > 30) ? null : `the mutant's anther leaves its wire at ${off(m).toFixed(1)} deg against the clean tree's ${off(c).toFixed(1)} deg`; } },
  { id: 'the-coil-curvature-is-unfloored', why: 'the turns are never clamped: twelve turns on a 20 mm filament draw a coil tighter than one sheet thickness of radius — the floor Q2.3 rules — told as unclamped',
    find: '  const turnsClamped = !ok(n);',
    into: '  const turnsClamped = false;', names: ['JS9'],
    witness: (M, C) => { const m = coiledStamens(M, COILED_TIGHT()), c = coiledStamens(C, COILED_TIGHT());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (c.A.coil.turnsMax < 12 && m.A.coil.turnsMax === 12) ? null : `the mutant builds ${m.A.coil.turnsMax} turns against the clean tree's ${c.A.coil.turnsMax}`; } },
  /* ===================================================================
     THE BRAID (the braid session — docs/bloom-stamen-braid-outcome.md).
     Seven mutants, each witnessed on the MUTATED module's own builder
     records (station centres, end direction, the owner's per-strand braid
     record) before JS9 is consulted. JS9's braid arm restates every strand
     from the controls, the index and the row's @scopes against the EMITTED
     rings. Scoped to the braid rows (`rows: BRAID_ROWS`, and the rows carry
     `for: /braid|strand/`), so no shard pays for them on every row. */
  /* BIG PETALS (Oct 21): THE PARTS' ROOT SPAN FOLLOWS THE HUB. A petal past
     35 mm thickens the hub plate, and a stamen or the style is rooted THROUGH
     that slab (footRing()'s `rootSpan`); a root one sheet long sits wholly
     inside the plate and the part loses (hub - sheet)/2 of visible length.
     JS1 / JG1 read the emitted root's span against the hub. Found in CI on
     ALL MAX; witnessed on the mutated module's own stamen and style records.
     It NAMES JS1 ONLY: this table runs stamenAssertions and never the
     gynoecium family, so JG1 cannot fire here (measured: SILENT) — the same
     `rootSpan` reaches the style, and JG1 is held by both STL gates on the
     mum's style and stigma rows, where the root's span is what moves. */
  { id: 'the-part-root-spans-the-sheet', why: 'a stamen and the style are rooted one SHEET deep on a thickened hub: their roots sit inside the plate and both stand shorter than asked',
    find: '  const rootSpan = hubThickness;',
    into: '  const rootSpan = thickness;', names: ['JS1'], rows: /the roots span the thickened hub/,
    witness: (M, C) => {
      const st = { ...REGISTRY_DEFAULTS, petalLength: 100, stamenCount: 6, gynoecium: 'STYLE' };
      const span = (G) => { const b = G.buildBloomInto(new G.MeshBuilder({ exportMode: true }), st, {}); const s0 = b.stamens[0], y0 = b.styles[0]; return [s0.outer[2] - s0.inner[2], y0.outer[2] - y0.inner[2], b.hub.thickness]; };
      try { const [ms, my, mh] = span(M), [cs, cy] = span(C);
        return (Math.abs(cs - mh) < 1e-9 && Math.abs(cy - mh) < 1e-9 && ms < mh - 1 && my < mh - 1) ? null : `the mutant's stamen root spans ${ms} and its style root ${my} on a ${mh} mm hub (clean ${cs} / ${cy})`;
      } catch (e) { return `the witness threw: ${String(e && e.message || e)}`; } } },
  { id: 'the-braid-is-ignored', why: 'coilLaw never takes its braided arm: every strand coils about its OWN root as an independent coil does, on a panel that says ONE BUNDLE',
    find: "  if (coil.mode === 'BRAIDED') return braidLaw({ length, coil, frame });",
    into: "  if (false) return braidLaw({ length, coil, frame });", names: ['JS9'], rows: BRAID_ROWS,
    witness: (M, C) => { const m = braidStamens(M, BRAID_SIX()), c = braidStamens(C, BRAID_SIX());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const spread = (r) => { const e = endRadii(r); return Math.max(...e) - Math.min(...e); };
      const far = (r) => Math.max(...endRadii(r));
      return (far(c) < 2.2 && far(m) > 2.6) ? null : `the mutant's strands end up to ${far(m).toFixed(3)} mm off the axis against the clean tree's ${far(c).toFixed(3)} (spread ${spread(m).toFixed(3)} / ${spread(c).toFixed(3)})`; } },
  { id: 'every-strand-braids-at-the-same-phase', why: 'every strand is laid at ONE angle in the bundle: the strands wind on top of one another instead of round it',
    find: '           azimuth, phaseRad: Math.PI - azimuth, rampMm,',
    into: '           azimuth, phaseRad: Math.PI, rampMm,', names: ['JS9'], rows: BRAID_ROWS,
    witness: (M, C) => { const m = braidStamens(M, BRAID_SIX()), c = braidStamens(C, BRAID_SIX());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const dist = (r) => new Set(endAngles(r).map((a) => a.toFixed(3))).size;
      return (dist(c) === 6 && dist(m) === 1) ? null : `the mutant's strands end at ${dist(m)} distinct angles against the clean tree's ${dist(c)}`; } },
  { id: 'the-anther-stands-upright-on-the-braid', why: 'a braided strand\'s anther is aimed along the plain filament\'s end direction instead of the braid\'s end tangent (ruling 2): it sits askew on the strand',
    find: '  const D = rod.coil ? rod.end.D : rod.at(lengthMm).D;\n  const rodT = rod.coil ? rod.end.T : rod.T;',
    into: "  const D = rod.coil && s.coil.mode !== 'BRAIDED' ? rod.end.D : rod.at(lengthMm).D;\n  const rodT = rod.coil && s.coil.mode !== 'BRAIDED' ? rod.end.T : rod.T;", names: ['JS9'], rows: BRAID_ROWS,
    witness: (M, C) => { const m = braidStamens(M, BRAID_SIX()), c = braidStamens(C, BRAID_SIX());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const off = (r) => Math.max(...r.stamens.map((s) => { const a = s.stations[s.stations.length - 2], b = s.stations[s.stations.length - 1], v = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], n = Math.hypot(...v); return Math.acos(Math.min(1, (v[0] * s.dir[0] + v[1] * s.dir[1] + v[2] * s.dir[2]) / n)) * 180 / Math.PI; }));
      return (off(c) < 15 && off(m) > 30) ? null : `the mutant's anther leaves its strand at ${off(m).toFixed(1)} deg against the clean tree's ${off(c).toFixed(1)} deg`; } },
  { id: 'the-braid-gather-is-unfloored', why: 'the gather is laid at its 45-degree run whatever the floor asks: a strand turns onto the bundle tighter than one sheet thickness of radius',
    find: '  const gatherMm = Math.min(L, Math.max(gatherNeedMm, BRAID_GATHER_RUN * g.deltaMm));',
    into: '  const gatherMm = Math.min(L, BRAID_GATHER_RUN * g.deltaMm);', names: ['JS9'], rows: BRAID_ROWS,
    witness: (M, C) => { const m = braidStamens(M, BRAID_SIX()), c = braidStamens(C, BRAID_SIX());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const gs = (r) => r.A.stamens.map((s) => s.coil.gatherMm);
      const moved = gs(m).filter((g, i) => g !== gs(c)[i]).length;
      return moved ? null : `the mutant's gathers ${JSON.stringify(gs(m))} equal the clean tree's — the floor never bound`; } },
  { id: 'the-braid-turns-are-unfloored', why: 'the braid\'s turns are never clamped: twelve turns on 20 mm wind a strand tighter than one sheet thickness of radius, told as unclamped',
    find: '  const twistClamped = gatherClamped || !fits(n);',
    into: '  const twistClamped = gatherClamped;', names: ['JS9'], rows: BRAID_ROWS,
    witness: (M, C) => { const m = braidStamens(M, BRAID_TIGHT()), c = braidStamens(C, BRAID_TIGHT());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (c.A.coil.turnsMax < 12 && m.A.coil.turnsMax === 12) ? null : `the mutant builds ${m.A.coil.turnsMax} turns against the clean tree's ${c.A.coil.turnsMax}`; } },
  { id: 'the-braid-fold-limit-is-removed', why: 'a strand is laid at its asked radius about a curled bundle tighter than that radius: its inner skin passes the bend\'s centre (the spine-cup-fold ruling, per strand)',
    find: '  const foldClamped = Rasked > foldR;',
    into: '  const foldClamped = false;', names: ['JS9'], rows: BRAID_ROWS,
    witness: (M, C) => { const m = braidStamens(M, BRAID_FOLD()), c = braidStamens(C, BRAID_FOLD());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const laid = (r) => Math.max(...r.A.stamens.map((s) => s.coil.radiusLaidMm));
      return (laid(c) < 10 && laid(m) === 10) ? null : `the mutant lays its strands at ${laid(m)} mm against the clean tree's ${laid(c)}`; } },
  { id: 'a-strand-scope-is-ignored', why: 'a strand\'s own values never reach it: the picker edits a record the build does not read, and every strand is the bundle\'s',
    find: '      const strandTerm = braidOn ? strandOffsetsFor(strandScopes, i) : null;',
    into: '      const strandTerm = null;', names: ['JS9'], rows: BRAID_ROWS,
    witness: (M, C) => { const m = braidStamens(M, BRAID_SIX(), BRAID_STRANDS), c = braidStamens(C, BRAID_SIX(), BRAID_STRANDS);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const len = (r) => r.A.stamens.map((s) => s.lengthMm);
      return (len(c)[1] === 30 && len(m)[1] === 20) ? null : `the mutant builds strand 2 at ${len(m)[1]} mm against the clean tree's ${len(c)[1]}`; } },
  /* ===== THE SPINE CURVE (F3-global — docs/bloom-spine-curve-outcome.md).
     Five mutants, each witnessed on the MUTATED module's own spine record or
     refusal on a curve-mode state, never on C1 (the clause they all name).
     ===== */
  { id: 'the-curve-is-ignored', why: 'spineLaw drops the curve arm, so a CURVE-mode spine is built STRAIGHT (curl 0, the hidden family inert) while the record still says curve mode — watertight, one piece, the same triangle count, the read-out quoting a law nothing followed',
    find: '    const kRaw = (Phi(u1) - Phi(i / N)) / ds + (curve === null ? 0 : curve.kappaAtMm((i + 0.5) * ds));',
    into: '    const kRaw = (Phi(u1) - Phi(i / N)) / ds;', names: ['C1'],
    witness: (M, C) => { const m = curveSpine(M, CURVE_HOOK()), c = curveSpine(C, CURVE_HOOK());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (Math.abs(m.turnBuiltDeg) < 1e-9 && Math.abs(c.turnBuiltDeg) > 10) ? null : `the mutant built a turn of ${m.turnBuiltDeg}° against the clean tree's ${c.turnBuiltDeg}°`; } },
  { id: 'a-refused-drag-clamps', why: 'the validator never refuses, so a drag past the printable floor is ACCEPTED and the build CLAMPS it — clamp-and-tell where Q4.4 ruled refusal; the point moves, the spine does not follow it, and every STL gate is green',
    /* re-anchored by spine-cup-fold: the floor's refusal is its own `if
       (worst) return` now, and the fold limit's answer follows it */
    find: '  if (worst) return `the spine would bend to a ${(1 / worst.peakKmm).toFixed(2)}',
    into: '  if (false) return `the spine would bend to a ${(1 / worst.peakKmm).toFixed(2)}', names: ['C1'],
    witness: (M, C) => { const m = curveSpine(M, CURVE_UNDER()), c = curveSpine(C, CURVE_UNDER());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      if (!c.clamped || c.curveRefusal === null) return `the clean tree does not clamp and refuse the under-floor curve (clamped ${c.clamped}, refusal ${JSON.stringify(c.curveRefusal)}) — the probe state is outside the mutant\'s subject`;
      return (m.clamped && m.curveRefusal === null) ? null : `the mutant\'s validator still answers ${JSON.stringify(m.curveRefusal)} on a curve the build clamps (${m.clamped})`; } },
  { id: 'curvature-taken-from-the-slider-in-curve-mode', why: 'the mode predicate is always SLIDER, so CURVE mode builds the slider family and ignores the drawn curve — the control shows a curve, the geometry draws the slider; a hidden slider doing something and a visible curve doing nothing',
    find: "export function curlIsCurve(state) { return state.petalCurlMode === 'CURVE'; }",
    into: 'export function curlIsCurve(state) { return false; }', names: ['C1'],
    witness: (M, C) => { const m = curveSpine(M, CURVE_HOOK()), c = curveSpine(C, CURVE_HOOK());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (!m.curveMode && c.curveMode && m.curlRad !== 0) ? null : `the mutant\'s record reads curve mode ${m.curveMode} / curl ${m.curlRad} rad against the clean tree\'s ${c.curveMode} / ${c.curlRad}`; } },
  { id: 'the-hidden-curl-controls-still-applied', why: 'petalForm reads the Spine curl slider in CURVE mode too, so the hidden family (and every curl delta and the variance curl term composed into it) is ADDED to the drawn curve — a hidden control moving the geometry, the dead-slider defect inverted',
    find: '  const curlRad = spineCurve !== null ? 0 : state.petalSpineCurl * D2R;',
    into: '  const curlRad = state.petalSpineCurl * D2R;', names: ['C1'],
    witness: (M, C) => { const m = curveSpine(M, CURVE_HOOK()), c = curveSpine(C, CURVE_HOOK());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (Math.abs(m.turnBuiltDeg - c.turnBuiltDeg) > 1) ? null : `the mutant\'s built turn ${m.turnBuiltDeg}° is the clean tree\'s ${c.turnBuiltDeg}° — the slider at 150 did not reach the curve-mode spine`; } },
  { id: 'the-validator-and-the-build-disagree-on-the-floor', why: 'the refusal asks HALF the floor (a radius of half a sheet thickness), so a drag the editor accepts builds a clamped spine — the one thing the ruling\'s refusal exists to make impossible, invisible to every STL gate',
    find: '    if (law.peakKmm > 1 / floorR && (!worst || law.peakKmm > worst.peakKmm)) worst = { ...law, L };',
    into: '    if (law.peakKmm > 2 / floorR && (!worst || law.peakKmm > worst.peakKmm)) worst = { ...law, L };', names: ['C1'],
    witness: (M, C) => { const m = curveSpine(M, CURVE_UNDER()), c = curveSpine(C, CURVE_UNDER());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      if (c.curveRefusal === null) return 'the clean tree accepts the under-floor curve — the probe is outside the mutant\'s subject';
      return (m.curveRefusal === null && m.clamped) ? null : `the mutant still refuses (${JSON.stringify(m.curveRefusal)}) a curve at 0.69 mm against a 0.60 mm half-floor, or did not clamp (${m.clamped})`; } },
  /* ===== THE FOLD LIMIT (spine-cup-fold — docs/bloom-spine-cup-fold-outcome.md).
     Four plausible wrong limits, each witnessed on the MUTATED module's own spine
     record on the drawn S at cup 0.6, never on the clause it names. Scoped to
     the two fold rows (and they to these), the tier precedent. ===== */
  { id: 'the-fold-limit-drops-the-cup', why: 'the reach reads only the section\'s width (its twist term), never its lift — the cup is out of the limit, so the cupped margin passes the bend\'s centre and the sheet folds through itself, watertight and one piece; the validator agrees with the build because both read the same wrong table',
    find: '      const d = P[0] * st + P[1] * ct;', into: '      const d = P[0] * st;', names: ['C5'], rows: FOLD_ROWS,
    witness: (M, C) => { const m = foldSpine(M, FOLD_S()), c = foldSpine(C, FOLD_S());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (c.bendClamped && !m.bendClamped) ? null : `the mutant\'s fold limit bound ${m.bendClamped} against the clean tree\'s ${c.bendClamped}`; } },
  { id: 'the-validator-forgets-the-fold-limit', why: 'the curve\'s validator asks only the floor, so the editor ACCEPTS a drag the build then clamps at the fold limit — the point moves, the spine does not follow it; the validator and the build use different limits',
    find: '  return spineBendRefusal(curve, bends);\n}', into: '  return null;\n}', names: ['C1'], rows: FOLD_ROWS,
    witness: (M, C) => { const m = foldSpine(M, FOLD_S()), c = foldSpine(C, FOLD_S());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (c.curveRefusal !== null && m.curveRefusal === null && m.bendClamped) ? null : `the mutant\'s validator answers ${JSON.stringify(m.curveRefusal)} (clamped ${m.bendClamped}) against the clean tree\'s ${JSON.stringify(c.curveRefusal)}`; } },
  { id: 'the-fold-limit-is-not-applied', why: 'the build never hands spineLaw the table (a loaded curve, or a slider, folding is built as asked) while the validator still refuses it — the load-time lift skipped: refused in the editor, folded in the file',
    find: 'curve: curveLaw, bend: bend && bend.binds ? bend : null }) : null;', into: 'curve: curveLaw, bend: null }) : null;', names: ['C5'], rows: FOLD_ROWS,
    witness: (M, C) => { const m = foldSpine(M, FOLD_S()), c = foldSpine(C, FOLD_S());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (c.bendClamped && !m.bendClamped && m.curveRefusal !== null) ? null : `the mutant clamped ${m.bendClamped} and refused ${JSON.stringify(m.curveRefusal)} against the clean tree\'s ${c.bendClamped}`; } },
  { id: 'the-fold-margin-measured-from-the-mid-surface', why: 'the limit stops when the MID-SURFACE reaches the bend\'s centre, with the inner skin already half a sheet past it — Eva\'s ruling is the skin; the inner face inverts, under the 56-row mesh\'s resolution of the fold',
    find: '  const marginMm = t / 2;', into: '  const marginMm = 0;', names: ['C5'], rows: FOLD_ROWS,
    witness: (M, C) => { const m = foldSpine(M, FOLD_S()), c = foldSpine(C, FOLD_S());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      if (!m.bend || !c.bend) return `the fold limit did not bind (mutant ${!!m.bend}, clean ${!!c.bend}) — the probe is outside the mutant\'s subject`;
      return (Math.abs(m.bend.limitRadiusMm - m.bend.reachMm) < 1e-9 && Math.abs(c.bend.limitRadiusMm - c.bend.reachMm - c.sheet / 2) < 1e-9) ? null : `the mutant\'s limit is reach + ${m.bend.limitRadiusMm - m.bend.reachMm} against the clean tree\'s reach + ${c.bend.limitRadiusMm - c.bend.reachMm}`; } },
  /* ===== THE OUTLINE CURVE (F6-sym — docs/bloom-outline-curve-outcome.md).
     Five plausible wrong outlines, each watertight and one piece at the same
     triangle count, each witnessed on the MUTATED module's own petal record.
     Scoped to the two outline rows (and they to these), the tier precedent. */
  { id: 'the-outline-curve-is-ignored', why: 'the CORE term keeps the law in CURVE mode, so the petal is drawn from the hidden tapers and tip shape while the editor shows a curve — a visible control doing nothing and hidden ones doing everything',
    find: 'at: tubeLaw ? tubeLaw.at : outline ? outline.halfAtMm : chev ?', into: 'at: tubeLaw ? tubeLaw.at : chev ?', names: ['OC1'], rows: OUTLINE_ROWS,
    witness: (M, C) => { const m = outlinePetal(M, OUTLINE_LAWSET()), c = outlinePetal(C, OUTLINE_LAWSET());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      /* the foot rows carry no base half-width (undefined) — compare the blade's */
      const d = Math.max(...m.base.map((h, i) => (Number.isFinite(h) && Number.isFinite(c.base[i]) ? Math.abs(h - c.base[i]) : 0)));
      return d > 0.5 ? null : `the mutant's emitted outline is within ${d} mm of the clean tree's — the law did not replace the curve`; } },
  { id: 'teeth-still-cut-in-curve-mode', why: 'lobesEligible forgets the outline curve, so the hidden lobe depth cuts teeth into a drawn outline — a hidden control moving the geometry; the registry still hides it',
    find: 'export function lobesEligible(state) { return !outlineIsCurve(state) && !fringeEngaged(state); }',
    into: 'export function lobesEligible(state) { return !fringeEngaged(state); }', names: ['OC0'], rows: OUTLINE_ROWS,
    witness: (M, C) => { const m = outlinePetal(M, OUTLINE_LAWSET()), c = outlinePetal(C, OUTLINE_LAWSET());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.lobes !== null && c.lobes === null) ? null : `the mutant's lobe record is ${JSON.stringify(m.lobes && m.lobes.count)} against the clean tree's ${JSON.stringify(c.lobes)}`; } },
  { id: 'the-outline-curve-reaches-the-foot', why: 'in CURVE mode the foot\'s own blend is dropped, so the curve owns the base and the blade leaves the hub narrower than its foot (Q6.2: the foot stays the hub\'s) — watertight, and only a restatement of the blend from the ring sees it',
    find: 'const rootBlendRaw = (stalk || petiole) ? () => 0 :', into: 'const rootBlendRaw = (stalk || petiole || outline) ? () => 0 :', names: ['OC1'], rows: OUTLINE_ROWS,
    witness: (M, C) => { const m = outlinePetal(M, OUTLINE_LAWSET()), c = outlinePetal(C, OUTLINE_LAWSET());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const i = m.u.findIndex((u) => u > 0);
      return (c.base[i] - m.base[i] > 0.5) ? null : `the mutant's first blade row is ${m.base[i]} mm against the clean tree's ${c.base[i]} — the foot's blend still floors it`; } },
  { id: 'the-outline-length-is-not-fitted', why: 'an outline curve closes on the PETAL\'s nib, which reparameterises and reports a drawn length off the slider — Q6.1 ruled the drawn length always equals the slider, fitted and never reported as a difference',
    find: 'const apex = (petiole || outline)', into: 'const apex = petiole', names: ['AN2', 'C1'], rows: OUTLINE_ROWS,
    witness: (M, C) => { const m = outlinePetal(M, OUTLINE_LAWSET()), c = outlinePetal(C, OUTLINE_LAWSET());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (Math.abs(m.length - m.asked) > 1e-6 && c.length === c.asked) ? null : `the mutant drew ${m.length} mm of ${m.asked} asked; the clean tree ${c.length} of ${c.asked}`; } },
  { id: 'the-outline-validator-and-the-build-disagree-on-the-floor', why: 'the validator asks the LIVE mesh floor (0.15 mm) while the build lifts at the print floor (0.80), so a drag the editor accepts builds a lifted outline — the one thing the refusal exists to make impossible',
    /* re-anchored F6-asym: the validator now asks each half of a two-sided curve */
    find: '        else if (!worst || f.askedMm < worst.askedMm) worst = { ...f, L: a.lengthMm, scale: a.scale, side };',
    into: '        else if (f.askedMm <= TIP_CAP_HALF_MM && (!worst || f.askedMm < worst.askedMm)) worst = { ...f, L: a.lengthMm, scale: a.scale, side };', names: ['OC2'], rows: OUTLINE_ROWS,
    witness: (M, C) => { const m = outlinePetal(M, OUTLINE_UNDER()), c = outlinePetal(C, OUTLINE_UNDER());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      if (c.refusal == null || !c.lifted) return `the clean tree does not refuse and lift the under-floor outline (refusal ${JSON.stringify(c.refusal)}, lifted ${c.lifted}) — the probe is outside the mutant's subject`;
      return (m.refusal == null && m.lifted > 0) ? null : `the mutant's validator still answers ${JSON.stringify(m.refusal)} on an outline the build lifts (${m.lifted})`; } },
  /* ===== THE OUTLINE CURVE'S FOLLOW-UPS (F6-sym-2 — docs/bloom-outline-curve-2-
     outcome.md). Five plausible wrong answers to Eva's two rulings, each
     watertight and one piece at the same triangle count, each witnessed on the
     MUTATED module's own petal record. Scoped to the four F6-sym-2 rows. */
  { id: 'the-outline-width-scale-is-ignored', why: 'Petal width keeps setting only the foot in CURVE mode (#417\'s behaviour), so a 24 mm petal draws the 16 mm curve — Eva ruled the width SCALES the drawn widths',
    find: '      const scale = outlineWidthScale(state);\n      const pl = outlineCurvePlan(', into: '      const scale = 1;\n      const pl = outlineCurvePlan(', names: ['OC3', 'OC1'], rows: OUTLINE2_ROWS,
    witness: (M, C) => { const m = outlinePetal(M, OUTLINE_W(24)()), c = outlinePetal(C, OUTLINE_W(24)());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const d = blandDiff(m, c);
      return d > 0.5 ? null : `the mutant's 24 mm outline is within ${d} mm of the clean tree's — the scale still applies`; } },
  { id: 'the-width-scale-moves-the-positions', why: 'the width scale is applied to the points\' x as well as y, so a narrower petal also moves its widest point toward the base — the ruling scales WIDTHS, the lengthwise positions are fractions of the length and stay',
    find: '    return [p[0], y];\n  });\n  const fn = curveFunction(built, OUTLINE_CURVE_SPEC);', into: '    return [p[0] * Math.min(1, scale), y];\n  });\n  const fn = curveFunction(built, OUTLINE_CURVE_SPEC);', names: ['OC1'], rows: OUTLINE2_ROWS,
    witness: (M, C) => { const m = outlinePetal(M, OUTLINE_W(12)()), c = outlinePetal(C, OUTLINE_W(12)());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const d = blandDiff(m, c);
      return d > 0.1 ? null : `the mutant's 12 mm outline is within ${d} mm of the clean tree's — the positions did not move`; } },
  { id: 'the-curve-starts-below-the-throat', why: 'on a tube the curve is still laid over the WHOLE blade and read from the throat up, so the lobe shows the curve\'s middle rather than its start — Eva\'s call puts the curve\'s first point AT the throat',
    find: '  const u0 = throat ? throat.u : 0;', into: '  const u0 = 0;', names: ['OC1'], rows: OUTLINE2_ROWS,
    witness: (M, C) => { const m = outlinePetal(M, OUTLINE_TUBE()), c = outlinePetal(C, OUTLINE_TUBE());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const d = blandDiff(m, c);
      return d > 0.5 ? null : `the mutant's tubular outline is within ${d} mm of the clean tree's — the lobe map did not move`; } },
  { id: 'the-throat-width-is-not-pinned', why: 'on a tube the curve\'s first point keeps the hand\'s width, so the lobe steps off the tube\'s own width at the throat — watertight on a fixed lattice, a visible ledge',
    find: '    if (i === 0 && throat) {', into: '    if (false && i === 0 && throat) {', names: ['OC3'], rows: OUTLINE2_ROWS,
    witness: (M, C) => { const m = outlinePetal(M, OUTLINE_TUBE()), c = outlinePetal(C, OUTLINE_TUBE());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const i = c.u.findIndex((u) => u >= 0.4);
      return Math.abs(m.base[i] - c.base[i]) > 0.5 ? null : `the mutant's first row above the throat is ${m.base[i]} mm against the clean tree's ${c.base[i]} — no step`; } },
  { id: 'the-validator-and-the-build-disagree-on-the-scaled-floor', why: 'the validator asks about the UNSCALED points while the build lifts the scaled ones, so a narrow Petal width the editor accepts builds a lifted outline — the refusal and the lift are one decision',
    /* re-anchored F6-asym: the validator now asks each half of a two-sided curve */
    find: '      for (const f of outlineCurvePlan(cv, a.lengthMm, side ? { scale: a.scale, throat, side } : { scale: a.scale, throat }).lifted) {', into: '      for (const f of outlineCurvePlan(cv, a.lengthMm, side ? { scale: 1, throat, side } : { scale: 1, throat }).lifted) {', names: ['OC2'], rows: OUTLINE2_ROWS,
    witness: (M, C) => { const m = outlinePetal(M, OUTLINE_W(10, OUTLINE_TAIL_PTS)()), c = outlinePetal(C, OUTLINE_W(10, OUTLINE_TAIL_PTS)());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      if (c.refusal == null || !c.lifted) return `the clean tree does not refuse and lift the tail at 10 mm (refusal ${JSON.stringify(c.refusal)}, lifted ${c.lifted}) — the probe is outside the mutant's subject`;
      return (m.refusal == null && m.lifted > 0) ? null : `the mutant's validator still answers ${JSON.stringify(m.refusal)} on an outline the build lifts (${m.lifted})`; } },
  /* ===== THE ASYMMETRIC OUTLINE (F6-asym — docs/bloom-outline-curve-asym-
     outcome.md). Four plausible wrong two-sided outlines, each watertight and
     one piece at the same triangle count, each witnessed on the MUTATED
     module's own record. The other three the session owes live where their
     clauses do: the bead following one side only is the edge gate's (E7), the
     infill tiling a mirrored outline the infill gate's (I11), and Asym->Sym
     keeping the right half the panel gate's route (af). Scoped to the two
     asymmetric rows (and they to these). */
  { id: 'the-right-half-is-the-left-mirrored', why: 'the right half of an Asymmetric outline is built from the LEFT half\'s points, so the petal is the symmetric one whatever the right curve says — the editor shows two halves and the print carries one',
    find: "    widthProfileOne(state, ring, halfW, cap, acc, length, 'right'));", into: "    widthProfileOne(state, ring, halfW, cap, acc, length, 'left'));", names: ['OC0', 'OC1'], rows: ASYM_ROWS,
    witness: (M, C) => { const m = asymPetal(M, ASYM_SET()), c = asymPetal(C, ASYM_SET());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const dm = Math.max(...m.L.map((h, i) => Math.abs(h - m.R[i]))), dc = Math.max(...c.L.map((h, i) => Math.abs(h - c.R[i])));
      return (dm === 0 && dc > 1) ? null : `the mutant's halves differ by ${dm} mm (the clean tree's by ${dc})`; } },
  { id: 'the-halves-are-swapped', why: 'the section draws the RIGHT half on the viewer\'s left and the left half on the right — every half-width record still reads right, so the petal is the mirror image of the one drawn in the editor',
    find: '    const sect = (v) => (v > 0 ? sL(v) : sR(v));', into: '    const sect = (v) => (v > 0 ? sR(v) : sL(v));', names: ['OC4'], rows: ASYM_ROWS,
    witness: (M, C) => { const m = asymPetal(M, ASYM_SET()), c = asymPetal(C, ASYM_SET());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      /* the emitted left margin's distance from the centre on a flat row, against the record's left half */
      const off = (P) => Math.max(...P.margins.filter((r) => r.flat && r.hL > 1e-6).map((r) => Math.abs(Math.hypot(r.L[0] - r.C[0], r.L[1] - r.C[1], r.L[2] - r.C[2]) - r.hL)));
      return (off(m) > 0.5 && off(c) < 1e-9) ? null : `the mutant's left margin stands ${off(m)} mm off the left half (the clean tree's ${off(c)})`; } },
  { id: 'the-right-nib-reads-the-left-width', why: 'on the nib the right half is drawn at the LEFT half\'s width, so the narrow half closes on the wide half\'s arc — one nib, two halves; the round end is no longer either half\'s own',
    find: '    const hL = PL.halfWidthAt(u), hR = PR.halfWidthAt(u);', into: '    const hL = PL.halfWidthAt(u), hR = PR.onNib(u) ? PL.halfWidthAt(u) : PR.halfWidthAt(u);', names: ['AN3'], rows: ASYM_ROWS,
    witness: (M, C) => { const m = asymPetal(M, ASYM_SET()), c = asymPetal(C, ASYM_SET());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const onNib = m.u.map((u, i) => i).filter((i) => m.u[i] * c.apexR.drawnLengthMm > c.apexR.drawnLengthMm * (c.apexR.arcU ?? 1) - 1e-9 && m.u[i] > 0);
      const d = onNib.length ? Math.max(...onNib.map((i) => Math.abs(m.R[i] - c.R[i]))) : 0;
      return d > 1e-6 ? null : `the mutant's right half on the nib is within ${d} mm of the clean tree's (${onNib.length} nib rows)`; } },
  { id: 'a-flat-section-reads-one-half-width', why: 'a ±halfWidth site left symmetric: the flat cross-section draws BOTH halves at the left half\'s width, while every record reads two — the print is the symmetric petal',
    find: '    const sR = f === null ? flatSect(C, nrm, hR) :', into: '    const sR = f === null ? flatSect(C, nrm, hL) :', names: ['OC4'], rows: ASYM_ROWS,
    witness: (M, C) => { const m = asymPetal(M, ASYM_SET()), c = asymPetal(C, ASYM_SET());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const off = (P) => Math.max(...P.margins.filter((r) => r.flat && r.hR > 1e-6).map((r) => Math.abs(Math.hypot(r.R[0] - r.C[0], r.R[1] - r.C[1], r.R[2] - r.C[2]) - r.hR)));
      return (off(m) > 0.5 && off(c) < 1e-9) ? null : `the mutant's right margin stands ${off(m)} mm off the right half (the clean tree's ${off(c)})`; } },
  /* ===== THE OUTLINE UNDER SCOPING (F6-scope — docs/bloom-outline-curve-scope-
     outcome.md). Five plausible wrong resolutions of a petal's outline, each
     watertight and one piece at the same triangle count: a scope's owned curve
     ignored (every petal on the whole bloom's), a layer's or a pair's owned
     curve leaking to its siblings, the FAN partner not mirrored, and a RADIAL
     partner mirrored. OC5 reads every petal; each witness reads the MUTATED
     module's own per-petal records. The page's three (selection applying
     values, the reset leaving the owned curve, an inherited curve frozen at
     copy time) live in the panel gate's route (ah). */
  { id: 'a-scoped-outline-is-ignored', why: 'the scope\'s owned mode and curve never reach its petals — every petal draws the whole bloom\'s outline while the panel shows the layer\'s own',
    find: '    ? resolvePetalValues(ps, scopeTerm ? scopeTerm.values || null : null, !!slot.fanMirrored,', into: '    ? resolvePetalValues(ps, null, !!slot.fanMirrored,', names: ['OC0', 'OC5'], rows: SO_ROWS,
    witness: (M, C) => { const m = soPetals(M, SO_MIXED()), c = soPetals(C, SO_MIXED());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (!m.some((p) => p.mode === 'CURVE') && c.filter((p) => p.mode === 'CURVE').length === 16) ? null : `the mutant's modes ${soModes(m)} (the clean tree's ${soModes(c)})`; } },
  { id: 'a-scoped-outline-leaks-to-sibling-layers', why: 'a layer\'s owned outline reaches EVERY layer — the outer whorl draws the inner layer\'s curve',
    find: "      if (e.layer !== layer) continue;\n      addScopeOffsets(sum, e.offsets || {}, `layers[${e.layer}]`); any = true;\n      takeValues(e.values, 'layer');",
    into: "      takeValues(e.values, 'layer'); if (e.values) any = true;\n      if (e.layer !== layer) continue;\n      addScopeOffsets(sum, e.offsets || {}, `layers[${e.layer}]`); any = true;", names: ['OC0', 'OC5'], rows: SO_ROWS,
    witness: (M, C) => { const m = soPetals(M, SO_MIXED()), c = soPetals(C, SO_MIXED());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.filter((p) => p.whorl === 0).every((p) => p.mode === 'CURVE') && c.filter((p) => p.whorl === 0).every((p) => p.mode === 'LAW')) ? null : `layer 1 reads ${soModes(m.filter((p) => p.whorl === 0))} on the mutant (the clean tree's ${soModes(c.filter((p) => p.whorl === 0))})`; } },
  { id: 'a-scoped-outline-leaks-to-sibling-pairs', why: 'a pair\'s owned outline reaches every pair of its layer — the fan\'s other petals draw it',
    find: "      if (e.layer !== layer || e.slot !== key) continue;\n      addScopeOffsets(sum, e.offsets || {}, `petals[${e.layer},${e.slot}]`); any = true;\n      takeValues(e.values, 'petal');",
    into: "      if (e.layer === layer && e.values) { takeValues(e.values, 'petal'); any = true; }\n      if (e.layer !== layer || e.slot !== key) continue;\n      addScopeOffsets(sum, e.offsets || {}, `petals[${e.layer},${e.slot}]`); any = true;", names: ['OC0', 'OC5'], rows: SO_ROWS,
    witness: (M, C) => { const m = soPetals(M, SO_FAN_PAIR()), c = soPetals(C, SO_FAN_PAIR());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const n = (P) => P.filter((p) => p.mode === 'CURVE').length;
      return (n(m) === m.length && n(c) === 2) ? null : `${n(m)} of ${m.length} petals draw a curve on the mutant (the clean tree's ${n(c)})`; } },
  { id: 'the-fan-partner-is-not-mirrored', why: 'a FAN mirror pair keeps one hand — the partner draws its pair\'s asymmetric curve unswapped, so the pair is two copies rather than a mirror image',
    find: "  return state.placement === 'FAN' && scopeSlotKey(slotIndex, slotCount, state) !== slotIndex;",
    into: "  return false;", names: ['OC5'], rows: SO_ROWS,
    witness: (M, C) => { const m = soPetals(M, SO_FAN()), c = soPetals(C, SO_FAN());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const mir = (P) => P.filter((p) => p.mirrored).length;
      const sameHand = (P) => P.every((p) => JSON.stringify(p.L) === JSON.stringify(P[0].L));
      return (mir(m) === 0 && sameHand(m) && mir(c) === 3 && !sameHand(c)) ? null : `the mutant mirrors ${mir(m)} petals, same hand ${sameHand(m)} (the clean tree ${mir(c)}, ${sameHand(c)})`; } },
  { id: 'the-radial-partner-is-mirrored', why: 'the mirror reaches RADIAL pairs too — the pinwheel the ruling keeps becomes mirror pairs',
    find: "  return state.placement === 'FAN' && scopeSlotKey(slotIndex, slotCount, state) !== slotIndex;",
    into: "  return (state.placement === 'FAN' || state.placement === 'RADIAL') && scopeSlotKey(slotIndex, slotCount, state) !== slotIndex;", names: ['OC5'], rows: SO_ROWS,
    witness: (M, C) => { const m = soPetals(M, SO_RADIAL()), c = soPetals(C, SO_RADIAL());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const mir = (P) => P.filter((p) => p.mirrored).length;
      return (mir(m) > 0 && mir(c) === 0) ? null : `the mutant mirrors ${mir(m)} RADIAL petals (the clean tree ${mir(c)})`; } },
  /* ===== THE SPINE UNDER SCOPING (F3-scope — docs/bloom-spine-curve-scope-
     outcome.md). Five plausible wrong resolutions of a petal's spine, each
     watertight and one piece at the same triangle count: a scope's owned spine
     ignored, a layer's or a pair's owned spine leaking to its siblings, the
     spine resolved through a SECOND chain beside the outline's (one that does
     not carry the one chain's toggle gate), and a FAN partner's spine FLIPPED
     as if the outline's mirror applied to it (the spine is planar in the midrib
     plane, so its mirror image is itself — C4(d) is the identity this breaks).
     C1 reads one petal per ring, C4 every petal; each witness reads the MUTATED
     module's own per-petal spine records. The page's three (selection applying
     values, the spine reset leaving the owned curve, an inherited spine frozen
     at copy time) live in the panel gate's route (aj). */
  { id: 'a-scoped-spine-is-ignored', why: 'the scope\'s owned curl mode and spine curve never reach its petals — every petal bends on the whole bloom\'s spine while the panel shows the layer\'s own',
    find: '    for (const g of Object.keys(groups)) for (const k of groups[g]) if (k in values) (out || (out = {}))[k] = values[k];', into: '    for (const k of groups.outline) if (k in values) (out || (out = {}))[k] = values[k];', names: ['C1', 'C4'], rows: SPS_ROWS,
    witness: (M, C) => { const m = spPetals(M, SP_LAYER()), c = spPetals(C, SP_LAYER());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (!m.some((p) => p.curve) && c.filter((p) => p.curve).length === 8) ? null : `the mutant's modes ${spModes(m)} (the clean tree's ${spModes(c)})`; } },
  { id: 'a-scoped-spine-leaks-to-sibling-layers', why: 'a layer\'s owned spine reaches EVERY layer — the outer whorl bends on the inner layer\'s drawn spine',
    find: "  if (layersLive) {\n    for (const e of scopes.layers || []) {\n      if (e.layer !== layer) continue;",
    into: "  if (layersLive) {\n    for (const e of scopes.layers || []) {\n      if (e.values) for (const k of SCOPE_VALUE_GROUPS.spine) if (k in e.values) { (values || (values = {}))[k] = e.values[k]; (valueFrom || (valueFrom = {}))[k] = 'layer'; any = true; }\n      if (e.layer !== layer) continue;", names: ['C1', 'C4'], rows: SPS_ROWS,
    witness: (M, C) => { const m = spPetals(M, SP_LAYER()), c = spPetals(C, SP_LAYER());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.filter((p) => p.whorl === 0).every((p) => p.curve) && c.filter((p) => p.whorl === 0).every((p) => !p.curve)) ? null : `layer 1 reads ${spModes(m.filter((p) => p.whorl === 0))} on the mutant (the clean tree's ${spModes(c.filter((p) => p.whorl === 0))})`; } },
  { id: 'a-scoped-spine-leaks-to-sibling-pairs', why: 'a pair\'s owned spine reaches every pair of its layer — the fan\'s other petals bend on it',
    find: "  if (petalsLive) {\n    for (const e of scopes.petals || []) {\n      if (e.layer !== layer || e.slot !== key) continue;",
    into: "  if (petalsLive) {\n    for (const e of scopes.petals || []) {\n      if (e.layer === layer && e.values) for (const k of SCOPE_VALUE_GROUPS.spine) if (k in e.values) { (values || (values = {}))[k] = e.values[k]; (valueFrom || (valueFrom = {}))[k] = 'petal'; any = true; }\n      if (e.layer !== layer || e.slot !== key) continue;", names: ['C4'], rows: SPS_ROWS,
    witness: (M, C) => { const m = spPetals(M, SP_FAN_PAIR()), c = spPetals(C, SP_FAN_PAIR());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const n = (P) => P.filter((p) => p.curve).length;
      return (n(m) === m.length && n(c) === 2) ? null : `${n(m)} of ${m.length} petals bend on a drawn spine on the mutant (the clean tree's ${n(c)})`; } },
  { id: 'the-spine-resolved-through-a-second-chain', why: 'the spine read through its OWN chain beside the outline\'s — one that collects a layer\'s spine without the one chain\'s toggle gate, so a record kept inert under Per-layer values OFF bends its layer',
    find: "  if (layersLive) {\n    for (const e of scopes.layers || []) {\n      if (e.layer !== layer) continue;",
    into: "  for (const e of scopes.layers || []) if (e.layer === layer && e.values) for (const k of SCOPE_VALUE_GROUPS.spine) if (k in e.values) { (values || (values = {}))[k] = e.values[k]; (valueFrom || (valueFrom = {}))[k] = 'layer'; any = true; }\n  if (layersLive) {\n    for (const e of scopes.layers || []) {\n      if (e.layer !== layer) continue;", names: ['C1', 'C4'], rows: SPS_ROWS,
    witness: (M, C) => { const m = spPetals(M, SP_LAYER('OFF')), c = spPetals(C, SP_LAYER('OFF'));
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.filter((p) => p.whorl === 1).every((p) => p.curve) && !c.some((p) => p.curve)) ? null : `with Per-layer values OFF the mutant reads ${spModes(m)} (the clean tree's ${spModes(c)})`; } },
  { id: 'the-fan-partner-spine-is-flipped', why: 'the outline\'s mirror applied to the spine — the FAN partner bends its pair\'s drawn spine the other way, so a linked pair is two spines',
    find: "    if (v && v.mode === 'two-sided') { (out || (out = {})).petalOutlineCurve = mirrorOutlineCurve(v); didMirror = true; }",
    into: "    if (v && v.mode === 'two-sided') { (out || (out = {})).petalOutlineCurve = mirrorOutlineCurve(v); didMirror = true; }\n    { const sm = out && 'petalCurlMode' in out ? out.petalCurlMode : state.petalCurlMode, sc = out && 'petalSpineCurve' in out ? out.petalSpineCurve : state.petalSpineCurve; const sv = sm === 'CURVE' ? (typeof sc === 'string' ? JSON.parse(sc) : sc) : null; if (sv) (out || (out = {})).petalSpineCurve = { mode: sv.mode, points: sv.points.map(([x, y]) => [x, -y]) }; }", names: ['C4'], rows: SPS_ROWS,
    witness: (M, C) => { const m = spPetals(M, SP_FAN_PAIR()), c = spPetals(C, SP_FAN_PAIR());
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const t = (P, s) => (P.find((p) => p.slot === s) || {}).turn;
      return (Math.abs(t(m, 5) + t(m, 2)) < 1e-9 && Math.abs(t(m, 2)) > 1 && t(c, 5) === t(c, 2)) ? null : `the partner turns ${t(m, 5)} against ${t(m, 2)} on the mutant (the clean tree ${t(c, 5)} / ${t(c, 2)})`; } },
];

/* THE SEPAL WITNESS — one whorl from a module's own builder on the mutant
   table's own probe state (5 asked on 8, 60 asked with a drawn limit of 21,
   sepalCup 0.6 against petalCup 0): what the mutated module EMITTED. */
function sepalFacts(MOD, extra = {}) {
  try {
    const st = { ...REGISTRY_DEFAULTS, sepalCount: 5, sepalAngle: 60, sepalCup: 0.6, ...extra };
    const acc = new MOD.MeshBuilder({ exportMode: true });
    const b = MOD.buildBloomInto(acc, st);
    const S = b.sepals;
    if (!S) return { count: 0, tilt: null, form: null, rimR: null, az0: null, length: null, footH: null, attachZ: null, limit: null };
    const p = S.built[0];
    return { count: S.count, tilt: p.builtFrom.petalTilt, form: p.form, rimR: Math.hypot(p.footFrames[2].C[0], p.footFrames[2].C[1]), az0: S.azimuths[0], length: p.length, footH: p.footFrames[2].h,
      attachZ: S.attachment.mode === 'HUB' ? S.attachment.zAttach : null, limit: S.limit.limitDeg };
  } catch (e) { return { threw: e.message }; }
}

/* THE SEPAL TIER WITNESS (F1.1a) — the module's own build of the LANTERN
   frame (a 40 mm GOBLET, 5 sepals a tier, three tiers at 0.75 / 0.50 / 0.25
   of the join) with whatever scopes the mutant needs, read off the tier
   records the builder hands back: present, the attachment fraction and z,
   the drawn limit and what it was drawn against, the effective length. A
   mutant is judged on what the MUTATED module emits, never on the clause it
   names (the second durable rule). */
const TIER_SET = { stemLength: 60, hubStyle: 'GOBLET', hubShapeAmount: 2, hubLength: 40, sepalCount: 5, sepalTiers: 3 };
function tierFacts(MOD, extra = {}, scopes = null) {
  try {
    const st = { ...REGISTRY_DEFAULTS, ...TIER_SET, ...extra };
    const acc = new MOD.MeshBuilder({ exportMode: true });
    const b = MOD.buildBloomInto(acc, st, scopes ? { scopes } : {});
    const S = b.sepals;
    const tiers = (S && S.tiers ? S.tiers : []).map((T) => ({ present: !!T.present, frac: T.present ? T.attachment.frac : null, z: T.present ? T.attachment.zAttach : null,
      limit: T.present && T.limit ? T.limit.limitDeg : null, against: T.present && T.limit ? T.limit.against : null, clamped: T.present && T.limit ? !!T.limit.clamped : null,
      length: T.present ? T.built[0].length : null, why: T.why || null, order: T.order ? { fracLaw: T.order.fracLaw, fracBuilt: T.order.fracBuilt, orderClamped: T.order.orderClamped } : null }));
    return { tiers, eligible: MOD.sepalTiersEligible(st), count: S ? S.count : 0 };
  } catch (e) { return { threw: e.message }; }
}

/* THE SEPAL CURVE WITNESS (curves-sepals) — the module's own build of a sepal
   whorl in EXPORT, read off every tier's first sepal: its spine's curve mode,
   the fold limit's clamp and the drawn angle limit. */
const SEPC_SC = {
  reflex: { mode: 'single', points: [[0, 0], [0.5, -0.05], [0.9, -0.3]] },
  s: { mode: 'single', points: [[0, 0], [0.3, 0.12], [0.6, -0.1], [1, 0.15]] },
  incurve: { mode: 'single', points: [[0, 0], [0.45, 0.06], [0.8, 0.3], [0.92, 0.55]] },
};
const SEPC_REFLEX = { sepalCount: 5, sepalCurlMode: 'CURVE', sepalSpineCurve: SEPC_SC.reflex };
const SEPC_LIMIT = { sepalCount: 5, sepalAngle: 60, sepalCurlMode: 'CURVE', sepalSpineCurve: SEPC_SC.incurve };
const SEPC_FOLD = { sepalCount: 5, sepalCup: 0.6, sepalCurlMode: 'CURVE', sepalSpineCurve: SEPC_SC.s };
const SEPC_TIERS = { set: { sepalCount: 5, sepalTiers: 2, stemLength: 60, hubStyle: 'GOBLET', hubShapeAmount: 2, hubLength: 40 },
  scopes: { layers: [], petals: [], tiers: [{ tier: 1, offsets: {}, values: { sepalCurlMode: 'CURVE', sepalSpineCurve: SEPC_SC.reflex } }] } };
/* THE LEAF CURVE WITNESSES (curves-leaves) — the module's own build of one
   leaf in EXPORT (`compoundFacts`), read off its plan and its emitted record. */
const LC_SP = {
  droop: { mode: 'single', points: [[0, 0], [0.5, -0.06], [0.95, -0.3]] },
  curlUp: { mode: 'single', points: [[0, 0], [0.5, 0.08], [0.9, 0.35]] },
  tight: { mode: 'single', points: [[0, 0], [0.5, 0.02], [0.62, 0.12], [0.6, 0.25]] },
};
const LC_OUT = {
  lance: { mode: 'symmetric', points: [[0, 0.05], [0.2, 0.17], [0.45, 0.2], [0.75, 0.14], [1, 0]] },
  oak: { mode: 'two-sided', points: [[0, 0.06], [0.3, 0.22], [0.65, 0.19], [1, 0]], right: [[0, 0.06], [0.25, 0.14], [0.6, 0.17], [1, 0]] },
  leaflet: { mode: 'symmetric', points: [[0, 0.1], [0.3, 0.3], [0.65, 0.27], [1, 0]] },
  blunt: { mode: 'symmetric', points: [[0, 0.12], [0.4, 0.3], [0.85, 0.28], [1, 0]] },
};
const LC_BASE = { stemLength: 70, stemDiameter: 6, leafLength: 52, leafWidth: 17, leafNodes: 1 };
const LC_DROOP = { ...LC_BASE, leafCurlMode: 'CURVE', leafSpineCurve: LC_SP.droop };
const LC_UP = { ...LC_BASE, leafNodes: 3, leafCurlMode: 'CURVE', leafSpineCurve: LC_SP.curlUp };
const LC_FOLD = { ...LC_BASE, leafCup: 1.2, leafCurlMode: 'CURVE', leafSpineCurve: LC_SP.tight };
const LC_TEETH = { ...LC_BASE, leafToothDepth: 0.35, leafToothCount: 6, leafOutlineMode: 'CURVE', leafOutlineCurve: LC_OUT.oak };
const LC_CPD = { stemLength: 70, stemDiameter: 6, leafLength: 40, leafNodes: 1, leafType: 'COMPOUND', leafletToothDepth: 0.15, leafletOutlineMode: 'CURVE', leafletOutlineCurve: LC_OUT.leaflet, leafOutlineCurve: LC_OUT.lance };
const LC_LOBED = { ...LC_BASE, leafType: 'LOBED', leafOutlineMode: 'CURVE', leafOutlineCurve: LC_OUT.lance };
const lcSame = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function sepcFacts(MOD, extra = {}, scopes = null) {
  try {
    const st = { ...REGISTRY_DEFAULTS, ...extra };
    const acc = new MOD.MeshBuilder({ exportMode: true });
    const b = MOD.buildBloomInto(acc, st, scopes ? { scopes } : {});
    const S = b.sepals;
    const tiers = (S && S.tiers ? S.tiers : []).filter((T) => T.present).map((T) => { const sp = T.built[0].spine || {};
      return { curveMode: !!sp.curveMode, bendClamped: !!sp.bendClamped, limit: T.limit ? T.limit.angleBuiltDeg : null }; });
    return { tiers };
  } catch (e) { return { threw: e.message }; }
}

/* THE LEAF WITNESS — one leaf, alone, from a module's own builder at a given
   tip exponent: the plan's record, the rows the blade was built from and the
   clamp record, so a mutation is judged on what that module EMITS. */
/* THE S2 LEAF ROW'S STATE — arched and cupped APART from the defaults on a
   5 mm blade whose teeth the floor reshapes (depth 0.3 asks 0.51 mm of relief;
   the floor builds 1.00 and the count gives) — and the mutated module's own
   solo leaf built on it. One state witnesses all four S2 mutants, and it is
   the table row of the same name. */
const LEAF_POSE_SET = { stemLength: 70, stemDiameter: 6, leafLength: 52, leafWidth: 5, leafNodes: 1, leafArch: 90, leafCup: 0.8, leafToothDepth: 0.3 };
/* THE COMPOUND WITNESS (leaf/stem build S3) — the mutated module's own build
   of one compound leaf at sheet 2.4 (the derived rods APART from a typed 0.6),
   and of one SIMPLE leaf with the hidden leaflet controls at an extreme (where
   a leak would show). Both are table rows of the same state. */
const CPD_WIT = { stemLength: 70, stemDiameter: 6, leafLength: 40, leafNodes: 1, leafType: 'COMPOUND', sheetThickness: 2.4 };
const SIMPLE_WIT = { stemLength: 70, stemDiameter: 6, leafLength: 40, leafNodes: 1, leafletPairs: 4, leafletStalk: 20 };
/* THE CLAMP'S WITNESS (Eva's rulings on #380): four pairs ask a 3.60 mm
   petiole of a 3 mm solid stem at 70 degrees, where the rooted end fits only
   2.14 mm — and the stem's own radius (the wrong cap) is 3.00, so the true
   cap, a typed one and no cap at all are three different petioles here. */
const CLAMP_WIT = { stemLength: 70, stemDiameter: 3, leafLength: 40, leafNodes: 1, leafType: 'COMPOUND', leafletPairs: 4, leafAngle: 70 };
/* THE TAPER'S WITNESS (S3c): the shipped compound defaults at the shipped
   sheet, one node — the petiole 2.68 mm and unclamped, the rachis 2.68 to the
   first pair, 2.08 at the second, the wire at the tip. Axis ring 2 is the
   first pair's station, ring 3 the second's (a straight rachis has its keys
   alone), so the witnesses read the ramp at its own knots. */
const TAPER_WIT = { stemLength: 70, stemDiameter: 6, leafLength: 40, leafNodes: 1, leafType: 'COMPOUND' };
/* THE LOBED WITNESSES (leaf/stem build S4): the shipped lobed defaults on one
   node; the lobe angle at 60 where the TILT cap binds (built 46.73); 6 lobes
   at tooth depth 0.3 where the TOOTH fold clamp binds hardest (4.86 mm asked,
   2.22 built — 5 lobes x 2 teeth since S5b, 1.72 built); the NONE-FIT state (the fold cap 0.68 mm under the 1 mm
   floor); and a SIMPLE leaf with every lobed control at an extreme (where a
   leak would show). Each is a table row of the same state. */
const LOB_WIT = { stemLength: 70, stemDiameter: 6, leafLength: 46, leafNodes: 1, leafType: 'LOBED' };
/* S5's witness states — the two rows above, as control sets */
const NIB_TOOTH_WIT = { stemLength: 120, stemDiameter: 6, leafLength: 60, leafNodes: 1, leafType: 'COMPOUND', leafletTipShape: 0.8, leafletWidth: 40, leafletLength: 46, leafletToothDepth: 0.1, leafToothCount: 3 };
const LC_NIB = { ...NIB_TOOTH_WIT, leafletOutlineMode: 'CURVE', leafletOutlineCurve: LC_OUT.blunt };
const FILLET_WIT = { ...LOB_WIT, lobedShape: 2.5 };
/* S4's own lobed form (S4b): the mum retune moved the four lobed defaults,
   and at its rounder, less tilted lobes the unclamped tilt folds no cell and
   the 0.3 mm teeth sit under their fold cap — so the three witnesses that
   need a cap to BIND pin the form they were chosen at. */
const LOB_S4_FORM = { lobedSinus: 0.62, lobedShape: 0.7, lobedAngle: 38, lobedToothDepth: 0.08 };
/* (S4c: at three teeth a lobe — 21 over the rim — the unclamped 60 degrees
   folds no cell on this form; at two a lobe, 14, near S4b's shared 12, it does) */
const TILT_WIT = { ...LOB_WIT, ...LOB_S4_FORM, lobedAngle: 60, lobedToothCount: 2 };
/* S5b moved this from 6 lobes x 1 tooth: there the unclamped teeth are so deep
   the tip-neck walk gives the inner ones up, and the mutant's inner advance
   read 0.624, never under LF22's 0.5 margin. At 5 lobes x 2 teeth it reads
   0.222 against the clean tree's 0.534, the relief 4.86 against a 1.72 cap. */
const FOLD_WIT = { ...LOB_WIT, ...LOB_S4_FORM, lobedLobes: 5, lobedToothDepth: 0.3, lobedToothCount: 2 };
const NONEFIT_WIT = { ...LOB_WIT, ...LOB_S4_FORM, lobedLobes: 6, lobedSinus: 0.9, lobedToothDepth: 0.3, lobedToothCount: 3 };
/* S4c (Eva's rulings of Oct 9): the roundness at its maximum, where the asked
   radius fits at no sinus and every one SHRINKS; and a short, deep five-lobed
   blade where no round bottom fits at 5 or 4 lobes even at the print minimum,
   so the COUNT yields to 3. */
const SHRINK_WIT = { ...LOB_WIT, lobedRound: 0.5 };
/* S4b's own round-bottom law is the roundness-0 branch exactly, so its three
   mutants are witnessed there (at the shipped 0.12 every sinus is rounded
   to a radius of the pitch, and the print minimum is not what is drawn). */
const S4B_WIT = { ...LOB_WIT, lobedRound: 0 };
const YIELD_WIT = { ...LOB_WIT, leafLength: 36, lobedLobes: 5, lobedFrom: 0.21, lobedTo: 0.55, lobedSinus: 0.84, lobedShape: 0.9, lobedAngle: 30, lobedEase: 0.79, lobedWidth: 26, leafTipShape: 1.05 };
const SIMPLE_LOB_WIT = { stemLength: 70, stemDiameter: 6, leafLength: 46, leafNodes: 1, lobedLobes: 6, lobedSinus: 0.9, lobedAngle: 60, lobedToothDepth: 1 };
/* the inner cells' advance along the midrib, per row pair, off the leaf's own
   emitted skin (the two columns either side of the V's apex) — LF22's measure */
function innerAdvanceMin(rep) {
  const L = rep && rep.lobed; if (!L || !L.skin) return null;
  const us = L.rowU, h = rep.rowHalfMm, len = L.lengthMm, nv1 = L.skin[0].length - 1;
  let w = Infinity;
  for (let j = 0; j + 1 < L.skin.length; j++) {
    const a = us[j] * len + h[j] * Math.sin(L.rowTauRad[j]) / nv1, b = us[j + 1] * len + h[j + 1] * Math.sin(L.rowTauRad[j + 1]) / nv1;
    w = Math.min(w, (b - a) / ((us[j + 1] - us[j]) * len));
  }
  return w;
}
/* the smallest planform area of any emitted skin triangle (one node at
   azimuth 0, no arch — the witness rows), LF22's positivity measure */
function minSkinArea(rep, plan) {
  const L = rep && rep.lobed; if (!L || !L.skin) return null;
  const th = (plan.angleDeg * Math.PI) / 180, bb = rep.petioleAxis.bladeBase;
  const pl = L.skin.map((row) => row.map((P) => [(P[0] - bb[0]) * Math.cos(th) + (P[2] - bb[2]) * Math.sin(th), P[1] - bb[1]]));
  let w = Infinity;
  for (let j = 0; j + 1 < pl.length; j++) for (let c = 0; c + 1 < pl[j].length; c++) {
    const p00 = pl[j][c], p10 = pl[j + 1][c], p11 = pl[j + 1][c + 1], p01 = pl[j][c + 1];
    for (const [a, b, d] of [[p00, p10, p11], [p00, p11, p01]]) w = Math.min(w, 0.5 * ((b[0] - a[0]) * (d[1] - a[1]) - (d[0] - a[0]) * (b[1] - a[1])));
  }
  return w;
}
function compoundFacts(MOD, set) {
  try {
    const st = { ...REGISTRY_DEFAULTS, ...set };
    const b = MOD.buildBloomInto(new MOD.MeshBuilder({ exportMode: true }), st);
    return { plan: b.leaf, rep: (b.leavesBuilt || [])[0] || null };
  } catch (e) { return { threw: e.message }; }
}
function leafPoseFacts(MOD) {
  try {
    const st = { ...REGISTRY_DEFAULTS, ...LEAF_POSE_SET };
    const acc = new MOD.MeshBuilder({ exportMode: true });
    const fr = MOD.footRing(st, acc);
    const plan = MOD.leafPlan(st, MOD.stemPlan(st, fr.hub, acc), acc);
    const rep = MOD.buildLeafInto(new MOD.MeshBuilder({ exportMode: true }), plan, st, 0, 0);
    return { rep,
      tipCentreDiffers(o) { const a = this.rep.rowCentre.at(-1), b = o.rep.rowCentre.at(-1); return a.some((x, i) => x !== b[i]); },
      liftDiffers(o) { return this.rep.rowMarginLiftMm.some((p, i) => p[0] !== o.rep.rowMarginLiftMm[i][0] || p[1] !== o.rep.rowMarginLiftMm[i][1]); } };
  } catch (e) { return { threw: e.message }; }
}
function leafFacts(MOD, n) {
  try {
    const st = { ...REGISTRY_DEFAULTS, stemLength: 70, stemDiameter: 6, leafLength: 52, leafWidth: 17, leafNodes: 1, leafTipShape: n };
    const acc = new MOD.MeshBuilder({ exportMode: true });
    const fr = MOD.footRing(st, acc);
    const plan = MOD.leafPlan(st, MOD.stemPlan(st, fr.hub, acc), acc);
    const solo = new MOD.MeshBuilder({ exportMode: true });
    const rep = MOD.buildLeafInto(solo, plan, st, 0, 0);
    return { plan, rows: rep.rowHalfBaseMm, clamp: rep.tipClamp,
      rowsDiffer(other) { return this.rows.length !== other.rows.length || this.rows.some((h, i) => h !== other.rows[i]); } };
  } catch (e) { return { threw: e.message }; }
}

/* THE APEX NIB'S WITNESS — the PLAN the mutated module produces for one
   state, read off `petalSurface` rather than assembled here. Every number
   below is one the nib DERIVES (the crossing, the tangent, the arc's radius
   and centre, the drawn length); none of them is a constant, so a mutation
   that moved only a constant would be reported as inert by this and is
   declared blind in the AN family's own header. Returns the clean tree's
   figures beside the mutant's so a witness can say WHICH number moved. */
function nibPlan(MOD, set = {}) {
  try {
    const st = { ...REGISTRY_DEFAULTS, ...set };
    const acc = new MOD.MeshBuilder({ exportMode: true });
    const fr = MOD.footRing(st, acc);
    const ring = fr.slotRings[0][0];
    let slot = null;
    MOD.buildWhorlInto({ count: fr.slotCount, radius: ring.radius, height: 0, sizeRamp: () => ring.scale,
      angleRamp: () => ring.tiltExtra, phase: ring.phase, placement: st.placement, fan: fr.fan,
      blade: (sl) => { if (!slot) slot = sl; } });
    const prof = MOD.petalSurface(st, ring, slot, null, acc).profile;
    const a = prof.apex;
    return { active: a.active, why: a.why, uLaw: a.uLaw, slope: a.slope, radius: a.radiusMm,
      centre: a.centreMm, xFace: a.xFaceMm, drawn: prof.drawnLength, terminal: prof.capTerminalHalf,
      last: prof.halfWidthAt(1) };
  } catch (e) { return { threw: e.message }; }
}

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
  /* THE TWO CLOSURES MEETING, without which the crossover's own mutation is a
     no-op everywhere. `Math.max(0, x)` and `Math.abs(x)` are the SAME number
     for every non-negative x, and the void is non-negative on every state but
     this one — so `the-two-closures-are-allowed-to-cross` fired NOTHING until
     this row existed, which is `seam-reads-the-live-sheet`'s lesson one family
     later. A 1 mm stem on the smallest sphere: a 1.20 mm root band and a
     1.50 mm tip plug across a 2.20 mm stem. */
  { label: 'the two closures MEETING (a 1 mm stem on the smallest sphere — no bore survives)',
    set: [{ id: 'placement', value: 'CONTINUOUS' }, { id: 'hubShape', value: 'SPHERE' }, { id: 'petalCount', value: '3' },
          { id: 'spread', value: '0.6' }, { id: 'layerSize', value: '0.35' },
          { id: 'stemLength', value: '1' }, { id: 'stemDiameter', value: '12' }] },
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
  /* A SQUARED TERMINAL ABOVE THE PRINT FLOOR (the apex-nib session), which is
     the apex nib's OTHER inert arm and the only state where the guard's
     second condition decides anything. Without it
     `the-squared-terminal-no-longer-stands-the-nib-down` is a no-op on every
     row in this file — `seam-reads-the-live-sheet`'s lesson, and
     `bore-is-not-evas-rule`'s: a witness state is part of the claim. */
  { label: 'a squared terminal above the print floor (petalTipEnd 0.30 — the nib stands down)',
    set: [{ id: 'petalTipEnd', value: '0.3' }] },
  /* THE NIB'S OTHER INERT ARM — a blade that NEVER CLEARS the print floor,
     which is where the MODE FLOOR still decides a terminal (D14's finding:
     the three floor mutants above read ring 0, whose terminal the nib owns
     at every reachable width, and were silent on `main` since the nib
     landed). Six layers at the smallest layer size put rings 3-5 under the
     floor; AN0 runs per ring and is the only family that reads them. */
  { label: 'six layers at layerSize 0.35 — rings 3-5 never clear the print floor, so the MODE FLOOR ends them',
    set: [{ id: 'layerCount', value: '6' }, { id: 'layerSize', value: '0.35' }] },
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
  /* THE LEAF ROW (the leaf tip-shape session) — at the ACUTE end, because a
     mutation pinning the exponent at the old 1.30 reads 1.30 against 0.60 here
     and would read 1.30 against 1.30 at the default: a witness state is part
     of the claim (`bore-is-not-evas-rule`'s lesson, one family later). */
  /* THE NODE ROWS (#299's port): the flower's own setting, and the SAME leafed
     stem with both node amounts 0 — the state where `both-node-amounts-zero-is-not-the-identity`
     bites, since ST12's two statements can only disagree where the guard does. */
  { label: "the stem's nodes at the flower's 0.48 (100 x 6 mm, three alternate leaves)",
    set: [{ id: 'stemLength', value: '100' }, { id: 'stemDiameter', value: '6' }, { id: 'leafLength', value: '40' }, { id: 'leafNodes', value: '3' }, { id: 'stemNodeSwelling', value: '0.48' }, { id: 'stemNodeKink', value: '0.48' }] },
  /* RULING 6's ROWS (stem session 2): the BARE noded stem, where
     `the-nodes-are-gated-on-leaves-again` bites (on a leafed stem the leaf
     term is satisfied and the mutation is a no-op), and the raceme whose
     pedicels the pin holds straight — the only state where
     `the-pedicel-pin-is-dropped` moves anything. */
  /* THE FLORIST'S CUT (stem session 3): the shipped 60 x 6 stem is cut by
     default and is already a row above; this is the control OFF, where the
     flat arms of ST10 and SC0's other half can disagree. */
  { label: 'the shipped stem with the cut OFF (FLAT — the end as it was)',
    set: [{ id: 'stemLength', value: '60' }, { id: 'stemDiameter', value: '6' }, { id: 'stemCut', value: 'FLAT' }] },
  { label: 'a BARE stem at the flower\'s 0.48 (100 x 6 mm, no leaves — golden-angle nodes)',
    set: [{ id: 'stemLength', value: '100' }, { id: 'stemDiameter', value: '6' }, { id: 'stemNodeSwelling', value: '0.48' }, { id: 'stemNodeKink', value: '0.48' }] },
  { label: 'a raceme whose head asks for prominence 1 (the head is inert; every pedicel must stay straight)',
    set: [{ id: 'stemLength', value: '120' }, { id: 'stemDiameter', value: '6' }, { id: 'inflorescence', value: 'RACEME' }, { id: 'stemNodeSwelling', value: '1' }, { id: 'stemNodeKink', value: '1' }] },
  /* BUILD 3's ROWS: the node term ON under the head's own field (NV1-NV4 and
     NV2's outward phase on one row), the DESCENDING pedicel (the sign term's
     only witness), the gradient at the ceiling on twelve 60 mm nodes (the cap
     binds — asked 3, built 2.24), and the 0.60 mm sheet (the one-mode floor
     mutant's only witness, where the two modes' units differ). */
  { label: 'per-node variation 1 under the form field 0.5 (two distinct builds, the phase derived outward)',
    set: [{ id: 'stemLength', value: '120' }, { id: 'inflorescence', value: 'RACEME' }, { id: 'nodeVariance', value: '1' }, { id: 'varianceForm', value: '0.5' }] },
  { label: 'the form field 0.5 on DESCENDING pedicels (-60 deg — the outward point a half turn round)',
    set: [{ id: 'stemLength', value: '120' }, { id: 'inflorescence', value: 'RACEME' }, { id: 'varianceForm', value: '0.5' }, { id: 'pedicelAngle', value: '-60' }] },
  { label: 'gradient 3 x 12 nodes x 60 mm (the cap binds: asked 3.00, built 2.24)',
    set: [{ id: 'stemLength', value: '120' }, { id: 'inflorescence', value: 'RACEME' }, { id: 'pedicelGradient', value: '3' }, { id: 'floretNodes', value: '12' }, { id: 'pedicelLength', value: '60' }] },
  { label: 'the raceme on a 0.60 mm sheet (the two modes\' units stand different heights)',
    set: [{ id: 'stemLength', value: '120' }, { id: 'inflorescence', value: 'RACEME' }, { id: 'sheetThickness', value: '0.6' }] },
  { label: 'the same leafed stem at prominence 0 (the guard, where the two statements can disagree)',
    set: [{ id: 'stemLength', value: '100' }, { id: 'stemDiameter', value: '6' }, { id: 'leafLength', value: '40' }, { id: 'leafNodes', value: '3' }, { id: 'stemNodeSwelling', value: '0' }, { id: 'stemNodeKink', value: '0' }] },
  /* THE SPLIT's ROWS (Eva's rulings, Oct 6): the halves APART — the only
     state where `the-node-halves-are-coupled-again` moves anything — and the
     rose's 137.5 divergence plus 90 under OPPOSITE, the two states where the
     divergence can be ignored and where it can leak. */
  { label: 'the halves APART — swelling 0.3 x kink 1 on three alternate leaves',
    set: [{ id: 'stemLength', value: '100' }, { id: 'stemDiameter', value: '6' }, { id: 'leafLength', value: '40' }, { id: 'leafNodes', value: '3' }, { id: 'stemNodeSwelling', value: '0.3' }, { id: 'stemNodeKink', value: '1' }] },
  { label: 'alternate at the golden 137.5 (five leaves — the divergence APART from 180)',
    set: [{ id: 'stemLength', value: '100' }, { id: 'stemDiameter', value: '6' }, { id: 'leafLength', value: '40' }, { id: 'leafNodes', value: '5' }, { id: 'leafDivergence', value: '137.5' }] },
  { label: 'divergence 90 under OPPOSITE (hidden AND inert — where a leak would show)',
    set: [{ id: 'stemLength', value: '100' }, { id: 'stemDiameter', value: '6' }, { id: 'leafLength', value: '40' }, { id: 'leafNodes', value: '4' }, { id: 'leafPhyllotaxy', value: 'opposite' }, { id: 'leafDivergence', value: '90' }] },
  { label: 'a leaf at the acute tip (0.60 on a 70 mm stem — the exponent APART from the retired constant)',
    set: [{ id: 'stemLength', value: '70' }, { id: 'stemDiameter', value: '6' }, { id: 'leafLength', value: '52' }, { id: 'leafWidth', value: '17' }, { id: 'leafNodes', value: '1' }, { id: 'leafTipShape', value: '0.6' }] },
  /* THE S2 LEAF ROW (leaf/stem build S2): arch 90 and cup 0.8 APART from
     their defaults (a mutation pinning either reads the same as the clean
     tree at arch 0 / cup 0.35, so the witness state is part of the claim), on
     a 5 mm blade at tooth depth 0.3 where the floor both raises the relief and
     gives the count. `LEAF_POSE_SET` above is the same state. */
  /* THE COMPOUND ROWS (leaf/stem build S3): `CPD_WIT` and `SIMPLE_WIT` above
     are the same states. Sheet 2.4 separates the derived rods from a typed
     one; the SIMPLE row carries the hidden leaflet controls at an extreme. */
  { label: 'a compound leaf at sheet 2.4 (2 pairs + terminal — the rods APART from a typed 0.6)',
    set: [{ id: 'stemLength', value: '70' }, { id: 'stemDiameter', value: '6' }, { id: 'leafLength', value: '40' }, { id: 'leafNodes', value: '1' }, { id: 'leafType', value: 'COMPOUND' }, { id: 'sheetThickness', value: '2.4' }] },
  { label: 'a compound leaf CLAMPED by a 3 mm stem at 70 deg (4 pairs ask 3.60 mm; the rooted end fits 2.14)',
    set: [{ id: 'stemLength', value: '70' }, { id: 'stemDiameter', value: '3' }, { id: 'leafLength', value: '40' }, { id: 'leafNodes', value: '1' }, { id: 'leafType', value: 'COMPOUND' }, { id: 'leafletPairs', value: '4' }, { id: 'leafAngle', value: '70' }] },
  { label: 'a compound leaf at the shipped sheet (the load taper 2.68 -> 2.08 -> 1.20 mm, unclamped)',
    set: [{ id: 'stemLength', value: '70' }, { id: 'stemDiameter', value: '6' }, { id: 'leafLength', value: '40' }, { id: 'leafNodes', value: '1' }, { id: 'leafType', value: 'COMPOUND' }] },
  /* THE LOBED ROWS (leaf/stem build S4): the witness sets above. */
  { label: 'a LOBED leaf at the shipped lobed defaults (3 lobes a side; the S4b mum form)',
    set: [{ id: 'stemLength', value: '70' }, { id: 'stemDiameter', value: '6' }, { id: 'leafLength', value: '46' }, { id: 'leafNodes', value: '1' }, { id: 'leafType', value: 'LOBED' }] },
  /* S5 ROWS: a compound leaflet whose last tooth's period runs past the nib's
     crossing (LF33's state — the tooth would dig the tip to the face), and a
     LOBED leaf whose three sinuses are all BROAD and filleted (LF34's). */
  { label: 'a compound leaf whose leaflet tooth reaches the converging tip (leaflet tip 0.80, width 40, tooth depth 0.1)',
    set: [{ id: 'stemLength', value: '120' }, { id: 'stemDiameter', value: '6' }, { id: 'leafLength', value: '60' }, { id: 'leafNodes', value: '1' }, { id: 'leafType', value: 'COMPOUND' }, { id: 'leafletTipShape', value: '0.8' }, { id: 'leafletWidth', value: '40' }, { id: 'leafletLength', value: '46' }, { id: 'leafletToothDepth', value: '0.1' }, { id: 'leafToothCount', value: '3' }] },
  { label: 'a LOBED leaf whose sinuses are BROAD and filleted (lobe shape 2.5, sinus 0.55, roundness 0.12)',
    set: [{ id: 'stemLength', value: '70' }, { id: 'stemDiameter', value: '6' }, { id: 'leafLength', value: '46' }, { id: 'leafNodes', value: '1' }, { id: 'leafType', value: 'LOBED' }, { id: 'lobedShape', value: '2.5' }] },
  { label: 'a LOBED leaf at lobe angle 60 at S4\'s form, 2 teeth a lobe (the TILT cap binds: built 46.73)',
    set: [{ id: 'stemLength', value: '70' }, { id: 'stemDiameter', value: '6' }, { id: 'leafLength', value: '46' }, { id: 'leafNodes', value: '1' }, { id: 'leafType', value: 'LOBED' }, { id: 'lobedSinus', value: '0.62' }, { id: 'lobedShape', value: '0.7' }, { id: 'lobedAngle', value: '60' }, { id: 'lobedToothDepth', value: '0.08' }, { id: 'lobedToothCount', value: '2' }] },
  { label: 'a LOBED leaf, 5 lobes at tooth depth 0.3, 2 teeth a lobe (the TOOTH fold clamp binds: 4.86 mm asked, 1.72 built)',
    set: [{ id: 'stemLength', value: '70' }, { id: 'stemDiameter', value: '6' }, { id: 'leafLength', value: '46' }, { id: 'leafNodes', value: '1' }, { id: 'leafType', value: 'LOBED' }, { id: 'lobedSinus', value: '0.62' }, { id: 'lobedShape', value: '0.7' }, { id: 'lobedAngle', value: '38' }, { id: 'lobedLobes', value: '5' }, { id: 'lobedToothDepth', value: '0.3' }, { id: 'lobedToothCount', value: '2' }] },
  { label: 'a LOBED leaf where NO tooth fits (6 lobes, sinus 0.9, depth 0.3, 3 teeth a lobe — the fold cap under the floor)',
    set: [{ id: 'stemLength', value: '70' }, { id: 'stemDiameter', value: '6' }, { id: 'leafLength', value: '46' }, { id: 'leafNodes', value: '1' }, { id: 'leafType', value: 'LOBED' }, { id: 'lobedShape', value: '0.7' }, { id: 'lobedAngle', value: '38' }, { id: 'lobedLobes', value: '6' }, { id: 'lobedSinus', value: '0.9' }, { id: 'lobedToothDepth', value: '0.3' }, { id: 'lobedToothCount', value: '3' }] },
  /* S4c: SHRINK_WIT and YIELD_WIT above */
  { label: 'a LOBED leaf at sinus roundness 0 (S4b\'s print-minimum law, by branch)',
    set: [{ id: 'stemLength', value: '70' }, { id: 'stemDiameter', value: '6' }, { id: 'leafLength', value: '46' }, { id: 'leafNodes', value: '1' }, { id: 'leafType', value: 'LOBED' }, { id: 'lobedRound', value: '0' }] },
  { label: 'a LOBED leaf at sinus roundness 0.5 (the asked radius fits nowhere: every sinus SHRINKS, told)',
    set: [{ id: 'stemLength', value: '70' }, { id: 'stemDiameter', value: '6' }, { id: 'leafLength', value: '46' }, { id: 'leafNodes', value: '1' }, { id: 'leafType', value: 'LOBED' }, { id: 'lobedRound', value: '0.5' }] },
  { label: 'a LOBED leaf whose lobe COUNT yields (5 asked on a 36 mm blade at 30 deg, 3 built)',
    set: [{ id: 'stemLength', value: '70' }, { id: 'stemDiameter', value: '6' }, { id: 'leafLength', value: '36' }, { id: 'leafNodes', value: '1' }, { id: 'leafType', value: 'LOBED' }, { id: 'lobedLobes', value: '5' }, { id: 'lobedFrom', value: '0.21' }, { id: 'lobedTo', value: '0.55' }, { id: 'lobedSinus', value: '0.84' }, { id: 'lobedShape', value: '0.9' }, { id: 'lobedAngle', value: '30' }, { id: 'lobedEase', value: '0.79' }, { id: 'lobedWidth', value: '26' }, { id: 'leafTipShape', value: '1.05' }] },
  { label: 'a SIMPLE leaf with the hidden lobed controls at an extreme (6 lobes, sinus 0.9, tilt 60, depth 1 — where a leak would show)',
    set: [{ id: 'stemLength', value: '70' }, { id: 'stemDiameter', value: '6' }, { id: 'leafLength', value: '46' }, { id: 'leafNodes', value: '1' }, { id: 'lobedLobes', value: '6' }, { id: 'lobedSinus', value: '0.9' }, { id: 'lobedAngle', value: '60' }, { id: 'lobedToothDepth', value: '1' }] },
  { label: 'a SIMPLE leaf with the hidden leaflet controls at an extreme (pairs 4, stalk 20 — where a leak would show)',
    set: [{ id: 'stemLength', value: '70' }, { id: 'stemDiameter', value: '6' }, { id: 'leafLength', value: '40' }, { id: 'leafNodes', value: '1' }, { id: 'leafletPairs', value: '4' }, { id: 'leafletStalk', value: '20' }] },
  { label: 'a leaf arched 90 and cupped 0.8 on a 5 mm blade whose teeth the floor reshapes (depth 0.3)',
    set: [{ id: 'stemLength', value: '70' }, { id: 'stemDiameter', value: '6' }, { id: 'leafLength', value: '52' }, { id: 'leafWidth', value: '5' }, { id: 'leafNodes', value: '1' }, { id: 'leafArch', value: '90' }, { id: 'leafCup', value: '0.8' }, { id: 'leafToothDepth', value: '0.3' }] },
  /* THE NU COUPLING'S ROW (#303's finding, fixed): the petals ramp to 112
     rows at petalTipShape 3.00, which is the ONLY state where a leaf reading
     the petals' NU and a leaf reading its own 56 disagree — at the default
     both are 56 and `the-leaf-reads-the-petals-nu` is a no-op. */
  { label: 'a leaf under petals whose rows RAMP (petalTipShape 3.00 — the leaf keeps its own 56)',
    set: [{ id: 'stemLength', value: '70' }, { id: 'stemDiameter', value: '6' }, { id: 'leafLength', value: '52' }, { id: 'leafWidth', value: '17' }, { id: 'leafNodes', value: '1' }, { id: 'petalTipShape', value: '3' }] },
  /* THE HUB SHAPE ROWS (the hub-shape session). A STYLED row so ST11's profile
     clause has a curve to measure — ANGLED at amount 2 with an explicit reach,
     apart from GOBLET-default so a mutation ignoring the style is observable
     (the byte-exact GOBLET-default arm IS the derived law, so a style-ignoring
     mutation would be undetectable there by construction — the witness state is
     part of the claim). And a #236 corner — a hub NARROWER than the stem on a
     cap — so ST11's #236 clause and ST5's active/inert have a state to bite on;
     the derived law never reaches `hubR <= outerR` on a healthy hub. */
  { label: 'a styled hub (ANGLED, amount 2, 20 mm reach — a cone the derived law never draws)',
    set: [{ id: 'stemLength', value: '60' }, { id: 'stemDiameter', value: '6' }, { id: 'hubStyle', value: 'ANGLED' }, { id: 'hubShapeAmount', value: '2' }, { id: 'hubLength', value: '20' }] },
  /* THE #236 CORNER IS FLAT, NOT A CAP, and the reason is the cap clamp: on a
     narrow cap `capReachMax` (Rd - t/2) floors the reach to the sheet, so even
     the flat-shell mutant's dropped `hubR > outerR` guard leaves the swell at 0
     and ST5 never bites. A FLAT narrow hub has no such clamp, so the reach is
     the derived joinT and the mutant builds a flat shell there. ST11's #236
     clause and ST5 both fire here; the cap corner's ONE-PIECE claim is the
     connectedness gate's, on block 34's own cap row. */
  { label: 'a #236 corner — a hub narrower than the stem, flat (3 petals, spread 0.6, 8 mm petals, 12 mm stem)',
    set: [{ id: 'petalCount', value: '3' }, { id: 'spread', value: '0.6' }, { id: 'petalWidth', value: '8' }, { id: 'stemLength', value: '60' }, { id: 'stemDiameter', value: '12' }] },
  /* THE SEPAL ROWS (sepals, part 1). One row where every clamp BITES at once
     — 40 asked on 8 (the ceiling), 60 asked against a drawn limit of 21 (the
     angle), breadth 0.25 (the foot floor), the sepal's cup 0.6 APART from the
     petals' 0 (the twins) — so a mutation removing any one of them is
     observable here, and the probe state is part of each claim. And a
     SPHERE with sepals asked, the only state SP0 and SP9 can speak on. */
  { label: 'a sepal whorl with every clamp biting (40 asked on 8, 60 deg asked, breadth 0.25, cup 0.6 apart from the petals)',
    set: [{ id: 'sepalCount', value: '40' }, { id: 'sepalAngle', value: '60' }, { id: 'sepalFootBreadth', value: '0.25' }, { id: 'sepalCup', value: '0.6' }] },
  { label: 'sepals asked on a SPHERE (8 asked on a closed head — none built, told)',
    set: [{ id: 'placement', value: 'CONTINUOUS' }, { id: 'hubShape', value: 'SPHERE' }, { id: 'sepalCount', value: '8' }] },
  /* THE SEPAL'S OWN LENGTH AND WIDTH (Oct 13): the wing — both own rows set on
     a long narrow curled blade — and the same wing asked UP at 40, whose
     drawn limit is PINNED (the row object carries `sepalLimitMaxDeg`, which
     SP8 reads) so the fraction-of-length exclusion has a row it fires on. */
  { label: 'the WING: own size 120 x 5 mm, angle -10, curl +120 biased to the tip, tapers 3 / 4, tip 0.60',
    set: [{ id: 'sepalCount', value: '5' }, { id: 'sepalLength', value: '120' }, { id: 'sepalWidth', value: '5' }, { id: 'sepalAngle', value: '-10' }, { id: 'sepalSpineCurl', value: '120' }, { id: 'sepalCurlBias', value: '0.9' }, { id: 'sepalCurlStart', value: '0.6' }, { id: 'sepalBaseTaper', value: '3' }, { id: 'sepalTipTaper', value: '4' }, { id: 'sepalTipShape', value: '0.6' }, { id: 'sepalFootBreadth', value: '0.5' }] },
  { label: 'the WING asked UP at 40 (the limit pinned at or under 22 — drawn with the root exclusion in mm)', sepalLimitMaxDeg: 22,
    set: [{ id: 'sepalCount', value: '5' }, { id: 'sepalLength', value: '120' }, { id: 'sepalWidth', value: '5' }, { id: 'sepalAngle', value: '40' }, { id: 'sepalSpineCurl', value: '120' }, { id: 'sepalCurlBias', value: '0.9' }, { id: 'sepalCurlStart', value: '0.6' }, { id: 'sepalBaseTaper', value: '3' }, { id: 'sepalTipTaper', value: '4' }, { id: 'sepalTipShape', value: '0.6' }, { id: 'sepalFootBreadth', value: '0.5' }] },
  /* THE ATTACHMENT (the second-round ruling): a whorl on the hub's FLARE — the
     deepest GOBLET, so the foot sits 19.4 mm down it and a limit drawn at the
     rim is a different number from one drawn at the foot. 90 asked so the
     clamp binds. */
  { label: "a sepal whorl on the hub's flare (5 on a 60 x 6 stem, GOBLET at MAX amount x MAX length, 90 asked)",
    set: [{ id: 'sepalCount', value: '5' }, { id: 'stemLength', value: '60' }, { id: 'hubStyle', value: 'GOBLET' }, { id: 'hubShapeAmount', value: '2' }, { id: 'hubLength', value: '40' }, { id: 'sepalAngle', value: '90' }] },
  /* THE SEPAL TIERS (F1.1a): the LANTERN frame (three tiers stepping down the
     join of a 40 mm GOBLET) and the CONTACT row (three tiers asked up at 60
     on a 10 mm hub, where tiers 2 and 3 are clamped by the tier above). The
     no-stem state SP10 speaks on is the GATED row below. */
  { label: 'SEPAL TIERS: three tiers on a 40 mm GOBLET hub — the LANTERN frame', for: TIER_MUTANTS,
    set: [{ id: 'sepalCount', value: '5' }, { id: 'sepalTiers', value: '3' }, { id: 'stemLength', value: '60' }, { id: 'hubStyle', value: 'GOBLET' }, { id: 'hubShapeAmount', value: '2' }, { id: 'hubLength', value: '40' }] },
  { label: 'SEPAL TIERS: three tiers asked UP at 60 on a 10 mm hub — tiers 2 and 3 clamped by the tier above', for: TIER_MUTANTS,
    set: [{ id: 'sepalCount', value: '5' }, { id: 'sepalTiers', value: '3' }, { id: 'sepalAngle', value: '60' }, { id: 'stemLength', value: '60' }, { id: 'hubStyle', value: 'GOBLET' }, { id: 'hubShapeAmount', value: '2' }, { id: 'hubLength', value: '10' }] },
  { label: 'SEPAL TIERS: the LANTERN with tier 2 scoped (+30 mm length, +0.25 height) and tier 1 lowered (-0.5 height — the ordering clamp binds on tier 2)', for: TIER_MUTANTS,
    scopes: { layers: [], petals: [], tiers: [{ tier: 0, offsets: { sepalHeight: -0.5 } }, { tier: 1, offsets: { sepalLength: 30, sepalHeight: 0.25 } }] },
    set: [{ id: 'sepalCount', value: '5' }, { id: 'sepalTiers', value: '3' }, { id: 'stemLength', value: '60' }, { id: 'hubStyle', value: 'GOBLET' }, { id: 'hubShapeAmount', value: '2' }, { id: 'hubLength', value: '40' }] },
  { label: 'SEPAL TIERS: GATED — four tiers asked with NO stem (hidden and inert, told)', for: TIER_MUTANTS,
    set: [{ id: 'sepalCount', value: '5' }, { id: 'sepalTiers', value: '4' }] },
  /* THE SEPAL CURVES (curves-sepals): a sepal on a drawn reflex with the
     petals on the sliders, the incurve the angle limit is drawn on, the S under
     a cup the fold limit binds on, and two tiers on two spines. */
  { label: 'SEPAL CURVES: 5 sepals on a drawn reflex (the petals on the sliders)', for: SEPC_MUTANTS,
    set: [{ id: 'sepalCount', value: '5' }, { id: 'sepalCurlMode', value: 'CURVE' }, { id: 'sepalSpineCurve', value: JSON.stringify(SEPC_SC.reflex) }] },
  { label: 'SEPAL CURVES: an incurved sepal asked up at 60 (the limit drawn on the curve)', for: SEPC_MUTANTS,
    set: [{ id: 'sepalCount', value: '5' }, { id: 'sepalAngle', value: '60' }, { id: 'sepalCurlMode', value: 'CURVE' }, { id: 'sepalSpineCurve', value: JSON.stringify(SEPC_SC.incurve) }] },
  { label: 'SEPAL CURVES: the S x sepal cup 0.6 (the fold limit binds)', for: SEPC_MUTANTS,
    set: [{ id: 'sepalCount', value: '5' }, { id: 'sepalCup', value: '0.6' }, { id: 'sepalCurlMode', value: 'CURVE' }, { id: 'sepalSpineCurve', value: JSON.stringify(SEPC_SC.s) }] },
  { label: 'SEPAL CURVES: two tiers — tier 2 owns the reflex, tier 1 on the sliders', for: SEPC_MUTANTS,
    scopes: { layers: [], petals: [], tiers: [{ tier: 1, offsets: {}, values: { sepalCurlMode: 'CURVE', sepalSpineCurve: SEPC_SC.reflex } }] },
    set: [{ id: 'sepalCount', value: '5' }, { id: 'sepalTiers', value: '2' }, { id: 'stemLength', value: '60' }, { id: 'hubStyle', value: 'GOBLET' }, { id: 'hubShapeAmount', value: '2' }, { id: 'hubLength', value: '40' }] },
  /* THE LEAF CURVES (curves-leaves): a drooping drawn spine, an upward curl the
     inset reads, the fold limit on a cupped leaf, an asymmetric toothed blade,
     the compound rose with a leaflet curve, a blunt drawn leaflet whose teeth
     reach the nib, and a lobed blade with an outline curve stored. */
  ...[['LEAF CURVES: a drawn drooping spine', LC_DROOP], ['LEAF CURVES: an upward curl the inset reads (3 nodes)', LC_UP], ['LEAF CURVES: a tight upward curl on a cup 1.2 leaf (the fold limit binds)', LC_FOLD],
    ['LEAF CURVES: an asymmetric toothed drawn outline', LC_TEETH], ['LEAF CURVES: the compound rose on a leaflet curve', LC_CPD], ['LEAF CURVES: a blunt drawn leaflet whose teeth reach the nib', LC_NIB],
    ['LEAF CURVES: a lobed blade with an outline curve stored (its own law)', LC_LOBED]].map(([label, st]) => ({ label, for: LEAFC_MUTANTS,
    set: Object.entries(st).map(([id, v]) => ({ id, value: typeof v === 'object' ? JSON.stringify(v) : String(v) })) })),
  /* THE INFLORESCENCE ROWS (the raceme session). Three, and each exists for a
     statement the other two cannot make.

     (i) THE PLAIN RACEME — five nodes, one floret each, on a 20 mm pedicel at
     the shipped angle. Nothing clamps here: the node count is satisfied, the
     size is above both petal floors, the area rule sits ABOVE its own floor at
     five florets on a 6 mm rachis, and the inset the pedicel needs is inside
     the stem's own. So every ID clause runs on its unclamped arm and a
     mutation that breaks one is not hidden behind a clamp that was going to
     fire anyway.

     (ii) THE CLAMPS BITING AT ONCE — twelve nodes on a 20 mm rachis, which the
     pitch floor takes to two, at the smallest floret the range reaches and a
     60 mm pedicel driven straight up so the inset cannot be satisfied. This is
     the row where `nodesClamped`, `pedicelRClamped`, `insetClamped` and
     `insetSatisfied` are all in their OTHER state, so every biconditional in
     ID2 has a side to be wrong on. A clamp asserted only where it does not
     bite is a clause with one arm.

     (iii) A RACEME ON A SPHERE HEAD — the only state where the floret's OWN
     stem channel fires, so ID4's omission biconditional has something to say,
     and the only state where O1's declared inward count is not the head's
     alone. Measured: 4 petals of 5 built on every floret, and six inward
     shells against a pre-session baseline of one. */
  /* THE SIZE FIELD ROWS (organic variance, build 1). Five, each for a clause
     the others cannot reach: the shipping wave (VS1/VS2/VS4/VS5 on their
     unaliased arms); the FIRST STEP above the guard (0.05 — the only row on
     which `the-guard-moves-off-zero` separates the registry from the
     geometry); the FAN at a NON-ZERO phase (cos is even at phase 0, so an
     uneven fan field is invisible there); the ALIASED corner (VS4's other
     arm); and a continuous MUM at amount 0 (the told flag's all-pairs claim,
     whose adjacent-only mutant reads right on every 8-petal row). */
  { label: 'the size field: ±50% at 1 cycle on the shipping whorl',
    set: [{ id: 'varianceSize', value: '0.5' }] },
  { label: 'the size field: ±5%, the first step above the guard',
    set: [{ id: 'varianceSize', value: '0.05' }] },
  { label: 'the size field on a FAN at phase 90 (the phase must be inert; the field even)',
    set: [{ id: 'placement', value: 'FAN' }, { id: 'varianceSize', value: '0.5' }, { id: 'variancePhase', value: '90' }] },
  { label: 'the size field at 20 cycles on 8 slots (ALIASED — told, not capped)',
    set: [{ id: 'varianceSize', value: '0.5' }, { id: 'varianceFrequency', value: '20' }] },
  /* THE FORM FIELD (build 2): the limit at 1 cycle; the first step above the
     guard (the only row separating the form guard's two statements); the FAN
     at phase 90 (the evenness claim); the ALIASED corner; and the ONE-CLAMP
     row, where the inner whorls' group curl is past 360 before the slot term. */
  { label: 'the form field: amount 1 at 1 cycle on the shipping whorl',
    set: [{ id: 'varianceForm', value: '1' }] },
  { label: 'the form field: 0.05, the first step above the guard',
    set: [{ id: 'varianceForm', value: '0.05' }] },
  { label: 'the form field on a FAN at phase 90',
    set: [{ id: 'placement', value: 'FAN' }, { id: 'varianceForm', value: '1' }, { id: 'variancePhase', value: '90' }] },
  { label: 'the form field at 20 cycles on 8 slots (ALIASED)',
    set: [{ id: 'varianceForm', value: '1' }, { id: 'varianceFrequency', value: '20' }] },
  { label: 'the form field on 3 whorls, curl 180 + innerCurl 360 (the ONE clamp)',
    set: [{ id: 'layerCount', value: '3' }, { id: 'petalSpineCurl', value: '180' }, { id: 'innerCurl', value: '360' }, { id: 'varianceForm', value: '1' }] },
  /* THE SPACING FIELD (build 3): the ruled maximum at 1 cycle (SV2's law) and
     the aliased wave (SV3's order — where a direct offset swaps neighbours).
     The amount-0 arm is the shipping default's own row. */
  { label: 'the spacing field: 0.9 at 1 cycle on the shipping whorl',
    set: [{ id: 'varianceSpacing', value: '0.9' }] },
  { label: 'the spacing field: 0.9 at 5 cycles on 8 slots (ALIASED — a direct offset crosses)',
    set: [{ id: 'varianceSpacing', value: '0.9' }, { id: 'varianceFrequency', value: '5' }] },
  { label: 'the told flag on the continuous mum (40 x 3, amount 0 — the all-pairs approach between turns)',
    set: [{ id: 'placement', value: 'CONTINUOUS' }, { id: 'petalCount', value: '40' }, { id: 'layerCount', value: '3' }] },
  { label: 'a raceme, nothing clamped (5 nodes x 1, 5-petal florets on 20 mm pedicels at 35 deg)',
    set: [{ id: 'stemLength', value: '120' }, { id: 'inflorescence', value: 'RACEME' }] },
  { label: 'a raceme with every clamp biting (12 nodes on a 20 mm rachis, 0.20x florets, 60 mm straight up)',
    set: [{ id: 'stemLength', value: '20' }, { id: 'inflorescence', value: 'RACEME' }, { id: 'floretNodes', value: '12' },
          { id: 'floretScale', value: '0.2' }, { id: 'pedicelLength', value: '60' }, { id: 'pedicelAngle', value: '90' }] },
  { label: "a raceme on a SPHERE head — the FLORET's own stem channel, the only state ID4's omission clause can speak on",
    set: [{ id: 'placement', value: 'CONTINUOUS' }, { id: 'hubShape', value: 'SPHERE' },
          { id: 'stemLength', value: '120' }, { id: 'inflorescence', value: 'RACEME' }] },
  /* THE REACH INSET's two rows (build 3): the sheet whose LIVE and EXPORT
     reach DIFFER — on the shipping sheet they are the same double, so a reach
     read from one mode is invisible there — and the 250 mm pedicel, the only
     length at which the pedicel's own ceiling and the stem's disagree. */
  { label: 'a raceme on a 0.60 mm sheet (the two modes reach differently — the reach union\'s only witness)',
    set: [{ id: 'stemLength', value: '120' }, { id: 'inflorescence', value: 'RACEME' }, { id: 'sheetThickness', value: '0.6' }] },
  { label: 'a raceme on 250 mm pedicels (past the head\'s own stem range — the ceiling is the pedicel\'s)',
    set: [{ id: 'stemLength', value: '120' }, { id: 'inflorescence', value: 'RACEME' }, { id: 'pedicelLength', value: '250' }] },
  /* (iv) A RACEME ASKED FOR WITH NO RACHIS, and it is the ONLY state ID0 can
     speak on — measured, not reasoned. ID0 compares the geometry's guard
     against the registry's predicate, and the two agree on every state where
     a raceme is either plainly on or plainly off whatever either one says. A
     guard that has stopped refusing the no-rachis case is invisible on all
     three rows above, and `the-inflorescence-guard-disagrees-with-the-registry`
     fired NOTHING until this row existed: `stem-eligible-disagrees-with-the-
     registry`'s lesson one control later, and the reason the row a
     two-statement clause needs is the one where the statement BITES. */
  { label: 'a raceme asked for with NO RACHIS (the two statements, where they can disagree)',
    set: [{ id: 'stemLength', value: '0' }, { id: 'inflorescence', value: 'RACEME' },
          { id: 'floretNodes', value: '12' }, { id: 'pedicelLength', value: '60' }] },

  /* THE STAMEN LENGTH VARIANCE (F1.2): six on a ring with the variance at
     0.5, where the law moves every rod; and the 120 mm ceiling with the
     variance at its maximum, the one state where the clamp mutation can
     move anything. */
  { label: 'six stamens with the length variance at 0.5 (random per stamen, seeded)',
    set: [{ id: 'stamenCount', value: '6' }, { id: 'stamenLengthVariance', value: '0.5' }] },
  { label: 'six stamens at the 120 mm ceiling with the variance at its maximum (the clamp binds)',
    set: [{ id: 'stamenCount', value: '6' }, { id: 'stamenLength', value: '120' }, { id: 'stamenLengthVariance', value: '1' }] },
  /* THE INDEPENDENT COIL (F1.3a): the shipping coil on six, where every
     coil mutant moves the rods; and twelve turns on 20 mm, the one state
     where the floor binds (the unfloored mutant is inert elsewhere). */
  { label: 'six stamens coiled (independent, r 1.5 mm x 3 turns)',
    set: [{ id: 'stamenCount', value: '6' }, { id: 'stamenCoil', value: 'INDEPENDENT' }] },
  { label: 'six stamens coiled at twelve turns (the curvature floor clamps the turns)',
    set: [{ id: 'stamenCount', value: '6' }, { id: 'stamenCoil', value: 'INDEPENDENT' }, { id: 'stamenCoilTurns', value: '12' }] },
  /* THE BRAID (the braid session): six braided at the defaults, at twelve
     turns (the floor binds on the twist), radius 10 x curl 180 (the fold
     limit binds per strand) and with two strands owning their own values
     (through `__bloomScopes`). Scoped to the braid mutants: the clean control
     still runs them. */
  { label: 'six stamens and a style on 100 mm petals (the roots span the thickened hub)', for: /the-part-root-spans-the-sheet/,
    set: [{ id: 'petalLength', value: '100' }, { id: 'stamenCount', value: '6' }, { id: 'gynoecium', value: 'STYLE' }] },
  { label: 'six stamens braided (one bundle, r 1.5 mm x 3 turns)', for: /braid|strand/,
    set: [{ id: 'stamenCount', value: '6' }, { id: 'stamenCoil', value: 'BRAIDED' }] },
  { label: 'six stamens braided at twelve turns (the floor clamps the twist)', for: /braid|strand/,
    set: [{ id: 'stamenCount', value: '6' }, { id: 'stamenCoil', value: 'BRAIDED' }, { id: 'stamenCoilTurns', value: '12' }] },
  { label: 'six stamens braided at radius 10 x curl 180 (the fold limit clamps each strand)', for: /braid|strand/,
    set: [{ id: 'stamenCount', value: '6' }, { id: 'stamenCoil', value: 'BRAIDED' }, { id: 'stamenCoilRadius', value: '10' }, { id: 'stamenCurl', value: '180' }] },
  { label: 'six stamens braided, strand 2 +10 mm and strand 4 laid +1.5 mm wider (strand scopes)', for: /braid|strand/,
    set: [{ id: 'stamenCount', value: '6' }, { id: 'stamenCoil', value: 'BRAIDED' }],
    scopes: { layers: [], petals: [], tiers: [], strands: [{ strand: 1, offsets: { stamenLength: 10 } }, { strand: 3, offsets: { stamenCoilRadius: 1.5 } }] } },
  /* THE SPINE CURVE (F3-global): a hooked curve in CURVE mode with the HIDDEN
     slider family set (so a leak of the slider is observable — on a slider at
     0 the leak mutant is a no-op by construction), and a LOADED curve under
     the floor (the one state where the refusal fires and the build clamps, so
     a validator that stops refusing, or asks a different floor, is seen). */
  { label: 'a hooked spine curve with the hidden slider family set (curl 150, bias 1, start 0.5)',
    set: [{ id: 'petalCurlMode', value: 'CURVE' }, { id: 'petalSpineCurve', value: JSON.stringify({ mode: 'single', points: [[0, 0], [0.55, 0.1], [0.75, 0.45], [0.5, 0.6], [0.3, 0.45]] }) },
          { id: 'petalSpineCurl', value: '150' }, { id: 'curlBias', value: '1' }, { id: 'curlStart', value: '0.5' }] },
  { label: 'a loaded spine curve UNDER the floor (0.69 mm radius against 1.20 — refused by the validator, clamped by the build)',
    set: [{ id: 'petalCurlMode', value: 'CURVE' }, { id: 'petalSpineCurve', value: JSON.stringify({ mode: 'single', points: [[0, 0], [0.55, 0.1], [0.66, 0.3], [0.56, 0.38], [0.5, 0.3]] }) }] },
  /* THE FOLD LIMIT (spine-cup-fold): the drawn S at cup 0.6 (the limit binds on
     a curve — refused by the validator, built at the limit) and curl 270 x cup
     1.2 on the sliders (the limit opens the coil). Scoped to the fold mutants. */
  { label: 'the drawn S spine x cup 0.6 (the fold limit binds: refused, built at the inner skin\'s limit)', for: /fold/,
    set: [{ id: 'petalCurlMode', value: 'CURVE' }, { id: 'petalSpineCurve', value: JSON.stringify({ mode: 'single', points: [[0, 0], [0.3, 0.12], [0.6, -0.1], [1, 0.15]] }) }, { id: 'petalCup', value: '0.6' }] },
  { label: 'curl 270 x cup 1.2 on the sliders (the fold limit opens the coil)', for: /fold/,
    set: [{ id: 'petalSpineCurl', value: '270' }, { id: 'petalCup', value: '1.2' }] },
  /* THE OUTLINE CURVE (F6-sym): a spoon with the HIDDEN law family set (so a
     leak of the law, or of the lobes, is observable — at their defaults the
     law leak is still large, the lobe leak a no-op by construction), and a
     LOADED outline with a point under the print floor (the one state where the
     validator refuses and the build lifts). Scoped to the outline mutants. */
  { label: 'an outline curve (a spoon) with the hidden law family set (tip shape 3, tapers 3 / 4, squared end 1, lobes 0.3)', for: OUTLINE_MUTANTS,
    set: [{ id: 'petalOutlineMode', value: 'CURVE' }, { id: 'petalOutlineCurve', value: JSON.stringify(OUTLINE_SPOON) },
          { id: 'petalTipShape', value: '3' }, { id: 'petalBaseTaper', value: '3' }, { id: 'petalTipTaper', value: '4' }, { id: 'petalTipEnd', value: '1' }, { id: 'lobeDepth', value: '0.3' }] },
  { label: 'a loaded outline curve with a point UNDER the print floor (0.525 mm half-width against 0.80 — refused by the validator, lifted by the build)', for: OUTLINE_MUTANTS,
    set: [{ id: 'petalOutlineMode', value: 'CURVE' }, { id: 'petalOutlineCurve', value: JSON.stringify(OUTLINE_UNDER_PTS) }] },
  /* F6-sym-2: the width scale either side of 1, the scaled floor, and the
     throat on a fused tube. Scoped to the F6-sym-2 mutants. */
  { label: 'a scaled outline curve at petalWidth 24 (the widths x1.5)', for: OUTLINE2_MUTANTS,
    set: [{ id: 'petalOutlineMode', value: 'CURVE' }, { id: 'petalOutlineCurve', value: JSON.stringify(OUTLINE_DEF_PTS) }, { id: 'petalWidth', value: '24' }] },
  { label: 'a scaled outline curve at petalWidth 12 (the widths x0.75)', for: OUTLINE2_MUTANTS,
    set: [{ id: 'petalOutlineMode', value: 'CURVE' }, { id: 'petalOutlineCurve', value: JSON.stringify(OUTLINE_DEF_PTS) }, { id: 'petalWidth', value: '12' }] },
  { label: 'a scaled outline curve at petalWidth 10 set in LAW first (the long tail under the floor only at the scaled width — refused and lifted)', for: OUTLINE2_MUTANTS,
    set: [{ id: 'petalWidth', value: '10' }, { id: 'petalOutlineMode', value: 'CURVE' }, { id: 'petalOutlineCurve', value: JSON.stringify(OUTLINE_TAIL_PTS) }] },
  { label: 'a tubular outline curve (5 petals, k 0 at fusion height 0.40, the default curve on the lobe)', for: OUTLINE2_MUTANTS,
    set: [{ id: 'petalCount', value: '5' }, { id: 'tubeLayer1', value: '0' }, { id: 'tubeHeight', value: '0.4' }, { id: 'petalOutlineMode', value: 'CURVE' }, { id: 'petalOutlineCurve', value: JSON.stringify(OUTLINE_DEF_PTS) }] },
  /* F6-asym: the lopsided blade (the default curve on the left, a narrower
     right half) and the pinwheel at five petals. Scoped to the asymmetric
     mutants. */
  /* F6-scope: the mixed flower (three layers: LAW / the spoon / the lopsided
     curve), a FAN pair owning the lopsided curve, a FAN of the lopsided curve
     (every partner mirrored) and a RADIAL one (the pinwheel — none mirrored).
     Scoped to the scoped-outline mutants (and they to these). */
  { label: 'a scoped outline — the MIXED flower (RADIAL x 3 layers, LAW / spoon / lopsided)', for: SO_MUTANTS,
    scopes: { layers: [{ layer: 1, offsets: {}, values: { petalOutlineMode: 'CURVE', petalOutlineCurve: SO_SPOON } }, { layer: 2, offsets: {}, values: { petalOutlineMode: 'CURVE', petalOutlineCurve: ASYM_LOPSIDED } }], petals: [], tiers: [] },
    set: [{ id: 'layerCount', value: '3' }, { id: 'scopeLayers', value: 'ON' }] },
  { label: 'a scoped outline — FAN pair 2 owns the lopsided curve on a LAW fan', for: SO_MUTANTS,
    scopes: { layers: [], petals: [{ layer: 0, slot: 2, offsets: {}, values: { petalOutlineMode: 'CURVE', petalOutlineCurve: ASYM_LOPSIDED } }], tiers: [] },
    set: [{ id: 'placement', value: 'FAN' }, { id: 'scopePetals', value: 'ON' }] },
  { label: 'a scoped outline — FAN x the lopsided curve (every partner mirrored)', for: SO_MUTANTS,
    set: [{ id: 'placement', value: 'FAN' }, { id: 'petalOutlineMode', value: 'CURVE' }, { id: 'petalOutlineCurve', value: JSON.stringify(ASYM_LOPSIDED) }] },
  { label: 'a scoped outline — RADIAL x the lopsided curve (the pinwheel, none mirrored)', for: SO_MUTANTS,
    set: [{ id: 'petalOutlineMode', value: 'CURVE' }, { id: 'petalOutlineCurve', value: JSON.stringify(ASYM_LOPSIDED) }] },
  /* F3-scope: a RADIAL layer owning the incurve over a slider bloom (curl 45),
     the same record with Per-layer values OFF (kept and inert), and a FAN pair
     owning the incurve on a slider fan. Scoped to the scoped-spine mutants (and
     they to these). */
  { label: 'a scoped spine — RADIAL x 2, layer 2 owns the incurve on a slider bloom', for: SPS_MUTANTS,
    scopes: { layers: [{ layer: 1, offsets: {}, values: { petalCurlMode: 'CURVE', petalSpineCurve: SP_INCURVE } }], petals: [], tiers: [] },
    set: [{ id: 'layerCount', value: '2' }, { id: 'scopeLayers', value: 'ON' }, { id: 'petalSpineCurl', value: '45' }] },
  { label: 'a scoped spine — the same record with Per-layer values OFF (kept and inert)', for: SPS_MUTANTS,
    scopes: { layers: [{ layer: 1, offsets: {}, values: { petalCurlMode: 'CURVE', petalSpineCurve: SP_INCURVE } }], petals: [], tiers: [] },
    set: [{ id: 'layerCount', value: '2' }, { id: 'petalSpineCurl', value: '45' }] },
  { label: 'a scoped spine — FAN pair 2 owns the incurve on a slider fan', for: SPS_MUTANTS,
    scopes: { layers: [], petals: [{ layer: 0, slot: 2, offsets: {}, values: { petalCurlMode: 'CURVE', petalSpineCurve: SP_INCURVE } }], tiers: [] },
    set: [{ id: 'placement', value: 'FAN' }, { id: 'scopePetals', value: 'ON' }, { id: 'petalSpineCurl', value: '30' }] },
  { label: 'an asymmetric outline curve — a LOPSIDED blade (the right half narrower)', for: ASYM_MUTANTS,
    set: [{ id: 'petalOutlineMode', value: 'CURVE' }, { id: 'petalOutlineCurve', value: JSON.stringify(ASYM_LOPSIDED) }] },
  { label: 'an asymmetric outline curve — a PINWHEEL x 5 petals', for: ASYM_MUTANTS,
    set: [{ id: 'petalCount', value: '5' }, { id: 'petalOutlineMode', value: 'CURVE' }, { id: 'petalOutlineCurve', value: JSON.stringify({ mode: 'two-sided', points: [[0, 0.05], [0.3, 0.15], [0.6, 0.26], [0.85, 0.24], [1, 0]], right: [[0, 0.05], [0.3, 0.08], [0.6, 0.12], [0.85, 0.1], [1, 0]] }) }] },
];

/* ===================================================================
   THE SHARD CENSUS (the shard-headroom session, Oct 16) — the sweep's
   coverage PROVED rather than assumed, the export gate's own construction
   (tools/bloom-export-shards.mjs) applied to the mutant table.

   Before this, "every mutant is in exactly one shard" was a property of
   `i % n === k` and of nothing else: a workflow whose matrix listed eleven
   shards under `SHARDS: 12`, or a selector edited off by one, would run a
   green sweep that checked less than it says, and no job would notice. So:
     1. ONE OWNER OF MEMBERSHIP: `shardOf(index, n)`, IMPORTED from the export
        gate's shard module — a mutant's shard is a pure function of its TABLE
        INDEX, never of its id.
     2. EVERY SHARD WRITES A CENSUS (`--census=<file>`): the table it saw (the
        mutant count and a hash of every id in order), the mutants it ACTUALLY
        REACHED in its loop (not the ones its selector named), any row subset,
        and `complete: true` LAST. A shard that crashed, timed out or never
        started leaves no census, and that is a finding.
     3. THE RECONCILIATION (`--reconcile=<dir> --shards=N`) rebuilds the
        expected set from ITS OWN `MUTANTS` — an owner no shard writes (the
        fourth durable rule: a clause that took the count from the shards
        would agree with a shard that lost one). Every mutant must be reached
        by EXACTLY ONE shard, every shard 0..N-1 must report, and each shard
        must have reached every mutant its own selector owes it.
     4. `--census-control` builds censuses from the SHIPPED selector with no
        browser, then breaks them, and requires the shipped reconcile to FAIL
        on every break and PASS on the unbroken set.
   WHAT IT DOES NOT COVER: whether a shard's mutants FIRED — that is each
   shard's own exit status, exactly as unsharded. This proves only that the
   union of what the shards reached is the table, once.
   Both modes exit BEFORE the browser launches (the harness import still
   needs the playwright package, never a Chromium binary). The import of
   `shardOf` makes bloom-export-shards.mjs a load-time dependency of this
   table; an edit there runs bloom-export-watertight, whose `gates` job runs
   `--anchors` here, so a load-time break is red the day it lands.
   =================================================================== */
const CENSUS_VERSION = 1;
function tableHash(ids) { return crypto.createHash('sha256').update(JSON.stringify(ids)).digest('hex'); }
function reconcileCensuses(censuses, { n, ids }) {
  const bad = [];
  const hash = tableHash(ids);
  const byK = new Map();
  for (const c of censuses) {
    const tag = `shard ${c && c.shard ? `${c.shard.k}/${c.shard.n}` : '?'}`;
    if (!c || c.version !== CENSUS_VERSION) { bad.push(`${tag}: census version ${c && c.version} is not ${CENSUS_VERSION}`); continue; }
    if (c.complete !== true) { bad.push(`${tag}: census is INCOMPLETE — the shard did not finish`); continue; }
    if (!c.shard || c.shard.n !== n) { bad.push(`${tag}: ran as one of ${c.shard && c.shard.n} shards, the reconciliation expects ${n}`); continue; }
    if (!Number.isInteger(c.shard.k) || c.shard.k < 0 || c.shard.k >= n) { bad.push(`${tag}: shard index outside 0..${n - 1}`); continue; }
    if (byK.has(c.shard.k)) { bad.push(`${tag}: TWO censuses claim this shard`); continue; }
    byK.set(c.shard.k, c);
    if (c.table.count !== ids.length) bad.push(`${tag}: saw a ${c.table.count}-mutant table, the reconciliation's own has ${ids.length}`);
    if (c.table.hash !== hash) bad.push(`${tag}: saw a DIFFERENT table (id hash ${String(c.table.hash).slice(0, 12)} against ${hash.slice(0, 12)})`);
    if (c.rows) bad.push(`${tag}: ran a ROW SUBSET (--rows=${c.rows}) — not a sweep`);
    if (c.witnessesOnly) bad.push(`${tag}: ran --witnesses-only — no family was asked, not a sweep`);
    if (c.neuter) bad.push(`${tag}: ran with --neuter=${c.neuter} — a control run, not a sweep`);
  }
  for (let k = 0; k < n; k++) if (!byK.has(k)) bad.push(`shard ${k}/${n}: NO CENSUS — the shard crashed, timed out, never ran, or its artifact was lost. Its mutants were run by nobody.`);
  const seen = new Map();
  for (const [k, c] of byK) {
    const mine = new Set();
    for (const a of c.reached) {
      if (!Number.isInteger(a.index) || a.index < 0 || a.index >= ids.length) { bad.push(`shard ${k}/${n}: reached index ${a.index}, outside the ${ids.length}-mutant table`); continue; }
      if (ids[a.index] !== a.id) bad.push(`shard ${k}/${n}: mutant ${a.index} is "${a.id}" in its census and "${ids[a.index]}" in the table`);
      if (seen.has(a.index)) bad.push(`mutant ${a.index} ("${ids[a.index]}") was reached by shard ${seen.get(a.index)} AND shard ${k} — run twice`);
      else seen.set(a.index, k);
      mine.add(a.index);
    }
    const owed = ids.map((_, i) => i).filter((i) => shardOf(i, n) === k);
    const missing = owed.filter((i) => !mine.has(i));
    if (missing.length) bad.push(`shard ${k}/${n}: its selector owes ${owed.length} mutant(s) and it reached ${mine.size}; missing ${missing.map((i) => `${i} "${ids[i]}"`).join(', ')}`);
  }
  const none = ids.map((_, i) => i).filter((i) => !seen.has(i));
  if (none.length) bad.push(`${none.length} of the ${ids.length} mutants were reached by NO shard: ${none.map((i) => `${i} "${ids[i]}"`).join(', ')}`);
  return bad;
}
function censusFor(k, n, ids, select = shardOf) {
  return { version: CENSUS_VERSION, shard: { k, n }, table: { count: ids.length, hash: tableHash(ids) }, rows: null, witnessesOnly: false, neuter: null,
           reached: ids.map((id, index) => ({ index, id })).filter((a) => select(a.index, n) === k), complete: true };
}
{
  const ids = MUTANTS.map((m) => m.id);
  const nArg = (process.argv.find((a) => a.startsWith('--shards=')) || '').split('=')[1];
  const RECONCILE = (process.argv.find((a) => a.startsWith('--reconcile=')) || '').split('=')[1];
  if (RECONCILE || process.argv.includes('--census-control')) {
    const n = +nArg;
    if (!Number.isInteger(n) || n < 1) { console.log(`--shards=N is required (a positive integer), got "${nArg}"`); process.exit(1); }
    if (new Set(ids).size !== ids.length) { console.log('the table has duplicate mutant ids — a census keyed on them is ambiguous'); process.exit(1); }
    if (RECONCILE) {
      const files = fs.existsSync(RECONCILE) ? fs.readdirSync(RECONCILE).filter((f) => f.endsWith('.json')).sort() : [];
      const censuses = files.map((f) => JSON.parse(fs.readFileSync(path.join(RECONCILE, f), 'utf8')));
      const bad = reconcileCensuses(censuses, { n, ids });
      for (const c of censuses) if (c && c.shard) console.log(`  shard ${c.shard.k}/${c.shard.n}: ${c.reached ? c.reached.length : '?'} mutant(s) reached${c.complete === true ? '' : ' (INCOMPLETE)'}`);
      for (const b of bad) console.log(`  *** ${b}`);
      console.log(bad.length ? `\nSHARD CENSUS: FAILED — ${bad.length} finding(s) over ${censuses.length} census file(s)`
                             : `\nSHARD CENSUS: every one of the ${ids.length} mutants was reached by exactly one of the ${n} shards`);
      process.exit(bad.length ? 1 : 0);
    }
    /* THE MUST-FAIL. Each break is a copy of the unbroken set. */
    const base = () => Array.from({ length: n }, (_, k) => censusFor(k, n, ids));
    const legs = [
      ['the unbroken set', base(), false],
      ['a shard with no census (the matrix lists one fewer job than SHARDS)', base().slice(0, n - 1), true],
      ['a selector off by one (every shard runs i % (n + 1))', Array.from({ length: n }, (_, k) => censusFor(k, n, ids, (i, m) => i % (m + 1))), true],
      ['one mutant dropped from a middle shard', (() => { const b = base(); const m = b[Math.floor(n / 2)]; m.reached = m.reached.slice(1); return b; })(), true],
      ['one mutant run by two shards', (() => { const b = base(); b[1].reached.push({ ...b[0].reached[0] }); return b; })(), true],
      ['two censuses claiming one shard', (() => { const b = base(); b.push(censusFor(0, n, ids)); return b; })(), true],
      ['a shard that ran as one of n - 1', (() => { const b = base(); b[0] = censusFor(0, n - 1, ids); return b; })(), true],
      ['an incomplete census', (() => { const b = base(); b[n - 1].complete = false; return b; })(), true],
      ['a census of a different table', (() => { const b = base(); b[0].table.hash = tableHash([...ids].reverse()); return b; })(), true],
      ['a row-subset shard', (() => { const b = base(); b[0].rows = 'LOBES'; return b; })(), true],
      ['a witnesses-only shard', (() => { const b = base(); b[0].witnessesOnly = true; return b; })(), true],
      ['a neutered-control shard', (() => { const b = base(); b[0].neuter = ids[0]; return b; })(), true],
    ];
    let ok = true;
    for (const [what, set, mustFail] of legs) {
      const bad = reconcileCensuses(set, { n, ids });
      const good = mustFail ? bad.length > 0 : bad.length === 0;
      if (!good) ok = false;
      console.log(`  ${good ? 'ok  ' : 'BAD '} ${what}: ${bad.length ? `${bad.length} finding(s) — ${bad[0]}` : 'reconciles clean'}`);
    }
    const sizes = base().map((c) => c.reached.length);
    console.log(`  per-shard mutant counts at ${n} shards: ${sizes.join(' ')} (max ${Math.max(...sizes)})`);
    console.log(ok ? `\nCENSUS CONTROL: the reconciliation passes the unbroken set and FAILS on every one of ${legs.length - 1} breaks`
                   : '\nCENSUS CONTROL: FAILED');
    process.exit(ok ? 0 : 1);
  }
}

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
    /* A ROW MAY CARRY SCOPES (F1.1a): the tier offsets reach the page through
       the `__bloomScopes` hook (the scopes gate's own route) and the harness's
       Node rebuilds through `row.scopes`, so a leak between tiers has a row it
       can show on — with no entry every tier is built from the globals and a
       leak is invisible by construction. Cleared on every openBloom. */
    if (row.scopes) { await page.evaluate((r) => window.__bloomScopes(r), row.scopes); await stillFrame(page); }
    await page.waitForTimeout(300);
    /* BOTH FAMILIES. The apex table was A-only; session 41 added L7, whose
       witness is the emitted outline's local powers, and "re-run the mutant
       table when a family is added" is this project's own rule. A lobe
       mutation that fired nothing would otherwise look exactly like a clean
       tree. */
    /* THE FAMILY CODE IS THE WHOLE RUN OF DIGITS, ANCHORED ON ITS COLON, and
       that is a defect this table shipped until the first TWO-DIGIT family
       arrived. `/^(ST\d)/` captures ONE digit, so every `ST10:` message was
       recorded as `ST1` — which made a mutant naming only ST10 report "fired
       ST1", i.e. SILENT on the clause it exists for and CREDITED to a clause
       that could not have moved. Measured on `the-tip-plug-is-typed`, whose
       triangle count is unchanged by construction so ST1 is blind to it.

       IT IS A CLASS, NOT AN INCIDENT: any family whose code is a PREFIX of a
       new one is misattributed the moment the new one exists, in BOTH
       directions — the new family reads as silent and the old one reads as
       having fired. A green table is exactly what it looks like. The colon is
       what makes the capture unambiguous, since every assertion message here is
       `FAMILY: text`. */
    for (const msg of await thicknessAssertions(page, row)) {
      const mm = /^(A\d+):/.exec(msg); if (mm) seen.add(mm[1]);
    }
    for (const msg of await lobeAssertions(page, row)) {
      const mm = /^(L\d+):/.exec(msg); if (mm) seen.add(mm[1]);
    }
    /* THE STEM FAMILY (session 43) — same rule again: a family added is a
       family this table must be able to fire. AND THE CUT FAMILY (stem session
       3) RIDES IN THE SAME CALL under its own prefix: `stemAssertions` pushes
       `SC0`-`SC3` beside `ST*`, and a capture of `ST\d+` alone reported both cut
       mutants `SILENT: SC2, SC3` on the first run while the same plants fired
       both clauses through the harness directly — the ST10-as-ST1 lesson a
       third time, this time a family the capture could not see at all. */
    for (const msg of await stemAssertions(page, row)) {
      const mm = /^(S[TC]\d+):/.exec(msg); if (mm) seen.add(mm[1]);
    }
    /* THE LEAF FAMILY (the leaf tip-shape session) — the rule once more. */
    for (const msg of await leafAssertions(page, row)) {
      const mm = /^(LF\d+):/.exec(msg); if (mm) seen.add(mm[1]);
      /* `--why` prints each leaf message beside its row (S5: the control fired
         LF26 on one row of 68 and the table names families, never rows) */
      if (process.argv.includes('--why')) console.log(`      [${row.label}] ${msg.slice(0, 260)}`);
    }
    /* THE SEPAL FAMILY (sepals, part 1) — the rule again. */
    for (const msg of await sepalAssertions(page, row)) {
      const mm = /^(SP\d+):/.exec(msg); if (mm) seen.add(mm[1]);
    }
    /* THE INFLORESCENCE FAMILY (the raceme session) — the rule once more, and
       it is the first family here whose subject is a SECOND HEAD: every clause
       below is silent on a bloom that is one head at the origin, which is every
       other row this table drives. */
    /* AND THE PER-NODE FAMILY (build 3, Phase B) RIDES IN THE SAME CALL: the
       first run of its eight mutants reported three SILENT on NV1/NV2/NV4
       while the page's clauses were firing — because this capture read
       `ID\d+` alone and dropped every `NV` message on the floor. ST10's
       misattribution class, in the other direction: a family whose messages
       reach the table through a call the table captures under another
       family's prefix is silent by construction. */
    for (const msg of await inflorescenceAssertions(page, row)) {
      const mm = /^(ID\d+|NV\d+):/.exec(msg); if (mm) seen.add(mm[1]);
    }
    /* THE SIZE FIELD (organic variance, build 1) — the rule once more, and the
       first family whose subject is a per-SLOT quantity: every clause is
       silent on a bloom whose amount is 0, which is every other row here. */
    for (const msg of await varianceAssertions(page, row)) {
      const mm = /^(VS\d+|FV\d+|SV\d+):/.exec(msg); if (mm) seen.add(mm[1]);
    }
    /* THE ANDROECIUM (F1.2) — the table never ran stamenAssertions before
       the length variance's four mutants named JS8, so every JS clause was
       invisible here BY CONSTRUCTION (a mutant naming one would have read
       MISSED, indistinguishable from a blind clause). `JS\d+` and not
       `J\d+`: the junction family's own capture is anchored on a digit after
       the J, so `JS8:` reaches neither by accident — the prefix hazard this
       file records, avoided by construction. */
    for (const msg of await stamenAssertions(page, row)) {
      const mm = /^(JS\d+):/.exec(msg); if (mm) seen.add(mm[1]);
    }
    /* THE APEX NIB (the apex-nib session) — the rule once more, and note the
       code is `AN\d+` and NOT `A\d+`: the A family's own capture above is
       anchored on a digit immediately after the letter, so `AN0:` matches
       neither pattern by accident. That is the prefix hazard this file
       already records, avoided by construction rather than by luck. */
    for (const msg of await apexNibAssertions(page, row)) {
      const mm = /^(AN\d+|OC\d+):/.exec(msg); if (mm) seen.add(mm[1]);
    }
    /* THE CURL FAMILY (F3-global, the spine curve) — the rule once more: the
       table never ran curlAssertions until the curve's five mutants named C1.
       `C\d+` and not `C`: the cut family's `SC` is captured above on its own
       anchor, and a bare `C` would read `CA`/`CG` messages nobody pushes here. */
    for (const msg of await curlAssertions(page, row)) {
      const mm = /^(C\d+):/.exec(msg); if (mm) seen.add(mm[1]);
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
  /* `--anchors`: the pre-check alone, on every push that touches the geometry
     or the harness (the gate-coverage session) — seconds, no mutant run. A
     refactor that moves a mutant's find-string is caught the day it lands
     rather than on the next sweep. */
  if (process.argv.includes('--anchors')) { await browser.close(); server.close(); console.log(`\nANCHORS ONLY: every one of the ${MUTANTS.length} mutants matches its find-string exactly once; no mutant was run.`); process.exit(0); }
}

/* `--only=<id>[,<id>...]` runs a subset. A full sweep is every mutant over
   every row and is not survivable in a container that restarts, so the subset
   is how a family is re-verified after a change; it NEVER reports as a sweep. */
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1];
let SELECTED = ONLY ? ONLY.split(',').map((x) => x.trim()).filter(Boolean) : null;
/* `--shard=k/n` (the gate-coverage session, D14): the k-th of n slices of the
   table BY INDEX — `MUTANTS[i]` for `shardOf(i, n) === k`, the export gate's
   own `shardOf`, IMPORTED (one owner; see THE SHARD CENSUS above) — so a weekly CI sweep can run the whole table across n
   parallel jobs at ~3 min a mutant (measured 182 s for one on this box: 79
   mutants is four hours in one job, 60 minutes in four). A shard reports as a
   SUBSET, never as a sweep; the anchor pre-check above runs over ALL of them
   in every shard, so a disarmed mutant is named whichever shard skips it. */
const SHARD_ARG = (process.argv.find((a) => a.startsWith('--shard=')) || '').split('=')[1];
if (SHARD_ARG) {
  const m = /^(\d+)\/(\d+)$/.exec(SHARD_ARG);
  if (!m || +m[2] < 1 || +m[1] >= +m[2]) { await browser.close(); server.close(); console.log(`--shard wants k/n with 0 <= k < n, got "${SHARD_ARG}"`); process.exit(1); }
  if (SELECTED) { await browser.close(); server.close(); console.log('--shard and --only do not combine'); process.exit(1); }
  SELECTED = MUTANTS.filter((mu, i) => shardOf(i, +m[2]) === +m[1]).map((mu) => mu.id);
  console.log(`SHARD ${m[1]}/${m[2]}: ${SELECTED.length} of ${MUTANTS.length} mutants (by table index)`);
}
if (SELECTED) {
  const unknown = SELECTED.filter((id) => !MUTANTS.some((m) => m.id === id));
  if (unknown.length) { await browser.close(); server.close(); console.log(`--only names no such mutant: ${unknown.join(', ')}`); process.exit(1); }
}

/* `--witnesses-only` (S4b): every selected mutant's WITNESS on the mutated
   module, in Node, and nothing else — no clean control, no browser row, no
   family asked. It answers "did the edit move the behaviour" in seconds and
   NEVER "does the family fire": it is an iteration aid for a change that
   moves the witness states (a defaults retune), never a pass of this table,
   and its last line says so. */
const WITNESS_ONLY = process.argv.includes('--witnesses-only');
/* `--rows=<regex>` (S4c) runs the table over the rows whose LABEL matches —
   an ITERATION aid for a family whose rows are a small slice of the table
   (a full pass is every row once per mutant, hours on one box). A run under
   it is a SUBSET of rows as well as of mutants and its last line says so: it
   can say a family fires on these rows, never that it is silent elsewhere. */
const ROWS_ARG = (process.argv.find((a) => a.startsWith('--rows=')) || '').slice('--rows='.length);
const RUN_ROWS = ROWS_ARG ? ROWS.filter((r) => new RegExp(ROWS_ARG).test(r.label)) : ROWS;
if (ROWS_ARG) {
  if (!RUN_ROWS.length) { await browser.close(); server.close(); console.log(`--rows=${ROWS_ARG} matches no row`); process.exit(1); }
  console.log(`ROW SUBSET: ${RUN_ROWS.length} of ${ROWS.length} rows (--rows=${ROWS_ARG}) — not a pass of this table`);
}
/* A ROW MAY BE SCOPED TO THE MUTANTS IT EXISTS FOR, AND A MUTANT TO ITS ROWS
   (F1.1a, found by CI): a sweep is every mutant over every row, and on the
   weekly shards that product sat at 134-139 min of a 150-min cap BEFORE the
   tier work. Four tier rows on 76 (+5 %) and five mutants on 173 (+3 %) took
   five of six shards over it. So a row may carry `for: /regex on mutant id/`
   and a mutant `rows: /regex on row label/`; the CLEAN CONTROL still runs
   EVERY row (a family firing on the clean tree is reported whatever scoped
   it), and a mutant runs over the rows it names AND the rows that name it.
   What a scoped mutant gives up is COLLATERAL: it cannot report a family it
   also reddens on a row it did not run, which this table never required. A
   scope that leaves a mutant no row at all is a defect and is refused. */
function rowsFor(mu, rows) {
  const out = rows.filter((r) => (!mu.rows || mu.rows.test(r.label)) && (!r.for || r.for.test(mu.id)));
  if (!out.length) throw new Error(`${mu.id}: its row scope leaves it no row to run on`);
  return out;
}
let fail = false;
if (!WITNESS_ONLY) {
  console.log('CONTROL (unmutated tree): the family must be SILENT on every row');
  const clean = await famsOn(RUN_ROWS);
  console.log(`  fired: ${clean.size ? [...clean].sort().join(', ') : '(none)'}\n`);
  fail = clean.size > 0;
}

/* `--neuter=<id>` makes ONE edit APPLY while changing nothing: the source
   differs, so the match count is satisfied, and only the witness can see that
   the behaviour did not move. A positive control on the witness clause. */
const NEUTER = (process.argv.find((a) => a.startsWith('--neuter=')) || '').split('=')[1] || null;
/* THE CONTROL IS JUDGED ON THE NEUTERED MUTANT'S OWN WITNESS, and it combines
   with `--only` (the gate-coverage session, D14 — found by CI on the control's
   first run). Two defects in the first version: it swept the WHOLE table for
   one neutered edit (four hours, under a 30-minute job), and it read the run's
   `fail` flag — so any OTHER failing mutant satisfied it, which is a subject
   that includes the thing it exists to doubt (the fifth durable rule). It runs
   the neutered mutant alone now (`--only=<id> --neuter=<id>`), and passes only
   if THAT mutant's witness reported. */
if (NEUTER && !MUTANTS.some((m) => m.id === NEUTER)) { await browser.close(); server.close(); console.log(`--neuter names no such mutant: ${NEUTER}`); process.exit(1); }
if (NEUTER && SELECTED && !SELECTED.includes(NEUTER)) { await browser.close(); server.close(); console.log(`--neuter=${NEUTER} is not in the --only subset, so it would never run`); process.exit(1); }
let neuterReported = false;
REGISTRY_DEFAULTS = (await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href)).DEFAULTS;
const CLEAN = await mutatedModule('__clean', SRC);
const REACHED = [];
for (const [index, mu] of MUTANTS.entries()) {
  if (SELECTED && !SELECTED.includes(mu.id)) continue;
  REACHED.push({ index, id: mu.id });
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
    if (NEUTER === mu.id) neuterReported = true;
    fail = true; SERVE = SRC; continue;
  }
  if (WITNESS_ONLY) { console.log(`  ${mu.id}: witness moved`); SERVE = SRC; continue; }
  const got = await famsOn(rowsFor(mu, RUN_ROWS));
  const want = mu.names;
  const missed = want.filter((f) => !got.has(f));
  console.log(`  ${mu.id}: ${mu.why}`);
  console.log(`      names ${want.join(', ')} · fired ${got.size ? [...got].sort().join(', ') : '(NOTHING)'}` + (missed.length ? `   *** SILENT: ${missed.join(', ')}` : '   ok'));
  if (missed.length) fail = true;
  SERVE = SRC;
}
await browser.close(); server.close();
/* THE CENSUS is written whatever this shard's verdict — its red is its own
   exit status; the census says only which mutants it REACHED, and is written
   only by a run that got here (a crash or a timeout leaves none). */
{
  const CENSUS = (process.argv.find((a) => a.startsWith('--census=')) || '').split('=')[1];
  if (CENSUS) {
    const sm = /^(\d+)\/(\d+)$/.exec(SHARD_ARG || '');
    if (!sm) { console.log('--census needs --shard=k/n'); process.exit(1); }
    const ids = MUTANTS.map((m) => m.id);
    fs.mkdirSync(path.dirname(path.resolve(CENSUS)), { recursive: true });
    fs.writeFileSync(CENSUS, JSON.stringify({ version: CENSUS_VERSION, shard: { k: +sm[1], n: +sm[2] }, table: { count: ids.length, hash: tableHash(ids) },
      rows: ROWS_ARG || null, witnessesOnly: WITNESS_ONLY, neuter: NEUTER, reached: REACHED, complete: true }));
    console.log(`census: ${REACHED.length} mutant(s) reached, written to ${CENSUS}`);
  }
}
if (WITNESS_ONLY) {
  console.log(fail ? '\nWITNESSES ONLY: FAILED — a selected mutant did not move its behaviour' : '\nWITNESSES ONLY: every selected mutant moved its behaviour. NO FAMILY WAS ASKED — this is not a pass of the mutant table.');
  process.exit(fail ? 1 : 0);
}
if (NEUTER) {
  console.log(neuterReported ? `\nguard check: the sweep REPORTED the neutered mutant "${NEUTER}" — its witness clause fires.`
                             : `\nguard check: FAIL — "${NEUTER}" was neutered and its witness stayed silent${fail ? ' (something ELSE in the run failed, which is not this control)' : ''}.`);
  process.exit(neuterReported ? 0 : 1);
}
if (ROWS_ARG) console.log(`\nROW SUBSET: these results are over ${RUN_ROWS.length} of ${ROWS.length} rows only — a family silent here may fire on a row not run.`);
if (SELECTED) {
  console.log(fail ? `\nAPEX MUTANT TABLE (SUBSET of ${SELECTED.length}/${MUTANTS.length}): FAILED`
                   : `\nAPEX MUTANT TABLE (SUBSET of ${SELECTED.length}/${MUTANTS.length}): each selected family fires on a mutation that names it, and is silent on the clean tree. THIS IS NOT A SWEEP — ${MUTANTS.length - SELECTED.length} mutants were not run.`);
  process.exit(fail ? 1 : 0);
}
console.log(fail ? '\nAPEX MUTANT TABLE: FAILED' : '\nAPEX MUTANT TABLE: every family fires on a mutation that names it, and is silent on the clean tree');
process.exit(fail ? 1 : 0);
