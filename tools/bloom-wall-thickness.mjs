/* ===================================================================
   bloom-wall-thickness.mjs — HOW THICK IS THE SHEET, ACTUALLY? (session 33)

   THE GAP THIS FILLS. Nothing in this project has ever measured the emitted
   wall. The roll curvature floor (`ROLL_MIN_RADIUS_FACTOR`) is a CURVATURE
   argument — "a shell's inner offset inverts under half a thickness of
   radius" — and it has never been checked against the mesh that comes out.
   `thicknessProfile` reports the thickness a row was BUILT AT; that is the
   number handed to the offset, not the distance between the two skins that
   were offset. Those are the same only while the mid-surface is gentle.

   Margin buckling is the first deformation whose whole point is that the
   mid-surface is NOT gentle along u, and part 2 has to set its ranges
   against something. This is that something. It is the INPUT to a ruling,
   which is why it is built before the controls rather than after them.

   WHAT IT MEASURES. From the builder's own captured grid (`captureGrid`), the
   two skins are reconstructed as `mid +/- n * t/2` using the normal the
   builder EMITTED — never a normal recomputed here, which would make the
   instrument agree with itself by construction. Then, for every vertex of the
   top skin, the distance to the bottom skin's triangles, split in two:

     WALL   the nearest bottom triangle within `near` cells in both the row
            and column directions — the wall UNDER this point.
     SELF   the nearest bottom triangle OUTSIDE that neighbourhood — the sheet
            approaching ANOTHER PART OF ITSELF.

   Conflating those two reports a fold as a thinning; the discovery pass did
   exactly that for an afternoon before the split existed.

   WHAT IT DOES NOT COVER, in its own header rather than in a doc:
     - IT IS A MESH MEASUREMENT, NOT A SURFACE ONE. Vertex-to-facet on a
       curved sheet under-reads by the facets' own sagitta. Refining separates
       the two: shipped roll 330 reads 0.587 mm at 28 x 10, 0.697 at the
       shipped 56 x 10 and 1.177 at 168 x 60 — the roll floor is doing its job
       and the deficit is the mesh. Do not quote a single-resolution number as
       "the wall" without saying which grid it came from.
     - IT SAYS NOTHING ABOUT WHETHER THE SHAPE IS RIGHT. Both STL gates own
       watertightness and connectedness; neither can see a self-intersection
       (Q6), and neither can see this.
     - THE STATES BELOW ARE HAND-PICKED CORNERS, NOT THE MATRIX.
     - It reads ONE petal — the one grid `buildBloomInto` retains per
       descriptor — so it says nothing about petal-to-petal clearance.

   THE FIVE ASSERTIONS ABORT THE RUN. A self-check that reports instead of
   failing is not a self-check — and a MEASUREMENT that reports instead of
   failing becomes folklore within two sessions, which is why V5 exists:
     V1 CALIBRATION — a flat build must read the declared thickness to within
        `CALIBRATION_EPS`. Zero curvature means zero faceting error, so a
        deviation above the arithmetic's own noise means the instrument is
        wrong and nothing else it prints is usable.
     V2 REACHABILITY — the buckled branch must be reachable AND must move the
        wall. A guarded branch that is dead satisfies every byte claim
        perfectly and means nothing; this is the vacuity guard.
     V3 THE GUARD — a build carrying the buckle keys at zero must be FLOAT-
        IDENTICAL (Object.is, so -0 is distinguished) to one where the keys
        are absent entirely.
     V4 THE NORMAL — the BUCKLE'S OWN contribution to the deficit, each state
        against the same state with the buckle removed, must sit within
        `WALL_TOLERANCE` on every state the grid can RESOLVE. This is session
        31's actual claim: the skins are offset along the SURFACE normal
        rather than the cross-section's. `--negative-control` reverts that one
        line and requires this to fire. States below `ROWS_PER_CYCLE_MIN` rows
        per cycle are reported, not asserted — a deficit there is the row
        count, and this session ships no control that can reach one.

     V5 SELF-APPROACH — no state may bring the sheet within `MIN_FEATURE_MM`
        of another part of itself, except the pre-existing failures declared
        individually in `SELF_XFAIL` and measured on `main` at 2a97e96. Those
        MUST fail; one that starts passing is a loud failure, not a bonus.

   RUN:  node tools/bloom-wall-thickness.mjs [--controls]
         node tools/bloom-wall-thickness.mjs --negative-control
   =================================================================== */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const IS_MAIN = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

/* V1's bar. A flat sheet has no curvature, so it has no facet sagitta and no
   wedging: the two skins are exactly `thickness` apart and the measurement
   must say so. This is the ARITHMETIC's own floor, not a tolerance for
   geometry — the run reads 4.7e-15 mm off, which is the point-to-triangle
   distance's rounding and nothing else. Anything a real defect could produce
   is many orders above it. */
export const CALIBRATION_EPS = 1e-12;

/* V4's bar, and it is on the BUCKLE'S OWN CONTRIBUTION — each buckled state
   against the same state with the buckle removed, never against the flat
   build. Without that per-state control the assertion reads cup's and curl's
   deficits as the buckle's: `buckle over cup 1.2 + curl 180` measures 0.709
   mm low, of which the buckle owns 0.00X. Same defect as measuring a wall and
   a self-approach in one number.
   The value is set from the run's own separation rather than from taste: with
   the surface normal the strongest resolvable state contributes 0.048 mm, and
   `--negative-control`'s `cross-section-normal` mutant is what proves the bar
   sits below where that line lands when session 33 is undone. */
export const WALL_TOLERANCE = 0.12;

/* V4 applies only where the grid can REPRESENT the wave. Below this many rows
   per cycle the emitted polyline is not the law's curve, so a deficit there is
   the row count and asserting against it would be measuring the mesh. Those
   states are REPORTED, with the reason, rather than folded into a tolerance
   wide enough to admit them — that is how a bar stops meaning anything. */
export const ROWS_PER_CYCLE_MIN = 8;

/* ---------------------------------------------------------------- geometry */

/* Point-to-triangle distance (Ericson's region test). Exact, no tolerance. */
function ptTri(p, a, b, c) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const d1 = ab[0] * ap[0] + ab[1] * ap[1] + ab[2] * ap[2];
  const d2 = ac[0] * ap[0] + ac[1] * ap[1] + ac[2] * ap[2];
  if (d1 <= 0 && d2 <= 0) return Math.hypot(ap[0], ap[1], ap[2]);
  const bp = [p[0] - b[0], p[1] - b[1], p[2] - b[2]];
  const d3 = ab[0] * bp[0] + ab[1] * bp[1] + ab[2] * bp[2];
  const d4 = ac[0] * bp[0] + ac[1] * bp[1] + ac[2] * bp[2];
  if (d3 >= 0 && d4 <= d3) return Math.hypot(bp[0], bp[1], bp[2]);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const t = d1 / (d1 - d3);
    return Math.hypot(p[0] - (a[0] + ab[0] * t), p[1] - (a[1] + ab[1] * t), p[2] - (a[2] + ab[2] * t));
  }
  const cp = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
  const d5 = ab[0] * cp[0] + ab[1] * cp[1] + ab[2] * cp[2];
  const d6 = ac[0] * cp[0] + ac[1] * cp[1] + ac[2] * cp[2];
  if (d6 >= 0 && d5 <= d6) return Math.hypot(cp[0], cp[1], cp[2]);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const t = d2 / (d2 - d6);
    return Math.hypot(p[0] - (a[0] + ac[0] * t), p[1] - (a[1] + ac[1] * t), p[2] - (a[2] + ac[2] * t));
  }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const t = (d4 - d3) / ((d4 - d3) + (d5 - d6));
    return Math.hypot(p[0] - (b[0] + (c[0] - b[0]) * t), p[1] - (b[1] + (c[1] - b[1]) * t), p[2] - (b[2] + (c[2] - b[2]) * t));
  }
  const den = 1 / (va + vb + vc), v1 = vb * den, w1 = vc * den;
  return Math.hypot(p[0] - (a[0] + ab[0] * v1 + ac[0] * w1),
                    p[1] - (a[1] + ab[1] * v1 + ac[1] * w1),
                    p[2] - (a[2] + ab[2] * v1 + ac[2] * w1));
}

/* THE MEASUREMENT. `grid` is buildPetalInto's captured panels; `footRows` is
   how many rows at the head of each panel are the FOOT, which is flat and not
   under test. Returns the two numbers and where each was found. */
export function measureWall(grid, { footRows = 3, near = 2 } = {}) {
  const rows = grid.flatMap((pan) => pan.rows).filter((r) => r.row >= footRows);
  if (rows.length < 2) throw new Error('measureWall: fewer than two blade rows captured — nothing to measure');
  const NVc = rows[0].v.length;
  const skin = (sign) => rows.map((r) => r.mid.map((P, j) => [
    P[0] + sign * r.normal[j][0] * r.thickness / 2,
    P[1] + sign * r.normal[j][1] * r.thickness / 2,
    P[2] + sign * r.normal[j][2] * r.thickness / 2]));
  const T = skin(+1), B = skin(-1);
  /* Bottom-skin triangles TAGGED with the cell they came from, which is what
     lets "the wall under this point" and "another part of this sheet" be told
     apart at all. */
  const tris = [];
  for (let i = 0; i < B.length - 1; i++) {
    for (let j = 0; j < NVc - 1; j++) {
      tris.push([B[i][j], B[i][j + 1], B[i + 1][j + 1], i, j]);
      tris.push([B[i][j], B[i + 1][j + 1], B[i + 1][j], i, j]);
    }
  }
  let wall = Infinity, wallAt = null, self = Infinity, selfAt = null;
  for (let i = 0; i < T.length; i++) {
    for (let j = 0; j < NVc; j++) {
      let dn = Infinity, df = Infinity;
      for (const tr of tris) {
        const d = ptTri(T[i][j], tr[0], tr[1], tr[2]);
        if (Math.abs(tr[3] - i) <= near && Math.abs(tr[4] - j) <= near) { if (d < dn) dn = d; }
        else if (d < df) df = d;
      }
      if (dn < wall) { wall = dn; wallAt = [rows[i].u, rows[i].v[j]]; }
      if (df < self) { self = df; selfAt = [rows[i].u, rows[i].v[j]]; }
    }
  }
  return { wall, wallAt, self, selfAt, declared: rows[0].thickness, rows: rows.length, columns: NVc };
}

/* ------------------------------------------------------------ curvature */

/* PRINCIPAL CURVATURE OF THE EMITTED MID-SURFACE (session 34).

   WHY THIS AND NOT THE CLOSED FORM. The clamp bounds `A*h*(2 pi f / L)^2` —
   the curvature of ONE term in ONE direction. Two things it cannot see, both
   measured rather than argued:
     - the ACROSS-WIDTH curvature, where the falloff exponent acts. At the
       margin the |v|^p envelope is exactly 1 whatever p is, so p is invisible
       to the along-margin bound, while `d2w/da2` there is `A*p*(p-1)/h` —
       2, 6 and 30 at p = 2, 3 and 6.
     - curvature the cup, the roll and the spine have ALREADY SPENT. A
       displacement field composes with the surface it is added to; the bound
       is evaluated on the field alone.
   So the quantity that could be sufficient is the largest principal curvature
   of the surface that actually came out, and this measures it.

   HOW. At each interior grid point, the neighbours within `half` cells are
   expressed in a local frame built on the EMITTED normal, and a quadratic
   `n = a t1^2 + b t1 t2 + c t2^2` is least-squares fitted. The shape
   operator's eigenvalues are the principal curvatures; the reported number is
   the largest absolute one, as a RADIUS so it compares directly against the
   roll floor. Reading the emitted normal rather than recomputing one is the
   same discipline the wall measurement follows.

   WHAT IT DOES NOT COVER: it is a discrete estimate on a 56 x 10 grid, so it
   under-resolves exactly where the mesh does; the tip cap and the foot are
   excluded because their rows are a different surface. Compare readings at
   one grid, never across grids. */
export function measureCurvature(grid, { footRows = 3, half = 2, uMin = 0.15, uMax = 0.92 } = {}) {
  const rows = grid.flatMap((pan) => pan.rows).filter((r) => r.row >= footRows && r.u >= uMin && r.u <= uMax);
  if (rows.length < 2 * half + 1) return { kMax: 0, radiusMm: Infinity, at: null };
  const NVc = rows[0].v.length;
  let kMax = 0, at = null;
  for (let i = half; i < rows.length - half; i++) {
    for (let j = half; j < NVc - half; j++) {
      const P = rows[i].mid[j], N = rows[i].normal[j];
      /* A tangent frame on the emitted normal. Any t1 perpendicular to N will
         do — the eigenvalues do not depend on which. */
      const seed = Math.abs(N[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
      let t1 = [seed[1] * N[2] - seed[2] * N[1], seed[2] * N[0] - seed[0] * N[2], seed[0] * N[1] - seed[1] * N[0]];
      const L1 = Math.hypot(...t1); if (!(L1 > 1e-12)) continue;
      t1 = t1.map((x) => x / L1);
      const t2 = [N[1] * t1[2] - N[2] * t1[1], N[2] * t1[0] - N[0] * t1[2], N[0] * t1[1] - N[1] * t1[0]];
      /* Normal equations for the three quadratic coefficients. */
      const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], rhs = [0, 0, 0];
      let n = 0;
      for (let di = -half; di <= half; di++) {
        for (let dj = -half; dj <= half; dj++) {
          if (di === 0 && dj === 0) continue;
          const Q = rows[i + di].mid[j + dj];
          const d = [Q[0] - P[0], Q[1] - P[1], Q[2] - P[2]];
          const x = d[0] * t1[0] + d[1] * t1[1] + d[2] * t1[2];
          const y = d[0] * t2[0] + d[1] * t2[1] + d[2] * t2[2];
          const z = d[0] * N[0] + d[1] * N[1] + d[2] * N[2];
          const b = [x * x, x * y, y * y];
          for (let a = 0; a < 3; a++) { for (let c = 0; c < 3; c++) M[a][c] += b[a] * b[c]; rhs[a] += b[a] * z; }
          n++;
        }
      }
      if (n < 5) continue;
      /* 3x3 solve by Cramer; a singular neighbourhood is skipped rather than
         reported as flat, which would be a passing number for a failed fit. */
      const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
                       - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
                       + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
      const D = det(M);
      if (!(Math.abs(D) > 1e-18)) continue;
      const sub = (k) => det(M.map((r2, a) => r2.map((v2, c) => (c === k ? rhs[a] : v2))));
      const A2 = sub(0) / D, B2 = sub(1) / D, C2 = sub(2) / D;
      /* Shape operator [[2A, B],[B, 2C]] — eigenvalues in closed form. */
      const tr = 2 * A2 + 2 * C2, dt = 4 * A2 * C2 - B2 * B2;
      const disc = Math.max(0, (tr * tr) / 4 - dt);
      const k1 = tr / 2 + Math.sqrt(disc), k2 = tr / 2 - Math.sqrt(disc);
      const k = Math.max(Math.abs(k1), Math.abs(k2));
      if (k > kMax) { kMax = k; at = [rows[i].u, rows[i].v[j]]; }
    }
  }
  return { kMax, radiusMm: kMax > 0 ? 1 / kMax : Infinity, at };
}

/* V5's BAR AND ITS PRE-EXISTING FAILURES (session 34, Eva's ruling).

   THE BAR IS `MIN_FEATURE_MM`, THE MINIMUM PRINTABLE GAP. SELF is a distance
   between two parts of one sheet; below the minimum feature the slicer fuses
   them or the gap never forms. It is the project's own constant applied to a
   GAP rather than to a wall, and it is imported, never restated.

   WHAT THE INSTRUMENT CANNOT RESOLVE, said here rather than discovered later:
   a FLAT build reads SELF ~1.25 mm, because the nearest bottom triangle
   outside the +/-2-cell neighbourhood is already about a thickness away. So
   the bar sits 0.25 mm under the flat floor and the measurement is coarse in
   between. `cup-max` passes at 1.031 — 3% of headroom, and worth watching.

   THE xfail LIST IS MEASURED ON `main` AT 2a97e96, NOT ON THIS BRANCH (Eva's
   ruling), so it is provably pre-existing rather than accidentally inclusive
   of something this session introduced. Named INDIVIDUALLY — never a range,
   never a wildcard — so a new self-approach reddens immediately while these
   do not, and so a later fix TRIPS the gate rather than passing silently.
   Measured 2026-09-08, `main` first then this branch:
       roll-max          0.564 -> 0.659
       form-max          0.037 -> 0.010
       buckle-on-form    0.583 -> 0.299
   No state that passes on `main` fails here, which is the claim that makes
   this list honest rather than convenient. */
export const SELF_XFAIL = Object.freeze({
  'roll-max': 'petalRoll 330 folds the blade into a near-closed quill: 0.564 mm on main at 2a97e96, 0.659 here. Pre-existing, recorded as found-in-passing by session 33, its own session.',
  'form-max': 'every form control at maximum: 0.037 mm on main at 2a97e96, 0.010 here, DIVERGING under refinement — a genuine near-self-contact on a reachable shipped state. Pre-existing, session 33 found it, its own session.',
  'buckle-on-form': 'the composition — a buckle over cup 1.2 and curl 180: 0.583 mm on main at 2a97e96 (where the field exists with no controls), 0.299 here. This is the row that established self-approach as the hazard; it fails on main WITHOUT this session\'s controls, so it is pre-existing too.',
});

/* ------------------------------------------------------------------ states */

/* Hand-picked corners, each with what it is here to say. `holds` predeclares
   whether the wall must come back at declared (a flat sheet has no curvature
   to lose anything to); `buckled` marks the rows the reachability assertion
   reads. Shipped form controls are carried as CONTROLS — a buckle number with
   nothing beside it is not a measurement, and these are what say whether a
   given deficit is new or is the mesh resolution the project already ships. */
export const STATES = [
  { id: 'flat',            label: 'flat — the shipping default',  set: {}, holds: true },
  { id: 'cup-max',         label: 'SHIPPED cup 1.2',              set: { petalCup: 1.2 } },
  { id: 'roll-max',        label: 'SHIPPED roll 330',             set: { petalRoll: 330 } },
  { id: 'twist-max',       label: 'SHIPPED twist 180',            set: { petalTwist: 180 } },
  { id: 'form-max',        label: 'SHIPPED all form at maximum',
    set: { petalCup: 1.2, petalRoll: 330, petalTwist: 180, petalSpineCurl: 360, petalCupGradient: 1.2 } },
  { id: 'buckle-gentle',   label: 'buckle A=0.10 x half-width · f=2', set: { buckleAmp: 0.10, buckleFreq: 2 }, buckled: true },
  { id: 'buckle-mid',      label: 'buckle A=0.20 x half-width · f=3', set: { buckleAmp: 0.20, buckleFreq: 3 }, buckled: true },
  { id: 'buckle-strong',   label: 'buckle A=0.30 x half-width · f=3', set: { buckleAmp: 0.30, buckleFreq: 3 }, buckled: true },
  { id: 'buckle-env2',     label: 'buckle A=0.30 · f=3 · p=2',        set: { buckleAmp: 0.30, buckleFreq: 3, buckleEnv: 2 }, buckled: true },
  { id: 'buckle-env6',     label: 'buckle A=0.30 · f=3 · p=6',        set: { buckleAmp: 0.30, buckleFreq: 3, buckleEnv: 6 }, buckled: true },
  { id: 'buckle-f7',       label: 'buckle A=0.20 · f=7 (the frequency ceiling)', set: { buckleAmp: 0.20, buckleFreq: 7 }, buckled: true },
    /* ASSERTED SINCE SESSION 34, and the marker coming off is the point. At
       NU = 28 this row sat at 4.0 rows per cycle, was `report`ed with that as
       its stated reason, and predicted it would recover under refinement. NU
       is 56 now: 8.0 rows per cycle, own contribution 0.030 mm against a 0.12
       bar. The prediction was the reason for the marker, the prediction came
       true, so the marker is gone rather than left as decoration. */
  { id: 'buckle-on-form',  label: 'buckle A=0.20 f=3 over cup 1.2 + curl 180',
    set: { buckleAmp: 0.20, buckleFreq: 3, petalCup: 1.2, petalSpineCurl: 180 }, buckled: true,
    /* XFAIL, WITH ITS OWN MEASUREMENT — this one does NOT recover. Refined
       28x10 -> 84x30 the wall goes 0.491 -> 0.333 mm and the buckle's own
       contribution GROWS 0.438 -> 0.635 mm. Divergence under refinement is
       the signature of real geometry, not of faceting (the same signature
       shipped all-form-max already shows: 0.282 -> 0.014 in discovery).
       WHAT IT MEANS: the buckle COMPOSES with the curvature cup and curl have
       already spent, and the composition reaches inversion where neither does
       alone. Part 2's clamp cannot be a function of A, f, L and t only —
       the closed-form `A*f^2 <= L^2/(4*pi^2*t)` bound derived in discovery is
       necessary and NOT sufficient. That is this row's job: to be the number
       that argument gets made in front of.
       IT IS AN XFAIL, NOT A WIDER BAR. The run FAILS HARD if it starts
       passing — that is the clamp landing, and the marker must come off in
       the same commit. */
    xfail: 'composition: SELF-APPROACH, not curvature — own contribution 0.602 mm at the shipped 56x10 '
         + '(0.438 at 28x10, predicted 0.635 at 84x30, so the row count confirmed the prediction). '
         + 'Measured session 34: the composed principal curvature is LOWER than the base alone '
         + '(1.0625 against 1.1149 /mm) while the wall collapses and SELF ~ WALL, so no curvature '
         + 'bound can catch it. Neither ingredient alone does it: cup+buckle reads 1.052, curl+buckle 1.182.' },
];

/* ------------------------------------------------------------------- driver */

async function loadGeometry(root) {
  return import(pathToFileURL(path.join(root, 'bloom-geometry.js')).href);
}

/* Every buckled state is measured TWICE — as written, and with the buckle
   keys stripped. The second is that state's OWN control, and the difference
   between them is the only quantity in this file that is the buckle's. */
const withoutBuckle = (set) => {
  const o = { ...set };
  delete o.buckleAmp; delete o.buckleFreq; delete o.buckleEnv; delete o.bucklePhase;
  return o;
};

async function run({ root = ROOT, defaults = null, label = 'head' } = {}) {
  const G = await loadGeometry(root);
  const D = defaults || (await import(pathToFileURL(path.join(root, 'bloom-registry.js')).href)).DEFAULTS;
  const one = (set) => {
    const acc = new G.MeshBuilder({ exportMode: true, captureGrid: true });
    const m = G.buildBloomInto(acc, { ...D, ...set });
    return { ...measureWall(m.petal.grid), tris: acc.positions.length / 9, positions: acc.positions };
  };
  const out = [];
  for (const st of STATES) {
    const got = one(st.set);
    const control = st.buckled ? one(withoutBuckle(st.set)) : null;
    /* How many rows the grid gives this state per cycle of its own wave —
       derived from the emitted row count, never from a constant restated. */
    const rpc = st.set.buckleFreq ? got.rows / st.set.buckleFreq : Infinity;
    out.push({ ...st, ...got, control, rowsPerCycle: rpc, resolved: rpc >= ROWS_PER_CYCLE_MIN,
               ownDeficit: control ? control.wall - got.wall : null });
  }
  return { G, D, rows: out, label };
}

/* V3's own comparison: the buckle keys present at zero against the keys
   absent. Object.is so a signed zero is a difference, which it is in the
   exported float32. */
function floatDiff(a, b) {
  if (a.length !== b.length) return { differ: -1, len: -1 };
  let differ = 0;
  for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) differ++;
  return { differ, len: a.length };
}

export async function verify({ root = ROOT, quiet = false } = {}) {
  const fails = [];
  const say = (...a) => { if (!quiet) console.log(...a); };
  const { G, D, rows } = await run({ root });

  say('bloom wall thickness — the distance between the two emitted skins.\n');
  say('  ' + 'state'.padEnd(42) + 'WALL'.padStart(8) + 'SELF'.padStart(8) + "  buckle's own".padStart(14) + '  rows/cyc  worst at (u, v)');
  for (const r of rows) {
    say('  ' + r.label.padEnd(42) + r.wall.toFixed(3).padStart(8)
      + (isFinite(r.self) ? r.self.toFixed(3) : 'none').padStart(8)
      + (r.ownDeficit === null ? '—' : r.ownDeficit.toFixed(3) + (r.xfail ? ' x' : r.report ? ' *' : '')).padStart(14)
      + (isFinite(r.rowsPerCycle) ? r.rowsPerCycle.toFixed(1) : '—').padStart(10)
      + `  (${r.wallAt[0].toFixed(2)}, ${r.wallAt[1].toFixed(2)})`);
  }
  const grid = `${rows[0].rows} blade rows x ${rows[0].columns} columns`;
  say(`\n  declared sheet ${rows[0].declared.toFixed(3)} mm · grid ${grid}`);
  say("  \"buckle's own\" is this state against the SAME state with the buckle removed — the only");
  say('  column here that is the buckle\'s. WALL on a shipped form row is mostly the mesh: a');
  say('  vertex-to-facet measurement under-reads by the facets\' sagitta, and roll 330 recovers from');
  say('  0.587 to 1.177 mm under refinement (discovery). SELF on a flat build reads ~1.25 mm — that');
  say('  is the neighbourhood exclusion, not an approach. (*) reported with a stated reason; (x) tracked xfail.');

  /* V1 CALIBRATION */
  const flat = rows.find((r) => r.id === 'flat');
  const off = Math.abs(flat.wall - flat.declared);
  if (!(off <= CALIBRATION_EPS)) {
    fails.push(`V1 calibration: the flat build reads ${flat.wall} against a declared ${flat.declared} (off by ${off.toExponential(2)}) — zero curvature must read declared to within ${CALIBRATION_EPS}, so the instrument is wrong and nothing above is usable`);
  } else {
    say(`\n  V1 calibration: the flat build reads declared to ${off.toExponential(1)} mm.`);
  }

  /* V2 REACHABILITY — the vacuity guard */
  const buckled = rows.filter((r) => r.buckled);
  if (!buckled.length) fails.push('V2 reachability: no buckled state in STATES — the run would be vacuous');
  for (const r of buckled) {
    if (r.control && r.wall === r.control.wall && r.self === r.control.self) {
      fails.push(`V2 reachability: "${r.label}" measures identically to itself with the buckle removed — the buckled branch is not reached, and every byte claim about it would be vacuous`);
    }
  }
  if (buckled.length && !fails.some((f) => f.startsWith('V2'))) say(`  V2 reachability: all ${buckled.length} buckled states differ from their own buckle-free control.`);

  /* V3 THE GUARD */
  {
    /* V3 IS TWO CLAUSES, AND THE SECOND ONE EXISTS BECAUSE THE FIRST IS BLIND
       TO A WHOLE CLASS OF GUARD DEFECT — found by the negative control, twice.

       WHAT CHANGED WHEN THE CONTROLS SHIPPED (session 34): until then the keys
       were undeclared, so "present at zero" versus "absent" was a real
       distinction. With registry rows, DEFAULTS always supplies them and that
       comparison is VACUOUS. Re-pointed at the GATED claim — frequency and
       falloff at their EXTREMES with amplitude 0 must be float-identical to
       the default — which has content.

       AND THAT IS STILL NOT ENOUGH. A guard that engages the field at
       amplitude 0 moves the default AND the gated state EQUALLY, so a
       same-tree comparison cannot see it; the mutant `guard-needs-both-zero`
       sailed through. That is /print's own recorded lesson (a check comparing
       two states is blind to a mutation that breaks both) arriving here. So
       the PREDICATE is asserted directly, as a BICONDITIONAL over a spread of
       frequencies and falloffs: flat at amplitude 0, not flat above it. Two
       statements, the same shape the per-petal guard PP7 uses. */
    const FS = [1, 3, 7], ES = [2, 3, 6];
    for (const f of FS) {
      for (const e of ES) {
        if (!G.buckleIsFlat({ ...D, buckleAmp: 0, buckleFreq: f, buckleEnv: e })) {
          fails.push(`V3 guard: buckleIsFlat is FALSE at amplitude 0 with frequency ${f} and reach ${e} — the field engages where it must be inert, and the shipping default is no longer byte-identical to the pre-buckle tree`);
        }
        if (G.buckleIsFlat({ ...D, buckleAmp: 0.3, buckleFreq: f, buckleEnv: e })) {
          fails.push(`V3 guard: buckleIsFlat is TRUE at amplitude 0.3 with frequency ${f} and reach ${e} — the field is guarded off where it must build`);
        }
      }
    }
    const a = new G.MeshBuilder({ exportMode: true });
    G.buildBloomInto(a, { ...D });
    const b = new G.MeshBuilder({ exportMode: true });
    G.buildBloomInto(b, { ...D, buckleAmp: 0, buckleFreq: 7, buckleEnv: 6 });
    const d = floatDiff(a.positions, b.positions);
    if (d.differ !== 0) fails.push(`V3 guard: ${d.differ} of ${d.len} floats move with frequency and reach at their extremes and amplitude 0 — hidden but not inert`);
    else if (!fails.some((x) => x.startsWith('V3'))) say(`  V3 guard: the predicate is flat at amplitude 0 and live above it across ${FS.length * ES.length} (frequency, reach) pairs, and 0 of ${d.len.toLocaleString('en-US')} floats move at frequency 7 / reach 6.`);
    /* The comparison's own positive control: it must SEE a perturbation. */
    const probe = Float64Array.from(a.positions);
    probe[17] += 1e-9;
    if (floatDiff(a.positions, probe).differ !== 1) fails.push('V3 guard: the float comparison did not detect a deliberate 1e-9 perturbation — it cannot fail, so its clean sheet means nothing');
  }

  /* V4 THE NORMAL — session 33's claim, on the buckle's OWN contribution.
     Three dispositions, each declared on the state rather than decided here:
     asserted, `report` (a stated reason it is not V4's to judge) and `xfail`
     (a tracked defect that FAILS HARD when it starts passing). */
  const judged = buckled.filter((r) => !r.report && !r.xfail);
  if (!judged.length) fails.push(`V4 normal: every buckled state is reported or xfail — nothing is asserted and the run is vacuous`);
  for (const r of judged) {
    if (!r.resolved) fails.push(`V4 normal: "${r.label}" is asserted but sits at ${r.rowsPerCycle.toFixed(1)} rows per cycle, under the ${ROWS_PER_CYCLE_MIN} the grid needs — it must carry a \`report\` reason or be dropped, never be judged on a wave the mesh cannot draw`);
    else if (!(r.ownDeficit <= WALL_TOLERANCE)) {
      fails.push(`V4 normal: "${r.label}" costs ${r.ownDeficit.toFixed(3)} mm of wall against its own buckle-free control, past the ${WALL_TOLERANCE} mm bar — the skins are not being offset along the surface normal`);
    }
  }
  if (judged.length && !fails.some((f) => f.startsWith('V4'))) {
    const worst = judged.reduce((a, b) => (b.ownDeficit > a.ownDeficit ? b : a));
    say(`  V4 normal: ${judged.length} asserted states, worst own contribution ${worst.ownDeficit.toFixed(3)} mm ("${worst.label}") against a ${WALL_TOLERANCE} mm bar.`);
  }
  /* V5 THE SHEET MUST NOT APPROACH ITSELF (session 34, Eva's ruling: gate it,
     with the known failures declared). SELF was a reported flag; a reported
     number becomes folklore within two sessions, so it is an assertion now.
     The three pre-existing failures are declared in SELF_XFAIL above and MUST
     fail; anything else falling under the bar is this session's or a later
     one's, and reddens immediately. */
  {
    const bar = G.MIN_FEATURE_MM;
    if (typeof bar !== 'number') fails.push('V5 self-approach: the geometry does not export MIN_FEATURE_MM — this gate will not invent a bar');
    for (const r of rows) {
      const known = Object.prototype.hasOwnProperty.call(SELF_XFAIL, r.id);
      const under = r.self < bar;
      if (under && !known) {
        fails.push(`V5 self-approach: "${r.label}" brings the sheet within ${r.self.toFixed(3)} mm of itself, under the ${bar.toFixed(2)} mm minimum printable gap — a NEW self-approach, not one of the ${Object.keys(SELF_XFAIL).length} declared pre-existing ones`);
      } else if (!under && known) {
        fails.push(`V5 xfail: "${r.label}" now clears the bar at ${r.self.toFixed(3)} mm and PASSES — the pre-existing self-approach is FIXED. Remove its SELF_XFAIL entry in the same commit. (was: ${SELF_XFAIL[r.id]})`);
      }
    }
    const stray = Object.keys(SELF_XFAIL).filter((id) => !rows.some((r) => r.id === id));
    if (stray.length) fails.push(`V5 xfail: SELF_XFAIL names ${stray.join(', ')}, which no longer exists in STATES — a declaration nothing measures is worse than an absence`);
    if (!fails.some((f) => f.startsWith('V5'))) {
      const worst = rows.filter((r) => !SELF_XFAIL[r.id]).reduce((a, b) => (b.self < a.self ? b : a));
      say(`  V5 self-approach: every state clears the ${bar.toFixed(2)} mm minimum printable gap except the ${Object.keys(SELF_XFAIL).length} declared pre-existing ones; closest passing is "${worst.label}" at ${worst.self.toFixed(3)} mm.`);
      for (const id of Object.keys(SELF_XFAIL)) {
        const r = rows.find((x) => x.id === id);
        say(`  V5 xfail (pre-existing, still failing as expected): "${r.label}" at ${r.self.toFixed(3)} mm — ${SELF_XFAIL[id]}`);
      }
    }
  }

  /* AN XFAIL THAT STARTS PASSING IS THE FIX LANDING, and it is a LOUD failure
     rather than a quiet bonus — the marker has to come off in the same commit
     or the gate stops meaning anything for that row. */
  for (const r of buckled.filter((x) => x.xfail)) {
    if (r.ownDeficit <= WALL_TOLERANCE) {
      fails.push(`V4 xfail: "${r.label}" now costs only ${r.ownDeficit.toFixed(3)} mm and PASSES — the tracked defect is fixed. Remove its \`xfail\` marker in the same commit. (was: ${r.xfail})`);
    } else {
      say(`  V4 xfail (tracked, still failing as expected): "${r.label}" costs ${r.ownDeficit.toFixed(3)} mm — ${r.xfail}`);
    }
  }
  for (const r of buckled.filter((x) => x.report)) {
    say(`  V4 reported (not asserted): "${r.label}" costs ${r.ownDeficit.toFixed(3)} mm — ${r.report}`);
  }

  if (fails.length) { say(''); for (const f of fails) { if (!quiet) console.error('  FAIL  ' + f); } }
  else say('\n  V1 calibration · V2 reachability · V3 guard · V4 normal · V5 self-approach — all clean.');
  return { fails, rows };
}

/* ------------------------------------------------- the dead-control sweep */

/* DOES EACH CONTROL DO SOMETHING ACROSS ITS WHOLE RANGE? (`--controls`)

   THE stamenSpread PRECEDENT: dead travel is TOLD, never trimmed, and it is
   counted against the SHOWN build rather than against the asked value — the
   buckle's amplitude is clamped, so the steps above the cap emit identical
   geometry and the read-out and the slider's mark both say where that starts.

   A DEAD STEP is a step whose emitted geometry is float-identical to the step
   below it. A DEAD CONTROL — no step anywhere in its range moves anything —
   is a FAILURE, not a report: that is a slider that does nothing.

   It also checks the cross condition Eva named: no control's DEFAULT may sit
   where another control goes inert. The buckle's own gating is the curl
   family's — frequency and falloff are hidden AND inert at amplitude 0 — so
   the check is that they are inert exactly where they are hidden, and live
   everywhere they are shown. */
export async function sweepControls({ root = ROOT, quiet = false } = {}) {
  const G = await loadGeometry(root);
  const R = await import(pathToFileURL(path.join(root, 'bloom-registry.js')).href);
  const say = (...a) => { if (!quiet) console.log(...a); };
  const fails = [];
  const pos = (set) => {
    const acc = new G.MeshBuilder({ exportMode: true });
    G.buildBloomInto(acc, { ...R.DEFAULTS, ...set });
    return acc.positions;
  };
  const same = (a, b) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
    return true;
  };
  const IDS = ['buckleAmp', 'buckleFreq', 'buckleEnv'];
  /* Each control is swept with the OTHERS at their defaults, except that a
     gated control needs its gate open — sweeping frequency at amplitude 0
     would measure the gate, not the control. */
  const OPEN = { buckleAmp: 0.30 };
  const out = [];
  for (const id of IDS) {
    const c = R.CONTROLS.find((x) => x.id === id);
    const base = id === 'buckleAmp' ? {} : { ...OPEN };
    const steps = [];
    for (let v = c.min; v <= c.max + 1e-9; v += c.step) steps.push(Math.round(v / c.step) * c.step);
    let dead = 0, firstDead = null, prev = pos({ ...base, [id]: steps[0] });
    for (let i = 1; i < steps.length; i++) {
      const cur = pos({ ...base, [id]: steps[i] });
      if (same(prev, cur)) { dead++; if (firstDead === null) firstDead = steps[i]; }
      prev = cur;
    }
    out.push({ id, label: c.label, steps: steps.length, dead, firstDead, min: c.min, max: c.max, step: c.step });
    if (dead === steps.length - 1) fails.push(`DEAD CONTROL: "${c.label}" (${id}) emits identical geometry at every one of its ${steps.length} steps — the slider does nothing`);
  }
  say('buckle controls — dead-step census on the REAL shipped ranges, against the SHOWN build.\n');
  say('  ' + 'control'.padEnd(20) + 'range'.padStart(14) + 'steps'.padStart(7) + 'dead'.padStart(6) + '  first dead   what the dead travel is');
  for (const r of out) {
    const why = r.id === 'buckleAmp'
      ? (r.dead ? 'above the clamp cap — told in the read-out and marked on the track' : 'none')
      : (r.dead ? 'unexpected — investigate' : 'none');
    say('  ' + r.label.padEnd(20) + `${r.min}..${r.max}`.padStart(14) + String(r.steps).padStart(7)
      + String(r.dead).padStart(6) + '   ' + (r.firstDead === null ? '—' : String(Number(r.firstDead.toFixed(4)))).padEnd(11) + '  ' + why);
  }
  /* AMPLITUDE'S DEAD TRAVEL MOVES WITH THE FREQUENCY, because the cap does:
     one number for it would understate the range badly. Reported per
     frequency, which is what the slider's mark shows a visitor at each. */
  say('\n  amplitude dead travel per frequency — the cap is L^2 / (h (2 pi f)^2 R_floor),');
  say('  so it falls as f^2 and the mark moves with it:');
  say('    ' + 'f'.padStart(3) + 'cap'.padStart(8) + 'live steps'.padStart(12) + 'dead'.padStart(6) + '  dead travel');
  {
    const c = R.CONTROLS.find((x) => x.id === 'buckleAmp');
    const steps = [];
    for (let v = c.min; v <= c.max + 1e-9; v += c.step) steps.push(Math.round(v / c.step) * c.step);
    for (let f = R.CONTROLS.find((x) => x.id === 'buckleFreq').min; f <= R.CONTROLS.find((x) => x.id === 'buckleFreq').max; f++) {
      let dead = 0, prev = pos({ buckleFreq: f, buckleAmp: steps[0] });
      for (let i = 1; i < steps.length; i++) {
        const cur = pos({ buckleFreq: f, buckleAmp: steps[i] });
        if (same(prev, cur)) dead++;
        prev = cur;
      }
      const acc = new G.MeshBuilder({ exportMode: true, captureGrid: true });
      const mm = G.buildBloomInto(acc, { ...R.DEFAULTS, buckleAmp: 0.3, buckleFreq: f });
      const cap = mm.petal.form.buckle.ampCap;
      say('    ' + String(f).padStart(3) + cap.toFixed(3).padStart(8) + String(steps.length - 1 - dead).padStart(12)
        + String(dead).padStart(6) + `  ${((dead / (steps.length - 1)) * 100).toFixed(0)}% of the slider`);
    }
  }

  /* THE CROSS CONDITION — inert exactly where hidden. */
  say('\n  the gate: frequency and falloff at amplitude 0 (hidden — must also be INERT)');
  const flat = pos({});
  for (const [id, v] of [['buckleFreq', 7], ['buckleEnv', 6]]) {
    const moved = !same(flat, pos({ buckleAmp: 0, [id]: v }));
    say(`    ${id} at its extreme with amplitude 0: ${moved ? 'MOVES GEOMETRY' : 'inert'}`);
    if (moved) fails.push(`${id} is hidden at amplitude 0 but NOT inert — a hidden control that still moves the build is the mute this project rules against`);
  }
  say('  and live wherever they are shown (amplitude 0.30):');
  for (const [id, a, b] of [['buckleFreq', 1, 7], ['buckleEnv', 2, 6]]) {
    const moved = !same(pos({ ...OPEN, [id]: a }), pos({ ...OPEN, [id]: b }));
    say(`    ${id} ${a} vs ${b}: ${moved ? 'moves' : 'INERT'}`);
    if (!moved) fails.push(`${id} is shown at amplitude 0.30 but inert across its whole range there`);
  }
  if (fails.length && !quiet) { say(''); for (const f of fails) console.error('  FAIL  ' + f); }
  return { fails, out };
}

/* --------------------------------------------------------- negative control */

/* Each mutation names the assertions it MUST redden. A mutation that reddens
   something it did not name is reported too — that is how a mutation which
   merely breaks the build gets caught pretending to be a negative control. */
const MUTANTS = [
  { id: 'cross-section-normal', names: ['V4'],
    why: 'revert the buckled branch to the cross-section normal — session 33 undone',
    apply: (s) => s.replace('if (form && form.buckle !== null) trueNormalRows(rows, footS.length);',
                            'if (false && form.buckle !== null) trueNormalRows(rows, footS.length);') },
  { id: 'derivative-in-v', names: ['V4'],
    why: "differentiate the field in v rather than in a = h*v — the discovery pass's own first bug",
    apply: (s) => s.replace('const bd = buckle === null ? null : (v) => r * buckle.dwda(u, v, h);',
                            'const bd = buckle === null ? null : (v) => r * buckle.dwda(u, v, h) * h;') },
  { id: 'dead-branch', names: ['V2'],
    why: 'the guard always holds, so the buckle is never built',
    apply: (s) => s.replace('export function buckleIsFlat(state) { return !state.buckleAmp || !state.buckleFreq; }',
                            'export function buckleIsFlat(state) { return true; }') },
  { id: 'unguarded-form', names: ['V2'],
    why: 'petalFormIsFlat stops naming the buckle, so petalForm() is never constructed and the field is a dead slider — session 16\'s failure, repeated',
    apply: (s) => s.replace('      && buckleIsFlat(state);\n}', '      && true;\n}') },
  /* THE CLAMP'S MUTANT NAMES V4, NOT V5, AND THAT IS A RESULT RATHER THAN A
     correction of convenience. It was written naming V5 on the assumption that
     an unclamped wave folds the sheet onto itself; measured, removing the
     clamp reddens the WALL and leaves SELF clear on every state here. That is
     independent evidence for session 34's measurement 1 — the clamp bounds
     offset inversion and does NOT bound self-approach, which is exactly why it
     is necessary and not sufficient. */
  { id: 'no-amplitude-clamp', names: ['V4'],
    why: 'the amplitude clamp is removed, so a high frequency builds the amplitude it was asked for and the skins wedge — measured to redden the WALL and NOT self-approach, which is the clamp telling you what it does and does not bound',
    apply: (s) => s.replace('  const A = Math.min(asked, cap);', '  const A = asked;') },
  { id: 'field-four-times-too-big', names: ['V5'],
    why: 'the field is emitted at four times the law\'s amplitude — a wrong constant in `w`, the defect class that folds a margin onto the blade behind it',
    apply: (s) => s.replace('    w: (u, v, h) => A * h * Math.pow(Math.abs(v), p) * Math.cos(2 * Math.PI * f * u + ph),',
                            '    w: (u, v, h) => 4 * A * h * Math.pow(Math.abs(v), p) * Math.cos(2 * Math.PI * f * u + ph),') },
  { id: 'guard-needs-both-zero', names: ['V3'],
    why: 'the guard asks for BOTH factors to be zero rather than either, so a frequency alone engages the field at amplitude 0 and the gated state stops being inert',
    apply: (s) => s.replace('export function buckleIsFlat(state) { return !state.buckleAmp || !state.buckleFreq; }',
                            'export function buckleIsFlat(state) { return !state.buckleAmp && !state.buckleFreq; }') },
];

/* EACH MUTANT GETS ITS OWN DIRECTORY, and that is not tidiness. Node's ESM
   loader caches by resolved URL: writing every mutant to one path and
   importing it in turn serves the FIRST mutant's module to all of them. The
   first sweep did exactly that — three mutants reported identical numbers and
   two "passed" on mutant one's behaviour. A mutation that did not apply is
   survivable; a mutation that silently did not RUN is not. */
async function negativeControl() {
  const src = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
  const reg = fs.readFileSync(path.join(ROOT, 'bloom-registry.js'), 'utf8');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-wall-nc-'));
  let bad = 0;
  console.log('negative control — each mutation must redden the assertions it NAMES.');
  console.log('Anything else it reddens is reported, which is how a mutation that merely breaks');
  console.log('the build gets caught pretending to be a negative control.\n');
  /* The unmutated run's own failures are the BASELINE: an assertion already
     red on the shipped tree (a tracked xfail is not, but a real red would be)
     cannot be evidence that a mutation reddened it. */
  const { fails: baseFails } = await verify({ quiet: true });
  if (baseFails.length) {
    console.error(`  FAIL  the shipped tree is not green (${baseFails.length} failing) — no mutant result can be read against it`);
    for (const f of baseFails) console.error('        ' + f);
    return baseFails.length;
  }
  console.log('  baseline: the shipped tree is green, so every red below is the mutation\'s.\n');
  for (const mut of MUTANTS) {
    const mutated = mut.apply(src);
    if (mutated === src) {
      console.error(`  FAIL ${mut.id.padEnd(22)} the mutation did not apply — its anchor has moved and this mutant is silently disarmed`);
      bad++; continue;
    }
    const mdir = path.join(dir, mut.id);
    fs.mkdirSync(mdir, { recursive: true });
    fs.writeFileSync(path.join(mdir, 'bloom-geometry.js'), mutated);
    fs.writeFileSync(path.join(mdir, 'bloom-registry.js'), reg);
    let fails = [];
    try { ({ fails } = await verify({ root: mdir, quiet: true })); }
    catch (e) { fails = [`XX threw: ${e.message}`]; }
    const fired = new Set(fails.map((f) => f.slice(0, 2)));
    const missing = mut.names.filter((n) => !fired.has(n));
    const extra = [...fired].filter((n) => !mut.names.includes(n));
    console.log(`  ${missing.length ? 'FAIL' : 'ok  '} ${mut.id.padEnd(22)} names ${mut.names.join(',').padEnd(6)} fired ${[...fired].sort().join(',') || '(none)'}`);
    console.log(`       ${mut.why}`);
    if (missing.length) { console.error(`       MISSED: ${missing.join(', ')} stayed green under a mutation that names it`); bad++; }
    if (extra.length) console.log(`       also fired (reported, not a failure): ${extra.join(', ')}`);
  }
  return bad;
}

if (IS_MAIN) {
  if (process.argv.includes('--controls')) {
    const { fails } = await sweepControls({});
    process.exit(fails.length ? 1 : 0);
  } else if (process.argv.includes('--negative-control')) {
    const bad = await negativeControl();
    console.log(bad ? `\nnegative control: FAIL — ${bad} mutant(s) did not behave` : '\nnegative control: all mutants behaved.');
    process.exit(bad ? 1 : 0);
  } else {
    const { fails } = await verify({});
    process.exit(fails.length ? 1 : 0);
  }
}
