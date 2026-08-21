// Property test for the analytic petal flow field T (petalFlowDirection).
//
// T is the shared-scaffolding flow used by infill: parallel to the midrib on the
// centerline, tangent to the outline near the margin, built ANALYTICALLY from the
// outline slope dW/du at the same u and signed by side (no nearest-point search).
// This asserts the five properties the field is specified to have. Run:
//
//     node tools/test-petal-flow.mjs
//
import { petalFlowDirection, petalHalfWidth } from '../flower-geometry.js';

let failures = 0;
const EPS = 1e-9;
function check(cond, msg) {
  if (cond) return;
  failures++;
  console.log('  FAIL  ' + msg);
}

// A spread of petal shapes: different taper / tip / edge curve so the widest point
// (slope = 0) sits at different u and the sign of the slope varies across shapes.
const SHAPES = [
  { name: 'default',        W: 1.0, taper: 0.5, tip: 0.5, edgeCurve: 0.0, lobe: 0, lobeCount: 5 },
  { name: 'sharp+tapered',  W: 0.8, taper: 0.9, tip: 0.9, edgeCurve: 0.0, lobe: 0, lobeCount: 5 },
  { name: 'round+broad',    W: 1.3, taper: 0.1, tip: 0.1, edgeCurve: 0.0, lobe: 0, lobeCount: 5 },
  { name: 'billowed edge',  W: 1.0, taper: 0.5, tip: 0.5, edgeCurve: 0.8, lobe: 0, lobeCount: 5 },
  { name: 'pinched edge',   W: 1.0, taper: 0.4, tip: 0.6, edgeCurve: -0.7, lobe: 0, lobeCount: 5 },
];

const US = [0.02, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.98];
const argmaxHalfWidth = (P) => {
  let best = 0, bu = 0.5;
  for (let i = 1; i < 1000; i++) { const u = i / 1000; const w = petalHalfWidth(u, P); if (w > best) { best = w; bu = u; } }
  return bu;
};
// central-difference slope, mirroring petalFlowDirection's clamp, to classify u
const slopeAt = (u, P) => {
  const hh = 1e-3;
  let uA = Math.max(0, u - hh), uB = Math.min(1, u + hh), denom = uB - uA;
  const s = denom > 1e-9 ? (petalHalfWidth(uB, P) - petalHalfWidth(uA, P)) / denom : 0;
  return Math.max(-3, Math.min(3, s));
};

for (const P of SHAPES) {
  // (1) v = 0 -> exactly (1, 0) at every u. No seam, no base patch.
  for (const u of US) {
    const t = petalFlowDirection(0, u, P);
    check(t.tx === 1 && t.ty === 0, `${P.name} u=${u}: v=0 must be exactly (1,0), got (${t.tx},${t.ty})`);
  }

  for (const u of US) {
    const w = petalHalfWidth(u, P);
    if (w < 1e-4) continue;
    const slope = slopeAt(u, P);
    for (const frac of [0.3, 0.6, 0.9]) {
      const v = frac * w;
      const tp = petalFlowDirection(v, u, P);   // +side
      const tm = petalFlowDirection(-v, u, P);  // -side

      // unit length
      check(Math.abs(Math.hypot(tp.tx, tp.ty) - 1) < 1e-6, `${P.name} u=${u} v=${v}: T not unit`);

      // (5) symmetry: T(-v,u) is the exact mirror of T(v,u)
      check(tm.tx === tp.tx && Math.abs(tm.ty + tp.ty) <= EPS,
        `${P.name} u=${u} v=${v}: T(-v) must mirror T(v), got +(${tp.tx},${tp.ty}) -(${tm.tx},${tm.ty})`);

      // (2) below the widest point (slope > 0): off-midrib arrows fan OUTWARD
      //     -> lateral component points the same way as v.
      if (slope > 0.05) {
        check(tp.ty > 0, `${P.name} u=${u} v=${v}: slope>0 should fan outward (ty>0), got ${tp.ty}`);
        check(tm.ty < 0, `${P.name} u=${u} v=${-v}: slope>0 should fan outward (ty<0), got ${tm.ty}`);
      }
      // (4) above the widest point (slope < 0): off-midrib arrows CONVERGE toward tip
      //     -> lateral component points opposite to v.
      if (slope < -0.05) {
        check(tp.ty < 0, `${P.name} u=${u} v=${v}: slope<0 should converge (ty<0), got ${tp.ty}`);
        check(tm.ty > 0, `${P.name} u=${u} v=${-v}: slope<0 should converge (ty>0), got ${tm.ty}`);
      }
    }
  }

  // (3) at the widest point (slope = 0): arrows are vertical everywhere -> ty ~ 0.
  const uPeak = argmaxHalfWidth(P);
  const wPeak = petalHalfWidth(uPeak, P);
  for (const frac of [0.3, 0.6, 0.9]) {
    const t = petalFlowDirection(frac * wPeak, uPeak, P);
    check(Math.abs(t.ty) < 0.02, `${P.name} widest point u=${uPeak}: expected ~vertical (|ty|<0.02), got ty=${t.ty}`);
  }

  console.log(`  ${failures === 0 ? 'ok  ' : '... '}${P.name}`);
}

if (failures === 0) {
  console.log('\nAll petal-flow properties hold. ✓');
  process.exit(0);
} else {
  console.log(`\n${failures} assertion(s) failed.`);
  process.exit(1);
}
