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
*/

import * as G from '../bug-geometry.js';
import { IMAGE_FIXTURES, partLoops, rasterLoops } from './verify-bug-image-fixtures.mjs';

export const EXPECT = {
  butterfly: { pairs: 2, mode: 'split', tail: false },
  swallowtail: { pairs: 2, mode: 'split', tail: true },
  moth: { pairs: 1, mode: 'single', tail: false },
  dragonfly: { pairs: 2, mode: 'separate', tail: false },
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
  const cut = Math.max(t.params.thoraxWidth, fit.params.thoraxWidth) / 2 + 1;
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
export const boundMm = (img, tol) => tol + 3 / img.truth.pxPerMm + 0.5 * img.truth.asym * (img.truth.wingspanMm / 2);

/* The IM checks, against a given bug-image module (the gate passes the shipped
   one; the negative control passes mutants). Returns [[ok, message], ...]. */
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
    if (!r.ok) { ok(false, `IM1: ${name}: not fitted — ${r.reason}`); continue; }
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
    if (c.model) {
      const lk = bodyExt(img.truth.model), lf = bodyExt(c.model), px = 1 / img.truth.pxPerMm;
      const lb = 3 * px + 0.02 * lk, wk = img.truth.params.abdomenWidth, wf = r.params.abdomenWidth;
      ok(Math.abs(lf - lk) <= lb && Math.abs(wf - wk) <= 3 * px, `IM10: ${name}: body ${lf.toFixed(2)} mm long against the known ${lk.toFixed(2)} (bound ±${lb.toFixed(2)}), abdomen ${wf.toFixed(2)} mm wide against ${wk.toFixed(2)} (±${(3 * px).toFixed(2)}); head ${r.params.headSize.toFixed(2)} mm against ${img.truth.params.headSize.toFixed(2)} (reported)`);
    }
    const tl = r.params.wings.tail;
    if (ex.tail) ok(tl.on && tl.points.length >= 2 && c.tailTipMm <= b, `IM5: ${name}: TAIL group ${tl.on ? 'ON' : 'OFF'} with ${tl.points.length} points; the fitted tail tip ${c.tailTipMm.toFixed(3)} mm from the known one (bound ${b.toFixed(3)})`);
    else ok(!tl.on, `IM5: ${name}: no tail found where the picture has none (TAIL ${tl.on ? 'ON' : 'off'})`);
  }
  // IM6 — busy
  const busy = safe(() => I.imageToBug(F.busy, G.defaultParams(), { wingspanMm: F.busy.truth.wingspanMm }));
  ok(!busy.ok && /busy|symmetric|no clear/.test(busy.reason || '') && !busy.params, `IM6: the busy background is REFUSED: "${busy.reason}"${busy.params ? ' — and returned params' : ''}`);
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
  ['a busy picture is accepted', 'export const BUSY_BORDER_FRAC = 0.15;', 'export const BUSY_BORDER_FRAC = 2;', 'IM6', [['export const BUSY_FG_FRAC = 0.55;', 'export const BUSY_FG_FRAC = 2;'], ['export const SYM_MIN = 0.8;', 'export const SYM_MIN = 0;']]],
  ['the axis is not searched (assumed vertical)', 'for (let d = 0; d < 180; d += 3)', 'for (let d = 90; d < 91; d += 3)', 'IM2'],
  ['the scale reads the half-span as 0.9 of it', 'const spanPx = 2 * Math.max', 'const spanPx = 1.8 * Math.max', 'IM3'],
  ['no tail is ever grouped', '  if (!best) return null;\n  const mask', '  return null;\n  const mask', 'IM5'],
  ['the split line from the page is ignored', 'if (o.split && o.split.outer && o.split.root)', 'if (false)', 'IM8'],
  ['the tolerance is ignored', 'fit = fitOutline(chain, metric, tol,', 'fit = fitOutline(chain, metric, 0.6,', 'IM7'],
  ['the erase mask is ignored', 'if (opts.erase) for', 'if (false) for', 'IM9'],
  ['separate wings are taken as one mass', 'if (wings.length >= 2) {', 'if (wings.length >= 99) {', 'IM1'],
  ['the body is read 15% short', 'const B = (jTail - jHead) * s;', 'const B = 0.85 * (jTail - jHead) * s;', 'IM10'],
  ['the polarity is not read off the border', 'const autoLight = bMed < threshold;', 'const autoLight = false;', 'IM1'],
];
