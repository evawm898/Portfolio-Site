/* frame-relief.js — the /frame RELIEF: the molding profile lifted over a flat
   back, one closed solid per band, exported as the binary STL that is the
   page's PRIMARY output (charter §1, ruling 1, phase 2). Pure functions, no
   DOM, Node-importable.

   WHAT IT READS AND NEVER RECOMPUTES (charter §4):
     offsetCurve(spine, d)   every grid column's xy. The relief surface of a
                             band is offsetCurve at (x_i − 0.5)·w for every
                             profile sample x_i, at every spine vertex. A null
                             entry (past a join's bisector — the apex bow-tie)
                             becomes the join's OWN mitre point, so the apex
                             fans onto the vertex the two offset arcs meet at.
     profileSamples          the z of every column: plateT + z_i · reliefDepth.
     spine.embed             DECLARED by archSkeleton. embedSpine() extends a
                             COPY of the spine by EMBED_MM along its end
                             tangent where a neighbour is named, so the two
                             closed shells OVERLAP instead of touching face to
                             face (the voxel gate cannot tell those apart —
                             charter §3 invariant 9; the gate's B asserts the
                             embedded end lands inside the neighbour).
     outerEdge               the back plate's outline under BACKED lights.

   Coordinates: model mm (x right, y up) scaled by scale = printHeight /
   drawing height, z toward the viewer in print mm; the back is z = 0.

   Every band is a closed shell by construction — a top grid, the same grid
   at z = 0, and four walls — and overlapping closed shells are the export
   contract (the bloom's). Degenerate triangles (two or three coincident
   corners, which the mitre fan produces) are DROPPED: a degenerate triangle
   contributes an even count to every real edge, so dropping it leaves the
   edge census unchanged. Orientation is settled by the band's own signed
   volume rather than by reasoning about the grid's handedness, which flips
   between the left and right jamb.

   MIN_FEATURE_MM is an ASSUMPTION (registry) and caps the OUTPUT only: the
   plate is floored at it and told; a band, mullion or relief under it is
   told in info.underFloor, never refused. */

import { offsetCurve, outerEdge, profileSamples, PROFILE_PRESETS } from './frame-geometry.js';
import { MIN_FEATURE_MM } from './frame-registry.js';

export { MIN_FEATURE_MM };
/* The embed is the minimum feature: a length derived from a length. */
export const EMBED_MM = MIN_FEATURE_MM;

/* ------------------------------------------------------------------ */
/* The embed                                                           */
/* ------------------------------------------------------------------ */

/* A copy of the spine extended by e along its end tangents where
   spine.embed names a neighbour at that end. The extension vertex carries
   the end vertex's normal; a join index shifts with the prefix. Returns the
   copy plus which ends were extended (the gate maps original rows through
   it). A spine with no embed comes back as itself. */
export function embedSpine(spine, e = EMBED_MM) {
  const emb = spine.embed || {};
  const start = !!emb.start, end = !!emb.end;
  if (!start && !end) return { spine, start: false, end: false };
  const pts = spine.pts.slice(), nrm = spine.nrm.slice();
  const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return [dx / l, dy / l]; };
  const ws = spine.widthScale ? spine.widthScale.slice() : null, zs = spine.depthScale ? spine.depthScale.slice() : null, ls = spine.baseLift ? spine.baseLift.slice() : null;
  const ext = (a, at) => { if (a) { if (at) a.unshift(a[0]); else a.push(a[a.length - 1]); } };
  if (start) { const t = unit(pts[0], pts[1]); pts.unshift([pts[0][0] - t[0] * e, pts[0][1] - t[1] * e]); nrm.unshift(nrm[0]); ext(ws, true); ext(zs, true); ext(ls, true); }
  if (end) { const n = pts.length - 1, t = unit(pts[n - 1], pts[n]); pts.push([pts[n][0] + t[0] * e, pts[n][1] + t[1] * e]); nrm.push(nrm[n]); ext(ws, false); ext(zs, false); ext(ls, false); }
  const joins = (spine.joins || []).map((j) => j + (start ? 1 : 0));
  const out = { ...spine, pts, nrm, joins };
  if (ws) out.widthScale = ws;
  if (zs) out.depthScale = zs;
  if (ls) out.baseLift = ls;
  return { spine: out, start, end };
}

/* ------------------------------------------------------------------ */
/* Mesh accumulator                                                    */
/* ------------------------------------------------------------------ */

export class Mesh {
  constructor() { this.pos = []; this.idx = []; this.parts = []; }
  vertex(x, y, z) { this.pos.push(x, y, z); return this.pos.length / 3 - 1; }
  tri(a, b, c) {
    const P = this.pos;
    const same = (i, j) => P[3 * i] === P[3 * j] && P[3 * i + 1] === P[3 * j + 1] && P[3 * i + 2] === P[3 * j + 2];
    if (same(a, b) || same(b, c) || same(c, a)) return;    // degenerate: dropped, parity kept
    this.idx.push(a, b, c);
  }
  quad(a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); }
}

function signedVolume(P, I, t0, t1) {
  let v = 0;
  for (let t = t0; t < t1; t++) {
    const a = 3 * I[3 * t], b = 3 * I[3 * t + 1], c = 3 * I[3 * t + 2];
    v += P[a] * (P[b + 1] * P[c + 2] - P[b + 2] * P[c + 1]) - P[a + 1] * (P[b] * P[c + 2] - P[b + 2] * P[c]) + P[a + 2] * (P[b] * P[c + 1] - P[b + 1] * P[c]);
  }
  return v / 6;
}
function orientOutward(mesh, t0) {
  const t1 = mesh.idx.length / 3;
  if (signedVolume(mesh.pos, mesh.idx, t0, t1) < 0) {
    for (let t = t0; t < t1; t++) { const k = 3 * t + 1, tmp = mesh.idx[k]; mesh.idx[k] = mesh.idx[k + 1]; mesh.idx[k + 1] = tmp; }
  }
}

/* ------------------------------------------------------------------ */
/* One band as a closed solid                                          */
/* ------------------------------------------------------------------ */

/* Columns of the band: the profile's own samples across it, plus an OUTER
   lip column where the sill declares one (the same z as the outer edge, one
   embed further out). */
function bandColumns(spine, prof, e) {
  const w = spine.bandWidth;
  const ds = [], zs = [];
  const lip = !!(spine.embed && spine.embed.outer);
  if (lip) { ds.push(-w / 2 - e); zs.push(prof.z[0]); }
  for (let i = 0; i < prof.x.length; i++) { ds.push((prof.x[i] - 0.5) * w); zs.push(prof.z[i]); }
  return { ds, zs, lip };
}

export function bandSolid(mesh, spine, prof, { scale, plateT, reliefDepth, embedMm = EMBED_MM }) {
  const ext = embedSpine(spine, embedMm);
  const S = ext.spine;
  const { ds, zs, lip } = bandColumns(spine, prof, embedMm);
  const V = S.pts.length, C = ds.length;
  const closed = !!S.closed;
  const j = S.joins && S.joins.length ? S.joins[0] : -1;
  // xy of every grid vertex: offsetCurve per column, nulls → the mitre point
  // (the join whose stretch the vertex is in; an open spine has one)
  const xy = ds.map((d) => {
    const off = offsetCurve(S, d);
    return closed ? off.map((q, i) => q || off[nearestJoin(S, i)]) : off.map((q) => q || off[j]);
  });
  const base = mesh.pos.length / 3;
  const t0 = mesh.idx.length / 3;
  // a tapered wire declares depthScale[v]: its crown at vertex v is
  // reliefDepth · depthScale[v] (absent: the old expression, by branch)
  const dz = S.depthScale;
  // an ornament SEATED on a molding (phase 3d) declares baseLift[v]: row v's
  // crown stands on the molding's height there (its base stays at 0, so the
  // two shells overlap all the way down); absent, the old expressions
  const lz = S.baseLift;
  if (lz) for (let v = 0; v < V; v++) for (let c = 0; c < C; c++) mesh.vertex(xy[c][v][0] * scale, xy[c][v][1] * scale, plateT + lz[v] + zs[c] * reliefDepth * (dz ? dz[v] : 1));
  else if (dz) for (let v = 0; v < V; v++) for (let c = 0; c < C; c++) mesh.vertex(xy[c][v][0] * scale, xy[c][v][1] * scale, plateT + zs[c] * reliefDepth * dz[v]);
  else for (let v = 0; v < V; v++) for (let c = 0; c < C; c++) mesh.vertex(xy[c][v][0] * scale, xy[c][v][1] * scale, plateT + zs[c] * reliefDepth);
  for (let v = 0; v < V; v++) for (let c = 0; c < C; c++) mesh.vertex(xy[c][v][0] * scale, xy[c][v][1] * scale, 0);
  const T = (v, c) => base + v * C + c, B = (v, c) => base + V * C + v * C + c;
  // a CLOSED loop: row V−1 joins row 0 by the same quads every other pair of
  // rows gets (the CLOSING STRIP) and there are no end caps — no vertex is
  // duplicated and nothing is drawn at the seam that is not drawn elsewhere.
  const strips = closed ? V : V - 1, nx = (v) => (v + 1) % V;
  for (let v = 0; v < strips; v++) for (let c = 0; c < C - 1; c++) {
    mesh.quad(T(v, c), T(nx(v), c), T(nx(v), c + 1), T(v, c + 1));
    mesh.quad(B(v, c), B(v, c + 1), B(nx(v), c + 1), B(nx(v), c));
  }
  for (let v = 0; v < strips; v++) {
    mesh.quad(T(v, 0), B(v, 0), B(nx(v), 0), T(nx(v), 0));               // outer wall
    mesh.quad(T(v, C - 1), T(nx(v), C - 1), B(nx(v), C - 1), B(v, C - 1)); // inner wall
  }
  if (!closed) for (let c = 0; c < C - 1; c++) {
    mesh.quad(T(0, c), T(0, c + 1), B(0, c + 1), B(0, c));               // start end
    mesh.quad(T(V - 1, c), B(V - 1, c), B(V - 1, c + 1), T(V - 1, c + 1)); // far end
  }
  orientOutward(mesh, t0);
  mesh.parts.push({ id: spine.id, kind: 'band', closed, base, V, C, t0, t1: mesh.idx.length / 3, rowOffset: ext.start ? 1 : 0, colOffset: lip ? 1 : 0, embedStart: ext.start, embedEnd: ext.end, lip, T: (v, c) => base + v * C + c });
}

/* The join whose trimming stretch vertex i lies in on a closed loop: the
   nearest join by index around the loop. */
function nearestJoin(S, i) {
  const n = S.pts.length;
  let best = S.joins[0], bd = Infinity;
  for (const j of S.joins) { const d = Math.min((i - j + n) % n, (j - i + n) % n); if (d < bd) { bd = d; best = j; } }
  return best;
}

/* ------------------------------------------------------------------ */
/* The back plate (BACKED lights)                                      */
/* ------------------------------------------------------------------ */

/* The frame's outer silhouette: the jambs' outer edges, the head's outer
   edge, closed across the drawing's bottom. Read off outerEdge — the owner
   of those boundaries — never restated. */
export function plateOutline(model) {
  const w = model.params.moldingWidth;
  // a closed frame's silhouette IS its loop's outer edge (closed, so the
  // repeated first point is dropped for the ear clipper)
  if (model.spines.length === 1 && model.spines[0].closed) return outerEdge(model.spines[0], w).slice(0, -1);
  const sp = (id) => model.spines.find((s) => s.id === id);
  const headOut = outerEdge(sp('head'), w);                // right springing → apex → left
  const xo = outerEdge(sp('jambR'), w)[0][0];
  const yB = model.box.y0;
  const poly = [[-xo, yB], [-xo, model.info.springY], ...headOut.slice().reverse(), [xo, model.info.springY], [xo, yB]];
  // the head's outer edge already carries the two springing points; drop
  // exact repeats so the ear clipper sees a simple polygon
  return poly.filter((q, i) => i === 0 || q[0] !== poly[i - 1][0] || q[1] !== poly[i - 1][1]);
}

/* Ear clipping on a simple polygon (either orientation). */
export function earClip(poly) {
  const n = poly.length;
  let area = 0; for (let i = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const idx = []; for (let i = 0; i < n; i++) idx.push(area >= 0 ? i : n - 1 - i);
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const inside = (p, a, b, c) => cross(a, b, p) >= 0 && cross(b, c, p) >= 0 && cross(c, a, p) >= 0;
  const tris = [];
  let guard = 0;
  while (idx.length > 3 && guard++ < 10 * n) {
    let clipped = false;
    for (let i = 0; i < idx.length; i++) {
      const a = poly[idx[(i + idx.length - 1) % idx.length]], b = poly[idx[i]], c = poly[idx[(i + 1) % idx.length]];
      if (cross(a, b, c) <= 1e-12) continue;
      let ok = true;
      for (let k = 0; k < idx.length && ok; k++) {
        const q = poly[idx[k]];
        if (q === a || q === b || q === c) continue;
        if (inside(q, a, b, c)) ok = false;
      }
      if (!ok) continue;
      tris.push([idx[(i + idx.length - 1) % idx.length], idx[i], idx[(i + 1) % idx.length]]);
      idx.splice(i, 1); clipped = true; break;
    }
    if (!clipped) throw new Error('earClip: no ear found — the outline is not a simple polygon');
  }
  tris.push([idx[0], idx[1], idx[2]]);
  return tris;
}

function plateSolid(mesh, outline, { scale, plateT }) {
  const base = mesh.pos.length / 3, t0 = mesh.idx.length / 3, n = outline.length;
  for (const [x, y] of outline) mesh.vertex(x * scale, y * scale, plateT);
  for (const [x, y] of outline) mesh.vertex(x * scale, y * scale, 0);
  for (const [a, b, c] of earClip(outline)) { mesh.tri(base + a, base + b, base + c); mesh.tri(base + n + c, base + n + b, base + n + a); }
  for (let i = 0; i < n; i++) { const k = (i + 1) % n; mesh.quad(base + i, base + n + i, base + n + k, base + k); }
  orientOutward(mesh, t0);
  mesh.parts.push({ id: 'plate', kind: 'plate', base, n, t0, t1: mesh.idx.length / 3 });
}

/* ------------------------------------------------------------------ */
/* The relief                                                          */
/* ------------------------------------------------------------------ */

/* THE TRIANGLE BUDGET (phase 3c, the bloom's 1.5 M precedent): the ornament
   gives way, group by group, before the relief passes it (frame-filigree's
   ornamentFor), and buildRelief tells if a relief ever does. The bound is an
   open band solid's own count — top and bottom grids, two walls, two caps —
   which the degenerate drops only lower. */
export const FRAME_TRI_BUDGET = 1500000;
export const solidTriBound = (V, C) => 4 * (V - 1) * (C - 1) + 4 * (V - 1) + 4 * (C - 1);

/* The floor as ASSUMED: everything below reads MIN_FEATURE_MM and says so. */
export const FLOOR_NOTE = `${MIN_FEATURE_MM.toFixed(1)} mm assumed minimum feature (print process undecided)`;

export function buildRelief(model) {
  const p = model.params;
  // the FRAME's box sets the scale (an ornament may stand past it)
  const fb = model.frameBox || model.box;
  const scale = p.printHeight / (fb.y1 - fb.y0);
  const told = [];
  let plateT = p.plateThickness;
  if (plateT < MIN_FEATURE_MM) { told.push(`back plate ${plateT.toFixed(2)} mm built at the ${FLOOR_NOTE} floor`); plateT = MIN_FEATURE_MM; }
  const reliefDepth = p.moldingDepth * scale * p.reliefScale;
  const underFloor = [];
  const bandW = p.moldingWidth * scale, mullW = bandW * p.mullionWidth;
  if (bandW < MIN_FEATURE_MM) underFloor.push(`molding band ${bandW.toFixed(2)} mm wide`);
  const arch = model.info.kind === 'arch';
  if (arch && p.mullions > 0 && mullW < MIN_FEATURE_MM) underFloor.push(`mullion ${mullW.toFixed(2)} mm wide`);
  if (arch && p.sill === 'stepped' && 0.7 * bandW < MIN_FEATURE_MM) underFloor.push(`sill step ${(0.7 * bandW).toFixed(2)} mm wide`);
  if (reliefDepth < MIN_FEATURE_MM) underFloor.push(`relief ${reliefDepth.toFixed(2)} mm deep`);
  const prof = model.prof;
  const mesh = new Mesh();
  for (const s of model.spines) bandSolid(mesh, s, prof, { scale, plateT, reliefDepth });
  // the ornament's wires: built in print mm already (scale 1), each its own
  // closed solid standing on the plate thickness, overlapping its molding by
  // the embed it was seated with (frame-filigree.js)
  if (model.ornament) {
    for (const o of model.ornament.solids) bandSolid(mesh, o.spine, o.prof, { scale: 1, plateT: plateT + (o.lift || 0), reliefDepth: o.depth });
    const crown = Math.min(...model.ornament.solids.map((o) => o.depth * (o.spine.depthScale ? Math.min(...o.spine.depthScale) : 1)));
    if (model.ornament.solids.length && crown < MIN_FEATURE_MM) underFloor.push(`ornament crown ${crown.toFixed(2)} mm high`);
  }
  // the interior: open, a plate behind at the plate thickness (backed), or
  // the same plate at the floor so the opening reads deeper (recessed)
  let plate = null, panelT = null;
  if (p.lights === 'backed' || p.lights === 'recessed') {
    panelT = p.lights === 'backed' ? plateT : MIN_FEATURE_MM;
    if (p.lights === 'recessed' && plateT <= MIN_FEATURE_MM) told.push(`recessed reads as backed: the plate is already at the ${FLOOR_NOTE} floor`);
    plate = plateOutline(model); plateSolid(mesh, plate, { scale, plateT: panelT });
  }
  if (mesh.idx.length / 3 > FRAME_TRI_BUDGET) told.push(`the relief is ${(mesh.idx.length / 3).toLocaleString('en-US')} triangles, past the ${FRAME_TRI_BUDGET.toLocaleString('en-US')} budget`);
  const positions = Float64Array.from(mesh.pos), indices = Uint32Array.from(mesh.idx);
  let z1 = 0; for (let i = 2; i < positions.length; i += 3) if (positions[i] > z1) z1 = positions[i];
  return {
    positions, indices, parts: mesh.parts, scale, plateT, reliefDepth, plate, panelT,
    info: { scale, plateT, reliefDepth, bandW, mullW, told, underFloor, triangles: indices.length / 3, heightMm: p.printHeight, widthMm: (model.box.x1 - model.box.x0) * scale, ornament: model.ornament ? { groups: model.ornament.groups.length, wires: model.ornament.solids.length, told: model.ornament.told } : null, depthMm: z1, floorNote: FLOOR_NOTE },
  };
}

/* ------------------------------------------------------------------ */
/* STL                                                                 */
/* ------------------------------------------------------------------ */

export function exportStl(relief, header = 'Parametric Frame — eva-maskalenko.com/frame — mm') {
  const P = relief.positions, I = relief.indices, n = I.length / 3;
  const buf = new ArrayBuffer(84 + 50 * n);
  const dv = new DataView(buf);
  for (let i = 0; i < 80; i++) dv.setUint8(i, i < header.length ? header.charCodeAt(i) & 0x7f : 32);
  dv.setUint32(80, n, true);
  let o = 84;
  for (let t = 0; t < n; t++) {
    const a = 3 * I[3 * t], b = 3 * I[3 * t + 1], c = 3 * I[3 * t + 2];
    const ex = P[b] - P[a], ey = P[b + 1] - P[a + 1], ez = P[b + 2] - P[a + 2];
    const fx = P[c] - P[a], fy = P[c + 1] - P[a + 1], fz = P[c + 2] - P[a + 2];
    let nx = ey * fz - ez * fy, ny = ez * fx - ex * fz, nz = ex * fy - ey * fx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    dv.setFloat32(o, nx, true); dv.setFloat32(o + 4, ny, true); dv.setFloat32(o + 8, nz, true); o += 12;
    for (const v of [a, b, c]) { dv.setFloat32(o, P[v], true); dv.setFloat32(o + 4, P[v + 1], true); dv.setFloat32(o + 8, P[v + 2], true); o += 12; }
    dv.setUint16(o, 0, true); o += 2;
  }
  return new Uint8Array(buf);
}

/* ------------------------------------------------------------------ */
/* Instruments (read by the gate)                                      */
/* ------------------------------------------------------------------ */

/* Edge census on the WELDED float32 bytes an STL carries — the bug gate's own
   analyzeStl, ported verbatim. boundary === 0 is the hard gate; nonManifold
   is reported, unrated (overlapping closed shells share no vertices, so it
   counts only coincident duplicates). */
export function analyzeStl(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const n = dv.getUint32(80, true);
  const id = new Map(); let nv = 0;
  const vid = (o) => {
    const k = `${dv.getFloat32(o, true)},${dv.getFloat32(o + 4, true)},${dv.getFloat32(o + 8, true)}`;
    let v = id.get(k); if (v === undefined) { v = nv++; id.set(k, v); } return v;
  };
  const edges = new Map();
  for (let t = 0; t < n; t++) {
    const o = 84 + 50 * t + 12;
    const a = vid(o), b = vid(o + 12), c = vid(o + 24);
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      const k = p < q ? p * 4294967296 + q : q * 4294967296 + p;
      edges.set(k, (edges.get(k) || 0) + 1);
    }
  }
  let boundary = 0, nonManifold = 0;
  for (const c of edges.values()) { if (c === 1) boundary++; else if (c > 2) nonManifold++; }
  return { triangles: n, boundary, nonManifold, bytes: bytes.length };
}

/* Voxel connectivity — the bug gate's voxelComponents, ported. Surface
   occupancy at `cell`, barycentric sampling at a QUARTER cell (the bloom's
   step; the bug samples at 0.12 of a cell against a corner-island artefact
   its own geometry showed — this relief's facets are large flat quads, a
   quarter cell read one region on every row and the 0.2 mm re-read is what
   separates an island from a gap), 6-connected flood fill. Two solids that
   merely graze within one cell read as ONE region: that is why the embed is
   asserted geometrically (B) and not here. */
export const VOXEL_SAMPLE_STEP = 0.25;
/* The row sampler runs at half the nominal step. Measured on the default
   arch at 0.4 mm: the old n × n grid marked 134,679 voxels, the row sampler
   131,903 at this step (132,961 at a quarter, 134,049 at a tenth — the missing
   ~2% are grazes at voxel corners that the square grid over-sampled across a
   thin triangle's short direction). FEWER marked voxels can only SPLIT a
   region, never merge two, so this can make C stricter and can never hide a
   detachment; a split is re-read at 0.2 mm as before. Cost: ~0.3 s a row
   against 5–7 s for a rectangle on the square grid. */
const ROW_STEP = 0.5;
export function voxelComponents(relief, cell) {
  const P = relief.positions, I = relief.indices;
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (let i = 0; i < P.length; i += 3) {
    x0 = Math.min(x0, P[i]); x1 = Math.max(x1, P[i]); y0 = Math.min(y0, P[i + 1]); y1 = Math.max(y1, P[i + 1]); z0 = Math.min(z0, P[i + 2]); z1 = Math.max(z1, P[i + 2]);
  }
  const nx = Math.ceil((x1 - x0) / cell) + 3, ny = Math.ceil((y1 - y0) / cell) + 3, nz = Math.ceil((z1 - z0) / cell) + 3;
  const vox = new Uint8Array(nx * ny * nz);
  const mark = (x, y, z) => { vox[(Math.floor((z - z0) / cell) + 1) * nx * ny + (Math.floor((y - y0) / cell) + 1) * nx + Math.floor((x - x0) / cell) + 1] = 1; };
  const step = cell * VOXEL_SAMPLE_STEP;
  const d3 = (i, j) => Math.hypot(P[j] - P[i], P[j + 1] - P[i + 1], P[j + 2] - P[i + 2]);
  for (let t = 0; t < I.length; t += 3) {
    // ROWS PARALLEL TO THE LONGEST EDGE (phase 2b): rows at most `step`
    // apart across the triangle's height, samples at most `step` apart along
    // each row — the same spacing bound as an n × n barycentric grid sized by
    // the longest edge, at a cost proportional to the AREA. A closed frame's
    // long straight sides are long thin quads, where the square grid spent
    // millions of samples per triangle (measured: 5–7 s a rectangle row).
    let a = 3 * I[t], b = 3 * I[t + 1], c = 3 * I[t + 2];
    const lab = d3(a, b), lbc = d3(b, c), lca = d3(c, a);
    if (lbc >= lab && lbc >= lca) [a, b, c] = [b, c, a]; else if (lca >= lab && lca >= lbc) [a, b, c] = [c, a, b];
    const L = Math.max(lab, lbc, lca);          // now |ab| is the longest edge, c the apex
    const ex = P[b] - P[a], ey = P[b + 1] - P[a + 1], ez = P[b + 2] - P[a + 2], fx = P[c] - P[a], fy = P[c + 1] - P[a + 1], fz = P[c + 2] - P[a + 2];
    const H = L > 0 ? Math.hypot(ey * fz - ez * fy, ez * fx - ex * fz, ex * fy - ey * fx) / L : 0;
    const nh = Math.max(1, Math.ceil(H / (step * ROW_STEP)));
    for (let k = 0; k <= nh; k++) {
      const tt = k / nh;                         // the row from a + tt(c − a) to b + tt(c − b), length (1 − tt) L
      const m = Math.max(1, Math.ceil((1 - tt) * L / (step * ROW_STEP)));
      for (let i = 0; i <= m; i++) {
        const u = (1 - tt) * i / m;              // weight of b
        const v = tt, w = 1 - u - v;             // weight of c, of a
        mark(w * P[a] + u * P[b] + v * P[c], w * P[a + 1] + u * P[b + 1] + v * P[c + 1], w * P[a + 2] + u * P[b + 2] + v * P[c + 2]);
      }
    }
  }
  const lab = new Int32Array(vox.length); const q = new Int32Array(vox.length);
  let comps = 0; const sizes = [];
  for (let s = 0; s < vox.length; s++) {
    if (!vox[s] || lab[s]) continue;
    comps++; let h = 0, tl = 0; q[tl++] = s; lab[s] = comps;
    while (h < tl) {
      const c = q[h++];
      for (const d of [1, -1, nx, -nx, nx * ny, -nx * ny]) { const m = c + d; if (m >= 0 && m < vox.length && vox[m] && !lab[m]) { lab[m] = comps; q[tl++] = m; } }
    }
    sizes.push(tl);
  }
  return { comps, sizes, cell };
}

/* One region at 0.4 mm; a miss is re-read at 0.2 — a real gap survives, a
   sampling artefact vanishes. */
export function connected(relief) {
  const a = voxelComponents(relief, 0.4);
  if (a.comps === 1) return { comps: 1, cell: 0.4 };
  const b = voxelComponents(relief, 0.2);
  return { comps: b.comps, cell: 0.2, first: a.comps, sizes: b.sizes.slice(0, 6) };
}

export const presetProfile = (name) => profileSamples(PROFILE_PRESETS[name]);
