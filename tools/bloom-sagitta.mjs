/* ===================================================================
   bloom-sagitta.mjs — THE OUTLINE SAGITTA, per row pair, in millimetres.

   WHAT IT MEASURES. Between two consecutive blade rows the mesh draws a
   STRAIGHT CHORD along the margin; the law draws a curve. The sagitta is the
   largest distance between the two over that interval, in mm, in the blade's
   own (s, h) plane where `s = u * petalLength` — the expression buildPetalInto's
   row loop itself uses. It exists because the row COUNT is fixed (NU, and
   `CURL_START_MIN = 1 / NU` is imported by the registry as a control bound, so
   raising it moves an unrelated curl slider's floor) and the row POSITIONS are
   what a later session may move.

   ZERO BYTES. It reads and emits nothing: no triangle, no vertex, no state.

   ------------------------------------------------------------------
   *** THE WORST CASE TODAY IS 0.6325 mm AND IT IS NOT THE BOUND THE
       REDISTRIBUTION AIMS AT. ***

   Measured over 562 live matrix rows x both modes (1,124 profiles, 0 skipped):
   worst 0.6325 mm at u = 0.049, with 88.2% of profiles worst at the BASE and
   NONE at the apex. That is the ROOT BLEND collapsing the width over six rows
   (`ROOT_BLEND_END` = 0.30) on wide petals. It is `footRing()`'s boundary, it is
   SCHEDULED AS ITS OWN SESSION (Eva, session 32) and it is explicitly NOT this
   instrument's target. The apex bound is set AFTER the law lands, from the
   post-law distribution. Read 0.6325 as "the number to beat" and you have read
   the base's problem as the apex's.

   *** AND TODAY'S APEX 0.0000 mm IS VACUOUS, NOT CLEAN. ***

   Above `uCap` the shipped profile is a straight lerp, and a straight line has
   no chord error against its own chords. The apex figure only becomes
   meaningful once the superellipse curves that region.

   ------------------------------------------------------------------
   FOUR DEFECTS FOUND IN THIS INSTRUMENT'S OWN DRAFT, recorded because both
   produce a plausible number rather than a failure:

   1. ZONE BY INTERVAL, NEVER BY SAMPLE. Classifying each sampled point by its
      own `u` lets the kink at `uCap` leak into the APEX bucket: measured
      0.0980 mm of "apex" sagitta on the widest petal (width 30, length 60), in
      a region that is a straight lerp and must read exactly 0.0000. An interval
      that straddles a boundary belongs to the zone it STARTS in, and the kink
      is then reported where it lives.

   2. "EXACTLY ZERO" IS NOT REACHABLE AND MUST NOT BE ASSERTED. The distance is
      a CROSS PRODUCT of differences, so IEEE-754 leaves a residue of order
      `eps * L * h` — 2.2e-16 mm on a straight fixture. The first draft of the
      negative control asserted `=== 0` and failed on its own CLEAN run. What is
      asserted instead is a floor derived from the arithmetic, and above all the
      SEPARATION: the clean reading is >= 1e9x the mutant's, so no tolerance has
      to be believed.

   3. THE MODE IS READ, NEVER ASSUMED. `petalProfile` is whatever build is SHOWN.
      The first draft assumed EXPORT because the gate had just written an STL;
      the tie-back caught it — every row matched EXACTLY to u = 0.786 and then
      diverged through the cap (0.150 emitted against 0.800 rebuilt: the live
      mesh floor against the print floor). A mode mismatch is INVISIBLE below the
      cap and TOTAL inside it, which is the shape of error a tie-back exists for.

   4. THE STATIONS ARE THE BUILDER'S OR THERE IS NO MEASUREMENT. Reconstructing
      a station from an array index is off by however many FOOT rows precede the
      blade — the defect that made A5 silent on the mutation it exists for and
      made A6 fire on a clean tree (session 32). This reads `petalProfileU`, the
      builder's own per-row `u`, and REFUSES rather than reconstructing.

   ------------------------------------------------------------------
   WHAT IT IS BLIND TO, stated rather than discovered later: the 3D MARGIN.
   Spine curl, cup, roll and tilt all move the drawn edge in space and none of
   them is here. Reaching them needs the row construction callable at arbitrary
   `u` — a closure inside `buildPetalInto` — which is a geometry change this
   instrument deliberately does not make. The OUTLINE is what the row positions
   act on and what a face-on petal's silhouette is, so it is the right quantity
   first; it is not the whole quantity.

   THE KNOWN LIMIT, with its count. The rebuild models the row's DECLARED state;
   it does not model per-petal / slot-role overrides, where `petalStateFor` gives
   the last-built petal a different effective state and a different `slot.scale`.
   Those rows are a LOUD, LABELLED SKIP — measured 2 of 53 on the smoke subset
   (ORCHID: labellum + hood, and FAN x PER-PETAL), which are the same rows the
   plan raster and the solid-angle instrument already skip as split whorls. The
   skip is the honest outcome: the alternative is measuring a different petal
   than the one exported and printing a plausible number for it.

   VALIDITY. The true curve is rebuilt in Node from `widthProfile()` — the SAME
   owner the builder calls — and then TIED BACK: the rebuilt profile must
   reproduce the builder's own emitted half-widths at the builder's own emitted
   stations. A row where it does not is a LOUD, LABELLED SKIP, never a silent
   number, because a profile that does not match the exported petal is measuring
   a different flower.

   RUN IT STANDALONE:  node tools/bloom-sagitta.mjs --negative-control
   =================================================================== */
import { footRing, widthProfile, ROOT_BLEND_END, TIP_CAP_FRACTION, MeshBuilder } from '../bloom-geometry.js';
import { DEFAULTS, CONTROLS } from '../bloom-registry.js';
import { shownModeOf } from './bloom-harness.mjs';

const SAMPLES = 400;            // per interval; the max is taken over these
const TIE_TOL = 1e-9;           // the rebuilt profile must BE the builder's

export const SAGITTA_SCOPE =
  'SAGITTA SCOPE: the OUTLINE only — the half-width profile in the blade\'s own (s, h) plane, '
  + 'rebuilt from widthProfile() and TIED BACK to the builder\'s own emitted rows. BLIND to the 3D '
  + 'margin (spine curl, cup, roll, tilt), which needs a row closure inside buildPetalInto. The worst '
  + 'case is BASE-driven root-blend chord error, scheduled as its own session, NOT the redistribution\'s '
  + 'target; today\'s apex 0.0000 is VACUOUS (a straight lerp has no chord error against its own chords).';

/* ---------- the pure core, driven directly by the negative control ---------- */

/* The perpendicular distance from the curve to the CHORD SEGMENT the mesh
   draws between two stations. */
export function intervalSagitta(at, L, u0, u1, sampler = null) {
  const p0 = [u0 * L, at(u0)], p1 = [u1 * L, at(u1)];
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], len = Math.hypot(dx, dy);
  if (!(len > 0)) return { d: 0, u: u0 };
  let worst = 0, wu = u0;
  for (let k = 1; k < SAMPLES; k++) {
    const f = k / SAMPLES, t = u0 + (u1 - u0) * f;
    /* `sampler` exists ONLY for the negative control, which substitutes the
       chord's own linear interpolation here; the shipped path is `at(t)`. */
    const h = sampler ? sampler(p0[1], p1[1], f) : at(t);
    const d = Math.abs((t * L - p0[0]) * dy - (h - p0[1]) * dx) / len;
    if (d > worst) { worst = d; wu = t; }
  }
  return { d: worst, u: wu };
}

/* ZONE BY INTERVAL, NEVER BY SAMPLE — see defect 1 in the header. */
export const zoneOfInterval = (u0) =>
  (u0 < ROOT_BLEND_END ? 'base' : (u0 >= 1 - TIP_CAP_FRACTION ? 'apex' : 'middle'));

export function sagittaOf(at, L, stations, sampler = null) {
  const us = [0, ...stations];
  const per = [], zone = { base: -1, middle: -1, apex: -1 };
  let worst = { d: -1, u: 0, zone: 'base' };
  for (let i = 1; i < us.length; i++) {
    if (!(us[i] > us[i - 1])) continue;
    const s = intervalSagitta(at, L, us[i - 1], us[i], sampler);
    const z = zoneOfInterval(us[i - 1]);
    per.push({ u0: us[i - 1], u1: us[i], d: s.d, at: s.u, zone: z });
    if (s.d > worst.d) worst = { d: s.d, u: s.u, zone: z };
    if (s.d > zone[z]) zone[z] = s.d;
  }
  return { per, worst, zone, chords: per.length };
}

/* ---------- the state the builder used, rebuilt and then PROVEN ---------- */

export function stateFor(row) {
  const s = { ...DEFAULTS };
  for (const e of (row.set || [])) {
    const id = e.id ?? e[0], v = e.value ?? e[1];
    const c = CONTROLS.find((k) => k.id === id);
    s[id] = (c && (c.kind === 'range' || c.kind === 'number')) ? Number(v)
          : (typeof DEFAULTS[id] === 'number' ? Number(v) : v);
  }
  return s;
}

/* ---------- the gate's entry point ---------- */

export async function measure(page, row, opts = {}) {
  /* THE MODE IS READ FROM THE APP, NEVER ASSUMED. `petalProfile` is whatever
     build is SHOWN — live by default, export with the print-preview toggle on —
     and `shownMode()` in bloom.js is that question's one owner. The first draft
     passed `exportMode: true` because the gate had just exported an STL, and the
     tie-back caught it: rows matched EXACTLY to u = 0.786 and then diverged
     through the cap, 0.150 emitted against 0.800 rebuilt — TIP_CAP_HALF_MM
     against TIP_HALF_MM, the live floor against the print floor. A mode
     mismatch is invisible below the cap and total inside it. */
  const shown = await shownModeOf(page);
  if (shown === null) return { skipped: 'the app reports no shownMode — the mode this profile was built in cannot be established' };
  const exportMode = shown === 'export';
  const m = await page.evaluate(() => window.__bloomMetrics());
  const prof = m.petalProfile, us = m.petalProfileU;
  if (!Array.isArray(prof) || !Array.isArray(us) || prof.length !== us.length || prof.length < 3) {
    return { skipped: 'the builder emitted no per-row profile (petalProfile / petalProfileU)' };
  }
  const state = stateFor(row);
  const acc = new MeshBuilder({ exportMode });
  let ring, profile;
  try {
    ring = footRing(state, acc).rings[0];
    profile = widthProfile(state, ring, state.petalWidth / 2, null, acc);
  } catch (e) {
    return { skipped: `the profile could not be rebuilt for this row (${e.message.slice(0, 60)})` };
  }
  const at = (u) => profile.halfWidthAt(u);

  /* THE TIE-BACK. Blade rows only: the FOOT rows are emitted before any curve
     exists and are not widthProfile()'s to answer for. */
  let tie = 0, tied = 0;
  for (let i = 0; i < us.length; i++) {
    if (!(us[i] > 0)) continue;                       // foot rows carry u = 0
    tie = Math.max(tie, Math.abs(at(us[i]) - prof[i])); tied++;
  }
  if (tied < 3) return { skipped: 'fewer than three blade rows carried a station' };
  if (!(tie <= TIE_TOL)) {
    return { skipped: `the rebuilt profile is not the builder's (max ${tie.toExponential(2)} mm over ${tied} rows) — a role override or a state this reconstruction does not model` };
  }
  const stations = us.filter((u) => u > 0);
  const r = sagittaOf(at, state.petalLength, stations);
  return { ...r, tie, tied, mode: shown };
}

export function sagittaLine(r) {
  if (r.skipped) return `SAGITTA: SKIPPED — ${r.skipped}`;
  const f = (x) => (x < 0 ? '  --  ' : x.toFixed(4));
  return `SAGITTA: worst ${f(r.worst.d)} mm at u=${r.worst.u.toFixed(3)} (${r.worst.zone})`
    + ` | base ${f(r.zone.base)} middle ${f(r.zone.middle)} apex ${f(r.zone.apex)}`
    + ` | ${r.chords} chords from the builder's own stations (${r.mode}), tie-back ${r.tie.toExponential(1)} mm`
    + ` | the worst is BASE-driven root blend, NOT the redistribution's target`;
}

/* ===================================================================
   THE NEGATIVE CONTROL — `node tools/bloom-sagitta.mjs --negative-control`

   THE MUTATION: replace the intermediate sampler with a LINEAR INTERPOLATION of
   the interval's two endpoints. That IS the chord, so every distance collapses
   to exactly 0 and the instrument reports a perfectly-sampled mesh on geometry
   it never looked at.

   WHY IT NEEDS A CONTROL AT ALL: a sagitta of 0 is what a CORRECT instrument
   reports on a straight run — today's apex reads 0.0000 legitimately — so "all
   zeros" is indistinguishable from success unless something asserts otherwise.
   The separating assertion is therefore a POSITIVE one: on an outline that is
   known to be curved, the reading must be non-zero, and it must match a
   closed-form answer.

   THE WRITTEN-DOWN ANSWER: for a circular arc of radius R spanning a chord of
   length c, the sagitta is exactly R - sqrt(R^2 - (c/2)^2). A semicircle of
   radius R sampled at N equal steps in u is the fixture, because its answer
   does not depend on this file being right.
   =================================================================== */
export function negativeControl() {
  const out = [];
  const ok = (name, cond, detail) => { out.push({ name, pass: !!cond, detail }); return !!cond; };

  /* FIXTURE 1 — a semicircle, whose per-interval sagitta is closed form. */
  const R = 10, L = 2 * R, N = 8;
  const semi = (u) => Math.sqrt(Math.max(0, R * R - (u * L - R) ** 2));
  const st = Array.from({ length: N }, (_, i) => (i + 1) / N);
  const r = sagittaOf(semi, L, st);
  /* the middle interval spans the apex; its chord is L/N long and the closed
     form for the arc's own sagitta over that chord is exact */
  const c = L / N, closed = R - Math.sqrt(R * R - (c / 2) ** 2);
  const mid = r.per[Math.floor(N / 2)];
  ok('the curved fixture reads NON-ZERO', r.worst.d > 1e-6, `worst ${r.worst.d.toFixed(5)} mm`);
  ok('and it matches the closed form on the apex interval',
     Math.abs(mid.d - closed) < 5e-3, `measured ${mid.d.toFixed(5)} vs closed form ${closed.toFixed(5)} mm`);

  /* FIXTURE 2 — a straight line. NOT "exactly zero": the distance is a
     CROSS PRODUCT of differences, so IEEE-754 leaves a residue of order
     `eps * L * h` — measured 2.2e-16 mm here, and the first draft of this
     control asserted `=== 0` and failed on its own clean fixture. The honest
     statement is a floor DERIVED from the arithmetic rather than an epsilon
     picked to pass: `FLOAT_FLOOR` below is 1e-9 * L * h, which is a million
     times above the observed residue and a million times below the real
     signal, so it separates without being tuned to either. */
  const line = (u) => 3 - 2 * u;
  const rl = sagittaOf(line, L, st);
  const FLOAT_FLOOR = 1e-9 * L * 3;
  ok('a straight outline reads at the float residue, not a real number',
     rl.worst.d < FLOAT_FLOOR, `worst ${rl.worst.d.toExponential(2)} mm, floor ${FLOAT_FLOOR.toExponential(1)}`);

  /* THE MUTATION — the sampler becomes the chord itself. */
  const rm = sagittaOf(semi, L, st, (h0, h1, f) => h0 + (h1 - h0) * f);
  ok('MUTANT: the curved fixture collapses to the float residue',
     rm.worst.d < 1e-9 * L * R, `worst ${rm.worst.d.toExponential(2)} mm`);
  /* THE SEPARATION IS THE CLAIM, not either number alone: the clean reading is
     orders of magnitude above the mutant's, so no tolerance has to be believed. */
  ok('MUTANT: and the clean run is >= 1e9x larger',
     r.worst.d / Math.max(rm.worst.d, Number.MIN_VALUE) >= 1e9,
     `clean ${r.worst.d.toFixed(5)} mm vs mutant ${rm.worst.d.toExponential(2)} mm — ${(r.worst.d / Math.max(rm.worst.d, Number.MIN_VALUE)).toExponential(1)}x`);

  /* ZONE BY INTERVAL — defect 1. A boundary-straddling interval belongs to the
     zone it STARTS in, so a kink at uCap cannot be reported as apex sagitta. */
  const zs = zoneOfInterval(1 - TIP_CAP_FRACTION - 1e-9);
  ok('an interval starting below the cap is NOT apex', zs !== 'apex', `zone ${zs}`);
  ok('an interval starting at the cap IS apex', zoneOfInterval(1 - TIP_CAP_FRACTION) === 'apex');
  ok('an interval starting below the root blend end IS base',
     zoneOfInterval(ROOT_BLEND_END - 1e-9) === 'base');

  return out;
}

if (process.argv[1] && process.argv[1].endsWith('bloom-sagitta.mjs')) {
  if (process.argv.includes('--negative-control')) {
    const res = negativeControl();
    for (const c of res) console.log(`  ${c.pass ? 'ok  ' : 'FAIL'} ${c.name}${c.detail ? ' — ' + c.detail : ''}`);
    const bad = res.filter((c) => !c.pass).length;
    console.log(bad
      ? `\nNEGATIVE CONTROL FAILED — ${bad} of ${res.length}.`
      : `\nNEGATIVE CONTROL PASS — ${res.length} checks: the instrument matches a closed form on a curve, reads a straight line at the float residue, and the chord-sampler mutation collapses it by 1e9x or more.`);
    process.exit(bad ? 1 : 0);
  } else {
    console.log(SAGITTA_SCOPE);
    console.log('\nrun `node tools/bloom-sagitta.mjs --negative-control` to prove it can fail.');
  }
}
