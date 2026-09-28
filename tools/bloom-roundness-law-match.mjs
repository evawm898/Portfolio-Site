#!/usr/bin/env node
/* ===================================================================
   tools/bloom-roundness-law-match.mjs — THE RULED 0.60 SHAPE, TWO QUESTIONS.

     node tools/bloom-roundness-law-match.mjs              (the shipped control against the swept law)
     node tools/bloom-roundness-law-match.mjs --anchored   (why a fillet-anchored law cannot reproduce it)

   DEFAULT: does the SHIPPED `infillRound` at its default 0.60 draw the shape
   Eva ruled from `infill-roundness-sweep.png`? The reference is the swept
   law itself, `openingLaw(fillet traced at 20, 0.60 x inradius)` from
   tools/bloom-rim-roundness-lib.mjs, run on a patched copy of THIS tree with
   the shipped control stood down — a different owner from the quantity under
   test, which is the shipped geometry's own `infillOpen`. Compared hole by
   hole (the drop loop reads capacities, never the drawn holes, so the cells
   are the same cells on both sides): achieved count, per-hole area, per-hole
   Hausdorff, median roundness. The two differ only in how the arcs are
   DISCRETISED (the shipped one bisects normals so no decision rests on
   trigonometry), and the residual is printed, never hidden.

   --anchored: the measurement that ruled OUT the recommended
   reparameterisation (§F of docs/bloom-infill-roundness-and-bevel.md): a law
   whose floor is the existing fillet, R = a + t (rIn - a), swept t 0..0.40,
   against the same reference. It cannot agree at any t.
   =================================================================== */

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
if (process.argv.includes('--anchored')) {
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
}

if (!process.argv.includes('--anchored')) {
  const S = await import('../bloom-geometry.js');
  /* A convex polygon's inset by d — the half-plane clip, written here so the
     bar has no owner in the module under test. */
  const insetOf = (poly, d) => {
    let ar = 0; for (let k = 0; k < poly.length; k++) { const a = poly[k], b = poly[(k + 1) % poly.length]; ar += a.x * b.y - b.x * a.y; }
    const P = ar < 0 ? poly.slice().reverse() : poly; let out = P.slice();
    for (let k = 0; k < P.length && out.length >= 3; k++) {
      const A = P[k], B = P[(k + 1) % P.length]; const ex = B.x - A.x, ey = B.y - A.y, Ln = Math.hypot(ex, ey); if (Ln < 1e-12) continue;
      const nx = ey / Ln, ny = -ex / Ln, c = -(nx * A.x + ny * A.y) + d; const nxt = [];
      for (let j = 0; j < out.length; j++) { const p = out[j], q = out[(j + 1) % out.length]; const dp = nx * p.x + ny * p.y + c, dq = nx * q.x + ny * q.y + c; if (dp <= 0) nxt.push(p); if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) { const t = dp / (dp - dq); nxt.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }); } }
      out = nxt;
    }
    return out.length >= 3 ? out : null;
  };
  const hdS = (a, b) => { let m = 0; for (const q of a) m = Math.max(m, L.polyDist(q.x, q.y, b)); for (const q of b) m = Math.max(m, L.polyDist(q.x, q.y, a)); return m; };
  const medS = (x) => { const s = x.slice().sort((a, b) => a - b); return s[s.length >> 1]; };
  let bad = 0;
  console.log('THE SHIPPED infillRound AT 0.60 AGAINST THE SWEPT LAW AT 0.60 — EXPORT, per hole');
  for (const [name, set] of [['default', {}], ['petalWidth 8', { petalWidth: 8 }], ['petalWidth 30', { petalWidth: 30 }], ['density 40', { infillDensity: 40 }], ['cup 1.2 x curl 360', { petalCup: 1.2, petalSpineCurl: 360 }]]) {
    LAW = (r) => 0.6 * r;
    const ref = L.planFor(G, DEFAULTS, set).plan;
    const got = L.planFor(S, DEFAULTS, { ...set, infillRound: 0.6 }).plan;
    const hs = (pl) => pl.holes.map((h, i) => (h && pl.cellOpen[i] ? h : null));
    const A = hs(ref), B = hs(got);
    /* THE BAR IS THE DISCRETISATION'S OWN, DERIVED PER HOLE: both sides
       are chords of the same arcs, each chord turning at most 9 degrees plus
       one trace step (10), so neither sits further from the true opening than
       the sagitta R (1 - cos 5 deg) at that hole's own radius — and the two
       can differ by at most the sum. The area bar is that band times the
       perimeter, over the area. Nothing typed. */
    const SAG = 1 - Math.cos((5 * Math.PI) / 180);
    let wA = 0, wH = 0, pairs = 0, mism = 0, over = 0;
    for (let i = 0; i < Math.max(A.length, B.length); i++) {
      if (!!A[i] !== !!B[i]) { mism++; continue; }
      if (!A[i]) continue; pairs++;
      const rIn = (() => { let lo = 0, hi = 50; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; const inset = insetOf(A[i], m); if (inset) lo = m; else hi = m; } return lo; })();
      /* ...plus, where a corner is NOT yet rounded, the shipped control keeps
         TODAY'S five-chord trace (it is clipped to today's hole, so the floor
         is structural) where the swept law drew the same arc traced at 20 —
         the gap between them is the five-chord trace's own sagitta at the
         fillet radius — and the vertices it prunes as flat, at most its
         INFILL_ROUND_FLAT_MM. */
      const band = 2 * rIn * SAG + S.INFILL_FILLET_MM * (1 - Math.cos(Math.PI / 10)) + S.INFILL_ROUND_FLAT_MM + 2 * 2 ** -20;
      let per = 0; for (let k = 0; k < A[i].length; k++) { const p0 = A[i][k], p1 = A[i][(k + 1) % A[i].length]; per += Math.hypot(p1.x - p0.x, p1.y - p0.y); }
      const da = Math.abs(L.polyArea(B[i]) / L.polyArea(A[i]) - 1), dh = hdS(A[i], B[i]);
      if (dh > band || da > (band * per) / L.polyArea(A[i])) over++;
      wA = Math.max(wA, da); wH = Math.max(wH, dh);
    }
    const tot = (h) => h.filter(Boolean).reduce((a, x) => a + L.polyArea(x), 0);
    const q = (h) => medS(h.filter(Boolean).map(L.roundnessOf));
    const sameCells = ref.cells.length === got.cells.length;
    /* ON A CURVED PLAN THE TWO ARE NOT THE SAME LAW, BY DESIGN: the shipped
       control opens a hole in the surface's own local frame (a plan circle
       on a compressed sheet is a narrower ellipse on the object, and the
       swept plan-space law lost two of twelve holes there by 0.90), so that
       row is REPORTED against the swept law and asserted only on its count. */
    const curved = !got.planFlat;
    const ok = curved ? sameCells && mism === 0 && ref.achieved === got.achieved : sameCells && mism === 0 && ref.achieved === got.achieved && over === 0;
    if (!ok) bad++;
    console.log(`${name.padEnd(20)} holes ${got.achieved}/${got.cells.length} (swept ${ref.achieved}/${ref.cells.length})  area ${tot(B).toFixed(2)} (swept ${tot(A).toFixed(2)}) mm2  median roundness ${q(B).toFixed(4)} (swept ${q(A).toFixed(4)})  worst per-hole area ${(100 * wA).toFixed(3)}%  worst per-hole Hausdorff ${wH.toFixed(5)} mm  (${over} of ${pairs} holes outside their own discretisation band)  ${ok ? (curved ? 'SAME COUNT (curved: opened in the surface frame, shape differs by design)' : 'MATCH') : 'DIFFERS'}`);
  }
  console.log(bad ? `FAIL — ${bad} state(s) differ beyond the arc discretisation's own derived band, or in count` : 'PASS — on every flat plan the shipped control draws the swept law's shape hole for hole; the curved row keeps its count.');
  if (bad) process.exitCode = 1;
}
