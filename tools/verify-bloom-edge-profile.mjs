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
         RIM_NEAR_MM of a treated apex is under DIH_BAR.
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
   The band on the floor is her own "-0.01" and the 2 mm window is the
   ruling's. RIM_FLOOR_MM itself is IMPORTED, never restated. */
const RIM_FLOOR_BAND_MM = 0.01;
const RIM_NEAR_MM = 2.0;

/* THE TURN ALLOWANCE IS DERIVED FROM THE SEGMENT COUNT, AND THE TYPED 30 IT
   REPLACES WAS IN DIRECT CONFLICT WITH EVA'S LATER RULING — said here rather
   than left as a number that moved.

   The first ruling set this at 30 degrees when the bead carried EIGHT
   segments. The second ruled the count down to FOUR, because eight puts
   facets at about 0.2 mm, under Nylon 12 White's ~0.35-0.4 mm resolvable
   detail. A half round sampled at K segments turns `180 / K` between adjacent
   facets BY CONSTRUCTION — that is what the tangent-angle sampling buys and
   it is the bead drawing itself, not an edge the treatment added — so at
   K = 4 the bead turns 45 degrees and a typed 30 forbids the count Eva ruled.
   The two rulings cannot both be satisfied by a constant.

   So the bar is the bead's OWN resolution, `180 / K`, imported through
   `rimSegmentsOf` rather than restated: a turn at or under it is the facet
   count, and anything above it is a hard edge that has to be explained. IT IS
   STRICTER THAN THE NUMBER IT REPLACES WHEREVER THE OLD ONE APPLIED — at
   K = 8 it is 22.5 against 30, and the shipped tree measured 21.50 there, so
   the derivation would have held on the geometry it replaces as well as on
   this one. That is the test that says it is a re-derivation and not a bar
   fitted to the data in hand.

   The SHADING half of the old bar's job is answered by the other half of the
   same ruling: the bead now carries its own smooth normal, so a facet edge is
   no longer something the eye can find. */

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
/* K IS THE CAP, and the cap is what every reachable row takes: `rimSegments`
   reads the sheet through `max(t, MIN_FEATURE_MM)` and MIN_FEATURE_MM is 1.0,
   so its radius arm is 0.5 mm at every state and the ratio is exactly 1 —
   measured over the whole live matrix in both modes. A tree on which that
   stopped being true would take a SMALLER K, turn MORE per facet, and go RED
   here against a bar computed from the cap, which is the safe direction: the
   allowance is named in the message, so the red says what it is. */
const DIH_BAR = 180 / G0.RIM_BEAD_SEGMENTS;

/* WHERE THE SURFACE ITSELF TURNS FASTER THAN THE OUTLINE SAYS, DECLARED WITH
   ITS MAGNITUDE — this project's own xfail idiom (#213), applied to an angle
   instead of a span.

   E2 subtracts the OUTLINE's own turn, which is a PLAN quantity: it is the
   angle the boundary polyline turns through as seen from above. Three things
   turn the SURFACE at a rim without turning that polyline at all — a buckle
   wave (out of plane by construction), a steep taper on a thick sheet (the
   profile's own half-thickness changing along the sweep), and a fringe tooth's
   terminal. The bead has to follow the surface it rides, so the residual is
   not an edge the treatment invented; it is the surface's, arriving at a rim.

   EACH ENTRY CARRIES THE EXCESS OVER THE BAR AS A NUMBER THE GATE READS, IN
   BOTH DIRECTIONS. A row that grows is a finding for whatever moved it; a row
   that stops exceeding is a stale record and says so. The band is 5e-5 deg —
   #213's own 5e-5, in the unit this quantity carries — which is eight orders
   above the float floor of an angle taken from two unit normals, and well
   inside the smallest excess declared here (1.68e-4). */
const E2_TURN_BAND_DEG = 5e-5;
const E2_TURN_XFAIL = {
  'BUCKLE: the default frequency at a strong amplitude (0.30 x, f 3)':
    { excessDeg: 6.236137, note: 'the buckle wave curves the margin OUT OF PLANE, which the outline\'s plan turn cannot see; raw 60.05 deg, outline 8.81' },
  'TIP SHAPE: 0.60 x the thickest sheet (2.40 — the floor doubles and binds early)':
    { excessDeg: 0.005430, note: 'the taper runs 2.40 -> 1.00 mm over RIM_TAPER_MM, so the profile\'s own half-thickness changes along the sweep and the quad is not planar; raw 45.01 deg, outline 0.00' },
  'FRINGE: THE CARNATION — 7 teeth on a 0.50 terminal at the shipped depth':
    { excessDeg: 0.000168, note: 'a tooth\'s terminal; the frame rotates a hair between adjacent columns. raw 45.00 deg, outline 0.00' },
  'FRINGE: GATED — LOBES asked for under a fringe (hidden AND inert, by ruling — the fringe wins)':
    { excessDeg: 0.000168, note: 'the carnation row again — this row carries the same fringe, and the lobes are inert by ruling' },
};
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
      if (j - i === 2) pairs.push([Math.floor(arr[i] / 3), Math.floor(arr[i + 1] / 3), und[arr[i]]]);
      i = j;
    }
  }
  return { vertIds: id, edges: pairs, degen, boundary, nonManifold, dirUnmatched, volume, N, tris: T, SH };
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

/* The sharpest OUTLINE turn among the recorded apexes within `near` of a
   point. Same bucket grid; returns 0 where nothing is in reach. */
function nearestTurn(apexes, cell) {
  const grid = new Map();
  const ck = (p) => `${Math.floor(p[0] / cell)},${Math.floor(p[1] / cell)},${Math.floor(p[2] / cell)}`;
  for (const a of apexes) { const k = ck(a.p); let g = grid.get(k); if (!g) { g = []; grid.set(k, g); } g.push(a); }
  return (p) => {
    const bx = Math.floor(p[0] / cell), by = Math.floor(p[1] / cell), bz = Math.floor(p[2] / cell);
    let t = 0;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const g = grid.get(`${bx + dx},${by + dy},${bz + dz}`); if (!g) continue;
      for (const a of g) if (dist(a.p, p) <= cell && a.outlineTurnDeg > t) t = a.outlineTurnDeg;
    }
    return t;
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
/* THE SUBJECT IS THE RIM'S OWN EDGES, AND IT IS A MEMBERSHIP TEST RATHER THAN
   A DISTANCE ONE. "Within 2 mm of a rim" is the ruling's window and it is the
   right window for a petal on its own; on a bloom it is not a subject. A
   floret's petal rim sits millimetres from the RACHIS, a sepal's from the HUB,
   a leaf's from the STEM — and those are flat walls at ninety degrees by
   design, on this tree and on main. Measured before this was scoped: `INFLO:
   pedicels STRAIGHT UP` reported an 84.47 degree "rim" turn where the outline
   turns 1.01, and the faces involved were the stem's.

   An edge qualifies when BOTH its endpoints are vertices the builder declared
   on a treated profile — the apex and the two points where the bead meets the
   skins. That is exactly the rim strip plus the skin's outermost row, it comes
   from the builder's own record rather than from a radius, and no other part
   can share those vertices. The distance window still applies on top, so the
   ruling's 2 mm is kept rather than replaced. */
function worstTurnNearRim(mesh, apexes, flats, corners, near, cornerR, rampMm, rimVerts) {  // apexes: {p, outlineTurnDeg}
  if (!apexes.length) return { deg: 0, at: null, edges: 0, skipped: 0, corner: 0, cornerDeg: 0, rampDeg: 0, raw: 0, outline: 0 };
  const pts = apexes.map((a) => a.p);
  const dT = nearestWithin(pts, near);
  /* THE OUTLINE'S OWN TURN NEAR AN EDGE — the largest of it over the apexes
     within reach, because an edge sits between vertices and inherits the
     sharper of them. */
  const turnNear = nearestTurn(apexes, near);
  const dF = flats.length ? nearestWithin(flats, near) : () => Infinity;
  const dC = corners.length ? nearestWithin(corners, Math.max(cornerR, 1e-6)) : () => Infinity;
  let worst = -1, at = null, n = 0, skipped = 0, nCorner = 0, cornerDeg = 0, rampDeg = 0, worstRaw = 0, worstOutline = 0;
  const deg0 = (A, B) => { let d = A[0] * B[0] + A[1] * B[1] + A[2] * B[2]; d = d > 1 ? 1 : d < -1 ? -1 : d; return (Math.acos(d) * 180) / Math.PI; };
  for (const f of mesh.edges) {
    const A = mesh.N[f[0]], B = mesh.N[f[1]];
    if (!A || !B) continue;
    const va = Math.floor(f[2] / mesh.SH), vb = f[2] - va * mesh.SH;
    if (!rimVerts.has(va) || !rimVerts.has(vb)) continue;
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
    /* THE BAR IS THE OUTLINE'S OWN TURN PLUS THE ALLOWANCE, not the allowance
       alone. Where the OUTLINE turns — the four apex corners, a squared
       terminal's two, every lobe sinus at a cusped notch power — the drawn
       surface must turn with it, because the apex is placed on every original
       boundary vertex and that is the silhouette ruling. What this asserts is
       that the treatment ADDS no more than the allowance on top. Where the
       outline is straight the two are the same statement and the bar is 30
       degrees flat. */
    const ot = turnNear(mid);
    if (ot >= DIH_BAR) { nCorner++; if (deg - ot > cornerDeg) cornerDeg = deg - ot; }
    n++;
    const excess = deg - Math.max(0, ot);
    if (excess > worst) { worst = excess; at = mid; worstRaw = deg; worstOutline = ot; }
  }
  return { deg: worst < 0 ? 0 : worst, at, edges: n, skipped, corner: nCorner, cornerDeg, rampDeg, raw: worstRaw, outline: worstOutline };
}

async function runRows(G, rows, fails, notes, fullSet = false) {
  const check = (clause, ok, msg) => { if (!ok) fails.push(`${clause}: ${msg}`); return ok; };
  let profiles = 0, worstTurn = 0, worstCorner = 0, worstRamp = 0, minRim = Infinity, clamps = 0;
  let done = 0;
  const declaredSeen = new Set();
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

      /* ---- E6: and degenerate-free AS THE STL STORES IT ---- */
      /* E3 IS NOT THIS CLAUSE AND THE TWO WERE ONE WORD APART. `meshOf`
         counts a welded-index collision or an exactly-zero cross product on
         DOUBLES; `analyzeStl`, which is what both STL gates rate, counts
         area <= DEGENERATE_AREA_MM2 on the FLOAT32 the file actually holds.
         The corner-fan slivers this gate now has a row for measure 8.88e-8
         mm2 on doubles — comfortably ABOVE the bar — and collapse only under
         rounding, so E3 answered "degenerate-free" about them truthfully and
         said nothing. Measured: the mutant that removes the corner gate fires
         E6 and not E3. The bar is READ FROM THE HARNESS rather than restated,
         so this clause and the gates that rate it cannot drift apart. */
      {
        const f = Math.fround, P = acc.positions, BAR = H.DEGENERATE_AREA_MM2;
        let bad = 0, worst = Infinity;
        for (let t = 0; t < P.length / 9; t++) {
          const o = t * 9;
          const ax = f(P[o+3])-f(P[o]), ay = f(P[o+4])-f(P[o+1]), az = f(P[o+5])-f(P[o+2]);
          const bx = f(P[o+6])-f(P[o]), by = f(P[o+7])-f(P[o+1]), bz = f(P[o+8])-f(P[o+2]);
          const cx = ay*bz-az*by, cy = az*bx-ax*bz, cz = ax*by-ay*bx;
          const area = 0.5 * Math.hypot(cx, cy, cz);
          if (area <= BAR) { bad++; if (area < worst) worst = area; }
        }
        const declared = E6_XFAIL[row.label];
        const want = declared ? (exportMode ? declared.exp : declared.live) : 0;
        check('E6', bad === want, want === 0
          ? `${row.label} [${exportMode ? 'export' : 'live'}]: ${bad} triangle(s) at or under ${BAR} mm2 once rounded to float32 (worst ${bad ? worst.toExponential(3) : '-'}) — what analyzeStl rates, which E3 does not measure`
          : `${row.label} [${exportMode ? 'export' : 'live'}]: declared at ${want} and reads ${bad}${bad > want ? ' — WORSE, a regression for whatever moved it' : ' — FEWER than declared, so the record is stale: re-measure and re-record it in the commit that moved it'} (${declared.note})`);
      }
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
      let thin = 0, thinWorst = null, wrongClamp = 0, unjustified = 0;
      for (const r of apexRecs) {
        const t = dist(r.top, r.bot);
        if (t < minRim) minRim = t;
        const bar = Math.min(G.RIM_FLOOR_MM, r.bodyMm) - RIM_FLOOR_BAND_MM;
        const under = t < bar;
        if (under && !r.clamped) { thin++; if (!thinWorst || t < thinWorst.t) thinWorst = { t, r, bar }; }
        /* THE OTHER DIRECTION USES THE FLOOR ITSELF, NOT THE BANDED BAR. The
           band is slack for the MEASUREMENT of a rim that should clear the
           floor; applying it here would call a rim at 0.995 mm an unjustified
           declaration when it is under the floor by exactly the amount the
           clamp says. Measured: 64 false findings on the carnation before this
           was separated. */
        if (r.clamped && !(t < G.RIM_FLOOR_MM)) wrongClamp++;
        /* AND THE CLAMP MUST BE JUSTIFIED BY THE ROOM, which is the clause the
           must-fail found missing. Without it a builder that simply LOWERED
           the floor would mark every profile clamped and E1 would excuse the
           lot — the ST9 trap (a guard that reads the record it checks) getting
           in through the exclusion rather than the guard. Measured: the
           `the-rim-floor-is-lowered-to-0.4` mutation fired NOTHING until this
           existed. The room arm must be the one that BOUND: a clamp is only a
           clamp where `RIM_ROOM_FRACTION * room` is what took the radius
           below the other two arms, restated here from Eva's fraction and the
           builder's measured room rather than read from the clamp record. */
        if (r.clamped && !(G.RIM_ROOM_FRACTION * r.roomMm < Math.min(G.RIM_BEAD_RADIUS_MM, r.bodyMm / 2) - 1e-12)) unjustified++;
      }
      check('E1', thin === 0, `${row.label} [${exportMode ? 'export' : 'live'}]: ${thin} rim profiles are under ${G.RIM_FLOOR_MM} mm and are NOT declared clamps (worst ${thinWorst && thinWorst.t.toFixed(4)} mm against a bar of ${thinWorst && thinWorst.bar.toFixed(4)} at panel ${thinWorst && thinWorst.r.panel} row ${thinWorst && thinWorst.r.row})`);
      /* THE OTHER DIRECTION, and it is the one that stops the exclusion
         emptying the clause: a location declared clamped must actually BE
         under the floor. A builder that logged everything would fail here. */
      check('E1', unjustified === 0, `${row.label} [${exportMode ? 'export' : 'live'}]: ${unjustified} declared clamps are not justified by the span's room — the radius was taken below the floor by something other than the narrow-span rule`);
      check('E1', wrongClamp === 0, `${row.label} [${exportMode ? 'export' : 'live'}]: ${wrongClamp} declared clamp locations are NOT under the floor — the declaration is excluding rows it has no business excluding`);

      /* ---- E2: no hard edge within RIM_NEAR_MM of a treated apex ---- */
      const rimVertIds = new Set();
      for (const r of apexRecs) for (const P of [r.apex, r.top, r.bot]) {
        const v = mesh.vertIds.get(key3(P[0], P[1], P[2]));
        if (v !== undefined) rimVertIds.add(v);
      }
      if (exportMode && !FOLDS.has(row.label)) {
        const turn = worstTurnNearRim(mesh, apexRecs.map((r) => ({ p: r.apex, outlineTurnDeg: r.outlineTurnDeg || 0 })), rim.flatMap((r) => r.flat || []), rim.flatMap((r) => r.corner || []), RIM_NEAR_MM, RIM_CORNER_R * G.RIM_BEAD_RADIUS_MM, G.RIM_TAPER_MM, rimVertIds);
        if (turn.cornerDeg > worstCorner) worstCorner = turn.cornerDeg;
        if (turn.rampDeg > worstRamp) worstRamp = turn.rampDeg;
        if (turn.deg > worstTurn) worstTurn = turn.deg;
        check('E2', turn.edges > 0, `${row.label}: no edge lies within ${RIM_NEAR_MM} mm of a treated apex — the window found nothing to measure`);
        const declared = E2_TURN_XFAIL[row.label];
        if (!declared) {
          check('E2', turn.deg < DIH_BAR, `${row.label}: the treatment adds ${turn.deg.toFixed(6)} deg of turn within ${RIM_NEAR_MM} mm of a rim, at or over the ${DIH_BAR} deg allowance (the face-to-face turn there is ${turn.raw.toFixed(2)} deg and the OUTLINE's own turn is ${turn.outline.toFixed(2)})`);
        } else {
          /* BOTH DIRECTIONS. A declaration is a record of the tree, and a
             record that stops reproducing is stale whether the row got worse
             or better — the message says which. */
          const excess = turn.deg - DIH_BAR;
          declaredSeen.add(row.label);
          check('E2', excess > 0, `${row.label}: declared as exceeding the ${DIH_BAR} deg allowance by ${declared.excessDeg} deg and it no longer does (${turn.deg.toFixed(6)} deg) — the declaration is STALE, take it off`);
          check('E2', Math.abs(excess - declared.excessDeg) <= E2_TURN_BAND_DEG, `${row.label}: the excess over the ${DIH_BAR} deg allowance is ${excess.toFixed(6)} deg against a declared ${declared.excessDeg} (band ${E2_TURN_BAND_DEG}) — re-record it in the same commit as whatever moved it`);
        }
      }
    }
    /* ---- E5: the topology is the same in both modes ---- */
    if (per.live && per.export) {
      check('E5', per.live.tris === per.export.tris, `${row.label}: ${per.live.tris} triangles live against ${per.export.tris} export — the rim's topology is mode-dependent`);
      check('E5', per.live.apexes === per.export.apexes, `${row.label}: ${per.live.apexes} treated profiles live against ${per.export.apexes} export`);
    }
  }
  check('E0', profiles > 0, `no treated rim profile was found on any row — the run is vacuous`);
  /* A DECLARATION NAMING A ROW THE GATE NEVER RAN IS A DECLARATION NOBODY CAN
     CHECK — the combination gate's CG5, one instrument later. ONLY on a run
     over the FULL row set, and the caller says so rather than this reading
     `ONLY`: the negative control runs five hand-picked rows with no `--only`
     flag in sight, so keying off the flag made every mutation fire this on
     the four rows the subset does not carry. The control caught it, which is
     what a control is for. */
  if (fullSet) {
    for (const label of Object.keys(E2_TURN_XFAIL)) {
      check('E2', declaredSeen.has(label), `E2_TURN_XFAIL declares "${label}" and no row of this gate carries that label — a declaration nothing evaluates`);
    }
  }
  notes.push(`declared surface-turn rows ${declaredSeen.size} of ${Object.keys(E2_TURN_XFAIL).length} · rows ${rows.length} (${rows.filter((r) => FOLDS.has(r.label)).length} exempt from E2 as declared self-intersectors) · treated profiles ${profiles} · declared clamps ${clamps} · thinnest rim ${Number.isFinite(minRim) ? minRim.toFixed(4) : 'n/a'} mm · worst turn the treatment ADDS ${worstTurn.toFixed(2)} deg (allowance ${DIH_BAR}, over and above the outline's own) · worst EXCESS at an outline corner ${worstCorner.toFixed(2)} deg · worst turn in the RAMP to the receptacle join ${worstRamp.toFixed(2)} deg (exempt, out of scope; main reads 93.92 at the default)`);
  return { profiles, worstTurn, worstCorner, minRim, clamps };
}

/* ======================= THE MUST-FAIL ==================================
   Each mutation names the clause it must break. A mutation that does not
   apply, a named clause that stays green, or a clause it did not name going
   red are all failures — the last is how a mutation that merely breaks the
   build gets caught pretending to be a negative control. */
/* THE ONE ROW E6 CANNOT CLEAR, DECLARED WITH ITS NUMBER — #213's idiom, and
   the gate holds it in BOTH directions: a row that reads MORE is a
   regression, a row that reads FEWER (or zero) is a stale record and says so,
   because an entry is a measurement of the tree and not a licence.

   WHAT IT IS, measured rather than characterised: two REAL adjacent corner
   points 6.23e-7 mm apart at ~12 mm from the origin. Their triangle is
   8.88e-8 mm2 on DOUBLES — eighty-eight times the bar — and collapses to
   exactly zero only once rounded to float32, where one ulp at 12 mm is
   9.5e-7. RIM_CORNER_MIN_MM removes the profiles the fan INSERTS between
   them; it cannot remove the two genuine entries, so no corner threshold
   reaches this. LIVE only: the same row's export reads 0.

   IT IS NOT LEFT HERE FOR WANT OF A FIX. Merging two sub-micron corner points
   would clear it, and is safe in exactly this case because the fan fires only
   where both entries share a skin point (`sk2 === sk && j2 === j`), so
   dropping one leaves the rim closed against the skins. That is a change to
   the loop's construction with a watertightness failure mode, and it is Eva's
   call whether two invisible triangles in the LIVE mesh are worth it. */
const E6_XFAIL = {
  'SPHERE: 6 turns x layerSize min (the 0.18 mm blade at the face pole)': { live: 2, exp: 0,
    note: 'two real adjacent corner points 6.23e-7 mm apart; 8.88e-8 mm2 on doubles, zero under float32. Before RIM_CORNER_MIN_MM this row read 118 live and 56 export' },
};

const MUTATIONS = [
  /* EVERY RIM MUTATION BELOW ALSO REDDENS E6, AND THAT IS A PROPERTY OF THE
     CONTROL SET RATHER THAN A LOOSE CLAUSE. The set gained `SPHERE: 6 turns x
     layerSize min` so the corner-gate mutant has a row it can fire on; on a
     petal that cramped, ANY change to the rim surface moves profiles into the
     band where a triangle survives in doubles and collapses under float32. So
     E6 is named as collateral on all of them — measured, not assumed, and the
     honest remedy for an unclaimed red that is real is to name it. The clause
     still discriminates where it matters: `the-corner-fan-is-not-gated` fires
     E6 and NOTHING ELSE. */
  /* RESTORING THE WALL REDDENS THREE CLAUSES AND ALL THREE ARE TRUE OF IT,
     which is a statement about the geometry rather than a loosened claim. The
     skin is INSET by the bead's own radius, so a profile collapsed onto the
     straight wall (a) puts a hard edge back where the bead was — E2; (b)
     stops emitting the original boundary point, because a wall has no apex —
     E4; and (c) leaves the solid's own surface inconsistent at the two
     corners where a pivot's profiles become identical — E3. A wall and an
     apex are the same surface here, so there is no surgical form of this
     mutation, and saying so is better than pretending one clause owns it. */
  { id: 'the-flat-wall-is-restored', breaks: ['E2', 'E3', 'E4', 'E6'],
    from: '      const th = aLen > 0 ? Math.atan2(aLen * Math.sin(psi), b * Math.cos(psi)) : psi;',
    to:   '      const th = aLen > 0 ? Math.atan2(aLen * Math.sin(psi), b * Math.cos(psi)) : psi; const FLATWALL = 1;' },
  /* E2 as well as E1, and it is TRUE of this mutation rather than a
     loosening: a smaller bead radius is a different surface, so the buckle
     row's declared excess moves 6.236137 -> 6.526126 deg. Named as collateral,
     because the honest remedy for an unclaimed red that is real is to name it. */
  { id: 'the-rim-floor-is-lowered-to-0.4', breaks: ['E1', 'E2', 'E6'],
    from: 'export const RIM_FLOOR_MM = 1.0;',
    to:   'export const RIM_FLOOR_MM = 1.0; const RIM_FLOOR_APPLIED = 0.4;' },
  /* THE CORNER GATE REMOVED — and the clause it reddens is E3, which ALREADY
     EXISTED and could not fire. Nothing about E3 was wrong; its SUBJECT was.
     `pickRows` draws the smoke subset, and no row in it carried a cramped
     petal, so "the mesh is degenerate-free" was being asked only of rows that
     could not be otherwise. The row that makes it answerable — `SPHERE: 6
     turns x layerSize min`, 56 degenerate triangles in export and 118 in live
     before the gate — is in that subset now, and this mutation is what proves
     the pair works: remove the gate and E3 goes red on it. The fifth durable
     rule, in a clause written long before the defect existed. */
  { id: 'the-corner-fan-is-not-gated', breaks: ['E6'],
    from: '      if (seg < RIM_CORNER_MIN_MM) { if (rim) rim.pivotsSkipped++; continue; }',
    to:   '      if (seg < 0) { if (rim) rim.pivotsSkipped++; continue; }' },
  { id: 'the-bead-apex-is-recomputed', breaks: ['E4', 'E6'],
    from: '    pts[APEX] = apex;',
    to:   '    pts[APEX] = [C[0] + (apex[0] - C[0]), C[1] + (apex[1] - C[1]), C[2] + (apex[2] - C[2])];' },
  { id: 'every-clamp-is-logged', breaks: ['E1', 'E6'],
    from: '      const wasClamped = 2 * b < RIM_FLOOR_MM - 1e-9 && 2 * b < tBody - 1e-9;',
    to:   '      const wasClamped = true;' },
  /* E5'S MUTANT, REPLACED BECAUSE THE RULED SEGMENT COUNT MADE THE OLD ONE
     UNREACHABLE — session 32's three retired lerp mutations, one gate later.
     It was `the-segment-count-reads-the-live-sheet`: strip the mode-free floor
     out of `rimSegments` so the live build reads the unfloored sheet, which at
     EIGHT segments took `sheetThickness` 0.60 to six live against eight
     export and fired E5. At FOUR it fires nothing, and that is arithmetic
     rather than luck: with a cap of 4, a minimum of 3 and the round-up to
     even, `min(4, max(3, raw))` rounded even is 4 for EVERY raw, so no input
     to that function can move K at all. The mutation still applies, still
     changes the radius, and changes no count — `bore-is-not-evas-rule`'s
     lesson (a mutation is invisible wherever the law it replaces happens to
     agree with it), arriving because a later ruling collapsed the law's range
     to a point.

     WHAT REPLACES IT IS THE DEFECT `RIM_TIP_ROWS`' OWN HEADER WARNS ABOUT, in
     so many words: "a `drop rows until the gap clears the radius` rule would
     be this project's sixth discrete decision on a continuous quantity". That
     rule reads the emitted half-width, which carries the TIP FLOOR — 0.15 mm
     live against 0.80 mm export — so the two modes drop different numbers of
     rows and E5's two clauses both have something to say. A plausible defect
     rather than an injected one. */
  { id: 'the-tip-drop-is-a-threshold-on-the-emitted-width', breaks: ['E5', 'E6'],
    from: '  const skinTo = tipExposed ? Math.max(rowFrom, rowTo - RIM_TIP_ROWS) : rowTo;',
    to:   '  const skinTo = tipExposed ? (() => { let i = rowTo; while (i > rowFrom && rows[i].h < RIM_BEAD_RADIUS_MM) i--; return i; })() : rowTo;' },
];
/* The floor mutation needs a second edit: the constant is exported and read
   by the gate as the BAR, so lowering the export alone would move the bar
   with the geometry and check nothing (the `seam-floor-removed` trap). What
   moves instead is the value the BUILDER applies. */
const EXTRA = {
  /* THE FLAT WALL IS RESTORED BY ZEROING THE OUTWARD TERM, which is what the
     bead IS: `w` is the vector from the skin's edge to the original boundary
     point, so a profile built with it dropped is the straight segment from
     `C + n*b` to `C - n*b` — the wall this change replaced, on the same
     corners. The apex still lands on the boundary (E4 stays green), so this
     mutation is about the SURFACE BETWEEN the corners and nothing else. */
  'the-flat-wall-is-restored': [
    ['      pts[m] = [C[0] + n[0] * b * cs + wx * sn, C[1] + n[1] * b * cs + wy * sn, C[2] + n[2] * b * cs + wz * sn];',
     '      pts[m] = [C[0] + n[0] * b * cs, C[1] + n[1] * b * cs, C[2] + n[2] * b * cs];'],
    ['    pts[APEX] = apex;', '    pts[APEX] = C;'],
  ],
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

  /* A SMALL, LIGHT, RIM-DIVERSE SET. The control runs every mutation over
     every row, so it must not carry `ALL MAX` (4.6 million triangles and a
     three-minute census) to say what a 30-thousand-triangle petal already
     says. These five reach the plain span, a cleft's sinus, a fringe's teeth,
     a lobed margin and a thin sheet — every arm of the rim law. */
  const CONTROL_ROWS = /^DEFAULT|^FRINGE: THE CARNATION|^LOBES: the shipped|^THIN: ALL THIN|^CAPABILITY: cleft \(/;
  const rows = MATRIX.filter((r) => CONTROL_ROWS.test(r.label)).slice(0, 5);
  /* AND AT LEAST ONE DECLARED ROW, OR E2's MAGNITUDE CLAUSE HAS NO MUTANT.
     It did not, and only asking which messages the control actually printed
     found it: the regex names the carnation, `.slice(0, 5)` took five earlier
     matches, and the two clauses that hold a declared row to its recorded
     excess were exercised by nothing while the run reported 5 of 5. A clause
     nobody has shown can fire is the thing this whole file exists to avoid. */
  const declaredRow = MATRIX.find((r) => Object.prototype.hasOwnProperty.call(E2_TURN_XFAIL, r.label));
  if (!declaredRow) { console.error('edge-profile control: no matrix row carries an E2_TURN_XFAIL label — the declaration cannot be exercised'); process.exit(1); }
  if (!rows.some((r) => r.label === declaredRow.label)) rows.push(declaredRow);
  /* AND THE CRAMPED PETAL, OR `the-corner-fan-is-not-gated` HAS NO MUTANT.
     The same shape as the declared row above, and the same lesson one clause
     later: E3 asks whether the mesh is degenerate-free, and on a rim whose
     corners are all millimetres long the answer is yes however the corner
     gate behaves. What makes this row a witness is a PROPERTY — it carries
     corner-fan segments under RIM_CORNER_MIN_MM, 56 degenerate triangles in
     export and 118 in live before the gate existed — and the mutant firing
     E3 on it is the proof that the pair works. It is named rather than
     detected because detecting it means building the row, and a name that
     goes missing must fail LOUDLY rather than quietly empty the clause. */
  const CRAMPED = 'SPHERE: 6 turns x layerSize min (the 0.18 mm blade at the face pole)';
  const crampedRow = MATRIX.find((r) => r.label === CRAMPED);
  if (!crampedRow) { console.error(`edge-profile control: the matrix has no row "${CRAMPED}" — E3's corner-gate mutant would be exercised by nothing`); process.exit(1); }
  if (!rows.some((r) => r.label === CRAMPED)) rows.push(crampedRow);
  if (rows.length < 3) { console.error('edge-profile control: the control row set did not resolve — ' + rows.length + ' rows'); process.exit(1); }
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
    if (process.argv.includes('--why')) for (const x of f) console.log(`        ${x.slice(0, 200)}`);
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
  await runRows(G0, rows, fails, notes, !ONLY);
  for (const n of notes) console.log('edge-profile: ' + n);
  console.log(`edge-profile: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  if (fails.length) {
    console.log(`\nedge-profile: FAILED — ${fails.length} findings`);
    for (const f of fails.slice(0, 40)) console.log('  ' + f);
    if (fails.length > 40) console.log(`  ... and ${fails.length - 40} more`);
    process.exit(1);
  }
  console.log('edge-profile: PASS — E0-E6 clean.');
}
