/* ===================================================================
   pngdec.mjs — minimal PNG decoder for audit tooling.

   Decodes exactly what Playwright's page.screenshot() writes: non-interlaced,
   8-bit-depth PNG, color type 2 (RGB) or 6 (RGBA). Not a general-purpose PNG
   reader (no palette, no 16-bit, no interlacing) — kept intentionally small so
   a visual-diff harness has zero non-repo dependencies. Uses Node's built-in
   zlib for the DEFLATE stream; everything else (chunk walk, defilter) is ~40
   lines of the PNG spec's unfilter step.
   =================================================================== */
import zlib from 'node:zlib';

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function decodePNG(buf) {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error('not a PNG');
  let off = 8, width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      bitDepth = data.readUInt8(8); colorType = data.readUInt8(9);
      if (bitDepth !== 8) throw new Error(`unsupported bit depth ${bitDepth}`);
      if (colorType !== 2 && colorType !== 6) throw new Error(`unsupported color type ${colorType}`);
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    off += 8 + len + 4;   // length + type + data + CRC
  }
  const channels = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(width * height * 4, 255);   // always emit RGBA
  let rOff = 0, prevRow = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[rOff]; rOff += 1;
    const row = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const rawByte = raw[rOff + x];
      const a = x >= channels ? row[x - channels] : 0;
      const b = prevRow[x];
      const c = x >= channels ? prevRow[x - channels] : 0;
      let pred;
      if (filter === 0) pred = 0;
      else if (filter === 1) pred = a;
      else if (filter === 2) pred = b;
      else if (filter === 3) pred = (a + b) >> 1;
      else if (filter === 4) {   // Paeth
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        pred = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      } else throw new Error(`bad filter type ${filter}`);
      row[x] = (rawByte + pred) & 0xff;
    }
    rOff += stride;
    for (let x = 0; x < width; x++) {
      const si = x * channels, di = (y * width + x) * 4;
      out[di] = row[si]; out[di + 1] = row[si + 1]; out[di + 2] = row[si + 2];
      out[di + 3] = channels === 4 ? row[si + 3] : 255;
    }
    prevRow = row;
  }
  return { width, height, data: out };   // data: RGBA Buffer, length width*height*4
}
