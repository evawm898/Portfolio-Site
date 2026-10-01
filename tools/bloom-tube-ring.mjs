/* ===================================================================
   SCRATCH PROTOTYPE — THE CLOSED-RING TUBE. NOT SHIPPED, NOT A GATE.

     node tools/bloom-tube-ring.mjs [--quick] [--json <file>] [--control]
     node tools/bloom-tube-ring.mjs --partial [--json <file>]     (fused partway)
     node tools/bloom-tube-ring.mjs --attribute                   (where a fold sits)

   PART C (Eva's rulings on Part B): `buildTube(set, { h, blend, slits })`.
     blend  0..1, the BLEND slider: the FLARE (the lobe starts lower, burying the
            ring's free-rim taper under a flush base wall) and the NOTCH (an open
            sinus's rim corner cut into a U tangent to both petal edges). Both are
            inert at 0 BY BRANCH — BLEND 0 is the Part B build, float for float.
     slits  'edge' (default): an edge petal at a slit is one panel from the foot
            to the tip, its outer half the petal's OWN section; 'wedge' is Part
            B's wedge cut, kept for reproduction.
     node tools/bloom-tube-ring.mjs --round2 [--json <file>]       (Part C sweep)

   PARTIAL FUSION (Eva's ruling on #323): `buildTube(set, { h })` ends the ring
   at the last row at or below u = h; above it every petal is TODAY's free petal
   (P3's hook hands it the rows from one below the ring's top to the tip), and
   over BLEND_MM of midrib arc above the ring's top row its section eases from
   the ring's own arc to its own section (law in buildTube's pass B comment:
   position lerp by smootherstep, normal lerp, the petal's width laid onto the
   ring by ARC LENGTH). The ring's curve at its top row is the ONE owner of the
   line where petal base meets ring top: at that row the petal IS the ring.
   Without `h` the ring runs to the nib entry, exactly as first built.

   Eva's ruling on the corolla-fusion discovery (docs/bloom-corolla-fusion-
   discovery.md §7 #1): the fused region is ONE SHEET whose cross-section at
   every row passes through every petal MIDRIB at that row, so there are no
   neighbouring margins and nothing can cross by construction. The petals are
   its lobes. This file builds that ring ROUND — a smooth closed curve through
   the midribs (periodic Catmull-Rom in the axis's own cylindrical coordinates,
   rho(theta), z(theta)). STRAIGHT (straight chords between midribs) was DELETED
   by Eva's ruling on Part C; Parts A/B's STRAIGHT figures reproduce from git
   history before that commit. — at TUBE k = 0 (one periodic sheet) and every divisor k of n (k evenly
   spaced slits, each panel n/k petals), and measures it. Docs:
   docs/bloom-tube-ring-prototype.md.

   HOW IT REACHES THE OWNER WITHOUT TOUCHING IT. The shipped bloom-geometry.js
   is read as TEXT, four ANCHORED patches are applied (each must match exactly
   once or the tool refuses — the mutant table's discipline), and the result is
   imported from a temp file. bloom-geometry.js itself is never written. The
   four patches, and what each is FOR:

     P1  `const NV = 10` -> `let`, with `__tubeWithNV(n, f)` exported, so the
         ring's panels can carry n*C columns. Every petal still builds at 10.
     P2  `emitPanel` learns a PERIODIC panel (the full tube, k = 0): columns
         wrap, no side inset, and the rim is TWO closed loops (bottom, top)
         through the owner's own `rimProfile` + `emitRimLoop`. THIS IS THE
         FINDING, not a convenience: a k = 0 tube cannot be expressed through
         the shipped emitPanel, and P2 is exactly the delta it needs.
     P3  `buildPetalInto` honours `cap.tubeLobe(rows)`: the blade is emitted as
         ONE panel from that row to the tip (the free lobe), and the rows are
         returned (`tubeRows`) so the ring reads the petal's own sections.
     P4  `emitPanel` and `rimProfile`/`emitRimLoop` exported.

   Everything about the EDGE PROFILE — taper, bead, K = 4, the 1.0 mm floor,
   the inset bisection, the exposed-tip apex ring — is the owner's code,
   called, never copied. The ring's skins are emitPanel's skins.

   WHAT IT READS, and from which owner:
     - the MIDRIB at row r of petal p: `tubeRows[r].sect(0).P` — the petal's
       own section (petalSurface's front door), the same double a petal draws
       its midrib through. The ring passes through it EXACTLY (asserted, T1).
     - the ROW LADDER: the petals' own rows, index-matched across a whorl;
       neighbours must carry identical u row for row (refused otherwise, T0).
     - the NIB ENTRY: `tipCap.apex.xLawMm / drawnLengthMm`, the expression
       the discovery prototype and the combination gate use.
     - thickness: the petal's own `tAt` per row (`tUsed`).
   WHAT IT DEFAULTS (Claude's, flagged in the doc): C = 8 columns per petal
   sector; a slit is a WEDGE whose width is MIN_FEATURE_MM at the ring row's
   radius (so it opens toward the mouth); the lobe starts PANEL_OVERLAP_ROWS
   (1) below the ring's top row, the cleft/fringe precedent.

   DECLARED BLIND SPOTS: RADIAL placement only (refused otherwise); a whorl
   whose petals do not share one ladder is refused (size / form variance);
   cleft/fringe/lobed petals are not exercised.
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { census, orientation } from './bloom-self-intersection.mjs';
import { analyzeStl } from './bloom-harness.mjs';
import * as core from './bloom-tube-core.mjs';
export * from './bloom-tube-core.mjs';
const { buildTube, divisorsOf, hubFinding, meridian, fusionProfile, notchCorner } = core;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
/* THE NODE LOADER (the build itself lives in tools/bloom-tube-core.mjs, shared
   with the preview page): the shipped source read from disk, the patched copy
   written to a temp file and imported */
core.setGeometryLoader({
  read: async () => fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8'),
  load: async (src) => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-tube-')); const f = path.join(dir, 'bloom-geometry.tube.mjs'); fs.writeFileSync(f, src); return import(pathToFileURL(f).href); },
});
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);

/* ---------------- the measurements ---------------- */
export function stlOf(positions) {
  const nT = positions.length / 9; const buf = Buffer.alloc(84 + 50 * nT); buf.writeUInt32LE(nT, 80);
  for (let t = 0; t < nT; t++) { const o = 84 + 50 * t; for (let k = 0; k < 9; k++) buf.writeFloatLE(positions[t * 9 + k], o + 12 + 4 * k); }
  return buf;
}
/* the connectedness gate's own voxel flood fill, SLICED out of its source (the
   gate runs on import; the slice is anchored and refuses if it moved) */
let VOX = null;
function voxel() {
  if (VOX) return VOX;
  const src = fs.readFileSync(path.join(ROOT, 'tools/verify-bloom-connectedness.mjs'), 'utf8');
  const a = src.indexOf('function voxelComponents(buf, cell) {'), b = src.indexOf('const rows = buildMatrix();');
  if (a < 0 || b < 0 || b < a) throw new Error('could not slice voxelComponents/componentsRefined from verify-bloom-connectedness.mjs');
  VOX = new Function('MAX_VOXELS', `${src.slice(a, b)}\nreturn { voxelComponents, componentsRefined };`)(448e6);
  return VOX;
}
export function connected(positions, cell = 0.6) { return voxel().componentsRefined(stlOf(positions), cell); }
export function directedMismatch(positions) {
  const key = (i) => `${positions[i]},${positions[i + 1]},${positions[i + 2]}`;
  const m = new Map();
  for (let t = 0; t < positions.length / 9; t++) for (let c = 0; c < 3; c++) {
    const a = key(t * 9 + c * 3), b = key(t * 9 + ((c + 1) % 3) * 3); if (a === b) continue;
    const f = `${a}>${b}`, r = `${b}>${a}`;
    if (m.get(r) > 0) m.set(r, m.get(r) - 1); else m.set(f, (m.get(f) || 0) + 1);
  }
  let left = 0; for (const v of m.values()) left += v; return left;
}
export function measureTube(set, opts = {}) {
  return buildTube(set, opts).then((b) => {
    const shells = b.ringShells.map((s) => {
      const c = census(s.positions);
      const a = analyzeStl(stlOf(s.positions));
      const o = orientation(s.positions);
      return { layer: s.layer, label: s.label, tris: s.positions.length / 9, within: c.within, inward: o.inward, oDisagree: o.disagreements, volumeMm3: o.totalVolumeMm3, worstSpanMm: c.worstSpanMm ?? c.worstSpan ?? null, boundary: a.boundary, nonManifold: a.nonManifold, degenerate: a.degenerate, directed: directedMismatch(s.positions) };
    });
    /* THE TRANSITION: every petal (what stands above the ring, blend included)
       censused ALONE, against today's same petal censused alone */
    const sliceTris = (pos, r) => pos.slice(r.from * 9, r.to * 9);
    const petals = opts.petals === false ? null : b.petalRanges.map((r, i) => {
      const mine = sliceTris(b.positions, r), today = b.plainRanges ? sliceTris(b.plainPositions || b.positions, b.plainRanges[i]) : null;
      const cm = census(mine), ct = today ? census(today) : null;
      return { c: i, within: cm.within, worstSpanMm: cm.worstSpanMm, todayWithin: ct ? ct.within : null, tris: mine.length / 9 };
    });
    /* bit-identity above the blend: petal 0's triangles that are today's triangles, by exact key */
    let identical = null;
    if (!b.free && b.plainRanges) {
      const key = (pos, t) => Array.from(pos.slice(t * 9, t * 9 + 9)).join(',');
      const todaySet = new Set(); const pr = b.plainRanges[0]; for (let t = pr.from; t < pr.to; t++) todaySet.add(key(b.plainPositions, t));
      const mr = b.petalRanges[0]; let same = 0; for (let t = mr.from; t < mr.to; t++) if (todaySet.has(key(b.positions, t))) same++;
      identical = { petal0Tris: mr.to - mr.from, identicalToToday: same };
    }
    /* THE CROSSING above h: discovery's plan gap (its §2a formula) between petal
       c's +v margin and petal c+1's -v margin, row by row, on OUR rows (blend
       included) and on TODAY's rows, layer 0 */
    const planGap = (rowsA, rowsB, i) => { const A = rowsA[i].sect(1).P, B = rowsB[i].sect(-1).P; let d = Math.atan2(B[1], B[0]) - Math.atan2(A[1], A[0]); while (d > Math.PI) d -= 2 * Math.PI; while (d <= -Math.PI) d += 2 * Math.PI; return d * (Math.hypot(A[0], A[1]) + Math.hypot(B[0], B[1])) / 2; };
    let crossing = null;
    if (!b.free && b.h !== null) {
      const n = b.n, R1 = b.geo[0].R1, ours = b.petalRows.slice(0, n), today = b.plainRows.slice(0, n);
      const NR = ours[0].length, crossedOurs = [], crossedToday = [];
      for (let i = R1; i < NR; i++) { if (planGap(ours[0], ours[1 % n], i) < 0) crossedOurs.push(+ours[0][i].u.toFixed(3)); if (planGap(today[0], today[1 % n], i) < 0) crossedToday.push(+today[0][i].u.toFixed(3)); }
      crossing = { sinusMm: planGap(ours[0], ours[1 % n], R1), uTop: ours[0][R1].u, oursAboveH: crossedOurs, todayAboveH: crossedToday };
    }
    /* THE SLIT EDGES' SHINGLE: at every slit, the two edge petals (the last of
       one panel, the first of the next) censused alone and together — the pairs
       BETWEEN them are the shingle (two shells passing as today's petals do),
       pairs WITHIN either would be a fold — beside today's same two petals */
    let slitPairs = null;
    if (!b.free && b.slits === 'edge' && b.h !== null) {
      slitPairs = [];
      for (const rr of b.ringReport) {
        if (!(rr.k > 0 && rr.k < b.n)) continue;
        const m = b.n / rr.k;
        for (let s = 0; s < rr.k; s++) {
          const pA = s * m + m - 1, pB = (s * m + m) % b.n, base = rr.layer * b.n;
          const one = (pos, ranges) => { const A = sliceTris(pos, ranges[base + pA]), B = sliceTris(pos, ranges[base + pB]); const AB = new Float64Array(A.length + B.length); AB.set(A); AB.set(B, A.length); const cA = census(A), cB = census(B), cAB = census(AB); return { withinA: cA.within, withinB: cB.within, unionWithin: cAB.within, between: cAB.cross - cA.cross - cB.cross, worstSpanMm: cAB.worstSpanMm }; };
          slitPairs.push({ layer: rr.layer, slit: s, pA, pB, ours: one(b.positions, b.petalRanges), today: one(b.plainPositions, b.plainRanges) });
        }
      }
    }
    const whole = analyzeStl(stlOf(b.positions));
    const conn = opts.conn === false ? null : connected(b.positions);
    return { b, shells, petals, identical, crossing, slitPairs, whole, conn: conn && { comps: conn.comps, stray: conn.strayFraction, refined: conn.refined } };
  });
}

export function attribute(b, shellIndex = 0) {
  const sh = b.ringShells[shellIndex], rr = b.ringReport.find((x) => x.layer === sh.layer);
  const c = census(sh.positions, { collect: true });
  const md = meridian(rr);
  const us = c.sites.map((s) => { const rho = Math.hypot(s.at[0], s.at[1]); let best = 0, bd = Infinity; md.M.forEach((m, r) => { const d = Math.hypot(m[0] - rho, m[1] - s.at[2]); if (d < bd) { bd = d; best = r; } }); return { r: best, u: rr.us[best] }; });
  const band = (lo, hi) => us.filter((x) => x.u >= lo && x.u < hi).length;
  return { within: c.within, rows: us.length ? [Math.min(...us.map((x) => x.r)), Math.max(...us.map((x) => x.r))] : null,
    uRange: us.length ? [Math.min(...us.map((x) => x.u)), Math.max(...us.map((x) => x.u))] : null,
    atSeam: us.filter((x) => x.r <= 4).length, below30: band(0, 0.3), mid: band(0.3, 0.8), mouth: band(0.8, 2),
    seamTurnDeg: md.seamTurnDeg, rhoMinMm: md.rhoMin, rhoMinU: md.rhoMinU, selfApproachMm: md.selfApproachMm, selfAt: md.selfAt, sheetMm: rr.tAt(rr.us[2]) };
}

/* ---------------- CLI ---------------- */
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const argv = process.argv.slice(2);
  const jsonOut = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null;
  const t0 = Date.now();
  const rows = [];
  const one = async (label, set, opt) => {
    const r = await measureTube(set, opt);
    const b = r.b;
    const row = { label, set, shape: opt.shape, k: opt.k, end: opt.end || 'nib', n: b.n, layers: b.layers, free: !!b.free, uNib: b.uNib,
      plainTris: b.plainTris, tubeTris: b.tubeTris, deltaTris: b.tubeTris - b.plainTris,
      ringTris: b.ringReport.reduce((a, x) => a + x.ringTris, 0),
      within: r.shells.reduce((a, x) => a + x.within, 0), worstSpanMm: Math.max(0, ...r.shells.map((x) => x.worstSpanMm || 0)),
      shells: r.shells.length, inward: r.shells.reduce((a, x) => a + x.inward, 0), oDisagree: r.shells.reduce((a, x) => a + x.oDisagree, 0),
      directed: r.shells.reduce((a, x) => a + x.directed, 0), shellBoundary: r.shells.reduce((a, x) => a + x.boundary, 0),
      boundary: r.whole.boundary, nonManifold: r.whole.nonManifold, degenerate: r.whole.degenerate, comps: r.conn && r.conn.comps, stray: r.conn && r.conn.stray, refined: r.conn && r.conn.refined,
      midribResidualMm: Math.max(0, ...b.ringReport.map((x) => x.midribResidualMm)),
      hub: b.free ? null : hubFinding(b, opt.shape) };
    rows.push(row);
    const f = (x) => (x === null || x === undefined ? '-' : x);
    console.log(`${label.padEnd(44)} ${opt.shape.padEnd(8)} k=${String(opt.k).padEnd(3)} ${row.free ? 'FREE' : ''} tris ${row.plainTris}->${row.tubeTris} (${row.deltaTris >= 0 ? '+' : ''}${row.deltaTris})  ringSI ${row.within} (span ${row.worstSpanMm.toFixed(4)})  boundary ${row.boundary} dir ${row.directed} inward ${row.inward}/${row.shells}  comps ${f(row.comps)}  midrib ${row.midribResidualMm.toExponential(1)}`);
    return row;
  };
  if (argv.includes('--attribute')) {
    const states = [['DEFAULT', {}], ['twist 90', { petalTwist: 90 }], ['twist 180', { petalTwist: 180 }], ['curl 180', { petalSpineCurl: 180 }], ['curl 270', { petalSpineCurl: 270 }], ['curl 360', { petalSpineCurl: 360 }],
      ['tilt 90 x 8', { petalTilt: 90 }], ['tilt 105 x 8', { petalTilt: 105 }], ['tilt 105 x 12', { petalTilt: 105, petalCount: 12 }], ['tilt 120 x 8', { petalTilt: 120 }], ['headRise 1', { headRise: 1 }], ['tilt 75 x curl 360', { petalTilt: 75, petalSpineCurl: 360 }],
      ['tilt 75 x 12 x 3 layers', { petalTilt: 75, petalCount: 12, layerCount: 3 }], ['layers 6', { layerCount: 6 }], ['petalCount 40 x 6 layers', { petalCount: 40, layerCount: 6 }]];
    const res = [];
    for (const [lab, set] of states) for (const shape of ['ROUND']) for (const k of [0, 2]) {
      const b = await buildTube(set, { shape, k });
      for (let i = 0; i < b.ringShells.length; i++) {
        const a = attribute(b, i);
        if (a.within === 0 && !(lab === 'DEFAULT' && i === 0)) continue;
        const sh = b.ringShells[i];
        res.push({ lab, shape, k, shell: `${sh.layer}/${sh.label}`, ...a });
        console.log(`${lab.padEnd(26)} ${shape.padEnd(8)} k=${k} L${sh.layer} ${sh.label.padEnd(7)} pairs ${String(a.within).padStart(6)}  rows ${a.rows ? a.rows.join('-') : '-'} u ${a.uRange ? a.uRange.map((x) => x.toFixed(3)).join('-') : '-'}  seam<=r4 ${a.atSeam} <.3 ${a.below30} mid ${a.mid} mouth ${a.mouth} | seamTurn ${a.seamTurnDeg.toFixed(1)} rhoMin ${a.rhoMinMm.toFixed(2)}@${(a.rhoMinU ?? 0).toFixed(2)} selfApp ${a.selfApproachMm.toFixed(2)} (${a.selfAt}) t ${a.sheetMm}`);
      }
    }
    if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(res, null, 1));
    process.exit(0);
  }
  const shapes = ['ROUND'];
  if (argv.includes('--partial')) {
    /* PARTIAL FUSION: the ring to h, free petals above with the blend */
    const out = [];
    const H = [0.25, 0.40, 0.55, 0.70];
    const one2 = async (label, set, opt) => {
      const r = await measureTube(set, opt);
      const pw = r.petals ? r.petals.reduce((a, p) => a + p.within, 0) : null, tw = r.petals ? r.petals.reduce((a, p) => a + (p.todayWithin || 0), 0) : null;
      const row = { label, set, shape: opt.shape, k: opt.k, h: opt.h, free: !!r.b.free, plainTris: r.b.plainTris, tubeTris: r.b.tubeTris, deltaTris: r.b.tubeTris - r.b.plainTris,
        ringPairs: r.shells.reduce((a, x) => a + x.within, 0), petalPairs: pw, todayPetalPairs: tw, boundary: r.whole.boundary, directed: r.shells.reduce((a, x) => a + x.directed, 0), inward: r.shells.reduce((a, x) => a + x.inward, 0),
        comps: r.conn && r.conn.comps, sinusMm: r.crossing && r.crossing.sinusMm, crossOurs: r.crossing && r.crossing.oursAboveH.length, crossToday: r.crossing && r.crossing.todayAboveH.length, identical: r.identical };
      out.push(row);
      console.log(`${label.padEnd(30)} ${opt.shape.padEnd(8)} k=${String(opt.k).padEnd(3)} h=${opt.h} tris ${row.plainTris}->${row.tubeTris} (${row.deltaTris >= 0 ? '+' : ''}${row.deltaTris}) ring ${row.ringPairs} petals ${pw} (today ${tw}) bnd ${row.boundary} dir ${row.directed} comps ${row.comps} sinus ${row.sinusMm === null ? '-' : row.sinusMm.toFixed(2)} cross ${row.crossOurs}/${row.crossToday}`);
    };
    for (const n of [5, 6, 8, 12]) for (const k of [0, ...divisorsOf(n)]) for (const shape of shapes) { await one2(`petalCount ${n}`, { petalCount: n }, { shape, k, h: 0.4 }); }
    for (const h of H) for (const shape of shapes) for (const k of [0, 1, 4]) await one2('DEFAULT', {}, { shape, k, h });
    for (const h of H) for (const shape of shapes) for (const [lab, set] of [['petalCount 5', { petalCount: 5 }], ['petalCount 12', { petalCount: 12 }],
      ['tilt 60', { petalTilt: 60 }], ['tilt 75', { petalTilt: 75 }], ['tilt 90', { petalTilt: 90 }], ['tilt 105', { petalTilt: 105 }], ['tilt 75 x 5', { petalTilt: 75, petalCount: 5 }],
      ['curl 90', { petalSpineCurl: 90 }], ['curl 180', { petalSpineCurl: 180 }], ['curl 270', { petalSpineCurl: 270 }], ['curl 360', { petalSpineCurl: 360 }], ['curl -180', { petalSpineCurl: -180 }],
      ['cup 1.2', { petalCup: 1.2 }], ['cup -0.8', { petalCup: -0.8 }], ['roll 330', { petalRoll: 330 }], ['roll -330', { petalRoll: -330 }], ['twist 180', { petalTwist: 180 }],
      ['width 30', { petalWidth: 30 }], ['length 20', { petalLength: 20 }], ['headRise 1', { headRise: 1 }], ['layers 3', { layerCount: 3 }], ['layers 6', { layerCount: 6 }]]) await one2(lab, set, { shape, k: 0, h });
    for (const shape of shapes) for (const k of [0, 2, 20]) await one2('petalCount 40 x 6 layers', { petalCount: 40, layerCount: 6 }, { shape, k, h: 0.4 });
    for (const shape of shapes) await one2('layers 6 slit', { layerCount: 6 }, { shape, k: 2, h: 0.4 });
    if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(out, null, 1));
    console.log(`${out.length} builds in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    process.exit(0);
  }
  if (argv.includes('--round2')) {
    /* PART C (Eva's rulings on Part B): ROUND only, h 0.25 the default; BLEND
       0 / 0.5 / 1 over the existing grid, slit rows at every valid k, and h
       0.40 where the notch engages */
    const out = [];
    const B3 = [0, 0.5, 1];
    const one3 = async (label, set, opt) => {
      const r = await measureTube(set, { shape: 'ROUND', ...opt });
      const b = r.b, rr = b.ringReport[0] || null;
      const pw = r.petals ? r.petals.reduce((a, p) => a + p.within, 0) : null, tw = r.petals ? r.petals.reduce((a, p) => a + (p.todayWithin || 0), 0) : null;
      const fp = b.free ? null : fusionProfile(b);
      const nc = b.free ? null : notchCorner(b);
      const sp = r.slitPairs || [];
      const row = { label, set, k: opt.k, h: opt.h, blend: opt.blend, free: !!b.free, plainTris: b.plainTris, tubeTris: b.tubeTris, deltaTris: b.tubeTris - b.plainTris,
        ringPairs: r.shells.reduce((a, x) => a + x.within, 0), petalPairs: pw, todayPetalPairs: tw, boundary: r.whole.boundary, nonManifold: r.whole.nonManifold, directed: r.shells.reduce((a, x) => a + x.directed, 0), inward: r.shells.reduce((a, x) => a + x.inward, 0),
        comps: r.conn && r.conn.comps, flareRows: rr && rr.flare.rows, flareNeed: rr && rr.flare.need, flareArcMm: rr && rr.flare.arcMm,
        sinusMm: nc && nc.gapMm, notch: nc && nc.engaged, notchR: nc && nc.r, notchDepth: nc && nc.depthMm, leanDeg: nc && nc.leanDeg, cornerTurnBefore: nc && nc.turnBeforeDeg, cornerTurnAfter: nc && nc.turnAfterDeg,
        fusionMaxTurn: fp && fp.maxTurnDeg, fusionHeightMin: fp && fp.heightMin, fusionHeightMax: fp && fp.heightMax,
        slits: sp.length, slitEdgeWithin: sp.reduce((a, x) => a + x.ours.withinA + x.ours.withinB, 0), slitUnionWithin: sp.reduce((a, x) => a + x.ours.unionWithin, 0), shingleOurs: sp.reduce((a, x) => a + x.ours.between, 0), shingleToday: sp.reduce((a, x) => a + x.today.between, 0), slitPairs: sp };
      out.push(row);
      const f = (x, d = 2) => (x === null || x === undefined ? '-' : typeof x === 'number' ? x.toFixed(d) : x);
      console.log(`${label.padEnd(26)} k=${String(opt.k).padEnd(2)} h=${opt.h} b=${opt.blend} tris ${row.plainTris}->${row.tubeTris} (${row.deltaTris >= 0 ? '+' : ''}${row.deltaTris}) ring ${row.ringPairs} petals ${pw} (today ${tw}) bnd ${row.boundary} nm ${row.nonManifold} dir ${row.directed} inw ${row.inward} comps ${row.comps} | flare ${row.flareRows}/${row.flareNeed} turn ${f(row.fusionMaxTurn, 1)} | sinus ${f(row.sinusMm)} notch ${row.notch ? `r ${f(row.notchR)} depth ${f(row.notchDepth)} turn ${f(row.cornerTurnBefore, 1)}->${f(row.cornerTurnAfter, 1)}` : 'inert'}${row.slits ? ` | slits ${row.slits} edgeWithin ${row.slitEdgeWithin} unionWithin ${row.slitUnionWithin} shingle ${row.shingleOurs} (today ${row.shingleToday})` : ''}`);
    };
    const STATES = [['DEFAULT', {}], ['petalCount 5', { petalCount: 5 }], ['petalCount 12', { petalCount: 12 }],
      ['tilt 60', { petalTilt: 60 }], ['tilt 75', { petalTilt: 75 }], ['tilt 90', { petalTilt: 90 }], ['tilt 105', { petalTilt: 105 }], ['tilt 75 x 5', { petalTilt: 75, petalCount: 5 }],
      ['curl 90', { petalSpineCurl: 90 }], ['curl 180', { petalSpineCurl: 180 }], ['curl 270', { petalSpineCurl: 270 }], ['curl 360', { petalSpineCurl: 360 }], ['curl -180', { petalSpineCurl: -180 }],
      ['cup 1.2', { petalCup: 1.2 }], ['cup -0.8', { petalCup: -0.8 }], ['roll 330', { petalRoll: 330 }], ['roll -330', { petalRoll: -330 }], ['twist 180', { petalTwist: 180 }],
      ['width 30', { petalWidth: 30 }], ['length 20', { petalLength: 20 }], ['headRise 1', { headRise: 1 }], ['layers 3', { layerCount: 3 }], ['layers 6', { layerCount: 6 }]];
    for (const [lab, set] of STATES) for (const blend of B3) await one3(lab, set, { k: 0, h: 0.25, blend });
    for (const n of [5, 6, 8, 12]) for (const k of [0, ...divisorsOf(n)]) for (const blend of B3) await one3(`petalCount ${n}`, { petalCount: n }, { k, h: 0.25, blend });
    for (const [lab, set] of [['DEFAULT', {}], ['petalCount 5', { petalCount: 5 }], ['layers 3', { layerCount: 3 }]]) for (const blend of B3) await one3(lab, set, { k: 0, h: 0.4, blend });
    for (const k of [0, 2, 20]) await one3('petalCount 40 x 6 layers', { petalCount: 40, layerCount: 6 }, { k, h: 0.25, blend: 1 });
    if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(out, null, 1));
    console.log(`${out.length} builds in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    process.exit(0);
  }
  if (argv.includes('--control')) {
    /* MUST-FAILS: each instrument shown able to see the failure it exists for */
    const c = [];
    const a = await measureTube({}, { shape: 'ROUND', k: 0, tamper: 'swapRows' }); c.push(['census fires on a folded ring (rows 40%/70% swapped)', a.shells[0].within > 0, a.shells[0].within]);
    const d = await measureTube({}, { shape: 'ROUND', k: 0, tamper: 'detach' }); c.push(['flood fill fires on a ring lifted 40 mm', d.conn.comps > 1, d.conn.comps]);
    const fl = await measureTube({}, { shape: 'ROUND', k: 0, tamper: 'flip' }); c.push(['orientation fires on a ring wound inward', fl.shells[0].inward === 1, fl.shells[0].inward]);
    const h = await measureTube({}, { shape: 'ROUND', k: 0, tamper: 'hole' }); c.push(['boundary census fires on a ring missing one triangle', h.whole.boundary > 0 && h.shells[0].boundary > 0, h.whole.boundary]);
    const sw = await measureTube({}, { shape: 'ROUND', k: 2, tamper: 'swapRows' }); c.push(['census fires on a folded SLIT panel set (ROUND k 2)', sw.shells[0].within > 0, sw.shells[0].within]);
    let ok = true; for (const [nm, fired, v] of c) { console.log(`${fired ? 'FIRED ' : 'SILENT'}  ${nm}  (${v})`); ok = ok && fired; }
    console.log(ok ? `CONTROL: all ${c.length} must-fails fired` : 'CONTROL FAILED — an instrument is blind to the failure it exists for');
    process.exit(ok ? 0 : 1);
  }
  const quick = argv.includes('--quick');
  /* 1. the count x k grid at the shipped form */
  for (const n of [5, 6, 8, 12]) for (const k of [0, ...divisorsOf(n)]) for (const shape of shapes) { await one(`petalCount ${n}`, { petalCount: n }, { shape, k }); }
  if (!quick) {
    /* 2. the tube range: tilt, at the full tube and one slit */
    for (const t of [60, 75, 90, 105, 120]) for (const n of [5, 8, 12]) for (const shape of shapes) for (const k of [0, 1]) await one(`tilt ${t} x ${n}`, { petalTilt: t, petalCount: n }, { shape, k });
    /* 3. form: curl carries through, cup / roll / twist / width are inert in the ring */
    for (const [lab, set] of [['curl -180', { petalSpineCurl: -180 }], ['curl -90', { petalSpineCurl: -90 }], ['curl 90', { petalSpineCurl: 90 }], ['curl 180', { petalSpineCurl: 180 }], ['curl 270', { petalSpineCurl: 270 }], ['curl 360 (max)', { petalSpineCurl: 360 }],
      ['cup 1.2 (max)', { petalCup: 1.2 }], ['cup -0.8 (min)', { petalCup: -0.8 }], ['roll 330 (max)', { petalRoll: 330 }], ['roll -330 (min)', { petalRoll: -330 }], ['twist 180 (max)', { petalTwist: 180 }], ['twist 90', { petalTwist: 90 }],
      ['width 30', { petalWidth: 30 }], ['length 20', { petalLength: 20 }], ['length 60', { petalLength: 60 }], ['sheet 2.4', { sheetThickness: 2.4 }],
      ['tilt 75 x curl 360', { petalTilt: 75, petalSpineCurl: 360 }], ['tilt 75 x curl -180', { petalTilt: 75, petalSpineCurl: -180 }], ['tilt 75 x cup 1.2', { petalTilt: 75, petalCup: 1.2 }], ['tilt 75 x roll 330', { petalTilt: 75, petalRoll: 330 }],
      ['headRise 0.5', { headRise: 0.5 }], ['headRise 1', { headRise: 1 }]]) for (const shape of shapes) for (const k of [0, 2]) await one(lab, set, { shape, k });
    /* 4. layers, and the densest eligible state */
    for (const L of [2, 3, 6]) for (const shape of shapes) for (const k of [0, 2, 8]) await one(`layers ${L}`, { layerCount: L }, { shape, k });
    for (const shape of shapes) for (const k of [0, 2, 20, 40]) await one('petalCount 40 x 6 layers (densest)', { petalCount: 40, layerCount: 6 }, { shape, k });
    for (const shape of shapes) await one('tilt 75 x 12 x 3 layers', { petalTilt: 75, petalCount: 12, layerCount: 3 }, { shape, k: 0 });
    /* 5. the apex: the same ring run to the TIP (the control for "ends at the nib entry") */
    for (const shape of shapes) for (const n of [5, 8]) await one(`TO THE TIP x ${n}`, { petalCount: n }, { shape, k: 0, end: 'tip' });
  }
  console.log(`${rows.length} builds in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(rows, (key, v) => (key === 'refined' && v === null ? undefined : v), 1));
}
