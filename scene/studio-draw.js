// scene/studio-draw.js — every mark scene 4 makes. Flat fills, one neutral
// daylight, no lighting model: a face's tone is chosen by which way it faces
// (top lightest, front, then side) and nothing else.
//
// TWO PLANES. The ROOM — walls, bay, windows, sill, floor, crown and wainscot —
// never moves, so it is drawn once per resize onto the back canvas. The front
// canvas is cleared every frame and carries the furniture and the cats, in one
// painter's order, because a cat on the sill sits BEHIND the table and a cat on
// the table sits IN FRONT of it, and that ordering changes as cats move.
//
// THE PALETTE IS GREYSCALE ON PURPOSE. The section is one ink and one ground
// (scene.css says palettes are a later phase); a daylit room in greys keeps
// that, and two black cats read against it.

import { ROOM, FURNITURE, NODES, bayOffset, onSurface, pointInPoly } from './studio-room.js';
import { solveRig } from './studio-rig.js';
import { toeWorld } from './studio-cat.js';
import { CAMERA } from './studio-room.js';

export const PALETTE = {
  ground: '#cfcbc4',
  ceiling: '#e6e3dd',
  wallSide: '#c7c2ba',
  wallBack: '#d3cec6',
  bayWall: '#d8d3cb',
  crown: '#ecebe7',
  crownShade: '#bdb8b0',
  wainscot: '#c2bdb4',
  rail: '#e1ded8',
  glass: '#eef1f3',
  glassDeep: '#e3e8eb',
  mullion: '#b4afa6',
  sillTop: '#efede8',
  sillFace: '#aaa59c',
  floor: '#a59d92',
  board: '#968e83',
  shadow: 'rgba(40, 36, 32, 0.18)',
  wood: '#8a8278', woodDark: '#6f685f',
  uph: '#9a948c', uphDark: '#7f7970',
  cat: '#000000',    // one pure black ink: never lightened for contrast
  eye: '#ffffff',    // the face's marks: what carries a cat on dark furniture
};

const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
};

function poly(ctx, view, pts3, fill) {
  ctx.beginPath();
  pts3.forEach((q, i) => { const p = view.p(q[0], q[1], q[2]); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}
function line(ctx, view, pts3, stroke, width) {
  ctx.beginPath();
  pts3.forEach((q, i) => { const p = view.p(q[0], q[1], q[2]); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
  ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke();
}

// --------------------------------------------------------------- the room --
export function drawRoom(ctx, view) {
  const { halfW: X, backZ: B, ceilY: CY, bay } = ROOM;
  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(0, 0, view.w, view.h);
  const Z0 = -40;   // the room runs out behind the viewer

  // floor, including the bay's alcove
  const floorPts = [[-X, Z0], [X, Z0], [X, B], ...bay.slice().reverse(), [-X, B]];
  poly(ctx, view, floorPts.map(([x, z]) => [x, 0, z]), PALETTE.floor);
  drawFloorboards(ctx, view);

  // ceiling
  poly(ctx, view, [[-X, CY, Z0], [X, CY, Z0], [X, CY, B], ...bay.slice().reverse().map(([x, z]) => [x, CY, z]), [-X, CY, B]], PALETTE.ceiling);

  // side walls, back wall stubs
  poly(ctx, view, [[-X, 0, Z0], [-X, 0, B], [-X, CY, B], [-X, CY, Z0]], PALETTE.wallSide);
  poly(ctx, view, [[X, 0, Z0], [X, 0, B], [X, CY, B], [X, CY, Z0]], PALETTE.wallSide);
  poly(ctx, view, [[-X, 0, B], [bay[0][0], 0, B], [bay[0][0], CY, B], [-X, CY, B]], PALETTE.wallBack);
  poly(ctx, view, [[bay[3][0], 0, B], [X, 0, B], [X, CY, B], [bay[3][0], CY, B]], PALETTE.wallBack);

  // the bay: three facets, each wainscot below and a window above
  for (let i = 0; i < 3; i++) {
    const a = bay[i], b = bay[i + 1];
    const tone = i === 1 ? PALETTE.bayWall : shade(PALETTE.bayWall, 0.95);
    poly(ctx, view, [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], CY, b[1]], [a[0], CY, a[1]]], tone);
    poly(ctx, view, [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], ROOM.wainscotY, b[1]], [a[0], ROOM.wainscotY, a[1]]], PALETTE.wainscot);
    // the window: glass with a frame inset
    const inset = 7;
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
    const p0 = [a[0] + ux * inset, a[1] + uz * inset], p1 = [b[0] - ux * inset, b[1] - uz * inset];
    const y0 = ROOM.sillY + 3, y1 = ROOM.windowTop;
    poly(ctx, view, [[p0[0], y0, p0[1]], [p1[0], y0, p1[1]], [p1[0], y1, p1[1]], [p0[0], y1, p0[1]]], i === 1 ? PALETTE.glass : PALETTE.glassDeep);
    // mullions: a transom and the sash bars
    const yT = y0 + (y1 - y0) * 0.68;
    line(ctx, view, [[p0[0], yT, p0[1]], [p1[0], yT, p1[1]]], PALETTE.mullion, Math.max(1.5, view.scaleAt(a[1]) * 2.2));
    const bars = i === 1 ? 3 : 1;
    for (let k = 1; k <= bars; k++) {
      const f = k / (bars + 1);
      const q = [p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f];
      line(ctx, view, [[q[0], y0, q[1]], [q[0], y1, q[1]]], PALETTE.mullion, Math.max(1.5, view.scaleAt(q[1]) * 2.4));
    }
    line(ctx, view, [[p0[0], y0, p0[1]], [p1[0], y0, p1[1]], [p1[0], y1, p1[1]], [p0[0], y1, p0[1]], [p0[0], y0, p0[1]]], PALETTE.mullion, Math.max(2, view.scaleAt(a[1]) * 3.4));
  }

  // chair rail along every wall and facet
  const rail = (pts) => line(ctx, view, pts, PALETTE.rail, Math.max(1.5, view.scaleAt(B) * 2.6));
  rail([[-X, ROOM.wainscotY, Z0], [-X, ROOM.wainscotY, B], [bay[0][0], ROOM.wainscotY, B]]);
  rail([[X, ROOM.wainscotY, Z0], [X, ROOM.wainscotY, B], [bay[3][0], ROOM.wainscotY, B]]);
  rail(bay.map(([x, z]) => [x, ROOM.wainscotY, z]));

  // the sill: one continuous ledge across all three facets. Its front edge is
  // the glass line offset into the room by the sill's depth; on the two side
  // facets that edge is CUT where it meets the back wall's plane (not clamped
  // onto it, which slid its ends sideways and left the ledge stopping short of
  // the wall with no face under it)
  const inner = bayOffset(ROOM.sillDepth);
  const meetWall = (p, q) => { const t = (B - p[1]) / (q[1] - p[1]); return [p[0] + (q[0] - p[0]) * t, B]; };
  const front = [meetWall(inner[0], inner[1]), inner[1], inner[2], meetWall(inner[3], inner[2])];
  const sy = ROOM.sillY, ay = ROOM.sillY - ROOM.sillApron;
  poly(ctx, view, [...bay.map(([x, z]) => [x, sy, z]), ...front.slice().reverse().map(([x, z]) => [x, sy, z])], PALETTE.sillTop);
  for (let i = 0; i < 3; i++) {
    const a = front[i], b = front[i + 1];
    poly(ctx, view, [[a[0], sy, a[1]], [b[0], sy, b[1]], [b[0], ay, b[1]], [a[0], ay, a[1]]], i === 1 ? PALETTE.sillFace : shade(PALETTE.sillFace, 0.95));
  }
  // the nosing: a lit edge where the top turns down into the face
  line(ctx, view, front.map(([x, z]) => [x, sy, z]), PALETTE.sillTop, Math.max(1, view.scaleAt(B) * 1.2));

  // crown molding: a lit band with a shaded lip
  const crown = (pts) => {
    poly(ctx, view, [...pts.map(([x, z]) => [x, ROOM.crownY, z]), ...pts.slice().reverse().map(([x, z]) => [x, CY, z])], PALETTE.crown);
    line(ctx, view, pts.map(([x, z]) => [x, ROOM.crownY, z]), PALETTE.crownShade, Math.max(1.2, view.scaleAt(B) * 1.6));
  };
  crown([[-X, Z0], [-X, B], [bay[0][0], B]]);
  crown([[X, Z0], [X, B], [bay[3][0], B]]);
  crown(bay);
  // the corners of the bay, as hairlines
  for (const [x, z] of bay) line(ctx, view, [[x, 0, z], [x, CY, z]], shade(PALETTE.bayWall, 0.86), 1);
  line(ctx, view, [[-X, 0, B], [-X, CY, B]], shade(PALETTE.wallSide, 0.85), 1);
  line(ctx, view, [[X, 0, B], [X, CY, B]], shade(PALETTE.wallSide, 0.85), 1);
}

// FLOORBOARDS FOLLOW THE BAY. Each board line is a level set of distance from
// the back wall-and-bay outline, so near the bay it takes the facets' shape and
// it rounds off as it comes forward into the room.
function backLineZ(x) {
  const P = [[-ROOM.halfW, ROOM.backZ], ...ROOM.bay, [ROOM.halfW, ROOM.backZ]];
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1];
    if (x >= a[0] && x <= b[0]) return a[1] + (b[1] - a[1]) * (x - a[0]) / Math.max(1e-6, b[0] - a[0]);
  }
  return ROOM.backZ;
}
function backDist(x, z) {
  const P = [[-ROOM.halfW, ROOM.backZ], ...ROOM.bay, [ROOM.halfW, ROOM.backZ]];
  let best = Infinity;
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t));
  }
  return best;
}
let boardCache = null;
function boardLines() {
  if (boardCache) return boardCache;
  const lines = [];
  for (let d = 10; d < 440; d += d < 120 ? 10.5 : 12) {
    const pts = [];
    for (let x = -ROOM.halfW; x <= ROOM.halfW + 0.01; x += 3) {
      let lo = backLineZ(x) - d - 100, hi = backLineZ(x);
      for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (backDist(x, m) > d) lo = m; else hi = m; }
      pts.push([x, 0, (lo + hi) / 2]);
    }
    lines.push(pts.filter(p => p[2] > -40));
  }
  boardCache = lines;
  return lines;
}
function drawFloorboards(ctx, view) {
  ctx.lineWidth = 1;
  ctx.strokeStyle = PALETTE.board;
  for (const pts of boardLines()) {
    if (pts.length < 2) continue;
    ctx.beginPath();
    pts.forEach((q, i) => { const p = view.p(q[0], q[1], q[2]); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
    ctx.stroke();
  }
}

// ---------------------------------------------------------- the furniture --
function hull(points) {
  const P = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lo = [], up = [];
  for (const p of P) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

function drawPart(ctx, view, part) {
  const base = PALETTE[part.tone] || PALETTE.wood;
  if (part.kind === 'box') {
    const { x0, x1, y0, y1, z0, z1 } = part;
    if (x0 > CAMERA.x) poly(ctx, view, [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], shade(base, 0.82));
    if (x1 < CAMERA.x) poly(ctx, view, [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], shade(base, 0.82));
    poly(ctx, view, [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], base);
    if (y1 < CAMERA.y) poly(ctx, view, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], shade(base, 1.18));
  } else if (part.kind === 'cyl') {
    const ring = (y) => Array.from({ length: 36 }, (_, i) => {
      const a = i / 36 * Math.PI * 2;
      return view.p(part.x + part.r * Math.cos(a), y, part.z + part.r * Math.sin(a));
    });
    const side = hull([...ring(part.y0), ...ring(part.y1)]);
    ctx.beginPath(); side.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
    ctx.fillStyle = base; ctx.fill();
    const top = ring(part.y1);
    ctx.beginPath(); top.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
    ctx.fillStyle = shade(base, 1.18); ctx.fill();
  }
}

const camDist = (x, y, z) => Math.hypot(x - CAMERA.x, y - CAMERA.y, z - CAMERA.z);
function partCentre(p) {
  if (p.kind === 'box') return [(p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2, (p.z0 + p.z1) / 2];
  return [p.x, (p.y0 + p.y1) / 2, p.z];
}

function drawItem(ctx, view, item) {
  const parts = item.parts.slice().sort((a, b) => camDist(...partCentre(b)) - camDist(...partCentre(a)));
  for (const p of parts) drawPart(ctx, view, p);
}

// ---------------------------------------------------------------- the cat --
// THE STYLE: a cute, minimal black-cat silhouette. One pure black fill, no
// outline, no shading; large white ring eyes; ears as sharp triangles off the
// top of the head; three white whiskers a side; a thick tapered tail; and NO
// VISIBLE LEGS. The rig still solves every leg — the IK is what gives a pose
// its weight and keeps a paw planted — but the drawing discards the limbs and
// keeps only two things from them: where each paw is, and which end of the
// body it belongs to. The body is then the union of the spine's discs and two
// DRAPES, each the convex hull of the torso's lower half and one pair's paws
// (fore, hind). Each drape covers the whole torso, so their union reaches the
// ground as one mass with a shallow arch under the belly between the pairs,
// and each paw shows only as a small NUB at the hull's foot. No knee, no
// joint, no limb shape survives, whatever the IK did with them.
//
// Every number here is a drawing proportion, in world cm or as a factor on the
// rig's own radius, and none of it reaches the motion.
const STYLE = {
  body: 1.1,                 // the spine's discs, rounder than the rig's
  head: 1.34,                // the head and everything on it, about its centre: big, cute
  earTip: 1.08,              // the ear's tip pushed further out: a sharper point
  muzzle: 0.8,               // a small snout, read only in profile
  nub: 2.0, nubUp: 1.6,      // a paw's nub, and how far its centre sits above the paw
  ankle: 2.5, ankleUp: 3.6,  // the drape's foot: just above the nub, so the nubs read
  arch: 3.2,                 // the radius the belly's arch is rounded to, cm
  tail: [2.5, 0.8],          // root and tip radius
  eyeR: 1.6, eyeW: 0.45, eyeMinW: 1.4,    // a ring, cm; its stroke never under 1.4 px
  eyeFacing: -0.15,          // an eye is drawn until it has turned this far past profile
  whiskerLen: 6.4, whiskerW: 0.16, whiskerMinW: 0.75,
};
export const CAT_STYLE = STYLE;

const v3 = {
  add: (p, ...terms) => { const r = [...p]; for (const [k, v] of terms) { r[0] += v[0] * k; r[1] += v[1] * k; r[2] += v[2] * k; } return r; },
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  unit: (a) => { const m = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / m, a[1] / m, a[2] / m]; },
};
const toCamera = (q) => v3.unit([CAMERA.x - q[0], CAMERA.y - q[1], CAMERA.z - q[2]]);

function disc(ctx, view, q, r) {
  const p = view.p(q[0], q[1], q[2]);
  discAt(ctx, p.x, p.y, Math.max(0.5, r * p.s));
}
// A TAPERED CAPSULE between two world points: two discs and the band of their
// two EXTERNAL TANGENTS, every subpath wound the same way as ctx.arc. The band
// is built on the true tangents, not on the perpendicular at each end: on a
// foreshortened capsule (a cat facing into or out of the room) the ends'
// projected distance falls below the difference of their radii, and a
// perpendicular-ended quad then folds over itself — its reversed half CANCELS
// the discs under the nonzero rule and a pale seam opens through the
// silhouette. Where one disc swallows the other there is no band at all.
function capsule(ctx, view, a, b, ra, rb) {
  const pa = view.p(a[0], a[1], a[2]), pb = view.p(b[0], b[1], b[2]);
  const Ra = Math.max(0.5, ra * pa.s), Rb = Math.max(0.5, rb * pb.s);
  discAt(ctx, pa.x, pa.y, Ra);
  discAt(ctx, pb.x, pb.y, Rb);
  const dx = pb.x - pa.x, dy = pb.y - pa.y, L = Math.hypot(dx, dy);
  if (L <= Math.abs(Ra - Rb) + 1e-3) return;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const s = (Ra - Rb) / L, c = Math.sqrt(Math.max(0, 1 - s * s));
  // tangent directions on the two sides, from each centre
  const t1x = s * ux - c * nx, t1y = s * uy - c * ny;
  const t2x = s * ux + c * nx, t2y = s * uy + c * ny;
  ctx.moveTo(pa.x + Ra * t1x, pa.y + Ra * t1y);
  ctx.lineTo(pb.x + Rb * t1x, pb.y + Rb * t1y);
  ctx.lineTo(pb.x + Rb * t2x, pb.y + Rb * t2y);
  ctx.lineTo(pa.x + Ra * t2x, pa.y + Ra * t2y);
  ctx.closePath();
}
function discAt(ctx, x, y, r) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); }

// A circle's points on screen, sampled densely enough that a hull through them
// is its own tangent to a tenth of a pixel; `lower` keeps only the half below
// the centre (screen y down), so a drape fills downward and never flattens a
// dipped back.
const RING_N = 32;
function ringPts(out, view, q, r, lower) {
  const p = view.p(q[0], q[1], q[2]), R = Math.max(0.5, r * p.s);
  const n = lower ? RING_N / 2 : RING_N;
  for (let k = 0; k <= n; k++) {
    const a = (lower ? Math.PI : 2 * Math.PI) * k / (lower ? n : n + 1);
    out.push({ x: p.x + R * Math.cos(a), y: p.y + R * Math.sin(a) });
  }
}
function polyPath(ctx, P) {
  if (P.length < 3) return;
  ctx.moveTo(P[0].x, P[0].y);
  for (let k = 1; k < P.length; k++) ctx.lineTo(P[k].x, P[k].y);
  ctx.closePath();
}

// The cat's drawing geometry, in world cm, from the rig: the parts the
// silhouette is made of, and where the face's marks go. Pure, so the gate can
// measure it.
export function catShape(rig) {
  const H = rig.head, k = STYLE.head;
  const scaleOnHead = (q, f = k) => v3.add(H.c, [f, v3.sub(q, H.c)]);
  const torso = rig.spine.slice(0, 6).map(s => ({ p: s.p, r: s.r * STYLE.body }));
  const neck = rig.spine[rig.spine.length - 1];
  const up = [0, 1, 0];
  const paws = rig.legs.map(L => ({
    fore: L.fore,
    nub: v3.add(L.paw, [STYLE.nubUp, up]),
    ankle: v3.add(L.paw, [STYLE.ankleUp, up]),
  }));
  const ears = rig.ears.map(([a, tip, b]) => [scaleOnHead(a), scaleOnHead(tip, k * STYLE.earTip), scaleOnHead(b)]);
  const n = rig.tail.length;
  const tail = rig.tail.map((t, i) => ({ p: t.p, r: STYLE.tail[1] + (STYLE.tail[0] - STYLE.tail[1]) * Math.pow(1 - i / (n - 1), 1.15) }));
  const eyes = rig.eyes.map(e => ({ c: scaleOnHead(e.c), n: e.n, open: e.open }));
  const muzzle = { c: scaleOnHead(rig.muzzle.c), r: rig.muzzle.r * STYLE.muzzle };
  return { torso, neck: { p: neck.p, r: neck.r }, head: { c: H.c, r: H.r * k, f: v3.unit(H.f), s: v3.unit(H.s), u: v3.unit(H.u) }, muzzle, ears, tail, paws, eyes };
}

// THE BELLY'S ARCH IS ROUNDED. The two drapes' union meets under the belly in
// a V — two straight hull edges crossing — which reads as two legs. The corner
// is filled with a fillet: the region from the crossing down to the NEAR arc of
// a circle of radius `arch` touching both edges, so the union's edge runs down
// one drape, round that arc and down the other. The region is star-shaped from
// the crossing and is emitted as a fan of triangles, each convex and wound as
// ctx.arc is. Only a crossing below
// the torso whose open wedge faces down (the gap under the belly) is filleted.
function insideConvex(P, x, y) {
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length];
    if ((b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x) < -1e-6) return false;
  }
  return true;
}
function archFillet(ctx, view, S, A, B) {
  if (A.length < 3 || B.length < 3) return;
  const mid = S.torso[3].p, pm = view.p(mid[0], mid[1], mid[2]);
  let best = null;
  for (let i = 0; i < A.length; i++) {
    const a0 = A[i], a1 = A[(i + 1) % A.length];
    for (let j = 0; j < B.length; j++) {
      const b0 = B[j], b1 = B[(j + 1) % B.length];
      const rx = a1.x - a0.x, ry = a1.y - a0.y, qx = b1.x - b0.x, qy = b1.y - b0.y;
      const den = rx * qy - ry * qx;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((b0.x - a0.x) * qy - (b0.y - a0.y) * qx) / den, u = ((b0.x - a0.x) * ry - (b0.y - a0.y) * rx) / den;
      if (t <= 1e-6 || t >= 1 - 1e-6 || u <= 1e-6 || u >= 1 - 1e-6) continue;
      const X = { x: a0.x + rx * t, y: a0.y + ry * t };
      if (X.y <= pm.y || (best && X.y <= best.X.y)) continue;
      best = { X, a: [a0, a1], b: [b0, b1] };
    }
  }
  if (!best) return;
  const { X } = best;
  // along each edge, the ray from the crossing that lies OUTSIDE the other drape
  const ray = (seg, other) => {
    for (const end of seg) {
      const dx = end.x - X.x, dy = end.y - X.y, L = Math.hypot(dx, dy);
      if (L < 1e-6) continue;
      const e = 0.5 / L;
      if (!insideConvex(other, X.x + dx * e, X.y + dy * e)) return { ux: dx / L, uy: dy / L, L };
    }
    return null;
  };
  const ra = ray(best.a, B), rb = ray(best.b, A);
  if (!ra || !rb) return;
  const bx = ra.ux + rb.ux, by = ra.uy + rb.uy, bl = Math.hypot(bx, by);
  if (bl < 1e-6 || by / bl < 0.2) return;        // the gap must open downward
  const half = Math.acos(Math.max(-1, Math.min(1, ra.ux * rb.ux + ra.uy * rb.uy))) / 2;
  if (half < 0.05 || half > Math.PI / 2 - 0.05) return;
  let r = STYLE.arch * pm.s;
  const reach = Math.min(ra.L, rb.L) * 0.9;
  r = Math.min(r, reach * Math.tan(half));
  if (r < 0.5) return;
  const dt = r / Math.tan(half), dc = r / Math.sin(half);
  const cx = X.x + bx / bl * dc, cy = X.y + by / bl * dc;
  // the NEAR arc, from one tangent point to the other: the side facing X
  const a0 = Math.atan2(X.y + ra.uy * dt - cy, X.x + ra.ux * dt - cx);
  let a1 = Math.atan2(X.y + rb.uy * dt - cy, X.x + rb.ux * dt - cx);
  let da = a1 - a0;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  const n = Math.max(2, Math.ceil(Math.abs(da) / 0.2));
  const arc = [];
  for (let k = 0; k <= n; k++) { const a = a0 + da * k / n; arc.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }); }
  // the fillet is X down to that arc: star-shaped from X, so it is a fan of
  // triangles, each convex and wound as ctx.arc is
  for (let k = 0; k < n; k++) {
    const p = arc[k], q = arc[k + 1];
    const area = (p.x - X.x) * (q.y - X.y) - (p.y - X.y) * (q.x - X.x);
    if (Math.abs(area) < 1e-9) continue;
    polyPath(ctx, area > 0 ? [X, p, q] : [X, q, p]);
  }
}

// ONE SILHOUETTE, ONE FILL. Everything in the cat's ink — the two drapes, the
// nubs, tail, body, neck, head, muzzle, ears — goes into a single path and is
// filled once, so no two parts meet along an anti-aliased edge (two fills of
// one colour that only touch leave a hairline of the ground between them).
// Then the face, in white, on top: rings for eyes and three whiskers a side.
export function drawCat(ctx, view, rig) {
  const S = catShape(rig);
  ctx.beginPath();
  // the drapes first: each is a convex polygon, wound as ctx.arc is
  const drapes = [true, false].map((fore) => {
    const pts = [];
    for (const t of S.torso) ringPts(pts, view, t.p, t.r, true);
    for (const P of S.paws) if (P.fore === fore) ringPts(pts, view, P.ankle, STYLE.ankle, false);
    return hull(pts);
  });
  for (const D of drapes) polyPath(ctx, D);
  archFillet(ctx, view, S, drapes[0], drapes[1]);
  for (const P of S.paws) disc(ctx, view, P.nub, STYLE.nub);
  for (let i = 0; i < S.tail.length - 1; i++) capsule(ctx, view, S.tail[i].p, S.tail[i + 1].p, S.tail[i].r, S.tail[i + 1].r);
  for (let i = 0; i < S.torso.length - 1; i++) capsule(ctx, view, S.torso[i].p, S.torso[i + 1].p, S.torso[i].r, S.torso[i + 1].r);
  capsule(ctx, view, S.torso[S.torso.length - 1].p, S.neck.p, S.torso[S.torso.length - 1].r, S.neck.r * 1.05);
  capsule(ctx, view, S.neck.p, S.head.c, S.neck.r * 1.05, S.head.r * 0.72);
  disc(ctx, view, S.head.c, S.head.r);
  disc(ctx, view, S.muzzle.c, S.muzzle.r);
  // THE EARS ARE CUT FROM PAPER FACING THE CAMERA. The rig's ear is a flat
  // triangle in the head's fore-and-up plane, so head-on it is seen edge-on
  // as a hairline spike. Here an ear keeps the rig's base and tip but is drawn
  // as a triangle of its own true width across the screen line from base to
  // tip, the tip at least 1.35 base-widths out (pushed out from the head's
  // centre where the ear points straight at the lens).
  const ph = view.p(S.head.c[0], S.head.c[1], S.head.c[2]);
  for (const [qa, qt, qb] of S.ears) {
    const pb = view.p((qa[0] + qb[0]) / 2, (qa[1] + qb[1]) / 2, (qa[2] + qb[2]) / 2), pt = view.p(qt[0], qt[1], qt[2]);
    const halfW = 0.5 * Math.hypot(qa[0] - qb[0], qa[1] - qb[1], qa[2] - qb[2]) * pb.s;
    let dx = pt.x - pb.x, dy = pt.y - pb.y, len = Math.hypot(dx, dy);
    const out = Math.hypot(pb.x - ph.x, pb.y - ph.y);
    if (len < 1e-6) { dx = pb.x - ph.x; dy = pb.y - ph.y; len = out || 1; if (!out) { dx = 0; dy = -1; len = 1; } }
    const ux = dx / len, uy = dy / len, h = Math.max(len, 3 * halfW * 0.9);
    const tip = { x: pb.x + ux * h, y: pb.y + uy * h };
    let a = { x: pb.x - uy * halfW, y: pb.y + ux * halfW }, c = { x: pb.x + uy * halfW, y: pb.y - ux * halfW };
    if ((tip.x - a.x) * (c.y - a.y) - (tip.y - a.y) * (c.x - a.x) < 0) [a, c] = [c, a];
    ctx.moveTo(a.x, a.y); ctx.lineTo(tip.x, tip.y); ctx.lineTo(c.x, c.y); ctx.closePath();
  }
  ctx.fillStyle = PALETTE.cat; ctx.fill('nonzero');
  // THE SAME PATH, STROKED HAIR-THIN IN THE SAME INK. Skia's analytic
  // antialiasing leaves a faint seam (7 % short of full cover, measured on a
  // 2x headless raster, on main as well) along an INTERNAL edge of an
  // overlapping nonzero path — the top of a disc inside the body, say. A
  // stroke of the one path in the one ink puts full cover on every such edge;
  // on the outer edge it grows the silhouette by half a pixel, no outline.
  ctx.strokeStyle = PALETTE.cat; ctx.lineWidth = 1; ctx.lineJoin = 'round'; ctx.stroke();
  drawFace(ctx, view, S);
}

// THE FACE. The eyes carry a black cat on a dark chaise, so they are big, pure
// white and drawn whenever the face is turned toward the camera at all —
// head-on, three-quarter and in profile (the near eye), until it is turned this
// far past profile. A ring is foreshortened by how squarely it faces, but never
// below half its width, and it is kept inside the head's own disc so it never
// reads off the silhouette. Shut, it is a white arc; half shut, a squashed ring.
function drawFace(ctx, view, S) {
  const H = S.head, pc = view.p(H.c[0], H.c[1], H.c[2]), headR = H.r * pc.s;
  ctx.strokeStyle = PALETTE.eye;
  ctx.lineCap = 'round';
  // the head's up on screen: the rings stand on it
  const pu = view.p(H.c[0] + H.u[0], H.c[1] + H.u[1], H.c[2] + H.u[2]);
  const ux = pu.x - pc.x, uy = pu.y - pc.y;
  const rot = Math.hypot(ux, uy) > 1e-6 ? Math.atan2(uy, ux) + Math.PI / 2 : 0;
  const rings = [];
  for (const e of S.eyes) {
    const facing = v3.dot(toCamera(e.c), v3.unit(e.n));
    if (facing < STYLE.eyeFacing) continue;
    const p = view.p(e.c[0], e.c[1], e.c[2]);
    const R = STYLE.eyeR * p.s, w = Math.max(STYLE.eyeMinW, STYLE.eyeW * p.s);
    const rx = R * (0.62 + 0.38 * Math.max(0, Math.min(1, facing)));
    // inside the head disc, ring and stroke both
    let x = p.x, y = p.y;
    const dx = x - pc.x, dy = y - pc.y, d = Math.hypot(dx, dy), room = headR - R - w;
    if (d > room && d > 1e-6) { x = pc.x + dx * Math.max(0, room) / d; y = pc.y + dy * Math.max(0, room) / d; }
    rings.push({ x, y, R, rx, w, facing, open: e.open });
  }
  // two rings that would touch are one eye seen past the other: the nearer
  // (the one facing the camera more squarely) is drawn alone, as in profile
  if (rings.length === 2 && Math.hypot(rings[0].x - rings[1].x, rings[0].y - rings[1].y) < rings[0].rx + rings[1].rx + rings[0].w) {
    rings.splice(rings[0].facing >= rings[1].facing ? 1 : 0, 1);
  }
  for (const g of rings) {
    ctx.lineWidth = g.w;
    ctx.beginPath();
    if (g.open < 0.25) ctx.ellipse(g.x, g.y, g.rx, g.R * 0.6, rot, 0.12 * Math.PI, 0.88 * Math.PI);
    else ctx.ellipse(g.x, g.y, g.rx, g.R * Math.min(1, g.open), rot, 0, Math.PI * 2);
    ctx.stroke();
  }
  // whiskers: three a side from the cheek, fanned, drawn while that cheek is
  // turned toward the camera
  const m = S.muzzle.c, pm = view.p(m[0], m[1], m[2]);
  ctx.lineWidth = Math.max(STYLE.whiskerMinW, STYLE.whiskerW * pm.s);
  ctx.beginPath();
  for (const sg of [1, -1]) {
    const side = v3.add([0, 0, 0], [sg, H.s], [0.4, H.f]);
    if (v3.dot(toCamera(m), v3.unit(side)) < -0.2) continue;
    const root = v3.add(m, [sg * 1.0, H.s], [0.2, H.f]);
    for (const j of [-1, 0, 1]) {
      const dir = v3.unit(v3.add([0, 0, 0], [sg, H.s], [0.42, H.f], [0.3 * j - 0.06, H.u]));
      const a = view.p(...v3.add(root, [0.5, dir])), b = view.p(...v3.add(root, [STYLE.whiskerLen, dir]));
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    }
  }
  ctx.stroke();
}

// The surface under a point: the highest node at or below `y` whose surface
// holds (x, z). A cat's shadow lands there, which is what lets the eye read a
// jump's height against the thing it is jumping onto.
export function surfaceBelow(x, z, y) {
  let best = 0;
  for (const id of Object.keys(NODES)) {
    const n = NODES[id];
    if (n.y <= y + 0.5 && n.y > best && onSurface(id, x, z)) best = n.y;
  }
  return best;
}

function drawShadow(ctx, view, cat) {
  const c = cat.ch;
  const f = [Math.cos(cat.h), Math.sin(cat.h)];
  const mu = (c.hipU + c.shU) / 2;
  const x = cat.pos[0] + f[0] * mu, z = cat.pos[2] + f[1] * mu;
  const yb = cat.pos[1] + Math.min(c.hipH, c.shH);
  const sy = surfaceBelow(x, z, yb);
  const height = Math.max(0, yb - sy);
  const k = 1 / (1 + height / 40);
  const p = view.p(x, sy + 0.2, z);
  const q = view.p(x + f[0] * 16, sy + 0.2, z + f[1] * 16);
  const rx = Math.hypot(q.x - p.x, q.y - p.y) + 7 * p.s;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(Math.atan2(q.y - p.y, q.x - p.x));
  ctx.scale(1, 0.32);
  ctx.beginPath(); ctx.arc(0, 0, rx * (0.7 + 0.3 * k), 0, Math.PI * 2);
  ctx.fillStyle = `rgba(40, 36, 32, ${0.16 * k})`;
  ctx.fill();
  ctx.restore();
}

// ------------------------------------------------- the front plane, per frame --
// PAINTER'S ORDER, PART BY PART. One depth key per piece of furniture cannot
// say "on the chaise's seat, behind its raised end", so the furniture is drawn
// part by part (far to near, as before) and each cat goes in after the LAST
// part it is in front of or standing on. A cat is in front of a box when it is
// on the camera's side of one of the box's camera-facing faces — or above its
// top — and in front of a vertical cylinder when it is nearer the camera.
function inFrontOf(cat, part, own) {
  const c = cat.ch, f = [Math.cos(cat.h), Math.sin(cat.h)];
  // judged at the body's centre — and, on the piece the cat is standing on or
  // jumping off or onto, at its hips and shoulders too: a cat straddling that
  // piece's edge is in front of the face its shoulders are past
  const us = own ? [(c.hipU + c.shU) / 2, c.hipU, c.shU] : [(c.hipU + c.shU) / 2];
  for (const u of us) if (pointInFront(cat, part, cat.pos[0] + f[0] * u, cat.pos[2] + f[1] * u)) return true;
  return false;
}
// Every test here is a SEPARATING PLANE: a plane through one of the part's
// faces with the camera and the cat on one side and the whole part on the
// other. Then no sight line from the camera to the cat can pass through the
// part, so drawing the cat after it is never wrong. Above the part's top (the
// cat's lowest paw over it, the camera higher still) is the same argument.
function pointInFront(cat, part, x, z) {
  let feet = Infinity;
  for (let i = 0; i < 4; i++) feet = Math.min(feet, toeWorld(cat, i)[1]);
  if (CAMERA.y > part.y1 && feet >= part.y1 - 0.5) return true;
  if (part.kind === 'box') {
    if (z < part.z0) return true;
    if (part.x0 > CAMERA.x && x < part.x0) return true;
    if (part.x1 < CAMERA.x && x > part.x1) return true;
    return false;
  }
  return Math.hypot(x - CAMERA.x, z - CAMERA.z) < Math.hypot(part.x - CAMERA.x, part.z - CAMERA.z) - part.r;
}

export function drawOrder(cats, legEdges = []) {
  let list = [];
  for (const item of FURNITURE.slice().sort((a, b) => b.z - a.z)) {
    const ps = item.parts.slice().sort((a, b) => camDist(...partCentre(b)) - camDist(...partCentre(a)));
    for (const part of ps) list.push({ item, part });
  }
  // each cat in turn, the farther first: it goes after everything it is in
  // front of, and whatever it is NOT in front of that came before that point
  // moves to just after it — so a part in front of a cat is never overdrawn
  // by it however the furniture happened to be listed
  const idx = cats.map((c, i) => i).sort((a, b) => camDist(...cats[b].pos) - camDist(...cats[a].pos));
  for (const i of idx) {
    const cat = cats[i], e = legEdges[i], mine = new Set([cat.node, ...(e ? [e.from, e.to] : [])]);
    const front = (d) => (d.part ? inFrontOf(cat, d.part, mine.has(d.item.node)) : true);   // an earlier cat is farther
    let at = 0;
    list.forEach((d, k) => { if (front(d)) at = k + 1; });
    const head = list.slice(0, at), tail = list.slice(at);
    list = [...head.filter(front), { cat: i }, ...head.filter(d => !front(d)), ...tail];
  }
  return list;
}

export function drawActors(ctx, view, cats, legEdges, rigs) {
  ctx.clearRect(0, 0, view.w, view.h);
  for (const d of drawOrder(cats, legEdges)) {
    if (d.part) drawPart(ctx, view, d.part);
    else { drawShadow(ctx, view, cats[d.cat]); drawCat(ctx, view, rigs[d.cat]); }
  }
}

export { solveRig, pointInPoly };
