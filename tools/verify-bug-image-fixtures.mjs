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
