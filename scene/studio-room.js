// scene/studio-room.js — SCENE 4's room: the camera, the furniture list and the
// perch graph. DOM-free, so the gate runs every rule in Node.
//
// THE ROOM IS A PLACEHOLDER AND IS BUILT TO BE ONE. Flat blocked-in shapes at
// the right places and the right scale, a single neutral daylight, no lighting
// model. Everything is in CENTIMETRES in one world frame:
//
//   x  left (-) to right (+), 0 on the room's centre line
//   y  up, 0 on the floor
//   z  depth, 0 at the front of the room, growing AWAY from the viewer;
//      the back wall is at z = BACK_Z and the bay pushes out past it.
//
// ONE PROJECTION, OWNED HERE. A plain pinhole camera on the centre line, looking
// down +z: screen x = cx + F (x - camX)/(z - camZ), screen y = horizon -
// F (y - camY)/(z - camZ). Every mark — the room, the furniture, the cats, the
// dev overlay and the click hit-test — goes through `view.p`, so a cat's paw
// drawn on a sill is on the sill that was drawn.
//
// THE FURNITURE LIST IS DATA. Each item is a list of primitive parts (box,
// cylinder, disk) and the drawing walks the list; adding a piece of furniture
// is a row here, never a new draw call. The PERCH GRAPH is data too: nodes are
// walkable surfaces with an extent, a height and a facing, and edges are typed
// traversals with a declared rise and run. A cat reaches a surface by walking
// edges and in no other way — see studio-cats.js.

export const ROOM = {
  halfW: 210,          // side walls at x = +/-210
  backZ: 380,          // the back wall plane
  ceilY: 270,
  // THE BAY, left to right, as the window line the glass sits on. The two
  // side facets meet the back wall at the opening's corners.
  bay: [[-175, 380], [-100, 455], [100, 455], [175, 380]],
  sillY: 76,           // the sill's walkable top
  sillDepth: 30,       // how far the sill reaches in from the glass
  sillApron: 7,        // the face under its front edge
  windowTop: 238,
  crownY: 254,         // the crown molding band runs crownY..ceilY
  wainscotY: 70,       // the chair rail under the windows
};

export const CAMERA = { x: 0, y: 118, z: -300 };

// The composition is designed at 16:10 and COVERS the viewport (it bleeds off
// the short side rather than letterboxing), so a phone in portrait sees the
// middle of the room and a wide monitor sees all of it.
const DESIGN_ASPECT = 1.6;

export function createView(w, h) {
  const designW = Math.max(w, h * DESIGN_ASPECT);
  const designH = designW / DESIGN_ASPECT;
  const F = designW * 1.12;
  const cx = w / 2;
  const horizon = h / 2 - designH * 0.03;
  const view = {
    w, h, F, cx, horizon,
    // world -> screen; s is pixels per centimetre at that depth.
    p(x, y, z) {
      const d = Math.max(1, z - CAMERA.z);
      const s = F / d;
      return { x: cx + (x - CAMERA.x) * s, y: horizon - (y - CAMERA.y) * s, s };
    },
    scaleAt(z) { return F / Math.max(1, z - CAMERA.z); },
  };
  return view;
}

// ---------------------------------------------------------------- geometry --
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = (v) => Math.hypot(v[0], v[1]);
const norm = (v) => { const l = len(v) || 1; return [v[0] / l, v[1] / l]; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
// The inward normal of a left-to-right bay segment: into the room.
const inward = (d) => [d[1], -d[0]];

/** The bay polyline offset inward by `off`, mitred at the joints. */
export function bayOffset(off) {
  const P = ROOM.bay;
  const segN = [];
  for (let i = 0; i < P.length - 1; i++) segN.push(inward(norm(sub(P[i + 1], P[i]))));
  return P.map((p, i) => {
    if (i === 0) return [p[0] + segN[0][0] * off, p[1] + segN[0][1] * off];
    if (i === P.length - 1) { const n = segN[i - 1]; return [p[0] + n[0] * off, p[1] + n[1] * off]; }
    const a = segN[i - 1], b = segN[i];
    const m = norm([a[0] + b[0], a[1] + b[1]]);
    const k = off / Math.max(0.2, dot(m, a));
    return [p[0] + m[0] * k, p[1] + m[1] * k];
  });
}

/** Distance from a point to the bay's glass line, and where along it. */
export function bayProject(x, z) {
  const P = ROOM.bay;
  let best = { d: Infinity, s: 0, seg: 0, t: 0 };
  let acc = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1];
    const ab = sub(b, a), L = len(ab);
    const t = Math.max(0, Math.min(1, dot(sub([x, z], a), ab) / (L * L)));
    const q = [a[0] + ab[0] * t, a[1] + ab[1] * t];
    const d = len(sub([x, z], q));
    if (d < best.d) best = { d, s: acc + t * L, seg: i, t };
    acc += L;
  }
  return best;
}

export function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

// ---------------------------------------------------------------- furniture --
// One row per piece. A part is one of:
//   { kind:'box',  x0,x1, y0,y1, z0,z1, tone }
//   { kind:'cyl',  x,z, r, y0,y1, tone }          a vertical cylinder
// `tone` names a flat fill from the palette in studio-draw.js. `node` names the
// perch the piece carries, so a cat standing on it is drawn after it.
export const FURNITURE = [
  {
    id: 'table', node: 'table', z: 388,
    parts: [
      { kind: 'cyl', x: 0, z: 388, r: 16, y0: 0, y1: 2.5, tone: 'woodDark' },
      { kind: 'cyl', x: 0, z: 388, r: 3.6, y0: 2.5, y1: 69, tone: 'woodDark' },
      { kind: 'cyl', x: 0, z: 388, r: 27, y0: 69, y1: 72, tone: 'wood' },
    ],
  },
  chair('chairL', -64, 392, -1),
  chair('chairR', 64, 392, +1),
  {
    id: 'chaise', node: 'chaise', z: 281,
    parts: [
      { kind: 'box', x0: 150, x1: 206, y0: 0, y1: 4, z0: 190, z1: 372, tone: 'woodDark' },
      { kind: 'box', x0: 150, x1: 206, y0: 4, y1: 32, z0: 190, z1: 372, tone: 'uphDark' },
      { kind: 'box', x0: 151, x1: 205, y0: 32, y1: 40, z0: 206, z1: 371, tone: 'uph' },
      // the raised end, toward the front of the room
      { kind: 'box', x0: 151, x1: 205, y0: 32, y1: 63, z0: 191, z1: 206, tone: 'uph' },
      // the low back along the wall
      { kind: 'box', x0: 198, x1: 206, y0: 40, y1: 52, z0: 206, z1: 372, tone: 'uphDark' },
    ],
  },
];

// A chair at (cx, cz) facing the table: `side` -1 sits on the table's left, so
// its back is on its own left (-x) side.
function chair(id, cx, cz, side) {
  const h = 20, seatTop = 46;
  const backX0 = side < 0 ? cx - h : cx + h - 4;
  const legs = [];
  for (const dx of [-h + 2, h - 4]) for (const dz of [-h + 2, h - 4]) {
    legs.push({ kind: 'box', x0: cx + dx, x1: cx + dx + 2.2, y0: 0, y1: seatTop - 4, z0: cz + dz, z1: cz + dz + 2.2, tone: 'woodDark' });
  }
  return {
    id, node: id, z: cz,
    parts: [
      ...legs,
      { kind: 'box', x0: cx - h, x1: cx + h, y0: seatTop - 4, y1: seatTop, z0: cz - h, z1: cz + h, tone: 'wood' },
      { kind: 'box', x0: backX0, x1: backX0 + 4, y0: seatTop, y1: 90, z0: cz - h + 2, z1: cz + h - 2, tone: 'wood' },
    ],
  };
}

// ---------------------------------------------------------------- the graph --
// A node's `area` is where the cat's ROOT (the ground point under its body
// centre) may stand, already inset from the surface edge so paws stay on it.
// Kinds:
//   rect   { x0,x1, z0,z1 }
//   disk   { x, z, r }
//   ledge  { path:[[x,z],...] }   a centreline the root walks along
//   poly   { pts:[[x,z],...] }    the floor
// `facing` is the heading (radians, atan2(dz, dx)) a cat settles toward when
// nothing else decides it; null means "keep whatever it arrived with".
// `comfy` marks a surface a cat will fall asleep on.

const SILL_LINE = bayOffset(15);

export const NODES = {
  floor: {
    id: 'floor', y: 0, comfy: false, facing: null,
    area: { kind: 'poly', pts: [[-196, 24], [196, 24], [196, 160], [140, 160], [140, 366], [92, 438], [-92, 438], [-160, 366], [-196, 366]] },
    // somewhere not under the table or a chair to settle on
    avoid: [{ x0: -90, x1: 90, z0: 352, z1: 440 }],
  },
  chairL: { id: 'chairL', y: 46, comfy: true, facing: -Math.PI / 2, area: { kind: 'rect', x0: -76, x1: -52, z0: 382, z1: 402 } },
  chairR: { id: 'chairR', y: 46, comfy: true, facing: -Math.PI / 2, area: { kind: 'rect', x0: 52, x1: 76, z0: 382, z1: 402 } },
  table: { id: 'table', y: 72, comfy: false, facing: null, area: { kind: 'disk', x: 0, z: 388, r: 12 } },
  chaise: { id: 'chaise', y: 40, comfy: true, facing: Math.PI, area: { kind: 'rect', x0: 162, x1: 192, z0: 228, z1: 352 } },
  sill: { id: 'sill', y: ROOM.sillY, comfy: true, facing: null, area: { kind: 'ledge', path: SILL_LINE, ends: 22 } },
};

// EDGES. `launch` is where the root stands to go (null for the floor: derived
// from the standoff law at route time), `land` is where the FOREPAWS come down.
// rise and run are DERIVED from those and declared alongside, so a row cannot
// say one thing and do another — the gate re-derives both.
//   up      a gathered jump
//   down    a step-off and drop
//   across  a near-level step over a gap: the forepaws step onto the far
//           side and the hind paws follow onto the near edge; the settle
//           walks them the rest of the way on
//
// The standoff law: launched from the floor, the forepaws gather STANDOFF_K x
// rise short of the target's near edge, so a high jump is taken from further
// back. Off furniture the source's own edge decides the standoff.
export const STANDOFF_K = 0.42;
export const FORE_TOE_U = 12;   // forepaws ahead of the root, standing
export const HIND_TOE_U = -12;
export const BODY_SPAN = FORE_TOE_U - HIND_TOE_U;

const E = (id, from, to, type, launch, land, aim) => ({ id, from, to, type, launch, land, aim: aim || null });

const RAW_EDGES = [
  // floor <-> chairs, taken diagonally over the seat's open corner (a jump
  // straight into the room's depth reads as a column from behind)
  E('floor>chairL', 'floor', 'chairL', 'up', null, [-70, 396], { edge: [-44, 373.1] }),
  E('chairL>floor', 'chairL', 'floor', 'down', [-62, 395], [-24.5, 362]),
  E('floor>chairR', 'floor', 'chairR', 'up', null, [70, 396], { edge: [44, 373.1] }),
  E('chairR>floor', 'chairR', 'floor', 'down', [62, 395], [24.5, 362]),
  // chairs <-> table, across the short gap
  E('chairL>table', 'chairL', 'table', 'up', [-56, 392], [2, 392]),
  E('table>chairL', 'table', 'chairL', 'down', [-10, 392], [-70, 392]),
  E('chairR>table', 'chairR', 'table', 'up', [56, 392], [-2, 392]),
  E('table>chairR', 'table', 'chairR', 'down', [10, 392], [70, 392]),
  // chairs <-> sill, the centre facet, taken obliquely so the body fits on it
  E('chairL>sill', 'chairL', 'sill', 'up', [-62, 398], [-40.6, 450]),
  E('sill>chairL', 'sill', 'chairL', 'down', [-42, 438], [-63.4, 386]),
  E('chairR>sill', 'chairR', 'sill', 'up', [62, 398], [40.6, 450]),
  E('sill>chairR', 'sill', 'chairR', 'down', [42, 438], [63.4, 386]),
  // table <-> sill, nearly level
  E('table>sill', 'table', 'sill', 'across', [0, 401], [0, 432]),
  E('sill>table', 'sill', 'table', 'across', [0, 438], [0, 404]),
  // a straight drop off the table
  E('table>floor', 'table', 'floor', 'down', [6, 397], [-27, 353]),
  // floor <-> chaise, from its open side
  E('floor>chaise', 'floor', 'chaise', 'up', null, [186, 280], { edge: [152, 280] }),
  E('chaise>floor', 'chaise', 'floor', 'down', [166, 300], [120, 300]),
  // chaise <-> sill, the right facet
  E('chaise>sill', 'chaise', 'sill', 'up', [166, 352], [126.9, 406.9]),
  E('sill>chaise', 'sill', 'chaise', 'down', [128, 405], [171.5, 343.9]),
  // floor <-> sill directly, the left facet: legal, high, and dispreferred
  E('floor>sill', 'floor', 'sill', 'up', null, [-130.4, 410.4], { edge: [-137.6, 382.5] }),
  E('sill>floor', 'sill', 'floor', 'down', [-128, 398], [-138, 352]),
];

/** The floor's launch spot for an edge, from the standoff law. */
export function standoffLaunch(edge, k = STANDOFF_K) {
  const rise = NODES[edge.to].y - NODES[edge.from].y;
  const [ex, ez] = edge.aim.edge;
  const d = norm(sub(edge.land, edge.aim.edge));
  const back = k * rise + FORE_TOE_U;
  return [ex - d[0] * back, ez - d[1] * back];
}

export const EDGES = RAW_EDGES.map((e) => {
  const launch = e.launch || standoffLaunch(e);
  const d = sub(e.land, launch);
  const rise = NODES[e.to].y - NODES[e.from].y;
  return {
    ...e,
    launch,
    heading: Math.atan2(d[1], d[0]),
    rise,
    run: len(d),
    kind: e.type,
  };
});

export const edgeById = (id) => EDGES.find(e => e.id === id) || null;

// ------------------------------------------------------------ node helpers --
export function ledgeLength(path) {
  let L = 0;
  for (let i = 0; i < path.length - 1; i++) L += len(sub(path[i + 1], path[i]));
  return L;
}

export function ledgeAt(path, s) {
  let acc = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const L = len(sub(path[i + 1], path[i]));
    if (s <= acc + L || i === path.length - 2) {
      const t = Math.max(0, Math.min(1, (s - acc) / L));
      const a = path[i], b = path[i + 1];
      return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, heading: Math.atan2(b[1] - a[1], b[0] - a[0]) };
    }
    acc += L;
  }
  const p = path[path.length - 1];
  return { x: p[0], z: p[1], heading: 0 };
}

export function ledgeProject(path, x, z) {
  let best = { d: Infinity, s: 0 }, acc = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1], ab = sub(b, a), L = len(ab);
    const t = Math.max(0, Math.min(1, dot(sub([x, z], a), ab) / (L * L)));
    const d = Math.hypot(x - (a[0] + ab[0] * t), z - (a[1] + ab[1] * t));
    if (d < best.d) best = { d, s: acc + t * L };
    acc += L;
  }
  return best;
}

/** Is (x, z) somewhere the cat's root may stand on this node? */
export function rootAllowed(nodeId, x, z, slack = 0) {
  const n = NODES[nodeId], a = n.area;
  switch (a.kind) {
    case 'rect': return x >= a.x0 - slack && x <= a.x1 + slack && z >= a.z0 - slack && z <= a.z1 + slack;
    case 'disk': return Math.hypot(x - a.x, z - a.z) <= a.r + slack;
    case 'ledge': {
      const pr = ledgeProject(a.path, x, z);
      const L = ledgeLength(a.path);
      return pr.d <= 8 + slack && pr.s >= a.ends - 4 - slack && pr.s <= L - a.ends + 4 + slack;
    }
    case 'poly': return pointInPoly(x, z, a.pts);
    default: return false;
  }
}

/** Is (x, z) on the SURFACE itself (where a paw may rest)? Looser than root. */
export function onSurface(nodeId, x, z) {
  switch (nodeId) {
    case 'floor': return pointInPoly(x, z, NODES.floor.area.pts) || (x > -205 && x < 205 && z > 0 && z < 372);
    case 'chairL': return x >= -84 && x <= -44 && z >= 372 && z <= 412;
    case 'chairR': return x >= 44 && x <= 84 && z >= 372 && z <= 412;
    case 'table': return Math.hypot(x, z - 388) <= 27;
    case 'chaise': return x >= 151 && x <= 205 && z >= 206 && z <= 371;
    case 'sill': {
      const b = bayProject(x, z);
      // inside the bay, within sillDepth of the glass, in front of the back wall plane
      return b.d <= ROOM.sillDepth && z >= ROOM.backZ && Math.abs(x) <= 175;
    }
    default: return false;
  }
}

/** A rest spot on a node near (x, z), with the heading a cat would settle to. */
export function restSpot(nodeId, x, z, heading) {
  const n = NODES[nodeId], a = n.area;
  if (a.kind === 'ledge') {
    const L = ledgeLength(a.path);
    const pr = ledgeProject(a.path, x, z);
    const s = Math.max(a.ends, Math.min(L - a.ends, pr.s));
    const q = ledgeAt(a.path, s);
    // along the ledge, whichever way the cat is already more nearly facing
    const h = Math.cos(heading - q.heading) >= 0 ? q.heading : q.heading + Math.PI;
    return { x: q.x, z: q.z, heading: h, s };
  }
  if (a.kind === 'rect') {
    return { x: Math.max(a.x0, Math.min(a.x1, x)), z: Math.max(a.z0, Math.min(a.z1, z)), heading };
  }
  if (a.kind === 'disk') {
    const d = Math.hypot(x - a.x, z - a.z);
    const k = d > a.r ? a.r / d : 1;
    return { x: a.x + (x - a.x) * k, z: a.z + (z - a.z) * k, heading };
  }
  // floor: stay where you are unless that is under the furniture
  for (const b of n.avoid || []) {
    if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return { x, z: b.z0 - 6, heading };
  }
  return { x, z, heading };
}

/** A path for the root across one node, from a point to a point. */
export function nodePath(nodeId, from, to) {
  const a = NODES[nodeId].area;
  if (a.kind !== 'ledge') return [from, to];
  const p0 = ledgeProject(a.path, from[0], from[1]);
  const p1 = ledgeProject(a.path, to[0], to[1]);
  const pts = [from];
  const n = Math.max(2, Math.ceil(Math.abs(p1.s - p0.s) / 8));
  for (let i = 1; i < n; i++) {
    const q = ledgeAt(a.path, p0.s + (p1.s - p0.s) * i / n);
    pts.push([q.x, q.z]);
  }
  pts.push(to);
  return pts;
}

// ------------------------------------------------------------ route finding --
// Dijkstra over the graph. A jump costs more the higher it goes and that cost
// grows faster than the rise, which is what makes the two-stage route (floor
// -> chair -> sill) cheaper than the one high jump most of the time. `jitter`
// perturbs each edge's cost per plan, so "most of the time" is not "always".
export function jumpCost(edge) {
  const r = Math.abs(edge.rise) / 30;
  if (edge.type === 'up') return 1 + 0.9 * Math.pow(r, 1.8);
  if (edge.type === 'down') return 0.8 + 0.5 * r * r;
  return 0.9;
}

export function route(fromNode, toNode, { blocked = [], jitter = null } = {}) {
  if (fromNode === toNode) return [];
  const dist = new Map([[fromNode, 0]]);
  const prev = new Map();
  const open = new Set([fromNode]);
  while (open.size) {
    let u = null, best = Infinity;
    for (const n of open) if (dist.get(n) < best) { best = dist.get(n); u = n; }
    open.delete(u);
    if (u === toNode) break;
    for (const e of EDGES) {
      if (e.from !== u) continue;
      if (blocked.includes(e.to)) continue;
      const c = jumpCost(e) * (jitter ? jitter(e) : 1);
      const nd = best + c;
      if (nd < (dist.has(e.to) ? dist.get(e.to) : Infinity)) {
        dist.set(e.to, nd); prev.set(e.to, e); open.add(e.to);
      }
    }
  }
  if (!prev.has(toNode)) return null;
  const legs = [];
  for (let n = toNode; n !== fromNode; n = prev.get(n).from) legs.unshift(prev.get(n));
  return legs;
}
