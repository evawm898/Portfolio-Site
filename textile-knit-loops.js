// textile-knit-loops.js — the ONE jersey loop geometry, shared by two pages.
//
//   * /textile-101.html — tools/knit-diagram/gen-knit-diagram.mjs imports this in Node and
//     bakes the #weft-warp-knit SVG once; the page itself carries no JS for it.
//   * /textile-stretch-simulator.html — imports this in the browser and draws the knit
//     swatch from it every frame, at whatever (W, L) the load has driven the loop to.
//
// Do not fork a copy into either page. A change here re-shapes BOTH: regenerate textile 101
// (node tools/knit-diagram/gen-knit-diagram.mjs) and commit the diff it produces, and run
// node tools/verify-stretch-sim.mjs, which checks that the diagram regenerates byte-identical.
//
// Parametric jersey loop with a depth (z) per point; z decides draw order at crossings.
//
// Loop anatomy per stitch (u in [0,1]): u=0 sinker (bottom, between wales) -> left leg ->
// u=0.5 head (top, on the wale) -> right leg -> u=1 the next sinker. Consecutive stitches on
// a course share their sinker point, so a course is ONE continuous strand.
// z = |dy/du| normalised: legs (steep) are FRONT, heads and sinkers (flat) are BACK.
// That one rule gives the jersey technical face: the legs of course n+1 pass over the head of
// course n, and the sinker loops of n+1 pass behind the legs of n.

export const PALETTE = { bg: '#0A0A0C', ink: '#EDEDE8', accent: '#5FA0A0' };

// SHAPE = { neck, squeeze }: neck pinches the legs just above the feet and widens the head
// shoulders (sin 4πu); squeeze narrows the whole loop against its pitch (sin 2πu) so the sinker
// loop between wales comes out as wide as the head. Tuned numerically: see tune.mjs in the report.
export const SHAPE = { neck: 0.21, squeeze: 0.05 };

// The resting jersey the textile 101 weft panel draws: course pitch / wale pitch = 52 / 62, and
// loop height / course pitch = 1.75. The generator reads loopPerCourse from here; the simulator
// reads both, so a resting swatch has the diagram's own proportions.
export const JERSEY_REST = { coursePerWale: 52 / 62, loopPerCourse: 1.75 };
// The textile 101 weft-knit panel (#weft-warp-knit) in its own viewBox: four courses of six
// wales, course 0 at the TOP (the newest — wale runs up), drawn SW wide with a HALO-wide gap
// each side of a front strand where it crosses a strand behind it. The generator bakes it, and
// the Knit tile in #what-is-a-textile (/textile-basics.js) animates the very same strands, so
// the two drawings cannot drift.
export const WEFT_PANEL = { w: 460, h: 300, x0: 76, W: 62, H: 52, n: 6, courses: 4, top: 60, SW: 7, HALO: 2 };
export function weftPanelCourses(P = WEFT_PANEL) {
  const L = JERSEY_REST.loopPerCourse * P.H;
  return Array.from({ length: P.courses }, (_, c) => weftCourse({ x0: P.x0, cy: P.top + c * P.H + 36, W: P.W, L, n: P.n }));
}
// The notch cut out of a back strand where front strand pts crosses it at fractional index s:
// a stretch of the FRONT strand halfLen long each way, stroked SW + 2·HALO wide in a mask.
export function notchPath(pts, s, halfLen) {
  const i = Math.max(0, Math.min(pts.length - 2, Math.floor(s)));
  const seg = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y) || 1;
  return toPath(slice(pts, s - halfLen / seg, s + halfLen / seg));
}

export function loopPoint(u, cx, cy, W, L, shape = SHAPE) {
  const x = cx + W * (u - 0.5) + shape.neck * W * Math.sin(4 * Math.PI * u) + shape.squeeze * W * Math.sin(2 * Math.PI * u);
  const y = cy + (L / 2) * Math.cos(2 * Math.PI * u);              // SVG y down: u=0 bottom, .5 top
  const z = Math.abs(Math.sin(2 * Math.PI * u));                   // 0 at head/sinker, 1 mid-leg
  return { x, y, z };
}

export function weftCourse({ x0, cy, W, L, n, shape = SHAPE, samples = 30 }) {
  const pts = [];
  for (let k = 0; k < n; k++)
    for (let i = 0; i < samples; i++) pts.push(loopPoint(i / samples, x0 + k * W, cy, W, L, shape));
  pts.push(loopPoint(1, x0 + (n - 1) * W, cy, W, L, shape));
  return pts;
}

// Tricot, OPEN LAP (0-1 / 2-1): the yarn forms a loop in wale w0 travelling left->right,
// underlaps ONE needle space on the technical back to wale w0+1, forms that loop travelling
// right->left, and underlaps back. Loops obey the weft z law; underlaps carry z = -1.
export function tricotYarn({ x0, y0, W, H, L, courses, w0, span = 0.62, shape = SHAPE, samples = 30 }) {
  const pts = [];
  const uA = (1 - span) / 2, uB = 1 - uA;
  for (let c = 0; c < courses; c++) {
    const cx = x0 + (w0 + (c % 2)) * W, cy = y0 - c * H, ltr = c % 2 === 0;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples, u = ltr ? uA + (uB - uA) * t : uB - (uB - uA) * t;
      pts.push(loopPoint(u, cx, cy, W, L, shape));
    }
    if (c < courses - 1) {
      // next loop is entered on the SAME side this one was left: exit right foot -> enter right foot
      const next = loopPoint(ltr ? uB : uA, x0 + (w0 + ((c + 1) % 2)) * W, cy - H, W, L, shape);
      const last = pts[pts.length - 1];
      for (let i = 1; i < 12; i++) {
        const t = i / 12, s = t * t * (3 - 2 * t);
        pts.push({ x: last.x + (next.x - last.x) * s, y: last.y + (next.y - last.y) * s, z: -1 });
      }
    }
  }
  return pts;
}

// The smoothing both pages draw a strand with: a Catmull-Rom spline through the sampled points,
// as cubic Béziers. emit(c1x, c1y, c2x, c2y, x, y) is called once per segment, from pts[0].
// A linear map commutes with it (every control point is an affine combination of samples), so
// mapping the points first and the controls after give the same curve.
export function catmullRom(pts, emit) {
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    emit(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6, p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, p2.x, p2.y);
  }
}

const f = v => Math.round(v * 10) / 10;   // a tenth of a viewBox unit is well under a device pixel at any shipped size
export function toPath(pts) {
  if (pts.length < 2) return '';
  let d = `M${f(pts[0].x)},${f(pts[0].y)}`;
  catmullRom(pts, (c1x, c1y, c2x, c2y, x, y) => { d += ` C${f(c1x)},${f(c1y)} ${f(c2x)},${f(c2y)} ${f(x)},${f(y)}`; });
  return d;
}

// Yarn length of one loop (one wale, sinker to sinker) of the shared curve at (W, L), by a fine
// polyline. The simulator conserves this number in the structural regime.
export function loopLength(W, L, shape = SHAPE, samples = 240) {
  let len = 0, p = loopPoint(0, 0, 0, W, L, shape);
  for (let i = 1; i <= samples; i++) { const q = loopPoint(i / samples, 0, 0, W, L, shape); len += Math.hypot(q.x - p.x, q.y - p.y); p = q; }
  return len;
}

// The largest course pitch / loop height (C / L) at which the loops still interloop: the legs
// of the loop above cross the head of the loop below on both sides. Past it the head has
// slid out of the loop above and the fabric has come apart. It depends on nothing but the
// loop's shape (stretching x leaves crossing heights alone, and everything scales with L),
// and it is found at the sampling the strands are drawn with, so "interlocked" and "a
// crossing is drawn" are the same statement. 0.8804 for SHAPE at 30 samples.
export function interlockLimit(shape = SHAPE, samples = 30) {
  const a = weftCourse({ x0: 0, cy: 0, W: 1, L: 1, n: 1, shape, samples });
  const holds = c => crossings([a, weftCourse({ x0: -2, cy: -c, W: 1, L: 1, n: 5, shape, samples })])
    .filter(x => x.front === 'b').length >= 2;
  let lo = 0.5, hi = 1;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (holds(m)) lo = m; else hi = m; }
  return lo;
}

// Crossings of a REGULAR jersey lattice (wale pitch W, course pitch C, loop height L), found on
// one cell and meant to be repeated: the loop of course 0 at wale 0 against the loops of the
// courses above it (dc = 1..) at wales dw = -2..2, every course sampled as weftCourse samples
// it. Each entry: { dc, dw, sa, sb, front } — sa / sb are fractional sample indices inside the
// course-0 loop and inside the neighbour's loop (0..samples), front 'a' or 'b' by the same z
// rule crossings() applies. Replicating it over a lattice gives exactly what crossings() finds
// on the whole swatch (verify-stretch-sim checks that), at the cost of one cell.
export function latticeCrossings(W, C, L, shape = SHAPE, samples = 30) {
  const out = [];
  const a = weftCourse({ x0: 0, cy: 0, W, L, n: 1, shape, samples });
  const reach = Math.ceil(L / C) + 1;
  for (let dc = 1; dc <= reach; dc++) {
    // SVG y-down, as weftCourse draws it: course dc sits dc pitches ABOVE course 0
    const b = weftCourse({ x0: -2 * W, cy: -dc * C, W, L, n: 5, shape, samples });
    for (const x of crossings([a, b])) {
      const k = Math.floor(x.ib / samples);
      out.push({ dc, dw: k - 2, sa: x.ia + x.ta, sb: x.ib - k * samples + x.tb, front: x.front });
    }
  }
  return out;
}

function segInt(a, b, c, d) {
  const rx = b.x - a.x, ry = b.y - a.y, sx = d.x - c.x, sy = d.y - c.y;
  const den = rx * sy - ry * sx; if (Math.abs(den) < 1e-9) return null;
  const qx = c.x - a.x, qy = c.y - a.y;
  const t = (qx * sy - qy * sx) / den, u = (qx * ry - qy * rx) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { t, u };
}

// All crossings between distinct strands. Each: {a, ia, ta, za, b, ib, tb, zb, x, y, front:'a'|'b'}
export function crossings(strands) {
  const out = [];
  for (let A = 0; A < strands.length; A++) for (let B = A + 1; B < strands.length; B++) {
    const P = strands[A], Q = strands[B];
    for (let i = 0; i < P.length - 1; i++) for (let j = 0; j < Q.length - 1; j++) {
      const h = segInt(P[i], P[i + 1], Q[j], Q[j + 1]); if (!h) continue;
      const za = P[i].z + (P[i + 1].z - P[i].z) * h.t, zb = Q[j].z + (Q[j + 1].z - Q[j].z) * h.u;
      out.push({ a: A, ia: i, ta: h.t, za, b: B, ib: j, tb: h.u, zb,
        x: P[i].x + (P[i + 1].x - P[i].x) * h.t, y: P[i].y + (P[i + 1].y - P[i].y) * h.t,
        front: za >= zb ? 'a' : 'b' });
    }
  }
  return out;
}

// Sub-polyline of a strand between fractional indices s0..s1 (index + t).
export function slice(pts, s0, s1) {
  s0 = Math.max(0, s0); s1 = Math.min(pts.length - 1, s1);
  const at = s => { const i = Math.floor(s), t = s - i; const p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)];
    return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, z: p.z }; };
  const out = [at(s0)];
  for (let i = Math.floor(s0) + 1; i <= Math.floor(s1); i++) out.push(pts[i]);
  if (s1 > Math.floor(s1)) out.push(at(s1));
  return out;
}
