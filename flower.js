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
import {
  lerp, clamp, mulberry32,
  buildSpine, buildSilhouette, buildVenation, buildVoronoi, buildStrands, buildBone, buildLace,
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
const JOIN_FLARE_DIST = 0.10;  // a flared tube blends into its end bead (a soft
                               // fillet) over this world distance rather than
                               // butting it with a hard cylinder-into-sphere crease
const RIM_WIDTH       = 0.34;  // petal-margin line weight, relative to the midrib
                               // (the leaf edge is a fine vein, not a fat rope)
const SEED_BASE      = 20250808;

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


/* ===================================================================
   1. GEOMETRY ACCUMULATOR
   Appends tubes and beads directly into flat position/normal/index arrays,
   so an entire material group becomes a single BufferGeometry with no
   thousands of throwaway objects. Keeps live slider rebuilds cheap.
   =================================================================== */

class MeshAccumulator {
  constructor() {
    this.pos = [];
    this.nor = [];
    this.idx = [];
    this.vcount = 0;
    this.min = [Infinity, Infinity, Infinity];
    this.max = [-Infinity, -Infinity, -Infinity];
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
  }

  /* A small welded bead (low-res UV sphere) that caps tube ends and reads
     as a lattice node. */
  addBead(center, radius, rings = 5, sectors = 8) {
    const start = this.vcount;
    for (let ri = 0; ri <= rings; ri++) {
      const phi = (Math.PI * ri) / rings;
      const cy = Math.cos(phi), sr = Math.sin(phi);
      for (let si = 0; si <= sectors; si++) {
        const th = (2 * Math.PI * si) / sectors;
        const nx = sr * Math.cos(th), ny = cy, nz = sr * Math.sin(th);
        this._vertex(center.x + nx * radius, center.y + ny * radius, center.z + nz * radius, nx, ny, nz);
      }
    }
    const stride = sectors + 1;
    for (let ri = 0; ri < rings; ri++) {
      for (let si = 0; si < sectors; si++) {
        const a = start + ri * stride + si;
        const b = a + 1, c = a + stride, d = c + 1;
        this.idx.push(a, b, c, b, d, c);
      }
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
      for (let m = 0; m < MO - 1; m++) {
        this.idx.push(O[m], O1[m + 1], O1[m],   O[m], O[m + 1], O1[m + 1]);   // cell wall (faces outward)
      }
      for (let m = 0; m < MH - 1; m++) {
        this.idx.push(I[m], I1[m], I1[m + 1],   I[m], I1[m + 1], I[m + 1]);   // rounded hole rim
      }
      this.idx.push(O[0], O1[0], I1[TOP],   O[0], I1[TOP], I[TOP]);              // top face (cell edge -> hole)
      this.idx.push(O[MO - 1], I1[BOT], O1[MO - 1],   O[MO - 1], I[BOT], I1[BOT]); // bottom face (reversed)
    }
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
    tipStyle: ui.tipStyle,                       // petal-edge tip style (clean/jagged/…)
    tipRegion: ui.tipRegion,                     // how far teeth reach from the apex down
    tipLength: ui.tipLength,                     // how far all tips extend outward
    tipFrequency: ui.tipFrequency,               // total number of tips, including the apex
    tipIrregularity: ui.tipIrregularity,         // 0 uniform -> 1 varied length & angle
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
    centerType: ui.centerType,                   // CENTER part: 'stamens' | 'pistil' | 'none'
    centerCount: ui.centerCount,                 // CENTER: number of filaments (amount)
    centerLength: ui.centerLength,               // CENTER: filament length (0..1)
    centerTipSize: ui.centerTipSize,             // CENTER: anther/stigma bead size (0..1)
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
  const outline = buildSilhouette(P);
  // INFILL: leaf venation (default) or a bilaterally-symmetric Voronoi mesh.
  // Both return { veins, nodes } in flattened space, rendered identically below.
  const ven = P.infillType === 'voronoi'
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
  // Map its points onto the surface and extrude one smoothly-tapering tube, so
  // line weight thins from the midrib through secondary, tertiary and veinlet.
  // When the petal is RUFFLED the whole surface buckles, so veins are first
  // densified (in flattened space) to a spacing fine enough to ride the flutes
  // without faceting — step scales with the flute frequency.
  const ruffled = P.tipStyle === 'ruffled';
  // finer than the flute spacing so infill rides the coil + its second-scale
  // frills (~2.7x the base frequency) without faceting.
  const veinStep = ruffled ? clamp(PETAL_LENGTH * 0.8 / (Math.max(1, P.tipFrequency) * 9), 0.03, 0.14) : 0;
  for (const vein of ven.veins) {
    const pts = ruffled ? densifyByStep(vein.points, veinStep) : vein.points;
    const world = pts.map(toWorld);
    // veins are thin — 6 radial sides read as round and roughly halve the
    // triangle count versus the default, which matters on deep fractals.
    // vein.rad (Voronoi junction bulge) is a t->weight profile; otherwise the
    // weight tapers linearly from w0 to w1.
    const radius = vein.rad
      ? (t) => P.tubeRadius * vein.rad(t)
      : [P.tubeRadius * vein.w0, P.tubeRadius * vein.w1];
    acc.addTube(world, radius, 0, 6);
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
    const withNormal = (pt) => ({
      p: place(mapPointToSurface(pt, P, spine)),
      n: placeDir(surfaceNormalAt(pt, P, spine), az, tilt),
    });
    const thick = P.tubeRadius * SLAB_THICK;
    for (const slab of ven.slabs) {
      acc.addSlab(slab.outer.map(withNormal), slab.inner.map(withNormal), thick);
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
    acc.addTube(pts, filR);
    acc.addBead(pts[pts.length - 1], beadR);  // anther / stigma
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

function generate() {
  const ui = readUI();
  const P = resolveParams(ui);

  const petalAcc = new MeshAccumulator();
  const coreAcc  = new MeshAccumulator();

  const count = ui.petalCount;
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
    // Petals sit on an INVISIBLE sphere in stacked latitude rings (tiers): each ring
    // is at its own latitude, so it has its own radius (R·cosφ) and height (R·sinφ),
    // and its petals tilt to point radially out from the sphere centre. Rings share
    // azimuths, so petals line up in longitudinal columns up the sphere.
    const T = clamp(Math.round(ui.sphereTiers), 1, 12);
    const R = ui.sphereSize * PETAL_LENGTH * 0.5 * lerp(1.25, 0.6, ui.tightness);
    const cy = elev * elevAmp;                                 // ball centre height
    const phiMax = 72 * DEG;
    if (count === 1) {
      placements.push({ az: 0, r: 0, seedIdx: 0, height: cy, tilt: 0 });
    } else {
      for (let i = 0; i < T; i++) {
        const phi = T === 1 ? 0 : lerp(-phiMax, phiMax, i / (T - 1));
        const rr = R * Math.cos(phi), yy = cy + R * Math.sin(phi);
        // petals per ring scale with the ring radius (∝ cosφ) so the packing density
        // is even over the sphere — `count` is the widest (equator) ring's count.
        const nRing = Math.max(1, Math.round(count * Math.cos(phi)));
        const azOff = (i % 2) * Math.PI / nRing;                 // brick-lay alternate tiers
        for (let j = 0; j < nRing; j++) {
          placements.push({ az: azOff + j * 2 * Math.PI / nRing, r: rr, seedIdx: i * count + j, height: yy, tilt: phi });
        }
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
    // RADIAL sphere tiers supply explicit height + tilt; otherwise use the receptacle.
    const height = pl.height != null ? pl.height : elev * elevAmp * profile;
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
    buildPetalInto(petalAcc, Pp, pl.az, height, pl.r - P.r0, tilt, SEED_BASE + pl.seedIdx * 131);
  }

  const centerHeight = elev * elevAmp;                           // core sits at the receptacle centre
  coreGlow.position.y = centerHeight + 0.2;
  buildCoreInto(coreAcc, P, centerHeight, mulberry32(SEED_BASE + 7));

  swapGeometry(meshPetals, petalAcc);
  swapGeometry(meshCore, coreAcc);

  frameCameraOnce(petalAcc, coreAcc);
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
  tipStyle: document.getElementById('tipStyle'),
  tipRegion: document.getElementById('tipRegion'),
  tipLength: document.getElementById('tipLength'),
  tipFrequency: document.getElementById('tipFrequency'),
  tipIrregularity: document.getElementById('tipIrregularity'),
  bloomType: document.getElementById('bloomType'),
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
  sphereTiers: document.getElementById('sphereTiers'),
  sphereSize: document.getElementById('sphereSize'),
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
  centerType: document.getElementById('centerType'),
  centerCount: document.getElementById('centerCount'),
  centerLength: document.getElementById('centerLength'),
  centerTipSize: document.getElementById('centerTipSize'),
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
    tipStyle: inputs.tipStyle.value,
    tipRegion: parseFloat(inputs.tipRegion.value),
    tipLength: parseFloat(inputs.tipLength.value),
    tipFrequency: parseInt(inputs.tipFrequency.value, 10),
    tipIrregularity: parseFloat(inputs.tipIrregularity.value),
    bloomType: inputs.bloomType.value,
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
    sphereTiers: parseInt(inputs.sphereTiers.value, 10),
    sphereSize: parseFloat(inputs.sphereSize.value),
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
    centerType: inputs.centerType.value,
    centerCount: parseInt(inputs.centerCount.value, 10),
    centerLength: parseFloat(inputs.centerLength.value),
    centerTipSize: parseFloat(inputs.centerTipSize.value),
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
  setLabel('tipRegion', (+inputs.tipRegion.value).toFixed(2));
  setLabel('tipLength', (+inputs.tipLength.value).toFixed(2));
  setLabel('tipFrequency', inputs.tipFrequency.value);
  setLabel('tipIrregularity', (+inputs.tipIrregularity.value).toFixed(2));
  setLabel('bilPerSide', inputs.bilPerSide.value);
  setLabel('bilSpacing', inputs.bilSpacing.value + '°');
  setLabel('sphereTiers', inputs.sphereTiers.value);
  setLabel('sphereSize', (+inputs.sphereSize.value).toFixed(2) + '×');
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
  const petals = `${petalCount} petal${petalCount === 1 ? '' : 's'}`;
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
['petalCount', 'bilPerSide', 'bilSpacing', 'sphereTiers', 'sphereSize',
 'bilScale1', 'bilScale2', 'bilScale3',
 'bilWidth1', 'bilWidth2', 'bilWidth3', 'bilCenterCurve1', 'bilCenterCurve2', 'bilCenterCurve3',
 'bilEdgeCurve1', 'bilEdgeCurve2', 'bilEdgeCurve3',
 'bilEdgeProfile1', 'bilEdgeProfile2', 'bilEdgeProfile3',
 'width', 'taper', 'tip', 'centerCurve', 'edgeCurve', 'edgeProfile',
 'tipRegion', 'tipLength', 'tipFrequency', 'tipIrregularity',
 'bloom', 'tube', 'density', 'softness', 'strandCount', 'strandWidth', 'strandTaper', 'strandCurvature',
 'strandIrregularity', 'boneCount', 'boneWidth', 'boneCurve', 'boneSpread',
 'laceSwirl', 'scallopCount', 'scallopHeight',
 'centerCount', 'centerLength', 'centerTipSize', 'tightness', 'elevation'].forEach((k) => {
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
// per-side count also drives which per-petal dropdowns are shown
inputs.bilPerSide.addEventListener('input', updateBilateralPetals);
// the bilateral "petal on mirror line" toggle changes the layout, so it regenerates
inputs.bilCenterPetal.addEventListener('change', () => { scheduleRegen(); });
// per-petal edge dropdowns (selects) regenerate on change
[inputs.bilEdge1, inputs.bilEdge2, inputs.bilEdge3].forEach((s) => s.addEventListener('change', () => { scheduleRegen(); }));
// Center type is a <select>; NONE hides the length/amount/tip sliders (data-center-styles).
function updateCenterOptions() {
  const type = inputs.centerType.value;
  document.querySelectorAll('[data-center-styles]').forEach((el) => {
    el.hidden = !el.getAttribute('data-center-styles').split(/\s+/).includes(type);
  });
}
inputs.centerType.addEventListener('change', () => { updateCenterOptions(); scheduleRegen(); });
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
    inputs.tipStyle.value = d.tipStyle;
    inputs.tipRegion.value = d.tipRegion;
    inputs.tipLength.value = d.tipLength;
    inputs.tipFrequency.value = d.tipFrequency;
    inputs.tipIrregularity.value = d.tipIrregularity;
    inputs.bloomType.value = d.bloomType;
    inputs.bilPerSide.value = d.bilPerSide;
    inputs.bilSpacing.value = d.bilSpacing;
    inputs.sphereTiers.value = d.sphereTiers;
    inputs.sphereSize.value = d.sphereSize;
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
    inputs.centerType.value = d.centerType;
    inputs.centerCount.value = d.centerCount;
    inputs.centerLength.value = d.centerLength;
    inputs.centerTipSize.value = d.centerTipSize;
    inputs.tightness.value = d.tightness;
    inputs.elevation.value = d.elevation;
    inputs.autoRotate.checked = d.autoRotate;
    controls.autoRotate = d.autoRotate;
    resetPlaceholders();
    updateTipOptions();
    updateInfillOptions();
    updateBloomOptions();
    updateCenterOptions();
    refreshLabels();
    scheduleRegen();
  });
}

const DEFAULTS = {
  petalCount: 4, width: 0.9, taper: 0.35, tip: 0.5, centerCurve: 0.4, edgeCurve: 0,
  tipStyle: 'clean', tipRegion: 0.25, tipLength: 0.3, tipFrequency: 14, tipIrregularity: 0, edgeProfile: 0,
  bloomType: 'coiled', bilPerSide: 3, bilSpacing: 45, bilCenterPetal: false,
  sphereTiers: 5, sphereSize: 1,
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
  centerType: 'stamens', centerCount: 14, centerLength: 0.5, centerTipSize: 0.35,
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
updateCenterOptions();
refreshLabels();
generate();
animate();
