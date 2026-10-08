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
import { serveRepo, launchPage, openBloom, applyConfig, stillFrame, thicknessAssertions, lobeAssertions, stemAssertions, leafAssertions, sepalAssertions, inflorescenceAssertions, varianceAssertions, apexNibAssertions } from './bloom-harness.mjs';

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
function formFacts(M, over = {}) {
  try {
    const st = { ...REGISTRY_DEFAULTS, varianceForm: 1, varianceFrequency: 1, variancePhase: 0, ...over };
    const acc = new M.MeshBuilder({ exportMode: true });
    const b = M.buildBloomInto(acc, st);
    const petals = b.petalsAll.map((p) => ({ index: p.slotIndex, term: p.formTerm ?? null, curl: p.applied.petalSpineCurl, cup: p.applied.petalCup, twist: p.applied.petalTwist }));
    return { petals, record: b.formVariance ?? null, absent: M.varianceFormIsAbsent(st), baseCurl: Number(st.petalSpineCurl) };
  } catch (e) { return { threw: e.message }; }
}
const formPair = (M, C, over = {}) => [formFacts(M, over), formFacts(C, over)];
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
    find: "    { name: 'CORE', from: stalk ? stalk.until : 0, to: 1, at: (u) => halfW * tipLaw(u) },",
    into: "    { name: 'CORE', from: stalk ? stalk.until : 0, to: 1, at: (u) => halfW * tipLaw(u) },\n    { name: 'MUTANT_PLATEAU', from: 0, to: 1, at: (u) => 0.6 * halfW * clamp((u - uPkRaw) / (1 - uPkRaw), 0, 1) },",
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
    find: '  const ps = slot.formTerm ? petalStateForSlot(state, ring, slot.formTerm, formClamped, formScaled) : petalStateFor(state, ring);',
    into: '  const ps = petalStateFor(state, ring);', names: ['FV2'],
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
    why: "the room is measured from the role table's composition BEFORE it is clamped: a curl-180 + innerCurl-360 inner petal composes to 540, so its room ABOVE reads -180 and every petal whose wave points up is pushed DOWN — the field's sign flipped on exactly the whorls a role row has already pushed past the range. FV2 restates the room from the CLAMPED composition, which this mutation does not touch",
    find: "      const at = clamp(from, b.min, b.max);",
    into: "      const at = from;", names: ['FV2'],
    witness: (M, C) => {
      const over = { layerCount: 3, petalSpineCurl: 180, innerCurl: 360, varianceForm: 1 };
      const [m, c] = formPair(M, C, over);
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
    find: '    const fromU = hi;\n    return { fromU, fraction: 1 - fromU, mm: (1 - fromU) * Lmm, terminalMm: 2 * TIP_HALF_MM, ofWidth: (2 * TIP_HALF_MM) / widthMm };',
    into: '    const fromU = prof.uPk;\n    return { fromU, fraction: 1 - fromU, mm: (1 - fromU) * Lmm, terminalMm: 2 * TIP_HALF_MM, ofWidth: (2 * TIP_HALF_MM) / widthMm };', names: ['LF9'],
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
  { id: 'the-leaf-type-is-ignored', why: 'the plan never lays out a compound tree, so a COMPOUND ask builds a simple blade while the Leaflets drop-down shows — eleven controls reaching nothing',
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
  { id: 'the-rods-are-typed', why: "every rachis and stalk is a typed 0.6 mm radius whatever the sheet — the lab's own constant, invisible at the shipped sheet where the wire is the same double",
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
  { id: 'the-petiole-steps-down-flat', why: 'the cone is collapsed onto the rachis base — the thick petiole meets the wire on a flat shoulder facing back along the rod',
    find: '  const petiole = { askedMm, capMm, radiusMm, clamped: askedMm > capMm, thickens, coneMm: thickens ? radiusMm - wireR : 0 };',
    into: '  const petiole = { askedMm, capMm, radiusMm, clamped: askedMm > capMm, thickens, coneMm: 0 };', names: ['LF17'],
    witness: (M, C) => { const m = compoundFacts(M, CPD_WIT), c = compoundFacts(C, CPD_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const gap = (r) => { const a = r.axisRod.centres; return Math.hypot(a[1][0] - a[2][0], a[1][1] - a[2][1], a[1][2] - a[2][2]); };
      return (gap(m.rep) < 1e-12 && gap(c.rep) > 0.1) ? null
        : `the mutant's cone ring stands ${gap(m.rep)} mm short of the rachis base against the clean tree's ${gap(c.rep)} — the behaviour did not move`; } },
  { id: 'the-rachis-thickens-with-the-petiole', why: "the rachis is the area rule read DOWN from the thicker petiole — tapering from 2.68 mm to the wire, where Eva ruled the rachis stays at the floor",
    find: '    intervals.push({ fromMm: keys[j], toMm: keys[j + 1], carried, radiusMm: compoundRodRadiusMm(wireR) });',
    into: '    intervals.push({ fromMm: keys[j], toMm: keys[j + 1], carried, radiusMm: Math.max(wireR, radiusMm * Math.sqrt(carried / N)) });', names: ['LF17'],
    witness: (M, C) => { const m = compoundFacts(M, CPD_WIT), c = compoundFacts(C, CPD_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      const r0 = (x) => x.plan.compound.rachis.intervals[0].radiusMm;
      return (r0(m) > r0(c) + 0.1) ? null
        : `the mutant's first rachis interval is ${r0(m)} mm against the clean tree's ${r0(c)} — the behaviour did not move`; } },
  { id: 'the-rod-exemption-is-widened', why: "every rod is reported to ST9 and the combination gate at twice its emitted radius — an exemption region wider than the rod it names",
    find: "    rodAxes.push({ inner: ringMid(axisRings[k]), outer: ringMid(axisRings[k + 1]), radiusMm: Math.max(radii[k], radii[k + 1]), part: k < iBase ? 'petiole' : 'rachis' });",
    into: "    rodAxes.push({ inner: ringMid(axisRings[k]), outer: ringMid(axisRings[k + 1]), radiusMm: 2 * Math.max(radii[k], radii[k + 1]), part: k < iBase ? 'petiole' : 'rachis' });", names: ['LF18'],
    witness: (M, C) => { const m = compoundFacts(M, CPD_WIT), c = compoundFacts(C, CPD_WIT);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (Math.abs(m.rep.rodAxes[0].radiusMm - 2 * c.rep.rodAxes[0].radiusMm) < 1e-12) ? null
        : `the mutant names its petiole at ${m.rep.rodAxes[0].radiusMm} mm against the clean tree's ${c.rep.rodAxes[0].radiusMm} — the behaviour did not move`; } },
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
    find: '  const bs = sepalBladeState(state, limit.angleBuiltDeg);',
    into: '  const bs = sepalBladeState(state, limit.askedDeg);', names: ['SP8'],
    witness: (M, C) => { const m = sepalFacts(M), c = sepalFacts(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.tilt === 60 && c.tilt < 60) ? null : `the mutant built its sepals at ${m.tilt} against the clean tree's ${c.tilt} (60 asked) — the clamp did not go`; } },
  { id: 'sepal-reads-the-petals-controls', why: "the sepal blade is built from the PETAL's shape, form and curl controls while the sepal's own twins are read by nothing — hidden-and-not-inert on twenty controls at once",
    find: '  for (const [petalId, sepalId] of SEPAL_TWINS) s[petalId] = Number(state[sepalId]);',
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
    find: '    const count = Math.min(asked, ceiling);\n    const scale = Number(state.sepalScale)',
    into: '    const count = asked;\n    const scale = Number(state.sepalScale)', names: ['SP2'],
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
  { id: 'sepal-foot-floor-removed', why: 'the sepal foot is whatever breadth asks with no print floor — 0.96 mm across at breadth 0.25, under the 1.60 mm foot floor every petal ring is held to',
    find: '    const footMm = clamp(footAskedMm, FOOT_MIN_WIDTH_MM, FOOT_MAX_WIDTH_MM);',
    into: '    const footMm = footAskedMm;', names: ['SP3'],
    witness: (M, C) => { const m = sepalFacts(M, { sepalFootBreadth: 0.25 }), c = sepalFacts(C, { sepalFootBreadth: 0.25 });
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.footH < 0.6 && c.footH >= 0.79) ? null : `the mutant's foot half-width is ${m.footH} against the clean tree's ${c.footH} at breadth 0.25 — the floor still binds`; } },
  { id: 'sepals-built-under-sphere', why: 'the geometry builds a sepal whorl on a closed SPHERE while the registry hides every sepal control there — hidden and NOT inert, and the whorl sits on the equator of a head that has no underside',
    find: 'export function sepalsEligible(state) { return !sphereMode(state); }',
    into: 'export function sepalsEligible(state) { return true; }', names: ['SP0', 'SP9'],
    witness: (M, C) => { const m = sepalFacts(M, { placement: 'CONTINUOUS', hubShape: 'SPHERE', sepalCount: 8 }), c = sepalFacts(C, { placement: 'CONTINUOUS', hubShape: 'SPHERE', sepalCount: 8 });
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (m.count === 8 && c.count === 0) ? null : `the mutant built ${m.count} sepals on a sphere against the clean tree's ${c.count} — the refusal still holds`; } },

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
    find: "  if (!(lam(uPk) > TIP_HALF_MM + APEX_FLOOR_EPS)) return { ...inert, why: 'the blade never clears the print floor' };",
    into: "  if (true) return { ...inert, why: 'the blade never clears the print floor' };", names: ['AN0'],
    witness: (M, C) => { const m = nibPlan(M), c = nibPlan(C);
      if (m.threw || c.threw) return `the witness threw: ${m.threw || c.threw}`;
      return (!m.active && c.active && m.terminal > c.terminal) ? null
        : `the mutant's plan is ${m.active ? 'ACTIVE' : 'inert'} ending on ${m.terminal} mm against the clean tree's ${c.active ? 'ACTIVE' : 'inert'} ${c.terminal} — the nib still closes the blade`; } },
  { id: 'the-squared-terminal-no-longer-stands-the-nib-down', why: 'the nib is cut even where a squared terminal holds the outline above the print floor, so petalTipEnd stops deciding how wide the petal ends — the guard’s other arm, and #229’s fringe terminal with it',
    find: "  if (lam(1) > TIP_HALF_MM + APEX_FLOOR_EPS) return { ...inert, why: 'a squared terminal holds the outline above the floor' };",
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
  /* THE ATTACHMENT (the second-round ruling): a whorl on the hub's FLARE — the
     deepest GOBLET, so the foot sits 19.4 mm down it and a limit drawn at the
     rim is a different number from one drawn at the foot. 90 asked so the
     clamp binds. */
  { label: "a sepal whorl on the hub's flare (5 on a 60 x 6 stem, GOBLET at MAX amount x MAX length, 90 asked)",
    set: [{ id: 'sepalCount', value: '5' }, { id: 'stemLength', value: '60' }, { id: 'hubStyle', value: 'GOBLET' }, { id: 'hubShapeAmount', value: '2' }, { id: 'hubLength', value: '40' }, { id: 'sepalAngle', value: '90' }] },
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
    /* THE APEX NIB (the apex-nib session) — the rule once more, and note the
       code is `AN\d+` and NOT `A\d+`: the A family's own capture above is
       anchored on a digit immediately after the letter, so `AN0:` matches
       neither pattern by accident. That is the prefix hazard this file
       already records, avoided by construction rather than by luck. */
    for (const msg of await apexNibAssertions(page, row)) {
      const mm = /^(AN\d+):/.exec(msg); if (mm) seen.add(mm[1]);
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
   table BY INDEX — `MUTANTS[i]` for `i % n === k`, the export gate's own
   `shardOf` rule — so a weekly CI sweep can run the whole table across n
   parallel jobs at ~3 min a mutant (measured 182 s for one on this box: 79
   mutants is four hours in one job, 60 minutes in four). A shard reports as a
   SUBSET, never as a sweep; the anchor pre-check above runs over ALL of them
   in every shard, so a disarmed mutant is named whichever shard skips it. */
const SHARD_ARG = (process.argv.find((a) => a.startsWith('--shard=')) || '').split('=')[1];
if (SHARD_ARG) {
  const m = /^(\d+)\/(\d+)$/.exec(SHARD_ARG);
  if (!m || +m[2] < 1 || +m[1] >= +m[2]) { await browser.close(); server.close(); console.log(`--shard wants k/n with 0 <= k < n, got "${SHARD_ARG}"`); process.exit(1); }
  if (SELECTED) { await browser.close(); server.close(); console.log('--shard and --only do not combine'); process.exit(1); }
  SELECTED = MUTANTS.filter((mu, i) => i % +m[2] === +m[1]).map((mu) => mu.id);
  console.log(`SHARD ${m[1]}/${m[2]}: ${SELECTED.length} of ${MUTANTS.length} mutants (by table index)`);
}
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
    if (NEUTER === mu.id) neuterReported = true;
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
  console.log(neuterReported ? `\nguard check: the sweep REPORTED the neutered mutant "${NEUTER}" — its witness clause fires.`
                             : `\nguard check: FAIL — "${NEUTER}" was neutered and its witness stayed silent${fail ? ' (something ELSE in the run failed, which is not this control)' : ''}.`);
  process.exit(neuterReported ? 0 : 1);
}
if (SELECTED) {
  console.log(fail ? `\nAPEX MUTANT TABLE (SUBSET of ${SELECTED.length}/${MUTANTS.length}): FAILED`
                   : `\nAPEX MUTANT TABLE (SUBSET of ${SELECTED.length}/${MUTANTS.length}): each selected family fires on a mutation that names it, and is silent on the clean tree. THIS IS NOT A SWEEP — ${MUTANTS.length - SELECTED.length} mutants were not run.`);
  process.exit(fail ? 1 : 0);
}
console.log(fail ? '\nAPEX MUTANT TABLE: FAILED' : '\nAPEX MUTANT TABLE: every family fires on a mutation that names it, and is silent on the clean tree');
process.exit(fail ? 1 : 0);
