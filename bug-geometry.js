/* bug-geometry.js — the Parametric Bug's ONE model, and both exporters.

   ARCHITECTURE LAW (bug-project-design-doc.md §1): one 3D model is the single
   source of truth. buildBug(params) returns it; exportStl(model) and
   exportSvg(model) read it and NOTHING else — neither takes the parameters, so
   the two exports cannot be two drawings of two different bugs. The SVG is the
   top-down projection of the model's own triangles (the contour generator of
   each closed part), never a second 2D geometry path.

   Pure ES module: no three.js, no DOM. Runs in Node (tools/verify-bug.mjs) and
   in the page (bug.js). Units are millimetres; x = right, y = forward (head),
   z = up.

   SYMMETRY: only the right half (+x) is generated. Every R part is mirrored
   (x -> -x, winding reversed) into an L part; the axial body loft is built from
   half-rings mirrored the same way, with x = 0 written as +0 so an axial
   vertex's mirror is itself. mirrorDiff() checks the identity on the emitted
   triangles as exact doubles. */

const D2R = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const mx = (x) => (x === 0 ? 0 : -x);          // mirror, keeping +0 on the plane

/* ------------------------------------------------------------------ */
/* Constants (derived quantities, not controls — each says why)        */
/* ------------------------------------------------------------------ */

export const MIN_DIAMETER_DEFAULT = 1.0;   // SLS PA12 unsupported-wire minimum (CLAUDE.md / flower-project). A declared guess: nothing here is printed.
const RING_HALF = 16;                       // body ring: 16 segments per half -> 32 around
const BODY_STEP_MM = 0.25;                  // station spacing along the body axis
const TUBE_SIDES = 10;
/* A tube's floor is on its INSCRIBED radius — the polygon a printer gets —
   so the vertex radius is the floor divided by cos(pi / sides). */
const tubeFloorR = (p) => p.minDiameter / 2 / Math.cos(Math.PI / TUBE_SIDES);
const WING_ROWS = 44;                       // span rows (graded toward the apex)
const WING_COLS = 12;                       // chord columns
const WING_LEAD_SHARE = 0.35;               // chord ahead of the span line: the costa carries little chord
const WING_ROOT_F = 0.28;                   // root chord as a fraction of the max chord
const SCALLOP_FROM = 0.3;                   // scallops run over the outer 70% of the span
const TAIL_AT = 0.78;                       // hindwing tail root, fraction of span
const TAIL_ANGLE = 20 * D2R;                // tail points backward, 20 deg outward
const BAND_DEPTH = 0.14;                    // abdomen constriction depth when banding is on
const ABD_DEPTH_RATIO = 0.9;
const ABD_PEAK = 0.3;                      // abdomen widest at 30% of its length                // abdomen depth / width
const HEAD_DEPTH_RATIO = 0.9;
const LEG_ROOT_FRAC = 0.44;                 // leg root DIAMETER / thorax half-width
const ANT_ROOT_FRAC = 0.10;                 // antenna root diameter / head size

/* ------------------------------------------------------------------ */
/* Parameter declaration — the ONE place a control is defined          */
/* ------------------------------------------------------------------ */

export const SECTIONS = [
  { id: 'plan', label: 'Body plan', open: true },
  { id: 'head', label: 'Head' },
  { id: 'thorax', label: 'Thorax' },
  { id: 'abdomen', label: 'Abdomen' },
  { id: 'legs', label: 'Legs' },
  { id: 'antennae', label: 'Antennae' },
  { id: 'wings', label: 'Wings' },
  { id: 'pair1', label: 'Pair 1 — forewings', parent: 'wings' },
  { id: 'pair2', label: 'Pair 2 — hindwings', parent: 'wings' },
  { id: 'tail', label: 'Hindwing tail', parent: 'pair2' },
  { id: 'print', label: 'Print' },
];

const isInsect = (p) => p.bodyPlan === 'insect';
const hasLegs = (p) => p.legPairs > 0 && p.legsVisible;
const hasAnt = (p) => p.antennaType !== 'none';
const has1 = (p) => p.wingPairs >= 1;
const has2 = (p) => p.wingPairs >= 2;

const R = (id, section, label, min, max, step, def, unit = '', visibleWhen) =>
  ({ id, section, label, kind: 'range', min, max, step, default: def, unit, visibleWhen });

export const PARAM_SPEC = [
  { id: 'bodyPlan', section: 'plan', label: 'Plan', kind: 'choice', default: 'insect',
    options: [['insect', 'Insect — 3 part'], ['spider', 'Spider — 2 part']] },
  R('roundness', 'plan', 'Cross-section roundness', 1.5, 6, 0.1, 2.0, '', null),

  R('headSize', 'head', 'Head size', 2, 12, 0.1, 4.2, 'mm', isInsect),

  R('thoraxLength', 'thorax', 'Length', 3, 20, 0.1, 8, 'mm'),
  R('thoraxWidth', 'thorax', 'Width', 2.5, 14, 0.1, 5.2, 'mm'),
  R('thoraxDepth', 'thorax', 'Depth', 2.5, 14, 0.1, 5.2, 'mm'),

  R('abdomenLength', 'abdomen', 'Length', 2, 70, 0.5, 17, 'mm'),
  R('abdomenWidth', 'abdomen', 'Width', 1.5, 18, 0.1, 3.8, 'mm'),
  R('abdomenTaper', 'abdomen', 'Taper', 0, 1, 0.01, 0.55),
  R('abdomenSegments', 'abdomen', 'Segment count', 1, 12, 1, 7),
  { id: 'banding', section: 'abdomen', label: 'Banding', kind: 'bool', default: true },

  R('legPairs', 'legs', 'Pairs', 0, 4, 1, 3),
  { id: 'legsVisible', section: 'legs', label: 'Visible', kind: 'bool', default: true },
  R('coxa', 'legs', 'Coxa', 0.5, 5, 0.1, 1.2, 'mm', hasLegs),
  R('femur', 'legs', 'Femur', 1, 20, 0.1, 5, 'mm', hasLegs),
  R('tibia', 'legs', 'Tibia', 1, 20, 0.1, 5.5, 'mm', hasLegs),
  R('tarsus', 'legs', 'Tarsus', 0.5, 15, 0.1, 4, 'mm', hasLegs),
  R('legSplay', 'legs', 'Splay', 0, 70, 1, 35, '°', hasLegs),
  R('legBend', 'legs', 'Joint bend', 0, 90, 1, 45, '°', hasLegs),
  R('legTaper', 'legs', 'Taper', 0, 0.9, 0.01, 0.5, '', hasLegs),

  { id: 'antennaType', section: 'antennae', label: 'Type', kind: 'choice', default: 'clubbed',
    options: [['clubbed', 'Clubbed'], ['feathered', 'Feathered'], ['filiform', 'Filiform'], ['bristle', 'Bristle'], ['none', 'None']] },
  R('antennaLength', 'antennae', 'Length', 1, 40, 0.5, 16, 'mm', hasAnt),
  R('antennaCurl', 'antennae', 'Curl', -120, 180, 1, 10, '°', hasAnt),
  R('antennaSpread', 'antennae', 'Spread', 0, 80, 1, 22, '°', hasAnt),

  R('wingPairs', 'wings', 'Pairs', 0, 2, 1, 2),
  R('wingOverlap', 'wings', 'Overlap between pairs', 0, 1, 0.01, 0.6, '', has2),

  R('w1Length', 'pair1', 'Length', 5, 60, 0.5, 34, 'mm', has1),
  R('w1Aspect', 'pair1', 'Aspect ratio', 1, 8, 0.05, 1.7, '', has1),
  R('w1Sweep', 'pair1', 'Sweep', -30, 70, 1, -6, '°', has1),
  R('w1Widest', 'pair1', 'Widest point', 0.3, 0.9, 0.01, 0.74, '', has1),
  R('w1Apex', 'pair1', 'Apex roundness', 0.6, 3, 0.05, 1.6, '', has1),
  R('w1Scallop', 'pair1', 'Scallop depth', 0, 0.4, 0.01, 0, '', has1),
  R('w1ScallopCount', 'pair1', 'Scallop count', 2, 12, 1, 6, '', (p) => has1(p) && p.w1Scallop > 0),
  R('w1Thickness', 'pair1', 'Thickness (STL)', 0.6, 4, 0.05, 1.2, 'mm', has1),
  R('w1Dihedral', 'pair1', 'Tilt — dihedral', -60, 80, 1, 15, '°', has1),
  R('w1Pitch', 'pair1', 'Tilt — pitch', -45, 45, 1, 0, '°', has1),

  R('w2Size', 'pair2', 'Size ratio to pair 1', 0.3, 1.3, 0.01, 0.82, '', has2),
  R('w2Aspect', 'pair2', 'Aspect ratio', 1, 8, 0.05, 1.25, '', has2),
  R('w2Sweep', 'pair2', 'Sweep', -30, 70, 1, 42, '°', has2),
  R('w2Widest', 'pair2', 'Widest point', 0.3, 0.9, 0.01, 0.6, '', has2),
  R('w2Apex', 'pair2', 'Apex roundness', 0.6, 3, 0.05, 2.2, '', has2),
  R('w2Scallop', 'pair2', 'Scallop depth', 0, 0.4, 0.01, 0.12, '', has2),
  R('w2ScallopCount', 'pair2', 'Scallop count', 2, 12, 1, 6, '', (p) => has2(p) && p.w2Scallop > 0),
  R('w2Thickness', 'pair2', 'Thickness (STL)', 0.6, 4, 0.05, 1.2, 'mm', has2),
  R('w2Dihedral', 'pair2', 'Tilt — dihedral', -60, 80, 1, 10, '°', has2),
  R('w2Pitch', 'pair2', 'Tilt — pitch', -45, 45, 1, 0, '°', has2),
  R('tailLength', 'tail', 'Length', 0, 30, 0.5, 9, 'mm', has2),
  R('tailWidth', 'tail', 'Width', 0.5, 6, 0.1, 2.4, 'mm', (p) => has2(p) && p.tailLength > 0),
  R('tailClub', 'tail', 'Club', 0, 1, 0.01, 0.5, '', (p) => has2(p) && p.tailLength > 0),

  R('minDiameter', 'print', 'Min feature diameter (STL floor)', 0.6, 2, 0.05, MIN_DIAMETER_DEFAULT, 'mm'),
];

export const DEFAULTS = Object.fromEntries(PARAM_SPEC.map((s) => [s.id, s.default]));

/* ------------------------------------------------------------------ */
/* Presets — readable deltas over DEFAULTS                              */
/* ------------------------------------------------------------------ */

export const PRESETS = {
  butterfly: {},                                     // the defaults ARE the butterfly
  moth: {
    headSize: 4.2, thoraxLength: 8.5, thoraxWidth: 7, thoraxDepth: 6.5,
    abdomenLength: 17, abdomenWidth: 5.6, abdomenTaper: 0.45, abdomenSegments: 8, roundness: 2.2,
    femur: 4.5, tibia: 4.5, tarsus: 3.5, legSplay: 40, legBend: 50,
    antennaType: 'feathered', antennaLength: 12, antennaCurl: -15, antennaSpread: 34,
    w1Length: 30, w1Aspect: 2.5, w1Sweep: 26, w1Widest: 0.86, w1Apex: 1.05, w1Dihedral: 6,
    w2Size: 0.72, w2Aspect: 1.55, w2Sweep: 38, w2Widest: 0.62, w2Apex: 2.6, w2Scallop: 0,
    w2Dihedral: 4, tailLength: 0, wingOverlap: 0.75,
  },
  dragonfly: {
    headSize: 7.2, thoraxLength: 10, thoraxWidth: 6, thoraxDepth: 7.5,
    abdomenLength: 52, abdomenWidth: 3.0, abdomenTaper: 0.3, abdomenSegments: 10, roundness: 2.0,
    coxa: 1, femur: 3.5, tibia: 4, tarsus: 2.5, legSplay: 30, legBend: 55,
    antennaType: 'bristle', antennaLength: 3, antennaCurl: 0, antennaSpread: 30,
    w1Length: 42, w1Aspect: 6.2, w1Sweep: -4, w1Widest: 0.55, w1Apex: 2.0, w1Dihedral: 2, w1Pitch: 4,
    w2Size: 0.98, w2Aspect: 4.6, w2Sweep: 6, w2Widest: 0.36, w2Apex: 2.0, w2Scallop: 0,
    w2Dihedral: 2, w2Pitch: 4, tailLength: 0, wingOverlap: 0.15,
  },
  spider: {
    bodyPlan: 'spider', roundness: 2.0,
    thoraxLength: 10, thoraxWidth: 9, thoraxDepth: 5.5,
    abdomenLength: 15, abdomenWidth: 12, abdomenTaper: 0.15, abdomenSegments: 1, banding: false,
    legPairs: 4, coxa: 2, femur: 12, tibia: 11, tarsus: 9, legSplay: 52, legBend: 62, legTaper: 0.6,
    antennaType: 'none', wingPairs: 0,
  },
};

export function presetParams(name) {
  return { ...DEFAULTS, ...PRESETS[name] };
}

/* mulberry32 — the page's "random" button and the contact sheet share it. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Every slider uniform across its own declared range, every choice uniform.
   The floor is left at its default: a random floor would make random bugs a
   test of the floor rather than of the generator. */
export function randomParams(seed) {
  const r = rng(seed);
  const p = {};
  for (const s of PARAM_SPEC) {
    if (s.id === 'minDiameter') { p[s.id] = s.default; continue; }
    if (s.kind === 'range') {
      const n = Math.round((s.max - s.min) / s.step);
      p[s.id] = +(s.min + Math.round(r() * n) * s.step).toFixed(6);
    } else if (s.kind === 'choice') p[s.id] = s.options[Math.floor(r() * s.options.length)][0];
    else p[s.id] = r() < 0.5 ? false : true;
  }
  p.legsVisible = true;            // a random bug with hidden legs photographs a mislabelled preset
  return p;
}

/* ------------------------------------------------------------------ */
/* Mesh accumulator                                                     */
/* ------------------------------------------------------------------ */

class Acc {
  constructor() { this.pos = []; this.idx = []; this.parts = []; this.cur = null; }
  begin(name, kind, side) {
    this.cur = { name, kind, side, v0: this.pos.length / 3, t0: this.idx.length / 3, meta: {} };
    return this.cur;
  }
  v(p) { this.pos.push(p[0], p[1], p[2]); return this.pos.length / 3 - 1; }
  tri(a, b, c) { this.idx.push(a, b, c); }
  quad(a, b, c, d) { this.idx.push(a, b, c, a, c, d); }
  end() {
    const c = this.cur;
    c.v1 = this.pos.length / 3; c.t1 = this.idx.length / 3;
    // Orientation: a closed part is made outward by its own signed volume.
    if (signedVolume(this.pos, this.idx, c.t0, c.t1) < 0) {
      for (let t = c.t0; t < c.t1; t++) { const k = 3 * t; const s = this.idx[k + 1]; this.idx[k + 1] = this.idx[k + 2]; this.idx[k + 2] = s; }
    }
    this.parts.push(c); this.cur = null; return c;
  }
}

function signedVolume(pos, idx, t0, t1) {
  let v = 0;
  for (let t = t0; t < t1; t++) {
    const a = 3 * idx[3 * t], b = 3 * idx[3 * t + 1], c = 3 * idx[3 * t + 2];
    const ax = pos[a], ay = pos[a + 1], az = pos[a + 2];
    const bx = pos[b], by = pos[b + 1], bz = pos[b + 2];
    const cx = pos[c], cy = pos[c + 1], cz = pos[c + 2];
    v += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  return v / 6;
}
export { signedVolume };

/* ------------------------------------------------------------------ */
/* Closed primitives                                                    */
/* ------------------------------------------------------------------ */

function frameFor(d) {
  const up = Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const u = norm(cross(d, up));
  return [u, cross(u, d)];
}

/* Rings joined by quads, closed by a flat fan at each end. ringsMeta records
   each ring's vertex range so the gate can MEASURE its diameter off the
   emitted vertices. */
function loftRings(acc, rings, capA, capB, symHalf = 0) {
  const n = rings[0].length;
  const ids = rings.map((ring) => ring.map((p) => acc.v(p)));
  for (let i = 0; i + 1 < ids.length; i++) {
    for (let j = 0; j < n; j++) {
      const j1 = (j + 1) % n;
      const a = ids[i][j], b = ids[i + 1][j], c = ids[i + 1][j1], d = ids[i][j1];
      // A mirrored ring (symHalf > 0) takes the MIRRORED diagonal on its left
      // half, so the quad's two triangles are each other's reflection rather
      // than the same split reflected into a different split.
      if (symHalf && j >= symHalf) { acc.tri(a, b, d); acc.tri(b, c, d); }
      else acc.quad(a, b, c, d);
    }
  }
  const cA = acc.v(capA), cB = acc.v(capB);
  for (let j = 0; j < n; j++) {
    const j1 = (j + 1) % n;
    acc.tri(cA, ids[0][j], ids[0][j1]);       // twin of the side quad's ring-0 edge j1 -> j
    const L = ids[ids.length - 1];
    acc.tri(cB, L[j1], L[j]);                  // twin of the last ring's edge j -> j1
  }
  return ids;
}

function ringAround(c, u, v, r, sides) {
  const out = [];
  for (let k = 0; k < sides; k++) {
    const a = (2 * Math.PI * k) / sides;
    out.push(add(c, add(mul(u, r * Math.cos(a)), mul(v, r * Math.sin(a)))));
  }
  return out;
}

function frustum(acc, p0, p1, r0, r1, meta) {
  const d = norm(sub(p1, p0));
  const [u, v] = frameFor(d);
  const ids = loftRings(acc, [ringAround(p0, u, v, r0, TUBE_SIDES), ringAround(p1, u, v, r1, TUBE_SIDES)], p0, p1);
  if (meta) meta.push(...ids.map((r) => [r[0], r.length]));
}

function ellipsoid(acc, c, axes, radii, nLat = 8, nLon = 14) {
  const [a1, a2, a3] = axes;
  const pt = (phi, th) => add(c, add(add(
    mul(a1, radii[0] * Math.cos(phi) * Math.cos(th)),
    mul(a2, radii[1] * Math.cos(phi) * Math.sin(th))),
    mul(a3, radii[2] * Math.sin(phi))));
  const S = acc.v(add(c, mul(a3, -radii[2]))), N = acc.v(add(c, mul(a3, radii[2])));
  const rows = [];
  for (let i = 1; i < nLat; i++) {
    const phi = -Math.PI / 2 + (Math.PI * i) / nLat;
    const row = [];
    for (let k = 0; k < nLon; k++) row.push(acc.v(pt(phi, (2 * Math.PI * k) / nLon)));
    rows.push(row);
  }
  for (let k = 0; k < nLon; k++) {
    const k1 = (k + 1) % nLon;
    acc.tri(S, rows[0][k1], rows[0][k]);
    const L = rows[rows.length - 1];
    acc.tri(N, L[k], L[k1]);
    for (let i = 0; i + 1 < rows.length; i++) acc.quad(rows[i][k], rows[i][k1], rows[i + 1][k1], rows[i + 1][k]);
  }
}
const sphere = (acc, c, r) => ellipsoid(acc, c, [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [r, r, r]);

/* A tube along a polyline with parallel-transport frames. */
function tubeAlong(acc, pts, radii, meta) {
  const n = pts.length;
  const T = pts.map((_, i) => norm(sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)])));
  let [N] = frameFor(T[0]);
  const rings = [];
  for (let i = 0; i < n; i++) {
    if (i > 0) N = norm(sub(N, mul(T[i], dot(N, T[i]))));
    const B = cross(T[i], N);
    rings.push(ringAround(pts[i], N, B, radii[i], TUBE_SIDES));
  }
  const ids = loftRings(acc, rings, pts[0], pts[n - 1]);
  if (meta) meta.push(...ids.map((r) => [r[0], r.length]));
  return T;
}

/* A structured slab: grid[i][j] = [u, w] in a planform frame, deformed by W.
   Top face, bottom face and a rim walked once round the perimeter in the top
   face's own boundary direction, so the winding is consistent before end()
   makes it outward. thickPairs records (top, bottom) vertex pairs so the gate
   can measure the emitted thickness. */
function slab(acc, grid, half, W, part) {
  const nr = grid.length, nc = grid[0].length;
  const T = [], B = [];
  for (let i = 0; i < nr; i++) {
    T.push([]); B.push([]);
    for (let j = 0; j < nc; j++) {
      const [u, w] = grid[i][j];
      T[i].push(acc.v(W(u, w, +half)));
      B[i].push(acc.v(W(u, w, -half)));
    }
  }
  for (let i = 0; i + 1 < nr; i++) for (let j = 0; j + 1 < nc; j++) {
    acc.quad(T[i][j], T[i + 1][j], T[i + 1][j + 1], T[i][j + 1]);
    acc.quad(B[i][j], B[i][j + 1], B[i + 1][j + 1], B[i + 1][j]);
  }
  const loop = [];
  for (let i = 0; i < nr - 1; i++) loop.push([i, 0]);
  for (let j = 0; j < nc - 1; j++) loop.push([nr - 1, j]);
  for (let i = nr - 1; i > 0; i--) loop.push([i, nc - 1]);
  for (let j = nc - 1; j > 0; j--) loop.push([0, j]);
  for (let k = 0; k < loop.length; k++) {
    const [pi, pj] = loop[k], [qi, qj] = loop[(k + 1) % loop.length];
    acc.quad(T[qi][qj], T[pi][pj], B[pi][pj], B[qi][qj]);
  }
  part.meta.thickPairs = [];
  for (let i = 0; i < nr; i += 4) for (let j = 0; j < nc; j += 3) part.meta.thickPairs.push([T[i][j], B[i][j]]);
}

/* ------------------------------------------------------------------ */
/* Body                                                                 */
/* ------------------------------------------------------------------ */

/* The abdomen's width envelope along s in [0, 1] (base -> tip). */
function abdomenEnvelope(s, taper, segs, banding) {
  if (s <= 0 || s >= 1) return 0;
  // An egg: a quarter-ellipse rise to the widest point at ABD_PEAK, then an
  // ellipse fall that the taper pulls to a point (0 = round end, 1 = spike).
  let f;
  if (s < ABD_PEAK) f = Math.sqrt(1 - ((ABD_PEAK - s) / ABD_PEAK) ** 2);
  else { const u = (s - ABD_PEAK) / (1 - ABD_PEAK); f = Math.sqrt(Math.max(0, 1 - u * u)) * (1 - taper * u); }
  if (banding && segs > 1) {
    const sig = 0.16 / segs;
    let notch = 0;
    for (let k = 1; k < segs; k++) notch = Math.max(notch, Math.exp(-(((s - k / segs) / sig) ** 2)));
    f *= 1 - BAND_DEPTH * notch;
  }
  return f;
}

/* Layout of the body along y, read by the body builder AND by every part that
   attaches to it (one owner of where the thorax, head and abdomen are). */
function bodyLayout(p) {
  const Lt = p.thoraxLength, rt = p.thoraxWidth / 2, dt = p.thoraxDepth / 2;
  const L = { Lt, rt, dt, insect: p.bodyPlan === 'insect' };
  L.thorax = { y0: -Lt / 2, y1: Lt / 2 };
  if (L.insect) {
    L.Rh = p.headSize / 2;
    L.yh = Lt / 2 + L.Rh * 0.55;                     // the head overlaps the thorax front
  }
  const ov = (L.insect ? 0.12 : 0.04) * Lt;          // a spider's pedicel is a real waist
  L.yA0 = -Lt / 2 + ov;
  L.yA1 = L.yA0 - p.abdomenLength;
  L.ra = p.abdomenWidth / 2;
  L.yMax = L.insect ? L.yh + L.Rh : Lt / 2;
  L.yMin = L.yA1;
  L.waistR = L.insect ? Math.max(p.minDiameter / 2, 0.42 * Math.min(rt, L.ra, dt))
                      : Math.max(p.minDiameter / 2, 0.16 * Math.min(rt, L.ra) + 0.3);
  return L;
}

function profileAt(p, L, y) {
  let rx = 0, rz = 0;
  const t = Math.abs(y) / (L.Lt / 2);
  if (t < 1) { const k = Math.sqrt(1 - t * t); rx = L.rt * k; rz = L.dt * k; }
  if (L.insect) {
    const h = (y - L.yh) / L.Rh;
    if (Math.abs(h) < 1) { const k = Math.sqrt(1 - h * h); rx = Math.max(rx, L.Rh * k); rz = Math.max(rz, L.Rh * HEAD_DEPTH_RATIO * k); }
  }
  const s = (L.yA0 - y) / (L.yA0 - L.yA1);
  const f = abdomenEnvelope(s, p.abdomenTaper, p.abdomenSegments, p.banding);
  if (f > 0) { rx = Math.max(rx, L.ra * f); rz = Math.max(rz, L.ra * ABD_DEPTH_RATIO * f); }
  // Junction floor: only inside the run between the head's middle and the
  // abdomen's middle, so it can only act on a neck or a waist, never on a pole.
  const front = L.insect ? L.yh : L.Lt / 4, back = L.yA0 - 0.5 * (L.yA0 - L.yA1);
  if (y < front && y > back) { rx = Math.max(rx, L.waistR); rz = Math.max(rz, L.waistR); }
  return [rx, rz];
}

function superRing(y, rx, rz, n, z0 = 0) {
  // right half from bottom (-90) to top (+90), then the mirrored interior
  const e = 2 / n, half = [];
  for (let k = 0; k <= RING_HALF; k++) {
    const a = -Math.PI / 2 + (Math.PI * k) / RING_HALF;
    const c = Math.cos(a), s = Math.sin(a);
    const x = (k === 0 || k === RING_HALF) ? 0 : rx * Math.pow(Math.abs(c), e);
    const z = (k === 0 ? -rz : k === RING_HALF ? rz : Math.sign(s) * rz * Math.pow(Math.abs(s), e));
    half.push([x, y, z + z0]);
  }
  const ring = half.slice();
  for (let k = RING_HALF - 1; k >= 1; k--) ring.push([mx(half[k][0]), half[k][1], half[k][2]]);
  return ring;
}

function buildBody(acc, p, L) {
  const part = acc.begin('body', 'body', 'C');
  const N = Math.max(24, Math.ceil((L.yMax - L.yMin) / BODY_STEP_MM));
  const rings = [], ys = [];
  for (let i = 1; i < N; i++) {
    const y = L.yMin + ((L.yMax - L.yMin) * i) / N;
    const [rx, rz] = profileAt(p, L, y);
    rings.push(superRing(y, Math.max(rx, 0.02), Math.max(rz, 0.02), p.roundness));
    ys.push(y);
  }
  // rings run tail -> head; loftRings wants the caps at the matching ends
  const ids = loftRings(acc, rings, [0, L.yMin, 0], [0, L.yMax, 0], RING_HALF);
  part.meta.rings = ids.map((r, i) => ({ v0: r[0], n: r.length, y: ys[i] }));
  // band rings for the SVG's segment lines: the ring nearest each boundary
  part.meta.bands = [];
  if (p.banding && p.abdomenSegments > 1) {
    for (let k = 1; k < p.abdomenSegments; k++) {
      const yb = L.yA0 - (k / p.abdomenSegments) * (L.yA0 - L.yA1);
      let best = 0;
      for (let i = 1; i < ys.length; i++) if (Math.abs(ys[i] - yb) < Math.abs(ys[best] - yb)) best = i;
      part.meta.bands.push(part.meta.rings[best].v0);
    }
  }
  acc.end();
}

/* ------------------------------------------------------------------ */
/* Wings                                                                */
/* ------------------------------------------------------------------ */

function chordProfile(t, widest, apex) {
  if (t <= 0) return WING_ROOT_F;
  if (t < widest) return WING_ROOT_F + (1 - WING_ROOT_F) * Math.sin((Math.PI / 2) * (t / widest));
  const s = Math.min(1, (t - widest) / (1 - widest));
  return Math.pow(Math.max(0, 1 - Math.pow(s, apex)), 1 / apex);
}

function scallopCut(t, depth, count) {
  if (depth <= 0 || t <= SCALLOP_FROM) return 0;
  const f = (count * (t - SCALLOP_FROM)) / (1 - SCALLOP_FROM);
  const ramp = Math.min(1, (t - SCALLOP_FROM) / 0.08);
  return depth * ramp * (1 - Math.sqrt(Math.abs(Math.sin(Math.PI * f))));   // round lobes, sharp notches
}

/* The wing transform: planform (u span, w chord, h normal offset) -> world.
   sweep (yaw in plane, + = backward) -> pitch (about the swept span axis,
   growing from 0 at the hinge to full at the tip, + = leading edge up) ->
   dihedral (about the body axis through the hinge, + = tip up) -> hinge. */
function wingTransform(hinge, span, sweepDeg, pitchDeg, dihedralDeg) {
  const sw = sweepDeg * D2R, dh = dihedralDeg * D2R;
  const s = [Math.cos(sw), -Math.sin(sw), 0];
  const c = [Math.sin(sw), Math.cos(sw), 0];
  const cd = Math.cos(dh), sd = Math.sin(dh);
  return (u, w, h) => {
    const a = pitchDeg * D2R * clamp(u / span, 0, 1);
    const ca = Math.cos(a), sa = Math.sin(a);
    // c' = c cos a + z sin a ; z' = z cos a - c sin a
    const x = u * s[0] + w * c[0] * ca - h * c[0] * sa;
    const y = u * s[1] + w * c[1] * ca - h * c[1] * sa;
    const z = w * sa + h * ca;
    return [hinge[0] + x * cd - z * sd, hinge[1] + y, hinge[2] + x * sd + z * cd];
  };
}

function buildWing(acc, p, L, which) {
  const one = which === 1;
  const span = one ? p.w1Length : p.w1Length * p.w2Size;
  const aspect = one ? p.w1Aspect : p.w2Aspect;
  const widest = one ? p.w1Widest : p.w2Widest;
  const apex = one ? p.w1Apex : p.w2Apex;
  const scal = one ? p.w1Scallop : p.w2Scallop;
  const scalN = one ? p.w1ScallopCount : p.w2ScallopCount;
  const thick = Math.max(p.minDiameter, one ? p.w1Thickness : p.w2Thickness);
  const chord = span / aspect;

  // Hinge on the thorax's upper side, inside the body. Pair 2 sits behind
  // pair 1 by (1 - overlap) of 60% of the thorax, and a thickness lower so the
  // two pairs stack rather than share a plane.
  const yF = 0.18 * L.Lt;
  const yH = one ? yF : yF - (1 - p.wingOverlap) * 0.6 * L.Lt;
  const k = Math.sqrt(Math.max(0, 1 - (yH / (L.Lt / 2)) ** 2));
  const hinge = [0.5 * L.rt * k, yH, 0.5 * L.dt * k - (one ? 0 : thick)];
  const embed = Math.max(0.6 * L.rt * k, thick);
  const W = wingTransform(hinge, span, one ? p.w1Sweep : p.w2Sweep, one ? p.w1Pitch : p.w2Pitch,
                          one ? p.w1Dihedral : p.w2Dihedral);
  const minW = p.minDiameter;

  const halfChords = (t) => {
    const f = chordProfile(t, widest, apex);
    let lead = WING_LEAD_SHARE * chord * f;
    let trail = (1 - WING_LEAD_SHARE) * chord * f * (1 - scallopCut(t, scal, scalN));
    if (lead + trail < minW) { const g = minW / Math.max(lead + trail, 1e-9); if (lead + trail < 1e-9) { lead = minW * WING_LEAD_SHARE; trail = minW - lead; } else { lead *= g; trail *= g; } }
    return [lead, trail];
  };

  const rows = [-embed / span];
  for (let i = 0; i <= WING_ROWS; i++) rows.push(1 - Math.pow(1 - i / WING_ROWS, 1.4));
  const grid = rows.map((t) => {
    const [lead, trail] = halfChords(t);
    const row = [];
    for (let j = 0; j <= WING_COLS; j++) row.push([t * span, lerp(-trail, lead, j / WING_COLS)]);
    return row;
  });
  const part = acc.begin(one ? 'forewing' : 'hindwing', one ? 'wing1' : 'wing2', 'R');
  slab(acc, grid, thick / 2, W, part);
  part.meta.thickness = thick;
  acc.end();

  if (!one && p.tailLength > 0) {
    const tw = Math.max(minW, p.tailWidth);
    const [, trailAt] = halfChords(TAIL_AT);
    const d = [Math.sin(TAIL_ANGLE), -Math.cos(TAIL_ANGLE)];
    const q = [Math.cos(TAIL_ANGLE), Math.sin(TAIL_ANGLE)];
    const base = [TAIL_AT * span - d[0] * tw, -trailAt - d[1] * tw];   // starts inside the wing
    const Lq = p.tailLength + tw;
    const NQ = 24, NV = 6;
    const tg = [];
    for (let i = 0; i <= NQ; i++) {
      const s = i / NQ;
      let hw = (tw / 2) * (1 - 0.35 * s) * (1 + p.tailClub * 1.6 * Math.exp(-(((s - 0.86) / 0.1) ** 2)));
      if (s > 0.86) hw *= Math.sqrt(Math.max(0, 1 - ((s - 0.86) / 0.14) ** 2));
      hw = Math.max(hw, minW / 2);
      const cx = base[0] + d[0] * s * Lq, cy = base[1] + d[1] * s * Lq;
      const row = [];
      for (let j = 0; j <= NV; j++) { const v = lerp(-hw, hw, j / NV); row.push([cx + q[0] * v, cy + q[1] * v]); }
      tg.push(row);
    }
    const tp = acc.begin('tail', 'tail', 'R');
    const tthick = Math.max(minW, 0.9 * thick);
    slab(acc, tg, tthick / 2, W, tp);
    tp.meta.thickness = tthick;
    tp.meta.tubeMinWidth = minW;
    acc.end();
  }
}

/* ------------------------------------------------------------------ */
/* Legs                                                                 */
/* ------------------------------------------------------------------ */

function buildLegs(acc, p, L) {
  const n = p.legPairs;
  const floorR = tubeFloorR(p);
  const r0 = Math.max(floorR, (LEG_ROOT_FRAC * L.rt) / 2);
  const r1 = Math.max(floorR, r0 * (1 - p.legTaper));
  for (let i = 0; i < n; i++) {
    const yi = n === 1 ? 0 : (L.Lt / 2) * (0.5 - (1.0 * i) / (n - 1));
    const kk = Math.sqrt(Math.max(0, 1 - (yi / (L.Lt / 2)) ** 2));
    const root = [0.35 * L.rt * kk, yi, -0.3 * L.dt * kk];
    const az = (n === 1 ? 0 : p.legSplay * (1 - (2 * i) / (n - 1))) * D2R;   // + = forward
    const h = [Math.cos(az), Math.sin(az), 0];
    const b = p.legBend;
    const elev = [-35, 15 + 0.6 * b, 15 + 0.6 * b - (60 + b), 15 + 0.6 * b - (60 + b) + 35].map((e) => e * D2R);
    const lens = [p.coxa, p.femur, p.tibia, p.tarsus];
    const total = lens.reduce((a, c) => a + c, 0);
    const pts = [root]; let acc0 = 0; const rad = [r0];
    for (let s = 0; s < 4; s++) {
      const dir = add(mul(h, Math.cos(elev[s])), [0, 0, Math.sin(elev[s])]);
      pts.push(add(pts[s], mul(dir, lens[s])));
      acc0 += lens[s];
      rad.push(Math.max(floorR, lerp(r0, r1, acc0 / total)));
    }
    const part = acc.begin(`leg${i + 1}`, 'leg', 'R');
    part.meta.tubeRings = [];
    for (let s = 0; s < 4; s++) frustum(acc, pts[s], pts[s + 1], rad[s], rad[s + 1], part.meta.tubeRings);
    acc.end();
    for (let s = 1; s <= 4; s++) {
      acc.begin(`leg${i + 1}-joint${s}`, 'leg', 'R');
      sphere(acc, pts[s], Math.max(rad[s - 1], rad[s]) * 1.08);
      acc.end();
    }
  }
}

/* ------------------------------------------------------------------ */
/* Antennae                                                             */
/* ------------------------------------------------------------------ */

function buildAntenna(acc, p, L) {
  const type = p.antennaType;
  const floorR = tubeFloorR(p);
  const sizeRef = L.insect ? p.headSize : p.thoraxWidth * 0.6;
  let r0 = Math.max(floorR, (ANT_ROOT_FRAC * sizeRef) / 2);
  const root = L.insect
    ? [0.25 * L.Rh, L.yh + 0.5 * L.Rh, 0.45 * L.Rh * HEAD_DEPTH_RATIO]
    : [0.2 * L.rt, L.Lt / 2 - 0.15 * L.Lt, 0.3 * L.dt];
  const sp = p.antennaSpread * D2R;
  let dir = norm([Math.sin(sp), Math.cos(sp), 0.35]);
  const curlAxis = norm(cross(dir, [0, 0, 1]));
  const len0 = p.antennaLength;
  const M = 28;
  const pts = [root], rad = [];
  const rTip = type === 'bristle' ? floorR : Math.max(floorR, r0 * 0.8);
  if (type === 'bristle') r0 = Math.max(floorR, r0 * 1.6);
  for (let i = 1; i <= M; i++) {
    const s = i / M;
    const ang = p.antennaCurl * D2R * s * s;            // curl grows toward the tip
    const d = rotateAbout(dir, curlAxis, -ang);
    pts.push(add(pts[i - 1], mul(d, len0 / M)));
  }
  for (let i = 0; i <= M; i++) rad.push(Math.max(floorR, lerp(r0, rTip, i / M)));
  const part = acc.begin('antenna', 'antenna', 'R');
  part.meta.tubeRings = [];
  const T = tubeAlong(acc, pts, rad, part.meta.tubeRings);
  acc.end();
  const tip = pts[M];
  if (type === 'clubbed') {
    const t = T[M];
    const [u, v] = frameFor(t);
    acc.begin('antenna-club', 'antenna', 'R');
    ellipsoid(acc, sub(tip, mul(t, 0.06 * len0)), [u, v, t], [rTip * 2.6, rTip * 2.6, Math.max(0.12 * len0, rTip * 3)]);
    acc.end();
  } else {
    acc.begin('antenna-tip', 'antenna', 'R');
    sphere(acc, tip, rTip * 1.05);
    acc.end();
  }
  if (type === 'feathered') {
    const K = 11;
    const pp = acc.begin('antenna-pinnae', 'antenna', 'R');
    pp.meta.tubeRings = [];
    for (let k = 0; k < K; k++) {
      const s = 0.12 + (0.85 * k) / (K - 1);
      const i = Math.round(s * M);
      const lat = norm(cross(T[i], [0, 0, 1]));
      const pl = 0.32 * len0 * (1 - 0.6 * s);
      for (const sg of [1, -1]) {
        const d = norm(add(mul(T[i], 0.5), mul(lat, sg * 0.87)));
        frustum(acc, pts[i], add(pts[i], mul(d, pl)), floorR, floorR, pp.meta.tubeRings);
      }
    }
    acc.end();
  }
}

function rotateAbout(v, k, a) {   // Rodrigues
  const c = Math.cos(a), s = Math.sin(a);
  return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c)));
}

/* ------------------------------------------------------------------ */
/* Assembly                                                             */
/* ------------------------------------------------------------------ */

export function normalizeParams(p) {
  const q = { ...DEFAULTS };
  for (const s of PARAM_SPEC) {
    if (!(s.id in p)) continue;
    let v = p[s.id];
    if (s.kind === 'range') { v = Number(v); if (!Number.isFinite(v)) v = s.default; v = clamp(v, s.min, s.max); }
    else if (s.kind === 'bool') v = v === true || v === 'true' || v === 1;
    else if (!s.options.some((o) => o[0] === v)) v = s.default;
    q[s.id] = v;
  }
  return q;
}

export function buildBug(params) {
  const p = normalizeParams(params);
  const L = bodyLayout(p);
  const acc = new Acc();
  buildBody(acc, p, L);
  if (p.legsVisible && p.legPairs > 0) buildLegs(acc, p, L);
  if (p.antennaType !== 'none') buildAntenna(acc, p, L);
  if (p.wingPairs >= 1) buildWing(acc, p, L, 1);
  if (p.wingPairs >= 2) buildWing(acc, p, L, 2);

  // Mirror every right-side part into its left twin.
  const rightParts = acc.parts.filter((q) => q.side === 'R');
  for (const q of rightParts) {
    const shift = acc.pos.length / 3 - q.v0;
    const lp = { name: q.name, kind: q.kind, side: 'L', v0: acc.pos.length / 3, t0: acc.idx.length / 3, meta: mirrorMeta(q.meta, shift) };
    for (let v = q.v0; v < q.v1; v++) acc.pos.push(mx(acc.pos[3 * v]), acc.pos[3 * v + 1], acc.pos[3 * v + 2]);
    for (let t = q.t0; t < q.t1; t++) {
      const a = acc.idx[3 * t], b = acc.idx[3 * t + 1], c = acc.idx[3 * t + 2];
      acc.idx.push(a + shift, c + shift, b + shift);
    }
    lp.v1 = acc.pos.length / 3; lp.t1 = acc.idx.length / 3;
    acc.parts.push(lp);
  }

  return {
    params: p,
    layout: L,
    positions: Float64Array.from(acc.pos),
    indices: Uint32Array.from(acc.idx),
    parts: acc.parts,
    triangleCount: acc.idx.length / 3,
  };
}

function mirrorMeta(m, shift) {
  const out = {};
  for (const [k, v] of Object.entries(m)) {
    if (k === 'tubeRings') out[k] = v.map(([a, n]) => [a + shift, n]);
    else if (k === 'thickPairs') out[k] = v.map(([a, b]) => [a + shift, b + shift]);
    else out[k] = v;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Symmetry check — on the emitted triangles, exact doubles             */
/* ------------------------------------------------------------------ */

export function mirrorDiff(model) {
  const P = model.positions, I = model.indices;
  const key = (v, mirror) => {
    const x = P[3 * v];
    const xx = mirror ? (x === 0 ? 0 : -x) : (x === 0 ? 0 : x);
    return `${xx},${P[3 * v + 1]},${P[3 * v + 2]}`;
  };
  const canon = (a, b, c) => {   // rotate so the smallest key leads; keep orientation
    if (a <= b && a <= c) return `${a}|${b}|${c}`;
    if (b <= a && b <= c) return `${b}|${c}|${a}`;
    return `${c}|${a}|${b}`;
  };
  const counts = new Map();
  const n = I.length / 3;
  for (let t = 0; t < n; t++) {
    const a = I[3 * t], b = I[3 * t + 1], c = I[3 * t + 2];
    const k = canon(key(a, false), key(b, false), key(c, false));
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  let unmatched = 0;
  for (let t = 0; t < n; t++) {
    const a = I[3 * t], b = I[3 * t + 1], c = I[3 * t + 2];
    const k = canon(key(a, true), key(c, true), key(b, true));   // mirror reverses winding
    const m = counts.get(k) || 0;
    if (m > 0) counts.set(k, m - 1); else unmatched++;
  }
  return unmatched;
}

/* ------------------------------------------------------------------ */
/* STL exporter — reads the model only                                  */
/* ------------------------------------------------------------------ */

export function exportStl(model) {
  const P = model.positions, I = model.indices, n = I.length / 3;
  const buf = new ArrayBuffer(84 + 50 * n);
  const dv = new DataView(buf);
  const header = 'Parametric Bug — eva-maskalenko.com/bug — mm';
  for (let i = 0; i < 80; i++) dv.setUint8(i, i < header.length ? header.charCodeAt(i) & 0x7f : 32);
  dv.setUint32(80, n, true);
  let o = 84;
  for (let t = 0; t < n; t++) {
    const a = 3 * I[3 * t], b = 3 * I[3 * t + 1], c = 3 * I[3 * t + 2];
    const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]];
    const e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
    const nn = norm(cross(e1, e2));
    dv.setFloat32(o, nn[0], true); dv.setFloat32(o + 4, nn[1], true); dv.setFloat32(o + 8, nn[2], true); o += 12;
    for (const v of [a, b, c]) { dv.setFloat32(o, P[v], true); dv.setFloat32(o + 4, P[v + 1], true); dv.setFloat32(o + 8, P[v + 2], true); o += 12; }
    dv.setUint16(o, 0, true); o += 2;
  }
  return new Uint8Array(buf);
}

/* ------------------------------------------------------------------ */
/* SVG exporter — the top-down projection of the model's own solids     */
/* ------------------------------------------------------------------ */

/* The contour generator of one closed part seen from +z: the directed edges
   of front-facing triangles whose twin belongs to a back-facing triangle.
   They chain into closed loops; projected to x-y and filled NONZERO they
   reproduce the part's projection exactly, because every projected point is
   covered by at least one front face and each covering front face winds +1. */
export function contourLoops(model, part) {
  const P = model.positions, I = model.indices;
  const NV = model.positions.length / 3;
  const owner = new Map();
  const front = [];
  for (let t = part.t0; t < part.t1; t++) {
    const a = I[3 * t], b = I[3 * t + 1], c = I[3 * t + 2];
    const nz = (P[3 * b] - P[3 * a]) * (P[3 * c + 1] - P[3 * a + 1]) - (P[3 * b + 1] - P[3 * a + 1]) * (P[3 * c] - P[3 * a]);
    front.push(nz > 0);
    const f = t - part.t0;
    owner.set(a * NV + b, f); owner.set(b * NV + c, f); owner.set(c * NV + a, f);
  }
  const out = new Map();
  let count = 0;
  for (let t = part.t0; t < part.t1; t++) {
    const f = t - part.t0;
    if (!front[f]) continue;
    const v = [I[3 * t], I[3 * t + 1], I[3 * t + 2]];
    for (let e = 0; e < 3; e++) {
      const a = v[e], b = v[(e + 1) % 3];
      const tw = owner.get(b * NV + a);
      if (tw === undefined || !front[tw]) {
        if (!out.has(a)) out.set(a, []);
        out.get(a).push(b); count++;
      }
    }
  }
  const loops = [];
  while (count > 0) {
    let start = -1;
    for (const [a, list] of out) if (list.length) { start = a; break; }
    const loop = [start];
    let cur = start;
    for (let guard = 0; guard < 1e6; guard++) {
      const list = out.get(cur);
      if (!list || !list.length) break;
      const nx = list.pop(); count--;
      if (nx === start) break;
      loop.push(nx); cur = nx;
    }
    if (loop.length >= 3) loops.push(loop.map((v) => [P[3 * v], P[3 * v + 1]]));
  }
  return loops;
}

const DRAW_ORDER = ['leg', 'wing2', 'tail', 'wing1', 'antenna', 'body'];
export const SVG_INK = '#0A0A0C', SVG_LINE = '#EDEDE8';

function bounds2(loops) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const L of loops) for (const [x, y] of L) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1 };
}

export function exportSvg(model, opts = {}) {
  const cutSafe = !!opts.cutSafe;
  const groups = DRAW_ORDER.map((kind) => ({ kind, parts: model.parts.filter((q) => q.kind === kind) }));
  const partLoops = [];
  for (const g of groups) for (const part of g.parts) partLoops.push({ part, loops: contourLoops(model, part) });
  const all = partLoops.flatMap((pl) => pl.loops);
  const b = bounds2(all);
  const M = 2;
  const W = b.x1 - b.x0 + 2 * M, H = b.y1 - b.y0 + 2 * M;
  const X = (x) => (x - b.x0 + M).toFixed(3), Y = (y) => (b.y1 - y + M).toFixed(3);
  const pathD = (loops) => loops.map((L) => 'M' + L.map(([x, y]) => `${X(x)} ${Y(y)}`).join('L') + 'Z').join('');
  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${W.toFixed(3)}mm" height="${H.toFixed(3)}mm" viewBox="0 0 ${W.toFixed(3)} ${H.toFixed(3)}">\n`;
  const meta = `<!-- Parametric Bug — top-down orthographic projection of the 3D model (units: mm). ${cutSafe ? 'CUT-SAFE' : 'layered'} -->\n`;
  if (cutSafe) {
    const u = unionOutline(all, 0.05);
    const d = u.loops.map((L) => 'M' + L.map(([x, y]) => `${X(x)} ${Y(y)}`).join('L') + 'Z').join('');
    return {
      svg: head + meta + `<!-- cut-safe: union of every part, ${u.regions} connected region(s) -->\n<path d="${d}" fill="${SVG_INK}" fill-rule="evenodd"/>\n</svg>\n`,
      regions: u.regions, widthMm: W, heightMm: H,
    };
  }
  let body = '';
  for (const { part, loops } of partLoops) {
    body += `<path data-part="${part.name}-${part.side}" d="${pathD(loops)}" fill="${SVG_INK}" fill-rule="nonzero" stroke="${SVG_LINE}" stroke-width="0.15" stroke-linejoin="round"/>\n`;
  }
  // Segment lines: read off the model's own band rings (their x extent at their y).
  const bodyPart = model.parts.find((q) => q.kind === 'body');
  const P = model.positions;
  for (const v0 of bodyPart?.meta.bands || []) {
    const ring = bodyPart.meta.rings.find((r) => r.v0 === v0);
    let x0 = Infinity, x1 = -Infinity;
    for (let k = 0; k < ring.n; k++) { const x = P[3 * (v0 + k)]; if (x < x0) x0 = x; if (x > x1) x1 = x; }
    const y = P[3 * v0 + 1];
    body += `<line x1="${X(x0)}" y1="${Y(y)}" x2="${X(x1)}" y2="${Y(y)}" stroke="${SVG_LINE}" stroke-width="0.15"/>\n`;
  }
  return { svg: head + meta + body + '</svg>\n', regions: null, widthMm: W, heightMm: H };
}

/* ------------------------------------------------------------------ */
/* Cut-safe union: nonzero raster of every loop, traced by marching     */
/* squares. Exact crossings along each row, half a pixel across rows.   */
/* ------------------------------------------------------------------ */

export function unionOutline(loops, px) {
  const b = bounds2(loops);
  const gx0 = b.x0 - 3 * px, gy0 = b.y0 - 3 * px;
  const nx = Math.ceil((b.x1 - b.x0) / px) + 6, ny = Math.ceil((b.y1 - b.y0) / px) + 6;
  const grid = new Uint8Array(nx * ny);
  const rowCross = new Array(ny);
  // edge buckets by row
  const buckets = Array.from({ length: ny }, () => []);
  const E = [];
  for (const L of loops) for (let i = 0; i < L.length; i++) {
    const a = L[i], c = L[(i + 1) % L.length];
    if (a[1] === c[1]) continue;
    const e = E.length; E.push([a[0], a[1], c[0], c[1]]);
    const lo = Math.max(0, Math.ceil((Math.min(a[1], c[1]) - gy0) / px - 0.5));
    const hi = Math.min(ny - 1, Math.floor((Math.max(a[1], c[1]) - gy0) / px - 0.5));
    for (let j = lo; j <= hi; j++) buckets[j].push(e);
  }
  for (let j = 0; j < ny; j++) {
    const yc = gy0 + (j + 0.5) * px;
    const xs = [];
    for (const e of buckets[j]) {
      const [x0, y0, x1, y1] = E[e];
      const ylo = Math.min(y0, y1), yhi = Math.max(y0, y1);
      if (yc < ylo || yc >= yhi) continue;
      xs.push([x0 + ((yc - y0) / (y1 - y0)) * (x1 - x0), y1 > y0 ? 1 : -1]);
    }
    xs.sort((p, q) => p[0] - q[0]);
    const iv = [];
    let w = 0, open = null;
    for (const [x, d] of xs) {
      const was = w !== 0; w += d; const now = w !== 0;
      if (!was && now) open = x;
      else if (was && !now) iv.push([open, x]);
    }
    // merge touching intervals
    const merged = [];
    for (const it of iv) { const last = merged[merged.length - 1]; if (last && it[0] <= last[1]) last[1] = Math.max(last[1], it[1]); else merged.push(it.slice()); }
    rowCross[j] = merged;
    for (const [a, c] of merged) {
      const i0 = Math.max(0, Math.ceil((a - gx0) / px - 0.5)), i1 = Math.min(nx - 1, Math.floor((c - gx0) / px - 0.5));
      for (let i = i0; i <= i1; i++) grid[j * nx + i] = 1;
    }
  }
  // connected regions (4-connectivity on filled pixels)
  const lab = new Int32Array(nx * ny);
  let regions = 0;
  const q = new Int32Array(nx * ny);
  for (let s = 0; s < nx * ny; s++) {
    if (!grid[s] || lab[s]) continue;
    regions++; let h = 0, t = 0; q[t++] = s; lab[s] = regions;
    while (h < t) {
      const c = q[h++]; const ci = c % nx, cj = (c / nx) | 0;
      const nb = [ci > 0 ? c - 1 : -1, ci < nx - 1 ? c + 1 : -1, cj > 0 ? c - nx : -1, cj < ny - 1 ? c + nx : -1];
      for (const m of nb) if (m >= 0 && grid[m] && !lab[m]) { lab[m] = regions; q[t++] = m; }
    }
  }
  // marching squares over pixel centres
  const cx = (i) => gx0 + (i + 0.5) * px, cy = (j) => gy0 + (j + 0.5) * px;
  const hCross = (i, j) => {   // between (i,j) and (i+1,j): the exact interval end on row j
    const x0 = cx(i), x1 = cx(i + 1);
    for (const [a, c] of rowCross[j]) { if (a >= x0 && a <= x1) return a; if (c >= x0 && c <= x1) return c; }
    return (x0 + x1) / 2;
  };
  const pt = new Map();
  const adj = new Map();
  const node = (id, xy) => { if (!pt.has(id)) pt.set(id, xy); if (!adj.has(id)) adj.set(id, []); return id; };
  const link = (a, c) => { adj.get(a).push(c); adj.get(c).push(a); };
  const g = (i, j) => grid[j * nx + i];
  for (let j = 0; j + 1 < ny; j++) for (let i = 0; i + 1 < nx; i++) {
    const a = g(i, j), bb = g(i + 1, j), c = g(i + 1, j + 1), d = g(i, j + 1);
    const code = a | (bb << 1) | (c << 2) | (d << 3);
    if (code === 0 || code === 15) continue;
    const B = () => node(`h${i},${j}`, [hCross(i, j), cy(j)]);
    const T = () => node(`h${i},${j + 1}`, [hCross(i, j + 1), cy(j + 1)]);
    const Lf = () => node(`v${i},${j}`, [cx(i), (cy(j) + cy(j + 1)) / 2]);
    const Rt = () => node(`v${i + 1},${j}`, [cx(i + 1), (cy(j) + cy(j + 1)) / 2]);
    switch (code) {
      case 1: case 14: link(Lf(), B()); break;
      case 2: case 13: link(B(), Rt()); break;
      case 3: case 12: link(Lf(), Rt()); break;
      case 4: case 11: link(Rt(), T()); break;
      case 6: case 9: link(B(), T()); break;
      case 7: case 8: link(Lf(), T()); break;
      case 5: link(Lf(), B()); link(Rt(), T()); break;     // diagonal insides stay apart (4-connectivity)
      case 10: link(B(), Rt()); link(Lf(), T()); break;
    }
  }
  const used = new Set();
  const out = [];
  for (const start of adj.keys()) {
    if (used.has(start)) continue;
    const loop = []; let prev = null, cur = start;
    for (let guard = 0; guard < 1e7; guard++) {
      used.add(cur); loop.push(pt.get(cur));
      const nbs = adj.get(cur);
      const nx2 = nbs.find((n) => n !== prev && !used.has(n)) ?? null;
      if (nx2 === null) break;
      prev = cur; cur = nx2;
    }
    if (loop.length >= 3) out.push(simplifyClosed(loop, px * 0.2));
  }
  return { loops: out, regions, raster: { nx, ny, px } };
}

function rdp(pts, tol) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-12;
  let best = -1, bi = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const t = clamp(((x - ax) * dx + (y - ay) * dy) / L2, 0, 1);
    const d = Math.hypot(x - ax - t * dx, y - ay - t * dy);
    if (d > best) { best = d; bi = i; }
  }
  if (best <= tol) return [pts[0], pts[pts.length - 1]];
  return rdp(pts.slice(0, bi + 1), tol).slice(0, -1).concat(rdp(pts.slice(bi), tol));
}
function simplifyClosed(loop, tol) {
  if (loop.length < 8) return loop;
  let far = 0, fd = -1;
  for (let i = 1; i < loop.length; i++) { const d = Math.hypot(loop[i][0] - loop[0][0], loop[i][1] - loop[0][1]); if (d > fd) { fd = d; far = i; } }
  const a = rdp(loop.slice(0, far + 1), tol), b = rdp(loop.slice(far).concat([loop[0]]), tol);
  return a.slice(0, -1).concat(b.slice(0, -1));
}
