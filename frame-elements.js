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
/* THE SOFT SHELL (the crest's — Eva on the second sheet: "soften the shell's
   scallops for the crest — rounded lobes, no points"; front-on the crest read
   as a starburst): fewer, broader ribs, and each lobe a ROUND bump — the rim
   follows (cos² + ε)^¼ of the rib phase, flat-topped and full where the rib
   runs out, its notch a short rounded dip (ε keeps the dip from being a cusp)
   — and shallower. */
export const SHELL_SOFT = { ribs: 7, scallop: 0.09, eps: 0.03, rib: 0.07 };
export function shellGrid({ R, size, nu = 30, nv = 88, at = [0, 0], soft = false }) {
  const grid = [];
  const ribs = soft ? SHELL_SOFT.ribs : SHELL_RIBS, fan = SHELL_FAN;
  for (let i = 0; i <= nu; i++) {
    const u = i / nu, row = [];
    for (let j = 0; j <= nv; j++) {
      const th = -fan + 2 * fan * j / nv;
      const phase = (th + fan) / (2 * fan) * ribs * Math.PI;
      const rib = Math.cos(phase) ** 2;               // 1 on a rib's crest, 0 in a groove
      // the rim: lobes on the crests, notches in the grooves
      const lobe = soft ? Math.pow((rib + SHELL_SOFT.eps) / (1 + SHELL_SOFT.eps), 0.25) : rib;
      const rimR = R * (1 - (soft ? SHELL_SOFT.scallop : SHELL_SCALLOP) * (1 - lobe));
      const rho = u * rimR;
      // the ears: below SHELL_EAR of the radius the outline is a straight
      // hinge line, |x| growing linearly, so the fan's root is a flat hinge
      const earW = SHELL_EAR * R;
      const x0 = rho * Math.sin(th), y0 = rho * Math.cos(th);
      const ear = smooth((rho - 0.0) / earW);
      const x = x0 * (0.55 + 0.45 * ear), y = y0 - (1 - ear) * 0.25 * earW * Math.abs(Math.sin(th));
      const dish = size * SHELL_DISH * Math.pow(u, 2.2);
      const ridge = size * (soft ? SHELL_SOFT.rib : SHELL_RIB) * rib * smooth((u - 0.1) / 0.45) * (0.55 + 0.45 * u);
      row.push([at[0] + x, at[1] + y, F + 0.4 + dish + ridge]);
    }
    grid.push(row);
  }
  return grid;
}
export function buildShell({ size = 24, base = false, soft = false } = {}) {
  const mesh = new Mesh(), R = size / 2;
  if (base) slab(mesh, size);
  patchSolid(mesh, shellGrid({ R, size, soft }), 'shell');
  return done(mesh, 'shell', { size, ribs: soft ? SHELL_SOFT.ribs : SHELL_RIBS, soft });
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
export function buildPalmette({ size = 24, base = false, layout = PALMETTE, kind = 'palmette' } = {}) {
  const mesh = new Mesh(), foot = size;
  if (base) slab(mesh, size);
  const rB = layout.boss * foot;
  // the boss: an OBLATE dome (height PALMETTE.bossRise of its radius, a
  // superellipse profile so its shoulder is full and its top flat) on a
  // collar ring a feature high and a quarter wider — a boss, not a ball
  patchSolid(mesh, discGrid([0, 0], rB * 1.25, F + 0.3), 'boss-collar');
  patchSolid(mesh, bossGrid([0, 0], rB, layout.bossRise * rB, F + 0.3), 'boss');
  layout.leaves.forEach((lf, k) => {
    const L = lf.len * foot, W = layout.width * L;
    const g = curvedBladeGrid({ at: [0.3 * rB * Math.sin(lf.angle), rB * 0.6 * Math.cos(lf.angle)], ang: Math.PI / 2 + lf.angle, L, hw: roundedHalf(W, 0.72, 0.85), crown: midribCrown(Math.max(F, layout.crown * W)), flare: lf.flare, tilt: layout.tilt * L, lift: () => F + 0.3, nu: 26, nv: 14 });
    patchSolid(mesh, g, `${kind}-leaf-${k}`);
  });
  return done(mesh, kind, { size, boss: rB });
}

/* a leaf's crown: a raised midrib on a cupped blade (the edges half up). Every
   blade grid scales its crown by the row's half-width over the widest, so a
   tip narrowed to the floor carries no spike — the midrib's width is a share of
   the row's, and on a 1 mm row it was a 130° crest. */
export const midribCrown = (crown) => (u, v) => crown * (0.45 * Math.pow(Math.max(0, 1 - v * v), 0.5) + 0.55 * Math.exp(-((v / 0.22) ** 2))) * (0.7 + 0.3 * Math.sin(Math.PI * Math.min(1, u * 1.1)));
/* an oblate dome: radius r, height h, superellipse profile z = h (1 − (ρ/r)^2.4)^(1/2.4), on seat z0;
   its angular seam (the two coincident columns' walls) on −y, the element's
   own axis — a seam off the axis showed as a crack across a placed boss */
export function bossGrid(c, r, h, z0, nu = 10, nv = 40) {
  const grid = []; for (let i = 0; i <= nu; i++) { const row = []; const q = i / nu, rr = r * q, z = z0 + h * Math.pow(Math.max(0, 1 - Math.pow(q, 2.4)), 1 / 2.4); for (let j = 0; j <= nv; j++) { const a = -Math.PI / 2 + 2 * Math.PI * j / nv; row.push([c[0] + rr * Math.cos(a), c[1] + rr * Math.sin(a), z]); } grid.push(row); } return grid;
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


/* ================================================================== */
/* PLACEMENT (phase 3e, step 3 — the wiring). An element is built about  */
/* its origin by the builders above, untouched, and PLACED by one rigid   */
/* motion in plan and one lift in z: a vertex on the base (z exactly 0,   */
/* every patch column's foot) stays on the base, every other vertex is    */
/* raised by `lift` — so a placed element's columns stand from the back   */
/* all the way up through the molding it sits on, and the two shells      */
/* overlap by construction. The chains' junction motifs (phase 3d) and    */
/* the vine's elements are both made here: ONE primitive each (Eva's      */
/* ruling on §15/16). Charter §17.                                        */
/* ================================================================== */

const elementMemo = new Map();
/* the built element at a size, memoised on (kind, size): pure */
export function elementAt(kind, size, soft = false) {
  const key = `${kind}|${size}|${soft}`;
  if (!elementMemo.has(key)) elementMemo.set(key, buildElement(kind, soft ? { size, soft } : { size }));
  return elementMemo.get(key);
}

/* A part's plan FOOTPRINT: a patch's top-grid boundary loop (the column
   walls stand on it), a bead's equator. Closed (the first point repeated). */
function partLoops(P, parts) {
  return parts.map((pt) => {
    if (pt.kind === 'bead') { const out = []; for (let k = 0; k <= 24; k++) { const a = 2 * Math.PI * k / 24; out.push([pt.c[0] + pt.r * Math.cos(a), pt.c[1] + pt.r * Math.sin(a)]); } return out; }
    const at = (i, j) => { const k = 3 * (pt.base + i * pt.nv + j); return [P[k], P[k + 1]]; };
    const loop = [];
    for (let j = 0; j < pt.nv; j++) loop.push(at(0, j));
    for (let i = 1; i < pt.nu; i++) loop.push(at(i, pt.nv - 1));
    for (let j = pt.nv - 2; j >= 0; j--) loop.push(at(pt.nu - 1, j));
    for (let i = pt.nu - 2; i >= 0; i--) loop.push(at(i, 0));
    return loop;
  });
}

/* Does any point of the element's footprint satisfy `test` (the opening)?
   A patch's boundary is its emitted vertices; a bead's equator is sampled
   at 96 points — a multiple of every coarser sampling a reader takes (the
   loops' own 24, the relief gate's 32), so a bead that clears here clears
   for every one of them (the 24-gon's chords cut inside the 32-gon's
   points by up to 0.017 mm on a 2 mm bead, enough for a placed rosette to
   read as clear here and into the opening there — found by a mutant). */
export function footprintTouches(el, test) {
  for (let i = 0; i < el.parts.length; i++) {
    const pt = el.parts[i];
    if (pt.kind === 'bead') { for (let k = 0; k < 96; k++) { const a = 2 * Math.PI * k / 96; if (test([pt.c[0] + pt.r * Math.cos(a), pt.c[1] + pt.r * Math.sin(a)])) return true; } }
    else if (el.loops[i].some((q) => test(q))) return true;
  }
  return false;
}

/* PLACE: kind at size, rotated by `angle` (its local +y — the axis every
   builder grows along — to the direction angle + π/2), its origin to `at`,
   every non-base vertex raised by `lift`. Positions in print mm with z
   relative to the plate's top (the relief adds plateT to every z > 0). */
export function placeElement(kind, { size, at = [0, 0], angle = 0, lift = 0, soft = false } = {}) {
  const e = elementAt(kind, size, soft);
  const ca = Math.cos(angle), sa = Math.sin(angle), src = e.positions, P = new Float64Array(src.length);
  for (let k = 0; k < src.length; k += 3) {
    const x = src[k], y = src[k + 1], z = src[k + 2];
    P[k] = at[0] + ca * x - sa * y; P[k + 1] = at[1] + sa * x + ca * y; P[k + 2] = z === 0 ? 0 : z + lift;
  }
  const parts = e.parts.map((pt) => (pt.kind === 'bead' ? { ...pt, c: [at[0] + ca * pt.c[0] - sa * pt.c[1], at[1] + sa * pt.c[0] + ca * pt.c[1], pt.c[2] + lift] } : { ...pt }));
  return { kind, size, at, angle, lift, positions: P, indices: e.indices, parts, loops: partLoops(P, parts), flip: false, ...(soft ? { soft: true } : {}) };
}
/* the same element raised to a new lift (the plan untouched) */
export function relift(el, lift) {
  const P = Float64Array.from(el.positions), d = lift - el.lift;
  for (let k = 2; k < P.length; k += 3) if (P[k] !== 0) P[k] += d;
  return { ...el, lift, positions: P, parts: el.parts.map((pt) => (pt.kind === 'bead' ? { ...pt, c: [pt.c[0], pt.c[1], pt.c[2] + d] } : pt)) };
}
/* A placed element's PLAN remapped by f([x, y]) → [x', y'] (z untouched, so
   a base vertex stays on the base and a column stays a column): the crest's
   squash and its drape along the band (frame-vine). f must keep the plan's
   orientation (a positive Jacobian) or the solid turns inside out; a bead's
   centre moves with f and its radius is kept. */
export function remapElement(el, f) {
  const P = Float64Array.from(el.positions);
  for (let k = 0; k < P.length; k += 3) { const q = f([P[k], P[k + 1]]); P[k] = q[0]; P[k + 1] = q[1]; }
  const parts = el.parts.map((pt) => (pt.kind === 'bead' ? { ...pt, c: [...f([pt.c[0], pt.c[1]]), pt.c[2]] } : pt));
  return { ...el, positions: P, parts, loops: partLoops(P, parts), _box: undefined, _edges: undefined };
}
/* A placed element LIFTED VERTEX BY VERTEX by lift([x, y]) (a base vertex
   stays on the base): the crest draped over the band's edge in z as well as
   in plan (frame-vine). Patch parts only — a bead is a rigid sphere. */
export function liftEach(el, lift) {
  if (el.parts.some((pt) => pt.kind === 'bead')) throw new Error('liftEach: an element with a bead');
  const P = Float64Array.from(el.positions); let top = 0;
  for (let k = 0; k < P.length; k += 3) if (P[k + 2] !== 0) { const d = lift([P[k], P[k + 1]]); P[k + 2] += d; top = Math.max(top, d); }
  return { ...el, positions: P, lift: top, liftEach: true };
}
/* THE mirror of a placed element: x negated (the doubles never recomputed),
   the winding reversed by the relief's own orientation pass. */
export function mirrorElement(el) {
  const P = Float64Array.from(el.positions);
  for (let k = 0; k < P.length; k += 3) P[k] = -P[k];
  return { ...el, at: [-el.at[0], el.at[1]], positions: P, parts: el.parts.map((pt) => (pt.kind === 'bead' ? { ...pt, c: [-pt.c[0], pt.c[1], pt.c[2]] } : pt)), loops: el.loops.map((l) => l.map(([x, y]) => [-x, y])), flip: !el.flip, mirrorOf: el, _box: undefined, _edges: undefined };   // the source's cached box and edges are not the mirror's
}
/* AN ELEMENT ON THE AXIS is its own mirror, to the bit. The builders lay
   symmetric elements (the palmette, the shell, the rosette) as mirror
   pairs of blades only to the last bit (cos(π/2 + a) is not −cos(π/2 − a)),
   so every vertex is paired with the vertex at (−x, y, z) within 1e-6 mm
   and the pair set exactly symmetric (the average, x negated; a vertex
   that is its own partner on x = 0). An element with an unpaired vertex is
   NOT symmetric and is returned unchanged with `asymmetric` set (the gate
   reads the emitted bits, never this flag). */
export function symmetrizeElement(el) {
  const P = Float64Array.from(el.positions), n = P.length / 3, q = 1e6;
  const key = (x, y, z) => `${Math.round(x * q)},${Math.round(y * q)},${Math.round(z * q)}`;
  const map = new Map();
  for (let v = 0; v < n; v++) { const k = key(P[3 * v], P[3 * v + 1], P[3 * v + 2]); if (!map.has(k)) map.set(k, []); map.get(k).push(v); }
  const find = (v) => {
    const x = -P[3 * v], y = P[3 * v + 1], z = P[3 * v + 2];
    for (const dx of [0, -1, 1]) for (const dy of [0, -1, 1]) for (const dz of [0, -1, 1]) {
      const k = `${Math.round(x * q) + dx},${Math.round(y * q) + dy},${Math.round(z * q) + dz}`;
      for (const u of map.get(k) || []) if (Math.abs(P[3 * u] - x) < 1e-6 && Math.abs(P[3 * u + 1] - y) < 1e-6 && Math.abs(P[3 * u + 2] - z) < 1e-6) return u;
    }
    return -1;
  };
  // pair every vertex with an UNPAIRED vertex at its mirror image (a vertex on
  // x = 0, or one whose image is itself, pairs with itself); a COINCIDENT
  // vertex left over (a collapsed row repeats a point) copies the final
  // mirror of whichever vertex it found — so every image exists to the bit
  const findFree = (v) => {
    const x = -P[3 * v], y = P[3 * v + 1], z = P[3 * v + 2];
    for (const dx of [0, -1, 1]) for (const dy of [0, -1, 1]) for (const dz of [0, -1, 1]) {
      const k = `${Math.round(x * q) + dx},${Math.round(y * q) + dy},${Math.round(z * q) + dz}`;
      for (const u of map.get(k) || []) if (u !== v && partner[u] < 0 && Math.abs(P[3 * u] - x) < 1e-6 && Math.abs(P[3 * u + 1] - y) < 1e-6 && Math.abs(P[3 * u + 2] - z) < 1e-6) return u;
    }
    return -1;
  };
  const partner = new Int32Array(n).fill(-1);
  for (let v = 0; v < n; v++) {
    if (partner[v] >= 0) continue;
    if (Math.abs(P[3 * v]) < 1e-9) { partner[v] = v; continue; }
    const u = findFree(v); if (u >= 0) { partner[v] = u; partner[u] = v; }
  }
  const out = Float64Array.from(P);
  for (let v = 0; v < n; v++) {
    const u = partner[v];
    if (u === v) { out[3 * v] = 0; continue; }
    if (u < 0 || u < v) continue;
    const x = (P[3 * v] - P[3 * u]) / 2, y = (P[3 * v + 1] + P[3 * u + 1]) / 2, z = (P[3 * v + 2] + P[3 * u + 2]) / 2;
    out[3 * v] = x; out[3 * v + 1] = y; out[3 * v + 2] = z; out[3 * u] = -x; out[3 * u + 1] = y; out[3 * u + 2] = z;
  }
  // a leftover takes the exact mirror of the (final) vertex at its image
  for (let v = 0; v < n; v++) if (partner[v] < 0) { const u = find(v); if (u < 0 || partner[u] < 0) return { ...el, asymmetric: true }; out[3 * v] = -out[3 * u]; out[3 * v + 1] = out[3 * u + 1]; out[3 * v + 2] = out[3 * u + 2]; }
  return { ...el, positions: out, loops: partLoops(out, el.parts), selfMirror: true, _box: undefined, _edges: undefined };
}

const segD = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
const inLoop = (pt, poly) => { let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) ins = !ins; } return ins; };
const boxOfLoops = (el) => { if (el._box) return el._box; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const l of el.loops) for (const [x, y] of l) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return (el._box = { x0, y0, x1, y1 }); };
/* The element's footprint is the UNION of its parts' loops; its boundary is
   every loop edge that lies outside every OTHER loop (an edge buried in a
   neighbouring petal is interior to the union). Computed once per placed
   element (cached on it). */
function unionEdges(el) {
  if (el._edges) return el._edges;
  const edges = [];
  el.loops.forEach((l, li) => {
    const out = l.map((q) => !el.loops.some((m, mi) => mi !== li && inLoop(q, m)));
    for (let k = 0; k < l.length - 1; k++) if (out[k] || out[k + 1]) edges.push([l[k], l[k + 1]]);
  });
  return (el._edges = edges);
}
/* The signed DEPTH of a plan point in an element's footprint (the union of
   its parts' loops): inside, the distance to the union's boundary; outside,
   minus it. Beyond `reach` of the element's box, minus the box distance. */
export function elementDepth(el, q, reach = Infinity) {
  const B = boxOfLoops(el);
  const gx = Math.max(0, B.x0 - q[0], q[0] - B.x1), gy = Math.max(0, B.y0 - q[1], q[1] - B.y1);
  if (Math.hypot(gx, gy) > reach) return -Math.hypot(gx, gy);
  let d = Infinity; for (const [a, b] of unionEdges(el)) d = Math.min(d, segD(q, a, b));
  return el.loops.some((l) => inLoop(q, l)) ? d : -d;
}
/* A wire against an element: per station the CLEARANCE (the plan gap from
   the wire's edge to the footprint, negative an overlap); the runs within
   a feature, each of which must reach an overlap of `need` (a JOINT) or it
   is a GRAZE. Returns { clear: the least clearance, graze: the worst run
   that does not reach `need` (−Infinity when none) }. */
export function wireElementContact(c, el, need, F = MIN_FEATURE_MM) {
  let clear = Infinity, graze = -Infinity, run = null;
  const wAt = (i) => (c.w ? c.w[i] : c.info.wire);
  c.pts.forEach((q, i) => {
    const cl = -elementDepth(el, q, F + 2 * wAt(i)) - wAt(i) / 2;
    clear = Math.min(clear, cl);
    if (cl < F) { if (!run) run = { min: cl }; run.min = Math.min(run.min, cl); }
    else if (run) { if (run.min > -need) graze = Math.max(graze, run.min); run = null; }
  });
  if (run && run.min > -need) graze = Math.max(graze, run.min);
  return { clear, graze };
}
/* Two elements: the least plan clearance between their footprints (the
   loops' vertices against the other's loops), negative an overlap. */
export function elementClear(a, b) {
  const A = boxOfLoops(a), B = boxOfLoops(b);
  const gx = Math.max(0, A.x0 - B.x1, B.x0 - A.x1), gy = Math.max(0, A.y0 - B.y1, B.y0 - A.y1);
  if (gx > 0 || gy > 0) return Math.hypot(gx, gy);
  let m = Infinity;
  for (const l of a.loops) for (const q of l) m = Math.min(m, -elementDepth(b, q));
  for (const l of b.loops) for (const q of l) m = Math.min(m, -elementDepth(a, q));
  return m;
}
