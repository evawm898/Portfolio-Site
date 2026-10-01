/* ===================================================================
   bloom-fusion-margins.mjs — HOW DO NEIGHBOURING PETAL MARGINS RELATE?
   The corolla-fusion discovery's instrument (docs/bloom-corolla-fusion-discovery.md).

     node tools/bloom-fusion-margins.mjs            the tables (Q1 sweeps, Q3 junction)
     node tools/bloom-fusion-margins.mjs --matrix   + the named states of buildMatrix()
                                                    (imports the harness, so playwright-core
                                                    must be installed; nothing else needs it)
     node tools/bloom-fusion-margins.mjs --control  the must-fails: every self-check is shown
                                                    able to fire on a written-down defect (8 legs)
     node tools/bloom-fusion-margins.mjs --sheet <png>  the diagnostic plan-view sheet
     node tools/bloom-fusion-margins.mjs --json <file>  every row, machine-readable

   THE QUESTION THE BRIEF ASKED (corolla fusion, Oct 1): a web lofted between
   petal i's trailing margin and petal i+1's leading margin, base to tip — does
   the space between those two margins EXIST? Where it does, a rung of the loft
   runs from one margin to the other and leaves the first petal OUTWARD and
   enters the second INWARD. Where it does not, the margins have crossed: the
   rung reverses round the whorl, and a loft built on it folds.

   WHAT IS READ, AND FROM WHICH OWNER. The margin is `petalSurface().rowAt(u)
   .sect(+/-1)`; what this tool reads is that owner's OUTPUT as the builder
   emitted it — every petal's captured `lamina` (emitPanel's own `oP`, the
   mid-surface it offset the two skins from, recorded for every petal on every
   build since organic variance build 1). Column NV-1 is v = +1, which faces
   the next slot (T = (-sin a, cos a) is counter-clockwise, and RADIAL slot
   i+1 sits at a + 2 pi / n); column 0 is v = -1. Nothing here re-derives a
   surface.

   THE CROSSING CRITERION IS THE PLAN GAP, AND IT WAS NOT THE FIRST ONE.
   With A on petal i's +v margin and B on petal i+1's -v margin at the SAME
   row (the two petals share one ladder, asserted, never assumed):
       plan = wrap(azimuth(B) - azimuth(A)) * (rho(A) + rho(B)) / 2
   — the azimuthal gap between the two margins, as an arc at their mean plan
   radius. NEGATIVE: A has passed B round the axis, the margins have CROSSED,
   and a straight rung from A to B points the wrong way round the whorl — the
   rung REVERSES, which is what makes a loft fold (an independent thick-web
   census finds the web's normal flipping at exactly the band's two edges and
   its skins intersecting there; docs/bloom-corolla-fusion-discovery.md §9).
   On a mirror-symmetric whorl it is exactly "A lies past the bisector plane".
     THE FIRST VERSION USED THE SIGNED BRIDGE SPAN AS THE CRITERION, and an
   independent audit of this tool caught it (doc §9): span = min((B-A).dA^,
   (B-A).dB^), with dA / dB the in-surface directions across each margin, goes
   negative whenever a rung leaves a margin at an OBTUSE angle to its own
   surface — and a ROLLED or TWISTED margin does that with no crossing at all:
   at roll 180 A stays 2.9-15.4 mm on its own side of the bisector on every
   "crossed" row, the plan gap is positive on 26 of 26, and a straight web
   built on those rungs does not fold. The span is KEPT and reported as the
   CREASE — the angle at which a straight rung leaves the margin; negative is
   a web folding back over its own petal, a sharp crease (the foot-to-blade
   seam's class of problem, fixable), never a crossing.

   WHERE THEY CROSS, WHICH WAY: BURIED or SHINGLED. On a crossed row A is
   located against petal i+1's captured mid-surface (closest point over its
   triangulated lattice): within half a sheet of it, A is BURIED in the
   neighbour's material — the seam is already closed by overlap, the margin
   invisible; further, A passes ABOVE or BELOW the neighbour — the petals are
   SHINGLED (imbricate), each margin tucked under the next, and a rung between
   them passes through a sheet (5 of 5 rows at tilt 75 x 5, 23 of 23 at tilt
   75 x 8, measured independently). THE BAR IS THE BODY HALF-THICKNESS:
   within RIM_TAPER_MM of a margin the emitted sheet tapers to about +/-0.52 mm,
   so a row within ~0.08 mm of the bar can be misclassified (tilt 75 x 5 reads
   7 / 5 here and 6 / 6 against the emitted solid by ray parity, doc §9). The
   COUNT of crossed rows does not depend on this classification.
     THE AUDIT'S SECOND DEFECT LIVED ONLY ON THE SPAN'S FALSE CROSSINGS: the
   classifier reads the offset along the neighbour's normal and ignored the
   sideways distance, so a point BESIDE the neighbour (closest point on its
   v = -1 edge) read as shingled with a meaningless offset (16 of 26 roll-180
   rows). Every such row was a false crossing. `sidewaysMm` is recorded now:
   over every crossed row of the sweep it is at most 0.33 mm except twist 90's
   three rows (0.74-0.76 against offsets of 3.40-4.29), so every SHINGLED row
   is genuinely over or under its neighbour's sheet.

   SELF-CHECKS — S0, S1, S3 AND S4 ABORT THE RUN; S2 REFUSES THE LAYER BY NAME
   (it is a property of the STATE, not a defect of the tool) — and --control
   shows every one of them firing on a written-down defect (eight legs):
     S0  the full panel's captured columns run v = -1 .. +1 exactly
     S1  RADIAL slot azimuths step by exactly 2 pi / n (the whorl primitive's
         own expression, re-derived here as the reference, never imported)
     S2  neighbours' rows carry identical u, row for row (Object.is) — a
         rung joins two points at ONE station or it is not a rung
     S3  on a flat hub, the RING ROW's plan gap equals the closed form from
         footRing()'s OWN ring.radius and ring.width — a different owner from
         the lamina. A foot's ring row is the straight chord C +/- T*w/2 at
         radius r, so its corner sits at plan angle atan2(w/2, r) and radius
         hypot(r, w/2):  gap = (2 pi/n - 2 atan2(w/2, r)) * hypot(r, w/2).
         ITS SUBJECT IS THE FLAT RING ROW, so it is blind to anything a form
         does to the blade — which is how the span defect above got past it.
     S4  the told-flag cross-check, in the one direction that is sound: where
         this tool finds a BURIED crossing above ROOT_BLEND_END on any whorl,
         the builder's own `neighbourFlag` (organic variance build 1, a
         different session's instrument, reading ALL petal pairs above
         ROOT_BLEND_END) must read the skins crossing. The converse is not
         asserted: the flag also reads whorl-to-whorl pairs and petal
         interiors, which this tool does not.

   WHAT THIS DOES NOT SEE, said here so it is not mistaken for coverage:
     - Only RADIAL and SPIRAL whorls are measured (one whorl = one ring of
       `petalCount` slots); CONTINUOUS has no whorl and FAN no closed ring,
       and both are reported as such rather than measured.
     - Only single-panel petals (a cleft or fringe petal's margin is several
       panels; refused by name).
     - Per-slot fields (size / form variance) give neighbours different
       ladders; S2 refuses them rather than matching rows by guesswork.
     - The crease's in-surface direction is a one-column difference, exact on
       a flat row and a chord on a cupped or rolled one; on roll 180 / 330 the
       chord's sign differs from the true tangent's on 3 / 8 rows (measured).
       The CROSSING criterion uses no derivative and is unaffected.
     - Past tilt ~105 the blade leans over the axis and "+v faces the next
       slot" stops holding near the tip; the plan gap there is reported, not
       trusted.
   =================================================================== */
import fs from 'node:fs';
import * as G from '../bloom-geometry.js';
import * as R from '../bloom-registry.js';

const argv = process.argv.slice(2);
const flag = (k) => argv.includes(k);
const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };

/* ---------------- the state, coerced by each control's own kind ---------------- */
const kindOf = new Map(R.CONTROLS.map((c) => [c.id, c]));
export function stateOf(set) {
  const s = { ...R.DEFAULTS };
  for (const [id, v] of Object.entries(set || {})) {
    const c = kindOf.get(id); if (!c) throw new Error(`no control "${id}"`);
    s[id] = c.kind === 'slider' ? Number(v) : c.kind === 'check' ? (v === true || v === 'true') : v;
  }
  return s;
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => { const l = len(a); return [a[0] / l, a[1] / l, a[2] / l]; };
const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a <= -Math.PI) a += 2 * Math.PI; return a; };

/* closest point on triangle (Ericson's region walk) — the instrument's own copy */
function closest(P, A, B, C) {
  const ab = sub(B, A), ac = sub(C, A), ap = sub(P, A);
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return A;
  const bp = sub(P, B), d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return B;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return [A[0] + ab[0] * v, A[1] + ab[1] * v, A[2] + ab[2] * v]; }
  const cp = sub(P, C), d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return C;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return [A[0] + ac[0] * w, A[1] + ac[1] * w, A[2] + ac[2] * w]; }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return [B[0] + (C[0] - B[0]) * w, B[1] + (C[1] - B[1]) * w, B[2] + (C[2] - B[2]) * w]; }
  const den = 1 / (va + vb + vc), v = vb * den, w = vc * den;
  return [A[0] + ab[0] * v + ac[0] * w, A[1] + ab[1] * v + ac[1] * w, A[2] + ab[2] * v + ac[2] * w];
}
/* A located against a petal's captured mid-surface: the nearest point over its
   triangulated lattice, and the signed offset along the lattice's own normal
   there (the captured normal of the nearest lattice vertex — the normal emitPanel
   offset the skins along). */
function locate(A, rows, rFrom) {
  let best = null;
  for (let r = rFrom; r < rows.length - 1; r++) {
    const m0 = rows[r].mid, m1 = rows[r + 1].mid;
    for (let j = 0; j < m0.length - 1; j++) {
      for (const [a, b, c, nr, nj] of [[m0[j], m1[j], m1[j + 1], r, j], [m0[j], m1[j + 1], m0[j + 1], r, j]]) {
        const q = closest(A, a, b, c);
        const d = len(sub(A, q));
        if (!best || d < best.d) best = { d, q, r: nr, j: nj };
      }
    }
  }
  const n = rows[best.r].normal[best.j];
  const offset = dot(sub(A, best.q), n);
  return { dist: best.d, offset, sideways: Math.sqrt(Math.max(0, best.d * best.d - offset * offset)), row: best.r, col: best.j };
}

/* ---------------- one build, measured ---------------- */
const FOOT_ROWS = 3;   // footS has three entries; the third (index 2) is the ring row, u = 0
export function measure(set, { exportMode = true, swapColumns = false, shiftRows = false, tamper = null } = {}) {
  const st = stateOf(set);
  const acc = new G.MeshBuilder({ exportMode });
  const built = G.buildBloomInto(acc, st, { below: null });
  if (tamper) tamper(built);           // --control only: a written-down defect in the record read
  const fr = built.foot;
  const res = { set, mode: exportMode ? 'export' : 'live', tris: acc.positions.length / 9, placement: st.placement, layers: [], refused: null, flag: built.neighbour ? built.neighbour.blade : null };
  if (fr.continuousMode) { res.refused = 'CONTINUOUS — one sequence, no whorl, no neighbour across a seam'; return res; }
  if (st.placement === 'FAN') { res.refused = 'FAN — an open arc, no closed ring of seams'; return res; }
  let off = 0;
  for (let L = 0; L < fr.layerCount; L++) {
    const n = fr.slotCount;
    const ps = built.petalsAll.slice(off, off + n); off += n;
    const az = built.slotAzimuths[L];
    const ring = fr.slotRings[L][0];
    const lay = { L, n, ring: { radius: ring.radius, width: ring.width, dome: !!ring.dome }, rows: [], refused: null };
    res.layers.push(lay);
    if (ps.some((p) => !p)) { lay.refused = 'a slot on this whorl carries no petal (the stem channel)'; continue; }
    if (ps.some((p) => !p.lamina || p.lamina.length !== 1)) { lay.refused = `multi-panel petals (${ps.map((p) => p.lamina ? p.lamina.length : 0).join('/')} panels) — a cleft or fringe margin is several panels`; continue; }
    const lam = ps.map((p) => p.lamina[0].rows);
    const NVc = lam[0][0].mid.length;
    /* S0 */
    for (const rows of lam) for (const row of rows) {
      if (!Object.is(row.v[0], -1) || !Object.is(row.v[NVc - 1], 1)) throw new Error(`S0: a captured row's columns run ${row.v[0]}..${row.v[NVc - 1]}, not -1..+1 — the margin columns are not where this tool reads them`);
    }
    /* S1 (RADIAL only; SPIRAL's step is the golden angle, reported, not asserted) */
    if (st.placement === 'RADIAL') {
      for (let i = 0; i < n; i++) {
        const want = ((i * 2 * Math.PI) / n);
        if (Math.abs(wrap(az[i] - az[0] - want)) > 1e-12) throw new Error(`S1: slot ${i} sits at ${az[i]} rad, the RADIAL law puts it at ${az[0] + want}`);
      }
    }
    /* S2 */
    for (let i = 0; i < n; i++) {
      const P = lam[i], Q = lam[(i + 1) % n];
      if (P.length !== Q.length || P.some((row, r) => !Object.is(row.u, Q[r].u))) { lay.refused = `slots ${i} and ${(i + 1) % n} carry different ladders (per-slot field) — rows are not matched by guesswork`; break; }
    }
    if (lay.refused) continue;
    /* the neighbour of slot i is the slot whose azimuth comes next counter-clockwise */
    const order = az.map((a, i) => [wrap(a - az[0]), i]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
    const rowsN = lam[0].length;
    for (let r = FOOT_ROWS - 1; r < rowsN; r++) {
      /* the pair that is worst at this row: smallest PLAN gap (the crossing criterion) */
      let worst = null, crease = Infinity;
      for (let k = 0; k < n; k++) {
        const i = order[k], j = order[(k + 1) % n];
        const P = lam[i], Q = lam[j];
        const rq = shiftRows ? Math.min(r + 1, rowsN - 1) : r;
        const A = swapColumns ? P[r].mid[0] : P[r].mid[NVc - 1];
        const B = swapColumns ? Q[rq].mid[NVc - 1] : Q[rq].mid[0];
        const dA = unit(swapColumns ? sub(P[r].mid[0], P[r].mid[1]) : sub(P[r].mid[NVc - 1], P[r].mid[NVc - 2]));
        const dB = unit(swapColumns ? sub(Q[rq].mid[NVc - 2], Q[rq].mid[NVc - 1]) : sub(Q[rq].mid[1], Q[rq].mid[0]));
        const BA = sub(B, A);
        const span = Math.min(dot(BA, dA), dot(BA, dB));
        if (span < crease) crease = span;
        const rhoA = Math.hypot(A[0], A[1]), rhoB = Math.hypot(B[0], B[1]);
        const plan = wrap(Math.atan2(B[1], B[0]) - Math.atan2(A[1], A[0])) * (rhoA + rhoB) / 2;
        if (!worst || plan < worst.plan) worst = { plan, chord: len(BA), i, j, A, B, t: P[r].thickness };
      }
      const row = { r, u: lam[0][r].u, plan: worst.plan, crease, chord: worst.chord, t: worst.t };
      if (worst.plan < 0) {
        const loc = locate(worst.A, lam[worst.j], FOOT_ROWS - 1);
        row.offsetMm = loc.offset; row.sidewaysMm = loc.sideways; row.buried = Math.abs(loc.offset) <= worst.t / 2;
      }
      lay.rows.push(row);
    }
    /* S3 — the ring row against the closed form from footRing()'s own fields */
    if (!ring.dome) {
      const h = ring.width / 2, rr = ring.radius;
      const want = (2 * Math.PI / n - 2 * Math.atan2(h, rr)) * Math.hypot(rr, h);
      const got = lay.rows[0].plan;
      lay.ringGapClosedForm = want;
      if (st.placement === 'RADIAL' && Math.abs(got - want) > 1e-9 * Math.max(1, Math.abs(want))) {
        throw new Error(`S3: layer ${L}'s ring-row gap reads ${got} mm, footRing()'s own radius and width give ${want} mm — the margin columns or the slot order are not what this tool assumes`);
      }
    }
    const rows = lay.rows.slice(1);   // the BLADE rows (the ring row reported on its own)
    const crossed = rows.filter((x) => x.plan < 0);
    /* the crossed rows as RUNS, so a band with a hole in it is printed as two */
    const runs = [];
    for (const x of rows) {
      if (x.plan < 0) { if (runs.length && runs[runs.length - 1].open) runs[runs.length - 1].to = x.u; else runs.push({ from: x.u, to: x.u, open: true }); }
      else if (runs.length) runs[runs.length - 1].open = false;
    }
    const deepest = crossed.length ? crossed.reduce((a, x) => (x.plan < a.plan ? x : a)) : null;
    lay.summary = {
      ringGap: lay.rows[0].plan,
      minPlan: Math.min(...rows.map((x) => x.plan)),
      minAt: rows.reduce((a, x) => (x.plan < a.plan ? x : a)).u,
      maxPlan: Math.max(...rows.map((x) => x.plan)),
      crossed: crossed.length, blade: rows.length,
      runs: runs.map((x) => [x.from, x.to]),
      buried: crossed.filter((x) => x.buried).length, shingled: crossed.filter((x) => !x.buried).length,
      deepestOffset: deepest ? deepest.offsetMm : null,
      buriedAboveRootBlend: crossed.some((x) => x.buried && x.u > G.ROOT_BLEND_END),
      creaseRows: rows.filter((x) => x.crease < 0 && x.plan >= 0).length,
      minCrease: Math.min(...rows.map((x) => x.crease)),
    };
  }
  return res;
}

/* ---------------- Q3: where the web's lower edge would land ---------------- */
/* The hub is built ALONE into a fresh accumulator by the shipped builder and
   points are tested by ray parity against ITS triangles — the emitted hub, not
   a model of it. */
function insideSolid(P, pos) {
  const D = unit([0.3141592, 0.2718281, 0.9]);   // a direction no lattice line runs along
  let hits = 0;
  for (let t = 0; t < pos.length; t += 9) {
    const A = [pos[t], pos[t + 1], pos[t + 2]], B = [pos[t + 3], pos[t + 4], pos[t + 5]], C = [pos[t + 6], pos[t + 7], pos[t + 8]];
    const e1 = sub(B, A), e2 = sub(C, A), p = cross(D, e2), det = dot(e1, p);
    if (Math.abs(det) < 1e-14) continue;
    const inv = 1 / det, s = sub(P, A), u = dot(s, p) * inv; if (u < 0 || u > 1) continue;
    const q = cross(s, e1), v = dot(D, q) * inv; if (v < 0 || u + v > 1) continue;
    if (dot(e2, q) * inv > 1e-9) hits++;
  }
  return hits % 2 === 1;
}
export function junction(set, { exportMode = true } = {}) {
  const st = stateOf(set);
  const acc = new G.MeshBuilder({ exportMode });
  const built = G.buildBloomInto(acc, st, { below: null });
  const fr = built.foot;
  const hubAcc = new G.MeshBuilder({ exportMode });
  G.buildHubInto(hubAcc, st, fr.hub);
  const hub = hubAcc.positions;
  const out = [];
  let off = 0;
  for (let L = 0; L < fr.layerCount; L++) {
    const n = fr.slotCount;
    const P = built.petalsAll[off].lamina[0].rows, Q = built.petalsAll[off + 1].lamina[0].rows; off += n;
    const NVc = P[0].mid.length;
    const row = (r) => {
      const A = P[r].mid[NVc - 1], B = Q[r].mid[0];
      const pts = [0.25, 0.5, 0.75].map((f) => A.map((x, k) => x + (B[k] - x) * f));
      return { chord: len(sub(B, A)), inside: pts.map((p) => insideSolid(p, hub)) };
    };
    out.push({ L, ringRow: row(FOOT_ROWS - 1), halfFoot: row(1), innerFoot: row(0) });
  }
  return { set, out };
}

/* ---------------- the sweeps ---------------- */
export const SWEEPS = [
  ['DEFAULTS', {}],
  ...[3, 4, 5, 6, 8, 10, 12, 16, 20, 30, 40].map((n) => [`petalCount ${n}`, { petalCount: n }]),
  ...[8, 12, 20, 30].map((w) => [`petalWidth ${w}`, { petalWidth: w }]),
  ...[20, 60].map((l) => [`petalLength ${l}`, { petalLength: l }]),
  ...[0, 10, 45, 60, 75, 90, 105, 120].map((t) => [`petalTilt ${t}`, { petalTilt: t }]),
  ...[60, 75, 90].flatMap((t) => [5, 6, 8, 12].map((n) => [`tilt ${t} x ${n} petals`, { petalTilt: t, petalCount: n }])),
  ...[-0.8, -0.4, 0.4, 0.6, 1.2].map((c) => [`petalCup ${c}`, { petalCup: c }]),
  ...[30, 90, 180, 330].map((r) => [`petalRoll ${r}`, { petalRoll: r }]),
  ...[15, 30, 90, 180].map((t) => [`petalTwist ${t}`, { petalTwist: t }]),
  ...[2, 3, 6].map((l) => [`layerCount ${l}`, { layerCount: l }]),
  ['tilt 75 x cup 0.6 x 5 petals (the bluebell)', { petalTilt: 75, petalCup: 0.6, petalCount: 5 }],
  ['tilt 75 x cup 0.6 x curl -45 (the recurved lip)', { petalTilt: 75, petalCup: 0.6, petalSpineCurl: -45 }],
];
export const JUNCTION = [
  ['DEFAULTS', {}], ['petalCount 5', { petalCount: 5 }], ['petalCount 12', { petalCount: 12 }],
  ['headRise 0.5', { headRise: 0.5 }], ['headRise 1', { headRise: 1 }], ['layerCount 3', { layerCount: 3 }],
];

const fmt = (x, d = 2) => (x === null || x === undefined ? '-' : (x >= 0 ? ' ' : '') + x.toFixed(d));
const runsOf = (s) => s.runs.map(([a, b]) => (a === b ? a.toFixed(3) : `${a.toFixed(3)}..${b.toFixed(3)}`)).join(' + ');
function line(label, m) {
  if (m.refused) return `${label.padEnd(48)} ${m.refused}`;
  const parts = m.layers.map((l) => {
    if (l.refused) return `L${l.L}: ${l.refused}`;
    const s = l.summary;
    return `L${l.L} n${l.n}: ring ${fmt(s.ringGap)} | plan min ${fmt(s.minPlan)} @u ${s.minAt.toFixed(3)} | crossed ${String(s.crossed).padStart(2)}/${s.blade}` +
      (s.crossed ? ` u ${runsOf(s)} buried ${s.buried} shingled ${s.shingled} (deepest offset ${fmt(s.deepestOffset)} mm)` : '') +
      (s.creaseRows ? ` | crease-only rows ${s.creaseRows} (min ${fmt(s.minCrease)})` : '');
  });
  const fl = m.flag ? ` | flag skin gap ${fmt(m.flag.skinGapMm)}${m.flag.crossing ? ' CROSSING' : ''}` : '';
  return `${label.padEnd(48)} ${parts.join('  ||  ')}${fl}`;
}

/* S4: a BURIED crossing above ROOT_BLEND_END is skin passing through skin, so the
   builder's told flag (all pairs above ROOT_BLEND_END) must read a crossing */
function s4(label, m) {
  if (m.refused || !m.flag) return;
  const buriedAbove = m.layers.some((l) => l.summary && l.summary.buriedAboveRootBlend);
  if (buriedAbove && !m.flag.crossing) throw new Error(`S4 (${label}): this tool finds a margin BURIED in its neighbour above ROOT_BLEND_END, yet the builder's neighbour flag reads the skins clear (${m.flag.skinGapMm.toFixed(3)} mm) — one of the two instruments is not reading the petals the other is`);
}

async function run() {
  const all = [];
  console.log('Q1 — NEIGHBOURING MARGINS (EXPORT, RADIAL whorls; plan = signed plan gap in mm, <0 = the margins have CROSSED; crease = the bridge span, <0 alone is an obtuse fold, not a crossing)');
  for (const [label, set] of SWEEPS) {
    const m = measure(set, { exportMode: true });
    s4(label, m);
    console.log(line(label, m)); all.push({ label, ...m });
  }
  console.log('\nQ1 — LIVE against EXPORT on four states (the ladder is mode-free; only the floors differ)');
  for (const [label, set] of [['DEFAULTS', {}], ['petalCount 12', { petalCount: 12 }], ['tilt 75 x 5 petals', { petalTilt: 75, petalCount: 5 }], ['petalTwist 90', { petalTwist: 90 }]]) {
    const e = measure(set, { exportMode: true }), l = measure(set, { exportMode: false });
    console.log(line(`${label} [export]`, e)); console.log(line(`${label} [live]`, l));
    all.push({ label: `${label} [live]`, ...l });
  }
  if (flag('--matrix')) {
    const H = await import('./bloom-harness.mjs');
    console.log('\nQ1 — THE NAMED STATES OF buildMatrix() (the bloom ships no design presets; these are its closest analogue)');
    const NAMED = /^ALL MAX$|^ALL MIN$|ALL THIN$|ALL FORM MAX$|ALL FORM MIN$|THE IRIS|ORCHID at|^DEPTH: 6 layers x ALL FORM MAX|^LAYERS: 3 x ALL FORM MAX|EVA_CONFIG|THE MUM|INCURVE TARGET, flat/;
    for (const row of H.buildMatrix().filter((r) => NAMED.test(r.label) && !r.capability)) {
      const set = Object.fromEntries((row.set || []).map((w) => [w.id, w.value]));
      let m; try { m = measure(set, { exportMode: true }); } catch (e) { console.log(`${row.label.slice(0, 48).padEnd(48)} ERROR ${e.message}`); continue; }
      console.log(line(row.label.slice(0, 48), m)); all.push({ label: row.label, ...m });
    }
  }
  console.log('\nQ3 — WHERE A WEB\'S LOWER EDGE WOULD LAND (points at 1/4, 1/2, 3/4 of the chord between neighbouring foot corners, ray-parity against the EMITTED hub)');
  for (const [label, set] of JUNCTION) {
    const j = junction(set);
    for (const o of j.out) {
      const f = (x) => `chord ${x.chord.toFixed(3)} mm, in hub ${x.inside.map((b) => (b ? 'Y' : 'n')).join('')}`;
      console.log(`${label.padEnd(16)} L${o.L}  ring row (u=0): ${f(o.ringRow)}   half-foot row: ${f(o.halfFoot)}   inner foot row: ${f(o.innerFoot)}`);
    }
  }
  if (arg('--json')) fs.writeFileSync(arg('--json'), JSON.stringify(all.map((x) => ({ ...x, layers: x.layers.map((l) => ({ ...l, rows: l.rows.map((r) => ({ u: r.u, plan: r.plan, crease: r.crease, buried: r.buried, offsetMm: r.offsetMm, sidewaysMm: r.sidewaysMm })) })) })), null, 1));
  return all;
}

/* ---------------- the must-fails ---------------- */
async function control() {
  let fired = 0, total = 0;
  const expect = (name, fn, re) => {
    total++;
    try { fn(); console.log(`  MISSED  ${name} — nothing fired`); }
    catch (e) { if (re.test(e.message)) { fired++; console.log(`  FIRED   ${name}: ${e.message.slice(0, 110)}`); } else console.log(`  WRONG   ${name}: ${e.message.slice(0, 110)}`); }
  };
  console.log('--control: each self-check against a written-down defect');
  expect('S0: a captured row whose columns are not -1..+1', () => measure({}, { tamper: (b) => { const row = b.petalsAll[0].lamina[0].rows[5]; row.v = row.v.slice().reverse(); } }), /^S0/);
  expect('S1: a RADIAL slot off its law by a micro-radian', () => measure({}, { tamper: (b) => { b.slotAzimuths[0][3] += 1e-6; } }), /^S1/);
  expect('S2: neighbours whose ladders differ in one row', () => {
    const m = measure({}, { tamper: (b) => { b.petalsAll[1].lamina[0].rows[10].u += 1e-12; } });
    if (m.layers[0].refused) throw new Error(`S2-refused: ${m.layers[0].refused}`);
  }, /^S2-refused/);
  expect('S2: a real per-slot field (size variance) gives different ladders', () => {
    const m = measure({ varianceSize: 0.5 });
    if (m.layers[0].refused) throw new Error(`S2-refused: ${m.layers[0].refused}`);
  }, /^S2-refused/);
  expect('S3: the margin columns read the wrong way round', () => measure({}, { swapColumns: true }), /^S3/);
  expect('S3: the neighbour read one row out of step', () => measure({}, { shiftRows: true }), /^S3/);
  expect('S4: the told flag reading clear where a margin is buried', () => {
    const m = measure({});
    m.flag = { ...m.flag, crossing: false, skinGapMm: 0.5 };
    s4('the default with the flag forced clear', m);
  }, /^S4/);
  expect('S4: a buried crossing the tool failed to see (the criterion reverted to the span on a rolled state)', () => {
    /* the first version's criterion, applied where it differs from the plan gap:
       roll 180 has no crossing in plan, so forcing its rows crossed-and-buried
       must contradict the flag, which reads the skins clear by 7 mm there */
    const m = measure({ petalRoll: 180 });
    for (const l of m.layers) if (l.summary) l.summary.buriedAboveRootBlend = true;
    s4('roll 180 with a span-criterion crossing forced', m);
  }, /^S4/);
  console.log(fired === total ? `PASS — ${fired} of ${total} must-fails fired` : `FAIL — ${fired} of ${total} must-fails fired`);
  if (fired !== total) process.exitCode = 1;
}

/* ---------------- the diagnostic sheet ---------------- */
async function sheet(file) {
  const { render, writePng, text, blit } = await import('./bloom-soft-render.mjs');
  const CELLS = [
    ['SHIPPED DEFAULT 8 PETALS', {}],
    ['5 PETALS', { petalCount: 5 }],
    ['12 PETALS', { petalCount: 12 }],
    ['TILT 60 X 5 PETALS', { petalTilt: 60, petalCount: 5 }],
    ['TILT 75 X 5 PETALS', { petalTilt: 75, petalCount: 5 }],
    ['TILT 75 X 8 PETALS', { petalTilt: 75, petalCount: 8 }],
    ['CUP 0.6', { petalCup: 0.6 }],
    ['TWIST 90', { petalTwist: 90 }],
    ['ROLL 180', { petalRoll: 180 }],
  ];
  const S = 360, COLS = 3, ROWS = Math.ceil(CELLS.length / COLS), PAD = 30;
  const W = COLS * S, H = ROWS * (S + PAD) + 40;
  const out = Buffer.alloc(W * H * 3, 18);
  text(out, W, H, 10, 10, 'LOFT RUNGS BETWEEN NEIGHBOURS - PLAN - GREEN CLEAR - AMBER CREASE ONLY - RED CROSSED', [240, 240, 236], 2);
  for (let c = 0; c < CELLS.length; c++) {
    const [name, set] = CELLS[c];
    const st = stateOf(set);
    const acc = new G.MeshBuilder({ exportMode: true });
    const built = G.buildBloomInto(acc, st, { below: null });
    const pos = acc.positions;
    let ext = 0; for (let k = 0; k < pos.length; k += 3) ext = Math.max(ext, Math.hypot(pos[k], pos[k + 1]));
    const cam = { dir: [0, 0, 1], up: [0, 1, 0], center: [0, 0, 0], halfHeight: ext * 1.05 };
    const img = render(pos, S, S, cam, { color: [120, 118, 112], bg: [18, 18, 22] });
    /* the overlay: the same orthographic projection render() uses, written out
       here because the renderer does not export it (a camera of four numbers) */
    const scale = (S / 2) / cam.halfHeight;
    const px = (p) => [S / 2 + p[0] * scale, S / 2 - p[1] * scale];
    const seg = (a, b, col) => {
      const [x0, y0] = px(a), [x1, y1] = px(b);
      const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
      for (let k = 0; k <= n; k++) {
        const x = Math.round(x0 + ((x1 - x0) * k) / n), y = Math.round(y0 + ((y1 - y0) * k) / n);
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1]]) {
          const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= S || Y >= S) continue;
          const o = (Y * S + X) * 3; img[o] = col[0]; img[o + 1] = col[1]; img[o + 2] = col[2];
        }
      }
    };
    const fr = built.foot; const n = fr.slotCount;
    let crossed = 0, creased = 0, rungs = 0;
    for (let i = 0; i < n; i++) {
      const P = built.petalsAll[i].lamina[0].rows, Q = built.petalsAll[(i + 1) % n].lamina[0].rows;
      const NVc = P[0].mid.length;
      for (let r = FOOT_ROWS - 1; r < P.length; r++) {
        const A = P[r].mid[NVc - 1], B = Q[r].mid[0];
        const dA = unit(sub(A, P[r].mid[NVc - 2])), dB = unit(sub(Q[r].mid[1], B));
        const BA = sub(B, A); const span = Math.min(dot(BA, dA), dot(BA, dB));
        const plan = wrap(Math.atan2(B[1], B[0]) - Math.atan2(A[1], A[0]));
        rungs++; if (plan < 0) crossed++; else if (span < 0) creased++;
        seg(A, B, plan < 0 ? [235, 60, 50] : span < 0 ? [235, 170, 40] : [80, 210, 110]);
      }
    }
    const ox = (c % COLS) * S, oy = 40 + Math.floor(c / COLS) * (S + PAD);
    blit(out, W, H, img, S, S, ox, oy);
    text(out, W, H, ox + 6, oy + S + 6, `${name}  ${crossed}/${rungs} CROSSED  ${creased} CREASE ONLY`, [230, 230, 226], 1);
  }
  writePng(file, W, H, out);
  console.log(`sheet written: ${file}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (flag('--control')) await control();
  else if (arg('--sheet')) await sheet(arg('--sheet'));
  else await run();
}
