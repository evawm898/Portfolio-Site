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
  cat: '#131316', catFar: '#2a2a2f',
  eye: '#cfd4b2',
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

  // the sill: one continuous ledge across all three facets
  const inner = bayOffset(ROOM.sillDepth);
  const clipZ = (p) => [p[0], Math.max(B, p[1])];
  const innerC = inner.map(clipZ);
  poly(ctx, view, [...bay.map(([x, z]) => [x, ROOM.sillY, z]), ...innerC.slice().reverse().map(([x, z]) => [x, ROOM.sillY, z])], PALETTE.sillTop);
  for (let i = 0; i < 3; i++) {
    const a = innerC[i], b = innerC[i + 1];
    poly(ctx, view, [[a[0], ROOM.sillY, a[1]], [b[0], ROOM.sillY, b[1]], [b[0], ROOM.sillY - ROOM.sillApron, b[1]], [a[0], ROOM.sillY - ROOM.sillApron, a[1]]], i === 1 ? PALETTE.sillFace : shade(PALETTE.sillFace, 0.95));
  }

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
function disc(ctx, view, q, r) {
  const p = view.p(q[0], q[1], q[2]);
  ctx.moveTo(p.x + r * p.s, p.y);
  ctx.arc(p.x, p.y, Math.max(0.5, r * p.s), 0, Math.PI * 2);
}
// a tapered capsule between two world points
function capsule(ctx, view, a, b, ra, rb) {
  const pa = view.p(a[0], a[1], a[2]), pb = view.p(b[0], b[1], b[2]);
  const Ra = Math.max(0.5, ra * pa.s), Rb = Math.max(0.5, rb * pb.s);
  const dx = pb.x - pa.x, dy = pb.y - pa.y, L = Math.hypot(dx, dy) || 1e-6;
  const nx = -dy / L, ny = dx / L;
  // WOUND THE SAME WAY AS ctx.arc, or the nonzero rule cancels the overlap
  // and every joint shows a pale seam through the silhouette.
  ctx.moveTo(pa.x - nx * Ra, pa.y - ny * Ra);
  ctx.lineTo(pb.x - nx * Rb, pb.y - ny * Rb);
  ctx.lineTo(pb.x + nx * Rb, pb.y + ny * Rb);
  ctx.lineTo(pa.x + nx * Ra, pa.y + ny * Ra);
  ctx.closePath();
  ctx.moveTo(pa.x + Ra, pa.y); ctx.arc(pa.x, pa.y, Ra, 0, Math.PI * 2);
  ctx.moveTo(pb.x + Rb, pb.y); ctx.arc(pb.x, pb.y, Rb, 0, Math.PI * 2);
}

function drawLeg(ctx, view, L, fill) {
  ctx.beginPath();
  for (let k = 0; k < 3; k++) capsule(ctx, view, L.pts[k], L.pts[k + 1], L.widths[k] / 2, L.widths[k + 1] / 2);
  disc(ctx, view, L.paw, 1.75);
  ctx.fillStyle = fill; ctx.fill('nonzero');
}

export function drawCat(ctx, view, rig) {
  const near = (L) => Math.sign(L.i % 2 === 0 ? 1 : -1) === rig.nearSign;
  // far legs, a shade lighter, under everything
  for (const L of rig.legs) if (!near(L)) drawLeg(ctx, view, L, PALETTE.catFar);
  // tail
  ctx.beginPath();
  for (let k = 0; k < rig.tail.length - 1; k++) capsule(ctx, view, rig.tail[k].p, rig.tail[k + 1].p, rig.tail[k].r, rig.tail[k + 1].r);
  ctx.fillStyle = PALETTE.cat; ctx.fill('nonzero');
  // body
  ctx.beginPath();
  for (let k = 0; k < rig.spine.length - 1; k++) capsule(ctx, view, rig.spine[k].p, rig.spine[k + 1].p, rig.spine[k].r, rig.spine[k + 1].r);
  capsule(ctx, view, rig.spine[rig.spine.length - 1].p, rig.head.c, rig.spine[rig.spine.length - 1].r * 0.85, rig.head.r * 0.7);
  ctx.fillStyle = PALETTE.cat; ctx.fill('nonzero');
  for (const L of rig.legs) if (near(L)) drawLeg(ctx, view, L, PALETTE.cat);
  // head
  ctx.beginPath();
  disc(ctx, view, rig.head.c, rig.head.r);
  disc(ctx, view, rig.muzzle.c, rig.muzzle.r);
  for (const tri of rig.ears) {
    let [a, b, c] = tri.map(q => view.p(q[0], q[1], q[2]));
    if ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) < 0) [b, c] = [c, b];
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.closePath();
  }
  ctx.fillStyle = PALETTE.cat; ctx.fill('nonzero');
  // eyes, only where they face the camera and are open
  for (const e of rig.eyes) {
    const toCam = [CAMERA.x - e.c[0], CAMERA.y - e.c[1], CAMERA.z - e.c[2]];
    const m = Math.hypot(...toCam), nm = Math.hypot(...e.n);
    const facing = (toCam[0] * e.n[0] + toCam[1] * e.n[1] + toCam[2] * e.n[2]) / (m * nm);
    if (facing < 0.12 || e.open < 0.08) continue;
    const p = view.p(e.c[0], e.c[1], e.c[2]);
    const rx = Math.max(0.6, 0.95 * p.s * (0.45 + 0.55 * facing)), ry = Math.max(0.3, 0.72 * p.s * e.open);
    ctx.beginPath(); ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.eye; ctx.fill();
    ctx.beginPath(); ctx.ellipse(p.x, p.y, Math.max(0.3, rx * 0.22), ry * 0.92, 0, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.cat; ctx.fill();
  }
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
const ITEM = Object.fromEntries(FURNITURE.map(f => [f.node, f]));

function catKey(cat, legEdge) {
  const nodes = legEdge ? [legEdge.from, legEdge.to] : [cat.node];
  let key = cat.pos[2] + 6;
  for (const n of nodes) if (ITEM[n]) key = Math.min(key, ITEM[n].z - 0.5);
  if (!legEdge && ITEM[cat.node]) key = ITEM[cat.node].z - 0.5;
  return key;
}

export function drawActors(ctx, view, cats, legEdges, rigs) {
  ctx.clearRect(0, 0, view.w, view.h);
  const list = FURNITURE.map(item => ({ key: item.z, item }));
  cats.forEach((cat, i) => list.push({ key: catKey(cat, legEdges[i]), cat, rig: rigs[i] }));
  list.sort((a, b) => b.key - a.key);
  for (const d of list) {
    if (d.item) drawItem(ctx, view, d.item);
    else { drawShadow(ctx, view, d.cat); drawCat(ctx, view, d.rig); }
  }
}

export { solveRig, pointInPoly };
