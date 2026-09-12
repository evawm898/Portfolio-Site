/* ===================================================================
   bloom-lobe-model-b.mjs — WHICH RIM MODEL IS SHIPPED, AND WHAT THE OTHER
   ONE WOULD DO. Session 40, discovery. Zero bytes: it reads the shipped
   geometry and emits nothing.

     node tools/bloom-lobe-model-b.mjs [--json <file>] [--section 0|0b|1|2|4]

   THE TWO MODELS (Eva's brief, session 40).
     MODEL A — the lobe window is an interval in `u` terminating at the APEX
       (`uCap`), mirrored across the spine. The apex is a BOUNDARY of the
       treated region and `petalTipShape` owns everything above it.
     MODEL B — the rim is ONE CURVE: base, up one margin, across the terminal
       mini-face, down the other margin. Lobes sit at even ARC-LENGTH
       intervals along THAT curve, symmetric about its midpoint, so above a
       minimum coverage the apex is INTERIOR to the treated region and there
       is no join to make.

   WHAT IS MEASURED, AND IN WHOSE UNITS.
     §0  Model A established from the SHIPPED code as an identity, not a
         reading: the lobed profile is `Object.is`-equal to the plain one over
         [uCap, 1], and the cut at uCap is exactly 0.
     §0b A MODEL B PROTOTYPE — a half-width function, not a build — through
         the SAME arc engine the shipped stationing uses (`rimArcTable`), and
         the apex answered: does the corner at `lobeTipShape` 0.50 dissolve?
     §1  What `lobeTipShape` does to the CREST and to the NOTCH, as a curve.
     §2  PROPORTIONAL against ABSOLUTE depth, measured where it is decided:
         at the apex, where the base half-width runs to the print floor.
     §4  The count ceiling under both models, and which constraint binds.
   §3 (the floor as a function of sharpness) is `tools/bloom-lobe-resolution.mjs
   --q=<list>`, whose clauses already own that question; this tool does not
   restate them.

   NAME THE MODE AND THE SAMPLING. Every figure says LIVE or EXPORT and says
   what it was sampled on. The shipped stationing is mode-free by construction
   (it runs on `max(shape, rootBlend, TIP_HALF_MM)`, never the accumulator's
   floor) and the prototype keeps that; what differs between the modes is the
   OUTLINE the cut is applied to, at the tip, and every tip figure is given in
   both. Analytic figures are named analytic; drawn figures name the station
   count they were drawn through.

   THE PROTOTYPE IS NOT A PROPOSAL IN CODE. It builds no mesh, places no row
   and is imported by nothing. It exists so that "Model B dissolves the apex
   join" is a measurement rather than an argument.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const { firstSlot } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-first-slot.mjs')).href);

const argOf = (name) => { const a = process.argv.find((x) => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : null; };
const JSON_OUT = argOf('json');
const ONLY = argOf('section');
const want = (s) => !ONLY || ONLY === s;
const out = {};
const say = (...a) => { if (!JSON_OUT) console.log(...a); };
const f3 = (x) => (Number.isFinite(x) ? x.toFixed(3) : String(x));

/* ---- the one way this tool reaches a petal --------------------------- */
function build(set, exportMode, layer = 0) {
  const state = { ...DEFAULTS, ...set };
  const acc = new G.MeshBuilder({ exportMode });
  const { ring, slot } = firstSlot(state, acc, layer);
  const surface = G.petalSurface(state, ring, slot, null, acc);
  return { state, acc, ring, slot, surface, p: surface.profile, length: state.petalLength * slot.scale, mode: exportMode ? 'export' : 'live' };
}

/* =====================================================================
   §0 — WHICH MODEL IS SHIPPED. Three claims, each an identity.
   ===================================================================== */
if (want('0')) {
  const rows = [];
  for (const exportMode of [false, true]) {
    const A = build({}, exportMode);                       // plain
    const B = build({ lobeDepth: 0.30 }, exportMode);      // lobed, shipped defaults otherwise
    const L = B.p.lobes;
    const N = 4001;
    let identAbove = 0, diffAbove = 0, identBelow = 0, diffBelow = 0;
    for (let i = 0; i < N; i++) {
      const u = B.p.uCap + (1 - B.p.uCap) * i / (N - 1);
      if (Object.is(A.p.halfWidthAt(u), B.p.halfWidthAt(u))) identAbove++; else diffAbove++;
    }
    for (let i = 0; i < N; i++) {
      const u = L.windowU[0] + (B.p.uCap - L.windowU[0]) * i / (N - 1);
      if (Object.is(A.p.halfWidthAt(u), B.p.halfWidthAt(u))) identBelow++; else diffBelow++;
    }
    rows.push({ mode: B.mode, uCap: B.p.uCap, windowU: L.windowU, u1IsUCap: L.windowU[1] === B.p.uCap,
      /* THE CUT AT uCap, read off the two OUTLINES rather than off the lobe
         record's own `cutAt` — which the record deliberately does not expose,
         and which would be the defect answering the question about itself
         (session 39's fourth durable rule). */
      cutAtUCap: 1 - B.p.halfWidthAt(B.p.uCap) / A.p.halfWidthAt(B.p.uCap),
      cutJustBelow: 1 - B.p.halfWidthAt(B.p.uCap - 1e-4) / A.p.halfWidthAt(B.p.uCap - 1e-4),
      halfAtUCapIdentical: Object.is(A.p.halfWidthAt(B.p.uCap), B.p.halfWidthAt(B.p.uCap)),
      aboveIdentical: identAbove, aboveDiffer: diffAbove,
      inWindowIdentical: identBelow, inWindowDiffer: diffBelow, crestU: L.crestU, sinusU: L.sinusU,
      demand: B.p.ladderDemand() });
  }
  out.section0 = { model: 'A', rows };
  say('=== §0 — WHICH MODEL IS SHIPPED ==========================================');
  say('  state: the shipping defaults with lobeDepth 0.30 (count 6 asked, 2 built), against the plain default.');
  say('  sampling: 4001 u, Object.is on halfWidthAt, per mode.\n');
  for (const r of rows) {
    say(`  ${r.mode.toUpperCase().padEnd(6)} window u = [${f3(r.windowU[0])}, ${f3(r.windowU[1])}]   uCap = ${f3(r.uCap)}   windowU[1] === uCap : ${r.u1IsUCap}`);
    say(`         cut at uCap = ${r.cutAtUCap.toExponential(2)} (exactly ${r.cutAtUCap === 0 ? 'zero' : 'NOT zero'}); half-width there Object.is-equal to plain: ${r.halfAtUCapIdentical}`);
    say(`         cut 1e-4 below uCap = ${r.cutJustBelow.toExponential(2)}  (the crest is AT the window end)`);
    say(`         over [uCap, 1]: ${r.aboveIdentical} of ${r.aboveIdentical + r.aboveDiffer} samples Object.is-equal to the PLAIN petal, ${r.aboveDiffer} differ`);
    say(`         inside the window: ${r.inWindowDiffer} of ${r.inWindowIdentical + r.inWindowDiffer} differ (the cut)`);
    say(`         ladder demand: ${JSON.stringify(r.demand)}`);
  }
  say('\n  VERDICT: MODEL A. The treated region is an interval in u whose upper end IS the apex entry,');
  say('  the apex above it is bit-identical to a petal with no lobes at all, and the apex is therefore a');
  say('  BOUNDARY of the treatment, not a point on it. Mirrored across the spine by construction (the');
  say('  outline is one half-width h(u) applied at v = +/-1).\n');
}

/* =====================================================================
   THE MODEL B PROTOTYPE.

   The rim, as one curve, in the BASE OUTLINE's own 2D view — the same view
   the shipped stationing uses, `(u * length, laminaHalf(u))`, so the two
   models are stationed on the same measure and differ only in WHERE.

     A  = one margin's arc from ROOT_BLEND_END to u = 1
     F  = the terminal mini-face, 2 * laminaHalf(1)
     d(u) = F/2 + (s(1) - s(u))      distance along the rim from its MIDPOINT
     halfRim = A + F/2 = d(ROOT_BLEND_END)

   Coverage is measured from the apex OUTWARD (Eva's clock: twelve is the
   apex, six is the base), so the treated arc is [-Wh, +Wh] with
   Wh = coverage * halfRim, and the apex is interior whenever coverage > 0.

   ENDS ON CRESTS, as Model A's window already does, so the outline meets the
   untreated base continuously. With Np periods over the treated arc the
   crests sit at d = Wh - k*pitch; the rim's MIDPOINT is a crest iff Np is
   EVEN and a sinus iff Np is ODD. The number of free-standing teeth (the
   bumps between adjacent sinuses) is Np - 1 — so the user-facing COUNT is
   Np - 1, and ODD counts put a crest at the apex, EVEN counts a notch. That
   is Eva's clock, derived rather than asserted: one lobe at twelve is count 1
   (Np 2), two either side of twelve is count 2 (Np 3), three at eleven /
   twelve / one is count 3 (Np 4).
   ===================================================================== */
function modelB({ p, length, coverage, teeth, q, depth, absoluteMm = null }) {
  /* THE STATIONING CURVE IS MODE-FREE, as the shipped one is: `max(shape,
     rootBlend, TIP_HALF_MM)`, never the accumulator's floor, so live and
     export station the SAME lobes. (`halfWidthBaseAt` is already
     `max(shape, rootBlend, tipFloor)` and TIP_HALF_MM dominates tipFloor in
     both modes, so this expression IS the shipped `laminaHalf`.) */
  const laminaHalf = (u) => Math.max(p.halfWidthBaseAt(u), G.TIP_HALF_MM);
  /* THE OUTLINE THE CUT IS APPLIED TO IS THE MODE'S OWN, as the shipped one
     is: the cut multiplies the base shape and the floors are max-ed against
     the result. Two different curves on purpose — stationing mode-free,
     drawing mode-true — and every figure below says which mode it is in. */
  const baseMode = (u) => p.halfWidthBaseAt(u);
  const table = G.rimArcTable((u) => [u * length, laminaHalf(u), 0], p.slopeBreaks(), p.uPk, G.LOBE_ARC_SAMPLES);
  const sRB = table.sAt(G.ROOT_BLEND_END), sTip = table.sAt(1);
  const marginArc = sTip - sRB;
  const face = 2 * laminaHalf(1);
  const halfRim = marginArc + face / 2;
  const d = (u) => face / 2 + (sTip - table.sAt(u));
  const Np = teeth + 1;
  const Wh = coverage * halfRim;
  const pitch = (2 * Wh) / Np;
  const u0 = coverage >= 1 ? G.ROOT_BLEND_END : (() => {
    let lo = G.ROOT_BLEND_END, hi = 1;
    for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; if (d(m) > Wh) lo = m; else hi = m; }
    return (lo + hi) / 2;
  })();
  const phase = (u) => (Wh - d(u)) / pitch;               // 0 at the treated end, Np/2 at the apex
  const wave = (x) => Math.pow((1 - Math.cos(2 * Math.PI * x)) / 2, q);
  const cutFrac = (u) => (d(u) > Wh ? 0 : depth * wave(phase(u)));
  /* PROPORTIONAL (the shipped rule): a fraction of the LOCAL half-width.
     ABSOLUTE: the same millimetres everywhere, which is the other half of
     §2's question — `absoluteMm` switches it. */
  const cutMm = (u) => (absoluteMm === null ? cutFrac(u) * baseMode(u) : (d(u) > Wh ? 0 : absoluteMm * wave(phase(u))));
  const rawHalf = (u) => baseMode(u) - cutMm(u);
  const flooredHalf = (u) => Math.max(rawHalf(u), p.tipFloor);
  const apexIsCrest = Np % 2 === 0;
  return { table, marginArc, face, halfRim, Np, teeth, pitch, Wh, u0, d, phase, wave, cutFrac, cutMm, rawHalf, flooredHalf, apexIsCrest,
    laminaHalf, baseMode, crestD: Array.from({ length: Np + 1 }, (_, k) => Wh - k * pitch), sinusD: Array.from({ length: Np }, (_, k) => Wh - (k + 0.5) * pitch) };
}

/* The exterior turn of the outline at u, in DEGREES, on the (x = u*length,
   y = h(u)) curve, through a chord of `eps` in u either side. A turn is a
   drawn quantity: it NAMES its eps, because a corner and a tight bend differ
   only by the scale you look at them on. */
function turnDeg(h, u, length, eps) {
  const a = [(u - eps) * length, h(u - eps)], b = [u * length, h(u)], c = [(u + eps) * length, h(u + eps)];
  const t0 = Math.atan2(b[1] - a[1], b[0] - a[0]), t1 = Math.atan2(c[1] - b[1], c[0] - b[0]);
  let dt = t1 - t0;
  while (dt > Math.PI) dt -= 2 * Math.PI;
  while (dt < -Math.PI) dt += 2 * Math.PI;
  return (dt * 180) / Math.PI;
}

/* =====================================================================
   §0b — DOES MODEL B DISSOLVE THE APEX JOIN?
   ===================================================================== */
if (want('0b')) {
  const rows = [];
  const EPS = 1e-4;                                   // named: the chord the turn is read through, in u
  for (const exportMode of [false, true]) {
    const plain = build({}, exportMode);
    for (const q of [0.5, 1, 2]) {
      /* MODEL A, the shipped build, at the same q. */
      const a = build({ lobeDepth: 0.30, lobeTipShape: q }, exportMode);
      const uCap = a.p.uCap, hA = a.p.halfWidthAt;
      const joinTurnA = turnDeg(hA, uCap, a.length, EPS);
      /* MODEL B, the prototype, teeth chosen so the apex is a CREST (odd) and
         then a NOTCH (even), at the same depth and the same coverage. */
      for (const teeth of [1, 2, 3]) {
        const B = modelB({ p: plain.p, length: plain.length, coverage: 0.8, teeth, q, depth: 0.30 });
        const hB = (u) => B.flooredHalf(u);
        const uAtD = (dd) => { let lo = G.ROOT_BLEND_END, hi = 1; for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; if (B.d(m) > dd) lo = m; else hi = m; } return (lo + hi) / 2; };
        /* The interior crests and sinuses that fall on the margin (d >= F/2). */
        const interiorCrest = B.crestD.filter((x) => x > B.face / 2 + 1e-9 && x < B.Wh - 1e-9).map(uAtD);
        const interiorSinus = B.sinusD.filter((x) => x > B.face / 2 + 1e-9).map(uAtD);
        rows.push({ mode: plain.mode, q, teeth, Np: B.Np, apexIsCrest: B.apexIsCrest,
          pitchMm: B.pitch, u0: B.u0, marginArc: B.marginArc, faceMm: B.face, halfRim: B.halfRim,
          modelA: { uCapJoinTurnDeg: joinTurnA, lowerEndTurnDeg: turnDeg(hA, a.p.lobes.windowU[0], a.length, EPS) },
          modelB: {
            apexTurnDeg: null,          // there is no interior point at the apex: u = 1 is the end of the margin
            turnAtU0Deg: turnDeg(hB, B.u0, plain.length, EPS),
            interiorCrestTurnDeg: interiorCrest.map((u) => turnDeg(hB, u, plain.length, EPS)),
            interiorSinusTurnDeg: interiorSinus.map((u) => turnDeg(hB, u, plain.length, EPS)),
            /* WHAT THE APEX ACTUALLY GETS: the cut at the margin's own end,
               and the terminal half-width it leaves, against the floor. */
            cutFracAtTip: B.cutFrac(1), rawHalfAtTip: B.rawHalf(1), flooredHalfAtTip: B.flooredHalf(1),
            floorMm: plain.p.tipFloor, floorClamps: B.rawHalf(1) < plain.p.tipFloor - 1e-12,
            /* THE MARGIN'S OWN SLOPE INTO THE TIP FACE, plain against lobed:
               the apex is "sharpened" or "blunted" by that difference. */
            tipSlopePlain: (plain.p.halfWidthAt(1) - plain.p.halfWidthAt(1 - EPS)) / (EPS * plain.length),
            tipSlopeB: (hB(1) - hB(1 - EPS)) / (EPS * plain.length),
          } });
      }
    }
  }
  out.section0b = { eps: EPS, rows };
  say('=== §0b — DOES MODEL B DISSOLVE THE APEX JOIN? ============================');
  say(`  Model A: the shipped build (lobeDepth 0.30, coverage 0.80), turn read through a chord of eps=${EPS} in u.`);
  say('  Model B: the prototype, same depth, same coverage, stationed on the WHOLE rim.\n');
  say('  mode   q    teeth Np apex    | A: turn at uCap | A: turn at u0 | B: turn at u0 | B: interior crest turns | B: interior sinus turns');
  for (const r of rows) {
    say(`  ${r.mode.padEnd(6)} ${String(r.q).padEnd(4)} ${String(r.teeth).padStart(5)} ${String(r.Np).padStart(2)} ${(r.apexIsCrest ? 'crest' : 'notch').padEnd(7)} | ${f3(r.modelA.uCapJoinTurnDeg).padStart(15)} | ${f3(r.modelA.lowerEndTurnDeg).padStart(13)} | ${f3(r.modelB.turnAtU0Deg).padStart(13)} | ${r.modelB.interiorCrestTurnDeg.map(f3).join(', ').padEnd(23)} | ${r.modelB.interiorSinusTurnDeg.map(f3).join(', ')}`);
  }
  say('\n  THE APEX ITSELF, under Model B (the terminal mini-face is the rim MIDPOINT; u = 1 is its corner):');
  say('  mode   q    teeth apex    pitch(mm) | cut frac at u=1 | raw half (mm) | floor | floored | floor clamps | tip slope plain -> B');
  for (const r of rows) {
    const b = r.modelB;
    say(`  ${r.mode.padEnd(6)} ${String(r.q).padEnd(4)} ${String(r.teeth).padStart(5)} ${(r.apexIsCrest ? 'crest' : 'notch').padEnd(7)} ${f3(r.pitchMm).padStart(9)} | ${f3(b.cutFracAtTip).padStart(15)} | ${f3(b.rawHalfAtTip).padStart(13)} | ${f3(b.floorMm).padStart(5)} | ${f3(b.flooredHalfAtTip).padStart(7)} | ${String(b.floorClamps).padStart(12)} | ${f3(b.tipSlopePlain)} -> ${f3(b.tipSlopeB)}`);
  }
}

/* =====================================================================
   §1 — WHAT lobeTipShape DOES TO THE CREST AND TO THE NOTCH.

   The cut within a period is c(x) = ((1 - cos 2 pi x)/2)^q = sin(pi x)^(2q),
   applied as h = hb * (1 - depth * c). Near the CREST (x -> 0),
   c ~ (pi x)^(2q): a V at q = 0.5, a parabola at q = 1, flat above. Near the
   SINUS (x -> 1/2), c ~ 1 - q pi^2 (x - 1/2)^2 for EVERY q: always a
   parabola. So the two ends of the control are NOT two ends of one curve —
   q moves the crest from a corner to a plateau and moves the sinus only from
   one radius to another.

   The numbers below are given in the units each claim needs: the crest's
   INCLUDED ANGLE in degrees (a corner has one; a bend does not), and the
   sinus's RADIUS OF CURVATURE in millimetres (a bend has one; a corner does
   not). A third column, the steepest FLANK, is what an eye actually reads as
   "acute" on a margin, and it is a function of depth and pitch as much as q.
   ===================================================================== */
if (want('1')) {
  /* Measured on the SHIPPED build so the numbers are the object's: the
     default petal, lobeDepth 0.30, coverage 0.80, 2 lobes, pitch 7.137 mm.
     `lobeTipShape` outside [0.50, 2.00] is not reachable from the slider but
     the geometry accepts it, so the trend either side of the range is shown
     and marked unreachable.

     A TURN ANGLE NAMES ITS SCALE. The crest at q slightly above 0.50 has an
     included angle of exactly 180 degrees and a curvature that is INFINITE —
     it is not a corner and it is not a bend, and only a measurement at a
     stated scale separates it from either. So the turn is read through a
     chord of a named AXIAL distance either side, at two scales: 0.05 mm
     (finer than any print resolution) and 0.50 mm (about a nozzle). */
  const SCALES_MM = [0.05, 0.50];
  const rows = [];
  const exportMode = true;
  for (const q of [0.5, 0.55, 0.6, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0]) {
    const b = build({ lobeDepth: 0.30, lobeTipShape: q }, exportMode);
    const L = b.p.lobes;
    const pitch = L.pitchMm, depth = L.depthBuilt;
    const uCrest = L.crestU[1], uSinus = L.sinusU[0];
    const hbC = b.p.halfWidthBaseAt(uCrest), hbS = b.p.halfWidthBaseAt(uSinus);
    const h = b.p.halfWidthAt;
    const turns = (u) => SCALES_MM.map((mm) => turnDeg(h, u, b.length, mm / b.length));
    /* THE SINUS IS PARABOLIC AT EVERY q — an identity of the law, not a
       reading: c ~ 1 - q pi^2 e^2 about x = 1/2, so the included angle is
       180 degrees and the only thing q moves there is the RADIUS. */
    const sinusRadius = (pitch * pitch) / (2 * Math.PI * Math.PI * q * depth * hbS);
    /* The crest's second derivative: c ~ (pi x)^(2q), so the radius is 0 for
       q < 1 (a corner at q = 0.5, an unbounded curvature below 1), finite at
       exactly 1, and infinite above it. Stated as the three cases it is. */
    const crestRadius = q < 1 ? 0 : q === 1 ? (pitch * pitch) / (2 * Math.PI * Math.PI * depth * hbC) : Infinity;
    let maxSlope = 0;
    for (let i = 1; i < 20000; i++) {
      const x = i / 20000, e = 1e-6;
      const c1 = Math.pow((1 - Math.cos(2 * Math.PI * (x + e))) / 2, q), c0 = Math.pow((1 - Math.cos(2 * Math.PI * (x - e))) / 2, q);
      maxSlope = Math.max(maxSlope, Math.abs(((c1 - c0) / (2 * e)) * depth * hbS / pitch));
    }
    rows.push({ q, reachable: q >= G.LOBE_TIP_SHAPE_RANGE[0] && q <= G.LOBE_TIP_SHAPE_RANGE[1],
      pitchMm: pitch, depthBuilt: depth, hbAtCrest: hbC, hbAtSinus: hbS,
      crestTurnDeg: turns(uCrest), sinusTurnDeg: turns(uSinus),
      crestIncludedDeg: q === 0.5 ? 180 - 2 * (Math.atan((Math.PI * depth * hbC) / pitch) * 180) / Math.PI : 180,
      crestRadiusMm: crestRadius, sinusIncludedDeg: 180, sinusRadiusMm: sinusRadius,
      maxFlankDeg: (Math.atan(maxSlope) * 180) / Math.PI,
      crestBand: 2 * Math.asin(Math.pow(0.1, 1 / (2 * q))) / Math.PI,
      sinusBand: 1 - 2 * Math.asin(Math.pow(0.9, 1 / (2 * q))) / Math.PI });
  }
  out.section1 = { scalesMm: SCALES_MM, mode: 'export', rows,
    note: 'The shipping default petal at lobeDepth 0.30 / coverage 0.80, 2 lobes, pitch 7.137 mm; turns are DRAWN on the build own halfWidthAt through a chord of the named axial distance either side; radii and bands are the law own closed form at the build own pitch and local half-width.' };
  say('\n=== \u00a71 — WHAT lobeTipShape DOES TO THE CREST AND TO THE NOTCH ============');
  say('  EXPORT, the shipping default petal, lobeDepth 0.30, coverage 0.80, 2 lobes built, pitch 7.137 mm.');
  say('  Turn angles are DRAWN on the build\u2019s own outline through a chord of +/- the named axial distance.');
  say('  A NEGATIVE turn is material turning away (a crest); a POSITIVE turn is the outline opening (a sinus).\n');
  say('    q   reach | crest turn @0.05mm  @0.50mm | sinus turn @0.05mm  @0.50mm | crest included | crest R (mm) | sinus included | sinus R (mm) | steepest flank');
  for (const r of rows) {
    say(`  ${String(r.q).padStart(4)}   ${(r.reachable ? 'yes' : 'NO ')} | ${f3(r.crestTurnDeg[0]).padStart(17)} ${f3(r.crestTurnDeg[1]).padStart(8)} | ${f3(r.sinusTurnDeg[0]).padStart(17)} ${f3(r.sinusTurnDeg[1]).padStart(8)} | ${(r.crestIncludedDeg === 180 ? '180 (none)' : f3(r.crestIncludedDeg)).padStart(14)} | ${(r.crestRadiusMm === 0 ? '0 (corner)' : r.crestRadiusMm === Infinity ? 'inf (flat)' : f3(r.crestRadiusMm)).padStart(12)} | ${'180 (never)'.padStart(14)} | ${f3(r.sinusRadiusMm).padStart(12)} | ${(f3(r.maxFlankDeg) + ' deg').padStart(14)}`);
  }
  say('\n  READ. THE SINUS INCLUDED ANGLE IS 180 DEGREES AT EVERY q, as an identity of the law: the wave');
  say('  is parabolic at its minimum for every exponent. All q buys at the notch is a RADIUS, and the');
  say('  radius TIGHTENS with q — the same end of the control that FLATTENS the crest. The two features');
  say('  move in opposition, so one control cannot point both: at the acute end of `lobeTipShape` the');
  say('  crest is a corner and the notch is at its ROUNDEST (2.26 mm), and at the flat end the notch is');
  say('  at its tightest (0.57 mm) with no crest left to point.\n');
}

/* =====================================================================
   §2 — PROPORTIONAL OR ABSOLUTE DEPTH, measured at the apex.
   ===================================================================== */
if (want('2')) {
  /* THE TWO FLOORS ARE NOT THE SAME FLOOR, and the first pass of this
     section measured the wrong one. The OUTLINE floor holds the half-width
     at `tipFloor` — and a proportional cut essentially never reaches it,
     because it shrinks with the width it is cutting. What fades toward the
     apex is the lobe's RELIEF: the millimetres of material the notch
     removes, which is what a printer has to resolve as a feature. Its floor
     is the same physical length the lobe pitch already derives from,
     `max(sheetThickness, MIN_FEATURE_MM)` — one owner, `lobePitchFloor`.

     ABSOLUTE depth is measured against the other failure: the same
     millimetres everywhere consume all of a converging blade, and the
     outline reaches zero half-width — the petal is SEVERED, which is out of
     scope at any parameter value. */
  const rows = [];
  for (const exportMode of [false, true]) {
    const plain = build({}, exportMode);
    const reliefFloor = G.lobePitchFloor(plain.ring.thickness);
    for (const teeth of [3, 5]) {
      for (const depth of [0.30, 0.60, 0.90]) {
        const B = modelB({ p: plain.p, length: plain.length, coverage: 1.0, teeth, q: 1, depth });
        const uAtD = (dd) => { let lo = G.ROOT_BLEND_END, hi = 1; for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; if (B.d(m) > dd) lo = m; else hi = m; } return (lo + hi) / 2; };
        const sinus = B.sinusD.filter((x) => x > B.face / 2 + 1e-9).map((dd) => {
          const u = uAtD(dd), base = B.baseMode(u), raw = B.rawHalf(u), fl = B.flooredHalf(u);
          return { u, dMm: dd, baseHalf: base, reliefMm: base - fl, underReliefFloor: base - fl < reliefFloor, widthFloored: raw < fl - 1e-12 };
        });
        /* THE FADE POINT: where the proportional rule's own relief at a
           notch would fall under the relief floor. It is a property of the
           BASE OUTLINE and the depth alone (relief = depth * hb), so it is
           solved on hb, not on where a notch happens to land. */
        const hbFade = reliefFloor / depth;
        let uFade = null;
        for (let i = 20000; i >= 0; i--) { const u = G.ROOT_BLEND_END + (1 - G.ROOT_BLEND_END) * i / 20000; if (B.baseMode(u) >= hbFade) { uFade = u; break; } }
        const dFade = uFade === null ? null : B.d(uFade);
        const coverageStop = dFade === null ? null : 1 - dFade / B.halfRim;
        /* ABSOLUTE, matched to what the proportional rule cuts mid-blade. */
        const absMm = depth * plain.p.halfWidthBaseAt(0.5);
        const Babs = modelB({ p: plain.p, length: plain.length, coverage: 1.0, teeth, q: 1, depth, absoluteMm: absMm });
        let severU = null;
        for (let i = 0; i <= 20000; i++) { const u = G.ROOT_BLEND_END + (1 - G.ROOT_BLEND_END) * i / 20000; if (Babs.rawHalf(u) <= 0) { severU = u; break; } }
        /* THE SHIPPED DEPTH CAP, applied to Model B's own sinus set:
           `1 - TIP_HALF_MM / min(hb over the sinuses)` — mode-free, the
           shipped derivation, read here so the width-floored rows below can
           be seen for what they are (states the shipped cap already refuses). */
        const hMin = Math.min(...B.sinusD.filter((x) => x > B.face / 2 + 1e-9).map((dd) => B.baseMode(uAtD(dd))));
        const depthCap = Math.max(0, 1 - G.TIP_HALF_MM / hMin);
        rows.push({ mode: plain.mode, teeth, depth, depthCap, overCap: depth > depthCap, reliefFloor, widthFloor: plain.p.tipFloor, pitchMm: B.pitch, halfRimMm: B.halfRim,
          sinus, sinusUnder: sinus.filter((x) => x.underReliefFloor).length, widthFlooredCount: sinus.filter((x) => x.widthFloored).length,
          uFade, dFadeMm: dFade, coverageStop, absMm, severU });
      }
    }
  }
  out.section2 = { rows };
  say('\n=== §2 — PROPORTIONAL OR ABSOLUTE DEPTH, at the apex ======================');
  say('  Model B prototype, coverage 1.00 (the whole clock), q 1.00, so the treatment reaches u = 1.');
  say('  PROPORTIONAL = a fraction of the LOCAL half-width (the shipped rule). ABSOLUTE = the same');
  say('  millimetres everywhere, matched to what the proportional rule removes at u = 0.50.');
  say('  RELIEF FLOOR = max(sheetThickness, MIN_FEATURE_MM), the same physical length the lobe PITCH');
  say('  floor already derives from — the smallest relief the printer resolves as a feature.\n');
  say('  mode   teeth depth  cap | relief floor | notch reliefs (mm, apex last)          under | width floored | fade at u / d(mm) / coverage that stops short | ABSOLUTE: severed at u');
  for (const r of rows) {
    say(`  ${r.mode.padEnd(6)} ${String(r.teeth).padStart(5)} ${f3(r.depth)} ${f3(r.depthCap)}${r.overCap ? '*' : ' '}| ${f3(r.reliefFloor).padStart(12)} | ${r.sinus.map((x) => f3(x.reliefMm)).join(' ').padEnd(38)} ${String(r.sinusUnder).padStart(5)} | ${String(r.widthFlooredCount).padStart(13)} | ${(r.uFade === null ? 'immediately' : `${f3(r.uFade)} / ${f3(r.dFadeMm)} / ${f3(r.coverageStop)}`).padStart(44)} | ${r.severU === null ? 'never' : f3(r.severU)}`);
  }
  say('\n  READ. * marks a depth ABOVE the shipped depth cap (1 - TIP_HALF_MM / the shallowest sinus\u2019s');
  say('  base half-width) — the two width-floored rows are states the shipped cap already refuses, and');
  say('  under the cap the OUTLINE floor is never reached at a notch, because a proportional cut shrinks');
  say('  with the width it is cutting. What fades toward the apex is the RELIEF, and it fades SMOOTHLY');
  say('  rather than at a cliff: on five teeth at depth 0.30 the notches read 2.37 / 1.92 / 0.93 mm, so');
  say('  the apex-most one is already under the relief floor while the base-most is twice over it.');
  say('');
  say('  AND THE BRIEF\u2019S MITIGATION DOES NOT REACH IT. \u201ccoverage that stops short of where the floor');
  say('  would clamp\u201d assumes coverage can exclude the fading end — but Eva\u2019s coverage is measured from');
  say('  TWELVE outward and excludes SIX, so the apex is the one arc coverage never removes. The fade');
  say('  point sits at u 0.875 / 0.963 / 0.982 at depth 0.30 / 0.60 / 0.90, which is 6.34 / 2.64 / 1.72 mm');
  say('  of rim either side of the apex: a coverage that stopped short of it would have to be an ANNULUS');
  say('  excluding twelve, which is the one shape the clock model rules out.');
  say('');
  say('  ABSOLUTE severs the blade — the outline reaches zero half-width on the converging tip at depth');
  say('  0.30 on five teeth and at every depth at or above 0.60 — which is out of scope at any value.');
}

/* =====================================================================
   §4 — THE COUNT CEILING, under both models.
   ===================================================================== */
if (want('4')) {
  /* THE LADDER IS RUN, not only its capacity arithmetic. `bladeStations`
     reads exactly three things off a profile — `ladderHalfAt`,
     `ladderLawActiveAt` and `ladderDemand` — so a Model B profile is a PROXY
     over the plain one with those three replaced, and the SHIPPED placer
     does the placing. Nothing about row placement is re-implemented here:
     that is the standing rule (the ladder is the one owner) and it is also
     the only way the answer means anything. */
  const rows = [];
  const plainE = build({}, true);
  /* THE FLOOR IS A FUNCTION OF THE SHAPE (item 3, measured by
     `tools/bloom-lobe-resolution.mjs --q=<list>`: 10 / 11 / 8 stations a
     period at q 0.50 / 1.00 / 2.00 under the ladder). `--floor=` takes one
     so the count ceiling can be read at the shape's own floor rather than
     only at the set-wide constant. */
  const floorN = Number(argOf('floor') ?? G.LOBE_SAMPLES_PER_LOBE);
  const pitchFloor = G.lobePitchFloor(plainE.ring.thickness);
  const inWindow = (st, u0, u1) => st.filter((u) => u > u0 + 1e-12 && u <= u1 + 1e-12).length;
  for (const coverage of [0.10, 0.40, 0.80, 1.00]) {
    /* ---- MODEL A: the shipped build, and the shipped ladder on it ------ */
    const a = build({ lobeDepth: 0.30, lobeCoverage: coverage, lobeCount: G.LOBE_COUNT_RANGE[1] }, true);
    const L = a.p.lobes;
    const repA = {};
    const stA = G.bladeStations(a.p, a.length, null, a.surface.seamClearMm, repA);
    const placedA = L.noRoom ? 0 : inWindow(stA, L.windowU[0], L.windowU[1]);

    /* ---- MODEL B: the prototype outline, through the same placer ------- */
    const mk = (teeth) => modelB({ p: plainE.p, length: plainE.length, coverage, teeth, q: 1, depth: 0.30 });
    const B0 = mk(1);
    const capB = G.ladderWindowCapacity(B0.u0, 1, 0);
    /* THE DEMAND, exactly: the margin carries the treated arc LESS the half
       of the terminal face that is not on it, so the periods the rows must
       resolve are (Wh - F/2) / pitch, never Np/2. Np/2 overstates by about a
       tenth of a period here; the exact form is used and the conservative
       one is printed beside it so the difference is visible rather than
       assumed away. */
    const demandOf = (B) => Math.ceil(((B.Wh - B.face / 2) / B.pitch) * floorN);
    let teethRowsCap = 0;
    for (let t = 1; t <= 40; t++) { if (demandOf(mk(t)) <= capB) teethRowsCap = t; else break; }
    const teethPitchCap = Math.max(0, Math.floor((2 * B0.Wh) / pitchFloor + 1e-9) - 1);
    const teethBuilt = Math.min(teethRowsCap, teethPitchCap);
    /* Run the shipped placer on the built count. */
    let placedB = null, demandB = null, blendB = null, apexB = null;
    if (teethBuilt >= 1) {
      const B = mk(teethBuilt);
      demandB = demandOf(B);
      const proxy = { ...plainE.p,
        ladderHalfAt: (u) => Math.max(B.rawHalf(u), G.TIP_HALF_MM),   // mode-free, the ladder's own rule
        ladderLawActiveAt: plainE.p.ladderLawActiveAt,
        ladderDemand: () => ({ u0: B.u0, u1: 1, stations: demandB, exact: false }) };
      const repB = {};
      const stB = G.bladeStations(proxy, plainE.length, null, plainE.surface.seamClearMm, repB);
      placedB = inWindow(stB, B.u0, 1);
      blendB = repB.blend;
      apexB = B.apexIsCrest ? 'crest' : 'notch';
    }
    rows.push({ coverage,
      /* Model A's BUILT column is the SHIPPED build at the SHIPPED floor —
         `cap.lobeSamplesPerLobe` is a capability this tool does not set — so
         its cap at the `--floor` under test is derived from its own reported
         capacity and printed beside it rather than silently mixed in. */
      A: { windowU: L.noRoom ? null : L.windowU, capacity: L.rowsCapacity, rowsCap: L.countRowsCap,
           rowsCapAtFloor: Math.floor(L.rowsCapacity / floorN + 1e-9), pitchCap: L.countFloorCap,
           built: L.countBuilt, noRoom: L.noRoom, demand: L.noRoom ? 0 : L.countBuilt * floorN, placed: placedA,
           perLobe: L.noRoom ? null : placedA / L.countBuilt, blend: repA.blend },
      B: { u0: B0.u0, treatedArcMm: 2 * B0.Wh, capacity: capB, teethRowsCap, teethPitchCap, built: teethBuilt,
           demand: demandB, placed: placedB, perPeriod: placedB === null ? null : placedB / ((mk(teethBuilt).Wh - mk(teethBuilt).face / 2) / mk(teethBuilt).pitch),
           blend: blendB, apex: apexB } });
  }
  out.section4 = { floorN, pitchFloorMm: pitchFloor, rows };
  say('\n=== §4 — THE COUNT CEILING, under both models ===========================');
  say(`  EXPORT, the shipping default petal (35 mm, sheet ${f3(plainE.ring.thickness)} mm), buckle flat.`);
  say(`  Samples-per-lobe floor ${floorN}${floorN === G.LOBE_SAMPLES_PER_LOBE ? ' (the shipped constant)' : ' (--floor, the shape\u2019s own from §3)'}; pitch floor ${f3(pitchFloor)} mm. The ladder is the SHIPPED bladeStations() in both columns.`);
  say('  Model A counts PERIODS in the window [u0, uCap]. Model B counts TEETH over the whole rim (periods Np = teeth + 1).\n');
  say('  cover | MODEL A: window        cap  rows/pitch  BUILT demand placed /lobe  cap@floor | MODEL B: u0    arc(mm)  cap  rows/pitch  BUILT apex   demand placed /period');
  for (const r of rows) {
    const A = r.A, B = r.B;
    say(`  ${f3(r.coverage)} | ${(A.windowU ? `[${f3(A.windowU[0])},${f3(A.windowU[1])}]` : 'NO ROOM').padEnd(15)} ${String(A.capacity).padStart(4)} ${String(A.rowsCap).padStart(5)}/${String(A.pitchCap).padEnd(4)} ${String(A.built).padStart(5)} ${String(A.demand).padStart(6)} ${String(A.placed).padStart(6)} ${f3(A.perLobe).padStart(6)} ${String(A.rowsCapAtFloor).padStart(9)} | ${f3(B.u0).padStart(6)} ${f3(B.treatedArcMm).padStart(8)} ${String(B.capacity).padStart(4)} ${String(B.teethRowsCap).padStart(5)}/${String(B.teethPitchCap).padEnd(4)} ${String(B.built).padStart(5)} ${String(B.apex).padEnd(6)} ${String(B.demand).padStart(6)} ${String(B.placed).padStart(6)} ${f3(B.perPeriod).padStart(7)}`);
  }
  say('\n  PARITY. Teeth = Np - 1, and the rim MIDPOINT is a crest iff Np is even — so an ODD tooth count');
  say('  puts a crest at the apex and an EVEN one puts a notch there. Eva’s clock, derived: one lobe at');
  say('  twelve is count 1, two either side of twelve is count 2, three at eleven/twelve/one is count 3.');
}

if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 1));
