// plot-instance.js — where a bloom STANDS, and the arithmetic that puts it there.
//
// WHAT THIS FILE IS FOR. /plot draws one grid per bloom, and a composition
// holds several of them at different scales — the reference this direction is
// aimed at is five. Everything about WHICH bloom is which, and about the state
// each one owns, lives in plot.js beside the rest of the page's state; what
// lives here is the one thing that has an answer that can be written down: the
// transform, and what it does to a point.
//
// IT HOLDS NO THREE.js. The matrix is sixteen numbers in the same
// column-major order three uses, so `Matrix4.fromArray` takes it verbatim, and
// the gate drives every function here in Node over transforms whose answer is
// written down. A wrong rotation order or a wrong composition order still draws
// a plausible bouquet, which is exactly why the arithmetic is checked away from
// the picture.
//
// THE ORDER IS SCALE, THEN ROTATE, THEN TRANSLATE, and the rotation is X then Y
// then Z — three's own `Euler` default ('XYZ', meaning the matrix product
// Rz·Ry·Rx). Both are stated rather than implied because both are choices: a
// translate-then-scale would scale the position too, so a bloom moved 100 mm
// aside would jump when its scale slider moved, and that is the one composition
// operation an artist repeats.
//
// THE IDENTITY IS AN IDENTITY, NOT A NEARLY. `applyTransformToPoints` hands the
// caller's own array straight back when the transform is the identity — the
// same discipline `headTransform` and `petalPoints` already follow on this page
// — so a single bloom at rest is drawn from the very arrays the file wrote, and
// every "nothing moved" claim on the page stays an array identity rather than
// becoming a tolerance. That is what makes shipping this feature a zero-move
// change for a one-bloom composition, and it is asserted rather than argued.
//
// POSITION AND ROTATION ARE IN THE GRID'S OWN Z-UP SPACE, before the page's one
// Z-up correction — so the numbers here are the same numbers the export's
// millimetres are in, and a transform saved into a composition means the same
// thing whatever the viewer later does with the container.

import { IDENTITY_TRANSFORM, isIdentityTransform } from './plot-file.js';

export { IDENTITY_TRANSFORM, isIdentityTransform };

export const newTransform = () => ({
  position: [0, 0, 0], rotationDeg: [0, 0, 0], scale: [1, 1, 1],
});

export const cloneTransform = t => ({
  position: t.position.slice(), rotationDeg: t.rotationDeg.slice(), scale: t.scale.slice(),
});

const D2R = Math.PI / 180;

/* THE MATRIX, COLUMN-MAJOR, in three's own element order. Written out rather
   than built from three's own classes so this module imports nothing from a
   renderer and the gate can drive it in Node: the product is T · Rz · Ry · Rx ·
   S, which is "scale in the bloom's own frame, turn it, then put it where it
   goes". */
export function transformMatrix(t) {
  const [rx, ry, rz] = (t.rotationDeg || [0, 0, 0]).map(d => d * D2R);
  const [sx, sy, sz] = t.scale || [1, 1, 1];
  const [px, py, pz] = t.position || [0, 0, 0];
  const a = Math.cos(rx), b = Math.sin(rx);
  const c = Math.cos(ry), d = Math.sin(ry);
  const e = Math.cos(rz), f = Math.sin(rz);
  const ae = a * e, af = a * f, be = b * e, bf = b * f;
  // The rotation, term for term as three's own `makeRotationFromEuler` writes
  // it for the default 'XYZ' order — and asserted against three's Matrix4 in
  // the gate rather than trusted, because a transposed or mis-ordered rotation
  // still draws a plausible bouquet.
  const m = new Array(16).fill(0);
  m[0] = c * e;        m[4] = -c * f;       m[8] = d;
  m[1] = af + be * d;  m[5] = ae - bf * d;  m[9] = -b * c;
  m[2] = bf - ae * d;  m[6] = be + af * d;  m[10] = a * c;
  // SCALE IS A COLUMN SCALING, which is what makes the order scale-then-rotate:
  // each basis vector is stretched in the bloom's own frame and then turned.
  m[0] *= sx; m[1] *= sx; m[2] *= sx;
  m[4] *= sy; m[5] *= sy; m[6] *= sy;
  m[8] *= sz; m[9] *= sz; m[10] *= sz;
  m[12] = px; m[13] = py; m[14] = pz; m[15] = 1;
  return m;
}

/* ONE POINT THROUGH THE MATRIX. `out` is written in place so the walkers on the
   page allocate nothing per point. */
export function applyMatrixToPoint(m, x, y, z, out) {
  out[0] = m[0] * x + m[4] * y + m[8] * z + m[12];
  out[1] = m[1] * x + m[5] * y + m[9] * z + m[13];
  out[2] = m[2] * x + m[6] * y + m[10] * z + m[14];
  return out;
}

/* EVERY POINT OF A STRIP, OR THE CALLER'S OWN ARRAY WHEN THERE IS NOTHING TO DO.
   The identity check is on the TRANSFORM and not on the matrix: comparing a
   matrix against the identity to a tolerance would be a comparison where an
   identity is available, and this page's whole "nothing moved" vocabulary rests
   on array identity. */
export function applyTransformToPoints(points, count, t) {
  if (isIdentityTransform(t)) return points;
  const m = transformMatrix(t);
  const out = new Float32Array(count * 3);
  const p = [0, 0, 0];
  for (let i = 0; i < count; i++) {
    applyMatrixToPoint(m, points[i * 3], points[i * 3 + 1], points[i * 3 + 2], p);
    out[i * 3] = p[0]; out[i * 3 + 1] = p[1]; out[i * 3 + 2] = p[2];
  }
  return out;
}

/* A WHOLE STRIP LIST, PLACED. The strip records are handed back untouched when
   the transform is the identity — the array identity again, one level up, so
   `warpAll[i] === strips[i]` still answers what it answered before this feature
   existed. */
export function placeStrips(strips, t) {
  if (isIdentityTransform(t)) return strips;
  return strips.map(s => {
    const pts = applyTransformToPoints(s.points, s.count, t);
    return pts === s.points ? s : { ...s, points: pts };
  });
}

/* THE MEAN SCALE, for the things that are a LENGTH rather than a point — a
   handle's radius, a reported millimetre. Named rather than inlined because
   "which scale" on a non-uniform transform is a question with three answers and
   this is the one this page uses. */
export const meanScale = t => (Math.abs(t.scale[0]) + Math.abs(t.scale[1])
                               + Math.abs(t.scale[2])) / 3;

export const scaleIsUniform = t => t.scale[0] === t.scale[1] && t.scale[1] === t.scale[2];

/* WHERE A NEWLY IMPORTED BLOOM GOES, AND WHY IT IS NOT THE ORIGIN. A second
   grid placed at the origin lands exactly on top of the first, which on a black
   field with additive ink is indistinguishable from the import having REPLACED
   the drawing — the very thing this change exists to stop doing. So a new
   instance is offset clear of what is already there, along +x, by an amount
   DERIVED from the two bounding boxes rather than by a constant: the gap is a
   fraction of the incoming bloom's own width, so it is the right size whatever
   scale the grid was exported at.
     `have` is the x extent already occupied (null when this is the first
   bloom, which then takes the origin and is bit-identical to what shipped);
   `bounds` is the incoming grid's own. */
export const PLACE_GAP_FRACTION = 0.15;

export function placementFor(have, bounds) {
  if (!have || !bounds) return newTransform();
  const width = Math.max(1e-6, bounds.max[0] - bounds.min[0]);
  const gap = width * PLACE_GAP_FRACTION;
  const t = newTransform();
  t.position[0] = have.max[0] + gap - bounds.min[0];
  return t;
}

/* THE X EXTENT A PLACED BLOOM OCCUPIES. Every corner of the box through the
   matrix, not the box's own min and max mapped — a rotated box's extent is not
   its mapped corners' pairwise min, and a placement that got that wrong would
   overlap exactly when a bloom had been turned. */
export function placedExtent(bounds, t) {
  if (!bounds) return null;
  const m = transformMatrix(t);
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  const p = [0, 0, 0];
  for (let c = 0; c < 8; c++) {
    const x = (c & 1) ? bounds.max[0] : bounds.min[0];
    const y = (c & 2) ? bounds.max[1] : bounds.min[1];
    const z = (c & 4) ? bounds.max[2] : bounds.min[2];
    applyMatrixToPoint(m, x, y, z, p);
    for (let a = 0; a < 3; a++) {
      if (p[a] < min[a]) min[a] = p[a];
      if (p[a] > max[a]) max[a] = p[a];
    }
  }
  return { min, max };
}

/* THE UNION OF TWO EXTENTS, or whichever one exists. */
export function unionExtent(a, b) {
  if (!a) return b;
  if (!b) return a;
  return {
    min: [0, 1, 2].map(i => Math.min(a.min[i], b.min[i])),
    max: [0, 1, 2].map(i => Math.max(a.max[i], b.max[i])),
  };
}
