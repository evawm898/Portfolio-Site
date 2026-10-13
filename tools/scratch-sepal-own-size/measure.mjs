import * as G from './tree/bloom-geometry.js';
import { DEFAULTS } from './tree/bloom-registry.js';
import { measureWall } from '/home/user/Portfolio-Site/tools/bloom-wall-thickness.mjs';
import { census } from '/home/user/Portfolio-Site/tools/bloom-self-intersection.mjs';
const WING = { sepalCount: 5, sepalScale: 1, sepalAngle: -10, sepalSpineCurl: 120, sepalCurlBias: 0.9, sepalCurlStart: 0.6, sepalBaseTaper: 3, sepalTipTaper: 4, sepalTipShape: 0.6 };
export function cell(set, { tag = '' } = {}) {
  const st = { ...DEFAULTS, ...WING, ...set };
  const t0 = Date.now();
  const acc = new G.MeshBuilder({ exportMode: true, captureGrid: true });
  const m = G.buildBloomInto(acc, st);
  const ms = Date.now() - t0;
  const built = m.sepals.built.filter((p) => p && p.grid);
  let best = null, drawn = 0;
  for (const p of built) {
    const ap = p.tipCap && p.tipCap.apex;
    const nibFromU = ap && ap.active && ap.drawnLengthMm > 0 ? ap.xLawMm / ap.drawnLengthMm : null;
    const r = measureWall(p.grid, { nibFromU });
    if (!best || r.self < best.self) best = r;
    drawn = Math.max(drawn, p.drawnLength || 0);
  }
  const c = census(new Float64Array(acc.positions));
  const P = acc.positions; let lo = [1e9,1e9,1e9], hi = [-1e9,-1e9,-1e9];
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { if (P[i+k] < lo[k]) lo[k] = P[i+k]; if (P[i+k] > hi[k]) hi[k] = P[i+k]; }
  const dims = [hi[0]-lo[0], hi[1]-lo[1], hi[2]-lo[2]];
  const L = m.sepals.limit;
  return { tag, set, ms, tris: acc.triangleCount, sepalTris: m.sepals.tris, self: +best.self.toFixed(4), wall: +best.wall.toFixed(4), within: c.within, span: +c.worstSpanMm.toFixed(4),
    asked: L.askedDeg, limit: L.limitDeg, builtDeg: L.angleBuiltDeg, clamped: L.clamped, footMm: (built[0] && built[0].base && built[0].base.width) ?? (built[0] && built[0].ringWidth) ?? NaN, drawnMm: +((built[0] && built[0].tipCap && built[0].tipCap.apex && built[0].tipCap.apex.drawnLengthMm) || 0).toFixed(2), maxDim: +Math.max(...dims).toFixed(1), minDim: +Math.min(...dims).toFixed(1) };
}
const run = process.argv[2];
const out = (r) => console.log(JSON.stringify(r));
if (run === 'grid') {
  for (const Lmm of [21, 35, 45, 60, 75, 90, 120, 150]) for (const Wmm of [3, 4, 5, 6, 8, 12, 16])
    out(cell({ sepalLengthMm: Lmm, sepalWidthMm: Wmm, sepalFootBreadth: Math.min(1.5, Math.max(0.25, Wmm / 16)) }, { tag: `L${Lmm} W${Wmm}` }));
} else if (run === 'angles') {
  for (const a of [0, -10, -20, -30]) for (const Lmm of [21, 60, 90, 120]) out(cell({ sepalLengthMm: Lmm, sepalWidthMm: 5, sepalFootBreadth: 5/16, sepalAngle: a }, { tag: `A${a} L${Lmm}` }));
} else if (run === 'today') {
  out(cell({ sepalScale: 0.6, sepalCount: 5 }, { tag: 'today default size' }));
  out(cell({ sepalScale: 1, sepalCount: 5 }, { tag: 'today ceiling scale 1' }));
  out(cell({ sepalScale: 1, petalLength: 60, petalWidth: 8, sepalCount: 5 }, { tag: 'A9 petals 60x8' }));
} else if (run === 'corner') {
  for (const Lmm of [60, 90, 120, 150]) out(cell({ petalCount: 40, sepalCount: 40, sepalLengthMm: Lmm, sepalWidthMm: 30, sepalFootBreadth: 1.5, sepalPhase: 0, sepalAngle: 90, stemLength: 60, sepalSpineCurl: 360, sepalCup: 1.2, sepalTwist: 180, sepalRoll: 180, sepalBuckleAmp: 0.6, sepalTipShape: 3, sepalCurlBias: 0, sepalCurlStart: 0, sepalBaseTaper: 1, sepalTipTaper: 1.8 }, { tag: `ALLMAX-ish 40x40 L${Lmm} W30` }));
}
