/* ===================================================================
   THE TUBE'S FUSION GATE — TU0..TU6 (corolla fusion, the build session).

   `node tools/verify-bloom-tube.mjs [--control] [--quick]`

   Node only: the geometry and the registry, imported directly; no browser,
   no harness, no playwright — so it rides in bloom-export-watertight.yml's
   preflight job beside the wall instrument. Every state is built in BOTH
   modes. The tube's STL rows ride in the matrix (block 45) as well, where both
   STL gates hold them to boundary 0, one piece, the census and O1/O2.

   WHY IT IS OWED — BOTH STL GATES ARE BLIND TO WHAT THE TUBE IS FOR. A ring
   that never reaches a fused seam, a slit that was fused shut, a ring drawn on
   the same surface as the petal it carries, a notch that exists in one mode
   and not the other, and a panel count that is not the one the controls ask
   for ALL export watertight and as one connected piece.

     TU0  TWO STATEMENTS OF ONE BOUNDARY — the registry's `tubeEligible`
          predicate against the geometry's `tubeEligible()` on states either
          side of every term, and an INELIGIBLE state asking for a ring builds
          the FREE bloom float for float (inert by branch).
     TU1  THE SNAP — the plan's BUILT k per whorl against the snap RESTATED
          here from the ruling (nearest of 0, the divisors of n, n; ties DOWN;
          asked >= n is FREE). Never imported: the geometry's `tubeSnap` is the
          quantity under test.
     TU2  FUSED IS CLOSED — at every seam the ruling fuses (all of them for the
          full tube; every seam inside a panel otherwise), on every ring row
          from the first blade row to RING_SAMPLE of the ring's height, a line
          through the seam point along the meridian's normal crosses RING
          material (two or more crossings within PROBE_MM).
     TU3  A SLIT IS OPEN — at every seam the ruling slits, on the same rows,
          that line crosses NO ring material.
          THE REFERENCE FOR BOTH IS NOT THE RING'S: the seam's azimuth and
          height come from the FREE build's own petals (the petal builder's
          midribs, read through the rows hook with no ring anywhere), the seam
          set from the restated snap and the ruling's panel law, and the probe
          reads the EMITTED triangles. The ring's own report supplies only the
          triangle RANGE the ring was emitted into.
     TU4  NO TWO SHELLS SHARE A SURFACE (MUST FIX 1) — every ring triangle's
          centroid, probed along its own normal, finds no PETAL triangle within
          COINCIDENT_MM — a facet that is also on the HUB's skin is today's
          foot-on-hub class (every foot's skin is the hub's) and is counted
          apart, never against the bar. The measure is AREA (mm²) and the bar is a
          sliver: the trim ramps from full to TUBE_TRIM_KEEP, so along the two
          curves where it starts (the lobe's first row, a petal margin) the
          gap passes through zero by construction; COINCIDENT_BAND_MM is the
          width of that band the bar admits per mm of curve.
     TU5  THE MODES AGREE ON TOPOLOGY (MUST FIX 2) — live and export build the
          same triangle count, cut the notch in the same set of sinuses and
          start every lobe on the same row. The thin-sheet row is the one the
          prototype found mode-dependent (§C8b).
     TU6  THE SOLID — 0 boundary edges, 0 directed-edge mismatches, 0 inward
          shells and ONE connected piece (the connectedness gate's own voxel
          fill, sliced from its source) on every fused build, both modes.

   WHAT IT DOES NOT SEE, said here so it is not mistaken for coverage: the
   fused seam is probed below RING_SAMPLE of the ring's height, so a ring that
   stops short of h (or a notch cut too deep) is TU2-blind there — the read-out
   and the census see that; the slit probe asks about RING triangles only, so a
   petal fused across a slit (two edge petals welded) is not its subject — the
   census's shell count is; TU4 probes ring centroids only, so a petal drawn on
   a petal is not its subject; and nothing here judges how the fusion LOOKS —
   docs/img/bloom-tube-live.png is that.

   --control runs SIX must-fails on a mutated COPY of bloom-geometry.js (each
   anchor checked to match exactly once before any runs): a ring panel dropped
   (the positive control — TU2), a slit fused shut (the negative control —
   TU3), the untrimmed ring (TU4), the notch reading its own mode only (TU5),
   the snap's ties going up (TU1), and the eligibility forgetting the buckle
   (TU0).
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as R from '../bloom-registry.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const argv = process.argv.slice(2);
const QUICK = argv.includes('--quick') || argv.includes('--control');   // the must-fails run on the quick set: every state each mutant needs is in it

export const PROBE_MM = 3.0;            // how far either side of the seam point the TU2/TU3 line reaches
export const RING_SAMPLE = 0.6;         // the fraction of the ring's rows TU2/TU3 sample (below the notch)
export const COINCIDENT_MM = 0.01;      // a ring facet nearer another shell than this is drawn on its surface
export const COINCIDENT_BAND_MM = 0.25; // the admitted sliver per mm of trim boundary (see TU4)

const kind = new Map(R.CONTROLS.map((c) => [c.id, c]));
function stateOf(set) {
  const s = { ...R.DEFAULTS };
  for (const [id, v] of Object.entries(set)) {
    const c = kind.get(id); if (!c) throw new Error(`no control "${id}"`);
    s[id] = c.kind === 'slider' ? Number(v) : String(v);
  }
  return s;
}
/* THE SNAP, RESTATED FROM THE RULING (TU1's reference). */
function snapRestated(asked, n) {
  if (asked >= n) return n;
  const valid = [0]; for (let d = 1; d <= n; d++) if (n % d === 0) valid.push(d);
  let best = valid[0];
  for (const k of valid) { const dk = Math.abs(k - asked), db = Math.abs(best - asked); if (dk < db || (dk === db && k < best)) best = k; }
  return best;
}

/* ---------------- geometry helpers ---------------- */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const tri = (P, t) => [[P[t * 9], P[t * 9 + 1], P[t * 9 + 2]], [P[t * 9 + 3], P[t * 9 + 4], P[t * 9 + 5]], [P[t * 9 + 6], P[t * 9 + 7], P[t * 9 + 8]]];
/* signed parameters where the line O + s D crosses triangle t (Moller-Trumbore) */
function lineHit(P, t, O, D) {
  const [A, B, C] = tri(P, t);
  const e1 = sub(B, A), e2 = sub(C, A), p = cross(D, e2), det = dot(e1, p);
  if (Math.abs(det) < 1e-14) return null;
  const inv = 1 / det, sv = sub(O, A), u = dot(sv, p) * inv;
  if (u < -1e-9 || u > 1 + 1e-9) return null;
  const q = cross(sv, e1), v = dot(D, q) * inv;
  if (v < -1e-9 || u + v > 1 + 1e-9) return null;
  return dot(e2, q) * inv;
}
/* a uniform grid over a triangle range, for the probes */
function gridOf(P, ranges, cell) {
  const g = new Map();
  for (const [a, b] of ranges) for (let t = a; t < b; t++) {
    const T = tri(P, t);
    const lo = [0, 1, 2].map((k) => Math.floor(Math.min(T[0][k], T[1][k], T[2][k]) / cell));
    const hi = [0, 1, 2].map((k) => Math.floor(Math.max(T[0][k], T[1][k], T[2][k]) / cell));
    for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) {
      const k = `${x},${y},${z}`; let l = g.get(k); if (!l) g.set(k, l = []); l.push(t);
    }
  }
  return { g, cell, near: (Q, r) => {
    const out = new Set();
    const lo = Q.map((x) => Math.floor((x - r) / cell)), hi = Q.map((x) => Math.floor((x + r) / cell));
    for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) { const l = g.get(`${x},${y},${z}`); if (l) for (const t of l) out.add(t); }
    return out;
  } };
}
function boundaryAndDirected(P) {
  const key = (i) => `${P[i]},${P[i + 1]},${P[i + 2]}`;
  const und = new Map(), dir = new Map();
  for (let t = 0; t < P.length / 9; t++) for (let c = 0; c < 3; c++) {
    const a = key(t * 9 + c * 3), b = key(t * 9 + ((c + 1) % 3) * 3); if (a === b) continue;
    const u = a < b ? `${a}|${b}` : `${b}|${a}`; und.set(u, (und.get(u) || 0) + 1);
    const f = `${a}>${b}`, r = `${b}>${a}`;
    if (dir.get(r) > 0) dir.set(r, dir.get(r) - 1); else dir.set(f, (dir.get(f) || 0) + 1);
  }
  let boundary = 0; for (const v of und.values()) if (v === 1) boundary++;
  let directed = 0; for (const v of dir.values()) directed += v;
  return { boundary, directed };
}
let VOX = null;
function connectedPieces(P) {
  if (!VOX) {
    const src = fs.readFileSync(path.join(ROOT, 'tools/verify-bloom-connectedness.mjs'), 'utf8');
    const a = src.indexOf('function voxelComponents(buf, cell) {'), b = src.indexOf('const rows = buildMatrix();');
    if (a < 0 || b < 0 || b < a) throw new Error('could not slice voxelComponents/componentsRefined from verify-bloom-connectedness.mjs — it moved; refusing');
    VOX = new Function('MAX_VOXELS', `${src.slice(a, b)}\nreturn { voxelComponents, componentsRefined };`)(448e6);
  }
  const nT = P.length / 9; const buf = Buffer.alloc(84 + 50 * nT); buf.writeUInt32LE(nT, 80);
  for (let t = 0; t < nT; t++) { const o = 84 + 50 * t; for (let k = 0; k < 9; k++) buf.writeFloatLE(P[t * 9 + k], o + 12 + 4 * k); }
  const r = VOX.componentsRefined(buf, 0.6);
  return r.comps;
}

/* ---------------- the states ---------------- */
function tubeSet(set, k, h, blend, perLayer = null) {
  const s = { ...set, tubeHeight: h, tubeBlend: blend };
  const L = Math.round(Number(set.layerCount || 1));
  for (let i = 1; i <= L; i++) s[`tubeLayer${i}`] = perLayer ? perLayer[i - 1] : k;
  return s;
}
const divisors = (n) => { const d = []; for (let k = 1; k < n; k++) if (n % k === 0) d.push(k); return d; };
function buildStates() {
  const S = [];
  for (const n of [5, 6, 8, 12]) for (const k of [0, ...divisors(n)]) S.push({ label: `n ${n} k ${k} h 0.25 BLEND 1`, set: tubeSet({ petalCount: n }, k, 0.25, 1) });
  for (const h of [0.10, 0.25, 0.40, 0.58]) for (const k of [0, 2]) for (const b of [0, 1]) S.push({ label: `n 8 k ${k} h ${h} BLEND ${b}`, set: tubeSet({}, k, h, b) });
  S.push({ label: '3 whorls, k 0 / 2 / FREE', set: tubeSet({ layerCount: 3 }, 0, 0.25, 1, [0, 2, 40]) });
  S.push({ label: '3 whorls, k 4 / 0 / 1', set: tubeSet({ layerCount: 3 }, 0, 0.25, 1, [4, 0, 1]) });
  S.push({ label: 'snap: asked 3 at n 8 (ties down to 2)', set: tubeSet({}, 3, 0.25, 1) });
  S.push({ label: 'snap: asked 6 at n 8 (ties down to 4)', set: tubeSet({}, 6, 0.25, 1) });
  S.push({ label: 'snap: asked 7 at n 8 (FREE)', set: tubeSet({}, 7, 0.25, 1) });
  S.push({ label: 'thin sheet 0.6, k 2 h 0.40 (notch parity)', set: tubeSet({ sheetThickness: 0.6 }, 2, 0.40, 1) });
  S.push({ label: 'thin sheet 0.6, k 0 h 0.40', set: tubeSet({ sheetThickness: 0.6 }, 0, 0.40, 1) });
  /* THE PARITY WITNESS: on this sheet the live sinus is 0.144 mm and the export
     one 0.908 against the 0.50 mm bead bar — a notch reading its own mode only
     cuts in one mode and not the other (found by search; see the doc) */
  S.push({ label: 'thin sheet 0.6, 7 petals, k 0 h 0.40 (the modes split at the bar)', set: tubeSet({ sheetThickness: 0.6, petalCount: 7 }, 0, 0.40, 1) });
  S.push({ label: '5 petals k 0 h 0.40 (a notch is cut)', set: tubeSet({ petalCount: 5 }, 0, 0.40, 1) });
  return QUICK ? S.filter((_, i) => i % 4 === 0 || /thin|snap|whorls|notch/.test(S[i].label)) : S;
}
/* TU0's states: either side of every term of the predicate */
const ELIGIBILITY = [
  { set: {}, want: true }, { set: { placement: 'FAN' }, want: false }, { set: { placement: 'SPIRAL' }, want: false },
  { set: { placement: 'CONTINUOUS' }, want: false }, { set: { placement: 'CONTINUOUS', hubShape: 'SPHERE' }, want: false },
  { set: { varianceSize: 0.1 }, want: false }, { set: { varianceForm: 0.1 }, want: false },
  { set: { buckleAmp: 0.2 }, want: false }, { set: { fringeCount: 4, petalTipEnd: 1 }, want: false },
  { set: { petalInfill: 'VORONOI' }, want: false }, { set: { stemLength: 60, inflorescence: 'RACEME' }, want: false },
  { set: { stemLength: 60 }, want: true }, { set: { layerCount: 2, layerPhase: 0, labellumCup: 0.4 }, want: false },
  { set: { layerCount: 2, layerPhase: 0 }, want: true }, { set: { layerCount: 2, layerPhase: 0.5, labellumCup: 0.4 }, want: true },
  { set: { sepalCount: 5 }, want: true }, { set: { lobeDepth: 0.3 }, want: true },
];

/* ---------------- one run over one geometry module ---------------- */
async function run(G, { log = true } = {}) {
  const fails = [];
  const fail = (s) => { fails.push(s); if (log) console.log(`  FAIL ${s}`); };
  const pred = R.PREDICATES.tubeEligible;
  /* TU0 */
  for (const e of ELIGIBILITY) {
    const st = stateOf(e.set);
    const reg = R.evalPredicate(pred, st), geo = G.tubeEligible(st);
    if (reg !== e.want || geo !== e.want) fail(`TU0: ${JSON.stringify(e.set)} — the ruling says ${e.want ? 'eligible' : 'unavailable'}, the registry says ${reg}, the geometry says ${geo}`);
    if (!e.want) {
      const a = new G.MeshBuilder({ exportMode: true }), b = new G.MeshBuilder({ exportMode: true });
      try { G.buildBloomInto(a, stateOf({ ...e.set, tubeLayer1: 0 }), {}); G.buildBloomInto(b, st, {}); }
      catch (err) { fail(`TU0: ${JSON.stringify(e.set)} is unavailable and a ring asked there THREW — ${err.message.slice(0, 120)}`); continue; }
      let d = a.positions.length !== b.positions.length ? -1 : 0;
      if (!d) for (let i = 0; i < a.positions.length; i++) if (!Object.is(a.positions[i], b.positions[i])) { d++; }
      if (d) fail(`TU0: ${JSON.stringify(e.set)} is unavailable and a ring asked there moved ${d < 0 ? 'the triangle count' : `${d} floats`} — not inert`);
    }
  }
  const rows = [];
  for (const S of buildStates()) {
    const st = stateOf(S.set);
    const n = Math.round(st.petalCount), layers = Math.round(st.layerCount);
    const per = {};
    for (const mode of ['live', 'export']) {
      const acc = new G.MeshBuilder({ exportMode: mode === 'export' });
      let built;
      try { built = G.buildBloomInto(acc, st, {}); } catch (err) { fail(`TU6: ${S.label} [${mode}] the build THREW — ${err.message.slice(0, 140)}`); per[mode] = null; continue; }
      const P = acc.positions, t = built.tube;
      per[mode] = { tris: P.length / 9, t };
      /* TU1 */
      for (let L = 0; L < layers; L++) {
        const want = snapRestated(Math.round(st[`tubeLayer${L + 1}`]), n);
        if (t.layers[L].k !== want) fail(`TU1: ${S.label} [${mode}] whorl ${L + 1} asked ${st[`tubeLayer${L + 1}`]} built ${t.layers[L].k}, the ruling's snap says ${want}`);
      }
      if (!t.active) continue;
      /* the FREE build's own midribs — the reference the ring does not own */
      const free = {}; for (let i = 1; i <= 6; i++) free[`tubeLayer${i}`] = 40;
      const fb = G.buildBloomInto(new G.MeshBuilder({ exportMode: mode === 'export' }), { ...st, ...free }, { capability: { tubeLobe: () => null } });
      const ringRanges = t.rings.map((r) => [r.triFrom, r.triTo]);
      for (const r of t.rings) {
        const ringGrid = gridOf(P, [[r.triFrom, r.triTo]], 1.0);
        const L = r.layer, k = snapRestated(Math.round(st[`tubeLayer${L + 1}`]), n), m = k === 0 ? n : n / k;
        const ps = fb.petalsAll.slice(L * n, (L + 1) * n).map((p) => p.tubeRows);
        const top = Math.max(4, Math.floor(r.rows * RING_SAMPLE));
        let closedProbes = 0, openProbes = 0;
        for (let p = 0; p < n; p++) {
          const q = (p + 1) % n;
          const slit = k > 0 && (p + 1) % m === 0;
          for (let row = 3; row < top; row++) {
            const A = ps[p][row].sect(0).P, B = ps[q][row].sect(0).P;
            const thA = Math.atan2(A[1], A[0]); let thB = Math.atan2(B[1], B[0]); while (thB < thA) thB += 2 * Math.PI;
            const th = (thA + thB) / 2, rho = (Math.hypot(A[0], A[1]) + Math.hypot(B[0], B[1])) / 2, z = (A[2] + B[2]) / 2;
            const O = [rho * Math.cos(th), rho * Math.sin(th), z];
            /* the meridian's normal in the seam's vertical half-plane */
            const A1 = ps[p][row + 1].sect(0).P, A0 = ps[p][row - 1].sect(0).P;
            const dr = Math.hypot(A1[0], A1[1]) - Math.hypot(A0[0], A0[1]), dz = A1[2] - A0[2];
            const D = [-dz * Math.cos(th), -dz * Math.sin(th), dr]; const DL = len(D); D[0] /= DL; D[1] /= DL; D[2] /= DL;
            /* distinct crossings: a line through a lattice edge meets both
               triangles that share it at one parameter, and counts once */
            const ss = new Set();
            for (const tt of ringGrid.near(O, PROBE_MM)) { const s = lineHit(P, tt, O, D); if (s !== null && Math.abs(s) <= PROBE_MM) ss.add(Math.round(s * 1e6)); }
            const hits = ss.size;
            if (slit) { openProbes++; if (hits) fail(`TU3: ${S.label} [${mode}] whorl ${L + 1} — the slit after petal ${p + 1} is CLOSED at row ${row} (${hits} ring crossings)`); }
            else { closedProbes++; if (hits < 2) fail(`TU2: ${S.label} [${mode}] whorl ${L + 1} — the fused seam after petal ${p + 1} is OPEN at row ${row} (${hits} ring crossings)`); }
          }
        }
        if (!closedProbes) fail(`TU2: ${S.label} [${mode}] whorl ${L + 1} probed no fused seam — vacuous`);
        if (k > 0 && !openProbes) fail(`TU3: ${S.label} [${mode}] whorl ${L + 1} probed no slit — vacuous`);
      }
      /* TU4: coincident area */
      /* the probe set is the PETALS (every triangle before the hub): the ring's
         foot rows lie inside the hub by design, as every petal foot does */
      const others = [[0, built.petalTriEnd]];
      const allGrid = gridOf(P, others, 1.0);
      const hubGrid = gridOf(P, [[built.petalTriEnd, built.hubTriEnd]], 1.0);
      let coincident = 0, onHub = 0, ringArea = 0, boundaryMm = 0;
      for (const [a, b] of ringRanges) for (let tt = a; tt < b; tt++) {
        const [X, Y, Z] = tri(P, tt);
        const N = cross(sub(Y, X), sub(Z, X)), area = len(N) / 2; if (!(area > 0)) continue;
        ringArea += area;
        const D = [N[0] / (2 * area), N[1] / (2 * area), N[2] / (2 * area)];
        const C = [(X[0] + Y[0] + Z[0]) / 3, (X[1] + Y[1] + Z[1]) / 3, (X[2] + Y[2] + Z[2]) / 3];
        let hit = false;
        for (const u of allGrid.near(C, 0.05)) { const s = lineHit(P, u, C, D); if (s !== null && Math.abs(s) < COINCIDENT_MM) { hit = true; break; } }
        if (!hit) continue;
        /* A FACET ON THE HUB'S OWN SKIN is today's foot-on-hub class (every
           petal foot's skin is the hub's, FREE or fused, and several whorls'
           feet stack there) — not a ring drawn on a petal. Counted apart. */
        let hub = false;
        for (const u of hubGrid.near(C, 0.05)) { const s = lineHit(P, u, C, D); if (s !== null && Math.abs(s) < COINCIDENT_MM) { hub = true; break; } }
        if (hub) onHub += area; else coincident += area;
      }
      /* the trim boundary's length: each fused petal contributes its two margins
         over the ring rows plus its lobe's first row — bounded above by
         (2 * ring height + petal width) per petal; read off the FREE midribs */
      for (const r of t.rings) {
        const ps = fb.petalsAll.slice(r.layer * n, (r.layer + 1) * n).map((p) => p.tubeRows);
        let hgt = 0; for (let row = 1; row < r.rows; row++) hgt += len(sub(ps[0][row].sect(0).P, ps[0][row - 1].sect(0).P));
        const wid = len(sub(ps[0][r.rows - 1].sect(1).P, ps[0][r.rows - 1].sect(-1).P));
        boundaryMm += n * (2 * hgt + wid);
      }
      const bar = COINCIDENT_BAND_MM * boundaryMm;
      per[mode].coincident = coincident; per[mode].onHub = onHub;
      if (coincident > bar) fail(`TU4: ${S.label} [${mode}] ${coincident.toFixed(2)} mm² of ring drawn on another shell's surface (within ${COINCIDENT_MM} mm), over the ${bar.toFixed(2)} mm² sliver its trim boundary admits`);
      /* TU6 */
      const bd = boundaryAndDirected(P);
      if (bd.boundary) fail(`TU6: ${S.label} [${mode}] ${bd.boundary} boundary edges`);
      if (bd.directed) fail(`TU6: ${S.label} [${mode}] ${bd.directed} directed-edge mismatches`);
      if (mode === 'export' || !QUICK) {
        const { orientation } = await import('./bloom-self-intersection.mjs');
        const o = orientation(Array.from(P));
        if (o.inward) fail(`TU6: ${S.label} [${mode}] ${o.inward} shell(s) wound inward`);
        const pieces = connectedPieces(P);
        if (pieces !== 1) fail(`TU6: ${S.label} [${mode}] ${pieces} connected pieces`);
      }
    }
    /* TU5 */
    const a = per.live, b = per.export;
    if (!a || !b) continue;
    if (a.tris !== b.tris) fail(`TU5: ${S.label} live builds ${a.tris} triangles, export ${b.tris}`);
    if (a.t.active) for (let i = 0; i < a.t.rings.length; i++) {
      const x = a.t.rings[i], y = b.t.rings[i];
      const cx = x.notch.sinuses.map((s) => s.r > 0).join(), cy = y.notch.sinuses.map((s) => s.r > 0).join();
      if (cx !== cy) fail(`TU5: ${S.label} whorl ${x.layer + 1} — the notch is cut in [${cx}] live and [${cy}] export`);
      if (x.flare.rows !== y.flare.rows) fail(`TU5: ${S.label} whorl ${x.layer + 1} — the lobe starts ${x.flare.rows} rows down live and ${y.flare.rows} export`);
    }
    rows.push({ label: S.label, tris: b.tris, active: b.t.active, rings: b.t.rings.map((r) => `k${r.k}`).join('/'), coincident: [a.coincident, b.coincident] });
    if (log) console.log(`  ${S.label.padEnd(44)} tris ${String(b.tris).padStart(7)} (both modes) ${b.t.active ? `rings ${rows[rows.length - 1].rings}` : 'FREE'}${b.t.active ? `  coincident ${a.coincident.toFixed(2)} / ${b.coincident.toFixed(2)} mm² (on the hub ${b.onHub.toFixed(2)})` : ''}`);
  }
  return { fails, rows };
}

/* ---------------- the must-fails ---------------- */
const MUTANTS = [
  { id: 'a-ring-panel-is-dropped', names: 'TU2', from: "        emitPanel(acc, rows, { label: `panel${s}`, nv: NVp, thinAt: thinFor(phiOf),",
    to: "        if (s === 1) continue;\n        emitPanel(acc, rows, { label: `panel${s}`, nv: NVp, thinAt: thinFor(phiOf)," },
  { id: 'a-slit-is-fused-shut', names: 'TU3', from: "        segs.push({ a: thm[p1], b: thm[p1] + TUBE_SLIT_OVERLAP_MM / rhoB, cols: 2 });",
    to: "        segs.push({ a: thm[p1], b: thm[p1] + D, cols: 8 });" },
  { id: 'the-ring-is-untrimmed', names: 'TU4', from: 'export const TUBE_TRIM_KEEP = 0.5;', to: 'export const TUBE_TRIM_KEEP = 1;' },
  { id: 'the-notch-reads-its-own-mode', names: 'TU5', from: '      const Wo = other && other[L] ? other[L].W[p] : W;', to: '      const Wo = W;' },
  { id: 'the-snap-ties-go-up', names: 'TU1', from: '  for (const k of tubeValidK(N)) if (Math.abs(k - a) < Math.abs(best - a)) best = k;', to: '  for (const k of tubeValidK(N)) if (Math.abs(k - a) <= Math.abs(best - a)) best = k;' },
  { id: 'the-eligibility-forgets-the-buckle', names: 'TU0', from: '  if (Math.abs(Number(state.buckleAmp) || 0) > 0) return false;\n', to: '' },
];
async function control() {
  const src = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
  for (const m of MUTANTS) { const c = src.split(m.from).length - 1; if (c !== 1) { console.error(`REFUSED: mutant ${m.id}'s anchor matches ${c} times (want 1) — the geometry moved`); process.exit(2); } }
  let bad = 0;
  for (const m of MUTANTS) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tube-mut-'));
    const f = path.join(dir, 'bloom-geometry.mjs');
    fs.writeFileSync(f, src.replace(m.from, () => m.to));
    const G = await import(pathToFileURL(f).href);
    const { fails } = await run(G, { log: false });
    const fired = new Set(fails.map((x) => x.split(':')[0]));
    const ok = fired.has(m.names);
    if (!ok) bad++;
    console.log(`  ${ok ? 'FIRED ' : 'MISSED'} ${m.id.padEnd(36)} names ${m.names} — fired ${[...fired].join(', ') || 'nothing'} (${fails.length} findings)${ok ? `: ${fails.find((x) => x.startsWith(m.names)).slice(0, 140)}` : ''}`);
  }
  return bad;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const t0 = Date.now();
  if (argv.includes('--control')) {
    console.log('verify-bloom-tube --control: six must-fails on a mutated copy of bloom-geometry.js');
    const bad = await control();
    console.log(bad ? `FAILED — ${bad} mutant(s) not caught by the clause they name` : `PASS — all ${MUTANTS.length} mutants caught by the clause they name (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    process.exit(bad ? 1 : 0);
  }
  const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
  console.log(`verify-bloom-tube: TU0-TU6 over ${buildStates().length} states x both modes${QUICK ? ' (--quick)' : ''}`);
  const { fails } = await run(G);
  console.log(fails.length ? `FAILED — ${fails.length} finding(s)` : `PASS — TU0-TU6 hold (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  process.exit(fails.length ? 1 : 0);
}
