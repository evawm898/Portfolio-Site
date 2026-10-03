/* verify-bug-image-fixtures.mjs — synthetic TOP-DOWN pictures of bugs for the
   image-to-bug gate (IM in tools/verify-bug.mjs) and its contact sheet.

   Each picture is drawn from a KNOWN bug: buildBug(params), every part's own
   top-down contour loops (G.contourLoops — the SVG exporter's projection)
   filled with the nonzero rule, supersampled 3x3 per pixel, then made
   photograph-like: a slight ROTATION, a slight ASYMMETRY (the bug's left half
   stretched), paper/ink colours with a gradient, background-coloured "spots"
   inside the wings (the pattern the import must fill away), and noise. The
   KNOWN bug and the transform are returned beside the pixels, so the gate's
   reference is the bug the picture was drawn FROM — never the fit's own
   measurement of the picture (the fourth durable rule). Pure Node, no canvas:
   { width, height, data } is exactly the shape a canvas's ImageData has. */

import * as G from '../bug-geometry.js';
import { HAND_OUTLINES } from './bug-fixtures.mjs';

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const gauss = (r) => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

/* The parts' top-down loops in world mm, by part. */
export function partLoops(model, filter = () => true) {
  return model.parts.filter(filter).map((part) => G.contourLoops(model, part)).filter((L) => L.length);
}

/* Fill groups of loops (each group nonzero) into a coverage grid. `toPx` maps
   world mm -> picture px. ss x ss samples per pixel. */
export function rasterLoops(groups, toPx, W, H, ss = 3) {
  const cov = new Float32Array(W * H);
  const segs = [];
  groups.forEach((loops, g) => { for (const L of loops) for (let k = 0; k < L.length; k++) { const a = toPx(L[k]), b = toPx(L[(k + 1) % L.length]); if (a[1] !== b[1]) segs.push([a[0], a[1], b[0], b[1], g]); } });
  // bucket by row
  const buckets = Array.from({ length: H }, () => []);
  for (const s of segs) { const y0 = Math.max(0, Math.floor(Math.min(s[1], s[3]))), y1 = Math.min(H - 1, Math.floor(Math.max(s[1], s[3]))); for (let y = y0; y <= y1; y++) buckets[y].push(s); }
  const row = new Float32Array(W * ss);
  for (let y = 0; y < H; y++) {
    for (let sy = 0; sy < ss; sy++) {
      const yy = y + (sy + 0.5) / ss;
      row.fill(0);
      // per group: crossings with winding
      const byG = new Map();
      for (const s of buckets[y]) {
        const [x0, y0, x1, y1, g] = s;
        if ((y0 <= yy) === (y1 <= yy)) continue;
        const x = x0 + ((yy - y0) * (x1 - x0)) / (y1 - y0);
        if (!byG.has(g)) byG.set(g, []);
        byG.get(g).push([x, y1 > y0 ? 1 : -1]);
      }
      for (const xs of byG.values()) {
        xs.sort((a, b) => a[0] - b[0]);
        let wnd = 0;
        for (let k = 0; k + 1 < xs.length; k++) {
          wnd += xs[k][1];
          if (!wnd) continue;
          const a = Math.max(0, Math.ceil(xs[k][0] * ss - 0.5)), b = Math.min(W * ss - 1, Math.floor(xs[k + 1][0] * ss - 0.5));
          for (let i = a; i <= b; i++) row[i] = 1;
        }
      }
      for (let x = 0; x < W; x++) { let c = 0; for (let sx = 0; sx < ss; sx++) c += row[x * ss + sx]; cov[y * W + x] += c / (ss * ss); }
    }
  }
  return cov;
}

/* Render a known bug as a picture. */
export function renderBug(params, o = {}) {
  const { pxPerMm = 6, angleDeg = 0, asym = 0, margin = 24, noise = 9, seed = 1, light = false, spots = true, busy = 0 } = o;
  const model = G.buildBug(params);
  const groups = partLoops(model);
  const t = (angleDeg * Math.PI) / 180, ct = Math.cos(t), st = Math.sin(t);
  // asymmetry: the bug's LEFT half (x < 0) stretched by (1 + asym)
  const warp = ([x, y]) => [x < 0 ? x * (1 + asym) : x, y];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const pre = ([x, y]) => { const [u, v] = warp([x, y]); return [pxPerMm * (u * ct + v * st), pxPerMm * (u * st - v * ct)]; };   // y down; rotate by angle
  for (const g of groups) for (const L of g) for (const q of L) { const [a, b] = pre(q); x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); }
  const W = Math.ceil(x1 - x0 + 2 * margin), H = Math.ceil(y1 - y0 + 2 * margin);
  const ox = margin - x0, oy = margin - y0;
  const toPx = (q) => { const [a, b] = pre(q); return [a + ox, b + oy]; };
  const cov = rasterLoops(groups, toPx, W, H);
  // background-coloured SPOTS inside the wings: the pattern the import fills
  const r = rng(seed);
  const spotList = [];
  if (spots) for (const part of model.parts.filter((q) => /^wing\d$/.test(q.kind))) {
    // the AREA centroid of the part's largest loop (a vertex average sits at a
    // tail's base: the tail's bead rings are dense)
    const L = G.contourLoops(model, part).reduce((a, l) => (l.length > a.length ? l : a), []);
    let A = 0, cx = 0, cy = 0;
    for (let k = 0; k < L.length; k++) { const [x0, y0] = L[k], [x1, y1] = L[(k + 1) % L.length], c = x0 * y1 - x1 * y0; A += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c; }
    cx /= 3 * A; cy /= 3 * A;
    const P = toPx([cx, cy]); spotList.push([P[0], P[1], 1.6 * pxPerMm]);
  }
  const data = new Uint8ClampedArray(W * H * 4);
  const paper = light ? [24, 24, 28] : [236, 232, 222], ink = light ? [226, 214, 190] : [42, 34, 30];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let c = cov[y * W + x];
    for (const [sx, sy, sr] of spotList) if (Math.hypot(x + 0.5 - sx, y + 0.5 - sy) < sr) c *= 0.0;
    const grad = 0.92 + 0.08 * (x / W);
    for (let k = 0; k < 3; k++) {
      const bg = paper[k] * (light ? 1 : grad), fg = ink[k] * (light ? grad : 1) + (k === 0 ? 30 : 0) * (y / H);
      data[4 * (y * W + x) + k] = bg + (fg - bg) * c + noise * gauss(r);
    }
    data[4 * (y * W + x) + 3] = 255;
  }
  if (busy) {
    // a busy background: overlapping dark blobs over the whole picture
    for (let n = 0; n < busy; n++) {
      const cx = r() * W, cy = r() * H, rx = 6 + r() * 40, ry = 6 + r() * 40;
      for (let y = Math.max(0, Math.floor(cy - ry)); y < Math.min(H, cy + ry); y++) for (let x = Math.max(0, Math.floor(cx - rx)); x < Math.min(W, cx + rx); x++) {
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1) continue;
        const i = 4 * (y * W + x); for (let k = 0; k < 3; k++) data[i + k] = 60 + 30 * Math.sin(n + k) + noise * gauss(r);
      }
    }
  }
  // the truth: picture px of the world origin, the angle, the scale; the
  // known wingspan (right wing tip x, doubled)
  let span = 0; for (const part of model.parts.filter((q) => /^wing\d$/.test(q.kind) && q.side === 'R')) for (let v = part.v0; v < part.v1; v++) span = Math.max(span, model.positions[3 * v]);
  // picture px -> world mm, for the bug's RIGHT half (the unwarped side)
  const fromPx = ([px, py]) => { const a = (px - ox) / pxPerMm, b = (py - oy) / pxPerMm; return [a * ct + b * st, a * st - b * ct]; };
  return { width: W, height: H, data, truth: { params, model, toPx, fromPx, pxPerMm, angleDeg, asym, wingspanMm: 2 * span, origin: toPx([0, 0]) } };
}

/* The SAME-TONE body: a photograph's dark body touches the dark wing roots (a
   Morpho's hindwings hug its abdomen), so no narrow column shows between the
   wings — only the abdomen's tip below them. Drawn from the default bug with
   the background between the body and each wing's inner edge inked over, from
   the thorax back, wherever that inner edge is within `reach` mm of the axis.
   What is inked is NOT the known bug's wing, so the outline comparison is
   clipped beyond `reach` (truth.clipMm). */
export function sameTone(params, o = {}, reach = 8) {
  const img = renderBug(params, o), t = img.truth, W = img.width, H = img.height, m = t.model;
  const loops = m.parts.filter((q) => /^wing\d$/.test(q.kind) && q.side === 'R').flatMap((q) => G.contourLoops(m, q));
  const inner = (y) => { let best = Infinity; for (const L of loops) for (let k = 0; k < L.length; k++) { const a = L[k], b = L[(k + 1) % L.length]; if ((a[1] <= y) !== (b[1] <= y)) { const x = a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]); if (x > 0) best = Math.min(best, x); } } return best; };
  const front = (params.thoraxLength || 5) / 2, ink = [42, 34, 30], r = rng(o.seed || 1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const [wx, wy] = t.fromPx([x + 0.5, y + 0.5]);
    if (wy > front) continue;
    const e = inner(wy);
    if (e < reach && Math.abs(wx) <= e + 0.3) { const i = 4 * (y * W + x); for (let k = 0; k < 3; k++) img.data[i + k] = ink[k] + 9 * gauss(r); }
  }
  t.clipMm = reach + 0.3;
  return img;
}

/* CLUTTER: a photograph of a pinned specimen — the bug on a sheet of paper
   whose EDGE runs across one side with a dark table beyond it, a SCALE BAR
   with "1 cm" beside it, and a typed LABEL. Nothing of it touches the bug.
   The gate's claim is that the fit ignores all of it (and reports the marks). */
const GLYPHS = { '1': ['010', '110', '010', '010', '010', '010', '111'], c: ['000', '000', '011', '100', '100', '100', '011'], m: ['00000', '00000', '11010', '10101', '10101', '10101', '10101'], ' ': ['0', '0', '0', '0', '0', '0', '0'] };
export function clutter(params, o = {}) {
  const img = renderBug(params, { ...o, margin: 150 }), t = img.truth, W = img.width, H = img.height, r = rng((o.seed || 1) + 7);
  const px = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = 4 * (y * W + x); for (let k = 0; k < 3; k++) img.data[i + k] = c[k] + 8 * gauss(r); };
  // the paper's edge: a line across the lower-right corner, the table beyond it
  const ang = (o.edgeDeg ?? 24) * Math.PI / 180, nx = Math.cos(ang), ny = Math.sin(ang);
  let reachBug = -Infinity; const lp = (q) => { const [a, b] = t.toPx(q); reachBug = Math.max(reachBug, a * nx + b * ny); };
  for (const part of t.model.parts) for (let v = part.v0; v < part.v1; v++) lp([t.model.positions[3 * v], t.model.positions[3 * v + 1]]);
  // and a second edge along the bottom: the paper's CORNER, so the table
  // beyond it is a larger shape than the bug (the case a "keep the largest
  // shape" rule gets wrong)
  let lowBug = -Infinity; for (const part of t.model.parts) for (let v = part.v0; v < part.v1; v++) lowBug = Math.max(lowBug, t.toPx([t.model.positions[3 * v], t.model.positions[3 * v + 1]])[1]);
  const edge = reachBug + 22, a2 = (o.edge2Deg ?? -4) * Math.PI / 180, mx = -Math.sin(a2), my = Math.cos(a2), edge2 = (lowBug + 30) * my + (W / 2) * mx;
  // o.sheet: the WHOLE sheet in view, a rotated rectangle with the table all
  // round it (the sheet then encloses the bug: a frame, not the subject)
  const inSheet = (x, y) => { const c = Math.cos(0.06), sn = Math.sin(0.06), u = (x - W / 2) * c + (y - H / 2) * sn, v = -(x - W / 2) * sn + (y - H / 2) * c; return Math.abs(u) < W / 2 - 44 && Math.abs(v) < H / 2 - 44; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (o.sheet ? !inSheet(x + 0.5, y + 0.5) : (x + 0.5) * nx + (y + 0.5) * ny > edge || (x + 0.5) * mx + (y + 0.5) * my > edge2) px(x, y, [64, 50, 40]);
  // the scale bar: 1 cm long at the picture's own scale, bottom left, ticked
  const L = Math.round(10 * t.pxPerMm), bx = o.sheet ? 34 : 14, by = Math.round(lowBug + 18);
  for (let y = by; y < by + 4; y++) for (let x = bx; x <= bx + L; x++) px(x, y, [30, 26, 24]);
  for (const x0 of [bx, bx + L]) for (let y = by - 6; y < by + 4; y++) for (let x = x0; x < x0 + 2; x++) px(x, y, [30, 26, 24]);
  let gx = bx; const text = (str, x0, y0, sc) => { let x = x0; for (const ch of str) { const g = GLYPHS[ch] || GLYPHS[' ']; g.forEach((row, j) => [...row].forEach((b, i) => { if (b === '1') for (let a = 0; a < sc; a++) for (let c = 0; c < sc; c++) px(x + i * sc + a, y0 + j * sc + c, [30, 26, 24]); })); x += (g[0].length + 1) * sc; } return x; };
  gx = text('1 cm', bx + L + 8, by - 10, 2);
  // a typed label, top left: four lines of "words"
  for (let line = 0; line < 4; line++) { let x = o.sheet ? 60 : 12; const y = (o.sheet ? 60 : 12) + line * 11; while (x < 12 + 70 + 10 * r()) { const w = 6 + Math.floor(14 * r()); for (let yy = y; yy < y + 6; yy++) for (let xx = x; xx < x + w; xx++) if (r() < 0.75) px(xx, yy, [40, 36, 34]); x += w + 5; } }
  return img;
}

const D = () => G.defaultParams();
/* The fixtures the gate and the sheet share. */
export const IMAGE_FIXTURES = {
  // the default specimen butterfly: one wing mass per side with a notch
  butterfly: () => renderBug(D(), { angleDeg: 4, asym: 0.02, seed: 11 }),
  // a swallowtail: the default with its TAIL on
  swallowtail: () => { const p = D(); p.wings.tail.on = true; return renderBug(p, { angleDeg: -5, asym: 0.025, seed: 12 }); },
  // a moth: ONE pair, light on a dark ground
  moth: () => { const p = D(); p.wingPairs = 1; p.wings.first.length = 34; p.wings.first.stretch = 1.25; p.wings.first.sweep = -8; p.antennaType = 'feathered'; return renderBug(p, { angleDeg: 3, asym: 0.02, seed: 13, light: true }); },
  // a dragonfly: two pairs of long narrow wings, visibly separate
  dragonfly: () => {
    const p = D(); p.wingPairs = 2; p.abdomenLength = 34; p.abdomenWidth = 2.0; p.antennaType = 'bristle'; p.antennaLength = 3;
    p.wings.first.points = HAND_OUTLINES.strap; p.wings.last.points = HAND_OUTLINES.strap; p.wings.first.length = 36; p.wings.last.length = 34;
    p.wings.first.stretch = 1; p.wings.last.stretch = 1.1; p.wings.first.sweep = -12; p.wings.last.sweep = 14; p.wings.last.scallop = 0;
    return renderBug(p, { angleDeg: -3, asym: 0.015, seed: 14, spots: false });
  },
  // a STRAY dark blob joined to the right forewing's tip (a leaf, a pin, a
  // shadow): the brush must be able to take it off; its erase mask comes with it
  stray: () => {
    const img = renderBug(D(), { angleDeg: 4, asym: 0.02, seed: 16 });
    const t = img.truth, m = t.model, W = img.width, H = img.height;
    let tip = null; for (const q of m.parts.filter((x) => x.kind === 'wing1' && x.side === 'R')) for (let v = q.v0; v < q.v1; v++) { const P = [m.positions[3 * v], m.positions[3 * v + 1]]; if (!tip || P[0] > tip[0]) tip = P; }
    const [cx, cy] = t.toPx([tip[0] + 2, tip[1] - 6]), R = 7 * t.pxPerMm;
    const erase = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d < R) { const i = 4 * (y * W + x); img.data[i] = 40; img.data[i + 1] = 36; img.data[i + 2] = 32; }
      if (d < R + 3) erase[y * W + x] = 1;          // what a brush stroke over it paints
    }
    // the blob must not erase the wing itself: clear the erase mask over the known wing
    const known = rasterLoops(partLoops(m, (q) => /^wing\d$/.test(q.kind)), t.toPx, W, H);
    for (let k = 0; k < W * H; k++) if (known[k] > 0.02) erase[k] = 0;
    img.erase = erase;
    return img;
  },
  // a SAME-TONE body (a Morpho's): the body touches the wing roots, no column shows
  sametone: () => sameTone(D(), { angleDeg: 6, asym: 0.02, seed: 21 }),
  // CLUTTER: rotated, on paper with an edge and a table beyond it, a 1 cm scale bar, a label
  clutter: () => clutter(D(), { angleDeg: 9, asym: 0.02, seed: 22 }),
  // the WHOLE sheet in view on a dark table: the sheet encloses the bug (a frame)
  sheet: () => clutter(D(), { angleDeg: -7, asym: 0.02, seed: 23, sheet: true }),
  // a busy background: the butterfly over dense blobs — must be REFUSED
  busy: () => renderBug(D(), { angleDeg: 2, seed: 15, busy: 420 }),
};

/* A minimal PNG encoder (RGBA, 8-bit, no filter) — for the sheet's fixture files. */
import zlib from 'node:zlib';
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export function encodePNG(img) {
  const { width: W, height: H, data } = img;
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; Buffer.from(data.buffer, data.byteOffset + y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1); }
  const chunk = (type, body) => { const len = Buffer.alloc(4); len.writeUInt32BE(body.length); const tb = Buffer.concat([Buffer.from(type, 'ascii'), body]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(tb)); return Buffer.concat([len, tb, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
