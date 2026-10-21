// textile-basics.js — the six animations of #what-is-a-textile on /textile-101.html:
// Fiber -> Yarn -> Fabric across the top, and Knit / Woven / Nonwoven below.
//
// ONE MATERIAL CARRIES THROUGH. makeMaterial() builds one seeded set of staple fibers, and
//   * the Fiber card is that set drifting (its end frame is fiberPose(f, 1));
//   * the Yarn card STARTS from exactly that end frame, gathers the same fibers into a sliver,
//     straightens them and twists them into a Z-twist yarn;
//   * the Fabric card weaves that yarn: its first pick is the Yarn card's end state, fibre for
//     fibre (same s along the yarn, same radius, same phase), shifted down to the first row;
//   * the Nonwoven tile also starts from the Fiber card's end frame and lays the same fibers
//     (plus more) into a web.
// The one teal fiber is fibre TEAL in that set, so it can be followed card to card.
//
// Every scene is { viewBox, duration, markup(t), init?(svg), render?(svg, t) }: markup(t) is a
// pure function of t in [0, 1] (Node can bake it), render() is the fast path the page uses.
// No framework, no build step. Occlusion is real: a yarn is drawn as depth-ordered runs, each
// run on a background-coloured halo, the approach the knit diagram (section 09) takes.
import { PALETTE, crossings, notchPath, toPath, WEFT_PANEL, weftPanelCourses } from './textile-knit-loops.js';

const INK = PALETTE.ink, ACCENT = PALETTE.accent;
const BG = 'var(--black, #060707)';
export const VIEW = { w: 320, h: 220 };
const SW = 1.3, HALO = 1.0;            // fibre stroke, background gap each side of it
const BACK = 0.36;                     // opacity of a fibre on the far side of a yarn
const EDGE = 0.5;                      // opacity of a yarn's silhouette line
const WARP_FRONT = 0.42, WARP_BACK = 0.16, WARP_EDGE = 0.34;   // the warp sits back so the weft reads
const SEED = 20261021;
const TAU = Math.PI * 2;

// ---------- small helpers ----------
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const ease = v => v * v * (3 - 2 * v);
const easeOut = v => 1 - (1 - v) * (1 - v);
const lerp = (a, b, k) => a + (b - a) * k;
const f1 = v => Math.round(v * 10) / 10;
const poly = pts => pts.length < 2 ? '' : 'M' + pts.map(p => f1(p.x) + ',' + f1(p.y)).join('L');

// depth-ordered runs -> markup: a halo under every run, back runs dimmed
function runsMarkup(runs, sw = SW, halo = HALO) {
  runs.sort((a, b) => a.depth - b.depth);
  let s = '';
  for (const r of runs) {
    const d = poly(r.pts); if (!d) continue;
    s += `<path d="${d}" stroke="${BG}" stroke-width="${sw + 2 * halo}" stroke-linecap="butt"/>`;
    s += `<path d="${d}" stroke="${r.color}" stroke-width="${sw}"${r.op < 1 ? ` stroke-opacity="${f1(r.op * 100) / 100}"` : ''}/>`;
  }
  return s;
}
// split a fibre's points (each {x, y, d}) into runs of one depth sign
function splitRuns(pts, color, frontOp, backOp, out) {
  let cur = [pts[0]], sign = pts[0].d >= 0;
  const push = () => {
    if (cur.length < 2) return;
    let m = 0; for (const p of cur) m += p.d;
    // the teal fibre lies on the yarn's surface: its near-side runs go over the other near-side fibres
    out.push({ pts: cur, depth: m / cur.length + (sign && color === ACCENT ? 100 : 0), color, op: sign ? frontOp : backOp });
  };
  for (let i = 1; i < pts.length; i++) {
    const s = pts[i].d >= 0;
    if (s !== sign) {
      // cut at the zero crossing so both runs meet on the yarn's silhouette
      const a = pts[i - 1], b = pts[i], k = a.d / (a.d - b.d);
      const z = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, d: 0 };
      cur.push(z); push(); cur = [z]; sign = s;
    }
    cur.push(pts[i]);
  }
  push();
}

// ---------- the material ----------
// The yarn the Yarn card spins (and the Fabric card weaves): axis from X0 to X1, a flat sliver
// of half-width R0 that compacts to R1 as it twists, with a surface twist angle ALPHA.
export const YARN = { X0: 22, X1: 298, Y: 110, XC: 160, R0: 34, R1: 18, ALPHA: 40 * Math.PI / 180, N: 74, TEAL: 17 };
YARN.P = TAU * YARN.R1 / Math.tan(YARN.ALPHA);       // pitch of one turn at the yarn surface

function makeFibre(r, i, accent) {
  const len = accent ? 170 : 36 + r() * 48;
  return {
    i, accent, len,
    camp: 0.9 + r() * 1.0,                       // crimp amplitude
    waves: len / (24 + r() * 10),                // crimp waves along the fibre
    cph: r() * TAU,
    rho: accent ? 0.97 : 0.34 + 0.66 * Math.sqrt(r()), // radius in the yarn, as a share of R
    phi: r() * TAU,                              // phase about the yarn axis
    delay: r() * 0.12,
  };
}
export function makeMaterial() {
  const r = rng(SEED), fibres = [];
  const slots = [];                              // stratified centres along the yarn
  for (let i = 0; i < YARN.N; i++) slots.push(i);
  for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
  for (let i = 0; i < YARN.N; i++) {
    const accent = i === YARN.TEAL, f = makeFibre(r, i, accent);
    f.c = accent ? YARN.XC : YARN.X0 + 6 + (slots[i] + r()) / YARN.N * (YARN.X1 - YARN.X0 - 12);
    if (accent) f.phi = Math.PI / 2;             // it crosses the front of the yarn at mid-card
    // the flurry: where it floats in the Fiber card at t = 0, and how it drifts
    // spread past the card's edges: the Yarn card gathers some fibres in from out of frame
    f.x = -40 + r() * 400; f.y = -24 + r() * 268; f.ang = r() * Math.PI;
    if (accent) { f.x = 150; f.y = 100; f.ang = 0.36; }
    f.vx = (r() - 0.5) * 22; f.vy = (r() - 0.5) * 14 + 3; f.spin = (r() - 0.5) * 0.7;
    f.z = accent ? 2 : r();
    fibres.push(f);
  }
  return fibres;
}
const MATERIAL = makeMaterial();

// fibre in its own frame: u in [0, 1] along it, crimp scaled by k
function local(f, u, k) { return { x: (u - 0.5) * f.len, y: f.camp * k * Math.sin(TAU * f.waves * u + f.cph) }; }
const SAMPLES = 24;

// ---------- 1. FIBER: a loose flurry, drifting ----------
export function fiberPose(f, t) {
  const k = easeOut(t);
  return { x: f.x + f.vx * k, y: f.y + f.vy * k, ang: f.ang + f.spin * k, crimp: 1 + 0.25 * Math.sin(TAU * 0.6 * t + f.cph) * (1 - t) };
}
function posedPoints(f, pose, depth) {
  const c = Math.cos(pose.ang), s = Math.sin(pose.ang), pts = [];
  for (let j = 0; j <= SAMPLES; j++) {
    const p = local(f, j / SAMPLES, pose.crimp);
    pts.push({ x: pose.x + p.x * c - p.y * s, y: pose.y + p.x * s + p.y * c, d: depth });
  }
  return pts;
}
const fiberScene = {
  viewBox: `0 0 ${VIEW.w} ${VIEW.h}`, duration: 5200,
  markup(t) {
    const runs = MATERIAL.map(f => ({ pts: posedPoints(f, fiberPose(f, t), f.z), depth: f.z, color: f.accent ? ACCENT : INK, op: 1 }));
    return `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${runsMarkup(runs)}</g>`;
  },
};

// ---------- 2. YARN: gather, straighten, twist ----------
// Where fibre f sits in the twisted yarn at twist T (0..1) and radius R, u along the fibre;
// sgn = -1 when the fibre was flipped end for end to lie along the axis without spinning.
// Z twist: a right-handed helix, so on a horizontal yarn the near-side fibres run "\".
function yarnPoint(f, u, T, R, crimpK, sgn, axis) {
  const rho = f.rho * R;
  const alpha = Math.atan(TAU * rho * T / YARN.P);
  const s = f.c + sgn * (u - 0.5) * f.len * Math.cos(alpha);       // position along the axis
  const th = f.phi + TAU * T * (s - YARN.XC) / YARN.P;
  const off = rho * Math.cos(th) - sgn * f.camp * crimpK * Math.sin(TAU * f.waves * u + f.cph);
  return axis(s, off, rho * Math.sin(th));
}
const straightAxis = (y0, x0 = 0) => (s, off, d) => ({ x: x0 + s, y: y0 - off, d });
function flipOf(f) { const a = fiberPose(f, 1).ang; const w = ((a % Math.PI) + Math.PI) % Math.PI; return w > Math.PI / 2 ? -1 : 1; }

function yarnFibrePoints(f, t) {
  const start = fiberPose(f, 1);
  const g = ease(seg(t, f.delay, f.delay + 0.32));          // gather
  const st = ease(seg(t, 0.38, 0.52));                       // straighten
  const T = ease(seg(t, 0.52, 0.95));                        // twist
  const R = lerp(YARN.R0, YARN.R1, T);
  const crimpK = lerp(1, 0.22, st);
  const sgn = flipOf(f);
  let pts;
  if (T > 0) {
    pts = [];
    for (let j = 0; j <= SAMPLES * 2; j++) pts.push(yarnPoint(f, j / (SAMPLES * 2), T, R, crimpK, sgn, straightAxis(YARN.Y)));
  } else {
    // a rigid crimped fibre moving from its flurry pose to its place in the flat sliver
    let a0 = start.ang; if (sgn < 0) a0 -= Math.PI;
    a0 = Math.atan2(Math.sin(a0), Math.cos(a0));
    const ty = YARN.Y - f.rho * YARN.R0 * Math.cos(f.phi);
    const pose = { x: lerp(start.x, f.c, g), y: lerp(start.y, ty, g), ang: lerp(a0, 0, g), crimp: lerp(start.crimp, crimpK, Math.max(g, st)) };
    const depth = lerp(f.z * YARN.R0 - YARN.R0 / 2, f.rho * YARN.R0 * Math.sin(f.phi), g);
    pts = posedPoints(f, pose, depth);
    if (sgn < 0) for (const p of pts) { p.x = 2 * pose.x - p.x; p.y = 2 * pose.y - p.y; }   // the flip, as a half turn
    // undo: posedPoints already rotated by a0 (= ang - pi); the half turn restores the shape
  }
  return { pts, yarnness: g };
}
const yarnScene = {
  viewBox: `0 0 ${VIEW.w} ${VIEW.h}`, duration: 6800,
  markup(t) {
    const runs = [];
    for (const f of MATERIAL) {
      const { pts, yarnness } = yarnFibrePoints(f, t);
      splitRuns(pts, f.accent ? ACCENT : INK, 1, lerp(1, BACK, yarnness), runs);
    }
    // the yarn's silhouette firms up as the twist packs the fibres into a round strand
    const T = ease(seg(t, 0.52, 0.95)), E = seg(T, 0.6, 1);
    if (E > 0) {
      const R = lerp(YARN.R0, YARN.R1, T) + 0.6, x0 = YARN.X0 + 14, x1 = YARN.X1 - 14;
      for (const sg of [-1, 1]) runs.push({ pts: [{ x: x0, y: YARN.Y + sg * R }, { x: x1, y: YARN.Y + sg * R }], depth: 0, color: INK, op: EDGE * E });
    }
    return `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${runsMarkup(runs)}</g>`;
  },
};

// ---------- yarns along any centreline, cut into pieces for over/under ----------
// A centreline is a list of segments; at arc length s it gives point, unit tangent.
function lineSeg(ax, ay, bx, by) {
  const L = Math.hypot(bx - ax, by - ay), tx = (bx - ax) / L, ty = (by - ay) / L;
  return { L, at: s => ({ x: ax + tx * s, y: ay + ty * s, tx, ty }) };
}
function arcSeg(cx, cy, r, a0, a1) {          // a0 -> a1, radians, screen coordinates
  const L = Math.abs(a1 - a0) * r, dir = Math.sign(a1 - a0);
  return { L, at: s => { const a = a0 + dir * s / r; return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), tx: -dir * Math.sin(a), ty: dir * Math.cos(a) }; } };
}
function centreline(segs) {
  let acc = 0; const starts = segs.map(g => { const s0 = acc; acc += g.L; return s0; });
  const at = s => {
    let k = segs.length - 1;
    for (let i = 0; i < segs.length; i++) if (s < starts[i] + segs[i].L) { k = i; break; }
    return segs[k].at(Math.min(segs[k].L, Math.max(0, s - starts[k])));
  };
  return { length: acc, at };
}
// a fibre of a twisted yarn, at arc length s along line: offset along the LEFT normal by
// rho cos(theta), depth rho sin(theta) (toward the viewer). (tangent, left normal, viewer) is
// right-handed for every direction of travel, so the twist stays Z whichever way a pick runs.
function yarnAxisOn(line, sOff = 0) {
  return (s, off, d) => { const p = line.at(s - sOff); return { x: p.x + p.ty * off, y: p.y - p.tx * off, d, s: s - sOff }; };
}
// fibre s-range in the yarn's own coordinates (f.c is a position along the yarn)
function fibreSpan(f, R) { const h = 0.5 * f.len * Math.cos(Math.atan(TAU * f.rho * R / YARN.P)); return [f.c - h, f.c + h]; }

// points of fibre f between yarn coordinates a..b, on line (yarn coordinate = arc length + sOff)
function fibreSlice(f, a, b, line, sOff, R, crimpK) {
  const [lo, hi] = fibreSpan(f, R); a = Math.max(a, lo); b = Math.min(b, hi);
  if (b <= a) return null;
  const h = (hi - lo) / 2, pts = [], n = Math.max(2, Math.ceil((b - a) / 2.2));
  const axis = yarnAxisOn(line, sOff);
  for (let j = 0; j <= n; j++) {
    const s = a + (b - a) * j / n, u = 0.5 + (s - f.c) / (2 * h);           // u for sgn = +1
    const sgn = f.sgn ?? 1, uu = sgn > 0 ? u : 1 - u;
    pts.push(yarnPoint(f, uu, 1, R, crimpK, sgn, axis));
  }
  return pts;
}
// the opaque band a piece of yarn draws first, so whatever is under it is hidden
function bandPath(line, s0, s1, w) {
  const n = Math.max(2, Math.ceil((s1 - s0) / 3)), L = [], Rr = [];
  for (let j = 0; j <= n; j++) {
    const p = line.at(s0 + (s1 - s0) * j / n);
    L.push({ x: p.x + p.ty * w, y: p.y - p.tx * w }); Rr.push({ x: p.x - p.ty * w, y: p.y + p.tx * w });
  }
  return poly(L.concat(Rr.reverse())) + 'Z';
}
// one piece of a yarn: band + its fibres' runs, between line arc lengths s0..s1
// merged = true draws the piece's back runs as one path and its front runs as one (cheaper, and
// loses only the fibre-on-fibre occlusion inside one short piece): for big static fields.
function pieceMarkup(yarn, s0, s1, merged = false) {
  const runs = [];
  for (const f of yarn.fibres) {
    const pts = fibreSlice(f, s0 + yarn.sOff, s1 + yarn.sOff, yarn.line, yarn.sOff, yarn.R, 0.22);
    if (pts) splitRuns(pts, f.accent ? ACCENT : INK, yarn.front, yarn.back, runs);
  }
  for (const sg of [-1, 1]) {
    const n = Math.max(2, Math.ceil((s1 - s0) / 3)), pts = [];
    for (let j = 0; j <= n; j++) { const p = yarn.line.at(s0 + (s1 - s0) * j / n), w = sg * (yarn.R + 0.6); pts.push({ x: p.x + p.ty * w, y: p.y - p.tx * w, d: 0 }); }
    runs.push({ pts, depth: 0, color: INK, op: yarn.edge, edge: true });
  }
  const band = `<path d="${bandPath(yarn.line, s0, s1, yarn.R + 2)}" fill="${BG}" stroke="none"/>`;
  if (!merged) return band + runsMarkup(runs);
  let out = band;
  for (const front of [false, true]) {
    const grp = runs.filter(r => r.edge ? front : (r.depth >= 0) === front);
    if (front && grp.length) out += `<path d="${grp.map(r => poly(r.pts)).join('')}" stroke="${BG}" stroke-width="${SW + 2 * HALO}" stroke-linecap="butt"/>`;
    for (const color of [INK, ACCENT]) {
      for (const edge of [false, true]) {
        const g = grp.filter(r => r.color === color && !!r.edge === edge); if (!g.length) continue;
        const op = g[0].op;
        out += `<path d="${g.map(r => poly(r.pts)).join('')}" stroke="${color}" stroke-width="${SW}"${op < 1 ? ` stroke-opacity="${op}"` : ''}/>`;
      }
    }
  }
  return out;
}
// fibres for a yarn of length S, at the material's density; seeded
function yarnFibres(seed, S, from = 0) {
  const r = rng(seed), out = [], n = Math.round((S - from) / (YARN.X1 - YARN.X0) * YARN.N);
  for (let i = 0; i < n; i++) { const f = makeFibre(r, i, false); f.c = from + (i + r()) / n * (S - from); f.sgn = 1; out.push(f); }
  return out;
}

// ---------- 3. FABRIC: that yarn, woven ----------
// a close-up of the loom: the warp runs off the top and bottom of the card and the selvedge
// turns happen off its sides, so what shows is the middle of the cloth; the last pick stops
// with the shuttle mid-card, so the end frame is weaving IN PROGRESS.
const WEAVE = { warps: 8, x0: -24, pitch: 52, rows: 4, yRow0: 192, rowPitch: 44, R: YARN.R1, tipX: 150 };
WEAVE.xs = Array.from({ length: WEAVE.warps }, (_, i) => WEAVE.x0 + i * WEAVE.pitch);
WEAVE.ys = Array.from({ length: WEAVE.rows }, (_, k) => WEAVE.yRow0 - k * WEAVE.rowPitch);
WEAVE.xL = WEAVE.xs[0] - WEAVE.R - 6; WEAVE.xR = WEAVE.xs[WEAVE.warps - 1] + WEAVE.R + 6;

function buildFabric() {
  // weft centreline: pick 1 from the yarn's own start (x = YARN.X0) left->right, turn, back...
  const segs = [], tr = WEAVE.rowPitch / 2;
  for (let k = 0; k < WEAVE.rows; k++) {
    const y = WEAVE.ys[k], ltr = k % 2 === 0;
    const xa = k === 0 ? YARN.X0 : (ltr ? WEAVE.xL : WEAVE.xR), xb = ltr ? WEAVE.xR : WEAVE.xL;
    segs.push(lineSeg(xa, y, xb, y));
    if (k < WEAVE.rows - 1) segs.push(ltr ? arcSeg(WEAVE.xR, y - tr, tr, Math.PI / 2, -Math.PI / 2) : arcSeg(WEAVE.xL, y - tr, tr, Math.PI / 2, 3 * Math.PI / 2));
  }
  const line = centreline(segs);
  const lastStart = line.length - segs[segs.length - 1].L;
  const endS = lastStart + (WEAVE.rows % 2 ? WEAVE.tipX - WEAVE.xL : WEAVE.xR - WEAVE.tipX);
  // the Yarn card's fibres, then more of the same yarn beyond its end (x1)
  // yarn coordinate = arc length + X0, so the Yarn card's fibres keep their own c (and phase)
  const own = MATERIAL.map(f => ({ ...f, sgn: flipOf(f) }));
  const more = yarnFibres(SEED + 3, line.length + YARN.X0 + 30, YARN.X1 - 4);
  const weft = { line, sOff: YARN.X0, R: WEAVE.R, fibres: own.concat(more), front: 1, back: BACK, edge: EDGE };
  // pieces along the weft: one per warp it crosses, plus the free stretches and the turns
  const pieces = [];   // { yarn, s0, s1, layer }
  let s = 0;
  for (let gi = 0; gi < segs.length; gi++) {
    const g = segs[gi], sEnd = s + g.L;
    const rowK = gi % 2 === 0 ? gi / 2 : -1;
    if (rowK >= 0 && rowK < WEAVE.rows) {
      const p0 = g.at(0), dir = Math.sign(g.at(1).x - p0.x);
      const cuts = [s];
      for (let i = 0; i <= WEAVE.warps; i++) {
        const bx = WEAVE.x0 + (i - 0.5) * WEAVE.pitch, sc = s + (bx - p0.x) * dir;
        if (sc > s && sc < sEnd) cuts.push(sc);
      }
      cuts.push(sEnd); cuts.sort((a, b) => a - b);
      for (let c = 0; c < cuts.length - 1; c++) {
        const mid = g.at((cuts[c] + cuts[c + 1]) / 2 - s).x;
        const wi = Math.round((mid - WEAVE.x0) / WEAVE.pitch);
        const onWarp = wi >= 0 && wi < WEAVE.warps && Math.abs(mid - WEAVE.xs[wi]) < WEAVE.pitch / 2;
        pieces.push({ yarn: weft, s0: cuts[c], s1: cuts[c + 1], layer: onWarp ? ((wi + rowK) % 2 === 0 ? 2 : 1) : 0 });
      }
    } else pieces.push({ yarn: weft, s0: s, s1: sEnd, layer: 0 });
    s = sEnd;
  }
  // warps: bottom to top, cut at the midpoints between rows
  const warpPieces = [];
  WEAVE.xs.forEach((x, i) => {
    const top = -20, bottom = VIEW.h + 20;
    const wl = centreline([lineSeg(x, bottom, x, top)]);
    const yarn = { line: wl, sOff: 0, R: WEAVE.R, fibres: yarnFibres(SEED + 11 + i, wl.length + 20, -20), front: WARP_FRONT, back: WARP_BACK, edge: WARP_EDGE };
    let prev = 0;
    for (let k = 0; k <= WEAVE.rows; k++) {
      const yb = k < WEAVE.rows ? WEAVE.ys[k] + WEAVE.rowPitch / 2 : WEAVE.ys[WEAVE.rows - 1] - WEAVE.rowPitch / 2;
      const sb = bottom - yb;
      if (k === 0) { warpPieces.push({ yarn, s0: 0, s1: sb, layer: 0 }); prev = sb; continue; }
      const kk = k - 1;
      warpPieces.push({ yarn, s0: prev, s1: sb, layer: (i + kk) % 2 === 0 ? 1 : 2 });
      prev = sb;
    }
    warpPieces.push({ yarn, s0: prev, s1: wl.length, layer: 0 });
  });
  return { weft, pieces, warpPieces, weftLength: endS };
}
let FABRIC = null;
const fabric = () => FABRIC || (FABRIC = buildFabric());

function shuttle(line, s) {
  const p = line.at(Math.min(line.length, s)), a = Math.atan2(p.ty, p.tx) * 180 / Math.PI;
  return `<g transform="translate(${f1(p.x + p.tx * 13)},${f1(p.y + p.ty * 13)}) rotate(${f1(a)})"><path d="M-14,0C-8,-6 8,-6 14,0C8,6 -8,6 -14,0Z" fill="${BG}" stroke="${INK}" stroke-width="1.3"/><path d="M-6,0H6" stroke="${ACCENT}" stroke-width="1.3"/></g>`;
}
const PICK_START = 0.06, PICK_END = 0.94;
function fabricTip(t) { const F = fabric(); return lerp(0, F.weftLength, ease(seg(t, PICK_START, PICK_END))); }
const fabricScene = {
  viewBox: `0 0 ${VIEW.w} ${VIEW.h}`, duration: 8600,
  markup(t) {
    const F = fabric(), tip = fabricTip(t), layers = ['', '', ''];
    for (const p of F.warpPieces) layers[p.layer] += pieceMarkup(p.yarn, p.s0, p.s1);
    for (const p of F.pieces) if (p.s0 < tip) layers[p.layer] += pieceMarkup(p.yarn, p.s0, Math.min(p.s1, tip));
    return `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${layers.join('')}</g>${tip > 0 ? shuttle(F.weft.line, tip) : ''}`;
  },
  // fast path: every whole piece is baked once; per frame only the piece under the shuttle changes
  init(svg) {
    const F = fabric(); let html = '<g fill="none" stroke-linecap="round" stroke-linejoin="round">';
    for (let L = 0; L < 3; L++) {
      html += `<g>`;
      for (const p of F.warpPieces) if (p.layer === L) html += pieceMarkup(p.yarn, p.s0, p.s1);
      F.pieces.forEach((p, i) => { if (p.layer === L) html += `<g data-p="${i}" style="display:none">${pieceMarkup(p.yarn, p.s0, p.s1)}</g>`; });
      html += `<g data-partial="${L}"></g></g>`;
    }
    html += '</g><g data-shuttle></g>';
    svg.innerHTML = html;
    svg._p = F.pieces.map((_, i) => svg.querySelector(`[data-p="${i}"]`));
    svg._partial = [0, 1, 2].map(L => svg.querySelector(`[data-partial="${L}"]`));
    svg._shuttle = svg.querySelector('[data-shuttle]');
  },
  render(svg, t) {
    const F = fabric(), tip = fabricTip(t), part = ['', '', ''];
    F.pieces.forEach((p, i) => {
      const whole = p.s1 <= tip;
      svg._p[i].style.display = whole ? '' : 'none';
      if (!whole && p.s0 < tip) part[p.layer] += pieceMarkup(p.yarn, p.s0, tip);
    });
    svg._partial.forEach((g, L) => { g.innerHTML = part[L]; });
    svg._shuttle.innerHTML = tip > 0 ? shuttle(F.weft.line, tip) : '';
  },
};

// ---------- 4. KNIT: section 09's weft-knit strands, drawn course by course ----------
const KP = WEFT_PANEL;
let KNIT = null;
function buildKnit() {
  const strands = weftPanelCourses(KP);
  const arc = strands.map(pts => { const a = [0]; for (let i = 1; i < pts.length; i++) a.push(a[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)); return a.map(v => v / a[a.length - 1]); });
  const frac = (i, s) => { const k = Math.floor(s), t = s - k; const a = arc[i]; return a[Math.min(k, a.length - 1)] + ((a[Math.min(k + 1, a.length - 1)] - a[Math.min(k, a.length - 1)]) * t); };
  const bites = [];        // { on: back strand, by: front strand, at: fraction along the front strand, d }
  for (const x of crossings(strands)) {
    const F = x.front === 'a' ? x.a : x.b, B = x.front === 'a' ? x.b : x.a, s = x.front === 'a' ? x.ia + x.ta : x.ib + x.tb;
    bites.push({ on: B, by: F, at: frac(F, s), d: notchPath(strands[F], s, KP.SW / 2 + KP.HALO) });
  }
  return { strands, bites };
}
const knit = () => KNIT || (KNIT = buildKnit());
const KNIT_COLOR = i => i === 2 ? ACCENT : i === 0 ? INK : INK;
const KNIT_OP = i => i === 1 || i === 3 ? 0.55 : 1;
// course 3 (the bottom, oldest) is knitted first, then 2, 1, 0: wale runs up
function courseProgress(i, t) { const order = KP.courses - 1 - i, d = 0.92 / KP.courses; return ease(seg(t, 0.04 + order * d, 0.04 + (order + 1) * d)); }
const KNIT_VIEW = { x: 40, y: 32, w: 380, h: 262 };
const knitScene = {
  viewBox: `${KNIT_VIEW.x} ${KNIT_VIEW.y} ${KNIT_VIEW.w} ${KNIT_VIEW.h}`, duration: 6000,
  markup(t) {
    const K = knit(); let defs = '', paths = '';
    K.strands.forEach((pts, i) => {
      const p = courseProgress(i, t);
      const b = K.bites.filter(x => x.on === i && courseProgress(x.by, t) >= x.at).map(x => `<path d="${x.d}" stroke-width="${KP.SW + 2 * KP.HALO}"/>`).join('');
      defs += `<mask id="tb-km${i}" maskUnits="userSpaceOnUse" x="0" y="0" width="${KP.w}" height="${KP.h}"><rect width="${KP.w}" height="${KP.h}" fill="#fff"/><g fill="none" stroke="#000" stroke-linecap="round">${b}</g></mask>`;
      if (p > 0) paths += `<path pathLength="1000" stroke-dasharray="1000" stroke-dashoffset="${f1(1000 * (1 - p))}" d="${toPath(pts)}" stroke="${KNIT_COLOR(i)}"${KNIT_OP(i) < 1 ? ` stroke-opacity="${KNIT_OP(i)}"` : ''} mask="url(#tb-km${i})"/>`;
    });
    const fade = `<linearGradient id="tb-kg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset="0.16" stop-color="#fff"/><stop offset="0.86" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient><mask id="tb-kfade" maskUnits="userSpaceOnUse" x="0" y="0" width="${KP.w}" height="${KP.h}"><rect y="40" width="${KP.w}" height="230" fill="url(#tb-kg)"/></mask>`;
    return `<defs>${fade}${defs}</defs><g fill="none" stroke-width="${KP.SW}" stroke-linecap="round" stroke-linejoin="round" mask="url(#tb-kfade)">${paths}</g>`;
  },
};

// ---------- 5. WOVEN: the finished plain weave, close up ----------
const WOVEN = { cols: 15, rows: 13, pitch: 52, rowPitch: 44, R: YARN.R1, zoom: 2.3 };
function buildWoven() {
  const W = WOVEN, w = (W.cols - 1) * W.pitch, h = (W.rows - 1) * W.rowPitch;
  const cx = VIEW.w / 2, cy = VIEW.h / 2, x0 = cx - w / 2, y0 = cy - h / 2;
  const xs = Array.from({ length: W.cols }, (_, i) => x0 + i * W.pitch), ys = Array.from({ length: W.rows }, (_, k) => y0 + k * W.rowPitch);
  const layers = ['', '', ''];
  const ext = 40;
  ys.forEach((y, k) => {
    const line = centreline([lineSeg(x0 - ext, y, x0 + w + ext, y)]);
    const yarn = { line, sOff: 0, R: W.R, fibres: yarnFibres(SEED + 101 + k, line.length + 20, -20), front: 1, back: BACK, edge: EDGE };
    if (k === Math.floor(W.rows / 2)) yarn.fibres.push(Object.assign(makeFibre(rng(SEED + 99), 0, true), { c: ext + w / 2 + 6, phi: Math.PI / 2, sgn: 1 }));
    for (let i = -1; i < W.cols; i++) {
      const s0 = i < 0 ? 0 : ext + (i - 0.5) * W.pitch, s1 = ext + (i + 0.5) * W.pitch;
      layers[i < 0 ? 0 : ((i + k) % 2 === 0 ? 2 : 1)] += pieceMarkup(yarn, s0, s1, true);
    }
    layers[0] += pieceMarkup(yarn, ext + (W.cols - 0.5) * W.pitch, line.length, true);
  });
  xs.forEach((x, i) => {
    const line = centreline([lineSeg(x, y0 + h + ext, x, y0 - ext)]);
    const yarn = { line, sOff: 0, R: W.R, fibres: yarnFibres(SEED + 201 + i, line.length + 20, -20), front: WARP_FRONT, back: WARP_BACK, edge: WARP_EDGE };
    for (let k = -1; k <= W.rows; k++) {
      // s runs bottom to top; row k (top first) sits at y0 + k*rowPitch
      const yTop = k < 0 ? y0 - ext : y0 + (k - 0.5) * W.rowPitch, yBot = k === W.rows ? y0 + h + ext : y0 + (k + 0.5) * W.rowPitch;
      const s0 = (y0 + h + ext) - Math.min(yBot, y0 + h + ext), s1 = (y0 + h + ext) - Math.max(yTop, y0 - ext);
      const L = k < 0 || k === W.rows ? 0 : ((i + k) % 2 === 0 ? 1 : 2);
      layers[L] += pieceMarkup(yarn, s0, s1, true);
    }
  });
  return `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${layers.join('')}</g>`;
}
let WOVEN_MARKUP = null;
const wovenMarkup = () => WOVEN_MARKUP || (WOVEN_MARKUP = buildWoven());
// the camera pulls in from cloth to the interlacing: viewBox from WOVEN.zoom down to 1x
function wovenView(t) {
  const z = lerp(WOVEN.zoom, 1, ease(seg(t, 0.05, 0.92))), w = VIEW.w * z, h = VIEW.h * z;
  return `${f1(VIEW.w / 2 - w / 2)} ${f1(VIEW.h / 2 - h / 2)} ${f1(w)} ${f1(h)}`;
}
const wovenScene = {
  viewBox: wovenView(1), duration: 5200,
  markup: () => wovenMarkup(),
  view: wovenView,
  init(svg) { svg.innerHTML = wovenMarkup(); },
  render(svg, t) { svg.setAttribute('viewBox', wovenView(t)); },
};

// ---------- 6. NONWOVEN: the flurry settles into a web, is pressed, and is bonded ----------
const WEB = { y: 112, half: 76, squeeze: 0.62, extra: 40 };
let WEBF = null;
function buildWeb() {
  const r = rng(SEED + 500);
  const fib = MATERIAL.map(f => ({ f, start: fiberPose(f, 1), entering: false }));
  for (let i = 0; i < WEB.extra; i++) {
    const f = makeFibre(r, 100 + i, false);
    f.z = r(); f.cph = r() * TAU;
    const x = 10 + r() * 300;
    fib.push({ f, start: { x: x + (r() - 0.5) * 40, y: -30 - r() * 60, ang: r() * Math.PI, crimp: 1 }, entering: true });
  }
  fib.forEach((o, i) => {
    o.wx = o.entering ? lerp(o.start.x, 12 + r() * 296, 0.7) : lerp(o.start.x, 12 + r() * 296, 0.35);
    o.wy = WEB.y + (r() * 2 - 1) * WEB.half * 0.88;
    o.wang = o.start.ang + (r() - 0.5) * 0.9;
    o.delay = (o.entering ? 0.06 : 0) + r() * 0.14;
    o.z = o.f.accent ? 2 : r();
  });
  // bond points: a staggered diamond lattice across the pressed web
  const bonds = []; let n = 0;
  for (let row = -1; row <= 1; row++) for (let x = 24 + (row === 0 ? 18 : 0); x < 306; x += 36) bonds.push({ x, y: WEB.y + row * 26, k: n++ });
  return { fib, bonds };
}
const web = () => WEBF || (WEBF = buildWeb());
const nonwovenScene = {
  viewBox: `0 0 ${VIEW.w} ${VIEW.h}`, duration: 7400,
  markup(t) {
    const W = web(), runs = [];
    const press = ease(seg(t, 0.46, 0.68)), sq = lerp(1, WEB.squeeze, press);
    for (const o of W.fib) {
      const g = ease(seg(t, o.delay, o.delay + 0.34));
      const pose = { x: lerp(o.start.x, o.wx, g), y: lerp(o.start.y, o.wy, g), ang: lerp(o.start.ang, o.wang, g), crimp: lerp(o.start.crimp ?? 1, 1, g) };
      const pts = posedPoints(o.f, pose, o.z);
      if (press > 0) for (const p of pts) p.y = WEB.y + (p.y - WEB.y) * sq;
      runs.push({ pts, depth: o.z, color: o.f.accent ? ACCENT : INK, op: 1 });
    }
    let s = `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${runsMarkup(runs)}</g>`;
    // the press: two plates close on the web, then lift away
    const show = seg(t, 0.4, 0.46) * (1 - seg(t, 0.7, 0.78));
    if (show > 0) {
      const gap = WEB.half * sq + 7, op = f1(show * 100) / 100;
      s += `<g stroke="${INK}" stroke-width="1.6" stroke-opacity="${op}" fill="none"><path d="M6,${f1(WEB.y - gap)}H314"/><path d="M6,${f1(WEB.y + gap)}H314"/></g>`;
    }
    for (const b of W.bonds) {
      const k = ease(seg(t, 0.76 + b.k * 0.004, 0.84 + b.k * 0.004));
      if (k <= 0) continue;
      // a bond point: the fibres under it melted into one spot (an oval, pressed flat like the web)
      const rx = 5.2 * k, ry = 3.6 * k;
      s += `<ellipse cx="${f1(b.x)}" cy="${f1(b.y)}" rx="${f1(rx + 1.3)}" ry="${f1(ry + 1.3)}" fill="${BG}"/><ellipse cx="${f1(b.x)}" cy="${f1(b.y)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${INK}" fill-opacity="0.82"/>`;
    }
    return s;
  },
};

export const SCENES = { fiber: fiberScene, yarn: yarnScene, fabric: fabricScene, knit: knitScene, woven: wovenScene, nonwoven: nonwovenScene };

// ---------- playback: once on scroll-in, hold, replay on hover / tap ----------
function draw(svg, scene, t) {
  if (scene.render) scene.render(svg, t);
  else svg.innerHTML = scene.markup(t);
}
export function mountTextileBasics(root = document, opts = {}) {
  const reduce = opts.reducedMotion ?? (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const players = [];
  for (const host of root.querySelectorAll('[data-tx-anim]')) {
    const scene = SCENES[host.dataset.txAnim]; if (!scene) continue;
    const svg = host.querySelector('svg') || host.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
    svg.setAttribute('viewBox', scene.view ? scene.view(reduce ? 1 : 0) : scene.viewBox);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    if (scene.init) scene.init(svg);
    const p = { host, svg, scene, raf: 0, t: reduce ? 1 : 0, played: false, playing: false };
    draw(svg, scene, p.t);
    p.play = () => {
      if (reduce || p.playing) return;
      p.playing = true; p.played = true;
      const t0 = performance.now();
      const step = now => {
        p.t = Math.min(1, (now - t0) / scene.duration);
        draw(svg, scene, p.t);
        if (p.t < 1) p.raf = requestAnimationFrame(step); else p.playing = false;
      };
      p.raf = requestAnimationFrame(step);
    };
    p.seek = t => { cancelAnimationFrame(p.raf); p.playing = false; p.t = t; draw(svg, scene, t); };
    if (!reduce) {
      host.addEventListener('mouseenter', () => { if (p.played) p.play(); });
      host.addEventListener('click', () => p.play());
    }
    players.push(p);
  }
  if (!reduce && opts.autoplay !== false && typeof IntersectionObserver === 'function') {
    const io = new IntersectionObserver(es => {
      for (const e of es) if (e.isIntersecting) { const p = players.find(q => q.host === e.target); if (p && !p.played) p.play(); io.unobserve(e.target); }
    }, { threshold: 0.45 });
    players.forEach(p => io.observe(p.host));
  }
  return players;
}
