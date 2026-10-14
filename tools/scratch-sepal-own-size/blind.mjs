import * as A from '/home/user/Portfolio-Site/bloom-geometry.js';
import * as B from './tree2/bloom-geometry.js'; // the PROBE copy (root rows kept); see the proposal doc
import { DEFAULTS } from '/home/user/Portfolio-Site/bloom-registry.js';
const WING = { sepalCount: 5, sepalScale: 1, sepalAngle: -10, sepalSpineCurl: 120, sepalCurlBias: 0.9, sepalCurlStart: 0.6, sepalBaseTaper: 3, sepalTipTaper: 4, sepalTipShape: 0.6 };
console.log('L x 5 mm: limit with the shipped exclusion (u >= 0.30 of the SEPAL) | with only the foot rows dropped');
for (const L of [21, 35, 60, 90, 120, 150]) {
  const st = { ...DEFAULTS, ...WING, sepalLengthMm: L, sepalWidthMm: 5, sepalFootBreadth: 5/16 };
  const a = new A.MeshBuilder({ exportMode: true }), b = new B.MeshBuilder({ exportMode: true });
  const ma = A.buildBloomInto(a, st), mb = B.buildBloomInto(b, st);
  console.log(`L${String(L).padStart(3)}: shipped +${ma.sepals.limit.limitDeg} (excludes the first ${(0.3*L).toFixed(1)} mm)  |  root rows kept +${mb.sepals.limit.limitDeg}`);
}
