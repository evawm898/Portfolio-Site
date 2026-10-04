/* bug-image.js — IMAGE -> BUG (design doc §11). Pure ES module: no DOM, no
   canvas, runs in Node (the gate) and in the page alike. The page hands it an
   ImageData-shaped object { width, height, data: RGBA bytes } that it drew on
   a canvas; the gate hands it the same shape rasterised in Node.

   It does its best to replicate a TOP-DOWN picture of a butterfly / moth /
   dragonfly as an ordinary, editable bug: outline and proportions only. Veins,
   spots and pattern are out of scope (they are filled away).

     1 SEGMENT     luminance, a 3x3 blur, a threshold (Otsu unless the slider
                   sets one), the polarity guessed from the image border
                   (invertible), the brush's erased pixels removed, the largest
                   4-connected shape kept, thin attachments (antennae, splayed
                   legs) removed by an OPENING-BY-RECONSTRUCTION, holes filled.
     2 SYMMETRY    the mirror axis that best maps the shape onto itself (searched,
                   not assumed vertical), turned upright head-up, the two halves
                   AVERAGED — and only the right half is used from then on, so the
                   bug the model builds is mirror-exact by construction.
     3 BODY        the narrow central column: head above the wings, abdomen
                   below them; body length, head size, thorax and abdomen widths.
     4 WINGS       the shape beside the column; separate components are separate
                   pairs (up to 4); one mass with a notch in its outer margin is
                   split into two pairs along a straight SPLIT LINE from the notch
                   to the body, which the page lets Eva drag.
     5 FIT         each wing's outline as the FEWEST Catmull-Rom control points
                   within a tolerance in mm; a hindwing TAIL found by an opening
                   becomes the tagged tail group (design doc §6.1), TAIL on.
     6 PARAMS      the result is ordinary state — normal control points, normal
                   sliders — validated by the geometry module's own rules.

   Nothing here builds geometry: the bug is built by buildBug from the params
   this returns, like every other bug, so every invariant (mirror 0, watertight,
   one region, the floor) is the model's, checked where it always is. */

import {
  sampleOutline, outlineValid, composeOutline, tailAnchor, editorFrame, normalizeParams, buildBug, contourLoops,
  OUTLINE_BOUNDS, MIN_TAIL_POINTS, MAX_WING_PAIRS, CR_SAMPLES, THORAX_PER_PAIR, WING_FIELDS, PARAM_SPEC, defaultParams,
} from './bug-geometry.js';

/* ------------------------------------------------------------------ */
/* Constants — each with its reason                                     */
/* ------------------------------------------------------------------ */

/* The page draws the picture to a canvas at most this many pixels on its long
   side before analysing it: a phone photo is 4000 px, and every step here is
   linear or worse in the pixel count. 560 px puts a 72 mm wingspan at ~6 px a
   mm — finer than the 0.6 mm default tolerance. */
export const WORK_MAX = 560;
/* Thin attachments beside the body (an antenna lying against a wing, a
   splayed leg, a stray hair) are removed from the WING region — never from the
   body column — by an opening of this radius, as a fraction of the half-span:
   0.72 mm on a 72 mm wingspan, wider than a 1 mm antenna shaft's half-width and
   narrower than a tail neck's (the starter's is 2.3 mm). A first cut opened the
   whole picture at 0.6 mm and took a slim abdomen off with the antennae: behind
   the hindwings an abdomen is about as wide as an antenna, so width alone cannot
   tell them apart — WHERE they are can. */
export const THIN_OPEN_FRAC = 0.02;
/* A row of the upright half is BODY when the central run is narrower than this
   fraction of the widest row (the wings). */
export const BODY_ROW_FRAC = 0.18;
/* A piece beside the body is a WING only if it is at least this fraction of
   the largest piece: an antenna's feathered blade or a splayed leg's stub that
   survives the opening is not a wing pair (the first cut, at 3%, made a moth's
   antenna a 7 mm wing). */
export const PIECE_MIN_FRAC = 0.2;
/* The head block above the wings ends where the column widens past this many
   times its median width so far, or once it is longer than HEAD_MAX_ASPECT
   times its width (the first cut counted a moth's feathered antennae, which
   merge into one blade above the head, as 9 mm of head). */
const HEAD_WIDEN = 1.8, HEAD_MAX_ASPECT = 2.2;
/* The wing region starts this far outside the measured body column (x 1.15 + 1
   px): a wing root half a pixel into the body column is still body. */
const CUT_MARGIN = 1.15;
/* A concavity in the outer margin deeper than this fraction of the wing's
   extent is a NOTCH between two pairs. The default bug's notch is 0.19. */
export const NOTCH_MIN_FRAC = 0.06;
/* A notch between two pairs has a wing lobe each side whose farthest point
   reaches at least this fraction of the mass's farthest point. */
export const AXIS_LOBE_FRAC = 0.4;
/* ... and with a wing confirmed each side, a notch this shallow is enough (a
   moth's forewing overlaps the hindwing, so the notch between them is shallow:
   #43's is 0.058 of the extent, under NOTCH_MIN_FRAC). */
export const AXIS_NOTCH_MIN_FRAC = 0.045;
/* THE HIDDEN OVERLAP: what of the hindwing lies under the forewing cannot be
   seen. The guess: the hindwing's hidden leading edge is the split line moved
   FORWARD by this fraction of the wing's extent — it tucks under the forewing
   along a band, clipped to the visible silhouette, so nothing of the guess can
   show from above (the forewing is drawn over it) and the two pairs overlap in
   the model the way real wings do. */
export const HIDDEN_OVERLAP_FRAC = 0.08;
/* (The band TAPERS: that full width at the body, nothing at the notch, so the
   hidden leading edge meets the margin at the notch in a line, not a step — a
   square band end was a hook in the outline tighter than the rounded edge's
   bead, which folded there: a stray contour line in the SVG on the same-tone
   picture, measured.) */
/* Tails: an opening of this radius (fraction of the bottom pair's extent)
   keeps the wing and drops long narrow protrusions; a dropped piece longer than
   TAIL_MIN_FRAC of the extent and at least TAIL_ASPECT times as long as it is
   wide, behind the wing's own middle, is a tail. */
export const TAIL_OPEN_FRAC = 0.07;
export const TAIL_MIN_FRAC = 0.12;
export const TAIL_ASPECT = 1;
/* Refusals. */
export const MIN_SHAPE_FRAC = 0.01;     // the shape must be at least 1% of the picture
export const BUSY_BORDER_FRAC = 0.15;   // more than 15% of the picture's border in the shape: the background is in it
export const BUSY_FG_FRAC = 0.55;       // more than 55% of the picture "subject": the threshold took the background
export const SYM_MIN = 0.8;             // the best mirror maps at least 80% of the shape onto itself
/* The thorax's share of the body length — the default specimen's own (5 mm of
   21.3), because the thorax is under the wings and cannot be measured. */
export const THORAX_SHARE = 0.24;
/* BODY CONFIDENCE. The body is MEASURED from the narrow column only when the
   abdomen shows clearly below the wings: at least ABD_SEEN_FRAC of the wingspan
   of it, at least ABD_WIDTH_SHARE of the fallback's width. On a photograph whose
   dark body touches dark wing roots (a Morpho's hindwings hug its abdomen) no
   narrow column is visible — what is left is the abdomen's TIP, 2 mm of a
   1.6 mm sliver — and fitting that made a body that all but vanished under the
   wings (Eva's Morpho, PR #346). Then the body is ESTIMATED: the default
   specimen's body proportions scaled by the fitted wingspan (FALLBACK below),
   and the page says which happened. Measured on the gate's pictures: a visible
   abdomen 9.3-31 mm on 72-75 mm wingspans (13-41%), the same-tone picture's tip
   2.1 mm (2.9%). */
export const ABD_SEEN_FRAC = 0.06;
export const ABD_WIDTH_SHARE = 0.6;
/* The fit: at most this many control points per wing (a cap, never reached by
   a sane tolerance), smoothing of the pixel staircase (sigma, px). */
const MAX_POINTS = 60;
/* Control points closer than the outline rule's own minimum gap (0.012 of the
   length) are refused as coincident; the fit keeps a little over it. */
const MIN_GAP_UW = 0.015;
const SMOOTH_SIGMA = 1.2;

export const IMPORT_DEFAULTS = { threshold: null, lightOnDark: null, wingspanMm: 72, toleranceMm: 0.6, pairs: 'auto', tail: true, flip: false };
export const TOLERANCE_RANGE = [0.1, 3];   // mm
export const WINGSPAN_RANGE = [20, 130];   // mm — the forewing's length must stay inside its 5–60 mm slider

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hyp = Math.hypot;

/* The FALLBACK body: the default specimen's own body (one owner: the geometry's
   defaultParams) scaled by the fitted wingspan against the default's own
   wingspan, measured off its built model once, each field inside its slider. */
let DEFAULT_SPAN = null;
const BODY_FIELDS = ['headSize', 'thoraxLength', 'thoraxWidth', 'thoraxDepth', 'abdomenLength', 'abdomenWidth'];
export function fallbackBody(wingspanMm) {
  const d = defaultParams();
  if (DEFAULT_SPAN == null) {
    const m = buildBug(d); let x = 0;
    for (const q of m.parts.filter((p) => /^wing\d$/.test(p.kind) && p.side === 'R')) for (let v = q.v0; v < q.v1; v++) x = Math.max(x, m.positions[3 * v]);
    DEFAULT_SPAN = 2 * x;
  }
  const k = wingspanMm / DEFAULT_SPAN, out = { k, defaultSpanMm: DEFAULT_SPAN };
  for (const id of BODY_FIELDS) { const sp = PARAM_SPEC.find((q) => q.id === id); out[id] = clamp(d[id] * k, sp.min, sp.max); }
  return out;
}

/* ------------------------------------------------------------------ */
/* 1  Segmentation                                                      */
/* ------------------------------------------------------------------ */

export function luminance(img) {
  const { width: W, height: H, data } = img, L = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const a = data[4 * i + 3] / 255;   // a transparent pixel reads as white paper
    L[i] = (0.2126 * data[4 * i] + 0.7152 * data[4 * i + 1] + 0.0722 * data[4 * i + 2]) * a + 255 * (1 - a);
  }
  return L;
}
function blur3(L, W, H) {
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let s = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= H) continue; for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= W) continue; s += L[yy * W + xx]; n++; } }
    out[y * W + x] = s / n;
  }
  return out;
}
/* Otsu's threshold on a 256-bin histogram. */
export function otsu(L) {
  const h = new Float64Array(256);
  for (const v of L) h[clamp(Math.round(v), 0, 255)]++;
  let tot = 0, sum = 0; for (let i = 0; i < 256; i++) { tot += h[i]; sum += i * h[i]; }
  let wB = 0, sB = 0, best = 0, bt = 128;
  for (let t = 0; t < 256; t++) {
    wB += h[t]; if (!wB) continue; const wF = tot - wB; if (!wF) break;
    sB += t * h[t];
    const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) ** 2;
    if (v > best) { best = v; bt = t + 0.5; }
  }
  return bt;
}
function borderValues(L, W, H) {
  const v = [];
  for (let x = 0; x < W; x++) { v.push(L[x], L[(H - 1) * W + x]); }
  for (let y = 1; y < H - 1; y++) { v.push(L[y * W], L[y * W + W - 1]); }
  return v;
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };

/* 4-connected components of a binary grid: labels and sizes. */
export function components(M, W, H) {
  const lab = new Int32Array(W * H).fill(-1), sizes = [], stack = new Int32Array(W * H);
  for (let s = 0; s < W * H; s++) {
    if (!M[s] || lab[s] >= 0) continue;
    const id = sizes.length; let top = 0, n = 0; stack[top++] = s; lab[s] = id;
    while (top) {
      const i = stack[--top]; n++;
      const x = i % W, y = (i / W) | 0;
      if (x > 0 && M[i - 1] && lab[i - 1] < 0) { lab[i - 1] = id; stack[top++] = i - 1; }
      if (x < W - 1 && M[i + 1] && lab[i + 1] < 0) { lab[i + 1] = id; stack[top++] = i + 1; }
      if (y > 0 && M[i - W] && lab[i - W] < 0) { lab[i - W] = id; stack[top++] = i - W; }
      if (y < H - 1 && M[i + W] && lab[i + W] < 0) { lab[i + W] = id; stack[top++] = i + W; }
    }
    sizes.push(n);
  }
  return { lab, sizes };
}
function largest(M, W, H) {
  const { lab, sizes } = components(M, W, H);
  if (!sizes.length) return { mask: new Uint8Array(W * H), size: 0, sizes };
  let b = 0; for (let k = 1; k < sizes.length; k++) if (sizes[k] > sizes[b]) b = k;
  const mask = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) mask[i] = lab[i] === b ? 1 : 0;
  return { mask, size: sizes[b], sizes };
}
/* Chamfer (3-4) distance, in pixels, from every pixel to the nearest pixel
   where `src` is 0 (inside a shape: the distance to the background). */
function chamfer(src, W, H) {
  const INF = 1e9, d = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) d[i] = src[i] ? INF : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!d[i]) continue;
    let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + 3); else v = Math.min(v, 3);
    if (y > 0) { v = Math.min(v, d[i - W] + 3); if (x > 0) v = Math.min(v, d[i - W - 1] + 4); if (x < W - 1) v = Math.min(v, d[i - W + 1] + 4); } else v = Math.min(v, 3);
    d[i] = v;
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x; if (!d[i]) continue;
    let v = d[i];
    if (x < W - 1) v = Math.min(v, d[i + 1] + 3); else v = Math.min(v, 3);
    if (y < H - 1) { v = Math.min(v, d[i + W] + 3); if (x < W - 1) v = Math.min(v, d[i + W + 1] + 4); if (x > 0) v = Math.min(v, d[i + W - 1] + 4); } else v = Math.min(v, 3);
    d[i] = v;
  }
  for (let i = 0; i < W * H; i++) d[i] /= 3;
  return d;
}
/* Opening by reconstruction: erode by r, keep the largest core, and keep every
   pixel of the shape within r of that core. Thin attachments go; the shape's own
   outline is untouched wherever the core reaches it. */
function openKeep(M, W, H, r, keepFrac = 1) {
  const din = chamfer(M, W, H);
  const core = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) core[i] = din[i] > r ? 1 : 0;
  let big;
  if (keepFrac >= 1) big = largest(core, W, H).mask;
  else { const cc = components(core, W, H), mx = Math.max(0, ...cc.sizes); big = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) big[i] = cc.lab[i] >= 0 && cc.sizes[cc.lab[i]] >= keepFrac * mx ? 1 : 0; }
  const inv = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) inv[i] = big[i] ? 0 : 1;
  const dout = chamfer(inv, W, H);    // distance to the core
  const out = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) out[i] = M[i] && dout[i] <= r + 0.75 ? 1 : 0;
  return { mask: keepFrac >= 1 ? largest(out, W, H).mask : out, coreDist: dout };
}
function fillHoles(M, W, H) {
  const bg = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) bg[i] = M[i] ? 0 : 1;
  const { lab, sizes } = components(bg, W, H);
  const touches = new Uint8Array(sizes.length);
  for (let x = 0; x < W; x++) { if (lab[x] >= 0) touches[lab[x]] = 1; if (lab[(H - 1) * W + x] >= 0) touches[lab[(H - 1) * W + x]] = 1; }
  for (let y = 0; y < H; y++) { if (lab[y * W] >= 0) touches[lab[y * W]] = 1; if (lab[y * W + W - 1] >= 0) touches[lab[y * W + W - 1]] = 1; }
  const out = M.slice(); let filled = 0;
  for (let i = 0; i < W * H; i++) if (lab[i] >= 0 && !touches[lab[i]]) { out[i] = 1; filled++; }
  return { mask: out, filled };
}

/* THE STEPS a fit goes through, named in every refusal so Eva knows which one
   failed and what to do about it. */
export const STEPS = ['finding the bug in the picture', 'finding the mirror axis', 'reading the body', 'finding the wings', 'fitting the outlines'];
const stepMsg = (k, text) => ({ step: k, stepName: STEPS[k - 1], reason: `step ${k} of ${STEPS.length} (${STEPS[k - 1]}) failed: ${text}` });

/* CLUTTER. A real photograph carries more than the bug: a paper edge or a
   table along a side, a scale bar ("1 cm"), a label, a pin's shadow. Each is
   dropped before anything is measured:
     - a shape that runs along more than BORDER_TOUCH_FRAC of the picture's edge
       is the GROUND (a table, the far side of a paper edge), never the bug — a
       bug is photographed whole;
     - a shape whose largest hole is at least FRAME_HOLE_FRAC of its own filled
       area ENCLOSES something: a sheet of paper with the bug lying on it;
     - of what is left, the LARGEST shape is the bug and every smaller detached
       mark (a scale bar, text, a speck) is ignored, and counted.
   The subject's polarity (dark on light, or light on dark) is chosen by the
   same rule: the polarity whose largest acceptable shape is the larger — not by
   the border's median alone, which a dark table along one side of a white sheet
   turns the wrong way round. The symmetry check then runs on that one shape. */
export const BORDER_TOUCH_FRAC = 0.04;
export const FRAME_HOLE_FRAC = 0.1;
/* (A bug's own holes — the spots a threshold leaves, the gaps between touching
   wings — are each a few % of it; the whole sheet in view on a table encloses
   the bug at 19.5% on the gate's sheet picture, so 0.2 sat on the knife edge.
   The price: a bug with ONE see-through window over a tenth of its area — a
   glasswing — reads as a sheet. Forcing the polarity with the Invert box turns
   the frame rule off, which is the escape.) */
/* ...and the bug must DOMINATE what is left: the kept shape at least this share
   of everything that stands out from the background. A busy picture (leaves,
   a patterned cloth) breaks into many pieces, the kept one a small fraction of
   them (the gate's busy picture: 3%); a photo with a paper edge and a scale bar
   keeps the bug at more than half (measured on the clutter picture). */
export const BUSY_SHAPE_SHARE = 0.25;
const MARK_MIN_FRAC = 0.0001;   // a dropped piece smaller than this share of the picture is noise, not counted as a mark

function holesOf(M, W, H) {
  // the background components that do not touch the picture's edge: the holes
  const bg = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) bg[i] = M[i] ? 0 : 1;
  const { lab, sizes } = components(bg, W, H);
  const touches = new Uint8Array(sizes.length);
  for (let x = 0; x < W; x++) { if (lab[x] >= 0) touches[lab[x]] = 1; if (lab[(H - 1) * W + x] >= 0) touches[lab[(H - 1) * W + x]] = 1; }
  for (let y = 0; y < H; y++) { if (lab[y * W] >= 0) touches[lab[y * W]] = 1; if (lab[y * W + W - 1] >= 0) touches[lab[y * W + W - 1]] = 1; }
  let filled = 0, biggest = 0;
  for (let k = 0; k < sizes.length; k++) if (!touches[k]) { filled += sizes[k]; biggest = Math.max(biggest, sizes[k]); }
  return { lab, touches, filled, biggest };
}
/* One polarity: its components, the ground and frames rejected, the largest
   acceptable shape returned with what was dropped. */
function pickShape(raw, W, H, frames = true) {
  const N = W * H, { lab, sizes } = components(raw, W, H);
  const border = new Float64Array(sizes.length);
  let borderN = 0;
  const bAt = (i) => { borderN++; if (lab[i] >= 0) border[lab[i]]++; };
  for (let x = 0; x < W; x++) { bAt(x); bAt((H - 1) * W + x); }
  for (let y = 1; y < H - 1; y++) { bAt(y * W); bAt(y * W + W - 1); }
  const order = sizes.map((n, id) => id).sort((a, b) => sizes[b] - sizes[a]);
  const rejected = [];
  let pick = -1;
  for (const id of order) {
    if (sizes[id] < MIN_SHAPE_FRAC * N) break;
    if (border[id] / borderN > BORDER_TOUCH_FRAC) { rejected.push({ id, why: 'ground', size: sizes[id] }); continue; }
    const M = new Uint8Array(N); for (let i = 0; i < N; i++) M[i] = lab[i] === id ? 1 : 0;
    const h = holesOf(M, W, H);
    if (frames && h.biggest >= FRAME_HOLE_FRAC * (sizes[id] + h.filled)) { rejected.push({ id, why: 'frame', size: sizes[id] }); continue; }
    pick = id; break;
  }
  let marks = 0;
  for (let id = 0; id < sizes.length; id++) if (id !== pick && sizes[id] >= MARK_MIN_FRAC * N && !rejected.some((q) => q.id === id)) marks++;
  return { lab, sizes, pick, size: pick >= 0 ? sizes[pick] : 0, rejected, marks, borderN };
}

/* The segmentation alone (the page shows it as an overlay even when the fit is
   refused, so Eva can see what was found and what to erase). */
export function segment(img, opts = {}) {
  const W = img.width, H = img.height, N = W * H;
  const L = blur3(luminance(img), W, H);
  const threshold = opts.threshold == null ? otsu(L) : +opts.threshold;
  const border = borderValues(L, W, H), bMed = median(border);
  const rawOf = (light) => {
    const raw = new Uint8Array(N);
    for (let i = 0; i < N; i++) raw[i] = (light ? L[i] > threshold : L[i] < threshold) ? 1 : 0;
    if (opts.erase) for (let i = 0; i < N; i++) if (opts.erase[i]) raw[i] = 0;
    return raw;
  };
  // the polarity: forced by the Invert box, or the one whose best shape is the larger
  const borderLight = bMed < threshold;
  let lightOnDark, raw, pk, other = null;
  if (opts.lightOnDark != null) { lightOnDark = !!opts.lightOnDark; raw = rawOf(lightOnDark); pk = pickShape(raw, W, H, false); }
  else {
    const A = rawOf(borderLight), pa = pickShape(A, W, H), B = rawOf(!borderLight), pb = pickShape(B, W, H);
    if (pb.size > pa.size) { lightOnDark = !borderLight; raw = B; pk = pb; other = pa; } else { lightOnDark = borderLight; raw = A; pk = pa; other = pb; }
  }
  let fg = 0; for (let i = 0; i < N; i++) fg += raw[i];
  const mask = new Uint8Array(N);
  if (pk.pick >= 0) for (let i = 0; i < N; i++) mask[i] = pk.lab[i] === pk.pick ? 1 : 0;
  // what was dropped as clutter, for the page to show
  const clutter = new Uint8Array(N); for (let i = 0; i < N; i++) clutter[i] = raw[i] && !mask[i] ? 1 : 0;
  const stats = { W, H, threshold, autoThreshold: opts.threshold == null, lightOnDark, autoPolarity: opts.lightOnDark == null, fgFrac: fg / N, shapeFrac: pk.size / N, pieces: pk.sizes.length, marksIgnored: pk.marks, groundDropped: pk.rejected.filter((q) => q.why === 'ground').length, framesDropped: pk.rejected.filter((q) => q.why === 'frame').length,
    // what the OTHER polarity offered and why it lost (a white sheet under a dark bug is a frame there)
    otherPolarity: other && { shapeFrac: other.size / N, groundDropped: other.rejected.filter((q) => q.why === 'ground').length, framesDropped: other.rejected.filter((q) => q.why === 'frame').length } };
  const busy = 'the background is too busy to find one clear shape — try another threshold, invert, or erase the stray regions with the brush';
  if (stats.fgFrac > BUSY_FG_FRAC) return { ok: false, ...stepMsg(1, `${busy} (${Math.round(100 * stats.fgFrac)}% of the picture reads as subject)`), stats, raw, mask, clutter };
  if (pk.pick < 0) {
    const why = pk.rejected.length
      ? `everything large enough to be the bug runs into the picture's edge or encloses something (${pk.rejected.length} shape${pk.rejected.length > 1 ? 's' : ''} taken for the ground or a sheet of paper) — ${busy}`
      : 'no clear shape found — nothing stands out from the background larger than a speck; try another threshold, or invert';
    return { ok: false, ...stepMsg(1, why), stats, raw, mask, clutter };
  }
  if (pk.size < BUSY_SHAPE_SHARE * fg) return { ok: false, ...stepMsg(1, `${busy} (the largest clear shape is only ${Math.round((100 * pk.size) / fg)}% of what stands out from the background)`), stats, raw, mask, clutter };
  const fh = fillHoles(mask, W, H);
  let area = 0; for (let i = 0; i < N; i++) area += fh.mask[i];
  Object.assign(stats, { holesFilled: fh.filled, area });
  return { ok: true, stats, raw, mask: fh.mask, clutter };
}

/* ------------------------------------------------------------------ */
/* 2  The mirror axis, upright, averaged                                */
/* ------------------------------------------------------------------ */

/* The mirror line that maps the shape onto itself best: through the centroid
   (shifted a little along its normal), at an angle searched over a half turn.
   Score = fraction of the shape's pixels whose mirror image is also shape. */
export function findAxis(M, W, H) {
  const pts = [];
  let cx = 0, cy = 0, n = 0;
  for (let i = 0; i < W * H; i++) if (M[i]) { cx += i % W; cy += (i / W) | 0; n++; }
  cx /= n; cy /= n;
  const stride = Math.max(1, Math.round(Math.sqrt(n / 6000)));
  for (let y = 0; y < H; y += stride) for (let x = 0; x < W; x += stride) if (M[y * W + x]) pts.push(x, y);
  const at = (x, y) => { const xi = Math.round(x), yi = Math.round(y); return xi >= 0 && yi >= 0 && xi < W && yi < H && M[yi * W + xi] ? 1 : 0; };
  const score = (deg, off) => {
    const t = (deg * Math.PI) / 180, ax = Math.cos(t), ay = Math.sin(t), nx = -ay, ny = ax;
    const ox = cx + off * nx, oy = cy + off * ny;
    let hit = 0;
    for (let k = 0; k < pts.length; k += 2) {
      const d = (pts[k] - ox) * nx + (pts[k + 1] - oy) * ny;
      hit += at(pts[k] - 2 * d * nx, pts[k + 1] - 2 * d * ny);
    }
    return hit / (pts.length / 2);
  };
  let best = { s: -1, deg: 0, off: 0 };
  for (let d = 0; d < 180; d += 3) { const s = score(d, 0); if (s > best.s) best = { s, deg: d, off: 0 }; }
  for (const [span, step, ospan, ostep] of [[3, 0.5, 4, 1], [0.5, 0.1, 1, 0.25]]) {
    const b0 = best;
    for (let d = b0.deg - span; d <= b0.deg + span + 1e-9; d += step) for (let o = b0.off - ospan; o <= b0.off + ospan + 1e-9; o += ostep) {
      const s = score(d, o); if (s > best.s) best = { s, deg: d, off: o };
    }
  }
  const t = (best.deg * Math.PI) / 180;
  return { deg: best.deg, score: best.s, centre: [cx - best.off * Math.sin(t), cy + best.off * Math.cos(t)], dir: [Math.cos(t), Math.sin(t)] };
}

/* The upright RIGHT half: column i covers X in [i, i+1] px from the axis, row j
   covers the along-axis band [top - j - 1, top - j] (j grows toward the tail).
   Each cell is the AVERAGE of the shape at X and at -X (bilinear), kept at 0.5:
   the left and right halves averaged, so the result is mirror-exact. */
function upright(M, W, H, axis, flip) {
  let a = axis.dir.slice();
  // head UP in the picture by default (image y grows down); Flip turns it over
  if (a[1] > 0 || (a[1] === 0 && a[0] < 0)) a = [-a[0], -a[1]];
  if (flip) a = [-a[0], -a[1]];
  const b = [-a[1], a[0]];            // the bug's right, seen from above
  const c = axis.centre;
  let amin = Infinity, amax = -Infinity, xmax = 0;
  for (let i = 0; i < W * H; i++) if (M[i]) {
    const px = (i % W) + 0.5 - c[0], py = ((i / W) | 0) + 0.5 - c[1];
    const al = px * a[0] + py * a[1], ac = Math.abs(px * b[0] + py * b[1]);
    amin = Math.min(amin, al); amax = Math.max(amax, al); xmax = Math.max(xmax, ac);
  }
  const top = Math.ceil(amax) + 2, NX = Math.ceil(xmax) + 3, NY = Math.ceil(top - amin) + 3;
  const samp = (x, y) => {   // bilinear on pixel centres
    const fx = x - 0.5, fy = y - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const g = (xx, yy) => (xx >= 0 && yy >= 0 && xx < W && yy < H ? M[yy * W + xx] : 0);
    return (g(x0, y0) * (1 - tx) + g(x0 + 1, y0) * tx) * (1 - ty) + (g(x0, y0 + 1) * (1 - tx) + g(x0 + 1, y0 + 1) * tx) * ty;
  };
  const R = new Uint8Array(NX * NY);
  for (let j = 0; j < NY; j++) {
    const al = top - j - 0.5;
    for (let i = 0; i < NX; i++) {
      const X = i + 0.5;
      const p1 = samp(c[0] + al * a[0] + X * b[0], c[1] + al * a[1] + X * b[1]);
      const p2 = samp(c[0] + al * a[0] - X * b[0], c[1] + al * a[1] - X * b[1]);
      R[j * NX + i] = (p1 + p2) / 2 >= 0.5 ? 1 : 0;
    }
  }
  return { R, NX, NY, top, a, b, c };
}

/* ------------------------------------------------------------------ */
/* Contours                                                             */
/* ------------------------------------------------------------------ */

/* The outer boundary of a 4-connected region as a loop of pixel CORNERS (crack
   following), counter-clockwise in (i, j) with j down... i.e. the region on the
   loop's left in a y-down grid. Returns [[i, j], ...]. */
export function traceOuter(G, NX, NY) {
  const inR = (i, j) => i >= 0 && j >= 0 && i < NX && j < NY && G[j * NX + i];
  // directed edges with the region on the RIGHT when walking (y down): each
  // boundary side of a region pixel, stored from its start corner
  const out = new Map();
  const key = (i, j) => j * (NX + 2) + i;
  const add = (a, b) => { const k = key(a[0], a[1]); if (!out.has(k)) out.set(k, []); out.get(k).push(b); };
  let start = null;
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    if (!G[j * NX + i]) continue;
    if (!inR(i, j - 1)) { add([i, j], [i + 1, j]); if (!start) start = [i, j]; }   // top side, walking +i
    if (!inR(i + 1, j)) add([i + 1, j], [i + 1, j + 1]);                               // right side, walking +j
    if (!inR(i, j + 1)) add([i + 1, j + 1], [i, j + 1]);                               // bottom, walking -i
    if (!inR(i - 1, j)) add([i, j + 1], [i, j]);                                       // left, walking -j
  }
  if (!start) return [];
  // the first top edge found is on the OUTER boundary (topmost row, leftmost)
  const loop = [start];
  let cur = start, prev = null;
  for (let guard = 0; guard < 4 * NX * NY; guard++) {
    const cand = out.get(key(cur[0], cur[1]));
    let nxt = cand[0];
    if (cand.length > 1 && prev) {
      // a saddle: turn RIGHT (toward the region) so a 4-connected region's
      // diagonal neighbours are not joined
      const d = [cur[0] - prev[0], cur[1] - prev[1]], right = [-d[1], d[0]];
      nxt = cand.find((q) => q[0] - cur[0] === right[0] && q[1] - cur[1] === right[1]) || cand[0];
    }
    cand.splice(cand.indexOf(nxt), 1);
    if (nxt[0] === start[0] && nxt[1] === start[1]) break;
    loop.push(nxt); prev = cur; cur = nxt;
  }
  return loop;
}
/* Gaussian smoothing round a closed loop (the pixel staircase), then resampled
   at ~1 px. */
function smoothLoop(loop, sigma = SMOOTH_SIGMA) {
  // resample at 0.5 px first so the kernel acts on arc length, not corners
  const dense = [];
  for (let k = 0; k < loop.length; k++) {
    const a = loop[k], b = loop[(k + 1) % loop.length];
    dense.push(a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
  }
  const n = dense.length, rad = Math.ceil(3 * sigma * 2), w = [];
  for (let t = -rad; t <= rad; t++) w.push(Math.exp(-((t / 2) ** 2) / (2 * sigma * sigma)));
  const ws = w.reduce((s, v) => s + v, 0);
  const out = [];
  for (let k = 0; k < n; k += 2) {
    let x = 0, y = 0;
    for (let t = -rad; t <= rad; t++) { const q = dense[(k + t + n * 4) % n]; x += q[0] * w[t + rad]; y += q[1] * w[t + rad]; }
    out.push([x / ws, y / ws]);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                     */
/* ------------------------------------------------------------------ */

function segDist(p, a, b) {
  const ax = b[0] - a[0], ay = b[1] - a[1], L2 = ax * ax + ay * ay || 1e-18;
  const t = clamp(((p[0] - a[0]) * ax + (p[1] - a[1]) * ay) / L2, 0, 1);
  return hyp(p[0] - a[0] - t * ax, p[1] - a[1] - t * ay);
}
function convexHull(P) {
  const pts = P.map((p, i) => [p[0], p[1], i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of pts.reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
const insideHull = (H, p) => { for (let k = 0; k < H.length; k++) { const a = H[k], b = H[(k + 1) % H.length]; if ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) < -1e-9) return false; } return true; };

/* ------------------------------------------------------------------ */
/* 5  The fit — the fewest control points within a tolerance            */
/* ------------------------------------------------------------------ */

/* chain: the dense outline in (u, w), root lead first, root trail last, both
   at u = 0. metric(q) maps (u, w) to mm (x, y) so the tolerance is in mm.
   Control points are chain points (Catmull-Rom interpolates them), chosen by
   insertion at the worst deviation, then pruned while the fit stays inside
   the tolerance and the outline stays valid. The deviation is measured both
   ways on each control segment — chain to spline and spline to chain — so a
   spline overshoot between two points counts as much as a missed bump. */
export function fitOutline(chain, metric, tolMm, opts = {}) {
  const C = chain.map(metric);
  const n = chain.length;
  let apex = 0; for (let k = 1; k < n; k++) if (chain[k][0] > chain[apex][0]) apex = k;
  const keepSet = new Set([0, n - 1, ...(opts.keep || [])]);
  const evalDev = (idx) => {
    const pts = idx.map((k) => chain[k]);
    const dense = sampleOutline(pts).map(metric);
    let worst = 0, at = -1;
    for (let s = 0; s + 1 < idx.length; s++) {
      const sp = dense.slice(s * CR_SAMPLES, s * CR_SAMPLES + CR_SAMPLES + 1);
      const c0 = idx[s], c1 = idx[s + 1];
      for (let k = c0 + 1; k < c1; k++) {
        let d = Infinity; for (let m = 0; m + 1 < sp.length; m++) d = Math.min(d, segDist(C[k], sp[m], sp[m + 1]));
        if (d > worst) { worst = d; at = k; }
      }
      for (const q of sp) {
        let d = Infinity; for (let k = c0; k < c1; k++) d = Math.min(d, segDist(q, C[k], C[k + 1]));
        if (d > worst) {
          worst = d;
          // the chain point nearest the overshoot is the one to add
          let bk = c0 + 1, bd = Infinity; for (let k = c0 + 1; k < c1; k++) { const e = hyp(C[k][0] - q[0], C[k][1] - q[1]); if (e < bd) { bd = e; bk = k; } }
          at = c1 - c0 > 1 ? bk : -1;
        }
      }
    }
    return { worst, at };
  };
  // start: the roots, the apex, and the ends of every straight run the chain makes
  let idx = [...new Set([0, apex, n - 1, ...keepSet])].sort((a, b) => a - b);
  const ok = (ix) => outlineValid(ix.map((k) => chain[k])).ok;
  let e = evalDev(idx);
  const roomFor = (ix, k) => { const q = chain[k]; return ix.every((m) => m === k || hyp(chain[m][0] - q[0], chain[m][1] - q[1]) >= MIN_GAP_UW); };
  while (e.worst > tolMm && idx.length < MAX_POINTS && e.at > 0 && roomFor(idx, e.at) && !idx.includes(e.at)) {
    idx.push(e.at); idx.sort((a, b) => a - b);
    e = evalDev(idx);
  }
  // a valid outline needs more than the tolerance asks for: insert where the
  // fit is worst until it validates
  let guard = 0;
  while (!ok(idx) && idx.length < MAX_POINTS && guard++ < 40) {
    const r = evalDev(idx); if (r.at <= 0 || idx.includes(r.at) || !roomFor(idx, r.at)) break;
    idx.push(r.at); idx.sort((a, b) => a - b);
  }
  // prune: drop the point whose removal hurts least while the fit stays in
  // tolerance and the outline stays valid — the FEWEST points
  for (;;) {
    let best = null;
    for (let q = 1; q + 1 < idx.length; q++) {
      if (keepSet.has(idx[q])) continue;
      const t = idx.filter((_, k) => k !== q);
      if (t.length < 4) continue;
      const r = evalDev(t);
      if (r.worst <= tolMm && (!best || r.worst < best.worst) && ok(t)) best = { idx: t, worst: r.worst };
    }
    if (!best) break;
    idx = best.idx;
  }
  const fin = evalDev(idx);
  return { idx, points: idx.map((k) => chain[k].slice()), maxDevMm: fin.worst, valid: ok(idx) };
}

/* ------------------------------------------------------------------ */
/* The whole pipeline                                                   */
/* ------------------------------------------------------------------ */

/* img: { width, height, data } (RGBA). base: the bug to take everything the
   picture cannot say from (legs, antennae, venation, the floor, edges).
   opts: IMPORT_DEFAULTS plus erase (a Uint8Array over the picture's pixels,
   1 = erased by the brush) and split ({ outer: [x, y], root: [x, y] } in WORLD
   mm, the right wing; from a previous fit, moved by the page's handles). */
function fitOnce(img, base, opts) {
  const o = { ...IMPORT_DEFAULTS, ...opts };
  const W = img.width, H = img.height;
  const seg = segment(img, o);
  const res = { ok: false, seg, notes: [] };
  if (!seg.ok) return { ...res, step: seg.step, stepName: seg.stepName, reason: seg.reason };
  const axis = findAxis(seg.mask, W, H);
  res.axis = axis;
  if (axis.score < SYM_MIN) {
    const st = seg.stats, dropped = [st.marksIgnored ? `${st.marksIgnored} detached mark${st.marksIgnored > 1 ? 's' : ''} ignored` : '', st.groundDropped ? `${st.groundDropped} shape${st.groundDropped > 1 ? 's' : ''} along the picture's edge taken for the ground` : '', st.framesDropped ? 'a sheet around the bug taken for the ground' : ''].filter(Boolean);
    return { ...res, ...stepMsg(2, `no clear symmetric shape — the best mirror axis maps only ${Math.round(100 * axis.score)}% of the shape onto itself (it needs ${Math.round(100 * SYM_MIN)}%). The shape it found is outlined on the picture${dropped.length ? ` (${dropped.join('; ')})` : ''}: erase what is not the bug with the brush, or try another threshold`) };
  }
  const U = upright(seg.mask, W, H, axis, o.flip);
  const { R, NX, NY } = U;
  // the central run of each row, from the axis out
  const h = new Float64Array(NY);
  for (let j = 0; j < NY; j++) { let i = 0; while (i < NX && R[j * NX + i]) i++; h[j] = i; }
  const Hmax = Math.max(...h);
  const wide = [];
  for (let j = 0; j < NY; j++) if (h[j] >= BODY_ROW_FRAC * Hmax) wide.push(j);
  if (!wide.length || Hmax < 6) return { ...res, ...stepMsg(3, 'found a shape but no wings beside a narrow body — try another threshold, or erase what is not the bug') };
  // The column and the wings are found twice: a first guess of the wing rows
  // (rows whose central run is wide) gives the body's width and so the cut;
  // the WING PIECES beside that cut then give the true wing rows (an antenna
  // blade fanning out above the head is wide but is no wing piece), and the
  // column is measured again from them.
  const wingRegion = (cut) => {
    const G0 = new Uint8Array(NX * NY); for (let j = 0; j < NY; j++) for (let i = cut; i < NX; i++) G0[j * NX + i] = R[j * NX + i];
    return openKeep(G0, NX, NY, Math.max(1, THIN_OPEN_FRAC * Hmax), PIECE_MIN_FRAC).mask;
  };
  const pieces = (cc, cut) => {
    const list = cc.sizes.map((size, id) => ({ id, size, touches: false, jsum: 0, imax: 0, j0: Infinity, j1: -Infinity }));
    for (let j = 0; j < NY; j++) for (let i = cut; i < NX; i++) {
      const l = cc.lab[j * NX + i]; if (l < 0) continue;
      const q = list[l]; q.jsum += j; q.imax = Math.max(q.imax, i + 1); q.j0 = Math.min(q.j0, j); q.j1 = Math.max(q.j1, j); if (i === cut) q.touches = true;
    }
    const big = Math.max(0, ...list.map((q) => q.size));
    return list.filter((q) => q.size >= PIECE_MIN_FRAC * big && q.touches).map((q) => ({ ...q, jm: q.jsum / q.size })).sort((a, b) => a.jm - b.jm);
  };
  const column = (jw0, jw1) => {
    // The HEAD: walking up from the wings while the column stays a head — it
    // stops at a gap, at a sudden widening, or once the block is longer than
    // HEAD_MAX_ASPECT x its own width (a head is round)
    const headRows = [], abdRows = [];
    for (let j = jw0 - 1; j >= 0; j--) {
      if (!(h[j] > 0)) break;
      const med = headRows.length ? median(headRows.map((q) => h[q])) : h[j];
      if (headRows.length >= 3 && h[j] > HEAD_WIDEN * med) break;
      if (headRows.length >= 3 && headRows.length > HEAD_MAX_ASPECT * 2 * med) break;
      headRows.unshift(j);
    }
    for (let j = jw1 + 1; j < NY; j++) { if (!(h[j] > 0)) break; abdRows.push(j); }
    const headHalf = headRows.length ? Math.max(...headRows.map((j) => h[j])) : 0;
    const abdHalf = abdRows.length ? Math.max(...abdRows.map((j) => h[j])) : 0;
    const bodyHalf = Math.max(headHalf, abdHalf, 1);
    return { jw0, jw1, headRows, abdRows, headHalf, abdHalf, bodyHalf, cutI: Math.ceil(bodyHalf * CUT_MARGIN + 1) };
  };
  let col = column(wide[0], wide[wide.length - 1]);
  let G = wingRegion(col.cutI), comps = components(G, NX, NY), wings = pieces(comps, col.cutI);
  if (wings.length) {
    // the rows where the wings ATTACH (touch the cut) — not their whole span:
    // a forewing's tip stands far above the head
    let a0 = Infinity, a1 = -Infinity;
    const ids = new Set(wings.map((q) => q.id));
    for (let j = 0; j < NY; j++) if (ids.has(comps.lab[j * NX + col.cutI])) { a0 = Math.min(a0, j); a1 = Math.max(a1, j); }
    col = column(a0, a1);
    G = wingRegion(col.cutI); comps = components(G, NX, NY); wings = pieces(comps, col.cutI);
  }
  const { jw0, jw1, headRows, abdRows, headHalf, abdHalf, bodyHalf } = col;
  let cutI = col.cutI;
  if (!wings.length) return { ...res, ...stepMsg(4, 'found a shape but no wings attached to the body column — try another threshold') };
  // the SCALE: the wingspan the picture is set to, tip to tip
  const spanPx = 2 * Math.max(...wings.map((q) => q.imax));
  const s = o.wingspanMm / spanPx;   // mm per upright pixel

  // ---- 3 the BODY: measured from the narrow column, or ESTIMATED ----
  const fb = fallbackBody(o.wingspanMm);
  const abdSeenMm = abdRows.length * s, abdSeenWmm = 2 * abdHalf * s;
  const confident = abdSeenMm >= ABD_SEEN_FRAC * o.wingspanMm && abdSeenWmm >= ABD_WIDTH_SHARE * fb.abdomenWidth;
  const bodyConf = {
    source: confident ? 'measured' : 'estimated',
    abdomenSeenMm: abdSeenMm, abdomenSeenWidthMm: abdSeenWmm,
    needLenMm: ABD_SEEN_FRAC * o.wingspanMm, needWidthMm: ABD_WIDTH_SHARE * fb.abdomenWidth,
    why: confident ? '' : abdSeenMm < ABD_SEEN_FRAC * o.wingspanMm
      ? `only ${abdSeenMm.toFixed(1)} mm of abdomen shows below the wings (a clear body needs ${(ABD_SEEN_FRAC * o.wingspanMm).toFixed(1)} mm) — the body is hidden under, or the same tone as, the wings`
      : `the abdomen that shows is ${abdSeenWmm.toFixed(1)} mm wide, under ${(ABD_WIDTH_SHARE * fb.abdomenWidth).toFixed(1)} mm — too thin to be the body, it is the tip of a body hidden under the wings`,
  };
  let headSize, abdW, thoraxWidth, LtEff, abdomenLength, jHead, B;
  if (confident) {
    jHead = headRows.length ? headRows[0] : jw0;
    const jTail = abdRows.length ? abdRows[abdRows.length - 1] + 1 : jw1 + 1;
    B = (jTail - jHead) * s;
    headSize = clamp(2 * (headHalf || bodyHalf) * s, 2, 12);
    // the abdomen's width from the rows BEHIND the thorax: with the blended
    // root (§12.1) a wing attaches only at its neck, so the rows just behind it
    // show the thorax's rear (and the root's fillet beside it) as a body column
    const jT = (jw0 + jw1) / 2 + (THORAX_SHARE * B) / 2 / s;
    const behind = abdRows.filter((j) => j >= jT), abdHalfT = behind.length ? Math.max(...behind.map((j) => h[j])) : abdHalf;
    abdW = clamp(2 * (abdHalfT || bodyHalf) * s, 1.5, 18);
    thoraxWidth = clamp(Math.max(headSize, abdW) * 1.1, 2.5, 14);
    LtEff = clamp(THORAX_SHARE * B, 3, 40);
    abdomenLength = clamp(B - 1.55 * headSize / 2 - 0.88 * LtEff, 2, 70);
  } else {
    // the default specimen's proportions at this wingspan; the head's front is
    // where a head shows, else one head ahead of the wings' attachment
    ({ headSize, thoraxWidth } = fb); abdW = fb.abdomenWidth; LtEff = fb.thoraxLength; abdomenLength = fb.abdomenLength;
    jHead = headRows.length >= 2 ? headRows[0] : jw0 - Math.round((1.55 * headSize / 2) / s);
    B = 1.55 * headSize / 2 + 0.88 * LtEff + abdomenLength;
    // the wings are clipped at THIS body's edge, not at the sliver's
    cutI = Math.ceil((Math.max(headSize, abdW) / 2 / s) * CUT_MARGIN + 1);
    G = wingRegion(cutI); comps = components(G, NX, NY); wings = pieces(comps, cutI);
    if (!wings.length) return { ...res, ...stepMsg(4, 'no wings beside the estimated body — try another threshold') };
  }
  const Rh = headSize / 2;
  const yHead = LtEff / 2 + 1.55 * Rh;                    // the head's front, in the model
  const toWorld = (i, j) => [i * s, yHead - (j - jHead) * s];        // upright corner -> world mm
  const toUpright = (x, y) => [x / s, jHead + (yHead - y) / s];
  const body = { bodyParts: '3', headSize: +headSize.toFixed(2), thoraxWidth: +thoraxWidth.toFixed(2), thoraxDepth: +(confident ? thoraxWidth : fb.thoraxDepth).toFixed(2), abdomenLength: +abdomenLength.toFixed(2), abdomenWidth: +abdW.toFixed(2) };
  // the THORAX's span along the body (world y in [-T, T]): the only stretch of
  // the body a wing ROOT may attach to. Below it is the abdomen, ahead of it the
  // head — a wing there lies BESIDE the body, its inner edge on the body's edge,
  // never across it (the root chord running down the abdomen was what laid the
  // two wings over a Morpho's body as one plate).
  const T = LtEff / 2;
  const jFront = Math.round(toUpright(0, T)[1]), jRear = Math.round(toUpright(0, -T)[1]);

  // ---- 4 the WINGS: pieces, or one mass split at its notch ----
  const comp = (q, cc = comps) => { const M = new Uint8Array(NX * NY); for (let k = 0; k < NX * NY; k++) M[k] = cc.lab[k] === q.id ? 1 : 0; return M; };
  let regions = [], split = null, notch = null;
  if (wings.length >= 2) {
    if (wings.length > MAX_WING_PAIRS) res.notes.push(`${wings.length} separate wings found; the ${MAX_WING_PAIRS} largest are used`);
    regions = wings.slice().sort((a, b) => b.size - a.size).slice(0, MAX_WING_PAIRS).sort((a, b) => a.jm - b.jm).map((q) => comp(q));
    res.mode = 'separate';
  } else {
    const M = comp(wings[0]);
    const loop = smoothLoop(traceOuter(M, NX, NY));
    const extent = wings[0].imax - cutI;
    const hull = convexHull(loop);
    // THE TWO WING AXES (§13.6). A notch between two pairs has a WING on each
    // side of it: seen from the middle of the mass's attachment, the farthest
    // point of the outline ahead of the notch (the forewing's apex) and the
    // farthest behind it (the hindwing's) must each reach AXIS_LOBE_FRAC of the
    // farthest point overall. The deepest concavity that passes is the notch
    // (from AXIS_NOTCH_MIN_FRAC deep, against NOTCH_MIN_FRAC without the axes). On a butterfly that is the
    // outer margin's own notch, as before; on a moth it keeps the notch off a
    // shallow dent in the forewing's costa, which has no wing ahead of it (that
    // dent cut #43's forewing off at the root)
    let a0 = Infinity, a1 = -Infinity; for (let j = 0; j < NY; j++) if (M[j * NX + cutI]) { a0 = Math.min(a0, j); a1 = Math.max(a1, j + 1); }
    const Rm = [cutI, (a0 + a1) / 2];
    const bearing = (p) => Math.atan2(-(p[1] - Rm[1]), p[0] - Rm[0]) * 180 / Math.PI;
    const dist = (p) => hyp(p[0] - Rm[0], p[1] - Rm[1]);
    const outer = (p) => p[0] >= cutI + 0.12 * extent;
    const depthAt = loop.map((p) => { if (!outer(p)) return -1; let d = Infinity; for (let m = 0; m < hull.length; m++) d = Math.min(d, segDist(p, hull[m], hull[(m + 1) % hull.length])); return d; });
    let best = -1, depth = 0, axes = null;
    if (o.axisFrame !== false) {
      let dmax = 0; for (const p of loop) if (outer(p)) dmax = Math.max(dmax, dist(p));
      const cand = [];
      for (let k = 0; k < loop.length; k++) {
        const d = depthAt[k]; if (d < AXIS_NOTCH_MIN_FRAC * extent) continue;
        let isMax = true; for (let m = -4; m <= 4 && isMax; m++) if (m && depthAt[(k + m + loop.length) % loop.length] > d) isMax = false;
        if (isMax) cand.push(k);
      }
      cand.sort((x, y) => depthAt[y] - depthAt[x]);
      for (const k of cand) {
        const bn = bearing(loop[k]);
        let F = -1, H = -1;
        loop.forEach((p, m) => { if (!outer(p)) return; if (bearing(p) > bn) { if (F < 0 || dist(p) > dist(loop[F])) F = m; } else if (H < 0 || dist(p) > dist(loop[H])) H = m; });
        if (F < 0 || H < 0 || dist(loop[F]) < AXIS_LOBE_FRAC * dmax || dist(loop[H]) < AXIS_LOBE_FRAC * dmax) continue;
        best = k; depth = depthAt[k]; axes = { fore: loop[F], hind: loop[H] }; break;
      }
    }
    // no notch with a wing on each side (a hindwing under AXIS_LOBE_FRAC of the
    // reach — #23's small hindwings): the old rule, the deepest concavity at
    // NOTCH_MIN_FRAC, split square to the body. Without it that butterfly read
    // as ONE pair, where the margin-notch fitter had split it.
    if (!axes) loop.forEach((p, k) => { if (depthAt[k] > depth) { depth = depthAt[k]; best = k; } });
    notch = best >= 0 ? { at: loop[best], depth, frac: depth / extent } : null;
    res.axes = axes ? { fore: toWorld(...axes.fore), hind: toWorld(...axes.hind), root: toWorld(...Rm) } : null;
    const want = o.pairs === 'auto' ? (notch && notch.frac >= (axes ? AXIS_NOTCH_MIN_FRAC : NOTCH_MIN_FRAC) ? 2 : 1) : clamp(+o.pairs, 1, 2);
    if (o.pairs !== 'auto' && +o.pairs > 2) res.notes.push('one wing mass can only be split into 2 pairs; 3 or 4 pairs need wings that are visibly separate in the picture');
    if (want === 2 && notch) {
      // the split line, upright px: from the notch inward, square to the body by
      // default — or where the page's handles put it (world mm)
      // (under the axes the line runs from the notch to the MIDDLE of the
      // attachment, between the two wings' hinges, instead of square to the
      // body: a forewing swept back over the hindwing has its inner margin on
      // that diagonal, and the square line handed it a slice of hindwing — #50)
      let outer = notch.at, root = [cutI, axes ? Rm[1] : notch.at[1]];
      if (o.split && o.split.outer && o.split.root) { outer = toUpright(...o.split.outer); root = toUpright(...o.split.root); root[0] = cutI; }
      // the root end clamped onto the wing's own attachment along the body
      let a0 = Infinity, a1 = -Infinity; for (let j = 0; j < NY; j++) if (M[j * NX + cutI]) { a0 = Math.min(a0, j); a1 = Math.max(a1, j + 1); }
      // (kept off its ends: each pair needs a root chord of its own)
      root = [cutI, clamp(root[1], a0 + 0.15 * (a1 - a0), a1 - 0.15 * (a1 - a0))];
      // the line must END ON THE MARGIN (a wall ending inside the wing would
      // let the two halves meet round its end): a moved outer end snaps to the
      // nearest point of the mass's own outline, away from the body — so its
      // handle slides along the margin
      if (o.split && o.split.outer) {
        let bd = Infinity, bq = outer;
        for (const q of loop) { if (q[0] < cutI + 0.12 * extent) continue; const d = hyp(q[0] - outer[0], q[1] - outer[1]); if (d < bd) { bd = d; bq = q; } }
        outer = bq;
      }
      const dx = outer[0] - root[0], dy = outer[1] - root[1], Ll = hyp(dx, dy) || 1;
      let nx = -dy / Ll, ny = dx / Ll;              // a normal; flip it to point at the head (smaller j)
      if (ny > 0) { nx = -nx; ny = -ny; }
      // The SEGMENT root -> notch is a wall; the mass minus the wall falls into
      // pieces, each FRONT or BEHIND by which side of the segment it lies on.
      // Beyond the notch the line means nothing (an infinite line would hand
      // the forewing's tornus, if it hangs back past the notch, to the hindwing
      // — the first cut did, and the hindwing grew a strip to the forewing's tip).
      const ux = dx / Ll, uy = dy / Ll;
      const along = (i, j) => ((i + 0.5 - root[0]) * ux + (j + 0.5 - root[1]) * uy) / Ll;     // 0 at the root, 1 at the notch
      const side = (i, j) => (i + 0.5 - root[0]) * nx + (j + 0.5 - root[1]) * ny;            // > 0: toward the head
      const wall = (i, j) => { const t = along(i, j); return t >= -0.05 && t <= 1 + 3 / Ll && Math.abs(side(i, j)) <= 0.9; };
      const Mw = new Uint8Array(NX * NY);
      for (let j = 0; j < NY; j++) for (let i = cutI; i < NX; i++) { const k = j * NX + i; if (M[k] && !wall(i, j)) Mw[k] = 1; }
      const pcs = components(Mw, NX, NY), sideSum = new Float64Array(pcs.sizes.length), sideAny = new Float64Array(pcs.sizes.length);
      for (let j = 0; j < NY; j++) for (let i = cutI; i < NX; i++) {
        const l = pcs.lab[j * NX + i]; if (l < 0) continue;
        const sd = Math.sign(side(i, j)), t = along(i, j);
        sideAny[l] += sd; if (t >= 0 && t <= 1) sideSum[l] += sd;
      }
      const isFront = (l) => (sideSum[l] || sideAny[l]) > 0;
      // the hidden overlap: the band ahead of the segment, alongside it only
      const band = HIDDEN_OVERLAP_FRAC * extent;
      const F = new Uint8Array(NX * NY), Hh = new Uint8Array(NX * NY);
      for (let j = 0; j < NY; j++) for (let i = cutI; i < NX; i++) {
        const k = j * NX + i; if (!M[k]) continue;
        const l = pcs.lab[k], front = l < 0 ? true : isFront(l), t = along(i, j);
        if (front) F[k] = 1; else Hh[k] = 1;
        if (front && t >= 0 && t <= 1 && side(i, j) < band * (1 - t)) Hh[k] = 1;   // the hindwing tucked under the forewing, tapering to the notch
      }
      const keepTouching = (X) => { const cc = components(X, NX, NY); const ps = pieces(cc, cutI); if (!ps.length) return null; const q = ps.reduce((a, b) => (b.size > a.size ? b : a)); return comp(q, cc); };
      const f = keepTouching(F), hw = keepTouching(Hh);
      if (f && hw) { regions = [f, hw]; split = { outer: toWorld(...outer), root: toWorld(...root), notchDepthFrac: notch.frac }; res.mode = 'split'; }
      else { regions = [M]; res.notes.push('the split line leaves one pair empty; fitted as ONE pair — drag the split line'); res.mode = 'single'; }
    } else { regions = [M]; res.mode = 'single'; }
  }
  const N = regions.length;
  res.split = split;
  res.notch = notch ? { world: toWorld(...notch.at), frac: notch.frac } : null;

  // ---- the model's hinges for this body and pair count (one owner: editorFrame) ----
  const thoraxLength = clamp(LtEff / (1 + THORAX_PER_PAIR * Math.max(0, N - 2)), 3, 20);
  body.thoraxLength = +thoraxLength.toFixed(2);
  const p = JSON.parse(JSON.stringify(base));
  Object.assign(p, body, { wingPairs: N });
  const keepPair = (w) => ({ ...w, sweep: 0, dihedral: 0, pitch: 0, scallop: 0 });
  p.wings = { first: keepPair(p.wings.first), last: keepPair(p.wings.last), unlinked: {}, tail: { ...p.wings.tail, on: false } };
  for (let k = 1; k < N - 1; k++) p.wings.unlinked[k] = keepPair(p.wings.first);
  const specOf = (k) => (k === 0 ? p.wings.first : k === N - 1 ? p.wings.last : p.wings.unlinked[k]);

  // ---- 5 the fit, pair by pair ----
  const pairs = [];
  for (let k = 0; k < N; k++) {
    let M = regions[k];
    // A pair that touches the body only BESIDE the abdomen (a hindwing whose
    // root is under the forewing) or only beside the head is given a strip
    // along the body's edge up to the thorax, hidden under the pair ahead of
    // it: a root must sit on the thorax, and the strip is how the wing reaches
    // it without crossing the body
    {
      let a0 = Infinity, a1 = -Infinity; for (let j = 0; j < NY; j++) if (M[j * NX + cutI]) { a0 = Math.min(a0, j); a1 = Math.max(a1, j); }
      // the strip is wider than the print floor (it is part of the wing) and
      // hidden under the pair ahead of it
      // (and joined to the thorax over at least twice the floor, so the wing's
      // neck is never thinner than the print can make)
      const reach = Math.max(2, Math.ceil(Math.max(0.25 * T, 2 * (base.minDiameter || 1)) / s)), sw = Math.max(2, Math.ceil((2 * (base.minDiameter || 1)) / s));
      const strip = (j0, j1) => { M = M.slice(); for (let j = Math.max(0, j0); j <= Math.min(NY - 1, j1); j++) for (let i = cutI; i < Math.min(NX, cutI + sw); i++) M[j * NX + i] = 1; };
      if (Number.isFinite(a0) && a0 > jRear - reach) strip(jRear - reach, a0);
      else if (Number.isFinite(a1) && a1 < jFront + reach) strip(a1, jFront + reach);
    }
    const loop = smoothLoop(traceOuter(M, NX, NY)).map(([i, j]) => toWorld(i, j));
    // the hinge (x, y) of pair k with this body
    const F0 = editorFrame(p, k);
    const hx = F0.hinge[0], hy = F0.hinge[1];
    let cutX = cutI * s;
    if (cutX < hx + 0.2) { cutX = hx + 0.2; }
    // the open chain: the loop with its ROOT removed — the stretch along the
    // body cut beside the THORAX. Along the cut beside the abdomen or the head
    // the loop stays in the chain: that is the wing's inner edge, lying on the
    // body's edge, so the fitted wing never crosses into the body
    const atRoot = (q) => q[0] <= cutX + 0.6 * s && Math.abs(q[1]) <= T + 0.6 * s;
    let off = loop.map((q) => !atRoot(q));
    if (off.every(Boolean)) off = loop.map((q) => q[0] > cutX + 0.6 * s);
    let bestRun = null;
    for (let k0 = 0; k0 < loop.length; k0++) {
      if (!off[k0] || off[(k0 - 1 + loop.length) % loop.length]) continue;
      let m = 0; while (m < loop.length && off[(k0 + m) % loop.length]) m++;
      if (!bestRun || m > bestRun.m) bestRun = { k0, m };
    }
    if (!bestRun) return { ...res, ...stepMsg(5, `pair ${k + 1}: no outline beside the body`) };
    const rec0 = {};
    let chainW = [], joinsW = []; for (let m = 0; m < bestRun.m; m++) chainW.push(loop[(bestRun.k0 + m) % loop.length]);
    if (chainW[0][1] < chainW[chainW.length - 1][1]) chainW.reverse();   // root LEAD (toward the head) first
    // EACH WING A COMPLETE SHAPE ON ITS OWN (§12.2): the stretches of the chain
    // the picture never showed — the split wall, the hidden band under the
    // forewing, the strip to the thorax, the run along the body's edge — are
    // replaced by smooth curves joined tangent to the margin that WAS seen
    if (o.complete !== false) {
      const inside = (q) => {
        const [x, y] = toUpright(...q), r = COMPLETE_INSIDE_PX;
        for (let a = 0; a < 8; a++) {
          const i = Math.floor(x + r * Math.cos(a * Math.PI / 4)), j = Math.floor(y + r * Math.sin(a * Math.PI / 4));
          if (i < 0 || j < 0 || i >= NX || j >= NY || !R[j * NX + i]) return false;
        }
        return true;
      };
      const onCut = (q) => q[0] <= cutX + COMPLETE_CUT_PX * s;
      // the root anchors: on the body's edge, either side of THIS pair's hinge,
      // half the blended root's width apart (never under the floor)
      // (and at least a tenth of the span apart: the outline rule wants the root
      // chord 0.03 of the length in (u, w), and the stretch can reach 3)
      let xm = -Infinity; for (const q of chainW) xm = Math.max(xm, q[0]);
      const half = Math.max(1.6, base.minDiameter || 1, 0.1 * (xm - hx)) / 2;
      // with the straight root chord (pinch 0) the anchors are the picture's
      // own root ends on the cut, held to the thorax: the narrow anchors either
      // side of the hinge are a NECK, right only when the model blends it — at
      // pinch 0 their embedded root tab stood past the body beside the head
      const blended = (base.wingRootPinch || 0) > 0;
      const e0 = chainW[0][1], e1 = chainW[chainW.length - 1][1];
      const done = completeChain(chainW, (q) => onCut(q) || inside(q), s, blended
        ? { xCut: cutX, yLead: hy + half, yTrail: hy - half }
        : { xCut: cutX, yLead: clamp(e0, -T, T), yTrail: clamp(e1, -T, T), keepRoot: true });
      chainW = done.chain;
      if (done.bridged) rec0.bridged = done.bridged;
      joinsW = done.joins || [];
    }
    // the TAIL — the bottom pair only (found first: the wing's axis ignores it)
    let tailRegion = null;
    if (o.tail && k === N - 1) tailRegion = findTail(M, NX, NY, cutI);
    // THE WING'S OWN FRAME (§13.6): its long axis, hinge to apex, is the
    // pair's sweep; the outline is fitted along it, re-rooted on a short chord
    // square to it at the hinge
    const axisMode = o.axisFrame !== false;
    let sweep = 0, apexDist = 0;
    if (axisMode) {
      const inT = tailRegion ? (q) => { const [x, y] = toUpright(...q), i = Math.floor(x), j = Math.floor(y); return i >= 0 && j >= 0 && i < NX && j < NY && tailRegion.mask[j * NX + i] === 1; } : () => false;
      const ax = wingAxis(chainW, [hx, hy], inT);
      sweep = clamp(+ax.sweep.toFixed(1), -89, 89); apexDist = ax.dist;
    }
    // length: a wing's length is its REACH across the body, as before (the
    // forewing's is the bug's size — what applying a library shape keeps), so
    // in its own frame its apex sits at u = 1 / cos(sweep); past the outline
    // rule's 1.6 (a wing swept beyond 50 degrees) the length grows to keep it there
    let xmax = 0; for (const q of chainW) xmax = Math.max(xmax, q[0]);
    // (and so does anything drawn past the apex along the axis — a tail, which
    // the axis excludes: #53's hindwing tail reached u 1.81)
    let reach = apexDist;
    if (axisMode) { const sw = (sweep * Math.PI) / 180, ax = [Math.cos(sw), -Math.sin(sw)]; for (const q of chainW) reach = Math.max(reach, (q[0] - hx) * ax[0] + (q[1] - hy) * ax[1]); }
    let L = !axisMode ? xmax - hx : Math.max(xmax - hx, reach / (OUTLINE_BOUNDS.u[1] - 0.05));
    if (L > 60) { if ((axisMode ? reach : xmax - hx) / 60 > OUTLINE_BOUNDS.u[1] - 0.01) return { ...res, ...stepMsg(5, `pair ${k + 1} is ${(xmax - hx).toFixed(0)} mm long at this wingspan — beyond the 60 mm slider; lower the wingspan`) }; L = 60; }
    if (L < 5) L = 5;
    const F1 = axisFrame([hx, hy], sweep, 1, 1);
    let ymax = -Infinity, ymin = Infinity; for (const q of chainW) { const w = F1.toUW(q)[1]; ymax = Math.max(ymax, w); ymin = Math.min(ymin, w); }
    const S = clamp(Math.max(1, ymax / ((OUTLINE_BOUNDS.w[1] - 0.02) * L), -ymin / ((-OUTLINE_BOUNDS.w[0] - 0.02) * L)), 0.3, 3);
    // the root chord: ROOT_HALF_FRAC of the length in w (x the stretch in mm), never under the floor
    if (axisMode) {
      const half = Math.max(ROOT_HALF_FRAC * L * S, (base.minDiameter || 1) / 2);
      const rr = rerootChain(chainW, [hx, hy], sweep, half, (q) => q[0] < cutX + 0.6 * s);
      if (!rr) return { ...res, ...stepMsg(5, `pair ${k + 1}: nothing of the wing stands ahead of its own root`) };
      chainW = rr.chain;
    }
    const FR = axisFrame([hx, hy], sweep, L, S);
    const toUW = FR.toUW, metric = FR.toWorld;
    let chain = chainW.map(toUW);
    if (axisMode) { chain[0] = [0, chain[0][1]]; chain[chain.length - 1] = [0, chain[chain.length - 1][1]]; }
    else {
      // the root: the chain's two ends brought to u = 0 (inside the body, hidden under it)
      const r0 = chain[0], r1 = chain[chain.length - 1];
      chain = [[0, r0[1]], ...chain, [0, r1[1]]];
    }
    // decimate to ~0.5 px so the fit is quick (the chain is already smooth),
    // and keep nothing within MIN_GAP_UW of a root point: two control points
    // that close are refused as coincident by the outline rule
    chain = decimate(chain, metric, 0.5 * s);
    chain = chain.filter((q, k) => k === 0 || k === chain.length - 1 || (hyp(q[0] - chain[0][0], q[1] - chain[0][1]) >= MIN_GAP_UW && hyp(q[0] - chain[chain.length - 1][0], q[1] - chain[chain.length - 1][1]) >= MIN_GAP_UW));
    const spec = specOf(k);
    Object.assign(spec, { length: +L.toFixed(3), stretch: +S.toFixed(4), sweep });
    // a bridge's JOIN to the margin the picture showed is kept as a control
    // point: where a hidden edge emerges two wings' edges CROSS at a shallow
    // angle, and a fit free to sit a tolerance off each edge slides that
    // visible crossing along by tolerance / sin(angle) — 1.7 mm on the
    // same-tone fixture's notch at 0.6 mm
    const joinKeep = [...new Set(joinsW.map((q) => { const u = toUW(q); let bk = -1, bd = Infinity; for (let k2 = 1; k2 + 1 < chain.length; k2++) { const d = hyp(chain[k2][0] - u[0], chain[k2][1] - u[1]); if (d < bd) { bd = d; bk = k2; } } return bk; }).filter((k2) => k2 > 0))];
    let tol = o.toleranceMm, fit = null;
    for (let t = 0; t < 6; t++) {
      fit = fitOutline(chain, metric, tol, { keep: [...(tailRegion ? tailTip(chain, tailRegion, toUpright, metric) : []), ...joinKeep] });
      if (fit.valid) break;
      // two interior points at a sharp apex closer than the outline rule allows
      // (a wing swept past 60 degrees draws its tip tight): merged into their
      // midpoint, which tightening only makes worse (#48's hindwing, 0.011)
      const merged = mergeClose(fit.points);
      if (merged && outlineValid(merged).ok) { fit = { ...fit, points: merged, valid: true }; break; }
      tol *= 0.6;
    }
    if (!fit.valid) return { ...res, ...stepMsg(5, `pair ${k + 1}: no valid outline could be fitted (${outlineValid(fit.points).reason}) — try another threshold, or erase`) };
    if (tol < o.toleranceMm) res.notes.push(`pair ${k + 1}: the tolerance was tightened to ${tol.toFixed(2)} mm so the outline does not cross or pinch itself`);
    let pts = fit.points.map(([u, w]) => [+u.toFixed(5), +w.toFixed(5)]);
    pts[0][0] = 0; pts[pts.length - 1][0] = 0;
    if (!outlineValid(pts).ok) pts = fit.points.map((q) => q.slice());
    const rec = { ...rec0, pair: k, points: pts.length, maxDevMm: fit.maxDevMm, tolMm: tol, length: L, stretch: S, sweep, tail: null, chain: chainW };
    // split the tail's control points into the tagged group
    if (tailRegion) {
      const tg = tailGroup(pts, tailRegion, toUpright, metric);
      if (tg.ok) { spec.points = tg.base; p.wings.tail = { on: true, anchorU: tg.anchorU, points: tg.offsets }; rec.tail = { points: tg.offsets.length, lengthMm: tailRegion.lengthPx * s }; }
      else { spec.points = pts; res.notes.push(`pair ${k + 1}: a tail was found but could not be separated into the TAIL group (${tg.reason}); it is kept in the outline`); rec.tail = { inline: true, lengthMm: tailRegion.lengthPx * s }; }
    } else spec.points = pts;
    pairs.push(rec);
  }
  const notes = [];
  const params = normalizeParams(p, notes);
  for (const nt of notes) res.notes.push(nt);
  if (notes.some((n) => /refused/.test(n))) return { ...res, ...stepMsg(5, `the fitted outline was refused by the model: ${notes.join('; ')}`) };
  // the picture -> world map (for the backdrop): source pixel (x, y) -> mm
  const { a, b, c, top } = U;
  const k0 = yHead - (top - jHead) * s;
  const matrix = [s * b[0], s * a[0], s * b[1], s * a[1], -s * (b[0] * c[0] + b[1] * c[1]), k0 - s * (a[0] * c[0] + a[1] * c[1])];   // x = m0 px + m2 py + m4 ; y = m1 px + m3 py + m5
  return {
    ...res, ok: true, params, pairs,
    body: { ...body, bodyLengthMm: B, headSeen: headRows.length > 0, abdomenSeen: abdRows.length > 0, ...bodyConf, fallback: fb, thoraxSpanMm: T, cutMm: cutI * s },
    transform: { matrix, mmPerPx: s, axisDeg: axis.deg, symmetry: axis.score },
    toWorld, s,
  };
}

/* The import, with its one REPAIR. A fitted outline is held to every rule a
   drawn one is (the geometry module validates it: no crossing, no pinch), and
   one more is checked here on the BUILT bug: the SVG must carry no stray
   contour line out in a wing (the gate's S clause) — the full bullnose can fold
   at a fitted tip tighter than the bead (measured: the swallowtail's paddle end
   at 0.4-1.0 mm tolerance, a loop 0.70 mm inside the outline). The repair is
   the smallest change that clears it: the tolerance is moved (tighter first,
   then looser) until the built wing is clean, and the result SAYS so. If no
   tolerance clears it, the fit is kept and the note says where the line is —
   never silently. The drawn-width FLOOR is not repaired: a fitted wing
   narrower than the floor is left to the model's own red highlight and STL
   block, for Eva to widen (design doc §6.3's ruling). */
export const STRAY_MAX_MM = 0.4;
const TOL_STEPS = [0.85, 0.7, 0.55, 0.4, 1.25, 1.6, 2.0];
export function strayContour(model) {
  let worst = 0, where = null;
  for (const part of model.parts.filter((q) => /^wing\d$/.test(q.kind) && q.side === 'R')) {
    const L = contourLoops(model, part);
    if (L.length < 2) continue;
    const big = L.reduce((a, l) => (l.length > a.length ? l : a));
    for (const l of L) if (l !== big) for (const [x, y] of l) {
      let d = Infinity; for (const [bx, by] of big) d = Math.min(d, hyp(x - bx, y - by));
      if (d > worst) { worst = d; where = { pair: +part.kind.slice(4) - 1, at: [x, y] }; }
    }
  }
  return { worst, where };
}
export function imageToBug(img, base, opts = {}) {
  const want = opts.toleranceMm ?? IMPORT_DEFAULTS.toleranceMm;
  const first = fitOnce(img, base, opts);
  if (!first.ok) return first;
  let st = strayContour(buildBug(first.params));
  if (st.worst <= STRAY_MAX_MM) return first;
  const was = st;
  for (const f of TOL_STEPS) {
    const tol = clamp(want * f, TOLERANCE_RANGE[0], TOLERANCE_RANGE[1]);
    const r = fitOnce(img, base, { ...opts, toleranceMm: tol });
    if (!r.ok) continue;
    st = strayContour(buildBug(r.params));
    if (st.worst <= STRAY_MAX_MM) {
      r.notes.push(`the fit tolerance was moved from ${want.toFixed(2)} to ${tol.toFixed(2)} mm: at ${want.toFixed(2)} mm the rounded edge folded at pair ${was.where.pair + 1}'s outline (a stray contour line ${was.worst.toFixed(2)} mm inside the outline in the SVG, at ${was.where.at.map((v) => v.toFixed(1)).join(', ')} mm)`);
      r.repairedTolerance = tol;
      return r;
    }
  }
  first.notes.push(`a stray contour line remains in the SVG ${was.worst.toFixed(2)} mm inside pair ${was.where.pair + 1}'s outline (at ${was.where.at.map((v) => v.toFixed(1)).join(', ')} mm): the rounded edge folds at a fitted tip tighter than the bead and no tolerance cleared it — smooth that tip in the editor, or lower the edge round`);
  return first;
}

/* COMPLETING A WING (§12.2). `chain` is the wing's open outline in world mm,
   root lead first. A point is SEEN when it lies on the picture's own silhouette
   margin; it is UNSEEN when it lies inside the silhouette (the split wall, the
   band the hindwing is tucked under, the strip to the thorax) or on the cut
   along the body. The ROOT ZONE — the stretch of each end within
   COMPLETE_ROOT_ZONE of the wing's span from the body — is unseen too: there the
   picture shows the wing pressed against the body, not where it attaches.
   Every unseen run is replaced by a curve:
     - between two seen stretches: a cubic Hermite tangent to both (the margin's
       own directions, read over COMPLETE_TANGENT_MM of seen outline);
     - at each END: a cubic from the seen margin, tangent to it, to the wing's
       ROOT ANCHOR — a point on the body's edge beside the hinge, `root.half`
       either side of it, arriving square to the body. So every fitted wing
       narrows to its own short attachment beside its own hinge (the blended
       root then shapes the last millimetres).
   A seen stretch shorter than COMPLETE_MIN_SEEN_MM between two unseen runs is
   noise on the wall and joins them. */
export const COMPLETE_INSIDE_PX = 2;      // a point is inside the silhouette when 8 probes this far out are all shape
export const COMPLETE_CUT_PX = 1.5;       // ... and on the body's edge within this of the cut
export const COMPLETE_TANGENT_MM = 1.2;   // the seen margin's direction is read over this length
export const COMPLETE_MIN_SEEN_MM = 1.0;  // a shorter seen stretch between unseen runs is wall noise
export const COMPLETE_ROOT_ZONE = 0.12;   // of the wing's span from the body: the root zone
export const COMPLETE_HERMITE = 0.6;      // the bridge's tangent length, of its chord
export function completeChain(chain, unseen, s, root) {
  const n = chain.length;
  if (n < 6) return { chain, bridged: null };
  const U = chain.map((q) => !!unseen(q));
  let xmax = -Infinity; for (const q of chain) xmax = Math.max(xmax, q[0]);
  // (the ROOT ZONE is replaced only when the model will blend the root: with
  // the straight root chord — root pinch 0, the default — the root the picture
  // shows along the thorax is kept, and only the hidden stretches are bridged)
  if (!root.keepRoot) {
    const zone = root.xCut + COMPLETE_ROOT_ZONE * (xmax - root.xCut);
    for (let k = 0; k < n && chain[k][0] < zone; k++) U[k] = true;
    for (let k = n - 1; k >= 0 && chain[k][0] < zone; k--) U[k] = true;
  }
  U[0] = U[n - 1] = true;
  // short seen stretches between unseen runs join them
  for (let a = 0; a < n;) {
    if (U[a]) { a++; continue; }
    let b = a, len = 0; while (b + 1 < n && !U[b + 1]) { len += hyp(chain[b + 1][0] - chain[b][0], chain[b + 1][1] - chain[b][1]); b++; }
    if (len < COMPLETE_MIN_SEEN_MM) for (let k = a; k <= b; k++) U[k] = true;
    a = b + 1;
  }
  if (U.every(Boolean)) return { chain, bridged: null };
  const unit = (v) => { const L = hyp(v[0], v[1]) || 1; return [v[0] / L, v[1] / L]; };
  const dirAt = (k, dir) => {
    let m = k, len = 0;
    while (m + dir >= 0 && m + dir < n && !U[m + dir] && len < COMPLETE_TANGENT_MM) { len += hyp(chain[m + dir][0] - chain[m][0], chain[m + dir][1] - chain[m][1]); m += dir; }
    return m === k ? null : unit(dir < 0 ? [chain[k][0] - chain[m][0], chain[k][1] - chain[m][1]] : [chain[m][0] - chain[k][0], chain[m][1] - chain[k][1]]);
  };
  const hermite = (P0, T0, P1, T1) => {
    const out = [], L = hyp(P1[0] - P0[0], P1[1] - P0[1]), mag = COMPLETE_HERMITE * L, N = Math.max(2, Math.ceil(L / (0.5 * s)));
    for (let i = 1; i < N; i++) {
      const t = i / N, t2 = t * t, t3 = t2 * t, h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
      out.push([h00 * P0[0] + h10 * mag * T0[0] + h01 * P1[0] + h11 * mag * T1[0], h00 * P0[1] + h10 * mag * T0[1] + h01 * P1[1] + h11 * mag * T1[1]]);
    }
    return out;
  };
  const lead = [root.xCut, root.yLead], trail = [root.xCut, root.yTrail];
  const out = [], bridged = [], joins = [];
  // the lead end: anchor -> first seen point
  let a0 = 0; while (U[a0]) a0++;
  const leadBr = hermite(lead, [1, 0], chain[a0], dirAt(a0, +1) || unit([chain[a0][0] - lead[0], chain[a0][1] - lead[1]]));
  out.push(lead, ...leadBr); joins.push(chain[a0]);
  bridged.push({ kind: 'root, lead side', lengthMm: +hyp(chain[a0][0] - lead[0], chain[a0][1] - lead[1]).toFixed(2) });
  let b0 = n - 1; while (U[b0]) b0--;
  let k = a0;
  while (k <= b0) {
    if (!U[k]) { out.push(chain[k]); k++; continue; }
    let b = k; while (U[b + 1]) b++;
    const A = chain[k - 1], B = chain[b + 1];
    const br = hermite(A, dirAt(k - 1, -1) || unit([B[0] - A[0], B[1] - A[1]]), B, dirAt(b + 1, +1) || unit([B[0] - A[0], B[1] - A[1]]));
    out.push(...br); joins.push(A, B);
    bridged.push({ kind: 'hidden', lengthMm: +hyp(B[0] - A[0], B[1] - A[1]).toFixed(2) });
    k = b + 1;
  }
  // the trail end: last seen point -> anchor
  out.push(...hermite(chain[b0], dirAt(b0, -1) || unit([trail[0] - chain[b0][0], trail[1] - chain[b0][1]]), trail, [-1, 0]), trail); joins.push(chain[b0]);
  bridged.push({ kind: 'root, trail side', lengthMm: +hyp(chain[b0][0] - trail[0], chain[b0][1] - trail[1]).toFixed(2) });
  return { chain: out, bridged, joins };
}

/* THE WING'S OWN FRAME (design doc §13.6). A wing is fitted along its own LONG
   AXIS — from the hinge to its APEX, the point of its outline farthest from the
   hinge — and the axis's angle is stored as the pair's SWEEP (+ = backward, the
   geometry's sign), so the outline's points carry the shape and nothing of the
   angle. `wingAxis` reads it off a chain in world mm (the tail excluded: a
   swallowtail's tail is not where the wing points).

   The ROOT in that frame. The geometry closes every outline on a root chord at
   u = 0 — square to the wing's own axis through its hinge. A root the picture
   shows runs along the BODY's edge, which is square to the axis only at sweep 0,
   so the chain is re-rooted: kept from where it leaves the body (`hidden`) and
   stands ahead of the root line (u > 0 — nothing of an outline may sit behind
   its own root), and joined by a cubic Hermite, tangent to the margin, to each
   end of a short root chord centred on the hinge (half `halfMm` either side),
   arriving along the axis. Everything rebuilt lies in the body's root zone. */
/* Consecutive INTERIOR control points closer than MIN_GAP_UW merged into
   their midpoint (the two root points are never moved); null if none were. */
function mergeClose(P) {
  const out = [P[0]]; let any = false;
  for (let i = 1; i < P.length; i++) {
    const q = P[i], last = out[out.length - 1], interior = out.length > 1 && i < P.length - 1;
    if (interior && hyp(q[0] - last[0], q[1] - last[1]) < MIN_GAP_UW) { out[out.length - 1] = [(q[0] + last[0]) / 2, (q[1] + last[1]) / 2]; any = true; }
    else out.push(q);
  }
  return any ? out : null;
}
export function wingAxis(chain, hinge, skip = () => false) {
  let best = -1, at = null;
  for (const q of chain) { if (skip(q)) continue; const d = hyp(q[0] - hinge[0], q[1] - hinge[1]); if (d > best) { best = d; at = q; } }
  return { sweep: (Math.atan2(-(at[1] - hinge[1]), at[0] - hinge[0]) * 180) / Math.PI, dist: best, apex: at };
}
export const ROOT_HALF_FRAC = 0.02;   // the re-rooted chord's half-width, of the wing's length (the outline rule wants 0.03 whole)
export function rerootChain(chain, hinge, sweepDeg, halfMm, hidden, opts = {}) {
  const sw = (sweepDeg * Math.PI) / 180, s = [Math.cos(sw), -Math.sin(sw)], c = [Math.sin(sw), Math.cos(sw)];
  const uOf = (q) => (q[0] - hinge[0]) * s[0] + (q[1] - hinge[1]) * s[1];
  const behind = (q) => hidden(q);
  let a = 0; while (a < chain.length - 1 && behind(chain[a])) a++;
  let b = chain.length - 1; while (b > a && behind(chain[b])) b--;
  if (b - a < 3) return null;
  const kept = chain.slice(a, b + 1);
  // the chord is centred on the hinge — unless the outline leaves the body
  // wholly to one side of it (a forewing whose leading edge emerges BEHIND the
  // hinge line, #36), where bridges from a hinge-centred chord would cross:
  // there it is centred between the two kept ends, still at u = 0
  const wOf = (q) => (q[0] - hinge[0]) * c[0] + (q[1] - hinge[1]) * c[1];
  const wl = wOf(kept[0]), wt = wOf(kept[kept.length - 1]);
  const mid = (wl < halfMm || wt > -halfMm) && wl - wt > 2 * halfMm ? (wl + wt) / 2 : 0;
  const lead = [hinge[0] + (mid + halfMm) * c[0], hinge[1] + (mid + halfMm) * c[1]], trail = [hinge[0] + (mid - halfMm) * c[0], hinge[1] + (mid - halfMm) * c[1]];
  const unit = (v) => { const L = hyp(v[0], v[1]) || 1; return [v[0] / L, v[1] / L]; };
  const tan = (from, dir) => { let m = from, len = 0; while (m + dir >= 0 && m + dir < kept.length && len < COMPLETE_TANGENT_MM) { len += hyp(kept[m + dir][0] - kept[m][0], kept[m + dir][1] - kept[m][1]); m += dir; } return m === from ? null : unit(dir > 0 ? [kept[m][0] - kept[from][0], kept[m][1] - kept[from][1]] : [kept[from][0] - kept[m][0], kept[from][1] - kept[m][1]]); };
  const step = opts.stepMm || 0.1;
  const hermite = (P0, T0, P1, T1) => {
    const out = [], L = hyp(P1[0] - P0[0], P1[1] - P0[1]), mag = COMPLETE_HERMITE * L, N = Math.max(2, Math.ceil(L / step));
    for (let i = 1; i < N; i++) {
      const t = i / N, t2 = t * t, t3 = t2 * t, h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
      out.push([h00 * P0[0] + h10 * mag * T0[0] + h01 * P1[0] + h11 * mag * T1[0], h00 * P0[1] + h10 * mag * T0[1] + h01 * P1[1] + h11 * mag * T1[1]]);
    }
    return out;
  };
  const L0 = kept[0], L1 = kept[kept.length - 1];
  const leadBr = hermite(lead, s, L0, tan(0, +1) || unit([L0[0] - lead[0], L0[1] - lead[1]]));
  const trailBr = hermite(L1, tan(kept.length - 1, -1) || unit([trail[0] - L1[0], trail[1] - L1[1]]), trail, [-s[0], -s[1]]);
  // nothing behind the root line (a bridge that dipped there is pushed onto it)
  const fix = (q) => q;
  return { chain: [lead, ...leadBr.map(fix), ...kept, ...trailBr.map(fix), trail], keptFrom: a, keptTo: b, lead, trail };
}
/* world mm -> the wing's own (u, w), and back: u along the axis in lengths, w
   across it in lengths x stretch (the editor's units at that sweep) */
export function axisFrame(hinge, sweepDeg, L, S) {
  const sw = (sweepDeg * Math.PI) / 180, cs = Math.cos(sw), sn = Math.sin(sw);
  return {
    toUW: (q) => { const dx = q[0] - hinge[0], dy = q[1] - hinge[1]; return [(dx * cs - dy * sn) / L, (dx * sn + dy * cs) / (L * S)]; },
    toWorld: ([u, w]) => { const a = u * L, b = w * L * S; return [hinge[0] + a * cs + b * sn, hinge[1] - a * sn + b * cs]; },
  };
}

/* Keep chain points at least `step` mm apart (the ends always). */
function decimate(chain, metric, step) {
  const out = [chain[0]]; let last = metric(chain[0]);
  for (let k = 1; k < chain.length - 1; k++) { const m = metric(chain[k]); if (hyp(m[0] - last[0], m[1] - last[1]) >= step) { out.push(chain[k]); last = m; } }
  out.push(chain[chain.length - 1]);
  return out;
}

/* A TAIL: the bottom pair's region opened by TAIL_OPEN_FRAC of its extent; a
   removed piece that is long, narrow and behind the wing's middle. Returns the
   piece as an upright-pixel mask with its length, or null. */
function findTail(M, NX, NY, cutI) {
  let imax = 0, jsum = 0, n = 0;
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) if (M[j * NX + i]) { imax = Math.max(imax, i); jsum += j; n++; }
  const extent = imax - cutI, r = Math.max(1.5, TAIL_OPEN_FRAC * extent);
  const op = openKeep(M, NX, NY, r);
  const res = new Uint8Array(NX * NY); for (let k = 0; k < NX * NY; k++) res[k] = M[k] && !op.mask[k] ? 1 : 0;
  const cc = components(res, NX, NY);
  const inv = new Uint8Array(NX * NY); for (let k = 0; k < NX * NY; k++) inv[k] = op.mask[k] ? 0 : 1;
  const dOpen = chamfer(inv, NX, NY);                 // distance from the opened wing
  let best = null;
  const jm = jsum / n;
  for (let id = 0; id < cc.sizes.length; id++) {
    let len = 0, js = 0, cnt = 0, tip = null;
    for (let k = 0; k < NX * NY; k++) if (cc.lab[k] === id) { cnt++; js += (k / NX) | 0; if (dOpen[k] > len) { len = dOpen[k]; tip = [k % NX + 0.5, ((k / NX) | 0) + 0.5]; } }
    const width = cnt / Math.max(1, len);
    if (len < TAIL_MIN_FRAC * extent || len < 2.5 * r || len < TAIL_ASPECT * width || js / cnt <= jm) continue;
    if (!best || len > best.lengthPx) best = { id, lengthPx: len, widthPx: width, tip };
  }
  if (!best) return null;
  const mask = new Uint8Array(NX * NY); for (let k = 0; k < NX * NY; k++) mask[k] = cc.lab[k] === best.id ? 1 : 0;
  // the tail's NECK lies partly inside the opened wing (within r of its core):
  // the piece is grown back by r + 1 px inside the wing, so the group takes the
  // neck's control points too and TAIL off leaves no stub — at the cost of
  // the margin points within r of the tail's base, which go with it
  const inv2 = new Uint8Array(NX * NY); for (let k = 0; k < NX * NY; k++) inv2[k] = mask[k] ? 0 : 1;
  const dT = chamfer(inv2, NX, NY);
  // (not clipped to the wing: a control point ON the outline can floor to the pixel just outside it)
  const dil = new Uint8Array(NX * NY); for (let k = 0; k < NX * NY; k++) dil[k] = dT[k] <= r + 1 ? 1 : 0;
  return { mask: dil, NX, NY, lengthPx: best.lengthPx, widthPx: best.widthPx, tip: best.tip };
}
const inTail = (T, toUpright, metric) => (q) => { const [x, y] = toUpright(...metric(q)); const i = Math.floor(x), j = Math.floor(y); return i >= 0 && j >= 0 && i < T.NX && j < T.NY && T.mask[j * T.NX + i] === 1; };
/* the chain point at the tail's tip — kept as a control point, so the fitted
   tail always reaches its end */
function tailTip(chain, T, toUpright, metric) {
  let best = -1, bd = Infinity;
  chain.forEach((q, k) => { const [x, y] = toUpright(...metric(q)); const d = hyp(x - T.tip[0], y - T.tip[1]); if (d < bd) { bd = d; best = k; } });
  return best >= 0 ? [best] : [];
}
/* Move the fitted control points that lie in the tail into the tagged TAIL
   group (design doc §6.1): base = the rest; the group's points stored as
   offsets in the margin frame at the anchor, which is chosen so that
   composeOutline(base, tail) puts them back exactly where they were. */
function tailGroup(pts, T, toUpright, metric) {
  const isT = pts.map(inTail(T, toUpright, metric));
  isT[0] = isT[pts.length - 1] = false;
  const runs = [];
  for (let k = 1; k < pts.length - 1; k++) if (isT[k] && !isT[k - 1]) { let m = k; while (isT[m + 1]) m++; runs.push([k, m]); }
  if (!runs.length) return { ok: false, reason: 'no control point lies in it' };
  const [a, b] = runs.reduce((x, y) => (y[1] - y[0] > x[1] - x[0] ? y : x));
  if (b - a + 1 < MIN_TAIL_POINTS) return { ok: false, reason: 'fewer than two control points lie in it' };
  const base = [...pts.slice(0, a), ...pts.slice(b + 1)].map((q) => q.slice());
  const tailPts = pts.slice(a, b + 1);
  if (base.length < 4 || !outlineValid(base).ok) return { ok: false, reason: 'the wing without it would not be a valid outline' };
  const seg = a - 1;                                       // the tail sits after base point a-1
  const dense = sampleOutline(base);
  let apex = 0; for (let k = 1; k < dense.length; k++) if (dense[k][0] > dense[apex][0]) apex = k;
  for (let f = 1; f < CR_SAMPLES; f++) {
    const d = dense[seg * CR_SAMPLES + f];
    if (!d || seg * CR_SAMPLES + f <= apex) continue;
    const A = tailAnchor(base, d[0]);
    if (A.seg !== seg) continue;
    const offsets = tailPts.map((q) => { const dx = q[0] - A.point[0], dy = q[1] - A.point[1]; return [dx * A.T[0] + dy * A.T[1], dx * A.N[0] + dy * A.N[1]]; });
    const comp = composeOutline(base, { on: true, anchorU: d[0], points: offsets });
    const same = comp.points.length === pts.length && comp.points.every((q, k) => Math.abs(q[0] - pts[k][0]) < 1e-9 && Math.abs(q[1] - pts[k][1]) < 1e-9);
    if (same && outlineValid(comp.points).ok) return { ok: true, base, offsets, anchorU: d[0] };
  }
  return { ok: false, reason: 'its base is not on the trailing margin' };
}
