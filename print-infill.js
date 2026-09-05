// AUTHORED INFILL — cross-hatch, line-flow and TONAL FILL, drawn INSIDE a
// solid's 2D silhouette.
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
// ============================ TONAL FILL ===================================
// The third family, and a DIFFERENT VOCABULARY from the other two rather than
// a tuning of them. Hatch and flow make tone out of line density; the
// reference this was built against makes it out of FILLED MASS — leaves that
// are solid black shapes with their veins left as white lines through the
// ink, light petals with dark cores, and depth that comes from a dark shape
// sitting next to a light one. No amount of respacing a hatch produces that.
// So `tone` fills the silhouette, and the three things it adds are:
//
//   1. THE FILL. A scanline at a sub-pixel pitch, emitting one segment per
//      span. That is the SAME row-span membership rule the other two families
//      clip with — the fill is not a new notion of "inside", it is the
//      existing one drawn solid. Which matters here more than anywhere else:
//      a filled shape shows a leak as a bar of ink running off across the
//      paper, where a hatch line shows it as one stray stroke.
//
//   2. RESERVED LINES. A vein is not stroked over the fill, it is WITHHELD
//      from it: the vein path is thickened into a capsule, the capsule's
//      interval on each row is computed in closed form, and that interval is
//      SUBTRACTED from the row's spans. So a vein is unfilled paper with ink
//      on both sides of it, which is what makes the reference's leaves read as
//      leaves. It reuses subtractSpans() — the same operation that already
//      takes a nearer part's silhouette out of a farther one's.
//
//   3. PER-PART DARKNESS. The reference's depth is contrast BETWEEN adjacent
//      shapes, so a single global tone slider cannot express it at all: what
//      is needed is "this part fills dark, that one stays light". Darkness is
//      therefore per part, one number each, and it is the control that makes
//      the effect legible rather than a refinement of it.
//
// WHERE THE VEINS COME FROM. Nowhere near the surface — this module's one rule
// still holds, and a vein here is authored 2D illustration, not a crease and
// not a ridge. The construction is: the principal axis of the projected
// silhouette gives the shape's length; the midrib is sampled along it and each
// sample is snapped to the MIDPOINT OF THE CROSS-SPAN at that station, so the
// rib follows the shape's own medial line instead of a straight line through
// its centroid; the laterals branch off at a sweep toward the tip and are
// scaled by the measured half-width on their own side. All of it is read off
// the silhouette, exactly like everything else in this file.
//
// THE GRADIENT IS AN ORDERED DITHER ON THE ROWS, which falls out of the same
// gift the tone field already gives: because the field is radial, every
// threshold is a CIRCLE. Each fill row is assigned one of TONE_LEVELS levels
// by a bit-reversal permutation (so the drawn rows spread evenly instead of
// banding into stripes), and a row of level L is drawn only where the coverage
// exceeds L / TONE_LEVELS. Coverage is `darkness * (1 - g + g * tone)`, so
// inverting it for the threshold radius is closed form and the whole ramp
// stays an interval clip — no per-pixel sampling anywhere. At gradient 0 every
// row passes at full darkness and the shape is solid, which is the default,
// and which is the reference leaf.
//
// WHAT IT COSTS, MEASURED — AND MEASURE IT SETTLED, WHICH IS THE FIRST THING
// TO GET WRONG HERE. `stats.frameMs` is one frame's CPU time in this pass; poll
// it 1.2 s after changing the view and, on a frame that takes seconds, you read
// an EARLIER, cheaper frame. That is exactly what the first pass at this table
// did — it reported 30 ms where the settled answer is 1373, and 1300 ms where
// the settled answer is 6721. Poll until consecutive samples agree.
//
// A hatch at 7 px spacing lays ~200 rows; a solid fill lays one every 0.88 px,
// and the work is rows x edges-crossed-per-row. Headless Chromium, 1100x800,
// software GL, all parts filled, tonal fill:
//
//                                     2-part    3-part bundle, bloom at:
//                                     19k sil   301k tri   75k tri   36k tri
//                                               275k sil   67k sil   31k sil
//   default framing ................    7 ms     1373 ms    791 ms    388 ms
//   camera in close on the leaf ....      —      6721 ms   4277 ms   1999 ms
//     ... with the bloom at dark 0 ..      —      1161 ms    729 ms    336 ms
//   CROSS-HATCH, same close-up .....      —      2942 ms   2402 ms   2160 ms
//
// TWO THINGS THAT TABLE SAYS, and the second one is why decimating the fixture
// was not the fix:
//
//   * The fill IS roughly linear in silhouette edges over the range where the
//     per-part segment cap does not bind — 31k -> 67k edges is x2.12 edges for
//     x2.14 time. Above that `maxSegmentsPerPart` truncates and the curve bends
//     over, which is why x4.1 the edges only costs x1.57 the time.
//   * But CROSS-HATCH pays 2.2-2.9 SECONDS at the same camera whatever the
//     bloom's resolution, against 4 ms at default framing on the small bundle.
//     So most of the close-up cost is not the fill's and not the triangle
//     count's: it is what the whole infill stage costs a three-part scene at
//     extreme zoom. Reducing the fixture from 301k to 75k triangles bought 1.6x
//     at the worst case and 1.7x at default framing — real, and not the cliff.
//
// Three things bound the fill and all three are in this file: the row range is
// clamped to the VIEWPORT (ink off the canvas is not ink), the scan index is
// built once per part per frame and shared with the parts it occludes, and
// `toneMaxRows` caps the rows outright. The artist's own levers are the nib
// (rows scale as 1/nib) and a part at darkness 0, which returns before an index
// is built. THE REAL FIX IS AN ACTIVE-EDGE-TABLE SWEEP — carrying the crossing
// set from row to row instead of re-testing candidates per row — and it is
// deliberately NOT done here: it is a second implementation of the membership
// rule, which is the one thing #157 says not to have two of, so it wants its
// own session and its own agreement-with-spansAt check. Note it would help
// cross-hatch and line-flow too, which is the other thing the table says.
//
// ============================ WHAT IT DOES NOT DO ==========================
// * SELF-OCCLUSION IS OUT OF SCOPE, BY DESIGN. The infill fills the solid's
//   OUTLINE. A bloom whose petals overlap each other is one silhouette here,
//   and hatching runs across the whole of it — which is what "shade inside the
//   extracted silhouette" means, and is what an illustrator inking a filled
//   outline does. Per-petal infill needs per-petal solids and waits on
//   multi-part export. TONAL FILL MAKES THAT LIMIT LOUD rather than moving it:
//   a fused bloom fills as ONE shape, so the reference's petal-against-petal
//   contrast is not reachable on either shipped bundle. Per-PART contrast is,
//   and is what `darkness` exists for.
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

export const INFILL_MODES = ['off', 'hatch', 'flow', 'tone'];

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
  // Tonal fill. The row pitch is derived from the stroke WEIGHT rather than
  // being its own slider: a fill is solid exactly when consecutive rows
  // overlap, so the two numbers are not independent and exposing both would
  // make "solid" a state the artist has to find by hand.
  tonePitchFactor: 0.80,       // x the stroke weight
  tonePitchMinPx: 0.5,
  toneMaxRows: 4000,           // per part per frame; a guard, not a look
  toneBucketPx: 6,             // scan-index bucket size; work only, never an answer
};

// How many discrete steps the gradient's ordered dither has, and the order the
// rows take them in. The order is a BIT REVERSAL of 0..7, so that when only
// the first n levels are drawn the surviving rows are spread evenly over the
// shape rather than bunched into a band: at n = 1 every eighth row, at n = 2
// every fourth, at n = 4 every other one.
export const TONE_LEVELS = 8;
export const TONE_ORDER = [0, 4, 2, 6, 1, 5, 3, 7];

// Where a lateral vein leaves the midrib, measured from the cross axis toward
// the tip, and how far along its side it reaches. Authored constants: they are
// what a drawn leaf looks like, not anything measured off a surface.
export const VEIN_SWEEP_DEG = 34;
export const VEIN_REACH = 0.86;      // of the measured half-width on that side
export const VEIN_INSET = 0.05;      // the rib stops short of both extremes

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
  // `opts.bucketPitch` decouples the BUCKET size from the row pitch, and
  // `opts.vLo`/`opts.vHi` clamp bucketing to a range of interest. Both exist
  // because of the tonal fill and neither changes an answer — only the work.
  // A row is still evaluated at exactly the v it asks for; the bucket only
  // decides which edges are candidates. Measured on the three-part bundle with
  // the camera close in on the leaf: at a 0.88 px row pitch the bloom's 45,000
  // edges projected across tens of thousands of pixels, most of them off
  // screen, and bucketing them one row at a time cost 1.5 SECONDS a frame.
  // Coarser buckets cost nothing (the per-row candidate count is a function of
  // edges per pixel, not of bucket size) and the clamp drops the off-screen
  // extent entirely.
  constructor(f, ca, sa, pitch, opts = {}) {
    this.f = f; this.ca = ca; this.sa = sa; this.pitch = pitch;
    this.bucket = opts.bucketPitch > 0 ? opts.bucketPitch : pitch;
    this.rows = new Map();
    this.openRows = 0;                 // rows the outline failed to close on
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
    const bLo = opts.vLo !== undefined ? Math.floor(opts.vLo / this.bucket) : -Infinity;
    const bHi = opts.vHi !== undefined ? Math.floor(opts.vHi / this.bucket) : Infinity;
    for (let i = 0; i < f.n; i++) {
      const a = Math.max(bLo, Math.floor(Math.min(v0[i], v1[i]) / this.bucket));
      const b = Math.min(bHi, Math.floor(Math.max(v0[i], v1[i]) / this.bucket));
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
    const row = Math.floor(v / this.bucket);
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
    if (wind !== 0) { spans.push(start, hits[hits.length - 1].u); this.openRows++; }
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

    // --- tonal fill ------------------------------------------------------
    // `gradient` 0 is a FLAT fill: the tone field is ignored entirely and the
    // shape fills to its outline. That is the default because it is the
    // reference — a leaf in these drawings is a solid black shape, and the
    // gradient is the departure from it, not the starting point.
    this.gradient = 0;       // % of the tone field mixed into the coverage
    this.veins = 4;          // lateral vein PAIRS; the midrib is always there
    this.veinWidth = 2.5;    // px of fill withheld along each vein path
    // The nib the fill is laid down with. Its OWN control rather than the line
    // work's `weight`, because it is the one number that sets both how solid
    // the fill is and what it costs: the row pitch is derived from it (see
    // tonePitch()), so rows scale as 1/fillWeight and so does the frame time.
    // A fat nib is a legitimate mark — and it is also the lever for a bloom
    // that fills the viewport.
    this.fillWeight = 1.1;

    // The overlay. The infill is 2D, so it is drawn by its OWN orthographic
    // camera in PIXEL coordinates rather than being pushed back into the
    // scene: a hatch pattern that lived in the mesh's local space would rotate
    // with the object, and this pattern belongs to the picture plane.
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 1, 0, 1, -1, 1);

    this.frames = art.units.map(() => new PartFrame());
    this.anchors = art.units.map((u) => centroidOf(u.mesh));
    // PER PART, like the anchor and for the same reason: the reference's depth
    // is one shape reading dark against its neighbour reading light, and that
    // is not something a single number for the whole picture can say. 100 is
    // solid; 0 is a part left as outline only.
    this.darkness = art.units.map(() => 100);

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

    // Per-part tonal-fill bookkeeping, so the read-out and the gate can say
    // how many rows were laid down and how many of them a vein cut into.
    this.rowStats = art.units.map(() => ({ rows: 0, reservedRows: 0, veinPaths: 0, openRows: 0 }));

    this.stats = null;
    this.setEnabled(false);
  }

  get enabled() { return this.mode !== 'off'; }

  setEnabled(on) {
    for (const d of this.draws) d.lines.visible = !!on;
  }

  setOptions(o = {}) {
    for (const k of ['spacing', 'angleDeg', 'layers', 'curvature', 'reach', 'falloff',
                     'jitter', 'weight', 'gradient', 'veins', 'veinWidth', 'fillWeight']) {
      if (o[k] !== undefined) this[k] = o[k];
    }
    if (o.mode !== undefined && INFILL_MODES.includes(o.mode)) this.mode = o.mode;
    this.setEnabled(this.enabled);
  }

  // The darkness of part `i`, 0..100. The one control that makes tonal
  // contrast between two parts expressible at all.
  darknessOf(i) { return this.darkness[i]; }
  setDarkness(i, v) { this.darkness[i] = Math.max(0, Math.min(100, +v || 0)); }

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
    this._W = W; this._H = H;
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
    this._idxCache = new Map();          // per-frame, see getIdx() in _tonePart

    // --- project every part's silhouette into pixels -----------------------
    for (let i = 0; i < units.length; i++) this._projectPart(i, camera, W, H, stamp);

    // Nearest first. A nearer part's silhouette subtracts from a farther one's.
    const order = this.frames.map((f, i) => i).filter(i => this.frames[i].ok)
      .sort((a, b) => this.frames[a].depth - this.frames[b].depth);

    let segs = 0, seeds = 0, truncated = false;
    for (let rank = 0; rank < order.length; rank++) {
      const i = order[rank];
      const occluders = order.slice(0, rank);
      const n = this.mode === 'hatch' ? this._hatchPart(i, occluders)
        : this.mode === 'tone' ? this._tonePart(i, occluders)
        : this._flowPart(i, occluders);
      segs += n.segments; seeds += n.seeds; truncated = truncated || n.truncated;
    }
    // parts with no usable silhouette this frame draw nothing
    for (let i = 0; i < this.draws.length; i++) {
      if (!this.frames[i].ok) { this.draws[i].count = 0; }
      const d = this.draws[i];
      d.geo.instanceCount = d.count;
      d.buf.needsUpdate = true;
      d.mat.linewidth = this.mode === 'tone' ? this.fillWeight : this.weight;
      d.mat.resolution.set(W, H);
    }

    this.stats = {
      mode: this.mode, segments: segs, seeds, truncated,
      spacing: this.spacing, angleDeg: this.angleDeg,
      layers: this.mode === 'hatch' ? this.layers : 0,
      curvature: this.mode === 'flow' ? this.curvature : 0,
      gradient: this.mode === 'tone' ? this.gradient : 0,
      fillWeight: this.mode === 'tone' ? this.fillWeight : 0,
      veins: this.mode === 'tone' ? this.veins : 0,
      veinWidth: this.mode === 'tone' ? this.veinWidth : 0,
      tonePitch: this.mode === 'tone' ? this.tonePitch() : 0,
      parts: this.frames.map((f, i) => ({
        name: units[i].mesh.name, silhouette: f.n, ok: f.ok,
        anchorPx: [f.ax, f.ay], reachPx: f.reach, segments: this.draws[i].count,
        darkness: this.darkness[i],
        rows: this.rowStats[i].rows, reservedRows: this.rowStats[i].reservedRows,
        veinPaths: this.rowStats[i].veinPaths, openRows: this.rowStats[i].openRows,
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
  // The fill row pitch. Derived from the stroke weight rather than exposed:
  // the fill is solid exactly when consecutive rows overlap, so a separate
  // spacing slider would put "solid" — the whole point of this family — behind
  // a coincidence of two numbers.
  tonePitch() {
    return Math.max(INFILL_LIMITS.tonePitchMinPx, this.fillWeight * INFILL_LIMITS.tonePitchFactor);
  }

  // The vein paths of part `i` for THIS frame, in pixels. Exposed so the panel
  // read-out and the gate can see the same paths the fill reserved against,
  // rather than re-deriving them and comparing two constructions.
  veinPathsFor(i) {
    const f = this.frames[i];
    if (!f.ok || !(this.veinWidth > 0)) return [];
    return veinPaths(f, this.veins);
  }

  // ------------------------------------------------------------------------
  // TONAL FILL. The silhouette filled — solid, or ramped by the tone field —
  // with vein paths WITHHELD from the fill rather than stroked over it.
  //
  // Three subtractions happen to every row, in this order and for three
  // different reasons: the tone threshold (an interval clip against a circle,
  // because the field is radial), every nearer part's silhouette (the same
  // between-part occlusion the other two families do), and the reserved veins.
  // The vein subtraction is LAST on purpose — a vein is negative space in the
  // ink that actually got laid down, so it must not be able to "reserve"
  // through a region that was never going to be filled and then appear to have
  // done something.
  _tonePart(i, occluders) {
    const f = this.frames[i];
    const d = this.draws[i];
    const rs = this.rowStats[i];
    rs.rows = 0; rs.reservedRows = 0; rs.veinPaths = 0; rs.openRows = 0;
    const dst = d.buf.array;
    const cap = INFILL_LIMITS.maxSegmentsPerPart;
    const gamma = Math.max(0.05, this.falloff / 100);
    const D = Math.max(0, Math.min(1, this.darkness[i] / 100));
    const g = Math.max(0, Math.min(1, this.gradient / 100));
    const pitch = this.tonePitch();
    let count = 0, truncated = false;

    const emit = (x0, y0, x1, y1) => {
      if (count >= cap) { truncated = true; return; }
      const o = count * 6;
      dst[o] = x0; dst[o + 1] = y0; dst[o + 2] = 0;
      dst[o + 3] = x1; dst[o + 4] = y1; dst[o + 5] = 0;
      count++;
    };

    if (D <= 0) { d.count = 0; d.truncated = false; return { segments: 0, seeds: 0, truncated: false }; }

    // The rows run along `angleDeg`, the same control the other two families
    // use for direction. It is invisible on a solid fill and is what orients
    // the gradient's dither once the shape stops being solid.
    const ang = THREE.MathUtils.degToRad(this.angleDeg);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const vOf = (x, y) => -x * sa + y * ca;
    const uOf = (x, y) => x * ca + y * sa;

    let vmin = Infinity, vmax = -Infinity;
    for (const [cx, cy] of [[f.minX, f.minY], [f.maxX, f.minY], [f.minX, f.maxY], [f.maxX, f.maxY]]) {
      const v = vOf(cx, cy);
      if (v < vmin) vmin = v;
      if (v > vmax) vmax = v;
    }
    // The overlay is drawn in PIXEL coordinates, so ink outside the canvas is
    // not ink. Clamping the row range to the viewport is what keeps a part
    // that is mostly off screen — the bloom, whenever the camera is in close
    // on the leaf — from costing a second and a half a frame for marks nobody
    // can see.
    const W = this._W || 0, H = this._H || 0;
    let cLo = Infinity, cHi = -Infinity;
    for (const [cx, cy] of [[0, 0], [W, 0], [0, H], [W, H]]) {
      const v = vOf(cx, cy);
      if (v < cLo) cLo = v;
      if (v > cHi) cHi = v;
    }
    const vLo = Math.max(vmin, cLo), vHi = Math.min(vmax, cHi);
    if (!(vHi > vLo)) { d.count = 0; d.truncated = false; return { segments: 0, seeds: 0, truncated: false }; }
    const first = Math.ceil(vLo / pitch);
    const last = Math.min(Math.floor(vHi / pitch), first + INFILL_LIMITS.toneMaxRows);

    // ONE INDEX PER PART PER FRAME. Every part in this family scans at the same
    // angle and the same pitch, so a part's index is the same object whether it
    // is being filled or is subtracting from something behind it — and without
    // the cache the nearest part's index is rebuilt once for itself and once
    // for every part behind it. Measured on the three-part bundle: the bloom's
    // 45,000-edge index was being built three times a frame. The bucket range
    // is the VIEWPORT's, not the part's, precisely so the cached index does not
    // depend on which part asked for it.
    const io = { vLo: cLo, vHi: cHi, bucketPitch: Math.max(pitch, INFILL_LIMITS.toneBucketPx) };
    const getIdx = (j) => {
      let ix = this._idxCache.get(j);
      if (!ix) { ix = new ScanIndex(this.frames[j], ca, sa, pitch, io); this._idxCache.set(j, ix); }
      return ix;
    };
    const idx = getIdx(i);
    const occIdx = occluders.map(o => getIdx(o));
    const au = uOf(f.ax, f.ay), av = vOf(f.ax, f.ay);

    const paths = this.veinWidth > 0 ? veinPaths(f, this.veins) : [];
    rs.veinPaths = paths.length;
    const rot = rotatePaths(paths, ca, sa);
    const halfVein = this.veinWidth / 2;

    const ctx = { idx, occ: occIdx, rot, halfVein, pitch, au, av,
      reach: f.reach, gamma, darkness: D, gradient: g, jitter: this.jitter / 100 };

    for (let k = first; k <= last; k++) {
      const v = k * pitch;
      const row = toneRowSpans(ctx, k);
      if (row.onOutline) rs.rows++;
      if (row.reserved) rs.reservedRows++;
      const spans = row.spans;

      for (let q = 0; q + 1 < spans.length; q += 2) {
        const a0 = spans[q], a1 = spans[q + 1];
        if (a1 - a0 < 0.3) continue;                // narrower than a mark
        emit(a0 * ca - v * sa, a0 * sa + v * ca, a1 * ca - v * sa, a1 * sa + v * ca);
        if (truncated) break;
      }
      if (truncated) break;
    }

    rs.openRows = idx.openRows;
    d.count = count; d.truncated = truncated;
    return { segments: count, seeds: rs.rows, truncated };
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
// THE LAST LINE IS THE OPEN-OUTLINE CLOSURE, and it is not a tolerance. A
// projected silhouette here is often NOT a closed curve (#157: the shipped
// bloom is a fused STL split with 24 boundary and 324 non-manifold edges whose
// third face is dropped), and on such a row the crossings do not balance: the
// winding walks up and never comes back to zero, so no span is ever emitted
// and the row draws NOTHING. That is invisible in a hatch — one missing line
// among hundreds — and it is total in a fill. Measured on the separate leaf in
// bloom-stem-leaf-bundle.glb, whose 84-triangle solid has 16 non-manifold
// edges: THREE crossings on every row, and a fill that came out completely
// empty. So a row whose winding never returns to zero is closed at its LAST
// crossing, which is the outline's own outermost statement about where the
// shape ends on that row.
//
// The repair is INERT on a closed outline — `wind` is exactly 0 there and the
// line never runs — which is what lets it live in the shared rule instead of
// in one family: `boundary/closure-is-inert-on-a-closed-outline` pins that in
// both directions, and the hatch/flow gate is unmoved by it.
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
  if (wind !== 0) spans.push(start, hits[hits.length - 1].u);
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

// ===========================================================================
// TONAL FILL — the pure 2D geometry. All of it is driven directly by the gate
// over shapes whose answers can be written down, for the same reason the
// clipper is: on a nineteen-thousand-edge silhouette a wrong answer still
// draws a plausible picture.

// Merge a flat, unordered list of [lo, hi] pairs into a sorted, disjoint one.
// Reserved veins overlap each other at the midrib by construction, and
// subtractSpans() documents its inputs as sorted and non-overlapping.
export function mergeSpans(spans) {
  const pairs = [];
  for (let i = 0; i + 1 < spans.length; i += 2) {
    if (spans[i + 1] > spans[i]) pairs.push([spans[i], spans[i + 1]]);
  }
  if (!pairs.length) return [];
  pairs.sort((a, b) => a[0] - b[0]);
  const out = [pairs[0][0], pairs[0][1]];
  for (let i = 1; i < pairs.length; i++) {
    const [a, b] = pairs[i];
    if (a <= out[out.length - 1]) out[out.length - 1] = Math.max(out[out.length - 1], b);
    else out.push(a, b);
  }
  return out;
}

// The interval of u at which the horizontal line `v` meets the CAPSULE of
// radius r around the segment (ua,va)-(ub,vb) — i.e. every point within r of
// the segment. A capsule is convex, so the answer is a single interval and is
// the min/max over its three convex pieces: the two end discs and the slab
// between them. Closed form on purpose: this runs once per vein segment per
// fill row, and a distance field sampled per pixel is the thing this whole
// file is built to avoid.
export function capsuleSpanAtRow(ua, va, ub, vb, r, v) {
  if (!(r > 0)) return null;
  let lo = Infinity, hi = -Infinity;
  for (const [cu, cv] of [[ua, va], [ub, vb]]) {
    const dy = v - cv;
    if (Math.abs(dy) <= r) {
      const w = Math.sqrt(r * r - dy * dy);
      if (cu - w < lo) lo = cu - w;
      if (cu + w > hi) hi = cu + w;
    }
  }
  const du = ub - ua, dv = vb - va;
  const len = Math.hypot(du, dv);
  if (len > 1e-9) {
    const nu = -dv / len * r, nv = du / len * r;
    const quad = [[ua + nu, va + nv], [ub + nu, vb + nv], [ub - nu, vb - nv], [ua - nu, va - nv]];
    for (let i = 0; i < 4; i++) {
      const [x0, y0] = quad[i], [x1, y1] = quad[(i + 1) % 4];
      if ((y0 <= v && y1 > v) || (y1 <= v && y0 > v)) {
        const t = (v - y0) / (y1 - y0);
        const u = x0 + (x1 - x0) * t;
        if (u < lo) lo = u;
        if (u > hi) hi = u;
      }
    }
  }
  return hi > lo ? [lo, hi] : null;
}

// Every reserved interval on row `v`, for a set of polylines already expressed
// in the same (u, v) frame the fill rows run in. This is the whole of "a vein
// is negative space": the result is handed to subtractSpans().
export function reserveSpansAt(paths, v, halfWidth) {
  if (!(halfWidth > 0)) return [];
  const out = [];
  for (const p of paths) {
    for (let i = 0; i + 1 < p.length; i++) {
      const s = capsuleSpanAtRow(p[i][0], p[i][1], p[i + 1][0], p[i + 1][1], halfWidth, v);
      if (s) out.push(s[0], s[1]);
    }
  }
  return mergeSpans(out);
}

// The principal axis of a projected silhouette: the mean of its endpoints and
// the eigenvector of their 2x2 covariance with the larger eigenvalue, in
// closed form. This is the shape's own "length", and it is the only thing the
// vein construction takes from the outline's overall pose.
export function principalAxis(f) {
  if (!f || !f.ok || !f.n) return null;
  let n = 0, mx = 0, my = 0;
  for (let i = 0; i < f.n; i++) { mx += f.x0[i] + f.x1[i]; my += f.y0[i] + f.y1[i]; n += 2; }
  mx /= n; my /= n;
  let sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < f.n; i++) {
    for (const [x, y] of [[f.x0[i], f.y0[i]], [f.x1[i], f.y1[i]]]) {
      const dx = x - mx, dy = y - my;
      sxx += dx * dx; sxy += dx * dy; syy += dy * dy;
    }
  }
  sxx /= n; sxy /= n; syy /= n;
  const tr = sxx + syy, det = sxx * syy - sxy * sxy;
  const lam = tr / 2 + Math.sqrt(Math.max(tr * tr / 4 - det, 0));
  let ex, ey;
  if (Math.abs(sxy) > 1e-12) { ex = lam - syy; ey = sxy; }
  else if (sxx >= syy) { ex = 1; ey = 0; }
  else { ex = 0; ey = 1; }
  const l = Math.hypot(ex, ey) || 1;
  return { cx: mx, cy: my, ex: ex / l, ey: ey / l };
}

// The vein paths for one projected silhouette, in PIXELS: a midrib that
// follows the shape's medial line, plus `pairs` lateral branches on each side.
//
// Every number here is measured off the silhouette. The midrib is not a
// straight line through the centroid — it is sampled along the principal axis
// and each sample is moved to the MIDPOINT of the cross-span that contains the
// centroid at that station, which is what makes it bend with a curved leaf.
// Each lateral's length is the measured half-width on its own side, so the
// laterals shorten toward the tip without anything being told to taper.
export function veinPaths(f, pairs, opts = {}) {
  const ax = principalAxis(f);
  if (!ax) return [];
  const { cx, cy, ex, ey } = ax;
  const qx = -ey, qy = ex;                       // the cross axis
  const sweep = (opts.sweepDeg !== undefined ? opts.sweepDeg : VEIN_SWEEP_DEG) * Math.PI / 180;
  const reach = opts.reach !== undefined ? opts.reach : VEIN_REACH;
  const inset = opts.inset !== undefined ? opts.inset : VEIN_INSET;
  const ribSamples = opts.ribSamples !== undefined ? opts.ribSamples : 11;

  let t0 = Infinity, t1 = -Infinity;
  for (let i = 0; i < f.n; i++) {
    for (const [x, y] of [[f.x0[i], f.y0[i]], [f.x1[i], f.y1[i]]]) {
      const t = (x - cx) * ex + (y - cy) * ey;
      if (t < t0) t0 = t;
      if (t > t1) t1 = t;
    }
  }
  if (!(t1 - t0 > 1e-6)) return [];

  // Rows perpendicular to the principal axis. With (ca, sa) = the cross axis,
  // ScanIndex's u runs along it and its v is -(p . e), so a station t is the
  // row at v = -(t + c.e).
  const idx = new ScanIndex(f, qx, qy, 1);
  const cdot = cx * ex + cy * ey;
  const u0 = cx * qx + cy * qy;

  // The cross-span at station t that the shape's own centre line falls in,
  // falling back to the widest span on that row when the centre line is in a
  // notch. Returns null where the row is empty.
  const crossAt = (t) => {
    const sp = idx.spansAt(-(t + cdot));
    if (!sp.length) return null;
    let best = null, widest = null;
    for (let i = 0; i + 1 < sp.length; i += 2) {
      if (u0 >= sp[i] && u0 <= sp[i + 1]) best = [sp[i], sp[i + 1]];
      if (!widest || sp[i + 1] - sp[i] > widest[1] - widest[0]) widest = [sp[i], sp[i + 1]];
    }
    return best || widest;
  };
  const pt = (t, u) => [(t + cdot) * ex + u * qx, (t + cdot) * ey + u * qy];

  const L = t1 - t0;
  const a0 = t0 + L * inset, a1 = t1 - L * inset;
  const rib = [];
  for (let i = 0; i < ribSamples; i++) {
    const t = a0 + (a1 - a0) * (i / (ribSamples - 1));
    const sp = crossAt(t);
    rib.push(pt(t, sp ? (sp[0] + sp[1]) / 2 : u0));
  }
  const paths = [rib];

  const nPairs = Math.max(0, pairs | 0);
  for (let j = 0; j < nPairs; j++) {
    // Stations kept off both ends: a lateral at the very base or the very tip
    // has no width to run into and reads as a nick in the outline.
    const frac = 0.18 + 0.64 * (nPairs === 1 ? 0.5 : j / (nPairs - 1));
    const t = a0 + (a1 - a0) * frac;
    const sp = crossAt(t);
    if (!sp) continue;
    const um = (sp[0] + sp[1]) / 2;
    const base = pt(t, um);
    for (const side of [1, -1]) {
      const half = side > 0 ? sp[1] - um : um - sp[0];
      const len = half * reach;
      if (!(len > 1.5)) continue;
      // A quadratic bow: out across the shape first, then leaning toward the
      // tip, which is how a pinnate vein actually runs.
      const cU = um + side * len * 0.62, cT = t;
      const eU = um + side * len * 0.86, eT = t + len * 0.45;
      const c = pt(cT, cU), e = pt(eT, eU);
      const seg = [];
      for (let k = 0; k <= 4; k++) {
        const s = k / 4, m = 1 - s;
        seg.push([
          m * m * base[0] + 2 * m * s * c[0] + s * s * e[0],
          m * m * base[1] + 2 * m * s * c[1] + s * s * e[1],
        ]);
      }
      paths.push(seg);
    }
  }
  return paths;
}

// ONE FILL ROW, from the row index to the spans that get inked. Pulled out of
// _tonePart so the gate drives THE SHIPPED FUNCTION over outlines whose answer
// can be written down, instead of a second copy of the same arithmetic that
// would only ever be tested against itself.
//
// The three subtractions happen in a fixed order and for three different
// reasons: the tone threshold (an interval clip against a circle, because the
// field is radial), every nearer part's silhouette, and finally the reserved
// veins. The veins go LAST on purpose — a vein is negative space in the ink
// that actually got laid down, so it must not be able to reserve through a
// region that was never going to be filled and then look as though it had.
export function toneRowSpans(ctx, k) {
  const { idx, occ, rot, halfVein, pitch, au, av, reach, gamma, darkness, gradient, jitter } = ctx;
  const v = k * pitch;
  const L = TONE_ORDER[((k % TONE_LEVELS) + TONE_LEVELS) % TONE_LEVELS];
  const out = { v, L, spans: [], onOutline: false, reserved: false, clipped: false };

  const tau = levelThreshold(L, darkness, gradient);
  if (tau >= 1) return out;                    // this row is lighter than its level

  let spans = idx.spansAt(v);
  if (!spans.length) return out;
  out.onOutline = true;

  if (tau >= 0) {
    // The threshold is a circle, so the clip is an interval rather than a
    // sample. Jittered per row for the reason the hatch layers are: an exact
    // arc reads as a compass and not as a hand.
    out.clipped = true;
    const j = (hash01(k * 131 + L * 7919) * 2 - 1) * jitter;
    const r = toneRadius(tau, reach, gamma) * (1 + j);
    if (r <= 0) return out;
    const dv = v - av;
    if (Math.abs(dv) >= r) return out;
    const half = Math.sqrt(r * r - dv * dv);
    spans = clipSpans(spans, au - half, au + half);
    if (!spans.length) return out;
  }

  for (let i = 0; i < occ.length; i++) {
    if (!spans.length) return out;
    spans = subtractSpans(spans, occ[i].spansAt(v));
  }
  if (!spans.length) return out;

  if (halfVein > 0 && rot.length) {
    const res = reserveSpansAt(rot, v, halfVein);
    if (res.length) {
      const before = spans;
      spans = subtractSpans(spans, res);
      if (spans.length !== before.length || spans.some((x, q) => x !== before[q])) out.reserved = true;
    }
  }
  out.spans = spans;
  return out;
}

// Rotate a set of pixel-space polylines into the frame the fill rows run in.
export function rotatePaths(paths, ca, sa) {
  return paths.map(p => p.map(([x, y]) => [x * ca + y * sa, -x * sa + y * ca]));
}

// How dark this stage wants a point to be: the per-part darkness, ramped by
// the tone field in proportion to `g`. At g = 0 the answer is the darkness
// everywhere and the shape fills solid.
export function toneCoverage(darkness, g, tone) {
  return darkness * (1 - g + g * tone);
}

// The inverse, and the reason the gradient costs nothing: the tone at which a
// row of level `L` starts to be drawn. Returns <= 0 when the row is drawn all
// the way to the outline, and >= 1 when it is never drawn at all — so the
// caller clips to toneRadius() only in between. Exactly inverts toneCoverage,
// which `tone/coverage-inverts-threshold` pins.
export function levelThreshold(L, darkness, g) {
  const need = L / TONE_LEVELS;
  if (!(darkness > 0)) return 1;
  if (g <= 0) return darkness > need ? -1 : 1;
  return ((need / darkness) - (1 - g)) / g;
}
