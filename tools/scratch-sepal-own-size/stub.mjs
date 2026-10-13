import * as G from './tree/bloom-geometry.js';
import { DEFAULTS } from './tree/bloom-registry.js';
import { census } from '/home/user/Portfolio-Site/tools/bloom-self-intersection.mjs';
const WING = { sepalCount: 5, sepalScale: 1, sepalAngle: -10, sepalSpineCurl: 120, sepalCurlBias: 0.9, sepalCurlStart: 0.6, sepalBaseTaper: 3, sepalTipTaper: 4, sepalTipShape: 0.6 };
for (const W of [2, 2.5, 3, 4, 5, 6, 8]) {
  const acc = new G.MeshBuilder({ exportMode: true });
  const m = G.buildBloomInto(acc, { ...DEFAULTS, ...WING, sepalLengthMm: 90, sepalWidthMm: W, sepalFootBreadth: W/16 });
  const p = m.sepals.built[0]; const ap = p.tipCap && p.tipCap.apex;
  console.log(`W${W}: foot ${m.sepals.footMm ?? m.sepals.foot ?? JSON.stringify(Object.keys(m.sepals).filter(k=>/foot/i.test(k)))} stub share ${ap && ap.active ? ((1 - ap.xLawMm / ap.drawnLengthMm) * 100).toFixed(1) + '%' : 'n/a'} peakHalf ${p.tipCap.peakHalf} drawn ${ap && ap.drawnLengthMm}`);
}
// the long-sepal blindness: 150 x 5 pointed UP through the whorl
for (const a of [30, 60, 90]) {
  const acc = new G.MeshBuilder({ exportMode: true });
  const m = G.buildBloomInto(acc, { ...DEFAULTS, ...WING, sepalLengthMm: 150, sepalWidthMm: 5, sepalFootBreadth: 5/16, sepalAngle: a });
  const c = census(new Float64Array(acc.positions));
  console.log(`150x5 angle ${a}: built ${m.sepals.limit.angleBuiltDeg} limit ${m.sepals.limit.limitDeg} contact ${JSON.stringify(m.sepals.limit.contact || m.sepals.limit.kind || null)} census within ${c.within} cross ${c.cross ?? c.crossShell ?? '?'}`);
}
console.log('ROOT_BLEND_END', G.ROOT_BLEND_END, '-> excluded stretch at 150 mm =', 0.3*150, 'mm; at 21 mm =', 0.3*21);
