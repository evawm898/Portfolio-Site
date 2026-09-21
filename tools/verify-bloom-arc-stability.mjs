/* ===================================================================
   verify-bloom-arc-stability.mjs — THE UNIFORM ARC IS STABLE AS ITS
   CURVATURE GOES TO ZERO, AND THE BLADE IS WHERE A CURL THAT SMALL CAN PUT
   IT (the arc-stability session).

     node tools/verify-bloom-arc-stability.mjs [--negative-control [--all]]

   WHY THIS EXISTS, AND WHY IT CANNOT BE A MATRIX ROW. `petalFormIsFlat`
   guards the flat branch on EXACT zeros, and the uniform spine arc was built
   from the closed form `(sin p1 - sin p0) / k`, which cancels as `k -> 0`. A
   per-slot variance field reaches that branch on every even-count whorl: at 8
   petals a wave `180 cos(theta)` hands the slots at 90 and 270 degrees
   `180 * cos(pi/2)` = 1.1e-14, not 0
   (docs/bloom-organic-variance-discovery.md §4). Eva ruled it fixed before any
   field lands (§9.6).

   NO SLIDER REACHES THE BAND, AND A MATRIX ROW THAT TRIED WOULD BE SILENTLY
   GREEN RATHER THAN REFUSED — measured on the real page rather than reasoned,
   because the obvious reasoning is wrong. `petalSpineCurl` is `step: 5` and a
   stepped range input SNAPS: setting 1e-14, 1e-9, 1e-6 or 1e-3 on
   `#petalSpineCurl` all read back 0. `applyConfig`'s slider read-back band is
   `|set - got| < 1e-9`, so a row asking for 1e-14 PASSES the read-back while
   the page holds curl 0 and builds the flat default — the harness measuring a
   design other than the one it names, which is the class that assertion
   exists to prevent. (1e-6 and 1e-3 ARE refused, so the band and the defect's
   own band overlap rather than nest.) So the witness calls the geometry
   DIRECTLY, and it is the only thing in this repository that can.

   WHAT WAS MEASURED ON THE UNFIXED TREE, whole default bloom, EXPORT and LIVE
   alike: at curl 1e-14 the blade is laid onto the hub plane — 14.79 mm of
   vertex displacement, tip height 0.000 against 14.792 — and the census reads
   8,806 within-shell pairs (11,027 at -1e-14). The arithmetic is wrong all the
   way up to curl ~1e-6: 1.8e-4 mm at 1e-9 and 2.0e-6 mm at 1e-7, neither of
   which any census can see. The discovery's table read "from 1e-9 up, clean"
   because the census was the instrument it had; the ladder below is the one
   that sees the whole branch.

   THE FIVE CLAUSES, and what owns each side of each comparison.

   AS0  THE DEFAULT NEVER REACHES THE ARC. The shipping configuration's own
        builder record must report `curlRad === 0` on every built petal, so
        the fix is inert there BY BRANCH rather than by tolerance. Reference:
        the shipped DEFAULTS. Under test: the builder's record.
   AS1  THE LADDER. Across curls from 1e-16 to 1e-3 and the negative side, the
        whole emitted stream must sit within a DERIVED bound of the FLAT
        build's. Reference owner: the `kC === 0` straight-line branch, which
        this fix does not touch and which is a different arm of the same
        ternary. Under test: the arc branch. THE BOUND IS GEOMETRY, NOT A
        TUNED NUMBER: bending a blade by a total turn of `curlRad` about a
        pivot inside the model cannot move any vertex further than
        `|curlRad| x (the model's own bounding diagonal)`, and the float floor
        is `ARC_ULPS` ulp of the largest coordinate. It is measured at ratio
        0.14 on every healthy value over ten decades and at 9.7 to 2.2e14 on
        every value the unfixed tree gets wrong — the two populations do not
        touch, so nothing here is fitted to the data in hand.
   AS2  THE CENSUS. At curl +/-1e-14 the within-shell self-intersection census
        must read exactly what the FLAT default reads. An integer, no
        tolerance. Reference owner: bloom-self-intersection.mjs over the flat
        build; under test: the arc branch. This is the clause the failure was
        first found by and the one a fold cannot hide from.
   AS3  THE TOPOLOGY. A curl that small may not move a triangle. Exact.
   AS4  THE GRADED WHORL — the shape the field will actually build. Eight
        petals, `curl = 180 cos(theta)`, which hands two slots 1.1e-14 and
        -1.1e-14 by construction rather than by this tool choosing them. The
        whorl's census must be 0, and EACH near-zero petal's tip must sit
        within the derived bound of THE SAME PETAL BUILT AT EXACTLY ZERO —
        per petal, so one slot landing right cannot cover for another.

   `--negative-control` RESTORES THE OLD CLOSED FORM in a copy of
   bloom-geometry.js, imports it, and requires EVERY clause to fire. The
   mutation is a single anchored replacement and the run REFUSES if the anchor
   does not match exactly once (the apex table's own anchor pre-check): a
   refactor disarms a mutant by moving its anchor OR by making it match twice,
   and a control that silently mutated nothing is worth less than none.
   AS0 is exempt and declared so — the default does not reach the arc on
   EITHER tree, which is the whole of what AS0 says, so a control that made it
   fire would be a control that had broken something else.

   WHAT IT DOES NOT SAY, in its own header:
     - IT MEASURES THE BLADE, NOT THE FOOT. `footRowsAt()` never reads
       `spineAt`, so the foot is invariant by construction here; the byte
       partition is what measures that (tools/verify-bloom-seam-bytes.mjs
       --change arc), not this.
     - IT IS BLIND TO A DEFECT INSIDE `arcStep` ITSELF on the healthy range,
       because AS1's bound is an envelope rather than an equality: an arc that
       bent the right way by the wrong amount, within the envelope, would pass.
       What pins the arc's VALUE on every shipped row is the harness's C2,
       which compares the closed form against spineLaw's independently
       integrated table on every uniform curled row of the matrix and bars the
       residual at 1e-9 mm.
     - THE NEAR-ZERO BAND IS THE SUBJECT. The 1e-6 .. 1e-3 span-zero touches
       the discovery also recorded are a DIFFERENT mechanism (a near-flat
       sheet grazing itself at a crease, the session-42 knife-edge class) and
       are not this tool's; see docs/bloom-arc-stability-outcome.md §4.
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { census } from './bloom-self-intersection.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const SRC = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
const CONTROL = process.argv.includes('--negative-control') || process.argv.includes('--control');

/* THE FLOAT FLOOR, in the unit the quantity carries — ulp of the largest
   coordinate in the build being compared, never a length typed in mm. The
   observed floor on the fixed tree is 0.78 ulp (7.105e-15 mm on a 40.819 mm
   coordinate); 16 leaves two decades of headroom and is still fourteen orders
   under the smallest failure the unfixed tree produces. */
/* The control prints the first twelve findings; `--all` prints every one. */
const MUTANT_LINES = process.argv.includes('--all') ? Infinity : 12;
const ARC_ULPS = 16;
/* The ladder. Spans the whole band the unfixed tree gets wrong (1e-16 up to
   about 1e-6) AND three decades above it, so a fix that merely moved the
   cliff would still be caught. */
const LADDER = [1e-16, -1e-16, 1e-14, -1e-14, 1e-12, -1e-12, 1e-10, 1e-9, -1e-9, 1e-8, 1e-7, 1e-6, -1e-6, 1e-5, 1e-4, 1e-3];
/* THE LADDER IS RUN AT THREE TILTS, AND THAT IS THE "IS THIS THE HARDEST MEMBER
   OF THE SUBJECT" QUESTION ANSWERED RATHER THAN ASSUMED (the fifth durable
   rule's second half). The cancellation is not tilt-neutral: `dR`'s numerator
   `sin(phi) - sin(tilt)` loses an ulp of `sin(tilt)` against a true increment
   of `cos(tilt)*k*s`, so its relative error runs away as the tilt approaches
   90 degrees; `dZ`'s does the mirror image and runs away at tilt 0. The
   shipping 25 degrees is neither end — it fails on `dZ`, which is why the tip
   lands on the hub plane — so the two ends are exercised as well. `petalTilt`
   0 and 75 are the CONTROL's own floor and ceiling, not values invented here. */
const TILTS = [
  ['the shipping tilt (25 deg)', {}, true],
  ['tilt 0 — the control\'s floor, where dZ\'s cancellation is worst', { petalTilt: 0 }, false],
  ['tilt 75 — the control\'s ceiling, where dR\'s is', { petalTilt: 75 }, false],
];
/* AND THE MUTATION DOES NOT REACH ALL THREE — MEASURED, AND DECLARED HERE
   RATHER THAN LEFT AS A PUZZLING GAP. At `petalTilt` 0 the OLD closed form is
   CORRECT: `dR` is `sin(phi) / kC` with nothing to cancel against, and `dZ` is
   `(1 - cos(phi)) / kC`, whose numerator rounds to exactly 0 where the true
   value is `phi^2 / 2` — which is 1.5e-36 mm at curl 1e-14, so returning 0 is
   right to every bit that matters. So a variance field applied to a bloom at
   zero tilt would never have shown this defect, and the shipping 25 degrees is
   what shows it. The tilt-0 rungs stay in AS1 because the arc must be stable
   there too and a DIFFERENT future defect could break it; what is declared is
   only that THIS mutation cannot reach them. */
const CONTROL_REACHES = new Set([TILTS[0][0], TILTS[2][0]]);
const D2R = Math.PI / 180;
const FIND = '      const { dAlong: dR, dAcross: dZ } = arcStep(tilt, phi, s);\n'
           + '      return { C: [base[0] + R[0] * dR, base[1] + R[1] * dR, base[2] + dZ], phi };';
const INTO = '      const dR = (Math.sin(phi) - Math.sin(tilt)) / kC;\n'
           + '      const dZ = (Math.cos(tilt) - Math.cos(phi)) / kC;\n'
           + '      return { C: [base[0] + R[0] * dR, base[1] + R[1] * dR, base[2] + dZ], phi };';

async function geometryFor(tag) {
  if (tag === 'shipped') return import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
  const n = SRC.split(FIND).length - 1;
  if (n !== 1) {
    console.error(`REFUSED: the control's anchor matches bloom-geometry.js ${n} times, not once — the mutation is DISARMED and a control that mutates nothing proves nothing.`);
    process.exit(2);
  }
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-arc-'));
  fs.writeFileSync(path.join(d, 'bloom-geometry.js'), SRC.replace(FIND, INTO));
  return import(pathToFileURL(path.join(d, 'bloom-geometry.js')).href);
}

/* NO `captureGrid`: every clause here reads the EMITTED STREAM and the
   builder's own `spine` record, both of which exist without it, and the
   capture would double a run that CI pays on every push. */
const build = (G, set, exportMode) => {
  const acc = new G.MeshBuilder({ exportMode });
  const built = G.buildBloomInto(acc, { ...DEFAULTS, ...set }, { below: null, capability: null });
  return { acc, built, P: new Float64Array(acc.positions) };
};
function extent(P) {
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { if (P[i + k] < lo[k]) lo[k] = P[i + k]; if (P[i + k] > hi[k]) hi[k] = P[i + k]; }
  return { diag: Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]), maxAbs: Math.max(...hi.map(Math.abs), ...lo.map(Math.abs)) };
}
/* THE BOUND — see AS1's entry in the header. `curlDeg` is the total turn the
   blade is asked for; `ref` is the build it is compared against. */
const boundFor = (curlDeg, ref) => Math.abs(curlDeg) * D2R * ref.diag + ARC_ULPS * Number.EPSILON * ref.maxAbs;
const worstOf = (A, B) => { let w = 0; for (let i = 0; i < A.length; i++) { const d = Math.abs(A[i] - B[i]); if (d > w) w = d; } return w; };

async function run(tag) {
  const G = await geometryFor(tag);
  const fired = new Set();
  const lines = [];
  const fail = (code, msg) => { fired.add(code); lines.push(`${code}: ${msg}`); };

  /* ---- AS0 — the default never reaches the arc ------------------------- */
  {
    const { built } = build(G, {}, true);
    const petals = [...(built.petalsAll || []), ...((built.sepals && built.sepals.built) || [])].filter(Boolean);
    if (!petals.length) fail('AS0', 'the shipping default built no petal at all — this run can say nothing');
    for (const p of petals) if (!p.spine || p.spine.curlRad !== 0) fail('AS0', `the shipping default reports curlRad ${p.spine && p.spine.curlRad} on a built petal — the arc branch is reachable at DEFAULTS and the fix is not inert by branch there`);
  }

  /* ---- AS1 / AS2 / AS3 — the ladder against the flat build ------------- */
  const ladder = [];
  for (const [tiltName, tiltSet, bothModes] of TILTS) {
    for (const exportMode of bothModes ? [true, false] : [true]) {
      const flat = build(G, tiltSet, exportMode);
      const ref = extent(flat.P);
      const flatCensus = census(new Float64Array(flat.P));
      const mode = exportMode ? 'export' : 'live';
      const at = `${tiltName} [${mode}]`;
      for (const curl of LADDER) {
        const b = build(G, { ...tiltSet, petalSpineCurl: curl }, exportMode);
        if (b.P.length !== flat.P.length) {
          fail('AS3', `curl ${curl}, ${at}: ${b.P.length / 9} triangles against the flat build's ${flat.P.length / 9} — a curl of ${curl} degrees may not move the topology`);
          continue;
        }
        const worst = worstOf(b.P, flat.P), bound = boundFor(curl, ref);
        if (!(worst <= bound)) fail('AS1', `curl ${curl}, ${at}: the blade is ${worst.toExponential(4)} mm from where a flat build puts it, against a bound of ${bound.toExponential(4)} mm (${(worst / bound).toExponential(2)} x) — the arc has cancelled`);
        if (Math.abs(curl) === 1e-14) {
          const c = census(new Float64Array(b.P));
          if (c.within !== flatCensus.within) fail('AS2', `curl ${curl}, ${at}: ${c.within} within-shell self-intersection pairs (worst span ${c.worstSpanMm.toFixed(4)} mm) against the flat build's ${flatCensus.within} — the blade has folded through itself`);
        }
        if (exportMode) ladder.push({ tilt: tiltName, curl, worst, bound });
      }
    }
  }

  /* ---- AS4 — the graded whorl, the shape the field will build ---------- */
  {
    const acc = new G.MeshBuilder({ exportMode: true });
    const state = { ...DEFAULTS };
    const fr = G.footRing(state, acc);
    const ring = fr.slotRings[0][0];
    const parts = [];
    G.buildWhorlInto({
      count: fr.slotCount, radius: ring.radius, height: 0,
      sizeRamp: () => ring.scale, angleRamp: () => ring.tiltExtra, phase: ring.phase,
      placement: 'RADIAL', fan: null,
      blade: (slot) => {
        /* THE FIELD'S OWN ARITHMETIC — `180 cos(theta)` at the emitted azimuth.
           The near-zero values are produced by it, never chosen here. */
        const curl = Math.max(-180, Math.min(360, 180 * Math.cos(slot.azimuth)));
        const from = acc.triangleCount;
        G.buildPetalInto(acc, { ...state, petalSpineCurl: curl }, fr.slotRings[0][slot.index], slot, null, false);
        parts.push({ curl, azDeg: slot.azimuth * 180 / Math.PI, from, to: acc.triangleCount });
      },
    });
    const whorl = census(new Float64Array(acc.positions));
    if (whorl.within !== 0) fail('AS4', `the curl-graded 8-petal whorl reads ${whorl.within} within-shell pairs (worst span ${whorl.worstSpanMm.toFixed(4)} mm) — the field's own near-zero slots have folded`);
    let near = 0;
    for (const p of parts) {
      if (Math.abs(p.curl) > 1e-9) continue;               // only the slots the wave sends to zero
      near++;
      const one = new G.MeshBuilder({ exportMode: true });
      const zero = new G.MeshBuilder({ exportMode: true });
      const slot = { index: 0, count: fr.slotCount, azimuth: p.azDeg * D2R, scale: ring.scale, tiltExtra: ring.tiltExtra, z: 0 };
      G.buildPetalInto(one, { ...state, petalSpineCurl: p.curl }, fr.slotRings[0][0], slot, null, false);
      G.buildPetalInto(zero, { ...state, petalSpineCurl: 0 }, fr.slotRings[0][0], slot, null, false);
      const A = new Float64Array(one.positions), B = new Float64Array(zero.positions);
      if (A.length !== B.length) { fail('AS4', `the slot at ${p.azDeg.toFixed(0)} deg (curl ${p.curl.toExponential(3)}) emits ${A.length / 9} triangles against ${B.length / 9} at curl 0`); continue; }
      const w = worstOf(A, B), bound = boundFor(p.curl, extent(B));
      if (!(w <= bound)) fail('AS4', `the slot at ${p.azDeg.toFixed(0)} deg is handed a curl of ${p.curl.toExponential(3)} degrees and lands ${w.toExponential(4)} mm from the same petal at curl 0, against a bound of ${bound.toExponential(4)} mm (${(w / bound).toExponential(2)} x)`);
    }
    if (near !== 2) fail('AS4', `the wave sent ${near} of 8 slots to a near-zero curl, expected 2 — the fixture is not exercising the branch it names`);
  }
  return { fired, lines, ladder };
}

const shipped = await run('shipped');
console.log('AS1 THE LADDER — whole bloom, EXPORT, against the same bloom at curl exactly 0:');
let lastTilt = null;
for (const r of shipped.ladder) {
  if (r.tilt !== lastTilt) { console.log(`  ${r.tilt}:`); lastTilt = r.tilt; }
  console.log(`    curl ${String(r.curl).padStart(7)} deg   worst |dx| ${r.worst.toExponential(4)} mm   bound ${r.bound.toExponential(4)} mm   ${(r.worst / r.bound).toExponential(2)} x`);
}

if (!CONTROL) {
  if (shipped.fired.size) { console.error(`\nFAIL — ${shipped.lines.length} finding(s):`); for (const l of shipped.lines) console.error('  ' + l); process.exit(1); }
  console.log('\nAS0 the default reaches no arc · AS1 the ladder is bounded on every rung, both modes · AS2 the census is the flat build\'s · AS3 no triangle moved · AS4 the graded whorl is clean and both near-zero slots land at curl 0 — PASS');
  process.exit(0);
}

/* ---- the negative control ------------------------------------------- */
console.log('\n--negative-control: the old closed form `(sin p1 - sin p0) / k` restored in a copy of bloom-geometry.js.');
const mutant = await run('mutant');
/* MUST_FIRE is what this mutation can reach. AS0 and AS3 are DECLARED SILENT
   with their reasons rather than demanded, because each has a subject the
   restored closed form is not in: the default's curl is exactly 0 on both
   trees, and a cancelling arc moves VERTICES and never a triangle count. That
   is stated here rather than discovered as a puzzling MISSED — a clause the
   only available mutation cannot reach is a coverage fact to write down, and
   the failure mode the fifth durable rule names is exactly the one where it
   is not. Both stay asserted: they are real properties of the arc that a
   FUTURE change could break, and neither costs anything to check. */
const MUST_FIRE = ['AS1', 'AS2', 'AS4'];
const DECLARED_SILENT = {
  AS0: 'the shipping default is at curl exactly 0 on both trees, so the arc branch is unreached either way — which is the whole of what AS0 says',
  AS3: 'the cancelling arc moves vertices, never triangle counts, so the topology clause has nothing to report on this mutation',
};
const bad = [];
if (shipped.fired.size) bad.push(`the SHIPPED tree fired ${[...shipped.fired].join(', ')} — the control cannot be read on a tree that is already failing`);
console.log(`  the mutant fired: ${[...mutant.fired].sort().join(', ') || '(nothing)'}`);
for (const l of mutant.lines.slice(0, MUTANT_LINES)) console.log('    ' + l);
if (mutant.lines.length > MUTANT_LINES) console.log(`    ... and ${mutant.lines.length - MUTANT_LINES} more`);
for (const c of MUST_FIRE) if (!mutant.fired.has(c)) bad.push(`${c} stayed SILENT on the restored closed form — that clause cannot produce a verdict`);
/* PER-TILT COVERAGE, asserted in both directions — see CONTROL_REACHES. */
const reached = new Set();
for (const l of mutant.lines) { const m = l.match(/^AS\d: curl [^,]+, (.+?) \[/); if (m) reached.add(m[1]); }
for (const [name] of TILTS) {
  if (CONTROL_REACHES.has(name) && !reached.has(name)) bad.push(`the restored closed form produced NO finding at "${name}", which it is declared to reach — the ladder there is not exercising the branch`);
  if (!CONTROL_REACHES.has(name) && reached.has(name)) bad.push(`the restored closed form produced a finding at "${name}", which is declared unreachable by it — the declaration is wrong`);
}
console.log(`  the mutation reaches ${[...reached].length} of ${TILTS.length} tilts, as declared (tilt 0 is where the old form is accidentally correct — see CONTROL_REACHES).`);
for (const [c, why] of Object.entries(DECLARED_SILENT)) {
  if (mutant.fired.has(c)) bad.push(`${c} FIRED on the restored closed form and is declared unreachable by it (${why}) — the declaration is wrong, or the mutation broke something else`);
  else console.log(`  ${c} is SILENT, as declared: ${why}.`);
}
if (bad.length) { console.error(`\nCONTROL FAILED — ${bad.length} finding(s):`); for (const b of bad) console.error('  ' + b); process.exit(1); }
console.log(`\nCONTROL PASSES — ${MUST_FIRE.join(', ')} each reported the restored closed form, the two declared-silent clauses stayed silent, and the shipped tree is silent on all five.`);
