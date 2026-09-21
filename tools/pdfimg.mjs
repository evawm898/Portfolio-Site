/* ===================================================================
   pdfimg.mjs — pull the embedded page images back out of a jsPDF file.

   WHY: /cards exports 52 PDF pages, one full-bleed card image per page. The
   only way to answer "did the exported PDF actually use the selected font, or
   did it fall back?" is to look at the pixels the PDF carries — a passing
   preview says nothing about a file that was assembled from a different set
   of canvases. This walks the PDF's image XObjects and inflates them back to
   an RGBA raster the caller can measure.

   SCOPE: exactly what jsPDF 2.5.1 writes for addImage(<png data url>, 'PNG')
   — an 8-bit image XObject, FlateDecode, DeviceRGB or DeviceGray, optionally
   with a PNG predictor in /DecodeParms. Not a general PDF reader: no
   encryption, no DCT/JPX, no object streams (jsPDF writes none of those).
   =================================================================== */
import zlib from 'node:zlib';

// PDF names/numbers inside a dictionary, without a full tokenizer — the
// dictionaries jsPDF emits for an image XObject are flat and one line each.
function dictNumber(dict, key) {
  const m = dict.match(new RegExp(`/${key}\\s+(\\d+)`));
  return m ? Number(m[1]) : null;
}
function dictName(dict, key) {
  const m = dict.match(new RegExp(`/${key}\\s*/([A-Za-z0-9]+)`));
  return m ? m[1] : null;
}

// Undo the per-row PNG filters a /Predictor 15 stream carries.
function unpredict(raw, columns, colors, bpc) {
  const bpp = Math.max(1, (colors * bpc) / 8);
  const stride = Math.ceil((columns * colors * bpc) / 8);
  const rows = Math.floor(raw.length / (stride + 1));
  const out = Buffer.alloc(rows * stride);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < rows; y++) {
    const ft = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v = src[x];
      if (ft === 1) v += a;
      else if (ft === 2) v += b;
      else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[x] = v & 0xff;
    }
    prev = cur;
  }
  return out;
}

// Returns [{ width, height, colorSpace, rgba }] for every inflatable image
// XObject in the file, in the order they appear.
export function extractPdfImages(buf) {
  const bytes = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  const text = bytes.toString('latin1');
  const images = [];

  const objRe = /(\d+)\s+(\d+)\s+obj\b/g;
  let m;
  while ((m = objRe.exec(text)) !== null) {
    const start = m.index + m[0].length;

    // The object's own dictionary ends at whichever comes first: its "stream"
    // keyword or its "endobj". Searching for "stream" alone would, for any
    // object that has none, run forward into a LATER object's dictionary and
    // happily read that one's /Subtype and /Width — which produces plausible
    // extra "images" whose pixels are nonsense. (Measured: 119 objects and 67
    // apparent 825x1125 cards from a 52-card export, before this bound.)
    const streamAt = text.indexOf('stream', start);
    const endObjAt = text.indexOf('endobj', start);
    if (streamAt < 0) continue;
    if (endObjAt >= 0 && endObjAt < streamAt) continue; // no stream in this object
    const dict = text.slice(start, streamAt);
    if (!/\/Subtype\s*\/Image/.test(dict)) continue;

    const width = dictNumber(dict, 'Width');
    const height = dictNumber(dict, 'Height');
    const bpc = dictNumber(dict, 'BitsPerComponent') || 8;
    const colorSpace = dictName(dict, 'ColorSpace') || 'DeviceRGB';
    if (!width || !height || bpc !== 8) continue;
    if (!/\/FlateDecode/.test(dict)) continue; // DCT/JPX are out of scope

    // "stream" is followed by CRLF or LF, then the bytes, then "endstream".
    // /Length is deliberately NOT trusted: jsPDF may write it as an indirect
    // reference ("/Length 12 0 R"), which a flat number match would read as
    // the byte count 12 and silently truncate the image.
    let dataStart = streamAt + 'stream'.length;
    if (bytes[dataStart] === 0x0d) dataStart++;
    if (bytes[dataStart] === 0x0a) dataStart++;
    const endAt = text.indexOf('endstream', dataStart);
    if (endAt < 0) continue;
    let dataEnd = endAt;
    if (bytes[dataEnd - 1] === 0x0a) dataEnd--;
    if (bytes[dataEnd - 1] === 0x0d) dataEnd--;
    const stream = bytes.subarray(dataStart, dataEnd);

    let raw;
    try {
      raw = zlib.inflateSync(stream);
    } catch {
      try { raw = zlib.inflateRawSync(stream); } catch { continue; }
    }

    const colors = colorSpace === 'DeviceGray' ? 1 : 3;
    const predictor = dictNumber(dict, 'Predictor');
    const predicted = Boolean(predictor && predictor >= 10);
    // Size check as a parse guard: a correctly identified image inflates to
    // exactly its raster (plus one filter byte per row when predicted).
    // Anything else was not the object it claimed to be.
    const expect = width * height * colors + (predicted ? height : 0);
    if (raw.length !== expect) continue;
    if (predicted) raw = unpredict(raw, width, colors, bpc);

    const rgba = Buffer.alloc(width * height * 4, 255);
    for (let i = 0, n = width * height; i < n; i++) {
      if (colors === 1) {
        const g = raw[i];
        rgba[i * 4] = g; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = g;
      } else {
        rgba[i * 4] = raw[i * 3];
        rgba[i * 4 + 1] = raw[i * 3 + 1];
        rgba[i * 4 + 2] = raw[i * 3 + 2];
      }
    }
    images.push({ width, height, colorSpace, rgba, objNum: Number(m[1]) });
  }
  return images;
}

// How many pages the document declares — a cheap sanity check that the export
// really produced 52 of them.
export function pdfPageCount(buf) {
  const text = (Buffer.isBuffer(buf) ? buf : Buffer.from(buf)).toString('latin1');
  const counts = [...text.matchAll(/\/Type\s*\/Pages[\s\S]{0,400}?\/Count\s+(\d+)/g)].map((x) => Number(x[1]));
  if (counts.length) return Math.max(...counts);
  return (text.match(/\/Type\s*\/Page[^s]/g) || []).length;
}
