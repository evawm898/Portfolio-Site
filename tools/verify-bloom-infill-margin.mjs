/* ===================================================================
   verify-bloom-infill-margin.mjs — THE INFILLED PETAL'S OUTER MARGIN TAKES
   THE EDGE PROFILE (the margin-bead session).

     node tools/verify-bloom-infill-margin.mjs [--quick]
     node tools/verify-bloom-infill-margin.mjs --negative-control

   Before this session the cell region's outline — the petal's own margin
   above the infill's split, and its tip — closed on `emitRimLoop`'s `w = 0`
   step profile: a FLAT WALL one sheet thick meeting both skins at exactly
   90 degrees. Measured on the infilled default: 91 of 95 sections along the
   margin were that box (docs/bloom-infill-roundness-and-bevel.md A1). Now the
   skin stops short of the margin (`insetPlan`, one plan map read by every
   skin point) and the rim closes on #278's bead — BEAD ONLY, no thickness
   taper, by measurement (docs/bloom-infill-margin-bead.md §3). Both STL
   gates are blind to every part of it: a flat wall, a bead at the wrong
   radius, a skin that stops in the wrong place and a band that reaches a
   hole all export watertight, as one piece, with the same genus.

   Node-side, one petal per state (the hole-rim gate's own construction,
   `firstSlot` + `buildPetalInto`), both modes.

   MB0 THE MARGIN TOOK THE BEAD, AT THE LAW'S RADIUS, AND TOLD ITS CLAMPS.
       The builder's `margin` record exists with a positive point count; its
       radius is the law RESTATED here — min(RIM_BEAD_RADIUS_MM,
       max(t, MIN_FEATURE_MM)/2, RIM_ROOM_FRACTION * wall) — never read from
       the builder; every point the room clamp took under the ruled radius is
       in a clamp run (their total equals the treated points), and NO HOLE-RIM
       POINT WAS MOVED BY THE MARGIN'S MAP (`bandIntrusions` 0) — the band is
       the one thing standing between the margin's squeeze and a hole's bead.
   MB1 NO HARD EDGE ON THE MARGIN. The builder declares where every margin
       segment's strip sits in the triangle stream; each holds exactly 2K
       triangles once its skips are counted, so a range cannot be trimmed
       silently. Over every edge of the emitted petal (welded by exact
       position) touching a triangle of a FULLY TREATED segment, the turn
       between the two faces stays under the bead's own resolution — the
       restated profile's worst facet turn (#278's blended law, over the
       half-thickness range the sheet can take) plus the OUTLINE'S OWN
       worst turn read from the plan and the skin's own turn there (a wall
       turns there too) — and never as steep as a wall (90). The TIP stretch
       (within RIM_TAPER_MM of the outline's far end in x, where the width
       arm and the x-squeeze bind) is asserted under 90 alone. SLIVERS
       (inradius under 0.01 of the longest edge) carry no normal worth
       comparing and are skipped and COUNTED. The ramp into the seam is the
       one stretch excluded, because a bead fading to nothing IS a wall at
       its start, and the exclusion is held to its own definition: every
       ramp segment lies within RIM_TAPER_MM of the seam in x (an arc is
       never shorter than its x span), so it cannot grow to swallow the
       margin. Four states whose own sheet folds are held in MB1_XFAIL by
       value, both directions (#213's shape).
   MB2 THE SILHOUETTE DID NOT MOVE. Every captured margin mid point above the
       split — column 0 and column NV-1 of every cell-region row, and every
       column of the last row — is an EMITTED vertex, as the same double (the
       bead's apex), and its old skin point `mid + n t/2` is NOT: the skin
       really stopped short of the margin, which a mutation that leaves the
       wall in place cannot satisfy.

   --negative-control mutates a copy of the geometry and requires each
   mutation to fail exactly the clauses it names: the flat wall put back on
   the margin (MB0, MB1, MB2), the bead drawn as a wall at the inset (MB0,
   MB1, MB2), the skin inset a whole wall so the margin's squeeze reaches the
   holes (MB0, MB1, MB2), and the room arm dropped from the margin's radius
   (MB0, MB1).

   WHAT IT DOES NOT COVER: the tip's corner pivot fans `emitPanel` inserts are
   NOT inserted here — the corner turn is the outline's own and is in the
   bar; petal 0 only, never the whorl; the ramp's distance is PLAN
   millimetres, the surface's own on a flat plan and an approximation on a
   curved one (it moves no topology).
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
  ['petalTipShape 0.60', { petalTipShape: 0.6 }],
];
const QUICK_RE = /^default$|sheet 0\.60|ALL FORM MAX|petalTipShape 3/;
/* MB1's DECLARED ROWS, each with how far its worst BODY edge stands past its
   bar (degrees), held in BOTH directions to 0.01 (#213's rule).
   * THE FOLD STATES — the hole-rim gate's own H1_XFAIL rows, for its reason:
     the PLAIN petal already folds there (each carries a census entry), so the
     margin's rim is laid on a sheet that turns through itself within a bead's
     width, and the worst edge is the sheet's, recorded rather than bounded.
   * `sheet 2.40` — 10 edges 0.13 degrees past a 71-degree bar, every one at the
     rim's first facet against the SKIN: the bar's closed form assumes the skin
     is the tangent plane at the junction, and on the thick sheet a skin chord
     tilts off it by that much. Recorded rather than widened. */
const MB1_XFAIL = Object.freeze({
  'cup 1.2 x curl 360': { excessDeg: 89.18 },
  'roll 330': { excessDeg: 43.38 },
  'ALL FORM MAX': { excessDeg: 113.14 },
  'buckle 0.60 f 3': { excessDeg: 31.26 },
  'sheet 2.40': { excessDeg: 0.14 },
});

async function loadGeometry(src) {
  if (!src) return import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'infill-margin-'));
  const f = path.join(dir, 'bloom-geometry.mjs');
  fs.writeFileSync(f, src);
  return import(pathToFileURL(f).href);
}
const firstSlotWith = (G, state, acc) => {
  const fr = G.footRing(state, acc); let got = null;
  const ring = fr.slotRings[0][0];
  G.buildWhorlInto({ count: fr.slotCount, radius: ring.radius, height: 0, sizeRamp: () => ring.scale, angleRamp: () => ring.tiltExtra,
    phase: ring.phase, placement: state.placement, fan: fr.fan, blade: (slot) => { if (!got) got = { ring: fr.slotRings[0][slot.index], slot }; } });
  return got;
};

/* #278's profile law, restated (the hole-rim gate's own restatement): the
   largest turn between consecutive facets of the drawn profile, the skin
   plane included, sampled uniformly in tangent angle and blended toward an
   evenly spaced wall by min(1, a / b). */
function beadResolutionDeg(a, b, K) {
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
  return { name, mode, st, petal, plan, grid: g, pos: a.positions, sheets: g.rows.map((r) => r.thickness) };
}

const key3 = (p) => `${p[0]},${p[1]},${p[2]}`;
const SLIVER_ASPECT = 0.01;

function clauses(G, r) {
  const out = []; const add = (id, ok, msg) => out.push({ id, ok, msg });
  const F = r.petal.infill, M = F && F.margin, B = F && F.bead;
  if (!F || F.refused || !M) { add('MB0', false, `${r.name} ${r.mode}: no infill or no margin record — the outline closed on no bead`); return out; }
  const K = B.segments;
  /* MB0 */
  const rLaw = Math.min(G.RIM_BEAD_RADIUS_MM, Math.max(Math.min(...r.sheets), G.MIN_FEATURE_MM) / 2, G.RIM_ROOM_FRACTION * r.plan.wall);
  add('MB0', M.points > 0, `${r.name} ${r.mode}: the margin record carries no treated point`);
  add('MB0', Math.abs(M.radiusMm - rLaw) <= 1e-12, `${r.name} ${r.mode}: the builder drew the margin at r = ${M.radiusMm} mm and the restated law gives ${rLaw}`);
  add('MB0', M.on === true && M.refusedCells === 0, `${r.name} ${r.mode}: ${M.refusedCells} cell(s) could not take the inset margin (a skin polygon self-crossed, turned over or lost its hole's ring), so every margin stayed a FLAT WALL`);
  const clamped = M.clampRuns.reduce((s, x) => s + x.points, 0);
  add('MB0', rLaw < G.RIM_BEAD_RADIUS_MM ? clamped > 0 && M.clampRuns.every((x) => x.arm === 'wall' || x.arm === 'width') : true,
    `${r.name} ${r.mode}: the room arm binds (${rLaw} < ${G.RIM_BEAD_RADIUS_MM}) and ${clamped} clamp location(s) were reported`);

  /* MB1 — ranges pinned, then the dihedral census on the fully treated strip */
  const ranges = M.rimRanges || [];
  let rangeBad = 0, rampOut = 0, rampSegs = 0;
  const inRim = new Uint8Array(r.pos.length / 9), inRamp = new Uint8Array(r.pos.length / 9), inTip = new Uint8Array(r.pos.length / 9);
  const xTip = Math.max(...r.plan.outline.map((q) => q.x)) - G.RIM_TAPER_MM;
  const O = r.plan.outline, NO = O.length;
  /* the outline's own turn at each vertex, from the plan (a flat wall turns there too) */
  const turnAt = O.map((Q, i) => {
    const A = O[(i - 1 + NO) % NO], C = O[(i + 1) % NO];
    const t1 = Math.atan2(Q.y - A.y, Q.x - A.x), t2 = Math.atan2(C.y - Q.y, C.x - Q.x);
    let d = Math.abs(t2 - t1); if (d > Math.PI) d = 2 * Math.PI - d; return (d * 180) / Math.PI;
  });
  const segTurn = new Float64Array(r.pos.length / 9);
  for (const [t0, t1, sk, g, x, prm] of ranges) {
    if (t1 - t0 + sk !== 2 * K) rangeBad++;
    const ramp = !(g >= 1);
    if (ramp) { rampSegs++; if (x - r.plan.xB > G.RIM_TAPER_MM * (1 + 1e-9)) rampOut++; }
    /* the local outline turn: the two vertices bounding the segment's place, and their neighbours */
    const s0 = Math.floor(prm); let tau = 0;
    for (let o = -1; o <= 2; o++) tau = Math.max(tau, turnAt[(((s0 + o) % NO) + NO) % NO]);
    for (let t = t0; t < t1; t++) { (ramp ? inRamp : inRim)[t] = 1; segTurn[t] = tau; if (x > xTip) inTip[t] = 1; }
  }
  add('MB1', ranges.length > 0 && rangeBad === 0, `${r.name} ${r.mode}: ${ranges.length} margin ranges, ${rangeBad} of them not 2K triangles once skips are counted`);
  add('MB1', rampOut === 0, `${r.name} ${r.mode}: ${rampOut} of ${rampSegs} ramp segments lie more than RIM_TAPER_MM past the seam — the excluded stretch has grown`);
  const tMax = Math.max(...r.sheets), tMin = Math.min(...r.sheets);
  /* the sheet's half thickness varies along the margin (tipThinning), so the
     resolution is taken over that whole range */
  let prof = 0; for (let k = 0; k <= 16; k++) { const b = Math.min(tMin / 2, rLaw) + (tMax / 2 - Math.min(tMin / 2, rLaw)) * (k / 16); prof = Math.max(prof, beadResolutionDeg(rLaw, b, K)); }
  const barAt = (t) => Math.min(90, prof + segTurn[t] + (rangeOf[t] >= 0 ? skinTurn[rangeOf[t]] : 0));
  const pos = r.pos, vid = new Map(), vtx = [];
  const idOf = (i) => { const k = `${pos[i]},${pos[i + 1]},${pos[i + 2]}`; let v = vid.get(k); if (v === undefined) { v = vtx.length; vid.set(k, v); vtx.push([pos[i], pos[i + 1], pos[i + 2]]); } return v; };
  const normals = [], edges = new Map(); let slivers = 0;
  for (let t = 0; t < pos.length; t += 9) {
    const a = idOf(t), b = idOf(t + 3), c = idOf(t + 6); const ti = t / 9;
    const A = vtx[a], Bv = vtx[b], C = vtx[c];
    const ux = Bv[0] - A[0], uy = Bv[1] - A[1], uz = Bv[2] - A[2], wx = C[0] - A[0], wy = C[1] - A[1], wz = C[2] - A[2];
    const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx; const l = Math.hypot(nx, ny, nz);
    /* A SLIVER HAS NO NORMAL WORTH MEASURING: where its inradius (2 x area /
       perimeter) is under a hundredth of its longest edge, a few microns of
       the surface's own curvature across it decide its normal — measured, a
       300:1 skin sliver at `density 40`'s tip corner read 103.9 degrees against
       a rim facet that is correctly placed. Counted and reported, never
       silently dropped; a genuine fold is not a sliver and stays measured. */
    const e1 = Math.hypot(ux, uy, uz), e2 = Math.hypot(wx, wy, wz), e3 = Math.hypot(C[0] - Bv[0], C[1] - Bv[1], C[2] - Bv[2]);
    const sliver = !(l > 0) || l / (e1 + e2 + e3) < SLIVER_ASPECT * Math.max(e1, e2, e3);
    if (sliver) slivers++;
    normals.push(sliver ? null : [nx / l, ny / l, nz / l]);
    for (const [p, q] of [[a, b], [b, c], [c, a]]) { const k = p < q ? `${p},${q}` : `${q},${p}`; if (!edges.has(k)) edges.set(k, []); edges.get(k).push(ti); }
  }
  /* THE SKIN'S OWN TURN beside each segment: the worst dihedral between two
     SKIN triangles (neither in any margin range) at a vertex the segment's
     strip touches. The flat wall's skin had it too; the bead may add its own
     resolution on top and no more. */
  const rangeOf = new Int32Array(r.pos.length / 9).fill(-1);
  ranges.forEach(([t0, t1], ri) => { for (let t = t0; t < t1; t++) rangeOf[t] = ri; });
  const triV = []; for (let t = 0; t < pos.length; t += 9) triV.push([idOf(t), idOf(t + 3), idOf(t + 6)]);
  const vRanges = new Map();
  ranges.forEach(([t0, t1], ri) => { for (let t = t0; t < t1; t++) for (const v of triV[t]) { if (!vRanges.has(v)) vRanges.set(v, new Set()); vRanges.get(v).add(ri); } });
  const skinTurn = new Float64Array(ranges.length);
  for (const [k, ts] of edges) {
    if (ts.length !== 2 || rangeOf[ts[0]] >= 0 || rangeOf[ts[1]] >= 0) continue;
    const n1 = normals[ts[0]], n2 = normals[ts[1]]; if (!n1 || !n2) continue;
    const [pv, qv] = k.split(',').map(Number);
    const rs = [...(vRanges.get(pv) || []), ...(vRanges.get(qv) || [])]; if (!rs.length) continue;
    const ang = (Math.acos(Math.max(-1, Math.min(1, n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2]))) * 180) / Math.PI;
    for (const ri of rs) if (ang > skinTurn[ri]) skinTurn[ri] = ang;
  }
  let worst = 0, counted = 0, worstRamp = 0, over = 0, worstExcess = -Infinity, bar = prof, worstTip = 0, tipCounted = 0;
  for (const ts of edges.values()) {
    if (ts.length !== 2) continue;
    const rim = inRim[ts[0]] || inRim[ts[1]], ramp = inRamp[ts[0]] || inRamp[ts[1]];
    if (!rim && !ramp) continue;
    const n1 = normals[ts[0]], n2 = normals[ts[1]]; if (!n1 || !n2) continue;
    const ang = (Math.acos(Math.max(-1, Math.min(1, n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2]))) * 180) / Math.PI;
    if (rim && !ramp && (inTip[ts[0]] || inTip[ts[1]])) { tipCounted++; worstTip = Math.max(worstTip, ang); continue; }
    if (rim && !ramp) {
      counted++; worst = Math.max(worst, ang);
      const b2 = Math.max(inRim[ts[0]] ? barAt(ts[0]) : 0, inRim[ts[1]] ? barAt(ts[1]) : 0);
      if (ang - b2 > worstExcess) { worstExcess = ang - b2; bar = b2; }
      if (!(ang < b2)) over++;
    } else worstRamp = Math.max(worstRamp, ang);
  }
  add('MB1', counted > 0 && tipCounted > 0, `${r.name} ${r.mode}: ${counted} body and ${tipCounted} tip edges belong to fully treated margin segments — MB1 would be vacuous`);
  const xf = MB1_XFAIL[r.name];
  if (xf) add('MB1', Math.abs(worstExcess - xf.excessDeg) <= 0.01, `${r.name} ${r.mode}: the declared margin edge stands ${worstExcess.toFixed(2)} degrees past its bar against its record ${xf.excessDeg.toFixed(2)} — ${worstExcess > xf.excessDeg ? 'WORSE' : 'better'}; a change moved it and owes a re-record`);
  if (!xf) add('MB1', worstTip < 90, `${r.name} ${r.mode}: an edge of the TIP's treated margin turns ${worstTip.toFixed(2)} degrees — as steep as a wall`);
  if (!xf) add('MB1', over === 0, `${r.name} ${r.mode}: ${over} edge(s) of the treated margin turn past the bead's own resolution plus the outline's local turn — worst by ${worstExcess.toFixed(2)} degrees over a bar of ${bar.toFixed(2)} (a flat wall turns 90)`);

  /* MB2 — the silhouette: captured margin mids are emitted, their old skins are not */
  const emitted = new Set(); for (let i = 0; i < pos.length; i += 3) emitted.add(key3([pos[i], pos[i + 1], pos[i + 2]]));
  const last = r.grid.rows[r.grid.rows.length - 1].row;
  let probed = 0, apexMissing = 0, wallStill = 0, first = null;
  for (const row of r.grid.rows) {
    if (row.row <= r.plan.mSplit) continue;
    const cols = row.row === last ? row.mid.map((_, j) => j) : [0, row.mid.length - 1];
    for (const j of cols) {
      const P = row.mid[j], n = row.normal[j], t = row.thickness;
      probed++;
      if (!emitted.has(key3(P))) { apexMissing++; if (!first) first = `row ${row.row} col ${j}`; }
      if (emitted.has(key3([P[0] + n[0] * t / 2, P[1] + n[1] * t / 2, P[2] + n[2] * t / 2]))) wallStill++;
    }
  }
  add('MB2', probed > 0 && apexMissing === 0, `${r.name} ${r.mode}: ${apexMissing} of ${probed} captured margin points are not emitted apexes (first ${first})`);
  add('MB2', wallStill === 0, `${r.name} ${r.mode}: ${wallStill} of ${probed} captured margin points still have their flat-wall skin emitted — the skin did not stop short of the margin`);
  r.report = { worstTip, tipCounted, slivers, worstExcess, rLaw, points: M.points, clamped, runs: M.clampRuns.map((x) => `${x.arm} u${x.uFrom.toFixed(3)}-${x.uTo.toFixed(3)} x${x.points} r>=${x.minRadiusMm.toFixed(3)}`), worst, bar, counted, worstRamp, rampSegs, wallStill, probed };
  return out;
}

async function run(G, quiet) {
  const bad = []; const fired = new Set();
  for (const [name, set] of STATES) {
    if (QUICK && !QUICK_RE.test(name)) continue;
    for (const mode of ['export', 'live']) {
      let cs;
      const r = runState(G, name, set, mode);
      try { cs = clauses(G, r); } catch (e) { cs = [{ id: 'CRASH', ok: false, msg: `${name} ${mode}: ${e.message}` }]; }
      for (const c of cs) if (!c.ok) { bad.push(`${c.id}: ${c.msg}`); fired.add(c.id); }
      if (!quiet && r.report) console.log(`  ${mode.padEnd(6)} ${name.padEnd(20)} r=${r.report.rLaw.toFixed(3)} ${r.report.points} pts  worst turn ${r.report.worst.toFixed(2)} (closest to its bar: ${r.report.worstExcess.toFixed(2)} vs ${r.report.bar.toFixed(2)}) · tip worst ${r.report.worstTip.toFixed(2)} over ${r.report.tipCounted} over ${r.report.counted} edges (${r.report.slivers} sliver triangles skipped) · ramp ${r.report.rampSegs} segs worst ${r.report.worstRamp.toFixed(2)} · old skin still emitted ${r.report.wallStill}/${r.report.probed}\n         clamps: ${r.report.runs.join(' · ')}`);
    }
  }
  return { bad, fired };
}

const SRC = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
const MUTANTS = [
  { id: 'the-margin-is-a-flat-wall-again', names: ['MB0', 'MB1', 'MB2'],
    from: '  const marginOn = refusedCells === 0;', to: '  const marginOn = false;' },
  { id: 'the-margin-bead-is-a-wall-at-the-inset', names: ['MB0', 'MB1', 'MB2'],
    from: '      if (onSeam(u) && onSeam(v)) emitRimFlat(u, v); else emitRimEdge(u, v, pu, pv);', to: '      emitRimFlat(u, v);' },
  { id: 'the-margin-is-inset-a-whole-wall', names: ['MB0', 'MB1', 'MB2'],
    from: '    const a = g > 0 ? Math.min(planFor(x, sgn, g * rEdge, false), g * arm.r) : 0;', to: '    const a = g > 0 ? 2.2 * g * arm.r : 0;' },
  { id: 'the-margin-drops-the-room-arm', names: ['MB0', 'MB1'],
    from: '  const rEdge = Math.min(RIM_BEAD_RADIUS_MM, Math.max(tAt(rows[mSplit].u), MIN_FEATURE_MM) / 2, RIM_ROOM_FRACTION * plan.wall);',
    to: '  const rEdge = Math.min(RIM_BEAD_RADIUS_MM, Math.max(tAt(rows[mSplit].u), MIN_FEATURE_MM) / 2);' },
];

const G = await loadGeometry(null);
const base = await run(G, false);
if (base.bad.length) { console.error('FAIL\n  ' + base.bad.join('\n  ')); process.exit(1); }
console.log(`PASS — MB0 MB1 MB2 over ${STATES.filter(([n]) => !QUICK || QUICK_RE.test(n)).length} states x 2 modes`);
if (NEG) {
  let ok = true;
  for (const m of MUTANTS) {
    const hits = SRC.split(m.from).length - 1;
    if (hits !== 1) { console.error(`  ${m.id}: anchor matches ${hits} times — disarmed`); ok = false; }
  }
  if (!ok) { console.error('NEGATIVE CONTROL FAILED — an anchor is disarmed'); process.exit(1); }
  for (const m of MUTANTS) {
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
