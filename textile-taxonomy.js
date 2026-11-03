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

// ---------- staple: the textile-basics material drifting, then drafted into an overlapping
// roving that has just begun to twist. Its end frame is spun staple's first frame. ----------
const STAPLE_DRIFT = 0.42, ROVING_TT = 0.6;      // at tt 0.6 the yarn scene's twist is 0.09
const stapleScene = {
  viewBox: `0 ${FIBER_VB.y} ${VIEW.w} ${FIBER_VB.h}`, duration: 7600,
  markup: t => t < STAPLE_DRIFT ? BASIC.fiber.markup(t / STAPLE_DRIFT) : BASIC.yarn.markup(ROVING_TT * seg(t, STAPLE_DRIFT, 1)),
};

// ---------- filament: one continuous strand from a spinneret. The camera pulls back from the
// orifice to show it running on, in long loops, out of the frame — no free end is ever in
// view: at the start the strand leaves the zoomed frame, at the end it leaves the card. ----------
const FIL_PTS = [[24, 50], [70, 48], [150, 52], [236, 60], [290, 78], [292, 104], [246, 118], [160, 114], [88, 120],
  [48, 138], [46, 160], [90, 174], [180, 177], [268, 172], [330, 164], [420, 156]];
function catmull(P, per) {
  const out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      const c = j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
      out.push({ x: c(0), y: c(1) });
    }
  }
  const e = P[P.length - 1]; out.push({ x: e[0], y: e[1] });
  let s = 0; out.forEach((p, i) => { if (i) s += Math.hypot(p.x - out[i - 1].x, p.y - out[i - 1].y); p.s = s; });
  out.forEach((p, i) => { const a = out[Math.max(0, i - 1)], b = out[Math.min(out.length - 1, i + 1)], L = Math.hypot(b.x - a.x, b.y - a.y) || 1; p.nx = -(b.y - a.y) / L; p.ny = (b.x - a.x) / L; });
  return out;
}
const FIL = catmull(FIL_PTS, 14);
const FIL_ZOOM = 2.6, FIL_C0 = { x: 66, y: 52 }, FIL_C1 = { x: VIEW.w / 2, y: FIBER_VB.y + FIBER_VB.h / 2 };
function filamentView(t) {
  const k = ease(seg(t, 0.08, 0.86)), z = lerp(FIL_ZOOM, 1, k), w = VIEW.w / z, h = FIBER_VB.h / z;
  const cx = lerp(FIL_C0.x, FIL_C1.x, k), cy = lerp(FIL_C0.y, FIL_C1.y, k);
  return `${f1(cx - w / 2)} ${f1(cy - h / 2)} ${f1(w)} ${f1(h)}`;
}
const filamentScene = {
  viewBox: filamentView(1), duration: 6400, view: filamentView,
  markup(t) {
    // the strand sways as it is pulled away: a wave travelling downstream, damped to rest
    const sec = t * this.duration / 1000, amp = 3.2 * (1 - ease(seg(t, 0.55, 1)));
    const pts = FIL.map(p => { const e = smooth(p.s / 50), o = amp * e * Math.sin(TAU * (p.s / 130 - 0.55 * sec)); return { x: p.x + p.nx * o, y: p.y + p.ny * o }; });
    // draw-down: the strand leaves the orifice thick and is drawn fine within a few widths
    let taper = '';
    for (let k = 0; k < 6; k++) {
      const sub = pts.filter((p, i) => FIL[i].s <= 4 + k * 5);
      if (sub.length > 1) taper += `<path d="${poly(sub)}" stroke="${ACCENT}" stroke-width="${f1(SW + 2.4 * (1 - k / 6))}"/>`;
    }
    return spinneret(24, 50, 34, 2.4) + group(`<path d="${poly(pts)}" stroke="${BG}" stroke-width="${SW + 2 * HALO}"/><path d="${poly(pts)}" stroke="${ACCENT}" stroke-width="${SW}"/>${taper}`);
  },
};

// =====================================================================================
// YARN AND CORD
// =====================================================================================

// ---------- spun staple: the staple card's roving, twisted tight. A third of the fibres keep an
// end proud of the surface as the twist packs them in — the hairiness a filament yarn never has.
const HAIRY = (() => {
  const r = rng(SEED + 40), m = new Map();
  for (let i = 0; i < YARN.N; i++) { const v = r(); m.set(i, v < 0.2 ? 0 : v < 0.38 ? 1 : v < 0.46 ? 2 : -1); }   // 0 lead end, 1 tail end, 2 both
  return m;
})();
const HAIR_U = 0.2, HAIR_L = 13;
function hairy(f, pts, k) {
  const which = HAIRY.get(f.i); if (k <= 0 || which < 0 || f.accent) return pts;
  const n = pts.length - 1, out = pts.map(p => ({ ...p }));
  const ends = which === 2 ? [0, 1] : [which];
  for (const e of ends) {
    // the end leaves on whichever side of the axis it already sits
    const j0 = Math.round((e ? 1 - HAIR_U : HAIR_U) * n), side = Math.sign(YARN.Y - pts[j0].y) || (f.i % 2 ? 1 : -1);
    for (let j = 0; j <= n; j++) {
      const u = j / n, w = e ? (u - (1 - HAIR_U)) / HAIR_U : (HAIR_U - u) / HAIR_U;
      if (w <= 0) continue;
      out[j].y -= side * k * HAIR_L * Math.pow(w, 1.5);
      out[j].x += (e ? 1 : -1) * k * 3 * w * w;
    }
  }
  return out;
}
const spunScene = {
  viewBox: YARN_VB, duration: 6000,
  markup(t) {
    const tt = lerp(ROVING_TT, 1, t), hk = ease(seg(t, 0.25, 0.95)), runs = [];
    for (const f of DRAW.MATERIAL) {
      const { pts } = yarnFibrePoints(f, tt);
      splitRuns(hairy(f, pts, hk), f.accent ? ACCENT : INK, 1, BACK, runs);
    }
    return group(runsMarkup(runs));
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
  const r = rng(SEED + 70), out = [], n = 60;
  for (let i = 0; i < n; i++) {
    const f = makeFibre(r, 300 + i, i === 23);
    f.c = -18 + (i + r()) / n * (CORE.sheathEnd + 18);
    if (f.accent) { f.len = 80; f.c = 150; }
    f.rho = 0.44 + 0.56 * Math.sqrt(r()); f.phi = r() * TAU;
    // loose staple around the core before it is gathered (the card's flurry, near the core)
    f.x = f.c + (r() - 0.5) * 70; f.y = YARN.Y + (r() < 0.5 ? -1 : 1) * (34 + r() * 52); f.ang = r() * Math.PI;
    f.vx = (r() - 0.5) * 18; f.vy = (r() - 0.5) * 10; f.spin = (r() - 0.5) * 0.6; f.z = r(); f.delay = r() * 0.12;
    out.push(f);
  }
  return out;
})();
const coreScene = {
  viewBox: YARN_VB, duration: 7200,
  markup(t) {
    const coreTip = lerp(-12, 370, ease(seg(t, 0, 0.24))), tt = seg(t, 0.14, 1), runs = [];
    for (const f of CORE_FIB) { const { pts, yarnness } = yarnFibrePoints(f, tt); splitRuns(pts, f.accent ? ACCENT : INK, 1, lerp(1, BACK, yarnness), runs); }
    // back of the sheath, the core, the front of the sheath
    const back = runs.filter(r => r.depth < 0), front = runs.filter(r => r.depth >= 0);
    const core = rod('tt-core-g', -12, coreTip, YARN.Y, () => CORE.r, coreTip < VIEW.w + 20);
    return group(runsMarkup(back) + core + runsMarkup(front));
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
// on the bias, each over two and under two (a regular braid), wound round a cylinder seen from
// the side, so the strands crowd and turn away at its edges. The fell climbs as it is made. ----------
// A strand is a straight line in the UNROLLED cylinder (u along the circumference, y up); on
// screen u becomes x = cx + Rc sin(u / Rc). Crossings and the over / under rule are found in the
// unrolled plane, where they are exact; only the near half (|u| < LIM) is drawn.
const BR = { beta: 33 * Math.PI / 180, gap: 26, yB: 316, yT: 14, cx: 230, Rc: 168 };
BR.sp = BR.gap / Math.cos(BR.beta); BR.tan = Math.tan(BR.beta); BR.H = BR.yB - BR.yT; BR.LIM = 1.46 * BR.Rc;
BR.A = []; for (let u = -BR.LIM - BR.H * BR.tan; u <= BR.LIM; u += BR.sp) BR.A.push(u);      // set A climbs to the right
BR.B = []; for (let u = -BR.LIM + 0.5 * BR.sp; u <= BR.LIM + BR.H * BR.tan; u += BR.sp) BR.B.push(u);
const BR_TEAL = Math.floor(BR.A.length / 2);
const brX = u => BR.cx + BR.Rc * Math.sin(u / BR.Rc);
function brStrand(u0, dir) {                     // dir +1: set A, -1: set B
  const pts = [];
  for (let y = BR.yB; y >= BR.yT - 0.01; y -= 3) { const u = u0 + dir * (BR.yB - y) * BR.tan; if (Math.abs(u) <= BR.LIM) pts.push({ x: brX(u), y }); }
  return pts;
}
const braidScene = {
  viewBox: TVB, duration: 6200,
  markup(t) {
    const cross = [];
    BR.A.forEach((a, i) => BR.B.forEach((b, j) => {
      const h = (b - a) / (2 * BR.tan), u = a + h * BR.tan; if (h <= 0 || h >= BR.H || Math.abs(u) > BR.LIM) return;
      const c = Math.cos(u / BR.Rc), L = Math.hypot(BR.tan * c, 1);
      cross.push({ i, j, x: brX(u), y: BR.yB - h, aOver: ((i + j) % 4) < 2, ax: BR.tan * c / L, ay: -1 / L });
    }));
    const strands = [];
    BR.A.forEach((a, i) => { const pts = brStrand(a, 1); if (pts.length > 1) strands.push({ d: poly(pts), color: i === BR_TEAL ? ACCENT : INK, op: 1,
      notches: cross.filter(c => c.i === i && !c.aOver).map(c => [c.x, c.y, -c.ax, c.ay]) }); });
    BR.B.forEach((b, j) => { const pts = brStrand(b, -1); if (pts.length > 1) strands.push({ d: poly(pts), color: INK, op: 0.55,
      notches: cross.filter(c => c.j === j && c.aOver).map(c => [c.x, c.y, c.ax, c.ay]) }); });
    // the fell: everything below it is braided; it climbs from the bottom of the window
    const fell = lerp(TV.y + TV.h + 30, TV.y - 40, ease(seg(t, 0.04, 0.94)));
    const reveal = `<linearGradient id="tt-br-rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient><mask id="tt-br-rv" maskUnits="userSpaceOnUse" x="0" y="0" width="${KP.w}" height="${KP.h}"><rect x="0" y="${f1(fell - 24)}" width="${KP.w}" height="24" fill="url(#tt-br-rg)"/><rect x="0" y="${f1(fell)}" width="${KP.w}" height="${KP.h}" fill="#fff"/></mask>`;
    // the cylinder turns away at its sides: strands fade toward the silhouette
    const xl = brX(-BR.LIM), xr = brX(BR.LIM), shade = `<linearGradient id="tt-br-sg" gradientUnits="userSpaceOnUse" x1="${f1(xl)}" y1="0" x2="${f1(xr)}" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0.2"/><stop offset="0.2" stop-color="#fff"/><stop offset="0.8" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0.2"/></linearGradient><mask id="tt-br-sh" maskUnits="userSpaceOnUse" x="0" y="0" width="${KP.w}" height="${KP.h}"><rect width="${KP.w}" height="${KP.h}" fill="url(#tt-br-sg)"/></mask>`;
    return tubes('tt-br', strands, reveal + shade).replace(/<g mask="url\(#tt-br-fade\)">/, '<g mask="url(#tt-br-fade)"><g mask="url(#tt-br-rv)"><g mask="url(#tt-br-sh)">') + '</g></g>';
  },
};

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
