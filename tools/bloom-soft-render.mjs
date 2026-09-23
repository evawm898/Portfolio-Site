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

/* ---------------- LABELS ----------------
   ONE OWNER of the 5x7 bitmap font and the blitter, because two sheet tools want to
   label a composite and a picture that needs its caption to say which half is which is
   half a picture. They were `shot-bloom-conform.mjs`'s; moving them here changed nothing
   about what they do (that tool's committed image reproduces byte-identically) and means
   the next tool that wants a label does not carry a third copy. */
/* a 5x7 font, enough for the labels */
export const FONT = {
  A: '01110100011000111111100011000110001', B: '11110100011000111110100011000111110', C: '01110100011000010000100001000101110',
  D: '11110100011000110001100011000111110', E: '11111100001000011110100001000011111', F: '11111100001000011110100001000010000',
  G: '01110100011000010111100011000101111', H: '10001100011000111111100011000110001', I: '11111001000010000100001000010011111',
  L: '10000100001000010000100001000011111', M: '10001110111010110001100011000110001', N: '10001110011010110011100011000110001',
  O: '01110100011000110001100011000101110', P: '11110100011000111110100001000010000', R: '11110100011000111110101001001010001',
  S: '01111100001000001110000011000101110', T: '11111001000010000100001000010000100', U: '10001100011000110001100011000101110',
  V: '10001100011000110001100010101000100', W: '10001100011000110001101011101110001', X: '10001100010101000100010101000110001',
  Y: '10001100010101000100001000010000100', Z: '11111000010001000100010001000011111',
  /* J, K and Q were missing and it showed: the infill composite's own label read
     "WALL AS ED 1 MM". Added here rather than worked around in a caption. */
  J: '00111000100001000010000101001001100', K: '10001100101010011000101001001010001', Q: '01110100011000110001101011001001101',
  '0': '01110100011001110101110011000101110', '1': '00100011000010000100001000010001110', '2': '01110100010000100010001000100011111',
  '3': '11111000100010000010000011000101110', '4': '00010001100101010010111110001000010', '5': '11111100001111000001000011000101110',
  '6': '00110010001000011110100011000101110', '7': '11111000010001000100010000100001000', '8': '01110100011000101110100011000101110',
  '9': '01110100011000101111000010001001100',
  ' ': '00000000000000000000000000000000000', '-': '00000000000000011111000000000000000', '.': '00000000000000000000000000110001100',
  ':': '00000001100011000000001100011000000', '/': '00001000010001000100010001000010000', '%': '11001110010001000100010001001100111',
  '(': '00010001000100001000010000100000010', ')': '01000001000001000010000100010001000', ',': '00000000000000000000000001100001000',
  '+': '00000001000010011111001000010000000', '=': '00000000001111100000111110000000000', '<': '00010001000100010000010000010000010',
};
export function text(rgb, w, h, x0, y0, str, col = [250, 250, 248], sc = 2) {
  for (let i = 0; i < str.length; i++) {
    const g = FONT[str[i].toUpperCase()]; if (!g) continue;
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) {
      if (g[r * 5 + c] !== '1') continue;
      for (let dy = 0; dy < sc; dy++) for (let dx = 0; dx < sc; dx++) {
        const x = x0 + (i * 6 + c) * sc + dx, y = y0 + r * sc + dy;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const o = (y * w + x) * 3; rgb[o] = col[0]; rgb[o + 1] = col[1]; rgb[o + 2] = col[2];
      }
    }
  }
}
export function blit(dst, dw, dh, src, sw, sh, ox, oy) {
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const X = ox + x, Y = oy + y; if (X < 0 || Y < 0 || X >= dw || Y >= dh) continue;
    const s = (y * sw + x) * 3, d = (Y * dw + X) * 3;
    dst[d] = src[s]; dst[d + 1] = src[s + 1]; dst[d + 2] = src[s + 2];
  }
}

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
