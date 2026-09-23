/* ===================================================================
   verify-bloom-surface-offstation.mjs — IS THE EVALUATOR RIGHT WHERE THE MESH
   DOES NOT SAMPLE?

     node tools/verify-bloom-surface-offstation.mjs [--control] [--base <tree>]

   `verify-bloom-surface-bytes.mjs` proves session 37's extraction moved no
   emitted float. That is necessary and it is not the point: a refactor that
   only reproduced the NU stations would pass it completely while being useless
   for the thing it exists for, since a Voronoi cell's vertices land wherever
   the diagram puts them and `bloom-sagitta.mjs`'s 3D margin is a curve, not a
   row. This tool asks the other half — is `petalSurface().at(u, v)` the same
   surface BETWEEN the stations, and what kind of surface is it?

   CLAUSE A — AT-STATION FIDELITY, TIED TO THE EXPORT. Four sub-clauses, and
   the reason there are four is that the ONE statement that used to carry this
   stopped being true when the edge profile landed.

     WHAT IT USED TO SAY, AND WHY IT IS GONE. At every station it reconstructed
     the two skin vertices as `at(u, v).P +/- n * thickness / 2` and required
     BOTH among the emitted positions. That rested on a premise the bead broke:
     `emitPanel` offset the two skins from the row's own mid point at the row's
     own body thickness, so the reconstruction WAS the emitted vertex by
     construction. It no longer is — the skin columns are INSET and their half
     thickness EASES per column toward `RIM_FLOOR_MM / 2`, so an emitted skin
     vertex is neither at the original span's column nor at a per-row constant
     offset. Measured on this tree, the old expression finds 0 of 3,360 station
     pairs across the six original configurations; on a worktree of `main` it
     finds 3,360 of 3,360 — and on the two multi-panel configurations added
     here it still finds 88 of 1,860, which are the BURIED ends A4 keeps.
     The clause was asserting the OLD SAMPLING, which is
     `verify-bloom-grid.mjs` clause 3's own recorded lesson when the turning
     ladder landed, and clause 2's when the bead did: PIN THE FILE TO THE
     BUILDER, never to a formula that used to hold.

     A1  THE MID SURFACE AND THE NORMAL ARE THE BUILDER'S OWN. Unchanged, and
         it never stopped holding: at every captured station `at(u, v)` must
         reproduce the builder's captured mid point under `Object.is`, and its
         normal too where no buckle is engaged. The mid surface did NOT move
         when the bead landed — the apex is placed ON it — so this half of the
         old clause is kept verbatim rather than re-derived. Reference owner:
         `emitPanel`'s grid capture. Measured 0 of 5,220 disagreeing, over
         eight configurations.
     A2  THE SILHOUETTE TIE TO THE EMITTED STREAM. This is what replaces the
         skin reconstruction, and it is the clause that keeps this tool tied to
         the STL rather than to a sibling capture. At every PERIMETER station
         `at(u, v).P` must be present EXACTLY in `acc.positions`, because the
         bead's apex IS the original boundary mid point pushed onto the profile
         as itself. The perimeter is the loop `emitPanel` walks — column 0 and
         column NV-1 of every row, every column of the panel's FIRST row, and
         every column of its LAST — restated here rather than imported, so the
         reference cannot mutate with the thing under test. Reference owner:
         the emitted position stream. Measured 1,124 of 1,124 over the
         eight configurations.
         IT CANNOT BE VACUOUS AND THAT IS MEASURED, NOT REASONED: `--base`
         runs the same tie against another tree, and on a worktree of `main`
         the shipping default scores 0 of 120 — nothing sits on the mid surface
         there at all, because the flat wall runs top to bottom with no vertex
         between. The premise did not soften, it INVERTED.
     A3  THE VERTEX IS NAMED, NOT MERELY PRESENT. A2 alone is a membership
         test: a point that happened to coincide with some other emitted vertex
         would satisfy it. So under `{ captureRim: true }` the builder's own
         `rim.apex` record must hold an entry at that exact (panel, row,
         column) whose `apex` is `Object.is`-equal to `at(u, v).P` — the same
         array the mesh received. And the record must ACCOUNT FOR THE WHOLE
         PERIMETER: `rim.apex.length + rim.flat.length` must equal the loop
         length the capture implies, so a tree whose treatment collapsed could
         not shrink A2's subject to the handful of points it still reached.
         Reference owner: `emitPanel`'s rim record. Measured 1,124 named, and
         1,316 of 1,316 loop vertices accounted for.
     A4  THE BURIED ENDS STILL RECONSTRUCT — the old expression, verbatim, kept
         exactly where it is still true rather than deleted. Where the ramp is
         exactly zero the skin samples the original span at the body's own half
         thickness and `mid +/- n * t / 2` is the emitted vertex again. WHICH
         points those are is read off the BUILDER (a perimeter vertex the rim
         record did not treat), never off a rule about row positions. The two
         populations are disjoint by construction and both are non-empty: 80
         buried perimeter points — 50 on the fringe's four teeth and its base
         panel's covered tip, 30 on the cleft's two lobe panels — against
         1,124 treated. Suppressed on a buckled
         build, where the emitted normal is the lattice one and the evaluator
         returns the cross-section normal by design (clause D).

   CLAUSE B — CONTINUITY. `max |P(u + h) - P(u)|` over a dense ladder that
   deliberately misses the builder's stations, at h, h/10 and h/100. A
   Lipschitz (C0) surface halves that maximum when h halves; a surface with a
   JUMP does not shrink it at all. Reported as the ratio, so the verdict is a
   number rather than a threshold somebody chose. IT READS NO MESH AT ALL, so
   an offset change cannot reach it — CONFIRMED rather than assumed: all
   thirty-six figures of the six original configurations are identical to
   thirteen significant digits against a worktree of `main`.

   CLAUSE C — THE C0 SEAMS. `widthProfile().halfWidthAt` is a `Math.max` of
   shape terms against two floors, so it is C0 with slope breaks at the
   crossovers, and the evaluator reads it. At each seam this measures the
   one-sided dP/du from the left and the right and reports the ANGLE between
   them and their magnitude ratio. Two one-sided derivatives that disagree mean
   the surface is continuous and its tangent is not — C0 but not C1. This is a
   MEASUREMENT AND A RECORD, never a gate: the break is a property of the
   shipped outline law, not of the extraction, and it was there before the
   evaluator existed. What would be a defect is nobody knowing.

   CLAUSE D — THE BUCKLED NORMAL, reported not asserted. On a buckled build the
   EMITTED normal is `trueNormalRows`' cross of dP/dv against a difference over
   the NEIGHBOURING ROWS — a lattice quantity, a function of where the ladder
   put the rows. The evaluator returns the CROSS-SECTION normal. They are
   different quantities on purpose (see petalSurface's header), so clause A
   compares normals only where no buckle is engaged and this clause measures
   the gap where one is, so the number is on the record rather than a surprise.

   WHAT IT IS BLIND TO, in its own header:
     - THE INTERIOR'S TIE TO THE MESH, AND THIS IS THE COVERAGE THE BEAD COST.
       The old clause claimed an emitted vertex for every station; A2 claims
       one only on the PERIMETER. On the shipping default that is 120 of a
       petal's 560 blade stations — 112 margins plus the exposed tip row's 8
       interior columns — and the other 440 are tied to the CAPTURE by A1 and
       to nothing emitted. No identity replaces it: the emitted skin vertex at
       an interior column is `rowAt(u).sect(v')` at an INSET `v'` offset by a
       per-column eased half thickness, and reconstructing it here would mean
       restating the taper law inside the gate — a second producer of exactly
       the thing under test, which is the defect this project keeps finding.
       Said plainly: THE NEW CLAUSE IS STRICTLY STRONGER WHERE IT APPLIES (a
       named vertex rather than a membership test, plus a coverage count) AND
       IT APPLIES TO FEWER POINTS. What is left covering the interior is
       `verify-bloom-grid.mjs` clause 2c, which rebuilds each captured row
       through `petalSurface` — and that clause's own header already declares
       it shares an owner with the surface, so it CANNOT vouch for the
       evaluator. A1 is what covers the interior here, and its reference is the
       capture, which is a different owner from `at` and which clause 1 of that
       gate proves moves no byte. That is the honest extent of it.
     - THE FOOT. Its three rows all carry u = 0 and are a different surface
       with a different width law; `at` does not reach them and neither does
       this. They are the bulk of `rim.flat` and A4 skips them for that reason.
     - CONFIGURATIONS IT DOES NOT NAME. The list below is the coverage. It is
       hand-picked to span the arms — flat, formed, domed, buckled, thinned,
       fringed, clefted — not the 624-row matrix, which is the byte tool's job.
       The fringe and the cleft are here because a BURIED end is a branch of
       the treatment and the six original configurations have none: every one
       of them is a single panel with an exposed tip.
     - WHETHER THE SURFACE IS THE RIGHT SHAPE. It compares the evaluator
       against the builder and characterises its smoothness. Whether that
       surface is a good petal is a picture's question.

   `--control` is the negative control and is required before quoting a pass.
   Three legs, each naming the sub-clause it must redden, because a clause that
   has not been seen to fail is a log line:
     1  the evaluator's u is offset by 1e-9 — A1, A2 and A3's NAMING half must
        all fire, since 1e-9 of u moves the apex off both the emitted stream
        and the array the builder recorded.
     2  the build is made WITHOUT `captureRim`, which is what a tree whose
        treatment recorded nothing looks like from here — A3's COVERAGE half
        must fire and A2's subject must be seen to collapse to nothing, while
        A1 must NOT move, since it does not read the record. That last one is
        asserted rather than assumed: a leg that also moved A1 would not be
        isolating A3.
     3  clause C is asked for a seam that does not exist and the vacuity guard
        must fire.
     4  a build is made from the MIS-SPELLED cleft capability (`{ cleft: true }`
        where the spec is `{ cleft: { from, gap } }`), which fills the lobe
        panels' v values with NaN — A1's FINITE guard must fire. This leg is
        here because the hole was real: `Object.is(NaN, NaN)` is true, so every
        identity in clause A was silently satisfied over a build with no
        geometry in it, and the first CLEFT fixture this tool carried did
        exactly that and reported 0 of 600 disagreeing.
   `--base <tree>` is the non-vacuity witness and is not a control: it runs A2
   against another checkout and reports what it scores there.
   =================================================================== */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
/* ONE OWNER OF THE SLOT PAYLOAD — buildWhorlInto's own callback, never a
   synthesised `{ index, azimuth, ... }`; the helper lives in
   tools/bloom-first-slot.mjs so the rim-arc tool (session 38) reads the same
   lines rather than a copy. */
import { firstSlot } from './bloom-first-slot.mjs';

const argv = process.argv.slice(2);
const CONTROL = argv.includes('--control');
const BASE = argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : null;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const loadFrom = (tree, f) => import(pathToFileURL(path.join(tree, f)).href);
const load = (f) => loadFrom(ROOT, f);
const G = await load('bloom-geometry.js');
const { DEFAULTS } = await load('bloom-registry.js');

const bad = [];
const note = [];
let stationsCompared = 0, apexTied = 0, apexNamed = 0, loopAccounted = 0, buriedTied = 0;
let oldHit = 0, oldProbed = 0, seamsMeasured = 0, rejected = 0;
const genuineSeams = [];

/* Exact float identity as a string key. `String(v)` is the shortest
   representation that round-trips, so two keys are equal iff the doubles are —
   no tolerance, which is the point: A2 is an identity claim about a value that
   came out of the same expression, not a proximity claim. */
const key3 = (p) => `${p[0]},${p[1]},${p[2]}`;
const same3 = (a, b) => Object.is(a[0], b[0]) && Object.is(a[1], b[1]) && Object.is(a[2], b[2]);
/* `Object.is(NaN, NaN)` IS TRUE, so every identity clause in this file is
   silently satisfied by a NaN on both sides — and that is not hypothetical: it
   is how this tool's first CLEFT fixture behaved. A mis-spelled capability
   (`{ cleft: true }` where the spec is `{ cleft: { from, gap } }`) put NaN into
   forty of the lobe panels' captured v values, `at(u, NaN)` returned NaN, and
   A1 reported 0 of 600 disagreeing over a build that had no geometry at all.
   The subject had been defined so as to exclude the failure (the fifth durable
   rule), and no amount of strictness in the comparison could see it. So every
   value either side of every comparison is required to be FINITE, counted
   separately, and a single non-finite coordinate is a finding rather than a
   match. */
const finite3 = (p) => Number.isFinite(p[0]) && Number.isFinite(p[1]) && Number.isFinite(p[2]);

/* THE CONFIGURATIONS — one per arm of the builder, named for what each one
   turns on. `petalFormIsFlat` decides the flat arm; `buckleIsFlat` decides
   whether the emitted normal is the lattice one. The last two are here for the
   EDGE PROFILE's own branch: every other row is one panel with an exposed tip,
   so without them A4's buried-end population is empty and the six original
   configurations could not tell a treatment that never ramps to zero from one
   that does. */
const CONFIGS = [
  { name: 'DEFAULT (flat: form is null)', set: {} },
  { name: 'FORMED (cup + curl + roll + twist)', set: { petalCup: 0.6, petalSpineCurl: 120, petalRoll: 90, petalTwist: 45 } },
  { name: 'DOMED (headRise, the cap arm)', set: { headRise: 0.6 } },
  { name: 'CURL FAMILY (bias + start, the spineLaw table)', set: { petalSpineCurl: 150, curlBias: 0.5, curlStart: 0.3 } },
  { name: 'BUCKLED (trueNormalRows engaged)', set: { buckleAmp: 0.5, buckleFreq: 3 }, buckled: true },
  { name: 'THINNED (non-uniform thickness)', set: { tipThinning: 0.4 } },
  { name: 'FRINGED (five panels, one BURIED tip)', set: { petalTipEnd: 1, fringeCount: 4, fringeDepth: 0.3 } },
  /* THE CAPABILITY SPEC IS RESTATED, NOT IMPORTED, and the reason is a module
     load: `tools/bloom-harness.mjs`'s CAPABILITY_CLEFT is the one owner, but
     that file imports `playwright-core` at module scope and this tool is
     deliberately browser-free (it rides nowhere near a page). The restatement
     is a FIXTURE rather than a reference value — nothing here is compared
     against it — and the finite guard above is what makes a wrong one loud
     instead of vacuous, which is exactly how the first one was caught. */
  { name: 'CLEFT (the capability hook: three panels)', set: {}, cap: { cleft: { from: 0.55, gap: 0.35 } } },
];

/* THE PERIMETER LOOP, RESTATED RATHER THAN IMPORTED. This is `emitPanel`'s own
   walk — the inner end cap, the +v margin, the tip, the -v margin — written
   out here so A2's subject has a different owner from the treatment it is
   checking. Importing the builder's loop would make a collapsed treatment
   shrink the subject and the question with it (the fifth durable rule: state
   the subject as a SET, then ask whether the failure is in it). A3's coverage
   count is what pins this restatement to the builder's own total. */
function perimeterOf(pan) {
  const NV = pan.rows[0].v.length, out = [];
  for (let j = 0; j < NV; j++) out.push([pan.rowFrom, j]);
  for (let i = pan.rowFrom + 1; i <= pan.rowTo; i++) out.push([i, NV - 1]);
  for (let j = NV - 2; j >= 0; j--) out.push([pan.rowTo, j]);
  for (let i = pan.rowTo - 1; i > pan.rowFrom; i--) out.push([i, 0]);
  return out;
}

/* ONE BUILD, USED BY THE MAIN LOOP, BY THE CONTROL'S SECOND LEG AND BY
   `--base`. `captureRim` is a parameter because withholding it is exactly what
   a tree that recorded nothing looks like from here, and that is control leg 2. */
async function buildOne(mod, defaults, cfg, { rim = true, exportMode = false } = {}) {
  const state = { ...defaults, ...cfg.set };
  const acc = new mod.MeshBuilder({ exportMode, captureGrid: true, captureRim: rim });
  const fs = cfg.firstSlot || firstSlot;
  const { ring, slot } = fs(state, acc);
  const rep = mod.buildPetalInto(acc, state, ring, slot, cfg.cap || null);
  const surface = mod.petalSurface(state, ring, slot, cfg.cap || null, acc);
  const verts = new Set();
  for (let i = 0; i < acc.positions.length; i += 3) verts.add(`${acc.positions[i]},${acc.positions[i + 1]},${acc.positions[i + 2]}`);
  return { state, acc, rep, surface, verts };
}

/* A2 / A3 / A4 OVER ONE BUILD. Returns counts and the first offender of each
   kind; the caller decides which are findings, so the control can ask for the
   same walk and read which sub-clause moved. `uOff` is control leg 1. */
function tieOf({ rep, surface, verts }, { uOff = 0, buckled = false } = {}) {
  const o = { tied: 0, apexMissing: 0, apexUnnamed: 0, buried: 0, buriedMissing: 0, nonFinite: 0,
    loop: 0, perim: 0, perimEmitted: 0, first: null, firstNamed: null, firstBuried: null, firstNaN: null,
    oldHit: 0, oldProbed: 0 };
  const rimBy = new Map();
  for (const e of (rep.rim ? rep.rim.apex : [])) rimBy.set(`${e.panel}|${e.row}|${e.col}`, e);
  for (const pan of rep.grid) {
    const byRow = new Map(pan.rows.map((r) => [r.row, r]));
    o.loop += 2 * pan.rows[0].v.length + 2 * (pan.rowTo - pan.rowFrom) - 2;
    for (const [i, j] of perimeterOf(pan)) {
      const r = byRow.get(i);
      if (!r || r.u === 0) continue;                       // the foot: not this surface
      const q = surface.at(r.u + uOff, r.v[j]);
      const where = `${pan.label} row ${i} col ${j} u=${r.u}`;
      /* THE RAW PERIMETER MEMBERSHIP, counted over the restated loop and
         independent of the rim record entirely — this is the number `--base`
         quotes, and it is what makes A2's subject owner-independent of the
         treatment it is checking. */
      o.perim++;
      if (!finite3(q.P) || !finite3(q.n)) { o.nonFinite++; if (!o.firstNaN) o.firstNaN = `${where}: at(u,v) is not finite (${q.P.join(', ')})`; continue; }
      if (verts.has(key3(q.P))) o.perimEmitted++;
      const e = rimBy.get(`${pan.label}|${i}|${j}`);
      if (e) {
        o.tied++;
        if (!verts.has(key3(q.P))) { o.apexMissing++; if (!o.first) o.first = `${where}: at(u,v) is not an emitted vertex`; }
        if (!finite3(e.apex) || !same3(q.P, e.apex)) { o.apexUnnamed++; if (!o.firstNamed) o.firstNamed = `${where}: at(u,v) is not the apex the builder recorded there`; }
      } else if (!buckled) {
        /* A4: the builder did not treat this perimeter vertex, so the ramp is
           exactly zero here and the flat wall's own skin points are still
           `mid +/- n * t / 2`. Which points those are is the BUILDER's answer,
           not a rule about row indices. */
        o.buried++;
        const h = r.thickness / 2;
        const t = key3([q.P[0] + q.n[0] * h, q.P[1] + q.n[1] * h, q.P[2] + q.n[2] * h]);
        const b = key3([q.P[0] - q.n[0] * h, q.P[1] - q.n[1] * h, q.P[2] - q.n[2] * h]);
        if (!(verts.has(t) && verts.has(b))) { o.buriedMissing++; if (!o.firstBuried) o.firstBuried = `${where}: a BURIED end's flat-wall skin points are not emitted`; }
      }
    }
  }
  /* THE OLD WHOLE-PETAL EXPRESSION, run over every station and REPORTED. It is
     the evidence that the offset law really moved rather than the clause being
     renamed: it scored 3,360 of 3,360 on main and scores 0 here. */
  if (!buckled) {
    for (const pan of rep.grid) for (const r of pan.rows) {
      if (r.u === 0) continue;
      for (let j = 0; j < r.v.length; j++) {
        const q = surface.at(r.u, r.v[j]), h = r.thickness / 2;
        o.oldProbed++;
        if (verts.has(key3([q.P[0] + q.n[0] * h, q.P[1] + q.n[1] * h, q.P[2] + q.n[2] * h]))
          && verts.has(key3([q.P[0] - q.n[0] * h, q.P[1] - q.n[1] * h, q.P[2] - q.n[2] * h]))) o.oldHit++;
      }
    }
  }
  return o;
}

for (const cfg of CONFIGS) {
  const built = await buildOne(G, DEFAULTS, cfg);
  const { rep, surface } = built;

  /* ---- CLAUSE A1: the mid surface and the normal are the builder's own ---- */
  let aPts = 0, aNrm = 0, aNaN = 0, seen = 0, aFirstNaN = null;
  for (const pan of rep.grid) {
    for (const r of pan.rows) {
      if (r.u === 0) continue;                       // the foot: not this surface
      for (let j = 0; j < r.v.length; j++) {
        const q = surface.at(CONTROL ? r.u + 1e-9 : r.u, r.v[j]);
        seen++;
        if (!finite3(q.P) || !finite3(q.n) || !finite3(r.mid[j]) || !finite3(r.normal[j]) || !Number.isFinite(r.v[j])) {
          aNaN++; if (!aFirstNaN) aFirstNaN = `${pan.label} row ${r.row} col ${j} v=${r.v[j]}`; continue;
        }
        if (!same3(q.P, r.mid[j])) aPts++;
        if (!cfg.buckled && !same3(q.n, r.normal[j])) aNrm++;
      }
    }
  }
  stationsCompared += seen;
  if (!seen) bad.push(`${cfg.name}: clause A1 compared NOTHING — no captured blade stations`);
  if (aPts) bad.push(`clause A1: ${cfg.name}: ${aPts} of ${seen} station points disagree with the builder's own captured mid-surface`);
  if (aNrm) bad.push(`clause A1: ${cfg.name}: ${aNrm} of ${seen} station normals disagree`);
  if (aNaN) bad.push(`clause A1: ${cfg.name}: ${aNaN} of ${seen} stations carry a NON-FINITE coordinate on one side or the other — Object.is would have called those a match (first: ${aFirstNaN})`);

  /* ---- CLAUSE A2 / A3 / A4 ---- */
  const t = tieOf(built, { uOff: CONTROL ? 1e-9 : 0, buckled: cfg.buckled });
  apexTied += t.tied; apexNamed += t.tied - t.apexUnnamed; buriedTied += t.buried;
  loopAccounted += t.loop; oldHit += t.oldHit; oldProbed += t.oldProbed;
  const recorded = rep.rim ? rep.rim.apex.length + rep.rim.flat.length : 0;
  if (t.apexMissing) bad.push(`clause A2: ${cfg.name}: ${t.apexMissing} of ${t.tied} perimeter points are not emitted vertices (first: ${t.first})`);
  if (!t.tied) bad.push(`clause A2: ${cfg.name}: the perimeter walk found NOTHING to tie`);
  if (t.apexUnnamed) bad.push(`clause A3: ${cfg.name}: ${t.apexUnnamed} of ${t.tied} perimeter points are not the apex the builder recorded at that (panel, row, column) (first: ${t.firstNamed})`);
  if (recorded !== t.loop) bad.push(`clause A3: ${cfg.name}: the rim record accounts for ${recorded} perimeter vertices, the capture implies ${t.loop} — the subject A2 walks is not the whole loop`);
  if (t.buriedMissing) bad.push(`clause A4: ${cfg.name}: ${t.buriedMissing} of ${t.buried} BURIED-end points no longer reconstruct as mid +/- n*t/2 (first: ${t.firstBuried})`);
  if (t.nonFinite) bad.push(`clause A2: ${cfg.name}: ${t.nonFinite} of ${t.perim} perimeter stations evaluate to a NON-FINITE point (first: ${t.firstNaN})`);
  note.push(`  ${cfg.name}\n      A1 ${seen} stations   A2/A3 ${t.tied} apexes tied and named   A4 ${t.buried} buried ends`
    + `   loop ${recorded}/${t.loop}   the OLD expression: ${t.oldHit} of ${t.oldProbed}`);

  /* ---- CLAUSE B ---- */
  const V = [-1, -0.5, 0, 0.37, 1];
  const step = (h) => {
    let mP = 0, mN = 0;
    for (let u = 0.02; u < 0.98; u += 0.0037) {          // deliberately off the ladder
      for (const v of V) {
        const a = surface.at(u, v), b = surface.at(u + h, v);
        mP = Math.max(mP, Math.hypot(a.P[0] - b.P[0], a.P[1] - b.P[1], a.P[2] - b.P[2]));
        mN = Math.max(mN, Math.hypot(a.n[0] - b.n[0], a.n[1] - b.n[1], a.n[2] - b.n[2]));
      }
    }
    return { mP, mN };
  };
  const s1 = step(1e-3), s2 = step(1e-4), s3 = step(1e-5);
  const rP = [s1.mP / s2.mP, s2.mP / s3.mP];
  note.push(`  ${cfg.name}\n      |dP| over h: ${s1.mP.toExponential(3)} / ${s2.mP.toExponential(3)} / ${s3.mP.toExponential(3)} mm   ratios ${rP[0].toFixed(1)}x ${rP[1].toFixed(1)}x`
    + `\n      |dn| over h: ${s1.mN.toExponential(3)} / ${s2.mN.toExponential(3)} / ${s3.mN.toExponential(3)}`);
  /* A JUMP would not shrink. Anything above 4x per decade is Lipschitz-like;
     the bar is loose on purpose because the verdict wanted here is
     "continuous / discontinuous", not a constant. */
  for (const [i, r] of rP.entries()) if (!(r > 4)) bad.push(`clause B: ${cfg.name}: |dP| shrank only ${r.toFixed(2)}x for a 10x smaller step (decade ${i + 1}) — that is a DISCONTINUITY, not a C0 surface`);

  /* ---- CLAUSE D ---- */
  if (cfg.buckled) {
    let maxDeg = 0;
    for (const pan of rep.grid) for (const r of pan.rows) {
      if (r.u === 0) continue;
      for (let j = 0; j < r.v.length; j++) {
        const q = surface.at(r.u, r.v[j]), e = r.normal[j];
        const d = Math.min(1, Math.max(-1, q.n[0] * e[0] + q.n[1] * e[1] + q.n[2] * e[2]));
        maxDeg = Math.max(maxDeg, Math.acos(d) * 180 / Math.PI);
      }
    }
    note.push(`  ${cfg.name}\n      cross-section normal against the EMITTED (lattice) normal: max ${maxDeg.toFixed(2)} deg  — reported, not asserted`);
  }
}
/* ---- CLAUSE C: the seams ---- */
const seamState = { ...DEFAULTS };
const seamAcc = new G.MeshBuilder({ exportMode: false });
const { ring: sRing, slot: sSlot } = firstSlot(seamState, seamAcc);
const sSurf = G.petalSurface(seamState, sRing, sSlot, null, seamAcc);
const prof = G.widthProfile(G.petalStateFor(seamState, sRing), sRing, (seamState.petalWidth * sSlot.scale) / 2, null, seamAcc);

/* FIND the seams rather than assert them, and LOCATE each one rather than
   sampling for it. A slope break at u* only shows as "the one-sided
   derivatives at u disagree" when u IS u*, which no ladder hits; what a ladder
   sees is consecutive CENTRAL differences jumping. So: scan for the bracket,
   then bisect inside it by asking which side's slope the midpoint's forward
   difference resembles. WHICH u is a seam is a property of the shipped outline
   law and it has already moved once — u = 0.800 was a seam on the pre-session-32
   cap law and is not one now — so this reports what it finds rather than
   checking a remembered number. */
const hw = (u) => prof.halfWidthAt(u);
const dCen = (u) => { const e = 1e-6; return (hw(u + e) - hw(u - e)) / (2 * e); };
const dFwd = (u) => { const e = 1e-9; return (hw(u + e) - hw(u)) / e; };
const dBwd = (u) => { const e = 1e-9; return (hw(u) - hw(u - e)) / e; };
const N = 4000, JUMP = 1;
const seams = [];
for (let i = 2; i < N - 1; i++) {
  let a = i / N, b = (i + 1) / N;
  if (!(Math.abs(dCen(b) - dCen(a)) > JUMP)) continue;
  const dL = dFwd(a), dR = dBwd(b);
  for (let k = 0; k < 60; k++) {
    const m = (a + b) / 2, dm = dFwd(m);
    if (Math.abs(dm - dR) < Math.abs(dm - dL)) b = m; else a = m;
  }
  const u = (a + b) / 2;
  if (!seams.some((x) => Math.abs(x - u) < 1e-6)) seams.push(u);
}

/* Eva named u = 0.058 and u = 0.800 from the discovery session's numbers,
   which were taken on the pre-session-32 tree. Both are probed BY NAME
   whether or not they are still seams, so the record answers the question
   that was asked rather than only the one the detector found. */
const NAMED = [0.058, 0.800];
const PROBES = CONTROL ? [{ u: 0.42, why: 'control: a u with no seam' }]
  : [...seams.map((u) => ({ u, why: 'located by the detector' })),
     ...NAMED.filter((u) => !seams.some((s2) => Math.abs(s2 - u) < 2e-3)).map((u) => ({ u, why: 'named in the brief; NOT a seam on this tree' }))];
for (const { u: u0, why } of PROBES) {
  const v = 0.6, e = 1e-6;
  const P = (u) => sSurf.at(u, v).P;
  const d = (a2, b2, hh) => [(b2[0] - a2[0]) / hh, (b2[1] - a2[1]) / hh, (b2[2] - a2[2]) / hh];
  const L = d(P(u0 - e), P(u0), e), Rr = d(P(u0), P(u0 + e), e);
  const nl = Math.hypot(...L), nr = Math.hypot(...Rr);
  const dot = Math.min(1, Math.max(-1, (L[0] * Rr[0] + L[1] * Rr[1] + L[2] * Rr[2]) / (nl * nr)));
  const deg = Math.acos(dot) * 180 / Math.PI;
  const jump = Math.hypot(P(u0 + e)[0] - P(u0 - e)[0], P(u0 + e)[1] - P(u0 - e)[1], P(u0 + e)[2] - P(u0 - e)[2]);
  const genuine = deg > 0.5 || Math.abs(nr / nl - 1) > 0.02;
  seamsMeasured++;
  if (genuine) genuineSeams.push(u0); else rejected++;
  if (!genuine && why === 'located by the detector') continue;   // a smooth steep stretch, not a seam
  note.push(`  u = ${u0.toFixed(6)}  (${why})`
    + `\n      one-sided |dP/du|: ${nl.toFixed(4)} left / ${nr.toFixed(4)} right mm per unit u`
    + `\n      tangents differ by ${deg.toFixed(3)} deg, magnitude ratio ${(nr / nl).toFixed(4)}`
    + `\n      |P(u+e) - P(u-e)| = ${jump.toExponential(3)} mm at e = 1e-6  ->  the POINT is continuous`
    + `\n      verdict: ${deg > 0.5 || Math.abs(nr / nl - 1) > 0.02 ? 'C0 ONLY — the tangent breaks here' : 'C1 here — the tangents agree'}`);
}
if (!seamsMeasured) bad.push('clause C: VACUOUS — no seam was probed');
if (!CONTROL && !seams.length) bad.push('clause C: VACUOUS — halfWidthAt reported no slope break at all, which contradicts its Math.max construction; the detector is broken');
if (!CONTROL && !genuineSeams.length) bad.push('clause C: VACUOUS — every candidate classified as smooth, so the C0 claim rests on nothing measured');


/* ---- THE NON-VACUITY WITNESS: the same tie, on another checkout ----
   A2 claims the bead's apex IS the mid-surface point. The strongest evidence
   that this is a property of the tree rather than of the clause is that it is
   FALSE somewhere: on a worktree of the pre-bead `main` the flat wall runs
   from the top skin to the bottom with no vertex between, so not one of the
   default petal's perimeter mid points is emitted. Optional because it needs a
   second checkout; SKIPPED and said so when absent, never counted as a pass. */
let baseLine = `  --base was not given, so the tie was not measured anywhere it is FALSE.`;
if (BASE) {
  const tree = path.resolve(BASE);
  const Gb = await loadFrom(tree, 'bloom-geometry.js');
  const { DEFAULTS: Db } = await loadFrom(tree, 'bloom-registry.js');
  const b = await buildOne(Gb, Db, CONFIGS[0]);
  const t = tieOf(b, {});
  baseLine = `  ${tree}\n      perimeter mid points that are emitted vertices there: ${t.perimEmitted} of ${t.perim}`
    + `   (this tree: see clause A above)\n      the OLD whole-petal expression there: ${t.oldHit} of ${t.oldProbed}`;
  if (t.perim && t.perimEmitted === t.perim) bad.push(`--base: the apex tie holds on ${tree} too (${t.perimEmitted} of ${t.perim}) — it is not a witness for the treatment and A2 may be asserting something the bead did not introduce`);
  if (!t.perim) bad.push(`--base: ${tree} produced no perimeter stations — the witness measured nothing`);
}

/* ---- validity ---- */
if (!stationsCompared) bad.push('VACUOUS: clause A1 compared no stations at all');
if (!CONTROL && !apexTied) bad.push('VACUOUS: clause A2 tied no perimeter point to the emitted stream — the export tie never ran');
if (!CONTROL && !apexNamed) bad.push('VACUOUS: clause A3 named no vertex — the builder recorded no treated perimeter vertex, so A2 would be a membership test over an empty set');
if (!CONTROL && !buriedTied) bad.push('VACUOUS: clause A4 found no BURIED end — no configuration exercises the branch where the treatment ramps to nothing');

console.log(`clause A — the evaluator against the builder and against the emitted stream:`);
console.log(`  A1 ${stationsCompared.toLocaleString()} stations x columns against the captured mid-surface`);
console.log(`  A2 ${apexTied.toLocaleString()} perimeter points present EXACTLY in the emitted position stream as bead apexes`);
console.log(`  A3 ${apexNamed.toLocaleString()} of those named by the builder's own rim record; ${loopAccounted.toLocaleString()} perimeter vertices accounted for`);
console.log(`  A4 ${buriedTied.toLocaleString()} BURIED-end points still reconstructing as mid +/- n*t/2 (the old expression, where it still holds)`);
console.log(`  the OLD whole-petal expression, reported: ${oldHit.toLocaleString()} of ${oldProbed.toLocaleString()} stations`);
console.log(note.filter((n) => n.includes('A1 ')).join('\n'));
console.log(`\nclause A — the non-vacuity witness:`);
console.log(baseLine);
console.log(`\nclause B — continuity (a C0 surface shrinks |dP| by ~10x per decade; a jump does not):`);
console.log(note.filter((n) => n.includes('|dP|')).join('\n'));
const dn = note.filter((n) => n.includes('lattice'));
if (dn.length) { console.log(`\nclause D — the buckled normal:`); console.log(dn.join('\n')); }
console.log(`\nclause C — the outline's C0 seams, measured on the shipping default:`);
console.log(note.filter((n) => n.includes('one-sided')).join('\n'));
console.log(`\nGENUINE C0 seams (tangent breaks): ${genuineSeams.length ? genuineSeams.map((u) => u.toFixed(6)).join(', ') : 'none'}`);
console.log(`bracket candidates rejected as SMOOTH-BUT-STEEP: ${rejected} of ${seamsMeasured} probed.`);
console.log('  The bracket test flags a jump in the CENTRAL difference, which a steep smooth');
console.log('  taper also produces; only the one-sided tangents can tell the two apart, so the');
console.log('  candidate list is never the answer and is not reported as one.');

if (CONTROL) {
  /* LEG 2: the rim record withheld. What a tree whose treatment recorded
     nothing looks like from here — A3's COVERAGE half is the clause that has
     to refuse it, and A2's vacuity guard goes with it because the subject it
     names has collapsed. A1 must NOT move: it does not read the record. */
  const withheld = await buildOne(G, DEFAULTS, CONFIGS[0], { rim: false });
  const t2 = tieOf(withheld, {});
  const rec2 = withheld.rep.rim ? withheld.rep.rim.apex.length + withheld.rep.rim.flat.length : 0;
  const leg2Coverage = rec2 !== t2.loop;
  const leg2Subject = t2.tied === 0;
  let a1Moved = 0;
  for (const pan of withheld.rep.grid) for (const r of pan.rows) {
    if (r.u === 0) continue;
    for (let j = 0; j < r.v.length; j++) if (!same3(withheld.surface.at(r.u, r.v[j]).P, r.mid[j])) a1Moved++;
  }

  /* LEG 4: the NaN fixture, kept because the guard it exercises was written
     after a real one. `{ cleft: true }` is the mis-spelled capability spec that
     put NaN into the lobe panels' v values; every identity here is satisfied by
     NaN on both sides, so without the finite guard the whole of clause A goes
     green over a build with no geometry in it. */
  let nanSeen = 0, nanStations = 0;
  {
    const nb = await buildOne(G, DEFAULTS, { name: 'nan', set: {}, cap: { cleft: true } });
    for (const pan of nb.rep.grid) for (const r of pan.rows) {
      if (r.u === 0) continue;
      for (let j = 0; j < r.v.length; j++) {
        nanStations++;
        const q = nb.surface.at(r.u, r.v[j]);
        if (!finite3(q.P) || !finite3(q.n) || !finite3(r.mid[j]) || !Number.isFinite(r.v[j])) nanSeen++;
        else if (!same3(q.P, r.mid[j])) nanSeen++;      // a real disagreement would also do
      }
    }
  }

  console.log('\npositive control — four legs, each naming the sub-clause it must redden:');
  const a1 = bad.some((b) => b.startsWith('clause A1'));
  const a2 = bad.some((b) => b.startsWith('clause A2'));
  const a3 = bad.some((b) => b.startsWith('clause A3'));
  const cFired = PROBES.length === 1;
  console.log(`  1  the evaluator's u offset by 1e-9   -> A1 fired: ${a1}   A2 fired: ${a2}   A3 (naming) fired: ${a3}`);
  console.log(`  2  the rim record withheld            -> A3 (coverage) fired: ${leg2Coverage} (${rec2} accounted for against ${t2.loop})   A2's subject collapsed: ${leg2Subject}   A1 unmoved: ${a1Moved === 0}`);
  console.log(`  3  clause C pointed at a u with no seam -> redirected: ${cFired}`);
  console.log(`  4  a NaN fixture (the mis-spelled cleft spec) -> A1's finite guard fired on ${nanSeen} of ${nanStations} stations; without it Object.is would have called every one a match`);
  if (!a1) bad.push('CONTROL LEG 1 DID NOT FIRE: clause A1 passed on a surface evaluated 1e-9 away — it cannot see anything');
  if (!a2) bad.push('CONTROL LEG 1 DID NOT FIRE: clause A2 passed on a surface evaluated 1e-9 away — the emitted tie cannot see anything');
  if (!a3) bad.push('CONTROL LEG 1 DID NOT FIRE: clause A3 accepted an apex 1e-9 away as the one the builder recorded');
  if (!leg2Coverage) bad.push('CONTROL LEG 2 DID NOT FIRE: clause A3 accepted a rim record that accounts for none of the perimeter — a collapsed treatment would shrink A2\'s subject in silence');
  if (!leg2Subject) bad.push('CONTROL LEG 2 DID NOT FIRE: A2 still found points to tie with the record withheld, so its subject is not the record\'s');
  if (a1Moved !== 0) bad.push(`CONTROL LEG 2 IS NOT CLEAN: withholding the rim record moved clause A1 on ${a1Moved} stations, so leg 2 is not isolating A3`);
  if (!cFired) bad.push('CONTROL LEG 3 DID NOT FIRE: clause C was not redirected off the seams');
  if (!nanSeen) bad.push('CONTROL LEG 4 DID NOT FIRE: clause A1 accepted a build whose captured v values are NaN — Object.is(NaN, NaN) is true and the finite guard is not doing its job');
}

if (bad.length) {
  const expected = (b) => /^clause A[1234]:/.test(b) || b.startsWith('VACUOUS: clause A');
  console.log(`\n${CONTROL ? 'CONTROL RESULT' : 'FAIL'} — ${bad.length} finding(s):`);
  for (const b of bad) console.log('  ' + b);
  process.exit(CONTROL && bad.every(expected) ? 0 : 1);
}
console.log('\nPASS — the evaluator is the builder\'s own surface at every station, its silhouette is on the mesh, and it is continuous between them.');
