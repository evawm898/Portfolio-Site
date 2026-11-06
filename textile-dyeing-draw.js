// textile-dyeing-draw.js — DYED yarns and swatches in /textile-basics.js's stroke language.
// pieceMarkup() there draws every fibre in INK (the teal one in ACCENT); this is the same piece —
// fibreSlice + splitRuns + runsMarkup on a background band — with the fibre colour a parameter,
// plus fibre KINDS so two fibres in one fabric differ by pattern, never by colour alone:
//   staple    — cotton: short crimped fibres, twisted (DRAW's own material)
//   filament  — polyester: continuous, near-straight filaments
//   textured  — nylon: continuous filaments with a strong crimp
import { DRAW, VIEW } from './textile-basics.js';
const { INK, BG, SW, HALO, BACK, EDGE, SEED, TAU, rng, f1, poly, runsMarkup, splitRuns, makeFibre,
  lineSeg, centreline, fibreSlice, bandPath, yarnFibres } = DRAW;

export const KIND = {
  staple:   { crimpK: 0.22 },
  filament: { crimpK: 1, n: 26, camp: 0.12, wave: 40 },
  textured: { crimpK: 1, n: 24, camp: 1.9, wave: 11 },
};
// o.n (filament count) and o.density (staple, a share of DRAW's own density) thin a yarn out for
// the small yarns the dyeing scenes draw (a skein loop, a warp sheet), where DRAW's density reads as
// a solid band
export function fibresFor(kind, seed, S, o = {}) {
  if (kind === 'staple') {
    if (!o.density) return yarnFibres(seed, S + 20, -20);
    const r = rng(seed), out = [], n = Math.round((S + 40) / 276 * 74 * o.density);
    for (let i = 0; i < n; i++) { const f = makeFibre(r, i, false); f.c = -20 + (i + r()) / n * (S + 40); f.sgn = 1; out.push(f); }
    return out;
  }
  const K = KIND[kind], r = rng(seed), out = [], n = o.n || K.n;
  for (let i = 0; i < n; i++) {
    const f = makeFibre(r, i, false);
    f.len = S + 200; f.c = S / 2; f.sgn = 1;
    f.camp = K.camp * (0.7 + 0.6 * r()); f.waves = f.len / (K.wave * (0.85 + 0.3 * r()));
    out.push(f);
  }
  return out;
}
// one piece of a dyed yarn between arc lengths s0..s1
export function dyedPiece(yarn, s0, s1) {
  const runs = [];
  for (const f of yarn.fibres) {
    const pts = fibreSlice(f, s0 + yarn.sOff, s1 + yarn.sOff, yarn.line, yarn.sOff, yarn.R, KIND[yarn.kind].crimpK);
    if (pts) splitRuns(pts, yarn.color, yarn.front, yarn.back, runs);
  }
  for (const sg of [-1, 1]) {
    const n = Math.max(2, Math.ceil((s1 - s0) / 3)), pts = [];
    for (let j = 0; j <= n; j++) { const p = yarn.line.at(s0 + (s1 - s0) * j / n), w = sg * (yarn.R + 0.6); pts.push({ x: p.x + p.ty * w, y: p.y - p.tx * w, d: 0 }); }
    runs.push({ pts, depth: 0, color: yarn.color, op: EDGE });
  }
  return `<path d="${bandPath(yarn.line, s0, s1, yarn.R + 2)}" fill="${BG}" stroke="none"/>` + runsMarkup(runs);
}
export const yarnOn = (line, kind, color, seed, R, o = {}) => ({ line, sOff: 0, R, kind, color, seed, fibres: fibresFor(kind, seed, line.length, o), front: 1, back: BACK, edge: EDGE });

// a plain weave close-up: warp (vertical) and weft (horizontal) each its own fibre kind + colour
export function dyedWeave({ warp, weft, cols = 6, rows = 5, pitch = 52, rowPitch = 44, R = 18, cx = VIEW.w / 2, cy = VIEW.h / 2, ext = 60 }) {
  const w = (cols - 1) * pitch, h = (rows - 1) * rowPitch, x0 = cx - w / 2, y0 = cy - h / 2;
  const layers = ['', '', ''];
  for (let k = 0; k < rows; k++) {
    const y = y0 + k * rowPitch, line = centreline([lineSeg(x0 - ext, y, x0 + w + ext, y)]);
    const yarn = yarnOn(line, weft.kind, weft.color, SEED + 301 + k, R, weft);
    for (let i = -1; i <= cols; i++) {
      const s0 = i < 0 ? 0 : ext + (i - 0.5) * pitch, s1 = i === cols ? line.length : ext + (i + 0.5) * pitch;
      layers[i < 0 || i === cols ? 0 : ((i + k) % 2 === 0 ? 2 : 1)] += dyedPiece(yarn, s0, s1);
    }
  }
  for (let i = 0; i < cols; i++) {
    const x = x0 + i * pitch, line = centreline([lineSeg(x, y0 + h + ext, x, y0 - ext)]);
    const yarn = yarnOn(line, warp.kind, warp.color, SEED + 401 + i, R, warp);
    for (let k = -1; k <= rows; k++) {
      const yTop = k < 0 ? y0 - ext : y0 + (k - 0.5) * rowPitch, yBot = k === rows ? y0 + h + ext : y0 + (k + 0.5) * rowPitch;
      const s0 = (y0 + h + ext) - Math.min(yBot, y0 + h + ext), s1 = (y0 + h + ext) - Math.max(yTop, y0 - ext);
      layers[k < 0 || k === rows ? 0 : ((i + k) % 2 === 0 ? 1 : 2)] += dyedPiece(yarn, s0, s1);
    }
  }
  return `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${layers.join('')}</g>`;
}

// dye molecules: shape carries the class (never colour alone)
export function glyph(cls, x, y, color, s = 1) {
  if (cls === 'disperse') return `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(2.4 * s)}" fill="${color}"/>`;
  if (cls === 'acid') return `<path d="M${f1(x)},${f1(y - 3.4 * s)}L${f1(x + 3.4 * s)},${f1(y)}L${f1(x)},${f1(y + 3.4 * s)}L${f1(x - 3.4 * s)},${f1(y)}Z" fill="${color}"/><path d="M${f1(x - 1.7 * s)},${f1(y)}H${f1(x + 1.7 * s)}" stroke="${BG}" stroke-width="1.1"/>`;
  if (cls === 'reactive') return `<path d="M${f1(x - 3.2 * s)},${f1(y + 2.4 * s)}L${f1(x)},${f1(y - 2.6 * s)}L${f1(x + 3.2 * s)},${f1(y + 2.4 * s)}" stroke="${color}" stroke-width="${f1(1.6 * s)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  return '';
}
const BEAN = 'M26 10C32 10 38 14 38 22C38 26 34 26 36 32C38 38 32 42 26 42C20 42 14 40 14 32C14 26 18 26 16 20C14 14 20 10 26 10Z';
// a dye-class tile, viewBox 0 50 320 120 (the page's 3-up strip): a dyed yarn and its fibre's cross-section
// filled with that dye's molecules
export function dyeTile(cls, kind, color) {
  const line = centreline([lineSeg(-20, 110, 210, 110)]);
  const yarn = yarnOn(line, kind, color, SEED + 501 + cls.length, 18);
  let s = `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${dyedPiece(yarn, 0, line.length)}</g>`;
  const cx = 262, cy = 110, r = 36, rr = rng(SEED + 7 + cls.length);
  // the fibre's own cross-section shape (section 03's round / irregular), molecules clipped to it
  const shapeEl = kind === 'staple'
    ? `<path transform="translate(${cx - 26 * 2.6},${cy - 26 * 2.6}) scale(2.6)" d="${BEAN}"/>`
    : `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
  const outline = kind === 'staple'
    ? `<path transform="translate(${cx - 26 * 2.6},${cy - 26 * 2.6}) scale(2.6)" d="${BEAN}" fill="none" stroke="${INK}" stroke-width="${SW}" vector-effect="non-scaling-stroke"/>`
    : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${INK}" stroke-width="${SW}"${kind === 'textured' ? ' stroke-dasharray="4 2.5"' : ''}/>`;
  const cid = `dyeclip-${cls}-${kind}`;
  s += `<defs><clipPath id="${cid}">${shapeEl}</clipPath></defs>`;
  let mol = '';
  const step = 9.5, R0 = 46;
  for (let gx = -R0; gx <= R0; gx += step) for (let gy = -R0; gy <= R0; gy += step) {
    const x = gx + (rr() - 0.5) * 4, y = gy + (rr() - 0.5) * 4;
    mol += glyph(cls, cx + x, cy + y, color, 1);
  }
  // inset the molecules from the outline: clip to the shape, then draw a BG stroke over the rim
  s += `<g clip-path="url(#${cid})">${mol}</g>`;
  s += outline.replace(`stroke="${INK}" stroke-width="${SW}"`, `stroke="${BG}" stroke-width="10"`).replace(' stroke-dasharray="4 2.5"', '') + outline;
  return s;
}
