// gen-knit-diagram.mjs — generates the static SVG for #weft-warp-knit on /textile-101.html.
//
//   node tools/knit-diagram/gen-knit-diagram.mjs          # rewrites the markup between the
//                                                          # <!-- knit-diagram:start/end --> markers
//   node tools/knit-diagram/gen-knit-diagram.mjs --print  # prints it instead
//
// The page carries no runtime JS for this: the generator runs once, here, and the output is
// committed. Both panels are built from knit-loops.js — one continuous strand per yarn with a
// depth per point — and rendered as continuous <path>s each wearing a <mask> that cuts a
// halo-wide notch wherever a strand with higher depth crosses it (the ruling: option C).
// Every strand carries pathLength="900" so the page's existing .yarn-path dash animation and
// its prefers-reduced-motion rule apply unchanged.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { weftCourse, tricotYarn, toPath, crossings, slice } from './knit-loops.js';

const PANEL = { w: 460, h: 300 };
const SW = 7, HALO = 2;                    // yarn width; background gap each side of a front strand
const INK = 'var(--ink)', DIM = 'var(--ink-dim)', ACCENT = 'var(--petrol-bright)';

function notch(pts, s, halfLen) {
  const i = Math.max(0, Math.min(pts.length - 2, Math.floor(s)));
  const seg = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y) || 1;
  return toPath(slice(pts, s - halfLen / seg, s + halfLen / seg));
}

// strands -> { defs, paths } with per-strand occlusion masks
function masked(strands, id, color) {
  const X = crossings(strands);
  let defs = '', paths = '';
  strands.forEach((pts, i) => {
    const bites = X.filter(x => (x.a === i && x.front === 'b') || (x.b === i && x.front === 'a')).map(x => {
      const F = x.front === 'a' ? x.a : x.b, s = x.front === 'a' ? x.ia + x.ta : x.ib + x.tb;
      return `<path d="${notch(strands[F], s, SW / 2 + HALO)}" stroke-width="${SW + 2 * HALO}"/>`;
    }).join('');
    defs += `<mask id="${id}-m${i}" maskUnits="userSpaceOnUse" x="0" y="0" width="${PANEL.w}" height="${PANEL.h}"><rect width="${PANEL.w}" height="${PANEL.h}" fill="#fff"/><g fill="none" stroke="#000" stroke-linecap="round">${bites}</g></mask>`;
    const delay = i ? ` delay${Math.min(i, 4)}` : '';
    paths += `\n          <path class="yarn-path${delay}" pathLength="900" d="${toPath(pts)}" stroke="${color(i)}" mask="url(#${id}-m${i})"/>`;
  });
  return { defs, paths, crossings: X.length };
}

// ---- weft: four courses, six wales, accent on the third course ------------------------
const WEFT = { x0: 76, W: 62, H: 52, n: 6, courses: 4, top: 60 };
WEFT.L = 1.75 * WEFT.H;
const weft = masked(
  Array.from({ length: WEFT.courses }, (_, c) => weftCourse({ x0: WEFT.x0, cy: WEFT.top + c * WEFT.H + 36, W: WEFT.W, L: WEFT.L, n: WEFT.n })),
  'kw', i => i === 2 ? ACCENT : (i === 0 ? INK : DIM));

// ---- warp: open-lap tricot over four wales; the two edge yarns fade out at the sides ----
const WARP = { x0: 100, W: 70, H: 48, y0: 232, courses: 4, wales: 4 };
WARP.L = 1.42 * WARP.H;           // top heads at y≈54, bottom feet at y≈266: inside the fade rect, clear of the title
const warp = masked(
  Array.from({ length: WARP.wales + 1 }, (_, k) => tricotYarn({ x0: WARP.x0, y0: WARP.y0, W: WARP.W, H: WARP.H, L: WARP.L, courses: WARP.courses, w0: k - 1, span: 0.7 })),
  'kp', i => i === 2 ? ACCENT : DIM);

const labels = (title) => `
          <text x="24" y="26" class="axis-label">WALE &uarr;</text>
          <text x="${PANEL.w - 24}" y="26" class="axis-label" text-anchor="end">COURSE &rarr;</text>
          <text x="${PANEL.w / 2}" y="290" text-anchor="middle" class="axis-label" style="fill: var(--ink); letter-spacing: 0.12em;">${title}</text>`;

const svg = (id, body, defs, fade) => `
        <div class="tx-panel"><svg viewBox="0 0 ${PANEL.w} ${PANEL.h}" xmlns="http://www.w3.org/2000/svg" aria-labelledby="${id}-t" role="img">
          <title id="${id}-t">${id === 'kw' ? 'Weft knitting: one yarn forms a course of interlocking loops' : 'Warp knitting: each yarn laps between two neighbouring wales'}</title>
          <defs>${fade}${defs}</defs>${labels(id === 'kw' ? 'WEFT KNITTING' : 'WARP KNITTING')}
          <g fill="none" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round" mask="url(#${id}-fade)">${body}
          </g>
        </svg></div>`;

// the swatch reads as continuing fabric: the weft fades at the top and bottom, the warp at the sides
const fadeV = `<linearGradient id="kw-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset="0.16" stop-color="#fff"/><stop offset="0.86" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient><mask id="kw-fade" maskUnits="userSpaceOnUse" x="0" y="0" width="${PANEL.w}" height="${PANEL.h}"><rect y="40" width="${PANEL.w}" height="230" fill="url(#kw-g)"/></mask>`;
const fadeH = `<linearGradient id="kp-g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000"/><stop offset="0.14" stop-color="#fff"/><stop offset="0.86" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient><mask id="kp-fade" maskUnits="userSpaceOnUse" x="0" y="0" width="${PANEL.w}" height="${PANEL.h}"><rect x="${WARP.x0 - WARP.W * 0.65}" y="40" width="${WARP.W * (WARP.wales - 1) + WARP.W * 1.3}" height="230" fill="url(#kp-g)"/></mask>`;

const markup = `<!-- knit-diagram:start — generated by tools/knit-diagram/gen-knit-diagram.mjs; do not hand-edit -->
      <div class="tx-diagram__panels">${svg('kw', weft.paths, weft.defs, fadeV)}${svg('kp', warp.paths, warp.defs, fadeH)}
      </div>
      <!-- knit-diagram:end -->`;

if (process.argv.includes('--print')) { console.log(markup); process.exit(0); }
const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../textile-101.html');
const html = fs.readFileSync(file, 'utf8');
const re = /<!-- knit-diagram:start[\s\S]*?<!-- knit-diagram:end -->/;
if (!re.test(html)) { console.error('markers not found in textile-101.html'); process.exit(1); }
fs.writeFileSync(file, html.replace(re, () => markup));
console.log(`wrote ${file}: weft ${weft.crossings} crossings, warp ${warp.crossings} crossings, ${markup.length} chars`);
