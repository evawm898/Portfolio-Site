/* lantern-pattern.js — the cut pattern of a facet (lantern-design-doc.md §4).
   Pure: no DOM. One facet TYPE gets one pattern, designed on the HALF-facet
   (the ridge at y = 0, the valley line at angle `a`, the rim edge between),
   mirrored across the ridge for the other half of the point and repeated on
   every point. Everything is in the facet's own flat millimetres: x along the
   ridge from the centre C toward the tip, y across from the ridge toward the
   valley.

   A CUT is a closed polygon of paper removed. Lace is made of STROKES —
   narrow bands of cut following a curve, with GAPS left where a stroke would
   close a loop so the paper inside stays attached — and of small SOLIDS
   (dots, leaves, moons). Nothing here clips: a motif is placed where it fits
   whole in the FIELD (the facet less the spine, the valley keep-out and the
   rim margin), scaled by the field's local width, and dropped where the
   width is under the rules' floor; the tip is then solid by construction.
   The raster VALIDATOR (lantern-validate.js) is the judge of what shipped:
   the layout is a generator, never a guarantee. */

/* ---- rules (phase 2 constants; the material model owns them from phase 3) --- */
export const RULES_DEFAULT = Object.freeze({ bridge: 1.2, minHole: 1.5, minCut: 1.0, foldKeepout: 4, rimMargin: 5, spine: 10, strokeWidth: 1.6 });
export const PATTERN_MODES = ['paisley', 'lace', 'botanical', 'geometric', 'celestial', 'none'];
export const RIM_BORDERS = ['none', 'beads', 'scallop', 'picot', 'dashes'];
export const PATTERN_DEFAULTS = Object.freeze({ mode: 'paisley', seed: 7, density: 0.6, intricacy: 0.7, rimBorder: 'beads', solidAlternate: false });

export function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ---- small geometry ------------------------------------------------------ */
const TAU = Math.PI * 2;
export const polyArea = (p) => { let a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j][0] + p[i][0]) * (p[j][1] - p[i][1]); return a / 2; };
export const ccw = (p) => (polyArea(p) > 0 ? p : p.slice().reverse());
const xf = (pts, { s = 1, sy = null, r = 0, tx = 0, ty = 0, mirror = false }) => { const c = Math.cos(r), sn = Math.sin(r); const sy2 = sy == null ? s : sy; return pts.map(([x, y]) => { const X = x * s, Y = (mirror ? -y : y) * sy2; return [tx + X * c - Y * sn, ty + X * sn + Y * c]; }); };
export const circle = (cx, cy, r, n = 20) => { const o = []; for (let i = 0; i < n; i++) o.push([cx + r * Math.cos((TAU * i) / n), cy + r * Math.sin((TAU * i) / n)]); return o; };

/* A STROKE: a centreline (open polyline) with a half-width per point (or a
   function of u in 0..1), as a closed polygon. Flat ends. The width is held
   below the local radius of curvature so the two sides never cross. */
export function stroke(line, halfW) {
  const n = line.length; if (n < 2) return null;
  const hw = (i) => (typeof halfW === 'function' ? halfW(i / (n - 1)) : halfW);
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const h = hw(i);
    L.push([line[i][0] - ty * h, line[i][1] + tx * h]); R.push([line[i][0] + ty * h, line[i][1] - tx * h]);
  }
  return ccw([...L, ...R.reverse()]);
}
/* A closed curve stroked with `gaps` bridges: the loop is cut into `gaps`
   arcs, each a stroke, with `gapLen` of paper left between them. `pts` is the
   closed polyline (last ≠ first). */
export function loopStroke(pts, halfW, gaps = 2, gapLen = 2.5, phase = 0) {
  const n = pts.length, out = [];
  const cum = [0]; for (let i = 1; i <= n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i % n][0] - pts[i - 1][0], pts[i % n][1] - pts[i - 1][1]));
  const total = cum[n];
  const at = (s) => { s = ((s % total) + total) % total; let i = 0; while (i < n && cum[i + 1] < s) i++; const t = (s - cum[i]) / ((cum[i + 1] - cum[i]) || 1); const a = pts[i % n], b = pts[(i + 1) % n]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
  const arcLen = total / gaps - gapLen;
  if (arcLen < 3 * gapLen) return [stroke([...pts, pts[0]], halfW)].filter(Boolean);   // too small to bridge: one stroke, the caller leaves the interior solid-attached elsewhere
  for (let g = 0; g < gaps; g++) {
    const s0 = phase * total + (g * total) / gaps + gapLen / 2;
    const m = Math.max(6, Math.ceil(arcLen / 1.5)), line = [];
    for (let k = 0; k <= m; k++) line.push(at(s0 + (arcLen * k) / m));
    const st = stroke(line, halfW); if (st) out.push(st);
  }
  return out;
}

/* ---- curves --------------------------------------------------------------- */
/* a teardrop (paisley body) in a unit box: tip up (+x), width 0.62, with the tip curled by `curl` */
export function teardrop(n = 40, curl = 0.25) {
  const o = [];
  for (let i = 0; i < n; i++) {
    const t = (TAU * i) / n;
    const x = 0.5 * Math.cos(t), y = 0.31 * Math.sin(t) * (0.55 + 0.45 * (1 - Math.cos(t)) / 2 + 0.3 * Math.cos(t));   // fat at the base, narrow at the tip
    const bend = curl * Math.max(0, x + 0.1) ** 2;      // the tip leans across
    o.push([x, y + bend]);
  }
  return o;
}
/* an Archimedean spiral stroke centreline, `turns` turns from radius r0 to r1 */
export function spiral(turns, r0, r1, n = 48, phase = 0, dir = 1) {
  const o = [];
  for (let i = 0; i <= n; i++) { const t = i / n; const r = r0 + (r1 - r0) * t, g = phase + dir * TAU * turns * t; o.push([r * Math.cos(g), r * Math.sin(g)]); }
  return o;
}
/* a leaf: a pointed ellipse in a unit box (length 1 along +x) */
export function leaf(n = 28, width = 0.42, pointy = 1.6) {
  const o = [];
  for (let i = 0; i < n; i++) { const t = (TAU * i) / n; const x = 0.5 * Math.cos(t); const y = 0.5 * width * Math.sign(Math.sin(t)) * Math.abs(Math.sin(t)) ** (1 / pointy) * (1 - 0.15 * Math.cos(t)); o.push([x, y]); }
  return o;
}
export function star(points, rOut, rIn, cx = 0, cy = 0, rot = 0) { const o = []; for (let i = 0; i < 2 * points; i++) { const r = i % 2 ? rIn : rOut, g = rot + (Math.PI * i) / points; o.push([cx + r * Math.cos(g), cy + r * Math.sin(g)]); } return o; }
export function crescent(r, thick = 0.55, n = 24) { const o = []; for (let i = 0; i <= n; i++) { const g = Math.PI / 2 + (Math.PI * i) / n; o.push([r * Math.cos(g), r * Math.sin(g)]); } const c = [r * (1 - thick), 0]; for (let i = n; i >= 0; i--) { const g = Math.PI / 2 + (Math.PI * i) / n; o.push([c[0] + r * 0.82 * Math.cos(g), c[1] + r * 0.82 * Math.sin(g)]); } return o; }

/* ---- the motif library ---------------------------------------------------- */
/* Every motif is built at a given SIZE (its length along the point, mm) with
   the rules in hand, and returns its cut polygons centred on the origin, +x
   toward the tip. `lod` (0..1) is how much nesting the size allows; a motif
   drops its inner details below the thresholds the rules set. */
const W = (R) => R.strokeWidth / 2;
function paisleyMotif(size, R, rnd, lod) {
  const out = [];
  const body = xf(teardrop(44, 0.28 + 0.2 * rnd()), { s: size });
  out.push(...loopStroke(body, W(R), 3, R.bridge * 2.2, rnd()));
  if (lod > 0.35 && size > 14 * R.minHole) {
    const inner = xf(teardrop(32, 0.15), { s: size * 0.52, tx: -size * 0.06, ty: 0 });
    if (lod > 0.7 && size > 20 * R.minHole) out.push(...loopStroke(inner, W(R) * 0.8, 2, R.bridge * 2, 0.3));
    else out.push(ccw(inner));
    if (lod > 0.5) {
      const seed = xf(teardrop(20, 0.1), { s: size * 0.2, tx: -size * 0.12 }); out.push(ccw(seed));
    }
  }
  if (lod > 0.45) {   // the beaded halo outside the body
    const nb = Math.max(5, Math.round(size / (R.minHole * 2.6)));
    const rb = Math.max(R.minHole / 2, Math.min(size * 0.045, 1.4));
    for (let i = 0; i < nb; i++) { const t = TAU * (0.08 + 0.84 * i / (nb - 1)) ; const p = teardropAt(t, size * 1.0 + 2 * rb + R.bridge * 2.2 + 1.2); out.push(circle(p[0], p[1], rb, 14)); }
  }
  // the tail curl: a tapered spiral stroke off the base
  if (size > 12 * R.minHole) {
    const sp = spiral(0.9, size * 0.05, size * 0.3, 30, Math.PI * 1.1, -1);
    out.push(stroke(xf(sp, { tx: -size * 0.62, ty: -size * 0.18 }), (u) => W(R) * (1.2 - 0.6 * u)));
  }
  return out.filter(Boolean);
}
function teardropAt(t, size) { const x = 0.5 * Math.cos(t), y = 0.31 * Math.sin(t) * (0.55 + 0.45 * (1 - Math.cos(t)) / 2 + 0.3 * Math.cos(t)); const bend = 0.25 * Math.max(0, x + 0.1) ** 2; return [x * size, (y + bend) * size]; }
function scrollMotif(size, R, rnd, lod) {
  const out = [];
  const turns = 1.1 + 0.5 * rnd();
  const a = spiral(turns, size * 0.04, size * 0.42, 60, 0, 1);
  const b = spiral(turns, size * 0.04, size * 0.42, 60, Math.PI, -1);
  const s1 = stroke(xf(a, { tx: -size * 0.22 }), (u) => W(R) * (0.7 + 0.9 * u));
  const s2 = stroke(xf(b, { tx: size * 0.22 }), (u) => W(R) * (0.7 + 0.9 * u));
  out.push(s1, s2);
  if (lod > 0.5) { out.push(circle(-size * 0.22, 0, Math.max(R.minHole / 2, size * 0.035)), circle(size * 0.22, 0, Math.max(R.minHole / 2, size * 0.035))); }
  return out.filter(Boolean);
}
function laceMotif(size, R, rnd, lod) {
  const out = [];
  // a quatrefoil of four stroked petals round a dot
  const petal = (g) => { const pts = xf(leaf(24, 0.5, 1.4), { s: size * 0.44, r: g, tx: size * 0.26 * Math.cos(g), ty: size * 0.26 * Math.sin(g) }); return loopStroke(pts, W(R) * 0.9, 1, R.bridge * 2.4, 0.5 + g / TAU); };
  for (let k = 0; k < 4; k++) out.push(...petal((Math.PI / 4) + (k * Math.PI) / 2));
  out.push(circle(0, 0, Math.max(R.minHole / 2, size * 0.06)));
  if (lod > 0.55) for (let k = 0; k < 4; k++) { const g = (k * Math.PI) / 2; out.push(circle(size * 0.5 * Math.cos(g), size * 0.5 * Math.sin(g), Math.max(R.minHole / 2, size * 0.035))); }
  return out.filter(Boolean);
}
function botanicalMotif(size, R, rnd, lod) {
  const out = [];
  // a vine: a sine stroke along the point with leaves alternating
  const n = 40, line = [];
  for (let i = 0; i <= n; i++) { const u = i / n; line.push([(u - 0.5) * size, Math.sin(u * TAU * 0.75 + rnd() * 0.3) * size * 0.1]); }
  out.push(stroke(line, (u) => W(R) * (1.1 - 0.5 * Math.abs(u - 0.5))));
  const leaves = Math.max(2, Math.round(size / (R.minHole * 6)));
  for (let k = 0; k < leaves; k++) {
    const u = (k + 0.6) / (leaves + 0.2), p = line[Math.round(u * n)], side = k % 2 ? 1 : -1;
    const ls = size * (0.22 + 0.1 * rnd());
    if (ls < R.minHole * 2.2) continue;
    const g = side * (Math.PI / 2 - 0.5) + 0.2 * (rnd() - 0.5);
    const lf = xf(leaf(22, 0.46, 1.5), { s: ls, r: g, tx: p[0] + Math.cos(g) * (ls / 2 + R.bridge + W(R)), ty: p[1] + Math.sin(g) * (ls / 2 + R.bridge + W(R)) });
    if (lod > 0.5 && ls > R.minHole * 4) {
      // two halves leaving the midrib as paper
      const half = (sgn) => ccw(lf.map(([x, y]) => [x, y]).filter((_, i) => true).map((q) => q));
      const c = [p[0] + Math.cos(g) * (ls / 2 + R.bridge + W(R)), p[1] + Math.sin(g) * (ls / 2 + R.bridge + W(R))];
      const mid = R.bridge * 0.6;
      const tx = Math.cos(g), ty = Math.sin(g);
      const left = lf.map(([x, y]) => { const dx = x - c[0], dy = y - c[1]; const across = -dx * ty + dy * tx; return across > 0 ? [x, y] : null; }).filter(Boolean);
      const right = lf.map(([x, y]) => { const dx = x - c[0], dy = y - c[1]; const across = -dx * ty + dy * tx; return across < 0 ? [x, y] : null; }).filter(Boolean);
      const shift = (pts, sgn) => pts.map(([x, y]) => [x - ty * sgn * mid, y + tx * sgn * mid]);
      if (left.length > 4) out.push(ccw(shift(left, 1))); if (right.length > 4) out.push(ccw(shift(right, -1)));
    } else out.push(ccw(lf));
  }
  return out.filter(Boolean);
}
function geometricMotif(size, R, rnd, lod) {
  const out = [];
  // a pointed arch (tracery) with a trefoil, or a diamond lattice
  if (rnd() < 0.5) {
    const arch = []; const n = 30;
    for (let i = 0; i <= n; i++) { const t = i / n; const g = Math.PI * (0.5 + 0.5 * (t - 0.5)); arch.push([size * 0.5 * Math.sin(g * 1) * 0.0 + (t - 0.5) * size * 0.9, size * 0.3 * (1 - Math.abs(2 * t - 1) ** 1.6)]); }
    // two legs + the pointed head: a stroked arch, open at the base
    out.push(stroke(arch, W(R)));
    if (lod > 0.5) { const tri = star(3, size * 0.14, size * 0.07, 0, size * 0.05, Math.PI / 2); out.push(...loopStroke(tri, W(R) * 0.8, 1, R.bridge * 2, 0.5)); }
    if (lod > 0.7) for (const s of [-1, 1]) out.push(circle(s * size * 0.3, -size * 0.1, Math.max(R.minHole / 2, size * 0.04)));
  } else {
    const k = Math.max(2, Math.round(size / (R.minHole * 5)));
    for (let i = 0; i < k; i++) for (let j = 0; j < 2; j++) {
      const cx = (i - (k - 1) / 2) * (size / k), cy = (j - 0.5) * size * 0.28;
      const d = Math.min(size / k, size * 0.28) * 0.5 - R.bridge * 0.6;
      if (d > R.minHole * 0.8) out.push([[cx + d, cy], [cx, cy + d * 0.7], [cx - d, cy], [cx, cy - d * 0.7]]);
    }
  }
  return out.filter(Boolean);
}
function celestialMotif(size, R, rnd, lod) {
  const out = [];
  const kind = rnd();
  if (kind < 0.4) {
    // an eyespot: ring strokes with bridges round a dot, and a halo of dots
    const ring = circle(0, 0, size * 0.42, 40);
    out.push(...loopStroke(ring, W(R), 3, R.bridge * 2.2, rnd()));
    out.push(circle(0, 0, Math.max(R.minHole / 2, size * 0.14)));
    if (lod > 0.55) out.push(...loopStroke(circle(0, 0, size * 0.26, 28), W(R) * 0.8, 2, R.bridge * 2, 0.2));
  } else if (kind < 0.7) {
    out.push(ccw(xf(crescent(size * 0.45, 0.5), { r: -0.4 })));
    if (lod > 0.5) out.push(ccw(star(5, size * 0.13, size * 0.055, size * 0.2, size * 0.22)));
  } else {
    out.push(ccw(star(5, size * 0.45, size * 0.19, 0, 0, Math.PI / 2 + rnd())));
    if (lod > 0.6) for (let i = 0; i < 4; i++) { const g = rnd() * TAU; out.push(circle(size * 0.62 * Math.cos(g), size * 0.62 * Math.sin(g), Math.max(R.minHole / 2, size * 0.035))); }
  }
  return out.filter(Boolean);
}
export const MOTIFS = { paisley: [paisleyMotif, scrollMotif], lace: [laceMotif, scrollMotif], botanical: [botanicalMotif, paisleyMotif], geometric: [geometricMotif], celestial: [celestialMotif] };

/* ---- the facet field ------------------------------------------------------ */
/* The half-facet's geometry from the model: a facet type `t` with its edge
   polyline (flat, facet-local, from the ridge end at the tip to the inner
   vertex), its angle `a` and inner radius `Ri`. Returns the FIELD: the
   lower bound y_lo(x) (the spine) and upper bound y_hi(x) (the rim margin
   and the valley keep-out), over x in [xMin, xMax]. */
export function facetField(t, R) {
  const edge = t.edge.pts;                       // from the tip (x ≈ Ro, y ≈ 0) to V
  const a = t.a, tanA = Math.tan(a);
  const xT = edge[0][0], V = edge[edge.length - 1];
  // the rim's y at x, by walking the edge (x decreases monotonically along the edge for every outline here; where it does not, take the smallest y)
  const rimY = (x) => { let best = Infinity; for (let i = 1; i < edge.length; i++) { const p = edge[i - 1], q = edge[i]; if ((x - p[0]) * (x - q[0]) <= 0) { const u = q[0] === p[0] ? 0 : (x - p[0]) / (q[0] - p[0]); best = Math.min(best, p[1] + (q[1] - p[1]) * u); } } return best; };
  // the margin is measured perpendicular to the rim; the edge's slope is small, so the vertical allowance is margin / cos(slope)
  const slopeAt = (x) => { for (let i = 1; i < edge.length; i++) { const p = edge[i - 1], q = edge[i]; if ((x - p[0]) * (x - q[0]) <= 0) return Math.atan2(q[1] - p[1], q[0] - p[0]); } return 0; };
  const yHi = (x) => { const rim = rimY(x), s = Math.abs(slopeAt(x)); const r = Number.isFinite(rim) ? rim - R.rimMargin / Math.cos(Math.min(1.2, s)) : Infinity; const v = x * tanA - R.foldKeepout / Math.cos(a); return Math.min(r, v); };
  const yLo = () => R.spine / 2;
  // the field opens where the spine band, the valley keep-out and the rim margin leave room for a stroke and a bridge either side
  let xMin = Math.max(R.spine / 2 / tanA + R.foldKeepout, 0.08 * xT);
  const need = R.strokeWidth + 2 * R.bridge;
  while (xMin < xT - R.rimMargin && yHi(xMin) - yLo() < need) xMin += 0.5;
  return { xT, V, a, rimY, yHi, yLo, xMin, xMax: xT - R.rimMargin, width: (x) => yHi(x) - yLo() };
}

/* ---- the layout: a scroll skeleton, then fillers ------------------------- */
/* ELEMENTS are what the layout places: a stroke (a centreline with a
   half-width law) or a solid (a polygon with a bounding disc). Every element
   is tested against every placed one before it is kept: strokes are read as
   chains of discs along their centreline, and two elements must stay the
   bridge width apart. That is the generator's own spacing; the raster
   validator is still the judge. */
function elemDiscs(e) {
  if (e.discs) return e.discs;
  if (e.kind === 'stroke') { const n = e.line.length; e.discs = e.line.map((p, i) => [p[0], p[1], typeof e.hw === 'function' ? e.hw(i / (n - 1)) : e.hw]); }
  else e.discs = [[e.c[0], e.c[1], e.r]];
  return e.discs;
}
function clearOf(e, placed, bridge, except = null) {
  const A = elemDiscs(e);
  for (const o of placed) { const B = elemDiscs(o); const skip = o === except ? 5 : 0;   // a branch's first discs sit on its parent: the junction is allowed to touch, the rest must clear
    for (let k = 0; k < A.length; k++) { if (k < skip) continue; const a = A[k]; for (const b of B) { const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d < a[2] + b[2] + bridge) return false; } } }
  return true;
}
function inField(e, F, R) {
  for (const [x, y, r] of elemDiscs(e)) { if (x - r < F.xMin - R.foldKeepout * 0.5 || x + r > F.xMax) return false; if (y - r < F.yLo() + R.bridge * 0.4 || y + r > F.yHi(x) - R.bridge * 0.4 || y + r > F.yHi(x + r) - R.bridge * 0.4 || y + r > F.yHi(x - r) - R.bridge * 0.4) return false; }
  return true;
}
const toCuts = (e) => (e.kind === 'stroke' ? [stroke(e.line, e.hw)] : [e.poly]).filter(Boolean);

/* a volute: a spiral curl leaving a point along a tangent and winding in */
function volute(c, r, turns, dir, phase0, n = 40) {
  const line = [];
  for (let i = 0; i <= n; i++) { const t = i / n; const rr = r * (1 - 0.7 * t); const g = phase0 + dir * TAU * turns * t; line.push([c[0] + rr * Math.cos(g), c[1] + rr * Math.sin(g)]); }
  return line;
}
/* a volute whose first point is on the STEM side of its centre (angle −side·π/2 from c), winding
   forward (+x) then inward: radius falls from r to `inner`·r over `turns` */
let curRules = RULES_DEFAULT;   // set by layoutFacet: the volute's pitch floor reads it
function voluteFrom(c, r, turns, side, inner = 0.32, n = 40) {
  // the paper between two turns is the pitch less a stroke; it must hold the bridge, so the turns are capped by the radius
  const pitchMin = curRules.bridge + curRules.strokeWidth * 1.05;
  turns = Math.max(0.5, Math.min(turns, (r * (1 - inner)) / pitchMin));
  const line = [], g0 = -side * Math.PI / 2;
  for (let i = 0; i <= n; i++) { const t = i / n; const rr = r * (1 - (1 - inner) * t); const g = g0 + side * TAU * turns * t; line.push([c[0] + rr * Math.cos(g), c[1] + rr * Math.sin(g)]); }
  return line;
}
/* a smooth branch from a stem point p (tangent td) to a volute centred `len` away on side `side` */
function branchLine(p, td, side, len, n = 14) {
  const nx = -td[1] * side, ny = td[0] * side, out = [];
  for (let i = 0; i <= n; i++) { const t = i / n; const e = t * t * (3 - 2 * t); out.push([p[0] + td[0] * len * 0.55 * t + nx * len * e, p[1] + td[1] * len * 0.55 * t + ny * len * e]); }
  return out;
}

export function layoutFacet(t, pattern, R = RULES_DEFAULT) {
  const P = { ...PATTERN_DEFAULTS, ...pattern };
  curRules = R;
  const rnd = mulberry32(P.seed + 1);
  const F = facetField(t, R);
  const cuts = [], placed = [], notes = [];
  if (P.mode === 'none') return { cuts, placed, field: F, notes };
  const hw0 = R.strokeWidth / 2, hwMin = R.minCut / 2;
  const taper = (a, b) => (u) => a + (b - a) * u;
  const put = (e, except = null) => { if (!inField(e, F, R) || !clearOf(e, placed, R.bridge, except)) return false; placed.push(e); cuts.push(...toCuts(e)); return true; };
  const yMid = (x) => (F.yLo() + F.yHi(x)) / 2;
  const half = (x) => Math.max(0, (F.yHi(x) - F.yLo()) / 2);
  const xEnd = (() => { let x = F.xMax; while (x > F.xMin && half(x) < R.minHole * 1.5) x -= 1; return x; })();   // the tip is solid from here
  const dens = P.density, intr = P.intricacy;

  if (P.mode === 'geometric') geometricLayout(F, P, R, rnd, put, xEnd);
  else if (P.mode === 'celestial') celestialLayout(F, P, R, rnd, put, xEnd);
  else {
    /* the stem: a gentle wave down the middle of the field, base to tip */
    const n = 48, stemLine = [];
    const amp = 0.18, ph = rnd() * TAU, waves = 1.5 + rnd();
    for (let i = 0; i <= n; i++) { const x = F.xMin + (xEnd - F.xMin) * (i / n); stemLine.push([x, yMid(x) + half(x) * amp * Math.sin(ph + waves * TAU * (i / n))]); }
    for (let pass = 0; pass < 4; pass++) for (let i = 1; i < n; i++) stemLine[i][1] = (stemLine[i - 1][1] + 2 * stemLine[i][1] + stemLine[i + 1][1]) / 4;   // the field's bound has a corner where the rim margin meets the valley keep-out; the stem does not
    const stem = { kind: 'stroke', line: stemLine, hw: taper(hw0 * 1.1, hwMin * 1.1) };
    placed.push(stem); cuts.push(...toCuts(stem));
    /* branches: alternating sides. A volute STARTS ON THE STEM (the scroll's
       S-junction) with its radius set by the room on that side, winds forward
       then inward over `turns`, and never crosses the stem because its radius
       only falls. Leaflets sit on the outer turn; the eye gets a dot or, in
       paisley mode, a teardrop. */
    let i = 3, side = rnd() < 0.5 ? 1 : -1;
    while (i < n - 2) {
      const p = stemLine[i];
      const room = side > 0 ? F.yHi(p[0]) - p[1] : p[1] - F.yLo();
      const rMax = Math.min((room - R.bridge * 1.5) * 0.5, 26);
      if (rMax > R.minHole * 2.2) {
        const c = [p[0] + rMax * 0.15, p[1] + side * rMax];
        const turns = 1.05 + 0.6 * intr;
        const vol = voluteFrom(c, rMax, turns, side, 0.32, 44);
        const e = { kind: 'stroke', line: vol, hw: taper(hw0 * 1.05, hwMin) };
        if (put(e, stem)) {
          // the eye
          const er = Math.min(rMax * 0.15, rMax * 0.32 - hwMin - R.bridge * 1.1);
          if (P.mode === 'paisley' && er > R.minHole * 0.9) { const g = Math.atan2(p[1] - c[1], p[0] - c[0]) + Math.PI; const td = xf(teardrop(18, 0.1), { s: er * 2.2, r: g + side * 0.6, tx: c[0], ty: c[1] }); put({ kind: 'solid', poly: ccw(td), c, r: er * 1.15 }); }
          else if (er >= R.minHole / 2) put({ kind: 'solid', poly: circle(c[0], c[1], er, 14), c, r: er });
          // leaflets on the outer turn, pointing outward
          if (intr > 0.3) {
            const nl = rMax > 14 ? 3 : 2;
            for (let m = 0; m < nl; m++) {
              const g = side > 0 ? Math.PI * (0.25 + 0.5 * m / (nl - 1 || 1)) : -Math.PI * (0.25 + 0.5 * m / (nl - 1 || 1));
              const ls = Math.max(R.minHole * 2.2, rMax * (0.38 + 0.12 * rnd()));
              if (P.mode === 'botanical' || P.mode === 'lace' || rnd() < 0.7) {
                const lf = xf(leaf(18, 0.4, 1.5), { s: ls, r: g, tx: c[0] + Math.cos(g) * (rMax + hw0 + R.bridge + ls * 0.5), ty: c[1] + Math.sin(g) * (rMax + hw0 + R.bridge + ls * 0.5) });
                put({ kind: 'solid', poly: ccw(lf), c: polyCentre(lf), r: ls * 0.5 });
              } else { const dr = Math.max(R.minHole / 2, ls * 0.18); const q = [c[0] + Math.cos(g) * (rMax + hw0 + R.bridge + dr), c[1] + Math.sin(g) * (rMax + hw0 + R.bridge + dr)]; put({ kind: 'solid', poly: circle(q[0], q[1], dr, 12), c: q, r: dr }); }
            }
          }
          // a paisley beaded halo round the volute, paisley mode
          if (P.mode === 'paisley' && intr > 0.55 && rMax > R.minHole * 5) {
            const nb = Math.round(rMax / 2.2), rb = Math.max(R.minHole / 2, Math.min(1.1, rMax * 0.05));
            for (let m = 0; m <= nb; m++) { const g = (side > 0 ? 0.05 : Math.PI + 0.05) + (Math.PI * 0.9 * m) / nb; const q = [c[0] + Math.cos(g) * (rMax + hw0 + R.bridge * 1.6 + rb), c[1] + Math.sin(g) * (rMax + hw0 + R.bridge * 1.6 + rb)]; put({ kind: 'solid', poly: circle(q[0], q[1], rb, 10), c: q, r: rb }); }
          }
          // a smaller counter-curl on the other side, just ahead
          const j2 = Math.min(n - 2, i + Math.max(1, Math.round((n * rMax * 0.9) / (xEnd - F.xMin))));
          const p2 = stemLine[j2], room2 = -side > 0 ? F.yHi(p2[0]) - p2[1] : p2[1] - F.yLo();
          const r2 = Math.min((room2 - R.bridge * 1.5) * 0.5, rMax * 0.55);
          if (intr > 0.45 && r2 > R.minHole * 1.8) { const c2 = [p2[0] + r2 * 0.15, p2[1] - side * r2]; put({ kind: 'stroke', line: voluteFrom(c2, r2, 0.95 + 0.4 * intr, -side, 0.34, 30), hw: taper(hw0 * 0.9, hwMin) }, stem); const er2 = Math.min(r2 * 0.15, r2 * 0.34 - hwMin - R.bridge); if (er2 >= R.minHole / 2) put({ kind: 'solid', poly: circle(c2[0], c2[1], er2, 12), c: c2, r: er2 }); }
        }
      }
      i += Math.max(2, Math.round((n * Math.max(rMax, R.minHole * 3) * 2.05 * (1.6 - 0.7 * dens)) / Math.max(1, xEnd - F.xMin)));
      side = -side;
    }
    /* free-standing S-scrolls in the gaps: two volutes back to back, sized to the room where they land */
    const scrollTries = Math.round(20 + 40 * dens);
    for (let m = 0; m < scrollTries; m++) {
      const x = F.xMin + (xEnd - F.xMin) * rnd(), y = F.yLo() + (F.yHi(x) - F.yLo()) * rnd();
      const h = half(x); if (h < R.minHole * 2.5) continue;
      const r = Math.min(h * 0.45, 4 + 12 * rnd()); if (r < R.minHole * 1.8) continue;
      const g = (rnd() - 0.5) * 1.2, sd = rnd() < 0.5 ? 1 : -1;
      const a = voluteFrom([x + Math.cos(g) * r, y + Math.sin(g) * r], r, 0.9 + 0.4 * intr, sd, 0.34, 26).reverse();
      const b = voluteFrom([x - Math.cos(g) * r, y - Math.sin(g) * r], r * 0.75, 0.9 + 0.4 * intr, -sd, 0.34, 22);
      // the two curls share the point (x, y): one reversed, one forward, as one stroke
      const line = [...a, ...b.slice(1)];
      const e = { kind: 'stroke', line, hw: (u) => hwMin + (hw0 * 0.9 - hwMin) * Math.sin(Math.PI * u) };
      if (put(e)) { for (const [cc, rr] of [[[x + Math.cos(g) * r, y + Math.sin(g) * r], r], [[x - Math.cos(g) * r, y - Math.sin(g) * r], r * 0.75]]) { const er = Math.min(rr * 0.15, rr * 0.34 - hwMin - R.bridge); if (er >= R.minHole / 2) put({ kind: 'solid', poly: circle(cc[0], cc[1], er, 12), c: cc, r: er }); } }
    }
    /* fillers: leaves and dots dropped into the gaps, sized to the local width */
    const tries = Math.round(90 + 160 * dens);
    for (let m = 0; m < tries; m++) {
      const x = F.xMin + (xEnd - F.xMin) * rnd(), y = F.yLo() + (F.yHi(x) - F.yLo()) * rnd();
      const h = half(x); if (h < R.minHole) continue;
      if (rnd() < 0.55 && P.mode !== 'lace') { const ls = Math.min(h * 0.6, 4 + 10 * rnd()); if (ls < R.minHole * 2) continue; const g = rnd() * TAU; const lf = xf(leaf(18, 0.42, 1.5), { s: ls, r: g, tx: x, ty: y }); put({ kind: 'solid', poly: ccw(lf), c: [x, y], r: ls / 2 }); }
      else { const dr = Math.max(R.minHole / 2, Math.min(h * 0.12, 0.9 + 1.2 * rnd())); put({ kind: 'solid', poly: circle(x, y, dr, 12), c: [x, y], r: dr }); }
    }
  }
  /* the rim band's border motif, along the rim edge inside the margin */
  for (const c of rimBand(F, t, P, R, rnd)) { const e = { kind: 'solid', poly: c, c: polyCentre(c), r: polyRadius(c) }; if (clearOf(e, placed, R.bridge)) { placed.push(e); cuts.push(c); } }
  return { cuts, placed, field: F, notes, xEnd };
}
const polyCentre = (p) => { let x = 0, y = 0; for (const q of p) { x += q[0]; y += q[1]; } return [x / p.length, y / p.length]; };
const polyRadius = (p) => { const c = polyCentre(p); let r = 0; for (const q of p) r = Math.max(r, Math.hypot(q[0] - c[0], q[1] - c[1])); return r; };

/* geometric: rows of tracery arches scaled to the width, then a diamond lattice behind them */
function geometricLayout(F, P, R, rnd, put, xEnd) {
  const hw0 = R.strokeWidth / 2;
  let x = F.xMin + 2;
  while (x < xEnd) {
    const w = F.yHi(x) - F.yLo(); if (w < R.minHole * 3) { x += 2; continue; }
    const s = Math.min(w * 0.9, 26 + 10 * P.density);
    const cx = x + s * 0.35, cy = F.yLo() + w / 2;
    // a pointed arch standing across the point: legs along x, head toward the tip
    const n = 24, arch = [];
    for (let i = 0; i <= n; i++) { const t = i / n; arch.push([cx + s * 0.45 * (1 - Math.abs(2 * t - 1) ** 1.7) - s * 0.2, cy + (t - 0.5) * s * 0.9]); }
    put({ kind: 'stroke', line: arch, hw: (u) => hw0 * (0.8 + 0.5 * Math.abs(2 * u - 1)) });
    if (P.intricacy > 0.4 && s > R.minHole * 7) { const tri = star(3, s * 0.13, s * 0.06, cx - s * 0.05, cy, 0); for (const a of loopStroke(tri, hw0 * 0.75, 1, R.bridge * 2, 0.5)) put({ kind: 'solid', arc: true, poly: a, c: polyCentre(a), r: polyRadius(a) }); put({ kind: 'solid', poly: circle(cx - s * 0.05, cy, Math.max(R.minHole / 2, s * 0.04)), c: [cx - s * 0.05, cy], r: Math.max(R.minHole / 2, s * 0.04) }); }
    if (P.intricacy > 0.6) for (const sd of [-1, 1]) { const d = Math.max(R.minHole * 0.9, s * 0.07); const c = [cx - s * 0.3, cy + sd * s * 0.3]; put({ kind: 'solid', poly: [[c[0] + d, c[1]], [c[0], c[1] + d * 0.7], [c[0] - d, c[1]], [c[0], c[1] - d * 0.7]], c, r: d }); }
    x += s * (0.75 + 0.5 * (1 - P.density)) + R.bridge * 2;
  }
  // rays toward the tip where the arches stop
  for (let k = 0; k < 3; k++) { const y0 = F.yLo() + (F.yHi(x) - F.yLo()) * (0.25 + 0.25 * k); const line = [[x, y0], [Math.min(xEnd, x + 14 + 8 * k), y0 + (k - 1) * 1.5]]; if (F.yHi(x) - F.yLo() > R.minHole * 2) put({ kind: 'stroke', line, hw: (u) => hw0 * (1 - 0.5 * u) }); }
  const tries = Math.round(60 + 100 * P.density);
  for (let m = 0; m < tries; m++) { const x2 = F.xMin + (xEnd - F.xMin) * rnd(), y = F.yLo() + (F.yHi(x2) - F.yLo()) * rnd(); const d = Math.max(R.minHole * 0.8, 1 + 1.6 * rnd()); put({ kind: 'solid', poly: [[x2 + d, y], [x2, y + d * 0.7], [x2 - d, y], [x2, y - d * 0.7]], c: [x2, y], r: d }); }
}
/* celestial: moons, stars and eyespots scattered, sized to the local width, then a dust of dots */
function celestialLayout(F, P, R, rnd, put, xEnd) {
  const hw0 = R.strokeWidth / 2;
  const big = Math.round(4 + 6 * P.density);
  for (let m = 0; m < big * 6; m++) {
    const x = F.xMin + (xEnd - F.xMin) * rnd(), w = F.yHi(x) - F.yLo(); if (w < R.minHole * 4) continue;
    const y = F.yLo() + w * (0.25 + 0.5 * rnd()), s = Math.min(w * 0.8, 10 + 26 * rnd());
    const kind = rnd();
    if (kind < 0.35 && s > R.minHole * 6) { const ring = circle(x, y, s * 0.42, 36); let okAll = true; const es = loopStroke(ring, hw0, 3, R.bridge * 2.2, rnd()).map((a) => ({ kind: 'solid', arc: true, poly: a, c: polyCentre(a), r: polyRadius(a) })); for (const e of es) okAll = okAll && inField(e, F, R); const eye = { kind: 'solid', poly: circle(x, y, Math.max(R.minHole / 2, s * 0.13)), c: [x, y], r: Math.max(R.minHole / 2, s * 0.13) }; if (okAll && put(eye)) { for (const e of es) put(e); if (P.intricacy > 0.5) for (const a of loopStroke(circle(x, y, s * 0.27, 24), hw0 * 0.75, 2, R.bridge * 2, 0.3)) put({ kind: 'solid', arc: true, poly: a, c: polyCentre(a), r: polyRadius(a) }); } }
    else if (kind < 0.6) { const cr = ccw(xf(crescent(s * 0.45, 0.5), { r: rnd() * TAU, tx: x, ty: y })); put({ kind: 'solid', poly: cr, c: [x, y], r: s * 0.46 }); }
    else { const st = ccw(star(rnd() < 0.5 ? 5 : 4, s * 0.42, s * 0.17, x, y, rnd() * TAU)); put({ kind: 'solid', poly: st, c: [x, y], r: s * 0.42 }); }
  }
  const tries = Math.round(120 + 200 * P.density);
  for (let m = 0; m < tries; m++) { const x = F.xMin + (xEnd - F.xMin) * rnd(), y = F.yLo() + (F.yHi(x) - F.yLo()) * rnd(); const dr = Math.max(R.minHole / 2, 0.75 + 1.1 * rnd() * rnd()); if (rnd() < 0.25 && dr > R.minHole * 0.9) { const st = ccw(star(4, dr * 2.2, dr * 0.7, x, y, rnd())); put({ kind: 'solid', poly: st, c: [x, y], r: dr * 2.2 }); } else put({ kind: 'solid', poly: circle(x, y, dr, 10), c: [x, y], r: dr }); }
}

/* The rim band: small motifs in a row along the rim, inset by the margin,
   from the inner vertex toward the tip, stopping where the band would meet
   the spine. */
function rimBand(F, t, P, R, rnd) {
  const out = [];
  if (P.rimBorder === 'none') return out;
  const pts = t.edge.pts.slice().reverse();        // from the inner vertex toward the tip
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = cum[cum.length - 1];
  const at = (s) => { let i = 0; while (i < pts.length - 2 && cum[i + 1] < s) i++; const u = (s - cum[i]) / ((cum[i + 1] - cum[i]) || 1); const p = pts[i], q = pts[i + 1]; const tx = q[0] - p[0], ty = q[1] - p[1], tl = Math.hypot(tx, ty) || 1; let n = [ty / tl, -tx / tl]; if (n[1] > 0) n = [-n[0], -n[1]]; return { p: [p[0] + tx * u, p[1] + ty * u], inward: n, tdir: [tx / tl, ty / tl] }; };
  const distToEdge = ([x, y]) => { let best = Infinity; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1; const u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2)); best = Math.min(best, Math.hypot(x - a[0] - u * dx, y - a[1] - u * dy)); } return best; };
  const d = Math.max(R.minHole, Math.min(2.4, R.minHole * 1.4));           // bead diameter
  const inset = R.rimMargin + d / 2 + 0.4;
  const stepLen = P.rimBorder === 'dashes' ? d * 3.4 : d * 2.2 + R.bridge;
  const s0 = R.foldKeepout + d, s1 = total - R.rimMargin * 1.2 - d;
  for (let s = s0; s < s1; s += stepLen) {
    const q = at(s);
    const c = [q.p[0] + q.inward[0] * inset, q.p[1] + q.inward[1] * inset];
    if (c[1] < R.spine / 2 + d) continue;
    if ((c[0] * Math.tan(t.a) - c[1]) * Math.cos(t.a) < R.foldKeepout + d * 0.6) continue;
    if (distToEdge(c) < R.rimMargin + d * 0.5) continue;   // near a sharp tip the inset point comes back within the margin of the edge's other stretch   // the bead would sit in the valley's keep-out (a wide facet's edge runs close to its valley near the vertex)
    if (P.rimBorder === 'beads') out.push(circle(c[0], c[1], d / 2, 14));
    else if (P.rimBorder === 'picot') { out.push(circle(c[0], c[1], d / 2, 14)); const c2 = [c[0] + q.inward[0] * (d + R.bridge), c[1] + q.inward[1] * (d + R.bridge)]; if (c2[1] > R.spine / 2 + d) out.push(circle(c2[0], c2[1], d * 0.34, 10)); }
    else if (P.rimBorder === 'scallop') { const r = d * 0.9; const arc = []; for (let k = 0; k <= 10; k++) { const g = Math.PI * k / 10; arc.push([c[0] + q.tdir[0] * r * Math.cos(g) - q.inward[0] * r * 0.55 * Math.sin(g), c[1] + q.tdir[1] * r * Math.cos(g) - q.inward[1] * r * 0.55 * Math.sin(g)]); } const st = stroke(arc, R.strokeWidth / 2 * 0.8); if (st) out.push(st); }
    else if (P.rimBorder === 'dashes') { const l = d * 1.6; const st = stroke([[c[0] - q.tdir[0] * l / 2, c[1] - q.tdir[1] * l / 2], [c[0] + q.tdir[0] * l / 2, c[1] + q.tdir[1] * l / 2]], R.strokeWidth / 2); if (st) out.push(st); }
  }
  return out;
}

/* the whole point: the half-facet's cuts mirrored across the ridge (y → −y) */
export const mirrorCuts = (cuts) => cuts.map((p) => ccw(p.map(([x, y]) => [x, -y])));

/* a quick SVG of one half-facet with its field and cuts, for looking at */
export function facetSvg(t, lay, R = RULES_DEFAULT) {
  const edge = t.edge.pts, V = edge[edge.length - 1];
  const outline = [[0, 0], ...edge.slice().reverse().map((p) => p), [0, 0]];
  const P = (p) => `${p[0].toFixed(2)},${(-p[1]).toFixed(2)}`;
  const y0 = -Math.max(...edge.map((p) => p[1])) - 4, h = Math.max(...edge.map((p) => p[1])) + 8, w = edge[0][0] + 8;
  const fieldPts = []; for (let x = lay.field.xMin; x <= lay.field.xMax; x += 2) { const y = lay.field.yHi(x); if (y > lay.field.yLo()) fieldPts.push([x, y]); }
  const fieldPath = fieldPts.length ? `M${fieldPts.map(P).join('L')}L${P([lay.field.xMax, lay.field.yLo()])}L${P([lay.field.xMin, lay.field.yLo()])}Z` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 ${y0} ${w} ${h}" width="${w * 3}" height="${h * 3}"><rect x="-4" y="${y0}" width="${w}" height="${h}" fill="#111"/><path d="M${outline.map(P).join('L')}Z" fill="#e9e4d6" stroke="none"/><path d="${fieldPath}" fill="none" stroke="#5fa0a0" stroke-width="0.3" stroke-dasharray="1 1"/>${lay.cuts.map((c) => `<path d="M${c.map(P).join('L')}Z" fill="#111"/>`).join('')}</svg>`;
}

/* ---------------- the page-facing API ---------------- */
import { registerDesignFields, facetPlacer, uvBox } from './lantern-geometry.js';
import { validateFacet, autoBridgeElements } from './lantern-validate.js';

/* The pattern's state fields, flat on the page's state beside the shape's;
   `readPattern` clamps them and is what the design file reads through. */
export const PATTERN_FIELDS = ['patMode', 'patSeed', 'patDensity', 'patIntricacy', 'patRim', 'patSolidAlt', 'patAutoBridge'];
export const PATTERN_STATE_DEFAULTS = Object.freeze({ patMode: 'paisley', patSeed: 7, patDensity: 0.6, patIntricacy: 0.7, patRim: 'beads', patSolidAlt: false, patAutoBridge: true });
const clampN = (v, lo, hi, d) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : d);
export function readPattern(raw) {
  const o = {};
  o.patMode = PATTERN_MODES.includes(raw.patMode) ? raw.patMode : PATTERN_STATE_DEFAULTS.patMode;
  o.patSeed = Math.round(clampN(raw.patSeed, 0, 2 ** 31 - 1, PATTERN_STATE_DEFAULTS.patSeed));
  o.patDensity = clampN(raw.patDensity, 0.2, 1, PATTERN_STATE_DEFAULTS.patDensity);
  o.patIntricacy = clampN(raw.patIntricacy, 0.2, 1, PATTERN_STATE_DEFAULTS.patIntricacy);
  o.patRim = RIM_BORDERS.includes(raw.patRim) ? raw.patRim : PATTERN_STATE_DEFAULTS.patRim;
  o.patSolidAlt = !!raw.patSolidAlt;
  o.patAutoBridge = raw.patAutoBridge !== false;
  return o;
}
registerDesignFields(PATTERN_FIELDS, readPattern);
export const patternOf = (state) => ({ mode: state.patMode, seed: state.patSeed, density: state.patDensity, intricacy: state.patIntricacy, rimBorder: state.patRim, solidAlternate: state.patSolidAlt });

/* The elements a layout placed, tagged for the validator: a stroke keeps its
   centreline so the judge knows which floor applies. */
export const cutsOfElement = (e) => (e.kind === 'stroke' ? [stroke(e.line, e.hw)] : [e.poly]).filter((p) => p && p.length >= 3);
export function taggedCuts(placed) { return placed.flatMap((e) => cutsOfElement(e).map((poly) => ({ poly, kind: e.kind === 'stroke' || e.arc ? 'stroke' : 'solid' }))); }

/* One pattern for a whole model: a layout per facet TYPE (both halves of
   every point of that type carry it, mirrored), bridged and judged.
   `validate: false` skips the raster judge (a slider mid-gesture). */
const memo = new Map();
export function patternForModel(model, state, R = RULES_DEFAULT, { validate = true } = {}) {
  const P = patternOf(state);
  const out = { types: [], issues: [], counts: { island: 0, thin: 0, narrow: 0, keepout: 0 }, bridged: 0, validated: validate, rules: R };
  for (const t of model.facets) {
    const key = JSON.stringify([t.type, t.Ro, t.Ri, t.a, t.edge.pts.length, t.edge.pts[t.edge.pts.length >> 1], P, R, validate, state.patAutoBridge]);
    let rec = memo.get(key);
    if (!rec) {
      const lay = P.mode === 'none' ? { cuts: [], placed: [], notes: [] } : layoutFacet(t, P, R);
      let placed = lay.placed, bridged = 0, issues = [], counts = { island: 0, thin: 0, narrow: 0, keepout: 0 };
      if (validate && placed.length) {
        if (state.patAutoBridge) for (let pass = 0; pass < 3; pass++) { const ab = autoBridgeElements(t, placed, R, cutsOfElement); placed = ab.placed; bridged += ab.bridged; if (!ab.bridged) break; }
      }
      const cuts = taggedCuts(placed);
      if (validate && cuts.length) { const v = validateFacet(t, cuts, R); issues = v.issues; counts = v.counts; }
      rec = { type: t.type, cuts, issues, counts, bridged, box: uvBox(t), notes: lay.notes || [] };
      if (memo.size > 24) memo.delete(memo.keys().next().value);
      memo.set(key, rec);
    }
    out.types.push(rec);
    out.bridged += rec.bridged;
    for (const k of Object.keys(out.counts)) out.counts[k] += rec.counts[k];
    for (const i of rec.issues) out.issues.push({ ...i, type: rec.type });
  }
  return out;
}

/* The cuts placed on the flat sheet: every point j, both halves, unless the
   point is solid under "alternate facets solid". Returns [{ poly, j, side }]. */
export function placeCuts(model, pat, state) {
  const out = [];
  for (let j = 0; j < model.N; j++) {
    if (state.patSolidAlt && j % 2 === 1) continue;
    const rec = pat.types[model.alternate ? j % 2 : 0]; if (!rec) continue;
    for (const side of [1, -1]) { const place = facetPlacer(model, j, side); for (const c of rec.cuts) out.push({ poly: c.poly.map(place), j, side }); }
  }
  return out;
}
/* Where each issue sits on the flat sheet (right half of every point of its type, once per point). */
export function placeIssues(model, pat, state) {
  const out = [];
  for (let j = 0; j < model.N; j++) {
    if (state.patSolidAlt && j % 2 === 1) continue;
    const rec = pat.types[model.alternate ? j % 2 : 0]; if (!rec) continue;
    const place = facetPlacer(model, j, 1);
    for (const i of rec.issues) out.push({ ...i, j, flat: place(i.at) });
  }
  return out;
}

/* Paints one facet type's pattern onto a 2D canvas context as an alpha map:
   white paper, black cuts, in the uvBox frame (x 0..Ro → 0..w, y −yMax..yMax → h..0). */
export function paintFacetTexture(ctx, rec, w, h, { solid = false } = {}) {
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  if (solid) return;
  const sx = w / rec.box.Ro, sy = h / (2 * rec.box.yMax);
  ctx.fillStyle = '#000';
  for (const side of [1, -1]) {
    for (const c of rec.cuts) {
      ctx.beginPath();
      c.poly.forEach((p, i) => { const X = p[0] * sx, Y = (rec.box.yMax - side * p[1]) * sy; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
      ctx.closePath(); ctx.fill();
    }
  }
}

/* ---------------- pattern presets and the randomizer ---------------- */
export const PATTERN_PRESETS = [
  { id: 'victorian', name: 'Scroll', state: { patMode: 'paisley', patSeed: 7, patDensity: 0.6, patIntricacy: 0.7, patRim: 'beads', patSolidAlt: false } },
  { id: 'lace', name: 'Lace', state: { patMode: 'lace', patSeed: 3, patDensity: 0.7, patIntricacy: 0.8, patRim: 'picot', patSolidAlt: false } },
  { id: 'botanical', name: 'Botanical', state: { patMode: 'botanical', patSeed: 5, patDensity: 0.6, patIntricacy: 0.7, patRim: 'scallop', patSolidAlt: false } },
  { id: 'geometric', name: 'Geometric', state: { patMode: 'geometric', patSeed: 3, patDensity: 0.65, patIntricacy: 0.6, patRim: 'dashes', patSolidAlt: false } },
  { id: 'celestial', name: 'Celestial', state: { patMode: 'celestial', patSeed: 3, patDensity: 0.55, patIntricacy: 0.7, patRim: 'none', patSolidAlt: false } },
  { id: 'alternate', name: 'Scroll, plain', state: { patMode: 'paisley', patSeed: 11, patDensity: 0.7, patIntricacy: 0.7, patRim: 'beads', patSolidAlt: true } },
  { id: 'plain', name: 'Plain', state: { patMode: 'none' } },
];
export function randomPattern(seed) {
  const rnd = mulberry32(seed);
  const modes = PATTERN_MODES.filter((m) => m !== 'none'), rims = RIM_BORDERS;
  return { patMode: modes[Math.floor(rnd() * modes.length)], patSeed: Math.floor(rnd() * 2 ** 30), patDensity: Math.round((0.4 + rnd() * 0.5) * 20) / 20, patIntricacy: Math.round((0.4 + rnd() * 0.6) * 20) / 20, patRim: rims[Math.floor(rnd() * rims.length)], patSolidAlt: rnd() < 0.15 };
}
