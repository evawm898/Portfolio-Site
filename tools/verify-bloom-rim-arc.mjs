/* ===================================================================
   verify-bloom-rim-arc.mjs — DOES THE RIM QUERY DESCRIBE THE BOUNDARY THE
   EXPORTED MESH ACTUALLY HAS? (session 38, PR 1)

     node tools/verify-bloom-rim-arc.mjs [--control] [--quick] [--json <file>]

   `petalRim()` answers, for one petal, where the rim is in space and how far
   along it a point sits (arc length s(u) on either margin). Nothing calls it
   yet, so "zero floats moved" is trivially true and proves nothing about it.
   What this tool proves instead is CORRESPONDENCE: that the curve the query
   describes IS the exported mesh's own rim, and that the arc length it reports
   matches the polyline the mesh actually draws, with a residual that is
   BOUNDED and MEASURED across the control space rather than read off one
   sample. Every figure below names its MODE (live / export) and its SAMPLING
   (the query's node count; the mesh's NU stations).

   R1 — THE RIM IS THE MESH'S RIM, exactly. At every blade station the builder
        emitted, on both margins, `rim.pointAt(u, side)` reproduces the
        captured rim point under `Object.is`, and the two rim-strip vertices
        the exporter offset from it (P +/- n * t/2, with the EMITTED normal)
        are present exactly in the position stream. Ties the query to the STL,
        never to a sibling capture.
   R2 — THE ARC IS NEVER SHORTER THAN THE CHORD, and the deficit is the mesh's.
        Between consecutive stations the reported arc (sAt(u2) - sAt(u1)) is
        >= the emitted chord — an identity of the construction (the query's
        polyline has both stations as nodes, and a refinement of a polyline is
        never shorter), asserted to fp rounding. The TOTAL deficit, reported
        length minus the mesh polyline's length over the blade, is the
        exported boundary's own chord shortfall at NU stations; its maximum
        over the sample is the correspondence residual this tool states.
   R3 — THE QUERY'S OWN ERROR, by Richardson. The length at RIM_SAMPLES and
        at 2x, 4x and 8x. The CONVERGENCE ORDER is read at the FINE end
        (log2 of the last two differences) and must exceed 1.0 — a kink cut
        by a chord converges at first order at best, and the seam-less ladder
        the control feeds this clause reads about 0. It is NOT asserted to be
        2: measured on this tree, a smooth arc reads 2.0, the LIVE floor's
        steeper apex is pre-asymptotic at 4096 and reaches 2.0 by 16k, and
        the n != 1 apex power laws (a vertical tangent at s = 1 above n = 1,
        at the widest point below it) converge at 1.2–1.7 under the graded
        patch — genuinely, steadily, and boundedly. The BOUND at RIM_SAMPLES
        is then d1 + d2 + d3 * 2^p / (2^p - 1) with p the measured fine-end
        order: the three measured differences plus the geometric tail they
        imply. Its maximum over the sample is the residual bound this tool
        states, per mode.
   R4 — THE INVERSE ROUND-TRIPS: uAt(sAt(u)) = u within 1e-9 on a ladder that
        misses the nodes, and sAt is strictly increasing along it.
   R5 — THE NODES THE QUERY PLACES ARE THE RIM'S OWN TANGENT BREAKS. An
        INDEPENDENT detector walks the rim CURVE P(u, +1) — not halfWidthAt,
        so it sees a break from any producer, the form onset included —
        brackets a jump in the central-difference tangent, bisects to it, and
        classifies each candidate by its one-sided tangents at 1e-6 (a steep
        smooth stretch brackets too and is rejected there). Every genuine
        break it finds, on the six builder arms in both modes, must lie within
        1e-5 of a node the query inserted. The two seams named in the brief
        are probed by name as well, in the mode each belongs to.
   R6 — THE TERMINAL FACE: the width the margins meet across at u = 1, the
        curve and the mesh's NV - 1 chords, reported per state.

   THE SAMPLE. Six builder arms, every petal-reaching slider at both ends,
   the exponent at 0.60 / 1.00 / 2.50 / 3.00, the tapers that move the widest
   point and the seams, cup and cup gradient, roll and its taper, curl, twist,
   tilt, the buckle's three at their corners, the thinnest and thickest sheet,
   the shortest and longest petal, a domed hub, a sphere head, the innermost
   petal of six whorls at the smallest layer size, and two-control products
   (exponent x cup, exponent x buckle, cup x buckle, roll x buckle, all form
   max, all form max x buckle max). Both modes for every state.

   WHAT IT IS BLIND TO, in its own header: the FOOT's edges (s < 0), a cleft's
   inner edges (capability petals have more boundary than two margins), and
   any state it does not name. `--quick` runs two states to prove the rig.

   `--control` is the positive control and is required before quoting a pass:
   R1 is evaluated at u + 1e-9 and must fire on every state; R5 is run on a
   query built over a surface that DECLARES NO BREAKS (the same `at`, the
   same profile, `tangentBreaks` returning []) and must fire on every arm
   that has one; the residual that costs is printed beside the declared
   query's; and the vacuity guards are checked. The ORDER clause is not the
   control's witness: a kink cut by chords produces erratic differences, and
   at the fine end those can read any order (measured 2.5 on the default
   export with no seam nodes at all), so R5 carries the seam claim and R3
   carries only the tail's convergence.
   =================================================================== */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { firstSlot } from './bloom-first-slot.mjs';

const argv = process.argv.slice(2);
const CONTROL = argv.includes('--control');
const QUICK = argv.includes('--quick');
const JSON_OUT = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const load = (f) => import(pathToFileURL(path.join(ROOT, f)).href);
const G = await load('bloom-geometry.js');
const { DEFAULTS, CONTROLS } = await load('bloom-registry.js');

const NV = 10;   // columns across one span — asserted against the captured grid below
const bad = [];
const table = [];

/* ---------- THE SAMPLE ---------------------------------------------- */
const ctl = (id) => { const c = CONTROLS.find((x) => x.id === id); if (!c) throw new Error(`no control ${id}`); return c; };
const both = (id, extra = {}) => [[`${id} min (${ctl(id).min})`, { [id]: ctl(id).min, ...extra }], [`${id} max (${ctl(id).max})`, { [id]: ctl(id).max, ...extra }]];
const STATES = [];
const push = (name, set, layer = 0) => STATES.push({ name, set, layer });
push('DEFAULT (flat)', {});
push('FORMED (cup + curl + roll + twist)', { petalCup: 0.6, petalSpineCurl: 120, petalRoll: 90, petalTwist: 45 });
push('DOMED (headRise 0.6)', { headRise: 0.6 });
push('CURL FAMILY (bias + start)', { petalSpineCurl: 150, curlBias: 0.5, curlStart: 0.3 });
push('BUCKLED (0.5 x, f 3)', { buckleAmp: 0.5, buckleFreq: 3 });
push('THINNED (tipThinning 0.4)', { tipThinning: 0.4 });
if (!QUICK) {
  for (const v of [0.6, 1, 2.5, 3]) push(`petalTipShape ${v}`, { petalTipShape: v });
  for (const id of ['petalBaseTaper', 'petalTipTaper', 'petalCup', 'petalCupGradient', 'petalRoll', 'petalSpineCurl', 'petalTwist', 'petalTilt', 'petalLength', 'petalWidth', 'sheetThickness', 'footDelicacy', 'headRise']) for (const [n, s] of both(id)) push(n, s);
  push('petalBaseTaper max x petalTipTaper min (widest point far out)', { petalBaseTaper: 3, petalTipTaper: 0.6 });
  push('petalBaseTaper min x petalTipTaper max (widest point at the base)', { petalBaseTaper: 0.3, petalTipTaper: 4 });
  push('tipThinning max (0.8)', { tipThinning: 0.8 });
  for (const [n, s] of both('petalRollTaper', { petalRoll: 330 })) push(`${n} under roll 330`, s);
  for (const [n, s] of both('curlBias', { petalSpineCurl: 360 })) push(`${n} under curl 360`, s);
  for (const [n, s] of both('curlStart', { petalSpineCurl: 360 })) push(`${n} under curl 360`, s);
  push('petalApexSweep max under cup 1.2', { petalApexSweep: 1, petalCup: 1.2 });
  push('buckleAmp max (0.6) at f 3', { buckleAmp: 0.6, buckleFreq: 3 });
  for (const f of [1, 7]) push(`buckleFreq ${f} at amp 0.6`, { buckleAmp: 0.6, buckleFreq: f });
  for (const p of [2, 6]) push(`buckleEnv ${p} at amp 0.6, f 3`, { buckleAmp: 0.6, buckleFreq: 3, buckleEnv: p });
  push('SPHERE head (CONTINUOUS x 24)', { placement: 'CONTINUOUS', hubShape: 'SPHERE', petalCount: 24 });
  push('CONTINUOUS x 3 turns', { placement: 'CONTINUOUS', layerCount: 3 });
  push('FAN', { placement: 'FAN' });
  push('6 whorls x layerSize 0.4 — the INNERMOST petal (layer 5)', { layerCount: 6, layerSize: 0.4 }, 5);
  push('petalTipShape 0.60 x cup 1.2', { petalTipShape: 0.6, petalCup: 1.2 });
  push('petalTipShape 3.00 x cup 1.2', { petalTipShape: 3, petalCup: 1.2 });
  push('petalTipShape 0.60 x buckle 0.6 f 7', { petalTipShape: 0.6, buckleAmp: 0.6, buckleFreq: 7 });
  push('petalTipShape 3.00 x buckle 0.6 f 7', { petalTipShape: 3, buckleAmp: 0.6, buckleFreq: 7 });
  push('cup 1.2 x buckle 0.6 f 7', { petalCup: 1.2, buckleAmp: 0.6, buckleFreq: 7 });
  push('roll 330 x buckle 0.6 f 7', { petalRoll: 330, buckleAmp: 0.6, buckleFreq: 7 });
  push('ALL FORM MAX (cup 1.2, curl 360, roll 330, twist 180)', { petalCup: 1.2, petalSpineCurl: 360, petalRoll: 330, petalTwist: 180 });
  push('ALL FORM MAX x buckle 0.6 f 7 x petalTipShape 3.00', { petalCup: 1.2, petalSpineCurl: 360, petalRoll: 330, petalTwist: 180, buckleAmp: 0.6, buckleFreq: 7, petalTipShape: 3 });
  push('the thinnest sheet x the shortest petal x petalTipShape 0.60', { sheetThickness: 0.6, petalLength: 20, petalTipShape: 0.6 });
}

/* ---------- helpers -------------------------------------------------- */
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const key = (p) => `${p[0]},${p[1]},${p[2]}`;
/* The instrument's OWN chord sum over an arbitrary node list — a second
   route to the same quantity, used only to show the order clause can see a
   seam-less ladder (the control). Never the answer. */
const chordSum = (surface, side, nodes) => { let s = 0, prev = surface.at(nodes[0], side).P; for (let i = 1; i < nodes.length; i++) { const q = surface.at(nodes[i], side).P; s += dist(q, prev); prev = q; } return s; };

let statesRun = 0, stationsR1 = 0, skinsR1 = 0, pairsR2 = 0, r3Assessed = 0;
let maxDeficitRel = { v: -1 }, maxDeficitMm = { v: -1 }, maxR3 = { v: -1 }, maxR3Rel = { v: -1 }, minArcMinusChord = { v: Infinity }, minOrder = { v: null };
let worstSeamGap = { v: -1 };

for (const st of STATES) {
  for (const exportMode of [false, true]) {
    const modeTag = exportMode ? 'EXPORT' : 'LIVE';
    const state = { ...DEFAULTS, ...st.set };
    const acc = new G.MeshBuilder({ exportMode, captureGrid: true });
    const { ring, slot } = firstSlot(state, acc, st.layer);
    const rep = G.buildPetalInto(acc, state, ring, slot, null);
    const surface = G.petalSurface(state, ring, slot, null, acc);
    const rim = G.petalRim(surface);
    const rim2 = G.petalRim(surface, 2 * G.RIM_SAMPLES);
    const rim4 = G.petalRim(surface, 4 * G.RIM_SAMPLES);
    const rim8 = G.petalRim(surface, 8 * G.RIM_SAMPLES);
    statesRun++;
    if (rep.grid.length !== 1) { bad.push(`${st.name} [${modeTag}]: ${rep.grid.length} panels — this tool describes single-span petals only`); continue; }
    const rows = rep.grid[0].rows;
    if (rows.some((r) => r.v.length !== NV)) { bad.push(`${st.name} [${modeTag}]: a captured row has ${rows.find((r) => r.v.length !== NV).v.length} columns, not ${NV}`); continue; }
    const blade = rows.filter((r) => r.u > 0);
    const ringRow = rows[rep.footRows - 1];
    if (!blade.length || !ringRow || ringRow.u !== 0) { bad.push(`${st.name} [${modeTag}]: no blade rows or no ring row captured`); continue; }
    const verts = new Set();
    for (let i = 0; i < acc.positions.length; i += 3) verts.add(key([acc.positions[i], acc.positions[i + 1], acc.positions[i + 2]]));

    const rec = { state: st.name, mode: modeTag, set: st.set, layer: st.layer, stations: blade.length, samples: rim.samples, breaks: rim.breaks.map((b) => ({ u: b.u, kind: b.kind, from: b.from, to: b.to })), sides: {} };
    for (const side of G.RIM_SIDES) {
      const col = side > 0 ? NV - 1 : 0;
      /* R1 */
      let r1Pts = 0, r1Skin = 0;
      for (const r of blade) {
        if (r.v[col] !== side) { bad.push(`${st.name} [${modeTag}]: column ${col} carries v = ${r.v[col]}, not ${side} — the margin is not where this tool thinks`); break; }
        const q = rim.pointAt(CONTROL ? r.u + 1e-9 : r.u, side);
        stationsR1++;
        for (let k = 0; k < 3; k++) if (!Object.is(q[k], r.mid[col][k])) { r1Pts++; break; }
        const n = r.normal[col], h = r.thickness / 2;
        const top = key([q[0] + n[0] * h, q[1] + n[1] * h, q[2] + n[2] * h]);
        const bot = key([q[0] - n[0] * h, q[1] - n[1] * h, q[2] - n[2] * h]);
        if (verts.has(top) && verts.has(bot)) skinsR1 += 2; else r1Skin++;
      }
      if (r1Pts) bad.push(`R1: ${st.name} [${modeTag}] side ${side}: ${r1Pts} of ${blade.length} stations — the rim point is not the captured rim point`);
      if (r1Skin) bad.push(`R1: ${st.name} [${modeTag}] side ${side}: ${r1Skin} of ${blade.length} stations — the rim-strip vertices offset from the query's point are absent from the emitted stream`);

      /* R2 */
      let poly = 0, minAmC = Infinity, maxChordDeficit = { v: -1, u: null }, prevS = rim.sAt(blade[0].u, side), prevP = blade[0].mid[col];
      for (let i = 1; i < blade.length; i++) {
        const s = rim.sAt(blade[i].u, side), arc = s - prevS, chord = dist(blade[i].mid[col], prevP);
        pairsR2++;
        poly += chord;
        const d = arc - chord;
        if (d < minAmC) minAmC = d;
        if (d > maxChordDeficit.v) maxChordDeficit = { v: d, u: blade[i].u };
        prevS = s; prevP = blade[i].mid[col];
      }
      const S = rim.sAt(1, side) - rim.sAt(blade[0].u, side);
      const deficit = S - poly, deficitRel = deficit / S;
      if (minAmC < -1e-9 * S) bad.push(`R2: ${st.name} [${modeTag}] side ${side}: a station pair's reported arc is SHORTER than its emitted chord by ${(-minAmC).toExponential(3)} mm — the query's polyline does not contain the stations`);
      if (minAmC < minArcMinusChord.v) minArcMinusChord = { v: minAmC, where: `${st.name} [${modeTag}] side ${side}` };
      if (deficitRel > maxDeficitRel.v) maxDeficitRel = { v: deficitRel, where: `${st.name} [${modeTag}] side ${side}`, S, poly };
      if (deficit > maxDeficitMm.v) maxDeficitMm = { v: deficit, where: `${st.name} [${modeTag}] side ${side}`, S, poly };
      /* The u = 0 seam: the rim's own start against the ring row's margin.
         Exact on a flat foot (same expression); on a dome the ring row is an
         arc across and the blade's row plan a chord, so the gap is the arc's
         own sagitta at v = +/-1 — reported, not asserted. */
      const seam0 = dist(rim.pointAt(0, side), ringRow.mid[col]);

      /* R3 */
      const L1 = rim.length(side), L2 = rim2.length(side), L4 = rim4.length(side), L8 = rim8.length(side);
      const d1 = Math.abs(L2 - L1), d2 = Math.abs(L4 - L2), d3 = Math.abs(L8 - L4);
      let orderCoarse = null, orderFine = null, bound = null;
      if (d2 > 1e-10 * L1 && d3 > 1e-12 * L1) {
        orderCoarse = d1 > 0 ? Math.log2(d1 / d2) : null;
        orderFine = Math.log2(d2 / d3);
        r3Assessed++;
        if (!(orderFine > 1.0)) bad.push(`R3: ${st.name} [${modeTag}] side ${side}: the length converges at order ${orderFine.toFixed(2)} at the fine end (${d2.toExponential(2)} -> ${d3.toExponential(2)} mm per doubling) — at or below first order a kink is being cut by a chord: a tangent break this surface did not declare`);
        const p = Math.max(orderFine, 0.5);
        bound = d1 + d2 + d3 * Math.pow(2, p) / (Math.pow(2, p) - 1);
      } else {
        /* Differences at fp noise: the bound is the noise itself. */
        bound = d1 + d2 + d3;
      }
      if (bound > maxR3.v) maxR3 = { v: bound, where: `${st.name} [${modeTag}] side ${side}`, L1, L8, orderFine };
      if (bound / L1 > maxR3Rel.v) maxR3Rel = { v: bound / L1, where: `${st.name} [${modeTag}] side ${side}` };
      if (orderFine !== null && (minOrder.v === null || orderFine < minOrder.v)) minOrder = { v: orderFine, where: `${st.name} [${modeTag}] side ${side}` };

      /* R4 */
      let r4 = 0, mono = 0, prev = -1;
      for (const u of [0.0137, 0.0579, 0.1, 0.2, 0.357, 0.5, 0.7, 0.9, 0.97, 0.9924, 0.9996, 1]) {
        const s = rim.sAt(u, side);
        if (!(s > prev)) mono++;
        prev = s;
        const back = rim.uAt(s, side);
        if (Math.abs(back - u) > 1e-9) r4++;
      }
      if (r4) bad.push(`R4: ${st.name} [${modeTag}] side ${side}: uAt(sAt(u)) missed u by more than 1e-9 at ${r4} probes`);
      if (mono) bad.push(`R4: ${st.name} [${modeTag}] side ${side}: sAt is not strictly increasing at ${mono} probes`);

      rec.sides[side] = { length: L1, meshPolyline: poly, bladeArc: S, deficitMm: deficit, deficitRel, maxChordDeficitMm: maxChordDeficit.v, maxChordDeficitAtU: maxChordDeficit.u, minArcMinusChord: minAmC, richardson: { L1, L2, L4, L8, d1, d2, d3, orderCoarse, orderFine, boundMm: bound }, seamAtRingMm: seam0 };
    }
    rec.tipFace = { ...rim.tipFace, twoH: 2 * surface.profile.halfWidthAt(1) };
    rec.loopLength = rim.loopLength;
    table.push(rec);
  }
}

/* ---------- R5: the rim's tangent breaks, independently ---------------- */
const NAMED = { LIVE: [0.057939, 0.999562], EXPORT: [0.057939, 0.992424] };
const ARMS = STATES.slice(0, QUICK ? 2 : 6);
let r5Found = 0, r5Fired = 0;
const unit = (v) => { const L = Math.hypot(v[0], v[1], v[2]); return [v[0] / L, v[1] / L, v[2] / L]; };
const angleDeg = (a, b) => Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180 / Math.PI;
for (const st of ARMS) {
  for (const exportMode of [false, true]) {
    const modeTag = exportMode ? 'EXPORT' : 'LIVE';
    const state = { ...DEFAULTS, ...st.set };
    const acc = new G.MeshBuilder({ exportMode });
    const { ring, slot } = firstSlot(state, acc, st.layer);
    const surface = G.petalSurface(state, ring, slot, null, acc);
    /* THE CONTROL'S SURFACE: the same law, declaring no breaks. */
    const probed = CONTROL ? { ...surface, tangentBreaks: () => [] } : surface;
    const rim = G.petalRim(probed);
    const P = (u) => surface.at(u, 1).P;
    const tc = (u) => { const e = 1e-6; return unit([P(u + e)[0] - P(u - e)[0], P(u + e)[1] - P(u - e)[1], P(u + e)[2] - P(u - e)[2]]); };
    const tf = (u) => { const e = 1e-6; return unit([P(u + e)[0] - P(u)[0], P(u + e)[1] - P(u)[1], P(u + e)[2] - P(u)[2]]); };
    const tb = (u) => { const e = 1e-6; return unit([P(u)[0] - P(u - e)[0], P(u)[1] - P(u - e)[1], P(u)[2] - P(u - e)[2]]); };
    /* THE GRID IS OFFSET BY A GOLDEN FRACTION so no designed constant lands
       on a node: a kink exactly ON a grid point evades bracket-then-bisect
       (both bracket ends see the same side of it and the bisection converges
       to nothing), which is how FORM_ONSET_END = 0.30 = 1200/4000 went
       unreported on the first run while its corner measured 24-55 degrees. */
    const N = 4000, OFF = 0.3819660112501051, JUMP_DEG = 1, found = [];
    let prevT = tc((2 + OFF) / N);
    for (let i = 2; i < N - 2; i++) {
      let a = (i + OFF) / N, b = (i + 1 + OFF) / N;
      const tB = tc(b);
      const jump = angleDeg(prevT, tB) > JUMP_DEG;
      prevT = tB;
      if (!jump) continue;
      const tL = tf(a), tR = tb(b);
      for (let k = 0; k < 60; k++) { const m = (a + b) / 2, tm = tf(m); if (angleDeg(tm, tR) < angleDeg(tm, tL)) b = m; else a = m; }
      const u = (a + b) / 2;
      const e = 1e-6;
      const L = [(P(u)[0] - P(u - e)[0]) / e, (P(u)[1] - P(u - e)[1]) / e, (P(u)[2] - P(u - e)[2]) / e];
      const R = [(P(u + e)[0] - P(u)[0]) / e, (P(u + e)[1] - P(u)[1]) / e, (P(u + e)[2] - P(u)[2]) / e];
      const nl = Math.hypot(...L), nr = Math.hypot(...R);
      const deg = angleDeg(unit(L), unit(R));
      const genuine = deg > 0.5 || Math.abs(nr / nl - 1) > 0.02;
      if (genuine && !found.some((f) => Math.abs(f.u - u) < 1e-6)) found.push({ u, deg, ratio: nr / nl });
    }
    r5Found += found.length;
    const missed = [];
    for (const f of found) {
      const gap = rim.breaks.length ? Math.min(...rim.breaks.map((b) => Math.abs(b.u - f.u))) : Infinity;
      /* THE ANGLE IS RE-READ AT THE QUERY'S EXACT NODE when one matches: the
         detector lands within ~1e-6 of a kink, so one-sided differences at
         e = 1e-6 taken THERE straddle it and read about half the true break
         (measured: 12.1 deg at the onset where the exact node reads 24.2). */
      if (gap <= 1e-5) {
        const ub = rim.breaks.reduce((a, b) => (Math.abs(b.u - f.u) < Math.abs(a.u - f.u) ? b : a)).u, e = 1e-6;
        const L = [(P(ub)[0] - P(ub - e)[0]) / e, (P(ub)[1] - P(ub - e)[1]) / e, (P(ub)[2] - P(ub - e)[2]) / e];
        const R = [(P(ub + e)[0] - P(ub)[0]) / e, (P(ub + e)[1] - P(ub)[1]) / e, (P(ub + e)[2] - P(ub)[2]) / e];
        f.deg = angleDeg(unit(L), unit(R)); f.ratio = Math.hypot(...R) / Math.hypot(...L); f.exact = ub;
      }
      if (gap > worstSeamGap.v) worstSeamGap = { v: gap, u: f.u, mode: modeTag, state: st.name };
      if (gap > 1e-5) { missed.push(f); bad.push(`R5: ${st.name} [${modeTag}]: the rim's tangent breaks at u = ${f.u.toFixed(6)} (${f.deg.toFixed(2)} deg, |dP/du| ratio ${f.ratio.toFixed(3)}) and the query placed no node within 1e-5 of it (nearest ${Number.isFinite(gap) ? gap.toExponential(2) : 'none'})`); }
    }
    if (missed.length) r5Fired++;
    if (st === STATES[0]) {
      for (const u of NAMED[modeTag]) {
        const gap = rim.breaks.length ? Math.min(...rim.breaks.map((b) => Math.abs(b.u - u))) : Infinity;
        if (gap > 1e-5) bad.push(`R5 [${modeTag}]: the named seam u = ${u} has no query node within 1e-5 (nearest ${Number.isFinite(gap) ? gap.toExponential(2) : 'none'})`);
      }
    }
    console.log(`R5 ${st.name} [${modeTag}]: detector ${found.length ? found.map((f) => `u ${f.u.toFixed(6)} (${f.deg.toFixed(2)} deg at v = +1${f.exact !== undefined ? ', read at the node' : ''})`).join(', ') : 'no tangent break'}`);
    console.log(`   query nodes:  ${rim.breaks.length ? rim.breaks.map((b) => `${b.kind === 'TERM_CHANGE' ? `${b.from}->${b.to}` : b.kind === 'FORM_ONSET' ? 'form onset' : 'tip-law join'} @ ${b.u.toFixed(6)}`).join(', ') : 'NONE DECLARED'}`);
    if (CONTROL) {
      const declared = G.petalRim(surface), ref = G.petalRim(surface, 8 * G.RIM_SAMPLES);
      console.log(`   control residual at ${G.RIM_SAMPLES} against 8x: no breaks ${Math.abs(rim.length(1) - ref.length(1)).toExponential(2)} mm, declared ${Math.abs(declared.length(1) - ref.length(1)).toExponential(2)} mm`);
    }
  }
}
if (!r5Found) bad.push('R5: VACUOUS — the independent detector found no tangent break on any arm, which contradicts the outline\'s Math.max construction; the detector is broken');
/* ---------- validity --------------------------------------------------- */
if (!statesRun) bad.push('VACUOUS: no state was built');
if (!stationsR1) bad.push('VACUOUS: R1 compared no stations');
if (!CONTROL && !skinsR1) bad.push('VACUOUS: R1 tied no skin vertex to the emitted stream');
if (!pairsR2) bad.push('VACUOUS: R2 compared no station pairs');
if (!r3Assessed) bad.push('VACUOUS: R3 assessed no convergence order (every difference sat at fp noise)');

/* ---------- report ----------------------------------------------------- */
console.log(`\n${statesRun} builds (${STATES.length} states x 2 modes), ${stationsR1.toLocaleString()} station x margin comparisons, ${skinsR1.toLocaleString()} rim-strip vertices tied to the emitted stream, ${pairsR2.toLocaleString()} station pairs.`);
console.log(`\nR2 — the exported boundary against the reported arc (NU ${G.BLADE_ROWS} stations; the query at ${G.RIM_SAMPLES} cells + seam nodes):`);
console.log(`   min (arc - chord) over every station pair: ${minArcMinusChord.v.toExponential(3)} mm  [${minArcMinusChord.where}]  — never negative beyond rounding`);
console.log(`   max total deficit, relative: ${(100 * maxDeficitRel.v).toFixed(3)}% of ${maxDeficitRel.S.toFixed(3)} mm (mesh polyline ${maxDeficitRel.poly.toFixed(3)})  [${maxDeficitRel.where}]`);
console.log(`   max total deficit, absolute: ${maxDeficitMm.v.toFixed(4)} mm of ${maxDeficitMm.S.toFixed(3)}  [${maxDeficitMm.where}]`);
console.log(`R3 — the query's own residual bound at RIM_SAMPLES (three measured doublings plus the tail the fine-end order implies), ${r3Assessed} sides with a measurable order:`);
console.log(`   max ${maxR3.v.toExponential(3)} mm  (${maxR3.L1.toFixed(6)} at 1x -> ${maxR3.L8.toFixed(6)} at 8x, fine-end order ${maxR3.orderFine === null ? 'n/a' : maxR3.orderFine.toFixed(2)})  [${maxR3.where}]`);
console.log(`   max relative ${maxR3Rel.v.toExponential(3)}  [${maxR3Rel.where}]`);
console.log(`   lowest fine-end order ${minOrder.v === null ? 'n/a' : minOrder.v.toFixed(2)}  [${minOrder.where}]  (a chord across an undeclared kink reads <= 1)`);
console.log(`R5 — worst gap between an independently located seam and the nearest query node: ${worstSeamGap.v === -1 ? 'n/a' : worstSeamGap.v.toExponential(2)} (u ${worstSeamGap.u?.toFixed(6)}, ${worstSeamGap.mode})`);
const modes = ['LIVE', 'EXPORT'];
for (const m of modes) {
  const rs = table.filter((r) => r.mode === m);
  const worst = rs.reduce((a, r) => (r.sides[1].deficitRel > (a ? a.sides[1].deficitRel : -1) ? r : a), null);
  const worstR3 = rs.reduce((a, r) => (r.sides[1].richardson.boundMm > (a ? a.sides[1].richardson.boundMm : -1) ? r : a), null);
  if (worst) console.log(`   ${m}: worst mesh deficit ${(100 * worst.sides[1].deficitRel).toFixed(3)}% [${worst.state}]; worst query bound ${worstR3.sides[1].richardson.boundMm.toExponential(2)} mm [${worstR3.state}]`);
}
if (JSON_OUT) { fs.writeFileSync(JSON_OUT, JSON.stringify({ samples: G.RIM_SAMPLES, stations: G.BLADE_ROWS, table }, null, 1)); console.log(`\nper-state table written to ${JSON_OUT}`); }

if (bad.length) {
  console.log(`\n${CONTROL ? 'CONTROL RESULT' : 'FAIL'} — ${bad.length} finding(s):`);
  for (const b of bad.slice(0, 60)) console.log('  ' + b);
  if (bad.length > 60) console.log(`  ... and ${bad.length - 60} more`);
  if (CONTROL) {
    const r1Fired = bad.some((b) => b.startsWith('R1'));
    const r5Any = bad.some((b) => b.startsWith('R5'));
    const nothingElse = bad.every((b) => b.startsWith('R1') || b.startsWith('R5'));
    console.log(`\npositive control: R1 fired ${r1Fired}; R5 fired on the break-less query on ${r5Fired} of ${ARMS.length * 2} arm x mode builds; nothing else fired ${nothingElse}`);
    process.exit(r1Fired && r5Any && r5Fired === ARMS.length * 2 && nothingElse ? 0 : 1);
  }
  process.exit(1);
}
if (CONTROL) { console.log('\nCONTROL DID NOT FIRE'); process.exit(1); }
console.log('\nPASS — the rim query is the exported mesh\'s own rim at every station, its arc is never shorter than the emitted chord, and its residual is bounded as stated above.');
