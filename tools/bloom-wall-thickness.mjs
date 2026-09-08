/* ===================================================================
   bloom-wall-thickness.mjs — HOW THICK IS THE SHEET, ACTUALLY? (session 31)

   THE GAP THIS FILLS. Nothing in this project has ever measured the emitted
   wall. The roll curvature floor (`ROLL_MIN_RADIUS_FACTOR`) is a CURVATURE
   argument — "a shell's inner offset inverts under half a thickness of
   radius" — and it has never been checked against the mesh that comes out.
   `thicknessProfile` reports the thickness a row was BUILT AT; that is the
   number handed to the offset, not the distance between the two skins that
   were offset. Those are the same only while the mid-surface is gentle.

   Margin buckling is the first deformation whose whole point is that the
   mid-surface is NOT gentle along u, and session 32 has to set its ranges
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
       curved sheet under-reads by the facets' own sagitta, and at the shipped
       28 x 10 grid that is most of what a curved row reads. Refining both
       counts separates the two: measured in discovery, shipped roll 330 reads
       0.666 mm at 28x10 and 1.177 mm at 168x60 — i.e. the roll floor is doing
       its job and the deficit is the mesh. Do not quote a single-resolution
       number as "the wall" without saying which grid it came from.
     - IT SAYS NOTHING ABOUT WHETHER THE SHAPE IS RIGHT. Both STL gates own
       watertightness and connectedness; neither can see a self-intersection
       (Q6), and neither can see this.
     - THE STATES BELOW ARE HAND-PICKED CORNERS, NOT THE MATRIX.
     - It reads ONE petal — the one grid `buildBloomInto` retains per
       descriptor — so it says nothing about petal-to-petal clearance.

   THE FOUR VALIDITY ASSERTIONS ABORT THE RUN. A self-check that reports
   instead of failing is not a self-check:
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

   RUN:  node tools/bloom-wall-thickness.mjs [--grid NUxNV] [--json]
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
   sits below where that line lands when session 31 is undone. */
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
  { id: 'buckle-f7',       label: 'buckle A=0.20 · f=7 (session 32 cap)', set: { buckleAmp: 0.20, buckleFreq: 7 }, buckled: true,
    /* REPORTED, NOT ASSERTED, and the reason is measured rather than assumed:
       4.0 rows per cycle at the shipped grid, and the wall RECOVERS under
       refinement — 0.903 at 28x10, 0.991 at 42x15, 1.050 at 56x20, 1.114 at
       84x30, where the buckle's own contribution is 0.086 mm and inside V4's
       bar. So the deficit here is the row count, and session 31 ships no
       control that can reach it. */
    report: 'resolution: 4.0 rows/cycle; recovers to 1.114 mm at 84x30, own contribution 0.086 mm' },
  { id: 'buckle-on-form',  label: 'buckle A=0.20 f=3 over cup 1.2 + curl 180',
    set: { buckleAmp: 0.20, buckleFreq: 3, petalCup: 1.2, petalSpineCurl: 180 }, buckled: true,
    /* XFAIL, WITH ITS OWN MEASUREMENT — this one does NOT recover. Refined
       28x10 -> 84x30 the wall goes 0.491 -> 0.333 mm and the buckle's own
       contribution GROWS 0.438 -> 0.635 mm. Divergence under refinement is
       the signature of real geometry, not of faceting (the same signature
       shipped all-form-max already shows: 0.282 -> 0.014 in discovery).
       WHAT IT MEANS: the buckle COMPOSES with the curvature cup and curl have
       already spent, and the composition reaches inversion where neither does
       alone. Session 32's clamp cannot be a function of A, f, L and t only —
       the closed-form `A*f^2 <= L^2/(4*pi^2*t)` bound derived in discovery is
       necessary and NOT sufficient. That is this row's job: to be the number
       that argument gets made in front of.
       IT IS AN XFAIL, NOT A WIDER BAR. The run FAILS HARD if it starts
       passing — that is the clamp landing, and the marker must come off in
       the same commit. */
    xfail: 'composition: diverges under refinement (own contribution 0.438 mm at 28x10 -> 0.635 mm at 84x30); session 32 clamp' },
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
    const a = new G.MeshBuilder({ exportMode: true });
    G.buildBloomInto(a, { ...D });
    const b = new G.MeshBuilder({ exportMode: true });
    G.buildBloomInto(b, { ...D, buckleAmp: 0, buckleFreq: 0, buckleEnv: 3, bucklePhase: 0 });
    const d = floatDiff(a.positions, b.positions);
    if (d.differ !== 0) fails.push(`V3 guard: ${d.differ} of ${d.len} floats move when the buckle keys are present at zero — the guard is not a branch`);
    else say(`  V3 guard: 0 of ${d.len.toLocaleString('en-US')} floats move when the buckle keys are present at zero.`);
    /* The comparison's own positive control: it must SEE a perturbation. */
    const probe = Float64Array.from(a.positions);
    probe[17] += 1e-9;
    if (floatDiff(a.positions, probe).differ !== 1) fails.push('V3 guard: the float comparison did not detect a deliberate 1e-9 perturbation — it cannot fail, so its clean sheet means nothing');
  }

  /* V4 THE NORMAL — session 31's claim, on the buckle's OWN contribution.
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
  else say('\n  V1 calibration · V2 reachability · V3 guard · V4 normal — all clean.');
  return { fails, rows };
}

/* --------------------------------------------------------- negative control */

/* Each mutation names the assertions it MUST redden. A mutation that reddens
   something it did not name is reported too — that is how a mutation which
   merely breaks the build gets caught pretending to be a negative control. */
const MUTANTS = [
  { id: 'cross-section-normal', names: ['V4'],
    why: 'revert the buckled branch to the cross-section normal — session 31 undone',
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
  { id: 'guard-on-presence', names: ['V3'],
    why: 'the guard tests whether the keys EXIST rather than whether they are zero, so a zero-valued buckle engages the field and the shipped default stops being byte-identical',
    apply: (s) => s.replace('export function buckleIsFlat(state) { return !state.buckleAmp || !state.buckleFreq; }',
                            'export function buckleIsFlat(state) { return state.buckleAmp === undefined || state.buckleFreq === undefined; }') },
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
  if (process.argv.includes('--negative-control')) {
    const bad = await negativeControl();
    console.log(bad ? `\nnegative control: FAIL — ${bad} mutant(s) did not behave` : '\nnegative control: all mutants behaved.');
    process.exit(bad ? 1 : 0);
  } else {
    const { fails } = await verify({});
    process.exit(fails.length ? 1 : 0);
  }
}
