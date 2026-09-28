#!/usr/bin/env node
/* tools/bloom-roundness-law-match.mjs — can a roundness law whose floor is
   anchored at the existing fillet reproduce the swept ROUNDNESS 0.60 shape?
   MEASUREMENT ONLY (the patched-copy geometry of bloom-rim-roundness-lib.mjs).
   Reference: the swept law, R = 0.60 x the hole's inradius. Candidate: the
   fillet-anchored opening, R = a + t (rIn - a), a = min(largest fillet radius,
   rIn), t swept 0..0.40. Prints per hole onset (fillet / rIn), and per t the
   achieved count, total area, median roundness, worst per-hole area and worst
   per-hole Hausdorff against the reference. See §F of
   docs/bloom-infill-roundness-and-bevel.md. */
import * as L from './bloom-rim-roundness-lib.mjs';
const { DEFAULTS } = await import(new URL('../bloom-registry.js', import.meta.url).href);
const G = await L.loadVariant({ K: 4, law: true });
let LAW = null; const info = [];
// per-hole max drawn fillet radius: measure from the shipped perArc-5 fillet by fitting arcs is messy;
// use the clamp logic: recompute per corner rr exactly as infillFillet does.
function cornerRadii(poly, F) { const n = poly.length; const out = []; const len = (x, y) => Math.sqrt(x * x + y * y);
  let s = 0; for (let i = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n]; s += a.x * b.y - b.x * a.y; } const P = s < 0 ? poly.slice().reverse() : poly;
  for (let i = 0; i < n; i++) { const A = P[(i - 1 + n) % n], Q = P[i], B = P[(i + 1) % n]; const la = len(A.x - Q.x, A.y - Q.y), lb = len(B.x - Q.x, B.y - Q.y); if (!(la > 1e-12 && lb > 1e-12)) continue;
    const c = ((A.x - Q.x) * (B.x - Q.x) + (A.y - Q.y) * (B.y - Q.y)) / (la * lb); const th = Math.acos(Math.max(-1, Math.min(1, c))); if (th > Math.PI - 1e-3) continue;
    const tMax = 0.45 * Math.min(la, lb); let rr = F; let t = rr / Math.tan(th / 2); if (t > tMax) { rr = tMax * Math.tan(th / 2); } out.push(rr); }
  return out; }
globalThis.__holePass = () => { info.length = 0; };
globalThis.__holeLaw = (P, fr, infillFillet, infillInset) => {
  const f = infillFillet(P, fr);
  const rIn = L.inradiusOf(f, infillInset); const rr = cornerRadii(P, typeof fr === 'number' ? fr : 0.8);
  const out = LAW ? L.openingLaw(infillFillet(P, fr, 20), LAW(rIn, Math.max(...rr)), infillInset) : f;
  let cx = 0, cy = 0; for (const q of P) { cx += q.x; cy += q.y; }
  info.push({ rIn, rrMax: Math.max(...rr), rrMin: Math.min(...rr), cx: cx / P.length, cy: cy / P.length });
  return out;
};
const med = (x) => { const s = x.slice().sort((a, b) => a - b); return s[s.length >> 1]; };
const hd = (a, b) => { let m = 0; for (const q of a) m = Math.max(m, L.polyDist(q.x, q.y, b)); for (const q of b) m = Math.max(m, L.polyDist(q.x, q.y, a)); return m; };
function run(set, law) { LAW = law; info.length = 0; const R = L.planFor(G, DEFAULTS, set); const pl = R.plan;
  // last pass only: info has entries for each pass; keep the last cells.length*? holes computed per pass for cells with raw
  const hs = pl.holes.map((h, i) => (h && pl.cellOpen[i] ? h : null)); const inf = hs.map((h) => { if (!h) return null; let cx = 0, cy = 0; for (const q of h) { cx += q.x; cy += q.y; } cx /= h.length; cy /= h.length; let b = null, bd = Infinity; for (const x of info) { const d = Math.hypot(x.cx - cx, x.cy - cy); if (d < bd) { bd = d; b = x; } } return b; });
  return { pl, hs, info: inf }; }
for (const set of [{}]) {
  const fl = run(set, null);
  const ref = run(set, (r) => 0.6 * r);
  // onset per hole: the ratio law first touches a F-corner when s*rIn > rrMax
  const on = fl.info.filter(Boolean).map((x) => x.rrMax / x.rIn).sort((a, b) => a - b);
  const untouched = on.filter((o) => o >= 0.6).length;
  console.log(`\n${JSON.stringify(set)}  holes ${ref.pl.achieved}  onset s (rrMax/rIn) min ${on[0].toFixed(3)} med ${on[on.length >> 1].toFixed(3)} max ${on.at(-1).toFixed(3)}; at s=0.60 ${untouched} of ${on.length} holes are untouched at their largest-radius corners, ${on.length - untouched} rounded`);
  const tot = (hs) => hs.filter(Boolean).reduce((a, h) => a + L.polyArea(h), 0);
  console.log(`  ruled 0.60: area ${tot(ref.hs).toFixed(2)} medQ ${med(ref.hs.filter(Boolean).map(L.roundnessOf)).toFixed(4)}`);
  let best = null;
  for (let t = 0.0; t <= 0.41; t += 0.01) {
    const B = run(set, (r, rrMax) => { const a = Math.min(rrMax, r * 0.999); return a + t * (r * 0.999 - a); });
    let wA = 0, wH = 0; for (let i = 0; i < ref.hs.length; i++) { if (!ref.hs[i] || !B.hs[i]) continue; wA = Math.max(wA, Math.abs(L.polyArea(B.hs[i]) / L.polyArea(ref.hs[i]) - 1)); wH = Math.max(wH, hd(B.hs[i], ref.hs[i])); }
    const row = { t: +t.toFixed(2), ach: B.pl.achieved, area: tot(B.hs), medQ: med(B.hs.filter(Boolean).map(L.roundnessOf)), wA, wH };
    if (!best || wH < best.wH) best = row;
    if (true) console.log(`  anchored t=${row.t}: holes ${row.ach} area ${row.area.toFixed(2)} medQ ${row.medQ.toFixed(4)} worst per-hole area ${(100 * wA).toFixed(2)}% worst Hausdorff ${wH.toFixed(4)} mm`);
  }
  console.log(`  BEST anchored (min worst Hausdorff): t=${best.t} holes ${best.ach} area ${best.area.toFixed(2)} medQ ${best.medQ.toFixed(4)} worst per-hole area ${(100 * best.wA).toFixed(2)}% worst Hausdorff ${best.wH.toFixed(4)} mm`);
}
