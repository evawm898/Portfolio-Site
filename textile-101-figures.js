// textile-101-figures.js — the figures of Textile 101's sections 02, 03 and 08, drawn with the
// page's one stroke language (/textile-basics.js's DRAW) and played by the page's one player
// (/textile-taxonomy.js's mountScenes: once on scroll-in, hold the end frame, replay on hover / tap,
// reduced motion = the end frame).
//
//   regain        section 02 — moisture regain per fibre, one bar each, grouped by fibre class
//   xs-*          section 03 — eight fibre cross-sections. A grown or wet-spun fibre is shown from
//                 the side, then cut; a melt-spun shape is shown as its spinneret orifice, then
//                 the filament it makes. Petrol marks the feature the caption is about.
//   weave-*       section 08 — plain, 2/2 twill and 5-end satin, each woven pick by pick beside
//                 its point-paper draft. The interlacing is /weave-draft.js's own drawdown() of
//                 its own presets, so the cloth and the draft cannot disagree; the yarns are the
//                 structure row's tubes (TUBE_KIT), every crossing a notch in the yarn underneath.
//
// Colour: tokens only. Ink is an undyed fibre or yarn (outline, no fill: DESIGN.md rule 7), petrol
// the one thing to follow, and the three companions the three fibre CLASSES of the regain chart
// (each also named by its group heading and marker shape, never by colour alone).
// Every scene is { viewBox, duration, markup(t) }: a pure function of t in [0, 1].
import { DRAW } from './textile-basics.js';
import { TUBE_KIT, mountScenes } from './textile-taxonomy.js';
import { blankState, applyPreset, drawdown } from './weave-draft.js';

const { BG, SW, TAU, rng, seg, ease, lerp, f1, poly } = DRAW;
const { tubes } = TUBE_KIT;
const INK = 'var(--color-ink)', PETROL = 'var(--color-petrol)', LINE = 'var(--color-line-strong)';
const MINT = 'var(--color-mint)', INDIGO = 'var(--color-indigo)', PLUM = 'var(--color-plum)';
const op = (v, what = 'stroke') => v < 1 ? ` ${what}-opacity="${Math.round(v * 100) / 100}"` : '';
const group = inner => `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
// a path that draws itself on: k in [0, 1] of its length
function drawOn(d, k, attrs) {
  if (k <= 0 || !d) return '';
  const dash = k < 1 ? ` pathLength="1000" stroke-dasharray="1000" stroke-dashoffset="${f1(1000 * (1 - k))}"` : '';
  return `<path d="${d}"${dash} ${attrs}/>`;
}
const fade = (inner, k) => k <= 0 ? '' : k < 1 ? `<g opacity="${Math.round(k * 100) / 100}">${inner}</g>` : inner;
const closed = pts => poly(pts) + 'Z';
const polar = (cx, cy, r, n = 96, rot = 0) => Array.from({ length: n }, (_, i) => { const a = rot + TAU * i / n, rr = r(a); return { x: cx + rr * Math.cos(a), y: cy + rr * Math.sin(a) }; });
const stroke = (w = SW, o = 1, c = INK) => `stroke="${c}" stroke-width="${w}"${op(o)}`;

// =====================================================================================
// SECTION 03 — FIBRE CROSS-SECTIONS
// =====================================================================================
const XS = { vb: '0 24 320 112', L: { x: 80, y: 80 }, C: { x: 238, y: 80 }, x0: 12, x1: 146 };
// the arrow from the side view (or the spinneret) to the cut face
const cutArrow = k => fade(`<path d="M166,80H188M182,74L188,80L182,86" ${stroke(1.3, 0.55)}/>`, k);
// where the fibre is cut: a short dashed line across its end
const cutMark = (k, h) => fade(`<path d="M${XS.x1 + 4},${80 - h}V${80 + h}" ${stroke(1, 0.5)} stroke-dasharray="2 3"/>`, k);

// ---- side views (the fibre lying left to right, as under a microscope) ----
function sideCotton() {
  // a flat ribbon that twists on itself now and then: the convolutions. Its two edges swap sides
  // at every twist; the lumen is the faint canal down the middle.
  const e1 = [], e2 = [], mid = [];
  for (let x = XS.x0; x <= XS.x1; x += 2) {
    const ph = Math.PI * ((x - XS.x0) / 44 + 0.22 * Math.sin((x - XS.x0) / 19)), c = Math.cos(ph);
    const w = 10.5 * c, lift = 1.4 * Math.sin(x / 13);
    e1.push({ x, y: 80 + lift - w - 1.2 * Math.sign(c || 1) }); e2.push({ x, y: 80 + lift + w + 1.2 * Math.sign(c || 1) });
    mid.push({ x, y: 80 + lift, on: Math.abs(c) > 0.45 });
  }
  const lumen = []; let cur = [];
  for (const p of mid) { if (p.on) cur.push(p); else { if (cur.length > 2) lumen.push(cur); cur = []; } }
  if (cur.length > 2) lumen.push(cur);
  return { edges: [poly(e1), poly(e2)], marks: lumen.map(poly).join(''), h: 14 };
}
function sideWool() {
  // overlapping cuticle scales, their free edges pointing to the tip (right): the silhouette is a
  // ratchet, and each scale edge runs part-way round the fibre
  const r = rng(DRAW.SEED + 31), R = 12.5, top = [], bot = [], steps = [];
  let x = XS.x0, next = XS.x0 + 6 + r() * 6;
  for (; x <= XS.x1; x += 1) {
    if (x >= next) { steps.push(x); next = x + 15 + r() * 8; }
    const since = steps.length ? x - steps[steps.length - 1] : x - XS.x0 + 6, lip = 2.2 * Math.max(0, 1 - since / 14);
    top.push({ x, y: 80 - R - lip }); bot.push({ x, y: 80 + R + lip * 0.8 });
  }
  let marks = '';
  for (const sx of steps) {
    // the edge of one scale: an irregular arc across the fibre, bulging toward the tip
    const b = 3 + r() * 3.5, j = (r() - 0.5) * 5;
    marks += `M${f1(sx)},${f1(80 - R - 2)}C${f1(sx + b)},${f1(80 - R * 0.45)} ${f1(sx + b + j)},${f1(80 + R * 0.3)} ${f1(sx - 1 + j * 0.3)},${f1(80 + R + 1.6)}`;
  }
  return { edges: [poly(top), poly(bot)], marks, h: 18 };
}
function sideSmooth(R, striae = []) {
  // a featureless filament; striae = offsets of faint lengthwise lines (viscose's grooves, seen side-on)
  const line = (o, wob) => poly(Array.from({ length: 35 }, (_, i) => { const x = XS.x0 + (XS.x1 - XS.x0) * i / 34; return { x, y: 80 + o + wob * Math.sin(x / 17 + o) }; }));
  return { edges: [line(-R, 0), line(R, 0)], faint: striae.map(o => line(o, 0.5)).join(''), h: R + 5 };
}
// ---- cut faces ----
function bean(a, b, R, wob = 0.1) {
  // an ellipse bent round an arc: the collapsed, kidney-shaped cotton section
  const pts = [];
  for (let i = 0; i < 110; i++) {
    const th = TAU * i / 110, u = a * Math.cos(th), v = b * Math.sin(th) * (1 + wob * Math.sin(3 * th + 1.1));
    const ph = u / R; pts.push({ x: (R + v) * Math.sin(ph), y: (R + v) * Math.cos(ph) - R });
  }
  const ys = pts.map(p => p.y), my = (Math.min(...ys) + Math.max(...ys)) / 2;
  return pts.map(p => ({ x: XS.C.x + p.x, y: XS.C.y + (p.y - my) }));
}
function roundedTri(cx, cy, Rv, rc, rot) {
  // a triangle with rounded corners: its three vertices pushed out by a circle of radius rc
  const V = [0, 1, 2].map(k => ({ x: Rv * Math.cos(rot + k * TAU / 3), y: Rv * Math.sin(rot + k * TAU / 3) })), pts = [];
  for (let i = 0; i < 120; i++) {
    const a = TAU * i / 120, dx = Math.cos(a), dy = Math.sin(a);
    let best = V[0], bd = -1e9; for (const v of V) { const d = v.x * dx + v.y * dy; if (d > bd) { bd = d; best = v; } }
    pts.push({ x: cx + best.x + rc * dx, y: cy + best.y + rc * dy });
  }
  return pts;
}
// a spinneret plate seen face-on, with its orifice (petrol): what a melt-spun filament is shaped by
function plate(orifice, k) {
  const { x, y } = XS.L, h = 38;
  return fade(`<rect x="${x - h}" y="${y - h}" width="${2 * h}" height="${2 * h}" rx="7" ${stroke(1.3, 0.6)}/>`
    + [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => `<circle cx="${x + a * 28}" cy="${y + b * 28}" r="2" ${stroke(1, 0.4)}/>`).join(''), seg(k, 0, 0.5))
    + drawOn(orifice, ease(seg(k, 0.3, 1)), `stroke="${PETROL}" stroke-width="4.4" stroke-linecap="round"`);
}
const spokes = (n, r0, r1, rot) => Array.from({ length: n }, (_, i) => { const a = rot + TAU * i / n; return `M${f1(XS.L.x + r0 * Math.cos(a))},${f1(XS.L.y + r0 * Math.sin(a))}L${f1(XS.L.x + r1 * Math.cos(a))},${f1(XS.L.y + r1 * Math.sin(a))}`; }).join('');
const arcs = (n, r, gap, rot) => Array.from({ length: n }, (_, i) => {
  const a0 = rot + TAU * i / n + gap / 2, a1 = rot + TAU * (i + 1) / n - gap / 2;
  return `M${f1(XS.L.x + r * Math.cos(a0))},${f1(XS.L.y + r * Math.sin(a0))}A${r},${r} 0 0 1 ${f1(XS.L.x + r * Math.cos(a1))},${f1(XS.L.y + r * Math.sin(a1))}`;
}).join('');

// one scene from its parts. left(k) draws the left half; outline is the cut face's path(s);
// inner = ink detail inside the face, mark = the petrol feature
function xsScene({ left, hCut, outline, inner = '', mark = '', markFill = false }) {
  return {
    viewBox: XS.vb, duration: 4200,
    markup(t) {
      const a = seg(t, 0.04, 0.4), ar = seg(t, 0.36, 0.48), b = ease(seg(t, 0.44, 0.8)), c = ease(seg(t, 0.76, 0.98));
      let s = left(a);
      if (hCut) s += cutMark(seg(t, 0.3, 0.4), hCut);
      s += cutArrow(ar);
      for (const d of [].concat(outline)) s += drawOn(d, b, stroke(SW + 0.3));
      s += fade(inner, c);
      if (mark) s += fade(`<path d="${mark}" stroke="${PETROL}" stroke-width="1.5"${markFill ? ` fill="${PETROL}" fill-opacity="0.18"` : ''}/>`, c);
      return group(s);
    },
  };
}
const sideLeft = side => k => {
  const e = ease(k);
  return side.edges.map(d => drawOn(d, e, stroke())).join('')
    + (side.faint ? fade(`<path d="${side.faint}" ${stroke(1, 0.38)}/>`, seg(k, 0.6, 1)) : '')
    + (side.marks ? fade(`<path d="${side.marks}" stroke="${PETROL}" stroke-width="1.1"${op(0.9)}/>`, seg(k, 0.55, 1)) : '');
};

const XSCENES = (() => {
  const C = XS.C, S = {};
  // cotton: kidney bean, the lumen a flattened slit along its middle
  { const side = sideCotton();
    S['xs-cotton'] = xsScene({ left: sideLeft(side), hCut: side.h, outline: closed(bean(47, 17, 40)), mark: closed(bean(24, 2.6, 40, 0)), markFill: true }); }
  // wool: near-round; the cuticle a thin skin whose scale edges stand proud, the cortex inside
  { const side = sideWool(), n = 9, saw = a => { const f = ((a * n / TAU) % 1 + 1) % 1; return 1 + 0.045 * f; };
    const out = polar(C.x, C.y, a => 41 * saw(a) * (1 + 0.04 * Math.cos(2 * a + 0.5)), 180);
    const cortex = closed(polar(C.x, C.y, a => 36.5 * (1 + 0.04 * Math.cos(2 * a + 0.5)), 90));
    const ticks = Array.from({ length: n }, (_, i) => { const a = TAU * i / n - 0.012, r1 = 41 * 1.045 * (1 + 0.04 * Math.cos(2 * a + 0.5)); return `M${f1(C.x + (r1 - 6) * Math.cos(a))},${f1(C.y + (r1 - 6) * Math.sin(a))}L${f1(C.x + (r1 + 1) * Math.cos(a))},${f1(C.y + (r1 + 1) * Math.sin(a))}`; }).join('');
    S['xs-wool'] = xsScene({ left: sideLeft(side), hCut: side.h, outline: closed(out), inner: `<path d="${cortex}" ${stroke(1, 0.4)}/>`, mark: ticks }); }
  // silk: two rounded-triangular filaments (brins) as the silkworm lays them, flat faces together,
  // in a coat of gum (sericin, dashed) that degumming removes
  { const side = sideSmooth(8.5), tl = roundedTri(C.x - 23, C.y, 17, 8, Math.PI), tr = roundedTri(C.x + 23, C.y, 17, 8, 0);
    const gum = closed(polar(C.x, C.y, a => 1 / Math.hypot(Math.cos(a) / 60, Math.sin(a) / 37), 80));
    S['xs-silk'] = xsScene({ left: sideLeft(side), hCut: side.h, outline: [closed(tl), closed(tr)], inner: `<path d="${gum}" ${stroke(1, 0.4)} stroke-dasharray="3 4"/>` }); }
  // viscose: a serrated (crenulated) outline; side-on the grooves read as lengthwise striations
  { const side = sideSmooth(11.5, [-6.5, -2, 3, 7.5]);
    const out = polar(0, 0, a => 38 * (1 + 0.1 * Math.cos(11 * a + 0.7 * Math.sin(2 * a)) + 0.045 * Math.cos(5 * a + 1)), 220).map(p => ({ x: C.x + p.x * 1.14, y: C.y + p.y * 0.9 }));
    S['xs-viscose'] = xsScene({ left: sideLeft(side), hCut: side.h, outline: closed(out) }); }
  // round: a round hole makes a round filament
  { const out = closed(polar(C.x, C.y, () => 40));
    S['xs-round'] = xsScene({ left: k => plate(`M${XS.L.x},${XS.L.y}h0.01`, k).replace('stroke-width="4.4"', 'stroke-width="13"'), outline: out }); }
  // trilobal: a Y-shaped slot makes three lobes
  { const rot = -Math.PI / 2, r = a => 46 * (0.7 + 0.3 * Math.cos(3 * (a - rot)));
    const out = closed(polar(C.x, C.y, r, 150));
    S['xs-trilobal'] = xsScene({ left: k => plate(spokes(3, 0, 17, rot), k), outline: out }); }
  // hollow: arc-shaped slots whose streams fuse into a tube around a core of still air
  { S['xs-hollow'] = xsScene({ left: k => plate(arcs(3, 13, 0.5, -Math.PI / 2), k), outline: closed(polar(C.x, C.y, () => 40)), mark: closed(polar(C.x, C.y, () => 17, 60)), markFill: true }); }
  // channelled: a cross-shaped slot makes deep grooves down the filament; water is held and moved along them
  { const r = a => 44 * Math.max(0.36, 0.36 + 0.64 * Math.pow(Math.abs(Math.cos(2 * a)), 1.5));
    const out = closed(polar(C.x, C.y, r, 200));
    let water = '';
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + k * Math.PI / 2, d = 0.42, p0 = { x: C.x + 27 * Math.cos(a - d), y: C.y + 27 * Math.sin(a - d) }, p1 = { x: C.x + 27 * Math.cos(a + d), y: C.y + 27 * Math.sin(a + d) };
      const q = { x: C.x + 19 * Math.cos(a), y: C.y + 19 * Math.sin(a) }, base = { x: C.x + 16.5 * Math.cos(a), y: C.y + 16.5 * Math.sin(a) };
      water += `M${f1(p0.x)},${f1(p0.y)}Q${f1(q.x)},${f1(q.y)} ${f1(p1.x)},${f1(p1.y)}L${f1(base.x)},${f1(base.y)}Z`;
    }
    S['xs-channel'] = xsScene({ left: k => plate(spokes(4, 0, 17, 0), k), outline: out, mark: water, markFill: true }); }
  return S;
})();

// =====================================================================================
// SECTION 08 — THREE WEAVES, EACH BESIDE ITS DRAFT
// =====================================================================================
const WV = { n: 8, pitch: 26, x0: 78, yB: 254, xL: 50, xR: 288, yT: 30, yBot: 296, dx: 322, teal: 3 };
WV.xs = Array.from({ length: WV.n }, (_, i) => WV.x0 + WV.pitch * i);
WV.ys = Array.from({ length: WV.n }, (_, j) => WV.yB - WV.pitch * j);          // pick 0 at the bottom: woven first
WV.vb = `40 32 ${WV.dx + WV.n * WV.pitch + 8 - 40} 262`;
// up(i, j): is warp end i over pick j? — /weave's own drawdown of /weave's own preset
function interlacing(preset) {
  const s = applyPreset(blankState(2, 2, WV.n, WV.n), preset), dd = drawdown(s);
  return (i, j) => dd[j * WV.n + i] === 1;
}
function weaveScene(preset, repeat, extras = () => '') {
  const up = interlacing(preset), { n, pitch } = WV, id = 'tf-' + preset;
  // the first warp float that lies wholly inside the picture, on an inner end: [i, j0, j1]
  let float = null;
  for (let i = 2; i < n - 1 && !float; i++) for (let j = 1; j < n - 1; j++) {
    if (up(i, j) && !up(i, j - 1)) { let e = j; while (e + 1 < n && up(i, e + 1)) e++; if (e > j && e < n - 1) { float = [i, j, e]; break; } }
  }
  return {
    viewBox: WV.vb, duration: 7000, up, float,
    markup(t) {
      const pick = j => ease(seg(t, 0.05 + j * 0.86 / n, 0.05 + (j + 1) * 0.86 / n));     // bottom pick first
      const ltr = j => j % 2 === 0;
      const tipX = j => ltr(j) ? lerp(WV.xL, WV.xR, pick(j)) : lerp(WV.xR, WV.xL, pick(j));
      const reached = (j, x) => pick(j) >= 1 || (pick(j) > 0 && (ltr(j) ? tipX(j) > x : tipX(j) < x));
      const strands = [];
      WV.xs.forEach((x, i) => strands.push({
        d: `M${x},${WV.yBot}L${x},${WV.yT}`, color: INK, op: 0.6,
        notches: WV.ys.flatMap((y, j) => !up(i, j) && reached(j, x) ? [[x, y, 1, 0]] : []),
      }));
      WV.ys.forEach((y, j) => strands.push({
        d: ltr(j) ? `M${WV.xL},${y}L${WV.xR},${y}` : `M${WV.xR},${y}L${WV.xL},${y}`, color: j === WV.teal ? PETROL : INK, op: 1, dash: pick(j),
        notches: WV.xs.flatMap((x, i) => up(i, j) ? [[x, y, 0, 1]] : []),
      }));
      let s = tubes(id, strands);
      // the point-paper draft, row for row beside the cloth: a filled square = the warp is on top there
      const h = pitch / 2, gx = WV.dx, gy = WV.ys[n - 1] - h; let grid = '', cells = '';
      for (let k = 0; k <= n; k++) grid += `M${gx + k * pitch},${gy}V${gy + n * pitch}M${gx},${gy + k * pitch}H${gx + n * pitch}`;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (up(i, j) && reached(j, WV.xs[i])) cells += `M${gx + i * pitch + 2.5},${WV.ys[j] - h + 2.5}h${pitch - 5}v${pitch - 5}h${-(pitch - 5)}Z`;
      s += `<path d="${grid}" fill="none" stroke="${LINE}" stroke-width="1"/><path d="${cells}" fill="${INK}" fill-opacity="0.88"/>`;
      // the petrol pick's row of the draft
      s += fade(`<rect x="${gx}" y="${WV.ys[WV.teal] - h}" width="${n * pitch}" height="${pitch}" fill="none" stroke="${PETROL}" stroke-width="1.6"/>`, pick(WV.teal));
      const end = ease(seg(t, 0.92, 1));
      // one repeat of the weave, outlined
      s += fade(`<rect x="${gx - 3}" y="${WV.ys[repeat - 1] - h - 3}" width="${repeat * pitch + 6}" height="${repeat * pitch + 6}" fill="none" stroke="${INK}" stroke-width="1.2" stroke-opacity="0.75" stroke-dasharray="4 3"/>`, end);
      // a warp float, bracketed on the cloth
      if (float) {
        const [i, j0, j1] = float, x = WV.xs[i] - 9.5, ya = WV.ys[j1] - 9, yb = WV.ys[j0] + 9;
        s += fade(`<path d="M${x + 4},${ya}H${x}V${yb}H${x + 4}" fill="none" stroke="${BG}" stroke-width="5"/><path d="M${x + 4},${ya}H${x}V${yb}H${x + 4}" fill="none" stroke="${PETROL}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`, end);
      }
      return s + fade(extras(gx, gy), end);
    },
  };
}
// the twill line: the diagonal the interlacings step along, drawn over the draft
const twillLine = (gx, gy) => `<path d="M${gx + WV.pitch / 2},${gy + WV.n * WV.pitch}L${gx + WV.n * WV.pitch},${gy + WV.pitch / 2}" fill="none" stroke="${PETROL}" stroke-width="1.6" stroke-dasharray="5 4" stroke-linecap="round"/>`;
const WEAVES = {
  'weave-plain': weaveScene('plain', 2),
  'weave-twill': weaveScene('twill22', 4, twillLine),
  'weave-satin': weaveScene('satin5', 5),
};

// =====================================================================================
// SECTION 02 — MOISTURE REGAIN, BY FIBRE CLASS
// =====================================================================================
// Moisture regain measured at 65 % RH, 20 C, % of oven-dry mass: [name, bar value, label]. The bar
// is the middle of the quoted range (docs/textile-101-accuracy.md has each figure's source).
export const REGAIN = [
  { cls: 'Natural', color: MINT, mark: 'circle', rows: [['Wool', 16, '14\u201318'], ['Silk', 10.5, '10\u201311'], ['Cotton', 7.5, '7\u20138']] },
  { cls: 'Manufactured \u00b7 cellulosic', color: INDIGO, mark: 'square', rows: [['Viscose', 13, '12\u201314'], ['Lyocell', 11.5, '11\u201313'], ['Acetate', 6.5, '6\u20136.5']] },
  { cls: 'Manufactured \u00b7 synthetic', color: PLUM, mark: 'diamond', rows: [['Nylon 6,6', 4.1, '3.8\u20134.5'], ['Acrylic', 1.5, '1\u20132'], ['Polyester', 0.4, '0.4'], ['Polypropylene', 0, '~0']] },
];
const RG = { w: 360, x0: 116, perPct: 11.2, row: 22, head: 26, top: 8 };
const marker = (kind, x, y, c) => kind === 'circle' ? `<circle cx="${x}" cy="${y}" r="4.2" fill="${c}"/>`
  : kind === 'square' ? `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" fill="${c}"/>`
  : `<path d="M${x},${y - 5.2}L${x + 5.2},${y}L${x},${y + 5.2}L${x - 5.2},${y}Z" fill="${c}"/>`;
const regainScene = (() => {
  const nRows = REGAIN.reduce((a, g) => a + g.rows.length, 0), H = RG.top + REGAIN.length * RG.head + nRows * RG.row + 26;
  return {
    viewBox: `0 0 ${RG.w} ${H}`, duration: 3600, height: H,
    markup(t) {
      let s = '', y = RG.top, idx = 0;
      const yAxis = H - 22;
      for (const p of [0, 5, 10, 15, 20]) {
        const x = RG.x0 + p * RG.perPct;
        s += `<path d="M${x},${RG.top}V${yAxis}" stroke="${LINE}" stroke-width="1"${p ? ' stroke-dasharray="2 4"' : ''}/><text x="${x}" y="${H - 6}" text-anchor="middle" class="tx-fig-t tx-fig-t--dim">${p}%</text>`;
      }
      for (const g of REGAIN) {
        s += marker(g.mark, 10, y + RG.head / 2 + 2, g.color) + `<text x="22" y="${y + RG.head / 2 + 6}" class="tx-fig-t tx-fig-t--head">${g.cls.toUpperCase()}</text>`;
        y += RG.head;
        for (const [name, v, label] of g.rows) {
          const k = ease(seg(t, 0.04 + idx * 0.045, 0.42 + idx * 0.045)), w = Math.max(v * RG.perPct * k, v === 0 ? 0 : 1.5);
          s += `<text x="${RG.x0 - 8}" y="${y + RG.row / 2 + 4}" text-anchor="end" class="tx-fig-t">${name}</text>`;
          if (v > 0) s += `<rect x="${RG.x0}" y="${y + 5}" width="${f1(w)}" height="${RG.row - 10}" fill="${g.color}"/>`;
          else s += `<path d="M${RG.x0},${y + 4}V${y + RG.row - 4}" stroke="${g.color}" stroke-width="2"/>`;
          s += fade(`<text x="${f1(RG.x0 + v * RG.perPct + 6)}" y="${y + RG.row / 2 + 4}" class="tx-fig-t tx-fig-t--dim">${label}</text>`, seg(k, 0.85, 1));
          y += RG.row; idx++;
        }
      }
      return s;
    },
  };
})();

export const FIGURES = { regain: regainScene, ...XSCENES, ...WEAVES };

export function mountFigures(root = document, opts = {}) { return mountScenes(FIGURES, 'data-tx-fig', root, opts); }

// Section 09's two knit panels are baked markup whose strands draw on by CSS. They follow the
// same rule as every other figure: once on scroll-in, hold, replay on hover / tap. Without this
// (no script, or reduced motion) the CSS shows the finished drawing.
export function mountKnitDiagram(root = document, opts = {}) {
  const reduce = opts.reducedMotion ?? (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const host = root.querySelector('.tx-diagram--knit');
  if (!host || reduce || typeof IntersectionObserver !== 'function') return null;
  const paths = [...host.querySelectorAll('.yarn-path')];
  const p = { host, playing: false, played: false };
  let left = 0;
  p.finish = () => { p.playing = false; host.classList.remove('is-playing'); host.classList.add('is-done'); };
  p.play = () => {
    if (p.playing) return;
    p.playing = true; p.played = true; left = paths.length;
    host.classList.remove('is-done'); void host.offsetWidth; host.classList.add('is-playing');
  };
  host.classList.add('is-armed');
  host.addEventListener('animationend', e => { if (e.target.classList.contains('yarn-path') && --left <= 0) p.finish(); });
  host.addEventListener('mouseenter', () => { if (p.played) p.play(); });
  host.addEventListener('click', () => p.play());
  if (opts.autoplay !== false) new IntersectionObserver(es => {
    for (const e of es) { if (e.isIntersecting && !p.played) p.play(); else if (!e.isIntersecting && p.playing) p.finish(); }
  }, { threshold: 0.3 }).observe(host);
  return p;
}
