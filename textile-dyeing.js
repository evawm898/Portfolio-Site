// textile-dyeing.js — the animations of the Dyeing field note (/dyeing.html): where colour enters
// the fiber -> yarn -> fabric chain, pigment vs dye, why the fiber decides the dye class, and one
// bath with two dyes (cross dyeing). Drawn in /textile-basics.js's stroke language (DRAW: a
// fibre is a 1.3-unit line on a background-coloured halo, a strand behind a yarn is dimmed) via
// /textile-dyeing-draw.js, which adds the fibre colour as a parameter. tools/dyeing-proto/ holds
// the recording and checking tools.
//
// COLOUR HAS ONE OWNER: the section's CSS custom properties (--dye-disperse, --dye-acid,
// --dye-reactive, --dye-undyed; see /dyeing.css). DYE below holds var() references to them and
// nothing else, so the final palette pick is a CSS edit, not a JS one.
//
// A scene is { viewBox, duration, build(state) -> static markup, frame(t, state) ->
// { vars, dyn } }. The static markup (every yarn, every chain) is built once per state; a frame
// only sets CSS variables on the <svg> (each dyed thing strokes var(--name), so a colour change
// is one style write, not a rebuilt yarn) and replaces one <g class="dyn"> of moving molecules.
// frame() is a pure function of (t, state), so the frame a play ends on is exactly the
// reduced-motion frame.
//
// Playback (mountDyeing): every scene plays once when scrolled into view and holds its end frame;
// scrolled away mid-play it jumps to the end; hover / tap replays; a control (stage picker,
// toggles) replays its scene with the new state; prefers-reduced-motion draws end frames only.
import { DRAW, VIEW } from './textile-basics.js';
import { dyedPiece, dyedWeave, yarnOn, glyph } from './textile-dyeing-draw.js';

const { INK, BG, SW, SEED, TAU, rng, seg, ease, lerp, f1, poly, runsMarkup, makeFibre, posedPoints, lineSeg, arcSeg, centreline } = DRAW;

export const DYE = {
  disperse: 'var(--dye-disperse)', acid: 'var(--dye-acid)', reactive: 'var(--dye-reactive)',
  undyed: 'var(--dye-undyed)', colour: 'var(--dye-colour)',   // --dye-colour: the generic "a dye" of parts A and B
  crossPoly: 'var(--dye-cross-poly)',                         // the polyester's dye in part D's cross-dyed swatch
};
const DIM = 'var(--ink-dim, #a7afaf)', LINE = 'var(--line-strong, #34393a)';
// k = 0 -> base, k = 1 -> c; whole percent so a play writes at most 100 distinct values
export const mixTo = (c, k, base = DYE.undyed) => k >= 0.995 ? c : k <= 0.005 ? base : `color-mix(in srgb, ${c} ${Math.round(k * 100)}%, ${base})`;
const g = inner => `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
const text = (x, y, s, o = {}) => `<text x="${f1(x)}" y="${f1(y)}" fill="${o.fill || DIM}" font-family="var(--mono, monospace)" font-size="${o.size || 10}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}${o.op != null ? ` fill-opacity="${o.op}"` : ''}>${s}</text>`;
const smooth = v => ease(v < 0 ? 0 : v > 1 ? 1 : v);
const op = v => v < 0.999 ? ` opacity="${f1(v * 100) / 100}"` : '';

// a jittered grid of points inside a disc (or an ellipse), seeded
function discPoints(seed, cx, cy, r, step, sy = 1, jitter = 0.35) {
  const R = rng(seed), out = [];
  for (let y = -r; y <= r; y += step * 0.87) {
    const row = Math.round((y + r) / (step * 0.87));
    for (let x = -r + (row % 2) * step / 2; x <= r; x += step) {
      const px = x + (R() - 0.5) * step * jitter, py = y + (R() - 0.5) * step * jitter;
      if (Math.hypot(px, py) <= r) out.push({ x: cx + px, y: cy + py * sy, r: Math.hypot(px, py) / r, rnd: R() });
    }
  }
  return out;
}
// a short irregular polygon: a pigment particle (bigger and blockier than a dye molecule)
function particle(x, y, s, rot, color) {
  const pts = [];
  for (let k = 0; k < 5; k++) { const a = rot + k * TAU / 5, rr = s * (0.75 + 0.35 * ((k * 7 + 3) % 5) / 4); pts.push({ x: x + rr * Math.cos(a), y: y + rr * Math.sin(a) }); }
  return `<path d="${poly(pts)}Z" fill="${color}" stroke="${BG}" stroke-width="0.8"/>`;
}
// a quadratic path between two points with a sideways bow, eased
function arcPath(a, b, bow, k) {
  const mx = (a.x + b.x) / 2 + (b.y - a.y) * bow, my = (a.y + b.y) / 2 - (b.x - a.x) * bow, u = smooth(k), v = 1 - u;
  return { x: v * v * a.x + 2 * v * u * mx + u * u * b.x, y: v * v * a.y + 2 * v * u * my + u * u * b.y };
}
const arrowHead = (x, y, ang, s, color, o = 1) => {
  const a = { x: x - s * Math.cos(ang - 0.5), y: y - s * Math.sin(ang - 0.5) }, b = { x: x - s * Math.cos(ang + 0.5), y: y - s * Math.sin(ang + 0.5) };
  return `<path d="M${f1(a.x)},${f1(a.y)}L${f1(x)},${f1(y)}L${f1(b.x)},${f1(b.y)}" stroke="${color}" stroke-width="1.3" fill="none"${op(o)}/>`;
};

// ============================================================================================
// A. WHERE COLOUR ENTERS — the chain, and the stage the dye enters it at
// ============================================================================================
export const STAGES = [
  { id: 'solution', panel: 0 }, { id: 'fiber', panel: 1 }, { id: 'skein', panel: 2 },
  { id: 'package', panel: 2 }, { id: 'beam', panel: 2 }, { id: 'piece', panel: 3 },
];
// Two layouts of the same four panels. ROW (wide screens): left to right, labels in the HTML
// under the svg. GRID (narrow, under 560 px): a 2 x 2 "U" — polymer, fiber across the top, down to
// yarn, back to fabric — so each panel keeps a readable size; its labels are drawn in the svg.
// Every panel is drawn at its ROW position and moved by a translate, so the two layouts cannot
// draw different panels.
const PANEL_X = [80, 240, 400, 560], PANEL_Y = 88;
export const CHAIN_LAYOUT = {
  row: {
    viewBox: '0 0 640 176', at: PANEL_X.map(x => ({ x, y: PANEL_Y })),
    arrows: [1, 2, 3].map(j => ({ x: PANEL_X[j - 1] + 80, y: PANEL_Y, ang: 0 })), labels: false,
  },
  grid: {
    viewBox: '0 0 330 384', at: [{ x: 80, y: 88 }, { x: 250, y: 88 }, { x: 250, y: 282 }, { x: 80, y: 282 }],
    arrows: [{ x: 165, y: 88, ang: 0 }, { x: 304, y: 185, ang: Math.PI / 2 }, { x: 165, y: 282, ang: Math.PI }], labels: true,
  },
};
const PANEL_NAMES = ['Polymer', 'Fiber', 'Yarn', 'Fabric'];
const shift = (L, i) => ({ dx: L.at[i].x - PANEL_X[i], dy: L.at[i].y - PANEL_Y });
function chainPanels(stage, layout = 'row') {
  const L = CHAIN_LAYOUT[layout], parts = chainParts(stage);
  return parts.map((m, i) => { const { dx, dy } = shift(L, i); return dx || dy ? `<g transform="translate(${dx},${dy})">${m}</g>` : m; }).join('');
}
function chainParts(stage) {
  const idx = STAGES.findIndex(s => s.id === stage);
  const parts = PANEL_X.map(cx => `<rect x="${cx - 70}" y="14" width="140" height="148" rx="6" fill="none" stroke="${LINE}" stroke-width="1"/>`);
  let s = '';
  // 0 · polymer: a melt chamber feeding a spinneret, three filaments coming out
  {
    const cx = PANEL_X[0];
    s += `<rect x="${cx - 58}" y="54" width="44" height="68" rx="8" fill="${BG}" stroke="${INK}" stroke-width="${SW}" stroke-opacity="0.7"/>`;
    s += `<path d="M${cx - 14},66 L${cx - 4},76 L${cx - 4},100 L${cx - 14},110" fill="none" stroke="${INK}" stroke-width="${SW}" stroke-opacity="0.7"/>`;
    const runs = [];
    for (let i = 0; i < 3; i++) {
      const y0 = 80 + i * 8, pts = [];
      for (let k = 0; k <= 30; k++) { const x = cx - 4 + k * 2.4; pts.push({ x, y: y0 + (i - 1) * k * 0.55 + 2.2 * Math.sin(k * 0.45 + i), d: i }); }
      runs.push({ pts, depth: i, color: 'var(--a0)', op: 1 });
    }
    s += g(runsMarkup(runs));
    parts[0] += s; s = '';
  }
  // 1 · fiber: a loose tuft of staple fibres
  {
    const r = rng(SEED + 61), runs = [], cx = PANEL_X[1];
    for (let i = 0; i < 18; i++) {
      const f = makeFibre(r, i, false); f.len = 40 + r() * 34;
      const pose = { x: cx + (r() - 0.5) * 84, y: PANEL_Y + (r() - 0.5) * 92, ang: -0.5 + r() * 1.0, crimp: 1.1 };
      runs.push({ pts: posedPoints(f, pose, r()), depth: r(), color: 'var(--a1)', op: 1 });
    }
    s += g(runsMarkup(runs));
    parts[1] += s; s = '';
  }
  // 2 · yarn: a twisted staple yarn
  {
    const cx = PANEL_X[2], line = centreline([lineSeg(cx - 66, PANEL_Y + 10, cx + 66, PANEL_Y + 10)]);
    s += g(dyedPiece(yarnOn(line, 'staple', 'var(--a2)', SEED + 62, 13, { density: 0.75 }), 0, line.length));
    // the yarn method, a small pictogram above the yarn
    const m = STAGES[idx].id, ix = cx, iy = 44, st = `fill="none" stroke="${INK}" stroke-width="1.2" stroke-opacity="0.7"`;
    if (m === 'skein') s += `<path d="M${ix - 18},${iy - 12}H${ix + 18}" ${st}/>` + [-10, 0, 10].map(d => `<path d="M${ix + d - 3},${iy - 12}V${iy + 6}A3,3 0 0 0 ${ix + d + 3},${iy + 6}V${iy - 12}" ${st}/>`).join('');
    if (m === 'package') s += `<path d="M${ix - 9},${iy - 13}L${ix - 15},${iy + 11}H${ix + 15}L${ix + 9},${iy - 13}Z" ${st}/><path d="M${ix - 12},${iy - 1}H${ix + 12}M${ix - 10},${iy - 7}H${ix + 10}M${ix - 14},${iy + 5}H${ix + 14}" ${st} stroke-opacity="0.45"/>`;
    if (m === 'beam') s += `<rect x="${ix - 20}" y="${iy + 2}" width="40" height="9" rx="4.5" ${st}/>` + [-14, -7, 0, 7, 14].map(d => `<path d="M${ix + d},${iy + 2}V${iy - 14}" ${st}/>`).join('');
    parts[2] += s; s = '';
  }
  // 3 · fabric: a small plain weave
  s += `<clipPath id="dy-chain-fab"><rect x="${PANEL_X[3] - 62}" y="22" width="124" height="132" rx="3"/></clipPath>`;
  s += `<g clip-path="url(#dy-chain-fab)">${dyedWeave({ cx: PANEL_X[3], cy: PANEL_Y, cols: 5, rows: 6, pitch: 26, rowPitch: 24, R: 9, ext: 30,
    warp: { kind: 'staple', color: 'var(--a3)', density: 0.45 }, weft: { kind: 'staple', color: 'var(--a3)', density: 0.45 } })}</g>`;
  parts[3] += s;
  return parts;
}
const chainScene = {
  viewBox: CHAIN_LAYOUT.row.viewBox, duration: 4600,
  viewBoxFor: st => CHAIN_LAYOUT[st.layout || 'row'].viewBox,
  // the layout follows the viewport: a state key, so a change rebuilds the static markup
  media: { query: '(max-width: 559.98px)', key: 'layout', on: 'grid', off: 'row' },
  build: st => chainPanels(st.stage, st.layout),
  frame(t, st) {
    const L = CHAIN_LAYOUT[st.layout || 'row'];
    const e = STAGES.find(s => s.id === st.stage).panel, vars = {}, k = [0, 0, 0, 0];
    k[e] = smooth(seg(t, 0.16, 0.5));
    for (let j = e + 1; j < 4; j++) k[j] = smooth(seg(t, 0.52 + 0.13 * (j - e - 1), 0.64 + 0.13 * (j - e - 1)));
    k.forEach((v, j) => { vars[`--a${j}`] = mixTo(DYE.colour, v); });
    let dyn = '';
    // arrows between panels: lit once the colour has passed through
    for (let j = 1; j < 4; j++) {
      const A = L.arrows[j - 1], lit = j > e ? smooth(seg(t, 0.48 + 0.13 * (j - e - 1), 0.56 + 0.13 * (j - e - 1))) : 0;
      const c = mixTo(DYE.colour, lit, INK), cs = Math.cos(A.ang), sn = Math.sin(A.ang);
      dyn += `<path d="M${f1(A.x - 6 * cs)},${f1(A.y - 6 * sn)}L${f1(A.x + 6 * cs)},${f1(A.y + 6 * sn)}" stroke="${c}" stroke-width="1.3" stroke-opacity="${f1((0.45 + 0.55 * lit) * 100) / 100}"/>` + arrowHead(A.x + 7 * cs, A.y + 7 * sn, A.ang, 5, c, 0.45 + 0.55 * lit);
    }
    // the GRID layout carries its own labels (the ROW layout's are HTML, under the svg)
    if (L.labels) PANEL_NAMES.forEach((n, i) => {
      const P = L.at[i], entry = i === e;
      dyn += text(P.x, P.y + 74 + 14, (entry ? '\u2193 dye here \u00b7 ' : '') + n.toUpperCase(), { anchor: 'middle', size: 10, fill: entry ? DYE.colour : DIM });
    });
    // the dye going in: drops falling into the entry panel (and, for solution dyeing, pigment into the melt)
    const { dx, dy } = shift(L, e), cx = PANEL_X[e] + dx, r = rng(SEED + 70 + e);
    for (let i = 0; i < 9; i++) {
      const t0 = 0.06 + i * 0.035, u = seg(t, t0, t0 + 0.2);
      const x = cx + (e === 0 ? -36 + (r() - 0.5) * 30 : (r() - 0.5) * 90), y0 = 4 + dy, y1 = dy + (e === 0 ? 60 + r() * 50 : 58 + r() * 50);
      if (u > 0 && u < 1) dyn += `<circle cx="${f1(x)}" cy="${f1(lerp(y0, y1, u * u))}" r="2.6" fill="${DYE.colour}"${op(1 - smooth(seg(u, 0.8, 1)))}/>`;
      if (e === 0 && u >= 1) dyn += particle(x, y1, 2.4, i, DYE.colour);
    }
    return { vars, dyn };
  },
};

// ---------- A2 · the three ways to dye yarn, each showing the yarn's mechanical state ----------
const skeinScene = (() => {
  const XS = [108, 160, 212], TOP = 34, BOT = [148, 162, 154], HALF = 19;
  return {
    viewBox: '0 0 320 220', duration: 5000,
    build() {
      let s = '';
      s += `<path d="M64,${TOP}H256" stroke="${INK}" stroke-width="3" stroke-opacity="0.8" stroke-linecap="round"/>`;
      s += `<g style="transform-origin:160px ${TOP}px;transform:skewX(calc(var(--sway) * 1deg))">`;
      XS.forEach((x, i) => {
        // a loose loop: the two legs bow apart as they hang, and meet in a wide turn at the bottom
        const b = BOT[i], w = HALF, segs = [];
        const leg = (x0, x1) => { const pts = []; for (let k = 0; k <= 12; k++) { const u = k / 12; pts.push({ x: lerp(x0, x1, u) + Math.sin(u * Math.PI) * 4 * Math.sign(x1 - x - 0.01 * (x0 - x)), y: lerp(TOP - 4, b, u) }); } return pts; };
        const L = leg(x - 9, x - w), R = leg(x + w, x + 9).reverse();
        for (let k = 1; k < L.length; k++) segs.push(lineSeg(L[k - 1].x, L[k - 1].y, L[k].x, L[k].y));
        segs.push(arcSeg(x, b, w, Math.PI, 0));
        const Rr = leg(x + 9, x + w).reverse();
        for (let k = 1; k < Rr.length; k++) segs.push(lineSeg(Rr[k - 1].x, Rr[k - 1].y, Rr[k].x, Rr[k].y));
        const line = centreline(segs);
        s += g(dyedPiece(yarnOn(line, 'staple', 'var(--sk)', SEED + 80 + i, 4.2, { density: 0.32 }), 0, line.length));
      });
      return s + '</g>';
    },
    frame(t) {
      const fill = smooth(seg(t, 0.04, 0.32)) - smooth(seg(t, 0.84, 1)), y = lerp(206, 58, fill);
      const sway = 2.4 * Math.sin(t * TAU * 1.5) * (1 - smooth(seg(t, 0.7, 0.95)));
      let dyn = '';
      if (fill > 0.01) {
        const wave = [];
        for (let x = 46; x <= 274; x += 6) wave.push({ x, y: y + 1.6 * Math.sin(x * 0.09 + t * 18) });
        dyn = `<path d="${poly(wave)}L274,206L46,206Z" fill="${DYE.colour}" fill-opacity="0.16"/><path d="${poly(wave)}" stroke="${DYE.colour}" stroke-width="1.3"/>`;
      }
      dyn += `<path d="M46,58V206H274V58" fill="none" stroke="${LINE}" stroke-width="1"/>`;
      return { vars: { '--sk': mixTo(DYE.colour, smooth(seg(t, 0.3, 0.8))), '--sway': f1(sway) }, dyn, under: true };
    },
  };
})();

const packageScene = (() => {
  const C = { x: 160, y: 108 }, RINGS = [32, 47, 62, 77], CORE = 19;
  return {
    viewBox: '0 0 320 220', duration: 5200,
    build() {
      let s = `<circle cx="${C.x}" cy="${C.y}" r="${CORE}" fill="${BG}" stroke="${INK}" stroke-width="${SW}" stroke-opacity="0.8"/>`;
      for (let k = 0; k < 10; k++) { const a = k * TAU / 10; s += `<circle cx="${f1(C.x + CORE * Math.cos(a))}" cy="${f1(C.y + CORE * Math.sin(a))}" r="1.8" fill="${BG}" stroke="${INK}" stroke-width="0.9"/>`; }
      RINGS.forEach((R, i) => {
        const n = Math.floor(TAU * R / 15.5);
        for (let k = 0; k < n; k++) {
          const a = k * TAU / n + i * 0.3, x = C.x + R * Math.cos(a), y = C.y + R * Math.sin(a);
          s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="7" fill="${BG}" stroke="var(--pk${i})" stroke-width="${SW}"/>`;
          for (let m = 0; m < 4; m++) { const b = a + m * TAU / 4 + 0.4; s += `<circle cx="${f1(x + 3 * Math.cos(b))}" cy="${f1(y + 3 * Math.sin(b))}" r="1.1" fill="var(--pk${i})"/>`; }
        }
      });
      // wound to a set density: a dashed outer boundary pressing in
      s += `<circle cx="${C.x}" cy="${C.y}" r="86" fill="none" stroke="${LINE}" stroke-width="1" stroke-dasharray="3 3"/>`;
      return s;
    },
    frame(t) {
      const vars = {};
      RINGS.forEach((_, i) => {
        const a = smooth(seg(t, 0.1 + 0.07 * i, 0.42 + 0.07 * i)) * 0.65;                  // in -> out
        const b = smooth(seg(t, 0.56 + 0.06 * (RINGS.length - 1 - i), 0.82 + 0.03 * (RINGS.length - 1 - i))); // out -> in completes it
        vars[`--pk${i}`] = mixTo(DYE.colour, Math.min(1, a + (1 - a) * b));
      });
      const out = t < 0.52, u = out ? seg(t, 0.06, 0.5) : seg(t, 0.54, 0.95);
      let dyn = '';
      if (u > 0 && u < 1) for (let k = 0; k < 8; k++) {
        const a = k * TAU / 8 + 0.39;
        for (let m = 0; m < 2; m++) {
        const ph = (u * 2.2 + m * 0.5) % 1, r = out ? lerp(CORE + 4, 100, ph) : lerp(100, CORE + 6, ph);
        const x = C.x + r * Math.cos(a), y = C.y + r * Math.sin(a), ang = out ? a : a + Math.PI, o = Math.sin(ph * Math.PI);
        const tail = { x: x - 11 * Math.cos(ang), y: y - 11 * Math.sin(ang) };
        const shaft = `M${f1(tail.x)},${f1(tail.y)}L${f1(x)},${f1(y)}`;
        dyn += `<path d="${shaft}" stroke="${BG}" stroke-width="6" stroke-linecap="round"${op(o)}/><path d="${shaft}" stroke="${DYE.colour}" stroke-width="2"${op(o)}/>`;
        dyn += arrowHead(x + 1.5 * Math.cos(ang), y + 1.5 * Math.sin(ang), ang, 6, DYE.colour, o).replace('stroke-width="1.3"', 'stroke-width="2"');
        }
      }
      dyn += text(160, 214, t < 0.53 ? 'pumped through: inside → out' : t < 0.92 ? 'then outside → in' : 'every layer dyed, wound tight', { anchor: 'middle' });
      return { vars, dyn };
    },
  };
})();

const beamScene = (() => {
  const XS = Array.from({ length: 9 }, (_, i) => 60 + i * 25), TOP = 26, BEAM = 168;
  return {
    viewBox: '0 0 320 220', duration: 4800,
    build() {
      let s = '';
      // the tension bar the sheet is pulled up to, and the perforated beam it comes off
      s += `<path d="M40,${TOP}H280" stroke="${INK}" stroke-width="3" stroke-opacity="0.8" stroke-linecap="round"/>`;
      for (const x of [48, 272]) s += `<path d="M${x},${TOP - 2}V${TOP - 16}" stroke="${INK}" stroke-width="1.3" stroke-opacity="0.7"/>` + arrowHead(x, TOP - 17, -Math.PI / 2, 5, INK, 0.7);
      const yarnAt = (col, cls) => XS.map((x, i) => g(dyedPiece(yarnOn(centreline([lineSeg(x, BEAM - 8, x, TOP + 2)]), 'staple', col, SEED + 90 + i, 6, { density: 0.42 }), 0, BEAM - 10 - TOP))).join('');
      s += `<g>${yarnAt(DYE.undyed)}</g><g clip-path="url(#dy-beam-front)">${yarnAt(DYE.colour)}</g>`;
      s += `<rect x="36" y="${BEAM - 8}" width="248" height="24" rx="12" fill="${BG}" stroke="${INK}" stroke-width="${SW}" stroke-opacity="0.8"/>`;
      for (let k = 0; k < 14; k++) s += `<circle cx="${52 + k * 16.6}" cy="${BEAM + 4}" r="2" fill="${BG}" stroke="${INK}" stroke-width="0.9"/>`;
      return s;
    },
    frame(t) {
      const u = smooth(seg(t, 0.16, 0.82)), y = lerp(BEAM, TOP - 4, u);
      let dyn = `<clipPath id="dy-beam-front"><rect x="0" y="${f1(y)}" width="320" height="${f1(240 - y)}"/></clipPath>`;
      const r = rng(SEED + 91);
      if (t > 0.05 && t < 0.95) for (let i = 0; i < 16; i++) {
        const ph = (seg(t, 0.06, 0.94) * 3 + r()) % 1, x = 50 + r() * 220, yy = lerp(BEAM + 2, Math.max(TOP, y - 6), ph);
        dyn += `<circle cx="${f1(x)}" cy="${f1(yy)}" r="1.8" fill="${DYE.colour}"${op(Math.sin(ph * Math.PI) * 0.9)}/>`;
      }
      dyn += text(160, 214, 'every end dyed together, side by side', { anchor: 'middle' });
      return { vars: {}, dyn };
    },
  };
})();

// ---------- A3 · how far the dye gets: a yarn's cross-section ----------
function penScene(kind) {
  const C = { x: 160, y: 84 }, sy = kind === 'piece' ? 0.66 : 1, R = 55;
  const pts = discPoints(SEED + (kind === 'piece' ? 12 : 11), C.x, C.y, R, 13.2, sy, 0.25);
  const band = p => Math.min(5, Math.floor((1 - p.r) * 6));     // 0 = surface ... 5 = core
  const reach = kind === 'piece' ? [1, 0.9, 0.55, 0.28, 0.16, 0.12] : [1, 1, 1, 1, 1, 1];
  return {
    viewBox: '0 0 320 168', duration: 4400,
    build() {
      let s = '';
      if (kind === 'piece') {
        // neighbours pressing in: the yarns either side and the crossing yarn over it
        for (const dx of [-152, 152]) s += `<ellipse cx="${C.x + dx}" cy="${C.y}" rx="${R}" ry="${f1(R * sy)}" fill="none" stroke="${INK}" stroke-width="${SW}" stroke-opacity="0.35"/>`;
        s += `<path d="M10,${f1(C.y - R * sy - 6)}C90,${f1(C.y - R * sy - 22)} 230,${f1(C.y - R * sy - 22)} 310,${f1(C.y - R * sy - 6)}" stroke="${INK}" stroke-width="${SW}" stroke-opacity="0.35" fill="none"/>`;
      }
      s += `<ellipse cx="${C.x}" cy="${C.y}" rx="${R + 7}" ry="${f1((R + 7) * sy)}" fill="none" stroke="${INK}" stroke-width="${SW}" stroke-opacity="0.5"/>`;
      for (const p of pts) s += `<circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="${f1(5.4 * (kind === 'piece' ? 0.92 : 1))}" fill="var(--pf${band(p)})" stroke="var(--ps${band(p)})" stroke-width="1.1"/>`;
      return s;
    },
    frame(t) {
      const vars = {};
      for (let b = 0; b < 6; b++) {
        const k = reach[b] * smooth(seg(t, 0.12 + b * 0.09, 0.36 + b * 0.09));
        vars[`--pf${b}`] = mixTo(DYE.colour, k, BG); vars[`--ps${b}`] = mixTo(DYE.colour, k, INK);
      }
      return { vars, dyn: '' };
    },
  };
}

// ============================================================================================
// B. INSIDE, ON, OR INTO — pigment vs dye, three fibre cross-sections
// ============================================================================================
const FIB = { x: 160, y: 116, r: 70 };
function fibreBody(id) {
  const chains = [];
  for (let j = 0; j < 8; j++) {
    const y0 = FIB.y - FIB.r + 12 + j * 18, pts = [];
    for (let x = FIB.x - FIB.r; x <= FIB.x + FIB.r; x += 5) pts.push({ x, y: y0 + 2.4 * Math.sin(x * 0.11 + j * 1.7) });
    chains.push(poly(pts));
  }
  return `<clipPath id="${id}"><circle cx="${FIB.x}" cy="${FIB.y}" r="${FIB.r - 1}"/></clipPath>`
    + `<circle cx="${FIB.x}" cy="${FIB.y}" r="${FIB.r}" fill="${BG}" stroke="none"/>`
    + `<g clip-path="url(#${id})"><path d="${chains.join('')}" stroke="${INK}" stroke-width="1" stroke-opacity="0.18" fill="none"/></g>`;
}
const fibreOutline = (o = 1) => `<circle cx="${FIB.x}" cy="${FIB.y}" r="${FIB.r}" fill="none" stroke="${INK}" stroke-width="${SW}"${op(o)}/>`;

const solutionScene = (() => {
  const P = discPoints(SEED + 21, FIB.x, FIB.y, FIB.r - 9, 17, 1, 0.5);
  return {
    viewBox: '0 0 320 220', duration: 4600,
    build: () => fibreBody('dy-sol-clip'),
    frame(t) {
      let dyn = '';
      // the polymer is still melt while the pigment is stirred through it; then it sets as a fibre
      const set = smooth(seg(t, 0.62, 0.92));
      P.forEach((p, i) => {
        const a1 = Math.atan2(p.y - FIB.y, p.x - FIB.x), r1 = Math.hypot(p.x - FIB.x, p.y - FIB.y);
        const u = smooth(seg(t, 0.04 + p.rnd * 0.18, 0.5 + p.rnd * 0.15));
        const a = a1 - (1 - u) * (2.6 + p.rnd), r = lerp(FIB.r + 26 + p.rnd * 20, r1, u);
        const x = (1 - u) * (-30 + 60 * 0) + FIB.x + r * Math.cos(a), y = FIB.y + r * Math.sin(a);
        if (u > 0 || t > 0.02) dyn += particle(x, y, 3.3, i * 1.3, DYE.colour);
      });
      dyn += `<circle cx="${FIB.x}" cy="${FIB.y}" r="${FIB.r}" fill="none" stroke="${INK}" stroke-width="${SW}" stroke-dasharray="${f1(TAU * FIB.r * set)} 999" transform="rotate(-90 ${FIB.x} ${FIB.y})"/>`;
      if (set < 0.99) dyn += `<circle cx="${FIB.x}" cy="${FIB.y}" r="${FIB.r}" fill="none" stroke="${INK}" stroke-width="1" stroke-opacity="0.35" stroke-dasharray="2 4"/>`;
      dyn += text(160, 212, set < 0.5 ? 'pigment stirred into the melt' : 'set as a fiber: pigment all through it', { anchor: 'middle' });
      return { vars: {}, dyn };
    },
  };
})();

const printedScene = (() => {
  const N = 15, r = rng(SEED + 22), P = [];
  for (let i = 0; i < N; i++) { const a = Math.PI * (1.12 + 0.76 * (i + 0.5) / N) + (r() - 0.5) * 0.06; P.push({ a, x0: FIB.x + (r() - 0.5) * 200, d: r() }); }
  const A0 = Math.PI * 1.08, A1 = Math.PI * 1.92, RB = FIB.r + 6;
  const arc = (rad, a0, a1) => { const p = []; for (let k = 0; k <= 40; k++) { const a = lerp(a0, a1, k / 40); p.push({ x: FIB.x + rad * Math.cos(a), y: FIB.y + rad * Math.sin(a) }); } return poly(p); };
  return {
    viewBox: '0 0 320 220', duration: 4600,
    build: () => fibreBody('dy-print-clip') + fibreOutline(),
    frame(t) {
      let dyn = '';
      const film = smooth(seg(t, 0.56, 0.86));
      if (film > 0) {
        const a1 = lerp(A0, A1, film);
        dyn += `<path d="${arc(RB, A0, a1)}" stroke="${INK}" stroke-width="9" stroke-opacity="0.16" fill="none" stroke-linecap="round"/>`;
        dyn += `<path d="${arc(RB + 4.5, A0, a1)}" stroke="${INK}" stroke-width="1.1" stroke-opacity="0.75" fill="none"/>`;
      }
      P.forEach((p, i) => {
        const u = seg(t, 0.06 + p.d * 0.22, 0.34 + p.d * 0.22);
        const end = { x: FIB.x + RB * Math.cos(p.a), y: FIB.y + RB * Math.sin(p.a) };
        const x = lerp(p.x0, end.x, smooth(u)), y = lerp(-10, end.y, u * u);
        if (u > 0) dyn += particle(x, y, 3.6, i * 1.7, DYE.colour);
      });
      if (film > 0.6) dyn += text(FIB.x + 66, FIB.y - 68, 'binder', { op: Math.min(1, (film - 0.6) / 0.3).toFixed(2) });
      dyn += text(160, 212, film > 0.3 ? 'glued to the surface: the inside stays bare' : 'pigment printed onto the surface', { anchor: 'middle' });
      return { vars: {}, dyn };
    },
  };
})();

const dyedScene = (() => {
  const P = discPoints(SEED + 23, FIB.x, FIB.y, FIB.r - 7, 12.5, 1, 0.55);
  return {
    viewBox: '0 0 320 220', duration: 4600,
    build: () => fibreBody('dy-dyed-clip') + fibreOutline(),
    frame(t) {
      let dyn = '';
      P.forEach((p, i) => {
        const a1 = Math.atan2(p.y - FIB.y, p.x - FIB.x) + (p.rnd - 0.5) * 0.8;
        const start = { x: FIB.x + (FIB.r + 22 + p.rnd * 16) * Math.cos(a1), y: FIB.y + (FIB.r + 22 + p.rnd * 16) * Math.sin(a1) };
        const u = seg(t, 0.08 + p.r * 0.05 + p.rnd * 0.08, 0.5 + (1 - p.r) * 0.3);
        const q = arcPath(start, p, (p.rnd - 0.5) * 0.6, u);
        dyn += glyph('disperse', q.x, q.y, DYE.colour, 0.72);
      });
      dyn += text(160, 212, t < 0.5 ? 'dye molecules in the bath' : 'taken into the fiber itself', { anchor: 'middle' });
      return { vars: {}, dyn };
    },
  };
})();

// ============================================================================================
// C. WHY THE FIBER DECIDES THE DYE — three zooms into the polymer, three different attachments
// ============================================================================================
const CH = { x0: 14, x1: 306, n: 6, mid: 148, gap: 19 };
function chainPath(j, s, ph = 0) {
  const y0 = CH.mid + (j - (CH.n - 1) / 2) * CH.gap * s, pts = [];
  for (let x = CH.x0; x <= CH.x1; x += 4) pts.push({ x, y: y0 + 2.2 * Math.sin(x * 0.075 + j * 1.9 + ph) });
  return pts;
}
const chainY = (j, x, s, ph = 0) => CH.mid + (j - (CH.n - 1) / 2) * CH.gap * s + 2.2 * Math.sin(x * 0.075 + j * 1.9 + ph);
const surface = () => `<path d="M${CH.x0},${f1(CH.mid - CH.gap * 3.6)}H${CH.x1}" stroke="${LINE}" stroke-width="1" stroke-dasharray="3 3"/>`
  + text(CH.x1, CH.mid - CH.gap * 3.6 - 5, 'bath', { anchor: 'end', size: 9 }) + text(CH.x1, CH.mid - CH.gap * 3.6 + 12, 'fiber', { anchor: 'end', size: 9 });
const chainsMarkup = (s, ph = 0, o = 0.6) => `<path d="${Array.from({ length: CH.n }, (_, j) => poly(chainPath(j, s, ph))).join('')}" stroke="${INK}" stroke-width="${SW}" stroke-opacity="${o}" fill="none"/>`;

const disperseScene = (() => {
  const r = rng(SEED + 31), D = [];
  for (let i = 0; i < 11; i++) D.push({ x0: 24 + r() * 272, y0: 30 + r() * 34, gap: Math.floor(r() * (CH.n - 1)), x: 26 + (i + 0.5) / 11 * 268, d: r() });
  return {
    viewBox: '0 0 320 220', duration: 5600,
    build: () => surface(),
    frame(t) {
      const open = smooth(seg(t, 0.06, 0.32)) - smooth(seg(t, 0.78, 0.94)), s = 1 + 0.34 * open, ph = t * 9 * open;
      let dyn = chainsMarkup(s, ph);
      for (const m of D) {
        const u = seg(t, 0.3 + m.d * 0.2, 0.56 + m.d * 0.18);
        const target = { x: m.x, y: (chainY(m.gap, m.x, s, ph) + chainY(m.gap + 1, m.x, s, ph)) / 2 };
        const q = u >= 1 ? target : arcPath({ x: m.x0, y: m.y0 }, target, (m.d - 0.5) * 0.4, u);
        dyn += glyph('disperse', q.x, q.y, DYE.disperse, 1);
      }
      const temp = Math.round(lerp(60, 130, smooth(seg(t, 0.06, 0.3))) - 70 * smooth(seg(t, 0.78, 0.94)));
      const label = t < 0.3 ? `heating · ${temp} °C` : t < 0.78 ? '130 °C, under pressure: the chains loosen' : 'cooled: the dye is trapped, not bonded';
      dyn += text(CH.x0, 14, label, { fill: INK, size: 10 });
      return { vars: {}, dyn };
    },
  };
})();

const acidScene = (() => {
  const S = [{ j: 0, x: 62 }, { j: 2, x: 138 }, { j: 1, x: 226 }, { j: 4, x: 92 }, { j: 3, x: 266 }, { j: 5, x: 180 }];
  const r = rng(SEED + 32);
  S.forEach(p => { p.y = chainY(p.j, p.x, 1) - 8; p.hx = 20 + r() * 280; p.dx = 20 + r() * 280; p.dy = 30 + r() * 34; p.d = r(); });
  return {
    viewBox: '0 0 320 220', duration: 5600,
    build() {
      let s = surface() + chainsMarkup(1);
      for (const p of S) s += `<path d="M${p.x},${f1(p.y + 8)}V${f1(p.y + 3.5)}" stroke="${INK}" stroke-width="${SW}" stroke-opacity="0.8"/><circle cx="${p.x}" cy="${f1(p.y)}" r="3.6" fill="${BG}" stroke="${INK}" stroke-width="1.1"/>`;
      return s;
    },
    frame(t) {
      let dyn = '';
      for (const p of S) {
        // 1 · the acid bath charges each site: H+ lands, the site reads +
        const h = seg(t, 0.06 + p.d * 0.12, 0.26 + p.d * 0.12);
        if (h > 0 && h < 1) { const q = arcPath({ x: p.hx, y: 32 }, { x: p.x, y: p.y }, 0.2, h); dyn += text(q.x, q.y + 3, 'H+', { fill: INK, size: 7, anchor: 'middle', op: (1 - smooth(seg(h, 0.85, 1))).toFixed(2) }); }
        if (h >= 1) dyn += `<path d="M${p.x - 2},${f1(p.y)}H${p.x + 2}M${p.x},${f1(p.y - 2)}V${f1(p.y + 2)}" stroke="${INK}" stroke-width="1.1"/>`;
        // 2 · a dye anion (−) drifts down and pairs with the + site
        const u = seg(t, 0.4 + p.d * 0.18, 0.66 + p.d * 0.14);
        const dock = { x: p.x + 11, y: p.y - 7 };
        const q = u >= 1 ? dock : arcPath({ x: p.dx, y: p.dy }, dock, (p.d - 0.5) * 0.5, u);
        if (u >= 1) dyn += `<path d="M${p.x + 3},${f1(p.y - 2.5)}L${f1(dock.x - 3)},${f1(dock.y + 2)}" stroke="${DYE.acid}" stroke-width="1.1" stroke-dasharray="1.6 1.6"/>`;
        dyn += glyph('acid', q.x, q.y, DYE.acid, 1.25);
      }
      const label = t < 0.32 ? 'acid bath: the fiber’s sites pick up a +' : t < 0.8 ? 'dye molecules carry a − ...' : '... + meets −: an ionic bond';
      dyn += text(CH.x0, 14, label, { fill: INK, size: 10 });
      return { vars: {}, dyn };
    },
  };
})();

const reactiveScene = (() => {
  const S = [{ j: 0, x: 58 }, { j: 1, x: 214 }, { j: 2, x: 120 }, { j: 3, x: 252 }, { j: 4, x: 80 }, { j: 5, x: 170 }];
  const r = rng(SEED + 33);
  S.forEach(p => { p.y = chainY(p.j, p.x, 1) - 8; p.dx = 20 + r() * 280; p.dy = 30 + r() * 34; p.d = r(); });
  // dye that reacts with the water instead: in the bath, and one that settled on the fiber unbonded
  const H = [{ x: 100, y: 40, d: 0.2 }, { x: 236, y: 34, d: 0.6 }, { x: 290, y: 52, d: 0.9 }, { x: 150, y: 88, d: 0.4, onFibre: true }];
  return {
    viewBox: '0 0 320 220', duration: 6000,
    build() {
      let s = surface() + chainsMarkup(1);
      for (const p of S) s += `<path d="M${p.x},${f1(p.y + 8)}V${f1(p.y + 3)}" stroke="${INK}" stroke-width="${SW}" stroke-opacity="0.8"/>`;
      return s;
    },
    frame(t) {
      let dyn = '';
      const bond = smooth(seg(t, 0.4, 0.56)), wash = smooth(seg(t, 0.68, 0.94));
      for (const p of S) {
        const u = seg(t, 0.04 + p.d * 0.16, 0.3 + p.d * 0.12);
        const at = { x: p.x, y: p.y - 10 };
        const q = u >= 1 ? at : arcPath({ x: p.dx, y: p.dy }, at, (p.d - 0.5) * 0.5, u);
        if (bond < 1) dyn += text(p.x, p.y + 1, 'OH', { fill: INK, size: 7, anchor: 'middle', op: f1(0.85 * (1 - bond) * 100) / 100 });
        if (bond > 0) dyn += `<path d="M${p.x},${f1(p.y + 3)}V${f1(p.y - 7.5)}" stroke="${DYE.reactive}" stroke-width="${f1(1 + 1.4 * bond)}"${op(bond)}/>`;
        dyn += glyph('reactive', q.x, q.y, DYE.reactive, 1.3);
      }
      for (const h of H) {
        const hyd = smooth(seg(t, 0.44, 0.6)), y = h.y - wash * (h.y + 30);
        if (y < -20) continue;
        dyn += glyph('reactive', h.x, y, DYE.reactive, 1.3).replace('/>', `${op(1 - 0.45 * hyd)}/>`);
        if (hyd > 0) dyn += `<circle cx="${h.x + 5}" cy="${f1(y + 3)}" r="1.9" fill="none" stroke="${DYE.reactive}" stroke-width="1"${op(hyd * (1 - 0.45 * hyd))}/>`;
      }
      const label = t < 0.38 ? 'dye settles onto the cotton ...' : t < 0.66 ? 'add alkali: it bonds to the fiber (covalent)' : t < 0.95 ? 'wash off the dye that reacted with water' : 'what stays is bonded to the cotton';
      dyn += text(CH.x0, 14, label, { fill: INK, size: 10 });
      return { vars: {}, dyn };
    },
  };
})();

// ============================================================================================
// D. ONE BATH, TWO DYES — cross dyeing a polyester / nylon blend
// ============================================================================================
const D_BATH = { x: 16, y: 44, w: 448, h: 262 }, D_SW = { x: 80, y: 76 };     // swatch offset: VIEW coordinates -> scene
const D_WEAVE = { cols: 6, rows: 5, pitch: 52, rowPitch: 44 };
function crossGeometry() {
  const w = (D_WEAVE.cols - 1) * D_WEAVE.pitch, h = (D_WEAVE.rows - 1) * D_WEAVE.rowPitch;
  const x0 = VIEW.w / 2 - w / 2 + D_SW.x, y0 = VIEW.h / 2 - h / 2 + D_SW.y;
  const warpX = Array.from({ length: D_WEAVE.cols }, (_, i) => x0 + i * D_WEAVE.pitch);
  const weftY = Array.from({ length: D_WEAVE.rows }, (_, k) => y0 + k * D_WEAVE.rowPitch);
  const r = rng(SEED + 41), start = () => {
    // somewhere in the bath, outside the swatch
    for (;;) { const x = D_BATH.x + 14 + r() * (D_BATH.w - 28), y = D_BATH.y + 22 + r() * (D_BATH.h - 34); if (x < D_SW.x - 4 || x > D_SW.x + 324 || y < D_SW.y - 4 || y > D_SW.y + 224) return { x, y }; }
  };
  const disp = [], acid = [], stray = [];
  for (let i = 0; i < 18; i++) disp.push({ ...start(), tx: warpX[i % warpX.length] + (r() - 0.5) * 8, ty: y0 + r() * h, d: r() });
  for (let i = 0; i < 18; i++) acid.push({ ...start(), tx: x0 - 10 + r() * (w + 20), ty: weftY[i % weftY.length] + (r() - 0.5) * 8, d: r() });
  for (let i = 0; i < 5; i++) stray.push({ ...start(), tx: x0 + (i + 0.5) / 5 * w, ty: weftY[(i * 2 + 1) % weftY.length] + (r() - 0.5) * 6, d: r() });
  return { disp, acid, stray };
}
const CROSS = crossGeometry();
const crossScene = {
  viewBox: '0 0 480 322', duration: 7600,
  build() {
    let s = `<rect x="${D_BATH.x}" y="${D_BATH.y}" width="${D_BATH.w}" height="${D_BATH.h}" rx="10" fill="none" stroke="${LINE}" stroke-width="1"/>`;
    const wave = []; for (let x = D_BATH.x + 6; x <= D_BATH.x + D_BATH.w - 6; x += 6) wave.push({ x, y: D_BATH.y + 12 + 1.5 * Math.sin(x * 0.08) });
    s += `<path d="${poly(wave)}" stroke="${INK}" stroke-width="1" stroke-opacity="0.35" fill="none"/>`;
    s += `<clipPath id="dy-cross-sw"><rect x="${D_SW.x}" y="${D_SW.y}" width="320" height="220" rx="4"/></clipPath>`;
    s += `<g clip-path="url(#dy-cross-sw)"><g transform="translate(${D_SW.x},${D_SW.y})">${dyedWeave({ ...D_WEAVE,
      warp: { kind: 'filament', color: 'var(--cw)' }, weft: { kind: 'textured', color: 'var(--cn)' } })}</g></g>`;
    return s;
  },
  frame(t, st) {
    const { reserve, reality } = st;
    const T = reality ? { mig0: 0.12, mig1: 0.56, clear0: 0.66, clear1: 0.9 } : { mig0: 0.14, mig1: 0.74 };
    const arrive = m => seg(t, lerp(T.mig0, T.mig1 - 0.2, m.d), lerp(T.mig0 + 0.2, T.mig1, m.d));
    const share = list => list.reduce((a, m) => a + smooth(seg(arrive(m), 0.85, 1)), 0) / list.length;
    const kw = share(CROSS.disp), kn = reserve ? 0 : share(CROSS.acid);
    const stain = reality ? share(CROSS.stray) * (1 - smooth(seg(t, T.clear0, T.clear1))) : 0;
    const nylon = mixTo(DYE.acid, kn);
    const vars = { '--cw': mixTo(DYE.crossPoly, kw), '--cn': stain > 0.005 ? `color-mix(in srgb, ${DYE.crossPoly} ${Math.round(stain * 38)}%, ${nylon})` : nylon };
    let dyn = '';
    const mol = (list, cls) => {
      for (const m of list) {
        const u = arrive(m); if (u >= 1) continue;
        const q = arcPath(m, { x: m.tx, y: m.ty }, (m.d - 0.5) * 0.5, u), wob = (1 - u) * 2.5 * Math.sin(t * 20 + m.d * 9);
        dyn += glyph(cls, q.x + wob, q.y, cls === 'disperse' ? DYE.crossPoly : DYE.acid, 1.35).replace(/\/>/, `${op(1 - smooth(seg(u, 0.75, 1)))}/>`);
      }
    };
    mol(CROSS.disp, 'disperse');
    if (!reserve) mol(CROSS.acid, 'acid');
    if (reality) {
      for (const m of CROSS.stray) {
        const u = arrive(m), c = seg(t, T.clear0, T.clear1);
        let q;
        if (u < 1) q = arcPath(m, { x: m.tx, y: m.ty }, (m.d - 0.5) * 0.5, u);
        else if (c <= 0) q = { x: m.tx, y: m.ty };
        else q = arcPath({ x: m.tx, y: m.ty }, { x: m.tx + 30, y: D_BATH.y - 30 }, 0.2, c);
        const o = u < 1 ? 1 - 0.6 * smooth(seg(u, 0.75, 1)) : c <= 0 ? 0.4 : 1 - c;
        if (q.y > D_BATH.y - 20 && o > 0.02) dyn += glyph('disperse', q.x, q.y, DYE.crossPoly, 1.35).replace(/\/>/, `${op(o)}/>`);
      }
    }
    const label = t < 0.12 ? (reserve ? 'one bath, one dye: the acid dye is left out' : 'one bath, two dyes')
      : reality && t > T.clear0 ? 'a clearing rinse takes the stray dye back off the nylon'
      : reality && t > 0.42 ? 'some disperse dye lands on the nylon too'
      : reserve ? 'disperse dye finds the polyester; the nylon stays undyed' : 'each dye goes to its own fiber';
    dyn += text(D_BATH.x, 26, label, { fill: INK, size: 13 });
    return { vars, dyn };
  },
};

export const SCENES = {
  chain: chainScene, skein: skeinScene, package: packageScene, beam: beamScene,
  'pen-yarn': penScene('yarn'), 'pen-piece': penScene('piece'),
  solution: solutionScene, printed: printedScene, dyed: dyedScene,
  disperse: disperseScene, acid: acidScene, reactive: reactiveScene,
  cross: crossScene,
};
export const DEFAULT_STATE = { chain: { stage: 'package' }, cross: { reserve: false, reality: false } };

// ---------- playback ----------
export function mountDyeing(root = document, opts = {}) {
  const reduce = opts.reducedMotion ?? (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const players = [];
  for (const host of root.querySelectorAll('[data-dye-scene]')) {
    const name = host.dataset.dyeScene, scene = SCENES[name]; if (!scene) continue;
    const svg = host.querySelector('svg') || host.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
    svg.setAttribute('viewBox', scene.viewBox);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    const p = { name, host, svg, scene, state: { ...(DEFAULT_STATE[name] || {}) }, raf: 0, t: reduce ? 1 : 0, played: false, playing: false, built: null };
    const draw = t => {
      const key = JSON.stringify(p.state);
      const f = scene.frame(t, p.state);
      if (p.built !== key) {
        svg.setAttribute('viewBox', scene.viewBoxFor ? scene.viewBoxFor(p.state) : scene.viewBox);
        const stat = `<g class="static">${scene.build(p.state)}</g>`;
        svg.innerHTML = f.under ? `<g class="dyn"></g>${stat}` : `${stat}<g class="dyn"></g>`;
        p.built = key; p.dyn = svg.querySelector('.dyn');
        svg.removeAttribute('style');
      }
      for (const [k, v] of Object.entries(f.vars)) svg.style.setProperty(k, v);
      p.dyn.innerHTML = f.dyn;
    };
    p.seek = t => { cancelAnimationFrame(p.raf); p.playing = false; p.t = t; draw(t); };
    if (scene.media && typeof matchMedia === 'function') {
      const mq = matchMedia(scene.media.query), apply = () => { p.state[scene.media.key] = mq.matches ? scene.media.on : scene.media.off; };
      apply();
      mq.addEventListener?.('change', () => { apply(); if (!p.playing) draw(p.t); });
    }
    p.play = () => {
      if (reduce) { p.seek(1); return; }
      cancelAnimationFrame(p.raf);
      p.playing = true; p.played = true;
      const t0 = performance.now();
      const step = now => {
        p.t = Math.min(1, (now - t0) / scene.duration); draw(p.t);
        if (p.t < 1) p.raf = requestAnimationFrame(step); else p.playing = false;
      };
      p.raf = requestAnimationFrame(step);
    };
    p.setState = patch => { Object.assign(p.state, patch); opts.onState?.(p); if (p.onScreen || reduce) p.play(); else { p.played = false; p.seek(0); } };
    draw(p.t);
    if (!reduce) {
      host.addEventListener('mouseenter', () => { if (p.played && !p.playing) p.play(); });
      host.addEventListener('click', () => { if (!p.playing) p.play(); });
    }
    players.push(p);
  }
  // controls: <button data-dye-for="scene" data-dye-key="k" data-dye-value="v"> (a choice) or
  // without data-dye-value (a toggle, aria-pressed)
  for (const btn of root.querySelectorAll('[data-dye-for]')) {
    const p = players.find(q => q.name === btn.dataset.dyeFor); if (!p) continue;
    btn.addEventListener('click', () => {
      const key = btn.dataset.dyeKey, choice = btn.dataset.dyeValue;
      const val = choice != null ? choice : !(p.state[key]);
      p.setState({ [key]: val });
      for (const b of root.querySelectorAll(`[data-dye-for="${p.name}"][data-dye-key="${key}"]`)) b.setAttribute('aria-pressed', String(choice != null ? b.dataset.dyeValue === val : val));
    });
  }
  players.forEach(p => opts.onState?.(p));
  if (!reduce && opts.autoplay !== false && typeof IntersectionObserver === 'function') {
    // autoplay once 45% is on screen; a control press replays whenever any of it is on screen;
    // a scene scrolled fully away mid-play jumps to its end frame
    const io = new IntersectionObserver(es => {
      for (const e of es) {
        const p = players.find(q => q.host === e.target); if (!p) continue;
        p.onScreen = e.isIntersecting && e.intersectionRatio > 0;
        if (e.intersectionRatio >= 0.45 && !p.played) p.play();
        else if (!p.onScreen && p.playing) p.seek(1);
      }
    }, { threshold: [0, 0.45] });
    players.forEach(p => io.observe(p.host));
  }
  return players;
}
