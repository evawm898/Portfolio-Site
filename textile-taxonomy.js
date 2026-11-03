// textile-taxonomy.js — the fiber / yarn-and-cord / textile-structure panel: twelve small
// animations, one per kind, drawn with ONE stroke language (/textile-basics.js's DRAW):
//
//   * a FIBER is a 1.3-unit line on a background-coloured halo; a strand on the far side of a
//     yarn is dimmed, so occlusion reads by depth order, never by a painted shadow;
//   * a YARN is those fibres laid on a helix about a centreline (Z twist: the near-side fibres
//     of a horizontal yarn run "\"), cut into short chunks drawn back to front when one yarn
//     passes behind another (plied, braided cord);
//   * a FABRIC STRUCTURE is drawn at the knit diagram's scale — yarns as 7-unit tubes with a
//     2-unit halo, and every crossing a notch cut into the strand behind (the knit tile's own
//     rule) — so knit, woven and braid share a stroke weight, a pitch and an occlusion rule.
//
// Material carries through. The staple card is /textile-basics.js's staple material drifting,
// then drafted into an overlapping roving; spun staple starts from exactly that roving and
// twists it. The teal filament the spinneret extrudes is the teal filament of the twisted
// bundle; the monofilament's rod is the corespun yarn's core. Knit and nonwoven ARE the two
// /textile-basics.js scenes (section 09's loop geometry; the staple web).
//
// Every scene is { viewBox, duration, markup(t) }: a pure function of t in [0, 1].
import { DRAW, SCENES as BASIC, VIEW, YARN } from './textile-basics.js';
import { WEFT_PANEL } from './textile-knit-loops.js';

const { INK, ACCENT, BG, SW, HALO, BACK, EDGE, SEED, TAU, rng, seg, ease, lerp, f1, poly,
  runsMarkup, splitRuns, makeFibre, yarnFibrePoints, posedPoints, fiberPose } = DRAW;
const VB = `0 0 ${VIEW.w} ${VIEW.h}`;
// each row crops its scenes to what they draw: fibers 2 : 1, yarns a wide strip (the CSS
// aspect-ratio of .tx-tax__grid--2 / --3 matches these)
const FIBER_VB = { y: 30, h: 160 }, YARN_VB = `0 50 ${VIEW.w} 120`;
const group = inner => `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
const smooth = v => { v = v < 0 ? 0 : v > 1 ? 1 : v; return v * v * (3 - 2 * v); };
const op = v => v < 1 ? ` stroke-opacity="${f1(v * 100) / 100}"` : '';

// ---------- shared pieces ----------
// a spinneret, seen side-on: a plate with an orifice on its right face at (x, y)
function spinneret(x, y, h, hole) {
  const w = 14;
  return `<rect x="${x - w}" y="${f1(y - h / 2)}" width="${w}" height="${h}" rx="1.5" fill="${BG}" stroke="none"/>`
    + `<path d="M${x},${f1(y - hole)}V${f1(y - h / 2)}H${x - w}V${f1(y + h / 2)}H${x}V${f1(y + hole)}" fill="none" stroke="${INK}" stroke-width="1.3" stroke-opacity="0.6" stroke-linejoin="round"/>`;
}
// a smooth solid rod along x (monofilament, corespun core): radius r(x), y the axis.
// Opaque body, a silhouette line each side, a highlight along the upper third; cap = round tip.
function rod(id, x0, x1, y, r, cap) {
  if (x1 <= x0) return '';
  const n = Math.max(2, Math.ceil((x1 - x0) / 4)), T = [], B = [], S = [];
  for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, rr = r(x); T.push({ x, y: y - rr }); B.push({ x, y: y + rr }); S.push({ x, y: y - 0.42 * rr }); }
  const rt = r(x1), tip = cap ? `A${f1(rt * 0.55)},${f1(rt)} 0 0 1 ${f1(x1)},${f1(y + rt)}` : `L${f1(x1)},${f1(y + rt)}`;
  const body = `${poly(T)}${tip}${poly(B.slice().reverse()).replace('M', 'L')}Z`;
  const edge = cap ? `${poly(T)}${tip}${poly(B.slice().reverse()).replace('M', 'L')}` : `${poly(T)}${poly(B)}`;
  const sheen = S.filter(p => p.x > x0 + 6 && p.x < x1 - rt);
  const shade = `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${INK}" stop-opacity="0.62"/><stop offset="0.45" stop-color="${INK}" stop-opacity="0.34"/><stop offset="1" stop-color="${INK}" stop-opacity="0.08"/></linearGradient>`;
  return `<defs>${shade}</defs><path d="${body}" fill="${BG}" stroke="${BG}" stroke-width="${2 * HALO}"/><path d="${body}" fill="url(#${id})" stroke="none"/>`
    + `<path d="${edge}" stroke="${INK}" stroke-width="${SW}" stroke-opacity="0.9"/>`
    + (sheen.length > 1 ? `<path d="${poly(sheen)}" stroke="${INK}" stroke-width="${SW}" stroke-opacity="0.9"/>` : '');
}
// runs (from splitRuns) merged into a few paths: back runs, then one halo under all front runs,
// then the front runs, grouped by colour and opacity. Loses fibre-on-fibre occlusion inside one
// short chunk only; used where a frame would otherwise be thousands of paths.
function mergedRuns(runs, extra = '') {
  const back = runs.filter(r => r.depth < 0), front = runs.filter(r => r.depth >= 0);
  const byStyle = list => { const m = new Map(); for (const r of list) { const k = r.color + '|' + f1(r.op * 100); if (!m.has(k)) m.set(k, { color: r.color, op: r.op, d: '' }); m.get(k).d += poly(r.pts); } return [...m.values()]; };
  let s = '';
  for (const g of byStyle(back)) s += `<path d="${g.d}" stroke="${g.color}" stroke-width="${SW}"${op(g.op)}/>`;
  s += extra;
  if (front.length) s += `<path d="${front.map(r => poly(r.pts)).join('')}" stroke="${BG}" stroke-width="${SW + 2 * HALO}" stroke-linecap="butt"/>`;
  for (const g of byStyle(front)) s += `<path d="${g.d}" stroke="${g.color}" stroke-width="${SW}"${op(g.op)}/>`;
  return s;
}
// yarns along curving 3D centrelines, drawn back to front in short chunks.
// strand = { centre(s) -> {x, y, z}, r, P (Z-twist pitch), fibres [{rho, phi, color, front, back}], s0, s1 }
// A fibre sits at radius rho*r, angle th = phi + TAU s / P about the centreline: offset along
// the centreline's left normal by rho r cos th, toward the viewer by rho r sin th.
function strandsMarkup(strands, step = 2, perChunk = 4) {
  const chunks = [];
  for (const st of strands) {
    const n = Math.ceil((st.s1 - st.s0) / step), C = [];
    for (let k = 0; k <= n; k++) { const s = st.s0 + (st.s1 - st.s0) * k / n; C.push({ s, ...st.centre(s) }); }
    for (let k = 0; k <= n; k++) {
      const a = C[Math.max(0, k - 1)], b = C[Math.min(n, k + 1)], L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      C[k].tx = (b.x - a.x) / L; C[k].ty = (b.y - a.y) / L;
    }
    const at = (c, off) => ({ x: c.x + c.ty * off, y: c.y - c.tx * off });
    const F = st.fibres.map(f => C.map(c => {
      const th = f.phi + TAU * c.s / st.P, rr = f.rho * st.r;
      return { ...at(c, rr * Math.cos(th)), d: rr * Math.sin(th) };
    }));
    for (let a = 0; a < n; a += perChunk) {
      const b = Math.min(n, a + perChunk), part = C.slice(a, b + 1);
      let z = 0; for (const c of part) z += c.z; z /= part.length;
      const runs = [];
      st.fibres.forEach((f, i) => splitRuns(F[i].slice(a, b + 1), f.color, f.front, f.back, runs));
      // splitRuns lifts the teal fibre's near-side runs by 100 so they draw last; keep its sign
      const band = poly(part.map(c => at(c, st.r + 1.8)).concat(part.slice().reverse().map(c => at(c, -st.r - 1.8)))) + 'Z';
      const edges = [1, -1].map(sg => poly(part.map(c => at(c, sg * (st.r + 0.5))))).join('');
      const html = `<path d="${band}" fill="${BG}" stroke="none"/>` + mergedRuns(runs, st.edge ? `<path d="${edges}" stroke="${INK}" stroke-width="${SW}"${op(st.edge)}/>` : '');
      chunks.push({ z, html });
    }
  }
  chunks.sort((p, q) => p.z - q.z);
  return chunks.map(c => c.html).join('');
}
// a twist that runs in from the right: 0 left of the front, 1 behind it
const twistFront = (x, t, a = 0.12, b = 0.92, band = 90) => smooth((lerp(-band, VIEW.w + band, ease(seg(t, a, b))) - (VIEW.w - x)) / band);

// =====================================================================================
// FIBER
// =====================================================================================

// ---------- the staple material: short, crimped, soft fibres, frayed at the tips ----------
// Much shorter than textile-basics' (10–22 units), squiggly with a tight crimp, not every one
// full white, and about a quarter of the tips split into a fine wisp. Spun staple and
// the corespun sheath are made of the same fibres, so the staple card feeds them both.
const STAPLE_N = 200, STAPLE_TEAL = 37, FIB_SW = 1.15, WISP_SW = 0.7, SOFT_HALO = 0.85;
function makeStaple(r, i, accent) {
  const len = accent ? 30 : 10 + r() * 12;
  return {
    i, accent, len,
    camp: 0.8 + r() * 0.7,                    // crimp amplitude: squiggly
    waves: len / (4.5 + r() * 2.5),           // a wave every 4.5–7 units
    cph: r() * TAU,
    rho: accent ? 0.97 : 0.3 + 0.7 * Math.sqrt(r()),
    phi: r() * TAU,
    delay: r() * 0.14,
    op: accent ? 1 : 0.45 + 0.55 * r(),
    fray: [0, 1].map(() => ({ n: r() < 0.26 ? (r() < 0.8 ? 1 : 2) : 0, a: 0.3 + r() * 0.4, l: 1.8 + r() * 1.8, s: r() < 0.5 ? -1 : 1 })),
    hairEnd: (v => v < 0.2 ? 0 : v < 0.38 ? 1 : v < 0.46 ? 2 : -1)(r()),   // spun staple: which end stands proud
  };
}
const STAPLE = (() => {
  const r = rng(SEED + 900), out = [], slots = [...Array(STAPLE_N).keys()];
  for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
  for (let i = 0; i < STAPLE_N; i++) {
    const accent = i === STAPLE_TEAL, f = makeStaple(r, i, accent);
    f.c = accent ? YARN.XC : YARN.X0 + 4 + (slots[i] + r()) / STAPLE_N * (YARN.X1 - YARN.X0 - 8);
    if (accent) f.phi = Math.PI / 2;
    f.x = -30 + r() * 380; f.y = 10 + r() * 200; f.ang = r() * Math.PI;
    if (accent) { f.x = 150; f.y = 104; f.ang = 0.3; }
    f.vx = (r() - 0.5) * 20; f.vy = (r() - 0.5) * 12 + 2; f.spin = (r() - 0.5) * 0.8;
    f.z = accent ? 2 : r();
    out.push(f);
  }
  return out;
})();
// the wisps at a fibre's two ends, splaying from its end tangent
function frayRuns(f, pts, frontOp, backOp, runs) {
  const n = pts.length - 1;
  [0, 1].forEach(e => {
    const p = e ? pts[n] : pts[0], q = e ? pts[n - 2] : pts[2], L = Math.hypot(p.x - q.x, p.y - q.y) || 1;
    const dx = (p.x - q.x) / L, dy = (p.y - q.y) / L, F = f.fray[e];
    if (!F.n) return;
    const angs = F.n === 1 ? [F.s * F.a] : [F.a, -0.7 * F.a];
    angs.forEach((a, k) => {
      const l = F.l * (1 - 0.18 * k), w = [];
      for (let j = 0; j <= 3; j++) {
        const g = a * j / 3, c = Math.cos(g), s = Math.sin(g), r = l * j / 3;
        w.push({ x: p.x + (dx * c - dy * s) * r, y: p.y + (dx * s + dy * c) * r });
      }
      runs.push({ pts: w, depth: p.d + (f.accent && p.d >= 0 ? 100 : 0), color: f.accent ? ACCENT : INK, op: (p.d >= 0 ? frontOp : backOp) * 0.7, sw: WISP_SW });
    });
  });
}
// the soft fibres' renderer: runs sorted by depth into a few layers; each layer is one halo
// under its fibre bodies, then the bodies (smoothed into curves) and their wisps, merged by
// colour and opacity. Occlusion is exact between layers and lost only within one, which keeps a
// frame of 150 fibres to a few dozen paths.
// A short fibre twisted into a yarn needs half the points DRAW.yarnFibrePoints gives a long one.
const thin = pts => pts.filter((p, i) => i % 2 === 0 || i === pts.length - 1);
const SOFT_LAYERS = 7;
function softMarkup(runs) {
  runs.sort((a, b) => a.depth - b.depth);
  let out = '';
  const per = Math.ceil(runs.length / SOFT_LAYERS) || 1;
  for (let L = 0; L < runs.length; L += per) {
    const layer = runs.slice(L, L + per), body = layer.filter(r => !r.sw), wisp = layer.filter(r => r.sw);
    const dOf = r => poly(r.pts);
    if (body.length) out += `<path d="${body.map(dOf).join('')}" stroke="${BG}" stroke-width="${f1(FIB_SW + 2 * SOFT_HALO)}" stroke-linecap="butt"/>`;
    const groups = new Map();
    for (const r of layer) { const k = `${r.color}|${Math.round(r.op * 10)}|${r.sw || FIB_SW}`; if (!groups.has(k)) groups.set(k, { r, d: '' }); groups.get(k).d += dOf(r); }
    for (const { r, d } of groups.values()) out += `<path d="${d}" stroke="${r.color}" stroke-width="${r.sw || FIB_SW}"${op(Math.round(r.op * 10) / 10)}/>`;
  }
  return group(out);
}
// one staple fibre's runs at a pose: body (split by depth) + frayed tips
function stapleRuns(f, pts, frontK, backK, runs) {
  splitRuns(pts, f.accent ? ACCENT : INK, f.op * frontK, f.op * backK, runs);
  frayRuns(f, pts, f.op * frontK, f.op * backK, runs);
}

// ---------- staple: the fibres drifting loose, then drafted into an overlapping roving that has
// just begun to twist. Its end frame is spun staple's first frame. ----------
const STAPLE_DRIFT = 0.42, ROVING_TT = 0.6;      // at tt 0.6 the twist (DRAW.yarnFibrePoints) is 0.09
const stapleScene = {
  viewBox: `0 ${FIBER_VB.y} ${VIEW.w} ${FIBER_VB.h}`, duration: 7600,
  markup(t) {
    const runs = [];
    for (const f of STAPLE) {
      if (t < STAPLE_DRIFT) stapleRuns(f, posedPoints(f, fiberPose(f, t / STAPLE_DRIFT), f.z), 1, 1, runs);
      else { const { pts, yarnness } = yarnFibrePoints(f, ROVING_TT * seg(t, STAPLE_DRIFT, 1)); stapleRuns(f, thin(pts), 1, lerp(1, BACK, yarnness), runs); }
    }
    return softMarkup(runs);
  },
};

// ---------- filament: one continuous strand, extruded from a spinneret and wound onto a spool.
// It runs from the orifice, through a traverse guide that slides up and down, onto the turning
// package, so it is attached at both ends and never shows a free one. The package is the
// filament's own helix seen side-on: each point keeps the height and radius it was laid at and
// turns with the spool, so the wraps cross-wind into the diamond pattern of a real bobbin. ----------
const SP = { cx: 238, yT: 66, yB: 172, frx: 46, fry: 9, rb: 13, rMax: 33, passes: 20, perPass: 3.37, gx: 164, ox: 30, oy: 119, samples: 22, sw: 0.9, halo: 0.55 };
SP.W = SP.passes * SP.perPass;                                     // wraps laid in the whole animation. perPass is irrational-ish on purpose: a whole-number ratio of wraps to traverses would lay every cycle exactly on top of the last
const spY0 = SP.yT + 9, spY1 = SP.yB - 9;
const spTrav = w => { const p = w / SP.perPass, k = Math.floor(p), u = p - k; return k % 2 === 0 ? lerp(spY0, spY1, u) : lerp(spY1, spY0, u); };
const spR = w => SP.rb + (SP.rMax - SP.rb) * Math.min(1, w / SP.W);
function spoolWraps(n) {
  // every wound point, w in [0, n] wraps, at its current angle from the landing point
  const runs = [], steps = Math.ceil(n * SP.samples);
  let cur = null;
  for (let j = 0; j <= steps; j++) {
    const w = n * j / Math.max(1, steps), th = TAU * (n - w), m = ((th % TAU) + TAU) % TAU;
    if (m <= Math.PI) { const r = spR(w); (cur || (cur = [])).push({ x: SP.cx - r * Math.cos(m), y: spTrav(w) }); }
    else if (cur) { if (cur.length > 1) runs.push(cur); cur = null; }
  }
  if (cur && cur.length > 1) runs.push(cur);
  return runs;                                                      // oldest first: later wraps draw on top
}
const filamentScene = {
  viewBox: `0 ${FIBER_VB.y} ${VIEW.w} ${FIBER_VB.h}`, duration: 7000,
  markup(t) {
    const n = SP.W * ease(seg(t, 0.04, 0.96)), y = spTrav(n), r = spR(n), phi = TAU * n;
    const ell = (yy, fill, sop) => `<ellipse cx="${SP.cx}" cy="${yy}" rx="${SP.frx}" ry="${SP.fry}" fill="${fill}" stroke="${INK}" stroke-width="${SW}" stroke-opacity="${sop}"/>`;
    let s = ell(SP.yB, BG, 0.5);
    // the barrel, then the package wound on it
    s += `<rect x="${SP.cx - SP.rb}" y="${SP.yT}" width="${2 * SP.rb}" height="${SP.yB - SP.yT}" fill="${BG}" stroke="${INK}" stroke-width="${SW}" stroke-opacity="0.35"/>`;
    s += `<rect x="${f1(SP.cx - r)}" y="${spY0 - 2}" width="${f1(2 * r)}" height="${spY1 - spY0 + 4}" fill="${BG}"/>`;
    for (const run of spoolWraps(n)) s += `<path d="${poly(run)}" stroke="${BG}" stroke-width="${SP.sw + 2 * SP.halo}"/><path d="${poly(run)}" stroke="${ACCENT}" stroke-width="${SP.sw}" stroke-opacity="0.85"/>`;
    s += ell(SP.yT, BG, 0.6) + `<circle cx="${SP.cx}" cy="${SP.yT}" r="3" fill="${BG}" stroke="${INK}" stroke-width="${SW}" stroke-opacity="0.6"/>`;
    // the traverse guide on its rail, and the strand: orifice -> guide -> package
    s += `<path d="M${SP.gx},${SP.yT - 4}V${SP.yB + 4}" stroke="${INK}" stroke-width="${SW}" stroke-opacity="0.18"/>`;
    const land = { x: SP.cx - r, y }, g = { x: SP.gx, y };
    const strand = [];
    for (let j = 0; j <= 24; j++) { const u = j / 24, sag = 4 * Math.sin(Math.PI * u); strand.push({ x: lerp(SP.ox, g.x, u), y: lerp(SP.oy, g.y, u) + sag }); }
    strand.push(land);
    // draw-down: the strand leaves the orifice thick and is drawn fine within a few widths
    let taper = '';
    for (let k = 0; k < 5; k++) { const e = lerp(SP.ox, g.x, (5 - k) / 5 * 0.12), y0 = SP.oy, y1 = lerp(SP.oy, g.y, (5 - k) / 5 * 0.12); taper += `<path d="M${SP.ox},${y0}L${f1(e)},${f1(y1)}" stroke="${ACCENT}" stroke-width="${f1(SW + 2.4 * (k + 1) / 5)}"/>`; }
    s += `<path d="${poly(strand)}" stroke="${BG}" stroke-width="${SW + 2 * HALO}"/><path d="${poly(strand)}" stroke="${ACCENT}" stroke-width="${SW}"/>${taper}`;
    s += `<circle cx="${g.x}" cy="${f1(g.y)}" r="3.2" fill="none" stroke="${INK}" stroke-width="${SW}" stroke-opacity="0.7"/>`;
    return spinneret(SP.ox, SP.oy, 34, 2.4) + group(s);
  },
};

// =====================================================================================
// YARN AND CORD
// =====================================================================================

// ---------- spun staple: the staple card's roving, twisted tight. A third of the fibres keep an
// end proud of the surface as the twist packs them in — the hairiness a filament yarn never has.
const HAIR_U = 0.28, HAIR_L = 7;
function hairy(f, pts, k) {
  const which = f.hairEnd; if (k <= 0 || which < 0 || f.accent) return pts;
  const n = pts.length - 1, out = pts.map(p => ({ ...p }));
  const ends = which === 2 ? [0, 1] : [which];
  for (const e of ends) {
    // the end leaves on whichever side of the axis it already sits
    const j0 = Math.round((e ? 1 - HAIR_U : HAIR_U) * n), side = Math.sign(YARN.Y - pts[j0].y) || (f.i % 2 ? 1 : -1);
    for (let j = 0; j <= n; j++) {
      const u = j / n, w = e ? (u - (1 - HAIR_U)) / HAIR_U : (HAIR_U - u) / HAIR_U;
      if (w <= 0) continue;
      out[j].y -= side * k * HAIR_L * Math.pow(w, 1.5);
      out[j].x += (e ? 1 : -1) * k * 2 * w * w;
    }
  }
  return out;
}
const spunScene = {
  viewBox: YARN_VB, duration: 6000,
  markup(t) {
    const tt = lerp(ROVING_TT, 1, t), hk = ease(seg(t, 0.25, 0.95)), runs = [];
    for (const f of STAPLE) { const { pts } = yarnFibrePoints(f, tt); stapleRuns(f, hairy(f, thin(pts), hk), 1, BACK, runs); }
    return softMarkup(runs);
  },
};

// ---------- monofilament: one thick filament, extruded straight and stiff ----------
const MONO = { y: 110, r: 12, x0: 28 };
const monoR = x => MONO.r + 4.5 * Math.exp(-(x - MONO.x0) / 9);          // die swell, then the drawn size
const monoScene = {
  viewBox: YARN_VB, duration: 4600,
  markup(t) {
    const tip = lerp(MONO.x0 + 2, 360, ease(seg(t, 0.06, 0.9)));
    return group(rod('tt-mono-g', MONO.x0, tip, MONO.y, monoR, true)) + spinneret(MONO.x0, MONO.y, 66, MONO.r + 4.5);
  },
};

// ---------- twisted filament: a bundle of continuous filaments, twisted. No ends, no hair ----------
const TW = { y: 110, R0: 24, R1: 14, P: TAU * 14 / Math.tan(30 * Math.PI / 180), x0: -12, x1: VIEW.w + 12 };
const TW_FIL = (() => {
  const out = [{ rho: 0, phi: 0 }];
  for (let k = 0; k < 6; k++) out.push({ rho: 0.5, phi: k * TAU / 6 + 0.3 });
  for (let k = 0; k < 9; k++) out.push({ rho: 0.96, phi: k * TAU / 9 });
  out[10].accent = true;     // the spinneret's teal filament
  return out;
})();
const twistedScene = {
  viewBox: YARN_VB, duration: 5600,
  markup(t) {
    const n = 170, xs = [], T = [];
    for (let j = 0; j <= n; j++) { const x = lerp(TW.x0, TW.x1, j / n); xs.push(x); T.push(twistFront(x, t)); }
    // accumulated twist angle from the left edge
    const acc = [0]; for (let j = 1; j <= n; j++) acc.push(acc[j - 1] + TAU * (T[j] + T[j - 1]) / 2 * (xs[j] - xs[j - 1]) / TW.P);
    const runs = [];
    for (const f of TW_FIL) {
      const pts = xs.map((x, j) => { const R = lerp(TW.R0, TW.R1, T[j]), th = f.phi + acc[j]; return { x, y: TW.y - f.rho * R * Math.cos(th), d: f.rho * R * Math.sin(th) + (f.rho ? 0 : 0.01) }; });
      splitRuns(pts, f.accent ? ACCENT : INK, 1, BACK, runs);
    }
    return group(runsMarkup(runs));
  },
};

// ---------- plied: two Z-twisted singles, plied together with an S twist ----------
// S twist: the singles' axes wind as a LEFT-handed helix, so their near-side stretches run "/"
// on a horizontal yarn — opposite to the "\" of the fibres inside each single.
function singleFibres(seed, n, color, front, back) {
  const r = rng(seed), out = [];
  for (let i = 0; i < n; i++) out.push({ rho: 0.3 + 0.7 * Math.sqrt(r()), phi: r() * TAU, color, front, back });
  return out;
}
const PLY = { y: 110, rs: 10, Ps: TAU * 10 / Math.tan(38 * Math.PI / 180), Pp: 128, apart: 2.1 };
const PLY_A = singleFibres(SEED + 60, 18, INK, 1, BACK);
const PLY_B = singleFibres(SEED + 61, 18, INK, 0.58, 0.22);
PLY_A[3].color = ACCENT;
const pliedScene = {
  viewBox: YARN_VB, duration: 6400,
  markup(t) {
    // the ply twist runs in from the right, pulling the singles together as it goes
    const n = 200, x0 = -14, x1 = VIEW.w + 14, xs = [], Tp = [];
    for (let j = 0; j <= n; j++) { const x = lerp(x0, x1, j / n); xs.push(x); Tp.push(twistFront(x, t, 0.1, 0.92, 110)); }
    const psi = [0]; for (let j = 1; j <= n; j++) psi.push(psi[j - 1] - TAU * (Tp[j] + Tp[j - 1]) / 2 * (xs[j] - xs[j - 1]) / PLY.Pp);
    const at = x => { const k = Math.max(0, Math.min(n - 1e-9, (x - x0) / (x1 - x0) * n)), j = Math.floor(k), u = k - j; return { tp: lerp(Tp[j], Tp[j + 1], u), ps: lerp(psi[j], psi[j + 1], u) }; };
    const centre = phase => s => { const { tp, ps } = at(s), Rp = PLY.rs * lerp(PLY.apart, 1.02, tp), a = ps + phase; return { x: s, y: PLY.y - Rp * Math.cos(a), z: Rp * Math.sin(a) }; };
    const st = (phase, fibres) => ({ centre: centre(phase), r: PLY.rs, P: PLY.Ps, fibres, s0: x0, s1: x1, edge: 0.32 });
    return group(strandsMarkup([st(0, PLY_A), st(Math.PI, PLY_B)]));
  },
};

// ---------- corespun: a smooth filament core; staple fibres gather round it and are twisted
// into a sheath that stops short, so the bare core runs on out of the yarn's end ----------
const CORE = { r: 6, sheathEnd: 222 };
const CORE_FIB = (() => {
  const r = rng(SEED + 70), out = [], n = 160;
  for (let i = 0; i < n; i++) {
    const f = makeStaple(r, 300 + i, i === 47);
    f.c = -18 + (i + r()) / n * (CORE.sheathEnd + 18);
    if (f.accent) f.c = 150;
    f.rho = 0.44 + 0.56 * Math.sqrt(r()); f.phi = r() * TAU;
    // loose staple around the core before it is gathered
    f.x = f.c + (r() - 0.5) * 70; f.y = YARN.Y + (r() < 0.5 ? -1 : 1) * (30 + r() * 40); f.ang = r() * Math.PI;
    f.vx = (r() - 0.5) * 18; f.vy = (r() - 0.5) * 10; f.spin = (r() - 0.5) * 0.6; f.z = r(); f.delay = r() * 0.12;
    out.push(f);
  }
  return out;
})();
const coreScene = {
  viewBox: YARN_VB, duration: 7200,
  markup(t) {
    const coreTip = lerp(-12, 370, ease(seg(t, 0, 0.24))), tt = seg(t, 0.14, 1), runs = [];
    for (const f of CORE_FIB) { const { pts, yarnness } = yarnFibrePoints(f, tt); stapleRuns(f, thin(pts), 1, lerp(1, BACK, yarnness), runs); }
    // back of the sheath, the core, the front of the sheath
    const back = runs.filter(r => r.depth < 0), front = runs.filter(r => r.depth >= 0);
    const core = rod('tt-core-g', -12, coreTip, YARN.Y, () => CORE.r, coreTip < VIEW.w + 20);
    return softMarkup(back) + group(core) + softMarkup(front);
  },
};

// ---------- braided cord: three strands plaited into one cord ----------
// The classic three-strand plait: strand k at phase a = w s + 2 pi k / 3 sits at height sin(a)
// and depth sin(2a) / 2, so wherever two strands cross, one is in front by 0.87 of the swing.
// The plait forms from the left; to the right of the work the three strands lie loose.
const CORD = { y: 110, rs: 7, A: 17.5, w: TAU / 118, P: TAU * 7 / Math.tan(32 * Math.PI / 180) };
const CORD_FIB = [0, 1, 2].map(k => singleFibres(SEED + 80 + k, 10, k === 2 ? ACCENT : INK, k === 1 ? 0.55 : 1, k === 1 ? 0.2 : BACK));
const cordScene = {
  viewBox: YARN_VB, duration: 6400,
  markup(t) {
    const front = lerp(-60, VIEW.w + 100, ease(seg(t, 0.06, 0.94)));
    const loose = [0, 1.65, -1.65];
    const centre = k => s => {
      const b = smooth((front - s) / 70), a = CORD.w * s + TAU * k / 3;
      const off = lerp(loose[k] * CORD.A, CORD.A * Math.sin(a), b), z = b * CORD.A / 2 * Math.sin(2 * a);
      return { x: s, y: CORD.y - off, z };
    };
    return group(strandsMarkup([0, 1, 2].map(k => ({ centre: centre(k), r: CORD.rs, P: CORD.P, fibres: CORD_FIB[k], s0: -16, s1: VIEW.w + 16, edge: 0.3 })), 2, 4));
  },
};

// =====================================================================================
// TEXTILE STRUCTURE — knit, woven and braid at the knit diagram's scale and stroke
// =====================================================================================
const KP = WEFT_PANEL;                        // SW 7, HALO 2; wale 62, course 52
const TV = { x: 40, y: 32, w: 380, h: 262 };  // the knit tile's own window
const TVB = `${TV.x} ${TV.y} ${TV.w} ${TV.h}`;
const TUBE = { SW: KP.SW, HALO: KP.HALO };
const fadeV = id => `<linearGradient id="${id}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset="0.12" stop-color="#fff"/><stop offset="0.88" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient><mask id="${id}-fade" maskUnits="userSpaceOnUse" x="0" y="0" width="${KP.w}" height="${KP.h}"><rect x="${TV.x}" y="${TV.y}" width="${TV.w}" height="${TV.h}" fill="url(#${id}-g)"/></mask>`;
// strands: [{ d, color, op, notches: [[x, y, ux, uy]], dash }]: each notch is a crossing where
// this strand is BEHIND, cut along the front strand's direction (ux, uy), the knit tile's rule.
function tubes(id, strands, wrap = '') {
  const h = TUBE.SW / 2 + TUBE.HALO;
  let defs = fadeV(id), paths = '';
  strands.forEach((s, i) => {
    const bites = s.notches.map(([x, y, ux, uy]) => `M${f1(x - ux * h)},${f1(y - uy * h)}L${f1(x + ux * h)},${f1(y + uy * h)}`).join('');
    defs += `<mask id="${id}-m${i}" maskUnits="userSpaceOnUse" x="0" y="0" width="${KP.w}" height="${KP.h}"><rect width="${KP.w}" height="${KP.h}" fill="#fff"/><path d="${bites}" stroke="#000" stroke-width="${TUBE.SW + 2 * TUBE.HALO}" stroke-linecap="butt" fill="none"/></mask>`;
    if (s.dash !== undefined && s.dash <= 0) return;
    const dash = s.dash !== undefined && s.dash < 1 ? ` pathLength="1000" stroke-dasharray="1000" stroke-dashoffset="${f1(1000 * (1 - s.dash))}"` : '';
    paths += `<path d="${s.d}"${dash} stroke="${s.color}"${op(s.op)} mask="url(#${id}-m${i})"/>`;
  });
  return `<defs>${defs}${wrap}</defs><g mask="url(#${id}-fade)"><g fill="none" stroke-width="${TUBE.SW}" stroke-linecap="round" stroke-linejoin="round">${paths}</g></g>`;
}

// ---------- woven: plain weave, the weft laid pick by pick through a standing warp ----------
// Warp every half wale (31), weft every half course (26): the spacing of the knit's legs.
const WV = { xs: Array.from({ length: 14 }, (_, i) => 24 + 31 * i), ys: Array.from({ length: 11 }, (_, j) => 40 + 26 * j), xL: 20, xR: 440, yT: 20, yB: 312 };
const WV_TEAL = 5;
const wovenScene = {
  viewBox: TVB, duration: 7000,
  markup(t) {
    const nP = WV.ys.length, strands = [];
    const pick = j => { const order = nP - 1 - j, d = 0.9 / nP; return ease(seg(t, 0.06 + order * d, 0.06 + (order + 1) * d)); };   // bottom pick first
    const ltr = j => (nP - 1 - j) % 2 === 0;
    const tipX = j => ltr(j) ? lerp(WV.xL, WV.xR, pick(j)) : lerp(WV.xR, WV.xL, pick(j));
    const reached = (j, x) => pick(j) >= 1 || (ltr(j) ? tipX(j) > x : tipX(j) < x);
    WV.xs.forEach((x, i) => strands.push({
      d: `M${x},${WV.yB}L${x},${WV.yT}`, color: INK, op: 0.55,
      notches: WV.ys.flatMap((y, j) => (i + j) % 2 === 0 && reached(j, x) ? [[x, y, 1, 0]] : []),
    }));
    WV.ys.forEach((y, j) => strands.push({
      d: ltr(j) ? `M${WV.xL},${y}L${WV.xR},${y}` : `M${WV.xR},${y}L${WV.xL},${y}`, color: j === WV_TEAL ? ACCENT : INK, op: 1, dash: pick(j),
      notches: WV.xs.flatMap((x, i) => (i + j) % 2 === 1 ? [[x, y, 0, 1]] : []),
    }));
    return tubes('tt-wv', strands);
  },
};

// ---------- braid: a tubular braid, the way it comes off a braiding machine — two sets of strands
// on the bias, each over two and under two (a regular braid), on a cylinder seen from the side,
// so the strands crowd and turn away at its edges. The braid is LAID strand by strand, the two
// sets alternating, so each new strand is seen passing over two and under two as it arrives.
// A strand is a straight line in the UNROLLED cylinder (u along the circumference, y up); on
// screen u becomes x = cx + Rc sin(u / Rc). Crossings and the over / under rule are found in the
// unrolled plane, where they are exact; only the near half (|u| < LIM) is drawn. A crossing
// cuts the strand underneath only once the strand on top has been laid that far. ----------
const BR = { beta: 33 * Math.PI / 180, gap: 26, yB: 316, yT: 14, cx: 230, Rc: 168, lay: 0.2 };
BR.sp = BR.gap / Math.cos(BR.beta); BR.tan = Math.tan(BR.beta); BR.H = BR.yB - BR.yT; BR.LIM = 1.46 * BR.Rc;
const brX = u => BR.cx + BR.Rc * Math.sin(u / BR.Rc);
const BRAID = (() => {
  const A = [], B = [];
  for (let u = -BR.LIM - BR.H * BR.tan; u <= BR.LIM; u += BR.sp) A.push(u);           // set A climbs to the right
  for (let u = -BR.LIM + 0.5 * BR.sp; u <= BR.LIM + BR.H * BR.tan; u += BR.sp) B.push(u);
  const strand = (u0, dir, set, idx) => {
    const pts = [];
    for (let y = BR.yB; y >= BR.yT - 0.01; y -= 3) { const u = u0 + dir * (BR.yB - y) * BR.tan; if (Math.abs(u) <= BR.LIM) pts.push({ x: brX(u), y }); }
    const cum = [0]; for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
    return { u0, dir, set, idx, pts, cum, len: cum[cum.length - 1], d: poly(pts) };
  };
  const SA = A.map((u, i) => strand(u, 1, 'A', i)).filter(s => s.pts.length > 1);
  const SB = B.map((u, j) => strand(u, -1, 'B', j)).filter(s => s.pts.length > 1);
  // fraction of a strand's drawn length at height y (its points run bottom to top)
  const fracAt = (s, y) => { for (let k = 1; k < s.pts.length; k++) if (s.pts[k].y <= y) { const a = s.pts[k - 1], b = s.pts[k], u = (a.y - y) / (a.y - b.y); return (s.cum[k - 1] + u * (s.cum[k] - s.cum[k - 1])) / s.len; } return 1; };
  // lay order: A left to right and B right to left, alternating, so the two sets sweep through each other
  const order = []; const ra = SA.slice().sort((p, q) => p.u0 - q.u0), rb = SB.slice().sort((p, q) => q.u0 - p.u0);
  for (let k = 0; k < Math.max(ra.length, rb.length); k++) { if (ra[k]) order.push(ra[k]); if (rb[k]) order.push(rb[k]); }
  order.forEach((s, k) => { s.start = 0.03 + k * (0.97 - BR.lay - 0.03) / (order.length - 1); });
  const cross = [];
  for (const a of SA) for (const b of SB) {
    const h = (b.u0 - a.u0) / (2 * BR.tan), u = a.u0 + h * BR.tan; if (h <= 0 || h >= BR.H || Math.abs(u) > BR.LIM) continue;
    const y = BR.yB - h, c = Math.cos(u / BR.Rc), L = Math.hypot(BR.tan * c, 1);
    cross.push({ a, b, x: brX(u), y, aOver: ((a.idx + b.idx) % 4) < 2, ax: BR.tan * c / L, ay: -1 / L, fa: fracAt(a, y), fb: fracAt(b, y) });
  }
  const teal = SA.slice().sort((p, q) => Math.abs(p.u0 + BR.H * BR.tan / 2) - Math.abs(q.u0 + BR.H * BR.tan / 2))[0];
  return { order, cross, teal };
})();
const braidScene = {
  viewBox: TVB, duration: 8600,
  markup(t) {
    const p = s => ease(seg(t, s.start, s.start + BR.lay));
    const strands = BRAIDS_DRAW(p);
    // the cylinder turns away at its sides: strands fade toward the silhouette
    const xl = brX(-BR.LIM), xr = brX(BR.LIM), shade = `<linearGradient id="tt-br-sg" gradientUnits="userSpaceOnUse" x1="${f1(xl)}" y1="0" x2="${f1(xr)}" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0.2"/><stop offset="0.2" stop-color="#fff"/><stop offset="0.8" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0.2"/></linearGradient><mask id="tt-br-sh" maskUnits="userSpaceOnUse" x="0" y="0" width="${KP.w}" height="${KP.h}"><rect width="${KP.w}" height="${KP.h}" fill="url(#tt-br-sg)"/></mask>`;
    return tubes('tt-br', strands, shade).replace(/<g mask="url\(#tt-br-fade\)">/, '<g mask="url(#tt-br-fade)"><g mask="url(#tt-br-sh)">') + '</g>';
  },
};
function BRAIDS_DRAW(p) {
  // a crossing notches the strand underneath once the strand on top has reached it
  return BRAID.order.map(s => ({
    d: s.d, color: s === BRAID.teal ? ACCENT : INK, op: s.set === 'A' ? 1 : 0.55, dash: p(s),
    notches: BRAID.cross.filter(c => (s.set === 'A' ? c.a === s && !c.aOver : c.b === s && c.aOver) && p(c.aOver ? c.a : c.b) >= (c.aOver ? c.fa : c.fb))
      .map(c => c.aOver ? [c.x, c.y, c.ax, c.ay] : [c.x, c.y, -c.ax, c.ay]),
  }));
}

export const SCENES = {
  staple: stapleScene, filament: filamentScene,
  spun: spunScene, mono: monoScene, twisted: twistedScene, plied: pliedScene, core: coreScene, cord: cordScene,
  woven: wovenScene, braid: braidScene, knit: BASIC.knit, nonwoven: BASIC.nonwoven,
};

// ---------- playback: once when it scrolls into view, hold the end frame, replay on hover / tap.
// Only what is on screen animates: a scene that leaves the viewport mid-play jumps to its end.
export function mountTaxonomy(root = document, opts = {}) {
  const reduce = opts.reducedMotion ?? (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const players = [];
  for (const host of root.querySelectorAll('[data-tx-scene]')) {
    const scene = SCENES[host.dataset.txScene]; if (!scene) continue;
    const svg = host.querySelector('svg') || host.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    const p = { host, svg, scene, raf: 0, t: reduce ? 1 : 0, played: false, playing: false, visible: false };
    const draw = t => { svg.setAttribute('viewBox', scene.view ? scene.view(t) : scene.viewBox); svg.innerHTML = scene.markup(t); };
    p.seek = t => { cancelAnimationFrame(p.raf); p.playing = false; p.t = t; draw(t); };
    p.play = () => {
      if (reduce || p.playing) return;
      p.playing = true; p.played = true;
      const t0 = performance.now();
      const step = now => {
        p.t = Math.min(1, (now - t0) / scene.duration); draw(p.t);
        if (p.t < 1) p.raf = requestAnimationFrame(step); else p.playing = false;
      };
      p.raf = requestAnimationFrame(step);
    };
    draw(p.t);
    if (!reduce) {
      host.addEventListener('mouseenter', () => { if (p.played) p.play(); });
      host.addEventListener('click', () => p.play());
    }
    players.push(p);
  }
  if (!reduce && opts.autoplay !== false && typeof IntersectionObserver === 'function') {
    const io = new IntersectionObserver(es => {
      for (const e of es) {
        const p = players.find(q => q.host === e.target); if (!p) continue;
        p.visible = e.isIntersecting;
        if (e.isIntersecting && !p.played) p.play();
        else if (!e.isIntersecting && p.playing) p.seek(1);
      }
    }, { threshold: 0.45 });
    players.forEach(p => io.observe(p.host));
  }
  return players;
}
