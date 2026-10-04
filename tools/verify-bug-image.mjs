/* verify-bug-image.mjs — the IM family of the bug gate: IMAGE -> BUG
   (design doc §11). Imported by tools/verify-bug.mjs (which runs it beside every
   other function check, and builds every fitted bug as an ordinary row through
   M W P C F S R O N E ...). Node only, no browser: the pictures are rasterised
   here (tools/verify-bug-image-fixtures.mjs) from KNOWN bugs.

   THE REFERENCE IS THE KNOWN BUG, NEVER THE FIT'S OWN MEASUREMENT (the fourth
   durable rule): every outline claim compares the FITTED bug, built by buildBug
   from the params the import returned, against the bug the picture was drawn
   FROM, both placed in the picture by the KNOWN transform in millimetres (the
   fitted bug shifted along its body axis only, to the known wings' centroid) —
   never through the fit's own transform, which would carry a wrong scale or
   angle with it and hide it. The comparison is this file's own raster and
   boundary distance, not the import's.

     IM1  the fit is made, with the known number of wing pairs, in the expected
          mode (one mass split at its notch / separate wings / one pair).
     IM2  the mirror axis recovered: the fixture's rotation within 1.0 degree.
     IM3  the outline recovered: the RIGHT wings' union silhouette (beyond the
          body) of the fitted bug against the known one — boundary (Hausdorff)
          distance within  tol + 3 px + half the picture's asymmetry at the tip,
          and the MEAN offset (the two silhouettes' symmetric difference over the
          known outline's length) within tol / 2 + 1 px. The bounds are stated,
          not tuned: the tolerance is the fit's, 3 px is the staircase plus the
          1.2 px smoothing, and averaging a half stretched by (1 + a) moves the
          tip by a/2 of the half-span. (An IoU bar was tried first: it is not a
          property of the outline but of the wing's WIDTH — a dragonfly's strap
          wing read 0.946 at a 0.50 mm boundary distance.)
     IM4  the fitted bug is mirror-EXACT (mirrorDiff 0) from a picture that is
          NOT symmetric (vacuity: the fixture's left half is stretched).
     IM5  a tail: on the swallowtail the TAIL group is ON with >= 2 points and
          the fitted tail tip (the right wings' lowest point) lands within the
          IM3 bound of the known one; on every picture without a tail, no tail.
     IM6  a busy background is REFUSED with a reason naming it, and a refusal
          returns no params (no broken bug).
     IM7  the tolerance: at 3 mm the wings have FEWER control points than at
          0.1 mm; the 0.1 mm fit meets its own IM3 bound and its mean offset is
          smaller than the 3 mm fit's. (A bound on the 3 mm UNION was tried and
          is not a property of the fit: each pair stays within 3 mm of its own
          outline, but between two coarse pairs the notch fills in — 5.9 mm at
          the notch's bottom, measured — which is what a coarse fit is.)
     IM8  the split line: moved (its outer end to the notch's other side) the
          two pairs REFIT — both outlines change — while the union silhouette
          still meets IM3 (the picture did not change).
     IM9  the erase brush: a stray blob joined to the forewing spoils the fit
          (IM3 fails without the erase — vacuity) and the erase mask restores it.
     IM10 the proportions: the BUILT body's length (its own y-extent) within
          3 px + 2% of the known body's, and the abdomen's width within 3 px.
          The head size is REPORTED, not gated: a head is often hidden between
          the forewings' roots or merged with the antennae's bases (the moth's
          feathered antennae read a 3.9 mm head for a 2.4 mm one).
     IM11 the body's CONFIDENCE (§11.7): ESTIMATED on the same-tone picture (its
          body touches the wing roots, only the abdomen's tip shows), MEASURED on
          every other; an estimated body is no narrower than the default
          specimen's proportions at that wingspan — the reference computed HERE
          from defaultParams, never read from the importer's own fallback.
     IM12 no fitted wing crosses into the body: every right-wing point of the
          BUILT bug beside the abdomen or head lies outside the built body's own
          surface (per 0.5 mm band; within 1 mm of the thorax's span is the root,
          which attaches there by design).
     IM13 clutter dropped before anything is measured: the clutter picture (a
          paper corner with a table LARGER than the bug, a 1 cm scale bar, a
          label) and the sheet picture (the whole sheet on a table: a frame
          around the bug) fit, with the ground / the sheet and the marks counted.
     IM14 a refusal names its step and returns the shape it found: the busy
          picture at step 1, a one-sided shape (the left forewing erased) at
          step 2.
     IM15 each pair is fitted in its OWN frame (§13.6): the fitted sweep is the
          bearing, from the fitted bug's own hinge, of the KNOWN bug's apex (the
          farthest point of its drawn outline from its hinge, placed as IM3
          places it) within SWEEP_TOL_DEG, and the params carry the fitted sweep
          on every pair.
*/

import * as G from '../bug-geometry.js';
import { IMAGE_FIXTURES, partLoops, rasterLoops } from './verify-bug-image-fixtures.mjs';

export const EXPECT = {
  butterfly: { pairs: 2, mode: 'split', tail: false },
  swallowtail: { pairs: 2, mode: 'split', tail: true },
  moth: { pairs: 1, mode: 'single', tail: false },
  dragonfly: { pairs: 2, mode: 'separate', tail: false },
  sametone: { pairs: 2, mode: 'split', tail: false, body: 'estimated' },
  clutter: { pairs: 2, mode: 'split', tail: false, clutter: { ground: 1, marks: 1 } },
  sheet: { pairs: 2, mode: 'split', tail: false, clutter: { frame: 1, marks: 1 } },
};
const TOL = 0.6;

let cache = null;
export function fixtures() {
  if (!cache) cache = Object.fromEntries(Object.entries(IMAGE_FIXTURES).map(([k, f]) => [k, f()]));
  return cache;
}
const invAffine = (M) => { const d = M[0] * M[3] - M[2] * M[1]; return ([x, y]) => { const X = x - M[4], Y = y - M[5]; return [(M[3] * X - M[2] * Y) / d, (-M[1] * X + M[0] * Y) / d]; }; };
const rightWings = (q) => /^wing\d$/.test(q.kind) && q.side === 'R';

/* The two right-wing silhouettes in picture px, clipped to world x >= cut (the
   body excluded), and their boundary distance and overlap. */
export function compareToKnown(img, fit) {
  const t = img.truth, W = img.width, H = img.height;
  const known = rasterLoops(partLoops(t.model, rightWings), t.toPx, W, H, 2);   // (computed again below as gK for the centroid)
  // The fitted bug is placed in the picture through the KNOWN transform, in
  // MILLIMETRES — never through the fit's own matrix, which would carry a wrong
  // scale or angle with it and hide it (the first version did exactly that, and
  // the wrong-scale mutant passed). The one freedom the import legitimately
  // has — where along the body axis it puts the thorax — is taken out by
  // aligning the two right-wing silhouettes' area centroids in y.
  const fm = G.buildBug(fit.params);
  const cyOf = (groups) => { let A = 0, Cy = 0; for (const g of groups) for (const L of g) for (let k = 0; k < L.length; k++) { const [x0, y0] = L[k], [x1, y1] = L[(k + 1) % L.length], c = x0 * y1 - x1 * y0; A += c; Cy += (y0 + y1) * c; } return Cy / (3 * A); };
  const gK = partLoops(t.model, rightWings), gF = partLoops(fm, rightWings);
  const dy = cyOf(gK) - cyOf(gF);
  const fitted = rasterLoops(gF, ([x, y]) => t.toPx([x, y + dy]), W, H, 2);
  // (a picture whose body was inked into the wings' roots — the same-tone
  // fixture — is compared only beyond the inked band: truth.clipMm)
  // (and only beyond the KNOWN bug's own blended roots — §12.1: within each
  // pair's root map, hinge -> neck -> release, both bugs carry a DESIGNED root,
  // not the picture's, so what the fit draws there is not a reading of the
  // picture. The extent is read off the known model, never off the fit.)
  const HK = G.wingHinges(t.model.params, t.model.layout);
  let rootX = 0;
  for (const q of t.model.parts.filter(rightWings)) if (q.meta.root) rootX = Math.max(rootX, HK[q.meta.pair].hinge[0] + q.meta.root.neckU + q.meta.root.blend);
  const cut = Math.max(Math.max(t.params.thoraxWidth, fit.params.thoraxWidth) / 2 + 1, t.clipMm || 0, rootX);
  const clip = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) clip[y * W + x] = t.fromPx([x + 0.5, y + 0.5])[0] >= cut ? 1 : 0;
  const A = new Uint8Array(W * H), B = new Uint8Array(W * H);
  let xor = 0;
  for (let k = 0; k < W * H; k++) { if (!clip[k]) continue; A[k] = known[k] >= 0.5 ? 1 : 0; B[k] = fitted[k] >= 0.5 ? 1 : 0; xor += A[k] ^ B[k]; }
  const edge = (M) => {
    const out = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const k = y * W + x; if (!M[k]) continue;
      for (const d of [1, -1, W, -W]) if (!M[k + d] && clip[k + d]) { out.push([x + 0.5, y + 0.5]); break; }
    }
    return out;
  };
  const eA = edge(A), eB = edge(B);
  const directed = (P, Q) => {
    const cell = 8, grid = new Map(), key = (x, y) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
    for (const q of Q) { const k = key(q[0], q[1]); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(q); }
    let worst = 0, at = null;
    for (const p of P) {
      let best = Infinity;
      for (let r = 0; r < 60 && best > (r - 1) * cell; r++) {
        const cx = Math.floor(p[0] / cell), cy = Math.floor(p[1] / cell);
        for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) {
          if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue;
          for (const q of grid.get(`${cx + i},${cy + j}`) || []) best = Math.min(best, Math.hypot(p[0] - q[0], p[1] - q[1]));
        }
      }
      if (best > worst) { worst = best; at = p; }
    }
    directed.at = at;
    return worst;
  };
  const dAB = directed(eA, eB), atA = directed.at, dBA = directed(eB, eA), atB = directed.at;
  const hausPx = Math.max(dAB, dBA), worstAt = dAB >= dBA ? { side: 'known', px: atA, mm: t.fromPx(atA || [0, 0]) } : { side: 'fitted', px: atB, mm: t.fromPx(atB || [0, 0]) };
  // the lowest point of each (world y) — the tail's tip on a swallowtail
  let lowK = null, lowF = null;
  for (let k = 0; k < W * H; k++) {
    const x = k % W, y = (k / W) | 0, w = t.fromPx([x + 0.5, y + 0.5]);
    if (A[k] && (!lowK || w[1] < lowK[1])) lowK = w;
    if (B[k] && (!lowF || w[1] < lowF[1])) lowF = w;
  }
  // the mean offset: the symmetric difference spread along the known outline
  // (its boundary pixel count is its length in px, 4-connected, to ~10%)
  return { worstAt, hausMm: hausPx / t.pxPerMm, meanMm: xor / Math.max(1, eA.length) / t.pxPerMm, tailTipMm: lowK && lowF ? Math.hypot(lowK[0] - lowF[0], lowK[1] - lowF[1]) : Infinity, model: fm };
}
/* The default specimen's own wingspan (the gate measures it; the importer's
   fallback is not the reference). */
let DSPAN = null;
const DEFAULT_SPAN = () => { if (DSPAN == null) { const m = G.buildBug(G.defaultParams()); let x = 0; for (const q of m.parts.filter(rightWings)) for (let v = q.v0; v < q.v1; v++) x = Math.max(x, m.positions[3 * v]); DSPAN = 2 * x; } return DSPAN; };
/* How far every right-wing point of the built bug stays outside the BODY's own
   built surface beside the abdomen and the head: per 0.5 mm band of y, the
   body part's widest point; wing points within 1 mm of the thorax's span are
   the ROOT (it attaches there by design, under the body) and are not asked. */
export function bodyClearance(m, params) {
  const N = Math.max(0, params.wingPairs - 2), T = (params.thoraxLength * (1 + G.THORAX_PER_PAIR * N)) / 2;
  const body = m.parts.find((q) => q.kind === 'body'), bins = new Map(), key = (y) => Math.round(y * 2);
  for (let v = body.v0; v < body.v1; v++) { const k = key(m.positions[3 * v + 1]); bins.set(k, Math.max(bins.get(k) || 0, Math.abs(m.positions[3 * v]))); }
  let min = Infinity, at = [0, 0], n = 0;
  for (const q of m.parts.filter(rightWings)) for (let v = q.v0; v < q.v1; v++) {
    const x = m.positions[3 * v], y = m.positions[3 * v + 1];
    if (Math.abs(y) <= T + 1) continue;
    const bh = Math.max(bins.get(key(y)) ?? -Infinity, bins.get(key(y) - 1) ?? -Infinity, bins.get(key(y) + 1) ?? -Infinity);
    if (!Number.isFinite(bh)) continue;
    n++; if (x - bh < min) { min = x - bh; at = [x, y]; }
  }
  return { min, at, n };
}
export const boundMm = (img, tol) => tol + 3 / img.truth.pxPerMm + 0.5 * img.truth.asym * (img.truth.wingspanMm / 2);

/* The IM checks, against a given bug-image module (the gate passes the shipped
   one; the negative control passes mutants). Returns [[ok, message], ...]. */
/* IM15's bound: the fitted axis against the known one. The apex is one point of
   a rasterised outline, so its bearing is read to about a pixel over the wing's
   length (0.5 degrees at 40 px), and the picture's asymmetry moves the averaged
   half's tip by half of it (2% here, about 0.6 degrees). */
export const SWEEP_TOL_DEG = 3;
export function imageChecks(I) {
  const out = [], ok = (c, m) => out.push([!!c, m]);
  const F = fixtures();
  // a fit that THROWS is a failure of the clause that asked, never a crash of the gate
  const safe = (fn) => { try { return fn(); } catch (e) { return { ok: false, reason: `threw: ${e.message}` }; } };
  const fitOf = (name, extra = {}) => safe(() => I.imageToBug(F[name], G.defaultParams(), { wingspanMm: F[name].truth.wingspanMm, toleranceMm: TOL, ...extra }));
  const results = {};
  for (const [name, ex] of Object.entries(EXPECT)) {
    const img = F[name], r = fitOf(name);
    results[name] = r;
    if (!r.ok) {
      ok(false, `IM1: ${name}: not fitted — ${r.reason}`);
      // IM13's claim IS that the clutter picture fits: its refusal is IM13's failure too
      if (ex.clutter) ok(false, `IM13: ${name}: the clutter was not dropped — the picture was refused: ${r.reason}`);
      continue;
    }
    ok(r.params.wingPairs === ex.pairs && r.mode === ex.mode, `IM1: ${name}: ${r.params.wingPairs} pair(s) by '${r.mode}' (expected ${ex.pairs} by '${ex.mode}')`);
    const want = (90 + img.truth.angleDeg + 180) % 180, got = ((r.transform.axisDeg % 180) + 180) % 180;
    const dA = Math.min(Math.abs(want - got), 180 - Math.abs(want - got));
    ok(dA <= 1.0, `IM2: ${name}: mirror axis at ${got.toFixed(2)} deg, the picture's at ${want.toFixed(2)} (off ${dA.toFixed(2)})`);
    const c = (() => { try { return compareToKnown(img, r); } catch (e) { return { hausMm: Infinity, meanMm: Infinity, tailTipMm: Infinity, model: null, err: e.message }; } })(), b = boundMm(img, TOL);
    const mb = TOL / 2 + 1 / img.truth.pxPerMm;
    ok(c.hausMm <= b && c.meanMm <= mb, `IM3: ${name}: the fitted right wings are within ${c.hausMm.toFixed(3)} mm of the KNOWN outline (bound ${b.toFixed(3)}), mean offset ${c.meanMm.toFixed(3)} mm (bound ${mb.toFixed(3)})`);
    const md = c.model ? G.mirrorDiff(c.model) : NaN;
    ok(md === 0 && img.truth.asym > 0, `IM4: ${name}: the fitted bug is mirror-exact (mirrorDiff ${md}) from a picture whose left half is stretched ${(100 * img.truth.asym).toFixed(1)}%`);
    const bodyExt = (m) => { const q = m.parts.find((x) => x.kind === 'body'); let y0 = Infinity, y1 = -Infinity; for (let v = q.v0; v < q.v1; v++) { y0 = Math.min(y0, m.positions[3 * v + 1]); y1 = Math.max(y1, m.positions[3 * v + 1]); } return y1 - y0; };
    if (c.model && !ex.body) {
      const lk = bodyExt(img.truth.model), lf = bodyExt(c.model), px = 1 / img.truth.pxPerMm;
      const lb = 3 * px + 0.02 * lk, wk = img.truth.params.abdomenWidth, wf = r.params.abdomenWidth;
      ok(Math.abs(lf - lk) <= lb && Math.abs(wf - wk) <= 3 * px, `IM10: ${name}: body ${lf.toFixed(2)} mm long against the known ${lk.toFixed(2)} (bound ±${lb.toFixed(2)}), abdomen ${wf.toFixed(2)} mm wide against ${wk.toFixed(2)} (±${(3 * px).toFixed(2)}); head ${r.params.headSize.toFixed(2)} mm against ${img.truth.params.headSize.toFixed(2)} (reported)`);
    }
    const tl = r.params.wings.tail;
    if (ex.tail) ok(tl.on && tl.points.length >= 2 && c.tailTipMm <= b, `IM5: ${name}: TAIL group ${tl.on ? 'ON' : 'OFF'} with ${tl.points.length} points; the fitted tail tip ${c.tailTipMm.toFixed(3)} mm from the known one (bound ${b.toFixed(3)})`);
    else ok(!tl.on, `IM5: ${name}: no tail found where the picture has none (TAIL ${tl.on ? 'ON' : 'off'})`);
    // IM15 — each pair's SWEEP is fitted and stored (§13.6). The reference is
    // the KNOWN bug's apex — the farthest point of its drawn outline (tail
    // excluded) from its own hinge, carried into the world by the KNOWN frame
    // and placed in the fitted bug's world the way IM3 places it (the two
    // right-wing silhouettes' centroids aligned in y) — seen from the FITTED
    // bug's hinge, the pivot the stored angle turns about (the hinge is a body
    // measurement, not the quantity under test). And the params carry it.
    if (c.model && r.params.wingPairs === img.truth.params.wingPairs) {
      const tp = img.truth.params, known = G.resolveWingPairs(G.normalizeParams(tp));
      const cyOf = (m) => { let A = 0, Cy = 0; for (const g of partLoops(m, rightWings)) for (const L of g) for (let k = 0; k < L.length; k++) { const [x0, y0] = L[k], [x1, y1] = L[(k + 1) % L.length], cc = x0 * y1 - x1 * y0; A += cc; Cy += (y0 + y1) * cc; } return Cy / (3 * A); };
      const dy = cyOf(img.truth.model) - cyOf(c.model);
      const want = known.map((sp, k) => {
        const pts = sp.points || sp.ctrl; let best = -1, at = null;
        for (const [u, w] of G.sampleOutline(pts)) { const d = Math.hypot(u, w * sp.stretch); if (d > best) { best = d; at = [u, w]; } }
        const P = G.editorFrame(tp, k).toWorld(at[0], at[1]), H = G.editorFrame(r.params, k).hinge;
        return (Math.atan2(-(P[1] - dy - H[1]), P[0] - H[0]) * 180) / Math.PI;
      });
      const W = r.params.wings, N = r.params.wingPairs;
      const stored = r.pairs.map((q, k) => (k === 0 ? W.first : k === N - 1 ? W.last : W.unlinked[k]).sweep);
      const errs = r.pairs.map((q, k) => Math.abs(q.sweep - want[k]));
      ok(errs.every((e) => e <= SWEEP_TOL_DEG) && r.pairs.every((q, k) => stored[k] === q.sweep), `IM15: ${name}: fitted sweeps ${r.pairs.map((q) => q.sweep.toFixed(1)).join(' / ')} deg against the known apexes' bearings ${want.map((v) => v.toFixed(1)).join(' / ')} from the fitted hinges (off ${errs.map((e) => e.toFixed(2)).join(' / ')}, bound ${SWEEP_TOL_DEG}); stored ${stored.join(' / ')}`);
    }
    // IM11 — the body's confidence: ESTIMATED exactly where it cannot be seen,
    // and then never narrower than the default proportions at this wingspan.
    // The reference is the GEOMETRY's default specimen scaled here, in the
    // gate — not the importer's own fallback (which a mutant would move too)
    const src = r.body.source, wantSrc = ex.body || 'measured';
    ok(src === wantSrc, `IM11: ${name}: the body is ${src} (expected ${wantSrc})${r.body.why ? ' — ' + r.body.why : ''}`);
    if (src === 'estimated') {
      const d = G.defaultParams(), k = img.truth.wingspanMm / DEFAULT_SPAN();
      const nar = ['abdomenWidth', 'thoraxWidth', 'headSize'].filter((f) => r.params[f] < d[f] * k - 0.02);
      ok(!nar.length, `IM11: ${name}: the estimated body is no narrower than the default proportions at a ${img.truth.wingspanMm.toFixed(1)} mm wingspan (abdomen ${r.params.abdomenWidth} >= ${(d.abdomenWidth * k).toFixed(2)}, thorax ${r.params.thoraxWidth} >= ${(d.thoraxWidth * k).toFixed(2)}, head ${r.params.headSize} >= ${(d.headSize * k).toFixed(2)})${nar.length ? ' — NARROWER: ' + nar.join(', ') : ''}`);
    }
    // IM12 — the wings never cross into the body
    if (c.model) { const cl = bodyClearance(c.model, r.params); ok(cl.min >= 0, `IM12: ${name}: no fitted wing crosses into the body beside the abdomen or head — the nearest wing point is ${cl.min.toFixed(3)} mm outside the body's own surface (at ${cl.at.map((v) => v.toFixed(1)).join(', ')} mm; over ${cl.n} wing points)`); }
    // IM13 — clutter dropped before anything was measured
    if (ex.clutter) {
      const st = r.seg.stats, op = st.otherPolarity || {};
      const ground = st.groundDropped + (op.groundDropped || 0), frames = st.framesDropped + (op.framesDropped || 0);
      ok(ground >= (ex.clutter.ground || 0) && frames >= (ex.clutter.frame || 0) && st.marksIgnored >= ex.clutter.marks, `IM13: ${name}: the clutter was dropped — ${ground} ground shape(s) along the edge, ${frames} sheet(s) around the bug, ${st.marksIgnored} detached mark(s) ignored (the scale bar, the label)`);
    }
  }
  // IM6 — busy
  const busy = safe(() => I.imageToBug(F.busy, G.defaultParams(), { wingspanMm: F.busy.truth.wingspanMm }));
  ok(!busy.ok && /busy|symmetric|no clear/.test(busy.reason || '') && !busy.params, `IM6: the busy background is REFUSED: "${busy.reason}"${busy.params ? ' — and returned params' : ''}`);
  // IM14 — a refusal NAMES the step that failed, and hands back what was found
  ok(busy.step === 1 && /^step 1 of 5 \(finding the bug in the picture\)/.test(busy.reason || '') && busy.seg && busy.seg.mask, `IM14: the busy refusal names its step: "${(busy.reason || '').slice(0, 70)}…" (step ${busy.step}), and returns the shape it found for the page to show`);
  {
    // the LEFT FOREWING erased: the shape is not symmetric
    const b = F.butterfly, t = b.truth, W = b.width, H = b.height, er = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const w = t.fromPx([x + 0.5, y + 0.5]); if (w[0] < -3 && w[1] > -1) er[y * W + x] = 1; }
    const lop = safe(() => I.imageToBug(b, G.defaultParams(), { wingspanMm: t.wingspanMm, erase: er }));
    ok(!lop.ok && lop.step === 2 && /^step 2 of 5 \(finding the mirror axis\)/.test(lop.reason || '') && /outlined on the picture/.test(lop.reason || '') && lop.seg && lop.seg.mask && !lop.params, `IM14: a one-sided shape is refused at the mirror-axis step: "${(lop.reason || '').slice(0, 90)}…" (step ${lop.step})`);
  }
  // IM7 — the tolerance at both ends
  const lo = fitOf('butterfly', { toleranceMm: 0.1 }), hi = fitOf('butterfly', { toleranceMm: 3 });
  if (lo.ok && hi.ok) {
    const nlo = lo.pairs.reduce((s, q) => s + q.points, 0), nhi = hi.pairs.reduce((s, q) => s + q.points, 0);
    const clo = compareToKnown(F.butterfly, lo), chi = compareToKnown(F.butterfly, hi);
    ok(nhi < nlo, `IM7: tolerance 3 mm gives fewer control points (${nhi}) than 0.1 mm (${nlo})`);
    ok(clo.hausMm <= boundMm(F.butterfly, 0.1) && clo.meanMm < chi.meanMm, `IM7: the closer end is closer — 0.1 mm: within ${clo.hausMm.toFixed(3)} mm of the known outline (bound ${boundMm(F.butterfly, 0.1).toFixed(3)}), mean offset ${clo.meanMm.toFixed(3)} mm against ${chi.meanMm.toFixed(3)} at 3 mm`);
  } else ok(false, `IM7: a tolerance-end fit was refused (${lo.reason || ''} ${hi.reason || ''})`);
  // IM8 — the split line moved
  const r0 = results.butterfly;
  if (r0 && r0.ok && r0.split) {
    // the outer end moved off the notch, down the hindwing's margin (the fit
    // snaps it to the outline), and the root end down the body
    const moved = { outer: [r0.split.outer[0] + 1, r0.split.outer[1] - 4], root: [r0.split.root[0], r0.split.root[1] - 1.5] };
    const r1 = fitOf('butterfly', { split: moved });
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const changed = r1.ok && !same(r1.params.wings.first.points, r0.params.wings.first.points) && !same(r1.params.wings.last.points, r0.params.wings.last.points);
    const slid = r1.ok && r1.split && Math.hypot(r1.split.outer[0] - r0.split.outer[0], r1.split.outer[1] - r0.split.outer[1]) > 1;
    const c1 = r1.ok ? compareToKnown(F.butterfly, r1) : null;
    ok(changed && slid && r1.mode === 'split' && c1.hausMm <= boundMm(F.butterfly, TOL), `IM8: the split line moved: its outer end slid along the margin (${slid ? 'yes' : 'NO'}), both pairs refit (${changed ? 'both changed' : 'NOT both changed'}), the union still within ${c1 ? c1.hausMm.toFixed(3) : '—'} mm (bound ${boundMm(F.butterfly, TOL).toFixed(3)})`);
  } else ok(false, 'IM8: the butterfly has no split line to move');
  // IM9 — the erase brush
  const st = F.stray;
  const dirty = safe(() => I.imageToBug(st, G.defaultParams(), { wingspanMm: st.truth.wingspanMm, toleranceMm: TOL }));
  const clean = safe(() => I.imageToBug(st, G.defaultParams(), { wingspanMm: st.truth.wingspanMm, toleranceMm: TOL, erase: st.erase }));
  const cd = dirty.ok ? compareToKnown(st, dirty).hausMm : Infinity, cc = clean.ok ? compareToKnown(st, clean).hausMm : Infinity, bs = boundMm(st, TOL);
  ok(cd > bs && cc <= bs, `IM9: a stray blob spoils the fit (${Number.isFinite(cd) ? cd.toFixed(3) : 'refused'} mm, must exceed ${bs.toFixed(3)}) and the erase mask restores it (${Number.isFinite(cc) ? cc.toFixed(3) : 'refused'} mm)`);
  return { checks: out, results };
}

/* Every successful fit, as an ordinary built row for the rest of the gate. */
export function imageRows(results) {
  return Object.entries(results).filter(([, r]) => r.ok).map(([name, r]) => [`image: ${name} (fitted)`, r.params, {}]);
}

/* Code mutants of bug-image.js for the negative control: [id, from, to, clause, extra edits?]. */
export const IMAGE_MUTANTS = [
  // all three refusal layers off (the border, the subject fraction, the mirror
  // score): disabling the border test alone is NOT a busy picture accepted —
  // the mirror score still refuses it (63%), which the first run of this
  // mutant measured as a MISS of the defect it named
  ['a busy picture is accepted', 'export const BUSY_SHAPE_SHARE = 0.25;', 'export const BUSY_SHAPE_SHARE = 0;', 'IM6', [['export const BUSY_FG_FRAC = 0.55;', 'export const BUSY_FG_FRAC = 2;'], ['export const SYM_MIN = 0.8;', 'export const SYM_MIN = 0;']]],
  ['the axis is not searched (assumed vertical)', 'for (let d = 0; d < 180; d += 3)', 'for (let d = 90; d < 91; d += 3)', 'IM2'],
  ['the scale reads the half-span as 0.9 of it', 'const spanPx = 2 * Math.max', 'const spanPx = 1.8 * Math.max', 'IM3'],
  ['no tail is ever grouped', '  if (!best) return null;\n  const mask', '  return null;\n  const mask', 'IM5'],
  ['the split line from the page is ignored', 'if (o.split && o.split.outer && o.split.root)', 'if (false)', 'IM8'],
  ['the tolerance is ignored', 'fit = fitOutline(chain, metric, tol,', 'fit = fitOutline(chain, metric, 0.6,', 'IM7'],
  ['the erase mask is ignored', 'if (opts.erase) for', 'if (false) for', 'IM9'],
  ['separate wings are taken as one mass', 'if (wings.length >= 2) {', 'if (wings.length >= 99) {', 'IM1'],
  ['the body is read 15% short', 'B = (jTail - jHead) * s;', 'B = 0.85 * (jTail - jHead) * s;', 'IM10'],
  ['the polarity is read off the border alone', 'if (pb.size > pa.size) {', 'if (false) {', 'IM13'],
  ['the body is always measured (a sliver fitted)', 'const confident = abdSeenMm >=', 'const confident = true || abdSeenMm >=', 'IM11'],
  // 'the wing root runs down the body' (IM12) is RETIRED, not passing: since
  // §12 two mechanisms each prevent it on their own — the fitter replaces the
  // root zone with a bridge to two anchors on the thorax (completeChain), and
  // the model's blended root narrows every wing to its neck at the body's
  // silhouette — and the mutation fired nothing even with the completion
  // switched off too (measured). IM12 still asserts on every fit; it has no
  // live mutant, a gap recorded here rather than one manufactured.
  ['the ground along the edge is kept', 'if (border[id] / borderN > BORDER_TOUCH_FRAC) {', 'if (false) {', 'IM13'],
  ['the fitted sweep is dropped', 'stretch: +S.toFixed(4), sweep });', 'stretch: +S.toFixed(4), sweep: 0 });', 'IM15'],
  ['a refusal does not name its step', "reason: `step ${k} of ${STEPS.length} (${STEPS[k - 1]}) failed: ${text}`", 'reason: text', 'IM14'],
];
