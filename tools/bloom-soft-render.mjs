/* ===================================================================
   bloom-soft-render.mjs — A SOFTWARE RASTERISER FOR SCRATCH MESHES.
   AN INSTRUMENT, NOT WIRED TO ANY GATE, and not a substitute for the page's own
   renderer. Orthographic camera, z-buffer, flat Lambert shading from two lights,
   2x supersampling, PNG out through node:zlib. It exists so a prototype built in
   Node (a mesh that never reaches `bloom.html`) can be looked at without a browser,
   a CDN or three.js — and so a render sheet made from it is DETERMINISTIC: the same
   triangles give the same bytes, so no same-tree pixel control is owed and none is
   claimed. It draws positions only; it knows nothing about the bloom.
     import { render, writePng } from './bloom-soft-render.mjs'
   =================================================================== */
import zlib from 'node:zlib';
import fs from 'node:fs';
const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'ascii'), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
export function writePng(path, w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy ? rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3) : raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (w * 3 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
  fs.writeFileSync(path, png);
}
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/* positions: Float64Array/array of xyz triples, 9 per triangle. camera: { eye: dir (from target toward camera), up, center, halfHeight(mm) }.
   colour: [r,g,b] base. Returns rgb Buffer w*h*3. */
export function render(positions, w, h, cam, opts = {}) {
  const ss = opts.supersample || 2; const W = w * ss, H = h * ss;
  const bg = opts.bg || [24, 24, 28]; const base = opts.color || [214, 206, 190];
  const fwd = norm(cam.dir.map((c) => -c));            // looking along -dir
  let right = norm(cross(fwd, cam.up)); const up = norm(cross(right, fwd));
  const c = cam.center; const scale = (H / 2) / cam.halfHeight;
  const L1 = norm(opts.light1 || [0.4, -0.5, 0.75]); const L2 = norm(opts.light2 || [-0.6, 0.3, 0.2]);
  const zbuf = new Float32Array(W * H).fill(-Infinity); const col = new Float32Array(W * H * 3);
  for (let i = 0; i < W * H; i++) { col[i * 3] = bg[0]; col[i * 3 + 1] = bg[1]; col[i * 3 + 2] = bg[2]; }
  const proj = (p) => { const d = [p[0] - c[0], p[1] - c[1], p[2] - c[2]]; return [W / 2 + dot(d, right) * scale, H / 2 - dot(d, up) * scale, -dot(d, fwd)]; };   // z grows TOWARD the camera; the buffer keeps the nearest
  const nTri = positions.length / 9;
  for (let t = 0; t < nTri; t++) {
    const A = [positions[t * 9], positions[t * 9 + 1], positions[t * 9 + 2]], B = [positions[t * 9 + 3], positions[t * 9 + 4], positions[t * 9 + 5]], C = [positions[t * 9 + 6], positions[t * 9 + 7], positions[t * 9 + 8]];
    let n = norm(cross([B[0] - A[0], B[1] - A[1], B[2] - A[2]], [C[0] - A[0], C[1] - A[1], C[2] - A[2]]));
    if (dot(n, fwd) > 0) n = [-n[0], -n[1], -n[2]];   // two-sided: shade the face toward the camera
    const shade = 0.22 + 0.62 * Math.max(0, dot(n, L1)) + 0.28 * Math.max(0, dot(n, L2));
    const tint = opts.tint ? opts.tint(t) : 1;
    const r = Math.min(255, base[0] * shade * tint), g = Math.min(255, base[1] * shade * tint), b = Math.min(255, base[2] * shade * tint);
    const a = proj(A), bq = proj(B), cq = proj(C);
    const minX = Math.max(0, Math.floor(Math.min(a[0], bq[0], cq[0]))), maxX = Math.min(W - 1, Math.ceil(Math.max(a[0], bq[0], cq[0])));
    const minY = Math.max(0, Math.floor(Math.min(a[1], bq[1], cq[1]))), maxY = Math.min(H - 1, Math.ceil(Math.max(a[1], bq[1], cq[1])));
    const det = (bq[0] - a[0]) * (cq[1] - a[1]) - (cq[0] - a[0]) * (bq[1] - a[1]); if (Math.abs(det) < 1e-12) continue;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5;
      const l1 = ((bq[0] - px) * (cq[1] - py) - (cq[0] - px) * (bq[1] - py)) / det;
      const l2 = ((cq[0] - px) * (a[1] - py) - (a[0] - px) * (cq[1] - py)) / det;
      const l3 = 1 - l1 - l2; if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
      const z = l1 * a[2] + l2 * bq[2] + l3 * cq[2]; const idx = y * W + x;
      if (z > zbuf[idx]) { zbuf[idx] = z; col[idx * 3] = r; col[idx * 3 + 1] = g; col[idx * 3 + 2] = b; }
    }
  }
  const out = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let k = 0; k < 3; k++) { let s = 0; for (let dy = 0; dy < ss; dy++) for (let dx = 0; dx < ss; dx++) s += col[((y * ss + dy) * W + (x * ss + dx)) * 3 + k]; out[(y * w + x) * 3 + k] = Math.round(s / (ss * ss)); }
  return out;
}
