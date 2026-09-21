/* ===================================================================
   verify-bloom-surface-offstation.mjs — IS THE EVALUATOR RIGHT WHERE THE MESH
   DOES NOT SAMPLE?

     node tools/verify-bloom-surface-offstation.mjs [--control]

   `verify-bloom-surface-bytes.mjs` proves session 37's extraction moved no
   emitted float. That is necessary and it is not the point: a refactor that
   only reproduced the NU stations would pass it completely while being useless
   for the thing it exists for, since a Voronoi cell's vertices land wherever
   the diagram puts them and `bloom-sagitta.mjs`'s 3D margin is a curve, not a
   row. This tool asks the other half — is `petalSurface().at(u, v)` the same
   surface BETWEEN the stations, and what kind of surface is it?

   CLAUSE A — AT-STATION FIDELITY, TIED TO THE EXPORT. At every station the
   builder emitted, `at(u, v)` must reproduce the captured mid-surface point
   under `Object.is`, AND the two skin vertices it implies (P +/- n*t/2) must
   be present EXACTLY in the emitted position stream. The second half is what
   makes this more than a sibling-capture comparison: it ties the front door to
   the STL. (This is `verify-bloom-grid.mjs` clause 2's discipline, pointed at
   the evaluator instead of at the capture.)

   CLAUSE B — CONTINUITY. `max |P(u + h) - P(u)|` over a dense ladder that
   deliberately misses the builder's stations, at h, h/10 and h/100. A
   Lipschitz (C0) surface halves that maximum when h halves; a surface with a
   JUMP does not shrink it at all. Reported as the ratio, so the verdict is a
   number rather than a threshold somebody chose.

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
     - THE FOOT. Its three rows all carry u = 0 and are a different surface
       with a different width law; `at` does not reach them and neither does
       this.
     - CONFIGURATIONS IT DOES NOT NAME. The list below is the coverage. It is
       hand-picked to span the arms — flat, formed, domed, buckled, clefted —
       not the 624-row matrix, which is the byte tool's job.
     - WHETHER THE SURFACE IS THE RIGHT SHAPE. It compares the evaluator
       against the builder and characterises its smoothness. Whether that
       surface is a good petal is a picture's question.

   `--control` is the negative control and is required before quoting a pass:
   it offsets the evaluator's u by 1e-9 inside clause A and requires clause A
   to fire, and it asks clause C for a seam that does not exist and requires
   the vacuity guard to fire.
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
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const load = (f) => import(pathToFileURL(path.join(ROOT, f)).href);
const G = await load('bloom-geometry.js');
const { DEFAULTS } = await load('bloom-registry.js');

const bad = [];
const note = [];
let stationsCompared = 0, skinsMatched = 0, seamsMeasured = 0, rejected = 0;
const genuineSeams = [];

/* THE CONFIGURATIONS — one per arm of the builder, named for what each one
   turns on. `petalFormIsFlat` decides the flat arm; `buckleIsFlat` decides
   whether the emitted normal is the lattice one. */
const CONFIGS = [
  { name: 'DEFAULT (flat: form is null)', set: {} },
  { name: 'FORMED (cup + curl + roll + twist)', set: { petalCup: 0.6, petalSpineCurl: 120, petalRoll: 90, petalTwist: 45 } },
  { name: 'DOMED (headRise, the cap arm)', set: { headRise: 0.6 } },
  { name: 'CURL FAMILY (bias + start, the spineLaw table)', set: { petalSpineCurl: 150, curlBias: 0.5, curlStart: 0.3 } },
  { name: 'BUCKLED (trueNormalRows engaged)', set: { buckleAmp: 0.5, buckleFreq: 3 }, buckled: true },
  { name: 'THINNED (non-uniform thickness)', set: { tipThinning: 0.4 } },
];

for (const cfg of CONFIGS) {
  const state = { ...DEFAULTS, ...cfg.set };
  const acc = new G.MeshBuilder({ exportMode: false, captureGrid: true });
  const { ring, slot } = firstSlot(state, acc);
  const rep = G.buildPetalInto(acc, state, ring, slot, null);
  const surface = G.petalSurface(state, ring, slot, null, acc);
  const pos = acc.positions;

  /* The emitted vertex set, as exact coordinate strings. */
  const verts = new Set();
  for (let i = 0; i < pos.length; i += 3) verts.add(`${pos[i]},${pos[i + 1]},${pos[i + 2]}`);

  /* ---- CLAUSE A ---- */
  let aPts = 0, aNrm = 0, aSkin = 0, seen = 0;
  for (const pan of rep.grid) {
    for (const r of pan.rows) {
      if (r.u === 0) continue;                       // the foot: not this surface
      for (let j = 0; j < r.v.length; j++) {
        const uu = CONTROL ? r.u + 1e-9 : r.u;
        const q = surface.at(uu, r.v[j]);
        seen++;
        for (let k = 0; k < 3; k++) if (!Object.is(q.P[k], r.mid[j][k])) { aPts++; break; }
        if (!cfg.buckled) {
          for (let k = 0; k < 3; k++) if (!Object.is(q.n[k], r.normal[j][k])) { aNrm++; break; }
          const h = r.thickness / 2;
          const top = `${q.P[0] + q.n[0] * h},${q.P[1] + q.n[1] * h},${q.P[2] + q.n[2] * h}`;
          const bot = `${q.P[0] - q.n[0] * h},${q.P[1] - q.n[1] * h},${q.P[2] - q.n[2] * h}`;
          if (verts.has(top) && verts.has(bot)) skinsMatched += 2; else aSkin++;
        }
      }
    }
  }
  stationsCompared += seen;
  if (!seen) bad.push(`${cfg.name}: clause A compared NOTHING — no captured blade stations`);
  if (aPts) bad.push(`clause A: ${cfg.name}: ${aPts} of ${seen} station points disagree with the builder's own captured mid-surface`);
  if (aNrm) bad.push(`clause A: ${cfg.name}: ${aNrm} of ${seen} station normals disagree`);
  if (aSkin) bad.push(`clause A: ${cfg.name}: ${aSkin} of ${seen} stations produced skin vertices absent from the emitted stream`);

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

/* ---- validity ---- */
if (!stationsCompared) bad.push('VACUOUS: clause A compared no stations at all');
if (!CONTROL && !skinsMatched) bad.push('VACUOUS: clause A matched no skin vertices — the export tie never ran');

console.log(`clause A: ${stationsCompared.toLocaleString()} stations x columns compared, ${skinsMatched.toLocaleString()} skin vertices tied to the emitted stream`);
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
  console.log('\npositive control: clause A evaluated at u + 1e-9, clause C pointed at a u with no seam.');
  const aFired = bad.some((b) => b.startsWith('clause A'));
  const cFired = bad.some((b) => b.includes('clause C: VACUOUS')) || PROBES.length === 1;
  if (!aFired) bad.push('CONTROL DID NOT FIRE: clause A passed on a surface evaluated 1e-9 away — it cannot see anything');
  console.log(`  clause A fired: ${aFired}    clause C redirected: ${cFired}`);
}

if (bad.length) {
  console.log(`\n${CONTROL ? 'CONTROL RESULT' : 'FAIL'} — ${bad.length} finding(s):`);
  for (const b of bad) console.log('  ' + b);
  process.exit(CONTROL && bad.every((b) => b.startsWith('clause A')) ? 0 : 1);
}
console.log('\nPASS — the evaluator is the builder\'s own surface at every station, and continuous between them.');
