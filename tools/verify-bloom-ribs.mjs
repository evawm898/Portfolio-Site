#!/usr/bin/env node
/* ===================================================================
   verify-bloom-ribs.mjs — THE RIBS PROTOTYPE'S GATE (local only, not in CI).
   docs/bloom-surface-texture-ribs.md §6.

     node tools/verify-bloom-ribs.mjs                 the clauses on the clean module
     node tools/verify-bloom-ribs.mjs --negative-control   every mutant must fire its clause
     node tools/verify-bloom-ribs.mjs --browser       + R5's engine half (Chromium vs Node)
     node tools/verify-bloom-ribs.mjs --only=<id,...> a subset of mutants (says so)

   THE CLAUSES (each reads its reference from an owner the module under test
   does not write):
     R0  OUTWARD ONLY — on the emitted file, every displaced vertex moved
         along the outward side of its own undisplaced incident faces (the
         file's own winding; the shipped O1 holds every shell outward), by no
         more than H. Reference: the same build with nothing raised
         (`boneNoRelief`), paired vertex for vertex.
     R1  ONE SHARED FIELD, DERIVED FROM THE AXIS — every vertex the relief
         reaches at full weight carries exactly H x the field RESTATED here
         (Math.atan2 and Math.round on the schedule's numbers — a different
         owner from the module's engine-agreed field), and no vertex carries
         more than its weight x H x the restated field; the restated field
         depends on (x, y) alone. Checked on every organ, old and new vertices.
     R2  CREST EDGES ON THE CONSTRAINT LINES — every crest chord the cutter
         claims is an edge of the emitted file (float32 keys), both its
         undisplaced ends lie on the restated crest half-plane it names (to
         1e-9 mm of arc), and on the petals the chords cover at least 95% of the
         lattice triangles a restated crest crosses at full weight.
     R3  ZERO OPEN EDGES — the directed-edge census of the file: 0 unmatched,
         0 doubled, 0 degenerate on the float32s.
     R4  NO CROSS-PART COINCIDENT VERTEX — no vertex the cutter added carries a
         float32 key another part also emits, and the file's shell count is
         the lattice build's (a cut that welded two parts would lower it).
     R5  ENGINE AGREEMENT — the decision code names none of Math.atan2 / cos /
         sin / tan / exp / log / log2 / pow / hypot / cbrt / `**`; with
         --browser, the crest build's triangle count and an FNV hash of its
         float32s are equal in Node and Chromium.
     R6  THE AXIS RULE — no vertex inside the schedule's cut radius carries
         relief, restated from the schedule's own n0 and the floor spacing;
         under a COLLAR, none inside its smooth disc (R - the floor spacing).
     R7  EVA'S NAMED EXCLUSION (Nov 9) — every triangle of the stem and of
         every rod (stamens, style, braid, pedicels, petioles, stalks) is the
         unraised twin's to the bit, and every hub corner that moves moves UP
         (the hub's top is ribbed, its underside never). The list is restated
         here, never imported.
     R8  THE STARBURST REACHES THE EDGE (Nov 9, third round) — on a starburst
         at its ruled 'edge' reach, every hub-top vertex (normal up) between
         the petal feet's inner edge + one lattice edge and the rim's EASE
         + two lattice edges inside the hub's rim (both radii read off the
         LATTICE build's petals and hub) carries full weight: the coverage
         under the feet stands down and the ribs run to the rim. The ease is
         restated (Eva, "ease off"): min(max(H x 15/8, e), max(15/8, e)) — the
         ruled fade at H 1.0 at every height, never wider than the ruled one —
         and where it is wider than three lattice edges, some hub-top vertex
         inside it must be short of full weight (the ease exists; a drop in one
         lattice edge does not pass). Asked on the plain starburst rows: a rod rooted through
         the hub top occludes it, and the shipped fade around the root stands.
   THE CENTRE (Nov 9): under COLLAR and CONCENTRIC, R1 restates the ring at
   R = max(the plain schedule's r0, the petal feet's inner edge read off the
   LATTICE build's petal points), snapped to 2^-20, and requires the build's
   own R to equal it; R2 holds every concentric ring crest's ends on its
   restated circle (1e-9 mm) and every relieved lattice triangle a
   restated circle crosses carries its chord.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const args = process.argv.slice(2);
const NEG = args.includes('--negative-control'), BROWSER = args.includes('--browser');
const ONLY = (args.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const MOD_SRC = fs.readFileSync(path.join(ROOT, 'bloom-texture-ribs.js'), 'utf8');
const f32 = Math.fround;
const key3 = (x, y, z) => `${f32(x)}|${f32(y)}|${f32(z)}`;

/* ------------------------------------------------- restated pieces --- */
/* EVA'S NAMED EXCLUSION (Nov 9), restated here, never imported: ribs on the
   petals, sepals, leaves and the hub's TOP; never on the stem or a rod */
const EXCLUDED_RESTATED = ['stem', 'stamen', 'style', 'petiole', 'stalk'];
const excludedRestated = (O, i) => !!O.rod || EXCLUDED_RESTATED.includes(O.organ) || (O.organ === 'hub' && !(O.N[i * 3 + 2] > 0));
/* the schedule, restated from the brief's laws and the module's EXPORTED
   numbers (spacing range, floor, minimum spokes, reference radius) */
function restatedSchedule(R, p) {
  const tau = 2 * Math.PI;
  const s = p.s, sMin = R.RIB_SPACING_FLOOR_MM, refR = R.RIB_REF_RADIUS_MM, n4 = R.RIB_MIN_SPOKES;
  let n0, levels;
  if (p.law === 'A' && p.axis !== 'thin') { n0 = Math.max(n4, Math.round((tau * refR) / s)); levels = [{ n: n0, rStart: 0 }]; }
  else if (p.law === 'A') {
    const K = Math.max(n4, Math.round((tau * refR) / s));
    /* the power of two nearest K / 4 in the log (ties down): restated by Math.log2 */
    const M = Math.max(0, Math.floor(Math.log2(K / n4) + 0.5 - 1e-12));
    n0 = n4; levels = [{ n: n4, rStart: 0 }];
    for (let L = 1; L <= M; L++) levels.push({ n: n4 * 2 ** L, rStart: (n4 * 2 ** L * sMin) / tau });
  } else { n0 = n4; levels = [{ n: n4, rStart: 0 }]; for (let L = 1; L <= 24; L++) levels.push({ n: n4 * 2 ** L, rStart: (n4 * 2 ** L * s) / (tau * Math.SQRT2) }); }
  const r0 = (n0 * sMin) / tau, rule = p.axis === 'thin' ? 'fade' : p.axis;
  return { n0, levels, r0, rule, rCut: rule === 'fade' ? r0 / 2 : Math.max(0, r0 - p.edgeMm), emerge: R.RIB_EMERGE_K * s };
}
/* THE CENTRE (Nov 9), restated: R = max(the plain schedule's r0, the petal
   feet's inner edge), the feet read off the LATTICE build's petal points (a
   different build from the one under test), snapped to 2^-20 mm; the ring's
   half-width and the concentric pitch are the floor spacing; the circles run
   R - j sc while above sc / 2 */
function restatedCentre(R, p, latticeBuild) {
  if (p.centre !== 'collar' && p.centre !== 'concentric') return null;
  const Q = 1048576, S = restatedSchedule(R, p);
  let rFeet = Infinity;
  for (const g of latticeBuild.stats.repl) if (g.organ === 'petal') for (let i = 0; i < g.O.P.length; i += 3) { const x = Math.round(g.O.P[i] * Q) / Q, y = Math.round(g.O.P[i + 1] * Q) / Q; rFeet = Math.min(rFeet, Math.hypot(x, y)); }
  const Rc = Math.round(Math.max(S.r0, rFeet) * Q) / Q, sc = R.RIB_SPACING_FLOOR_MM;
  const circles = []; if (p.centre === 'concentric') for (let j = 0; Rc - j * sc > sc / 2; j++) circles.push(Rc - j * sc);
  return { type: p.centre, R: Rc, wC: sc, sc, rFeet, circles };
}
function restatedField(R, p, C = null) {
  const S = restatedSchedule(R, p), w = p.crest;
  const prof = (u) => { if (!(w > 0) || u >= w) { const g = (1 - u) * (1 - u); return w > 0 ? g / (1 - w) : g; } const gw = (1 - w) * (1 - w), dg = -2 * (1 - w); return (gw + (dg * (u * u - w * w)) / (2 * w)) / (1 - w); };
  const lvl = (r) => { let L = 0; while (L + 1 < S.levels.length && S.levels[L + 1].rStart <= r) L++; return L; };
  const u = (n, th) => { const ph = (n * th) / (2 * Math.PI); return 2 * Math.abs(ph - Math.round(ph)); };
  const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (6 * x - 15) + 10));
  const ribsAt = (th, r) => { const L = lvl(r); let f = prof(u(S.levels[L].n, th)); if (L > 0) { const a = sm((r - S.levels[L].rStart) / S.emerge); if (a < 1) f = (1 - a) * prof(u(S.levels[L - 1].n, th)) + a * f; } return f; };
  const centreF = (q, r) => {
    const th = Math.atan2(q[1], q[0]);
    if (C.type === 'collar') { if (!(r > C.R - C.wC)) return 0; const d = (r - C.R) / C.wC, ring = Math.abs(d) < 1 ? (1 - d * d) ** 2 : 0; const ribs = r > C.R ? ribsAt(th, r) * sm((r - C.R) / C.wC) : 0; return Math.max(ring, ribs); }
    if (r < C.R) { const qq = (C.R - r) / C.sc, dq = qq - Math.floor(qq + 0.5); return prof(2 * Math.abs(dq)) * sm(r / (C.sc / 2)); }
    return Math.max(prof(Math.min(1, (2 * (r - C.R)) / C.sc)), ribsAt(th, r) * sm((r - C.R) / (C.sc / 2)));
  };
  const F = (q) => {
    const r = Math.hypot(q[0], q[1]);
    if (C) return centreF(q, r);
    if (!(r > S.rCut)) return 0;
    const th = Math.atan2(q[1], q[0]), L = lvl(r);
    let f = prof(u(S.levels[L].n, th));
    if (L > 0) { const a = sm((r - S.levels[L].rStart) / S.emerge); if (a < 1) f = (1 - a) * prof(u(S.levels[L - 1].n, th)) + a * f; }
    if (r < S.r0) f *= S.rule === 'fade' ? sm((r - S.r0 / 2) / (S.r0 / 2)) : sm((r - (S.r0 - p.edgeMm)) / p.edgeMm);
    return f;
  };
  /* the radius inside which nothing may be relieved: the axis rule's cut, the collar's smooth disc, none under concentric */
  const rCut = C ? (C.type === 'collar' ? C.R - C.wC : 0) : S.rCut;
  return { F, S, lvl, C, rCut, rStart: C ? C.R : S.r0 };
}
export function closure(P) {
  const nT = P.length / 9;
  const vid = new Map(); const T = new Int32Array(nT * 3);
  for (let i = 0; i < nT * 3; i++) { const k = key3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); let v = vid.get(k); if (v === undefined) { v = vid.size; vid.set(k, v); } T[i] = v; }
  const de = new Map(); let degen = 0;
  for (let t = 0; t < nT; t++) { const a = T[t * 3], b = T[t * 3 + 1], c = T[t * 3 + 2]; if (a === b || b === c || a === c) degen++; for (const [u, v] of [[a, b], [b, c], [c, a]]) { const k = u * 4e7 + v; de.set(k, (de.get(k) || 0) + 1); } }
  let open = 0, doubled = 0; for (const [k, n] of de) { const u = Math.floor(k / 4e7), v = k % 4e7; if (n > 1) doubled++; if ((de.get(v * 4e7 + u) || 0) !== n) open++; }
  const par = new Int32Array(vid.size).map((_, i) => i); const fd = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let t = 0; t < nT; t++) { const a = fd(T[t * 3]), b = fd(T[t * 3 + 1]); par[b] = a; par[fd(T[t * 3 + 2])] = a; }
  const roots = new Set(); for (let t = 0; t < nT; t++) roots.add(fd(T[t * 3]));
  return { shells: roots.size, open, doubled, degen };
}
const fnv = (P) => { let h = 0x811c9dc5; const b = new Uint8Array(new Float32Array(P).buffer); for (let i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); };

/* --------------------------------------------------------- clauses --- */
const ROWS = [
  { id: 'A-0.4', extra: { ribLaw: 'A', textureHeight: 0.4 }, mode: 'crest' },
  { id: 'B-2.5', extra: { ribLaw: 'B', textureHeight: 2.5 }, mode: 'crest' },
  { id: 'A-thin-2.5-flank', extra: { ribLaw: 'A', ribAxis: 'thin', textureHeight: 2.5 }, mode: 'crest+flank' },
  { id: 'B-start-stem', extra: { ribLaw: 'B', ribAxis: 'start', textureHeight: 1.5, stemLength: 40 }, mode: 'crest' },
  /* the centre treatments (Nov 9) and Eva's named exclusion, on a bloom that carries a stem, stamens and a style */
  { id: 'A-collar', extra: { ribLaw: 'A', ribCentre: 'collar', textureHeight: 1 }, mode: 'crest' },
  { id: 'B-concentric', extra: { ribLaw: 'B', ribCentre: 'concentric', textureHeight: 2.5 }, mode: 'crest' },
  { id: 'A-concentric', extra: { ribLaw: 'A', ribCentre: 'concentric', textureHeight: 1 }, mode: 'crest' },
  { id: 'B-starburst-rods', extra: { ribLaw: 'B', ribCentre: 'starburst', textureHeight: 2.5, stemLength: 40, stamenCount: 24, gynoecium: 'STYLE' }, mode: 'crest' },
  { id: 'A-starburst', extra: { ribLaw: 'A', ribCentre: 'starburst', textureHeight: 1 }, mode: 'crest', reach: true },
  { id: 'B-starburst', extra: { ribLaw: 'B', ribCentre: 'starburst', textureHeight: 2.5 }, mode: 'crest', reach: true },
];
async function runClauses(R, rows, log = true) {
  const GEO = await R.ribsGeometry();
  const bad = [];
  const say = (m) => { if (log) console.log(m); };
  /* R5 static: the decision code (comments stripped) names no transcendental and no ** */
  const code = MOD_SRC_OF(R).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const banned = code.match(/Math\.(atan2|atan|cos|sin|tan|exp|log2|log10|log|pow|hypot|cbrt)\s*\(|\*\*/g);
  if (banned) bad.push(`R5: the decision code names ${[...new Set(banned)].join(', ')} (engine agreement: arithmetic, sqrt, floor and round only)`);
  /* R4's hardest case, written down: no default row relieves an edge two parts
     share (a shared hub/foot edge is buried on both sides, so the relief-reach
     rule alone keeps it uncut), so two flat parts sharing a relieved edge that a
     crest crosses are handed to the hook's own write */
  {
    const { added, onShared } = junctionFixture(R);
    if (!added) bad.push('R4 fixture: the cutter added no vertex (vacuous)');
    if (onShared) bad.push(`R4 fixture: ${onShared} added vertices lie on the edge two parts share`);
    say(`  R4 fixture: two parts sharing a relieved edge a crest crosses: ${added} vertices added, ${onShared} on the shared edge`);
  }
  for (const row of rows) {
    const H = row.extra.textureHeight;
    const r = await R.ribsBuild(DEFAULTS, row.extra, { mode: row.mode, GEO });
    const u = await R.ribsBuild(DEFAULTS, row.extra, { mode: row.mode, GEO, capability: { boneNoRelief: true } });
    const L = await R.ribsBuild(DEFAULTS, row.extra, { mode: 'lattice', GEO });
    const P = r.acc.positions, U = u.acc.positions;
    const p = r.stats.params, RC = restatedCentre(R, p, L), RF = restatedField(R, p, RC);
    if (RC && (!r.stats.centre || r.stats.centre.R !== RC.R)) bad.push(`R1 ${row.id}: the build's centre radius ${r.stats.centre && r.stats.centre.R} is not the restated ${RC.R} (max of r0 ${RF.S.r0.toFixed(4)} and the feet's inner edge ${RC.rFeet.toFixed(4)})`);
    /* R0 */
    if (U.length !== P.length) bad.push(`R0 ${row.id}: the unraised twin has ${U.length / 9} triangles against ${P.length / 9}`);
    else {
      const faceN = new Map();
      for (let t = 0; t < U.length / 9; t++) {
        const o = t * 9, ax = U[o], ay = U[o + 1], az = U[o + 2];
        const ux = U[o + 3] - ax, uy = U[o + 4] - ay, uz = U[o + 5] - az, vx = U[o + 6] - ax, vy = U[o + 7] - ay, vz = U[o + 8] - az;
        const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
        for (let c = 0; c < 3; c++) { const k = key3(U[o + c * 3], U[o + c * 3 + 1], U[o + c * 3 + 2]); const a = faceN.get(k); if (a) { a[0] += n[0]; a[1] += n[1]; a[2] += n[2]; } else faceN.set(k, n.slice()); }
      }
      let inward = 0, tooFar = 0, worst = 1, moved = 0;
      for (let i = 0; i < P.length; i += 3) {
        const d = [P[i] - U[i], P[i + 1] - U[i + 1], P[i + 2] - U[i + 2]], m = Math.hypot(...d);
        if (!(m > 0)) continue;
        moved++;
        if (m > H * (1 + 1e-9) + 1e-6) tooFar++;
        const n = faceN.get(key3(U[i], U[i + 1], U[i + 2]));
        const c = (d[0] * n[0] + d[1] * n[1] + d[2] * n[2]) / (m * Math.hypot(...n));
        if (c < worst) worst = c;
        if (c < -0.2) inward++;
      }
      if (!moved) bad.push(`R0 ${row.id}: nothing moved (vacuous)`);
      if (inward) bad.push(`R0 ${row.id}: ${inward} displaced vertex corners point INTO their own faces (worst cos ${worst.toFixed(3)})`);
      if (tooFar) bad.push(`R0 ${row.id}: ${tooFar} vertex corners moved further than H ${H}`);
      say(`  R0 ${row.id}: ${moved} corners moved, worst cos to the outward face normal ${worst.toFixed(3)}, none past H`);
    }
    /* R1 + R6: per organ, every vertex (lattice and new) against the restated field */
    let full = 0, fullBad = 0, over = 0, worst1 = 0, inside = 0;
    for (const g of r.stats.repl) {
      if (!g.C) continue;
      const X = g.X, nV = X.nV, nN = g.U.length / 3;
      for (let i = 0; i < nN; i++) {
        const q = [g.U[i * 3], g.U[i * 3 + 1], g.U[i * 3 + 2]];
        let w;
        if (i < nV) { if (X.clr[i] > 0) continue; w = X.w0[i] > 0 && X.mc[i] > 0 && !excludedRestated(g.O, i) ? X.w0[i] * X.mc[i] : 0; }
        else { const src = g.C.newSrc[i - nV]; if (src[0] === 'centroid') continue; const [lo, hi, t] = src; w = g.w[lo] + t * (g.w[hi] - g.w[lo]); }
        const s = g.Sv[i];
        const want = w * H * RF.F(q);
        if (Math.hypot(q[0], q[1]) <= RF.rCut && s > 0) inside++;
        if (s > want + 1e-9) over++;
        if (w >= 1 - 1e-12) { full++; const d = Math.abs(s - want); if (d > worst1) worst1 = d; if (d > 1e-9) fullBad++; }
      }
    }
    if (!full) bad.push(`R1 ${row.id}: no vertex at full weight (vacuous)`);
    if (fullBad) bad.push(`R1 ${row.id}: ${fullBad} of ${full} full-weight vertices do not carry H x the restated axis field (worst ${worst1.toExponential(2)} mm)`);
    if (over) bad.push(`R1 ${row.id}: ${over} vertices carry MORE than their weight x H x the field`);
    if (inside) bad.push(`R6 ${row.id}: ${inside} vertices inside ${RC ? "the collar's smooth disc" : "the axis rule's cut radius"} ${RF.rCut.toFixed(3)} mm carry relief`);
    say(`  R1 ${row.id}: ${full} full-weight vertices equal H x the restated field to ${worst1.toExponential(2)} mm${RC ? ` (centre ${RC.type} at R ${RC.R.toFixed(4)} = max(r0 ${RF.S.r0.toFixed(4)}, feet ${RC.rFeet.toFixed(4)}))` : ''}; R6: 0 relieved inside r ${RF.rCut.toFixed(3)} mm`);
    /* R2 */
    const edges = new Set();
    for (let t = 0; t < P.length / 9; t++) { const k = [0, 1, 2].map((c) => key3(P[t * 9 + c * 3], P[t * 9 + c * 3 + 1], P[t * 9 + c * 3 + 2])); for (let c = 0; c < 3; c++) { const a = k[c], b = k[(c + 1) % 3]; edges.add(a < b ? a + '#' + b : b + '#' + a); } }
    let missing = 0, offLine = 0, worstArc = 0, notCrest = 0, onLattice = 0, worstLat = 0;
    const CE = r.stats.crestEdges || [];
    const ringEdges = new Map(); let offRing = 0, worstRing = 0;
    for (const e of CE) {
      const a = key3(...e.a), b = key3(...e.b);
      if (!edges.has(a < b ? a + '#' + b : b + '#' + a)) missing++;
      if (e.jG < 0) {
        /* a concentric ring crest: its ends on the RESTATED circle it names */
        const Rc = RC && RC.circles[-e.jG - 1];
        if (Rc === undefined) { notCrest++; continue; }
        ringEdges.set(-e.jG - 1, (ringEdges.get(-e.jG - 1) || 0) + 1);
        const bar = e.lattice ? R.RIB_SNAP_MM : 1e-9;
        for (const q of [e.ua, e.ub]) { const dr = Math.abs(Math.hypot(q[0], q[1]) - Rc); if (!e.lattice && dr > worstRing) worstRing = dr; if (dr > bar) offRing++; }
        continue;
      }
      const th = (2 * Math.PI * e.jG) / e.G;
      /* a crest of the level the restated schedule stands at, at the edge's middle */
      const rm = Math.hypot((e.ua[0] + e.ub[0]) / 2, (e.ua[1] + e.ub[1]) / 2), nL = RF.S.levels[RF.lvl(rm)].n, ph = (nL * e.jG) / e.G;
      if (Math.abs(ph - Math.round(ph)) > 1e-9) notCrest++;
      /* a cut point is ON the half-plane (1e-9 mm); a lattice edge the cutter claims as already on a line is within the snap */
      const bar = e.lattice ? R.RIB_SNAP_MM : 1e-9;
      for (const q of [e.ua, e.ub]) { const arc = Math.abs(-Math.sin(th) * q[0] + Math.cos(th) * q[1]); if (!e.lattice && arc > worstArc) worstArc = arc; if (e.lattice && arc > worstLat) worstLat = arc; if (arc > bar || Math.cos(th) * q[0] + Math.sin(th) * q[1] <= 0) offLine++; }
      if (e.lattice) onLattice++;
    }
    if (!CE.length) bad.push(`R2 ${row.id}: the cutter claims no crest edge`);
    if (missing) bad.push(`R2 ${row.id}: ${missing} of ${CE.length} claimed crest edges are not edges of the file`);
    if (notCrest) bad.push(`R2 ${row.id}: ${notCrest} claimed crest edges name a line that is not a crest of the level standing there`);
    if (offLine) bad.push(`R2 ${row.id}: ${offLine} crest-edge ends lie off their crest half-plane (worst ${worstArc.toExponential(2)} mm)`);
    if (offRing) bad.push(`R2 ${row.id}: ${offRing} ring-crest ends lie off their restated circle (worst ${worstRing.toExponential(2)} mm)`);
    /* positions two parts both emit (the junction rule's set, restated from the lattice) */
    const shared = new Map();
    r.stats.repl.forEach((g, gi) => { for (let i = 0; i < g.O.P.length / 3; i++) { const k = key3(g.O.P[i * 3], g.O.P[i * 3 + 1], g.O.P[i * 3 + 2]); const o = shared.get(k); shared.set(k, o === undefined || o === gi ? gi : -1); } });
    const SNAP = R.RIB_SNAP_MM;
    if (RC && RC.circles.length) {
      /* ring coverage: every RELIEVED lattice triangle (every corner's weight > 0: the hub top under
         T5's coverage fade never reaches full weight at H 2.5) a restated circle crosses (no corner within 4
         snaps of the ring, no junction vertex) carries a chord on that circle; a ring wholly under the feet
         crosses nothing relieved and owes nothing */
      let rCrossed = 0, rChorded = 0;
      for (const g of r.stats.repl) {
        if (!g.C) continue;
        const O = g.O, X = g.X, have = new Set();
        for (const e of CE) if (e.jG < 0 && e.organ === g.organ && e.from === O.from) have.add(e.parent + ':' + (-e.jG - 1));
        for (let t = 0; t < O.tri.length / 3; t++) {
          const v = [O.tri[t * 3], O.tri[t * 3 + 1], O.tri[t * 3 + 2]];
          if (v.some((i) => !(X.w0[i] * X.mc[i] > 0) || excludedRestated(O, i))) continue;
          if (v.some((i) => shared.get(key3(O.P[i * 3], O.P[i * 3 + 1], O.P[i * 3 + 2])) === -1)) continue;
          const rr = v.map((i) => Math.hypot(O.P[i * 3], O.P[i * 3 + 1]));
          RC.circles.forEach((Rc, j) => {
            if (!(Math.min(...rr) < Rc && Rc < Math.max(...rr)) || rr.some((x) => Math.abs(x - Rc) < 4 * SNAP)) return;   // a corner within 4 snaps of the ring: the cutter keeps no point within a snap of a vertex
            rCrossed++; if (have.has(t + ':' + j)) rChorded++;
          });
        }
      }
      const cut = new Set([...ringEdges.keys()]);
      if (!rCrossed) bad.push(`R2 ${row.id}: no relieved lattice triangle a restated concentric ring crosses (vacuous)`);
      if (rChorded < rCrossed) bad.push(`R2 ${row.id}: ring chords on ${rChorded} of ${rCrossed} relieved lattice triangles a restated concentric ring crosses`);
      say(`  R2 ${row.id}: ${RC.circles.length} restated concentric rings, ${cut.size} of them on relieved surface; ring coverage ${rChorded}/${rCrossed}, ends within ${worstRing.toExponential(2)} mm of their circle`);
    }
    /* coverage on the petals: lattice triangles a restated crest crosses at full weight */
    let crossed = 0, chorded = 0, exempt = 0;
    for (const g of r.stats.repl) {
      if (!g.C || g.organ !== 'petal') continue;
      const O = g.O, X = g.X, chordT = new Set();
      for (const e of CE) if (e.organ === 'petal' && e.from === g.O.from) chordT.add(e.parent);
      for (let t = 0; t < O.tri.length / 3; t++) {
        const v = [O.tri[t * 3], O.tri[t * 3 + 1], O.tri[t * 3 + 2]];
        if (v.some((i) => !(X.w0[i] * X.mc[i] >= 1 - 1e-12))) continue;
        const rr = v.map((i) => Math.hypot(O.P[i * 3], O.P[i * 3 + 1]));
        if (Math.min(...rr) < RF.rStart + 1) continue;
        const L = RF.lvl(Math.max(...rr)); if (RF.lvl(Math.min(...rr)) !== L) continue;
        const n = RF.S.levels[L].n, ph = v.map((i) => (n * Math.atan2(O.P[i * 3 + 1], O.P[i * 3])) / (2 * Math.PI));
        const lo = Math.min(...ph), hi = Math.max(...ph);
        if (hi - lo > n / 2) continue;           // straddles the angle seam
        if (!(Math.ceil(lo + 1e-6) <= Math.floor(hi - 1e-6))) continue;
        /* exempt by declaration: a junction vertex, or a crossing within twice the snap of a vertex */
        let ex = v.some((i) => shared.get(key3(O.P[i * 3], O.P[i * 3 + 1], O.P[i * 3 + 2])) === -1);
        for (let c = 0; c < 3 && !ex; c++) { const a = v[c], b2 = v[(c + 1) % 3], pa = ph[c], pb = ph[(c + 1) % 3]; const len = Math.hypot(O.P[b2 * 3] - O.P[a * 3], O.P[b2 * 3 + 1] - O.P[a * 3 + 1], O.P[b2 * 3 + 2] - O.P[a * 3 + 2]); for (let k = Math.ceil(Math.min(pa, pb)); k <= Math.floor(Math.max(pa, pb)); k++) { const tt = (k - pa) / (pb - pa); if (Number.isFinite(tt) && (tt * len < 4 * SNAP || (1 - tt) * len < 4 * SNAP)) ex = true; } }
        if (ex) { exempt++; continue; }
        crossed++; if (chordT.has(t)) chorded++;
      }
    }
    if (!crossed) bad.push(`R2 ${row.id}: no petal lattice triangle a restated crest crosses (vacuous)`);
    if (chorded < crossed) bad.push(`R2 ${row.id}: crest chords on ${chorded} of ${crossed} petal lattice triangles a restated crest crosses at full weight (${exempt} exempt)`);
    say(`  R2 ${row.id}: ${CE.length} claimed crest edges, all in the file, ends within ${worstArc.toExponential(2)} mm of their half-plane (${onLattice} lattice edges already on a line, within ${worstLat.toExponential(2)} mm); petal coverage ${chorded}/${crossed} (+${exempt} exempt: a junction vertex or a crossing within 4 snaps of a vertex)`);
    /* R7 EVA'S NAMED EXCLUSION: the stem and every rod are the unraised twin's
       to the bit, and the hub moves only up (its top, never its underside) */
    {
      let exTris = 0, exMoved = 0, hubUp = 0, hubDown = 0;
      for (const g of r.stats.ranges) {
        const ex = g.rod || EXCLUDED_RESTATED.includes(g.organ);
        if (!ex && g.organ !== 'hub') continue;
        for (let t = g.from; t < g.to; t++) for (let c = 0; c < 9; c += 3) {
          const o = t * 9 + c, dz = P[o + 2] - U[o + 2], m = Math.hypot(P[o] - U[o], P[o + 1] - U[o + 1], dz);
          if (ex) { if (c === 0) exTris++; if (m > 0) exMoved++; } else if (m > 0) { if (dz > 0) hubUp++; else hubDown++; }
        }
      }
      if (exMoved) bad.push(`R7 ${row.id}: ${exMoved} corners of the stem or a rod moved (Eva's named exclusion)`);
      if (hubDown) bad.push(`R7 ${row.id}: ${hubDown} moved hub corners do not move UP (the hub's underside is excluded)`);
      say(`  R7 ${row.id}: ${exTris} stem/rod triangles identical to the unraised twin; ${hubUp} hub corners raised, all upward`);
    }
    /* R8 the starburst reaches the edge */
    /* asked on the plain starburst rows (`reach: true`): rods rooted THROUGH the hub top (stamens, a style)
       occlude it, and the shipped fade around their roots is the rule working, not the reach failing */
    if (row.reach && p.centre === 'starburst' && p.reach === 'edge') {
      const e = R.RIB_SPACING_FLOOR_MM / 4;   // the lattice edge (the floor spacing is four of them)
      let rFeet = Infinity, rRim = 0;
      for (const g of L.stats.repl) { const PP = g.O.P; for (let i = 0; i < PP.length; i += 3) { const rr = Math.hypot(PP[i], PP[i + 1]); if (g.organ === 'petal') rFeet = Math.min(rFeet, rr); if (g.organ === 'hub') rRim = Math.max(rRim, rr); } }
      const PEAK = 15 / 8;   // the ruled fade's peak slope, restated (TEXTURE_FADE_PEAK_SLOPE)
      const ease = Math.min(Math.max(p.H * PEAK, e), Math.max(PEAK, e));
      const h = r.stats.repl.find((g) => g.organ === 'hub');
      let n = 0, short = 0, worst = 1, inEase = 0, eased = 0;
      for (let i = 0; i < h.X.nV; i++) {
        if (!(h.O.N[i * 3 + 2] > 0.9)) continue;
        const rr = Math.hypot(h.O.P[i * 3], h.O.P[i * 3 + 1]);
        const w = h.X.w0[i] * h.X.mc[i];
        if (rr > rFeet + e && rRim - rr > 2 * e && rRim - rr < ease - e) { inEase++; if (h.X.mc[i] < 1 - 1e-12) eased++; }
        if (rr < rFeet + e || rr > rRim - ease - 2 * e) continue;
        n++; if (w < 1 - 1e-12) { short++; worst = Math.min(worst, w); }
      }
      if (ease > 3 * e && !eased) bad.push(`R8 ${row.id}: no hub-top vertex inside the rim's ${ease.toFixed(3)} mm ease is short of full weight (${inEase} looked at): the ribs drop at the rim instead of easing off`);
      if (!n) bad.push(`R8 ${row.id}: no hub-top vertex between the feet's edge ${rFeet.toFixed(3)} and the rim ${rRim.toFixed(3)} mm (vacuous)`);
      if (short) bad.push(`R8 ${row.id}: ${short} of ${n} hub-top vertices between the feet's edge and the rim fall short of full weight (least ${worst.toFixed(3)})`);
      say(`  R8 ${row.id}: ${n} hub-top vertices from the feet's edge ${rFeet.toFixed(3)} + e to the rim ${rRim.toFixed(3)} - ease ${ease.toFixed(3)} - 2e mm, every one at full weight; ${eased} of ${inEase} inside the ease easing`);
    }
    /* R3 + R4 */
    const cl = closure(P), clL = closure(L.acc.positions);
    if (cl.open || cl.doubled || cl.degen) bad.push(`R3 ${row.id}: open ${cl.open}, doubled ${cl.doubled}, degenerate ${cl.degen}`);
    if (cl.shells !== clL.shells) bad.push(`R4 ${row.id}: ${cl.shells} shells against the lattice build's ${clL.shells}`);
    const owner = new Map();
    const rg = r.stats.ranges.slice().sort((a, b) => a.from - b.from);
    rg.forEach((g, gi) => { for (let t = g.from; t < g.to; t++) for (let c = 0; c < 3; c++) { const k = key3(P[t * 9 + c * 3], P[t * 9 + c * 3 + 1], P[t * 9 + c * 3 + 2]); const o = owner.get(k); owner.set(k, o === undefined || o === gi ? gi : -1); } });
    let coinc = 0;
    for (const g of r.stats.repl) { if (!g.C) continue; for (let i = g.X.nV; i < g.D.length / 3; i++) if (owner.get(key3(g.D[i * 3], g.D[i * 3 + 1], g.D[i * 3 + 2])) === -1) coinc++; }
    if (coinc) bad.push(`R4 ${row.id}: ${coinc} new vertices carry a float32 key another part also emits`);
    say(`  R3/R4 ${row.id}: ${P.length / 9} tris, open ${cl.open} doubled ${cl.doubled} degen ${cl.degen}; shells ${cl.shells} (lattice ${clL.shells}); ${coinc} coincident new vertices`);
  }
  return bad;
}
function MOD_SRC_OF(R) { return R.__src || MOD_SRC; }
/* R4's hardest case, written down: no default row relieves an edge two parts
   share (a shared hub/foot edge is buried on both sides, so the relief-reach
   rule alone keeps it uncut). Two flat quads share the edge S1-S2, which A's
   crest at 0 deg crosses; each quad also has an edge clear of the shared
   corners that the crest crosses, so a clean cutter adds a vertex there and
   none on S1-S2. Handed to the hook's own write. */
function junctionFixture(R) {
  const hook = R.ribHook({ mode: 'crest' });
  hook.field({ ribLaw: 'A' }, 1);
  const S1 = [19.6, -0.6, 0], S2 = [20.4, 0.7, 0];
  const mk = (pts, tri, organ, from) => { const P = pts.flat(), nV = pts.length; return { O: { P: new Float64Array(P), tri, N: new Float64Array(nV * 3).map((_, i) => (i % 3 === 2 ? 1 : 0)), organ, from, to: from + tri.length / 3, sheet: true }, nV, w0: new Float64Array(nV).fill(1), mc: new Float64Array(nV).fill(1), s: new Float64Array(nV), clr: new Float64Array(nV) }; };
  const X1 = mk([S1, S2, [19.0, 0.5, 0], [18.6, -0.5, 0]], [0, 1, 2, 0, 2, 3], 'petal', 0);
  const X2 = mk([S2, S1, [21.0, -0.4, 0], [21.3, 0.6, 0]], [0, 1, 2, 0, 2, 3], 'leaf', 2);
  const acc = { positions: [], normals: null, lo: [Infinity, Infinity, Infinity], hi: [-Infinity, -Infinity, -Infinity] };
  for (const X of [X1, X2]) for (const v of X.O.tri) for (let k = 0; k < 3; k++) acc.positions.push(X.O.P[v * 3 + k]);
  hook.write(acc, { heightMm: 1 }, [X1, X2], null);
  let onShared = 0, added = 0;
  for (const g of hook.stats.repl) { if (!g.C) continue; for (let i = g.X.nV; i < g.U.length / 3; i++) { added++; const q = [g.U[i * 3], g.U[i * 3 + 1]]; const ex = S2[0] - S1[0], ey = S2[1] - S1[1], t = ((q[0] - S1[0]) * ex + (q[1] - S1[1]) * ey) / (ex * ex + ey * ey); const dx = S1[0] + t * ex - q[0], dy = S1[1] + t * ey - q[1]; if (t > 0 && t < 1 && Math.hypot(dx, dy) < 1e-5) onShared++; } }   // 1e-5 mm: ten steps of the cutter's 2^-20 snap grid
  return { added, onShared };
}

/* ------------------------------------------------------- browser R5 --- */
async function browserAgreement() {
  const http = await import('node:http');
  const { chromium } = await import('playwright-core');
  const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html' };
  const srv = http.createServer((req, res) => { if (req.url === '/__ribs-blank') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><title>ribs</title>'); return; } const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
  await new Promise((ok) => srv.listen(0, ok));
  const port = srv.address().port;
  const exe = fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
  const browser = await chromium.launch(exe ? { executablePath: exe, args: ['--js-flags=--max-old-space-size=8192'] } : {});
  const out = [];
  try {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${port}/__ribs-blank`);
    const R = await import(pathToFileURL(path.join(ROOT, 'bloom-texture-ribs.js')).href);
    for (const row of [ROWS[0], ROWS[1]]) {
      const nb = await R.ribsBuild(DEFAULTS, row.extra, { mode: row.mode });
      const node = { tris: nb.acc.triangleCount, hash: fnv(nb.acc.positions) };
      const t0 = Date.now();
      const br = await page.evaluate(async ({ extra, mode }) => {
        const R = await import('/bloom-texture-ribs.js');
        const { DEFAULTS } = await import('/bloom-registry.js');
        const b = await R.ribsBuild(DEFAULTS, extra, { mode });
        let h = 0x811c9dc5; const u8 = new Uint8Array(new Float32Array(b.acc.positions).buffer); for (let i = 0; i < u8.length; i++) { h ^= u8[i]; h = Math.imul(h, 0x01000193) >>> 0; }
        return { tris: b.acc.triangleCount, hash: h.toString(16), ms: b.ms };
      }, { extra: row.extra, mode: row.mode });
      out.push({ id: row.id, node, chromium: br, wallS: (Date.now() - t0) / 1000, agree: node.tris === br.tris && node.hash === br.hash });
    }
  } finally { await browser.close(); srv.close(); }
  return out;
}

/* --------------------------------------------------------- mutants --- */
/* each: an anchored edit of a COPY of the module, the clause it must fire,
   and a WITNESS run on the mutated module itself (proving the behaviour
   moved, never asking the gate whether the gate fired) */
const MUTANTS = [
  { id: 'relief-points-inward', clause: 'R0', from: 'D[i * 3 + k] = p[k] + (s > 0 ? n[k] * s : 0);', to: 'D[i * 3 + k] = p[k] + (s > 0 ? -n[k] * s : 0);',
    witness: async (M) => { const b = await M.ribsBuild(DEFAULTS, { ribLaw: 'A', textureHeight: 0.4 }, { mode: 'crest' }); const g = b.stats.repl.find((x) => x.C && x.C.newP.length); for (let i = g.X.nV; i < g.D.length / 3; i++) if (g.Sv[i] > 0) { const d = [0, 1, 2].map((k) => g.D[i * 3 + k] - g.U[i * 3 + k]); const src = g.C.newSrc[i - g.X.nV]; const n = [0, 1, 2].map((k) => g.O.N[src[0] * 3 + k]); return d[0] * n[0] + d[1] * n[1] + d[2] * n[2] < 0; } return false; } },
  { id: 'the-hub-reads-its-own-field', clause: 'R1', from: 's = wv > 0 && Ln > 0 ? wv * H * field.F(p) : 0;', to: "s = wv > 0 && Ln > 0 ? wv * H * field.F(X.O.organ === 'petal' ? [p[0] * 0.9995 - p[1] * 0.0316, p[1] * 0.9995 + p[0] * 0.0316, p[2]] : p) : 0;",
    witness: async (M) => { const b = await M.ribsBuild(DEFAULTS, { ribLaw: 'B', textureHeight: 2.5 }, { mode: 'crest' }); const F = M.ribField(b.stats.params).F; const g = b.stats.repl.find((x) => x.organ === 'petal' && x.C); for (let i = g.X.nV; i < g.U.length / 3; i++) { const src = g.C.newSrc[i - g.X.nV]; if (src[0] === 'centroid') continue; const w = g.w[src[0]] + src[2] * (g.w[src[1]] - g.w[src[0]]); if (w >= 1 - 1e-12 && Math.abs(g.Sv[i] - 2.5 * F([g.U[i * 3], g.U[i * 3 + 1], g.U[i * 3 + 2]])) > 1e-6) return true; } return false; } },
  { id: 'cut-points-off-the-crest', clause: 'R2', from: 'const t = cA / (cA - cB);', to: 'const t = 0.03 + 0.94 * (cA / (cA - cB));',
    witness: async (M) => { const p = M.ribParams({ ribLaw: 'A' }), f = M.ribField(p), LS = M.lineSet(f, 1, 50); const P = [19.9, -0.4, 0, 20.1, 0.5, 0, 20.3, -0.5, 0]; const C = M.cutOrgan(P, [0, 1, 2], LS, f, () => true); const q = C.newP; const th = (2 * Math.PI * C.newSrc[0][3]) / LS.G; return Math.abs(-Math.sin(th) * q[0] + Math.cos(th) * q[1]) > 1e-6; } },
  { id: 'the-chords-are-ignored', clause: 'R2', from: 'if (ids.length !== 2) continue;', to: 'if (ids.length !== 2 || true) continue;',
    witness: async (M) => { const p = M.ribParams({ ribLaw: 'A' }), f = M.ribField(p), LS = M.lineSet(f, 1, 50); const P = [19.9, -0.4, 0, 20.1, 0.5, 0, 20.3, -0.5, 0]; return M.cutOrgan(P, [0, 1, 2], LS, f, () => true).chords.length === 0; } },
  { id: 'the-junction-rule-is-removed', clause: 'R4', edits: [["&& !junction(O, a) && !junction(O, b) && !dis.has(a * R.X.nV + b)", '&& true']],
    witness: async (M) => junctionFixture(M).onShared > 0 },
  { id: 'math-atan2-restored', clause: 'R5', from: 'export function eatan2(y, x) {\n', to: 'export function eatan2(y, x) {\n  { const a = Math.atan2(y, x); return a < 0 ? a + RIB_TAU : a; }\n',
    witness: async (M) => { const y = 0.1234567, x = 0.7654321; let a = Math.atan2(y, x); return M.eatan2(y, x) === a; } },
  { id: 'the-axis-rule-is-dropped', clause: 'R6', edits: [['    if (!(r > S.rCut)) return 0;\n    const th = eatan2(y, x);', '    if (!(r > 0)) return 0;\n    const th = eatan2(y, x);'], ['    if (r < S.r0) {\n      const m = S.rule', '    if (false) {\n      const m = S.rule']],
    witness: async (M) => { const p = M.ribParams({ ribLaw: 'B' }), f = M.ribField(p); const r = f.S.rCut * 0.5; return f.F([r, 0, 0]) > 0; } },
  { id: 'the-named-exclusion-is-dropped', clause: 'R7', row: 'B-starburst-rods', from: '  if (O.rod || RIB_EXCLUDED_ORGANS.includes(O.organ)) return true;\n', to: '',
    witness: async (M) => { const b = await M.ribsBuild(DEFAULTS, { ribLaw: 'B', ribCentre: 'starburst', textureHeight: 2.5, stemLength: 40 }, { mode: 'crest' }); return b.stats.repl.some((g) => g.organ === 'stem' && g.Sv.some((x) => x > 0)); } },
  { id: 'the-centre-radius-is-typed', clause: 'R1', row: 'A-collar', from: 'const R = C.rFeet > S.r0 ? C.rFeet : S.r0;', to: 'const R = 10;',
    witness: async (M) => { const b = await M.ribsBuild(DEFAULTS, { ribLaw: 'A', ribCentre: 'collar', textureHeight: 1 }, { mode: 'crest' }); return b.stats.centre.R === 10; } },
  { id: 'the-rings-are-not-cut', clause: 'R2', row: 'B-concentric', from: 'pts.push({ t, jG: -(j + 1) });', to: 'void t;',
    witness: async (M) => { const b = await M.ribsBuild(DEFAULTS, { ribLaw: 'B', ribCentre: 'concentric', textureHeight: 2.5 }, { mode: 'crest' }); return !b.stats.crestEdges.some((e) => e.jG < 0); } },
  { id: 'the-starburst-stops-at-the-feet', clause: 'R8', row: 'A-starburst', from: 'if (__cov[i] && O.relievable[i]) w0[i] = 1; }', to: 'if (__cov[i] && O.relievable[i]) w0[i] = 0; }',
    witness: async (M) => { const b = await M.ribsBuild(DEFAULTS, { ribLaw: 'A', ribCentre: 'starburst', textureHeight: 1 }, { mode: 'lattice' }); const h = b.stats.repl.find((g) => g.organ === 'hub'); for (let i = 0; i < h.X.nV; i++) { const rr = Math.hypot(h.O.P[i * 3], h.O.P[i * 3 + 1]); if (h.O.N[i * 3 + 2] > 0.9 && rr > 6.5 && rr < 7.5 && h.X.w0[i] === 0) return true; } return false; } },
  { id: 'the-rim-drops-in-one-lattice-edge', clause: 'R8', row: 'A-starburst', from: "O.organ === 'hub' ? Math.min(Lam, textureFadeWidthMm(1, T.edgeMm)) : Lam;", to: "O.organ === 'hub' ? T.edgeMm : Lam;",
    witness: async (M) => { const b = await M.ribsBuild(DEFAULTS, { ribLaw: 'A', ribCentre: 'starburst', textureHeight: 1 }, { mode: 'lattice' }); const h = b.stats.repl.find((g) => g.organ === 'hub'); for (let i = 0; i < h.X.nV; i++) { const rr = Math.hypot(h.O.P[i * 3], h.O.P[i * 3 + 1]); if (h.O.N[i * 3 + 2] > 0.9 && rr > 7.4 && rr < 7.9 && h.X.mc[i] >= 1) return true; } return false; } },
  { id: 'the-rim-fades-over-the-45-degree-length', clause: 'R8', row: 'B-starburst', from: "O.organ === 'hub' ? Math.min(Lam, textureFadeWidthMm(1, T.edgeMm)) : Lam;", to: "O.organ === 'hub' ? Lam : Lam;",
    witness: async (M) => { const b = await M.ribsBuild(DEFAULTS, { ribLaw: 'B', ribCentre: 'starburst', textureHeight: 2.5 }, { mode: 'lattice' }); const h = b.stats.repl.find((g) => g.organ === 'hub'); for (let i = 0; i < h.X.nV; i++) { const rr = Math.hypot(h.O.P[i * 3], h.O.P[i * 3 + 1]); if (h.O.N[i * 3 + 2] > 0.9 && rr > 7.2 && rr < 7.6 && h.X.mc[i] < 1) return true; } return false; } },
];
/* R1 on the mutated module must restate from the CLEAN schedule: the gate
   imports the clean module for its numbers (R.ribSchedule is never read) */
const editsOf = (mu) => mu.edits || [[mu.from, mu.to]];
async function loadMutant(mu) {
  let src = MOD_SRC;
  for (const [from, to] of editsOf(mu)) { const n = src.split(from).length - 1; if (n !== 1) throw new Error(`mutant ${mu.id}: anchor matched ${n} times`); src = src.replace(from, () => to); }
  const file = path.join(ROOT, `.ribs-mutant-${mu.id}.js`);
  fs.writeFileSync(file, src);
  try { const M = await import(pathToFileURL(file).href + `?${Date.now()}`); return Object.assign(Object.create(null), M, { __src: src }); }
  finally { fs.rmSync(file, { force: true }); }
}

/* ------------------------------------------------------------- run --- */
const R0 = await import(pathToFileURL(path.join(ROOT, 'bloom-texture-ribs.js')).href);
let failed = false;
if (!NEG) {
  console.log('RIBS GATE — the clean module');
  const bad = await runClauses(R0, ROWS);
  if (BROWSER) {
    const br = await browserAgreement();
    for (const b of br) { console.log(`  R5 ${b.id}: node ${b.node.tris} ${b.node.hash} | chromium ${b.chromium.tris} ${b.chromium.hash} (${(b.chromium.ms / 1000).toFixed(1)} s) ${b.agree ? 'AGREE' : 'DIFFER'}`); if (!b.agree) bad.push(`R5 ${b.id}: Node and Chromium differ`); }
    fs.mkdirSync(path.join(ROOT, 'docs/data'), { recursive: true });
    const J = path.join(ROOT, 'docs/data/bloom-texture-ribs.json'); const d = fs.existsSync(J) ? JSON.parse(fs.readFileSync(J, 'utf8')) : {}; d.browserR5 = br; fs.writeFileSync(J, JSON.stringify(d, null, 1));
  }
  if (bad.length) { failed = true; console.log('FAIL'); for (const b of bad) console.log('  ' + b); } else console.log('PASS — every clause holds on every row');
} else {
  /* anchors first, every mutant, before any runs */
  for (const mu of MUTANTS) for (const [from] of editsOf(mu)) { const n = MOD_SRC.split(from).length - 1; if (n !== 1) { console.log(`ANCHOR ${mu.id}: matched ${n} times`); process.exit(1); } }
  const list = ONLY.length ? MUTANTS.filter((m) => ONLY.includes(m.id)) : MUTANTS;
  if (ONLY.length) console.log(`(a SUBSET: ${list.length} of ${MUTANTS.length} mutants)`);
  for (const mu of list) {
    const M = await loadMutant(mu);
    const moved = await mu.witness(M);
    /* the gate asks ONE row per mutant (the one its clause reads hardest), on the mutated module */
    const row = mu.row ? ROWS.find((x) => x.id === mu.row) : mu.clause === 'R1' ? ROWS[1] : ROWS[0];
    const bad = await runClauses(M, [row], false);
    const fired = bad.filter((b) => b.startsWith(mu.clause));
    const ok = moved && fired.length > 0;
    if (!ok) failed = true;
    console.log(`${ok ? 'BEHAVES' : 'MISSED '} ${mu.id}: witness ${moved ? 'moved' : 'DID NOT MOVE'}; ${mu.clause} ${fired.length ? 'fired — ' + fired[0].slice(0, 140) : 'SILENT'}${bad.length > fired.length ? ` (also: ${bad.filter((x) => !x.startsWith(mu.clause)).map((x) => x.slice(0, 120)).join(' / ')})` : ''}`);
  }
  console.log(failed ? 'NEGATIVE CONTROL FAILED' : `NEGATIVE CONTROL PASSED — ${list.length} of ${MUTANTS.length} mutants fire their clause`);
}
process.exit(failed ? 1 : 0);
