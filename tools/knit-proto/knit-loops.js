// knit-loops.js — scratch prototype, NOT linked from the site.
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
export function loopPoint(u, cx, cy, W, L, shape = SHAPE) {
  const x = cx + W * (u - 0.5) + shape.neck * W * Math.sin(4 * Math.PI * u) + shape.squeeze * W * Math.sin(2 * Math.PI * u);
  const y = cy + (L / 2) * Math.cos(2 * Math.PI * u);              // SVG y down: u=0 bottom, .5 top
  const z = Math.abs(Math.sin(2 * Math.PI * u));                   // 0 at head/sinker, 1 mid-leg
  return { x, y, z };
}

export function weftCourse({ x0, cy, W, L, n, shape = SHAPE, samples = 36 }) {
  const pts = [];
  for (let k = 0; k < n; k++)
    for (let i = 0; i < samples; i++) pts.push(loopPoint(i / samples, x0 + k * W, cy, W, L, shape));
  pts.push(loopPoint(1, x0 + (n - 1) * W, cy, W, L, shape));
  return pts;
}

// Tricot, OPEN LAP (0-1 / 2-1): the yarn forms a loop in wale w0 travelling left->right,
// underlaps ONE needle space on the technical back to wale w0+1, forms that loop travelling
// right->left, and underlaps back. Loops obey the weft z law; underlaps carry z = -1.
export function tricotYarn({ x0, y0, W, H, L, courses, w0, span = 0.62, shape = SHAPE, samples = 36 }) {
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

const f = v => Math.round(v * 100) / 100;
export function toPath(pts) {
  if (pts.length < 2) return '';
  let d = `M${f(pts[0].x)},${f(pts[0].y)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += ` C${f(p1.x + (p2.x - p0.x) / 6)},${f(p1.y + (p2.y - p0.y) / 6)} ${f(p2.x - (p3.x - p1.x) / 6)},${f(p2.y - (p3.y - p1.y) / 6)} ${f(p2.x)},${f(p2.y)}`;
  }
  return d;
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
