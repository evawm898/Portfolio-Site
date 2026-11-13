// smart-textiles-study-scenes.js — the animated diagrams and labs of /smart-textiles-study.html.
// Same contract and drawing kit as the note itself (smart-textiles-core.js): a scene is
// { vb, dur, state?, draw(t, state) }, t loops 0 -> 1. A LAB is a scene whose state is written by
// sliders on the page (data-sx-for / data-sx-key) and whose read-outs are drawn from that state, so
// what you move and what you read can't disagree. Labs keep a running phase in state (adv()) so
// their electrons speed up and slow down smoothly instead of jumping when a slider moves.
//
// Colour: petrol = electrons / current, plum = hot / high, indigo = cool / low / field lines, mint =
// a signal; material colours are var(--st-*). Text is ink or dim only.
import {
  C, TAU, clamp, lerp, ease, seg, eseg, fr, pulse, rng, mix, poly, path, line, rect, circ, txt, tag,
  arrow, measure, at, electrons, sample, plot, grp,
} from './smart-textiles-core.js';
import { STACKS } from './smart-textiles-study-data.js';
import { JERSEY_REST, weftCourse } from './textile-knit-loops.js';

// bigger type than the note: this page is read closely and on phones
const T = (x, y, s, o = {}) => txt(x, y, s, { size: 10, ...o });
const L = (x, y, s, o = {}) => tag(x, y, s, { size: 8.5, ...o });
const H = (x, y, s, o = {}) => txt(x, y, s, { size: 13, fill: C.ink, ...o });
const fmt = (v, d = 2) => { if (!isFinite(v)) return '∞'; const a = Math.abs(v); return a >= 100 ? Math.round(v).toLocaleString('en-US') : a >= 10 ? v.toFixed(1) : v.toFixed(d); };
function ohms(r) {
  if (r >= 1e6) return `${fmt(r / 1e6)} MΩ`;
  if (r >= 1e3) return `${fmt(r / 1e3)} kΩ`;
  if (r < 1) return `${fmt(r * 1e3)} mΩ`;
  return `${fmt(r)} Ω`;
}
// running phase that follows a changing rate without jumping
function adv(st, key, t, rate) {
  const lk = '_t' + key; let d = st[lk] == null ? 0 : t - st[lk];
  if (d < 0) d += 1; if (d > 0.5) d = 0;
  st[lk] = t; st['_p' + key] = (st['_p' + key] || 0) + d * rate; return st['_p' + key];
}
function finger(cx, yTip, w = 26) {
  return path(`M${cx - w / 2},${yTip - 60} L${cx - w / 2},${yTip - 12} Q${cx - w / 2},${yTip} ${cx},${yTip} Q${cx + w / 2},${yTip} ${cx + w / 2},${yTip - 12} L${cx + w / 2},${yTip - 60}`, { stroke: C.ink, 'stroke-width': 1.2, fill: C.bg })
    + path(`M${cx - w / 2 + 5},${yTip - 30} Q${cx},${yTip - 24} ${cx + w / 2 - 5},${yTip - 30}`, { stroke: C.faint, 'stroke-width': 0.8 });
}
const press = t => pulse(fr(t), 0.12, 0.32, 0.55, 0.78);
// a zig-zag resistor between two points (vertical)
function zigV(x, y0, y1, o = {}) {
  const n = 6, pts = [{ x, y: y0 }, { x, y: y0 + 6 }];
  for (let i = 0; i < n; i++) pts.push({ x: x + (i % 2 ? -7 : 7), y: lerp(y0 + 6, y1 - 6, (i + 0.5) / n) });
  pts.push({ x, y: y1 - 6 }, { x, y: y1 });
  return path(poly(pts), { stroke: o.color || C.ink, 'stroke-width': o.sw || 1.4, 'stroke-linejoin': 'round' });
}
const check = ok => ok ? '✓' : '✕';

// =============================================================================================
// 01 · FLOW
// =============================================================================================
// A loop circuit: battery, conductive thread, LED, switch. The switch opens for a while each loop:
// the drift stops (the electrons only jiggle) and the LED goes out. view: both | electrons | current.
const LOOP = [{ x: 90, y: 160 }, { x: 90, y: 196 }, { x: 560, y: 196 }, { x: 560, y: 140 }, { x: 560, y: 90 }, { x: 560, y: 40 }, { x: 90, y: 40 }, { x: 90, y: 70 }];
const LOOPC = measure(LOOP);
const circuit = {
  vb: '0 0 720 230', dur: 9000, state: { view: 'both' },
  draw(t, st) {
    let s = '';
    const open = eseg(t, 0.6, 0.64) * (1 - eseg(t, 0.9, 0.94));      // 0 closed -> 1 open
    const flowT = (Math.min(t, 0.62) + Math.max(0, t - 0.92)) / 0.70; // stops while open, wraps cleanly
    // wires (the bottom run is cut by the switch at 300..340)
    const W = { stroke: C.silver, 'stroke-width': 3, 'stroke-linecap': 'round' };
    s += path(poly([{ x: 90, y: 70 }, { x: 90, y: 40 }, { x: 560, y: 40 }, { x: 560, y: 92 }]), W);
    s += path(poly([{ x: 560, y: 138 }, { x: 560, y: 196 }, { x: 340, y: 196 }]), W);
    s += path(poly([{ x: 300, y: 196 }, { x: 90, y: 196 }, { x: 90, y: 160 }]), W);
    // switch lever
    const ang = -0.55 * open;
    s += circ(300, 196, 3, { fill: C.ink }) + circ(340, 196, 3, { fill: C.ink });
    s += line(300, 196, 300 + 40 * Math.cos(ang), 196 + 40 * Math.sin(ang), { stroke: C.ink, 'stroke-width': 2.4, 'stroke-linecap': 'round' });
    s += L(320, 222, 'switch', { anchor: 'middle' });
    // battery: long plate +, short plate -
    s += line(72, 74, 108, 74, { stroke: C.ink, 'stroke-width': 2.4 }) + line(80, 84, 100, 84, { stroke: C.ink, 'stroke-width': 4 });
    s += line(72, 140, 108, 140, { stroke: C.ink, 'stroke-width': 2.4 }) + line(80, 150, 100, 150, { stroke: C.ink, 'stroke-width': 4 });
    s += path(`M90,84 L90,140`, { stroke: C.faint, 'stroke-width': 1, 'stroke-dasharray': '2 3' });
    s += T(116, 78, '+', { size: 14, fill: C.ink }) + T(116, 160, '−', { size: 14, fill: C.ink });
    s += L(40, 117, 'battery', { anchor: 'middle' });
    // LED: triangle + bar, glowing while closed
    const glow = 1 - open;
    s += path('M548,96 L572,96 L560,116 Z', { stroke: C.ink, 'stroke-width': 1.2, fill: glow > 0.5 ? C.mint : C.bg, 'fill-opacity': glow > 0.5 ? 0.85 : null });
    s += line(546, 118, 574, 118, { stroke: C.ink, 'stroke-width': 1.6 }) + path('M560,118 L560,138', { stroke: C.silver, 'stroke-width': 3 });
    if (glow > 0.02) for (let k = 0; k < 5; k++) {
      const a = (k - 2) * 0.42, r0 = 20, r1 = 20 + 9 * glow * (0.75 + 0.25 * Math.sin(t * TAU * 6 + k));
      s += line(560 - Math.cos(a) * r0, 106 + Math.sin(a) * r0, 560 - Math.cos(a) * r1, 106 + Math.sin(a) * r1, { stroke: C.mint, 'stroke-width': 1.3, 'stroke-opacity': f2(glow) });
    }
    s += L(580, 110, 'LED');
    s += L(325, 30, 'conductive thread', { anchor: 'middle' });
    // electrons: - terminal round the outside loop to +; they jiggle in place while the loop is open
    const view = st.view || 'both';
    if (view !== 'current') {
      const cum = LOOPC, n = 26;
      for (let i = 0; i < n; i++) {
        const u = fr(i / n + flowT * 2);
        const p = at(LOOP, cum, u);
        const jig = 1.6 * open;
        s += circ(p.x + jig * Math.sin(i * 7.3 + t * TAU * 13), p.y + jig * Math.cos(i * 5.1 + t * TAU * 11), 2.3, { fill: C.petrol });
      }
    }
    // conventional current: chevrons going the other way, + round to -
    if (view !== 'electrons') {
      const n = 12;
      for (let i = 0; i < n; i++) {
        const u = 1 - fr(i / n + flowT * 2), p = at(LOOP, LOOPC, u), a = p.ang + Math.PI;
        const x = p.x, y = p.y, sz = 5;
        s += path(`M${x - sz * Math.cos(a - 0.6)},${y - sz * Math.sin(a - 0.6)} L${x},${y} L${x - sz * Math.cos(a + 0.6)},${y - sz * Math.sin(a + 0.6)}`, { stroke: C.ink, 'stroke-width': 1.3, 'stroke-opacity': 0.85 });
      }
    }
    // key + the state in words
    s += circ(608, 156, 2.6, { fill: C.petrol }) + T(618, 160, 'electrons') + T(618, 174, '− to +');
    s += path('M605,192 L610,196 L605,200', { stroke: C.ink, 'stroke-width': 1.3 }) + T(618, 200, 'current arrow') + T(618, 214, '+ to −');
    s += H(325, 125, open > 0.5 ? 'no loop, no flow' : 'a closed loop', { anchor: 'middle', 'fill-opacity': null, size: 13 });
    if (open > 0.5) s += T(325, 143, 'the electrons only jiggle in place', { anchor: 'middle' });
    return s;
  },
};
const f2 = v => Math.round(clamp(v) * 100) / 100;

// Marbles in a full tube: push one in, one falls out the far end at once; each marble moves one step.
const marbles = {
  vb: '0 0 360 230', dur: 7000,
  draw(t) {
    let s = '';
    const x0 = 46, x1 = 292, y = 52, step = 18, r = 7.5, push = eseg(t, 0.12, 0.34);
    s += path(`M${x0},${y - 11} L${x1},${y - 11} M${x0},${y + 11} L${x1},${y + 11}`, { stroke: C.ink2, 'stroke-width': 1.2 });
    const px = x0 - 26 + push * step;
    s += rect(px - 22, y - 8, 22, 16, { fill: C.raised, stroke: C.ink, 'stroke-width': 1 }) + line(px - 34, y, px - 22, y, { stroke: C.ink, 'stroke-width': 1.4 });
    s += L(16, y - 18, 'push');
    // the cup the end marble drops into
    const cx = x1 + 30, ct = y + 18, cb = y + 44;
    s += path(`M${cx - 18},${ct} L${cx - 14},${cb} L${cx + 14},${cb} L${cx + 18},${ct}`, { stroke: C.ink2, 'stroke-width': 1 });
    s += L(cx, cb + 12, 'out', { anchor: 'middle' });
    for (let i = -1; i < 15; i++) {
      let x = x0 + r + 2 + i * step + push * step, yy = y;
      if (x < x0 - 4) continue;
      if (x > x1 - r) { const k = clamp((x - (x1 - r)) / step); x = lerp(x1 - r, cx, k); yy = y + (cb - r - y) * k * k; }
      s += circ(x, yy, r, { fill: C.bg, stroke: C.petrol, 'stroke-width': 1.3 });
    }
    const flash = pulse(t, 0.12, 0.16, 0.3, 0.4);
    if (flash > 0.01) s += line(x0, y + 18, x1, y + 18, { stroke: C.mint, 'stroke-width': 2, 'stroke-opacity': f2(flash) });
    s += T(x0, y + 40, 'each marble moves one step;');
    s += T(x0, y + 54, 'the push reaches the end at once');
    const yb = 136;
    s += L(24, yb, 'one electron drifting');
    const crawl = 24 + 3 * fr(t);
    s += line(24, yb + 10, 330, yb + 10, { stroke: C.hair, 'stroke-width': 1 }) + circ(crawl, yb + 10, 3, { fill: C.petrol });
    s += T(24, yb + 28, '\u2248 0.07 mm/s  (copper, 1 A per mm\u00b2)');
    s += L(24, yb + 50, 'the push, along the wire');
    s += line(24, yb + 58, 330, yb + 58, { stroke: C.mint, 'stroke-width': 1.5, 'stroke-opacity': f2(0.3 + 0.7 * flash) });
    s += T(24, yb + 76, '\u2248 200,000 km/s \u2014 billions of times faster');
    return s;
  },
};

// Ohm's law as a hallway. V = how hard the crowd is pushed, R = how narrow and cluttered the hall is.
const OHM_POSTS = (() => { const g = rng(5), a = []; for (let i = 0; i < 60; i++) a.push({ x: g(), y: g() }); return a; })();
const ohm = {
  vb: '0 0 720 240', dur: 6000, state: { V: 3, R: 100 },
  draw(t, st) {
    const V = +st.V, R = +st.R, I = V / R, mA = I * 1000;
    let s = '';
    // push gauge
    const gh = 120, gk = V / 12;
    s += rect(36, 40, 26, gh, { fill: C.raised, stroke: C.line });
    s += rect(36, 40 + gh * (1 - gk), 26, gh * gk, { fill: C.petrol, 'fill-opacity': 0.35 });
    s += H(49, 180, `${fmt(V, 1)} V`, { anchor: 'middle', size: 12 }) + L(49, 196, 'push', { anchor: 'middle' });
    // hallway: narrower and more cluttered with R
    const rk = Math.log10(R / 10) / Math.log10(50);   // 0 at 10 ohm .. 1 at 500 ohm
    const hw = lerp(46, 12, rk), yc = 100, xa = 120, xb = 560;
    s += path(`M80,${yc - 52} L${xa},${yc - 52} L${xa + 30},${yc - hw} L${xb - 30},${yc - hw} L${xb},${yc - 52} L620,${yc - 52}`, { stroke: C.ink2, 'stroke-width': 1.2 });
    s += path(`M80,${yc + 52} L${xa},${yc + 52} L${xa + 30},${yc + hw} L${xb - 30},${yc + hw} L${xb},${yc + 52} L620,${yc + 52}`, { stroke: C.ink2, 'stroke-width': 1.2 });
    const nPosts = Math.round(lerp(4, 40, rk));
    for (let i = 0; i < nPosts; i++) { const p = OHM_POSTS[i]; s += circ(lerp(xa + 40, xb - 40, p.x), yc + (p.y - 0.5) * (hw * 2 - 8), 2.6, { fill: C.carbon, stroke: C.dim, 'stroke-width': 0.6 }); }
    // the crowd: speed follows the current (log)
    const rate = 0.3 + 2.7 * clamp(Math.log10(Math.max(mA, 1)) / Math.log10(1200));
    const ph = adv(st, 'e', t, rate), g = rng(9);
    for (let i = 0; i < 34; i++) {
      const u = fr(i / 34 + ph), x = lerp(80, 620, u);
      const half = x < xa ? 52 : x < xa + 30 ? lerp(52, hw, (x - xa) / 30) : x < xb - 30 ? hw : x < xb ? lerp(hw, 52, (x - (xb - 30)) / 30) : 52;
      const y = yc + (g() - 0.5) * (half * 2 - 8);
      s += circ(x, y, 2.4, { fill: C.petrol });
    }
    s += L(340, yc - 60, `resistance ${ohms(R)} — the fight`, { anchor: 'middle' });
    // read-out
    s += H(650, 70, 'I = V / R', { anchor: 'middle' });
    s += T(650, 92, `${fmt(V, 1)} V ÷ ${ohms(R)}`, { anchor: 'middle' });
    s += H(650, 118, mA >= 1000 ? `${fmt(I)} A` : `${fmt(mA, 1)} mA`, { anchor: 'middle', size: 16 });
    s += L(650, 134, 'flow', { anchor: 'middle' });
    s += H(360, 196, 'Push = Flow × Fight', { anchor: 'middle' });
    s += T(360, 216, 'V = I × R. Move the sliders: twice the push, twice the flow; twice the fight, half the flow.', { anchor: 'middle' });
    return s;
  },
};

// =============================================================================================
// 02 · RESISTANCE
// =============================================================================================
export const YARN_MATS = {
  silver: { name: 'silver', rho: 1.59e-8, c: C.silver },
  copper: { name: 'copper', rho: 1.68e-8, c: C.copper },
  steel: { name: 'stainless steel', rho: 7.2e-7, c: C.steel },
  nichrome: { name: 'nichrome', rho: 1.10e-6, c: C.steel },
  carbon: { name: 'carbon fibre', rho: 1.5e-5, c: C.carbon },
};
export const FILS = [1, 2, 4, 8, 16, 32, 64, 128];
const FIL_A = Math.PI * (10e-6) ** 2;      // one 20 um filament
export const yarnCalc = (mat, len, fil) => { const m = YARN_MATS[mat] || YARN_MATS.copper, n = FILS[fil] ?? 1; const perM = m.rho / (n * FIL_A); return { m, n, perM, R: perM * len }; };
const yarnR = {
  vb: '0 0 720 260', dur: 6000, state: { mat: 'steel', len: 1, fil: 3 },
  draw(t, st) {
    const len = +st.len, fil = +st.fil, { m, n, perM, R } = yarnCalc(st.mat, len, fil);
    let s = '';
    // side view: the yarn's drawn length follows L
    const x0 = 30, x1 = x0 + len / 2 * 420, yc = 62, k = Math.min(n, 9), band = 3.2;
    const rate = 0.25 + 2.2 * clamp(1 - Math.log10(R) / 6);
    const ph = adv(st, 'y', t, rate);
    for (let j = 0; j < k; j++) {
      const off = (j - (k - 1) / 2) * band, pts = sample(60, u => ({ x: lerp(x0, x1, u), y: yc + off + Math.sin(u * (x1 - x0) / 14 + j) * 1.2 }));
      s += path(poly(pts), { stroke: m.c, 'stroke-width': 1.6 });
      if (st.mat === 'carbon') s += path(poly(pts), { stroke: C.dim, 'stroke-width': 0.4 });
      s += electrons(pts, ph + j * 0.37, { n: Math.max(2, Math.round((x1 - x0) / 60)), r: 1.4 });
    }
    s += line(x0, yc + 20, x1, yc + 20, { stroke: C.faint, 'stroke-width': 0.8 }) + line(x0, yc + 16, x0, yc + 24, { stroke: C.faint }) + line(x1, yc + 16, x1, yc + 24, { stroke: C.faint });
    s += L((x0 + x1) / 2, yc + 34, `L = ${fmt(len)} m`, { anchor: 'middle' });
    if (n > 9) s += L(x0, yc - 22, `${n} filaments (9 drawn)`); else s += L(x0, yc - 22, `${n} filament${n > 1 ? 's' : ''}`);
    // cross-section: n filaments packed
    const cx = 110, cy = 170, rr = 3;
    for (let i = 0; i < n; i++) { const a = i * 2.39996, d = rr * 2.05 * Math.sqrt(i); s += circ(cx + d * Math.cos(a), cy + d * Math.sin(a), rr, { fill: m.c, stroke: st.mat === 'carbon' ? C.dim : null, 'stroke-width': 0.5 }); }
    s += L(cx, 238, 'cross-section A', { anchor: 'middle' });
    // numbers
    const X = 250;
    s += T(X, 128, `material: ${m.name}   ρ = ${sci(m.rho)} Ω·m`);
    s += T(X, 150, `one 20 µm filament: ${ohms(m.rho / FIL_A)} per metre`);
    s += T(X, 172, `${n} in parallel → ${ohms(perM)} per metre  (more lanes, less jam)`);
    s += H(X, 200, `R = ρL/A = ${ohms(R)}`);
    s += T(X, 220, 'Long and thin, resistance wins.');
    // a log ladder: where this R sits
    const lx0 = 470, lx1 = 700, ly = 236, lo = -2, hi = 6, xr = v => lx0 + (clamp((Math.log10(v) - lo) / (hi - lo))) * (lx1 - lx0);
    s += line(lx0, ly, lx1, ly, { stroke: C.line, 'stroke-width': 1 });
    for (let e = lo; e <= hi; e += 2) s += line(xr(10 ** e), ly - 3, xr(10 ** e), ly + 3, { stroke: C.faint }) + txt(xr(10 ** e), ly + 14, e < 0 ? `${10 ** (e + 3)}m` : e < 3 ? `${10 ** e}` : e < 6 ? `${10 ** (e - 3)}k` : `${10 ** (e - 6)}M`, { size: 8, anchor: 'middle', fill: C.dim });
    s += circ(xr(R), ly, 4, { fill: C.petrol, stroke: C.bg, 'stroke-width': 1 });
    return s;
  },
};
export const sci = v => { const e = Math.floor(Math.log10(v)), m = v / 10 ** e; return `${m.toFixed(2)} × 10${sup((e < 0 ? '⁻' : '') + Math.abs(e))}`; };
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
function sup(d) { return String(d).split('').map(c => SUP[c] || c).join(''); }

// Series vs parallel: three segments end to end (with contacts between them) vs three side by side.
const lanes = {
  vb: '0 0 360 230', dur: 6000,
  draw(t) {
    let s = '';
    // series
    s += L(16, 22, 'series: end to end — resistances add');
    const ys = 50, segs = [[30, 110], [130, 210], [230, 310]];
    for (const [a, b] of segs) s += line(a, ys, b, ys, { stroke: C.steel, 'stroke-width': 4, 'stroke-linecap': 'round' });
    for (const x of [120, 220]) s += rect(x - 7, ys - 7, 14, 14, { fill: C.raised, stroke: C.ink2, 'stroke-width': 1 });
    s += L(170, ys + 26, 'every contact is a toll booth', { anchor: 'middle' });
    // electrons slow at each booth: positions follow a warped clock
    const n = 9;
    for (let i = 0; i < n; i++) {
      const u0 = fr(i / n + t * 0.8), xs = 30 + u0 * 280;
      const warp = (xx) => { let d = 0; for (const b of [120, 220]) d += 6 * Math.exp(-(((xx - b) / 9) ** 2)); return d; };
      s += circ(xs - warp(xs), ys, 2.2, { fill: C.petrol });
    }
    s += T(16, ys + 48, 'R + R + R + 2 contacts');
    // parallel
    const yp = 140;
    s += L(16, yp - 18, 'parallel: side by side — lanes add');
    s += line(30, yp - 6, 30, yp + 54, { stroke: C.silver, 'stroke-width': 5 }) + line(310, yp - 6, 310, yp + 54, { stroke: C.silver, 'stroke-width': 5 });
    for (let k = 0; k < 3; k++) { const y = yp + k * 24; s += line(30, y, 310, y, { stroke: C.steel, 'stroke-width': 4 }); s += electrons([{ x: 30, y }, { x: 310, y }], t * 2.4 + k * 0.2, { n: 7, r: 2.2 }); }
    s += T(16, yp + 78, 'R ÷ 3 — more lanes, less jam');
    return s;
  },
};

// A conductive knit stretched: the loops pull apart, fewer touch, R climbs. Loops are the site's one
// knit geometry (textile-knit-loops.js), drawn back course first so each course lies over the last.
const contacts = {
  vb: '0 0 360 230', dur: 7000,
  draw(t) {
    let s = '';
    const st = pulse(t, 0.12, 0.38, 0.6, 0.86), n = 6, W = lerp(30, 42, st), Hc = lerp(24, 20, st), Lp = JERSEY_REST.loopPerCourse * 24;
    const x0 = 180 - (n - 1) * W / 2, top = 40;
    const rows = [0, 1, 2, 3].map(c => weftCourse({ x0, cy: top + 14 + c * Hc, W, L: Lp, n }));
    for (let c = rows.length - 1; c >= 0; c--) s += strandK(rows[c]);
    // contacts where neighbouring loops' legs meet: they open up as the knit stretches
    let on = 0, all = 0;
    for (let c = 0; c < 4; c++) for (let k = 0; k < n - 1; k++) {
      all++; const g = ((c * 7 + k * 3) % 5) / 5, kk = clamp(1 - (st - g * 0.6) * 2.4);
      if (kk > 0.25) on++;
      if (kk > 0.02) s += circ(x0 + (k + 0.5) * W, top + 14 + c * Hc + 2, 2.6 * kk + 0.4, { fill: C.petrol, 'fill-opacity': f2(kk) });
    }
    s += arrow(36, 76, 14, 76, { color: C.plum, op: f2(st) }) + arrow(324, 76, 346, 76, { color: C.plum, op: f2(st) });
    s += L(180, 22, `${on} of ${all} loop-to-loop contacts touching`, { anchor: 'middle' });
    s += plot({ x: 40, y: 160, w: 280, h: 40, u: fr(t), f: v => 0.2 + 0.7 * pulse(fr(v), 0.12, 0.38, 0.6, 0.86), title: 'resistance', xl: 'time', grid: [], color: C.petrol, readout: st > 0.5 ? 'stretched: fewer contacts' : 'relaxed: many contacts' });
    s += T(40, 224, 'Every contact is a toll booth.', { size: 9.5 });
    return s;
  },
};
const strandK = pts => path(poly(pts), { stroke: C.bg, 'stroke-width': 5.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }) + path(poly(pts), { stroke: C.silver, 'stroke-width': 2.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });

// Heater lab: one battery (5 V), n parallel lines of length L, choose the yarn.
export const HEATER_YARNS = { 10: 'silver-plated, 10 Ω/m', 30: 'stainless steel, 30 Ω/m', 100: 'carbon, 100 Ω/m' };
export function heaterHint(c) {
  if (c.okP && c.okI && c.okC) return ['✓ A workable heater.'];
  if (c.I > 2) return ['! Too much current:', 'lengthen the lines or use fewer.'];
  if (c.P < 3 && !c.okC) return ['! Too cold and too small:', 'add lines in parallel.'];
  if (c.P < 3) return ['! Too cold — longer is colder:', 'shorten the lines or add lines.'];
  if (c.P > 6) return ['! Too hot:', 'lengthen the lines or remove one.'];
  return ['! Covers too little panel:', 'add lines, shorten each.'];
}
export const heaterCalc = (ohmPerM, n, len, V = 5) => { const R = ohmPerM * len / n, I = V / R, P = V * V / R, cov = n * len; return { R, I, P, cov, okP: P >= 3 && P <= 6, okI: I <= 2, okC: cov >= 1.2, wpm: P / cov }; };
const heater = {
  vb: '0 0 720 280', dur: 5000, state: { yarn: '30', n: 1, len: 1.5 },
  draw(t, st) {
    const y = +st.yarn, n = Math.round(+st.n), len = +st.len, c = heaterCalc(y, n, len);
    let s = '';
    // panel
    const px = 24, py = 26, pw = 380, ph = 228;
    s += rect(px, py, pw, ph, { fill: C.raised, stroke: C.line, rx: 4 });
    s += line(px + 8, py + 10, px + 8, py + ph - 10, { stroke: C.silver, 'stroke-width': 4 }) + line(px + pw - 8, py + 10, px + pw - 8, py + ph - 10, { stroke: C.silver, 'stroke-width': 4 });
    s += L(px + 8, py - 8, '+5 V bus') + L(px + pw - 8, py - 8, 'return bus', { anchor: 'end' });
    // heat colour: watts per metre of yarn
    const k = clamp(c.wpm / 5), col = mix(C.indigo, C.plum, k);
    const bandH = (ph - 20) / n, passes = 2 * Math.max(0, Math.round((len / 0.25 - 1) / 2)) + 1;
    const rate = clamp(c.I, 0.05, 3) * 1.4, phE = adv(st, 'h', t, rate);
    for (let i = 0; i < n; i++) {
      const top = py + 10 + i * bandH, xL = px + 22, xR = px + pw - 22, yy = p => top + bandH * (p + 0.5) / passes;
      const pts = [{ x: px + 8, y: yy(0) }, { x: xR, y: yy(0) }];
      for (let p = 1; p < passes; p++) { const x = p % 2 ? xL : xR; pts.push({ x: pts[pts.length - 1].x, y: yy(p) }, { x, y: yy(p) }); }
      pts[pts.length - 1].x = px + pw - 8;
      s += path(poly(pts), { stroke: col, 'stroke-width': 1 + 3 * k, 'stroke-dasharray': k < 0.3 ? '5 3' : null, 'stroke-linejoin': 'round' });
      s += electrons(pts, phE + i * 0.17, { n: Math.max(4, passes * 3), r: 1.6 });
    }
    // rising heat
    const haze = Math.round(clamp(c.P / 6) * 9);
    for (let i = 0; i < haze; i++) { const x = px + 30 + i * 38, u = fr(t * 0.8 + i * 0.37); s += path(poly(sample(8, v => ({ x: x + Math.sin(v * 6 + i) * 3, y: py + 4 - u * 18 - v * 10 }))), { stroke: C.plum, 'stroke-width': 1, 'stroke-opacity': f2(0.7 * (1 - u)) }); }
    // the sums
    const X = 430;
    s += H(X, 44, `${n} line${n > 1 ? 's' : ''} × ${fmt(len)} m of ${HEATER_YARNS[y].split(',')[0]}`, { size: 12 });
    s += T(X, 70, `R = ${y} Ω/m × ${fmt(len)} m ÷ ${n} = ${ohms(c.R)}`);
    s += T(X, 96, `${check(c.okI)}  I = V/R = ${fmt(c.I)} A          (≤ 2 A from USB)`);
    s += T(X, 120, `${check(c.okP)}  P = V²/R = ${fmt(c.P, 1)} W          (aim 3–6 W)`);
    s += T(X, 144, `${check(c.okC)}  yarn laid = ${fmt(c.cov)} m        (≥ 1.2 m to spread it)`);
    s += T(X, 168, `    ${fmt(c.wpm, 1)} W per metre of yarn`);
    const hint = heaterHint(c);
    s += H(X, 204, hint[0], { size: 11.5 });
    if (hint[1]) s += H(X, 222, hint[1], { size: 11.5 });
    s += T(X, 256, 'At fixed voltage, longer is colder.');
    return s;
  },
};

// =============================================================================================
// 03 · METALS
// =============================================================================================
const RHO_BARS = [
  ['silver', 1.59e-8, C.silver, 'Ag'], ['copper', 1.68e-8, C.copper, 'Cu'], ['gold', 2.44e-8, 'var(--st-gold)', 'Au'], ['aluminium', 2.65e-8, C.steel, 'Al'],
  ['nickel', 6.99e-8, 'var(--st-nickel)'], ['stainless steel', 7.2e-7, C.steel], ['nichrome', 1.10e-6, C.steel], ['carbon fibre', 1.5e-5, C.carbon], ['PEDOT:PSS, at best', 1e-5 * 1.0, C.pedot],
];
const ladder = {
  vb: '0 0 720 270', dur: 9000,
  draw(t) {
    let s = '';
    const x0 = 160, x1 = 600, lo = -8.2, hi = -4.4, X = v => x0 + (Math.log10(v) - lo) / (hi - lo) * (x1 - x0);
    s += T(x0, 18, 'resistivity ρ — a longer bar is a worse conductor (log scale)', { size: 9.5 });
    for (const e of [-8, -7, -6, -5]) s += line(X(10 ** e), 26, X(10 ** e), 236, { stroke: C.hair, 'stroke-width': 0.8 }) + txt(X(10 ** e), 250, `10${sup('⁻' + -e)}`, { size: 9, anchor: 'middle', fill: C.dim });
    const top4 = eseg(t, 0.55, 0.62) * (1 - eseg(t, 0.92, 0.98));
    RHO_BARS.forEach(([name, rho, col, sym], i) => {
      const y = 36 + i * 23, grow = eseg(t, 0.02 + i * 0.05, 0.12 + i * 0.05) * (1 - eseg(t, 0.95, 1));
      const xe = lerp(x0, X(rho), grow);
      const hl = i < 4 ? top4 : 0;
      s += T(x0 - 10, y + 11, name, { anchor: 'end', fill: hl > 0.5 ? C.ink : C.dim });
      s += rect(x0, y + 2, Math.max(0.1, xe - x0), 12, { fill: col, stroke: name.startsWith('carbon') ? C.dim : null, 'stroke-width': 0.6 });
      if (grow > 0.9) s += T(xe + 6, y + 12, sci(rho), { size: 9 });
      if (hl > 0.02 && sym) s += H(16, y + 12, sym, { size: 12, 'fill-opacity': null }) ;
    });
    // the mnemonic, letter by letter
    const words = ['Some', 'Cats', 'Get', 'Angry'];
    words.forEach((w, i) => { const k = eseg(t, 0.62 + i * 0.05, 0.66 + i * 0.05) * (1 - eseg(t, 0.92, 0.98)); if (k > 0.05) s += H(620, 50 + i * 23, w, { size: 13 }); });
    const k2 = eseg(t, 0.8, 0.84) * (1 - eseg(t, 0.92, 0.98));
    if (k2 > 0.05) s += T(712, 160, 'stainless ≈ 43× copper', { size: 9.5, anchor: 'end' }) + T(712, 176, 'carbon fibre ≈ 900×', { anchor: 'end' });
    // a sweeping cursor keeps the eye moving while the bars hold
    const cx = lerp(x0, x1, fr(t * 3));
    s += line(cx, 30, cx, 238, { stroke: C.faint, 'stroke-width': 0.6, 'stroke-dasharray': '2 4' });
    return s;
  },
};

// Galvanic corrosion: copper meets silver in sweat; copper gives up electrons and dissolves.
const galvanic = {
  vb: '0 0 360 230', dur: 8000,
  draw(t) {
    let s = '';
    const days = Math.round(lerp(0, 90, seg(t, 0.05, 0.85))), bite = eseg(t, 0.05, 0.85) * (1 - eseg(t, 0.92, 1));
    // copper trace with a corroding top edge near the junction
    const cy = 120, jx = 200;
    const top = sample(40, u => { const x = 30 + u * (jx - 30), d = Math.exp(-(((x - jx + 20) / 50) ** 2)); return { x, y: cy - 8 + bite * d * (5 + 2 * Math.sin(x * 0.7)) }; });
    s += path(`${poly(top)} L${jx},${cy + 8} L30,${cy + 8} Z`, { fill: C.copper });
    // silver snap
    s += path(`M${jx},${cy - 14} L${jx + 70},${cy - 14} Q${jx + 92},${cy - 14} ${jx + 92},${cy} Q${jx + 92},${cy + 14} ${jx + 70},${cy + 14} L${jx},${cy + 14} Z`, { fill: C.silver });
    // sweat droplet over the junction
    s += path(`M${jx - 80},${cy + 9} Q${jx - 70},${cy - 54} ${jx},${cy - 56} Q${jx + 66},${cy - 54} ${jx + 74},${cy + 9}`, { stroke: C.ink2, 'stroke-width': 1, fill: C.indigo, 'fill-opacity': 0.08, 'stroke-dasharray': '3 2' });
    // electrons: from copper into silver through the metal joint
    s += electrons([{ x: 60, y: cy + 2 }, { x: jx + 60, y: cy + 2 }], t * 3, { n: 10, r: 2 });
    // copper ions leaving into the sweat
    const g = rng(3);
    for (let i = 0; i < 9; i++) {
      const x = lerp(110, jx - 6, g()), u = fr(t * 1.6 + g());
      const y = cy - 9 - u * 40;
      s += circ(x + Math.sin(u * 6 + i) * 4, y, 3.2, { fill: C.bg, stroke: C.copper, 'stroke-width': 1, 'stroke-opacity': f2(1 - u) });
      if (i % 3 === 0) s += txt(x + 5, y - 3, '+', { size: 8, fill: C.ink, op: f2(1 - u) });
    }
    s += L(30, 152, 'copper: less noble, dissolves');
    s += L(jx + 30, 168, 'silver: more noble');
    s += L(jx, cy - 64, 'sweat: an electrolyte', { anchor: 'middle' });
    s += T(16, 24, `day ${days}`, { fill: C.ink });
    s += H(180, 194, 'Two metals + sweat = a battery;', { anchor: 'middle', size: 12 });
    s += H(180, 212, 'the less noble one pays.', { anchor: 'middle', size: 12 });
    return s;
  },
};

// Temperature coefficient: heaters want steady, thermometers want swingy.
const tcr = {
  vb: '0 0 360 230', dur: 8000,
  draw(t) {
    let s = '';
    const T0 = 20, Tc = lerp(20, 80, 0.5 - 0.5 * Math.cos(t * TAU)), u = (Tc - 20) / 60;
    // thermometer
    s += rect(24, 24, 12, 130, { rx: 6, fill: C.bg, stroke: C.ink2 }) + circ(30, 162, 10, { fill: C.plum, stroke: C.ink2 });
    s += rect(27, 24 + 130 * (1 - u), 6, 130 * u + 8, { fill: C.plum });
    s += T(30, 190, `${Math.round(Tc)} °C`, { anchor: 'middle', fill: C.ink });
    const curves = [
      ['nickel +0.6%/°C', 0.006, 'var(--st-nickel)', null],
      ['copper +0.39%/°C', 0.0039, C.copper, '6 3'],
      ['nichrome ≈ +0.02%/°C', 0.0002, C.steel, '2 3'],
    ];
    s += plot({ x: 80, y: 30, w: 250, h: 130, u, mode: 'xy', grid: [0.25, 0.5, 0.75],
      series: curves.map(([, a, col, dash]) => ({ curve: v => ({ x: v, y: (a * 60 * v) / 0.4 }), color: col, dash, ghost: true })),
      title: 'R / R₀ as it warms', xl: '80 °C', xl0: '20 °C', yl: '1.4', yl0: '1.0' });
    curves.forEach(([name, a]) => { const y = 30 + 130 - (a * 60) / 0.4 * 130; s += T(324, y - 6, name, { anchor: 'end', size: 9 }); });
    s += T(80, 186, curves.map(c => `${c[0].split(' ')[0]} ${fmt(1 + c[1] * (Tc - T0), 3)}×`).join('   '), { size: 9 });
    s += H(180, 212, 'Heaters want steady; thermometers want swingy.', { anchor: 'middle', size: 11 });
    return s;
  },
};

// Silver migration: under DC bias with moisture, silver dissolves at + and grows dendrites from -.
const DENDRITE = (() => { const g = rng(11), br = []; const grow = (x, y, a, len, d) => { if (d > 6 || len < 3) return; const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; br.push({ x1: x, y1: y, x2, y2, d }); grow(x2, clamp(y2, 76, 154), a + (g() - 0.5) * 0.5, len * 0.84, d + 1); if (g() < 0.6) grow(x2, clamp(y2, 76, 154), a + (g() < 0.5 ? -1 : 1) * (0.35 + g() * 0.3), len * 0.55, d + 1); }; for (let i = 0; i < 3; i++) grow(222, 92 + i * 26, Math.PI + (g() - 0.5) * 0.4, 25, 0); return br; })();
const migration = {
  vb: '0 0 360 230', dur: 9000,
  draw(t) {
    let s = '';
    const grow = seg(t, 0.08, 0.72), shorted = t > 0.72 && t < 0.92;
    s += rect(40, 70, 90, 90, { fill: C.silver }) + rect(230, 70, 90, 90, { fill: C.silver });
    s += H(85, 60, '+', { anchor: 'middle' }) + H(275, 60, '−', { anchor: 'middle' });
    s += path('M120,170 Q180,40 240,170', { stroke: C.ink2, 'stroke-width': 1, 'stroke-dasharray': '3 2', fill: C.indigo, 'fill-opacity': 0.06 });
    // silver ions drifting from + to -
    const g = rng(4);
    for (let i = 0; i < 10; i++) { const u = fr(t * 2 + g()), y = 80 + g() * 70; s += circ(lerp(132, 226, u), y, 2.2, { fill: C.bg, stroke: C.silver, 'stroke-width': 1 }); }
    // dendrites growing from the - side toward +
    const shown = Math.floor(grow * DENDRITE.length);
    for (let i = 0; i < shown; i++) { const b = DENDRITE[i]; s += line(b.x1 + 8, b.y1, b.x2 + 8, b.y2, { stroke: C.silver, 'stroke-width': Math.max(0.6, 2 - b.d * 0.3) }); }
    if (shorted) { s += line(130, 115, 230, 115, { stroke: C.petrol, 'stroke-width': 2.5, 'stroke-opacity': f2(0.5 + 0.5 * Math.sin(t * TAU * 20)) }); s += H(180, 196, '! shorted', { anchor: 'middle' }); }
    s += L(180, 24, 'two silver traces, a DC bias, humid air', { anchor: 'middle' });
    s += L(85, 178, 'silver dissolves here', { anchor: 'middle' }) + L(275, 178, 'and regrows here', { anchor: 'middle' });
    s += H(180, 218, 'Silver walks in the wet.', { anchor: 'middle', size: 11.5 });
    return s;
  },
};

// =============================================================================================
// 04 · RESISTIVE vs CAPACITIVE
// =============================================================================================
const RPART = (() => { const g = rng(21), a = []; for (let i = 0; i < 70; i++) a.push({ x: g(), y: g(), th: g() }); return a; })();
const roadcanyon = {
  vb: '0 0 720 275', dur: 7000,
  draw(t) {
    let s = '';
    const F = press(t);
    // ---- resistive (left)
    const lx = 30, lw = 280, top = 96, bot = 166, cx = lx + lw / 2;
    const dip = x => F * 16 * Math.exp(-(((x - cx) / 60) ** 2));
    s += H(lx, 22, 'R — a Road', { size: 14 }) + L(lx, 38, 'current travels through the material');
    s += rect(lx, bot, lw, 7, { fill: C.silver });
    for (let i = 0; i < RPART.length; i++) { const p = RPART[i], x = lx + 6 + p.x * (lw - 12); s += circ(x, lerp(top + 8 + dip(x), bot - 4, p.y), 2.6, { fill: C.carbon, stroke: C.dim, 'stroke-width': 0.5 }); }
    s += path(poly(sample(30, u => ({ x: lx + u * lw, y: top + dip(lx + u * lw) }))), { stroke: C.silver, 'stroke-width': 7 });
    s += finger(cx, top - 4 + dip(cx), 30);
    const nP = Math.round(1 + F * 6);
    for (let k = 0; k < nP; k++) { const x = cx + (k - (nP - 1) / 2) * 16; s += electrons([{ x, y: top + 4 + dip(x) }, { x: x + 4, y: (top + bot) / 2 + dip(x) / 2 }, { x: x - 2, y: bot }], t * 4 + k * 0.27, { n: 3, r: 2 }); }
    s += L(lx + lw + 6, top + 4, 'electrode') + L(lx + lw + 6, (top + bot) / 2 + 4, 'carbon') + L(lx + lw + 6, bot + 6, 'electrode');
    const Rk = 1 / (1 + 6 * F);
    s += plot({ x: lx, y: 198, w: lw, h: 40, u: fr(t), f: v => 0.05 + 0.9 / (1 + 6 * press(v)), title: 'resistance falls as you press', readout: `${Math.round(Rk * 50)} kΩ`, grid: [], color: C.petrol });
    // ---- capacitive (right)
    const rx = 400, rw = 260, rcx = rx + rw / 2, d0 = 64, ctop = 96, cbot = ctop + d0;
    const dipC = x => F * 34 * Math.exp(-(((x - rcx) / 70) ** 2));
    s += H(rx, 22, 'C — a Canyon', { size: 14 }) + L(rx, 38, 'charge piles up on both rims; none crosses');
    s += rect(rx, cbot, rw, 7, { fill: C.silver });
    for (let x = rx + 8; x <= rx + rw - 8; x += 12) s += line(x, ctop + dipC(x) + 6, x, cbot - 2, { stroke: C.indigo, 'stroke-width': 0.9, 'stroke-dasharray': '2 3', 'stroke-opacity': f2(0.35 + 0.65 * dipC(x) / 34) });
    s += path(poly(sample(30, u => ({ x: rx + u * rw, y: ctop + dipC(rx + u * rw) }))), { stroke: C.silver, 'stroke-width': 7 });
    s += finger(rcx, ctop - 4 + dipC(rcx), 36);
    const nq = Math.round(6 + F * 10);
    for (let i = 0; i < nq; i++) { const x = rcx + (i - (nq - 1) / 2) * 14; s += txt(x, ctop + dipC(x) - 6, '+', { anchor: 'middle', size: 10, fill: C.ink }) + txt(x, cbot + 19, '−', { anchor: 'middle', size: 10, fill: C.ink }); }
    // charge arrives and leaves along the leads, never across the gap
    const dF = press(t + 0.01) - press(t - 0.01);
    if (Math.abs(dF) > 0.004) {
      s += electrons([{ x: rx + rw + 50, y: ctop }, { x: rx + rw, y: ctop }], t * 5, { n: 4, r: 2, reverse: dF < 0 });
      s += electrons([{ x: rx + rw + 50, y: cbot + 3 }, { x: rx + rw, y: cbot + 3 }], t * 5, { n: 4, r: 2, reverse: dF > 0 });
    }
    s += line(rx + rw, ctop, rx + rw + 50, ctop, { stroke: C.silver, 'stroke-width': 1.5 }) + line(rx + rw, cbot + 3, rx + rw + 50, cbot + 3, { stroke: C.silver, 'stroke-width': 1.5 });
    const Ck = 1 / (1 - F * 0.48);
    s += plot({ x: rx, y: 198, w: rw, h: 40, u: fr(t), f: v => 0.15 + 0.8 * (1 / (1 - press(v) * 0.48) - 1) / 0.92, title: 'capacitance rises as the gap closes', readout: `${fmt(1.2 * Ck)} pF`, grid: [], color: C.indigo });
    s += T(360, 264, 'R is a Road, C is a Canyon.', { anchor: 'middle', fill: C.ink, size: 11 });
    return s;
  },
};

// Voltage divider lab: the sensor and a fixed 10 k resistor share 3.3 V in proportion.
const divider = {
  vb: '0 0 360 250', dur: 5000, state: { press: 0.2 },
  draw(t, st) {
    const p = clamp(+st.press), Rs = 100 / (1 + 19 * p), Rf = 10, V = 3.3, Vout = V * Rf / (Rs + Rf), I = V / (Rs + Rf);
    let s = '';
    const x = 70;
    s += T(x, 22, '3.3 V', { anchor: 'middle', fill: C.ink }) + line(x - 18, 28, x + 18, 28, { stroke: C.ink, 'stroke-width': 1.6 });
    s += line(x, 28, x, 40, { stroke: C.silver, 'stroke-width': 2 });
    s += zigV(x, 40, 100, { color: C.carbon, sw: 3 }) + zigV(x, 40, 100, { color: C.dim, sw: 0.5 });
    s += L(x + 16, 66, 'sensor') + T(x + 16, 82, ohms(Rs * 1000));
    s += line(x, 100, x, 128, { stroke: C.silver, 'stroke-width': 2 }) + circ(x, 114, 3, { fill: C.ink });
    s += line(x, 114, 150, 114, { stroke: C.faint, 'stroke-width': 1, 'stroke-dasharray': '3 3' });
    s += zigV(x, 128, 188, { color: C.ink }) + L(x + 16, 154, 'fixed') + T(x + 16, 170, '10 kΩ');
    s += line(x, 188, x, 204, { stroke: C.silver, 'stroke-width': 2 });
    for (let i = 0; i < 3; i++) s += line(x - 14 + i * 5, 204 + i * 4, x + 14 - i * 5, 204 + i * 4, { stroke: C.ink, 'stroke-width': 1.4 });
    // electrons climb from ground to +, at a rate set by the current
    const ph = adv(st, 'd', t, 0.5 + I * 3);
    s += electrons([{ x, y: 204 }, { x, y: 28 }], ph, { n: 10, r: 2 });
    // the share of the push
    const bx = 150, by = 34, bh = 150, sh = bh * Rs / (Rs + Rf);
    s += rect(bx, by, 22, sh, { fill: C.carbon, stroke: C.dim, 'stroke-width': 0.6 }) + rect(bx, by + sh, 22, bh - sh, { fill: C.petrol, 'fill-opacity': 0.5 });
    s += L(bx + 28, by + Math.max(10, sh / 2), `sensor’s share ${fmt(V - Vout)} V`) + L(bx + 28, by + sh + Math.max(12, (bh - sh) / 2), `fixed R’s share ${fmt(Vout)} V`);
    // meter
    s += H(260, 216, `V out = ${fmt(Vout)} V`, { anchor: 'middle' });
    s += T(180, 240, 'Two resistors share the push in proportion.', { anchor: 'middle' });
    return s;
  },
};

// Charge-time lab: capacitance from gap and filling; a bigger bucket takes longer to fill.
export const EPS = { 1: 'air', 3: 'polyester', 80: 'water' };
export const capCalc = (gapMm, eps) => { const C_ = 8.854e-12 * eps * 4e-4 / (gapMm / 1000); return { pF: C_ * 1e12, us: C_ * 1e6 * 1e6 }; };
const bucket = {
  vb: '0 0 360 250', dur: 5000, state: { gap: 3, eps: '1' },
  draw(t, st) {
    const gap = +st.gap, eps = +st.eps, { pF, us } = capCalc(gap, eps), ref = capCalc(3, 1);
    let s = '';
    // plates
    const gpx = 6 + gap * 9;
    s += rect(20, 40, 80, 6, { fill: C.silver }) + rect(20, 46 + gpx, 80, 6, { fill: C.silver });
    if (eps > 1) s += rect(20, 46, 80, gpx, { fill: eps > 10 ? C.indigo : C.ink2, 'fill-opacity': eps > 10 ? 0.25 : 0.12 });
    for (let x = 26; x < 100; x += 10) s += line(x, 48, x, 44 + gpx, { stroke: C.indigo, 'stroke-width': 0.8, 'stroke-dasharray': '2 2' });
    s += L(20, 30, `gap ${fmt(gap, 1)} mm, ${EPS[eps]}`);
    s += T(20, 80 + gpx, `C = ${fmt(pF)} pF`, { fill: C.ink });
    // bucket: width grows with C, the tap is fixed, so it fills slower
    const ratio = pF / ref.pF, bw = clamp(20 * Math.sqrt(ratio), 10, 90), bx = 175 - bw / 2, btop = 120, bbot = 210;
    const tau = clamp(0.16 * ratio, 0.04, 6), lvl = 1 - Math.exp(-fr(t) / tau);
    s += path(`M${bx},${btop} L${bx + 4},${bbot} L${bx + bw - 4},${bbot} L${bx + bw},${btop}`, { stroke: C.ink2, 'stroke-width': 1.2 });
    s += rect(bx + 4, bbot - (bbot - btop) * lvl, bw - 8, (bbot - btop) * lvl, { fill: C.petrol, 'fill-opacity': 0.35 });
    s += line(bx - 10, btop + (bbot - btop) * 0.37, bx + bw + 10, btop + (bbot - btop) * 0.37, { stroke: C.mint, 'stroke-width': 1, 'stroke-dasharray': '4 2' });
    s += line(175, 98, 175, btop + 4, { stroke: C.petrol, 'stroke-width': 2, 'stroke-dasharray': '1 3' });
    s += L(175, 230, 'C is a bucket', { anchor: 'middle' });
    // the charging curve
    s += plot({ x: 240, y: 40, w: 106, h: 90, u: clamp(fr(t)), grid: [0.63],
      series: [{ f: v => 1 - Math.exp(-v / tau), color: C.petrol }, { f: v => 1 - Math.exp(-v / 0.16), color: C.faint, dash: '3 3', noDot: true }],
      title: 'charging', xl: 'time', ref: [{ v: 0.63, label: 'threshold', color: C.mint }] });
    s += T(240, 154, `time to threshold`, { size: 9 }) + T(240, 168, `≈ ${fmt(us)} µs (via 1 MΩ)`, { fill: C.ink, size: 9.5 });
    s += T(352, 184, eps > 10 ? '! water: a giant "touch"' : `dashed: air at 3 mm`, { size: 9, anchor: 'end' });
    return s;
  },
};

// Self vs mutual: the same finger raises self-capacitance and lowers mutual capacitance.
const selfmutual = {
  vb: '0 0 720 260', dur: 7000,
  draw(t) {
    let s = '';
    const near = pulse(t, 0.1, 0.4, 0.6, 0.9), base = 200;
    // ---- self (left)
    const ex = 180, fy = lerp(40, 140, near);
    s += H(30, 24, 'Self: you add', { size: 14 }) + L(30, 40, 'one electrode, measured to ground');
    s += rect(ex - 40, base, 80, 7, { fill: C.silver });
    const nl = 9, toF = Math.round(near * 6);
    for (let k = 0; k < nl; k++) {
      const a = Math.PI * (0.08 + 0.84 * k / (nl - 1)), sx = ex + Math.cos(a) * 36, sy = base;
      if (k >= (nl - toF) / 2 && k < (nl + toF) / 2) s += path(`M${sx},${sy} Q${lerp(sx, ex, 0.5)},${lerp(sy, fy + 8, 0.6)} ${ex + (k - 4) * 3},${fy + 4}`, { stroke: C.indigo, 'stroke-width': 1, 'stroke-dasharray': '3 2', 'stroke-dashoffset': (-t * 40).toFixed(1) });
      else s += path(`M${sx},${sy} Q${ex + Math.cos(a) * 110},${base - Math.sin(a) * 90} ${ex + Math.cos(a) * 160},${base + 30}`, { stroke: C.indigo, 'stroke-width': 1, 'stroke-dasharray': '3 2', 'stroke-dashoffset': (-t * 40).toFixed(1), 'stroke-opacity': 0.6 });
    }
    s += finger(ex, fy, 30);
    s += L(ex, base + 26, 'electrode', { anchor: 'middle' });
    const cs = 0.3 + 0.6 * near;
    s += rect(310, base - 120 * cs, 14, 120 * cs, { fill: C.indigo, 'fill-opacity': 0.55 }) + line(306, base, 328, base, { stroke: C.line });
    s += T(317, base + 18, 'C ↑', { anchor: 'middle', fill: C.ink });
    // ---- mutual (right)
    const mx = 540, fy2 = lerp(40, 140, near);
    s += H(390, 24, 'Mutual: you steal', { size: 14 }) + L(390, 40, 'transmit to receive, measured between them');
    s += rect(mx - 110, base, 70, 7, { fill: C.silver }) + rect(mx + 40, base, 70, 7, { fill: C.silver });
    s += L(mx - 75, base + 26, 'TX', { anchor: 'middle' }) + L(mx + 75, base + 26, 'RX', { anchor: 'middle' });
    for (let k = 0; k < 7; k++) {
      const h = 18 + k * 18, x0 = mx - 60 + k * 2, x1 = mx + 60 - k * 2, apex = base - h;
      const stolen = apex < fy2 + 30 && k > 6 - Math.round(near * 6) ? 1 : 0;
      if (stolen) s += path(`M${x0},${base} Q${x0 + 10},${apex + 20} ${mx - 6 + k},${fy2 + 4}`, { stroke: C.indigo, 'stroke-width': 1, 'stroke-dasharray': '3 2', 'stroke-dashoffset': (-t * 40).toFixed(1) });
      else s += path(`M${x0},${base} Q${mx},${base - 2 * h} ${x1},${base}`, { stroke: C.indigo, 'stroke-width': 1, 'stroke-dasharray': '3 2', 'stroke-dashoffset': (-t * 40).toFixed(1) });
    }
    s += finger(mx, fy2, 30);
    const cm = 0.9 - 0.5 * near;
    s += rect(690, base - 120 * cm, 14, 120 * cm, { fill: C.indigo, 'fill-opacity': 0.55 }) + line(686, base, 708, base, { stroke: C.line });
    s += T(697, base + 18, 'C ↓', { anchor: 'middle', fill: C.ink });
    s += T(360, 250, 'Same finger. Self-capacitance goes up; mutual capacitance goes down.', { anchor: 'middle' });
    return s;
  },
};

// Water: a droplet lands on each sensor. To C it's a giant touch; to R it's a short.
const water = {
  vb: '0 0 360 250', dur: 7000,
  draw(t) {
    let s = '';
    const fall = eseg(t, 0.05, 0.25), dry = eseg(t, 0.8, 0.98), r = 13 * (1 - dry);
    // capacitive (left)
    const lx = 90, base = 120;
    s += L(lx, 22, 'capacitive', { anchor: 'middle' });
    s += rect(lx - 50, base, 100, 6, { fill: C.silver });
    const dy = lerp(30, base - r, fall);
    for (let k = 0; k < 7; k++) { const x = lx - 42 + k * 14, toDrop = fall > 0.99 && r > 2 && Math.abs(x - lx) < 30; s += toDrop ? line(x, base, lx + (x - lx) * 0.3, dy + r * 0.6, { stroke: C.indigo, 'stroke-width': 1.1, 'stroke-dasharray': '3 2' }) : line(x, base, x, base - 30, { stroke: C.indigo, 'stroke-width': 0.9, 'stroke-dasharray': '3 2', 'stroke-opacity': 0.5 }); }
    if (r > 0.5) s += path(`M${lx - r},${dy + r * 0.4} Q${lx - r},${dy - r} ${lx},${dy - r * 1.4} Q${lx + r},${dy - r} ${lx + r},${dy + r * 0.4} Q${lx},${dy + r * 1.1} ${lx - r},${dy + r * 0.4}Z`, { fill: C.indigo, 'fill-opacity': 0.18, stroke: C.ink2, 'stroke-width': 1 });
    const spike = fall > 0.99 ? 1 - dry : 0;
    s += plot({ x: 30, y: 150, w: 120, h: 44, u: fr(t), f: v => 0.15 + 0.8 * (v > 0.25 ? 1 - eseg(v, 0.8, 0.98) : 0), title: 'reads as', readout: spike > 0.5 ? 'a touch' : 'idle', grid: [], color: C.indigo });
    s += T(lx, 222, 'Water fools C (ε ≈ 80).', { anchor: 'middle', size: 9.5 });
    // resistive (right): two traces, droplet bridges them at the edge
    const rx = 270;
    s += L(rx, 22, 'resistive', { anchor: 'middle' });
    s += rect(rx - 60, base - 30, 120, 8, { fill: C.silver }) + rect(rx - 60, base + 6, 120, 8, { fill: C.silver });
    s += rect(rx - 20, base - 22, 40, 28, { fill: C.carbon, stroke: C.dim, 'stroke-width': 0.6 });
    s += L(rx, base - 36, 'sensor', { anchor: 'middle' });
    const dx = rx + 44, dy2 = lerp(30, base - 8, fall);
    if (r > 0.5) s += path(`M${dx - r},${dy2 + r * 0.4} Q${dx - r},${dy2 - r} ${dx},${dy2 - r * 1.4} Q${dx + r},${dy2 - r} ${dx + r},${dy2 + r * 0.4} Q${dx},${dy2 + r * 1.1} ${dx - r},${dy2 + r * 0.4}Z`, { fill: C.indigo, 'fill-opacity': 0.18, stroke: C.ink2, 'stroke-width': 1 });
    const bridged = fall > 0.99 && r > 6;
    s += electrons([{ x: rx, y: base - 22 }, { x: rx, y: base + 6 }], t * 3, { n: 3, r: 1.8 });
    if (bridged) s += electrons([{ x: dx, y: base - 22 }, { x: dx, y: base + 6 }], t * 3, { n: 4, r: 1.8 });
    s += plot({ x: 210, y: 150, w: 120, h: 44, u: fr(t), f: v => 0.75 - 0.5 * (v > 0.25 ? 1 - eseg(v, 0.8, 0.98) : 0), title: 'R reads', readout: bridged ? 'too low' : 'true', grid: [], color: C.petrol });
    s += T(rx, 222, 'Sweat shorts R.', { anchor: 'middle', size: 9.5 });
    s += H(180, 244, 'Water fools C and shorts R.', { anchor: 'middle', size: 11 });
    return s;
  },
};

// An enamelled-wire crossing in a woven grid: the enamel is the capacitor's gap; a finger steals field.
const crossing = {
  vb: '0 0 360 250', dur: 7000,
  draw(t) {
    let s = '';
    const near = pulse(t, 0.1, 0.4, 0.6, 0.9);
    const cx = 180, cy = 150;
    // warp wire in section: copper core in an enamel ring
    s += circ(cx, cy + 22, 20, { fill: C.bg, stroke: C.ink2, 'stroke-width': 4, 'stroke-opacity': 0.55 }) + circ(cx, cy + 22, 16, { fill: C.copper });
    // weft wire lengthwise over it
    const wt = cy - 12;
    s += path(`M30,${wt + 18} Q${cx},${wt - 8} 330,${wt + 18}`, { stroke: C.ink2, 'stroke-width': 26, 'stroke-opacity': 0.45, fill: 'none' });
    s += path(`M30,${wt + 18} Q${cx},${wt - 8} 330,${wt + 18}`, { stroke: C.copper, 'stroke-width': 18, fill: 'none' });
    // the scan drive: charge moving in and out of the row line as it is pulsed
    s += electrons(sample(40, u => ({ x: (1 - u) ** 2 * 30 + 2 * u * (1 - u) * cx + u * u * 330, y: (1 - u) ** 2 * (wt + 18) + 2 * u * (1 - u) * (wt - 8) + u * u * (wt + 18) })), t * 2, { n: 12, r: 1.6 });
    // field across the two enamel layers at the crossing
    for (let k = -3; k <= 3; k++) { const stolen = Math.abs(k) <= Math.round(near * 3) && near > 0.15; const x = cx + k * 6; s += line(x, wt + 7, x, cy + 4, { stroke: C.indigo, 'stroke-width': 1.1, 'stroke-dasharray': '1.5 1.5', 'stroke-opacity': stolen ? 0.25 : 1 }); }
    const fy = lerp(30, 106, near);
    for (let k = 0; k < Math.round(near * 4); k++) s += path(`M${cx - 30 + k * 18},${wt - 6} Q${cx - 20 + k * 12},${fy + 20} ${cx - 6 + k * 4},${fy + 2}`, { stroke: C.indigo, 'stroke-width': 1, 'stroke-dasharray': '3 2' });
    s += finger(cx, fy, 28);
    s += L(28, wt - 12, 'weft: Ag–Cu in enamel') + L(cx + 26, cy + 50, 'warp: Ag–Cu in enamel');
    s += L(212, 96, 'enamel + enamel');
    s += L(212, 106, '= the capacitor gap');
    const C0 = 2.0 - 0.6 * near;
    s += T(28, 228, `node capacitance ≈ ${fmt(C0)} (relative)`, { fill: C.ink });
    s += T(28, 244, 'Insulated lines cross; every crossing is a sensor.', { size: 9.5 });
    return s;
  },
};

// =============================================================================================
// 05 · STACK-UPS (state.id picks the stack, state.sel highlights a layer)
// =============================================================================================
const KIND_H = { fabric: 16, conductor: 8, shield: 8, sense: 12, dielectric: 26, insulation: 6, skin: 22, pod: 24, wire: 9, core: 16 };
function layerFill(L_, sel) {
  const mat = L_.mat ? `var(--st-${L_.mat})` : null;
  switch (L_.kind) {
    case 'conductor': case 'shield': return { fill: mat, stroke: sel ? C.petrol : C.bg };
    case 'sense': return { fill: C.carbon, stroke: sel ? C.petrol : C.dim };
    case 'skin': return { fill: C.skin, stroke: sel ? C.petrol : C.bg };
    case 'insulation': return { fill: C.raised, stroke: sel ? C.petrol : C.ink2 };
    case 'pod': return { fill: C.raised, stroke: sel ? C.petrol : C.ink };
    default: return { fill: C.bg, stroke: sel ? C.petrol : C.ink };
  }
}
export function makeStackScene(STACKS) {
  return {
    vb: '0 0 720 320', dur: 9000, state: { id: STACKS[0].id, sel: -1 },
    draw(t, st) {
      const S = STACKS.find(x => x.id === st.id) || STACKS[0], sel = +st.sel;
      return S.id === 'hybrid' ? drawRings(S, t, sel) : drawSlabs(S, t, sel);
    },
  };
}
function drawSlabs(S, t, sel) {
  let s = '';
  const exp = eseg(t, 0.15, 0.32) * (1 - eseg(t, 0.72, 0.88));   // 0 together, 1 apart
  const gap = lerp(1, 18, exp) + exp * 2.5 * Math.sin(t * TAU * 5), x0 = 40, w = 330, dx = 46, dy = 20;
  const hs = S.layers.map(l => KIND_H[l.kind] || 10), total = hs.reduce((a, b) => a + b, 0) + gap * (hs.length - 1);
  let y = 40 + Math.max(0, (240 - total) / 2);
  const ys = [];
  S.layers.forEach((l, i) => {
    const h = hs[i], isSel = sel === i, f = layerFill(l, isSel);
    ys.push({ y, h });
    // top face then front face then side face
    s += path(`M${x0},${y} L${x0 + dx},${y - dy} L${x0 + w + dx},${y - dy} L${x0 + w},${y} Z`, { fill: f.fill, stroke: f.stroke, 'stroke-width': isSel ? 1.6 : 0.8, 'fill-opacity': l.kind === 'insulation' ? 0.5 : null });
    s += rect(x0, y, w, h, { fill: f.fill, stroke: f.stroke, 'stroke-width': isSel ? 1.6 : 0.8 });
    s += path(`M${x0 + w},${y} L${x0 + w + dx},${y - dy} L${x0 + w + dx},${y - dy + h} L${x0 + w},${y + h} Z`, { fill: f.fill, stroke: f.stroke, 'stroke-width': isSel ? 1.6 : 0.8 });
    if (l.kind === 'fabric') for (let k = 0; k < 18; k++) s += line(x0 + 8 + k * 18, y + 3, x0 + 14 + k * 18, y + h - 3, { stroke: C.dim, 'stroke-width': 0.6 });
    if (l.kind === 'dielectric') for (let k = 0; k < 24; k++) { const xx = x0 + 6 + k * 13.5; s += path(`M${xx},${y + 2} Q${xx + (k % 2 ? 5 : -5) * (1 + exp)},${y + h / 2} ${xx},${y + h - 2}`, { stroke: C.ink2, 'stroke-width': 0.7 }); }
    if (l.kind === 'sense') { const g = rng(i + 7); for (let k = 0; k < 40; k++) s += circ(x0 + 4 + g() * (w - 8), y + 2 + g() * (h - 4), 1, { fill: C.dim }); }
    if (l.kind === 'wire') s += path(poly(sample(60, u => ({ x: x0 + 10 + u * (w - 20) + dx * 0.5, y: y - dy * 0.5 + Math.sin(u * TAU * 4) * 6 }))), { stroke: `var(--st-${l.mat})`, 'stroke-width': 2.6 });
    if (l.kind === 'pod') s += rect(x0 + w / 2 - 30, y + 6, 60, h - 12, { fill: C.bg, stroke: C.ink2, 'stroke-width': 0.8 });
    // number and name, with a leader
    const ly = 34 + i * (240 / S.layers.length) + 12;
    s += line(x0 + w + dx + 4, y + h / 2 - dy / 2, 460, ly - 4, { stroke: isSel ? C.petrol : C.faint, 'stroke-width': isSel ? 1 : 0.6 });
    s += T(468, ly, `${i + 1}  ${l.name}`, { fill: isSel ? C.ink : C.dim, size: 11 });
    y += h + gap;
  });
  // what the current does, once the stack is together
  const together = 1 - exp;
  if (together > 0.5) {
    const cond = S.layers.map((l, i) => ['conductor', 'shield', 'sense', 'skin'].includes(l.kind) ? i : -1).filter(i => i >= 0);
    if (S.current === 'through' && cond.length >= 2) {
      const a = ys[cond[0]], b = ys[cond[cond.length - 1]];
      for (let k = 0; k < 4; k++) { const x = x0 + 90 + k * 50; s += electrons([{ x, y: a.y + a.h / 2 }, { x, y: b.y + b.h / 2 }], t * 3 + k * 0.25, { n: 3, r: 2 }); }
    }
    if (S.current === 'across') {
      const i0 = S.layers.findIndex(l => l.kind === 'shield'), i1 = S.layers.findIndex(l => l.kind === 'conductor');
      if (i0 >= 0 && i1 >= 0) { const a = ys[i0], b = ys[i1]; for (let k = 0; k < 12; k++) { const x = x0 + 20 + k * 26; s += line(x, a.y + a.h, x, b.y, { stroke: C.indigo, 'stroke-width': 1, 'stroke-dasharray': '2 2.5', 'stroke-opacity': f2(0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * TAU * 2 + k))) }); } }
    }
    if (S.current === 'along') {
      const iw = S.layers.findIndex(l => l.kind === 'wire');
      if (iw >= 0) { const a = ys[iw]; s += electrons(sample(60, u => ({ x: x0 + 10 + u * (w - 20) + dx * 0.5, y: a.y - dy * 0.5 + Math.sin(u * TAU * 4) * 6 })), t * 1.5, { n: 14, r: 1.8 }); }
    }
  }
  s += L(40, 300, `${S.from} ↑   ↓ ${S.to}`);
  s += L(460, 300, together > 0.5 ? 'assembled: current shown' : 'exploded: layers named');
  return s;
}
function drawRings(S, t, sel) {
  let s = '';
  const exp = eseg(t, 0.15, 0.32) * (1 - eseg(t, 0.72, 0.88)), cx = 190, cy = 160;
  let r = 0;
  const rings = [];
  const widths = [40, 12, 5, 20];
  S.layers.forEach((l, i) => { const r0 = r + (i ? lerp(1, 12, exp) + exp * 2 * Math.sin(t * TAU * 5) : 0), r1 = r0 + widths[i]; rings.push([r0, r1]); r = r1; });
  // draw outside in so inner rings sit on top
  for (let i = S.layers.length - 1; i >= 0; i--) {
    const l = S.layers[i], [r0, r1] = rings[i], isSel = sel === i, st = isSel ? C.petrol : C.ink2;
    if (l.kind === 'fabric') { s += circ(cx, cy, (r0 + r1) / 2, { fill: 'none', stroke: C.ink, 'stroke-width': r1 - r0, 'stroke-opacity': 0.12 }); for (let k = 0; k < 28; k++) { const a = k / 28 * TAU + t * 0.6; s += circ(cx + Math.cos(a) * (r0 + r1) / 2, cy + Math.sin(a) * (r0 + r1) / 2, (r1 - r0) / 2.4, { fill: C.bg, stroke: C.ink, 'stroke-width': 0.7 }); } }
    else if (l.kind === 'wire') { s += circ(cx, cy, (r0 + r1) / 2, { fill: 'none', stroke: C.copper, 'stroke-width': r1 - r0 }); }
    else if (l.kind === 'insulation') { s += circ(cx, cy, (r0 + r1) / 2, { fill: 'none', stroke: C.ink2, 'stroke-width': r1 - r0, 'stroke-opacity': 0.55 }); }
    else if (l.kind === 'core') { for (let k = 0; k < 18; k++) { const g = rng(k + 1), a = g() * TAU, d = Math.sqrt(g()) * (r1 - 6); s += circ(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 5.5, { fill: C.bg, stroke: C.ink, 'stroke-width': 0.8 }); } }
    if (isSel) s += circ(cx, cy, r1 + 1.5, { fill: 'none', stroke: st, 'stroke-width': 1.4 });
    const ly = 50 + i * 56;
    s += line(cx + r1 * 0.7, cy - r1 * 0.7, 460, ly - 4, { stroke: isSel ? C.petrol : C.faint, 'stroke-width': isSel ? 1 : 0.6 });
    s += T(468, ly, `${i + 1}  ${l.name}`, { fill: isSel ? C.ink : C.dim, size: 11 });
  }
  // electrons round the alloy ring (along the yarn, seen end-on as a running ring)
  if (exp < 0.5) { const [r0, r1] = rings[1], rm = (r0 + r1) / 2; for (let k = 0; k < 10; k++) { const a = k / 10 * TAU + t * TAU; s += circ(cx + Math.cos(a) * rm, cy + Math.sin(a) * rm, 1.8, { fill: C.petrol }); } }
  s += L(40, 300, 'cross-section, centre → outside');
  s += L(460, 300, exp > 0.5 ? 'exploded: layers named' : 'assembled');
  return s;
}

export const STUDY_SCENES = {
  circuit, marbles, ohm, yarnR, lanes, contacts, heater, ladder, galvanic, tcr, migration,
  roadcanyon, divider, bucket, selfmutual, water, crossing, stack: makeStackScene(STACKS),
};
