/* ===================================================================
   verify-bloom-hole-rim.mjs — THE HOLE RIMS TAKE THE EDGE PROFILE (S5).

     node tools/verify-bloom-hole-rim.mjs [--quick]
     node tools/verify-bloom-hole-rim.mjs --negative-control

   Before S5 every hole the Voronoi infill cut was closed by a FLAT WALL one
   sheet thick: a 90-degree cliff at both skins, round every hole, which is
   exactly what #278 removed from the petal's own margin. S5 closes them with
   `emitRimLoop` — the half-round bead whose APEX is the plan's own hole
   boundary — and this gate is the behavioural witness for that. Both STL
   gates are blind to all of it: a flat wall, a bead at the wrong radius, a
   bead whose apex is not the hole boundary and a bead that never clamps all
   export watertight, as one connected piece, with the genus I4 counts.

   Node-side, one petal per state (`firstSlot` + `buildPetalInto`, the I
   family's own construction), both modes. The hole locations come from the
   PLAN (`petalInfillPlan` re-run on the builder's own rows — the plan owns
   where the holes are; the emitter only draws them), so the region the
   dihedral clause looks at is not chosen by the thing under test.

   H0 EVERY CUT HOLE TOOK THE BEAD. The builder's `bead` record reports how
      many holes it beaded and how many kept a flat wall; beaded == achieved
      and flat == 0 on every state, unless the state is DECLARED in
      `FLAT_XFAIL` with its count — held in BOTH directions (#213's rule).
   H1 NO HARD EDGE WITHIN THE BEAD'S REACH OF ANY HOLE. Over every edge of
      the emitted petal mesh (welded by exact position) whose two ends lie
      within the bead's reach of a plan hole boundary, the turn between the
      two faces' normals stays under the BEAD'S OWN RESOLUTION: the largest
      turn between consecutive facets of the half ellipse the bead is drawn
      as (semi-axes r and t/2, K facets sampled uniformly in tangent angle,
      the skin plane included) — computed here in closed form from the
      restated law, never read from the builder. Plus `SWEEP_SLACK_DEG` for
      the one thing the profile's closed form leaves out, the turn ALONG the
      loop between neighbouring profiles, which is the ring's own plan
      curvature and is measured on the shipped rows at well under it. A flat
      wall turns 90 degrees at each skin and fails it by construction.
   H2 THE 1.50 mm BAR STILL MEASURES THE RULED QUANTITY. Every apex the
      emitter recorded lies ON the plan's own hole polygon (so the mid-plane
      aperture is the plan's hole, unchanged), and every point where the skin
      stops lies OUTSIDE it (so the hole is wider at the faces, never
      narrower). I1 measures the apex loop; this is what makes that right.
   H3 THE RADIUS IS THE LAW, RESTATED. r = min(RIM_BEAD_RADIUS_MM,
      max(t, MIN_FEATURE_MM)/2, RIM_ROOM_FRACTION * wall), with the wall the
      plan's declared one — and the MEASURED radius is the surface chord from
      each apex to where its skin stops, which is what the bead's half width
      IS. Every hole where the room arm binds carries a clamp record, and the
      flat left down a wall's centre (wall - 2r) is not negative.

   --negative-control runs four mutations on a copy of the geometry module
   and requires each to fail EXACTLY the clauses it names, no fewer and no
   more: the flat wall put back (H0-H3: the holes keep walls, the skin stops
   ON the hole so the apex-to-skin chord is 0), the apex put on the skin
   point (H1 alone — the records still name the plan's hole, so H2 and H3,
   which read the records, stay silent; only the EMITTED rim can see it, which
   is why H1 counts triangles per point), the room arm dropped (H0-H3: a
   0.50 mm bead on a 0.50 mm half-wall reaches the cell edge, the ring is
   refused, and the radius and the clamp count disagree with the law), and
   the bead grown into the hole (H0-H3).

   WHAT IT DOES NOT COVER: the petal's OUTER margin above the infill's split
   (beaded since the margin-bead session) is `verify-bloom-infill-margin.mjs`'s
   subject, not this gate's (H1 looks only near holes); petal 0 only, never the
   whorl; and SLIVERS (inradius under 1% of their longest edge) are skipped by
   H1 and counted on every row, because their face normal is noise.
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DEFAULTS } from '../bloom-registry.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUICK = process.argv.includes('--quick');
const NEG = process.argv.includes('--negative-control');

const STATES = [
  ['default', {}],
  ['density 8', { infillDensity: 8 }],
  ['density 40', { infillDensity: 40 }],
  ['sheet 0.60', { sheetThickness: 0.6 }],
  ['sheet 2.40', { sheetThickness: 2.4 }],
  ['tipThinning 0.80', { tipThinning: 0.8 }],
  ['petalWidth 8', { petalWidth: 8 }],
  ['petalWidth 30', { petalWidth: 30 }],
  ['cup 1.2 x curl 360', { petalCup: 1.2, petalSpineCurl: 360 }],
  ['roll 330', { petalRoll: 330 }],
  ['ALL FORM MAX', { petalCup: 1.2, petalCupGradient: 1, petalRoll: 330, petalTwist: 180, petalSpineCurl: 360 }],
  ['buckle 0.60 f 3', { buckleAmp: 0.6, buckleFreq: 3 }],
  ['petalTipShape 3.00', { petalTipShape: 3 }],
];
const QUICK_RE = /^default$|sheet 0\.60|ALL FORM MAX|cup 1\.2/;
/* States where some hole's grown ring could not be triangulated and the hole
   kept a flat wall, with the count — measured, held both ways. */
const FLAT_XFAIL = Object.freeze({});
/* H1's DECLARED ROWS: the states whose PLAIN petal already folds (each carries
   its own census entry in SELF_INTERSECTION_XFAIL — the petal's own fold,
   multiplied by the mesh). There the bead is laid on a surface that turns
   through itself within a bead's width, and the worst rim edge is recorded
   rather than bounded — held in BOTH directions (#213's rule). */
/* RE-RECORDED by the margin-bead session (previous figures 165.71 and 128.89):
   the margin's own bead now sits beside these holes on the same folding
   sheet, and the new skin between the two beads moves which edge is worst. */
const H1_XFAIL = Object.freeze({
  'cup 1.2 x curl 360': { worstDeg: 179.56 },
  'roll 330': { worstDeg: 129.14 },
  'ALL FORM MAX': { worstDeg: 178.67 },
  'buckle 0.60 f 3': { worstDeg: 151.87 },
});

async function loadGeometry(src) {
  if (!src) return import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hole-rim-'));
  const f = path.join(dir, 'bloom-geometry.mjs');
  fs.writeFileSync(f, src);
  return import(pathToFileURL(f).href);
}
const { firstSlotWith } = await (async () => {
  /* bloom-first-slot.mjs imports the SHIPPED geometry; the negative control
     needs the slot from the MUTATED one, so the twenty lines are driven here
     through whichever module is under test. The slot record itself is the
     whorl primitive's own (never synthesised). */
  return { firstSlotWith: (G, state, acc) => {
    const fr = G.footRing(state, acc); let got = null;
    const ring = fr.slotRings[0][0];
    G.buildWhorlInto({ count: fr.slotCount, radius: ring.radius, height: 0, sizeRamp: () => ring.scale, angleRamp: () => ring.tiltExtra,
      phase: ring.phase, placement: state.placement, fan: fr.fan, blade: (slot) => { if (!got) got = { ring: fr.slotRings[0][slot.index], slot }; } });
    return got;
  } };
})();

/* the bead's own resolution, from the restated law: the largest turn between
   consecutive facets of a half ellipse (a out, b up/down) sampled at K
   tangent angles, the skin plane (turn from 0) included. */
function beadResolutionDeg(a, b, K) {
  /* #278's profile law restated: sampled uniformly in TANGENT angle, and
     blended toward an evenly spaced wall by `ratio = min(1, a / b)` where the
     bead is narrower than the sheet is thick — which on a hole it always is
     (a = 0.45 against b = t/2 >= 0.5), so the curve is NOT a half ellipse and
     the skin junction is steeper than one: 32.5 degrees at the shipping 1.2 mm
     sheet, 68.6 at 2.4 mm. */
  const ratio = b > 0 ? Math.min(1, a / b) : 0;
  const pts = [];
  for (let m = 0; m <= K; m++) {
    const psi = (Math.PI * m) / K; const th = Math.atan2(a * Math.sin(psi), b * Math.cos(psi));
    const cs = (1 - ratio) * (1 - (2 * m) / K) + ratio * Math.cos(th);
    pts.push([a * Math.sin(th), b * cs]);
  }
  const dirs = [0];
  for (let m = 0; m < K; m++) dirs.push(Math.atan2(pts[m + 1][1] - pts[m][1], pts[m + 1][0] - pts[m][0]));
  dirs.push(-Math.PI);
  let w = 0; for (let i = 1; i < dirs.length; i++) w = Math.max(w, Math.abs(dirs[i] - dirs[i - 1]));
  return (w * 180) / Math.PI;
}

function runState(G, name, set, mode) {
  const exportMode = mode === 'export';
  const st = { ...DEFAULTS, ...set, petalInfill: 'VORONOI' };
  const acc0 = new G.MeshBuilder({ exportMode });
  const { ring, slot } = firstSlotWith(G, st, acc0);
  const a = new G.MeshBuilder({ exportMode, captureGrid: true });
  const petal = G.buildPetalInto(a, st, ring, slot, null, true);
  const surface = G.petalSurface(st, ring, slot, null, acc0);
  const g = petal.grid[0];
  const plan = G.petalInfillPlan(surface, g.rows, { rowFrom: g.rowFrom, rowTo: g.rowTo, label: g.label, spanAt: () => [-1, 1] },
    { density: petal.infill.density, passes: petal.infill.passes, gamma: petal.infill.gamma, aniso: petal.infill.aniso, baseFrac: petal.infill.baseFrac });
  return { name, mode, st, petal, surface, plan, pos: a.positions, sheets: g.rows.map((r) => r.thickness) };
}

const SLIVER_ASPECT = 0.01;
const inPoly = (x, y, poly) => { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside; } return inside; };
const segDist = (q, A, B) => { const ex = B.x - A.x, ey = B.y - A.y, l2 = ex * ex + ey * ey; let t = l2 > 0 ? ((q.x - A.x) * ex + (q.y - A.y) * ey) / l2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(A.x + ex * t - q.x, A.y + ey * t - q.y); };

function clauses(G, r) {
  const out = []; const add = (id, ok, msg) => out.push({ id, ok, msg });
  const F = r.petal.infill, B = F && F.bead;
  if (!F || F.refused || !B) { add('H0', false, `${r.name} ${r.mode}: no infill or no bead record — the gate would be vacuous`); return out; }
  /* H0 */
  const xf = FLAT_XFAIL[r.name];
  add('H0', B.beadedHoles + B.flatHoles === F.achieved, `${r.name} ${r.mode}: ${B.beadedHoles} beaded + ${B.flatHoles} flat against ${F.achieved} holes achieved`);
  if (xf === undefined) add('H0', B.flatHoles === 0, `${r.name} ${r.mode}: ${B.flatHoles} holes kept a FLAT WALL — their grown ring could not be triangulated`);
  else add('H0', B.flatHoles === xf, `${r.name} ${r.mode}: ${B.flatHoles} flat holes against the declared ${xf}`);
  /* H3 — the law restated from constants, the plan's wall and the sheet */
  const K = B.segments;
  const rLaw = Math.min(G.RIM_BEAD_RADIUS_MM, Math.max(Math.min(...r.sheets), G.MIN_FEATURE_MM) / 2, G.RIM_ROOM_FRACTION * r.plan.wall);
  add('H3', Math.abs(B.radiusMm - rLaw) <= 1e-12, `${r.name} ${r.mode}: the builder drew r = ${B.radiusMm.toFixed(4)} mm and the restated law gives ${rLaw.toFixed(4)}`);
  add('H3', r.plan.wall - 2 * rLaw >= 0, `${r.name} ${r.mode}: two beads of ${rLaw.toFixed(3)} mm do not fit a ${r.plan.wall} mm wall`);
  add('H3', (rLaw < G.RIM_BEAD_RADIUS_MM ? B.beadedHoles : 0) === B.clamps.length, `${r.name} ${r.mode}: ${B.clamps.length} clamp records against ${rLaw < G.RIM_BEAD_RADIUS_MM ? B.beadedHoles : 0} holes the room arm binds on`);
  const L = r.surface.length;
  const at = (q) => { const u = Math.min(1, Math.max(0, q.x / L)); const h = r.surface.profile.laminaHalfAt(u); const v = Math.max(-1, Math.min(1, h > 1e-9 ? q.y / h : 0)); return r.surface.at(u, v).P; };
  let chordWorst = 0, chordSpread = 0, vertices = 0, onRing = 0, apexOff = 0, skinIn = 0;
  const isVertex = (q) => holes.some((h) => h.some((v) => Math.abs(v.x - q.x) < 1e-9 && Math.abs(v.y - q.y) < 1e-9));
  const holes = r.plan.holes.filter((h, i) => r.plan.cellOpen[i]);
  for (let li = 0; li < F.emittedLoops.length; li++) {
    const ap = F.emittedLoops[li], sk = F.emittedSkinLoops[li];
    if (!sk || sk.length !== ap.length) { add('H2', false, `${r.name} ${r.mode}: loop ${li} has ${sk ? sk.length : 0} skin points against ${ap.length} apexes`); continue; }
    for (let k = 0; k < ap.length; k++) {
      /* H2: the apex on some plan hole polygon; the skin point outside all */
      let dmin = Infinity; for (const h of holes) for (let i = 0; i < h.length; i++) dmin = Math.min(dmin, segDist(ap[k], h[i], h[(i + 1) % h.length]));
      if (dmin > 1e-6) apexOff++; else onRing++;
      if (holes.some((h) => inPoly(sk[k].x, sk[k].y, h))) skinIn++;
      const P = at(ap[k]), Q = at(sk[k]);
      const dev = Math.abs(Math.hypot(P[0] - Q[0], P[1] - Q[1], P[2] - Q[2]) - rLaw);
      if (isVertex(ap[k])) { vertices++; chordWorst = Math.max(chordWorst, dev); } else chordSpread = Math.max(chordSpread, dev);
    }
  }
  add('H2', onRing > 0 && apexOff === 0, `${r.name} ${r.mode}: ${apexOff} of ${onRing + apexOff} apexes lie OFF the plan's own hole polygon — the mid-plane aperture is not the ruled hole`);
  add('H2', skinIn === 0, `${r.name} ${r.mode}: ${skinIn} skin stop points lie INSIDE a plan hole — the hole is narrower at the faces than at the mid-plane`);
  /* the measured radius — the chord the bead's half width IS */
  /* AT THE RING'S OWN VERTICES — where the law is applied — the chord IS the
     radius, to the bisection's and the plan grid's precision. Between them
     the bead is interpolated along the ring (a plan edge, and on a curved
     plan the metric along it), and that spread is REPORTED, never bounded:
     it is the ring's own sampling, as the surface between two ladder rows is
     #278's. */
  add('H3', vertices > 0 && chordWorst <= 1e-5, `${r.name} ${r.mode}: at ${vertices} ring vertices the chord from an apex to where its skin stops differs from the law's ${rLaw.toFixed(3)} mm by up to ${chordWorst.toExponential(3)} mm`);

  /* H1 — the dihedral census near the holes */
  const tMax = Math.max(...r.sheets), tMin = Math.min(...r.sheets);
  /* PLUS THE HOLE POLYGON'S OWN CORNER TURN, read from the PLAN: at a ring
     vertex the strip turns by the ring's exterior angle there, which a flat
     wall does too — it is the outline's facet, not a hard edge the bead
     introduced. Both terms are restated here, neither is read from the
     builder. */
  let tau = 0;
  for (const h of holes) for (let i = 0; i < h.length; i++) {
    const A = h[(i - 1 + h.length) % h.length], Q = h[i], Bq = h[(i + 1) % h.length];
    const t1 = Math.atan2(Q.y - A.y, Q.x - A.x), t2 = Math.atan2(Bq.y - Q.y, Bq.x - Q.x);
    let d = Math.abs(t2 - t1); if (d > Math.PI) d = 2 * Math.PI - d; tau = Math.max(tau, d);
  }
  /* AND NEVER AS STEEP AS A WALL: a flat wall's skin junction turns exactly
     90 degrees, so the bar is capped there whatever the profile allows — on a
     2.4 mm sheet the bead's reach (0.45) is a fifth of its height and the
     profile is mostly wall, and the cap is what still separates it from one. */
  const bar = Math.min(90, Math.max(beadResolutionDeg(rLaw, tMax / 2, K), beadResolutionDeg(rLaw, tMin / 2, K)) + (tau * 180) / Math.PI);
  const reach = Math.hypot(rLaw, tMax / 2) * 1.05;
  const holePts = [];
  for (const h of holes) for (let i = 0; i < h.length; i++) { const A = h[i], Bq = h[(i + 1) % h.length]; const n = Math.max(1, Math.ceil(Math.hypot(Bq.x - A.x, Bq.y - A.y) / 0.05)); for (let s = 0; s < n; s++) holePts.push(at({ x: A.x + (Bq.x - A.x) * s / n, y: A.y + (Bq.y - A.y) * s / n })); }
  const cell = reach, grid = new Map(); const gk = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
  for (const p of holePts) { const k = gk(p[0], p[1], p[2]); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(p); }
  const near = (p) => { const ix = Math.floor(p[0] / cell), iy = Math.floor(p[1] / cell), iz = Math.floor(p[2] / cell);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) { const L2 = grid.get(`${ix + a},${iy + b},${iz + c}`); if (!L2) continue; for (const q of L2) if (Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) <= reach) return true; } return false; };
  const pos = r.pos, vid = new Map(), vtx = []; const idOf = (i) => { const k = `${pos[i]},${pos[i + 1]},${pos[i + 2]}`; let v = vid.get(k); if (v === undefined) { v = vtx.length; vid.set(k, v); vtx.push([pos[i], pos[i + 1], pos[i + 2]]); } return v; };
  const tris = [], normals = [], edges = new Map(); let slivers = 0;
  for (let t = 0; t < pos.length; t += 9) {
    const a = idOf(t), b = idOf(t + 3), c = idOf(t + 6); const ti = tris.length; tris.push([a, b, c]);
    const A = vtx[a], Bv = vtx[b], C = vtx[c];
    const ux = Bv[0] - A[0], uy = Bv[1] - A[1], uz = Bv[2] - A[2], wx = C[0] - A[0], wy = C[1] - A[1], wz = C[2] - A[2];
    let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx; const l = Math.hypot(nx, ny, nz);
    /* A SLIVER HAS NO NORMAL WORTH MEASURING (the margin gate's rule, shared):
       inradius under a hundredth of its longest edge. Added by the margin-bead
       session, which put a 0.10 mm SKIN strip between the margin's bead and a
       hole's — measured, three nearly collinear skin points there read 89.9
       degrees against a correctly placed hole-rim facet. Counted, never
       silently dropped; a flat wall is 1.2 mm tall and is never a sliver. */
    const e1 = Math.hypot(ux, uy, uz), e2 = Math.hypot(wx, wy, wz), e3 = Math.hypot(C[0] - Bv[0], C[1] - Bv[1], C[2] - Bv[2]);
    const sliver = !(l > 0) || l / (e1 + e2 + e3) < SLIVER_ASPECT * Math.max(e1, e2, e3);
    if (sliver) slivers++;
    normals.push(sliver ? null : [nx / l, ny / l, nz / l]);
    for (const [p, q] of [[a, b], [b, c], [c, a]]) { const k = p < q ? `${p},${q}` : `${q},${p}`; if (!edges.has(k)) edges.set(k, []); edges.get(k).push(ti); }
  }
  const nearV = new Map(); const isNear = (v) => { let x = nearV.get(v); if (x === undefined) { x = near(vtx[v]); nearV.set(v, x); } return x; };
  /* THE SUBJECT IS THE EDGES THE RIM OWNS: every edge touching a triangle in
     a hole-rim range the builder declared — which includes the junction with
     the skin, the one place a flat wall turns 90 degrees. Not "every edge
     near a hole": the fold states (roll 330, cup x curl, ALL FORM MAX, the
     buckle) carry the PETAL's own declared folds within a bead's reach of a
     hole, measured at 178.7-180.0 degrees on the base tree with flat walls,
     and those are the census's, not the rim's. The ranges are pinned: each
     holds exactly 2K triangles a point when beaded, 2 when flat. */
  const inRim = new Uint8Array(tris.length);
  let rangeBad = 0, rangeTris = 0;
  for (const [a0, b0, npts, beaded] of B.rimRanges || []) {
    if ((b0 - a0) !== (beaded ? 2 * K * npts : 2 * npts)) rangeBad++;
    for (let t = a0; t < b0 && t < tris.length; t++) { inRim[t] = 1; rangeTris++; }
  }
  add('H1', (B.rimRanges || []).length === F.achieved && rangeBad === 0, `${r.name} ${r.mode}: ${(B.rimRanges || []).length} hole-rim ranges against ${F.achieved} holes, ${rangeBad} of them not 2K triangles a point`);
  let worst = 0, counted = 0, worstRR = 0, worstJ = 0;
  for (const [k, ts] of edges) {
    if (ts.length !== 2) continue;
    if (!inRim[ts[0]] && !inRim[ts[1]]) continue;
    const [p, q] = k.split(',').map(Number);
    if (!isNear(p) || !isNear(q)) continue;
    const n1 = normals[ts[0]], n2 = normals[ts[1]]; if (!n1 || !n2) continue;
    counted++;
    const d = Math.max(-1, Math.min(1, n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2]));
    const ang = (Math.acos(d) * 180) / Math.PI;
    if (inRim[ts[0]] && inRim[ts[1]]) worstRR = Math.max(worstRR, ang); else worstJ = Math.max(worstJ, ang);
    worst = Math.max(worst, ang);
  }
  add('H1', counted > 0, `${r.name} ${r.mode}: no edge lies within the bead's reach of any hole — H1 would be vacuous`);
  const hx = H1_XFAIL[r.name];
  if (hx) add('H1', Math.abs(worst - hx.worstDeg) <= 0.01, `${r.name} ${r.mode}: the declared fold-state rim turn reads ${worst.toFixed(2)} degrees against its record ${hx.worstDeg.toFixed(2)} — ${worst > hx.worstDeg ? 'WORSE' : 'better'}; a change moved it and owes a re-record`);
  else add('H1', worst < bar, `${r.name} ${r.mode}: an edge within ${reach.toFixed(3)} mm of a hole turns ${worst.toFixed(2)} degrees, over the bead's own resolution ${bar.toFixed(2)} (a flat wall turns 90)`);
  r.report = { slivers, worstRR, worstJ, worst, bar, counted, rLaw, chordWorst, chordSpread, vertices, beaded: B.beadedHoles, flat: B.flatHoles, clamps: B.clamps.length };
  return out;
}

async function run(G, quiet) {
  const bad = []; const fired = new Set();
  for (const [name, set] of STATES) {
    if (QUICK && !QUICK_RE.test(name)) continue;
    for (const mode of ['export', 'live']) {
      const r = runState(G, name, set, mode);
      const cs = clauses(G, r);
      for (const c of cs) if (!c.ok) { bad.push(`${c.id}: ${c.msg}`); fired.add(c.id); }
      if (!quiet && r.report) console.log(`  ${mode.padEnd(6)} ${name.padEnd(20)} r=${r.report.rLaw.toFixed(3)} beaded ${r.report.beaded} flat ${r.report.flat} clamps ${r.report.clamps}  worst turn ${r.report.worst.toFixed(2)} (rim-rim ${r.report.worstRR.toFixed(2)}, rim-skin ${r.report.worstJ.toFixed(2)}) / bar ${r.report.bar.toFixed(2)} deg over ${r.report.counted} rim edges (${r.report.slivers} slivers skipped)  chord at ${r.report.vertices} vertices ${r.report.chordWorst.toExponential(2)} / between ${r.report.chordSpread.toFixed(4)} mm`);
    }
  }
  return { bad, fired };
}

const SRC = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
const MUTANTS = [
  { id: 'the-flat-wall-is-back', names: ['H0', 'H1', 'H2', 'H3'], from: '    let ring = rings[ci];', to: '    let ring = null;' },
  { id: 'the-apex-is-the-skin-point', names: ['H1'], from: '    const apex = mapPlan(apPlan.x, apPlan.y).P;', to: '    const apex = o.C;' },
  /* H0 and H2 too, since the margin-bead session: the hole bead's radius and
     the margin's are ONE expression now, so dropping the room arm makes both
     beads 0.50 mm on a 1.00 mm wall — no skin is left between them, grown rings
     are refused and holes fall back to flat walls. */
  { id: 'the-room-arm-is-dropped', names: ['H0', 'H1', 'H2', 'H3'], from: 'Math.max(tAt(rows[mSplit].u), MIN_FEATURE_MM) / 2, RIM_ROOM_FRACTION * plan.wall);', to: 'Math.max(tAt(rows[mSplit].u), MIN_FEATURE_MM) / 2);' },
  { id: 'the-bead-grows-into-the-hole', names: ['H0', 'H1', 'H2', 'H3'], from: '      en.push([ey / len, -ex / len]);', to: '      en.push([-ey / len, ex / len]);' },
];

const G = await loadGeometry(null);
const base = await run(G, false);
if (base.bad.length) { console.error('FAIL\n  ' + base.bad.join('\n  ')); process.exit(1); }
console.log(`PASS — H0 H1 H2 H3 over ${STATES.filter(([n]) => !QUICK || QUICK_RE.test(n)).length} states x 2 modes`);
if (NEG) {
  let ok = true;
  for (const m of MUTANTS) {
    const hits = SRC.split(m.from).length - 1;
    if (hits !== 1) { console.error(`  ${m.id}: anchor matches ${hits} times — disarmed`); ok = false; continue; }
    const GM = await loadGeometry(SRC.replace(m.from, m.to));
    let res;
    try { res = await run(GM, true); } catch (e) { res = { bad: [`CRASH ${e.message}`], fired: new Set(['CRASH']) }; }
    const missed = m.names.filter((x) => !res.fired.has(x)), extra = [...res.fired].filter((x) => !m.names.includes(x));
    if (missed.length || extra.length) { ok = false; console.error(`  ${m.id}: MISSED ${missed.join(',') || '-'} / UNCLAIMED ${extra.join(',') || '-'}\n    ${res.bad.slice(0, 3).join('\n    ')}`); }
    else console.log(`  ${m.id}: fired ${[...res.fired].sort().join(', ')} as claimed`);
  }
  if (!ok) { console.error('NEGATIVE CONTROL FAILED'); process.exit(1); }
  console.log(`NEGATIVE CONTROL PASS — ${MUTANTS.length} of ${MUTANTS.length}`);
}
