/* weave-render.js — draws a draft. ONE painting routine, TWO painters: the
   canvas on the page and the SVG export go through the same paint() over the
   same layout(), so the file is the picture on screen rather than a second
   drawing of it. Pure: no DOM (the canvas painter is handed a 2d context).

   ORIENTATION, decided here and nowhere else (the model is index-only):
     end 1 at the RIGHT of the threading and drawdown, beside the tie-up;
     pick 1 at the TOP of the treadling and drawdown, beside the tie-up;
     shaft 1 at the BOTTOM of the threading and tie-up, beside the drawdown;
     treadle 1 at the LEFT of the tie-up and treadling, beside the drawdown.
   That is the handweaving draft read "from the tie-up outward", and it is what
   WIF-based draft software draws by default.

   FABRIC VIEW: the drawdown as yarn. Every warp end and every weft pick is a
   continuous shaded bar underneath; on top, each float — a run of cells where
   one thread is over the other — is drawn as a rounded, shaded segment that
   runs from the far edge of the crossing thread before it to the near edge of
   the one after. `yarn` is the thread's width as a fraction of the cell; what
   is left is the gap the under-thread shows through. */

import { PALETTE, expandStripes } from './weave-draft.js';

/* ------------------------------------------------------------------ layout */

export function layout(s) {
  const cell = s.view.cell;
  const gap = Math.max(6, Math.round(cell * 0.7));
  const pad = 10;
  const draft = s.view.mode !== 'drawdown';
  const labels = draft && cell >= 11;
  const labelW = labels ? Math.round(cell * 1.6) : 0;
  const bar = Math.max(4, Math.round(cell * 0.7));
  const x0 = pad + labelW;
  const y0 = pad;
  const blocks = {};
  let y = y0;
  blocks.warpBar = { x: x0, y, cols: s.ends, rows: 1, w: s.ends * cell, h: bar };
  y += bar + gap;
  if (draft) {
    blocks.threading = { x: x0, y, cols: s.ends, rows: s.shafts, w: s.ends * cell, h: s.shafts * cell };
    blocks.tieup = { x: x0 + s.ends * cell + gap, y, cols: s.treadles, rows: s.shafts, w: s.treadles * cell, h: s.shafts * cell };
    y += s.shafts * cell + gap;
  }
  blocks.drawdown = { x: x0, y, cols: s.ends, rows: s.picks, w: s.ends * cell, h: s.picks * cell };
  let xr = x0 + s.ends * cell + gap;
  if (draft) {
    blocks.treadling = { x: xr, y, cols: s.treadles, rows: s.picks, w: s.treadles * cell, h: s.picks * cell };
    xr += s.treadles * cell + gap;
  }
  blocks.weftBar = { x: xr, y, cols: 1, rows: s.picks, w: bar, h: s.picks * cell };
  const width = xr + bar + pad;
  const height = y + s.picks * cell + pad;
  return { cell, gap, pad, labelW, labels, bar, width, height, blocks, draft,
    ends: s.ends, picks: s.picks, shafts: s.shafts, treadles: s.treadles };
}

/* index <-> grid position. The ONE statement of the orientation above. */
const endOfCol = (L, c) => L.ends - 1 - c;
const colOfEnd = (L, e) => L.ends - 1 - e;
const shaftOfRow = (L, r) => L.shafts - 1 - r;
const rowOfShaft = (L, sh) => L.shafts - 1 - sh;

/* Which cell of which block is under (x, y) in layout px, or null. */
export function hitTest(L, x, y) {
  for (const [name, b] of Object.entries(L.blocks)) {
    if (!b || x < b.x || y < b.y || x >= b.x + b.w || y >= b.y + b.h) continue;
    const col = Math.floor((x - b.x) / L.cell), row = Math.floor((y - b.y) / L.cell);
    const hit = { block: name, col, row };
    if (name === 'threading') { hit.end = endOfCol(L, col); hit.shaft = shaftOfRow(L, row); }
    else if (name === 'tieup') { hit.treadle = col; hit.shaft = shaftOfRow(L, row); }
    else if (name === 'treadling') { hit.treadle = col; hit.pick = row; }
    else if (name === 'drawdown') { hit.end = endOfCol(L, col); hit.pick = row; }
    else if (name === 'warpBar') { hit.end = endOfCol(L, col); }
    else if (name === 'weftBar') { hit.pick = row; }
    return hit;
  }
  return null;
}

/* The centre of a cell named by its indices — what a test aims a pointer at. */
export function cellCentre(L, block, idx) {
  const b = L.blocks[block];
  if (!b) return null;
  let col = 0, row = 0;
  if (block === 'threading') { col = colOfEnd(L, idx.end); row = rowOfShaft(L, idx.shaft); }
  else if (block === 'tieup') { col = idx.treadle; row = rowOfShaft(L, idx.shaft); }
  else if (block === 'treadling') { col = idx.treadle; row = idx.pick; }
  else if (block === 'drawdown') { col = colOfEnd(L, idx.end); row = idx.pick; }
  return { x: b.x + (col + 0.5) * L.cell, y: b.y + (row + 0.5) * L.cell };
}

/* ------------------------------------------------------------------ colour */

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
/* amt > 0 mixes toward white, < 0 toward black. */
export function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const t = amt > 0 ? 255 : 0, k = Math.abs(amt);
  return toHex(r + (t - r) * k, g + (t - g) * k, b + (t - b) * k);
}
/* The yarn's cross-section: dark edge, a highlight a third of the way across,
   dark edge. Stops are shared by both painters so the file matches the screen. */
export function yarnStops(color) {
  return [[0, shade(color, -0.45)], [0.3, shade(color, 0.06)], [0.5, shade(color, 0.26)], [0.74, color], [1, shade(color, -0.5)]];
}

/* ---------------------------------------------------------------- painters
   rect(x, y, w, h, fill, cls)            a flat cell
   yarn(x, y, w, h, r, color, dir, cls)   a shaded, rounded thread; dir 'v' | 'h'
   outline(x, y, w, h, color, width, fillAlpha, cls)
   line(x1, y1, x2, y2, color, width)
   text(x, y, str, color, size, anchor)   anchor 'start' | 'middle' | 'end'
   group(cls) / endGroup()                structure, for the SVG */

export function canvasPainter(ctx) {
  const grads = new Map();
  const gradient = (color, dir, size) => {
    const key = `${color}|${dir}|${size}`;
    let g = grads.get(key);
    if (!g) {
      g = dir === 'v' ? ctx.createLinearGradient(0, 0, size, 0) : ctx.createLinearGradient(0, 0, 0, size);
      for (const [o, c] of yarnStops(color)) g.addColorStop(o, c);
      grads.set(key, g);
    }
    return g;
  };
  const roundPath = (x, y, w, h, r) => {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y); ctx.arcTo(x + w, y, x + w, y + rr, rr);
    ctx.lineTo(x + w, y + h - rr); ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
    ctx.lineTo(x + rr, y + h); ctx.arcTo(x, y + h, x, y + h - rr, rr);
    ctx.lineTo(x, y + rr); ctx.arcTo(x, y, x + rr, y, rr);
    ctx.closePath();
  };
  return {
    rect(x, y, w, h, fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); },
    yarn(x, y, w, h, r, color, dir) {
      ctx.translate(x, y);
      ctx.fillStyle = gradient(color, dir, dir === 'v' ? w : h);
      roundPath(0, 0, w, h, r);
      ctx.fill();
      ctx.translate(-x, -y);
    },
    outline(x, y, w, h, color, width, fillAlpha) {
      if (fillAlpha) { ctx.globalAlpha = fillAlpha; ctx.fillStyle = color; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1; }
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.strokeRect(x + width / 2, y + width / 2, w - width, h - width);
    },
    line(x1, y1, x2, y2, color, width) {
      ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    },
    text(x, y, str, color, size, anchor) {
      ctx.fillStyle = color; ctx.font = `${size}px "Space Mono", monospace`;
      ctx.textAlign = anchor === 'middle' ? 'center' : anchor === 'end' ? 'right' : 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(str, x, y);
    },
    group() {}, endGroup() {},
  };
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n2 = (v) => Math.round(v * 100) / 100;

export function svgPainter() {
  const out = [];
  const defs = new Map();
  const gradientId = (color, dir) => {
    const key = `${color}|${dir}`;
    let id = defs.get(key);
    if (!id) {
      id = `g${defs.size}`;
      defs.set(key, id);
    }
    return id;
  };
  const P = {
    rect(x, y, w, h, fill, cls) {
      out.push(`<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" fill="${fill}"${cls ? ` class="${cls}"` : ''}/>`);
    },
    yarn(x, y, w, h, r, color, dir, cls) {
      const rr = Math.min(r, w / 2, h / 2);
      out.push(`<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" rx="${n2(rr)}" ry="${n2(rr)}" fill="url(#${gradientId(color, dir)})"${cls ? ` class="${cls}"` : ''}/>`);
    },
    outline(x, y, w, h, color, width, fillAlpha, cls) {
      out.push(`<rect x="${n2(x + width / 2)}" y="${n2(y + width / 2)}" width="${n2(w - width)}" height="${n2(h - width)}" fill="${color}" fill-opacity="${fillAlpha || 0}" stroke="${color}" stroke-width="${width}"${cls ? ` class="${cls}"` : ''}/>`);
    },
    line(x1, y1, x2, y2, color, width) {
      out.push(`<line x1="${n2(x1)}" y1="${n2(y1)}" x2="${n2(x2)}" y2="${n2(y2)}" stroke="${color}" stroke-width="${width}" shape-rendering="crispEdges"/>`);
    },
    text(x, y, str, color, size, anchor) {
      out.push(`<text x="${n2(x)}" y="${n2(y)}" fill="${color}" font-family="Space Mono, monospace" font-size="${size}" text-anchor="${anchor}" dominant-baseline="middle">${esc(str)}</text>`);
    },
    group(cls) { out.push(`<g class="${cls}">`); },
    endGroup() { out.push('</g>'); },
    document(width, height) {
      const d = [];
      for (const [key, id] of defs) {
        const [color, dir] = key.split('|');
        const axis = dir === 'v' ? 'x2="1" y2="0"' : 'x2="0" y2="1"';
        d.push(`<linearGradient id="${id}" x1="0" y1="0" ${axis}>` +
          yarnStops(color).map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('') + '</linearGradient>');
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n` +
        (d.length ? `<defs>${d.join('')}</defs>\n` : '') + out.join('\n') + '\n</svg>\n';
    },
  };
  return P;
}

/* ------------------------------------------------------------------- paint
   `sum` is weave-draft.js's summary(s): the drawdown, its runs and the runs
   over the long-float bar, computed once by the caller. */
export function paint(P, s, L, sum) {
  const { cell } = L;
  const B = L.blocks;
  const LINE = 'rgba(237,237,232,0.14)';
  const warpC = expandStripes(s.warp, s.ends);
  const weftC = expandStripes(s.weft, s.picks, PALETTE.teal);
  const grid = s.view.grid;

  P.rect(0, 0, L.width, L.height, PALETTE.ink, 'bg');

  const gridLines = (b) => {
    if (!grid) return;
    for (let c = 0; c <= b.cols; c++) P.line(b.x + c * cell, b.y, b.x + c * cell, b.y + b.h, LINE, 1);
    for (let r = 0; r <= b.rows; r++) P.line(b.x, b.y + r * cell, b.x + b.w, b.y + r * cell, LINE, 1);
  };
  const markBlock = (name, b, isSet) => {
    P.group(name);
    P.rect(b.x, b.y, b.w, b.h, PALETTE.inkSoft);
    for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++) {
      if (isSet(c, r)) P.rect(b.x + c * cell, b.y + r * cell, cell, cell, PALETTE.teal, 'mark');
    }
    gridLines(b);
    P.endGroup();
  };

  /* colour bars */
  P.group('warp-colours');
  for (let c = 0; c < s.ends; c++) P.rect(B.warpBar.x + c * cell, B.warpBar.y, cell, B.warpBar.h, warpC[endOfCol(L, c)]);
  P.endGroup();
  P.group('weft-colours');
  for (let r = 0; r < s.picks; r++) P.rect(B.weftBar.x, B.weftBar.y + r * cell, B.weftBar.w, cell, weftC[r]);
  P.endGroup();

  if (L.draft) {
    markBlock('threading', B.threading, (c, r) => (s.threading[endOfCol(L, c)] & (1 << shaftOfRow(L, r))) !== 0);
    markBlock('tieup', B.tieup, (c, r) => (s.tieup[c] & (1 << shaftOfRow(L, r))) !== 0);
    markBlock('treadling', B.treadling, (c, r) => (s.treadling[r] & (1 << c)) !== 0);
  }

  /* drawdown */
  const X = B.drawdown;
  const dd = sum.dd;
  P.group('drawdown');
  if (!s.view.fabric) {
    for (let r = 0; r < s.picks; r++) for (let c = 0; c < s.ends; c++) {
      const e = endOfCol(L, c);
      const up = dd[r * s.ends + e] === 1;
      P.rect(X.x + c * cell, X.y + r * cell, cell, cell, up ? warpC[e] : weftC[r], 'dd');
    }
    gridLines(X);
  } else {
    P.rect(X.x, X.y, X.w, X.h, PALETTE.ink);
    const w = cell * s.view.yarn;
    const inset = (cell - w) / 2;
    const r = Math.min(w / 2, inset + w * 0.35);
    /* under-threads: continuous bars */
    for (let c = 0; c < s.ends; c++) P.yarn(X.x + c * cell + inset, X.y, w, X.h, 0, warpC[endOfCol(L, c)], 'v', 'yarn-base');
    for (let row = 0; row < s.picks; row++) P.yarn(X.x, X.y + row * cell + inset, X.w, w, 0, weftC[row], 'h', 'yarn-base');
    /* on top: warp floats (column runs of up) and weft floats (row runs of down) */
    for (let c = 0; c < s.ends; c++) {
      const e = endOfCol(L, c);
      let p0 = 0;
      for (let p = 1; p <= s.picks; p++) {
        if (p === s.picks || dd[p * s.ends + e] !== dd[p0 * s.ends + e]) {
          if (dd[p0 * s.ends + e] === 1) {
            const y0 = Math.max(X.y, X.y + p0 * cell - inset);
            const y1 = Math.min(X.y + X.h, X.y + p * cell + inset);
            P.yarn(X.x + c * cell + inset, y0, w, y1 - y0, r, warpC[e], 'v', 'yarn');
          }
          p0 = p;
        }
      }
    }
    for (let row = 0; row < s.picks; row++) {
      let c0 = 0;
      for (let c = 1; c <= s.ends; c++) {
        const cur = c < s.ends ? dd[row * s.ends + endOfCol(L, c)] : -1;
        if (cur !== dd[row * s.ends + endOfCol(L, c0)]) {
          if (dd[row * s.ends + endOfCol(L, c0)] === 0) {
            const x0 = Math.max(X.x, X.x + c0 * cell - inset);
            const x1 = Math.min(X.x + X.w, X.x + c * cell + inset);
            P.yarn(x0, X.y + row * cell + inset, x1 - x0, w, r, weftC[row], 'h', 'yarn');
          }
          c0 = c;
        }
      }
    }
  }
  P.endGroup();

  /* long-float warnings: an outline over every run past the bar, both faces */
  if (s.view.warn) {
    P.group('float-warnings');
    for (const run of sum.long.warp) {
      const c = colOfEnd(L, run.e);
      P.outline(X.x + c * cell, X.y + run.p0 * cell, cell, run.len * cell, PALETTE.warn, 1.5, 0.22, 'float-warn');
    }
    for (const run of sum.long.weft) {
      const cmin = colOfEnd(L, run.e0 + run.len - 1);
      P.outline(X.x + cmin * cell, X.y + run.p * cell, run.len * cell, cell, PALETTE.warn, 1.5, 0.22, 'float-warn');
    }
    P.endGroup();
  }

  /* labels: shaft numbers down the left of the threading, treadle numbers
     over the tie-up, only when a digit can fit in a cell */
  if (L.labels) {
    const size = Math.min(11, Math.max(8, Math.round(cell * 0.72)));
    P.group('labels');
    for (let r = 0; r < s.shafts; r++) {
      P.text(B.threading.x - 5, B.threading.y + (r + 0.5) * cell, String(shaftOfRow(L, r) + 1), PALETTE.dim2, size, 'end');
    }
    for (let c = 0; c < s.treadles; c++) {
      P.text(B.tieup.x + (c + 0.5) * cell, B.tieup.y - L.gap * 0.5, String(c + 1), PALETTE.dim2, size, 'middle');
    }
    P.endGroup();
  }
}

/* The SVG export: the current view, through the same paint(). */
export function renderSvg(s, sum) {
  const L = layout(s);
  const P = svgPainter();
  paint(P, s, L, sum || summaryFor(s));
  return P.document(L.width, L.height);
}

/* A local summary when the caller has none — the model's own, re-exported so
   the SVG can be asked for from a bare state. */
import { summary as modelSummary } from './weave-draft.js';
function summaryFor(s) { return modelSummary(s); }
