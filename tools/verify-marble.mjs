#!/usr/bin/env node
/* verify-marble.mjs — the /marble gate.

   PART ONE (Node, seconds) drives the shipped marble-math.js:
     F  each transform matches its closed-form equation on sample points — the
        equation RESTATED HERE from the literature (Jaffer / Lu et al.), with
        pow(2, -|d|/c) where the module uses exp(), never imported from it:
        F1 drop  P' = C + (P-C)·sqrt(1 + r²/|P-C|²)
        F2 tine  P' = P + z·2^(-|d|/c)·M,  d = (P-B)·N
        F3 wavy  d = (P-B)·N - A·sin(2π(P-B)·M/L + φ)
        F4 stir  P' = C + R(θ)(P-C),  θ = z·2^(-||P-C|-r|/c)/|P-C|
        each through BOTH the point function and the mapper the engine uses.
     P  consequences of those equations that are not restatements: the drop
        keeps every point on its own ray at sqrt(d²+r²); a point ON a tine line
        shifts by exactly z and at distance c by exactly z/2 with its distance
        to the line unchanged; a point on the wavy curve shifts by exactly z;
        the stir keeps |P-C| exactly and turns the ring by arc length z; a
        straight comb equals its tines applied one after another and is
        centred on the stroke; n concentric drops put the first ring at
        r·sqrt(n) exactly.
     E  the polygon engine: every vertex of a mapped region is the image of a
        point ON the source polygon (drop and tine inverted in closed form —
        a chord point would not be), every mapped edge is at most MAX_SEG
        where chords would have exceeded it, pruning moves no vertex further
        than PRUNE_TOL, and a pathological stack lands under the point budget
        with the coarsening TOLD on the state.
     H  the hash: a drop followed by a tine encodes, decodes to the same ops
        and REPLAYS BIT-IDENTICALLY (Object.is on every coordinate); every
        pattern and the random sequence round-trip the same way; the string
        uses only fragment-safe characters; a corrupt or newer link is refused.
     S  the SVG export: one path per region, the sheet's viewBox, finite.
     T  timing (REPORTED, bar in part two): replay of 200 ops, one preview pass.

   PART TWO (Chromium) drives the real page with real pointer events:
     B  loads clean · a click drops ink where it was clicked (pixel) · holding
        grows the drop · a drag previews live and commits one op of the chosen
        kind for each of tine / comb / wavy / stir · settings show and hide per
        tool · undo pops a group and redo restores it, from the keyboard too ·
        patterns commit one group each and a seed reproduces · the link
        REPRODUCES: a second page opened on the hash reports the same digest ·
        SVG and PNG exports are non-empty and the SVG parses with one path per
        region · at 200 ops a real comb drag's worst preview+frame is under the
        bar · at phone width (390 × 844, touch) nothing scrolls sideways, the
        sheet fits, and a tap drops ink.

   --negative-control  nine mutations of marble-math.js, each served to part
                       one from tools/.scratch and required to redden exactly
                       the clauses it names. Part two is NOT mutated.
   --no-browser        part one only.

   NOT COVERED: that the pictures look like marbling — the sheet is ruled by
   eye; the clipboard button (headless has no clipboard). */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const NEG = args.includes('--negative-control');
const NOBROWSER = args.includes('--no-browser') || NEG;
const PREVIEW_BAR_MS = +(args.find((a) => a.startsWith('--bar='))?.slice(6) || 120);

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? ' ok ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const COLORS = ['#0A0A0C', '#5FA0A0', '#D6A15C', '#8A8A85', '#EDEDE8'];

/* the literature, restated here (pow, not exp; a different author) */
const half = (d, c) => Math.pow(2, -Math.abs(d) / c);
const lit = {
  drop: (p, C, r) => { const dx = p[0] - C[0], dy = p[1] - C[1], d = Math.hypot(dx, dy); const f = Math.sqrt(1 + (r / d) ** 2); return [C[0] + dx * f, C[1] + dy * f]; },
  tine: (p, B, M, z, c) => { const N = [-M[1], M[0]]; const d = (p[0] - B[0]) * N[0] + (p[1] - B[1]) * N[1]; const s = z * half(d, c); return [p[0] + s * M[0], p[1] + s * M[1]]; },
  wavy: (p, B, M, z, c, A, L, phi) => { const N = [-M[1], M[0]]; const px = p[0] - B[0], py = p[1] - B[1]; const d = (px * N[0] + py * N[1]) - A * Math.sin(2 * Math.PI * (px * M[0] + py * M[1]) / L + phi); const s = z * half(d, c); return [p[0] + s * M[0], p[1] + s * M[1]]; },
  stir: (p, C, r, z, c) => { const dx = p[0] - C[0], dy = p[1] - C[1], rho = Math.hypot(dx, dy); const th = z * half(rho - r, c) / rho; return [C[0] + dx * Math.cos(th) - dy * Math.sin(th), C[1] + dx * Math.sin(th) + dy * Math.cos(th)]; },
};
function samples(seed, n = 400) {
  const rand = mulberry(seed); const out = [];
  for (let i = 0; i < n; i++) out.push([rand() * 1000, rand() * 1250]);
  return out;
}
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const worst = (pairs) => pairs.reduce((m, [a, b]) => Math.max(m, Math.hypot(a[0] - b[0], a[1] - b[1])), 0);
function distToPoly(p, pts) {
  const n = pts.length / 2; let best = Infinity;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, ax = pts[2 * i], ay = pts[2 * i + 1], bx = pts[2 * j], by = pts[2 * j + 1];
    const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
    const t = l2 ? Math.max(0, Math.min(1, ((p[0] - ax) * vx + (p[1] - ay) * vy) / l2)) : 0;
    best = Math.min(best, Math.hypot(ax + t * vx - p[0], ay + t * vy - p[1]));
  }
  return best;
}
const sameFloats = (a, b) => a.regions.length === b.regions.length && a.regions.every((ra, i) => { const rb = b.regions[i]; return ra.color === rb.color && ra.pts.length === rb.pts.length && ra.pts.every((v, k) => Object.is(v, rb.pts[k])); });

/* ================= PART ONE ================= */
async function partOne(G, label = 'shipped') {
  const out = [];
  const rec = (name, ok, detail = '') => { out.push({ name, ok: !!ok, detail }); if (label === 'shipped') check(name, ok, detail); };
  const safe = (fn) => { try { return fn(); } catch (e) { return { threw: String(e) }; } };
  const pts = samples(11);
  const o = [0, 0];
  const viaMapper = (op, p) => { G.mapperFor(op)(p[0], p[1], o); return [o[0], o[1]]; };

  // F formulas
  {
    const C = [420, 610], r = 48;
    const pf = pts.map((p) => [G.dropPoint(p[0], p[1], C[0], C[1], r), lit.drop(p, C, r)]);
    const pm = pts.map((p) => [viaMapper({ k: 'd', x: C[0], y: C[1], r }, p), lit.drop(p, C, r)]);
    rec('F1 drop matches P\' = C + (P-C)·sqrt(1 + r²/|P-C|²) on 400 points, point function and mapper', worst(pf) < 1e-9 && worst(pm) < 1e-9, `worst ${worst(pf).toExponential(2)} / ${worst(pm).toExponential(2)}`);
  }
  {
    const B = [300, 500], M = [Math.cos(0.7), Math.sin(0.7)], z = 130, c = 22;
    const op = { k: 't', x0: B[0], y0: B[1], x1: B[0] + 400 * M[0], y1: B[1] + 400 * M[1], z, c };
    const pf = pts.map((p) => [G.tinePoint(p[0], p[1], B[0], B[1], M[0], M[1], z, c), lit.tine(p, B, M, z, c)]);
    const pm = pts.map((p) => [viaMapper(op, p), lit.tine(p, B, M, z, c)]);
    rec('F2 tine matches P\' = P + z·2^(-|d|/c)·M, d = (P-B)·N, point function and mapper', worst(pf) < 1e-9 && worst(pm) < 1e-9, `worst ${worst(pf).toExponential(2)} / ${worst(pm).toExponential(2)}`);
  }
  {
    const B = [500, 100], M = [0, 1], z = 90, c = 18, A = 35, L = 240, phiDeg = 73.5, phi = phiDeg * Math.PI / 180;
    const op = { k: 'w', x0: B[0], y0: B[1], x1: B[0], y1: B[1] + 500, z, c, n: 1, s: 0, A, L, phi: phiDeg };
    const pf = pts.map((p) => [G.wavyPoint(p[0], p[1], B[0], B[1], M[0], M[1], z, c, A, L, phi), lit.wavy(p, B, M, z, c, A, L, phi)]);
    const pm = pts.map((p) => [viaMapper(op, p), lit.wavy(p, B, M, z, c, A, L, phi)]);
    rec('F3 wavy tine matches d = (P-B)·N - A·sin(2π(P-B)·M/L + φ), point function and mapper (φ = 73.5°)', worst(pf) < 1e-9 && worst(pm) < 1e-9, `worst ${worst(pf).toExponential(2)} / ${worst(pm).toExponential(2)}`);
  }
  {
    const C = [480, 700], r = 120, z = -160, c = 30;
    const op = { k: 's', x: C[0], y: C[1], r, z, c };
    const pf = pts.map((p) => [G.stirPoint(p[0], p[1], C[0], C[1], r, z, c), lit.stir(p, C, r, z, c)]);
    const pm = pts.map((p) => [viaMapper(op, p), lit.stir(p, C, r, z, c)]);
    rec('F4 stir matches P\' = C + R(θ)(P-C), θ = z·2^(-||P-C|-r|/c)/|P-C|, point function and mapper', worst(pf) < 1e-9 && worst(pm) < 1e-9, `worst ${worst(pf).toExponential(2)} / ${worst(pm).toExponential(2)}`);
  }

  // P consequences
  {
    const C = [400, 400], r = 60; let rayOk = true, radOk = true, wr = 0;
    for (const p of pts) {
      const q = G.dropPoint(p[0], p[1], C[0], C[1], r);
      const d = Math.hypot(p[0] - C[0], p[1] - C[1]), dq = Math.hypot(q[0] - C[0], q[1] - C[1]);
      const cross = (p[0] - C[0]) * (q[1] - C[1]) - (p[1] - C[1]) * (q[0] - C[0]);
      if (Math.abs(cross) > 1e-6 * d * dq) rayOk = false;
      wr = Math.max(wr, Math.abs(dq - Math.sqrt(d * d + r * r)));
      if (wr > 1e-9) radOk = false;
    }
    rec('P1 the drop keeps every point on its own ray at exactly sqrt(d² + r²)', rayOk && radOk, `worst radius error ${wr.toExponential(2)}`);
  }
  {
    const B = [200, 300], M = [Math.cos(-0.4), Math.sin(-0.4)], N = [-M[1], M[0]], z = 100, c = 25;
    const onLine = [B[0] + 150 * M[0], B[1] + 150 * M[1]];
    const atC = [onLine[0] + c * N[0], onLine[1] + c * N[1]], at2C = [onLine[0] - 2 * c * N[0], onLine[1] - 2 * c * N[1]];
    const sh = (p) => { const q = G.tinePoint(p[0], p[1], B[0], B[1], M[0], M[1], z, c); return [Math.hypot(q[0] - p[0], q[1] - p[1]), (q[0] - B[0]) * N[0] + (q[1] - B[1]) * N[1], (p[0] - B[0]) * N[0] + (p[1] - B[1]) * N[1]]; };
    const a = sh(onLine), b = sh(atC), d2 = sh(at2C);
    rec('P2 a point ON the tine line shifts exactly z; at distance c exactly z/2, at 2c z/4; its distance to the line is unchanged', near(a[0], z) && near(b[0], z / 2) && near(d2[0], z / 4) && near(a[1], a[2]) && near(b[1], b[2]) && near(d2[1], d2[2]), `shifts ${a[0].toFixed(6)} / ${b[0].toFixed(6)} / ${d2[0].toFixed(6)} for z ${z}`);
  }
  {
    const B = [500, 200], M = [0, 1], N = [-1, 0], z = 70, c = 20, A = 40, L = 300, phi = 0.9;
    let ok = true, w = 0;
    for (let i = 0; i < 20; i++) {
      const s = i * 37.3, n = A * Math.sin(2 * Math.PI * s / L + phi);
      const p = [B[0] + M[0] * s + N[0] * n, B[1] + M[1] * s + N[1] * n];
      const q = G.wavyPoint(p[0], p[1], B[0], B[1], M[0], M[1], z, c, A, L, phi);
      const shift = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const across = Math.abs((q[0] - p[0]) * N[0] + (q[1] - p[1]) * N[1]);
      w = Math.max(w, Math.abs(shift - z), across);
      if (!near(shift, z) || across > 1e-9) ok = false;
    }
    rec('P3 a point ON the wavy curve shifts exactly z, and only along M', ok, `worst ${w.toExponential(2)}`);
  }
  {
    const C = [500, 500], r = 90, z = 55, c = 25; let radOk = true, w = 0;
    for (const p of pts) { const q = G.stirPoint(p[0], p[1], C[0], C[1], r, z, c); const e = Math.abs(Math.hypot(q[0] - C[0], q[1] - C[1]) - Math.hypot(p[0] - C[0], p[1] - C[1])); w = Math.max(w, e); if (e > 1e-9) radOk = false; }
    const onRing = [C[0] + r, C[1]];
    const q = G.stirPoint(onRing[0], onRing[1], C[0], C[1], r, z, c);
    const ang = Math.atan2(q[1] - C[1], q[0] - C[0]);
    const centre = G.stirPoint(C[0], C[1], C[0], C[1], r, z, c);
    rec('P4 the stir keeps |P-C| exactly, turns the ring by arc length z, and holds the centre', radOk && near(ang * r, z) && centre[0] === C[0] && centre[1] === C[1], `worst radius drift ${w.toExponential(2)}, ring arc ${(ang * r).toFixed(6)} for z ${z}`);
  }
  {
    const op = { k: 'k', x0: 300, y0: 200, x1: 900, y1: 1100, z: 140, c: 20, n: 7, s: 33 };
    const [mx, my] = G.unitDir(op.x0, op.y0, op.x1, op.y1), nx = -my, ny = mx;
    const offs = G.combOffsets(op.n, op.s);
    const seq = (p) => { let q = p; for (const off of offs) q = G.tinePoint(q[0], q[1], op.x0 + nx * off, op.y0 + ny * off, mx, my, op.z, op.c); return q; };
    const pairs = pts.map((p) => [viaMapper(op, p), seq(p)]);
    const centred = near(offs.reduce((a, b) => a + b, 0), 0) && offs.every((v, i) => i === 0 || near(v - offs[i - 1], op.s));
    rec('P5 a straight comb equals its tines applied one after another, and is centred on the stroke', worst(pairs) < 1e-9 && centred, `worst ${worst(pairs).toExponential(2)}, offsets ${offs.map((v) => v.toFixed(1)).join(' ')}`);
  }
  {
    const n = 6, r = 50, ops = G.concentricPattern(COLORS, { x: 500, y: 600, count: n, r });
    // through the engine with pruning OFF: pruning is a tolerance (E3's clause) and
    // this clause is about the transform, whose bound on a k-gon is exact
    let st = G.emptyState('#EDEDE8'); for (const op of ops) st = G.applyOp(st, op, { prune: false });
    // the first ring is a k-gon, so its vertices sit at radius r and its inserted
    // chord midpoints at r·cos(π/k); after five more drops of radius r a point at
    // radius ρ is at sqrt(ρ² + 5r²) — so the ring's outermost vertex is EXACTLY
    // r·sqrt(6) and nothing is nearer than sqrt((r cos π/k)² + 5r²).
    // ...and that bound is exact after ONE further drop; after five the sag compounds
    // (each refinement bisects the CURRENT polygon's chords), so the six-drop ring
    // is held to the identity on its outermost vertex and REPORTED on its innermost.
    const radii = (pts) => { let hi = 0, lo = Infinity; for (let i = 0; i < pts.length; i += 2) { const rho = Math.hypot(pts[i] - 500, pts[i + 1] - 600); hi = Math.max(hi, rho); lo = Math.min(lo, rho); } return [hi, lo]; };
    const k = G.circlePolygon(500, 600, r).length / 2;
    let two = G.emptyState('#EDEDE8'); for (const op of ops.slice(0, 2)) two = G.applyOp(two, op, { prune: false });
    const [hi2, lo2] = radii(two.regions[0].pts), floor2 = Math.sqrt((r * Math.cos(Math.PI / k)) ** 2 + r * r);
    const [hi6, lo6] = radii(st.regions[0].pts);
    rec('P6 concentric drops: after one more drop the first ring\'s outermost vertex is EXACTLY r·sqrt(2) and no vertex is nearer than the k-gon\'s chord allows; after six, exactly r·sqrt(6) outermost', near(hi2, r * Math.SQRT2) && lo2 >= floor2 - 1e-9 && near(hi6, r * Math.sqrt(6)) && st.regions.length === n, `two drops: ${hi2.toFixed(9)} = ${(r * Math.SQRT2).toFixed(9)}, innermost ${lo2.toFixed(6)} ≥ ${floor2.toFixed(6)} · six drops: ${hi6.toFixed(9)} = ${(r * Math.sqrt(6)).toFixed(9)}, innermost ${lo6.toFixed(4)} (sag compounded over five refinements), ${st.regions[0].pts.length / 2} vertices`);
  }

  // E engine
  {
    const src = G.circlePolygon(500, 600, 40);
    const n = src.length / 2;
    const drop = { k: 'd', x: 530, y: 600, r: 30 };
    const st = G.applyOp({ sheet: '#EDEDE8', regions: [{ pts: src, color: '#000000' }], segScale: 1 }, drop, { prune: false });
    const mapped = st.regions[0].pts;
    let w = 0;
    for (let i = 0; i < mapped.length; i += 2) {
      // closed-form inverse of the drop: same ray, radius sqrt(ρ'² - r²)
      const dx = mapped[i] - drop.x, dy = mapped[i + 1] - drop.y, rho2 = Math.hypot(dx, dy);
      const rho = Math.sqrt(Math.max(0, rho2 * rho2 - drop.r * drop.r));
      const pre = [drop.x + dx / rho2 * rho, drop.y + dy / rho2 * rho];
      w = Math.max(w, distToPoly(pre, src));
    }
    rec('E1a every vertex of a dropped-on region is the image of a point ON the source polygon (drop inverted in closed form)', mapped.length / 2 > n && w < 1e-6, `${n} → ${mapped.length / 2} vertices, worst preimage off the source ${w.toExponential(2)}`);
    const tine = { k: 't', x0: 500, y0: 600, x1: 700, y1: 600, z: 120, c: 15 };   // through the circle's centre
    const st2 = G.applyOp({ sheet: '#EDEDE8', regions: [{ pts: src, color: '#000000' }], segScale: 1 }, tine, { prune: false });
    const m2 = st2.regions[0].pts; let w2 = 0;
    for (let i = 0; i < m2.length; i += 2) {
      const d = (m2[i] - tine.x0) * 0 + (m2[i + 1] - tine.y0) * 1;    // N = (0, 1): d is invariant under the shift
      const s = tine.z * Math.pow(2, -Math.abs(d) / tine.c);
      w2 = Math.max(w2, distToPoly([m2[i] - s, m2[i + 1]], src));
    }
    rec('E1b every vertex of a tined region is the image of a point ON the source polygon (tine inverted: d is invariant)', m2.length / 2 > n && w2 < 1e-6, `${n} → ${m2.length / 2} vertices, worst preimage off the source ${w2.toExponential(2)}`);
    // E2 edge bound where chords would have exceeded it
    const plain = G.applyOp({ sheet: '#EDEDE8', regions: [{ pts: src, color: '#000000' }], segScale: 1 }, tine, { refine: false, prune: false }).regions[0].pts;
    const edges = (p) => { const n = p.length / 2, out = []; for (let i = 0; i < n; i++) { const j = (i + 1) % n; out.push(Math.hypot(p[2 * j] - p[2 * i], p[2 * j + 1] - p[2 * i + 1])); } return out; };
    const longChords = edges(plain).filter((e) => e > G.MAX_SEG).length;
    const longRefined = edges(m2).filter((e) => e > G.MAX_SEG + 1e-9).length;
    rec('E2 after a strong tine every mapped edge is at most MAX_SEG, where the plain chords exceeded it', longChords > 0 && longRefined === 0, `${longChords} chords over ${G.MAX_SEG} unrefined → ${longRefined} after refinement, ${m2.length / 2} vertices`);
    // E3 pruning tolerance, on a written-down fixture: a circle sampled far denser
    // than MIN_SEG (every edge 0.16), so every vertex is a candidate and only the
    // tolerance decides. Then the shipped sheets: how much pruning takes off a raked base.
    // A SQUARE, not a circle: on a smooth curve the minimum-edge guard alone bounds
    // the chord sag, so a tolerance that is never consulted still passes there;
    // at a corner only the tolerance stops the outline being cut.
    const dense = (() => { const side = 50, step = 0.16, k = Math.round(side / step), out = []; for (let e = 0; e < 4; e++) for (let i = 0; i < k; i++) { const t = i / k * side; out.push(e === 0 ? [400 + t, 500] : e === 1 ? [450, 500 + t] : e === 2 ? [450 - t, 550] : [400, 550 - t]); } return Float64Array.from(out.flat()); })();
    const pruned = G.prunePolygon(dense);
    let w3 = 0; const removed = dense.length / 2 - pruned.length / 2;
    for (let i = 0; i < dense.length; i += 2) w3 = Math.max(w3, distToPoly([dense[i], dense[i + 1]], pruned));
    const base = G.replay(G.stonePattern(COLORS, { rand: G.mulberry32(3) }));
    const pass = G.getGelPasses()[0];
    const nNo = G.pointCount(G.applyOp(base, pass, { prune: false })), nYes = G.pointCount(G.applyOp(base, pass));
    rec('E3 pruning removes vertices and moves the outline by at most PRUNE_TOL (a densely sampled square, corners included); on a raked stone base it fires too', removed > 0 && pruned.length / 2 >= 3 && w3 <= G.PRUNE_TOL + 1e-9 && nYes < nNo, `${removed} removed of ${dense.length / 2}, outline moved ${w3.toFixed(4)} ≤ ${G.PRUNE_TOL} · get-gel pass: ${nNo.toLocaleString()} → ${nYes.toLocaleString()} vertices`);
  }
  {
    const stack = [...G.getGelPattern(COLORS), ...G.nonpareilPattern(COLORS), G.nonpareilComb({ x: 7 })];
    const st = safe(() => G.replay(stack));
    const n = st.threw ? -1 : G.pointCount(st);
    rec('E4 a pathological stack (get-gel + nonpareil + a second fine comb) lands under 1.25× the point budget and the coarsening is TOLD', !st.threw && n <= G.POINT_BUDGET * 1.25 && st.segScale > 1, st.threw || `${n.toLocaleString()} points against ${G.POINT_BUDGET.toLocaleString()}, segScale ${st.segScale.toFixed(2)}`);
  }

  // H hash
  // the fields an op must carry are written down HERE, not read from the module:
  // a codec that drops one still round-trips against itself (NaN on both sides)
  const FIELDS = { d: ['k', 'x', 'y', 'r', 'color'], t: ['k', 'x0', 'y0', 'x1', 'y1', 'z', 'c'], k: ['k', 'x0', 'y0', 'x1', 'y1', 'z', 'c', 'n', 's'], w: ['k', 'x0', 'y0', 'x1', 'y1', 'z', 'c', 'n', 's', 'A', 'L', 'phi'], s: ['k', 'x', 'y', 'r', 'z', 'c'] };
  const census = (op) => { const have = Object.keys(op).sort().join(','), want = [...FIELDS[op.k]].sort().join(','); return have === want && FIELDS[op.k].every((f) => f === 'k' || f === 'color' || Number.isFinite(op[f])); };
  const finite = (st) => st.regions.every((rg) => rg.pts.every(Number.isFinite));
  {
    const ops = [{ k: 'd', x: 412.34, y: 611.11, r: 37.76, color: '#5fa0a0' }, { k: 't', x0: 101.26, y0: 207.77, x1: 744.44, y1: 820.03, z: 161.57, c: 23.41 }];
    const rounded = ops.map(G.roundOp);
    const r = safe(() => {
      const h = G.encodeHash([[rounded[0]], [rounded[1]]], '#EDEDE8');
      const dec = G.decodeHash(h);
      const a = G.replay(rounded, '#EDEDE8'), b = G.replay(dec.groups.flat(), dec.sheet);
      return { h, dec, same: JSON.stringify(dec.groups) === JSON.stringify([[rounded[0]], [rounded[1]]]), bits: sameFloats(a, b), dig: [G.digest(a), G.digest(b)], n: G.pointCount(a), fields: dec.groups.flat().every(census), finite: finite(a) && finite(b) };
    });
    rec('H1 a drop followed by a tine encodes, decodes to the same ops carrying every field the gate lists, and replays BIT-IDENTICALLY to finite coordinates', !r.threw && r.same && r.bits && r.fields && r.finite && r.dec.groups.length === 2, r.threw || `${r.h} · ${r.n} coordinates pairwise Object.is-equal · digests ${r.dig[0] === r.dig[1] ? 'agree' : 'DIFFER'}`);
    rec('H2 the hash uses only characters a URI fragment carries unescaped', !r.threw && /^[A-Za-z0-9_~;,.\-]+$/.test(r.h), r.threw || `${r.h.length} characters`);
  }
  {
    const rows = [];
    for (const [id, p] of Object.entries(G.PATTERNS)) rows.push([id, p.build(COLORS, { rand: G.mulberry32(5) })]);
    rows.push(['random:9', G.randomSequence(9, COLORS)]);
    let ok = true; const det = [];
    for (const [id, ops] of rows) {
      const r = safe(() => {
        const rounded = ops.map(G.roundOp);
        const h = G.encodeHash([rounded], '#0A0A0C'); const dec = G.decodeHash(h);
        const a = G.replay(rounded, '#0A0A0C'), b = G.replay(dec.groups.flat(), dec.sheet);
        return { same: JSON.stringify(dec.groups[0]) === JSON.stringify(rounded), bits: sameFloats(a, b), sheet: dec.sheet === '#0A0A0C', len: h.length, n: ops.length, groups: dec.groups.length, fields: dec.groups.flat().every(census), finite: finite(b) };
      });
      const good = !r.threw && r.same && r.bits && r.sheet && r.groups === 1 && r.fields && r.finite;
      if (!good) ok = false;
      det.push(`${id} ${r.threw ? 'THREW' : `${r.n} ops, ${r.len} chars${good ? '' : ' MISMATCH'}`}`);
    }
    rec('H3 every pattern and the random sequence round-trip the hash bit-identically, as one group, with the sheet colour', ok, det.join(' · '));
  }
  {
    const refused = (h) => { try { G.decodeHash(h); return false; } catch { return true; } };
    rec('H4 a newer format, a garbled op and a bad colour are refused rather than partly read', refused('v2_EDEDE8_d,1,2,3,0A0A0C') && refused('v1_EDEDE8_d,1,x,3,0A0A0C') && refused('v1_EDEDE8_d,1,2,3,0A0A0') && refused('v1_EDEDE8_q,1,2'));
  }

  // S svg
  {
    const st = G.replay(G.concentricPattern(COLORS, { count: 4 }));
    const svg = G.exportSvg(st);
    const paths = (svg.match(/<path /g) || []).length;
    rec('S1 the SVG holds one path per region on the sheet\'s viewBox, every coordinate finite', paths === st.regions.length && svg.includes(`viewBox="0 0 ${G.SHEET.w} ${G.SHEET.h}"`) && !/NaN|Infinity/.test(svg), `${paths} paths, ${(svg.length / 1024).toFixed(0)} KB`);
  }

  // T timing (reported)
  if (label === 'shipped') {
    let ops = []; for (let s = 1; ops.length < 200; s++) ops = ops.concat(G.randomSequence(s, COLORS)); ops = ops.slice(0, 200);
    const t0 = performance.now(); const st = G.replay(ops); const replayMs = performance.now() - t0;
    const comb = { k: 'k', x0: 500, y0: 0, x1: 500, y1: 1250, z: 120, c: 20, n: 8, s: 40 };
    const t1 = performance.now(); G.applyOp(st, comb, { refine: false, prune: false }); const prevMs = performance.now() - t1;
    const t2 = performance.now(); G.applyOp(st, comb); const commitMs = performance.now() - t2;
    console.log(`     T  200 ops: ${G.pointCount(st).toLocaleString()} points, replay ${replayMs.toFixed(0)} ms, one plain preview pass ${prevMs.toFixed(1)} ms, one refined commit ${commitMs.toFixed(1)} ms (Node, this box)`);
  }
  return out;
}

/* ================= NEGATIVE CONTROL ================= */
const MUTANTS = [
  { id: 'drop-takes-the-root-of-the-ratio', from: 'const f = Math.sqrt(1 + r2 / d2); o[0] = cx + dx * f;', to: 'const f = Math.sqrt(1 + r2 / Math.sqrt(d2)); o[0] = cx + dx * f;', breaks: ['F1', 'E1a', 'P6'] },
  { id: 'tine-falloff-is-not-a-halving', from: 'for (let i = 0; i < m; i++) s += Math.exp(-Math.abs(dn - offs[i]) * kc);', to: 'for (let i = 0; i < m; i++) s += 1 / (1 + Math.abs(dn - offs[i]) * kc);', breaks: ['F2', 'P5', 'E1b'] },
  { id: 'wavy-phase-dropped', from: 'A * Math.sin(w * (px * mx + py * my) + phi);', to: 'A * Math.sin(w * (px * mx + py * my));', breaks: ['F3'] },
  { id: 'stir-angle-not-divided-by-the-radius', from: 'const th = z * Math.exp(-Math.abs(rho - r) * kc) / rho;', to: 'const th = z * Math.exp(-Math.abs(rho - r) * kc);', breaks: ['F4'] },
  { id: 'the-point-function-and-the-mapper-disagree', from: 'const th = z * Math.exp(-Math.abs(rho - r) * LN2 / c) / rho;', to: 'const th = z * Math.exp(-Math.abs(rho - r) * LN2 / c);', breaks: ['F4', 'P4'] },
  { id: 'refinement-off', from: 'if (dx * dx + dy * dy <= seg2 || depth >= depthCap) return;', to: 'return;', breaks: ['E1a', 'E1b', 'E2', 'E3', 'E4'] },   // E4: a sheet that never refines never reaches the budget, so nothing is told
  { id: 'comb-not-centred-on-the-stroke', from: 'out.push((i - (n - 1) / 2) * s);', to: 'out.push(i * s);', breaks: ['P5', 'E4'] },   // E4: the stack's combs land off-sheet and the budget is never reached
  { id: 'codec-drops-the-falloff', from: "t: ['x0', 'y0', 'x1', 'y1', 'z', 'c'],", to: "t: ['x0', 'y0', 'x1', 'y1', 'z'],", breaks: ['H1'] },
  { id: 'pruning-ignores-the-tolerance', from: 'if (within) { keep[i] = 0; kept--; continue; }', to: 'if (true) { keep[i] = 0; kept--; continue; }', breaks: ['E3'] },
];
async function negativeControl() {
  const src = fs.readFileSync(path.join(ROOT, 'marble-math.js'), 'utf8');
  for (const m of MUTANTS) {
    const n = src.split(m.from).length - 1;
    if (n !== 1) { console.log(`FAIL anchor ${m.id}: matches ${n} times`); process.exit(1); }
  }
  const dir = path.join(ROOT, 'tools', '.scratch'); fs.mkdirSync(dir, { recursive: true });
  let bad = 0;
  for (const m of MUTANTS) {
    const tmp = path.join(dir, `_marble-mutant-${m.id}.js`);
    fs.writeFileSync(tmp, src.replace(m.from, m.to));
    const G = await import(pathToFileURL(tmp).href + `?${Date.now()}`);
    let out;
    try { out = await partOne(G, m.id); } catch (e) { out = [{ name: 'CRASH', ok: false, detail: String(e) }]; }
    fs.unlinkSync(tmp);
    const red = out.filter((r) => !r.ok).map((r) => r.name.split(' ')[0]);
    const missed = m.breaks.filter((c) => !red.includes(c));
    const unclaimed = red.filter((c) => !m.breaks.includes(c));
    const ok = missed.length === 0 && unclaimed.length === 0;
    if (!ok) bad++;
    console.log(`${ok ? ' ok ' : 'FAIL'} mutant ${m.id}: fired ${red.join(',') || 'nothing'}${missed.length ? ' MISSED ' + missed.join(',') : ''}${unclaimed.length ? ' UNCLAIMED ' + unclaimed.join(',') : ''}`);
  }
  console.log(`\n${MUTANTS.length - bad} of ${MUTANTS.length} mutants behave. Part two (browser) is NOT mutated.`);
  process.exit(bad ? 1 : 0);
}

/* ================= PART TWO ================= */
async function partTwo(G) {
  let pw; try { pw = await import('playwright-core'); } catch { pw = await import('playwright'); }
  const { chromium } = pw;
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
  const server = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
  const browser = await chromium.launch({ executablePath: exe });
  const errors = [];
  const open = async (opts, hash = '') => {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await page.route('**fonts.googleapis.com/**', (r) => r.abort());
    await page.route('**fonts.gstatic.com/**', (r) => r.abort());
    await page.goto(`${base}/marble.html${hash ? '#' + hash : ''}`);
    await page.waitForFunction(() => !!window.__marble);
    return page;
  };
  const frames = (page, n = 2) => page.evaluate((k) => new Promise((r) => { const step = () => (k-- > 0 ? requestAnimationFrame(step) : r()); step(); }), n);
  const client = (page, x, y) => page.evaluate((p) => window.__marble.toClient(p[0], p[1]), [x, y]);
  const summary = (page) => page.evaluate(() => window.__marble.summary());
  const drag = async (page, a, b, steps = 8) => {
    const A = await client(page, a[0], a[1]), B = await client(page, b[0], b[1]);
    await page.mouse.move(A.x, A.y); await page.mouse.down();
    let sawPreview = false, worstMs = 0;
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(A.x + (B.x - A.x) * i / steps, A.y + (B.y - A.y) * i / steps);
      await frames(page, 2);
      const s = await page.evaluate(() => ({ p: window.__marble.previewing(), st: window.__marble.stats() }));
      if (s.p) sawPreview = true;
      worstMs = Math.max(worstMs, s.st.previewMs + s.st.frameMs);
    }
    await page.mouse.up(); await frames(page, 1);
    return { sawPreview, worstMs };
  };

  const page = await open({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
  const rect = await page.evaluate(() => window.__marble.sheetRect());
  check('B1 the page loads with the sheet fitted at its own aspect', near(rect.width / rect.height, G.SHEET.w / G.SHEET.h, 0.01) && rect.width > 300, `${rect.width.toFixed(0)} × ${rect.height.toFixed(0)} css px`);

  // B2 a click drops ink where it was clicked
  await page.evaluate(() => { window.__marble.setAutoAdvance(false); window.__marble.setColor('#5FA0A0'); window.__marble.setSettings({ growRate: 0, dropRadius: 36 }); });
  const c = await client(page, 500, 600);
  await page.mouse.click(c.x, c.y); await frames(page, 1);
  const s2 = await summary(page);
  const px = await page.evaluate(() => window.__marble.pixel(500, 600));
  const hash2 = await page.evaluate(() => window.__marble.hash());
  check('B2 a real click drops one region of the chosen colour where it was clicked, and the hash carries it', s2.regions === 1 && s2.ops === 1 && px[0] === 0x5F && px[1] === 0xA0 && px[2] === 0xA0 && /^v1_EDEDE8_d,500,600,36,5FA0A0$/.test(hash2), `pixel ${px.slice(0, 3).join(',')} · ${hash2}`);

  // B3 hold to grow
  await page.evaluate(() => window.__marble.setSettings({ growRate: 120, dropRadius: 20 }));
  const c3 = await client(page, 300, 300);
  await page.mouse.move(c3.x, c3.y); await page.mouse.down(); await page.waitForTimeout(500);
  const live = await page.evaluate(() => ({ p: window.__marble.previewing(), r: window.__marble.gesture()?.r }));
  await page.mouse.up(); await frames(page, 1);
  const ops3 = await page.evaluate(() => window.__marble.ops());
  const r3 = ops3[1][0].r;
  check('B3 holding the pointer grows the drop past the slider radius, previewed live, and commits the grown radius', live.p && r3 > 30 && near(live.r, r3, 25) && r3 <= 60, `grew to ${r3} from 20 in ~0.5 s (preview held ${live.r?.toFixed(1)})`);

  // B4 strokes of every kind
  await page.evaluate(() => window.__marble.setSettings({ strength: 0.5, falloff: 24, combTines: 6, combSpacing: 40, waveAmp: 30, waveLength: 200 }));
  const kinds = {};
  for (const [t, k, a, b] of [['tine', 't', [100, 400], [900, 450]], ['comb', 'k', [900, 800], [100, 850]], ['wavy', 'w', [500, 100], [520, 1150]]]) {
    await page.evaluate((q) => window.__marble.setTool(q), t);
    const before = await summary(page);
    const d = await drag(page, a, b);
    const after = await page.evaluate(() => ({ s: window.__marble.summary(), last: window.__marble.ops().at(-1) }));
    kinds[t] = { d, before, after };
    check(`B4 ${t}: a real drag previews live and commits exactly one '${k}' op as one group`, d.sawPreview && after.s.groups === before.groups + 1 && after.s.ops === before.ops + 1 && after.last.length === 1 && after.last[0].k === k && after.last[0].z > 0 && !(await page.evaluate(() => window.__marble.previewing())), `z ${after.last[0].z} · worst preview+frame ${d.worstMs.toFixed(1)} ms`);
  }
  // stir: a real circular motion
  await page.evaluate(() => window.__marble.setTool('stir'));
  {
    const C = await client(page, 500, 700), R = 60 * rect.width / G.SHEET.w;
    await page.mouse.move(C.x, C.y); await page.mouse.down();
    let saw = false;
    for (let i = 1; i <= 16; i++) { const a = Math.PI * 2 * 0.9 * i / 16; await page.mouse.move(C.x + R * Math.cos(a), C.y + R * Math.sin(a)); await frames(page, 2); if (await page.evaluate(() => window.__marble.previewing())) saw = true; }
    await page.mouse.up(); await frames(page, 1);
    const last = await page.evaluate(() => window.__marble.ops().at(-1)[0]);
    check('B4 stir: a real circular motion commits one \'s\' op whose radius is the circle drawn and whose turn is the sweep', saw && last.k === 's' && near(last.r, 60, 6) && last.z > 0.6 * 60 * Math.PI * 2 * 0.9 && last.z < 1.2 * 60 * Math.PI * 2 * 0.9, `r ${last.r} (drawn 60), z ${last.z} (sweep 0.9 turns ≈ ${(60 * Math.PI * 2 * 0.9).toFixed(0)})`);
  }

  // B5 settings visibility per tool, both directions
  const vis = {};
  for (const t of ['drop', 'tine', 'comb', 'wavy', 'stir']) { await page.evaluate((q) => window.__marble.setTool(q), t); vis[t] = await page.evaluate(() => window.__marble.controls()); }
  const visOk = G && vis.drop.dropRadius && !vis.drop.strength && vis.tine.strength && !vis.tine.combTines && vis.comb.combTines && !vis.comb.waveAmp && vis.wavy.waveAmp && vis.stir.falloff && !vis.stir.combTines && !vis.stir.dropRadius;
  check('B5 settings show for the tools that read them and hide for the ones that do not', visOk, Object.entries(vis).map(([t, v]) => `${t}: ${Object.entries(v).filter(([, on]) => on).map(([id]) => id).join(',')}`).join(' · '));

  // B6 reproducibility across pages
  const link = await page.evaluate(() => ({ hash: window.__marble.hash(), dig: window.__marble.digest(), s: window.__marble.summary(), ops: window.__marble.ops() }));
  const page2 = await open({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 2 }, link.hash);
  const again = await page2.evaluate(() => ({ dig: window.__marble.digest(), s: window.__marble.summary(), ops: window.__marble.ops(), hash: window.__marble.hash() }));
  check('B6 a second page opened on the link reproduces the sheet: same ops, same groups, same digest of every coordinate', again.dig === link.dig && again.hash === link.hash && JSON.stringify(again.ops) === JSON.stringify(link.ops) && again.s.groups === link.s.groups, `${link.s.ops} ops, ${link.s.points.toLocaleString()} points, ${link.hash.length} chars · ${again.dig}`);
  await page2.close();

  // B7 undo / redo, button and keyboard
  const d0 = link.dig;
  await page.click('#undoBtn'); await frames(page, 1);
  const u1 = await page.evaluate(() => ({ dig: window.__marble.digest(), s: window.__marble.summary() }));
  await page.click('#redoBtn'); await frames(page, 1);
  const r1 = await page.evaluate(() => ({ dig: window.__marble.digest(), s: window.__marble.summary() }));
  await page.keyboard.press('Control+z'); await frames(page, 1);
  const u2 = await page.evaluate(() => window.__marble.summary());
  await page.keyboard.press('Control+Shift+z'); await frames(page, 1);
  const r2 = await page.evaluate(() => ({ dig: window.__marble.digest(), s: window.__marble.summary() }));
  check('B7 undo pops the last group and redo restores it to the same digest, from the buttons and the keyboard', u1.s.groups === link.s.groups - 1 && u1.dig !== d0 && r1.dig === d0 && u2.groups === link.s.groups - 1 && r2.dig === d0, `${link.s.groups} → ${u1.s.groups} → ${r1.s.groups} groups`);

  // B8 patterns and the seed
  await page.click('#clearBtn'); await frames(page, 1);
  const pats = {};
  for (const id of Object.keys(G.PATTERNS)) {
    await page.click(`#patterns button[data-pattern="${id}"]`); await frames(page, 1);
    pats[id] = await summary(page);
    await page.click('#clearBtn'); await frames(page, 1);
  }
  check('B8a every pattern commits as ONE group of many ops and draws many regions', Object.values(pats).every((s) => s.groups === 1 && s.ops > 1 && s.regions > 1), Object.entries(pats).map(([k, s]) => `${k} ${s.ops} ops`).join(' · '));
  await page.fill('#seed', '42'); await page.click('#randomBtn'); await frames(page, 1);
  const seedA = await page.evaluate(() => window.__marble.hash());
  await page.click('#clearBtn'); await page.click('#randomBtn'); await frames(page, 1);
  const seedA2 = await page.evaluate(() => window.__marble.hash());
  await page.click('#clearBtn'); await page.fill('#seed', '43'); await page.click('#randomBtn'); await frames(page, 1);
  const seedB = await page.evaluate(() => window.__marble.hash());
  check('B8b the random sequence is seeded: the same seed twice gives the same link, a different seed a different one', seedA === seedA2 && seedA !== seedB && seedA.length > 40, `seed 42 → ${seedA.length} chars`);

  // B9 exports
  await page.click('#clearBtn'); await page.click('#patterns button[data-pattern="concentric"]'); await frames(page, 1);
  const ex = await page.evaluate(async () => {
    const svg = window.__marble.svg();
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const bad = doc.querySelector('parsererror');
    const empty = await (async () => { const h = window.__marble.hash(); window.__marble.clear(); const n = await window.__marble.pngSize(1); window.__marble.load(h); return n; })();
    return { paths: doc.querySelectorAll('path').length, bad: !!bad, png: await window.__marble.pngSize(1), empty, regions: window.__marble.summary().regions };
  });
  check('B9 the SVG parses with one path per region and the PNG is a real image, larger than the empty sheet\'s', !ex.bad && ex.paths === ex.regions && ex.png > ex.empty && ex.png > 2000, `${ex.paths} paths · PNG ${(ex.png / 1024).toFixed(0)} KB against ${(ex.empty / 1024).toFixed(1)} KB empty`);

  // B10 two hundred ops, then a real comb drag
  await page.click('#clearBtn');
  const hash200 = (() => { let ops = []; for (let s = 1; ops.length < 200; s++) ops = ops.concat(G.randomSequence(s, COLORS)); return G.encodeHash([ops.slice(0, 200)], '#EDEDE8'); })();
  const t200 = await page.evaluate((h) => { const t = performance.now(); window.__marble.load(h); return { ms: performance.now() - t, s: window.__marble.summary() }; }, hash200);
  await page.evaluate(() => { window.__marble.setTool('comb'); window.__marble.setSettings({ combTines: 8, combSpacing: 40, strength: 0.5 }); });
  const d200 = await drag(page, [100, 200], [900, 1000], 12);
  const after200 = await summary(page);
  check(`B10 at 200 ops a real comb drag previews every step with worst preview+frame under ${PREVIEW_BAR_MS} ms (headless, software GL)`, d200.sawPreview && d200.worstMs < PREVIEW_BAR_MS && after200.ops === 201, `replay of 200 ops ${t200.ms.toFixed(0)} ms (${t200.s.points.toLocaleString()} points) · worst ${d200.worstMs.toFixed(1)} ms · ${after200.points.toLocaleString()} points after`);

  check('page: no errors', errors.length === 0, errors.join(' | '));
  await page.close();

  // B11 phone width with touch
  const phone = await open({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const geo = await phone.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, rect: window.__marble.sheetRect(), stage: document.getElementById('stage').getBoundingClientRect().toJSON(), panel: document.querySelector('.mb-panel').getBoundingClientRect().toJSON() }));
  const fits = geo.sw <= geo.iw && geo.rect.width > 150 && geo.rect.left >= 0 && geo.rect.left + geo.rect.width <= geo.iw + 0.5 && geo.rect.top + geo.rect.height <= geo.panel.top + 0.5;
  const tap = await phone.evaluate(() => window.__marble.toClient(500, 600));
  await phone.touchscreen.tap(tap.x, tap.y); await frames(phone, 1);
  const sp = await summary(phone);
  check('B11 at phone width nothing scrolls sideways, the sheet fits above the panel, and a touch tap drops ink', fits && sp.regions === 1, `scrollWidth ${geo.sw}/${geo.iw}, sheet ${geo.rect.width.toFixed(0)} × ${geo.rect.height.toFixed(0)} at y ${geo.rect.top.toFixed(0)}, panel from y ${geo.panel.top.toFixed(0)} · ${sp.regions} region after the tap`);
  check('phone page: no errors', errors.length === 0, errors.join(' | '));
  await phone.close();
  await browser.close(); server.close();
}

/* ================= main ================= */
if (NEG) { await negativeControl(); }
else {
  const G = await import(pathToFileURL(path.join(ROOT, 'marble-math.js')).href);
  await partOne(G);
  if (!NOBROWSER) await partTwo(G);
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} of ${results.length} checks passed${failed.length ? ' — FAILED: ' + failed.map((f) => f.name).join('; ') : ''}`);
  process.exit(failed.length ? 1 : 0);
}
