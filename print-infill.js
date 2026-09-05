// AUTHORED INFILL — cross-hatch and line-flow, drawn INSIDE a solid's 2D
// silhouette.
//
// THIS MODULE NEVER LOOKS AT THE SURFACE. It reads one thing off the geometry
// — the projected silhouette, which the line-art extractor has already
// computed for the frame — and everything after that is 2D. No creases, no
// dihedral angles, no normals, no lighting model, no relationship between a
// hatch line and the shape of the surface under it. That is the point: this is
// the mark-making an illustrator does inside an outline, not a render of a lit
// object. The same code therefore runs on a fused bloom, on a leaf, or on any
// other solid it is handed, and knows nothing about petals.
//
// ============================ WHERE IS DARK ================================
// There is no light in this pipeline, so "where does the shading go" cannot be
// computed — it has to be DECIDED. Two candidates were on the table:
//
//   (a) a fixed illustration convention — denser at the base and where forms
//       overlap, sparser toward the tips, the way botanical illustration
//       usually shades.
//   (b) an authored anchor — a point the artist places that means "the
//       shading originates here", with density falling off away from it.
//
// THIS BUILDS (b), THE ANCHOR, DEFAULTED TO (a).
//
// The reason is that (a) cannot actually be evaluated on what this stage is
// handed. "The base" and "the tip" are properties of a PETAL, and the bloom
// arrives as one fused solid with no petal-level granularity — that is
// explicitly not coming until multi-part export exists. Any base/tip axis
// would therefore have to be guessed from a bounding box, and would be wrong
// for the first leaf handed in at an angle. Worse, a fixed convention is not
// overridable: this is a tool for designing tattoos, where the whole value is
// the artist's taste, and a shading rule the artist cannot argue with is a
// rule they will fight.
//
// So the anchor is the mechanism, and the convention is only its STARTING
// VALUE: each part's anchor initialises to the centroid of its own geometry,
// which on a radial bloom is exactly where the petals overlap and exactly
// where botanical illustration puts its darkest passage. The default picture
// is therefore the conventional one, and it is a handle rather than a law.
//
// The anchor is stored as a 3D point in the part's LOCAL space and projected
// every frame, so it is camera-stable: orbiting moves the shape and the
// shading together, instead of leaving the dark patch behind in screen space.
//
// A radial falloff from a point does make the dark region a DISC, which is
// both a gift and a risk. The gift: every threshold in the tone field becomes
// a circle, so clipping a hatch line to "the region dark enough for this
// layer" is analytic — an interval, not a per-pixel sample — and the whole
// stage stays cheap. The risk is that a perfect circle reads as machinery
// rather than as a hand. `jitter` is the answer: each hatch line's threshold
// radius is perturbed by its own hash, so the edge of a tonal layer breaks up
// into a ragged boundary instead of a compass arc. It is presentation, not
// noise for its own sake — set it to 0 and the circles come back.
//
// ============================ CLIPPING =====================================
// Both families clip to the silhouette EXACTLY, concave regions included, and
// neither assumes convexity anywhere.
//
// * Cross-hatch rotates the projected silhouette into a frame where its own
//   hatch lines are horizontal and runs a SCANLINE. Every crossing on a row is
//   collected, sorted, and accumulated as a WINDING NUMBER; the drawn spans
//   are the runs where the winding is non-zero. This is exact at any
//   concavity, and — because it is nonzero rather than even-odd — it is also
//   right where a petal folds over itself and drops a second silhouette loop
//   inside the outline, which even-odd would render as a hole.
//
// * Line-flow uses THE SAME SCANLINE, one row at a time. A streamline is
//   integrated a step at a time and every point is tested against the spans of
//   its own row; where a step leaves them, the exit is found by bisecting the
//   step, so the endpoint lands on the outline rather than near it.
//
// THE FIRST ATTEMPT AT LINE-FLOW WAS DIFFERENT AND WAS WRONG, and the reason
// is worth keeping. It tested each step for an intersection against the
// silhouette segments themselves, which is exact and sounds stronger. It
// leaked: 43% of the bloom's emitted endpoints landed outside the outline, by
// a median of 12 px and as much as 48 px. The cause is not the test — a brute
// force over all 18,377 edges agreed there was no crossing — it is the
// SILHOUETTE. The bloom is a fused STL split with 24 boundary edges and 324
// non-manifold edges whose third face is dropped, so its projected silhouette
// is NOT a closed curve. A streamline does not need to cross an open end to
// get past it; it can go around it, and the winding number changes with no
// crossing to detect. Cross-hatch never saw this because a scanline is
// self-consistent along its own row: it can only ever be wrong in a way that
// is also wrong for the point test on that row. A streamline moves in two
// dimensions, and that is what exposed it.
//
// So both families now share one membership rule — the spans of a row — and
// the gate asserts emitted vertices against that same rule. Being exactly
// consistent with the clipper is the point: a membership test that disagreed
// with the clipper would report failures nobody could act on.
//
// ============================ WHAT IT DOES NOT DO ==========================
// * SELF-OCCLUSION IS OUT OF SCOPE, BY DESIGN. The infill fills the solid's
//   OUTLINE. A bloom whose petals overlap each other is one silhouette here,
//   and hatching runs across the whole of it — which is what "shade inside the
//   extracted silhouette" means, and is what an illustrator inking a filled
//   outline does. Per-petal infill needs per-petal solids and waits on
//   multi-part export.
// * BETWEEN parts, occlusion IS handled, because without it the stem's
//   hatching draws over the bloom in front of it and the result is unreadable.
//   Parts are ordered by the distance from the camera to their origin and a
//   nearer part's silhouette subtracts from a farther one's. That ordering is
//   an approximation — it cannot express two parts that interleave in depth —
//   and it is the only place in this file that anything is approximate.

import * as THREE from 'three';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

export const INFILL_MODES = ['off', 'hatch', 'flow'];

// The secondary hatch angles, as offsets from the one the artist sets. NOT 90
// degrees: a right-angled cross-hatch reads as a mechanical grid, and the
// engraver's habit is a narrow second pass and a wider third.
export const HATCH_OFFSETS_DEG = [0, 55, -35];

// Tone thresholds, one per hatch layer. Layer 0 covers everything above a
// whisper, so a shape is never left with a bald centre; each further layer
// needs a darker tone before it joins in, which is what makes a cross-hatch
// build up in discrete steps rather than fade.
export const LAYER_THRESHOLDS = [0.10, 0.42, 0.74];

export const INFILL_LIMITS = {
  maxSegmentsPerPart: 24000,   // emitted line segments; beyond this a part truncates
  flowStepPx: 2.6,             // streamline integration step
  flowMaxSteps: 420,           // per direction
};

// A cheap, stable per-index hash in [0,1). Used for the jitter that keeps a
// tonal layer's edge from reading as a compass arc, and for the per-streamline
// threshold that makes line-flow thin out rather than stop all at once.
export function hash01(i) {
  let x = (i | 0) * 374761393 + 668265263;
  x = (x ^ (x >>> 13)) * 1274126177;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

// The tone field: 1 at the anchor, 0 at `reach` away from it, with `gamma`
// bending the ramp between. The statement of "how dark is it here". The
// clipper never evaluates it — because the field is radial it works in the
// inverse, `toneRadius`, and clips to a circle instead of sampling — so
// `tone/radius-inverts-tone` asserts the two are exact inverses. If they ever
// drift, the picture and the read-out stop describing the same thing.
export function toneAt(dist, reach, gamma) {
  if (!(reach > 0)) return 0;
  const u = dist / reach;
  if (u >= 1) return 0;
  return Math.pow(1 - u, gamma);
}

// The inverse: the distance at which the tone falls to `t`. Because the field
// is radial, every threshold is a circle, and this is its radius — which is
// why a hatch layer can be clipped as an interval instead of sampled.
export function toneRadius(t, reach, gamma) {
  if (!(reach > 0)) return 0;
  if (t <= 0) return reach;
  if (t >= 1) return 0;
  return reach * (1 - Math.pow(t, 1 / gamma));
}

// Silhouette edges bucketed by the row they span, in ONE rotated frame. Built
// once per part per angle per frame; without it every scanline walks all
// 18,377 of the bloom's edges and the stage costs 30 ms a frame instead of 5.
export class ScanIndex {
  constructor(f, ca, sa, pitch) {
    this.f = f; this.ca = ca; this.sa = sa; this.pitch = pitch;
    this.rows = new Map();
    if (!f.ok) { this.vMin = 0; return; }
    let vMin = Infinity, vMax = -Infinity;
    const v0 = new Float32Array(f.n), v1 = new Float32Array(f.n);
    for (let i = 0; i < f.n; i++) {
      v0[i] = -f.x0[i] * sa + f.y0[i] * ca;
      v1[i] = -f.x1[i] * sa + f.y1[i] * ca;
      vMin = Math.min(vMin, v0[i], v1[i]);
      vMax = Math.max(vMax, v0[i], v1[i]);
    }
    this.v0 = v0; this.v1 = v1;
    this.vMin = vMin; this.vMax = vMax;
    for (let i = 0; i < f.n; i++) {
      const a = Math.floor(Math.min(v0[i], v1[i]) / pitch);
      const b = Math.floor(Math.max(v0[i], v1[i]) / pitch);
      for (let r = a; r <= b; r++) {
        let l = this.rows.get(r);
        if (!l) { l = []; this.rows.set(r, l); }
        l.push(i);
      }
    }
    this._cache = new Map();
  }

  // The spans at cross-coordinate `v`, from this index's own row bucket. Same
  // winding rule as scanSpans(), same answer — just without walking the edges
  // that cannot reach this row.
  spansAt(v) {
    const f = this.f;
    if (!f.ok) return [];
    const row = Math.floor(v / this.pitch);
    const cand = this.rows.get(row);
    if (!cand || cand.length < 2) return [];
    const hits = [];
    for (const i of cand) {
      const a = this.v0[i], b = this.v1[i];
      if ((a <= v && b > v) || (b <= v && a > v)) {
        const t = (v - a) / (b - a);
        const u0 = f.x0[i] * this.ca + f.y0[i] * this.sa;
        const u1 = f.x1[i] * this.ca + f.y1[i] * this.sa;
        hits.push({ u: u0 + (u1 - u0) * t, w: b > a ? 1 : -1 });
      }
    }
    if (hits.length < 2) return [];
    hits.sort((p, q) => p.u - q.u);
    const spans = [];
    let wind = 0, start = 0;
    for (const h of hits) {
      const was = wind; wind += h.w;
      if (was === 0 && wind !== 0) start = h.u;
      else if (was !== 0 && wind === 0) spans.push(start, h.u);
    }
    return spans;
  }

  // Memoised for the axis-aligned case, which line-flow hits once per pixel
  // row and would otherwise recompute for every point on it.
  spansAtRow(v) {
    const row = Math.floor(v / this.pitch);
    let s = this._cache.get(row);
    if (s === undefined) { s = this.spansAt((row + 0.5) * this.pitch); this._cache.set(row, s); }
    return s;
  }

  contains(x, y) {
    const v = -x * this.sa + y * this.ca;
    const u = x * this.ca + y * this.sa;
    const sp = this.spansAtRow(v);
    for (let i = 0; i + 1 < sp.length; i += 2) if (u >= sp[i] && u <= sp[i + 1]) return true;
    return false;
  }
}

const _v = new THREE.Vector3();
const _m = new THREE.Matrix4();

// One part's per-frame 2D state: its silhouette projected to pixels, oriented
// so the covered region has non-zero winding, plus its anchor and extent.
class PartFrame {
  constructor() {
    this.x0 = new Float32Array(0); this.y0 = new Float32Array(0);
    this.x1 = new Float32Array(0); this.y1 = new Float32Array(0);
    this.n = 0;
    this.ax = 0; this.ay = 0;      // anchor, in pixels
    this.reach = 0;                // pixels
    this.minX = 0; this.minY = 0; this.maxX = 0; this.maxY = 0;
    this.depth = 0;                // camera distance, for the between-part order
    this.ok = false;
  }
  ensure(n) {
    if (this.x0.length >= n) return;
    const c = Math.max(n, 1024);
    this.x0 = new Float32Array(c); this.y0 = new Float32Array(c);
    this.x1 = new Float32Array(c); this.y1 = new Float32Array(c);
  }
}

export class Infill {
  // `art` is the LineArt instance. The silhouette this draws inside is the one
  // ALREADY extracted for the line work this frame — one extraction, now three
  // consumers (strokes, dots, and this), so the infill can never disagree with
  // the outline it is filling.
  constructor(art, opts = {}) {
    this.art = art;
    this.ink = new THREE.Color(opts.ink !== undefined ? opts.ink : 0x14181a);

    this.mode = 'off';
    this.spacing = 7;        // px between hatch lines / streamline seeds
    this.angleDeg = 35;
    this.layers = 2;         // cross-hatch families in play
    this.curvature = 0;      // -100 radial .. 0 straight .. +100 concentric
    this.reach = 85;         // % of the part's silhouette radius
    this.falloff = 100;      // gamma x100
    this.jitter = 35;        // % perturbation of each layer's threshold radius
    this.weight = 1.1;

    // The overlay. The infill is 2D, so it is drawn by its OWN orthographic
    // camera in PIXEL coordinates rather than being pushed back into the
    // scene: a hatch pattern that lived in the mesh's local space would rotate
    // with the object, and this pattern belongs to the picture plane.
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 1, 0, 1, -1, 1);

    this.frames = art.units.map(() => new PartFrame());
    this.anchors = art.units.map((u) => centroidOf(u.mesh));

    const cap = INFILL_LIMITS.maxSegmentsPerPart;
    this.draws = art.units.map((u) => {
      const geo = new LineSegmentsGeometry();
      const buf = new THREE.InstancedInterleavedBuffer(new Float32Array(cap * 6), 6, 1);
      geo.setAttribute('instanceStart', new THREE.InterleavedBufferAttribute(buf, 3, 0));
      geo.setAttribute('instanceEnd', new THREE.InterleavedBufferAttribute(buf, 3, 3));
      geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);
      const mat = new LineMaterial({ color: this.ink.getHex(), linewidth: this.weight, transparent: true });
      const lines = new LineSegments2(geo, mat);
      lines.frustumCulled = false;
      lines.name = `infill_${u.mesh.name || 'mesh'}`;
      this.scene.add(lines);
      return { geo, buf, mat, lines, count: 0, truncated: false };
    });

    // projection scratch, per unit, sized to the welded vertex count
    this.proj = art.units.map((u) => ({
      x: new Float32Array(u.ex.topo.vertexCount),
      y: new Float32Array(u.ex.topo.vertexCount),
      ok: new Uint8Array(u.ex.topo.vertexCount),
      mark: new Int32Array(u.ex.topo.vertexCount),
    }));
    this._stamp = 0;

    this.stats = null;
    this.setEnabled(false);
  }

  get enabled() { return this.mode !== 'off'; }

  setEnabled(on) {
    for (const d of this.draws) d.lines.visible = !!on;
  }

  setOptions(o = {}) {
    for (const k of ['spacing', 'angleDeg', 'layers', 'curvature', 'reach', 'falloff', 'jitter', 'weight']) {
      if (o[k] !== undefined) this[k] = o[k];
    }
    if (o.mode !== undefined && INFILL_MODES.includes(o.mode)) this.mode = o.mode;
    this.setEnabled(this.enabled);
  }

  // The anchor of part `i`, in that part's LOCAL space.
  anchorLocal(i) { return this.anchors[i]; }
  setAnchorLocal(i, v) { this.anchors[i].copy(v); }
  resetAnchor(i) { this.anchors[i].copy(centroidOf(this.art.units[i].mesh)); }

  dispose() {
    for (const d of this.draws) {
      this.scene.remove(d.lines);
      d.geo.dispose(); d.mat.dispose();
    }
    this.draws = [];
  }

  // ------------------------------------------------------------------------
  // One frame. Must run AFTER art.update() for the same frame, because it
  // reads that frame's extracted silhouette.
  update(camera, sizePx, pixelRatio = 1) {
    const t0 = performance.now();
    const [W, H] = sizePx;
    this.camera.left = 0; this.camera.right = W;
    this.camera.top = 0; this.camera.bottom = H;
    this.camera.updateProjectionMatrix();

    if (!this.enabled) {
      for (const d of this.draws) { d.count = 0; d.geo.instanceCount = 0; }
      this.stats = null;
      return null;
    }

    const stamp = ++this._stamp;
    const units = this.art.units;

    // --- project every part's silhouette into pixels -----------------------
    for (let i = 0; i < units.length; i++) this._projectPart(i, camera, W, H, stamp);

    // Nearest first. A nearer part's silhouette subtracts from a farther one's.
    const order = this.frames.map((f, i) => i).filter(i => this.frames[i].ok)
      .sort((a, b) => this.frames[a].depth - this.frames[b].depth);

    let segs = 0, seeds = 0, truncated = false;
    for (let rank = 0; rank < order.length; rank++) {
      const i = order[rank];
      const occluders = order.slice(0, rank);
      const n = this.mode === 'hatch'
        ? this._hatchPart(i, occluders)
        : this._flowPart(i, occluders);
      segs += n.segments; seeds += n.seeds; truncated = truncated || n.truncated;
    }
    // parts with no usable silhouette this frame draw nothing
    for (let i = 0; i < this.draws.length; i++) {
      if (!this.frames[i].ok) { this.draws[i].count = 0; }
      const d = this.draws[i];
      d.geo.instanceCount = d.count;
      d.buf.needsUpdate = true;
      d.mat.linewidth = this.weight;
      d.mat.resolution.set(W, H);
    }

    this.stats = {
      mode: this.mode, segments: segs, seeds, truncated,
      spacing: this.spacing, angleDeg: this.angleDeg,
      layers: this.mode === 'hatch' ? this.layers : 0,
      curvature: this.mode === 'flow' ? this.curvature : 0,
      parts: this.frames.map((f, i) => ({
        name: units[i].mesh.name, silhouette: f.n, ok: f.ok,
        anchorPx: [f.ax, f.ay], reachPx: f.reach, segments: this.draws[i].count,
      })),
      frameMs: performance.now() - t0,
    };
    return this.stats;
  }

  // ------------------------------------------------------------------------
  // Project one part's silhouette edges to pixels, ORIENTED so that the region
  // the solid covers has non-zero winding.
  _projectPart(i, camera, W, H, stamp) {
    const u = this.art.units[i];
    const f = this.frames[i];
    const ex = u.ex, topo = ex.topo;
    const P = u.mesh.geometry.getAttribute('position').array;
    const rep = topo.rep, faceCanon = topo.faceCanon;
    const pr = this.proj[i];

    u.mesh.updateWorldMatrix(true, false);
    _m.copy(camera.projectionMatrix)
      .multiply(camera.matrixWorldInverse)
      .multiply(u.mesh.matrixWorld);
    const M = _m.elements;

    const project = (c) => {
      if (pr.mark[c] === stamp) return;
      pr.mark[c] = stamp;
      const o = rep[c] * 3;
      const x = P[o], y = P[o + 1], z = P[o + 2];
      const cw = M[3] * x + M[7] * y + M[11] * z + M[15];
      if (cw <= 1e-6) { pr.ok[c] = 0; return; }        // at or behind the eye
      const cx = M[0] * x + M[4] * y + M[8] * z + M[12];
      const cy = M[1] * x + M[5] * y + M[9] * z + M[13];
      pr.x[c] = (cx / cw * 0.5 + 0.5) * W;
      pr.y[c] = (0.5 - cy / cw * 0.5) * H;             // pixels, y down
      pr.ok[c] = 1;
    };

    const A = ex.selA, B = ex.selB, K = ex.selKind, SF = ex.selF;
    const total = ex.segmentCount;
    f.ensure(ex.silhouetteCount + 4);
    let n = 0, minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (let s = 0; s < total; s++) {
      if (K[s] !== 1) continue;
      const a = A[s], b = B[s];
      project(a); project(b);
      if (!pr.ok[a] || !pr.ok[b]) continue;

      // Orient the edge the way it appears in its FRONT face, so that every
      // boundary edge runs the same way round the covered region and the
      // winding number below means what it says.
      let ea = a, eb = b;
      const fc = SF[s] * 3;
      if (fc >= 0) {
        const c0 = faceCanon[fc], c1 = faceCanon[fc + 1], c2 = faceCanon[fc + 2];
        const forward = (c0 === a && c1 === b) || (c1 === a && c2 === b) || (c2 === a && c0 === b);
        if (!forward) { ea = b; eb = a; }
      }
      const px0 = pr.x[ea], py0 = pr.y[ea], px1 = pr.x[eb], py1 = pr.y[eb];
      f.x0[n] = px0; f.y0[n] = py0; f.x1[n] = px1; f.y1[n] = py1; n++;
      if (px0 < minX) minX = px0; if (px0 > maxX) maxX = px0;
      if (px1 < minX) minX = px1; if (px1 > maxX) maxX = px1;
      if (py0 < minY) minY = py0; if (py0 > maxY) maxY = py0;
      if (py1 < minY) minY = py1; if (py1 > maxY) maxY = py1;
    }
    f.n = n;
    f.ok = n >= 3 && maxX > minX && maxY > minY;
    if (!f.ok) return;
    f.minX = minX; f.minY = minY; f.maxX = maxX; f.maxY = maxY;

    // the anchor, projected the same way
    _v.copy(this.anchors[i]).applyMatrix4(u.mesh.matrixWorld).project(camera);
    f.ax = (_v.x * 0.5 + 0.5) * W;
    f.ay = (0.5 - _v.y * 0.5) * H;
    // `reach` is a fraction of the part's own on-screen size, so the shading
    // keeps its proportions as the camera dollies instead of growing.
    const radius = 0.5 * Math.hypot(maxX - minX, maxY - minY);
    f.reach = Math.max(radius * (this.reach / 100), 1e-3);
    f.depth = camera.position.distanceTo(u.mesh.getWorldPosition(_v));
  }

  // ------------------------------------------------------------------------
  // CROSS-HATCH. One or more families of parallel lines, each clipped to the
  // silhouette by an exact scanline in its own rotated frame, and to its
  // layer's tone threshold by an interval.
  _hatchPart(i, occluders) {
    const f = this.frames[i];
    const d = this.draws[i];
    const dst = d.buf.array;
    const cap = INFILL_LIMITS.maxSegmentsPerPart;
    const gamma = Math.max(0.05, this.falloff / 100);
    const s = Math.max(1.5, this.spacing);
    let count = 0, truncated = false, lines = 0;

    const emit = (x0, y0, x1, y1) => {
      if (count >= cap) { truncated = true; return; }
      const o = count * 6;
      dst[o] = x0; dst[o + 1] = y0; dst[o + 2] = 0;
      dst[o + 3] = x1; dst[o + 4] = y1; dst[o + 5] = 0;
      count++;
    };

    const layers = Math.max(1, Math.min(HATCH_OFFSETS_DEG.length, this.layers | 0));
    for (let L = 0; L < layers; L++) {
      const ang = THREE.MathUtils.degToRad(this.angleDeg + HATCH_OFFSETS_DEG[L]);
      const ca = Math.cos(ang), sa = Math.sin(ang);
      // u runs along the hatch line, v across it
      const uOf = (x, y) => x * ca + y * sa;
      const vOf = (x, y) => -x * sa + y * ca;

      // the v-range the part occupies
      let vmin = Infinity, vmax = -Infinity;
      for (const [cx, cy] of [[f.minX, f.minY], [f.maxX, f.minY], [f.minX, f.maxY], [f.maxX, f.maxY]]) {
        const v = vOf(cx, cy);
        if (v < vmin) vmin = v; if (v > vmax) vmax = v;
      }
      const first = Math.ceil(vmin / s), last = Math.floor(vmax / s);
      const idx = new ScanIndex(f, ca, sa, s);
      const occIdx = occluders.map(o => new ScanIndex(this.frames[o], ca, sa, s));
      const tau = LAYER_THRESHOLDS[L];
      const baseR = toneRadius(tau, f.reach, gamma);
      const au = uOf(f.ax, f.ay), av = vOf(f.ax, f.ay);

      for (let k = first; k <= last; k++) {
        const v = k * s;
        lines++;
        // The layer's threshold is a circle; jittering its radius per line is
        // what keeps the edge of a tonal step from reading as a compass arc.
        const j = (hash01(k * 131 + L * 7919) * 2 - 1) * (this.jitter / 100);
        const r = baseR * (1 + j);
        if (r <= 0) continue;
        const dv = v - av;
        if (Math.abs(dv) >= r) continue;
        const half = Math.sqrt(r * r - dv * dv);
        const tLo = au - half, tHi = au + half;

        // exact spans of the part at this v, minus every nearer part's spans
        const spans = idx.spansAt(v);
        if (!spans.length) continue;
        let cut = clipSpans(spans, tLo, tHi);
        for (let oi = 0; oi < occIdx.length; oi++) {
          if (!cut.length) break;
          cut = subtractSpans(cut, occIdx[oi].spansAt(v));
        }
        for (let q = 0; q + 1 < cut.length; q += 2) {
          const a0 = cut[q], a1 = cut[q + 1];
          if (a1 - a0 < 0.75) continue;               // shorter than a mark
          emit(a0 * ca - v * sa, a0 * sa + v * ca, a1 * ca - v * sa, a1 * sa + v * ca);
          if (truncated) break;
        }
        if (truncated) break;
      }
      if (truncated) break;
    }
    d.count = count; d.truncated = truncated;
    return { segments: count, seeds: lines, truncated };
  }

  // ------------------------------------------------------------------------
  // LINE-FLOW. Streamlines through a direction field, seeded on a grid and
  // integrated until they leave the silhouette, leave the tone field, or run
  // out of length. Clipped by intersecting each step against the silhouette
  // segments themselves, so an endpoint lands ON the outline.
  _flowPart(i, occluders) {
    const f = this.frames[i];
    const d = this.draws[i];
    const dst = d.buf.array;
    const cap = INFILL_LIMITS.maxSegmentsPerPart;
    const gamma = Math.max(0.05, this.falloff / 100);
    const s = Math.max(2, this.spacing);
    let count = 0, truncated = false, seeds = 0;

    const emit = (x0, y0, x1, y1) => {
      if (count >= cap) { truncated = true; return false; }
      const o = count * 6;
      dst[o] = x0; dst[o + 1] = y0; dst[o + 2] = 0;
      dst[o + 3] = x1; dst[o + 4] = y1; dst[o + 5] = 0;
      count++;
      return true;
    };

    // ONE membership rule, shared with cross-hatch: a point is inside when it
    // lies in a span of its own row. Pitch is a pixel, so the row a point is
    // tested on is the row it is on.
    const idx = new ScanIndex(f, 1, 0, 1);
    const occIdx = occluders.map(o => new ScanIndex(this.frames[o], 1, 0, 1));
    const inside = (x, y) => idx.contains(x, y) && !occIdx.some(o => o.contains(x, y));
    const ang = THREE.MathUtils.degToRad(this.angleDeg);
    const gx = Math.cos(ang), gy = Math.sin(ang);
    const c = Math.max(-1, Math.min(1, this.curvature / 100));

    // The field. `curvature` sweeps one slider through three visual languages
    // that all hang off the SAME anchor the tone does: veins radiating out of
    // it, straight grain, and contour lines wrapping around it.
    const dir = (x, y, out) => {
      let rx = x - f.ax, ry = y - f.ay;
      const rl = Math.hypot(rx, ry) || 1;
      rx /= rl; ry /= rl;
      let tx, ty;
      if (c >= 0) { tx = -ry; ty = rx; }                 // concentric
      else { tx = rx; ty = ry; }                          // radial
      const w = Math.abs(c);
      // keep the grain in the same hemisphere as the target, or the blend
      // cancels to nothing where they oppose
      const sgn = (gx * tx + gy * ty) < 0 ? -1 : 1;
      let vx = gx * sgn * (1 - w) + tx * w;
      let vy = gy * sgn * (1 - w) + ty * w;
      const l = Math.hypot(vx, vy);
      if (l < 1e-6) { out[0] = gx; out[1] = gy; return; }
      out[0] = vx / l; out[1] = vy / l;
    };

    const step = INFILL_LIMITS.flowStepPx;
    const dv = [0, 0], dv2 = [0, 0];

    let seedIdx = 0;
    for (let y = f.minY; y <= f.maxY; y += s) {
      for (let x = f.minX; x <= f.maxX; x += s) {
        const id = seedIdx++;
        // A per-streamline threshold. In a dark passage every seed survives;
        // toward the light they drop out one at a time, so the family thins
        // instead of ending on a hard edge.
        const tau = 0.06 + hash01(id * 2654435761) * 0.80;
        const rMax = toneRadius(tau, f.reach, gamma);
        if (rMax <= 0) continue;
        // a light stagger, so the seeds do not read as a grid
        const sx = x + (hash01(id * 40503) - 0.5) * s * 0.85;
        const sy = y + (hash01(id * 22699) - 0.5) * s * 0.85;
        if (Math.hypot(sx - f.ax, sy - f.ay) > rMax) continue;
        if (!inside(sx, sy)) continue;
        seeds++;

        for (const sense of [1, -1]) {
          let px = sx, py = sy;
          for (let n = 0; n < INFILL_LIMITS.flowMaxSteps; n++) {
            dir(px, py, dv);
            const mx = px + dv[0] * sense * step * 0.5;
            const my = py + dv[1] * sense * step * 0.5;
            dir(mx, my, dv2);
            let nx = px + dv2[0] * sense * step;
            let ny = py + dv2[1] * sense * step;

            // Two ways a step can end: it leaves the TONE FIELD, or it leaves
            // the SILHOUETTE. Both are cut to a parameter along the step and
            // the EARLIER cut wins — taking the tone cut on its own would let
            // a step that also left the outline emit a point outside it, which
            // is the one thing this stage must never do.
            let tCut = 1;
            const dEnd = Math.hypot(nx - f.ax, ny - f.ay);
            if (dEnd > rMax) {
              const dCur = Math.hypot(px - f.ax, py - f.ay);
              tCut = Math.max(0, Math.min(1, (rMax - dCur) / Math.max(dEnd - dCur, 1e-6)));
            }
            let cx2 = px + (nx - px) * tCut, cy2 = py + (ny - py) * tCut;
            if (!inside(cx2, cy2)) {
              // Bisect the step for the exit. `px,py` is known inside, so the
              // crossing is bracketed; eight halvings put the endpoint within
              // a hundredth of a pixel of the outline, and the LAST INSIDE
              // point is the one kept, so the mark never overshoots.
              let lo = 0, hi = tCut;
              for (let b = 0; b < 8; b++) {
                const mid = (lo + hi) / 2;
                if (inside(px + (nx - px) * mid, py + (ny - py) * mid)) lo = mid; else hi = mid;
              }
              tCut = lo;
              cx2 = px + (nx - px) * lo; cy2 = py + (ny - py) * lo;
              if (Math.hypot(cx2 - px, cy2 - py) > 0.4) emit(px, py, cx2, cy2);
              break;
            }
            if (tCut < 1) {
              if (Math.hypot(cx2 - px, cy2 - py) > 0.4) emit(px, py, cx2, cy2);
              break;
            }
            if (!emit(px, py, nx, ny)) break;
            px = nx; py = ny;
          }
          if (truncated) break;
        }
        if (truncated) break;
      }
      if (truncated) break;
    }
    d.count = count; d.truncated = truncated;
    return { segments: count, seeds, truncated };
  }
}

// ===========================================================================
// 2D helpers. All pure, all exported so the gate can drive them directly
// rather than inferring their behaviour from a picture.

// The vertex centroid of a mesh, in its own local space — the anchor's default
// and the whole of the "fixed convention" this stage starts from.
export function centroidOf(mesh) {
  const P = mesh.geometry.getAttribute('position');
  const n = P.count || 1;
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < P.count; i++) { x += P.getX(i); y += P.getY(i); z += P.getZ(i); }
  return new THREE.Vector3(x / n, y / n, z / n);
}

// Every span of the part along the line at cross-coordinate `v`, in the frame
// rotated by (ca, sa). Returned as a flat [u0, u1, u0, u1, ...] of the runs
// where the WINDING NUMBER is non-zero — exact at concavities, and correct
// where a fold puts a second loop inside the outline.
//
// This is the PLAIN scan, over every edge. ScanIndex does the same thing after
// bucketing by row, and is what the clipper actually runs; this stays as the
// unoptimised statement of the rule, and `index/agrees-with-the-plain-scan`
// requires the two to return the same spans at two angles over 420 rows. A
// deliberate duplicate with a check holding it shut, not a stray copy.
export function scanSpans(f, ca, sa, v) {
  if (!f.ok) return [];
  const hits = [];
  for (let i = 0; i < f.n; i++) {
    const v0 = -f.x0[i] * sa + f.y0[i] * ca;
    const v1 = -f.x1[i] * sa + f.y1[i] * ca;
    // half-open in v, so a vertex exactly on the line is counted once
    if ((v0 <= v && v1 > v) || (v1 <= v && v0 > v)) {
      const t = (v - v0) / (v1 - v0);
      const u0 = f.x0[i] * ca + f.y0[i] * sa;
      const u1 = f.x1[i] * ca + f.y1[i] * sa;
      hits.push({ u: u0 + (u1 - u0) * t, w: v1 > v0 ? 1 : -1 });
    }
  }
  if (hits.length < 2) return [];
  hits.sort((a, b) => a.u - b.u);
  const spans = [];
  let wind = 0, start = 0;
  for (const h of hits) {
    const was = wind;
    wind += h.w;
    if (was === 0 && wind !== 0) start = h.u;
    else if (was !== 0 && wind === 0) { spans.push(start, h.u); }
  }
  return spans;
}

// Intersect flat spans with [lo, hi].
export function clipSpans(spans, lo, hi) {
  const out = [];
  for (let i = 0; i + 1 < spans.length; i += 2) {
    const a = Math.max(spans[i], lo), b = Math.min(spans[i + 1], hi);
    if (b > a) out.push(a, b);
  }
  return out;
}

// A minus B, both flat span lists, both sorted and non-overlapping.
export function subtractSpans(A, B) {
  if (!B.length) return A;
  const out = [];
  for (let i = 0; i + 1 < A.length; i += 2) {
    let cur = [[A[i], A[i + 1]]];
    for (let j = 0; j + 1 < B.length; j += 2) {
      const b0 = B[j], b1 = B[j + 1];
      const next = [];
      for (const [a0, a1] of cur) {
        if (b1 <= a0 || b0 >= a1) { next.push([a0, a1]); continue; }
        if (b0 > a0) next.push([a0, b0]);
        if (b1 < a1) next.push([b1, a1]);
      }
      cur = next;
      if (!cur.length) break;
    }
    for (const [a0, a1] of cur) out.push(a0, a1);
  }
  return out;
}

// Non-zero winding test for a single point, by casting along +x. The REFERENCE
// definition of "inside" for this file: nothing here calls it — the clipper
// goes through ScanIndex, which is the same rule made fast — and it exists so
// the rule can be stated in one obvious place and checked against the indexed
// one. `index/contains-matches-winding` pins the two together.
export function insideWinding(f, x, y) {
  if (!f.ok) return false;
  let wind = 0;
  for (let i = 0; i < f.n; i++) {
    const y0 = f.y0[i], y1 = f.y1[i];
    if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
      const t = (y - y0) / (y1 - y0);
      if (f.x0[i] + (f.x1[i] - f.x0[i]) * t > x) wind += y1 > y0 ? 1 : -1;
    }
  }
  return wind !== 0;
}
