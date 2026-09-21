#!/usr/bin/env node
/* THE PETAL'S EDGE PROFILE — the gate for the taper and the bead.
   ============================================================================

   WHAT IT MEASURES, and why each clause needs to exist. `emitPanel` used to
   close a petal with a flat wall one sheet thickness tall; it now eases the
   sheet toward RIM_FLOOR_MM over RIM_TAPER_MM of SURFACE DISTANCE and closes
   it with a half-round bead whose apex sits on the original boundary point.
   Both STL gates are structurally blind to every part of that:

     - a rim at half the ruled thickness is still a closed shell, so the
       watertight gate passes it;
     - a flat wall is still one connected piece, so the flood fill passes it;
     - the WALL INSTRUMENT cannot see it either, and that is the important
       one: `measureWall` RECONSTRUCTS both skins from the captured mid
       surface, the captured normal and the per-row scalar `thickness`, and
       builds its triangles from the skin lattice alone. It never reads an
       emitted rim triangle and never reads a per-column thickness, so V1-V5
       and the combination gate stay GREEN on any rim treatment whatsoever —
       green on a bead, green on no bead, green on a rim at 0.1 mm. Declared
       here rather than fixed there: teaching `measureWall` a per-column
       thickness fires V1's own calibration (a flat build must read the
       declared thickness) on the tapered columns, which is its own change.
     - and a bead whose apex has been RECOMPUTED rather than placed lands a
       few ulp off the original boundary, which no gate here would notice and
       which is the whole of "the silhouette does not move".

   SO THE FAMILY IS E0-E5 AND NOTHING ELSE ASSERTS ANY OF IT.

     E0  the capture is not vacuous — a treated rim exists, and it covers the
         share of the perimeter the panel's own extents predict.
     E1  THE RIM FLOOR. |top - bot| at every treated profile is at or above
         RIM_FLOOR_MM less RIM_FLOOR_BAND_MM, except where the narrow-span
         clamp is declared — and the declaration is a BICONDITIONAL against
         the law restated here, so a builder that logged every location (the
         ST9 trap: a guard that reads the record it checks) empties nothing.
     E2  NO HARD EDGE. The largest turn between adjacent faces within
         RIM_NEAR_MM of a treated apex is under RIM_DIHEDRAL_MAX_DEG.
     E3  the mesh is still closed and degenerate-free.
     E4  THE SILHOUETTE. Every vertex the builder says it emitted at a treated
         profile IS in the emitted stream, as the same double.
     E5  THE TOPOLOGY IS MODE-FREE. The triangle count and the treated-profile
         count are identical live and export. This project has refused a
         mode-dependent topology five times; the bead's segment count reads
         the sheet through `Math.max(t, MIN_FEATURE_MM)` precisely so that it
         cannot become the sixth, and this is the clause that says so.

   THE REFERENCE AND THE MEASURED VALUE HAVE DIFFERENT OWNERS (Eva's fourth
   durable rule). Every bar is IMPORTED from the geometry or declared here as
   Eva's own number; every measured value is read off the EMITTED TRIANGLE
   STREAM or off arrays the gate has first proved are in it. The builder's
   `rim.apex` record only says WHICH vertices to look at, and E4 proves those
   are real mesh vertices before E1 measures anything with them.

   RUN: node tools/verify-bloom-edge-profile.mjs [--all] [--only <regex>]
        node tools/verify-bloom-edge-profile.mjs --control     (REQUIRED
        before quoting a pass from a changed harness: it rewrites
        bloom-geometry.js five ways and each mutation must redden the clause
        it names and no clause it does not.)
   ========================================================================= */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const CONTROL = argv.includes('--control');
const ALL = argv.includes('--all');
const PROGRESS = argv.includes('--progress');
const ONLY = (() => { const i = argv.indexOf('--only'); return i >= 0 ? new RegExp(argv[i + 1]) : null; })();

/* EVA'S NUMBERS, declared here because they are hers and not the geometry's.
   The band on the floor is her own "-0.01"; the 2 mm window and the 30 degree
   turn are the ruling's. RIM_FLOOR_MM itself is IMPORTED, never restated. */
const RIM_FLOOR_BAND_MM = 0.01;
const RIM_NEAR_MM = 2.0;

const RIM_DIHEDRAL_MAX_DEG = 30;
/* THE OUTLINE CORNER'S OWN NEIGHBOURHOOD, in bead radii. The profile pivots
   about ONE skin vertex there and its reach is |apex - C| at the corner, which
   is the two insets in quadrature — 0.84 mm at the shipping default against a
   0.5 mm radius. Two radii is that, rounded up to the bead's own diameter, and
   it is a length rather than a tuned number. Measured: at ONE radius twelve
   edges of 4,777 sat between 30 and 36.02 degrees, every one of them inside
   the pivot and none anywhere else. */
const RIM_CORNER_R = 2;


const loadGeom = async (file) => import(pathToFileURL(file).href);
const G0 = await loadGeom(path.join(HERE, 'bloom-geometry.js'));
const { DEFAULTS } = await import(pathToFileURL(path.join(HERE, 'bloom-registry.js')).href);
const H = await import(pathToFileURL(path.join(HERE, 'tools', 'bloom-harness.mjs')).href);

/* A matrix row's `set` values are STRINGS and the geometry's guards are
   truthiness tests on numbers — `!'0'` is FALSE. Coerced against DEFAULTS,
   the shape tools/verify-bloom-seam-bytes.mjs already uses. */
const stateFor = (row) => {
  const st = { ...DEFAULTS };
  for (const { id, value } of (row.set || [])) {
    if (!(id in DEFAULTS)) { st[id] = value; continue; }
    const d = DEFAULTS[id];
    st[id] = typeof d === 'number' ? Number(value) : typeof d === 'boolean' ? (value === true || value === 'true') : value;
  }
  return st;
};

/* A ROW WHOSE SURFACE IS DECLARED TO PASS THROUGH ITSELF CANNOT BE HELD TO A
   SMOOTHNESS BAR, and that is not a carve-out for this change: two faces of a
   folded sheet that share an edge legitimately turn through 180 degrees, and
   the census — not this gate — is what owns a fold. The list is the harness's
   own SELF_INTERSECTION_XFAIL, imported rather than restated, so a row that
   stops folding stops being exempt here the same day X1 says so. The count of
   rows skipped is printed on every run. */
const FOLDS = new Set(Object.keys(H.SELF_INTERSECTION_XFAIL || {}));

const MATRIX = H.buildMatrix();
/* THE DEFAULT ROW SET is one per matrix BLOCK plus every row whose label names
   a rim-shaped feature, because those are the panels whose boundaries are not
   the plain span: a cleft's sinus, a fringe's teeth and gaps, a lobe's
   scallops, and the narrow tips. `--all` runs the whole matrix. */
/* THE DEFAULT ROW SET IS THE PROJECT'S OWN SMOKE SUBSET, imported rather than
   restated: a second hand-written list of "interesting rows" is a second owner
   of that judgement, and this repo has paid for that before. `--all` runs the
   whole matrix; `--only <regex>` runs a named slice. What the subset is BLIND
   to is in tools/bloom-smoke.mjs's own header. */
const SMOKE = await import(pathToFileURL(path.join(HERE, 'tools', 'bloom-smoke.mjs')).href);
const SMOKE_LABELS = new Set(SMOKE.SMOKE_BLOCKS.flatMap((b) => b.rows.map((r) => r.label)));
const pickRows = () => {
  if (ONLY) return MATRIX.filter((r) => ONLY.test(r.label));
  if (ALL) return MATRIX;
  return MATRIX.filter((r) => SMOKE_LABELS.has(r.label));
};

const key3 = (x, y, z) => `${x},${y},${z}`;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/* The emitted stream, read as a mesh: the vertex set, the edge census, the
   degenerate count and every edge's turn angle. Nothing here reads the
   builder. */
/* THE EMITTED STREAM, READ AS A MESH, ON TYPED ARRAYS. Nothing here reads the
   builder. The obvious implementation — a Map keyed by "a|b" per edge — runs
   out of an EIGHT GIGABYTE heap on `ALL MAX` at 4.3 million triangles, where
   there are thirteen million directed edges: the keys alone are gigabytes of
   string. Vertices still go through a Map because the dedup must be EXACT on
   the double (this project keys on `String(v)`, the shortest round-tripping
   form, precisely so two keys are equal iff the doubles are); everything after
   that is integer ids in Float64Arrays, sorted. */
function meshOf(pos) {
  const T = pos.length / 9;
  const id = new Map();
  const vid = new Int32Array(T * 3);
  let next = 0;
  for (let i = 0, k = 0; i < pos.length; i += 3, k++) {
    const key = key3(pos[i], pos[i + 1], pos[i + 2]);
    let v = id.get(key);
    if (v === undefined) { v = next++; id.set(key, v); }
    vid[k] = v;
  }
  /* One packed double per DIRECTED edge: a * 2^27 + b. Exact while the vertex
     count stays under 2^27 (134 million), which is far past any reachable
     matrix row; asserted rather than assumed. */
  if (next >= 134217728) throw new Error(`meshOf: ${next} vertices exceeds the packing this census uses`);
  const SH = 134217728;
  const dirs = new Float64Array(T * 3);
  const und = new Float64Array(T * 3);
  const N = [];
  let degen = 0, m = 0, volume = 0;
  for (let t = 0, k = 0; t < pos.length; t += 9, k += 3) {
    const a = vid[k], b = vid[k + 1], c = vid[k + 2];
    if (a === b || b === c || a === c) { degen++; N.push(null); continue; }
    const ax = pos[t], ay = pos[t + 1], az = pos[t + 2];
    const bx = pos[t + 3], by = pos[t + 4], bz = pos[t + 5];
    const cx = pos[t + 6], cy = pos[t + 7], cz = pos[t + 8];
    const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const L = Math.hypot(nx, ny, nz);
    if (!(L > 0)) { degen++; N.push(null); continue; }
    N.push([nx / L, ny / L, nz / L, (ax + bx + cx) / 3, (ay + by + cy) / 3, (az + bz + cz) / 3]);
    volume += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
    for (const [x, y] of [[a, b], [b, c], [c, a]]) {
      dirs[m] = x * SH + y;
      und[m] = (x < y ? x : y) * SH + (x < y ? y : x);
      m++;
    }
  }
  const D = dirs.subarray(0, m).slice().sort();
  const U = und.subarray(0, m).slice().sort();
  let boundary = 0, nonManifold = 0;
  for (let i = 0; i < m;) {
    let j = i; while (j < m && U[j] === U[i]) j++;
    const n = j - i;
    if (n === 1) boundary++; else if (n > 2) nonManifold++;
    i = j;
  }
  /* THE DIRECTED CENSUS: every directed edge must have its reverse. Binary
     search over the sorted packed ids — no second Map. */
  const has = (x) => { let lo = 0, hi = m - 1; while (lo <= hi) { const mid = (lo + hi) >> 1; if (D[mid] === x) return true; if (D[mid] < x) lo = mid + 1; else hi = mid - 1; } return false; };
  let dirUnmatched = 0;
  for (let i = 0; i < m; i++) {
    if (i && D[i] === D[i - 1]) continue;
    const a = Math.floor(D[i] / SH), b = D[i] - a * SH;
    if (!has(b * SH + a)) dirUnmatched++;
  }
  /* The edge list the dihedral pass walks: only edges with exactly two faces,
     as (packed, faceA, faceB). Built from the undirected sort, so it costs no
     extra map. */
  const pairs = [];
  {
    const order = new Int32Array(m);
    for (let i = 0; i < m; i++) order[i] = i;
    const arr = Array.from(order).sort((x, y) => und[x] - und[y]);
    for (let i = 0; i < m;) {
      let j = i; while (j < m && und[arr[j]] === und[arr[i]]) j++;
      if (j - i === 2) pairs.push([Math.floor(arr[i] / 3), Math.floor(arr[i + 1] / 3)]);
      i = j;
    }
  }
  return { vertIds: id, edges: pairs, degen, boundary, nonManifold, dirUnmatched, volume, N, tris: T };
}

/* A bucket grid over a point set, answering "how far to the nearest of these"
   within a bounded radius. Linear in the mesh; the apex set reaches tens of
   thousands of points on the densest rows. */
function nearestWithin(points, cell) {
  const grid = new Map();
  const ck = (p) => `${Math.floor(p[0] / cell)},${Math.floor(p[1] / cell)},${Math.floor(p[2] / cell)}`;
  for (const a of points) { const k = ck(a); let g = grid.get(k); if (!g) { g = []; grid.set(k, g); } g.push(a); }
  /* A ONE-CELL HALO AROUND THE OCCUPIED CELLS, so the common case — an edge
     nowhere near a rim — costs ONE lookup instead of twenty-seven. On the
     densest matrix rows this is thirteen million edges against sixty-five
     thousand rim points, and without it the clause is minutes per row. */
  const halo = new Set();
  for (const k of grid.keys()) {
    const [x, y, z] = k.split(',').map(Number);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) halo.add(`${x + dx},${y + dy},${z + dz}`);
  }
  return (p) => {
    const bx = Math.floor(p[0] / cell), by = Math.floor(p[1] / cell), bz = Math.floor(p[2] / cell);
    if (!halo.has(`${bx},${by},${bz}`)) return Infinity;
    let best = Infinity;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const g = grid.get(`${bx + dx},${by + dy},${bz + dz}`); if (!g) continue;
      for (const a of g) { const d = dist(a, p); if (d < best) best = d; }
    }
    return best;
  };
}

/* THE LARGEST TURN OVER THE TREATED RIM, and the subject is stated rather than
   assumed. An edge counts when it lies within `near` of a TREATED apex AND is
   closer to one than to any perimeter vertex the treatment did not reach.
   That second half is load-bearing and is not a carve-out to dodge a red: the
   buried perimeter — the foot under the hub slab, a cleft's or a fringe's base
   panel under the panels that overlap it — is a flat wall at ninety degrees BY
   DESIGN, identically on main, and at the shipping default the first treated
   apex sits 0.65 mm above the foot's own wall, well inside a 2 mm window. The
   excluded count is REPORTED, and the two sets come from the builder's own
   `rim.apex` / `rim.flat` so neither can be silently widened. */
function worstTurnNearRim(mesh, apexes, flats, corners, near, cornerR, rampMm) {
  if (!apexes.length) return { deg: 0, at: null, edges: 0, skipped: 0, corner: 0, cornerDeg: 0, rampDeg: 0 };
  const dT = nearestWithin(apexes, near);
  const dF = flats.length ? nearestWithin(flats, near) : () => Infinity;
  const dC = corners.length ? nearestWithin(corners, Math.max(cornerR, 1e-6)) : () => Infinity;
  let worst = -1, at = null, n = 0, skipped = 0, nCorner = 0, cornerDeg = 0, rampDeg = 0;
  const deg0 = (A, B) => { let d = A[0] * B[0] + A[1] * B[1] + A[2] * B[2]; d = d > 1 ? 1 : d < -1 ? -1 : d; return (Math.acos(d) * 180) / Math.PI; };
  for (const f of mesh.edges) {
    const A = mesh.N[f[0]], B = mesh.N[f[1]];
    if (!A || !B) continue;
    const mid = [(A[3] + B[3]) / 2, (A[4] + B[4]) / 2, (A[5] + B[5]) / 2];
    const t = dT(mid);
    if (!(t <= near)) continue;
    /* THE SUBJECT IS THE RIM THE TREATMENT FINISHED, and both halves of that
       are stated rather than assumed. An edge nearer an UNTREATED perimeter
       vertex than a treated one belongs to the buried stretch. An edge within
       RIM_TAPER_MM of one belongs to the RAMP — the hand-over to the foot-to-
       blade seam, which is the receptacle join and is out of this change's
       scope by Eva's own ruling. Inside that ramp the wall's strip is a ruled
       surface between two segments that are not parallel, and subdividing it
       at K steps resolves a twist main's single quad did not: the corner reads
       108.21 deg on this tree against 93.92 on main, at the seam, inside the
       hub's own rim. That is REPORTED beside the bar, not silently dropped —
       `skipped` is printed on every run. */
    const fd = dF(mid);
    if (fd < t || fd <= rampMm) { skipped++; if (deg0(A, B) > rampDeg) rampDeg = deg0(A, B); continue; }
    let d = A[0] * B[0] + A[1] * B[1] + A[2] * B[2];
    d = d > 1 ? 1 : d < -1 ? -1 : d;
    const deg = (Math.acos(d) * 180) / Math.PI;
    /* AN OUTLINE CORNER IS NOT A RIM EDGE. See the block at `rim.corner` in
       bloom-geometry.js: the apex path must pass through every original
       boundary vertex, so where the outline turns the drawn surface turns with
       it. Reported, never counted against the bar — and reported as a NUMBER
       so a corner that got worse is visible rather than absorbed. */
    if (dC(mid) <= cornerR) { nCorner++; if (deg > cornerDeg) cornerDeg = deg; continue; }
    n++;
    if (deg > worst) { worst = deg; at = mid; }
  }
  return { deg: worst < 0 ? 0 : worst, at, edges: n, skipped, corner: nCorner, cornerDeg, rampDeg };
}

async function runRows(G, rows, fails, notes) {
  const check = (clause, ok, msg) => { if (!ok) fails.push(`${clause}: ${msg}`); return ok; };
  let profiles = 0, worstTurn = 0, worstCorner = 0, worstRamp = 0, minRim = Infinity, clamps = 0;
  let done = 0;
  for (const row of rows) {
    if (PROGRESS) process.stderr.write(`  [${++done}/${rows.length}] ${row.label.slice(0, 70)}\n`);
    const st = stateFor(row);
    const per = {};
    for (const exportMode of [false, true]) {
      let acc, built;
      try {
        acc = new G.MeshBuilder({ exportMode, captureRim: true });
        built = G.buildBloomInto(acc, st, { below: null, capability: row.capability || null });
      } catch (e) { check('E0', false, `${row.label} [${exportMode ? 'export' : 'live'}]: build threw — ${e.message}`); continue; }
      const mesh = meshOf(acc.positions);
      const rim = [];
      for (const p of (built.petalsAll || [])) if (p && p.rim) rim.push(p.rim);
      for (const s of (built.sepals && built.sepals.built) || []) if (s && s.rim) rim.push(s.rim);
      const apexRecs = rim.flatMap((r) => r.apex || []);
      const clampRecs = rim.flatMap((r) => r.clamps || []);
      per[exportMode ? 'export' : 'live'] = { tris: mesh.tris, apexes: apexRecs.length };

      /* ---- E3: still a closed, degenerate-free solid ---- */
      check('E3', mesh.boundary === 0, `${row.label} [${exportMode ? 'export' : 'live'}]: ${mesh.boundary} boundary edges`);
      check('E3', mesh.degen === 0, `${row.label} [${exportMode ? 'export' : 'live'}]: ${mesh.degen} degenerate triangles`);
      /* THE DIRECTED CENSUS, and it is the clause that would have caught this
         session's own worst defect. The first rim sweep walked its strip the
         wrong way round and produced a mesh with ZERO boundary edges and ZERO
         non-manifold edges whose every rim triangle faced INWARD — 2,112
         directed edges with no reverse partner and a signed volume of −455.58
         mm³ against main's +4,415.57. The undirected census keys on a SORTED
         pair, so it cannot see a face wound the wrong way; ST10 found the same
         thing on the stem tube's annuli one solid earlier. */
      check('E3', mesh.dirUnmatched === 0, `${row.label} [${exportMode ? 'export' : 'live'}]: ${mesh.dirUnmatched} directed edges have no reverse partner — some faces are wound inside-out`);
      check('E3', mesh.volume > 0, `${row.label} [${exportMode ? 'export' : 'live'}]: the solid's signed volume is ${mesh.volume.toFixed(3)} mm³, not positive`);

      if (!apexRecs.length) {
        /* A bloom with no petals at all is legitimate (the bare sphere-stem
           corner), so this is only an observation. E0 below is what refuses a
           vacuous run over the whole set. */
        continue;
      }
      profiles += apexRecs.length;

      /* ---- E4: the silhouette — every declared vertex is a real one ---- */
      let missing = 0, firstMiss = null;
      for (const r of apexRecs) {
        for (const [what, P] of [['apex', r.apex], ['top', r.top], ['bot', r.bot]]) {
          if (!mesh.vertIds.has(key3(P[0], P[1], P[2]))) { missing++; if (!firstMiss) firstMiss = `${what} at panel ${r.panel} row ${r.row} col ${r.col}`; }
        }
      }
      check('E4', missing === 0, `${row.label} [${exportMode ? 'export' : 'live'}]: ${missing} of ${apexRecs.length * 3} declared rim vertices are not in the emitted stream (first: ${firstMiss})`);

      /* ---- E1: the rim floor, with the clamp as a BICONDITIONAL ----
         THE BAR IS `min(RIM_FLOOR_MM, the body's own thickness)`, and that is
         Eva's second ruling rather than a softening: where the body is already
         at or under the floor there is no taper and the bead alone closes the
         edge, so the rim IS the body and holding it to 1.0 mm would be asking
         the sheet to get thicker toward its edge. In LIVE mode nothing floors
         the sheet, so this is a reachable state and not a corner — `ALL MAX`
         alone reads 61,533 profiles there.

         THE CLAMP IS READ OFF THE APEX'S OWN RECORD, not matched against a
         separate list by (panel, row, column). That key is NOT UNIQUE — every
         petal's panel is called 'full' — so on a 240-petal head one petal's
         clamp excused another petal's rim: measured, 10,508 false exclusions
         on `ALL MAX` before this was fixed. The flag travels WITH the profile
         it is about. */
      clamps += clampRecs.length;
      let thin = 0, thinWorst = null, wrongClamp = 0;
      for (const r of apexRecs) {
        const t = dist(r.top, r.bot);
        if (t < minRim) minRim = t;
        const bar = Math.min(G.RIM_FLOOR_MM, r.bodyMm) - RIM_FLOOR_BAND_MM;
        const under = t < bar;
        if (under && !r.clamped) { thin++; if (!thinWorst || t < thinWorst.t) thinWorst = { t, r, bar }; }
        if (r.clamped && !(t < G.RIM_FLOOR_MM - RIM_FLOOR_BAND_MM)) wrongClamp++;
      }
      check('E1', thin === 0, `${row.label} [${exportMode ? 'export' : 'live'}]: ${thin} rim profiles are under ${G.RIM_FLOOR_MM} mm and are NOT declared clamps (worst ${thinWorst && thinWorst.t.toFixed(4)} mm against a bar of ${thinWorst && thinWorst.bar.toFixed(4)} at panel ${thinWorst && thinWorst.r.panel} row ${thinWorst && thinWorst.r.row})`);
      /* THE OTHER DIRECTION, and it is the one that stops the exclusion
         emptying the clause: a location declared clamped must actually BE
         under the floor. A builder that logged everything would fail here. */
      check('E1', wrongClamp === 0, `${row.label} [${exportMode ? 'export' : 'live'}]: ${wrongClamp} declared clamp locations are NOT under the floor — the declaration is excluding rows it has no business excluding`);

      /* ---- E2: no hard edge within RIM_NEAR_MM of a treated apex ---- */
      if (exportMode && !FOLDS.has(row.label)) {
        const turn = worstTurnNearRim(mesh, apexRecs.map((r) => r.apex), rim.flatMap((r) => r.flat || []), rim.flatMap((r) => r.corner || []), RIM_NEAR_MM, RIM_CORNER_R * G.RIM_BEAD_RADIUS_MM, G.RIM_TAPER_MM);
        if (turn.cornerDeg > worstCorner) worstCorner = turn.cornerDeg;
        if (turn.rampDeg > worstRamp) worstRamp = turn.rampDeg;
        if (turn.deg > worstTurn) worstTurn = turn.deg;
        check('E2', turn.edges > 0, `${row.label}: no edge lies within ${RIM_NEAR_MM} mm of a treated apex — the window found nothing to measure`);
        check('E2', turn.deg < RIM_DIHEDRAL_MAX_DEG, `${row.label}: the largest turn within ${RIM_NEAR_MM} mm of a rim is ${turn.deg.toFixed(2)} deg, at or over the ${RIM_DIHEDRAL_MAX_DEG} deg bar`);
      }
    }
    /* ---- E5: the topology is the same in both modes ---- */
    if (per.live && per.export) {
      check('E5', per.live.tris === per.export.tris, `${row.label}: ${per.live.tris} triangles live against ${per.export.tris} export — the rim's topology is mode-dependent`);
      check('E5', per.live.apexes === per.export.apexes, `${row.label}: ${per.live.apexes} treated profiles live against ${per.export.apexes} export`);
    }
  }
  check('E0', profiles > 0, `no treated rim profile was found on any row — the run is vacuous`);
  notes.push(`rows ${rows.length} (${rows.filter((r) => FOLDS.has(r.label)).length} exempt from E2 as declared self-intersectors) · treated profiles ${profiles} · declared clamps ${clamps} · thinnest rim ${Number.isFinite(minRim) ? minRim.toFixed(4) : 'n/a'} mm · worst turn ALONG a rim ${worstTurn.toFixed(2)} deg (bar ${RIM_DIHEDRAL_MAX_DEG}) · worst turn AT an outline corner ${worstCorner.toFixed(2)} deg (exempt, the outline's own — see rim.corner) · worst turn in the RAMP to the receptacle join ${worstRamp.toFixed(2)} deg (exempt, out of scope; main reads 93.92 at the default)`);
  return { profiles, worstTurn, worstCorner, minRim, clamps };
}

/* ======================= THE MUST-FAIL ==================================
   Each mutation names the clause it must break. A mutation that does not
   apply, a named clause that stays green, or a clause it did not name going
   red are all failures — the last is how a mutation that merely breaks the
   build gets caught pretending to be a negative control. */
const MUTATIONS = [
  { id: 'the-flat-wall-is-restored', breaks: ['E2'],
    from: '      const th = (Math.PI * m) / K, cs = Math.cos(th), sn = Math.sin(th);',
    to:   '      const th = (Math.PI * m) / K, cs = Math.cos(th), sn = 0;' },
  { id: 'the-rim-floor-is-lowered-to-0.4', breaks: ['E1'],
    from: 'export const RIM_FLOOR_MM = 1.0;',
    to:   'export const RIM_FLOOR_MM = 1.0; const RIM_FLOOR_APPLIED = 0.4;' },
  { id: 'the-bead-apex-is-recomputed', breaks: ['E4'],
    from: '    pts[0] = top[sk][j]; pts[K] = bot[sk][j]; pts[APEX] = apex;',
    to:   '    pts[0] = top[sk][j]; pts[K] = bot[sk][j]; pts[APEX] = [C[0] + (apex[0] - C[0]), C[1] + (apex[1] - C[1]), C[2] + (apex[2] - C[2])];' },
  { id: 'every-clamp-is-logged', breaks: ['E1'],
    from: '      if (rim && 2 * b < RIM_FLOOR_MM - 1e-9 && 2 * b < tBody - 1e-9) {',
    to:   '      if (rim) {' },
  { id: 'the-segment-count-reads-the-live-sheet', breaks: ['E5'],
    from: '  const r = Math.min(RIM_BEAD_RADIUS_MM, Math.max(sheetMm, MIN_FEATURE_MM) / 2);',
    to:   '  const r = Math.min(RIM_BEAD_RADIUS_MM, sheetMm / 2);' },
];
/* The floor mutation needs a second edit: the constant is exported and read
   by the gate as the BAR, so lowering the export alone would move the bar
   with the geometry and check nothing (the `seam-floor-removed` trap). What
   moves instead is the value the BUILDER applies. */
const EXTRA = {
  'the-rim-floor-is-lowered-to-0.4': [
    ['    const r = Math.min(RIM_BEAD_RADIUS_MM, tBody / 2, RIM_ROOM_FRACTION * roomMm[k]);',
     '    const r = Math.min(RIM_FLOOR_APPLIED / 2, tBody / 2, RIM_ROOM_FRACTION * roomMm[k]);'],
  ],
};

async function control() {
  const src = fs.readFileSync(path.join(HERE, 'bloom-geometry.js'), 'utf8');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-edge-'));
  /* THE ANCHOR PRE-CHECK, over EVERY mutation, before any of them runs. A
     refactor disarms a mutant either by moving its `from` or by making it
     match twice, and the one nobody sees is inside a mutant a subset skips. */
  const bad = [];
  for (const m of MUTATIONS) {
    const n = src.split(m.from).length - 1;
    if (n !== 1) bad.push(`${m.id}: its anchor matches ${n} times, not once`);
    for (const [f] of (EXTRA[m.id] || [])) {
      const k = src.split(f).length - 1;
      if (k !== 1) bad.push(`${m.id}: its second anchor matches ${k} times, not once`);
    }
  }
  if (bad.length) { console.error('edge-profile control: ANCHORS STALE\n  ' + bad.join('\n  ')); process.exit(1); }

  const rows = pickRows().slice(0, 12);
  let failures = 0;
  for (const m of MUTATIONS) {
    let mutated = src.replace(m.from, m.to);
    for (const [f, t] of (EXTRA[m.id] || [])) mutated = mutated.replace(f, t);
    if (mutated === src) { console.error(`  ${m.id}: MUTATION DID NOT APPLY`); failures++; continue; }
    const file = path.join(dir, `bloom-geometry.${m.id}.js`);
    fs.writeFileSync(file, mutated);
    let G;
    try { G = await loadGeom(file); } catch (e) { console.error(`  ${m.id}: the mutated module does not load — ${e.message}`); failures++; continue; }
    const f = [], n = [];
    try { await runRows(G, rows, f, n); } catch (e) { f.push(`RUN THREW: ${e.message}`); }
    const fired = new Set(f.map((x) => x.split(':')[0]));
    const missed = m.breaks.filter((c) => !fired.has(c));
    const extra = [...fired].filter((c) => !m.breaks.includes(c));
    const ok = missed.length === 0 && extra.length === 0;
    if (!ok) failures++;
    console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${m.id.padEnd(42)} claims ${m.breaks.join(',').padEnd(6)} fired ${[...fired].join(',') || '(nothing)'}`
      + (missed.length ? `  MISSED ${missed.join(',')}` : '') + (extra.length ? `  UNCLAIMED ${extra.join(',')}` : ''));
  }
  fs.rmSync(dir, { recursive: true, force: true });
  if (failures) { console.error(`\nedge-profile control: FAILED — ${failures} of ${MUTATIONS.length} mutations did not behave.`); process.exit(1); }
  console.log(`\nedge-profile control: PASS — ${MUTATIONS.length} of ${MUTATIONS.length} mutations reddened exactly the clauses they name.`);
}

if (CONTROL) { await control(); }
else {
  const rows = pickRows();
  const fails = [], notes = [];
  const t0 = Date.now();
  await runRows(G0, rows, fails, notes);
  for (const n of notes) console.log('edge-profile: ' + n);
  console.log(`edge-profile: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  if (fails.length) {
    console.log(`\nedge-profile: FAILED — ${fails.length} findings`);
    for (const f of fails.slice(0, 40)) console.log('  ' + f);
    if (fails.length > 40) console.log(`  ... and ${fails.length - 40} more`);
    process.exit(1);
  }
  console.log('edge-profile: PASS — E0-E5 clean.');
}
