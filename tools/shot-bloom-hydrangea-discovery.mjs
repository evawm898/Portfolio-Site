/* ===================================================================
   tools/shot-bloom-hydrangea-discovery.mjs — THE MOPHEAD SHEET
   (docs/bloom-hydrangea-discovery.md). DISCOVERY ONLY: nothing here is
   imported by the generator, and no byte the generator emits moves.

   Prototypes of the three structures the doc costs, each assembled from
   SHIPPED builds — one floret built at the origin by `buildBloomInto`,
   appended N times under rigid frames by the shipped
   `MeshBuilder.appendTransformed` (ruling 3's Route A, ruling 4's floret) —
   plus one variant built from a PATCHED COPY of bloom-geometry.js written
   OUTSIDE the repo (tools/bloom-hydrangea-lib.mjs, the rim-roundness lab's
   precedent):
     (A) florets SESSILE on a ball receptacle, at the SPHERE head's equal-area
         polar lattice, every slot a floret instead of a petal;
     (B) a COMPOUND UMBEL — the shipped umbel with its floret pin lifted ONE
         level in the patched copy, so each primary ray carries a headless
         umbel of its own (inflorescence depth 2), every part the shipped
         umbel's;
     (C) florets on STUB pedicels from a hidden inner sphere;
   and the reduced-lattice floret (patched NU_BASE / NV / RIM_BEAD_SEGMENTS)
   beside the shipped one, alone and as a 200-floret ball.

   THE LAB'S OWN PARTS ARE NAMED AS SUCH: the ball receptacles and the stem
   under (A) and (C) are lab primitives (a closed icosphere, a closed tube),
   not shipped builders — the doc costs what the shipped SPHERE hub and stem
   would be instead. Every caption carries the floret count and the EXPORT
   triangle count; the JSON beside the PNG carries each cell's closed-solid
   census (boundary / non-manifold / directed mismatch / degenerate), the
   within-shell self-intersection census, the voxel flood fill at 0.6 mm and
   the signed volume. The renderer is tools/bloom-soft-render.mjs, which is
   DETERMINISTIC, so no pixel delta is quoted and none is owed.

   RUN:  node tools/shot-bloom-hydrangea-discovery.mjs <out-dir> [--png <file>] [--quick]
         --quick skips the self-intersection census and the flood fill.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';
import { loadVariant, registry, build, sphereLattice, frameMatrix, icosphere, edgeCensus, voxelRegions } from './bloom-hydrangea-lib.mjs';
import { census } from './bloom-self-intersection.mjs';

const outDir = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '/tmp/bloom-hydrangea-sheet';
const pngArg = process.argv.indexOf('--png'), PNG_OUT = pngArg > 0 ? process.argv[pngArg + 1] : path.join(outDir, 'hydrangea-discovery.png');
const QUICK = process.argv.includes('--quick');
fs.mkdirSync(outDir, { recursive: true });
const { DEFAULTS } = await registry();
const S = await loadVariant({});

/* THE LOOK: a hydrangea's sterile floret is four near-round sepals (the doc's
   §1 references: 16.6 x 16.5 mm on 'HYMMAD I'). On this generator the petal
   range's floor is 20 mm long, so the floret is 20 x 18 mm petals, the true
   ellipse tip (2.0, under the apex row ramp), a slight cup, lifted 15 deg. */
const LOOK = Object.freeze({ petalCount: 4, petalLength: 20, petalWidth: 18, petalTipShape: 2.0, petalCup: 0.2, petalTilt: 15 });
const STEM_R = 3, STEM_LEN = 80;

function signedVolume(p) {
  let v = 0;
  for (let t = 0; t < p.length; t += 9) {
    const ax = p[t], ay = p[t + 1], az = p[t + 2], bx = p[t + 3], by = p[t + 4], bz = p[t + 5], cx = p[t + 6], cy = p[t + 7], cz = p[t + 8];
    v += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  return v / 6;
}
/* A floret built at the origin, +z its axis, by the module handed in. */
function floretUnit(G, set) {
  const r = build(G, DEFAULTS, { ...LOOK, ...set }, { exportMode: true });
  const st = r.b.stem;
  const sessile = !(st && st.lengthMm > 0);
  /* the point that roots: the hub's underside on the axis (sessile, ruling 7's
     "rooted by one wall") or the pedicel's free end */
  const rootZ = sessile ? -st.hubT / 2 : st.tipZ;
  const lo = r.acc.lo, hi = r.acc.hi;
  return { acc: r.acc, tris: r.tris, rootZ, hubT: st.hubT, hubR: st.hubR, extentMm: Math.max(hi[0] - lo[0], hi[1] - lo[1]), heightMm: hi[2], volumeMm3: signedVolume(r.acc.positions) };
}
/* Raw soup -> something appendTransformed accepts. */
const soup = (positions) => ({ positions: Array.from(positions), minThickness: Infinity, normals: null });
const IDENT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
/* A closed tube along -z from z0 to z1 (z1 < z0), radius r, `n` sides, capped. */
function tube(r, z0, z1, n = 48) {
  const P = [];
  const at = (k, z) => { const j = k % n; return [r * Math.cos((2 * Math.PI * j) / n), r * Math.sin((2 * Math.PI * j) / n), z]; };   // k % n: the seam closes on the SAME double
  for (let k = 0; k < n; k++) {
    const a0 = at(k, z0), a1 = at(k + 1, z0), b0 = at(k, z1), b1 = at(k + 1, z1);
    P.push(...a0, ...b0, ...b1, ...a0, ...b1, ...a1);   // side, outward
    P.push(0, 0, z0, ...a0, ...a1);                     // top cap, +z
    P.push(0, 0, z1, ...b1, ...b0);                     // bottom cap, -z
  }
  return P;
}

/* ---- the compositions ---- */
function compose(parts) {
  const acc = new S.MeshBuilder({ exportMode: true });
  const kinds = [];   // per triangle: 0 floret, 1 receptacle, 2 stem/ray
  const floretIdx = [];
  for (const { src, M, kind, i } of parts) {
    const n = acc.appendTransformed(src, M || IDENT);
    for (let j = 0; j < n; j++) { kinds.push(kind); floretIdx.push(i ?? -1); }
  }
  return { acc, kinds, floretIdx };
}
/* (A) and (C): florets at the equal-area lattice over the whole ball; slots
   whose normal points into the stem channel (within `reserveDeg` of -z) are
   NOT BUILT — the sphere-stem channel's law, here as an angle for the lab. */
function ballOf(unit, { N, receptacleR, reserveDeg = 18, roll = true }) {
  const lat = sphereLattice(N).filter((s) => s.n[2] > -Math.cos((reserveDeg * Math.PI) / 180));
  const parts = [{ src: soup(icosphere(receptacleR, [0, 0, 0], 4)), kind: 1 }];
  /* the root point lands ONE SHEET inside the receptacle along the normal */
  const embed = 1.2;
  lat.forEach((s, i) => {
    const d = s.n; const rr = receptacleR - embed - unit.rootZ;
    parts.push({ src: unit.acc, M: frameMatrix([d[0] * rr, d[1] * rr, d[2] * rr], d, roll ? i * 2.39996 : 0), kind: 0, i });
  });
  parts.push({ src: soup(tube(STEM_R, -receptacleR + 2.5, -receptacleR - STEM_LEN)), kind: 2 });
  return { ...compose(parts), florets: lat.length, asked: N };
}

/* ---- measure + render ---- */
const DIR = [0.62, -0.62, 0.48];
function measure(name, positions, extra = {}) {
  const f = path.join(outDir, `${name}.json`);
  if (fs.existsSync(f) && !process.argv.includes('--fresh')) return JSON.parse(fs.readFileSync(f, 'utf8'));
  const t0 = Date.now();
  const rec = { name, tris: positions.length / 9, ...extra, ...edgeCensus(positions), volumeMm3: signedVolume(positions) };
  if (!QUICK) {
    const cs = census(positions); rec.withinShellPairs = cs.within; rec.crossShellPairs = cs.cross; rec.shells = cs.shells; rec.worstSpanMm = cs.worstSpanMm;
    rec.voxel06 = voxelRegions(positions, 0.6);
  }
  rec.measureMs = Date.now() - t0;
  fs.writeFileSync(f, JSON.stringify(rec, null, 1));
  return rec;
}
const COL = { floret: [178, 172, 228], floretB: [150, 168, 226], recept: [150, 146, 136], stem: [128, 168, 112] };
function shot(comp, { cut = false, dir = DIR, half = null } = {}) {
  let pos = comp.acc.positions; let kinds = comp.kinds; let fi = comp.floretIdx;
  if (cut) {
    /* a CUT VIEW for the eye only: drop every triangle whose centroid lies on
       the CAMERA's side of the plane through the receptacle's centre */
    const P = [], K = [], F = [];
    for (let t = 0; t < pos.length / 9; t++) {
      const cx = (pos[t * 9] + pos[t * 9 + 3] + pos[t * 9 + 6]) / 3, cy = (pos[t * 9 + 1] + pos[t * 9 + 4] + pos[t * 9 + 7]) / 3, cz = (pos[t * 9 + 2] + pos[t * 9 + 5] + pos[t * 9 + 8]) / 3;
      if (cx * dir[0] + cy * dir[1] + cz * dir[2] > 0) continue; for (let j = 0; j < 9; j++) P.push(pos[t * 9 + j]); K.push(kinds[t]); F.push(fi[t]); }
    pos = P; kinds = K; fi = F;
  }
  const lo = comp.acc.lo, hi = comp.acc.hi;
  const c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  const ext = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
  const cam = { dir, up: [0, 0, 1], center: c, halfHeight: half || ext * 0.56 };
  return render(pos, CELL, CELL, cam, { colorOf: (t) => kinds[t] === 1 ? COL.recept : kinds[t] === 2 ? COL.stem : (fi[t] % 2 ? COL.floretB : COL.floret) });
}

const CELL = 480, CAP = 64, COLS = 3;
const cells = [];
const add = (img, lines, rec) => { cells.push({ img, lines }); console.log(lines.join(' | '), rec ? JSON.stringify({ bnd: rec.boundary, nm: rec.nonManifold, dir: rec.directedMismatch, deg: rec.degenerate, within: rec.withinShellPairs, vox: rec.voxel06 && rec.voxel06.regions }) : ''); };
const k = (n) => n.toLocaleString('en-US');

/* 1. the shipped floret, sessile */
const F = floretUnit(S, {});
{
  const c = compose([{ src: F.acc, kind: 0, i: 0 }]); const rec = measure('01-floret-shipped', c.acc.positions, { hubR: F.hubR, extentMm: F.extentMm });
  add(shot(c, { dir: [0.25, -0.35, 0.9] }), ['1 SHIPPED FLORET, SESSILE', `4 PETALS 20 X 18 MM: ${k(F.tris)} TRIS`, `LIVE = EXPORT, ${F.extentMm.toFixed(1)} MM ACROSS`], rec);
}
/* 2. the reduced-lattice floret */
const RV = { nu: 28, nv: 6, k: 2 };
const GR = await loadVariant(RV);
const FR = floretUnit(GR, {});
{
  const c = compose([{ src: FR.acc, kind: 0, i: 0 }]); const rec = measure('02-floret-reduced', c.acc.positions, { variant: RV });
  add(shot(c, { dir: [0.25, -0.35, 0.9], half: F.extentMm * 0.56 }), ['2 LAB FLORET NU 28 NV 6 K 2', `PATCHED COPY: ${k(FR.tris)} TRIS`, `= ${(FR.tris / F.tris * 100).toFixed(0)}% OF THE SHIPPED ONE`], rec);
}
/* 3. (A) sessile ball, shipped florets */
const RA = 64;
const A = ballOf(F, { N: 116, receptacleR: RA });
{
  const rec = measure('03-A-sessile-shipped', A.acc.positions, { florets: A.florets, receptacleR: RA });
  add(shot(A), [`3 (A) SESSILE: ${A.florets} SHIPPED FLORETS`, `${k(A.acc.triangleCount)} TRIS = ${(A.acc.triangleCount / S.EXPORT_TRI_BUDGET * 100).toFixed(1)}% BUDGET`, `LAB BALL R ${RA} MM + LAB STEM`], rec);
}
/* 4. (A) cut view */
add(shot(A, { cut: true }), ['4 (A) CUT VIEW (EYE ONLY)', `RECEPTACLE R ${RA} MM, SOLID = ${(4 / 3 * Math.PI * RA ** 3 / 1000).toFixed(0)} CM3`, `FLORET ROOT 1.2 MM IN`], null);
/* 5. (A) with the reduced floret, 200 */
const A2 = ballOf(FR, { N: 206, receptacleR: RA });
{
  const rec = measure('05-A-sessile-reduced', A2.acc.positions, { florets: A2.florets, receptacleR: RA, variant: RV });
  add(shot(A2), [`5 (A) SESSILE: ${A2.florets} LAB FLORETS`, `${k(A2.acc.triangleCount)} TRIS = ${(A2.acc.triangleCount / S.EXPORT_TRI_BUDGET * 100).toFixed(1)}% BUDGET`, 'NU 28 NV 6 K 2, SAME BALL'], rec);
}
/* 6. (C) stubs from a hidden inner sphere */
const FS = floretUnit(S, { stemLength: 22, stemDiameter: 3, stemCut: 'FLAT' });
const RC = 40;
const C = ballOf(FS, { N: 102, receptacleR: RC, reserveDeg: 26 });
{
  const rec = measure('06-C-stubs', C.acc.positions, { florets: C.florets, receptacleR: RC, stubMm: 22 });
  add(shot(C), [`6 (C) STUBS: ${C.florets} SHIPPED FLORETS`, `${k(C.acc.triangleCount)} TRIS = ${(C.acc.triangleCount / S.EXPORT_TRI_BUDGET * 100).toFixed(1)}% BUDGET`, `22 MM PEDICELS, INNER R ${RC}`], rec);
}
add(shot(C, { cut: true }), ['7 (C) CUT VIEW (EYE ONLY)', `INNER SPHERE R ${RC} MM, SOLID = ${(4 / 3 * Math.PI * RC ** 3 / 1000).toFixed(0)} CM3`, 'PEDICEL END 1.2 MM IN'], null);
/* 8. (B) the compound umbel through the patched depth-2 copy */
const G2 = await loadVariant({ depth2: true });
const D2 = { umbelFlorets: 11, pedicelLength: 12, pedicelAngle: 20 };
globalThis.__hydrangeaDepth2 = D2;
const B1 = { umbelFlorets: 9, pedicelLength: 40, pedicelAngle: 50 };
const Bb = build(G2, DEFAULTS, { ...LOOK, floretPetals: 4, floretScale: 1, inflorescence: 'UMBEL', umbelHead: 'OFF', ...B1, stemLength: STEM_LEN, stemDiameter: 6 }, { exportMode: true });
globalThis.__hydrangeaDepth2 = null;
{
  const nF = B1.umbelFlorets * D2.umbelFlorets;
  const comp = { acc: Bb.acc, kinds: new Array(Bb.tris).fill(0), floretIdx: new Array(Bb.tris).fill(0) };
  const rec = measure('08-B-compound-umbel', Bb.acc.positions, { florets: nF, primary: B1, secondary: D2 });
  add(shot(comp), [`8 (B) COMPOUND UMBEL ${B1.umbelFlorets} X ${D2.umbelFlorets} = ${nF}`, `${k(Bb.tris)} TRIS = ${(Bb.tris / S.EXPORT_TRI_BUDGET * 100).toFixed(1)}% BUDGET`, 'SHIPPED UMBEL, PIN LIFTED 1 LEVEL'], rec);
  add(shot(comp, { dir: [0.4, -0.5, -0.75] }), ['9 (B) FROM BELOW', `RAYS ${B1.pedicelLength} MM AT ${B1.pedicelAngle}, PEDICELS ${D2.pedicelLength} MM AT ${D2.pedicelAngle}`, 'EVERY JOIN A SHIPPED BOSS'], null);
}

/* ---- the sheet ---- */
const rowsN = Math.ceil(cells.length / COLS);
const W = COLS * CELL, H = rowsN * (CELL + CAP) + 40;
const sheet = Buffer.alloc(W * H * 3, 16);
text(sheet, W, H, 12, 12, 'MOPHEAD HYDRANGEA DISCOVERY: PROTOTYPES, EXPORT, BUDGET 1500000 TRIS. LAB PARTS NAMED.', [235, 232, 220], 2);
cells.forEach((c, i) => {
  const x = (i % COLS) * CELL, y = 40 + Math.floor(i / COLS) * (CELL + CAP);
  blit(sheet, W, H, c.img, CELL, CELL, x, y);
  c.lines.forEach((l, j) => text(sheet, W, H, x + 8, y + CELL + 6 + j * 19, l, j ? [200, 200, 196] : [245, 240, 225], 2));
});
writePng(PNG_OUT, W, H, sheet);
console.log(`wrote ${PNG_OUT} (${W}x${H})`);
