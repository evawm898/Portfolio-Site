/* ===================================================================
   flower.js
   Parametric 3D flower-bloom — THREE.JS RENDER LAYER

   Responsibilities (the abstract geometry lives in flower-geometry.js):
     - turn the leaf-venation vein graph into real tube / bead mesh geometry
     - arrange petals on a phyllotactic (golden-angle) spiral + central core
     - set up the scene, lighting, orbit controls, and render loop
     - wire the parametric sliders so any change regenerates live

   The build pipeline for one petal:
     spine + silhouette  ->  hierarchical leaf venation (flattened space)
       ->  map each vein onto the cupped 3D petal surface
       ->  extrude a tapering tube along it, cap the open ends with beads
       ->  place it on the spiral (angle, radius, receptacle height + lean)

   v1 scope: bloom only. No stem, no leaves, no export.
   =================================================================== */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import {
  lerp, clamp, mulberry32,
  buildSpine, buildSilhouette, buildBlade, buildVenation, buildVoronoi, buildStrands, buildBone, buildLace,
  buildJaggedEdge, buildRuffledEdge, buildScallopEdge,
  mapPointToSurface, surfaceNormalAt, placePoint, placeDir, densifyByStep,
} from './flower-geometry.js';

const DEG = Math.PI / 180;

/* Fixed bloom constants (not exposed as sliders in v1, but grouped here so
   they are trivial to promote to controls in a later pass). */
const PETAL_LENGTH   = 2.2;    // world units, base -> tip along the spine
const BASE_RADIUS    = 0;      // spiral petals: spine starts on the axis; the
                               // base is then placed at its own spiral radius
const CUP_AMOUNT     = 0.22;   // transverse cupping (edges curl inward)
const CENTER_CURVE_SCALE = 0.75;  // centre-curve slider (-1..1) -> spine curl (rad);
                                  // +convex arches away, -concave bends toward centre.
                                  // default slider 0.4 -> 0.30 rad = the original curl
const RADIAL_SEGMENTS = 8;     // tube cross-section resolution (round enough
                               // that a thickened tube doesn't read as faceted)
// Higher resolution for the CHUNKY, close-viewed base/center primitives only
// (anther beads, stem/bud tubes, receptacle ribs) — the hair-fine venation stays
// at RADIAL_SEGMENTS since its faceting is never visible. Bumping only these
// smooths the close-zoom silhouette for a few thousand extra triangles.
const NODE_BEAD_RINGS   = 6;   // was 5 — smoother anthers / bud tips / junctions
const NODE_BEAD_SECTORS = 16;  // was 8
const CENTER_TUBE_SEGS  = 12;  // was 8 — stamen filaments, stem, side-bud offshoot
const RECEPT_TUBE_SEGS  = 10;  // was 5 — receptacle ribs / rings
const LEAF_MIN_NODES    = 2;   // selecting a leaf type auto-raises 0 stem nodes to this,
                               // so leaves are visible on selection (they attach at nodes)
const JOIN_FLARE_DIST = 0.10;  // a flared tube blends into its end bead (a soft
                               // fillet) over this world distance rather than
                               // butting it with a hard cylinder-into-sphere crease
const RIM_WIDTH       = 0.34;  // petal-margin line weight, relative to the midrib
                               // (the leaf edge is a fine vein, not a fat rope)
const SEED_BASE      = 20250808;
const LAYER_SEED_STRIDE = 9973;  // per-layer seed offset so inner whorls vary (0 for layer 0)

/* ===================================================================
   REAL-WORLD SCALE  (STL export — Phase 1)
   -------------------------------------------------------------------
   A single source-of-truth constant maps Three.js world units to
   millimetres. It is applied ONLY when exporting an STL (a scale factor
   baked into the exported geometry), never to the live scene — so the
   interactive view keeps rendering in the same unitless world it always
   has, and changing this number rescales the physical print without
   touching any of the shape constants above.

   Calibration: the default bloom as the page first loads (4 petals,
   bloom 55°, tightness 0.5, elevation 0) measures ~4.62 world units
   across its widest span (headless bounding-box, X/Z). Targeting a
   ~120 mm fully-open flower gives 120 / 4.62 ≈ 26 mm per unit. Fuller
   blooms (more petals / looser coil) are larger in world units and so
   print proportionally larger — e.g. a 24-petal bloom (~6.8 units) lands
   near ~177 mm. This constant fixes the units→mm ratio; the physical
   size of any given bloom then follows from its own extent.

   To rescale every future export, change ONLY this number. */
const MM_PER_UNIT = 26;   // millimetres per Three.js world unit (single scale knob)

/* ===================================================================
   MINIMUM FEATURE THICKNESS  (STL export — Phase 2)
   -------------------------------------------------------------------
   Powder-bed processes (SLS / MJF) can only reliably resolve struts and
   walls down to ~0.8 mm; anything thinner either fails to fuse or snaps
   off. So at export time every radius/thickness is floored to guarantee
   the printed feature is at least this thick. Like MM_PER_UNIT this only
   affects exported geometry — the live view keeps its hair-fine veins.

   A round tube's printed thickness is its DIAMETER (2·radius), so the
   radius floor is half the feature size. A Voronoi slab's thickness is
   its full `thick`, so that floors to the whole feature size.

   At MM_PER_UNIT = 26: MIN_FEATURE_UNITS = 0.8/26 ≈ 0.0308 u, radius
   floor ≈ 0.0154 u. For reference the thinnest tube slider gives radius
   0.008 u (0.42 mm dia) and the default rim 0.0057 u (0.30 mm dia) —
   both below the floor, so both are lifted to 0.8 mm on export. */
const MIN_FEATURE_MM    = 0.8;                          // smallest reliable SLS/MJF feature
const MIN_FEATURE_UNITS = MIN_FEATURE_MM / MM_PER_UNIT; // slab-thickness / wall floor, in world units
const MIN_RADIUS_UNITS  = MIN_FEATURE_UNITS / 2;        // tube/bead radius floor (diameter = feature)

/* Phyllotactic-spiral arrangement (replaces the old outer-ring + inner-whorl
   layout). Petal i sits at angle i*GOLDEN_ANGLE and radius spread*sqrt(i)
   (Vogel's model — the sunflower packing). Below EVEN_MAX petals the spiral has
   too few points to read as a spiral and collapses into a lopsided clump, so we
   switch to an evenly-spaced rosette there (see generate()). */
const GOLDEN_ANGLE   = Math.PI * (3 - Math.sqrt(5));  // ~137.5°, the divergence angle
const SPREAD_LOOSE   = 0.52;   // radial spacing at min coil tightness (open, gappy spiral)
const SPREAD_TIGHT   = 0.13;   // radial spacing at max coil tightness (dense, packed spiral)
const ELEV_FACTOR    = 0.85;   // centre rise/sink at full elevation, as a fraction of the
                               // bloom radius — keeps the cone/bowl aspect natural at any tightness
const RECEPTACLE_TILT = 0.55;  // how strongly petals lean along the cone/bowl slope (0..1)
const CORE_SPREAD    = 0.14;   // stamen-cluster radius at the bloom's heart
const EVEN_MAX       = 4;      // at/below this petal count, arrange petals as an even rosette
                               // (equal angle + equal radius) instead of the phyllotactic
                               // spiral, so 3 or 4 petals sit evenly spaced from each other
const EVEN_RING      = 0.62;   // rosette ring radius as a fraction of the bloom radius
// bilateral fan spacing is user-set (Petal spacing slider) and capped in generate()
// so the fan never wraps past the back; max 3 petals per side.
const SLAB_THICK     = 3.2;    // Voronoi sheet thickness, as a multiple of the tube radius
const SLAB_FILLET    = 1.0;    // rounded-edge radius as a fraction of half-thickness (1 = full bullnose)
// Veins / strands / bone / lace render as solid FLAT RIBBONS (a leaf-skeleton
// lamina) instead of round tubes: each vein keeps its width taper (half-width =
// the old tube radius) but is given a flat thickness along the petal surface
// normal. This ratio sets the lamina half-thickness as a fraction of the tube
// radius — < 1 so the ribbon reads as a thin flat leaf vein, not a round rope.
const LAMINA_HALF    = 0.5;


/* ===================================================================
   1. GEOMETRY ACCUMULATOR
   Appends tubes and beads directly into flat position/normal/index arrays,
   so an entire material group becomes a single BufferGeometry with no
   thousands of throwaway objects. Keeps live slider rebuilds cheap.
   =================================================================== */

class MeshAccumulator {
  constructor(opts = {}) {
    this.pos = [];
    this.nor = [];
    this.idx = [];
    this.vcount = 0;
    this.min = [Infinity, Infinity, Infinity];
    this.max = [-Infinity, -Infinity, -Infinity];
    // EXPORT ONLY: when true, every tube/bead radius and slab thickness is
    // floored to the minimum printable feature (Phase 2). The live scene
    // builds accumulators without this flag, so its thin veins are untouched.
    this.exportMode = !!opts.exportMode;
    // Export telemetry: thinnest round radius and slab thickness actually
    // emitted (world units). Only tracked in export mode; used to report the
    // real-world minimum feature size of a print.
    this.minRadius = Infinity;
    this.minThick = Infinity;
    // Feature-floor scale. A sub-mesh (the side bud) is built full-size into its
    // own accumulator and then uniformly scaled DOWN when merged in, so its
    // printable-minimum floor must be raised by 1/scale here — that way, AFTER
    // the downscale, every strut / wall / bead still lands at >= the true minimum
    // feature. Defaults to 1 (an exact no-op) for every normal build, so the
    // main flower's export is unchanged.
    this.floorScale = opts.floorScale || 1;
    this.floorR = MIN_RADIUS_UNITS / this.floorScale;    // tube / bead radius floor
    this.floorF = MIN_FEATURE_UNITS / this.floorScale;   // slab / blade / ribbon thickness floor
  }

  // Lift a radius to the export floor, preserving its form (constant number,
  // [start,end] taper pair, or a t->radius function). A no-op when not exporting.
  _floorRadius(radius) {
    if (!this.exportMode) return radius;
    const f = this.floorR;
    if (typeof radius === 'function') return (t) => Math.max(f, radius(t));
    if (Array.isArray(radius)) return [Math.max(f, radius[0]), Math.max(f, radius[1])];
    return Math.max(f, radius);
  }

  _vertex(x, y, z, nx, ny, nz) {
    this.pos.push(x, y, z);
    this.nor.push(nx, ny, nz);
    if (x < this.min[0]) this.min[0] = x; if (x > this.max[0]) this.max[0] = x;
    if (y < this.min[1]) this.min[1] = y; if (y > this.max[1]) this.max[1] = y;
    if (z < this.min[2]) this.min[2] = z; if (z > this.max[2]) this.max[2] = z;
    return this.vcount++;
  }

  /* Extrude a round tube along a 3D polyline, using a rotation-minimizing
     frame so the cross-section doesn't twist between segments. Points are
     plain {x,y,z}. `radius` may be a constant, a [startRadius, endRadius]
     pair (linear taper along the tube), or a function t->radius with t the
     normalized arc position in [0,1] — so a single tube can taper smoothly,
     which is how veins thin from midrib toward the finer orders. */
  addTube(points, radius, flare = 0, radialSegments = RADIAL_SEGMENTS) {
    const n = points.length;
    if (n < 2) return;
    radius = this._floorRadius(radius);   // export: floor to min printable feature (no-op live)

    // ---- cumulative arc length (used to flare the radius toward the ends) ----
    const arc = new Array(n);
    arc[0] = 0;
    for (let i = 1; i < n; i++) {
      arc[i] = arc[i - 1] + Math.hypot(
        points[i].x - points[i - 1].x,
        points[i].y - points[i - 1].y,
        points[i].z - points[i - 1].z);
    }
    const total = arc[n - 1];
    // keep at least a ~10% waist in the middle so short struts don't turn into
    // solid blobs when both end-flares would otherwise overlap
    const flareDist = flare > 0 ? Math.min(JOIN_FLARE_DIST, 0.45 * total) : 0;

    // ---- per-point tangents ----
    const T = new Array(n);
    for (let i = 0; i < n; i++) {
      let ax, ay, az;
      if (i === 0)            { ax = points[1].x - points[0].x;         ay = points[1].y - points[0].y;         az = points[1].z - points[0].z; }
      else if (i === n - 1)   { ax = points[i].x - points[i - 1].x;     ay = points[i].y - points[i - 1].y;     az = points[i].z - points[i - 1].z; }
      else                    { ax = points[i + 1].x - points[i - 1].x; ay = points[i + 1].y - points[i - 1].y; az = points[i + 1].z - points[i - 1].z; }
      let len = Math.hypot(ax, ay, az);
      if (len < 1e-9) { ax = 0; ay = 1; az = 0; len = 1; }
      T[i] = [ax / len, ay / len, az / len];
    }

    // ---- rotation-minimizing normals (incremental) ----
    const N = new Array(n);
    N[0] = perpendicular(T[0]);
    for (let i = 1; i < n; i++) {
      const t0 = T[i - 1], t1 = T[i];
      const cx = t0[1] * t1[2] - t0[2] * t1[1];
      const cy = t0[2] * t1[0] - t0[0] * t1[2];
      const cz = t0[0] * t1[1] - t0[1] * t1[0];
      const s = Math.hypot(cx, cy, cz);
      const prev = N[i - 1];
      if (s < 1e-6) {
        N[i] = prev.slice();
      } else {
        const axis = [cx / s, cy / s, cz / s];
        const angle = Math.atan2(s, t0[0] * t1[0] + t0[1] * t1[1] + t0[2] * t1[2]);
        let r = rodrigues(prev, axis, angle);
        // re-orthogonalize against the new tangent, then renormalize
        const d = r[0] * t1[0] + r[1] * t1[1] + r[2] * t1[2];
        r = [r[0] - t1[0] * d, r[1] - t1[1] * d, r[2] - t1[2] * d];
        const rl = Math.hypot(r[0], r[1], r[2]) || 1;
        N[i] = [r[0] / rl, r[1] / rl, r[2] / rl];
      }
    }

    // ---- emit ring vertices, remember each ring's start index ----
    const ringStart = new Array(n);
    for (let i = 0; i < n; i++) {
      const t = T[i], nrm = N[i];
      const bx = t[1] * nrm[2] - t[2] * nrm[1];
      const by = t[2] * nrm[0] - t[0] * nrm[2];
      const bz = t[0] * nrm[1] - t[1] * nrm[0];
      const P = points[i];
      ringStart[i] = this.vcount;
      // resolve the base radius at this ring: constant, [start,end] taper, or
      // a t->radius function (t = normalized arc position along the tube)
      const tArc = total > 1e-9 ? arc[i] / total : 0;
      let base;
      if (typeof radius === 'function')   base = radius(tArc);
      else if (Array.isArray(radius))     base = lerp(radius[0], radius[1], tArc);
      else                                base = radius;
      // flare: grow the radius near each end (smoothstep) so the strut meets
      // the node bead in a soft swell instead of a hard butt joint
      let rr = base;
      if (flareDist > 0) {
        const dEnd = Math.min(arc[i], total - arc[i]);
        const w = Math.max(0, 1 - dEnd / flareDist);   // 0 mid-strut -> 1 at end
        rr = base * (1 + flare * w * w * (3 - 2 * w));
      }
      for (let j = 0; j < radialSegments; j++) {
        const th = (j / radialSegments) * Math.PI * 2;
        const c = Math.cos(th), sn = Math.sin(th);
        const ox = nrm[0] * c + bx * sn;
        const oy = nrm[1] * c + by * sn;
        const oz = nrm[2] * c + bz * sn;
        this._vertex(P.x + ox * rr, P.y + oy * rr, P.z + oz * rr, ox, oy, oz);
      }
      if (this.exportMode && rr < this.minRadius) this.minRadius = rr;   // telemetry
    }

    // ---- stitch quads between consecutive rings ----
    for (let i = 0; i < n - 1; i++) {
      const a0 = ringStart[i], b0 = ringStart[i + 1];
      for (let j = 0; j < radialSegments; j++) {
        const jn = (j + 1) % radialSegments;
        const a = a0 + j, b = a0 + jn, c = b0 + j, d = b0 + jn;
        this.idx.push(a, b, c, b, d, c);
      }
    }

    // EXPORT: seal the two open cylinder ends with a triangle fan to a centre
    // vertex, so every tube (incl. the core filaments, receptacle ribs and stem,
    // and the closed-loop rim seam) becomes a watertight solid with no boundary
    // edges. The fan reuses the existing ring vertices, so ring-perimeter edges
    // are shared with the wall quads (no new boundary). Live builds skip this.
    if (this.exportMode) {
      const rs = radialSegments;
      const t0 = T[0], p0 = points[0];
      const c0 = this._vertex(p0.x, p0.y, p0.z, -t0[0], -t0[1], -t0[2]);   // start cap, faces -tangent
      const s0 = ringStart[0];
      for (let j = 0; j < rs; j++) this.idx.push(c0, s0 + (j + 1) % rs, s0 + j);
      const tl = T[n - 1], pl = points[n - 1];
      const cl = this._vertex(pl.x, pl.y, pl.z, tl[0], tl[1], tl[2]);       // end cap, faces +tangent
      const sl = ringStart[n - 1];
      for (let j = 0; j < rs; j++) this.idx.push(cl, sl + j, sl + (j + 1) % rs);
    }
  }

  /* A small WATERTIGHT bead (low-res UV sphere) that caps tube ends and reads as
     a lattice node. Single pole vertices and a wrapped longitude (no duplicated
     seam column) so it is a closed manifold with no boundary edges — earlier it
     had an open seam + degenerate poles, which showed up as boundary edges in the
     STL export. Outward normals. */
  addBead(center, radius, rings = 5, sectors = 8) {
    if (this.exportMode) {
      radius = Math.max(this.floorR, radius);                           // export floor
      if (radius < this.minRadius) this.minRadius = radius;             // telemetry
    }
    rings = Math.max(2, rings); sectors = Math.max(3, sectors);
    const cx = center.x, cy = center.y, cz = center.z;
    const north = this._vertex(cx, cy + radius, cz, 0, 1, 0);
    // Interior latitude rings ri = 1..rings-1 (poles handled separately).
    const ringStart = new Array(rings);
    for (let ri = 1; ri <= rings - 1; ri++) {
      const phi = (Math.PI * ri) / rings;
      const cyy = Math.cos(phi), sr = Math.sin(phi);
      ringStart[ri] = this.vcount;
      for (let si = 0; si < sectors; si++) {
        const th = (2 * Math.PI * si) / sectors;
        const nx = sr * Math.cos(th), ny = cyy, nz = sr * Math.sin(th);
        this._vertex(cx + nx * radius, cy + ny * radius, cz + nz * radius, nx, ny, nz);
      }
    }
    const south = this._vertex(cx, cy - radius, cz, 0, -1, 0);
    const r1 = ringStart[1];
    for (let si = 0; si < sectors; si++) {                              // north cap fan
      this.idx.push(north, r1 + si, r1 + (si + 1) % sectors);
    }
    for (let ri = 1; ri <= rings - 2; ri++) {                          // body quads
      const a = ringStart[ri], b = ringStart[ri + 1];
      for (let si = 0; si < sectors; si++) {
        const sn = (si + 1) % sectors;
        this.idx.push(a + si, a + sn, b + si, a + sn, b + sn, b + si);
      }
    }
    const rl = ringStart[rings - 1];
    for (let si = 0; si < sectors; si++) {                              // south cap fan
      this.idx.push(south, rl + (si + 1) % sectors, rl + si);
    }
  }

  /* A watertight ELLIPSOID — addBead's closed UV-sphere topology with per-axis
     radii, so a squashed sphere reads as a disc (flat) through a dome (tall). Used
     for the DISC centre. Normals use the normalized scaled offset (good enough for
     shading; watertightness is unaffected). Radii are floored in export mode. */
  addEllipsoid(center, rx, ry, rz, rings = 8, sectors = 14) {
    if (this.exportMode) {
      rx = Math.max(MIN_RADIUS_UNITS, rx); ry = Math.max(MIN_RADIUS_UNITS, ry); rz = Math.max(MIN_RADIUS_UNITS, rz);
      const mn = Math.min(rx, ry, rz); if (mn < this.minRadius) this.minRadius = mn;
    }
    rings = Math.max(2, rings); sectors = Math.max(3, sectors);
    const cx = center.x, cy = center.y, cz = center.z;
    const nrm = (x, y, z) => { const l = Math.hypot(x / rx, y / ry, z / rz) || 1; return [x / rx / l, y / ry / l, z / rz / l]; };
    let n = nrm(0, ry, 0);
    const north = this._vertex(cx, cy + ry, cz, n[0], n[1], n[2]);
    const ringStart = new Array(rings);
    for (let ri = 1; ri <= rings - 1; ri++) {
      const phi = (Math.PI * ri) / rings;
      const cyy = Math.cos(phi), sr = Math.sin(phi);
      ringStart[ri] = this.vcount;
      for (let si = 0; si < sectors; si++) {
        const th = (2 * Math.PI * si) / sectors;
        const ux = sr * Math.cos(th), uy = cyy, uz = sr * Math.sin(th);
        n = nrm(ux, uy, uz);
        this._vertex(cx + ux * rx, cy + uy * ry, cz + uz * rz, n[0], n[1], n[2]);
      }
    }
    n = nrm(0, -ry, 0);
    const south = this._vertex(cx, cy - ry, cz, n[0], n[1], n[2]);
    const r1 = ringStart[1];
    for (let si = 0; si < sectors; si++) this.idx.push(north, r1 + si, r1 + (si + 1) % sectors);
    for (let ri = 1; ri <= rings - 2; ri++) {
      const a = ringStart[ri], b = ringStart[ri + 1];
      for (let si = 0; si < sectors; si++) {
        const sn = (si + 1) % sectors;
        this.idx.push(a + si, a + sn, b + si, a + sn, b + sn, b + si);
      }
    }
    const rl = ringStart[rings - 1];
    for (let si = 0; si < sectors; si++) this.idx.push(south, rl + (si + 1) % sectors, rl + si);
  }

  /* A watertight SOLID blade from a grid of surface points {p, n}. Each point is
     offset ±half-thickness along its normal into a top face (+n) and a bottom
     face (-n); the whole grid perimeter is then sealed with a wall, so the blade
     encloses a volume instead of being a zero-thickness membrane. Used for SOLID
     sepals so they export watertight, the same way the Voronoi slab and solid
     petals gain thickness. Thickness is floored to the printable minimum in
     export mode (matches addSlab). The rim tube drawn over the margin hides the
     thin wall in the live view. */
  addBladeSolid(grid, thick) {
    const rows = grid.length;
    if (rows < 2) return;
    const cols = grid[0].length;
    if (cols < 2) return;
    if (this.exportMode) {
      thick = Math.max(this.floorF, thick);                             // export: floor blade thickness
      if (thick < this.minThick) this.minThick = thick;                 // telemetry
    }
    const H = thick * 0.5;

    // Two vertex layers: top (offset +n) then bottom (offset -n).
    const tBase = this.vcount;
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < cols; j++) {
        const { p, n } = grid[i][j];
        this._vertex(p.x + n.x * H, p.y + n.y * H, p.z + n.z * H, n.x, n.y, n.z);
      }
    const bBase = this.vcount;
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < cols; j++) {
        const { p, n } = grid[i][j];
        this._vertex(p.x - n.x * H, p.y - n.y * H, p.z - n.z * H, -n.x, -n.y, -n.z);
      }
    const T = (i, j) => tBase + i * cols + j;
    const B = (i, j) => bBase + i * cols + j;

    // Top face (+n) and bottom face (reversed winding -> -n).
    for (let i = 0; i < rows - 1; i++)
      for (let j = 0; j < cols - 1; j++) {
        const a = T(i, j), b = T(i, j + 1), c = T(i + 1, j), d = T(i + 1, j + 1);
        this.idx.push(a, b, c, b, d, c);
        const e = B(i, j), f = B(i, j + 1), g = B(i + 1, j), h = B(i + 1, j + 1);
        this.idx.push(e, g, f, f, g, h);
      }

    // Seal the perimeter: walk the grid boundary as one closed loop and bridge
    // the top layer to the bottom layer, so every rim edge is shared by exactly
    // two triangles (watertight).
    const loop = [];
    for (let j = 0; j < cols; j++) loop.push([0, j]);
    for (let i = 1; i < rows; i++) loop.push([i, cols - 1]);
    for (let j = cols - 2; j >= 0; j--) loop.push([rows - 1, j]);
    for (let i = rows - 2; i >= 1; i--) loop.push([i, 0]);
    for (let k = 0; k < loop.length; k++) {
      const [i0, j0] = loop[k];
      const [i1, j1] = loop[(k + 1) % loop.length];
      const t0 = T(i0, j0), t1 = T(i1, j1), b0 = B(i0, j0), b1 = B(i1, j1);
      this.idx.push(t0, b0, t1, t1, b0, b1);                            // wall quad
    }
  }

  /* A sealed slab lofted between two matched rings (a cell's outer boundary and
     its inner round hole). Each ring point carries a world position `p` and the
     surface normal `n`.

     Only the HOLE edge is a true free edge, so only it is FILLETED: every hole-rim
     point expands into a small cross-section that curves from the flat top face,
     around a rounded bullnose, down to the bottom face, with blended normals
     (surface-normal -> inward -> -surface-normal) so light rolls smoothly across it
     — the soft, tube-like roll the vein cylinders have.

     The CELL edge is left square (top/bottom at full ±half-thickness). Adjacent
     cells subdivide their shared edge identically, so their square top faces meet
     flush at full height and read as one continuous surface. Rounding it too (a
     bulge per cell) made each cell's surface dip to mid-height at the shared edge,
     leaving a groove down the middle of every strut — the "line between the bulges".
     Keeping it square removes that line. The tile stays solid and watertight: top
     face, bottom face, the rounded hole rim and the flush cell wall enclose it. */
  addSlab(outer, inner, thick) {
    const N = outer.length;
    if (N < 3 || inner.length !== N) return;
    if (this.exportMode) {
      thick = Math.max(this.floorF, thick);                            // export: floor sheet thickness
      if (thick < this.minThick) this.minThick = thick;                // telemetry
    }
    const H = thick * 0.5;

    // Hole-rim cross-section samples, from the top face (+90°) round the inward
    // bulge (0°) to the bottom face (-90°). The 0° pair repeats so that, when the
    // fillet is smaller than the half-thickness, the straight wall between the two
    // fillets is preserved (the wall the loft meets).
    const PHI = [Math.PI / 2, Math.PI / 4, 0, 0, -Math.PI / 4, -Math.PI / 2];
    const MH = PHI.length, TOP = 0, BOT = MH - 1;
    // Cell-wall samples (fewer — this wall stays flat, only its shading rounds).
    const PHO = [Math.PI / 2, Math.PI / 6, -Math.PI / 6, -Math.PI / 2];
    const MO = PHO.length;

    // Rounded profile column for the free hole edge: (p) rim point, (n) surface
    // normal, (e*) unit in-plane direction pointing into the hole, (r) fillet radius.
    const holeColumn = (p, n, ex, ey, ez, r) => {
      const col = new Array(MH), Hr = H - r;
      for (let m = 0; m < MH; m++) {
        const s = Math.sin(PHI[m]), c = Math.cos(PHI[m]);
        const cn = PHI[m] >= 0 ? Hr : -Hr;     // arc centre offset along the normal
        const ne = cn + r * s;                 // offset along surface normal
        const ee = -r + r * c;                 // offset along e (<=0: inset from the hole)
        const nx = n.x * s + ex * c, ny = n.y * s + ey * c, nz = n.z * s + ez * c;
        col[m] = this._vertex(
          p.x + n.x * ne + ex * ee, p.y + n.y * ne + ey * ee, p.z + n.z * ne + ez * ee,
          nx, ny, nz);
      }
      return col;
    };

    // Cell-edge wall column. Geometrically it is a straight drop at the boundary
    // (no outward inset), so two neighbouring tiles that share an edge meet flush
    // and read as one surface — no groove down the strut. But the normals sweep
    // surface-normal -> outward -> -surface-normal, so where the wall IS exposed
    // (only the petal's outer rim, which has no neighbour to hide it) it shades
    // like a soft rounded bead instead of a hard, comb-like edge.
    const wallColumn = (p, n, ex, ey, ez) => {
      const col = new Array(MO);
      for (let m = 0; m < MO; m++) {
        const s = Math.sin(PHO[m]), c = Math.cos(PHO[m]);
        const ne = H * s;                      // full ±half-thickness, no outward offset
        col[m] = this._vertex(
          p.x + n.x * ne, p.y + n.y * ne, p.z + n.z * ne,
          n.x * s + ex * c, n.y * s + ey * c, n.z * s + ez * c);
      }
      return col;
    };

    const colO = new Array(N), colI = new Array(N);
    for (let k = 0; k < N; k++) {
      const o = outer[k], i = inner[k];
      // Radial (outward) direction from the matched inner/outer pair — they sit on
      // the same ray from the cell centre.
      const rx = o.p.x - i.p.x, ry = o.p.y - i.p.y, rz = o.p.z - i.p.z;
      const W = Math.hypot(rx, ry, rz) || 1e-3;
      const r = Math.min(H, 0.45 * W) * SLAB_FILLET;      // hole fillet (kept < the strut width)
      const eo = projPerpUnit(rx, ry, rz, o.n);           // outward (petal rim shades round)
      const ei = projPerpUnit(-rx, -ry, -rz, i.n);        // into the hole
      colO[k] = wallColumn(o.p, o.n, eo[0], eo[1], eo[2]);
      colI[k] = holeColumn(i.p, i.n, ei[0], ei[1], ei[2], r);
    }

    for (let k = 0; k < N; k++) {
      const k1 = (k + 1) % N;
      const O = colO[k], O1 = colO[k1], I = colI[k], I1 = colI[k1];
      // Winding is reversed vs. the obvious loft so the outward face normal (used
      // as the STL facet normal) points OUT of the solid — the signed volume of a
      // voronoi petal comes out positive, matching the tube/ribbon parts. The live
      // view is unaffected (it shades from the per-vertex normals, DoubleSide).
      for (let m = 0; m < MO - 1; m++) {
        this.idx.push(O[m], O1[m], O1[m + 1],   O[m], O1[m + 1], O[m + 1]);   // cell wall
      }
      for (let m = 0; m < MH - 1; m++) {
        this.idx.push(I[m], I1[m + 1], I1[m],   I[m], I[m + 1], I1[m + 1]);   // rounded hole rim
      }
      this.idx.push(O[0], I1[TOP], O1[0],   O[0], I[TOP], I1[TOP]);              // top face (cell edge -> hole)
      this.idx.push(O[MO - 1], O1[MO - 1], I1[BOT],   O[MO - 1], I1[BOT], I[BOT]); // bottom face
    }
  }

  /* A closed, solid FLAT RIBBON lofted along a surface polyline — the leaf-vein
     analogue of addSlab (a solid strip instead of a perforated sheet). It turns
     a vein / strand / bone / lace line into real printable material: a thin flat
     lamina that lies IN the petal surface, so where veins cross and branch the
     ribbons interpenetrate into one connected solid (a leaf-skeleton), instead
     of the earlier bundle of open-ended round tubes.

     `stations` are { p:{x,y,z}, n:{x,y,z} } — the centre point on the petal
     surface and that surface's unit normal. `halfWidth` is the half-extent
     ACROSS the vein, in the surface plane (constant, [start,end], or t->w — so
     the vein still tapers midrib->veinlet). `halfThick` is the half-extent along
     the surface normal (the lamina's half-thickness). Thickness is capped to the
     width so a tapering tip stays a flat pad, never a tall fin, and in export
     mode both are floored to the minimum printable feature. */
  addRibbon(stations, halfWidth, halfThick) {
    const n = stations.length;
    if (n < 2) return;
    const resolve = (r, t) => typeof r === 'function' ? r(t) : Array.isArray(r) ? lerp(r[0], r[1], t) : r;

    const arc = new Array(n); arc[0] = 0;
    for (let i = 1; i < n; i++) {
      const a = stations[i].p, b = stations[i - 1].p;
      arc[i] = arc[i - 1] + Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    }
    const total = arc[n - 1] || 1;

    // Per-station orthonormal frame (tangent t along the vein, surface normal n,
    // in-surface side u = t x n) and the four cross-section corners.
    const Nn = [], Uu = [], TL = [], TR = [], BR = [], BL = [];
    for (let i = 0; i < n; i++) {
      const p = stations[i].p;
      let tx, ty, tz;
      if (i === 0)          { const q = stations[1].p;     tx = q.x - p.x; ty = q.y - p.y; tz = q.z - p.z; }
      else if (i === n - 1) { const q = stations[i - 1].p; tx = p.x - q.x; ty = p.y - q.y; tz = p.z - q.z; }
      else                  { const a = stations[i + 1].p, b = stations[i - 1].p; tx = a.x - b.x; ty = a.y - b.y; tz = a.z - b.z; }
      let tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      let nx = stations[i].n.x, ny = stations[i].n.y, nz = stations[i].n.z;
      let nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      const d = nx * tx + ny * ty + nz * tz;         // re-orthogonalize n against t
      nx -= tx * d; ny -= ty * d; nz -= tz * d;
      nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      let ux = ty * nz - tz * ny, uy = tz * nx - tx * nz, uz = tx * ny - ty * nx;   // u = t x n
      let ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul;
      const t = arc[i] / total;
      let hw = Math.max(0, resolve(halfWidth, t));
      let ht = Math.min(Math.max(0, resolve(halfThick, t)), hw);   // never a fin
      if (this.exportMode) {
        hw = Math.max(this.floorR, hw);
        ht = Math.max(this.floorR, ht);
        const f = Math.min(2 * hw, 2 * ht);
        if (f < this.minThick) this.minThick = f;
      }
      Nn[i] = [nx, ny, nz]; Uu[i] = [ux, uy, uz];
      TL[i] = [p.x + ux * hw + nx * ht, p.y + uy * hw + ny * ht, p.z + uz * hw + nz * ht];
      TR[i] = [p.x - ux * hw + nx * ht, p.y - uy * hw + ny * ht, p.z - uz * hw + nz * ht];
      BR[i] = [p.x - ux * hw - nx * ht, p.y - uy * hw - ny * ht, p.z - uz * hw - nz * ht];
      BL[i] = [p.x + ux * hw - nx * ht, p.y + uy * hw - ny * ht, p.z + uz * hw - nz * ht];
    }

    // Emit the four corner vertex-lines ONCE per station (shared by the faces
    // that meet there) so every edge is shared by exactly two triangles — the
    // ribbon is a watertight box beam with no boundary edges. Corner normals are
    // the average of the two faces meeting at that corner (a soft bevel; the STL
    // uses per-facet normals regardless). Corner order around the section is
    // TL -> TR -> BR -> BL (clockwise seen from +tangent).
    const unit = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
    const ring = new Array(n);
    for (let i = 0; i < n; i++) {
      const u = Uu[i], nn = Nn[i];
      const nTL = unit(u[0] + nn[0], u[1] + nn[1], u[2] + nn[2]);
      const nTR = unit(-u[0] + nn[0], -u[1] + nn[1], -u[2] + nn[2]);
      const nBR = unit(-u[0] - nn[0], -u[1] - nn[1], -u[2] - nn[2]);
      const nBL = unit(u[0] - nn[0], u[1] - nn[1], u[2] - nn[2]);
      const base = this.vcount;
      this._vertex(TL[i][0], TL[i][1], TL[i][2], nTL[0], nTL[1], nTL[2]);
      this._vertex(TR[i][0], TR[i][1], TR[i][2], nTR[0], nTR[1], nTR[2]);
      this._vertex(BR[i][0], BR[i][1], BR[i][2], nBR[0], nBR[1], nBR[2]);
      this._vertex(BL[i][0], BL[i][1], BL[i][2], nBL[0], nBL[1], nBL[2]);
      ring[i] = base;   // corners at base+0(TL) +1(TR) +2(BR) +3(BL)
    }

    // Four side faces, each wrapping corner c -> c+1 around the loop, wound so
    // the outward normal points away from the beam axis.
    for (let c = 0; c < 4; c++) {
      const cn = (c + 1) % 4;
      for (let i = 0; i < n - 1; i++) {
        const A = ring[i] + c, B = ring[i] + cn, A1 = ring[i + 1] + c, B1 = ring[i + 1] + cn;
        this.idx.push(A, B1, B, A, A1, B1);
      }
    }

    // End caps (front faces -tangent, back faces +tangent) seal the beam.
    const f = ring[0], b = ring[n - 1];
    this.idx.push(f + 0, f + 2, f + 1, f + 0, f + 3, f + 2);   // front cap (-t)
    this.idx.push(b + 0, b + 1, b + 2, b + 0, b + 2, b + 3);   // back cap (+t)
  }

  /* Merge another accumulator's mesh into this one under a THREE.Matrix4 that is
     a rigid rotation + uniform scale + translation (no shear, no mirror). Positions
     go through the full matrix; normals through the rotation part only (the shared
     uniform scale drops out on renormalization). Because the map is injective and
     orientation-preserving (uniform positive scale, det > 0), triangle winding and
     every shared/boundary edge are preserved exactly — a watertight source stays
     watertight. Used to place the side bud (built upright in its own accumulator)
     onto the offshoot tip at the right position, orientation and scale. */
  appendTransformed(src, m4) {
    const e = m4.elements;
    const base = this.vcount;
    const sp = src.pos, sn = src.nor, nV = sp.length / 3;
    for (let i = 0; i < nV; i++) {
      const x = sp[i * 3], y = sp[i * 3 + 1], z = sp[i * 3 + 2];
      const px = e[0] * x + e[4] * y + e[8] * z + e[12];
      const py = e[1] * x + e[5] * y + e[9] * z + e[13];
      const pz = e[2] * x + e[6] * y + e[10] * z + e[14];
      let nx = e[0] * sn[i * 3] + e[4] * sn[i * 3 + 1] + e[8] * sn[i * 3 + 2];
      let ny = e[1] * sn[i * 3] + e[5] * sn[i * 3 + 1] + e[9] * sn[i * 3 + 2];
      let nz = e[2] * sn[i * 3] + e[6] * sn[i * 3 + 1] + e[10] * sn[i * 3 + 2];
      const l = Math.hypot(nx, ny, nz) || 1;
      this._vertex(px, py, pz, nx / l, ny / l, nz / l);
    }
    const si = src.idx;
    for (let k = 0; k < si.length; k++) this.idx.push(base + si[k]);
    // Carry the sub-mesh's thinnest-feature telemetry through, converted to real
    // world units by the matrix's uniform scale s (its features were floored to
    // min/s locally, so s * that == the true minimum — still >= the print floor).
    const s = Math.hypot(e[0], e[1], e[2]) || 1;
    if (src.minRadius * s < this.minRadius) this.minRadius = src.minRadius * s;
    if (src.minThick * s < this.minThick) this.minThick = src.minThick * s;
  }

  toGeometry() {
    if (this.vcount === 0) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setIndex(new THREE.Uint32BufferAttribute(this.idx, 1));
    g.computeBoundingSphere();
    return g;
  }
}

// Component of (vx,vy,vz) perpendicular to unit normal n, returned as a unit
// vector — the in-plane direction used to sweep a filleted rim. Falls back to any
// perpendicular of n if the input is (near-)parallel to n.
function projPerpUnit(vx, vy, vz, n) {
  const d = vx * n.x + vy * n.y + vz * n.z;
  let px = vx - d * n.x, py = vy - d * n.y, pz = vz - d * n.z;
  let l = Math.hypot(px, py, pz);
  if (l < 1e-6) { const p = perpendicular([n.x, n.y, n.z]); return p; }
  return [px / l, py / l, pz / l];
}

// smallest-component axis gives a stable perpendicular to t
function perpendicular(t) {
  const a = Math.abs(t[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const cx = t[1] * a[2] - t[2] * a[1];
  const cy = t[2] * a[0] - t[0] * a[2];
  const cz = t[0] * a[1] - t[1] * a[0];
  const l = Math.hypot(cx, cy, cz) || 1;
  return [cx / l, cy / l, cz / l];
}

// rotate vector v around unit axis k by angle (Rodrigues)
function rodrigues(v, k, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  const dot = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
  const crx = k[1] * v[2] - k[2] * v[1];
  const cry = k[2] * v[0] - k[0] * v[2];
  const crz = k[0] * v[1] - k[1] * v[0];
  return [
    v[0] * c + crx * s + k[0] * dot * (1 - c),
    v[1] * c + cry * s + k[1] * dot * (1 - c),
    v[2] * c + crz * s + k[2] * dot * (1 - c),
  ];
}


/* ===================================================================
   2. PARAMETERS
   Raw UI values -> a resolved petal-parameter object (P) consumed by the
   geometry module. One place maps sliders to internal ranges.
   =================================================================== */

function resolveParams(ui) {
  return {
    W: ui.width,
    taper: ui.taper,
    tip: ui.tip,                                 // TIP SHAPE: sharpness of every tip (apex + teeth)
    bloom: ui.bloom * DEG,
    curl: ui.centerCurve * CENTER_CURVE_SCALE,   // centre curve -> spine curvature
    edgeCurve: ui.edgeCurve,                     // top-down side billow (+) / pinch (-)
    edgeProfile: ui.edgeProfile,                 // out-of-plane edge lift, parallel to the centre curve
    petalCup: ui.petalCup,                       // across-width bowl: cupped (+) / flat (0) / reflexed (-)
    tipStyle: ui.tipStyle,                       // petal-edge tip style (clean/jagged/…)
    tipRegion: ui.tipRegion,                     // how far teeth reach from the apex down
    tipLength: ui.tipLength,                     // how far all tips extend outward
    tipFrequency: ui.tipFrequency,               // total number of tips, including the apex
    tipIrregularity: ui.tipIrregularity,         // 0 uniform -> 1 varied length & angle
    edgeNoise: ui.edgeNoise,                      // organic non-periodic edge crinkle (any tip style)
    edgeNoiseScale: ui.edgeNoiseScale,           // crinkle frequency: broad -> dense
    infillType: ui.infillType,                   // 'veins' (leaf venation), 'voronoi', or 'strands'
    density: ui.density,                          // raw density: vein depth OR voronoi cell count
    strandCount: ui.strandCount,                 // STRANDS: number of radial strands across the width
    strandWidth: ui.strandWidth,                 // STRANDS: tube thickness as a fraction of the gap
    strandTaper: ui.strandTaper,                 // STRANDS: 0 uniform -> 1 fine point at the tip
    strandCurvature: ui.strandCurvature,         // STRANDS: 0 straight radial -> 1 organic bow
    strandIrregularity: ui.strandIrregularity,   // STRANDS: 0 uniform width -> 1 varied strand widths
    boneCount: ui.boneCount,                     // BONE: number of rib pairs along the spine
    boneWidth: ui.boneWidth,                     // BONE: thickness of the spine and ribs
    boneCurve: ui.boneCurve,                     // BONE: -1 swept to base <- 0 straight out -> 1 swept to tip
    boneSpread: ui.boneSpread,                   // BONE: how far the ribs reach toward the margin
    boneOutline: ui.boneOutline,                 // BONE: draw the petal outline (rim) or not
    laceSwirl: ui.laceSwirl,                     // LACE: 0 loose scrolls -> 1 tight coils
    scallopCount: ui.scallopCount,               // SCALLOP edge: scallops per side (width)
    scallopHeight: ui.scallopHeight,             // SCALLOP edge: how far each scallop bulges out
    centerArch: ui.centerArch,                   // CENTER architecture: classic | dense | disc | petaloid
    centerType: ui.centerType,                   // CLASSIC style: 'stamens' | 'pistil' | 'none'
    centerCount: ui.centerCount,                 // CLASSIC: number of filaments (amount)
    centerLength: ui.centerLength,               // CLASSIC: filament length (0..1)
    centerTipSize: ui.centerTipSize,             // CLASSIC: anther/stigma bead size (0..1)
    denseStamenCount: ui.denseStamenCount,       // DENSE CLUSTER: fine filaments (dozens..200+)
    denseStamenLength: ui.denseStamenLength,     // DENSE CLUSTER: filament length
    carpelCount: ui.carpelCount,                 // DENSE CLUSTER: central rounded carpels (few)
    carpelSize: ui.carpelSize,                   // DENSE CLUSTER: carpel size
    discSize: ui.discSize,                       // DISC: dome radius
    discHeight: ui.discHeight,                   // DISC: flat -> domed
    ringStamenCount: ui.ringStamenCount,         // DISC: stamens ringing the dome edge
    ringStamenLength: ui.ringStamenLength,       // DISC: ring stamen length
    fillPetalCount: ui.fillPetalCount,           // PETALOID FILL: tiny centre petals (dozens..200+)
    fillPetalSize: ui.fillPetalSize,             // PETALOID FILL: size vs the outer petal
    fillDensity: ui.fillDensity,                 // PETALOID FILL: loose -> fully overlapping
    fillCurl: ui.fillCurl,                       // PETALOID FILL: open (mum) -> cupped (ranunculus)
    L: PETAL_LENGTH,
    r0: BASE_RADIUS,
    cup: CUP_AMOUNT,
    // Density drives the fractal leaf venation: how many secondaries branch
    // off the midrib, how deep the branching recurses (the "fractaling"), and
    // how many tertiary rungs ladder each strip.
    secondaries: clamp(Math.round(ui.density * 0.5) + 2, 4, 8),
    maxDepth: clamp(Math.round((ui.density - 3) / 3) + 2, 2, 4),
    crossPerStrip: clamp(Math.round(ui.density * 0.4), 2, 5),
    softness: ui.softness,   // 0 = crisp branch angles, 1 = rounded, organic
    tubeRadius: lerp(0.008, 0.030, ui.tube),
  };
}

/* ===================================================================
   3. PETAL + BLOOM ASSEMBLY
   =================================================================== */

/* Build one petal's leaf-venation network into an accumulator, placed on the
   phyllotactic spiral: rotated to `az`, leaned by `tilt`, based at
   `radialOffset` out from the axis, and lifted by `baseHeight`. The abstract,
   symmetric vein graph comes from buildVenation (flattened space); here we map
   each vein onto the cupped 3D petal surface and extrude it as a tapering
   tube — thick midrib down to hair-fine veinlets. `seed` seeds this petal's
   PRNG (the venation gets one stream, the edge tips an independent one so
   changing density doesn't reshuffle the tips). */
function buildPetalInto(acc, P, az, baseHeight, radialOffset, tilt, seed) {
  const rng = mulberry32(seed);
  const spine = buildSpine(P);
  const outline = buildSilhouette(P, P.outlineSteps || 56);   // leaves use a lighter margin
  // INFILL: leaf venation (default) or a bilaterally-symmetric Voronoi mesh.
  // Both return { veins, nodes } in flattened space, rendered identically below.
  // SOLID-BLADE petals (solid sepals, petaloid-fill centres) skip this entirely —
  // the blade discards the infill, and computing it per petal is wasted work that
  // matters at 100+ fill petals.
  const ven = P.solidBlade ? null
    : P.infillType === 'voronoi'
    ? buildVoronoi(P, rng, { density: P.density, softness: P.softness })
    : P.infillType === 'strands'
    ? buildStrands(P, {
        count: P.strandCount, width: P.strandWidth,
        taper: P.strandTaper, curvature: P.strandCurvature,
        irregularity: P.strandIrregularity, seed,
      })
    : P.infillType === 'bone'
    ? buildBone(P, {
        count: P.boneCount, width: P.boneWidth,
        curve: P.boneCurve, spread: P.boneSpread,
      })
    : P.infillType === 'lace'
    ? buildLace(P, rng, { density: P.density, swirl: P.laceSwirl })
    : buildVenation(P, rng, {
        secondaries: P.secondaries, crossPerStrip: P.crossPerStrip,
        maxDepth: P.maxDepth, softness: P.softness,
      });

  const place = (localPt) => placePoint(localPt, az, baseHeight, radialOffset, tilt);
  const toWorld = (pt) => place(mapPointToSurface(pt, P, spine));
  // A vein point promoted to a ribbon station: its world position on the cupped
  // petal surface plus that surface's world normal (the lamina's thickness axis).
  const station = (pt) => ({
    p: place(mapPointToSurface(pt, P, spine)),
    n: placeDir(surfaceNormalAt(pt, P, spine), az, tilt),
  });

  // SOLID BLADE: render the petal as one filled, soft-edged solid instead of a
  // vein/infill skeleton (used by solid sepals). The blade is a watertight slab
  // (top + bottom + sealed rim), so it exports as a printable solid; a rim tube
  // still traces the margin for a clean rounded lip. Then we're done — the
  // skeleton infill below is skipped entirely.
  if (P.solidBlade) {
    // Blade resolution is overridable (P.bladeUSteps/bladeVSteps) so a leaf can use
    // a lighter grid than a sepal; defaults reproduce the original 26x12 exactly.
    // Tiny petaloid-fill petals pass a coarser grid and skip the rim (bladeNoRim) to
    // stay cheap at high counts. The blade itself is watertight without the rim.
    const { rows } = buildBlade(P, { uSteps: P.bladeUSteps || 26, vSteps: P.bladeVSteps || 12 });
    const grid = rows.map((row) => row.map((pt) => ({
      p: place(mapPointToSurface(pt, P, spine)),
      n: placeDir(surfaceNormalAt(pt, P, spine), az, tilt),
    })));
    acc.addBladeSolid(grid, P.tubeRadius * SLAB_THICK);   // same thickness rule as the Voronoi sheet
    if (!P.bladeNoRim) {
      const rim = outline.map(toWorld);
      rim.push(rim[0]);                              // close the loop at the base
      acc.addTube(rim, P.tubeRadius * RIM_WIDTH, 0, P.rimSegments || RADIAL_SEGMENTS);
    }
    return;
  }

  // PETAL EDGE: the tip style can reshape the outline. JAGGED turns the tip end
  // into a row of teeth (a rim weaving through them + a mid-vein per tooth);
  // RUFFLED rolls the tip end into a smooth continuous wave (no extra veins).
  // Either returns { rim, teethVeins }; otherwise the rim is the smooth outline.
  const tipRng = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  const jag = buildJaggedEdge(P, spine, tipRng) || buildRuffledEdge(P, spine, tipRng) || buildScallopEdge(P, spine);

  // Rim: one continuous closed tube along the (possibly jagged) petal margin.
  // BONE can opt out of the outline entirely, leaving just the bare rib skeleton.
  const drawRim = !(P.infillType === 'bone' && P.boneOutline === false);
  if (drawRim) {
    const rim = jag ? jag.rim.map(place) : outline.map(toWorld);
    rim.push(rim[0]);                            // close the loop at the petal base
    acc.addTube(rim, P.tubeRadius * RIM_WIDTH, 0); // continuous — no join to flare
  }

  // Veins: each is a flattened-space polyline with relative end line-weights.
  // Map its points onto the cupped surface and loft one smoothly-tapering SOLID
  // FLAT RIBBON along it (a leaf-vein lamina), so line weight thins from the
  // midrib through secondary, tertiary and veinlet while every vein is real,
  // printable material lying in the petal surface. Where veins branch and cross
  // the ribbons interpenetrate into one connected solid — a leaf-skeleton.
  // When the petal is RUFFLED the whole surface buckles, so veins are first
  // densified (in flattened space) to a spacing fine enough to ride the flutes
  // without faceting — step scales with the flute frequency.
  const ruffled = P.tipStyle === 'ruffled';
  // finer than the flute spacing so infill rides the coil + its second-scale
  // frills (~2.7x the base frequency) without faceting.
  const veinStep = ruffled ? clamp(PETAL_LENGTH * 0.8 / (Math.max(1, P.tipFrequency) * 9), 0.03, 0.14) : 0;
  const lamHalf = P.tubeRadius * LAMINA_HALF;    // lamina half-thickness (flat sheet)
  for (const vein of ven.veins) {
    const pts = ruffled ? densifyByStep(vein.points, veinStep) : vein.points;
    const stations = pts.map(station);
    // Ribbon half-WIDTH (across the vein, in the surface) = the old tube radius,
    // so the vein keeps its exact width taper. vein.rad (Voronoi junction bulge)
    // is a t->weight profile; otherwise the weight tapers linearly w0 -> w1.
    const halfWidth = vein.rad
      ? (t) => P.tubeRadius * vein.rad(t)
      : [P.tubeRadius * vein.w0, P.tubeRadius * vein.w1];
    acc.addRibbon(stations, halfWidth, lamHalf);
  }
  // A fine mid-vein reaching from inside the petal into each jagged tooth, so
  // the veins extend into the jagged edge along with the outline (skipped when
  // the outline is turned off).
  if (jag && drawRim) {
    for (const v of jag.teethVeins) {
      acc.addTube(v.map(place), [P.tubeRadius * 0.30, P.tubeRadius * 0.10], 0, 6);
    }
  }
  // Welded caps seal the open tube ends (free vein tips, and the T-junctions
  // where a secondary meets the midrib) so nothing reads as a hollow ring.
  for (const node of ven.nodes) {
    acc.addBead(toWorld(node), P.tubeRadius * node.width * 1.15, 4, 7);
  }

  // VORONOI infill is a solid perforated SHEET, not tubes: each cell is a sealed
  // slab lofted between its outer boundary and its round inner hole. Map both
  // rings onto the surface (with normals) and let the accumulator build the
  // top/bottom faces and rims. Adjacent cells share outer edges, so the slabs
  // tile into one continuous membrane with round holes.
  if (ven.slabs) {
    const thick = P.tubeRadius * SLAB_THICK;
    for (const slab of ven.slabs) {
      acc.addSlab(slab.outer.map(station), slab.inner.map(station), thick);
    }
  }
}

/* The flower's central part — a cluster of filaments, each a slender tube tipped
   with a rounded bead. Two styles: STAMENS spread outward into a fan of thin
   filaments with small anthers; PISTIL stands as a tighter, taller, near-upright
   bundle of thicker styles with larger stigma knobs. Its filament count, length
   and tip-bead size are all controllable, and NONE leaves the centre bare.
   `centerHeight` follows the receptacle so it stays seated in an elevated (cone)
   or depressed (bowl) middle. */
function buildCoreInto(acc, P, centerHeight, rng) {
  // CENTER TYPE dispatch. CLASSIC (default) falls through to the original
  // stamens / pistil / none cluster below — unchanged. The others are separate
  // builders, all writing into the same core accumulator (core material / glow).
  if (P.centerArch === 'dense') return buildDenseClusterInto(acc, P, centerHeight, rng);
  if (P.centerArch === 'disc') return buildDiscInto(acc, P, centerHeight, rng);
  if (P.centerArch === 'petaloid') return buildPetaloidFillInto(acc, P, centerHeight, rng);
  if (P.centerType === 'none') return;
  const pistil = P.centerType === 'pistil';
  const N   = clamp(Math.round(P.centerCount), 1, 60);
  const len = clamp(P.centerLength, 0, 1);
  const tip = clamp(P.centerTipSize, 0, 1);

  // PISTIL: taller reach, tighter to the axis, nearly vertical, fatter style and
  // a bigger stigma knob. STAMENS (defaults) reproduce the original cluster:
  // H = 0.34, filament 1.05x, anther 2.1x at length 0.5 / tip 0.35.
  const H       = pistil ? (0.16 + 0.85 * len) : (0.10 + 0.48 * len);   // max reach
  const spreadR = CORE_SPREAD * (pistil ? 0.42 : 1.0);                  // cluster radius
  const leanMax = pistil ? 0.05 : 0.14;                                 // outward bow
  const filR    = P.tubeRadius * (pistil ? 1.5 : 1.05);                 // filament thickness
  const beadR   = P.tubeRadius * lerp(pistil ? 1.4 : 0.8, pistil ? 6.0 : 4.5, tip);

  for (let i = 0; i < N; i++) {
    const a = rng() * Math.PI * 2;
    const rr = spreadR * Math.sqrt(rng());
    const h = H * (0.6 + 0.4 * rng());
    const lean = leanMax * (0.5 + rng());
    const steps = 5;
    const pts = [];
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const rad = rr + lean * t;
      const yy = h * Math.sin((t * Math.PI) / 2);
      pts.push({ x: rad * Math.cos(a), y: centerHeight + yy, z: rad * Math.sin(a) });
    }
    acc.addTube(pts, filR, 0, CENTER_TUBE_SEGS);
    acc.addBead(pts[pts.length - 1], beadR, NODE_BEAD_RINGS, NODE_BEAD_SECTORS);  // anther / stigma
  }
}

/* DENSE CLUSTER — peony centre: many very fine, short filaments packed densely
   around a smaller, separate cluster of thicker rounded carpels that sit slightly
   lower (recessed) at the very centre. */
function buildDenseClusterInto(acc, P, centerHeight, rng) {
  const N   = clamp(Math.round(P.denseStamenCount), 1, 240);
  const len = clamp(P.denseStamenLength, 0, 1);
  const H   = 0.05 + 0.30 * len;
  const filR  = P.tubeRadius * 0.5;                     // finer than the classic 1.05x filament
  const beadR = P.tubeRadius * 0.9;                     // tiny anther
  const innerR = CORE_SPREAD * 0.55;                    // ring starts just outside the carpels
  const outerR = CORE_SPREAD * 1.7;
  for (let i = 0; i < N; i++) {
    const a = rng() * Math.PI * 2;
    const rr = lerp(innerR, outerR, Math.sqrt(rng()));
    const h = H * (0.7 + 0.4 * rng());
    const lean = 0.10 * (0.5 + rng());
    const pts = [];
    for (let k = 0; k <= 4; k++) {
      const t = k / 4, rad = rr + lean * t;
      pts.push({ x: rad * Math.cos(a), y: centerHeight + h * Math.sin((t * Math.PI) / 2), z: rad * Math.sin(a) });
    }
    acc.addTube(pts, filR);
    acc.addBead(pts[pts.length - 1], beadR, 3, 5);
  }
  const M  = clamp(Math.round(P.carpelCount), 1, 12);
  const cR = P.tubeRadius * lerp(2.4, 6.0, clamp(P.carpelSize, 0, 1));
  const clusterR = CORE_SPREAD * 0.34;
  for (let j = 0; j < M; j++) {
    const a = (j / M) * Math.PI * 2 + 0.4;
    const rr = M === 1 ? 0 : clusterR * (0.35 + 0.65 * rng());
    // few, large, dead-centre carpels — smooth them to match the classic anthers (PR #28)
    acc.addBead({ x: rr * Math.cos(a), y: centerHeight - cR * 0.35, z: rr * Math.sin(a) }, cR, NODE_BEAD_RINGS, NODE_BEAD_SECTORS);
  }
}

/* DISC — anemone centre: a solid rounded dome/disc (a closed ellipsoid) with a
   ring of short, fine stamens emerging from just around its outer edge, splaying
   outward — not covering the dome's surface. */
function buildDiscInto(acc, P, centerHeight, rng) {
  const R  = CORE_SPREAD * lerp(1.3, 3.4, clamp(P.discSize, 0, 1));     // disc radius
  const Hy = R * lerp(0.14, 0.95, clamp(P.discHeight, 0, 1));           // flat disc -> tall dome
  acc.addEllipsoid({ x: 0, y: centerHeight + Hy * 0.5, z: 0 }, R, Hy, R, 9, 16);
  const N   = clamp(Math.round(P.ringStamenCount), 0, 200);
  const len = clamp(P.ringStamenLength, 0, 1);
  const h   = 0.03 + 0.20 * len;
  const filR  = P.tubeRadius * 0.5;
  const beadR = P.tubeRadius * 0.9;
  for (let i = 0; i < N; i++) {
    const a = (i / Math.max(1, N)) * Math.PI * 2 + rng() * 0.12;
    const baseR = R * 0.97, splay = R * 0.55;
    const pts = [];
    for (let k = 0; k <= 4; k++) {
      const t = k / 4, rad = baseR + splay * t;
      pts.push({ x: rad * Math.cos(a), y: centerHeight + Hy * 0.16 + h * Math.sin((t * Math.PI) / 2) * 0.7, z: rad * Math.sin(a) });
    }
    acc.addTube(pts, filR);
    acc.addBead(pts[pts.length - 1], beadR, 3, 5);
  }
}

/* PETALOID FILL — ranunculus / mum centre: many tiny petals packed into the
   centre on a phyllotactic (golden-angle) spiral, REPLACING the stamen/pistil
   systems. Each is the SAME petal builder (buildPetalInto) in solid-blade mode —
   coarse grid, no rim — inheriting the current petal shape (silhouette, cup, edge
   curves, ruffle, edge noise). The full venation/infill is intentionally skipped:
   reusing it for 100+ petals would be catastrophic (a Voronoi petal alone is
   ~160k tris). FILL CURL closes each tiny petal (open mum -> cupped ranunculus). */
function buildPetaloidFillInto(acc, P, centerHeight, rng) {
  const N    = clamp(Math.round(P.fillPetalCount), 1, 240);
  const size = clamp(P.fillPetalSize, 0.03, 0.6);
  const dens = clamp(P.fillDensity, 0, 1);
  const curl = clamp(P.fillCurl, 0, 1);
  const petalL = P.L * size;
  const Pfill = {
    ...P,
    L: petalL,
    bloom: lerp(0.95, 0.12, curl),                      // open (mum) -> tightly closed (ranunculus)
    curl: lerp(0.25, 1.15, curl) * CENTER_CURVE_SCALE,  // inward spine curve
    edgeProfile: 0,                                      // keep the tiny blades tidy
    solidBlade: true, bladeNoRim: true, bladeUSteps: 10, bladeVSteps: 5,
  };
  const spiralK = lerp(0.16, 0.05, dens);               // spacing constant (smaller = tighter overlap)
  const maxR    = CORE_SPREAD * lerp(2.7, 1.0, dens);
  for (let i = 0; i < N; i++) {
    const az = i * GOLDEN_ANGLE;
    const rr = Math.min(maxR, spiralK * Math.sqrt(i));
    const tRatio = N > 1 ? i / (N - 1) : 0;             // 0 = inner, 1 = outer
    const tilt = lerp(1.0, 0.3, tRatio);               // inner upright, outer opening
    const height = centerHeight + lerp(0.12, 0.0, tRatio) * petalL;
    buildPetalInto(acc, Pfill, az, height, rr, tilt, SEED_BASE + 4200 + i * 53);
  }
}

/* BASE parts — all built from the SAME tapering tubes as the petals/veins (into
   the petal mesh), so they read as wireframe line-work of the same plant, not a
   solid object the flower sits on.

   STEM — a slender tapering tube descending from the base, gently curved (STEM
   CURVE) and articulated with LEAF NODES: junction points along its length where
   a leaf will attach in a later pass. Each node can swell the tube locally and
   kink its direction slightly (NODE PROMINENCE), the way a real stem bends at each
   node; at prominence 0 the stem stays smooth and uniform. STEM THICKNESS scales
   the whole tube. An optional SIDE BUD branches off partway down (buildBudBranchInto).
   Built like every other part — closed tapering tubes + watertight beads — so it
   stays print-safe. */

// smooth 0->1 ramp between edges a and b (Hermite)
const smoothstep01 = (a, b, x) => { const t = clamp((x - a) / ((b - a) || 1e-6), 0, 1); return t * t * (3 - 2 * t); };
// a point on the cubic Bezier through p0..p3
function bezier3(p0, p1, p2, p3, t) {
  const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
           y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
           z: a * p0.z + b * p1.z + c * p2.z + d * p3.z };
}

// Leaf-node arc positions along the stem (0 top -> 1 bottom), evenly spread but
// tucked away from the very top (under the flower) and the very bottom. Shared by
// the tube-radius swell, the node beads and the offshoot branch point so they all
// line up on the same junctions.
function stemNodeParams(nodeCount) {
  const n = clamp(Math.round(nodeCount), 0, 8);
  const ts = [];
  for (let k = 0; k < n; k++) ts.push(n === 1 ? 0.55 : lerp(0.16, 0.86, k / (n - 1)));
  return ts;
}

// The stem centreline, a polyline from (cx,cy,cz) straight down by `length`.
// `curve` bends it in a gentle eased arc; each leaf node then adds a small smooth
// heading change below it (in its own spread-out horizontal direction), scaled by
// prominence — so the stem articulates at the nodes instead of running ruler-straight.
function stemCenterline(cx, cy, cz, opts) {
  const N = 48;
  const length = opts.length;
  const curve = clamp(opts.curve, -1, 1);
  const prom = clamp(opts.nodeProminence, 0, 1);
  const nodeTs = stemNodeParams(opts.nodeCount);
  const nodeAng = nodeTs.map((_, k) => k * GOLDEN_ANGLE);   // spread the kink directions in plan
  const bendMag = curve * length * 0.42;                    // primary arc, in +x
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    let hx = bendMag * t * t, hz = 0;                       // eased low so the top stays put
    for (let k = 0; k < nodeTs.length; k++) {
      const past = t - nodeTs[k];
      if (past <= 0) continue;
      const drift = prom * length * 0.13 * past * smoothstep01(0, 0.12, past);
      hx += Math.cos(nodeAng[k]) * drift;
      hz += Math.sin(nodeAng[k]) * drift;
    }
    pts.push({ x: cx + hx, y: cy - length * t, z: cz + hz });
  }
  const nodes = nodeTs.map((t, k) => ({ t, ang: nodeAng[k], pos: pts[Math.round(t * N)] }));
  return { pts, nodes, N, length };
}

// Tube radius along the stem: a base taper (thick at the flower -> slender below)
// scaled by THICKNESS, plus a local gaussian swell at each node scaled by
// PROMINENCE (0 => perfectly smooth). `t` is the tube's arc fraction, which for a
// near-vertical stem tracks the centreline parameter closely, so the swells land
// on the nodes.
function stemRadiusFn(P, opts) {
  const thickness = clamp(opts.thickness, 0.3, 4);
  const prom = clamp(opts.nodeProminence, 0, 1);
  const nodeTs = stemNodeParams(opts.nodeCount);
  return (t) => {
    // Smooth local swelling at each node — a gentle spindle, NOT a bead-on-a-string:
    // the bulge is wide enough (sigma ~0.055) and modest enough that it reads as a
    // thickened joint. Prominence 0 => a perfectly uniform taper.
    let swell = 0;
    for (const tk of nodeTs) { const d = (t - tk) / 0.055; swell += prom * 0.6 * Math.exp(-d * d); }
    return P.tubeRadius * lerp(4.0, 1.8, t) * thickness * (1 + swell);
  };
}

// Build the main stem into `acc` and return its centreline (so a side bud can
// branch off it). Returns null for a degenerate length. The node markers are the
// tube's own local swellings (stemRadiusFn) plus the kinks in the centreline, so
// the stem stays one continuous watertight solid — no separate beads to read as a
// string of balls. cl.nodes carries each junction's world position + direction for
// the leaf geometry that attaches there in a later pass.
function buildStemInto(acc, P, cx, cy, cz, opts) {
  const length = clamp(opts.length, 0.2, 6);
  if (length <= 1e-3) return null;
  const o = { ...opts, length };
  const cl = stemCenterline(cx, cy, cz, o);
  acc.addTube(cl.pts, stemRadiusFn(P, o), 0, CENTER_TUBE_SEGS);   // thick at the flower, slender below
  return cl;
}

/* SIDE BUD — an optional secondary offshoot that branches partway down the main
   stem and ends in a smaller bud of the SAME bloom. Kept isolated from the petal
   builders: it reuses buildBloomInto to grow a simplified, more-closed bloom into
   its OWN accumulator, then seats that upright bloom on the offshoot tip with a
   rigid rotate + uniform downscale (appendTransformed). Two modes: 'tight' (a
   near-closed bud) and 'early' (a smaller, less-detailed opening bloom). Print-safe:
   the offshoot is a capped tube, the bloom is the same watertight petal geometry,
   and the downscale is floor-compensated so struts still print >= the minimum. */
function buildBudBranchInto(acc, P, ui, cl, stemOpts) {
  const mainLen = cl.length;
  const branchPos = cl.pts[Math.round(0.45 * cl.N)];       // ~45% down the stem (fixed default, v1)
  const thickness = clamp(stemOpts.thickness, 0.3, 4);
  // Offshoot: a cubic arc that leaves the stem outward and swings up, so the bud
  // faces up-and-out the way a real side bud sits.
  const phi = GOLDEN_ANGLE * 1.5;                          // stable outward azimuth
  const dirx = Math.cos(phi), dirz = Math.sin(phi);
  const offLen = mainLen * 0.5;
  const out = offLen * 0.95, rise = offLen * 0.55;         // reach well out, rise modestly so the
  const p0 = branchPos;                                    // bud sits below + beside the main bloom (not tucked behind it)
  const p1 = { x: p0.x + dirx * out * 0.55, y: p0.y + rise * 0.10, z: p0.z + dirz * out * 0.55 };
  const p3 = { x: p0.x + dirx * out,         y: p0.y + rise,        z: p0.z + dirz * out };
  const p2 = { x: p3.x - dirx * out * 0.12,  y: p3.y - rise * 0.55, z: p3.z - dirz * out * 0.12 };
  const M = 20, off = [];
  for (let i = 0; i <= M; i++) off.push(bezier3(p0, p1, p2, p3, i / M));
  const rBranch = P.tubeRadius * 3.0 * thickness, rTip = P.tubeRadius * 2.0 * thickness;
  acc.addTube(off, (t) => lerp(rBranch, rTip, t), 0, CENTER_TUBE_SEGS);
  acc.addBead(branchPos, rBranch * 1.3, NODE_BEAD_RINGS, NODE_BEAD_SECTORS);   // weld the junction to the stem
  // Bud at the tip, pointing along the offshoot's end tangent.
  const tip = off[M], prev = off[M - 1];
  let dx = tip.x - prev.x, dy = tip.y - prev.y, dz = tip.z - prev.z;
  const dl = Math.hypot(dx, dy, dz) || 1;
  buildBudInto(acc, P, ui, tip, { x: dx / dl, y: dy / dl, z: dz / dl }, ui.stemBudMode, rTip);
}

// Grow the simplified bud bloom into its own accumulator and merge it onto the
// offshoot tip (position `tipPos`, axis `tipDir`). `rTip` is the offshoot's tip
// radius, used to seat the bud so no gap shows.
function buildBudInto(acc, P, ui, tipPos, tipDir, mode, rTip) {
  const budScale = 0.42;
  const tight = mode === 'tight';
  // A smaller, less-detailed, more-closed version of the CURRENT bloom: same infill
  // / tip / edge / petal shape carried through, but deliberately cheap — a single
  // whorl, fewer petals (fewer still under the pricey Voronoi infill, ~6.6x), capped
  // venation density, a tighter opening angle, and no exposed stamens.
  const voronoi = ui.infillType === 'voronoi';
  // TIGHT: force a closed teardrop — near-vertical petals whose tips curl INWARD
  // (negative centre curve) and cup around the axis, so they wrap shut with minimal
  // separation. EARLY: a faithful, just smaller + simpler + slightly-more-closed
  // copy of the current bloom (its own petal shape / curve / cup carried through).
  const pose = tight
    ? { bloom: 12, tightness: 0.88, elevation: 0.32, centerCurve: -0.5, petalCup: Math.max(ui.petalCup, 0.45) }
    : { bloom: 34, tightness: 0.66, elevation: 0.15 };
  const budUi = {
    ...ui,
    bloomType: ui.bloomType === 'bilateral' ? 'coiled' : ui.bloomType,  // a fan never closes into a bud
    petalCount: clamp(Math.min(ui.petalCount, voronoi ? 4 : 5), 3, 5),
    layerCount: 1,                             // one whorl only — the bud is small and low-detail
    petalsPerLayer: '',
    density: Math.min(ui.density, voronoi ? 3 : 4),
    centerType: 'none',                        // no exposed stamens in a bud
    receptacleType: 'none', sepalsType: 'none', stemType: 'none', stemBudMode: 'none',
    ...pose,
  };
  const budP = resolveParams(budUi);
  const exportMode = acc.exportMode;
  const budAcc = new MeshAccumulator({ exportMode, floorScale: exportMode ? budScale : 1 });
  const { centerHeight } = buildBloomInto(budAcc, budAcc, budUi, budP);
  // Seat the bud so its petal convergence (local y = centerHeight) lands on the
  // offshoot tip, oriented along tipDir, scaled down. Sink it a hair into the tip
  // so the shells overlap (no gap) for a clean union.
  const dir = new THREE.Vector3(tipDir.x, tipDir.y, tipDir.z).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const seat = budScale * centerHeight + (rTip || 0) * 0.5;
  const pos = new THREE.Vector3(tipPos.x, tipPos.y, tipPos.z).addScaledVector(dir, -seat);
  const m = new THREE.Matrix4().compose(pos, q, new THREE.Vector3(budScale, budScale, budScale));
  acc.appendTransformed(budAcc, m);
  acc.addBead(tipPos, (rTip || P.tubeRadius * 2) * 1.15, NODE_BEAD_RINGS, NODE_BEAD_SECTORS);   // seat the bud on the offshoot tip
}

/* ===================================================================
   LEAVES — a leaf at each stem node, built on buildStemInto's node structure.
   Reuses the petal machinery wholesale: every leaf blade is a watertight SOLID
   blade grown through buildPetalInto (the same primitive the SOLID sepals use), so
   none of the curve / taper / jag / edge math is re-implemented here. The current
   petal EDGE sliders (edge curve, edge profile, edge noise) shape the leaf too; the
   selected LEAF TYPE sets the blade character (compound / lobed / oval / narrow) and
   PHYLLOTAXY sets how many leaves sit at each node and their azimuths as the nodes
   ascend. Each blade is built ONCE in its own accumulator and stamped onto every
   attachment with a quaternion rotate + translate (appendTransformed) — a proper
   rotation with NO scale, so winding + every shared edge survive (watertight in =>
   watertight out) and the export feature-floor stays valid at true size.
   =================================================================== */

const LEAF_UP_TILT = 0.36;   // leaves angle up-and-out from the stem (radians)

// Per-type blade character. lenF scales length; W/taper/tip shape the blade; cup
// gives a slight channel; petiole is the visible stalk length (fraction of blade
// length); lobe/lobeCount cut the margin (deep few = pinnatifid poppy, shallow many
// = serrated rose leaflet, 0 = smooth); uSteps/vSteps keep the grid light. The
// solid-blade path ignores tipStyle, so the "jagged/deeply-cut" look comes from the
// watertight lobe modulation in petalHalfWidth, not the skeletal jagged-edge tool.
const LEAF_TYPES = {
  compound: { lenF: 0.55, W: 0.50, taper: 0.40, tip: 0.62, cup: 0.18, petiole: 0.0,  lobe: 0.18, lobeCount: 9, uSteps: 14, vSteps: 7 },
  lobed:    { lenF: 1.05, W: 0.95, taper: 0.26, tip: 0.60, cup: 0.12, petiole: 0.06, lobe: 0.6,  lobeCount: 4, uSteps: 24, vSteps: 9 },
  oval:     { lenF: 0.95, W: 0.72, taper: 0.16, tip: 0.32, cup: 0.14, petiole: 0.40, lobe: 0,    lobeCount: 0, uSteps: 16, vSteps: 8 },
  narrow:   { lenF: 1.25, W: 0.34, taper: 0.60, tip: 0.72, cup: 0.10, petiole: 0.14, lobe: 0,    lobeCount: 0, uSteps: 16, vSteps: 8 },
};

// Leaf parameter set: start from the CURRENT petal params (so edgeCurve / edgeProfile
// / edgeNoise + softness carry through — the reused "slider family"), then apply the
// type's blade character. bloom = 90 deg makes the local spine run flat (a leaf, not
// an upright petal); a small curl gives a gentle lengthwise droop.
function leafParams(ui, type) {
  const base = resolveParams(ui);
  const t = LEAF_TYPES[type] || LEAF_TYPES.oval;
  const size = clamp(ui.leafSize, 0.2, 3);
  return {
    ...base,
    infillType: 'veins',                 // discarded for a solid blade — keep it cheap
    solidBlade: true,
    L: PETAL_LENGTH * 0.62 * size * t.lenF,
    W: t.W,
    taper: t.taper,
    tip: t.tip,
    tipStyle: 'clean',                   // solid blade ignores tip style; lobing is via P.lobe
    lobe: t.lobe, lobeCount: t.lobeCount,
    petalCup: t.cup,
    curl: 0.16 * CENTER_CURVE_SCALE,     // gentle lengthwise droop
    bloom: Math.PI / 2,                  // flat blade (spine runs out, not up)
    r0: 0,
    // keep the leaf light: coarser margin + fewer rim facets than a petal/sepal
    bladeUSteps: t.uSteps, bladeVSteps: t.vSteps, rimSegments: 5, outlineSteps: 30,
    _petiole: t.petiole,
  };
}

// Azimuths of the leaves at node i for the chosen phyllotaxy (radians around the
// stem). Alternate = 1 leaf, flipping 180 deg each node (a 2-ranked zigzag);
// Opposite = 2 leaves across, each node turned 90 deg (decussate); Whorled = 3
// leaves at 120 deg, the whorl rotating a little each node.
function leafAzimuths(phyllo, i) {
  if (phyllo === 'opposite') { const b = i * Math.PI / 2; return [b, b + Math.PI]; }
  if (phyllo === 'whorled')  { const b = i * (Math.PI / 4); return [b, b + 2 * Math.PI / 3, b + 4 * Math.PI / 3]; }
  return [i * Math.PI];                 // alternate
}

// World outward direction at azimuth `az`, tilted up from horizontal by `up`.
function leafDir(az, up) {
  const c = Math.cos(up);
  return new THREE.Vector3(Math.cos(az) * c, Math.sin(up), Math.sin(az) * c);
}

// Matrix4 that lays the prebuilt local blade (base `B`, long axis `Lhat`, face
// normal `Nhat`) down at world `pos`, long axis along `dir`, blade face up. Built
// from quaternions so it is always a proper rotation (no reflection): watertight-safe.
function leafTransform(B, Lhat, Nhat, pos, dir) {
  const d = dir.clone().normalize();
  const q1 = new THREE.Quaternion().setFromUnitVectors(Lhat, d);      // long axis -> dir
  const n1 = Nhat.clone().applyQuaternion(q1);
  let U = new THREE.Vector3(0, 1, 0);
  if (Math.abs(U.dot(d)) > 0.985) U.set(1, 0, 0);
  U.addScaledVector(d, -U.dot(d)).normalize();                        // world-up made perpendicular to dir
  n1.addScaledVector(d, -n1.dot(d)).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(n1, U).multiply(q1);  // then face -> up, about dir
  const R = new THREE.Matrix4().makeRotationFromQuaternion(q);
  return new THREE.Matrix4().makeTranslation(pos.x, pos.y, pos.z)
    .multiply(R)
    .multiply(new THREE.Matrix4().makeTranslation(-B.x, -B.y, -B.z));  // world = pos + R*(v - B)
}

function buildLeafInto(acc, P, ui, cl) {
  const type = ui.leafType;
  if (!type || type === 'none' || !cl || !cl.nodes.length) return;
  const Pleaf = leafParams(ui, type);
  // Local frame of the blade: base, long axis (base->tip chord) and face normal.
  const spine = buildSpine(Pleaf);
  const Bm = mapPointToSurface({ x: 0, y: 0 }, Pleaf, spine);
  const Tm = mapPointToSurface({ x: Pleaf.L, y: 0 }, Pleaf, spine);
  const B = new THREE.Vector3(Bm.x, Bm.y, Bm.z);
  const Lhat = new THREE.Vector3(Tm.x - Bm.x, Tm.y - Bm.y, Tm.z - Bm.z).normalize();
  const What = new THREE.Vector3(0, 0, 1);                            // width axis
  const Nhat = new THREE.Vector3().crossVectors(What, Lhat).normalize();
  // Grow ONE blade in local space, then stamp it onto every attachment.
  const blade = new MeshAccumulator({ exportMode: acc.exportMode });
  buildPetalInto(blade, Pleaf, 0, 0, 0, 0, SEED_BASE + 917);

  const phyllo = ui.leafPhyllotaxy;
  const rLeaf = Pleaf.tubeRadius;
  const petLen = Pleaf._petiole * Pleaf.L;
  for (let i = 0; i < cl.nodes.length; i++) {
    const node = new THREE.Vector3(cl.nodes[i].pos.x, cl.nodes[i].pos.y, cl.nodes[i].pos.z);
    for (const az of leafAzimuths(phyllo, i)) {
      const dir = leafDir(az, LEAF_UP_TILT);
      if (type === 'compound') {
        buildCompoundLeafInto(acc, blade, { B, Lhat, Nhat }, node, dir, Pleaf, rLeaf);
      } else {
        let baseAt = node;
        if (petLen > 1e-4) {                                          // visible short stalk before the blade
          const tip = node.clone().addScaledVector(dir, petLen);
          acc.addTube([node, tip], rLeaf * 2.4, 0, 6);
          baseAt = tip;
        }
        acc.appendTransformed(blade, leafTransform(B, Lhat, Nhat, baseAt, dir));
      }
    }
  }
}

// A rose-style compound leaf: a short rachis (shared stalk) carrying a terminal
// leaflet at the tip and two opposite pairs of laterals splayed in the leaf plane.
function buildCompoundLeafInto(acc, blade, frame, node, dir, Pleaf, rLeaf) {
  const { B, Lhat, Nhat } = frame;
  const rachisLen = Pleaf.L * 1.55;
  const rachisTip = node.clone().addScaledVector(dir, rachisLen);
  acc.addTube([node, rachisTip], rLeaf * 2.2, 0, 6);                 // the rachis
  // up axis for splaying the laterals within the leaf plane
  let up = new THREE.Vector3(0, 1, 0);
  if (Math.abs(up.dot(dir)) > 0.985) up.set(1, 0, 0);
  up.addScaledVector(dir, -up.dot(dir)).normalize();
  const rot = (ang) => dir.clone().applyAxisAngle(up, ang).normalize();
  acc.appendTransformed(blade, leafTransform(B, Lhat, Nhat, rachisTip, dir));   // terminal leaflet
  for (const pr of [{ t: 0.44, splay: 0.85 }, { t: 0.72, splay: 0.72 }]) {       // two lateral pairs
    const at = node.clone().addScaledVector(dir, rachisLen * pr.t);
    acc.appendTransformed(blade, leafTransform(B, Lhat, Nhat, at, rot(pr.splay)));
    acc.appendTransformed(blade, leafTransform(B, Lhat, Nhat, at, rot(-pr.splay)));
  }
}

/* RECEPTACLE — a blended surface GROWN FROM the petal + sepal base attachments,
   not a separate primitive placed underneath. `attachments` is the list of base
   points { az, r } (azimuth + radius) for every petal and sepal. A ring of
   longitudinal ribs rises to meet each attachment and dips between them (how
   sharply is BLEND SMOOTHNESS), then the whole surface descends by RECEPTACLE
   DEPTH and narrows into the stem (how tightly is CONVERGENCE TIGHTNESS). It is
   drawn in the SAME wireframe tubes as the petals (ribs + latitude rings), so the
   petals read as emerging from one shared surface rather than sitting on a blob.
   The bottom ring matches the stem's top radius, so the stem simply continues it.
   Returns the depth it descends below cy (where the stem starts). */
function buildReceptacleInto(acc, P, cx, cy, cz, attachments, ringR, opts) {
  const blend  = clamp(opts.blend, 0, 1);
  const depthW = lerp(0.18, 1.15, clamp(opts.depth, 0, 1));   // descent below the attachment ring
  const tight  = clamp(opts.tightness, 0, 1);
  const stemR  = opts.neckR || P.tubeRadius * 4.0;           // == the stem's top radius (smooth join)
  // Rib weight GRADES along its length: vein-fine at the ring (so the join to the
  // petals is seamless) to stem-thick at the neck. Higher BLEND SMOOTHNESS makes
  // the top finer AND lifts the ribs up to overlap the petal bases, so at the max
  // you can't tell where the petal ends and the receptacle begins.
  const topMul  = lerp(1.0, 0.40, blend);                    // top weight (× tubeRadius), finer as it smooths
  const stemMul = 3.2;                                       // neck weight
  const smooth  = (t) => t * t * (3 - 2 * t);
  const ribR    = (t) => P.tubeRadius * lerp(topMul, stemMul, smooth(t));
  const overlap = blend * 0.16 * Math.max(depthW, 0.3);      // ribs poke up among the petals at high blend
  const dipMax  = depthW * lerp(0.55, 0.10, blend);          // dips fade out as it smooths
  const sigma   = lerp(0.28, 1.7, blend);                    // tight hug -> smooth flow
  let maxR = ringR;
  for (const a of attachments) if (a.r > maxR) maxR = a.r;
  // Blended attachment profile at azimuth th: radius follows the nearby bases,
  // height rises to a base (peak ~ 1) and dips in the gaps (peak -> 0).
  const sample = (th) => {
    let wsum = 0, rsum = 0, peak = 0;
    for (const a of attachments) {
      let d = Math.abs(th - a.az) % (Math.PI * 2);
      if (d > Math.PI) d = Math.PI * 2 - d;
      const w = Math.exp(-(d * d) / (2 * sigma * sigma));
      wsum += w; rsum += w * a.r; if (w > peak) peak = w;
    }
    const topR = wsum > 1e-6 ? rsum / wsum : ringR;
    return { topR: clamp(topR, stemR, maxR * 1.05), topY: cy + overlap - dipMax * (1 - peak) };
  };
  const M = clamp(Math.round(attachments.length * lerp(2, 4, blend)), 24, 96);   // denser ribs as it smooths
  const STEPS = 12;                                          // rib path resolution
  const curve = lerp(0.7, 2.4, tight);                       // >1 pinches into a tight neck
  const grid = [];
  for (let j = 0; j < M; j++) {
    const th = (j / M) * Math.PI * 2;
    const { topR, topY } = sample(th);
    const col = [];
    for (let k = 0; k <= STEPS; k++) {
      const t = k / STEPS;
      const rad = lerp(stemR, topR, Math.pow(1 - t, curve));  // topR at the ring -> stemR at the neck
      const y = lerp(topY, cy - depthW, t);
      col.push({ x: cx + rad * Math.cos(th), y, z: cz + rad * Math.sin(th) });
    }
    grid.push(col);
  }
  for (let j = 0; j < M; j++) acc.addTube(grid[j], ribR, 0, RECEPT_TUBE_SEGS);   // tapered ribs: vein-fine top -> stem-thick neck
  for (const k of [Math.round(STEPS * 0.3), Math.round(STEPS * 0.55), Math.round(STEPS * 0.8)]) {
    const ring = [];
    for (let j = 0; j <= M; j++) ring.push(grid[j % M][k]);
    acc.addTube(ring, ribR(k / STEPS), 0, RECEPT_TUBE_SEGS);       // rings match the rib weight at their level
  }
  return depthW;
}

/* SEPALS — a whorl of narrow, sharply pointed, spiky sepals radiating from the
   base in a star and reflexing back, matching the petal count and tucked half a
   step between the petals. Real sepals are thin straps, not leaf-shaped petals,
   so these are much narrower and more tapered than a petal, with a light midrib
   and a strong recurve. Reuses the petal builder (same tube line weight & teal). */
function buildSepalsInto(acc, P, cx, cy, cz, opts, ringR) {
  const N = clamp(Math.round(opts.count), 3, 24);       // COUNT: sepals in the whorl
  const size = clamp(opts.size, 0.1, 1.5);
  const solid = opts.style === 'solid';                 // STYLE: solid leaf vs strap
  const sepR = Math.max(ringR * 0.85, 0.16);
  // SOLID sepals are broader, soft-tipped leaf blades; STRAP sepals stay narrow,
  // sharply tapered spikes. Curve is user-driven for both (centre + two edges).
  const Ps = {
    ...P,
    L: P.L * size,
    W: P.W * size * (solid ? 0.55 : 0.3),
    taper: solid ? 0.5 : 0.78,       // solid: fuller blade; strap: taper to a point
    tip: solid ? 0.45 : 0.97,        // solid: rounded soft tip; strap: sharp spike
    edgeCurve: opts.edgeCurve,       // top-down side billow (+) / pinch (-)
    edgeProfile: opts.edgeProfile,   // out-of-plane profile lift of the margins
    tipStyle: 'clean',
    infillType: 'veins',
    curl: opts.centerCurve,          // centre curve -> reflex of the down-tilted sepal
    solidBlade: solid,
    secondaries: 3, maxDepth: 2, crossPerStrip: 2,   // light midrib, not full venation
  };
  const off = Math.PI / N;                              // tuck between the petals
  for (let i = 0; i < N; i++) {
    const az = off + i * 2 * Math.PI / N;
    buildPetalInto(acc, Ps, az, cy - 0.02, sepR - P.r0, -42 * DEG, SEED_BASE + 733 + i * 29);
  }
}

/* ===================================================================
   4. SCENE
   =================================================================== */

const canvas = document.getElementById('flower-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setClearColor(0x060707, 1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x060707, 0.016);

const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 100);
camera.position.set(3, 2.4, 6);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.rotateSpeed = 0.9;
controls.zoomSpeed = 0.9;
controls.minDistance = 1.5;
controls.maxDistance = 30;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.7;

// lighting — dark Deep-Winter ground with petrol key/rim so the lace pops
scene.add(new THREE.HemisphereLight(0x2fa3a3, 0x050707, 0.55));
const keyLight = new THREE.DirectionalLight(0xeafffb, 1.0);
keyLight.position.set(4, 7, 5);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0x1c6b6b, 0.75);
rimLight.position.set(-5, 3, -5);
scene.add(rimLight);
const coreGlow = new THREE.PointLight(0x2fa3a3, 0.6, 50);
coreGlow.position.set(0, 0.6, 0);
scene.add(coreGlow);

// materials — all spiral petals share one material; the core glows brighter
// double-sided: the Voronoi sheet is a thin perforated membrane seen from both
// faces (through its holes and where petals cup), so back faces must render too.
const matPetals = new THREE.MeshStandardMaterial({ color: 0xe6f3f0, roughness: 0.5, metalness: 0.12, emissive: 0x0f2e2b, emissiveIntensity: 0.3, side: THREE.DoubleSide });
const matCore   = new THREE.MeshStandardMaterial({ color: 0x2fa3a3, roughness: 0.45, metalness: 0.2, emissive: 0x0c3a38, emissiveIntensity: 0.55 });

const bloomGroup = new THREE.Group();
scene.add(bloomGroup);
const meshPetals = new THREE.Mesh(new THREE.BufferGeometry(), matPetals);
const meshCore   = new THREE.Mesh(new THREE.BufferGeometry(), matCore);
bloomGroup.add(meshPetals, meshCore);

function swapGeometry(mesh, acc) {
  mesh.geometry.dispose();
  mesh.geometry = acc.toGeometry() || new THREE.BufferGeometry();
}


/* ===================================================================
   5. GENERATE (called on every parameter change)
   =================================================================== */

let hasFramed = false;

// Populate the petal + core accumulators for the current UI/params. Shared by
// the live path (generate) and the STL export path — the latter passes
// accumulators built with { exportMode: true }, so every radius and slab
// thickness is floored to the minimum printable feature. Pure w.r.t. the scene
// (no camera / glow side effects); returns what the caller needs for framing.
function resolveLayerCounts(ui, layerCount) {
  // Petal count for each whorl, outer -> inner. The optional "petals per layer"
  // list (comma-separated) overrides per layer; blank / invalid slots, and any
  // layers past the end of the list, fall back to the Bloom petal count — so an
  // empty list makes every layer match the single-ring flower.
  const base = clamp(Math.round(ui.petalCount), 1, 40);
  // A single whorl ALWAYS uses NUMBER OF PETALS. The per-layer list only applies
  // with 2+ layers — its control is hidden at 1 layer, so a leftover value must
  // never silently override the visible petal-count slider.
  if (layerCount <= 1) return [base];
  const raw = String(ui.petalsPerLayer || '').split(',').map((s) => parseInt(s.trim(), 10));
  const counts = [];
  for (let i = 0; i < layerCount; i++) {
    let v = i < raw.length ? raw[i] : raw[raw.length - 1];
    if (!Number.isFinite(v) || v < 1) v = base;
    counts.push(clamp(Math.round(v), 1, 40));
  }
  return counts;
}

// Build ONLY the bloom — the concentric petal whorls plus the central core — into
// the given accumulators, returning the sizing the base parts (and the side bud)
// depend on. Split out of buildInto so the side bud can grow a second, simplified
// bloom through the exact same path without duplicating any whorl/core logic.
//
// LAYERS — concentric petal whorls. Layer 0 is the original single-ring flower;
// each further whorl reuses the SAME petal recipe (shape / tip / infill), just
// smaller, higher, rotated into the outer gaps, and more closed. With
// layerCount = 1 only layer 0 builds, so the output is identical to the
// pre-layers flower.
function buildBloomInto(petalAcc, coreAcc, ui, P) {
  const layerCount = clamp(Math.round(ui.layerCount), 1, 6);
  const falloff = clamp(ui.layerSizeFalloff, 0.3, 1);       // inner size as a fraction of the layer outside it
  const heightStep = ui.layerHeightOffset;                  // vertical stack distance per layer (world units)
  const rotStep = ui.layerRotationOffset * DEG;             // angular stagger per layer
  const bloomStep = ui.layerBloomAngleDelta * DEG;          // extra closure (lower opening angle) per layer
  const layerPetals = resolveLayerCounts(ui, layerCount);

  const placements = [];
  let outer = null;                                          // layer 0's sizing drives the core / base
  for (let li = 0; li < layerCount; li++) {
    const layer = {
      index: li,
      scale: Math.pow(falloff, li),
      dHeight: heightStep * li,
      dRot: rotStep * li,
      dBloom: bloomStep * li,
    };
    const res = buildLayerInto(petalAcc, ui, P, layerPetals[li], layer);
    if (li === 0) outer = res;
    for (const pl of res.placements) placements.push(pl);
  }

  const centerHeight = ui.elevation * outer.elevAmp;         // core sits at the outer receptacle centre
  buildCoreInto(coreAcc, P, centerHeight, mulberry32(SEED_BASE + 7));
  return { placements, centerHeight, ringR: outer.ringR };
}

function buildInto(petalAcc, coreAcc, ui, P) {
  // The bloom (petal whorls + central core).
  const { placements, centerHeight, ringR } = buildBloomInto(petalAcc, coreAcc, ui, P);

  // BASE — independent organic parts, all in the same teal tubes as the petals
  // (into the petal mesh): a RECEPTACLE swelling, a ring of SEPALS, and a STEM
  // (optionally carrying a SIDE BUD on an offshoot). They compose freely around
  // the OUTER whorl; the stem descends from the receptacle underside if there is
  // one, otherwise straight from the convergence point.
  let stemTop = centerHeight;
  if (ui.receptacleType !== 'none') {
    // Attachment points the blended surface is grown from: every petal base, plus
    // (if present) every sepal base, tucked half a step between the petals.
    const attach = placements.filter((pl) => (pl.r || 0) > 1e-4).map((pl) => ({ az: pl.az, r: pl.r }));
    if (ui.sepalsType !== 'none') {
      const sc = clamp(Math.round(ui.sepalCount), 3, 24);
      const sepR = Math.max(ringR * 0.85, 0.16);
      for (let i = 0; i < sc; i++) attach.push({ az: (i + 0.5) * 2 * Math.PI / sc, r: sepR });
    }
    // Neck the receptacle to the STEM's actual top radius (PR #24's stemRadiusFn is
    // tubeRadius*4*thickness at t=0), so the blend flows straight into the stem at
    // any thickness. No stem -> the default 4x neck.
    const stemThick = ui.stemType !== 'none' ? clamp(ui.stemThickness, 0.3, 4) : 1;
    const depth = buildReceptacleInto(petalAcc, P, 0, centerHeight, 0, attach, ringR, {
      blend: ui.blendSmoothness, depth: ui.receptacleDepth, tightness: ui.convergenceTightness,
      neckR: P.tubeRadius * 4.0 * stemThick,
    });
    stemTop = centerHeight - depth;
  }
  if (ui.sepalsType !== 'none') {
    buildSepalsInto(petalAcc, P, 0, centerHeight, 0, {
      count: ui.sepalCount,
      size: ui.sepalSize,
      style: ui.sepalStyle,
      centerCurve: ui.sepalCenterCurve,
      edgeCurve: ui.sepalEdgeCurve,
      edgeProfile: ui.sepalEdgeProfile,
    }, ringR);
  }
  if (ui.stemType !== 'none') {
    const stemOpts = {
      length: clamp(ui.stemLength, 0.2, 6),
      curve: clamp(ui.stemCurve, -1, 1),
      thickness: clamp(ui.stemThickness, 0.3, 4),
      nodeCount: clamp(Math.round(ui.stemNodeCount), 0, 8),
      nodeProminence: clamp(ui.stemNodeProminence, 0, 1),
    };
    const cl = buildStemInto(petalAcc, P, 0, stemTop, 0, stemOpts);
    if (cl && ui.stemBudMode && ui.stemBudMode !== 'none') {
      buildBudBranchInto(petalAcc, P, ui, cl, stemOpts);
    }
    if (cl && ui.leafType && ui.leafType !== 'none') {
      buildLeafInto(petalAcc, P, ui, cl);   // a leaf at each stem node
    }
  }

  return { placements, centerHeight };
}

// Build ONE whorl's petals into the accumulator. `count` is this whorl's petal
// count; `layer` carries its transforms (scale / dHeight / dRot / dBloom — all
// zero-effect for layer 0). Returns the placements plus the derived sizing the
// caller needs for the core / base. Reuses buildPetalInto — no petal logic here.
function buildLayerInto(petalAcc, ui, P, count, layer) {
  const bloomType = ui.bloomType;

  // BILATERAL is organised per side (max 3 petals each side of the mirror line),
  // with an optional petal centred on that line — which then bisects it, so the
  // mirror runs through the middle of a petal. Every other type uses the global
  // petal count.
  const bilPerSide = clamp(Math.round(ui.bilPerSide), 1, 3);
  const bilCenter = !!ui.bilCenterPetal;
  const effectiveCount = bloomType === 'bilateral'
    ? (2 * bilPerSide + (bilCenter ? 1 : 0))
    : count;

  const spread = lerp(SPREAD_LOOSE, SPREAD_TIGHT, ui.tightness);  // tighter coil -> smaller spacing
  const rMax = spread * Math.sqrt(Math.max(1, effectiveCount - 1));
  const elev = ui.elevation;                                     // -1 (bowl) .. +1 (cone)
  const elevAmp = ELEV_FACTOR * rMax;                            // scale elevation with bloom size
  const ringR = EVEN_RING * rMax;                               // shared single-ring radius

  // Build the petal placements (azimuth, radius, mirror-seed group):
  //  · COILED   — the phyllotactic golden-angle spiral (Vogel packing); 3–4 petals
  //               fall back to an even rosette so they don't read as a clump.
  //  · RADIAL   — all petals evenly spread around one ring (actinomorphic daisy).
  //  · BILATERAL— a symmetric fan: petals mirror across az = 0 at a fixed 45° step,
  //               up to 3 per side, optionally one petal on the mirror line,
  //               leaving an open wedge at the back (exactly one plane of symmetry).
  const placements = [];
  if (bloomType === 'bilateral') {
    // Petal spacing is user-set, then capped so the outermost petal never swings
    // past ~170° (no wrap into the back / overlap), keeping the mirror wedge.
    // Each petal position (1..3) also carries its own edge / width / curves.
    const over = (k) => ({
      edge: [ui.bilEdge1, ui.bilEdge2, ui.bilEdge3][k - 1],
      W: [ui.bilWidth1, ui.bilWidth2, ui.bilWidth3][k - 1],
      curl: [ui.bilCenterCurve1, ui.bilCenterCurve2, ui.bilCenterCurve3][k - 1] * CENTER_CURVE_SCALE,
      edgeCurve: [ui.bilEdgeCurve1, ui.bilEdgeCurve2, ui.bilEdgeCurve3][k - 1],
      edgeProfile: [ui.bilEdgeProfile1, ui.bilEdgeProfile2, ui.bilEdgeProfile3][k - 1],
      scale: [ui.bilScale1, ui.bilScale2, ui.bilScale3][k - 1],
    });
    const maxK = bilCenter ? bilPerSide : (bilPerSide - 0.5);
    const step = Math.min(clamp(ui.bilSpacing, 5, 90) * DEG, (170 * DEG) / Math.max(1e-6, maxK));
    if (bilCenter) placements.push({ az: 0, r: ringR, seedIdx: 0, over: over(1) });   // centre petal takes petal-1's controls
    for (let k = 1; k <= bilPerSide; k++) {
      const a = (bilCenter ? k : k - 0.5) * step;
      const o = over(k);
      placements.push({ az:  a, r: ringR, seedIdx: k, over: o });   // +side
      placements.push({ az: -a, r: ringR, seedIdx: k, over: o });   // -side (shares seed + controls -> exact mirror)
    }
  } else if (bloomType === 'radial') {
    // RADIAL — a flat rosette: `count` petals evenly spaced around one ring, all at
    // the same height, pointing straight out (actinomorphic daisy). A single petal
    // sits at the centre.
    const R = PETAL_LENGTH * 0.5 * lerp(1.25, 0.6, ui.tightness);   // rosette ring radius
    const cy = elev * elevAmp;                                     // ring height
    if (count === 1) {
      placements.push({ az: 0, r: 0, seedIdx: 0, height: cy, tilt: 0 });
    } else {
      for (let i = 0; i < count; i++) {
        placements.push({ az: i * 2 * Math.PI / count, r: R, seedIdx: i, height: cy, tilt: 0 });
      }
    }
  } else {                                                      // coiled
    const coiledEven = count <= EVEN_MAX;
    for (let i = 0; i < count; i++) {
      if (count === 1) placements.push({ az: 0, r: 0, seedIdx: i });
      else if (coiledEven) placements.push({ az: i * 2 * Math.PI / count, r: ringR, seedIdx: i });
      else placements.push({ az: i * GOLDEN_ANGLE, r: spread * Math.sqrt(i), seedIdx: i });
    }
  }

  for (const pl of placements) {
    const rho = rMax > 1e-6 ? clamp(pl.r / rMax, 0, 1) : 0;
    // raised-cosine receptacle profile: 1 at the centre, 0 at the rim
    const profile = 0.5 * (1 + Math.cos(Math.PI * rho));
    // lean each petal along the receptacle slope (dy/dr of the height field) so
    // a raised centre reads as a cone and a sunken centre as a bowl. The bloom
    // radius cancels here, so the lean stays bounded at any coil tightness.
    const slope = -elev * ELEV_FACTOR * (Math.PI / 2) * Math.sin(Math.PI * rho);
    // RADIAL supplies explicit height + tilt; otherwise use the receptacle profile.
    const baseHeight = pl.height != null ? pl.height : elev * elevAmp * profile;
    const tilt = pl.tilt != null ? pl.tilt : RECEPTACLE_TILT * Math.atan(slope);
    // BILATERAL: each petal position overrides width / curves, and (unless DEFAULT)
    // its tip/edge style, on a per-petal copy of P.
    let Pp = P;
    if (pl.over) {
      // Scale grows the whole petal (length + width proportionally) from its base;
      // curl / edgeCurve are shape ratios, so they stay put under scale.
      const s = pl.over.scale;
      Pp = { ...P, L: P.L * s, W: pl.over.W * s, curl: pl.over.curl, edgeCurve: pl.over.edgeCurve, edgeProfile: pl.over.edgeProfile };
      if (pl.over.edge && pl.over.edge !== 'default') Pp.tipStyle = pl.over.edge;
    }
    // LAYER transforms — identity for layer 0 (scale 1, all deltas 0), so the outer
    // whorl is byte-identical to the single-ring flower. Inner whorls shrink the
    // petal + its ring radius, lower the petal's own opening angle (dBloom) so it
    // closes up, stack vertically, and rotate into the outer gaps. A per-layer seed
    // offset varies the venation between whorls.
    if (layer.scale !== 1 || layer.dBloom !== 0) {
      Pp = { ...Pp, L: Pp.L * layer.scale, W: Pp.W * layer.scale, bloom: Math.max(0, Pp.bloom - layer.dBloom) };
    }
    const az = pl.az + layer.dRot;
    const height = baseHeight * layer.scale + layer.dHeight;
    const radialOffset = (pl.r - P.r0) * layer.scale;
    buildPetalInto(petalAcc, Pp, az, height, radialOffset, tilt,
                   SEED_BASE + pl.seedIdx * 131 + layer.index * LAYER_SEED_STRIDE);
  }

  return { placements, elevAmp, ringR };
}

function generate() {
  const ui = readUI();
  const P = resolveParams(ui);
  const petalAcc = new MeshAccumulator();
  const coreAcc  = new MeshAccumulator();
  const { placements, centerHeight } = buildInto(petalAcc, coreAcc, ui, P);
  coreGlow.position.y = centerHeight + 0.2;   // scene-only glow follows the core height

  swapGeometry(meshPetals, petalAcc);
  swapGeometry(meshCore, coreAcc);

  frameCameraOnce(petalAcc, coreAcc);
  // Adding a stem grows the flower well past the initial framing — refit the
  // camera (keeping the current view direction) so the whole plant is in view.
  if (pendingRefit) { pendingRefit = false; refitCamera(petalAcc, coreAcc); }
  updateReadout(petalAcc, ui, placements.length);
}

function frameCameraOnce(...accs) {
  if (hasFramed) return;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const a of accs) {
    if (a.vcount === 0) continue;
    for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], a.min[k]); max[k] = Math.max(max[k], a.max[k]); }
  }
  if (!isFinite(min[0])) return;
  hasFramed = true;
  const cx = (min[0] + max[0]) / 2, cy = (min[1] + max[1]) / 2, cz = (min[2] + max[2]) / 2;
  const radius = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) * 0.5 || 2;
  const dist = (radius / Math.tan((camera.fov * DEG) / 2)) * 1.6;
  controls.target.set(cx, cy, cz);
  camera.position.set(cx + dist * 0.45, cy + dist * 0.3, cz + dist * 0.85);
  camera.near = Math.max(0.05, dist * 0.02);
  camera.far = dist * 20;
  camera.updateProjectionMatrix();
  controls.update();
}

// Refit the camera to the current geometry bounds WITHOUT changing the view
// direction: recentre the target and pull back just far enough to fit everything
// (used when a stem is added and the plant no longer fits the initial framing).
let pendingRefit = false;
function refitCamera(...accs) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const a of accs) {
    if (a.vcount === 0) continue;
    for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], a.min[k]); max[k] = Math.max(max[k], a.max[k]); }
  }
  if (!isFinite(min[0])) return;
  const cx = (min[0] + max[0]) / 2, cy = (min[1] + max[1]) / 2, cz = (min[2] + max[2]) / 2;
  const radius = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) * 0.5 || 2;
  const dist = (radius / Math.tan((camera.fov * DEG) / 2)) * 1.5;
  // keep the current view direction; just recentre + set distance
  let dx = camera.position.x - controls.target.x, dy = camera.position.y - controls.target.y, dz = camera.position.z - controls.target.z;
  const dl = Math.hypot(dx, dy, dz) || 1; dx /= dl; dy /= dl; dz /= dl;
  controls.target.set(cx, cy, cz);
  camera.position.set(cx + dx * dist, cy + dy * dist, cz + dz * dist);
  camera.near = Math.max(0.05, dist * 0.02);
  camera.far = dist * 20;
  camera.updateProjectionMatrix();
  controls.update();
}


/* ===================================================================
   5b. STL EXPORT (Phase 4)
   Rebuild the current flower into a throwaway EXPORT-mode accumulator — every
   feature floored to the min printable thickness (Phase 2) and every tube end
   sealed, so the result is a set of closed solids with no boundary edges — then
   merge petals + core, scale world units to millimetres, and write a binary STL.
   The live scene and its meshes are never touched.

   This is a "union-ready" export: the petal is thousands of individually-closed
   solids that overlap where veins cross. A true boolean union / voxel remesh of
   that many thin primitives is not feasible in-browser without losing the fine
   detail, and the CSG libraries considered choke on self-union at this scale — so
   we instead guarantee the property that matters for printing (zero boundary
   edges: every triangle edge shared, nothing open) and let the slicer union the
   overlapping closed shells, which every slicer does. See PROGRESS.md.
   =================================================================== */

const MAX_EXPORT_TRIS = 1500000;   // binary STL ~50 B/tri; ~75 MB here — confirm past this

// Build the current UI/params into one merged, export-mode geometry.
function buildExportGeometry() {
  const ui = readUI();
  const P = resolveParams(ui);
  const acc = new MeshAccumulator({ exportMode: true });
  buildInto(acc, acc, ui, P);   // petals AND core into a single accumulator
  const geo = acc.toGeometry() || new THREE.BufferGeometry();
  const tris = acc.idx.length / 3;
  // Thinnest real-world feature: round Ø = 2·minRadius; ribbon/slab = minThick.
  const minDia = isFinite(acc.minRadius) ? 2 * acc.minRadius : Infinity;
  const minFeatureMM = MM_PER_UNIT * Math.min(minDia, isFinite(acc.minThick) ? acc.minThick : Infinity);
  return { geo, tris, minFeatureMM };
}

function exportSTL() {
  let built;
  try {
    built = buildExportGeometry();
  } catch (e) {
    console.error('[STL] build failed:', e);
    window.alert('STL export failed while building the model — see the console.');
    return false;
  }
  const { geo, tris, minFeatureMM } = built;
  if (tris === 0) { window.alert('Nothing to export yet.'); return false; }
  if (tris > MAX_EXPORT_TRIS) {
    const mb = Math.round(tris * 50 / 1e6);
    if (!window.confirm(`This model is ${tris.toLocaleString()} triangles ` +
        `(~${mb} MB STL) and may be slow to save and slice. Export anyway?`)) {
      geo.dispose();
      return false;
    }
  }
  // Bake world-unit -> millimetre scale into a temp mesh's matrix; STLExporter
  // applies it and writes per-facet normals from the scaled positions.
  const mesh = new THREE.Mesh(geo, matPetals);
  mesh.scale.setScalar(MM_PER_UNIT);
  mesh.updateMatrixWorld(true);
  const stl = new STLExporter().parse(mesh, { binary: true });
  geo.dispose();

  const blob = new Blob([stl], { type: 'model/stl' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'flower-bloom.stl';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  console.log(`[STL] exported ${tris.toLocaleString()} tris, ` +
    `${(blob.size / 1e6).toFixed(1)} MB, thinnest feature ${minFeatureMM.toFixed(2)} mm ` +
    `at ${MM_PER_UNIT} mm/unit`);
  return true;
}


/* ===================================================================
   6. RENDER LOOP + RESIZE
   =================================================================== */

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  // Compare against the actual drawing-buffer size (CSS px x pixelRatio).
  // Comparing canvas.width (buffer px) to clientWidth (CSS px) would be true
  // every frame on HiDPI displays and re-run setSize needlessly each frame.
  const pr = renderer.getPixelRatio();
  if (canvas.width !== Math.floor(w * pr) || canvas.height !== Math.floor(h * pr)) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}

function animate() {
  requestAnimationFrame(animate);
  if (document.hidden) return;
  resize();
  controls.update();
  renderer.render(scene, camera);
}


/* ===================================================================
   7. UI WIRING
   =================================================================== */

const inputs = {
  petalCount: document.getElementById('petalCount'),
  width: document.getElementById('width'),
  taper: document.getElementById('taper'),
  tip: document.getElementById('tip'),
  centerCurve: document.getElementById('centerCurve'),
  edgeCurve: document.getElementById('edgeCurve'),
  edgeProfile: document.getElementById('edgeProfile'),
  petalCup: document.getElementById('petalCup'),
  tipStyle: document.getElementById('tipStyle'),
  tipRegion: document.getElementById('tipRegion'),
  tipLength: document.getElementById('tipLength'),
  tipFrequency: document.getElementById('tipFrequency'),
  tipIrregularity: document.getElementById('tipIrregularity'),
  edgeNoise: document.getElementById('edgeNoise'),
  edgeNoiseScale: document.getElementById('edgeNoiseScale'),
  bloomType: document.getElementById('bloomType'),
  layerCount: document.getElementById('layerCount'),
  petalsPerLayer: document.getElementById('petalsPerLayer'),
  layerSizeFalloff: document.getElementById('layerSizeFalloff'),
  layerHeightOffset: document.getElementById('layerHeightOffset'),
  layerRotationOffset: document.getElementById('layerRotationOffset'),
  layerBloomAngleDelta: document.getElementById('layerBloomAngleDelta'),
  bilPerSide: document.getElementById('bilPerSide'),
  bilSpacing: document.getElementById('bilSpacing'),
  bilCenterPetal: document.getElementById('bilCenterPetal'),
  bilEdge1: document.getElementById('bilEdge1'),
  bilEdge2: document.getElementById('bilEdge2'),
  bilEdge3: document.getElementById('bilEdge3'),
  bilWidth1: document.getElementById('bilWidth1'),
  bilWidth2: document.getElementById('bilWidth2'),
  bilWidth3: document.getElementById('bilWidth3'),
  bilCenterCurve1: document.getElementById('bilCenterCurve1'),
  bilCenterCurve2: document.getElementById('bilCenterCurve2'),
  bilCenterCurve3: document.getElementById('bilCenterCurve3'),
  bilEdgeCurve1: document.getElementById('bilEdgeCurve1'),
  bilEdgeCurve2: document.getElementById('bilEdgeCurve2'),
  bilEdgeCurve3: document.getElementById('bilEdgeCurve3'),
  bilScale1: document.getElementById('bilScale1'),
  bilScale2: document.getElementById('bilScale2'),
  bilScale3: document.getElementById('bilScale3'),
  bilEdgeProfile1: document.getElementById('bilEdgeProfile1'),
  bilEdgeProfile2: document.getElementById('bilEdgeProfile2'),
  bilEdgeProfile3: document.getElementById('bilEdgeProfile3'),
  bloom: document.getElementById('bloom'),
  tube: document.getElementById('tube'),
  infillType: document.getElementById('infillType'),
  density: document.getElementById('density'),
  softness: document.getElementById('softness'),
  strandCount: document.getElementById('strandCount'),
  strandWidth: document.getElementById('strandWidth'),
  strandTaper: document.getElementById('strandTaper'),
  strandCurvature: document.getElementById('strandCurvature'),
  strandIrregularity: document.getElementById('strandIrregularity'),
  boneCount: document.getElementById('boneCount'),
  boneWidth: document.getElementById('boneWidth'),
  boneCurve: document.getElementById('boneCurve'),
  boneSpread: document.getElementById('boneSpread'),
  boneOutline: document.getElementById('boneOutline'),
  laceSwirl: document.getElementById('laceSwirl'),
  scallopCount: document.getElementById('scallopCount'),
  scallopHeight: document.getElementById('scallopHeight'),
  centerArch: document.getElementById('centerArch'),
  centerType: document.getElementById('centerType'),
  centerCount: document.getElementById('centerCount'),
  centerLength: document.getElementById('centerLength'),
  centerTipSize: document.getElementById('centerTipSize'),
  denseStamenCount: document.getElementById('denseStamenCount'),
  denseStamenLength: document.getElementById('denseStamenLength'),
  carpelCount: document.getElementById('carpelCount'),
  carpelSize: document.getElementById('carpelSize'),
  discSize: document.getElementById('discSize'),
  discHeight: document.getElementById('discHeight'),
  ringStamenCount: document.getElementById('ringStamenCount'),
  ringStamenLength: document.getElementById('ringStamenLength'),
  fillPetalCount: document.getElementById('fillPetalCount'),
  fillPetalSize: document.getElementById('fillPetalSize'),
  fillDensity: document.getElementById('fillDensity'),
  fillCurl: document.getElementById('fillCurl'),
  receptacleType: document.getElementById('receptacleType'),
  blendSmoothness: document.getElementById('blendSmoothness'),
  receptacleDepth: document.getElementById('receptacleDepth'),
  convergenceTightness: document.getElementById('convergenceTightness'),
  sepalsType: document.getElementById('sepalsType'),
  sepalSize: document.getElementById('sepalSize'),
  sepalCount: document.getElementById('sepalCount'),
  sepalStyle: document.getElementById('sepalStyle'),
  sepalCenterCurve: document.getElementById('sepalCenterCurve'),
  sepalEdgeCurve: document.getElementById('sepalEdgeCurve'),
  sepalEdgeProfile: document.getElementById('sepalEdgeProfile'),
  stemType: document.getElementById('stemType'),
  stemLength: document.getElementById('stemLength'),
  stemCurve: document.getElementById('stemCurve'),
  stemThickness: document.getElementById('stemThickness'),
  stemNodeCount: document.getElementById('stemNodeCount'),
  stemNodeProminence: document.getElementById('stemNodeProminence'),
  stemBudMode: document.getElementById('stemBudMode'),
  leafType: document.getElementById('leafType'),
  leafPhyllotaxy: document.getElementById('leafPhyllotaxy'),
  leafSize: document.getElementById('leafSize'),
  tightness: document.getElementById('tightness'),
  elevation: document.getElementById('elevation'),
  autoRotate: document.getElementById('autoRotate'),
};

function readUI() {
  return {
    petalCount: parseInt(inputs.petalCount.value, 10),
    width: parseFloat(inputs.width.value),
    taper: parseFloat(inputs.taper.value),
    tip: parseFloat(inputs.tip.value),
    centerCurve: parseFloat(inputs.centerCurve.value),
    edgeCurve: parseFloat(inputs.edgeCurve.value),
    edgeProfile: parseFloat(inputs.edgeProfile.value),
    petalCup: parseFloat(inputs.petalCup.value),
    tipStyle: inputs.tipStyle.value,
    tipRegion: parseFloat(inputs.tipRegion.value),
    tipLength: parseFloat(inputs.tipLength.value),
    tipFrequency: parseInt(inputs.tipFrequency.value, 10),
    tipIrregularity: parseFloat(inputs.tipIrregularity.value),
    edgeNoise: parseFloat(inputs.edgeNoise.value),
    edgeNoiseScale: parseFloat(inputs.edgeNoiseScale.value),
    bloomType: inputs.bloomType.value,
    layerCount: parseInt(inputs.layerCount.value, 10),
    petalsPerLayer: inputs.petalsPerLayer.value,
    layerSizeFalloff: parseFloat(inputs.layerSizeFalloff.value),
    layerHeightOffset: parseFloat(inputs.layerHeightOffset.value),
    layerRotationOffset: parseFloat(inputs.layerRotationOffset.value),
    layerBloomAngleDelta: parseFloat(inputs.layerBloomAngleDelta.value),
    bilPerSide: parseInt(inputs.bilPerSide.value, 10),
    bilSpacing: parseFloat(inputs.bilSpacing.value),
    bilCenterPetal: inputs.bilCenterPetal.checked,
    bilEdge1: inputs.bilEdge1.value,
    bilEdge2: inputs.bilEdge2.value,
    bilEdge3: inputs.bilEdge3.value,
    bilWidth1: parseFloat(inputs.bilWidth1.value),
    bilWidth2: parseFloat(inputs.bilWidth2.value),
    bilWidth3: parseFloat(inputs.bilWidth3.value),
    bilCenterCurve1: parseFloat(inputs.bilCenterCurve1.value),
    bilCenterCurve2: parseFloat(inputs.bilCenterCurve2.value),
    bilCenterCurve3: parseFloat(inputs.bilCenterCurve3.value),
    bilEdgeCurve1: parseFloat(inputs.bilEdgeCurve1.value),
    bilEdgeCurve2: parseFloat(inputs.bilEdgeCurve2.value),
    bilEdgeCurve3: parseFloat(inputs.bilEdgeCurve3.value),
    bilScale1: parseFloat(inputs.bilScale1.value),
    bilScale2: parseFloat(inputs.bilScale2.value),
    bilScale3: parseFloat(inputs.bilScale3.value),
    bilEdgeProfile1: parseFloat(inputs.bilEdgeProfile1.value),
    bilEdgeProfile2: parseFloat(inputs.bilEdgeProfile2.value),
    bilEdgeProfile3: parseFloat(inputs.bilEdgeProfile3.value),
    bloom: parseFloat(inputs.bloom.value),
    tube: parseFloat(inputs.tube.value),
    infillType: inputs.infillType.value,
    density: parseInt(inputs.density.value, 10),
    softness: parseFloat(inputs.softness.value),
    strandCount: parseInt(inputs.strandCount.value, 10),
    strandWidth: parseFloat(inputs.strandWidth.value),
    strandTaper: parseFloat(inputs.strandTaper.value),
    strandCurvature: parseFloat(inputs.strandCurvature.value),
    strandIrregularity: parseFloat(inputs.strandIrregularity.value),
    boneCount: parseInt(inputs.boneCount.value, 10),
    boneWidth: parseFloat(inputs.boneWidth.value),
    boneCurve: parseFloat(inputs.boneCurve.value),
    boneSpread: parseFloat(inputs.boneSpread.value),
    boneOutline: inputs.boneOutline.checked,
    laceSwirl: parseFloat(inputs.laceSwirl.value),
    scallopCount: parseInt(inputs.scallopCount.value, 10),
    scallopHeight: parseFloat(inputs.scallopHeight.value),
    centerArch: inputs.centerArch.value,
    centerType: inputs.centerType.value,
    centerCount: parseInt(inputs.centerCount.value, 10),
    centerLength: parseFloat(inputs.centerLength.value),
    centerTipSize: parseFloat(inputs.centerTipSize.value),
    denseStamenCount: parseInt(inputs.denseStamenCount.value, 10),
    denseStamenLength: parseFloat(inputs.denseStamenLength.value),
    carpelCount: parseInt(inputs.carpelCount.value, 10),
    carpelSize: parseFloat(inputs.carpelSize.value),
    discSize: parseFloat(inputs.discSize.value),
    discHeight: parseFloat(inputs.discHeight.value),
    ringStamenCount: parseInt(inputs.ringStamenCount.value, 10),
    ringStamenLength: parseFloat(inputs.ringStamenLength.value),
    fillPetalCount: parseInt(inputs.fillPetalCount.value, 10),
    fillPetalSize: parseFloat(inputs.fillPetalSize.value),
    fillDensity: parseFloat(inputs.fillDensity.value),
    fillCurl: parseFloat(inputs.fillCurl.value),
    receptacleType: inputs.receptacleType.value,
    blendSmoothness: parseFloat(inputs.blendSmoothness.value),
    receptacleDepth: parseFloat(inputs.receptacleDepth.value),
    convergenceTightness: parseFloat(inputs.convergenceTightness.value),
    sepalsType: inputs.sepalsType.value,
    sepalSize: parseFloat(inputs.sepalSize.value),
    sepalCount: parseInt(inputs.sepalCount.value, 10),
    sepalStyle: inputs.sepalStyle.value,
    sepalCenterCurve: parseFloat(inputs.sepalCenterCurve.value),
    sepalEdgeCurve: parseFloat(inputs.sepalEdgeCurve.value),
    sepalEdgeProfile: parseFloat(inputs.sepalEdgeProfile.value),
    stemType: inputs.stemType.value,
    stemLength: parseFloat(inputs.stemLength.value),
    stemCurve: parseFloat(inputs.stemCurve.value),
    stemThickness: parseFloat(inputs.stemThickness.value),
    stemNodeCount: parseInt(inputs.stemNodeCount.value, 10),
    stemNodeProminence: parseFloat(inputs.stemNodeProminence.value),
    stemBudMode: inputs.stemBudMode.value,
    leafType: inputs.leafType.value,
    leafPhyllotaxy: inputs.leafPhyllotaxy.value,
    leafSize: parseFloat(inputs.leafSize.value),
    tightness: parseFloat(inputs.tightness.value),
    elevation: parseFloat(inputs.elevation.value),
    autoRotate: inputs.autoRotate.checked,
  };
}

// live numeric read-outs next to each slider
function refreshLabels() {
  setLabel('petalCount', inputs.petalCount.value);
  setLabel('width', (+inputs.width.value).toFixed(2));
  setLabel('taper', (+inputs.taper.value).toFixed(2));
  setLabel('tip', (+inputs.tip.value).toFixed(2));
  const cc = +inputs.centerCurve.value;
  setLabel('centerCurve', (cc > 0 ? '+' : '') + cc.toFixed(2));
  const ec = +inputs.edgeCurve.value;
  setLabel('edgeCurve', (ec > 0 ? '+' : '') + ec.toFixed(2));
  const ep = +inputs.edgeProfile.value;
  setLabel('edgeProfile', (ep > 0 ? '+' : '') + ep.toFixed(2));
  const pc = +inputs.petalCup.value;
  setLabel('petalCup', (pc > 0 ? '+' : '') + pc.toFixed(2));
  setLabel('tipRegion', (+inputs.tipRegion.value).toFixed(2));
  setLabel('tipLength', (+inputs.tipLength.value).toFixed(2));
  setLabel('tipFrequency', inputs.tipFrequency.value);
  setLabel('tipIrregularity', (+inputs.tipIrregularity.value).toFixed(2));
  setLabel('edgeNoise', (+inputs.edgeNoise.value).toFixed(2));
  setLabel('edgeNoiseScale', (+inputs.edgeNoiseScale.value).toFixed(2));
  setLabel('bilPerSide', inputs.bilPerSide.value);
  setLabel('bilSpacing', inputs.bilSpacing.value + '°');
  setLabel('layerCount', inputs.layerCount.value);
  setLabel('layerSizeFalloff', (+inputs.layerSizeFalloff.value).toFixed(2) + '×');
  const lho = +inputs.layerHeightOffset.value;
  setLabel('layerHeightOffset', (lho > 0 ? '+' : '') + lho.toFixed(2));
  setLabel('layerRotationOffset', inputs.layerRotationOffset.value + '°');
  setLabel('layerBloomAngleDelta', inputs.layerBloomAngleDelta.value + '°');
  for (let k = 1; k <= 3; k++) {
    setLabel('bilScale' + k, (+inputs['bilScale' + k].value).toFixed(2) + '×');
    setLabel('bilWidth' + k, (+inputs['bilWidth' + k].value).toFixed(2));
    const cc = +inputs['bilCenterCurve' + k].value;
    setLabel('bilCenterCurve' + k, (cc > 0 ? '+' : '') + cc.toFixed(2));
    const ec = +inputs['bilEdgeCurve' + k].value;
    setLabel('bilEdgeCurve' + k, (ec > 0 ? '+' : '') + ec.toFixed(2));
    const ep = +inputs['bilEdgeProfile' + k].value;
    setLabel('bilEdgeProfile' + k, (ep > 0 ? '+' : '') + ep.toFixed(2));
  }
  setLabel('bloom', inputs.bloom.value + '°');
  setLabel('tube', (+inputs.tube.value).toFixed(2));
  setLabel('density', inputs.density.value);
  setLabel('softness', (+inputs.softness.value).toFixed(2));
  setLabel('strandCount', inputs.strandCount.value);
  setLabel('strandWidth', (+inputs.strandWidth.value).toFixed(2));
  setLabel('strandTaper', (+inputs.strandTaper.value).toFixed(2));
  setLabel('strandCurvature', (+inputs.strandCurvature.value).toFixed(2));
  setLabel('strandIrregularity', (+inputs.strandIrregularity.value).toFixed(2));
  setLabel('boneCount', inputs.boneCount.value);
  setLabel('boneWidth', (+inputs.boneWidth.value).toFixed(2));
  const bc = +inputs.boneCurve.value;
  setLabel('boneCurve', (bc > 0 ? '+' : '') + bc.toFixed(2));
  setLabel('boneSpread', (+inputs.boneSpread.value).toFixed(2));
  setLabel('laceSwirl', (+inputs.laceSwirl.value).toFixed(2));
  setLabel('scallopCount', inputs.scallopCount.value);
  setLabel('scallopHeight', (+inputs.scallopHeight.value).toFixed(2));
  setLabel('centerCount', inputs.centerCount.value);
  setLabel('centerLength', (+inputs.centerLength.value).toFixed(2));
  setLabel('centerTipSize', (+inputs.centerTipSize.value).toFixed(2));
  setLabel('blendSmoothness', (+inputs.blendSmoothness.value).toFixed(2));
  setLabel('receptacleDepth', (+inputs.receptacleDepth.value).toFixed(2));
  setLabel('convergenceTightness', (+inputs.convergenceTightness.value).toFixed(2));
  setLabel('denseStamenCount', inputs.denseStamenCount.value);
  setLabel('denseStamenLength', (+inputs.denseStamenLength.value).toFixed(2));
  setLabel('carpelCount', inputs.carpelCount.value);
  setLabel('carpelSize', (+inputs.carpelSize.value).toFixed(2));
  setLabel('discSize', (+inputs.discSize.value).toFixed(2));
  setLabel('discHeight', (+inputs.discHeight.value).toFixed(2));
  setLabel('ringStamenCount', inputs.ringStamenCount.value);
  setLabel('ringStamenLength', (+inputs.ringStamenLength.value).toFixed(2));
  setLabel('fillPetalCount', inputs.fillPetalCount.value);
  setLabel('fillPetalSize', (+inputs.fillPetalSize.value).toFixed(2));
  setLabel('fillDensity', (+inputs.fillDensity.value).toFixed(2));
  setLabel('fillCurl', (+inputs.fillCurl.value).toFixed(2));
  setLabel('sepalSize', (+inputs.sepalSize.value).toFixed(2));
  setLabel('sepalCount', inputs.sepalCount.value);
  const scc = +inputs.sepalCenterCurve.value;
  setLabel('sepalCenterCurve', (scc > 0 ? '+' : '') + scc.toFixed(2));
  const sec = +inputs.sepalEdgeCurve.value;
  setLabel('sepalEdgeCurve', (sec > 0 ? '+' : '') + sec.toFixed(2));
  const sep = +inputs.sepalEdgeProfile.value;
  setLabel('sepalEdgeProfile', (sep > 0 ? '+' : '') + sep.toFixed(2));
  setLabel('stemLength', (+inputs.stemLength.value).toFixed(2));
  const scv = +inputs.stemCurve.value;
  setLabel('stemCurve', (scv > 0 ? '+' : '') + scv.toFixed(2));
  setLabel('stemThickness', (+inputs.stemThickness.value).toFixed(2));
  setLabel('stemNodeCount', inputs.stemNodeCount.value);
  setLabel('stemNodeProminence', (+inputs.stemNodeProminence.value).toFixed(2));
  setLabel('leafSize', (+inputs.leafSize.value).toFixed(2));
  setLabel('tightness', (+inputs.tightness.value).toFixed(2));
  const e = +inputs.elevation.value;
  setLabel('elevation', (e > 0 ? '+' : '') + e.toFixed(2));
}
function setLabel(id, text) {
  const el = document.querySelector(`[data-value="${id}"]`);
  if (el) el.textContent = text;
}

function updateReadout(petalAcc, ui, petalCount = ui.petalCount) {
  const coreIdx = meshCore.geometry.index ? meshCore.geometry.index.count : 0;
  const tris = Math.round((petalAcc.idx.length + coreIdx) / 3);
  const el = document.getElementById('readout');
  if (!el) return;
  const layers = clamp(Math.round(ui.layerCount || 1), 1, 6);
  const petals = `${petalCount} petal${petalCount === 1 ? '' : 's'}${layers > 1 ? ` · ${layers} layers` : ''}`;
  const arrange = ui.bloomType === 'radial' ? 'radial rosette'
    : ui.bloomType === 'bilateral' ? 'bilateral fan'
    : 'phyllotactic spiral';
  const infill = ui.infillType === 'voronoi' ? 'voronoi cells'
    : ui.infillType === 'strands' ? 'radial strands'
    : ui.infillType === 'bone' ? 'bone lattice'
    : ui.infillType === 'lace' ? 'lace filigree'
    : 'leaf venation';
  el.textContent = `${arrange} · ${petals} · ${infill} · ~${tris.toLocaleString()} tris`;
}

// coalesce rapid slider input into one rebuild per frame
let pending = false;
function scheduleRegen() {
  if (pending) return;
  pending = true;
  setBuilding(true);
  // Double rAF: let the "building…" state paint for one frame before the
  // synchronous rebuild blocks the main thread and then clears it.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      pending = false;
      generate();
      setBuilding(false);
    });
  });
}
function setBuilding(on) {
  const el = document.getElementById('building');
  if (el) el.classList.toggle('is-on', on);
}

// bind: geometry sliders regenerate; toggles that don't affect geometry don't
['petalCount', 'bilPerSide', 'bilSpacing',
 'bilScale1', 'bilScale2', 'bilScale3',
 'bilWidth1', 'bilWidth2', 'bilWidth3', 'bilCenterCurve1', 'bilCenterCurve2', 'bilCenterCurve3',
 'bilEdgeCurve1', 'bilEdgeCurve2', 'bilEdgeCurve3',
 'bilEdgeProfile1', 'bilEdgeProfile2', 'bilEdgeProfile3',
 'layerSizeFalloff', 'layerHeightOffset', 'layerRotationOffset', 'layerBloomAngleDelta',
 'width', 'taper', 'tip', 'centerCurve', 'edgeCurve', 'edgeProfile', 'petalCup',
 'tipRegion', 'tipLength', 'tipFrequency', 'tipIrregularity', 'edgeNoise', 'edgeNoiseScale',
 'bloom', 'tube', 'density', 'softness', 'strandCount', 'strandWidth', 'strandTaper', 'strandCurvature',
 'strandIrregularity', 'boneCount', 'boneWidth', 'boneCurve', 'boneSpread',
 'laceSwirl', 'scallopCount', 'scallopHeight',
 'centerCount', 'centerLength', 'centerTipSize',
 'denseStamenCount', 'denseStamenLength', 'carpelCount', 'carpelSize',
 'discSize', 'discHeight', 'ringStamenCount', 'ringStamenLength',
 'fillPetalCount', 'fillPetalSize', 'fillDensity', 'fillCurl',
 'blendSmoothness', 'receptacleDepth', 'convergenceTightness',
 'sepalSize', 'sepalCount', 'sepalCenterCurve', 'sepalEdgeCurve', 'sepalEdgeProfile',
 'stemLength', 'stemCurve', 'stemThickness', 'stemNodeCount', 'stemNodeProminence', 'leafSize',
 'tightness', 'elevation'].forEach((k) => {
  inputs[k].addEventListener('input', () => { refreshLabels(); scheduleRegen(); });
});
// Tip: like Infill, only the selected style's options are shown. Each option's
// data-tip-styles lists the styles it belongs to; hide the rest.
function updateTipOptions() {
  const style = inputs.tipStyle.value;
  document.querySelectorAll('[data-tip-styles]').forEach((el) => {
    el.hidden = !el.getAttribute('data-tip-styles').split(/\s+/).includes(style);
  });
}
// tip style is a <select>; swap the visible options and regenerate on change
inputs.tipStyle.addEventListener('change', () => { updateTipOptions(); scheduleRegen(); });
// Infill: only the selected type's options are shown (like Tip). The Softness
// slider is shared, but Voronoi accepts a wider range (up to 5x) than the
// venation (0..1), so its max is retuned per type to keep the useful range
// spread across the whole track.
function updateInfillOptions() {
  const type = inputs.infillType.value;
  document.querySelectorAll('[data-infill-styles]').forEach((el) => {
    el.hidden = !el.getAttribute('data-infill-styles').split(/\s+/).includes(type);
  });
  inputs.softness.max = type === 'voronoi' ? '5' : '1';
  inputs.softness.step = type === 'voronoi' ? '0.05' : '0.01';
  if (+inputs.softness.value > +inputs.softness.max) inputs.softness.value = inputs.softness.max;
  // The SCALLOP edge pairs only with LACE: offer its tip-style option only then,
  // and fall back to CLEAN if scallop was selected under a different infill.
  const scOpt = inputs.tipStyle.querySelector('option[value="scallop"]');
  if (scOpt) {
    scOpt.hidden = scOpt.disabled = type !== 'lace';
    if (type !== 'lace' && inputs.tipStyle.value === 'scallop') {
      inputs.tipStyle.value = 'clean';
      updateTipOptions();
    }
  }
}
inputs.infillType.addEventListener('change', () => { updateInfillOptions(); refreshLabels(); scheduleRegen(); });
// Bloom type is a <select>; like Tip/Infill, only the chosen arrangement's hints
// are shown (data-bloom-styles), and changing it re-lays out the whole bloom.
function updateBloomOptions() {
  const type = inputs.bloomType.value;
  document.querySelectorAll('[data-bloom-styles]').forEach((el) => {
    el.hidden = !el.getAttribute('data-bloom-styles').split(/\s+/).includes(type);
  });
  updateBilateralPetals();
}
// The per-petal edge dropdowns (bilateral only) show one per petal position, up to
// the current PETALS PER SIDE — so they appear/disappear as that slider moves.
function updateBilateralPetals() {
  const on = inputs.bloomType.value === 'bilateral';
  const perSide = clamp(parseInt(inputs.bilPerSide.value, 10) || 1, 1, 3);
  document.querySelectorAll('[data-bil-petal]').forEach((el) => {
    const k = parseInt(el.getAttribute('data-bil-petal'), 10);
    el.hidden = !(on && k <= perSide);
  });
  // Global width / centre curve / edge curve are replaced by the per-petal
  // versions when bilateral, so hide them there.
  document.querySelectorAll('[data-hide-bilateral]').forEach((el) => { el.hidden = on; });
}
inputs.bloomType.addEventListener('change', () => { updateBloomOptions(); scheduleRegen(); });
// LAYERS: the per-layer controls only matter with more than one whorl, so hide
// them (data-layers-multi) when Layer count is 1.
function updateLayerOptions() {
  const multi = (parseInt(inputs.layerCount.value, 10) || 1) > 1;
  document.querySelectorAll('[data-layers-multi]').forEach((el) => { el.hidden = !multi; });
}
inputs.layerCount.addEventListener('input', () => { refreshLabels(); updateLayerOptions(); scheduleRegen(); });
// per-layer petal count is a free-text list; rebuild on edit (parsing is tolerant)
inputs.petalsPerLayer.addEventListener('input', () => { scheduleRegen(); });
// per-side count also drives which per-petal dropdowns are shown
inputs.bilPerSide.addEventListener('input', updateBilateralPetals);
// the bilateral "petal on mirror line" toggle changes the layout, so it regenerates
inputs.bilCenterPetal.addEventListener('change', () => { scheduleRegen(); });
// per-petal edge dropdowns (selects) regenerate on change
[inputs.bilEdge1, inputs.bilEdge2, inputs.bilEdge3].forEach((s) => s.addEventListener('change', () => { scheduleRegen(); }));
// CENTER visibility: the architecture selector (data-center-arch) shows one type's
// controls; within CLASSIC, the stamens/pistil/none sub-select (data-center-styles)
// further hides the amount/length/tip sliders when NONE is chosen.
function updateCenterOptions() {
  const arch = inputs.centerArch.value;
  const style = inputs.centerType.value;
  document.querySelectorAll('#acc-center [data-center-arch]').forEach((el) => {
    let show = el.getAttribute('data-center-arch').split(/\s+/).includes(arch);
    if (show && arch === 'classic' && el.hasAttribute('data-center-styles')) {
      show = el.getAttribute('data-center-styles').split(/\s+/).includes(style);
    }
    el.hidden = !show;
  });
}
inputs.centerArch.addEventListener('change', () => { updateCenterOptions(); scheduleRegen(); });
inputs.centerType.addEventListener('change', () => { updateCenterOptions(); scheduleRegen(); });
// Base parts are independent: each part's sliders show only when it's not NONE.
function updateBaseOptions() {
  document.querySelectorAll('[data-recept]').forEach((el) => { el.hidden = inputs.receptacleType.value === 'none'; });
  document.querySelectorAll('[data-sepal]').forEach((el) => { el.hidden = inputs.sepalsType.value === 'none'; });
  document.querySelectorAll('[data-stem]').forEach((el) => { el.hidden = inputs.stemType.value === 'none'; });
  // leaf sub-controls (arrangement / size) show only when a stem AND a leaf type are on
  document.querySelectorAll('[data-leaf]').forEach((el) => { el.hidden = inputs.stemType.value === 'none' || inputs.leafType.value === 'none'; });
}
inputs.receptacleType.addEventListener('change', () => { updateBaseOptions(); scheduleRegen(); });
inputs.sepalsType.addEventListener('change', () => { updateBaseOptions(); scheduleRegen(); });
inputs.sepalStyle.addEventListener('change', () => { scheduleRegen(); });
// Adding / lengthening the stem grows the plant past the current framing, so
// request a camera refit on the next rebuild to bring the whole flower into view.
inputs.stemType.addEventListener('change', () => {
  updateBaseOptions();
  if (inputs.stemType.value !== 'none') pendingRefit = true;
  scheduleRegen();
});
inputs.stemLength.addEventListener('input', () => { if (inputs.stemType.value !== 'none') pendingRefit = true; });
// Turning on / switching the side bud grows the plant out to the side and up, so
// refit the camera on the next rebuild to bring the whole offshoot into view.
inputs.stemBudMode.addEventListener('change', () => {
  if (inputs.stemType.value !== 'none' && inputs.stemBudMode.value !== 'none') pendingRefit = true;
  scheduleRegen();
});
// Leaves attach to the stem nodes; adding them spreads the plant outward, so refit.
inputs.leafType.addEventListener('change', () => {
  // Leaves attach at stem nodes, so a leaf type with 0 nodes would render nothing.
  // Nudge the node count up to a visible minimum so a leaf appears immediately on
  // selection — no hunting for the Leaf Nodes slider.
  if (inputs.leafType.value !== 'none' && parseInt(inputs.stemNodeCount.value, 10) < LEAF_MIN_NODES) {
    inputs.stemNodeCount.value = String(LEAF_MIN_NODES);
    refreshLabels();
  }
  updateBaseOptions();
  if (inputs.stemType.value !== 'none' && inputs.leafType.value !== 'none') pendingRefit = true;
  scheduleRegen();
});
inputs.leafPhyllotaxy.addEventListener('change', () => { scheduleRegen(); });
inputs.autoRotate.addEventListener('change', () => { controls.autoRotate = inputs.autoRotate.checked; });
// Auto-center (top-down): frame the bloom from straight above with the mirror
// axis (+X) pointing up on screen, so a bilateral fan reads centred and
// left-right symmetric. Stops auto-rotate so the framing holds.
function snapTopDown() {
  const box = new THREE.Box3();
  box.expandByObject(bloomGroup);
  if (box.isEmpty()) return;
  const c = new THREE.Vector3(); box.getCenter(c);
  const sz = new THREE.Vector3(); box.getSize(sz);
  const radius = Math.max(sz.x, sz.z, sz.y) * 0.5 || 2;
  const dist = (radius / Math.tan((camera.fov * DEG) / 2)) * 1.45;
  controls.autoRotate = false;
  inputs.autoRotate.checked = false;
  camera.up.set(1, 0, 0);                        // +X (the mirror axis) points up-screen
  controls.target.copy(c);
  camera.position.set(c.x, c.y + dist, c.z);
  camera.near = Math.max(0.05, dist * 0.02);
  camera.far = dist * 20;
  camera.updateProjectionMatrix();
  controls.update();
}
const topViewBtn = document.getElementById('bilTopView');
if (topViewBtn) topViewBtn.addEventListener('click', snapTopDown);
// the outline toggle changes geometry, so it regenerates
inputs.boneOutline.addEventListener('change', () => { scheduleRegen(); });

const resetBtn = document.getElementById('reset');
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    const d = DEFAULTS;
    inputs.petalCount.value = d.petalCount;
    inputs.width.value = d.width;
    inputs.taper.value = d.taper;
    inputs.tip.value = d.tip;
    inputs.centerCurve.value = d.centerCurve;
    inputs.edgeCurve.value = d.edgeCurve;
    inputs.edgeProfile.value = d.edgeProfile;
    inputs.petalCup.value = d.petalCup;
    inputs.tipStyle.value = d.tipStyle;
    inputs.tipRegion.value = d.tipRegion;
    inputs.tipLength.value = d.tipLength;
    inputs.tipFrequency.value = d.tipFrequency;
    inputs.tipIrregularity.value = d.tipIrregularity;
    inputs.edgeNoise.value = d.edgeNoise;
    inputs.edgeNoiseScale.value = d.edgeNoiseScale;
    inputs.bloomType.value = d.bloomType;
    inputs.layerCount.value = d.layerCount;
    inputs.petalsPerLayer.value = d.petalsPerLayer;
    inputs.layerSizeFalloff.value = d.layerSizeFalloff;
    inputs.layerHeightOffset.value = d.layerHeightOffset;
    inputs.layerRotationOffset.value = d.layerRotationOffset;
    inputs.layerBloomAngleDelta.value = d.layerBloomAngleDelta;
    inputs.bilPerSide.value = d.bilPerSide;
    inputs.bilSpacing.value = d.bilSpacing;
    inputs.bilCenterPetal.checked = d.bilCenterPetal;
    inputs.bilEdge1.value = d.bilEdge1;
    inputs.bilEdge2.value = d.bilEdge2;
    inputs.bilEdge3.value = d.bilEdge3;
    for (let k = 1; k <= 3; k++) {
      inputs['bilScale' + k].value = d['bilScale' + k];
      inputs['bilWidth' + k].value = d['bilWidth' + k];
      inputs['bilCenterCurve' + k].value = d['bilCenterCurve' + k];
      inputs['bilEdgeCurve' + k].value = d['bilEdgeCurve' + k];
      inputs['bilEdgeProfile' + k].value = d['bilEdgeProfile' + k];
    }
    inputs.bloom.value = d.bloom;
    inputs.tube.value = d.tube;
    inputs.infillType.value = d.infillType;
    inputs.density.value = d.density;
    inputs.softness.value = d.softness;
    inputs.strandCount.value = d.strandCount;
    inputs.strandWidth.value = d.strandWidth;
    inputs.strandTaper.value = d.strandTaper;
    inputs.strandCurvature.value = d.strandCurvature;
    inputs.strandIrregularity.value = d.strandIrregularity;
    inputs.boneCount.value = d.boneCount;
    inputs.boneWidth.value = d.boneWidth;
    inputs.boneCurve.value = d.boneCurve;
    inputs.boneSpread.value = d.boneSpread;
    inputs.boneOutline.checked = d.boneOutline;
    inputs.laceSwirl.value = d.laceSwirl;
    inputs.scallopCount.value = d.scallopCount;
    inputs.scallopHeight.value = d.scallopHeight;
    inputs.centerArch.value = d.centerArch;
    inputs.centerType.value = d.centerType;
    inputs.centerCount.value = d.centerCount;
    inputs.centerLength.value = d.centerLength;
    inputs.centerTipSize.value = d.centerTipSize;
    inputs.denseStamenCount.value = d.denseStamenCount;
    inputs.denseStamenLength.value = d.denseStamenLength;
    inputs.carpelCount.value = d.carpelCount;
    inputs.carpelSize.value = d.carpelSize;
    inputs.discSize.value = d.discSize;
    inputs.discHeight.value = d.discHeight;
    inputs.ringStamenCount.value = d.ringStamenCount;
    inputs.ringStamenLength.value = d.ringStamenLength;
    inputs.fillPetalCount.value = d.fillPetalCount;
    inputs.fillPetalSize.value = d.fillPetalSize;
    inputs.fillDensity.value = d.fillDensity;
    inputs.fillCurl.value = d.fillCurl;
    inputs.receptacleType.value = d.receptacleType;
    inputs.blendSmoothness.value = d.blendSmoothness;
    inputs.receptacleDepth.value = d.receptacleDepth;
    inputs.convergenceTightness.value = d.convergenceTightness;
    inputs.sepalsType.value = d.sepalsType;
    inputs.sepalSize.value = d.sepalSize;
    inputs.sepalCount.value = d.sepalCount;
    inputs.sepalStyle.value = d.sepalStyle;
    inputs.sepalCenterCurve.value = d.sepalCenterCurve;
    inputs.sepalEdgeCurve.value = d.sepalEdgeCurve;
    inputs.sepalEdgeProfile.value = d.sepalEdgeProfile;
    inputs.stemType.value = d.stemType;
    inputs.stemLength.value = d.stemLength;
    inputs.stemCurve.value = d.stemCurve;
    inputs.stemThickness.value = d.stemThickness;
    inputs.stemNodeCount.value = d.stemNodeCount;
    inputs.stemNodeProminence.value = d.stemNodeProminence;
    inputs.stemBudMode.value = d.stemBudMode;
    inputs.leafType.value = d.leafType;
    inputs.leafPhyllotaxy.value = d.leafPhyllotaxy;
    inputs.leafSize.value = d.leafSize;
    inputs.tightness.value = d.tightness;
    inputs.elevation.value = d.elevation;
    inputs.autoRotate.checked = d.autoRotate;
    controls.autoRotate = d.autoRotate;
    resetPlaceholders();
    updateTipOptions();
    updateInfillOptions();
    updateBloomOptions();
    updateLayerOptions();
    updateCenterOptions();
    updateBaseOptions();
    refreshLabels();
    scheduleRegen();
  });
}

// EXPORT STL — build the print-ready mesh and download it, with brief button
// feedback. Guarded so a large model asks before saving (see exportSTL).
const exportBtn = document.getElementById('exportStl');
if (exportBtn) {
  exportBtn.addEventListener('click', () => {
    const label = exportBtn.textContent;
    exportBtn.disabled = true;
    exportBtn.textContent = 'Exporting…';
    // let the label paint before the synchronous build blocks the main thread
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const ok = exportSTL();
      exportBtn.textContent = ok ? 'Exported ✓' : label;
      exportBtn.disabled = false;
      if (ok) setTimeout(() => { exportBtn.textContent = label; }, 1600);
    }));
  });
}

const DEFAULTS = {
  petalCount: 4, width: 0.9, taper: 0.35, tip: 0.5, centerCurve: 0.4, edgeCurve: 0, petalCup: 0,
  tipStyle: 'clean', tipRegion: 0.25, tipLength: 0.3, tipFrequency: 14, tipIrregularity: 0, edgeProfile: 0,
  edgeNoise: 0, edgeNoiseScale: 0,
  bloomType: 'coiled', bilPerSide: 3, bilSpacing: 45, bilCenterPetal: false,
  layerCount: 1, petalsPerLayer: '', layerSizeFalloff: 0.75, layerHeightOffset: 0.05,
  layerRotationOffset: 24, layerBloomAngleDelta: 12,
  bilEdge1: 'default', bilEdge2: 'default', bilEdge3: 'default',
  bilScale1: 1, bilScale2: 1, bilScale3: 1,
  bilWidth1: 0.9, bilWidth2: 0.9, bilWidth3: 0.9,
  bilCenterCurve1: 0.4, bilCenterCurve2: 0.4, bilCenterCurve3: 0.4,
  bilEdgeCurve1: 0, bilEdgeCurve2: 0, bilEdgeCurve3: 0,
  bilEdgeProfile1: 0, bilEdgeProfile2: 0, bilEdgeProfile3: 0,
  bloom: 55, tube: 0.4, infillType: 'veins', density: 7, softness: 0.75,
  strandCount: 20, strandWidth: 0.5, strandTaper: 0.5, strandCurvature: 0.4, strandIrregularity: 0.35,
  boneCount: 18, boneWidth: 0.5, boneCurve: 0.55, boneSpread: 0.85, boneOutline: true,
  laceSwirl: 0.5, scallopCount: 9, scallopHeight: 0.4,
  centerArch: 'classic',
  centerType: 'stamens', centerCount: 14, centerLength: 0.5, centerTipSize: 0.35,
  denseStamenCount: 80, denseStamenLength: 0.4, carpelCount: 5, carpelSize: 0.5,
  discSize: 0.5, discHeight: 0.5, ringStamenCount: 40, ringStamenLength: 0.35,
  fillPetalCount: 60, fillPetalSize: 0.18, fillDensity: 0.6, fillCurl: 0.6,
  receptacleType: 'none', blendSmoothness: 0.5, receptacleDepth: 0.5, convergenceTightness: 0.5,
  sepalsType: 'none', sepalSize: 0.6,
  sepalCount: 5, sepalStyle: 'strap', sepalCenterCurve: 0.85, sepalEdgeCurve: -0.25, sepalEdgeProfile: 0,
  stemType: 'none', stemLength: 1.8, stemCurve: 0.2,
  stemThickness: 1, stemNodeCount: 3, stemNodeProminence: 0.4, stemBudMode: 'none',
  leafType: 'none', leafPhyllotaxy: 'alternate', leafSize: 1,
  tightness: 0.5, elevation: 0, autoRotate: true,
};


/* ===================================================================
   7b. COLLAPSIBLE SECTIONS + PLACEHOLDER CONTROLS
   The panel groups its controls into accordion sections (only one open at a
   time, all collapsed on load). A handful of newly-added controls don't drive
   the geometry yet — they're wired to a state object, keep their on-screen
   read-out in sync, and log to the console so the render work can pick them up
   later. Existing controls and rendering are untouched.
   =================================================================== */

// Accordion: click a header to open its section; opening one closes the rest.
const accSections = Array.from(document.querySelectorAll('[data-acc]'));
accSections.forEach((section) => {
  const head = section.querySelector('.fl-acc__head');
  if (!head) return;
  head.addEventListener('click', () => {
    const willOpen = !section.classList.contains('is-open');
    for (const s of accSections) {
      s.classList.remove('is-open');
      const h = s.querySelector('.fl-acc__head');
      if (h) h.setAttribute('aria-expanded', 'false');
    }
    if (willOpen) {
      section.classList.add('is-open');
      head.setAttribute('aria-expanded', 'true');
    }
  });
});

// Placeholder controls — no rendering logic yet. `fmt` formats the read-out for
// slider controls; selects (fmt: null) show their value in the control itself.
const placeholderControls = [
  { id: 'fractalGrowth',   fmt: (v) => (+v).toFixed(2) },
];

// current values, exposed for the future render layer / quick debugging
const edgeParams = {};
window.flowerEdgeParams = edgeParams;
const placeholderDefaults = {};

function syncPlaceholder(id, fmt, log) {
  const el = document.getElementById(id);
  if (!el) return;
  edgeParams[id] = el.type === 'range' ? parseFloat(el.value) : el.value;
  if (fmt) {
    const label = document.querySelector(`[data-value="${id}"]`);
    if (label) label.textContent = fmt(el.value);
  }
  if (log) console.log(`[flower] ${id} = ${JSON.stringify(edgeParams[id])} (placeholder — no rendering yet)`);
}

function resetPlaceholders() {
  for (const { id, fmt } of placeholderControls) {
    const el = document.getElementById(id);
    if (!el || !(id in placeholderDefaults)) continue;
    el.value = placeholderDefaults[id];
    syncPlaceholder(id, fmt, false);
  }
}

placeholderControls.forEach(({ id, fmt }) => {
  const el = document.getElementById(id);
  if (!el) return;
  placeholderDefaults[id] = el.value;
  syncPlaceholder(id, fmt, false);                       // seed state + read-out
  el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input',
    () => syncPlaceholder(id, fmt, true));
});


/* ===================================================================
   8. BOOT
   =================================================================== */

controls.autoRotate = inputs.autoRotate.checked;
updateTipOptions();
updateInfillOptions();
updateBloomOptions();
updateLayerOptions();
updateCenterOptions();
updateBaseOptions();
refreshLabels();
generate();
animate();
