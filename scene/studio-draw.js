// scene/studio-draw.js — every mark scene 4 makes.
//
// THE ROOM IS DRAWN, NOT FILLED. Every mark in it goes through scene 3's brush
// (`brush` in beach-brush.js — one implementation, imported, never forked): a
// tapered stroke whose width swells along its length and whose ends lift, laid
// in two or three overlapping passes when it is long. Three kinds of mark, and
// nothing else:
//   a LINE      a brush stroke along a projected edge: window frames, sash bars,
//               the crown molding, the chair rail, the baseboard, the corners
//   a MASS      a solid fill whose every edge is also stroked in its own colour,
//               so the boundary is a brush edge and not a polygon's: the floor,
//               a wall's wash, each face of the furniture
//   a CUT       a stroke in the bare paper colour across a mass: the light on
//               the floorboards, the lit top edge of a piece of furniture
// Light areas are the paper left bare — the ceiling, the sky through the glass,
// the sill's top — never painted on.
//
// TWO PLANES. The ROOM never moves, so it is drawn once per resize onto the
// back canvas. The front canvas is cleared every frame and carries the
// furniture and the cats in one painter's order, because a cat on the sill
// sits BEHIND the table and a cat on the table sits IN FRONT of it. The
// furniture's brush marks are COMPUTED once per view (per resize) and replayed
// every frame as plain filled polygons, so a frame pays for fills and not for
// strokes. Every stroke is drawn off its own seeded stream, named by what it
// is, so a resize redraws the same marks and a frame never crawls.
//
// THE PALETTE IS ONE NAMED TABLE (`PALETTE`), and every mark names its colour
// by KEY. The furniture's replay resolves the key at draw time. Warm and tight:
// cream paper, honey oak, a high-key green beyond the glass, dark warm brown
// furniture. THE CATS ARE THE ONLY TRUE BLACKS: nothing else reaches that
// value, and the cats are never lightened to make up for it.

import { ROOM, FURNITURE, NODES, bayOffset, onSurface, pointInPoly } from './studio-room.js';
import { solveRig } from './studio-rig.js';
import { toeWorld } from './studio-cat.js';
import { CAMERA } from './studio-room.js';
import { brush, rng } from './beach-brush.js';

export const PALETTE = {
  paper: '#f4ecdb',       // bare paper: the ceiling, the sky, the sill's top, every cut
  wall: '#ece1c9',        // the side walls' wash — only enough to read as a surface
  wallFar: '#f0e6d1',     // the back wall and the bay's facets, nearer the paper still
  oak: '#c8935a',         // the floorboards: honey oak, the largest warm mass
  oakLine: '#a8743f',     // the board joints
  trim: '#86705a',        // drawn line: frames, sash bars, crown, rail, baseboard
  trimSoft: '#b7a68f',    // the quieter lines: corners, the crown's second line
  distance: '#ddd8c3',    // the buildings across the street, suggested
  greenPale: '#cfdfb6',   // beyond the glass: high-key, soft-edged
  green: '#aecb90',
  greenDeep: '#93b778',
  woodTop: '#604835', wood: '#4c392b', woodSide: '#413125',
  woodDarkTop: '#553f30', woodDark: '#433226', woodDarkSide: '#3a2b21',
  uphTop: '#6d5242', uph: '#584335', uphSide: '#4c392d',
  uphDarkTop: '#5c4637', uphDark: '#4b392c', uphDarkSide: '#413126',
  shadow: '74, 50, 30',   // a cat's shadow, as an rgb triple its alpha is set on
  cat: '#000000',    // one pure black ink: never lightened for contrast
  eye: '#ffffff',    // the face's marks: what carries a cat on dark furniture
};

/** A furniture part's three faces, by tone: [top, front, side]. */
const TONE = {
  wood: ['woodTop', 'wood', 'woodSide'],
  woodDark: ['woodDarkTop', 'woodDark', 'woodDarkSide'],
  uph: ['uphTop', 'uph', 'uphSide'],
  uphDark: ['uphDarkTop', 'uphDark', 'uphDarkSide'],
};

const colourOf = (key) => PALETTE[key] || key;

// A mark's own stream, named by what it is (FNV-1a over the name).
function streamFor(name) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) { h ^= name.charCodeAt(i); h = Math.imul(h, 16777619); }
  return rng(h >>> 0);
}

// --------------------------------------------------------------- the marks --
// The projected polyline, resampled evenly on screen: the brush's wobble and
// taper run over the INDEX, so the points have to be evenly spaced for a
// stroke to swell the same way at any length. Capped so a wall line running
// off the screen behind the viewer costs no more than one across it.
const MAX_STROKE_PTS = 480;
function resample(pts, step) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  const n = Math.max(6, Math.min(MAX_STROKE_PTS, Math.ceil(L / step) + 1));
  const xs = new Float64Array(n), ys = new Float64Array(n);
  let seg = 1, acc = 0, segL = pts.length > 1 ? Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) : 0;
  for (let k = 0; k < n; k++) {
    const want = L * k / (n - 1);
    while (seg < pts.length - 1 && acc + segL < want) {
      acc += segL; seg++;
      segL = Math.hypot(pts[seg].x - pts[seg - 1].x, pts[seg].y - pts[seg - 1].y);
    }
    const t = segL > 1e-9 ? Math.min(1, Math.max(0, (want - acc) / segL)) : 0;
    const a = pts[seg - 1] || pts[0], b = pts[seg] || pts[0];
    xs[k] = a.x + (b.x - a.x) * t; ys[k] = a.y + (b.y - a.y) * t;
  }
  return { xs, ys, n, L };
}

/** A LINE: a brush stroke along a world polyline, `width` in px. */
function strokeLine(ctx, view, pts3, width, colour, name, { passes = true, vary = 0.42, gate = null } = {}) {
  const pts = pts3.map(q => view.p(q[0], q[1], q[2]));
  const { xs, ys, n, L } = resample(pts, 3);
  if (L < 2) return;
  let g = null;
  if (gate) { g = new Float64Array(n); for (let i = 0; i < n; i++) g[i] = gate(i / (n - 1)); }
  brush(ctx, xs, ys, width, streamFor(name), { n, colour, passes, vary, gate: g });
}

/** A MASS: a solid fill whose every edge is a brush edge in the same colour. */
function mass(ctx, pts2, colour, name, edge) {
  ctx.beginPath();
  pts2.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
  if (!(edge > 0)) return;
  for (let i = 0; i < pts2.length; i++) {
    const a = pts2[i], b = pts2[(i + 1) % pts2.length];
    const { xs, ys, n, L } = resample([a, b], 3);
    if (L < 4) continue;
    brush(ctx, xs, ys, edge, streamFor(`${name}:${i}`), { n, colour, passes: false, vary: 0.6 });
  }
}
const proj = (view, pts3) => pts3.map(q => view.p(q[0], q[1], q[2]));

// --------------------------------------------------------------- the room --
export function drawRoom(ctx, view) {
  const { halfW: X, backZ: B, ceilY: CY, bay } = ROOM;
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(0, 0, view.w, view.h);
  const Z0 = -40;   // the room runs out behind the viewer
  const at = (z) => view.scaleAt(z);   // px per cm at a depth
  const wB = at(B);

  // THE WALLS: a wash, barely off the paper. The ceiling is the paper itself.
  mass(ctx, proj(view, [[-X, 0, Z0], [-X, 0, B], [-X, CY, B], [-X, CY, Z0]]), PALETTE.wall, 'wallL', 3);
  mass(ctx, proj(view, [[X, 0, Z0], [X, 0, B], [X, CY, B], [X, CY, Z0]]), PALETTE.wall, 'wallR', 3);
  mass(ctx, proj(view, [[-X, 0, B], [bay[0][0], 0, B], [bay[0][0], CY, B], [-X, CY, B]]), PALETTE.wallFar, 'backL', 2);
  mass(ctx, proj(view, [[bay[3][0], 0, B], [X, 0, B], [X, CY, B], [bay[3][0], CY, B]]), PALETTE.wallFar, 'backR', 2);
  for (let i = 0; i < 3; i++) {
    const a = bay[i], b = bay[i + 1];
    mass(ctx, proj(view, [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], CY, b[1]], [a[0], CY, a[1]]]), i === 1 ? PALETTE.wallFar : PALETTE.wall, `bay${i}`, 2);
  }

  // THE FLOOR: the largest warm mass, its joints brushed in and the window's
  // light cut out of it as bare paper.
  const floorPts = [[-X, Z0], [X, Z0], [X, B], ...bay.slice().reverse(), [-X, B]];
  mass(ctx, proj(view, floorPts.map(([x, z]) => [x, 0, z])), PALETTE.oak, 'floor', 3);
  drawFloorboards(ctx, view);

  // THE GLASS: what is beyond it, then the frames over it as drawn line
  const glass = [];
  for (let i = 0; i < 3; i++) {
    const a = bay[i], b = bay[i + 1];
    const inset = 7;
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
    glass.push({ p0: [a[0] + ux * inset, a[1] + uz * inset], p1: [b[0] - ux * inset, b[1] - uz * inset], y0: ROOM.sillY + 3, y1: ROOM.windowTop });
  }
  drawBeyond(ctx, view, glass);
  glass.forEach(({ p0, p1, y0, y1 }, i) => {
    const w = Math.max(1.4, at(p0[1]) * 2.6);
    const P = (x, y, z) => [x, y, z];
    const corners = [P(p0[0], y0, p0[1]), P(p1[0], y0, p1[1]), P(p1[0], y1, p1[1]), P(p0[0], y1, p0[1])];
    // the frame, one stroke a side (a brush lifts at a corner, as a hand does)
    for (let k = 0; k < 4; k++) strokeLine(ctx, view, [corners[k], corners[(k + 1) % 4]], w * 1.25, PALETTE.trim, `frame${i}:${k}`, { passes: false });
    // the transom and the sash bars
    const yT = y0 + (y1 - y0) * 0.68;
    strokeLine(ctx, view, [P(p0[0], yT, p0[1]), P(p1[0], yT, p1[1])], w * 0.9, PALETTE.trim, `transom${i}`, { passes: false });
    const bars = i === 1 ? 3 : 1;
    for (let k = 1; k <= bars; k++) {
      const f = k / (bars + 1);
      const q = [p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f];
      strokeLine(ctx, view, [P(q[0], y0, q[1]), P(q[0], y1, q[1])], w * 0.9, PALETTE.trim, `bar${i}:${k}`, { passes: false });
    }
  });

  // THE WAINSCOT, AS LINE: the chair rail (a rail and its lower edge) and the
  // baseboard's top, along every wall and facet
  const run = (y) => [
    [[-X, y, Z0], [-X, y, B], [bay[0][0], y, B]],
    bay.map(([x, z]) => [x, y, z]),
    [[X, y, Z0], [X, y, B], [bay[3][0], y, B]],
  ];
  run(ROOM.wainscotY).forEach((pts, k) => strokeLine(ctx, view, pts, Math.max(1.4, wB * 2.4), PALETTE.trim, `rail${k}`));
  run(ROOM.wainscotY - 4).forEach((pts, k) => strokeLine(ctx, view, pts, Math.max(0.9, wB * 1.1), PALETTE.trimSoft, `railLow${k}`));
  run(9).forEach((pts, k) => strokeLine(ctx, view, pts, Math.max(1.2, wB * 1.8), PALETTE.trim, `base${k}`));

  // THE SILL: its top is bare paper; the nosing, the apron's foot and its
  // ends are drawn. Its front edge is the glass line offset into the room by
  // the sill's depth; on the two side facets that edge is CUT where it meets
  // the back wall's plane (not clamped onto it, which slid its ends sideways
  // and left the ledge stopping short of the wall)
  const inner = bayOffset(ROOM.sillDepth);
  const meetWall = (p, q) => { const t = (B - p[1]) / (q[1] - p[1]); return [p[0] + (q[0] - p[0]) * t, B]; };
  const front = [meetWall(inner[0], inner[1]), inner[1], inner[2], meetWall(inner[3], inner[2])];
  const sy = ROOM.sillY, ay = ROOM.sillY - ROOM.sillApron;
  // the sill top and its apron are the paper, painted over the wall's wash
  mass(ctx, proj(view, [...bay.map(([x, z]) => [x, sy, z]), ...front.slice().reverse().map(([x, z]) => [x, sy, z])]), PALETTE.paper, 'sillTop', 0);
  for (let i = 0; i < 3; i++) {
    const a = front[i], b = front[i + 1];
    mass(ctx, proj(view, [[a[0], sy, a[1]], [b[0], sy, b[1]], [b[0], ay, b[1]], [a[0], ay, a[1]]]), PALETTE.paper, `apron${i}`, 0);
  }
  strokeLine(ctx, view, front.map(([x, z]) => [x, sy, z]), Math.max(1.4, wB * 2.2), PALETTE.trim, 'nosing');
  strokeLine(ctx, view, front.map(([x, z]) => [x, ay, z]), Math.max(1, wB * 1.4), PALETTE.trim, 'apronFoot');
  strokeLine(ctx, view, bay.map(([x, z]) => [x, sy + 0.5, z]), Math.max(0.8, wB * 0.9), PALETTE.trimSoft, 'sillBack');
  for (const k of [0, 3]) strokeLine(ctx, view, [[front[k][0], sy, front[k][1]], [front[k][0], ay, front[k][1]]], Math.max(1, wB * 1.2), PALETTE.trim, `apronEnd${k}`, { passes: false });

  // THE CROWN MOLDING, AS LINE: its foot and a quieter line above it
  const crown = [[[-X, Z0], [-X, B], [bay[0][0], B]], bay, [[X, Z0], [X, B], [bay[3][0], B]]];
  crown.forEach((pts, k) => {
    strokeLine(ctx, view, pts.map(([x, z]) => [x, ROOM.crownY, z]), Math.max(1.4, wB * 2.2), PALETTE.trim, `crown${k}`);
    strokeLine(ctx, view, pts.map(([x, z]) => [x, ROOM.crownY + 7, z]), Math.max(0.9, wB * 1.1), PALETTE.trimSoft, `crownUp${k}`);
    strokeLine(ctx, view, pts.map(([x, z]) => [x, CY, z]), Math.max(0.9, wB * 1.2), PALETTE.trimSoft, `ceil${k}`);
  });

  // THE CORNERS: the bay's, and where the side walls meet the back
  for (const [x, z] of bay) strokeLine(ctx, view, [[x, 0, z], [x, CY, z]], Math.max(0.8, wB), PALETTE.trimSoft, `corner${x}`);
  strokeLine(ctx, view, [[-X, 0, B], [-X, CY, B]], Math.max(0.8, wB), PALETTE.trimSoft, 'cornerL');
  strokeLine(ctx, view, [[X, 0, B], [X, CY, B]], Math.max(0.8, wB), PALETTE.trimSoft, 'cornerR');
}

// BEYOND THE GLASS: a street's far side, suggested — a high-key green of trees
// and hedges in front of a few pale blocks with no detail in them, the sky the
// paper. Everything is laid on one plane far behind the bay and projected, so
// the three facets look onto one street and it moves with the viewport's crop
// as the room does. Soft edges are radial and vertical gradients, which any
// canvas draws (a blur filter is not one of those).
const BEYOND_Z = 1100;
function drawBeyond(ctx, view, glass) {
  ctx.save();
  ctx.beginPath();
  for (const { p0, p1, y0, y1 } of glass) {
    [[p0[0], y0, p0[1]], [p1[0], y0, p1[1]], [p1[0], y1, p1[1]], [p0[0], y1, p0[1]]].forEach((q, k) => {
      const p = view.p(q[0], q[1], q[2]);
      if (k) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y);
    });
    ctx.closePath();
  }
  ctx.clip();
  const r = streamFor('beyond');
  const s = view.scaleAt(BEYOND_Z);
  const at = (x, y) => view.p(x, y, BEYOND_Z);
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)].join(',');
  // the blocks across the street: pale, flat-topped, fading out at the top
  for (let k = 0; k < 7; k++) {
    const cx = -900 + k * 290 + (r() - 0.5) * 120, hw = 90 + r() * 70, top = 230 + r() * 110;
    const a = at(cx - hw, top), b = at(cx + hw, 0);
    const g = ctx.createLinearGradient(0, a.y, 0, a.y + 60 * s);
    g.addColorStop(0, `rgba(${hex(PALETTE.distance)},0)`);
    g.addColorStop(1, `rgba(${hex(PALETTE.distance)},1)`);
    ctx.fillStyle = g;
    ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
  }
  // soft green: crowns of trees and a hedge line, each a cloud of soft discs
  const blob = (x, y, rad, key, alpha) => {
    const p = at(x, y), R = rad * s;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
    g.addColorStop(0, `rgba(${hex(PALETTE[key])},${alpha})`);
    g.addColorStop(0.55, `rgba(${hex(PALETTE[key])},${alpha * 0.7})`);
    g.addColorStop(1, `rgba(${hex(PALETTE[key])},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.fill();
  };
  for (let k = 0; k < 11; k++) {
    const cx = -950 + k * 190 + (r() - 0.5) * 110, cy = 150 + r() * 90, size = 75 + r() * 55;
    for (let j = 0; j < 9; j++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * size * 0.75;
      blob(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, size * (0.45 + r() * 0.35), j % 3 === 0 ? 'greenPale' : 'green', 0.75);
    }
    blob(cx + (r() - 0.5) * size * 0.4, cy - size * 0.35, size * 0.45, 'greenDeep', 0.5);
  }
  for (let k = 0; k < 26; k++) blob(-1000 + k * 80 + (r() - 0.5) * 30, 40 + r() * 30, 70 + r() * 30, k % 2 ? 'green' : 'greenDeep', 0.7);
  ctx.restore();
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
    lines.push({ d, pts: pts.filter(p => p[2] > -40) });
  }
  boardCache = lines;
  return lines;
}
// The joints as brush lines, broken here and there; and the window's light,
// cut from the oak as bare paper between the joints in front of the bay —
// strongest nearest the glass, gone well before the middle of the room.
function drawFloorboards(ctx, view) {
  const lines = boardLines();
  lines.forEach(({ d, pts }, k) => {
    if (pts.length < 2) return;
    const mid = pts[pts.length >> 1];
    const w = Math.max(0.7, Math.min(1.8, view.scaleAt(mid[2]) * 0.4));
    const r = streamFor(`joint${k}`);
    const gaps = [r(), r(), r()].map(v => 0.08 + v * 0.84);
    strokeLine(ctx, view, pts, w, PALETTE.oakLine, `joint${k}`, {
      gate: (t) => (gaps.some(g => Math.abs(t - g) < 0.03) ? 0 : 1),
    });
    // the sheen: here and there a board catches the window, cut back to the
    // paper along part of its length — sparse, and none under the table
    if (k === 0 || d < 70 || d > 300 || r() > 0.3) return;
    const prev = lines[k - 1].pts;
    const between = pts.map((p, i) => {
      const q = prev[Math.min(prev.length - 1, Math.round(i * (prev.length - 1) / (pts.length - 1)))];
      return [p[0], 0, (p[2] + q[2]) / 2];
    });
    const c = 0.15 + r() * 0.7, h = 0.06 + r() * 0.1;
    strokeLine(ctx, view, between, Math.max(0.7, view.scaleAt(mid[2]) * 0.8), PALETTE.paper, `sheen${k}`, {
      vary: 0.5, gate: (t) => (Math.abs(t - c) < h ? 1 : 0),
    });
  });
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

// A RECORDING CONTEXT: just what `brush` and `mass` ask a canvas to do, kept as
// filled polygons. The colour is recorded as the PALETTE key it was asked for.
function recorder() {
  const marks = [];
  let fill = null, cur = null, path = [];
  return {
    marks,
    set fillStyle(v) { fill = v; }, get fillStyle() { return fill; },
    beginPath() { path = []; cur = null; },
    moveTo(x, y) { cur = [x, y]; path.push(cur); },
    lineTo(x, y) { cur.push(x, y); },
    closePath() {},
    fill() { for (const sp of path) if (sp.length >= 6) marks.push({ key: fill, pts: Float32Array.from(sp) }); },
  };
}

// A top another part sits on is not a top that catches the light: the chaise's
// frame under its cushion, its base under the frame.
const COVERED = new Set();
for (const item of FURNITURE) for (const a of item.parts) for (const b of item.parts) {
  if (a === b || a.kind !== 'box' || b.kind !== 'box' || b.y0 !== a.y1) continue;
  const over = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  if (over > 0.6 * (a.x1 - a.x0) && b.z0 <= a.z0 + 2 && b.z1 > a.z0) COVERED.add(a);
}

// ONE PART'S MARKS: its faces as masses (top lightest, front, then the side),
// each edge a brush edge, and — where its top shows and is big enough to hold
// one — the top's near edge cut back to the paper, the light catching it.
function partMarks(view, part) {
  const rec = recorder();
  const [top, front, side] = TONE[part.tone] || TONE.wood;
  const id = `${part.kind}:${part.x0 ?? part.x}:${part.z0 ?? part.z}:${part.y0}:${part.y1}`;
  const e = (z) => Math.max(1.2, Math.min(3.2, view.scaleAt(z) * 0.5));
  if (part.kind === 'box') {
    const { x0, x1, y0, y1, z0, z1 } = part;
    if (x0 > CAMERA.x) mass(rec, proj(view, [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]]), side, `${id}:l`, e(z0));
    if (x1 < CAMERA.x) mass(rec, proj(view, [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]]), side, `${id}:r`, e(z0));
    mass(rec, proj(view, [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]]), front, `${id}:f`, e(z0));
    if (y1 < CAMERA.y) {
      mass(rec, proj(view, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]), top, `${id}:t`, e(z0));
      if (x1 - x0 > 6 && z1 - z0 > 6 && !COVERED.has(part)) {
        strokeLine(rec, view, [[x0 + 1, y1, z0], [x1 - 1, y1, z0]], Math.max(1, view.scaleAt(z0) * 0.7), 'paper', `${id}:cut`,
          { gate: (t) => (t > 0.12 && t < 0.62 ? 1 : 0) });
      }
    }
  } else if (part.kind === 'cyl') {
    const ring = (y) => Array.from({ length: 36 }, (_, i) => {
      const a = i / 36 * Math.PI * 2;
      return view.p(part.x + part.r * Math.cos(a), y, part.z + part.r * Math.sin(a));
    });
    mass(rec, hull([...ring(part.y0), ...ring(part.y1)]), front, `${id}:s`, e(part.z));
    mass(rec, ring(part.y1), top, `${id}:t`, e(part.z));
    if (part.r > 6 && part.y1 < CAMERA.y) {
      // the near rim of a top: the front half of its circle, as a cut
      const arc = Array.from({ length: 13 }, (_, i) => {
        const a = Math.PI * (1.2 + i / 12 * 0.75);
        return [part.x + part.r * 0.96 * Math.cos(a), part.y1, part.z + part.r * 0.96 * Math.sin(a)];
      });
      strokeLine(rec, view, arc, Math.max(1, view.scaleAt(part.z) * 0.7), 'paper', `${id}:cut`, { passes: false });
    }
  }
  return rec.marks;
}

// The marks are computed once per view — a resize makes a new one — and kept
// beside it; a frame replays them.
const marksByView = new WeakMap();
function drawPart(ctx, view, part) {
  let byPart = marksByView.get(view);
  if (!byPart) { byPart = new Map(); marksByView.set(view, byPart); }
  let marks = byPart.get(part);
  if (!marks) { marks = partMarks(view, part); byPart.set(part, marks); }
  for (const m of marks) {
    const P = m.pts;
    ctx.beginPath();
    ctx.moveTo(P[0], P[1]);
    for (let i = 2; i < P.length; i += 2) ctx.lineTo(P[i], P[i + 1]);
    ctx.closePath();
    ctx.fillStyle = colourOf(m.key);
    ctx.fill();
  }
}

const camDist = (x, y, z) => Math.hypot(x - CAMERA.x, y - CAMERA.y, z - CAMERA.z);
function partCentre(p) {
  if (p.kind === 'box') return [(p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2, (p.z0 + p.z1) / 2];
  return [p.x, (p.y0 + p.y1) / 2, p.z];
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
  ctx.fillStyle = `rgba(${PALETTE.shadow}, ${0.16 * k})`;
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
