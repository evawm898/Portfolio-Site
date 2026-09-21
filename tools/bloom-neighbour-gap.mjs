/* ===================================================================
   bloom-neighbour-gap.mjs — HOW CLOSE IS A PETAL TO ITS NEIGHBOUR, and what
   a graded spacing, size or form does to that. The organic-variance
   discovery's instrument (docs/bloom-organic-variance-discovery.md). An
   INSTRUMENT ONLY: it is wired to no gate, it asserts nothing, and it emits
   no geometry — it builds the shipped petals in Node and measures them.

     node tools/bloom-neighbour-gap.mjs [--section 1|2|3|4] [--quick]

   WHAT IT MEASURES. The nearest mid-surface distance between any two petals
   of a build (point-to-triangle over the builder's own captured lattice, both
   directions, AABB-prefiltered), reported twice: BLADE (rows with
   u >= ROOT_BLEND_END) and LAMINA (every row above the foot, u > 0). The SKIN
   GAP is that distance less the sheet: negative means the two skins cross.
   Beside it, the REAL census (tools/bloom-self-intersection.mjs) run over the
   petal triangles alone, with the hub's interior excluded by triangle
   centroid, so `cross` is petal-against-petal crossing pairs — cross-shell,
   which the export contract PERMITS and which no gate here has ever counted.
   Every figure names its MODE (EXPORT unless a row says LIVE) and its
   sampling (the builder's own 56 x 10 lattice; the census's own triangles).

   THE SPACING GRADE it applies is a pitch density 1 + A cos(f theta + phi)
   (a ramp 1 + A(2i/(n-1) - 1) at f = 0), normalised to the whorl's own span,
   slot 0 held at its nominal azimuth — so the tightest pitch is (1 - A) of
   nominal and A -> 1 is coincidence. It is applied to ONE field of the real
   slot payload (`azimuth`) on a COPY; the payload itself comes from the real
   `buildWhorlInto`, never synthesised (tools/bloom-first-slot.mjs's rule).

   THE ANALYTIC MODEL beside the drawn figure is the flat-chord law: per row,
   the spine's plan radius r and the row's tangential half-extent h read off
   the EMITTED row, neighbours at pitch D then 2 (r sin(D/2) - h cos(D/2))
   apart. It is exact on a flat petal and WRONG under cup in the unsafe
   direction — which is why it is printed beside the drawing and not used.

   §1 NOMINAL SPACING: the count sweep 3..40, widths, spread, tilt, LIVE, the
      four placements, layers. The finding: neighbouring blades CROSS from 7
      petals up on the default form (the shipped 8: skin gap -1.170 mm,
      1,504 crossing pairs outside the hub).
   §2 THE GRADE SWEEP on gap-positive states: the first A under the 1.0 mm
      floor, at which the skins touch, and at which the census counts a
      crossing — drawn against analytic.
   §3 SIZE AND FORM PER SLOT, through the two routes the builder has: the
      whorl primitive's `slot.scale`, and a per-slot state spread (what a
      slot-level override record resolves to), clamped into the base ranges.
   §4 FOOT CROWDING under the grade (tools/bloom-crowding.mjs's nearestFeet
      and stackDepth on the graded feet). That module imports the harness,
      which imports playwright-core at module load, so this section needs the
      dev deps installed like every other tool here; §1-§3 need nothing.

   WHAT IT DOES NOT SAY. "Gap" here is petal against petal; the within-shell
   census (V5, X1, X2) is a different question and is reported only as a
   column. A crossing pair inside the hub's disc is the feet overlapping by
   design and is excluded; a crossing at the root exit (u < ROOT_BLEND_END,
   outside the hub) is INCLUDED in `cross` and is the crowding instrument's
   region — the LAMINA column is where it shows, the BLADE column excludes it.
   =================================================================== */
import { pathToFileURL } from 'node:url';
import * as G from '../bloom-geometry.js';
import { DEFAULTS } from '../bloom-registry.js';
import { census } from './bloom-self-intersection.mjs';

export { G, DEFAULTS, census };
const TAU = Math.PI * 2;
const T_SHEET = G.SHEET_THICKNESS_MM, FLOOR = G.MIN_FEATURE_MM;
const clampTo = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ---------------------------------------------------------- the grade */
export function gradedAzimuths(nominal, { A = 0, f = 1, phi = 0 } = {}) {
  const n = nominal.length; if (A === 0) return nominal.slice();
  const w = [];
  for (let i = 0; i < n; i++) {
    const mid = nominal[i] + (TAU / n) / 2;
    w.push(f === 0 ? 1 + A * (n > 1 ? (2 * i) / (n - 1) - 1 : 0) : 1 + A * Math.cos(f * mid + phi));
  }
  const s = w.reduce((a, b) => a + b, 0);
  const out = [nominal[0]]; for (let i = 1; i < n; i++) out.push(out[i - 1] + (TAU * w[i - 1]) / s);
  return out;
}
export function minPitchFactor(nominal, opts) {
  const az = gradedAzimuths(nominal, opts); const n = az.length; let m = Infinity;
  for (let i = 0; i < n; i++) m = Math.min(m, (i + 1 < n ? az[i + 1] : az[0] + TAU) - az[i]);
  return m / (TAU / n);
}

/* ------------------------------------------------------------ the build */
/* Every petal of a state through the REAL whorl primitive and the REAL
   builder. `remap(azimuths, slots)` returns new azimuths; `perSlot(slot)`
   returns `{ scale, state }` overrides for the size/form routes. */
export function buildPetals(state, { remap = null, perSlot = null, exportMode = true } = {}) {
  const acc = new G.MeshBuilder({ exportMode, captureGrid: true });
  const fr = G.footRing(state, acc);
  const petals = [];
  const whorl = (count, radius, sizeRamp, angleRamp, phase, placement, fan, ringOf) => {
    const slots = [];
    G.buildWhorlInto({ count, radius, height: 0, sizeRamp, angleRamp, phase, placement, fan, blade: (slot) => slots.push({ ...slot }) });
    const az = slots.map((s) => s.azimuth);
    const az2 = remap ? remap(az, slots) : az;
    slots.forEach((slot, i) => {
      const over = perSlot ? perSlot(slot) : null;
      const s2 = { ...slot, azimuth: az2[i], scale: over && over.scale !== undefined ? over.scale : slot.scale };
      const ps = over && over.state ? over.state : state;
      const before = acc.triangleCount;
      const p = G.buildPetalInto(acc, ps, ringOf(i), s2, null, false);
      petals.push({ p, rows: p.grid.flatMap((g) => g.rows), tri: [before, acc.triangleCount], azimuth: az2[i], nominalAz: az[i], ring: ringOf(i), index: i, scale: s2.scale, state: ps });
    });
  };
  if (fr.continuousMode) {
    whorl(fr.rings.length, (i) => fr.rings[i].radius, (i) => fr.rings[i].scale, (i) => fr.rings[i].tiltExtra, fr.rings[0].phase, state.placement, null, (i) => fr.rings[i]);
  } else {
    for (let L = 0; L < fr.layerCount; L++) {
      const slotsFor = fr.slotRings[L]; const ring = slotsFor[0];
      whorl(fr.slotCount, ring.radius, () => ring.scale, () => ring.tiltExtra, ring.phase, state.placement, fr.fan, (i) => slotsFor[i]);
    }
  }
  return { acc, fr, petals };
}

/* ---------------------------------------------------- the distances */
/* Closest-point distance from a point to a triangle (Ericson, RTCD 5.1.5). */
export function ptTri(p, a, b, c) {
  const ab = [b[0]-a[0], b[1]-a[1], b[2]-a[2]], ac = [c[0]-a[0], c[1]-a[1], c[2]-a[2]], ap = [p[0]-a[0], p[1]-a[1], p[2]-a[2]];
  const dot = (u, v) => u[0]*v[0]+u[1]*v[1]+u[2]*v[2];
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  const dist = (q) => Math.hypot(p[0]-q[0], p[1]-q[1], p[2]-q[2]);
  if (d1 <= 0 && d2 <= 0) return dist(a);
  const bp = [p[0]-b[0], p[1]-b[1], p[2]-b[2]]; const d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return dist(b);
  const vc = d1*d4 - d3*d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return dist([a[0]+v*ab[0], a[1]+v*ab[1], a[2]+v*ab[2]]); }
  const cp = [p[0]-c[0], p[1]-c[1], p[2]-c[2]]; const d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return dist(c);
  const vb = d5*d2 - d1*d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return dist([a[0]+w*ac[0], a[1]+w*ac[1], a[2]+w*ac[2]]); }
  const va = d3*d6 - d5*d4;
  if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return dist([b[0]+w*(c[0]-b[0]), b[1]+w*(c[1]-b[1]), b[2]+w*(c[2]-b[2])]); }
  const denom = 1 / (va + vb + vc); const v = vb * denom, w = vc * denom;
  return dist([a[0]+ab[0]*v+ac[0]*w, a[1]+ab[1]*v+ac[1]*w, a[2]+ab[2]*v+ac[2]*w]);
}
/* A petal's lamina as points and triangles over rows with u >= uMin (u > 0 drops the foot rows). */
export function lamina(rows, uMin) {
  const keep = rows.filter((r) => r.u > 0 && r.u >= uMin);
  const pts = keep.flatMap((r) => r.mid);
  const tris = [];
  for (let k = 0; k + 1 < keep.length; k++) for (let j = 0; j + 1 < keep[k].mid.length; j++) {
    const a = keep[k].mid[j], b = keep[k].mid[j+1], c = keep[k+1].mid[j], d = keep[k+1].mid[j+1];
    tris.push([a, b, c]); tris.push([b, d, c]);
  }
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const p of pts) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
  return { pts, tris, lo, hi, rows: keep };
}
export function boxGap(A, B) { let s = 0; for (let k = 0; k < 3; k++) { const d = Math.max(0, A.lo[k] - B.hi[k], B.lo[k] - A.hi[k]); s += d * d; } return Math.sqrt(s); }
export function laminaDistance(A, B, bound = Infinity) {
  let best = bound;
  if (boxGap(A, B) >= best) return best;
  for (const [P, T] of [[A.pts, B.tris], [B.pts, A.tris]]) for (const p of P) for (const tr of T) { const d = ptTri(p, tr[0], tr[1], tr[2]); if (d < best) best = d; }
  return best;
}
export function minGaps(petals) {
  const lamB = petals.map((q) => lamina(q.rows, G.ROOT_BLEND_END));
  const lamL = petals.map((q) => lamina(q.rows, 0));
  let blade = Infinity, whole = Infinity, bladePair = null, wholePair = null;
  for (let i = 0; i < petals.length; i++) for (let j = i + 1; j < petals.length; j++) {
    const db = laminaDistance(lamB[i], lamB[j], blade); if (db < blade) { blade = db; bladePair = [i, j]; }
    const dl = laminaDistance(lamL[i], lamL[j], whole); if (dl < whole) { whole = dl; wholePair = [i, j]; }
  }
  return { blade, whole, bladePair, wholePair };
}
/* Where the nearest blade approach is: (u, plan radius, z) of the closest point. */
export function nearestDetail(petals, uMin = G.ROOT_BLEND_END) {
  const lam = petals.map((q) => lamina(q.rows, uMin));
  let best = { d: Infinity, u: NaN, r: NaN, z: NaN };
  for (let i = 0; i < petals.length; i++) for (let j = i + 1; j < petals.length; j++) {
    if (boxGap(lam[i], lam[j]) >= best.d) continue;
    for (const [a, b] of [[i, j], [j, i]]) for (const r of lam[a].rows) for (const p of r.mid) for (const tr of lam[b].tris) {
      const d = ptTri(p, tr[0], tr[1], tr[2]); if (d < best.d) best = { d, i: a, j: b, u: r.u, r: Math.hypot(p[0], p[1]), z: p[2] };
    }
  }
  return best;
}
/* Crossing pairs between petals, all petal triangles and no hub (`cross` is petal-against-petal). */
export function petalCross(acc, petals) {
  const parts = petals.map((q) => acc.positions.slice(q.tri[0] * 9, q.tri[1] * 9));
  const all = new Float64Array(parts.reduce((s, p) => s + p.length, 0)); let o = 0; for (const p of parts) { all.set(p, o); o += p.length; }
  const c = census(all); return { cross: c.cross, within: c.within, shells: c.shells };
}
/* The same, with triangles whose centroid lies inside the hub disc excluded (feet overlap there by design). */
export function petalCrossOutside(acc, petals, hubR) {
  const keep = [];
  for (const q of petals) for (let k = q.tri[0]; k < q.tri[1]; k++) {
    const o = k * 9; const cx = (acc.positions[o] + acc.positions[o+3] + acc.positions[o+6]) / 3, cy = (acc.positions[o+1] + acc.positions[o+4] + acc.positions[o+7]) / 3;
    if (Math.hypot(cx, cy) > hubR) for (let m = 0; m < 9; m++) keep.push(acc.positions[o + m]);
  }
  const c = census(new Float64Array(keep)); return { cross: c.cross, within: c.within, tris: keep.length / 9 };
}
/* THE ANALYTIC (flat-chord) MODEL. */
export function analyticGap(rows, pitchRad, uMin = G.ROOT_BLEND_END) {
  let best = Infinity, at = null;
  for (const r of rows) {
    if (!(r.u > 0 && r.u >= uMin)) continue;
    const m = r.mid; const c = m[Math.floor(m.length / 2) - 1].map((x, k) => (x + m[Math.floor(m.length / 2)][k]) / 2);
    const rad = Math.hypot(c[0], c[1]); const T = [-c[1] / rad, c[0] / rad];
    let h = 0; for (const p of m) h = Math.max(h, Math.abs((p[0] - c[0]) * T[0] + (p[1] - c[1]) * T[1]));
    const g = 2 * (rad * Math.sin(pitchRad / 2) - h * Math.cos(pitchRad / 2));
    if (g < best) { best = g; at = { u: r.u, r: rad, h }; }
  }
  return { gap: best, at };
}

/* ------------------------------------------------------------- sections */
function section1(quick) {
  console.log('§1 NOMINAL SPACING — nearest blade approach between any two petals, EXPORT (one row LIVE), the builder\'s own lattice.');
  const row = (label, set, opts = {}) => {
    const state = { ...DEFAULTS, ...set }; const t0 = Date.now();
    const { acc, fr, petals } = buildPetals(state, opts);
    const g = minGaps(petals); const nd = nearestDetail(petals);
    const xo = petalCrossOutside(acc, petals, fr.hub.radius); const xa = petalCross(acc, petals);
    const pitch = fr.continuousMode ? null : (2 * Math.PI) / fr.slotCount;
    const an = pitch === null ? null : analyticGap(petals[0].rows, pitch);
    console.log(`  ${label.padEnd(30)} n ${String(petals.length).padStart(3)} hubR ${fr.hub.radius.toFixed(2).padStart(6)} | blade d_mid ${g.blade.toFixed(3).padStart(7)} skin ${(g.blade - T_SHEET).toFixed(3).padStart(7)} at u ${nd.u.toFixed(3)} r ${nd.r.toFixed(1)} z ${nd.z.toFixed(1)} | lamina d_mid ${g.whole.toFixed(3).padStart(6)} | cross outside hub ${String(xo.cross).padStart(6)} (all ${xa.cross}) within ${xa.within} | analytic ${an ? an.gap.toFixed(3).padStart(7) + ' at u ' + an.at.u.toFixed(3) + ' h ' + an.at.h.toFixed(2) : '(golden angle: no single pitch)'} | ${Date.now() - t0} ms`);
  };
  for (const n of (quick ? [5, 8] : [3, 4, 5, 6, 7, 8, 10, 13, 20, 40])) row(`RADIAL n ${n}`, { petalCount: n });
  if (quick) return;
  row('RADIAL n 8 width 8', { petalWidth: 8 });
  row('RADIAL n 8 width 30', { petalWidth: 30 });
  row('RADIAL n 8 spread 6', { spread: 6 });
  row('RADIAL n 8 spread 0.6', { spread: 0.6 });
  row('RADIAL n 8 tilt 75', { petalTilt: 75 });
  row('RADIAL n 8 tilt 0', { petalTilt: 0 });
  row('RADIAL n 8 LIVE', {}, { exportMode: false });
  row('FAN 3/side 45deg', { placement: 'FAN' });
  row('SPIRAL n 8', { placement: 'SPIRAL' });
  row('CONTINUOUS 8 x 1', { placement: 'CONTINUOUS' });
  row('CONTINUOUS 8 x 3 turns', { placement: 'CONTINUOUS', layerCount: 3 });
  row('SPHERE 24', { placement: 'CONTINUOUS', hubShape: 'SPHERE', petalCount: 24 });
  row('RADIAL 8 x 3 layers', { layerCount: 3 });
}

function section2(quick) {
  console.log('§2 THE GRADE SWEEP — first A under the 1.0 mm floor / skins touch / census crossing, DRAWN against ANALYTIC, EXPORT.');
  const sweep = (label, set, f = 1) => {
    const state = { ...DEFAULTS, ...set };
    const base = buildPetals(state);
    const nominal = base.petals.map((q) => q.nominalAz); const n = nominal.length;
    const pitch0 = (2 * Math.PI) / base.fr.slotCount; const rows0 = base.petals[0].rows;
    const solve = (target) => { let lo = 0, hi = pitch0; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (analyticGap(rows0, m).gap > target) hi = m; else lo = m; } return hi; };
    const pFloor = solve(FLOOR + T_SHEET), pTouch = solve(T_SHEET), pCross = solve(0);
    const AofPitch = (p) => { let lo = 0, hi = 0.999; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (minPitchFactor(nominal, { A: m, f }) * pitch0 > p) lo = m; else hi = m; } return lo; };
    const an = { floor: AofPitch(pFloor), touch: AofPitch(pTouch), cross: AofPitch(pCross) };
    const drawn = { floor: null, touch: null, cross: null }; const out = [];
    for (let A = 0; A <= 0.95; A += 0.05) {
      A = Math.round(A * 100) / 100;
      const { acc, fr, petals } = buildPetals(state, { remap: (az) => gradedAzimuths(az, { A, f }) });
      const g = minGaps(petals); const xo = petalCrossOutside(acc, petals, fr.hub.radius);
      const skin = g.blade - T_SHEET;
      if (drawn.floor === null && skin < FLOOR) drawn.floor = A;
      if (drawn.touch === null && skin < 0) drawn.touch = A;
      if (drawn.cross === null && xo.cross > 0) drawn.cross = A;
      out.push(`A ${A.toFixed(2)} pitch ${minPitchFactor(nominal, { A, f }).toFixed(3)} skin ${skin.toFixed(3)} cross ${xo.cross}`);
      if (xo.cross > 0 && skin < 0) break;
    }
    console.log(`\n  ${label} (f ${f}, n ${n}, nominal blade skin gap ${(minGaps(base.petals).blade - T_SHEET).toFixed(3)} mm)`);
    console.log('    ' + out.join(' | '));
    console.log(`    DRAWN first A: under floor ${drawn.floor} · skins touch ${drawn.touch} · census crossing ${drawn.cross}`);
    console.log(`    ANALYTIC A:    under floor ${an.floor.toFixed(3)} · skins touch ${an.touch.toFixed(3)} · mid cross ${an.cross.toFixed(3)}   (pitch factors ${(pFloor / pitch0).toFixed(3)} / ${(pTouch / pitch0).toFixed(3)} / ${(pCross / pitch0).toFixed(3)})`);
  };
  sweep('RADIAL n 5 default petal', { petalCount: 5 });
  if (quick) { sweep('RADIAL n 5 cup 1.2', { petalCount: 5, petalCup: 1.2 }); return; }
  sweep('RADIAL n 5 default petal RAMP', { petalCount: 5 }, 0);
  sweep('RADIAL n 6 default petal', { petalCount: 6 });
  sweep('RADIAL n 8 width 8', { petalWidth: 8 });
  sweep('RADIAL n 8 spread 6', { spread: 6 });
  sweep('RADIAL n 4 width 30', { petalCount: 4, petalWidth: 30 });
  sweep('RADIAL n 5 cup 1.2', { petalCount: 5, petalCup: 1.2 });
  sweep('RADIAL n 5 cup -0.8', { petalCount: 5, petalCup: -0.8 });
  sweep('RADIAL n 5 roll 120', { petalCount: 5, petalRoll: 120 });
  sweep('RADIAL n 5 twist 90', { petalCount: 5, petalTwist: 90 });
  sweep('RADIAL n 5 curl 120', { petalCount: 5, petalSpineCurl: 120 });
  sweep('RADIAL n 5 curl -120', { petalCount: 5, petalSpineCurl: -120 });
  sweep('RADIAL n 5 tilt 75', { petalCount: 5, petalTilt: 75 });
  sweep('RADIAL n 5 buckle 0.6 f3', { petalCount: 5, buckleAmp: 0.6 });
}

function section3(quick) {
  console.log('§3 SIZE AND FORM PER SLOT — slot.scale for size, a per-slot state spread for cup/curl/twist (clamped into the base ranges), EXPORT.');
  const report = (label, state, { sizeA = 0, cupA = 0, curlA = 0, twistA = 0, f = 1, phi = 0 } = {}) => {
    const perSlot = (slot) => {
      const g = Math.cos(f * slot.azimuth + phi);
      return { scale: slot.scale * (1 + sizeA * g), state: { ...state,
        petalCup: clampTo(state.petalCup + cupA * g, -0.8, 1.2),
        petalSpineCurl: clampTo(state.petalSpineCurl + curlA * g, -180, 360),
        petalTwist: clampTo(state.petalTwist + twistA * g, -180, 180) } };
    };
    const { acc, fr, petals } = buildPetals(state, { perSlot });
    const g = minGaps(petals); const xo = petalCrossOutside(acc, petals, fr.hub.radius);
    const c = census(new Float64Array(acc.positions));
    console.log(`  ${label.padEnd(44)} blade skin ${(g.blade - T_SHEET).toFixed(3).padStart(7)} lamina d ${g.whole.toFixed(3).padStart(6)} cross-out ${String(xo.cross).padStart(5)} within ${String(c.within).padStart(5)} worst ${c.worstSpanMm.toFixed(4)} tris ${acc.triangleCount} seamStep ${petals.map((q) => q.p.bladeLadder.seamStep).join(',')} scales ${petals.map((q) => q.scale.toFixed(2)).join('/')}`);
  };
  for (const n of (quick ? [8] : [5, 8])) {
    const st = { ...DEFAULTS, petalCount: n };
    report(`n ${n} uniform`, st, {});
    report(`n ${n} size +-30%`, st, { sizeA: 0.3 });
    report(`n ${n} size +-50%`, st, { sizeA: 0.5 });
    report(`n ${n} size +-50% ramp (f 0)`, st, { sizeA: 0.5, f: 0 });
    report(`n ${n} cup +-1.0 about 0`, st, { cupA: 1.0 });
    report(`n ${n} cup +-1.0 about 0.5`, { ...st, petalCup: 0.5 }, { cupA: 1.0 });
    /* NOTE the "about 0" curl row: at 8 petals the slots at 90 and 270 degrees receive 180 cos(pi/2) = 1.1e-14,
       NOT 0, and fold — tools/bloom-curl-near-zero.mjs is the instrument for that. */
    report(`n ${n} curl +-180 about 0`, st, { curlA: 180 });
    report(`n ${n} curl +-180 about 180`, { ...st, petalSpineCurl: 180 }, { curlA: 180 });
    report(`n ${n} twist +-90`, st, { twistA: 90 });
    report(`n ${n} twist +-180`, st, { twistA: 180 });
    report(`n ${n} size 50% x cup 1.0 x curl 180`, st, { sizeA: 0.5, cupA: 1.0, curlA: 180 });
  }
  if (quick) return;
  report('n 8 width 30 x size +-50% (foot floor)', { ...DEFAULTS, petalWidth: 30 }, { sizeA: 0.5 });
  report('n 8 length 20 tilt 75 x size +-50% (seam step)', { ...DEFAULTS, petalLength: 20, petalTilt: 75 }, { sizeA: 0.5 });
  report('n 8 length 20 sheet 2.4 tilt 75 x size +-50%', { ...DEFAULTS, petalLength: 20, petalTilt: 75, sheetThickness: 2.4 }, { sizeA: 0.5 });
}

async function section4(quick) {
  console.log('§4 FOOT CROWDING under the grade — tools/bloom-crowding.mjs\'s nearestFeet and stackDepth on the graded feet, EXPORT.');
  const { nearestFeet, stackDepth, refineDepth, cellFor } = await import('./bloom-crowding.mjs');
  const feetFor = (state, A, f = 1) => {
    const acc = new G.MeshBuilder({ exportMode: true }); const fr = G.footRing(state, acc); const feet = []; let nominal = null;
    for (let L = 0; L < fr.layerCount; L++) {
      const ring = fr.slotRings[L][0]; const az0 = [];
      G.buildWhorlInto({ count: fr.slotCount, radius: ring.radius, height: 0, sizeRamp: () => ring.scale, angleRamp: () => ring.tiltExtra, phase: ring.phase, placement: state.placement, fan: fr.fan, blade: (s) => az0.push(s.azimuth) });
      if (nominal === null) nominal = az0;
      gradedAzimuths(az0, { A, f }).forEach((a, k) => { const d = fr.slotRings[L][k]; feet.push({ radius: d.radius, overhang: d.overhang, width: d.width, az: a, ring: d.index, layer: L, slot: k, z: d.z, slope: d.slope, arc: d.arc }); });
    }
    return { feet, R: fr.hub.radius, nominal };
  };
  for (const n of (quick ? [40] : [8, 40])) for (const A of [0, 0.5, 0.8, 0.95]) {
    const { feet, R, nominal } = feetFor({ ...DEFAULTS, petalCount: n }, A);
    const nn = nearestFeet(feet); const cell = cellFor(R); const d = stackDepth(feet, R, cell); const fine = refineDepth(feet, d, cell);
    console.log(`  n ${n} A ${A} tightest pitch ${minPitchFactor(nominal, { A }).toFixed(3)} x nominal | NN adjacent q ${nn.adjacent.q.toFixed(3)} (d ${nn.adjacent.d.toFixed(2)} mm / width ${nn.adjacent.a.width.toFixed(2)}) | D_max ${fine.dmax} at r ${fine.dmaxAt.r.toFixed(2)} theta ${fine.dmaxAt.thetaDeg.toFixed(1)} (CROWDED at >= 11)`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const quick = argv.includes('--quick');
  const sec = (argv.find((a) => a.startsWith('--section')) || '').split('=')[1] || argv[argv.indexOf('--section') + 1];
  const want = sec ? new Set(String(sec).split(',').map(Number)) : new Set([1, 2, 3, 4]);
  const t0 = Date.now();
  if (want.has(1)) section1(quick);
  if (want.has(2)) section2(quick);
  if (want.has(3)) section3(quick);
  if (want.has(4)) await section4(quick);
  console.log(`\n${((Date.now() - t0) / 1000).toFixed(1)} s. INSTRUMENT ONLY — nothing above is asserted and no gate reads it.`);
}
