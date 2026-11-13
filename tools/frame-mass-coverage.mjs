#!/usr/bin/env node
/* frame-mass-coverage.mjs — round 3 of the flow study (docs/frame-flow-study.md
   §10): how much of the ORNAMENT ZONE is material.

   THE ZONE is the plan area between the molding's outer edge and the
   composed TARGET envelope (frame-compose.js's ENVELOPES, eased exactly as
   the composer eases them, mirrored): inside the envelope's closed outline
   and outside the frame's own silhouette (plateOutline — the band and the
   opening). FILL is the share of the zone's cells that some triangle of the
   relief covers in plan (every part: the scrolls, the leaves, the shells, the
   mass), on a 0.2 mm raster.

   ATTACHMENT is the share of the molding's outer edge, sampled every 0.5 mm,
   at which the point PROBE × M outward from the edge is material (counted
   only where that point is in the zone): how much of the run the ornament
   grows from, rather than orbits.

   THE REFERENCE (--refs <dir>, the photographs, never committed): 2.webp is
   decoded in Chromium (a canvas, getImageData) at 600 × 800. The molding's
   outer edge is R2's traced ellipse (tools/frame-flow-envelope.mjs: centre
   (300, 413), semi-axes 215 × 287 px, M = 38 px), the zone the same composed
   target envelope mapped onto it by arc fraction and M (the overlay that
   tool draws, red), and BRONZE is a pixel darker than Otsu's threshold over
   the zone's own luminance (the wall is a near-white plaster; the bronze a
   mid-dark grey). The same probe gives the reference's attachment. Both are
   approximate where the traced ellipse departs from the photo's edge; the
   method is the same on both sides.

   Usage: node tools/frame-mass-coverage.mjs [--refs <dir>] [--modes composed,mass] [--json]
   Exports measureCoverage(model, relief) for the measurement tool. */

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (f) => import(pathToFileURL(path.join(ROOT, f)).href);
export const PROBE = 0.15;   // × M: the attachment probe's distance outward from the molding's edge
const CELL = 0.2;

/* a closed polygon's interior on a grid (scanline, even-odd), into mask */
export function fillPoly(mask, nx, ny, x0, y0, c, poly, val = 1) {
  const n = poly.length;
  for (let j = 0; j < ny; j++) {
    const y = y0 + (j + 0.5) * c, xs = [];
    for (let k = 0; k < n; k++) {
      const a = poly[k], b = poly[(k + 1) % n];
      if ((a[1] <= y) !== (b[1] <= y)) xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil((xs[k] - x0) / c - 0.5)), i1 = Math.min(nx - 1, Math.floor((xs[k + 1] - x0) / c - 0.5));
      for (let i = i0; i <= i1; i++) mask[j * nx + i] = val;
    }
  }
}

/* the relief's plan cover on the grid: every triangle, its cell centres */
function coverOf(relief, nx, ny, x0, y0, c) {
  const P = relief.positions, I = relief.indices;
  const m = new Uint8Array(nx * ny);
  for (let t = 0; t < I.length; t += 3) {
    const a = 3 * I[t], b = 3 * I[t + 1], d = 3 * I[t + 2];
    const ax = P[a], ay = P[a + 1], bx = P[b], by = P[b + 1], cx = P[d], cy = P[d + 1];
    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(area) < 1e-9) continue;
    const i0 = Math.max(0, Math.floor((Math.min(ax, bx, cx) - x0) / c)), i1 = Math.min(nx - 1, Math.floor((Math.max(ax, bx, cx) - x0) / c));
    const j0 = Math.max(0, Math.floor((Math.min(ay, by, cy) - y0) / c)), j1 = Math.min(ny - 1, Math.floor((Math.max(ay, by, cy) - y0) / c));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      if (m[j * nx + i]) continue;
      const px = x0 + (i + 0.5) * c, py = y0 + (j + 0.5) * c;
      const w0 = (bx - px) * (cy - py) - (by - py) * (cx - px), w1 = (cx - px) * (ay - py) - (cy - py) * (ax - px), w2 = (ax - px) * (by - py) - (ay - py) * (bx - px);
      if ((w0 >= 0 && w1 >= 0 && w2 >= 0) || (w0 <= 0 && w1 <= 0 && w2 <= 0)) m[j * nx + i] = 1;
    }
  }
  return m;
}

/* the zone of a composed model and its fill and attachment */
export async function measureCoverage(model, relief, envOrn = model.ornament) {
  return coverageOf(model, relief, await imp('frame-relief.js'), envOrn);
}
export function coverageOf(model, relief, RL, envOrn = model.ornament, FP = null) {
  const o = envOrn, f = o.flow, s = o.scale, M = o.length;
  if (!f || !f.envelope) return null;
  const env = [...f.envelope, ...f.envelope.slice().reverse().map(([x, y]) => [-x, y])];
  const sil = RL.plateOutline(model).map(([x, y]) => [x * s, y * s]);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of [...env, ...sil]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  x0 -= 4; y0 -= 4; x1 += 4; y1 += 4;
  const nx = Math.ceil((x1 - x0) / CELL), ny = Math.ceil((y1 - y0) / CELL);
  const zone = new Uint8Array(nx * ny), frame = new Uint8Array(nx * ny);
  fillPoly(zone, nx, ny, x0, y0, CELL, env); fillPoly(frame, nx, ny, x0, y0, CELL, sil);
  const cover = coverOf(relief, nx, ny, x0, y0, CELL);
  let nz = 0, nf = 0;
  for (let k = 0; k < zone.length; k++) if (zone[k] && !frame[k]) { nz++; if (cover[k]) nf++; }
  // attachment: the silhouette sampled every 0.5 mm, the probe outward
  const cell = (q) => { const i = Math.floor((q[0] - x0) / CELL), j = Math.floor((q[1] - y0) / CELL); return i >= 0 && j >= 0 && i < nx && j < ny ? j * nx + i : -1; };
  let na = 0, nat = 0;
  for (let k = 0; k < sil.length; k++) {
    const a = sil[k], b = sil[(k + 1) % sil.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 1e-9) continue;
    const t = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    for (let u = 0; u < L; u += 0.5) {
      const q = [a[0] + t[0] * u, a[1] + t[1] * u];
      // outward: whichever normal lands outside the silhouette
      let pr = [q[0] + t[1] * PROBE * M, q[1] - t[0] * PROBE * M], ck = cell(pr);
      if (ck < 0 || frame[ck]) { pr = [q[0] - t[1] * PROBE * M, q[1] + t[0] * PROBE * M]; ck = cell(pr); }
      if (ck < 0 || frame[ck] || !zone[ck]) continue;
      na++; if (cover[ck]) nat++;
    }
  }
  // the narrowest empty NECK outside the frame's silhouette (frame-print's own rule, the frame counted solid so its
  // own head/light cusps — a raster-phase artefact of the frame alone — are not the ornament's)
  let slit = null;
  if (FP && FP.narrowest) {
    const R = { nx, ny, cell: CELL, gx: (i) => x0 + (i + 0.5) * CELL, gy: (j) => y0 + (j + 0.5) * CELL };
    const solid = (k) => { const i = Math.floor(k / ny), j = k % ny, q = j * nx + i; return cover[q] || frame[q]; };
    slit = FP.narrowest(R, FP.edt2(nx, ny, solid), (k) => !solid(k));
  }
  return { fill: nf / nz, zoneMm2: nz * CELL * CELL, attach: na ? nat / na : null, samples: na, M, slit };
}

/* the reference: 2.webp's bronze in the same zone */
export async function referenceCoverage(refs, debug = null) {
  const { chromium } = await import('playwright-core');
  const G = await imp('frame-geometry.js'), FL = await imp('frame-filigree.js');
  const C = [300, 413], A = 215, B = 287, MPX = 38, W = 600, H = 800;
  const N = 4000, ell = [];
  for (let k = 0; k <= N; k++) { const th = -Math.PI / 2 - Math.PI * k / N; ell.push([C[0] + A * Math.cos(th), C[1] + B * Math.sin(th)]); }
  const arc = [0]; for (let k = 1; k <= N; k++) arc.push(arc[k - 1] + Math.hypot(ell[k][0] - ell[k - 1][0], ell[k][1] - ell[k - 1][1]));
  const Lt = arc[N];
  const atFrac = (t) => { const ss = t * Lt; let k = arc.findIndex((v) => v >= ss); if (k < 1) k = 1; const p = ell[k], q = ell[k - 1], tx = p[0] - q[0], ty = p[1] - q[1], l = Math.hypot(tx, ty); return { p, n: [-ty / l, tx / l] }; };
  const m = FL.withOrnament(G.buildFrame({ ...G.DEFAULTS, filigree: 'scrolls', skeleton: 'oval', ornBottom: 'on', ornFlow: 'composed' }));
  const kp = m.ornament.flow.keypoints, L = m.ornament.flow.envelope.length - 1;
  const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  const eAt = (ss) => { if (ss <= kp[0].s) return kp[0].e; if (ss >= kp[kp.length - 1].s) return kp[kp.length - 1].e; let i = 0; while (i < kp.length - 2 && kp[i + 1].s < ss) i++; return kp[i].e + (kp[i + 1].e - kp[i].e) * smooth((ss - kp[i].s) / Math.max(1e-9, kp[i + 1].s - kp[i].s)); };
  const left = []; for (let ss = 0; ss <= L; ss += 1) { const { p, n } = atFrac(ss / L), e = eAt(ss); left.push([p[0] + n[0] * e * MPX, p[1] + n[1] * e * MPX]); }
  const env = [...left, ...left.slice().reverse().map(([x, y]) => [W - x, y])];
  const zone = new Uint8Array(W * H), frame = new Uint8Array(W * H);
  fillPoly(zone, W, H, 0, 0, 1, env);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (((i + 0.5 - C[0]) / A) ** 2 + ((j + 0.5 - C[1]) / B) ** 2 < 1) frame[j * W + i] = 1;
  const b = await chromium.launch(), pg = await b.newPage();
  const data = 'data:image/webp;base64,' + fs.readFileSync(path.join(refs, '2.webp')).toString('base64');
  const lum = await pg.evaluate(async ({ data, W, H }) => {
    const img = new Image(); img.src = data; await img.decode();
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, W, H);
    const d = cx.getImageData(0, 0, W, H).data, out = [];
    for (let k = 0; k < W * H; k++) out.push(Math.round(0.2126 * d[4 * k] + 0.7152 * d[4 * k + 1] + 0.0722 * d[4 * k + 2]));
    return out;
  }, { data, W, H });
  // Otsu over the zone's luminance
  const hist = new Array(256).fill(0); let nz = 0;
  for (let k = 0; k < W * H; k++) if (zone[k] && !frame[k]) { hist[lum[k]]++; nz++; }
  let sum = 0; for (let v = 0; v < 256; v++) sum += v * hist[v];
  let sB = 0, wB = 0, best = -1, thr = 0;
  for (let v = 0; v < 256; v++) { wB += hist[v]; if (!wB) continue; const wF = nz - wB; if (!wF) break; sB += v * hist[v]; const mB = sB / wB, mF = (sum - sB) / wF, bt = wB * wF * (mB - mF) ** 2; if (bt > best) { best = bt; thr = v; } }
  const bronze = (k) => lum[k] <= thr;
  let nf = 0; for (let k = 0; k < W * H; k++) if (zone[k] && !frame[k] && bronze(k)) nf++;
  let na = 0, nat = 0;
  for (let k = 0; k < N; k += 2) {
    const p = ell[k], q = ell[k + 1], tx = q[0] - p[0], ty = q[1] - p[1], l = Math.hypot(tx, ty), nn = [-ty / l, tx / l];
    for (const sg of [1, -1]) {
      const x = sg > 0 ? p[0] + nn[0] * PROBE * MPX : W - (p[0] + nn[0] * PROBE * MPX), y = p[1] + nn[1] * PROBE * MPX, i = Math.floor(x), j = Math.floor(y), ck = j * W + i;
      if (i < 0 || j < 0 || i >= W || j >= H || frame[ck] || !zone[ck]) continue;
      na++; if (bronze(ck)) nat++;
    }
  }
  if (debug) {
    const px = []; for (let k = 0; k < W * H; k++) px.push(zone[k] && !frame[k] ? (bronze(k) ? 1 : 2) : 0);
    await pg.setViewportSize({ width: W, height: H });
    await pg.setContent('<body style="margin:0"><canvas id=c width=600 height=800></canvas></body>');
    await pg.evaluate(async ({ data, px, W, H }) => {
      const img = new Image(); img.src = data; await img.decode();
      const cx = document.getElementById('c').getContext('2d'); cx.drawImage(img, 0, 0, W, H);
      const id = cx.getImageData(0, 0, W, H), d = id.data;
      for (let k = 0; k < W * H; k++) { if (px[k] === 1) { d[4 * k] = 200; d[4 * k + 1] = 60; d[4 * k + 2] = 40; } else if (px[k] === 2) { d[4 * k] = (d[4 * k] + 120) / 2; d[4 * k + 1] = (d[4 * k + 1] + 170) / 2; d[4 * k + 2] = 255; } }
      cx.putImageData(id, 0, 0);
    }, { data, px, W, H });
    await pg.screenshot({ path: debug });
  }
  await b.close();
  return { fill: nf / nz, attach: nat / na, threshold: thr, zonePx: nz, samples: na };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), arg = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const refs = arg('--refs'), modes = (arg('--modes') || 'composed').split(',');
  const G = await imp('frame-geometry.js'), FL = await imp('frame-filigree.js'), RL = await imp('frame-relief.js');
  const out = {};
  if (refs) { out.reference = await referenceCoverage(path.resolve(refs), arg('--debug')); console.log(`reference (2.webp): fill ${(100 * out.reference.fill).toFixed(1)} % of the zone (Otsu threshold ${out.reference.threshold}), attachment ${(100 * out.reference.attach).toFixed(1)} %`); }
  for (const sk of ['oval', 'rect', 'arch']) for (const mode of modes) {
    const env = FL.withOrnament(G.buildFrame({ ...G.DEFAULTS, filigree: 'scrolls', skeleton: sk, ...(sk === 'arch' ? {} : { ornBottom: 'on' }), ornFlow: 'composed' })).ornament;
    const m = FL.withOrnament(G.buildFrame({ ...G.DEFAULTS, filigree: 'scrolls', skeleton: sk, ...(sk === 'arch' ? {} : { ornBottom: 'on' }), ornFlow: mode }));
    const r = RL.buildRelief(m), c = await measureCoverage(m, r, env);
    out[`${sk}:${mode}`] = c;
    console.log(`${sk.padEnd(5)} ${mode.padEnd(9)} fill ${(100 * c.fill).toFixed(1)} % of ${c.zoneMm2.toFixed(0)} mm²   attachment ${(100 * c.attach).toFixed(1)} %`);
  }
  if (args.includes('--json')) console.log(JSON.stringify(out));
}
