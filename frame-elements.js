/* frame-elements.js — the /frame PLACED ELEMENTS (phase 3e, step 2): the
   shell, the palmette with its boss, the rose, the rosette and the bud in
   its leaf cup, each a closed relief solid about the origin on a flat base,
   in print millimetres. Pure functions, no DOM, Node-importable. Read
   docs/frame-charter.md §16 before touching it.

   NOTHING HERE IS PLACED ON A FRAME YET (Eva's brief: not wired into the
   chains or a hierarchy — that is the next session). Eva's ruling that the
   palmette and the rosette are ONE primitive each with the chains' junction
   motifs (phase 3d's) is DISCHARGED BY THAT SESSION, not this one: the
   layouts are declared here (PALMETTE / ROSETTE below) so the wiring
   session makes the chain motifs `buildElement` calls that read them, and
   until then frame-filigree's three-leaf palmette and five-petal rosette
   stand as they shipped (0 chain bytes moved by this module; the charter's
   §16 says so in as many words).

   Every element is a HEIGHT FIELD or a stack of them (no undercut, Eva's
   ruling on the rose): a surface z(u, v) over a parametric patch, closed as
   a column down to the base (`patchSolid`), the patches of one element
   overlapping as stacked shells. So every element is one connected
   watertight solid by construction, which the gate measures rather than
   trusts. Floors: a blade's crown and a bead's diameter at MIN_FEATURE_MM
   (an assumption; nothing has been printed), told. */

import { Mesh, sphereSolid, PATTERN_LAT, PATTERN_LON } from './frame-relief.js';
import { MIN_FEATURE_MM } from './frame-registry.js';

/* THE LAYOUTS the wiring session will hand the chains' junction motifs (one
   primitive each, Eva's ruling — see the header). Lengths are × the motif's
   FOOT (its size); angles are off the motif's axis (the palmette's centre
   leaf), radians. */
export const PALMETTE = {
  // five leaves: the centre, a pair at ±0.55 rad and a pair at ±1.05 rad,
  // each shorter and flaring further outward (its tip turning away from
  // the axis by `flare` rad over its length), the outer pair the most
  leaves: [{ angle: 0, len: 1.0, flare: 0 }, { angle: 0.5, len: 0.86, flare: 1.6 }, { angle: -0.5, len: 0.86, flare: -1.6 }, { angle: 0.95, len: 0.66, flare: 2.4 }, { angle: -0.95, len: 0.66, flare: -2.4 }],
  width: 0.34,      // a leaf's width × its length
  crown: 0.16,      // its crown × its width
  tilt: 0.18,       // the tip's lift × its length
  boss: 0.2,        // the boss's radius × the foot
  bossRise: 0.5,    // the dome's height × its radius (oblate)
};
export const ROSETTE = {
  petals: 8,
  len: 0.92,        // a petal's length × the rosette's radius
  width: 1.55,      // a petal's width × its share of the circumference at half radius (over 1 overlaps)
  crown: 0.06,      // a petal's crown × the rosette's size
  boss: 0.2,        // the centre boss's radius × the rosette's radius
};

/* A deterministic unit hash on an integer (the rose's and the rosette's
   irregularity is seeded, never Math.random): integer arithmetic only. */
export function hash01(n) { let x = Math.imul(n + 0x9e3779b9, 0x85ebca6b) >>> 0; x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35) >>> 0; x ^= x >>> 16; return (x >>> 0) / 4294967296; }

/* A PATCH SOLID: a parametric surface P(i, j) (nu + 1 rows × nv + 1 columns
   of [x, y, z], z ≥ 0 above the base) closed as a column to z = 0 — the
   top grid, the same grid at z = 0, and the four walls. Degenerate
   triangles (a collapsed row, as a fan's apex) are dropped by Mesh.tri with
   the edge parity kept, so a patch whose first row is one point is still
   closed. Oriented by its signed volume. */
export function patchSolid(mesh, grid, id = 'patch') {
  const nu = grid.length, nv = grid[0].length;
  const base = mesh.pos.length / 3, t0 = mesh.idx.length / 3;
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) mesh.vertex(grid[i][j][0], grid[i][j][1], grid[i][j][2]);
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) mesh.vertex(grid[i][j][0], grid[i][j][1], 0);
  const T = (i, j) => base + i * nv + j, B = (i, j) => base + nu * nv + i * nv + j;
  for (let i = 0; i < nu - 1; i++) for (let j = 0; j < nv - 1; j++) { mesh.quad(T(i, j), T(i + 1, j), T(i + 1, j + 1), T(i, j + 1)); mesh.quad(B(i, j), B(i, j + 1), B(i + 1, j + 1), B(i + 1, j)); }
  for (let i = 0; i < nu - 1; i++) { mesh.quad(T(i, 0), B(i, 0), B(i + 1, 0), T(i + 1, 0)); mesh.quad(T(i, nv - 1), T(i + 1, nv - 1), B(i + 1, nv - 1), B(i, nv - 1)); }
  for (let j = 0; j < nv - 1; j++) { mesh.quad(T(0, j), T(0, j + 1), B(0, j + 1), B(0, j)); mesh.quad(T(nu - 1, j), B(nu - 1, j), B(nu - 1, j + 1), T(nu - 1, j + 1)); }
  // orient by the signed volume, as every band is
  const P = mesh.pos, I = mesh.idx; let vol = 0;
  for (let t = t0; t < I.length / 3; t++) { const a = 3 * I[3 * t], b = 3 * I[3 * t + 1], c = 3 * I[3 * t + 2]; vol += P[a] * (P[b + 1] * P[c + 2] - P[b + 2] * P[c + 1]) - P[a + 1] * (P[b] * P[c + 2] - P[b + 2] * P[c]) + P[a + 2] * (P[b] * P[c + 1] - P[b + 1] * P[c]); }
  if (vol < 0) for (let t = t0; t < I.length / 3; t++) { const k = 3 * t + 1, tmp = I[k]; I[k] = I[k + 1]; I[k + 1] = tmp; }
  mesh.parts.push({ id, kind: 'patch', base, nu, nv, t0, t1: I.length / 3, T });
}

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const F = MIN_FEATURE_MM;

/* A BLADE patch: a leaf- or petal-shaped surface laid along a straight
   centreline from `at` in direction `ang`, length L, half width hw(u) (u
   along, 0..1), its crown z(u, v) (v across, −1..1) above `lift(u)`; `tilt`
   raises the tip (z += tilt · u) and `cup` lifts the margins (z += cup ·
   v²) — the two bends a placed petal has. nu × nv stations. */
export function bladeGrid({ at = [0, 0], ang = 0, L, hw, crown, lift = () => 0, tilt = 0, cup = 0, nu = 24, nv = 12 }) {
  const ca = Math.cos(ang), sa = Math.sin(ang), grid = [], hMax = Math.max(...Array.from({ length: nu + 1 }, (_, k) => hw(k / nu)));
  for (let i = 0; i <= nu; i++) {
    const u = i / nu, h = hw(u), row = [];
    for (let j = 0; j <= nv; j++) {
      const v = 2 * j / nv - 1, x = u * L, y = v * h;
      const z = lift(u) + crown(u, v) * Math.min(1, hw(u) / hMax) + tilt * u + cup * v * v;
      row.push([at[0] + ca * x - sa * y, at[1] + sa * x + ca * y, Math.max(0, z)]);
    }
    grid.push(row);
  }
  return grid;
}
/* a BLUNT petal's half width: a superellipse about the blade's middle,
   W/2 · (1 − |2u − 1|^n)^(1/n) (n 2 a true ellipse, higher a rounder end,
   squarer sides), narrowed toward the base by (u + b)/(1 + b); floored at F/2 */
export const bluntHalf = (W, n = 2.6, b = 0.35) => (u) => Math.max(F / 2, W / 2 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * u - 1), n)), 1 / n) * (u + b) / (1 + b));
/* a rounded blade's half width: W/2 · sin(π u^p)^q, floored at F/2 */
export const roundedHalf = (W, p = 0.75, q = 0.8) => (u) => Math.max(F / 2, W / 2 * Math.pow(Math.sin(Math.PI * Math.pow(u, p)), q));
/* a soft dome across a blade: crown · (1 − v²)^k, floored at the feature at the midrib */
export const domeCrown = (crown, k = 0.6) => (u, v) => Math.max(F, crown) * Math.pow(Math.max(0, 1 - v * v), k) * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u)) * 0.5 + Math.PI * 0.25), 0.5);

/* ------------------------------------------------------------------ */
/* (a) THE SHELL — cupped, ribs converging on a hinge, a scalloped edge   */
/* ------------------------------------------------------------------ */

/* A scallop: a fan of half-angle SHELL_FAN about the HINGE at the origin
   (the shell opens along +y), radius R, with two straight ears either side
   of the hinge. CUPPED: the dish is CONCAVE toward the viewer — the floor
   near the hinge, the rim raised by SHELL_DISH of the size, rising as
   (ρ/R)^2.2 so the bowl is flat-bottomed and turns up at the rim. The RIBS
   are ridges radiating from the hinge, SHELL_RIBS of them, each a cos²
   crest between two grooves, deepening outward; the RIM is scalloped by
   the same ribs: each rib runs to a lobe (ρ = R) and each groove to a
   notch (ρ = R (1 − SHELL_SCALLOP)), the lobes themselves rounded by the
   rib's own cos². Everything converges on the hinge, where the ribs are
   zero and the ears meet. */
export const SHELL_FAN = 1.25, SHELL_RIBS = 11, SHELL_SCALLOP = 0.14, SHELL_DISH = 0.34, SHELL_RIB = 0.09, SHELL_EAR = 0.22;
export function shellGrid({ R, size, nu = 30, nv = 88, at = [0, 0] }) {
  const grid = [];
  const ribs = SHELL_RIBS, fan = SHELL_FAN;
  for (let i = 0; i <= nu; i++) {
    const u = i / nu, row = [];
    for (let j = 0; j <= nv; j++) {
      const th = -fan + 2 * fan * j / nv;
      const phase = (th + fan) / (2 * fan) * ribs * Math.PI;
      const rib = Math.cos(phase) ** 2;               // 1 on a rib's crest, 0 in a groove
      // the rim: lobes on the crests, notches in the grooves
      const rimR = R * (1 - SHELL_SCALLOP * (1 - rib));
      const rho = u * rimR;
      // the ears: below SHELL_EAR of the radius the outline is a straight
      // hinge line, |x| growing linearly, so the fan's root is a flat hinge
      const earW = SHELL_EAR * R;
      const x0 = rho * Math.sin(th), y0 = rho * Math.cos(th);
      const ear = smooth((rho - 0.0) / earW);
      const x = x0 * (0.55 + 0.45 * ear), y = y0 - (1 - ear) * 0.25 * earW * Math.abs(Math.sin(th));
      const dish = size * SHELL_DISH * Math.pow(u, 2.2);
      const ridge = size * SHELL_RIB * rib * smooth((u - 0.1) / 0.45) * (0.55 + 0.45 * u);
      row.push([at[0] + x, at[1] + y, F + 0.4 + dish + ridge]);
    }
    grid.push(row);
  }
  return grid;
}
export function buildShell({ size = 24, base = false } = {}) {
  const mesh = new Mesh(), R = size / 2;
  if (base) slab(mesh, size);
  patchSolid(mesh, shellGrid({ R, size }), 'shell');
  return done(mesh, 'shell', { size, ribs: SHELL_RIBS });
}

/* ------------------------------------------------------------------ */
/* (b) THE PALMETTE with its boss                                        */
/* ------------------------------------------------------------------ */

/* The leaves fan from a BOSS — a low dome (the upper PALMETTE.bossRise of
   a sphere) standing on a short collar, so it reads as a boss and never a
   ball or a cylinder — each leaf a blade whose plan FLARES outward (its
   centreline bends away from the axis by PALMETTE.leaves[k].flare over
   its length, the tip the most) and whose tip LIFTS, with a raised midrib;
   the longest on the axis. The layout is PALMETTE, shared with the
   chains' junction motif. */
export function buildPalmette({ size = 24, base = false } = {}) {
  const mesh = new Mesh(), foot = size;
  if (base) slab(mesh, size);
  const rB = PALMETTE.boss * foot;
  // the boss: an OBLATE dome (height PALMETTE.bossRise of its radius, a
  // superellipse profile so its shoulder is full and its top flat) on a
  // collar ring a feature high and a quarter wider — a boss, not a ball
  patchSolid(mesh, discGrid([0, 0], rB * 1.25, F + 0.3), 'boss-collar');
  patchSolid(mesh, bossGrid([0, 0], rB, PALMETTE.bossRise * rB, F + 0.3), 'boss');
  PALMETTE.leaves.forEach((lf, k) => {
    const L = lf.len * foot, W = PALMETTE.width * L;
    const g = curvedBladeGrid({ at: [0.3 * rB * Math.sin(lf.angle), rB * 0.6 * Math.cos(lf.angle)], ang: Math.PI / 2 + lf.angle, L, hw: roundedHalf(W, 0.72, 0.85), crown: midribCrown(Math.max(F, PALMETTE.crown * W)), flare: lf.flare, tilt: PALMETTE.tilt * L, lift: () => F + 0.3, nu: 26, nv: 14 });
    patchSolid(mesh, g, `palmette-leaf-${k}`);
  });
  return done(mesh, 'palmette', { size, boss: rB });
}
/* a leaf's crown: a raised midrib on a cupped blade (the edges half up). Every
   blade grid scales its crown by the row's half-width over the widest, so a
   tip narrowed to the floor carries no spike — the midrib's width is a share of
   the row's, and on a 1 mm row it was a 130° crest. */
export const midribCrown = (crown) => (u, v) => crown * (0.45 * Math.pow(Math.max(0, 1 - v * v), 0.5) + 0.55 * Math.exp(-((v / 0.22) ** 2))) * (0.7 + 0.3 * Math.sin(Math.PI * Math.min(1, u * 1.1)));
/* an oblate dome: radius r, height h, superellipse profile z = h (1 − (ρ/r)^2.4)^(1/2.4), on seat z0 */
export function bossGrid(c, r, h, z0, nu = 10, nv = 40) {
  const grid = []; for (let i = 0; i <= nu; i++) { const row = []; const q = i / nu, rr = r * q, z = z0 + h * Math.pow(Math.max(0, 1 - Math.pow(q, 2.4)), 1 / 2.4); for (let j = 0; j <= nv; j++) { const a = 2 * Math.PI * j / nv; row.push([c[0] + rr * Math.cos(a), c[1] + rr * Math.sin(a), z]); } grid.push(row); } return grid;
}
/* a flat disc of radius r at height z (a fan from its centre) */
export function discGrid(c, r, z, nu = 6, nv = 40) {
  const grid = []; for (let i = 0; i <= nu; i++) { const row = []; for (let j = 0; j <= nv; j++) { const a = 2 * Math.PI * j / nv, rr = r * i / nu; row.push([c[0] + rr * Math.cos(a), c[1] + rr * Math.sin(a), z]); } grid.push(row); } return grid;
}
/* a square slab of a feature's thickness under an element (the sheet's base) */
function slab(mesh, size) { const h = 0.75 * size, g = [[[-h, -h, F], [h, -h, F]], [[-h, h, F], [h, h, F]]]; patchSolid(mesh, g, 'base'); }
/* A blade whose centreline bends in plan: curvature κ(u) = flare · u (the
   tip turns the most), so the plan is a flaring arc; everything else as
   bladeGrid. */
export function curvedBladeGrid({ at, ang, L, hw, crown, lift = () => 0, tilt = 0, cup = 0, flare = 0, nu = 24, nv = 12 }) {
  const grid = [], hMax = Math.max(...Array.from({ length: nu + 1 }, (_, k) => hw(k / nu)));
  let x = 0, y = 0, f = ang; const centre = [[0, 0, f]];
  for (let i = 1; i <= nu; i++) { const u = (i - 0.5) / nu, ds = L / nu, dphi = flare * u * ds / L; x += ds * Math.cos(f + dphi / 2); y += ds * Math.sin(f + dphi / 2); f += dphi; centre.push([x, y, f]); }
  for (let i = 0; i <= nu; i++) {
    const u = i / nu, h = hw(u), [cx, cy, ph] = centre[i], nx = -Math.sin(ph), ny = Math.cos(ph), row = [];
    for (let j = 0; j <= nv; j++) { const v = 2 * j / nv - 1; row.push([at[0] + cx + v * h * nx, at[1] + cy + v * h * ny, Math.max(0, lift(u) + crown(u, v) * Math.min(1, hw(u) / hMax) + tilt * u * u + cup * v * v)]); }
    grid.push(row);
  }
  return grid;
}

/* ------------------------------------------------------------------ */
/* (c) THE ROSE — rounder, irregular, no undercut                        */
/* ------------------------------------------------------------------ */

/* A SPIRAL of blunt petals about a centre, ROSE_PETALS of them from the
   outside in: petal k sits at the golden angle × k, its root ρ_k and its
   size shrinking inward, each a wide BLUNT blade (a superellipse outline,
   never a point) whose crown is a low cushion rising toward its outer
   edge and curling up at the margins (a cup read from above), LIFTED
   stepwise inward so each lies over the ones outside it — stacked shells,
   no undercut (Eva's ruling). Every petal is jittered in angle, size,
   and lift by a seeded hash so no two match. The heart is a small dome of
   the innermost three petals' lifts. */
export const ROSE_PETALS = 21, ROSE_GOLDEN = Math.PI * (3 - Math.sqrt(5));
export function buildRose({ size = 26, seed = 7, base = false } = {}) {
  const mesh = new Mesh(), R = size / 2;
  if (base) slab(mesh, size);
  const crown = Math.max(F, 0.06 * size), N = ROSE_PETALS;
  for (let k = 0; k < N; k++) {
    const t = k / (N - 1);                   // 0 the outermost, 1 the heart
    const j1 = hash01(seed * 131 + k * 17), j2 = hash01(seed * 7 + k * 29), j3 = hash01(seed * 3 + k * 41);
    const ang = k * ROSE_GOLDEN + 0.25 * (j1 - 0.5);
    const rho = R * (0.52 * (1 - t) + 0.04), L = R * (0.92 - 0.6 * t) * (0.92 + 0.16 * j2), W = L * (1.05 + 0.1 * j3);
    const lift = F + 0.3 + crown * 3.2 * t + 0.2 * crown * (j1 - 0.5);
    // the crown and the tip's lift scale with the petal's own LENGTH (a short
    // inner petal rising a full crown over a few mm turned its tip 51°)
    const kL = L / (R * 0.92 * 1.08);
    const g = bladeGrid({ at: [rho * 0.42 * Math.cos(ang), rho * 0.42 * Math.sin(ang)], ang, L, hw: bluntHalf(W, 2.8, 0.3), crown: (u, v) => kL * crown * (0.25 + 0.75 * Math.pow(u, 1.3)) * (0.55 + 0.45 * Math.pow(Math.abs(v), 1.8)), lift: () => lift, tilt: 1.6 * kL * crown * (1 - 0.5 * t), nu: 22, nv: 16 });
    patchSolid(mesh, g, `rose-${k}`);
  }
  sphereSolid(mesh, [0, 0, F + 0.3 + crown * 3.2 - 0.3 * 0.14 * R], 0.14 * R, PATTERN_LAT, PATTERN_LON);
  return done(mesh, 'rose', { size, petals: N });
}

/* ------------------------------------------------------------------ */
/* (d) THE ROSETTE — flat, wide, overlapping petals                      */
/* ------------------------------------------------------------------ */

/* ROSETTE.petals wide BLUNT petals about a low boss, each ROSETTE.width ×
   its share of the circle wide so neighbours OVERLAP, alternate petals
   lifted a third of a crown so the overlap stacks (never a graze), the
   crown a low flat cushion with a soft midline dip — flat and wide. */
export function buildRosette({ size = 20, base = false } = {}) {
  const mesh = new Mesh(), R = size / 2, n = ROSETTE.petals;
  if (base) slab(mesh, size);
  const crown = Math.max(F, ROSETTE.crown * size);
  for (let i = 0; i < n; i++) {
    const ang = 2 * Math.PI * i / n, L = ROSETTE.len * R, W = ROSETTE.width * 2 * Math.PI * (0.55 * R) / n;
    const lift = F + 0.3 + (i % 2 ? 0.4 * crown : 0);
    const g = bladeGrid({ at: [0.1 * R * Math.cos(ang), 0.1 * R * Math.sin(ang)], ang, L, hw: bluntHalf(W, 3.0, 0.25), crown: (u, v) => crown * Math.pow(Math.max(0, 1 - v * v), 0.3) * (0.8 - 0.15 * Math.exp(-((v / 0.3) ** 2))) * (0.75 + 0.25 * Math.sin(Math.PI * u)), lift: () => lift, nu: 18, nv: 16 });
    patchSolid(mesh, g, `rosette-${i}`);
  }
  const rb = ROSETTE.boss * R;
  sphereSolid(mesh, [0, 0, F + 0.3 + 0.4 * crown + crown + 0.55 * rb - rb], rb, PATTERN_LAT, PATTERN_LON);
  return done(mesh, 'rosette', { size, petals: n });
}

/* ------------------------------------------------------------------ */
/* (e) THE BUD / BERRY in a leaf cup                                     */
/* ------------------------------------------------------------------ */

/* A cluster: three berries of graded size SITTING IN a cup of five short
   cupped leaves that rise from one root and wrap the berries' bases, the
   berries sunk a third into the cup (their centres low, under the leaves'
   crowns) — stacked shells, no stalk. */
export const BUD_BERRIES = [[0, 0.05, 1.0], [0.46, 0.22, 0.74], [-0.42, 0.28, 0.62]];   // [x, y] × R, radius share
export function buildBud({ size = 18, base = false } = {}) {
  const mesh = new Mesh(), R = size / 2, rb = 0.4 * R;
  if (base) slab(mesh, size);
  const crown = Math.max(F, 0.07 * size);
  for (let i = 0; i < 5; i++) {
    const ang = Math.PI / 2 + (i - 2) * 0.62, L = 1.1 * R, W = 0.62 * L;
    const g = curvedBladeGrid({ at: [0, -0.7 * R], ang, L, hw: roundedHalf(W, 0.65, 0.9), crown: midribCrown(crown), lift: () => F + 0.3, tilt: 3.2 * crown, cup: 1.4 * crown, flare: 0.25 * (i - 2), nu: 20, nv: 14 });
    patchSolid(mesh, g, `cup-leaf-${i}`);
  }
  BUD_BERRIES.forEach(([x, y, s]) => { const r = Math.max(F / 2, rb * s); sphereSolid(mesh, [x * R, y * R, F + 0.3 + 1.2 * crown + 0.35 * r], r, PATTERN_LAT, PATTERN_LON); });
  return done(mesh, 'bud', { size, berries: BUD_BERRIES.length });
}

function done(mesh, kind, info) {
  const positions = Float64Array.from(mesh.pos), indices = Uint32Array.from(mesh.idx);
  let z1 = 0; for (let i = 2; i < positions.length; i += 3) z1 = Math.max(z1, positions[i]);
  return { kind, positions, indices, parts: mesh.parts, scale: 1, info: { ...info, triangles: indices.length / 3, heightMm: z1 } };
}

export const ELEMENTS = { shell: buildShell, palmette: buildPalmette, rose: buildRose, rosette: buildRosette, bud: buildBud };
export function buildElement(kind, opts = {}) { return ELEMENTS[kind](opts); }

