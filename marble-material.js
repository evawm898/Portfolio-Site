/* marble-material.js — the /marble page's MATERIAL: everything that makes the
   paper view look like a print and nothing that moves a vertex. Every function
   here is PURE and SEEDED (mulberry32 from marble-math.js, never Math.random), so
   a link reproduces the texture to the byte: the gate asks for the same seed
   twice and compares the arrays.

   PAPERS   four presets — each a paper colour and a texture law — rendered as a
            MULTIPLY map (RGB near white, darker where the paper is) at a fixed
            texture resolution (TEX_W × TEX_H, independent of the canvas size, so
            the picture does not change with the window).
   MOTTLE   a low-frequency value-noise field, multiplied INSIDE the ink only
            (the page masks it by the ink's own alpha), so a flat fill reads as
            a film that pooled a little unevenly.
   GRANULATION  per ink: pigment specks inside a region, their count from the
            region's area and the ink's gran, seeded per region.
   FLAWS    one transfer per layer, scaled by the flaws slider: air-bubble voids
            and skips (erased), an uneven edge on one side (erased beyond a wavy
            curve), and a faint touch-down line (darkened within the ink).
   Nothing here reads a canvas; the page turns these records into pixels. */

import { mulberry32, SHEET } from './marble-math.js';

export const TEX_W = 250, TEX_H = 313;          // a quarter of the sheet per axis, 4:5
export const PAPERS = Object.freeze([
  { id: 'smooth', label: 'Smooth', hex: '#EDEDE8', textureAlpha: 0.35, mottle: 0.10 },
  { id: 'laid', label: 'Laid', hex: '#ECE8DC', textureAlpha: 0.55, mottle: 0.12 },
  { id: 'handmade', label: 'Handmade (fibrous)', hex: '#E9E3D3', textureAlpha: 0.7, mottle: 0.16 },
  { id: 'cotton', label: 'Cotton cloth', hex: '#E6E2D6', textureAlpha: 0.75, mottle: 0.14 },
]);
export function paperOf(index) { return PAPERS[Math.max(0, Math.min(PAPERS.length - 1, index | 0))]; }

/* value noise: a seeded lattice of cell values, bilinear, summed over octaves.
   Returns Float32Array of length w*h in [0, 1]. Deterministic per (seed, w, h). */
export function valueNoise(seed, w, h, { cell = 16, octaves = 3, gain = 0.5 } = {}) {
  const out = new Float32Array(w * h);
  let amp = 1, total = 0, c = cell;
  for (let o = 0; o < octaves; o++) {
    const rand = mulberry32((seed * 1000003 + o * 7919) >>> 0);
    const gw = Math.ceil(w / c) + 2, gh = Math.ceil(h / c) + 2;
    const lat = new Float32Array(gw * gh);
    for (let i = 0; i < lat.length; i++) lat[i] = rand();
    for (let y = 0; y < h; y++) {
      const fy = y / c, iy = Math.floor(fy), ty = fy - iy, sy = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < w; x++) {
        const fx = x / c, ix = Math.floor(fx), tx = fx - ix, sx = tx * tx * (3 - 2 * tx);
        const a = lat[iy * gw + ix], b = lat[iy * gw + ix + 1], d = lat[(iy + 1) * gw + ix], e = lat[(iy + 1) * gw + ix + 1];
        out[y * w + x] += amp * ((a + (b - a) * sx) + ((d + (e - d) * sx) - (a + (b - a) * sx)) * sy);
      }
    }
    total += amp; amp *= gain; c = Math.max(2, c / 2);
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

/* the paper's multiply map: RGBA bytes, TEX_W × TEX_H, RGB = 255·(1 - d) with d
   the local darkening, alpha 255. Each preset is its own law. */
export function paperTexture(paperIndex, seed, w = TEX_W, h = TEX_H) {
  const p = paperOf(paperIndex);
  const px = new Uint8ClampedArray(w * h * 4);
  const fine = valueNoise(seed + 11, w, h, { cell: 3, octaves: 2 });
  const coarse = valueNoise(seed + 29, w, h, { cell: 24, octaves: 3 });
  const dark = new Float32Array(w * h);
  for (let i = 0; i < dark.length; i++) dark[i] = 0.06 * (fine[i] - 0.5) + 0.05 * (coarse[i] - 0.5);
  if (p.id === 'laid') {
    // laid lines run ACROSS the sheet every ~3 px, chain lines down it every ~38
    const rand = mulberry32(seed + 3);
    const chain = 34 + Math.floor(rand() * 10), phase = rand() * 3;
    for (let y = 0; y < h; y++) {
      const laid = 0.5 + 0.5 * Math.cos((y + phase) * 2 * Math.PI / 3.1);
      for (let x = 0; x < w; x++) {
        const ch = ((x + 7) % chain) < 1.2 ? 0.08 : 0;
        dark[y * w + x] += 0.07 * (laid - 0.5) * (0.7 + 0.6 * fine[y * w + x]) + ch;
      }
    }
  } else if (p.id === 'handmade') {
    // a cloudier sheet with short fibres lying in it at random angles
    for (let i = 0; i < dark.length; i++) dark[i] += 0.07 * (coarse[i] - 0.5);
    const rand = mulberry32(seed + 5);
    const nf = Math.round(w * h / 180);
    for (let f = 0; f < nf; f++) {
      let x = rand() * w, y = rand() * h; const a = rand() * Math.PI * 2, len = 3 + rand() * 14, d = 0.05 + rand() * 0.08;
      const dx = Math.cos(a), dy = Math.sin(a);
      for (let t = 0; t < len; t++) { const ix = Math.round(x), iy = Math.round(y); if (ix >= 0 && iy >= 0 && ix < w && iy < h) dark[iy * w + ix] += d; x += dx; y += dy; }
    }
  } else if (p.id === 'cotton') {
    // a plain weave: warp and weft at ~4 px, each thread's shade its own
    const rand = mulberry32(seed + 9);
    const pitch = 3.6 + rand() * 0.8;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = Math.sin(x * 2 * Math.PI / pitch), v = Math.sin(y * 2 * Math.PI / pitch);
      const weave = (u * v > 0 ? Math.abs(u) : Math.abs(v));
      dark[y * w + x] += 0.11 * (weave - 0.5) + 0.03 * (fine[y * w + x] - 0.5);
    }
  }
  for (let i = 0; i < dark.length; i++) {
    const v = Math.max(0, Math.min(255, Math.round(255 * (1 - Math.max(0, dark[i] + 0.08)))));
    px[4 * i] = v; px[4 * i + 1] = v; px[4 * i + 2] = v; px[4 * i + 3] = 255;
  }
  return px;
}

/* the mottle inside the ink: a multiply map around neutral, amplitude `amount` */
export const MOT_W = 125, MOT_H = 156;
export function mottleTexture(seed, amount = 0.12, w = MOT_W, h = MOT_H) {
  const n = valueNoise(seed + 101, w, h, { cell: 10, octaves: 3, gain: 0.55 });
  const px = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < n.length; i++) {
    const v = Math.round(255 * (1 - amount * (n[i] - 0.35)));
    px[4 * i] = v; px[4 * i + 1] = v; px[4 * i + 2] = v; px[4 * i + 3] = 255;
  }
  return px;
}

/* pigment specks for one region: [x, y, r] in sheet units, inside the region's
   bounding box (the page clips to the region). Count from area × gran, capped. */
export const GRAN_SPECKS_PER_AREA = 1 / 45, GRAN_SPECK_CAP = 600;
export function granulationSpecks(seed, regionIndex, gran, pts, area) {
  if (!(gran > 0) || !(area > 0)) return [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < pts.length; i += 2) { const x = pts[i], y = pts[i + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const rand = mulberry32((seed * 48271 + regionIndex * 2654435761) >>> 0);
  const n = Math.min(GRAN_SPECK_CAP, Math.round(area * GRAN_SPECKS_PER_AREA * gran * (0.6 + 0.4 * rand())));
  const out = [];
  for (let i = 0; i < n; i++) out.push([x0 + rand() * (x1 - x0), y0 + rand() * (y1 - y0), 0.5 + rand() * 1.1 * (0.5 + gran)]);
  return out;
}

/* THE TRANSFER FLAWS for one pull, in sheet units, scaled by flaws f in [0, 1]:
   voids (air bubbles: small ellipses), skips (long slivers along one angle),
   the uneven edge (one side, a wavy curve the paper did not reach past, depth
   proportional to f) and the touch-down line (where the sheet first met the
   bath, a faint straight band). f = 0 is a clean pull: nothing at all. */
export function flawPlan(seed, flaws, layerIndex = 0) {
  const f = Math.max(0, Math.min(1, flaws));
  const plan = { voids: [], skips: [], edge: null, line: null };
  if (f <= 0) return plan;
  const rand = mulberry32((seed * 69069 + layerIndex * 1013904223 + 17) >>> 0);
  const W = SHEET.w, H = SHEET.h;
  const nv = Math.round(f * 70 * (0.7 + 0.6 * rand()));
  for (let i = 0; i < nv; i++) plan.voids.push({ x: rand() * W, y: rand() * H, rx: 1.5 + rand() * 7 * (0.5 + f), ry: 1 + rand() * 4.5 * (0.5 + f), rot: rand() * Math.PI });
  const ns = Math.round(f * 9 * rand());
  const skipAng = rand() * Math.PI;
  for (let i = 0; i < ns; i++) plan.skips.push({ x: rand() * W, y: rand() * H, rx: 12 + rand() * 50, ry: 0.5 + rand() * 1.6, rot: skipAng + (rand() - 0.5) * 0.3 });
  const side = Math.floor(rand() * 4);          // 0 top · 1 right · 2 bottom · 3 left
  const depth = 6 + f * 26, n = 40, pts = [];
  const along = side % 2 === 0 ? W : H;
  const noise = valueNoise((seed * 31 + layerIndex) >>> 0, n + 1, 1, { cell: 6, octaves: 2 });
  for (let i = 0; i <= n; i++) pts.push([along * i / n, depth * (0.25 + noise[i])]);
  plan.edge = { side, depth, pts };
  const ang = (rand() - 0.5) * 0.5, y = H * (0.25 + rand() * 0.5);
  plan.line = { x0: -20, y0: y - Math.tan(ang) * (W / 2 + 20), x1: W + 20, y1: y + Math.tan(ang) * (W / 2 + 20), width: 2.2 + f * 2, alpha: 0.05 + 0.09 * f };
  return plan;
}

/* a byte digest for "the same texture" claims */
export function digestBytes(arr) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < arr.length; i++) { h ^= arr[i]; h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16);
}
